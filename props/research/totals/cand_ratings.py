"""cand_ratings: an independent points formula from opponent-adjusted team scoring ratings, blended with the
posted total. FROZEN SPEC (chosen on the 2012-2023 walk-forward only; never run on 2024+ before the holdout).

1. Ratings (a Kalman filter, i.e. a ridge regression whose prior moves with time). Every franchise
   (STL->LA, SD->LAC, OAK->LV) has an offence O and a defence D in points a game above the league level L:
       home points = L + O_home + D_away + 1.0 (0 at a neutral site) + e
       away points = L + O_away + D_home - 1.0 (0 at a neutral site) + e,       sd(e) = 9.7
   Games are taken one calendar date at a time: every game on a date is predicted from the state the
   earlier dates left, then that date's scores update it (both sides of every game jointly).
   Within a season O and D drift with variance 0.35^2 a week and L with 0.15^2 a week. At a new season
   O and D regress toward 0 by rho = 0.65 with stationary sd 3.6 (O) and 3.0 (D); L carries with added
   variance 1.2^2. The first training season (2010) starts from each franchise's previous regular season
   (the _ls columns): O = 0.65*0.65*(pf_pg_ls - lg_ppg_ls), D likewise from pa_pg_ls, L = lg_ppg_ls (sd 1.0).
   These nine constants were set a priori (not tuned); a maximum-likelihood refit each season was tried
   and did no better.
2. Calibration: a team's points = b0 + b1 * (its rated points), b0 and b1 by OLS on every team-game of the
   training seasons from 2011 on, each rated before its own date. The model total is the two sides' sum.
3. Blend with the market: mu = line + W * (model total - line), W = -0.25 (constant). W is the pooled OLS
   slope of (total - line) on (model total - line) over the 2012-2023 walk-forward predictions (-0.238,
   se 0.088), rounded to 0.05. W is NEGATIVE: on dev every positive weight on the ratings made the posted
   total worse, and the only blend that beat it fades the ratings (the market leans toward past scoring
   more than results bear out). As a convex blend (0 <= W <= 1) the best weight on dev is 0: the line.
4. Spread: sd = the standard deviation (ddof 1) of (total - mu) over the training seasons from 2011 on,
   refit each season. P(over) = 1 - Phi((line - mu) / sd).

Information: training seasons use their real scores (fit sees seasons before the test season only). In
the test season no outcome is read: each team's points for and against in its k-th game are read back from
its NEXT row's season-to-date averages (pf_pg_std * n_std and pa_pg_std * n_std, differenced), which hold
only games before that row (the leakage proof), and a score updates the ratings only for games on a LATER
calendar date than its own. A season's last game for both teams cannot be read back and is skipped (it can
only touch playoff games, by at most 0.15 points on dev). Columns read: schedule (season, kickoff, date,
teams, neutral), total_line (the market's number, in the blend only), *_pf_pg_std, *_pa_pg_std, *_n_std,
*_pf_pg_ls, *_pa_pg_ls, lg_ppg_ls.
"""
import numpy as np, pandas as pd
from scipy.stats import norm

name = 'cand_ratings'

FR = {'STL': 'LA', 'SD': 'LAC', 'OAK': 'LV'}
OUTCOME = ['home_score', 'away_score', 'total', 'result', 'overtime']
TEAMS = sorted({'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND',
                'JAX', 'KC', 'LA', 'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF',
                'TB', 'TEN', 'WAS'})
TI = {t: i for i, t in enumerate(TEAMS)}
NT = len(TEAMS); IL = 2 * NT; NS = 2 * NT + 1

# the frozen constants
SIGMA, SD_O, SD_D, RHO = 9.7, 3.6, 3.0, 0.65
Q_WEEK, QL_WEEK, SD_L0, SD_L_SEASON = 0.35, 0.15, 1.0, 1.2
HOME, AWAY = 1.0, 1.0
SEED_REL = 0.65
FIT_FROM = 2011          # first training season used for the calibration, W's sd
W = -0.25


def fr(t):
    return FR.get(t, t)


def recover_scores(test):
    """Points for each side of each game, read back from the teams' next rows (NaN when neither team has one)."""
    t = test.reset_index(drop=True)
    parts = []
    for side in ('home', 'away'):
        n = t[f'{side}_n_std'].astype(float).to_numpy()
        parts.append(pd.DataFrame({
            'i': np.arange(len(t)), 'side': side, 'season': t.season.to_numpy(), 'kickoff': t.kickoff.to_numpy(),
            'team': t[f'{side}_team'].map(fr).to_numpy(), 'n': n,
            'cpf': np.nan_to_num(t[f'{side}_pf_pg_std'].astype(float).to_numpy()) * n,
            'cpa': np.nan_to_num(t[f'{side}_pa_pg_std'].astype(float).to_numpy()) * n}))
    d = pd.concat(parts, ignore_index=True).sort_values(['season', 'team', 'kickoff'])
    g = d.groupby(['season', 'team'])
    pf = (g.cpf.shift(-1) - d.cpf).to_numpy(); pa = (g.cpa.shift(-1) - d.cpa).to_numpy()
    ok = ((g.n.shift(-1) - d.n) == 1).to_numpy()
    hp = np.full(len(t), np.nan); ap = np.full(len(t), np.nan)
    for i, side, a, b, good in zip(d.i.to_numpy(), d.side.to_numpy(), pf, pa, ok):
        if not good:
            continue
        if side == 'home':
            hp[i], ap[i] = a, b
        else:
            ap[i], hp[i] = a, b
    return np.round(hp, 6), np.round(ap, 6)


