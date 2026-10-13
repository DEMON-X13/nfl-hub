# Study 5: FiveThirtyEight's NFL model, rebuilt and run on

**The owner (13 October 2026):** "are we able to take all of its data and grab the model and keep it going as
one of our projections?" He said yes to the plan put to him: build the quarterback version as a study, test it
on past seasons against Alpha, the Joker and the ELO Model, and then he decides whether it goes on the site.
This README sets out what the study found; the decision is his.

## The answer in short

- **It can be replicated.** FiveThirtyEight's quarterback-adjusted Elo ("QB Elo") is a set of rules and
  constants, and the rules here reproduce 538's own published numbers, with exceptions listed below: a few
  hand entries of 538's, 9 of its 2019-2022 forecasts made with another quarterback than the one its file
  names, 14 of its 2019 forecasts off for no reason found, 19 opening team quarterback ratings of 2019 up to
  1.03 Elo off, and its 1999-2018 backfill, whose own ratings and chances disagree by a median 1.1 Elo. Given
  538's own inputs, the rebuild picks the same team as 538 in 99.7% of the 5,377 games of 2003-2022, and its
  chances are 0.16 points from 538's on average.
- **It can be kept going without anything from 538 beyond its published constants**: nflverse's data, the market's preseason win totals and,
  for a forecast, the expected starter. With nothing from 538 it picks the same team as 538 in 95.0%
  of 2003-2022 games: 98.2% in 2019-2022 and 94.2% in 2003-2018. The gap before 2019 is one input, the market's
  preseason win totals, which 538 blended into each season's opening ratings and which we have only from
  2019. Given 538's own win-total lines for 2004-2018, the same run agrees with 538 in 98.9% of 2003-2018 games.
- **The starter is given, not forecast.** The QB Elo's records below are made with the starter as he turned
  out: the first quarterback to drop back. A forecast made before kickoff has to guess him. The same model
  forecasting each game with the team's previous starter (PREGAME: no injury or benching news at all) is the
  lower bound; a forecast that reads the week's news lies between the two.
- **How it did.** Over every game of 2003-2025, playoffs in, it picked 4,041 right and 2,177 wrong (65.0%,
  Brier score 0.2165), against 3,992-2,226 (64.2%, 0.2203) for plain Elo, the same model without the
  quarterback. PREGAME went 4,047-2,171 (65.1%, 0.2178): as many picks right, its chances further from the
  results. On 2023-2025, seasons 538 never forecast, the QB Elo went 564-290 (66.0%), PREGAME 559-295 (65.5%)
  and plain Elo 551-303 (64.5%).
- **Against the site's models**, on study 4's 1,355 decided regular-season games of 2021-2025, it is third of
  four by picks: Alpha 880-475 (64.9%), the ELO Model 872-483 (64.4%), the QB Elo 868-487 (64.1%), the Joker
  854-501 (63.0%); PREGAME 870-485 (64.2%). By its chances it is first: Brier 0.2201 against the ELO Model's
  0.2217, Alpha's 0.2225 and the Joker's 0.2227. That lead is about what knowing the starter is worth: PREGAME's
  Brier is 0.2224, level with Alpha and the Joker and behind the ELO Model. Of the six paired intervals on the
  QB Elo's lead (three models, Brier and log loss), only the log loss against Alpha clears zero, just, which is
  about what six tries give by chance; where any two of these models pick differently, neither is right more
  often than chance readily gives. The models were not given the same quarterback either: study 4 gave Alpha
  and the Joker the passer with the most dropbacks (more hindsight still) and the ELO Model the lineup expected
  before kickoff.
- **How distinct it is.** It picks the same team as Alpha in 85.8% of games, the closest pair of the four
  (Alpha and the ELO Model agree on 79.8%, Alpha and the Joker on 75.2%). For scale, the Challenger, retired
  as a near copy of Alpha, agreed with Alpha on 92.0%; the QB Elo agrees about as much with the Challenger
  (87.3%), with Broly (87.5%) and with its own plain Elo (87.1%), and picks the closing line's favourite in 87.7%
  of games, more than Alpha (84.3%), the ELO Model (81.9%) or the Joker (81.5%). In the 192 games where it and
  Alpha differ, Alpha was right 102 times and the QB Elo 90.

## What FiveThirtyEight published, and where the data came from

538 published NFL Elo forecasts from 2014 and added the quarterback adjustment in 2019, with a backfill of
the seasons before. It stopped updating its sports forecasts in June 2023, and ABC closed the site on
5 March 2025. Every figure in this section is in `results/facts.csv` unless another file is named.

