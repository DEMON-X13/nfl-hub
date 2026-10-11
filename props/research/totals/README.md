# Game totals: can a points model beat the posted total?

A study run on 2026-10-10 and 2026-10-11, kept here so it can be run again. What it found is
what the site does now (app v88, `props/build/patch_totals_market.py`): a game total is priced
at the market's own chance, and the model's points are a display only. Since 2026-10-11 the
ratings candidate is tracked in the betting job as a shadow, never shown, against a bar set before
its first call ("The shadow" below).

## The question

The Props model prices a game total (the over and under on the posted points, a leg in the
Parlay Builder). Until v88 its chance came from the model's own points for the two sides
(`modelPoints` in `props/build/part2.js`, the team volumes and defences it tracks, with the
coefficients in `props/data/pts_model.json`), pulled halfway to the posted total, the final
total treated as Normal about that with a spread of 13.2 points (`TOTAL_SD`). The owner asked
for that points function to be made better.

So: is there a points formula, built only on what is known before kickoff, that predicts a
game's total better than the posted closing total, gives a better chance of the over than the
market's own no-vig chance, and whose picks would make money? And is the site's rule at least
as good as the market?

## The rules of the study

- **Leak-free.** Every pre-game number a model reads is computed from games that kicked off
  before the game it is for (`build_dataset.py`, whose docstring lists every column and where
  it comes from). The only things read about the game itself are what games.csv knows before
  kickoff: the schedule, rest, the closing total and spread and their prices, roof, surface,
  and the game-time weather (known roughly before kickoff; a live version would need a
  forecast). The proofs:
  - `leakage_check.py`: (A) 20 random games, one feature each, recomputed by hand from the raw
    files filtered to earlier dates with code that shares nothing with the builder: 20/20 match;
    (B) the dataset rebuilt with the world cut off on the morning of seven dates (2012 to 2026)
    gives those dates' games exactly the full build's features, while the next game day's
    differ, and a mutant builder that lets a game into its own season-to-date sums is caught
    on 12 of 12 games; (C) every row's games-before count equals games.csv's, and no feature
    tracks the game's own result.
  - `eff/build_eff.py check 4 0.4`: the same as-of test for the efficiency candidate's ratings,
    with a mutant that lets the date itself in.
  - The judge's own checks, written separately (`judge/`): `recompute.py` recomputes a
    stratified sample of the features from the raw files with no import of the builder;
    `asof_data.py` repeats the as-of rebuilds on holdout dates; `eff_check.py` refits the
    efficiency ridge by hand on several dates (worst difference 2e-13); `predict_asof.py`
    holds each candidate's own fit and predict to the same standard (training seasons only
    before the test season, predictions from a cut-off world identical to the harness's, a
    mutant ratings filter that updates before predicting caught, outcome columns refused).
- **Development on 2012-2023 only**, walk-forward: each season predicted by a model fitted on
  the seasons before it (2010 on). `harness.py` never loads a 2024+ row in development.
- **A locked holdout: 2024, 2025 and 2026 so far** (weeks 1-5, 65 games, the regular season and
  playoffs with a line). The harness refuses a 2024+ period unless `holdout=True`, and logs each
  look with the candidate's source hash in `out/holdout_log.txt`. Each candidate was frozen
  before the holdout and run on it once per period (eight runs, 2026-10-11 00:34-00:35 UTC),
  and nothing was changed after a result.
- **The decision rule was written before the holdout was run** (`judge/PREREGISTRATION.txt`).
  The primary period is 2024-2025 (570 games); 2026 is direction only. A candidate replaces the
  site's chance only if, on 2024-2025, the paired bootstrap interval of its Brier score and its
  log loss minus the market's lies wholly below 0 at 97.5% (Bonferroni for four candidates), it
  is not worse on MAE, and 2026 does not point the other way. It may drive suggested parlays
  only if, besides, its picks' units interval excludes 0 at 97.5% at the real odds and is
  positive at -110. Otherwise the recommendation is the market's own total and chance.
