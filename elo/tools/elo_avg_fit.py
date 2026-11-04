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

THE INPUTS (the diagnosis's items 4, 5 and 6, research of 3-4 November 2026, verified by a second reading and
corrected; the owner's "Merge the inputs" of 4 November 2026, told that the Elo part would then be trusted on 5 legs
where it had been on 11), elo/build.py's avg_history and avg_inputs_rows, which this tool and the build share, so a
coming game's inputs are worked out by the code the fit read: volume (snap: his offensive snap share in his previous
appearance over his usual, half-life 6 appearances, and his usual less 0.7; share: his share of the club's targets or
carries, half-lives 6 and 1.5 appearances, and a receiver's air-yards share on his yards), the game (imp: the club's
implied points, log of total / 2 + its spread / 2 over 22.5; spr: its spread / 7; wind: games.csv's wind over 10 mph /
10, any roof calm) and q (his filed Questionable on the game's report), none an Elo term (each in the no-Elo twin too).
Each leg's groups (SPEC's `inputs`) were chosen in a nested walk-forward: every subset of the leg's candidate groups
added to its frozen spec and walked forward 2017-2025; each season 2018-2025 projected by the subset the procedure took
on the walk-forward seasons before it (the lowest RMSE, then each group kept only where dropping it loses in at least
75% of those seasons and pooled); a leg takes inputs only where that nested record beat today's spec in at least 6 of
the 8 seasons with the pooled 90% interval below zero (13 legs; the other 9 are as they were), and its groups are the
procedure's on 2018-2025. The volume freed by teammates listed Out or Doubtful was a candidate and is refuted (with it
on offer the nested record is worse on a back's rushing yards, +0.079 [+0.005, +0.153], and better in at most 3 of 8
seasons on any leg), so nothing reads it. Wind was then kept only where it survived a forecast's error (the walk-forward
again with the wind read with a game-level error of sd 5 mph: at least 6 of 8 seasons better than without it): a
quarterback's passing yards alone (his passing TDs 5 of 8). The share terms are centred on each position's median log
share over 2013-2015, seasons never fitted on (ELO_AVG['inputs']). Nested records 2018-2025, RMSE pooled [90% two-way
cluster interval], seasons better of 8, measured on the ratings before the draft start: QB passing yards -0.872 [-1.218,
-0.526] 8/8, passing TDs -0.0111 8/8, completions -0.0496 8/8, attempts -0.0486 8/8; RB rushing yards -0.426 [-0.609,
-0.243] 8/8, rush + rec yards -0.477 7/8, any TD -0.0031 7/8; WR receptions -0.0467 8/8, receiving yards -0.545 [-0.656,
-0.434] 8/8, any TD -0.0024 8/8; TE receptions -0.0694 8/8, receiving yards -0.652 8/8; K points -0.0248 7/8: 0.4-3.3%
of RMSE, three to ten times what the whole Elo part adds. Beyond volume and the game the Elo part of six legs no longer
beats its twin on the nested rule (a receiver's catches, yards and touchdowns, a tight end's catches and yards, a
kicker's points: a tight end's yards fail its nested half, -0.0506 [-0.1054, +0.0042]), so SPEC's `trusted` holds five
(a quarterback's interceptions, a back's rushing yards, carries and rush + rec yards, a tight end's touchdowns). The
refit that carried these into ELO_AVG (4 November 2026) is on completed seasons alone, 2016-2025, mid-season at the
owner's request, never on 2026; every choice above is the research's, frozen before it.

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

THE MISMATCH SCORE (3 November 2026, the owner's "do all" to the Elo diagnosis's list: its items 1, 2 and 7). The
Props tab's Mismatches ranked his career Elo's z among the week's starters less the z of the matchup formula's
player-Elo unit he faces (the secondary, line, linebackers), graded Solid, Big and Huge at 1, 2 and 3. On every
expected starter's game of 2018-2025 (each season on this tool's walk-forward, the frozen spec fitted on 2016 to the
season before; measured on the ratings before the draft start) the player half alone ranked the realised gain over
the no-Elo twin, (y - P0) / sd, better than the whole score in 7 of 8 seasons, the defence half next to nothing, and
the averages' own Elo part, z = (P - P0) / sd, better than either: chosen on 2018-2021 (Spearman over the RB, WR and
TE lead legs pooled, rushing yards and receiving yards, 0.150 [0.128, 0.171] against 0.091 for the old score, n
8,875), confirmed once on 2022-2025 (0.180 [0.156, 0.200] against 0.104, n 9,695; 90% intervals resampling players
whole), ahead of the old score in all 8 seasons pooled: a receiver's and a tight end's alone in 8 of 8, a back's alone
in 6 of 8 (2018 -0.008, 2020 -0.020). Against his own average, (y - avg) / sd, the new score is level with the old
score's player half (4 of 8 seasons), so a Mismatch mostly says his Elo rates him above his own average, the defence
moving him about 3-9% either way. A quarterback's passing yards are left out (their Elo part is not trusted, and on
the walk-forward it ranked the gain weakly: 0.020 [-0.014, 0.061] confirmed), so the Mismatches are a back's rushing
yards and a receiver's or tight end's receiving yards, each kept only where SPEC trusts that leg's Elo part
(`lead`). A row's size is the Elo part in the stat's units and as the chance shift of an even (50%) line, Phi(z) -
0.5, the page's own reading of z (muP at a fair 50%; at a line set at his no-Elo projection the over lands 41-46%),
which landed in full on the walk-forward (slopes of the over-rate on it 0.91, 1.05 and 1.27). Grade words: on those
ratings no ladder of two or three thresholds chosen on 2018-2021 kept each grade above the one below in every season
(two 7 of 8, three 3 of 8; on the draft start's, two 8 of 8 and three 6 of 8, which `ladders` records), so there is one
tag, at the single threshold chosen on 2018-2021 (the largest smallest gap between the rows over it and the listed
rows under it, 25 or more rows a cell), kept only where its rows beat the listed rows under it in every season of the
record (`gap` > 0 in each), else none (`tag` null: the rows are ranked, none tagged): ELO_AVG's `mismatch`, {lead,
tag, chosen, chosen_on, record, ladders}, the record and ladders on the rows of the legs in `lead` alone. Since THE
INPUTS (4 November 2026) SPEC trusts a back's rushing yards alone of the three, so `lead` is that leg and the
Mismatches are backs; on its rows the threshold chosen is again 3.5 points and held in all 8 seasons (gaps +0.020 to
+0.237 sd; the research, on its own spec and the ratings before the draft start, had expected none to hold).

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
  6. the mismatch score's tag and record from the lead legs' walk-forward rows (THE MISMATCH SCORE);
  7. the constants as the build should carry them (ELO_AVG), and whether it does.