- **The file.** `nfl_elo.csv`: 17,379 games, from 26 September 1920 to the Super Bowl of 12 February 2023. For
  each game it has both teams' plain Elo and QB Elo before and after, each starting quarterback by name, his
  value before and after, his game value and his adjustment, the two chances and the score (the quarterback
  columns from 1950). Its host, projects.fivethirtyeight.com, no longer serves it. This study reads the copy
  kept on GitHub in Jonathan Cervas's `jcervas/Data` repository (master branch,
  `fivethirtyeight/projects.fivethirtyeight.com/nfl-api/nfl_elo.csv`, 5,897,663 bytes, SHA-256
  `8f6831ac223de245b612044601bc369a6b222a808cb55e737939504118525733`), which says it is the last good
  Wayback Machine capture. `qbelo.py` checks that copy on every run against 538's own `nfl-elo-game`
  repository (`data/nfl_games.csv`, SHA-256 `af16cf3c5848393057fad07feea278f0a85ab7b57ddbfe42ed96b5c80e7d519d`):
  all 16,810 games there (1920 to the 2020 season) are in the copy, with the same plain ratings before the game
  and the same scores; the plain chance differs in one, Super Bowl XLIII (1 February 2009: 0.668 in
  `nfl-elo-game`, 0.581 in the copy). The copy's 6,421 games of 1999-2022 all match an nflverse final on the
  same date with the same score. `python3 -I research/fetch.py --fivethirtyeight` downloads both files and
  refuses any other SHA-256. They are kept in `research/data/` (gitignored) and never committed.
- **The licence.** 538's data is under the Creative Commons Attribution 4.0 International licence
  (https://creativecommons.org/licenses/by/4.0/). **Data: FiveThirtyEight**, from the two files named above.
  This study adapts 538's method and compares against its file; `results/calls_2003_2025.csv` carries 538's
  published chances beside ours (the `f538_` columns), changed as follows: turned to the schedule's home team
  where 538's team1 was the away team, written to six decimals, and a pick derived from each. Neither
  FiveThirtyEight nor ABC News is connected with this site or endorses it.
- **The method in words.** 538's page "How Our NFL Predictions Work" is gone with the site; a full text copy
  of its 2022 version is kept in `bohndesverband/rfl-data` (`R/elo/README.md`). It gives the quarterback
  formula (VALUE), the 3.3 that turns VALUE into Elo, K = 20, the 25-point bye, 4 points per 1,000 miles,
  the 1.2 playoff multiplier and the one-third reversion. It does not give the defence adjustment's
  weight, how a win total becomes Elo, the rookie scale, or how its home field was worked out. Those were
  read back from the file.
- **The games and the quarterbacks are nflverse's** (through `research/common.py`, which refuses 2026 on):
  `games.csv` from 1999 (read 12 October 2026), the play-by-play 1999-2025 (only to find each team's first
  quarterback dropback), the weekly player stats 1999-2025 and the draft picks before 2026 (read 13 October
  2026).
- **The win totals** are the betting job's frozen file, `betting/joker/data/win_totals.csv`: each team's
  preseason win-total line as expected wins with the margin out, 2019-2025 (any 2026 row and
  `win_totals_2026.csv` are not read). When and where the betting job took the 2019-2025 lines is not recorded
  in this repo. The numbers say they are preseason lines: they correlate 0.547 with the team's win share in
  that season and 0.768 with its win share the season before (a line set after the season would track its own
  season far more closely), and they sit 0.18 wins on average from the totals 538's own 2019-2022 openers imply
  (correlation 0.992).
- **Club and venue locations** are this folder's `locations.csv` and `venues.csv`, coordinates typed from
  Wikipedia from memory. Each franchise's home point is where 538 measured it from (538 kept the 49ers at
  Candlestick, both Los Angeles clubs at SoFi and the Raiders at Las Vegas; in its 2019 forecasts alone it had
  the Rams at St. Louis, the Chargers at San Diego and the Raiders at Oakland). The franchise points are
  confirmed by the forecast check below: 538's 2019-2022 forecasts come out to under 0.001 Elo
  (`results/rule_checks.csv`). Of the neutral Super Bowls 538 never forecast, Allegiant Stadium (2023 season)
  and the Superdome (2024) are the Raiders' and the Saints' home points, so the same check covers them; Levi's
  Stadium (2025) is checked against nothing, and a mile off there would move that game's home term by under
  0.01 Elo.

## The model

Before each game, each team's rating is adjusted by its starting quarterback against the team's usual
quarterback, a home term is added, and the gap becomes a chance: 1 / (1 + 10^(-gap/400)). After the game
both ratings move by the result. A quarterback's value is a rolling average of his game values, and a game
value is his box score turned into one number (VALUE) and corrected for the defence he faced.

