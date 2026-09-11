function updateTabCounts() {
    ['entry_now', 'swing_setup', 'top_gainers', 'top_movers', 'bluechips', 'top_bearish', 'all_stocks'].forEach(cat => {
        const el = document.getElementById('count-' + cat);
        if (el && globalData[cat]) el.innerText = globalData[cat].length;
    });
    const pEl = document.getElementById('count-pantauan');
    if (pEl) pEl.innerText = pantauanList.length;
}

function renderIHSG(ihsg) {
    if (!ihsg || ihsg.close === undefined) return;
    const closeEl = document.getElementById('ihsg-header-close');
    const pctEl = document.getElementById('ihsg-header-pct');
    if (closeEl) closeEl.innerText = ihsg.close ? ihsg.close.toLocaleString('id-ID') : '0.00';
    if (pctEl) pctEl.innerText = `${ihsg.change_pct}%`;
}

// Render Top 10 Khusus Tampilan HP (Kartu Berwarna Emas/Kuning)
function renderTop10EntryMobile(items) {
    const container = document.getElementById('top-10-mobile-cards');
    if (!container) return;
    container.innerHTML = '';

    (items || []).forEach((item, index) => {
        const inPantauan = pantauanList.includes(item.ticker);
        const card = document.createElement('div');
        card.id = 'card-top10-' + item.ticker;
        card.className = 'bg-gradient-to-r from-gray-900 to-gray-800 border-2 border-yellow-500/80 rounded-xl p-3 shadow-lg relative overflow-hidden';
        
        card.innerHTML = `
            <div class="flex justify-between items-center mb-1.5">
                <div class="flex items-center gap-2">
                    <span class="bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full">#${index + 1}</span>
                    <span class="font-black text-yellow-400 text-base tracking-wide">${item.ticker}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-sm ${item.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}">
                        ${item.change_pct >= 0 ? '+' : ''}${item.change_pct}%
                    </span>
                    <button onclick="${inPantauan ? `removeFromPantauan('${item.ticker}')` : `addToPantauan('${item.ticker}')`}" class="text-xs bg-gray-700 p-1 rounded hover:bg-gray-600">
                        ${inPantauan ? '❌' : '👁️+'}
                    </button>
                </div>
            </div>

            <div class="flex justify-between items-center my-2 bg-gray-950/50 p-2 rounded-lg border border-gray-800">
                <span class="text-xs text-gray-300">Harga: <strong class="text-white text-sm">Rp ${item.close.toLocaleString('id-ID')}</strong></span>
                ${renderPowerBoxes(item.signal, item.power_score, item.candle_pattern)}
            </div>

            <div class="flex justify-between items-center pt-1.5 text-[11px] font-medium border-t border-gray-800">
                <span class="text-red-400">SL: <strong>${item.stop_loss}</strong></span>
                <span class="text-green-400">TP: <strong>${item.take_profit_1} / ${item.take_profit_2}</strong></span>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderDesktopTable(items) {
    const tbody = document.getElementById('screener-data-desktop');
    if (!tbody) return;
    tbody.innerHTML = '';
    (items || []).forEach(item => {
        const inPantauan = pantauanList.includes(item.ticker);
        const row = document.createElement('tr');
        row.id = 'row-' + item.ticker;
        row.className = 'border-b border-gray-700/50 hover:bg-gray-750 transition-colors';
        row.innerHTML = `
            <td class="p-3 font-bold text-yellow-400">${item.ticker}</td>
            <td class="p-3">Rp ${item.close.toLocaleString('id-ID')}</td>
            <td class="p-3 ${item.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}">${item.change_pct >= 0 ? '+' : ''}${item.change_pct}%</td>
            <td class="p-3">${item.ema20} ${renderDot(item.ema20_status)}</td>
            <td class="p-3">${item.ema50} ${renderDot(item.ema50_status)}</td>
            <td class="p-3">${item.rsi} ${renderDot(item.rsi_status)}</td>
            <td class="p-3 text-center">${renderPowerBoxes(item.signal, item.power_score, item.candle_pattern)}</td>
            <td class="p-3 text-red-400 font-semibold">${item.stop_loss}</td>
            <td class="p-3 text-green-400 font-semibold">${item.take_profit_1} / ${item.take_profit_2}</td>
            <td class="p-3 text-center">
                <button onclick="${inPantauan ? `removeFromPantauan('${item.ticker}')` : `addToPantauan('${item.ticker}')`}" class="bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
                    ${inPantauan ? '❌' : '👁️+'}
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderMobileCards(items) {
    const container = document.getElementById('screener-data-mobile');
    if (!container) return;
    container.innerHTML = '';
    (items || []).forEach(item => {
        const inPantauan = pantauanList.includes(item.ticker);
        const card = document.createElement('div');
        card.id = 'card-' + item.ticker;
        card.className = 'bg-gray-800 border border-gray-700/80 rounded-xl p-3 shadow-md transition-all';
        card.innerHTML = `
            <div class="flex justify-between items-center mb-1.5">
                <span class="font-bold text-yellow-400 text-base">${item.ticker}</span>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-sm ${item.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}">
                        ${item.change_pct >= 0 ? '+' : ''}${item.change_pct}%
                    </span>
                    <button onclick="${inPantauan ? `removeFromPantauan('${item.ticker}')` : `addToPantauan('${item.ticker}')`}" class="text-xs bg-gray-700 p-1 rounded hover:bg-gray-600">
                        ${inPantauan ? '❌' : '👁️+'}
                    </button>
                </div>
            </div>
            <div class="flex justify-between items-center my-2 bg-gray-900/60 p-2 rounded-lg">
                <span class="text-xs text-gray-300">Harga: <strong class="text-white">Rp ${item.close.toLocaleString('id-ID')}</strong></span>
                ${renderPowerBoxes(item.signal, item.power_score, item.candle_pattern)}
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-gray-700/60 text-xs font-medium">
                <span class="text-red-400">SL: ${item.stop_loss}</span>
                <span class="text-green-400">TP: ${item.take_profit_1} / ${item.take_profit_2}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Fungsi Pencarian (Dukungan Blink & Scroll untuk Desktop + Mobile HP)
function searchTicker(tickerQuery) {
    if (!tickerQuery) return;
    const cleanTicker = tickerQuery.toUpperCase().trim();
    
    // Coba Cari di Tampilan Desktop
    const desktopRow = document.getElementById('row-' + cleanTicker);
    if (desktopRow) {
        desktopRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        desktopRow.classList.add('bg-yellow-900/50', 'animate-pulse');
        setTimeout(() => desktopRow.classList.remove('bg-yellow-900/50', 'animate-pulse'), 3000);
    }

    // Coba Cari di Tampilan Mobile Kartu
    const mobileCard = document.getElementById('card-' + cleanTicker) || document.getElementById('card-top10-' + cleanTicker);
    if (mobileCard) {
        mobileCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        mobileCard.classList.add('ring-4', 'ring-yellow-400', 'animate-pulse');
        setTimeout(() => mobileCard.classList.remove('ring-4', 'ring-yellow-400', 'animate-pulse'), 3000);
    }
}

function renderCurrentTab() {
    let data = [];
    if (currentTab === 'entry_now') {
        data = (globalData['top_10_entry'] || []).filter(x => x.power_score >= 9);
    } else if (currentTab === 'pantauan') {
        data = getPantauanData();
    } else {
        data = globalData[currentTab] || [];
    }
    
    renderDesktopTable(data);
    renderMobileCards(data);
}
