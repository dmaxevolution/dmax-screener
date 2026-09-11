import json
import numpy as np
import pandas as pd
import yfinance as yf

# Daftar emiten sampel (Silakan tambahkan/sesuai kebutuhan)
TICKERS = [
    "BBCA.JK",
    "BBRI.JK",
    "BMRI.JK",
    "TLKM.JK",
    "ASII.JK",
    "UNVR.JK",
    "AMRT.JK",
]


def analyze_candlestick_and_rrr(df):
    """Mendeteksi pola Candlestick Reversal dan menghitung Risk-to-Reward Ratio (RRR)"""
    if len(df) < 20:
        return {
            "pattern": "NEUTRAL",
            "signal": "NONE",
            "rrr": 0.0,
            "is_valid_rrr": False,
            "sl_price": 0,
            "tp_price": 0,
        }

    # Data Candle Hari Ini (index -1)
    c_open = float(df["Open"].iloc[-1])
    c_close = float(df["Close"].iloc[-1])
    c_high = float(df["High"].iloc[-1])
    c_low = float(df["Low"].iloc[-1])

    # Data Candle Kemarin (index -2)
    prev_open = float(df["Open"].iloc[-2])
    prev_close = float(df["Close"].iloc[-2])

    # Komponen Sumbu & Body
    body = abs(c_close - c_open)
    lower_shadow = min(c_open, c_close) - c_low
    upper_shadow = c_high - max(c_open, c_close)

    candle_pattern = "NEUTRAL"
    signal_type = "NONE"

    # --- DETEKSI POLA CANDLESTICK ---
    # 1. Bullish Engulfing (Kemarin Merah, Hari ini Hijau memakan badan kemarin)
    if (
        (prev_close < prev_open)
        and (c_close > c_open)
        and (c_close >= prev_open)
        and (c_open <= prev_close)
    ):
        candle_pattern = "BULLISH ENGULFING"
        signal_type = "BUY"

    # 2. Bullish Hammer (Ekor bawah min 2x badan, ekor atas sangat kecil)
    elif (
        lower_shadow >= (2 * body) and upper_shadow <= (body * 0.5) and body > 0
    ):
        candle_pattern = "BULLISH HAMMER"
        signal_type = "BUY"

    # 3. Bearish Engulfing (Kemarin Hijau, Hari ini Merah memakan badan kemarin)
    elif (
        (prev_close > prev_open)
        and (c_close < c_open)
        and (c_close <= prev_open)
        and (c_open >= prev_close)
    ):
        candle_pattern = "BEARISH ENGULFING"
        signal_type = "EXIT"

    # 4. Shooting Star / Bearish Pinbar (Ekor atas min 2x badan, ekor bawah sangat kecil)
    elif (
        upper_shadow >= (2 * body) and lower_shadow <= (body * 0.5) and body > 0
    ):
        candle_pattern = "SHOOTING STAR"
        signal_type = "EXIT"

    # --- KALKULASI RISK TO REWARD RATIO (RRR) ---
    rrr = 0.0
    sl_price = 0.0
    tp_price = 0.0

    if signal_type == "BUY":
        entry = c_close
        sl_price = round(c_low, 2)  # Stop Loss di bawah swing low candle
        # Target Resistance: High tertinggi dalam 20 hari terakhir
        tp_price = round(float(df["High"].tail(20).max()), 2)

        risk = entry - sl_price
        reward = tp_price - entry

        if risk > 0:
            rrr = round(reward / risk, 2)

    return {
        "pattern": candle_pattern,
        "signal": signal_type,
        "rrr": rrr,
        "is_valid_rrr": rrr >= 2.0,
        "sl_price": sl_price,
        "tp_price": tp_price,
    }


def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def run_screener():
    results = []

    for ticker in TICKERS:
        try:
            df = yf.download(ticker, period="3mo", interval="1d", progress=False)
            if df.empty or len(df) < 20:
                continue

            # Menyamakan nama kolom jika MultiIndex dari yfinance
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            # Hitung RSI 14
            df["RSI"] = calculate_rsi(df["Close"])
            current_rsi = round(float(df["RSI"].iloc[-1]), 2)
            current_price = round(float(df["Close"].iloc[-1]), 2)

            # Analisis Candlestick & RRR
            candle_analysis = analyze_candlestick_and_rrr(df)

            # Tentukan Status Rekomendasi Screener
            # Kombinasi: Harus Sinyal BUY + RRR >= 1:2
            if (
                candle_analysis["signal"] == "BUY"
                and candle_analysis["is_valid_rrr"]
            ):
                overall_status = "STRONG BUY"
            elif candle_analysis["signal"] == "BUY":
                overall_status = "BUY (LOW RRR)"
            elif candle_analysis["signal"] == "EXIT":
                overall_status = "EXIT / TAKE PROFIT"
            else:
                overall_status = "NEUTRAL"

            results.append(
                {
                    "ticker": ticker.replace(".JK", ""),
                    "price": current_price,
                    "rsi": current_rsi,
                    "candle_pattern": candle_analysis["pattern"],
                    "signal": candle_analysis["signal"],
                    "rrr": candle_analysis["rrr"],
                    "valid_rrr": candle_analysis["is_valid_rrr"],
                    "stop_loss": candle_analysis["sl_price"],
                    "take_profit": candle_analysis["tp_price"],
                    "overall_status": overall_status,
                }
            )

        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    # Simpan Hasil Screener ke file data.json
    with open("data.json", "w") as f:
        json.dump(results, f, indent=4)

    print("✅ Screener berhasil dijalankan! Output disimpan ke data.json")


if __name__ == "__main__":
    run_screener()
