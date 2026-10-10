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
| `nflbets/` | X NFL Bets and Stats: the two models on one page, built one tab at a time, with X Parlays (the owner's parlays over each visitor's own builder) and the X Bet Log as tabs | `nflbets/build/tab_pickems.html` + `liveparlays/build/page.html` + the props parts + the betting app + `nflbets/build/sync.js` and `xbets.js` |
| `cfb/` | X College Football Bets: a test site, moneylines and spreads only. Its own page, job and data; nothing shared with the NFL sites but the look | `cfb/index.html` (hand-written), `cfb/tools/` |
| `nhl/` | X NHL Bets: the NBA Hub's idea on hockey, moneylines, puck lines and totals. Its own page, job and data; nothing shared with the other sites | `nhl/index.html` (hand-written), `nhl/tools/` |
| `liveparlays/` | retired as a page: `index.html` redirects to `nflbets/#parlay`; `parlays.json` is X's placed parlays, the file the X Parlays section reads, and `build/page.html` is the section's source | `liveparlays/build/page.html`, `liveparlays/parlays.json` |
| `elo/` | Player Elo: every player rated by position since 2012, the roster model built on those ratings and the matchup formula; `elo/data/*.json` is what the Player Elo tab reads | `elo/build.py` (the formula is its docstring); `nflbets/build/tab_elo.html` is the tab |

## Source vs generated -- never edit a generated file

These are rebuilt from source on every scheduled run, so an edit to one is lost
at the next refresh:

