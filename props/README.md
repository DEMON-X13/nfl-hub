# Prop Model 2026 — handoff

A single-file NFL player prop app. Projects every starter's stat line, turns each
projection into the chance of clearing thresholds (20+, 30+ pass attempts, etc),
prices those, and builds correlated parlays. A visitor's own state lives in the browser
(the parlays are shared across devices by the Bets and Stats page's sync layer).

Built in chat over ~30 rounds. This package is everything needed to rebuild the page and
its payload; the research scripts behind the fitted model were not carried over (see How
the model works).

---

## Run it

The prop model has no page of its own: its parts are the source of `nflbets/index.html`
(`node ../../nflbets/build/build.js` from `build/`). `assemble.py` writes
`app/prop_model_2026.html` (gitignored) for the audit only.

## Rebuild it

```
cd build
npm install                        # once: jsdom + papaparse for the audit (package.json)
python3 payload.py                 # regenerates data/payload.json (needs raw/feat.pkl with last season: raw/README.md)
python3 assemble.py                # part1+2+3 -> the audit's page (payload.json is fetched at boot, only checked here)
node audit.js                      # ~26,000 checks. must be 0 failures.
```

`payload.py` regenerates players, team tables, schedule (with any scores games.csv has)
and the depth-chart table from `raw/depth_charts_<season>.csv`, derives the data build string from that
content, and carries forward market lines and the one-off keys it does not build.

`assemble.py` concatenates `part1.html` (markup + CSS), `part2.js` (engine),
`part3.js` (rendering and wiring), with `let PAY=null` and a `DATA_URL` in front of
part2: the app fetches `../data/payload.json` when it boots. Never edit the built
HTML — edit the parts.

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

The research scripts named below (fit4.py, walkfwd.py, walkcal.py, starters.py, corr.py,
corr2.py, pts.py, vol.py, boom3.py, boom4.py, blendcheck.py, calfix.py) were part of the
original handoff package and are not in this repo; only `research/features.py` is.

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

**Market anchoring** (`data/wk{W}_lines.csv` from the price pulls, `mktbuild.py`): where a
real line exists, the distribution is shifted until it agrees with the market at that
number, vig stripped first. Elsewhere a per-stat scale factor (`data/scale.json`, carried
into the payload as `mkt_scale`) is applied. Then a
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
The `depth` table is now regenerated from the raw depth-chart file with the same rule the app's
depth-chart upload uses (newest date, best rank). The payload was rebuilt on 2026-09-13
with that day's rosters and depth charts, so browsers holding the September 8 build
rebuild their state on first load and need week 1 re-uploaded. On Windows run the
steps with `python`, not `python3`, and expect CRLF in the built HTML.

**Odds feed (`data/oddsfetch.py`, run by `weekly.py` on every price pull).** With the key
in `ODDS_API_KEY` it writes `wk{W}_lines.csv` (each line with its game), `prices_wk{W}.csv`
(every Over as the app's X+ rungs) and `gamelines_wk{W}.csv` (DraftKings' moneylines,
spreads and totals, stamped with the time of the pull), and `weekly.py` bakes them into the
payload; the main lines come from the base markets (with `--full` the alternate ladders
come too, Over prices only). A game that has kicked off is never priced, in any mode, and a
game priced in the last twelve hours is not bought again (`priced_at.json`; `--force` to), so
two pulls the same day whose windows overlap, or a manual pull and the scheduled one that lands
after it, do not buy one game twice; a day apart (Thanksgiving's early game, by the Wednesday
and Thursday pulls) the fresher prices are bought.
`--events` lists the slate for free. The free tier is 500 credits a MONTH, about 115 a
week. The default pull is 6 markets a game (the main lines for passing, rushing and
receiving yards, receptions and passing TDs, plus anytime TD; the alternate ladders were
dropped on 2026-09-17) and one 3-credit call for the slate's moneylines, spreads and totals,
made only when the pull priced a game, about 7 credits a game in all, ~112 for a 16-game
week split across the weekly pulls. That is
the free tier almost exactly, so a five-week month runs short at the end and the report
says so. Alternate markets carry Over prices only (checked live 2026-09-13), which is why the
base markets are pulled for the main lines. `--full` adds the alternate ladders and
attempts, completions, interceptions and carries, 18 markets a game in all, and needs a paid tier. Verified
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

## Track Record (v27, 2026-09-13; the Prop Record, now in the page without a tab button)

Every threshold, book main line (the side the model favoured) and touchdown chance
shown before kickoff is scored against the result: by confidence band (the High/Med/Low labels on the game pages), by
ten-point bucket of what the model said, by week, by market, and leg by leg for locked
parlays. It reads only `S.projections` and `S.actuals`, so it cannot drift (bug 2).
`gradeGame` now freezes each rung's chance and the main-line chance next to the
projection; snapshots from before v27 are scored from their frozen projection with the
same static tables, which is the identical number. Lines that carried a real price (the
main lines and the prices the job pulled) are also scored against the book:
hit rate and flat-stake return, split by whether the model saw value. Every row carries a noise margin
(two standard errors) and rows under 30 lines are greyed out, so a thin week is not
read as a trend. `audit.js` section G3 checks the frozen chances against the frozen
projection, the band partition, the old-snapshot path and the render.

## Weekly build (`build/weekly.py`) and the scheduled runs

`python weekly.py` does the whole week unattended: downloads scores and lines, this
season's player stats, rosters, injuries and depth charts; works out the current week;
pulls prices for the games kicking off before the next scheduled pull is likely to land
(`PULL_SLOTS`, plus `LATE`, 10 hours, because GitHub fires this repo's crons 3-9 hours late)
if `ODDS_API_KEY` is set; rebuilds the payload; bakes every finished game's player stats,
the injury report (this week's in full, earlier weeks' Outs), every skill player's roster
status, every week's main lines matched onto the players of their own game, and every price
file with the player each row belongs to INTO the payload; assembles; audits; leaves the
commit to the workflow (it never commits; off GitHub it skips the price pull unless given
`--local`); prints a REPORT block. Only games with a final score in games.csv are baked, so
a game in progress is never graded.

**The season** is `SEASON` in `part2.js` and nowhere else: `build/season.py` reads it there
for `weekly.py`, `payload.py` and `mktbuild.py` (the baselines are the season before), the raw
files are named after it (`pw_<season>.csv`, `roster_<season>.csv`, `injuries_<season>.csv`,
`depth_charts_<season>.csv`), the payload carries it and the audit checks the two agree.
The baselines come from `raw/feat.pkl`, committed, whose seasons run from `FIRST` to `BASE` in
`season.py` (`research/features.py` takes them from there); on the first run of a new season
the table lacks the season just finished, so `weekly.py` fetches nflverse's weekly player stats
for those seasons, rebuilds it (the seasons it held come out as they were) and the workflow
commits it with the payload. A rebuild that cannot finish refuses the run before any credit is
spent. The audit's week-1 fixture takes the page's season as it is read. So the rollover is
the one line in `part2.js` (with the key in `nflbets/build/sync.js` and the assert in
`nflbets/build/build.js`); a refit of the coefficients (`fit4.py`, not in this repo) is a
separate research step the job does not need.
Kickoffs are turned into instants by the US daylight-time rule for each game's own year.
The data/ week files are named by week alone, so at a rollover `weekly.py` moves last
season's (`wk*_lines.csv`, `prices_wk*.csv`, `gamelines_wk*.csv`, every game id another
season's) to `data/archive/<season>/` before the new season's first pull, bakes only rows of
this season's games wherever they are, and carries none of a last-season payload's lines
forward; the page drops a price row that names a game its week does not have.
Once every regular-season game is final the page says the season is over and the job stops
pulling prices: playoff games are neither projected nor priced.

**When a download fails.** A runner starts with an empty `raw/`, so there is no old copy to
fall back on. The schedule, the player stats, the roster and the injury report are required:
if one fails or comes back wrong, `weekly.py` exits 1 before the workflow's commit step, so
nothing is published and the last good payload stays live (the run goes red and says why).
A bake whose stats would cover fewer team-games than the published payload's is refused the
same way. These are all checked before the price pull, so a refused run spends nothing on
prices; one refused later (the audit) has the prices it bought kept by the workflow, which
commits the price files but never `payload.json`. The depth charts are the one optional file:
the last payload's are carried forward, the run goes red (before the season's first kickoff,
while last season's chart is all there is, it does not), and the game page says how old the
chart is.

**Before nflverse posts a file.** The stats file cannot exist before the season's first game
is processed, and the injury file before the first report. A 404 on either is judged by what
has been published: with none of this season's yet it is a file not posted, so the run
publishes without it (prices, schedule and roster still move), the payload lists it in
`not_posted`, the slate says "nflverse has not posted the 2026 injury report yet", and the
audit checks the payload holds none of it instead of comparing the file. Once that is overdue
(the injury report after the first kickoff, the stats two days after the first game) the run
goes red after its commit. A 404 on a file the site has already published from is a source
that vanished, and is refused like any failed download.

**Who is playing** (`patch_who_plays.py`). The page takes the roster's status for every
skill player from the payload (`roster`): a reserve list, a release or a retirement takes a
player off the board; a practice-squad player starts only with a chart place or a game in the
two weeks before; every player is on the team the roster says. From the injury report: Out
and Doubtful are ruled out; Questionable is shown with a Q and kept out of every suggested
parlay (`SUGGEST_QUESTIONABLE`); Questionable without practice is ruled out; a player out in
his team's last game with no status yet is "pending" and treated as out until a status
clears him (his team has filed nothing, or he did not practise) and his stat line does not
show he played after all (a Doubtful who played is not pending); did not practise with no
status yet is tagged and kept out of the suggestions; limited practice is tagged. A team
whose report carries a game status has filed its final report, so a player it lists with
none is cleared. A ruled-out starter's note says why, and the charted player he leaves the
slot to starts however few games he has. A saved leg on a player who did not play is void,
and the parlay pays on the rest. The audit's section V checks each against the raw files.

The app applies baked data at boot through the same ingest functions an upload uses
(`applyBaked` in part3.js), so grading happens at the same point and a second boot is a
no-op. Prices are reloaded whenever the build that carried them changes; there is no
price-sheet upload any more. When the data build changes, the visitor's parlays, stake and
saved tickets carry over and the baked weeks replay, so a rebuild no longer costs
anything. Audit section I covers it.

Scheduled by `.github/workflows/props.yml`: five price pulls (Mon, Wed, Thu, Sat morning for a
Saturday game, Sat evening for Sunday) and eight post-game and stats runs a week plus a daily
injury-report run at 12:07 UTC, which lands after nflverse's afternoon posting (the catch-ups
spend a credit only on a game a dropped pull left unpriced); the key is the `ODDS_API_KEY`
repository secret. Off GitHub Actions `weekly.py` skips the price pull unless given
`--local`, and it never commits, so the schedule that ran it from the Claude desktop app
before the workflow (Thursday and Saturday 8:00 local) spends nothing and changes nothing
if it still fires; it can be deleted in the desktop app.

## Manual fallback

Run the props workflow by hand (workflow_dispatch; tick `no_odds` to spend nothing).
The Weekly Update tab's uploads are still in the page but have no button on the site;
everything is baked by `weekly.py`. The slate still warns when spreads and totals are
more than three days old with games inside three days, because expected points are the
biggest single input.
