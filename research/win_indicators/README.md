# Study 1: the top win indicators since 2003

**The owner's question (12 October 2026):** "Since 2003, what are the top 15 win indicators in the NFL?"

Answered on every game from 2003 to 2025 (6,218 games: regular season and playoffs, 14 ties left out),
from nflverse's play-by-play and games.csv, read on 12-13 October 2026 (1999-2002 read only to warm up the
Elo rating and the quarterbacks' form). 2026 is held out (`../README.md`).

## Two questions in one

"Win indicator" means two different things, and they give two different lists:

1. **In the game: what the winner did.** For each stat, how often the team that won it won the game
   (a stat level between the teams counted as a coin flip). This is what wins football games.
2. **Before the game: what predicts the next one.** Each team's season to date entering a game, offence
   less what its defence allowed, and how often the team better on it won. This is what a model can use,
   and it is measured against the closing line, which picks the winner 67.3% of the same games.

The gap between the two lists is the main finding.

## The answer in short

- **In the game, the passing game decides it.** EPA per play (86.2%) leads, and 7 of the top 15 are
  passing efficiency: dropback EPA, ANY/A, passer rating, net yards per attempt, yards per attempt,
  dropback success rate, CPOE. Drive success rate (77.0%), turnover margin (72.5%, and 78.6% when one
  side wins it) and yards per drive (72.2%) are the other big ones. EPA is close to the score itself (it
  counts what each play does to the expected score), so it is checked with every touchdown play left out:
  80.3%, still 4th.
- **"Run the ball to win" is backwards.** Rushing attempts (75.6%), pass rate (79.7%, fewer is better),
  rushing yards and time of possession all look like top indicators, but they are what a team ahead does.
  On neutral snaps (win probability 20-80%) rushing attempts fall to 55.8% and pass rate to 52.9%, where
  a random set of as many snaps keeps 72.0% and 76.4%; yards per carry picks the winner 56.4%. They are
  kept out of the top 15.
- **What wins a game is not what carries to the next one.** Turnover margin wins 72.5% of games but its
  season to date picks only 57.5% of the next ones, and only about a quarter of it is the team
  (season reliability 0.27). Fumbles lost (0.02), field-goal rate (0.11), red-zone TD rate (0.19) and
  third-down rate (0.44) are mostly the week. Efficiency (EPA per play 0.71, drive success rate 0.71) and point
  differential (0.69) are mostly the team.
- **Before the game, three signals.** Team strength from results, best with memory of last season (point
  differential blended with last season 63.7%, Elo 63.5%, SRS 63.4%, Pythagorean 63.4%, point differential
  63.2%: one signal, written five ways); the starting quarterback's own recent EPA (62.7%, and the only
  one that adds clearly to team strength: 64.7% in the games where a starter changed, against 61.1% for
  the team's passing numbers); and the team efficiency stats (EPA per play 62.6%), which add nothing once
  point differential is known.
- **Nothing beats the closing line.** The closing favourite picks 67.3% of the same games. No stat or
  rating adds to it on seasons it was not fitted on: every 90% interval of the change in log loss
  includes zero or makes it worse, and the best of the 50 candidates on top of the line (special-teams
  EPA, -0.67 per 1,000) is what the best of 50 shuffled ones reached in 4 runs of 40. (Yardage and EPA
  lean towards fading on top of the line and special teams towards following; a question for later, not a
  finding.)
- **Weeks 1-3** (1,108 games, 18% of the season) need last season: Elo picks 62.8% there and last season's
  point differential 60.0%, against the line's 64.0%; the starting quarterback 57.7%. This season's
  numbers are noise that early (53-55%).
- **Home field** has faded: 57.6% in 2003-13, 55.3% in 2014-25. A rest edge is worth nothing on its own
  (50.6%).
- **Offence carries the signal.** Before the game a team's offence alone picks almost as well as its net
  (EPA per play 61.8% against 62.6%); its defence alone much less (56.2%).

## The tables

<!-- tables -->
### In the game: the top 15

