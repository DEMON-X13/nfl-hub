# Study 4: the site's five models, side by side, 2021-2025

**The owner (13 October 2026):** "Just doesn't seem like enough parody on the different models,
wondering if I should just narrow how many there are. Can't seem to find a model that makes much of a
difference." He was asked whether to cut models now or first run all five over past seasons, and
answered "I guess last seasons".

## The answer in short

Over the 2021-2025 regular seasons, the five models picked between 63.0% and 66.1% of games right. That
is 41 games apart over 1,355. All five picked the same team in 61% of games.

- **Alpha and the Challenger** picked the same team in 92% of games. Where they differed, Alpha was
  right 57 times and the Challenger 51.
- **The Joker and the ELO Model** differ most from the rest. When either picked against the other four
  together, it was wrong more often than right: the Joker 38-82, the ELO Model 38-59.
- **Broly against the Joker** is the only pair whose gap is bigger than chance usually gives.
- **Broly** picks the betting favourite in 98% of games.

## How it was run

Each model was run as the site builds it, with its own code and data. It was refitted season by season
on the seasons before the one it calls (walk forward), so no season was called by weights that saw it.
Only the weights are refitted, though. Each model's design (its inputs, its settings, the choice to ship
it) was made by people who had seen these seasons, so all five records lean a little optimistic.

