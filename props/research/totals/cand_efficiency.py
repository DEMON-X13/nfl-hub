"""Candidate: efficiency. A points formula from opponent-adjusted efficiency, blended with the posted total.
FROZEN spec (chosen on the 2012-2023 walk-forward only; 16 variants tried, logged in eff/variants.log).

1. Ratings (eff/build_eff.py, ALPHA = 4, W_PREV = 0.4; file eff/features_a4_w0.4.parquet). For each game
   date, a weighted ridge over every team-game played on an EARLIER calendar date this season (weight 1)
   and every game of the previous season (weight 0.4):
       y = mu + h*home + o[offence] + d[defence],  ridge 4 (in games) on every o and d, mu and h free
   on nine stats: points scored, EPA a scrimmage play, success rate, explosive-play rate, scrimmage plays,
   dropback rate, red-zone TD rate, red-zone trips, giveaways (per-play stats weighted plays/62 a game,
   the red-zone TD rate trips/3.3). Teams are franchises; a neutral site has home 0.
2. Points per side. For a side's offence against the other side's defence, each stat's matchup value
       m_k = mu_k + o_k[offence] + d_k[defence] + h_k*home
   and pts_side = beta0 + sum_k beta_k * z(m_k) + beta_home * z(home)   (z = standardized on the
   training rows), OLS on every team-side row (regular season and playoffs) of the seasons before the
   one predicted (2010 on). model_total = pts_home + pts_away.
3. Blend with the market. mu = line + b * (model_total - line), b by least squares through the origin
   of (total - line) on (model_oos - line) over the training seasons 2011..S-1, where model_oos for a
   season s is the points model fitted only on 2010..s-1 (so b is learnt on honest predictions).
   sd = the spread of (total - line - b*(model_oos - line)) on the same games.
   P(over) = 1 - Phi((line - mu) / sd).

Inputs before kickoff only: the ratings use games on earlier dates (eff/asof_check_*.txt is the as-of
proof), the closing total is the market's number, and nothing else about the game is read.
"""
import os
import numpy as np, pandas as pd

name = 'cand_efficiency'
HERE = os.path.dirname(os.path.abspath(__file__))
RATINGS = os.path.join(HERE, 'data', 'eff', 'features_a4_w0.4.parquet')   # in the repo: eff/build_eff.py writes it under data/
STATS = ['pts', 'epa', 'sr', 'expl', 'plays', 'rz', 'rztrips', 'give', 'pass']
FIRST_TRAIN = 2010
OUTCOMES = {'total', 'home_score', 'away_score', 'result', 'overtime'}
_R = {}


def _ratings():
    if 'R' not in _R:
        _R['R'] = pd.read_parquet(RATINGS).set_index('game_id')
    return _R['R']


def _sides(df):
    """Home offence v away defence, away offence v home defence: the nine matchup values and home."""
    r = _ratings().loc[df.game_id.to_numpy()]
    neutral = df.location.to_numpy() == 'Neutral'
    out = []
    for sd, op in (('home', 'away'), ('away', 'home')):
        home = ((sd == 'home') & ~neutral).astype(float)
        X = pd.DataFrame({f'm_{k}': (r[f'e_mu_{k}'].to_numpy(float) + r[f'e_{sd}_o_{k}'].to_numpy(float) +
                                     r[f'e_{op}_d_{k}'].to_numpy(float) + r[f'e_h_{k}'].to_numpy(float) * home)
                          for k in STATS})
        X['home'] = home
        out.append(X)
    return out


def _fit_points(train):
    t = train[train.season >= FIRST_TRAIN]
    Xh, Xa = _sides(t)
    X = pd.concat([Xh, Xa], ignore_index=True)
    y = np.r_[t.home_score.to_numpy(float), t.away_score.to_numpy(float)]
    m, s = X.mean(), X.std().replace(0, 1)
    Z1 = np.c_[np.ones(len(X)), ((X - m) / s).to_numpy(float)]
    beta = np.linalg.lstsq(Z1, y, rcond=None)[0]
    return {'m': m, 's': s, 'beta': beta, 'cols': list(X.columns)}


def _model_total(pm, df):
    tot = 0.0
    for X in _sides(df):
        Z = ((X[pm['cols']] - pm['m']) / pm['s']).to_numpy(float)
        tot = tot + pm['beta'][0] + Z @ pm['beta'][1:]
    return tot


def fit(train):
    train = train[train.total.notna() & train.home_score.notna() & train.away_score.notna()]
    pm = _fit_points(train)
    t = train[train.total_line.notna()]
    xs, ys = [], []
    for s in sorted(t.season.unique()):
        if s <= FIRST_TRAIN:
            continue
        inner = _fit_points(train[train.season < s])
        te = t[t.season == s]
        L = te.total_line.to_numpy(float)
        xs.append(_model_total(inner, te) - L); ys.append(te.total.to_numpy(float) - L)
    x, y = np.concatenate(xs), np.concatenate(ys)
    b = float(np.dot(x, y) / np.dot(x, x))
    sd = float(np.std(y - b * x, ddof=1))
    return {'pm': pm, 'b': b, 'sd': sd, 'n_blend': int(len(x))}


def predict(M, test):
    assert not OUTCOMES & set(test.columns), 'an outcome column reached predict'
    L = test.total_line.to_numpy(float)
    model = _model_total(M['pm'], test)
    mu = np.where(np.isfinite(L), L + M['b'] * (model - L), model)
    return mu, np.full(len(test), M['sd'])
