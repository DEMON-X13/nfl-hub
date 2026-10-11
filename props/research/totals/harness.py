"""The game-totals harness: walk-forward evaluation of a points (total) model against the market and
the site's current rule, with the 2024+ holdout locked.

A candidate is any module or object with
    fit(train_df)            -> model       train_df: every played game of the seasons BEFORE the test
                                            season (2010 on), outcomes included
    predict(model, test_df)  -> (mu, sd)    or (mu, sd, p_over); one value a game, in test_df's order.
                                            test_df has the outcome columns removed.
mu is the predicted game total, sd its spread; P(over) is 1 - Phi((line - mu)/sd) unless the candidate
returns its own p_over.

    import harness, mycandidate
    harness.evaluate(mycandidate)                         # dev: 2012-2023, each season fitted on those before
    harness.evaluate(harness.MARKET); harness.evaluate(harness.SITE)     # the baselines on their own
    harness.evaluate(mycandidate, holdout=True)           # ONLY the holdout step: 2024, 2025, 2026 so far

Every period prints, for the candidate and both baselines on the same games: MAE and RMSE of mu
against the final total; Brier and log loss of P(over) against the result (pushes dropped) beside
the market's no-vig chance from games.csv's over/under odds (50/50 where it has none); calibration
(deciles and a logistic slope/intercept); and the record and units of the over/under picks where
the chance beats the price's own implied chance (margin left in, the site's rule) by EDGE (3 points),
at the real odds where present, else -110; the same against the no-vig chance beside it. Bootstrap
90% intervals (games resampled) on every period run with bootstrap=True (the default on the holdout).

The lock: in dev mode the harness never loads a 2024+ row, and it refuses any 2024+ period unless
holdout=True. A holdout run is appended to out/holdout_log.txt with the candidate's source hash, so
a second look is on the record.
"""
import os, sys, json, time, hashlib, inspect, types, warnings
import numpy as np, pandas as pd
from math import erf, sqrt

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data', 'games.parquet')
OUTDIR = os.path.join(HERE, 'out')
LOCK = 2024                       # first locked season
DEV = list(range(2012, 2024))
HOLDOUT = [2024, 2025, 2026]
EDGE = 0.03
EST_PRICE = -110
SITE_SD = 13.2                    # the site's TOTAL_SD
OUTCOME_COLS = ['home_score', 'away_score', 'total', 'result', 'overtime']



def norm_cdf(z):
    from scipy.stats import norm
    return norm.cdf(z)


# ----------------------------------------------------------------------------- data
def load(holdout=False):
    G = pd.read_parquet(DATA)
    if not holdout:
        G = G[G.season < LOCK].copy()          # the locked seasons never enter memory in dev
    return G.reset_index(drop=True)


def american_to_prob(a):
    a = np.asarray(a, float)
    with np.errstate(divide='ignore', invalid='ignore'):
        return np.where(a < 0, -a / (-a + 100.0), 100.0 / (a + 100.0))


def american_payout(a):
    a = np.asarray(a, float)
    with np.errstate(divide='ignore', invalid='ignore'):
        return np.where(a < 0, 100.0 / -a, a / 100.0)


def p_over_normal(mu, sd, line):
    return 1.0 - norm_cdf((np.asarray(line, float) - np.asarray(mu, float)) / np.asarray(sd, float))


# ----------------------------------------------------------------------------- baselines
class _Market:
    """The posted total itself: mu = total_line, sd = the spread of (total - total_line) on the
    training seasons. Its chance of the over is the no-vig price (50/50 with no price)."""
    name = 'market'

    @staticmethod
    def fit(train):
        r = (train.total - train.total_line).dropna()
        return {'sd': float(r.std(ddof=1))}

    @staticmethod
    def predict(m, test):
        q = test.q_over_novig.fillna(0.5).to_numpy(float)
        return test.total_line.to_numpy(float), np.full(len(test), m['sd']), q


