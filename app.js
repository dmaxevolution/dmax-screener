/**
 * app.js - Controller, UI Rotator, Dynamic Renderer & IndexedDB Favorite Manager
 */

let stocksData = [];
let favoriteTickers = new Set();
let currentPhase = 0; // Rotator Phase: 0 = Candlestick Pattern, 1 = Technical Cross

// Inisialisasi IndexedDB untuk Penyimpanan Permanen Favorite
const DB_NAME = "IDX_Screener_DB";
const STORE_NAME = "favorites";
let db = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.error);
            reject(event.target.error);
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            loadFavoritesFromDB().then(resolve).catch(resolve);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: "ticker" });
            }
        };
    });
}

function loadFavoritesFromDB() {
    return new Promise((resolve) => {
        if (!db) { resolve(); return; }
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = (event) => {
            const results = event.target.result;
            favoriteTickers.clear();
            results.forEach(item => favoriteTickers.add(item.ticker));
            resolve();
        };
        request.onerror = () => resolve();
    });
}

function saveFavoriteToDB(ticker) {
    if (!db) return;
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({ ticker: ticker, timestamp: Date.now() });
}

function removeFavoriteFromDB(ticker) {
    if (!db) return;
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(ticker);
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await initIndexedDB();
    } catch (e) {
        console.warn("Gagal menginisialisasi IndexedDB, menggunakan memori lokal.");
    }
    fetchData();
    startUIRotator();
});

async function fetchData() {
    try {
        const res = await fetch('data.json');
        const data = await res.json();
        
        renderIHSGHeader(data.ihsg);
        stocksData = data.all_stocks || [];
        
        const totalEl = document.getElementById('total-emiten-count');
        if (totalEl) totalEl.textContent = `${data.total_emiten || stocksData.length} Emiten`;

        renderFavoriteSection(stocksData);
        renderTop10Compact(data.top_10_entry || stocksData.slice(0, 10));
        renderEntrySection(stocksData);
        renderAllStocksGrid(stocksData);
    } catch (err) {
        console.error("Gagal memuat data JSON:", err);
    }
}

function renderIHSGHeader(ihsg) {
    if (!ihsg) return;
    const valEl = document.getElementById('ihsg-val');
    const pctEl = document.getElementById('ihsg-pct');
    
    valEl.textContent = ihsg.close.toLocaleString('id-ID');
    const isUp = ihsg.change_pct >= 0;
    pctEl.textContent = `${isUp ? '+' : ''}${ihsg.change_pct}%`;
    pctEl.className = `pct ${isUp ? 'up' : 'down'}`;
}

function toggleFavorite(ticker, event) {
    if (event) event.stopPropagation(); // Mencegah modal terbuka saat bintang diklik
    if (favoriteTickers.has(ticker)) {
        favoriteTickers.delete(ticker);
        removeFavoriteFromDB(ticker);
    } else {
        favoriteTickers.add(ticker);
        saveFavoriteToDB(ticker);
    }
    // Render ulang bagian yang menampilkan status favorit
    renderFavoriteSection(stocksData);
    renderTop10Compact(stocksData.slice(0, 10));
    renderEntrySection(stocksData);
    renderAllStocksGrid(stocksData);
    
    // Jika sedang melakukan pencarian, render ulang hasil pencarian juga
    const query = document.getElementById('search-input').value;
    if (query.trim() !== "") {
        filterStocks();
    }
}

function renderFavoriteSection(stocks) {
    const grid = document.getElementById('favorite-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const favStocks = stocks.filter(s => favoriteTickers.has(s.ticker));

    if (favStocks.length === 0) {
        grid.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); grid-column: 1 / -1; padding: 6px 0;">Belum ada emiten favorit. Klik ikon bintang hitam (★) pada kartu emiten untuk menyimpan permanen.</div>`;
        return;
    }

    favStocks.forEach(stock => {
        grid.appendChild(createStockCard(stock));
    });
}

function renderEntrySection(stocks) {
    const container = document.getElementById('entry-list');
    if (!container) return;
    container.innerHTML = '';

    const entryStocks = stocks.filter(s => {
        const strat = evaluateEntryStrategy(s);
        return strat.entryStatus === "BUY_ENTRY" || strat.patternName !== "-";
    });

    entryStocks.slice(0, 6).forEach(stock => {
        const analysis = evaluateEntryStrategy(stock);
        const card = document.createElement('div');
        card.className = 'entry-card';
        
        const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
        const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
        const isFav = favoriteTickers.has(stock.ticker);
        
        card.innerHTML = `
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="ticker-area">
                        <button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${stock.ticker}', event)">${isFav ? '★' : '☆'}</button>
                        <span class="ticker">${stock.ticker}</span>
                        <span class="sector-name" style="margin-left:4px;">${stock.sector}</span>
                    </div>
                    <div id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
                </div>
                <div class="price-text" style="margin-top:4px;">Rp ${stock.close.toLocaleString('id-ID')} (${stock.change_pct >= 0 ? '+' : ''}${stock.change_pct}%)</div>
                ${powerBarHTML}
            </div>
        `;
        card.onclick = () => openModal(stock);
        container.appendChild(card);
    });
}

