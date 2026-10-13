"""Rank the candidate win indicators on 2003-2025 (out/team_games.parquet and out/qb_games.parquet,
from build.py), two ways. Playoffs are in both; a tie game is left out of both.

IN THE GAME: what the winner did. For each game, which team won the stat (the better value for
the stat's own direction), and was that the team that won? The headline number is the
pick-the-winner rate: the share of games in which the team that won the stat won the game, a
stat level between the two teams counted as a coin flip (half), so a stat that is often level
(turnovers) is not flattered by leaving its level games out. Beside it: how often it is level,
the winner's rate when it is not, its correlation with the final margin, and the same rate on
neutral snaps only (win probability 20-80%, outside the last two minutes of a half). A stat
"follows the score" (a team ahead runs and kneels, a team behind throws and goes for it) when its
edge over a coin flip on neutral snaps is less than half its edge on a random set of snaps as
large (fewer snaps alone cost a stat some edge), or for a reason the neutral snaps cannot test
(SCRIPT_REASON); those are kept in the table and kept out of the top 15 and of the forward
selections, in the game and before it.

BEFORE THE GAME: what carries forward, on the games where both teams have three games behind them
that season (weeks 1-3 have a table of their own). Each team's season to date entering the game,
its offence's value less what its defence allowed (the plays pooled over the games before; never
the game itself), the team with the better number picked. Beside it: a season-block interval on
that rate; the log loss of a logistic regression on the stat alone (fitted leaving one season out
at a time, scored on the season left out); the same against the closing line, which is what a
model has to beat (the closing spread with a cubic term, with and without the stat, the change in
log loss on the season left out and a 90% interval from resampling whole seasons; the stat's sign
on top of the line says whether it would be followed or faded; and what the best of the candidates
finds there by chance, from shuffles); and split-half reliability (each
team-season's odd games against its even games, how much of the stat is the team and how much the
week), with its full-season value (Spearman-Brown). Then the indicators that are not a season to
date of one stat: an Elo rating carried across seasons, opponent-adjusted point differential
(SRS), point differential blended with last season, and the starting quarterback's own recent
EPA. Their constants are fixed in advance, never tuned here (each says where it comes from).

The direction of each stat (is more better?) is fixed by the in-game lens and used in both.

Run: python3 -I rank.py   (from research/win_indicators; writes results/, prints the tables)
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
    ('epa_play', 'EPA per play', 'efficiency', 'epa', 'epa_n', 'built on expected points: scoring plays in it'),
    ('epa_ntd', 'EPA per play, touchdown plays left out', 'efficiency', 'epa_ntd', 'epa_ntd_n',
     'every touchdown play out, the defence\'s returns too'),
    ('success', 'Success rate', 'efficiency', 'succ', 'epa_n', ''),
    ('ypp', 'Yards per play', 'efficiency', 'yds', 'snaps', ''),
    ('early_epa', 'Early-down EPA per play (1st & 2nd)', 'efficiency', 'early_epa', 'early_n', ''),
    ('early_succ', 'Early-down success rate', 'efficiency', 'early_succ', 'early_n', ''),
    ('expl_rate', 'Explosive-play rate (10+ run, 20+ catch)', 'efficiency', 'expl', 'snaps', ''),
    ('fd_play', 'First downs per snap', 'efficiency', 'fd_play', 'snaps', ''),
    ('dsr', 'Drive success rate (sets of downs that earn a first down or TD)', 'efficiency', 'dsr', 'dsr_n', ''),
    ('d3_pct', 'Third-down conversion rate', 'efficiency', 'd3_conv', ('d3_conv', 'd3_fail'), ''),
    ('yds_drive', 'Yards per drive', 'efficiency', 'yds', 'drives', ''),
    ('rz_td_pct', 'Red-zone TD rate (TD trips / trips inside the 20)', 'efficiency', 'rz_tds', 'rz_trips', ''),
    ('three_out_rate', 'Three-and-out rate (drives)', 'efficiency', 'three_outs', 'drives', ''),
    # passing
    ('drop_epa', 'Dropback EPA per play', 'passing', 'drop_epa', 'drop_epa_n', 'built on expected points'),
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
    ('st_epa', 'Special-teams EPA', 'special teams', 'st_epa_pos', None, 'built on expected points'),
    ('fg_pct', 'Field-goal rate', 'special teams', 'fg_made', 'fg_att', ''),
    ('punts', 'Punts', 'special teams', 'punts', None, ''),
    ('net_punt', 'Net punt average', 'special teams', 'punt_net', 'punts', 'a blocked punt is a punt of no yards'),
    ('kick_ret', 'Kickoff return yards', 'special teams', 'kick_ret_yds', None, ''),
    ('punt_ret', 'Punt return yards', 'special teams', 'punt_ret_yds', None, ''),
]
# the results so far, only ever read before a game
RESULTS = [
    ('pt_diff', 'Point differential per game', 'results', 'pts', None, ''),
    ('win_pct', 'Win rate', 'results', '_win', None, ''),
    ('ppd', 'Points per drive', 'results', 'pts', 'drives', 'every point a team scored, over its drives'),
    ('pythag', 'Pythagorean win expectation (points, exponent 2.37)', 'results', None, None, ''),
]
SPEC = {s[0]: s for s in STATS + RESULTS}
# worked out on their own (special_gaps), before the game only
SPECIAL = [
    ('elo', 'Elo rating, carried across seasons', 'ratings',
     "FiveThirtyEight's published NFL Elo (their nfl-elo-game code): K 20, their margin multiplier, home field 65 "
     '(none at a neutral site), a third back to 1505 each season; games.csv from 1999 so 2003 starts warm; the gap '
     'shown leaves home field out'),
    ('srs', 'Opponent-adjusted point differential (SRS)', 'ratings',
     "this season's margins solved for every team's rating and home field together, the ratings pulled to 0 by "
     'a ridge of 3 games'),
    ('pt_blend', 'Point differential blended with last season', 'ratings',
     "(n x this season's + 4 x 2/3 x last season's) / (n + 4), n this season's games; last season's from games.csv"),
    ('qb', "Starting QB: his own EPA per dropback over his last 16 games", 'quarterback',
     "games.csv's starter (the lead passer where he took no dropback); his dropbacks for any team in his 16 games "
     'before this one, from 1999 on, pulled toward -0.10 with 200 dropbacks of weight (a new starter reads about '
     'replacement level)'),
]
# last season's values, for the weeks 1-3 table
LAST = [
    ('last_pt_diff', "Last season's point differential per game", 'last season', ''),
    ('last_epa_play', "Last season's EPA per play (net)", 'last season', '2004 on'),
    ('last_drop_epa', "Last season's dropback EPA per play (net)", 'last season', '2004 on'),
]
LABEL = {**{s[0]: s[1] for s in STATS + RESULTS + SPECIAL}, **{s[0]: s[1] for s in LAST}}
NOTE = {**{s[0]: s[5] for s in STATS + RESULTS}, **{s[0]: s[3] for s in SPECIAL + LAST}}
GROUP = {**{s[0]: s[2] for s in STATS + RESULTS + SPECIAL}, **{s[0]: s[2] for s in LAST}}

# the stats built on neutral snaps too (build.py's n_ prefix): the play-based ones
NEUTRAL = {'epa_play', 'epa_ntd', 'success', 'ypp', 'early_epa', 'early_succ', 'expl_rate', 'fd_play', 'dsr',
           'drop_epa', 'drop_succ', 'anya', 'nya', 'ypa', 'rating', 'comp_pct', 'cpoe', 'int_rate', 'sack_rate',
           'pass_rate', 'ypc', 'drush_epa', 'drush_succ', 'rush_att', 'rush_yds', 'snaps', 'tot_yds', 'fds',
           'pass_yds', 'sacks', 'tfl', 'qb_hits', 'adot', 'ints', 'fum_lost', 'to_margin'}
# the stats that follow the score for a reason the neutral snaps cannot test
SCRIPT_REASON = {
    'top': 'a team ahead runs the clock',
    'd4_att': 'a team behind goes for it on fourth down',
    'kick_ret': 'a team receives a kickoff after the other team scores',
    'start_pos': 'a team scored on starts its next drive from a kickoff',
    'rush_yds': 'its edge is the carries, which follow the score: yards per carry alone picks 56%',
}
FROM_2006 = ('cpoe', 'qb_hits', 'adot')
# the stats built on nflfastR's expected points (EPA, and success, which is EPA above zero): the
# in-game forward selection is run a second time without them, on box-score stats alone, since EPA
# with special teams and penalties all but adds up to the score
EPA_BASED = ('epa_play', 'epa_ntd', 'success', 'early_epa', 'early_succ', 'drop_epa', 'drop_succ', 'drush_epa',
             'drush_succ', 'st_epa')
SEASON_TO_DATE_MIN = 3     # games behind both teams before the main pre-game table reads them
NULL_RUNS = 40             # shuffles for what the first step on top of the line finds by chance
ERA_SPLIT = 2013           # the two eras each rate is shown for: 2003-2013 and 2014-2025
STEPS = 8                  # the in-game forward selection's steps (pre-game: 6)
TOP = 15

# fixed in advance (SPECIAL says where each comes from)
ELO_K, ELO_HOME, ELO_REVERT, ELO_MEAN, ELO_FIRST = 20.0, 65.0, 1 / 3, 1505.0, 1999
SRS_RIDGE = 3.0
BLEND_GAMES, BLEND_KEEP = 4.0, 2 / 3
QB_GAMES, QB_PRIOR, QB_WEIGHT = 16, -0.10, 200.0
PYTHAG = 2.37


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
        return -(t[p + 'ints_all'] + t[p + 'fum_lost']), one
    if key == 'pythag':
        return t['pts'], one
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


LEVEL = 1e-9    # a gap this close to zero is level (two equal season-to-date values differ in the last bits)


def level0(gap):
    gap = np.asarray(gap, float)
    return np.where(np.abs(gap) < LEVEL, 0.0, gap)


def scores(gap, won):
    """Each game's score for the side the gap favours: 1 if it won, 0 if it lost, a half if level."""
    gap, won = level0(gap), np.asarray(won, float)
    return np.where(gap > 0, won, np.where(gap < 0, 1 - won, 0.5))


