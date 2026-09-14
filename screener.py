#!/usr/bin/env python3
import json, os, math, tempfile, time
from datetime import datetime
import numpy as np
import pandas as pd
import yfinance as yf

DB_FILE='emiten.json'; OUT_FILE='data.json'; LOG_FILE='plan_log.json'; MIN_SUCCESS_RATIO=.70

def clean(x):
 if isinstance(x,dict): return {str(k):clean(v) for k,v in x.items()}
 if isinstance(x,(list,tuple)): return [clean(v) for v in x]
 if isinstance(x,np.integer): return int(x)
 if isinstance(x,(np.floating,float)):
  v=float(x); return None if math.isnan(v) or math.isinf(v) else v
 return x

def dl(symbol,period,interval):
 for _ in range(3):
  try:
   d=yf.download(symbol,period=period,interval=interval,auto_adjust=True,progress=False,threads=False,timeout=20)
   if d is not None and not d.empty:
    if isinstance(d.columns,pd.MultiIndex): d.columns=d.columns.get_level_values(0)
    return d.dropna()
  except Exception: pass
  time.sleep(1)
 return None

def ema(s,n): return s.ewm(span=n,adjust=False).mean()
def rsi(s,n=14):
 d=s.diff(); u=d.clip(lower=0).ewm(alpha=1/n,adjust=False).mean(); dn=(-d.clip(upper=0)).ewm(alpha=1/n,adjust=False).mean(); return 100-(100/(1+u/dn.replace(0,np.nan)))
def macd(s):
 m=ema(s,12)-ema(s,26); sig=ema(m,9); return m,sig,m-sig

def analyze(df):
 if df is None or len(df)<30: raise ValueError('insufficient data')
 c=pd.to_numeric(df.Close,errors='coerce'); e20,e50=ema(c,20),ema(c,50); e200=ema(c,200) if len(c)>=200 else pd.Series([np.nan]*len(c),index=c.index)
 rr=rsi(c); m,ms,mh=macd(c); q=df.iloc[-1]
 close=float(c.iloc[-1]); prev=float(c.iloc[-2]) if len(c)>1 else close
 score=50
 score += 12 if close>e20.iloc[-1]>e50.iloc[-1] else -10
 if pd.notna(e200.iloc[-1]): score += 8 if close>e200.iloc[-1] else -7
 if 50<=rr.iloc[-1]<=70: score+=10
 elif rr.iloc[-1]<35 or rr.iloc[-1]>80: score-=8
 score += 8 if m.iloc[-1]>ms.iloc[-1] else -6
 score=max(0,min(100,round(score)))
 trend='BULLISH' if close>e20.iloc[-1]>e50.iloc[-1] else ('BEARISH' if close<e20.iloc[-1]<e50.iloc[-1] else 'SIDEWAYS')
 return {'close':close,'change_pct':(close-prev)/prev*100 if prev else 0,'open':float(q.Open),'high':float(q.High),'low':float(q.Low),'volume':float(q.Volume or 0),'ema20':float(e20.iloc[-1]),'ema50':float(e50.iloc[-1]),'ema200':float(e200.iloc[-1]) if pd.notna(e200.iloc[-1]) else None,'rsi':float(rr.iloc[-1]),'macd':float(m.iloc[-1]),'macd_signal':float(ms.iloc[-1]),'macd_hist':float(mh.iloc[-1]),'trend':trend,'score':score,'support':float(df.Low.tail(20).min()),'resistance':float(df.High.tail(20).max())}

def sig(score): return 'ELITE BUY' if score>=90 else 'STRONG BUY' if score>=80 else 'BUY' if score>=70 else 'WATCHLIST' if score>=60 else 'WAIT' if score>=50 else 'AVOID'