class _Site:
    """The site's current rule as far as it can be reproduced: modelPoints() (part2.js) with the
    shipped coefficients (props/data/pts_model.json, copied to data/site_pts_model.json; fitted by
    a script not in the repo, on seasons that may overlap these, so it has a possible in-sample
    edge, not a handicap), fed the app's own team EWMs rebuilt from play-by-play (offence span 6,
    defence span 8, regular season, carried across seasons as the app seeds them; they match the
    props research table props/raw/feat.pkl at corr >= 0.9996 on 2021-2023), each side clipped to
    3-45, the two summed, pulled halfway to the posted total, sd 13.2 (TOTAL_SD). Not refitted."""
    name = 'site'

    @staticmethod
    def fit(train):
        return None

    @staticmethod
    def predict(m, test):
        return test.site_mu.to_numpy(float), np.full(len(test), SITE_SD)


MARKET = _Market()
SITE = _Site()


# ----------------------------------------------------------------------------- metrics
def _picks(p, q, line, y, oo, uo, edge, novig=False):
    """One pick a game where the side's chance beats the price's implied chance (or, novig, the
    no-vig chance) by `edge`. Returns side (+1 over, -1 under, 0 none), price, units."""
    po = np.where(np.isfinite(oo) & (oo != 0), oo, EST_PRICE)
    pu = np.where(np.isfinite(uo) & (uo != 0), uo, EST_PRICE)
    if novig:
        bo, bu = q, 1 - q
    else:
        bo, bu = american_to_prob(po), american_to_prob(pu)
    eo, eu = p - bo, (1 - p) - bu
    side = np.where((eo >= edge) & (eo >= eu), 1, np.where(eu >= edge, -1, 0))
    price = np.where(side == 1, po, np.where(side == -1, pu, np.nan))
    win = ((side == 1) & (y > line)) | ((side == -1) & (y < line))
    push = (side != 0) & (y == line)
    loss = (side != 0) & ~win & ~push
    units = np.where(win, american_payout(np.nan_to_num(price, nan=-110)), np.where(loss, -1.0, 0.0))
    return side, price, units, win, loss, push


def _calib(p, o):
    """Deciles of p (quantile bins) and the logistic recalibration o ~ a + b*logit(p)."""
    if np.nanstd(p) < 1e-9:
        return None, (np.nan, np.nan)
    df = pd.DataFrame({'p': p, 'o': o})
    df['bin'] = pd.qcut(df.p.rank(method='first'), 10, labels=False)
    tab = df.groupby('bin').agg(n=('o', 'size'), mean_p=('p', 'mean'), freq=('o', 'mean')).reset_index(drop=True)
    try:
        import statsmodels.api as sm
        x = np.log(np.clip(p, 1e-6, 1 - 1e-6) / (1 - np.clip(p, 1e-6, 1 - 1e-6)))
        r = sm.Logit(o, sm.add_constant(x)).fit(disp=0)
        ab = (float(r.params[0]), float(r.params[1]))
    except Exception:
        ab = (np.nan, np.nan)
    return tab, ab