def _seed(first):
    x = np.zeros(NS); P = np.zeros((NS, NS))
    s = RHO * SEED_REL
    lg = float(first.lg_ppg_ls.dropna().iloc[0])
    seen = set()
    for side in ('home', 'away'):
        for team, pf, pa in first[[f'{side}_team', f'{side}_pf_pg_ls', f'{side}_pa_pg_ls']].itertuples(index=False):
            k = TI[fr(team)]
            if k in seen or not np.isfinite(pf):
                continue
            seen.add(k)
            x[k] = s * (pf - lg); x[NT + k] = s * (pa - lg)
    P[np.arange(NT), np.arange(NT)] = SD_O ** 2 * (1 - s * RHO * SEED_REL)
    P[NT + np.arange(NT), NT + np.arange(NT)] = SD_D ** 2 * (1 - s * RHO * SEED_REL)
    x[IL] = lg; P[IL, IL] = SD_L0 ** 2
    return x, P


def rate(games, state=None):
    """Run the filter over games (sorted by kickoff; hp/ap the scores, NaN = not known). Returns the rated
    points of each side, made before the game's date, and the end state."""
    g = games.reset_index(drop=True)
    hi = g.home_team.map(lambda t: TI[fr(t)]).to_numpy(); ai = g.away_team.map(lambda t: TI[fr(t)]).to_numpy()
    neu = g.neutral.to_numpy(int); season = g.season.to_numpy(int)
    day = pd.to_datetime(g.date).to_numpy().astype('datetime64[D]').astype(np.int64)
    yh = g.hp.to_numpy(float); ya = g.ap.to_numpy(float)
    if state is None:
        x, P = _seed(g[g.season == season[0]])
        last_season, last_day = season[0], day[0]
    else:
        x, P, last_season, last_day = state['x'].copy(), state['P'].copy(), state['season'], state['day']
    V0 = np.r_[np.full(NT, SD_O ** 2), np.full(NT, SD_D ** 2)]
    od = np.arange(2 * NT)
    ph = np.empty(len(g)); pa = np.empty(len(g))
    bounds = np.flatnonzero(np.r_[True, day[1:] != day[:-1], True])
    for b0, b1 in zip(bounds[:-1], bounds[1:]):
        idx = np.arange(b0, b1)
        sz, dz = season[b0], day[b0]
        if sz != last_season:
            A = np.r_[np.full(2 * NT, RHO), 1.0]
            P = P * A[:, None] * A[None, :]; x = x * A
            P[od, od] += (1 - RHO ** 2) * V0
            P[IL, IL] += SD_L_SEASON ** 2
        else:
            wk = max(dz - last_day, 0) / 7.0
            P[od, od] += Q_WEEK ** 2 * wk
            P[IL, IL] += QL_WEEK ** 2 * wk
        last_season, last_day = sz, dz
        m = len(idx)
        H = np.zeros((2 * m, NS)); off = np.zeros(2 * m)
        for k, j in enumerate(idx):
            H[2 * k, hi[j]] = 1; H[2 * k, NT + ai[j]] = 1; H[2 * k, IL] = 1
            H[2 * k + 1, ai[j]] = 1; H[2 * k + 1, NT + hi[j]] = 1; H[2 * k + 1, IL] = 1
            off[2 * k] = HOME * (1 - neu[j]); off[2 * k + 1] = -AWAY * (1 - neu[j])
        yhat = H @ x + off
        ph[idx] = yhat[0::2]; pa[idx] = yhat[1::2]
        y = np.empty(2 * m); y[0::2] = yh[idx]; y[1::2] = ya[idx]
        ok = np.isfinite(y)
        if ok.any():
            Ho = H[ok]; r = y[ok] - yhat[ok]
            PHt = P @ Ho.T
            S = Ho @ PHt + SIGMA ** 2 * np.eye(len(r))
            K = np.linalg.solve(S, PHt.T).T
            x = x + K @ r
            P = P - K @ PHt.T
            P = 0.5 * (P + P.T)
    return ph, pa, {'x': x, 'P': P, 'season': last_season, 'day': last_day}


def fit(train):
    tr = train[train.played & train.home_score.notna()].sort_values(['kickoff', 'game_id']).reset_index(drop=True)
    tr['hp'] = tr.home_score.astype(float); tr['ap'] = tr.away_score.astype(float)
    ph, pa, state = rate(tr)
    sel = (tr.season >= FIT_FROM).to_numpy()
    X = np.r_[ph[sel], pa[sel]]; y = np.r_[tr.hp.to_numpy()[sel], tr.ap.to_numpy()[sel]]
    b = np.linalg.lstsq(np.c_[np.ones(len(X)), X], y, rcond=None)[0]
    model = 2 * b[0] + b[1] * (ph + pa)
    f = sel & tr.total_line.notna().to_numpy()
    L = tr.total_line.to_numpy(float)[f]
    resid = tr.total.to_numpy(float)[f] - (L + W * (model[f] - L))
    return {'state': state, 'b': b, 'sd': float(np.std(resid, ddof=1))}


def model_total(m, test):
    assert not set(OUTCOME) & set(test.columns), 'an outcome column reached predict'
    t = test.reset_index(drop=True)
    order = np.argsort(t.kickoff.to_numpy(), kind='stable')
    ts = t.iloc[order].reset_index(drop=True).copy()
    ts['hp'], ts['ap'] = recover_scores(ts)
    ph, pa, _ = rate(ts, m['state'])
    tot = np.empty(len(t)); tot[order] = 2 * m['b'][0] + m['b'][1] * (ph + pa)
    return tot


def predict(m, test):
    t = test.reset_index(drop=True)
    L = t.total_line.to_numpy(float)
    mu = L + W * (model_total(m, t) - L)
    sd = np.full(len(t), m['sd'])
    return mu, sd, 1 - norm.cdf((L - mu) / sd)
