"""Rank the candidate win indicators on 2003-2025 (out/team_games.parquet, from build.py), two ways.

IN THE GAME: what the winner did. For each game, which team won the stat (the better value for
the stat's own direction), and was that the team that won? The headline number is the
pick-the-winner rate: the share of games in which the team that won the stat won the game, a
stat tied between the two teams counted as a coin flip (half), so a stat that is often level
(turnovers) is not flattered by leaving its level games out. Beside it: how often it is level,
the winner's rate when it is not, its correlation with the final margin, and the same rate on
neutral snaps only (win probability 20-80%, outside the last two minutes of a half), which
shows the stats that only follow the score (rushing attempts, time of possession).

BEFORE THE GAME: what carries forward. Each team's season to date entering the game (its
offence's value less what its defence allowed, the plays pooled), from a team's fourth game on
(both teams with three games behind them), the team with the better number picked. Beside it: the
same against the closing line, which is what a model has to beat: a logistic regression of the
result on the closing spread, with and without the stat, fitted leaving one season out at a
time, and the change in log loss on the season left out (negative: the stat knows something the
line did not). Playoffs are in both lenses; a tie game is left out of both.

The direction of each stat (is more better?) is fixed by the in-game lens and used in both.

Run: python3 -I rank.py   (writes out/*.csv and results/*.csv, prints the tables)
"""
import os, sys, json

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import common  # noqa: E402

OUT = os.path.join(HERE, 'out')
RES = os.path.join(HERE, 'results')