- **Two baselines on the same games.** *Market*: mu is the closing total, P(over) the no-vig
  chance of games.csv's over and under prices (50% where it has none). *Site rule*: the shipped
  rule rebuilt in Python (the app's team EWMs, `modelPoints` with the shipped coefficients,
  halfway to the line, sd 13.2), whose inputs track the props research table `props/raw/feat.pkl`
  at a correlation of 0.9996 or better on 2021-2023 (`validate_site_proxy*.py`).
- **Picks** are the site's rule for a bet: the model's chance at least 3 points above the chance
  the price itself implies (its margin left in), at games.csv's real odds, else -110. Intervals
  are 90% paired bootstraps over games (10,000 resamples on the holdout), unless marked.

## The candidates

Seventy-two variants were tried on 2012-2023 (ratings 22, efficiency 16, residual 14, simple 20
and a diagnostic); one of each was frozen. Each module's docstring is its full spec.

- **`cand_ratings.py`**: a Kalman-filter rating of every franchise's scoring offence and
  defence in points a game, updated date by date, calibrated by OLS, then blended with the
  posted total. The only blend that beat the line on 2012-2023 *faded* the ratings (W = -0.25:
  the market leans toward past scoring more than results bear out).
- **`cand_efficiency.py`**: opponent-adjusted ridge ratings on nine play-by-play stats (points,
  EPA a play, success rate, explosive plays, plays, dropback rate, red-zone trips and touchdown
  rate, giveaways; `eff/build_eff.py`), a points model on them, blended with the line by a
  weight learnt on honest walk-forward predictions.
- **`cand_residual.py`**: the posted total plus a ridge model of its residual (the final minus
  the line) on twelve features named in advance (wind, roof, cold, the stats-implied total
  against the line, EPA and pace environments, a new quarterback, short rest, byes, division,
  late season, playoffs), seasons weighted 0.85 a year back, a median forecast.
- **`cand_simple.py`**: the posted total nudged for wind, about -0.13 to -0.16 points a mph
  away from the training average, outdoors only.

## Results

### Development, 2012-2023 walk-forward (3,259 games with a line)

| Model | MAE | MAE minus market [90%] | Brier | Brier minus market [90%] | Log loss | Picks W-L-P | Units [90%] |
|---|---|---|---|---|---|---|---|
| Market | 10.583 | 0 | 0.2500 | 0 | 0.6932 | none | none |
| Site rule | 10.628 | +0.045 [+0.004, +0.088] | 0.2516 | +0.0016 [+0.000, +0.003] | 0.6964 | 566-543-15 | +3.10 [-52.92, +59.36] |
| ratings | 10.568 | -0.015 [-0.033, +0.004] | 0.2495 | -0.0005 [-0.001, +0.000] | 0.6922 | 112-83-3 | +27.92 [+5.78, +50.45] |
| efficiency | 10.583 | 0.000 [-0.010, +0.009] | 0.2500 | 0.0000 [-0.000, +0.000] | 0.6931 | 9-12-0 | -2.85 [-10.90, +4.46] |
| residual | 10.569 | -0.014 [-0.040, +0.012] | 0.2495 | -0.0005 [-0.001, +0.000] | 0.6922 | 217-180-5 | +33.46 [+1.10, +64.73] |
| simple | 10.552 | -0.031 [-0.051, -0.008] | 0.2490 | -0.0010 [-0.002, -0.000] | 0.6912 | 95-82-4 | +12.18 [-9.44, +33.48] |

On development every candidate looked at least level with the market and two made money.
That is what 72 variants tried on the same seasons buy; the holdout is where it is tested.

### Holdout, 2024-2025: the primary period (570 games, 567 graded)

