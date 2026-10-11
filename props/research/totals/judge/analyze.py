"""Judge's analysis of the one holdout run (reads out/judge/holdout_run/*.parquet; runs no model).
Writes out/holdout.csv (one row a game, every model) and prints, per period (2024-2025, 2026, 2024-2026):
each model's MAE, RMSE, bias, Brier, log loss, lean record, calibration slope, picks record and units,
with paired bootstrap intervals (games resampled, 10,000 draws) at 90% and 97.5% for every metric and for
its difference from the market (and from the site).
Run: python3 -I judge/analyze.py   (from props/research/totals)
"""
import os, sys, warnings
import numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN = os.path.join(TOT, 'out', 'judge', 'holdout_run')
warnings.filterwarnings('ignore')
CANDS = {'ratings': 'cand_ratings', 'efficiency': 'cand_efficiency', 'residual': 'cand_residual', 'simple': 'cand_simple'}

frames = []
for tag in ('h2425', 'h2026'):
    base = None
    for key, mod in CANDS.items():
        g = pd.read_parquet(os.path.join(RUN, f'{mod}_{tag}.parquet'))
        if base is None:
            base = g[['game_id', 'season', 'week', 'game_type', 'home_team', 'away_team', 'total', 'total_line', 'over_odds',
                      'under_odds', 'q_mkt', 'site_model_total', 'mu_mkt', 'sd_mkt', 'p_mkt', 'pick_p_mkt', 'price_p_mkt',
                      'units_p_mkt', 'mu_site', 'sd_site', 'p_site', 'pick_p_site', 'price_p_site', 'units_p_site']].copy()
            base.columns = [c.replace('_p_mkt', '_market').replace('_p_site', '_site').replace('_mkt', '_market') if c != 'q_mkt' else c
                            for c in base.columns]
        else:
            # the baselines must be identical in every candidate's run
            for c in ('mu_mkt', 'p_mkt', 'mu_site', 'p_site'):
                assert np.allclose(g.set_index('game_id')[c].loc[base.game_id].to_numpy(), base[c.replace('_mkt', '_market')].to_numpy())
        gg = g.set_index('game_id').loc[base.game_id]
        for a, b in (('mu_cand', 'mu'), ('sd_cand', 'sd'), ('p_cand', 'p'), ('pick_p_cand', 'pick'), ('price_p_cand', 'price'),
                     ('units_p_cand', 'units')):
            base[f'{b}_{key}'] = gg[a].to_numpy()
    frames.append(base)
D = pd.concat(frames, ignore_index=True)
D = D.rename(columns={'q_mkt': 'p_market_novig'})
MODELS = ['market', 'site'] + list(CANDS)
for m in MODELS:
    if f'pick_{m}' in D:
        D[f'units110_{m}'] = np.where(D[f'pick_{m}'] == 0, 0.0,
                                      np.where(D.total == D.total_line, 0.0,
                                               np.where(((D[f'pick_{m}'] == 1) & (D.total > D.total_line)) |
                                                        ((D[f'pick_{m}'] == -1) & (D.total < D.total_line)), 100 / 110, -1.0)))
D['result'] = np.where(D.total > D.total_line, 'over', np.where(D.total < D.total_line, 'under', 'push'))
order = ['game_id', 'season', 'week', 'game_type', 'home_team', 'away_team', 'total', 'total_line', 'result', 'over_odds', 'under_odds',
         'p_market_novig', 'site_model_total']
for m in MODELS:
    order += [c for c in (f'mu_{m}', f'sd_{m}', f'p_{m}', f'pick_{m}', f'price_{m}', f'units_{m}', f'units110_{m}') if c in D]
D = D[order]
D.to_csv(os.path.join(TOT, 'out', 'holdout.csv'), index=False, float_format='%.6g')
print('wrote out/holdout.csv', D.shape)


def per_game(df, m):
    y = df.total.to_numpy(float); L = df.total_line.to_numpy(float)
    mu = df[f'mu_{m}'].to_numpy(float); p = np.clip(df[f'p_{m}'].to_numpy(float), 1e-6, 1 - 1e-6)
    np_ = (y != L).astype(float); o = (y > L).astype(float)
    return {'ae': np.abs(mu - y), 'se': (mu - y) ** 2, 'err': mu - y, 'bri': (p - o) ** 2 * np_, 'll': -(o * np.log(p) + (1 - o) * np.log(1 - p)) * np_,
            'np': np_, 'u': df[f'units_{m}'].to_numpy(float), 'u110': df[f'units110_{m}'].to_numpy(float),
            'bet': (df[f'pick_{m}'].to_numpy() != 0).astype(float)}


def stats(pg, idx=None):
    if idx is None:
        return {'mae': pg['ae'].mean(), 'rmse': np.sqrt(pg['se'].mean()), 'brier': pg['bri'].sum() / pg['np'].sum(),
                'logloss': pg['ll'].sum() / pg['np'].sum(), 'units': pg['u'].sum(), 'units110': pg['u110'].sum()}
    npb = pg['np'][idx].sum(1)
    return {'mae': pg['ae'][idx].mean(1), 'rmse': np.sqrt(pg['se'][idx].mean(1)), 'brier': pg['bri'][idx].sum(1) / npb,
            'logloss': pg['ll'][idx].sum(1) / npb, 'units': pg['u'][idx].sum(1), 'units110': pg['u110'][idx].sum(1)}


def logit_slope(p, o):
    import statsmodels.api as sm
    x = np.log(p / (1 - p))
    if np.std(x) < 1e-9:
        return np.nan, np.nan
    try:
        r = sm.Logit(o, sm.add_constant(x)).fit(disp=0)
        return float(r.params[0]), float(r.params[1])
    except Exception:
        return np.nan, np.nan