def metrics(df, mu_col, p_col, edge=EDGE):
    y = df.total.to_numpy(float); L = df.total_line.to_numpy(float)
    mu = df[mu_col].to_numpy(float); p = np.clip(df[p_col].to_numpy(float), 1e-6, 1 - 1e-6)
    q = df.q_mkt.to_numpy(float)
    nopush = y != L; o = (y > L).astype(float)
    e = mu - y
    m = {'n': len(df), 'mae': float(np.mean(np.abs(e))), 'rmse': float(np.sqrt(np.mean(e ** 2))),
         'bias': float(np.mean(e)), 'mean_mu': float(np.mean(mu)), 'mean_line': float(np.mean(L)),
         'mean_total': float(np.mean(y)), 'n_graded': int(nopush.sum()),
         'over_rate': float(o[nopush].mean())}
    pp, oo_, qq = p[nopush], o[nopush], np.clip(q[nopush], 1e-6, 1 - 1e-6)
    m['brier'] = float(np.mean((pp - oo_) ** 2))
    m['logloss'] = float(-np.mean(oo_ * np.log(pp) + (1 - oo_) * np.log(1 - pp)))
    m['brier_mkt'] = float(np.mean((qq - oo_) ** 2))
    m['logloss_mkt'] = float(-np.mean(oo_ * np.log(qq) + (1 - oo_) * np.log(1 - qq)))
    lean = pp != 0.5                                   # the side the chance leans to, every graded game
    m['fav_w'] = int(((pp > 0.5) == (oo_ == 1))[lean].sum()); m['fav_l'] = int(lean.sum()) - m['fav_w']
    tab, (a, b) = _calib(pp, oo_)
    m['calib_a'], m['calib_b'] = a, b
    m['calib_table'] = tab
    oo = df.over_odds.to_numpy(float); uo = df.under_odds.to_numpy(float)
    for tag, nv in (('', False), ('_nv', True)):
        side, price, units, win, loss, push = _picks(p, q, L, y, oo, uo, edge, novig=nv)
        nb = int((side != 0).sum())
        m['bets' + tag] = nb
        m['w' + tag], m['l' + tag], m['p' + tag] = int(win.sum()), int(loss.sum()), int(push.sum())
        m['units' + tag] = float(units.sum())
        m['roi' + tag] = float(units.sum() / nb) if nb else np.nan
        m['overs' + tag] = int((side == 1).sum())
        if tag == '':
            df = df.assign(**{'pick_' + p_col: side, 'price_' + p_col: price, 'units_' + p_col: units})
    m['_df'] = df
    return m


def bootstrap(df, cols, n_boot=2000, seed=0, edge=EDGE):
    """Games resampled with replacement; 90% intervals (5th, 95th percentiles) for each model's MAE,
    RMSE, Brier, log loss, units and ROI, and its paired differences from the market."""
    rng = np.random.default_rng(seed)
    y = df.total.to_numpy(float); L = df.total_line.to_numpy(float)
    q = np.clip(df.q_mkt.to_numpy(float), 1e-6, 1 - 1e-6)
    n = len(df); idx = rng.integers(0, n, size=(n_boot, n))
    nopush = (y != L).astype(float); o = (y > L).astype(float)
    def bri(p): return (p - o) ** 2 * nopush
    def ll(p): return -(o * np.log(p) + (1 - o) * np.log(1 - p)) * nopush
    npb = nopush[idx].sum(1)
    out = {}
    bm, lm = bri(q)[idx].sum(1) / npb, ll(q)[idx].sum(1) / npb
    aem = np.abs(L - y)[idx].mean(1)
    for name, (mu_c, p_c) in cols.items():
        mu = df[mu_c].to_numpy(float); p = np.clip(df[p_c].to_numpy(float), 1e-6, 1 - 1e-6)
        ae = np.abs(mu - y); se = (mu - y) ** 2
        u = df['units_' + p_c].to_numpy(float); bet = (df['pick_' + p_c].to_numpy() != 0).astype(float)
        b, l_ = bri(p)[idx].sum(1) / npb, ll(p)[idx].sum(1) / npb
        mae = ae[idx].mean(1)
        nb = bet[idx].sum(1); us = u[idx].sum(1)
        r = {'mae': mae, 'rmse': np.sqrt(se[idx].mean(1)), 'brier': b, 'logloss': l_,
             'mae_minus_mkt': mae - aem, 'brier_minus_mkt': b - bm, 'logloss_minus_mkt': l_ - lm,
             'units': us, 'roi': np.where(nb > 0, us / np.maximum(nb, 1), np.nan)}
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            out[name] = {k: (float(np.nanpercentile(v, 5)), float(np.nanpercentile(v, 95))) for k, v in r.items()}
    return out


# ----------------------------------------------------------------------------- evaluate
def _as_arrays(res, n):
    if isinstance(res, pd.DataFrame):
        mu, sd = res['mu'].to_numpy(float), res['sd'].to_numpy(float)
        p = res['p_over'].to_numpy(float) if 'p_over' in res else None
    else:
        mu, sd = np.asarray(res[0], float), np.broadcast_to(np.asarray(res[1], float), (n,)).astype(float)
        p = np.asarray(res[2], float) if len(res) > 2 and res[2] is not None else None
    if mu.shape != (n,) or sd.shape != (n,):
        raise ValueError(f'predict returned shapes {mu.shape}, {sd.shape}; expected ({n},)')
    if not (np.all(np.isfinite(mu)) and np.all(np.isfinite(sd)) and np.all(sd > 0)):
        raise ValueError('predict returned a non-finite mu or a non-positive sd')
    return mu, sd, p


