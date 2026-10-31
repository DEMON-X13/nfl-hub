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
- A PR the props gate covers (`.github/workflows/props-gate.yml`: anything the props job or the
  Bets and Stats page runs) is merged once its `props-gate` check is green: `gh pr checks <n>
  --watch`, then merge. A failure that is the PR's (it fails on the PR and passes on main) is fixed
  in the PR; one that fails on main too is said in the report and does not hold the merge. After
  merging the fix to a refused props run, dispatch it: `gh workflow run props.yml` (a dispatch reads
  nflverse and DraftKings' lines on ESPN afresh and publishes a few minutes later; since 20 October 2026
  no run buys a price, so nothing is held between runs and no credit can be spent; the old
  `-f no_odds=true` form still starts it and does nothing more).

## The sites and their parts

GitHub Pages serves the repo root, and the root is NFL Hub: its `index.html` is the page, built from
`nflbets/build/` by `nflbets/build/build.js` (the owner's call of 17 October 2026, "can you make
https://demon-x13.github.io/nfl-hub/nflbets/ be https://demon-x13.github.io/nfl-hub/ and get rid of that page": until
then the page was `nflbets/index.html` and the root a hand-written landing page linking it, Weekly Picks and the other
hubs, which went that day, its links with it). `nflbets/` is the page's source folder (`build/`), and its `index.html`
a hand-written redirect to the root for old bookmarks. The one other page is the standalone `picks/` (Weekly Picks),
whose NFL Hub link, `../`, now lands on the page; X NHL Bets and CFB Hub are in their own repos. `news/` is no
longer a page (the owner's call, 14 October 2026: the Season Tracker went into each game's Game snapshot, then opened
from the Matchups board, for a few hours of 22 October 2026 from a button on each game's page on the Props tab (app v128,
taken off again by app v129), and since from the matchup bubble alone): it holds the news job (`news.yml`), which writes the data the snapshot reads at runtime, and the
week's game notes, written by hand; `news/index.html` only sends a visitor to the root, `../`. `pickems/` and `live/` hold only
redirects for old bookmarks, to the root; `liveparlays/` holds a redirect (to the root's `#xparlays`, which since 20 October 2026
opens X Parlays on the site owner's devices alone and lands anyone else on the Props tab, written over as `#slate`; on the
Matchups board until it went on 22 October 2026) beside the X Parlays section's source and its
`parlays.json`. `props/`, `betting/` and `elo/` are models with no page of their own, each
with its own job (`props.yml`, `update.yml`, `elo.yml`); the page has no job: it is rebuilt
by hand when a source changes, and reads the models' data on every load, every file named from the root
(`props/data/payload.json`, never `../props/...`, which from the root would leave the site).

| Path | What | Source of truth |
|---|---|---|
| `props/` | Prop Model: no pages any more, only the parts, the build, the job and its data (`props/data/payload.json` is what the page reads, with the job's own read of DraftKings' lines on ESPN in it since 20 October 2026: no job buys a price) | `props/build/part1.html`, `part2.js`, `part3.js` |
| `betting/` | X NFL Betting Model: no pages any more, only the app source, the tools, the job and its data (`betting/state.json` is what the page reads); the app itself lives inside the page, the root's `index.html` | `betting/app/x_nfl_betting_model.html` (copied in from `nfl-model-lab`) |
| `news/` | The news job, no page of its own since 14 October 2026 (`index.html` sends a visitor to the root): the Deep Dive (`data/units2026.js` and its twin `units.json`), the stat bars (`data/stats2026.js` and `stats.json`, which since app v124 a game page's Team Stats window reads when it first opens, the Game snapshot's Stat breakdown having gone on 16 October 2026), the results and the week's reading pack, and each game's preview and news (`data/notes/<season>-w<N>.json`, written each Wednesday by Claude), which the Game snapshot fetches with `units.json` | `news/tools/` (the job); `news/data/notes/` (hand-written, `news/HANDOFF.md`); `news/data/teams.js` (hand-written, read by `picks/`) |
| `index.html` (the root), from `nflbets/` | NFL Hub (X NFL Bets and Stats until 16 October 2026; at `nflbets/` until 17 October 2026, whose `index.html` is now a redirect to the root), in the NBA Hub's and the NHL Hub's look (dark, with a light look a visitor can switch to at the header's top right): the two models on one page, built one tab at a time, with Suggested Parlays (one section since app v129, Night games, under one record: each Thursday, Sunday and Monday night game's own Safe, Medium, Aggressive and Extreme, shown one night at a time, then the Sunday slot's, one set across the week's Sunday games before 7 pm Eastern, a section with its own record from app v118 to v128; each set with its own four Elo picks, locked 2 hours before its kickoff, the slot's first, and graded by the props job's suggestions record, weeks 3 to 6 replayed as a backtest, and from week 7 on graded at the page's estimated prices on DraftKings' lines read from ESPN), the Parlay Builder (the builder first, which finishes a parlay as a downloadable card, saved nowhere, over the Top 50 lines (the Top 30 from app v116 to v140; Value picks first until app v138; since, Player lines then Game bets: **DraftKings' chance on every leg**; the player lines a mix of bet types since app v141: **The Top 50's player lines are a mix of bet types**), each bet once, on the bet types and games a visitor ticks), every price DraftKings' line read from ESPN (the props job's read, published with the payload, or a visitor's Refresh odds press), a player's at the page's estimate of DraftKings' price, X Parlays (X's placed parlays from `liveparlays/parlays.json`) and the X Bet Log (`liveparlays/xbets.json`) as tabs on the site owner's devices alone (the admin link, `#owner=<his Odds API key>`, the owner's call of 20 October 2026, "hide only": the files stay public by address), with Pull from DraftKings on the admin's parlay card, the Props tab first (the Matchups tab, the board in front of it, went on 22 October 2026, app v128: its row had been the Props list's since app v122), on each game's page there Matchup, Mismatches and Team Stats buttons, each opening that card alone in a little window (app v124), and the whole Game snapshot of a game (with the news job's preview and Deep Dive) opened by the matchup bubble on the name of every leg the Parlay Builder and Suggested Parlays draw (and for a few hours of 22 October 2026 by a fourth button on the game's page, app v128, which app v129 took off) | `nflbets/build/hub.html` (the page's glue: the season's read, the tabs as addresses, the framed tabs; `tab_pickems.html`, the Matchups tab, until 22 October 2026) + `snapshot.html` and `deepdive.js` + `liveparlays/build/page.html` + the props parts + the betting app + `nflbets/build/card.html`, `storage.js`, `xbets.js`, `glance.js`, `theme.css`, `theme.js` and `admin.js` |
| `picks/` | Weekly Picks: a visitor picks the winner of each game of the current week (`betting/state.json`'s schedule, the first week with a game still to play, the week the Matchups board opened on until it went on 22 October 2026) and saves them as a JSON file to send to X; picks are kept in that browser only, a game locks at kickoff, nothing is sent anywhere. The files friends send the owner go in `picks/friends.json`, which the Pick'em Record draws beside the models (below) | `picks/index.html` (hand-written, no build; team names and colours from `news/data/teams.js`); `picks/friends.json`, kept by Claude with `picks/tools/add.js` |
| `cfb/` | retired: CFB Hub (then X College Football Bets) moved whole to `DEMON-X13/cfb-hub` on 2026-10-14, with its history; `index.html` redirects there | `cfb-hub` |
| `nhl/` | retired: X NHL Bets moved whole to `DEMON-X13/nhl-hub` on 2026-10-13; `index.html` redirects there | `nhl-hub` |
| `liveparlays/` | retired as a page: `index.html` redirects to the root's `#xparlays` (X Parlays on the site owner's devices, the Props tab on anyone else's, the Matchups board until 22 October 2026); `parlays.json` is X's placed parlays and `xbets.json` the X Bet Log, the two files Claude edits from what the owner sends, shown on the admin's devices alone since 20 October 2026 and public by address all the same, and `build/page.html` is the X Parlays section's source | `liveparlays/build/page.html`, `liveparlays/parlays.json`, `liveparlays/xbets.json` |
| `elo/` | Player Elo: every player rated by position since 2012, the roster model built on those ratings and the matchup formula; `elo/data/*.json` is what the Player Elo tab reads | `elo/build.py` (the formula is its docstring); `nflbets/build/tab_elo.html` is the tab |

## Source vs generated -- never edit a generated file

These are rebuilt from source on every scheduled run, so an edit to one is lost
at the next refresh:

- `props/app/prop_model_2026.html` (gitignored: the audit's subject, never published)
- `betting/state.json`
- `index.html` at the root, the page (by `nflbets/build/build.js`; until 17 October 2026 it wrote `nflbets/index.html`, which is now a hand-written redirect to the root, source like the other redirects)
- `props/data/payload.json` (its `espn`, the props job's read of DraftKings' lines on ESPN, and the schedule's game lines
  marked `lsr` 'espn' are worked out again on every run by `weekly.py`'s `apply_espn` from this run's read and the
  published payload's, never carried by `payload.py`), `props/data/priced_at.json` (by `oddsfetch.py`, which no job runs
  since 20 October 2026: a pull by hand)
- `props/raw/espn/` (gitignored, never committed: `props/build/espn_read.js`'s `read.json` and every ESPN answer it
  recorded, which `weekly.py --offline` and the props gate's base run replay; the read itself is in the payload)
- `props/data/suggest_ledger.json` (by `props/build/suggest_ledger.js` in the props job: each prime-time
  game's Suggested Parlays set, shown on the tab or not, locked 2 hours before its kickoff and graded after, beside the retired all-games
  panel's entries, frozen at each wave's kickoff, so a hand edit there rewrites the record and the script's
  guard refuses it; since app v118 each set's Elo picks too, and the Sunday slot's sets in its `slot` map)
- `props/data/suggest_backtest.json` (by `props/build/suggest_backtest.js`, run by hand, never by a job: the record's
  weeks before it took them, rebuilt from git at each lock and graded; the file only grows, and `--check` and the
  record's test refuse it moved)
- `props/data/espn_lines_<season>.json` (by `props/build/espn_archive.py`, step 5b of `weekly.py` in the props job, and
  its `--backfill` by hand: DraftKings' player lines on ESPN game by game, open and close, each played game read once
  more and frozen, never written again, so a hand edit there rewrites the record; research data nothing on the site
  reads: under "Props: the loop", **The archive of DraftKings' lines**)
- `news/data/results.js`, `news/data/stats2026.js` and its twin `news/data/stats.json`, `news/data/units2026.js` and its twin `news/data/units.json`, `news/tools/out/week*-pack.md`, `news/tools/out/week*-lineups.json` and `week*-lineups-grade.md` (`news/tools/.cache/` is gitignored; the game notes, `news/data/notes/`, are source, written by hand)
- `props/research/totals/shadow/ledger.json` (by `shadow.py` in the betting job: the game-totals shadow's calls, frozen at kickoff, and its pre-registered bar, so a hand edit there rewrites the record and `shadow_check.py` fails it)
- `props/research/propmodel/shadow/td_ledger.json` (by `props/research/propmodel/td_shadow.py` in the props job, after
  its publish: the touchdown shadow's calls, frozen at kickoff and graded after, under a bar `td_shadow.py init`
  registered in the ledger before the first call, so a hand edit there rewrites the record: the next run and
  `td_shadow_check.py` refuse one that is not canonical, and the props gate's `ledger_hold` fails any pull request that
  changes or removes the ledger (a pull request may only add it, as `init` writes it; the check alone cannot refuse a
  canonical edit once merged, since it holds a run's ledger to the last commit's); research data nothing on the site
  reads: under "Props: the loop", **The touchdown shadow**)
- `elo/data/players.json`, `elo/data/model.json`, `elo/data/matchups.json`, `elo/data/calls.json` (by `elo/build.py`; `calls.json` is the ledger of calls frozen at kickoff, carried from run to run, so a hand edit there rewrites the record; `elo/cache/` is gitignored; `elo/history/` is source)

`betting/app/x_nfl_betting_model.html` is the exception: it is the betting app's
source, shipped in from `nfl-model-lab`, not generated here.

## News: the job and the weekly game notes

```
cd news && npm ci
node tools/run-auto.js           # the job: the schedule's current week -> pull-week.js (results, stats and stats.json, pack) -> context.js
node tools/context.js            # the Deep Dive alone, units2026.js and units.json (nflverse only; no ESPN list)
node tools/notes.js --strict     # the week's game notes against their rules, as the Wednesday routine runs it before it commits
node tools/smoke.js              # must end "all checks passed" (runs tools/cases.js too); WARN lines above it publish
```

The Season Tracker's page and its tab on X NFL Bets and Stats are gone (the owner's call, 14 October 2026): what
it said of each game is in that game's Game snapshot (under "Bets and Stats: the loop"), and `news/` is the job
that feeds it. `news/index.html` only sends a visitor, and every old bookmark, to `../`, NFL Hub at the site's root (`../nflbets/`
until 17 October 2026), which opens on the Props tab (the Matchups board until it went on 22 October 2026; `location.replace`, so Back does not loop, on the web and from disk alike, with a link for a browser without
scripts; never a meta refresh). The tracker's page, its week files, the team matchup, positives, negatives and keys
paragraphs, the rank chip and the player positions are in git history before that day. The job writes
`data/results.js`, `data/stats2026.js` and its twin `data/stats.json` (`pull-week.js`), `data/units2026.js` and its
twin `data/units.json` (`context.js`), and the reading pack and the lineups as kickoff found them in `tools/out/`;
it drafts no week file any more. Each twin is exactly its `.js` file's consts (`writeTwin` in `tools/lib.js`),
written with it and whenever it is missing or differs; `units.json` is what the snapshot fetches, and `stats.json`,
read by no page from the day the snapshot's Stat breakdown went (the owner's call, 16 October 2026) and still written
and held by the smoke, is read again since app v124 (the owner's call, 20 October 2026) by the Team Stats window of a
game's page on the Props tab, the same bars side by side, once a page load and only when that window first opens
(under "Bets and Stats: the loop", **A game's page: Matchup, Mismatches and Team Stats**).

The game notes are the hand-written half (`news/HANDOFF.md` first, always): each Wednesday a Claude routine, and Claude
whenever the owner asks, writes `news/data/notes/<season>-w<N>.json` from the week's pack and the panel in
`tools/sources.md`: for each game a one-sentence `preview`, a short `news` note (the one or two things a fan should
know this week, or `""`) and its `sources` (the snapshot shows the preview alone since the owner's call of 14 October
2026; the news and sources stay in the file, unshown), every player named in bold (`**Bo Nix**`), keyed by the nflverse game id
as `betting/state.json`'s schedule writes it (LA for the Rams; `tools/week-request.md` is the format); then
`node tools/notes.js --strict` and the smoke, and
the branch, commit, PR and merge. The job never writes a note, and a game left out shows an automatic line in the
snapshot until it is written. `tools/notes.js` holds a file to its rules: the shape and the game ids are failures;
the wording is a warning: a preview of one sentence, 40 to 200 characters, with no record or score typed (the
records are shown beside it, and a typed one goes stale), news of at most 300 characters, and in either no betting
words at all (no spread, favourite, moneyline, odds, total, line, cover or book: the snapshot shows the market
apart), none of the site's own ranks (`siteRankQuote` in `tools/lib.js`), no em dash, plain text but for every
player named in bold, `**Pat Surtain II**` (the owner's call, 14 October 2026: players only, never a coach, an
owner or a team; the lengths and every other rule read the text without the markers, as `unmark` does). A name the
site's files know as a player (`players()`: `elo/data/players.json`'s players and each group's sidelined, and
`units.json`'s lineups, read whole, case-sensitive and longest first) left plain or only partly bold (but not a plain
name straight after a role word, `ROLE`: owner, coach, coordinator, GM, general manager, president, executive,
chairman, assistant, team doctor, as in "Bengals owner Mike Brown"; the warning says only that the site knows the
name as a player's), an unpaired `**` or a stray `*`, a pair over 60 characters or with a space just inside it, other
markup, a coach or other non-player in bold (a head coach on the schedule, or a pair straight after a role word), a
team in bold (a city, nickname or code) and bold in the sources each warn. `--strict` refuses both, so the routine commits no note that breaks a rule; the smoke reports every note
problem, its shape too, as a warning, so a note never holds back the week's results, stats and Deep Dive.

The season is `SEASON` in `news/tools/lib.js`, nowhere else; after week 18 the job stays on week 18 and says the
regular season is complete (it does not cover the playoffs; the stat tables are then asked for as of the
day after week 18). The Deep Dive's lineups follow the nflverse injury report and ESPN's list
(`context.js` says the rule; a team has filed only when its game statuses are on the report, never
on a practice report), and every nflverse file but the snap counts is required: one that does not
download fails the run before the commit, so the last good files stay live (before the season's
first game a 404 on a current-season file is "no games yet").

The Deep Dive is drawn by `nflbets/build/deepdive.js`, one module the page inlines (`window.gsDeepDive`) and the
news job requires (its smoke and cases), from `units.json`, inside the snapshot's Offense vs defense card. Each side
with the ball has its overall line, the team's Overall Offense against the opponent's Overall Defense as the ELO
Ratings tab shows them (`units` in `elo/data/model.json`, which the card reads itself; `context.js` carries each
club's pair too, read only when it is of the season, LA as LAR, with the build it came from in
`UNITS26_META.overall`, and the rows publish without it), wearing the headline tag at the end of its title line,
the gap read as points beside it ("−0.9 pts"; `headTag`: 11.9126 a raw unit, Favorable from 0.9645, Easy from
2.8935): from week 2 on it predicted an offense's points better than the rows on 2018-2025 (9.44 against 9.60;
`elo/tools/deepdive_vs_units.py` prints it and every tag constant, and says whether
`context.js` carries them: run it again after a refit of the units). Under it are the four position matchups
(`possession`: the quarterback against the pass defense, the line against the pass rush, the run game against the
run defense, the receivers against the coverage, the pass rush and the coverage drawn as the defense's side of the
line's and the receivers' rows), each tagged on its edge weighted by what that matchup alone has predicted
(2012-2017: quarterback 1, receivers and coverage 0.8925, line and pass rush 0.5956, run game 0.3792) at 0.5 and
1.5; the rows overlap and are never added up. Each row is compact and centred, its unit, the two sides' clubs and
Elo ("SEA 1532 · DEN 1488", the offense's then the defense's; the owner's call of 16 October 2026, "please add in
Offense vs defense their ELOs instead of the rankings": the quarterback's own season Elo, the Starters card's QB in
`matchups.json`'s lineup for that game, against the Overall Defense (`units.def`, the same day's "QB needs to be vs
team defense overall"), Pass Protection against Pass Rush, Run Offense against Run Defense, Pass Offense against Pass
Defense, from `elo/data/model.json`'s units and players.json as the page's one read has them, `eloSides`; the higher
marked `gs-better`, each side titled with what it is, its Elo, rank and tier, each Elo wearing its tier's shield just
before it, the ELO Ratings tab's and the Starters card's own `pkTierBadge` handed to `eloSides` as its `badge` (the
same day's "elo in offense vs defense pls add elo icon"); a side with no Elo, a model.json without the position
tables or a quarterback unranked or with no lineup for the game, its rank from `units.json` as before, with no shield,
the quarterback row's defense side the rank of `units.json`'s own Overall Defense, `overall.def`), the defense's
position it faces (Overall defense, Pass rush, Run defense, Coverage: the owner's call of 16 October 2026, "for offense
vs defense section, please put opposing positions for the defense") and its tag, those two together at the row's end,
the tag's title giving the edge; the tag stays the Deep Dive's own, never worked from the Elo (the two can point
opposite ways), the quarterback's still his passing rating against the pass defense, as the rule was fitted, which
the tag's title and the basis say; no names, no one out, no quarterback next and no other numbers (the owner's call,
14 October 2026: limited, like the head; who plays is the Starters card's; `units.json` still carries them, and the
lineup checks still hold them). The tag is a chip on every step: Even, the neutral one, a slate a step off the card
with a light ring drawn inside it (an inset shadow, so its shape is the others'), its edge at 3:1 or more on the
card, since its old grey was the card's own and read as plain text (the owner's call, 16 October 2026, "make 'even'
tags more distinguishable"). They are drawn only for
the units' own week (`applies`); another week's game says why.
The constants are in `UNITS26_META.tags` (`units.json`'s `meta`), which `deepdive.js` reads and the smoke holds
to `tools/deepdive-checks.js`'s own copy.

There is no page to render: the smoke loads the files directly and holds them to their sources and to what the
snapshot draws from them. Blocking: the twins exactly their `.js` consts; each team's stat line against its own
game count in `results.js`; the tag constants their values and every club's Overall pair `elo/data/model.json`'s
(`checkOverall`: exact on the same build, the board's order a run behind); every game of the units' week (from the
schedule the lineups were checked on, else `betting/state.json`'s) drawn both ways by `possession()`, four rows in
order with every tag the weighted edge worked out on its own, each row's two sides the offense's then the
defense's, each headed by its own club, each figure the Elo the Elo files have for it (`eloWant`, the checks' own
reading: the quarterback's against the Overall Defense; the higher marked; each Elo wearing exactly the shield the
caller handed `eloSides`, a stand-in here, and a rank none) and the rank only where there is none, and the edges the file's (`checkPossession`; the
smoke prints how often the higher Elo and the tag point opposite ways, never a check), what the rows rest on
(`basis()`, the snapshot's "Position matchups" label's title) giving each side its own count of this season's
games, and each overall line's tag, `headTag()` on model.json's units, the rule's (`checkHead`); the
lineups for the schedule's week (and, in the job, checked on that run's own download); `news/index.html`, run in
`vm`, sending a visitor to `../`, the site's root, and naming `nflbets/` nowhere outside a comment; and the fixed cases in `tools/cases.js` (each with the broken version a
review caught, which the checks must fail; the Deep Dive's run on `deepdive.js` itself). On a checkout whose
`units2026.js` is older than the report it fails until `node tools/context.js` runs. A change to a rule comes
with a case there. Each drawn row is its unit, the two clubs and figures, the defense's position and its tag and nothing else
(`checkPossession`: no name, no one out, no other number; blocking, a code property). The lineup rules (all but the week
they are for), a quarterback in doubt with the next one named in the file, nobody both listed and out, and every
problem in a notes file are warnings (`warn` in `smoke.js`): who the Deep Dive lists and what a note says, never the scores, records, stat
bars, ranks or tags. They print WARN and never fail the smoke, so a lineup case no rule has seen publishes the
week's results and stats, and the job goes red on them after its commit (`SMOKE_WARNINGS_FILE`); every other
check, the fixed cases among them, holds the run's files back. The real news files are this smoke's alone: the
nflbets smoke tests the snapshot on stand-ins of its own, since the elo job runs it every morning and a news
publish must never turn it red. `.github/workflows/news.yml` runs about nineteen times a week, timed to the
injury report and set early because GitHub starts this repo's scheduled runs 2.3 to 9.4 hours late, and on a
push to the tools, the notes (so a note a rule refuses shows on its own push), `news/index.html` or
`nflbets/build/deepdive.js`; it commits `results.js`, `stats2026.js`, `stats.json`, `units2026.js`,
`units.json` and `tools/out`, and a run that finds nothing new commits nothing beyond the day's "as of" dates.

## Props: the loop

Edit the parts, then from `props/build/`:

```
python3 assemble.py        # part1 + part2 + part3 -> ../app/prop_model_2026.html (gitignored; payload.json is fetched at boot, only checked here)
node audit.js              # the gate: its summary line must say "0 failures" and "0 runtime errors"; warnings publish
node ../../nflbets/build/build.js   # the parts are the Bets and Stats page's source: rebuild it, the root's index.html (see below)
```

`node_modules` for the audit lives in `props/build/` (`npm ci`).

The audit is a real gate: `weekly.py` refuses to commit when it is not clean, so
a broken audit means the site stops updating and the run is marked
failed. "Clean" is read from the audit's summary line as numbers (`audit_verdict`: 0
failures and 0 runtime errors over at least one check; no summary line is not clean), never
as the text "0 failures", which "10 failures" contains. The line also counts warnings
("28944 checks, 0 failures, 2 warnings, 0 runtime errors"), which never make it unclean: a
warning is a check `audit.js` names as presentation only (`W.<kind>`, each kind with its reason in
`WARN` there: who is shown starting or listed, an ordering, which correctly priced parlay a
suggestion level or game hand picks, a note's wording in the panel, a rule the week's data left
untested, the credit panel), and a run with only warnings publishes and goes red after its commit
with them listed in `props-build-problems.txt` (`audit_warnings`; the entry never starts BLOCKED or
AUDIT, which read as a refusal). Everything else is blocking, and a new check is blocking unless it
is argued presentation-only there: a price, line or leg on the wrong player or game, a chance, fair
chance, price or payout that is not the builder's own sums, a leg under the book, far off it or
kicked off, settlement and grading, the payload against its sources, a runtime error, and a chance or
payout floor a card states (a level "least costly · 25%+", at DraftKings' fair chance since app v138, "lands 25%+ by
the model" until then, a game hand's 40% legs, its -250 and its
High, Medium and Low floors, held on the hands' engine, which no card draws since app v124) against its own numbers.
V6 blocks a suggested leg or candidate on anyone this week's report has Out, Doubtful or Questionable, or the
roster has off its active list, released, inactive this week or on no roster, or the inactive rule holds out, each worked out by the audit from
the sources (`NOPLAY`, from V1 and V5) and never from the page's reading of them, whatever the page lists.
A check run only on made-up data stays blocking (only a code change can fail it). `python3
test_audit_gate.py` holds the verdict to its cases, warnings among them, and runs `audit_step` and
`finish` on a planted warning and a planted failure through props.yml's last step. Write audit checks against the app's invariants, never against whatever
the week's data happens to offer -- a lean week must not fail the build, nor the hour it runs (the
rules each check keeps are in audit.js's BLOCKING AND WARNINGS note: the page's clock, a row or player
the check can stand on, planted data on its own fixture, the page's fallbacks, the off-season).
`PROPS_AUDIT_NOW=<ISO time>` runs the audit as if it were then (Node's clock and the page's moved
together, `clock_now.js`), and `python3 test_audit_phases.py` (about nine minutes, four at a time;
`--quick` three cases) replays it on past payloads at their own moment, each beside its own commit's
`props/data` (a Saturday before the pull, a Sunday priced, mid-slate, 3pm and night, a Monday before
and during its game, a Monday night on a payload baked during the game (`mon_baked`, built from the 25 October
payload by `apply_espn`: its bake hours after the page's clock once the audit sets it back, which refused every such
run until the review of 25 October 2026, M8 dating the bake an hour before the clock while it runs), a week with no
player prices, paid ids to come, the season played out with and without late lines), and the page smoke on four with `SMOKE_NOW` (two Monday nights under way among them,
when the smoke sets the page's clock back, one on a payload baked that Monday, its DraftKings lines then
newer than a press there): a change to the audit, the smoke or
the props parts comes with a run of it. **The props gate** (`.github/workflows/props-gate.yml`, its
logic in `.github/scripts/props_gate.py`) runs both on every PR, on a push to main that touches what it
covers, and by dispatch, and spends nothing (since 20 October 2026 `weekly.py` buys no prices at all; it is
still passed `--no-odds`, which a base from before needs and this one ignores; no secret is mapped, and
nothing is committed). Its first job sorts the changed paths into AUDIT (what the props job runs: `props/build/`,
`espn_read.js` among it, the `props/data` scripts and model files but not the job's outputs, the research files `weekly.py`
runs, `lib/`, `props.yml`, the gate, and since 31 October 2026 the touchdown shadow's code and test and every file
PREREGISTRATION.md section 3 registers, `TD_SHADOW` in `props_gate.py`, but never its ledger, which the props job alone
writes: a pull request that changes or removes it fails this first job outright, `ledger_hold`, and one may only add it
as `td_shadow.py init` writes the bar's registration, `td_shadow_check.py --registration`) and PAGE (`nflbets/`, the page itself at the root, `index.html`, and the old addresses' redirects to it,
`pickems/`, `live/`, `liveparlays/` and `news/index.html`, since 17 October 2026, the betting app, `betting/neutral_sites.json`
and `betting/tools`' build parts, the props parts, `liveparlays/build/`), a renamed file by its old path
too; with neither it passes at once, and a push or a dispatch runs everything. Job A runs `weekly.py
--no-odds` on the PR's code, today's nflverse files and today's read of DraftKings' lines on ESPN (which
`espn_read.js` records in `props/raw/espn/`), then the page smoke and `elo/check_tab.js` (the ELO tab and the Elo
picks, which the Elo job runs every morning and which blocks its publish) on the payload it baked (the
published one when weekly.py refused), within 40 minutes; job B runs each case of `test_audit_phases.py` on a runner of its
own (the smoke cases alone when only PAGE changed); job C (since 20 October 2026) runs the unit tests, `UNITS` in
`props_gate.py`, on fixtures of their own, seconds each but for the page's two smokes: `test_apply_espn.py`,
`test_espn_read.js`, `test_lock_runs.py`, `test_espn_ids.py`, `test_dk_links.py`, `test_unmatched.py`, `test_who_played.py`,
`test_fetch.py`, `test_audit_gate.py`, `lib/test_netfetch.py` and `.js`, `test_espn_archive.py` (since 27 October 2026,
**The archive of DraftKings' lines**), `props/research/propmodel/test_td_shadow.py` (since 31 October 2026, **The
touchdown shadow**: about 45 seconds, stopping itself at 3 minutes), `nflbets/build/test_dkname.js`,
`nflbets/build/smoke_admin.js` and, since the review of 21 October 2026, `nflbets/build/smoke_live.js` (about four minutes,
the one place the parlay card's Pull from DraftKings and its money rules are held; job C's `timeout-minutes` went from 20 to
45 with it, room for both page smokes running to their own caps here and again on the base, which `test_props_gate.py`
holds, and to 50 on 31 October 2026, the touchdown shadow's test's 3 minutes added to that sum; and its unit-test step's env sets `NODE_OPTIONS: "--max-old-space-size=6144"`, since smoke_live.js, which boots
the whole page more than sixty times and closes few of them, holds a live heap of about 3.25 GB at its peak (measured after forced collections), over Node's default old space
on a runner under about 16 GiB of memory (about 2.2 GB): there it and the base's run both died of out-of-memory, verdict()
read a failure on both sides as a warning, and job C went green with Pull from DraftKings never held (the second review of
21 October 2026); `clean_env` hands it to every unit, here and on the base, and `test_props_gate.py` fails a
`props-gate.yml` without it) (one missing from the tree fails it, but for those in `UNITS_OPTIONAL`). Each is differential: a failure is run again on
the base's code in a second checkout (`weekly.py --offline` over the same downloads and the same ESPN answers, copied
with them since `props/raw/espn/` is ignored, unless this run refused at a download or read a file as not posted yet,
when the base downloads its own and is handed this run's ESPN answers, `PROPS_ESPN_REPLAY`, so a line DraftKings moved
between the two runs never reads as the change's), and fails the
gate when the base passes or has nothing to compare with (no such case or test, or a base refused at a download
where the change was not); a failure on both is a warning, a download refusal named as infrastructure, to
re-run. The verdict, `props-gate`, waits on all three. `python3 .github/scripts/test_props_gate.py` holds that judgement,
the path sorting, the units list and that `props.yml` maps no secret to their cases, in the gate's first job. `python3
.github/scripts/props_gate.py dry-run 30` shows which of the last 30 PRs would have run which job, `files <paths>` how
paths are sorted, and `units --base <sha>` runs job C here. The audit's section V
checks the page a browser builds against the raw nflverse files (roster status, the
injury report, the stats, the schedule) when `PROPS_AUDIT_RAW=1`, which `weekly.py` sets;
by hand those comparisons are skipped and the rest run. Run by hand against a payload
baked before 9 October 2026 it fails V2 (lines on the wrong player) until the job rebakes it.

`weekly.py` also refuses (exits 1 before the workflow's commit step, so the last good data
stays live) when a required nflverse download fails (after `lib/netfetch.py`'s tries; `python3
test_fetch.py` holds weekly.py's downloads to them) or comes back wrong -- the schedule,
the player stats, the roster or the injury report -- or when the stats would cover fewer
games than the published payload, or the ESPN read cannot be applied to the payload (`apply_espn` raised: the last
good payload stays live, its read with it). Until 20 October 2026 those were checked before any credit was spent, and a
run refused after a pull had its prices kept (unpublished) by the workflow; since, no run buys a price, so nothing is
held between runs and the next run publishes from scratch. The depth
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

A price row turns a published run red only for a book name that could be two players (two in
the game's first matching tier, printed name, then legal first name, then short, nickname or swapped,
and not settled by only one of them playing a position the book prices), two
names placed on one player's same price, or misses too many to be a roster a day behind (on the
games still to come, more than 10% of one game's player price rows or more than four names); a
few rows for players the roster has no row for yet are logged and kept in the payload's
`unmatched` (`price_problems` in `weekly.py`; `python3 test_unmatched.py` holds it and the name
rule, `names.py` with `nicknames.json`, which the audit's `nameRule` reads too, to their cases).
A main line on no player in a game to come is still reported, as before. Only a printed name may
land on a player at a position the book never prices: the looser tiers look only at those it does,
so a signing missing from the roster file never lends his prices and lines to a defensive back of
the same surname.

**DraftKings' chance on every leg** (app v138, `patch_market_chance.py`, whose docstring is the design, the owner's call
of 27 October 2026, after the diagnosis of weeks 1 to 7: "Every player leg uses DraftKings' fair chance, as game totals
already do; the model's projection stays on screen as information. Value marks disappear until a model earns them.
Suggested Parlays still build, but pick the least costly parlays and show their honest (negative) expected return. I'd
also remove market + form, which was fitted on this season's games and shows no signal."). The evidence: on 2,507
two-sided DraftKings main lines of weeks 1 to 6 the model's chance scored a log loss of 0.7319 where DraftKings' own
no-vig chance scored 0.6905 and a coin 0.6931 (Brier 0.2654 against 0.2487), and with the market's log-odds held fixed
the weight on the model's difference from it was 0.007 ± 0.068, while it sat about four times further from 50% than the
market; so the edges the page showed were the model's errors, the Value rule chose them (its 1,642 legs hit 50.2%, -4.4%
± 2.9 flat), the floors "lands 25%+ by the model" chose them again, and parlays multiplied them (the model levels of
weeks 3 to 7 won 10 of 76, against 9.5 expected at the fair chance and 16.5 at the model's). Team legs go to the fair
chance too, a step past the owner's "every player leg", said to him: the halfway-pulled chance (`gameMu`) trails the
closing market over 2021-2025 by +0.0100 log loss [+0.0047, +0.0151] on 1,355 games, and its cover chance is worse than
a flat 50%. Market + form was fitted on 2026 weeks 1 and 2 on ratings that had already seen those games, against the
rule that nothing is fitted on the season in play; out of sample its rating term is -0.04 ± 0.06 against the 0.30 it
used.

What changed. `legChance(l)` (`part3.js`, beside `legFair`) is the chance every leg is stated and chosen at: a hook's
where one is set (none is), else `legFair` (DraftKings' prices with the margin out; a `dkline` leg's the formula's own,
est.; a locked leg's `kept`), and for a game total whose two prices are not both on file its own 50%, est. (app v88).
`l.p` keeps meaning the model's chance on every leg `pricedLegs`, `toggleLeg` and `totalLeg` make, so the hands' engine
(`gameTiers`, drawn nowhere), NOPLAY and V6 and the record's fields keep their meaning; only a pool copy (`pbLegs`)
carries `p`, the chance, and `pm`, the model's, so the search core runs unchanged on the chance. A leg qualifies with a
real price or DraftKings' line read on ESPN on a tested kind (an anytime touchdown read there not one the estimate prices
on the model alone: **A touchdown on the model alone is no tested kind**, below), its chance 45-97%, DraftKings' id at its
line where the payload carries ids (dormant) and V6: no edge test (`formAgrees` and `formSig` are gone) and no far-off guard. One side a line, the higher
fair chance (`pbSideBetter`, level to 1e-9 by `pbEvKey`); where they tie (the estimate prices most yards lines 50/50 at
one price) the side the model's projection favours, the higher `pm`, and only with no model chance the over or the home
side. Across parlays of one expected return the search's comparators (`pbBeam` and `pbBestReturn`'s finalists by
`pbRank`, `pbLikeliest`'s pick, `pbCap`) take the score rounded by `pbEvKey`, then the lean summed over the legs (`pbLean`,
`pm` less `p` on the leg's own side; `pbEval`'s `ln`), then the id as before: no number moves, and nothing on the page claims
anything for the lean, a tie-break alone (the model's measured lean toward unders can show in which of the tied legs a
set holds, never in a number it states). The levels keep the search on the chance: Safe the likeliest pair; Medium,
Aggressive and Extreme the least costly parlay, the best expected return, that lands 25%, 12% or 5% at the fair chance,
else the likeliest of their size. Each card states the fair chance and `expected −22%` (`small.pb-ev[data-pb-ev]`, fair
× price − 1, titled "At DraftKings’ fair chance: $1 returns $0.78 on average"), its rule `least costly · 25%+` (titled
"Smallest expected loss of the 3-leg parlays landing 25%+ by DraftKings’ fair chance"), each leg at its chance, and no
model percentage. `pbIsValue` needs `l.hook`, so no Value mark is drawn, and the far-off flags left every drawn surface
(`legFarOff`, `FAR_OFF` and `farText` stay for `gameLegPool` alone). The Top 30 lines are Player lines, up to 20
(`PB_TOP_PL`), then Game bets filling to 30, moneylines and spreads and then totals (`getPbTop().parts`), each part
ranked by expected return at the chance, then the chance, the lean and `pbOrd`: ranked as one list about 28 team legs
filled it, their real prices beating the estimate's assumed 5.66% player margin, an artefact of the estimate (since app
v141 the Top 50, up to 40 player lines, and those a mix of bet types, each type's likeliest first, since ranked by
expected return the same artefact put every qualifying anytime touchdown first: **The Top 50's player lines are a mix
of bet types**, under "Bets and Stats: the loop"). A Value
part is drawn only from a hook's rows, a row's model column is "projected" (a player's mean), and "Other lines", the
no-Value line, the far-off note and "Loading Elo ratings…" are gone. The builder's Chance column is Fair
(`data-legchance`), its hero "expected −$4.70 on $20 (−23.5%)" on the price it pays, its second box "fair price", and
the confidence tile went; the parlay card's lines read "Fair chance all 3 land 12.4% (est.) · expected −23% · the price
says 10.5%"; a game's page states each line's fair chance (a dash where DraftKings lists no price) and the touchdown's
projection in its heading ("projected 18%"), with no "book N%", arrow or far-off flag; the bubble's team and game legs
show Price · Fair · Expected; the sub-heading "Model parlays" is "Parlays", the record pills' titles say "at the model’s
chance" where they said "by the model", and the Props tab's pills are titled "The model’s side of every DraftKings main
line, graded on lines frozen before kickoff · at −112 it needs 52.8% to break even". In `tab_elo.html` market + form is
gone whole (`altP`, `eloAltP`, `eloAltZ`, `trackAlt` and the hidden Prop Record's card), and the builder's rows carry
only the Elo nudge, "Elo +2.1" (`eloLeanNote`; since 29 October 2026 the Elo part of the Elo-adjusted average, "Elo +0.5 ·
vs CAR Pass D #23": **Elo-adjusted averages**, under Player Elo). The Elo picks are the strongest Elo leans: a candidate is
a trusted leg priced -200 to +300 whose fair chance is 30% or more and whose Elo chance (`muP(l, fair)`,
`window.eloMatchupP`: the fair chance moved by the matchup's nudge, since 29 October 2026 the Elo-adjusted average's Elo
part in its spread, `z`; `EP.vig` gone) is above it by more than 1e-6 (the normal curves' own rounding
misses a fair chance by up to 2e-7, so a stat whose nudge is 0 leans nowhere), each player's largest lean, ranked by lean;
a level is the first n of them that go together on one DraftKings slip (`epTake`, a greedy prefix passing over a pair
`dkClash` refuses and, since the review of 27 October 2026, a leg that moves against one already taken by more than
-0.05: **The Elo picks pass over legs that move against each other**, below; `floor:0`, never the likeliest, the rule "strongest Elo leans"),
stated at its fair chance (`parlayFair`) and its expected return; a level the walk leaves short though as many players
qualify says what the walk found, "Strongest first, only 3 leans in this game go together on one DraftKings slip: this
level takes 4." (`epFitWhy`; the slot's the most of any one game's), never that no four players go together, which a
walk passing over a receiver beside his quarterback's passing TDs, or his yards over beside the quarterback's passing
yards under, cannot know; the slot takes each level from the game whose level has the larger summed lean (`epSlotBetter`);
the branch and bound, its fast sums (`eloSums`), `EP.safe` and the floors are gone. The record (R1) keeps its shape and
meanings: a level's `p` the model's chance all its legs land (on `pm`; an Elo pick's on `pe`), a leg's `p` its model
chance, `fair` DraftKings'; every level taken on the new rule carries `chance:'fair'` (`spTierOut`, a level `spRebuild`
builds inside an older entry too); the guard and the summaries are unchanged, and the first run on app v138 rewrites
week 8's entries not yet locked (week 7 and before stand as graded). A model may take the chance back only after a
validation of its own, as app v88 says of the totals: `window.setChanceHook(fn)` exists and stays null, `build.js`
refuses a page that calls it, and such a model needs its own field on a leg and on a level of the record.

What it did, on the payload of 27 October 2026 (a one-shot comparison of main's page and the branch's in jsdom on the
same files, at Tuesday 18:00 UTC, Thursday 12:00 UTC and Sunday 1 November 14:00 UTC): every level's expected return at
the fair chance from -18.0% to -28.1% (Thursday night's CAR at GB -18.9%, -21.7%, -26.2% and -24.0% where app v137's
were -20.2%, -22.3%, -30.6% and -31.4%; the Sunday slot's -18.6%, -23.0%, -27.1% and -28.1%), the Elo picks empty on
both, the matchups file being week 7's; no Value mark where app v137 drew 14 on the levels' legs and 7 on the Top 30;
the Top 30 lines 20 player lines and 10 game bets, none of app v137's 30 rows among them; every level's chance its fair
chance (`t.corr === t.fair.p`). On week 7's files at its Sunday morning the model levels ran -18.8% to -26.0% (app
v137's -18.7% to -34.2%) and the Elo picks -19.3% to -44.8% (app v137's -18.0% to -39.6%), DAL at PHI's Extreme the one
past -35%: its greedy prefix took a quarterback's passing yards under with his receiver's yards over, which move against
each other, and `parlayDec` gives the price no credit for it (the walk has passed such a leg over since the review of 27
October 2026: **The Elo picks pass over legs that move against each other**, below). Those figures are from before the
review's last two rules (**A touchdown on the model alone is no tested kind** and the Elo picks' bar of -0.05, below),
which empty the Sunday slot's and CHI at SEA's Medium to Extreme on Tuesday's read and move four Elo picks of week 7.
A set now builds in about 0.5 to 1.2 s a game in jsdom
where app v137 took 0.03 to 0.36 s (every leg is a thin one, so the beams run over the whole pool), and the Elo picks in
about 20 ms.

Held, blocking: `build.js` refuses (outside comments, in the parts, the Player Elo tab, the parlay card and the bubble)
`formAgrees`, `eloAltP`, `altP(`, `trackAlt`, `EP.vig`, `epScan` and the words "market + form", "model says", "by the
model", "Elo says", "far off the market", "fair price for the model" and "confidence all" (`farText`'s own definition
excepted), any call of `setChanceHook` in the built page, and a `pbLegs` not at `legChance`. The audit's own reading of
the chance (`chanceAud`: the rule `legFair` follows and the total's fallback) holds the pool (`qualAud`, one side a line
by its own side rule), every level and its expected-return line, the Top 30 lines' parts and the game page, and its
section MC: on the week as it stands each level's expected return its own fair × price − 1, every live level taken
`chance:'fair'` with its `p` the model's, and no model chance, Value mark or far-off flag drawn on Suggested Parlays,
the Top 30 lines or the builder; on made-up games a hook planted (and taken away in `finally`) turning legs 3 points
over their price's implied chance into Value picks, marked on the cards and in a Value part of the Top 30, the record's
`p` still the model's, and none once it is taken away; the ties going to the side the model favours (the home side with
no model chance); and six lines at one chance making each level the ones the model leans to most. Two older checks read
the new rule since: a card's stated floor ("least costly · 25%+") is held against the chance the level was chosen at, a
level kept at its lock read at its legs' kept fair chances (a total at its own), since a kept leg carries the record's
model chance; and M8's case of a press over a payload carrying ids takes a leg from the read only with DraftKings' id at
its line by the audit's own rule (the audit boots with no baked odds, so a touchdown the pull priced is read from ESPN
there while the pull's id for it stands, and such a leg now qualifies at its fair chance). The nflbets smoke
holds the same on its own copies (`chanceOwn`, `qualOwn`, `pbTopOwn`, each level's quality by its own enumeration with
the tie's lean, the builder's three boxes, the card's lines, a game page's chances, the bubble, the record pills' and
the Props pills' titles, no Value mark or model word anywhere); `elo/check_tab.js` F1 (the candidates' rule on a fair
chance of its own, `legFairStand`) and F2 (the greedy prefix, the pairs DraftKings refuses, ties broken by the main line
then the id, the slot's summed lean, the empty levels' words, and since its review the legs that move against each
other); `test_suggest_ledger.js` (every level taken `chance:'fair'` with `p` in (0, 1), each leg of a model level but a
total at a fair chance of 45-97% and none a Value pick, each Elo pick's leg at a fair chance of 30% or more with its Elo
chance at or above it, and no two of an Elo pick's legs moving against each other); and `smoke_live.js`'s J
(the card's chance lines, Share link's text and the builder's hero). Wherever this file says, before this paragraph or
after it, that a leg qualifies by the 3-point edge or market + form, is a Value pick, is kept out by the far-off guard
or lands N% "by the model", that the Top 30 lines are Value picks and Other lines, or that the Elo picks search on the
Elo chance over floors, that is history from app v138 (the main places point here).

The review of 27 October 2026, before it merged, changed six things in it. (1) The levels' search works the best 40 of
each search by the real sums, where it was 4 and 10 (`SP_SEARCH` `likely:40, final:40`), and takes the best of the
floor search's finalists in full (`pbBestReturn`: the highest chance times price over the floor, Safe's highest chance, a
tie to 1e-9 to the larger lean, then the lower id), no longer the first in the search's own order to clear the floor (app
v136's rule, under **A level's best return, in the search's own order**): at the fair chance every estimated leg returns
the same on $1, so a game's parlays differ only by how their legs move together and by the same-game price, where the
pairwise score's error (about 4% on a 4-leg same-game parlay) is larger than the gaps between them. On the payload of 27
October 2026 CAR at GB's Aggressive had fallen back to the likeliest 4 legs at 11.98% though a parlay ranked 13th by the
score landed 12.01% at −24.0% (now its pick, "least costly · 12%+"), and five of the six floored levels of week 7's KC at
SEA and DAL at PHI had missed a cheaper one (each now the best of the 40 and of the best 120 by the score on a full
enumeration). It is not an exhaustive search: with 100 finalists 5 of 160 levels (three payloads and clocks, the slot's games among them) find one cheaper
still, by under 0.8 points of expected return. 40 cost about 13% more time than 10 (week 7's 14 games' levels in jsdom:
16.1 s against 14.2 s, nearly all of it the beams; made up since, the same levels in a sixth of the time: **The sets at
app v137's speed**, below). (2) A game total on one price is stated at its own 50% everywhere a
fair chance is stated beside the chance it was chosen and floored at: `legFairStated` (legChance without the hook) gives
the Top 30's fair column, the matchup bubble's Fair and each leg of `parlayFair` (a level's and the builder's fair
chance), so a row's "fair" and its expected return, a card's floor and its fair chance, and the builder's Fair column and
its hero are one chance (none of week 8's 121 totals was on one price). (3) A level read back from a lock is drawn with
its rule only where it was taken with `chance:'fair'` (`spTierIn` carries it; `pbRuleKnown`, and the Elo picks'
`eloCardOpt` the same): a level locked before app v138 was chosen at the model's chance, or an Elo pick over floors of its
own, and draws no pill. (4) The Elo lean says a figure shown as 0 unsigned ("Elo 0.0", never "Elo +0.0" or "Elo −0.0")
and an anytime touchdown's nudge, in touchdowns, to a hundredth (`eloLeanTxt`: 0.04 leans about as far as two yards of
receiving). (5) The builder's hero with no fair chance says "not every leg has a DraftKings price". (6) `build.js`
refuses, outside comments in the same files, any call of `farText`, a call of `legFarOff` outside `gameLegPool` and a
far-off flag's attribute or class in markup. Held: the audit's new warning kind `search` (W.search, argued in WARN: a
miss is a correctly priced parlay that costs a little more than another) holds each Suggested Parlays level of a game
whose legs move together against the best 20 of that game's parlays by the search's own score on a full enumeration
(`searchAud`, `fitsAud`'s rules), worked in full; MC's six lines at one chance now put the model's largest leans on the
highest ids (62% up to 80%), so the search's id tie-break would take the wrong ones, and the engine's levels hold the tie
where the beam is full; the touchdown heading's figure, blocking, is the model's chance for that player (his any_td line
by `statLines`); a level's fair chance is held to `parlayProb` on its legs at their stated fair chances, and its chance
equal to it wherever no hook is set, a total on one price among them; a kept card taken before app v138 draws no rule. The
nflbets smoke holds the same (its ten made-up games' Extreme tie now on H6, the last of the four by id; each locked card's
pill by its `chance` and a stated floor against its legs' kept fair chances; its made-up record's Safe and Medium taken
with `chance:'fair'` and its Aggressive before, drawn with no pill; each touchdown heading's figure; the Elo leans' words
by its own `leanTxtOwn`; and its check of Suggested Parlays opened without a freeze draws the page on the schedule its
made-up game joins before any run, since the half-minute look, finding the lists stale, drew the tab mid-run and ended it,
which a slower build had made likelier; and the matchup bubble's boot and that check's stop the page's half-minute look as
the main boot does, since on the bubble's a look on the real clock read the record again for its stood-in game, past its
lock, and drew Suggested Parlays between a set built again and the check of where the bubble left the focus), and `elo/check_tab.js` F1 a touchdown's lean to a hundredth and a nudge of 0 as
"Elo 0.0" (its stand-in of the parts' sums carrying `legFairStated` beside `legFair`).

**The sets at app v137's speed** (27 October 2026, before app v138 merged: `patch_market_chance.py`'s last two sections,
whose comments are the design, and `nflbets/build/tab_elo.html`). Measured in Chromium (five cold loads each, the page's
clock moved, every request off the local server answered 404) on week 7's files at Sunday 10:00 UTC, the Sunday slot's
eleven games and Sunday night's all live, Suggested Parlays built its sets in 6.6 s where app v137 took 2.1 s (37 s
against 11 s at four times slower, a phone's speed), each game one task of 0.4 to 0.9 s: every leg is thin since app
v138, so each game's beams ran over 24 to 41 legs at once, and the review's 40 finalists of each search were worked in
full. Profiled, about half the time was the beam (`pbEval`, `pbJoint` and `legRho` worked from strings for every partial
parlay, and every step's thousands of candidates sorted whole) and two fifths `parlayProb`'s trials. Five changes, none
moving a level: (1) `pbBeam` scores a parlay one leg longer from its parent's figures (`pbCtx`, kept with the memo: each
leg and pair indexed once, `pbJoint`'s lift by each reading worked once, `pbFits` on each pair; `pbGrow`; a set keyed by
its legs' indexes) and keeps each step's best `width` by a selection on the rounded score (`pbKth`) before sorting only
those: the same parlays in the same order (`pbRank`'s), their legs in the order first put together, the figures within a
few units in the 16th place; `pbEval`, `pbJoint` and `pbDecApprox` stay as the reference reading, which the audit's
W.search scores its enumeration with. (2) `parlayProb` counts the hits of 2 to 5 legs with no branch on each leg (every
leg's z the very sum it was, term for term in order, and a trial a hit exactly where every leg lands): the same count to
the bit, in about a third of the time; 6 legs or more as before. (3) `spOpenSoft`'s step is one level of one game's set
(`spPartStep`: `spLevel` on the pool and the memo `spBuild` uses, in its order, so the same set, kept in `SP_CACHE` with
its last level), and a task runs steps until `SP_SLICE_MS` (40) have passed on `performance.now`, the tab's last draw a
task of its own. (4) Inside one draw of the tab (`renderSp` and its `eloDecorate`, `EP_DRAW` in `tab_elo.html`) each
unit's Elo candidates are worked once (`eloCands` over `eloCandsOf`), where every read of a unit's Elo picks (the unit,
then each of its cards for its mismatch tags) had worked `pricedLegs` again for each of its games: 0.2 s of the tab's
last task on that Sunday. (5) A finalist that misses its floor in full is not priced (`pbExact`'s floor; it is never
taken): on week 7's GB at DET Aggressive 28 of the 40 miss it, on Thursday's CAR at GB Medium and Aggressive all 40. The
widths are as the review left them (`SP_SEARCH`). Against the page before, on week 7's files and today's at four clocks
(`scratchpad` tools, not committed): all 77 levels with a parlay the same parlay to the bit, so every level's expected
return at the fair chance moved by 0.000 points, the audit's W.search bar held on all 55 it can enumerate, and
compare.js's outputs identical but for their timings. Timed again the same way (medians of five, app v137 against this):
on that Sunday every set built in 1.93 s against 2.01 s (8.0 s against 8.9 s at four times slower), the longest task 144
ms against 259 ms (694 ms against 1.21 s); on today's payload Thursday's CAR at GB, 29 legs where app v137 had 18, in
312 ms against 220 ms (1.04 s against 1.09 s), its longest task 77 ms against 146 ms, and Sunday 1 November's slot and
night game in 277 ms against 328 ms (1.29 s against 1.27 s). The nflbets smoke's THE FAST SUMS AND SUGGESTED PARLAYS
OPENED WITHOUT A FREEZE holds (1b) `pbBeam` to its own copy of the beam as it stood (`bmOwn`, on the page's `pbEval` and
`pbFits`, one memo a game as a set's build shares it): the same parlays in the same order, their legs in the same order,
the figures within 1e-12, on 61 beams of made-up pools at any hour (one game's legs mostly at one chance and price, the
lean tied on some, under and over, a quarterback's passing touchdowns beside his teammates' touchdowns; a preferred
list; the totals as the fill; two games; three games of 70 legs, past the small keys; a narrow beam among ties) and on
this week's own pools; that a game's set is four steps, one leaving it unbuilt and the four keeping exactly the set
`spSet` builds; and `ppOwn` the new count. Bite-tested on scratch copies, each a failure of its own: the beam's order
without the lean, `parlayProb`'s 4-leg row read from a wrong cell, and a step building the whole set.

**The third review** (27 October 2026, before app v138 merged: `patch_market_chance.py`'s last section). Three page
changes. (1) A draw of Suggested Parlays while `spOpenSoft` is still building it on the screen built every set left in
one task: the page's half-minute look, finding what is shown stale (a kickoff, a lock, the sets going up at 6:00 AM
Eastern), calls `renderParlay`, whose `renderSp` ended the run and drew the tab whole, so a visitor who opened the tab as
the Sunday sets went up met the freeze app v135 removed (week 7's files, Friday 10:00 UTC: one task of 2.8 s; app v137 the
same). Now such a draw (the look, the record read again at a lock, a Refresh odds press) takes the run's steps again from
the page as it stands and keeps the building line (`spSoftAgain`, at the head of `renderSp`), so the run still ends drawn
by its own last draw; a run marks what it shows from its start (`SP_SHOWN`), so the look finds nothing stale unless
something moved; leaving the tab still stops a run, and a new run (the tab opened again) ends the one before. (2)
`renderSp` replaces the tab whole, so a control the reader was on lost the focus to the page's body when the look drew
the tab at a lock or a kickoff (app v137 the same): the same control is found again by the attributes it keeps (a leg's
Add by its leg, side and line, a level's Add to builder and Finish, a name, Refresh odds) in the same unit, level and kind
of level, else the focus goes to the tab's own button (`spFocusOf`, `spFocusBack`); a focus the draw's caller put
elsewhere is left there. (3) A game whose read found DraftKings' touchdown lists and no line at all (every Sunday game but
two on Tuesday's read of week 8) has no player leg, each touchdown being priced on the model alone, and its reasons said
"no player lines yet (read Tue 1:25 AM ET)" though DraftKings had posted its scorers: they say "no yards lines yet (read
...)" there (`espnTdOnly`, in `noPlSay`, `pbNoPl`, `spNoPl`), an empty Elo level "No yards lines in this game yet (read
...)"; a read that found nothing keeps "no player lines yet". Held: the nflbets smoke's THE FAST SUMS AND SUGGESTED
PARLAYS OPENED WITHOUT A FREEZE, on its made-up night game at any hour: `renderSp` and the look (`pbWatchTick`, what is
shown put off by a token) during a run each build no set in their own task, keep the building line and leave the run to
end drawn on the synchronous draw's HTML (until then the check held that another draw ended the run); a second run ending
the first; and `SP_SLICE_MS` on the page's own timer, `performance.now` moved 41 ms at every read (one step a task) and 10
ms (four a task, the last what is left), each step counted by the task it runs in. Its made-up Sunday night game: an Add
on the live Safe keeping the focus through the tab drawn again, and the look at the lock (the record not read yet, the
level drawn no more) putting it on the tab's own button; and the record's own Elo Safe and Medium taken with
`chance:'fair'`, drawn each with "strongest Elo leans" (`eloCardsHeld`), where the only kept Elo levels held before were
taken without it. The matchup bubble's checks: a game total on one price (planted on its made-up game, the over at +120
alone) opened from a level card of the smoke's own and from the builder, its Fair "50% est." and its Expected "+10.0%",
where `legFair`'s estimate (43%) would say "43% est." and "−4.5%". The stand-in read's game with every line taken out
and its touchdown list kept: no player leg, and `spNoPl`, `pbNoPl` and an empty Elo level saying "no yards lines yet",
with the list emptied too "no player lines yet", each on the smoke's own reading (`tdOnlyOwn`, which `noPlOwn`,
`eloNoPlOwn` and `pbNoPlOwn` read too); the audit's `noPlAud` and `spNoPlAud` read the same on its own (`tdOnlyAud`),
words being warnings there. Bite-tested on scratch copies: a task running every step (`SP_SLICE_MS` not read) fails the
slice check; `renderSp` without `spSoftAgain` fails the draw's and the look's; the bubble's Fair on `legFair` fails the
one-price total; and one copy with three changes (no focus put back at the end of `renderSp`, `noPlSay` blind to a read of
touchdown lists, the Elo picks' rule drawn only where not every leg is kept) failed each of the three new checks. The
audit's M17 case of a touchdown on the model alone (**A touchdown on the model alone is no tested kind**) stood on a
quarterback, and on `test_audit_phases.py`'s week-5 payloads, baked before the quarterback's touchdown model (no
`model.QB.any_td`, as K2 reads it), no quarterback has the leg, so it failed there (four cases, four failures each): on such
a payload it stands on aud-v16, a receiver on the touchdown list, his receiving line taken out of the case's read and
carried again by the later one. Run with four cases at a time on a box of 15 GB, `test_audit_phases.py`'s four page smokes
(each a child of up to 6 GB) can be killed for memory (one was, its output "smoke produced no summary line (exit 1)"); it
passed run alone.

**The Elo picks pass over legs that move against each other** (the review of 27 October 2026, before app v138 merged). On
week 7's files DAL at PHI's Elo Extreme held Tanner McKee's Under 192.5 passing yards with Makai Lemon's and George
Pickens's yards over (0.353 and 0.064 in the pair table, turned by the under) beside CeeDee Lamb's and Saquon Barkley's
touchdowns: its fair chance (`parlayFair`, the legs moving together) fell to 1.75% where the legs multiply to 2.41%, while
`parlayDec` never pays more than multiplying, so it returned -44.8% at DraftKings' fair chance (-24.1% had the legs been
independent). `epTake` now also passes over a candidate that moves against one already taken: `epOpposed(a, b)`, the
props parts' `legRho(a, b)` (the very correlation `parlayProb`'s Cholesky rows read: the payload's pair table for two
players of one game, 0 across games) times each leg's side (an under -1, as `parlayProb` and `pbJoint` turn it), below
`EP.opp`, -0.05, a named constant in the tab: two even legs at -0.05 lose about 3% of their chance all land against
independence, and the case that set the rule, a quarterback's passing yards under beside his receivers' overs, is about
-0.10 and below (the bar was nothing, however small, for a few hours that day: see the week-7 results below). An empty
level's words say what the walk found of either cause, "Strongest first, only 3 leans in this game go together on one
DraftKings slip: this level takes 4." (`epFitWhy`; "go on one DraftKings slip" for a few hours that day, untrue of legs
DraftKings would take that the walk passes over), and the rule's title reads "The players whose Elo matchup leans
furthest their way, that go together on one DraftKings slip". On week 7's files at its Sunday morning the Elo picks then
ran -19.7% to -31.8%: DAL at PHI -19.7%, -24.0%, -27.7% and -31.8% (its Extreme Lamb's and Barkley's touchdowns,
Pickens's and Lemon's yards over and Ryan Flournoy's receptions under; McKee's under passed over beside Lamb's
touchdown, -0.099), the Sunday slot -19.7%, -22.9%, -25.5% and -29.7%, and KC at SEA's Safe -19.7% with its other three
levels empty ("Strongest first, only 2 leans in this game go together on one DraftKings slip: this level takes 3."): its
two strongest leans, Jaxon Smith-Njigba's touchdown and Emanuel Wilson's rushing yards under, move against seven of its
eight other candidates by 0.034 to 0.102, and Sam Darnold's passing TDs under, the eighth, by 0.323, a pair DraftKings
refuses besides; before the change its Medium, Aggressive and Extreme had returned -24.9%, -30.5% and -32.1%. That was
the bar at nothing; the owner has complained of empty Elo picks before (19 October 2026), so the bar is -0.05 (`EP.opp`), which keeps
a pair that costs little and still passes McKee's under over beside Lamb's touchdown. On week 7's files at its Sunday morning, at -0.05, KC at SEA's Elo
Medium returns -23.8% (Emanuel Wilson's rushing yards under, Smith-Njigba's touchdown and Travis Kelce's receiving yards
under) and its Aggressive -30.4% (AJ Barner's receiving yards under besides), its Extreme still empty ("Strongest first,
only 4 leans in this game go together on one DraftKings slip: this level takes 5."); the Sunday slot's Aggressive and
Extreme -24.9% and -27.0% (-25.5% and -29.7% at nothing); DAL at PHI's four as they were; every Elo pick -19.7% to
-31.8%. `build.js`
stops if `epTake` loses `epOpposed`, `epOpposed` its reading of `legRho` with the sides below `EP.opp`, `EP` its `opp:-0.05`,
or the props parts `legRho`.
Held, blocking: `elo/check_tab.js` (`rhoOwn`, `opposedOwn` and `takeOwn`, its own reading of the table, on the files,
every unit and F1's and F2's fixtures, F1 now passing three candidates over; the props parts' `legRho` as loaded the
check's own reading on every pair of F2's players' legs; F2's J at K, a quarterback's passing yards under leaning
furthest with his receiver's and his tight end's yards over passed over beside it, so its Safe takes the other club's
back and its Medium and Aggressive run short, saying so, where with neither rule its Safe is the quarterback and his
receiver; on a tab without the rule 40 failures, and 31 with the sides left out; and F2's L at M, the bar from both
sides: a back's receiving yards over leaning furthest, his teammate's receptions over at -0.04 with it kept and the
other club's tight end's yards over at -0.06 passed over, so Safe is the back and the receiver, Medium the quarterback
too and Aggressive short; on a tab at the old bar of nothing 8 failures, all L at M's, and with no bar 45; its own copy
of the bar is `OPP_OWN`); the nflbets smoke (`opposedOwn` on the page's table in `SPH.eloTakeOwn`, its bar `OPP_OWN`,
and on its made-up game the first two candidates' pair planted at -0.06, the second passed over, and at -0.04, kept,
every level the walk's each time, and the levels as they were once the plant is taken away; its two-game slot and
its mismatch Under stand at 0 on their pairs' keys, so those cases stay the pair rule's and the tag's); and
`test_suggest_ledger.js` (no Elo pick the record takes holding two legs that move against each other by more than
-0.05, by its own reading of the table: on a page without the rule, DAL at PHI's four levels fail it).

**A touchdown on the model alone is no tested kind** (27 October 2026, before app v138 merged, `patch_market_chance.py`'s
last part). An anytime touchdown read on ESPN is priced by one of three branches of the estimate (`guessTdPrice`, its
branch `tdBranch` in `part2.js`): on DraftKings' yards line of the touches that score his touchdown (a quarterback's
rushing, a back's rushing or receiving, a receiver's or tight end's receiving), as a backup (no such line, his club's
lines complete and he no charted starter), or on the model alone (logit 0.5961 + 1.4369 times the model's). Against
DraftKings' real prices of weeks 2 to 6 the lined branch lands within about 1.5 implied points in every band (the
held-out weeks 4 to 6 too) and the backup within half a point, but the model alone was all but untested (54 of 1,736
legs) and runs high where it matters: its fair chance +3.1 points [+1.8, +4.5] over DraftKings' where it states 45%+, the
band a level takes, and +8.9 at 70%+. A read more than 36 hours before kickoff leaves no club's lines complete, so on
Tuesday's read of week 8 every Sunday scorer with no yards line read was priced so, and the Sunday sets leaned on them
(D'Andre Swift -155, Ja'Marr Chase -170, Derrick Henry -204, James Cook -314, each est.). So such a touchdown is no
tested kind: `espnPrice` marks it `tested:false` and `alone:true`, `pricedLegs` leaves it out (no level, night or slot, no
all-games level, hand, Top 30 row or Elo pick takes it), and it stays priced and shown est. on the game's page, its title
"... (untested: from the model alone, no yards line of his read)", until a later read carries his line. A touchdown with a
real price, or priced on the lined or backup branch, is as it was. On the payload of 27 October 2026 (Tuesday's read: touchdown lists
alone for most Sunday games) CHI at SEA's and the Sunday slot's Safe became a game's moneyline and total (-18.0% and
-17.9%, where each stood on a touchdown at -18.7% and -18.6%), their Medium, Aggressive and Extreme empty ("Only 2 legs in
this game: no yards lines yet (read Tue 1:25 AM ET).", "no player lines yet" until **The third review**), and on Sunday 1 November's clock the Top 30 lines are 30 game
bets (the 15 player lines they held were all such touchdowns); Thursday's CAR at GB, whose read carries yards lines, is
as it was, and so is every level of week 7 on its Sunday morning read. Held, blocking, each on its own reading:
`espn_rule.js` (the audit's and the smoke's copy of the formula) has its own `tdBranch`, its `price` marking such a
touchdown untested, so every hold of a suggestion on `takeable` follows; the audit's M8 holds the page's `tested` beside the
rule's on every touchdown of a read's game and M17, on its made-up Monday night, a quarterback listed with his passing
yards alone read priced untested at the rule's price, drawn est. on the game's page (its title a warning) and in no list a
suggestion is built from, beside a back's touchdown on his rushing line offered, and the quarterback's offered at its
lined price once a later read carries his rushing line; the nflbets smoke, on its stand-in read, a charted starter's
yards lines taken out with his name left on the touchdown list, his touchdown priced untested by the page and its own
reading, drawn est. so titled and in no list, set or Elo pick, another starter's still in `pricedLegs`; and
`test_suggest_ledger.js` no leg of any set or Elo pick a touchdown priced from its read on the model alone (`tdAloneOwn`:
its read lists every charted quarterback with his passing yards alone), and the same on a side run with every charted
back's rushing line taken out of the read and his name left on the touchdown list. Each bites on a page with the rule
taken back out: the audit 38 failures (M8's two presses and M17 among them), the smoke 20 (its fixture's three, the
week's Safe to Aggressive of CHI at SEA and the Top 30 among the rest, and two saying the page was edited after its
build), `test_suggest_ledger.js` 1 (the side run's sets taking five backs' touchdowns on the model alone).

**A team bet's chance stands on this season's ratings** (25 October 2026, after the owner's ask of 24 October for every
number checked, "since we have been doing a lot of changes"). A team's moneyline or spread is priced on `gameMu`, the
team model's margin (`modelMargin`) pulled halfway to the posted spread, and with no line posted that margin builds the
game. The team model is the betting app's own equation (its `MODEL.market` coefficients in `props/data/grid_model.json`:
Elo gap, rest, neutral, net EPA), and the file's teams were the app's preseason seeds, every club at n 0, read on every
bake by `payload.py` and never refreshed, so every team bet stood on preseason ratings all season: KC 1476 at 5-0 where the
season had 1601, MIA 1434 at 0-5 where it had 1321, the Dolphins' moneyline +185 heading the Top 30 as a Value pick at
46.9% against a fair 33.6%, Seattle's moneyline at 68.4% in Sunday night's Safe. Two independent recomputes reproduced all
52 of week 7's team legs to four places from the frozen file. Now `payload.py`'s `team_grid()` takes each club's `elo`,
`off_epa` and `d_off_epa` from `betting/state.json`'s `teams` (Alpha Model's ratings as the betting job publishes them
after every final, the inputs the equation was fitted on and runs on in the app), keeping the seed only for a club the
state has not got whole, or the whole file when the state is of another season or does not read; `PAY.grid.src` says
which (`{teams:'betting/state.json', season, clubs, seeds}`). The coefficients are untouched (nothing is fitted on the
season in play), and the page reads `PAY.grid` as before. On week 7 the home side's chance moved toward the market's
almost everywhere it had drifted (KC at SEA 68.4% to 58.9% against the market's 57.2%, LA at LV 32.1% to 39.9% against
39.1%), and 9 of the 11 team Value picks on the Top 30 lost the mark. Not changed, and open: the team model passes rest 0,
and Alpha's quarterback and event adjustments (`teamAdj`) are not in it. Since app v138 a team leg is stated and chosen at
DraftKings' fair chance, never on `gameMu`, which stays the Game bets card's "our margin", the record's model chance and
the game a player's projection stands on (**DraftKings' chance on every leg**, above).

**A neutral site takes the home field out** (app v137, `patch_neutral_site.py`, whose docstring is the design, the owner's
call of 25 October 2026, "do the neutral site fix"). Until then the team model passed neutral 0 on every game (the payload's
schedule carried no flag), so at a game abroad the listed home side kept the whole home field: 1.743 points on the margin
(the equation's intercept) and 0.87 on `gameMu` once pulled halfway to the spread (PIT at NO at the Stade de France, NO to win
40.6% where the app's equation gives 38.1%), and all 1.743 where no line is posted, with the no-line points the player
projections read. Three parts: `props/data/grid_model.json` is now the app's `MODEL.pure` (reference_models.json's `A.pure`,
the spec Alpha's calls run on), its neutral coefficient -1.7430521789557656, minus the intercept, so a neutral site takes the
home field out exactly, where the file had carried the app's unused `market` variant, +0.4214, which would have added home
field had the flag been read (its other coefficients and intercept are the same); `payload.py` writes each game's `neu`, 1 where
games.csv's `location` is not 'Home' after `betting/neutral_sites.json` turns a 'Home' row played abroad 'Neutral' (the rule
the betting job, the Joker and the betting smoke read; nine games of 2026); and `modelMargin` reads it (`neu===1`, so a
payload baked before it reads every game as a home game), `applyBaked` copying it into the saved schedule. With it PIT at NO's
margin is -5.153, Alpha's own frozen pre-kickoff margin to the third place. Left as fitted, on purpose: the player model's
`home` (gameCtx's, the listed home side 1: `props/research/features.py` codes nflverse's listed home team and reads no
location, and 2019-2025's neutral games cannot tell 1 from 0 for any stat), `modelPoints`' home term (its fit is not in this
repo) and rest 0. The audit's TN holds it, blocking, on its own reading: `PAY.grid`'s equation `A.pure` exactly, `neu` 0 or 1
on every game and on the page's schedule, every game's margin its own sum with the flag, a planted neutral copy of a home game
with a spread (margin moved by the coefficient, `gameMu` by half, the to-win and to-cover chances its own Normal) and with no
line (the points split by the equation, the total unchanged, `home` still the listed side), and with `PROPS_AUDIT_RAW` each
`neu` worked out from raw/games.csv and the list; a payload baked before the flag is skipped. `betting/neutral_sites.json`
and `betting/tools/reference_models.json` are AUDIT paths of the props gate as well as PAGE ones.

**A level's best return, in the search's own order** (app v136, `patch_best_return.py`, the same check). A brute force
over every parlay the rules allow on week 7's sets found three levels where a clearly better parlay cleared the same floor
(KC at SEA's Extreme +8.2% expected return by the page's own full sums, CIN at BAL's Extreme +4.9%, MIA at NYJ's Medium
+5.4%): `pbBestReturn` re-ranked the beam's finalists on `parlayProb` with 6,000 draws times `parlayDec` with 4,000, whose
noise on a 5-leg same-game parlay (up to 17% of its return) was larger than the gaps between them, so the pick was the
finalist that drew luckiest. The finalists now keep the beam's own order (`pbEval`: the pairwise copula chance times
`pbDecApprox`, exact where the legs are independent and close within a game), each worked in full by `pbExact`, the first
to clear the floor taken; no draw is spent on the re-rank. Against app v135 on week 7's 52 levels on one payload and clock:
34 the same, 18 changed, and on the 16 with a floor the pick's expected return in full sums up 1.2% on average (+9.8% at
most, MIA at NYJ's Aggressive; the five lower by at most 2.3%, within the full sums' own noise). Since app v138 (the
review of 27 October 2026, under **DraftKings' chance on every leg**) the best of the finalists in full is taken, of 40 for a set, where it was the
first of 10 to clear the floor: the full sums are seeded and kept, and at the fair chance the finalists differ by less
than the pairwise score's error.

**The props tab's record from week 7 on** (app v136, `patch_espn_close.py` and `weekly.py`'s `espn_close`, the same
check). The first tab's Week and Season pills (`renderRecords`: the model's side of every sportsbook main line, graded on
the numbers frozen before kickoff) read their lines from the paid pull's `PAY.mkt` alone, so from the pull's end (20
October 2026) Week 7 read 0-0 with Thursday's game final, and the season stood at week 6's 1302-1203. Now, when a game
kicks off, `apply_espn` keeps DraftKings' main lines as the last published read had them before kickoff in the payload's
`espn_close`, `{v:1, weeks:{w:{gid:{at, lines:{pid:{stat:line}}}}}}`: from the published payload's `espn` block for the
game or `props/data/espn_close_seed.json` (whichever was read latest, each only before the kickoff; never this run's own
read, which no visitor saw, the review of 25 October 2026), frozen once made, carried run to run within the season
(nothing across a rollover, nor a game carried that is to come again, postponed, or whose kept read is at or after its
kickoff as it now stands, moved earlier past the read, nor one no longer the schedule's game of that week with a kickoff,
which G3b would refuse on every run after; `payload.py` never carries it, `_REDERIVED`), cleaned by the page's rules, main lines alone (no rung,
touchdown, game line or price). `props/build/espn_close_seed.py`, run by hand with history back to 19 October (`git fetch
--shallow-since=2026-10-19 origin main`), recovered the games played before this from the last payload committed before
each kickoff (week 7's Patriots at Bears, 60 lines on 20 players read 7 hours before kickoff); the job takes a game from
the seed only where it keeps none. On the page `closeLine(gid, pid, stat)` reads it, and `gradeGame` and `trackRecord`
grade the model's side of it where the paid pull wrote no main line (the paid line first, so weeks 1 to 6 are as they
were). It is a line, never a price: its row carries no `ml` or `imp`, so the hidden Track Record's "against the book" and
market + form (gone in app v138 with its table: **DraftKings' chance on every leg**) leave it out, and the pills count it. Held by `test_apply_espn.py`'s N (kept, read at the kickoff, later
read winning, never replaced, a 'none', a game to come, junk, the seed and its reader, a rollover, the carry, this run's
own read never taken, a carried game to come again, kept at or after its moved kickoff, off the schedule, under another
week or with no kickoff dropped) and the audit's G3b, blocking
(the real table's shape: games of this season kicked off by the payload's `baked_at`, the run's own clock, since the
audit sets the page's clock back on a Monday night; read before kickoff, valid lines; and on a
planted week-1 final the kept line frozen with the model's chance at it, graded on the model's side with no price,
counted by the week's pill, a paid line winning, another game's and junk never read).

A game total is a leg like a team's win or cover (`total` beside `ml` and `ats`: `totalBet`,
`totalLeg`, `settleGameLeg`, `isGameLeg` in `part2.js`), offered over and under on the Game bets card
on each game's page on the Props tab (app v105, `patch_gamebets_props.py`, the owner's call of 14 October
2026: after the game's suggested parlays, and since app v124, which took those off the page, after the game's head and
its Matchup, Mismatches and Team Stats buttons (and in app v128 its Game snapshot button); until then it opened under each
Matchups game, whose Game snapshot then led with a button that opens the game's page on the Props tab with the card
brought into view, as the snapshot the matchup bubble opens still does), and added by hand only: it never makes a suggested parlay. Its line is the
schedule's `g.tot`, its price the over and under odds beside it, `g.tov`/`g.tou`, which `payload.py`
carries from games.csv's `over_odds`/`under_odds` (free) and which DraftKings' own replace: since 20 October 2026
those the props job's read of ESPN's scoreboard found (`apply_espn` in `weekly.py`, while the read is under a day old,
by the press's own set and drop rule: a total read on another number with no price of its own drops the price; the
game marked `lsr` 'espn'), and until then, and still after a pull by hand, the bake's from `oddsfetch.py`'s totals
market where a fresh DraftKings total was used. With no price on file the leg is shown at -110 marked est. Its chance is the
market's own (app v88, `patch_totals_market.py`): mu is the posted total, and the over's chance is its
over and under prices with the margin out (`totalOver`, `devigOver`), 50% where either is missing.
`TOTAL_SD`, 13.2 points (how far 2010-2025's 4,175 regular-season totals landed from the posted one),
prices only a number other than the posted one, Normal about it. The model's own points (`modelTotal`,
from `modelPoints`) are shown on the card as "model's points", a display kept out of the chance, the
edge and the suggestions. That is what `props/research/totals/README.md` found: four points formulas
built leak-free on 2012-2023 and tested once, frozen, on 2024-2026 beat the posted total on nothing,
and the rule used before (the model's points pulled halfway to the total) was worse than the market
there (MAE +0.13 points, Brier +0.0042, its 3-point-edge picks 66-81 for -20.3 units). A model may take
the chance back only by passing that study's preregistered rule on seasons it has never seen; never
tune one on the season in play. A no-vig chance sits under the chance its price implies, so a total
never clears the bar a suggested leg must and `pricedLegs` leaves the totals out; a Suggested Parlays set
(every bet type of its game) takes its game's total only as the last fill, never a Value pick and so unmarked
(until app v113 with a line under the level saying why, "... it is here because this game's other legs do not make a
parlay of this size."; a set's cards draw no such line since, the owner's call of 17 October 2026, under "Bets and
Stats: the loop"), and with Game total ticked the Parlay Builder's Top 30 lines list both sides of each ticked game's
total last among the other lines, after every Value pick and every thin-edge line, set there and never left to the
sort, since a total priced on one side only is put at 50% and at plus money can be expected to make more than a
thin-edge line (app v91-v93, v111 and v112, below; until app v112 the totals came before the thin-edge lines, marked
no edge). The Game bets card says "A Suggested Parlays set takes a game total only where the game's other legs
cannot fill a parlay, and never marks it Value; tick it here to add one yourself." The audit's J2
holds the chance to the no-vig chance of the prices on every game and with the model's points moved,
and M holds a total in a tier to that.
A total moves with its game's passing and scoring lines (`TOTAL_RHO`, measured on 2019-2024) and is
unrelated to a win or cover bet on the same game.

The study's ratings candidate (`cand_ratings.py`, the ratings fade) is tracked quietly as a shadow
(the owner's call, 2026-10-11): `props/research/totals/shadow.py` runs in the betting job after the
models (continue-on-error) on that run's games.csv alone, calls every game to come with a line (mu, sd,
P(over), the market's no-vig chance at the same moment, the 3-point-edge pick), rewrites a call while
its numbers change before kickoff, freezes it at kickoff, grades it after the final against its own
line, and writes `props/research/totals/shadow/ledger.json`, which rides on the job's commit;
`shadow_check.py` in the same step fails that step alone, and puts the ledger back, if a frozen call
moved or a grade is not games.csv's. No page reads the ledger and nothing uses it. Its bar was set
before its first call and is held in the ledger: decided once 285 games are graded over or under with a
market chance (the first 285 in grading order), PASS only if it beats the market's no-vig chance on
both Brier and log loss with paired bootstrap 90% intervals wholly below zero and its 3-point-edge picks
are up in units; otherwise FAIL and the tracking stops. A PASS only makes it a candidate for a change of
its own; before 285 the summary never says passing. `shadow_equiv.py` proves its numbers are the research
harness's own (identical on every development game), `test_shadow.py` is its test (README.md there,
"The shadow"). Never edit the ledger or the bar by hand.

**The free-data props model** (`props/research/propmodel/`, its README.md and PREREGISTRATION.md first; 27 October 2026,
the owner's call after the diagnosis that the prop model's chance carried nothing beyond DraftKings' price, "maybe come
up with a better model altogether that specializes on this separate than the pickems models", and his choice of the free
route). A model of its own for player props, on nflverse's free files alone (each player's snap, target, air-yard,
red-zone and carry shares, the depth chart as it stood before kickoff, the injury report and teammates out, the
opponent's defence and the game's lines: 510 features, 2013-2025, zero rows from the snap counts included):
LightGBM quantile regression for the yards stats, a LightGBM Poisson mean with a negative-binomial spread for the
counts, and a LightGBM Poisson on the touchdown count, each chosen on a 2021-2025 walk-forward (every test season
fitted only on the seasons before it) where it beat the site's model refitted the same way on every stat in every
season (CRPS 1.2-5.4% better on the starters a book prices, 8-35% on backups and rookies; the anytime touchdown's
log loss 0.024 better and calibrated where the site's said 19.6% for 16.4% scored), then refitted on 2013-2025 and
frozen by SHA-256 (the model files gzipped under `frozen/`, `pack_frozen.py`). Nothing on the site reads it. Its one
test against 2026 is preregistered and run once, by `oneshot_2026.py`, no sooner than 31 October 2026 00:15 UTC (96
hours after week 7's last kickoff, so every game's stats and snap counts are in, which it checks): a blend of 0.25 toward
the model, judged on weeks 1-6's priced main lines and anytime touchdowns and weeks 1-7's closing lines from the archive
by the bar PREREGISTRATION.md fixes; a PASS only starts a quiet shadow, a FAIL ends it, and the site stays on
DraftKings' chance either way until a shadow passes. `fetch.py` refuses every 2026 file to every script but the one-shot,
and to it only under the committed, unmodified preregistration on origin/main (since the one-shot ran, `td_shadow.py`
also lifts it, in memory: **The touchdown shadow**, below); never edit a file the preregistration hashes, never read 2026
with this model's code before the test, and never run the test twice. **It ran once, on 31
October 2026 at 01:02 UTC** (`results/oneshot_2026.json` and `oneshot_2026_lines.csv`, committed as written): **main
lines FAIL** (on 2,544 priced lines the blend level with DraftKings' no-vig chance, A1 Brier +0.0001 [-0.0008,
+0.0010], A2 log loss +0.0002 [-0.0016, +0.0020], and no information beyond it, A3 beta +0.02 [-0.15, +0.19]; B2 failed
too), so the main-line family is not used anywhere and 2026 is spent for it; **anytime touchdown PASS** (C1 beta +0.38
[+0.03, +0.75] on 1,769 priced Yes legs; it said 16.0% where 15.6% scored and the price implied 18.9%), which starts
the quiet touchdown shadow of PREREGISTRATION.md section 8 (T1 and T2 on the first 2,000 graded) and changes nothing on
the site.

**The touchdown shadow** (`props/research/propmodel/td_shadow.py`, its README.md's section "The touchdown shadow", which
holds the bar verbatim, and PREREGISTRATION.md section 8; the owner's sign-off of 31 October 2026). The one-shot's
touchdown PASS starts it and nothing else: research only, its ledger read by no page and used by no suggestion, and
nothing on the site moves by it. It is seven steps of `props.yml` after the publish's commit and the props-refused
issue's close, on `main` only and only when `weekly.py` succeeded, each `continue-on-error` with its own cap (2, 4, 4,
20, 4, 3 and 2: 39; since the review of 31 October 2026 every step of the job has a cap of its own, the publish's
adding to 45 (`weekly.py`'s 32 among them, its whole cap before the shadow, so a stalled publish holds the concurrency
group no longer than then) and the job's 90 above all of them, which `test_props_gate.py` holds), none
writing the build's problems file, so it can never refuse, slow or redden the publish, which is pushed before it
starts. Before each game it calls every player on the anytime-touchdown list of the job's published ESPN read
(`PAY.espn.games[gid].pl.td`) with two chances. p is the frozen model's chance he scores a rushing or receiving
touchdown, made by the one-shot's own code imported unchanged and hash-checked as loaded (`week_rows`, then
`Predictor.predict_rows`, clipped to [0.001, 0.999]), on this run's 2026 nflverse files in a Python 3.13 venv with
`requirements.txt`'s pins and the 2010-2025 files from `actions/cache`, and only for a game whose clubs' previous games
are complete by `oneshot_2026.coverage`. m is the chance the published page states on his "Scores one" row, read by
`td_shadow_page.js` off the root page booted in jsdom on the payload just published, at the run's clock, and held
exactly equal to `legChance`, `legFairStated` and `espn_rule.js` or not written. A call is made or rewritten only while
its game is more than 10 minutes away, frozen at kickoff (or a score), and graded once, by the first run at or after
kickoff + 96 hours whose files cover the game, on the one-shot's own `outcomes()`: a row in the 2026 build is played,
y is rushing + receiving touchdowns >= 1, no row is void, and so is a game moved more than 24 hours or whose files are
still not in at 14 days; the site's `settleLeg` is recorded beside it, never deciding. It is decided once, on the first
2,000 graded calls with p and m in grading order, touchdowns priced on the model alone left out (the owner's Q2; still
called, graded and reported): PASS only if T1 (the log loss of b = m + 0.25 (p - m) less m's, its game-bootstrap 90%
interval wholly below 0) and T2 (beta in logit P(TD) = alpha + gamma logit m + beta (logit p - logit m), wholly above
0) both hold. Before 2,000 the ledger carries running counts and point estimates only; a PASS only makes the model a
candidate for a change of its own (a PR with the audit's and the smokes' checks, the blend at 0.25 on the anytime
touchdown), a FAIL stops it, and fewer than 2,000 at the season's end is undecided, not a PASS.

It runs `predict.py` on 2026 by setting `HOLDOUT_FROM` to 2027 inside its own process once the hash checks pass
(`lifted()`, undone in a `finally`; the owner's Q1, argued in the README), which makes `fetch.py`'s "nothing in this
folder can move it but the one-shot 2026 test" untrue: `td_shadow.py` is the second and last program that moves it, in
memory, never through the variable. Never edit a file PREREGISTRATION.md section 3 hashes (it would void the PASS),
never fit, tune or choose anything on 2026, and never run `oneshot_2026.py` again. The ledger,
`props/research/propmodel/shadow/td_ledger.json`, is generated (under "Source vs generated"): `td_shadow.py init` wrote
it once in the PR, with the bar and no call; since, `td_shadow.py run` writes the new one aside, `td_shadow_check.py`
holds it against the last commit's (`git show HEAD:`), and only then is it moved into place and committed alone in a
second commit ("props: touchdown shadow ..."). Its problems are REFUSED (the ledger untouched), DEGRADED (written, no
call this run) or WARN, in one open issue labelled `td-shadow`, commented only when they change and closed by the next
clean run; the run that decides opens a `td-shadow-verdict` issue once; the props run itself stays green. The off
switch is the repository variable: `gh variable set TD_SHADOW --body off` stops it and `gh variable delete TD_SHADOW`
resumes it (games missed meanwhile are never called; calls already made are frozen and graded once it is back). After
the first call its code changes only to fix a mechanical failure, never a rule, sample, metric or threshold, each fix
logged with its reason in the README's "The shadow's log". **While the shadow runs, a PR that changes the touchdown
estimate or what it stands on moves the shadow's m, and must say so in its body and in that log**: `DK_EST` (td, tdVig,
complete), `guessTdPrice`, `tdBranch`, `estPrice`, `espnPrice`'s touchdown path, `espnComplete`, `espnStarter`,
`legFair`'s dkline touchdown path, `fairVig`, `project()` and the touchdown projection's inputs (`tdrate`, `tdmult`, the
model files), `gameCtx` and `teamImplied`, `PAY.grid` and `depthOf`; a pull by hand with `oddsfetch.py` does the same (it
turns legs `real` and moves the week's overround). `test_td_shadow.py` is its test, a unit of the props gate's job C,
and the gate counts the shadow's code and every file section 3 registers as AUDIT paths, so a PR editing one runs the
whole gate and fails job C. The test pins BAR's own SHA-256 and the committed ledger's `bar_registered` (BAR never
changes: a PR that moves it must edit those two lines too), holds every sub-condition of the check in its own words,
and runs props.yml's shadow step script itself under `bash -e` in a copy of the tree (exit 0 moved, 1 refused and left,
2 DEGRADED moved); the check fails a ledger that changed at the last commit's `run_at` (no run made that change), and
the props gate's `ledger_hold` keeps a hand edit from ever becoming the last commit's (the review of 31 October 2026).

A quarterback has an anytime touchdown since app v102 (`patch_qb_td.py`; the owner asked, October
2026): his own rushing or receiving touchdown, as DraftKings settles it, never a pass he throws, and
settled so everywhere it already was (the stats' `any_td`, the live box score's, `settleLeg`, the
suggestions record: rushing plus receiving touchdowns only). It is worded so wherever it is named
("Scores a rushing or receiving TD (not a TD pass)", `tdLabel`; his game page heads it "Rushing or
receiving TD"); a back's, receiver's or tight end's reads as before. Its numbers are
`props/research/qb_td.py`'s, merged into `final_model.json`, `tdrate.json` and `corr.json` by its
`--write`, which adds only the quarterback's entries and asserts nothing else moved: a logit on
`featVec` fitted the way fit4.py fitted the other positions' (the script recovers that method and
gives their coefficients back to within 0.018), on the rows the page serves: each club's starter judged
before the game (`pregame_starter`, most pass attempts over his recent games), 2019-2024, since the page
offers the leg to the chart's QB1 alone and a fit on every row, backups' relief and kneel-downs in, read
the starters about 1.5 points low. Held out once on 2025's starters, capped as the page runs it (his
projected carries at the league's 0.047 touchdowns a carry, times `tdmult`), it beat the league's
starter rate (log loss 0.4018 against 0.4307, Brier 0.1223 against 0.1307), said 15.4% where they
scored 15.5%, and was level with his own shrunk career rate (0.4035, 0.1217), as over a 2021-2025
walk-forward on the starters (said 15.5%, scored 15.6%);
`TOTAL_RHO['QB:any_td']` 0.09 and 12 `corr.json` pairs were measured as theirs were. The cap is the
league's rate, so it holds a quarterback who runs in his own goal-line plays under what he does (Josh
Allen, said about 60%, capped to 40-43%); a per-player rate would be its own change,
tested walk-forward. Market + form gives his touchdown no second price (his rating is a passer's;
`eloAltP` takes the leg's stat), so a suggestion takes one only as a thin leg, never a Value pick. The audit's K2 holds it
(on a payload baked before the model it says so and skips the projection checks; with it, a quarterback's
book price, the open weeks' own or one it plants, must reach a priced leg), and
`PROPS_AUDIT_PAYLOAD` boots the audit on another payload, to try data the job has not baked.

`.github/workflows/props.yml` runs 22 times a week, every run free since 20 October 2026 (the owner's
call: no scheduled paid pull, "i want all of everything i see to be the espn estimates, and only have an option to click
on the pull from Draft Kings button available for me to run to pull all the current stuff"): each downloads nflverse's
files, bakes the payload, assembles the page, reads DraftKings' game lines and player lines from ESPN's free feed with
the page's own reader and publishes that read with the payload (**The published read**, under "Refresh odds" below),
keeps DraftKings' player lines game by game in its archive (**The archive of DraftKings' lines**, after it), then runs
the audit and the suggestions record; then, after its commit, come the touchdown shadow's steps (**The touchdown
shadow**, above), which never hold the publish back. No odds-API key is mapped in any workflow, and nothing in the job can
spend a credit (`props/data/oddsfetch.py` and `credits.py` are tools to run by hand; `weekly.py` runs neither and reads
no key). Its run line is `python weekly.py --no-commit`; `--no-odds`, `--catch-up`, `--hours` and `--local` are still
accepted and do nothing (a run queued with the old line, the props gate on a base from before), and the dispatch's
`no_odds` input is kept, read by nothing. The record takes each Suggested Parlays set from the last run before its lock,
on the lines that run read (no visitor's press counts), so the crons are set by the locks they serve: Mon, Wed and Thu
08:17 UTC (Monday night, Thanksgiving's early game, Thursday night), Sat 05:17 (the weekend, on the site by Saturday
morning Pacific so the owner has all of Saturday to look, his call of October 2026), Sun 04:47 (new on 20 October 2026,
landing 06:47-14:11 UTC: the Sunday slot locks 2 hours before its first kickoff, 15:00 UTC under daylight time and 16:00
after 1 November, and before it the last run sure to land was Saturday's 23:07, its read up to 15 hours old at the lock),
eight post-game and stats runs, Saturday 16:07 and 23:07 (the last sure to land before a London kickoff's lock), and a
daily 12:07 that lands after nflverse posts the day's injury report, rosters and depth charts (about 14:20 UTC) and before
Thursday, Sunday and Monday nights' locks. Never on the hour. GitHub fires this repo's crons about 2 to 9.4 hours late.
`python3 test_lock_runs.py` (offline, seconds; it replaces `test_pull_schedule.py`, deleted with the paid pull) reads
props.yml's crons and holds them to every set's lock of the season's schedule (games.csv in `props/raw`, else the
payload's, and the same season with week 18 flexed to Saturday games and a Sunday night game): some run sure to land
before the lock even 9.4 hours late, the latest such run reading no more than 12 hours before it even landing at its
earliest, with that run dropped the one before it landing in time and reading no more than 24 hours before it, and no cron
on the hour; it prints the worst gap of each kind of lock, fails 24 Sunday-slot locks with `--drop "47 4 * * 0"`, and a
change to the crons comes with a run of it. DraftKings' moneylines, spreads and totals from a read are put on the schedule
only while under a day old (`ESPN_STALE`, as the bake's rule for a pull's), and a game kicking off within 48 hours
(`ESPN_SOON`) whose player lines no run has read for 24 (its game lines never stand in for them) is a problem: the run
publishes the last read and goes red after its commit. A visitor's Refresh odds press (below) puts DraftKings' current
lines, read from ESPN in that browser, over the published read in that browser alone. It commits straight to `main`
(`props/data`; `props/raw/espn/` is never committed), and the touchdown shadow's ledger in a second commit of its own.
Its `timeout-minutes` is 90, and every step has a cap of its own (since the review of 31 October 2026): the publish's
steps add to 45 (checkout 2, setup-python 1, pip 3, setup-node 1, npm ci 2, `weekly.py` 32, the commit 3, the
props-refused issue's close 1), the touchdown shadow's to 39 and the two last steps to 3, with 3 minutes for GitHub's
own; a `weekly.py` that stalls past its 32 fails its step and refuses the run (the props-refused issue then opens, its
note saying `weekly.py` wrote no problems file), as the job's 45 did before, and `test_props_gate.py` holds every cap
and both sums.
A refused run (`weekly.py` exit 1) opens an issue labelled `props-refused`, or comments on the open one, with
`props/build/refused_note.py`'s text: the problems file, the published payload's bake time and its ESPN read's, the next
game still to come with its kickoff in ET and the hours left, the run's link, and what to do (merge a fix, then `gh
workflow run props.yml`, which spends nothing); the next clean publish closes it with its time. Both steps are
continue-on-error and never stand in for the red run.
Until 20 October 2026 the schedule was the paid pull's: four price pulls a week (Mon, Wed and Thu 08:17 UTC and Sat 05:17,
~7 odds-API credits a game, the Sunday slate priced on Saturday morning and about a day old by kickoff), each pricing every
game kicking off before the next slot plus 10 hours and not priced in the last twelve, the eleven `7 ` crons catch-ups
(`weekly.py --catch-up`) for a dropped pull, held by `test_pull_schedule.py` to `PULL_SLOTS`; a refused run's bought prices
were kept by the workflow and its issue listed them (`priced_at.json` against the published `baked_at`). The paid pull
files (`prices_wk*.csv`, `wk*_lines.csv`, `gamelines_wk*.csv`, `dk_links_wk*.json`, `priced_at.json`, `pricepull.json`,
`credits.json`) stay, history the bake still reads (the Track Record graded market + form on weeks 1-6's real prices until app v138 took its table off: **DraftKings' chance on every leg**), and
the hidden Weekly Update tab's credit panel (`renderPricePull`, audit N) shows the last pull, frozen.

Sunday's early games, every Sunday kickoff before 4pm Eastern (the 1pm window, London and the other
games abroad), were never bought player prices from 13 October 2026 (the owner's call: he bets props on the
afternoon and night games) until the paid pull ended on 20 October 2026: `oddsfetch.py`'s `early_sunday()` skips them in
`choose()`, in every mode, unless `--early` is passed by hand, which still holds for a pull run by hand. With no player
ids either, their player legs were never suggested, not even priced by a Refresh odds press, while their team legs
were, and the page said so wherever it said when player prices are pulled (app v103, `patch_early_sunday.py`;
`test_pull_schedule.py`'s (e) held that no early game was ever bought). Since app v125 every game, Sunday's early ones
among them, gets DraftKings' lines from ESPN alike (the props job's read on every run, and a visitor's press), its player
legs priced at the page's estimate and suggested by the same rules as any other's, and no word on the page treats an
early game apart (`dkEarlySunday` stays in `part3.js`, dormant: only the id rule's branch read it, and its words are gone).

A pull (one run by hand since 20 October 2026: no job runs `oddsfetch.py`) also keeps DraftKings' own id (sid) for each outcome it reads, free on the same calls
(`includeSids`), in `props/data/dk_links_wk{W}.json`, keyed by the book's names
(`game|player|stat|Over/Under/Yes|point`, `game|game|ml/spread/total|side|point`, `game|event`); a game
priced again replaces its entries. The bake (`dk_ids` in `weekly.py`) turns them into the payload's `dk`,
for the games still to come only, keyed the way the page names a leg, under the week and the game:
`<pid>|<stat>|over|<point>` (and `under`: a player's line at DraftKings' point), `<pid>|any_td` (the
book's Yes), `team:<ABBR>|ml`, `team:<ABBR>|ats|<the team's own line>`, `game|total|over|<point>` (and
`under`) and `event`, each point written as the page writes a number (`dk_point`: 79.5, 80, -3), and
when they were read: `at`, the game's player prices (`priced_at.json`), and `glat`, its game lines
(`gamelines_wk{W}.csv`'s `pulled_at`). An id names one outcome at one number, and a Sunday game's player
ids are read once, on Saturday, so they can be a day and more old by kickoff: the card dates what it
opens. A player
is placed by the rule his prices are (`pool.match`, within the game); a name it cannot place, a team
defence's touchdown and a key two book names would give two ids are left out. Only ids and the read
times: the parlay card builds the links, and since app v109 a suggestion takes only a leg with one (next). `python3 test_dk_links.py` holds it to the real week-5 file and to its cases; at a
rollover last season's file goes to `data/archive/` with its week's price files. With no pull since 20 October 2026 the
bake writes `PAY.dk` `{}` for the games to come; the ids a read of ESPN gives (DraftKings' event and game-line ids,
never a player's) go into it as entries a read made, which never count as carrying the pull's ids (**Reversed in app
v125**, below), and a player's id on the slip comes only from Pull from DraftKings on the admin's parlay card, in that
page's memory, never in `PAY.dk`.

**Every suggested leg on DraftKings' slip** (app v109, `patch_dk_slip.py`, the owner's call of 16 October
2026; history since app v125, when the paid pull ended: the rule is in the code still, judged by an entry's content and
dormant on every payload the job now bakes, **Reversed in app v125** below). He built a parlay, pressed Finish parlay, and Open in DraftKings put only its first leg on
DraftKings' betslip. The link was right (the betslip reads every id in `?outcomes=`); the other legs had
no DraftKings id, which comes only with a price the job bought: a Sunday afternoon or night game's player
ids with the Saturday pull, a Sunday early game's never, and a leg priced by Refresh odds never, since
ESPN carries no outcome id for a player's line (a press does bring DraftKings' current game-line ids).
DraftKings' own odds feed answers neither other sites nor cloud or GitHub runners (tested), so there is
no free source of ids, and he wanted every leg on the slip, never "add by hand" where it can be helped,
no credit spent, and best-guess prices allowed. So one rule, in the props parts: `dkIdOf(l)` is
DraftKings' id for a leg at its own line from `PAY.dk`, by the keys above and the card's rung rule (a
moneyline exact; a spread `team:<ABBR>|ats|<line>`; the total `game|total|<side>|<line>`; the anytime
touchdown for one touchdown only; a player's main line `<pid>|<stat>|<side>|<line>`; a rung k+ as Over
k-0.5, else the whole Over k-1), null once its game has kicked off; `dkCarries(l)` says whether the
payload has ids for the leg's game (`PAY.dk`, with an entry for that game in its week; the one a press
makes on a payload baked before them, to hold the game-line ids it read, is marked, `dkPressMade`, and
does not count). A game with no entry is taken as a payload without ids is: `weekly.py` bakes `PAY.dk`
`{}` from Monday night's final until the next week's first pull, and judged on the payload as a whole that
emptied every level, hand and Elo pick from Tuesday to Thursday. Where it does, a leg qualifies for
the levels (`pbPool`: the preferred, thin and totals lists; since app v111 each prime-time game's set on
Suggested Parlays and, uncapped, the legs the Parlay Builder's Top 30 lines are ranked from, which since app v115 keep
a player's line read by Refresh odds with none: **The Top lines keep a line DraftKings moved**, below), a game page's hands (`gameLegPool`,
drawn nowhere since app v124) and the Elo picks only with an id; every other rule (the band, the edge, market + form,
the far-off guard, which counts its legs first) is as it was, and a payload baked before `dk` suggests as
before. So after a press a `dkline` player leg is no longer suggested (since app v115 the Top lines list it, marked,
and no parlay takes it), and a team leg the press
re-priced is (the press gave its current id). A game counts as having player prices only where one of
its player legs has an id: with player bets ticked, prices on file and none with an id, the Top 30
lines' empty line (an empty tier's until app v111) says "No player legs DraftKings' betslip can take yet" and
why (`PB_NO_ID`, with when they are pulled, `PB_PULLED`, Sunday's early games never), and a set's empty level
says the same of its game with when its player prices come (`spWhy`); a list or a level short of legs says
they are legs "DraftKings' betslip can take", and the Parlay Builder's notes say how many lines the list left
out for want of one (since app v115 only those it still leaves out, below), apart: those DraftKings had only at another number (`moved`, `dkAtAnother`: a spread at
nflverse's number where DraftKings' is another, say, which the card would put on at DraftKings' number, and
Refresh odds reads DraftKings' current spreads and totals, which the list and the sets can take) and those it
had none for (`noId` less `moved`, with why and when player ids come), still on the game pages to add to the
builder. Until app v124 took the hands off the game's page, a game page's hand
left empty for want of ids said so and why (`gameNoIdWhy`, gone with them: its player ids not pulled yet, never for
Sunday's early games, `dkEarlySunday`, or none for its other lines), never that the game had too few
lines; the hands' engine still counts the legs it left out for want of one (`noId`). The suggestions record
takes each set from the page's own `spSet` (the all-games panel from `getPbTiers` until app v111), so it follows.
The parlay card converts a leg rather than leave it off,
and the builder says so first (under "Bets and Stats: the loop", the parlay card); since 19 October 2026 it checks
DraftKings' current lines for its own games as it opens, putting a moved total or spread on at DraftKings' current number
and leaving off, said so, a player's line DraftKings has moved since the pull read its id (the moved rule, there). The audit works the
rule on its own (`dkIdAud`, `dkOk`, never the page's `dkIdOf`): M9 on made-up games with ids for some legs
and decoys under the keys a wrong rule would read (the pool less the legs with no id, the counts it says,
those at another number by the audit's own `dkElseAud` and those with none, the levels the legs with an id
alone build, a game with no entry and an empty table taken as before ids, no player id at all and its
reason, and no ids carried suggesting as before); M, M4 and M7 run on a made-up id table giving every priced line its id (as the
pull reads one with each price), so their rules still meet player legs and totals; M (the levels, and since
app v111 the Top lines and the sets), M7 and O (a game's hands, on the engine alone since app v124) hold every leg a level, a list or a hand may
take or holds to an id (the Top lines, since app v115, but for the read's lines they keep, below); M8 a press's read
suggested nowhere where ids are carried (since app v115 but on the Top lines) and as before where they are
not. The nflbets smoke holds the same on the page (the Top 30 lines, the sets, a game's hands, since app v124 on the
engine alone and its count of the legs left out for want of an id where it read their empty hands' words until then,
and the Elo picks), its checks of the Parlay Builder's notes reading that panel alone, never the
Elo picks' own words on DraftKings' betslip (the Elo picks are on Suggested Parlays since app v111).

**Only the bets DraftKings offers** (app v113, `patch_declutter_top50.py`, the owner's call of 17 October 2026: "there
are certain bets in the props that are not part of draft kings like for FG attempts. i only want to show legs that draft
kings does."). The page knows which player markets DraftKings posts from its own reader of DraftKings' lines on ESPN
(`ESPN_MAIN`, `ESPN_MILE` and the anytime touchdown: passing yards, completions, attempts, passing touchdowns,
interceptions, carries, rushing yards, receptions, receiving yards, rush + rec yards, kicking points and field goals
made, under "Refresh odds" below), and of the stats it projects, FG attempts was the one offered as a bet outside them
(targets never was). So FG attempts joins targets in `NO_BET` (`part2.js`): still projected, since a kicker's field
goals made and kicking points stand on it, and never drawn as a line on a game's page or offered to the builder, a set,
a game page's hands, the Top 30 lines or the Elo picks. A visitor's builder is kept in the browser (`S.parlay`), so an
FG attempts leg added before app v113 leaves it on the next draw (`renderParlay`), as a started game's leg does, with a
line saying so ("1 leg was removed: DraftKings does not offer FG attempts.", `data-pb-notdk`), and `toggleLeg` never
adds one by any path. The audit's M13 holds it on its own copy of what DraftKings posts, never the page's `NO_BET`
(`DK_PLAYER_AUD`, the reader's twelve player markets and the anytime touchdown; `DK_GAME_AUD`, the moneyline, spread
and total; `NOT_DK_AUD`, targets and FG attempts, projected and never offered): every stat the page projects is in one
or the other, and the reader's markets are the copy's, so a market added on either side is said; on the week as it
stands, every game played or to come, no line its page draws (every player opened; the ladders shown too until app v127,
when a game's page stopped drawing them: **No ladder bets**), no leg
`pricedLegs` gives, none a game page's hands may take or hold, none on the Top 30, a set or the all-games levels and
none in the builder is on a bet outside the copy; and on a made-up Monday night game of two made-up kickers (on the
schedule for the run, every stand-in put back on every path, so it holds in any week and the off-season), each with FG
attempts and field goals made priced as a Value pick with DraftKings' ids, field goals made reaches his game page,
`pricedLegs`, the hands' pool, the Top 30, the set and, by the page's own boxes and Adds, the builder (so the case can
tell), and FG attempts none of them; blocking. The nflbets smoke holds the same on its own copy (`NO_BET_OWN`): on the
week as it stands, every game's page with every player open and every list, hand, set, Elo pick and the builder, no
box, heading, tile or leg of targets or FG attempts; on a made-up Sunday night game between two clubs of the schedule
whose kicker the page projects, FG attempts still projected, DraftKings' main line and two ladder prices planted on it
with made-up ids, still no line, leg or suggestion of it anywhere, and every line the page draws for the kickers put in
the builder by its own box, none of them FG attempts (since app v127, when a game's page stopped drawing ladders, those
are main lines: each kicker's field goals made and kicking points are given one too, both sides with made-up ids); and an
FG attempts leg kept in the builder from before removed
with that one line, `toggleLeg` adding none.

**The Top lines keep a line DraftKings moved** (app v115, `patch_top50_moved.py`, the owner's call of 18 October 2026:
"any idea why the player props are not showing up in the top 50 anymore? :/"). On a fresh load the Parlay Builder's Top
50 held 43 player lines of 50. A Refresh odds press reads DraftKings' current player lines from ESPN, and by Sunday
morning most had moved since the paid pull read them on Saturday morning; a line the read has at another number is
priced there by the formula (src `dkline`, est.), and ESPN gives no DraftKings id for a player's line, so since app
v109 (**Every suggested leg on DraftKings' slip**, above) the list left every such line out wherever the payload
carries ids. Simulated on that morning's payload with every priced main line moved by half a point, the list went from
50 rows with 43 player lines to 40 rows with 7, and the press is kept in the browser (`props_press_v1`) until a newer
publish, so a reload did not bring them back. So the Top lines alone (`pbTopBuild`, through `pbLegs(games,u,{read:true})`)
keep a player leg priced from DraftKings' line read by Refresh odds on a tested kind (a main line over or under on
passing, rushing or receiving yards, receptions or passing touchdowns, the anytime touchdown, a yards rung DraftKings
lists; `pricedLegs` gives no other) even where the payload carries ids and the leg has none at its own number. It
qualifies by every other rule as before (the band, the 3-point edge and market + form for a Value pick, the far-off
guard on its estimated fair chance, V6, each bet once, the totals last) and ranks with the rest. Everything that builds
a parlay stays slip-only, unchanged: Suggested Parlays' sets, the all-games levels (`getPbTiers`, `pbPool`), a game
page's hands (`gameLegPool`) and the Elo picks take only a leg with DraftKings' id at its own line. The notes do not
grow: the count "left out: DraftKings had them only at another number" counts only what is still left out (a line with
a real price whose id is at another number, a spread or total at nflverse's number), and `getPbTop()`'s `kept` counts
the rows kept without an id, drawn nowhere. Such a row is marked est. (as before) and carries one quiet line under its
game (`pbTopSlip`, `small.pb-tslip[data-pb-slip]`): "Moved since DraftKings’ prices were pulled" (`data-pb-slip="moved"`)
where the pull read that main line of his at another number (`PAY.mkt`), else "No DraftKings id at this line" (`none`: a
touchdown, a rung, a main line the pull had no price for), then on the hub what the parlay card's plan for the leg
(`dkPlan`, through `dkSlipRows`, as the builder's rows read it) does on DraftKings' slip: ": the slip link has the old
line, 224.5" (the card puts on the id the pull read at the old number), ": the slip link has Over 224.5 passing yards
instead" (a line it converts) or ": add it on DraftKings by hand" (no id); on the prop model's own page, which has no
card, the cause alone. The audit works it out on its own (`readTopAud`, `dkTopOk`, `slipAud`, with `SLIP_AUD` for the
prop page's words; `qualAud`'s top mode; `holdTop` holding each row's line, blocking, and its words, `W.wording`; M8
after its press), and M14 on a made-up Monday night game of two made-up clubs and four made-up players on which a press
moves the quarterback's passing yards, a receiver's receiving yards and a back's rushing yards (tested kinds) and the
quarterback's completions (untested), leaves a second receiver's receptions where the pull had them and reads his
receiving yards alone: before the press and after one that moves nothing, the pull's lines alone with their ids; after
it, every moved tested line on the list at the read's number at the rule's price, marked moved, one the pull had no
price for marked none, no completions line, the unmoved receptions at the pull's price with its id and no line; nothing
from the read with no id in a level, the set, a hand's pool or a hand; the counts the audit's own; and with no ids
carried the read's legs listed as before with no line; blocking, on made-up data. The nflbets smoke, which has no
warnings, holds it with `qualOwn`'s read option (the Top lines only) and `slipOwn` in `holdTop` (every row's line, its
kind worked out on its own from `PAY.mkt` and the ids, its words from the card's own plan), and in its Refresh odds
section, on a payload baked with ids: the Top lines after the press keeping the read's legs with no id, each with its
line, while no level, set or Elo pick holds one; a plant of the pull at another number on one of the read's main lines
marked moved with "the slip link has the old line", the old number offered nowhere; without the parlay card the cause
alone; and both kinds met (`SLIP_SEEN`).

**Reversed in app v119: the Top lines take only lines with an id** (`patch_top_id_only.py`, the owner's call of 19
October 2026: "why am i still seeing No DraftKings id at this line. i dont want to include those in the parlay builder,
only ones i can add via id"). The paragraph above is history: `pbTopBuild` calls `pbLegs(games,u)` with no read option
(the option, its `kept` count and `pbTopSlip`'s line are gone), so wherever the payload carries ids the Top 30 lines
take a line only with DraftKings' id at its own number, as every set, level, hand and Elo pick does, and a line a press
found moved is counted with the others left out for want of an id. On a payload baked before ids the read's lines are
listed as always. The audit (`dkTopOk` is `dkOk`; M14 now holds the moved lines left out) and the nflbets smoke
(`holdTop` fails any row carrying `data-pb-slip`) hold it.

**Reversed in app v125: DraftKings' lines from ESPN for everyone** (`patch_espn_only.py`, whose docstring is the design,
the owner's calls of 20 October 2026: "i want all of everything i see to be the espn estimates, and only have an option
to click on the pull from Draft Kings button available for me to run to pull all the current stuff", then, of X's two
tabs, "okay maybe we can do that and move X Parlays and X Bet Log in there for my eyes only", and "Hide only, build it").
The props job buys no price on any schedule (above) and reads DraftKings' lines from ESPN itself on every run, publishing
the read with the payload (**The published read**, under "Refresh odds" below): every visitor sees DraftKings' game lines
at DraftKings' own prices from ESPN's scoreboard, and a player's line at the page's estimate of DraftKings' price (src
`dkline`, marked est.: `DK_EST` and `estPrice`). The id rule of **Every suggested leg on DraftKings' slip** stays in the
code, judged by an entry's content: a `PAY.dk` game entry carries the pull's ids only where it has the paid pull's time
(`at`) or a player's key (any key but `event`, `glat`, `at`, `team:...` and `game|...`; `dkEntryCarries`, the parlay card's
`dkHasPlayer` rule), and `dkCarries(l)` is that rule on the leg's game (`DK_PRESS_MADE` still marks a whole table a press
made). An entry a read makes (the published read's, a press's, the card's check's) holds only `event`, `glat` and team and
game-line ids, so it never carries, and since the rule reads content it survives a JSON copy: the audit
(`dkEntryCarriesAud`, `dkEntryAud`, never the page's),
the nflbets smoke (`dkOwnId`, `dkTakes`) and `elo/check_tab.js` (F1, the page's own `dkEntryCarries` set beside the tab)
apply it to the live table. That fixed a live bug: from app v109 a press over the bake's `dk:{}` wrote an entry for its
game, which then counted as carrying ids, and every player leg of that game left every level, hand and Elo pick (the
record reader's probe saw a full set go to four empty levels and four empty Elo picks). With the bake's `PAY.dk` `{}` no
entry carries, so a `dkline` leg of a tested kind (`ESPN_TESTED`: a main line over or under on passing, rushing or
receiving yards, receptions or passing touchdowns, the anytime touchdown (since app v138 not one priced on the model alone:
**A touchdown on the model alone is no tested kind**, under Props), and a yards rung DraftKings lists until app v127
offered no rung: **No ladder bets**, under "The published read") is suggested
again everywhere, as on a payload baked before `dk`: each night game's and the Sunday slot's set and their Elo picks, the
all-games levels, the game hands' engine (drawn nowhere since app v124) and the Top 30 lines, by every other rule as before (the band, the 3-point edge,
market + form, the far-off guard on the formula's own fair chance, V6). The accepted consequence, said here and to the
owner: **the suggestions record from week 7 on is graded at the page's estimated prices** on DraftKings' lines read from
ESPN (a level's fair chance the formula's, `fair_est`), not at prices DraftKings quoted, so it measures the model against
an estimate of the book; weeks 1 to 6 and the backtest stand on the paid pull's real prices. ESPN gives no DraftKings id
for a player's line, so **a visitor's Open in DraftKings carries only team legs and totals** (their ids come with the
read), and the card says once that player legs go on DraftKings by hand; on the site owner's devices the parlay card's
**Pull from DraftKings** buys that one parlay's player markets for DraftKings' real prices and slip ids (under "Bets and
Stats: the loop"). The words carry no paid-pull timing: `PB_NO_PL`, `PB_PULLED` and `spPulled` are gone; `pbNoPl(ids)`
and `spNoPl(u)` (in `spWhy` and `spWhySlot`) say "no player lines yet: DraftKings had posted none for it when its lines
were last read from ESPN (Tue 8:07 AM ET)." ("for these games", "for its games" of the slot) or that DraftKings' lines
"have not been read from ESPN yet", and `spEloSet`'s empty Elo level "No player lines in this game yet: ..." the same,
dated by `espnLastRead` (the latest read, published or pressed, that found lines or none); the dormant rule's `PB_NO_ID` says "a player’s line read from ESPN carries no
DraftKings id"; `dkSlipLine` reads "Not on DraftKings’ slip: " (no "yet"); `lineSource` (part2) "DraftKings’, read from
ESPN <time>" for the published read's lines, "... read from ESPN by Refresh odds <time>" for a press's and "DraftKings,
pulled <time>" for a pull by hand's; `estTitle` gives a locked leg no read time. A locked set's leg keeps its locked
price and fair chance through any later publish or press (`spLegIn`'s `kept:{fair, est}`, read first by `legPrice` and
`legFair`), so Add to builder pays what the locked card says even where a later read moved its line, the record's shape
untouched (no read time on a locked leg, which would rewrite every unlocked entry on every run). And the pull hooks, inert
without the card: `parlayLegs` puts what `window.dkPulledFor(leg)` returns on its own fresh copy of each leg (`l.pulled`,
never on `S.parlay`), `legPrice` prices a pulled leg at its pulled price (`'real'`), and `legFair` takes its pulled fair
chance. The audit holds it in M17 (below), in M8 (its press cases run with the published read taken out, `unbake`, and put
back after, `rebake`, as every section that plants on real games does), M3, M7 and M14 on the content rule, and blocking on
made-up data the dk:{} case (after a press, and after the published read, over `dk:{}`, a game's `dkline` player legs stay
in every pool: sets, levels, hands, Top 30, Elo picks); `elo/check_tab.js` F1 a candidate from DraftKings' line on a game
whose entry a read made (and a JSON copy of it) kept, and dropped where the entry carries the pull's `at`;
`test_suggest_ledger.js` on a read of its own (below); and the nflbets smoke on its own copies.

Once the audit is clean, `weekly.py` runs the **suggestions record**, `node suggest_ledger.js` (the third change
after the review of Sunday 11 October 2026, the owner's call; since app v111 the record of Suggested Parlays, the
owner's call of 16 October 2026: "do similar tracking/grading as ELO tracking"): each prime-time game's four levels
(under "Bets and Stats: the loop", Suggested Parlays), every prime-time game's to come whether or not the tab shows it
yet (since app v112 the tab sets out one night at a time, `spOn`; the record reads `spGames`, which the night rule
does not touch, so Monday night's set is the job's from its first run, the tab's from Monday morning, and the same set
either way), taken from the published page itself (`index.html` at the site's root, `nflbets/index.html` until 17 October
2026, booted in jsdom on the payload just baked, with `elo/data` beside it, since the Elo picks stand on it (and
until app v138 market + form decided which player legs qualify), and the window's clock held at the run's time, so a boot of a few seconds cannot carry it past a lock or a
kickoff) by the page's own `spGames`, `spSet` and `spTierOut`, into the `prime` map of
`props/data/suggest_ledger.json`, which the workflow commits with the rest of `props/data`. An entry is keyed
`season|WW|kickoff|game id` (`2026|06|2026-10-19T00:20:00Z|2026_06_DAL_GB`),
`{season, week, gid, away, home, kickoff, lock, baked_at, pool, tiers, taken_at}`, with `grade` once its game has
kicked off and `updates` once a level has been replaced; each level keeps its legs, its model chance, fair chance
and decimal price, or why it is empty. A set locks 2 hours before its kickoff (the page's `spLockAt`; a page that
locks at another time is refused): while the lock is to come a run rewrites the entry whenever the set has changed
(prices pulled, a player ruled out), and from the first run at or after the lock it is locked, holding the version
the last run before the lock wrote. GitHub starts this repo's runs 2 to 9 hours late and not every hour, so that is
the last publish before the lock, which may be many hours before it, never a run at the lock itself; a game no run
reached before its lock has no entry (the page then builds its own set once and keeps it in the visitor's browser:
under "Bets and Stats: the loop"), and an entry not yet locked whose game is no longer a prime-time game to come
(flexed, moved) is dropped. One change is allowed after the lock, on any run before kickoff (the owner's call of 16
October 2026, "Replace that level only"): a level holding a player the page's own rules now keep out of every
suggestion (`spOutWhy`, the rule `pricedLegs` and V6 obey: Out or Doubtful on the latest report, inactive, held out
until cleared, questionable) is built again from the data at hand by the page's `spRebuild`, that level alone, and
carries `updated` {pid, name, reason, at}, the same written into the entry's `updates` beside the level's id; the
other levels stay as locked, and from kickoff nothing changes but the grade. The file's `entries` map is the Parlay
Builder's retired all-games panel, 12 to 16 October 2026: its four levels on the default choices, keyed
`season|week|kickoff wave` (the earliest kickoff still to come at the run), rewritten while that kickoff was to come
and frozen from it. No wave is taken any more: an entry not yet frozen is dropped (the first run of app v111 drops
week 6's Sunday wave), and the frozen ones stay as they were to the byte but for their grades, still graded and
summed in `summary`, and drawn nowhere. A frozen entry of either kind is graded by the app's own `settleLeg` once
every leg has settled, as a book settles it: a leg lost loses; a push or void drops out and the rest are paid at
`parlayDec` on the legs left; every leg a push or void is a push, the stake back; pending while a game or its stats
are out; a grade once made is replaced only by a complete one; only the page's own season is graded (the app's
actuals are this season's, keyed by week, so last season's week 5 would read this one's); a prime-time level
replaced after the lock is graded as replaced. A player with no stat line is graded as the page grades him (**who
played**, below). `prime_summary` gives per level the parlays graded won or lost, won, the wins expected by the fair
chance and by the model's, and the units on $1, each season's game and level once, from the last key that holds it
(a kickoff the league moved makes a new key), as the tab's record counts it (`spRecSum`, whose one record since app v129
adds the `slot` map's and the backtest's to it); `summary` gives the old
entries' the same way, each parlay once: an entry was the whole week's panel, so a parlay unchanged across waves is
frozen into each, and the same legs (in any order) of the same level in a season's week are counted from the last
entry that holds them (`repeats` says how many that set aside). Its guard holds the new ledger to the file the run
started from and to the last commit's: an old entry frozen and gone or changed in anything but its grade, or one
taken at or after its kickoff; a prime-time entry not keyed on its own season, week, kickoff and game, not kicking
off on a Thursday, Sunday or Monday at or after 7 pm Eastern (worked out with `Intl` on its own, never the page's
`spPrime`), not locking exactly 2 hours before it, taken at or after its lock, holding a leg of another game or a
level short of its legs, or, once locked, gone or changed in anything but its grade and the replacement the rule
allows (recorded in `updates`, which only grows, made from the lock to kickoff by this run for a player the level
held and does not hold now, the level's `updated` the last one recorded for it); an entry new or changed and not
this run's; a grade that does not follow its legs; a summary that does not follow from the entries: refused, the
file put back (the last commit's where the copy on disk had moved), exit 1. It never refuses the run or turns it
red: `weekly.py` logs the refusal in its report and publishes the payload. It spends no credit.
Since app v125 the sets stand on the props job's own read of DraftKings' lines on ESPN, which the payload carries and the
page installs at boot (**The published read**, below), so their player legs are `dkline` legs at the page's estimated
prices and the record from week 7 on is graded at them (**Reversed in app v125**, above); and the script refuses the
ledger, the file left as it was, where the payload carries a well-formed block of player lines for a game still to come,
read before its kickoff, and the page applied none of them (`espnGame` null for every one: the job and the page shipped out
of order would record sets of team legs only), or where the page asked ESPN's player lines (`sports.core.api.espn.com`)
on load (the record stands on the payload alone; the scoreboard on `site.api`, which the page reads on load only where a
game of the Props tab's week is under way with no score, `scoresOnLoad`, and the Matchups board read on every load until
22 October 2026, gets its 404 as ever).
Since app v118 (under "Bets and Stats: the loop", **Two sections, the Sunday slot and each set's own Elo picks**) every
entry it takes carries the set's Elo picks too (`elo`, the four `elo-<level>`s by the page's `spEloSet`, each leg with its
Elo chance `pe` and its `thin` and `market` null), taken, locked, replaced and graded with the model's levels, their grades
beside them in `grade`, and `prime_summary` and `slot_summary` carry the Elo picks' own (`elo`); and the `slot` map
(`slot_since`, `slot_summary`) holds each week's Sunday slot (`spSlotNext`, the week's own while none of its games has
kicked off), keyed `season|WW|first kickoff|<season>_<WW>_SUN`, with its `games` and `last` kickoff, by the same rules from
its lock, 2 hours before its first kickoff. The guard holds a slot entry to its own id, a Sunday before 7 pm Eastern
(`slotTime`, through `Intl`), games of its own season and week and legs on them, and the Elo picks to the four ids, their
legs' Elo chances and, once locked, no Elo picks added or changed but by a replacement. An entry taken before app v118 has
no `elo`. `ready()` waits for the ELO tab's files (`eloFiles()`, the matchups read after the ratings), and a set the page
could not build Elo picks for is taken without them and said. The record's weeks before it took them are
`props/data/suggest_backtest.json` (**The backtest**, under "Bets and Stats: the loop"), which this script neither reads
nor writes.
`node test_suggest_ledger.js` (about a minute) runs it on made-up weeks cut from the payload, the prime-time games
it stands on moved where each stage needs them (a week of too few games for them, the divisional round on and the
off-season, gets the rest made up between clubs of the test's own; `SL_TEST_PAYLOAD=<file>` runs it on another
payload), and which kickoffs are prime time worked out on its own (`primeAt`):
a set taken for every prime-time game and none for any other, the old panel taking nothing, rewritten before the
lock (and by a run a second before it), unchanged and not written, locked at and after it with the last version
before it whatever the page would build then, a run hours late, a game moved to a prime-time kickoff whose lock had
passed given none, one moved off prime time dropped, a ruled-out player's level built again and that level only (and
the same again writing nothing), nothing but the grade after kickoff, graded against planted wins, losses, voids and
pushes worked out from the raw rows, the payload's snaps (planted) and the injury report (a player who played with
no stat line on zero; one his club's snaps leave out, void; one Out with no snap counts yet, void; neither,
pending), a grade kept that a payload can no longer settle, last season's entries never regraded on this season's
rows, an old parlay two waves froze counted once and a game's level two kickoffs hold counted once, no game to come,
and the guard end to end, on hand-made ledgers (every rule above) and on a copy of the real ledger; since app v118 the
week's Sunday slot (worked out on its own, `slotAt`) taken, following the schedule's moves, locked and graded, every set's
Elo picks held to their rules, the Elo picks' and the slot's summaries worked out from the grades, the next week's slot
taken, hand-made slot entries and Elo picks refused for every rule, and the real backtest held to `suggest_backtest.js
--check`'s rules; and since app v125, on the week with its paid prices, lines and ids taken out and a read of DraftKings'
lines of the test's own put in `PAY.espn` (each club's charted players on tested stats, the touchdown list and yards
rungs, dated before each stage's clock and each moved kickoff): every set's player legs priced from the read (`dkline`,
the fair chance est., never under the price, a level holding one saying its fair chance is estimated), the Elo picks'
legs from it too, a read dated at a game's kickoff giving it no player leg, a junk or missing read team legs only with
no throw, a moved line rewriting a live set before its lock (a main line on the read's moved number) and leaving a locked
one as it was, a level built again on the read at hand, a level of `dkline` legs with a void paid at its stored estimated
prices, and a page that drops a well-formed read (its `espnPublished` stood in) refused with the file untouched; and since
app v127 (**No ladder bets**, below) every leg of every set and its Elo picks, night and slot, a game bet, a main line or
the one touchdown (`offeredOwn`, the test's own reading), though the read carries yards milestones, and the level built
again the same. Where the week's own data puts the moved prime-time game on the last prime night (week 7's, moved to the
Monday), C holds the slot past its first kickoff as B left it but for a grade of every level pending, and F's uncommitted
rewrite of a set still to lock is tried on B's ledger an hour after B. A change
to the script comes with a run of it.

**Who played** (app v101, after the review of Sunday 11 October 2026: Tory Horton, SEA, ran 11 offensive
snaps in week 5 with no target, DraftKings graded his receptions over 1.5 a loss, and the page showed it
void). nflverse writes a player's week only when he has a stat, so no row is not "did not play".
`weekly.py` fetches nflverse's snap counts (`raw/snap_counts_<season>.csv`, PFR's, never required) with
the other files, and the bake (`who_played`) places each row on a player by its PFR id through the
roster file, else by its name within its game (`names.Pool`, the price rows' rule) when that player is
on the row's club (nflverse's `players.csv` placed nothing those two miss on 2026 weeks 1-5 and is not
read). It writes the payload's `snaps`, `snaps[week][game][club]` = the players the page projects who
took a snap of any kind and have no stat line, a club for every game whose snap counts and stats are
both in (a club with a skill-position row no player takes is left out, and the name logged), and a row
of zeros in `stats` (every column, `from_snaps: 1`) for each who took a snap in his role (on offence; a
kicker on special teams), so the projections (`applyGame`) and the Track Record see the game: about 15%
of receiver games and 37% of tight-end games at 15-35% of snaps had no row. `settleLeg` (with
`tookPart` and `reportedOut` in `part2.js`), for a player with no stat line once his game's stats are
in: a snap, graded on zero (an over and a rung lose, an under wins); his club's snaps in without him,
void; no snap counts for his club yet, void if that week's report had him Out, otherwise it waits. The
page, the Track Record and the suggestions record all grade this way, from the payload alone; ESPN's
game summary, which the live tracking reads, lists only players with a stat and was not used. A run with
no snap counts carries the published payload's (`carry_snaps`), and a club whose stats are in with no
snap counts 72 hours after kickoff turns the run red after its commit (`snaps_overdue`). The audit's V9
plants snap counts and holds every branch; V15 holds the payload's snaps and rows of zeros to each other
and the page, and with `PROPS_AUDIT_RAW` to `raw/snap_counts` and `raw/pw`. `python3
test_who_played.py` holds the bake to its cases (PFR id, name, special teams only, a kicker, a player
traded since, a name no player takes, the carry and the overdue rule, `weekly.bake` end to end). Never
tune the model on the 2026 results these rows add.

**Who starts** (app v104, `patch_who_starts.py`, after the job failures of 13 October 2026). The payload
carries every player the depth chart lists at a position the page projects who is on a roster (ACT,
DEV or INA), not only those with a row last season (`payload.py`): a backup who has not played since
(Stidham DEN, Richardson IND, Kyle Allen BUF, Sam Howell DAL, Uiagalelei LAC, Klubnik NYJ), a veteran
who did not play last season or whose few snaps fell under `keep()`'s bar (Stidham's one game,
Richardson's two), a rookie, each with `gp` and `cn` 0 and no numbers, so his games this season
count as a rookie's always have; and a player last season's table has whom the roster lists INA is
carried too. Every club's QB2 is on the page; before, seven clubs started nobody with QB1 out. A
player with no game the model counts last season or this (`noHistory`; the page says it so, never "no
games"), or one the chart moves up whose games give the
model no workload (`nothingToProject`: Stetson Bennett, LA, one relief appearance), has nothing to
project from: no lines, so no price, headline, game hand, suggested parlay or Elo pick; he is shown in
his place (a starter's slot on the chart, or one the chart moves him up to), marked thin history, with a
line saying there is nothing to bet on, and the next man down is never shown as the starter in his
stead. So does a charted starter with a game or two (a rookie QB1 after his first start: counted in the
chart's order, he was cut with his QB2 behind him and the club showed no quarterback), marked thin
history; `pricedLegs` takes nobody under three games and a game page's hands only one the chart moved
up (`gameLegPool`), so nothing new is suggested. Before a club files its
statuses, a player the roster has inactive for its last game (the payload's `ina`: status INA, or an
ACT row with nflverse's inactive code I01 or I02, as Caleb Williams's week 6 row reads) who was on that
game's report in any status is held out until this week's report clears him (he practises, or the club
files a report he is not on), as an Out is: the Elo build's WHO PLAYS rule (Caleb Williams, Questionable
and then inactive in week 5, started for Chicago from Tuesday; Bagent now does). One the report never
named, or with a stat line in that game, is not held; a reserve list, the PUP list or a suspension is
out on the roster's word as before. The audit's B3 holds the first (every charted player on a roster on
the page, every club's QB2, a real QB2 made history-less starting with no lines with QB1 out, priced
nowhere, a real QB1 made history-less holding his slot, and one given a single game holding it,
suggested nowhere, on a game to come or any game of the season), V4 the moved-up player with no workload, and V5 the second
(the payload's `ina` against the downloaded roster, every inactive player on his club's last report
held or cleared as the rule says, and made-up cases for each branch, the reserve, PUP and suspended
lists among them).

**Refresh odds: DraftKings' lines from ESPN, on demand** (app v107, the owner's calls of 15 October
2026: "if we can get free odd pulls without the prices and have you come up with a formula that gives
the closest of what your best guess would be of that money price, that would be fine", and then "i think
it would be nice somewhere to have a refresh odds button that will pull the live lines on demand. would
rather it be on demand rather than like a constant job"). ESPN's free feed carries DraftKings' player
lines (the number, never a price) and DraftKings' game lines with their prices. The page reads it in the
visitor's browser only when **Refresh odds** is pressed (and, since 19 October 2026, when a parlay card opens, for the
parlay's own games: under "Bets and Stats: the loop", the parlay card), never on load or on a timer (until app v125 never in
a job either; since, the props job reads it with the same reader on every run and publishes the read, which a load
installs with no request: **The published read**, below): a 44px
button with an aria-live status line beside it in the Parlay Builder's controls and in its builder, at the
top of Suggested Parlays and over the Props tab's game list (every game of the week still to come) and on a
game's page (that game alone: its week's scoreboard and its player lines, two or three requests). Both ESPN hosts answer a plain GET with
`access-control-allow-origin: *`; the page sends no header of its own (no preflight), `cache:
'no-store'`, four requests at a time, each with a timeout. Until app v125 the props job's only part was `PAY.espn_ids`,
the ESPN athlete id of every player the page can project (this season's stat rows, the payload's players
and the depth chart), from the nflverse roster it already downloads (`espn_ids` in `weekly.py`, `python3
test_espn_ids.py`, which holds too that `bake()` itself carries no read), and the payload carried no ESPN line; since,
the job also reads and publishes (**The published read**). The reader (`espnRefresh` and its helpers in
`part3.js`, applied by `patch_espn_prices.py`, whose docstring is the design) matches each scoreboard
event to a game by the unordered pair of its clubs (ESPN's WSH, LAR and JAC as WAS, LA and JAX), never
by home and away; reads every page of a game's player lines to its pageCount at limit 1000 with a
cache-buster; keeps a main line's twin items once (two different lines for one player and stat are both
dropped), a milestone as k+ and the anytime-touchdown list; places an athlete by `PAY.espn_ids`, else by
name within the game's two clubs on a player no ESPN id names and no other athlete claims (ARI's Mack
Wilson Sr. shares surname and initial with Michael Wilson), else leaves him out; reads a game only before
its kickoff and throws away a read its kickoff passes during; and leaves a game as it was on a 404
(DraftKings has posted no player lines yet), a junk body or a failure. A read is dated by the browser's
clock (Date is not a CORS-safelisted header), and ESPN's `lastUpdated` is never read.

What a press reads is held in memory outside `S` (`ESPN_LIVE`, `ESPN_GL`, `ESPN_OUT`, `ESPN_IDAT`):
`save()` writes the published game lines (`espnSavable`). Since app v108 (`patch_press_keep.py`, the
owner's call of 15 October 2026: "anytime i load the site all the odds disappear and i have to click the
button to grab them again. is there any way to make sure it stays on the site when i pulled them and let
me refresh as needed after") each press also writes its read to the browser's own storage under a key of
its own, `props_press_v1` (`espnKeepWrite`: per game its scoreboard odds, its player lines' block and
what the read found, the season inside the value; never `S`), and a load puts it back before the page is
first drawn, with no request (`espnRestore`), game by game and each half on its own rule: a half stands
over the publish it was read over (the game lines by `espnGlSig`, which hashes `lat` with them, the player lines by
`espnPlSig`: the paid pull's time for the game, `PAY.dk`'s `at`, its main lines and, since app v125, the published read's
`pl.at`, `out.st` and `out.at`), or over a newer publish where the read is later than that publish's own time for the
half (the game lines' `g.lat`, the published read's or a by-hand pull's, else the bake; for the player prices the later of
the published read's, its `pl.at` or `out.at`, and a by-hand pull's `at`, else the bake: `pubP`); neither once the game has kicked off or
has a score, nor for a game not on the schedule in that week, nor from a value of another season or not
the page's shape (the key is then emptied). A rebake with the same lines never sets a read aside. So a
publish newer than the read always wins (since app v125 every run's own read of ESPN is such a publish), a read made after a
publish in a tab loaded before it stands, and until app v125 a game whose player prices were never bought (Sunday's early
games) kept its read to kickoff. What gave way is said on the status line for that load ("your earlier Refresh odds read gave way
to prices published since"). What is kept is what the load's reads did: each game-line field a read
set, with its value and that read's time, or dropped (a number read without its prices; `ESPN_GL`'s `d`,
which a read the page left off leaves empty), replayed on a reload (`espnKeepLines`: over the publish it
was read over exactly what the page showed, over a newer one only the fields read after it), every DraftKings id a read gave or found with that read's time (`espnKeepIds`), the
event the page uses, and the player lines' block with what the last read of them found; a half dated after
the page's clock is dropped, and a game id not of the schedule's shape is skipped. Writes merge with what the browser holds half by half, each game's game lines and its player
lines from whichever tab read them later (a read that found nothing never displacing one that found
lines, and player lines lent only over the same publish), never bringing back what a load set aside, and
a tab open on an older publish carries another tab's read of a game it no longer offers as it stands
(each load's restore prunes the copy on the publish it loads); a kept player line off ESPN's half-point
steps or past 1000 is dropped, and a read that found no player lines posted says so for a day at most; a save of `S` that
fails for room empties the key and tries again (`espnKeepDrop`), so a kept read never costs a visitor their
builder. Where a read
gives way, the builder's legs go back with it (`espnLegBack`: a leg a press priced goes back to
DraftKings' own price on its line, else the model's estimate; any other builder leg keeps the price it was
added at, as before). The game lines are DraftKings' real prices and replace the published ones where newer
(`g.ls` 'dk', the Game bets card saying "read from ESPN by Refresh odds" and when, in ET); DraftKings'
event and game-line ids from ESPN's bet links go into `PAY.dk` beside the paid pull's, never replacing
one, each dated by the read that saw it (`espnIdAt`, which the parlay card reads; `glat` stays the
pull's), so Open in DraftKings opens team legs and the game (since app v109 a team leg the press
re-priced can be suggested on the id it read, and a builder leg on a number a newer press found DraftKings
has moved off goes on the slip at the press's number; the `PAY.dk` a press makes on a payload baked before
`dk` is marked, `dkPressMade`, and does not count as the payload carrying ids, and since app v125 no game entry a read
makes counts either, by its content: **Reversed in app v125**). Each player leg's price after a press: the
paid pull's real price while its line is still DraftKings' line (the read has the same number, or none
for him), on a payload a pull by hand priced; the read's line where DraftKings has moved it since, or where the pull has no
price (every game since 20 October 2026), priced by the formula (`DK_EST` and `estPrice` in `part2.js`) and marked est.
(src `dkline`), as the published read's lines are before any press; the model's estimate where there is no line. A rung or touchdown the pull priced keeps its real price. (Since app v127 no rung is offered anywhere, so the rung pricing that
follows, `plEst` and `espnPrice`'s 'rung', stands dormant: **No ladder bets**, under "The published read".) On a count (receptions,
passing touchdowns and the formula's other counts) every rung from a read is a Poisson anchored on one fair chance,
the paid pull's two prices with the margin out where it has them on the read's line, else the formula's main fair
chance, and since app v117 (`patch_ladder_anchor.py`) the rung that is the main Over itself (2+ on a line of 1.5) is
priced at the pull's own Over price there, so a ladder has one anchor and never climbs (until then it took the
formula's main price, a second anchor: on the night of the props job's refusal of 18 October 2026, issue #290, the
audit on main read Jordan Love's passing touchdowns 2+ at 34.6% and 3+ at 35.5% after its press); a yards ladder is anchored at 50/50 and
keeps the formula's main price, and such a rung is never suggested (`mainOver`). The formula was fitted
on DraftKings' own prices only (2026 weeks 2-3, and its DET at BUF ladders of week 2), never on a result,
and tested once on weeks 4-5 (`props/README.md`, "Refresh odds", has the full table): the median gap, in
implied-chance points, between the price shown and DraftKings' real one,

| Bet type | Held out | The model alone | DraftKings' line + formula |
|---|---|---|---|
| Passing, rushing, receiving yards, main line | 605 lines, 1,210 sides | 7.8 | 0.4 |
| Receptions, main line | 360 lines | 7.4 | 2.8 |
| Passing TDs, main line | 62 lines | 5.4 | 1.6 |
| Anytime TD | 804 prices | 6.7 | 2.0 |
| Yards ladder rungs (k+) | 248 rungs | 3.4 | 1.5 |

A `dkline` leg of those tested kinds (a main line over or under on passing, rushing or receiving yards,
receptions or passing touchdowns; the anytime touchdown, but since app v138 not one the formula prices on the model alone,
with no yards line of his read, which the table's Anytime TD row never tested: **A touchdown on the model alone is no
tested kind**, under Props; a yards rung DraftKings lists, which since app v127 nothing
offers or suggests: **No ladder bets**) counts as a book
price under the same rules: the 45-97% band, the 3-point edge, market + form (`eloAltP` reads a `dkline`
price as a book price), the far-off guard on its estimated fair chance (the formula's own, `legFair`) and
V6. From app v109 to v124 it entered a suggestion (a Suggested Parlays level, a game page's hands until app v124 took them off, the Elo picks, and
until app v115 the Top lines) only on a payload baked before `dk`: wherever the payload carries DraftKings' ids a suggested leg must
have one at its own line, and ESPN gives none for a player's line (the owner's call of 16 October 2026,
"Every suggested leg on DraftKings' slip" under Props); from app v115 to v118 the Parlay Builder's Top 30 lines kept it there
too, with one quiet line under its game, and no parlay took it (the owner's call of 18 October 2026, "The Top lines keep a
line DraftKings moved" under Props, reversed in app v119). Since app v125 no payload the job bakes carries ids, and an
entry a read makes never does, so it enters every suggestion again (**Reversed in app v125**). Every other kind
(completions, attempts, carries, rush + rec yards, interceptions, field goals, kicking points, the
receptions and passing-TD ladders, a rung DraftKings does not list) has no DraftKings price on file to
test against: priced, shown est. on the game pages (since app v127 its main lines alone: a game's page draws no rung), never suggested. Every `dkline` price is marked est.
with a title saying what it is priced from and when; a level or the builder with one (and a game page's hand, until
app v124 took the hands off the page) says its price is estimated; the parlay card looks a `dkline` player leg up in the pull's ids like any other leg,
at its line or converted to DraftKings' number, and lists it to add by hand only where they have nothing
for it (ESPN carries no outcome id for a player's line; since app v125 there are none but a by-hand pull's, so a visitor
adds every player leg by hand, and on the admin's card Pull from DraftKings puts it on). A press drops every cache a price stands on (`PB_CACHE`, `PB_TOP_CACHE`,
`SP_CACHE`, `GAME_TIER_CACHE`; `ESPN_SEQ` is in `pbDataSig` and `gameSuggestSig`) and redraws, the focus kept on
the button wherever it was (a game's page, the Parlay Builder's controls or its builder, Suggested Parlays, the
Props tab); a set is re-picked by a press until its lock and never after it.
The status line says the published prices before a press (since app v125 the published read: "DraftKings’ lines as the
site read them from ESPN Tue 8:07 AM ET: player prices estimated from the line", **The published read**), the read's progress during one ("3 of 14
games"), and after it when DraftKings' lines were read (for how many of the week's games, after a game
page's press), how many games have no player lines posted yet, how many had their game lines read and
their player lines not ("their published player prices stand"), and how many ESPN's scoreboard did not
answer for. The suggestions record is the job's, on the published prices: the job never presses the
button (since app v125 it reads ESPN itself, on every run, and publishes what it read, so the record's sets stand on
DraftKings' lines as the job read them), and a locked set is the record's, the same for everyone whatever a visitor presses. The audit's M8
holds it, blocking, on the reader itself fed
ESPN's recorded answers in `props/build/fixtures/espn/` through a fetch stub (and a feed made from their
shapes on the payload's own games, so it holds in any week; with no game to come those are skipped), against
`props/build/espn_rule.js`, the checks' own copy of the formula's constants: the parse, the paging, the
placement (a name never on a player an id names), the kickoff guards, every price, the precedence, what
the page chooses and on what rules (where the payload carries ids, a table planted to carry them by its content, no leg from the
read in a level, a hand or, since app v119, the Top lines; with them taken away, as a payload baked before them and every
payload since app v125, the read's legs taken as before), the levels
and hands fresh right after a press, each id dated by its read, a read that gave way back on the published prices, nothing of it in `S` and no request to ESPN
without a press, every case run with the payload's published read taken out (`unbake`) and put back after (`rebake`),
the published read and its precedence being M17's (**The published read**, below), and the kept read (the key's content after a press, a reload putting back exactly what
the press gave with no request, each rule that sets a half aside, a value from another season or junk
emptied, an empty schedule leaving the key alone, bad ids, keys and lines dropped, the merge and the save
that gives way for room); its status and card words are warnings. The nflbets smoke holds the buttons, a
press and its status line, market + form and the far-off guard on the read's legs (until app v138; since, each read leg at
its fair chance, est.: **DraftKings' chance on every leg**), the card, a read that
gave way, and a real reload of the page (a second boot on the browser's kept read, with no request) on
stand-in answers of its own, and `elo/check_tab.js` market + form on a `dkline` price (since app v138 the Elo candidates'
rule on one).

**The published read** (app v125, `patch_espn_only.py`, `props/build/espn_read.js` and `weekly.py`'s `apply_espn`; the
owner's call of 20 October 2026, **Reversed in app v125** above). The props job reads DraftKings' lines on ESPN with the
page's own reader: `espnReadWeek(w, games, onStep)` (`window.espnReadWeek`), split out of `espnRefresh`, which keeps its
behaviour on top of it, reads the week's scoreboard and each game's player lines as a press does and returns what it read,
`{sbAt, out, gl, pl}` (each game's outcome, `ok`, `none`, `failed` or `kicked`, with `ok` and `none` dated, a `none` by
the 404's Date header, and one answered at or after the kickoff `kicked`, as an `ok` that late is, since the job publishes
nothing of a game dated there: until the review of 21 October 2026 a `none` racing a kickoff refused the run; its
scoreboard odds, ids and event; its placed player block), applying none of it and touching
nothing of the page's but `ESPN_RUN`'s counters and the `ESPN_NAMES` cache; a press then applies it as before (its game
lines now after the player reads, which stand on nothing of them). `espn_read.js` (step 4 of `weekly.py`, after the bake
and `assemble.py`, whose failure now refuses the run; skipped once the regular season is over or with no game of the week
to come) boots the assembled prop page in jsdom on the payload just baked as a visitor's browser does (no `NO_BAKED`, an
empty storage, the run's clock, `suggest_ledger.js`'s boot shims) and calls it on the current week's games still to come.
Every ESPN request goes through `lib/netfetch.js` (a plain User-Agent first and then none, a 403 tried again with the
next, a 5xx or timeout after 2 and 5 seconds, a 404 at once); the page gives up on a request after 15 seconds, and at the
read's deadline, 150 seconds, every request still waiting and every new one is answered as not reached, so the read always
finishes, `failed` for what it missed; any other address the page asks is answered 404 from disk. Each answer is recorded
in `props/raw/espn/` (`<sha1 of the address without the page's _= cache-buster>.json`, `{url, status, date, body}`;
cleared by an online run, replayed by `--offline` or `PROPS_ESPN_REPLAY=<folder>`, the same answers giving the same read),
and the read goes to `props/raw/espn/read.json`: `{v:1, week, read_at, done_at, requests, deadline, outside, games:{gid:{out,
gl, pl, placed, counts}}}`, `placed` saying for each player of a block his ESPN athlete id, ESPN's name for him and how he
was placed (`id`, `name` or `nameKey`), or `{v:1, week, read_at, skipped}` from a page with no `espnReadWeek`. The read
never refuses the run: a reader that crashed or ran past `ESPN_TIMEOUT` (300 s), or a `skipped` read, is a problem at once
(the last read stays published, and the run goes red after its commit); `read.json` is deleted before the read, and one
written before this run began or of another week is never taken (`load_read`). Then `apply_espn(pay, prev, read, now)`
(step 5; an exception in it refuses the run, the last good payload and its read staying live) writes
`PAY.espn` = `{v:1, read_at, games:{gid:{w, gl:{at, lines, ids, event}, pl:{at, lines, rungs, td}, out:{st, at}}}}`, one
entry for each game of this season still to come (not kicked off at the run, no score) with anything to publish: this
run's `ok` replaces the player block, its `none` drops it (never publish lines DraftKings has withdrawn), a game this run
did not read (`failed`, or none at all) carries the published payload's halves each with its own time, never this run's
(a kept press is judged against it); every half dated at or after its kickoff is dropped, nothing is carried across a
rollover, and the block is cleaned by the page's own rules (`espn_rules` reads `ESPN_KEEP_STATS` and `ESPN_KEEP_PID` from
`part3.js`, and raises, refusing the run, where their shape has changed: a line on a half point, above 0 and at most
1000, at most 40 rungs a stat). Each game's lines go on the schedule as a press puts them (`espnApplyGame`'s set and drop
rule) with `ls` 'dk', `lat` the read's time to the second and `lsr` 'espn', while under 24 hours old (`ESPN_STALE`) and
newer than any DraftKings line the bake put there (a pull by hand). Nothing of ESPN's goes into `PAY.mkt`, `PAY.prices`,
`PAY.dk` or `S.odds` (a line read from ESPN is never a book price: `mainOf`, `legFair`, `fairVig` and the Track Record would
read it as one), and `payload.py` never carries `espn` forward. A game kicking off within 48 hours (`ESPN_SOON`) whose player
lines no run has read for 24 (`out`: a read that found them, or found none posted, so a game with no player lines posted
does not go red) is a problem ("ESPN: DraftKings' player lines not read in the last 24h for 1 game(s) kicking off within 48h
(2026_07_NE_CHI last read 31h ago, kickoff in 20h): the last read stays published"), as `snaps_overdue` is; a fresh read of
its game lines never stands in for them (until the review of 21 October 2026 it did, so a week whose every player read
failed while ESPN's scoreboard answered, the core host refusing the runners, say, never went red). On week 7 the
read was 14 games, 156 players (every one placed by ESPN id), 1,737 rungs, about 23 KB of a 2.9 MB payload, in about a
second and 16 requests.
On the page, `espnPublished()` (at boot, outside `NO_BAKED`, so the audit sees what a visitor sees, and before
`espnRestore`; `window.espnPublished`, idempotent, which the checks call again after a plant) installs each game still to
come of its week, every time before its kickoff: its block into `ESPN_LIVE` (the very object `ESPN_PUB` records), cleaned
by `espnKeptGame(e, {published:true})` (the kept read's rules without its `late` guard: the job's times are ESPN's clock,
and a slow browser would drop the whole read), unless a press or a kept read stands in its place; its game-line ids and
event into `PAY.dk` beside any there as an entry a read made, never replacing one (`ESPN_PUB_IDS`, which `espnIdAt` dates
them by, so the parlay card dates a published id); and it writes no `ESPN_GL`, `ESPN_OUT`, `ESPN_IDAT`, kept read or `S`,
so every "a press happened" signal (`espnSavable`, `espnLegBack`, the card's two-minute skip) keeps its meaning; a game no
longer published is taken back out with the ids it added, and a table a check put in place of `PAY.dk` is the check's own.
Precedence, half by half: a fresh press (and the parlay card's check) applies its game lines over the published read's
(`lsr` 'espn') whatever `lat` says (the smoke and `PROPS_AUDIT_NOW` move the page's clock back, and a slow browser must
not swallow a press; a by-hand pull's line, `ls` 'dk' with no `lsr`, and a kept read's replay are still judged by time),
and its `ok` player lines over the published block; its `none` or failure leaves the published lines standing, and the
status line says nothing of it. A kept read stands as under "Refresh odds" above, the published read being the publish
it was read over or not (`espnPlSig`, `pubP`). Was it read: `espnWasRead(gid, w)` is true where a press found lines or
none, or the published `out` did (a published `gl` alone is no player read: `pbBuild`'s and `pbTopBuild`'s flags);
`espnLastRead(ids)` is the latest such read, which dates the no-lines words or, with none, says the lines have not been
read (`pbNoPl`, `spNoPl`, `spEloSet`); `espnPressed(gid, w)` tells a pressed block from the published one
(`espnStatus` counts a press's and a kept read's blocks as read, never the published one). Before a press the status line
is "DraftKings’ lines as the site read them from ESPN Tue 8:07 AM ET: player prices estimated from the line", with "; 3
games had no player lines posted when the site read ESPN" (a game's page: "; DraftKings had posted no player lines for it
when the site read ESPN"), its time the latest read of their player lines alone (a read of the game lines alone dates
nothing: with no player read it is the publish's), and "Prices as published <time>" on a payload with no read. Held:
`python3 test_apply_espn.py` (the carry on a failed read,
`ok` and `none`, a half at kickoff and a played game dropped, the rollover, another week's read ignored, the 24-hour rule,
a by-hand line newer than the read winning, the set and drop rule, `lsr` and `lat` to the second, the cleaning, the overdue
problem on the player lines alone and its words, nothing in `mkt`, `prices` or `dk`, a paid pull's game-line ids for a game
the read covers left in `dk` as baked, and the real page installing exactly what is published, on the payload's last
week's games with their scores taken off, so it holds once every game is played),
`node test_espn_read.js` (a replay of `props/build/fixtures/espn/`, a 404 as `none`, a 403 tried again with no headers on
a local server, the deadline, recording keys free of `_=`, the read's shape, a page with no reader `skipped`, no request to
any host but ESPN), `test_espn_ids.py` (`bake()` itself carries no read); the audit's M17, blocking, on two made-up games
of its own at any hour and in the off-season (a Monday night game with an `ok` read and a Tuesday game with a `none`: the
block installed as published and the ids merged into an entry that never carries, dated by the read, and no press's state
written; idempotent; an entry taken out taking its block and ids; a block or out dated at kickoff, another week's entry, a
value of another version or shape installed nowhere and throwing nothing; the read's `dkline` legs reaching `pricedLegs`,
the levels, a hand's pool, the Top 30 and a set with no id needed, the same after a press over `dk:{}`; a kept read older
than the published one set aside and said to give way, a newer one and one over this very publish standing, one between
the published read and a later paid pull set aside, a kept `none` never hiding the published block; a press over the
published lines with the clock moved back two days, `espnReadWeek` touching none of the page's state and a `none` answered
at the kickoff `kicked`, one a second before it still a `none`; the status line's time the player lines' alone (a game-line
read newer than them dating nothing, `W.wording`); two locked main lines
(a main line and a rung until app v127) at their locked prices through a republished read that moved them; the pull hooks inert without a stub and the
stub's price and fair chance with one, nothing in `S.parlay`; the status words `W.wording`); V-ESPN in section V, blocking
(every entry a game of this season to come of its own week, every half before kickoff, a `none` with no block, each game
marked `lsr` 'espn' at its read's lines and time under a day old and said "read from ESPN", `PAY.dk` held to its own
source (every id one a paid pull's `props/data/dk_links_wk<W>.json` gives that game, at its own key for a game line or the
event, each entry under its game's week: `dkSrcAud` and `dkBadAud`, held to made-up cases of their own; a paid sid is the
very DraftKings id ESPN's bet links carry, so an id equal to one of the read's is no fault, and a read's id the bake took
has no source: until the review of 21 October 2026 any id equal to the read's failed it, which a paid pull of a game still
to come, by hand or Thursday 22 October's, would have done on every run until its kickoff), nothing of it in `PAY.mkt` or
`PAY.prices`; with `PROPS_AUDIT_RAW`, against `raw/espn/read.json` where the payload carries that read: each `ok` block
the read's cleaned by the audit's own copy of the rules, each `none` dropping it (one dated at or after the kickoff
dropped itself, as `apply_espn` drops every half there),
the game lines as read, a game not read carried with times before the read began, and every athlete placed by id on the
player the payload's and the roster's ESPN ids name, by name on a player of one of the game's two clubs whose roster name
the audit's own `nameRule` passes or whose surname is ESPN's); a placement by the surname alone is the one warning,
`W.espnName`, argued in `WARN` (the page's placement takes one match only, never a player an ESPN id names or another
athlete claims, and the owner reads the list to add a nickname). `suggest_ledger.js` refuses a page that drops the read
(above), and the nflbets smoke holds the page on payloads with a read and without (**Bets and Stats: the loop**).

**The archive of DraftKings' lines** (27 October 2026, `props/build/espn_archive.py`, whose docstring is the design, and
`weekly.py`'s step 5b, `archive_step`). DraftKings' player lines on ESPN's free feed are the one free source of
historical prop lines there is, and ESPN keeps them for played games only while their season is in play (every 2025
game now answers 404); the job published only the current week's read (`PAY.espn`, worked out again on every run) and
the main lines kept at kickoff for grading (`espn_close`), so a played game's lines went with its season. A future
props model needs a durable history of DraftKings' opening and closing lines to be validated against, so the job keeps
them, in `props/data/espn_lines_<season>.json`, committed with the rest of `props/data`: research data, held out as
`research/` holds 2026 out (never fitted, tuned or chosen on while its season is the season in play), which no page,
audit check or suggestion reads. Each run reads, one game at a time through `lib/netfetch.py` (a plain User-Agent, then
another on a 403, a 5xx or a timeout tried again after 2 and 5 seconds, a 404 at once), every page of the game's
propBets to its pageCount (the page's own page rules), for every game of the earliest week with a game still to come
and every game played in the last 8 days not yet frozen (played: a score in games.csv, or 4 hours past its kickoff; a
game in play is not read). Kept a game (`{w, kickoff, espn, first_read, last_read, final, td, conflict, gone,
lines:{player:{stat:[open, close, lastUpdated]}}}`, which the file's `how` says): the twelve main over/under markets
the page reads (`ESPN_MAIN`'s, by ESPN's market name held to its id, under the page's stat names, which the test holds
to `part3.js`), ESPN's own opening line, the latest current as the close (frozen at kickoff: on the 94 games played by
then no item's `lastUpdated` was more than five minutes past its kickoff, so a final game's is the closing line) and
`lastUpdated` as ESPN writes it (labelled Z, three hours ahead of UTC), and the anytime touchdown scorer list's players,
with no line. A player is his gsis id through the run's roster (`espn_id`; an id two players share mapped to neither),
else `espn:<ESPN id>`, moved onto the gsis id at a later read once the roster has him (never in a frozen game). Twins
(a main line's Over and Under at the same numbers) are kept once; one athlete and market at two numbers (88 of about
5,600 on weeks 1 to 8) are kept as they came in `conflict`, never guessed between. A read merges into what is kept and
never replaces it with less: a 404, a failure or a read with nothing of these markets leaves the game exactly as it
was, and an entry a later read lacks (a line DraftKings withdrew) is kept with its last numbers and listed in `gone`.
The first run once a game is played reads it once more and marks it `final`; a final game is never read or written
again, whatever the clock or ESPN says. It never refuses the run: an exception, a file that will not read or is of
another season (left as it is) and a game played 30 hours or more and still not frozen are problems (the run goes red
after its commit), a game ESPN did not answer for a note; `--offline`, and a run replaying ESPN's recorded answers
(`PROPS_ESPN_REPLAY`, the props gate's base), read nothing for it. The file is written whole or not at all, a game's
head on a line and each player's lines on a line, so a run moves a few lines. `python3 espn_archive.py --backfill`, by
hand, reads every played game of the season not yet frozen, whatever its age, and the week's games to come: run on 27
October 2026 it froze all 107 games of weeks 1 to 7 and read 12 of week 8's 14 (the other two had no player lines
posted yet), 5,578 lines and 3,195 touchdown-list entries, two athletes kept by ESPN id (each only on a touchdown list),
about 360 KB (a whole season about 900 KB). `python3 test_espn_archive.py` holds it (a props gate unit, job C), on a
trimmed real answer of its own (`props/build/fixtures/espn_archive/`) and made-up ones: the market map, twins and
conflicts, the pages, which games a run reads, the rewrite of a game to come, `gone`, the re-keying, the final read and
the freeze, a 404, a failure or an empty read leaving a game as it was, the roster's mapping, the overdue problem,
another season's game, `--offline`, `weekly.py`'s step and the download through `lib/netfetch.py`. To the gate the file
is the job's output, never code (`AUDIT_OUTPUTS`, and left out of `props-gate.yml`'s push paths), as the payload is.

**No ladder bets** (app v127, `patch_no_ladders.py`, whose docstring is the design, the owner's call of 21 October 2026:
"general question, is it possible to not do ladders and just include Same Game Parlay eligible stuff show up since we are
only doing parlay builder stuff", then, offered every place a ladder showed (the Top 30 lines, the Suggested Parlays
sets, the Elo picks, the builder, a game page's Threshold ladders box), "yes"). The site offers main lines, the anytime
touchdown and team bets (moneyline, spread, game total) and nothing else. A ladder bet is a player's over at a number
that is not his main line (a rung k+, "250+ passing yards", "5+ receptions") or two or more touchdowns: `isLadder(l)` in
`part2.js`, beside `isGameLeg`, a leg on a stat the page prices (`MKT`) that is no game bet and is either the anytime
touchdown at k 2 or more (k missing read as 1, so 1.5 is the one touchdown) or any other stat off its main line
(`!l.main`); a leg on no stat the page knows (a visitor's builder may hold one, as the audit's `'g|p|s'`) never is.
`pricedLegs` makes no rung any more, whether a pull priced it (`S.odds`) or DraftKings' milestones read from ESPN did (the
published read's `pl.rungs`, or a press's), and it never made 2+ touchdowns; it is the one source of every suggestion's
player legs (the Top 30 lines, each night game's set and each Sunday slot game's, the all-games levels, `getPbTiers`, and
the Elo picks, `eloCands`), so none takes a ladder, and `gameLegPool`, the hands' engine drawn nowhere since app v124,
lost its own rung loop. A game's page on the Props tab offers none: no Threshold ladders box (`showRungs` and `#rungCb`
are gone, and a saved `ui.showRungs` is not read into `S.ui`), no rung row (`tr.rung`), the touchdown block its "Scores
one" row alone (its box `data-k="1"`, no "Scores two or more"), and no line saying a threshold leg on the parlay is shown
though the ladders are hidden; a stat other than the touchdown that DraftKings has posted no main line for (no paid line,
and no over and under from its line read on ESPN) shows its projection and "No DraftKings line yet." (`p.noline[data-noline]`) where its table was.
`toggleLeg` refuses a ladder by any path (a box, an Add, the console) after its take-off branch, so a held one still comes
off, and a touchdown's toggle is always one touchdown. A ladder kept in the builder from before (the browser's saved
state, or a backup imported) is taken out as the page loads it (`pbDropLadders()`, at boot once the saved state and the
bake are in, before `espnPublished` and the first draw, saving where it took one, and on an import), never on a draw
(`renderParlay` still drops only a started game's leg and FG attempts, so a check that plants a ladder in the builder after
boot still draws it), and the builder says so first among its dropped notes, "2 legs were removed: the site no longer
offers ladder bets (such as 250+ passing yards or 2+ touchdowns), only main lines, anytime touchdowns and team bets."
("1 leg was removed: ..."; `data-pb-noladder="2"`), until the visitor changes the builder (`PB_NOLADDER`, the count and
`pbLegSig()`, the builder's keys sorted; `renderParlay`'s own drops of a game kicked off or FG attempts re-stamp it, so a
ladder saved beside a leg of a game played since is said beside that leg's line: the review of 21 October 2026 found the
line ended there before anyone saw it, and the audit's NL4 and the smoke hold the case); the retired saved list,
`S.saved`, is never touched. A leg carrying `kept` stays: it is a leg of a Suggested Parlays set locked before the change (`spLegIn`), which
the record grades as it locked and whose Add to builder must pay what its card says, so a locked set, the record's or this
browser's own (`props_sp_lock_v1`), is drawn as it locked, its Add to builder (`pbPut`) and a locked leg's own Add write
`S.parlay` with `kept` as before, and its Finish (`fromTier`) is unchanged. The words: the Top 30 lines' foot says "Only
main lines, anytime touchdowns and team bets are listed: no ladder bets, such as 250+ passing yards or 2+ touchdowns."
where it said each bet is listed once, and names the markets the estimate is checked on as "main lines and touchdowns"
(no "yards ladders"); `ESPN_ERR`, in every est. title and the Top 30's est. note, reads "typically within 0.5 points on
yards, 2-3 on receptions, passing TDs and touchdowns" (no "and rungs"). Kept and dormant, since no rung reaches them but
a set locked before that day or a pull's ids: the Top 30's each bet once (`once()`, `getPbTop().same` 0 on every real
list), held on made-up lines standing in for `pricedLegs` (**Each bet once**, under "Bets and Stats: the loop"); `plEst`
and `espnPrice`'s 'rung' pricing (the Poisson ladder and `patch_ladder_anchor.py`'s anchor, under "Refresh odds");
`dkIdOf`'s rung keys; the parlay card's rung and 2+ touchdowns conversions, its moved rule naming a rung's own bet, and
Pull from DraftKings' ladder markets (`PULL_ALT`, a rung's `pullMarket`, `whyOf` 'ladder'), which `card.html` says stand
for a Suggested Parlays set locked before that day, finished from the record as it locked, and for a pull's ids; and
`dkClashWhy`'s rung of a quarterback's passing touchdowns. Live as before: `statLines` builds every stat's rungs (they say
which stats a player has, and the Track Record grades the model's frozen rung chances), the ESPN reader reads DraftKings'
milestones (`ESPN_MILE`, the published read's `pl.rungs`, the shape `apply_espn` and its tests hold), and `settleLeg`
settles the ladders the records and the backtest hold; nothing is graded again. Week 7's suggestions-record entries not
yet locked when it landed held ladders (Thursday's NE at CHI 6 legs of 28, Sunday night's KC at SEA 3, the Sunday slot
5): the first props run on the new page before each lock rewrites them, as it rewrites any set that has changed, so no
week-7 set locks with one, and the weeks before stand as graded, ladders and all. `build.js` stops if the parts draw
`showRungs`, `id="rungCb"`, "Threshold ladders", "Scores two or more" or `tr class="rung"` outside a comment, or lose
`toggleLeg`'s refusal, `pbDropLadders` or its boot call. Held, each check by its own reading of a ladder, never the page's
`isLadder`, and all blocking but where a word is said to warn: the audit (`ladderAud`, on its own `PLAYER_STATS_AUD`,
which NL1 holds to the page's `MKT`) in NL1 (the week as it stands: no ladder in `pricedLegs`, any game's hands' pool,
`getPbTiers` on every bet type or the Top 30 rows, `getPbTop().same` 0, nor in every night game's and the Sunday slot's
`spSet`, `spShown` while live, or `spEloSet`; a locked set is the record's, not held to it), NL2 (a made-up Monday night
game of its own whose published read lists rungs and whose pull priced a rung and 2+ touchdowns: no ladder from
`pricedLegs` or the hands' pool while its main lines and touchdowns are there, and its page, each player opened with the
old box's choice saved on, drawing no ladder, each stat the read gave a line its table and every other the no-line note,
its words `W.wording`), NL3 (`toggleLeg` on it refusing the paid rung, a rung the read lists and 2+ touchdowns, leaving a
held touchdown, adding the main line and the one touchdown) and NL4 (in section I, by reboots: a saved builder's rung and
2+ touchdowns taken out and its kept locked rung, main line, one touchdown and money line kept, `S.saved` untouched, the
store rewritten, one `data-pb-noladder="2"` line, its words `W.wording`, through a redraw and gone once a leg comes off, a
leg the page cannot read kept beside two ladders that go, a builder with no ladder kept whole with no line); K and K2 (no
2+ touchdown box, `toggleLeg` refusing 2+ and leaving a held touchdown as it was, the one box on and off), S (no ladder on
a game page with the old box's choice planted: no `#rungCb`, rung row, box off a main line but the touchdown's one, 2+
touchdowns or old note, each stat block its main line's table or the no-line note alone, the words `W.wording`, and
`statLines` still building rungs), O (no ladder in the hands' pool, a warning until then that it held none), M7 (a far-off
rung price beside the touchdown's drawing no row, box or flag), M8 (a rung the pull priced no leg after a press, none
drawn on the read's game page, `toggleLeg` refusing a listed rung, with DraftKings' own price on file too, and 2+
touchdowns), M17's G (two locked main lines), V14 (a touchdown in the builder where a rung was), I3 (a saved
`ui.showRungs` not read) and the Top 30 foot's words (`holdTop`, `W.wording`). The nflbets smoke (`ladderOwn`, on its own
`PLAYER_STATS_OWN`, held to `MKT`; `isLadder` there and `showRungs` gone): no ladder on the week as it stands, every bet
type and game ticked (`pricedLegs`, each game's hands' pool, the Top 30 as built and as drawn with `same` 0,
`getPbTiers`, each prime-time game's `spSet` and `spEloSet`, every live unit's `spShown`, `eloPicks()`); then with
DraftKings' book prices planted on every rung of the starters' ladders and on their 2+ touchdowns, on the first game to
come and on a made-up Sunday night game of its own, every plant seen by `oddsFor` and none reaching any of those or the
game's page (opened with every player, the old setting planted and a ladder held in the builder); the no-line line on the
made-up game and the one main line given it drawn as its table; `toggleLeg`'s refusals, adds and a held ladder still taken
off; the same after its Refresh odds press (`ladderHoldF`, the read holding milestone rungs) and on the read's game page;
and a real reboot on a builder kept with a rung, 2+ touchdowns, a main line and a touchdown beside a saved list and the old
setting (the line word for word, through a redraw and gone on a change, `S.saved` byte for byte, nothing written a control
boot does not but the prop model's key), its twin keeping a locked set's kept rung and saying nothing. `smoke_live.js`
(`ladderOwn`, `NOLADDER_SAY`, `ladderBoot`): J2's and J3's boots taking their seeded ladders out with the line and every
leg put back after, R8 a kept rung staying with no line. And `test_suggest_ledger.js` (`offeredOwn`, above). Run on the
parts from before the change, the audit (`test_audit_phases.py`'s sun_3pm case) gave 524 failures, and 46 of the 135 legs
the record's test took were ladders.

## Betting: the loop

```
cd betting/tools && npm install
node betting/tools/update.js     # download + grade + write state.json; exit 1, nothing written, if a file the season needs did not download
python3 betting/joker/joker.py   # the Joker's picks into state.json (pip install -r betting/joker/requirements.txt)
node betting/tools/build.js      # checks the app builds; writes nothing (nflbets/build/build.js sets it into the page)
node betting/tools/smoke.js      # the built app, on its own and embedded, then the state against reality (section 5)
node nflbets/build/build.js      # the app changed, so the page that carries it is rebuilt
```

Gate: the app's embedded model numbers must equal
`betting/tools/reference_models.json`, or the publish aborts; that covers `MODEL_H`, the retired
Challenger's, which the app still embeds as shipped. The smoke then checks the published
state against what it was built from: this run's injury report and roster, stale inputs flagged on
the absences card, no quarterback who missed the last game on the report counted back in before
this week's report clears him, no 'Home' game abroad, a call from every model for every coming
game (or `modelStatus` saying why), no call moved after its kickoff (against the last commit),
scoreboard finals counted for every model on the frozen call, Team Rankings' record, the record's
disclosure of a model that could not run, the Joker's calls on 2026 weeks 1-2 its history file's
(5n), those weeks drawn like any other, and the retired models (Joker Jr, the Challenger, the Broly
Model) gone from a state the run wrote, drawn nowhere from one that still carries them, and the
Challenger never made by the app (5m). A few of its checks are warnings (`warn` in `smoke.js`, which
says why): the absences card's source line, its stale flag and its "returning" and "A -> A" wording, the
behind mark and note on a Team Rankings rating, the absences card's heading and hiding, the week the
Pick'em Record's picker opens on, and a call of a Joker history file that the Joker has not reached yet on a run whose
Joker step could not run (`modelStatus.joker`, the call untouched and carrying no `src`: 5h lets it stand unmoved and 5n
says it, so a Joker refusal never holds back the other models' finals). They print WARN, the state publishes, and the job's last step goes red
on `SMOKE_WARNINGS_FILE` after its commit; every other check holds the state back. The file is written
only by a smoke with no failure, and the last step runs only after one, worded by the commit's outcome:
a failed smoke holds the commit back, and nothing then says the state was published.
The files it holds the state to are the ones `update.js` refuses without (`patches.filesDue`: the roster and depth chart from a week before the opener, the injury report
from its first kickoff, the stats once a final is a day and a half old), and it passes in every
phase of a season: the week before the opener, week 1, between playoff rounds and after the Super
Bowl. `BETTING_NOW` stands in for the clock and `BETTING_DATA`/`BETTING_STATE`/
`BETTING_PREV_STATE` for the files, for tests.

The app source is never edited: its behaviour is changed by `betting/tools/patches.js`, applied
as the app is loaded by `update.js` and `build.js` alike, each edit asserted to land exactly once
(who starts at quarterback, the absences card, neutral sites from `betting/neutral_sites.json`,
the call frozen at kickoff in `atKickoff`, the season's phase, and no Challenger: its ratings are never
made, so it is never rated, called or graded). The season is the app's own
(`freshState`), read there; the Joker takes it from `state.json`.

`.github/workflows/update.yml` is the betting job (the file name is a leftover from when one
job ran every site). GitHub starts this repo's scheduled runs 3 to 9 hours late, so its slots are
set by when they must land: Fri/Mon/Tue morning and afternoon runs for the results, post-game
runs, and two before each Thursday, Saturday and Sunday kickoff window, early enough that a
9-hour delay still lands before kickoff (a game's call is the last run's before it). The ":37
hourly" slot fires about six times a day with gaps of up to 8 hours: a background refresh, not
an hourly promise. It runs `update.js`, `joker.py` (the model step may fail alone:
its last good picks stay, `modelStatus` says why on the Pick'em Record), the game-totals shadow
(`props/research/totals/shadow.py` and its check, which may fail alone too; see the game totals under
Props), the clearing of X's finished parlays (`liveparlays/tools/autoclear.py` after its test, which may
fail alone and then puts the file back; see "X's parlays and the X Bet Log") and `smoke.js` (which builds
the app itself), commits `betting/state.json`, the shadow's ledger and `liveparlays/parlays.json`, and starts `elo.yml` when a final was graded (even if the smoke or the commit failed: the Elo
job reads nflverse, not this state), so Team Rankings' Elo does not wait for the Elo job's own late slot.
Two game models were taken off the site on 13 October 2026 (the owner's call, after research study 4,
`research/models_compare/`, found them a near copy of Alpha and a copy of the betting line): the
**Challenger** (the app's `MODEL_H`: Alpha with each team's preseason Elo seeded from the market's
win total) and the **Broly Model** (`betting/broly/`: the betting line plus six team stats in a
logistic regression). Neither is computed, published or drawn: `patches.js` (6) stops the app
making the Challenger's ratings (it re-creates them wherever they are missing, so a fresh state,
the load of a saved one and Rebuild ratings are all patched), the job no longer runs `broly.py`
(which now refuses to run), and `update.js` drops what earlier runs published (`RETIRED_MODELS`:
`teamsH`, `processed[gid].h` and `.broly`, `atKickoff[gid].h`, `broly`, `modelStatus.broly`), as it
drops Joker Jr's, since the app is seeded with the last published state and would carry them for
good. `betting/broly/` stays on disk because study 4 imports its `stats.py` and `fit.py`; never wire
it back into the job. The Joker scores playoff games too, and freezes a game's call at its
kickoff. The Joker was refitted with 2026 weeks 1-2 in its training (`tune_2026.py`, 24 September);
`model.json` names the weeks (`fitted_weeks`, published as `state.jokerFit` and kept there as data),
but its calls on those games are fits, so they are not the record: the owner asked on 12 October 2026
for the record it actually had. `joker.py` takes every week 1-2 call, on every run, from
`betting/joker/history/2026_w1_w2.json` (written once from git, never by the job; its header says
where each came from): week 2's are the calls `state.json` carried before each kickoff
(`src: 'published'`), week 1's, played before the Joker existed, the original model's (fitted on
2019-2025 alone, the one #117 put back), called after the games (`src: 'backtest'`), counted like any
other week as the ELO Model's backtest weeks 1-2 are. 24-8 and +1 against Vegas on weeks 1-2, where
the refit showed 25-7, +2. A week in `fitted_weeks` with a game missing from the file refuses the
run; the smoke's 5n holds the published calls and grades to the file and the file to the last commit's
copy, and 5h let such a call move onto it once, from the refit's (no `src`), then holds it like any other. The Pick'em Record draws those weeks like every other week, counted in the Joker's
record and its line against Vegas with no mark, label or note (the owner's call, October 2026).
**Five Joker calls of weeks 3-4 as published before kickoff** (`betting/joker/history/2026_w3_w4.json`, the owner's
"dig into the joker weeks 3-4" of 25 October 2026, after the check of every number): until the freeze at kickoff
(`jobkit.freeze`, a62e7fe, 9 October 2026) every run scored every game of the season again, so 2026_03_ATL_GB (with the
refit, a64ed4e, 3h41m after its kickoff), 2026_03_LA_DEN, 2026_04_IND_WAS, 2026_04_JAX_CIN and 2026_04_DET_CAR (closing
lines nflverse posted after the game began) moved after kickoff, and the freeze then held the moved chance as if a reader
had seen it (IND at WAS 42.65% published, 33.25% held). A walk over every first-parent commit of `state.json` found these
five of weeks 3-6's 61 games and no others. The file holds each as the last commit on main before its kickoff carried it
(`src: 'published'`, with `commit` and `at`), and `joker.py` takes them like week 2's (5h lets each move once onto the
file's, 5n holds them after). No pick changed, so the Joker's record (63-30, +5 against Vegas) stands; the ELO Model's
re-picks that stood on the moved chances are done again on these (under Player Elo, `joker_fix`). `jokerFit.calls` names
only the files that hold the fitted weeks.
`joker.py` reads the files `update.js` downloads into `/data` and fetches the season's
play-by-play, so it runs after it and needs the network.

## Player Elo: the loop

```
pip install -r elo/requirements.txt   # pinned: the walk-forward must not move with a library upgrade
python3 elo/build.py             # downloads nflverse player stats 2012-now into elo/cache/, writes elo/data/
python3 elo/check.py             # the gate: the files against the roster, injury report, schedule and published calls; "0 failures"
node elo/check_tab.js            # the ELO Ratings tab on the new files (jsdom from props/build); "0 failures"
node nflbets/build/smoke.js      # the tab reads the files; must end "0 failures"
python3 elo/tools/units_fit.py   # only for a deliberate change to Overall Offense/Defense: refits its constants on 2012-2017 (the carry's share too); "the build carries these constants"
python3 elo/tools/def_units_fit.py   # the same for the six position tables, Run, Pass and Pass Rush/Protection a side (their stats' constants and UNIT_TABLES); "the build carries these constants"
python3 elo/tools/joker_base_fit.py   # after a build: the ELO Model's calls on the Joker's baseline (JOKER_BASE), fitted on 2021-2025, walk-forward on 2022-2025; "the build carries these constants"
python3 elo/tools/elo_avg_fit.py      # only after a season ends: the Elo-adjusted averages (ELO_AVG), fitted on every expected starter's game of 2016 to the last finished season, chosen on the walk-forward of 2018 on (--offline on elo/cache); "the build carries these constants"
```

**Elo-adjusted averages** (29 October 2026; `elo/build.py`'s ELO-ADJUSTED AVERAGES, whose docstring is the rule, and
`elo/tools/elo_avg_fit.py` its fit; the owner's call: "i want for elo suggestions to match up certain averages vs other
averages and adjusted for their overall elo rating. for example. Christian watson tonight projected 5 catches in the
panthers game according to suggested parlays. But I want it calculated as to what his average catch number is, variant
of how many catches based on what elo pass defense he was facing ... it shouldnt be 1:1 comparison it should be
dependent on averages on the elo level they face ... there should be some level of ranking adjustment each week so that
we get accurate estimates based on their current elo ... I want this for every single positional leg and adjustments
done every week like the rankings"). Every leg of every expected starter (a club's charted QB1, RB1, WR1-3, TE1 and K1
with three regular games behind him) is projected as his average (his regular games on the stat, the recent ones
weighing more, last season's discounted, shrunk toward the position's mean where the walk-forward chose it) times a
smooth curve in the opposing defence's table on the ELO Ratings tab (Pass Defense for catching and passing, Run Defense
for rushing, Overall Defense for some touchdowns and the kicker) and his own Elo, log-linear with their product, never a
1:1 difference in Elo; where the walk-forward preferred them, with the matchup formula's other terms (home, what the
defence allowed, the opposing line's, linebackers' and secondary's player Elo, his club's offence table: a quarterback's
passing legs, a back's rushing yards, carries, catches and touchdowns, a receiver's touchdowns, a kicker's points) or a
wide receiver's place in his club's pecking order on targets (his catches and yards; a tight end's are without it, since
his lineup carries one tight end and the rule's choice of it there stood on 10 fit rows of a fallen-back lineup listing
two, which at run time moved his projection and his Elo part by a rank coefficient the ridge alone had split: the review
of 29 October 2026). It is fitted on every
game of an expected starter judged before kickoff, 2016-2025, his games with nothing on the stat line put back as zeros
from nflverse's snap counts: the matchup formula, fitted on games where the player turned out to get a regular's
workload, runs about 30% high on a receiver's and a tight end's catches and yards on those games (Christian Watson at CAR
on 29 October 2026: the formula 4.89 catches, his average 4.58, the Elo-adjusted average 4.02). Each choice is made once
by the nested walk-forward on 2018-2025 and frozen in `ELO_AVG` ("the build carries these constants"; refitted by hand
only after a season ends, never on the season in play), and every build applies it on the ratings and the tables as they
stand, so it moves week by week as the rankings do. Walk-forward 2019-2025, each season on fits of the seasons before it
with every choice made on earlier seasons: better than his plain average on 19 of 22 legs and worse on none; better than
the matchup formula as it is fitted on 13 of 19 and worse on none; against that formula refitted on the same rows better
on 4, level on 10 and worse on 5, and with the formula's terms (as the legs that chose them carry) level or better on 18
of 19. The defence's level moves a receiver's catches only about +4% against the weakest tenth of pass defences and -3%
against the strongest, a back's rushing yards +9% and -8%; his own Elo carries more. matchups.json carries it beside the
formula's projections: `avg` (each player's legs: `avg` his average, `proj`, `no_elo` the same leg refitted with no Elo
terms, `elo` the Elo part, `proj` less `no_elo`, `sd` the stat's spread at the projection, `z` the Elo part in it, the Elo part's
split `def_x` (the defence's multiplier, against the league's average defence) and `elo_x` (his Elo's, given his average:
the rest), `no_elo` times the two being `proj`, so together they point the Elo part's way, and `vs`, the table he faces with
its Elo and rank on the tab), `avg_ref` (the league's average defence) and `avg_fit` (`ELO_AVG` whole: each
leg's terms, spread, record and `trusted`). The honesty rule of app v138 holds: a leg's Elo chance is DraftKings' fair
chance moved by the Elo part alone, in `z` (`muP`, `window.eloMatchupP`), never the projection's own chance of the line,
and its lean is that move; a leg leans only where its Elo part beat its no-Elo twin on the nested walk-forward and its
largest fifth landed on its side more than half the time (the Elo part is the projection less its twin, never the full fit
with its Elo terms at 0 or at their means: on the nested walk-forward that moved the no-Elo projection worse on 10 of the
11 trusted legs (level on a quarterback's interceptions), a receiver's yards worse than not moving it, 36.13 against 35.26 and the twin's 35.01, since knowing his Elo
a high average is worth less, which the line, knowing his average, does not price; so Jaylen Warren's rushing yards at CLE,
an average of 79.3 his Elo does not match, lean under, −6.7, ×0.93 for his Elo given his average and ×0.98 for the CLE Run
Defense, where the split it replaced read ×1.15 for his Elo against a 1500 player beside the same −6.7: the review of 29
October 2026) (`trusted`, 11 of 22: a quarterback's interceptions; a back's
rushing yards, carries and rush + rec yards; a receiver's catches, yards and touchdowns; a tight end's catches, yards and
touchdowns; a kicker's points; DraftKings' lines reach a back's rushing yards and the receivers' and tight ends' six), so a
leg the Elo adds nothing to (a quarterback's rushing yards, a kicker's field goals made) leans nothing. On the page
(`nflbets/build/tab_elo.html`: `muAvgOn`, `muEntry`, `muLine`, `muNudge`, `muTrusted`) it is the one projection the Elo
picks, a builder leg's lean and an Elo pick's leg note ("Elo +0.5 · vs CAR Pass D #23", titled with the table's whole
name, its Elo and its rank and the part's split, "His Elo for his average (×1.13) and the CAR Pass Defense (1448, 23rd,
×1.01) move his projection +0.5": `eloLeanNote`, `vsShort`), a player's window on the ELO tab (a row a leg: his average,
Base, his projection with no Elo terms, the table he faces with its Elo and rank, "Pass D 1448 (#23)", ×Def and ×Elo, the
part's split, Base times the two the projection, the projection and its Elo part, Proj less Base, faded where untrusted; a kicker's two legs, where the window said there was no matchup formula
for kickers), the matchup bubble's trusted stats (his average and the projection, `window.eloGlance.entry`, headed Avg)
and the Mismatches' projected line read (its Elo part, "+3.3 from the matchup", only on a trusted leg: a quarterback's
passing yards, trusted on the formula, are not on the averages); the Mismatches' edge, units and words stay the formula's (its `players`), as do
the game model's uses, and a player in the formula's players alone has no lean or projection on the page. A file built
before the block (no `avg`) is read as before, the formula's nudge over its fit's sd, so an older `elo/data` never breaks
the page. Held: `elo/check.py`'s AVERAGES (every number on its own reading of the raw files); `elo/check_tab.js`
(`nudgeOwn`, `eloPOwn`, `noteOwn`: every trusted leg's Elo chance on the files, none on a player the block does not cover,
each trusted leg's `z` its Elo part over its spread, every leg's split making the projection from its twin and pointing
its Elo part's way, the Mismatches' projection and its Elo part on a trusted leg alone, the files with the block taken out
holding the old reading on no line in the off-season, said, never failed; F1 and F2 on fixtures planted in the block and F1 again on a file from
before it, each lean's words; a receiver's and a kicker's window row by row, and the old window on a file from before);
the nflbets smoke (`muAvgOwn`, `muLegOwn`, `leanNoteOwn`, `muPlantOwn`, `mmSayOwn`: the Elo picks' made-up lines planted
in the block, the builder's and an Elo pick's notes word for word, a receiver's and a kicker's window, a defensive
lineman's "There is no matchup formula for defensive line.", the bubble's table, every Mismatches row's projection and its
Elo part on a trusted leg alone, and each bubble's and Game snapshot Mismatches line's words for it: `mmRowOwn`); and `test_suggest_ledger.js` (each recorded Elo pick's leg
its fair chance moved by its Elo part in the matchups file, `peOwn`, to the record's four places). Bite-tested on scratch
copies of the tab, `elo/check_tab.js` failing each of eleven: the formula read on a file with the block, the chance moved
by the projection less the line, every leg trusted, the twin read as the Elo part, `z` read as the raw Elo part, the note
without its defence or ranked by its Elo, the window's average, multiplier or fading wrong, and a file from before read
off the block alone; the nflbets smoke failing the note without its defence (11 failures, Christian Watson's Over 4.5
receptions in CAR at GB's Elo Safe among them) and the window's player multiplier wrong (a receiver's and a kicker's);
and `test_suggest_ledger.js` failing a page that reads the formula on a file with the block. The four page smoke cases of
`test_audit_phases.py`, each on its own commit's `elo/data` from before the block, hold the fallback.

The build refuses to write anything when a file the season under way needs (its player stats, depth
charts, injury report, roster, play-by-play) or any past season's cannot be downloaded (after `lib/netfetch.py`'s
tries, under Conventions): it exits 1 and the last good files stay live. The finished seasons' files (2012 to
last season's stats, depth charts and injury reports, last season's play-by-play once this one is under way,
and the season before last's while the rankings are still on the finished season, which the units carry in
and which is not read once the rankings move: in season 43 of the 49 a run reads) never change, so `elo.yml` keeps them between runs with `actions/cache`: the
build writes `elo/cache/past.lst`, the files it read as a finished season's, once every source was had, and
the job saves exactly those under a key on their names (a new entry only when that set changes: a season finishing, the rankings moving to it; bump `v1`
in it to throw them away), so a run asks nflverse for the season in play, games.csv and the roster alone,
which it always downloads fresh. A kept copy that will not read is fetched again. A correction nflverse
makes to a finished season's file later is not read until `v1` is bumped (and `elo/check.py` reads the same
copies, so nothing flags it): bump it when nflverse says it republished past seasons. `python3 elo/test_fetch.py`
holds the downloads and `past.lst` to their cases on a local server. Every club is read in today's code (`TEAM_NOW`: games.csv, the depth charts
and the injury reports write OAK, SD and STL for the seasons before those moves, the player stats LV, LAC
and LA); until 13 October 2026 the 263 games those clubs played in 2012-2019 were left out of the game
model's fit and walk-forward, and the matchup formula read their home games as away games (the player
ratings, read by game id and opponent, were never affected). The season comes from games.csv alone (a new schedule becomes the season in
play once its first game is 36 hours old; until then the finished season stays, and its week 1 is called
in the fortnight before; the rankings switch once 16 clubs have a rated game); the playoffs are rated as
they come and `phase` says regular, postseason, over or opening. `elo/check.py` holds the new files against
their sources and against the last publish (the last commit's `elo/data`, which the site serves until the run
commits): a top-ten player of the published rankings is still ranked or sidelined unless his club has played, had a
game rated (the player stats land a night after the score) or he changed clubs; every call the published ledger had
for a game this run can no longer call keeps its pick and its `src`; a call in `elo/history/` is graded as it
stands there unless a later call, itself published before kickoff, replaced it; and Team Rankings (`teams`, which
carries each shown number's parts, `r` and `lg`) is solved again from games.csv by the gate's own iteration, never the
build's matrix solve, `before` included (POWER in its docstring, with fixtures for the re-judging, a later final, a
neutral site and a tie); and the game model's walk-forward counts every decided final of each finished season in
games.csv (GAMES: a club whose code is not matched, as OAK, SD and STL were not until October 2026, fails it).

A game's score (THE SCORES in the build) is EPA for a quarterback, production for a back, receiver or
tight end (yards from scrimmage, 20 a touchdown and 10 for a back, less 25 a fumble lost: EPA rated a
club's lead back above his backup in only 44% of seasons, since the average carry loses expected
points), points over expected for a kicker, and a weighted count of events for a defender (a
lineman's QB hits count double); a quarterback's first career rating is 1450, not 1500. The October
2026 evaluation of every position (each tested by full rebuilds against the same data, walk-forward
held) kept the rest: quiet games skipped, the kickers' expectation, the defensive backs' and
linebackers' scores, which still measure involvement more than coverage or role (open questions:
an edge group across DL and LB, blocking credit for tight ends).

The rankings are of this season alone: each player's second rating (`RS` in the build) starts
the season at 1500 with placement games (K = max(32, 695/(games+4)): 174 shrinking toward 32, so that every game ends up counting the
same, where the schedule before October 2026 counted a season's first game about twice as much) and moves only on this season's games;
a ranked player with fewer than three real-role games is marked provisional (`prov`, "prov." on the table);
the number shown is that rating on a bell curve within the position (1500 the average, 100 points a standard
deviation, so the shields split a position as a ranked ladder does; the raw value stays in `raw`); a player is ranked only with games
in a real role in at least half of his club's rated games (a club's bye or a Thursday game elsewhere does not move his bar), and
"through week N" is the last week whose games are all rated, with the week under way beside it; the models (game model, matchups, market + form until app v138,
Mismatches) keep the career rating, `elo` in `players.json` beside the season's `se` and `rank`. Opponents count through the
units: `K_UNIT` is 120 so a unit is rated as far from the average as it really is, and a big game against a weak one moves a player little.
They are of players who can play, the rest listed under the table where they would have stood: each club's
current roster is its rows at that club's own latest week (a club on its bye has none for the bye week, and reading
only the league's latest week once called every Chief and Panther a free agent); for each club's next game the
injury report's Out and Doubtful are out, Questionable stays listed with a Q, practised or not (until 19 October 2026,
app v120, one who did not practise at the last report was counted out, there and on the props page: Mike Evans, SF,
Questionable and no practice in week 6, played), and before a club files its statuses a player out at its previous report (or inactive after being on it: the roster's
INA, or an active row with nflverse's inactive code I01 or I02, as the props page's `ina` reads it; Caleb Williams's week 6 row
is ACT and I01, and the build read INA alone until 13 October 2026) stays
out until he practises or the club files a report he is not on (WHO PLAYS in the build). The game model scores every
game, past and coming, on the lineup known before kickoff: that week's depth chart (weekly files through 2024, the
last daily snapshot before the game from 2025) minus the week's Outs and Doubtfuls (and, for the coming games, whoever
the roster or the report keeps out), a fullback after every running back and players level on the chart taken by who
has been playing most, so the same data always gives the same numbers, falling back to who
played last game where a chart is silent, with home field 0 at a neutral site; `walk_forward` in `model.json` is that honest
number and `walk_forward_who_played` the hindsight one, kept for comparison only. The ELO Model's record grades the call
published before each kickoff, frozen in the ledger `elo/data/calls.json` (the calls before the ledger began are in
`elo/history/`, recovered by `elo/tools/seed_calls.py`), never one recomputed after the game; weeks 1-2 of 2026 were never
called ahead of time and are kept as a backtest (`src` on each graded call; the split was on the ELO Ratings tab's bar
until 22 October 2026, below). **The ELO
Model's calls stand on the Joker** (the owner's test of 19 October 2026: "the elo model has been underperforming pretty
significantly so I want to do a test. I want it to apply the ELO matchups to still predict outcomes but I want it to use
the model the Joker as a baseline to make its picks"; THE JOKER BASELINE in `elo/build.py`): a call is the Joker's chance
for the game (`betting/state.json`'s `joker`, as the build finds it, held within 1% and 99%) moved by the Elo matchup,
log-odds plus `JOKER_BASE`'s BETA (0.2058) times `m`, the game model's position-group lineup gaps by its weights with home
field left out (the Joker's chance has it). BETA is `elo/tools/joker_base_fit.py`'s, fitted once on 2021-2025, where
research study 4 has both models' walk-forward calls, the Joker's chance held as it is: walk forward on 2022-2025, 707-377
(65.2%, log loss 0.6345) against the Joker alone 687-397 (63.4%, 0.6354) and the game model alone 698-386 (64.4%,
0.6343), the matchup turning the Joker's pick round in 4.2% of games, right in 33 of 46. Not kept: the Joker's log-odds
weighted too (a mix of the two, 711-373, 0.6283), which is not the Joker as the baseline. A game the Joker has not
called is the game model's own, with no `base`. Each call keeps `p_elo` (the game model's own chance), `p_joker` and `m`
beside it, in `next` and in the ledger, so the test can be read both ways; `record.joker_base` counts the published calls
on the Joker from `joker_base_from_week`, which the tab's bar drew apart from the Elo-alone calls before them, beside the
baseline's walk-forward (its title the Joker's and the game model's alone), until 22 October 2026 (below). `elo/check.py`
(JOKER) works the rule out on its own on every coming call and ledger entry against `betting/state.json`.
The season's games played before the first build on the Joker (`JOKER_FROM`, 19 October 2026 15:20 UTC) were
re-picked on it the same day, the owner's call ("i just dont see any changes in the ELO model pickem record and i wanted
you to change it based on what it would have picked"): each called again once, after the game, on what was known before
its kickoff (the Joker's call as frozen at kickoff, the game model fitted before the season on the pre-game ratings and
lineups), marked a backtest, the call first made kept in `was` (ledger and graded call), so the Pick'em Record grades the
re-pick: 61-30 where the first picks went 52-39 (`record.repicked`, `repicked_was`; the tab's bar named both until 22
October 2026; 62-29 until 25 October, below). The gate
allows exactly that change to a frozen call (JOKER and RECORD: a game kicked off before `JOKER_FROM`, on the Joker's
frozen call, a backtest, its `was` the call the last publish had, every such game re-picked, and the re-pick held as it
stands on every run after). Five of those re-picks (weeks 3 and 4) stood on Joker calls that had moved after kickoff before
the Joker's freeze; `betting/joker/history/2026_w3_w4.json` put those calls back to what was published before kickoff (25
October 2026, under "Betting: the loop"), and the build does each such re-pick again once on the restored call (`refix`,
on `betting/state.json`'s calls marked `src: 'published'`, `joker_published`): only its chance, pick and `p_joker` move,
its `m`, `p_elo`, time, source and `was` kept, the re-pick it replaces in `joker_fix`. One pick turned round, LA at DEN
from DEN (right) to LA (wrong), so the re-picks are 61-30, the ELO Model's season 63-30 where it was 64-29 and its line
against Vegas +5 where it was +6 (23 picks turned round by the re-pick, 16 of them right, where it was 24 and 17). The gate
allows exactly that (JOKER: a `joker_fix` only on a re-pick, standing on a call the state marks published, the re-pick it
replaced whole and the rule's on another Joker chance; RECORD: on the run that does it, only the chance, the pick and
`p_joker` moved onto the state's, the last publish's re-pick in `joker_fix`, and held as it stands after), and its fixtures
hold `refix` on LA at DEN and IND at WAS and `joker_published` reading only the calls marked published. The game model is unchanged (fitted, its walk-forward graded, read by the power ratings):
never refit BETA on the season in play. **The tab's bar is its stamp alone** (the owner's call of 22 October 2026: "in elot
ratings get rid of the visual buttons", naming both, "On the Joker: 2022–2025 65% walk-forward" and "ELO Model 2026: 62–29
re-picked on the Joker after the games (52–39 as first picked), 1–0 picked on the Joker before kickoff (from week 6)"): its
two pills, the baseline's walk-forward (`#peWalkRec`) and the ELO Model's season record split into re-picks, calls on the
Joker before kickoff, calls on Elo alone and backtests (`#peCallRec`, each titled with how it was counted), are gone from
the markup with the code that filled them, and the bar keeps `#peStamp`, when the build rated, alone; `model.json` still
carries `record` and `joker_base`, and the Pick'em Record grades the calls. `check_tab.js` holds the bar on the real files
and on copies with calls on the Joker graded, games re-picked and the baseline's walk-forward (no `#peWalkRec` or
`#peCallRec`, no `.rec` in the bar and none of their words, the stamp the build's time), and the nflbets smoke the same on
the page. Tiers are the betting app's Elo shields, lifted with
its tag into the page and reshaped at build time by `betting/tools/tiers.js` (both builds apply it): Wood League under 1350,
Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Elite (the app's Challenger tier, renamed while a Challenger
model stood on the Pick'em Record, and kept) from 1700, and HOF from 1750, worn as a gem. The tab is the rankings card: a bell-curve
histogram of the position by shield over the table, and a click on a player opens his window (his rating, then his
matchup this week); at the end of its position row, two pills, Overall Offense and Overall Defense (`units` in
`model.json`, OVERALL OFFENSE AND OVERALL DEFENSE in the build), each a table of the 32 teams: an Elo of this season on
each of nine key stats from nflverse's play-by-play, opponents and home field counted, each side a fixed weighted sum
(offense points 35, success rate 25, EPA a play 15, giveaways 15, sack rate 10; defense points allowed 50, big plays
allowed 30, takeaways 10, sacks 10), fitted on 2012-2017 by `elo/tools/units_fit.py` and no less accurate walk-forward
on 2018-2025 than the old points-and-EPA measure (9.508 against 9.520, both rated from 0 before the carry, not a real
gain; with the carry 9.431 against the old measure carried the same way, 9.441, `UNIT_WF`); third down, red zone, yards a
play and the rest are shown with their league ranks and weigh nothing. Every club starts a season at `UNIT_CARRY` (0.42)
of its final rating the season before on every stat (THE CARRY in the build, 13 October 2026: last season rated from 0
on its own play-by-play, so the build reads the play-by-play of the season before the units' too; the weights, K and
home field held), chosen on 2013-2017 by leaving one season out at a time and tested once on 2018-2025, regular-season
weeks 2 on: 9.424 against 9.501 with nothing carried, weeks 2-4 9.325 against 9.597, where the Deep
Dive had 9.403 (`elo/tools/deepdive_vs_units.py`; week 1 9.492, the Deep Dive still better there at 9.293). So every
club is rated, ranked and on the curve from the season's first day: one yet to play is shown on its carried rating and
marked "carried from" last season (`carried`, its `start` its line's first point) on the tab, in its window and in the
Game snapshot, never hidden; `elo/check.py` replays last season with its own copy of the share. With them, six more pills
(the owner's asks of 16 October 2026: "for ELO ratings, please include a section for run defense, pass defense, and pass rush",
and then the offense's side of each, for Elo against Elo on the Game snapshot's position matchups), laid out as two rows under
the positions, Offense (Overall Offense, Run Offense, Pass Offense, Pass Protection) over Defense (Overall Defense, Run Defense,
Pass Defense, Pass Rush), each facet over its other side, two by two under each heading on a phone. First the defenses,
Run Defense, Pass Defense and Pass Rush (`units.run_def`, `pass_def`, `pass_rush`, named in `units.tables`; RUN DEFENSE, PASS
DEFENSE AND PASS RUSH in the build), each a table of the 32 defenses made exactly as Overall's are (the same Elo, K, home
field and carry, pending finals, curve, ranks and window) on two stats of their own from the play-by-play: Run Defense 55%
EPA a run allowed and 45% run success rate allowed (designed runs: nflverse's `rush`, never a scramble), Pass Defense EPA a
dropback allowed (100%; dropback success rate allowed is shown and weighs nothing), Pass Rush 90% sack rate and 10% QB-hit
rate (a hit any dropback flagged `qb_hit`, or a sack). The weights are the defense's shares of a fit on 2012-2017 of the
next game's measure (the offense's EPA a run, EPA a dropback or sack rate in it), rounded to fives, by
`elo/tools/def_units_fit.py`, and tested once on 2018-2025 weeks 2 on, as a forecast of that measure from the table with the
offense's own ratings on the same stats (never published): 0.2188 EPA a run against 0.2216 for the same forecast from both
clubs' raw numbers so far that season (0.2249 the league average), 0.2968 EPA a dropback against 0.3012 (0.3113), 0.0455 sack rate
against 0.0458 (0.0470), each better than the raw numbers in all 8 seasons (`UNIT_TABLES`' `wf`, the tab's note under
each, which says what was forecast from what). Then the offenses, Run Offense, Pass Offense and Pass Protection
(`units.run_off`, `pass_off`, `pass_pro`; RUN OFFENSE, PASS OFFENSE AND PASS PROTECTION in the build), the other side of the
same facets on the same stats: Run Offense 25% EPA a run and 75% run success rate, Pass Offense 70% EPA a dropback and 30%
dropback success rate, Pass Protection 95% sack rate and 5% QB-hit rate (fewer taken is better). Their weights are the
offense's shares of the same fit on 2012-2017 (the defense tables' `opp` until then; no new fit), each table named with its
`pair` in `units.tables`, and both of a pair carry the pair's test above. Each table was also tested once alone (`alone` in
its `wf`: the measure from that one table, nothing of the other side, against that side's raw numbers alone, 2018-2025 weeks
2 on): Run Offense 0.2207 against 0.2227 (all 8 seasons), Pass Offense 0.3009 against 0.3033 (all 8), Pass Protection 0.0457
against 0.0459 (7 of 8); Run Defense 0.2227 against 0.2237 (7), Pass Defense 0.3080 against 0.3094 (6), Pass Rush 0.0469
against 0.0469 (5: level at that precision, which the note says). The tables say which way is better in their stats' own
words (Pass Rush's "more made by the defense", an offense's "more gained" or Pass Protection's "fewer taken", never Overall's
"taken"), a team's window heads its values Allowed, Made or Value by the same rule (Overall Defense keeps Allowed, an offense
table Value), and its Next line gives the opponent's rank in the table's pair (Run Defense's opponent in Run Offense); on a
file without the pair it gives the opponent's Overall rank and says there is no table to set against it. Overall's two, and
the defense tables' ratings, are byte for byte as before (a stat's Elo is its own). They feed no call; `elo/check.py` replays
them with its own reading of the play-by-play (`TABLE` and `PAIR`, its copies of which stats each shows and which tables pair)
and on fixtures. **Each table ranks on the Elo it shows** (`rank_of` in `unit_ratings`, the owner's call of 22 October 2026,
with the Mismatches' below): a club's `rank` is one more than the rated clubs whose shown Elo (`elo`, the rounded number on
the curve) is higher, so clubs level on it share a rank, and a club with no rating yet comes after every rated one, once
each; until then a tie at the shown Elo was broken by the raw rating no page shows (DEN and NE, both 1616 on Overall
Defense, read 5th and 4th). That rank is the table's # column, a team's window, the Game snapshot's Offense vs defense boxes
and its position rows' Elo sides (`eloSides`) and the matchup bubble's Faces line. `elo/check.py` holds it
(`unit_ranks_bad(T, rated)`, on its fixtures and on the real file's tables, where the checks that the ranks were 1 to 32
once each stood, and the shown Elo never rising down the raw order); `check_tab.js` holds each table's rows in the file's
rank order, each # the file's rank and a rank shared only by clubs level on the shown Elo, on the real file ranked either
way and on a copy with each table's third club made level with its second (the two side by side under one #, the next
club one place on per club above it, each one's window giving the shared #); and the nflbets smoke the same on the real
file by what both rankings share (a rated club's rank at least one more than the rated clubs shown above its Elo and at
most its row's place). A file built before the change keeps its tie-broken ranks until the elo job's next run (dispatched
once the change merged, `gh workflow run elo.yml`). The table scrolls sideways inside its card at
every width, the team column held, the columns sort, and a click on a team opens
its window (its rating game by game, every stat ranked raw and with opponents counted, its coming opponent). The page
reads the weights and the stats from the file and still draws an older file's three columns. A final the
play-by-play lacks or has only part of is `pending` and moves nobody; `elo/check.py` replays the season from the
play-by-play and holds every rating and stat to it. The tab's script also puts a second price, "market + form", on every
player leg in the Parlay Builder that has a real book price: the book's chance moved by the
player's Elo on the side of the bet (the rule and its fit are in `tab_elo.html`), shown
beside the model's chance and graded against it, week by week, at the top of the prop
model's Track Record (the Prop Record, now off the tab bar: its section stays in the page unshown), each week on the rating the player took into it (`s0` and `h` in `players.json`; a player out, who is kept out of the map so nothing prices him, keeps his in `past` beside it), never today's. It replaces nothing; a switch has to be earned there. (Reversed in app v138: market + form is gone whole, its card on the Prop Record with it, and a builder leg carries only the Elo nudge, "Elo +2.1": **DraftKings' chance on every leg**, under Props.) The matchup formula (`matchups.json`, in the build's docstring) projects each expected
starter's stats from his recent form, his Elo and the Elo of the defenders he faces (since 29 October 2026 a player's
window, a builder leg's lean, the matchup bubble, the Mismatches' projected line and the Elo picks read the Elo-adjusted
averages instead, the Mismatches' edge staying the formula's: **Elo-adjusted averages**, above); a player's window on the tab
shows it, the Props tab opens on its Mismatches (the five biggest gaps between a starter's Elo and the unit he faces, in standard deviations, the top thirty behind Show more; a game that has kicked off leaves them, and each bubble wears the player's season shield; what they rank is the matchup formula's units, the player ratings of the defenders he faces, and since 18 October 2026 their words say so, "vs the LAC secondary and defensive line, 32nd by player Elo" (`mmLine`, `mmTitle`, `mmAgainst`), as do a game page's MISMATCH title, the Game snapshot's Mismatches and an Elo pick's tag, since "pass defense ranked" on the page is the ELO Ratings tab's Pass Defense table alone, which can rank the same club far apart: LAC 32nd of the one for Patrick Mahomes in week 6, 4th of the other; clubs level on a unit share its rank, one more than the clubs above them, there, in a player's window and in the Game snapshot's Starters headers, since 20 October 2026, when ATL and NO, level at 1512.6 on the secondary, read 24th and 23rd on the Mismatches by the order the page first met them as opponents, and the other way round in the Starters headers, and the nflbets smoke failed every morning; and since 22 October 2026, the owner's call, "in mismatches, make clubs tied on a defense unit share the same rank in the mismatches, plaer window, and game snapshot", level is read to the hundredth, `mmKey` (`Math.round(x*100)`, in `defRanks` and the Mismatches' `rankOf`, and `snapshot.html`'s `defRank` the same), since `matchups.json` writes a unit to the tenth and a group of two units averages them, so two clubs level on paper can differ by a floating-point hair an exact comparison would part: `check_tab.js` holds it on a copy with one club's secondary a hair above another's, and the nflbets smoke's CLUBS LEVEL ON A MATCHUP UNIT SHARE ITS RANK on fixtures of its own at any hour (a made-up game two days out between two clubs whose secondaries, and a back's unit of two averaged, are level on paper and a floating-point hair apart, each planted starter's Mismatches bubble, his window on the ELO Ratings tab and the game's Game snapshot, its Starters headers and Mismatches, ranking them by the smoke's own reading, `mmRankOwn`); on a game's page each player with a Solid, Big or Huge one wears MISMATCH beside his name in the Diamond shield's blue, `pe-mmtag`, each leg in the builder carries its Elo matchup chance, and the Elo picks
(since app v118 each Suggested Parlays set's own, on that night game's or Sunday slot's games alone, whatever the Parlay Builder's ticks say, `window.eloUnit`, locked and recorded with the set: under "Bets and Stats: the loop", **Two sections, the Sunday slot and each set's own Elo picks**; from app v111 to v117 their own section at the foot of Suggested Parlays, `#pbElo`, on the Parlay Builder's ticked games and player sides, until then of the Parlay Builder's suggested parlays; their legs wear no Value mark, since they are chosen on the Elo matchup, not the edge: app v112) are built on it.
From 18 October 2026 to app v138 (the owner's call of 17 October: "for the ELO picks suggestions, can we also add an aggressive
and extreme versions. is it touchdowns only or did it just so happen to show that? would want to see the best
lines:value ratio for ELO mismatches etc": not touchdowns only, but the picks were the first two, three and four
candidates taken plus money first, one leg a game, and an anytime touchdown is nearly always plus money, 7 of week 6's
9 legs, 1 of 14 since) they are Suggested Parlays' own four levels, read from the page's `PB_TIERS`, on the Elo chance:
Safe, Medium, Aggressive and Extreme the 2-, 3-, 4- and 5-leg parlay with the best expected return that lands 35%, 25%,
12% and 5% by the Elo chance, else the likeliest of that size, marked "the likeliest pair" ("the likeliest N legs") only
while its chance is under the floor; Safe's 35% is the Elo picks' own (`EP.safe`, `epTiers`: Suggested Parlays' Safe
has no floor and stays the likeliest pair), the owner's call of 18 October 2026, "yeah safe picked on value too", after
week 6's Safe was the likeliest pair, Prescott and Brissett at short odds returning $1.06 on $1 where Mahomes and Nacua,
landing 36%, return $1.32 (ids `elo-safe`, `elo-med`, `elo-aggr`, `elo-xtrm`; `.pb-tier.elo-xtrm` takes Extreme's
colour in `theme.css`, both looks). The candidates (`eloCands`, `EP` in `tab_elo.html`) are ranked players whose
matchup says they beat the book's price with its margin out (a real price, or one from DraftKings' line read on ESPN on a
tested kind, est.: until app v125 only on a payload baked before `dk`, after a Refresh odds press; since, from the props
job's published read or a press, on every payload the job bakes), on the stats where the matchup has held up
(`muTrusted`), priced -200 to +300, at an Elo chance of 30% or more and an expected return above nothing, each player's
best leg by value (his Elo chance times the decimal price, less 1; the main line on a tie), built from `pricedLegs()`
in the props parts and filtered by the Parlay Builder's ticked games and player sides (`pbAllows`, the reader's own
choices, as before the move) and, since app v109, wherever the payload carries DraftKings' ids, to legs with one at
their own line (`dkCarries`, `dkIdOf`: the Parlay Builder's rule, under Props, "Every suggested leg on DraftKings'
slip", dormant since app v125, an entry a read made never carrying ids; a unit with no player lines says DraftKings had
posted none when its lines were last read from ESPN, or that they have not been read, `spEloSet`); a level is searched from
the 30 best by value and the 10 likeliest by the Elo chance, each once (`EP.cap`, `EP.capP`), and one that cannot be
filled says why ("Only 3 players on your picks qualify: this level takes 4."). Legs of one game may go together: a
level's chance is the builder's own `parlayProb` on the Elo chances and its price `parlayDec`, on the legs in the
builder's order, so Add to builder and Finish pay what its card says. The search is the rule's own answer by those
sums: they are worked from draws made once with `parlayProb`'s own seed and Cholesky rows (`epDraws`, `epSums`,
`epDec`), equal to the parts' to the bit, inside a branch and bound over a quick reading (Mendell-Elston for a game's
legs; bounds of `EP.z` 4.5 and `EP.zr` 4 standard deviations of the draws' noise and `EP.bias` 1%, measured on the
payload's correlations, which the nflbets smoke holds under 0.7 between two players of one game, twice the table's
0.353, since past about 2.6 times it the bounds miss); every level is worked again by `parlayProb` and `parlayDec`
before it is drawn, the fast sums set aside (`EP_FAST`) should they ever differ. It is built only while Suggested
Parlays is on the screen ("Built when this tab is open.", the ELO tab wrapping `renderSp`) and cached on the data
(`EP_CACHE`): a fresh build about 140-300 ms in Chromium on week 6. A leg on a player with a Solid-or-better mismatch
in that game wears its grade just after his name's button, "Huge mismatch" (`pe-mmtag`, `epMmTag`, titled in the
Mismatches' own words), only on the side the mismatch favours, his over (a ladder rung too, which since app v127 only a
set locked before then holds) or his touchdown, never an Under
or interceptions (`epMmFor`). Each level has Add to builder, an Add on each leg (app v111, as a set's) and Finish
(`elo|elo-<level>`, the card's kicker "Medium Elo pick"). Reversed in app v138 (**DraftKings' chance on every leg**, under
Props): a level is the n strongest Elo leans that go together on one DraftKings slip (none refused beside another, and
since the review of 27 October 2026 none moving against another by the pair table), each lean against the leg's own fair chance,
stated at the fair chance and its expected return; the value ranking, the floors, `EP.safe`, the caps and the search
are gone. A change to the formula is a change to `elo/build.py` (its docstring is the formula: say what
moved and why there) and a rebuild of the data; a change to the tab is `tab_elo.html` and a
rebuild of the page. The Elo model also stands on the Pick'em Record chart, table and pick
grid as a third model, beside Alpha Model and the Joker: `betting/tools/build.js` reads `elo/data/model.json` beside the season
in its published-mode hook (graded calls onto `processed[gid].elo`, the coming week's onto
`S.elo`, each graded there as soon as the season has its score, so a Sunday counts before Tuesday's re-rating; a game under way or awaiting its stats stays in `next` with its frozen call); `record_viz.js` (below) draws it on the chart and the table, and the build widens the app's own Joker lines in the pick grid to draw it there, each edit asserted
to land once. Vegas is the site's baseline: the Game snapshot's Vegas call, its chance, confidence band and line are the Vegas favourite's (nflverse's closing moneylines in `state.odds`, margin out, and the spread and total; `call` in `nflbets/build/hub.html`, `window.pkBoard`, which drew the Matchups board's calls, win chances, confidence, score predictions and records too until the board went on 22 October 2026), the Pick'em Record's headline tiles are Vegas's record, Power Ratings (the Team Rankings tab) rate each team on this season's results alone, every game re-scored at each build (every team 1500 at the start; a weighted ridge of all the season's finals solved together, each worth its margin capped at 17, home field out, plus the opponent's rating now, so a game counts for what the opponent has turned out to be, not what it was rated when they met; recent weeks weigh a little more, a 16-week half-life, and every team is pulled toward average as if it had also played 16 average games; blended 0.8 to 0.2 with each team's expected lineup on this season's player Elo, which walk-forward helped a little; every constant chosen on 2012-2017 and tested once on 2018-2025, where it predicts the next game as well as the margin Elo it replaced in October 2026 (0.6447 against 0.6454 blended), which judged each game once, on the opponent's rating that week (the owner's Falcons-over-Packers and Chargers cases); THE POWER RATINGS in `elo/build.py`, `teams` in `elo/data/model.json`, drawn by `betting/tools/ratings_viz.js` with each team's record (the season's results from `betting/state.json`, so it is current before the Elo file is; a rating that predates a final is starred, and the note says the whole table predates it, since a final moves every team), the tier shields, the change since its last game (`before` is the same solve on the finals before that game, so the change includes the league's results since and a team moves in a week it does not play) and the chance against an average team; the margin Elo had replaced the lineup-on-player-Elo table, which walk-forward on 2018-2025 predicted the next game worse, in weeks 2-6 no better than picking the home team), and the Props list's rows are in the board's columns on the prop model's own lines (app v122; the board itself went in app v128), a game's page head carrying its Vegas pick (the market's spread and total wherever a line is posted; app v122). The models are named on the page as Alpha Model (the main model), the Joker and the ELO Model (the Elo game model), Vegas the baseline (the Challenger and the Broly Model are off the site: the Betting loop); `betting/tools/build.js` renames the main model in the built app (`RENAME`), and `record_viz.js` and the pick-grid patch write the other names wherever the build draws them, never in the app's source. **One Vegas on the Pick'em Record** (25 October 2026, the same check): Vegas's pick on a game is the closing moneylines with
the margin out (the home side at 50% or more), else the spread's favourite (`rvVegasPick` in `record_viz.js`), on the
headline tiles, the legend, the week-by-week grid, the chart's wins against Vegas and the pick grid's Vegas column alike,
as the Game snapshot's `call` has it. Until then everything but the tiles took the spread alone, so a game whose spread
and moneylines named different favourites (week 6's NO at NYG: NO -1.5, NYG -112 to NO -108) gave Vegas 59-34 on the
legend and the grid and 58-35 on the tile, and every model's line against Vegas a game off (Alpha -2 for -1, the Joker
+4 for +5, the ELO Model +5 for +6). A week's header in the grid counts every game played, a tie among it (week 5 read
"14 games" of 15). Team Rankings lists clubs level on the Elo shown by the rating behind it (`p_avg`) and gives them one
rank, one more than the clubs above them, as the ELO tab's tables do since 22 October 2026, and the rank arrows read
those ranks (SF and KC, level at 1590, read #2 and #1, and SF's arrow ▼1 and CHI's ▲1 where neither had moved); the Game snapshot's and the matchup
bubble's Power Rating rank (`teamsOf` in `snapshot.html`) the same. The betting smoke holds all of it, on a game planted
with its spread and moneylines apart and a table with two clubs made level, and the nflbets smoke's own rank readers
follow. The Pick'em Record's chart and week-by-week table are drawn over the app's own by `betting/tools/record_viz.js` (wins against Vegas: each model's wins minus the Vegas favourite's on the same games, cumulative, Vegas the zero line; and a models-by-weeks grid shaded by record, every model's every week drawn alike), which the build puts in front of the app's script and `renderRecord()` calls last. Friends stand beside the models there (see "Friends' picks" below).  The X Bet Log is a bankroll, the same way: `betting/tools/bets_viz.js` (`renderBets()` is wrapped to call `betsViz()` after the app's own) draws its own chart with a switch, Balance (the account week by week from the deposit, a labelled reference line, green above and red below) or Weekly P&L (a labelled column a week from $0, a week off marked), leads the figures with the balance, and adds the balance after each week beside the table's running total, with no Note column since 22 October 2026 (the owner's call: "in x bet log please remove the note column section"; a week's `note` stays in the file, unshown, and the nflbets smoke holds the column gone and a note's markup drawn nowhere); the weeks and the deposit are X's, from `liveparlays/xbets.json` (see "X's parlays and the X Bet Log" below), read only, on the site owner's devices alone since 20 October 2026 (the admin link; on a visitor's page `XBETS.enabled()` is false, the frame is not read only and keeps the browser's own log, which no tab of the hub shows) (with no deposit in the file it is X's profit against break even, no balance), and the chosen view is each viewer's, kept in `S.bank` in the browser. The app source is never touched. `.github/workflows/elo.yml` re-rates daily, queued at 12:40 UTC, plus Saturday 20:40 and Sunday 03:40 UTC
for Sunday's calls on Friday's final report (GitHub starts this repo's scheduled runs 4-9 hours late, so a slot is queued
early enough to land before the London and 1pm kickoffs; Tuesday's run takes in Monday night; the rest move only who is
expected to play), runs `elo/check.py` and `elo/check_tab.js`, the gate on the Elo data, commits `elo/data`, and then
runs the nflbets smoke (skipped between the Super Bowl and the fortnight before week 1, when there is no game to call and
the smoke's Elo-picks checks have nothing to read): a page check, after the commit, so a page case the smoke has never
seen (a tied final, a top 25 of 24 quarterbacks, in October 2026) turns the run red without holding back the ratings.
What the files feed that touches a chance or a price is held before the commit by `check_tab.js`: market + form
(`eloAltP`, which decides whether a player leg qualifies for the suggestions) on every rated player, the Elo matchup
chance on every matchup line, and the Elo picks' four levels at the builder's own sums (`parlayProb`, `parlayDec`,
`PB_TIERS` and `pbOrder`, loaded from the props parts' source): on the real files the candidates the rule's, every
level its floor's rule, "likeliest" only under its floor, none worse than the best parlay of games all different and the
fast sums the parts' to the bit, and on fixtures of its own each level held to a full enumeration (F1 the candidate
rules, a -115 main line of better value leading a +150 touchdown; F2 four candidates, Extreme empty with its reason;
F3 ten correlated legs of one game where the quick reading misorders parlays; F4 the likeliest four legs all in
different games; F5 34 candidates whose favourites the 30 best by value would cut, Safe two of them since only their
pairs reach 35%; F6 twenty seeded one-game slates of 9 to 12 legs, their chances clustered at each floor, Safe's 35%
among them, which fail a search pruned at the floor itself; the check's own copy of the levels, `tiersOwn`, gives Safe
its 35%), on made-up book
prices, with no error thrown. Since app v138 (**DraftKings' chance on every leg**, under Props) market + form and F2-F6's
search are gone: `check_tab.js` holds the Elo matchup chance against DraftKings' fair chance, F1 the candidates' rule and
F2 the greedy prefix, the pairs DraftKings refuses, the legs moving against each other, its ties, the slot's summed lean
and the empty levels' words, each on
a fair chance of its own. The walk-forward record in `model.json` is the honest number: each season called by
a model fitted on the seasons before it. Do not tune the formula on the season in progress.

## College

CFB Hub (then X College Football Bets) moved to its own repo, `DEMON-X13/cfb-hub`, on 2026-10-14, with its history and
its own CLAUDE.md; `cfb/index.html` here only redirects to it.

## Hockey

X NHL Bets moved to its own repo, `DEMON-X13/nhl-hub`, on 2026-10-13, with its own CLAUDE.md;
`nhl/index.html` here only redirects to it.

## Bets and Stats: the loop

The tab bar (`TABS` in `nflbets/build/build.js`) is Props (the first tab since the Matchups tab went,
next: a load with no address opens on it), Suggested Parlays (Suggest Parlays until the owner's call of 17 October 2026, "tab name suggest parlay should be
Suggested Parlays", app v112: its button, its heading and every word a visitor reads that names it; its section, address
and `sp` names keep the old one; the prop model's own section `tab-suggest`, `#suggest`, after Props since app v111: the
next prime-time night's parlays and the Elo picks), Parlay Builder (the prop model's own Parlay Builder tab, `#parlay`: the builder, then its
choices and the Top 50 lines, the Top 30 from app v116 to v140), X Parlays (`#xparlays`, X's card alone), Team Rankings (the Power Ratings frame, renamed), ELO Ratings (the
Player Elo tab, renamed), Pick'em Record, X Bet Log (the Bet Log frame, still `#bets`); a prop model section with no button
there stays in the page, unshown. X Parlays and the X Bet Log are the site owner's tabs alone since 20 October 2026
(**The admin link**, below: `TABS`' fourth field marks them, and a visitor's bar is the other six, Props, Suggested
Parlays, Parlay Builder, Team Rankings, ELO Ratings and Pick'em Record; the admin's is eight).
**The Matchups tab went** (app v128, `props/build/patch_snapshot_button.py`, the owner's call of 22 October 2026: "i
think we are good to remove matchups tabs since most the important info was moved to props tab", and, asked where the
board's whole Game snapshot should open from once its rows were gone, "Button on Props"). Until then the bar began with
Matchups, the board (Pick'ems until the owner's call of 16 October 2026, "change the name Pickems to matchups"; its section
`tab-pickems`, its button id, its file and the `pk-` prefix kept the old name): Vegas's call on every game of a week on
nflverse's lines in six columns, Vegas's records, a week picker and a foot, each row the button to the game's Game snapshot.
Its row had been the Props list's since app v122 and three of the snapshot's cards opened from a game's page there since
app v124, so the board, its section, its script and its styles are gone, and the snapshot opened from a fourth button on
each game's page until app v129 took it off again the same day (the owner's call: "on second thought, i dont want that
game snapshot buttons. please remove it."), leaving the matchup bubble the one way in (**The Game snapshot**, below). Its file is **the page's glue** now, `nflbets/build/hub.html` (a few
styles and one closure, every name still `pk-`, set in by the build after the prop model's script): the season's one read
of `betting/state.json` and the Vegas call on it (`call`, `outcome`, `canProps`, `openOnProps`, `propsPlayers` and the rest,
handed to the Game snapshot, the matchup bubble and the Props list's `slateNeutral` as `window.pkBoard`; `ST.done` once the
read has answered, ok or not, `ST.err` where it failed, and a `pk-state` event on the document then), the betting app's
tag, colour, confidence-band and Elo-tier code lifted into its BETTING slot at build time (`window.pkTag`, `pkTierBadge`
and the rest, which the ELO Ratings tab, the snapshot and the bubble draw with), `probCols`, the Props tab's stamp in the
page's words (`window.slateStamp`: nothing until a read, "reading…" during one, then when, or "scores not loading" in red),
the scoreboard on load (next), the tabs as addresses (`routeTabs`) and the framed betting tabs (`frames`). Nothing on the
page draws a failed read of the season but the snapshot (below), and the framed tabs are wired either way. `build.js` stops
if `nflbets/build/tab_pickems.html` comes back or `hub.html` carries a section, if the page carries the board again
(`id="tab-pickems"`, `id="pkBoard"`, `pk-game`, `wireRows`, `PK_LIVE` or a landing on `'#matchups'` outside a comment) or the
bar a Matchups button or a `data-tab` of `pickems` or `matchups`, and unless the glue hands on the season (`window.pkBoard`,
`ST.state=st;`, the `pk-state` event), lands the board's old addresses on the Props tab as `#slate` (`OLD_ADDR`), reads
the scoreboard on load (`scoresOnLoad`) and the snapshot draws whole once the season is in (its `pk-state` listener); and
since app v129 it stops if a game's page opens the whole snapshot again (`b('snap'`, `FROMPAGE` or `kind==='snap'` in the
props parts or `snapshot.html`, all three of which app v128 required).
**The scoreboard on load** (app v128). The board read ESPN's scoreboard on every load (`PK_LIVE`, `readScores`), so a game
finished since the betting job last ran, or on, showed its score unasked, and the snapshot's standing read it. Now, once
the prop model is up (app-ready, and 300 ms), `scoresOnLoad` in `hub.html` reads it once for the Props list: one free read
of `${ESPN_SB}?seasontype=2&week=<the Props list's week>&dates=<SEASON>` (the read its Refresh scores makes, no credit, and
no box score, which a press reads for a kept parlay's game under way), and only where a game of that week
(`gamesIn(slateWeek())`) has kicked off by the page's clock with no score in the payload (`gameStarted`, `hasScore`), the
one case it can add anything, and none is running (`LIVE.busy`); with no game under way no scoreboard is asked on load at
all, and never on a timer. The read goes where a press puts it (`LIVE.games`, `LIVE.slate`), so the Props list's
final-score cells, the stamp and the Game snapshot's standing (`outcome`: the betting job's published result, else the
props job's final in the payload, the prop model's own row, so a final the betting job has not graded yet is drawn played
though no read is asked for it, else `LIVE.games` once `LIVE.slate`) show it; but it redraws nothing the visitor is using (the review of 22 October 2026: its first form pressed
the button itself, whose `renderSlate` rebuilt the list's rows, and the game's page where one was open, under the visitor,
taking the scroll lock from a window opened meanwhile and the focus off a row onto the page's body). The list is drawn
again with it only while nothing is open over the page (`pageBusy`: no `modal-open`, no `.modal` or X Parlays' dialog
shown, no game's page chosen; `listRedraw`), the focus put back on the control it was on in the Props tab (by its id,
else its first `data-` attribute, a row's `data-game`); otherwise the stamp says the read at once and the list shows it
the next time it is drawn (closing a game's page draws it). And `closeGameModal` (part3, app v128) takes body's
`modal-open` off only where no other window is still open, so no redraw of the list (a press, a Refresh odds read, a
kickoff) takes the lock from a window open over another part of the page. Nothing read is stored, and the week is still
settled by the jobs, from nflverse. The nflbets smoke's THE SCOREBOARD ON LOAD holds it on fixtures of its own at any hour
and in the off-season: a game of the list's week an hour past its kickoff with no score read once, of that week and no box
score, its score in the list, the stamp and the snapshot, and no second read; every game kicked off with a score, no read;
and the read held back while the visitor uses the page: with the focus on that game's row, the row drawn again with the
score and the focus on it; with that game's page open and the focus on its Matchup button (its Game snapshot button in
app v128), nothing drawn under it,
the page, the lock and that very button kept, and Back drawing the list with the score; and the list drawn again under a
Game snapshot opened from elsewhere keeping its lock. Its no-read fixture always plants a game of the week four hours past
its kickoff with a final in the payload and none in the season, so it bites on a weekday too, and holds that game's Game
snapshot played on the payload's score; and a game of the week at nflverse's neutral site that is no 9:30 kickoff,
Wembley, drawn "vs" on its Props row and in its snapshot's title, "Home (listed)" and "a neutral site" (the snapshot's
head held on the smoke's own rule, never the page's `neutral`). Every old address sends a visitor to the page at the site's root (the owner's call of
17 October 2026, above, when it moved there from `nflbets/`), by `location.replace`, so Back does not loop, with a link
for a browser without scripts: `nflbets/` with its own query and tab (`location.replace('../'+search+hash)`, so
`nflbets/#suggest` lands on the root's `#suggest`, and `#tracker`, `#pickems` or `#matchups` on the Props tab by the
page's own routing; no meta refresh), `pickems/` with its hash, `liveparlays/` and `live/` to `#xparlays` (these three
keep the meta refresh they had, pointing at the root too; `#xparlays` opens X Parlays on the admin's devices and lands
anyone else on the Props tab, and their link reads "These parlays have moved to NFL Hub."), and `news/` to the page, which
opens on the Props tab (each of those landed on the Matchups board until it went on 22 October 2026). The nflbets
smoke runs each in `vm` on the web and from disk, resolves where it lands against its own address (so a target one
folder off, `../nflbets/` or `../../`, fails), and holds its link, its meta refresh or none, that it loads nothing,
that it names `nflbets/` nowhere outside a comment and, since 22 October 2026, the Matchups tab, its board and Pick'ems
nowhere in the words a visitor reads (its text and title); it holds too that the root's `index.html` is the built page and not
the landing page, and that `nflbets/index.html` is no copy of the page. The Season Tracker tab is gone (the owner's call, 14 October 2026: its games are in the Game snapshot,
below), and so is the Matchups tab (above): the Props tab is the first tab, the bare address opens on it and stays bare,
and every old address of the board, `#matchups` (its address from 16 to 22 October 2026), `#pickems` (every bookmark from
before, and `pickems/`'s redirect) and `#tracker` (the Season Tracker's), lands on it, written over as `#slate`
(`routeTabs` in `nflbets/build/hub.html`, `OLD_ADDR`, by `history.replaceState`; until 22 October 2026 each landed on the
board, written over as `#matchups`; the smoke holds each, on an open page and on a fresh load, and that no text a visitor
reads names Pick'ems, the Matchups tab or the board, or Suggest Parlays), and the build stops if
`nflbets/build/tab_tracker.html` comes back. A tab's address is its button's
`data-tab`, so `#suggest` needed no routing of its own, and every address from before it (`#parlay`, `#slate`,
`#xparlays`) is as it was, but that on a visitor's page `#xparlays` and `#bets` land on the Props tab, written over as
`#slate` as an old address is (`routeTabs`, `ADMIN_ADDR`). On a phone the bar scrolls sideways,
and the chosen tab's button is brought into it on load, on a new address and on a tap (the bar scrolls, never the page).
**A window is its tab's own** (app v126, `patch_tab_leave.py`, found 21 October 2026 in Chromium: the Props tab, a game
opened, then Back or the address set to `#matchups` brought the Matchups tab up with the game's page still open inside
the hidden Props tab and body's `modal-open` kept, so the tab the address went to could not scroll, the focus on the
body). Every tab change passes through the prop model's switch (the `#tabs` buttons' click; `routeTabs` clicks the
button on a `hashchange`), and leaving the Props tab there closes the game's page as its Back does (`tabLeft`:
`closeGame`, so `S.ui.game` is cleared and saved; a page not open is left alone, so a switch before the payload is in
saves nothing; a load resets the view anyway). A focus the switch left on what it took off the screen (the game's page,
a window or a row of the old tab, read before the close, whose redraw replaces the rows) goes to the chosen tab's button,
never the page's body; a focus still on the screen stays, and with nothing focused none is made. Escape closes a game's
page only where it is on the screen (`gameShown`), so a key on another tab never touches the Props tab's state. The
other windows that live in a tab's section close the same way (`tab_elo.html`, each read against the section it lives
in): the Props tab's Mismatches list (Show more, `#peMmModal`) and the ELO Ratings tab's player and team windows
(`#pePlModal`, `#peTmModal`); X Parlays' `#lpAsk` and a game page's one-card window already closed on a `hashchange`,
and in app v128 so did the whole Game snapshot a game's page opened (`FROMPAGE`, gone with its button in app v129). The
whole Game snapshot the matchup
bubble opens is no tab's window (the bubble opens it from the Parlay Builder and Suggested Parlays, as the board's rows
did until 22 October 2026) and stays open over the tab the address goes to; closing it there gives the focus to the name
that opened it where that is on the screen, else to that tab's button.
The audit's G7 (on the prop model's own page) and the nflbets smoke's A WINDOW IS ITS TAB'S OWN (each window left by
the address with the focus in it, for the Pick'em Record (the Matchups tab until 22 October 2026), Escape
afterwards and on a game's page planted on the hidden tab, the bubble's Game snapshot across a move; the one-card window's
checks, and in app v128 the page's whole Game snapshot's, also hold the game's page closed and the window gone with it) hold it,
blocking.
**The Props list in the board's columns, and its old row at each game's head** (app v122, `patch_props_rows.py`, the
owner's call of 20 October 2026, "step 1 in a long process": "inside a matchup for the section I marked as a square, I
want to add the info in" the list's row, "and then on the main page in props I want to change the matchup to look like"
the board's row). The Props tab's game list (`renderSlate`'s rows, still `button.game[data-game]`, still opening the
game's page) is the Matchups board's row in the prop model's own names, and since the board went (22 October 2026,
above) the page's one list of the week's games: `sl-` cells under the board's six column heads (date, matchup, win
probability, confidence, score prediction, final score), at its widths, six columns on a wide screen and one card a game
at 900px and under; from 901 to 1,160px (the owner's window is 914) the columns are narrower and the win-probability bar
takes what is left, and the final-score column keeps 136px in every layout for a live "WAS leading 31–33", so the list
never scrolls sideways (the board did from 901 to about 1,100px until 14 October 2026) and nothing runs past a card's
edge. Its cells: the date, the matchup (the favourite's tag raised, a tick or cross on the winner's once it has won, "vs"
at a neutral site, `slateNeutral`: the betting job's schedule where the page's glue has the game, `window.pkBoard`'s
`neutral`, else a 9:30am kickoff), the win probability in the two clubs' own colours (`slateCols`, `probCols`'s rule in
`hub.html` on the prop model's tag colours), the board's old band (`slateTier`), the score prediction and the final score
(`slateResult`: the payload's score and whether the pick hit, else the scoreboard Refresh scores read, or the page's
own read once on load where a game of the week is under way, `scoresOnLoad`, else 0 : 0, LIVE or Final). Its numbers are
the prop model's own lines, the ones the game's page prices from, a Refresh odds press included (`slateCall`: the two
moneylines with the margin out, else the spread about `MARGIN_SD`, else with no line the model's own chance, marked;
a pick'em spread with no moneylines, no call), so a game can read a point or more off the Game snapshot's Vegas line,
`state.json`'s copy of nflverse's lines, which the betting job downloads at other hours (SF at ATL, 20 October 2026: 66%
here, 60% on the Matchups tab then); the
prediction is `gameCtx`'s score as the list always showed it, "even" where level. What the row showed until then
(kickoff, matchup, biggest projections, expected score, total points, Vegas pick, each with its actual once played)
is the head of the game's page (`gameHeadCard`, `.ghead`, where the card with the two tags was), under the list's
old headings, the six side by side and in three columns at 980px and under. The audit's A2 works every row's bar,
band, raised tag, prediction and final score out on its own and holds every head of the current week to `gameCtx`
and `gameHeadline`, with the two rounding cases on both; the nflbets smoke holds the column heads, every row's
colours and numbers on its own reading, the scoreboard's over and live games after Refresh scores, the head of the
game it opens and the layout sum, blocking: jsdom lays nothing out, so `smoke.js` sums each layout's least column widths,
its gaps and the card's padding against the page's content, less a 17px classic scrollbar, at that layout's narrowest
width (one past the middle layout's max-width, 1,161px, for the wide one; 901 for the one between), fails unless there is
exactly one layout between the phone card and a wide screen, and fails a final-score column under 136px or narrower than
the wide layout's (it held the board's the same way until the board went).
The page, the root's `index.html` (`nflbets/index.html` until 17 October 2026), is the prop model's page (part1 + part2 + part3, assembled by
`nflbets/build/build.js` the way `assemble.py` assembles it, its payload named from the root, `props/data/payload.json`) with the page's glue,
`nflbets/build/hub.html`, set into it (its styles and one `pk-` closure; until 22 October 2026 the Matchups board was set in
front of it there as its own `pk-` prefixed section), and the X Parlays section lifted out of
`liveparlays/build/page.html` into a section of its own, `tab-xparlays` (styles scoped to `#lpCard`,
script in a closure): X's card (`#lpCard`, X's placed parlays from `liveparlays/parlays.json`, read
only, a parlay marked `cleared` left out, a quiet line under the heading saying when the file last
changed; a settled parlay, gone or with every game over, last and in full under Finished, which says
each clears itself the day after its last game) and nothing else, drawn and read on the admin's browser alone since 20
October 2026 (`lpAdmin`, `window.lpAdmin`: on a visitor's page the section asks for neither the file nor ESPN's scores,
`draw()` and `refresh()` return at once, and the page's app-ready listener draws it only for the admin).

Every card on it, live or settled, has an X at its top right (the owner, 12 October 2026: "all of this
should look the same for everyone", on every device that shows it, the admin's since 20 October 2026), a 44px button named "Clear this parlay" that keeps clear of the
header's chips on a phone. It opens a small window, `#lpAsk`, asking "Clear this parlay?", naming it
(legs, week, price) and saying it is cleared from this device only and that X's parlays clear
themselves the day after their last game ("for everyone" until 20 October 2026), with Cancel and Clear (Escape, Cancel and a
click outside clear nothing; Tab stays inside; the focus goes back to the X; a tap within 0.4 seconds
of it opening, a double tap's second, neither clears nor closes; it scrolls when taller than the
screen; leaving the tab closes it). Clear takes the parlay
off X Parlays in that browser alone, its games no longer read: its id, with when, goes into the
section's own key, `lp_cleared_here_v1`, never a retired one, which `storage.js` never removes (the
build refuses one that names it) and which is pruned on every read of the file of any id the file no
longer has or has cleared itself. Every change starts from what storage holds then, so two tabs of the
site in one browser never write an older list over each other, and a tab follows the other's change
(the `storage` event). With some cleared, "None of X's parlays is still live" becomes "None of the
parlays shown here is still live", since a cleared one may still be running. Nothing is sent anywhere: there is no
sign-in, token or shared store (the admin link, next, only says whose browser it is and writes nothing anywhere), and a
parlay leaves the page on every device only by the file (`"cleared": true`, by hand or by
`autoclear.py`). With some cleared a quiet line at the foot says how many, with Show it (them) again;
with every one cleared that line is the card ("You cleared 2 parlays on this device"), and Show them
again empties the list with no window. `smoke_live.js` section O holds all of it, on the admin's browser.

**The admin link** (`nflbets/build/admin.js`, the owner's calls of 20 October 2026: "okay maybe we can do that and move X
Parlays and X Bet Log in there for my eyes only", and then "Hide only, build it": the tabs hidden, the files left
public). `https://demon-x13.github.io/nfl-hub/#owner=<his Odds API key>` makes the browser it is opened in the
site owner's: X Parlays and the X Bet Log on its tab bar, and Pull from DraftKings on its parlay card. It is **hide only**:
the two files stay where they are and stay public by address, and anyone could hand-write the stored record and see the
two tabs; what it protects is the key, which never leaves the admin's browser except to `api.the-odds-api.com`. The owner
is told, and this says, that the link stays in the browser's own history and address-bar suggestions where it was opened,
and that the browser's storage on `demon-x13.github.io` is shared by every one of his hubs' pages. `admin.js` is set into
the page's head right after `theme.js`, before every style, the body and every other script, an IIFE in `theme.js`'s
style. Only the fragment counts (`#owner=K`, or `#xparlays&owner=K`, which keeps `#xparlays`), never `?owner=`, which a
browser sends to GitHub: the key is taken off the address at once (`history.replaceState`, else `location.replace('#'+the
rest)`, the `file:` fallback), and a link pasted into an open tab is caught by its own `hashchange` listener, added before
the tab bar's, so the tab bar only ever sees the cleaned address. A key that is not 16 to 64 letters and digits is refused
with no request (the retired owner link's `the-old-owner-secret` among them: "That admin link was refused."); any other is
checked once, free, `GET https://api.the-odds-api.com/v4/sports/?apiKey=K` (no-store, no referrer, no header, an 8-second
abort): a 200 keeps it, checked, with the credits left from `x-requests-remaining`; a 401 `INVALID_KEY`,
`DEACTIVATED_KEY` or `MISSING_KEY` refuses it, nothing kept ("The Odds API refused that admin link.", for that load);
`OUT_OF_USAGE_CREDITS` keeps it with 0 left; a 429, a 5xx, a timeout or a network failure keeps it unchecked (`ok:null`),
checked again quietly on each load until answered (a 200 marks it checked, a refusal signs the browser out). Once kept,
the page reloads at the tab the link named (put back on the address once the page is parsed), so the X tabs, their files
and the frames only ever see the state a load began with; a link whose key is the one already kept, checked or waiting,
asks nothing: on a page that loaded as the admin's it costs nothing, no request and no reload, and on one that loaded as
a visitor's (another tab of the site kept the key after it loaded) it reloads once, with no request, at the tab the link
named, put back on a task of its own after the tab bar's `hashchange` has written a visitor's `#xparlays` over as
`#slate` (`#matchups` until 22 October 2026; until the review of 21 October 2026 it did nothing there, and the owner's link looked broken). The record is this browser's own storage under `nflhub_admin_v1` alone (a name no retired layer used:
`storage.js` never reads, writes or removes it, and the build refuses it if it names it), JSON `{k, at, ok, checked,
left, leftAt}`: a record with `ok:false` (The Odds API refused the key since) loads as a visitor, and anything else under
the key, or storage that throws, reads as a visitor and throws nothing; never `S`, never another key. Admin at load,
`html[data-admin="on"]` is set before the body is parsed, so the first paint is the admin's or the visitor's, never one
then the other. `window.HUB_ADMIN` is the one code on the page that holds the key or sends it: `on()` (fixed at load,
false after Sign out), `info()` (the record without the key), `odds(path, params, signal)` (a GET of
`sports/americanfootball_nfl/events` or of an event's odds, `/<32 hex>/odds`, and nothing else, the key added by it and a
caller's `apiKey` refused, no-store, no referrer, 15 seconds unless a signal is handed in; resolving `{status, ok, json,
code, left, used, last}` from the `x-requests-*` headers, the credits left written back to the record; a 401
`INVALID_KEY` or `DEACTIVATED_KEY` marks the record `ok:false` and fires `hub-admin` `{refused:true}`), `credits()` (the
free check, `{left, used}`) and `signOut()`, with a `hub-admin` event on the document whenever `on()` changes or the key
is refused. The header's stamp has an empty `#hubAdmin` right after the light/dark switch (`.hub-admin`): on the admin's
page an Admin mark (`.ha-mark`, gold, its title when the key was checked and the credits left as of when) and Sign out (a
`<button>`, `data-admin-out`, `.ha-out`, a 44px target from padding a negative margin takes back out); on any page that
opened a refused link, its one line (`.ha-msg`, `role="status"`); on a visitor's, nothing. The place is the stamp's
first line, over when the data was built and the build tag, and on a screen wider than a phone the stamp keeps 56px
clear on its right for the switch (`theme.css`, the owner's screenshot of 24 October 2026, "top right thing in admin page
is all squished": once the tagline went on 22 October the stamp rose into the switch's corner, the switch covering the
end of "Updated ..." and the build tag on every page, and the Admin mark and Sign out, laid out of the flow on the
switch's row until then, sat on top of "Updated ..."); on a phone it sits under the wordmark as before. Sign out asks ("Sign out of admin on this device?"), removes the record and nothing else, takes the two tabs off the
bar (an open one landing on the Props tab, written over as `#slate`; on the board until 22 October 2026), empties X Parlays and drops the card's Pull, with no reload; another tab of the
site signing out is followed, writing nothing, and one signing in waits for this tab's next load (or the link opened in
it). The two tabs' buttons
and sections carry `data-admin-only`, hidden from the first paint unless `html[data-admin="on"]` (`theme.css`); on a
visitor's page `routeTabs` takes the buttons off the bar before anything wires them, and both sections stay in the page
(the X Parlays section's script wires its window as it loads, and with it gone would throw and take the builder's Finish
with it). A visitor's page reads neither file: X Parlays asks for nothing (`lpAdmin`), and `xbets.js` reads
`liveparlays/xbets.json` on the admin's browser alone (`enabled()` false and `ready()` at once on a visitor's), while
the retired store's X Bet Log copies (`xbets_cache_<season>`, `xbets_joined_<season>`) go on every load. `build.js`
refuses a page where `api.the-odds-api.com`, `apiKey=` or the quoted `'nflhub_admin_v1'` appears outside `admin.js`
(comments included), a page carrying `apiKey=` with a key after it anywhere, a parlay card that names the API's host,
`apiKey`, any browser storage, `fetch(` or the record's key (it reaches The Odds API through `HUB_ADMIN` alone), an
`admin.js` that uses storage for anything but its record, fetches anything but The Odds API's v4
base, or carries `XMLHttpRequest`, `sendBeacon`, `credentials`, `sessionStorage`, `indexedDB` or another key's name, and
holds the two `data-admin-only` buttons and sections, the header's slot and the hide rule. `node nflbets/build/smoke_admin.js`
(about a minute, blocking, on fixtures of its own at any hour; in the props gate's job C) holds all of it with every
request recorded and The Odds API stubbed (a key it takes, a refused key, a network failure, a 429, no credits): the
build; a good link (the address cleaned before the body is parsed and before the tab bar reads it, `#xparlays&owner=K`
keeping its tab, exactly one free GET no-store with no referrer, the key kept, the reload, a link pasted into an open
page, a link pasted into a visitor's tab after another tab kept its key, checked or not yet, reloading it once with no
request at the link's tab, the `file:` fallback); a refused link; an unchecked key checked again; the admin's page (data-admin before the
body, eight tabs, Props first (nine, Matchups first, until 22 October 2026), the switch then the mark and a 44px Sign out, X Parlays drawn and the X Bet Log read, both no-store, no
Odds API request on load, `odds()`'s two paths only, a refused key marked); Sign out and another tab's; a visitor's page
(six tabs, Props first, the bare address left bare on it, `#xparlays` and `#bets` landing on the Props tab, written over
as `#slate`, on load and in an open page, no request for either file, for
X Parlays' scores or to The Odds API, nothing of the admin's place drawn); what never makes an admin (`nflowner_v1`,
junk, an `ok:false` record, storage that throws, the old owner link, refused, and its twin on the admin's browser); and the
key nowhere but in requests to The Odds API (never in `S`, another key, the address, the history's state or the DOM).
The betting smoke holds the X Bet Log frame on a visitor's page (its `XBETS.enabled()` false: not read only, the
browser's own log, nothing of X's).

**Suggested Parlays** (`#suggest`, the prop model's own section `tab-suggest`, `#spPanel`, after Props: app v111,
`patch_suggest_tab.py`, the owner's call of 16 October 2026: "in safe/med/aggro/ext parlay leg section get rid of
the lock and do similar tracking/grading as ELO tracking. Do a section for Thurs night, sun night, and monday night
games ONLY. do absolute best suggestions. each line item allow to add to parlay builder. call new section tab
'Suggest Parleys'."; renamed Suggested Parlays and shown one night at a time by app v112, below). Each game of the
week still to kick off that starts on a Thursday, Sunday or Monday at or
after 7:00 pm US Eastern (`spPrime`, on the schedule's `g.d` and `g.t`, which are Eastern; `spGames`: Thursday,
Sunday and Monday night football, both games of a Monday doubleheader, Thanksgiving's night game and a Christmas
night game on one of those days; never a day game, never a Saturday or a Friday) gets a set of its own (the tab sets
out only the next night's, from its morning: **One night at a time**, below; the record takes every one), the four
levels the Parlay Builder drew over every game until that day, each built from that one game's lines alone, a
same-game parlay priced by the builder's own sums: Safe, the likeliest 2-leg parlay; Medium, Aggressive and Extreme,
the 3-, 4- and 5-leg parlay with the best expected return (chance times payout) that lands at least 25%, 12% and 5%
of the time by the model's chance (`PB_TIERS`; since app v138 by DraftKings' fair chance, the least costly parlay that
lands so, its negative expected return stated: **DraftKings' chance on every leg**, under Props); where no parlay of a level's size reaches its floor with any count
of thin legs, the likeliest parlay of that size instead (`pbLikeliest`, chosen as Safe is: the fewest thin legs,
then the highest chance by the builder's own sums), marked `likeliest` and ruled "the likeliest 3 legs" (4, 5) on
its card, with its chance and price and no note about the floor (the owner's call, October 2026: every level shows a
parlay; the audit and the smoke work each such level out in full against every parlay of its size wherever its legs
are a plain product). A set is built on every bet type whatever the Parlay Builder's boxes say (`SP_ALL`), so the
page and the record agree, and searched as hard as one game allows, which is the owner's "absolute best"
(`SP_SEARCH`: each list to 60 legs, a beam of 200 by return and by chance and 400 for the likeliest, its best 4 and
10 worked by the real sums, where the all-games panel ran 40, 12, 24, 3 and 8): about a second a priced game in
jsdom (week 5's Bills at Rams, 26 legs, 1.1 s), most of it the real sums' draws, so the page builds a game's live
set only while the tab is on the screen (a hidden tab draws what is already built, else "Built when this tab is
open."), and a load of the hub pays nothing for a tab nobody opened. A leg qualified, until app v138 (since, on its
fair chance alone, 45-97%, one side a line, none a Value pick), as a suggested leg always had
(a real price, or one from DraftKings' line read on ESPN on a tested kind at the formula's price, est., under Props,
"Refresh odds": until app v125 only on a payload baked before `dk`, after a press; since, from the props job's
published read or a press, on every payload, **Reversed in app v125**; the model's chance 45-97% and 3 points above the
chance that price implies, the book's margin left in, market + form agreeing on a player leg: `formAgrees`; the
far-off guard, below; nobody V6 keeps out, through `pricedLegs`), and since app v109, wherever the payload carries
DraftKings' ids, only with DraftKings' id at its own line (`dkIdOf`), so every leg a level suggests goes on
DraftKings' betslip (the owner's call of 16 October 2026: under Props, "Every suggested leg on DraftKings' slip";
dormant since app v125, when the paid pull ended and an entry a read makes never carries ids, so a set's player legs go
on DraftKings by hand, or by Pull from DraftKings on the admin's card);
those are the Value picks, each marked Value (below); where they cannot fill a level, the fewest legs the model still
rates at or above the book fill it (the thin legs), unmarked (until app v113 with a line under the level saying why
they are not Value picks and what each kind lacked, `pbThinLine`: "One leg is not a Value pick: the model rates it at
or above the book's price, but not 3 points above."; a team bet has no market + form; a set's cards draw it no more,
**Without the long paragraphs**, below), an id held to them the same; never a leg
below the book (a `dkline` leg's book is its estimated price). A level with a player leg priced from DraftKings' line
read on ESPN (the published read's or a press's; until app v125 a press's alone, on a payload baked before `dk`) marks it
est. and says its price is estimated and why; a team leg is DraftKings' real price from ESPN's scoreboard, with the id
the read carried. A game total has no edge (it is the book's own chance), so it is
never preferred or thin: the game's total is a third list, the market legs (`pool.mkt`), taken only where the legs
with an edge cannot make a level of its size, those legs then the base and the totals the only fill (`pbTier`), never
a Value pick, unmarked (until app v113 with a line saying why, `pbMktLine`: "The game total is at the book's own chance
with its margin out, so it is not a Value pick: it is here because this game's other legs do not make a parlay of this
size.", the sets' reason, `mktWhy`, which read "this game's legs with an edge do not ..." until app v112's second
round; a set's cards draw it no more; `pbTierCard` still draws both lines on a card it is not told to keep quiet, with
the reason it is passed, else "your picks' other legs do not make a parlay of this size", which the audit, M2, holds on
cards of its own with the sets' reason and the smoke on a card of its own drawn as the Elo picks draw theirs with no
reason, word for word, blocking); a total takes the id rule
too. One side (to win or to cover)
and one total, which a book takes on one ticket and which are unrelated (`legRho`), one leg a player, no line twice.
A level is empty only when the game does not make that many legs, and then says why (`spWhy`: since app v125 "Only 3
legs in this game, and no player lines yet: DraftKings had posted none for it when its lines were last read from ESPN
(Tue 8:07 AM ET).", or "... its DraftKings lines have not been read from ESPN yet.", `spNoPl`; until then "... and no
player prices yet: they are pulled on Saturday morning.", a game's player prices, and DraftKings' ids with them, coming on
the day of a Thursday or Monday game and on Saturday morning for Sunday night's; "... that DraftKings' betslip can take"
where the dormant id rule left legs out), never a smaller parlay. Its chance and price are the builder's own (`parlayProb`,
`parlayDec`, same-game legs priced together), worked on the legs in the builder's order. Each level is a card
(`pbTierCard`, drawn quiet, `o.quiet`, since app v113: under its legs only the est. line where a leg's price is an
estimate and a ruled-out level's Updated line): the book's fair chance first and the model's beside it, the price and what the Bet amount pays, then
its legs, each with its own **Add** (`data-pb-leg`, 44px, `aria-pressed`, named for the leg: "Add Bo Nix, Over
224.5 passing yards, to the builder"), which puts that one leg in the builder by `toggleLeg`'s own path, so the builder
prices it as it always has, and reads Added while it is in, a second press taking it off as on a game's page, the
focus kept on it; then **Add to builder** (`data-sp-add="<game id>:<level>"`, exactly the level's legs into
`S.parlay` on the Bet amount, so it shows the same numbers and pays what the level said) and **Finish**
(`data-pc-finish="sp|<game id>:<level>"`, the parlay card on the Bet amount), each named for its game. The tab's one
control is Refresh odds (Odds, its status line beside it); its Bet amount is the Parlay Builder's. A set is cached
on its game's kickoff and the data (`SP_CACHE`, `spSig`, with `pbDataSig` and so `ESPN_SEQ` in it), and a game that
kicks off while the page is open leaves the tab (`pbWatch`). With no prime-time game left to come the tab says so.
The Elo picks (under "Player Elo: the loop") are its last section, `#pbElo`, since 18 October 2026 Suggested Parlays'
own four levels on the Elo chance, ranked on value, still on the
Parlay Builder's ticked games and player sides, each leg with its own Add too, led since app v113 by one sentence, "Players
whose Elo matchup beats the book's price, on the games and player sides ticked on the Parlay Builder tab." (until then a
paragraph on the matchup nudge's record and the fair chance), which the nflbets smoke holds word for word.

**One night at a time** (app v112, `patch_suggested_night.py`, whose docstring is the design, the owner's call of 17
October 2026: "also can you just show the next night game dont stack the mondy night game until monday morning"). The
tab sets out the games of the next prime-time night still to kick off and nothing later: `spNight()` takes the
Eastern date (`g.d`) of `spGames()`'s first game and every game to come on that date (both games of a Monday
doubleheader are one night), and the night is up from `SP_OPEN_H`, 6:00 AM Eastern (the day's offset by
`easternOffset`), on the day after the latest prime-time night before that date anywhere on the schedule (`S.sched`,
any week, played or not); with none before it, at once. So Sunday night's set goes up on Friday morning, the morning
after Thursday's game, Monday night's on Monday morning, after Sunday night's, and Thursday's on Tuesday morning,
after Monday night's: on the payload of Saturday 17 October 2026 the tab sets out `2026_06_DAL_GB` alone, from its
kickoff to 6:00 AM Monday Eastern (10:00 UTC) the line naming `2026_06_WAS_SF`, and from then its set. `spOn()` is
that night's games once it is up, else none, and it is the one place the tab asks which games it sets out. Until the
night is up the tab draws one line in place of the sets, saying which game is next and when its set goes up
(`p.sp-wait`, `data-sp-wait` the instant, `data-sp-next` the games' ids: "Next up: Monday night, Commanders at 49ers.
Its set goes up Mon 6:00 AM ET, the morning after Sunday night's game.", "Their sets go up" for two games); with no
prime-time game left to come it says so as before (the tab's lead said one night is shown at a time until app v113 took
the lead off). The page builds a
set only for a game it sets out (its own copy at the lock, where the record has none, among them), a level's Finish
(`spTier`, which the parlay card reads) finds only a game `spOn` sets out, and `spState()` carries `on=` and the games
set out, so the half-minute look (`pbWatch`, through `pbStale`) redraws an open page at the 6:00 AM turn. The record
is untouched: the props job still takes, locks and grades every prime-time game's set by `spGames` and `spSet` (under
Props, the suggestions record), shown or not. Each check works the rule out on its own copy through the time zone
database (`Intl`, America/New_York), never the page's `spNight` or `easternOffset`, at the page's clock. The audit
(`holdSets` on the week as it stands, and M11 on made-up nights of 2019 of its own: a Saturday night and a Sunday
afternoon game that are no prime-time night, a Monday doubleheader, a Thursday in the next week and the Sunday the
clocks went back, the page's clock moved to each moment) holds which games are set out (drawn and `spOn`), the wait
line's instant and games, `spTier` finding a level only of a game set out, and the redraw at the turn (`spState()`
moving with no game kicked off, `pbWatchTick` redrawing once), all blocking, and the line's words and the sets'
kickoff order as warnings (`W.wording`, `W.order`). The nflbets smoke (`nightOwn`, on the week as it stands and on
made-up games of its own: the Thursday alone, then the Sunday night's line and set, then the Monday doubleheader's)
holds the same and, on its made-up games, `spState()`'s `on=` token, and since it has no warnings the line's words and
the order fail it too; its copy keeps two games at one kickoff in the schedule's order, as the page does, never by
game id. `smoke_live.js` holds only its Thursday night fixture's night (`nightOpenL`): before that night is up, no
set and one wait line whose instant, games and words are the rule's, and `spTier` null for its Safe, blocking; once
it is up, that game's set and no line. A check that needs the cards of a game the rule hides at that hour (each
smoke's card checks, the audit's `spAllOn`) stands `spOn` in with every prime-time game to come (`spGames`) and puts
it back after (the audit in `try`/`finally`, so a section that throws leaves nothing stood in for the next; the smoke
on its own path, since a thrown error ends the smoke at once), so it holds at any hour of the week.

**Two sections, the Sunday slot and each set's own Elo picks** (app v118, `patch_slots.py`, whose docstring is the
design, the owner's calls of 19 October 2026: "i noticed that the elo picks section in the suggest parlays tab does not
have a record anymore and did not have any picks yesterday. any reason why? I would like it to have ELO picks for the slot
of Sunday games. also i noticed there is only records for this week, can we retroactively look back and find what we would
have suggested and count it to the record?", and then "if you can also backfill the records for the suggested parlays as
well. but maybe for that one do a separate section for night games and then the sunday slot of games"). The Elo picks had
been one set at the tab's foot over the games and player sides ticked on the Parlay Builder tab (`pbAllows`), so with the
priced Sunday games unticked there they were empty all of Sunday 18 October, and they never had a record (the sentence
app v113 took off their lead was the matchup nudge's record). The tab was then two sections, `section.sp-sec`, Night games
(`data-sp-sec="night"`, the night rule's games as before) and the Sunday slot (`"slot"`), each headed `h3.sp-sech` with its
own record (`.sp-rec[data-sp-recsec]`, below), until app v129 made it one (**One section, Night games, and one record**,
below). The Sunday slot (`spSlotUnit`, `spSlotNext`) is every Sunday game of a
week kicking off before 7:00 pm Eastern (the 1pm and 4pm windows and a game abroad that morning), in kickoff order, one
set of the four levels across them, built as a night game's is (`pbPool` on the slot's games, `SP_SLOT_SEARCH`, every
rule a set's leg keeps), id `<season>_<WW>_SUN`; it goes up by the night rule's own opening (`spOpenAt`: 6:00 AM Eastern
the morning after the prime-time night before its Sunday, so Friday's, a wait line before it), locks 2 hours before its
first kickoff, and stays on the tab to its last kickoff, from its first kickoff under way (`data-sp-phase="under"`: its
levels as they locked, with no Add, Add to builder or Finish, `pbTierCard`'s `o.acts` false, and `spTier` finding none),
then gives way to the next week's wait line. Nothing of the page's own is built once the slot is under way (a set built
then would be of the games left, never locked: with no record entry and nothing kept, one line, "... Under way since
<time>. The site’s set was not published in time.", and no card; a set this browser kept before its first kickoff is shown
under way with its own note), nor at any lock before the Elo files are in (a set built without the ratings has no player
legs: "Loading the site’s set…" until they are), and no level is built again for a player ruled out once it is under way,
as the record replaces none after the first kickoff. The record is read again whenever a unit reaches its lock with the
page open, or is first seen at or past it (`pbWatchTick`, `spSides`: each unit's side of its lock in `spState`, l, k, u
under way, w not up yet), so a slot read while it waited, or a tab hidden through its lock, takes the record's locked set.
A night game or the slot is a unit (`spUnit`: a schedule game, or the slot's
object with `games`), and every set function takes one (`spSet`, `spShown`, `spRebuild`, `spLedgerOf`, `spLegIn`, the kept
browser copy, `spState`, which carries the slot's side of its opening, lock and first kickoff, `spOnAll`). Each unit
carries its own four Elo picks under its model parlays (`h5.sp-sub` Model parlays, "Parlays" since app v138, then Elo picks, each `.pb-tiers` with
`data-sp-kind`): the ELO tab's four levels on that unit's games alone (`window.eloUnit`, `eloCands`' `games`, no
`pbAllows`; each empty level saying why, where the unit has no player lines when DraftKings' lines were last read from
ESPN, or that they have not been, `spEloSet`; until app v125 when its player prices come), drawn
with the ELO tab's card options (`window.eloCardOpt`: the Elo chance, each player's shield, the rule; since app v138 the
shield, each leg's Elo lean and the rule, no chance: **DraftKings' chance on every leg**) and the set's own
buttons (`data-sp-add="<unit>:elo-<level>"`, `data-pc-finish="sp|<unit>:elo-<level>"`, the card's kicker "Safe Elo pick
· the Sunday slot"), their mismatch tags put on after the draw (`eloDecorate`, wrapping `renderSp`); live before the
lock, then the record's (the entry's `elo`), else this browser's own built once and kept beside the set
(`props_sp_lock_v1`'s `elo`, `eloOwn`, said in one line), a level holding a player ruled out after the lock built again
as a model level is. `#pbElo`, `eloSuggest` and `data-pb-elo-add` are gone, and `window.eloPicks()` (every game, no ticks)
is kept for `check_tab.js`. The props job's record takes them (under Props, the suggestions record: each entry's `elo`
beside its `tiers`, and the `slot` map). The record at each section's head (`spRecSum(L, sec, kind, B)`, `spRecHtml(sec)`)
is two rows, Model parlays and Elo picks (`data-sp-reckind`; the first named Parlays since app v138), a pill a level (`data-sp-rec="<sec>:<level>"`, the Elo picks'
`elo-<level>`), each unit's level counted once, from the record wherever it holds that unit's levels of the kind (all
four as it took them, so a level with no parlay or still pending is the record's) and else from the backtest
(**The backtest**, next), each pill's title saying how many came from the backtest and the wins expected by the book's
fair chance and by the level's own chance (the model's, or the Elo's), with one chip, `data-sp-rec="<sec>:bt"`, "Incl.
backtest, weeks 3–6", wherever some of it was, until app v129.

**One game a parlay, and the pairs DraftKings refuses** (app v121, `patch_dk_sgp.py`, whose docstring is the design, the
owner's calls of 19 October 2026: "The book won't let you combine legs that depend on each other. If your parlay already
has a receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets blocked", "Some
combos contradict each other, like QB under 1.5 passing TDs alongside two of his receivers to score", and then "the legs
need to be part of the same game parlay only, and anytime there's a mix it bombs the hyperlink. also thinking about maybe
adding links for each individual one may reduce the issues?"). Of the 121 suggested parlays the record and its backtest
held that day, 5 paired a quarterback's passing TDs with a teammate's touchdown, every one an Elo pick. `dkClashWhy` (with
`dkClash`, `dkClashPairs` and `DK_CLASH` in `part3.js`, on `window` too): two legs of one game DraftKings will not take on
one slip, a quarterback's passing touchdowns, over or under, a main line or a rung, with a teammate's anytime touchdown
(`td`), or his passing touchdowns over with the game's total (`total`). No suggestion takes such a pair: `pbFits` (every
level's search: the all-games levels, each night set, each Sunday slot game's set), a game page's hands (`gameTiers`' own
`fits`, the engine drawn nowhere since app v124) and the Elo picks' search (`epScan`'s `P.cl` in `tab_elo.html`, whose empty level says "No 3 of the 3 players in
this game go together on DraftKings’ slip: it takes no quarterback’s passing TDs with a teammate’s touchdown."). The
Sunday slot's levels are each one game's legs: the slot builds each of its games' own set exactly as a night game's is
(`spSet` on the game, `SP_SEARCH`) and each level is the best of theirs (`spSlotBuild`, `spSlotBetter`: a parlay before
none, without a game total before with one, its floor met before the likeliest of its size, the fewer thin legs, then the
better expected return where it met a floor, else the higher chance, then the earlier game), its empty level said of "any
one game of the Sunday slot" (`spWhySlot`), its Elo picks chosen the same way per game (`eloUnit`'s `perGame`,
`epSlotBetter`), and each of its cards naming its game (`span.pb-tgame[data-pb-tgame]` in `.pb-th`); a level built again
for a player ruled out is built the same way, one level from each game's lines as they stand, never the cache
(`spSlotLevel`), and the record takes the sets as before (its slot entries before app v121,
and the backtest's weeks 3 to 6, stay as they were built, across games). The slot costs a priced afternoon game's set
each, about a second and a half in jsdom (week 6's three priced afternoon games: 5 s, where the one search across the slot
took 0.8 s), paid only while the tab is on the screen and once a publish or a press. A level's totals fill counts the legs
with an edge as one parlay can take them (`pbMaxFit`: one leg a player, one side and one total a game, less the most
refused pairs that can be had apart, a bipartite matching), so a level whose quarterback and teammate's touchdown cannot
both go takes the game total in their stead; and a level a game's legs make in number but not on one slip says so ("No 4
of this game’s legs go together on DraftKings’ slip: it takes no quarterback’s passing TDs with a teammate’s touchdown, or
his passing TDs over with the game total.", the slot's "No 4 legs of any one game of the Sunday slot go together ...").
The builder says what DraftKings will refuse: a
line where two of its legs are such a pair (`data-pb-clash`), and on the hub, where its legs mix a same-game parlay (two or
more legs of one game) with legs of other games, that DraftKings' betslip link does not open that mix (until app v123;
since, that it may not) and the parlay card gives each game a link of its own (`data-pb-multigame`, read off the card's own plan, `dkSlipPlan`, so only the legs that
go on the slip count, and only where the legs are of one week, as Finish asks). The parlay card (`card.html`'s `dkPlan`: `games`, `multi`,
`clash`) then had, until app v123, no link for every leg but a button for each game's (`#pcDkGames`, `a.pc-dkbtn[data-pc-dkgame]`, its
legs in the card's order, each titled with its own game's read; while the card checks DraftKings' lines as it opens,
the waiting Open in DraftKings alone, since the read can change the plan), says why, sends a link per game in Share
link's text ("Links copied" where it copies them), and on every card with two or more legs on the slip lists every leg's
own link, a 44px row each, a leg converted to DraftKings' number saying "(on DraftKings as Over 64.5 receiving yards)" (`ul.pc-dklegs`, until app v121 a row of numbers,
"One leg at a time: 1 · 2 · 3"), and names any pair DraftKings may refuse (`data-pc-dkclash`). A parlay of one leg a game
is a plain parlay and still opens as one link (the owner's word was for the mix; if those fail too, split them as well).
Since app v123 (`patch_dk_all.py`, the owner's call of 20 October 2026: "can we add a different color button for all legs
parlays on top of the individual ones? id like to still test those but have the inidividuals as a fallback plan") a mixed
parlay keeps its all-legs link too, first and in ice where the games' links are the hub's gold (`#pcDk` with
`.pc-dkall`, "Open all 3 legs in DraftKings", or "Open 3 of 4 legs in DraftKings" with a leg to add by hand; dkPlan's
`all`; theme.css's `.pc-actions .btn.pc-dkall`, ice with dark text, white on the light look's darker ice, a row of its
own so the games' links read as the fallback under it; the card's link buttons take the hub's focus ring), titled and
said in the note to be a try DraftKings may not open, the games' links there for when it does not; the focus on the
waiting button stays on it once the check settles, the status line then "DraftKings’ lines checked: the all-legs link
tries 5 of the 7 legs on one slip, and the 2 games’ links open them a game at a time.", Share link sends it first
("DraftKings betslip, every leg on one slip (...):", "3 of the 4 legs" where a leg is added by hand) and the games'
links under "Each game on its own:", and the builder's line says DraftKings "may not open that mix as one" and that the
card gives each game a link "beside one that tries them on one slip".
The audit (its own `clashAud`, fill and slot rule; M16 on made-up games), the nflbets smoke (`clashOwn`, the slot's one-game rule
and the Elo picks' per game, the builder's notes, the card's buttons on made-up ids), `smoke_live.js` section J (the card's
buttons, per-leg list, Share link text, clash line and Tab order) and `elo/check_tab.js` (the rule loaded into the search
it drives, its own copy in the full enumeration, F7) hold it.

**The backtest** (app v118, `props/build/suggest_backtest.js`, run by hand, never by a job). Every night game and Sunday
slot of the weeks before the record took them, from week 3 (the first week the props job published a payload before its
locks), whose lock has passed and whose games are all final, rebuilt by today's page on exactly the files of the last
commit on the main line before its lock (`git rev-list --first-parent --before`, the payload, the Elo files and every
file the page reads), its clock held at the lock less a minute, read by the page's own `spSet`, `spEloSet` and
`spTierOut`, then graded on today's files by `suggest_ledger.js`'s own `gradeTier`; written to
`props/data/suggest_backtest.json` in the record's shape (`prime`, `slot`, their summaries), the files from the site's
own line (`origin/main`'s first parents, never a branch's commits, which `--check` holds where git has that line), and
only for a unit locked before the record first took Elo picks (the earliest `taken_at` of an entry with them): a unit
after that is the record's, and one it missed stays ungraded, as the tab says. Each entry `src:
'backtest'` with `from` {commit, committed}. A unit already in the file is kept as it is but for its grades, so the file
only grows; `--check` holds every entry to the record's guard (`primeEntryBad`) and to its mark, and the record's test
runs it on the real file. On 19 October 2026 it built all 15 units of weeks 3 to 6 (11 night games, 4 Sunday slots,
every one with its Elo picks; weeks 1 and 2 have no payload published before their locks), and its replay of week 6's
Sunday night game, Cowboys at Packers, was the set the props job had locked, leg for leg and to the chance and price.

**One section, Night games, and one record** (app v129, `patch_night_record.py`, whose docstring is the design, the
owner's calls of 22 October 2026: "get rid of the Sunday slot record section -> all should be a part of 'Night Games'" and
"get rid of button (incl backteest wk 3-6), just include the record if not already"). Suggested Parlays is one section,
`section.sp-sec[data-sp-sec="night"]`, headed Night games, under one record. `spSetsHtml` is `spSecHtml('night',
spNightHtml(on) + spSlotHtml(on))`: the night games' sets (or the wait line before the next night is up, or the line that
none is left), then the Sunday slot's (its set, `.sp-game.sp-slot`, its wait line before it is up, whose `data-sp-next` is
its `<season>_<WW>_SUN` id, or the line that none is left, `data-sp-none="slot"`); no `data-sp-sec="slot"` section is
drawn. The slot's set wears a "Sunday slot" pill in its head (`.sp-hd .pill`), as a night game's wears its night's, so it
still says what it is under the Night games heading; and once the season is over the section says so once, by the night
games' line, the slot drawing nothing (the review of 22 October 2026: two "regular season is over" lines under one
heading). The record at its head counts both of the suggestions record's maps: `SP_SEC.night` reads `maps: ['prime', 'slot']`
(`SP_SEC.slot`, the slot's map alone, is kept for a caller that names it, and drawn nowhere), and `spRecSum(L, sec, kind,
B)` takes each map in turn, each season's unit and level once, the record over the backtest as before; its pills are
`data-sp-rec="night:<level>"` (`night:elo-<level>`, `night:<kind>:none`, `night:<kind>:pending`). The backtest's weeks
still count, as they always did, each pill's title saying how many of its own came from it: what went is the chip that
named them, `span.sp-recbt[data-sp-rec="<sec>:bt"]`, "Incl. backtest, weeks 3–6", and its row, `.sp-recbtbar`. Nothing
else moved: the slot's opening, lock and under-way phase, its levels each one game's, its Elo picks, and what the props job
takes, locks and grades. The audit holds the order (`spPartsAud`: every night part before every slot part in the one
section, the slot's set the one unit marked `.sp-slot`, wherever `holdSets`, M15 and the season-over case read the tab, no
section of the slot's own) and in P2 the one record worked on its own over both maps, a map at a time, no record of the
slot's own and no chip, blocking; the nflbets smoke (`recOwn` over both maps, `recGone`: no `[data-sp-recsec="slot"]`,
`.sp-recbt`, `.sp-recbtbar`, `[data-sp-rec$=":bt"]`, `[data-sp-rec^="slot:"]`, section of the slot's or "Incl. backtest"
anywhere, on the real files and made-up pairs) and `smoke_live.js` (its Thursday fixture's slot the one section's last
part, `slotHeldL`, and the one record, two rows saying none is graded yet) the same.

**Day games** (app v131, `patch_day_games.py`, the owner's call of 23 October 2026: "can you make this bottom section be
Day Games and include a record up to this point?"). The paragraph above is history: Suggested Parlays is two sections
again, Night games (`SP_SEC.night`, the record's `prime` map alone) and Day games (`SP_SEC.slot`, `data-sp-sec="slot"`,
the Sunday slot's set under its own record of the `slot` map, the backtest's slot weeks counted as ever; with the season
over it says "Regular season over." itself). The slot's set keeps its "Sunday slot" pill. The audit (`SPD`, `spPartsAud`,
P2's `SEC_MAP` and its hand record, app v128's), the nflbets smoke (`SEC_SLOT`, `recHeld` a section at a time) and
`smoke_live.js` (`slotHeldL`) hold the two sections and their records.

**The record on its own, Day games first, folding, no Extreme** (app v132, `patch_sp_record_top.py`, the owner's call of
23 October 2026: "combine them and put them in their own section ... get rid of the extreme parlays ... put day games
above night games, make the sections able to minimize. when its after 4PM please remove the day games so only the night
games come up on Sundays"). The paragraph above is history: Suggested Parlays is three `<details class="sp-sec">`, open
to start, each folding under its `summary.sp-sum` heading (a fold kept through redraws for the page load, `SP_FOLD`, never
saved): Record (`SP_SEC.all`, both maps, the one `.sp-rec`), Day games (the Sunday slot) and Night games, the two set
sections with no record. Extreme is off the tab only: its cards, a set's and its Elo picks', are hidden by the stylesheet
(`#spSets .pb-tier.xtrm,#spSets .pb-tier.elo-xtrm{display:none}`, three levels to a row on a wide screen) and the record
counts no Extreme level (`SP_SHOW`); the props job still takes, locks and grades all four levels, so the ledger and its guard are unchanged. On
a Sunday from 4:00 pm Eastern (`spDayOff`, Intl's America/New_York) Day games is not drawn. The audit (`dayOffAud`,
`spPartsAud`, P2's `SEC_MAP.all`), the nflbets smoke (`dayOffOwn`, `PB_SHOWN_OWN`, `REC_SEC.all`) and `smoke_live.js`
(`slotHeldL`) hold it, each reading 4pm on its own.

**No fold** (app v133, `patch_sp_nofold.py`, the owner's call of 24 October 2026: "actually can you not make it able to
minimize. the layout looks weird"). The three sections of app v132 are plain `section.sp-sec` again, each its `h3.sp-sech`
first (the Record's `.sp-rec` right under it), with no `details`, `summary`, arrow or `SP_FOLD`; their order, the one record,
Extreme hidden and Day games off on a Sunday from 4pm Eastern are as app v132 left them. The audit and the smokes fail a
`details` or `summary` on the tab.

**Opened without a freeze, and the sums kept** (app v135, `patch_fast_tabs.py`, whose docstring is the design and the
measurements; the owner, 24 October 2026: "I found that after a few changes it takes a few seconds to load between tabs
sometimes"). Measured in Chromium that night: every tab opened in under 35 ms but Suggested Parlays, whose first opening
held the page 3.1 s inside its click (about 12 s at a phone's speed), 2.75 s of it the Sunday slot (app v121's set for each
of its 11 games, and their Elo picks) and 2.0 s inside `parlayProb`, called 1,186 times. Three changes, none moving a
number: `parlayProb` keeps its trials' normals (every call draws the one seeded stream, ceil(n/2) Box-Muller pairs a
trial, so they are worked once into a growing Float64Array, up to 1.5 million pairs) and its answers (a memo keyed on the
trial count, each leg's chance and side and the correlations Cholesky reads, so a kept answer is never another's), both on
`parlayProb.cache`, so `check_tab.js`'s standalone copy carries them; the search's ids (`pbId` kept with the leg in a
WeakMap, checked against its key, side and line; `pbBeam` putting the new leg's id in its place among the parent's sorted
ids and taking a scored parlay from the memo by it); and the tab opened by the reader (a real click or key, `e.isTrusted`)
is drawn at once with the record and one line, "Building the sets…" (`data-sp-building`, role status), its sets built a
game at a time in tasks of their own (since app v138 a level at a time: **The sets at app v137's speed**) (`spOpenSoft`, `spWarmSteps`: each live unit's games' own sets and their Elo picks on
the game alone, the caches the slot's levels are taken from; a unit locked or under way builds nothing new), then drawn by
`renderSp` from those caches, the same HTML. Leaving the tab stops it, any other draw of the tab ends it (since the third
review of app v138 such a draw on the screen takes the run's steps again instead, and the run ends drawn: **The third
review**), and a click no reader made (the checks' `.click()`, the address moved by `routeTabs`) draws the tab at once as before. Against app v134
in the page on the same data: every Suggested Parlays set and Elo pick, the Top 30 and the all-games levels identical to the
byte, and 1,200 `parlayProb` calls identical; the first opening on the screen in 65 ms (0.27 s at a phone's speed), its
sets in 1.46 s (5.9 s) in steps of 0.18 s (0.74 s) at most, the synchronous draw 1.12 s. The nflbets smoke's THE FAST SUMS
AND SUGGESTED PARLAYS OPENED WITHOUT A FREEZE (`softChecks`, blocking) holds `parlayProb` to its own copy of the function as
it was (`ppOwn`) to the bit on made-up legs at any hour, this week's legs, three trial counts, each call twice and one past
the kept stream, and `spOpenSoft` on the real week's live units and on a made-up night game two days out: the building
line at once, the synchronous draw's HTML at the end, a run stopped by leaving the tab and ended by another draw, nothing to
build once built.

**Value picks** (app v112, `patch_suggested_night.py`, the owner's call of 17 October 2026, after app v111's tags:
first "i don't really understand what the no edge and thin edge tags are", then "can we do reverse tags? like get rid
of thin edge and no edge and come up with a name for that first section?"). The marks are reversed. A leg `pbPool`
puts on its preferred list (the 3-point edge, with market + form agreeing on a player's line: `thin` false and not a
total, `pbIsValue(l)`, `!!l && l.thin === false && !l.market`) is a **Value pick**, and wears the one mark a leg has,
`<i class="pb-valmark">Value</i>` (`pbValMark`, the hub's gold filled with dark text on it), on a level's card and on
a row of the Top 30 lines. A thin-edge leg and a game total wear none (the `pb-thinmark` "thin edge" and "no edge"
are gone), and until app v113 the lines under a level said why they are not Value picks (`pbThinLine`, `pbMktLine`,
above; a set's cards draw neither since: the Value mark says it). An Elo
pick's legs come from `pricedLegs`, which sets neither `thin` nor `market`, so none is marked: they are chosen on
the Elo matchup, not the edge. Nothing about which legs a level takes, its order or its numbers moves, and the record
still keeps each leg's `thin` and `market`. From app v112's second round to app v113 the tab's lead said a leg marked
Value is one of the model's best, rated at least 3 points above the chance its price implies, and, wherever the Elo tab
is on the page, "and on a player's line market + form (the book's chance moved by his Elo rating) agrees"; the lead
went with app v113, and the Parlay Builder's Value picks heading and the line under it say what a Value pick is. The
audit (`pbIsValue` on its own cases and the marks on cards of its own, then every level card and Top 30 row) and the nflbets smoke hold the Value
mark on every Value pick and on nothing else, no Elo pick's leg marked, and no old tag anywhere. Reversed in app v138
(**DraftKings' chance on every leg**, under Props): `pbIsValue` needs a hook's chance (`l.hook`), none is set, so no leg
is a Value pick and no mark is drawn until a model earns one; the checks hold none, and a hook only on their fixtures.

**The lock** (the owner's call of 16 October 2026, after the sets above: "obviously dont want the lines and options
changing alot ... can we have the ability to refresh odds up until 2 hours before the game before it locks?"). A set
is live until 2 hours before its kickoff (`spLockAt`, `SP_LOCK_MS`): built from the published prices (since app v125
the props job's own read of DraftKings' lines on ESPN, **The published read**) and, in the
visitor's browser, any Refresh odds press, which re-picks it as it re-picks everything, and the tab says when it
locks in one short line ("Locks Sun 6:20 PM ET, 2 hours before kickoff."; until app v113 it went on "; Refresh odds
updates it until then."). From the lock to kickoff the tab shows the site's locked set, marked Locked with its time
("Locked since Sun 6:20 PM ET."; until app v113 a sentence went on to say whose set it is, when the props job took it
and that Refresh odds no longer changes it): the game's entry in the suggestions record
(the ledger's `prime`, under Props; `spLedgerOf`: of this season and of the game's kickoff as it stands, taken
before the lock), the same for every visitor and the one the record grades, which no press changes (a press still
prices everything else, and the parlay card still converts a leg to DraftKings' number). Where the record has no
entry for the game (no run of the props job landed before the lock, or the file did not load), the page builds the
set once, says it is not the site's locked set and not the one the record grades ("Locked since Sun 6:20 PM ET. This
browser's own set: the site's was not published in time, so the record does not grade it."), and keeps it in the browser
(`props_sp_lock_v1`, outside `S` and never sent anywhere, `{v, season, games}` under each game's kickoff, a game
pruned on every write once it kicks off or leaves the schedule), so a reload shows the same set; the record's set
takes its place as soon as a load reads one, and a locked game waits for the record's read to answer (`PB_REC_DONE`,
"Locked since Sun 6:20 PM ET. Loading the site's set…")
before building its own; a set that reaches its lock with the page open has the record read again (`pbWatch`,
`PB_REC_STATE`), since the job may have rewritten or first taken the entry after the page loaded (a read again that
fails keeps the one before). A locked level's chance and price are worked out again on its legs as kept by the
builder's own sums (`spTierIn`: the kept figures are rounded, 4 places a chance and 3 a price, which on $37.50 moved
a payout a cent off what Add to builder then paid; the fair chance stays the one kept at the lock, so a press moves
nothing of it; the record grades on its own), and a locked leg's own Add
puts that leg in as it was locked (its line and price), never the line as it stands now, and since app v125 keeps that
price and its locked fair chance in the builder and on the parlay card through any later publish or press (`spLegIn`'s
`kept:{fair, est}`, which `legPrice` and `legFair` read first), so a republished read that moves a locked main line or
rung never moves what Add to builder pays (the audit's M17 holds it). Each set's kickoff is said
in Eastern time beside its lock (`spKickEt`), so the two read on one clock wherever the visitor is. Ruled out after the lock (the owner's call of that day, "Replace that level only"): a
locked level holding a player the latest published report has Out or Doubtful, the roster has inactive, or the
page's own rules hold out (`spOutWhy`, on `suggestable`: V6's rule, the one every suggestion obeys) is built again
from the lines at hand, that level only (`spRebuild`), the others staying as locked, and marked in one line with the
player and when (`spUpdLine`, app v113: "Updated: Bo Nix ruled out (Sun 5:30 PM ET); this level was built again.", and
the page's own "Updated in this browser: ..."; until then the page's own went on to say the record grades the site's
locked set, which the props job updates the same way only if it runs again before kickoff, since its runs start 2 to 9
hours late and replace a level only before kickoff): the record's own replacement where the props job has made one (the level's
`updated`), else the page's, which says it is the page's own change, is kept in the browser beside the set and gives
way to the record's when that names the same player. The record grades the ledger's entry, with the job's
replacement where it made one.

At the top of the tab is the **record** (`#spRec`, `spRecHtml`; since app v118 at the head of each section, and since app
v129 of the one section, Night games, counting both of the record's maps: **One section, Night games, and one record**,
above): a pill a level, as the ELO Ratings tab's record bar had them (until 22 October 2026), its won-lost and units on $1 from the `prime` entries' own grades (`spRecSum`, as the job's `prime_summary`
counts them: each season's game and level once, from the last key that holds it; a push and a pending level counted
apart; each pill's title giving the wins expected by the book's fair chance and by the model's, and its pushes), "No prime-time set
graded yet" until one is, and nothing else: the line under the pills that said it starts with this change, 16 October
2026, each Thursday, Sunday and Monday night game's four parlays as the site locked them, graded as a book settles
them, and that Refresh odds never changes it went with app v113. It is read beside the payload once a load with no-store and kept outside `S` (`PB_REC`); no file, or one
that is not a ledger, draws nothing. The audit's P2 and the nflbets smoke hold every number it states, the pills'
won-lost and units and each title's graded, won, expected wins (fair, on how many had one, and the model's) and
pushes, to the entries' grades worked out on their own, blocking. The all-games record it replaced (app v99 and v100, `pbRecHtml` and `pbRecSum`:
the panel's default levels per kickoff wave from 12 October 2026, Monday night's Bills at Rams the first) stays in
the file, graded, and is drawn nowhere.

**Without the long paragraphs** (app v113, `patch_declutter_top50.py`, whose docstring is the design, the owner's call of
17 October 2026: "in suggest parlays, get rid of all the long paragraph description stuff. we dont need to clutter the
page."). Suggested Parlays keeps what a visitor acts on and drops what explains it. Gone: the lead paragraph under the
heading (what a set is, one night at a time, the lock, what a Value pick is), the foot under the sets (how a set is
built, its rules and its floors), the record's sentence under its pills, and on a set's level cards the lines saying why
a leg is not a Value pick or why the game's total is there (`pbTierCard`'s `o.quiet`, which every set's card passes; a
card not passed it, the Elo picks' and the retired all-games panel's, drawn nowhere, still draws them). The lock lines
are one short line each and a replaced level's Updated line one line (**The lock**, above), and the Elo picks' lead one
sentence. Kept: the heading, the record's pills (each pill's title still giving its expected wins and its pushes),
Refresh odds and its status line, the wait line, an empty level's reason, and the est. line (a price that is an
estimate is money), so the tab's head is its heading, the record and Refresh odds and nothing else. The audit holds it
on the week as it stands (`holdSets`: each set's live or locked line word for word, and no line on a set's card saying
why it holds a total, blocking, or why a leg is not a Value pick, a warning, whatever it holds, the cards with a thin
leg or a total drawn quiet counted), on M10's made-up prime-time games (the live line, this browser's own locked set,
one waiting for the record and the record's, and the replaced level's Updated line, the record's and the page's own,
word for word; with three of a game's lines made thin, its live cards still quiet, blocking), on M11's nights (a Safe
card's thin leg unmarked with no line under it), on M2's cards of its own (one not quiet with a thin leg and a total
drawing both lines, a quiet one neither with the same marks, and a quiet one keeping the est. line alone, blocking), on
M13's made-up Monday night (its set's level taking the game's total drawn quiet, blocking) and in P2 (the record its
pills alone, each title naming its pushes); the words, the lead's and the foot's absence and the record's are
warnings (`W.wording`). The nflbets smoke, which has no warnings, holds all of it: the tab's head its heading, the
record's pills and Refresh odds alone; no word of the lead, the foot, the record's sentence, a level's why-lines or the
long lock lines anywhere on the tab, at any hour (`WHY_GONE`, with the old tags); every live and locked line word for
word (`Locked since <time>.`, and this browser's own set's sentence after it); a card of its own drawn as the Elo picks
draw theirs saying why a leg is not a Value pick and why the total is there, and drawn as a set's saying neither, both
keeping the est. line and the Updated line; the made-up Sunday night game's lines at the lock, waiting for the record,
locked from it and as this browser's own, and the Medium built again ("Updated in this browser: ...", then the
record's "Updated: ..."); the real and a made-up record drawn as pills alone; and the Elo picks' one sentence.
`smoke_live.js` holds its Thursday night fixture's live line and, an hour before kickoff, its locked line word for word,
and no long paragraph on the tab.

**No descriptions** (app v130, `patch_quiet_props.py`, `patch_quiet_builder.py`, `patch_quiet_suggest.py` and
`patch_quiet_tidy.py`, applied in that order, with direct edits to `card.html`, `tab_elo.html`, `snapshot.html`,
`glance.js`, `liveparlays/build/page.html`, the betting hooks and `picks/index.html`; the owner's call of 22 October 2026:
"in all sections get rid of all text wall descriptions. i dont want any descriptions anywhere. i want the site to speak
for itself without a bunch of reading."). Every lead, foot, note and tagline that explained something is gone from every
tab and window (the header's tagline, the Top 30's lead and foot, the Game bets card's sentence, the ELO tab's table notes,
the snapshot's notes, the X Bet Log's lead, Weekly Picks' note among them), and every status, empty, error and warning
line says its state in a few words ("DraftKings via ESPN, Tue 8:07 AM ET · player prices est.", "Locks Sun 6:20 PM ET.",
"Price est. from DraftKings’ line, read Tue 8:07 AM ET.", "Regular season over.", "Player legs: add them on DraftKings by
hand."). Kept: headings, labels, numbers, buttons, `title=` tooltips, loading lines, short state lines and money warnings
(an estimate marked, a leg to add by hand, a pair DraftKings may refuse, a player not expected to play, a line far off the
market); the hidden prop-model tabs (Track Record, Weekly Update, Backup) and `<noscript>` text are untouched. **Where this
file quotes a page's words from before app v130, those words may now be shorter or gone: the sources and their checks are
the current words.** `build.js` stops (`GONE_V130`, 171 phrases, comments stripped, the betting app's string read too) if
a removed paragraph comes back. The audit, `smoke.js`, `smoke_live.js`, `check_tab.js` and the betting smoke hold each new
wording where they held the old one, as strictly, and the removed ones absent.

The Parlay Builder tab (`#parlay`, `tab-parlay`; app v111, the owner's call of 16 October 2026: "move top section
with odds, build from, bet types, game checkboxes into new section tab called 'Parlay Builder'. add leg parlay
section for live builder, in that section add refresh odds button and show top 100 line + profit ratio and allow
each line item to be added to parley builder") is the builder (`#parlayBody`) at its top, then its choices and the
**Top 30 lines** they make (the Top 100 until app v113, `patch_declutter_top50.py`, the owner's call of 17 October 2026:
"in parlay builder only do top 50 now instead of 100"; the Top 50 until app v116, `patch_top30_first.py`, the owner's of
18 October 2026, with a screenshot of the tab: "its only showing top 30, but honestly top 30 is enough if you want to
set it at that", the list having shown 30 rows because the reader had ticked a few games; the Top 50 again since app
v141, its player lines a mix of bet types: **The Top 50's player lines are a mix of bet types**, below)
(`#pbPanel`, drawn by `renderPb()` in `part3.js`, from `renderParlay()`, which draws Suggested Parlays with it). Until
app v116 the choices and the list were over the builder; that day the owner, with a screenshot of the builder holding
five legs under the list, asked "that 5 leg parlay section can we move it up to the top of the page?", so `#parlayBody`
comes before `#pbPanel` in the section (`part1.html`, and `build.js`'s match of that section), and the builder, empty or
not, with its Refresh odds and its stake, is the first thing on the tab, over the choices (Bet amount, Refresh odds,
the mix, the bet types, the games) and the Top 30 lines. Since a line added from the list grows the builder above it
(a phone's Safari has no scroll anchoring), `pbLegClick` keeps the pressed Add's button where it was on the screen
(`window.scrollBy` by the distance the redraw moved it) and the focus on it. The audit's layout check (blocking), the
nflbets smoke and `smoke_live.js` hold the builder first. The four levels it drew over every game until then are on Suggested Parlays, one set a
prime-time game, and the lock on each leg, New legs and Reset (app v95, `patch_pb_lock_turn.py`) are gone with them,
every trace of them (`PB_VIEW`, `pbLocked`, `data-pb-lock`, `data-pb-turn`, `data-pb-reset`). At the top of the
controls is a **Bet amount** box (`#pbStake`: dollars, the decimal keypad on a phone, $1 to $100,000 in steps of $1,
cents kept), the visitor's own amount and the builder's own stake, one number (`S.stake`, $20 to start, saved with
the rest of the prop model state as the builder's stake always was), so it is set once: the builder's box and its
one-tap amounts set the same number (its hint says every parlay on Suggested Parlays pays on it). Every level of every set on Suggested Parlays, the Elo picks' too, pays it times
its own decimal price ("$25 pays"), redrawn in place as it is typed (`pbPays`, each card's `data-pb-pay` holding its
price, on either tab) with the builder following a moment later; leaving the box or Enter settles it without
redrawing the panel (`renderParlay({keepPb:true})`), so an Add to builder or Finish pressed straight after typing
lands. The Top 30 lines are on $1 and never move with it. A typed amount is read by `stakeRead` ($ and thousands
commas allowed); one that is not a positive number (blank, a word, 0, a minus) leaves the amount as it was, and a
saved one that is not an amount reads as $20 (`pbStake`), so nothing drawn from it is NaN. Then Refresh odds (Odds,
its status line beside it), and the choices, each kept in the browser's own prop model state (`S.ui.pb`: the boxes,
the games unticked, whether the games list is open; nothing else holds it): a mix, All (the default), Teams only or
Players only, which sets five boxes, Moneyline, Spread, Game total, Player overs and Player unders (a touchdown is an
over, as a ladder rung was until app v127 offered none; a box changed by hand lights the mix it makes, or no mix at all: there is no Custom tag);
and the week's games still to kick off, all ticked to start, with All and None. From those alone, the **Top 30
lines** (the Top 50 since app v141, up to 40 player lines, a mix of bet types: **The Top 50's player lines are a mix of
bet types**, below) (`getPbTop`, `pbTopBuild`): every leg on the ticks that qualifies as a suggested leg does (`pbLegs`, the
lists a level is searched from, uncapped: the preferred and the thin legs and, with Game total ticked, both sides of
each ticked game's total, every rule above held, the id rule among them (from app v115 to v118 but for a player's line
read by Refresh odds on a tested kind, which the list alone kept with none, under Props, **The Top lines keep a line
DraftKings moved**, reversed in app v119; the rule itself dormant since app v125, so the list takes DraftKings' lines read
from ESPN, published or pressed, like any other), in two parts (app v112, the owner's "come
up with a name for that first section", under **Value picks** above; reversed in app v138: Player lines, up to 20, then
Game bets to 30, each ranked by expected return at DraftKings' fair chance, a Value part only from a hook's rows, under
Props, **DraftKings' chance on every leg**): first the Value picks, every preferred leg,
then the other lines, every thin-edge leg (one that missed the 3-point edge or market + form, which a level takes
only as fill; they pay more for the model's chance and filled the list's top until app v111 grouped them) and then
every total, each of the three ranked on its own by what $1 on it is expected to make at the model's chance (the
chance times the decimal price, less the $1; the lower `pbOrd` on a tie), best first, at most 30 in all
(`PB_TOP_N`, 100 until app v113 and 50 until app v116): `[...rank(P1), ...rank(P2), ...rank(P3)].slice(0, 30)`, `P1` the Value picks, `P2` the thin-edge legs
and `P3` the totals. The totals are set last, the order a level fills in, never left to the sort: a total is at the
book's own chance, but one priced on one side only is put at 50%, so at plus money (its over alone at +120: +$0.10
on $1) it can be expected to make more than a thin-edge line, and ranked with them, as app v112 first had it, it came
before them (until app v112 the totals ended the first group, ahead of every thin-edge line, marked no edge).
**Each bet once** (app v112's second round; the owner, 17 October 2026: "why there are several instances of this
where it's only a half yard difference? i find it hard to believe that draft kings would let me bet both on the same
parlay": Patrick Mahomes's Over 224.5 and 225+ passing yards ranked 1 and 2 at -113, and week 6's list held seven such
pairs). Dormant since app v127, when `pricedLegs` stopped making rungs (**No ladder bets**, under Props): no rung reaches
the list, `same` is 0 on every real list, and the checks hold the rule on made-up lines alone (below). A ladder rung k+ (a player's over that is not his main line) lands exactly when his main Over at k-0.5 on a
half-point line does and is priced from it, so before the ranking, where that main Over of the same game, player and
stat is among the Value picks or the thin-edge legs, the rung is left out of every part (`once()`) and its slot goes
to the next line. The main line is kept wherever it ranks, in either part (where the rung was the Value pick and the
main line a thin-edge one too), and the rung is left out even where its main line ranks past the 30th. A
whole-number main line (Over 225 pushes at 225, where 226+ loses), an Under, a main line that does not qualify and a
main line in another game never take a rung's place. `getPbTop()`'s `same` counts the rungs left out, drawn nowhere.
A level never took both (one leg a player) and the builder holds one leg a stat (`legKey`), so it was the list
alone, and the sets are as they were. The parts are drawn under their headings: `h3.pb-topsec[data-pb-sec="value"]`,
"Value picks" with its count in a pill, a line saying what a Value pick is, and `ol.pb-top[data-pb-sec="value"]`;
then `h3.pb-topsec[data-pb-sec="other"]`, "Other lines" with its count, a line saying what they miss ("These miss a
Value pick's bar (3 points above the chance the price implies, and market + form agreeing on a player's line),
though the model still rates each at or above the book's price; the game totals, at the book's own chance, come
last. A suggested parlay takes them only where its Value picks run out.", market + form named once the Elo tab is on
the page, the totals with Game total ticked), and `ol.pb-top[data-pb-sec="other"]`, whose `start` is the rank after
the last Value pick, so the ranks run on across both (`data-pb-row`, the rank shown); with no Value pick on the
reader's choices, the Value picks heading has no count and a line under it says so ("No line on your picks is a
Value pick right now.", `data-pb-novalue`) over the other lines. The lead and the foot say the order (the foot: "...
each part ranked by what $1 on it is expected to make, any game totals last, 30 lines at most in all. Only main lines,
anytime touchdowns and team bets are listed: no ladder bets, such as 250+ passing yards or 2+ touchdowns.", where until
app v127 it said "Each bet is listed once: a ladder rung that is the same bet as the player's main line (225+ passing
yards and Over 224.5) is shown as the main line."), and each row carries its part (`data-pb-grp`, value or other; edge or thin until app
v112, the first thin row under a gold rule, which went with the headings).
Each row (`pbTopRow`) gives its rank, the player or team, the line and its game, the Value mark on a Value pick and
no mark on any other row, its price (est. where it is, titled with what it is priced from and when), the model's
chance, the book's fair chance where there is one ("fair, est." where it is), what $1 wins if it lands and what $1
is expected to make, and an Add, the sets' own (and, from app v115 to v118, under its game the quiet line of a read's
leg kept with no id, `pbTopSlip`, under Props). A game total is never a Value pick, and a note says the totals come
last whenever Game total is ticked ("Game totals are never Value picks: each is priced at the book's own chance, so
the totals come last among the other lines, and on a long list the 30 lines can end before them."). The list's
length is the page's one number for it, `PB_TOP_N`, which its heading (`Top ${PB_TOP_N} lines`, "Top 30 lines"), the
lead ("best first, 30 lines at most."), the foot, that note and the empty builder's line ("or add a parlay from
Suggested Parlays or a line from the Top 30 below.", "above" until app v116 put the builder over the list; the audit
holds "below" as `W.wording`, the smoke blocking) all read; the checks keep their own copies of 30 (50 until app v116),
`TOP_N_AUD` in the audit and `PB_TOP_N_OWN` in the nflbets smoke, never read from the page. The audit's
Top lines check (`topAud`, `topFullAud`, its own rung rule `sameBetAud`) and the nflbets smoke's (`pbTopOwn`,
`sameBetOwn`) work the order, each bet once, the parts (each holding exactly its rows, its heading, its count and
the second list's start) and the marks out on their own, on the week as it stands: no row a rung whose half-point
main Over qualifies, `same` the count they work out, and no line of a later part (the Value picks, the thin-edge
lines, the totals) before one of an earlier; the audit also holds each main line a rung was left out for exactly
where its rank in the order without those rungs earns it, and the list the first 30 of that order, at most 30 rows
drawn under the heading "Top 30 lines" (blocking: a number the page states). Until app v127
only the smoke met a priced ladder rung on the week as it stands (week 6's list left out 7; the audit boots with no baked
odds, `NO_BAKED`, `S.odds` empty, so its real lists carried none); since, no rung reaches either's (the audit's NL1 and
the smoke's no-ladder checks hold `same` 0), and their own made-up games (M12 for the audit) are what hold the rule.
Both hold it
again on made-up games of their own (`pbGames` and `pricedLegs` stood in, each in a slot of its own and put back on
every path, so it holds on any day, the off-season included): a main Over 224.5 passing yards with its 225+ rung left
out, a whole-number Over 225 with its 226+ kept, an Under main line with a rung on the same stat kept, a rung in
another game kept, a Value-pick rung left out for its thin-edge main line, a rung whose main line does not qualify (or
that has none) kept, and the game's total priced on its over alone at +120, put at 50% and expected to make $0.10,
still after every thin-edge line (the smoke's nine rows worked out by hand, `same` 2; the audit's M12 also on a list
of 103 lines once its nine rungs are out, more than the 30 the list holds, with eight Value-pick pairs at its top, where
the lines ranked 23 to 30 once the rungs are out take their slots, the 31st is off the list, exactly 30 rows are drawn,
and a thin-edge main line ranked past the 30th is off the list with its rung left out all the same; until app v116 the
same list cut at 50, the lines ranked 43 to 50 taking the slots). The smoke holds
the cut on sixty made-up games of its own too (Moneyline only, each home side to win at -110, twenty rated 60.0% down
to 58.1% a tenth of a point at a time, Value picks, and forty 55.0% down to 53.05% a twentieth at a time, thin-edge
lines; until app v116 forty and twenty, cut at 50): the list is the first 30 of their order, the twenty Value picks
(H100 to H119) and then the ten best thin-edge lines (H120 to H129), H130 to H159 left off, under "Top 30 lines", the
parts counting 20 and 10 and the other lines ranked from 21; and it fails unless some list it held had more lines
qualifying than the 30 it holds (`topOver`), so the cut is always met.
Which lines, their part, order and numbers are blocking; the words are warnings in the audit (`W.wording`) and fail
the smoke, which has no warnings. The list's notes say what the
all-games panel's said: a line marked est. is priced from DraftKings' line read on ESPN, and when it was read
(`espnReadLine`, wherever the list has one: since app v125 every player line, whose foot now always says every line has
DraftKings' own price or, marked est., DraftKings' line read from ESPN at our estimate of its price, "on main lines and
touchdowns, the markets the estimate has been checked on", and yards ladders until app v127); with player bets ticked and no
player line in yet, that the list has none and when DraftKings' lines were last read from ESPN (`pbNoPl`, below); with
lines in and none with a DraftKings id, that, and why (the dormant id rule's: a player's line read from ESPN carries no
DraftKings id); how many lines it left out far off the
market, and why; and how many for want of an id, apart (DraftKings at another number, or none), each still on the
game pages to add to the builder (none since app v125, the rule being dormant). An empty list says why (`pbTopWhy`: no box or no game ticked; since
app v125 "No player lines yet: DraftKings had posted none for these games when its lines were last read from ESPN (Tue
8:07 AM ET). Press Refresh odds to read them now." or "... DraftKings’ lines for these games have not been read from ESPN
yet. Press Refresh odds to read them now.", `pbNoPl`, where until then `PB_NO_PL` said "No player prices yet: they are
pulled on game day or the day before, Sunday's afternoon and night games on Saturday morning, and never for Sunday's early
games (before 4pm ET)."; "No player legs DraftKings' betslip can take: a player’s line read from ESPN carries no DraftKings
id.", `PB_NO_ID`, dormant; else "No line on your picks qualifies yet: tick more games or bet types."). The list
is cached on the levels' own signature of the choices and the data (`pbSig`, `PB_TOP_CACHE`), so ticking back is
instant and a press or a kickoff rebuilds it, and a game that kicks off while the page is open leaves the games list
and the list (`pbWatch` looks every half minute). The builder, empty or holding legs, has a Refresh odds of its own
(`espnCtl(null, 'builder')`: the same read of every game of the week still to come, its own status line, the focus
kept on it). The engine the levels are built by (`pbPool`, `pbTier` and the searches, a beam over a pairwise copula
approximation with only the finalists worked by the real sums, and `getPbTiers`) is kept and only widened:
`pbAllows`, `pbLegs`, `pbPool` and the searches take the choices and the widths as arguments, defaulting to the
all-games panel's own, so a call as before is exactly as before; `getPbTiers` still builds the all-games levels on
the ticks, which nothing on the page draws, and the audit and the smoke hold the engine through it. With no game to
come the tab says so. The old Suggested parlays window (`#suggModal`, its Any/overs/unders switch and its stake box)
is gone; a game page's own High/Medium/Low suggestions and their side switch stayed until app v124 (the owner's call
of 20 October 2026: under "Bets and Stats: the loop", **A game's page: Matchup, Mismatches and Team Stats**), which took
them off the page and kept their engine, drawn nowhere, as `getPbTiers` is.

**The matchup bubble** (app v114, `props/build/patch_glance.py` and `nflbets/build/glance.js`, the owner's call of 17
October 2026: "in the parlay builder, when i click on a player or a team, bring up a bubble pop up where it shows their
matchup for the day so i can see info at a glance"). On the hub every name on a leg the Parlay Builder tab and
Suggested Parlays draw (a Top 30 row, a builder row, a set's level card, an Elo pick's card) is a button, drawn by the
props parts' `glanceName`: `button.glance-name`, `data-glance` p:<pid> for a player's line, t:<ABBR> for a moneyline
or spread, g:<gid> for a game total, `data-glance-game`, and `data-glance-leg`, the leg's signature (key, side, line,
the price the row shows and its source, the model's chance), `aria-haspopup="dialog"`, named "Bo Nix: his matchup";
no button chrome, a dotted underline, and a 44px tap target from padding a negative margin takes back out of the line,
so no row moves. The leg is kept as its row drew it in `GLANCE_LEGS`, outside `S`, the last 600 (`window.glanceLeg`).
The parts draw the button only where `window.hubGlance` is on the page, so the prop model's own page, the audit's,
keeps plain names, and the audit holds that. The bubble is `glance.js`, inlined last by `build.js`, which refuses one
that fetches or keeps anything and stops if `window.eloGlance` (`tab_elo.html`), `window.gsReadings`
(`snapshot.html`) or the parts' `glanceName` go missing; its styles are on the theme's tokens, so both looks. It is a
dialog, not modal (`aria-modal="false"`), labelled by its heading, the focus moved into it and Tab kept there;
Escape, Close (44px), a click outside or another name close it with the focus back on the name, and a tab changed by
the address (a hash change, Back) closes it with the focus on the name where it is still on the screen, else on the
chosen tab's button, never the page's body. It sits under the page's windows (z-index 45), below its name or above
where there is no room below, kept on the screen and keeping where the reader had scrolled it when placed again; a
sheet across the foot of the screen at 640px and under, and wherever it fits neither side of the name and that side
has under 160px (`ROOM_MIN`, a landscape phone). It keeps the place it was opened from (`placeOf`: the builder, the Top
lines, or a level card under its set's game or under `#pbElo`; within one place a leg is drawn once) and the leg's key,
side and line, and a MutationObserver, connected only while it is open, follows every redraw (a kickoff, a lock, a
Refresh odds press, the builder's own): it binds to that place's copy, marks it `aria-expanded`, places itself again
and redraws where the copy's price moved, and where that place no longer draws the leg it closes, the focus on the
leg's neighbour there. A player's bubble: his position and club and his status as the page reads it; his season Elo,
shield, tier and rank at the position he is rated at (prov. where provisional), or why he is not ranked; the game and
its kickoff in ET; "Faces", the ELO Ratings tab's own table for his leg's side of the ball (`eloGlance.unit`), set
against him as the Game snapshot's position matchups do, a quarterback against the opponent's Overall Defense, a back
its Run Defense, a receiver or tight end its Pass Defense, named as the tab names it and ranked as its table draws the
club, "carried from" where the tab marks it carried, and none for a kicker (the side is the leg's, so Travis Hunter's
receiving line faces the Pass Defense though he is rated a defensive back; until the review of 18 October 2026 this line
ranked the Mismatches' player-Elo units, which put GB's pass defense 14th for Dak Prescott, 3rd for George Pickens and
18th on the tab); the Props tab's Mismatch grade and edge, with no rank of its own, its title naming the formula's units
(`eloGlance.against`); his trusted stats' recent form and projection; and the leg: its line, the price its row shows,
the model's chance, the book's fair chance, market + form and the Elo matchup on that price (none for a player the page
has ruled out, whose Matchup line says he has none to show; a player's bubble draws no leg since 24 October 2026, below,
and since app v138 a team's or a game's leg shows Price · Fair · Expected). A team's or a game total's bubble: both records as Team
Rankings counts them, the Power Ratings and their rank, the line the leg stands on (the prop model's own row for the
game, named DraftKings where it is DraftKings'; `state.json`'s closing line, the Matchups board's until it went on 22
October 2026, only for a game the prop model has no row for: until 18 October 2026 it was that line wherever the season
had the game, so a Bills "To cover -4.5" at -118 sat under "BUF -5.5 · BUF -258"), Overall
Offense against Overall Defense each way, each model's pick and chance, the leg's team marked "this leg" (a row's
line, not a bet the visitor made) and, on a moneyline alone, each model picking that team to win ticked; then the leg
and Open game snapshot (where the season, `window.pkBoard`, has the game: the whole snapshot, which keeps the button to
the game's page on the Props tab). A file that has not loaded says so in its own line. The builder rows' own market + form and
Elo matchup (`decorateAlt`; since app v138 the Elo nudge alone, "Elo +2.1") read the price the row shows, as the bubble does (display only: the Track Record grades
market + form on its own rows). The nflbets smoke's THE MATCHUP BUBBLE section (`glanceChecks`, blocking) holds every
name as the right button for its leg, each place drawing a leg once, every number on its own reading (the Faces line on
its own map from model.json, `FACE_OWN`, and the rank the ELO Ratings tab's own table draws, read off the tab), the
line the leg stands on with the prop model's row moved off `state.json`'s, "this leg" and the moneyline-only tick, a
two-way player, a club planted carried, a player planted Out and Questionable, the window's keys, focus, Close, Open
game snapshot and a tab changed by the address, the redraws (renderParlay, a price moved, the leg taken out, renderSp,
an Elo pick's card), the reader's scroll, a stale stored price, and nothing written to storage, all on fixtures of its
own at any hour (the builder's legs on a made-up game two days out).

**A player's card, and a game page's search** (app v134, `patch_player_card.py`, the owner's call of 24 October 2026:
"anytime a player name is mentioned you are able to click that for more information ... show what the attachment shows
[the Show stats game log] ALSO what their projections are for next game ... have button: opens the prop leg for that
particular player. also when clicking into a particular game, have a search box at the top to find a player"). A player's
matchup bubble (every player's name on the Parlay Builder and Suggested Parlays) carries, after the leg, the props parts'
`playerCard(pid, gid)`: the prop model's projection for that game (each stat `statLines` gives him, its mean or the
touchdown's chance) and his season week by week, the very table Show stats draws (`weekStats`), then an "Open prop leg"
button (`data-glance-prop`, 44px) opening the game's page with his row open (`pkBoard.openOnProps`); the bubble widens to
460px with a card in it. A game's page has a search box under its bar (`#gameSearch`, type search, "Find a player"):
typing hides every row whose name does not hold the text, with its open body and stats, and a team heading left with
none (`gameSearchApply`, in place, the focus kept; the name read from the row's own text node, since the ELO tab sets a
shield before it); the text is kept for that game while the page is open (`GAME_Q`, outside `S`) and cleared when
another game opens. The nflbets smoke holds the card (the page's own `playerCard` output, his id, the season log) and
Open prop leg on every player bubble it opens, and the search on a game of the week (the rows it leaves, the focus,
nothing matching, a redraw keeping it, another game clearing it, clearing it showing all).

**A player's bubble: his Elo by his name, no leg, and back to it** (`glance.js` and `snapshot.html`, the owner's calls of
24 October 2026, a screenshot of Darren Waller's bubble: "move up the elo button up next to the name and the ELO. remove
what I crossed out", the lines "This leg Over 2.5 receptions" and its "Price +130 · Model 53% · Fair 49% est. · Market +
form 55%"; and "on the open prop leg or open game snapshot, when I close it go back to the player pop up. its just staying
at the page"). A player's season Elo, shield and tier sit beside his name in the bubble's head (`.glance-hl`, the heading
his name alone, then `span.glance-elo[data-glance-elo]`), and the Season Elo row is drawn only where he has none (or the
ratings are still loading); a player's bubble draws no leg box (`legHtml` is a team's or a game's alone, its line, price,
model and fair chance; market + form and the Elo matchup are still on the builder's own rows; since app v138 its price,
fair chance and expected return, and the builder's rows the Elo nudge alone). A team's or a game's bubble
is as before. Open game snapshot hands the snapshot `{back, props}` (`window.gameSnapshot(gid, from, o)`, `BACK` in
`snapshot.html`): closed by its Close, Escape or a click outside, it calls back once the focus is on the name, and the
bubble opens again on its leg's copy in the place it was opened from where that is on the screen (`reopen`); a starter's
name or Game bets and player props there hands on to the game's page instead. Open prop leg (and those two) keeps a return
(`RET`, `keepRet`, only where the game's page opened on that game; `window.hubGlanceBack()` reads it): the page closed by
its Back, Escape or a click outside (each calls `closeGame` by name, wrapped in `glance.js` as `snapshot.html` wraps
`closeGameModal`) takes the reader back to the tab the bubble was on, at the scroll it was left at (put back at once, the
page scrolling smoothly), and opens the bubble there (`backFromProps`, which looks for the name again for up to two
seconds while that tab stands). The page left for another tab by the address (routeTabs clicks the tab's button, which
drops the return first), a second bubble, or a game's page not opened from a bubble brings nothing back. The bubble's
460px for a player's card no longer applies to the phone's sheet (`.glance-pop:not(.glance-sheet):has(.pcard)`: app v134's
rule, later and as specific, set a 460px sheet across a 390px screen). The nflbets smoke holds the head (once, beside the
name, no Season Elo row), no leg box or leg number on any player's bubble, a team's leg's price followed through a redraw,
the snapshot closed four ways opening the bubble again with the focus in it, and Open prop leg's page closed by its Back,
Escape and a click outside landing on the Parlay Builder with the bubble open, left by the address bringing nothing back,
and a page opened from the Props tab keeping its Back there.

**The Top 30's player lines sort, wear their club and name their units** (app v139, `patch_top_sort.py`, whose docstring
is the design, the owner's call of 29 October 2026: "in the top player lines can you make the columns able to sort for odds
and model estimate. also can you do a little button icon for what team the players are on. also in projected, can you add
the qualifier"). Display only, no line, chance, price or part moving. Over the Player lines a sort bar (`div.pb-tsort`,
`data-pb-sort`: Rank, Price, Projected, Fair, Wins, Expected; a press highest first, a second lowest first, Rank the list's
own order back; each row keeps its rank number; `PB_TSORT`, this page load's alone, never in `S`; rows with nothing in the
column last). Each player row wears its club's tag before his name (`pbTeamChip`, `.ttag.sl-mini.pb-tteam`, titled with
the club). Projected says what it counts (`pbProjUnit`: "17 yds", "4.6 catches", "1.6 TDs"), and an anytime touchdown,
a dash until then, shows the model's chance he scores, "42% to score" (`pbProjOf`, the pool copy's `pm`), information only.
The audit's Top lines check and the nflbets smoke's `holdTop` read each projection with its unit by their own copies
(`UNIT_AUD`, `UNIT_OWN`), and the smoke holds the club tags and the sort (each column both ways, the focus kept, Rank
putting the order back) on the first list with two player lines.
**Reversed in part in app v140** (`patch_top_sort_arrows.py`, the owner's call of the same day: "I want little arrows on the
columns to sort instead of those sort buttons. and instead of "50% to score" for a josh jacobs touchdown, i want like their
projected touchdowns"). The sort bar is gone: over the Player lines a heading row (`div.pb-thead`, on the rows' own grid,
the five columns 92px and the Add column 76px so each heading stands over its column; at 1100px and under one line where
the figures sit, # beside them) has # and each column as a button (`button.pb-th[data-pb-sort]`) with its arrow
(`.pb-tharr`: ⇅ unsorted, ▼ highest first, ▲ lowest first). A touchdown projects touchdowns, "0.69 TDs": the model's
chance read as a Poisson count, -ln(1 - pm), as `tdPlus` prices 2+ (`pbProjOf`). The checks read the same (the smoke's
sort check through `.pb-thead`, each arrow held).

**The Top 50's player lines are a mix of bet types** (app v141, `patch_top_mix.py`, whose docstring is the design and the
diagnosis, the owner's call of 31 October 2026: asked how the Top 30's player lines should be chosen once all 20 were
anytime touchdowns, "A mix of bet types": "The best few of each type (anytime TD, rushing yards, receiving yards,
receptions, passing yards, passing TDs), each type's likeliest first. You always see every market", and then "okay lets
just build it. maybe expand to 50"). The diagnosis, on that day's payload (week 8, the page at 16:30 UTC): since app v138
every player leg is stated and chosen at DraftKings' fair chance, and nearly every one is DraftKings' line read on ESPN
at the estimate's price on a flat assumed margin (`DK_EST`, `estPrice`), so every estimated player line has the same
expected return at its own fair chance: an anytime touchdown exactly 1/1.0566 − 1 = −5.356805% (its fair chance worked
back from its rounded price over `DK_EST.tdVig`), passing, rushing and receiving yards −5.357143%, receptions −5.48% to
−5.82% and passing touchdowns −5.43% to −5.74% (assumed margins 5.99% and 5.90%). The Player part ranked by expected
return first (`pbEvKey`), so a 0.0003-point artefact put all 20 qualifying anytime touchdowns (chance 45-97%) ahead of
the 397 other player lines that qualified (138 receptions, 137 receiving yards, 71 rushing yards, 26 passing
touchdowns, 25 passing yards). The rule: the Player part is filled round by round from each bet type's own list
(`pbTypeRounds` in `part3.js`; a type is the leg's stat, over and under alike, and any other stat a qualifying player leg
carries is a type of its own), each list likeliest first (`pbByChance`: the chance, the pool copy's `p`, to 1e-9, then the
lean, then `pbOrd`, the chain the list read after the expected return); round 1 takes each type's first, round 2 each
type's second, a type run out skipped; a round's legs likeliest first by the same chain, the rounds one after another;
the part is that order cut at its length, so a round the cut falls in gives its likeliest legs. Where six types qualify,
ranks 1 to 6 are one of each. The list is the Top 50 (`PB_TOP_N` 50, 30 since app v116), up to 40 player lines
(`PB_TOP_PL` 40, 20 since app v138), the game bets filling the rest as before (10 where 40 player lines qualify, more
where fewer do). Unchanged: the pool (`pbLegs` on the ticks, every rule a suggested leg keeps), the Game bets part
(moneylines and spreads, then the totals, by expected return), a hook's Value part (first, by expected return), each bet
once, every row's columns and numbers, and the sort arrows (# puts this order back). No word on the page moved but the
Player lines list's accessible name, "... a mix of bet types, each type’s likeliest first" where it said "by expected
return on $1" (no new paragraph: app v130). The Suggested Parlays sets, the Elo picks and the record never read the Top
lines: on the same payload and clock every set and Elo pick is byte for byte as before. On that payload at 16:30 UTC the
list is 40 player lines and 10 game bets: Deshaun Watson's Over passing touchdowns (68.4%), Josh Palmer's Under
receptions (65.0%), Jahmyr Gibbs's touchdown (64.4%), then a receiving, a rushing and a passing yards line at 50.0% each
(the estimate prices most yards lines 50/50, so within those types the lean and then the key decide), and so on: 7
passing touchdowns lines, 7 receptions, 7 touchdowns, 7 rushing yards, 6 receiving yards and 6 passing yards, where
every one of the 20 was a touchdown. Held, blocking, each on its own copy of the rule, never the page's
`pbTypeRounds`: the audit's `mixAud` in `topFullAud` (each leg's place in its own type's list, then by place, then
likeliest first) on the week as it stands (`holdTop`, `TOP_N_AUD` 50 and `TOP_PL_AUD` 40), M12's case C (twelve games of
its own on a chance hook, every player line at -400 so the old order is the chance alone across the types: 34
receptions, overs and unders by turns, against three receiving yards, four rushing yards, two passing yards and one
touchdown, two passing touchdowns lines that do not qualify, ties on the chance broken by the lean and by the key, a
round out of round 1's order of the types, two of the hook's Value picks drawn first, and the cut at 40 player lines in
the receptions' tail with eight money lines after; its answer by hand, and the case shown to tell the old order and a
round left unsorted from it) and MC's six lines at one chance (round by round, which is the lean's order there); the
nflbets smoke's `mixOwn` in `pbTopOwn` (`PB_TOP_N_OWN` 50, `PB_TOP_PL_OWN` 40) on the week as it stands, its made-up
mix of bet types (eight receptions, overs and unders by turns, against three, four, two and one line of four other
types, an anytime touchdown at +200 that does not qualify, every line tied on its expected return as a real week's
estimated lines are, ties by the lean and the key, a round out of round 1's order; its answer by hand), its each bet once
fixture's new order (round 1 the Over 224.5 and the Under, tied at 50% and parted by the lean, then the Over 49.5; round
2 the Over 225, then the 60+ and the 70+, tied, by the lean; then the 225+ and the 226+; then the total; the week's
market table is now the fixture's own for the run, so the one-sided rungs' overround V is its 1.0909 on any payload,
since on `test_audit_phases.py`'s paid weeks the real lines' 1.05 or so made a -110 rung likelier than the Over 225 and
the rounds came out another way) and the sixty
made-up games re-sized for 50 (sixty player lines of four types, one of them more than the rest and two fewer than
their rounds: Moneyline alone the first 50 games, Moneyline and Player overs the mix's first 40 by hand and then 10
games, Player overs alone the mix's first 50; `topOver` met). Bite-tested on scratch copies of the parts: the old
ranking by expected return put back failed the audit 2,074 times (119 of them M12's case C, the rest the week's lists
and the sections that hold them) and the smoke 14 (the week's lists, its mix fixture, the each bet once fixture and two
of the sixty games' cases); each round left in round 1's order of the types (the within-round sort taken out) failed the
audit 583 times (15 of them case C) and the smoke 7 (the week's lists and its mix fixture). Wherever this file says, before
this paragraph or after it, that the Top 30 lines' player lines are ranked by expected return, or that the list is the
Top 30 with up to 20 player lines, that is history from app v141.

**The book's fair chance, and legs far off it** (app v98, the owner's call after Sunday 11 October 2026:
the model has run over-confident against DraftKings every week since week 2, and the suggestions, built
from its biggest edges, collected its mistakes; the 1pm Safe pair said 53% where its fair chance was
about 24%). Labelling and selection only, never a refit on the season in play. A leg's fair chance
(`legFair` in `part3.js`) is DraftKings' own, its prices with the margin taken out: where both sides of
the same line have a real price (a player's main line over and under, `PAY.mkt`; a game's two
moneylines, or its two spread prices on the leg's own number; the total's over and under on the posted
total) that side's no-vig chance (`devigOver`'s sum); where only one side is (a ladder rung, an anytime
touchdown, a team line or total missing its other price, a main line the payload has moved), the price's
implied chance over that week's typical overround on two-sided lines of its kind (`fairVig`: the median
of the two implied chances summed, player main lines for a player's leg, the moneylines, spreads or
totals for a game's, every kind's where the week has none of its own), worked from the payload on every
call and marked est. wherever it is shown; a leg with no real price has none (a `dkline` leg's is the formula's own,
est.; since app v125 a leg Pull from DraftKings priced takes the pull's, and a locked set's leg its locked one, `kept`). A parlay's
(`parlayFair`) is the builder's own `parlayProb` on its legs with each chance replaced by its fair
chance, so same-game legs move together as the model's do; with a leg that has none it is null and the
parlay shows the model's chance alone, saying the fair chance needs every leg's book price. Every
level's card and the Elo picks' lead with it, labelled fair chance (", est." where it is), "model says
53%" (the Elo picks: "Elo says") beside it; the levels are still chosen on the model's chances, so a
level over its floor is ruled "best return that lands 25%+ by the model" (and the label wraps inside its
box, app v100: four levels side by side just over 1100px leave it narrower than "FAIR CHANCE, EST."). The
builder's summary leads with it ("fair chance all 3 land", "model says" beside it) and its confidence
tile rates it ("confidence all 3 land, on the fair chance"; the model's chance, said so, where there is
none; app v100), each builder row gives its leg's ("fair 55%"), a game page's High/Medium/Low hand led
with it where every leg had a book price until app v124 took the hands off the page (its engine, `gameTiers`, still
works out each hand's fair chance, which the audit's M7 holds to `parlayProb` on its legs at theirs; the hands'
floors, 35%, 20% and 10% by the model's chance, had not been stated on the page since app v106 took the game page's
explanations off at the owner's ask), and the parlay card does too (below). A leg the model rates `FAR_OFF` (15 points) or more above its fair chance on its
side (`legFarOff`; only where a fair chance exists) is left out of the preferred and thin lists every
suggestion is built from, the sets' and the Top 30 lines' (`pbPool` and `pbLegs` count it in `far`, and the
Parlay Builder's note says how many lines and why) and of a game page's hands
(`gameLegPool`), and flagged "model 77% · market 55%: far off the market" (`farText`) on the game pages
(the player lines, the touchdown on a book price, and its rungs until app v127 drew none, the Game bets card's team
lines), in the
builder's rows and on an Elo pick, whose own selection (the Elo matchup chance) is left alone. The
audit's M holds every level's fair chance to `parlayProb` on its legs at theirs and its card to leading
with it; M7 works the rule on its own from the payload and holds `legFair` to it case by case, then
made-up lines one in three 25 points above the book's fair chance and one in three 6 points above: the
pool's count and note, no far leg on a level or a game hand, the flag on the game page (a main line; a
touchdown planted on a one-sided book price, and since app v127 a ladder rung priced so beside it drawing no row, box or
flag, where until then it was flagged with the ladders shown; the Game bets card's to win and to cover) and in the builder, the builder's summary and confidence tile, and the label free to wrap (until
app v124 also each game hand as its card drew it and made-up hands sure to take each branch, book-priced main lines,
one with a rung priced on one side, one with a leg on no book price, which went with the card). The nflbets smoke holds the same on the page and the Elo picks, and
`smoke_live.js` section J the card, its image and Share link's text (fair, est. and none). Reversed in part in app v138
(**DraftKings' chance on every leg**, under Props): the fair chance is the chance every leg and level is chosen and
stated at, so no card says "model says" or "Elo says" and no level "by the model", the builder states the expected
return and its confidence tile is gone, and the far-off guard and its flags left every suggestion and drawn surface
(`legFarOff`, `FAR_OFF` and `farText` kept for the hands' engine alone).

No device keeps a list of its own (the owner's call: visitors came to see X's parlays, the admin's tabs alone since 20 October 2026), and on
every device the builder's Save and lock is **Finish parlay**: it opens the parlay card
(`nflbets/build/card.html`, `pc-` prefixed, its own closure), a window showing the parlay as a
card (each leg and its price, the parlay's price, the stake and what it pays, the book's fair chance
first, then the model's (an Elo pick's, the Elo's) and the price's implied, or with no fair chance the
model's and why (since app v138 the fair chance, its expected return and the price's implied, no model's chance:
"Fair chance all 3 land 12.4% (est.) · expected −23% · the price says 10.5%"), the same lines in the window, the image and Share link's text (`chanceLines`), the
week and its dates, the site's mark) with **Download image** (a PNG drawn
on a canvas at twice its size, `parlay-week6-3legs.png`; the share sheet too where the browser can
share a file, which is how a phone saves it to Photos) and **Start over**. Beside them, **Open in
DraftKings** (a real link, in a new tab) opens the parlay on DraftKings' betslip,
`https://sportsbook.draftkings.com/?outcomes=<id>+<id>` with each `#` as `%23`, from the payload's `dk`
(see the Props loop): each leg's DraftKings id under its own key, a rung k+ as DraftKings' Over k-0.5
(or the whole k-1 its price was read from), in the card's order. Since 20 October 2026 those ids are a read's of
ESPN (the props job's published read, a press, the card's own check: DraftKings' event and its moneyline, spread and
total ids, never a player's, which ESPN does not carry) and, on the admin's card alone, Pull from DraftKings' (below);
so a visitor's Open in DraftKings carries only team legs and totals, and the card says once, under its buttons, "Player
legs go on DraftKings by hand: the site reads DraftKings’ lines from ESPN, which gives no DraftKings id for a player’s
line, so only team bets and totals go on the slip from here." (`BYHAND`, where a leg's game carries no paid player ids).
The paths that read a player's id from `PAY.dk` below stand for a payload a pull by hand baked ids into. Since app
v127 (**No ladder bets**, under Props) no rung k+ or 2+ touchdowns reaches the builder or a live set, so the card's paths
for them, here and below (a rung as DraftKings' Over k-0.5 or k-1, the conversions, the moved rule naming a rung's own
bet, Pull from DraftKings' ladder markets), stand dormant for a Suggested Parlays set locked before that day, finished
from the record as it locked, and for a pull's ids, as `card.html` says. Where DraftKings has no id at the leg's
own line but has the same bet at another number, the card converts rather than leaves the leg off (app
v109, the owner's call of 16 October 2026: under Props, "Every suggested leg on DraftKings' slip"): the
leg goes on the slip at DraftKings' number (`dkLeg`'s `swap`, chosen by `dkNear`), a spread as the same
team's, a total as the same side, a player's main line as the same player, stat and side, each at the
newest number a Refresh odds press read (`espnIdAt`), else (a main line) the page's main line for him
where DraftKings has it, else the closest number; a rung k+ with no Over k-0.5 or k-1 as the player's
Over at DraftKings' closest number for that stat; 2+ touchdowns as the anytime touchdown. A moneyline and
an anytime touchdown have no number, so they go on exactly or not at all. An id at the leg's own line is
taken unless a press read since (its `espnIdAt` later than that id's read) has DraftKings at another
number, when the newest is. A `dkline` leg is looked up like any other. The builder's legs and the card's
price are untouched: the note under the buttons lists each converted leg ("On DraftKings' slip at its own
line: 2. Card Runner, 100+ receiving yards: goes on as Over 64.5 receiving yards", `data-pc-dkswap`) and
says that DraftKings prices a changed leg at its own line, so its slip's payout can differ from this
card's. The button reads **Open in DraftKings** where every leg goes on the slip and **Open 2 of 3 legs in
DraftKings** where some leg still cannot. The builder says it first: where the card is on the page
(`window.PARLAY_CARD`), each builder row whose leg will not go on the slip as built has a quiet line under
it, read from the card's own `dkPlan` (`dkSlipRows`, `dkSlipLine` in `part3.js`; `.dkslip`, in the theme's
`--ink-2`): "On DraftKings as Over 64.5 receiving yards" where the card converts it, or "Not on DraftKings'
slip: " ("Not on DraftKings' slip yet: " until app v125) and its reason in a few words; nothing under a leg that goes on as built, and nothing on the
prop model's own page, which has no card. Under the buttons the card says what it
opens, gives each leg's own link too (DraftKings documents no link for several outcomes; since app v121 a list, a row each, and a
button for each game where the legs mix a same-game parlay with other games), and names every
leg it still cannot open and why. Since 20 October 2026, on a game no pull by hand read (every game), a player's leg
gives the ESPN read's reason (`dkNoLine`, `dklineWhy`): priced from DraftKings' line read on ESPN, "which gives no
DraftKings id for a player’s line: add it on DraftKings by hand" (`DKLINE_WHY`, briefly "no DraftKings id: add it by
hand"); its line read and no id ("its line was read from ESPN, ..."); "DraftKings had posted no line for him on this stat
when its lines were last read from ESPN"; or "DraftKings’ lines for its game have not been read from ESPN"; a team leg or
total with no id for its game, "ESPN carried no DraftKings lines for its game when they were last read" or that they have
not been read (`dkNoGameLines`); and on the admin's card each player leg then says what Pull from DraftKings will do with
it (`pullTail`: "(Pull from DraftKings puts it on the slip)", "... puts it on as his Over at DraftKings’ line" for a
rung, "... as his anytime touchdown" for 2+, or that Pull does not read its market), and after a pull its own reasons
(below). Until app v125 the reasons were the paid pull's alone, from what the payload holds (its first two since given
way to the ESPN read's above; the rest stand for a game a pull by hand read): its game's DraftKings prices not pulled yet, or
its game's lines read and none of its player prices yet (both with when they are pulled, the Parlay
Builder panel's words, and said only of a leg on no book price in a game with no DraftKings player price
in the payload: an id comes only with a price a pull bought, so a game priced late has none; the owner's
Monday night of 12 October 2026, Bills at Rams, whose player prices the Monday pull had not read; a ladder
rung adds that once they are, it goes on as his Over at DraftKings' line on the stat, and 2+ touchdowns as
his anytime touchdown, each priced by DraftKings there), a market the pull does not read (carries, attempts, completions, interceptions, rush + rec yards,
targets and the kicking lines: only `oddsfetch.py`'s DEFAULT is pulled, so no pull brings their ids;
an id the payload has for one is opened all the same; said since app v125 only on a game a paid pull read, `DK_READ`), no ids read for its game (a payload baked before
`dk`, or a game priced with none), a player's line on no book price DraftKings did not offer when its
game's player prices were read (dated; a book-priced leg with no id is said neutrally, not among the
lines read), 2+ touchdowns on a game whose player prices were read with no anytime touchdown of his
("DraftKings did not offer his anytime touchdown when its prices were read", dated), a rung there with no
line of his on its stat ("DraftKings had no receiving yards line of his when its prices were read",
dated), a leg priced from DraftKings' line read on ESPN that the pull's
ids have nothing for (`DKLINE_WHY`), or a game that has kicked off (until app v109 a line DraftKings had
at another number was named too, "DraftKings had it at 79.5 when its lines were last read", and left off
the slip; it now goes on at 79.5). The note is dated by the oldest read of
the legs it opens (`at` for a player's leg, `glat` for a team's line and the total), and never promises
that every leg lands: it opens "the 3 legs" (or "2 of the 3 legs") as DraftKings had them at that read,
and a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it; the
button's title says the same. DraftKings drops a moved id without a word, and a game's player ids were
read once by the paid pull, from a few hours to about 40 before its kickoff (Sunday night's on Saturday), so the day-long "puts all 3 legs on DraftKings' betslip"
it said before could be wrong on the very slip it named (dropped October 2026, with `fresh`).
**The card checks DraftKings' current lines as it opens** (the owner's report of 19 October 2026, on Monday night's
Commanders at 49ers: "same thing again.... put in that link and its only showing" one leg of four, his link's four ids
the payload's own, read by that morning's paid pull, and DraftKings having dropped the other three by the evening: its
total had moved from 51.5 to 52.5, whose game-line id names the number, and McLaurin's receiving yards from 47.5 to
49.5; the third, Daniels' rushing yards, stood at the same 39.5 and was dropped all the same, most likely a line moved
and moved back or re-posted under a new id). A Refresh odds press would have caught the total (it reads DraftKings' game-line ids
from ESPN, and the card takes the newest), but he had not pressed it, so the card presses it for him, for the parlay's
own games alone: opening the card is the visitor asking, and nothing is read on load, on a timer or for any other game.
`open()` reads each game of the legs still to kick off in turn through the page's own reader, `espnRefresh(gid)` (that
game's week's scoreboard and its player lines, two or three requests), skipping a game whose player lines a read
answered or found not posted in the last two minutes (`ESPN_OUT`'s `when`; a card opened again reads nothing), and
waiting for a press already running rather than skipping it; a payload baked before `dk` reads too, since the game-line
ids come with the read. While it reads, **Open in DraftKings** says "Checking DraftKings’ lines…" with no address,
`aria-disabled` and `aria-busy` (a press does nothing), Share link waits the same way (a press says "Checking DraftKings’
lines first…" in the card's status line), and the note under the buttons says only "Checking DraftKings’ current lines
for this parlay’s games…", with none of its legs' own links (after the review of 19 October 2026: drawn on the plan
before the read, the note's "One leg at a time" link to McLaurin's leg opened the very id DraftKings had dropped), while
Download image, Start over and Close work at once. The card waits at most 10 seconds (`CHECK_CAP_MS`): past it the buttons work on the plan as
it stands and one quiet line says "Could not check DraftKings’ current lines: a leg DraftKings has moved since its
lines were read will not be on the slip." ("since its prices were read" until app v125, `COULD`), as a read that fails does; a read that ends after the cap still updates
the card while it is the same one. When the read is done the plan is worked again on the same legs (`dkPlan`) and only
the card's DraftKings part is drawn again (the button's words, address and title and the note under the buttons, which
ends "Checked against DraftKings’ lines at Mon, Oct 19, 6:40 PM ET."), the focus kept where it is in the card, and the
card's status line (`#pcMsg`, a polite live region) says what it found, "DraftKings’ lines checked: Open in DraftKings
opens 3 of the 4 legs.", or the "Could not check" line, so a screen reader hears the outcome; a card
closed, or another opened, before an older card's read ends is never drawn from it (`ck`, the open card's own check),
and `PARLAY_CARD.checking()` and `checkState()` say where it stands. A total or spread DraftKings has moved goes on at
its current number on the id the read found (`dkNear`'s newest read, as after a press). And the moved rule, in `dkLeg`:
a player's id (his main line, a rung looked up as DraftKings' Over k-0.5 or k-1, or a `dkNear` conversion) read by the
pull (its `at`) before the newest read of his game's player lines (`espnGame`, `ESPN_LIVE`), where that read has
DraftKings' main line for him on the stat at another number, is dead: the leg goes on no slip, and the note says why,
"DraftKings has moved his receiving yards line to 49.5 since its prices were read (Mon, Oct 19, 11:42 AM ET), and its
slip drops a moved line: add it by hand at 49.5" (Share link's text and the builder's row, "moved to 49.5 since it was
read"), the button "Open 3 of 4 legs in DraftKings". A ladder rung k+ is DraftKings' Over k-0.5 (or the whole k-1), so
only a main line moved to one of those is the same bet: moved to any other, the rung names its own bet, "... add 4+
receptions by hand (DraftKings’ Over 4.5 is another bet)", in a few words "moved to 4.5 since it was read; add 4+ by
hand, not Over 4.5" (the review of 19 October 2026). ESPN carries no id for a player's line, so no free read gives the
new one. A read with no line for him on the stat leaves the id as it is, the anytime touchdown and 2+ touchdowns have no
number to move, and a `dkline` leg keeps its own reason unless the only id it could take is a dead one. What no read can
catch is a line moved and moved back, or re-posted at the same number under a new id, as Daniels' most likely was: the note's
caution stands for it. What the card's read keeps is a press's (`ESPN_LIVE`, `ESPN_GL`, `ESPN_OUT`, `PAY.dk`'s ids and
`props_press_v1`), and the page's status lines say it as they say a press; never `S`. The read is a press of Refresh
odds for those games, so a live set of them on Suggested Parlays re-picks on what it found, as after a press (a locked
set never), and the page under the card is drawn again once, when the last of its games is read: each `espnRefresh`
ends in `espnRedraw`, which empties every cache and draws the tabs again, about half a second on Suggested Parlays in
Chromium on the Saturday of week 6 (a pre-lock Sunday slot and Sunday night set on the screen), so a card over four
games drew the page four times; the card holds the page's `espnRedraw` back while its own reads run and draws once
after (`holdRedraw`; only `espnRefresh` calls it, and no other press can start while one runs). The page under an open
card never scrolls: a redraw under it (`renderSlate` closes the game window and takes body's `modal-open` off with it,
a press the card waited for among them) is undone at once (`keepModal`). A control the visitor was on that a redraw
replaces is found again by an attribute it keeps (`lastFocus`, `refind`: Start over's Parlay Builder choice, with none
drawn the chosen tab's button), and a closed card gives the focus back to its Finish or the one now standing for it,
else its set's Add to builder or heading, else the chosen tab's button, never a control on a hidden tab or the page's
body (`backTo`). With no leg it can open the button
stays, to add the legs by hand: **Open game in DraftKings**, the game's page, where every leg is in one
game still to come with its event id, else **Open DraftKings**, DraftKings' NFL page
(`https://sportsbook.draftkings.com/leagues/football/nfl`), and the note says so. **Share
link**, beside it, is for sending the parlay to people (the owner, October 2026): one plain text, by the
share sheet (`navigator.share({title, text})`, `canShare` asked about the same) or, with no share sheet,
one that cannot share it or one that fails other than by a cancel, copied (the clipboard, else a hidden
box; the card says Link copied), the same text either way. The title is "3-leg parlay +330" (with
"(estimated price)" or "(fair price)" where the card says so); the text a plain line a leg (who, the bet,
its price, "+210 est." or "+150 fair" where it is not the book's, as on the card), the stake and what it
pays, the chances, then the DraftKings link alone on its own line under what it opens ("DraftKings betslip
(opens the 3 legs as DraftKings had them):", "DraftKings betslip (opens 2 of the 4 legs as DraftKings had
them; add legs 3 and 4 by hand):", never "all"; with no leg on the slip
"DraftKings, the game's page (add the legs by hand):" or "DraftKings' NFL page (add the legs by hand):"),
when DraftKings' lines were read and that a leg moved or pulled since will not be on the slip ("DraftKings
lines as read ...: a leg whose line DraftKings has moved or pulled since will not be on the slip, so check
it before you bet"), a line naming each converted leg ("On DraftKings' slip at its own line: leg 2 as
Over 64.5 receiving yards (DraftKings prices it at its own line, so its payout can differ)"), the legs to
add by hand, a line each with why in a few words ("no DraftKings id: add it by hand"; "player prices for its game are not
pulled yet" until app v125), and
the site's address last, as where it came from (its root, `demon-x13.github.io/nfl-hub`, on the card and its image as
in the text since 17 October 2026; `.../nfl-hub/nflbets` until then). The link is in the text and
never in the share's `url` field (the owner, October 2026: "sometimes when i copy the button to share the
draft kings link it like compresses the url and doesnt show all legs"): on an iPhone WebKit hands the share
sheet the text and the url as two items, Messages draws the url as a card showing only
sportsbook.draftkings.com, some apps send only the bare domain, and the sheet's Copy keeps the text and
drops the url (WebKit bug 203221), while Android's Chrome joins the two, so it went wrong only sometimes.
Before October 12 a parlay with no leg on the slip sent the site's address alone, which the owner took for
a link to GitHub. A cancel does nothing, and neither button ever draws or downloads the image, which
carries neither. Every dollar figure on
it is whole, thousands marked: the window's tiles wrap onto a second row rather than cut one, and
the image's step down from 19px to 14px, then take a second row. Finishing saves
nothing anywhere; a suggested level's Finish finishes the same way, answered by one listener in the card
(`finishFrom`): a Suggested Parlays level's (`data-pc-finish="sp|<game id>:<level>"`, which `fromTier` reads through
`window.spTier` as the tab shows it, live or locked, and since app v112 only for a game the tab sets out, the card's
kicker naming the game: "Medium parlay · SEA at DEN") and an Elo pick's (`"elo|<pick>"`). Start over gives the focus to the tab's choices on the screen: the Parlay Builder's mix (`[data-pb-mix]`, as before
app v116 put the builder over it), or Suggested Parlays' first Add to builder.

**Pull from DraftKings** (`card.html`, app v125's companion, the owner's call of 20 October 2026: every visitor on the
ESPN estimates, "and only have an option to click on the pull from Draft Kings button available for me to run to pull all
the current stuff"). On the site owner's devices alone (the admin link: `window.HUB_ADMIN.on()` at the card's open and at
the press; a visitor's card has no such button and asks The Odds API nothing) the card's first button, `#pcPull`
(`data-pc-pull`, 44px, in `.pc-pullslot` before Open in DraftKings), spends his Odds API credits on that one parlay's
player legs for DraftKings' real prices and fresh slip ids, through `HUB_ADMIN.odds` alone (the card never holds the key,
names the API's host or asks anything itself: `build.js` refuses it). The plan (`pullPlan`): each player leg still to kick
off asks one market of its game by its stat (`PULL_BASE`, `oddsfetch.py`'s `MARKETS` turned round: passing, rushing and
receiving yards, receptions, passing touchdowns, attempts, completions, interceptions, carries and the anytime touchdown;
a rung k+ the `_alternate` ladder, `PULL_ALT`, unless DraftKings' main line for him, `mainNow`, the ESPN read's else the
payload's, is k-0.5, and where this load pulled his rows in the base market and they stand by the moved rule (below),
the base market only where those rows have his Over k-0.5 or k-1, else his ladder: so a rung the base market did not have
is asked of the ladder next time, whatever a trailing ESPN read still says (the review of 21 October 2026, after a pull
asked 225+ passing yards of the base market on ESPN's 224.5 where DraftKings' main was 230.5, and slipped Over 230.5 in its
place; every re-pull asked the same); where the moved rule has set those rows aside, the base market again, whatever the
rung (`pullMarket`: the moved verdict reads that base pull, and only a fresh one clears it), then his ladder where the fresh
answer lacks the rung and no ladder row of his already pulled has it, a ladder row already pulled putting it back on the
slip with no other call (the second review of 21 October 2026: the rung asked its ladder alone, which left it dead, a
credit spent on every press and "or pull again" false; with his main moved from 230.5 to 227.5, 231+ on DraftKings' main
Over 230.5 now comes back in two credits, the base market then the ladder, and 225+ on his ladder's Over 224.5 in one);
2+ touchdowns the anytime market; since app v127 no ladder bet reaches the builder or a live set, so a plan asks only
base markets, and the ladder paths, `PULL_ALT`, a rung's `pullMarket` and `whyOf` 'ladder' below, stand dormant for a
Suggested Parlays set locked before that day: **No ladder bets**, under Props); rush + rec yards, kicking points and field goals made are not
read, and a leg on one says so; team bets and totals ask nothing (their ids come from ESPN). The cost is "up to" one credit
a game and market (a market DraftKings has not posted costs nothing), a game and market pulled under 5 minutes ago
(`PULL_FRESH_MS`) is served from what was pulled, free, and a game whose ESPN check found no player lines posted is left
out unless the admin pulls anyway. The button reads "Pull from DraftKings · up to 3 credits" ("Pull again · ..." for one
pulled before, "Pulled just now" or "Pulled 2 min ago" while fresh, "Pull anyway · ..."), disabled with its reason where
there is nothing to pull ("Nothing to pull: team bets and totals take DraftKings’ ids from ESPN.", every player leg's game
kicked off, a market Pull does not read) and while the card's ESPN check is busy. A press makes one free look-up of the
NFL's events around the parlay's kickoffs (`sports/americanfootball_nfl/events`, 12 hours either side), matched to each
game by the unordered pair of its clubs (`DK_TEAMS`, which `build.js` holds equal to `oddsfetch.py`'s `TEAMS`, club for
club) within 36 hours of its kickoff (`PULL_EVENT_H`), then asks in the card, never by `window.confirm`: "Pull now: up to 3
of your 212 credits." (the look-up's `x-requests-remaining`), with Pull and Cancel (Cancel or Escape spends nothing; a game
with no player lines posted named, with Pull anyway). The pull is one GET a game, in turn (`bookmakers=draftkings`, the
plan's markets, `oddsFormat=american`, `includeSids` and `includeLinks`), 15 seconds each (`PULL_TIMEOUT_MS`); while it
runs the button says "Pulling DraftKings’ prices…" and Open in DraftKings and Share link wait. A paid call is never tried
again by itself after a timeout or a network failure: the card checks the balance, free, and says "Could not reach The
Odds API: it may have spent credits (209 left)." (before any paid call, "... (no credit spent)."); 422 `INVALID_MARKET` is
asked again a market at a time; `EVENT_NOT_FOUND` looks the event up once more, free ("DraftKings has no event for NE at
CHI now."); a game that kicks off before its answer is left as it was; a refused key says "The Odds API did not accept this
device’s key: sign out and open your admin link again." (`HUB_ADMIN` marks the record refused), no credits "Out of credits
until your plan resets (0 left).", a 429 "The Odds API is busy: try again in a few seconds.", nothing posted "DraftKings has
not posted these yet (no credit spent)."; done, "Pulled DraftKings’ prices at 6:41 PM ET: 3 credits spent, 209 left." in the
card's status line, the focus kept on the button. What it read is kept in the card's memory alone (`PULL`, never `S` and
never the browser's storage: a reload or a sign-out forgets it, and an answer that comes after a sign-out is dropped), each
row placed on one of the game's players (`pullPlayers`, the payload's roster of its two clubs) by a book name the job
already placed on him (`pullPlaced`: `PAY.mkt`'s `n`, a price row's player) and else by the job's own rule, `names.py`
ported into the card (`dkNameRule`, between its "the name rule" marks, with `nicknames.json` set into its `/*NICKNAMES*/`
slot by `build.js`: a printed name, the legal form, a short first name or a nickname, or two words swapped; one player in
the first tier with any, else none; never the looser `nameKey`). `pullFor(l)`, handed to the props parts as
`window.dkPulledFor` (`parlayLegs`, `legPrice`, `legFair`: **Reversed in app v125**), gives a leg the same bet (a main line
at its line on its side, a rung at DraftKings' Over k-0.5 or the whole k-1, the anytime touchdown's Yes) with DraftKings'
price, sid and fair chance (both sides' prices with the margin out, else the price over the pull's own typical overround,
`pullVig`, est.), so the builder and the card price it as DraftKings' own (`'real'`) by the builder's own sums and a
Suggested Parlays level finished on the card is priced again the same way; his main line DraftKings has moved, put on the
slip at DraftKings' number with its price ("goes on as Over 66.5 rushing yards, which DraftKings prices at −115"), the leg
keeping its own; a rung DraftKings lists no such Over for, his Over at DraftKings' closest number ("DraftKings lists no 70+
rushing yards for him; goes on as Over 64.5 ..."), said only where his ladder was in the answer; a rung asked of the base
market that it did not have, his ladder not asked, on no slip and no other bet in its place ("DraftKings had his passing
yards line at 230.5 when you pulled from DraftKings (...), so 225+ is on its ladder, which that pull did not ask: pull again
for his ladder", `whyOf` `'ladder'`; the builder's row "his main line at 230.5 when pulled; pull again for his ladder"; with
no main line of two sides there, "DraftKings had no Over 224.5 passing yards of his on its main line ..."), the next plan
asking the ladder; 2+ touchdowns on his anytime touchdown; or why there is none (no line of his, the market not posted and so no credit
spent, his DraftKings name not placed: add it by hand). The moved rule on a
pulled line (`PULL_MOVED_MS`): ESPN's feed can trail DraftKings, so a pulled line stands against an ESPN read of his main
line at another number unless that read came more than 15 minutes after the pull; then its id is taken for dropped, as
DraftKings drops a moved line: "DraftKings has moved his receiving yards line to 49.5 since you pulled from DraftKings
(...), and its slip drops a moved line: add it by hand at 49.5 (or pull again)", and a pull again asks the base market
afresh, a rung's too, which that read no longer sets aside. The fresh sids go on this card's slip
alone (`dkLeg`'s pulled branch, `dkPulledLeg`), never into `PAY.dk`, so the admin's suggestions are exactly everyone's.
A card closed, or another opened, while the free look-up is out is drawn waiting meanwhile, and once the look-up answers
for the card it was pressed on, now gone, the open card is drawn again with Pull and Open in DraftKings working (until the
review of 21 October 2026 they stayed "busy" where the new card's own check had nothing to read).
`PARLAY_CARD.pullPlan()`, `pull()`, `pullState()`, `pulledFor(l)` and `nameRule(desc, players)` say where it stands.
`node nflbets/build/test_dkname.js` (blocking, seconds, `python3 -I` beside it; in the props gate's job C) holds the
card's name rule to `names.py`: every pair of `test_unmatched.py`, the audit's own two `nameRule` cases, `Pool.match` over
whole games built from `test_unmatched.py`'s fixtures and a few of its own (accents, suffixes, punctuation, a nickname two
share), `names.norm` on awkward strings, and the nicknames both ways. `smoke_live.js`'s J3 holds the pull on a stubbed Odds
API and V a visitor's page (under the smokes, below); since the review of 21 October 2026 `smoke_live.js` is one of the props
gate's job C units too (`UNITS` in `props_gate.py`, about four minutes), so a change to the card cannot merge without it.

The build lifts renderParlay's pricing
out of `part3.js` into the card, so its price is the builder's own. Where X's parlays and the X Bet
Log come from is in "X's parlays and the X Bet Log" below. Then the Player Elo tab
from `nflbets/build/tab_elo.html` (`pe-` prefixed, its own closure, reading `elo/data/`), and the betting
app's Records, Power Ratings and Bet Log tabs in frames: the app, as `betting/tools/build.js`
builds it, is carried in the page as a string (`BET_APP`) and becomes a frame's srcdoc when
its tab is first opened, with `window.EMBED_TAB`, `window.STATE_URL` (`betting/state.json`) and, since 17 October
2026, `window.ELO_URL` (`elo/data/model.json`) written in front of it: a srcdoc frame resolves an address against the
page's, so the page names the app's two files from the root (on its own, from `betting/`, the app reads `state.json`
beside it and its fallback `../elo/data/model.json`, the one parent folder the build lets the page name; the betting
smoke holds both readings). The frame's own `<html>` tag is given the page's light or dark look when it is made and
again when it loads (under "The hub look"). A srcdoc frame is the page's own origin, so the app keeps its browser store. A frame takes
the height of its content and never scrolls up and down by itself (`frames()` in
`nflbets/build/hub.html`, `tab_pickems.html` until 22 October 2026): allowed to, a classic scrollbar, Windows Chrome's with its arrows, stuck in the
Pick'em Record with nothing to scroll, since its charts drawn without the bar came out a few px
taller than the height measured with it. Sideways, a box scrolls only where its content is really
wider (the week-by-week grid and the pick grid on a phone), with one bar.
Nothing is baked in: it fetches, each named from the site's root where it is, `props/data/payload.json` (the props job's
read of DraftKings' lines on ESPN inside it), `betting/state.json`,
`liveparlays/parlays.json` and `liveparlays/xbets.json` (on the admin's browser alone since 20 October 2026), `picks/friends.json` and `elo/data/*.json`, and the news job's
`news/data/units.json` as the page loads, the current week's notes once the season is in (`pk-state`; until 22 October
2026 once the board had drawn) and another week's when a window first wants them, and
`news/data/stats.json` only when a game page's Team Stats window first opens (app v124), so it is
rebuilt when a source changes, never when the data does; ESPN's scoreboard on load only where a game of the Props
list's week is under way with no score (`scoresOnLoad`, the read the Props tab's Refresh scores makes, once: under "Bets and
Stats: the loop"; the Matchups board read it on every load until it went on 22 October 2026), and ESPN's feed otherwise
only when a visitor presses Refresh scores or Refresh odds (under Props, "Refresh odds") or opens a parlay card (its
games alone), what Refresh odds and the card read held in memory and kept in the visitor's browser until it gives way (never in
`S`, never sent anywhere); and The Odds API only from the admin's browser, through `HUB_ADMIN` (the key's free check, and
Pull from DraftKings when he presses it). A props patch, a betting build change or an edit to the live section's source means
rebuilding it too, and a change to `nflbets/build/deepdive.js` is held by the news smoke as well:

```
node nflbets/build/build.js      # writes the page, the root's index.html
node nflbets/build/smoke.js       # must end "0 failures"; Suggested Parlays, its night rule, its lock and its short lines, the Elo picks' four levels, the Parlay Builder (the builder first) and its Top 50 lines, their two parts (the player lines a mix of bet types), the totals last and each bet once, the published ESPN read and the id rule by content, only DraftKings' markets, no ladder bet anywhere (and one kept in the builder taken out on a reboot), the matchup bubble, a game page's Matchup, Mismatches and Team Stats windows and no Game snapshot button (the whole snapshot the matchup bubble's alone), Suggested Parlays one section with one record and no backtest chip, clubs level on a unit sharing its rank, the parlay sums the same to the bit, the search's beam the same as it stood and Suggested Parlays opened without a freeze a level a step, the Elo leans, Elo picks, player window and bubble on the Elo-adjusted averages (the formula's on a file from before them), the ELO tab's bar its stamp alone, the X Bet Log with no Note column, the scoreboard on load, the Props tab first with the board's old addresses landing on it, a visitor's six tabs and, on an admin's boot, X Parlays and the X Bet Log from their files, the old addresses' redirects to the root, and the light look and its switch
node nflbets/build/smoke.js --season-over   # the same with every game played (the playoffs, the off-season)
node nflbets/build/smoke_live.js  # the X Parlays section from its file on its own tab (each card's X and Clear this parlay? too), on the admin's browser and a visitor's, and the parlay card (the builder's and a Suggested Parlays level's, its check of DraftKings' current lines as it opens, and the admin's Pull from DraftKings on a stubbed Odds API), each boot's seeded ladder legs taken out with the builder's line; must end "0 failures"
node nflbets/build/smoke_admin.js # the admin link and the hidden X tabs (admin.js, HUB_ADMIN, the header, Sign out, a visitor's page, the key nowhere but The Odds API's requests); must end "0 failures"
node nflbets/build/test_dkname.js # the parlay card's name rule (Pull from DraftKings) against props/build/names.py, case by case (python3 beside it); must end "0 failures"
(cd news && npm ci && node tools/smoke.js)   # after a change to deepdive.js: the Deep Dive drawn on the real news files (the nflbets smoke only uses stand-ins); must end "all checks passed"
```

The elo job runs `smoke.js` every morning of the year, so it has to hold in any week: it takes
`state.json`'s current week as the Game snapshot does for the week's notes (the first with a game still to play, else the
last: the week the Matchups board opened on until it went on 22 October 2026), checks
what needs a game to come only when there is one, and, once the page's own week (`liveWeek()`: the
first with a game not yet final, else the last) has no game still to kick off (within the hour of its last
kickoff or past it: Monday night under way before the props job rebakes after its final, which the Elo job,
dispatched by the betting job on a final, lands in; and the season's end), boots the page two days before
that week's last kickoff so the Top 50 lines, the sets, the Elo picks and the builder checks still have a game to stand on;
a missing section there is a failed check, never a crash. A prime-time game between its set's lock and its kickoff
(Sunday night's from about 22:20 UTC, when the betting job's late-afternoon finals dispatch the Elo job) is held as
the set it locked (`holdLocked`), and the checks on made-up lines move it a day and more out, so they stand on live
sets at any hour. Which games Suggested Parlays sets out turns on the hour too (one night at a time, from 6:00 AM
Eastern: under "Bets and Stats: the loop"), so the smoke works that out on its own (`nightOwn`, through `Intl`) at the
page's clock and holds the tab to it, and a check that needs the cards of a set the rule keeps off the tab at that
hour stands the page's `spOn` in with every prime-time game to come and puts it back. The made-up lines plant a total of
44.5 on every game they stand on that has none posted (weeks 8 to 18 of a mid-October payload have none), and the Elo
picks' block and the matchup bubble's stand on made-up games of their own two days out, so each holds on a Sunday
afternoon, the Tuesday after and the off-season alike (until 18 October 2026 the Elo picks' block stood on
matchups.json's own games and threw once they had kicked off). `SMOKE_PAYLOAD=<file>` boots it on another
payload, to try a week the job has not baked, and `SMOKE_NOW=<ISO time>` runs it as if it were then
(Node's clock and every page's, the shift above laid over it; `props/build/test_audit_phases.py` uses both). `--season-over` gives every game a result first; run it after a change to the smoke, to the Props tab's rows or to
the Game snapshot (to the Matchups board until it went on 22 October 2026). Both smokes end on their own: a mistake in the smoke's code exits 1 at once
with its stack, a run still going after twenty-five minutes stops and fails (smoke_live.js after ten), and one left waiting on
nothing (no window open, its body not done) fails instead of ending Node with a silent exit 0.
Since app v125 (**Reversed in app v125** and **The published read**, under Props; **The admin link**, above) the smoke,
which has no warnings, holds: its own copies of the id rule by an entry's content on the live table (`dkOwnId`, `dkTakes`),
and on a payload baked with `dk:{}` a press's read leaving its game's player legs in every list, set, hand and Elo pick;
the status line's published sentence on a payload with a read ("DraftKings’ lines as the site read them from ESPN ...")
and "Prices as published" on its stand-ins with the read taken out; before its Refresh odds section nothing beyond the
published read (`ESPN_GL`, `ESPN_OUT` and `ESPN_IDAT` empty, `ESPN_LIVE` exactly the published blocks, no
`props_press_v1`); every plant on a real game made with that game's published read taken out first (`strip()` takes its
`PAY.espn` entry and the schedule's `lsr`, `ls` and `lat` it set) and put back; a real reload on a payload with a read and
a kept read, each precedence case, with no ESPN request on load; the new words (`pbNoPl`, `spNoPl`, `DKLINE_WHY`, "Not on
DraftKings’ slip: "); a visitor's page as its main boot (six tabs, Props first, `#xparlays` and `#bets` landing on the
Props tab as `#slate`, `#matchups` until 22 October 2026, neither X file read) and an admin-seeded boot (`nflhub_admin_v1` set before the page parses, checked, so `admin.js` asks
nothing) for X Parlays and the X Bet Log, both files read no-store, `#hubAdmin`'s words set aside where it looks for an
owner mark; and the old owner link refused. Its request recorder fails any request to `api.the-odds-api.com` (an admin
seeded as checked asks nothing; the link itself is `smoke_admin.js`'s) and any request to ESPN's core host on load (ESPN's
scoreboard is asked on load only where `scoresOnLoad` says, which the smoke works out on its own and holds).

**The Game snapshot.** The matchup bubble opens a game's whole Game snapshot by its Open game snapshot
(`window.gameSnapshot(gid, from)`), the one way in since app v129. Until 22 October 2026 a tap on a game on the Matchups
board opened it (the owner's call, 14 October 2026: the row was the button, `role="button"`, `tabindex="0"`,
`aria-haspopup="dialog"`, opened by a click, Enter or Space and wired once on the board in `wireRows()`, so a redraw never
opened a window; before that a tap opened the row on two buttons, the snapshot and the game's props). That day, when the
board went, app v128 gave each game's page on the Props tab a fourth button, **Game snapshot**
(`props/build/patch_snapshot_button.py`, the owner's call "Button on Props": `button.btn.quiet.gwin-btn`,
`data-gp-pop="snap"`, after Matchup, Mismatches and Team Stats, through the binding the other three use,
`window.gameWindow('snap', g.id, button)`, which opened the whole window, `open(gid, from, {page:true})`), and app v129
took it off again the same day (`props/build/patch_night_record.py`, the owner's call: "on second thought, i dont want that
game snapshot buttons. please remove it."): `window.gameWindow` opens one card alone for Matchup, Mismatches and Team Stats
and nothing else (**A game's page: Matchup, Mismatches and Team Stats**, below), and `FROMPAGE` and `overOwnPage` are gone.
It is a window over the page
(`nflbets/build/snapshot.html`, `gs-` prefixed, its own closure, inlined by the build after the ELO tab's script,
with `nflbets/build/deepdive.js` set in as its own script just before it, so a change to either is a rebuild too;
the page's modal, Escape, Close and a click outside close it, Tab stays inside, the focus goes back to the
button that opened it) with everything the site has on that game: each team's record as Team Rankings counts it,
the kickoff and site, the game's preview and news, the Vegas line as `state.json` carries it, every model's pick, chance and grade
(Vegas, Alpha Model, the Joker and the ELO Model, from
`state.json`'s `processed`, `atKickoff` and `joker` and `model.json`'s `graded` and `next`),
each team's Power Rating, the season's team stats side by side (until 16 October 2026; since app v124 a game page's
Team Stats window, below), Overall Offense against Overall Defense both
ways with the Deep Dive's position matchups, each team's expected
starters position by position with their season Elo, rank, shield and Q as on the ELO Ratings tab
(`lineups` in `matchups.json`), each name a 44px button to his own row on the game's page on the Props tab where the
prop model draws one (the owner's call, 16 October 2026: "in starters, make player names clickable to their props
page": `pkBoard.propsPlayers`, the players `renderGame` draws as rows, and `openOnProps(id, pid)`, which closes the
window and opens the page with his row open, highlighted by the ELO tab's `eloFocusPlayer` and focused; anyone else
plain text) and its ranked players out, and the Props tab's Mismatches in the game (the
Sources card, with each file's publish time and links to the full tabs, went on 14 October 2026, the owner's
call). Opened from a game's page in app v128 (`FROMPAGE`) it was that page's window, as the page's one-card windows are:
it went with the page (`closeGameModal` wrapped: Back, the game's week closing) and with a change of address (a
`hashchange`), and quietly on a key pressed once the game's page was off the screen; Escape closed it alone, the game's
page and its scroll lock kept; a double click's second click within 0.4 seconds of its opening did not close it
(`ONE_AT`); and its close gave the focus back to its button, else the same `[data-gp-pop="snap"]` drawn since, else the
page's Back, else the game's row on the Props tab, else the chosen tab's button (`oneFocus`). Opened from the matchup
bubble it is no tab's window, as the board's was (under **A window is its tab's own**): it stays open across a change of
address, and its close gives the focus to the name that opened it where that is on the screen, else the chosen tab's
button. It is drawn from
`gameFor(gid)`, the season's row where `state.json` has one, else the prop model's own row in the season's shape, so it
opens before the season is in: for a game the season has no row for, while its read is out it shows its title and one
line, "Loading the season…" (`p.gs-msg[data-gs-season="loading"]`), and draws whole once the read answers (`pk-state`, from
the page's glue, redraws an open whole snapshot); where the read failed, "The season did not load (<why>), so the
snapshot cannot be drawn: it reads `betting/state.json`. Reload the page to try again." (`data-gs-season="failed"`),
drawing nothing else and throwing nothing (the one place the page says the season did not load); where it answered
without the game, the prop model's row. It reads at a glance first (the owner's
ask, October 2026: easy to read, nothing smooshed): a pinned header that turns into the game in one
line (records and spread, or the score) once the verdict scrolls away, then a verdict card always
shown -- first, where the Props tab can open the game (`pkBoard.canProps`: the prop model has its row and
its week is open), a 44px **Game bets and player props** button, which closes the window and opens the
game's own page on the Props tab with its Game bets card brought into view (`pkBoard.openOnProps`), drawn wherever
`canProps` says, the game's page open under the window or not (in app v128 not over that very game's page, `overOwnPage`,
where its own Game snapshot button had opened it and the button would only redraw the page under it); then
the head (`.gs-hero`): the away team, the middle (`.gs-mid`) and the home team, each team labelled Away or Home
("Home (listed)" at a neutral site) over its name and its record alone (3-2, bold, with no words for which games it
counts; the playoffs beside it once there are any; where the Elo file has counted a final the results have not,
the file's count, its title saying so), and no "at" circle between them (the owner's call, 14 October 2026: the
labels say it). The middle holds the score once there is one, the kickoff and site (a neutral one named so), and
the preview (below); under 900px (an iPad's 768 among them) the teams share a row and the middle goes full width
under them, the phone's smaller sizes from 760px. A played
game's note follows the head; then the
headline ("Jaguars favoured by 7.5", its chance and its confidence pill, Vegas's band, `BET.tier`, titled "Confidence in
Vegas's pick", the board's own until it went; once played, "Buccaneers won" with an Upset chip and the line it was
favoured by under it) over the split bar in the two clubs' colours (`.pk-prob`, `probCols`, the board's until it went),
the spread, total and moneylines (no line naming their sources any more, the owner's call, 14 October 2026),
and five answer lines, each
a button that opens its card (the model picks, Vegas kept apart as the baseline: how many of the three
models agree with it, the ones that do not named, once played how many of the four calls were right;
the Team Elo gap; which side ranks higher on offense against defense each way; who is out by name and
how many starters are questionable; the top mismatch on its four-step meter) -- then a card each
(Model Picks, Team strength, Offense vs defense, Mismatches, Starters: `CARDS` in `snapshot.html`, the Sources
card gone on 14 October 2026 and the Stat breakdown on 16 October 2026, the owner's calls, the second "get rid of
stat breakdown section") that folds, Mismatches and Starters to a one-line summary, Starters and Mismatches with a count badge; Model Picks,
Team strength and Offense vs defense carry no summary and no note under them (the owner's call, 14 October 2026:
the verdict says it; Team strength keeps only its star note, where a rating predates a final, and has no Tier row):
Model Picks and Team strength open on a
wide screen, every card folded on a phone, Open all and Close all. Model Picks is one lean chart (each
bar leans from 50/50 toward the side its call picks, in that team's colour); Offense vs defense shows one
possession under the other, laid out like the head, centred and limited (the owner's call, 14 October 2026): its
title ("Seahawks Possession", the nickname from `TEAM_NAMES`), the Deep Dive's headline tag and its points centred
under it, the two overall ratings in two boxes of one size and shape (`.gs-ubox`, either side of
"vs", the better rank's tinted, with no separate edge chip), then the Deep Dive's four position matchups under
"Position matchups" (below), a compact centred row each (unit, the two clubs and Elo, each Elo with its tier's
shield, the higher marked, the defense's position, the tag; up to 760px the two positions on a line of their own,
"Quarterback vs Overall defense", over the rest), and no stats fold; what the ratings
rest on is the boxes' title, what the matchups rest on the label's;
Starters puts the ranked players out first, then Offense, Defense and Kicker tabs (the choice kept
while the page is open) with the two teams' header under them, directly over the table (the owner's call, 14
October 2026), each defensive unit's league rank at either end of its group's header. The
side of every comparison with the edge wears one mark (`gs-better`): the higher rating, Elo and
chance, the better rank, the higher season Elo of each pair of starters and of each position matchup. One type scale (11, 13, 15,
18, 22, 30px; a phone takes the top two to 20 and 26), every control at least 44px tall, and every
text at least 4.5:1 on its own background in the hub look (red on the red tint is a lighter red,
`--gs-miss-ink`; the theme lifts the window's red and quiet text, and the Deep Dive's tags, the Even chip's ring
held at 3:1 on the card as a boundary, the preview block and the names it bolds, a position matchup row's words on the card and the better rank's tinted
box). Opening a card, a fold or a tab never redraws
the window, and nothing of it is saved.
It computes nothing of its own beyond the vote's counts and the Elo gap: the page's glue (`hub.html`, the board until it
went on 22 October 2026) hands it the season, the Vegas call, where a game stands (`outcome`: the published result, else
the payload's final, else the Props tab's scoreboard read) and the way to the Props tab (`window.pkBoard`), and the ELO tab its one read of
`elo/data/` (`window.eloFiles`) and its Mismatches (`window.eloMismatches`). A played game says the
ratings, lineups and units are the files as they stand now, and a file that did not load, a game outside the
matchups' week or a team whose lineup is for another game is said in its card while the rest draws.
`smoke.js`'s last section (THE GAME SNAPSHOT) holds every number shown to its file (each number the
verdict and the summaries add is marked `data-gs-n` and worked out there on its own, as are the edge
marks in the cards and on the verdict's Team Elo and Offense vs defense answers, the side each names
with the edge, the dissenters, the unit ranks in the Starters headers and the badges),
the at-a-glance bars to the same numbers (each call's bar leaning toward its own pick, as far as its
chance and in that team's colour, and the Vegas split bar each side's chance wide), the
headline to the files and its confidence pill to Vegas's band on them (to the board row's own until it went), the header's game bar, the head (the away
team, the middle and the home team; in the middle the score, the kickoff and the preview, in that order; no "at"
circle; the Away and Home labels and a neutral site named; the played note right after it), each record the record
alone, no line naming the line's sources, each meeting in Offense vs defense two boxes of one class either side
of "vs" with no note or edge chip, no Sources card, publish time or link away from the window, and the trim of
14 October 2026 (Model Picks so titled, no summary on it, Team strength or Offense vs defense, no Tier row, no notes
but the star's, "<Nickname> Possession", no stats under the units, the Starters teams under the tabs), no Stat
breakdown (16 October 2026), on a game
to come, a final on the scoreboard, a graded game and a playoff game, with a file missing; every
number is read with the cards and the Starters tabs as they open (folded or not
shown), and the folding, the answers' buttons, the Starters' names (linked exactly where the game's page draws the
player's row, read off `renderGame` itself, plain text before the prop model is up, and a click opening his row), the
props button (there exactly where `canProps` says, the game's page open under the window or not, and doing its job), the
tabs' arrow keys, the Tab order and the 44px tap heights are held too, on a wide screen and a phone; each of the Props
list's first four games opened as the matchup bubble opens it (`window.gameSnapshot`) opens its own game's whole window,
and no game's page draws a Game snapshot button (`[data-gp-pop="snap"]`, or a button so worded) or opens a window for
`window.gameWindow('snap')` (since app v129; in app v128 its button opened the whole window, held for the focus on Close,
Escape closing it alone with the game's page kept, a second Escape closing the page, the clicks, a redraw under it and
Back taking it with the page); no Refresh scores press opens a window; before the season is in its loading line, then
the whole window once it is, and with the season unreachable its failed line alone (until 22 October 2026: a board row's
click, Enter and Space opening the window, no row with a body, no redraw or score read opening one, the focus back on the
row on close). The position
table is laid out fixed, each team half the card, and a long name wraps on a phone rather than push
the home side off the screen; a player's Q is inside his name's own box, inline after the name, so a
wrapping name never leaves it beside the other team's player (the smoke holds those rules and that
structure on every questionable starter's game; jsdom lays nothing out, so a layout change there is
checked in a real browser at 390 and 360 over every game, such as NYG at WAS and CLE at NYJ).

**What the snapshot carries from the news job** (the owner's call, 14 October 2026, when the Season Tracker tab
went; the job and the notes are under "News: the job and the weekly game notes"). In the head's middle, under the
kickoff, `div.gs-prev`: a **Preview** line alone (its news note and sources went on 14 October 2026, the owner's
call), the game's entry in `news/data/notes/<season>-w<week>.json` (`data-gs-note="written"`, escaped, each `**...**` pair of
1 to 60 characters with no `*` inside then drawn bold as `b.gs-pn`, an unpaired `**` left as typed; once the game
has started its label reads "Preview, written <day>, before kickoff", so its words on form are not read as current
beside the records); until a
game is written, and only for a game still to come, an automatic line (`data-gs-note="auto"`): "The Seahawks
(3-2) visit the Broncos (4-1)" (play ... at the stadium on a neutral site) with the day and time, from the
window's own records and kickoff, with no news (the starters out it listed went with the News line); a played game
with no note shows no preview. In Offense vs defense, each side with the ball wears the Deep Dive's headline tag
centred under its title (`deepdive.headTag`, its points beside it, "−0.9 pts") and has the four position matchups under it
(`deepdive.possession`) where `units.json` is for the game's week (`deepdive.applies`), else one quiet line
saying why (on a playoff game, "The Deep Dive covers the regular season only; its matchups end with week 18.",
since the news job stops at week 18), with `deepdive.basis` (and when the
news job built the file) as the title of its "Position matchups" label, which says too that the quarterback's tag
is still his passing against the pass defense while his row shows the Overall Defense. The Stat breakdown
(`#gsStats`, the tracker's eleven stat bars from `stats.json`) is gone from the snapshot (the owner's call, 16 October
2026: "get rid of stat breakdown section"), and the build stops if it comes back (`gsStats` or "Stat breakdown"
outside a comment); its bars came back on 20 October 2026 as the Team Stats window of a game's page on the Props tab
(app v124, next), which alone reads `stats.json`, once a page load and only when it first opens, never the whole
snapshot and never as the page loads. The window fetches
`news/data/units.json` and the opened game's week's notes (`news/data/notes/<season>-w<week>.json`), named from the
site's root (`../news/...` until 17 October 2026), at runtime, `cache: 'no-store'`, each once a page
load, the units as the page loads and a week's notes once (the current week's, the first with a game still to play,
else the last, once the season is in: `weekNotes` on the glue's `pk-state`, where until 22 October 2026 it waited for
the board to draw its schedule; another week's the first time one of its games opens), and never bakes them in, so a news job publish is on the
next load with no rebuild; a file still being read says so in its own part ("Loading the Deep Dive…"), and one
that does not load, is not JSON or has the wrong shape is "did not load" for its own part alone, never a throw.
A file answering, or the prop model coming up, redraws the window with the visitor's place kept: the focused
control is found again by its `data-gs-` key and focused (Close if it is gone), and the first block at or below
the header stays where it was on the screen, so a props button, preview or Deep Dive drawn in above it does not
move what is being read. The nflbets smoke holds all of it on stand-in
news files of its own, served by its fetch stub, never the real ones (the elo job runs it every morning, and a
news publish must never turn it red): the written preview escaped, its news and sources not shown, the names it
marks bold and nothing else markup (a marked "<b>x</b>" shown as its text, an unpaired "**" as typed), the automatic
line in the head's middle with its records and no news, none on a played game with no note, a 404 and a
notes file that is not JSON each drawing the automatic line, the Deep Dive's rows
`possession()`'s own html set in whole, each its unit, the two clubs and their Elo (the quarterback's against the
Overall Defense, titled so; each Elo wearing the page's own `pkTierBadge` for it, named, just before it; the higher
marked `gs-better`; a rank only where the Elo files have none, with no shield, as on its planted copies without the
position tables, where the Overall Defense still stands against the quarterback, or with an unranked quarterback),
the defense's position and its tag alone, no name from the units file anywhere in the window, and the headline tag
`headTag()`'s, the not-this-week line, the playoff line on a made-up wild-card game, a Rams game read from
the files' LAR entries, a units file lacking a club or not JSON, each part's still-loading and did-not-load
wording, a started game's written-before-kickoff label, the basis's game counts
worked out from the file in the "Position matchups" label's title, the focus and place kept through late redraws
with the files and the prop model held back (the notes, then the units, then the payload let through), no Stat
breakdown and no Sources card with a stat file there to read, each file read once and no-store and `stats.json`
never as the page loads or by the whole snapshot (a game page's Team Stats window alone reads it, next), every new
control 44px, nothing thrown with every news file missing, and a page that bakes in none
of the news job's data and carries none of the old tab; the
real files are `news/tools/smoke.js`'s.

**A game's page: Matchup, Mismatches and Team Stats** (app v124, `props/build/patch_game_windows.py`, whose docstring
is the design, the owner's call of 20 October 2026: "so in props when i click a game, i want you to get rid of the
suggested parlays section from there. instead I want you to add three different buttons: Matchup, Mistmatches, and
Team Stats. Matchup will be the stuff from the Offense vs Defense section. Mismatches will be mismatches from that
game. Team Stats will be the old bar system stats we had that showed team stats side by side. I want each button to
pop up in its own little window."). A game's page on the Props tab draws no Suggested parlays card any more:
`gameSuggestCard`, its High, Medium and Low hands with their boxes and Add all, the Any, Player overs and Player unders
switch over them, `gameNoIdWhy`, which worded an empty hand, the two handlers `renderGame` bound for them and their
styles (`.gsugg`, and `.sugg-side` out of the rules it shared with `.stake-chips` in `part1.html` and in both looks of
`theme.css`) are gone, and the switch's saved choice, `S.ui.suggestSide`, is not read any more, so a visitor who left it
on overs is not filtered unseen (`SUGGEST_SIDES`, `suggestSide` and `sideAllows` went with it, out of `gameLegPool` and
`gameSuggestSig`). The hands' engine (`gameTiers`, `gameLegPool`, `GAME_TIERS`, `GAME_TIER_CACHE`, `gameSuggestSig`) is
kept, drawn nowhere, as the Parlay Builder's all-games levels (`getPbTiers`) are, since the audit and the smoke still
hold it, and `suggestLegOn` stays for the builder's and the sets' Adds: nothing on a game's page suggests a parlay. In
the card's place, under the game's head (`.ghead`) and over its Game bets card (`.gbets`), `gameWinBtns(g)` draws three
buttons in a row (`.gwin`, a group named "More on this game", three to a row at every width), Matchup, Mismatches and Team
Stats (`button.btn.quiet.gwin-btn`, `data-gp-pop` `units`, `mism` or `stats`, `data-gp-game`, `aria-haspopup="dialog"`,
44px by `.gwin .gwin-btn`'s own rule), only where the hub's window is on the page (`window.gameWindow`): the prop model's own
page, the audit's, has no such window and draws neither the buttons nor the card. For a few hours of 22 October 2026 there
were four: app v128 added Game snapshot (`snap`, the owner's call "Button on Props", when the Matchups tab went), four to
a row and two by two at 680px and under, where four would wrap "Game snapshot", and app v129 took it off again, the 680px
rule with it, three short words fitting a phone (the owner's call: "on second thought, i dont want that game snapshot
buttons. please remove it."; **The Game snapshot**, above). `renderGame` binds each to
`window.gameWindow(kind, g.id, button)`. The window is the Game snapshot's own, `#gsModal` in `snapshot.html`, in a
one-card mode: `window.gameWindow(kind, gid, from)` is `open(gid, from, {only})` for those three and nothing for any other
kind (in app v128 `snap` opened the whole snapshot, `open(gid, from, {page:true})`, which went with the page the same
way), and `draw` hands the window to
`drawOne` (`ONLY`), which draws that one card unfolded (`section.gs-one-card[data-gs-only]`) under a title naming the
game and the card ("SEA at DEN" over "Matchup · Week 7", "vs" at a neutral site), with no verdict, fold or game bar.
Matchup is the snapshot's own Offense vs defense body (`unitsBody`, which the snapshot's fold, `unitsSec`, wraps byte
for byte as before), with "Played. The ratings and the Deep Dive are the files as they stand now, after the game." over
it on a played game; Mismatches is the snapshot's own Mismatches body for the game (`mmParts`, which `mismatchSec`
wraps); Team Stats is the Season Tracker's bars brought back, the snapshot's Stat breakdown of 14 to 16 October 2026
(`teamStatsBody`, `SROWS`, `statSplit`, `statNum`): the season's eleven team stats from `news/data/stats.json` (point
differential, points per game and allowed, yards per play and allowed, turnover margin, sacks and sacks allowed, third
down and red zone TD rates, explosive plays), each team's number at its side and the pair split on a bar in the two
clubs' colours as the tracker split it (where lower is better each side by the inverse of its number, else both shifted
up by the lower of the two and 0 so a negative still splits, nothing drawn where either is missing or both are 0, in
tenths of a percent), the better number of each pair marked `gs-better` (neither on a tie), how many rows each team is
better on over them, and under them what they stand on (the season, through when, each club's game count, as of when).
A club the file lacks shows dashes and is named, a file of another season says whose it is, one still being read says
"Loading the team stats…", and one that does not load, is not JSON or is not the stat file says it did not load, never
a throw; the Rams are read from the file's LAR (`deepdive.club`). The file is read once a page load, `cache:
'no-store'`, and only the first time a Team Stats window opens (`statFile`), never as the page loads and never by the
whole snapshot. A game `state.json` does not have yet is read from the prop model's own row (`gameFor`, `propsGame`), so
a window opens before that file is in. The window is narrower than the snapshot (`gs-one`, 720px at most), and on a
phone a little window with 10px of the page round it, not the full screen the snapshot takes; Team Stats' bars sit on
the dark look's track with their fill lifted toward white, as the lean bars are, and in the light look in each club's
own colour (`theme.css`). Escape, caught before anything beneath it, closes the window alone: the game's page stays
open under it with the page's scroll lock kept, no listener beneath hears the key, and a second Escape is the page's and
closes it. Tab stays inside; a click outside closes it and one inside does not, nor a double click's second click within
0.4 seconds of its opening (`ONE_AT`). The focus goes back to its button, or to the same button drawn since where the
page redrew under it, else the page's Back, else the game's row on the Props tab, else the chosen tab's button, never
the page's body (`oneFocus`). It goes with the game's page (`closeGameModal` is wrapped), with a change of address (a
`hashchange`), and quietly on a key pressed once the game's page is off the screen, the key then the page's; a quiet
close moves the focus only where it was lost. The whole snapshot opened after it (by the matchup bubble; by a board row
until 22 October 2026, and in app v128 by the page's Game snapshot button too) is the whole snapshot as before. `build.js` stops if the snapshot draws the Stat breakdown again (`gsStats` or "Stat breakdown" outside a
comment), if `window.gameWindow=`, the file's address, the lazy read, `drawOne` or the `closeGameModal` wrap goes
missing, if `statFile()` is called anywhere but the Team Stats window's first opening, if the props parts draw the
buttons without asking for the hub's window, if a game's page opens the whole snapshot again (`b('snap'`, `FROMPAGE` or
`kind==='snap'` in the props parts or `snapshot.html`, since app v129; app v128 stopped if the fourth button went), and if
`gameSuggestCard(`, `data-gsugg-side` or `data-gtier-add` comes back. The audit's O holds the page, blocking: no card, side switch or Add all; on the prop model's own page no buttons;
with a stand-in `window.gameWindow` planted, the three in order (four in app v128), once, under the head and over the
Game bets card, 44px by their rule, three to a row with no narrower layout (app v128's two by two at 680px and under went
with its fourth button), no Game snapshot button (`data-gp-pop="snap"`, or a button so worded) anywhere on the page, each
press handing the window its card, the game and itself, and the buttons gone once it is taken away; then the hands' engine as it stands. M7 and M8 hold the engine's hands (the fair chance, no far-off leg, the ids),
their checks of the card's fair chance and est. marks gone with it, and I3 holds that a `ui.suggestSide` saved before
is not read into the view. The nflbets smoke holds the buttons in its main run (the card gone, the three in order as
dialog buttons naming the game and no fourth, once under the head and over the Game bets card, the window on the page;
no Game snapshot button on a game's page, `window.gameWindow('snap')` opening nothing, and the whole snapshot
`window.gameSnapshot` opens over the page keeping its props button wherever `canProps` says) and their 44px, and, on its stand-in news files under THE GAME SNAPSHOT, each window: Matchup's and Mismatches' bodies the
snapshot's own `#gsUnitsB` and `#gsMismB` to the byte, their titles, one card alone, the focus on Close and Tab kept
inside, Escape closing the window alone with the focus back on its button and no listener beneath, a second Escape
closing the game's page, a redraw under it handing the focus to the button drawn since, a click inside, a double
click's second and a click outside; Team Stats opening on its loading line, then every row's numbers, mark, split and
colours and the counts worked out on the smoke's own copy (`SR_OWN`, `splitOwn`), its basis, the focus kept through the
file's arrival, `stats.json` not read before the press and then read once, no-store; another tab's address and the game's
page closing taking it with them, the focus never left on the body; the whole snapshot after it; a played game's
Matchup with its Played line over the snapshot's body and its Team Stats with the home side missing from the file; and
Team Stats on a 404, a file of the wrong shape, one of another season and a Rams game read from LAR.

`nflbets/build/storage.js` (the browser's own storage), `nflbets/build/xbets.js` (the X Bet Log's
adapter), `nflbets/build/friends.js` (friends' picks, `window.FRIENDS`), `nflbets/build/card.html` (the parlay card),
`nflbets/build/glance.js` (the matchup bubble, the page's last script) and `nflbets/build/theme.js` (the light or dark look, in the page's head, and `theme.css` with it: under "The hub
look") are inlined by the build, so a change to any
is a rebuild too. `smoke_live.js` section J holds the card to all of the above: Finish, every leg and
the price in the window, the image (a recorder canvas, since jsdom draws nothing), the share sheet,
Open in DraftKings on made-up ids (every leg; a leg DraftKings has only at another number going on at
DraftKings' number, the note and Share link naming it: a spread, a total, the runner's main line, a rung as
his closest Over and 2+ touchdowns as the anytime touchdown, a `dkline` leg looked up like any other, a
press's newer number taken over the pull's and an older one not; a rung and 2+ touchdowns with nothing to
convert to left off with why (no line of his on the stat, no anytime touchdown of his, each dated; on a game
not pulled yet, that once it is they go on at DraftKings' line), the button "Open 2 of 4 legs in DraftKings"; the builder's line under each
leg that will not go on as built, under no other, and none on the prop model's own page; none over two games with
DraftKings' NFL page and none in a payload baked before `dk`, the owner's case of a game with its lines
read and no player prices (an est. rung and an est. touchdown) and its game page, carries, kicking points
and interceptions there said to be unread (and a carries id the payload has opened), a money line beside an
unpulled player leg, a player leg DraftKings did not offer when read, a book-priced leg never said to be
unpulled or not offered, a money line on DraftKings' game lines with no ids, every kind of leg with an
Under main line among them, a game kicked off; the runner's main line an Over in one browser and an
Under in the other; the note and the button dated by the older read and saying what the link opens as
DraftKings had it then at five hours, at 31 hours and undated, never that every leg lands), Share link
(a title and a text and no url field, `canShare` asked about the same; the exact betslip link, every id in
the card's order, alone on its line in the text under what it opens: all, 1 of 2, 2 of 4 with the legs to
add by hand by number, none with the game's page or the NFL page; the read and its caution; every leg in
its text and each to add by hand with why, an estimated rung's price and the parlay's marked as on the card,
nothing promising every leg, a cancel doing nothing, and the same text copied by the clipboard and by the
hidden box when the share sheet is missing, cannot share it or fails), Escape, the Tab order (Close, Open in DraftKings,
Share link, Download, Start over, each leg's link) and Start over, and nothing written by finishing, on
a visitor's browser and on the admin's (one the retired owner layer marked too); and (J2) the card's check of DraftKings' lines as it opens,
on an ESPN of its own that can hold or fail an answer: a scoreboard failing (500) leaving every leg on the pull's ids
with the "Could not check" line (in the note and the status line); a read held, the two buttons waiting (their words,
no address, aria-disabled and aria-busy, a press of either opening and sending nothing) while Download works and the Tab
order is Close, the two, Download and Start over alone, past the 10-second cap working on the plan as it stood
with that line, and let go after it, updating the same card: the total DraftKings moved going on at its new number on
the read's id and named, a player's main line and a rung DraftKings moved left off with the moved rule's words (the
button "Open 5 of 7 legs", Share link's few words, the builder's rows, the rung, moved off its own number, naming its
own bet), an unmoved line, a line the read has none for (his receptions), an anytime touchdown and 2+ touchdowns on
their ids, the "Checked against" line and the status line's outcome, the focus kept on the waiting button and on a leg's
own link, the page under the card drawn once for its two games and kept from scrolling, and exactly the parlay's games
read (its week's scoreboard once a game and each game's player lines, never a third game's, the week's own pinned to the
far future or one made up, so it bites at any hour); while it reads, the note its waiting line alone with no leg's link
and Share link saying it is checking first; on legs of its own, a rung the moved main line is the same bet for added by
hand there and one it is not naming its own bet, and an id the pull read after the read standing; opened again within
two minutes, nothing read; a card closed before its read ends never drawn from it, the focus on Finish through the
read's redraw; a second card opened meanwhile on its own plan; an older card's read, let go after a newer card opened
done at once, never painting it; a card opened during a press of its game waiting for it, reading nothing itself, the
page under it kept from scrolling; a payload baked before ids still reading, the total on the read's id; Start over at
once, its focus found again on the Parlay Builder's choices after the read's redraw (one of the page's week's games moved
to the far future where it has none to come); and nothing of the visitor's own written, the kept read a press's. Section
J also holds a level the tab no longer draws when its card closes, the focus going to its set's Add to builder, its
heading or the chosen tab's button, and Start over's focus never on the page's body. Since 20 October 2026 its runs boot
the admin's browser by default (the record seeded before the page parses, checked, so `admin.js` asks nothing on load),
and section N is split, a visitor with the retired layers' flags (nothing drawn, the flags gone, its own data kept) and
the admin with them (exactly the file's parlays, the flags gone, the admin's record kept); section V is a visitor's page
(X Parlays and the X Bet Log off the bar, `#xparlays` landing on the Props tab as `#slate`, its button chosen, the board
until 22 October 2026, neither file nor X Parlays' scores read, no
Admin mark, no Pull on the card and no request to The Odds API); and J3 holds Pull from DraftKings, blocking, on a stubbed
Odds API of its own: the button's "up to N" worked out on the check's own (distinct game and market pairs, a kicked-off
game out), a press making one free events call with the key and the inline question with the header's credits, Cancel
spending nothing, the pull one event-odds GET a game with the expected markets, `bookmakers=draftkings`, `includeSids`,
`includeLinks` and american odds and none for a team-only game, the card's and the builder's prices the stub's at the
builder's own sums, Open in DraftKings the fresh sids in the card's order with the team leg on the ESPN id, every leg case
(a moved main line converted at DraftKings' price, a rung through the ladder's Over k-0.5 and one whose k-0.5 is the main
line through the base market, the anytime Yes, 2+ swapped, a player missing, a market not returned, a nickname tier, an
ambiguous name not placed), Share link's fresh link, the spend and the balance the headers', nothing in `S` or any storage
key, the key nowhere in the DOM, its attributes, Share link's text or the image; a re-open within 5 minutes making no paid
call; each error (a refused key, no credits, a 429, a network failure before and after a paid call with no paid retry,
empty bookmakers, a game kicked off between the look-up and its odds, a 422 asked again a market at a time) keeping the
prices as they were and saying why; Pull disabled while the ESPN check is busy, Open and Share waiting during the pull, a
Suggested Parlays level pulled and priced again, the focus kept, a sign-out midway hiding the button and keeping no late
answer; an ESPN read more than 15 minutes after the pull moving the pulled main line, the moved rule's words; a rung asked
of the base market on ESPN's main line (224.5) where DraftKings' main is 230.5 and 225+ is on its ladder (R5: one credit, no
slip, "pull again for his ladder", never "lists no 225+"; the next plan the ladder, before and after a newer ESPN read still
at 224.5, and nothing more for 231+, which the base answer holds; the re-pull one credit, the ladder alone, 225+ on the slip by
its own sid at its own price; R5b, the base answer with his Over 230.5 alone, the same and the next plan the ladder); the
pulled rows deciding a rung's market only while they stand by the moved rule (R6, the page's clock held back 30 minutes for
the pull; since the second review of 21 October 2026 the base market again for 225+ and 231+ alike once a read takes those
rows for moved); a rung the moved rule took off the slip back on it (R6b: 231+ on the base pull's own sid, dead by a read
at 227.5 20 minutes after it, then the base market pulled again, the leg waiting on his ladder, and the ladder, on the
slip at its own sid and price, two credits; 225+ on his ladder's sid, dead by the same rule, back on that ladder row by one
base pull; each press's "up to 1 credit" what it spent, its one call the plan's market); and a card closed and opened again
while the free look-up was out drawn ready once it answers (R7). Since app v127 (**No ladder bets**, under Props) the
rungs and 2+ touchdowns J2 and J3 seed stand for a set locked before that day, the paths for them dormant on a live page:
each such boot first holds that the page took its seeded ladders out with the builder's one line, word for word, and the
rest kept (`ladderBoot`, its own `ladderOwn` and `NOLADDER_SAY`; J2's tight end's 4+ receptions and 2+ touchdowns, R1's
30+ and 60+ receiving yards and 2+ touchdowns, R5 to R6b's rung, R7 nothing and no line), then puts every leg back and
the line gone with the change, so the cases above run as before; and R8 a 225+ rung carrying `kept` beside a main line,
kept with no line. A request
to The Odds API on a visitor's run, or on an admin's run with no stand-in, fails it. `smoke.js` holds a real tier's link to
made-up ids under keys it works out on its own, with the other side of each line and the other team
under decoys (the tier's lines are made up, so the payload's own ids could never match them), the button
"Open in DraftKings" where every leg goes on and "Open N of M legs" where one does not, then a leg moved
off its id going on at DraftKings' number with the builder and the card saying so, and,
where the payload has ids for a game still to come, a builder parlay of its money line and a player's
Under to the payload's own ids, with another game's away spread at the page's line going on at its own id
or DraftKings' closest number, said under its row and on the card (skipped, and said, on a payload baked
before `dk`), each card's read of DraftKings' lines exactly its own games' (their week's scoreboard once a game, and
nothing else at ESPN: `cardReads`). The smokes record every request a page makes: one to the retired
Firebase store or its sign-in services, or anything but a read, fails them; one to `api.the-odds-api.com` fails
`smoke.js` always, `smoke_live.js` but on an admin's run with its stand-in, and `smoke_admin.js` but where its stubs
answer the link's check or `HUB_ADMIN`; and `smoke.js` fails too any request
the page or one of its frames makes that leaves the site (`demon-x13.github.io/nfl-hub/`) or names a parent folder,
and a file the page reads as it loads that is not read at the site's root (the page is the root since 17 October
2026; `build.js` refuses a page that names a parent folder anywhere, the betting app's own fallback for its Elo model
alone excepted, and drops the link to `../betting/`, a page gone since the app moved in, that ended the builder's card
of the betting model's own Bet Build parlays, `part3.js` untouched).
`smoke.js` runs the build in memory (`require('./build.js')` writes nothing) and fails unless
the root's `index.html` matches it byte for byte (and that `preview.html` is gone), so a source committed without the
rebuild fails the gate, and the elo job, which runs this smoke every morning after its commit, goes red on it. It
also runs the betting job's `reference_models.json` gate on the copy of the betting app inside the
page (`BET_APP`). The prop model's storage key is read from part2's `SEASON`/`KEY` line at build
time and written into the storage layer, and the betting app's season (`betting/tools/build.js`
exports `BET_KEY` and `SEASON`) into the X Bet Log; the build stops if part2's `BET_KEY` is not the
app's. The page's glue takes its season from `state.json` (as the Matchups board did until it went on 22 October 2026,
asking ESPN for the week in its own numbering) and the X Parlays section from each game id, asking ESPN for the
week in its own numbering (weeks 19-22 are the playoffs, seasontype 3), so nothing in
`nflbets/build/` or `liveparlays/` names a season; the Props tab's scoreboard read is the prop model's, on its own
`SEASON` and regular-season weeks (seasontype 2).

**The hub look** (the owner's call of 16 October 2026: "make it match the color scheme and overall feel
of the nba and nhl hub so it's consistent across the board", and the title NFL Hub "to match the others").
The page is headed NFL Hub as the NBA Hub and the NHL Hub are: the wordmark (`NFL <em>Hub</em>`, a
football beside it where the NBA has its ball and the NHL its puck) and a tagline on the left ("Every game called by
three models against Vegas, player props priced against DraftKings’ lines and a parlay builder, frozen at kickoff and graded
in public.", since 20 October 2026), and in `.hub-stamp` on the right the light/dark switch, the admin's place
(`#hubAdmin`, empty but on the admin's page: **The admin link**), when the data was built and the build tag, then pill tabs. Its colours and type are
`nflbets/build/theme.css`, which the build lays over every other style, last (`<style id="hubTheme">`,
with the hubs' fonts, Unbounded and Manrope, in place of the prop model's), and hands to the framed
betting tabs (`window.THEME_FRAME_HEAD`, set in by `frames()` in `nflbets/build/hub.html`): the NBA Hub's
lightened graphite exactly, as the NHL took it, with the NFL's gold (#FFD166, the NBA's own `--gold`) as
its accent where the NBA has orange and the NHL ice blue, yard lines behind the header where they have
court and rink lines, quiet text at the NHL's #B3B9CB and red text at its #FFA2B8 (the NBA's own fail
4.5:1 on a panel), the win-probability bars on the Props list (the board's until it went on 22 October 2026) and in the
Game snapshot in the two clubs' own colours as the other hubs draw theirs (`probCols` in `hub.html`, the Props list's
rows by their copy of the rule, `slateCols`, the owner's call of 16 October 2026,
the lime favourite having read as neon: each side its chip's colour with its percentage at 4.5:1, the home
side on another of its colours where the two would read as one; the nflbets smoke holds every pair of the 32
clubs to that). The parts keep their light
tokens underneath; a new hard-coded light colour in a part needs a rule in `theme.css`. Every text
holds 4.5:1 (3:1 large) on every tab, a game's page, the Game snapshot, the builder and the parlay
card, at 1280 and 390, checked in a real browser (jsdom computes no cascade). The parlay card and its
image carry the same palette written out in `card.html`, since the image must not depend on the page.
`picks/` and the redirect pages wear it too (the root's `index.html` is the page itself since 17 October 2026; the
landing page it was until then wore it as well). `nflbets/preview.html` and `preview_theme.css`, the look on trial, are gone; the smoke fails
if `preview.html` comes back.

**The light look** (the owner's call of 17 October 2026: "keep this whole layout as dark mode, and then make a light
mode version that people can tab on and off on the top right"). Dark stays the look and every visitor's default,
whatever the system's colour scheme says (nothing follows `prefers-color-scheme`; the build refuses a `theme.css`
that does). The switch is a round 44px button at the header's top right (`[data-theme-toggle]`, `.hub-theme`, first in
`.hub-stamp`, before the tabs), named "Light mode" (`aria-label`) with `aria-pressed` true while the light look is on
and a title saying what a press does ("Switch to light mode", "Switch to dark mode"), its glyph the look a press
gives (a sun while dark, a moon while light, both hidden from a screen reader); it is laid over the header's corner
out of the flow, so on the dark look nothing else on the page moves (every tab and window at 1280 and 390 was pixel
for pixel the same before and after outside the switch and the build hash), and under 340px the wordmark keeps clear
of it. A press puts `html[data-theme="light"]` on the page (and `dark` back), and keeps the choice in that browser
alone under its own key, `nflhub_theme_v1` (`light` or `dark`), never in the prop model's `S` and never sent anywhere.
`nflbets/build/theme.js` does all of it, set in the page's head before its styles and its body, so a light visitor's
first paint is light, never a dark flash: it reads the key there, and storage that throws, cannot be reached or holds
anything but `light` reads as dark and throws nothing; one listener on the document answers the switch the moment it
is drawn; and another open tab of the site follows a switch by the `storage` event, page and frames, writing nothing.
The build refuses a `theme.js` that keeps anything in storage but that key, or sends anything. The light palette is
`theme.css`'s own block, `html[data-theme="light"]`, `color-scheme: light`: the surfaces a cool light grey and white,
the hub's graphite as ink, the NFL's #FFD166 kept for every gold fill and `--gold-ink` (#7A5205) for gold read as text,
and the pick, the miss and the ice taken down to dark steps of themselves for text; every rule of the dark look that
writes a colour of its own has its light twin there (the selected pills' text, X Parlays' Clear in "Clear this parlay?"
white on the rose, the Pick'em Record's and the bankroll's chart colours back to the app's own, the Game snapshot's red,
lean bar and Deep Dive tags back to its light tints, a game page's Team Stats bars in each club's own colour (app
v124), the Even tag's ring, the Elo grade colours, the ELO windows' rows
that weigh nothing quieted by the muted ink rather than faded), and a new one needs both, checked in a real browser.
`THEME_FRAME_HEAD` carries both palettes, and `frames()` in `hub.html` writes the page's look into a frame's
own `<html>` tag when it makes the frame and again when it loads, so a frame opened later is in the look; a press
switches every frame already open. The parlay card itself and its downloaded image keep the dark palette `card.html`
writes out (the window around it follows the look). A Chromium sweep of every visible text, its colour composed over
what is under it, on every tab, a game's page, the builder with legs, X Parlays drawn, a player's and a team's ELO
window, the Game snapshot with every card open and the parlay card's window, at 1280 and 390 (8,711 texts each look):
light, none under 4.5:1 (3:1 large); dark, the same 29 a width as before it, the ELO player and team windows' faded
rows that weigh nothing at about 4.3:1, which predate it and were left, since the dark look must not move. The nflbets
smoke's LIGHT MODE section (`lightChecks`, blocking) holds the build (the head's script before the styles and the body,
the light palette beside the dark one in the page and in `THEME_FRAME_HEAD`, every colour token of `:root` given a
light value, nothing following the system's scheme, the key named by that script alone), the light palette's own
pairs at 4.5:1 (3:1 for the Even tag's ring), the switch (in the header before the tabs, a 44px button named Light
mode, its glyphs hidden, `aria-pressed`), dark with nothing stored, a press to light and back on the page, a frame open
before it and one opened after, each press writing the key and nothing else and nothing in `S`, another tab's switch
followed with nothing written (and another key moving nothing), a reload with light kept putting the look on the page
before its body is parsed and on a frame opened after, storage that throws read as dark with a press still switching
and nothing thrown, and the head's script on a page of its own reading every kept value but `light` (`Light`, `LIGHT`, a space
either side, `dark`, junk) as dark and a window whose storage cannot be reached as dark, switching all the same.

A parlay X placed at the book goes in `liveparlays/parlays.json`, and a week of the X Bet Log in
`liveparlays/xbets.json`, by Claude from what the owner sends, as each file's `how` field
describes: the site owner's devices show it on their next load (the admin link; the files are public by address all the same).

## Friends' picks on the Pick'em Record

The owner tracks some friends' picks over the season (his call, 15 October 2026: "can you add these picks
to the pick'em record? going to track some friends picks over the course of the season"). A friend picks a
week on `picks/` and sends the owner its Save file (kind `nfl-hub-weekly-picks`, version 1: name, season,
week, saved_at, tiebreaker, picks of `{game_id, pick, kickoff, ...}`); the owner sends it to Claude, and
Claude adds it:

```
node picks/tools/add.js <sent file>...   # merge each into picks/friends.json, then rebuild nothing: the page reads it
node picks/tools/add.js --check          # the file against its rules and betting/state.json's schedule
node picks/tools/add.js --rename <old> <new>   # show a friend under another name; the old one goes in `aka`, so a later file under it lands on them
node picks/tools/add.js --remove <name>...     # take friends off, by name or aka, their weeks with them; a name no friend has refuses it all
node picks/tools/test_add.js             # the tool's test, and the real file held to its rules
```

then the branch, commit, PR and merge, as with any file the owner sends. On 24 October 2026 the owner took all four
friends off ("get rid of the real life players for the pick em record, K, X, D, Gonz"): `--remove K X D Gonz` left the
list empty, so the Pick'em Record draws no Friends line, row or column until a file is sent again (a file under a
removed name adds that friend again, from that file alone). `picks/friends.json` is
`{how, season, updated, friends:[{name, weeks:{w6:{saved_at, tiebreaker, picks:{<game_id>:{pick, saved_at}}}}}]}`,
its `how` saying the same; written only by the tool (never by hand, never by a job), indented one space, a
pick a line. The tool refuses a file whole for a kind, version or season that is not the file's
(`betting/state.json`'s season), a week outside 1-22, a name that is not plain text of 1-40 characters, a
saved_at that is not a time, or a game id not of that week on the schedule, picked twice or for neither
team; a pick saved at or after its game's kickoff (the schedule's kickoff, US Eastern, as `picks/` reads
it, never the file's own) is left out and named, and a file with no pick left is refused. A friend is one
name, without regard to case or spaces; a week sent again replaces that friend's week, except a game that
had kicked off when the new file was saved, which keeps the pick the earlier file made before kickoff.
Each pick keeps the saved_at of the file it came from.

The page reads it like the X Bet Log: `nflbets/build/friends.js` (`window.FRIENDS`, inlined after
`xbets.js`) fetches `picks/friends.json` (from the site's root) no-store on every load, cleans it (a junk name or entry is
dropped; a file missing, not JSON, of another season or with no list draws no friend and throws nothing)
and hands it to the betting frames as `parent.FRIENDS`; nothing is baked in, and a file that answers late
redraws the record. `record_viz.js`'s `rvFriends()` grades them in the frame on its own state: a pick counts
only if saved before its game's kickoff, is graded on the finals the models are graded on (a game in
`processed` with a result; a tie counts for nobody) and is pending until then; a friend's week counts only
the games they picked. They are drawn apart from the models: on the chart a dashed line with hollow dots
each, in a muted palette (`RV_FRIEND_COLORS`), from zero at the week before their first, against Vegas on
the games they picked (a friend with no game decided has no line), with a second legend row headed Friends
(each record against Vegas and what is pending); in the week-by-week grid their own rows under a Friends
heading after Vegas, a week with picks still to play a column of its own ("to play"), a cell with games
decided shaded as a model's and "· 3 pending" beside it, one with none decided "14 pending", the
tiebreaker in the cell's title; and in the pick grid a column each after Vegas (the pick-grid patch in
`betting/tools/build.js`). The nflbets smoke holds it all on stand-ins (FRIENDS' PICKS at its end: the
read, the rows and cells, the lines and legend, the tooltip, the pick grid, a pick saved at kickoff not
counted, a junk name, and a missing, non-JSON, other-season and listless file each drawing nothing); the
betting smoke holds the real file to the tool's rules as a warning (a friend's pick is no model's call or
price, and a game moved earlier than a pick was saved must never hold back the state; the record leaves
such a pick uncounted). A friend's picks are what they chose to send X, kept by name in the repo; nothing
on any page writes them.

## Research: the homework toward the next model

`research/` (README.md first) is the owner's study series toward a new game model, one folder a
question, each with its scripts, its README and its committed `results/`. **No model is built
there, or anywhere, until the owner gives the all clear**; a study may fit a small regression only
to ask whether something carries signal. 2003-2025 are explored (1999-2002 read only to warm up a
history); 2026 on is held out and never read (`research/common.py`'s `HOLDOUT_FROM`, whose loaders
refuse it), so the model can be tested on seasons it has never seen. `research/exam/` is the one
place a held-out season is read (`common.open_exam()`, from `fetch.py --exam`'s own downloads), only
to apply an equation already frozen; nothing is fitted, re-scaled or chosen there. Study 3 (`equation15/`) is the
equation the owner asked for on 13 October 2026, fitted on 2004-2023 and tested once on 2024-2025; it
is research, not wired into any site. Study 5 (`fivethirtyeight/`), which the owner asked for on 13 October
2026, rebuilds FiveThirtyEight's quarterback-adjusted Elo from its published rules; 538's files (CC BY 4.0,
Data: FiveThirtyEight) are downloaded, never committed; it is research, not wired into any site. Answer the
question the owner asks: the
betting line is not the yardstick for a study unless he asks about it (his direction, 13 October 2026).

```
python3 -I research/fetch.py                     # nflverse games.csv + play-by-play 1999-2025 into research/data/ (gitignored)
python3 -I research/win_indicators/build.py      # study 1's team-game table
python3 -I research/win_indicators/rank.py       # its rankings -> research/win_indicators/results/
python3 -I research/win_indicators/report.py     # its README's tables, from results/
python3 -I research/elo_vs_site/compare.py       # study 2: the study's Elo against the site's ratings, same games
python3 -I research/elo_vs_site/side_by_side.py  # study 2's follow-up: Team Rankings against FiveThirtyEight, 2003-2025 season by season
python3 -I research/equation15/equation.py       # study 3: the 15-indicator equation the owner asked for, fitted on 2004-2023, tested on 2024-2025
python3 -I research/fetch.py --exam && python3 -I research/exam/blind_2026.py   # the frozen study 3 equation's blind test on 2026
python3 -I research/models_compare/elo_features.py   # study 4, once: the ELO Model's inputs, elo/build.py in a sandbox (2026 not read, the site untouched)
python3 -I research/models_compare/backtest.py       # study 4: the five game models the site ran until 13 October 2026, walk forward on 2021-2025, side by side
python3 -I research/fetch.py --fivethirtyeight   # study 5's files: FiveThirtyEight's nfl_elo.csv and nfl-elo-game file (each refused unless its SHA-256 matches), nflverse weekly player stats 1999-2025, draft picks
python3 -I research/fivethirtyeight/qbelo.py     # study 5: FiveThirtyEight's QB Elo rebuilt from its rules, checked against 538's own file, run on through 2025 (and PREGAME, the same with each team's previous starter)
python3 -I research/fivethirtyeight/compare.py   # study 5: the QB Elo beside Alpha, the Joker and the ELO Model on study 4's 2021-2025 games, and over 2003-2025
```

## The sites behave like websites

The owner publishes a change and expects it on every device on the next load. Nothing
may quietly outrank what the job published:

- **Published data wins over anything a browser kept.** Local storage holds only what the
  visitor made -- their own builder, saved slips, picks, bankroll, settings (their light or dark look among them,
  `nflhub_theme_v1`), the parlays they
  cleared from X Parlays on that device, the Refresh odds reads they pressed for -- and nothing of X's, but on the site
  owner's own devices the admin link's record of his Odds API key (`nflhub_admin_v1`, `admin.js`'s alone, since 20 October
  2026), which only says whose browser it is. That cleared list only hides; it
  never changes or outranks the file, and it is pruned to the file on every load. The one thing the
  page keeps of its own making is a Suggested Parlays set it built at a game's lock where the record had none
  (`props_sp_lock_v1`, to kickoff; since app v118 its Elo picks too, and the Sunday slot's to its last kickoff), and the
  record's locked set takes its place as soon as a load reads one.
  Schedule, scores, stats, prices (since app v125 the props job's own read of DraftKings' lines on ESPN, in the payload),
  ratings and projections are read from
  `props/data/payload.json` and `betting/state.json` on every load, and X's parlays and the X
  Bet Log from `liveparlays/` (on the admin's devices), and friends' picks from `picks/friends.json`. The prop model keys its
  saved season on `PAY.baked_at`, which moves on every run of the job, so a run always
  rebuilds; the betting app already merges only the visitor's keys over the published state.
- **A Refresh odds press is the visitor's, kept in their browser until a publish outranks it.** The lines a
  press reads from ESPN (DraftKings' game lines and player lines, under Props, "Refresh odds") live in the
  page's memory outside the saved state `S`, and in that browser's own storage under `props_press_v1`
  alone (app v108, the owner's call of 15 October 2026), never sent anywhere. A load puts a game's read
  back only before its kickoff and only where no publish is newer than the read (the prices it was read
  over, or a publish whose own time for them is older than the read; since app v125 every publish carries the props
  job's own read of ESPN, whose time is the publish's for the lines it read): a newer publish wins and the read
  gives way, the builder's legs with it. No line is read
  from ESPN in a browser on load or on a timer (ESPN's scoreboard alone is, once on load, and only where a game of the
  Props tab's week is under way with no score: `scoresOnLoad`, since 22 October 2026; the Matchups board read it on every
  load until then); a parlay card opening reads its own games as a press would (19 October
  2026), and the props job reads ESPN on every run and publishes it (a file, like every other publish).
- **What the admin's Pull from DraftKings reads is his, for that page load.** DraftKings' prices and slip ids the parlay
  card pulls on the site owner's device (20 October 2026) live in that card's memory alone, never in `S`, any storage key or
  the payload, gone with a reload or a sign-out; they price his builder and card and put his legs on the slip, and change
  nothing anyone else sees, his own suggestions included.
- **A routine rebuild is silent.** The job publishes several times a week. Only a model or
  roster change is worth a banner.
- **Every page says which build it is.** `buildTag` on the Bets and Stats header: `APP_BUILD`
  (the prop model's parts) and the page's own hash (`PAGE_HASH`, the first seven hex of its
  SHA-256), so any source change -- the page's glue, the Game snapshot, the X Parlays section, the parlay card, the storage layer,
  the X Bet Log, the betting app, the look and its switch, the admin link -- shows as a new tag. Without it a stale copy cannot be told from a current one.
- **A frame's content is in the page.** The betting tabs are srcdoc frames filled from a
  string inside the page, the root's `index.html`, so nothing is fetched or cached for them apart from
  the page itself: a refresh of the page is a refresh of the frames. No frame is filled by address
  any more (the Season Tracker tab, which framed `news/index.html`, went on 14 October 2026); the
  Game snapshot fetches the news job's files itself, `news/data/units.json` and
  the week's notes, named from the site's root, `cache: 'no-store'`, at runtime as the page loads (the current week's notes
  once the season is in and another week's when a window first wants them, and `news/data/stats.json` only when a game page's Team Stats window first opens), and the page bakes
  none of them in, so a news job publish is on the next load.
- **Data fetches are `cache: 'no-store'`.** The HTML is served by GitHub Pages with its own
  ten-minute cache, which a reload clears; nothing else may hold data longer than that.
- **X's parlays and the X Bet Log are files, read only, shown on the site owner's devices alone.**
  Since 20 October 2026 (the owner's call, "Hide only, build it") X Parlays and the X Bet Log are tabs only where the
  admin link has been opened (**The admin link**, under "Bets and Stats: the loop"); a visitor's page has neither tab
  and reads neither file, and the files stay public by address, so "hide only" hides the tabs and protects nothing in the
  files (anyone could write the admin's record by hand and see the tabs): what it protects is his Odds API key. There is no sign-in, no
  token and no shared store: nothing on the page writes anywhere but the visitor's own browser storage, and the one thing
  that leaves a browser is the admin's key, from his own, to The Odds API alone. The X on a card in X Parlays clears it
  from that browser only (`lp_cleared_here_v1`, under "Bets and Stats: the loop"); on every device, a parlay leaves the page
  when the file marks it cleared. The two files are the source, beside each other in `liveparlays/`:
  - `liveparlays/parlays.json` is X Parlays: the parlays X placed at the book. Claude adds one from
    the slip the owner sends in chat (the game, each leg's player, team, stat, line and side, the
    stake, the price and the payout; the file's `how` says how each is written), corrects a line
    the book moved by writing the line X took, and marks a parlay the owner no longer wants on the
    page `"cleared": true`, which keeps it in the file as history and off the page. A finished
    parlay clears itself (the owner's call, October 2026): the betting job's
    `liveparlays/tools/autoclear.py` marks it `"cleared": true` (with `cleared_on` and
    `cleared_by: "auto"`) once every game has a final in games.csv and two Eastern days have begun
    since its last game, so it shows in full on its game day and the next; `test_autoclear.py` is its
    test. The file is written with `json.dumps(indent=1, ensure_ascii=False)`, its own style, so a
    clear is a small diff; write it the same way by hand.
  - `liveparlays/xbets.json` is the X Bet Log: `season`, `deposit` and `weeks` (`w1` to `w22`, each
    `staked`, `returned` and an optional plain-text `note`, kept in the file and shown nowhere since 22 October 2026,
    when the table's Note column went), plus `updated`. Claude adds or changes
    a week from what the owner sends (the week, what was staked, what came back).
  The admin's browser reads both on every load (`cache: 'no-store'`), and a visitor's neither. `liveparlays/build/page.html`
  draws X Parlays from the first; `nflbets/build/xbets.js` reads the second and hands it to the
  betting frames as `parent.XBETS`, and `betting/tools/build.js`'s hook lays it into the app's
  `S.bets` and `S.bank.deposit`, read only (no entry form, Remove, deposit box or backup card),
  leaving the browser's own Bet Log in the app's key untouched (on a visitor's page `XBETS.enabled()` is false and the
  frame keeps the browser's own log, which no tab of the hub shows). `nflbets/build/storage.js` is the
  browser's own storage for the prop model (`window.storage` over localStorage), and on load it
  takes out what the retired layers left: their flags and their copies of the old shared documents,
  never anything that holds a visitor's own data, and the old section key or a week that never
  reached the store only where all it holds is in the files.
  Until 10 October 2026 both lived in a Firebase Realtime Database written from the owner's
  devices; its last state was carried into the two files, and the database is retired (the owner
  may delete it, or lock its rules to `false`).

## Conventions

- **Checks block or warn.** Every NFL job's gate splits its checks in two. Blocking is anything that
  could put a wrong number or wrong money on the page: a price, line or leg on the wrong player or
  game, a chance, price or parlay sum that is wrong, settlement and grading, the data against its
  sources, the page not loading, a runtime error; it refuses the publish and the last good data stays
  live. A warning is presentation on the week's own data (who is shown starting, a note's wording, an
  ordering, a count on a card, which correctly priced parlay a suggestion picks, a rule the week left
  untested): the run publishes and goes red after its commit, the warnings listed. Every check is
  blocking unless it is named a warning with its reason in the code: the props audit (`W.<kind>` and
  `WARN` in `audit.js`; the summary line counts them; `weekly.py`'s verdict reads failures and runtime
  errors alone), the betting and news smokes (`warn`, written to `SMOKE_WARNINGS_FILE` only
  by a smoke with no failure, for the job's last step, which runs only after one). A number a page
  states stays blocking even where the choice behind it warns (a suggestion's stated floor), and a
  check of who the page lists may warn only where a blocking one still keeps every suggestion off a
  player who will not play, worked out from the sources (the audit's V6). The Elo job runs the Bets and
  Stats page smoke after its commit (a page check; `elo/check.py` and `elo/check_tab.js`, which runs
  the files through the Elo matchup chance and the Elo picks (market + form too, until app v138), gate the data). Seven of the ten NFL-job failures from 2 to 13
  October 2026 were live data meeting a presentation case no check had seen, each holding the week's
  data back until a fix landed. A check run only on made-up data stays blocking: only a code change
  can fail it, and a code change is run through its gate by hand. That holds only while no check
  turns on the week or the hour (two did on 15 October 2026, #270 and #271), so a check reads only the
  page's clock, plants made-up data on a fixture of its own (replaced wholesale, or its expectation
  worked out from the state before the plant, never planted values expected over a live structure),
  copies a page rule with the page's fallbacks, and holds in the off-season too (rules (a) to (e) in
  `audit.js`'s BLOCKING AND WARNINGS note); the props gate replays every check on past payloads at
  their own moment before a PR merges.
- **Runners are pinned.** Every workflow runs on `ubuntu-24.04`, not `ubuntu-latest`, which moves to
  Ubuntu 26.04 on 19 October 2026: try `ubuntu-26.04` on purpose, in a dispatched run on a branch,
  before moving the pin.

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
  page writes. Which of X's parlays a visitor has cleared from X Parlays on a device
  (`lp_cleared_here_v1`) is that visitor's own choice of what to see there, kept in that browser
  alone, never X's data and never sent anywhere, and so is their light or dark look (`nflhub_theme_v1`, `light` or
  `dark`, written by `theme.js` alone, never in `S`, under "The light look"). The admin link's record (`nflhub_admin_v1`,
  `{k, at, ok, checked, left, leftAt}`, written by `admin.js` alone, never in `S`) is the site owner's on his own devices,
  and DraftKings' prices his Pull from DraftKings reads are kept in the parlay card's memory alone. What a browser saved before (the prop model's saved
  list, `my_parlays_v1`, the betting app's own Bet Log and `x_nfl_bets_preshare_<season>`) stays in
  its storage, undrawn and never deleted. Anything held per-session and not meant to persist
  (for example the game pages' hands, drawn nowhere since app v124, cached in `GAME_TIER_CACHE` in `part3.js`, and Suggested Parlays'
  sets and the Top 30 lines, in `SP_CACHE` and `PB_TOP_CACHE`) is kept outside the saved state object `S`, so
  it is never serialised.
- **Downloads go through `lib/netfetch.py` (Python) or `lib/netfetch.js` (Node)**, one rule for every
  NFL job (`elo/build.py`, `weekly.py`, `update.js`, the Joker through `betting/jobkit.py`'s
  `download`, the news job's `lib.js` and `pull-week.js`, since 20 October 2026 the props job's ESPN read,
  `espn_read.js`, with its own headers, a 403 tried again with none, and a 150-second deadline, and since 31 October
  2026 the touchdown shadow's downloads, the 2026 play-by-play and weekly roster and any missing history file, through
  the registered `fetch.py`), after a burst of 500s on one nflverse
  file refused the Elo job on 13 October 2026 (three tries over 15 seconds; a re-run passed): a 5xx,
  408, 425 or 429, a timeout, a reset, a transfer cut short or an empty or HTML body is tried again on
  waits of 5, 15, 30 and 60 seconds (five tries), every wait out of one ten-minute budget a process; a
  404 and any other 4xx are answered at once, so "not posted yet" keeps its meaning (the error carries
  the status); each try has a timeout; a file is written whole or not at all. What still fails says how
  many tries over how long, and every job's refusal rules apply as before. Every NFL job has a
  `timeout-minutes`. `python3 lib/test_netfetch.py` and `node lib/test_netfetch.js` hold the rule to its
  cases. Never call `urlopen`, `urlretrieve` or a bare `fetch` for a job's source (`shadow.py`'s own
  download of games.csv is used only by hand: the betting job hands it the run's file). The ten-minute
  budget counts the waits, not the tries, so a host that accepts and then hangs is held by each try's
  timeout and the job's `timeout-minutes`.
- **No secrets in the repo.** Since 20 October 2026 no workflow maps `ODDS_API_KEY` (the props job buys no prices; the
  props gate sets it empty, and `test_props_gate.py` fails a `props.yml` that maps a secret); the repository secret is left
  in the settings until the owner deletes it, so a rollback stays one revert. The admin's own Odds API key is never in the
  repo or the page: it lives in his browser alone (`nflhub_admin_v1`, kept by `admin.js` from the admin link), and only
  The Odds API ever receives it, from `window.HUB_ADMIN` in `admin.js`, the one code on the page that holds or sends it.
  `build.js` refuses a page that names `api.the-odds-api.com`, `apiKey=` or `'nflhub_admin_v1'` anywhere outside
  `admin.js`, or carries an `apiKey=` with a key after it. Opened, the admin link stays in that browser's history and
  address-bar suggestions, and the site's storage on `demon-x13.github.io` is shared by all the owner's hubs: he knows both.