"""
import argparse, bisect, math, os, sys, tempfile, types

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build  # noqa: E402

SNAP_URL = 'https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_{y}.csv'
PLAYERS_URL = 'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv'
INPUT_CENTER_LAST = 2015               # the share terms' centres: each position's median over seasons never fitted on
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
MM_LEAD = {'RB': 'rushing_yards', 'WR': 'receiving_yards', 'TE': 'receiving_yards'}   # the Mismatches' legs, each kept
#                                      only where SPEC trusts it (mm_lead_used); never a quarterback's or a kicker's
MM_CHOOSE = (2018, 2021)               # the seasons the tag is chosen on; the record runs REC_FIRST to the last
MM_GRID = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12]   # candidate thresholds, points of chance shift
MM_MIN = 25                            # rows a grade a season, at least, for a threshold to be chosen

# Each leg's frozen choice. avg: (h, k, c); tables, scale; player: R (career), RS (season) or None (no player term);
# weight: a free weight on log(average); variant: c, crk or d (above); trusted: its Elo part, by the nested
# walk-forward 2019-2025 (frozen variant / fully nested procedure: the RMSE difference full less no-Elo and the sign
# right on its largest fifth; both must pass). Variant by RMSE 2018-2025 on the frozen spec, c / d (/ crk). inputs: THE
# INPUTS' groups the leg reads (build.avg_in_groups names their terms), none where the nested record kept none; trusted
# is worked again on the spec with its inputs (above).
SPEC = {
    # c 77.591 d 77.310; Elo part level (-0.006 [-0.171, +0.159], 53.5%); inputs imp+spr+wind -0.872 [-1.218, -0.526] 8/8
    'QB|passing_yards': {'kind': 'yards', 'avg': (20, 1, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'inputs': ['imp', 'spr', 'wind'], 'trusted': False},
    # c 1.1365 d 1.1337; level (-0.0026 [-0.0059, +0.0007], 52.6%); inputs imp (no wind) -0.0111 [-0.0149, -0.0073] 8/8
    'QB|passing_tds': {'kind': 'count', 'avg': (6, 2, 1.0), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'inputs': ['imp'], 'trusted': False},
    # c 6.2980 d 6.2809; level on the frozen variant (+0.0000 [-0.0135, +0.0136], 54.3%; the nested procedure better); inputs imp+spr -0.0496 [-0.0807, -0.0186] 8/8
    'QB|completions': {'kind': 'count', 'avg': (20, 4, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': False, 'variant': 'd', 'inputs': ['imp', 'spr'], 'trusted': False},
    # c 8.9521 d 8.9438; level (+0.0084 [-0.0049, +0.0217], 49.6%); inputs imp+spr -0.0486 [-0.0777, -0.0195] 8/8
    'QB|attempts': {'kind': 'count', 'avg': (8, 8, 1.0), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'inputs': ['imp', 'spr'], 'trusted': False},
    # c 0.8598 d 0.8616; better (-0.0013 [-0.0022, -0.0005], 53.1%)
    'QB|passing_interceptions': {'kind': 'count', 'avg': (None, 8, 1.0), 'tables': ['pass_def'], 'scale': 'shown', 'player': None, 'weight': True, 'variant': 'c', 'trusted': True},
    # c 16.387 d 16.480; level (-0.013 [-0.079, +0.053], 49.3%)
    'QB|rushing_yards': {'kind': 'yards', 'avg': (40, 1, 0.5), 'tables': ['run_def'], 'scale': 'raw', 'player': 'R', 'weight': False, 'variant': 'c', 'trusted': False},
    # c 2.3012 d 2.3096; level (-0.0017 [-0.0062, +0.0029], 50.5%)
    'QB|carries': {'kind': 'count', 'avg': (12, 1, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': 'R', 'weight': False, 'variant': 'c', 'trusted': False},
    # c 0.4294 d 0.4302; worse (+0.0012 [+0.0003, +0.0021], 48.7%)
    'QB|any_td': {'kind': 'td', 'avg': (20, 8, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': None, 'weight': False, 'variant': 'c', 'trusted': False},
    # c 36.176 d 36.160; better (-0.145 [-0.278, -0.012], 57.9%); inputs snap+share(carries)+spr -0.426 [-0.609, -0.243] 8/8, still trusted
    'RB|rushing_yards': {'kind': 'yards', 'avg': (3, 0, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'd', 'inputs': ['snap', 'share', 'spr'], 'trusted': True},
    # c 5.6773 d 5.6755; better (-0.064 [-0.087, -0.041], 60.9%)
    'RB|carries': {'kind': 'count', 'avg': (2, 0, 1.0), 'tables': ['run_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'd', 'trusted': True},
    # c 1.8876 d 1.8820; level (+0.0004 [-0.0051, +0.0059], 53.7%)
    'RB|receptions': {'kind': 'count', 'avg': (6, 2, 1.0), 'tables': ['pass_def'], 'scale': 'shown', 'player': 'RS', 'weight': False, 'variant': 'd', 'trusted': False},
    # c 19.045 d 19.058; level (-0.032 [-0.100, +0.035], 57.3%)
    'RB|receiving_yards': {'kind': 'yards', 'avg': (40, 2, 0.5), 'tables': ['pass_def'], 'scale': 'shown', 'player': 'R', 'weight': False, 'variant': 'c', 'trusted': False},
    # c 41.358 d 41.361; better (-0.487 [-0.685, -0.289], 60.2%); inputs snap -0.477 [-0.742, -0.211] 7/8, still trusted
    'RB|scrim_yards': {'kind': 'yards', 'avg': (3, 0, 1.0), 'tables': ['run_def', 'pass_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'c', 'inputs': ['snap'], 'trusted': True},
    # c 0.7550 d 0.7536; level on the frozen variant (-0.0027 [-0.0058, +0.0005], 57.2%; the nested procedure better); inputs snap+imp -0.0031 [-0.0052, -0.0009] 7/8
    'RB|any_td': {'kind': 'td', 'avg': (4, 4, 1.0), 'tables': ['def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'd', 'inputs': ['snap', 'imp'], 'trusted': False},
    # c 2.3022 d 2.2814 crk 2.2796; better (-0.020 [-0.028, -0.013], 60.8%); inputs snap+share+imp+spr+q -0.0467 [-0.0560, -0.0375] 8/8, its Elo part no longer trusted
    'WR|receptions': {'kind': 'count', 'avg': (12, 0, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'crk', 'inputs': ['snap', 'share', 'imp', 'spr', 'q'], 'trusted': False},
    # c 35.292 d 35.011 crk 35.000; better (-0.257 [-0.373, -0.141], 59.1%); inputs share+imp+spr+q -0.545 [-0.656, -0.434] 8/8, no longer trusted
    'WR|receiving_yards': {'kind': 'yards', 'avg': (20, 0, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'crk', 'inputs': ['share', 'imp', 'spr', 'q'], 'trusted': False},
    # c 0.5411 d 0.5409; better (-0.0058 [-0.0073, -0.0043], 64.3%); inputs snap+share+imp+spr -0.0024 [-0.0032, -0.0017] 8/8, no longer trusted
    'WR|any_td': {'kind': 'td', 'avg': (6, 0, 0.5), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'd', 'inputs': ['snap', 'share', 'imp', 'spr'], 'trusted': False},
    # c 2.1287 d 2.1333 (crk 2.1284: a tight end is c, above); better (-0.049 [-0.069, -0.030], 67.9%); inputs snap+share -0.0694 [-0.0873, -0.0516] 8/8, no longer trusted
    'TE|receptions': {'kind': 'count', 'avg': (8, 0, 0.5), 'tables': ['pass_def'], 'scale': 'shown', 'player': 'R', 'weight': True, 'variant': 'c', 'inputs': ['snap', 'share'], 'trusted': False},
    # c 26.997 d 27.054 (crk 26.997: a tight end is c, above); better (-0.476 [-0.623, -0.329], 63.8%); inputs snap+share -0.652 [-0.821, -0.482] 8/8, its nested trust half fails (-0.0506 [-0.1054, +0.0042])
    'TE|receiving_yards': {'kind': 'yards', 'avg': (6, 0, 1.0), 'tables': ['pass_def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'c', 'inputs': ['snap', 'share'], 'trusted': False},
    # c 0.5094 d 0.5100; better (-0.0057 [-0.0077, -0.0037], 62.0%)
    'TE|any_td': {'kind': 'td', 'avg': (3, 0, 1.0), 'tables': ['def'], 'scale': 'raw', 'player': 'R', 'weight': True, 'variant': 'c', 'trusted': True},
    # c 1.2003 d 1.2019; level (+0.0000 [-0.0014, +0.0014], 52.7%)
    'K|fg_made': {'kind': 'count', 'avg': (12, 0, 0.5), 'tables': ['def'], 'scale': 'shown', 'player': 'RS', 'weight': True, 'variant': 'c', 'trusted': False},
    # c 3.6202 d 3.6174; better (-0.0066 [-0.0130, -0.0002], 53.9%; the nested procedure 56.8%); inputs spr -0.0248 [-0.0373, -0.0123] 7/8, no longer trusted
    'K|kick_pts': {'kind': 'yards', 'avg': (None, 2, 0.5), 'tables': ['def'], 'scale': 'shown', 'player': None, 'weight': True, 'variant': 'd', 'inputs': ['spr'], 'trusted': False},
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


def add_inputs(frame, games_csv, last, offline, center=None):
    """THE INPUTS on every row of the frame, by elo/build.py's own avg_history and avg_inputs_rows: every player's
    volume rows (the weekly stats of every player, 2012 on), PFR's snap counts (2013 on) placed by nflverse's players
    file, the injury reports' statuses, games.csv's lines and wind (avg_wind_played). Returns the frame with each term
    (in:...) and the share terms' centres, {group: {'tgt', 'car', 'ay'}}, each position's median log share over the
    seasons to INPUT_CENTER_LAST (or the centres handed in: elo/test_parity.py's, which compares the paths on them)."""
    cols = ['player_id', 'season', 'week', 'team'] + list(build.AVG_VOL.values())
    vol = pd.concat([pd.read_csv(build.fetch(build.STATS_URL.format(y=y), os.path.join(build.CACHE, f'stats_player_week_{y}.csv'), offline),
                                 usecols=cols, low_memory=False) for y in range(build.FIRST, last + 1)], ignore_index=True)
    snaps = pd.concat([pd.read_csv(build.fetch(SNAP_URL.format(y=y), os.path.join(build.CACHE, f'snap_counts_{y}.csv'), offline),
                                   usecols=['season', 'week', 'team', 'pfr_player_id', 'offense_snaps', 'offense_pct'])
                       for y in range(build.SNAP_FIRST, last + 1)], ignore_index=True)
    pl = pd.read_csv(os.path.join(build.CACHE, 'players.csv'), usecols=['gsis_id', 'pfr_id'])
    pfr = {p: g for g, p in zip(pl.gsis_id, pl.pfr_id) if isinstance(p, str) and isinstance(g, str)}
    injuries = {y: pd.read_csv(build.fetch(build.INJ_URL.format(y=y), os.path.join(build.CACHE, f'injuries_{y}.csv'), offline),
                               usecols=['season', 'week', 'team', 'gsis_id', 'report_status']) for y in range(build.FIRST, last + 1)}
    g = games_csv[games_csv.season <= last].copy()
    # nothing of a later season is read (the season in play is never fitted on)
    for what, s_ in (('the player stats', vol.season), ('the snap counts', snaps.season), ('the frame', frame.season),
                     ('the schedule', g.season), *((f'injuries_{y}', d.season) for y, d in injuries.items())):
        if len(s_) and int(s_.max()) > last:
            raise SystemExit(f'elo_avg_fit: {what} reach {int(s_.max())}, past the last completed season {last}')
    H, by = build.avg_history(vol, snaps, pfr)
    status = build.avg_injury_status(injuries)
    for c in ('home_team', 'away_team'):
        g[c] = g[c].replace(build.TEAM_NOW)
    gi = g.set_index('game_id')
    wind = build.avg_wind_played(g)
    rows = pd.DataFrame({'pid': frame.pid.values, 'season': frame.season.values, 'week': frame.week.values,
                         'team': frame.team.values, 'group': frame.group.values, 'home': frame.home.values,
                         'spread_line': gi.spread_line.reindex(frame.game_id).values, 'total_line': gi.total_line.reindex(frame.game_id).values,
                         'wind': [wind.get(x, np.nan) for x in frame.game_id]}, index=frame.index)
    if center is None:
        X = build.avg_inputs_rows(rows, H, by, status, {})
        early = (frame.season <= INPUT_CENTER_LAST).values
        center = {}
        for grp in TOP:
            m = early & (frame.group == grp).values
            center[grp] = {v: round(float(np.median(X.loc[m & ~np.isnan(X[f'sh_{v}L'].values), f'in:shL_{v}'])), 6) for v in ('tgt', 'car', 'ay')}
    X = build.avg_inputs_rows(rows, H, by, status, center)
    f = frame.copy()
    for c in X.columns:
        if c.startswith('in:'):
            f[c] = X[c].values
    return f, center


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
    G = build.avg_in_groups(spec['_pos'], spec['_col'])
    extra = extra + [x for g in spec.get('inputs', []) for x in G[g]]       # THE INPUTS: none an Elo term, so in the twin too
    full = t + extra
    return full, [x for x in full if not x.startswith(ELO_TERMS)]


class Leg:
    def __init__(self, frame, key, last):
        pos, col = key.split('|')
        sp = dict(SPEC[key], _pos=pos, _col=col, _rk=pos == 'WR' and col in ('receptions', 'receiving_yards'))     # a TE's: c, above
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
        if t.startswith('in:'):
            return self.d[t].values.astype(float), PEN
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
    P, P0, Z, SDv = (np.full(len(L.d), np.nan) for _ in range(4))
    wa = wb = None
    for s in range(REC_FIRST, last + 1):
        rows = np.where(L.fitm & (L.seas < s))[0]
        wa, ma = L.fit(L.terms, rows, wa)
        wb, mb = L.fit(L.terms0, rows, wb)
        te = L.score & (L.seas == s)
        P[te], P0[te] = ma[te], mb[te]
        SDv[te] = sd_of(spread(L.kind, L.y[rows], ma[rows]), ma[te])
        Z[te] = (ma[te] - mb[te]) / SDv[te]
    sc = np.where(L.score)[0]
    y, e, res, z = L.y[sc], P[sc] - P0[sc], L.y[sc] - P0[sc], Z[sc]
    top = np.abs(z) >= np.percentile(np.abs(z), 80)
    rnd = lambda v, n=6: [round(float(x), n) for x in v]
    sp_ = L.spec
    out = {'kind': L.kind, 'avg': [sp_['avg'][0], sp_['avg'][1], sp_['avg'][2]], 'eps': float(f'{L.eps:.6g}'),
           'tables': list(sp_['tables']), 'scale': sp_['scale'], 'player': sp_['player'], 'variant': sp_['variant'],
           'terms': L.terms, 'coef': rnd(w), 'no_elo': {'terms': L.terms0, 'coef': rnd(w0)}}
    if sp_.get('inputs'):
        out['inputs'] = list(sp_['inputs'])
        it = [t for t in L.terms if t.startswith('in:')]
        Xi, _ = L.design(it)
        out['in_mean'] = {t: round(float(Xi[tr, i].mean()), 6) for i, t in enumerate(it)}     # the typical starter's inputs
    if 'log_allowed' in L.terms:
        out['allowed_mean'] = round(L.allowed_mean, 6)
    out['spread'] = sp
    out['trusted'] = bool(sp_['trusted'])
    out['record'] = {'games': int(len(sc)), 'rmse': round(float(np.sqrt(np.mean((y - P[sc]) ** 2))), 4),
                     'rmse_no_elo': round(float(np.sqrt(np.mean(res ** 2))), 4),
                     'right_top': round(float(np.mean(np.sign(e[top]) == np.sign(res[top]))), 4)}
    info = {'rows': int(len(tr)), 'zeros': int(L.d.zero.values[tr].sum()), 'mean_y': float(L.y[tr].mean()),
            'mean_mu': float(mu[tr].mean()), 'mean_avg': float(np.nanmean(L.avg[tr])),
            # the walk-forward rows the mismatch score is tested on: the Elo part and the realised gain, each in sd at P
            'wf': pd.DataFrame({'season': L.seas[sc], 'z': z, 'gz': res / SDv[sc]})}
    return out, info


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def mm_lead_used():
    """the Mismatches' legs: MM_LEAD's, each only where SPEC trusts that leg's Elo part in this same fit"""
    return {p: c for p, c in MM_LEAD.items() if SPEC[f'{p}|{c}']['trusted']}


def mismatch_block(wf, last):
    """THE MISMATCH SCORE from the lead legs' walk-forward rows ({leg: DataFrame(season, z, gz)}, gz the realised gain
    over the no-Elo twin in sd), on the legs mm_lead_used keeps alone: the threshold chosen on MM_CHOOSE (a chance
    shift, phi(z) - 0.5), its record each season, the tag (that threshold where its gap is above 0 in every season of
    the record, else None) and the best ladders of two and three thresholds chosen the same way, with how many seasons
    each kept in order"""
    lead = mm_lead_used()
    seasons = list(range(REC_FIRST, last + 1))
    empty = {'lead': lead, 'tag': None, 'chosen': None, 'chosen_on': f'{MM_CHOOSE[0]}-{MM_CHOOSE[1]}', 'record': {}, 'ladders': {}}
    wf = {k: w for k, w in wf.items() if lead.get(k.split('|')[0]) == k.split('|')[1]}
    if not wf:
        return empty
    d = pd.concat([w.assign(leg=k) for k, w in wf.items()], ignore_index=True)
    d = d[np.isfinite(d.z) & np.isfinite(d.gz)]
    d['pts'] = [100 * (phi(z) - 0.5) for z in d.z]
    L = d[d.z > 0]
    pick = [s for s in seasons if MM_CHOOSE[0] <= s <= MM_CHOOSE[1]]

    def gaps(ts, ss, minn):
        g = np.digitize(L.pts.values, ts)
        out = []
        for s in ss:
            m = L.season.values == s
            means = []
            for i in range(len(ts) + 1):
                c = m & (g == i)
                if c.sum() < minn:
                    return None
                means.append(float(L.gz.values[c].mean()))
            out.append([means[i + 1] - means[i] for i in range(len(ts))])
        return np.array(out)

    best = {}
    for nt in (1, 2, 3):
        cand = [(float(G.min()), ts) for ts in __import__('itertools').combinations(MM_GRID, nt)
                for G in [gaps(list(ts), pick, MM_MIN)] if G is not None]
        cand.sort(key=lambda x: (-x[0], x[1]))
        best[nt] = cand[0][1] if cand else None
    if best[1] is None:
        return empty
    t = best[1][0]
    rk = lambda v: pd.Series(v).rank().values
    rec = {}
    gap = lambda a, b: round(float(a.gz.mean() - b.gz.mean()), 4) if len(a) and len(b) else None   # None: a cell empty
    for s in seasons:
        x = d[d.season == s]
        tg, un, no = x[x.pts >= t], x[(x.z > 0) & (x.pts < t)], x[x.pts < t]
        rec[str(s)] = {'rho': round(float(np.corrcoef(rk(x.z.values), rk(x.gz.values))[0, 1]), 4) if len(x) > 1 else None,
                       'tagged': int(len(tg)), 'under': int(len(un)), 'gap': gap(tg, un), 'gap_untagged': gap(tg, no)}
    ladders = {}
    for nt in (2, 3):
        if best[nt] is not None:
            G = gaps(list(best[nt]), seasons, 1)
            ladders[str(nt)] = {'tags': list(best[nt]), 'ordered': None if G is None else int((G > 0).all(axis=1).sum())}
    held = all(r['gap'] is not None and r['gap'] > 0 for r in rec.values())     # every season of the record
    return {'lead': lead, 'tag': round(t / 100, 6) if held else None, 'chosen': round(t / 100, 6),
            'chosen_on': f'{MM_CHOOSE[0]}-{MM_CHOOSE[1]}', 'record': rec, 'ladders': ladders}


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
    games_csv = pd.read_csv(os.path.join(build.CACHE, 'games.csv'), low_memory=False)
    frame, center = add_inputs(frame, games_csv, last, a.offline)
    print('the inputs: snap shares, shares, the lines, the wind and the Questionable tag on every row', flush=True)
    want = {'fit': f'{FIT_FIRST}-{last}', 'record': f'{REC_FIRST}-{last}', 'starters': dict(TOP), 'min_games': MIN_GAMES,
            'regular': REGULAR, 'inputs': {'share_center': center}, 'legs': {}}
    print(f'\n{"leg":26} {"variant":7} {"rows":>6} {"zeros":>5} {"mean":>8} {"proj":>8}   walk-forward {REC_FIRST}-{last}: rmse, no Elo, Elo part right on its top fifth   trusted')
    wf = {}
    for key in SPEC:
        o, info = fit_leg(frame, key, last)
        want['legs'][key] = o
        if key.split('|')[1] == mm_lead_used().get(key.split('|')[0]):
            wf[key] = info['wf']
        r = o['record']
        print(f'{key:26} {o["variant"]:7} {info["rows"]:6d} {info["zeros"]:5d} {info["mean_y"]:8.3f} {info["mean_mu"]:8.3f}   '
              f'{r["rmse"]:9.4f} {r["rmse_no_elo"]:9.4f} {r["right_top"]:6.3f}   {o["trusted"]}', flush=True)
    want['mismatch'] = mm = mismatch_block(wf, last)
    sg = lambda v: 'none' if v is None else f'{v:+.3f}'
    print(f"\nthe mismatch legs: {mm['lead']}; the tag: "
          + (f"{mm['tag'] * 100:g} points of chance shift" if mm['tag'] is not None else
             f"none (the threshold chosen, {mm['chosen'] * 100:g} points, did not hold every season)" if mm['chosen'] is not None
             else 'none (no threshold could be chosen)')
          + f" (chosen on {mm['chosen_on']}); by season "
          + ', '.join(f"{s} rho {sg(r['rho'])} gap {sg(r['gap'])} ({r['tagged']}/{r['under']})" for s, r in mm['record'].items())
          + '; ladders ' + ', '.join(f"{n}: {v['tags']} ordered {v['ordered']}/{len(mm['record'])}" for n, v in mm['ladders'].items()))
    print('\nELO_AVG = {')
    print(''.join(f'    {k!r}: {v!r},\n' for k, v in want.items() if k not in ('legs', 'mismatch')), end='')
    print("    'legs': {")
    for k, v in want['legs'].items():
        print(f'        {k!r}: {v!r},')
    print('    },')
    print(f"    'mismatch': {want['mismatch']!r},\n}}")
    print('  the build carries these constants' if getattr(build, 'ELO_AVG', None) == want
          else '  THE BUILD DIFFERS: paste ELO_AVG above into elo/build.py')


if __name__ == '__main__':
    main()
