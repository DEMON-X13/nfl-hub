#!/usr/bin/env python3
"""Averages by Elo level: the fit behind ELO_AVG in elo/build.py, each positional leg's projection from the
player's own average, the opposing defence's ELO-tab table rating and his own Elo. Run by hand, offline from the
job, as units_fit.py, def_units_fit.py and joker_base_fit.py are, after a season ends: its numbers are pasted into
the build, which applies them every run on the ratings as they stand and never refits them on the season in play.

    python3 elo/tools/elo_avg_fit.py              # downloads what it lacks into elo/cache/ (the build's files, the
                                                  # play-by-play of the seasons fitted and the one before, the snap counts)
    python3 elo/tools/elo_avg_fit.py --offline    # the cache only

The owner (29 October 2026): "i want for elo suggestions to match up certain averages vs other averages and adjusted
for their overall elo rating ... get the elo pass defense of the panthers and what average catches they allow against
players against that elo. it shouldnt be 1:1 comparison it should be dependent on averages on the elo level they face
... there should be some level of ranking adjustment each week so that we get accurate estimates based on their
current elo ... I want this for every single positional leg and adjustments done every week like the rankings."

THE PROJECTION. For an expected starter and a game, everything as it stood before kickoff:

    log(projection) = log(his average) + intercept + the leg's terms

  * his average: his own games on the stat as a regular (involvement at least 0.8 of the position's norm, VOLUME,
    the matchup formula's rule; a kicker every game he kicked), the most recent weighted most (half-life h of his
    regular games; none: equal weights), each season boundary crossed multiplying a game's weight by c, and k
    games' worth of the position's mean over every season before added; floored at eps;
  * the defence's level, E: the opposing club's rating on the ELO Ratings tab's table that faces the stat (Pass
    Defense for receiving and passing stats, Run Defense for rushing, Overall Defense for some touchdowns and the
    kicker), as the build keeps it (raw: unit_elo's rating, every stat in standard deviations) or as the tab shows it
    that week (shown: (elo - 1500) / 100), going into the game: re-rated after every final, carried 0.42 into a
    season, as the tab is;
  * his own Elo, P: (rating - 1500) / 100, his career rating R or his season rating RS going into the game, and E x P;
  * log_avg: a weight of its own on log(average), where it was chosen (the projection then goes as the average to the
    power 1 + w: a high average tends to come down);
  * and on some legs the matchup formula's other terms: home, what the defence has allowed the position on the stat
    (log of its half-life-six average over the fit rows' mean, elo/build.py's `allowed`), the opposing defenders'
    player Elo (DL, LB, DB: the game model's expected lineups, (rating - 1500) / 100), his club's own offence table
    on the same facet (raw), and the receiver's place in his club's pecking order going in (rk0: first on targets,
    rk1: second, a wide receiver's).

  A quasi-Poisson regression (log link, the average as the offset, a ridge of 1 on every term but the intercept and
  log_avg), fitted on EVERY game of an expected starter judged before kickoff: the club's charted QB1, RB1, WR1-3,
  TE1 or K1 in the build's pre-game lineup (the depth chart less the week's Outs and Doubtfuls), with three regular
  games behind him, regular season and playoffs, every completed season from 2016; his games with nothing on the
  stat line (no row in the build's log, which keeps a player-game only with involvement above zero) put back as
  zeros where he took a snap (an offensive snap; a kicker's special-teams snap) in nflverse's snap counts, placed by
  his PFR id through nflverse's players file. So the projection is unconditional: it carries how often a starter's
  game turns out quiet, which a fit on regulars' games (the matchup formula's) does not (it ran about +30% high on a
  receiver's and a tight end's catches and yards on those rows).

THE CHOICES (frozen; research of 29 October 2026, scratchpad eloavg/REPORT.md and freeze.py, never on 2026). Each
leg's average (h, k, c), table, scale and shape (90 x 12-48 candidates) were chosen by RMSE on a walk-forward of
2018-2025 (each season fitted on 2016 to the season before), every choice nested on earlier seasons in the honest
score; then its variant, by the same rule, once, on 2018-2025: c (the terms above but the formula's), crk (c plus
the receiver's rank, a WR's catches and yards) or d (c plus home, allowed, the opposing defenders' player Elo, his
club's offence table and the rank where c has one). SPEC below holds them. A tight end's catches and yards are c,
never crk (the review of 29 October 2026): the expected lineup carries one tight end, so his rank is first on all
but 10 of 4,891 fit rows (a lineup fallen back to the last game's players, listing two), and the rule took crk on
those rows alone (RMSE 0.0003 and 0.0008 lower, level), its rank coefficient split from the intercept by the ridge
alone and differently in the no-Elo twin, so a run-time lineup listing two tight ends moved his projection and his
Elo part by the split (a receiving yards Elo part of -1.1 sd on a 50% line). On c the two legs' Elo parts are
trusted as on crk (nested walk-forward: catches -0.049 [-0.069, -0.030], 67.9%; yards -0.476 [-0.623, -0.329], 63.8%).

THE ELO PART, which the Elo picks move DraftKings' fair chance by (the owner's honesty rule of app v138: never the
projection's own P(over)): the projection less the same leg's projection refitted with its Elo terms dropped (E, P,
E x P, and DL, LB, DB: the defence's level and his own Elo; the average, log_avg, home, allowed, his club's offence
table and the rank stay; not the full fit with those terms at 0 or at the fit rows' means, which on the nested
walk-forward moved the no-Elo projection worse than the twin's part on 10 of the 11 trusted legs (level on a QB's
interceptions), and at the means leaned the right way less often on its largest fifth on all 11: the review of 29
October 2026, scratchpad eloavg_rev/elopart_def.py), in the stat's sd at the projection from the leg's spread,
fitted on the same rows: a negative binomial for a count more spread than a Poisson's (var = mu + mu^2 / r), var =
phi mu for a count less spread, a Poisson for the anytime touchdown (P(1+) is the leg), and for the yards the rows'
own sd of outcome over projection within fifths of the projection (edges in the projection's units), times the
projection. A leg's Elo part is trusted (offered to the Elo picks) only where, on the nested walk-forward 2019-2025,
the full projection beat the no-Elo one on RMSE (the 90% two-way cluster-robust interval below zero) and the sign of
the Elo part was the sign of the outcome less the no-Elo projection more than half the time on its largest fifth (by
|Elo part / sd|), both on the fully nested procedure and on the frozen variant: SPEC's `trusted`, frozen with the
choices.

What it does:
  1. the schedule (games.csv), and the last completed season (every game of it final, its Super Bowl among them):
     the fit is every season from 2016 to it, and nothing of a later season is read;
  2. the build's own rating loop (elo/build.py's main, on the schedule cut to that season, loaded with four
     asserted in-memory edits that change no rating, unit or lineup: the schedule cut; the season rating kept for
     every season, not only the one in play; each logged game's week and his season rating going in; and main
     stopped after the loop, so it writes nothing, not even elo/cache/features.json), giving every logged
     player-game (the build logs a kicker's beside the others, with his field goals and extra points made) with its
     pre-game career and season ratings, the game model's pre-game lineups and the opposing defenders' strengths;
  3. each club's pre-game rating on every table of the ELO Ratings tab, each week of 2016 to that season, on the
     build's own unit code (pbp_team_games, unit_carry, unit_elo; the shown scale as unit_ratings draws a table);
  4. the frame: every logged game and every expected starter's zero game (step 2's lineups and the snap counts);
  5. each leg's spec fitted on every completed season 2016 on (the full projection and its no-Elo twin), its
     spread, and its walk-forward record: each season from 2018 projected by the same spec fitted on 2016 to the
     season before (the frozen choice scored on the seasons it was chosen on, so a little flattered), regular season:
     RMSE, the no-Elo twin's, and the sign of the Elo part on its largest fifth;
  6. the constants as the build should carry them (ELO_AVG), and whether it does.
"""
import argparse, bisect, math, os, sys, tempfile, types

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build  # noqa: E402