def candle_pattern(df):
    """Independent candle monitor: does NOT affect algorithm score."""
    if df is None or len(df) < 3:
        return {'name':'NO DATA','bias':'NEUTRAL','impact':'LOW','note':'Data candle belum cukup'}
    x=df.tail(3).copy()
    def bar(i):
        r=x.iloc[i]; o=float(r.Open); c=float(r.Close); h=float(r.High); l=float(r.Low)
        body=abs(c-o); rng=max(h-l,1e-9)
        return {'o':o,'c':c,'h':h,'l':l,'body':body,'range':rng,'bull':c>o,'bear':c<o,
                'upper':h-max(o,c),'lower':min(o,c)-l}
    a,b,c=bar(0),bar(1),bar(2)
    # Highest-impact multi-candle reversals first
    if a['bear'] and b['body']/b['range']<0.35 and c['bull'] and c['c']>(a['o']+a['c'])/2:
        return {'name':'MORNING STAR','bias':'BULLISH','impact':'HIGH','note':'Potensi reversal bullish; tunggu konfirmasi candle berikutnya'}
    if a['bull'] and b['body']/b['range']<0.35 and c['bear'] and c['c']<(a['o']+a['c'])/2:
        return {'name':'EVENING STAR','bias':'BEARISH','impact':'HIGH','note':'Potensi reversal bearish; monitor support dan momentum'}
    if a['bear'] and b['bear'] and c['bear'] and a['c']>b['c']>c['c']:
        return {'name':'THREE BLACK CROWS','bias':'BEARISH','impact':'HIGH','note':'Tekanan jual beruntun; pola reversal/peringatan kuat'}
    if a['bull'] and b['bull'] and c['bull'] and a['c']<b['c']<c['c']:
        return {'name':'THREE WHITE SOLDIERS','bias':'BULLISH','impact':'HIGH','note':'Dorongan beli beruntun; monitor resistance untuk follow-through'}
    if b['bear'] and c['bull'] and c['o']<=b['c'] and c['c']>=b['o']:
        return {'name':'BULLISH ENGULFING','bias':'BULLISH','impact':'HIGH','note':'Body bullish menelan candle sebelumnya; tunggu volume/konfirmasi'}
    if b['bull'] and c['bear'] and c['o']>=b['c'] and c['c']<=b['o']:
        return {'name':'BEARISH ENGULFING','bias':'BEARISH','impact':'HIGH','note':'Body bearish menelan candle sebelumnya; monitor risiko reversal'}
    body=max(c['body'],c['range']*0.02)
    if c['lower']>=body*2 and c['upper']<=body*0.9:
        return {'name':'HAMMER','bias':'BULLISH','impact':'MEDIUM','note':'Penolakan harga bawah; lebih kuat jika muncul setelah penurunan'}
    if c['upper']>=body*2 and c['lower']<=body*0.9:
        return {'name':'SHOOTING STAR','bias':'BEARISH','impact':'MEDIUM','note':'Penolakan harga atas; lebih kuat jika muncul setelah kenaikan'}
    if c['body']/c['range']<=0.10:
        return {'name':'DOJI','bias':'NEUTRAL','impact':'MEDIUM','note':'Pasar ragu; tunggu breakout atau candle konfirmasi'}
    return {'name':'NO MAJOR PATTERN','bias':'NEUTRAL','impact':'LOW','note':'Tidak ada pola reversal besar pada candle terbaru'}

def entry_class(a, stale=False):
    score=a['score']; rsi=a['rsi']; bull=a['ema20']>a['ema50']; above=a['close']>a['ema20']; macd_bull=a['macd']>a['macd_signal']
    if not stale and score>=85 and bull and above and macd_bull and 50<=rsi<=75: return ('ENTRY NOW','ENTRY NOW')
    if not stale and score>=75 and bull and above: return ('READY','READY')
    if not stale and score>=65: return ('READY SETUP','READY SETUP')
    if score>=55: return ('PANTAU','PANTAU')
    if score>=45: return ('WAIT','WAIT')
    return ('AVOID','AVOID')

def plan_monitor(a, entry, sl, tp1, tp2):
    """Level monitor independent of score. Uses latest DAILY candle only."""
    low=float(a.get('low',0)); high=float(a.get('high',0)); close=float(a.get('close',0))
    stop_touched=bool(low and low<=sl)
    tp1_touched=bool(high and high>=tp1)
    tp2_touched=bool(high and high>=tp2)
    return {
      'basis':'LAST DAILY CANDLE',
      'cl':{'touched':stop_touched,'close_below':bool(close<=sl),'level':sl},
      'tp1':{'touched':tp1_touched,'close_above':bool(close>=tp1),'level':tp1},
      'tp2':{'touched':tp2_touched,'close_above':bool(close>=tp2),'level':tp2}
    }

