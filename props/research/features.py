# RECONSTRUCTED 2026-09-13. The original feature builder was not in the handoff zip.
# Rebuilt from part2.js featVec()/part3.js applyGame() and build/payload.py, then tested by
# refitting fit4.py and comparing to data/final_model.json: row counts and position priors
# match exactly; ridge coefficients match to within ~1 unit on a 30-unit scale (not byte-exact,
# the residual is in the league-mean used to normalise the team/defence rolling stats).
# walkfwd.py / walkcal.py / boom4.py rerun on this output reproduce the README tables to ~0.1pt.
# Usage (from research/):  python features.py     -> ../raw/feat.pkl
"""Reconstruction of the feature builder that produces raw/feat.pkl.

The original script was not shipped in the handoff. This rebuilds it from the
app engine (part2.js featVec / part3.js applyGame) and payload.py, which must
mirror it exactly. Variants are switchable so the reconstruction can be tested
against the shipped coefficients in data/final_model.json.

Run from pkg/research (or pass RAW=path).  Env switches:
  PLAYER_SCOPE   career | season   (ewm/gp_prior reset each season?)   default career
  TEAM_SCOPE     career | season                                        default career
  NORM_SCOPE     week | season | all  (league mean used for relz)       default season
  IMP_SCOPE      all | season         (mean/sd for implied z)           default season
  OUT            output path                                            default ../raw/feat.pkl
"""
import os, sys, warnings
import pandas as pd, numpy as np
warnings.filterwarnings('ignore')

RAW=os.environ.get('RAW','../raw')
OUT=os.environ.get('OUT',f'{RAW}/feat.pkl')
PLAYER_SCOPE=os.environ.get('PLAYER_SCOPE','career')
TEAM_SCOPE=os.environ.get('TEAM_SCOPE','career')
NORM_SCOPE=os.environ.get('NORM_SCOPE','season')
IMP_SCOPE=os.environ.get('IMP_SCOPE','season')
SEASONS=range(2019,2026)

GRP_STATS={'QB':['attempts','completions','passing_yards','passing_tds','passing_interceptions','carries','rushing_yards'],
 'RB':['carries','rushing_yards','receptions','targets','receiving_yards','scrim_yards','any_td'],
 'WR':['targets','receptions','receiving_yards','any_td'],
 'TE':['targets','receptions','receiving_yards','any_td'],
 'K':['fg_att','fg_made','kick_pts']}
ALL=['attempts','completions','passing_yards','passing_tds','passing_interceptions','carries',
 'rushing_yards','receptions','targets','receiving_yards','scrim_yards','any_td','fg_att','fg_made','kick_pts']
VOLMAP={'attempts':'t_pass_att','completions':'t_pass_att','passing_yards':'t_pass_yds','passing_tds':'t_tds',
 'passing_interceptions':'t_pass_att','carries':'t_carries','rushing_yards':'t_rush_yds','receptions':'t_targets',
 'targets':'t_targets','receiving_yards':'t_pass_yds','scrim_yards':'t_plays','any_td':'t_tds',
 'fg_att':'t_fg_att','fg_made':'t_fg_att','kick_pts':'t_pat_att'}
DEFMAP={'attempts':'d_pass_att','completions':'d_pass_att','passing_yards':'d_pass_yds','passing_tds':'d_tds',
 'passing_interceptions':'d_pass_att','carries':'d_carries','rushing_yards':'d_rush_yds','receptions':'d_pass_att',
 'targets':'d_pass_att','receiving_yards':'d_pass_yds','scrim_yards':'d_rush_yds','any_td':'d_tds',
 'fg_att':'d_pass_yds','fg_made':'d_pass_yds','kick_pts':'d_tds'}
TCOLS=['t_pass_att','t_carries','t_plays','t_pass_yds','t_rush_yds','t_targets','t_tds','t_fg_att','t_pat_att']
DCOLS=['d_pass_yds','d_rush_yds','d_pass_att','d_carries','d_tds']

