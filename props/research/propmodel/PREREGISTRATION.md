# Preregistration: the one-shot 2026 test of the free-data props model

Written on 27 October 2026, before any file of the 2026 season is downloaded, and before any 2026 line, price or
outcome is read by this model's code. It fixes the models, the code, the data, the metrics and the bar of a test
that is run **once**. Its result is final. Nothing below may change after the test has run. Any change made
after 2026 results have been seen makes the test void, and a void test counts as a FAIL.

## 1. The question

The site's prop model failed against DraftKings in 2026 weeks 1-6:

- On 2,507 priced main lines its chance carried no information beyond the market's (weight 0.007 ± 0.068).
- It sat about four times too far from 50%.

The owner chose "the free route" on 27 October 2026. A new model is built on free nflverse data from 2025 and
before, tested once against 2026's DraftKings lines with a bar fixed in advance, and run quietly as a shadow. It
reaches the site only if it passes.

The test asks two things:

- **Main lines:** does the frozen model's chance of a player's main line going over carry information beyond
  DraftKings' own price, enough that a fixed blend beats the market's no-vig chance? And does the same blend,
  taken toward DraftKings' line, beat a coin and each stat's own over rate?
- **Anytime touchdown:** does its anytime-touchdown chance carry information beyond DraftKings' price?

## 2. The frozen models

One model per stat, chosen on the 2021-2025 walk-forward of steps 2a-2c (README.md, "Step 3: the frozen models",
says why each). Each is refitted once on every season 2013-2025 by `freeze.py`, using its own walk-forward
protocol with the test season set to 2026:

