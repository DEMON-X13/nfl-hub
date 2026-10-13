# Research toward the next model

The homework before the next game model (the owner's call, 12 October 2026: the models so far
"are not going far enough"). Each study answers one question the owner asks, with the scripts and
the results committed so it can be run again. **No model is built here until the owner gives the
all clear**: a study may fit a small regression to ask whether something carries signal, but
nothing is frozen as a formula or wired into a site.

## The rules every study keeps

- **Seasons.** 2003-2025 are explored (`SEASONS` in `common.py`). 2026 on is the final exam
  (`HOLDOUT_FROM`): never downloaded or read by a study, so a model can be tested on seasons it has
  never seen. `exam/` is the one place it is read, only to apply an equation already frozen
  (`common.open_exam()`); nothing is fitted or chosen there. The cut was 2024 until the owner put 2024 and 2025 into the exploration on
  12 October 2026 ("we are just collecting data right now").
- **The data** is nflverse's: `games.csv` (schedule, scores, closing lines) and the play-by-play,
  downloaded by `python3 -I research/fetch.py` into `research/data/raw/` (gitignored, about
  450 MB). 1999-2002 are read only to warm up a history (a rating, a quarterback's form entering
  2003), never explored. `common.py`'s loaders refuse a held-out season. Study 5 also reads
  FiveThirtyEight's own Elo files (`fetch.py --fivethirtyeight`: `nfl_elo.csv`, 1920-2022, read from 1950
  only to check 538's own arithmetic, not to explore football, and 538's `nfl-elo-game` file, read only to
  check that copy), nflverse's weekly player stats 1999-2025 and draft picks, and the betting job's frozen
  preseason win totals for 2019-2025 (`betting/joker/data/win_totals.csv`).
- **Answer the question asked.** The owner is asking questions about football, not about Vegas: the
  betting line is not the yardstick for a study unless he asks about it ("im not asking about vegas
  or about beating the closing line. im just asking questions", 13 October 2026).
- **Honest numbers.** A rate is shown on the games it was measured on. Anything that predicts is
  scored on seasons it was not fitted on (leave one season out, or walk forward), with an interval,
  and many stats tried at once are read as many tries, not one.
- **Each study** has its own folder, a README with the question, the method, the answer and the
  numbers, and the scripts that produce them; its `out/` (built tables) is gitignored, its
  `results/` committed.

## The studies

| # | Folder | The question | Answer in short |
|---|---|---|---|
| 1 | `win_indicators/` | Since 2003, what are the top 15 win indicators in the NFL? | In the game, passing efficiency and EPA (86%), drive success and turnover margin; before it, team strength with memory (Elo, blended point differential, about 63.5%) and the starting quarterback; turnovers, red-zone and third-down rates barely carry from week to week |
| 2 | `elo_vs_site/` | How is the Elo rating different from ours? | Same family as the betting app's Elo (same picks; the app's raw chances run too sure); Team Rankings has no memory: FiveThirtyEight's Elo picked more winners in 17 of 23 seasons (64.3% against 62.9%), Team Rankings level or ahead from week 10; the player-based ELO Model beats a team Elo from 2020 |
| 3 | `equation15/` | An equation on the 15 indicators, weighted and tested on 2024 and 2025 (the owner asked for it) | The pre-game 15 with a ridge pull: 65.2% right on 2004-2023, each season left out (65.0% counting the choice among near-tied variations), 61 games more than the FiveThirtyEight Elo alone there; 64.7% on 2024-2025 (66.7% and 62.7%), where Elo alone picked 66.4%, a gap within chance |
| 4 | `models_compare/` | Should the site narrow its models? The five run side by side over past seasons | On 2021-2025, each refitted season by season: 63.0% to 66.1%, 41 games apart of 1,355; all five pick alike in 61% of games, Alpha and the Challenger in 92% (57-51 where they differ); the Joker and the ELO Model differ most, and alone against the other four were wrong more often than right (38-82, 38-59); Broly picks the betting favourite in 98% |
| 5 | `fivethirtyeight/` | Can we replicate FiveThirtyEight's NFL model and keep it going? Its quarterback version rebuilt and tested against Alpha, the Joker and the ELO Model | Yes: fed 538's inputs it picks 538's team in 99.7% of 2003-2022 games; with nothing from 538 but its constants, 95.0% (98.2% from 2019, when we have the market's win totals). 65.0% right over 2003-2025 (plain Elo 64.2%) with the starter known at kickoff, 65.1% with each team's previous starter (Brier 0.2178 against 0.2165); on 2021-2025 regular seasons 64.1%, third of four (Alpha 64.9%, the ELO Model 64.4%, the Joker 63.0%), no gap in picks beyond chance; the best Brier there (0.2201), but with the previous starter 0.2224, level with Alpha and the Joker; the same team as Alpha in 85.8% of games (the retired Challenger 92.0%) |
| exam | `exam/` | How would that formula do in a blind test for this year? Worth tracking, or too like the site's models? | Study 3's frozen equation on 2026: 48 right, 29 wrong, 1 tie through 11 October (62.3%); it picks the same team as Alpha in 92% of games, with the same record, so it is close to a copy of Alpha |
