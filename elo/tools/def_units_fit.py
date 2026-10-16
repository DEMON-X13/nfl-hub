#!/usr/bin/env python3
"""Run Defense, Pass Defense and Pass Rush: the fit and the walk-forward test behind their constants
in elo/build.py (the five stats' entries in UNIT_STATS, UNIT_TABLES; RUN DEFENSE, PASS DEFENSE AND
PASS RUSH in its docstring). The owner asked for them on 16 October 2026 ("for ELO ratings, please
include a section for run defense, pass defense, and pass rush"). Run once, offline from the job, as
units_fit.py is: its numbers are pasted into the build, which never refits them on the season in
progress.

    python3 elo/tools/def_units_fit.py              # downloads what it lacks into elo/cache/ (2012-2025 play-by-play)
    python3 elo/tools/def_units_fit.py --offline    # the cache only

What it does, on the build's own code (build.pbp_team_games, build.unit_value, and units_fit.py's
harness, the Elo the build runs), so the fit and the published ratings read the play-by-play the
same way, and with nothing of Overall Offense and Overall Defense moved (K, the carry and the
method held; each stat its own Elo, so a new one never moves another):
  1. every team-game of 2012-2025, regular season and playoffs, as the table stats from the offense's
     side: EPA a run and run success rate on designed runs (nflverse's rush, never a scramble), EPA a
     dropback and dropback success rate (pass: passes, sacks and scrambles), sack rate and QB-hit rate
     a dropback (a hit any play nflverse flags qb_hit, or a sack);
  2. each stat's mean and spread over the 2012-2017 team-games, and its home field (half the home
     side's edge, in standard deviations), as UNIT_STATS carries the nine's;
  3. each stat a coupled Elo within each season, offense against defense, K 0.08 (UNIT_K), every club
     starting a season at UNIT_CARRY (0.42) of its final rating the season before, that season rated
     from 0: the build's one-step carry, held, not chosen again here;
  4. for each table, what it is for, the next game's measure of that facet, as the offense's own
     number in it: Run Defense the EPA a run, Pass Defense the EPA a dropback, Pass Rush the sack
     rate (turned so that more is better for the offense). That number regressed on the two stats' ratings of both sides going into the game (plus
     home field), with every weight kept at zero or above, fitted on 2012-2017 weeks 2 on (the
     playoffs in, as UNIT_WF's footing): the defense's shares, rounded to fives, are the table's
     weights; the offense's, rounded the same way, are its mirror (`opp`: the offense's side of the
     same facet, which the test needs and a later offense table would use; nothing publishes it);
  5. scored once on 2018-2025 weeks 2 on, by RMSE in the measure's own units: the league average with
     home field, each stat alone, both with free weights, both equally, the build's weights with no
     carry and with it, and each club's raw numbers so far this season (the mean of its games before
     this one, the offense's and the defense's, nothing of the opponents counted and nothing carried);
     by season, the seasons better, and the paired standard error by game against the raw numbers;
  6. information only: the carry each table would choose, leaving one season of 2013-2017 out at a
     time as units_fit.py chose UNIT_CARRY (the build holds one share for every stat); the same
     non-negative fit on 2012-2021 tested on 2022-2025;
  7. the constants as the build should carry them, and whether it does.
"""
import argparse, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import build  # noqa: E402
import units_fit as uf  # noqa: E402

FIRST, FIT_LAST, TEST_LAST = uf.FIRST, uf.FIT_LAST, uf.TEST_LAST
# each table: its label, its two stats (the measure first) and what it is held to predict
TABLES = {'run_def': ('Run Defense', ['repa', 'rsr'], 'EPA a run'),
          'pass_def': ('Pass Defense', ['pepa', 'psr'], 'EPA a dropback'),
          'pass_rush': ('Pass Rush', ['skr', 'hit'], 'sack rate')}
KEYS = ['repa', 'rsr', 'pepa', 'psr', 'skr', 'hit']


