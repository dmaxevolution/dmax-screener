import json
import os
from datetime import datetime
import pandas as pd
import yfinance as yf

TICKERS = [
    {"ticker": "BBCA", "category": "Bluechip"}, {"ticker": "BBRI", "category": "Bluechip"},
    {"ticker": "BMRI", "category": "Bluechip"}, {"ticker": "BBNI", "category": "Bluechip"},
    {"ticker": "TLKM", "category": "Bluechip"}, {"ticker": "ASII", "category": "Bluechip"},
    {"ticker": "UNVR", "category": "Bluechip"}, {"ticker": "ICBP", "category": "Bluechip"},
    {"ticker": "INDF", "category": "Bluechip"}, {"ticker": "AMRT", "category": "Bluechip"},
    {"ticker": "ADRO", "category": "IDX Liquid"}, {"ticker": "PTBA", "category": "IDX Liquid"},
    {"ticker": "MEDC", "category": "IDX Liquid"}, {"ticker": "ANTM", "category": "IDX Liquid"},
    {"ticker": "PGAS", "category": "IDX Liquid"}, {"ticker": "GOTO", "category": "Bluechip"},
    {"ticker": "BIRD", "category": "IDX Liquid"}, {"ticker": "MAPI", "category": "IDX Liquid"},
    {"ticker": "CPIN", "category": "IDX Liquid"}, {"ticker": "ACES", "category": "IDX Liquid"}
]

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def calculate_pure_power_score(close, open_val, high, low, ema20, ema50, rsi):
    """
    Kalkulasi Power Score 100% Murni berbasis matematika indikator tanpa nilai acak.
    Skala Output: 1.0 - 10.0 (Persentase 10% - 100%)
    """
    score = 5.0 # Netral awal

    # 1. Analisis Tren RSI (Bobot Maksimal +/- 2.0)
    if rsi >= 70: score += 2.0
    elif rsi >= 55: score += 1.0
    elif rsi <= 30: score -= 2.0
    elif rsi <= 45: score -= 1.0

    # 2. Posisi Harga terhadap EMA (Bobot Maksimal +/- 1.5)
    if close > ema20 and ema20 > ema50:
        score += 1.5
    elif close < ema20 and ema20 < ema50:
        score -= 1.5

    # 3. Candlestick Dynamic Score dari OHLC Asli (Bobot Maksimal +/- 1.5)
    body = abs(close - open_val)
    candle_range = high - low
    if candle_range > 0:
        if close > open_val and (body / candle_range) >= 0.6:
            score += 1.5  # Strong Bullish Marubozu/Body
        elif close < open_val and (body / candle_range) >= 0.6:
            score -= 1.5  # Strong Bearish Body

    final_score = min(10.0, max(1.0, round(score, 1)))
    return final_score

def fetch_real_data():
    symbol_map = {f"{item['ticker']}.JK": item for item in TICKERS}
    ticker_symbols = list(symbol_map.keys())
    all_download_tickers = ticker_symbols + ["^JKSE"]

    print(" Mengunduh data OHLC Murni dari Yahoo Finance...")
    download_data = yf.download(all_download_tickers, period="100d", interval="1d", group_by="ticker", progress=False)

    ihsg_data = {"name": "IHSG", "close": 0.0, "change_pct": 0.0}
    try:
        if "^JKSE" in download_data and not download_data["^JKSE"].dropna().empty:
            df_ihsg = download_data["^JKSE"].dropna().copy()
            if len(df_ihsg) >= 2:
                latest_ihsg = df_ihsg.iloc[-1]
                prev_ihsg = df_ihsg.iloc[-2]
                c_val, p_val = float(latest_ihsg['Close']), float(prev_ihsg['Close'])
                chg = round(((c_val - p_val) / p_val) * 100, 2) if p_val > 0 else 0.0
                ihsg_data = {
                    "name": "IHSG",
                    "close": round(c_val, 2),
                    "change_pct": chg
                }
    except Exception as e:
        print(f"Gagal memuat IHSG: {e}")

    all_stocks = []
    for symbol, stock in symbol_map.items():
        try:
            if symbol not in download_data or download_data[symbol].dropna().empty:
                continue

            df = download_data[symbol].dropna().copy()
            if len(df) < 30: continue

            df['EMA20'] = df['Close'].ewm(span=20, adjust=False).mean()
            df['EMA50'] = df['Close'].ewm(span=50, adjust=False).mean()
            df['RSI'] = calculate_rsi(df['Close'], 14)

            latest, previous = df.iloc[-1], df.iloc[-2]
            
            # OHLC MURNI DARI DATA PASAR ASLI
            open_val = float(latest['Open'])
            high_val = float(latest['High'])
            low_val = float(latest['Low'])
            close_val = float(latest['Close'])
            prev_open = float(previous['Open'])
            prev_close = float(previous['Close'])

            if close_val <= 0 or prev_close <= 0: continue

            change_pct = round(((close_val - prev_close) / prev_close) * 100, 2)
            ema20 = float(latest['EMA20'])
            ema50 = float(latest['EMA50'])
            rsi = round(float(latest['RSI']), 1) if not pd.isna(latest['RSI']) else 50.0

            # Calculasi Power Score Murni tanpa Random
            power_score = calculate_pure_power_score(close_val, open_val, high_val, low_val, ema20, ema50, rsi)

            # Support & Resistance Murni berbasis Data Historis (Lowest Low & Highest High 20 Hari)
            stop_loss = float(df['Low'].tail(20).min())
            take_profit_1 = close_val + (close_val - stop_loss) # Risk Reward 1:1 Murni
            take_profit_2 = float(df['High'].tail(20).max())

            item = {
                "ticker": stock["ticker"],
                "category": stock["category"],
                "open": round(open_val, 2),
                "high": round(high_val, 2),
                "low": round(low_val, 2),
                "close": round(close_val, 2),
                "prev_open": round(prev_open, 2),
                "prev_close": round(prev_close, 2),
                "change_pct": change_pct,
                "ema20": round(ema20, 2),
                "ema50": round(ema50, 2),
                "rsi": rsi,
                "power_score": power_score,
                "stop_loss": round(stop_loss, 2),
                "take_profit_1": round(take_profit_1, 2),
                "take_profit_2": round(take_profit_2, 2)
            }
            all_stocks.append(item)
        except Exception:
            continue

    all_stocks = sorted(all_stocks, key=lambda x: x["power_score"], reverse=True)

    output = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S WIB"),
        "ihsg": ihsg_data,
        "top_10_entry": all_stocks[:10],
        "all_stocks": all_stocks
    }

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    print(f" Berhasil! {len(all_stocks)} data emiten OHLC murni tersimpan.")

if __name__ == "__main__":
    fetch_real_data()