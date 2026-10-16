#!/usr/bin/env python3
"""The Elo job's gate: elo/data as written by elo/build.py, held against the files it was built
from (the schedule, the roster, the injury report, the play-by-play) and against what was
published before. Run after the build and before the commit; any failure exits 1 and the job
commits nothing, so the last good files stay live.

    python3 elo/check.py                      # elo/data against elo/cache, the last commit's files as "before"
    python3 elo/check.py --data D --cache C --prev P --history H    (tests: another build's output;
                                              P is a players.json, read with the model.json and
                                              calls.json beside it as the last publish)

Every check is an invariant of the data, never this week's particulars: a bye week, a lean
Monday, week 1, a week whose injury report is not filed yet, or a game already played must
all pass. What each one would have caught is said beside it.

  ROSTER     a player on his club's current roster (its own latest week: a club on its bye has
             no rows for the bye week) is not a free agent; every club keeps its players in the
             players map; in season, no club has more than a handful of free agents among the
             sidelined (in the offseason they are real); a sidelined player keeps his season so
             far in `past`. (Mahomes, Kelce and Bryce Young were "free agents" every bye week;
             a player out had his past prop lines graded at 1500.)
  REPORT     nobody the report has Out or Doubtful for his club's next game is in that game's
             expected lineup or projected; nor, before the club files its statuses, anybody Out
             or Doubtful at its previous report who has not practised since (or whose club has
             filed nothing yet); nobody on injured reserve is ranked or expected to start.
             (Caleb Williams, Out in week 4 and not practising, was CHI's expected QB in week 5.)
  CALENDAR   the rankings' "through week" is a week whose games are all played; the season is
             one with a final game; nothing is projected for a game that had kicked off when the
             files were built; in the season's first week nobody shows movement. (One Thursday
             game made it "week 5" and raised the games bar; week 1 showed "up 25".)
  CARRY      a top-ten player of the last published rankings (same season, same formula) is
             still ranked or listed as sidelined unless his club has played since, or has had a
             game rated since (nflverse's player stats come in a night after the score, so a
             Sunday game a Sunday build saw final is rated on Tuesday), or he changed clubs. (The
             #1 tight end and four top-15 quarterbacks vanished on a Friday with no note.)
  RECORD     every graded call is the one in the ledger; every call in the history is graded as
             it stands there (its pick and whether it was published or a backtest) unless the
             ledger has a later call that was itself published before kickoff; every call the
             last publish had for a game this build could no longer call is kept as it was; a
             call in the ledger marked published was made before its kickoff. (2026_03_SEA_WAS
             was shown as WAS and graded as SEA; a build that regrades the season must fail.)
  SOURCES    the season's injury report, roster and play-by-play are present, and the play-by-play
             of the season before the units' (which they carry in); no group is empty.
  GAMES      the game model's walk-forward counts, for every finished season, every final games.csv
             has decided in it (a tie is no decision). (games.csv, the depth charts and the injury
             reports write OAK, SD and STL for the seasons before those moves and the player stats
             LV, LAC and LA: until October 2026 the 263 games of those clubs in 2012-2019 matched
             none of their players and were silently left out, 218-251 of about 267 a season.)
  TEAMS      Overall Offense and Overall Defense against games.csv and the season's play-by-play,
             read again here with the gate's own code: 32 teams a side, ranked 1 to 32 once each
             in the order of their ratings (the teams with a rating first: the ones that have
             played and the ones carried from last season); the weights shares of 100 over the
             side's stats; every stat of every team that has played present, in range and the
             play-by-play's own value, its league rank the order of the values shown (ties
             sharing); the pending finals exactly the ones the play-by-play lacks or ends short of
             the score. The carry replayed: last season rated from 0 on its own play-by-play and
             finals here (the clubs in today's codes), every club's start CARRY (the gate's own
             copy of UNIT_CARRY) times its final rating on every stat, none before FIRST and none
             for a club with no final last season; `params` naming the same share and season.
             Then every rating what a replay of this season's rated finals from those starts with
             the published parameters gives, so a rating moves only on the team's own games; each
             club's `start`, rating and line points that replay on the curve across the clubs with
             a rating (within the rounding), the line a point a game ending on the rating, `before`
             the point before the last or, after one game, the start, `change` the rating less
             `before`; each stat's `adj` its rank on the replay's rating among every club with a
             rating (a carried club's included), none for a club with none; `carried` exactly the clubs
             with a start and no rated game yet; on the bell curve once most teams have a rating,
             and not all one number once two finals are rated. And on fixtures (the build's
             unit_ratings on invented seasons): a team better on every stat against the same
             opponents ranks above, offense and defense; a neutral site swapped changes nothing,
             and at the home side's ground the same game rates the home side lower; one more
             giveaway or sack lowers the offense and raises the defense; a game with no red-zone
             trip leaves every number finite; a final half in the play-by-play, or with an offense
             missing, is pending and moves nobody; a team on its bye keeps its ratings. And the
             carry over two invented seasons (unit_carry): a strong club starts the next season
             above average by exactly UNIT_CARRY of its final ratings, ranked and shown before its
             first game and marked carried; every club with a rating, the carried ones yet to play
             included, is on the curve across them alone (rating and start, the gate's own mean and
             spread), with each stat's `adj` its rank among them and `change` its rating less
             `before` (a curve or an adj over the played clubs alone fails it); its first game steps
             from the carried start, which is its `before` and its line's start; a club new in the
             second season starts at 0; a carry of 0 gives exactly the ratings of no carry.
             Run Defense, Pass Defense and Pass Rush (16 October 2026, the owner's ask: three more
             tables of the defenses, each a weighted sum of two stats' ratings on the same Elo) are
             held every way Overall's two are, each on its own stats (TABLE, the gate's own copy:
             EPA a run and run success rate on designed runs, EPA a dropback and dropback success
             rate, sack rate and QB-hit rate, a hit any dropback flagged qb_hit or a sack, read from
             the play-by-play here with the gate's own code) and from the same carry; the units name
             each with its side and its walk-forward, and every stat entry is its table's own. On the
             fixtures: the build's tables are the gate's; each table ranks the team better on every
             stat above; one more hit or sack raises Pass Rush, a worse run Run Defense and a worse
             dropback Pass Defense (each stat's rating, the table's only where it weighs), a stat no
             position table is made of moves none; a game with no designed run leaves the Run
             Defense it faced at 0 with no value or rank and every number finite; and the pending,
             bye, line, rank, carry and carry-of-0 cases above hold on them too. Run Offense, Pass
             Offense and Pass Protection (16 October 2026, the owner's call: the offense's side of
             the same three facets, for Elo against Elo on the Game snapshot's position matchups)
             are held the same way on the offense's side of the same stats, each table named with
             its pair, the other side of its facet (PAIR, the gate's own copy), and a walk-forward
             of the pair and of itself alone; on the fixtures one more hit or sack lowers Pass
             Protection, a worse run Run Offense and a worse dropback Pass Offense (the offense's
             own ratings, the table's only where the stat weighs), a stat none is made of moves
             none, a game with no designed run leaves the offense's own Run Offense at 0 with no
             value or rank, and Overall's two never move with them.
  POWER      Team Rankings (`teams` in model.json, THE POWER RATINGS) against games.csv, solved
             again with the gate's own code: the results part of every team the fixed point of
             R_t = sum(w * score) / (sum(w) + LAM) over its finals (score its capped margin, home
             field out, plus the opponent's rating; w halving every HALF weeks back from the
             latest week), reached by iteration, never the build's matrix solve; every shown
             rating and chance what that gives with the published lineup part; `before` the same
             iteration on the finals that kicked off before the team's last one (their own latest
             week the anchor), none for a team with no final; the record the season's regular-
             season finals; the lineup part centred; the mean shown rating 1500 within 1; the
             build's constants the gate's. And on fixtures (the build's power_ratings on invented
             seasons): a team that beat an opponent who went on to win everything rates above one
             whose opponent lost everything, though neither played again (the owner's re-judging);
             a final after a team's last kickoff, its own opponents' included, never moves its
             `before`, which is the table cut there; the shown mean 1500 within 1, with lineups and
             without; no home term at a neutral site, and at home the home field comes off; a tie a
             margin of 0. (A table that counted the team's own last game in `before`, turned home
             field round or fell back to the sequential Elo published green.)
  UNITS      the build's own functions on fixtures: two equal teams at a neutral site are 50/50;
             a fullback listed first does not take the second running back's place; a club on its
             bye keeps its roster; a player out last week and not practising stays out.
"""
import argparse, datetime, json, math, os, subprocess, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build  # noqa: E402

fails, notes = [], []
checks = 0


def chk(ok, msg):
    global checks
    checks += 1
    if not ok:
        fails.append(msg)


def load_json(path):
    with open(path) as f:
        return json.load(f)


def published(name, prev_arg):
    """elo/data/<name> as last published: beside the players.json given with --prev (tests), else
    the last commit's (in the job, HEAD is what the site serves until this run commits). None
    when there is none: the first run after a file is added has nothing to hold it against."""
    if prev_arg:
        p = prev_arg if name == 'players.json' else os.path.join(os.path.dirname(os.path.abspath(prev_arg)), name)
        return load_json(p) if os.path.exists(p) else None
    try:
        out = subprocess.run(['git', '-C', ROOT, 'show', f'HEAD:elo/data/{name}'], capture_output=True, text=True, check=True).stdout
        return json.loads(out)
    except (subprocess.CalledProcessError, ValueError, OSError):
        return None


