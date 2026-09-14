# Prop Model 2026 — handoff

A single-file NFL player prop app. Projects every starter's stat line, turns each
projection into the chance of clearing thresholds (20+, 30+ pass attempts, etc),
prices those, and builds correlated parlays. All state lives in the browser.

Built in chat over ~30 rounds. This package is everything needed to rebuild it.

---

## Run it

```
open app/prop_model_2026.html      # nothing to install
```

## Rebuild it

```
cd build
npm install                        # once: jsdom + papaparse for the audit (package.json)
python3 payload.py                 # regenerates data/payload.json (needs raw/feat.pkl: cd research && python3 features.py)
python3 assemble.py                # part1+2+3 + payload -> the HTML
node audit.js                      # ~28,400 checks. must be 0 failures.
```

`payload.py` regenerates players, team tables, schedule (with any scores games.csv has)
and the depth-chart table from `raw/dc26.csv`, derives the data build string from that
content, and carries forward market lines and the one-off keys it does not build.

`assemble.py` concatenates `part1.html` (markup + CSS), `part2.js` (engine),
`part3.js` (rendering and wiring), with the payload injected as a `const`.
Never edit the built HTML — edit the parts.

---

## THREE BUGS THAT KEEP COMING BACK

Read this before touching the pipeline. Each of these shipped at least once.

### 1. payload.py silently dropping keys
Rebuilding the payload once dropped `tdrate`/`tdmult`, which silently disabled the
anytime-touchdown cap. Backup running backs went back to 76% to score and nothing
looked wrong. `payload.py` now asserts on a required-key list and carries forward
anything it does not itself regenerate. **Do not remove that assert.**

### 2. Projections drifting toward the result
A finished game's projection must be what the model said BEFORE kickoff. Twice it
got recomputed after that week's stats were folded in, so recaps flattered the
model. Frozen at grade time into `S.projections` and `S.headlines`, replayed
verbatim afterwards. Freezing the numbers is not enough — the candidate pool has
to be frozen too, or a player promoted by his own big game wins a headline slot
retroactively. `audit.js` section G2 guards this.

### 3. State versioning
The browser cache overrode newly baked-in rosters because the version check only
looked at the model, not the data. Players showed on 2025 teams. `DATA_BUILD` comes
from `PAY.build`; bump it whenever the payload's roster/schedule content changes,
or users silently keep stale data.

---

## How the model works

**Projection** (`research/fit4.py`, fitted 2019-2024, tested on 2025):
eleven features — the player's 5-game and 3-game weighted averages, career rate and
prior-season rate (both shrunk toward the position mean by 4 games, which is what
stops one big game in limited action producing nonsense), opponent allowed to that
position, team volume, opponent defence, implied points, home, spread, |spread|,
plus three interactions. Ridge, one model per position per stat.

**Distribution.** A projection is a mean; means sit above a typical night. The app
carries the measured shape of each stat's outcomes as quantile tables, split into
four tiers by projection size, blended across tier edges. This is why a receiver
projected for 60 yards is under 50% to clear 60. **Do not thin the quantile grid** —
it was cut from 51 to 26 points once and count stats stopped anchoring.

**Validated:** beats a 5-game rolling average in 37 of 40 season-by-season tests
(`walkfwd.py`). Calibration within ~2 points in all five holdout seasons
(`walkcal.py`). Unbiased on established starters (`starters.py`).

**Market anchoring** (`data/wk1_lines.csv`, `mktbuild.py`): where a real line exists,
the distribution is shifted until it agrees with the market at that number, vig
stripped first. Elsewhere a per-stat scale factor (`scale.json`) is applied. Then a
bookmaker's cut goes on top — the tail shape of that cut is an ASSUMPTION, not a
measurement, because no free source publishes alternate-line prices.

