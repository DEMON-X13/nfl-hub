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
             last publish had for a game this build could no longer call is kept as it was (its
             pick, src, first call, re-pick done again, chance and the BETA it stands on: a frozen
             call made again on a BETA refitted since fails, whether or not its pick turns); a
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
             the build's JOKER_BASE. BETA is the gate's own copy (0.1973 since THE DRAFT START refitted it
             in November 2026): a coming call stands on it and carries it (`beta`), and every ledger call
             on the Joker is the rule's on the BETA it carries, its own `beta`, or 0.2058 (the build's
             JOKER_BETA_WAS, the gate's own copy too) for one made before a call carried its own (19
             October to November 2026), and on no other (at today's, 108 of the ledger's 136 calls on the
             Joker fail the rule). That a frozen call was not made again on today's BETA, its chance and
             `beta` moved together, is RECORD's: it holds both to the last publish. On fixtures (the build's on_joker and make_call): a matchup of
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
             DEN's re-pick round on the Joker's published 50.93% and keeps the rest (on 0.2058, the BETA
             it was made at; one carrying 0.1973 on that), and joker_published reads only the calls marked
             published.
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
             better defence moves the projection by exactly its coefficient. THE MISMATCH SCORE (November 2026):
             `mm` on exactly the lead blocks (the gate's own copy of the lead legs, a back's rushing yards and a
             receiver's or tight end's receiving yards, each where ELO_AVG trusts it; none on a quarterback or a
             kicker), {stat, shift, tag}, the stat the lead leg, the shift Phi(z) - 0.5 of the gate's own z for
             it to four places, the tag the shift at ELO_AVG's tag or over (false wherever the tag is null);
             avg_fit.mismatch ELO_AVG's; ELO_AVG's lead legs the gate's, its record every season from 2018 to the
             last fitted, a non-null tag the threshold chosen with its gap above 0 in each of them and a null tag
             only where one is not; on the made-up week the same with the tag at the largest shift, null, and a
             lead leg untrusted, and the gate's own rules refusing made-up blocks that break each. (A projection
             read off the wrong club's table, a regular's norm turned round, an average that counted a quiet game,
             a twin with the Elo terms in, a leg left out, a shift off its z, a tag on a null threshold or a
             quarterback's Mismatch would publish green.) THE INPUTS (4 November 2026): every projected player
             carries `in`, exactly snap1, snapL, the six shares (sh_tgtL/S, sh_carL/S, sh_ayL/S), implied, spread,
             wind and wind_src, each number to four places the gate's own reading: nflverse's player stats of every
             position, PFR's snap counts from 2013 (a finished season's required) and players.csv's PFR ids, read
             here, never through the build; his appearances before the game (a stat row, or an offensive snap placed
             by its PFR id), his last snap share and its half-life-6 average across seasons and clubs, his share of
             his club's targets, carries and air yards each appearance (his over every row of his club's, the moved
             clubs in today's code; a snap with no stat row 0; air yards clipped at 0 over the club's unclipped sum,
             only where that is above 20) at half-lives 6 and 1.5, every missing value skipped; his side's implied
             points and spread from games.csv (the away side's spread the line's negative); the wind held to the
             forecast recorded, one per game (calm and 'roof' under any roof, the gate's own list of stadiums or
             games.csv's roof; past 6.5 days from the build calm, 'beyond the forecast'; within, a number of 0 to 150
             mph from the National Weather Service in the US or Open-Meteo abroad, or calm with the reason a forecast
             was not had); the Questionable tag his club's filed status for that week (a practice report with no
             status yet, or last week's, none). From those, on the gate's own copy of the rule (IN_RULE_OWN) and the
             share centres (SHARE_CENTER_OWN), every input term each leg reads (its own copy of the groups per leg,
             IN_GROUPS_OWN), so the projection, its twin, the Elo part and its split above stand on them; and each
             input leg's in_x {vol, game, q} (exp of its terms' coefficients times their distance from in_mean, the
             tag against 0) to four places, none on another leg. Its constants against its own copies: the build's
             rule and first snap season, its stadiums under a roof and abroad, ELO_AVG's share centres and each leg's
             input terms in its projection and its twin alike, groups, in_mean and trust (TRUSTED_OWN: a QB's
             interceptions, a back's rushing yards, carries and rush + rec yards, a tight end's touchdowns), and
             elo/tools/elo_avg_fit.py's SPEC the same, with made-up ELO_AVGs and SPECs breaking each refused. On a
             made-up world (the build's avg_coming_inputs, its forecasts on a stubbed netfetch) the gate's own reading
             of every branch: a stat row with no snap row, a snap with no stat row, a snap row players.csv does not
             place, a club's week of 20 air yards or fewer, negative air yards, a row with no player id, a season and
             club before, an away side's spread, a game with no lines, a roof, a forecast in the US, one abroad, one
             failed and one past 6.5 days, a Questionable filed and one only last week; the gate's wind rule judging
             made-up records of each branch, and the fit's played games' wind its rule. (A share's half-life wrong, an
             away spread's sign turned, the wind read under a roof, a Questionable counted before the statuses are
             filed, a share centre edited, an input group added, a trust flag flipped or an in_x off its product would
             publish green.)
  DRAFT      every player of the players map carries his first career rating (`start`) and his draft
             slot (`draft`, THE DRAFT START, November 2026), each the gate's own working: draft_picks.csv
             read here (an id in two drafts at the later, a row with no id none), his first rated game
             read here from nflverse's player stats (his earliest row with some involvement, by the
             gate's own copy of each group's positions and involvement, in a game with a final, the
             playoffs after week 18: its season and group), and its own arithmetic on DRAFT_START's
             numbers (1500 + a + b ln of the pick held between the group's floor and 262, 262 for one
             never drafted or drafted after that season, a kicker's level, 2012 at 1500), every number
             its own copy, DRAFT_START_OWN, which the build's DRAFT_START must equal (a deliberate refit
             edits both). A draft row whose gsis_id is no gsis id (none, or a placeholder: Peter Woods,
             2026's pick 29, WOO547869) is placed through its pfr_player_id on the roster file. On
             fixtures, the build's first_rating is the gate's on every branch (a top pick, a later one,
             drafted after his first season, never drafted, a pick past 262, a kicker, the warm-up and
             its expected quarterback at QB_START) and draft_slots reads a file as the gate does, a
             placeholder and a missing id placed through the roster. (A start read off another player's
             slot, a curve with its floor or its end dropped or one constant mis-edited, a rookie of the
             season started before his draft, a first-round pick rated as one never drafted for want of
             his id, or a players map that left the fields out, would publish green.)
  LINEUPS    the game model's lineups: on fixtures, the build's lineup_rating and lineup_strength are
             the gate's (an expected starter with no rating yet at his draft start for the game's
             season, a 2012 quarterback at 1450, a rated one at his rating; each group best first,
             padded with the replacement level to its depth, weighted by it: the gate's own copies of
             DEPTH, REPLACEMENT and QB_START). On the files, each coming call's matchup `m` is worked
             out again from matchups.json's expected lineups and model.json's weights: a starter
             covered by the averages at the R they carry, another at his Elo in players.json or the
             matchup formula's players (within half a point), one with no rated game in the player
             stats at his draft start; the defences at the strengths the averages carry for the side
             facing them, those and league.defs held to the gate's reading of the lineup. A call with
             a starter rated but in neither map is skipped and counted. (A lineup that filled an
             unrated starter at 1500 or 1450, a group not padded or weighted by its depth, or a call
             whose matchup is not its lineups', would publish green.)
  UNITS      the build's own functions on fixtures: two equal teams at a neutral site are 50/50;
             a fullback listed first does not take the second running back's place; a club on its
             bye keeps its roster; a player out last week and not practising stays out.
"""
import argparse, contextlib, datetime, functools, io, json, math, os, re, subprocess, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'tools'))
import build  # noqa: E402
import elo_avg_fit  # noqa: E402  (its SPEC alone: which inputs each leg reads and which Elo parts are trusted)

fails, notes = [], []
checks = 0
# THE JOKER BASELINE's BETA, the gate's own copies (a deliberate refit edits both and says why in the build's docstring):
# the one every call is made at now (JOKER_BASE, refitted on THE DRAFT START in November 2026) and the one every call on
# the Joker was made at before a call carried its own `beta` (19 October to November 2026, the build's JOKER_BETA_WAS)
JOKER_BETA_OWN, JOKER_BETA_WAS_OWN = 0.1973, 0.2058


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
        and on['p_home'] == round(1 / (1 + math.exp(-(math.log(0.4 / 0.6) + JOKER_BETA_OWN * mj))), 4),
        f'JOKER: a call on the Joker\'s 40% is not the rule\'s on BETA {JOKER_BETA_OWN}: {on}')
    chk(on.get('beta') == JOKER_BETA_OWN and 'beta' not in alone,
        f'JOKER: a call on the Joker does not carry the BETA it stands on ({on.get("beta")}), or one on no base does ({alone.get("beta")})')
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
    # those two re-picks were made before a call carried its BETA, so they are done again on the one they were made at
    # (JOKER_BETA_WAS, above: 0.4992 and 0.4242 on 0.2058); a re-pick that carries its own is done again on that one
    chk('beta' not in fx and 'beta' not in fx2, f'JOKER: a re-pick done again took a BETA it was not made at: {fx.get("beta")}')
    fx3 = build.refix({**rp, 'beta': JOKER_BETA_OWN}, 0.5093, 'DEN', 'LA', 'x')
    chk(fx3.get('beta') == JOKER_BETA_OWN and fx3['p_home'] == round(1 / (1 + math.exp(-(math.log(0.5093 / 0.4907) - JOKER_BETA_OWN * 0.1972))), 4),
        f'JOKER: a re-pick made on BETA {JOKER_BETA_OWN} is not done again on it: {fx3}')
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


# ---- DRAFT: each player's first career rating (THE DRAFT START) on the gate's own reading ----
# the gate's own copies (a deliberate change edits both and says why in the build's docstring): the positions that
# make each rated group (the build's GROUP), what a game's involvement is for each (a row with none is no game the
# build rates, so it never starts a rating), the playoff rounds' places after week 18, and the warm-up season, whose
# new players all start at 1500
DRAFT_POS = {'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'WR': 'WR', 'TE': 'TE', 'K': 'K',
             'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'DL': 'DL', 'LB': 'LB', 'OLB': 'LB', 'ILB': 'LB', 'MLB': 'LB',
             'CB': 'DB', 'DB': 'DB', 'S': 'DB', 'SAF': 'DB', 'FS': 'DB', 'SS': 'DB'}
DRAFT_VOL = {'QB': ('attempts', 'carries', 'sacks_suffered'), 'RB': ('carries', 'targets'), 'WR': ('targets', 'carries'),
             'TE': ('targets', 'carries'), 'K': ('fg_att', 'pat_att'),
             **{g: ('def_tackles_solo', 'def_tackle_assists', 'def_pass_defended', 'def_sacks', 'def_qb_hits') for g in ('DL', 'LB', 'DB')}}
DRAFT_WARMUP = 2012
# THE DRAFT START's numbers, the gate's own copy of the build's DRAFT_START (draft_start_fit.py's fit on players first
# rated 2013-2017): a deliberate refit edits both and says why in the build's docstring, so a constant mis-edited in the
# build alone fails here rather than moving every first rating and every career Elo built on it
DRAFT_START_OWN = {
    'fit': '2013-2017', 'horizon': 2, 'p_end': 262,
    'curve': {'QB': [25.695, -20.456, 8], 'RB': [314.135, -74.164, 4], 'WR': [115.453, -39.982, 8],
              'TE': [253.975, -64.973, 32], 'DL': [113.897, -39.063, 4], 'LB': [283.935, -72.924, 32],
              'DB': [163.022, -43.111, 32]},
    'level': {'K': -17.753},
}
# the game model's lineups, the gate's own copies of the build's: each group's slots and their weights (DEPTH), the
# rating a slot no player fills takes (REPLACEMENT), and an expected quarterback with no rating yet in the warm-up
LINEUP_DEPTH_OWN = {'QB': [1.0], 'RB': [1.0, 0.5], 'WR': [1.0, 0.7, 0.45], 'TE': [1.0], 'K': [1.0],
                    'DL': [1.0, 0.8, 0.6, 0.4], 'LB': [1.0, 0.7, 0.4], 'DB': [1.0, 0.8, 0.6, 0.5, 0.4]}
LINEUP_REPLACEMENT_OWN, LINEUP_QB_WARMUP_OWN = 1450.0, 1450.0
GSIS_OWN = re.compile(r'00-00\d{5}')


def draft_read_own(path, roster_path=None):
    """draft_picks.csv as the gate reads it: {gsis id: (draft season, overall pick)}, an id listed in two drafts at
    the later of them; a row whose gsis_id is no gsis id (none, or a placeholder such as WOO547869) placed through its
    pfr_player_id on the roster file (its pfr_id and gsis_id), else kept as it is"""
    d = pd.read_csv(path, usecols=['season', 'pick', 'gsis_id', 'pfr_player_id'], low_memory=False)
    pfr = {}
    if roster_path and os.path.exists(roster_path):
        r = pd.read_csv(roster_path, usecols=['pfr_id', 'gsis_id'], low_memory=False)
        r = r[r.pfr_id.map(lambda v: isinstance(v, str)) & r.gsis_id.map(lambda v: isinstance(v, str) and bool(GSIS_OWN.fullmatch(v)))]
        pfr = dict(zip(r.pfr_id, r.gsis_id))
    gsis = d.gsis_id.map(lambda v: isinstance(v, str) and bool(GSIS_OWN.fullmatch(v)))
    placed = (~gsis) & d.pfr_player_id.isin(list(pfr))
    d.loc[placed, 'gsis_id'] = d.loc[placed, 'pfr_player_id'].map(pfr)
    d = d[d.gsis_id.map(lambda v: isinstance(v, str)) & d.season.notna() & d.pick.notna()]
    d = d.sort_values('season', kind='mergesort').drop_duplicates('gsis_id', keep='last')
    return {g: (int(y), int(p)) for g, y, p in zip(d.gsis_id, d.season, d.pick)}


def draft_r0_own(spec, group, season, slot, lineup=False):
    """the gate's own arithmetic of a first career rating on DRAFT_START's numbers: 1500 + a + b ln(the pick held
    between the group's floor and the curve's end), the end for a player never drafted or drafted after `season`;
    a level group one number; the warm-up 1500 (lineup: an expected starter with no rating yet, a quarterback 1450)"""
    if season <= DRAFT_WARMUP:
        return LINEUP_QB_WARMUP_OWN if lineup and group == 'QB' else 1500.0
    if group in spec['level']:
        return 1500.0 + spec['level'][group]
    a, b, floor = spec['curve'][group]
    end = spec['p_end']
    pick = end if slot is None or slot[0] > season else min(end, max(floor, slot[1]))
    return 1500.0 + a + b * math.log(pick)


def draft_first_own(cache, games, upto):
    """every player's first rated game on the gate's own reading of nflverse's player stats: (season, group) of his
    earliest row with some involvement in a game games.csv has a final for, in the order the season is played (the
    playoffs after week 18); a row on a position no group rates is none of his"""
    fin = games[games.home_score.notna() & (games.season >= DRAFT_WARMUP)]
    at = {gid: (int(s), avg_ord(t, w)) for gid, s, w, t in zip(fin.game_id, fin.season, fin.week, fin.game_type)}
    cols = sorted({c for v in DRAFT_VOL.values() for c in v})
    parts = []
    for y in range(DRAFT_WARMUP, upto + 1):
        path = os.path.join(cache, f'stats_player_week_{y}.csv')
        if not os.path.exists(path):
            continue                       # AVERAGES says it, and the season to come before it is under way has none
        have = set(pd.read_csv(path, nrows=0).columns)
        d = pd.read_csv(path, usecols=[c for c in ['player_id', 'position', 'game_id'] + cols if c in have], low_memory=False)
        d['group'] = d.position.map(DRAFT_POS)
        d = d[d.group.notna() & d.game_id.isin(at)].copy()
        vol = np.zeros(len(d))
        for g, cs in DRAFT_VOL.items():
            m = (d.group == g).values
            vol[m] = sum(pd.to_numeric(d[c], errors='coerce').fillna(0.0).values[m] if c in d else 0.0 for c in cs)
        d = d[vol > 0]
        parts.append(d[['player_id', 'game_id', 'group']])
    d = pd.concat(parts, ignore_index=True)
    d['season'] = [at[g][0] for g in d.game_id]
    d['ord'] = [at[g][1] for g in d.game_id]
    d = d.sort_values(['season', 'ord'], kind='mergesort').drop_duplicates('player_id', keep='first')
    return {p: (int(s), g) for p, s, g in zip(d.player_id, d.season, d.group)}


def draft_checks(P, games, cache, season, roster_path=None):
    """DRAFT: every player of the players map carries his first career rating and his draft slot, each the gate's own
    working of DRAFT_START_OWN on its own reading of draft_picks.csv (and the roster, for a row with no gsis id) and of
    his first rated game. Returns (slots, first rated games) for LINEUPS, or (None, None) with no draft file."""
    spec = DRAFT_START_OWN
    chk(build.DRAFT_START == DRAFT_START_OWN,
        f'DRAFT: the build\'s DRAFT_START is not the gate\'s own copy (a refit edits both): {build.DRAFT_START} against {DRAFT_START_OWN}')
    groups = set(spec['curve']) | set(spec['level'])
    chk(spec.get('p_end') == 262 and set(spec['curve']).isdisjoint(spec['level']) and groups == set(build.GROUPS)
        and all(len(c) == 3 and c[2] in (1, 4, 8, 16, 32) for c in spec['curve'].values()),
        f'DRAFT: DRAFT_START is not a curve or a level for every group with the curve\'s end at pick 262: {spec}')
    path = os.path.join(cache, 'draft_picks.csv')
    if not os.path.exists(path):
        chk(False, 'DRAFT: draft_picks.csv is not in the cache, so no first rating can be held against it')
        return None, None
    slots = draft_read_own(path, roster_path)
    first = draft_first_own(cache, games, season)
    bad, nodraft, nofirst = [], [], []
    for pid, v in P['players'].items():
        want = slots.get(pid)
        if v.get('draft') != (list(want) if want else None):
            nodraft.append(f'{v.get("name")} ({pid}) {v.get("draft")} where the file has {want}')
        f = first.get(pid)
        if f is None:
            nofirst.append(pid)
            continue
        r0 = draft_r0_own(spec, f[1], f[0], want)
        if not isinstance(v.get('start'), (int, float)) or abs(v['start'] - r0) > 0.051:
            bad.append(f'{v.get("name")} ({pid}, {f[1]} first rated {f[0]}, drafted {want}) starts at {v.get("start")}, the rule {r0:.1f}')
    n = len(P['players'])
    chk(not nodraft, f'DRAFT: {len(nodraft)} of {n} players carry another draft slot than draft_picks.csv: {"; ".join(nodraft[:3])}')
    chk(not nofirst, f'DRAFT: {len(nofirst)} of {n} players have no rated game in the player stats: {nofirst[:5]}')
    chk(not bad, f'DRAFT: {len(bad)} of {n} players\' first ratings are not the draft start\'s: {"; ".join(bad[:3])}')
    by = {}
    for pid, v in P['players'].items():
        f = first.get(pid)
        if f and f[0] > DRAFT_WARMUP and isinstance(v.get('start'), (int, float)):
            by.setdefault(f[1], []).append(v['start'])
    notes.append('the draft start: ' + ', '.join(f'{g} {len(by[g])} from {min(by[g]):.0f} to {max(by[g]):.0f}' for g in build.GROUPS if by.get(g)))
    return slots, first


def draft_fixture_checks():
    """THE DRAFT START on fixtures: the build's first_rating, lineup_rating, lineup_strength and draft_slots against the
    gate's own working"""
    spec = DRAFT_START_OWN
    slots = {'b1': (2020, 1), 'b40': (2020, 40), 'late': (2021, 12), 'qb9': (2019, 9), 'old': (1985, 336), 'k': (2018, 70)}
    cases = [('b1', 'RB', 2020), ('b40', 'RB', 2020), ('late', 'WR', 2020), ('none', 'DB', 2022), ('qb9', 'QB', 2019),
             ('old', 'LB', 2013), ('k', 'K', 2018), ('b1', 'RB', 2012), ('qb9', 'QB', 2012), ('b40', 'TE', 2020)]
    for pid, g, y in cases:
        got, want = build.first_rating(pid, g, y, slots), draft_r0_own(spec, g, y, slots.get(pid))
        chk(abs(got - want) < 1e-9, f'DRAFT: first_rating({pid}, {g}, {y}) is {got:.3f}, the gate\'s {want:.3f}')
    chk(abs(build.first_rating('late', 'WR', 2020, slots) - build.first_rating('none', 'WR', 2020, slots)) < 1e-9,
        'DRAFT: a player drafted after the season of his first game does not start as one never drafted')
    chk(build.first_rating('b1', 'RB', 2020, slots) > build.first_rating('b40', 'RB', 2020, slots) > build.first_rating('none', 'RB', 2020, slots),
        'DRAFT: a back\'s first rating does not fall with his pick')
    chk(build.first_rating('qb9', 'QB', 2012, slots, lineup=True) == build.QB_START and build.first_rating('qb9', 'QB', 2012, slots) == 1500.0,
        'DRAFT: the warm-up does not keep the old starts (1500; an expected quarterback QB_START)')
    # the game model's lineups (build.lineup_rating, lineup_strength): an expected starter with no rating yet takes his
    # draft start for a game of that season (a back drafted 3rd in 2030 his floor's 1711.3, a 2012 quarterback 1450, a
    # kicker the level, a receiver drafted the year after the game none), a rated one his rating; a group best first,
    # padded with the replacement level to its depth
    R = {'vet': 1600.0, 'qbv': 1520.0}
    lslots = {'rk3': (2030, 3), 'wr27': (2031, 5), 'db40': (2030, 40)}
    for pid, g, y in (('rk3', 'RB', 2030), ('qb0', 'QB', 2012), ('k0', 'K', 2030), ('wr27', 'WR', 2030), ('rk3', 'RB', 2012),
                      ('db40', 'DB', 2030), ('qb0', 'QB', 2030), ('vet', 'RB', 2030), ('vet', 'QB', 2012)):
        got = build.lineup_rating(pid, g, y, R, lslots)
        want = R[pid] if pid in R else draft_r0_own(spec, g, y, lslots.get(pid), lineup=True)
        chk(abs(got - want) < 1e-9, f'LINEUPS: lineup_rating({pid}, {g}, {y}) is {got:.3f}, the gate\'s {want:.3f}')
    chk(abs(build.lineup_rating('rk3', 'RB', 2030, {}, lslots) - (1500 + 314.135 - 74.164 * math.log(4))) < 1e-9
        and build.lineup_rating('qb0', 'QB', 2012, {}, {}) == LINEUP_QB_WARMUP_OWN,
        'LINEUPS: an expected starter with no rating yet does not take his draft start (a 2030 back drafted 3rd 1711.3, '
        'a 2012 quarterback 1450)')
    lu = [('qb0', 'QB'), ('vet', 'RB'), ('rk3', 'RB'), ('wr27', 'WR'), ('k0', 'K'), ('db40', 'DB'), ('vet2', 'DB'), ('dl0', 'DL')]
    for y in (2012, 2030):
        got = build.lineup_strength(lu, y, R, lslots)
        want = {}
        for g, wts in LINEUP_DEPTH_OWN.items():
            rs = sorted((R[p] if p in R else draft_r0_own(spec, gg, y, lslots.get(p), lineup=True) for p, gg in lu if gg == g), reverse=True)
            rs = (rs + [LINEUP_REPLACEMENT_OWN] * len(wts))[:len(wts)]
            want[g] = sum(r * w for r, w in zip(rs, wts)) / sum(wts)
        chk(set(got) == set(want) and all(abs(got[g] - want[g]) < 1e-9 for g in want),
            f'LINEUPS: lineup_strength in {y} is {got}, the gate\'s {want}')
    chk(build.DEPTH == LINEUP_DEPTH_OWN and build.REPLACEMENT == LINEUP_REPLACEMENT_OWN and build.QB_START == LINEUP_QB_WARMUP_OWN,
        'LINEUPS: the build\'s DEPTH, REPLACEMENT or QB_START is not the gate\'s own copy')
    import tempfile
    tmp = tempfile.mkdtemp()
    try:
        with open(os.path.join(tmp, 'draft_picks.csv'), 'w') as f:
            f.write('season,round,pick,team,gsis_id,pfr_player_id,pfr_player_name,w_av\n1986,1,1,TB,JAC1,JackBo00,Bo,1\n'
                    '1987,7,183,LV,JAC1,JackBo00,Bo,2\n2020,1,5,MIA,00-1,AaaaAa00,A,3\n2020,1,6,LAC,,,B,4\n2030,1,1,X,00-9,CcccCc00,C,0\n'
                    # Peter Woods's case (2026's pick 29, a placeholder for his id) and Tyre West's (no id at all): each
                    # placed through his pfr id on the roster; a placeholder the roster cannot place kept as it is
                    '2030,1,29,KC,WOO547869,WoodPe00,Peter Woods,0\n2030,7,222,DET,,WestTy00,Tyre West,0\n'
                    '2030,7,250,NE,ZZZ000001,NobodY00,Nobody,0\n')
        with open(os.path.join(tmp, 'roster.csv'), 'w') as f:
            f.write('season,team,full_name,gsis_id,pfr_id\n2030,KC,Peter Woods,00-0041545,WoodPe00\n2030,DET,Tyre West,00-0041448,WestTy00\n'
                    '2030,NE,No Id,,NobodY00\n')
        g = pd.DataFrame({'season': [2030], 'gameday': ['2030-09-08'], 'gametime': ['13:00']})
        keep = build.CACHE
        build.CACHE = tmp
        try:
            got = build.draft_slots(True, g, datetime.datetime(2030, 9, 1, tzinfo=datetime.timezone.utc),
                                    pd.read_csv(os.path.join(tmp, 'roster.csv')))
            bare = build.draft_slots(True, g, datetime.datetime(2030, 9, 1, tzinfo=datetime.timezone.utc))
        finally:
            build.CACHE = keep
        want = draft_read_own(os.path.join(tmp, 'draft_picks.csv'), os.path.join(tmp, 'roster.csv'))
        chk(got == want == {'JAC1': (1987, 183), '00-1': (2020, 5), '00-9': (2030, 1), '00-0041545': (2030, 29),
                            '00-0041448': (2030, 222), 'ZZZ000001': (2030, 250)},
            f'DRAFT: draft_slots read {got}, the gate {want}: an id in two drafts at the later, a row with no id none, '
            f'a placeholder or a missing id placed through the roster\'s pfr id')
        chk(bare == draft_read_own(os.path.join(tmp, 'draft_picks.csv')) and '00-0041545' not in bare and 'WOO547869' in bare,
            f'DRAFT: draft_slots with no roster read {bare}')
    finally:
        import shutil
        shutil.rmtree(tmp)


def lineup_checks(M, MU, P, games, slots, first):
    """LINEUPS: each coming call's matchup (`m`) worked out again from the expected lineups matchups.json publishes, on
    the gate's own reading of every starter's career rating: an expected starter covered by the averages at the R they
    carry, another at his Elo in players.json or the matchup formula's players (whole points, so within half a point),
    one with no rated game in nflverse's player stats (draft_first_own) at his draft start for the call's season
    (draft_r0_own on DRAFT_START_OWN, lineup); each group best first, padded with the replacement level to the gate's
    own depth and weighted by it, the defences at the strengths the averages carry for the side facing them; and those
    strengths, and league.defs', against the gate's own reading wherever every defender of the group is read. A call
    with a starter the files give no rating for (rated, but in neither map) is skipped and counted."""
    if not MU or not MU.get('lineups') or slots is None or first is None:
        return
    avg, pl, mp = MU.get('avg') or {}, P.get('players') or {}, MU.get('players') or {}
    coef = M.get('coef') or {}
    side = {gid: (h, w) for gid, h, w in zip(games.game_id, games.home_team, games.away_team)}
    seen = {'avg': 0, 'elo': 0, 'draft': 0}

    def rating(pid, g, season):
        a = avg.get(pid)
        if a and isinstance(a.get('R'), (int, float)):
            seen['avg'] += 1
            return float(a['R']), 1e-6
        for src in (pl, mp):
            v = src.get(pid)
            if v and isinstance(v.get('elo'), (int, float)):
                seen['elo'] += 1
                return float(v['elo']), 0.5
        if pid not in first:                 # no rated game anywhere in the player stats: no career rating yet
            seen['draft'] += 1
            return draft_r0_own(DRAFT_START_OWN, g, season, slots.get(pid), lineup=True), 0.0
        return None, None

    def own_strength(t, gid, season):
        lu = (MU['lineups'] or {}).get(t) or {}
        if lu.get('game_id') != gid:
            return None
        out = {}
        for g, wts in LINEUP_DEPTH_OWN.items():
            rs, unc = [], 0.0
            for pid, gg in zip(lu.get('players') or [], lu.get('groups') or []):
                if gg != g:
                    continue
                r, u = rating(pid, g, season)
                if r is None:
                    rs = None
                    break
                rs.append(r)
                unc = max(unc, u)
            if rs is None:
                out[g] = None
                continue
            rs = (sorted(rs, reverse=True) + [LINEUP_REPLACEMENT_OWN] * len(wts))[:len(wts)]
            out[g] = (sum(r * w for r, w in zip(rs, wts)) / sum(wts), unc)
        return out

    def defs_of(t, gid):
        for v in avg.values():
            if v.get('opp') == t and v.get('game_id') == gid and isinstance(v.get('D'), dict):
                return v['D']
        return None

    bad, held, skipped, dheld = [], 0, [], 0
    for c in (M.get('next') or {}).get('games', []):
        gid = c.get('game_id')
        if c.get('frozen') or gid not in side or not isinstance(c.get('m'), (int, float)):
            continue
        season = int(gid[:4])
        st = {}
        for t in side[gid]:
            o, D = own_strength(t, gid, season), defs_of(t, gid)
            if o is None:
                st = None
                break
            for g in ('DL', 'LB', 'DB'):
                if D is not None and o[g] is not None:
                    dheld += 1
                    if abs(D[g] - o[g][0]) > o[g][1] + 1e-5:
                        bad.append(f'{gid}: {t}\'s {g} strength {D[g]} where the gate reads {o[g][0]:.4f} on its lineup')
                if D is not None:
                    o[g] = (float(D[g]), 1e-6)
            st[t] = o
        if st is None or any(v is None for o in st.values() for v in o.values()):
            skipped.append(gid)
            continue
        h, w = (st[t] for t in side[gid])
        m = sum(coef.get(g, 0.0) * (h[g][0] - w[g][0]) / 100 for g in LINEUP_DEPTH_OWN)
        tol = sum(coef.get(g, 0.0) * (h[g][1] + w[g][1]) / 100 + 0.00005 * abs(h[g][0] - w[g][0]) / 100
                  for g in LINEUP_DEPTH_OWN) + 0.0001
        held += 1
        if abs(m - c['m']) > tol:
            bad.append(f'{gid}: matchup {c["m"]} where the gate works {m:.4f} (within {tol:.4f}) out of the lineups')
    ldefs = (MU.get('league') or {}).get('defs') or {}
    for t, lu in (MU.get('lineups') or {}).items():
        o = own_strength(t, lu.get('game_id'), int(str(lu.get('game_id'))[:4])) if lu.get('game_id') else None
        for g in ('DL', 'LB', 'DB'):
            if o and o.get(g) is not None and isinstance((ldefs.get(t) or {}).get(g), (int, float)):
                dheld += 1
                if abs(ldefs[t][g] - o[g][0]) > o[g][1] + 0.05 + 1e-6:
                    bad.append(f'{t}: league.defs {g} {ldefs[t][g]} where the gate reads {o[g][0]:.2f} on its lineup')
    chk(not bad, f'LINEUPS: {len(bad)} matchups or defences are not the lineups\' on the gate\'s reading: {"; ".join(bad[:4])}')
    notes.append(f'the lineups: {held} coming calls\' matchups and {dheld} defences worked out again '
                 f'({seen["draft"]} starter readings with no rating yet, on the draft start); '
                 f'{len(skipped)} skipped, a starter rated but in neither map: {skipped[:4]}')


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
# THE MISMATCH SCORE: the gate's own copy of the lead legs (a back's rushing yards, a receiver's and a tight end's
# receiving yards; never a quarterback or a kicker), each kept only where ELO_AVG trusts that leg's Elo part, and of
# the record's first season (a non-null tag holds in every season of the record, from it to ELO_AVG's last fitted)
MM_LEAD_OWN = {'RB': 'rushing_yards', 'WR': 'receiving_yards', 'TE': 'receiving_yards'}
MM_REC_FIRST = 2018
# and of how the threshold is chosen (elo_avg_fit.py's MM_CHOOSE and MM_GRID): on 2018-2021 alone, from these points of
# chance shift; the gate cannot replay the choice (the walk-forward rows are the fit's), so it holds what it can of it:
# the seasons named, the threshold one of the grid's, and a record whose every season counts rows on both sides of it
MM_CHOOSE_OWN = '2018-2021'
MM_GRID_OWN = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12]


