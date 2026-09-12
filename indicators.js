/**
 * indicators.js - Evaluasi Akumulasi Indikator untuk Status ENTRY / WAIT / DANGER
 */

function detectCandlePattern(open, high, low, close, prevOpen, prevClose) {
    const body = Math.abs(close - open);
    const range = high - low;
    const isBullish = close > open;
    const isBearish = close < open;
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;

    if (range === 0) return { name: "NONE", type: "NEUTRAL" };

    if (prevClose < prevOpen && isBullish && close >= prevOpen && open <= prevClose) {
        return { name: "ENGULFING", type: "BULLISH" };
    }

    if (prevClose > prevOpen && isBearish && open >= prevClose && close <= prevOpen) {
        return { name: "ENGULFING", type: "BEARISH" };
    }

    if (isBullish && lowerShadow >= 2 * body && upperShadow <= body * 0.3) {
        return { name: "HAMMER", type: "BULLISH" };
    }

    if (isBearish && upperShadow >= 2 * body && lowerShadow <= body * 0.3) {
        return { name: "SHOOTING STAR", type: "BEARISH" };
    }

    return { name: "-", type: "NEUTRAL" };
}

/**
 * Akumulasi Seluruh Indikator Menjadi Status Tunggal
 */
function evaluateTradingStrategy(stock) {
    const candle = detectCandlePattern(
        stock.open, stock.high, stock.low, stock.close,
        stock.prev_open, stock.prev_close
    );

    const isGoldenCross = stock.ema20 > stock.ema50;
    const isDeathCross = stock.ema20 < stock.ema50;
    const powerScore = stock.power_score || 5.0;

    let status = "WAIT"; // Default State

    // Kaidah Siap ENTRY (Akumulasi Sinyal Positif Murni)
    if (powerScore >= 7.0 || (isGoldenCross && candle.type === "BULLISH" && stock.rsi <= 55)) {
        status = "ENTRY";
    } 
    // Kaidah Sinyal Bahaya/DANGER (Akumulasi Sinyal Negatif Murni)
    else if (powerScore <= 3.9 || (isDeathCross && candle.type === "BEARISH") || stock.rsi >= 70) {
        status = "DANGER";
    }

    return {
        status: status,
        patternName: candle.name,
        patternType: candle.type
    };
}

/**
 * Render 10 Bar Signal Power
 */
function renderSignalPowerBar(powerScore) {
    const score = Math.min(10, Math.max(1, Math.round(powerScore)));
    const percentage = score * 10;
    
    let activeClass = "neutral";
    let textColor = "#7e879a";

    if (percentage <= 20) {
        activeClass = "strong-bearish";
        textColor = "#ff1744";
    } else if (percentage === 30) {
        activeClass = "bearish";
        textColor = "#d32f2f";
    } else if (percentage >= 40 && percentage <= 60) {
        activeClass = "neutral";
        textColor = "#7e879a";
    } else if (percentage >= 70 && percentage <= 80) {
        activeClass = "bullish";
        textColor = "#00e676";
    } else if (percentage >= 90) {
        activeClass = "strong-bullish";
        textColor = "#00ff88";
    }

    let barsHTML = '<div class="power-bars">';
    for (let i = 1; i <= 10; i++) {
        barsHTML += `<div class="bar-segment ${i <= score ? activeClass : ''}"></div>`;
    }
    barsHTML += '</div>';

    return `
        <div class="power-container">
            ${barsHTML}
            <span class="power-percentage" style="color: ${textColor}">${percentage}%</span>
        </div>
    `;
}
