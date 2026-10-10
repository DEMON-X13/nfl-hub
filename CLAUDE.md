# Working in this repo

`docs/ARCHITECTURE.md` is the deeper map: every directory and what is in it, how
the data flows, the shape of the state and the payload, and the vocabulary the
code uses (leg, rung, main line, corr, SGP, the margin). Read it when you need to
find something; this file is the part you need every time.

## How the owner wants this done

Do the whole job, including the git and GitHub half, without being asked and
without narrating the steps:

- Work on a branch, commit, push, open the PR, merge it. Don't ask first, don't
  explain what a PR is or where a button lives, don't leave steps for the owner
  to do by hand. Report what landed and move on.
- Say it plainly when something is wrong, blocked, or a judgement call the owner
  actually has to make. That is the bar for interrupting -- not routine mechanics.
- Reverting is easy and the owner knows it. Prefer shipping to asking permission.
- A change is not done until the audit or smoke test for that site passes and the
  built pages are regenerated and committed.

## The sites and their parts

GitHub Pages serves the repo root. Four sites have pages: `nflbets/`, `news/`, `cfb/` and
`nhl/` (the root `index.html` links them). `pickems/` and `live/` hold only redirects for old
bookmarks; `liveparlays/` holds a redirect beside the X Parlays section's source and its
`parlays.json`. `props/`, `betting/` and `elo/` are models with no page of their own, each
with its own job (`props.yml`, `update.yml`, `elo.yml`); `nflbets/` has no job: it is rebuilt
by hand when a source changes, and reads the models' data on every load. `news/`, `cfb/` and
`nhl/` each have their own job too (`news.yml`, `cfb.yml`, `nhl.yml`).