| Model | MAE | MAE minus market [90%] | Brier | Brier minus market [90%] | Log loss | Log loss minus market [90%] | Picks W-L-P | Units [90%] |
|---|---|---|---|---|---|---|---|---|
| Market | 10.096 | 0 | 0.2500 | 0 | 0.6932 | 0 | none | none |
| Site rule | 10.188 | +0.093 [-0.006, +0.194] | 0.2530 | +0.0030 [-0.0002, +0.0062] | 0.6992 | +0.0060 [-0.0004, +0.0126] | 60-70-0 | -14.74 [-32.81, +3.50] |
| ratings | 10.134 | +0.038 [-0.011, +0.087] | 0.2512 | +0.0011 [-0.0005, +0.0028] | 0.6955 | +0.0022 [-0.0010, +0.0055] | 7-10-0 | -3.37 [-10.18, +3.30] |
| efficiency | 10.125 | +0.030 [+0.001, +0.058] | 0.2510 | +0.0009 [-0.0001, +0.0020] | 0.6951 | +0.0019 [-0.0003, +0.0040] | none | none |
| residual | 10.154 | +0.058 [-0.009, +0.127] | 0.2522 | +0.0021 [+0.0000, +0.0043] | 0.6975 | +0.0043 [+0.0001, +0.0086] | 24-27-1 | -4.74 [-16.14, +6.70] |
| simple | 10.116 | +0.021 [-0.039, +0.080] | 0.2506 | +0.0006 [-0.0013, +0.0024] | 0.6944 | +0.0011 [-0.0026, +0.0049] | 10-12-0 | -2.77 [-10.34, +4.75] |

### Holdout, 2026 weeks 1-5 (65 games; direction only)

| Model | MAE | MAE minus market [90%] | Brier | Brier minus market [90%] | Log loss | Log loss minus market [90%] | Picks W-L-P | Units [90%] |
|---|---|---|---|---|---|---|---|---|
| Market | 10.715 | 0 | 0.2497 | 0 | 0.6926 | 0 | none | none |
| Site rule | 11.198 | +0.483 [+0.162, +0.800] | 0.2647 | +0.0150 [+0.0051, +0.0248] | 0.7227 | +0.0301 [+0.0100, +0.0498] | 6-11-0 | -5.59 [-12.18, +0.88] |
| ratings | 10.492 | -0.223 [-0.374, -0.074] | 0.2436 | -0.0062 [-0.0115, -0.0009] | 0.6802 | -0.0124 [-0.0231, -0.0019] | 4-0-0 | +3.84 [+0.95, +6.75] |
| efficiency | 10.638 | -0.077 [-0.137, -0.016] | 0.2478 | -0.0020 [-0.0049, +0.0009] | 0.6887 | -0.0040 [-0.0098, +0.0019] | none | none |
| residual | 10.665 | -0.050 [-0.184, +0.088] | 0.2480 | -0.0017 [-0.0066, +0.0033] | 0.6891 | -0.0035 [-0.0133, +0.0065] | 1-1-0 | -0.09 [-2.09, +1.82] |
| simple | 10.707 | -0.008 [-0.164, +0.147] | 0.2503 | +0.0005 [-0.0045, +0.0055] | 0.6937 | +0.0011 [-0.0091, +0.0111] | none | none |

### Holdout, 2024-2026 pooled (635 games, 632 graded)

| Model | MAE | MAE minus market [90%] | Brier | Brier minus market [90%] | Log loss | Log loss minus market [90%] | Picks W-L-P | Units [90%] |
|---|---|---|---|---|---|---|---|---|
| Market | 10.159 | 0 | 0.2500 | 0 | 0.6932 | 0 | none | none |
| Site rule | 10.292 | +0.132 [+0.037, +0.227] | 0.2542 | +0.0042 [+0.0012, +0.0073] | 0.7017 | +0.0085 [+0.0025, +0.0146] | 66-81-0 | -20.33 [-39.90, -1.10] |
| ratings | 10.170 | +0.011 [-0.036, +0.058] | 0.2504 | +0.0004 [-0.0012, +0.0019] | 0.6939 | +0.0007 [-0.0024, +0.0038] | 11-10-0 | +0.47 [-7.06, +7.52] |
| efficiency | 10.178 | +0.019 [-0.008, +0.045] | 0.2506 | +0.0006 [-0.0004, +0.0016] | 0.6944 | +0.0013 [-0.0007, +0.0032] | none | none |
| residual | 10.206 | +0.047 [-0.016, +0.110] | 0.2517 | +0.0017 [-0.0003, +0.0037] | 0.6966 | +0.0035 [-0.0005, +0.0074] | 25-28-1 | -4.83 [-16.35, +6.86] |
| simple | 10.177 | +0.018 [-0.040, +0.075] | 0.2506 | +0.0006 [-0.0012, +0.0024] | 0.6943 | +0.0011 [-0.0024, +0.0047] | 10-12-0 | -2.77 [-10.42, +4.64] |

