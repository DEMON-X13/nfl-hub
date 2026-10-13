# Study 3: one equation on the 15 win indicators

**The owner's request (13 October 2026):** "On the 15 indicators you mentioned before, I would like to
come up with an equation using these 15 variables. It's up to you to find how to weight each variable
and then test this equation to find the best variation to find the best percent win rate. Once you find
it we can test it against 2024 and 2025."

## The equation

    chance the home team wins = 1 / (1 + e^-(0.285 x home + sum of weight x gap))

Each gap is the home team's number minus the away team's, going into the game, in standard deviations
(`results/equation.json` has each one's average and spread). `home` is 1 at the home team's ground and
0 at a neutral site. The pick is the team with the higher chance.

The weights, the 15 pre-game indicators of study 1 (`results/equation_weights.csv`):

| Indicator | Weight (per standard deviation) | Share of the weight |
|---|---|---|
| Starting QB's own EPA per dropback, last 16 games | 0.236 | 22.4% |
| Elo rating, carried across seasons | 0.236 | 22.4% |
| Point differential blended with last season | 0.161 | 15.2% |
| Opponent-adjusted point differential (SRS) | 0.120 | 11.3% |
| Early-down EPA per play | 0.067 | 6.4% |
| Dropback EPA per play | -0.051 | 4.9% |
| Passer rating | -0.047 | 4.5% |
| Drive success rate | 0.044 | 4.2% |
| Pythagorean win expectation | 0.030 | 2.8% |
| ANY/A | 0.021 | 2.0% |
| EPA per play, touchdown plays left out | 0.019 | 1.8% |
| EPA per play | -0.011 | 1.1% |
| Win rate | -0.005 | 0.5% |
| Point differential per game | 0.004 | 0.3% |
| Points per drive | -0.002 | 0.2% |

In this equation four indicators carry 71% of the weight: the quarterback, Elo, blended point
differential and SRS. That split is not a fixed fact about the indicators: the 15 overlap heavily, and
variations that pick within two games of this one share the weight very differently (those four from 29%
to 44%, points per drive from -0.002 to 0.375). The negative weights correct for overlap; alone, each
indicator still favours the better team.

## How it was found

Every variation was scored on 2004-2023, each season called by weights fitted on the other nineteen,
so no season was scored by weights it helped choose (`results/variations.csv`, 50 variations):

- **Which 15:** study 1's in-game 15 (EPA per play, dropback EPA, ANY/A, ..., each as the team's season
  to date going into the game) or its pre-game 15 (blended point differential, Elo, SRS, ..., the
  starting quarterback).
- **Early season:** each team's season to date alone, or blended with last regular season as if it were
  2, 4, 8 or 16 games of this one, at two-thirds strength.
- **The weights:** fitted by logistic regression, the same with a ridge pull toward zero of 3, 30 or 300
  (so overlapping indicators share the weight rather than swing), or every indicator weighed the same.

| Best of each | Early season | Weights | Picked right, 2004-2023 |
|---|---|---|---|
| **Pre-game 15 (chosen)** | no blend (Elo, the QB and blended point differential carry their own history) | ridge 300 | **65.2%** (3,508 of 5,382) |
| In-game 15 | 8 games of last season | ridge 300 | 64.1% (3,448 of 5,382) |

The top pre-game variations are a tie: the chosen one beat the next three by 2 games of 5,382, and the
top 20 run from 65.2% to 64.8%. Choosing among them inside the same left-out seasons gives 65.0%
(3,499), the fairer figure for the choice. The in-game 15 never got past 64.1%. The chosen one was then
fitted once on all of 2004-2023 and frozen.

## The test: 2024 and 2025

Run once, on seasons the equation never saw (`results/test_2024_2025.csv`):

| Games | Pre-game 15 equation (chosen) | In-game 15 equation |
|---|---|---|
| 2024 (285) | **66.7%** (190) | 64.9% (185) |
| 2025 (284) | **62.7%** (178) | 63.7% (181) |
| 2024-2025 (569) | **64.7%** (368) | 64.3% (366) |
| Weeks 1-3 | 59.4% (57 of 96) | 67.7% (65 of 96) |
| Weeks 4 on | 65.8% (311 of 473) | 63.6% (301 of 473) |

On the same 569 games the FiveThirtyEight Elo alone picked 66.4% (378), and the home team 53.5%
(`results/references.csv`, a neutral site counted a half). The equation and Elo pick differently in 70
games: the equation was right in 30, Elo in 40, a gap chance alone produces about a quarter of the time.
On 2004-2023, each season left out, the equation picked 61 more than Elo alone (3,508 against 3,447).
The variations tied with the chosen one in training would have picked 375 to 377 of the 569; that was
looked at only after the test, so 368 stands.

No 2024 or 2025 game went into the weights, the scaling or the choice of variation (checked by refitting
on 2004-2023 alone). Study 1 ranked the indicators on 2003-2025; ranked on 2003-2023 alone, the same 15
come out in each list.

## Run it

```
python3 -I research/win_indicators/build.py   # the team-game tables (after research/fetch.py)
python3 -I research/equation15/equation.py    # the variations, the equation, the 2024-2025 test
```