| Path | What | Source of truth |
|---|---|---|
| `props/` | Prop Model: no pages any more, only the parts, the build, the job and its data (`props/data/payload.json` is what `nflbets/` reads) | `props/build/part1.html`, `part2.js`, `part3.js` |
| `betting/` | X NFL Betting Model: no pages any more, only the app source, the tools, the job and its data (`betting/state.json` is what `nflbets/` reads); the app itself lives inside `nflbets/index.html` | `betting/app/x_nfl_betting_model.html` (copied in from `nfl-model-lab`) |
| `news/` | Season Tracker | `news/` directly; the narrative half is written by a person |
| `nflbets/` | X NFL Bets and Stats: the two models on one page, built one tab at a time, with X Parlays (X's placed parlays from `liveparlays/parlays.json` over the Parlay Builder, which finishes a parlay as a downloadable card, saved nowhere) and the X Bet Log (`liveparlays/xbets.json`) as tabs | `nflbets/build/tab_pickems.html` + `liveparlays/build/page.html` + the props parts + the betting app + `nflbets/build/card.html`, `storage.js` and `xbets.js` |
| `cfb/` | X College Football Bets: a test site, moneylines and spreads only. Its own page, job and data; nothing shared with the NFL sites but the look | `cfb/index.html` (hand-written), `cfb/tools/` |
| `nhl/` | X NHL Bets: the NBA Hub's idea on hockey, moneylines, puck lines and totals. Its own page, job and data; nothing shared with the other sites | `nhl/index.html` (hand-written), `nhl/tools/` |
| `liveparlays/` | retired as a page: `index.html` redirects to `nflbets/#parlay`; `parlays.json` is X's placed parlays and `xbets.json` the X Bet Log, the two files Claude edits from what the owner sends, and `build/page.html` is the X Parlays section's source | `liveparlays/build/page.html`, `liveparlays/parlays.json`, `liveparlays/xbets.json` |
| `elo/` | Player Elo: every player rated by position since 2012, the roster model built on those ratings and the matchup formula; `elo/data/*.json` is what the Player Elo tab reads | `elo/build.py` (the formula is its docstring); `nflbets/build/tab_elo.html` is the tab |

## Source vs generated -- never edit a generated file

These are rebuilt from source on every scheduled run, so an edit to one is lost
at the next refresh:

- `props/app/prop_model_2026.html` (gitignored: the audit's subject, never published)
- `betting/state.json`
- `cfb/state.json`, `cfb/news.json`, `cfb/data/teams.json` (and `cfb/data/history.json` gains the season just finished on the job's first run of a new one; otherwise it is source)
- `nhl/state.json`, `nhl/data/teams.json`, `nhl/data/box_*.jsonl`, `nhl/data/injuries.json`, `nhl/data/starters.json`, `nhl/data/players.json`, and `nhl/data/season_<year>.json` (written once, by the first run of the next season, from the last state of the finished one)
- `nflbets/index.html`, `nflbets/preview.html` (both by `nflbets/build/build.js`)
- `props/data/payload.json`, `props/data/priced_at.json`
- `news/data/results.js`, `news/data/stats2026.js`, `news/data/ranks2026.js`, `news/data/players2026.js`, `news/data/units2026.js`, `news/tools/out/week*-pack.md`, `news/tools/out/week*-lineups.json` and `week*-lineups-grade.md` (a drafted `news/data/weekN.js` is finished by hand; `news/tools/.cache/` is gitignored)
- `elo/data/players.json`, `elo/data/model.json`, `elo/data/matchups.json`, `elo/data/calls.json` (by `elo/build.py`; `calls.json` is the ledger of calls frozen at kickoff, carried from run to run, so a hand edit there rewrites the record; `elo/cache/` is gitignored; `elo/history/` is source)

`betting/app/x_nfl_betting_model.html` is the exception: it is the betting app's
source, shipped in from `nfl-model-lab`, not generated here.

## Season Tracker: the loop

```
cd news && npm ci
node tools/run-auto.js           # the job: the schedule's current week -> pull-week.js (results, stats, pack) -> context.js
node tools/context.js            # the rank chip, positions and the Deep Dive alone (nflverse only; no ESPN list)
node tools/smoke.js              # must end "all checks passed" (runs tools/cases.js too)
```

The narrative half is a person's (`news/HANDOFF.md` first, always). The season is `SEASON` in
`news/tools/lib.js`, nowhere else; after week 18 the tracker stays on week 18 and says the regular
season is complete (it does not cover the playoffs; the stat tables are then asked for as of the
day after week 18). The Deep Dive's lineups follow the nflverse injury report and ESPN's list
(`context.js` says the rule; a team has filed only when its game statuses are on the report, never
on a practice report), and every nflverse file but the snap counts is required: one that does not
download fails the run before the commit, so the last good files stay live (before the season's
first game a 404 on a current-season file is "no games yet"). The smoke test checks the lineups
against the report, roster and schedule they were built from (`lineup-checks.js`, which never
shares the build's shortcuts, only its reading of a source: which ESPN entry is which player and what
day a note's practice was), the rank chip against `elo/data/model.json` (the Team Rankings tab),
the stat bars against `results.js`, that the live week's narrative quotes none of the site's own
ranks, and the fixed cases in `tools/cases.js` (each with the broken version a review caught, which
the checks must fail); on a checkout whose `units2026.js` is older than the report it fails until
`node tools/context.js` runs. A change to a rule comes with a case there. `.github/workflows/news.yml`
runs about nineteen times a week, timed to the injury report and set early because GitHub starts
this repo's scheduled runs 2.3 to 9.4 hours late, and on a push to the tools, the page or a week
file; a run that finds nothing new commits nothing beyond the day's "as of" dates.

## Props: the loop

Edit the parts, then from `props/build/`:

```
python3 assemble.py        # part1 + part2 + part3 -> ../app/prop_model_2026.html (gitignored; payload.json is fetched at boot, only checked here)
node audit.js              # the gate: must end "0 failures, 0 runtime errors"
node ../../nflbets/build/build.js   # the parts are the Bets and Stats page's source: rebuild it (see below)
```

`node_modules` for the audit lives in `props/build/` (`npm ci`).

The audit is a real gate: `weekly.py` refuses to commit when it is not clean, so
a broken audit means the site silently stops updating and the run is marked
failed. Write audit checks against the app's invariants, never against whatever
the week's data happens to offer -- a lean week must not fail the build. Its section V
checks the page a browser builds against the raw nflverse files (roster status, the
injury report, the stats, the schedule) when `PROPS_AUDIT_RAW=1`, which `weekly.py` sets;
by hand those comparisons are skipped and the rest run. Run by hand against a payload
baked before 9 October 2026 it fails V2 (lines on the wrong player) until the job rebakes it.

`weekly.py` also refuses (exits 1 before the workflow's commit step, so the last good data
stays live) when a required nflverse download fails or comes back wrong -- the schedule,
the player stats, the roster or the injury report -- or when the stats would cover fewer
games than the published payload; those are checked before any credit is spent, and a run
refused after a pull still has its prices kept (unpublished) by the workflow. The depth
charts are carried forward with their date shown. A 404 on the stats or the injury report
is judged by what has been published: with none of this season's yet (before the season,
and the stats until nflverse processes the first games) it is a file not posted yet, the run
publishes without it, `not_posted` in the payload and a note on the slate say so, and the
run goes red after its commit once that is overdue; with some published it refuses. The
season is `SEASON` in `part2.js` and nowhere else (`build/season.py` reads it); at a
rollover the job moves last season's price files to `props/data/archive/<season>/` and
bakes only this season's games, so bumping that line is the whole change: `nflbets/build/build.js`
reads it (and stops if its shape changes) and writes its KEY into `nflbets/build/storage.js`, so
neither needs an edit.

`.github/workflows/props.yml` runs five price pulls a week (Mon, Wed, Thu, Sat morning for a
Saturday game, Sat evening for Sunday; ~7 odds-API credits a game), eight post-game and stats
runs, and a daily 12:07 UTC run that lands after nflverse posts the day's injury report,
rosters and depth charts (about 14:20 UTC). GitHub fires this repo's crons 3-9 hours late, so
each pull prices every game kicking off before the next slot plus 10 hours, never a game that
has started, and not one priced in the last twelve hours. The nine `7 ` runs are catch-ups
(`weekly.py --catch-up`): each prices any game up to the next pull that has no prices and has
not kicked off, once a pull's slot is ten hours gone, and spends nothing when every pull ran.
It commits straight to `main`.

## Betting: the loop

```
cd betting/tools && npm install
node betting/tools/update.js     # download + grade + write state.json; exit 1, nothing written, if a file the season needs did not download
python3 betting/joker/joker.py   # the Joker's picks into state.json (pip install -r betting/joker/requirements.txt)
python3 betting/broly/broly.py   # Broly's picks into state.json
node betting/tools/build.js      # checks the app builds; writes nothing (nflbets/build/build.js sets it into the page)
node betting/tools/smoke.js      # the built app, on its own and embedded, then the state against reality (section 5)
node nflbets/build/build.js      # the app changed, so the page that carries it is rebuilt
```

Gate: the app's embedded model numbers must equal
`betting/tools/reference_models.json`, or the publish aborts. The smoke then checks the published
state against what it was built from: this run's injury report and roster, stale inputs flagged on
the absences card, no quarterback who missed the last game on the report counted back in before
this week's report clears him, no 'Home' game abroad, a call from every model for every coming
game (or `modelStatus` saying why), no call moved after its kickoff (against the last commit),
scoreboard finals counted for every model on the frozen call, Team Rankings' record, the record's
disclosure of a model that could not run, and the Joker's refitted weeks drawn like any other.
The files it holds the state to are the ones `update.js` refuses without (`patches.filesDue`: the roster and depth chart from a week before the opener, the injury report
from its first kickoff, the stats once a final is a day and a half old), and it passes in every
phase of a season: the week before the opener, week 1, between playoff rounds and after the Super
Bowl. `BETTING_NOW` stands in for the clock and `BETTING_DATA`/`BETTING_STATE`/
`BETTING_PREV_STATE` for the files, for tests.

The app source is never edited: its behaviour is changed by `betting/tools/patches.js`, applied
as the app is loaded by `update.js` and `build.js` alike, each edit asserted to land exactly once
(who starts at quarterback, the absences card, neutral sites from `betting/neutral_sites.json`,
the call frozen at kickoff in `atKickoff`, the season's phase). The season is the app's own
(`freshState`), read there; the Joker and Broly take it from `state.json`.

`.github/workflows/update.yml` is the betting job (the file name is a leftover from when one
job ran every site). GitHub starts this repo's scheduled runs 3 to 9 hours late, so its slots are
set by when they must land: Fri/Mon/Tue morning and afternoon runs for the results, post-game
runs, and two before each Thursday, Saturday and Sunday kickoff window, early enough that a
9-hour delay still lands before kickoff (a game's call is the last run's before it). The ":37
hourly" slot fires about six times a day with gaps of up to 8 hours: a background refresh, not
an hourly promise. It runs `update.js`, `joker.py`, `broly.py` (each model step may fail alone:
its last good picks stay, `modelStatus` says why on the Pick'em Record) and `smoke.js` (which
builds the app itself), commits `betting/state.json`, and starts `elo.yml` when a final was
graded (even if the smoke or the commit failed: the Elo job reads nflverse, not this state), so
Team Rankings' Elo does not wait for the Elo job's own late slot.
The **Broly Model** (`betting/broly/`) is the betting line plus six team stats: points per game,
points allowed, turnover differential, third-down rate, red-zone touchdown rate and yards per
play for and against, each the season to date with last season blended in early, in a
logistic regression fitted once on 2008-2025 (`fit.py` writes `model.json` and last season's
per-game rates, `prior_<season>.json`; it is never refit on the season in progress). `broly.py`
runs in the job after `joker.py` and writes `processed[gid].broly` and `state.broly`, which the
Pick'em Record draws like the Joker. Before it shipped it was tested on 2018-2025, each season
fitted on the ones before: 65.8% straight up against the Vegas favourite's 66.4%. At a new
season, run `fit.py` on the seasons through the last one so `prior_<last>.json` exists (without
it Broly refuses and says so). Both score playoff games too, and both freeze a game's call at its
kickoff. The Joker was refitted with 2026 weeks 1-2 in its training (`tune_2026.py`, the owner's
call); `model.json` names the weeks (`fitted_weeks`, published as `state.jokerFit` and kept there as
data), and the Pick'em Record draws them like every other week, counted in the Joker's record and its
line against Vegas with no mark, label or note (the owner's call, October 2026).
`joker.py` reads the files `update.js` downloads into `/data` and fetches the season's
play-by-play, so it runs after it and needs the network.

## Player Elo: the loop

```
pip install -r elo/requirements.txt   # pinned: the walk-forward must not move with a library upgrade
python3 elo/build.py             # downloads nflverse player stats 2012-now into elo/cache/, writes elo/data/
python3 elo/check.py             # the gate: the files against the roster, injury report, schedule and published calls; "0 failures"
node elo/check_tab.js            # the ELO Ratings tab on the new files (jsdom from props/build); "0 failures"
node nflbets/build/smoke.js      # the tab reads the files; must end "0 failures"
python3 elo/tools/units_fit.py   # only for a deliberate change to Overall Offense/Defense: refits its constants on 2012-2017
```

The build refuses to write anything when a file the season under way needs (its player stats, depth
charts, injury report, roster, play-by-play) or any past season's cannot be downloaded: it exits 1 and the
last good files stay live. The season comes from games.csv alone (a new schedule becomes the season in
play once its first game is 36 hours old; until then the finished season stays, and its week 1 is called
in the fortnight before; the rankings switch once 16 clubs have a rated game); the playoffs are rated as
they come and `phase` says regular, postseason, over or opening. `elo/check.py` holds the new files against
their sources and against the last publish (the last commit's `elo/data`, which the site serves until the run
commits): a top-ten player of the published rankings is still ranked or sidelined unless his club has played, had a
game rated (the player stats land a night after the score) or he changed clubs; every call the published ledger had
for a game this run can no longer call keeps its pick and its `src`; and a call in `elo/history/` is graded as it
stands there unless a later call, itself published before kickoff, replaced it.

The rankings are of this season alone: each player's second rating (`RS` in the build) starts
the season at 1500 with placement games (K 160 shrinking toward 32, Glicko's idea) and moves only on this season's games;
the number shown is that rating on a bell curve within the position (1500 the average, 100 points a standard
deviation, so the shields split a position as a ranked ladder does; the raw value stays in `raw`); a player is ranked only with games
in a real role in at least half of his club's rated games (a club's bye or a Thursday game elsewhere does not move his bar), and
"through week N" is the last week whose games are all rated, with the week under way beside it; the models (game model, matchups, market + form,
Mismatches) keep the career rating, `elo` in `players.json` beside the season's `se` and `rank`. Opponents count through the
units: `K_UNIT` is 120 so a unit is rated as far from the average as it really is, and a big game against a weak one moves a player little.
They are of players who can play, the rest listed under the table where they would have stood: each club's
current roster is its rows at that club's own latest week (a club on its bye has none for the bye week, and reading
only the league's latest week once called every Chief and Panther a free agent); for each club's next game the
injury report's Out and Doubtful are out, Questionable stays listed with a Q unless he did not practise at the last
report, and before a club files its statuses a player out at its previous report (or inactive after being on it) stays
out until he practises or the club files a report he is not on (WHO PLAYS in the build). The game model scores every
game, past and coming, on the lineup known before kickoff: that week's depth chart (weekly files through 2024, the
last daily snapshot before the game from 2025) minus the week's Outs and Doubtfuls (and, for the coming games, whoever
the roster or the report keeps out), a fullback after every running back and players level on the chart taken by who
has been playing most, so the same data always gives the same numbers, falling back to who
played last game where a chart is silent, with home field 0 at a neutral site; `walk_forward` in `model.json` is that honest
number and `walk_forward_who_played` the hindsight one, kept for comparison only. The ELO Model's record grades the call
published before each kickoff, frozen in the ledger `elo/data/calls.json` (the calls before the ledger began are in
`elo/history/`, recovered by `elo/tools/seed_calls.py`), never one recomputed after the game; weeks 1-2 of 2026 were never
called ahead of time and are kept as a backtest (`src` on each graded call, the split on the tab's bar). Tiers are the betting app's Elo shields, lifted with
its tag into the page and reshaped at build time by `betting/tools/tiers.js` (both builds apply it): Wood League under 1350,
Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Elite (the app's Challenger, renamed so it is not taken for the
Challenger model) from 1700, and HOF from 1750, worn as a gem. The tab is the rankings card: a bell-curve
histogram of the position by shield over the table, and a click on a player opens his window (his rating, then his
matchup this week); at the end of its position row, two pills, Overall Offense and Overall Defense (`units` in
`model.json`, OVERALL OFFENSE AND OVERALL DEFENSE in the build), each a table of the 32 teams: an Elo of this season on
each of nine key stats from nflverse's play-by-play, opponents and home field counted, each side a fixed weighted sum
(offense points 35, success rate 25, EPA a play 15, giveaways 15, sack rate 10; defense points allowed 50, big plays
allowed 30, takeaways 10, sacks 10), fitted on 2012-2017 by `elo/tools/units_fit.py` and no less accurate walk-forward
on 2018-2025 than the old points-and-EPA measure (9.508 against 9.520, not a real gain); third down, red zone, yards a
play and the rest are shown with their league ranks and weigh nothing. The table scrolls sideways inside its card at
every width, the team column held, the columns sort, and a click on a team opens
its window (its rating game by game, every stat ranked raw and with opponents counted, its coming opponent). The page
reads the weights and the stats from the file and still draws an older file's three columns. A final the
play-by-play lacks or has only part of is `pending` and moves nobody; `elo/check.py` replays the season from the
play-by-play and holds every rating and stat to it. The tab's script also puts a second price, "market + form", on every
player leg in the Parlay Builder that has a real book price: the book's chance moved by the
player's Elo on the side of the bet (the rule and its fit are in `tab_elo.html`), shown
beside the model's chance and graded against it, week by week, at the top of the prop
model's Track Record (the Prop Record, now off the tab bar: its section stays in the page unshown), each week on the rating the player took into it (`s0` and `h` in `players.json`; a player out, who is kept out of the map so nothing prices him, keeps his in `past` beside it), never today's. It replaces nothing; a switch has to be earned there. The matchup formula (`matchups.json`, in the build's docstring) projects each expected
starter's stats from his recent form, his Elo and the Elo of the defenders he faces; a player's window on the tab
shows it, the Props tab opens on its Mismatches (the five biggest gaps between a starter's Elo and the unit he faces, in standard deviations, the top thirty behind Show more; a game that has kicked off leaves them, and each bubble wears the player's season shield), each leg in the builder carries its Elo matchup chance, and the Suggested parlays
window's Elo picks are built on it: 2-, 3- and 4-leg parlays of ranked players whose matchup says
they beat the book's price with its margin out, on the stats where the matchup has held up (plus money first, -200 to +300, one leg a
game), built from `pricedLegs()` in the props parts beside the model's own suggestions. A change to the formula is a change to `elo/build.py` (its docstring is the formula: say what
moved and why there) and a rebuild of the data; a change to the tab is `tab_elo.html` and a
rebuild of the page. The Elo model also stands on the Pick'em Record chart, table and pick
grid as a fourth model: `betting/tools/build.js` reads `elo/data/model.json` beside the season
in its published-mode hook (graded calls onto `processed[gid].elo`, the coming week's onto
`S.elo`, each graded there as soon as the season has its score, so a Sunday counts before Tuesday's re-rating; a game under way or awaiting its stats stays in `next` with its frozen call); `record_viz.js` (below) draws it on the chart and the table, and the build widens the app's own Joker lines in the pick grid to draw it there, each edit asserted
to land once. Vegas is the site's baseline: the Pick'ems board's calls, win chances, confidence, score predictions and records are the Vegas favourite's (nflverse's closing moneylines in `state.odds`, margin out, and the spread and total), the Pick'em Record's headline tiles are Vegas's record, Power Ratings is a team Elo of this season's results (every team 1500 at the start, both teams moved after each final by how far the margin beat or missed the expected one, a blowout capped at 21, blended 0.8 to 0.2 with each team's expected lineup on this season's player Elo, which walk-forward helped a little; THE POWER RATINGS in `elo/build.py`, `teams` in `elo/data/model.json`, drawn by `betting/tools/ratings_viz.js` with each team's record (the season's results from `betting/state.json`, so it is current before the Elo file is; a rating that predates a final is starred), the tier shields, the change since its last game and the chance against an average team; it replaced the lineup-on-player-Elo table, which walk-forward on 2018-2025 predicted the next game worse, in weeks 2-6 no better than picking the home team), and the Props list's pick column is the Vegas pick (the market's spread and total wherever a line is posted). The models are named on the page as Alpha Model (the main model), the Challenger Model, the Joker, the ELO Model (the Elo game model) and the Broly Model (below); `betting/tools/build.js` renames the main model in the built app (`RENAME`), and `record_viz.js` and the pick-grid patch write the other names wherever the build draws them, never in the app's source. The Pick'em Record's chart and week-by-week table are drawn over the app's own by `betting/tools/record_viz.js` (wins against Vegas: each model's wins minus the Vegas favourite's on the same games, cumulative, Vegas the zero line; and a models-by-weeks grid shaded by record, every model's every week drawn alike), which the build puts in front of the app's script and `renderRecord()` calls last. The X Bet Log is a bankroll, the same way: `betting/tools/bets_viz.js` (`renderBets()` is wrapped to call `betsViz()` after the app's own) draws its own chart with a switch, Balance (the account week by week from the deposit, a labelled reference line, green above and red below) or Weekly P&L (a labelled column a week from $0, a week off marked), leads the figures with the balance, and adds the balance after each week beside the table's running total; the weeks and the deposit are X's, from `liveparlays/xbets.json` (see "X's parlays and the X Bet Log" below), read only on every device (with no deposit in the file it is X's profit against break even, no balance), and the chosen view is each viewer's, kept in `S.bank` in the browser. The app source is never touched. `.github/workflows/elo.yml` re-rates daily, queued at 12:40 UTC, plus Saturday 20:40 and Sunday 03:40 UTC
for Sunday's calls on Friday's final report (GitHub starts this repo's scheduled runs 4-9 hours late, so a slot is queued
early enough to land before the London and 1pm kickoffs; Tuesday's run takes in Monday night; the rest move only who is
expected to play), runs `elo/check.py`, `elo/check_tab.js` and the nflbets smoke (skipped between the Super Bowl and the
fortnight before week 1, when there is no game to call and the smoke's Elo-picks checks have nothing to read), and commits `elo/data`. The walk-forward record in `model.json` is the honest number: each season called by
a model fitted on the seasons before it. Do not tune the formula on the season in progress.

## College: the loop

```
cd cfb/tools && npm ci
node cfb/tools/simulate.js        # the job over fabricated weeks in a scratch folder; must end "0 failures"
node cfb/tools/update.js          # ESPN -> rate, call, freeze, grade, simulate -> cfb/state.json; exit 1, nothing written, on a failed feed it cannot carry
node cfb/tools/news.js            # the CFB News tab's file: the week's slate, written from the numbers -> cfb/news.json
node cfb/tools/smoke.js           # must end "0 failures" (the job runs it with CFB_SMOKE_STRICT=1)
```

The page is `cfb/index.html`, hand-written, one file; it fetches `state.json` on every
load, so a page change is just an edit (bump `APP_BUILD` in it) and a data change is the
job's. The season is `cfb/tools/season.js` and nowhere else: August to January is that year's,
February to July the finished one stays (`phase` 'over'); on the first run of a new season the
job appends the season just finished to `cfb/data/history.json` from the same scoreboards (and
refuses the new season if that pull fails, has a week with no finals between weeks with games, or
comes back short of the finals the last publish of that season had), so a rollover needs no hand
edit. `history.json` is otherwise twelve seasons pulled once by `tools/history.js` (which merges a
range into the file); `tools/fit.js` chooses the model's parameters on it and writes
`cfb/data/model.json`. Refit only for a deliberate model change, and commit the new numbers with it.

What the page shows is held to reality, in the job, on the page and in the gate:
- A game's call and line are taken at every run while it is to come and frozen from its kickoff,
  by ESPN's status or by the clock (a game whose time is TBD from the start of its day), so a run
  landing after kickoff cannot re-take them; the record grades that frozen call. A line is the one
  ESPN carries at this run: a look-ahead number ESPN has dropped is not kept for a game to come,
  except that a line read within the 24 hours before the game's kickoff is held (`line.held`) so
  the game is graded on the last line before its kickoff; the page shows it dated, with no call
  and no price, and CFB News cites it as the last one read. A postponed or cancelled game (ESPN's
  'post' with `completed` false) offers nothing and is not graded; the line frozen before it is
  kept aside (`heldLine`), so a game suspended and finished later is graded on it. A game that
  kicked off with a frozen call and that ESPN then stops listing stays, call and line kept
  (`gone`). An opponent ESPN lists as TBD is shown without a call and never counted as a win.
- The page never offers a game that has kicked off by the visitor's clock, never offers a line
  older than the job's last run, drops a started leg from the builder, reads live scores from
  ESPN in the browser on load when a game of the week is under way (a score the job saw under way
  is dated), shows a TBD kickoff as its Eastern day with "time TBA", and leads the record with
  the calls made before kickoff beside DraftKings' favourite on the same games.
- A week's scoreboard that does not download is carried from the last publish only when every
  game in it is final or more than five days off; otherwise `update.js` exits 1 before the commit
  and the last good state stays live. Polls that do not download are carried and dated, and so is
  one poll the feed stops carrying in the season (the committee's ranking, which seeds the
  bracket); either is said on the page (`notes`). The current week is the first regular-season week
  with a game to play (Army-Navy holds its week against a bowl the same morning). The field is
  decided (`bracket.final`) once the conference title games are over with nothing left before the
  last of them, and from then the playoff odds play the bracket shown; they keep every played
  playoff result (a team out has no title chance) and use the real bracket once ESPN has it.
- CFB News keeps football headlines only, from after each team's last game, none naming an
  opponent already played; marks a season leader the injury report or a headline has out; lists
  real injury statuses; compares sacks a game; a feed that does not answer is named in the window
  (a game summary that does not answer keeps the last run's preview, dated).
- `smoke.js` holds the page to the clock (on the real week and on made-up games: kicked off, a
  stale line, a held line, a TBD time, a score under way, a postponement, a game ESPN dropped),
  the state to the schedule and the last commit (no frozen call or line re-taken or lost, no graded
  game, week or poll lost), every call against the spread to its edge and every grade to its line,
  the polls to the season, the expected wins to the real games left, the bracket's `final` to the
  schedule and, once final, the odds to the bracket shown, the playoff odds to the playoff's
  results, and the news to the injury report and schedule it was written from. On a checkout
  whose files predate the schema-2 job it skips what only that job writes and says so; strict, as
  the job runs it, those fail. `simulate.js` runs the job itself through a week (lines up,
  kickoffs with ESPN lagging and dropping a game, a game called off and finished after all,
  finals), a failed feed (refused, or carried), a postponement and a lost poll, a line left out
  before kickoff, Army-Navy week, the title games over before the playoff is listed, the 2025
  playoff from the history and the next season's first run (with a failed, an empty and a short
  week of the last one), with the smoke after each; `CFB_SIM_TOOLS` runs a mutated copy of the job
  through it, which must fail.

`.github/workflows/cfb.yml` runs `simulate.js`, the job, the news and the strict smoke 17 times a
week, set by when each run must land: GitHub starts this repo's scheduled runs 3 to 9 hours late,
so a slot that must land before a kickoff is queued about ten hours ahead (daily 06:17 UTC for
Saturday's noon games, Saturday 10:17 for the afternoon, daily 13:47 for any evening), and slots
meant to land after the finals or the Sunday AP poll are queued at them. It commits
`cfb/state.json`, `cfb/news.json`, `cfb/data/teams.json` and, at a rollover, `cfb/data/history.json`.

## Hockey: the loop

```
cd nhl/tools && npm ci
node nhl/tools/simulate.js        # the whole job offline in a scratch folder (today's data, its first evening, a fabricated season, the playoffs, the rollover); must end "0 failures"
node nhl/tools/update.js --scores # the first pass: the season read, scores and schedule written, every call copied from the last state, none made
node nhl/tools/fetch_box.js       # ESPN box scores (one a game, five seasons back) + the injury report (the id read from the player's link)
node nhl/tools/starters.js        # the goalies DailyFaceoff announces, game by game with their dates (answers GitHub's runners only)
node nhl/tools/players.js         # the player and goalie model: replay, report, every game to come lined up -> nhl/data/players.json ("fit" to refit)
node nhl/tools/update.js          # ESPN -> rate, call, freeze at puck drop, grade, simulate -> nhl/state.json; exit 1, nothing written, if a day with games to finish or call does not answer
node nhl/tools/smoke.js           # the page and the state against the injury report, the box scores, DailyFaceoff, the clock and the last published state; must end "0 failures"
node nhl/tools/sources.js         # the job's last step, after the commit: exit 1 if a source the state stands on broke
```

The page is `nhl/index.html`, hand-written, one file, the NBA Hub's look; it fetches `state.json` on
every load, so a page change is just an edit (bump `APP_BUILD` in it) and a data change is the
job's. The NHL has no weeks: the unit is the day (Eastern), and the page opens on a day strip.
`nhl/data/history.json` is fifteen seasons of results (2011-12 on, with the period count) pulled
once by `tools/history.js`; `tools/fit.js` chooses the model's parameters on it and writes
`nhl/data/model.json`. Refit only for a deliberate model change, and commit the new numbers with
it. The model is `tools/elo.js`: an Elo with home ice, back-to-back and rest terms, a weight for a
result past regulation and a goal-margin multiplier, plus a Poisson goals layer (each club's
scoring rates, shrunk to the league's) for the puck line and the total. A side is taken on the
moneyline, the puck line or the total only where the model's chance beats DraftKings' implied by
five points. The call (the chance, margin, total, overtime chance, the line, each side taken and whose
call it is) is made while a game is still to come and frozen at its puck drop by the clock, not only by
ESPN's state, so a game delayed past its start is not called again (nor one whose start ESPN moves
less than half a day later after the puck drop its call was made before, which the page applies too:
no bet on it, and its card says "start moved · call kept"; a game moved to another day
is a game to come again); after it, every part is copied from the last state and graded as it stands,
never recomputed. Only the job's second pass makes calls: `update.js --scores` copies every call as it
found it, so a puck drop between the two passes is graded on the call the page showed. Rows an older
job wrote after puck drop (it recomputed the puck-line side on the team Elo's margin, so 25 of the
first 57 graded games were graded on a puck-line side other than the one shown, and that record read
11-8 for picks that went 15-5) are put back once to the call shown from the inputs they kept, the team
Elo's view beside it from the replay (a final) or the ratings as they stand (a game under way): a
replay of every committed state matched the last pre-game row on every field, `elo` included, on all
61 started games, and `simulate.js` holds the rebuild to that on rows it rewrites the older job's way.
A game leaves the schedule only on the feed's word (postponed or cancelled, or moved to another day);
one a scoreboard answer merely leaves out is kept with its call, line and grade (`kept` in the state;
a score under way kept so carries the time it was read, `scoreAt`, which the card shows),
an answer with no game on a day the last state has games on is no answer, and every game taken off is
listed in `removed` with the feed's reason.

`.github/workflows/nhl.yml` runs five times a day on ESPN's free feeds, each slot queued for the
window it must land in at the 2.7 to 8.7 hours late GitHub starts this repo's runs (the night's finals
and the morning lines; before 7pm Eastern; the last read before 7pm at the usual lateness; before 10pm;
the night's finals), and once on a push to `nhl/tools`, the page or the workflow, so a change is proved
on the real feeds and the state is the new job's at once. The simulation first: `tools/simulate.js`
plays the whole job offline on fixtures in the feeds' own shapes. Today's real state, box scores and
injury report go through the job in its order with planted cases (an injured top goalie, a skater out
by name only, a goalie on another club's report, DailyFaceoff confirming a backup with its date written
as midnight GMT, naming a debut and an unconfirmed goalie dated by a GMT stamp, a stale entry, the first
night of a back to back postponed), then the refusals (a scoreboard day unanswered, the injury report
silent or empty, DailyFaceoff silent, in a new shape, or naming games that match nothing on the
schedule); the first evening after a change (games under way and not boxed, the published calls an
older job's, the night after a back to back to call) and rows an older job rewrote after puck drop put
back exactly; a fabricated season whose evening runs the two passes either side of a puck drop and
finds games under way, one still "scheduled" past its puck drop and one whose start moved an hour,
then a scoreboard answer that is blank or leaves games out (one postponed, one moved to another day);
the season played out and the playoffs (a sweep, an upset, the Final); and the rollover. On opening
night, in the summer and before a schedule is out it plays what there is (last season's starters,
last season's schedule a year on) and skips what needs a game to come. `NHL_TODAY`, `NHL_NOW`,
`NHL_STATE`, `NHL_OUT`, `NHL_TEAMS`, `NHL_DATA` and `NHL_FIXTURES` are the hooks; the real files are
never touched. The job then runs `update.js --scores` (so last night's finals are boxed in the same
run, and players.js lines up on the schedule the calls are made on: both passes read every day),
`fetch_box.js`, `starters.js`, `players.js`, `update.js`, the smoke test, the commit, and last
`sources.js`, which fails the run after the commit when the injury report in use is over twelve hours
old, has no rows or mostly lacks ESPN ids, or DailyFaceoff answered in a shape nothing could be read
from or with games none of which matched the schedule: the page still publishes and says so on its
Games tab.

The smoke test holds the published state to reality, each source read on its own terms: nobody the
injury report has out, on injured reserve or suspended is in a lineup or in goal (a goalie DailyFaceoff
confirms excepted), no goalie listed on another club's report is named for his old one, a goalie named
by the rule has played for the club and, once it has three games, started one of them, a back to back
is one and its goalie is not the one who started the night before (the box score) or is named for it
(a game still to come; one under way or over and not yet boxed is not compared), DailyFaceoff's names
reach their games, no call was made after its puck drop or moved since (the last published state,
`NHL_PREV_STATE` or git's `HEAD`), no started call of that state is gone unless `removed` gives the
feed's reason, the state is the second pass's, a call that is the player model's carries its margin,
the page opened at a puck drop offers no bet on that game and calls the visitor's day Today, and a club
knocked out of the playoffs has no Cup chance. The season is the Eastern date's
(`E.seasonOf`), nowhere else. Between seasons the first run from August closes the old one into
`nhl/data/season_<year>.json` (read beside `history.json` by `tools/hist.js`), so its results stay in
both models; a season in neither file nor the last state is refused. In the playoffs the field is the
real one, each series is played on from its real score and the bracket shows it; `phase` is preseason,
regular, postseason, over (the champion named) or offseason.

The player model (`tools/players.js`) is the NBA Hub's idea: every skater an offence and a defence
rating, every goalie a save rating, in goals a game for a player on the ice all game; a club is its
lineup weighted by ice time plus its goalie; after a final the surprise in regulation goals moves
who was on the ice. Fitted on 2022-23 to 2024-25 with 2025-26 held out, and scored cold season by
season (walk-forward); `report.use` in `players.json` is whether it beat the team Elo cold, and only
then does the page's call switch to it (`by: 'players'` on the game row, the Elo's view kept beside
it as `elo`). Do not tune it on the season in progress. Each game's lineup (WHO PLAYS in
`players.js`) is who dressed last, less anyone ESPN's injury report has out, on injured reserve or
suspended and anyone listed by another club or whose latest game was for one; the report is matched by
the ESPN id `fetch_box.js` reads from the player's link (the feed has no id field: before October 2026
every id was "undefined" and nobody was ever taken out), else by club and name, else by a name only one
rated player has. Day-to-day players stay in, flagged. The goalie is chosen game by game: the one
DailyFaceoff names for that game and date (Confirmed, Likely or Unconfirmed, said exactly), else the
club's goalie with the most starts in its last ten games this season (then last season's starts for the
club), never one who is out or elsewhere; on the second night of a back to back (the club's previous
game, played or not, the day before) the other goalie from the one who started that game (its box
score), or is expected to (the same choice, while it is to come, under way or not yet boxed). The team
Elo's gap it blends is its own replay of every final, this run's. The card says which, names the injury report it
was built on, and says when a club's last box score is not read yet; the page says when the injury
report or DailyFaceoff could not be read. The Players tab shows the rankings with a five-season line
each, and which report and goalies the clubs stand on.

## Bets and Stats: the loop

The tab bar (`TABS` in `nflbets/build/build.js`) is Pick'ems, Props, X Parlays (the prop model's Parlay Builder tab, still
`#parlay`), Team Rankings (the Power Ratings frame, renamed), ELO Ratings (the Player Elo tab, renamed), Pick'em Record,
X Bet Log (the Bet Log frame, still `#bets`); a prop model section with no button there stays in the page, unshown.
`nflbets/index.html` is the prop model's page (part1 + part2 + part3, assembled by
`nflbets/build/build.js` the way `assemble.py` assembles it) with the Pick'ems board set in
front of it as its own `pk-` prefixed section, the X Parlays section lifted out of
`liveparlays/build/page.html` into the X Parlays tab (styles scoped to `#lpCard`, script in a
closure): X's card (`#lpCard`, X's placed parlays from `liveparlays/parlays.json`, read only, a
parlay marked `cleared` left out, a quiet line under the heading saying when the file last changed)
at the top of the tab and the builder under it. No device keeps a list of its own (the owner's
call: visitors come to see X's parlays), and on every device the builder's Save and lock is
**Finish parlay**: it opens the parlay card
(`nflbets/build/card.html`, `pc-` prefixed, its own closure), a window showing the parlay as a
card (each leg and its price, the parlay's price, the stake and what it pays, the model's chance
beside the price's, the week and its dates, the site's mark) with **Download image** (a PNG drawn
on a canvas at twice its size, `parlay-week6-3legs.png`; the share sheet too where the browser can
share a file, which is how a phone saves it to Photos) and **Start over**. Every dollar figure on
it is whole, thousands marked: the window's tiles wrap onto a second row rather than cut one, and
the image's step down from 19px to 14px, then take a second row. Finishing saves
nothing anywhere; the Suggested parlays window's tiers (the model's and the Elo picks') finish the
same way. The build lifts renderParlay's pricing out of `part3.js` into the
card, so its price is the builder's own. Where X's parlays and the X Bet Log come from is in
"X's parlays and the X Bet Log" below. Then the Player Elo tab
from `nflbets/build/tab_elo.html` (`pe-` prefixed, its own closure, reading `elo/data/`), and the betting
app's Records, Power Ratings and Bet Log tabs in frames: the app, as `betting/tools/build.js`
builds it, is carried in the page as a string (`BET_APP`) and becomes a frame's srcdoc when
its tab is first opened, with `window.EMBED_TAB` and `window.STATE_URL` written in front of
it. A srcdoc frame is the page's own origin, so the app keeps its browser store. A frame takes
the height of its content and never scrolls up and down by itself (`frames()` in
`tab_pickems.html`): allowed to, a classic scrollbar, Windows Chrome's with its arrows, stuck in the
Pick'em Record with nothing to scroll, since its charts drawn without the bar came out a few px
taller than the height measured with it. Sideways, a box scrolls only where its content is really
wider (the week-by-week grid and the pick grid on a phone), with one bar.
Nothing is baked in: it fetches `props/data/payload.json`, `betting/state.json`,
`liveparlays/parlays.json`, `liveparlays/xbets.json` and `elo/data/*.json`, so it is rebuilt when a
source changes, never when the data does. A props patch, a betting build change or an edit to the live section's source means
rebuilding it too:

```
node nflbets/build/build.js
node nflbets/build/smoke.js       # must end "0 failures"; includes X Parlays and the X Bet Log from their files
node nflbets/build/smoke.js --season-over   # the same with every game played (the playoffs, the off-season)
node nflbets/build/smoke_live.js  # the X Parlays section from its file, on a plain browser and one the retired owner layer marked, and the parlay card; must end "0 failures"
```

The elo job runs `smoke.js` every morning of the year, so it has to hold in any week: it takes the
board's week the way the board does (the first with a game still to play, else the last), checks
what needs a game to come only when there is one, and, once the payload's last game is about to
kick off, boots the page two days before it so the builder checks still have a game
to stand on. `--season-over` gives every game a result first; run it after a change to the smoke or
to the Pick'ems board. Both smokes end on their own: a mistake in the smoke's code exits 1 at once
with its stack, a run still going after ten minutes stops and fails, and one left waiting on
nothing (no window open, its body not done) fails instead of ending Node with a silent exit 0.

`nflbets/build/storage.js` (the browser's own storage), `nflbets/build/xbets.js` (the X Bet Log's
adapter) and `nflbets/build/card.html` (the parlay card) are inlined by the build, so a change to any
is a rebuild too. `smoke_live.js` section J holds the card to all of the above: Finish, every leg and
the price in the window, the image (a recorder canvas, since jsdom draws nothing), the share sheet,
Escape, Tab and Start over, and nothing written by finishing, on a plain browser and on one the
retired owner layer marked. Both smokes record every request a page makes: one to the retired
Firebase store or its sign-in services, or anything but a read, fails them.
`smoke.js` runs the build in memory (`require('./build.js')` writes nothing) and fails unless
`nflbets/index.html` and `preview.html` match it byte for byte, so a source committed without the
rebuild fails the gate, and the elo job, which runs this smoke every morning, stops on it. It
also runs the betting job's `reference_models.json` gate on the copy of the betting app inside the
page (`BET_APP`). The prop model's storage key is read from part2's `SEASON`/`KEY` line at build
time and written into the storage layer, and the betting app's season (`betting/tools/build.js`
exports `BET_KEY` and `SEASON`) into the X Bet Log; the build stops if part2's `BET_KEY` is not the
app's. The Pick'ems board takes its
season from `state.json` and the X Parlays section from each game id, both asking ESPN for the
week in its own numbering (weeks 19-22 are the playoffs, seasontype 3), so nothing in
`nflbets/build/` or `liveparlays/` names a season.

The build also writes `nflbets/preview.html`: the same page with `nflbets/build/preview_theme.css`
(the NBA Hub's look) laid over it and passed into the betting frames. It is a look to try, not a
second site; delete the file, the stylesheet and the build's preview block to drop it, or fold the
stylesheet into the parts to adopt it.

A parlay X placed at the book goes in `liveparlays/parlays.json`, and a week of the X Bet Log in
`liveparlays/xbets.json`, by Claude from what the owner sends, as each file's `how` field
describes: every device shows it on its next load.

## The sites behave like websites

The owner publishes a change and expects it on every device on the next load. Nothing
may quietly outrank what the job published:

- **Published data wins over anything a browser kept.** Local storage holds only what the
  visitor made -- their own builder, saved slips, picks, bankroll, settings -- and nothing of X's.
  Schedule, scores, stats, prices, ratings and projections are read from
  `props/data/payload.json` and `betting/state.json` on every load, and X's parlays and the X
  Bet Log from `liveparlays/`. The prop model keys its
  saved season on `PAY.baked_at`, which moves on every run of the job, so a run always
  rebuilds; the betting app already merges only the visitor's keys over the published state.
- **A routine rebuild is silent.** The job publishes several times a week. Only a model or
  roster change is worth a banner.
- **Every page says which build it is.** `buildTag` on the Bets and Stats header: `APP_BUILD`
  (the prop model's parts) and the page's own hash (`PAGE_HASH`, the first seven hex of its
  SHA-256), so any source change -- the Pick'ems tab, the X Parlays section, the parlay card, the storage layer,
  the X Bet Log, the betting app -- shows as a new tag. Without it a stale copy cannot be told from a current one.
- **A frame's content is in the page.** The betting tabs are srcdoc frames filled from a
  string inside `nflbets/index.html`, so nothing is fetched or cached for them apart from
  the page itself: a refresh of the page is a refresh of the frames.
- **Data fetches are `cache: 'no-store'`.** The HTML is served by GitHub Pages with its own
  ten-minute cache, which a reload clears; nothing else may hold data longer than that.
- **X's parlays and the X Bet Log are files, the same on every device, read only everywhere.**
  There is no owner, no sign-in and no shared store: nothing on the page writes anywhere but the
  visitor's own browser storage. The two files are the source, beside each other in `liveparlays/`:
  - `liveparlays/parlays.json` is X Parlays: the parlays X placed at the book. Claude adds one from
    the slip the owner sends in chat (the game, each leg's player, team, stat, line and side, the
    stake, the price and the payout; the file's `how` says how each is written), corrects a line
    the book moved by writing the line X took, and marks a parlay the owner no longer wants on the
    page `"cleared": true`, which keeps it in the file as history and off the page.
  - `liveparlays/xbets.json` is the X Bet Log: `season`, `deposit` and `weeks` (`w1` to `w22`, each
    `staked`, `returned` and an optional plain-text `note`), plus `updated`. Claude adds or changes
    a week from what the owner sends (the week, what was staked, what came back).
  Every device reads both on every load (`cache: 'no-store'`). `liveparlays/build/page.html`
  draws X Parlays from the first; `nflbets/build/xbets.js` reads the second and hands it to the
  betting frames as `parent.XBETS`, and `betting/tools/build.js`'s hook lays it into the app's
  `S.bets` and `S.bank.deposit`, read only (no entry form, Remove, deposit box or backup card),
  leaving the browser's own Bet Log in the app's key untouched. `nflbets/build/storage.js` is the
  browser's own storage for the prop model (`window.storage` over localStorage), and on load it
  takes out what the retired layers left: their flags and their copies of the old shared documents,
  never anything that holds a visitor's own data, and the old section key or a week that never
  reached the store only where all it holds is in the files.
  Until 10 October 2026 both lived in a Firebase Realtime Database written from the owner's
  devices; its last state was carried into the two files, and the database is retired (the owner
  may delete it, or lock its rules to `false`).

## Conventions

- **Patch scripts.** A change to the props parts is applied by a
  `props/build/patch_<name>.py` that is committed with it. Each opens with a
  prose docstring saying what changed and why, and uses a `sub1()` helper that
  asserts the old text appears exactly once, so a silent partial edit is
  impossible. Follow the existing ones for tone and shape.
- **Version bump.** Any props app change bumps `APP_BUILD` in `part2.js`
  (`app vNN · YYYY-MM-DD`); betting changes bump their own version.
- **Commit messages** are prose, not bullets: what changed, why, what the audit
  reported. Look at recent commits before writing one. End with the
  `Co-Authored-By` and `Claude-Session` lines the session provides.
- **`live_parlays_v1` and `my_parlays_v1` are retired keys.** Nothing reads, draws or writes
  either: X Parlays is the file, read only. `storage.js` removes `live_parlays_v1` from a browser
  only where all it holds is in the file: the one line the store last held corrected
  (`file|w3-dk-sgp-5|4` at 239.5, now the file's), deletions and betting slips it deleted itself.
  Any other corrected line (one a browser last opened before the store may hold, on X's parlay or
  its own) keeps the key, unread; `my_parlays_v1`, which held a visitor's own corrected lines, is
  left as it is.
- **Visitor data is the visitor's.** Picks, parlays, bankroll, bets and self-loaded odds are
  never written to the repo or anywhere else. A visitor's own builder, picks, bankroll, bet log and
  odds live in their browser's local storage only; a parlay they finish becomes a card they
  download, saved nowhere; X's parlays and the X Bet Log are the files in `liveparlays/`, which no
  page writes. What a browser saved before (the prop model's saved list, `my_parlays_v1`, the
  betting app's own Bet Log and `x_nfl_bets_preshare_<season>`) stays in its storage, undrawn and
  never deleted. Anything held per-session and not meant to persist
  (for example the game pages' suggested parlays, cached in `GAME_TIER_CACHE` in `part3.js`) is kept outside the saved state object `S`, so
  it is never serialised.
- **No secrets in the repo.** `ODDS_API_KEY` is a repository secret and only the
  props workflow touches it.