def stock(row):
 t=str(row['ticker']).upper().replace('.JK',''); d=dl(t+'.JK','2y','1d'); a=analyze(d)
 # SAFE: intraday only last 60 days; failure does not fail daily analysis
 h=dl(t+'.JK','60d','1h'); hdata=analyze(h) if h is not None and len(h)>=30 else {'status':'unavailable'}
 score=a['score']; close=a['close']; support=a['support']; resistance=a['resistance']; entry=min(close, max(a['ema20'], support)); sl=min(entry*.98, support*.995); sl=max(sl, entry*.90); risk=max(entry-sl, entry*.01); tp1=entry+risk*2; tp2=entry+risk*3
 sig_label, ready_label=entry_class(a)
 return {'ticker':t,'sector':row.get('sector','IDX'),'close':close,'change_pct':a['change_pct'],'professional_score':score,'entry_probability':score,'signal_strength':score,'signal':sig(score),'entry_status':sig_label,'strategy':'TREND FOLLOWING' if a['trend']=='BULLISH' else 'WAIT / NO TRADE','mtf_alignment':a['trend'],'ema20':a['ema20'],'ema50':a['ema50'],'ema200':a['ema200'],'rsi':a['rsi'],'macd':a['macd'],'macd_signal':a['macd_signal'],'risk_plan':{'entry':entry,'stop_loss':sl,'tp1':tp1,'tp2':tp2},'plan_monitor':plan_monitor(a,entry,sl,tp1,tp2),'candle_pattern':candle_pattern(d),'signal_date':pd.Timestamp(d.index[-1]).strftime('%Y-%m-%d'),'timeframes':{'daily':a,'1h':hdata}}

def load_log():
 try:
  with open(LOG_FILE,encoding='utf-8') as f:
   x=json.load(f)
   return x if isinstance(x,list) else []
 except Exception: return []

def candle_outcome_after(df, signal_date, sl, tp1, tp2):
    """Evaluate candles strictly after signal_date. If multiple levels hit on one candle and order is unknowable, mark ambiguous."""
    if df is None or df.empty: return {'status':'OPEN'}
    for idx,row in df.iterrows():
        d=pd.Timestamp(idx).strftime('%Y-%m-%d')
        if d<=signal_date: continue
        o,h,l,c=[float(row[k]) for k in ('Open','High','Low','Close')]
        cl=l<=sl; p2=h>=tp2; p1=h>=tp1
        if cl and p2:
            if o<=sl: return {'status':'CL','date':d,'price':sl,'note':'CL dan TP2 tersentuh pada candle yang sama; open mengindikasikan CL lebih dulu'}
            if o>=tp2: return {'status':'TP2','date':d,'price':tp2,'note':'TP2 lebih dulu berdasarkan open candle'}
            return {'status':'AMBIGUOUS','date':d,'price':None,'note':'CL dan TP2 sama-sama tersentuh pada candle yang sama; urutan intraday tidak diketahui dari data harian'}
        if cl: return {'status':'CL','date':d,'price':sl,'note':'CL tersentuh'}
        if p2: return {'status':'TP2','date':d,'price':tp2,'note':'TP2 tersentuh'}
        if p1: return {'status':'TP1','date':d,'price':tp1,'note':'TP1 tersentuh'}
    return {'status':'OPEN'}