Every call is of a regular-season game, made from what was known before kickoff, with one exception.
Alpha, the Challenger and the Joker take a game's quarterback to be the passer with the most dropbacks in
it (the betting harness's rule, `betting/joker/harness/qb.py`). That rule knows about an injury during the
game, which happened in 122 team-games. Taking games.csv's listed starter instead gives Alpha 883 right
(3 more), the Challenger 873 (1 fewer) and the Joker 855 (1 more).

The window is 2021-2025: 1,359 games, 4 ties (no decision), 1,355 decided. All five called every
decided game.

| Model | What it is | Learned from, calling 2021 → calling 2025 |
|---|---|---|
| Alpha | The betting app's margin formula: Elo gap, rest gap, home field, the teams' EPA gap and the starting quarterback's drop, by least squares on the margin | 2019-2020 → 2019-2024 |
| Challenger | Alpha with each team's preseason Elo set from the betting market's season win total | 2019-2020 → 2019-2024 |
| Joker | Gradient-boosted trees on 576 inputs (ratings, team stats, the betting line, weather, coaches, quarterbacks) | 2019-2020 → 2019-2024 |
| Broly | The moneylines' chance plus six team stats, a logistic regression | 2008-2020 → 2008-2024 |
| ELO Model | The expected lineup's player Elo by position group, a logistic regression | 2012-2020 → 2012-2024 |

Alpha, the Challenger and the Joker start in 2019 because the betting job's frozen files start there.
In 2021 they learned from two seasons; the site's own versions learned from seven (2019-2025).

The refits follow the site's own recipes, with three differences:

- **Alpha's settings.** The app's settings say `warm` 0, and the backtest uses 0. The team ratings the app
  ships were built with 6. A run with 6 changes 30 of Alpha's picks and gives 884-471 (4 more right).
- **Alpha's and the Challenger's fit.** The backtest fits the formula in one least-squares step. The app
  fitted it in two, the quarterback term apart. Doing it the app's way changes 3 of Alpha's picks and 2 of
  the Challenger's.
- **The Joker's quarterback input.** For a game still to come, the live Joker sees no quarterback drop,
  because the game has no play-by-play yet. Setting the drop to 0 on the test games changes 12 picks, with
  the same record. Weather and the referee may be filled in only after a game. Blanking them as well
  changes 20 picks and gives 852-503.

The Joker's record also moves with choices that should not matter. Taking league averages over all seven
seasons, rather than the seasons before the one called, flips 111 of its 1,355 picks and gives 861-494.

## Each model's record

| Model | 2021 | 2022 | 2023 | 2024 | 2025 | 2021-2025 |
|---|---|---|---|---|---|---|
| Broly | 169-102 | 177-92 | 182-90 | 189-83 | 178-93 | **895-460 (66.1%)** |
| Alpha | 173-98 | 168-101 | 168-104 | 192-80 | 179-92 | 880-475 (64.9%) |
| ELO Model | 173-98 | 168-101 | 168-104 | 191-81 | 176-95 | 876-479 (64.6%) |
| Challenger | 168-103 | 169-100 | 165-107 | 189-83 | 183-88 | 874-481 (64.5%) |
| Joker | 167-104 | 166-103 | 167-105 | 185-87 | 169-102 | 854-501 (63.0%) |

- **Best each season:** Alpha and the ELO Model tied in 2021, Broly in 2022 and 2023, Alpha in 2024,
  the Challenger in 2025.
- **The Joker** had the fewest right in four of the five seasons.
- **2023-2025 alone**, when each model had at least four seasons to learn from, the order is the same:
  Broly 67.4%, Alpha 66.1%, the Challenger 65.9%, the ELO Model 65.6%, the Joker 63.9%.
- **Alpha and the ELO Model** have the same record in 2021, 2022 and 2023, though they picked different
  teams in 58, 54 and 60 of those games. Each season, those games split exactly evenly between them.

## How often two pick the same team

| | Alpha | Challenger | Joker | Broly | ELO Model |
|---|---|---|---|---|---|
| Alpha | | 92.0% | 75.2% | 84.0% | 79.6% |
| Challenger | 92.0% | | 76.4% | 84.7% | 80.1% |
| Joker | 75.2% | 76.4% | | 81.8% | 74.9% |
| Broly | 84.0% | 84.7% | 81.8% | | 80.9% |
| ELO Model | 79.6% | 80.1% | 74.9% | 80.9% | |

Alpha and the Challenger are one model in 92% of games. Every other pair agrees on 75% to 85% of games.
The Joker and the ELO Model agree least with the others.

## When two differ, who was right

| Pair | Games they differ | Right: first | Right: second | Chance alone gives a split this uneven |
|---|---|---|---|---|
| Alpha, Challenger | 108 | 57 | 51 | 63% |
| Alpha, Joker | 336 | 181 | 155 | 17% |
| Alpha, Broly | 217 | 101 | 116 | 34% |
| Alpha, ELO Model | 276 | 140 | 136 | 86% |
| Challenger, Joker | 320 | 170 | 150 | 29% |
| Challenger, Broly | 207 | 93 | 114 | 16% |
| Challenger, ELO Model | 270 | 134 | 136 | 95% |
| Joker, Broly | 247 | 103 | 144 | 1.1% |
| Joker, ELO Model | 340 | 159 | 181 | 26% |
| Broly, ELO Model | 259 | 139 | 120 | 26% |

Only Broly over the Joker (144-103) is a gap chance rarely gives. With ten pairs compared, though, a split
that uneven turns up somewhere about one time in ten by chance alone. The other nine are within chance.

## When one model stands alone

These are the games where one model picked one team and the other four all picked the other.

| Model | Games alone | Its record in them |
|---|---|---|
| Joker | 120 | 38-82 (32%) |
| ELO Model | 97 | 38-59 (39%) |
| Alpha | 28 | 11-17 (39%) |
| Broly | 23 | 10-13 (43%) |
| Challenger | 17 | 8-9 (47%) |

Every model, picking against the other four, was right less than half the time.

## How the five split

| The five | Games | Share | The majority's record |
|---|---|---|---|
| All five agree | 830 | 61% | 591-239 (71.2%) |
| 4 to 1 | 285 | 21% | 180-105 (63.2%) |
| 3 to 2 | 240 | 18% | 119-121 (49.6%) |

## Two of them take the betting line as an input

Broly starts from the moneylines' chance and picks the betting favourite in 97.9% of games. The Joker
has the spread and both moneylines among its inputs and picks the favourite in 81.5%. The others do not
read the game's line and pick the favourite in 84.3% (Alpha), 84.9% (Challenger) and 82.1% (ELO Model) of
games. The Challenger reads the market's season win totals, once, before the season.

## Further back, where a model can be run

| Model | Seasons | Record |
|---|---|---|
| ELO Model | 2013-2025 | 2,016-1,165 (63.4%) |
| Broly | 2018-2025 | 1,374-712 (65.9%) |

The other three cannot be run before 2021 on the site's own files.

These two leave out the relocated teams' games before their moves. Both join games.csv, which writes the
codes of the day (OAK, SD, STL), to nflverse files that write today's codes (LV, LAC, LA). The ELO Model
has no inputs for 263 games of 2012-2019 (217 of them in 2013-2019). Broly has none for 33 games of
2018-2020, every Raiders game of 2018-2019 among them. The site's own fits have the same gap. It touches
no 2021-2025 call.

## This season so far

As the site records it through 11 October 2026 (78 games, from `../exam/README.md`):

| Model | 2026 record |
|---|---|
| Joker | 53-24-1 |
| Broly | 49-28-1 |
| Alpha | 48-29-1 |
| Challenger | 48-29-1 |
| ELO Model | 47-30-1 |

The Joker's week 1 and the ELO Model's weeks 1-2 are backtests, called after the games. This is five
weeks; over 2021-2025 the Joker had the fewest right in four of five seasons.

## Checks that this is the site's models

- **The ELO Model's rebuild** gives exactly the per-season walk-forward record that `elo/data/model.json`
  publishes, every season 2013-2025.
- **Broly's walk forward** is 65.7% on 2018-2025, playoffs included; `betting/broly/fit.py` says 65.8%.
- **Alpha's refit** is 65.1% on 2021-2025 with playoffs (924 of 1,420). The app's own coefficients, fitted
  on 2019-2025, get 65.0% (923) on the same games. They pick the same team as the refit in 88% to 99% of
  games, depending on the season. The app's changelog quotes 63.8% for this window. No variant tried here
  scored under 64.7%, and nothing in this repository shows how that figure was measured.
- **The Challenger's coefficients** in the app are reproduced exactly by its two-step fit on 2019-2025.
- **The Joker's walk forward** is 63.0% on 2021-2025 regular season; `betting/joker/model.json` says
  63.4%.
- **An independent check** rebuilt every model from scratch, reproduced every chance to four decimals and
  every table exactly, and found that a rerun writes identical files.

## Run it

```
python3 -I research/fetch.py                           # games.csv and play-by-play (Broly's stats)
python3 -I research/models_compare/elo_features.py     # once: the ELO Model's inputs, elo/build.py in a sandbox
python3 -I research/models_compare/backtest.py         # all five, walk forward; writes results/
```

`elo_features.py` runs `elo/build.py` unchanged, with its cache and output pointed into this study's `out/`
(gitignored). It reads the schedule with 2026 dropped and sets the clock to 1 March 2026, so nothing of the
held-out season is read and nothing of the site is touched. Alpha, the Challenger and the Joker need
scikit-learn (`betting/joker/requirements.txt`).

Every game, each model's chance and pick: `results/calls_2021_2025.csv`.