SNAP_URL = 'https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_{y}.csv'
PLAYERS_URL = 'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv'
FIT_FIRST, REC_FIRST = 2016, 2018      # the first season fitted on; the first season the walk-forward record projects
TOP = {'QB': 1, 'RB': 1, 'WR': 3, 'TE': 1, 'K': 1}     # the expected starters: QB1, RB1, WR1-3, TE1, K1
MIN_GAMES = 3                          # regular games behind him
REGULAR = 0.8                          # a regular's game: involvement at least this share of build.VOLUME (a kicker: any)
PEN = 1.0                              # the ridge on every term but the intercept and log_avg
CARRY = build.CARRY                    # a zero game's career rating where his next logged game is in another season
DEF_TABLES = ['def', 'run_def', 'pass_def', 'pass_rush']
OFF_TABLES = ['off', 'run_off', 'pass_off', 'pass_pro']
OWN = {'pass_def': 'pass_off', 'run_def': 'run_off', 'def': 'off', 'pass_rush': 'pass_pro'}
ELO_TERMS = ('E:', 'P', 'EP', 'DL', 'LB', 'DB')        # the Elo part's terms: the defence's level and his own Elo
FORMULA = ['home', 'log_allowed', 'DL', 'LB', 'DB']    # (d)'s terms beside his club's offence table and the rank