- an inner split fits on 2013-2024 and validates on 2025, which chooses the trees (and the counts' dispersion);
- the refit on 2013-2025 then uses 1.1 times those trees.

| Stat | Groups | Model | Distribution |
|---|---|---|---|
| Passing yards | QB | qgbm: LightGBM quantile regression, 21 levels | the quantiles read as a CDF, linear between levels |
| Rushing yards | QB, RB | qgbm | the same |
| Receiving yards | RB, WR, TE | qgbm | the same |
| Rush + rec yards | RB | qgbm | the same |
| Attempts, completions, interceptions, passing TDs | QB | GBM_NB: LightGBM Poisson mean, all numeric features | negative binomial, dispersion alpha(mu) fitted on 2025's out-of-sample means |
| Carries | QB, RB | GBM_NB | the same |
| Receptions | RB, WR, TE | GBM_NB | the same |
| Anytime touchdown (rushing + receiving TDs) | QB, RB, WR, TE | GBM_POIS: LightGBM Poisson on the TD count | Poisson; P(1+) = 1 - exp(-lambda) |

No stat or group outside this table is tested, and none gains anything from a PASS. Untested:

- kicking points and field goals made;
- rush + rec yards for anyone but a running back;
- rushing yards for a receiver or tight end;
- receiving yards for a quarterback.

The refit (frozen/MANIFEST.json has every number):

| Model | Groups | Training rows | Features | Trees | Files |
|---|---|---|---|---|---|
| qgbm passing yards | QB | 8,304 | 160 | 4,313 over 21 levels | 21, 10.5 MB |
| qgbm rushing yards | QB, RB | 30,120 | 143 | 3,672 over 21 levels | 21, 11.1 MB |
| qgbm receiving yards | RB, WR, TE | 73,777 | 164 | 9,768 over 21 levels | 21, 28.2 MB |
| qgbm rush + rec yards | RB | 21,816 | 220 | 3,537 over 21 levels | 21, 10.7 MB |
| GBM_NB attempts | QB | 8,304 | 506 | 799 | 1, 1.4 MB |
| GBM_NB completions | QB | 8,304 | 506 | 475 | 1, 0.9 MB |
| GBM_NB passing interceptions | QB | 8,304 | 506 | 453 | 1, 0.8 MB |
| GBM_NB passing TDs | QB | 8,304 | 506 | 185 | 1, 0.4 MB |
| GBM_NB carries | QB | 8,304 | 506 | 228 | 1, 0.4 MB |
| GBM_NB carries | RB | 21,816 | 506 | 1308 | 1, 2.4 MB |
| GBM_NB receptions | RB | 21,816 | 506 | 518 | 1, 1.0 MB |
| GBM_NB receptions | WR | 32,324 | 506 | 705 | 1, 1.3 MB |
| GBM_NB receptions | TE | 19,637 | 506 | 207 | 1, 0.4 MB |
| GBM_POIS anytime TD | QB | 8,304 | 506 | 430 | 1, 0.8 MB |
| GBM_POIS anytime TD | RB | 21,816 | 506 | 422 | 1, 0.8 MB |
| GBM_POIS anytime TD | WR | 32,324 | 506 | 591 | 1, 1.1 MB |
| GBM_POIS anytime TD | TE | 19,637 | 506 | 256 | 1, 0.5 MB |

Notes on the refit:

- **Rows:** every game the player played in his role, 2013-2025, zero rows (played, no stat line) included.
- **Inputs and versions:** the feature table and all 89 raw files it was built from are recorded by SHA-256 in the manifest; the files were written by LightGBM 4.7.0, with the library versions `requirements.txt` pins.
- **Settings:** every hyperparameter is the walk-forward script's own. Only `deterministic=True`, `force_row_wise=True` and two threads are added, so that a refit reproduces the same bytes.
- **No recalibration** of any model after its fit.

## 3. The frozen files

Each line below is a SHA-256 and a path from the repo root. A `git:` path is a file as committed at that
commit; the two input blobs were hashed without being opened. `oneshot_2026.py` refuses to run unless every one
matches, and it hashes the four programs it runs (itself, `fetch.py`, `build_features.py`, `predict.py`) where
Python loaded them from, refusing unless that is this folder of the repo given by `--repo`.

```
1135ced7eb969901dc664acdfc25def27fc790dd658ae1d8dcfc0657ab43eaae  props/research/propmodel/fetch.py
67fdeb569ea13813675c55b879d4c1cb902b818fa5812a851fbc33371d2e5f02  props/research/propmodel/build_features.py
8c530d667ddb83eb9de949ae8e41cbad6915cd0033c3a70a52b1755bc6fe7427  props/research/propmodel/predict.py
31c27b07734d65985736395c6de2b4e4fba8e64c32fedcb3c391440ce94cf1dc  props/research/propmodel/oneshot_2026.py
2c53ec5c0bd87b40b3479fc83514ad1b0062c00ea2b7b28b85e6924c79466bcc  props/research/propmodel/freeze.py
d64ce080e4bdf14920ce591861d44a6ae1263539877e3ef4851623390e86a850  props/research/propmodel/model_yards.py
42a8437280e2ab80ba9755da3ce05cf3b0d1eb7e2e1dc70ceff16ad3e8cffb8c  props/research/propmodel/model_counts.py
2be07a8952d9af41f1c2a9e334f39b85336f903a8f875df5f5e5c6c642118c49  props/research/propmodel/model_td.py
dbd6646fbba1470828ed73b08efea5520226f1a90cca9409f5aa21d1c9de96a2  props/research/propmodel/frozen/MANIFEST.json
1c19bc395756e378c65e6facb946e72fae6cce99aeef0d8e479ef2c1e17ae03a  props/research/propmodel/requirements.txt
73abcb285ce3ce8f6c1b95d0cab79c4552adda31657bbbb9ad2e83f94513b29e  git:575c980f2beb03c05913a727f216d7bf80435c1e:props/data/payload.json
050f4d2702cf32c5272e7560c954da19e5e512273aace775501ac7cb7048c8cc  git:575c980f2beb03c05913a727f216d7bf80435c1e:props/data/espn_lines_2026.json
```

The 97 LightGBM model files, about 73 MB in all:

- `freeze.py` wrote them to `$PROPMODEL_DATA/frozen/`, and `frozen/MANIFEST.json` records each file's path, size
  and SHA-256.
- A gzipped copy of each is committed in the repo, `frozen/models/<file>.gz` (26 MB). `pack_frozen.py` wrote them
  deterministically; `pack_frozen.py --check` holds every copy's decompressed bytes to the manifest.
- `predict.py` reads a model file from `$PROPMODEL_DATA/frozen/` where it is there, else from the repo's copy. It
  refuses any file, and any copy's decompressed bytes, whose SHA-256 is not the manifest's; a file there with
  another hash is refused, never passed over for the copy. Either way the models are the same bytes.
- `players.csv` and `games_to2025.csv` as the models were fitted on them are committed the same way,
  `frozen/inputs/<file>.gz` (3 MB), because nflverse rewrites both. The test restores them where
  `$PROPMODEL_DATA/raw/` lacks them.
- The test runs only on model files with the manifest's hashes. A refit does not stand in for them: the manifest
  records the SHA-256 of all 89 raw files, and `check_frozen.py` shows a refit on those files reproducing two
  model files exactly, but nflverse corrects past seasons' files and rewrites `players.csv` near daily, so files
  downloaded again would not be the recorded ones. If no model file with the manifest's hash can be produced, the
  test is not run.

## 4. The test data (2026; none of it read before the test)

**(a) Priced main lines, weeks 1-6.**

- The source is the `mkt` table of `props/data/payload.json` at commit `575c980f2beb03c05913a727f216d7bf80435c1e`
  (props refresh, 27 October 2026 05:26 UTC). Its SHA-256 is in section 3.
- These are the paid pull's main lines: the point where DraftKings' over and under prices are closest to even.
  For week 1 they are the best of the US books. `mktbuild.py` placed them on player ids and on their games.
- Every entry with a line and both prices, on a market of section 2, is a line. An entry on another market is
  counted as not modelled, and a line whose game is not the player's candidate game that week is left out.
- The market's chance is the no-vig chance: q = i(over) / (i(over) + i(under)), where i is the chance a price
  implies.

**(b) Priced anytime touchdowns, weeks 1-6.**

- The source is the `prices` table of the same payload.
- Each row is market `any_td` at threshold 1 with a player id: the Yes price, whose implied chance i keeps the
  margin in.
- One price a player and game: a row repeated with the same price counts once, and a player given two different
  prices in one game (two book names placed on him) is left out. A row with no player id, or whose price does not
  read, is left out.

**(c) Price-free main lines, weeks 1-7.**

- The source is `props/data/espn_lines_2026.json` at the same commit. Its SHA-256 is in section 3.
- It covers every game of weeks 1-7 that the archive marks `final`.
- On the ten markets the models cover (passing yards, completions, attempts, passing TDs, interceptions, carries,
  rushing yards, receptions, receiving yards, rush + rec yards), each player's DraftKings line at kickoff is used:
  the archive's `close`.
- Left out, each counted:
  - players kept as `espn:<id>`, with no nflverse id;
  - entries in a game's `conflict` (two numbers for one player and market), which the archive keeps apart from
    its `lines`;
  - entries in its `gone` list (withdrawn before kickoff);
  - entries with no closing line, and the markets the models do not cover (kicking points, field goals made).

**(d) Features and outcomes.**

- The 2026 nflverse files are downloaded once at the test through `fetch.py` (each SHA-256 is written into the
  result):
  - player stats;
  - snap counts;
  - play-by-play;
  - weekly rosters;
  - depth charts;
  - injury reports;
  - games.csv, cut below 2027.
- A player played if the 2026 build has a row for him in that game: a snap in his role or on special teams.

**When the test may run, and on what files.** The outcomes and the "played" rule stand on the season's files
being complete. A game whose snap counts are missing would score a player who played and recorded nothing (whose
row comes from the snap counts alone, and whose lines all went under) as void; a game whose stats are missing
would void its lines, or score them all on zeros. So:

- The test runs **no earlier than 96 hours after the last kickoff of weeks 1-7** in the archive (2026_07_DAL_PHI,
  27 October 2026 00:15 UTC): not before **31 October 2026 00:15 UTC**, so that stat corrections and snap counts
  are posted.
- After the download and before anything is predicted, the run refuses unless every game of 2026 weeks 1-7 that
  games.csv shows played has player stats and snap counts for both clubs, its play-by-play, and both clubs' weekly
  roster for its week.
- On that refusal, or a download that fails, it removes the 2026 files it downloaded and its run marker, so that
  the next attempt downloads afresh. Nothing has been scored, so it is not a run of the test.

**Which lines are scored.** A line is scored only if all four hold:

1. its player's group and stat are in the table of section 2;
2. `predict.py` made a candidate row for him in that game;
3. he played (DraftKings voids a prop on a player who does not);
4. it is not a push.

The model's chance on a whole-number line is P(over) / (1 - P(push)), so it compares with the market's no-push
chance. Every line left out is counted by its reason in the result, pushes among them. None is imputed.

**What is already known about these data.** The diagnosis of 27 October 2026 read the same 2026 lines with the
old model. Its reports, which the author of this file has read, state aggregate facts about them:

- on the 2,507 priced lines, the market's no-vig log loss was 0.6905 and the old model's 0.7319;
- overs hit 48.3% there, and 43.1% of rushing overs hit on the ESPN lines;
- 16.3% of priced anytime-touchdown legs scored.

None of this informed any choice here:

- The models, their features and their settings were chosen on 2021-2025.
- The weight w was chosen on 2021-2025 evidence and an argument (section 6).
- The new model's behaviour on 2026 has never been computed.

Where the diagnosis bears on the bar, the bar takes the stricter side. The price-free baseline is each stat's
own hindsight over rate, not one pooled rate, because the diagnosis showed the leans differ by stat. For the same
reason A3 has a free intercept for each stat and C1 one for each position group, so an over/under lean on a stat,
or a touchdown lean on a group, that the model happens to share cannot pass them alone.

## 5. The model's chance, the metrics and the bar

**The model's chance.**

- p is `predict.py`'s, made week by week in predict mode. Each week's feature rows are built from the games'
  own files (stats, snap counts, play-by-play) up to the week before, and from that week's pre-game files
  (schedule and lines, depth chart snapshot, injury report, roster). Of the week's own play-by-play, only the
  gamebook weather line (the kickoff report) is read.
- It is clipped to [0.001, 0.999].

**The blend.** The main-line chance the site would state is b = q + w (p - q), with **w = 0.25** fixed here.
On the price-free lines the line is set at the market's median, and the site's own chance on most of them is
about 0.5. There the same blend is taken toward the line's even chance: e = 0.5 + w (p - 0.5).

**The intervals.** Every interval is a paired bootstrap that resamples whole games (nflverse game id; all lines
of a game move together):

- 10,000 resamples, numpy `default_rng(0)`;
- the 5th to 95th percentile (90%).

**Main lines PASS only if all six criteria hold:**

| | Data | Criterion |
|---|---|---|
| A1 | priced | Brier score of b minus Brier score of q: interval wholly below 0 |
| A2 | priced | log loss of b minus log loss of q: interval wholly below 0 |
| A3 | priced | in logit P(over) = alpha_stat + gamma logit q + beta (logit p - logit q), one intercept per stat, fitted by maximum likelihood, beta's interval wholly above 0. This is the model's own information net of the market's chance and of any lean either has on a stat |
| A4 | priced | the picks lose no more than the vig, and there is at least one pick (see below) |
| B1 | price-free | log loss of e minus log loss of 0.5: interval wholly below 0 |
| B2 | price-free | log loss of e minus log loss of each stat's own over rate on these lines (a constant per stat, chosen in hindsight and again in every resample): interval wholly below 0 |

A4's picks:

- On each line, take the side where b times the decimal price exceeds 1 (positive expected value at the blended
  chance), at most one side; flat $1 at the line's price.
- The picks must make at least what the market's no-vig chance expects of them:
  units - sum(q_side × decimal - 1) >= 0.

**The anytime touchdown PASSES only if C1 holds.**

- C1, priced: in logit P(TD) = alpha_group + gamma logit i + beta (logit p - logit i), one intercept per position
  group (QB, RB, WR, TE), beta's interval wholly above 0.
- No usable no-vig chance exists for a one-sided Yes price (DraftKings' margin on it is not known without the
  No), so the touchdown is judged on its information alone. The intercepts absorb the margin and any touchdown
  lean on a group, and gamma a margin that changes with the price.

**Everything else the result file holds is description and never part of the verdict:** per stat, per week, by
kickoff day (below), the blend at other weights, the model unblended, and calibration tables.

**The priced lines' timing favours the model on A1-A4 and C1; that is accepted, and limited this way.**

- The model's inputs for a game are fixed at or near its kickoff: games.csv's closing spread, total and
  moneylines, the depth chart snapshot at least four hours before kickoff, the injury report's final statuses and
  the week's roster as posted, and the gamebook's kickoff weather.
- The priced lines were pulled earlier: a Sunday game's player prices on Saturday morning, a day or more before
  kickoff; Thursday's and Monday's on the day.
- So on A1-A4 and C1 the model can be credited with news the price could not have had (a late downgrade or
  elevation, a total that moved). That tilts those criteria toward PASS.
- The model's inputs cannot be cut at each pull instead. games.csv carries only the closing lines, which the models
  were fitted on, and the pull time is on file for no game before week 5 (20 games in all).

What limits the tilt:

- B1 and B2 stand on DraftKings' closing line, which had every input the model has, and the main-line family must
  pass them too.
- The result describes A1, A2, A3 and C1 apart on Sunday games (priced the day before) and on the rest (mostly
  Thursday and Monday nights, priced on the day), each with its own interval. This is description only, never
  part of the verdict.
- The touchdown family has no close-timed criterion, since no closing touchdown price exists for 2026. Its PASS
  changes nothing on the site: it starts a shadow (section 8), whose T1 and T2 take the chance the site states for
  a leg and the model's chance from the same run, the last before kickoff, so neither sees later news.

## 6. The blend weight w = 0.25: why this number

**w cannot be measured.** No DraftKings line exists before 2026, so the weight cannot be estimated without
reading 2026. It is fixed by an argument, with 2021-2025 evidence (`w_choice.py`, `results/w_choice.json`).

**The bound.** Treat the model and the market as two unbiased forecasts:

- error sds s_m (model) and s_k (market), with error correlation rho;
- the squared-error weight on the model is w* = (s_k^2 - rho s_k s_m) / (s_k^2 + s_m^2 - 2 rho s_k s_m).

w* is at most 1/2 whenever the market is no less accurate than the model (s_k <= s_m), whatever rho is. The
market has every public input the model has, and more. w* is 0 or below once the market's error ratio
a = s_k / s_m falls to rho.

**How correlated forecasters' errors are, 2021-2025.**

- On the rows a book would post, the model family's errors correlate with the trailing five-game mean's (the free
  stand-in for a line) at 0.88-0.94 (median 0.91) on 2021-2025.
- The model's RMSE is 0.87-0.94 of that stand-in's.
- At the median rho, w* = 0.25 when DraftKings is about 4.4% more accurate than the model. That is
  roughly half the model's own lead over the trailing mean.

**Choosing w.** A blend at 0.25 beats the market in expectation whenever the true weight exceeds 0.125, which is
DraftKings less than about 6.6% more accurate. It costs little (w^2 times the mean squared departure)
if the model knows nothing more.

0.25 is also the weight that minimises expected squared error under a uniform prior on the true weight over
[0, 0.5]. It is a moderate bet: neither "the model is as good as the book" (0.5) nor "it adds nothing" (0).

**No tuning on 2026.** w is never tuned on 2026, and on PASS the shadow and any later use take this same 0.25.

## 7. What this test can detect

`power_sim.py` (`results/power_sim.json`) is a simulation on made-up lines. It uses this test's sizes, with normal
intervals standing in for the bootstrap:

- about 2,400 priced lines over 70 games (the payload holds 2,586 priced main lines on 70 games);
- about 4,800 price-free lines over 107 games (the archive holds 5,122 lines on the ten markets in the 107 final
  games of weeks 1-7, about 5,090 on a covered group and stat);
- before the lines that drop out (no candidate row, did not play, pushes). These counts were taken from the two
  registered files' structure, without reading a line, price or outcome.

Chance of passing A1, A2, A3 and B1 together (B2 depends on the season's own lean, which is not simulated), where
beta is the true weight of the model's departure from the market:

| spread of the model's departure (log-odds; points at even) | beta 0 | beta 0.1 | beta 0.2 | beta 0.3 | beta 0.4 | beta 0.5 | beta 0.7 | beta 1 |
|---|---|---|---|---|---|---|---|---|
| 0.2 (about 5.0 points) | 0% | 0% | 2% | 7% | 26% | 50% | 88% | 99% |
| 0.3 (about 7.5 points) | 0% | 1% | 4% | 22% | 60% | 84% | 99% | 100% |
| 0.45 (about 11.2 points) | 0% | 0% | 6% | 57% | 91% | 99% | 100% | 100% |

- Under beta = 0 the test essentially never passes.
- Passing needs the model's departure to carry about 30-50% of the weight or more, depending on how far it
  strays from the market.
- A smaller real signal will most likely FAIL. That is accepted: one season can detect only a large signal, and
  a model whose departures carry less would move the site's chances by too little to matter.

## 8. If it passes

**A PASS changes nothing on the site.** A family that passes starts a quiet shadow for the rest of 2026, run like
the game-totals shadow (props/research/totals, "The shadow"):

- No page reads it, and it is never used in a suggestion.
- The bar below is copied into its ledger before its first call.
- A check holds the ledger to the last commit's, as `shadow_check.py` does.

**The main-line shadow.**

- **Runs:** in the props job after its ESPN read.
- **Calls:** `predict.py` (these frozen files) for the week's games to come. For every DraftKings main line in the
  job's read (`PAY.espn`) on a covered group and stat, a call holds:
  - the line;
  - the model's chance p;
  - the chance the site states for that leg at the time, its DraftKings fair chance, real or estimated (m).
- **Freeze and grade:**
  - A call is rewritten while its numbers change before kickoff, and frozen by the first run at or after kickoff.
  - It is graded after the final from nflverse's stats. It is void if the player does not play; a push drops out.
- **Decided once,** on the first 4,000 graded lines in grading order (about three to four weeks).
- **PASS only if all three hold:**
  - **S1:** log loss of e = 0.5 + 0.25 (p - 0.5) minus log loss of 0.5: the game-bootstrap 90% interval wholly
    below 0.
  - **S2:** log loss of e minus log loss of each stat's own over rate on those 4,000: wholly below 0.
  - **S3:** on the lines with m, b = m + 0.25 (p - m) against m, on both Brier and log loss: wholly below 0. At
    least 1,000 lines must have m, or S3 fails.
- **Before 4,000** the shadow reports running numbers and never a verdict.

**The touchdown shadow.**

- **Calls:** on every player DraftKings lists for an anytime touchdown in the job's read.
- **Decided once,** on the first 2,000 graded.
- **PASS only if both hold:**
  - **T1:** log loss of b = m + 0.25 (p - m) minus log loss of m, where m is the site's stated chance for the leg
    frozen with the call: interval wholly below 0.
  - **T2:** in logit P(TD) = alpha + gamma logit m + beta (logit p - logit m), beta's interval wholly above 0.

**After a shadow verdict.**

- A shadow PASS only makes the model a candidate for a change of its own: a PR with the props audit's and the
  smokes' checks, using the blend at 0.25 on the stats that passed.
- A shadow FAIL stops the tracking, and the model is not used.

## 9. If it fails

- That family is not used anywhere. The site stays on DraftKings' chance for every player leg (app v138).
- 2026 cannot be used again to test this model or any variant of it.
- A successor model needs its own preregistration and data it has never seen: 2027 on, or DraftKings lines of
  2023-2025 if the owner buys them.

## 10. Multiplicity and the rules of the run

**The run.**

- **One test, run once,** on exactly the data in section 4.
- **Two families**, main lines and anytime touchdown, each judged on its own and each governing only itself.
- **Within a family every criterion must hold.**
  - The criteria are one-sided at 5% each.
  - So under the null of no information, a family's false-pass rate is at most 5%: A3 and C1 alone are at 5%,
    and the conjunction can only lower it.
  - The chance of at least one false PASS across the two families is at most 10%.

**What is fixed.**

- **No retries:** nothing is re-run with other weeks, other lines, other stats, another w, another clip, another
  seed, another bootstrap or another model.
- **No change after results:** a stat that did well cannot be kept after a FAIL, and one that did badly cannot be
  dropped after a PASS. Per-stat numbers are description.
- **Mechanical failures only:**
  - A refusal before anything is scored (too early, the files not yet complete, a download that failed) is not a
    run. It removes what it downloaded, and the test is started again later.
  - A crash after the download and before the result file is written may be fixed and the run repeated, only if
    the fix touches no data selection, metric, threshold or model. The fix is committed and merged with its reason
    in `results/oneshot_2026_crashes.md`, which names the crashed run's id (from its marker). The re-run then reads
    the files the crashed run downloaded.
- **One shot, as the guard holds it.** `oneshot_2026.py` refuses to start when any of these holds:
  - `results/oneshot_2026.json` or `results/oneshot_2026_lines.csv` exists, or either was ever committed on any
    branch;
  - a run marker (`$PROPMODEL_DATA/oneshot_2026.started.json`, written before the download) or any 2026 raw file
    is on disk, unless the committed crash note names the marker's last run.
- **The record.** The result holds the preregistration's SHA-256, every commit that touched it, HEAD, origin/main,
  each run's id, the library versions and the hashes of every file read, so a second commit of this file, or a
  second attempt, shows in the result itself.
- **Any change** to a file in section 3 after 2026 results have been seen voids the test.

## 11. How the test is run

1. **Commit** this file and the folder, the model copies in `frozen/models/` and `frozen/inputs/` among it, and
   **merge** it to main. The holdout lifts only for a preregistration whose commit is on origin/main.
2. **Make the Python** the run uses: Python 3.13 with `requirements.txt` (LightGBM 4.7.0, numpy 2.5.3, pandas
   3.0.5, scipy 1.18.1, pyarrow 26.0.0). The run refuses any other version of those five.

   ```
   python3.13 -m venv $PROPMODEL_DATA/venv
   $PROPMODEL_DATA/venv/bin/pip install -r props/research/propmodel/requirements.txt
   ```

3. **Run once**, no earlier than 31 October 2026 00:15 UTC, from a checkout of main with origin/main fetched. The
   model files need no copying: `predict.py` reads `$PROPMODEL_DATA/frozen/` where it holds them, else the repo's
   copies.

   ```
   cd props/research/propmodel
   git fetch origin main
   PROPMODEL_LIFT_HOLDOUT=$(sha256sum PREREGISTRATION.md | cut -c1-64) \
     $PROPMODEL_DATA/venv/bin/python -I oneshot_2026.py --data $PROPMODEL_DATA --repo ../../..
   ```

   This is the only place 2026 is read. `fetch.py` refuses any process that sets that variable unless it is
   running `oneshot_2026.py`, the value is the SHA-256 of PREREGISTRATION.md, and that file is committed,
   unchanged, and its commit on origin/main. A refusal before anything is scored is not a run (section 10):
   wait, and run again.
4. **Commit** `results/oneshot_2026.json` and `results/oneshot_2026_lines.csv` (every line, its prices, the
   model's chance, the outcome and the reason it was left out) as written, with no edit.

`python3 -I oneshot_2026.py --data DIR --dry-run` runs every step but the guards and the download on 2025 stand-in
inputs of the same shapes, with a planted line for every reason a line is left out. Its numbers are in sample and
mean nothing. It was run before this file was committed: `results/oneshot_dryrun_2025.json`.

## 12. Known limits, accepted now

**Timing of the data.**

- The test is run after the games, on files downloaded then (section 4): injury reports and rosters as finally
  posted, and history with nflverse's stat corrections. The pre-game depth chart is the last daily snapshot at
  least four hours before kickoff.
- The 2010-2025 history is read from the files on disk and from the fresh games.csv. The result lists every
  2010-2025 raw file whose SHA-256 is not the manifest's, and every 2010-2025 game whose games.csv line differs
  from the one the models were fitted on; neither changes the verdict.
- The live shadow sees only what is posted when it runs.

**Inputs that differ from training.**

- **Weather.** In the test, which runs after the games, the target week's weather is the gamebook kickoff line,
  as in training. The live shadow has no such line before kickoff, so its weather is games.csv's alone and
  `g_wet` is 0 for every game. This is a known difference between training and serving, for the shadow only.
- **Floating-point ties.** Predict mode's features equal the training table's to 1e-9 but not always to the last
  bit: the table adds a row's own value into a running sum and takes it out again. On seven test weeks of
  2016-2025 (11,517 predictions), 23 predictions (0.2%) went the other way at a tree split, moving P(over) by at
  most 0.013 (`results/predict_check.json`).
- A club whose week roster is not posted yet keeps its latest earlier roster. This never happens in the test:
  the coverage check (section 4) refuses the run unless every club's roster of each week is posted.

**The lines.**

- The priced lines were pulled at varying times before kickoff, Sunday's on Saturday morning, not at the close,
  while the model's inputs are fixed at or near kickoff. That favours the model on A1-A4 and C1 (section 5 says
  how far it is limited). The price-free set uses the close.

**Weaknesses known from 2021-2025.**

- League passing volume fell in 2025 (risk of drift). Even in sample, the frozen models put 2025's passing a
  little high: passing yards 185 predicted against 178 actual, and WR receptions 2.40 against 2.27
  (`results/frozen_check.json`).
- The yards models' 80% intervals hold 78-79%.
- Quarterback interceptions are near their base rate.
- Promoted quarterbacks' touchdowns run low.
- These are recorded here and are not fixed after the fact.
