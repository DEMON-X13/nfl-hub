#!/usr/bin/env python3
"""Overall Offense and Overall Defense: the fit and the walk-forward test behind the constants in
elo/build.py (UNIT_STATS, UNIT_W, UNIT_K, UNIT_CARRY, UNIT_WF; OVERALL OFFENSE AND OVERALL DEFENSE
and THE CARRY in its docstring). Run once, offline from the job, the way betting/broly/fit.py is: its numbers are pasted
into the build, which never refits them on the season in progress.

    python3 elo/tools/units_fit.py              # downloads what it lacks into elo/cache/ (2012-2025 play-by-play, about 260 MB)
    python3 elo/tools/units_fit.py --offline    # the cache only

What it does, on the build's own code (build.pbp_team_games, build.unit_value, build.unit_ratings),
so the fit and the published ratings read the play-by-play the same way:
  1. every team-game of 2012-2025, regular season and playoffs, as the nine stats from the offense's
     side: points, success rate, EPA a play, giveaways a drive, sack rate, big plays, third-down rate,
     red-zone touchdown rate, yards a play (a final whose play-by-play does not end on the schedule's
     score is left out, as the build leaves it out);
  2. each stat's mean and spread over the 2012-2017 team-games, and its home field (half the home
     side's edge, in standard deviations);
  3. for every stat a coupled Elo within each season, offense against defense, K 0.08, and each
     team-game's ratings going into it: first with every unit starting each season at 0, which gives
     each season's final ratings from 0, then (the build's one-step carry) with every club starting a
     season at UNIT_CARRY of the season before's final, that season rated from 0, the clubs that moved
     carried into today's codes;
  3a. the carry's share, chosen on 2013-2017 alone with the build's weights held: each season left
     out in turn, the regular season's weeks 2 on, the points mapping fitted on the other seasons of
     2012-2017, the squared errors pooled; 0 to 1 by 0.1, then by 0.02 within 0.1 of the best; the
     lowest printed beside the build's UNIT_CARRY;
  4. the offense's points in that game regressed on its offense rating and the opponent's defense
     rating (plus home field), on the carried ratings, fitted on 2012-2017 and scored on 2018-2025,
     weeks 2 on, by RMSE: the league average, each stat alone, the old measure (two parts points, one
     part EPA, carried the same way), all nine with free weights, all nine with weights kept at zero or
     above (non-negative least squares: the build's weights were rounded from these shares as fitted
     before the carry and are held, so on the carried ratings they are information only), all nine
     equally, the build's weights with no carry and with it (UNIT_WF);
  5. stability: the same non-negative fit on 2012-2021, tested on 2022-2025;
  6. the constants as the build should carry them (UNIT_STATS, UNIT_CARRY, UNIT_WF), and whether it
     does;
  7. the latest season's top and bottom five each side, by build.unit_ratings carried from the one
     before by build.unit_carry (information: nothing is chosen on it).
"""
import argparse, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build  # noqa: E402

FIRST, FIT_LAST, TEST_LAST = 2012, 2017, 2025
KEYS = list(build.UNIT_STATS)