# key, label, group, numerator, denominator (None: per game), note
# a numerator or denominator is a column or a sum of columns (a tuple), on the team's own row
STATS = [
    # efficiency, every snap
    ('epa_play', 'EPA per play', 'efficiency', 'epa', 'epa_n', ''),
    ('success', 'Success rate', 'efficiency', 'succ', 'epa_n', ''),
    ('ypp', 'Yards per play', 'efficiency', 'yds', 'snaps', ''),
    ('early_epa', 'Early-down EPA per play (1st & 2nd)', 'efficiency', 'early_epa', 'early_n', ''),
    ('early_succ', 'Early-down success rate', 'efficiency', 'early_succ', 'early_n', ''),
    ('expl_rate', 'Explosive-play rate (10+ run, 20+ catch)', 'efficiency', 'expl', 'snaps', ''),
    ('fd_play', 'First downs per snap', 'efficiency', 'fd_play', 'snaps', ''),
    ('d3_pct', 'Third-down conversion rate', 'efficiency', 'd3_conv', ('d3_conv', 'd3_fail'), ''),
    ('yds_drive', 'Yards per drive', 'efficiency', 'yds', 'drives', ''),
    ('rz_td_pct', 'Red-zone TD rate (TD trips / trips inside the 20)', 'efficiency', 'rz_tds', 'rz_trips', ''),
    ('three_out_rate', 'Three-and-out rate (drives)', 'efficiency', 'three_outs', 'drives', ''),
    # passing
    ('drop_epa', 'Dropback EPA per play', 'passing', 'drop_epa', 'drop_epa_n', ''),
    ('drop_succ', 'Dropback success rate', 'passing', 'drop_succ', 'drop_epa_n', ''),
    ('anya', 'ANY/A (adjusted net yards per attempt)', 'passing', None, None, 'has pass TDs in it'),
    ('nya', 'Net yards per pass attempt (sacks in)', 'passing', None, None, ''),
    ('ypa', 'Yards per pass attempt', 'passing', 'pyds', 'att', ''),
    ('rating', 'Passer rating', 'passing', None, None, 'has pass TDs in it'),
    ('comp_pct', 'Completion rate', 'passing', 'comp', 'att', ''),
    ('cpoe', 'Completion % over expected', 'passing', 'cpoe', 'cpoe_n', '2006 on'),
    ('int_rate', 'Interception rate', 'passing', 'int', 'att', ''),
    ('sack_rate', 'Sack rate (sacks / dropbacks)', 'passing', 'sacks', 'drop', ''),
    ('pass_yds', 'Net passing yards', 'passing', None, None, ''),
    ('qb_hits', 'QB hits taken', 'passing', 'qb_hits', None, '2006 on'),
    ('pass_rate', 'Pass rate (dropbacks / snaps)', 'passing', 'drop', 'snaps', ''),
    ('adot', 'Average depth of target', 'passing', 'air', 'air_n', '2006 on'),
    # rushing
    ('ypc', 'Yards per carry', 'rushing', 'ryds', 'rush', ''),
    ('drush_epa', 'Designed-run EPA per carry', 'rushing', 'drush_epa', 'drush_epa_n', ''),
    ('drush_succ', 'Designed-run success rate', 'rushing', 'drush_succ', 'drush_epa_n', ''),
    ('rush_att', 'Rushing attempts', 'rushing', 'rush', None, ''),
    ('rush_yds', 'Rushing yards', 'rushing', 'ryds', None, ''),
    # volume
    ('tot_yds', 'Total yards', 'volume', 'yds', None, ''),
    ('fds', 'First downs', 'volume', 'fd', None, ''),
    ('snaps', 'Offensive snaps', 'volume', 'snaps', None, ''),
    ('top', 'Time of possession', 'volume', 'top_s', None, ''),
    ('rz_trips', 'Red-zone trips', 'volume', 'rz_trips', None, ''),
    ('d4_att', 'Fourth-down attempts', 'volume', ('d4_conv', 'd4_fail'), None, ''),
    # turnovers
    ('to_margin', 'Turnover margin', 'turnovers', None, None, ''),
    ('ints', 'Interceptions thrown', 'turnovers', 'ints_all', None, ''),
    ('fum_lost', 'Fumbles lost', 'turnovers', 'fum_lost', None, ''),
    ('fumbles', 'Fumbles (lost or not)', 'turnovers', 'fumbles', None, ''),
    # sacks and pressure (taken; the gap makes it sacks made against sacks taken)
    ('sacks', 'Sacks taken', 'pressure', 'sacks', None, ''),
    ('tfl', 'Tackled for loss (snaps)', 'pressure', 'tfl', None, ''),
    # discipline
    ('pens', 'Penalties (accepted)', 'discipline', 'pens', None, ''),
    ('pen_yds', 'Penalty yards', 'discipline', 'pen_yds', None, ''),
    # field position and special teams
    ('start_pos', 'Average drive start (own yard line)', 'field position', 'start_sum', 'start_n', ''),
    ('st_epa', 'Special-teams EPA', 'special teams', 'st_epa_pos', None, ''),
    ('fg_pct', 'Field-goal rate', 'special teams', 'fg_made', 'fg_att', ''),
    ('punts', 'Punts', 'special teams', 'punts', None, ''),
    ('net_punt', 'Net punt average', 'special teams', 'punt_net', 'punts', ''),
    ('kick_ret', 'Kickoff return yards', 'special teams', 'kick_ret_yds', None, ''),
    ('punt_ret', 'Punt return yards', 'special teams', 'punt_ret_yds', None, ''),
]
# the stats only ever read before the game: the results so far
RESULTS = [
    ('pt_diff', 'Point differential per game', 'results', 'pts', None, ''),
    ('win_pct', 'Win rate', 'results', '_win', None, ''),
]
SPEC = {s[0]: s for s in STATS + RESULTS}
# the stats built on neutral snaps too (build.py's n_ prefix): the play-based ones
NEUTRAL = {'epa_play', 'success', 'ypp', 'early_epa', 'early_succ', 'expl_rate', 'fd_play', 'drop_epa',
           'drop_succ', 'anya', 'nya', 'ypa', 'rating', 'comp_pct', 'cpoe', 'int_rate', 'sack_rate',
           'pass_rate', 'ypc', 'drush_epa', 'drush_succ', 'rush_att', 'rush_yds', 'snaps', 'tot_yds', 'fds',
           'pass_yds', 'sacks', 'tfl', 'qb_hits', 'adot'}
