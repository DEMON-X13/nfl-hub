"""Judge: each frozen module, run now on dev (2012-2023), reproduces the per-game dev CSV its author reported."""
import os, sys
import numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TOT)
import harness as H
import cand_ratings, cand_efficiency, cand_residual, cand_simple
for c, f in ((cand_ratings, 'out/cand_ratings_dev.csv'), (cand_efficiency, 'out/cand_efficiency_dev.csv'),
             (cand_residual, 'out/cand_residual_dev.csv'), (cand_simple, 'out/cand_simple_dev.csv')):
    r = H.evaluate(c, write_csv=False, verbose=False, bootstrap_ci=False)
    g = r['games'].set_index('game_id'); d = pd.read_csv(os.path.join(TOT, f)).set_index('game_id').loc[g.index]
    m = r['results'][0]['candidate']
    print(f"{c.name}: {len(g)} games, max|d mu| {np.max(np.abs(g.mu_cand - d.mu_cand)):.1e}, max|d p| {np.max(np.abs(g.p_cand - d.p_cand)):.1e}; "
          f"dev MAE {m['mae']:.3f} Brier {m['brier']:.4f} picks {m['bets']} {m['units']:+.2f}u")
