"""Candidate: residual. A market-anchored totals model: start from the posted total and predict only
the residual (final total minus the line) from twelve pre-game features, under strong ridge shrinkage.

FROZEN spec (chosen on the 2012-2023 walk-forward only; 14 variants tried, logged in resid/variants.log;
this is variant 6, v_A_decay85).

1. Features (all known before kickoff; the twelve were named before any fit, from the brief's list):
     wind      game-time wind (mph) at an outdoor or open-roof stadium, capped at 25; 0 under a dome or
               closed roof; missing -> the training seasons' outdoor median
     indoor    roof dome or closed
     cold      max(40 - temp F, 0) outdoors (temp missing -> training outdoor median), else 0
     gap_pts   stats-implied total minus the line: (home pf + away pa + away pf + home pa) / 2 per game,
               each side's season to date blended with its last regular season, w = n/(n+4), minus line
     epa_env   home off EPA/play + away def EPA/play + away off + home def (same blend) - 4 x league EPA/play
               (league season to date blended with last season, w = n/(n+64) team-games)
     plays_env (home plays + away plays allowed + away plays + home plays allowed) / 2 per game, same
               blend, minus 2 x league plays per team-game (same league blend)
     qb_new    number of sides (0-2) whose starter (games.csv, the first passer to drop back) is not the
               passer with most dropbacks in that team's previous game
     short     the shorter rest of the two teams is 5 days or fewer (Thursday games)
     bye       number of sides with 13+ days of rest
     div       divisional game
     late      regular-season week 13 or later
     playoff   a playoff game
   Each is standardized (z) on the training rows. A missing value is set to the training mean (z = 0).
2. Residual model. y = total - total_line on every played game of the training seasons (2010 .. S-1,
   regular season and playoffs). Each season weighted 0.85^(S-1-season). Ridge on the z-features:
       minimize  sum_i w_i (y_i - a - z_i.b)^2 / sum_i w_i  +  lam * |b|^2
   lam picked from {0.003, 0.01, 0.03, 0.1, 0.3, 1, 3} by leave-one-season-out over the training
   seasons (mean absolute error of the held-out residuals), then refitted on all of them. The intercept
   is then reset to the weighted MEDIAN of y - z.b (totals land under the line slightly more often than
   over, while the mean residual is positive: the skew of totals), so mu is a median forecast.
3. mu = total_line + a + z.b ;  sd = weighted RMS of the training residuals y - a - z.b (about 13.2) ;
   P(over) = Phi((mu - line) / sd), the market's own juice tilt not used (it carried no information
   on the dev seasons and made the picks worse, variant 4).

Inputs before kickoff only: the season-to-date stats are the shared dataset's (games before this one,
leakage_check.txt). Two inputs are read at kickoff rather than before it, as games.csv records them:
the wind and temperature are the game-time readings (a live version would use the forecast a few hours
out), and the starting quarterback is the one who took the first snap (known when inactives post, 90
minutes before; the closing line is set after that).
"""
import numpy as np, pandas as pd
from scipy.stats import norm

name = 'cand_residual'
FEATURES = ['wind', 'indoor', 'cold', 'gap_pts', 'epa_env', 'plays_env', 'qb_new', 'short', 'bye', 'div',
            'late', 'playoff']
DECAY = 0.85
LAM_GRID = (0.003, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0)
WIND_CAP = 25.0
K_TEAM = 4.0            # games of last season in a team's blend
K_LEAGUE = 64.0         # team-games of last season in the league's blend
OUTDOOR = ('outdoors', 'open')
OUTCOMES = {'total', 'home_score', 'away_score', 'result', 'overtime'}


def _wmedian(x, w):
    o = np.argsort(x)
    x, w = x[o], w[o]
    cw = np.cumsum(w)
    return float(x[np.searchsorted(cw, 0.5 * cw[-1])])