`judge/analyze.py` prints the rest: RMSE, bias, calibration, the 97.5% intervals, each
candidate against the site rule, and the picks at a flat -110.

## The verdict

- **No candidate beat the posted total.** On 2024-2025 none had a Brier or log loss interval
  wholly below the market's, at 97.5% or even at 90%, and every one was a little worse than the
  market on all three measures there: the efficiency model significantly so on MAE (+0.030,
  [+0.001, +0.058]) and the residual model on Brier and log loss. None of their picks made money
  with an interval clear of 0. The ratings model's strong 2026 (65 games, 4-0 on picks) is the
  kind of run the rule names direction only, and 2024-2025 point the other way; pooled over
  2024-2026 it is level with the market (MAE +0.011, [-0.036, +0.058]).
- **The site's rule was measurably worse than the market.** Over 2024-2026, MAE +0.132 points
  [+0.037, +0.227], Brier +0.0042 [+0.0012, +0.0073], log loss +0.0085 [+0.0025, +0.0146]
  (each still above 0 at 97.5%: MAE [+0.003, +0.265], Brier [+0.0001, +0.0084]), and its picks
  went 66-81 for -20.33 units [-39.90, -1.10]. On 2026's first 65 games alone it was the worst
  of everything (its favoured side 25-40).
- **What ships** (app v88): mu is the posted total, and P(over) is the market's no-vig chance,
  i(over) / (i(over) + i(under)) with i the chance a price implies, 50% where either price is
  missing. `TOTAL_SD`, 13.2, stays only to price a total on a number other than the posted one,
  as Normal(posted total, 13.2). The total stays a leg a visitor adds by hand from a game's Game
  bets card; it never makes a suggested parlay (a no-vig chance sits under the chance its price
  implies whenever the book takes a margin, so it has no edge to find, and the panel leaves the
  totals out altogether). The model's points are shown on the card as "model's points", a
  display only. A candidate could replace the market only by passing the preregistered rule on
  new seasons; none should be tuned on the season in play.

## The shadow: the ratings fade, tracked from 2026-10-11

The ratings candidate was level with the market over 2024-2026 and strong on 2026's first 65 games,
which the rule above calls direction only. The owner's call (2026-10-11): track it quietly for the
rest of the season and beyond, against a bar written here before any of its live calls existed. It
is never shown on any page, never used in a suggestion, and nothing on the site reads its ledger; it
is turned on only if it passes, and then only by a change of its own.

### The bar (pre-registered)

Set on 2026-10-11 and committed before the ledger's first call. It is `BAR` in `shadow.py`, copied
into the ledger, and `shadow_check.py` fails any ledger whose bar is not this one or not the last
commit's.

