import os, sys, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_dataset as B
feat = pd.read_pickle(os.path.join(HERE, '..', '..', 'raw', 'feat.pkl'))
feat = feat[feat.season.between(2019, 2023)]
tcols = ['te_t_pass_yds', 'te_t_rush_yds', 'te_t_tds', 'te_t_plays']
dcols = ['de_d_pass_yds', 'de_d_rush_yds', 'de_d_tds', 'de_d_pass_att']
f = feat.groupby(['game_id', 'team'])[tcols + dcols].first().reset_index()
tg = pd.read_parquet(os.path.join(HERE, 'data', 'team_games.parquet'))
tg = tg.drop(columns=[c for c in tg.columns if c.startswith('te_') or c.startswith('de_')])
for label, kw, start in [('REG+POST stream from 2009', {}, 2009), ('REG-only stream from 2009', {'reg_only': True}, 2009),
                         ('REG-only stream from 2019 (as feat.pkl)', {'reg_only': True}, 2019)]:
    sw, _ = B.site_ewms(tg[tg.season >= start], **kw)
    x = tg.merge(sw, on=['game_id', 'team'])
    x = x[x.season.between(2021, 2023) & (x.game_type == 'REG')]
    m = x.merge(f, left_on=['game_id', 'fr'], right_on=['game_id', 'team'], suffixes=('', '_f'))
    # feat.pkl de_ on a player's row is his OPPONENT's defence
    fo = f.rename(columns={'team': 'ofr2'})[['game_id', 'ofr2'] + dcols]
    mo = x.merge(fo, left_on=['game_id', 'ofr'], right_on=['game_id', 'ofr2'], suffixes=('', '_f'))
    print(label, '2021-2023 REG', len(m))
    for c in tcols:
        print(f'   {c:15s} corr {np.corrcoef(m[c], m[c+"_f"])[0,1]:.4f} MAD {np.abs(m[c]-m[c+"_f"]).mean():.3f}')
    for c in dcols:
        print(f'   {c:15s} corr {np.corrcoef(mo[c], mo[c+"_f"])[0,1]:.4f} MAD {np.abs(mo[c]-mo[c+"_f"]).mean():.3f}')
