// Render Dot / Titik Indikator Sinyal
function renderDot(status) {
    let colorClass = 'bg-gray-500';
    let blinkClass = '';
    if (status === 'buy') colorClass = 'bg-green-500';
    else if (status === 'strong_buy') { colorClass = 'bg-green-400'; blinkClass = 'animate-signal-blink'; }
    else if (status === 'sell') colorClass = 'bg-red-500';
    else if (status === 'strong_sell') { colorClass = 'bg-red-500'; blinkClass = 'animate-signal-blink'; }
    return `<span class="inline-block w-2 h-2 rounded-full ${colorClass} ${blinkClass} ml-1" title="Status: ${status}"></span>`;
}

// Render Batang Power Signal Box
function renderPowerBoxes(signal, powerScore) {
    const pct = (powerScore || 5) * 10;
    let boxColor = 'bg-gray-600', isBlink = false, iconHtml = '⏳';
    
    if (signal === 'STRONG_BULLISH') { boxColor = 'bg-green-400'; isBlink = true; iconHtml = '<span class="inline-block animate-signal-blink">🚀</span>'; }
    else if (signal === 'BULLISH') { boxColor = 'bg-green-500'; iconHtml = '🚀'; }
    else if (signal === 'STRONG_BEARISH') { boxColor = 'bg-red-500'; isBlink = true; iconHtml = '<span class="inline-block w-2.5 h-2.5 bg-red-500 rounded-full animate-signal-blink"></span>'; }
    else if (signal === 'BEARISH') { boxColor = 'bg-red-500'; iconHtml = '<span class="inline-block w-2.5 h-2.5 bg-red-500 rounded-full"></span>'; }
    else { boxColor = 'bg-gray-600'; }

    let boxesHtml = '<div class="flex items-center gap-0.5">';
    for (let i = 1; i <= 10; i++) {
        const active = i <= (powerScore || 5);
        boxesHtml += `<span class="w-1.5 h-3.5 rounded-sm ${active ? boxColor : 'bg-gray-700'} ${isBlink && active ? 'animate-signal-blink' : ''}"></span>`;
    }
    boxesHtml += '</div>';

    return `
        <div class="flex items-center justify-center gap-1.5">
            <span class="text-[10px] font-bold text-gray-400 min-w-[28px] text-right">${pct}%</span>
            ${boxesHtml}
            <span class="text-xs flex items-center justify-center w-4 h-4">${iconHtml}</span>
        </div>
    `;
}