// Update Counter Jumlah Emiten per Tab
function updateTabCounts() {
    const categories = ['swing_setup', 'top_gainers', 'top_movers', 'bluechips', 'top_bearish', 'all_stocks'];
    categories.forEach(cat => {
        const el = document.getElementById('count-' + cat);
        if (el && globalData[cat]) el.innerText = globalData[cat].length;
    });
    const pEl = document.getElementById('count-pantauan');
    if (pEl) pEl.innerText = pantauanList.length;
}

// Render Informasi Indeks IHSG
function renderIHSG(ihsg) {
    if (!ihsg || ihsg.close === undefined) return;
    const chgPct = ihsg.change_pct || 0;
    const ihsgCard = document.getElementById('ihsg-card');

    if (chgPct > 0) ihsgCard.className = "mb-6 bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 shadow-lg transition-colors duration-500";
    else if (chgPct < 0) ihsgCard.className = "mb-6 bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 shadow-lg transition-colors duration-500";
    else ihsgCard.className = "mb-6 bg-gray-800/60 border border-gray-700/60 rounded-xl p-4 shadow-lg transition-colors duration-500";

    const isPositive = chgPct >= 0;
    const changeClass = isPositive ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40';
    const closeColorClass = isPositive ? 'text-green-400' : 'text-red-400';
    const changeSign = isPositive ? '+' : '';

    document.getElementById('ihsg-header-close').innerText = ihsg.close ? ihsg.close.toLocaleString('id-ID') : '0.00';
    const headerPct = document.getElementById('ihsg-header-pct');
    headerPct.innerText = `${changeSign}${ihsg.change_pct}%`;
    headerPct.className = `font-bold px-2 py-0.5 rounded text-xs border ${changeClass}`;

    document.getElementById('ihsg-col-prev').innerText = ihsg.prev_close ? ihsg.prev_close.toLocaleString('id-ID') : '-';
    document.getElementById('ihsg-col-open').innerText = ihsg.open ? ihsg.open.toLocaleString('id-ID') : '-';
    document.getElementById('ihsg-col-low').innerText = ihsg.low ? ihsg.low.toLocaleString('id-ID') : '-';
    document.getElementById('ihsg-col-high').innerText = ihsg.high ? ihsg.high.toLocaleString('id-ID') : '-';
    
    const colClose = document.getElementById('ihsg-col-close');
    colClose.innerText = ihsg.close ? ihsg.close.toLocaleString('id-ID') : '-';
    colClose.className = `py-2.5 px-3 font-bold ${closeColorClass}`;
}