| # | Stat (the team that won it) | better | won the game | when not level | level | neutral snaps | 2003-13 / 2014-25 |
|---|---|---|---|---|---|---|---|
| 1 | EPA per play | more | 86.2% | 86.2% | 0% | 83.8% | 85.2% / 87.2% |
| 2 | Dropback EPA per play | more | 82.6% | 82.6% | 0% | 79.8% | 81.7% / 83.5% |
| 3 | ANY/A (adjusted net yards per attempt) | more | 80.5% | 80.5% | 0% | 76.6% | 80.2% / 80.8% |
| 4 | EPA per play, touchdown plays left out | more | 80.3% | 80.3% | 0% | 80.0% | 79.5% / 81.0% |
| 5 | Passer rating | more | 79.0% | 79.0% | 0% | 75.3% | 79.2% / 78.9% |
| 6 | Drive success rate (sets of downs that earn a first down or TD) | more | 77.0% | 77.4% | 2% | 81.5% | 76.1% / 77.8% |
| 7 | Net yards per pass attempt (sacks in) | more | 74.4% | 74.4% | 0% | 74.0% | 74.2% / 74.5% |
| 8 | Early-down EPA per play (1st & 2nd) | more | 73.7% | 73.7% | 0% | 75.6% | 73.3% / 74.2% |
| 9 | Dropback success rate | more | 73.2% | 73.3% | 0% | 72.9% | 71.6% / 74.5% |
| 10 | Turnover margin | more | 72.5% | 78.6% | 21% | 63.4% | 74.0% / 71.2% |
| 11 | Yards per drive | more | 72.2% | 72.2% | 0% |  | 71.0% / 73.1% |
| 12 | Yards per pass attempt | more | 72.1% | 72.2% | 0% | 72.2% | 72.5% / 71.8% |
| 13 | First downs per snap | more | 71.5% | 71.6% | 0% | 77.6% | 70.6% / 72.4% |
| 14 | Yards per play | more | 70.9% | 70.9% | 0% | 76.9% | 70.1% / 71.5% |
| 15 | Completion % over expected | more | 70.4% | 70.4% | 0% | 69.5% | 69.0% / 71.2% |

6218 games, 2003-2025, playoffs in, 14 ties out. "won the game": how often the team that won the stat won the game, a level stat counted as a coin flip. CPOE starts in 2006.

### Left out of the top 15: they follow the score

| Stat | better | won the game | neutral snaps | why |
|---|---|---|---|---|
| Pass rate (dropbacks / snaps) | fewer | 79.7% | 52.9% | on neutral snaps it falls to 52.9% (on as many random snaps 76.4%) |
| Rushing attempts | more | 75.6% | 55.8% | on neutral snaps it falls to 55.8% (on as many random snaps 72.0%) |
| Rushing yards | more | 71.0% | 62.8% | its edge is the carries, which follow the score: yards per carry alone picks 56% |
| QB hits taken | fewer | 68.8% | 56.7% | on neutral snaps it falls to 56.7% (on as many random snaps 64.1%) |
| Fourth-down attempts | fewer | 68.0% |  | a team behind goes for it on fourth down |
| Kickoff return yards | fewer | 67.8% |  | a team receives a kickoff after the other team scores |
| Average drive start (own yard line) | more | 67.7% |  | a team scored on starts its next drive from a kickoff |
| Time of possession | more | 66.8% |  | a team ahead runs the clock |
| Tackled for loss (snaps) | more | 59.6% | 47.0% | on neutral snaps it falls to 47.0% (on as many random snaps 56.9%) |
| Average depth of target | fewer | 52.4% | 47.0% | on neutral snaps it falls to 47.0% (on as many random snaps 52.3%) |

### In the game: the distinct signals (box score, no EPA)

| step | 2003-2025 (adds the most, given the ones above) | picks the winner | 2003-2013 alone | 2014-2025 alone |
|---|---|---|---|---|
| 1 | ANY/A (adjusted net yards per attempt) | 80.6% | ANY/A (adjusted net yards per attempt) | ANY/A (adjusted net yards per attempt) |
| 2 | Drive success rate (sets of downs that earn a first down or TD) | 84.3% | Drive success rate (sets of downs that earn a first down or TD) | Drive success rate (sets of downs that earn a first down or TD) |
| 3 | Turnover margin | 87.3% | Net passing yards | Turnover margin |
| 4 | Interception rate | 88.4% | Fumbles lost | Field-goal rate |
| 5 | Field-goal rate | 89.9% | Field-goal rate | Interception rate |
| 6 | Net passing yards | 90.6% | Punts | Net passing yards |
| 7 | Punts | 91.1% | Penalty yards | Net punt average |
| 8 | Net punt average | 91.4% | Third-down conversion rate | Yards per drive |

### Before the game: the top 15

