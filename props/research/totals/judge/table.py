import os, numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = pd.read_pickle(os.path.join(TOT, 'out', 'judge', 'analysis.pkl'))
NAME = {'market': 'Market (closing total, no-vig P)', 'site': 'Site rule now (proxy)', 'ratings': 'ratings (fade, W=-0.25)',
        'efficiency': 'efficiency', 'residual': 'residual', 'simple': 'simple (wind)'}
def ci(t, nd, s=False):
    f = f'{{:+.{nd}f}}' if s else f'{{:.{nd}f}}'
    return '[' + f.format(t[0]) + ', ' + f.format(t[1]) + ']'
out = []
for per in ('2024-2025', '2026 wk1-5', '2024-2026'):
    sub = R[R.period == per]
    r0 = sub[sub.model == 'market'].iloc[0]
    out.append(f'### {per}: n={r0.n} games ({r0.n_graded} graded, pushes out); mean line {r0.mean_line:.2f}, mean total {r0.mean_total:.2f}, over rate {r0.over_rate:.3f}')
    out.append('A. Accuracy of the predicted total (90% bootstrap intervals, 10,000 paired game resamples; d = model minus market, negative = better)')
    out.append('| Model | MAE [90%] | dMAE vs market [90%] | RMSE [90%] | dRMSE [90%] | bias (mu - total) |')
    out.append('|---|---|---|---|---|---|')
    for _, r in sub.iterrows():
        d1 = '0' if r.model == 'market' else f'{r.mae_dmkt:+.3f} {ci(r.mae_dmkt_90, 3, True)}'
        d2 = '0' if r.model == 'market' else f'{r.rmse_dmkt:+.3f} {ci(r.rmse_dmkt_90, 3, True)}'
        out.append(f'| {NAME[r.model]} | {r.mae:.3f} {ci(r.mae_90, 2)} | {d1} | {r.rmse:.3f} {ci(r.rmse_90, 2)} | {d2} | {r.bias:+.2f} |')
    out.append('B. P(over) and picks (3-point edge over the price\'s own implied chance, at games.csv\'s real over/under odds; holdout odds are -110 median)')
    out.append('| Model | Brier [90%] | dBrier vs market [90%] | Log loss [90%] | dLogLoss [90%] | lean W-L | calib slope | picks W-L-P | units [90%] | units same picks at -110 |')
    out.append('|---|---|---|---|---|---|---|---|---|---|')
    for _, r in sub.iterrows():
        d1 = '0' if r.model == 'market' else f'{r.brier_dmkt:+.4f} {ci(r.brier_dmkt_90, 4, True)}'
        d2 = '0' if r.model == 'market' else f'{r.logloss_dmkt:+.4f} {ci(r.logloss_dmkt_90, 4, True)}'
        u = 'no bets' if r.bets == 0 else f'{r.units:+.2f} {ci(r.units_90, 2, True)}'
        u110 = 'no bets' if r.bets == 0 else f'{r.units110:+.2f}'
        out.append(f'| {NAME[r.model]} | {r.brier:.4f} {ci(r.brier_90, 4)} | {d1} | {r.logloss:.4f} {ci(r.logloss_90, 4)} | {d2} | {r.lean} | '
                   f'{r.calib_b:.2f} | {r.bets}: {r.record} | {u} | {u110} |')
    out.append('')
open(os.path.join(TOT, 'out', 'judge', 'table.txt'), 'w').write('\n'.join(out))
print('\n'.join(out))
