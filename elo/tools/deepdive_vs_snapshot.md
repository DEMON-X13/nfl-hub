# The Deep Dive against the Game snapshot

The owner asked (13 October 2026) which is more accurate: the Season Tracker's Deep Dive
(`news/`, built by `news/tools/context.js`) or the Game snapshot on X NFL Bets and Stats (the ELO
build's Overall Offense and Overall Defense and its Starters). They show the same kind of thing for
a game from different code and data. Two tests, run once; neither changes a site.

## 1. The ratings: which predicts an offense's points in its next game

`python3 elo/tools/deepdive_vs_units.py` (output in `out/deepdive_vs_units.txt`). The snapshot's side
is `units_fit.py`'s own harness with nothing carried (as the snapshot was then; with the build's
carry, section 3, it reproduces `UNIT_WF`). The Deep Dive's is
`context.js` `ratings()` replayed in Python going into every game: the season's weeks before, plus
last season's at four games, QB runs out. Checked against the tracker's published week 6 file:
every unit of every team matches to the hundredth. Each side is mapped to points by least squares
(intercept, home field), fitted on 2012-2017 and scored on 2018-2025, regular season weeks 2 on,
3,998 team-games, the same rows for both.

| RMSE of points, 2018-2025 | |
|---|---|
| League average and home field | 9.992 |
| **Game snapshot** (Overall Offense, Overall Defense) | **9.501** |
| Deep Dive, its four edges (free weights) | 9.599 |
| Deep Dive, the four edges added up (as the page reads them) | 9.579 |
| Deep Dive, its eight ratings (free weights) | 9.536 |
| Both together | 9.481 |

The snapshot is better in all 8 test seasons. Against the Deep Dive's four edges it saves 1.87 in
squared error a team-game, standard error 0.74 (by game), about 2.5 standard errors: a real
difference, though both sit only about half a point from knowing nothing.

By stretch of the season the Deep Dive wins early: weeks 2-4, 9.40 against the snapshot's 9.60,
since it carried last season in and the snapshot then rated this season alone (section 3: it now carries too). From week 5 the snapshot
leads (9.36 against 9.50 in weeks 5-9, 9.55 against 9.72 from week 10).

Within the Deep Dive nearly all the signal is the quarterback against the pass defense (1.72 points
a standard deviation of edge). The line against the pass rush (0.24), the run game (0.20) and the
receivers against the coverage (0.03) add little, though until 13 October 2026 the page tagged all six rows alike
(each row's tag is now weighted by what that matchup alone predicted on 2012-2017: DD_TAGS in
news/tools/context.js, worked out by deepdive_vs_units.py).

## 2. The starters: who was named and did not play, week 5

`python3 elo/tools/grade_lineups.py 5` (output in `out/week5-lineups-grade.md`): each club's lineup as
published last before its kickoff, against nflverse's snap counts. The snapshot's lineups were first
published on 10 October, so DAL and TB (Thursday's game) have none and are left out; the Deep Dive
is graded on the same 28 clubs, which gives its own published grade back exactly (476 named, 12
without a snap).

| Week 5, 28 clubs | Named | No snap | Quarterbacks wrong |
|---|---|---|---|
| Game snapshot | 560 | 18 (3.2%) | 1 |
| Deep Dive | 476 | 12 (2.5%) | 0 |
| Like for like (no line, no kicker) | snapshot 532, Deep Dive 336 | 3.4% against 1.5% | |

The two name different players: the snapshot names no offensive line but every defender and the
kicker, the Deep Dive the line and fewer defenders, so the like-for-like line counts only the
positions both name. The quarterback: the snapshot named Caleb Williams for Chicago at Green Bay
(Questionable, limited in practice; its rule keeps a limited Questionable player in); Tyson Bagent
started, as the Deep Dive had it. One week is a small sample.

## 3. After this test: the snapshot carries last season

The first month was the snapshot's gap, so its units now start each season at `UNIT_CARRY` (0.42) of
each club's final rating the season before, that season rated from 0 (THE CARRY in `elo/build.py`).
The share was chosen by `units_fit.py` on 2013-2017 alone, leaving one season out at a time (19
values tried, the weights, K and home field held); this harness is its one test, on the same rows:

| RMSE of points, 2018-2025 | Weeks 2 on | Weeks 2-4 | Weeks 5-9 | Weeks 10 on | Week 1 |
|---|---|---|---|---|---|
| League average and home field | 9.992 | 9.808 | 9.836 | 10.143 | 9.849 |
| Game snapshot, nothing carried | 9.501 | 9.597 | 9.355 | 9.545 | 9.848 |
| **Game snapshot, carried** | **9.424** | **9.325** | **9.303** | **9.525** | 9.492 |
| Deep Dive, its four edges | 9.599 | 9.403 | 9.502 | 9.722 | **9.293** |
| The Deep Dive's headline: carried Overall Offense minus Overall Defense, one slope (11.9126) | 9.436 | 9.339 | 9.321 | 9.533 | 9.476 |

The last row is the headline the Season Tracker's Deep Dive now leads with, scored as the page tags
it (one slope on the gap, where the snapshot's row maps the two ratings freely).

Carried, the snapshot is better than without the carry in all 8 seasons (-1.46 in squared error a
team-game, standard error 0.31; weeks 2-4 -5.15, 1.07) and ahead of the Deep Dive in weeks 2-4 too
(-1.47, standard error 0.96: ahead, but not by two standard errors). Week 1 is still the Deep
Dive's (+3.73, 1.68).

## 4. The quarterback rule: tested, not shipped

The week 5 miss above (Williams named, Bagent started) asked for a rule counting a Questionable
quarterback out after a limited practice. On 2013-2025 it fails both tests (`qb_questionable/`): the
game model's walk-forward with it is no better (2252 right of 3,550 against 2250, log loss 0.63957
against 0.63874; counting out a quarterback who did not practise instead, 2246 and 0.63847; none clears
"log loss no worse and right picks no fewer"), and a limited Questionable incumbent started 68 times in
124 (54.8%, interval 46-63%), so counting him out names the starter less often than counting him in
(38.7% against 54.8%). The Deep Dive was right about Chicago through a different rule, ESPN's notes
naming Bagent the starter, which the ELO build does not read. Nothing about who starts changed.

## In short

The snapshot's ratings predicted better from week 5 on and the Deep Dive's in the first month,
because they carried last season; with the snapshot carrying last season too it is the better from
week 2 on, and the Deep Dive only in week 1. The Deep Dive's starters were the more accurate in week 5,
quarterback included, but the rule that would have fixed the snapshot's quarterback does not hold up
over 2013-2025, so the ELO build's lineups stay as they are.
