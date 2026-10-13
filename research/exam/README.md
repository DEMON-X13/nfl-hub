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

Every game, its pick and its chance: `results/blind_2026_games.csv`. Re-run as the season goes on; the
record grows and the equation stays as it is.

```
python3 -I research/fetch.py --exam
python3 -I research/exam/blind_2026.py
```