- **When**: decided once, when 285 games are in the sample (half the study's primary period), and
  never revisited. The sample is the first 285 frozen calls graded over or under (a push drops out,
  as in the study) that had the market's no-vig chance at the moment of the call, in the order they
  were graded (then kickoff, then game id).
- **PASS only if all three hold on those 285 games**:
  1. Brier score, the model's minus the market's no-vig chance's: the paired bootstrap 90% interval
     (10,000 resamples of the 285 games, seed 0, 5th to 95th percentile) lies wholly below 0;
  2. log loss (chances clipped to 1e-6): the same, wholly below 0;
  3. the 3-point-edge picks on those games are up in units (more than 0; no picks is not up), at the
     price of the call, -110 where it was missing.
- **Otherwise FAIL**: the tracking stops (no new calls; calls already frozen are still graded) and
  the formula is never shown on the site or used in a suggestion.
- **A PASS** makes it a candidate to turn on, by a change of its own; nothing on the site moves by
  itself.
- **Before 285** there is no verdict: the summary gives the running numbers and how many of the 285
  are in, never a verdict or a word of passing.

### What it does

`shadow.py` runs in the betting job (`.github/workflows/update.yml`, after the Joker and Broly,
`continue-on-error`), whose slots land before every kickoff window, on the games.csv that run has
just downloaded, and nothing else: the candidate needs schedules, scores and lines, no play-by-play.

- **The call.** For the season of the games to come, `cand_ratings.fit()` on every played game of the
  seasons before it (2010 on, the 2009 regular season seeding the first, as the study's dataset does),
  then `cand_ratings.rate()` over the season's games with a line, each played game's score read from
  games.csv, so a game is rated on every score from an earlier calendar date; then, as `predict()`:
  mu = line + W * (model total - line) with W = -0.25, sd the season's fitted sd, P(over) =
  1 - Phi((line - mu) / sd). Beside it the market's no-vig chance from games.csv's over and under
  prices at the same moment (none where either is missing) and the study's 3-point-edge pick (the
  model's chance at least 3 points above the chance the price implies, margin left in; -110 where a
  price is missing).
- **The freeze.** A call is rewritten by any run before kickoff whose numbers differ (a line or price
  moved, a new score came in), and frozen by the first run at or after kickoff, by the clock: the
  kickoff the call holds or the one games.csv now gives, whichever is earlier. From then on it never
  changes. A game that kicks off without a call, or never had a line, has none. A run that changes
  nothing writes nothing.
- **The grade.** After the final (games.csv's scores), against the call's own line, not the closing
  one: the total, over, under or push, and the pick's units.
- **The ledger**, `shadow/ledger.json`: the candidate's hash, the bar and when it was registered,
  each season's fit (b0, b1, sd), the verdict once made, the summary (graded games, pushes, games
  without a market price, Brier and log loss for the model and the market on the same games with the
  paired 90% intervals of their differences, the picks' record and units, and where it stands
  against the bar) and one call a game: the line, both prices, both chances, mu, sd, the model total,
  the pick, called_at, frozen, frozen_at and the final.
- **The check**, `shadow_check.py`, runs in the same step against the last commit's ledger and the
  same games.csv. It fails the step alone, and puts the ledger back as the last commit had it, when a
  call was made at or after its kickoff, a call frozen (or past its kickoff) in the last commit is
  gone or changed in any field, the bar or the candidate is not the registered one, a verdict is
  written early, late or not as the first 285 give it, a grade is not games.csv's, a final is left
  ungraded, or the summary does not follow from the calls. The betting publish never waits on it.

### The proof that it is the frozen candidate

`shadow_equiv.py` runs the research harness on cand_ratings for the development seasons (2012-2023;
the holdout is never touched) and `shadow.season_calls()` on the same games from games.csv alone, and
holds mu, sd and P(over) equal to 1e-9. On the study's files downloaded 2026-10-11:

- every one of the 3,119 regular-season games, with every earlier score known as the shadow runs live:
  largest difference 0 (the same floating-point numbers);
- all 3,259 games, playoffs included, with the scores the harness could not read back withheld from
  the shadow too: largest difference 0.

The harness reads a score back from a team's next row, so it cannot see a week-18 score when neither
team plays again (5 to 8 a season); live, games.csv has it. On the playoffs that moves mu by at most
0.047 points (the candidate's docstring allowed 0.15), and the shadow uses the scores.

`test_shadow.py` runs the shadow and the check on fabricated games.csv files through one week (a game
called, its line moving, kicking off and freezing while the closing line moves on, a late game still
rewritten, the final graded over its own line and under the closing one, a push, a game with no price
and its pick at -110, a game whose line appears only after kickoff, the next week rewritten on the new
scores), shows the check catching each planted change (a frozen chance moved, a graded total or result
that is not games.csv's, a frozen call deleted, a call stamped after kickoff, the closing line re-taken,
the bar or the summary edited, a final left ungraded, a verdict written early or changed) and a shadow
mutated to recompute after kickoff, then the bar on made-up records (no verdict at 284, PASS on the
first 285 in grading order, FAIL level with the market, FAIL with no picks, FAIL when the picks lose,
the tracking stopping after a FAIL), the pick rule against the harness's own, and no page naming the
ledger.

```
python3 props/research/totals/test_shadow.py          # ends "7 passed, 0 failed"
python3 props/research/totals/shadow.py               # downloads games.csv into data/shadow/; writes shadow/ledger.json
python3 props/research/totals/shadow_check.py         # against the last commit's ledger; ends "shadow check: 0 failures"
data/venv/bin/python shadow_equiv.py                  # from here, after fetch_raw.py and build_dataset.py; ends "EQUIVALENCE: passed"
```

Never edit the ledger by hand: it is the record, and the check holds it to the last commit.

## How to run it again

From `props/research/totals/`. Everything it downloads or writes goes under `data/` and `out/`,
both gitignored (the shadow's ledger, `shadow/ledger.json`, is the one file here a job writes and
commits).

```
python3 -m venv data/venv && data/venv/bin/pip install -r requirements.txt
data/venv/bin/python -I fetch_raw.py            # data/raw/: games.csv and the play-by-play 2009-2026 (about 330 MB)
data/venv/bin/python -I build_dataset.py        # data/games.parquet and data/team_games.parquet
data/venv/bin/python -I eff/build_eff.py        # data/eff/features_a4_w0.4.parquet, the efficiency candidate's ratings
data/venv/bin/python -I leakage_check.py        # the leakage proof, A to C; ends "LEAKAGE CHECK: passed"
data/venv/bin/python -I eff/build_eff.py check 4 0.4   # the ratings' as-of proof
data/venv/bin/python run_example.py             # the harness's contract and its lock, on a toy candidate
data/venv/bin/python -c "import harness, cand_simple; harness.evaluate(cand_simple)"   # any candidate on 2012-2023
data/venv/bin/python -I judge/run_holdout.py    # the holdout, once: refuses while out/holdout_log.txt exists
data/venv/bin/python -I judge/analyze.py && data/venv/bin/python -I judge/table.py   # the tables above, into out/
```

The judge's checks (`judge/recompute.py`, `asof_data.py`, `eff_check.py`, `predict_asof.py`,
`dev_repro.py`, `diff_detail.py`) run the same way; `judge/posthoc.py` slices the holdout by
week and was not part of the decision.

Notes for a re-run:

- A fresh download is nflverse's files as they are that day. 2026 grows every week and old
  seasons are revised now and then, so the numbers can move a little. The holdout ran on
  `data/games.parquet` sha256 28433887..., `data/eff/features_a4_w0.4.parquet` ac0bfe56... and
  the points coefficients de478078... (`judge/run_holdout.py` writes the same list for a new run
  to `out/judge/holdout_run/hashes.json`). On the study's files a fresh build matched the stored
  dataset on every row and column once a missing value written as NaN and as None read the
  same: `judge/asof_data.py` flags roof, surface and the starting quarterback's columns on under
  200 of 4,635 rows, and `judge/diff_detail.py` shows none of them is a real difference.
- Running the holdout again is a second look at seasons that have already decided the
  question. A new candidate should be judged on a season it has never seen, under the same
  preregistered rule, before anything on the site moves.
- The four candidate modules and `harness.py` are the frozen files the holdout ran, byte for
  byte (sha256 prefixes `cand_ratings` 88af3991, `cand_residual` b69e503e, `cand_simple`
  b2dcfcf6, `harness` 791ec5c6), except `cand_efficiency.py`, whose one change is the path of
  its ratings file (frozen 98b5b68a). Their docstrings name the development logs
  (`*/variants.log`), which are not kept here; the counts above come from them. The builders and
  the judge's scripts read `data/raw/`, `data/` and `out/` here instead of the study's folders,
  and `build_dataset.py` reads the shipped coefficients from `props/data/pts_model.json` in
  place (the study used a byte-identical copy).
