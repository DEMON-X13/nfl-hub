import os, sys
import numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TOT)
import build_dataset as B
G = pd.read_parquet(os.path.join(TOT, 'data', 'games.parquet')).set_index('game_id')
F, _ = B.build(write=False)
F = F.set_index('game_id').loc[G.index]
for c in ['roof', 'surface', 'home_qb_start', 'home_qb_new', 'away_qb_new']:
    x, y = G[c], F[c]
    m = ~((x.astype(str) == y.astype(str)) | (x.isna() & y.isna()))
    print(c, 'real differences (NaN==None treated equal):', int(m.sum()))
    if m.any():
        print(pd.DataFrame({'stored': x[m], 'fresh': y[m]}).head(5))
