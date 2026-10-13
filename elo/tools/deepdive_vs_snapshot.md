# The Deep Dive against the Game snapshot

The owner asked (13 October 2026) which is more accurate: the Season Tracker's Deep Dive
(`news/`, built by `news/tools/context.js`) or the Game snapshot on X NFL Bets and Stats (the ELO
build's Overall Offense and Overall Defense and its Starters). They show the same kind of thing for
a game from different code and data. Two tests, run once; neither changes a site.

## 1. The ratings: which predicts an offense's points in its next game

`python3 elo/tools/deepdive_vs_units.py` (output in `out/deepdive_vs_units.txt`). The snapshot's side
is `units_fit.py`'s own harness, unchanged (it still reproduces `UNIT_WF`). The Deep Dive's is
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
since it carries last season in and the snapshot rates this season alone. From week 5 the snapshot
leads (9.36 against 9.50 in weeks 5-9, 9.55 against 9.72 from week 10).

Within the Deep Dive nearly all the signal is the quarterback against the pass defense (1.72 points
a standard deviation of edge). The line against the pass rush (0.24), the run game (0.20) and the
receivers against the coverage (0.03) add little, though the page tags all six rows alike.

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

## In short

The snapshot's ratings predict better from week 5 on; the Deep Dive's predict better in the first
month, because they carry last season. The Deep Dive's starters were the more accurate in week 5,
quarterback included.
