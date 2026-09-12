/**
 * app.js - Controller, UI Rotator, IndexedDB & Dynamic Renderer
 */

let stocksData = [];
let favoriteTickers = new Set();
let currentPhase = 0;
let currentModalStock = null;

// IndexedDB Setup untuk Backup Permanen
const DB_NAME = "IDX_Screener_DB";
const STORE_NAME = "favorites";
let db = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            loadFavoritesFromDB().then(resolve);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: "ticker" });
            }
        };
    });
}

function saveFavoriteToDB(stock) {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(stock);
    favoriteTickers.add(stock.ticker);
    refreshUIFavorites();
}

function removeFavoriteFromDB(ticker) {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(ticker);
    favoriteTickers.delete(ticker);
    refreshUIFavorites();
}

function loadFavoritesFromDB() {
    return new Promise((resolve) => {
        if (!db) return resolve([]);
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const items = request.result || [];
            items.forEach(item => favoriteTickers.add(item.ticker));
            refreshUIFavorites();
            resolve(items);
        };
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await initIndexedDB();
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
    top10List.forEach(stock => grid.appendChild(createStockCard(stock)));
}

function renderAllStocksGrid(stocks) {
    const grid = document.getElementById('all-stocks-grid');
    if (!grid) return;
    grid.innerHTML = '';
    stocks.forEach(stock => grid.appendChild(createStockCard(stock)));
}

function createStockCard(stock) {
    const card = document.createElement('div');
    card.className = 'stock-card-compact';
    card.id = `card-${stock.ticker}`;
    
    const isUp = stock.change_pct >= 0;
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
    const analysis = evaluateEntryStrategy(stock);
    const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
    const actionHTML = renderActionColumn(stock, analysis);
    const isFav = favoriteTickers.has(stock.ticker);
    
    card.innerHTML = `
        <button class="black-star-btn ${isFav ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleFavorite('${stock.ticker}')">★</button>
        ${powerBarHTML}
        <div class="stock-card-header">
            <div>
                <div class="ticker">${stock.ticker}</div>
                <div class="sector-name">${stock.sector}</div>
            </div>
        </div>
        <div class="price-container">
            <div class="price-text">Rp ${stock.close.toLocaleString('id-ID')}</div>
            <span class="pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.change_pct}%</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
            <div id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
            <div>${actionHTML}</div>
        </div>
    `;
    card.onclick = () => openModal(stock);
    return card;
}

function toggleFavorite(ticker) {
    const stock = stocksData.find(s => s.ticker === ticker);
    if (!stock) return;
    if (favoriteTickers.has(ticker)) {
        removeFavoriteFromDB(ticker);
    } else {
        saveFavoriteToDB(stock);
    }
    // Update ikon bintang pada semua kartu yang bersangkutan
    document.querySelectorAll(`.black-star-btn`).forEach(btn => {
        if (btn.closest(`#card-${ticker}`)) {
            btn.classList.toggle('favorited', favoriteTickers.has(ticker));
        }
    });
}

function refreshUIFavorites() {
    const favSection = document.getElementById('favorite-section');
    const favList = document.getElementById('favorite-list');
    if (!favSection || !favList) return;

    if (favoriteTickers.size === 0) {
        favSection.classList.add('hidden');
        return;
    }

    favSection.classList.remove('hidden');
    favList.innerHTML = '';
    
    stocksData.filter(s => favoriteTickers.has(s.ticker)).forEach(stock => {
        favList.appendChild(createStockCard(stock));
    });
}

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

// Live Search dengan Blink 3x & Tombol X Clear
function handleSearchInput() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    const query = input.value.trim().toUpperCase();

    if (query.length > 0) {
        clearBtn.classList.add('active');
    } else {
        clearBtn.classList.remove('active');
    }

    const filtered = stocksData.filter(s => s.ticker.includes(query) || s.sector.toUpperCase().includes(query));
    renderAllStocksGrid(filtered);

    // Efek Blink 3x pada hasil pencarian pertama jika pas
    if (query.length > 1 && filtered.length > 0) {
        const firstMatchCard = document.getElementById(`card-${filtered[0].ticker}`);
        if (firstMatchCard) {
            firstMatchCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstMatchCard.classList.remove('blink-card');
            void firstMatchCard.offsetWidth; // Trigger reflow
            firstMatchCard.classList.add('blink-card');
        }
    }
}

function clearSearch() {
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('clear-search').classList.remove('active');
    renderAllStocksGrid(stocksData);
    input.focus();
}

// Modal Details
function openModal(stock) {
    currentModalStock = stock;
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
    `;

    const favBtn = document.getElementById('modal-fav-btn');
    if (favoriteTickers.has(stock.ticker)) {
        favBtn.textContent = "Hapus dari Favorite DB";
        favBtn.style.background = "var(--red-bearish)";
    } else {
        favBtn.textContent = "Simpan ke Favorite DB";
        favBtn.style.background = "var(--accent-blue)";
    }

    document.getElementById('stock-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
}

function toggleCurrentModalFavorite() {
    if (!currentModalStock) return;
    toggleFavorite(currentModalStock.ticker);
    openModal(currentModalStock); // Refresh modal button state
}