def fives(shares):
    """two shares of 100 rounded to fives, still summing to 100"""
    (a, x), (b, _) = list(shares.items())
    r = int(5 * round(x / 5))
    return {a: r, b: 100 - r}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true')
    a = ap.parse_args()
    t, last = uf.team_games(a.offline, keys=KEYS)
    t = t[t.season <= TEST_LAST].reset_index(drop=True)
    fit = (t.season <= FIT_LAST).values
    S = build.UNIT_STATS
    MU = {k: float(t.loc[fit, k].mean()) for k in KEYS}
    SD = {k: float(t.loc[fit, k].std()) for k in KEYS}
    Z = np.column_stack([S[k]['sign'] * (t[k].values - MU[k]) / SD[k] for k in KEYS])
    nh = fit & (t.home.values != 0)
    H = np.array([float(np.nanmean(Z[nh, c] * t.home.values[nh])) for c in range(len(KEYS))])
    K, C = build.UNIT_K, build.UNIT_CARRY
    O0, D0, final0 = uf._elo(t, Z, H, K)
    O, D = uf.run_elo(t, Z, H, K, C, final0)
    week, season, home, gid = t.week.values, t.season.values, t.home.values, t.game_id.values
    col = {k: i for i, k in enumerate(KEYS)}

    # each club's raw numbers so far this season: the mean of its games before this one, the
    # offense's own and the defense's allowed (nothing counted of who they played, nothing carried)
    raw = {}
    for k in KEYS:
        for side in ('off', 'def'):
            g = t.groupby(['season', side])[k]
            raw[(side, k)] = g.transform(lambda s: s.shift().expanding().mean()).values

    out = {}
    for name, (label, (m, o), unit) in TABLES.items():
        # the measure turned so that more is better for the offense (a sack rate counted negative), so
        # the offense's ratings add to it and the defense's take from it and every weight is >= 0; an
        # RMSE is the same either way round
        y = S[m]['sign'] * t[m].values
        ok = ~np.isnan(y)
        fm, em = ok & (season <= FIT_LAST) & (week >= 2), ok & (season > FIT_LAST) & (season <= TEST_LAST) & (week >= 2)
        print(f'\n{label}: the next game\'s {unit} (the offense\'s own number in it), {FIT_LAST + 1}-{TEST_LAST} weeks 2 on '
              f'({int(em.sum())} team-games; fitted on {int(fm.sum())} of {FIRST}-{FIT_LAST}), RMSE then by season:')
        res = {}

        def score(X, nm, positive=False, fm=fm, em=em, test=(FIT_LAST + 1, TEST_LAST), quiet=False):
            X = np.column_stack([np.ones(len(t)), X, home])
            X = np.where(np.isnan(X), np.nanmean(X[fm], 0), X)
            w = uf.nnls(X[fm], y[fm]) if positive else np.linalg.lstsq(X[fm], y[fm], rcond=None)[0]
            pred = X @ w
            rmse = float(np.sqrt(np.mean((pred[em] - y[em]) ** 2)))
            by = [float(np.sqrt(np.mean((pred[em & (season == s)] - y[em & (season == s)]) ** 2))) for s in range(test[0], test[1] + 1)]
            if not quiet:
                print(f'  {nm:58s} {rmse:.4f}   ' + ' '.join(f'{b:.4f}' for b in by))
            res[nm] = (rmse, by, pred, w)
            return rmse, by, pred, w

        lg = score(np.zeros((len(t), 0)), 'league average and home field')
        for k in (m, o):
            score(np.column_stack([O[:, col[k]], D[:, col[k]]]), f'{S[k]["def"].lower()} alone')
        two = [col[m], col[o]]
        score(np.column_stack([O[:, two], D[:, two]]), 'both, free weights')
        _, _, _, wn = score(np.column_stack([O[:, two], -D[:, two]]), 'both, weights >= 0', positive=True)
        offs, defs = wn[1:3], wn[3:5]
        sh = lambda part: {k: (100 * v / part.sum() if part.sum() > 0 else 50.0) for k, v in zip((m, o), part)}
        osh, dsh = sh(offs), sh(defs)
        print('      defense shares: ' + ', '.join(f'{k} {v:.1f}%' for k, v in dsh.items())
              + ';  offense shares: ' + ', '.join(f'{k} {v:.1f}%' for k, v in osh.items()))
        W, OW = fives(dsh), fives(osh)
        comp = lambda R, ws: sum(v / 100 * R[:, col[k]] for k, v in ws.items())
        score(np.column_stack([O[:, two].mean(1), D[:, two].mean(1)]), 'both, equal weights')
        r0, by0, p0, _ = score(np.column_stack([comp(O0, OW), comp(D0, W)]), 'the build\'s weights, each season from 0 (no carry)')
        rr, byr, pr, _ = score(np.column_stack([raw[('off', m)], raw[('off', o)], raw[('def', m)], raw[('def', o)]]),
                               'each club\'s raw numbers so far this season')
        rb, byb, pb, _ = score(np.column_stack([comp(O, OW), comp(D, W)]),
                               f'the build: defense {" ".join(f"{k}{v}" for k, v in W.items())} | offense {" ".join(f"{k}{v}" for k, v in OW.items())}')

        def paired(p_new, p_old):
            d = pd.Series((p_new[em] - y[em]) ** 2 - (p_old[em] - y[em]) ** 2).groupby(gid[em]).sum()
            return float(d.mean() / 2), float(d.std() / np.sqrt(len(d)) / 2)
        dr, ser = paired(pb, pr)
        d0, se0 = paired(pb, p0)
        dl, sel = paired(pb, lg[2])
        better_raw = sum(x < z for x, z in zip(byb, byr))
        better_0 = sum(x < z for x, z in zip(byb, by0))
        print(f'  the build against the raw numbers so far: {rb:.4f} against {rr:.4f}; squared error a team-game {dr:+.6f}, '
              f'standard error {ser:.6f} (by game); better in {better_raw} of {len(byb)} seasons')
        print(f'  the build against the same weights with no carry: {rb:.4f} against {r0:.4f}; {d0:+.6f} ({se0:.6f}); better in {better_0} of {len(byb)} seasons')
        print(f'  the build against the league average: {rb:.4f} against {lg[0]:.4f}; {dl:+.6f} ({sel:.6f})')

        # stability: the same non-negative fit on 2012-2021, tested on 2022-2025
        fm2, em2 = ok & (season <= 2021) & (week >= 2), ok & (season >= 2022) & (season <= TEST_LAST) & (week >= 2)
        _, _, _, w2 = score(np.column_stack([O[:, two], -D[:, two]]), 'stability: weights >= 0, fitted 2012-2021, tested 2022-2025',
                            positive=True, fm=fm2, em=em2, test=(2022, TEST_LAST))
        print('      defense shares: ' + ', '.join(f'{k} {v:.1f}%' for k, v in sh(w2[3:5]).items())
              + ';  offense shares: ' + ', '.join(f'{k} {v:.1f}%' for k, v in sh(w2[1:3]).items()))

        # information only: the carry this table alone would choose (the build holds one share for every stat)
        reg = t.reg.values.astype(bool)

        def loso(c):
            Oc, Dc = uf.run_elo(t, Z, H, K, c, final0)
            X = np.column_stack([np.ones(len(t)), comp(Oc, OW), comp(Dc, W), home])
            rows = ok & reg & (week >= 2) & (season <= FIT_LAST)
            se = []
            for s_ in range(FIRST + 1, FIT_LAST + 1):
                w_ = np.linalg.lstsq(X[rows & (season != s_)], y[rows & (season != s_)], rcond=None)[0]
                mm = rows & (season == s_)
                se.append((X[mm] @ w_ - y[mm]) ** 2)
            return float(np.sqrt(np.mean(np.concatenate(se))))
        tried = {c: loso(c) for c in (0.0, 0.2, 0.3, 0.4, C, 0.5, 0.6, 0.8)}
        pick = min(tried, key=lambda c: (tried[c], c))
        print(f'  the carry this table alone would choose on {FIRST + 1}-{FIT_LAST} (information only; the build holds {C}): '
              + '  '.join(f'{c:.2f} {v:.5f}' for c, v in sorted(tried.items())) + f'  -> {pick}')

        out[name] = {'label': label, 'side': 'def', 'w': W, 'opp': OW,
                     'wf': {'target': m, 'measure': unit, 'rmse': round(rb, 4), 'raw': round(rr, 4), 'no_carry': round(r0, 4),
                            'league': round(lg[0], 4), 'se': float(f'{ser:.3g}'), 'seasons_better': better_raw, 'seasons': len(byb),
                            'fit': f'{FIRST}-{FIT_LAST}', 'test': f'{FIT_LAST + 1}-{TEST_LAST}', 'carry': C}}

    # the constants, as the build should carry them
    print('\nthe constants (mean, spread of a team-game 2012-2017; home field in standard deviations):')
    differ = []
    for c, k in enumerate(KEYS):
        want = (round(MU[k], 4), round(SD[k], 4), round(float(H[c]), 3))
        have = (S[k]['mu'], S[k]['sd'], S[k]['home'])
        print(f"  {k:6s} 'mu': {want[0]}, 'sd': {want[1]}, 'home': {want[2]}" + ('' if want == have else f'   <- the build has {have}'))
        differ += [] if want == have else [k]
    have = getattr(build, 'UNIT_TABLES', {})
    print('  UNIT_TABLES = {')
    for name, v in out.items():
        print(f'      {name!r}: {v},')
        differ += [] if have.get(name) == v else [name]
    print('  }')
    print('  the build carries these constants' if not differ else f'  THE BUILD DIFFERS ({", ".join(differ)}): paste the lines above into elo/build.py')


if __name__ == '__main__':
    main()