def unit_checks():
    """the build's functions on fixtures"""
    import numpy as np
    # a neutral site: the game model fitted on games where the home side wins 58% of the time,
    # then asked about two identical lineups: a coin flip at a neutral site, the home side ahead
    # at its own ground (home field was a free intercept every game got, Wembley included)
    rng = np.random.default_rng(1)
    n = 4000
    diff = rng.normal(0, 0.5, (n, 8))
    hf = (rng.random(n) > 0.05).astype(float)
    y = (rng.random(n) < 1 / (1 + np.exp(-(0.3 * hf + diff @ np.full(8, 0.4))))).astype(float)
    w = build.logistic_fit(np.column_stack([hf, diff]), y)
    p0 = float(build.predict(w, np.array([[0.0] + [0.0] * 8]))[0])
    p1 = float(build.predict(w, np.array([[1.0] + [0.0] * 8]))[0])
    chk(abs(p0 - 0.5) < 1e-9, f'UNITS: two equal teams at a neutral site are not 50/50 ({p0:.4f}): home field is applied where there is none')
    chk(p1 > 0.53, f'UNITS: two equal teams at the home side\'s ground should lean home ({p1:.4f})')
    # the depth chart: a fullback at rank 1 sorts after the running backs
    ranked = build._ranked([('RB', 'rb1', (0, 1)), ('RB', 'fb', (1, 1)), ('RB', 'rb2', (0, 2)), ('RB', 'rb3', (0, 3))])
    chk([p for p, _ in ranked['RB']][:2] == ['rb1', 'rb2'], f'UNITS: a fullback took the second running back\'s place: {ranked["RB"]}')
    # the charts read the same whatever order their rows come in (four linebackers level at
    # rank 1, the weekly file's depth ties): the order among equals used to be the file's, or
    # an unstable sort's, and moved the walk-forward record with the numpy build
    weekly = pd.DataFrame([
        {'gsis_id': f'lb{i}', 'week': 3, 'club_code': 'X', 'position': p, 'formation': 'Defense', 'depth_team': 1}
        for i, p in enumerate(['OLB', 'ILB', 'MLB', 'OLB'])] + [
        {'gsis_id': 'rb1', 'week': 3, 'club_code': 'X', 'position': 'RB', 'formation': 'Offense', 'depth_team': 1},
        {'gsis_id': 'fb1', 'week': 3, 'club_code': 'X', 'position': 'FB', 'formation': 'Offense', 'depth_team': 1},
        {'gsis_id': 'rb2', 'week': 3, 'club_code': 'X', 'position': 'RB', 'formation': 'Offense', 'depth_team': 2}])
    daily = pd.DataFrame([
        {'gsis_id': f'd{i}', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': p, 'pos_rank': 1}
        for i, p in enumerate(['WLB', 'LILB', 'RILB', 'SLB'])] + [
        {'gsis_id': 'r1', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': 'RB', 'pos_rank': 1},
        {'gsis_id': 'f1', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': 'FB', 'pos_rank': 1},
        {'gsis_id': 'r2', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': 'RB', 'pos_rank': 2}])
    a = build.build_lineups({2020: weekly, 2026: daily}, {})
    b = build.build_lineups({2020: weekly.iloc[::-1].reset_index(drop=True), 2026: daily.iloc[::-1].reset_index(drop=True)}, {})
    chk(a[0] == b[0] and a[1] == b[1], 'UNITS: the depth charts read differently when their rows come in another order')
    rb = lambda chart: [x[0] if isinstance(x, tuple) else x for x in chart['RB']][:2]
    chk(rb(a[0][(2020, 3, 'X')]) == ['rb1', 'rb2'] and rb(a[1]['X'][0][1]) == ['r1', 'r2'],
        'UNITS: a fullback took the second running back\'s place in a chart')
    # the roster: club A on its bye (its latest rows are week 4), club B at week 5, a player who
    # left B after week 4, one on IR
    roster = pd.DataFrame([
        {'gsis_id': 'a1', 'team': 'A', 'week': 4, 'status': 'ACT'},
        {'gsis_id': 'a2', 'team': 'A', 'week': 4, 'status': 'RES'},
        {'gsis_id': 'b1', 'team': 'B', 'week': 5, 'status': 'ACT'},
        {'gsis_id': 'b2', 'team': 'B', 'week': 4, 'status': 'ACT'},
        {'gsis_id': 'b3', 'team': 'B', 'week': 5, 'status': 'INA'},
        # A's: a3 active but coded inactive for the last game (I01, Caleb Williams after week 5 of
        # 2026), a4 active and coded active (A01); both Questionable at A's week-3 report
        {'gsis_id': 'a3', 'team': 'A', 'week': 4, 'status': 'ACT', 'status_description_abbr': 'I01'},
        {'gsis_id': 'a4', 'team': 'A', 'week': 4, 'status': 'ACT', 'status_description_abbr': 'A01'},
    ])
    inj = pd.DataFrame([
        # B's week-5 report (statuses filed): b1 questionable and practising
        {'gsis_id': 'b1', 'team': 'B', 'week': 5, 'report_status': 'Questionable', 'practice_status': 'Limited Participation in Practice', 'report_primary_injury': 'Ankle'},
        {'gsis_id': 'b3', 'team': 'B', 'week': 5, 'report_status': 'Questionable', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Knee'},
        # A's week-3 report: a1 out; week 6 not filed yet (no rows)
        {'gsis_id': 'a1', 'team': 'A', 'week': 3, 'report_status': 'Out', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Hamstring'},
        {'gsis_id': 'a3', 'team': 'A', 'week': 3, 'report_status': 'Questionable', 'practice_status': 'Limited Participation in Practice', 'report_primary_injury': 'Hip'},
        {'gsis_id': 'a4', 'team': 'A', 'week': 3, 'report_status': 'Questionable', 'practice_status': 'Limited Participation in Practice', 'report_primary_injury': 'Hip'},
        # C: x1 out in week 4, not practising in week 5 (statuses not filed); x2 out in week 4,
        # practising fully; x3 out in week 4 and not on C's week-5 report
        {'gsis_id': 'x1', 'team': 'C', 'week': 4, 'report_status': 'Out', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Thumb'},
        {'gsis_id': 'x2', 'team': 'C', 'week': 4, 'report_status': 'Out', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Rib'},
        {'gsis_id': 'x3', 'team': 'C', 'week': 4, 'report_status': 'Doubtful', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Calf'},
        {'gsis_id': 'x1', 'team': 'C', 'week': 5, 'report_status': None, 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': None},
        {'gsis_id': 'x2', 'team': 'C', 'week': 5, 'report_status': None, 'practice_status': 'Full Participation in Practice', 'report_primary_injury': None},
    ])
    out, team, q, _ = build.availability(roster, inj, {'A': 6, 'B': 5, 'C': 5})
    chk(out.get('a1') is not None and 'not filed' in out['a1'], f'UNITS: a player out at his club\'s last report, with this week\'s not filed, should stay out: {out.get("a1")}')
    chk(out.get('b1') is None and 'b1' in q, f'UNITS: a questionable player who practised should be listed with a Q: {out.get("b1")} {q.get("b1")}')
    chk(out.get('b3') is not None, 'UNITS: a questionable player who did not practise at the last report should be counted out')
    chk(out.get('a3') is not None and 'inactive' in out['a3'] and out.get('a4') is None,
        f'UNITS: an active row coded inactive (I01) after being on the last report should stay out until he practises, and one coded active should not: {out.get("a3")}, {out.get("a4")}')
    chk(out.get('a2') == 'on injured reserve', 'UNITS: an injured reserve player on a club on its bye lost his status')
    chk(out.get('b2') == 'a free agent', 'UNITS: a player who left his club after week 4 is not a free agent')
    chk('a1' in team and team['a1'] == 'A', 'UNITS: a club on its bye lost its roster')
    chk(out.get('x1') is not None and out.get('x2') is None and out.get('x3') is None,
        f'UNITS: out last week and not practising should stay out, practising or off the report should clear: {out.get("x1")}, {out.get("x2")}, {out.get("x3")}')
    # the season: a schedule months away is not under way; a season a week old is
    g = pd.DataFrame([{'season': 2027, 'gameday': '2027-09-09', 'gametime': '20:20'}])
    chk(not build.under_way(g, 2027, datetime.datetime(2027, 5, 15, tzinfo=datetime.timezone.utc))
        and build.under_way(g, 2027, datetime.datetime(2027, 9, 16, tzinfo=datetime.timezone.utc)), 'UNITS: under_way() misreads the calendar')
    # kickoffs from the zone: 1pm Eastern is 17:00 UTC in October and 18:00 UTC in December
    chk(build.kickoff('2026-10-11', '13:00').hour == 17 and build.kickoff('2026-12-13', '13:00').hour == 18, 'UNITS: kickoff() has the clocks wrong')


# ---- Overall Offense and Overall Defense: the build's unit_ratings on invented seasons ----
def _sums(**kw):
    """a team-game's play-by-play sums: an ordinary offense, with kw changed"""
    base = {'plays': 60.0, 'epa': 0.0, 'succ': 25.0, 'yds': 330.0, 'expl': 6.0, 'to': 1.0, 'sacks': 2.0, 'db': 35.0,
            'third_c': 5.0, 'third_n': 13.0, 'drives': 11.0, 'rz_trips': 3.0, 'rz_td': 2.0,
            'runs': 25.0, 'run_epa': -2.5, 'run_succ': 9.5, 'db_epa': 2.0, 'db_succ': 16.0, 'hits': 5.0}
    base.update({k: float(v) for k, v in kw.items()})
    return base


def _season(games, season=2030):
    """games: (gid, week, home, away, home pts, away pts, home sums, away sums, neutral, pbp) with pbp
    'ok', 'half' (the play-by-play ends short of the score) or 'oneside' (the away offense missing);
    a game with no points (None) is on the schedule, still to play"""
    sg, tg, score = [], [], {}
    for i, (gid, wk, h, a, hp, ap, hs, as_, neutral, pbp) in enumerate(games):
        sg.append({'game_id': gid, 'season': season, 'week': wk, 'game_type': 'REG', 'gameday': f'{season}-09-{10 + wk:02d}',
                   'gametime': f'{13 + i % 8:02d}:00', 'home_team': h, 'away_team': a, 'home_score': hp, 'away_score': ap,
                   'location': 'Neutral' if neutral else 'Home'})
        if hp is None:
            continue
        tg.append(dict(game_id=gid, posteam=h, defteam=a, side='home', **hs))
        if pbp != 'oneside':
            tg.append(dict(game_id=gid, posteam=a, defteam=h, side='away', **as_))
        score[gid] = (float(hp), float(ap) - (3 if pbp == 'half' else 0))
    return pd.DataFrame(sg), pd.DataFrame(tg), score


def _rate(games, season=2030, start=None):
    return build.unit_ratings(*_season(games, season), start)


def unit_team_checks():
    import numpy as np
    keys = list(build.UNIT_STATS)
    good = _sums(epa=6.0, succ=32, yds=400, expl=9, to=0, sacks=1, third_c=8, rz_td=3,       # better on every stat
                 run_epa=3.0, run_succ=13, db_epa=8.0, db_succ=19, hits=3)
    plain = _sums()
    weak = _sums(epa=-6.0, succ=20, yds=260, expl=3, to=2, sacks=4, third_c=3, rz_td=1,      # worse on every stat
                 run_epa=-8.0, run_succ=7, db_epa=-5.0, db_succ=12, hits=8)
    # the weights: shares of 100 a side, none below zero, every weighted stat a stat the build has
    for side, w in build.UNIT_W.items():
        chk(sum(w.values()) == 100 and all(v >= 0 for v in w.values()) and set(w) <= set(keys),
            f'TEAMS: the {side} weights are not shares of 100 over the build\'s stats: {w}')
    # the build's tables are the gate's (TABLE), each table's weights shares of 100 over its own stats
    tabs = build.unit_tables()
    chk(list(tabs) == list(TABLE) and all(tabs[n][0] == TABLE[n][0] and list(tabs[n][2]) == TABLE[n][1] for n in TABLE),
        f'TEAMS: the build\'s tables are not the gate\'s: {[(n, v[0], list(v[2])) for n, v in tabs.items()]}')
    for n, (_, w, _) in tabs.items():
        chk(sum(w.values()) == 100 and all(v >= 0 for v in w.values()) and set(w) <= set(TABLE.get(n, ('', []))[1]),
            f'TEAMS: the {n} weights are not shares of 100 over its stats: {w}')
    # opponents counted: A and B play the same two opponents at neutral sites, A better on every
    # stat; A's offense ranks above B's, and so does every one of its stats' ratings. The mirror:
    # A's defense allows less of everything than B's against the same offenses
    U = _rate([('g1', 1, 'A', 'X', 30, 10, good, weak, True, 'ok'), ('g2', 1, 'B', 'Y', 20, 20, plain, plain, True, 'ok'),
               ('g3', 2, 'Y', 'A', 10, 30, weak, good, True, 'ok'), ('g4', 2, 'X', 'B', 20, 20, plain, plain, True, 'ok')])
    for side in TABLE:
        a, b = U[side]['A'], U[side]['B']
        chk(a['rank'] < b['rank'] and a['raw'] > b['raw'], f'TEAMS: a team better on every stat against the same opponents does not rank above ({side}: A {a["rank"]}, B {b["rank"]})')
        worse = [k for k in TABLE[side][1] if not a['stats'][k]['r'] > b['stats'][k]['r']]
        chk(not worse, f'TEAMS: {side} stats where being better against the same opponents did not rate higher: {worse}')
        chk(sorted(a['stats']) == sorted(TABLE[side][1]), f'TEAMS: the {side} table shows {sorted(a["stats"])}, not its own stats {TABLE[side][1]}')
    # the weighted sum is honest: each table's raw is its weights times its stats' ratings
    for side in TABLE:
        for t, v in U[side].items():
            s = sum(w / 100 * v['stats'][k]['r'] for k, w in U['weights'][side].items())
            chk(abs(s - v['raw']) < 1e-5, f'TEAMS: {t} {side} raw {v["raw"]} is not its weights times its stats\' ratings ({s:.6f})')
    # home field: swapping home and away at a neutral site changes nothing; at the home side's
    # ground the same game is expected of the home offense, so it rates below the visitor's
    g = [('g1', 1, 'A', 'B', 24, 17, good, plain, True, 'ok'), ('g2', 2, 'B', 'C', 20, 20, plain, weak, True, 'ok')]
    sw = [('g1', 1, 'B', 'A', 17, 24, plain, good, True, 'ok'), ('g2', 2, 'C', 'B', 20, 20, weak, plain, True, 'ok')]
    U1, U2 = _rate(g), _rate(sw)
    moved = [(side, t) for side in TABLE for t in U1[side] if U1[side][t]['raw'] != U2[side][t]['raw']]
    chk(not moved, f'TEAMS: swapping home and away at a neutral site moved {moved[:4]}: home field is applied where there is none')
    Un = _rate([('g1', 1, 'A', 'B', 20, 20, plain, plain, True, 'ok')])
    Uh = _rate([('g1', 1, 'A', 'B', 20, 20, plain, plain, False, 'ok')])
    chk(Un['off']['A']['raw'] == Un['off']['B']['raw'] and Un['def']['A']['raw'] == Un['def']['B']['raw'],
        'TEAMS: two equal teams in the same game at a neutral site are not rated the same')
    chk(Uh['off']['A']['raw'] < Uh['off']['B']['raw'] and Uh['def']['A']['raw'] < Uh['def']['B']['raw'],
        'TEAMS: the home side matching the visitor at its own ground should rate below it on both sides of the ball (it was expected to do better)')
    # direction: one more giveaway, or one more sack, lowers the offense and raises the defense
    base = _rate([('g1', 1, 'A', 'B', 20, 20, plain, plain, True, 'ok')])
    for k, more in (('tor', _sums(to=2)), ('skr', _sums(sacks=3))):
        U = _rate([('g1', 1, 'A', 'B', 20, 20, more, plain, True, 'ok')])
        chk(U['off']['A']['raw'] < base['off']['A']['raw'] and U['def']['B']['raw'] > base['def']['B']['raw']
            and U['off']['A']['stats'][k]['r'] < base['off']['A']['stats'][k]['r'],
            f'TEAMS: one more {"giveaway" if k == "tor" else "sack"} did not lower the offense and raise the defense')
    # the position tables, the same way: one more hit or sack raises Pass Rush, a worse run raises Run
    # Defense, a worse dropback raises Pass Defense (B's defense faced A's offense), and nothing else
    # of the defense's moves the table
    for name, k, more in (('pass_rush', 'hit', _sums(hits=6)), ('pass_rush', 'skr', _sums(sacks=3)),
                          ('run_def', 'repa', _sums(run_epa=-5.0)), ('run_def', 'rsr', _sums(run_succ=7)),
                          ('pass_def', 'pepa', _sums(db_epa=-3.0)), ('pass_def', 'psr', _sums(db_succ=13))):
        U = _rate([('g1', 1, 'A', 'B', 20, 20, more, plain, True, 'ok')])
        up = U[name]['B']['stats'][k]['r'] > base[name]['B']['stats'][k]['r']
        chk(up and U[name]['B']['raw'] >= base[name]['B']['raw'] and (U[name]['B']['raw'] > base[name]['B']['raw']) == bool(U['weights'][name][k]),
            f'TEAMS: a worse {k} for the offense did not raise {name} (its weight {U["weights"][name][k]}%)')
    # the offense tables, the other side of the same games: one more hit or sack lowers A's Pass
    # Protection, a worse run its Run Offense, a worse dropback its Pass Offense, each stat's own rating
    # always and the table only where it weighs; Overall Offense moves only on a stat of its own (a
    # sack), never on a hit or a run
    for name, k, more in (('pass_pro', 'hit', _sums(hits=6)), ('pass_pro', 'skr', _sums(sacks=3)),
                          ('run_off', 'repa', _sums(run_epa=-5.0)), ('run_off', 'rsr', _sums(run_succ=7)),
                          ('pass_off', 'pepa', _sums(db_epa=-3.0)), ('pass_off', 'psr', _sums(db_succ=13))):
        U = _rate([('g1', 1, 'A', 'B', 20, 20, more, plain, True, 'ok')])
        down = U[name]['A']['stats'][k]['r'] < base[name]['A']['stats'][k]['r']
        chk(down and U[name]['A']['raw'] <= base[name]['A']['raw'] and (U[name]['A']['raw'] < base[name]['A']['raw']) == bool(U['weights'][name][k]),
            f'TEAMS: a worse {k} for the offense did not lower its {name} (its weight {U["weights"][name][k]}%)')
        chk(k == 'skr' or all(U[s][t]['raw'] == base[s][t]['raw'] for s in ('off', 'def') for t in 'AB'),
            f'TEAMS: a worse {k}, which Overall is not made of, moved Overall Offense or Overall Defense')
    less = _rate([('g1', 1, 'A', 'B', 20, 20, _sums(to=2, expl=9, third_c=8), plain, True, 'ok')])
    chk(all(less[n]['B']['raw'] == base[n]['B']['raw'] for n in ('run_def', 'pass_def', 'pass_rush'))
        and all(less[n]['A']['raw'] == base[n]['A']['raw'] for n in ('run_off', 'pass_off', 'pass_pro')),
        'TEAMS: a stat no position table is made of moved one')
    # missing data: a game with no red-zone trip leaves every number finite and the red-zone
    # rating where it was; a final with an offense missing from the play-by-play, or whose
    # play-by-play ends short of the score, is pending, counted nowhere and moves nobody
    norz = _rate([('g1', 1, 'A', 'B', 20, 20, _sums(rz_trips=0, rz_td=0), plain, True, 'ok')])
    finite = all(np.isfinite(v['raw']) and all(e['r'] is not None and np.isfinite(e['r']) for e in v['stats'].values())
                 for side in TABLE for v in norz[side].values())
    chk(finite and norz['off']['A']['stats']['rz']['r'] == 0 and norz['off']['A']['stats']['rz']['v'] is None
        and norz['off']['A']['stats']['rz']['rank'] is None, 'TEAMS: a game with no red-zone trip broke a number or moved the red-zone rating')
    # a game with no designed run (all passes) sits out the run stats: B's Run Defense, which faced it,
    # stays at 0 with no value or rank, every number finite
    norun = _rate([('g1', 1, 'A', 'B', 20, 20, _sums(runs=0, run_epa=0, run_succ=0), plain, True, 'ok')])
    finite = all(np.isfinite(v['raw']) and all(e['r'] is not None and np.isfinite(e['r']) for e in v['stats'].values())
                 for side in TABLE for v in norun[side].values())
    rb = norun['run_def']['B']
    chk(finite and rb['raw'] == 0 and all(rb['stats'][k]['v'] is None and rb['stats'][k]['rank'] is None and rb['stats'][k]['r'] == 0 for k in ('repa', 'rsr')),
        'TEAMS: a game with no designed run broke a number or moved the Run Defense it faced')
    ro = norun['run_off']['A']
    chk(ro['raw'] == 0 and ro['games'] == 1 and all(ro['stats'][k]['v'] is None and ro['stats'][k]['rank'] is None and ro['stats'][k]['r'] == 0 for k in ('repa', 'rsr')),
        'TEAMS: a game with no designed run broke a number or moved the offense\'s own Run Offense')
    two = [('g1', 1, 'A', 'B', 24, 17, good, plain, True, 'ok'), ('g2', 2, 'C', 'D', 20, 13, plain, weak, True, 'ok')]
    for kind in ('half', 'oneside'):
        U0, U = _rate(two), _rate(two + [('g3', 3, 'A', 'C', 31, 3, good, weak, False, kind)])
        same = all(U[s][t]['raw'] == U0[s][t]['raw'] and U[s][t]['games'] == U0[s][t]['games']
                   and all(U[s][t]['stats'][k]['r'] == U0[s][t]['stats'][k]['r'] for k in TABLE[s][1])
                   for s in TABLE for t in U0[s])
        chk('g3' in U['pending'] and same, f'TEAMS: a final whose play-by-play is {"half a game" if kind == "half" else "missing an offense"} was rated: pending {U["pending"]}')
    # a team on its bye keeps every rating; the line has a point a game played, the last its rating
    U = _rate(two + [('g3', 3, 'A', 'B', 10, 30, weak, good, True, 'ok')])
    U0 = _rate(two)
    chk(all(U[s][t]['raw'] == U0[s][t]['raw'] for s in TABLE for t in ('C', 'D')),
        'TEAMS: a team that did not play moved')
    chk(all(len(v['line']) == v['games'] and (not v['line'] or v['line'][-1][1] == v['elo']) for s in TABLE for v in U[s].values()),
        'TEAMS: a team\'s line is not one point a game ending on its rating')
    chk([w for w, _ in U['off']['A']['line']] == [1, 3] and U['off']['A']['before'] == U['off']['A']['line'][0][1],
        f'TEAMS: the line or `before` is not the team\'s own games: {U["off"]["A"]["line"]}, before {U["off"]["A"]["before"]}')
    # ranks: every team ranked once, the ones that have played first, in the order of their raw
    for s in TABLE:
        chk(sorted(v['rank'] for v in U[s].values()) == list(range(1, len(U[s]) + 1)), f'TEAMS: the {s} ranks are not a permutation')

    # the carry, over two invented seasons. 2029: A better than B, C and D on every stat, each a home
    # game and an away game. 2030: C and D play in week 1, A and B not yet (A at E, a club new in 2030,
    # to come); then A-B is played
    s1 = [('a1', 1, 'A', 'B', 30, 10, good, weak, False, 'ok'), ('a2', 1, 'C', 'D', 20, 20, plain, plain, False, 'ok'),
          ('a3', 2, 'C', 'A', 13, 31, weak, good, False, 'ok'), ('a4', 2, 'D', 'B', 21, 17, plain, plain, False, 'ok'),
          ('a5', 3, 'A', 'D', 27, 13, good, plain, False, 'ok'), ('a6', 3, 'B', 'C', 17, 20, plain, plain, False, 'ok')]
    P1 = _rate(s1, 2029)
    carry = build.unit_carry(*_season(s1, 2029))
    c = build.UNIT_CARRY
    off_by = [(t, name, k) for t in 'ABCD' for name, (side, ks) in TABLE.items() for k in ks
              if abs(carry[t][side][k] - c * P1[name][t]['stats'][k]['r']) > c * 5e-7 + 1e-12]
    chk(set(carry) == set('ABCD') and not off_by and all(set(carry[t][s]) == set(TEAM_STAT) for t in carry for s in ('off', 'def')),
        f'TEAMS: the carry is not UNIT_CARRY of each club\'s final rating on every stat: {off_by[:4]}')
    early = [('b1', 1, 'C', 'D', 20, 17, plain, plain, False, 'ok'), ('b2', 1, 'E', 'A', None, None, None, None, False, 'ok'),
             ('b3', 2, 'A', 'B', None, None, None, None, False, 'ok')]
    P2 = _rate(early, 2030, carry)
    for side, (ball, keys) in TABLE.items():
        a, e = P2[side]['A'], P2[side]['E']
        same = all(abs(a['stats'][k]['r'] - carry['A'][ball][k]) <= 5e-7 for k in keys)
        chk(same and abs(a['raw'] - c * P1[side]['A']['raw']) <= 1e-5, f'TEAMS: A\'s {side} before its first game is not exactly the carried share of its final ratings')
        chk(a['carried'] and a['games'] == 0 and a['line'] == [] and a['before'] is None and a['elo'] == a['start'] and a['elo'] > 1500
            and a['rank'] == 1, f'TEAMS: A, strong last season and yet to play, is not ranked first above average on its carried rating and marked carried ({side}: {a["elo"]}, rank {a["rank"]}, carried {a["carried"]})')
        chk(not P2[side]['C']['carried'] and not e['carried'] and e['raw'] == 0 and e['rank'] == len(P2[side]),
            f'TEAMS: a club that has played is marked carried, or one new this season ({side}) has a carried rating')
        # the curve: every club with a rating -- C and D, which have played, and A and B, carried and
        # yet to play -- on 1500 + 100 z across those four alone (the gate's own mean and spread),
        # its start too (its carried share, worked here from the carry); E, new, on none. Each stat's
        # adj is its rank on its rating among the same four, a carried club's included; E has none
        r = [t for t in 'ABCD']
        chk(sorted(t for t, v in P2[side].items() if v['games'] > 0 or v['carried']) == r,
            f'TEAMS: the clubs with a rating in the carry fixture ({side}) are not A-D')
        x = np.array([P2[side][t]['raw'] for t in r])
        mu, sd = float(x.mean()), float(x.std())
        s0 = {t: sum(wt / 100 * carry[t][ball][k] for k, wt in P2['weights'][side].items()) for t in r}
        want = lambda raw: 1500 + 100 * (raw - mu) / sd
        off_c = [(t, P2[side][t]['elo'], round(want(P2[side][t]['raw']), 1), P2[side][t]['start'], round(want(s0[t]), 1)) for t in r
                 if abs(P2[side][t]['elo'] - want(P2[side][t]['raw'])) > 0.5 + 1e-9 or abs(P2[side][t]['start'] - want(s0[t])) > 0.5 + 1e-9]
        chk(not off_c, f'TEAMS: the {side} ratings and starts in the carry fixture are not on the curve across every club with a rating, carried ones included: {off_c}')
        bad_a = [(t, k, P2[side][t]['stats'][k].get('adj')) for t in P2[side] for k in keys
                 if P2[side][t]['stats'][k].get('adj') != ((1 + sum(1 for u in r if P2[side][u]['stats'][k]['r'] > P2[side][t]['stats'][k]['r'])) if t in r else None)]
        chk(not bad_a, f'TEAMS: the {side} adj ranks in the carry fixture are not each stat\'s order among every club with a rating, a carried club\'s included: {bad_a[:4]}')
        bad_ch = [t for t, v in P2[side].items() if v.get('change') != (None if v['before'] is None else v['elo'] - v['before'])]
        chk(not bad_ch, f'TEAMS: the {side} change in the carry fixture is not the rating less before: {bad_ch}')
    played = early[:1] + [('b3', 2, 'A', 'B', 24, 20, plain, plain, False, 'ok')] + early[1:2]
    P3 = _rate(played, 2030, carry)
    st, (mu_, sd_, hf_) = build.UNIT_STATS['pts'], P3['params']['stats']['pts']
    for side, me, other in (('off', 'A', 'B'), ('def', 'B', 'A')):
        # A's offense scored 24 at home against B's defense; B's defense allowed it
        o0, d0 = carry['A']['off']['pts'], carry['B']['def']['pts']
        step = P3['params']['K'] * ((24 - mu_) / sd_ - (o0 - d0 + hf_))
        want = o0 + step if side == 'off' else d0 - step
        got = P3[side][me]['stats']['pts']['r']
        chk(abs(got - want) <= 1e-6, f'TEAMS: {me}\'s first game did not step its {side} points rating from its carried start ({got} for {want:.6f})')
        v = P3[side][me]
        chk(v['games'] == 1 and v['before'] == v['start'] and not v['carried'], f'TEAMS: {me}\'s {side} before its first game is not its carried start: before {v["before"]}, start {v["start"]}')
    # a carry of 0 is no carry at all: every number the same once every club has played
    all4 = [('b1', 1, 'C', 'D', 20, 17, plain, plain, False, 'ok'), ('b3', 1, 'A', 'B', 24, 20, good, plain, False, 'ok'),
            ('b4', 2, 'B', 'C', 13, 20, weak, good, False, 'ok'), ('b5', 2, 'D', 'A', 17, 27, plain, good, False, 'ok')]
    zero = build.unit_carry(*_season(s1, 2029), c=0)
    Z0, N0 = _rate(all4, 2030, zero), _rate(all4, 2030)
    chk(all(zero[t][s][k] == 0 for t in zero for s in zero[t] for k in zero[t][s]) and all(Z0[s] == N0[s] for s in TABLE),
        'TEAMS: a carry of 0 does not give exactly the ratings of no carry')

# ---- Overall Offense and Overall Defense: the published units against the play-by-play ----
# the gate's own reading of each stat, from the offense's side: (numerator, denominator) of a
# game's value and of the season's, and +1 where more is better for an offense. Written apart
# from the build's, so a build that reads the play-by-play wrongly, or turns a stat round,
# disagrees with it.
TEAM_STAT = {'pts': (('pts', None), ('pts', 'g'), 1), 'sr': (('succ', 'plays'), ('succ', 'plays'), 1),
             'epa': (('epa', 'plays'), ('epa', 'plays'), 1), 'tor': (('to', 'drives'), ('to', 'g'), -1),
             'skr': (('sacks', 'db'), ('sacks', 'db'), -1), 'xr': (('expl', 'plays'), ('expl', 'plays'), 1),
             'third': (('third_c', 'third_n'), ('third_c', 'third_n'), 1), 'rz': (('rz_td', 'rz_trips'), ('rz_td', 'rz_trips'), 1),
             'ypp': (('yds', 'plays'), ('yds', 'plays'), 1),
             # Run Defense, Pass Defense and Pass Rush: designed runs, dropbacks, and a hit any dropback
             # nflverse flags qb_hit or a sack
             'repa': (('run_epa', 'runs'), ('run_epa', 'runs'), 1), 'rsr': (('run_succ', 'runs'), ('run_succ', 'runs'), 1),
             'pepa': (('db_epa', 'db'), ('db_epa', 'db'), 1), 'psr': (('db_succ', 'db'), ('db_succ', 'db'), 1),
             'hit': (('hits', 'db'), ('hits', 'db'), -1)}
# the tables the units carry, the gate's own copy (a deliberate change edits both): the side of the
# ball each rates and the stats it shows, in order. Overall's two show the nine; the position tables
# their own two: the defenses' (RUN DEFENSE, PASS DEFENSE AND PASS RUSH in the build, 16 October 2026)
# and then the offenses' side of the same facets (RUN OFFENSE, PASS OFFENSE AND PASS PROTECTION, the same
# day), each of a pair on the same two stats (PAIR)
OVERALL = ['pts', 'sr', 'epa', 'tor', 'skr', 'xr', 'third', 'rz', 'ypp']
TABLE = {'off': ('off', OVERALL), 'def': ('def', OVERALL), 'run_def': ('def', ['repa', 'rsr']),
         'pass_def': ('def', ['pepa', 'psr']), 'pass_rush': ('def', ['skr', 'hit']),
         'run_off': ('off', ['repa', 'rsr']), 'pass_off': ('off', ['pepa', 'psr']), 'pass_pro': ('off', ['skr', 'hit'])}
PAIR = {'run_def': 'run_off', 'pass_def': 'pass_off', 'pass_rush': 'pass_pro',
        'run_off': 'run_def', 'pass_off': 'pass_def', 'pass_pro': 'pass_rush'}
# what a season's value can be: rates in [0, 1], a game's points and giveaways in reason
RANGE = {'pts': (0, 70), 'tor': (0, 8), 'epa': (-1.5, 1.5), 'ypp': (0, 15), 'repa': (-1.5, 1.5), 'pepa': (-1.5, 1.5)}
# half the rounding of the published value (points to a tenth, giveaways and yards to a hundredth, the rest to a thousandth)
TOL = {'pts': 0.051, 'tor': 0.0051, 'ypp': 0.0051}


def pbp_sums(path):
    """each team-game of a season's play-by-play, by (game_id, 'home'|'away'): the sums the stats
    are made of, over scrimmage plays (a pass, sack, scramble or run with an EPA, never a kneel,
    a spike or a two-point try); and each game's highest running score"""
    cols = ['game_id', 'home_team', 'posteam', 'defteam', 'play_type', 'pass', 'rush', 'qb_kneel', 'qb_spike',
            'two_point_attempt', 'qb_scramble', 'epa', 'success', 'yards_gained', 'sack', 'qb_hit', 'interception', 'fumble_lost',
            'third_down_converted', 'third_down_failed', 'fixed_drive', 'fixed_drive_result', 'drive_inside20',
            'total_home_score', 'total_away_score']
    p = pd.read_csv(path, usecols=cols, low_memory=False)
    top = p.groupby('game_id')[['total_home_score', 'total_away_score']].max()
    final = {g: (float(h), float(a)) for g, h, a in zip(top.index, top.total_home_score, top.total_away_score)}
    num = lambda c: pd.to_numeric(p[c], errors='coerce').fillna(0)
    play = (p.posteam.notna() & p.defteam.notna() & p.play_type.isin(['pass', 'run']) & ((num('pass') == 1) | (num('rush') == 1))
            & (num('qb_kneel') == 0) & (num('qb_spike') == 0) & (num('two_point_attempt') == 0) & pd.to_numeric(p.epa, errors='coerce').notna())
    q = pd.DataFrame({'game_id': p.game_id, 'side': np.where(p.posteam == p.home_team, 'home', 'away'),
                      'drive': p.fixed_drive, 'res': p.fixed_drive_result, 'in20': num('drive_inside20'),
                      'epa': pd.to_numeric(p.epa, errors='coerce'), 'succ': num('success'), 'yds': num('yards_gained'),
                      'to': num('interception') + num('fumble_lost'), 'sacks': num('sack'), 'db': num('pass'),
                      'third_c': num('third_down_converted'), 'third_n': num('third_down_converted') + num('third_down_failed'),
                      'expl': np.where((num('rush') == 1) | (num('qb_scramble') == 1), num('yards_gained') >= 10,
                                       (num('sack') == 0) & (num('yards_gained') >= 20)).astype(float),
                      'runs': num('rush'), 'run_epa': np.where(num('rush') == 1, pd.to_numeric(p.epa, errors='coerce'), 0.0),
                      'run_succ': num('success') * num('rush'),
                      'db_epa': np.where(num('pass') == 1, pd.to_numeric(p.epa, errors='coerce'), 0.0),
                      'db_succ': num('success') * num('pass'),
                      'hits': ((num('pass') == 1) & ((num('qb_hit') == 1) | (num('sack') == 1))).astype(float)})[play]
    out = {}
    for (gid, side), x in q.groupby(['game_id', 'side']):
        d = x.groupby('drive').agg(in20=('in20', 'max'), res=('res', 'last'))
        out[(gid, side)] = {'plays': float(len(x)), 'epa': float(x.epa.sum()), 'succ': float(x.succ.sum()), 'yds': float(x.yds.sum()),
                            'expl': float(x.expl.sum()), 'to': float(x['to'].sum()), 'sacks': float(x.sacks.sum()), 'db': float(x.db.sum()),
                            'third_c': float(x.third_c.sum()), 'third_n': float(x.third_n.sum()), 'drives': float(len(d)),
                            'rz_trips': float((d.in20 == 1).sum()), 'rz_td': float(((d.in20 == 1) & (d.res == 'Touchdown')).sum()),
                            **{c: float(x[c].sum()) for c in ('runs', 'run_epa', 'run_succ', 'db_epa', 'db_succ', 'hits')}}
    return out, final


# the gate's own copy of the carry (a deliberate change edits both and says why in the build's
# docstring, THE CARRY): each club starts a season at this share of its final rating the season
# before, that season rated from 0; and the clubs that moved, from games.csv's code of the day to today's
CARRY = 0.42
MOVED = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'}


def team_replay(sg, sums, final, par, K, weights, start=None):
    """One season of Overall Offense and Overall Defense replayed with the gate's own code: the
    season's finals that the play-by-play has whole (both offenses, ending on games.csv's score),
    in kickoff order, every club from start[team][side][stat] (or 0). Returns the rated finals, the
    ratings after them R[side][stat][team], the starts, the season's sums, each club's weeks and
    each club's rating in each table of `weights` (TABLE's) after each of its games, by table."""
    teams = sorted(set(sg.home_team) | set(sg.away_team))
    finals = sg[sg.home_score.notna() & sg.away_score.notna()]
    rated = [r for r in finals.itertuples(index=False)
             if (r.game_id, 'home') in sums and (r.game_id, 'away') in sums and final.get(r.game_id) == (float(r.home_score), float(r.away_score))]
    st = {s: {k: {t: float((((start or {}).get(t) or {}).get(s) or {}).get(k, 0.0)) for t in teams} for k in TEAM_STAT} for s in ('off', 'def')}
    R = {s: {k: dict(st[s][k]) for k in TEAM_STAT} for s in ('off', 'def')}
    acc = {s: {t: dict.fromkeys(['g', 'pts', 'plays', 'epa', 'succ', 'yds', 'expl', 'to', 'sacks', 'db', 'third_c', 'third_n', 'drives', 'rz_trips', 'rz_td',
                                 'runs', 'run_epa', 'run_succ', 'db_epa', 'db_succ', 'hits'], 0.0)
               for t in teams} for s in ('off', 'def')}
    weeks = {t: [] for t in teams}
    names = [n for n in TABLE if n in weights]
    path = {n: {t: [] for t in teams} for n in names}
    total = lambda n, t: sum(wt / 100 * R[TABLE[n][0]][k][t] for k, wt in weights[n].items())
    rated.sort(key=lambda r: (f'{r.gameday} {r.gametime if isinstance(r.gametime, str) else "00:00"}', r.game_id))
    for r in rated:
        h = 0.0 if r.location == 'Neutral' else 1.0
        step = []
        for off, dfn, pts, home, x in ((r.home_team, r.away_team, float(r.home_score), h, sums[(r.game_id, 'home')]),
                                       (r.away_team, r.home_team, float(r.away_score), -h, sums[(r.game_id, 'away')])):
            x = dict(x, pts=pts)
            for k, ((n, d), _, sign) in TEAM_STAT.items():
                if d is not None and not x[d]:
                    continue
                v = x[n] / x[d] if d else x[n]
                mu, sd, hf = par[k]
                z = sign * (v - mu) / sd
                step.append((k, off, dfn, K * (z - (R['off'][k][off] - R['def'][k][dfn] + hf * home))))
            for s, t in (('off', off), ('def', dfn)):
                for c in acc[s][t]:
                    acc[s][t][c] += 1 if c == 'g' else x[c]
        for k, off, dfn, d in step:
            R['off'][k][off] += d
            R['def'][k][dfn] -= d
        for t in (r.home_team, r.away_team):
            weeks[t].append(int(r.week))
            for n in names:
                path[n][t].append(total(n, t))
    return rated, R, st, acc, weeks, path


def team_files_checks(M, games, cache):
    """the published units held against games.csv and the season's play-by-play in the cache"""
    U = M.get('units') or {}
    us = int(U.get('season', M['season']))
    sg = games[(games.season == us) & games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB'])].copy()
    for c in ('home_team', 'away_team'):
        sg[c] = sg[c].replace(MOVED)
    clubs = set(sg.home_team) | set(sg.away_team)
    if not U.get('off'):
        chk(False, 'TEAMS: model.json has no Overall Offense')
        return
    chk('stats' in U and 'weights' in U, 'TEAMS: the units carry no stats or weights: an old build wrote them')
    if 'stats' not in U:
        return
    stats = U['stats']
    whole = True
    # the position tables are named with the side they rate, the table on the other side of their facet
    # (its pair, on the same two stats) and the test behind them: the pair's, and the table's alone
    tabs = U.get('tables') or {}
    chk(list(tabs) == [n for n in TABLE if n not in ('off', 'def')]
        and all(tabs[n].get('of') == TABLE[n][0] and tabs[n].get('label') and tabs[n].get('pair') == PAIR[n]
                and all((tabs[n].get('walk_forward') or {}).get(k) for k in ('rmse', 'raw', 'alone', 'alone_raw')) for n in tabs),
        f'TEAMS: the units\' position tables are not the gate\'s, or one has no label, side, pair or walk-forward: {list(tabs)}')
    chk(all(n in tabs and (tabs[n].get('walk_forward') or {}).get('rmse') == (tabs[PAIR[n]].get('walk_forward') or {}).get('rmse')
            and (tabs[n].get('walk_forward') or {}).get('measure') == (tabs[PAIR[n]].get('walk_forward') or {}).get('measure') for n in PAIR if n in tabs and PAIR[n] in tabs),
        'TEAMS: the two tables of a facet do not carry the same test of the pair')
    chk(sorted(s['side'] for s in stats) == sorted(n for n, (_, ks) in TABLE.items() for _ in ks),
        f'TEAMS: the units\' stats are not each table\'s own: {sorted({s["side"] for s in stats})}')
    for side, (ball, keys) in TABLE.items():
        T = U.get(side) or {}
        whole &= set(T) == clubs
        chk(set(T) == clubs and len(T) == 32, f'TEAMS: {side} has {len(T)} teams, the season has {len(clubs)}: {sorted(set(T) ^ clubs)[:4]}')
        chk(sorted(v['rank'] for v in T.values()) == list(range(1, len(T) + 1)), f'TEAMS: the {side} ranks are not 1 to {len(T)} once each')
        w = (U['weights'] or {}).get(side) or {}
        mine = [s['key'] for s in stats if s['side'] == side]
        chk(sum(w.values()) == 100 and all(v >= 0 for v in w.values()) and set(w) <= set(mine) and sorted(mine) == sorted(keys),
            f'TEAMS: the {side} weights do not sum to 100 over its stats, or a stat is missing: {w}, {sorted(mine)}')
        chk(all(s['weight'] == w.get(s['key'], 0) for s in stats if s['side'] == side), f'TEAMS: the {side} stat list and the weights disagree')
        chk(all(s['better'] == ('high' if (TEAM_STAT[s['key']][2] > 0) == (ball == 'off') else 'low') for s in stats if s['side'] == side and s['key'] in TEAM_STAT),
            f'TEAMS: a {side} stat says better the wrong way round')
        chk(all(sorted((v.get('stats') or {})) == sorted(keys) for v in T.values()), f'TEAMS: a {side} team does not show exactly the table\'s stats')
    if not whole:
        return
    # the play-by-play the build read, read again here
    path = os.path.join(cache, f'play_by_play_{us}.csv.gz')
    finals = sg[sg.home_score.notna() & sg.away_score.notna()]
    if not os.path.exists(path):
        chk(not len(finals), f'TEAMS: {len(finals)} finals of {us} but no play-by-play in the cache to hold them against')
        return
    sums, final = pbp_sums(path)
    par, K, W = U['params']['stats'], U['params']['K'], U['weights']
    # the carry, replayed: last season from 0 on its own play-by-play and finals, the clubs in today's code
    start, carry_from = None, None
    if us - 1 >= build.FIRST:
        prev_path = os.path.join(cache, f'play_by_play_{us - 1}.csv.gz')
        chk(os.path.exists(prev_path), f'TEAMS: no {us - 1} play-by-play in the cache, which Overall Offense and Overall Defense carry into {us}')
        if not os.path.exists(prev_path):
            return
        pg = games[(games.season == us - 1) & games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB'])].copy()
        for c in ('home_team', 'away_team'):
            pg[c] = pg[c].replace(MOVED)
        p_sums, p_final = pbp_sums(prev_path)
        _, PR, _, pacc, _, _ = team_replay(pg, p_sums, p_final, par, K, W)
        start = {t: {s: {k: CARRY * PR[s][k][t] for k in TEAM_STAT} for s in ('off', 'def')} for t in pacc['off'] if pacc['off'][t]['g']}
        carry_from = us - 1
    pr = U['params']
    chk(pr.get('carry') == CARRY and pr.get('carry_from') == carry_from,
        f'TEAMS: the units say they carry {pr.get("carry")} of {pr.get("carry_from")}; the gate carries {CARRY} of {carry_from}')
    rated, R, S0, acc, weeks, path_ = team_replay(sg, sums, final, par, K, W, start)
    want_pending = sorted(set(finals.game_id) - {r.game_id for r in rated})
    chk(sorted(U.get('pending') or []) == want_pending,
        f'TEAMS: pending should be the finals the play-by-play lacks or ends short of the score: {want_pending[:4]}, the build has {sorted(U.get("pending") or [])[:4]}')
    chk(sorted(M.get('sources', {}).get('team_stats_pending') or []) == sorted(U.get('pending') or []), 'TEAMS: sources.team_stats_pending is not the units\' pending')
    teams = sorted(clubs)
    with_rating = [t for t in teams if acc['off'][t]['g'] or t in (start or {})]
    played = [t for t in teams if acc['off'][t]['g']]
    for side, (ball, keys) in TABLE.items():
        T, w = U[side], U['weights'][side]
        bad_v, bad_r, bad_rank, bad_line, bad_sum, missing, bad_curve, bad_adj = [], [], [], [], [], [], [], []
        # the curve, on the gate's own replay: 1500 + 100 z across every club with a rating
        tot = lambda X, t: sum(wt / 100 * X[ball][k][t] for k, wt in w.items())
        xs = np.array([tot(R, t) for t in with_rating]) if with_rating else np.zeros(1)
        mu_, sd_ = float(xs.mean()), float(xs.std())
        curve = lambda x: 1500 + 100 * (x - mu_) / sd_ if sd_ > 1e-9 else 1500.0
        near = lambda shown, x: shown is not None and abs(shown - curve(x)) <= 0.5 + 1e-6
        for t in teams:
            v, a = T[t], acc[ball][t]
            if v['games'] != a['g']:
                bad_line.append(f'{t} games {v["games"]} for {int(a["g"])}')
            if v.get('carried') != bool(t in (start or {}) and not a['g']):
                bad_line.append(f'{t} carried {v.get("carried")} with {int(a["g"])} games and {"a" if t in (start or {}) else "no"} start')
            if not near(v.get('start'), tot(S0, t)):
                bad_curve.append(f'{t} start {v.get("start")} for {curve(tot(S0, t)):.2f}')
            if not near(v['elo'], tot(R, t)):
                bad_curve.append(f'{t} rating {v["elo"]} for {curve(tot(R, t)):.2f}')
            if [x[0] for x in v.get('line') or []] != weeks[t]:
                bad_line.append(f'{t} line weeks {[x[0] for x in v.get("line") or []]} for {weeks[t]}')
            elif weeks[t] and (v['line'][-1][1] != v['elo'] or v['before'] != (v['line'][-2][1] if len(weeks[t]) > 1 else v.get('start'))):
                bad_line.append(f'{t} line ends {v["line"][-1]} / before {v["before"]} for rating {v["elo"]} (start {v.get("start")})')
            elif not all(near(pt[1], x) for pt, x in zip(v.get('line') or [], path_[side][t])):
                bad_curve.append(f'{t} line {v["line"]} for {[round(curve(x), 2) for x in path_[side][t]]}')
            if not weeks[t] and v['before'] is not None:
                bad_line.append(f'{t} has a before ({v["before"]}) with no game')
            # the move the tab draws since the club's last game: its rating less `before`
            if v.get('change') != (None if v['before'] is None else v['elo'] - v['before']):
                bad_line.append(f'{t} change {v.get("change")} for rating {v["elo"]} less before {v["before"]}')
            if abs(sum(wt / 100 * v['stats'][k]['r'] for k, wt in w.items()) - v['raw']) > 1e-5:
                bad_sum.append(t)
            for k in keys:
                _, (n, d), sign = TEAM_STAT[k]
                e = v['stats'].get(k)
                if e is None:
                    missing.append(f'{t} {k}')
                    continue
                if abs(e['r'] - R[ball][k][t]) > 1e-5:
                    bad_r.append(f'{t} {k} {e["r"]} for {R[ball][k][t]:.6f}')
                # its rank on its own rating, the opponents counted, among every club with a rating
                # (a carried club's included), on the gate's own replay; none for a club with none
                want_adj = (1 + sum(1 for u in with_rating if R[ball][k][u] > R[ball][k][t])) if t in with_rating else None
                if e.get('adj') != want_adj:
                    bad_adj.append(f'{t} {k} adj {e.get("adj")} for {want_adj}')
                if not a['g']:
                    continue
                want = None if (d and not a[d]) else (a['pts'] if n == 'pts' else a[n]) / a[d]
                if (want is None) != (e['v'] is None) or (want is not None and (not math.isfinite(e['v']) or abs(e['v'] - want) > TOL.get(k, 0.00051))):
                    bad_v.append(f'{t} {k} {e["v"]} for {want}')
                lo, hi = RANGE.get(k, (0, 1))
                if e['v'] is not None and not lo <= e['v'] <= hi:
                    bad_v.append(f'{t} {k} {e["v"]} out of range')
        chk(not missing, f'TEAMS: {side} stats missing: {missing[:4]}')
        chk(not bad_v, f'TEAMS: {side} values that are not the play-by-play\'s: {bad_v[:4]}')
        chk(not bad_r, f'TEAMS: {side} ratings that a replay of the season\'s games does not give (a rating moved without a game, or on the wrong one): {bad_r[:4]}')
        chk(not bad_line, f'TEAMS: {side} games or lines that are not the team\'s rated finals: {bad_line[:4]}')
        chk(not bad_sum, f'TEAMS: {side} raw is not the weights times the stats\' ratings: {bad_sum[:4]}')
        chk(not bad_curve, f'TEAMS: {side} starts, ratings or line points that are not the replay on the curve across the clubs with a rating: {bad_curve[:4]}')
        chk(not bad_adj, f'TEAMS: {side} ranks with the opponents counted (adj) that are not the order of the replay\'s ratings across the clubs with a rating: {bad_adj[:4]}')
        # each stat's league rank on the shown value, in its better direction, ties sharing
        for s in (x for x in stats if x['side'] == side):
            k, hi = s['key'], s['better'] == 'high'
            vals = {t: T[t]['stats'][k]['v'] for t in played if T[t]['stats'].get(k, {}).get('v') is not None}
            for t in played:
                x = vals.get(t)
                want = None if x is None else 1 + sum(1 for y in vals.values() if (y > x if hi else y < x))
                if T[t]['stats'].get(k, {}).get('rank') != want:
                    bad_rank.append(f'{t} {k} {T[t]["stats"].get(k, {}).get("rank")} for {want}')
        chk(not bad_rank, f'TEAMS: {side} league ranks that are not the order of the values shown: {bad_rank[:4]}')
        # the overall rank follows the raw rating, the teams with a rating (played, or carried) first
        order = sorted(with_rating, key=lambda t: -T[t]['raw']) + sorted(t for t in teams if t not in with_rating)
        ranks = [T[t]['rank'] for t in order]
        chk(all(ranks[i] < ranks[i + 1] or T[order[i]]['raw'] == T[order[i + 1]]['raw'] for i in range(len(with_rating) - 1))
            and all(T[t]['rank'] > len(with_rating) for t in teams if t not in with_rating), f'TEAMS: the {side} ranks are not the order of the ratings')
        shown = [T[t]['elo'] for t in with_rating]
        if len(with_rating) >= build.RANK_TEAMS:
            mu, sd = float(np.mean(shown)), float(np.std(shown))
            chk(abs(mu - 1500) <= 1 and abs(sd - 100) <= 2, f'TEAMS: the {side} ratings are not on the bell curve: mean {mu:.1f}, spread {sd:.1f}')
        if len(rated) >= 2:
            chk(len(set(shown)) > 1, f'TEAMS: every {side} rating is the same with {len(rated)} finals rated')


# ---- Team Rankings (THE POWER RATINGS): the published table against games.csv ----
# the gate's own copy of the build's constants (a deliberate change edits both and says why in the
# build's docstring): the pull toward average in games, the margin cap, the recency half-life in
# weeks, the home field in points, the log-odds a point, the usual spread that sets the shown
# number, and the lineups' share
POWER = {'LAM': 16.0, 'C': 17.0, 'HALF': 16.0, 'H': 1.8397, 'S': 0.35941, 'SPREAD': 1.932, 'W': 0.2}
POWER_TYPES = ('REG', 'WC', 'DIV', 'CON', 'SB')


def power_kick(day, time):
    """a game's kickoff as games.csv writes it, to order the finals (no time: the start of the day)"""
    return f'{day} {time if isinstance(time, str) and time.strip() else "00:00"}'


def power_finals(season_games):
    """the season's finals as (kickoff, week, home, away, home points, away points, neutral, type)"""
    g = season_games[season_games.game_type.isin(POWER_TYPES) & season_games.home_score.notna() & season_games.away_score.notna()]
    return [(power_kick(d, t), int(w), h, a, float(hp), float(ap), loc == 'Neutral', gt)
            for d, t, w, h, a, hp, ap, loc, gt in zip(g.gameday, g.gametime, g.week, g.home_team, g.away_team,
                                                      g.home_score, g.away_score, g.location, g.game_type)]


def power_solve(finals, teams):
    """The results part of every team, by iteration, never the build's matrix solve. Each final gives
    each side a game score: its own margin capped at C, less H for the home side and plus H for the
    visitor (neither at a neutral site), plus the opponent's rating; weighted by its week, halving
    every HALF weeks back from the latest week among the finals given. A team's rating is the
    weighted sum of its game scores over the sum of the weights plus LAM, repeated team by team
    (Gauss-Seidel) until nothing moves. Returns ({team: rating}, converged)."""
    R = {t: 0.0 for t in teams}
    if not finals:
        return R, True
    top = max(f[1] for f in finals)
    per = {t: [] for t in teams}
    for _, wk, h, a, hp, ap, neutral, _ in finals:
        w = 0.5 ** ((top - wk) / POWER['HALF'])
        m = max(-POWER['C'], min(POWER['C'], hp - ap))
        hf = 0.0 if neutral else POWER['H']
        per[h].append((w, m - hf, a))
        per[a].append((w, hf - m, h))
    for _ in range(20000):
        moved = 0.0
        for t in teams:
            num = sum(w * (s + R[o]) for w, s, o in per[t])
            v = num / (sum(w for w, _, _ in per[t]) + POWER['LAM'])
            moved, R[t] = max(moved, abs(v - R[t])), v
        if moved < 1e-12:
            return R, True
    return R, False


def power_checks(M, games):
    """`teams` in model.json held to games.csv: the results part recomputed here, and every shown
    number (`elo`, `p_avg`, `before`) what it gives with the published lineup part"""
    for k, v in POWER.items():
        chk(getattr(build, f'PR_{k}') == v, f'POWER: the build\'s PR_{k} is {getattr(build, f"PR_{k}")}, the gate\'s {v}: a constant moved without the gate')
    T = M.get('teams')
    if not isinstance(T, dict) or not T:
        chk(False, 'POWER: model.json has no teams: Team Rankings has nothing to draw')
        return
    sg = games[(games.season == int(M['season'])) & games.game_type.isin(POWER_TYPES)]
    teams = sorted(set(sg.home_team) | set(sg.away_team))
    chk(sorted(T) == teams, f'POWER: the table\'s teams are not the season\'s: extra {sorted(set(T) - set(teams))}, missing {sorted(set(teams) - set(T))}')
    parts = ('r', 'lg', 'r_before', 'lg_before')
    lacking = [t for t in T if any(p not in T[t] for p in parts)]
    chk(not lacking, f'POWER: teams without the parts behind their numbers ({", ".join(parts)}): {lacking[:4]}')
    if lacking or sorted(T) != teams:
        return
    fin = power_finals(sg)
    R, ok = power_solve(fin, teams)
    chk(ok, 'POWER: the gate\'s iteration did not settle')
    last = {}
    for f in fin:
        for t in (f[2], f[3]):
            last[t] = max(last.get(t, ''), f[0])
    at = {k: power_solve([f for f in fin if f[0] < k], teams)[0] for k in set(last.values())}
    rec = {t: [0, 0, 0] for t in teams}
    for _, _, h, a, hp, ap, _, gt in fin:
        if gt == 'REG':
            rec[h][0 if hp > ap else 1 if hp < ap else 2] += 1
            rec[a][1 if hp > ap else 0 if hp < ap else 2] += 1
    mix = lambda r, lg: (1 - POWER['W']) * r + POWER['W'] * lg / POWER['S'] if lg is not None else r
    shown = lambda v: 1500 + 100 * v / POWER['SPREAD']
    bad = {k: [] for k in ('r', 'elo', 'p_avg', 'before', 'record')}
    for t in teams:
        v = T[t]
        if abs(v['r'] - R[t]) > 1e-4:
            bad['r'].append(f'{t} {v["r"]} for {R[t]:.4f}')
        now = mix(R[t], v['lg'])
        if abs(v['elo'] - shown(now)) > 0.501:
            bad['elo'].append(f'{t} {v["elo"]} for {shown(now):.1f}')
        if abs(v['p_avg'] - 1 / (1 + math.exp(-POWER['S'] * now))) > 6e-5:
            bad['p_avg'].append(f'{t} {v["p_avg"]} for {1 / (1 + math.exp(-POWER["S"] * now)):.4f}')
        if t in last:
            r0 = at[last[t]][t]
            want = shown(mix(r0, v['lg_before']))
            if v['before'] is None or v['r_before'] is None or abs(v['r_before'] - r0) > 1e-4 or abs(v['before'] - want) > 0.501:
                bad['before'].append(f'{t} {v["before"]} (r {v["r_before"]}) for {want:.1f} (r {r0:.4f})')
        elif v['before'] is not None or v['r_before'] is not None:
            bad['before'].append(f'{t} {v["before"]} with no final played')
        if list(v['record']) != rec[t]:
            bad['record'].append(f'{t} {v["record"]} for {rec[t]}')
    say = {'r': 'results parts that are not games.csv\'s finals solved again here (a game dropped or doubled, home field turned round, a sequential Elo)',
           'elo': 'shown ratings that are not the results part and the lineup part mixed',
           'p_avg': 'chances against an average team that are not the shown mix',
           'before': '`before` that is not the finals before the team\'s last kickoff solved again (its own last game counted, or a later final)',
           'record': 'records that are not the season\'s regular-season finals'}
    for k, b in bad.items():
        chk(not b, f'POWER: {say[k]}: {b[:4]}{" ..." if len(b) > 4 else ""} of {len(b)}')
    # the lineup part is centred on the league (now, and going into each team's last game), so a
    # shown 1500 is an average team and the table's mean is 1500 within the rounding
    for k in ('lg', 'lg_before'):
        lg = [T[t][k] for t in teams if T[t][k] is not None]
        chk(not lg or abs(sum(lg) / len(lg)) < 1e-4, f'POWER: the lineup part `{k}` is not centred on the league: mean {sum(lg) / max(len(lg), 1):.5f}')
    if all(T[t]['lg'] is not None for t in teams) or all(T[t]['lg'] is None for t in teams):
        mean = sum(T[t]['elo'] for t in teams) / len(teams)
        chk(abs(mean - 1500) <= 1, f'POWER: the shown ratings average {mean:.2f}, not 1500')


def _power_season(games):
    """an invented season for the build's power_ratings: (week, home, away, home pts, away pts,
    neutral[, time[, game type]]) with the points None for a game still to come"""
    rows = []
    for i, (wk, h, a, hp, ap, neutral, *tm) in enumerate(games):
        day = datetime.date(2030, 9, 8) + datetime.timedelta(days=7 * (wk - 1))
        rows.append({'game_id': f'2030_{wk:02d}_{a}_{h}_{i}', 'season': 2030, 'week': wk, 'game_type': tm[1] if len(tm) > 1 else 'REG',
                     'gameday': day.isoformat(), 'gametime': tm[0] if tm else '13:00', 'home_team': h, 'away_team': a,
                     'home_score': float('nan') if hp is None else float(hp), 'away_score': float('nan') if ap is None else float(ap),
                     'location': 'Neutral' if neutral else 'Home'})
    return pd.DataFrame(rows)


def power_fixture_checks():
    """the build's power_ratings on invented seasons"""
    P = lambda games, **kw: build.power_ratings(_power_season(games), **kw)
    # the owner's re-judging: A beat B in week 1 and never played again; B then won (or lost) six
    # games by 17. A's credit for beating B follows what B turned out to be (a sequential Elo,
    # which judged the game once on B's rating that week, leaves A where it was)
    later = lambda m: [(wk, 'B', o, 30 if m > 0 else 13, 13 if m > 0 else 30, True) for wk, o in zip(range(2, 8), 'CDEFGH')]
    good, poor = P([(1, 'A', 'B', 24, 10, True)] + later(1)), P([(1, 'A', 'B', 24, 10, True)] + later(-1))
    chk(good['A']['r'] > poor['A']['r'] + 0.3 and good['A']['elo'] > poor['A']['elo'],
        f'POWER: a win over a team that went on to win everything counts no more than one over a team that lost everything (A {good["A"]["r"]} against {poor["A"]["r"]})')
    chk(good['A']['before'] == poor['A']['before'] == 1500 and good['A']['r_before'] == poor['A']['r_before'] == 0,
        f'POWER: a team going into its first game is not at 1500 ({good["A"]["before"]}, {poor["A"]["before"]})')
    # before: the table cut at the team's last kickoff. A plays B in week 1 and C at 13:00 in week 2;
    # B-D kicks off at 20:00 that day and B-C in week 3. Whatever those later games' scores, A's
    # before is the table on week 1's finals alone, and A's own last game is not in it
    base = [(1, 'A', 'B', 27, 20, True), (1, 'C', 'D', 17, 14, True), (2, 'A', 'C', 21, 20, True, '13:00')]
    runs = [P(base + [(2, 'B', 'D', bd, 0, True, '20:00'), (3, 'B', 'C', bc, 0, True)]) for bd, bc in ((30, 0), (0, 30), (0, 0))]
    cut = P(base[:2] + [(2, 'A', 'C', None, None, True, '13:00'), (2, 'B', 'D', None, None, True, '20:00'), (3, 'B', 'C', None, None, True)])
    chk(all(x['A']['before'] == cut['A']['elo'] and x['A']['r_before'] == cut['A']['r'] for x in runs),
        f'POWER: a final after a team\'s last kickoff moved its before, or its own last game was counted: {[x["A"]["r_before"] for x in runs]} against {cut["A"]["r"]}')
    chk(len({x['A']['r'] for x in runs}) == 3, 'POWER: A did not move with what its opponents did after it played them')
    # the shown table is centred: every team's mean is 1500 within the rounding, the lineups too
    rng = np.random.default_rng(7)
    clubs = [f'T{i:02d}' for i in range(16)]
    season = []
    for wk in range(1, 9):
        order = rng.permutation(clubs)
        for i in range(0, 16, 2):
            season.append((wk, order[i], order[i + 1], int(rng.integers(0, 45)), int(rng.integers(0, 45)), bool(rng.random() < 0.1)))
    lg = {t: float(v) for t, v in zip(clubs, rng.normal(0, 0.3, 16))}
    mean_lg = sum(lg.values()) / 16
    lg = {t: v - mean_lg for t, v in lg.items()}
    for kw in ({}, {'lineup': lg, 'lineup_before': lg}):
        X = P(season, **kw)
        m = sum(v['elo'] for v in X.values()) / len(X)
        chk(abs(m - 1500) <= 1, f'POWER: an invented season\'s shown ratings average {m:.2f}, not 1500 ({"with" if kw else "without"} lineups)')
    # no home term at a neutral site: the same game with home and away swapped there rates the same;
    # at the home side's ground the home field comes off its margin (3 points over 18 games' weight
    # is 0.1667 a side at a neutral site, (3 - H) / 18 at home)
    n, sw, hm = P([(1, 'A', 'B', 20, 17, True)]), P([(1, 'B', 'A', 17, 20, True)]), P([(1, 'A', 'B', 20, 17, False)])
    chk(n['A']['r'] == sw['A']['r'] and n['B']['r'] == sw['B']['r'], f'POWER: home and away swapped at a neutral site moved the ratings ({n["A"]["r"]}, {sw["A"]["r"]})')
    chk(abs(n['A']['r'] - 3 / 18) < 1e-4 and abs(hm['A']['r'] - (3 - POWER['H']) / 18) < 1e-4 and abs(hm['B']['r'] + hm['A']['r']) < 1e-4,
        f'POWER: a 3-point win is {n["A"]["r"]} at a neutral site and {hm["A"]["r"]} at home, for {3 / 18:.4f} and {(3 - POWER["H"]) / 18:.4f}')
    # a tie is a margin of 0: both sides at 0 at a neutral site (a tie in the record), and at the
    # home side's ground the home side below average by the home field it did not turn into points
    tie, tie_h = P([(1, 'A', 'B', 20, 20, True)]), P([(1, 'A', 'B', 20, 20, False)])
    chk(abs(tie['A']['r']) < 1e-9 and abs(tie['B']['r']) < 1e-9 and tie['A']['elo'] == tie['B']['elo'] == 1500
        and tie['A']['record'] == tie['B']['record'] == [0, 0, 1], f'POWER: a tie at a neutral site is not level at 1500 with a tie in each record: {tie["A"]}, {tie["B"]}')
    chk(abs(tie_h['A']['r'] + POWER['H'] / 18) < 1e-4, f'POWER: a tie at home is not the home field below average: {tie_h["A"]["r"]}')
    # a playoff final counts as the build counts it (POWER_TYPES): the same 10-point win at a neutral
    # site in week 19 as a wild-card game moves both teams exactly as it would as a regular-season one
    pre = [(1, 'A', 'B', 20, 17, True), (1, 'C', 'D', 24, 21, True)]
    wc, rg = P(pre + [(19, 'A', 'C', 27, 17, True, '13:00', 'WC')]), P(pre + [(19, 'A', 'C', 27, 17, True, '13:00', 'REG')])
    chk(all(abs(wc[t]['r'] - rg[t]['r']) < 1e-9 for t in 'ABCD') and abs(wc['A']['r'] - P(pre)['A']['r']) > 0.1,
        f'POWER: a playoff final is not counted as the build counts the playoffs (A {wc["A"]["r"]} as a wild-card game, {rg["A"]["r"]} as a regular-season one)')
    # the gate's own iteration agrees with the build on the invented season (each a check of the other)
    X = P(season)
    R, ok = power_solve(power_finals(_power_season(season)), clubs)
    chk(ok and all(abs(X[t]['r'] - R[t]) < 1e-4 for t in clubs), 'POWER: the gate\'s iteration and the build\'s solve disagree on an invented season')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(HERE, 'data'))
    ap.add_argument('--cache', default=os.path.join(HERE, 'cache'))
    ap.add_argument('--history', default=os.path.join(HERE, 'history'))
    ap.add_argument('--prev', help='the previously published players.json (default: the last commit\'s)')
    a = ap.parse_args()

    unit_checks()
    unit_team_checks()
    power_fixture_checks()
    P = load_json(os.path.join(a.data, 'players.json'))
    M = load_json(os.path.join(a.data, 'model.json'))
    MU = load_json(os.path.join(a.data, 'matchups.json')) if os.path.exists(os.path.join(a.data, 'matchups.json')) else {}
    calls_path = os.path.join(a.data, 'calls.json')
    L = load_json(calls_path) if os.path.exists(calls_path) else None
    built = datetime.datetime.fromisoformat(M['built_at'])
    games = pd.read_csv(os.path.join(a.cache, 'games.csv'), low_memory=False)
    games['kick'] = [build.kickoff(d, t) for d, t in zip(games.gameday, games.gametime)]
    season = int(M['season'])
    rank_season = int(P['season'])
    sg = games[games.season == season]
    groups = M['groups']
    players = P['players']

    # ---- CALENDAR ----
    chk(sg.home_score.notna().any(), f'CALENDAR: the season in play ({season}) has no final game in games.csv: a schedule was taken for a season under way')
    chk(rank_season in (season, season - 1), f'CALENDAR: the rankings\' season {rank_season} is neither the season in play nor the one before')
    rg = games[(games.season == rank_season) & (games.game_type == 'REG')]
    tw = int(P.get('through_week') or 0)
    if tw:
        wk = rg[rg.week == tw]
        unplayed = wk[wk.home_score.isna() & (wk.kick > built - datetime.timedelta(days=3))]
        chk(not len(unplayed), f'CALENDAR: the rankings say "through week {tw}" with {len(unplayed)} of its {len(wk)} games still to play')
    # the season's first week has no week before it to move from: with only week 1 rated,
    # nobody shows movement (the order among players all at 1500 was their ids: "up 25")
    if not tw or (tw == 1 and not P.get('partial')):
        for g in groups:
            moved = [r['name'] for r in P['groups'][g]['top'] if r.get('start_rank', r['rank']) != r['rank']]
            chk(not moved, f'CALENDAR: {g} shows movement in the season\'s first week, from a week that was never played: {moved[:3]}')
    started = {gid for gid, k in zip(games.game_id, games.kick) if k <= built}
    for pid, v in (MU.get('players') or {}).items():
        if v.get('game_id') in started:
            chk(False, f'CALENDAR: {v["game_id"]} had kicked off when the files were built but is still projected ({pid})')
            break
    for c in (M.get('next') or {}).get('games', []):
        if c['game_id'] in started and not c.get('frozen'):
            chk(False, f'CALENDAR: {c["game_id"]} had kicked off but was called afresh rather than kept at its frozen call')
            break

    # ---- GAMES: the game model saw every decided final of every finished season ----
    for s, v in sorted((M.get('walk_forward') or {}).items()):
        if int(s) >= season:
            continue                      # the season in play: a final whose stats are still to come is not in it yet
        fin = games[(games.season == int(s)) & games.result.notna() & (games.result != 0)]
        chk(v.get('games') == len(fin), f'GAMES: the game model\'s walk-forward has {v.get("games")} games for {s}, games.csv '
            f'{len(fin)} decided finals: games were left out of the fit (a club\'s code not matched?)')

    # ---- SOURCES ----
    for g in groups:
        chk(len(P['groups'][g]['top']) >= 10, f'SOURCES: the {g} rankings have {len(P["groups"][g]["top"])} players: a source is missing or the season is mistaken')
    sched = int(games.season.max())
    live = build.under_way(games, sched, built)
    need = [f'injuries_{sched}.csv', f'roster_{sched}.csv', f'play_by_play_{season}.csv.gz', f'stats_player_week_{season}.csv', f'depth_charts_{sched}.csv'] if live else []
    # the play-by-play of the season before the units' (Overall Offense and Overall Defense carry it in)
    us = int((M.get('units') or {}).get('season', rank_season))
    if us - 1 >= build.FIRST:
        need.append(f'play_by_play_{us - 1}.csv.gz')
    for name in need:
        p = os.path.join(a.cache, name)
        chk(os.path.exists(p) and os.path.getsize(p) > 100, f'SOURCES: {name} is missing: the season cannot be built without it')
    # ---- TEAMS: Overall Offense and Overall Defense against games.csv and the play-by-play ----
    team_files_checks(M, games, a.cache)
    # ---- POWER: Team Rankings against games.csv ----
    power_checks(M, games)
    srcs = M.get('sources') or {}
    for k, v in srcs.items():
        if isinstance(v, dict) and v.get('required') and not v.get('ok'):
            chk(False, f'SOURCES: {k} is required and was not had: {v.get("error")}')
    pend = srcs.get('player_stats_pending') or []
    if pend:
        notes.append(f'{len(pend)} final game(s) not yet in nflverse\'s player stats: {", ".join(pend[:6])}')

    # ---- ROSTER ----
    roster_path = os.path.join(a.cache, f'roster_{sched}.csv')
    if not os.path.exists(roster_path) and not live:      # before a season is under way, last season's stands in
        roster_path = os.path.join(a.cache, f'roster_{sched - 1}.csv')
    roster = pd.read_csv(roster_path, low_memory=False) if os.path.exists(roster_path) else None
    if roster is not None:
        roster = roster[roster.gsis_id.map(lambda v: isinstance(v, str))]
        rw = pd.to_numeric(roster.week, errors='coerce')
        club_latest = rw.groupby(roster.team).max()
        current = {pid: (t, st) for pid, t, st, w in zip(roster.gsis_id, roster.team, roster.status, rw) if w >= club_latest.get(t, w)}
        fa_by_club = {}
        for g in groups:
            for x in P['groups'][g]['sidelined']:
                if 'free agent' in x['why']:
                    t_st = current.get(x['id'])
                    if t_st and t_st[1] in ('ACT', 'INA'):
                        chk(False, f'ROSTER: {x["name"]} is on {t_st[0]}\'s current roster ({t_st[1]}) but called a free agent')
                    fa_by_club[x['team']] = fa_by_club.get(x['team'], 0) + 1
        worst = max(fa_by_club.items(), key=lambda kv: kv[1], default=(None, 0))
        # (in season only: from the Super Bowl to the new season's rankings, last season's
        # players really do leave their clubs in numbers, and are free agents until they sign)
        if P.get('phase', 'regular') in ('regular', 'postseason'):
            chk(worst[1] <= 4, f'ROSTER: {worst[1]} of {worst[0]}\'s players are listed as free agents: the club\'s roster was not read')
        ir = {pid for pid, (t, st) in current.items() if st == 'RES'}
        for g in groups:
            bad = [r['name'] for r in P['groups'][g]['top'] if r['id'] in ir]
            chk(not bad, f'ROSTER: on injured reserve but ranked: {bad}')
        lineup_ids = {p for v in (MU.get('lineups') or {}).values() for p in v['players']}
        bad = [p for p in lineup_ids if p in ir]
        chk(not bad, f'ROSTER: on injured reserve but in an expected lineup: {bad[:5]}')
    clubs = set(sg.home_team) | set(sg.away_team)
    by_club = {}
    for v in players.values():
        by_club[v.get('team')] = by_club.get(v.get('team'), 0) + 1
    thin = sorted(t for t in clubs if by_club.get(t, 0) < 15)
    chk(not thin, f'ROSTER: clubs with fewer than 15 players in the players map: {thin}')
    # a player kept out of the players map keeps his season so far beside it (the Prop Record
    # grades the weeks he played on the rating he took into each; it graded them at 1500).
    # Every sidelined player of this season's rankings has played this season, so has one.
    if P.get('season') == P.get('season_in_play', P.get('season')):
        past = P.get('past') or {}
        lost = [x['name'] for g in groups for x in P['groups'][g]['sidelined'] if x['id'] not in players and x['id'] not in past]
        chk(not lost, f'ROSTER: kept out with no season so far beside the players map, so their past lines grade at 1500: {lost[:5]}{" ..." if len(lost) > 5 else ""}')

    # ---- REPORT ----
    inj_path = os.path.join(a.cache, f'injuries_{int(games[games.kick > built].season.min()) if (games.kick > built).any() else sched}.csv')
    if os.path.exists(inj_path) and MU:
        inj = pd.read_csv(inj_path, low_memory=False)
        inj = inj[inj.gsis_id.map(lambda v: isinstance(v, str)) & inj.week.notna()]
        expected_by_club = {t: set(v['players']) for t, v in (MU.get('lineups') or {}).items()}
        if not expected_by_club:      # an older file without lineups: the projected starters stand in
            for pid, v in (MU.get('players') or {}).items():
                expected_by_club.setdefault(v['team'], set()).add(pid)
        future = games[games.kick > built].sort_values('kick', kind='mergesort')
        nxt = {}
        for r in future.itertuples(index=False):
            for t in (r.home_team, r.away_team):
                nxt.setdefault(t, int(r.week))
        for t, w in nxt.items():
            mine = inj[inj.team == t]
            cur = mine[mine.week == w]
            exp = expected_by_club.get(t, set())
            filed = cur.report_status.notna().any()
            gone = set(cur[cur.report_status.isin(['Out', 'Doubtful'])].gsis_id)
            if not filed:
                before = mine[mine.week < w]
                if len(before):
                    pw = before.week.max()
                    was = set(before[(before.week == pw) & before.report_status.isin(['Out', 'Doubtful'])].gsis_id)
                    practising = set(cur[cur.practice_status.fillna('').str.contains('Full|Limited')].gsis_id)
                    on_report = set(cur.gsis_id)
                    gone |= {p for p in was if p not in practising and (p in on_report or not len(cur))}
            bad = sorted(gone & exp)
            nm = {r.gsis_id: r.full_name for r in mine.itertuples(index=False)}
            chk(not bad, f'REPORT: {t} week {w}: expected to start though out, or out last week and not practising: {[nm.get(p, p) for p in bad]}')

    # ---- CARRY ----
    prev = published('players.json', a.prev)
    prev_model = published('model.json', a.prev)
    if prev and prev.get('season') == P.get('season') and prev.get('formula') == P.get('formula') and prev.get('built_at') != P.get('built_at'):
        pb = datetime.datetime.fromisoformat(prev['built_at'])
        since = games[(games.kick > pb - datetime.timedelta(hours=4)) & (games.kick <= built)]
        moved = set(since.home_team) | set(since.away_team)
        # a club whose game was rated by this build and not by the last: its games played, and
        # so the rankings' bar (half of them), can move although it kicked off long before the
        # last publish, because nflverse's player stats land a night after the score
        rated_before = {c['game_id'] for c in ((prev_model or {}).get('graded') or [])}
        for gid in {c['game_id'] for c in (M.get('graded') or [])} - rated_before:
            r = games[games.game_id == gid]
            if len(r):
                moved |= {r.home_team.iloc[0], r.away_team.iloc[0]}
        for g in groups:
            now_ids = {r['id'] for r in P['groups'][g]['top']} | {x['id'] for x in P['groups'][g]['sidelined']}
            for r in prev['groups'][g]['top'][:10]:
                if r['id'] in now_ids:
                    continue
                club = (players.get(r['id']) or {}).get('team') or r['team']
                chk(club in moved or r['team'] in moved or club != r['team'],
                    f'CARRY: {r["name"]} ({r["team"]}) was #{r["rank"]} at {g} and is neither ranked nor sidelined now, though his club has not played or had a game rated since')
    elif prev and prev.get('built_at') != P.get('built_at'):
        notes.append('the last published rankings are of another season or formula: the carry check is skipped once')

    # ---- RECORD ----
    graded = M.get('graded') or []
    chk(L is not None, 'RECORD: no calls.json: the record is not graded on calls frozen at kickoff')
    ledger = (L or {}).get('calls', {})
    kick = dict(zip(games.game_id, games.kick))
    lead = datetime.timedelta(minutes=build.CALL_LEAD)
    at = lambda e: datetime.datetime.fromisoformat(e['at'])
    # a call that counts as published before its game: marked so, and made CALL_LEAD before kickoff
    in_time = lambda gid, e: bool(e) and e.get('src') == 'published' and gid in kick and at(e) <= kick[gid] - lead
    for c in graded:
        e = ledger.get(c['game_id'])
        if e is None or e['pick'] != c['pick'] or e.get('src') != c.get('src'):
            chk(False, f'RECORD: {c["game_id"]} is graded as {c["pick"]} ({c.get("src")}) but the ledger has {e and e["pick"]} ({e and e.get("src")})')
            break
    hist_path = os.path.join(a.history, f'calls_{season}.json')
    hist = (load_json(hist_path).get('calls', {}) if os.path.exists(hist_path) else {})
    byid = {c['game_id']: c for c in graded}
    # the history is what was published before the ledger began, and the record grades it as it
    # stands there. Only a later call that was itself published before kickoff supersedes it: a
    # call recomputed after the game (a build that regrades the season writes those with today's
    # time) never does
    wrong = []
    for gid, e in hist.items():
        if gid not in byid:
            continue
        cur = ledger.get(gid)
        want = cur if in_time(gid, cur) and at(cur) > at(e) else e
        if byid[gid]['pick'] != want['pick'] or byid[gid].get('src') != want['src']:
            wrong.append(gid)
    chk(not wrong, f'RECORD: graded other than as published (or as first called, for a backtest): {sorted(wrong)[:6]}{" ..." if len(wrong) > 6 else ""} of {len(wrong)}')
    # the ledger against the last publish's: a game this build could not call again (kicked off,
    # or within CALL_LEAD of it, when built) keeps the call the last publish had for it, its pick
    # and its src; only a game still to come may be called afresh. (Skipped the first time, when
    # the last publish has no calls.json.)
    prev_calls = published('calls.json', a.prev)
    if prev_calls and isinstance(prev_calls.get('calls'), dict):
        keep_from = int((L or {}).get('season', season)) - 1        # the ledger keeps this season and the one before
        moved_calls = []
        for gid, e in prev_calls['calls'].items():
            if gid not in kick or int(gid[:4]) < keep_from or kick[gid] > built + lead:
                continue
            cur = ledger.get(gid)
            if cur is None or cur['pick'] != e['pick'] or cur.get('src') != e.get('src'):
                moved_calls.append(gid)
        chk(not moved_calls, f'RECORD: calls the last publish had frozen were changed or dropped: {sorted(moved_calls)[:6]}{" ..." if len(moved_calls) > 6 else ""} of {len(moved_calls)}')
    elif L is not None:
        notes.append('the last publish has no calls.json: the ledger is not held against it this once')
    late = [gid for gid, e in ledger.items() if e.get('src') == 'published' and gid in kick and not in_time(gid, e)]
    chk(not late, f'RECORD: calls marked published that were made at or after kickoff: {late[:5]}')
    for c in graded:
        if 'src' not in c:
            chk(False, 'RECORD: a graded call does not say whether it was published before kickoff or is a backtest')
            break

    print(f'elo check: {checks} checks, {len(fails)} failures')
    for n in notes:
        print('  note: ' + n)
    for f in fails:
        print('  FAIL: ' + f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
