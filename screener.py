import json
from datetime import datetime
import pandas as pd
import yfinance as yf

# ==========================================
# DAFTAR 110+ EMITEN IDX DENGAN MARKET CAP & FUNDAMENTAL LIKUID
# ==========================================
TICKERS_CONFIG = {
    "BLUECHIP": [
        "BBCA.JK",
        "BBRI.JK",
        "BMRI.JK",
        "BBNI.JK",
        "TLKM.JK",
        "ASII.JK",
        "UNVR.JK",
        "ICBP.JK",
        "INDF.JK",
        "AMRT.JK",
        "CPIN.JK",
        "KLBF.JK",
        "PGAS.JK",
        "PTBA.JK",
        "ADRO.JK",
        "GOTO.JK",
        "BRIS.JK",
        "TCPI.JK",
        "TPIA.JK",
        "BREN.JK",
    ],
    "TOP_MOVERS": [
        "MDKA.JK",
        "ANKR.JK",
        "ANTM.JK",
        "INCO.JK",
        "HRUM.JK",
        "MBMA.JK",
        "NCKL.JK",
        "MEDC.JK",
        "AKRA.JK",
        "BRPT.JK",
        "INKP.JK",
        "TKIM.JK",
        "SMGR.JK",
        "INTP.JK",
        "UNTR.JK",
        "ITMG.JK",
        "CUAN.JK",
        "AMMN.JK",
        "ACES.JK",
        "MYOR.JK",
    ],
    "SWING_SETUP": [
        "AUTO.JK",
        "GJTL.JK",
        "BSDE.JK",
        "CTRA.JK",
        "PWON.JK",
        "SMA3.JK",
        "PANI.JK",
        "MNCN.JK",
        "SCMA.JK",
        "EMTKA.JK",
        "MAPI.JK",
        "MAPA.JK",
        "ERAA.JK",
        "RALS.JK",
        "FILM.JK",
        "BIRD.JK",
        "BLUE.JK",
        "ELSA.JK",
        "MARK.JK",
        "AVIA.JK",
    ],
    "GROWTH_SECOND_LINER": [
        "CMRY.JK",
        "HEAL.JK",
        "MIKA.JK",
        "SILO.JK",
        "KAEF.JK",
        "INAF.JK",
        "SIDO.JK",
        "CPRO.JK",
        "JPFA.JK",
        "MAIN.JK",
        "TAPG.JK",
        "LSIP.JK",
        "AALI.JK",
        "SIMP.JK",
        "SSMS.JK",
        "SMDR.JK",
        "TEMAS.JK",
        "BSSR.JK",
        "TOBA.JK",
        "INDY.JK",
        "DOID.JK",
        "MBSS.JK",
        "PTRO.JK",
        "ESSA.JK",
        "ARTO.JK",
        "BBHI.JK",
        "BBYB.JK",
        "BNGA.JK",
        "BDMN.JK",
        "PNBN.JK",
        "BJBR.JK",
        "BJTM.JK",
        "NISP.JK",
        "MEGA.JK",
        "AGRO.JK",
        "IRRA.JK",
        "CLEO.JK",
        "WOOD.JK",
        "PPRE.JK",
        "WEGE.JK",
    ],
}


def calculate_rsi(series, period=14):
  delta = series.diff()
  gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
  loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
  rs = gain / loss
  return 100 - (100 / (1 + rs))


def fetch_ihsg():
  try:
    df = yf.Ticker('^JKSE').history(period='5d')
    if df.empty:
      return {}
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    close_val = round(latest['Close'], 2)
    prev_val = round(prev['Close'], 2)
    chg_pct = round(((close_val - prev_val) / prev_val) * 100, 2)

    return {
        'close': close_val,
        'prev_close': prev_val,
        'open': round(latest['Open'], 2),
        'high': round(latest['High'], 2),
        'low': round(latest['Low'], 2),
        'change_pct': chg_pct,
    }
  except Exception as e:
    print(f'Error fetch IHSG: {e}')
    return {}


