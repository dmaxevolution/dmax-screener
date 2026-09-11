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

  near_res_20 = abs(c_high - ema20) / ema20 <= 0.015
  near_res_50 = abs(c_high - ema50) / ema50 <= 0.015
  at_resistance = near_res_20 or near_res_50

  pattern_detected = 'NONE'
  score_modifier = 0

  if (
      lower_shadow >= (1.8 * body)
      and upper_shadow <= (0.8 * body)
      and body > 0
      and (at_support or c_close > ema20)
  ):
    pattern_detected = 'BULLISH HAMMER'
    score_modifier = 3
  elif (
      p_close < p_open
      and c_close > c_open
      and c_close > p_open
      and c_open < p_close
      and (at_support or c_close > ema20)
  ):
    pattern_detected = 'BULLISH ENGULFING'
    score_modifier = 3
  elif (
      upper_shadow >= (1.8 * body)
      and lower_shadow <= (0.8 * body)
      and body > 0
      and (at_resistance or c_close < ema20)
  ):
    pattern_detected = 'SHOOTING STAR'
    score_modifier = -3
  elif (
      p_close > p_open
      and c_close < c_open
      and c_open > p_close
      and c_close < p_open
  ):
    pattern_detected = 'BEARISH ENGULFING'
    score_modifier = -3
  elif c_close < c_open and (c_close < ema20 and c_close < ema50):
    if p_close >= ema20 or p_close >= ema50:
      pattern_detected = 'BEARISH BREAKDOWN'
      score_modifier = -4

  return pattern_detected, score_modifier


def calculate_structural_levels(df, close, ema20, candle_pattern):
  latest = df.iloc[-1]
  c_low = latest['Low']

  if candle_pattern in ['BULLISH HAMMER', 'BULLISH ENGULFING']:
    support_level = min(c_low, ema20)
  else:
    support_level = min(df['Low'].tail(5).min(), ema20)

  stop_loss = round(support_level * 0.99, 0)

  if (close - stop_loss) / close > 0.07:
    stop_loss = round(close * 0.93, 0)

  if stop_loss >= close:
    stop_loss = round(close * 0.95, 0)

  risk = close - stop_loss
  highest_20d = df['High'].tail(20).max()

  tp1_rr2 = close + (risk * 2.0)
  if highest_20d > tp1_rr2:
    take_profit_1 = round(highest_20d * 0.99, 0)
  else:
    take_profit_1 = round(tp1_rr2, 0)

  take_profit_2 = round(close + (risk * 3.0), 0)
  rrr_ratio = round((take_profit_1 - close) / risk, 2) if risk > 0 else 0

  return stop_loss, take_profit_1, take_profit_2, rrr_ratio


def calculate_safety_score(
    category, close, ema20, ema50, rsi, candle_pattern, rrr_ratio, power_score
):
  """Menghitung skor keamanan objektif gabungan Fundamental + Teknikal (0 - 100)"""
  safety = 0

  # 1. BOBOT FUNDAMENTAL / KATEGORI (Maks 35 Poin)
  if category == 'BLUECHIP':
    safety += 35
  elif category == 'GROWTH_SECOND_LINER':
    safety += 28
  elif category == 'TOP_MOVERS':
    safety += 22
  else:
    safety += 18

  # 2. BOBOT TEKNIKAL TREN & MA (Maks 25 Poin)
  if close > ema20 and close > ema50:
    safety += 25
  elif close > ema20:
    safety += 15
  elif close > ema50:
    safety += 10

  # 3. BOBOT RSI (Maks 15 Poin) - Ideal di area 45-60
  if 45 <= rsi <= 60:
    safety += 15
  elif 40 <= rsi <= 65:
    safety += 10

  # 4. BOBOT SINYAL & CANDLESTICK (Maks 15 Poin)
  if candle_pattern in ['BULLISH HAMMER', 'BULLISH ENGULFING']:
    safety += 15
  elif candle_pattern == 'NONE':
    safety += 5

  # 5. BOBOT RISK TO REWARD (Maks 10 Poin)
  if rrr_ratio >= 2.5:
    safety += 10
  elif rrr_ratio >= 1.8:
    safety += 7

  return min(100, safety)


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

    stop_loss, take_profit_1, take_profit_2, rrr_ratio = (
        calculate_structural_levels(df, close, ema20, candle_pattern)
    )

    # Scoring Power (1-10)
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

    safety_score = calculate_safety_score(
        primary_category,
        close,
        ema20,
        ema50,
        rsi,
        candle_pattern,
        rrr_ratio,
        score,
    )

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
        'safety_score': safety_score,
        'rrr_ratio': rrr_ratio,
        'stop_loss': stop_loss,
        'take_profit_1': take_profit_1,
        'take_profit_2': take_profit_2,
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

  # DEDIKASI KANDIDAT SIAP ENTRY (SKOR 7, 8, DAN 9)
  ready_to_entry_candidates = [
      x
      for x in all_results
      if x['power_score'] in [7, 8, 9]
      and x['rrr_ratio'] >= 1.5
      and x['candle_pattern']
      not in ['BEARISH ENGULFING', 'SHOOTING STAR', 'BEARISH BREAKDOWN']
  ]

  # PERANGKINGAN KEAMANAN (SAFETY SCORE) TINGGI KE RENDAH (Rank 1, 2, 3...)
  ranked_ready_entry = sorted(
      ready_to_entry_candidates,
      key=lambda x: (x['safety_score'], x['power_score'], x['change_pct']),
      reverse=True,
  )

  # TOP 10 ENTRY (Tetap untuk kompatibilitas UI Top 10)
  top_10_entry = sorted(
      [x for x in all_results if x['power_score'] >= 8],
      key=lambda x: (x['power_score'], x['change_pct']),
      reverse=True,
  )[:10]

  output = {
      'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB'),
      'ihsg': fetch_ihsg(),
      'ready_entry_ranked': ranked_ready_entry,
      'top_10_entry': top_10_entry,
      'entry_now': ready_to_entry_candidates,
      'swing_setup': (
          swing_setup if swing_setup else ready_to_entry_candidates[:15]
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