**Parlays** (`corr.py`, `corr2.py`): 329 measured pairs, Gaussian copula, 40k sims.
Correlations from 2019-2024 agree with 2025 at 0.97. Multiplying legs is off by
14 points on the strongest pairs.

**Game context** (`pts.py`, `grid_model.json`): market lines where posted (the market
beat our own points model 7.25 to 7.60, so it wins); our team ratings elsewhere.

---

## Open work

**Volatility adjustment — tested 2026-09-13, not adopted.** The idea was that every
player gets the same outcome shape while boom-or-bust tendency is a repeatable trait.
`research/vol.py` tested it walk-forward 2021-2025 (each season fitted on earlier
seasons only) and it does not hold up:

- Splitting the rungs by the prior-season PPR spread that `boom4.py` uses gives a
  steady-vs-spiky gap of 1-2 points pooled over five seasons, not the 4 points in the
  2025-only table that used to sit here. That spread score has a rank correlation of
  about -0.6 with the projection: "spiky" mostly means low-projection.
- Splitting by projection size *within* a tier reproduces the same gap. The four-tier
  step function is coarse and the lower half of each tier clears big rungs more often.
- A level-free trait (each player's spread against the model's own shape, from prior
  games only) has near-zero year-over-year repeatability for yards stats and fits a
  stretch slope of zero. The 0.45 in `boom3.py` is the repeatability of PPR spread,
  which inherits the 0.77 repeatability of scoring level.
- Eight projection tiers remove the within-tier gap and improve CRPS in the rig, but
  almost all of that is QB passing yards, and on the package's own checks it was mixed
  (`blendcheck.py` Brier 0.1760 -> 0.1775, worst bucket 3.1 -> 2.9; `walkcal.py`
  worst-by-season 2.0/2.6/1.8/1.3/2.1 -> 2.1/2.7/2.3/1.4/2.0). Not shipped. `fit4.py`
  keeps an `NTIER` constant so it can be re-tried.
- Unexplained: at the 98th-percentile rung a ~1 point gap by PPR spread survives eight
  tiers. Possibly cross-stat (touchdown variance in the PPR score). `vol.py` takes
  other traits and tier counts from the command line.

Note what is NOT there: raw "boom capability" does not exist as a separate trait.
Boom rate correlates with scoring average at 0.77-0.92, and boom-above-average
repeats at 0.007. Any list built on boom counts is a list of good players.

**Handoff gaps found 2026-09-13.** The feature builder that makes `raw/feat.pkl` was
not in the original package; `research/features.py` is a reconstruction (row counts
and priors match the shipped model exactly, coefficients to ~1 unit on a 30-unit
scale, validation tables to ~0.1pt). `payload.py` now reads `data/final_model.json`
(it used to look in `build/`, where no copy existed). `payload.py` now derives `build`
from the roster and schedule content (bug 3 cannot recur by forgetting to bump it) and
keeps scores that `games.csv` already has, so a rebuild no longer un-finals played games.
The `depth` table is now regenerated from `raw/dc26.csv` with the same rule the app's
depth-chart upload uses (newest date, best rank). The payload was rebuilt on 2026-09-13
with that day's rosters and depth charts, so browsers holding the September 8 build
rebuild their state on first load and need week 1 re-uploaded. On Windows run the
steps with `python`, not `python3`, and expect CRLF in the built HTML.

**Odds feed (`data/oddsfetch.py`, untested against the live API).** With a free key in
`ODDS_API_KEY` it writes `wk{W}_lines.csv` for `mktbuild.py` and `prices_wk{W}.csv` for
the Weekly Update upload: every Over as the app's X+ rungs, and the main line read off
each ladder as the point where over and under are closest to even, best price each side.
`--events` lists the slate for free; start there and check the output before trusting it.
The free tier is 500 credits a MONTH, about 115 a week. The default pull is 7 markets a
game (main line plus ladder for passing, rushing and receiving yards, and anytime TD),
~112 credits for a 16-game week split across the Thursday and Saturday runs. That is the
free tier almost exactly, so a five-week month runs short at the end and the report says
so. Alternate markets carry Over prices only (checked live 2026-09-13), which is why the
base markets are pulled for the main lines. `--full` adds receptions, attempts,
completions, TDs, interceptions and carries at 18 a game and needs a paid tier. Verified
live on one game: 574 rung prices and the main lines came through correctly.

