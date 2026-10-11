"""POST-HOC (not part of the decision rule): the candidates on weeks 1-5 of 2024 and 2025, the slice of the
season 2026's 65 games come from, to see whether ratings' 2026 lead is an early-season effect or noise."""
import os, numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = pd.read_csv(os.path.join(TOT, 'out', 'holdout.csv'))
def brier(df, m):
    k = df.total != df.total_line; o = (df.total > df.total_line).astype(float)
    return float(((df[f'p_{m}'] - o) ** 2)[k].mean())
for label, df in (('2024 wk1-5', D[(D.season == 2024) & (D.week <= 5)]), ('2025 wk1-5', D[(D.season == 2025) & (D.week <= 5)]),
                  ('2024-25 wk1-5', D[(D.season < 2026) & (D.week <= 5)]), ('2024-25 wk6+', D[(D.season < 2026) & (D.week > 5)]),
                  ('2026 wk1-5', D[D.season == 2026])):
    out = []
    for m in ('market', 'site', 'ratings', 'efficiency', 'residual', 'simple'):
        mae = float(np.abs(df[f'mu_{m}'] - df.total).mean())
        out.append(f"{m} {mae:.2f}/{brier(df, m):.4f}/{df[f'units_{m}'].sum():+.1f}u")
    print(f'{label:14s} n={len(df):3d}  MAE/Brier/units: ' + '  '.join(out))
