# Study 2: the study's Elo against the site's own ratings

**The owner's question (13 October 2026):** "How is the Elo rating different than ours?"

Study 1's pre-game list has an Elo rating near the top (63.5%). The site already has three
team-strength numbers of its own. This study says how each differs and runs them all on the same
games, 2003-2025, every game called from the games before it. 2026 is not read.

## Four ratings

| | **Study Elo** (study 1) | **App Elo** (inside Alpha, Challenger, the Joker) | **Team Rankings** (the tab) | **ELO Model** (Pick'em Record) |
|---|---|---|---|---|
| What it rates | Teams, on final scores | Teams, on final scores | Teams, on final scores (and 20% players) | Players, by position; a team is its expected starters |
| Memory | Carried across seasons, a third back to average each summer | Carried, 30% back each summer | **None**: this season alone, every team average in week 1 | Players' careers, a quarter back each summer |
| How a game counts | Once, when played: the rating moves by the surprise | Once, when played | **Re-judged every week** against what the opponent turned out to be | Each player's box score against the unit he faced |
| Margin | Log of the margin, an underdog's win weighed up, a favourite's down | Log of the margin, damped by the size of the gap whoever won | Capped at 17 points | Not used |
| Step size | K 20 | K 30 (jumpier) | A weighted solve, recent weeks weigh a little more | K 32-56 a player |
| Home field | 65 Elo points | 50 Elo points | 1.8 points | Fitted, 0 at a neutral site |
| Where it is used | Nowhere yet (the public FiveThirtyEight rating) | One input to the betting app's regressions | Shown on the Team Rankings tab, 80% results, 20% lineups | The ELO Model's picks |

## How they do on the same games

Every game with a closing spread, ties out (6,218). "Own chance" is each rating's own win chance
(the Elo formula, or the Team Rankings tab's own constants). Team Rankings is its results part (the
80%), the player part needing the player build; it reproduces the site's published test exactly
(1,999 games of 2018-2025, log loss 0.648). The app Elo reproduces the app's 2026 starting ratings
for all 32 teams to within 0.01 points.

| Picks the winner | Vegas favourite | Study Elo | App Elo | Team Rankings |
|---|---|---|---|---|
| Every game | 66.7% | 63.4% | 63.3% | 61.8% |
| Weeks 1-2 | 64.7% | 62.1% | 62.2% | **51.4%** |
| Weeks 3-5 | 63.1% | 61.3% | 61.4% | 58.3% |
| Weeks 6-9 | 66.5% | 64.8% | 64.8% | 63.4% |
| Weeks 10-13 | 68.8% | 64.2% | 64.0% | **65.8%** |
| Weeks 14-18 | 69.1% | 63.9% | 63.9% | 64.2% |
| Playoffs | 63.6% | 60.0% | 59.6% | 60.8% |
| Log loss, own chance, every game | | 0.6309 | 0.6359 | 0.6375 |

Study Elo against each, game by game (log loss x1000 on each rating's own chance, negative when the
study's Elo is better; 90% intervals from resampling whole seasons):

| Games | vs App Elo | vs Team Rankings |
|---|---|---|
| Every game | -5.0 (-6.6 to -3.0) | -6.5 (-9.6 to -3.4) |
| Weeks 1-3 | -3.3 (-8.3 to 1.7) | -36.3 (-46.3 to -26.2) |
| Weeks 4 on | -5.3 (-7.4 to -3.1) | -0.2 (-3.4 to 3.3) |
| Weeks 10-13 | -1.2 (-7.5 to 5.1) | +6.5 (-0.8 to 14.0) |

**The ELO Model** cannot be run here (it needs the player build), so its own published walk-forward
(`elo/data/model.json`, each season called by a model fitted on the seasons before) is set beside the
study's Elo season by season. It is not a paired test. Before 2020 it rates only the 82-94% of each
season's games with lineups. From 2020 it rates every game, 1,688 of them, as many as the study's
Elo on the same seasons:

| 2020-2025, every game | Picks the winner | Log loss |
|---|---|---|
| ELO Model (players) | 64.9% | 0.629 |
| Study Elo (teams) | 63.4% | 0.641 |
| Vegas favourite (the closing spread) | 66.6% | 0.606 |

On log loss the player model is ahead in five of those six seasons (all but 2025). Over 2013-2025 it is
63.4% and 0.6387 on its 3,333 games, against the study's Elo on all 3,550 at 64.4% and 0.6333: behind
in the seasons it rated only partly. (`results/vs_elo_model_by_season.csv`)

## What the differences mean

- **The study's Elo and the app's are the same idea.** They pick the same winners (63.4% and 63.3%).
  The app's version takes bigger steps (K 30), and its margin rule damps every result by the size of the
  gap, so an upset counts for less than in FiveThirtyEight's. Its raw win chances therefore run too sure
  of themselves (log loss 0.6359 against 0.6309). Rescaled, they are level (0.6298 against 0.6301). In the
  app it is one input to a regression that rescales it, so the Alpha and Challenger models lose nothing
  by it.
- **Team Rankings is not an Elo, and its difference is memory.** It knows nothing in week 1, and in weeks 1-2
  it is a coin flip (51.4%) where an Elo with last season in it picks 62%. It catches up by weeks 6-9. From
  week 10 it is as good or a little better (65.8% in weeks 10-13), because it re-judges every game against
  what the opponent turned out to be, where an Elo judges each game once. Over a whole season it is 1.6
  points worse, all of it in the first five weeks. That is the design ("this season's alone"), and it fits a
  table of this season's rankings; as a predictor it gives up the early weeks.
- **The player-based ELO Model is the best of the site's ratings where it has full data.** From 2020 it beats
  a team Elo. Of everything in studies 1 and 2, it is the only rating clearly ahead of a plain team Elo on
  the same seasons. A paired test would need its game-by-game calls kept; the per-season numbers are what it
  publishes.
- **None of them beats the closing line** (66.7%, log loss 0.6087 fitted). The three run here, each added to
  the closing spread, make it no better on seasons they were not fitted on, and the ELO Model's 0.629 in
  2020-2025 is well behind the line's 0.606 on the same games.

For the next model, when the owner calls for it: memory early in the season (an Elo, or results carried
from last season), re-judging as the season goes (the Team Rankings way), and players at least as strong
a base as team results.

## Side by side, 2003-2025 (the owner's follow-up, 13 October 2026)

"Can we do a side by side comparison where we run our current team rankings against the same years
the fivethirtyeight formula did and see which one fares out better." Both ratings called every game
of 2003-2025 (6,218, playoffs in, ties out) from what each knew before it. Each picks the team its own
win chance favours, home field included, so a week-1 Team Rankings table (every team level) picks the
home team. Team Rankings here is its results part, run by `elo/build.py`'s own `power_ratings()`: 80%
of the tab. Its other 20%, the expected starters on player Elo, starts in 2012 and needs the site's
player build, so it is compared below on the site's own published test. (`side_by_side.py`)

| Season | Games | FiveThirtyEight right | Team Rankings right | Better |
|---|---|---|---|---|
| 2003 | 267 | 172 (64.4%) | 170 (63.7%) | FiveThirtyEight |
| 2004 | 267 | 171 (64.0%) | 172 (64.4%) | Team Rankings |
| 2005 | 267 | 181 (67.8%) | 184 (68.9%) | Team Rankings |
| 2006 | 267 | 156 (58.4%) | 155 (58.1%) | FiveThirtyEight |
| 2007 | 267 | 173 (64.8%) | 172 (64.4%) | FiveThirtyEight |
| 2008 | 266 | 170 (63.9%) | 165 (62.0%) | FiveThirtyEight |
| 2009 | 267 | 185 (69.3%) | 173 (64.8%) | FiveThirtyEight |
| 2010 | 267 | 166 (62.2%) | 159 (59.6%) | FiveThirtyEight |
| 2011 | 267 | 170 (63.7%) | 178 (66.7%) | Team Rankings |
| 2012 | 266 | 166 (62.4%) | 165 (62.0%) | FiveThirtyEight |
| 2013 | 266 | 176 (66.2%) | 172 (64.7%) | FiveThirtyEight |
| 2014 | 266 | 184 (69.2%) | 179 (67.3%) | FiveThirtyEight |
| 2015 | 267 | 176 (65.9%) | 174 (65.2%) | FiveThirtyEight |
| 2016 | 265 | 171 (64.5%) | 171 (64.5%) | level |
| 2017 | 267 | 174 (65.2%) | 166 (62.2%) | FiveThirtyEight |
| 2018 | 265 | 166 (62.6%) | 169 (63.8%) | Team Rankings |
| 2019 | 266 | 170 (63.9%) | 161 (60.5%) | FiveThirtyEight |
| 2020 | 268 | 176 (65.7%) | 169 (63.1%) | FiveThirtyEight |
| 2021 | 284 | 166 (58.5%) | 161 (56.7%) | FiveThirtyEight |
| 2022 | 282 | 178 (63.1%) | 179 (63.5%) | Team Rankings |
| 2023 | 285 | 172 (60.4%) | 162 (56.8%) | FiveThirtyEight |
| 2024 | 285 | 197 (69.1%) | 177 (62.1%) | FiveThirtyEight |
| 2025 | 284 | 181 (63.7%) | 177 (62.3%) | FiveThirtyEight |
| 2003-2025 | 6218 | 3997 (64.3%) | 3910 (62.9%) | FiveThirtyEight |

FiveThirtyEight picked more winners in 17 seasons, Team Rankings in 5, one level; 87 more right in all.

| Stage of the season | Games | FiveThirtyEight right | Team Rankings right |
|---|---|---|---|
| Weeks 1-2 | 730 | 62.1% | 57.4% |
| Weeks 3-5 | 1,027 | 62.7% | 58.2% |
| Weeks 6-9 | 1,280 | 63.9% | 62.9% |
| Weeks 10-13 | 1,376 | 65.6% | **66.4%** |
| Weeks 14-18 | 1,540 | 65.2% | 65.2% |
| Playoffs | 265 | 66.0% | 64.5% |

**The full current table, player part in**, on the site's own test (`elo/build.py`, THE POWER RATINGS:
regular-season weeks 2-18, each week from the finals of the weeks before; log loss, lower is better):

| Seasons | Games | Team Rankings, full table (site's published) | Team Rankings, results part | FiveThirtyEight |
|---|---|---|---|---|
| 2012-2017 (the table's constants were chosen here) | 1,441 | 0.6243 | 0.6266 | 0.6235 |
| 2018-2025 (the table's test) | 1,999 | 0.6447 | 0.6480 | 0.6408 |

The results part reproduces the site's published numbers exactly; the full table's are the site's own,
not rerun here. On 2018-2025 the results part picked 61.7% right, FiveThirtyEight 63.2%.

**Which fares better:** FiveThirtyEight's formula, over the whole of 2003-2025 and against the full current
table on its own test seasons. Team Rankings is behind in weeks 1-9, when it knows only this season,
and level or ahead from week 10.

## Run it

```
python3 -I research/win_indicators/build.py   # the team-game table this reads (after research/fetch.py)
python3 -I research/elo_vs_site/compare.py    # results/ratings.csv, study_elo_vs_site.csv, vs_elo_model_by_season.csv
python3 -I research/elo_vs_site/side_by_side.py   # results/side_by_side_*.csv: Team Rankings against FiveThirtyEight, season by season
```

`compare.py` runs Team Rankings with `elo/build.py`'s own `power_ratings()`, the app Elo with the
app's rule (`betting/joker/harness/ratings.py`), and the study's Elo from `research/win_indicators/rank.py`.