def team_games(offline):
    """every rated team-game 2012 to the newest season with play-by-play, offense's side, with
    the nine stats' values and the game's home sign"""
    games = pd.read_csv(build.fetch(build.GAMES_URL, os.path.join(build.CACHE, 'games.csv'), offline), low_memory=False)
    games = games[games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB']) & games.home_score.notna()]
    last = int(games.season.max())
    out, dropped = [], 0
    for y in range(FIRST, last + 1):
        dest = os.path.join(build.CACHE, f'play_by_play_{y}.csv.gz')
        if y == last and not offline and os.path.exists(dest):
            os.remove(dest)                      # the season under way changes every day
        try:
            pbp = pd.read_csv(build.fetch(build.PBP_URL.format(y=y), dest, offline), usecols=build.PBP_COLS, low_memory=False)
        except build.Missing as e:
            if y < last:
                raise SystemExit(f'units_fit: {e}')
            print(f'  no play-by-play for {y} yet ({e})')
            break
        tg, score = build.pbp_team_games(pbp)
        gy = games[games.season == y]
        rows = {(r['game_id'], r['side']): r for r in tg.to_dict('records')}
        for r in gy.itertuples(index=False):
            a, b = rows.get((r.game_id, 'home')), rows.get((r.game_id, 'away'))
            if a is None or b is None or score.get(r.game_id) != (float(r.home_score), float(r.away_score)):
                dropped += 1
                continue
            h = 0.0 if r.location == 'Neutral' else 1.0
            for off, dfn, pts, home, sums in ((r.home_team, r.away_team, float(r.home_score), h, a),
                                               (r.away_team, r.home_team, float(r.away_score), -h, b)):
                row = {'season': y, 'week': int(r.week), 'kick': f'{r.gameday} {r.gametime}', 'game_id': r.game_id,
                       'reg': r.game_type == 'REG', 'off': off, 'def': dfn, 'pts': pts, 'home': home}
                for k in KEYS:
                    v = build.unit_value(build.UNIT_STATS[k]['game'], sums, pts)
                    row[k] = np.nan if v is None else v
                out.append(row)
        print(f'  {y}: {len(gy)} finals', flush=True)
    t = pd.DataFrame(out).sort_values(['season', 'kick', 'game_id', 'home'], ascending=[True, True, True, False], kind='mergesort')
    print(f'  {len(t)} team-games; {dropped} finals left out (play-by-play missing a side or not ending on the score)')
    return t.reset_index(drop=True), last


def _elo(t, Z, H, K, start=None):
    """each column of Z (team-game z-scores) as a coupled Elo within each season, every club
    starting a season at start[season][club] ((offense, defense) arrays, by today's code) or at 0:
    the offense's and the defense's ratings going into every team-game, as arrays [row, stat], and
    each season's final ratings {season: {club: (offense, defense)}}, by today's code"""
    n, m = Z.shape
    O, D = np.zeros((n, m)), np.zeros((n, m))
    off, dfn, season, gid = t['off'].values, t['def'].values, t.season.values, t.game_id.values
    home = t.home.values
    now = lambda x: build.TEAM_NOW.get(x, x)       # games.csv keeps OAK, SD and STL for the seasons before the moves
    zero = (np.zeros(m), np.zeros(m))
    Ro, Rd, cur, final, S = {}, {}, None, {}, {}

    def close():
        if cur is not None:
            final[cur] = {now(c): (Ro[c], Rd[c]) for c in Ro}
            assert len(final[cur]) == len(Ro), 'two codes for one club in a season'
    i = 0
    while i < n:
        if season[i] != cur:
            close()
            Ro, Rd, cur = {}, {}, season[i]
            S = (start or {}).get(cur, {})
        j = i
        while j < n and gid[j] == gid[i]:
            j += 1
        for r in range(i, j):
            O[r] = Ro[off[r]] if off[r] in Ro else S.get(now(off[r]), zero)[0]
            D[r] = Rd[dfn[r]] if dfn[r] in Rd else S.get(now(dfn[r]), zero)[1]
        for r in range(i, j):
            e = O[r] - D[r] + H * home[r]
            d = np.where(np.isnan(Z[r]), 0.0, K * (Z[r] - e))
            Ro[off[r]] = O[r] + d
            Rd[dfn[r]] = D[r] - d
        i = j
    close()
    return O, D, final


def carry_starts(final, c):
    """the one-step carry, as the build's unit_carry: each season starts at c times the final
    ratings of the season before, that season rated from 0 on its own games"""
    return {y + 1: {k: (c * o, c * d) for k, (o, d) in f.items()} for y, f in final.items()}


def run_elo(t, Z, H, K, carry=0.0, final0=None):
    """the ratings going into every team-game, as arrays [row, stat]: each season from 0, or, with
    carry, from carry times the season before's final ratings rated from 0 (the build's one-step
    carry, which needs only last season's play-by-play: not the chain through every season before).
    final0 is _elo's finals from 0, when already had"""
    if not carry:
        O, D, _ = _elo(t, Z, H, K)
        return O, D
    if final0 is None:
        final0 = _elo(t, Z, H, K)[2]
    O, D, _ = _elo(t, Z, H, K, carry_starts(final0, carry))
    return O, D


def nnls(X, y, iters=20000):
    """least squares with every coefficient but the first (the intercept) and the last (home) kept
    at zero or above: projected gradient descent on the normal equations"""
    XtX, Xty = X.T @ X, X.T @ y
    w = np.linalg.lstsq(X, y, rcond=None)[0]
    L = np.linalg.eigvalsh(XtX).max()
    for _ in range(iters):
        w = w - (XtX @ w - Xty) / L
        w[1:-1] = np.maximum(w[1:-1], 0)
    return w


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true')
    a = ap.parse_args()
    t, last = team_games(a.offline)
    fit = (t.season <= FIT_LAST).values
    S = {k: build.UNIT_STATS[k] for k in KEYS}
    MU = {k: float(t.loc[fit, k].mean()) for k in KEYS}
    SD = {k: float(t.loc[fit, k].std()) for k in KEYS}
    Z = np.column_stack([S[k]['sign'] * (t[k].values - MU[k]) / SD[k] for k in KEYS])
    # the old measure (TOTAL OFFENSE AND TOTAL DEFENSE, until 2026-10): two parts points, one part EPA
    Zold = (2 * Z[:, KEYS.index('pts')] + Z[:, KEYS.index('epa')]) / 3
    Z = np.column_stack([Z, Zold])
    cols = KEYS + ['old']
    nh = fit & (t.home.values != 0)
    H = np.array([float(np.nanmean(Z[nh, c] * t.home.values[nh])) for c in range(len(cols))])
    y, week, season = t.pts.values, t.week.values, t.season.values
    home = t.home.values
    W = build.UNIT_W
    comp = lambda R, side: sum(W[side][k] / 100 * R[:, KEYS.index(k)] for k in W[side])
    O0, D0, final0 = _elo(t, Z, H, build.UNIT_K)

    # the carry: the share of last season's final ratings each club starts a season with, chosen on
    # 2013-2017 alone (2012 has no season before it in the files), the build's weights, K and home
    # field held. The rule: the regular season's weeks 2 on (the Deep Dive's footing, the tracker not
    # covering the playoffs), each season of 2013-2017 left out in turn and scored on the points
    # mapping fitted on the other seasons of 2012-2017; the five seasons' squared errors pooled; the
    # grid 0 to 1 by 0.1, then by 0.02 within 0.1 of the coarse best; the lowest RMSE chosen
    reg = t.reg.values.astype(bool)
    def loso(c, rows):
        O_, D_ = run_elo(t, Z, H, build.UNIT_K, c, final0)
        X = np.column_stack([np.ones(len(t)), comp(O_, 'off'), comp(D_, 'def'), home])
        rows = rows & (week >= 2) & (season <= FIT_LAST)
        se = []
        for s_ in range(FIRST + 1, FIT_LAST + 1):
            w_ = np.linalg.lstsq(X[rows & (season != s_)], y[rows & (season != s_)], rcond=None)[0]
            m = rows & (season == s_)
            se.append((X[m] @ w_ - y[m]) ** 2)
        return float(np.sqrt(np.mean(np.concatenate(se))))
    tried = {}
    coarse = [round(0.1 * i, 2) for i in range(11)]
    for c in coarse:
        tried[c] = loso(c, reg)
    best = min(coarse, key=lambda c: (tried[c], c))
    for c in (round(best + 0.02 * i, 2) for i in range(-5, 6)):
        if 0 <= c <= 1 and c not in tried:
            tried[c] = loso(c, reg)
    pick = min(tried, key=lambda c: (tried[c], c))
    n_rows = int((reg & (week >= 2) & (season > FIRST) & (season <= FIT_LAST)).sum())
    print(f'\nthe carry, chosen on {FIRST + 1}-{FIT_LAST} (each season left out in turn; regular season weeks 2 on, {n_rows} team-games), RMSE:')
    print('  ' + '  '.join(f'{c:.2f} {v:.4f}' for c, v in sorted(tried.items())))
    print(f'  {len(tried)} tried; the lowest at {pick} ({tried[pick]:.4f}, against {tried[0.0]:.4f} at 0)'
          + ('' if pick == build.UNIT_CARRY else f'   <- the build has UNIT_CARRY = {build.UNIT_CARRY}'))
    C = build.UNIT_CARRY
    O, D = run_elo(t, Z, H, build.UNIT_K, C, final0)
    print(f'  every rating below starts its season at the build\'s {C} of the season before\'s final, that season rated from 0')

    def score(X, name, fit_last=FIT_LAST, test=(FIT_LAST + 1, TEST_LAST), positive=False, show=None, quiet=False):
        fm = (season <= fit_last) & (week >= 2)
        em = (season >= test[0]) & (season <= test[1]) & (week >= 2)
        X = np.column_stack([np.ones(len(t)), X, home])
        w = nnls(X[fm], y[fm]) if positive else np.linalg.lstsq(X[fm], y[fm], rcond=None)[0]
        pred = X @ w
        rmse = float(np.sqrt(np.mean((pred[em] - y[em]) ** 2)))
        by = [float(np.sqrt(np.mean((pred[em & (season == s)] - y[em & (season == s)]) ** 2))) for s in range(test[0], test[1] + 1)]
        if not quiet:
            print(f'  {name:52s} {rmse:.3f}   ' + ' '.join(f'{b:.2f}' for b in by))
            if show:
                print('      coefficients: ' + ', '.join(f'{k} {v:+.3f}' for k, v in zip(show, w[1:-1])))
        return rmse, by, pred, w

    print(f'\nRMSE of the offense\'s points in its next game, {FIT_LAST + 1}-{TEST_LAST} weeks 2 on (fitted on {FIRST}-{FIT_LAST}), then by season:')
    lg = score(np.zeros((len(t), 0)), 'league average and home field')
    alone = {}
    for c, k in enumerate(cols):
        alone[k] = score(np.column_stack([O[:, c], D[:, c]]), f'{k} alone' if k != 'old' else 'the old measure (2 parts points, 1 part EPA)')
    nine = list(range(len(KEYS)))
    names = [f'O.{k}' for k in KEYS] + [f'D.{k}' for k in KEYS]
    score(np.column_stack([O[:, nine], D[:, nine]]), 'all nine, free weights', show=names)
    _, _, _, w9 = score(np.column_stack([O[:, nine], -D[:, nine]]), 'all nine, weights >= 0', positive=True, show=names)
    shares = {}
    for side, part in (('off', w9[1:1 + len(KEYS)]), ('def', w9[1 + len(KEYS):1 + 2 * len(KEYS)])):
        tot = part.sum()
        shares[side] = {k: 100 * v / tot for k, v in zip(KEYS, part) if v > 0}
        print(f'      {side} shares: ' + ', '.join(f'{k} {v:.1f}%' for k, v in sorted(shares[side].items(), key=lambda kv: -kv[1])))
    print('      (information only: the build\'s weights, UNIT_W, were rounded from these shares as they were fitted before\n'
          '       the carry, 9.514 on offense points 37%, success rate 26%, giveaways 21%, EPA 11%, sacks 6% and defense points 56%,\n'
          '       big plays 27%, takeaways 14%, sacks 4%; the weights are held, and the shares on the carried ratings above are\n'
          '       not their source any more)')
    score(np.column_stack([O[:, nine].mean(1), D[:, nine].mean(1)]), 'all nine, equal weights')
    r0, _, p0, _ = score(np.column_stack([comp(O0, 'off'), comp(D0, 'def')]), 'the build\'s weights, each season from 0 (no carry)')
    r_new, by_new, p_new, _ = score(np.column_stack([comp(O, 'off'), comp(D, 'def')]),
                                    'the build: ' + ' '.join(f'{k}{v}' for k, v in W['off'].items()) + ' | ' + ' '.join(f'{k}{v}' for k, v in W['def'].items()))
    r_old, by_old, p_old, _ = alone['old']
    em = (season >= FIT_LAST + 1) & (season <= TEST_LAST) & (week >= 2)
    diff = pd.Series((p_new[em] - y[em]) ** 2 - (p_old[em] - y[em]) ** 2).groupby(t.game_id.values[em]).sum()
    se = float(diff.std() / np.sqrt(len(diff)) / 2)
    better = sum(a < b for a, b in zip(by_new, by_old))
    print(f'\n  the build against the old measure: {r_new:.3f} against {r_old:.3f} ({r_new - r_old:+.3f}); squared error a team-game '
          f'{diff.mean() / 2:+.3f}, standard error {se:.3f} (by game); better in {better} of {len(by_new)} seasons')
    d0 = pd.Series((p_new[em] - y[em]) ** 2 - (p0[em] - y[em]) ** 2).groupby(t.game_id.values[em]).sum()
    print(f'  the build against the same weights with no carry: {r_new:.3f} against {r0:.3f}; squared error a team-game '
          f'{d0.mean() / 2:+.3f}, standard error {float(d0.std() / np.sqrt(len(d0)) / 2):.3f} (by game)')
    # stability: the non-negative fit on 2012-2021, tested on 2022-2025
    print(f'\nstability: fitted on {FIRST}-2021, tested on 2022-{TEST_LAST}')
    _, _, _, w21 = score(np.column_stack([O[:, nine], -D[:, nine]]), 'all nine, weights >= 0', fit_last=2021, test=(2022, TEST_LAST), positive=True, show=names)
    score(np.column_stack([comp(O, 'off'), comp(D, 'def')]), 'the build\'s weights', fit_last=2021, test=(2022, TEST_LAST))
    score(np.column_stack([O[:, -1], D[:, -1]]), 'the old measure', fit_last=2021, test=(2022, TEST_LAST))
    for side, part in (('off', w21[1:1 + len(KEYS)]), ('def', w21[1 + len(KEYS):1 + 2 * len(KEYS)])):
        tot = part.sum()
        print(f'      {side} shares: ' + ', '.join(f'{k} {100 * v / tot:.1f}%' for k, v in sorted(zip(KEYS, part), key=lambda kv: -kv[1]) if v > 0))

    # the constants, as the build should carry them
    print('\nthe constants (mean, spread of a team-game 2012-2017; home field in standard deviations):')
    off = []
    for c, k in enumerate(KEYS):
        want = (round(MU[k], 4), round(SD[k], 4), round(float(H[c]), 3))
        have = (S[k]['mu'], S[k]['sd'], S[k]['home'])
        print(f"  {k:6s} 'mu': {want[0]}, 'sd': {want[1]}, 'home': {want[2]}" + ('' if want == have else f'   <- the build has {have}'))
        off += [] if want == have else [k]
    wf = {'rmse': round(r_new, 3), 'previous': round(r_old, 3), 'league': round(lg[0], 3), 'se': round(se, 3),
          'seasons_better': better, 'seasons': len(by_new), 'fit': f'{FIRST}-{FIT_LAST}', 'test': f'{FIT_LAST + 1}-{TEST_LAST}',
          'carry': C, 'no_carry': round(r0, 3)}
    print(f'  UNIT_CARRY = {pick}' + ('' if pick == build.UNIT_CARRY else f'   <- the build has {build.UNIT_CARRY}'))
    print(f'  UNIT_WF = {wf}' + ('' if wf == build.UNIT_WF else f'\n    <- the build has {build.UNIT_WF}'))
    same = not off and wf == build.UNIT_WF and pick == build.UNIT_CARRY
    print('  the build carries these constants' if same else '  THE BUILD DIFFERS: paste the lines above into elo/build.py')

    # the latest season, as the build rates it
    gy = pd.read_csv(os.path.join(build.CACHE, 'games.csv'), low_memory=False)
    pbp = pd.read_csv(os.path.join(build.CACHE, f'play_by_play_{last}.csv.gz'), usecols=build.PBP_COLS, low_memory=False) \
        if os.path.exists(os.path.join(build.CACHE, f'play_by_play_{last}.csv.gz')) else None
    if pbp is not None:
        tg, sc = build.pbp_team_games(pbp)
        for c in ('home_team', 'away_team'):
            gy[c] = gy[c].replace(build.TEAM_NOW)
        prev = os.path.join(build.CACHE, f'play_by_play_{last - 1}.csv.gz')
        carry = build.unit_carry(gy[gy.season == last - 1], *build.pbp_team_games(
            pd.read_csv(prev, usecols=build.PBP_COLS, low_memory=False))) if os.path.exists(prev) else None
        U = build.unit_ratings(gy[gy.season == last], tg, sc, carry)
        for side, label in (('off', 'Overall Offense'), ('def', 'Overall Defense')):
            rows = sorted(((v['rank'], k, v['elo']) for k, v in U[side].items() if v['games'] or v['carried']))
            print(f'\n{last} {label} ({len(rows)} teams, {len(U["pending"])} finals pending):')
            print('  top five:    ' + ', '.join(f'{r}. {k} {e}' for r, k, e in rows[:5]))
            print('  bottom five: ' + ', '.join(f'{r}. {k} {e}' for r, k, e in rows[-5:]))


if __name__ == '__main__':
    main()
