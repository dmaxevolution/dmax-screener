/**
 * app.js - Controller, UI Rotator, Search Blink & Storage Manager
 */

let stocksData = [];
let favoriteTickers = JSON.parse(localStorage.getItem('idx_favorites')) || [];
let currentPhase = 0;

document.addEventListener("DOMContentLoaded", () => {
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

        renderFavoritesSection();
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

// Toggle Favorite dengan backup permanent localStorage & efek blink
function toggleFavorite(ticker, event) {
    event.stopPropagation();
    if (favoriteTickers.includes(ticker)) {
        favoriteTickers = favoriteTickers.filter(t => t !== ticker);
    } else {
        favoriteTickers.push(ticker);
    }
    localStorage.setItem('idx_favorites', JSON.stringify(favoriteTickers));
    
    renderFavoritesSection();
    renderAllStocksGrid(stocksData);
}

function renderFavoritesSection() {
    const container = document.getElementById('favorite-list');
    if (!container) return;
    container.innerHTML = '';

    const favStocks = stocksData.filter(s => favoriteTickers.includes(s.ticker));
    if (favStocks.length === 0) {
        container.innerHTML = `<div style="font-size:11px; color:var(--text-muted); grid-column: 1/-1;">Klik ikon bintang hitam pada kartu emiten untuk menyimpan ke Favorit.</div>`;
        return;
    }

    favStocks.forEach(stock => {
        const card = createStockCard(stock);
        card.classList.add('blink-card'); // Efek kedip untuk hasil favorit
        container.appendChild(card);
    });
}

function clearAllFavorites() {
    favoriteTickers = [];
    localStorage.removeItem('idx_favorites');
    renderFavoritesSection();
    renderAllStocksGrid(stocksData);
}

function renderEntrySection(stocks) {
    const container = document.getElementById('entry-list');
    if (!container) return;
    container.innerHTML = '';

    const entryStocks = stocks.filter(s => {
        const strat = evaluateEntryStrategy(s);
        return strat.entryStatus !== "WAIT" || strat.patternName !== "-";
    });

    entryStocks.slice(0, 6).forEach(stock => {
        const analysis = evaluateEntryStrategy(stock);
        const card = document.createElement('div');
        card.className = 'entry-card';
        
        const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
        const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
        const isUp = stock.change_pct >= 0;
        const isFav = favoriteTickers.includes(stock.ticker);
        const actionBadge = getActionStatusBadge(analysis);

        card.innerHTML = `
            <button class="black-star-btn ${isFav ? 'favorited' : ''}" onclick="toggleFavorite('${stock.ticker}', event)">&#9733;</button>
            <div>
                ${powerBarHTML}
                <div class="stock-card-header">
                    <span class="ticker">${stock.ticker}</span>
                    <span class="sector-name">${stock.sector}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <div class="price-text">Rp ${stock.close.toLocaleString('id-ID')}</div>
                    <span class="pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.change_pct}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                    <div id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
                    <div>${actionBadge}</div>
                </div>
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
    const isUp = stock.change_pct >= 0;
    const isFav = favoriteTickers.includes(stock.ticker);
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
    const analysis = evaluateEntryStrategy(stock);
    const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
    const actionBadge = getActionStatusBadge(analysis);
    
    card.innerHTML = `
        <button class="black-star-btn ${isFav ? 'favorited' : ''}" onclick="toggleFavorite('${stock.ticker}', event)">&#9733;</button>
        ${powerBarHTML}
        <div class="stock-card-header">
            <div class="ticker">${stock.ticker}</div>
            <div class="sector-name">${stock.sector}</div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
                <div class="price-text">Rp ${stock.close.toLocaleString('id-ID')}</div>
                <span class="pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.change_pct}%</span>
            </div>
            <div>${actionBadge}</div>
        </div>
        <div style="margin-top:6px;" id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
    `;
    card.onclick = () => openModal(stock);
    return card;
}

function getActionStatusBadge(analysis) {
    let cssClass = "wait";
    let text = analysis.actionLabel;
    let icon = "";

    if (analysis.entryStatus === "BUY") {
        cssClass = "rocket";
        icon = getCandleIconSVG("ROCKET");
    } else if (analysis.entryStatus === "ENTRY") {
        cssClass = "sand";
        icon = getCandleIconSVG("SAND");
    }

    return `<span class="action-status-badge ${cssClass}">${icon} ${text}</span>`;
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

// Live Search dengan Blink & Tombol Clear X
function filterStocks() {
    const query = document.getElementById('search-input').value.toUpperCase();
    const filtered = stocksData.filter(s => s.ticker.includes(query) || s.sector.toUpperCase().includes(query));
    
    const grid = document.getElementById('all-stocks-grid');
    grid.innerHTML = '';
    filtered.forEach(stock => {
        const card = createStockCard(stock);
        if (query.length > 0) card.classList.add('blink-card'); // Efek kedip hasil pencarian
        grid.appendChild(card);
    });
}

function clearSearchBox() {
    document.getElementById('search-input').value = '';
    filterStocks();
}

// Modal Details
function openModal(stock) {
    document.getElementById('modal-ticker').textContent = stock.ticker;
    document.getElementById('modal-sector').textContent = stock.sector;
    const details = document.getElementById('modal-details');

    details.innerHTML = `
        <div style="margin-bottom:8px;">${renderSignalPowerBar(stock.power_score || 5)}</div>
        <div class="modal-row"><span>Penutupan Murni</span><span style="color:#fff;">Rp ${stock.close.toLocaleString('id-ID')}</span></div>
        <div class="modal-row"><span>Open / High / Low</span><span>${stock.open} / ${stock.high} / ${stock.low}</span></div>
        <div class="modal-row"><span>RSI (14)</span><span>${stock.rsi}</span></div>
        <div class="modal-row"><span>EMA 20 / EMA 50</span><span>${stock.ema20} / ${stock.ema50}</span></div>
        <div class="modal-row"><span>Stop Loss (SL)</span><span style="color:var(--red-bearish);">Rp ${stock.stop_loss.toLocaleString('id-ID')}</span></div>
        <div class="modal-row"><span>Target Profit 1 (TP1)</span><span style="color:var(--green-bullish);">Rp ${stock.take_profit_1.toLocaleString('id-ID')}</span></div>
        <div class="modal-row"><span>Target Profit 2 (TP2)</span><span style="color:var(--green-bullish);">Rp ${stock.take_profit_2.toLocaleString('id-ID')}</span></div>
    `;
    document.getElementById('stock-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
}