| # | Indicator (the team better on it, entering the game) | picks the winner (90%) | log loss | on top of the line | reliability |
|---|---|---|---|---|---|
| 1 | Point differential blended with last season | 63.7% (62.6%-64.8%) | 0.6272 | nothing |  |
| 2 | Elo rating, carried across seasons | 63.5% (62.6%-64.4%) | 0.6275 | nothing |  |
| 3 | Opponent-adjusted point differential (SRS) | 63.4% (62.4%-64.5%) | 0.6310 | nothing |  |
| 4 | Pythagorean win expectation (points, exponent 2.37) | 63.4% (62.3%-64.5%) | 0.6356 | nothing | 0.69 |
| 5 | Points per drive | 63.2% (62.2%-64.3%) | 0.6348 | nothing | 0.70 |
| 6 | Point differential per game | 63.2% (62.1%-64.4%) | 0.6349 | nothing | 0.69 |
| 7 | Starting QB: his own EPA per dropback over his last 16 games | 62.7% (61.5%-63.8%) | 0.6400 | nothing |  |
| 8 | EPA per play | 62.6% (61.6%-63.6%) | 0.6404 | nothing | 0.71 |
| 9 | Dropback EPA per play | 61.9% (60.7%-63.1%) | 0.6455 | nothing | 0.65 |
| 10 | Win rate | 61.9% (60.9%-62.9%) | 0.6435 | nothing | 0.65 |
| 11 | EPA per play, touchdown plays left out | 61.8% (60.8%-62.8%) | 0.6464 | nothing | 0.68 |
| 12 | ANY/A (adjusted net yards per attempt) | 61.7% (60.5%-62.9%) | 0.6464 | nothing | 0.63 |
| 13 | Drive success rate (sets of downs that earn a first down or TD) | 61.4% (60.6%-62.3%) | 0.6480 | nothing | 0.71 |
| 14 | Passer rating | 61.4% (60.5%-62.3%) | 0.6510 | nothing | 0.62 |
| 15 | Early-down EPA per play (1st & 2nd) | 61.3% (59.8%-62.8%) | 0.6488 | nothing | 0.63 |

The closing spread's favourite picks 67.3% of the same 5110 games (log loss 0.6050). Both teams with three games behind them that season; log loss from a fit leaving each season out; reliability is a stat's season-long split-half correlation (blank: a rating, not one stat).

### What wins a game against what carries to the next

| Stat | in the game | season to date, before the next | half-season reliability | season |
|---|---|---|---|---|
| EPA per play | 86.2% | 62.6% | 0.55 | 0.71 |
| Drive success rate (sets of downs that earn a first down or TD) | 77.0% | 61.4% | 0.55 | 0.71 |
| ANY/A (adjusted net yards per attempt) | 80.5% | 61.7% | 0.46 | 0.63 |
| Turnover margin | 72.5% | 57.5% | 0.15 | 0.27 |
| Interceptions thrown | 69.0% | 57.5% | 0.18 | 0.31 |
| Third-down conversion rate | 68.4% | 57.8% | 0.28 | 0.44 |
| Red-zone TD rate (TD trips / trips inside the 20) | 59.0% | 55.2% | 0.10 | 0.19 |
| Fumbles lost | 60.8% | 52.8% | 0.01 | 0.02 |
| Field-goal rate | 55.3% | 51.0% | 0.06 | 0.11 |
| Penalties (accepted) | 54.9% | 51.6% | 0.18 | 0.31 |

### Before the game: the distinct signals

| step | without the line | log loss x1000 (90%) | on top of the closing spread | log loss x1000 (90%) |
|---|---|---|---|---|
| 1 | Point differential blended with last season | -58.4 (-64.9 to -51.8) | Special-teams EPA | -0.7 (-1.4 to 0.1) |
| 2 | Starting QB: his own EPA per dropback over his last 16 games | -7.1 (-10.0 to -4.3) | Starting QB: his own EPA per dropback over his last 16 games | -0.4 (-1.2 to 0.4) |
| 3 | Yards per carry | -1.2 (-2.6 to 0.2) | Net passing yards | -0.4 (-1.3 to 0.7) |
| 4 | Elo rating, carried across seasons | -1.2 (-2.1 to -0.1) | Punt return yards | -0.2 (-0.9 to 0.5) |
| 5 | Punt return yards | -0.9 (-2.0 to 0.2) | Dropback EPA per play | -0.1 (-0.6 to 0.4) |
| 6 | Opponent-adjusted point differential (SRS) | -0.3 (-1.2 to 0.5) | Punts | -0.0 (-0.2 to 0.2) |

