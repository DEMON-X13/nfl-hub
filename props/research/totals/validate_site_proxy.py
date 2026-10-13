"""How faithful is the site-rule proxy? Its te_/de_ EWM inputs against the props research table
(props/raw/feat.pkl, built from nflverse player stats), on dev-period games only (2019-2023)."""
import os, sys, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__))
feat = pd.read_pickle(os.path.join(HERE, '..', '..', 'raw', 'feat.pkl'))
feat = feat[feat.season.between(2019, 2023)]
cols = ['te_t_pass_yds', 'te_t_rush_yds', 'te_t_tds', 'te_t_plays', 'de_d_pass_yds', 'de_d_rush_yds', 'de_d_tds', 'de_d_pass_att']
f = feat.groupby(['game_id', 'team'])[cols[:4]].first().reset_index()
fd = feat.groupby(['game_id', 'opponent_team'])[cols[4:]].first().reset_index().rename(columns={'opponent_team': 'opp'})
# feat.pkl's de_ is keyed by the defending team; its rows carry the opponent's de_ as the matchup
tg = pd.read_parquet(os.path.join(HERE, 'data', 'team_games.parquet'))
tg = tg[tg.season.between(2019, 2023) & (tg.game_type == 'REG')]
m = tg.merge(f, left_on=['game_id', 'fr'], right_on=['game_id', 'team'], suffixes=('', '_feat'))
print('matched team-games', len(m), 'of', len(tg))
for c in cols[:4]:
    a, b = m[c], m[c + '_feat']
    print(f'{c:16s} corr {np.corrcoef(a, b)[0,1]:.4f}  mean ours {a.mean():8.3f} feat {b.mean():8.3f}  MAD {np.abs(a-b).mean():.3f}')
# defence: feat.pkl's de_ on a player row is the PLAYER's team's own defence? check both readings
d = feat.groupby(['game_id', 'team'])[cols[4:]].first().reset_index()
md = tg.merge(d, left_on=['game_id', 'fr'], right_on=['game_id', 'team'], suffixes=('', '_feat'))
mo = tg.merge(d, left_on=['game_id', 'ofr'], right_on=['game_id', 'team'], suffixes=('', '_feat'))
for c in cols[4:]:
    print(f'{c:16s} own-team corr {np.corrcoef(md[c], md[c+"_feat"])[0,1]:.4f}  opp corr {np.corrcoef(mo[c], mo[c+"_feat"])[0,1]:.4f}  MAD(own) {np.abs(md[c]-md[c+"_feat"]).mean():.3f}  means {md[c].mean():.3f} {md[c+"_feat"].mean():.3f}')
