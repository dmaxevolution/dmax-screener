/**
 * app.js - Controller, UI Rotator, Persistent Local/IndexedDB Storage & Dynamic Renderer
 */

let stocksData = [];
let favoriteTickers = [];
let currentPhase = 0;

document.addEventListener("DOMContentLoaded", () => {
    loadFavoritesFromStorage();
    fetchData();
    startUIRotator();
});

// Manajemen Penyimpanan Permanen (Local/IndexedDB Backup & Delete)
function loadFavoritesFromStorage() {
    try {
        const saved = localStorage.getItem('idx_favorites_permanent');
        if (saved) {
            favoriteTickers = JSON.parse(saved);
        }
    } catch (e) {
        console.error("Gagal memuat data favorite:", e);
    }
}

function saveFavoritesToStorage() {
    try {
        localStorage.setItem('idx_favorites_permanent', JSON.stringify(favoriteTickers));
    } catch (e) {
        console.error("Gagal menyimpan data favorite secara permanen:", e);
    }
}

function toggleFavorite(ticker, event) {
    if (event) event.stopPropagation();
    if (favoriteTickers.includes(ticker)) {
        favoriteTickers = favoriteTickers.filter(t => t !== ticker);
    } else {
        favoriteTickers.push(ticker);
    }
    saveFavoritesToStorage();
    renderFavoritesSection();
    renderAllStocksGrid(stocksData);
    renderTop10Compact(stocksData.slice(0, 10));
}

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

// Render Bagian Favorite
function renderFavoritesSection() {
    const section = document.getElementById('favorite-section');
    const grid = document.getElementById('favorite-grid');
    if (!section || !grid) return;

    if (favoriteTickers.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    grid.innerHTML = '';

    const favStocks = stocksData.filter(s => favoriteTickers.includes(s.ticker));
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
        return strat.entryStatus === "BUY" || strat.entryStatus === "ENTRY" || strat.patternName !== "-";
    });

    entryStocks.slice(0, 6).forEach(stock => {
        const analysis = evaluateEntryStrategy(stock);
        const card = document.createElement('div');
        card.className = 'entry-card';
        
        const isFav = favoriteTickers.includes(stock.ticker);
        const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
        const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
        const statusBadgeHTML = renderStatusBadge(analysis);
        const isUp = stock.change_pct >= 0;
        
        card.innerHTML = `
            <span class="black-star ${isFav ? 'favorited' : ''}" onclick="toggleFavorite('${stock.ticker}', event)">★</span>
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding-right:16px;">
                    <div>
                        <span class="ticker">${stock.ticker}</span>
                        <span class="sector-name" style="margin-left:6px;">${stock.sector}</span>
                    </div>
                    <div id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px;">
                    <div class="price-text">Rp ${stock.close.toLocaleString('id-ID')}</div>
                    <span class="pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.change_pct}%</span>
                </div>
                ${powerBarHTML}
                ${statusBadgeHTML}
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
    const isFav = favoriteTickers.includes(stock.ticker);
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
    const analysis = evaluateEntryStrategy(stock);
    const badgeHTML = getRotatorBadgeHTML(stock.ticker, analysis);
    const statusBadgeHTML = renderStatusBadge(analysis);
    
    card.innerHTML = `
        <span class="black-star ${isFav ? 'favorited' : ''}" onclick="toggleFavorite('${stock.ticker}', event)">★</span>
        <div class="stock-card-header">
            <div>
                <div class="ticker">${stock.ticker}</div>
                <div class="sector-name">${stock.sector}</div>
            </div>
            <span class="pct ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.change_pct}%</span>
        </div>
        <div class="price-text">Rp ${stock.close.toLocaleString('id-ID')}</div>
        <div style="margin-top:6px;" id="badge-rotator-${stock.ticker}">${badgeHTML}</div>
        ${powerBarHTML}
        ${statusBadgeHTML}
    `;
    card.onclick = () => openModal(stock);
    return card;
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

// Logika Pencarian: Hasil otomatis masuk Favorite dengan Efek Blink 3x
function filterStocks(event) {
    const inputEl = document.getElementById('search-input');
    const query = inputEl.value.toUpperCase().trim();
    
    const filtered = stocksData.filter(s => s.ticker.includes(query) || s.sector.toUpperCase().includes(query));
    renderAllStocksGrid(filtered);

    // Jika user menekan tombol Enter pada pencarian, masukkan hasil ke Favorite dan berikan efek blink 3x
    if (event && event.key === 'Enter' && query !== '') {
        filtered.forEach(stock => {
            if (!favoriteTickers.includes(stock.ticker)) {
                favoriteTickers.push(stock.ticker);
            }
        });
        saveFavoritesToStorage();
        renderFavoritesSection();
        renderAllStocksGrid(stocksData);

        // Tambahkan efek blink pada kartu favorite yang baru masuk
        setTimeout(() => {
            filtered.forEach(stock => {
                const favCard = document.querySelector(`#favorite-grid`);
                // Cari card spesifik lalu tambahkan class blink
                if (favCard) {
                    const cards = favCard.querySelectorAll('.stock-card-compact');
                    cards.forEach(c => {
                        if (c.textContent.includes(stock.ticker)) {
                            c.classList.add('blink-effect');
                            setTimeout(() => c.classList.remove('blink-effect'), 1800);
                        }
                    });
                }
            });
        }, 100);
    }
}

// Tombol X untuk menghapus pencarian
function clearSearch() {
    const inputEl = document.getElementById('search-input');
    inputEl.value = '';
    renderAllStocksGrid(stocksData);
    inputEl.focus();
}

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