# ---- load ----
RAWCOLS=['attempts','completions','passing_yards','passing_tds','passing_interceptions','carries','rushing_yards',
 'rushing_tds','receptions','targets','receiving_yards','receiving_tds','fg_att','fg_made','pat_made','pat_att',
 'fg_made_0_19','fg_made_20_29','fg_made_30_39','fg_made_40_49','fg_made_50_59','fg_made_60_']
fs=[]
for y in SEASONS:
    x=pd.read_csv(f'{RAW}/pw_{y}.csv',low_memory=False)
    x=x[x.season_type=='REG']
    keep=['player_id','player_name','player_display_name','position','season','week','game_id','team','opponent_team','fantasy_points_ppr']+RAWCOLS
    fs.append(x[[c for c in keep if c in x.columns]].copy())
d=pd.concat(fs,ignore_index=True)
for c in RAWCOLS: d[c]=pd.to_numeric(d[c],errors='coerce').fillna(0)
d['pos']=d.position.replace({'FB':'RB','HB':'RB'})
d=d[d.pos.isin(['QB','RB','WR','TE','K'])].copy()
d['grp']=d.pos
# rowStats() derived stats
d['scrim_yards']=d.rushing_yards+d.receiving_yards
d['any_td']=((d.rushing_tds+d.receiving_tds)>=1).astype(float)
d['kick_pts']=3*(d.fg_made_0_19+d.fg_made_20_29+d.fg_made_30_39)+4*d.fg_made_40_49+5*(d.fg_made_50_59+d.fg_made_60_)+d.pat_made
# a row counts as a game only if the player was involved
d['touches']=d.attempts+d.carries+d.targets
d['kicks']=d.fg_att+d.pat_att
d=d[(d.touches>0)|(d.kicks>0)].copy()
d=d.sort_values(['season','week','team','player_id']).reset_index(drop=True)
print('rows',len(d),d.groupby('grp').size().to_dict())

# ---- game context from games.csv ----
g=pd.read_csv(f'{RAW}/games.csv',low_memory=False)
g=g[(g.season.isin(SEASONS))&(g.game_type=='REG')]
d=d.merge(g[['game_id','home_team','away_team','spread_line','total_line']],on='game_id',how='left')
d['is_home']=(d.team==d.home_team).astype(float)
d['home']=d.is_home
d['team_spread']=np.where(d.is_home==1,-d.spread_line,d.spread_line)
d['implied']=d.total_line/2-d.team_spread/2
d['sprd']=np.clip(d.team_spread/7,-3,3)
d['abs_sprd']=np.abs(d.sprd)
if IMP_SCOPE=='all':
    m,s=d.implied.mean(),d.implied.std()
    d['imp_z']=np.clip((d.implied-m)/s,-3,3)
else:
    d['imp_z']=d.groupby('season').implied.transform(lambda x: np.clip((x-x.mean())/x.std(),-3,3))

# ---- player rolling state: prior games only ----
def ewm_prior(x,span): return x.shift(1).ewm(span=span,adjust=True,min_periods=1).mean()
d=d.sort_values(['player_id','season','week']).reset_index(drop=True)
pk=['player_id'] if PLAYER_SCOPE=='career' else ['player_id','season']
gb=d.groupby(pk,sort=False)
for s in ALL:
    d['e5_'+s]=gb[s].transform(lambda x: ewm_prior(x,5))
    d['e3_'+s]=gb[s].transform(lambda x: ewm_prior(x,3))
d['gp_prior']=gb.cumcount()

# ---- team offense / defence / opponent-allowed-by-group rolling state ----
tg=d.groupby(['season','week','game_id','team','opponent_team']).agg(
 t_pass_att=('attempts','sum'),t_carries=('carries','sum'),t_pass_yds=('passing_yards','sum'),
 t_rush_yds=('rushing_yards','sum'),t_targets=('targets','sum'),t_pass_tds=('passing_tds','sum'),
 t_rush_tds=('rushing_tds','sum'),t_fg_att=('fg_att','sum'),t_pat_att=('pat_att','sum')).reset_index()
