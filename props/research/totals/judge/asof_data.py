"""Judge: (1) the stored data/games.parquet equals a fresh build with the current build_dataset.py on every
row and feature column; (2) as-of rebuilds on holdout-season dates the builder's own check did not cover
(the world cut off the morning of the date: every game from then on unplayed and its play-by-play gone)
give that date's games exactly the stored features.
Run: python3 -I judge/asof_data.py   (from props/research/totals)
"""
import os, sys
import numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TOT)
import build_dataset as B

G = pd.read_parquet(os.path.join(TOT, 'data', 'games.parquet'))
SKIP = {'game_id', 'home_score', 'away_score', 'total', 'result', 'overtime', 'played'}
COLS = [c for c in G.columns if c not in SKIP]


def compare(a, b, cols):
    bad = []
    for c in cols:
        x, y = a[c], b[c]
        if x.dtype.kind in 'fciu' and y.dtype.kind in 'fciu':
            eq = np.isclose(x.astype(float), y.astype(float), rtol=1e-12, atol=1e-12, equal_nan=True)
        else:
            eq = (x.astype(str) == y.astype(str)).to_numpy()
        if not eq.all():
            bad.append((c, int((~eq).sum())))
    return bad


F, _ = B.build(write=False)
F = F.set_index('game_id').loc[G.game_id]
bad = compare(G.set_index('game_id'), F, COLS)
print('1. stored games.parquet vs a fresh build with the current code:', len(G), 'rows x', len(COLS), 'columns,',
      'identical' if not bad else f'DIFFER {bad[:10]}')
# outcomes too (so the grading columns are games.csv's)
bo = compare(G.set_index('game_id'), F, ['home_score', 'away_score', 'total'])
print('   outcome columns:', 'identical' if not bo else bo)

for cut in ['2017-10-22', '2024-11-17', '2025-01-12', '2025-12-14', '2026-09-27']:
    A, _ = B.build(cutoff=cut, write=False)
    day = G[G.gameday == cut].set_index('game_id')
    asof = A.set_index('game_id').loc[day.index]
    bad = compare(day, asof, COLS)
    print(f'2. as of {cut}: {len(day)} games x {len(COLS)} columns', 'identical' if not bad else f'DIFFER {bad[:8]}')