# the stats that follow the score for a reason the neutral snaps cannot test
SCRIPT_REASON = {
    'top': 'a team ahead runs the clock',
    'd4_att': 'a team behind goes for it on fourth down',
    'kick_ret': 'a team receives a kickoff after the other team scores',
}
FROM_2006 = ('cpoe', 'qb_hits', 'adot')
# the stats built on nflfastR's expected points (EPA, and success, which is EPA above zero): the
# in-game forward selection is run a second time without them, on box-score stats alone, since EPA
# with special teams and penalties all but adds up to the score
EPA_BASED = ('epa_play', 'success', 'early_epa', 'early_succ', 'drop_epa', 'drop_succ', 'drush_epa',
             'drush_succ', 'st_epa')
SEASON_TO_DATE_MIN = 3     # games behind both teams before the pre-game lens reads them
ERA_SPLIT = 2013           # the two eras each rate is shown for: 2003-2013 and 2014-2025
STEPS = 8                  # the forward selection's steps


def col(t, c):
    if c is None:
        return pd.Series(1.0, index=t.index)
    if isinstance(c, tuple):
        return sum(t[x] for x in c)
    return t[c]


def parts(t, key, p=''):
    """(numerator, denominator) of a stat on the team's own rows; p='n_' for neutral snaps."""
    c = lambda name: t[p + name]
    one = pd.Series(1.0, index=t.index)
    if key == 'anya':
        return c('pyds') + 20 * c('ptd') - 45 * c('int') - c('sack_yds'), c('att') + c('sacks')
    if key == 'nya':
        return c('pyds') - c('sack_yds'), c('att') + c('sacks')
    if key == 'pass_yds':
        return c('pyds') - c('sack_yds'), one
    if key == 'to_margin':
        # the team's own value is minus its giveaways; the gap to the opponent is the margin
        return -(t['ints_all'] + t['fum_lost']), one
    num, den = SPEC[key][3], SPEC[key][4]
    if p:
        num = tuple(p + x for x in num) if isinstance(num, tuple) else p + num
        den = None if den is None else (tuple(p + x for x in den) if isinstance(den, tuple) else p + den)
    return col(t, num), col(t, den)


def rating(comp, att, yds, td, ints):
    """The NFL passer rating on totals."""
    comp, att, yds, td, ints = (np.asarray(x, float) for x in (comp, att, yds, td, ints))
    with np.errstate(divide='ignore', invalid='ignore'):
        a = np.clip((comp / att - 0.3) * 5, 0, 2.375)
        b = np.clip((yds / att - 3) * 0.25, 0, 2.375)
        c = np.clip(td / att * 20, 0, 2.375)
        d = np.clip(2.375 - ints / att * 25, 0, 2.375)
        r = (a + b + c + d) / 6 * 100
    return np.where(att > 0, r, np.nan)


RATING_COLS = ['comp', 'att', 'pyds', 'ptd', 'int']


def raw(t, key, p=''):
    """The pieces a stat is worked from, one row per team-game (summable over games)."""
    if key == 'rating':
        r = t[[p + x for x in RATING_COLS]].copy()
        r.columns = RATING_COLS
    else:
        num, den = parts(t, key, p)
        r = pd.DataFrame({'num': num, 'den': den}, index=t.index)
    if key in FROM_2006:
        r = r.where(t['season'] >= 2006)
    return r.astype(float)


def value(r, key):
    """The stat from its (summed) pieces."""
    if key == 'rating':
        return pd.Series(rating(*(r[x] for x in RATING_COLS)), index=r.index)
    with np.errstate(divide='ignore', invalid='ignore'):
        return r['num'] / r['den'].where(r['den'] > 0)


def game_value(t, key, p=''):
    return value(raw(t, key, p), key)


def paired(t):
    """Each game once, from the home side: the home row joined to the away row (same index)."""
    h = t[t['home'] == 1].set_index('game_id')
    a = t[t['home'] == 0].set_index('game_id').loc[h.index]
    return h, a