def mm_lead_own(A):
    """the Mismatches' legs on the gate's own reading: its copy of the lead legs, each where ELO_AVG trusts it"""
    return {p: c for p, c in MM_LEAD_OWN.items() if (A['legs'].get(f'{p}|{c}') or {}).get('trusted') is True}


def mm_shift_own(z):
    """the chance shift of an even (50%) line at z: Phi(z) - 0.5"""
    return 0.5 * math.erf(z / math.sqrt(2))


def mm_fit_bad(A):
    """ELO_AVG's `mismatch` against the gate's own rules: its lead legs the gate's (trusted, no quarterback or kicker),
    its record every season from MM_REC_FIRST to the last fitted, a non-null tag the threshold chosen and above the
    listed rows under it (`gap` > 0) in every one of them, a null tag only where some season's gap is not; and of the
    choice what the gate can hold without the fit's rows (the review of 4 November 2026): chosen on MM_CHOOSE_OWN, the
    threshold one of MM_GRID_OWN's points, and each season of a carried tag's record counting rows tagged and under it
    (whole numbers above 0); returns what is wrong, [] when nothing"""
    mm, bad = A.get('mismatch'), []
    if not isinstance(mm, dict):
        return ['ELO_AVG carries no mismatch block']
    if set(mm) != {'lead', 'tag', 'chosen', 'chosen_on', 'record', 'ladders'}:
        bad.append(f'the mismatch block\'s fields are {sorted(mm)}')
    lead = mm.get('lead')
    if lead != mm_lead_own(A):
        bad.append(f'the lead legs are {lead}, the gate\'s own trusted ones {mm_lead_own(A)}')
    if isinstance(lead, dict) and ({'QB', 'K'} & set(lead)):
        bad.append(f'the lead legs take a quarterback or a kicker: {lead}')
    if isinstance(lead, dict) and any(not (A['legs'].get(f'{p}|{c}') or {}).get('trusted') for p, c in lead.items()):
        bad.append(f'a lead leg is not trusted: {lead}')
    last = int(str(A.get('record', '')).split('-')[-1]) if re.fullmatch(r'\d{4}-\d{4}', str(A.get('record', ''))) else None
    rec, tag, ch = mm.get('record') or {}, mm.get('tag'), mm.get('chosen')
    want = [str(y) for y in range(MM_REC_FIRST, last + 1)] if last else []
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and v == v
    if mm.get('chosen_on') != MM_CHOOSE_OWN:
        bad.append(f'the threshold is chosen on {mm.get("chosen_on")}, not {MM_CHOOSE_OWN}')
    if ch is not None and not (num(ch) and any(abs(100 * ch - g) < 1e-9 for g in MM_GRID_OWN)):
        bad.append(f'the threshold chosen, {ch}, is not one of the grid\'s points of chance shift {MM_GRID_OWN}')
    if tag is not None:
        if not num(tag) or not 0 < tag < 0.5 or tag != ch:
            bad.append(f'the tag {tag} is not the chosen threshold {ch}, a chance shift between 0 and 0.5')
        cnt = lambda v: isinstance(v, int) and not isinstance(v, bool) and v > 0
        few = [y for y, r in rec.items() if not (isinstance(r, dict) and cnt(r.get('tagged')) and cnt(r.get('under')))]
        if few:
            bad.append(f'the tag\'s record counts no rows tagged or under it (whole numbers above 0) in {few}')
        if list(rec) != want:
            bad.append(f'the tag\'s record is of seasons {list(rec)}, not {want[0] if want else "?"}-{last}')
        low = [y for y, r in rec.items() if not (isinstance(r, dict) and num(r.get('gap')) and r['gap'] > 0)]
        if low:
            bad.append(f'the tag stands though its gap is not above 0 in {low}')
    elif ch is not None:
        if list(rec) == want and all(isinstance(r, dict) and num(r.get('gap')) and r['gap'] > 0 for r in rec.values()):
            bad.append(f'the tag is null though the chosen threshold {ch} held in every season of the record')
    return bad


