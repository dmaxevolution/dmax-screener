let stocksData = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
});

async function fetchData() {
    try {
        const res = await fetch('data.json');
        const data = await res.json();
        
        renderIHSGHeader(data.ihsg);
        stocksData = data.all_stocks || [];
        
        // Render Total Counter
        const totalEl = document.getElementById('total-emiten-count');
        if (totalEl) totalEl.textContent = `${data.total_emiten || stocksData.length} Emiten BEI`;

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

    stocks.forEach(stock => {
        const analysis = evaluateEntryStrategy(stock);
        
        if (analysis.entryStatus !== "NEUTRAL" || analysis.patternName !== "-") {
            const card = document.createElement('div');
            card.className = 'entry-card';
            
            const colorClass = analysis.patternType.toLowerCase();
            const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
            
            card.innerHTML = `
                <div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size: 15px; font-weight: 800;">${stock.ticker}</span>
                        <span style="font-size:10px; color:var(--text-muted); border:1px solid var(--border-color); padding:1px 6px; border-radius:4px;">${stock.sector}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top:2px;">Penutupan: Rp ${stock.close.toLocaleString('id-ID')}</div>
                    ${powerBarHTML}
                </div>
                <div>
                    <span class="candle-tag ${colorClass}">${analysis.patternName}</span>
                </div>
            `;
            container.appendChild(card);
        }
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
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
    
    card.innerHTML = `
        <div>
            <div class="stock-card-header">
                <div>
                    <span class="ticker">${stock.ticker}</span>
                    <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase;">${stock.sector}</div>
                </div>
                <span class="pct ${isUp ? 'up' : 'down'}" style="font-family:'JetBrains Mono'; font-size:12px; font-weight:700; color:${isUp ? 'var(--neon-green)' : 'var(--neon-red)'};">
                    ${isUp ? '+' : ''}${stock.change_pct}%
                </span>
            </div>
            <div class="stock-card-body">
                <div class="price">Rp ${stock.close.toLocaleString('id-ID')}</div>
            </div>
        </div>
        ${powerBarHTML}
    `;
    card.onclick = () => openModal(stock);
    return card;
}

function openModal(stock) {
    document.getElementById('modal-ticker').textContent = `${stock.ticker} (${stock.sector})`;
    const details = document.getElementById('modal-details');
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);

    details.innerHTML = `
        <div class="modal-details-row"><span>Sektor BEI</span><span>${stock.sector}</span></div>
        <div class="modal-details-row"><span>Open / High / Low</span><span>${stock.open} / ${stock.high} / ${stock.low}</span></div>
        <div class="modal-details-row"><span>Penutupan Resmi</span><span>Rp ${stock.close.toLocaleString('id-ID')}</span></div>
        <div class="modal-details-row"><span>RSI (14)</span><span>${stock.rsi}</span></div>
        <div class="modal-details-row"><span>EMA 20 / EMA 50</span><span>${stock.ema20} / ${stock.ema50}</span></div>
        <div class="modal-details-row"><span>Stop Loss</span><span style="color:var(--neon-red);">Rp ${stock.stop_loss.toLocaleString('id-ID')}</span></div>
        <div class="modal-details-row"><span>Take Profit 1</span><span style="color:var(--neon-green);">Rp ${stock.take_profit_1.toLocaleString('id-ID')}</span></div>
        <div class="modal-details-row"><span>Take Profit 2</span><span style="color:var(--neon-green);">Rp ${stock.take_profit_2.toLocaleString('id-ID')}</span></div>
        <div style="margin-top:18px;">
            <span style="font-size:11px; color:var(--text-muted); font-weight:700; letter-spacing:1px;">POWER SIGNAL</span>
            ${powerBarHTML}
        </div>
    `;
    document.getElementById('stock-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
}