def _source_hash(c):
    try:
        src = inspect.getsource(c if isinstance(c, types.ModuleType) else type(c))
    except Exception:
        src = repr(c)
    return hashlib.sha256(src.encode()).hexdigest()[:16]


def _fmt_row(label, m):
    rec = f"{m['w']}-{m['l']}-{m['p']}"
    return (f"  {label:<10s} n={m['n']:4d}  MAE {m['mae']:6.3f}  RMSE {m['rmse']:6.3f}  bias {m['bias']:+6.2f}  "
            f"Brier {m['brier']:.4f} (mkt {m['brier_mkt']:.4f})  LL {m['logloss']:.4f} (mkt {m['logloss_mkt']:.4f})  "
            f"calib a {m['calib_a']:+.2f} b {m['calib_b']:.2f}  lean {m['fav_w']}-{m['fav_l']}  picks {m['bets']:4d} {rec:>11s} "
            f"{m['units']:+7.2f}u ROI {m['roi']*100 if m['bets'] else float('nan'):+6.1f}%  "
            f"[no-vig edge: {m['bets_nv']} {m['w_nv']}-{m['l_nv']}-{m['p_nv']} {m['units_nv']:+.2f}u]")


def evaluate(candidate, periods=None, holdout=False, name=None, edge=EDGE, bootstrap_ci=None, n_boot=2000,
             seed=0, verbose=True, write_csv=True, game_types=None):
    periods = list(periods) if periods is not None else (HOLDOUT if holdout else DEV)
    locked = [s for s in periods if s >= LOCK]
    if locked and not holdout:
        raise PermissionError(f'seasons {locked} are the locked holdout: only the holdout step runs them, '
                              f'once, with holdout=True')
    name = name or getattr(candidate, 'name', None) or getattr(candidate, '__name__', 'candidate')
    G = load(holdout=holdout)
    if holdout and locked:
        os.makedirs(OUTDIR, exist_ok=True)
        with open(os.path.join(OUTDIR, 'holdout_log.txt'), 'a') as fh:
            fh.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')}\t{name}\t{_source_hash(candidate)}\tperiods={periods}\n")
    played = G.played & G.total_line.notna() & G.total.notna()
    if game_types is not None:
        played &= G.game_type.isin(game_types)
    rows = []
    for S in periods:
        train = G[(G.season < S) & G.played & G.total.notna()].copy()
        test = G[(G.season == S) & played].copy()
        if not len(test):
            continue
        if train.season.max() >= S or (not holdout and test.season.max() >= LOCK):
            raise AssertionError('walk-forward broken')
        blind = test.drop(columns=OUTCOME_COLS)
        res = {}
        for tag, c in (('cand', candidate), ('mkt', MARKET), ('site', SITE)):
            model = c.fit(train.copy())
            mu, sd, p = _as_arrays(c.predict(model, blind.copy()), len(test))
            if p is None:
                p = p_over_normal(mu, sd, test.total_line.to_numpy(float))
            res[tag] = (mu, sd, p)
        t = test[['game_id', 'season', 'week', 'game_type', 'home_team', 'away_team', 'total', 'total_line',
                  'over_odds', 'under_odds', 'q_over_novig', 'site_model_total']].copy()
        t['q_mkt'] = t.q_over_novig.fillna(0.5)
        for tag, (mu, sd, p) in res.items():
            t['mu_' + tag], t['sd_' + tag], t['p_' + tag] = mu, sd, p
        rows.append(t)
    D = pd.concat(rows, ignore_index=True)

    def block(df, label, boot):
        mc = metrics(df, 'mu_cand', 'p_cand', edge)
        ms = metrics(mc['_df'], 'mu_site', 'p_site', edge)
        mm = metrics(ms['_df'], 'mu_mkt', 'p_mkt', edge)
        out = {'period': label, 'candidate': mc, 'site': ms, 'market': mm,
               'site_model_alone_mae': float(np.mean(np.abs(df.site_model_total - df.total)))}
        if boot:
            out['ci90'] = bootstrap(mm['_df'], {'candidate': ('mu_cand', 'p_cand'), 'site': ('mu_site', 'p_site')},
                                    n_boot=n_boot, seed=seed, edge=edge)
        return out, mm['_df']

    results, frames = [], []
    span = f'{min(periods)}-{max(periods)}'
    h = len(periods) // 2
    pooled = [(span, D)] + ([(f'{periods[0]}-{periods[h-1]}', D[D.season <= periods[h-1]]),
                             (f'{periods[h]}-{periods[-1]}', D[D.season >= periods[h]])] if len(periods) >= 4 else [])
    seasons = [(str(s), D[D.season == s]) for s in periods if (D.season == s).any()]
    want_ci = bootstrap_ci if bootstrap_ci is not None else True
    for i, (label, sub) in enumerate(pooled + seasons):
        is_pooled = i < len(pooled)
        r, f = block(sub, label, want_ci and (is_pooled or holdout))
        r['pooled'] = is_pooled
        results.append(r)
        if label == span:
            frames.append(f)
    full = frames[0]
    if write_csv:
        os.makedirs(OUTDIR, exist_ok=True)
        path = os.path.join(OUTDIR, f"{name}_{'holdout' if holdout else 'dev'}.csv")
        keep = [c for c in full.columns if not c.startswith('_')]
        full[keep].to_csv(path, index=False)
    else:
        path = None
    if verbose:
        is_base = candidate is MARKET or candidate is SITE
        print(f"\n=== {name} | {'HOLDOUT' if holdout else 'dev walk-forward'} {span} | picks: edge >= {edge:.0%} over the "
              f"price's own chance (margin in), at real odds else {EST_PRICE}; [no-vig] = edge over the no-vig chance ===")
        def show(r):
            print(f"-- {r['period']}   (site model alone, before the pull to the line: MAE {r['site_model_alone_mae']:.3f})")
            if not is_base:
                print(_fmt_row(name[:10], r['candidate']))
            print(_fmt_row('site', r['site']))
            print(_fmt_row('market', r['market']))
            for k, ci in r.get('ci90', {}).items():
                if is_base and k == 'candidate':
                    continue
                print(f"     90% CI {k:<9s} " + '  '.join(f"{m} [{a:+.3f},{b:+.3f}]" if 'minus' in m or m in ('units', 'roi')
                                                     else f"{m} [{a:.3f},{b:.3f}]" for m, (a, b) in ci.items()))
        for r in results:
            if r['pooled'] or holdout:
                show(r)
        if not holdout:
            print('-- by season: MAE (cand / site / market) | Brier (cand / site / market no-vig) | picks units (cand / site)')
            for r in results:
                if r['pooled']:
                    continue
                c, si, m = r['candidate'], r['site'], r['market']
                print(f"   {r['period']}  n={c['n']:3d}  MAE {c['mae']:6.3f} {si['mae']:6.3f} {m['mae']:6.3f} | "
                      f"Brier {c['brier']:.4f} {si['brier']:.4f} {m['brier_mkt']:.4f} | "
                      f"{c['bets']:3d} bets {c['units']:+6.2f}u   {si['bets']:3d} bets {si['units']:+6.2f}u")
        tab = results[0]['candidate']['calib_table']
        if tab is not None:
            print(f'-- calibration of {name}, {span} (deciles of P(over); pushes dropped)')
            print('   ' + tab.round(3).to_string().replace('\n', '\n   '))
        if path:
            print('per-game CSV:', path)
    for r in results:
        for k in ('candidate', 'site', 'market'):
            r[k].pop('_df', None)
    return {'name': name, 'periods': periods, 'holdout': holdout, 'results': results, 'csv': path, 'games': full}


if __name__ == '__main__':
    # the two baselines on the dev period (the site rows and the market rows)
    evaluate(SITE, name='baselines', bootstrap_ci=True)