def process_ticker(ticker_symbol, primary_category):
  try:
    df = yf.Ticker(ticker_symbol).history(period='3mo')
    if len(df) < 50:
      return None

    df['EMA20'] = df['Close'].ewm(span=20, adjust=False).mean()
    df['EMA50'] = df['Close'].ewm(span=50, adjust=False).mean()
    df['RSI'] = calculate_rsi(df['Close'], 14)

    latest = df.iloc[-1]
    prev = df.iloc[-2]

    close = round(latest['Close'], 0)
    prev_close = round(prev['Close'], 0)
    change_pct = round(((close - prev_close) / prev_close) * 100, 2)

    ema20 = round(latest['EMA20'], 0)
    ema50 = round(latest['EMA50'], 0)
    rsi = (
        round(latest['RSI'], 1)
        if not pd.isna(latest['RSI'])
        else 50.0
    )

    clean_ticker = ticker_symbol.replace('.JK', '')

    # Penilaian Signal Power & Indikator
    ema20_status = 'buy' if close > ema20 else 'sell'
    ema50_status = 'buy' if close > ema50 else 'sell'

    if rsi < 30:
      rsi_status = 'strong_buy'
    elif 30 <= rsi <= 60:
      rsi_status = 'buy'
    elif 60 < rsi <= 70:
      rsi_status = 'neutral'
    else:
      rsi_status = 'sell'

    # Power Score Calculation (1 - 10)
    score = 5
    if close > ema20:
      score += 2
    if close > ema50:
      score += 2
    if 40 <= rsi <= 65:
      score += 1
    if change_pct > 0:
      score += 1
    if close < ema20 and close < ema50:
      score -= 3

    score = max(1, min(10, score))

    if score >= 8:
      signal = 'STRONG_BULLISH'
    elif score >= 6:
      signal = 'BULLISH'
    elif score <= 3:
      signal = 'STRONG_BEARISH'
    else:
      signal = 'NEUTRAL'

    # Level Entry, Stop Loss (5%), dan Take Profit (5% & 10%)
    stop_loss = round(close * 0.95, 0)
    tp1 = round(close * 1.05, 0)
    tp2 = round(close * 1.10, 0)

    return {
        'ticker': clean_ticker,
        'category': primary_category,
        'close': close,
        'change_pct': change_pct,
        'ema20': ema20,
        'ema50': ema50,
        'rsi': rsi,
        'ema20_status': ema20_status,
        'ema50_status': ema50_status,
        'rsi_status': rsi_status,
        'signal': signal,
        'power_score': score,
        'stop_loss': stop_loss,
        'take_profit_1': tp1,
        'take_profit_2': tp2,
        'cl_hit': False,
        'tp1_hit': False,
        'tp2_hit': False,
    }
  except Exception as e:
    print(f'Error processing {ticker_symbol}: {e}')
    return None


def main():
  print('Memulai proses pemindaian bursa IHSG...')

  all_results = []
  bluechips = []
  top_movers = []
  swing_setup = []
  top_gainers = []
  top_bearish = []

  processed_tickers = set()

  for cat, tickers in TICKERS_CONFIG.items():
    for t in tickers:
      if t in processed_tickers:
        continue
      processed_tickers.add(t)

      data = process_ticker(t, cat)
      if data:
        all_results.append(data)

        if cat == 'BLUECHIP':
          bluechips.append(data)
        elif cat == 'TOP_MOVERS':
          top_movers.append(data)
        elif cat == 'SWING_SETUP':
          swing_setup.append(data)

  # Klasifikasi Otomatis
  top_gainers = sorted(
      all_results, key=lambda x: x['change_pct'], reverse=True
  )[:20]
  top_bearish = sorted(all_results, key=lambda x: x['change_pct'])[:20]

  # Filter Top 10 Best Entry Signal (Swing Setup Siap Beli)
  entry_candidates = [
      x
      for x in all_results
      if x['power_score'] >= 7 and x['rsi'] >= 40 and x['rsi'] <= 65
  ]
  top_10_entry = sorted(
      entry_candidates,
      key=lambda x: (x['power_score'], x['change_pct']),
      reverse=True,
  )[:10]

  ihsg_data = fetch_ihsg()
  now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB')

  output = {
      'last_updated': now_str,
      'ihsg': ihsg_data,
      'top_10_entry': top_10_entry,
      'swing_setup': (
          swing_setup if swing_setup else entry_candidates[:15]
      ),
      'top_gainers': top_gainers,
      'top_movers': top_movers,
      'bluechips': bluechips,
      'top_bearish': top_bearish,
      'all_stocks': sorted(all_results, key=lambda x: x['ticker']),
  }

  with open('data.json', 'w') as f:
    json.dump(output, f, indent=2)

  print('✅ Berhasil memperbarui data.json dengan emiten terfilter!')


if __name__ == '__main__':
  main()