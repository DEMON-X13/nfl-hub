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
  JOKER      the calls on the Joker's baseline (THE JOKER BASELINE in the build, 19 October 2026: the
             owner's test of the ELO Model's picks standing on the Joker's). Every coming call
             (`next`, not frozen) of a game the Joker has called in betting/state.json stands on
             that call: `base` joker, `p_joker` the state's chance, and the chance shown the gate's
             own working of the rule, the Joker's log-odds (held within 1% and 99%) plus BETA times
             the call's matchup `m`; a game the Joker has not called is the game model's own chance
             with no `base`; every call's `p_elo` the game model's matchup plus its home field
             (`coef`, 0 at a neutral site), and its pick the side its chance favours. Every ledger
             entry on the Joker keeps its Joker chance, matchup and game model's chance and its
             chance is the rule's on them; a graded call carries the ledger's `base`; the record's
             `joker_base` counts the graded published calls on the Joker, and model.json carries
             the build's JOKER_BASE. On fixtures (the build's on_joker and make_call): a matchup of
             0 leaves the Joker's chance as it is, one for the home side raises it and one against
             lowers it, the Joker's 0% and 100% are held within 1% and 99%, and with no Joker call
             the call is the game model's own. (A call that silently fell back to Elo alone where
             the Joker had a call, or stood on another chance than the Joker's, would publish green.)
             The re-picks (the owner's call of 19 October 2026: the season's games played before the
             first build on the Joker re-picked on it after they were played): an entry carrying
             `was` is a backtest on the Joker of a game that kicked off before build.JOKER_FROM, on
             the Joker's call as frozen at kickoff, its `was` the call the last publish had for it
             (pick, chance, time and src: RECORD lets that one change through, and holds the re-pick
             and its `was` as they stand on every run after) and the one held to elo/history/; every
             game of the season played before JOKER_FROM that the Joker called is re-picked; each
             graded call's `was` is the ledger's; and the record's `repicked` and `repicked_was` count
             the graded re-picks and their first calls. A re-pick done again (`joker_fix`, the build's
             refix, 25 October 2026: five weeks 3-4 re-picks stood on Joker calls that moved after
             kickoff, which betting/joker/history/2026_w3_w4.json put back) stands on a call the state
             marks published (while the state has the game), and the re-pick it replaced is whole and the rule's on another Joker
             chance; RECORD lets that one change through (only the chance, the pick and the Joker's
             chance, onto the state's) and holds it as it stands after. On fixtures, refix turns LA at
             DEN's re-pick round on the Joker's published 50.93% and keeps the rest, and
             joker_published reads only the calls marked published.
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
  AVERAGES   matchups.json's Elo-adjusted averages (`avg`, `avg_ref`, `avg_fit`; ELO-ADJUSTED AVERAGES in the
             build, 29 October 2026), every number worked out again on the gate's own reading. `avg_fit` is the
             build's ELO_AVG whole (elo/tools/elo_avg_fit.py holds the constants). The players are exactly the
             coming week's expected starters (each club's lineup in `lineups`, QB1, RB1, WR1-3, TE1 and K1 by
             ELO_AVG's `starters`) with `min_games` regular games behind them at the position, counted on the
             gate's own log: nflverse's player stats read here (its own copy of which positions make each group,
             what a game's involvement is and a regular's norm), a game kept where it has something on the
             sheet and a final in games.csv, in games.csv's order, the playoffs after week 18. Each gives his game,
             club, opponent, home and slot as the schedule and the lineup have them, every leg of his position
             and no other, and for each: his average (the leg's half-life, season weight and prior games at the
             position's mean over every season before, the gate's own sums), what the defence allowed the position
             (its own half-life-six average over the fit's mean), his place on targets among his lineup's receivers
             at his position (its own half-life four), the opponent's tables and his club's offence table (the
             gate's own replay of the season from its play-by-play and the carry: raw, the curve unrounded, and the
             Elo and rank the units show), his career rating the players map's and his season rating the
             rankings' where they show it (1500 with no game this season), the opposing defenders the league's;
             then on those inputs the projection, its no-Elo twin, the Elo part, its sd and the part in sd (the
             gate's own arithmetic of each leg's terms, coefficients and spread), the defence's and player's
             Elo part's split, the defence's multiplier against `avg_ref` (itself the gate's own league means) and
             his Elo's, the twin times the two the projection, so together they point the Elo part's way (the old
             split against a 1500 player, which pointed the other way on 128 trusted legs, refused). Before a new
             season is under way its player stats are not posted yet, and its file is not asked for. On fixtures
             (the build's own functions on invented data): its average is the gate's for every shape of half-life,
             season weight and prior; a game with nothing on the sheet, or under a regular's norm, moves no average;
             each spread's sd and every leg's projection, twin and split are the gate's (the defence at the league's
             average multiplies by 1); the gate's own log reads a coming season's missing file only once that
             season is under way; and on a made-up week the build covers exactly the starters it should, ranks a club's receivers
             on targets, reads the opponent's tables, his own club's offence and the opposing defenders, and a
             better defence moves the projection by exactly its coefficient. (A projection read off the wrong
             club's table, a regular's norm turned round, an average that counted a quiet game, a twin with the
             Elo terms in, or a leg left out would publish green.)
  UNITS      the build's own functions on fixtures: two equal teams at a neutral site are 50/50;
             a fullback listed first does not take the second running back's place; a club on its
             bye keeps its roster; a player out last week and not practising stays out.
"""
import argparse, datetime, functools, json, math, os, subprocess, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build  # noqa: E402

fails, notes = [], []
checks = 0


def unit_ranks_bad(T, rated):
    """the clubs of a unit table whose rank is not its rank on the Elo shown (clubs level on it share a rank, one more
    than the clubs above them, since 22 October 2026), or, for a club with no rating, not after every rated club and
    once each: [] where every rank is right"""
    rated = [t for t in rated if t in T]
    bad = [f'{t} {T[t]["rank"]} for {1 + sum(1 for u in rated if T[u]["elo"] > T[t]["elo"])}' for t in rated
           if T[t]['rank'] != 1 + sum(1 for u in rated if T[u]['elo'] > T[t]['elo'])]
    rest = sorted(T[t]['rank'] for t in T if t not in rated)
    if rest != list(range(len(rated) + 1, len(rated) + 1 + len(rest))):
        bad.append(f'the clubs with no rating ranked {rest}')
    return bad


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
    # the Joker's baseline (THE JOKER BASELINE): no matchup leaves the Joker's chance as it is; a matchup
    # for the home side raises it and one against lowers it; 0% and 100% are held within 1% and 99%;
    # with no Joker call the call is the game model's own
    chk(abs(build.on_joker(0.62, 0.0) - 0.62) < 1e-12, 'JOKER: a matchup of 0 moved the Joker\'s chance')
    chk(build.on_joker(0.62, 0.5) > 0.62 > build.on_joker(0.62, -0.5), 'JOKER: the Elo matchup does not move the Joker\'s chance its way')
    chk(abs(build.on_joker(1.0, 0.0) - 0.99) < 1e-12 and abs(build.on_joker(0.0, 0.0) - 0.01) < 1e-12,
        'JOKER: the Joker\'s chance is not held within 1% and 99%')
    wj = np.array([0.25] + [0.5] * 8)
    xj = [0.3, -0.1, 0.2, 0.0, 0.1, -0.2, 0.0, 0.4]
    alone, on = build.make_call(wj, 1.0, xj, None), build.make_call(wj, 1.0, xj, 0.4)
    mj = float(np.dot(wj[1:], xj))
    chk(alone.get('base') is None and alone['p_home'] == alone['p_elo'] == round(1 / (1 + math.exp(-(0.25 + mj))), 4),
        f'JOKER: with no Joker call the call is not the game model\'s own: {alone}')
    chk(on.get('base') == 'joker' and on['p_joker'] == 0.4 and on['p_elo'] == alone['p_elo'] and abs(on['m'] - mj) < 1e-4
        and on['p_home'] == round(1 / (1 + math.exp(-(math.log(0.4 / 0.6) + build.JOKER_BASE['beta'] * mj))), 4),
        f'JOKER: a call on the Joker\'s 40% is not the rule\'s: {on}')
    # a re-pick done again on the Joker's call as published before kickoff (refix): LA at DEN's re-pick stood on the
    # Joker's 51.78%, which moved after kickoff from the 50.93% published before it; on 50.93% and the same matchup it
    # turns round to LA, everything but the chance, the pick and the Joker's chance kept, the old re-pick in joker_fix
    rp = {'pick': 'DEN', 'p_home': 0.5077, 'at': '2026-10-19T16:39+00:00', 'src': 'backtest', 'base': 'joker', 'p_joker': 0.5178,
          'p_elo': 0.5124, 'm': -0.1972, 'was': {'pick': 'LA', 'p_home': 0.3806, 'at': '2026-09-25T17:33+00:00', 'src': 'published'}}
    fx = build.refix(rp, 0.5093, 'DEN', 'LA', '2026-10-26T12:40+00:00')
    chk(fx['pick'] == 'LA' and fx['p_home'] == 0.4992 and fx['p_joker'] == 0.5093
        and all(fx[k] == rp[k] for k in ('at', 'src', 'base', 'p_elo', 'm', 'was'))
        and fx['joker_fix'] == {'pick': 'DEN', 'p_home': 0.5077, 'p_joker': 0.5178, 'at': '2026-10-26T12:40+00:00'},
        f'JOKER: a re-pick done again on the Joker\'s published call is not the rule\'s: {fx}')
    fx2 = build.refix({**rp, 'pick': 'IND', 'p_home': 0.3304, 'p_joker': 0.3325, 'm': -0.0463}, 0.4265, 'WAS', 'IND', 'x')
    chk(fx2['pick'] == 'IND' and fx2['p_home'] == 0.4242, f'JOKER: IND at WAS\'s re-pick on 42.65% is not IND at 42.42%: {fx2}')
    import tempfile
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as tf:
        json.dump({'joker': {'g1': {'pick': 'A', 'pHome': 0.4, 'src': 'published'}, 'g2': {'pick': 'B', 'pHome': 0.6},
                             'g3': {'pick': 'C', 'pHome': 0.7, 'src': 'backtest'}, 'g4': {'pick': 'D', 'pHome': 1.2, 'src': 'published'},
                             'g5': 'junk'}}, tf)
    try:
        chk(build.joker_published(tf.name) == {'g1': 0.4}, f'JOKER: joker_published read more than the calls marked published: {build.joker_published(tf.name)}')
        chk(set(build.joker_calls(tf.name)) == {'g1', 'g2', 'g3'}, 'JOKER: joker_calls changed with joker_published')
    finally:
        os.unlink(tf.name)
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
    chk(out.get('b3') is None and 'b3' in q, f'UNITS: a questionable player who did not practise at the last report should be listed with a Q, not counted out: {out.get("b3")} {q.get("b3")}')
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
    # ranks: on the Elo shown, clubs level on it sharing a rank, the ones with a rating first
    for s in TABLE:
        bad = unit_ranks_bad(U[s], [t for t, v in U[s].items() if v['games'] or v['carried']])
        chk(not bad, f'TEAMS: the {s} ranks are not the clubs\' ranks on the Elo shown: {bad[:4]}')

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


@functools.lru_cache(maxsize=None)      # read once a run: TEAMS and AVERAGES both replay a season from it
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
        # the overall rank is the club's rank on the Elo shown (clubs level on it sharing a rank, since 22 October 2026),
        # the teams with a rating (played, or carried) first; and the Elo shown follows the raw rating
        bad = unit_ranks_bad(T, with_rating)
        chk(not bad, f'TEAMS: the {side} ranks are not the clubs\' ranks on the Elo shown: {bad[:4]}')
        order = sorted(with_rating, key=lambda t: -T[t]['raw'])
        chk(all(T[order[i]]['elo'] >= T[order[i + 1]]['elo'] for i in range(len(order) - 1)), f'TEAMS: the {side} Elo shown is not the order of the raw ratings')
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


# ---- AVERAGES: matchups.json's Elo-adjusted averages (ELO-ADJUSTED AVERAGES) on the gate's own reading ----
# the gate's own copies (a deliberate change edits both and says why in the build's docstring): the positions that
# make each group, what a game's involvement is for each, a regular's norm (the build's VOLUME; the share is ELO_AVG's
# `regular`), the playoff rounds' places after week 18, the half-lives of the pecking order on targets and of what a
# defence has allowed, and the receivers ranked on targets with the places that count (WR1 and WR2; TE1)
AVG_POS = {'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'WR': 'WR', 'TE': 'TE', 'K': 'K'}
AVG_VOL = {'QB': ('attempts', 'carries', 'sacks_suffered'), 'RB': ('carries', 'targets'), 'WR': ('targets', 'carries'),
           'TE': ('targets', 'carries'), 'K': ('fg_att', 'pat_att')}
AVG_NORM = {'QB': 25, 'RB': 12, 'WR': 6, 'TE': 4}
AVG_ORD = {'WC': 100, 'DIV': 101, 'CON': 102, 'SB': 103}
AVG_TGT_HL, AVG_ALLOWED_HL = 4, 6
AVG_RANKED = {'WR': 2, 'TE': 1}
AVG_NUM = ['completions', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions', 'sacks_suffered', 'carries',
           'rushing_yards', 'rushing_tds', 'receptions', 'targets', 'receiving_yards', 'receiving_tds', 'fg_made', 'fg_att',
           'pat_made', 'pat_att']


def avg_ord(game_type, week):
    return int(week) if game_type == 'REG' else AVG_ORD[game_type]


def avg_log(cache, games, upto, built):
    """every offensive player-game and every kicker's with something on the sheet and a final in games.csv, from
    nflverse's player stats read here, in games.csv's order: the gate's own log, each game marked regular or not.
    The coming games' season before it is under way (its fortnight of preseason calls) has no player stats posted
    yet, as SOURCES allows, and is read only where its file is there"""
    fin = games[games.home_score.notna()]
    at = {gid: (int(s), avg_ord(t, w)) for gid, s, w, t in zip(fin.game_id, fin.season, fin.week, fin.game_type)}
    parts = []
    for y in range(build.FIRST, upto + 1):
        path = os.path.join(cache, f'stats_player_week_{y}.csv')
        if not os.path.exists(path):
            if y == upto and not build.under_way(games, y, built):
                continue
            chk(False, f'AVERAGES: stats_player_week_{y}.csv is not in the cache, so no average can be held against it')
            continue
        have = set(pd.read_csv(path, nrows=0).columns)
        parts.append(pd.read_csv(path, usecols=[c for c in ['player_id', 'position', 'game_id', 'opponent_team'] + AVG_NUM if c in have],
                                 low_memory=False))
    d = pd.concat(parts, ignore_index=True)
    d['group'] = d.position.map(AVG_POS)
    d = d[d.group.notna() & d.game_id.isin(at)].copy()
    for c in AVG_NUM:
        d[c] = pd.to_numeric(d[c], errors='coerce').fillna(0.0) if c in d else 0.0
    vol = np.zeros(len(d))
    for g, cols in AVG_VOL.items():
        m = (d.group == g).values
        vol[m] = sum(d[c].values[m] for c in cols)
    d['vol'] = vol
    d = d[d.vol > 0].copy()
    d['season'] = [at[g][0] for g in d.game_id]
    d['ord'] = [at[g][1] for g in d.game_id]
    d['scrim_yards'] = d.rushing_yards + d.receiving_yards
    d['any_td'] = d.rushing_tds + d.receiving_tds
    d['kick_pts'] = 3 * d.fg_made + d.pat_made
    d['reg'] = (d.group == 'K') | (d.vol >= build.ELO_AVG['regular'] * d.group.map(AVG_NORM))
    return d.sort_values(['season', 'ord'], kind='mergesort').reset_index(drop=True)


def avg_mean_own(vals, seasons, h, k, c, season, prior):
    """the gate's own average: the latest regular game weighs 1, each before it half as much every h games (h None:
    all alike), times c for each season boundary between it and the game in question, plus k games at the prior"""
    n = len(vals)
    age = np.arange(n - 1, -1, -1, dtype=float)
    w = (np.power(0.5, age / h) if h else np.ones(n)) * np.power(float(c), season - np.asarray(seasons, dtype=float))
    tot = float(w.sum()) + k
    return (float(np.dot(w, np.asarray(vals, dtype=float))) + k * prior) / tot if tot > 0 else None


def ewm_last_own(vals, hl):
    v = np.asarray(vals, dtype=float)
    w = np.power(0.5, np.arange(len(v) - 1, -1, -1) / hl)
    return float(np.dot(w, v) / w.sum())


def avg_sd_own(sp, mu):
    mu = max(mu, 1e-3)
    if sp['dist'] == 'poisson':
        return mu ** 0.5
    if sp['dist'] == 'nb':
        return (mu * (1 + mu / sp['r'])) ** 0.5
    if sp['dist'] == 'qp':
        return (sp['phi'] * mu) ** 0.5
    return mu * sp['rsd'][sum(1 for e in sp['edges'] if e < mu)]      # mu on an edge is the lower fifth


def avg_leg_own(leg, avg, x, ref):
    """one leg on the gate's own arithmetic: the projection, its no-Elo twin, the Elo part, its sd, the part in sd, and
    the Elo part's split: the defence's multiplier (the projection over the same with the league's average defence)
    and his Elo's (the rest of the projection over its twin), so the twin times the two is the projection"""
    lb = math.log(max(leg['eps'] if avg is None else avg, leg['eps']))
    eta = lambda terms, coef, xx: sum(c * (1.0 if t == 'one' else lb if t == 'log_avg' else xx[t]) for t, c in zip(terms, coef)) + lb
    ex = lambda z: math.exp(min(30.0, max(-30.0, z)))
    e1 = eta(leg['terms'], leg['coef'], x)
    proj, proj0 = ex(e1), ex(eta(leg['no_elo']['terms'], leg['no_elo']['coef'], x))
    sd = avg_sd_own(leg['spread'], proj)
    first = 'E:' + leg['tables'][0]
    xa = {t: (ref[t] if t.startswith('E:') or t in ('DL', 'LB', 'DB') else v) for t, v in x.items()}
    if 'EP' in x:
        xa['EP'] = xa[first] * x['P']
    dx = math.exp(e1 - eta(leg['terms'], leg['coef'], xa))
    return {'proj': proj, 'no_elo': proj0, 'elo': proj - proj0, 'sd': sd, 'z': (proj - proj0) / sd,
            'def_x': dx, 'elo_x': proj / (proj0 * dx)}


def avg_tables_own(M, games, cache, season):
    """every club's rating on each of the ELO tab's tables as it stands in `season`, on the gate's own replay (that
    season's play-by-play from the carry of the one before): {table: {club: (raw, shown unrounded)}}, the clubs with a
    rating"""
    U = M.get('units') or {}
    par, K, W = U['params']['stats'], U['params']['K'], U['weights']

    def season_games(s):
        x = games[(games.season == s) & games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB'])].copy()
        for c in ('home_team', 'away_team'):
            x[c] = x[c].replace(MOVED)
        return x
    sg = season_games(season)
    path = os.path.join(cache, f'play_by_play_{season}.csv.gz')
    sums, final = pbp_sums(path) if os.path.exists(path) else ({}, {})
    start = None
    prev = os.path.join(cache, f'play_by_play_{season - 1}.csv.gz')
    if season - 1 >= build.FIRST and os.path.exists(prev):
        p_sums, p_final = pbp_sums(prev)
        _, PR, _, pacc, _, _ = team_replay(season_games(season - 1), p_sums, p_final, par, K, W)
        start = {t: {s: {k: CARRY * PR[s][k][t] for k in TEAM_STAT} for s in ('off', 'def')} for t in pacc['off'] if pacc['off'][t]['g']}
    _, R, _, acc, _, _ = team_replay(sg, sums, final, par, K, W, start)
    teams = sorted(set(sg.home_team) | set(sg.away_team))
    rated = [t for t in teams if acc['off'][t]['g'] or t in (start or {})]
    out = {}
    for name, (ball, _) in TABLE.items():
        tot = {t: sum(wt / 100 * R[ball][k][t] for k, wt in W[name].items()) for t in teams}
        xs = np.array([tot[t] for t in rated]) if rated else np.zeros(1)
        mu_, sd_ = float(xs.mean()), float(xs.std())
        out[name] = {t: (tot[t], 1500 + 100 * (tot[t] - mu_) / sd_ if sd_ > 1e-9 else 1500.0) for t in teams}
    return out, rated


def avg_checks(MU, P, M, games, cache, built):
    """matchups.json's `avg`, `avg_ref` and `avg_fit` against the gate's own reading (AVERAGES)"""
    A = build.ELO_AVG
    chk(MU.get('avg_fit') == json.loads(json.dumps(A)), 'AVERAGES: matchups.json does not carry the build\'s ELO_AVG as avg_fit')
    AV, REF = MU.get('avg'), MU.get('avg_ref')
    chk(isinstance(AV, dict) and isinstance(REF, dict), 'AVERAGES: matchups.json has no Elo-adjusted averages (avg, avg_ref)')
    if not isinstance(AV, dict) or not isinstance(REF, dict):
        return
    # the coming games, by the build's rule: the earliest week with a game still to kick off (CALL_LEAD from now)
    g = games.copy()
    g['ord'] = [avg_ord(t, w) for t, w in zip(g.game_type, g.week)]
    for c in ('home_team', 'away_team'):
        g[c] = g[c].replace(MOVED)
    lead = built + datetime.timedelta(minutes=build.CALL_LEAD)
    up = g[(g.season >= int(M['season'])) & g.home_score.isna() & (g.kick > lead)].sort_values(['season', 'ord', 'kick'], kind='mergesort')
    coming = up.iloc[0:0]
    if len(up):
        f = up.iloc[0]
        if not (int(f.season) > int(M['season']) and f.kick - built > datetime.timedelta(days=build.PRESEASON_CALLS)):
            coming = up[(up.season == f.season) & (up.ord == f.ord)]
    if not len(coming):
        chk(not AV, f'AVERAGES: {len(AV)} players projected with no game to come')
        return
    season = int(coming.season.iloc[0])
    chk(MU.get('season') == season and MU.get('week') == int(coming.week.min()),
        f'AVERAGES: the averages are for {MU.get("season")} week {MU.get("week")}, the coming games {season} week {int(coming.week.min())}')
    log = avg_log(cache, games, season, built)
    reg = log[log.reg]
    n_reg = reg.groupby(['player_id', 'group']).size().to_dict()
    by_pid = {pid: x for pid, x in log.groupby('player_id', sort=False)}
    lineups = MU.get('lineups') or {}
    # the players: each coming game's expected starters with min_games regular games behind them at the position
    want, bad = {}, []
    edge = lead + datetime.timedelta(seconds=60)       # built_at is to the minute: a kickoff within it may go either way
    for r in coming.itertuples(index=False):
        sides = ((r.home_team, r.away_team, 1), (r.away_team, r.home_team, 0))
        lus = [lineups.get(t) for t, _, _ in sides]
        if not all(lu and lu.get('game_id') == r.game_id and lu.get('players') for lu in lus):
            continue                                # no lineup for a side: the build projects nobody in the game
        for (t, o, h), lu in zip(sides, lus):
            grp = lu.get('groups')
            if not isinstance(grp, list) or len(grp) != len(lu['players']):
                bad.append(f'{t}\'s lineup carries no groups')
                continue
            cnt = {}
            for pid, gp in zip(lu['players'], grp):
                cnt[gp] = cnt.get(gp, 0) + 1
                if gp in A['starters'] and cnt[gp] <= A['starters'][gp] and n_reg.get((pid, gp), 0) >= A['min_games']:
                    want[pid] = {'game_id': r.game_id, 'team': t, 'opp': o, 'home': h, 'group': gp, 'slot': cnt[gp],
                                 'games': n_reg[(pid, gp)], 'mates': [p for p, q in zip(lu['players'], grp) if q == gp], '_edge': r.kick <= edge}
    missing = sorted(p for p, w in want.items() if p not in AV and not w['_edge'])
    extra = sorted(p for p in AV if p not in want)
    chk(not missing and not extra, f'AVERAGES: the projected players are not the coming expected starters with {A["min_games"]} regular '
        f'games: missing {missing[:5]}, extra {extra[:5]}')
    tabs, rated = avg_tables_own(M, games, cache, season)
    U = M.get('units') if (M.get('units') or {}).get('season') == season else None
    LG = (MU.get('league') or {}).get('defs') or {}
    ref = {'raw': {n: float(np.mean([tabs[n][t][0] for t in rated])) for n in tabs},
           'shown': {n: float(np.mean([(tabs[n][t][1] - 1500) / 100 for t in rated])) for n in tabs},
           'defs': {u: float(np.mean([(v[u] - 1500) / 100 for v in LG.values()])) if LG else 0.0 for u in ('DL', 'LB', 'DB')}}
    rbad = [f'{s} {n} {REF.get(s, {}).get(n)} for {v:.6f}' for s in ('raw', 'shown', 'defs') for n, v in ref[s].items()
            if not isinstance(REF.get(s, {}).get(n), (int, float)) or abs(REF[s][n] - v) > (1e-3 if s == 'defs' else 1e-5)]
    chk(not rbad, f'AVERAGES: avg_ref is not the league\'s average defence as it stands: {rbad[:4]}')
    pl = P.get('players') or {}
    top = {x['id']: x for grp in (P.get('groups') or {}).values() for x in grp.get('top', [])}
    prior, allowed, tgt = {}, {}, {}
    worst = {}
    for pid, b in AV.items():
        w = want.get(pid)
        if w is None:
            continue
        gp = b.get('group')
        if any(b.get(k) != w[k] for k in ('game_id', 'team', 'opp', 'home', 'group', 'slot', 'games')):
            bad.append(f'{pid} is {[b.get(k) for k in ("game_id", "team", "opp", "home", "group", "slot", "games")]}, the schedule and '
                       f'lineup say {[w[k] for k in ("game_id", "team", "opp", "home", "group", "slot", "games")]}')
            continue
        legs = [(k.split('|')[1], v) for k, v in A['legs'].items() if k.split('|')[0] == gp]
        if sorted(b.get('stats') or {}) != sorted(c for c, _ in legs):
            bad.append(f'{pid} ({gp}) has legs {sorted(b.get("stats") or {})}, not his position\'s {sorted(c for c, _ in legs)}')
            continue
        if pid in pl and abs(b['R'] - pl[pid]['elo']) > 0.5 + 1e-6:
            bad.append(f'{pid}\'s career rating {b["R"]} is not the players map\'s {pl[pid]["elo"]}')
        mine = by_pid[pid]
        if pid in top and isinstance(top[pid].get('raw'), (int, float)) and abs(b['RS'] - top[pid]['raw']) > 0.5 + 1e-6:
            bad.append(f'{pid}\'s season rating {b["RS"]} is not the rankings\' {top[pid]["raw"]}')
        elif not (mine.season == season).any() and b['RS'] != 1500:
            bad.append(f'{pid} has no game in {season} but a season rating of {b["RS"]}')
        lg = LG.get(b['opp']) or {}
        if any(abs(b['D'][u] - lg.get(u, -1e9)) > 0.05 + 1e-6 for u in ('DL', 'LB', 'DB')):
            bad.append(f'{pid}\'s opposing defenders {b["D"]} are not the league\'s {lg} for {b["opp"]}')
        for t, e in (b.get('defs') or {}).items():
            raw, shown = tabs[t][b['opp']]
            if abs(e['raw'] - raw) > 1e-5 or abs(e['shown'] - shown) > 1e-3 or (U and (e['elo'] != U[t][b['opp']]['elo'] or e['rank'] != U[t][b['opp']]['rank'])):
                bad.append(f'{pid}: {b["opp"]}\'s {t} {e} is not the gate\'s replay ({raw:.6f}, {shown:.3f}) and the tab\'s Elo and rank')
        for t, v in (b.get('own') or {}).items():
            if abs(v - tabs[t][b['team']][0]) > 1e-5:
                bad.append(f'{pid}: {b["team"]}\'s own {t} {v} is not the gate\'s replay {tabs[t][b["team"]][0]:.6f}')
        rk = None
        if gp in AVG_RANKED:
            for p in w['mates']:
                if p not in tgt:
                    x = by_pid.get(p)
                    x = x[x.group != 'K'] if x is not None else None
                    tgt[p] = ewm_last_own(x.targets.values, AVG_TGT_HL) if x is not None and len(x) else 0.0
            r = sum(1 for q in set(w['mates']) if q != pid and tgt[q] > tgt[pid])
            rk = {'rk0': float(r == 0), 'rk1': float(r == 1 and AVG_RANKED[gp] > 1)}
            if b.get('rank_on_targets') != r + 1:
                bad.append(f'{pid} is {b.get("rank_on_targets")} on targets among {w["mates"]}, the gate has him {r + 1}')
        hr = mine[(mine.group == gp) & mine.reg]
        for col, leg in legs:
            st = b['stats'][col]
            if (gp, col) not in prior:
                rr = reg[reg.group == gp]
                before = rr[rr.season < season]
                prior[(gp, col)] = float(before[col].mean()) if len(before) else float(rr[rr.season == season][col].mean())
            av = avg_mean_own(hr[col].values, hr.season.values, *leg['avg'], season, prior[(gp, col)])
            if (av is None) != (st.get('avg') is None) or (av is not None and abs(st['avg'] - av) > 5e-5 + 1e-9 * abs(av)):
                bad.append(f'{pid} {col}: his average {st.get("avg")}, the gate\'s {av}')
            x = {'P': ((b['R'] if leg['player'] == 'R' else b['RS']) - 1500) / 100} if leg['player'] else {}
            for t in leg['tables']:
                raw, shown = tabs[t][b['opp']]
                x['E:' + t] = raw if leg['scale'] == 'raw' else (shown - 1500) / 100
            if leg['player']:
                x['EP'] = x['E:' + leg['tables'][0]] * x['P']
            x.update({u: (b['D'][u] - 1500) / 100 for u in ('DL', 'LB', 'DB')}, home=float(w['home']), **(rk or {}))
            for t in leg['terms']:
                if t.startswith('own:'):
                    x[t] = tabs[t[4:]][b['team']][0]
            if 'log_allowed' in leg['terms']:
                if (gp, col) not in allowed:
                    rr = reg[reg.group == gp].groupby(['season', 'ord', 'opponent_team'])[col].mean().reset_index()
                    rr = rr.sort_values(['season', 'ord'], kind='mergesort')
                    allowed[(gp, col)] = {t: ewm_last_own(v.values, AVG_ALLOWED_HL) / leg['allowed_mean'] for t, v in rr.groupby('opponent_team')[col]}
                a = allowed[(gp, col)].get(b['opp'], 1.0)
                if not isinstance(st.get('allowed'), (int, float)) or abs(st['allowed'] - a) > 2e-6 * max(1.0, a):
                    bad.append(f'{pid} {col}: {b["opp"]} allowed {st.get("allowed")}, the gate {a:.6f}')
                x['log_allowed'] = math.log(max(a, 1e-3))
            rf = {**{'E:' + t: ref[leg['scale']][t] for t in leg['tables']}, **ref['defs']}
            o = avg_leg_own(leg, av, x, rf)
            # each number is written to four places (one unit in the last, as a hair either way rounds the other way);
            # the inputs differ from the build's by the units' raw ratings written to six (a millionth of the projection
            # at most), and the multipliers' league by its defenders written to a tenth (avg_ref)
            near = 1e-4 + 1e-6 * o['proj']
            for k, tol in (('proj', near), ('no_elo', near), ('elo', near), ('sd', near), ('z', 1e-4 + near / o['sd']),
                           ('def_x', 2e-4), ('elo_x', 2e-4)):
                miss = abs(st.get(k, float('nan')) - o[k])
                if not miss <= tol:
                    bad.append(f'{pid} {col}: {k} {st.get(k)}, the gate\'s {o[k]:.6f}')
                worst[k] = max(worst.get(k, 0.0), miss / tol if miss == miss else 9.0)
            # the breakdown agrees with the lean: the twin times the defence's and his Elo's multipliers is the projection,
            # so the two together point the Elo part's way (the review of 29 October 2026: the old split, against a 1500
            # player, pointed the other way on 128 trusted legs)
            if not abs(st['no_elo'] * st['def_x'] * st['elo_x'] - st['proj']) <= 1e-3 * max(1.0, st['proj']):
                bad.append(f'{pid} {col}: the twin {st["no_elo"]} times the multipliers is not the projection {st["proj"]}')
            if abs(st['elo']) > 2e-3 * max(1.0, st['proj']) and (st['def_x'] * st['elo_x'] - 1) * st['elo'] <= 0:
                bad.append(f'{pid} {col}: x{st["def_x"]} x{st["elo_x"]} points away from the Elo part {st["elo"]}')
            if set(st) & {'player_x', 'level_x'}:
                bad.append(f'{pid} {col}: carries the old split against a 1500 player')
            e0 = (b.get('defs') or {}).get(leg['tables'][0]) or {}
            if st.get('vs') != {'table': leg['tables'][0], 'elo': e0.get('elo'), 'rank': e0.get('rank')}:
                bad.append(f'{pid} {col}: faces {st.get("vs")}, not {b["opp"]}\'s {leg["tables"][0]}')
    chk(not bad, f'AVERAGES: {"; ".join(bad[:4])}{" ..." if len(bad) > 4 else ""} ({len(bad)})')
    n_legs = sum(len(b.get('stats') or {}) for b in AV.values())
    notes.append(f'averages: {len(AV)} expected starters, {n_legs} legs held on the gate\'s own reading (the largest miss '
                 f'{max(worst.values(), default=0):.2f} of its tolerance: ' + ', '.join(f'{k} {v:.2f}' for k, v in worst.items())
                 + f'); {sum(1 for p in AV if p not in pl)} not in the players map')


def avg_fixture_checks():
    """the build's ELO-ADJUSTED AVERAGES functions on invented data, against the gate's own arithmetic (AVERAGES)"""
    A = build.ELO_AVG
    vals = [3.0, 7.0, 0.0, 5.0, 4.0, 9.0, 2.0, 6.0]
    seas = [2023, 2023, 2024, 2024, 2024, 2025, 2025, 2025]
    bad = []
    for h, k, c in ((None, 0, 1.0), (None, 8, 1.0), (20, 1, 0.5), (3, 0, 1.0), (None, 2, 0.5), (12, 0, 0.5), (40, 2, 0.5), (2, 4, 1.0)):
        for season in (2025, 2026):
            got, want = build.avg_value(vals, seas, h, k, c, season, 4.5), avg_mean_own(vals, seas, h, k, c, season, 4.5)
            if abs(got - want) > 1e-12:
                bad.append(f'({h}, {k}, {c}) in {season}: {got} for {want}')
    chk(not bad and build.avg_value([], [], None, 0, 1.0, 2026, 4.5) is None and build.avg_value([], [], 6, 2, 0.5, 2026, 4.5) == 4.5,
        f'AVERAGES: the build\'s average is not the gate\'s on invented games: {bad[:3]}')
    # a regular's game: the norm's share and up, a kicker any game he kicked; a game with nothing on the sheet never
    reg = [(v, p, build.avg_is_regular(v, p)) for p in ('QB', 'RB', 'WR', 'TE', 'K')
           for v in (0.0, 1.0, AVG_NORM.get(p, 3) * A['regular'] - 0.01, AVG_NORM.get(p, 3) * A['regular'], 40.0)]
    chk(all(r == (v > 0 if p == 'K' else v >= A['regular'] * AVG_NORM[p]) for v, p, r in reg),
        f'AVERAGES: the build\'s regular game is not the gate\'s: {[x for x in reg if x[2] != (x[0] > 0 if x[1] == "K" else x[0] >= A["regular"] * AVG_NORM[x[1]])][:3]}')
    sps = ({'dist': 'poisson'}, {'dist': 'nb', 'r': 8.4}, {'dist': 'qp', 'phi': 0.83},
           {'dist': 'ratio', 'edges': [10.0, 20.0, 30.0, 40.0], 'rsd': [1.0, 0.8, 0.6, 0.5, 0.4]})
    bad = [(sp['dist'], mu) for sp in sps for mu in (0.0, 0.4, 3.0, 10.0, 10.5, 20.0, 25.0, 40.0, 55.0)
           if abs(build.avg_sd(sp, mu) - avg_sd_own(sp, mu)) > 1e-12]
    chk(not bad, f'AVERAGES: the build\'s spread is not the gate\'s: {bad[:4]}')
    # every leg on invented inputs: the projection, twin, Elo part, sd and the Elo part's split; the defence at the
    # league's average multiplies by 1, and the twin times the two multipliers is the projection
    bad = []
    for key, leg in A['legs'].items():
        x = {'home': 1.0, 'log_allowed': math.log(1.1), 'DL': 0.21, 'LB': -0.12, 'DB': 0.33, 'rk0': 0.0, 'rk1': 1.0}
        for i, t in enumerate(leg['tables']):
            x['E:' + t] = (0.31 if leg['scale'] == 'raw' else 0.42) - 0.1 * i
        if leg['player']:
            x['P'] = 0.71
            x['EP'] = x['E:' + leg['tables'][0]] * x['P']
        for t in leg['terms']:
            if t.startswith('own:'):
                x[t] = 0.05
        ref = {**{'E:' + t: 0.11 for t in leg['tables']}, 'DL': 0.13, 'LB': 0.31, 'DB': 0.25}
        for avg in (4.0, leg['eps'] / 2, None):
            proj, proj0, part, sd, z = build.avg_project(leg, avg, x)
            dx = build.avg_split(leg, x, ref)
            o = avg_leg_own(leg, avg, x, ref)
            got = {'proj': proj, 'no_elo': proj0, 'elo': part, 'sd': sd, 'z': z, 'def_x': dx, 'elo_x': proj / (proj0 * dx)}
            bad += [f'{key} {k} {got[k]} for {o[k]}' for k in got if abs(got[k] - o[k]) > 1e-9 * max(1.0, abs(o[k]))]
        xa = dict(x, **{t: ref[t] for t in ref if t in x})
        if leg['player']:
            xa['EP'] = xa['E:' + leg['tables'][0]] * xa['P']
        if abs(build.avg_split(leg, xa, ref) - 1) > 1e-12:
            bad.append(f'{key}: the defence at the league\'s average does not multiply by 1')
    chk(not bad, f'AVERAGES: the build\'s leg is not the gate\'s on invented inputs: {bad[:3]}')
    avg_log_fixture()
    avg_week_fixture()


def avg_log_fixture():
    """the gate's own log in a new season's preseason (the review of 29 October 2026): the coming season's player stats
    are not posted until its games are played, so before it is under way its missing file is no failure and the log is
    the seasons before; once it is under way the missing file fails, as SOURCES has it"""
    import tempfile
    S = 2030
    cols = ['player_id', 'position', 'game_id', 'opponent_team'] + AVG_NUM
    g = pd.DataFrame([{'game_id': f'{S}_01_AAA_BBB', 'season': S, 'week': 1, 'game_type': 'REG', 'home_score': 20.0,
                       'gameday': f'{S}-09-12', 'gametime': '13:00'},
                      {'game_id': f'{S + 1}_01_AAA_BBB', 'season': S + 1, 'week': 1, 'game_type': 'REG', 'home_score': np.nan,
                       'gameday': f'{S + 1}-09-11', 'gametime': '13:00'}])
    before = datetime.datetime(S + 1, 9, 1, tzinfo=datetime.timezone.utc)
    after = datetime.datetime(S + 1, 9, 20, tzinfo=datetime.timezone.utc)
    with tempfile.TemporaryDirectory() as tmp:
        for y in range(build.FIRST, S + 1):
            rows = [dict({c: 0 for c in cols}, player_id='p1', position='WR', game_id=f'{S}_01_AAA_BBB', opponent_team='BBB',
                         receptions=5, targets=7, receiving_yards=61)] if y == S else []
            pd.DataFrame(rows, columns=cols).to_csv(os.path.join(tmp, f'stats_player_week_{y}.csv'), index=False)
        n0 = len(fails)
        d = avg_log(tmp, g, S + 1, before)
        ok_pre = len(fails) == n0 and len(d) == 1 and d.receptions.iloc[0] == 5 and bool(d.reg.iloc[0])
        del fails[n0:]
        avg_log(tmp, g, S + 1, after)
        ok_live = len(fails) == n0 + 1 and f'stats_player_week_{S + 1}.csv' in fails[-1]
        del fails[n0:]
    chk(ok_pre and ok_live, f'AVERAGES: the gate\'s own log in a new season\'s preseason: no failure before it is under way {ok_pre}, '
                            f'a failure once it is {ok_live}')


def avg_week_fixture():
    """averages() on a made-up week: who it covers, the pecking order, which club's tables it reads, a quiet game
    moving nothing, and a better defence moving the projection by exactly its coefficient"""
    A, S = build.ELO_AVG, 2030
    cols = build.MU_COLS + build.AVG_COLS
    log = []

    def games_of(pid, grp, team, opp, rows):
        for i, (season, vol, stat) in enumerate(rows):
            r = {'season': season, 'ord': i + 1, 'game_id': f'{season}_{i + 1:02d}_{team}_{opp}', 'pid': pid, 'group': grp, 'team': team,
                 'opp': opp, 'home': 1, 'R': 1500.0, 'vol': vol, **{c: 0.0 for c in cols}}
            r.update(stat)
            log.append(r)
    wr = lambda n, t: [{'targets': t, 'receptions': n, 'receiving_yards': 12.0 * n, 'receiving_tds': float(n > 5)}]
    games_of('q1', 'QB', 'AAA', 'CCC', [(S - 1 + (i > 2), 34, {'attempts': 30, 'completions': 20 + i, 'passing_yards': 230 + 9 * i,
                                                                  'passing_tds': i % 3, 'passing_interceptions': 1 + i % 2, 'carries': 4,
                                                                  'rushing_yards': 15}) for i in range(5)])
    games_of('q2', 'QB', 'BBB', 'CCC', [(S, 36, {'attempts': 32, 'completions': 22, 'passing_yards': 250, 'passing_tds': 2, 'carries': 3}) for _ in range(5)])
    games_of('r1', 'RB', 'AAA', 'CCC', [(S, 18, {'carries': 15, 'rushing_yards': 60 + 5 * i, 'rushing_tds': i % 2, 'targets': 3,
                                                 'receptions': 2, 'receiving_yards': 14}) for i in range(3)])
    games_of('w1', 'WR', 'AAA', 'CCC', [(S, 7, wr(4.0 + i % 3, 7)[0]) for i in range(6)] + [(S, 2, wr(1.0, 2)[0])])
    games_of('w2', 'WR', 'AAA', 'CCC', [(S, 9, wr(6.0, 9)[0]) for _ in range(6)])
    games_of('w3', 'WR', 'AAA', 'CCC', [(S, 6, wr(3.0, 6)[0]) for _ in range(2)] + [(S, 3, wr(1.0, 3)[0])])
    games_of('w4', 'WR', 'AAA', 'CCC', [(S, 5, wr(3.0, 5)[0]) for _ in range(6)])
    games_of('t1', 'TE', 'AAA', 'CCC', [(S, 5, {'targets': 5, 'receptions': 3.0, 'receiving_yards': 33.0}) for _ in range(4)])
    games_of('k1', 'K', 'AAA', 'CCC', [(S, 5, {'fg_att': 2, 'fg_made': 2, 'pat_att': 3, 'pat_made': 3}) for _ in range(4)])
    games_of('x9', 'WR', 'CCC', 'BBB', [(S, 7, wr(6.0, 7)[0]) for _ in range(4)])      # what BBB has allowed: a WR's TD a game
    parts_a = [('q1', 'QB'), ('r1', 'RB'), ('w1', 'WR'), ('w2', 'WR'), ('w3', 'WR'), ('w4', 'WR'), ('t1', 'TE'), ('k1', 'K'), ('d1', 'DL')]
    parts_b = [('q2', 'QB'), ('k9', 'K')]
    st_a = {'QB': 1500, 'RB': 1500, 'WR': 1500, 'TE': 1500, 'K': 1500, 'DL': 1531.0, 'LB': 1502.0, 'DB': 1488.0}
    st_b = dict(st_a, DL=1544.0, LB=1521.0, DB=1497.0)
    coming = [{'game_id': f'{S}_08_BBB_AAA', 'team': 'AAA', 'opp': 'BBB', 'home': 1, 'parts': parts_a, 'opp_strength': st_b, 'rating': {}},
              {'game_id': f'{S}_08_BBB_AAA', 'team': 'BBB', 'opp': 'AAA', 'home': 0, 'parts': parts_b, 'opp_strength': st_a, 'rating': {}}]

    def tables(shift=0.0):
        out = {}
        for n in build.unit_tables():
            vals = {'AAA': 0.2, 'BBB': -0.3 + (shift if n == 'pass_def' else 0.0), 'CCC': 0.05}
            m, s = float(np.mean(list(vals.values()))), float(np.std(list(vals.values())))
            out[n] = {t: {'raw': v, 'shown': 1500 + 100 * (v - m) / s, 'elo': round(1500 + 100 * (v - m) / s), 'rank': 1, 'rated': True}
                      for t, v in vals.items()}
        return out
    rating = {p: 1500.0 + 13 * i for i, p in enumerate(['q1', 'q2', 'r1', 'w1', 'w2', 'w3', 'w4', 't1', 'k1'])}
    srating = {p: v + 40 for p, v in rating.items()}
    defs = {'AAA': st_a, 'BBB': st_b}
    av, ref = build.averages(log, coming, S, tables(), rating, srating, defs)
    chk(sorted(av) == ['k1', 'q1', 'q2', 'r1', 't1', 'w1', 'w2'],
        f'AVERAGES: on a made-up week the build projects {sorted(av)}, not the starters with {A["min_games"]} regular games (q1, q2, r1, w1, w2, t1, k1)')
    if sorted(av) != ['k1', 'q1', 'q2', 'r1', 't1', 'w1', 'w2']:
        return
    chk(av['w2'].get('rank_on_targets') == 1 and av['w1'].get('rank_on_targets') == 2 and av['t1'].get('rank_on_targets') == 1,
        f'AVERAGES: the made-up receivers are not ranked on targets (w2 1, w1 2, t1 1): {[av[p].get("rank_on_targets") for p in ("w2", "w1", "t1")]}')
    T = tables()
    bad = []
    for pid, b in av.items():
        opp, team = ('BBB', 'AAA') if b['team'] == 'AAA' else ('AAA', 'BBB')
        if b['opp'] != opp or any(e['raw'] != T[t][opp]['raw'] for t, e in b['defs'].items()) or any(v != T[t][team]['raw'] for t, v in b['own'].items()):
            bad.append(f'{pid} reads {b["opp"]} {b["defs"]} {b["own"]}')
        if any(abs(b['D'][u] - (st_b if team == 'AAA' else st_a)[u]) > 1e-9 for u in ('DL', 'LB', 'DB')):
            bad.append(f'{pid}\'s opposing defenders {b["D"]}')
    # every leg of every player by hand: his regular games (w1's seventh, under the norm, left out), the prior by the
    # build's rule, the opponent's tables on the leg's scale, his own Elo as the leg asks, his club's offence, the
    # opposing defenders, home, his place on targets and what the opponent has allowed, on the gate's own arithmetic
    stat = lambda r, col: (r['rushing_yards'] + r['receiving_yards'] if col == 'scrim_yards' else r['rushing_tds'] + r['receiving_tds']
                           if col == 'any_td' else 3 * r['fg_made'] + r['pat_made'] if col == 'kick_pts' else r[col])
    regular = lambda r: r['vol'] > 0 if r['group'] == 'K' else r['vol'] >= A['regular'] * AVG_NORM[r['group']]
    tg = lambda p: ewm_last_own([r['targets'] for r in log if r['pid'] == p and r['group'] != 'K'], AVG_TGT_HL) if any(r['pid'] == p for r in log) else 0.0
    rmean = {sc: {n: float(np.mean([v['raw'] if sc == 'raw' else (v['shown'] - 1500) / 100 for v in T[n].values()])) for n in T} for sc in ('raw', 'shown')}
    dmean = {u: float(np.mean([(v[u] - 1500) / 100 for v in defs.values()])) for u in ('DL', 'LB', 'DB')}
    for pid, b in av.items():
        gp, opp, team = b['group'], b['opp'], b['team']
        mine = [r for r in log if r['pid'] == pid and r['group'] == gp and regular(r)]
        mates = [p for p, g in (parts_a if team == 'AAA' else parts_b) if g == gp]
        rk = {}
        if gp in AVG_RANKED:
            r_ = sum(1 for q in set(mates) if q != pid and tg(q) > tg(pid))
            rk = {'rk0': float(r_ == 0), 'rk1': float(r_ == 1 and AVG_RANKED[gp] > 1)}
        for key, leg in A['legs'].items():
            if key.split('|')[0] != gp:
                continue
            col = key.split('|')[1]
            pos_reg = [r for r in log if r['group'] == gp and regular(r)]
            prior = float(np.mean([stat(r, col) for r in pos_reg if r['season'] < S] or [stat(r, col) for r in pos_reg if r['season'] == S]))
            a = avg_mean_own([stat(r, col) for r in mine], [r['season'] for r in mine], *leg['avg'], S, prior)
            x = {'P': (((rating if leg['player'] == 'R' else srating)[pid]) - 1500) / 100} if leg['player'] else {}
            for t in leg['tables']:
                x['E:' + t] = T[t][opp]['raw'] if leg['scale'] == 'raw' else (T[t][opp]['shown'] - 1500) / 100
            if leg['player']:
                x['EP'] = x['E:' + leg['tables'][0]] * x['P']
            x.update({u: ((st_b if team == 'AAA' else st_a)[u] - 1500) / 100 for u in ('DL', 'LB', 'DB')}, home=float(team == 'AAA'), **rk)
            for t in leg['terms']:
                if t.startswith('own:'):
                    x[t] = T[t[4:]][team]['raw']
            if 'log_allowed' in leg['terms']:
                vs = {}
                for r in pos_reg:
                    if r['opp'] == opp:
                        vs.setdefault((r['season'], r['ord']), []).append(stat(r, col))
                al = ewm_last_own([float(np.mean(vs[k])) for k in sorted(vs)], AVG_ALLOWED_HL) / leg['allowed_mean'] if vs else 1.0
                x['log_allowed'] = math.log(max(al, 1e-3))
            o = avg_leg_own(leg, a, x, {**{'E:' + t: rmean[leg['scale']][t] for t in leg['tables']}, **dmean})
            got = b['stats'].get(col)
            if got is None:
                bad.append(f'{pid} has no {col}, a leg of his position')
                continue
            near = 1e-4 + 1e-6 * o['proj']
            if (abs(got['avg'] - a) > 1e-4 or any(abs(got[k] - o[k]) > near for k in ('proj', 'no_elo', 'elo'))
                    or abs(got['z'] - o['z']) > 1e-4 + near / o['sd'] or any(abs(got[k] - o[k]) > 1e-4 for k in ('def_x', 'elo_x'))):
                bad.append(f'{pid} {col}: {got} for avg {a:.4f}, proj {o["proj"]:.4f}, twin {o["no_elo"]:.4f}, z {o["z"]:.4f}')
    # BBB has allowed a receiver a touchdown a game and no quarterback anything: the allowances over the fit's mean
    qa = (av['q1']['stats'].get('passing_yards') or {}).get('allowed')
    if qa != 1.0:
        bad.append(f'q1 passing yards allowed {qa} where BBB has allowed no quarterback a game')
    want_a = round(1.0 / A['legs']['WR|any_td']['allowed_mean'], 6)
    wa = (av['w1']['stats'].get('any_td') or {}).get('allowed')
    if wa != want_a:
        bad.append(f'w1 anytime TD allowed {wa} where BBB has allowed a receiver a TD a game ({want_a})')
    chk(not bad, f'AVERAGES: on a made-up week: {bad[:3]}')
    # a game with nothing on the sheet (as the build never logs one, but were it there) moves nothing
    quiet = dict(log[0], pid='w1', group='WR', ord=99, game_id=f'{S}_99_AAA_CCC', vol=0.0, **{c: 0.0 for c in cols})
    av_q, _ = build.averages(log + [quiet], coming, S, tables(), rating, srating, defs)
    chk(av_q == av, 'AVERAGES: a game with nothing on the sheet moves a made-up week\'s averages')
    # a better pass defence (BBB's raw up half a standard deviation of its stats): every AAA leg facing it moves by its
    # coefficient on the defence and the interaction at his own Elo, and nothing else moves
    av_b, _ = build.averages(log, coming, S, tables(0.5), rating, srating, defs)
    Tb = tables(0.5)
    bad = []
    for pid in ('q1', 'w1', 'w2', 't1'):
        for col, st in av[pid]['stats'].items():
            leg = A['legs'][f'{av[pid]["group"]}|{col}']
            E = lambda TT: TT['pass_def']['BBB']['raw'] if leg['scale'] == 'raw' else (TT['pass_def']['BBB']['shown'] - 1500) / 100
            w = dict(zip(leg['terms'], leg['coef']))
            if 'E:pass_def' not in w:
                continue
            P = (((rating if leg['player'] == 'R' else srating)[pid]) - 1500) / 100 if leg['player'] else 0.0
            dE = E(Tb) - E(T)
            want = (w['E:pass_def'] + w.get('EP', 0.0) * P) * dE if leg['tables'][0] == 'pass_def' else w['E:pass_def'] * dE
            got = math.log(av_b[pid]['stats'][col]['proj'] / st['proj'])
            if abs(got - want) > 1.01e-4 / min(st['proj'], av_b[pid]['stats'][col]['proj']):     # each projection to four places
                bad.append(f'{pid} {col}: moved {got:.5f}, its coefficient says {want:.5f}')
    chk(not bad, f'AVERAGES: a better defence does not move the made-up week by its coefficient: {bad[:3]}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(HERE, 'data'))
    ap.add_argument('--cache', default=os.path.join(HERE, 'cache'))
    ap.add_argument('--history', default=os.path.join(HERE, 'history'))
    ap.add_argument('--prev', help='the previously published players.json (default: the last commit\'s)')
    ap.add_argument('--joker-state', default=build.JOKER_STATE, help='the betting state the Joker\'s calls are read from')
    a = ap.parse_args()

    unit_checks()
    unit_team_checks()
    power_fixture_checks()
    avg_fixture_checks()
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

    # ---- JOKER: the calls on the Joker's baseline (THE JOKER BASELINE) ----
    joker = build.joker_calls(a.joker_state)
    jpub = build.joker_published(a.joker_state)
    beta = build.JOKER_BASE['beta']
    jb = M.get('joker_base') or {}
    chk(all(jb.get(k) == v for k, v in build.JOKER_BASE.items()), 'JOKER: model.json does not carry the build\'s JOKER_BASE')
    sigm = lambda z: 1 / (1 + math.exp(-z))
    own = lambda pj, m: sigm(math.log(min(0.99, max(0.01, pj)) / (1 - min(0.99, max(0.01, pj)))) + beta * m)
    hf_of = {gid: 0.0 if loc == 'Neutral' else 1.0 for gid, loc in zip(games.game_id, games.location)}
    side = {gid: (h, w) for gid, h, w in zip(games.game_id, games.home_team, games.away_team)}
    home_w = float((M.get('coef') or {}).get('home', 0))
    bad = []
    for c in (M.get('next') or {}).get('games', []):
        gid = c['game_id']
        if c.get('frozen'):
            continue
        if not all(isinstance(c.get(k), (int, float)) for k in ('p_elo', 'm')) or gid not in side:
            bad.append(f'{gid} has no game model chance or matchup')
            continue
        if abs(sigm(home_w * hf_of[gid] + c['m']) - c['p_elo']) > 2e-4:
            bad.append(f'{gid}: p_elo {c["p_elo"]} is not the game model\'s matchup {c["m"]} with its home field')
        pj = joker.get(gid)
        if pj is None:
            if c.get('base') or c['p_home'] != c['p_elo']:
                bad.append(f'{gid}: the Joker has not called it, yet it is not the game model\'s own chance')
        elif c.get('base') != 'joker' or c.get('p_joker') != round(pj, 4):
            bad.append(f'{gid}: the Joker has it at {pj}, but the call stands on {c.get("base")} {c.get("p_joker")}')
        elif abs(own(pj, c['m']) - c['p_home']) > 2e-4:
            bad.append(f'{gid}: {c["p_home"]} is not the Joker\'s {pj} moved by the matchup {c["m"]} ({own(pj, c["m"]):.4f})')
        if c['pick'] != side[gid][0 if c['p_home'] >= 0.5 else 1]:
            bad.append(f'{gid}: picks {c["pick"]} on a home chance of {c["p_home"]}')
    for gid, e in ((L or {}).get('calls') or {}).items():
        if e.get('base') == 'joker' and (not all(isinstance(e.get(k), (int, float)) for k in ('p_joker', 'p_elo', 'm'))
                                         or abs(own(e['p_joker'], e['m']) - e['p_home']) > 2e-4):
            bad.append(f'the ledger\'s {gid} is on the Joker but is not the rule\'s on its own numbers: {e}')
    kick_j = dict(zip(games.game_id, games.kick))
    # the re-picks: only a game that kicked off before the first build on the Joker, on the Joker's call as frozen
    # at kickoff, a backtest, its first call in `was`; every such game of the season the Joker called is re-picked
    for gid, e in ((L or {}).get('calls') or {}).items():
        if not e.get('was'):
            continue
        if not (e.get('base') == 'joker' and e.get('src') == 'backtest' and gid in kick_j and kick_j[gid] < build.JOKER_FROM):
            bad.append(f'{gid} is re-picked but is not a backtest on the Joker of a game played before {build.JOKER_FROM:%d %b %H:%M} UTC')
        elif gid in joker and e.get('p_joker') != round(joker[gid], 4):
            bad.append(f'{gid} is re-picked on the Joker at {e.get("p_joker")}, but the Joker\'s call is {joker[gid]}')
        elif not all(k in e['was'] for k in ('pick', 'at', 'src')):
            bad.append(f'{gid} is re-picked with no first call kept: {e["was"]}')
        fx = e.get('joker_fix')
        if fx is not None:
            # done again on the Joker's call as published before kickoff (betting/joker/history/, build.refix): the
            # state marks that call published, and the re-pick it replaced was the rule's on another Joker chance
            if not (isinstance(fx, dict) and all(isinstance(fx.get(k), (int, float)) for k in ('p_home', 'p_joker'))
                    and isinstance(fx.get('pick'), str) and isinstance(fx.get('at'), str)):
                bad.append(f'{gid}\'s re-pick done again keeps no whole re-pick it replaced: {fx}')
            elif gid in joker and gid not in jpub:
                # held only while the state still has the game (a new season's state carries none of last season's calls,
                # and the ledger keeps last season's entries a season more), as the rule above holds p_joker
                bad.append(f'{gid}\'s re-pick was done again, but the Joker\'s call it stands on is not one restored as published')
            elif fx['p_joker'] == e.get('p_joker') or abs(own(fx['p_joker'], e['m']) - fx['p_home']) > 2e-4:
                bad.append(f'{gid}\'s re-pick done again replaced {fx}, which is not the rule\'s on another Joker chance')
    for gid, e in ((L or {}).get('calls') or {}).items():
        if e.get('joker_fix') is not None and not e.get('was'):
            bad.append(f'{gid} carries a re-pick done again but was never re-picked')
    for c in (M.get('graded') or []):
        gid = c['game_id']
        e = ((L or {}).get('calls') or {}).get(gid) or {}
        if gid in joker and gid in kick_j and kick_j[gid] < build.JOKER_FROM and int(gid[:4]) == season and e.get('base') != 'joker':
            bad.append(f'{gid}, played before the first build on the Joker, is not re-picked on it')
        if (c.get('was') or {}).get('pick') != (e.get('was') or {}).get('pick'):
            bad.append(f'{gid} is graded with a first call of {c.get("was")} where the ledger has {e.get("was")}')
    chk(not bad, f'JOKER: {"; ".join(bad[:4])}{" ..." if len(bad) > 4 else ""}')
    rg = [c for c in (M.get('graded') or []) if c.get('was') and c['correct'] is not None]
    want_rp = [sum(1 for c in rg if c['correct']), sum(1 for c in rg if not c['correct'])]
    want_rw = [sum(1 for c in rg if c['was']['correct']), sum(1 for c in rg if not c['was']['correct'])]
    rec = M.get('record') or {}
    chk(rec.get('repicked') == want_rp and rec.get('repicked_was') == want_rw,
        f'JOKER: the record counts {rec.get("repicked")} re-picked ({rec.get("repicked_was")} as first picked), the graded calls {want_rp} ({want_rw})')
    ledger_calls = (L or {}).get('calls') or {}
    chk(all(c.get('base') == (ledger_calls.get(c['game_id']) or {}).get('base') for c in (M.get('graded') or [])),
        'JOKER: a graded call does not carry the ledger\'s base')
    jg = [c for c in (M.get('graded') or []) if c.get('src') == 'published' and c.get('base') == 'joker' and c['correct'] is not None]
    want = [sum(1 for c in jg if c['correct']), sum(1 for c in jg if not c['correct'])]
    chk((M.get('record') or {}).get('joker_base') == want, f'JOKER: the record counts {(M.get("record") or {}).get("joker_base")} on the Joker, the graded calls {want}')

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

    # ---- AVERAGES: the Elo-adjusted averages on the gate's own reading ----
    if MU:
        avg_checks(MU, P, M, games, a.cache, built)

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
        # a game re-picked on the Joker's baseline keeps the call first made in `was`: that is the one held
        # to the history here, and the record grades the re-pick (JOKER)
        first = (cur or {}).get('was') or cur
        want = first if in_time(gid, first) and at(first) > at(e) else e
        if cur and cur.get('was'):
            if first['pick'] != want['pick'] or first.get('src') != want['src']:
                wrong.append(gid)
                continue
            want = cur
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
            if cur is not None and cur.get('was') and not e.get('was'):
                # re-picked on the Joker this run: the call the last publish had is the one kept in `was`
                if any(cur['was'].get(k) != e.get(k) for k in ('pick', 'p_home', 'at', 'src')):
                    moved_calls.append(gid)
                continue
            if cur is not None and cur.get('was') and e.get('was') and cur.get('joker_fix') and not e.get('joker_fix'):
                # a re-pick done again this run on the Joker's call as published before kickoff (build.refix): the re-pick
                # the last publish had is the one kept in joker_fix, its matchup, game model chance, time, source and
                # first call unchanged, and the Joker's chance the state's restored one
                fx = cur['joker_fix']
                if (cur.get('was') != e.get('was') or any(cur.get(k) != e.get(k) for k in ('src', 'base', 'at', 'm', 'p_elo'))
                        or any(fx.get(k) != e.get(k) for k in ('pick', 'p_home', 'p_joker'))
                        or gid not in jpub or cur.get('p_joker') != round(jpub[gid], 4)):
                    moved_calls.append(gid)
                continue
            if (cur is None or cur['pick'] != e['pick'] or cur.get('src') != e.get('src') or cur.get('was') != e.get('was')
                    or cur.get('joker_fix') != e.get('joker_fix')):
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