def pick_rate(gap, won):
    """Share of games the team on the better side of the gap won, a level stat counted half;
    how often level; the rate when not level; the number of games."""
    gap, won = np.asarray(gap, float), np.asarray(won, float)
    ok = ~np.isnan(gap)
    g, w = gap[ok], won[ok]
    if not len(g):
        return np.nan, np.nan, np.nan, 0
    score = np.where(g > 0, w, np.where(g < 0, 1 - w, 0.5))
    dec = g != 0
    when = np.where(g[dec] > 0, w[dec], 1 - w[dec]).mean() if dec.any() else np.nan
    return score.mean(), (g == 0).mean(), when, int(ok.sum())


# ---------------------------------------------------------------------------------------------
# the logistic regression, by Newton's method (a few columns, thousands of rows), and leave one
# season out

def fit_logit(X, y, ridge=1e-6):
    X = np.column_stack([np.ones(len(y)), X])
    b = np.zeros(X.shape[1])
    for _ in range(50):
        p = 1 / (1 + np.exp(-X @ b))
        W = p * (1 - p)
        H = X.T @ (X * W[:, None]) + ridge * np.eye(X.shape[1])
        step = np.linalg.solve(H, X.T @ (y - p) - ridge * b)
        b += step
        if np.abs(step).max() < 1e-9:
            break
    p = 1 / (1 + np.exp(-X @ b))
    H = X.T @ (X * (p * (1 - p))[:, None])
    return b, np.linalg.pinv(H)


def predict(b, X):
    return 1 / (1 + np.exp(-(np.column_stack([np.ones(len(X)), X]) @ b)))


def loso(X, y, seasons):
    """Each game's log loss and win chance from a fit on every other season."""
    X = np.asarray(X, float)
    X = X.reshape(len(y), 1) if X.ndim == 1 else X
    ll, pr = np.zeros(len(y)), np.zeros(len(y))
    for s in np.unique(seasons):
        tr, te = seasons != s, seasons == s
        b, _ = fit_logit(X[tr], y[tr])
        p = np.clip(predict(b, X[te]), 1e-9, 1 - 1e-9)
        pr[te] = p
        ll[te] = -(y[te] * np.log(p) + (1 - y[te]) * np.log(1 - p))
    return ll, pr


def block_boot(d, seasons, n=2000, seed=7):
    """A 90% interval for the mean of d, resampling whole seasons."""
    rng = np.random.default_rng(seed)
    ss = np.unique(seasons)
    by = {x: d[seasons == x] for x in ss}
    sums = np.array([by[x].sum() for x in ss])
    cnts = np.array([len(by[x]) for x in ss])
    idx = rng.integers(0, len(ss), (n, len(ss)))
    m = sums[idx].sum(1) / cnts[idx].sum(1)
    return np.percentile(m, 5), np.percentile(m, 95)


# ---------------------------------------------------------------------------------------------
# lens 1: in the game