def features(df, fills):
    """The twelve raw features, one row per game in df's order. fills: training outdoor medians."""
    X = pd.DataFrame(index=df.index)
    L = df.total_line.to_numpy(float)
    out = df.roof.isin(OUTDOOR).to_numpy()
    w = df.wind.to_numpy(float); w = np.where(np.isnan(w), fills['wind'], w)
    tp = df.temp.to_numpy(float); tp = np.where(np.isnan(tp), fills['temp'], tp)
    X['wind'] = np.minimum(np.where(out, w, 0.0), WIND_CAP)
    X['indoor'] = df.roof.isin(['dome', 'closed']).astype(float).to_numpy()
    X['cold'] = np.where(out, np.maximum(40.0 - tp, 0.0), 0.0)

    def team(side, stat):
        n = df[f'{side}_n_std'].to_numpy(float)
        s = df[f'{side}_{stat}_std'].to_numpy(float); l = df[f'{side}_{stat}_ls'].to_numpy(float)
        s = np.where(np.isnan(s), l, s); l = np.where(np.isnan(l), s, l)
        wt = n / (n + K_TEAM)
        return wt * s + (1 - wt) * l

    def league(stat):
        n = df.lg_n_std.to_numpy(float)
        s = df[f'lg_{stat}_std'].to_numpy(float); l = df[f'lg_{stat}_ls'].to_numpy(float)
        wt = np.where(np.isnan(n), 0.0, n / (n + K_LEAGUE))
        return np.where(np.isnan(s), l, wt * np.nan_to_num(s) + (1 - wt) * l)

    X['gap_pts'] = (team('home', 'pf_pg') + team('away', 'pa_pg') + team('away', 'pf_pg') + team('home', 'pa_pg')) / 2 - L
    X['epa_env'] = (team('home', 'off_epa') + team('away', 'def_epa') + team('away', 'off_epa') + team('home', 'def_epa')
                    - 4 * league('epa'))
    X['plays_env'] = ((team('home', 'plays_pg') + team('away', 'dplays_pg') + team('away', 'plays_pg') +
                       team('home', 'dplays_pg')) / 2 - 2 * league('plays'))
    X['qb_new'] = (df.home_qb_new.fillna(0) + df.away_qb_new.fillna(0)).astype(float).to_numpy()
    hr, ar = df.home_rest.to_numpy(float), df.away_rest.to_numpy(float)
    X['short'] = (np.fmin(hr, ar) <= 5).astype(float)
    X['bye'] = (hr >= 13).astype(float) + (ar >= 13).astype(float)
    X['div'] = df.div_game.fillna(0).astype(float).to_numpy()
    X['late'] = ((df.week >= 13) & (df.game_type == 'REG')).astype(float).to_numpy()
    X['playoff'] = (df.game_type != 'REG').astype(float).to_numpy()
    return X[FEATURES]


def _ridge(Z, y, w, lam):
    """Weighted ridge with a free intercept; returns b and the weighted-median intercept."""
    sw = w / w.sum()
    zm = sw @ Z
    ym = float(sw @ y)
    Zc, yc = Z - zm, y - ym
    A = (Zc * sw[:, None]).T @ Zc + lam * np.eye(Z.shape[1])
    b = np.linalg.solve(A, (Zc * sw[:, None]).T @ yc)
    return b, _wmedian(y - Z @ b, w)


def fit(train):
    t = train[train.total_line.notna() & train.total.notna()].reset_index(drop=True)
    S = int(t.season.max()) + 1                       # the season to be predicted
    out = t.roof.isin(OUTDOOR)
    fills = {'wind': float(t.wind[out].median()), 'temp': float(t.temp[out].median())}
    X = features(t, fills).to_numpy(float)
    xm = np.nanmean(X, 0)
    X = np.where(np.isnan(X), xm, X)
    xs = X.std(0); xs[xs == 0] = 1.0
    Z = (X - xm) / xs
    y = (t.total - t.total_line).to_numpy(float)
    seas = t.season.to_numpy()
    w = DECAY ** (S - 1 - seas)
    best = None
    for lam in LAM_GRID:
        err = []
        for v in np.unique(seas):
            tr, te = seas != v, seas == v
            b, a = _ridge(Z[tr], y[tr], w[tr], lam)
            err.append(np.abs(y[te] - a - Z[te] @ b))
        score = float(np.mean(np.concatenate(err)))
        if best is None or score < best[0] - 1e-12:
            best = (score, lam)
    lam = best[1]
    b, a = _ridge(Z, y, w, lam)
    res = y - a - Z @ b
    sd = float(np.sqrt(np.average(res ** 2, weights=w)))
    return {'season': S, 'lam': lam, 'a': a, 'b': b, 'xm': xm, 'xs': xs, 'fills': fills, 'sd': sd}


def predict(m, test):
    assert not OUTCOMES & set(test.columns), 'outcome leaked into predict'
    L = test.total_line.to_numpy(float)
    X = features(test, m['fills']).to_numpy(float)
    X = np.where(np.isnan(X), m['xm'], X)
    adj = m['a'] + ((X - m['xm']) / m['xs']) @ m['b']
    sd = np.full(len(test), m['sd'])
    return L + adj, sd, norm.cdf(adj / sd)


def coefficients(m):
    """Points per unit of each raw feature, and per training sd, for a fitted model."""
    return pd.DataFrame({'per_unit': m['b'] / m['xs'], 'per_sd': m['b'], 'train_sd': m['xs']}, index=FEATURES)
