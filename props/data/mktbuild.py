import pandas as pd, json, re, sys
pay=json.load(open('payload.json'))
def norm(s): return re.sub(r'\s+',' ',re.sub(r'\s+(jr|sr|ii|iii|iv|v)$','',re.sub(r"[.'`\u2019-]",'',str(s).lower()))).strip()
byname={}
for p in pay['players']: byname.setdefault(norm(p['n']),[]).append(p)
# a few known aliases between the article and nflverse
ALIAS={'travis etienne':'travis etienne','chris rodriguez':'chris rodriguez','marvin harrison':'marvin harrison',
       'cam skattebo':'cam skattebo','devon achane':'devon achane','luther burden':'luther burden'}
week=int(sys.argv[1]) if len(sys.argv)>1 else 1
src=sys.argv[2] if len(sys.argv)>2 else 'wk1_lines.csv'
df=pd.read_csv(src)
out={}; miss=[]
for r in df.itertuples():
    key=ALIAS.get(norm(r.player),norm(r.player))
    cands=byname.get(key) or [p for k,ps in byname.items() for p in ps if k.split(' ')[-1]==key.split(' ')[-1] and k[0]==key[0]]
    if not cands: miss.append(r.player); continue
    p=cands[0]
    out.setdefault(p['id'],{})[r.stat]={'line':float(r.line),'over':int(r.over),'under':int(r.under)}
pay.setdefault('mkt',{})[str(week)]=out
_src=sys.argv[3] if len(sys.argv)>3 else 'best available across BetMGM, theScore, Caesars, bet365 via SportsBettingDime'
_asof=sys.argv[4] if len(sys.argv)>4 else '2026-09-07'
pay['mkt_meta']=pay.get('mkt_meta',{}); pay['mkt_meta'][str(week)]={'src':_src,'asof':_asof}
json.dump(pay,open('payload.json','w'),separators=(',',':'))
n=sum(len(v) for v in out.values())
print(f'week {week}: {n} lines matched onto {len(out)} players; unmatched: {miss or "none"}')