### Weeks 1-3

| Indicator | picks the winner | log loss | games |
|---|---|---|---|
| The closing spread (the Vegas favourite) | 64.0% | 0.6301 | 1108 |
| The home team (a neutral site a coin flip) | 56.2% |  | 1108 |
| Elo rating, carried across seasons | 62.8% | 0.6433 | 1108 |
| Last season's point differential per game | 60.0% | 0.6559 | 1108 |
| Point differential blended with last season | 60.0% | 0.6550 | 1108 |
| Last season's EPA per play (net) | 60.2% | 0.6550 | 1058 |
| Last season's dropback EPA per play (net) | 60.8% | 0.6582 | 1058 |
| Starting QB: his own EPA per dropback over his last 16 games | 57.7% | 0.6697 | 1108 |
| Opponent-adjusted point differential (SRS) (this season, under 3 games) | 53.4% | 0.6812 | 1108 |
| Point differential per game (this season, under 3 games) | 54.8% | 0.6793 | 742 |
| EPA per play (this season, under 3 games) | 54.4% | 0.6747 | 742 |

### The starting quarterback

| Games | Indicator | picks the winner (90%) | games |
|---|---|---|---|
| QB changed | Starting QB: his own EPA per dropback over his last 16 games | 64.7% (62.5%-66.9%) | 1009 |
| QB changed | Dropback EPA per play | 61.1% (58.9%-63.3%) | 1009 |
| QB changed | EPA per play | 61.5% (59.6%-63.4%) | 1009 |
| QB changed | Point differential per game | 62.7% (60.3%-65.4%) | 1009 |
| QB changed | Elo rating, carried across seasons | 63.0% (61.1%-65.0%) | 1009 |
| same QBs | Starting QB: his own EPA per dropback over his last 16 games | 62.2% (60.8%-63.6%) | 4101 |
| same QBs | Dropback EPA per play | 62.1% (60.6%-63.6%) | 4101 |
| same QBs | EPA per play | 62.9% (61.6%-64.1%) | 4101 |
| same QBs | Point differential per game | 63.3% (62.0%-64.6%) | 4101 |
| same QBs | Elo rating, carried across seasons | 63.6% (62.6%-64.6%) | 4101 |

### Offence and defence apart (before the game)

| Stat | net | offence alone | defence alone |
|---|---|---|---|
| Point differential per game | 63.2% | 61.8% | 58.0% |
| EPA per play | 62.6% | 61.8% | 56.2% |
| Dropback EPA per play | 61.9% | 62.0% | 55.8% |
| Designed-run EPA per carry | 56.9% | 56.2% | 52.9% |
| Success rate | 59.7% | 59.9% | 53.2% |
| Drive success rate (sets of downs that earn a first down or TD) | 61.4% | 60.4% | 53.1% |
| ANY/A (adjusted net yards per attempt) | 61.7% | 61.3% | 56.1% |
| Yards per play | 60.6% | 59.8% | 54.3% |
| Turnover margin | 57.5% | 56.2% | 55.0% |
| Red-zone TD rate (TD trips / trips inside the 20) | 55.2% | 56.1% | 51.9% |
| Third-down conversion rate | 57.8% | 58.6% | 52.5% |

### Context

| Indicator | wins |
|---|---|
| The closing favourite (every game) | 66.7% |
| The home team (neutral sites out) | 56.4% (57.6% in 2003-13, 55.3% in 2014-25) |
| More rest than the opponent | 50.6% (level in 66% of games) |
<!-- /tables -->

## What this means for the next model (for the owner's next prompts, not a model)

- Start from team strength with memory (results, regressed to the mean between seasons), add the
  quarterback as his own term, and expect efficiency stats to add little on top. Weeks 1-3 need last
  season and the quarterback.
- Weigh offence more than defence, and treat turnovers, red-zone and third-down rates, fumbles and
  field goals as mostly noise that regresses hard.
- The bar is the closing line, not 50%: nothing here beats it alone. Where a model could beat it is
  a question for the next prompts (line moves, injuries, the quarterback when the line has not caught up,
  special teams).

## How it was done

- **Data.** `build.py` turns the play-by-play into one row per team per game, every stat kept as a
  numerator and a denominator, so a season to date pools the plays rather than averaging games. Its
  docstring gives every definition. In short: snaps are passes and runs (sacks and scrambles in; kneels,
  spikes, two-point tries and plays a penalty wiped out left out); a fumble is the fumbling team's;
  penalties are the accepted ones; drives are nflfastR's fixed drives worked out from their own plays;
  "neutral" is win probability 20-80% outside the last two minutes of a half. CPOE, QB hits and air yards
  start in 2006.
