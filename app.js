/**
 * app.js - Controller, UI Rotator, IndexedDB & Dynamic Renderer
 */

let stocksData = [];
let favoritesData = [];
let currentPhase = 0; 

// Inisialisasi IndexedDB untuk Backup Permanen
let db;
const DB_NAME = "IDX_Screener_DB";
const STORE_NAME = "favorites";

function initIndexedDB() {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = (event) => console.error("IndexedDB error:", event);
    request.onsuccess = (event) => {
        db = event.target.result;
        loadFavoritesFromDB();
    };
    request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
            dbInstance.createObjectStore(STORE_NAME, { keyPath: "ticker" });
        }
    };
}

function saveFavoriteToDB(stock) {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(stock);
    transaction.oncomplete = () => loadFavoritesFromDB();
}

function removeFavoriteFromDB(ticker) {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(ticker);
    transaction.oncomplete = () => loadFavoritesFromDB();
}

function loadFavoritesFromDB() {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = (event) => {
        favoritesData = event.target.result || [];
        renderFavoritesSection();
        updateAllCardsStarState();
    };
}

function clearFavoritesDB() {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    transaction.oncomplete = () => {
        favoritesData = [];
        renderFavoritesSection();
        updateAllCardsStarState();
    };
}

document.addEventListener("DOMContentLoaded", () => {
    initIndexedDB();
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

        renderEntrySection(stocksData);
        renderTop10Compact(data.top_10_entry || stocksData.slice(0, 10));
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

function renderEntrySection(stocks) {
    const container = document.getElementById('entry-list');
    if (!container) return;
    container.innerHTML = '';

    const entryStocks = stocks.filter(s => {
        const strat = evaluateEntryStrategy(s);
        return strat.entryStatus === "BUY_ENTRY" || strat.patternName !== "-";
    });

    entryStocks.slice(0, 6).forEach(stock => {
        container.appendChild(createStockCard(stock, true));
    });
}

function renderTop10Compact(top10List) {
    const grid = document.getElementById('top10-grid');
    if (!grid) return;
    grid.innerHTML = '';
    top10List.forEach(stock => grid.appendChild(createStockCard(stock, false)));
}

function renderAllStocksGrid(stocks) {
    const grid = document.getElementById('all-stocks-grid');
    if (!grid) return;
    grid.innerHTML = '';
    stocks.forEach(stock => grid.appendChild(createStockCard(stock, false)));
}

function renderFavoritesSection() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    container.innerHTML = '';

    if (favoritesData.length === 0) {
        container.innerHTML = `<div style="font-size:11px; color:var(--text-muted); grid-column: 1/-1;">Belum ada emiten favorit. Cari emiten di kolom pencarian untuk memindahkannya ke sini.</div>`;
        return;
    }

    favoritesData.forEach(stock => {
        container.appendChild(createStockCard(stock, false, true));
    });
}

function createStockCard(stock, isEntryCard = false, isFavorite = false) {
    const card = document.createElement('div');
    card.className = isEntryCard ? 'entry-card' : 'stock-card-compact';
    card.id = `card-${stock.ticker}`;
    
    const isUp = stock.change_pct >= 0;
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
    const analysis = evaluateEntryStrategy(stock);
    const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
    const actionBarHTML = renderActionBar(stock);
    const isFav = favoritesData.some(f => f.ticker === stock.ticker);
    
    card.innerHTML = `
        <span class="black-star ${isFav ? 'favorited' : ''}" onclick="toggleFavorite(event, '${stock.ticker}')">★</span>
        ${powerBarHTML}
        <div class="stock-card-header">
            <div>
                <div class="ticker">${stock.ticker}</div>
                <div class="sector-name">${stock.sector}</div>
            </div>
            <span class="pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.change_pct}%</span>
        </div>
        <div class="price-text">Rp ${stock.close.toLocaleString('id-ID')}</div>
        <div style="margin-top:6px;" id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
        ${actionBarHTML}
    `;
    card.onclick = () => openModal(stock);
    return card;
}

function toggleFavorite(event, ticker) {
    event.stopPropagation();
    const stock = stocksData.find(s => s.ticker === ticker);
    if (!stock) return;

    const isFav = favoritesData.some(f => f.ticker === ticker);
    if (isFav) {
        removeFavoriteFromDB(ticker);
    } else {
        saveFavoriteToDB(stock);
    }
}

function updateAllCardsStarState() {
    document.querySelectorAll('.black-star').forEach(star => {
        // Logika memperbarui status bintang
    });
}

// Live Search & Blink Pindah ke Favorit dengan Tombol X
function handleSearchInput() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    if (input.value.length > 0) {
        clearBtn.classList.add('active');
    } else {
        clearBtn.classList.remove('active');
    }
}

function handleSearchKey(event) {
    if (event.key === 'Enter') {
        const query = document.getElementById('search-input').value.toUpperCase().trim();
        const found = stocksData.find(s => s.ticker === query || s.sector.toUpperCase().includes(query));
        
        if (found) {
            // Masukkan ke favorit dan beri efek blink 3x
            if (!favoritesData.some(f => f.ticker === found.ticker)) {
                saveFavoriteToDB(found);
            }
            setTimeout(() => {
                const favCard = document.getElementById(`card-${found.ticker}`);
                if (favCard) {
                    favCard.classList.add('blink-animation');
                    setTimeout(() => favCard.classList.remove('blink-animation'), 1800);
                }
            }, 150);
        }
    }
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search').classList.remove('active');
    renderAllStocksGrid(stocksData);
}

function filterStocks() {
    const query = document.getElementById('search-input').value.toUpperCase();
    const filtered = stocksData.filter(s => s.ticker.includes(query) || s.sector.toUpperCase().includes(query));
    renderAllStocksGrid(filtered);
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
        <div style="margin-top:12px;">
            <span style="font-size:11px; color:var(--text-muted); font-weight:700;">POWER SCORE</span>
            ${renderSignalPowerBar(stock.power_score || 5)}
        </div>
    `;
    document.getElementById('stock-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
}