def mm_block_bad(pid, b, A, z_own, ztol):
    """one player's `mm` against the gate's own reading: on exactly the lead blocks (his group a lead leg's, that leg
    among his stats), {stat, shift, tag}, the stat the lead leg, the shift Phi(z) - 0.5 of the gate's own z for it, to
    four places, and the tag the shift at the tag or over (false wherever the tag is null); returns what is wrong"""
    lead, mm = mm_lead_own(A), b.get('mm')
    T = (A.get('mismatch') or {}).get('tag')
    col = lead.get(b.get('group'))
    if col is None or col not in (b.get('stats') or {}):
        return [f'{pid} ({b.get("group")}) carries a mismatch score off the lead legs: {mm}'] if mm is not None else []
    if not isinstance(mm, dict) or set(mm) != {'stat', 'shift', 'tag'}:
        return [f'{pid} ({b.get("group")}) carries no mismatch score of {{stat, shift, tag}} alone on his lead leg: {mm}']
    bad = []
    if mm['stat'] != col:
        bad.append(f'{pid}\'s mismatch is on {mm["stat"]}, his lead leg is {col}')
    sh = mm['shift']
    if not isinstance(sh, (int, float)) or isinstance(sh, bool) or round(sh, 4) != sh:
        return bad + [f'{pid}\'s mismatch shift {sh} is not a chance shift to four places']
    own = mm_shift_own(z_own)
    tol = 5e-5 + 0.3990 * ztol + 1e-12        # written to four places, on a z within ztol of the gate's
    if abs(sh - own) > tol:
        bad.append(f'{pid}\'s mismatch shift {sh}, the gate\'s Phi(z) - 0.5 {own:.6f} on z {z_own:.6f}')
    want_tag = T is not None and sh >= T
    if mm['tag'] is not want_tag:
        bad.append(f'{pid}\'s mismatch tag {mm["tag"]} on a shift of {sh} against the tag {T}')
    if T is not None and abs(own - T) > tol and mm['tag'] is not (own >= T):
        bad.append(f'{pid}\'s mismatch tag {mm["tag"]}, the gate\'s shift {own:.6f} against the tag {T}')
    return bad


# THE INPUTS (4 November 2026): the gate's own copies (a deliberate change edits both and says why in the build's
# docstring) of the rule (the floors, the snap share's centre and half-life, the shares' half-lives short and long, the
# implied points' clip and reference, the spread's and the wind's scales), of which inputs each leg reads (the nested
# walk-forward's groups as its verification corrected them, elo_avg_fit.py's SPEC), of which shares a leg's share group
# takes, of the legs whose Elo part is trusted, of each position's share centre (its median over its fit rows of
# 2012-2015), of the raw values matchups.json shows, of the stadiums under a fixed or retractable roof (always calm)
# and abroad (read from Open-Meteo, the rest from the National Weather Service), of every stadium's coordinates and of
# the two forecasts' addresses (so a request asking Open-Meteo for km/h, or a stadium moved, is caught), and of the
# hours after a kickoff by which the season in play's snap counts must carry the game
IN_RULE_OWN = {'snap_floor': 0.05, 'snap_center': 0.7, 'snap_hl': 6, 'share_floor': 0.005, 'share_hl': (1.5, 6),
               'imp_clip': (7.0, 45.0), 'imp_ref': 22.5, 'spr_scale': 7.0, 'wind_clip': 40.0, 'wind_hinge': 10.0, 'wind_scale': 10.0}
IN_SNAP_FIRST_OWN = 2013
IN_GROUPS_OWN = {
    'QB|passing_yards': ('imp', 'spr', 'wind'), 'QB|passing_tds': ('imp',), 'QB|completions': ('imp', 'spr'),
    'QB|attempts': ('imp', 'spr'), 'RB|rushing_yards': ('snap', 'share', 'spr'), 'RB|scrim_yards': ('snap',),
    'RB|any_td': ('snap', 'imp'), 'WR|receptions': ('snap', 'share', 'imp', 'spr', 'q'),
    'WR|receiving_yards': ('share', 'imp', 'spr', 'q'), 'WR|any_td': ('snap', 'share', 'imp', 'spr'),
    'TE|receptions': ('snap', 'share'), 'TE|receiving_yards': ('snap', 'share'), 'K|kick_pts': ('spr',)}
IN_SHARE_OWN = {'RB|rushing_yards': ('car',), 'WR|receptions': ('tgt',), 'WR|receiving_yards': ('tgt', 'ay'),
                'WR|any_td': ('tgt',), 'TE|receptions': ('tgt',), 'TE|receiving_yards': ('tgt', 'ay')}
TRUSTED_OWN = frozenset({'QB|passing_interceptions', 'RB|rushing_yards', 'RB|carries', 'RB|scrim_yards', 'TE|any_td'})
SHARE_CENTER_OWN = {'QB': {'tgt': -5.298317, 'car': -2.442717, 'ay': -5.298317},
                    'RB': {'tgt': -2.967054, 'car': -1.432783, 'ay': -4.952606},
                    'WR': {'tgt': -1.911621, 'car': -5.298317, 'ay': -1.653376},
                    'TE': {'tgt': -2.341441, 'car': -5.298317, 'ay': -2.428973},
                    'K': {'tgt': -5.298317, 'car': -5.298317, 'ay': -5.298317}}
