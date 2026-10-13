#!/usr/bin/env python3
"""The Season Tracker's Deep Dive against the Game snapshot's Overall Offense and Overall Defense:
which predicts an offense's points in its next game better, on the same team-games. The owner asked
which of the two is more accurate (13 October 2026); the snapshot's measure had a walk-forward test
(UNIT_WF in elo/build.py, from units_fit.py) and the Deep Dive's had none. Nothing here changes a
site: it is a test, run once, offline from every job.

    python3 elo/tools/deepdive_vs_units.py              # downloads what it lacks into elo/cache/
    python3 elo/tools/deepdive_vs_units.py --offline    # the cache only

The two sides:
  - the snapshot: units_fit.py's own harness, untouched (team_games, run_elo, the build's weights):
    each team-game's Overall Offense and the opponent's Overall Defense going into it, this season
    alone;
  - the Deep Dive: news/tools/context.js's ratings() replayed in Python going into every game: the
    season's regular-season team rows from the weeks before, plus last season's scaled to four games
    (PRIOR_GAMES), QB runs out of the run game, each of the eight ratings (qb, passD, ol, front, rb,
    runD, rec, db) in league standard deviations at that moment, rounded to two places as the page
    has them. A row's input is the four edges the page shows for that offense: qb - passD,
    ol - front, rb - runD, rec - db, the opponent's mirror units.
Both are mapped to points the same way units_fit.py maps the snapshot's: least squares with an
intercept and home field, fitted on 2012-2017 weeks 2 on, scored by RMSE on 2018-2025 weeks 2 on.
The regular season only, since the Deep Dive is (the tracker does not cover the playoffs), so the
snapshot's number here differs a little from UNIT_WF's, which counts the playoffs too.
"""
import argparse, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import build  # noqa: E402
import units_fit as uf  # noqa: E402

PRIOR_GAMES = 4
DD = os.path.join(build.CACHE, 'deepdive')
REL = 'https://github.com/nflverse/nflverse-data/releases/download'
AB = {'LA': 'LAR', 'STL': 'LAR', 'OAK': 'LV', 'SD': 'LAC', 'WSH': 'WAS', 'JAC': 'JAX'}   # news/tools/lib.js ab()
ab = lambda t: AB.get(t, t)
TOT = ['g', 'att', 'sk', 'pepa', 'tgt', 'tepa', 'tyd', 'hitA', 'car', 'ryd', 'repa',
       'oatt', 'osk', 'opepa', 'otgt', 'otepa', 'otyd', 'ocar', 'oryd', 'orepa', 'dhit']
UNITS = ['qb', 'passD', 'ol', 'front', 'rb', 'runD', 'rec', 'db']
EDGES = [('qb', 'passD'), ('ol', 'front'), ('rb', 'runD'), ('rec', 'db')]


def stats(kind, y, offline):
    f = f'stats_{kind}_week_{y}.csv'
    return pd.read_csv(build.fetch(f'{REL}/stats_{kind}/{f}', os.path.join(DD, f), offline), low_memory=False)


def week_totals(y, offline):
    """per (team, week) the context.js teamTotals() sums of that week's regular-season row:
    the offence's own and what its defence allowed"""
    t = stats('team', y, offline)
    t = t[t.season_type == 'REG'].copy()
    p = stats('player', y, offline)
    p = p[(p.season_type == 'REG') & (p.position == 'QB')]
    q = p.assign(team=p.team.map(ab)).groupby(['team', 'week'])[['carries', 'rushing_yards', 'rushing_epa']].sum()
    t['team'], t['opponent_team'] = t.team.map(ab), t.opponent_team.map(ab)
    t = t.fillna({c: 0 for c in ['attempts', 'sacks_suffered', 'passing_epa', 'targets', 'receiving_epa', 'receiving_yards',
                                  'carries', 'rushing_yards', 'rushing_epa', 'def_qb_hits']})
    qq = q.reindex(list(zip(t.team, t.week))).fillna(0).values
    car, ryd, repa = t.carries.values - qq[:, 0], t.rushing_yards.values - qq[:, 1], t.rushing_epa.values - qq[:, 2]
    own = pd.DataFrame({'team': t.team.values, 'week': t.week.values, 'g': 1.0, 'att': t.attempts.values,
                        'sk': t.sacks_suffered.values, 'pepa': t.passing_epa.values, 'tgt': t.targets.values,
                        'tepa': t.receiving_epa.values, 'tyd': t.receiving_yards.values, 'car': car, 'ryd': ryd,
                        'repa': repa, 'dhit': t.def_qb_hits.values})
    opp = pd.DataFrame({'team': t.opponent_team.values, 'week': t.week.values, 'hitA': t.def_qb_hits.values,
                        'oatt': t.attempts.values, 'osk': t.sacks_suffered.values, 'opepa': t.passing_epa.values,
                        'otgt': t.targets.values, 'otepa': t.receiving_epa.values, 'otyd': t.receiving_yards.values,
                        'ocar': car, 'oryd': ryd, 'orepa': repa})
    w = pd.concat([own, opp]).groupby(['team', 'week']).sum().reindex(columns=TOT).fillna(0)
    return w