- `props/app/prop_model_2026.html` (gitignored: the audit's subject, never published)
- `betting/state.json`
- `cfb/state.json`, `cfb/news.json`, `cfb/data/teams.json`
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
bakes only this season's games, so bumping that line (with the key in `nflbets/build/sync.js`
and the assert in `nflbets/build/build.js`) is the whole change.

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
python3 betting/joker/long/joker_long.py   # Joker Jr's picks, the test beside the Joker
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
scoreboard finals counted for every model on the frozen call, Team Rankings' record, and the
record's disclosures. The files it holds the state to are the ones `update.js` refuses without
(`patches.filesDue`: the roster and depth chart from a week before the opener, the injury report
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
call); `model.json` names the weeks (`fitted_weeks`) and the Pick'em Record hatches them and gives
its record without them.
The **Joker Jr** (`betting/joker/long/`) is a shadow model, a test running beside the live
Joker, never in its place: the Joker's own recipe and inputs (less the two preseason win totals,
which do not exist before 2019) fitted once on 2010-2025 instead of 2019-2025, with no 2026 week in
its training. Research in October 2026 found it right on 65.2% of 2021-2025 regular-season games
walking forward against the 2019 start's 63.0% (Vegas 66.5%; p about 0.06); `fit.py` re-derives
those numbers into `model.json` (`fit.py data` builds its frozen `data/`: nflverse's 2010-2018 games,
team stats and quarterback table under the Joker's own 2019-2025 files). `joker_long.py` runs in the
job after `joker.py` (`continue-on-error`, like the others) and writes `state.jokerLong` (the calls),
`processed[gid].jokerLong` (graded on the call shown) and `state.jokerLongInfo` (`since`, the run
that first published it, and the walk-forward). Its calls freeze at kickoff like every model's. A
game since kickoff with no call (every game before `since`: the owner asked for its picks on all of
2026) is replayed from the data as it stood before that kickoff: the season's files cut back to the
games kicked off at least six hours earlier, after-the-game fields (scores, overtime, weather,
referee) blanked and every other game's stats and plays removed, the game scored as one still to
come; the line and quarterbacks are nflverse's for the game, the closing line and the starters.
Those calls carry `backfill` (and `late` if a run missed one after `since`), count in its record
like the rest, and the Pick'em Record says in one line how they were made. Read it on the Pick'em
Record: its dashed dark-red line and its row sit beside the Joker's, its column in the pick grid
beside the Joker's. Compare the two on the same games from week 3 on (the Joker's weeks 1-2 are a
fit, not calls). Consider switching the Joker to the long fit only once it has led the live Joker
over a full season of calls, and then refit it through the season just finished; a lead of a few
games in one season is chance. The smoke test (5m) holds it to all of this: the workflow step, each
grade on the call shown, `backfill` exactly before `since`, every call backfilled by this run
recomputed exactly from files poisoned with made-up finals after the cut (and the latest older one
within 0.05, for nflverse's revisions), its line, row, column and note, and, with its
`model.joblib` gone (`JOKER_LONG_MODEL` points the step elsewhere), the step exiting 1 with every
call and grade kept and the record saying why. In a run where the step did not run
(`modelStatus.jokerLong` says why) the smoke skips the recomputation, since that run backfilled
nothing and the recomputation would need what the step lacked: a lost artefact or a failed download
must never fail the smoke and stop the whole publish over a test, and 5m checks that on the state the
missing-model step leaves. The smoke runs it with `python3`; `PYTHON` names another.
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
to land once. Vegas is the site's baseline: the Pick'ems board's calls, win chances, confidence, score predictions and records are the Vegas favourite's (nflverse's closing moneylines in `state.odds`, margin out, and the spread and total), the Pick'em Record's headline tiles are Vegas's record, Power Ratings is a team Elo of this season's results (every team 1500 at the start, both teams moved after each final by how far the margin beat or missed the expected one, a blowout capped at 21, blended 0.8 to 0.2 with each team's expected lineup on this season's player Elo, which walk-forward helped a little; THE POWER RATINGS in `elo/build.py`, `teams` in `elo/data/model.json`, drawn by `betting/tools/ratings_viz.js` with each team's record (the season's results from `betting/state.json`, so it is current before the Elo file is; a rating that predates a final is starred), the tier shields, the change since its last game and the chance against an average team; it replaced the lineup-on-player-Elo table, which walk-forward on 2018-2025 predicted the next game worse, in weeks 2-6 no better than picking the home team), and the Props list's pick column is the Vegas pick (the market's spread and total wherever a line is posted). The models are named on the page as Alpha Model (the main model), the Challenger Model, the Joker, the ELO Model (the Elo game model) and the Broly Model (below); `betting/tools/build.js` renames the main model in the built app (`RENAME`), and `record_viz.js` and the pick-grid patch write the other names wherever the build draws them, never in the app's source. The Pick'em Record's chart and week-by-week table are drawn over the app's own by `betting/tools/record_viz.js` (wins against Vegas: each model's wins minus the Vegas favourite's on the same games, cumulative, Vegas the zero line; and a models-by-weeks grid shaded by record), which the build puts in front of the app's script and `renderRecord()` calls last. The X Bet Log is a bankroll, the same way: `betting/tools/bets_viz.js` (`renderBets()` is wrapped to call `betsViz()` after the app's own) draws its own chart with a switch, Balance (the account week by week from the deposit, a labelled reference line, green above and red below) or Weekly P&L (a labelled column a week from $0, a week off marked), leads the figures with the balance, and adds the balance after each week beside the table's running total; the weeks are X's (see "X's parlays and the X Bet Log" below), read only on a visitor's device, the deposit is the owner's own unless `nflbets/sync.json` shares it (without it a visitor sees X's profit against break even, no balance), and the chosen view is each viewer's, kept in `S.bank` in the browser. The app source is never touched. `.github/workflows/elo.yml` re-rates daily, queued at 12:40 UTC, plus Saturday 20:40 and Sunday 03:40 UTC
for Sunday's calls on Friday's final report (GitHub starts this repo's scheduled runs 4-9 hours late, so a slot is queued
early enough to land before the London and 1pm kickoffs; Tuesday's run takes in Monday night; the rest move only who is
expected to play), runs `elo/check.py`, `elo/check_tab.js` and the nflbets smoke (skipped between the Super Bowl and the
fortnight before week 1, when there is no game to call and the smoke's Elo-picks checks have nothing to read), and commits `elo/data`. The walk-forward record in `model.json` is the honest number: each season called by
a model fitted on the seasons before it. Do not tune the formula on the season in progress.

## College: the loop

```
cd cfb/tools && npm ci
node cfb/tools/update.js          # ESPN -> rate, call, freeze, grade, simulate -> cfb/state.json
node cfb/tools/news.js            # the CFB News tab's file: the week's slate, written from the numbers -> cfb/news.json
node cfb/tools/smoke.js           # must end "0 failures"
```

The page is `cfb/index.html`, hand-written, one file; it fetches `state.json` on every
load, so a page change is just an edit (bump `APP_BUILD` in it) and a data change is the
job's. `cfb/data/history.json` is twelve seasons of results pulled once by
`tools/history.js`; `tools/fit.js` chooses the model's parameters on it and writes
`cfb/data/model.json`. Refit only for a deliberate model change, and commit the new
numbers with it. `.github/workflows/cfb.yml` runs six times a week on ESPN's free feeds.

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
less than half a day later after the puck drop its call was made before; a game moved to another day
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
`liveparlays/build/page.html` into the X Parlays tab (styles scoped to `#lpCard` and `#myCard`,
script in a closure): X's card (`#lpCard`, the owner's parlays) at the top of the tab, the
builder under it, and Your parlays (`#myCard`, a visitor's own) under that, where the prop
model's Saved parlays card was: a saved parlay is watched the moment it is saved, and deleting
it there deletes it. Which parlays are whose, and who may change them, is in "X's parlays and
the X Bet Log" below. Then the Player Elo tab
from `nflbets/build/tab_elo.html` (`pe-` prefixed, its own closure, reading `elo/data/`), and the betting
app's Records, Power Ratings and Bet Log tabs in frames: the app, as `betting/tools/build.js`
builds it, is carried in the page as a string (`BET_APP`) and becomes a frame's srcdoc when
its tab is first opened, with `window.EMBED_TAB` and `window.STATE_URL` written in front of
it. A srcdoc frame is the page's own origin, so the app keeps its browser store.
Nothing is baked in: it fetches `props/data/payload.json`, `betting/state.json`,
`liveparlays/parlays.json` and `elo/data/*.json`, so it is rebuilt when a source changes, never
when the data does. A props patch, a betting build change or an edit to the live section's source means
rebuilding it too:

```
node nflbets/build/build.js
node nflbets/build/smoke.js       # must end "0 failures"; includes the sync layer against a stubbed store
node nflbets/build/smoke.js --season-over   # the same with every game played (the playoffs, the off-season)
node nflbets/build/smoke_live.js  # the X Parlays section, with no store, as the owner and as a visitor; must end "0 failures"
node nflbets/build/stress_sync.js [seed]   # after a change to sync.js: three of X's devices and a visitor's at random
```

The elo job runs `smoke.js` every morning of the year, so it has to hold in any week: it takes the
board's week the way the board does (the first with a game still to play, else the last), checks
what needs a game to come only when there is one, and, once the payload's last game is about to
kick off, boots the page two days before it so the builder and the sync checks still have a game
to stand on. `--season-over` gives every game a result first; run it after a change to the smoke or
to the Pick'ems board. Both smokes end on their own: a mistake in the smoke's code exits 1 at once
with its stack, a run still going after ten minutes stops and fails, and one left waiting on
nothing (no window open, its body not done) fails instead of ending Node with a silent exit 0.

`nflbets/build/sync.js` (the sync layer) and `nflbets/build/xbets.js` (the X Bet Log's adapter) are
inlined by the build, so a change to either is a rebuild too.
`smoke.js` runs the build in memory (`require('./build.js')` writes nothing) and fails unless
`nflbets/index.html` and `preview.html` match it byte for byte, so a source committed without the
rebuild fails the gate, and the elo job, which runs this smoke every morning, stops on it. It
also runs the betting job's `reference_models.json` gate on the copy of the betting app inside the
page (`BET_APP`). The prop model's storage key is read from part2's `SEASON`/`KEY` line at build
time and written into the sync layer and the X Parlays section, and the betting app's own key and
season (`betting/tools/build.js` exports `BET_KEY` and `SEASON`) into the sync layer and the X Bet Log;
the build stops if part2's `BET_KEY` is not the app's. The Pick'ems board takes its
season from `state.json` and the X Parlays section from each game id, both asking ESPN for the
week in its own numbering (weeks 19-22 are the playoffs, seasontype 3), so nothing in
`nflbets/build/` or `liveparlays/` names a season.

The build also writes `nflbets/preview.html`: the same page with `nflbets/build/preview_theme.css`
(the NBA Hub's look) laid over it and passed into the betting frames. It is a look to try, not a
second site; delete the file, the stylesheet and the build's preview block to drop it, or fold the
stylesheet into the parts to adopt it.

A parlay X placed at the book goes in `liveparlays/parlays.json`, by hand, as its `how`
field describes: X Parlays shows it as placed on every device.

## The sites behave like websites

The owner publishes a change and expects it on every device on the next load. Nothing
may quietly outrank what the job published:

- **Published data wins over anything a browser kept.** Local storage holds only what the
  visitor made -- their own parlays, saved slips, picks, bankroll, corrected lines, settings --
  and, on the owner's devices, the copy of X's parlays and X Bet Log the device writes from (a
  reader keeps the last copy of X's it saw, shown, marked, only while the store is out of reach).
  Schedule, scores, stats, prices, ratings and projections are read from
  `props/data/payload.json` and `betting/state.json` on every load. The prop model keys its
  saved season on `PAY.baked_at`, which moves on every run of the job, so a run always
  rebuilds; the betting app already merges only the visitor's keys over the published state.
- **A routine rebuild is silent.** The job publishes several times a week. Only a model or
  roster change is worth a banner.
- **Every page says which build it is.** `buildTag` on the Bets and Stats header: `APP_BUILD`
  (the prop model's parts) and the page's own hash (`PAGE_HASH`, the first seven hex of its
  SHA-256), so any source change -- the Pick'ems tab, the X Parlays section, the sync layer,
  the X Bet Log, the betting app -- shows as a new tag. Without it a stale copy cannot be told from a current one.
- **A frame's content is in the page.** The betting tabs are srcdoc frames filled from a
  string inside `nflbets/index.html`, so nothing is fetched or cached for them apart from
  the page itself: a refresh of the page is a refresh of the frames.
- **Data fetches are `cache: 'no-store'`.** The HTML is served by GitHub Pages with its own
  ten-minute cache, which a reload clears; nothing else may hold data longer than that.
- **X's parlays and the X Bet Log are the same on every device, and only X writes them.**
  X Parlays (the builder, the saved parlays, the stake, the book price, the margin, the
  section's key: corrected lines, deletions, the builder kept at kickoff, and X's betting slips
  by device) is one shared JSON document every device reads when the page opens and re-reads
  every few seconds while on screen; the X Bet Log is a second one beside it. Only the owner's
  devices write; everyone else's is a reader, whose X Parlays card is read only and whose own
  builder and parlays stay in their browser (Your parlays). The layer is `nflbets/build/sync.js`:
  it defines the `window.storage` the prop model saves through and the `window.LIVE_IO` the
  section's key goes through, and its header says how it works; `docs/ARCHITECTURE.md` ("X's
  parlays and the X Bet Log") has the whole of it and the owner's setup.
  - *Who the owner is* is read from `nflbets/sync.json` on every load, in two layers. The owner
    link (`ownerHash`, the SHA-256 of a secret the owner holds, never in the repo): the page
    opened once as `#owner=<secret>` takes the secret off the address, hashes it and, on a
    match, keeps it in that browser (`nflowner_v1`); the header shows "owner" and X Parlays
    "sign out of owner". It stops visitors' pages from writing, not someone with the store's
    address and curl: the store's rules are open until the second layer is set up. Firebase
    sign-in (`apiKey` and `owner`, the owner's uid; dormant while they are blank): email and
    password over Firebase's REST API, the session (never the password) in
    `nflsync_owner_v1`, every write carrying `?auth=` with the ID token; with the rules locked to
    the uid nobody else can write at all. The owner's console steps and the locked rules are in
    `docs/ARCHITECTURE.md`; lock the rules only after the page carrying sign-in is live and the
    owner has signed in on each device.
  - *Among X's devices* nothing is lost: every write reads the store's rev first and, if another
    device wrote since, merges three ways against the document both started from (what only one
    side changed is taken, a deletion holds, where both changed a thing the writer's change
    wins); a poll merges the same way, so a phone edited offline merges when it is back; a page
    going to the background or away looks first too (keepalive requests), and a change it could
    not send waits for its next visit; each document carries its last fifty revs and each device
    keeps the last few documents it read or wrote (`nflsync_v1`, `nflsync_base_v1`), so a write
    overwritten by one made at the same instant (or on an older document) is merged and written
    again. An owner's browser joins the document the first time it reads it (its own saved
    parlays are added), so the owner's first visit adopts the document and loses nothing. A
    lapsed sign-in holds the device's writes and asks for sign-in; nothing is lost. A refusal is
    held per document: one of the X Bet Log's never holds the parlays' writes, nor the reverse.
  - *A reader's browser* never writes and never joins. The first time it opens as a reader
    (`xparlays_v1`), the copy of the document it kept from when every device wrote (the saved
    parlays and builder legs in its remembered documents) leaves its own list, so a visitor's old
    mirror never flows back into X's; signing out of owner does the same.
  - *The X Bet Log* is `<the parent of sync.json's url>/xbets/<season>`, never inside `/nflhub`
    (a parlay write replaces that whole node), written by PATCH a week at a time, read by every
    device; `nflbets/build/xbets.js` hands it to the betting frames as `parent.XBETS`, and
    `betting/tools/build.js`'s hook lays it into the app's `S.bets` (read only for a visitor,
    whose own log stays in the app's key untouched) and writes only the weeks a frame changed.
    Each of the owner's browsers moves its own weeks in once a season (the shared week kept where
    they differ): its log is copied aside (`x_nfl_bets_preshare_<season>`) the moment the device is
    known to be the owner's, and the app's key keeps the browser's own weeks, whatever a frame saves,
    until they have joined and the log has been read, so a slow, failed or refused read loses
    nothing (the frames share the page's browser store). A week the store would not take waits in
    the browser too (`xbets_pending_<season>`), shown, and is written the next time the store
    answers, on that visit or a later one. The deposit is shown to visitors only with
    `"shareDeposit": true` in `sync.json`.
  - *Nothing from the store is drawn as it came*: until the rules are locked anyone with the
    address can write the parlays, so `sync.js` cleans the document on the way in and every copy a
    browser kept of it (every string and key loses `<`, `>`, `"` and a backtick), and `xbets.js`
    cleans the X Bet Log by its own rules.
  - *Setting it up*: Firebase console → new project → Realtime Database → rules
    `{"rules":{"nflhub":{".read":true,".write":true},"xbets":{".read":true,".write":true}}}` (both
    paths: Firebase denies a path its rules do not name, so with `/nflhub` alone, as before the X
    Bet Log, nobody's X Bet Log can be read; open `xbets` before or with the deploy that carries it)
    → the database URL plus `/nflhub` into `nflbets/sync.json`. Open rules mean anyone with the
    address can read and change both documents; `docs/ARCHITECTURE.md` ("Opening the X Bet Log's
    path", "Locking the store to the owner") has the owner's steps, the locked rules and the curl
    probes that check them under both paths.
  - With the store blank or out of reach the page runs on the browser alone and says so ("Not
    synced"); a reader shows the copy of X's it last saw, marked.
  After any change to `sync.js` or `xbets.js`, also run `node nflbets/build/stress_sync.js [seed]`
  (three of X's devices and a visitor's, random moves, a store that answers late so writes race;
  it fails if a parlay is lost or comes back, or the visitor writes or sees anything but the store's).

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
- **`live_parlays_v1` is X Parlays' key; `my_parlays_v1` a visitor's own.** Each holds `lines`
  (a line corrected), `removed` (a file or betting-model parlay deleted) and `kept` (the builder
  as it stood when a leg's game kicked off: the builder drops a started leg, so the section keeps
  this copy, keyed by its legs, and watches it until it is deleted); X's also carries `bet`, X's
  betting slips by device. A saved parlay is in neither: deleting one in the section deletes it
  from the prop model's own saved list, which is the only copy. The section reads the whole
  object and writes it back whole, so a key anything else puts there is carried through. X's key
  is read and written through `LIVE_IO`, which is the sync layer: shared, and written only on the
  owner's devices (a reader's `LIVE_IO.set` refuses); `my_parlays_v1` stays in the browser.
- **Visitor data is the visitor's.** Picks, parlays, bankroll, bets and self-loaded odds are
  never written to the repo or the store. A visitor's own builder, parlays, picks, bankroll, bet
  log and odds live in their browser's local storage only; what the store holds is X's (X Parlays
  and the X Bet Log, written from the owner's devices), and a visitor's old copy of it is taken
  out of their own list, never pushed back. Anything held per-session and not meant to persist
  (for example the game pages' suggested parlays, cached in `GAME_TIER_CACHE` in `part3.js`) is kept outside the saved state object `S`, so
  it is never serialised.
- **No secrets in the repo.** `ODDS_API_KEY` is a repository secret and only the
  props workflow touches it.
