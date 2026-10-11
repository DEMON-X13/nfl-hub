"""cand_simple: the posted total, nudged for wind. FROZEN 2026-10-11 (variant v12 of 20 specs tried on
the 2012-2023 walk-forward; see simple/variants.log). Never run on 2024+ while it was developed.

    w      = the wind at kickoff in mph for a game played in the open; 0 under any roof (dome, or a
             retractable stadium open or closed: games.csv's roof is anything but 'outdoors', and a
             blank roof, a retractable stadium before its state is recorded, counts as covered);
             an outdoor game with no wind on file takes w_fill, the training seasons' average
             outdoor wind (so it is moved only by the roof/no-roof difference)
    mu     = total_line + beta_w * (w - w_bar)
    sd     = the root-mean-square of (total - mu) on the training games
    P(over)= Phi((mu - total_line) / sd)

Refit every season on every played game (regular season and playoffs) of the seasons before it,
2010 on: beta_w is the least-squares slope of (total - total_line) on w with an intercept; the
intercept is dropped, so the market sets the level and only a game's wind relative to the
training games' average w_bar moves it. On the dev folds beta_w runs -0.08 (2012, fitted on
2010-2011) to -0.163 points a mph (2023, fitted on 2010-2022: w_bar 6.05, w_fill 8.42, sd 13.28),
so under the 2023 fit a covered game is +1.0 on the line, a 3 mph outdoor game +0.5, an outdoor
game with no wind on file -0.4, a 15 mph game -1.5 and a 20 mph game -2.3.

The wind is games.csv's game-time reading: known only roughly before kickoff. On the site it
would have to come from a forecast (nflverse fills wind only after a game is played), and the
dev numbers are an upper bound on what a forecast would give.
"""
import numpy as np
from scipy.stats import norm

name = 'cand_simple'


def _covered(df):
    return (df.roof.fillna('retractable') != 'outdoors').to_numpy()


def _wind(df, fill):
    w = df.wind.to_numpy(float)
    w = np.where(np.isnan(w), fill, w)
    return np.where(_covered(df), 0.0, w)


def fit(train):
    t = train[train.total_line.notna() & train.total.notna()]
    outdoor = t[~_covered(t)]
    fill = float(np.nanmean(outdoor.wind.to_numpy(float)))
    w = _wind(t, fill)
    y = t.total.to_numpy(float) - t.total_line.to_numpy(float)
    X = np.column_stack([np.ones(len(w)), w])
    c, beta = np.linalg.lstsq(X, y, rcond=None)[0]
    w_bar = float(w.mean())
    mu = t.total_line.to_numpy(float) + beta * (w - w_bar)
    sd = float(np.sqrt(np.mean((t.total.to_numpy(float) - mu) ** 2)))
    return {'beta_w': float(beta), 'w_bar': w_bar, 'w_fill': fill, 'sd': sd, 'n': int(len(t)),
            'seasons': (int(t.season.min()), int(t.season.max()))}


def predict(m, test):
    assert not {'total', 'home_score', 'away_score', 'result', 'overtime'} & set(test.columns)
    L = test.total_line.to_numpy(float)
    mu = L + m['beta_w'] * (_wind(test, m['w_fill']) - m['w_bar'])
    sd = np.full(len(test), m['sd'])
    p = norm.cdf((mu - L) / m['sd'])
    return mu, sd, p