def ratings(B):
    """context.js ratings() on blended totals B (a DataFrame, a row a team): the eight z ratings"""
    div = lambda a, b: (a / b).where(b > 0)
    db, odb = B.att + B.sk, B.oatt + B.osk
    M = pd.DataFrame({'pass_epa': div(B.pepa, db), 'o_pass_epa': div(B.opepa, odb), 'sack_rate': div(B.sk, db),
                      'hit_rate': div(B.hitA, db), 'o_sack_rate': div(B.osk, odb), 'o_hit_rate': div(B.dhit, odb),
                      'rush_epa': div(B.repa, B.car), 'ypc': div(B.ryd, B.car), 'o_rush_epa': div(B.orepa, B.ocar),
                      'o_ypc': div(B.oryd, B.ocar), 'rec_epa': div(B.tepa, B.tgt), 'rec_ypt': div(B.tyd, B.tgt),
                      'o_rec_epa': div(B.otepa, B.otgt), 'o_rec_ypt': div(B.otyd, B.otgt)})

    def z(k, s):
        v = M[k]
        sd = v.std(ddof=0) or 1
        return (s * (v - v.mean()) / sd).fillna(0)
    raw = {'qb': z('pass_epa', 1), 'passD': z('o_pass_epa', -1),
           'ol': (z('sack_rate', -1) + z('hit_rate', -1)) / 2, 'front': (z('o_sack_rate', 1) + z('o_hit_rate', 1)) / 2,
           'rb': (z('rush_epa', 1) + z('ypc', 1)) / 2, 'runD': (z('o_rush_epa', -1) + z('o_ypc', -1)) / 2,
           'rec': (z('rec_epa', 1) + z('rec_ypt', 1)) / 2, 'db': (z('o_rec_epa', -1) + z('o_rec_ypt', -1)) / 2}
    out = {}
    for u, v in raw.items():
        sd = v.std(ddof=0) or 1
        out[u] = ((v - v.mean()) / sd).round(2)
    return pd.DataFrame(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true')
    a = ap.parse_args()
    os.makedirs(DD, exist_ok=True)
    print('the team-games and the snapshot\'s ratings (units_fit.py\'s harness):')
    t, _ = uf.team_games(a.offline)
    t = t[t.season <= uf.TEST_LAST].reset_index(drop=True)
    fit = (t.season <= uf.FIT_LAST).values
    KEYS = uf.KEYS
    S = build.UNIT_STATS
    MU = {k: float(t.loc[fit, k].mean()) for k in KEYS}
    SD = {k: float(t.loc[fit, k].std()) for k in KEYS}
    Z = np.column_stack([S[k]['sign'] * (t[k].values - MU[k]) / SD[k] for k in KEYS])
    nh = fit & (t.home.values != 0)
    H = np.array([float(np.nanmean(Z[nh, c] * t.home.values[nh])) for c in range(len(KEYS))])
    O, D = uf.run_elo(t, Z, H, build.UNIT_K)
    Wt = build.UNIT_W
    comp = lambda R, side: sum(Wt[side][k] / 100 * R[:, KEYS.index(k)] for k in Wt[side])
    snap = np.column_stack([comp(O, 'off'), comp(D, 'def')])

    print('the Deep Dive\'s ratings going into each game (context.js ratings(), replayed):')
    t = t.rename(columns={'def': 'dfn'})
    DO, DDf = np.full((len(t), 8), np.nan), np.full((len(t), 8), np.nan)
    first, last = int(t.season.min()), int(t.season.max())
    Wk = {y: week_totals(y, a.offline) for y in range(first - 1, last + 1)}
    cache = {}
    for i, (y, w, o, d) in enumerate(zip(t.season.values, t.week.values, t.off.map(ab).values, t.dfn.map(ab).values)):
        if (y, w) not in cache:
            prior = Wk[y - 1].groupby(level='team').sum()
            prior = prior.mul(PRIOR_GAMES / prior.g, axis=0)
            cur = Wk[y][Wk[y].index.get_level_values('week') < w].groupby(level='team').sum()
            cache[(y, w)] = ratings(prior.add(cur, fill_value=0))
        R = cache[(y, w)]
        if o in R.index and d in R.index:
            DO[i], DDf[i] = R.loc[o, UNITS].values, R.loc[d, UNITS].values
    U = {u: j for j, u in enumerate(UNITS)}
    y, week, season, home = t.pts.values, t.week.values, t.season.values, t.home.values
    edges = np.column_stack([DO[:, U[a_]] - DDf[:, U[b_]] for a_, b_ in EDGES])

    # the regular season: 17 weeks before 2021, 18 from then (games.csv numbers the playoffs after them)
    reg = ~np.isnan(edges).any(1) & (week <= np.where(season >= 2021, 18, 17))
    fm = reg & (season <= uf.FIT_LAST) & (week >= 2)
    em = reg & (season > uf.FIT_LAST) & (week >= 2)
    print(f'  {fm.sum()} team-games fitted on (2012-2017), {em.sum()} tested (2018-2025), regular season weeks 2 on')

    res = {}
    def score(X, name):
        X = np.column_stack([np.ones(len(t)), X, home])
        w_ = np.linalg.lstsq(X[fm], y[fm], rcond=None)[0]
        pred = X @ w_
        rmse = float(np.sqrt(np.mean((pred[em] - y[em]) ** 2)))
        by = [float(np.sqrt(np.mean((pred[em & (season == s)] - y[em & (season == s)]) ** 2))) for s in range(uf.FIT_LAST + 1, uf.TEST_LAST + 1)]
        res[name] = (rmse, by, pred, w_)
        print(f'  {name:58s} {rmse:.3f}   ' + ' '.join(f'{b:.2f}' for b in by))
        return pred

    print('\nRMSE of the offense\'s points, 2018-2025 regular season weeks 2 on, then by season:')
    score(np.zeros((len(t), 0)), 'league average and home field')
    p_snap = score(snap, 'the snapshot: Overall Offense, Overall Defense')
    p_dd = score(edges, 'the Deep Dive: its four edges, free weights')
    score(edges.sum(1), 'the Deep Dive: the four edges added up')
    score(np.column_stack([DO[:, [U[k] for k in ('qb', 'ol', 'rb', 'rec')]], DDf[:, [U[k] for k in ('passD', 'front', 'runD', 'db')]]]),
          'the Deep Dive: its eight ratings, free weights')
    for a_, b_ in EDGES:
        score(DO[:, U[a_]] - DDf[:, U[b_]], f'the Deep Dive: {a_} - {b_} alone')
    score(np.column_stack([snap, edges]), 'both together')

    d = pd.Series((p_dd[em] - y[em]) ** 2 - (p_snap[em] - y[em]) ** 2).groupby(t.game_id.values[em]).sum()
    se = float(d.std() / np.sqrt(len(d)) / 2)
    better = sum(a_ < b_ for a_, b_ in zip(res['the Deep Dive: its four edges, free weights'][1], res['the snapshot: Overall Offense, Overall Defense'][1]))
    print(f'\n  Deep Dive minus snapshot: squared error a team-game {d.mean() / 2:+.3f}, standard error {se:.3f} (by game); '
          f'the Deep Dive better in {better} of {uf.TEST_LAST - uf.FIT_LAST} seasons')
    print('\nby stretch of the season (RMSE, 2018-2025):')
    for lo, hi in ((2, 4), (5, 9), (10, 18)):
        m = em & (week >= lo) & (week <= hi)
        line = ', '.join(f'{n} {np.sqrt(np.mean((res[k][2][m] - y[m]) ** 2)):.3f}' for n, k in
                         (('league', 'league average and home field'), ('snapshot', 'the snapshot: Overall Offense, Overall Defense'),
                          ('Deep Dive', 'the Deep Dive: its four edges, free weights'), ('both', 'both together')))
        print(f'  weeks {lo}-{hi} ({m.sum()} team-games): {line}')
    w_ = res['the Deep Dive: its four edges, free weights'][3]
    print('\n  the Deep Dive\'s fitted points per standard deviation of edge: ' +
          ', '.join(f'{a_}-{b_} {v:+.2f}' for (a_, b_), v in zip(EDGES, w_[1:5])))


if __name__ == '__main__':
    main()
