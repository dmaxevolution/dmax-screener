/**
 * indicators.js - Analysis Engine & Dynamic SVG Generator
 */

// 1. Dynamic SVG Icon Generator (Revisi Poin No. 3)
function getCandleIconSVG(patternType) {
    switch (patternType) {
        case 'HAMMER':
            return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="22"/><rect x="8" y="2" width="8" height="6" fill="currentColor" rx="1"/></svg>`;
        case 'ENGULFING_BULL':
            return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="8" x2="6" y2="18" stroke="#ef4444"/><rect x="4" y="10" width="4" height="6" fill="#ef4444"/><line x1="16" y1="2" x2="16" y2="22"/><rect x="13" y="4" width="6" height="15" fill="currentColor" rx="1"/></svg>`;
        case 'ENGULFING_BEAR':
            return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="8" x2="6" y2="18" stroke="#10b981"/><rect x="4" y="10" width="4" height="6" fill="#10b981"/><line x1="16" y1="2" x2="16" y2="22"/><rect x="13" y="4" width="6" height="15" fill="currentColor" rx="1"/></svg>`;
        case 'G_CROSS':
            return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 18L21 6" stroke="#10b981"/><path d="M3 6L21 18" stroke="#3b82f6"/><circle cx="12" cy="12" r="2" fill="#f59e0b"/></svg>`;
        default:
            return '';
    }
}

// 2. Candlestick Pattern Detection
function detectCandlePattern(open, high, low, close, prevOpen, prevClose) {
    const body = Math.abs(close - open);
    const range = high - low;
    const isBullish = close > open;
    const isBearish = close < open;
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;

    if (range === 0) return { name: "-", type: "NEUTRAL", iconKey: "" };

    if (prevClose < prevOpen && isBullish && close >= prevOpen && open <= prevClose) {
        return { name: "B-ENGULF", type: "BULLISH", iconKey: "ENGULFING_BULL" };
    }
    if (prevClose > prevOpen && isBearish && open >= prevClose && close <= prevOpen) {
        return { name: "BEAR-ENGULF", type: "BEARISH", iconKey: "ENGULFING_BEAR" };
    }
    if (isBullish && lowerShadow >= 2 * body && upperShadow <= body * 0.3) {
        return { name: "B-HAMMER", type: "BULLISH", iconKey: "HAMMER" };
    }

    return { name: "-", type: "NEUTRAL", iconKey: "" };
}

// 3. Strategy Evaluation Engine
function evaluateEntryStrategy(stock) {
    const candle = detectCandlePattern(
        stock.open, stock.high, stock.low, stock.close,
        stock.prev_open, stock.prev_close
    );

    const isGoldenCross = stock.ema20 > stock.ema50;
    const isOversold = stock.rsi <= 40;

    let entryStatus = "NEUTRAL";
    if ((isOversold || candle.type === "BULLISH") && isGoldenCross) {
        entryStatus = "BUY_ENTRY";
    }

    return {
        entryStatus,
        patternName: candle.name,
        patternType: candle.type,
        iconKey: candle.iconKey,
        isGoldenCross
    };
}

// 4. Power Score Bar Visualizer
function renderSignalPowerBar(powerScore) {
    const score = Math.min(10, Math.max(1, Math.round(powerScore)));
    const activeClass = score >= 6 ? "active-green" : "active-red";

    let barsHTML = '<div class="power-bars">';
    for (let i = 1; i <= 10; i++) {
        barsHTML += `<div class="bar-segment ${i <= score ? activeClass : ''}"></div>`;
    }
    barsHTML += '</div>';

    return `
        <div class="power-container">
            ${barsHTML}
            <span class="power-val">${powerScore}</span>
        </div>
    `;
}