V below is the starter's value as the team rating and the adjustment read it: from 2019 his value itself; to
2018, in 538's backfill, a copy of his value that is updated after each game like the value but never
reverted between seasons (538's adjustment and value disagree by exactly that reversion).

| Rule | Constant | How closely it matches 538's own numbers |
|---|---|---|
| Chance from the gap: team ratings + quarterback adjustments + home term, times 1.2 in the playoffs | 1.2 | 538's live forecasts 2019-2022: 1,069 of 1,093 games to 0.001 Elo (median 0.0002), once 12 hand entries are set aside (below) |
| Home term: base + 4 Elo per 1,000 miles between the clubs' home points + 25 for a team off a bye | base 55 (to 2019, and 2021), 33 (2020), 48.68 to 50.50 (2022, by date); 4; 25 | in the check above; a game abroad gets the bye term alone, a neutral Super Bowl the travel difference to the venue (from 2019) |
| Rating update: 20 x the margin multiplier x (result - chance) | K = 20 | 1,094 of 1,105 updates in 2019-2022 to 0.001 Elo (on 538's own chance) |
| Opening rating: 1/3 last season's (itself a third of the way back to 1505) + 2/3 the market's: 1171.4 + 40.71 per win of the preseason win total | 1171.4, 40.71 | 1999-2018: 634 of 636 team-seasons to 1e-8 Elo on 538's own half-win lines; 2019-2022 with our win totals: 6.3 Elo apart (root mean square; plain reversion alone 28.9) |
| VALUE: -2.2 Att + 3.7 Cmp + Yds/5 + 11.3 TD - 14.1 Int - 8 Sacked - 1.1 Carries + 0.6 RushYds + 15.9 RushTD | the page's | 538's VALUE equals nflverse's box score to 0.01 in 8,279 of 8,543 QB-games of 2003-2018 and 1,928 of 2,210 of 2019-2022 (on average 0.43 and 2.22 Elo apart) |
| Game value: 3.3 x (VALUE + the opposing defence's rating) | 3.3 | the same check: the defence chain below is what makes 538's game values come out as nflverse's box scores |
| Defence: a rolling VALUE allowed against the league level, which is X/3.3 to 2018 and held at 2019's from then on | 0.05 a game; to 2018 decaying by 0.95, from 2019 not | not published by 538; recovered from its game values (the check above) |
| Quarterback value after a game: 0.9 before + 0.1 game value | 0.1 | all 30,434 QB-games of 1950-2022 to 2e-13 |
| Between seasons: a quarterback with 10 to 100 career starts moves 1/4 toward the season's average start (X); any other keeps his value | 0.25 | all 1,778 such moves of 1951-2022 give one X a season, to 2e-9; all 1,073 others unchanged, to 1e-9 |
| X: 3.3 x the mean VALUE of the three previous regular seasons (to 2019); the mean game value of the three previous seasons (from 2020) | 3 seasons | every season 1999-2022 to 3e-10 |
| First start ever: 0.45342 x (250 - draft pick) x min(1, (season - 1970)/35), 0 undrafted | 0.45342 | 247 of 251 first starts of 1999-2022 to 1e-9 (the 4 others below) |
| Team quarterback rating: 0.95 before + 0.05 the starter's game value; at a season's first game 2/9 last season's + 6/9 the starter's V + 1/9 X | 0.05; 2/9, 6/9, 1/9 | 28,503 of 28,508 team-games of 1950-2022 to 1e-9 (the 5 others below); 1,857 of 1,879 season starts to 0.01 Elo (the misses below) |
| Adjustment: the starter's V - the team rating | | in the forecast check |
| The starter: the team's first dropback (pass, sack or scramble) by a player nflverse lists at QB | | 12,833 of 12,842 team-games of 1999-2022 are 538's named starter (games.csv's named starter: 53 differ) |
| Plain Elo: K 20, home field 65 (0 at a neutral site), a third back to 1505 each summer | 65 | 6,412 of 6,421 chances of 1999-2022 to 1e-6; 6,418 of 6,421 updates to 0.001 Elo |

`results/rule_checks.csv` has every check, each at the bound quoted here (`tolerance`, `n_within`). Where 538's
rules stop, three choices were made:

- **The win total on a 16-game scale.** From 2021 a season has 17 games; the win total is put on 538's 16-game
  scale (x 16/17). 538's own 2021 and 2022 openers imply totals 0.04 wins under and 0.02 over ours on that
  scale on average, against 0.55 and 0.48 under the 17-game totals unscaled.
- **The defence's league level** is held at 2019's from 2019 on, as the replay of 538's game values has it.
- **PROOF's 2019-2022 win totals** are read back off 538's own opening ratings, so PROOF's openers there are
  538's by construction.

Two parts of 538's file do not follow the rules exactly:

- **538's 2019-2022 forecasts** miss on 36 of 1,105 games (`results/forecast_misses_2019_2022.csv`). Twelve
  are hand entries (below). Nine were forecast with another of the team's quarterbacks than the one the file
  names as the starter; with him the miss is gone (Sam Ehlinger rather than Matt Ryan for the Colts against
  the Raiders in 2022, for one). One is the Packers-Saints opener of 2021, moved to Jacksonville, which 538
  called neutral. The other 14, all in 2019, are 0.4 to 86 Elo off for no reason found. Nineteen teams'
  quarterback ratings at the 2019 opener are up to 1.03 Elo off the season-start rule, where 538's live code
  took over from its backfill.
- **538's backfill (the 1999-2018 forecasts, made in 2019)** is less tidy. Its published ratings and its
  chances disagree with each other by a median 1.1 Elo (0.13 points of chance), with no pattern found. The
  chances are what the rebuild reproduces: fed 538's inputs it matches them to a median 0.02 points
  (`results/validation.csv`, PROOF 2003-2018).

## The runs

| Run | What it is |
|---|---|
| REBUILD | The model this study tests. From 1999 on nflverse data and, from 2019, the market's preseason win totals: every club at 1505 at 1999's first game (the Browns, new that year, at 1300), and every quarterback valued by his draft pick at his first start in the data. 1999-2002 is a warm-up; 2003 on is compared. Win totals from 2019, none before (plain reversion). 538's home field through 2022, then 48.68 held. First-dropback starters: the starter as he turned out. No hand inputs. |
| PREGAME | REBUILD forecasting before kickoff with no team news: each team's starter is taken to be its previous one (that season's, or at its first game of a season the last of the season before; a rookie is unknown until his first start), in the quarterback adjustment and in the season's opening team rating alike, as 538 built its own opening ratings on the projected starter. The ratings move after each game on the actual starter, so they are REBUILD's, game for game; only the forecast differs. |
| LINES | REBUILD with 538's own preseason win-total lines for 2004-2018, read back from its file (each team's first rating of a season sits exactly on a half-win line). |
| PROOF | 538's own inputs: its state entering 2003, its named quarterbacks and their VALUE, its win totals and its hand entries. It tests the rules alone. |
| SENSITIVITY | REBUILD with the 2023-2025 home field scaled with the league's home margin (below). |

Started instead from 538's own state entering 2003, REBUILD's chances are 2.0 points different on average in
2003 (10 picks differ), 0.45 in 2004 (3 differ), and no game is more than 0.015 points apart from 2013 on
(`results/warmup.csv`). Where the run starts does not matter after a few seasons.

## What could not be recovered, and the choices made

- **Win totals before 2019.** 538 blended the market's win total into every season's opening ratings, at
  two-thirds weight. The win totals here start in 2019, so REBUILD uses the plain reversion before that.
  538's own lines can be read back off its file for 1999-2018 (634 of 636 team-seasons), and LINES uses them
  for 2004-2018 to show they are the gap. They are 538's inputs, not ours, so REBUILD does not use them. Even
  for 2019-2022, the betting job's totals are not 538's: they are 0.18 wins apart on average.
- **The home field from 2023.** 538's 2022 page gives "roughly 48 points", "based on a rolling 10-year
  average of home-field advantage, and changes during the season", but not how. Its file has 48.68 from the
  start of 2022, rising to 50.50 by the Super Bowl, and nothing after. REBUILD holds 48.68.
  SENSITIVITY instead scales it with the mean home margin over the ten seasons before, tied to 538's 2022
  value: 48.68 / 2.009 points (2012-2021) = 24.23 Elo a point. That gives 47.82 in 2023, 47.38 in 2024 and
  45.74 in 2025 (`results/sensitivity.csv`). It changes 2 picks of 855 and the chances by 0.1 to 0.4 points
  on average: 562-292 against REBUILD's 564-290.
- **538's hand entries**, which no rule produces, are left out of REBUILD and fed to PROOF:
  - A 250-point cut for a team resting its starters in a game that means nothing to it (from 2021 the page's
    rule for a team that has locked its playoff seed, with neither rating moving after): 34 games of
    1999-2022, 4 of them in 2019-2022. A rebuild would need to know which teams had clinched; nflverse does
    not say.
  - Tampa Bay's eight 2020 road games, where the home side's 33 points went the other way (66 apart).
  - Three opening team ratings built on the projected starter, not the week-1 starter: Houston 2021 and
    Cleveland 2022 on Deshaun Watson (538's ratings 72.22 and 74.02 Elo above what the season-start rule gives
    with the week-1 starter), the Jets 2022 on Zach Wilson (18.91 below).
  - Five week-18 starts 538 left out of its quarterback ratings (Green Bay 2021; the Chargers, Tampa Bay,
    the Eagles and the Giants 2022).
  - Four first values off its own draft rule: Terrelle Pryor (2011 supplemental draft) got the first pick's;
    Devlin Hodges, David Blough and John Wolford, undrafted, got the 188th pick's (`qbelo.py`'s
    `hand_inputs`).
  - Six games moved inside the US that 538 called neutral (five in its backfill, and the Packers-Saints game
    of 2021). REBUILD keeps the home team's home field there, as 538's live file did for the 49ers in Arizona
    in 2020 and the Bills in Detroit in 2022.
- **The 2019 relaunch.** REBUILD follows 538's file where a rule exists: the 2019 locations, the bye bonus
  from 28 October 2019 (none earlier that season; in the backfill, 11 days' rest or more), the Super Bowl
  travel term from 2019. The 2019 misses above are left as they are.
- **Box scores.** 538's own box score for a quarterback is not always nflverse's (1,928 of 2,210 the same in
  2019-2022, above). The rebuild uses nflverse's.
- **Starters.** REBUILD's starter is the first quarterback to drop back, which is known only once the game
  has begun; PREGAME is the forecast without it (the sections below). games.csv's named starter is no
  pre-game record either: it differs from the first dropback in 0, 37 and 8 team-games of 2023-2025, and those
  are games.csv's errors, not doubt about the starter. In 33 of 2024's 37 (and 7 of 2025's 8) the quarterback
  games.csv names has no line in the game's stats at all (Marcus Mariota for Jayden Daniels in five Washington
  games, Andy Dalton for Bryce Young, Joe Flacco for Anthony Richardson and Mason Rudolph for Will Levis in
  several each); in the other 4 (and 1) he played, but another quarterback dropped back first. `qbelo.py`
  prints every one.

## How close it comes to 538

Against 538's published chance, game by game (`results/validation.csv`, each season apart there):

| Run | Seasons | Same pick as 538 | Correlation of the chances | Mean difference in chance |
|---|---|---|---|---|
| REBUILD | 2003-2018 | 94.2% (249 of 4,272 differ) | 0.972 | 2.7 points |
| REBUILD | 2019-2022 | 98.2% (20 of 1,105) | 0.992 | 0.9 points |
| REBUILD | 2003-2022 | 95.0% (269 of 5,377) | 0.976 | 2.3 points |
| LINES | 2003-2018 | 98.9% (46) | 0.988 | 0.6 points |
| LINES | 2003-2022 | 98.7% (68) | 0.989 | 0.7 points |
| PROOF | 2003-2018 | 99.6% (16) | 0.999 | 0.17 points |
| PROOF | 2019-2022 | 99.8% (2) | 0.999 | 0.09 points |
| PROOF | 2003-2022 | 99.7% (18) | 0.999 | 0.16 points |

LINES's 2003 is REBUILD's (its lines start in 2004). REBUILD's 2019-2022 differences come from the hand
entries, the box scores and the win totals.

## The records

Every game, playoffs in; a tie is no decision (14 ties in 2003-2025). `results/records.csv` has each season and
each Brier score (the mean squared error of the chance; lower is better).

| Model | 2003-2018 | 2019-2022 | 2003-2022 | 2023-2025 | 2003-2025 |
|---|---|---|---|---|---|
| QB Elo (REBUILD) | 2,774-1,490 (65.1%) | 703-397 (63.9%) | 3,477-1,887 (64.8%) | 564-290 (66.0%) | **4,041-2,177 (65.0%)** |
| QB Elo, pregame starter (PREGAME) | 2,777-1,487 (65.1%) | 711-389 (64.6%) | 3,488-1,876 (65.0%) | 559-295 (65.5%) | 4,047-2,171 (65.1%) |
| Plain Elo (ours) | 2,750-1,514 (64.5%) | 691-409 (62.8%) | 3,441-1,923 (64.1%) | 551-303 (64.5%) | 3,992-2,226 (64.2%) |
| 538's QB Elo, as published | 2,821-1,443 (66.2%) | 703-397 (63.9%) | 3,524-1,840 (65.7%) | | |
| 538's plain Elo, as published | 2,750-1,514 (64.5%) | 690-410 (62.7%) | 3,440-1,924 (64.1%) | | |
| QB Elo with 538's lines (LINES) | 2,819-1,445 (66.1%) | 703-397 (63.9%) | 3,522-1,842 (65.7%) | | |
| QB Elo fed 538's inputs (PROOF) | 2,827-1,437 (66.3%) | 705-395 (64.1%) | 3,532-1,832 (65.8%) | | |

- **Our plain Elo is 538's.** It picks 538's team in all but 7 of the 5,377 games of 2003-2022 (mostly games
  538 called neutral, which the rule keeps as home games, and their knock-on effects) and has 538's record in
  every season but 2020, where one game differs.
- **The quarterback is worth about a point of picks, with or without the starter known.** Over 2003-2025 the
  QB Elo and plain Elo pick the same team in 91.4% of 6,218 decided games. Where they differ (537 games), the
  QB Elo was right 293 times and plain Elo 244, a split chance gives about one time in 26 (`results/
  compare_long_run.csv`). Its chances were also closer to the results: a Brier score of 0.2165 against 0.2203.
  PREGAME keeps the gain: where it and plain Elo differ (485 games) it was right 270 times and plain Elo 215
  (chance gives that about one time in 70), Brier 0.2178. In 538's own file the same holds: where 538's QB Elo
  and its plain Elo differ on 2003-2022 (528 games), the QB Elo was right 306 times and plain Elo 222.
- **What knowing the starter is worth shows in the chances, not the picks.** The QB Elo and PREGAME differ on
  182 picks of 2003-2025 and split them 88-94, a split chance gives often (71%). But PREGAME's chances are less
  sure where it guessed the starter wrong: Brier 0.2178 against the QB Elo's 0.2165 over 2003-2025, 0.2185
  against 0.2147 on 2023-2025. In 2003-2025 the starter was not the team's previous one in 1,384 of 12,464
  team-games (11.1%), and in 1,290 of those (93.2%) the previous starter did not play at all.
- **The rebuild trails 538 before 2019, by the win totals.** Where REBUILD and 538's published QB Elo differ on
  2003-2018 (247 games), 538 was right 147 times and the rebuild 100; on 2019-2022 (20 games) they split
  10-10. With 538's lines (LINES), the record matches 538's to two games over 2003-2022.

## Against Alpha, the Joker and the ELO Model

The 2021-2025 regular season, the same games as study 4 (`../models_compare/results/after_team_codes/
calls_2021_2025.csv`, with the team-code fix): 1,359 games, 4 ties, 1,355 decided, and all five call every
one. Alpha, the Joker and the ELO Model were refitted season by season on the seasons before (study 4); the QB
Elo has nothing fitted, only 538's constants.

**They were not given the same quarterback.** The QB Elo is given the game's actual starter, the first
quarterback to drop back. Study 4 gave Alpha and the Joker the passer with the most dropbacks in the game,
more hindsight still: it knows of an injury during the game (122 team-games, study 4's README). It gave the
ELO Model the lineup expected before kickoff. PREGAME, the QB Elo with each team's previous starter, is the
lower bound for a QB Elo forecasting before kickoff; the truth lies between it and the QB Elo, since the
previous starter ignores every change announced before kickoff. That holds for the chances, not for a pick
count: other reasonable versions of the guess (moving the ratings on the guessed starter, or building the week-1
rating on the actual one) go 861 to 870 right on these games with a Brier score of 0.2224 to 0.2227, so
PREGAME's two picks more than the QB Elo are noise. In these seasons the starter was not the
team's previous one in 369 of 2,718 team-games (13.6%), and in 341 of those (92.4%) the previous starter did
not play at all.

| Model | 2021 | 2022 | 2023 | 2024 | 2025 | 2023-2025 | 2021-2025 |
|---|---|---|---|---|---|---|---|
| Alpha | 173-98 | 168-101 | 168-104 | 192-80 | 179-92 | 539-276 (66.1%) | **880-475 (64.9%)** |
| ELO Model | 174-97 | 167-102 | 166-106 | 189-83 | 176-95 | 531-284 (65.2%) | 872-483 (64.4%) |
| QB Elo | 164-107 | 168-101 | 171-101 | 186-86 | 179-92 | 536-279 (65.8%) | 868-487 (64.1%) |
| QB Elo, pregame starter | 168-103 | 170-99 | 170-102 | 188-84 | 174-97 | 532-283 (65.3%) | 870-485 (64.2%) |
| Joker | 167-104 | 166-103 | 167-105 | 185-87 | 169-102 | 521-294 (63.9%) | 854-501 (63.0%) |

Among the four (PREGAME aside), the QB Elo had the most right in 2023, tied Alpha for the most in 2022 and
2025, and had the fewest in 2021. On 2023-2025, seasons no choice of 538's saw, it went 536-279, between Alpha
(539-276) and the ELO Model (531-284); PREGAME went 532-283.

**The chances** (`results/compare_scores.csv` and `compare_score_diffs.csv`): the Brier score and the log loss
(the mean of -ln of the chance given to what happened; lower is better) on the same 1,355 games, and the QB
Elo's difference to each of the others with a 90% interval from 10,000 paired resamples of the games (seeded,
so a rerun gives the same):

| Model | Brier | Log loss |
|---|---|---|
| QB Elo | **0.2201** | **0.6286** |
| ELO Model | 0.2217 | 0.6346 |
| QB Elo, pregame starter | 0.2224 | 0.6349 |
| Alpha | 0.2225 | 0.6364 |
| Joker | 0.2227 | 0.6361 |

| Difference | Brier (90% interval) | Log loss (90% interval) |
|---|---|---|
| QB Elo - Alpha | -0.0024 (-0.0057 to +0.0011) | -0.0078 (-0.0154 to -0.0001) |
| QB Elo - Joker | -0.0026 (-0.0077 to +0.0027) | -0.0074 (-0.0191 to +0.0043) |
| QB Elo - ELO Model | -0.0016 (-0.0062 to +0.0029) | -0.0059 (-0.0162 to +0.0043) |
| QB Elo - QB Elo, pregame starter | -0.0023 (-0.0043 to -0.0003) | -0.0062 (-0.0110 to -0.0016) |
| QB Elo, pregame starter - Alpha | -0.0001 (-0.0036 to +0.0036) | -0.0015 (-0.0096 to +0.0066) |
| QB Elo, pregame starter - Joker | -0.0003 (-0.0056 to +0.0052) | -0.0012 (-0.0135 to +0.0112) |
| QB Elo, pregame starter - ELO Model | +0.0007 (-0.0039 to +0.0052) | +0.0003 (-0.0100 to +0.0106) |

The QB Elo's lead on the chances is about the size of what knowing the starter is worth: with the previous
starter instead, its Brier rises from 0.2201 to 0.2224 (an interval clear of zero), level with Alpha and the
Joker and behind the ELO Model, and none of PREGAME's differences is beyond chance. Of the QB Elo's six
intervals against the site's models, only the log loss against Alpha clears zero, and only just (how far
depends on the resampling's seed); with six tries, one doing so is about what chance gives.

**How often two pick the same team:**

| | Alpha | Joker | ELO Model | QB Elo | QB Elo, pregame starter |
|---|---|---|---|---|---|
| Alpha | | 75.2% | 79.8% | 85.8% | 85.4% |
| Joker | 75.2% | | 74.8% | 77.0% | 76.7% |
| ELO Model | 79.8% | 74.8% | | 81.5% | 82.4% |
| QB Elo | 85.8% | 77.0% | 81.5% | | 96.3% |
| QB Elo, pregame starter | 85.4% | 76.7% | 82.4% | 96.3% | |

**When two differ, who was right:**

| Pair | Games they differ | Right: first | Right: second | Chance alone gives a split this uneven |
|---|---|---|---|---|
| Alpha, Joker | 336 | 181 | 155 | 17% |
| Alpha, ELO Model | 274 | 141 | 133 | 67% |
| Alpha, QB Elo | 192 | 102 | 90 | 43% |
| Alpha, QB Elo pregame | 198 | 104 | 94 | 52% |
| Joker, ELO Model | 342 | 162 | 180 | 36% |
| Joker, QB Elo | 312 | 149 | 163 | 46% |
| Joker, QB Elo pregame | 316 | 150 | 166 | 40% |
| ELO Model, QB Elo | 250 | 127 | 123 | 85% |
| ELO Model, QB Elo pregame | 238 | 120 | 118 | 95% |
| QB Elo, QB Elo pregame | 50 | 24 | 26 | 89% |

None is a gap chance rarely gives.

**One model alone against the other three** (the four of study 4's kind: PREGAME, a version of the QB Elo,
is not counted as a fifth voice):

| Model | Games alone | Its record in them |
|---|---|---|
| Joker | 160 | 64-96 (40%) |
| ELO Model | 98 | 43-55 (44%) |
| Alpha | 66 | 28-38 (42%) |
| QB Elo | 42 | 15-27 (36%) |

The QB Elo stands alone least often. All four agree on 837 games (61.8%), where they were right 593 times
(70.8%); they split 3 to 1 on 366 (27.0%), the majority right 216 times (59.0%); and 2 to 2 on 152 (11.2%).

**The QB Elo against Alpha, season by season:**

| Season | Same pick | Games they differ | QB Elo right | Alpha right |
|---|---|---|---|---|
| 2021 | 81.9% | 49 | 20 | 29 |
| 2022 | 85.1% | 40 | 20 | 20 |
| 2023 | 84.9% | 41 | 22 | 19 |
| 2024 | 89.7% | 28 | 11 | 17 |
| 2025 | 87.5% | 34 | 17 | 17 |
| 2021-2025 | 85.8% | 192 | 90 | 102 |

## How distinct it is

A description, as study 4 gave one for each of its models, not a yardstick (`results/compare_distinct.csv`
and `compare_favourite.csv`, the same 1,355 games). The Challenger, which the owner took off the site on
13 October 2026 as a near copy of Alpha, picked Alpha's team in 92.0% of games (where they differ, Alpha was
right 57 times and the Challenger 51). The QB Elo picks Alpha's team in 85.8%, and is about as close to the
Challenger, 87.3% (where they differ, the QB Elo right 83 times, the Challenger 89), to Broly, 87.5%, and to its
own plain Elo, 87.1% (the QB Elo right 97 times, plain Elo 78). Where it and Broly differ, Broly, built on the
moneylines, was right 103 times to the QB Elo's 67, a split chance gives about one time in 140. By design the
QB Elo is the Challenger's idea, a team Elo with two-thirds of each opening rating from the market's season
win total, plus a quarterback term. It reads no game's betting line, yet picks the closing line's favourite in
87.7% of games:

| Model | Picks the closing line's favourite |
|---|---|
| Broly (the moneylines are its input) | 98.7% |
| QB Elo | 87.7% |
| QB Elo, pregame starter | 86.6% |
| Challenger | 84.9% |
| Alpha | 84.3% |
| Plain Elo (ours) | 82.3% |
| ELO Model | 81.9% |
| Joker (the line is among its inputs) | 81.5% |

## Limits

- **538 chose its constants with hindsight.** It built the quarterback model in 2019 and worked out the
  1999-2018 forecasts after the fact, and it changed the home field in 2020 and 2022 and added the final-week
  rule in 2021. Its constants were chosen having seen those seasons. Nothing here is fitted to results: every
  constant is 538's, read back from its file. 2023-2025 are the only seasons 538 never saw.
- **The seasons before 2019 lack the win totals**, which costs the rebuild about a point of picks against
  538 there (65.1% against 66.2% on 2003-2018).
- **The starter is known only at kickoff.** REBUILD takes the quarterback who dropped back first. A forecast
  made before the game has to name the expected starter, and PREGAME, which takes the previous one, is its
  floor. In the comparison above Alpha and the Joker were given the passer with the most dropbacks and the
  ELO Model the lineup expected before kickoff (study 4); on the site Alpha takes the starter from the depth
  chart and the injury report. A late change would be missed by any of them.
- **Two choices stand in for things 538 never said**: the home field from 2023 (48.68 held; the sensitivity
  run moves 2 picks of 855) and leaving out the resting-starter cut (34 games in 24 seasons).
- **The comparison is 1,355 games.** Models within two points of each other, as these four are, cannot be
  told apart on five seasons, and a pick count moves by several games with a small change of rule (PREGAME
  picks two more than the QB Elo there while its chances are worse).
- nflverse revises old seasons now and then, so a later download can move a number in the last decimal.

## Run it

```
python3 -I research/fetch.py                     # games.csv and the play-by-play
python3 -I research/fetch.py --fivethirtyeight   # 538's two files (each checked against its SHA-256), the weekly player stats, the draft picks
python3 -I research/fivethirtyeight/qbelo.py     # the rule checks and the five runs; writes results/ (about 20 seconds)
python3 -I research/fivethirtyeight/compare.py   # against Alpha, the Joker and the ELO Model, how distinct, and the long run
```

A rerun writes identical files. `qbelo.py` also writes REBUILD, LINES, PROOF and SENSITIVITY game by game, in
538's orientation with 538's own columns beside, and the checks on 538's columns, to `out/` (gitignored), and
prints what it checks; PREGAME's calls are in `results/calls_2003_2025.csv`.

- `results/rule_checks.csv`: each rule against 538's own numbers, at the bound the README quotes;
  `results/forecast_misses_2019_2022.csv`: 538's 2019-2022 forecasts the rules miss, each with what explains it.
- `results/facts.csv`: every other figure the README quotes about 538's files, the starters, the win totals,
  the hand entries and the home field.
- `results/validation.csv`: REBUILD, LINES and PROOF against 538's published chance, season by season.
- `results/records.csv`: each model's record and Brier score by season, every game.
- `results/calls_2003_2025.csv`: every game of 2003-2025, playoffs in, chances to six decimals (a pick can be
  read off its chance): the QB Elo's home chance and pick, PREGAME's and the starters it assumed, plain Elo's,
  the two starters and their adjustments, the home term, and 538's published chances (CC BY 4.0, Data:
  FiveThirtyEight; turned to the home team and rounded, as said under The licence).
- `results/sensitivity.csv`, `results/warmup.csv`: the 2023-2025 home field, and where the run starts.
- `results/compare_*.csv`: the comparison with Alpha, the Joker and the ELO Model (records, scores and their
  intervals, agreement, splits), how distinct the QB Elo is, and the long run.
