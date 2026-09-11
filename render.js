function updateTabCounts() {
    ['entry_now', 'swing_setup', 'top_gainers', 'top_movers', 'bluechips', 'top_bearish', 'all_stocks'].forEach(cat => {
        const el = document.getElementById('count-' + cat);
        if (el && globalData[cat]) {
            el.innerText = globalData[cat].length;
        }
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

// RENDER KARTU EMITEN SIAP ENTRY (RANK 1, 2, 3...)
function renderReadyEntryRanked(items) {
    const container = document.getElementById('ready-entry-cards');
    if (!container) return;
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="col-span-full p-4 bg-gray-900 text-center text-gray-400 rounded-xl border border-gray-800">Tidak ada emiten siap entry yang memenuhi kriteria keamanan saat ini.</div>`;
        return;
    }

    items.forEach((item, index) => {
        const rank = index + 1;
        const inPantauan = pantauanList.includes(item.ticker);

        let badgeBg = 'bg-gray-800 border-gray-700 text-gray-300';
        if (rank === 1) badgeBg = 'bg-yellow-500 text-black border-yellow-400 font-black';
        else if (rank === 2) badgeBg = 'bg-slate-300 text-black border-slate-200 font-black';
        else if (rank === 3) badgeBg = 'bg-amber-700 text-white border-amber-600 font-black';

        const card = document.createElement('div');
        card.id = 'card-ranked-' + item.ticker;
        card.className = 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-850 border border-gray-800 hover:border-green-500/50 rounded-xl p-3.5 shadow-lg relative transition-all';
        
        card.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-xs border ${badgeBg}">RANK #${rank}</span>
                    <span class="font-black text-white text-base tracking-wide">${item.ticker}</span>
                    <span class="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-bold">${item.category}</span>
                </div>
                <button onclick="${inPantauan ? `removeFromPantauan('${item.ticker}')` : `addToPantauan('${item.ticker}')`}" class="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 p-1 rounded">
                    ${inPantauan ? '❌' : '👁️+'}
                </button>
            </div>

            <div class="flex justify-between items-baseline my-1.5">
                <div>
                    <span class="text-xs text-gray-400">Harga:</span>
                    <span class="text-sm font-bold text-white ml-1">Rp ${item.close.toLocaleString('id-ID')}</span>
                </div>
                <span class="text-sm font-bold ${item.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${item.change_pct >= 0 ? '+' : ''}${item.change_pct}%
                </span>
            </div>

            <div class="my-2 bg-gray-950 p-2 rounded-lg border border-gray-800/80 space-y-1.5">
                <div class="flex justify-between items-center text-[11px]">
                    <span class="text-gray-400">Skor Keamanan: <strong class="text-green-400">${item.safety_score}/100</strong></span>
                    <span class="text-gray-400">RRR: <strong class="text-yellow-400">1:${item.rrr_ratio}</strong></span>
                </div>
                ${renderPowerBoxes(item.signal, item.power_score, item.candle_pattern)}
            </div>

            <div class="flex justify-between items-center pt-2 text-[11px] font-semibold border-t border-gray-800/80">
                <span class="text-red-400">SL: ${item.stop_loss}</span>
                <span class="text-green-400">TP: ${item.take_profit_1} / ${item.take_profit_2}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderTop10Entry(items) {
    const container = document.getElementById('top-10-data');
    if (!container) return;
    container.innerHTML = '';

    (items || []).forEach((item, index) => {
        const row = document.createElement('tr');
        row.id = 'row-top10-' + item.ticker;
        row.innerHTML = `
            <td class="py-2.5 px-3 font-bold text-yellow-400">#${index + 1}</td>
            <td class="py-2.5 px-3 font-bold text-white">${item.ticker}</td>
            <td class="py-2.5 px-3">Rp ${item.close.toLocaleString('id-ID')}</td>
            <td class="py-2.5 px-3 ${item.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}">${item.change_pct >= 0 ? '+' : ''}${item.change_pct}%</td>
            <td class="py-2.5 px-3">${renderPowerBoxes(item.signal, item.power_score, item.candle_pattern)}</td>
            <td class="py-2.5 px-3 text-red-400 font-semibold">${item.stop_loss}</td>
            <td class="py-2.5 px-3 text-green-400 font-semibold">${item.take_profit_1} / ${item.take_profit_2}</td>
        `;
        container.appendChild(row);
    });
}

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

            <div class="my-2 bg-gray-950/50 p-2 rounded-lg border border-gray-800 space-y-1.5">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-300">Harga: <strong class="text-white text-sm">Rp ${item.close.toLocaleString('id-ID')}</strong></span>
                    <span class="text-[10px] text-gray-400">RRR: <strong class="text-yellow-400">1:${item.rrr_ratio}</strong></span>
                </div>
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
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-gray-500">Tidak ada data emiten untuk kategori ini.</td></tr>`;
        return;
    }

    items.forEach(item => {
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
            <td class="p-3">${renderPowerBoxes(item.signal, item.power_score, item.candle_pattern)}</td>
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

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 bg-gray-900 rounded-xl">Tidak ada data emiten untuk kategori ini.</div>`;
        return;
    }

    items.forEach(item => {
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
            <div class="my-2 bg-gray-900/60 p-2 rounded-lg space-y-1">
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-300">Harga: <strong class="text-white">Rp ${item.close.toLocaleString('id-ID')}</strong></span>
                    <span class="text-[10px] text-gray-400">RRR: <strong class="text-yellow-400">1:${item.rrr_ratio}</strong></span>
                </div>
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

// EKSEKUSI PENCARIAN
function handleSearchInput(event) {
    if (event.key === 'Enter') {
        executeSearch();
    }
}

function executeSearch() {
    const inputEl = document.getElementById('search-input');
    if (!inputEl) return;
    
    const query = inputEl.value.toUpperCase().trim();
    if (!query) return;

    // 1. Pindah Tab Ke 'Semua' Agar Elemen Pasti Ada Di DOM
    switchTab('all_stocks');

    setTimeout(() => {
        let found = false;

        // Cek Kartu Ranked
        const rankedCard = document.getElementById('card-ranked-' + query);
        if (rankedCard) {
            rankedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            rankedCard.classList.add('ring-4', 'ring-green-400', 'animate-pulse');
            setTimeout(() => rankedCard.classList.remove('ring-4', 'ring-green-400', 'animate-pulse'), 3000);
            found = true;
        }

        // Cek Tabel Desktop
        const desktopRow = document.getElementById('row-' + query);
        if (desktopRow) {
            desktopRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            desktopRow.classList.add('bg-yellow-900/70', 'animate-pulse');
            setTimeout(() => desktopRow.classList.remove('bg-yellow-900/70', 'animate-pulse'), 3000);
            found = true;
        }

        // Cek Kartu Mobile
        const mobileCard = document.getElementById('card-' + query);
        if (mobileCard) {
            mobileCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            mobileCard.classList.add('ring-4', 'ring-yellow-400', 'animate-pulse');
            setTimeout(() => mobileCard.classList.remove('ring-4', 'ring-yellow-400', 'animate-pulse'), 3000);
            found = true;
        }

        if (!found) {
            alert(`Emiten dengan kode "${query}" tidak ditemukan atau belum terdaftar dalam sistem.`);
        }
    }, 100);
}

function renderCurrentTab() {
    let data = [];
    if (currentTab === 'pantauan') {
        data = getPantauanData();
    } else {
        data = globalData[currentTab] || [];
    }
    
    renderDesktopTable(data);
    renderMobileCards(data);
}