def pick_rate(gap, won):
    """Share of games the team on the better side of the gap won, a level stat counted half;
    how often level; the rate when not level; the number of games."""
    gap, won = level0(gap), np.asarray(won, float)
    ok = ~np.isnan(gap)
    g, w = gap[ok], won[ok]
    if not len(g):
        return np.nan, np.nan, np.nan, 0
    dec = g != 0
    when = np.where(g[dec] > 0, w[dec], 1 - w[dec]).mean() if dec.any() else np.nan
    return scores(g, w).mean(), (g == 0).mean(), when, int(ok.sum())


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
    sums = np.array([d[seasons == x].sum() for x in ss])
    cnts = np.array([(seasons == x).sum() for x in ss])
    idx = rng.integers(0, len(ss), (n, len(ss)))
    m = sums[idx].sum(1) / cnts[idx].sum(1)
    return np.percentile(m, 5), np.percentile(m, 95)


def zs(x):
    x = np.asarray(x, float)
    z = (x - np.nanmean(x)) / np.nanstd(x)
    return np.where(np.isnan(z), 0.0, z)


def forward(cands, base, y, seasons, steps):
    """Greedy forward selection on leave-one-season-out log loss: at each step the column that
    lowers it most, on top of `base` (None: an intercept alone, which carries home field)."""
    chosen, path = [], []
    cur = np.zeros((len(y), 0)) if base is None else base
    ll0, pr0 = loso(cur, y, seasons)
    path.append(dict(step=0, key='', stat='(start: home field alone)' if base is None else '(start: the closing spread)',
                     logloss=ll0.mean(), pick_rate=((pr0 > .5) == (y == 1)).mean(), d_logloss_x1000=0.0,
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
        path.append(dict(step=step, key=k, stat=LABEL.get(k, k), logloss=ll.mean(), pick_rate=((pr > .5) == (y == 1)).mean(),
                         d_logloss_x1000=(ll - prev).mean() * 1000, d_lo_x1000=lo * 1000, d_hi_x1000=hi * 1000))
        prev = ll
    return pd.DataFrame(path)


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
        nr = rr = np.nan
        if key in NEUTRAL:
            ng = sign * (game_value(hr, key, 'n_').values - game_value(ar, key, 'n_').values)
            nr = pick_rate(ng, won)[0]
            rg = sign * (game_value(hr, key, 'r_').values - game_value(ar, key, 'r_').values)
            rr = pick_rate(rg, won)[0]
        if key in SCRIPT_REASON:
            script = SCRIPT_REASON[key]
        elif not np.isnan(nr) and (nr - 0.5) < 0.5 * (rr - 0.5):
            script = f'on neutral snaps it falls to {nr:.1%} (on as many random snaps {rr:.1%})'
        else:
            script = ''
        rows.append(dict(key=key, stat=label, group=group, better='more' if sign > 0 else 'fewer',
                         pick_rate=r, level=level, win_when_won=when, corr_margin=corr,
                         rate_early=pick_rate(gap[era <= ERA_SPLIT], won[era <= ERA_SPLIT])[0],
                         rate_late=pick_rate(gap[era > ERA_SPLIT], won[era > ERA_SPLIT])[0],
                         worst_season=min(per), best_season=max(per), neutral_rate=nr, random_rate=rr,
                         follows_score=script, games=n, note=note))
    out = pd.DataFrame(rows).sort_values('pick_rate', ascending=False).reset_index(drop=True)
    out.index += 1
    return out, gaps, won, era


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


def net_of(o, d, key):
    """(net, offence, defence) from pooled pieces; defence is minus what was allowed, so higher is
    better for a stat where more is better."""
    if key == 'pythag':
        pf, pa = o['num'].values ** PYTHAG, d['num'].values ** PYTHAG
        with np.errstate(divide='ignore', invalid='ignore'):
            v = np.where(pf + pa > 0, pf / (pf + pa), np.nan)
        return pd.Series(v, index=o.index), pd.Series(np.nan, index=o.index), pd.Series(np.nan, index=o.index)
    ov, dv = value(o, key), value(d, key)
    return ov - dv, ov, -dv


def season_to_date(t, key):
    """Each team's values entering each game: its offence's, its plays pooled over the games before
    this one that season, less what its defence allowed over them; and how many games."""
    t = t.sort_values(['season', 'team', 'game_date', 'game_id'])
    own, allowed = own_allowed(t, key)
    keys = [t['season'], t['team']]
    o = own.groupby(keys).cumsum() - own.fillna(0)
    d = allowed.groupby(keys).cumsum() - allowed.fillna(0)
    net, off, dfn = net_of(o, d, key)
    return pd.DataFrame({'game_id': t['game_id'].values, 'team': t['team'].values, 'net': net.values,
                         'off': off.values, 'def': dfn.values, 'n_before': t.groupby(keys).cumcount().values})


def season_whole(t, key):
    """Each team-season's net value over all its games (last season's, for the next one)."""
    own, allowed = own_allowed(t, key)
    keys = [t['season'], t['team']]
    o, d = own.groupby(keys).sum(min_count=1), allowed.groupby(keys).sum(min_count=1)
    return net_of(o, d, key)[0]


def split_half(t, key):
    """Split-half reliability: each team-season's regular season cut into its odd and even games,
    the net value of each half, and their correlation over the team-seasons."""
    r = t[t['season_type'] == 'REG'].sort_values(['season', 'team', 'game_date', 'game_id'])
    own, allowed = own_allowed(r, key)
    half = r.groupby(['season', 'team']).cumcount() % 2
    keys = [r['season'], r['team'], half]
    o, d = own.groupby(keys).sum(min_count=1), allowed.groupby(keys).sum(min_count=1)
    net = net_of(o, d, key)[0].unstack().dropna()
    return np.corrcoef(net[0], net[1])[0, 1]


def games_mapped(first):
    g = common.games(first).copy()
    for c in ('home_team', 'away_team'):
        g[c] = g[c].replace(common.TEAM_NOW)
    return g[g['home_score'].notna()].sort_values(['gameday', 'gametime', 'game_id'], na_position='first')


def elo_pre():
    """Each game's Elo ratings before it (home, away), FiveThirtyEight's NFL formula, from 1999."""
    elo, cur, out = {}, None, {}
    for r in games_mapped(ELO_FIRST).itertuples():
        if r.season != cur:
            elo = {k: ELO_MEAN + (v - ELO_MEAN) * (1 - ELO_REVERT) for k, v in elo.items()}
            cur = r.season
        eh, ea = elo.get(r.home_team, 1500.0), elo.get(r.away_team, 1500.0)
        out[r.game_id] = (eh, ea)
        diff = eh - ea + (0.0 if r.location == 'Neutral' else ELO_HOME)
        p = 1 / (1 + 10 ** (-diff / 400))
        m = r.home_score - r.away_score
        s = 1.0 if m > 0 else 0.0 if m < 0 else 0.5
        wdiff = diff if m > 0 else -diff
        mult = np.log(max(abs(m), 1) + 1) * 2.2 / (1.0 if m == 0 else wdiff * 0.001 + 2.2)
        shift = ELO_K * mult * (s - p)
        elo[r.home_team], elo[r.away_team] = eh + shift, ea - shift
    return out


def srs_pre(h, a):
    """Each game's SRS gap: this season's games before its date, margins solved for the ratings and
    home field together, the ratings pulled to 0 by a ridge."""
    out = {}
    df = pd.DataFrame({'season': h['season'].values, 'date': h['game_date'].values, 'ht': h['team'].values,
                       'at': a['team'].values, 'm': (h['home_score'] - h['away_score']).astype(float).values,
                       'site': (h['location'] != 'Neutral').astype(float).values}, index=h.index)
    for s, gs in df.groupby('season'):
        teams = sorted(set(gs['ht']) | set(gs['at']))
        ix = {x: i for i, x in enumerate(teams)}
        n = len(teams)
        hi, ai = gs['ht'].map(ix).values, gs['at'].map(ix).values
        X = np.zeros((len(gs), n + 1))
        X[np.arange(len(gs)), hi] = 1
        X[np.arange(len(gs)), ai] = -1
        X[:, n] = gs['site'].values
        pen = np.diag(np.r_[np.full(n, SRS_RIDGE), 0.0])
        for d in sorted(gs['date'].unique()):
            before = (gs['date'] < d).values
            today = (gs['date'] == d).values
            if before.sum() == 0:
                b = np.zeros(n + 1)
            else:
                Xb = X[before]
                b = np.linalg.solve(Xb.T @ Xb + pen, Xb.T @ gs['m'].values[before])
            for gid, x, y in zip(gs.index[today], hi[today], ai[today]):
                out[gid] = b[x] - b[y]
    return out


def qb_pre(t):
    """Each team-game's starter (games.csv) and his EPA per dropback over his QB_GAMES games before
    this one, any team, any season, pulled toward QB_PRIOR with QB_WEIGHT dropbacks; and whether
    the starter differs from the team's previous game's."""
    q = pd.read_parquet(os.path.join(OUT, 'qb_games.parquet'))
    dates = common.games(common.WARMUP[0]).set_index('game_id')['gameday']     # the warm-up seasons' games too
    q['date'] = q['game_id'].map(dates)
    if q['date'].isna().any():
        raise SystemExit(f'qb_games has games games.csv does not date: {q.loc[q.date.isna(), "game_id"].unique()[:5]}')
    q = q.groupby(['passer_id', 'date', 'game_id'], as_index=False)[['dropbacks', 'epa']].sum()
    q = q.sort_values(['passer_id', 'date', 'game_id'])
    hist = {pid: (g['date'].values, np.r_[0, g['epa'].cumsum().values], np.r_[0, g['dropbacks'].cumsum().values])
            for pid, g in q.groupby('passer_id')}
    vals = np.full(len(t), np.nan)
    for i, (pid, date) in enumerate(zip(t['qb_id'].values, t['game_date'].values)):
        e, n = 0.0, 0.0
        if isinstance(pid, str) and pid in hist:
            ds, ce, cn = hist[pid]
            j = np.searchsorted(ds, date, side='left')          # his games strictly before this date
            k = max(0, j - QB_GAMES)
            e, n = ce[j] - ce[k], cn[j] - cn[k]
        vals[i] = (e + QB_PRIOR * QB_WEIGHT) / (n + QB_WEIGHT)
    s = t[['game_id', 'team', 'season', 'game_date', 'qb_id']].copy()
    s['qb'] = vals
    s = s.sort_values(['team', 'game_date', 'game_id'])
    prev = s.groupby('team')['qb_id'].shift(1)
    s['qb_change'] = (prev.notna() & (prev != s['qb_id'])).astype(float)
    return s.set_index(['game_id', 'team'])


def special_gaps(t, h, a, std_pt):
    """The pre-game indicators that are not a season to date of one stat, home minus away, on h's
    games; and whether either side's starter changed since its last game."""
    gid = h.index
    out = {}
    elo = elo_pre()
    e = np.array([elo[g] if g in elo else (np.nan, np.nan) for g in gid], float)
    out['elo'] = e[:, 0] - e[:, 1]
    srs = srs_pre(*paired(t))                   # fitted on every game, ties too; read on h's
    out['srs'] = np.array([srs.get(g, np.nan) for g in gid])
    # last season's point differential per game, its regular season, from games.csv (2002 on)
    g = games_mapped(common.FIRST - 1)
    g = g[g['game_type'] == 'REG']
    m = pd.concat([pd.DataFrame({'season': g['season'], 'team': g['home_team'], 'm': g['home_score'] - g['away_score']}),
                   pd.DataFrame({'season': g['season'], 'team': g['away_team'], 'm': g['away_score'] - g['home_score']})])
    last = m.groupby(['season', 'team'])['m'].mean()
    lh = last.reindex(pd.MultiIndex.from_arrays([h['season'].values - 1, h['team'].values])).values
    la = last.reindex(pd.MultiIndex.from_arrays([h['season'].values - 1, a['team'].values])).values
    out['last_pt_diff'] = lh - la
    # blended with this season's
    sh = std_pt.reindex(pd.MultiIndex.from_arrays([gid, h['team']]))
    sa = std_pt.reindex(pd.MultiIndex.from_arrays([gid, a['team']]))

    def blend(s, l):
        n = s['n_before'].values
        this = np.nan_to_num(s['net'].values)
        return (n * this + BLEND_GAMES * BLEND_KEEP * np.nan_to_num(l)) / (n + BLEND_GAMES)
    out['pt_blend'] = blend(sh, lh) - blend(sa, la)
    # last season's EPA and dropback EPA, its regular season (the play-by-play starts in 2003, so from 2004)
    for key in ('epa_play', 'drop_epa'):
        w = season_whole(t[t['season_type'] == 'REG'], key)
        wh = w.reindex(pd.MultiIndex.from_arrays([h['season'].values - 1, h['team'].values])).values
        wa = w.reindex(pd.MultiIndex.from_arrays([h['season'].values - 1, a['team'].values])).values
        out['last_' + key] = wh - wa
    qb = qb_pre(t)
    qh = qb.reindex(pd.MultiIndex.from_arrays([gid, h['team']]))
    qa = qb.reindex(pd.MultiIndex.from_arrays([gid, a['team']]))
    out['qb'] = qh['qb'].values - qa['qb'].values
    change = ((qh['qb_change'].values + qa['qb_change'].values) > 0)
    return out, change


def line_features(spread):
    """The closing spread from the home side (nflverse: positive, the home team favoured), with a
    cubic term so the base is not a straight logistic in the spread."""
    s = np.asarray(spread, float)
    return np.column_stack([s, s ** 3 / 1000])


def evaluate(gap, y, ss, L, with_line=True):
    """One indicator on one set of games: its pick rate (and a season-block interval), log loss
    alone, and what it adds to the closing line."""
    ok = ~np.isnan(gap)
    g, yy, s, LL = gap[ok], y[ok], ss[ok], L[ok]
    r, level, when, n = pick_rate(g, yy)
    lo, hi = block_boot(scores(g, yy), s)
    z = zs(g)
    alone, _ = loso(z, yy, s)
    row = dict(pick_rate=r, pick_lo=lo, pick_hi=hi, level=level,
               rate_early=pick_rate(g[s <= ERA_SPLIT], yy[s <= ERA_SPLIT])[0],
               rate_late=pick_rate(g[s > ERA_SPLIT], yy[s > ERA_SPLIT])[0],
               logloss_alone=alone.mean(), games=n)
    if with_line:
        base, _ = loso(LL, yy, s)
        plus, _ = loso(np.column_stack([LL, z]), yy, s)
        dif = plus - base
        dlo, dhi = block_boot(dif, s)
        b, cov = fit_logit(np.column_stack([LL, z]), yy)
        zz = b[-1] / np.sqrt(cov[-1, -1])
        reads = ('follow it' if zz > 0 else 'fade it') if dhi < 0 else 'nothing'
        row.update(d_logloss_x1000=dif.mean() * 1000, d_lo_x1000=dlo * 1000, d_hi_x1000=dhi * 1000,
                   z_with_line=zz, on_top_of_line=reads)
    return row


def pre_game(t, direction, flagged):
    t = t.copy()
    t['_win'] = np.where(t['pts'] > t['opp_pts'], 1.0, np.where(t['pts'] == t['opp_pts'], 0.5, 0.0))
    h0, a0 = paired(t)
    keep = (h0['home_score'] != h0['away_score']) & h0['spread_line'].notna()
    h0, a0 = h0[keep], a0[keep]
    gid = h0.index
    won = (h0['home_score'] > h0['away_score']).astype(float).values
    seasons = h0['season'].values
    L = line_features(h0['spread_line'])
    nets, offs, defs = {}, {}, {}
    nb_h = nb_a = None
    std_pt = None
    for key in [s[0] for s in STATS + RESULTS]:
        sd = season_to_date(t, key).set_index(['game_id', 'team'])
        if key == 'pt_diff':
            std_pt = sd
        hv = sd.reindex(pd.MultiIndex.from_arrays([gid, h0['team']]))
        av = sd.reindex(pd.MultiIndex.from_arrays([gid, a0['team']]))
        sign = 1 if direction.get(key, 'more') == 'more' or key == 'to_margin' else -1
        nets[key] = sign * (hv['net'].values - av['net'].values)
        offs[key] = sign * (hv['off'].values - av['off'].values)
        defs[key] = sign * (hv['def'].values - av['def'].values)
        nb_h, nb_a = hv['n_before'].values, av['n_before'].values
    spec, change = special_gaps(t, h0, a0, std_pt)
    enough = (nb_h >= SEASON_TO_DATE_MIN) & (nb_a >= SEASON_TO_DATE_MIN)

    # the main table: both teams three games in (the 2006-on stats on those from 2006, the field-goal
    # rate on those where both teams have tried one)
    m = enough
    y, ss, LL = won[m], seasons[m], L[m]
    base_ll, _ = loso(LL, y, ss)
    rows = [dict(key='line', stat='The closing spread (the Vegas favourite)', group='market',
                 pick_rate=pick_rate(np.sign(LL[:, 0]), y)[0], level=(LL[:, 0] == 0).mean(),
                 logloss_alone=base_ll.mean(), games=int(len(y)))]
    for key in [s[0] for s in STATS + RESULTS] + [s[0] for s in SPECIAL]:
        gap = (nets[key] if key in nets else spec[key])[m]
        row = dict(key=key, stat=LABEL[key], group=GROUP[key], **evaluate(gap, y, ss, LL), note=NOTE[key])
        if key in nets:
            r = split_half(t, key)
            row.update(reliability=r, reliability_season=2 * r / (1 + r))
        rows.append(row)
    main = pd.DataFrame(rows).sort_values('pick_rate', ascending=False).reset_index(drop=True)
    main.index += 1

    # offence and defence apart, for the leading stats
    prow = []
    for key in ('pt_diff', 'epa_play', 'drop_epa', 'drush_epa', 'success', 'dsr', 'anya', 'ypp', 'to_margin', 'rz_td_pct', 'd3_pct'):
        for part, gaps in (('net', nets), ('offence', offs), ('defence', defs)):
            prow.append(dict(key=key, stat=LABEL[key], part=part, **evaluate(gaps[key][m], y, ss, LL, with_line=False)))
    pparts = pd.DataFrame(prow)

    # weeks 1-3: a team with fewer than three games behind it
    e = ~enough
    y1, s1, L1 = won[e], seasons[e], L[e]
    base1, _ = loso(L1, y1, s1)
    site = (h0['location'] != 'Neutral').values[e]
    rows = [dict(key='line', stat='The closing spread (the Vegas favourite)', group='market',
                 pick_rate=pick_rate(np.sign(L1[:, 0]), y1)[0], logloss_alone=base1.mean(), games=int(len(y1))),
            dict(key='home', stat='The home team (a neutral site a coin flip)', group='context',
                 pick_rate=pick_rate(site.astype(float), y1)[0], games=int(len(y1)))]
    for key in ('elo', 'last_pt_diff', 'pt_blend', 'last_epa_play', 'last_drop_epa', 'qb', 'srs', 'pt_diff', 'epa_play'):
        gap = (nets[key] if key in nets else spec[key])[e]
        rows.append(dict(key=key, stat=LABEL[key] + (' (this season, under 3 games)' if key in nets or key == 'srs' else ''),
                         group=GROUP[key], **evaluate(gap, y1, s1, L1), note=NOTE.get(key, '')))
    early = pd.DataFrame(rows)

    # every game, for the indicators that can be read from week 1
    rows = [dict(key='line', stat='The closing spread (the Vegas favourite)', pick_rate=pick_rate(np.sign(L[:, 0]), won)[0],
                 logloss_alone=loso(L, won, seasons)[0].mean(), games=int(len(won)))]
    for key in ('elo', 'pt_blend', 'qb'):
        rows.append(dict(key=key, stat=LABEL[key], **evaluate(spec[key], won, seasons, L)))
    allg = pd.DataFrame(rows)

    # games where either side's starting quarterback changed since its last game, and the rest
    rows = []
    for name, mask in (('QB changed', m & change), ('same QBs', m & ~change)):
        for key in ('qb', 'drop_epa', 'epa_play', 'pt_diff', 'elo'):
            gap = (nets[key] if key in nets else spec[key])[mask]
            rows.append(dict(games_with=name, key=key, stat=LABEL[key],
                             **evaluate(gap, won[mask], seasons[mask], L[mask], with_line=False)))
    qbsplit = pd.DataFrame(rows)

    # which pre-game signals are distinct: forward selection without and on top of the line
    cands = {k: zs(v[m]) for k, v in nets.items() if k not in FROM_2006 and k not in flagged}
    cands.update({k: zs(spec[k][m]) for k in ('elo', 'srs', 'pt_blend', 'qb')})
    fw = {name: forward(cands, base, y, ss, steps=6) for name, base in (('pre_game_forward', None),
                                                                         ('pre_game_forward_on_line', LL))}
    null = best_by_chance(cands, LL, y, ss)
    return main, pparts, early, allg, qbsplit, fw, null


def best_by_chance(cands, base, y, ss, k=NULL_RUNS):
    """What the forward selection's first step on top of the line finds by chance: the candidates'
    rows shuffled together within each season (so they keep their links to each other and lose the
    one to the result), the best change in log loss among them, k times."""
    names = list(cands)
    X = np.column_stack([cands[n] for n in names])
    b0, _ = loso(base, y, ss)
    best = []
    for i in range(k):
        rng = np.random.default_rng(1000 + i)
        idx = np.arange(len(y))
        for s in np.unique(ss):
            w = np.where(ss == s)[0]
            idx[w] = rng.permutation(w)
        Xp = X[idx]
        best.append(min((loso(np.column_stack([base, Xp[:, j]]), y, ss)[0] - b0).mean() for j in range(len(names))))
    best = np.array(best) * 1000
    return {'runs': k, 'candidates': len(names), 'best_by_chance_mean_x1000': float(best.mean()),
            'best_by_chance_p95_x1000': float(np.percentile(best, 5)), 'all_x1000': [round(float(v), 4) for v in best]}


def benchmarks(t):
    h, a = paired(t)
    ties = int((h['home_score'] == h['away_score']).sum())
    h = h[h['home_score'] != h['away_score']]
    won = (h['home_score'] > h['away_score']).astype(float).values
    site = (h['location'] != 'Neutral').values
    sp = h['spread_line'].astype(float).values
    rest = (h['home_rest'] - h['away_rest']).astype(float).values
    s = h['season'].values
    return {
        'games': int(len(h)), 'ties_left_out': ties,
        'home_team_win_rate': float(won[site].mean()),
        'home_team_win_rate_2003_13': float(won[site & (s <= ERA_SPLIT)].mean()),
        'home_team_win_rate_2014_25': float(won[site & (s > ERA_SPLIT)].mean()),
        'closing_favourite_pick_rate': pick_rate(np.sign(sp), won)[0],
        'rest_edge_pick_rate': pick_rate(rest, won)[0],
        'rest_edge_level': float((rest == 0).mean()),
    }


def top15(ig):
    """The in-game top 15: the stats that do not follow the score."""
    x = ig[ig['follows_score'] == ''].head(TOP).copy()
    x.insert(0, 'top', range(1, len(x) + 1))
    return x


def main():
    t = pd.read_parquet(os.path.join(OUT, 'team_games.parquet'))
    if t['season'].max() >= common.HOLDOUT_FROM or t['season'].min() < common.FIRST:
        raise SystemExit('the table holds seasons outside the study: rebuild it')
    os.makedirs(RES, exist_ok=True)
    pd.set_option('display.width', 260, 'display.max_columns', 30, 'display.max_colwidth', 46)
    f = lambda name: os.path.join(RES, name)

    ig, gaps, won, era = in_game(t)
    ig.to_csv(f('in_game.csv'), float_format='%.4f', index_label='rank')
    top15(ig).to_csv(f('in_game_top15.csv'), float_format='%.4f', index_label='rank')
    print(ig[['stat', 'better', 'pick_rate', 'level', 'win_when_won', 'corr_margin', 'rate_early', 'rate_late',
              'worst_season', 'neutral_rate', 'follows_score']].round(3).to_string(), '\n')

    flagged = set(ig.loc[ig['follows_score'] != '', 'key'])
    cands = {k: zs(g) for k, g in gaps.items() if k not in FROM_2006 and k not in flagged}
    box = {k: v for k, v in cands.items() if k not in EPA_BASED}
    runs = [('in_game_forward', cands, np.ones(len(won), bool)), ('in_game_forward_box_score', box, np.ones(len(won), bool)),
            ('in_game_forward_box_score_2003_13', box, era <= ERA_SPLIT), ('in_game_forward_box_score_2014_25', box, era > ERA_SPLIT)]
    for name, cs, mask in runs:
        fw = forward({k: v[mask] for k, v in cs.items()}, None, won[mask], era[mask], STEPS)
        fw.to_csv(f(name + '.csv'), float_format='%.5f', index=False)
        print(name); print(fw.round(4).to_string(), '\n')

    direction = dict(zip(ig['key'], ig['better']))
    main_t, pparts, early, allg, qbsplit, fws, null = pre_game(t, direction, flagged)
    null['found_x1000'] = float(fws['pre_game_forward_on_line'].loc[1, 'd_logloss_x1000'])
    null['found'] = fws['pre_game_forward_on_line'].loc[1, 'stat']
    with open(f('pre_game_forward_on_line_null.json'), 'w') as fh:
        json.dump(null, fh, indent=1)
    print('on top of the line, by chance:', {k: v for k, v in null.items() if k != 'all_x1000'})
    main_t.to_csv(f('pre_game.csv'), float_format='%.4f', index_label='rank')
    pparts.to_csv(f('pre_game_offence_defence.csv'), float_format='%.4f', index=False)
    early.to_csv(f('pre_game_weeks_1_3.csv'), float_format='%.4f', index=False)
    allg.to_csv(f('pre_game_all_games.csv'), float_format='%.4f', index=False)
    qbsplit.to_csv(f('pre_game_qb_change.csv'), float_format='%.4f', index=False)
    print(main_t[['stat', 'pick_rate', 'pick_lo', 'pick_hi', 'logloss_alone', 'd_logloss_x1000', 'd_lo_x1000', 'd_hi_x1000',
                  'z_with_line', 'on_top_of_line', 'reliability', 'reliability_season', 'games']].round(4).to_string(), '\n')
    for name, x in (('offence and defence', pparts), ('weeks 1-3', early), ('all games', allg), ('QB change', qbsplit)):
        print(name); print(x.drop(columns=[c for c in ('note', 'group') if c in x]).round(4).to_string(), '\n')
    for name, fw in fws.items():
        fw.to_csv(f(name + '.csv'), float_format='%.5f', index=False)
        print(name); print(fw.round(4).to_string(), '\n')

    bm = benchmarks(t)
    with open(f('benchmarks.json'), 'w') as fh:
        json.dump(bm, fh, indent=1)
    print(json.dumps(bm, indent=1))


if __name__ == '__main__':
    main()
