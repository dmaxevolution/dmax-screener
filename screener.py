import json
from datetime import datetime
import pandas as pd
import yfinance as yf

TICKERS_CONFIG = {
    'BLUECHIP': [
        'BBCA.JK',
        'BBRI.JK',
        'BMRI.JK',
        'BBNI.JK',
        'TLKM.JK',
        'ASII.JK',
        'UNVR.JK',
        'ICBP.JK',
        'INDF.JK',
        'AMRT.JK',
        'KLBF.JK',
        'PGAS.JK',
        'PTBA.JK',
        'ADRO.JK',
        'GOTO.JK',
        'BRIS.JK',
        'TPIA.JK',
        'BREN.JK',
    ],
    'TOP_MOVERS': [
        'MDKA.JK',
        'ANTM.JK',
        'INCO.JK',
        'HRUM.JK',
        'MBMA.JK',
        'NCKL.JK',
        'MEDC.JK',
        'AKRA.JK',
        'BRPT.JK',
        'INKP.JK',
        'TKIM.JK',
        'SMGR.JK',
        'INTP.JK',
        'UNTR.JK',
        'ITMG.JK',
        'CUAN.JK',
        'AMMN.JK',
        'ACES.JK',
        'MYOR.JK',
    ],
    'SWING_SETUP': [
        'AUTO.JK',
        'GJTL.JK',
        'BSDE.JK',
        'CTRA.JK',
        'PWON.JK',
        'PANI.JK',
        'MNCN.JK',
        'SCMA.JK',
        'EMTKA.JK',
        'MAPI.JK',
        'MAPA.JK',
        'ERAA.JK',
        'RALS.JK',
        'FILM.JK',
        'BIRD.JK',
        'ELSA.JK',
        'MARK.JK',
        'AVIA.JK',
    ],
    'GROWTH_SECOND_LINER': [
        'CMRY.JK',
        'HEAL.JK',
        'MIKA.JK',
        'SILO.JK',
        'SIDO.JK',
        'JPFA.JK',
        'MAIN.JK',
        'TAPG.JK',
        'LSIP.JK',
        'AALI.JK',
        'SMDR.JK',
        'TEMAS.JK',
        'BSSR.JK',
        'TOBA.JK',
        'INDY.JK',
        'DOID.JK',
        'PTRO.JK',
        'ESSA.JK',
        'ARTO.JK',
        'BNGA.JK',
        'BDMN.JK',
        'PNBN.JK',
        'BJBR.JK',
        'BJTM.JK',
        'NISP.JK',
        'CLEO.JK',
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
    latest, prev = df.iloc[-1], df.iloc[-2]
    close_val, prev_val = round(latest['Close'], 2), round(prev['Close'], 2)
    chg_pct = round(((close_val - prev_val) / prev_val) * 100, 2)
    return {
        'close': close_val,
        'prev_close': prev_val,
        'open': round(latest['Open'], 2),
        'high': round(latest['High'], 2),
        'low': round(latest['Low'], 2),
        'change_pct': chg_pct,
    }
  except Exception:
    return {}


def analyze_candlestick(df, ema20, ema50):
  latest = df.iloc[-1]
  prev = df.iloc[-2]

  c_open, c_close = latest['Open'], latest['Close']
  c_high, c_low = latest['High'], latest['Low']
  p_open, p_close = prev['Open'], prev['Close']

  body = abs(c_close - c_open)
  lower_shadow = min(c_open, c_close) - c_low
  upper_shadow = c_high - max(c_open, c_close)

  near_ema20 = abs(c_low - ema20) / ema20 <= 0.015
  near_ema50 = abs(c_low - ema50) / ema50 <= 0.015
  at_support = near_ema20 or near_ema50

  pattern_detected = 'NONE'
  score_modifier = 0

  # 1. Bullish Hammer / Pinbar
  if lower_shadow >= (1.8 * body) and upper_shadow <= (0.8 * body) and body > 0:
    if at_support or c_close > ema20:
      pattern_detected = 'BULLISH_HAMMER'
      score_modifier = 2

  # 2. Bullish Engulfing
  elif (
      p_close < p_open
      and c_close > c_open
      and c_close > p_open
      and c_open < p_close
  ):
    pattern_detected = 'BULLISH_ENGULFING'
    score_modifier = 2

  # 3. Bearish Breakdown
  elif c_close < c_open and (c_close < ema20 and c_close < ema50):
    if p_close >= ema20 or p_close >= ema50:
      pattern_detected = 'BEARISH_BREAKDOWN'
      score_modifier = -3

  return pattern_detected, score_modifier


def calculate_structural_levels(df, close, ema20):
  """Menghitung Stop Loss dan Take Profit berdasarkan Support & Resistance (Struktural)"""
  # 1. Support Level: Cari Low terendah 5 hari terakhir (Swing Low)
  lowest_5d = df['Low'].tail(5).min()

  # Gunakan level support terkuat antara Swing Low 5 hari atau EMA20
  if close > ema20:
    support_level = min(lowest_5d, ema20)
  else:
    support_level = lowest_5d

  # Buffer SL 1% di bawah level support
  stop_loss = round(support_level * 0.99, 0)

  # Batas aman (Safety Net): Cegah SL melebihi 7% dari harga close jika saham sangat volatil
  max_sl_price = close * 0.93
  if stop_loss < max_sl_price:
    stop_loss = round(max_sl_price, 0)

  # Mencegah SL di atas atau sama dengan Close
  if stop_loss >= close:
    stop_loss = round(close * 0.95, 0)

  # 2. Resistance Level: Cari High tertinggi 20 hari terakhir (Swing High)
  highest_20d = df['High'].tail(20).max()

  # Target Profit 1 (TP1): Buffer 1% di bawah Resisten 20 Hari
  if highest_20d > (close * 1.02):
    take_profit_1 = round(highest_20d * 0.99, 0)
  else:
    # Jika saham sedang Breakout / ATH (All-Time High), patok TP1 minimal +6%
    take_profit_1 = round(close * 1.06, 0)

  # 3. Target Profit 2 (TP2): Menggunakan Risk-to-Reward Ratio minimal 1:2 dari SL
  risk = close - stop_loss
  take_profit_2 = round(close + (risk * 2.0), 0)

  # Pastikan TP2 selalu lebih tinggi dari TP1
  if take_profit_2 <= take_profit_1:
    take_profit_2 = round(take_profit_1 * 1.05, 0)

  return stop_loss, take_profit_1, take_profit_2


def process_ticker(ticker_symbol, primary_category):
  try:
    df = yf.Ticker(ticker_symbol).history(period='3mo')
    if len(df) < 50:
      return None

    df['EMA20'] = df['Close'].ewm(span=20, adjust=False).mean()
    df['EMA50'] = df['Close'].ewm(span=50, adjust=False).mean()
    df['RSI'] = calculate_rsi(df['Close'], 14)

    latest, prev = df.iloc[-1], df.iloc[-2]
    close, prev_close = round(latest['Close'], 0), round(prev['Close'], 0)
    change_pct = round(((close - prev_close) / prev_close) * 100, 2)

    ema20, ema50 = round(latest['EMA20'], 0), round(latest['EMA50'], 0)
    rsi = (
        round(latest['RSI'], 1)
        if not pd.isna(latest['RSI'])
        else 50.0
    )
    clean_ticker = ticker_symbol.replace('.JK', '')

    candle_pattern, candle_score = analyze_candlestick(df, ema20, ema50)

    # Hitung SL & TP berbasis Support & Resistance
    stop_loss, take_profit_1, take_profit_2 = calculate_structural_levels(
        df, close, ema20
    )

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
      score -= 2

    score += candle_score
    score = max(1, min(10, score))

    if score >= 8:
      signal = 'STRONG_BULLISH'
    elif score >= 6:
      signal = 'BULLISH'
    elif score <= 3:
      signal = 'STRONG_BEARISH'
    else:
      signal = 'NEUTRAL'

    return {
        'ticker': clean_ticker,
        'category': primary_category,
        'close': close,
        'change_pct': change_pct,
        'ema20': ema20,
        'ema50': ema50,
        'rsi': rsi,
        'candle_pattern': candle_pattern,
        'ema20_status': 'buy' if close > ema20 else 'sell',
        'ema50_status': 'buy' if close > ema50 else 'sell',
        'rsi_status': (
            'strong_buy'
            if rsi < 30
            else ('buy' if rsi <= 60 else ('neutral' if rsi <= 70 else 'sell'))
        ),
        'signal': signal,
        'power_score': score,
        'stop_loss': stop_loss,
        'take_profit_1': take_profit_1,
        'take_profit_2': take_profit_2,
        'cl_hit': False,
        'tp1_hit': False,
        'tp2_hit': False,
    }
  except Exception:
    return None


def main():
  all_results, bluechips, top_movers, swing_setup = [], [], [], []
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

  top_gainers = sorted(
      all_results, key=lambda x: x['change_pct'], reverse=True
  )[:20]
  top_bearish = sorted(all_results, key=lambda x: x['change_pct'])[:20]

  entry_candidates = [
      x
      for x in all_results
      if x['power_score'] >= 7
      and 40 <= x['rsi'] <= 65
      and x['candle_pattern'] != 'BEARISH_BREAKDOWN'
  ]

  top_10_entry = sorted(
      entry_candidates,
      key=lambda x: (x['power_score'], x['change_pct']),
      reverse=True,
  )[:10]

  entry_now_list = [
      x
      for x in all_results
      if x['power_score'] >= 9 and x['candle_pattern'] != 'BEARISH_BREAKDOWN'
  ]

  output = {
      'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB'),
      'ihsg': fetch_ihsg(),
      'top_10_entry': top_10_entry,
      'entry_now': entry_now_list,
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


if __name__ == '__main__':
  main()