function renderTop10Compact(top10List) {
    const grid = document.getElementById('top10-grid');
    if (!grid) return;
    grid.innerHTML = '';

    top10List.forEach(stock => {
        grid.appendChild(createStockCard(stock));
    });
}

function renderAllStocksGrid(stocks) {
    const grid = document.getElementById('all-stocks-grid');
    if (!grid) return;
    grid.innerHTML = '';

    stocks.forEach(stock => {
        grid.appendChild(createStockCard(stock));
    });
}

function createStockCard(stock) {
    const card = document.createElement('div');
    card.className = 'stock-card-compact';
    const isUp = stock.change_pct >= 0;
    const isFav = favoriteTickers.has(stock.ticker);
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
    const analysis = evaluateEntryStrategy(stock);
    const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
    
    card.innerHTML = `
        <div class="stock-card-header">
            <div class="ticker-area">
                <button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${stock.ticker}', event)">${isFav ? '★' : '☆'}</button>
                <div>
                    <div class="ticker">${stock.ticker}</div>
                    <div class="sector-name">${stock.sector}</div>
                </div>
            </div>
            <span class="pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.change_pct}%</span>
        </div>
        <div class="price-text">Rp ${stock.close.toLocaleString('id-ID')}</div>
        <div style="margin-top:6px;" id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
        ${powerBarHTML}
    `;
    card.onclick = () => openModal(stock);
    return card;
}

// Rotator Engine
function getRotatorBadgeHTML(ticker, analysis) {
    let label = analysis.patternName;
    let iconKey = analysis.iconKey;
    let styleClass = analysis.patternType === "BULLISH" ? "bullish" : (analysis.patternType === "BEARISH" ? "bearish" : "neutral");

    if (analysis.isGoldenCross && (currentPhase === 1 || label === "-")) {
        label = "G-CROSS";
        iconKey = "G_CROSS";
        styleClass = "gold";
    }

    const iconSVG = getCandleIconSVG(iconKey);
    return `<span class="rotator-badge ${styleClass}">${iconSVG} ${label}</span>`;
}

function startUIRotator() {
    setInterval(() => {
        currentPhase = currentPhase === 0 ? 1 : 0;
        stocksData.forEach(stock => {
            const el = document.getElementById(`badge-rotator-${stock.ticker}`);
            if (el) {
                const analysis = evaluateEntryStrategy(stock);
                el.innerHTML = getRotatorBadgeHTML(stock.ticker, analysis);
            }
        });
    }, 3000);
}

// Live Search Filter (Poin 1: Hasil pencarian dipindah ke atas sinyal setup dengan blink)
function filterStocks() {
    const query = document.getElementById('search-input').value.toUpperCase().trim();
    const sectionEl = document.getElementById('search-results-section');
    const gridEl = document.getElementById('search-results-grid');

    if (query === "") {
        sectionEl.classList.add('hidden');
        gridEl.innerHTML = '';
        return;
    }

    const filtered = stocksData.filter(s => s.ticker.includes(query) || s.sector.toUpperCase().includes(query));
    
    if (filtered.length === 0) {
        sectionEl.classList.remove('hidden');
        gridEl.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); grid-column: 1 / -1; padding: 6px 0;">Emiten atau sektor "${query}" tidak ditemukan.</div>`;
        return;
    }

    sectionEl.classList.remove('hidden');
    gridEl.innerHTML = '';
    
    filtered.forEach(stock => {
        const card = createStockCard(stock);
        card.classList.add('blink-result'); // Menambahkan efek blink khusus pencarian
        gridEl.appendChild(card);
    });
}

// Modal Details
function openModal(stock) {
    document.getElementById('modal-ticker').textContent = stock.ticker;
    document.getElementById('modal-sector').textContent = stock.sector;
    const details = document.getElementById('modal-details');

    details.innerHTML = `
        <div class="modal-row"><span>Penutupan Murni</span><span style="color:#fff;">Rp ${stock.close.toLocaleString('id-ID')}</span></div>
        <div class="modal-row"><span>Open / High / Low</span><span>${stock.open} / ${stock.high} / ${stock.low}</span></div>
        <div class="modal-row"><span>RSI (14)</span><span>${stock.rsi}</span></div>
        <div class="modal-row"><span>EMA 20 / EMA 50</span><span>${stock.ema20} / ${stock.ema50}</span></div>
        <div class="modal-row"><span>Stop Loss (SL)</span><span style="color:var(--red-bearish);">Rp ${stock.stop_loss.toLocaleString('id-ID')}</span></div>
        <div class="modal-row"><span>Target Profit 1 (TP1)</span><span style="color:var(--green-bullish);">Rp ${stock.take_profit_1.toLocaleString('id-ID')}</span></div>
        <div class="modal-row"><span>Target Profit 2 (TP2)</span><span style="color:var(--green-bullish);">Rp ${stock.take_profit_2.toLocaleString('id-ID')}</span></div>
        <div style="margin-top:10px;">
            <span style="font-size:10px; color:var(--text-muted); font-weight:700;">POWER SCORE</span>
            ${renderSignalPowerBar(stock.power_score || 5)}
        </div>
    `;
    document.getElementById('stock-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
}