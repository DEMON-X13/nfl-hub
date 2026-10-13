# The exam: frozen equations on seasons no study has read

**The owner (13 October 2026):** "How would that formula do in a blind test for this year? What would
its record be?"

2026 is held out from every study (`../README.md`). This folder is the one place it is read, and only to
apply an equation that was frozen before: nothing is fitted, re-scaled or chosen here. A process opens the
held-out seasons with `common.open_exam()`, from its own fresh downloads (`python3 -I research/fetch.py
--exam` into `research/data/raw/exam/`).

## Study 3's equation on 2026 (`blind_2026.py`)

The equation is `research/equation15/results/equation.json`, fitted on 2004-2023, unchanged. Each 2026
game is called from what was known before it: the teams' 2026 games before it, Elo and the starting
quarterback's form from every earlier game, last season's point differential.

Through Sunday 11 October 2026 (78 games; Monday night's game was not yet in nflverse's file):

| Week | Right | Wrong |
|---|---|---|
| 1 | 10 | 6 |
| 2 | 9 | 7 |
| 3 | 9 | 7 |
| 4 | 11 | 5 |
| 5 | 9 | 4 (and 1 tie) |
| **2026** | **48** | **29** (62.3%, 1 tie) |

An independent check rebuilt every pick (48-29-1, to the last decimal), refit the equation from
2004-2023 to the same numbers, and corrupted every game from each date on to confirm nothing from a game
or a later one reaches its call. One thing is read from the game itself, as in training: who started at
quarterback, where games.csv names a starter who took no snap (6 team-games, mostly games.csv errors
such as Seattle's in weeks 3-5); his form is from earlier games only. With games.csv's starters as
listed, one pick flips (SF at SEA) and the record is 49-28-1.

## Against the site's models, same 78 games

The owner asked whether it is worth tracking as a model or too like the ones the site has. Two
independent counts, matching, of how often it picks the same team as each, and each record:

| Model | Same pick as the equation | 2026 record |
|---|---|---|
| Alpha | 72 of 78 (92%) | 48-29-1 |
| Challenger | 66 (85%) | 48-29-1 |
| Broly | 65 (83%) | 49-28-1 |
| ELO Model | 63 (81%) | 47-30-1 |
| Joker | 59 (76%) | 53-24-1 |
| **The equation** | | **48-29-1** |

It agrees with Alpha more than any two of the site's models agree with each other (the most is
Challenger and Broly, 88.5%), its chances track Alpha's closest of any pair (correlation 0.91), and in
the 6 games they differ each was right 3 times. It is close to a copy of Alpha, not a view of its own;
the Joker and the ELO Model are the ones that most often stand apart from the rest. (Joker week 1 and
ELO weeks 1-2 are backtests, called after the games; leaving them out changes none of this.)

Every game, its pick and its chance: `results/blind_2026_games.csv`. Re-run as the season goes on; the
record grows and the equation stays as it is.

```
python3 -I research/fetch.py --exam
python3 -I research/exam/blind_2026.py
```