// Render Tabel Top 10 Best Entry Signal
function renderTop10Entry(items) {
    const container = document.getElementById('top-10-data');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="text-center p-3 text-gray-500">Belum ada sinyal entry.</td></tr>`;
        return;
    }

    items.forEach((item, index) => {
        const isPositive = (item.change_pct || 0) >= 0;
        const changeClass = isPositive ? 'text-green-400' : 'text-red-400';
        const changeSign = isPositive ? '+' : '';

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-750/50 transition-colors';
        row.innerHTML = `
            <td class="py-2 px-2 font-extrabold text-green-400">#${index + 1}</td>
            <td class="py-2 px-2 font-bold text-yellow-400">
                ${item.ticker} <span class="text-[9px] bg-gray-700 text-gray-300 px-1 py-0.5 rounded ml-0.5">${item.category}</span>
            </td>
            <td class="py-2 px-2 font-medium">${item.close ? item.close.toLocaleString('id-ID') : '-'}</td>
            <td class="py-2 px-2 font-semibold ${changeClass}">${changeSign}${item.change_pct}%</td>
            <td class="py-2 px-2 text-center">${renderPowerBoxes(item.signal, item.power_score)}</td>
            <td class="py-2 px-2 text-red-400">${item.stop_loss ? item.stop_loss.toLocaleString('id-ID') : '-'} ${item.cl_hit ? '<span class="inline-block animate-signal-blink">🛑✨</span>' : ''}</td>
            <td class="py-2 px-2 text-green-400">
                ${item.take_profit_1 ? item.take_profit_1.toLocaleString('id-ID') : '-'} ${item.tp1_hit ? '<span class="inline-block animate-signal-blink">💚✨</span>' : ''} / 
                ${item.take_profit_2 ? item.take_profit_2.toLocaleString('id-ID') : '-'} ${item.tp2_hit ? '<span class="inline-block animate-signal-blink">💚✨</span>' : ''}
            </td>
        `;
        container.appendChild(row);
    });
}

// Render Tabel Desktop
function renderDesktopTable(items) {
    const tbody = document.getElementById('screener-data-desktop');
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center p-6 text-gray-500">Tidak ada data emiten untuk kategori ini.</td></tr>`;
        return;
    }

    items.forEach(item => {
        const isPositive = (item.change_pct || 0) >= 0;
        const changeClass = isPositive ? 'text-green-400' : 'text-red-400';
        const changeSign = isPositive ? '+' : '';

        const row = document.createElement('tr');
        row.id = 'row-' + item.ticker;
        row.className = 'hover:bg-gray-750 transition-colors border-b border-gray-700/50';

        const isPantauanTab = currentTab === 'pantauan';
        const inPantauan = pantauanList.includes(item.ticker);

        row.innerHTML = `
            <td class="p-3 font-bold text-yellow-400 flex items-center gap-1.5">
                <span>${item.ticker}</span>
                <span class="text-[9px] bg-gray-700 text-gray-300 px-1 py-0.5 rounded">${item.category || 'IDX'}</span>
            </td>
            <td class="p-3 font-medium">${item.close ? item.close.toLocaleString('id-ID') : '-'}</td>
            <td class="p-3 font-semibold ${changeClass}">${changeSign}${item.change_pct}%</td>
            <td class="p-3 text-gray-300 whitespace-nowrap">${item.ema20 ? item.ema20.toLocaleString('id-ID') : '-'} ${renderDot(item.ema20_status || 'neutral')}</td>
            <td class="p-3 text-gray-300 whitespace-nowrap">${item.ema50 ? item.ema50.toLocaleString('id-ID') : '-'} ${renderDot(item.ema50_status || 'neutral')}</td>
            <td class="p-3 text-gray-300 whitespace-nowrap">${item.rsi || '-'} ${renderDot(item.rsi_status || 'neutral')}</td>
            <td class="p-3 text-center whitespace-nowrap">${renderPowerBoxes(item.signal || 'NEUTRAL', item.power_score || 5)}</td>
            <td class="p-3 text-red-400 font-medium">${item.stop_loss ? item.stop_loss.toLocaleString('id-ID') : '-'} ${item.cl_hit ? '<span class="inline-block animate-signal-blink">🛑✨</span>' : ''}</td>
            <td class="p-3 text-green-400 font-medium">
                ${item.take_profit_1 ? item.take_profit_1.toLocaleString('id-ID') : '-'} ${item.tp1_hit ? '<span class="inline-block animate-signal-blink">💚✨</span>' : ''} / 
                ${item.take_profit_2 ? item.take_profit_2.toLocaleString('id-ID') : '-'} ${item.tp2_hit ? '<span class="inline-block animate-signal-blink">💚✨</span>' : ''}
            </td>
            <td class="p-3 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="copyTicker('${item.ticker}')" class="bg-gray-700 hover:bg-gray-600 text-gray-200 p-1 rounded text-xs" title="Copy Kode Emiten">📋</button>
                    ${isPantauanTab ? 
                        `<button onclick="removeFromPantauan('${item.ticker}')" class="bg-red-900/60 hover:bg-red-700 text-red-300 p-1 rounded text-xs" title="Hapus dari Pantauan">❌</button>` :
                        `<button onclick="addToPantauan('${item.ticker}')" class="${inPantauan ? 'bg-green-800 text-green-300' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'} p-1 rounded text-xs" title="Tambah ke Pantauan">${inPantauan ? '✓' : '👁️+'}</button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render Kartu Mobile
function renderMobileCards(items) {
    const container = document.getElementById('screener-data-mobile');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="text-center p-6 text-gray-500 bg-gray-800 rounded-xl border border-gray-700">Tidak ada emiten untuk kategori ini.</div>`;
        return;
    }

    items.forEach(item => {
        const isPositive = (item.change_pct || 0) >= 0;
        const changeClass = isPositive ? 'text-green-400' : 'text-red-400';
        const changeSign = isPositive ? '+' : '';

        const card = document.createElement('div');
        card.id = 'm-card-' + item.ticker;
        card.className = 'bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center justify-between shadow-md active:bg-gray-750 transition-all cursor-pointer';
        card.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            openModal(item);
        };

        const isPantauanTab = currentTab === 'pantauan';
        const inPantauan = pantauanList.includes(item.ticker);

        card.innerHTML = `
            <div class="flex flex-col gap-1 w-full">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-yellow-400 text-base">${item.ticker}</span>
                        <span class="text-[9px] bg-gray-700 text-gray-300 px-1 py-0.5 rounded">${item.category || 'IDX'}</span>
                    </div>
                    <div class="text-right">
                        <span class="font-bold text-gray-100 text-sm">${item.close ? item.close.toLocaleString('id-ID') : '-'}</span>
                        <span class="text-xs font-semibold ${changeClass} ml-1.5">${changeSign}${item.change_pct}%</span>
                    </div>
                </div>

                <div class="flex items-center justify-between mt-1 pt-2 border-t border-gray-700/60">
                    <div>${renderPowerBoxes(item.signal || 'NEUTRAL', item.power_score || 5)}</div>
                    <div class="flex items-center gap-1">
                        <button onclick="copyTicker('${item.ticker}')" class="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs">📋</button>
                        ${isPantauanTab ? 
                            `<button onclick="removeFromPantauan('${item.ticker}')" class="bg-red-900/60 text-red-300 px-2 py-1 rounded text-xs">❌</button>` :
                            `<button onclick="addToPantauan('${item.ticker}')" class="${inPantauan ? 'bg-green-800 text-green-300' : 'bg-gray-700 text-gray-200'} px-2 py-1 rounded text-xs">${inPantauan ? '✓' : '👁️+'}</button>`
                        }
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Buka Popup Modal HP
function openModal(item) {
    const isPositive = (item.change_pct || 0) >= 0;
    const changeClass = isPositive ? 'text-green-400' : 'text-red-400';
    const changeSign = isPositive ? '+' : '';

    const contentHtml = `
        <div class="space-y-4 text-xs">
            <div class="border-b border-gray-700 pb-2">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-bold text-yellow-400">${item.ticker} <span class="text-xs text-gray-400 font-normal">(${item.category || 'IDX'})</span></h3>
                    <span class="text-sm font-bold ${changeClass}">${changeSign}${item.change_pct}%</span>
                </div>
                <p class="text-gray-300 text-sm font-semibold mt-1">Harga Closing: ${item.close ? item.close.toLocaleString('id-ID') : '-'}</p>
            </div>

            <div class="space-y-2">
                <p class="text-gray-400 font-semibold uppercase text-[10px]">Indikator Strategi Swing</p>
                <div class="grid grid-cols-2 gap-2 bg-gray-850 p-2.5 rounded-lg border border-gray-700">
                    <div>EMA 20: <span class="font-bold text-gray-200">${item.ema20 ? item.ema20.toLocaleString('id-ID') : '-'}</span> ${renderDot(item.ema20_status)}</div>
                    <div>EMA 50: <span class="font-bold text-gray-200">${item.ema50 ? item.ema50.toLocaleString('id-ID') : '-'}</span> ${renderDot(item.ema50_status)}</div>
                    <div class="col-span-2">RSI (14): <span class="font-bold text-gray-200">${item.rsi || '-'}</span> ${renderDot(item.rsi_status)}</div>
                </div>
            </div>

            <div class="space-y-1">
                <p class="text-gray-400 font-semibold uppercase text-[10px]">Power Signal Score</p>
                <div class="bg-gray-850 p-2.5 rounded-lg border border-gray-700 flex justify-center">
                    ${renderPowerBoxes(item.signal, item.power_score)}
                </div>
            </div>

            <div class="space-y-2">
                <p class="text-gray-400 font-semibold uppercase text-[10px]">Trading Plan</p>
                <div class="bg-gray-850 p-2.5 rounded-lg border border-gray-700 space-y-1.5">
                    <div class="flex justify-between text-red-400 font-semibold">
                        <span>Cut Loss (SL):</span>
                        <span>${item.stop_loss ? item.stop_loss.toLocaleString('id-ID') : '-'} ${item.cl_hit ? '🛑✨' : ''}</span>
                    </div>
                    <div class="flex justify-between text-green-400 font-semibold">
                        <span>Take Profit 1 (TP1):</span>
                        <span>${item.take_profit_1 ? item.take_profit_1.toLocaleString('id-ID') : '-'} ${item.tp1_hit ? '💚✨' : ''}</span>
                    </div>
                    <div class="flex justify-between text-green-400 font-semibold">
                        <span>Take Profit 2 (TP2):</span>
                        <span>${item.take_profit_2 ? item.take_profit_2.toLocaleString('id-ID') : '-'} ${item.tp2_hit ? '💚✨' : ''}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-content').innerHTML = contentHtml;
    document.getElementById('mobile-modal').classList.remove('hidden');
}

// Tutup Popup Modal
function closeModal() {
    document.getElementById('mobile-modal').classList.add('hidden');
}

// Render Tab Aktif
function renderCurrentTab() {
    const data = currentTab === 'pantauan' ? getPantauanData() : (globalData[currentTab] || []);
    renderDesktopTable(data);
    renderMobileCards(data);
}