IN_KEYS_OWN = ('snap1', 'snapL', 'sh_tgtL', 'sh_tgtS', 'sh_carL', 'sh_carS', 'sh_ayL', 'sh_ayS', 'implied', 'spread', 'wind', 'wind_src')
IN_VOL_OWN = {'tgt': 'targets', 'car': 'carries', 'ay': 'receiving_air_yards'}
IN_KIND_OWN = {'in:imp': 'game', 'in:spr': 'game', 'in:wind': 'game', 'in:q': 'q'}       # every other input term: vol
IN_WIND_DAYS_OWN = 6.5
IN_ROOF_OWN = frozenset({'ATL97', 'DAL00', 'DET00', 'HOU00', 'IND00', 'LAX01', 'MIN01', 'NOR00', 'PHO00', 'VEG00', 'MAD01', 'BUF01'})
IN_ABROAD_OWN = frozenset({'LON00', 'LON01', 'LON02', 'MUN01', 'GER00', 'FRA00', 'MEX00', 'MAD01', 'PAR00', 'RIO00', 'SAO00', 'MEL00', 'BUF01'})
IN_STADIUMS_OWN = {
    'ATL97': (33.7554, -84.4008), 'BAL00': (39.2780, -76.6227), 'BOS00': (42.0909, -71.2643), 'BUF00': (42.7738, -78.7870),
    'CAR00': (35.2258, -80.8528), 'CHI98': (41.8623, -87.6167), 'CIN00': (39.0955, -84.5161), 'CLE00': (41.5061, -81.6995),
    'DAL00': (32.7473, -97.0945), 'DEN00': (39.7439, -105.0201), 'DET00': (42.3400, -83.0456), 'GNB00': (44.5013, -88.0622),
    'HOU00': (29.6847, -95.4107), 'IND00': (39.7601, -86.1639), 'JAX00': (30.3239, -81.6373), 'KAN00': (39.0489, -94.4839),
    'LAX01': (33.9535, -118.3392), 'MIA00': (25.9580, -80.2389), 'MIN01': (44.9737, -93.2577), 'NAS00': (36.1665, -86.7713),
    'NOR00': (29.9511, -90.0812), 'NYC01': (40.8135, -74.0745), 'PHI00': (39.9008, -75.1675), 'PHO00': (33.5276, -112.2626),
    'PIT00': (40.4468, -80.0158), 'SEA00': (47.5952, -122.3316), 'SFO01': (37.4030, -121.9700), 'TAM00': (27.9759, -82.5033),
    'VEG00': (36.0909, -115.1833), 'WAS00': (38.9077, -76.8645), 'LON00': (51.5560, -0.2796), 'LON01': (51.4560, -0.3415),
    'LON02': (51.6043, -0.0664), 'MUN01': (48.2188, 11.6247), 'GER00': (48.2188, 11.6247), 'FRA00': (50.0686, 8.6455),
    'MEX00': (19.3029, -99.1505), 'MAD01': (40.4531, -3.6883), 'PAR00': (48.9245, 2.3602), 'RIO00': (-22.9122, -43.2302),
    'SAO00': (-23.5453, -46.4742), 'MEL00': (-37.8200, 144.9834), 'BUF01': (43.6414, -79.3894)}
IN_NWS_OWN = 'https://api.weather.gov/points/{lat:.4f},{lon:.4f}'
IN_OM_OWN = ('https://api.open-meteo.com/v1/forecast?latitude={lat:.4f}&longitude={lon:.4f}&hourly=wind_speed_10m'
             '&wind_speed_unit=mph&timezone=UTC&forecast_days=7')
IN_SNAP_DUE_OWN = 72
# a forecast not had: the game is calm and the source says why; 'offline' only where the gate is told the build was
# offline (--offline: a hand build's, never the job's, so the job's gate refuses a build that skipped the forecasts)
IN_CALM_SRC = ('forecast failed', 'forecast skipped', 'nws: no period at kickoff', 'open-meteo: no hour at kickoff', 'no coordinates for')
OFFLINE = {'on': False}


def in_terms_of_own(key):
    """the input terms a leg carries on the gate's own copy, in the fit's order (each group's terms in the leg's order)"""
    out = []
    for g in IN_GROUPS_OWN.get(key, ()):
        if g == 'snap':
            out += ['in:snap1r', 'in:snapL']
        elif g == 'share':
            v = IN_SHARE_OWN[key]
            out += [f'in:shL_{v[0]}', f'in:shr_{v[0]}'] + [f'in:shL_{u}' for u in v[1:]]
        else:
            out.append('in:' + g)
    return out


def in_fit_bad(A, spec=None):
    """ELO_AVG's inputs and trust against the gate's own copies, and the fit's SPEC (spec, elo_avg_fit.SPEC) the same:
    the share centres, each leg's input terms in its projection and in its no-Elo twin alike (none is an Elo term), its
    groups (`inputs`), the typical starter's value of each of its terms (`in_mean`, those terms alone), none on a leg
    without inputs, and `trusted` exactly on the gate's legs; returns what is wrong, [] when nothing"""
    bad = []
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and v == v and abs(v) < 1e6
    inp = A.get('inputs')
    sc = (inp or {}).get('share_center') if isinstance(inp, dict) else None
    same_c = (isinstance(sc, dict) and set(sc) == set(SHARE_CENTER_OWN)
              and all(isinstance(sc[g], dict) and set(sc[g]) == set(v) and all(num(sc[g][u]) and abs(sc[g][u] - x) < 1e-12 for u, x in v.items())
                      for g, v in SHARE_CENTER_OWN.items()))
    if not isinstance(inp, dict) or set(inp) != {'share_center'} or not same_c:
        bad.append(f'ELO_AVG[\'inputs\'] is {inp}, not the gate\'s share centres')
    legs = A.get('legs') or {}
    for key in sorted(set(legs) | set(IN_GROUPS_OWN)):
        leg = legs.get(key)
        if leg is None:
            bad.append(f'{key} reads inputs on the gate\'s copy but is no leg of ELO_AVG')
            continue
        want = in_terms_of_own(key)
        got = [t for t in leg.get('terms', []) if t.startswith('in:')]
        got0 = [t for t in (leg.get('no_elo') or {}).get('terms', []) if t.startswith('in:')]
        if got != want or got0 != want:
            bad.append(f'{key} reads the inputs {got} (its twin {got0}), the gate\'s {want}')
        if len(leg.get('terms', [])) != len(leg.get('coef', [])) or len((leg.get('no_elo') or {}).get('terms', [])) != len((leg.get('no_elo') or {}).get('coef', [])):
            bad.append(f'{key}\'s terms and coefficients are not one to one')
        if want:
            if leg.get('inputs') != list(IN_GROUPS_OWN[key]):
                bad.append(f'{key}\'s groups are {leg.get("inputs")}, the gate\'s {list(IN_GROUPS_OWN[key])}')
            im = leg.get('in_mean')
            if not isinstance(im, dict) or sorted(im) != sorted(want) or not all(num(v) for v in im.values()):
                bad.append(f'{key}\'s in_mean is {im}, not a number for each of its terms {want}')
        elif 'inputs' in leg or 'in_mean' in leg:
            bad.append(f'{key} reads no inputs on the gate\'s copy but carries {leg.get("inputs")} {leg.get("in_mean")}')
        if leg.get('trusted') is not (key in TRUSTED_OWN):
            bad.append(f'{key} is trusted {leg.get("trusted")}, on the gate\'s copy {key in TRUSTED_OWN}')
    if spec is not None:
        for key in sorted(set(spec) | set(legs)):
            s = spec.get(key)
            if not isinstance(s, dict):
                bad.append(f'the fit\'s SPEC has no {key}')
                continue
            if list(s.get('inputs') or []) != list(IN_GROUPS_OWN.get(key, ())):
                bad.append(f'the fit\'s SPEC reads {s.get("inputs")} on {key}, the gate\'s {list(IN_GROUPS_OWN.get(key, ()))}')
            if s.get('trusted') is not (key in TRUSTED_OWN):
                bad.append(f'the fit\'s SPEC trusts {key} {s.get("trusted")}, on the gate\'s copy {key in TRUSTED_OWN}')
    return bad


