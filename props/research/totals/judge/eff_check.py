"""Judge: the efficiency candidate's ratings file.
(1) data/eff/features_a4_w0.4.parquet (the file the frozen candidate read) equals a fresh full build with the current eff/build_eff.py
    (modified 23:44) at ALPHA 4, W_PREV 0.4, on every game and column.
(2) My own ridge, written here from games.csv and raw play-by-play, for points and EPA a play on several
    dates (dev and holdout), equals the file's values: only games on earlier dates this season (weight 1)
    and the previous season (weight 0.4), ridge 4 on o and d, mu and h free.
Run: python3 -I judge/eff_check.py   (from props/research/totals)
"""
import os, sys
import numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TOT); sys.path.insert(0, os.path.join(TOT, 'eff'))
import build_eff as E

stored = pd.read_parquet(os.path.join(TOT, 'data', 'eff', 'features_a4_w0.4.parquet')).set_index('game_id').sort_index()
if '--skip-full' not in sys.argv:
    tg = E.stream()
    fresh = E.build(4.0, 0.4, tg=tg).set_index('game_id').sort_index()
    same_idx = stored.index.equals(fresh.index)
    cols = [c for c in stored.columns]
    d = (stored[cols] - fresh.loc[stored.index, cols]).abs().max().max()
    print(f'1. stored file vs fresh build: {len(stored)} games x {len(cols)} columns, same games {same_idx}, max |diff| {d:.3g}')

# (2) my own ridge
FR = {'STL': 'LA', 'SD': 'LAC', 'OAK': 'LV'}
f = lambda t: FR.get(t, t)
GC = pd.read_csv(os.path.join(TOT, 'data', 'raw', 'games', 'games.csv'), low_memory=False)
GC = GC[GC.season.between(2009, 2026) & GC.home_score.notna()].copy()
COLS = ['game_id', 'posteam', 'play_type', 'pass', 'rush', 'two_point_attempt', 'epa']
agg = []
for s in range(2009, 2027):
    p = pd.read_parquet(os.path.join(TOT, 'data', 'raw', 'pbp', f'play_by_play_{s}.parquet'), columns=COLS)
    p = p[p.posteam.notna() & p.play_type.isin(['pass', 'run']) & ((p['pass'] == 1) | (p['rush'] == 1)) &
          (p.two_point_attempt.fillna(0) != 1) & p.epa.notna()]
    a = p.groupby(['game_id', 'posteam']).epa.agg(['size', 'sum']).reset_index()
    a['posteam'] = a.posteam.map(f)
    agg.append(a)
AG = pd.concat(agg).set_index(['game_id', 'posteam'])
teams = sorted(set(GC.home_team.map(f)) | set(GC.away_team.map(f)))
ti = {t: i for i, t in enumerate(teams)}; nT = len(teams)


def my_ridge(S, d, stat):
    g = GC[((GC.season == S) & (GC.gameday < d)) | (GC.season == S - 1)]
    rows, ys, ws = [], [], []
    for r in g.itertuples(index=False):
        neutral = r.location == 'Neutral'
        wseason = 1.0 if r.season == S else 0.4
        for off, de, home, pts in ((f(r.home_team), f(r.away_team), 0 if neutral else 1, r.home_score),
                                   (f(r.away_team), f(r.home_team), 0, r.away_score)):
            x = np.zeros(2 + 2 * nT); x[0] = 1; x[1] = home; x[2 + ti[off]] = 1; x[2 + nT + ti[de]] = 1
            if stat == 'pts':
                y, w = pts, 1.0
            else:
                k, e = AG.loc[(r.game_id, off)]
                y, w = e / k, k / 62.0
            rows.append(x); ys.append(y); ws.append(w * wseason)
    X, y, w = np.array(rows), np.array(ys), np.array(ws)
    pen = np.r_[0, 0, np.full(2 * nT, 4.0)]
    b = np.linalg.solve(X.T @ (X * w[:, None]) + np.diag(pen), X.T @ (w * y))
    return b


worst = 0.0; n = 0
for gid in ['2015_09_DEN_IND', '2021_14_LAC_NYG', '2024_11_KC_BUF', '2025_06_DET_KC', '2025_18_SF_SEA', '2026_04_GB_TB', '2026_05_SF_LA']:
    if gid not in stored.index:
        print('   (not in file)', gid); continue
    r = GC[GC.game_id == gid]
    if not len(r):
        r = pd.read_csv(os.path.join(TOT, 'data', 'raw', 'games', 'games.csv'), low_memory=False)
        r = r[r.game_id == gid]
    r = r.iloc[0]
    S, d = int(r.season), r.gameday
    for stat in ('pts', 'epa'):
        b = my_ridge(S, d, stat)
        h, a = ti[f(r.home_team)], ti[f(r.away_team)]
        mine = {f'e_mu_{stat}': b[0], f'e_h_{stat}': b[1], f'e_home_o_{stat}': b[2 + h], f'e_away_o_{stat}': b[2 + a],
                f'e_home_d_{stat}': b[2 + nT + h], f'e_away_d_{stat}': b[2 + nT + a]}
        diff = max(abs(stored.loc[gid, k] - v) for k, v in mine.items())
        worst = max(worst, diff); n += len(mine)
        print(f'2. {gid} {d} {stat}: max |mine - file| {diff:.2e}')
print(f'   {n} values, worst {worst:.2e}', 'OK' if worst < 1e-8 else 'MISMATCH')