def in_game(t):
    h, a = paired(t)
    keep = (h['home_score'] != h['away_score']).values
    h, a = h[keep], a[keep]
    won = (h['home_score'] > h['away_score']).astype(float).values
    margin = (h['home_score'] - h['away_score']).astype(float).values
    era = h['season'].values
    hr, ar = h.reset_index(), a.reset_index()
    rows, gaps = [], {}
    for key, label, group, _n, _d, note in STATS:
        gap = game_value(hr, key).values - game_value(ar, key).values
        sign = 1 if pick_rate(gap, won)[0] >= 0.5 else -1
        gap = sign * gap
        gaps[key] = gap
        r, level, when, n = pick_rate(gap, won)
        ok = ~np.isnan(gap)
        corr = np.corrcoef(gap[ok], margin[ok])[0, 1]
        per = [pick_rate(gap[era == s], won[era == s])[0] for s in np.unique(era) if (~np.isnan(gap[era == s])).any()]
        nr = np.nan
        if key in NEUTRAL:
            ng = sign * (game_value(hr, key, 'n_').values - game_value(ar, key, 'n_').values)
            nr = pick_rate(ng, won)[0]
        if key in SCRIPT_REASON:
            script = SCRIPT_REASON[key]
        elif not np.isnan(nr) and (nr - 0.5) < 0.5 * (r - 0.5):
            script = f'on neutral snaps it falls to {nr:.1%}'
        else:
            script = ''
        rows.append(dict(key=key, stat=label, group=group, better='more' if sign > 0 else 'fewer',
                         pick_rate=r, level=level, win_when_won=when, corr_margin=corr,
                         rate_early=pick_rate(gap[era <= ERA_SPLIT], won[era <= ERA_SPLIT])[0],
                         rate_late=pick_rate(gap[era > ERA_SPLIT], won[era > ERA_SPLIT])[0],
                         worst_season=min(per), best_season=max(per), neutral_rate=nr,
                         follows_score=script, games=n, note=note))
    out = pd.DataFrame(rows).sort_values('pick_rate', ascending=False).reset_index(drop=True)
    out.index += 1
    return out, gaps, won, era


def forward(cands, base, y, seasons, steps=STEPS):
    """Greedy forward selection on leave-one-season-out log loss: at each step the column that
    lowers it most, on top of `base` (None: an intercept alone)."""
    chosen, path = [], []
    cur = np.zeros((len(y), 0)) if base is None else base
    ll0, pr0 = loso(cur, y, seasons)
    path.append(dict(step=0, stat='(start)', logloss=ll0.mean(), pick_rate=((pr0 > .5) == (y == 1)).mean(), d_logloss_x1000=0.0,
                     d_lo_x1000=np.nan, d_hi_x1000=np.nan))
    prev = ll0
    for step in range(1, steps + 1):
        best = None
        for k, x in cands.items():
            if k in chosen:
                continue
            ll, pr = loso(np.column_stack([cur, x]), y, seasons)
            if best is None or ll.mean() < best[1].mean():
                best = (k, ll, pr)
        k, ll, pr = best
        lo, hi = block_boot(ll - prev, seasons)
        chosen.append(k)
        cur = np.column_stack([cur, cands[k]])
        path.append(dict(step=step, stat=k, logloss=ll.mean(), pick_rate=((pr > .5) == (y == 1)).mean(),
                         d_logloss_x1000=(ll - prev).mean() * 1000, d_lo_x1000=lo * 1000, d_hi_x1000=hi * 1000))
        prev = ll
    return pd.DataFrame(path)


def zs(x):
    x = np.asarray(x, float)
    z = (x - np.nanmean(x)) / np.nanstd(x)
    return np.where(np.isnan(z), 0.0, z)


# ---------------------------------------------------------------------------------------------
# lens 2: before the game

def own_allowed(t, key):
    """A stat's pieces for each team-game: the team's offence's (own) and its opponent's offence's
    in the same game (allowed: what this team's defence gave up)."""
    own = raw(t, key)
    by = own.set_index(pd.MultiIndex.from_arrays([t['game_id'], t['team']]))
    allowed = by.reindex(pd.MultiIndex.from_arrays([t['game_id'], t['opp']]))
    allowed.index = t.index
    return own, allowed


def season_to_date(t, key):
    """Each team's net value entering each game: its offence's, its plays pooled over the games
    before this one, less what its defence allowed over them; and how many games."""
    t = t.sort_values(['season', 'team', 'game_date', 'game_id'])
    own, allowed = own_allowed(t, key)
    keys = [t['season'], t['team']]
    o = own.groupby(keys).cumsum() - own.fillna(0)
    d = allowed.groupby(keys).cumsum() - allowed.fillna(0)
    net = value(o, key) - value(d, key)
    return pd.DataFrame({'game_id': t['game_id'], 'team': t['team'], 'net': net.values,
                         'n_before': t.groupby(keys).cumcount().values})