def update_plan_log(stocks, raw_by_ticker):
    logs=load_log(); bykey={f"{x.get('ticker')}|{x.get('signal_date')}":x for x in logs}
    now=datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB')
    for s in stocks:
        t=s.get('ticker'); sd=s.get('signal_date')
        if not t or not sd or s.get('stale'): continue
        status=s.get('entry_status','')
        if status not in ('ENTRY NOW','READY'): continue
        p=s.get('risk_plan',{}); key=f'{t}|{sd}'
        item=bykey.get(key)
        if item is None:
            item={'id':key,'ticker':t,'sector':s.get('sector','IDX'),'signal_date':sd,'logged_at':now,
                  'signal':status,'algo_score':s.get('professional_score'), 'candle_pattern':s.get('candle_pattern',{}),
                  'entry':p.get('entry'),'cl':p.get('stop_loss'),'tp1':p.get('tp1'),'tp2':p.get('tp2'),
                  'outcome':'OPEN','outcome_date':None,'outcome_price':None,'outcome_note':None}
            bykey[key]=item
        df=raw_by_ticker.get(t)
        if item.get('outcome') not in ('TP2','CL','AMBIGUOUS'):
            o=candle_outcome_after(df, sd, float(item['cl']), float(item['tp1']), float(item['tp2'])) if df is not None else {'status':'OPEN'}
            if o['status']!='OPEN':
                item['outcome']=o['status']; item['outcome_date']=o.get('date'); item['outcome_price']=o.get('price'); item['outcome_note']=o.get('note')
    out=sorted(bykey.values(),key=lambda x:(x.get('signal_date',''),x.get('ticker','')),reverse=True)
    # keep a bounded journal while preserving useful history
    out=out[:2000]
    return out

def main():
 with open(DB_FILE,encoding='utf-8') as f: rows=[x for x in json.load(f).get('emiten',[]) if x.get('active',True) and x.get('ticker')]
 old={}
 try:
  with open(OUT_FILE,encoding='utf-8') as f: old={str(x.get('ticker','')).upper():x for x in json.load(f).get('all_stocks',[])}
 except Exception: pass
 stocks=[]; failed=[]; fresh=0
 for r in rows:
  t=str(r['ticker']).upper().replace('.JK','')
  try: stocks.append(stock(r)); fresh+=1; print('OK',t)
  except Exception as e:
   print('FAILED',t,e); failed.append({'ticker':t,'error':str(e)})
   if t in old: old[t]['stale']=True; old[t]['update_error']=str(e); stocks.append(old[t])
 if fresh<max(1,int(len(rows)*MIN_SUCCESS_RATIO)): raise RuntimeError('UPDATE REJECTED: insufficient fresh data')
 ihsg={}
 try:
  ih=dl('^JKSE','2y','1d'); x=analyze(ih); market_score=x['score']; ihsg={**x,'ticker':'^JKSE','name':'IHSG / IDX Composite','market_signal':market_score,'signal':('MARKET SUPPORTIVE' if market_score>=70 else 'MARKET CAUTION' if market_score>=50 else 'MARKET RISK'),'updated_at':datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB')}
 except Exception as e: ihsg={'ticker':'^JKSE','status':'unavailable','error':str(e)}
 stocks.sort(key=lambda x:x.get('professional_score',0),reverse=True)
 raw_by_ticker={}
 for s in stocks:
  if s.get('stale') or s.get('entry_status') not in ('ENTRY NOW','READY'): continue
  try: raw_by_ticker[s['ticker']]=dl(s['ticker']+'.JK','2y','1d')
  except Exception: pass
 plan_log=update_plan_log(stocks,raw_by_ticker)
 with open(LOG_FILE,'w',encoding='utf-8') as f: json.dump(clean(plan_log),f,ensure_ascii=False,indent=2,allow_nan=False)
 data={'schema_version':'4.1','engine':'IDX TERMINAL PRO V4.1 Market + Plan Performance Log + Independent Candle Monitor','last_updated':datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB'),'plan_log_total':len(plan_log),'engine':'IDX TERMINAL PRO V4.0 Market + Plan Outcome Monitor + Independent Candle Monitor','last_updated':datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB'),'database_total':len(rows),'success_total':fresh,'failed_total':len(failed),'failed':failed,'ihsg':ihsg,'all_stocks':stocks,'stocks':stocks,'top_10_entry':stocks[:10],'total_emiten':len(stocks)}
 data=clean(data); fd,tmp=tempfile.mkstemp(prefix='data_',suffix='.json'); os.close(fd)
 with open(tmp,'w',encoding='utf-8') as f: json.dump(data,f,ensure_ascii=False,indent=2,allow_nan=False)
 os.replace(tmp,OUT_FILE); print('UPDATE OK:',fresh,'/',len(rows),'| IHSG',ihsg.get('close','unavailable'))
if __name__=='__main__': main()
    
