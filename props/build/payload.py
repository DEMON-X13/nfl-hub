import pandas as pd, numpy as np, json, warnings
warnings.filterwarnings('ignore')
d=pd.read_pickle('../raw/feat.pkl')
FM=json.load(open('../data/final_model.json'))   # the canonical copy lives in data/
ALL=['attempts','completions','passing_yards','passing_tds','passing_interceptions','carries',
 'rushing_yards','receptions','targets','receiving_yards','scrim_yards','any_td','fg_att','fg_made','kick_pts']

# ---- player baselines: state at end of 2025 ----
d25=d[d.season==2025].sort_values(['player_id','week'])
last=d25.groupby('player_id').tail(1)
sea25=d25.groupby('player_id').agg(g=('week','count'),**{s:(s,'mean') for s in ALL}).reset_index()
info=last[['player_id','player_display_name','pos','grp','team']].copy()
P=info.merge(sea25,on='player_id')

def keep(r):
    if r.grp=='QB': return r.attempts>=2
    if r.grp=='RB': return r.carries>=1 or r.targets>=0.4
    if r.grp in('WR','TE'): return r.targets>=0.6
    if r.grp=='K': return r.fg_att>=0.3
    return False
P=P[P.apply(keep,axis=1)].copy()
# only carry players who are actually on a 2026 roster, and use their 2026 team
_r=pd.read_csv('../raw/roster26.csv',low_memory=False)
_r=_r[_r.position.isin(['QB','RB','WR','TE','K','FB','HB'])&_r.status.isin(['ACT','DEV'])]
_by={str(g):(t,('RB' if p in ('FB','HB') else p)) for g,t,p in zip(_r.gsis_id,_r.team,_r.position) if isinstance(g,str)}
P=P[P.player_id.isin(_by)].copy()
P['team']=P.player_id.map(lambda x:_by[x][0])
P['pos']=P.player_id.map(lambda x:_by[x][1])
P['grp']=P.pos.replace({'FB':'RB','HB':'RB'})

# ewm state at end of season (span5/span3) computed from actual game log
def ewm_last(x,span):
    return x.ewm(span=span,min_periods=1).mean().iloc[-1]
rows=[]
for pid,gg in d25.groupby('player_id'):
    if pid not in set(P.player_id): continue
    r={'id':pid}
    for s in ALL:
        r['e5_'+s]=round(float(ewm_last(gg[s],5)),3)
        r['e3_'+s]=round(float(ewm_last(gg[s],3)),3)
    rows.append(r)
E=pd.DataFrame(rows)
P=P.merge(E,left_on='player_id',right_on='id')

# career (all seasons) mean
carn=d.groupby('player_id').size().rename('cn').reset_index()
car=d.groupby('player_id')[ALL].mean().reset_index().rename(columns={s:'car_'+s for s in ALL})
car=car.merge(carn,on='player_id')
P=P.merge(car,on='player_id',how='left')

players=[]
for _,r in P.iterrows():
    o={'id':r.player_id,'n':r.player_display_name,'p':r.pos,'g':r.grp,'t':r.team,'gp':int(r.g),'cn':int(r.cn)}
    for s in ALL:
        o[s]=[round(float(r['e5_'+s]),3),round(float(r['e3_'+s]),3),round(float(r['car_'+s]),3),round(float(r[s]),3)]
    players.append(o)
print('players',len(players))

# ---- team offense volume baselines (end of 2025) ----
tg=d[d.season==2025].groupby(['week','team']).agg(
 t_pass_att=('attempts','sum'),t_carries=('carries','sum'),t_pass_yds=('passing_yards','sum'),
 t_rush_yds=('rushing_yards','sum'),t_targets=('targets','sum'),t_pass_tds=('passing_tds','sum'),
 t_rush_tds=('rushing_tds','sum'),t_fg_att=('fg_att','sum'),t_pat_att=('pat_att','sum')).reset_index()
tg['t_plays']=tg.t_pass_att+tg.t_carries; tg['t_tds']=tg.t_pass_tds+tg.t_rush_tds
TC=['t_pass_att','t_carries','t_plays','t_pass_yds','t_rush_yds','t_targets','t_tds','t_fg_att','t_pat_att']
toff={}
for t,gg in tg.sort_values('week').groupby('team'):
    toff[t]={c:round(float(gg[c].ewm(span=6,min_periods=1).mean().iloc[-1]),3) for c in TC}

# ---- team defense baselines ----
od=d[d.season==2025].groupby(['week','opponent_team']).agg(
 d_pass_yds=('passing_yards','sum'),d_rush_yds=('rushing_yards','sum'),
 d_pass_att=('attempts','sum'),d_carries=('carries','sum'),d_tds=('rushing_tds','sum')).reset_index()
DC=['d_pass_yds','d_rush_yds','d_pass_att','d_carries','d_tds']
tdef={}
for t,gg in od.sort_values('week').groupby('opponent_team'):
    tdef[t]={c:round(float(gg[c].ewm(span=8,min_periods=1).mean().iloc[-1]),3) for c in DC}

# ---- opponent allowed by position group ----
oa=d[d.season==2025].groupby(['week','opponent_team','grp'])[ALL].sum().reset_index()
tdefg={}
for (t,g),gg in oa.sort_values('week').groupby(['opponent_team','grp']):
    tdefg.setdefault(t,{})[g]={s:round(float(gg[s].ewm(span=8,min_periods=1).mean().iloc[-1]),3) for s in ALL}