def split_half(t, key):
    """Split-half reliability: each team-season's regular season cut into its odd and even games,
    the net value of each half, and their correlation over the team-seasons (how much of the stat
    is the team and how much the week)."""
    r = t[t['season_type'] == 'REG'].sort_values(['season', 'team', 'game_date', 'game_id'])
    own, allowed = own_allowed(r, key)
    half = r.groupby(['season', 'team']).cumcount() % 2
    keys = [r['season'], r['team'], half]
    o, d = own.groupby(keys).sum(min_count=1), allowed.groupby(keys).sum(min_count=1)
    net = (value(o, key) - value(d, key)).unstack()
    net = net.dropna()
    return np.corrcoef(net[0], net[1])[0, 1]


def line_features(h):
    """The closing spread from the home side (nflverse: positive, the home team favoured), with a
    cubic term so the base is not a straight logistic in the spread."""
    s = h['spread_line'].astype(float).values
    return np.column_stack([s, s ** 3 / 1000])


def pre_game(t, direction):
    t = t.copy()
    t['_win'] = np.where(t['pts'] > t['opp_pts'], 1.0, np.where(t['pts'] == t['opp_pts'], 0.5, 0.0))
    h0, a0 = paired(t)
    keep = (h0['home_score'] != h0['away_score']) & h0['spread_line'].notna()
    h0, a0 = h0[keep], a0[keep]
    gid = h0.index
    won = (h0['home_score'] > h0['away_score']).astype(float).values
    seasons = h0['season'].values
    line = line_features(h0)
    nets, enough = {}, np.ones(len(gid), bool)
    for key in [s[0] for s in STATS + RESULTS]:
        sd = season_to_date(t, key).set_index(['game_id', 'team'])
        hv = sd.reindex(pd.MultiIndex.from_arrays([gid, h0['team']]))
        av = sd.reindex(pd.MultiIndex.from_arrays([gid, a0['team']]))
        sign = 1 if direction.get(key, 'more') == 'more' or key == 'to_margin' else -1
        nets[key] = sign * (hv['net'].values - av['net'].values)
        enough &= (hv['n_before'].values >= SEASON_TO_DATE_MIN) & (av['n_before'].values >= SEASON_TO_DATE_MIN)
    # the same games for every stat: both teams three games in (the 2006-on stats read NaN before)
    y, ss, L = won[enough], seasons[enough], line[enough]
    base_ll, base_pr = loso(L, y, ss)
    fav = pick_rate(np.sign(L[:, 0]), y)[0]
    rows = [dict(key='line', stat='The closing spread (the Vegas favourite)', group='market', pick_rate=fav,
                 level=(L[:, 0] == 0).mean(), logloss_alone=base_ll.mean(), games=int(len(y)))]
    for key, label, group, _n, _d, note in STATS + RESULTS:
        gap = nets[key][enough]
        ok = ~np.isnan(gap)
        r, level, when, n = pick_rate(gap[ok], y[ok])
        z = zs(gap[ok])
        alone, _ = loso(z, y[ok], ss[ok])
        b_ll, _ = loso(L[ok], y[ok], ss[ok])
        plus, _ = loso(np.column_stack([L[ok], z]), y[ok], ss[ok])
        dif = plus - b_ll
        lo, hi = block_boot(dif, ss[ok])
        b, cov = fit_logit(np.column_stack([L[ok], z]), y[ok])
        rows.append(dict(key=key, stat=label, group=group, pick_rate=r, level=level,
                         rate_early=pick_rate(gap[ok & (ss <= ERA_SPLIT)], y[ok & (ss <= ERA_SPLIT)])[0],
                         rate_late=pick_rate(gap[ok & (ss > ERA_SPLIT)], y[ok & (ss > ERA_SPLIT)])[0],
                         logloss_alone=alone.mean(), d_logloss_x1000=dif.mean() * 1000,
                         d_lo_x1000=lo * 1000, d_hi_x1000=hi * 1000,
                         z_with_line=b[-1] / np.sqrt(cov[-1, -1]), reliability=split_half(t, key),
                         games=n, note=note))
    out = pd.DataFrame(rows).sort_values('pick_rate', ascending=False).reset_index(drop=True)
    out.index += 1
    full = {k: v[enough] for k, v in nets.items()}
    return out, full, y, ss, L