**Optimism lean — tested 2026-09-13, left alone.** `research/calfix.py` fits a
calibration curve on earlier seasons and applies it to each holdout. It fits a=-0.01,
b=1.00 every year: nothing to correct on the training folds, so the 1-2 point lean in
the holdouts is what the shape tables look like out of sample, not a fixable bias in
the mapping. The original decision to keep it in mind rather than correct it stands.

**Never tested against a sportsbook.** No historical prop odds are available free,
so everything is the model against outcomes, not against a book.

**Kickers are noise.** No better than the league average across seven seasons.
Shown but marked.

---

## Track Record tab (v27, 2026-09-13)

Every threshold, book main line (the side the model favoured) and touchdown chance
shown before kickoff is scored against the result: by confidence band (the High/Med/Low labels on the game pages), by
ten-point bucket of what the model said, by week, by market, and leg by leg for locked
parlays. It reads only `S.projections` and `S.actuals`, so it cannot drift (bug 2).
`gradeGame` now freezes each rung's chance and the main-line chance next to the
projection; snapshots from before v27 are scored from their frozen projection with the
same static tables, which is the identical number. Lines that carried a real price (the
built-in main lines, or a price sheet you uploaded) are also scored against the book:
hit rate and flat-stake return, split by whether the model saw value. Every row carries a noise margin
(two standard errors) and rows under 30 lines are greyed out, so a thin week is not
read as a trend. `audit.js` section G3 checks the frozen chances against the frozen
projection, the band partition, the old-snapshot path and the render.

## Weekly build (`build/weekly.py`) and the scheduled runs

`python weekly.py` does the whole week unattended: downloads scores and lines, this
season's player stats, rosters, injuries and depth charts; works out the current week;
pulls prices for the games kicking off soon if `ODDS_API_KEY` is set (36h window on a
Thursday, 120h otherwise) and bakes the main lines in; rebuilds the payload; bakes every
finished game's player stats, this week's injury report and every price file INTO the
payload; assembles; audits; commits locally as DEMON; prints a REPORT block. Only games
with a final score in games.csv are baked, so a game in progress is never graded.

The app applies baked data at boot through the same ingest functions an upload uses
(`applyBaked` in part3.js), so grading happens at the same point and a second boot is a
no-op. A price sheet you uploaded yourself wins over the baked one for that week. When
the data build changes, parlays, stake, saved tickets and uploaded prices carry over and
the baked weeks replay, so a rebuild no longer costs anything. Audit section I covers it.

Scheduled in the Claude desktop app: Thursday 8:00 and Saturday 8:00 local, running
`weekly.py` and reporting. The app must be open (or it runs at next launch), and the
key must have been set with `setx` BEFORE the app was last started.

## Weekly routine (manual fallback)

0. The slate warns when spreads and totals are more than three days old with games
   inside three days, because expected points are the biggest single input.
1. Tuesday: fetch scores in-app, download + upload player stats, roster, injuries.
   Uploads are tracked PER GAME, so partial-week files are fine.
2. Market lines. Either hand-transcribe a published article into `wk1_lines.csv`
   format, or run `data/oddsfetch.py` with a free key from the-odds-api.com (hyphens;
   the unhyphenated domain is an impersonator): Thursday morning with `--teams` for the
   Thursday game, Saturday for the rest. Then `mktbuild.py W wk{W}_lines.csv "source"
   date`, `assemble.py`, `audit.js`, and upload `prices_wk{W}.csv` on the Weekly Update
   tab so the Track Record can score against real prices.