# ---- normalization constants (2025 league means) ----
norm={'toff':{c:round(float(np.mean([v[c] for v in toff.values()])),3) for c in TC},
      'tdef':{c:round(float(np.mean([v[c] for v in tdef.values()])),3) for c in DC},
      'oag':{},'implied_mean':0,'implied_sd':0}
for g in ['QB','RB','WR','TE','K']:
    norm['oag'][g]={s:round(float(np.mean([tdefg[t][g][s] for t in tdefg if g in tdefg[t]])),3) for s in ALL}
i25=d[d.season==2025]
norm['implied_mean']=round(float(i25.implied.mean()),3); norm['implied_sd']=round(float(i25.implied.std()),3)

# ---- 2026 schedule ----
g=pd.read_csv('../raw/games.csv',low_memory=False)
g26=g[(g.season==2026)&(g.game_type=='REG')]
sched=[]
for _,r in g26.iterrows():
    _g={'id':r.game_id,'w':int(r.week),'d':str(r.gameday),'t':str(r.gametime),
        'a':r.away_team,'h':r.home_team,
        'sp':None if pd.isna(r.spread_line) else float(r.spread_line),
        'tot':None if pd.isna(r.total_line) else float(r.total_line)}
    for f,c in (('mla','away_moneyline'),('mlh','home_moneyline'),('spa','away_spread_odds'),('sph','home_spread_odds')):
        if c in g26.columns and not pd.isna(getattr(r,c)): _g[f]=float(getattr(r,c))
    # keep scores that games.csv already has, so a rebuild does not un-final played games
    if not pd.isna(r.home_score) and not pd.isna(r.away_score): _g['hs']=float(r.home_score); _g['as']=float(r.away_score)
    sched.append(_g)
print('sched games',len(sched),'weeks',g26.week.max())

_prev=json.load(open('../data/payload.json')) if __import__('os').path.exists('../data/payload.json') else {}

# ---- depth charts: regenerate from raw/dc26.csv, mirroring the app's ingestDepth() ----
# latest date wins, then the best (lowest) rank; only the newest date's rows are kept
import os as _os
_depth=None; _depth_dt=None
if _os.path.exists('../raw/dc26.csv'):
    _dc=pd.read_csv('../raw/dc26.csv',low_memory=False,dtype=str)
    _dc['pos']=_dc.pos_abb.fillna('').str.upper().replace({'PK':'K'})
    _dc=_dc[_dc.pos.isin(['QB','RB','WR','TE','K'])&_dc.gsis_id.notna()].copy()
    _dc['rank']=pd.to_numeric(_dc.pos_rank,errors='coerce'); _dc=_dc[_dc['rank'].notna()]
    _dc['dt']=_dc.dt.fillna('').astype(str)
    _dtmax=_dc.dt.max()
    _dc=_dc.sort_values(['gsis_id','dt','rank'],ascending=[True,False,True]).drop_duplicates('gsis_id')
    _dc=_dc[_dc.dt==_dtmax]
    _depth={r.gsis_id:[r.team,r.pos,int(r['rank']),r.player_name] for _,r in _dc.iterrows()}
    _depth_dt=_dtmax[:10]
    print('depth',len(_depth),'players ranked as of',_depth_dt)
else:
    print('depth: raw/dc26.csv not found, carrying the previous table forward')
out={'roster_season':2026,'mkt':_prev.get('mkt',{}),'mkt_meta':_prev.get('mkt_meta',{}),'grid':json.load(open('../data/grid_model.json')),'pts':json.load(open('../data/pts_model.json')),'corr':json.load(open('../data/corr.json')),'players':players,'toff':toff,'tdef':tdef,'tdefg':tdefg,'norm':norm,'sched':sched,
     'model':FM['model'],'dist':FM['dist'],'qs':FM['qs'],'prior':FM['prior'],'k':FM['k']}
if _depth is not None: out['depth']=_depth; out['depth_dt']=_depth_dt
# carry forward anything the build does not regenerate, so one-off additions survive rebuilds
for _k,_v in _prev.items():
    if _k not in out: out[_k]=_v
# DATA_BUILD (bug 3): derived from the roster/schedule content, so it changes exactly when a
# browser's cached state needs rebuilding and never when only scores or lines moved.
import hashlib, datetime
_sig=json.dumps({'players':sorted([p['id'],p['t'],p['p']] for p in players),
                 'sched':[[g['id'],g['d'],g['t'],g['a'],g['h']] for g in sched],
                 'depth_dt':out.get('depth_dt')},sort_keys=True)
_h=hashlib.sha1(_sig.encode()).hexdigest()[:8]
_prevb=str(_prev.get('build') or '')
out['build']=_prevb if _prevb.endswith('#'+_h) else f"data {datetime.date.today().isoformat()} #{_h}"
print('build',out['build'],'(unchanged)' if out['build']==_prevb else '(bumped: roster/schedule content changed)')
_REQUIRED=['tdrate','tdmult','corr','depth','build','grid','pts','mkt_scale']
_missing=[k for k in _REQUIRED if k not in out]
assert not _missing, f'payload is missing required keys: {_missing}'
json.dump(out,open('../data/payload.json','w'),separators=(',',':'))
import os; print('../data/payload.json',os.path.getsize('../data/payload.json'),'bytes')

# NOTE: do not thin the quantile grid (qs/dist); count stats need the full 51 points. THIN=False