def benchmarks(t):
    h, a = paired(t)
    h = h[h['home_score'] != h['away_score']]
    won = (h['home_score'] > h['away_score']).astype(float).values
    site = (h['location'] != 'Neutral').values
    sp = h['spread_line'].astype(float).values
    rest = (h['home_rest'] - h['away_rest']).astype(float).values
    s = h['season'].values
    return {
        'games': int(len(h)), 'ties_left_out': int((t.groupby('game_id')['pts'].first().index.size) - len(h)),
        'home_team_win_rate': float(won[site].mean()),
        'home_team_win_rate_2003_13': float(won[site & (s <= ERA_SPLIT)].mean()),
        'home_team_win_rate_2014_25': float(won[site & (s > ERA_SPLIT)].mean()),
        'closing_favourite_pick_rate': pick_rate(np.sign(sp), won)[0],
        'rest_edge_pick_rate': pick_rate(rest, won)[0],
        'rest_edge_level': float((rest == 0).mean()),
    }


def main():
    t = pd.read_parquet(os.path.join(OUT, 'team_games.parquet'))
    if t['season'].max() >= common.HOLDOUT_FROM or t['season'].min() < common.FIRST:
        raise SystemExit('the table holds seasons outside the study: rebuild it')
    os.makedirs(RES, exist_ok=True)
    pd.set_option('display.width', 250, 'display.max_columns', 30, 'display.max_colwidth', 44)

    ig, gaps, won, era = in_game(t)
    ig.to_csv(os.path.join(RES, 'in_game.csv'), float_format='%.4f', index_label='rank')
    print(ig[['stat', 'better', 'pick_rate', 'level', 'win_when_won', 'corr_margin', 'rate_early', 'rate_late',
              'worst_season', 'neutral_rate', 'follows_score', 'games']].round(3).to_string(), '\n')

    # which in-game stats are distinct: every season's, not following the score
    cands = {k: zs(g) for k, g in gaps.items()
             if k not in FROM_2006 and not ig.set_index('key').loc[k, 'follows_score']}
    for name, cs in (('in_game_forward', cands),
                     ('in_game_forward_box_score', {k: v for k, v in cands.items() if k not in EPA_BASED})):
        fw = forward(cs, None, won, era)
        fw['stat'] = fw['stat'].map(lambda k: SPEC[k][1] if k in SPEC else k)
        fw.to_csv(os.path.join(RES, name + '.csv'), float_format='%.5f', index=False)
        print(name); print(fw.round(4).to_string(), '\n')

    direction = dict(zip(ig['key'], ig['better']))
    pg, nets, y, ss, L = pre_game(t, direction)
    pg.to_csv(os.path.join(RES, 'pre_game.csv'), float_format='%.4f', index_label='rank')
    print(pg[['stat', 'pick_rate', 'rate_early', 'rate_late', 'logloss_alone', 'd_logloss_x1000', 'd_lo_x1000',
              'd_hi_x1000', 'z_with_line', 'reliability', 'games']].round(4).to_string(), '\n')

    cands = {k: zs(g) for k, g in nets.items() if k not in FROM_2006}
    for name, base in (('pre_game_forward', None), ('pre_game_forward_on_line', L)):
        fw = forward(cands, base, y, ss, steps=6)
        fw['stat'] = fw['stat'].map(lambda k: SPEC[k][1] if k in SPEC else k)
        fw.to_csv(os.path.join(RES, name + '.csv'), float_format='%.5f', index=False)
        print(name); print(fw.round(4).to_string(), '\n')

    bm = benchmarks(t)
    with open(os.path.join(RES, 'benchmarks.json'), 'w') as fh:
        json.dump(bm, fh, indent=1)
    print(json.dumps(bm, indent=1))


if __name__ == '__main__':
    main()
