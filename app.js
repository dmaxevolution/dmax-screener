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
        
        renderEntrySection(stocksData);
        renderTop10Compact(data.top_10_entry || stocksData.slice(0, 10));
    } catch (err) {
        console.error("Gagal memuat data:", err);
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
    container.innerHTML = '';

    stocks.forEach(stock => {
        const strategy = evaluateTradingStrategy(stock);
        const card = document.createElement('div');
        card.className = 'entry-card';
        
        const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
        const statusClass = strategy.status.toLowerCase();
        
        card.innerHTML = `
            <div>
                <div style="font-size: 15px; font-weight: 800; letter-spacing: 0.5px;">${stock.ticker}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Close: Rp ${stock.close.toLocaleString('id-ID')}</div>
                ${powerBarHTML}
            </div>
            <div>
                <span class="status-badge ${statusClass}">${strategy.status}</span>
            </div>
        `;
        card.onclick = () => openModal(stock);
        container.appendChild(card);
    });
}

function renderTop10Compact(top10List) {
    const grid = document.getElementById('top10-grid');
    grid.innerHTML = '';

    top10List.forEach(stock => {
        const strategy = evaluateTradingStrategy(stock);
        const card = document.createElement('div');
        card.className = 'stock-card-compact';
        const isUp = stock.change_pct >= 0;
        const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
        const statusClass = strategy.status.toLowerCase();
        
        card.innerHTML = `
            <div>
                <div class="stock-card-header">
                    <span class="ticker">${stock.ticker}</span>
                    <span class="pct ${isUp ? 'up' : 'down'}" style="font-family:'JetBrains Mono'; font-size:12px; font-weight:700; color:${isUp ? 'var(--neon-green)' : 'var(--neon-red)'};">
                        ${isUp ? '+' : ''}${stock.change_pct}%
                    </span>
                </div>
                <div class="stock-card-body" style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <div class="price">Rp ${stock.close.toLocaleString('id-ID')}</div>
                    <span class="status-badge ${statusClass}" style="font-size:9px; padding:3px 7px;">${strategy.status}</span>
                </div>
            </div>
            ${powerBarHTML}
        `;
        card.onclick = () => openModal(stock);
        grid.appendChild(card);
    });
}

function openModal(stock) {
    const strategy = evaluateTradingStrategy(stock);
    document.getElementById('modal-ticker').textContent = `${stock.ticker}`;
    const details = document.getElementById('modal-details');
    const powerBarHTML = renderSignalPowerBar(stock.power_score || 5);
    const statusClass = strategy.status.toLowerCase();

    details.innerHTML = `
        <div class="modal-details-row"><span>Status Strategi</span><span class="status-badge ${statusClass}">${strategy.status}</span></div>
        <div class="modal-details-row"><span>Pola Candlestick</span><span>${strategy.patternName}</span></div>
        <div class="modal-details-row"><span>Harga Close Murni</span><span>Rp ${stock.close.toLocaleString('id-ID')}</span></div>
        <div class="modal-details-row"><span>RSI (14)</span><span>${stock.rsi}</span></div>
        <div class="modal-details-row"><span>EMA 20 / EMA 50</span><span>${stock.ema20} / ${stock.ema50}</span></div>
        <div class="modal-details-row"><span>Stop Loss (Low 20D)</span><span style="color:var(--neon-red);">Rp ${stock.stop_loss}</span></div>
        <div class="modal-details-row"><span>Take Profit 1</span><span style="color:var(--neon-green);">Rp ${stock.take_profit_1}</span></div>
        <div class="modal-details-row"><span>Take Profit 2 (High 20D)</span><span style="color:var(--neon-green);">Rp ${stock.take_profit_2}</span></div>
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
