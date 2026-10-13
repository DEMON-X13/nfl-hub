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

## Run it

```
python3 -I research/win_indicators/build.py   # the team-game table this reads (after research/fetch.py)
python3 -I research/elo_vs_site/compare.py    # results/ratings.csv, study_elo_vs_site.csv, vs_elo_model_by_season.csv
```

`compare.py` runs Team Rankings with `elo/build.py`'s own `power_ratings()`, the app Elo with the
app's rule (`betting/joker/harness/ratings.py`), and the study's Elo from `research/win_indicators/rank.py`.