# Each leg's frozen choice. avg: (h, k, c); tables, scale; player: R (career), RS (season) or None (no player term);
# weight: a free weight on log(average); variant: c, crk or d (above); trusted: its Elo part, by the nested
# walk-forward 2019-2025 (frozen variant / fully nested procedure: the RMSE difference full less no-Elo and the sign
# right on its largest fifth; both must pass). Variant by RMSE 2018-2025 on the frozen spec, c / d (/ crk).
SPEC = {
    # c 77.591 d 77.310; Elo part level (-0.006 [-0.171, +0.159], 53.5%)
    'QB|passing_yards': {'kind': 'yards', 'avg': (20, 1, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': False},
    # c 1.1365 d 1.1337; level (-0.0026 [-0.0059, +0.0007], 52.6%)
    'QB|passing_tds': {'kind': 'count', 'avg': (6, 2, 1.0), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': False},
    # c 6.2980 d 6.2809; level on the frozen variant (+0.0000 [-0.0135, +0.0136], 54.3%; the nested procedure better)
    'QB|completions': {'kind': 'count', 'avg': (20, 4, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': False, 'variant': 'd', 'trusted': False},
    # c 8.9521 d 8.9438; level (+0.0084 [-0.0049, +0.0217], 49.6%)
    'QB|attempts': {'kind': 'count', 'avg': (8, 8, 1.0), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': False},
    # c 0.8598 d 0.8616; better (-0.0013 [-0.0022, -0.0005], 53.1%)
    'QB|passing_interceptions': {'kind': 'count', 'avg': (None, 8, 1.0), 'tables': ['pass_def'], 'scale': 'shown', 'player': None, 'weight': True, 'variant': 'c', 'trusted': True},
    # c 16.387 d 16.480; level (-0.013 [-0.079, +0.053], 49.3%)
    'QB|rushing_yards': {'kind': 'yards', 'avg': (40, 1, 0.5), 'tables': ['run_def'], 'scale': 'raw', 'player': 'R', 'weight': False, 'variant': 'c', 'trusted': False},
    # c 2.3012 d 2.3096; level (-0.0017 [-0.0062, +0.0029], 50.5%)
    'QB|carries': {'kind': 'count', 'avg': (12, 1, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': 'R', 'weight': False, 'variant': 'c', 'trusted': False},
    # c 0.4294 d 0.4302; worse (+0.0012 [+0.0003, +0.0021], 48.7%)
    'QB|any_td': {'kind': 'td', 'avg': (20, 8, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': None, 'weight': False, 'variant': 'c', 'trusted': False},
    # c 36.176 d 36.160; better (-0.145 [-0.278, -0.012], 57.9%)
    'RB|rushing_yards': {'kind': 'yards', 'avg': (3, 0, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': True},
    # c 5.6773 d 5.6755; better (-0.064 [-0.087, -0.041], 60.9%)
    'RB|carries': {'kind': 'count', 'avg': (2, 0, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': True},
    # c 1.8876 d 1.8820; level (+0.0004 [-0.0051, +0.0059], 53.7%)
    'RB|receptions': {'kind': 'count', 'avg': (6, 2, 1.0), 'tables': ['pass_def'], 'scale': 'shown', 'player': 'RS', 'weight': False, 'variant': 'd', 'trusted': False},
    # c 19.045 d 19.058; level (-0.032 [-0.100, +0.035], 57.3%)
    'RB|receiving_yards': {'kind': 'yards', 'avg': (40, 2, 0.5), 'tables': ['pass_def'], 'scale': 'shown', 'player': 'R', 'weight': False, 'variant': 'c', 'trusted': False},
    # c 41.358 d 41.361; better (-0.487 [-0.685, -0.289], 60.2%)
    'RB|scrim_yards': {'kind': 'yards', 'avg': (3, 0, 1.0), 'tables': ['run_def', 'pass_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'c', 'trusted': True},
    # c 0.7550 d 0.7536; level on the frozen variant (-0.0027 [-0.0058, +0.0005], 57.2%; the nested procedure better)
    'RB|any_td': {'kind': 'td', 'avg': (4, 4, 1.0), 'tables': ['def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': False},
    # c 2.3022 d 2.2814 crk 2.2796; better (-0.020 [-0.028, -0.013], 60.8%)
    'WR|receptions': {'kind': 'count', 'avg': (12, 0, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'crk', 'trusted': True},
    # c 35.292 d 35.011 crk 35.000; better (-0.257 [-0.373, -0.141], 59.1%)
    'WR|receiving_yards': {'kind': 'yards', 'avg': (20, 0, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'crk', 'trusted': True},
    # c 0.5411 d 0.5409; better (-0.0058 [-0.0073, -0.0043], 64.3%)
    'WR|any_td': {'kind': 'td', 'avg': (6, 0, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': True},
    # c 2.1287 d 2.1333 (crk 2.1284: a tight end is c, above); better (-0.049 [-0.069, -0.030], 67.9%)
    'TE|receptions': {'kind': 'count', 'avg': (8, 0, 0.5), 'tables': ['pass_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'c', 'trusted': True},
    # c 26.997 d 27.054 (crk 26.997: a tight end is c, above); better (-0.476 [-0.623, -0.329], 63.8%)
    'TE|receiving_yards': {'kind': 'yards', 'avg': (6, 0, 1.0), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'c', 'trusted': True},
    # c 0.5094 d 0.5100; better (-0.0057 [-0.0077, -0.0037], 62.0%)
    'TE|any_td': {'kind': 'td', 'avg': (3, 0, 1.0), 'tables': ['def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'c', 'trusted': True},
    # c 1.2003 d 1.2019; level (+0.0000 [-0.0014, +0.0014], 52.7%)
    'K|fg_made': {'kind': 'count', 'avg': (12, 0, 0.5), 'tables': ['def'], 'scale': 'shown', 'player': 'RS', 'weight': True, 'variant': 'c', 'trusted': False},
    # c 3.6202 d 3.6174; better (-0.0066 [-0.0130, -0.0002], 53.9%; the nested procedure 56.8%)
    'K|kick_pts': {'kind': 'yards', 'avg': (None, 2, 0.5), 'tables': ['def'], 'scale': 'shown', 'player': None, 'weight': True, 'variant': 'd', 'trusted': True},
}

# the four edits to elo/build.py, applied in memory to its text, each asserted to land exactly once (the build itself
# logs a kicker's games and his field goals and extra points made, which its averages read)
PATCHES = [
    ("    games = games[games.season >= FIRST].copy()\n",
     "    games = games[(games.season >= FIRST) & (games.season <= ELO_AVG_LAST)].copy()\n"),
    ("RSd = {s: {} for s in {last, rank_season}}",
     "RSd = {s: {} for s in set(int(x) for x in seasons) | {last, rank_season}}"),
    ("'vol': float(r.vol), **{c: (0.0 if pd.isna(getattr(r, c, 0)) else float(getattr(r, c, 0))) for c in MU_COLS + AVG_COLS}})",
     "'vol': float(r.vol), 'week': int(row.week), 'RS': RSd[int(season)].get(pid, 1500.0), "
     "**{c: (0.0 if pd.isna(getattr(r, c, 0)) else float(getattr(r, c, 0))) for c in MU_COLS + AVG_COLS}})"),
    ("    print(f'  {len(R)} players rated over",
     "    raise ELO_AVG_LOOP(locals())\n    print(f'  {len(R)} players rated over"),
]


class Loop(Exception):
    """main()'s locals at the end of the rating loop"""
    def __init__(self, env):
        super().__init__('rating loop done')
        self.env = env


def last_completed(offline):
    """the newest season whose every game is final, its Super Bowl among them"""
    dest = os.path.join(build.CACHE, 'games.csv')
    if not offline and os.path.exists(dest):
        os.remove(dest)                    # scores land every week: as the build, never a cached schedule
    g = pd.read_csv(build.fetch(build.GAMES_URL, dest, offline), low_memory=False)
    done = [int(s) for s, x in g.groupby('season') if (x.game_type == 'SB').any() and x.home_score.notna().all()]
    if not done:
        raise SystemExit('elo_avg_fit: no completed season in games.csv')
    return max(done)


def rating_loop(offline, last):
    """the build's own rating loop on the schedule through `last` (PATCHES): main()'s locals after it"""
    path = build.__file__
    src = open(path).read()
    for old, new in PATCHES:
        n = src.count(old)
        if n != 1:
            raise SystemExit(f'elo_avg_fit: elo/build.py has changed where this tool edits it ({n} matches of {old.strip()[:70]!r})')
        src = src.replace(old, new)
    mod = types.ModuleType('elo_build_avg')
    mod.__file__ = path
    mod.ELO_AVG_LOOP, mod.ELO_AVG_LAST = Loop, last
    exec(compile(src, path, 'exec'), mod.__dict__)
    argv = sys.argv
    with tempfile.TemporaryDirectory(prefix='elo_avg_') as tmp:
        mod.OUT, mod.PAST_LIST = os.path.join(tmp, 'data'), os.path.join(tmp, 'past.lst')    # nothing of the job's touched
        sys.argv = ['build.py'] + (['--offline'] if offline else [])
        try:
            mod.main()
        except Loop as e:
            return e.env
        finally:
            sys.argv = argv
    raise SystemExit('elo_avg_fit: the build\'s rating loop did not stop where this tool stops it')


def unit_tables_pregame(games, last, offline):
    """each club's rating going into each week on every table of the ELO Ratings tab, FIT_FIRST to last:
    {(season, week, team, table): (raw, shown)}"""
    tabs = build.unit_tables()
    tg_cache = {}

    def tg_of(y):
        if y not in tg_cache:
            dest = os.path.join(build.CACHE, f'play_by_play_{y}.csv.gz')
            pbp = pd.read_csv(build.fetch(build.PBP_URL.format(y=y), dest, offline), usecols=build.PBP_COLS, low_memory=False)
            tg_cache[y] = build.pbp_team_games(pbp)
        return tg_cache[y]
    out = {}
    for y in range(FIT_FIRST, last + 1):
        gy = games[games.season == y]
        start = build.unit_carry(games[games.season == y - 1], *tg_of(y - 1))
        tg, score = tg_of(y)
        R, S, acc, hist, record, pending, teams = build.unit_elo(gy, tg, score, start)
        if pending:
            raise SystemExit(f'elo_avg_fit: {y} has finals its play-by-play lacks ({pending[:4]}): fetch play_by_play_{y}.csv.gz again')
        for n, (side, W, _) in tabs.items():
            s0 = {t: sum(w / 100 * S[side][k][t] for k, w in W.items()) for t in teams}
            for wk in sorted(set(int(w) for w in gy.week)):
                cur = {}
                for t in teams:
                    prior = [v for w_, v in hist[n][t] if w_ < wk]
                    cur[t] = prior[-1] if prior else s0[t]
                rated = [t for t in teams if any(w_ < wk for w_, _ in hist[n][t]) or (start and t in start)]
                v = np.array([cur[t] for t in rated]) if rated else np.zeros(1)
                mu, sd = float(v.mean()), float(v.std())
                for t in teams:
                    out[(y, wk, t, n)] = (cur[t], 1500 + 100 * (cur[t] - mu) / sd if sd > 1e-9 else 1500.0)
    return out


def targets_before(log):
    """each receiver's targets going into a game (the matchup formula's pecking-order rule): the average, half-life
    four games, after each of his logged games, looked up by the last one before the game in question"""
    d = pd.DataFrame([r for r in log if r['group'] != 'K']).sort_values(['season', 'ord'], kind='mergesort')
    d['after'] = d.groupby('pid').targets.transform(lambda v: v.ewm(halflife=build.MU_FORM_HL).mean())
    h = {}
    for pid, key, v in zip(d.pid, d.season * 1000 + d.ord, d.after):
        e = h.setdefault(pid, ([], []))
        e[0].append(int(key))
        e[1].append(float(v))

    def before(pid, key):
        e = h.get(pid)
        i = bisect.bisect_left(e[0], key) if e else 0
        return e[1][i - 1] if i else 0.0

    def rank(pid, mates, key, group):
        mine = before(pid, key)
        r = sum(1 for q in set(mates) if q != pid and before(q, key) > mine)
        k = build.MU_RANK[group]
        return float(r == 0), float(r == 1 and k > 1)
    return rank


def make_frame(env, units, snaps, pfr):
    """every logged player-game (QB, RB, WR, TE, K) and every expected starter's zero game, with what was known
    before it: his ratings, the club tables (the opponent's defence, his own offence), the opposing defenders'
    player Elo, his slot in the pre-game lineup and his place in the pecking order"""
    log, lineups, feat = env['mu_log'], env['mu_lineups'], {f['game_id']: f for f in env['game_feat']}
    rank = targets_before(log)
    d = pd.DataFrame(log)
    d['zero'] = False
    have = set(zip(d.game_id, d.pid))
    hist = {pid: x.sort_values(['season', 'ord'], kind='mergesort')[['season', 'ord', 'R', 'RS']].to_numpy()
            for pid, x in d.groupby('pid')}
    keys = {pid: [int(r[0]) * 1000 + int(r[1]) for r in v] for pid, v in hist.items()}
    slot, zeros = {}, []
    for (gid, team), parts in lineups.items():
        c = {}
        for pid, grp in parts:
            c[grp] = c.get(grp, 0) + 1
            slot[(gid, pid)] = c[grp]
        f = feat.get(gid)
        if f is None or gid not in snaps:
            continue
        season, ordw = int(f['season']), int(f['ord'])
        c = {}
        for pid, grp in parts:
            c[grp] = c.get(grp, 0) + 1
            if grp not in TOP or c[grp] > TOP[grp] or (gid, pid) in have or pid not in hist:
                continue
            s = snaps[gid].get(pfr.get(pid))
            if s is None or not ((s[1] > 0) if grp == 'K' else (s[0] > 0)):
                continue                   # no snap: he did not play, and a book voids his props
            key = season * 1000 + ordw
            h, i = hist[pid], bisect.bisect_left(keys[pid], key)
            prev, nxt = (h[i - 1] if i > 0 else None), (h[i] if i < len(h) else None)
            if nxt is not None and int(nxt[0]) == season:
                R = float(nxt[2])          # R moves only on a logged game: his next one's pre-game rating
            elif prev is not None:
                R = 1500 + CARRY ** (season - int(prev[0])) * (float(prev[2]) - 1500)
            else:
                R = float(nxt[2])
            if nxt is not None and int(nxt[0]) == season:
                RS = float(nxt[3])
            elif prev is not None and int(prev[0]) == season:
                RS = float(prev[3])
            else:
                RS = 1500.0
            r = {'season': season, 'ord': ordw, 'week': int(f['week']), 'game_id': gid, 'pid': pid, 'group': grp, 'team': team,
                 'opp': f['away'] if team == f['home'] else f['home'], 'home': int(team == f['home']), 'R': R, 'RS': RS,
                 'vol': 0.0, 'zero': True}
            for col in build.MU_COLS + build.AVG_COLS:
                r[col] = 0.0
            zeros.append(r)
    d = pd.concat([d, pd.DataFrame(zeros)], ignore_index=True)
    d['scrim_yards'] = d.rushing_yards + d.receiving_yards
    d['any_td'] = d.rushing_tds + d.receiving_tds
    d['kick_pts'] = 3 * d.fg_made + d.pat_made
    d = d.sort_values(['season', 'ord', 'game_id', 'pid'], kind='mergesort').reset_index(drop=True)
    for tabs, who in ((DEF_TABLES, d.opp), (OFF_TABLES, d.team)):
        for t in tabs:
            v = [units.get((s, w, c, t), (np.nan, np.nan)) for s, w, c in zip(d.season, d.week, who)]
            d['u_' + t] = [x[0] for x in v]
            d['s_' + t] = [x[1] for x in v]
    for u in build.MU_DEF:
        d['o' + u] = [((feat[gid]['sa'] if t == feat[gid]['home'] else feat[gid]['sh']).get(u, np.nan) - 1500) / 100
                      if gid in feat else np.nan for gid, t in zip(d.game_id, d.team)]
    d['slot'] = [slot.get((gid, pid), 0) for gid, pid in zip(d.game_id, d.pid)]
    rk = [rank(pid, [p for p, g in lineups.get((gid, t), []) if g == grp], s * 1000 + o, grp) if grp in build.MU_RANK else (0.0, 0.0)
          for pid, gid, t, s, o, grp in zip(d.pid, d.game_id, d.team, d.season, d.ord, d.group)]
    d['rk0'], d['rk1'] = [x[0] for x in rk], [x[1] for x in rk]
    return d


# ---- one leg: the rows, his average, the terms, the fits ----
def position_frame(frame, pos):
    d = frame[frame.group == pos].sort_values(['season', 'ord', 'game_id', 'pid'], kind='mergesort').reset_index(drop=True)
    d['reg'] = (d.vol >= REGULAR * build.VOLUME[pos]) if pos != 'K' else (d.vol > 0)
    d['nreg'] = d.groupby('pid').reg.transform(lambda v: v.astype(int).shift(1, fill_value=0).cumsum())
    d['starter'] = (d.slot >= 1) & (d.slot <= TOP[pos])
    d['regseason'] = d.ord <= 18
    return d


def prior_means(d, col):
    """the position's mean on the stat over regular games of every season before each (the first: its own)"""
    r = d[d.reg]
    by = r.groupby('season')[col].agg(['sum', 'count'])
    out, s, n = {}, 0.0, 0
    for y in sorted(set(d.season)):
        out[y] = s / n if n else float(r[r.season == y][col].mean())
        if y in by.index:
            s += by.loc[y, 'sum']
            n += by.loc[y, 'count']
    return d.season.map(out).values


def average_before(d, col, h, k, c, prior):
    """each game's average as of the game before it: his regular games weighted 0.5 ** (age / h) in games (h None:
    equal weights), c per season boundary crossed, and k pseudo-games at the position's prior mean"""
    dec = 0.5 ** (1.0 / h) if h else 1.0
    L = (np.log(c) / np.log(dec)) if (c < 1 and dec < 1) else 0.0
    out = np.full(len(d), np.nan)
    y, reg, seas = d[col].values.astype(float), d.reg.values, d.season.values
    for pid, idx in d.groupby('pid').indices.items():
        r, yy, s = reg[idx], y[idx], seas[idx]
        nb = np.concatenate([[0], np.cumsum(r)[:-1]])
        if dec < 1:
            tau, tau_j = nb - 1 + L * (s - s[0]), nb + L * (s - s[0])
            base = tau_j.min()
            e = np.where(r, dec ** (-(tau_j - base)), 0.0)
            f = dec ** (tau - base)
            S, W = np.concatenate([[0], np.cumsum(e * yy)[:-1]]) * f, np.concatenate([[0], np.cumsum(e)[:-1]]) * f
        elif c < 1:
            e = np.where(r, c ** (-(s - s[0])), 0.0)
            f = c ** (s - s[0])
            S, W = np.concatenate([[0], np.cumsum(e * yy)[:-1]]) * f, np.concatenate([[0], np.cumsum(e)[:-1]]) * f
        else:
            S, W = np.concatenate([[0], np.cumsum(np.where(r, yy, 0.0))[:-1]]), nb.astype(float)
        p = prior[idx]
        with np.errstate(invalid='ignore', divide='ignore'):
            out[idx] = np.where(W + k > 0, (S + k * p) / (W + k), np.nan)
    return out


def allowed(d, col, fit_reg):
    """what each defence allowed the position on the stat, per game, as of its previous game (half-life six games),
    and the fit rows' mean it is put over: elo/build.py's `allowed`, for any stat"""
    a = d[d.reg].groupby(['season', 'ord', 'opp'])[col].mean().reset_index().sort_values(['season', 'ord'])
    a['a'] = a.groupby('opp')[col].transform(lambda v: v.shift(1).ewm(halflife=build.MU_ALLOWED_HL, min_periods=1).mean())
    m = d[['season', 'ord', 'opp']].merge(a[['season', 'ord', 'opp', 'a']], on=['season', 'ord', 'opp'], how='left')
    mean = float(np.nanmean(d.loc[fit_reg, col].values))
    return m['a'].fillna(mean).values / mean, mean


def pois_fit(X, y, off, pen, w0=None, iters=60):
    """quasi-Poisson (log link) by Newton's method: X'(y - mu) = pen * w, the first column an unpenalised intercept"""
    w = np.zeros(X.shape[1]) if w0 is None else w0.copy()
    if w0 is None:
        w[0] = np.log(max(np.mean(y), 1e-6) / np.mean(np.exp(off)))
    P = np.diag(pen)
    for _ in range(iters):
        mu = np.exp(np.clip(X @ w + off, -30, 30))
        step = np.linalg.solve((X.T * mu) @ X + P, X.T @ (y - mu) - P @ w)
        mx = np.abs(step).max()
        if mx > 5:
            step *= 5 / mx
        w += step
        if mx < 1e-9:
            break
    return w


def nb_size(y, mu):
    """the negative binomial's size r (var = mu + mu^2 / r) by maximum likelihood on integer counts, over log r in
    [-3, 11.5] by golden section: the gamma terms summed exactly as sum_j (rows with y > j) log(r + j)"""
    y = np.rint(np.asarray(y, float)).astype(int)
    mu = np.maximum(np.asarray(mu, float), 1e-3)
    cnt = np.bincount(y, minlength=y.max() + 1)
    above = (len(y) - np.cumsum(cnt))[:-1]               # rows with y > j, j = 0 .. max - 1
    j = np.arange(len(above))
    sy = float(y.sum())

    def nll(lr):
        r = math.exp(lr)
        return -(float(np.sum(above * np.log(r + j))) + float(np.sum(r * np.log(r / (r + mu)) + y * np.log(mu / (r + mu)))))
    a, b = -3.0, 11.5
    g = (math.sqrt(5) - 1) / 2
    c, e = b - g * (b - a), a + g * (b - a)
    fc, fe = nll(c), nll(e)
    while b - a > 1e-9:
        if fc < fe:
            b, e, fe = e, c, fc
            c = b - g * (b - a)
            fc = nll(c)
        else:
            a, c, fc = c, e, fe
            e = a + g * (b - a)
            fe = nll(e)
    return math.exp((a + b) / 2) if sy > 0 else 1e5


def spread(kind, y, mu):
    """the outcome's spread around a projection, fitted on rows y with projections mu"""
    mu = np.maximum(mu, 1e-3)
    phi = float(np.sum((y - mu) ** 2) / np.sum(mu))
    if kind == 'td':
        return {'dist': 'poisson'}
    if kind == 'count':
        return {'dist': 'nb', 'r': round(nb_size(y, mu), 4)} if phi >= 1 else {'dist': 'qp', 'phi': round(phi, 4)}
    edges = np.quantile(mu, [0.2, 0.4, 0.6, 0.8])
    b = np.searchsorted(edges, mu)
    return {'dist': 'ratio', 'edges': [round(float(v), 4) for v in edges],
            'rsd': [round(float(np.std(y[b == i] / mu[b == i])), 4) for i in range(5)]}


def sd_of(sp, mu):
    """the outcome's sd at projection mu under spread sp"""
    mu = np.maximum(np.asarray(mu, float), 1e-3)
    if sp['dist'] == 'poisson':
        return np.sqrt(mu)
    if sp['dist'] == 'nb':
        return np.sqrt(mu + mu * mu / sp['r'])
    if sp['dist'] == 'qp':
        return np.sqrt(sp['phi'] * mu)
    return mu * np.array(sp['rsd'])[np.searchsorted(np.array(sp['edges']), mu)]


def leg_terms(spec):
    """the full projection's terms and its no-Elo twin's, intercept first"""
    t = ['one'] + ['E:' + x for x in spec['tables']] + (['P', 'EP'] if spec['player'] else []) + (['log_avg'] if spec['weight'] else [])
    rk = ['rk0'] + (['rk1'] if spec['_pos'] == 'WR' else []) if spec['variant'] in ('crk', 'd') and spec['_rk'] else []
    own = 'own:' + OWN[spec['tables'][0]]
    extra = (FORMULA + [own] + rk) if spec['variant'] == 'd' else rk
    full = t + extra
    return full, [x for x in full if not x.startswith(ELO_TERMS)]


class Leg:
    def __init__(self, frame, key, last):
        pos, col = key.split('|')
        sp = dict(SPEC[key], _pos=pos, _rk=pos == 'WR' and col in ('receptions', 'receiving_yards'))     # a TE's: c, above
        self.key, self.pos, self.col, self.spec, self.kind = key, pos, col, sp, sp['kind']
        d = position_frame(frame, pos)
        self.d, self.y, self.seas = d, d[col].values.astype(float), d.season.values
        prior = prior_means(d, col)
        self.eps = 0.01 * float(np.nanmedian(prior[prior > 0])) if (prior > 0).any() else 0.01
        self.avg = average_before(d, col, *sp['avg'], prior)
        self.logb = np.log(np.maximum(np.where(np.isnan(self.avg), self.eps, self.avg), self.eps))
        pre = (d.starter & (d.nreg >= MIN_GAMES) & d.oDB.notna()).values
        self.fitm = pre & (self.seas >= FIT_FIRST) & (self.seas <= last)
        self.score = pre & d.regseason.values & (self.seas >= REC_FIRST) & (self.seas <= last)
        fit_reg = (d.reg & (d.nreg >= MIN_GAMES) & (self.seas >= FIT_FIRST) & (self.seas <= last) & d.oDB.notna()).values
        self.allowed, self.allowed_mean = allowed(d, col, fit_reg)
        self.terms, self.terms0 = leg_terms(sp)

    def column(self, t):
        d, sp = self.d, self.spec
        E = lambda x: d['u_' + x].values if sp['scale'] == 'raw' else (d['s_' + x].values - 1500) / 100
        if t == 'one':
            return np.ones(len(d)), 0.0
        if t.startswith('E:'):
            return E(t[2:]), PEN
        if t == 'P':
            return (d[sp['player']].values - 1500) / 100, PEN
        if t == 'EP':
            return E(sp['tables'][0]) * (d[sp['player']].values - 1500) / 100, PEN
        if t == 'log_avg':
            return self.logb, 0.0
        if t == 'home':
            return d.home.values.astype(float), PEN
        if t == 'log_allowed':
            return np.log(np.maximum(self.allowed, 1e-3)), PEN
        if t in ('DL', 'LB', 'DB'):
            return d['o' + t].values, PEN
        if t.startswith('own:'):
            return d['u_' + t[4:]].values, PEN
        if t in ('rk0', 'rk1'):
            return d[t].values.astype(float), PEN
        raise KeyError(t)

    def design(self, terms):
        cols = [self.column(t) for t in terms]
        return np.column_stack([c for c, _ in cols]), np.array([p for _, p in cols])

    def fit(self, terms, rows, w0=None):
        X, pen = self.design(terms)
        w = pois_fit(X[rows], self.y[rows], self.logb[rows], pen, w0=w0)
        return w, np.exp(np.clip(X @ w + self.logb, -30, 30))


def fit_leg(frame, key, last):
    """the leg's frozen spec fitted on every completed season from FIT_FIRST, its spread and its walk-forward record"""
    L = Leg(frame, key, last)
    tr = np.where(L.fitm)[0]
    w, mu = L.fit(L.terms, tr)
    w0, mu0 = L.fit(L.terms0, tr)
    sp = spread(L.kind, L.y[tr], mu[tr])
    # the walk-forward record: each season from REC_FIRST by the spec fitted on FIT_FIRST to the season before
    P, P0, Z = (np.full(len(L.d), np.nan) for _ in range(3))
    wa = wb = None
    for s in range(REC_FIRST, last + 1):
        rows = np.where(L.fitm & (L.seas < s))[0]
        wa, ma = L.fit(L.terms, rows, wa)
        wb, mb = L.fit(L.terms0, rows, wb)
        te = L.score & (L.seas == s)
        P[te], P0[te] = ma[te], mb[te]
        Z[te] = (ma[te] - mb[te]) / sd_of(spread(L.kind, L.y[rows], ma[rows]), ma[te])
    sc = np.where(L.score)[0]
    y, e, res, z = L.y[sc], P[sc] - P0[sc], L.y[sc] - P0[sc], Z[sc]
    top = np.abs(z) >= np.percentile(np.abs(z), 80)
    rnd = lambda v, n=6: [round(float(x), n) for x in v]
    sp_ = L.spec
    out = {'kind': L.kind, 'avg': [sp_['avg'][0], sp_['avg'][1], sp_['avg'][2]], 'eps': float(f'{L.eps:.6g}'),
           'tables': list(sp_['tables']), 'scale': sp_['scale'], 'player': sp_['player'], 'variant': sp_['variant'],
           'terms': L.terms, 'coef': rnd(w), 'no_elo': {'terms': L.terms0, 'coef': rnd(w0)}}
    if 'log_allowed' in L.terms:
        out['allowed_mean'] = round(L.allowed_mean, 6)
    out['spread'] = sp
    out['trusted'] = bool(sp_['trusted'])
    out['record'] = {'games': int(len(sc)), 'rmse': round(float(np.sqrt(np.mean((y - P[sc]) ** 2))), 4),
                     'rmse_no_elo': round(float(np.sqrt(np.mean(res ** 2))), 4),
                     'right_top': round(float(np.mean(np.sign(e[top]) == np.sign(res[top]))), 4)}
    info = {'rows': int(len(tr)), 'zeros': int(L.d.zero.values[tr].sum()), 'mean_y': float(L.y[tr].mean()),
            'mean_mu': float(mu[tr].mean()), 'mean_avg': float(np.nanmean(L.avg[tr]))}
    return out, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true', help='the cache only (elo/cache/)')
    a = ap.parse_args()
    last = last_completed(a.offline)
    print(f'the last completed season: {last}; fitting {FIT_FIRST}-{last}, nothing of a later season read', flush=True)
    env = rating_loop(a.offline, last)
    games = env['games']
    print('the ELO tab\'s tables, week by week', flush=True)
    units = unit_tables_pregame(games, last, a.offline)
    snaps = {}
    for y in range(FIT_FIRST, last + 1):
        sn = pd.read_csv(build.fetch(SNAP_URL.format(y=y), os.path.join(build.CACHE, f'snap_counts_{y}.csv'), a.offline),
                         usecols=['game_id', 'pfr_player_id', 'offense_snaps', 'st_snaps'])
        for gid, p, o, s in zip(sn.game_id, sn.pfr_player_id, sn.offense_snaps, sn.st_snaps):
            snaps.setdefault(gid, {})[p] = (o, s)
    dest = os.path.join(build.CACHE, 'players.csv')
    if not a.offline and os.path.exists(dest):
        os.remove(dest)                    # the player master grows: new players' PFR ids
    pl = pd.read_csv(build.fetch(PLAYERS_URL, dest, a.offline), usecols=['gsis_id', 'pfr_id'])
    pfr = {g: p for g, p in zip(pl.gsis_id, pl.pfr_id) if isinstance(p, str)}
    frame = make_frame(env, units, snaps, pfr)
    print(f'the frame: {len(frame)} player-games, {int(frame.zero.sum())} of them an expected starter\'s zero game', flush=True)
    want = {'fit': f'{FIT_FIRST}-{last}', 'record': f'{REC_FIRST}-{last}', 'starters': dict(TOP), 'min_games': MIN_GAMES,
            'regular': REGULAR, 'legs': {}}
    print(f'\n{"leg":26} {"variant":7} {"rows":>6} {"zeros":>5} {"mean":>8} {"proj":>8}   walk-forward {REC_FIRST}-{last}: rmse, no Elo, Elo part right on its top fifth   trusted')
    for key in SPEC:
        o, info = fit_leg(frame, key, last)
        want['legs'][key] = o
        r = o['record']
        print(f'{key:26} {o["variant"]:7} {info["rows"]:6d} {info["zeros"]:5d} {info["mean_y"]:8.3f} {info["mean_mu"]:8.3f}   '
              f'{r["rmse"]:9.4f} {r["rmse_no_elo"]:9.4f} {r["right_top"]:6.3f}   {o["trusted"]}', flush=True)
    print('\nELO_AVG = {')
    print(''.join(f'    {k!r}: {v!r},\n' for k, v in want.items() if k != 'legs'), end='')
    print("    'legs': {")
    for k, v in want['legs'].items():
        print(f'        {k!r}: {v!r},')
    print('    },\n}')
    print('  the build carries these constants' if getattr(build, 'ELO_AVG', None) == want
          else '  THE BUILD DIFFERS: paste ELO_AVG above into elo/build.py')


if __name__ == '__main__':
    main()
