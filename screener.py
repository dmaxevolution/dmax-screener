import json
import os
from datetime import datetime
import pandas as pd
import yfinance as yf

# 100 Emiten BEI Pilihan (Liquid, Market Cap Bagus, Potensial Swing Trading)
TICKERS_CONFIG = [
    # Banking & Financials
    {"ticker": "BBCA", "sector": "Financials"}, {"ticker": "BBRI", "sector": "Financials"},
    {"ticker": "BMRI", "sector": "Financials"}, {"ticker": "BBNI", "sector": "Financials"},
    {"ticker": "BRIS", "sector": "Financials"}, {"ticker": "BBTN", "sector": "Financials"},
    {"ticker": "ARTO", "sector": "Financials"}, {"ticker": "BNGA", "sector": "Financials"},
    {"ticker": "BDMN", "sector": "Financials"}, {"ticker": "BFIN", "sector": "Financials"},
    {"ticker": "PNBN", "sector": "Financials"}, {"ticker": "AGRO", "sector": "Financials"},
    
    # Energy, Coal, Oil & Mining
    {"ticker": "ADRO", "sector": "Energy"}, {"ticker": "PTBA", "sector": "Energy"},
    {"ticker": "ITMG", "sector": "Energy"}, {"ticker": "MEDC", "sector": "Energy"},
    {"ticker": "PGAS", "sector": "Energy"}, {"ticker": "AKRA", "sector": "Energy"},
    {"ticker": "INDY", "sector": "Energy"}, {"ticker": "HRUM", "sector": "Energy"},
    {"ticker": "DOID", "sector": "Energy"}, {"ticker": "BUMI", "sector": "Energy"},
    {"ticker": "ELSA", "sector": "Energy"}, {"ticker": "CUAN", "sector": "Energy"},
    
    # Basic Materials & Minerals (Nickel, Gold, Copper, Cement)
    {"ticker": "ANTM", "sector": "Basic Materials"}, {"ticker": "INCO", "sector": "Basic Materials"},
    {"ticker": "TINS", "sector": "Basic Materials"}, {"ticker": "MDKA", "sector": "Basic Materials"},
    {"ticker": "AMMN", "sector": "Basic Materials"}, {"ticker": "BRPT", "sector": "Basic Materials"},
    {"ticker": "NCKL", "sector": "Basic Materials"}, {"ticker": "MBMA", "sector": "Basic Materials"},
    {"ticker": "SMGR", "sector": "Basic Materials"}, {"ticker": "INTP", "sector": "Basic Materials"},
    {"ticker": "TPIA", "sector": "Basic Materials"}, {"ticker": "ESSA", "sector": "Basic Materials"},
    
    # Consumer Goods & Retail
    {"ticker": "UNVR", "sector": "Consumer Non-Cyclicals"}, {"ticker": "ICBP", "sector": "Consumer Non-Cyclicals"},
    {"ticker": "INDF", "sector": "Consumer Non-Cyclicals"}, {"ticker": "AMRT", "sector": "Consumer Non-Cyclicals"},
    {"ticker": "MYOR", "sector": "Consumer Non-Cyclicals"}, {"ticker": "CMRY", "sector": "Consumer Non-Cyclicals"},
    {"ticker": "CPIN", "sector": "Consumer Non-Cyclicals"}, {"ticker": "JPFA", "sector": "Consumer Non-Cyclicals"},
    {"ticker": "GGRM", "sector": "Consumer Non-Cyclicals"}, {"ticker": "HMSP", "sector": "Consumer Non-Cyclicals"},
    {"ticker": "ACES", "sector": "Consumer Cyclicals"}, {"ticker": "MAPI", "sector": "Consumer Cyclicals"},
    {"ticker": "ERAA", "sector": "Consumer Cyclicals"}, {"ticker": "AUTO", "sector": "Consumer Cyclicals"},
    {"ticker": "GJTL", "sector": "Consumer Cyclicals"}, {"ticker": "MAPA", "sector": "Consumer Cyclicals"},
    
    # Telecommunication, Tech & Media
    {"ticker": "TLKM", "sector": "Infrastructures"}, {"ticker": "ISAT", "sector": "Infrastructures"},
    {"ticker": "EXCL", "sector": "Infrastructures"}, {"ticker": "TOWR", "sector": "Infrastructures"},
    {"ticker": "TBIG", "sector": "Infrastructures"}, {"ticker": "MTEL", "sector": "Infrastructures"},
    {"ticker": "GOTO", "sector": "Technology"}, {"ticker": "EMTK", "sector": "Technology"},
    {"ticker": "BUKA", "sector": "Technology"}, {"ticker": "WIFI", "sector": "Technology"},
    
    # Industrial, Auto & Conglomerates
    {"ticker": "ASII", "sector": "Industrials"}, {"ticker": "UNTR", "sector": "Industrials"},
    {"ticker": "BIRD", "sector": "Infrastructures"}, {"ticker": "JSMR", "sector": "Infrastructures"},
    {"ticker": "PGEO", "sector": "Infrastructures"}, {"ticker": "VKTR", "sector": "Industrials"},
    
    # Healthcare & Pharma
    {"ticker": "KLBF", "sector": "Healthcare"}, {"ticker": "MIKA", "sector": "Healthcare"},
    {"ticker": "HEAL", "sector": "Healthcare"}, {"ticker": "SILO", "sector": "Healthcare"},
    {"ticker": "TSPC", "sector": "Healthcare"}, {"ticker": "SIDO", "sector": "Healthcare"},
    
    # Property & Real Estate
    {"ticker": "BSDE", "sector": "Real Estate"}, {"ticker": "CTRA", "sector": "Real Estate"},
    {"ticker": "PWON", "sector": "Real Estate"}, {"ticker": "SMRA", "sector": "Real Estate"},
    {"ticker": "PANI", "sector": "Real Estate"},
    
    # High Volatility & Active Traders (Swing Potentials)
    {"ticker": "BREN", "sector": "Infrastructures"}, {"ticker": "PTPP", "sector": "Infrastructures"},
    {"ticker": "ADHI", "sector": "Infrastructures"}, {"ticker": "WINS", "sector": "Energy"},
    {"ticker": "LEAD", "sector": "Energy"}, {"ticker": "HAIS", "sector": "Energy"},
    {"ticker": "DRMA", "sector": "Consumer Cyclicals"}, {"ticker": "SMSM", "sector": "Consumer Cyclicals"},
    {"ticker": "WIIM", "sector": "Consumer Non-Cyclicals"}, {"ticker": "IMPC", "sector": "Basic Materials"},
    {"ticker": "SCMA", "sector": "Consumer Cyclicals"}, {"ticker": "PSAB", "sector": "Basic Materials"},
    {"ticker": "AVIA", "sector": "Basic Materials"}, {"ticker": "MEDS", "sector": "Healthcare"},
    {"ticker": "ENRG", "sector": "Energy"}, {"ticker": "CITA", "sector": "Basic Materials"}
]

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def calculate_power_score(close, open_val, high, low, ema20, ema50, rsi):
    score = 5.0
    # Evaluasi Momentum RSI
    if 50 <= rsi <= 65: score += 1.5
    elif rsi > 65: score += 0.5
    elif rsi <= 35: score += 1.0  # Dip buying opportunity
    elif rsi < 30: score -= 1.0

    # Trend EMA Cross
    if close > ema20 and ema20 > ema50: score += 2.0
    elif close > ema20: score += 1.0
    elif close < ema20 and ema20 < ema50: score -= 2.0

    # Strong Body Candlestick
    body = abs(close - open_val)
    candle_range = high - low
    if candle_range > 0:
        if close > open_val and (body / candle_range) >= 0.55: score += 1.5
        elif close < open_val and (body / candle_range) >= 0.55: score -= 1.5

    return min(10.0, max(1.0, round(score, 1)))