def in_ok(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and v == v


def in_ewm_own(vals, hl):
    """the half-life average through the last value, every missing value skipped (each weight 0.5 ** (later values / hl))"""
    v = [float(x) for x in vals if in_ok(x)]
    if not v:
        return float('nan')
    w = [0.5 ** ((len(v) - 1 - i) / hl) for i in range(len(v))]
    return sum(a * b for a, b in zip(w, v)) / sum(w)


def in_read_own(cache, season):
    """THE INPUTS' sources read here, never through the build: every player's weekly stat rows from FIRST to `season`
    (his club, targets, carries and air yards; the clubs' totals take every row, one with no player id too), PFR's snap
    counts from 2013 (a finished season's required, the season in play's where nflverse has posted it) and players.csv's
    PFR ids (required); None where a required file is not in the cache, said"""
    want = ['player_id', 'season', 'week', 'team'] + list(IN_VOL_OWN.values())
    parts, snaps, ok = [], [], True
    for y in range(build.FIRST, season + 1):
        p = os.path.join(cache, f'stats_player_week_{y}.csv')
        if not os.path.exists(p):
            continue                       # the gate's own log says so (avg_log), and the season to come may have none
        have = set(pd.read_csv(p, nrows=0).columns)
        lack = [c for c in want if c not in have]
        if lack:
            chk(False, f'AVERAGES: stats_player_week_{y}.csv has no {", ".join(lack)}: the inputs\' shares cannot be held')
            ok = False
            continue
        parts.append(pd.read_csv(p, usecols=want, low_memory=False))
    for y in range(IN_SNAP_FIRST_OWN, season + 1):
        p = os.path.join(cache, f'snap_counts_{y}.csv')
        if os.path.exists(p):
            snaps.append(pd.read_csv(p, usecols=['season', 'week', 'team', 'pfr_player_id', 'offense_snaps', 'offense_pct'], low_memory=False))
        elif y < season:
            chk(False, f'AVERAGES: snap_counts_{y}.csv, a finished season\'s, is not in the cache: no snap share can be held against it')
            ok = False
    pp = os.path.join(cache, 'players.csv')
    if not os.path.exists(pp):
        chk(False, 'AVERAGES: players.csv (the snap counts\' PFR ids) is not in the cache: no snap share can be held against it')
        return None
    pl = pd.read_csv(pp, usecols=['gsis_id', 'pfr_id'], low_memory=False)
    pfr = {p: g for g, p in zip(pl.gsis_id, pl.pfr_id) if isinstance(p, str) and isinstance(g, str)}
    if not pfr:                            # read as an empty map, every snap share would be lost and held as lost
        chk(False, f'AVERAGES: players.csv places no PFR id ({len(pl)} rows): no snap share can be held against it')
        return None
    if not ok or not parts:
        return None
    return {'stats': pd.concat(parts, ignore_index=True),
            'snaps': pd.concat(snaps, ignore_index=True) if snaps else pd.DataFrame(columns=['season', 'week', 'team', 'pfr_player_id', 'offense_snaps', 'offense_pct']),
            'pfr': pfr}


def in_snaps_due_bad(games, snaps, season, built):
    """the season in play's snap counts on the gate's own rule: once its first game kicked off IN_SNAP_DUE_OWN hours
    before the build they must be had (snaps None: not in the cache) and carry both clubs (in today's code) of every
    regular-season game with a final score that kicked off that long before it; returns what is wrong, [] when nothing
    (before the season's first game is that old, nothing is asked)"""
    g = games[games.season == season]
    if not len(g):
        return []
    due = datetime.timedelta(hours=IN_SNAP_DUE_OWN)
    kicks = [build.kickoff(d, t) for d, t in zip(g.gameday, g.gametime)]
    if built < min(kicks) + due:
        return []
    if snaps is None:
        return [f'snap_counts_{season}.csv, the season in play\'s, is not had though its first game kicked off over {IN_SNAP_DUE_OWN} hours ago']
    have = set()
    for w, t, sy in zip(snaps.week, snaps.team, snaps.season):
        if int(sy) == season:
            have.add((int(w), MOVED.get(t, t)))
    out = []
    for r, k in zip(g.itertuples(index=False), kicks):
        if r.game_type != 'REG' or not (in_ok(r.home_score) and in_ok(r.away_score)) or built < k + due:
            continue
        miss = [t for t in (MOVED.get(r.away_team, r.away_team), MOVED.get(r.home_team, r.home_team)) if (int(r.week), t) not in have]
        if miss:
            out.append(f'{r.game_id} ({", ".join(miss)})')
    return [f'snap_counts_{season}.csv lacks {len(out)} regular-season game(s) final over {IN_SNAP_DUE_OWN} hours ago: {", ".join(out[:4])}'] if out else []


def in_hist_own(src, pids):
    """each asked player's appearances in order, on the gate's own reading: a game with a stat row (any position) or
    an offensive snap (a snap counts row with offense_snaps above 0, placed by its PFR id through players.csv), keyed
    season * 100 + week; each with his snap share (the larger of his rows that week; none without a snap row) and his
    share of his club's targets, carries and air yards that week (his over every row of his club's, 0 with a snap and
    no stat row; air yards his clipped at 0 over the club's unclipped sum, only where that sum is above 20; none where
    the club's sum is 0); his club the stat row's, else the snap row's (the moved clubs in today's code).
    {pid: [(key, snap, {tgt, car, ay})]}"""
    cols = list(IN_VOL_OWN.values())
    st = src['stats'].copy()
    st['team'] = st.team.replace(MOVED)
    for c in cols:
        st[c] = pd.to_numeric(st[c], errors='coerce').fillna(0.0).astype(float)
    g = st.groupby(['season', 'week', 'team'])[cols].sum()
    tot = {(int(s), int(w), t): v for (s, w, t), v in zip(g.index, g.values.tolist())}
    want = set(pids)
    app = {}
    for r in st[st.player_id.isin(list(want))].itertuples(index=False):
        app.setdefault(r.player_id, {})[(int(r.season), int(r.week))] = {'team': r.team, 'snap': float('nan'),
                                                                          'x': [float(getattr(r, c)) for c in cols]}
    back = {p: g for p, g in src['pfr'].items() if g in want}
    sn = src['snaps']
    sn = sn[sn.pfr_player_id.isin(list(back)) & (pd.to_numeric(sn.offense_snaps, errors='coerce') > 0)]
    seen = {}
    for r in sn.itertuples(index=False):
        k = (back[r.pfr_player_id], int(r.season), int(r.week))
        pct = float(r.offense_pct)
        if k not in seen:
            seen[k] = [pct, MOVED.get(r.team, r.team)]
        else:
            seen[k][0] = max(seen[k][0], pct)        # two rows of one player's week: the larger share, the first club
    for (pid, s, w), (pct, team) in seen.items():
        e = app.setdefault(pid, {}).get((s, w))
        if e is None:
            app[pid][(s, w)] = {'team': team, 'snap': pct, 'x': [0.0, 0.0, 0.0]}
        else:
            e['snap'] = pct
    out = {}
    for pid, by in app.items():
        rows = []
        for (s, w) in sorted(by):
            e = by[(s, w)]
            T = tot.get((s, w, e['team']))
            sh = {}
            for i, k in enumerate(IN_VOL_OWN):
                den = T[i] if T is not None else float('nan')
                if k == 'ay':
                    sh[k] = max(e['x'][i], 0.0) / max(den, 1.0) if den == den and den > 20 else float('nan')
                else:
                    sh[k] = e['x'][i] / max(den, 1.0) if den == den and den > 0 else float('nan')
            rows.append((s * 100 + w, e['snap'], sh))
        out[pid] = rows
    return out


def in_values_own(rows, key, home, spread_line, total_line):
    """his inputs' raw values going into a game keyed `key` (his appearances before it) and the game's lines: his last
    snap share, its half-life-6 average, each share's half-life-6 and 1.5 averages, and his side's implied points and
    spread (the home side's spread_line, the away side's its negative: positive when his side is favoured)"""
    R = IN_RULE_OWN
    before = [r for r in rows if r[0] < key]
    snaps = [r[1] for r in before if in_ok(r[1])]
    v = {'snap1': snaps[-1] if snaps else float('nan'), 'snapL': in_ewm_own(snaps, R['snap_hl'])}
    hs, hl = R['share_hl']
    for k in IN_VOL_OWN:
        vals = [r[2][k] for r in before]
        v[f'sh_{k}L'], v[f'sh_{k}S'] = in_ewm_own(vals, hl), in_ewm_own(vals, hs)
    sp = float(spread_line) if in_ok(spread_line) else float('nan')
    tl = float(total_line) if in_ok(total_line) else float('nan')
    s = sp if home else -sp
    v['spread'], v['implied'] = s, tl / 2 + s / 2
    return v


def in_wind_own(gm, built, rec_w=None, rec_src=None, edge=60, offline=None):
    """the wind a game's terms read, on the gate's own rule, and what is wrong with the one recorded (rec_w, rec_src):
    a played game's is games.csv's (calm under a closed, open or fixed roof); a game to come is calm under any roof (the
    gate's own list, or games.csv's roof dome, closed or open), recorded (0, 'roof'); past 6.5 days from the build (within
    `edge` seconds of it either way), calm, 'beyond the forecast'; within, the recorded forecast, a number of 0 to 150 mph
    from the National Weather Service ('nws') in the US and Open-Meteo ('open-meteo') abroad, or calm with the reason a
    forecast was not had (IN_CALM_SRC; 'offline' too, anywhere off a roof, only where the gate is told the build was
    offline: OFFLINE, or `offline`). Returns (wind or None, problem or None)"""
    off = OFFLINE['on'] if offline is None else offline
    roof = gm.get('roof') if isinstance(gm.get('roof'), str) else ''
    if in_ok(gm.get('home_score')):
        return ((0.0 if roof in ('dome', 'closed', 'open') else float(gm['wind']) if in_ok(gm.get('wind')) else None), None)
    calm = lambda: rec_w is None and isinstance(rec_src, str) and (rec_src.startswith(IN_CALM_SRC) or (off and rec_src == 'offline'))
    if gm.get('stadium_id') in IN_ROOF_OWN or roof in ('dome', 'closed', 'open'):
        ok = in_ok(rec_w) and rec_w == 0 and rec_src == 'roof'
        return 0.0, None if ok else f'under a roof but recorded {rec_w} ({rec_src})'
    secs = (gm['kick'] - built).total_seconds()
    far = 3600 * 24 * IN_WIND_DAYS_OWN
    beyond = rec_w is None and rec_src == 'beyond the forecast'
    if secs > far + edge or secs < -3600 - edge:
        ok = beyond or (off and rec_w is None and rec_src == 'offline')
        return None, None if ok else f'{secs / 86400:.2f} days from the build, past the forecast, but recorded {rec_w} ({rec_src})'
    if calm() or (beyond and abs(secs - far) <= edge):
        return None, None
    want = 'open-meteo' if gm.get('stadium_id') in IN_ABROAD_OWN else 'nws'
    if rec_src == want and in_ok(rec_w) and 0 <= rec_w <= 150:
        return float(rec_w), None
    return None, f'a forecast in reach at {gm.get("stadium_id")} recorded {rec_w} ({rec_src}), not a number from {want} or calm with its reason'


def in_terms_own(v, wind, q, group, center=SHARE_CENTER_OWN):
    """the input terms from his raw values (in_values_own), the wind read and his Questionable (0 or 1), on the gate's
    own copy of the rule and the share centres; a value missing gives its term's neutral 0"""
    R = IN_RULE_OWN
    fs, fl = R['snap_floor'], R['share_floor']
    t = {'in:snap1r': math.log(max(v['snap1'], fs) / max(v['snapL'], fs)) if in_ok(v['snap1']) and in_ok(v['snapL']) else 0.0,
         'in:snapL': v['snapL'] - R['snap_center'] if in_ok(v['snapL']) else 0.0}
    for k in IN_VOL_OWN:
        L, S = v[f'sh_{k}L'], v[f'sh_{k}S']
        t[f'in:shL_{k}'] = math.log(max(L, fl)) - center[group][k] if in_ok(L) else 0.0
        t[f'in:shr_{k}'] = math.log(max(S, fl) / max(L, fl)) if in_ok(L) and in_ok(S) else 0.0
    lo, hi = R['imp_clip']
    t['in:imp'] = math.log(min(max(v['implied'], lo), hi) / R['imp_ref']) if in_ok(v['implied']) else 0.0
    t['in:spr'] = v['spread'] / R['spr_scale'] if in_ok(v['spread']) else 0.0
    w = wind if in_ok(wind) else 0.0
    t['in:wind'] = max(0.0, min(w, R['wind_clip']) - R['wind_hinge']) / R['wind_scale']
    t['in:q'] = float(q)
    return t


def in_q_own(inj, season, week, pid):
    """1 where his club filed him Questionable for that week (its last filed status of his, `report_status`), else 0: a
    practice report with no status yet, or last week's status, is no status"""
    if inj is None or not len(inj):
        return 0
    d = inj[(inj.gsis_id == pid) & (pd.to_numeric(inj.week, errors='coerce') == week) & inj.report_status.notna()]
    if 'season' in d.columns:
        d = d[pd.to_numeric(d.season, errors='coerce').fillna(season) == season]
    return int(len(d) > 0 and d.report_status.iloc[-1] == 'Questionable')


def in_x_own(leg, x):
    """the inputs' multipliers inside a leg's no-Elo twin by kind (vol: the snap and share terms; game: implied points,
    spread, wind; q: the Questionable tag), each exp of its terms' coefficients in the twin (never the full projection's,
    which differ widely where the Elo terms move with the inputs: the twin's are the factor the twin, Base, applies)
    times their distance from the typical starter's value (in_mean; the tag against not listed, 0)"""
    m = leg.get('in_mean') or {}
    s = {}
    for t, c in zip(leg['no_elo']['terms'], leg['no_elo']['coef']):
        if t.startswith('in:'):
            k = IN_KIND_OWN.get(t, 'vol')
            s[k] = s.get(k, 0.0) + c * (x[t] - (0.0 if t == 'in:q' else m[t]))
    return {k: math.exp(v) for k, v in s.items()}


def in_block_bad(pid, rec, own, rnd=5e-5):
    """his matchups.json `in` against the gate's own raw values: exactly IN_KEYS_OWN, each number to four places (None
    where the gate has none), the wind and its source those in_wind_own accepted"""
    if not isinstance(rec, dict):
        return [f'{pid} carries no inputs (`in`)']
    if sorted(rec) != sorted(IN_KEYS_OWN):
        return [f'{pid}\'s inputs carry {sorted(rec)}, not {sorted(IN_KEYS_OWN)}']
    bad = []
    for k in IN_KEYS_OWN:
        if k == 'wind_src':
            continue
        g, o = rec[k], own[k]
        if not in_ok(o):
            if g is not None:
                bad.append(f'{pid}\'s {k} {g}, the gate has none')
        elif not in_ok(g) or abs(g - o) > rnd + 1e-9 * abs(o):
            bad.append(f'{pid}\'s {k} {g}, the gate\'s {o:.6f}')
    return bad


def in_week_own(AV, want, games, cache, season, built, src=None, inj=None):
    """THE INPUTS of every projected player of the coming week on the gate's own reading: his raw values from the stat
    rows, snap counts and players.csv read here (src, else in_read_own), his game's lines from games.csv, its wind held
    to the forecast recorded (in_wind_own; one wind for every player of a game) and his Questionable from the filed
    report (inj, else injuries_<season>.csv read here). Returns ({pid: (raw values, terms)} or None, problems)"""
    src = src if src is not None else in_read_own(cache, season)
    if src is None:
        return None, ['the inputs\' sources are not all in the cache, so no input can be held']
    pids = [p for p in AV if p in want]
    hist = in_hist_own(src, pids)
    gi = games.set_index('game_id')
    if inj is None:
        ip = os.path.join(cache, f'injuries_{season}.csv')
        inj = pd.read_csv(ip, low_memory=False) if os.path.exists(ip) else None
    out, per_game, bad = {}, {}, []
    for pid in pids:
        w, b = want[pid], AV[pid]
        gm = gi.loc[w['game_id']]
        rec = b.get('in') if isinstance(b.get('in'), dict) else {}
        v = in_values_own(hist.get(pid, []), int(gm.season) * 100 + int(gm.week), bool(w['home']), gm.spread_line, gm.total_line)
        wind, prob = in_wind_own(gm, built, rec.get('wind'), rec.get('wind_src'))
        if prob and rec:                           # a block with no inputs at all is said once, by in_block_bad
            bad.append(f'{w["game_id"]} ({pid}): {prob}')
        v['wind'] = wind
        out[pid] = (v, in_terms_own(v, wind, in_q_own(inj, season, int(gm.week), pid), w['group']))
        per_game.setdefault(w['game_id'], set()).add((rec.get('wind'), rec.get('wind_src')))
    bad += [f'{gid}\'s players carry different winds {sorted(map(str, s))}' for gid, s in per_game.items() if len(s) > 1]
    return out, bad
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
    chk((MU.get('avg_fit') or {}).get('mismatch') == json.loads(json.dumps(A.get('mismatch'))),
        'AVERAGES: matchups.json\'s avg_fit.mismatch is not the build\'s ELO_AVG[\'mismatch\']')
    fb = mm_fit_bad(A)
    chk(not fb, f'AVERAGES: the mismatch score\'s constants: {"; ".join(fb[:4])}')
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
    # THE INPUTS on the gate's own reading (in_week_own), wherever its own copy has a leg read them
    INP, ibad = (None, [])
    if any(in_terms_of_own(k) for k in A['legs']):
        INP, ibad = in_week_own(AV, want, games, cache, season, built)
        chk(not ibad, f'AVERAGES: the inputs: {"; ".join(ibad[:4])}{" ..." if len(ibad) > 4 else ""} ({len(ibad)})')
    in_seen = {'blocks': 0, 'legs': 0, 'src': {}}
    pl = P.get('players') or {}
    top = {x['id']: x for grp in (P.get('groups') or {}).values() for x in grp.get('top', [])}
    prior, allowed, tgt = {}, {}, {}
    worst, mm_seen = {}, []
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
        z_own = {}
        own_in = (INP or {}).get(pid)
        if INP is not None:
            # his raw inputs to four places, the wind and its source those the gate accepted
            bad += in_block_bad(pid, b.get('in'), own_in[0])
            in_seen['blocks'] += 1
            src_ = (b.get('in') or {}).get('wind_src')
            in_seen['src'][str(src_).split(':')[0]] = in_seen['src'].get(str(src_).split(':')[0], 0) + 1
        elif any(in_terms_of_own(f'{gp}|{c}') for c, _ in legs):
            bad.append(f'{pid}: his inputs cannot be worked out on the gate\'s own reading')
            continue
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
            for t in leg['terms']:
                if t.startswith('in:'):
                    x[t] = own_in[1][t]
            rf = {**{'E:' + t: ref[leg['scale']][t] for t in leg['tables']}, **ref['defs']}
            o = avg_leg_own(leg, av, x, rf)
            # the inputs' multipliers against the typical starter's, by kind, on a leg that reads inputs and no other
            wx = in_x_own(leg, x) if any(t.startswith('in:') for t in leg['terms']) else {}
            gx = st.get('in_x')
            if not wx:
                if 'in_x' in st:
                    bad.append(f'{pid} {col}: in_x {gx} on a leg that reads no inputs')
            else:
                in_seen['legs'] += 1
                if not isinstance(gx, dict) or sorted(gx) != sorted(wx):
                    bad.append(f'{pid} {col}: in_x {gx}, the gate\'s kinds {sorted(wx)}')
                else:
                    for k, v in wx.items():          # written to four places: one unit in the last, as every number
                        miss = abs(gx[k] - v) if in_ok(gx[k]) else float('inf')
                        if not miss <= 1e-4 + 1e-9 * v:
                            bad.append(f'{pid} {col}: in_x {k} {gx[k]}, the gate\'s {v:.6f}')
                        worst['in_x'] = max(worst.get('in_x', 0.0), miss / (1e-4 + 1e-9 * v) if miss < float('inf') else 9.0)
            z_own[col] = (o['z'], 1e-4 + (1e-4 + 1e-6 * o['proj']) / o['sd'])
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
        # THE MISMATCH SCORE: on exactly the lead blocks, the shift of the gate's own z, the tag on it
        lc = mm_lead_own(A).get(gp)
        zc, zt = z_own.get(lc, (0.0, 0.0))
        bad += mm_block_bad(pid, b, A, zc, zt)
        mm_seen.append(b.get('mm'))
    chk(not bad, f'AVERAGES: {"; ".join(bad[:4])}{" ..." if len(bad) > 4 else ""} ({len(bad)})')
    mm_rows = [m for m in mm_seen if isinstance(m, dict)]
    notes.append(f'mismatch scores: {len(mm_rows)} lead blocks held on the gate\'s own z ({sum(1 for m in mm_rows if m.get("shift", 0) > 0)} '
                 f'with a shift above 0, {sum(1 for m in mm_rows if m.get("tag") is True)} at the tag of {(A.get("mismatch") or {}).get("tag")})')
    if INP is not None:
        notes.append(f'inputs: {in_seen["blocks"]} blocks and {in_seen["legs"]} legs\' multipliers held on the gate\'s own reading '
                     f'(the wind\'s sources: {", ".join(f"{n} {k}" for k, n in sorted(in_seen["src"].items()))})')
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
        # THE INPUTS: invented values of the leg's input terms (the Questionable tag on), and the inputs' multipliers
        for i, t in enumerate(t for t in leg['terms'] if t.startswith('in:')):
            x[t] = 1.0 if t == 'in:q' else 0.17 - 0.09 * i
        ref = {**{'E:' + t: 0.11 for t in leg['tables']}, 'DL': 0.13, 'LB': 0.31, 'DB': 0.25}
        ix, ox = build.avg_in_split(leg, x), in_x_own(leg, x)
        if sorted(ix) != sorted(ox) or any(abs(ix[k] - ox[k]) > 5e-5 + 1e-9 * ox[k] for k in ox):
            bad.append(f'{key} in_x {ix} for {ox}')
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
    in_const_checks()
    in_fixture_checks()


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
    # THE INPUTS handed in for some of the week's players (made-up terms and raw values; the rest read every term 0):
    # each carries them as `in`, and every leg reading inputs its multipliers as in_x
    gid = f'{S}_08_BBB_AAA'
    raw = {'snap1': 0.81, 'snapL': 0.7712, 'sh_tgtL': 0.2211, 'sh_tgtS': 0.2533, 'sh_carL': 0.0123, 'sh_carS': None, 'sh_ayL': 0.30001,
           'sh_ayS': 0.31, 'implied': 24.25, 'spread': 3.5, 'wind': 17.0, 'wind_src': 'nws'}
    terms = lambda k: {'in:snap1r': 0.05 * k, 'in:snapL': -0.04 * k, 'in:shL_tgt': 0.31 - 0.1 * k, 'in:shr_tgt': 0.07, 'in:shL_car': -0.2 * k,
                       'in:shr_car': 0.03, 'in:shL_ay': 0.12, 'in:shr_ay': -0.05, 'in:imp': 0.075 * k, 'in:spr': 0.5, 'in:wind': 0.7, 'in:q': float(k == 2)}
    WIN = {(p, gid): dict(terms(k), **raw) for k, p in enumerate(['q1', 'r1', 'w1', 't1', 'k1'])}
    av, ref = build.averages(log, coming, S, tables(), rating, srating, defs, inputs=WIN)
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
    fz = {}
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
            for t in leg['terms']:
                if t.startswith('in:'):
                    x[t] = WIN.get((pid, gid), {}).get(t, 0.0)
            o = avg_leg_own(leg, a, x, {**{'E:' + t: rmean[leg['scale']][t] for t in leg['tables']}, **dmean})
            fz[(pid, col)] = (o['z'], 1e-4 + (1e-4 + 1e-6 * o['proj']) / o['sd'])
            got = b['stats'].get(col)
            if got is None:
                bad.append(f'{pid} has no {col}, a leg of his position')
                continue
            wx = in_x_own(leg, x) if any(t.startswith('in:') for t in leg['terms']) else {}
            gx = got.get('in_x')
            if (not wx and gx is not None) or (wx and (not isinstance(gx, dict) or sorted(gx) != sorted(wx)
                                                      or any(abs(gx[k] - v) > 1e-4 + 1e-9 * v for k, v in wx.items()))):
                bad.append(f'{pid} {col}: in_x {gx}, the gate\'s {wx}')
            near = 1e-4 + 1e-6 * o['proj']
            if (abs(got['avg'] - a) > 1e-4 or any(abs(got[k] - o[k]) > near for k in ('proj', 'no_elo', 'elo'))
                    or abs(got['z'] - o['z']) > 1e-4 + near / o['sd'] or any(abs(got[k] - o[k]) > 1e-4 for k in ('def_x', 'elo_x'))):
                bad.append(f'{pid} {col}: {got} for avg {a:.4f}, proj {o["proj"]:.4f}, twin {o["no_elo"]:.4f}, z {o["z"]:.4f}')
    # each player handed inputs carries their raw values to four places (none missing as None), and no other carries any
    for pid, b in av.items():
        want_in = {k: (None if v is None else round(v, 4) if isinstance(v, float) else v) for k, v in raw.items()} if (pid, gid) in WIN else None
        if b.get('in') != want_in:
            bad.append(f'{pid} carries the inputs {b.get("in")}, not {want_in}')
    # BBB has allowed a receiver a touchdown a game and no quarterback anything: the allowances over the fit's mean
    qa = (av['q1']['stats'].get('passing_yards') or {}).get('allowed')
    if qa != 1.0:
        bad.append(f'q1 passing yards allowed {qa} where BBB has allowed no quarterback a game')
    want_a = round(1.0 / A['legs']['WR|any_td']['allowed_mean'], 6)
    wa = (av['w1']['stats'].get('any_td') or {}).get('allowed')
    if wa != want_a:
        bad.append(f'w1 anytime TD allowed {wa} where BBB has allowed a receiver a TD a game ({want_a})')
    chk(not bad, f'AVERAGES: on a made-up week: {bad[:3]}')
    # THE MISMATCH SCORE on the made-up week: `mm` on exactly the lead blocks (the back's rushing yards, the receivers'
    # and the tight end's receiving yards; none on a quarterback or a kicker), its shift Phi(z) - 0.5 of the gate's own
    # z, its tag on it; then with the tag at the largest shift (that block alone tagged), the tag null (none tagged,
    # the shifts as they were) and the tight end's leg untrusted (his block carries none), the build's ELO_AVG put back
    def mm_week(A_):
        bad_, lead = [], mm_lead_own(A_)
        for pid, b in av_.items():
            lc = lead.get(b['group'])
            bad_ += mm_block_bad(pid, b, A_, *fz.get((pid, lc), (0.0, 0.0)))
        return bad_
    av_ = av
    bad = mm_week(A)
    own_lead = sorted(p for p, b in av.items() if mm_lead_own(A).get(b['group']))
    if sorted(p for p, b in av.items() if 'mm' in b) != own_lead or not own_lead:
        bad.append(f'the mismatch scores are on {sorted(p for p, b in av.items() if "mm" in b)}, the lead blocks are {own_lead}')
    orig = build.ELO_AVG
    try:
        shifts = {p: av[p]['mm']['shift'] for p in own_lead if 'mm' in av[p]}
        top = max(shifts.values()) if shifts else 0.0
        for what, edit in (('the tag at the largest shift', lambda X: X['mismatch'].update(tag=top, chosen=top)),
                           ('the tag null', lambda X: X['mismatch'].update(tag=None)),
                           ('the tight end\'s leg untrusted', lambda X: (X['legs']['TE|receiving_yards'].update(trusted=False),
                                                                          X['mismatch']['lead'].pop('TE', None)))):
            X = json.loads(json.dumps(orig))
            edit(X)
            build.ELO_AVG = X
            av_, _ = build.averages(log, coming, S, tables(), rating, srating, defs, inputs=WIN)
            got = mm_week(X)
            bad += [f'{what}: {g}' for g in got]
            if what == 'the tag at the largest shift' and sorted(p for p, b in av_.items() if (b.get('mm') or {}).get('tag')) != \
                    sorted(p for p, v in shifts.items() if v >= top):
                bad.append(f'{what}: tagged {sorted(p for p, b in av_.items() if (b.get("mm") or {}).get("tag"))}')
            if what == 'the tag null' and (any((b.get('mm') or {}).get('tag') for b in av_.values())
                                           or {p: (av_[p].get('mm') or {}).get('shift') for p in shifts} != shifts):
                bad.append(f'{what}: a block is tagged, or a shift moved')
            if what.startswith('the tight end') and 'mm' in av_['t1']:
                bad.append(f'{what}: t1 still carries {av_["t1"]["mm"]}')
    finally:
        build.ELO_AVG = orig
    chk(not bad, f'AVERAGES: the mismatch score on a made-up week: {bad[:3]}')
    # the mismatch score's constants: the gate's own rules refuse each made-up block that breaks one, and pass the build's
    good = {'lead': mm_lead_own(A), 'tag': 0.04, 'chosen': 0.04, 'chosen_on': '2018-2021', 'ladders': {},
            'record': {str(y): {'rho': 0.15, 'tagged': 300, 'under': 600, 'gap': 0.1, 'gap_untagged': 0.2}
                       for y in range(MM_REC_FIRST, int(A['record'].split('-')[1]) + 1)}}
    low = dict(good, record=dict(good['record'], **{str(MM_REC_FIRST + 2): dict(good['record'][str(MM_REC_FIRST + 2)], gap=-0.01)}))
    short = dict(good, record={y: r for y, r in good['record'].items() if y != str(MM_REC_FIRST)})
    cases = [('the build\'s', A.get('mismatch'), True, A), ('a made-up good block', good, True, A),
             ('a null tag with a season below 0', dict(low, tag=None), True, A),
             ('a tag with a season below 0', low, False, A), ('a tag missing a season', short, False, A),
             ('a null tag that held every season', dict(good, tag=None), False, A),
             ('a tag off the threshold chosen', dict(good, tag=0.05), False, A),
             ('a tag and threshold off the grid', dict(good, tag=0.045, chosen=0.045), False, A),
             ('a threshold chosen on the whole record', dict(good, chosen_on='2018-2025'), False, A),
             ('a null tag chosen on the whole record', dict(low, tag=None, chosen_on='2018-2025'), False, A),
             ('a null tag off the grid', dict(low, tag=None, chosen=0.045), False, A),
             ('a season counting no row tagged', dict(good, record=dict(good['record'], **{str(MM_REC_FIRST + 1): dict(good['record'][str(MM_REC_FIRST + 1)], tagged=0)})), False, A),
             ('a season counting rows under it as a fraction', dict(good, record=dict(good['record'], **{str(MM_REC_FIRST + 3): dict(good['record'][str(MM_REC_FIRST + 3)], under=600.5)})), False, A),
             ('a threshold of 6 points on the grid', dict(good, tag=0.06, chosen=0.06), True, A),
             ('a quarterback lead', dict(good, lead=dict(good['lead'], QB='passing_yards')), False, A),
             ('a kicker lead', dict(good, lead=dict(good['lead'], K='kick_pts')), False, A)]
    U = json.loads(json.dumps(A))
    U['legs']['TE|receiving_yards']['trusted'] = False
    cases.append(('a lead leg ELO_AVG does not trust', dict(good, lead=dict(MM_LEAD_OWN)), False, U))
    wrong = [w for w, blk, ok, AA in cases if (not mm_fit_bad(dict(AA, mismatch=blk))) != ok]
    chk(not wrong, f'AVERAGES: the gate\'s mismatch rules judge these made-up blocks the wrong way: {wrong}')
    # a game with nothing on the sheet (as the build never logs one, but were it there) moves nothing
    quiet = dict(log[0], pid='w1', group='WR', ord=99, game_id=f'{S}_99_AAA_CCC', vol=0.0, **{c: 0.0 for c in cols})
    av_q, _ = build.averages(log + [quiet], coming, S, tables(), rating, srating, defs, inputs=WIN)
    chk(av_q == av, 'AVERAGES: a game with nothing on the sheet moves a made-up week\'s averages')
    # a better pass defence (BBB's raw up half a standard deviation of its stats): every AAA leg facing it moves by its
    # coefficient on the defence and the interaction at his own Elo, and nothing else moves
    av_b, _ = build.averages(log, coming, S, tables(0.5), rating, srating, defs, inputs=WIN)
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


def in_const_checks():
    """THE INPUTS' constants against the gate's own copies: the build's rule (AVG_IN) and first snap season, its stadiums
    under a roof and abroad, ELO_AVG's share centres, each leg's input terms, groups, typical values and trust, and the
    fit's SPEC; then the gate's own rules refusing made-up ELO_AVGs and SPECs that break each"""
    A = build.ELO_AVG
    norm = lambda d: {k: (list(v) if isinstance(v, tuple) else v) for k, v in d.items()}
    chk(norm(build.AVG_IN) == norm(IN_RULE_OWN) and build.SNAP_FIRST == IN_SNAP_FIRST_OWN,
        f'AVERAGES: the build\'s rule for the inputs {build.AVG_IN} (snap counts from {build.SNAP_FIRST}) is not the gate\'s {IN_RULE_OWN} (from {IN_SNAP_FIRST_OWN})')
    roofed = {k for k, v in build.STADIUMS.items() if v[2] != 'open'}
    abroad = {k for k, v in build.STADIUMS.items() if v[2] == 'open' and not (-125 < v[1] < -66 and 24 < v[0] < 50)}
    chk(roofed == set(IN_ROOF_OWN) and abroad == set(IN_ABROAD_OWN) - set(IN_ROOF_OWN),
        f'AVERAGES: the build\'s stadiums under a roof {sorted(roofed ^ set(IN_ROOF_OWN))} or abroad {sorted(abroad ^ (set(IN_ABROAD_OWN) - set(IN_ROOF_OWN)))} '
        f'differ from the gate\'s')
    moved = sorted(k for k in set(build.STADIUMS) | set(IN_STADIUMS_OWN)
                   if k not in build.STADIUMS or k not in IN_STADIUMS_OWN or tuple(build.STADIUMS[k][:2]) != IN_STADIUMS_OWN[k])
    chk(not moved, f'AVERAGES: the build\'s stadium coordinates differ from the gate\'s at {moved[:6]}: a forecast would be read for another place')
    chk(build.NWS_POINTS == IN_NWS_OWN and build.OPEN_METEO == IN_OM_OWN,
        f'AVERAGES: the forecasts\' addresses are {build.NWS_POINTS!r} and {build.OPEN_METEO!r}, not the gate\'s {IN_NWS_OWN!r} and {IN_OM_OWN!r} '
        f'(Open-Meteo answers in km/h unless asked for mph)')
    chk(build.SNAP_DUE == IN_SNAP_DUE_OWN, f'AVERAGES: the build requires the season in play\'s snap counts {build.SNAP_DUE} hours after a kickoff, the gate {IN_SNAP_DUE_OWN}')
    fb = in_fit_bad(A, elo_avg_fit.SPEC)
    chk(not fb, f'AVERAGES: the inputs\' constants: {"; ".join(fb[:4])}{" ..." if len(fb) > 4 else ""} ({len(fb)})')

    def edited(fn):
        X = json.loads(json.dumps(A))
        fn(X)
        return X

    def add_group(X, key, g, term):
        leg = X['legs'][key]
        leg['inputs'] = list(leg.get('inputs') or []) + [g]
        leg['terms'].append(term)
        leg['coef'].append(-0.05)
        leg['no_elo']['terms'].append(term)
        leg['no_elo']['coef'].append(-0.05)
        leg.setdefault('in_mean', {})[term] = 0.0

    def drop_twin(X, key, term):
        n = X['legs'][key]['no_elo']
        i = n['terms'].index(term)
        del n['terms'][i], n['coef'][i]
    cases = [('the build\'s', A, None, True),
             ('a share centre edited', edited(lambda X: X['inputs']['share_center']['WR'].update(tgt=-1.8)), None, False),
             ('an input group added to a leg', edited(lambda X: add_group(X, 'WR|any_td', 'q', 'in:q')), None, False),
             ('inputs on a leg that reads none', edited(lambda X: add_group(X, 'QB|carries', 'imp', 'in:imp')), None, False),
             ('a trusted flag flipped on', edited(lambda X: X['legs']['WR|receptions'].update(trusted=True)), None, False),
             ('a trusted flag flipped off', edited(lambda X: X['legs']['RB|carries'].update(trusted=False)), None, False),
             ('an input in the projection and not its twin', edited(lambda X: drop_twin(X, 'RB|scrim_yards', 'in:snapL')), None, False),
             ('in_mean missing a term', edited(lambda X: X['legs']['K|kick_pts'].update(in_mean={})), None, False),
             ('the groups out of order', edited(lambda X: X['legs']['QB|passing_yards'].update(inputs=['spr', 'imp', 'wind'])), None, False)]
    S0 = elo_avg_fit.SPEC
    spec_add = {k: dict(v) for k, v in S0.items()}
    spec_add['WR|any_td']['inputs'] = list(spec_add['WR|any_td']['inputs']) + ['q']
    spec_trust = {k: dict(v) for k, v in S0.items()}
    spec_trust['TE|receiving_yards']['trusted'] = True
    cases += [('the fit\'s SPEC', A, S0, True), ('a SPEC with an input group added', A, spec_add, False),
              ('a SPEC trusting a tight end\'s yards', A, spec_trust, False)]
    wrong = [w for w, X, sp, ok in cases if (not in_fit_bad(X, sp)) != ok]
    chk(not wrong, f'AVERAGES: the gate\'s rules for the inputs\' constants judge these made-up ones the wrong way: {wrong}')


def in_fixture_checks():
    """THE INPUTS on a made-up world (avg_coming_inputs, the build's run path, netfetch stubbed for the forecasts) against
    the gate's own reading, every branch: a stat row with no snap row (his last snap share carried), a snap with no
    stat row (a share of 0), a snap row whose PFR id players.csv does not know (no snap share at all), a club's week of
    20 air yards or fewer (no air-yards share), negative air yards (clipped at 0), a row with no player id (in his club's
    totals), a season and club before (both averages run across them, the moved club in today's code), the away side's
    spread (its negative) and a game with no lines (0), implied points under 7 and over 45 (clipped), a roof (calm, no
    request) and games.csv's roof closed at a stadium open to the sky (calm, no request), a forecast in reach from the
    National Weather Service and one abroad from Open-Meteo, each asked at the gate's own address for the stadium's own
    coordinates (Open-Meteo in mph), one failed (calm, said so), one past 6.5 days (calm, no request), a Questionable
    filed (1) and one only last week with this week's practice report and no status (0); then the gate's own wind rule
    judging made-up records of each branch (offline only where the gate is told so), the fit's played games' wind
    (avg_wind_played: a retractable roof open calm too), and the season in play's snap counts due on the gate's rule
    and the build's (snap_gaps) alike"""
    S = 2030
    now = datetime.datetime(S, 10, 16, 12, tzinfo=datetime.timezone.utc)
    kick = now + datetime.timedelta(days=2, hours=5)
    G = {'g1': (f'{S}_06_BBB_AAA', 'BUF00', 'outdoors', kick, -3.5, 44.5), 'g2': (f'{S}_06_DDD_CCC', 'DET00', 'dome', kick, 2.5, 50.0),
         'g3': (f'{S}_06_FFF_EEE', 'PIT00', 'outdoors', kick, 1.0, 41.0), 'g4': (f'{S}_06_HHH_GGG', 'LON02', np.nan, kick, -6.0, 47.5),
         'g5': (f'{S}_06_JJJ_III', 'CHI98', 'outdoors', now + datetime.timedelta(days=8), np.nan, np.nan),
         'g6': (f'{S}_06_LLL_KKK', 'NOR00', 'dome', kick, 14.0, 20.0), 'g7': (f'{S}_06_NNN_MMM', 'MIN01', 'dome', kick, -2.0, 100.0),
         'g8': (f'{S}_06_PPP_OOO', 'BUF00', 'closed', kick, 0.0, 40.0)}
    games = pd.DataFrame([{'game_id': g, 'season': S, 'week': 6, 'stadium_id': sid, 'roof': rf, 'kick': k, 'spread_line': sp,
                           'total_line': tl, 'home_score': np.nan, 'wind': np.nan} for g, sid, rf, k, sp, tl in G.values()])
    rows = []

    def stat(pid, team, w, tgt=0, car=0, att=0, ay=0.0, s=S):
        rows.append({'player_id': pid, 'season': s, 'week': w, 'team': team, 'targets': tgt, 'carries': car, 'attempts': att,
                     'receiving_air_yards': ay})
    for w in range(1, 6):
        stat('a-qb', 'AAA', w, car=3, att=30 + w)
        stat('a-rb', 'AAA', w, tgt=3, car=12 + w, ay=-4.0 if w == 2 else 2.0 if w == 3 else 5.0)
        stat('a-w1', 'AAA', w, tgt=6 + w % 3, ay=5.0 if w == 3 else 40.0 + 5 * w)
        if w in (1, 2, 4):
            stat('a-w2', 'AAA', w, tgt=4, ay=30.0)
        stat('a-w3', 'AAA', w, tgt=3, ay=4.0 if w == 3 else 20.0)
        stat('a-te', 'AAA', w, tgt=4, ay=3.0 if w == 3 else 25.0)
        stat('a-k', 'AAA', w)
        stat('b-qb', 'BBB', w, car=2, att=35)
        stat('b-w1', 'BBB', w, tgt=7, ay=55.0)
    stat('a-lb', 'AAA', 2, tgt=1, ay=6.0)                    # a defender's target: his club's totals count it
    stat(None, 'AAA', 1, tgt=2, ay=9.0)                      # a row with no player id: in his club's totals too
    stat('a-w1', 'CCC', 17, tgt=9, ay=70.0, s=S - 1)         # last season, another club
    stat('c-w9', 'CCC', 17, tgt=3, ay=10.0, s=S - 1)
    stat('x-lv', 'LV', 17, tgt=8, car=20, ay=60.0, s=S - 1)   # b-qb's club last season, in today's code
    stats = pd.DataFrame(rows)
    PFR = {'a-qb': 'Pqb', 'a-rb': 'Prb', 'a-w1': 'Pw1', 'a-w2': 'Pw2', 'a-te': 'Pte', 'a-k': 'Pk', 'b-qb': 'Pbq', 'b-w1': 'Pbw'}
    sn = []
    for w in range(1, 6):
        for pid, pct in (('a-qb', 1.0), ('a-rb', 0.55 + 0.03 * w), ('a-w1', 0.9 - 0.05 * w), ('a-w2', 0.4 + 0.1 * (w % 2)),
                         ('a-te', 0.7), ('b-qb', 0.98), ('b-w1', 0.85), ('a-w3', 0.6)):
            if pid == 'a-w1' and w == 5:
                continue                                        # a stat row and no snap row: his last snap share carried
            sn.append({'season': S, 'week': w, 'team': pid[0].upper() * 3, 'pfr_player_id': PFR.get(pid, 'Unknown-' + pid),
                       'offense_snaps': int(65 * pct), 'offense_pct': pct})
        sn.append({'season': S, 'week': w, 'team': 'AAA', 'pfr_player_id': 'Pk', 'offense_snaps': 0, 'offense_pct': 0.0})   # a kicker: no offensive snap
    sn.append({'season': S - 1, 'week': 17, 'team': 'CCC', 'pfr_player_id': 'Pw1', 'offense_snaps': 50, 'offense_pct': 0.77})
    sn.append({'season': S - 1, 'week': 17, 'team': 'OAK', 'pfr_player_id': 'Pbq', 'offense_snaps': 3, 'offense_pct': 0.05})   # a snap, no stat row, a moved club
    snaps = pd.DataFrame(sn)
    pfr = {v: k for k, v in PFR.items()}
    INJ = pd.DataFrame([{'season': S, 'week': 6, 'gsis_id': 'a-w3', 'report_status': 'Questionable', 'practice_status': 'Limited'},
                        {'season': S, 'week': 5, 'gsis_id': 'b-w1', 'report_status': 'Questionable', 'practice_status': 'Limited'},
                        {'season': S, 'week': 6, 'gsis_id': 'b-w1', 'report_status': None, 'practice_status': 'Did Not Participate'},
                        {'season': S, 'week': 6, 'gsis_id': 'a-w1', 'report_status': None, 'practice_status': 'Full'}])
    parts = {'AAA': [('a-qb', 'QB'), ('a-rb', 'RB'), ('a-w1', 'WR'), ('a-w2', 'WR'), ('a-w3', 'WR'), ('a-te', 'TE'), ('a-k', 'K')],
             'BBB': [('b-qb', 'QB'), ('b-w1', 'WR')]}
    coming = [{'game_id': G['g1'][0], 'team': 'AAA', 'home': 1, 'parts': parts['AAA']}, {'game_id': G['g1'][0], 'team': 'BBB', 'home': 0, 'parts': parts['BBB']}]
    for g, c in (('g2', 'c-qb'), ('g3', 'e-qb'), ('g4', 'g-qb'), ('g5', 'i-qb'), ('g6', 'k-qb'), ('g7', 'm-qb'), ('g8', 'o-qb')):
        coming.append({'game_id': G[g][0], 'team': c[0].upper() * 3, 'home': 1, 'parts': [(c, 'QB')]})
    coming.append({'game_id': G['g6'][0], 'team': 'LLL', 'home': 0, 'parts': [('l-qb', 'QB')]})
    # the forecasts: the National Weather Service answers at Buffalo (18 mph at kickoff), fails at Pittsburgh; Open-Meteo
    # answers in London (9.5 mph); nothing else may be asked
    asked = []
    h = kick.replace(minute=0)
    per = lambda a, b, s_: {'startTime': a.isoformat(), 'endTime': b.isoformat(), 'windSpeed': s_}

    at = lambda tpl, sid: tpl.format(lat=IN_STADIUMS_OWN[sid][0], lon=IN_STADIUMS_OWN[sid][1])
    hourly = 'https://api.weather.gov/gridpoints/BUF/1,1/forecast/hourly'

    def stub(url, dest, **k):
        asked.append((url, k))
        if url == at(IN_NWS_OWN, 'BUF00'):                     # only the gate's own address for each answers
            body = {'properties': {'forecastHourly': hourly}}
        elif url == hourly:
            body = {'properties': {'periods': [per(h - datetime.timedelta(hours=1), h, '40 mph'), per(h, h + datetime.timedelta(hours=1), '12 to 18 mph')]}}
        elif url == at(IN_OM_OWN, 'LON02'):
            body = {'hourly': {'time': [kick.strftime('%Y-%m-%dT%H:00')], 'wind_speed_10m': [9.5]}}
        else:
            raise build.netfetch.FetchError('stubbed: no answer')
        with open(dest, 'w') as f:
            json.dump(body, f)
        return dest
    real = build.netfetch.download
    build.netfetch.download = stub
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            run = build.avg_coming_inputs(coming, games, {'vol': stats, 'snaps': snaps, 'pfr': pfr}, {S: INJ}, now, False)
    finally:
        build.netfetch.download = real
    src = {'stats': stats, 'snaps': snaps, 'pfr': pfr}
    AV = {p: {'in': {k: run[(p, c['game_id'])].get(k) for k in IN_KEYS_OWN}} for c in coming for p, _ in c['parts'] if (p, c['game_id']) in run}
    want = {p: {'game_id': c['game_id'], 'home': c['home'], 'group': g} for c in coming for p, g in c['parts']}
    gm = games.copy()
    own, wbad = in_week_own(AV, want, gm, None, S, now, src=src, inj=INJ)
    bad = list(wbad)
    if sorted(AV) != sorted(want):
        bad.append(f'the run gave inputs for {sorted(AV)}, not every starter {sorted(want)}')
    for p in AV:
        v, t = own[p]
        r = run[(p, want[p]['game_id'])]
        for k in t:
            if abs(r[k] - t[k]) > 1e-9:
                bad.append(f'{p} {k}: the build\'s {r[k]}, the gate\'s {t[k]}')
        bad += in_block_bad(p, AV[p]['in'], v, rnd=1e-9)
    # the branches by hand
    T = lambda p: own[p][1]
    V = lambda p: own[p][0]
    hist = in_hist_own(src, list(want))
    hw = {p: {k: (sn_, sh) for k, sn_, sh in hist.get(p, [])} for p in want}
    facts = [('the away side\'s spread is its negative', V('b-qb')['spread'] == 3.5 and V('b-qb')['implied'] == 44.5 / 2 + 3.5 / 2
              and V('a-qb')['spread'] == -3.5 and abs(T('b-qb')['in:spr'] - 0.5) < 1e-12),
             ('a game with no lines reads imp and spr 0', T('i-qb')['in:imp'] == 0 and T('i-qb')['in:spr'] == 0),
             ('a stat row with no snap row carries his last snap share', V('a-w1')['snap1'] == 0.9 - 0.05 * 4),
             ('his snap share averages over last season\'s other club too', abs(V('a-w1')['snapL'] - in_ewm_own([0.77] + [0.9 - 0.05 * w for w in range(1, 5)], 6)) < 1e-12),
             ('a snap with no stat row is a share of 0', hw['a-w2'][S * 100 + 3][1]['tgt'] == 0 and hw['a-w2'][S * 100 + 5][1]['tgt'] == 0),
             ('a snap row players.csv does not place gives no snap share', not in_ok(V('a-w3')['snap1']) and T('a-w3')['in:snap1r'] == 0 and T('a-w3')['in:snapL'] == 0),
             ('a club\'s week of 20 air yards or fewer gives no air-yards share', not in_ok(hw['a-w1'][S * 100 + 3][1]['ay']) and in_ok(hw['a-w1'][S * 100 + 2][1]['ay'])),
             ('negative air yards are clipped at 0', hw['a-rb'][S * 100 + 2][1]['ay'] == 0),
             ('a defender\'s and an unnamed row count in the club\'s totals', abs(hw['a-w1'][S * 100 + 1][1]['tgt'] - 7 / (7 + 3 + 4 + 3 + 4 + 2)) < 1e-12),
             ('a snap with no stat row at a moved club', hw['b-qb'][(S - 1) * 100 + 17] == (0.05, {'tgt': 0.0, 'car': 0.0, 'ay': 0.0})),
             ('a kicker has no snap share', not in_ok(V('a-k')['snapL'])),
             ('a Questionable filed is 1', T('a-w3')['in:q'] == 1),
             ('one filed only last week, with a practice report and no status this week, is 0', T('b-w1')['in:q'] == 0 and T('a-w1')['in:q'] == 0),
             ('the National Weather Service\'s hour at kickoff, the higher of "12 to 18 mph"', AV['a-qb']['in']['wind'] == 18.0
              and AV['a-qb']['in']['wind_src'] == 'nws' and abs(T('a-qb')['in:wind'] - 0.8) < 1e-12),
             ('under a roof calm', AV['c-qb']['in']['wind'] == 0.0 and AV['c-qb']['in']['wind_src'] == 'roof' and T('c-qb')['in:wind'] == 0),
             ('a failed forecast calm, said so', AV['e-qb']['in']['wind'] is None and str(AV['e-qb']['in']['wind_src']).startswith('forecast failed') and T('e-qb')['in:wind'] == 0),
             ('abroad, Open-Meteo\'s hour', AV['g-qb']['in']['wind'] == 9.5 and AV['g-qb']['in']['wind_src'] == 'open-meteo'),
             ('past 6.5 days calm', AV['i-qb']['in']['wind'] is None and AV['i-qb']['in']['wind_src'] == 'beyond the forecast'),
             ('implied points under 7 clipped at 7, over 45 at 45, and a side between them read as it is',
              abs(T('l-qb')['in:imp'] - math.log(7 / 22.5)) < 1e-12 and abs(T('m-qb')['in:imp'] - math.log(45 / 22.5)) < 1e-12
              and abs(T('k-qb')['in:imp'] - math.log(17 / 22.5)) < 1e-12 and abs(T('l-qb')['in:spr'] + 2.0) < 1e-12),
             ('games.csv\'s roof closed at a stadium open to the sky: calm, no request', AV['o-qb']['in']['wind'] == 0.0 and AV['o-qb']['in']['wind_src'] == 'roof'),
             ('each request at the gate\'s own address for its stadium\'s coordinates (Open-Meteo in mph), and no other',
              sorted(u for u, _ in asked) == sorted([at(IN_NWS_OWN, 'BUF00'), hourly, at(IN_NWS_OWN, 'PIT00'), at(IN_OM_OWN, 'LON02')])),
             ('no request for the roof or the far game, one try each', not any('41.86' in u or '42.34' in u for u, _ in asked)
              and len(asked) == 4 and all(k.get('waits') == () for _, k in asked))]
    bad += [f'{w}: not so' for w, ok in facts if not ok]
    chk(not bad, f'AVERAGES: the inputs on a made-up world against the gate\'s own reading: {"; ".join(bad[:4])}{" ..." if len(bad) > 4 else ""} ({len(bad)})')
    # the gate's wind rule on made-up records: each branch's right record passes and each wrong one is refused
    g = lambda sid, roof, days, **k: dict({'stadium_id': sid, 'roof': roof, 'kick': now + datetime.timedelta(days=days), 'home_score': np.nan, 'wind': np.nan}, **k)
    recs = [(g('DET00', 'dome', 2), 0.0, 'roof', True), (g('DET00', 'dome', 2), 8.0, 'nws', False), (g('IND00', np.nan, 2), None, 'offline', False),
            (g('IND00', np.nan, 2), None, 'offline', False, True),
            (g('BUF00', 'outdoors', 8), None, 'beyond the forecast', True), (g('BUF00', 'outdoors', 8), 11.0, 'nws', False),
            (g('BUF00', 'outdoors', 8), None, 'offline', False), (g('BUF00', 'outdoors', 8), None, 'offline', True, True),
            (g('BUF00', 'outdoors', 2), None, 'offline', False), (g('BUF00', 'outdoors', 2), None, 'offline', True, True),
            (g('BUF00', 'outdoors', 2), 12.0, 'nws', True),
            (g('BUF00', 'outdoors', 2), 12.0, 'open-meteo', False), (g('BUF00', 'outdoors', 2), None, 'forecast failed: HTTP 500', True),
            (g('BUF00', 'outdoors', 2), None, 'forecast skipped: the step ran past 90 s', True), (g('BUF00', 'outdoors', 2), None, 'roof', False),
            (g('BUF00', 'outdoors', 2), -3.0, 'nws', False), (g('BUF00', 'outdoors', 2), None, 'nws', False), (g('BUF00', 'outdoors', 2), 0.0, 'roof', False),
            (g('BUF00', 'outdoors', 2), None, 'beyond the forecast', False), (g('LON02', 'outdoors', 2), 9.0, 'open-meteo', True),
            (g('LON02', 'outdoors', 2), 9.0, 'nws', False), (g('BUF00', 'outdoors', 6.5, ), None, 'beyond the forecast', True),
            (g('BUF00', 'outdoors', 6.5), 7.0, 'nws', True)]
    wrong = [(r['stadium_id'], r['roof'], w, s_, off) for r, w, s_, ok, *off in recs
             if (in_wind_own(r, now, w, s_, offline=bool(off and off[0]))[1] is None) != ok]
    played = pd.DataFrame([{'game_id': 'p1', 'roof': 'closed', 'wind': 14.0}, {'game_id': 'p2', 'roof': 'outdoors', 'wind': 21.0},
                           {'game_id': 'p3', 'roof': 'outdoors', 'wind': np.nan}, {'game_id': 'p4', 'roof': 'dome', 'wind': np.nan},
                           {'game_id': 'p5', 'roof': 'open', 'wind': 18.0}])
    bw = build.avg_wind_played(played)
    for r in played.itertuples(index=False):
        o = in_wind_own({'roof': r.roof, 'wind': r.wind, 'home_score': 21.0, 'stadium_id': 'BUF00'}, now)[0]
        if not ((o is None and not in_ok(bw[r.game_id])) or (o is not None and bw[r.game_id] == o)):
            wrong.append(('played', r.game_id, bw[r.game_id], o))
    if bw.get('p5') != 0.0:
        wrong.append(('played under a retractable roof open', bw.get('p5')))
    chk(not wrong, f'AVERAGES: the gate\'s wind rule judges these made-up records the wrong way, or the fit\'s played wind is not its: {wrong[:4]}')
    # the season in play's snap counts due: week 1 final five days before the build (due), week 2 two days before (not
    # yet), a playoff game five days before (never held), a club in last season's code; the gate's rule and the build's
    # (snap_gaps, which load() refuses on) on each copy
    k5, k2 = now - datetime.timedelta(days=5), now - datetime.timedelta(days=2)
    et = lambda k: k.astimezone(build.ET)
    sg = pd.DataFrame([{'game_id': gid, 'season': S, 'week': wk, 'game_type': gt, 'gameday': et(k).strftime('%Y-%m-%d'),
                        'gametime': et(k).strftime('%H:%M'), 'home_team': hm, 'away_team': aw, 'home_score': hs, 'away_score': 17.0}
                       for gid, wk, gt, k, hm, aw, hs in (('w1a', 1, 'REG', k5, 'AAA', 'BBB', 20.0), ('w1b', 1, 'REG', k5, 'LV', 'CCC', 24.0),
                                                          ('w2a', 2, 'REG', k2, 'AAA', 'CCC', 10.0), ('wc', 19, 'WC', k5, 'DDD', 'EEE', 31.0),
                                                          ('w2b', 2, 'REG', k5, 'BBB', 'DDD', np.nan))])
    full = pd.DataFrame([{'season': S, 'week': 1, 'team': t} for t in ('AAA', 'BBB', 'OAK', 'CCC')])
    cases = [('every due game carried, a club in last season\'s code', full, now, True),
             ('a club of a due game missing', full[full.team != 'OAK'], now, False),
             ('a week not yet due missing, a playoff game and one with no score never held', full, now, True),
             ('the file not had once due', None, now, False),
             ('the file not had before the first game is due', None, k5 + datetime.timedelta(hours=IN_SNAP_DUE_OWN - 1), True),
             ('last season\'s rows only', full.assign(season=S - 1), now, False)]
    sw = []
    for w, sn_, t_, ok in cases:
        o_ = in_snaps_due_bad(sg, sn_, S, t_)
        b_ = build.snap_gaps(sg, sn_, S, t_) if sn_ is not None else (['not had'] if t_ >= k5 + datetime.timedelta(hours=build.SNAP_DUE) else [])
        if (not o_) != ok or (not b_) != ok:
            sw.append(f'{w}: the gate {o_}, the build {b_}')
    chk(not sw, f'AVERAGES: the season in play\'s snap counts due, on made-up games: {"; ".join(sw[:3])}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(HERE, 'data'))
    ap.add_argument('--cache', default=os.path.join(HERE, 'cache'))
    ap.add_argument('--history', default=os.path.join(HERE, 'history'))
    ap.add_argument('--prev', help='the previously published players.json (default: the last commit\'s)')
    ap.add_argument('--joker-state', default=build.JOKER_STATE, help='the betting state the Joker\'s calls are read from')
    ap.add_argument('--offline', action='store_true',
                    help='the files come from an offline build (by hand): a forecast in reach recorded calm, "offline", passes')
    a = ap.parse_args()
    OFFLINE['on'] = a.offline

    unit_checks()
    unit_team_checks()
    power_fixture_checks()
    avg_fixture_checks()
    draft_fixture_checks()
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
    jb = M.get('joker_base') or {}
    chk(all(jb.get(k) == v for k, v in build.JOKER_BASE.items()), 'JOKER: model.json does not carry the build\'s JOKER_BASE')
    chk(build.JOKER_BASE['beta'] == JOKER_BETA_OWN and build.JOKER_BETA_WAS == JOKER_BETA_WAS_OWN,
        f'JOKER: the build calls on BETA {build.JOKER_BASE["beta"]} and reads a call that carries none on {build.JOKER_BETA_WAS}, '
        f'the gate\'s {JOKER_BETA_OWN} and {JOKER_BETA_WAS_OWN}')
    sigm = lambda z: 1 / (1 + math.exp(-z))
    own = lambda pj, m, b=JOKER_BETA_OWN: sigm(math.log(min(0.99, max(0.01, pj)) / (1 - min(0.99, max(0.01, pj)))) + b * m)
    # a frozen call is read back on the BETA it was made at: its own `beta`, or the one before calls carried theirs
    beta_of = lambda e: e.get('beta', JOKER_BETA_WAS_OWN)
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
        elif c.get('beta') != JOKER_BETA_OWN:
            bad.append(f'{gid}: called afresh on BETA {c.get("beta")}, not {JOKER_BETA_OWN}')
        elif abs(own(pj, c['m']) - c['p_home']) > 2e-4:
            bad.append(f'{gid}: {c["p_home"]} is not the Joker\'s {pj} moved by the matchup {c["m"]} ({own(pj, c["m"]):.4f})')
        if c['pick'] != side[gid][0 if c['p_home'] >= 0.5 else 1]:
            bad.append(f'{gid}: picks {c["pick"]} on a home chance of {c["p_home"]}')
    for gid, e in ((L or {}).get('calls') or {}).items():
        if e.get('base') == 'joker' and beta_of(e) not in (JOKER_BETA_OWN, JOKER_BETA_WAS_OWN):
            bad.append(f'the ledger\'s {gid} is on the Joker at a BETA the build never carried: {beta_of(e)}')
        elif e.get('base') == 'joker' and (not all(isinstance(e.get(k), (int, float)) for k in ('p_joker', 'p_elo', 'm'))
                                           or abs(own(e['p_joker'], e['m'], beta_of(e)) - e['p_home']) > 2e-4):
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
            elif fx['p_joker'] == e.get('p_joker') or abs(own(fx['p_joker'], e['m'], beta_of(fx)) - fx['p_home']) > 2e-4:
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
    # the season in play's snap counts (THE INPUTS), due on the gate's own rule: nflverse's newest schedule's
    newest = int(games.season.max())
    sp_ = os.path.join(a.cache, f'snap_counts_{newest}.csv')
    sn_ = pd.read_csv(sp_, usecols=['season', 'week', 'team'], low_memory=False) if os.path.exists(sp_) else None
    sb = in_snaps_due_bad(games, sn_, newest, built)
    chk(not sb, f'AVERAGES: {"; ".join(sb)}: every snap share would stand a game behind, or on nothing')

    # ---- DRAFT: every player's first career rating, the draft start's on the gate's own reading ----
    dslots, dfirst = draft_checks(P, games, a.cache, season, roster_path)

    # ---- LINEUPS: every coming call's matchup from the expected lineups, an unrated starter on his draft start ----
    lineup_checks(M, MU, P, games, dslots, dfirst)

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
            # and its chance and the BETA it stands on: a frozen call is never made again on a BETA refitted since
            if (cur is None or cur['pick'] != e['pick'] or cur.get('src') != e.get('src') or cur.get('was') != e.get('was')
                    or cur.get('joker_fix') != e.get('joker_fix') or cur.get('p_home') != e.get('p_home')
                    or cur.get('beta') != e.get('beta')):
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
