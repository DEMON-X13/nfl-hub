#!/usr/bin/env python3
"""The evidence behind the preregistered blend weight w = 0.25 (PREREGISTRATION.md, "The blend weight"), from the
2021-2025 walk-forward predictions alone. No market line exists before 2026 and none is read here.

The blend the test scores is b = q + w (p - q): q the market's no-vig chance, p the model's. If the model and the
market were two unbiased forecasts of the outcome with error sds s_m (model) and s_k (market) and error correlation
rho, the weight on the model that minimises squared error is

    w* = (s_k^2 - rho s_k s_m) / (s_k^2 + s_m^2 - 2 rho s_k s_m),

which is at most 1/2 whenever s_k <= s_m (the market has every public input the model has, and more), whatever
rho is, and is 0 or below once the market's edge in accuracy a = s_k / s_m falls to rho. Neither a nor the
model-market rho can be measured without reading 2026. What 2021-2025 does show is how correlated the errors of
two box-score forecasters are: the frozen model's family (the walk-forward predictions of steps 2a and 2b) against
the trailing five-game mean, the free stand-in for a line, on the rows a book would post (book-like). This script
prints that rho and the model's RMSE as a share of the stand-in's, per stat, and solves w*(a) at the median rho for
the market sharpness a at which w* = 0.25 (the preregistered w), w* = 0.125 (below it the blend at 0.25 costs more
than it gains) and w* = 0.

    python3 -I w_choice.py --data DIR       writes results/w_choice.json
"""
import argparse, json, os, sys
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def wstar(a, rho):
    """the optimal weight on the model, market error sd a times the model's"""
    return (a * a - rho * a) / (a * a + 1 - 2 * rho * a)


def solve(target, rho):
    """the a in (rho, 1] with wstar(a, rho) = target (w* rises with a there)"""
    lo, hi = rho, 1.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if wstar(mid, rho) < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    a = ap.parse_args()
    rows = {}
    # counts: GBM_NB's mean against the trailing 5-game mean (rounded to the nearest half point), lineable rows
    P = pd.read_parquet(os.path.join(a.data, 'counts_walkforward_preds.parquet'))
    assert P.season.max() <= 2025

    def lineable(F, g, st):
        L = F.L_med.values
        if g == 'QB':
            m = F.starter.values == 1
            return m & (L >= 1.5) if st == 'carries' else m
        return L >= (4.5 if st == 'carries' else 1.5)
    for (g, st), F in P.groupby(['grp', 'stat']):
        X = F[lineable(F, g, st) & F.L_m5.notna()]
        em, es = X.y.values - X['GBM_NB__mean'].values, X.y.values - X.L_m5.values
        rows[f'{g}:{st}'] = {'n': int(len(X)), 'rho': float(np.corrcoef(em, es)[0, 1]),
                             'rmse_model_over_standin': float(np.sqrt(np.mean(em ** 2)) / np.sqrt(np.mean(es ** 2)))}
    # yards: qgbm's mean (of its 21 quantiles) against floor(trailing 5-game mean) + 0.5, book-like rows
    import model_yards as MY
    df = MY.load_table(os.path.join(a.data, 'features.parquet'))
    for st, S in MY.STATS.items():
        o = pd.concat([pd.read_parquet(os.path.join(a.data, 'yards_cache', f'{st}_{s}.parquet')) for s in MY.TEST_SEASONS])
        sub = df[df.grp.isin(S['groups'])][['pid', 'game_id', 'grp', S['y'], f'tr_mean_{st}', 'n_prev']]
        o = o.merge(sub, on=['pid', 'game_id', 'grp'], how='left')
        m = o[[f'q_{j}' for j in range(21)]].values.mean(1)
        bk = ((o[f'tr_mean_{st}'] >= o.grp.map(MY.BOOK_THR[st])) & (o.n_prev >= 3)).values
        y = o[S['y']].values
        L = np.floor(o[f'tr_mean_{st}'].values) + 0.5
        em, es = (y - m)[bk], (y - L)[bk]
        rows[st] = {'n': int(bk.sum()), 'rho': float(np.corrcoef(em, es)[0, 1]),
                    'rmse_model_over_standin': float(np.sqrt(np.mean(em ** 2)) / np.sqrt(np.mean(es ** 2)))}
    rhos = np.array([v['rho'] for v in rows.values()])
    rho = float(np.median(rhos))
    out = {'about': __doc__.split('\n')[0], 'by_stat': rows, 'rho_median': rho, 'rho_range': [float(rhos.min()), float(rhos.max())],
           'rmse_ratio_range': [float(min(v['rmse_model_over_standin'] for v in rows.values())),
                                float(max(v['rmse_model_over_standin'] for v in rows.values()))],
           'market_sharpness_a_at': {'w*=0.5': 1.0, 'w*=0.25': solve(0.25, rho), 'w*=0.125': solve(0.125, rho),
                                     'w*=0': rho},
           'note': 'a = the market error sd as a share of the model\'s; 1 - a is how much sharper the market is'}
    for k, v in rows.items():
        print(f"{k:24s} n {v['n']:6d}  rho {v['rho']:.3f}  model RMSE / stand-in {v['rmse_model_over_standin']:.3f}")
    print('median rho', round(rho, 3), 'market sharpness a at w*=0.25:', round(out['market_sharpness_a_at']['w*=0.25'], 4),
          'at w*=0.125:', round(out['market_sharpness_a_at']['w*=0.125'], 4), 'at w*=0:', round(rho, 4))
    with open(os.path.join(HERE, 'results', 'w_choice.json'), 'w') as f:
        json.dump(out, f, indent=1)


if __name__ == '__main__':
    main()