def fetch_data():
    symbol_map = {f"{item['ticker']}.JK": item for item in TICKERS_CONFIG}
    all_symbols = list(symbol_map.keys()) + ["^JKSE"]

    print("Mengunduh data penutupan murni BEI dari Yahoo Finance...")
    download_data = yf.download(all_symbols, period="100d", interval="1d", group_by="ticker", auto_adjust=False, progress=False)

    ihsg_data = {"name": "IHSG", "close": 0, "change_pct": 0.0}
    try:
        if "^JKSE" in download_data and not download_data["^JKSE"].dropna().empty:
            df_ihsg = download_data["^JKSE"].dropna()
            c_val = float(df_ihsg['Close'].iloc[-1])
            p_val = float(df_ihsg['Close'].iloc[-2])
            chg = round(((c_val - p_val) / p_val) * 100, 2)
            ihsg_data = {"name": "IHSG", "close": round(c_val, 2), "change_pct": chg}
    except Exception as e:
        print("IHSG fetch error:", e)

    all_stocks = []
    for symbol, meta in symbol_map.items():
        try:
            if symbol not in download_data or download_data[symbol].dropna().empty:
                continue

            df = download_data[symbol].dropna().copy()
            if len(df) < 20:
                continue

            df['EMA20'] = df['Close'].ewm(span=20, adjust=False).mean()
            df['EMA50'] = df['Close'].ewm(span=50, adjust=False).mean()
            df['RSI'] = calculate_rsi(df['Close'], 14)

            latest = df.iloc[-1]
            previous = df.iloc[-2]

            close_val = int(round(float(latest['Close'])))
            prev_close = int(round(float(previous['Close'])))
            open_val = int(round(float(latest['Open'])))
            high_val = int(round(float(latest['High'])))
            low_val = int(round(float(latest['Low'])))

            if close_val <= 0 or prev_close <= 0:
                continue

            change_pct = round(((close_val - prev_close) / prev_close) * 100, 2)
            ema20 = round(float(latest['EMA20']), 2)
            ema50 = round(float(latest['EMA50']), 2)
            rsi = round(float(latest['RSI']), 1) if not pd.isna(latest['RSI']) else 50.0

            power_score = calculate_power_score(close_val, open_val, high_val, low_val, ema20, ema50, rsi)

            # Risk/Reward Setup Swing Trading
            recent_low = float(df['Low'].tail(15).min())
            recent_high = float(df['High'].tail(15).max())
            stop_loss = int(round(recent_low * 0.98))  # 2% di bawah low terendah
            risk = max(close_val - stop_loss, close_val * 0.03)
            
            take_profit_1 = int(round(close_val + (risk * 1.5)))
            take_profit_2 = int(round(max(close_val + (risk * 2.5), recent_high)))

            all_stocks.append({
                "ticker": meta["ticker"],
                "sector": meta["sector"],
                "open": open_val,
                "high": high_val,
                "low": low_val,
                "close": close_val,
                "prev_open": int(round(float(previous['Open']))),
                "prev_close": prev_close,
                "change_pct": change_pct,
                "ema20": ema20,
                "ema50": ema50,
                "rsi": rsi,
                "power_score": power_score,
                "stop_loss": stop_loss,
                "take_profit_1": take_profit_1,
                "take_profit_2": take_profit_2
            })
        except Exception:
            continue

    # Urutkan berdasarkan Power Score tertinggi
    all_stocks = sorted(all_stocks, key=lambda x: x["power_score"], reverse=True)

    output = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S WIB"),
        "total_emiten": len(all_stocks),
        "ihsg": ihsg_data,
        "top_10_entry": all_stocks[:10],
        "all_stocks": all_stocks
    }

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Berhasil! Total {len(all_stocks)} emiten pilihan disaring dan disimpan.")

if __name__ == "__main__":
    fetch_data()
