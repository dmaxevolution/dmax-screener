function renderDot(status) {
    let colorClass = 'bg-gray-500', blinkClass = '';
    if (status === 'buy') colorClass = 'bg-green-500';
    else if (status === 'strong_buy') { colorClass = 'bg-green-400'; blinkClass = 'animate-signal-blink'; }
    else if (status === 'sell') colorClass = 'bg-red-500';
    return `<span class="inline-block w-2 h-2 rounded-full ${colorClass} ${blinkClass} ml-1"></span>`;
}

function renderPowerBoxes(signal, powerScore, candlePattern) {
    const score = powerScore || 5;
    const pct = score * 10;
    let boxColor = 'bg-gray-600', isBlink = false;
    let statusBadge = '';

    // Logika Penentuan Badge ENTRY NOW & NO ENTRY
    if (score >= 9 && candlePattern !== 'BEARISH_BREAKDOWN') {
        boxColor = 'bg-green-400';
        isBlink = true;
        statusBadge = `<span class="px-1.5 py-0.5 text-[9px] font-black rounded border border-green-400 bg-green-950 text-green-400 animate-signal-blink shadow-[0_0_8px_rgba(74,222,128,0.6)]">ENTRY</span>`;
    } else if (score <= 4 || candlePattern === 'BEARISH_BREAKDOWN') {
        boxColor = 'bg-red-500';
        statusBadge = `<span class="px-1.5 py-0.5 text-[9px] font-black rounded border border-red-500 bg-red-950 text-red-400">NO ENTRY</span>`;
    } else {
        boxColor = score >= 6 ? 'bg-green-500' : 'bg-yellow-500';
        statusBadge = `<span class="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-gray-800 text-gray-400">WAIT</span>`;
    }

    let boxesHtml = '<div class="flex items-center gap-0.5">';
    for (let i = 1; i <= 10; i++) {
        boxesHtml += `<span class="w-1 h-3 rounded-sm ${i <= score ? boxColor : 'bg-gray-700'} ${isBlink && i <= score ? 'animate-signal-blink' : ''}"></span>`;
    }
    boxesHtml += '</div>';

    return `
        <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold text-gray-400">${pct}%</span>
            ${boxesHtml}
            ${statusBadge}
        </div>
    `;
}