def q(v, lo, hi):
    return np.nanpercentile(v, lo), np.nanpercentile(v, hi)


B = 10000
rng = np.random.default_rng(20261011)
periods = [('2024-2025', D[D.season.isin([2024, 2025])]), ('2026 wk1-5', D[D.season == 2026]), ('2024-2026', D)]
rows = []
for label, df in periods:
    df = df.reset_index(drop=True)
    n = len(df); idx = rng.integers(0, n, size=(B, n))
    y = df.total.to_numpy(float); L = df.total_line.to_numpy(float); keep = y != L; o = (y > L).astype(float)
    PG = {m: per_game(df, m) for m in MODELS}
    BS = {m: stats(PG[m], idx) for m in MODELS}
    PT = {m: stats(PG[m]) for m in MODELS}
    for m in MODELS:
        p = np.clip(df[f'p_{m}'].to_numpy(float), 1e-6, 1 - 1e-6)
        lean = keep & (p != 0.5)
        w = int(((p > 0.5) == (o == 1))[lean].sum()); l_ = int(lean.sum()) - w
        a, b = logit_slope(p[keep], o[keep])
        pk = df[f'pick_{m}'].to_numpy()
        win = ((pk == 1) & (y > L)) | ((pk == -1) & (y < L)); push = (pk != 0) & (y == L); loss = (pk != 0) & ~win & ~push
        r = {'period': label, 'model': m, 'n': n, 'n_graded': int(keep.sum()), 'bias': PG[m]['err'].mean(), 'mean_mu': df[f'mu_{m}'].mean(),
             'lean': f'{w}-{l_}', 'calib_a': a, 'calib_b': b, 'bets': int((pk != 0).sum()), 'record': f'{int(win.sum())}-{int(loss.sum())}-{int(push.sum())}',
             'overs': int((pk == 1).sum()), 'mean_line': L.mean(), 'mean_total': y.mean(), 'over_rate': o[keep].mean()}
        for k in ('mae', 'rmse', 'brier', 'logloss', 'units', 'units110'):
            r[k] = PT[m][k]
            r[k + '_90'] = q(BS[m][k], 5, 95); r[k + '_975'] = q(BS[m][k], 1.25, 98.75)
            if m != 'market' and k in ('mae', 'rmse', 'brier', 'logloss'):
                d = BS[m][k] - BS['market'][k]
                r[k + '_dmkt'] = PT[m][k] - PT['market'][k]
                r[k + '_dmkt_90'] = q(d, 5, 95); r[k + '_dmkt_975'] = q(d, 1.25, 98.75)
                r[k + '_p_better'] = float((d < 0).mean())
            if m not in ('market', 'site') and k in ('mae', 'rmse', 'brier', 'logloss'):
                d = BS[m][k] - BS['site'][k]
                r[k + '_dsite'] = PT[m][k] - PT['site'][k]
                r[k + '_dsite_90'] = q(d, 5, 95)
        rows.append(r)
R = pd.DataFrame(rows)
R.to_pickle(os.path.join(TOT, 'out', 'judge', 'analysis.pkl'))


def f2(t, nd=3, sign=False):
    fmt = f'{{:+.{nd}f}}' if sign else f'{{:.{nd}f}}'
    return '[' + fmt.format(t[0]) + ', ' + fmt.format(t[1]) + ']'


for label, _ in periods:
    print(f'\n==== {label}')
    for _, r in R[R.period == label].iterrows():
        print(f"{r.model:10s} n={r.n} MAE {r.mae:.3f} {f2(r.mae_90)}  RMSE {r.rmse:.3f} {f2(r.rmse_90)}  bias {r.bias:+.2f}  "
              f"Brier {r.brier:.4f} {f2(r.brier_90, 4)}  LL {r.logloss:.4f} {f2(r.logloss_90, 4)}  lean {r.lean}  calib b {r.calib_b:.2f}  "
              f"picks {r.bets} {r.record} {r.units:+.2f}u {f2(r.units_90, 2, True)} (at -110: {r.units110:+.2f}u)")
        if r.model != 'market':
            print(f"{'':10s} vs market: dMAE {r.mae_dmkt:+.3f} 90 {f2(r.mae_dmkt_90, 3, True)} 97.5 {f2(r.mae_dmkt_975, 3, True)} | "
                  f"dRMSE {r.rmse_dmkt:+.3f} {f2(r.rmse_dmkt_90, 3, True)} | dBrier {r.brier_dmkt:+.4f} 90 {f2(r.brier_dmkt_90, 4, True)} "
                  f"97.5 {f2(r.brier_dmkt_975, 4, True)} | dLL {r.logloss_dmkt:+.4f} 90 {f2(r.logloss_dmkt_90, 4, True)} 97.5 {f2(r.logloss_dmkt_975, 4, True)}"
                  f" | P(better MAE) {r.mae_p_better:.2f} P(better Brier) {r.brier_p_better:.2f} | units 97.5 {f2(r.units_975, 2, True)}")
        if r.model not in ('market', 'site'):
            print(f"{'':10s} vs site:   dMAE {r.mae_dsite:+.3f} {f2(r.mae_dsite_90, 3, True)} | dBrier {r.brier_dsite:+.4f} {f2(r.brier_dsite_90, 4, True)} | "
                  f"dLL {r.logloss_dsite:+.4f} {f2(r.logloss_dsite_90, 4, True)}")
    r0 = R[(R.period == label) & (R.model == 'market')].iloc[0]
    print(f"   mean line {r0.mean_line:.2f}  mean total {r0.mean_total:.2f}  over rate (pushes out) {r0.over_rate:.3f}  graded {r0.n_graded}")
