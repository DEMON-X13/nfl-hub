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
  SOURCES    the season's injury report, roster and play-by-play are present; no group is empty.
  TEAMS      Overall Offense and Overall Defense against games.csv and the season's play-by-play,
             read again here with the gate's own code: 32 teams a side, ranked 1 to 32 once each
             in the order of their ratings (the teams that have played first); the weights shares
             of 100 over the side's stats; every stat of every team that has played present, in
             range and the play-by-play's own value, its league rank the order of the values
             shown (ties sharing); the pending finals exactly the ones the play-by-play lacks or
             ends short of the score; every rating what a replay of the rated finals with the
             published parameters gives, so a rating moves only on the team's own games, and the
             line a point a game, ending on the rating; on the bell curve once most teams have
             played, and not all one number once two finals are rated. And on fixtures (the
             build's unit_ratings on invented seasons): a team better on every stat against the
             same opponents ranks above, offense and defense; a neutral site swapped changes
             nothing, and at the home side's ground the same game rates the home side lower;
             one more giveaway or sack lowers the offense and raises the defense; a game with no
             red-zone trip leaves every number finite; a final half in the play-by-play, or with
             an offense missing, is pending and moves nobody; a team on its bye keeps its ratings.
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
    ])
    inj = pd.DataFrame([
        # B's week-5 report (statuses filed): b1 questionable and practising
        {'gsis_id': 'b1', 'team': 'B', 'week': 5, 'report_status': 'Questionable', 'practice_status': 'Limited Participation in Practice', 'report_primary_injury': 'Ankle'},
        {'gsis_id': 'b3', 'team': 'B', 'week': 5, 'report_status': 'Questionable', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Knee'},
        # A's week-3 report: a1 out; week 6 not filed yet (no rows)
        {'gsis_id': 'a1', 'team': 'A', 'week': 3, 'report_status': 'Out', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Hamstring'},
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
            'third_c': 5.0, 'third_n': 13.0, 'drives': 11.0, 'rz_trips': 3.0, 'rz_td': 2.0}
    base.update({k: float(v) for k, v in kw.items()})
    return base


def _season(games):
    """games: (gid, week, home, away, home pts, away pts, home sums, away sums, neutral, pbp) with pbp
    'ok', 'half' (the play-by-play ends short of the score) or 'oneside' (the away offense missing)"""
    sg, tg, score = [], [], {}
    for i, (gid, wk, h, a, hp, ap, hs, as_, neutral, pbp) in enumerate(games):
        sg.append({'game_id': gid, 'season': 2030, 'week': wk, 'game_type': 'REG', 'gameday': f'2030-09-{10 + wk:02d}',
                   'gametime': f'{13 + i % 8:02d}:00', 'home_team': h, 'away_team': a, 'home_score': hp, 'away_score': ap,
                   'location': 'Neutral' if neutral else 'Home'})
        tg.append(dict(game_id=gid, posteam=h, defteam=a, side='home', **hs))
        if pbp != 'oneside':
            tg.append(dict(game_id=gid, posteam=a, defteam=h, side='away', **as_))
        score[gid] = (float(hp), float(ap) - (3 if pbp == 'half' else 0))
    return pd.DataFrame(sg), pd.DataFrame(tg), score


def _rate(games):
    return build.unit_ratings(*_season(games))


def unit_team_checks():
    import numpy as np
    keys = list(build.UNIT_STATS)
    good = _sums(epa=6.0, succ=32, yds=400, expl=9, to=0, sacks=1, third_c=8, rz_td=3)      # better on every stat
    plain = _sums()
    weak = _sums(epa=-6.0, succ=20, yds=260, expl=3, to=2, sacks=4, third_c=3, rz_td=1)       # worse on every stat
    # the weights: shares of 100 a side, none below zero, every weighted stat a stat the build has
    for side, w in build.UNIT_W.items():
        chk(sum(w.values()) == 100 and all(v >= 0 for v in w.values()) and set(w) <= set(keys),
            f'TEAMS: the {side} weights are not shares of 100 over the build\'s stats: {w}')
    # opponents counted: A and B play the same two opponents at neutral sites, A better on every
    # stat; A's offense ranks above B's, and so does every one of its stats' ratings. The mirror:
    # A's defense allows less of everything than B's against the same offenses
    U = _rate([('g1', 1, 'A', 'X', 30, 10, good, weak, True, 'ok'), ('g2', 1, 'B', 'Y', 20, 20, plain, plain, True, 'ok'),
               ('g3', 2, 'Y', 'A', 10, 30, weak, good, True, 'ok'), ('g4', 2, 'X', 'B', 20, 20, plain, plain, True, 'ok')])
    for side in ('off', 'def'):
        a, b = U[side]['A'], U[side]['B']
        chk(a['rank'] < b['rank'] and a['raw'] > b['raw'], f'TEAMS: a team better on every stat against the same opponents does not rank above ({side}: A {a["rank"]}, B {b["rank"]})')
        worse = [k for k in keys if not a['stats'][k]['r'] > b['stats'][k]['r']]
        chk(not worse, f'TEAMS: {side} stats where being better against the same opponents did not rate higher: {worse}')
    # the weighted sum is honest: each side's raw is its weights times its stats' ratings
    for side in ('off', 'def'):
        for t, v in U[side].items():
            s = sum(w / 100 * v['stats'][k]['r'] for k, w in build.UNIT_W[side].items())
            chk(abs(s - v['raw']) < 1e-5, f'TEAMS: {t} {side} raw {v["raw"]} is not its weights times its stats\' ratings ({s:.6f})')
    # home field: swapping home and away at a neutral site changes nothing; at the home side's
    # ground the same game is expected of the home offense, so it rates below the visitor's
    g = [('g1', 1, 'A', 'B', 24, 17, good, plain, True, 'ok'), ('g2', 2, 'B', 'C', 20, 20, plain, weak, True, 'ok')]
    sw = [('g1', 1, 'B', 'A', 17, 24, plain, good, True, 'ok'), ('g2', 2, 'C', 'B', 20, 20, weak, plain, True, 'ok')]
    U1, U2 = _rate(g), _rate(sw)
    moved = [(side, t) for side in ('off', 'def') for t in U1[side] if U1[side][t]['raw'] != U2[side][t]['raw']]
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
    # missing data: a game with no red-zone trip leaves every number finite and the red-zone
    # rating where it was; a final with an offense missing from the play-by-play, or whose
    # play-by-play ends short of the score, is pending, counted nowhere and moves nobody
    norz = _rate([('g1', 1, 'A', 'B', 20, 20, _sums(rz_trips=0, rz_td=0), plain, True, 'ok')])
    finite = all(np.isfinite(v['raw']) and all(e['r'] is not None and np.isfinite(e['r']) for e in v['stats'].values())
                 for side in ('off', 'def') for v in norz[side].values())
    chk(finite and norz['off']['A']['stats']['rz']['r'] == 0 and norz['off']['A']['stats']['rz']['v'] is None
        and norz['off']['A']['stats']['rz']['rank'] is None, 'TEAMS: a game with no red-zone trip broke a number or moved the red-zone rating')
    two = [('g1', 1, 'A', 'B', 24, 17, good, plain, True, 'ok'), ('g2', 2, 'C', 'D', 20, 13, plain, weak, True, 'ok')]
    for kind in ('half', 'oneside'):
        U0, U = _rate(two), _rate(two + [('g3', 3, 'A', 'C', 31, 3, good, weak, False, kind)])
        same = all(U[s][t]['raw'] == U0[s][t]['raw'] and U[s][t]['games'] == U0[s][t]['games']
                   and all(U[s][t]['stats'][k]['r'] == U0[s][t]['stats'][k]['r'] for k in keys)
                   for s in ('off', 'def') for t in U0[s])
        chk('g3' in U['pending'] and same, f'TEAMS: a final whose play-by-play is {"half a game" if kind == "half" else "missing an offense"} was rated: pending {U["pending"]}')
    # a team on its bye keeps every rating; the line has a point a game played, the last its rating
    U = _rate(two + [('g3', 3, 'A', 'B', 10, 30, weak, good, True, 'ok')])
    U0 = _rate(two)
    chk(all(U[s][t]['raw'] == U0[s][t]['raw'] for s in ('off', 'def') for t in ('C', 'D')),
        'TEAMS: a team that did not play moved')
    chk(all(len(v['line']) == v['games'] and (not v['line'] or v['line'][-1][1] == v['elo']) for s in ('off', 'def') for v in U[s].values()),
        'TEAMS: a team\'s line is not one point a game ending on its rating')
    chk([w for w, _ in U['off']['A']['line']] == [1, 3] and U['off']['A']['before'] == U['off']['A']['line'][0][1],
        f'TEAMS: the line or `before` is not the team\'s own games: {U["off"]["A"]["line"]}, before {U["off"]["A"]["before"]}')
    # ranks: every team ranked once, the ones that have played first, in the order of their raw
    for s in ('off', 'def'):
        chk(sorted(v['rank'] for v in U[s].values()) == list(range(1, len(U[s]) + 1)), f'TEAMS: the {s} ranks are not a permutation')

# ---- Overall Offense and Overall Defense: the published units against the play-by-play ----
# the gate's own reading of each stat, from the offense's side: (numerator, denominator) of a
# game's value and of the season's, and +1 where more is better for an offense. Written apart
# from the build's, so a build that reads the play-by-play wrongly, or turns a stat round,
# disagrees with it.
TEAM_STAT = {'pts': (('pts', None), ('pts', 'g'), 1), 'sr': (('succ', 'plays'), ('succ', 'plays'), 1),
             'epa': (('epa', 'plays'), ('epa', 'plays'), 1), 'tor': (('to', 'drives'), ('to', 'g'), -1),
             'skr': (('sacks', 'db'), ('sacks', 'db'), -1), 'xr': (('expl', 'plays'), ('expl', 'plays'), 1),
             'third': (('third_c', 'third_n'), ('third_c', 'third_n'), 1), 'rz': (('rz_td', 'rz_trips'), ('rz_td', 'rz_trips'), 1),
             'ypp': (('yds', 'plays'), ('yds', 'plays'), 1)}
# what a season's value can be: rates in [0, 1], a game's points and giveaways in reason
RANGE = {'pts': (0, 70), 'tor': (0, 8), 'epa': (-1.5, 1.5), 'ypp': (0, 15)}
# half the rounding of the published value (points to a tenth, giveaways and yards to a hundredth, the rest to a thousandth)
TOL = {'pts': 0.051, 'tor': 0.0051, 'ypp': 0.0051}


def pbp_sums(path):
    """each team-game of a season's play-by-play, by (game_id, 'home'|'away'): the sums the stats
    are made of, over scrimmage plays (a pass, sack, scramble or run with an EPA, never a kneel,
    a spike or a two-point try); and each game's highest running score"""
    cols = ['game_id', 'home_team', 'posteam', 'defteam', 'play_type', 'pass', 'rush', 'qb_kneel', 'qb_spike',
            'two_point_attempt', 'qb_scramble', 'epa', 'success', 'yards_gained', 'sack', 'interception', 'fumble_lost',
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
                                       (num('sack') == 0) & (num('yards_gained') >= 20)).astype(float)})[play]
    out = {}
    for (gid, side), x in q.groupby(['game_id', 'side']):
        d = x.groupby('drive').agg(in20=('in20', 'max'), res=('res', 'last'))
        out[(gid, side)] = {'plays': float(len(x)), 'epa': float(x.epa.sum()), 'succ': float(x.succ.sum()), 'yds': float(x.yds.sum()),
                            'expl': float(x.expl.sum()), 'to': float(x['to'].sum()), 'sacks': float(x.sacks.sum()), 'db': float(x.db.sum()),
                            'third_c': float(x.third_c.sum()), 'third_n': float(x.third_n.sum()), 'drives': float(len(d)),
                            'rz_trips': float((d.in20 == 1).sum()), 'rz_td': float(((d.in20 == 1) & (d.res == 'Touchdown')).sum())}
    return out, final


def team_files_checks(M, games, cache):
    """the published units held against games.csv and the season's play-by-play in the cache"""
    U = M.get('units') or {}
    us = int(U.get('season', M['season']))
    sg = games[(games.season == us) & games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB'])]
    clubs = set(sg.home_team) | set(sg.away_team)
    if not U.get('off'):
        chk(False, 'TEAMS: model.json has no Overall Offense')
        return
    chk('stats' in U and 'weights' in U, 'TEAMS: the units carry no stats or weights: an old build wrote them')
    if 'stats' not in U:
        return
    stats = U['stats']
    whole = True
    for side in ('off', 'def'):
        T = U.get(side) or {}
        whole &= set(T) == clubs
        chk(set(T) == clubs and len(T) == 32, f'TEAMS: {side} has {len(T)} teams, the season has {len(clubs)}: {sorted(set(T) ^ clubs)[:4]}')
        chk(sorted(v['rank'] for v in T.values()) == list(range(1, len(T) + 1)), f'TEAMS: the {side} ranks are not 1 to {len(T)} once each')
        w = U['weights'].get(side) or {}
        mine = {s['key'] for s in stats if s['side'] == side}
        chk(sum(w.values()) == 100 and all(v >= 0 for v in w.values()) and set(w) <= mine and mine == set(TEAM_STAT),
            f'TEAMS: the {side} weights do not sum to 100 over its stats, or a stat is missing: {w}, {sorted(mine)}')
        chk(all(s['weight'] == w.get(s['key'], 0) for s in stats if s['side'] == side), f'TEAMS: the {side} stat list and the weights disagree')
        chk(all(s['better'] == ('high' if (TEAM_STAT[s['key']][2] > 0) == (side == 'off') else 'low') for s in stats if s['side'] == side and s['key'] in TEAM_STAT),
            f'TEAMS: a {side} stat says better the wrong way round')
    if not whole:
        return
    # the play-by-play the build read, read again here
    path = os.path.join(cache, f'play_by_play_{us}.csv.gz')
    finals = sg[sg.home_score.notna() & sg.away_score.notna()]
    if not os.path.exists(path):
        chk(not len(finals), f'TEAMS: {len(finals)} finals of {us} but no play-by-play in the cache to hold them against')
        return
    sums, final = pbp_sums(path)
    rated = []
    for r in finals.itertuples(index=False):
        ok = (r.game_id, 'home') in sums and (r.game_id, 'away') in sums and final.get(r.game_id) == (float(r.home_score), float(r.away_score))
        if ok:
            rated.append(r)
    want_pending = sorted(set(finals.game_id) - {r.game_id for r in rated})
    chk(sorted(U.get('pending') or []) == want_pending,
        f'TEAMS: pending should be the finals the play-by-play lacks or ends short of the score: {want_pending[:4]}, the build has {sorted(U.get("pending") or [])[:4]}')
    chk(sorted(M.get('sources', {}).get('team_stats_pending') or []) == sorted(U.get('pending') or []), 'TEAMS: sources.team_stats_pending is not the units\' pending')
    # the season's sums and the Elo, replayed from the published parameters, game by game in kickoff order
    par, K = U['params']['stats'], U['params']['K']
    teams = sorted(clubs)
    acc = {s: {t: dict.fromkeys(['g', 'pts', 'plays', 'epa', 'succ', 'yds', 'expl', 'to', 'sacks', 'db', 'third_c', 'third_n', 'drives', 'rz_trips', 'rz_td'], 0.0)
               for t in teams} for s in ('off', 'def')}
    R = {s: {k: dict.fromkeys(teams, 0.0) for k in TEAM_STAT} for s in ('off', 'def')}
    weeks = {t: [] for t in teams}
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
    played = [t for t in teams if acc['off'][t]['g']]
    for side in ('off', 'def'):
        T, w = U[side], U['weights'][side]
        bad_v, bad_r, bad_rank, bad_line, bad_sum, missing = [], [], [], [], [], []
        for t in teams:
            v, a = T[t], acc[side][t]
            if v['games'] != a['g']:
                bad_line.append(f'{t} games {v["games"]} for {int(a["g"])}')
            if [x[0] for x in v.get('line') or []] != weeks[t]:
                bad_line.append(f'{t} line weeks {[x[0] for x in v.get("line") or []]} for {weeks[t]}')
            elif weeks[t] and (v['line'][-1][1] != v['elo'] or v['before'] != (v['line'][-2][1] if len(weeks[t]) > 1 else U['start'][side])):
                bad_line.append(f'{t} line ends {v["line"][-1]} / before {v["before"]} for rating {v["elo"]}')
            if abs(sum(wt / 100 * v['stats'][k]['r'] for k, wt in w.items()) - v['raw']) > 1e-5:
                bad_sum.append(t)
            for k, (_, (n, d), sign) in TEAM_STAT.items():
                e = v['stats'].get(k)
                if e is None:
                    missing.append(f'{t} {k}')
                    continue
                if abs(e['r'] - R[side][k][t]) > 1e-5:
                    bad_r.append(f'{t} {k} {e["r"]} for {R[side][k][t]:.6f}')
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
        # the overall rank follows the raw rating, the teams that have played first
        order = sorted(played, key=lambda t: -T[t]['raw']) + sorted(t for t in teams if t not in played)
        ranks = [T[t]['rank'] for t in order]
        chk(all(ranks[i] < ranks[i + 1] or T[order[i]]['raw'] == T[order[i + 1]]['raw'] for i in range(len(played) - 1))
            and all(T[t]['rank'] > len(played) for t in teams if t not in played), f'TEAMS: the {side} ranks are not the order of the ratings')
        shown = [T[t]['elo'] for t in played]
        if len(played) >= build.RANK_TEAMS:
            mu, sd = float(np.mean(shown)), float(np.std(shown))
            chk(abs(mu - 1500) <= 1 and abs(sd - 100) <= 2, f'TEAMS: the {side} ratings are not on the bell curve: mean {mu:.1f}, spread {sd:.1f}')
        if len(rated) >= 2:
            chk(len(set(shown)) > 1, f'TEAMS: every {side} rating is the same with {len(rated)} finals rated')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(HERE, 'data'))
    ap.add_argument('--cache', default=os.path.join(HERE, 'cache'))
    ap.add_argument('--history', default=os.path.join(HERE, 'history'))
    ap.add_argument('--prev', help='the previously published players.json (default: the last commit\'s)')
    a = ap.parse_args()

    unit_checks()
    unit_team_checks()
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

    # ---- SOURCES ----
    for g in groups:
        chk(len(P['groups'][g]['top']) >= 10, f'SOURCES: the {g} rankings have {len(P["groups"][g]["top"])} players: a source is missing or the season is mistaken')
    sched = int(games.season.max())
    live = build.under_way(games, sched, built)
    need = [f'injuries_{sched}.csv', f'roster_{sched}.csv', f'play_by_play_{season}.csv.gz', f'stats_player_week_{season}.csv', f'depth_charts_{sched}.csv'] if live else []
    for name in need:
        p = os.path.join(a.cache, name)
        chk(os.path.exists(p) and os.path.getsize(p) > 100, f'SOURCES: {name} is missing: the season under way cannot be built without it')
    # ---- TEAMS: Overall Offense and Overall Defense against games.csv and the play-by-play ----
    team_files_checks(M, games, a.cache)
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