tg['t_plays']=tg.t_pass_att+tg.t_carries; tg['t_tds']=tg.t_pass_tds+tg.t_rush_tds
tg=tg.sort_values(['team','season','week'])
tk=['team'] if TEAM_SCOPE=='career' else ['team','season']
for c in TCOLS: tg['te_'+c]=tg.groupby(tk,sort=False)[c].transform(lambda x: ewm_prior(x,6))
# defence: what each team allowed, keyed by the defending team
od=tg.rename(columns={'team':'off','opponent_team':'team'})
od=od.assign(d_pass_yds=od.t_pass_yds,d_rush_yds=od.t_rush_yds,d_pass_att=od.t_pass_att,d_carries=od.t_carries,d_tds=od.t_rush_tds)
od=od[['season','week','game_id','team']+DCOLS].sort_values(['team','season','week'])
for c in DCOLS: od['de_'+c]=od.groupby(tk,sort=False)[c].transform(lambda x: ewm_prior(x,8))
# opponent allowed by position group
oa=d.groupby(['season','week','game_id','opponent_team','grp'])[ALL].sum().reset_index().rename(columns={'opponent_team':'team'})
oa=oa.sort_values(['team','grp','season','week'])
ok=['team','grp'] if TEAM_SCOPE=='career' else ['team','grp','season']
for s in ALL: oa['oa_'+s]=oa.groupby(ok,sort=False)[s].transform(lambda x: ewm_prior(x,8))

# league means for relz
def league_mean(frame,cols,keys):
    if NORM_SCOPE=='week': return frame.groupby(['season','week'])[cols].transform('mean')
    if NORM_SCOPE=='season': return frame.groupby(['season'])[cols].transform('mean')
    return pd.DataFrame({c:np.full(len(frame),frame[c].mean()) for c in cols},index=frame.index)
def relz(v,m,lo,hi): return np.clip((v-m)/(np.abs(m)+1e-6),lo,hi)

tcols=['te_'+c for c in TCOLS]; tm=league_mean(tg,tcols,None)
for c in TCOLS: tg['tez_'+c]=relz(tg['te_'+c],tm['te_'+c],-0.8,0.8)
dcols=['de_'+c for c in DCOLS]; dm=league_mean(od,dcols,None)
for c in DCOLS: od['dez_'+c]=relz(od['de_'+c],dm['de_'+c],-0.6,0.6)
oacols=['oa_'+s for s in ALL]
if NORM_SCOPE=='week': om=oa.groupby(['season','week','grp'])[oacols].transform('mean')
elif NORM_SCOPE=='season': om=oa.groupby(['season','grp'])[oacols].transform('mean')
else: om=oa.groupby(['grp'])[oacols].transform('mean')
for s in ALL: oa['oaz_'+s]=relz(oa['oa_'+s],om['oa_'+s],-1,1)

d=d.merge(tg[['game_id','team']+tcols+['tez_'+c for c in TCOLS]],on=['game_id','team'],how='left')
d=d.merge(od[['game_id','team']+dcols+['dez_'+c for c in DCOLS]].rename(columns={'team':'opponent_team'}),on=['game_id','opponent_team'],how='left')
d=d.merge(oa[['game_id','team','grp']+['oaz_'+s for s in ALL]].rename(columns={'team':'opponent_team'}),on=['game_id','opponent_team','grp'],how='left')
for c in ['tez_'+c for c in TCOLS]+['dez_'+c for c in DCOLS]+['oaz_'+s for s in ALL]: d[c]=d[c].fillna(0)
for c in tcols+dcols: d[c]=d[c].fillna(d[c].mean())
d=d.sort_values(['season','week','team','player_id']).reset_index(drop=True)
d.to_pickle(OUT)
print('wrote',OUT,d.shape,'variants',PLAYER_SCOPE,TEAM_SCOPE,NORM_SCOPE,IMP_SCOPE)