- **In the game.** `rank.py` scores each stat's gap between the two teams. The direction (is more better?)
  is the one that picks more winners. A stat "follows the score" when its edge on neutral snaps is less
  than half its edge on a random set of as many snaps (fewer snaps alone cost a stat some edge), or for a
  reason those cannot test (time of possession, fourth-down attempts, kickoff returns, drive start,
  rushing yards, each with its reason in the table); those stay out of every forward selection. The
  distinct signals are a
  greedy forward selection on log loss, fitted leaving one season out, on the box-score stats (EPA left
  out, since EPA with special teams and penalties all but adds up to the score); it is run on each era too,
  and only its first two steps agree in both.
- **Before the game.** Season to date entering the game, both teams with three games behind them (5,110
  games); weeks 1-3 apart. Each indicator: the pick rate with a 90% interval from resampling whole seasons;
  the log loss of a logistic regression on it alone; and the change in log loss when it is added to the
  closing spread (with a cubic term), each scored on a season left out of the fit. Reliability is the
  correlation of each team-season's odd games with its even games, stepped up to a season
  (Spearman-Brown). A gap within a billionth of zero is level. The ratings (Elo, SRS, the blend, the
  quarterback) are read on the same games; the 2006-on stats on the games from 2006.
- **The ratings and the quarterback** have their constants fixed in advance, never tuned here:
  FiveThirtyEight's published NFL Elo (K 20, their margin multiplier, home field 65, a third back to 1505
  each season, from 1999 so 2003 starts warm); SRS with a ridge of 3 games, every game this season before
  the one called, ties too; the blend (n games of this season, 4 of last regular season's at
  two-thirds); the starter (games.csv's, or the game's lead passer in the 44 team-games where games.csv's
  took no dropback) and his EPA per dropback over his 16 games before this one, for any team, from 1999,
  pulled toward -0.10 with 200 dropbacks.
- **Checked.** Two rounds of independent review. The per-game totals were rebuilt from the raw plays with
  separate code and matched on all 12,464 team-games, the box scores were checked against ESPN's for 230
  games, and every rate and rating here was recomputed independently to the fourth decimal. What the
  reviews found was fixed before these numbers: two-point tries counted as snaps; nflfastR's drive columns
  misaligned in about one game in eleven; a re-kicked kickoff taken as a drive start; accepted 0-yard
  penalties dropped; kneel-downs counted as drives and as failed third downs (a victory formation is no
  drive: yards per drive rose from 67.6% to 72.2%); rushing yards and drive start not flagged; a flag rule
  with no allowance for fewer snaps; floating-point noise splitting level games; the quarterbacks' form
  starting cold in 2003; and the missing ratings, quarterback and drive success rate.

## Caveats

- An in-game indicator is not a cause: EPA and ANY/A count the touchdowns that decide the score.
- The pre-game ranks inside the top 15 are mostly within each other's intervals; read them as tiers.
- The forward selections' later steps are not stable (in the game only the first two agree across the two
  eras; before it, a step whose interval crosses zero is not a signal).
- The ratings' and the quarterback's constants are reasonable published or round values, not fitted; a
  model would fit them, on seasons it is then not judged on.
- 2024 and 2025 are in the exploration (the owner's call), so they are no longer unseen; 2026 on is the
  final exam.

## Run it

```
python3 -I research/fetch.py                  # once: nflverse games.csv and play-by-play 2003-2025 (about 400 MB, gitignored)
python3 -I research/win_indicators/build.py   # out/team_games.parquet and out/qb_games.parquet (about 2 minutes)
python3 -I research/win_indicators/rank.py    # results/*.csv and benchmarks.json (about a minute)
python3 -I research/win_indicators/report.py  # the tables above, from results/
```

`results/`: `in_game.csv` (every stat), `in_game_top15.csv`, `in_game_forward*.csv`, `pre_game.csv`
(every indicator), `pre_game_forward*.csv` (and `pre_game_forward_on_line_null.json`, what its first
step finds by chance), `pre_game_weeks_1_3.csv`, `pre_game_all_games.csv`,
`pre_game_qb_change.csv`, `pre_game_offence_defence.csv`, `benchmarks.json`.
