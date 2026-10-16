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
  merging the fix to a refused props run, dispatch it: `gh workflow run props.yml -f no_odds=true`
  (the kept prices publish a few minutes later, no credit spent).

## The sites and their parts

GitHub Pages serves the repo root. One site has pages: `nflbets/`, plus the standalone `picks/` page (the
root `index.html` links them, and X NHL Bets and X College Football Bets in their own repos). `news/` is no
longer a page (the owner's call, 14 October 2026: the Season Tracker went into each game's Game snapshot on the
Matchups board): it holds the news job (`news.yml`), which writes the data the snapshot reads at runtime, and the
week's game notes, written by hand; `news/index.html` only sends a visitor to `nflbets/`. `pickems/` and `live/` hold only
redirects for old bookmarks; `liveparlays/` holds a redirect beside the X Parlays section's source and its
`parlays.json`. `props/`, `betting/` and `elo/` are models with no page of their own, each
with its own job (`props.yml`, `update.yml`, `elo.yml`); `nflbets/` has no job: it is rebuilt
by hand when a source changes, and reads the models' data on every load.

| Path | What | Source of truth |
|---|---|---|
| `props/` | Prop Model: no pages any more, only the parts, the build, the job and its data (`props/data/payload.json` is what `nflbets/` reads) | `props/build/part1.html`, `part2.js`, `part3.js` |
| `betting/` | X NFL Betting Model: no pages any more, only the app source, the tools, the job and its data (`betting/state.json` is what `nflbets/` reads); the app itself lives inside `nflbets/index.html` | `betting/app/x_nfl_betting_model.html` (copied in from `nfl-model-lab`) |
| `news/` | The news job, no page of its own since 14 October 2026 (`index.html` sends a visitor to `nflbets/`): the Deep Dive (`data/units2026.js` and its twin `units.json`), the stat bars (`data/stats2026.js` and `stats.json`, still written though no page reads them since the Stat breakdown went on 16 October 2026), the results and the week's reading pack, and each game's preview and news (`data/notes/<season>-w<N>.json`, written each Wednesday by Claude), which the Game snapshot fetches with `units.json` | `news/tools/` (the job); `news/data/notes/` (hand-written, `news/HANDOFF.md`); `news/data/teams.js` (hand-written, read by `picks/`) |
| `nflbets/` | NFL Hub (X NFL Bets and Stats until 16 October 2026), in the NBA Hub's and the NHL Hub's look: the two models on one page, built one tab at a time, with the Parlay Builder (suggested parlays built from the bet types and games a visitor ticks, over the builder, which finishes a parlay as a downloadable card, saved nowhere), X Parlays (X's placed parlays from `liveparlays/parlays.json`) and the X Bet Log (`liveparlays/xbets.json`) as tabs, and a Game snapshot of every game on the Matchups board (with the news job's preview and Deep Dive) | `nflbets/build/tab_pickems.html` + `snapshot.html` and `deepdive.js` + `liveparlays/build/page.html` + the props parts + the betting app + `nflbets/build/card.html`, `storage.js` and `xbets.js` |
| `picks/` | Weekly Picks: a visitor picks the winner of each game of the Matchups board's week (`betting/state.json`'s schedule, the first week with a game still to play) and saves them as a JSON file to send to X; picks are kept in that browser only, a game locks at kickoff, nothing is sent anywhere. The files friends send the owner go in `picks/friends.json`, which the Pick'em Record draws beside the models (below) | `picks/index.html` (hand-written, no build; team names and colours from `news/data/teams.js`); `picks/friends.json`, kept by Claude with `picks/tools/add.js` |
| `cfb/` | retired: X College Football Bets moved whole to `DEMON-X13/cfb-hub` on 2026-10-14, with its history; `index.html` redirects there | `cfb-hub` |
| `nhl/` | retired: X NHL Bets moved whole to `DEMON-X13/nhl-hub` on 2026-10-13; `index.html` redirects there | `nhl-hub` |
| `liveparlays/` | retired as a page: `index.html` redirects to `nflbets/#xparlays`; `parlays.json` is X's placed parlays and `xbets.json` the X Bet Log, the two files Claude edits from what the owner sends, and `build/page.html` is the X Parlays section's source | `liveparlays/build/page.html`, `liveparlays/parlays.json`, `liveparlays/xbets.json` |
| `elo/` | Player Elo: every player rated by position since 2012, the roster model built on those ratings and the matchup formula; `elo/data/*.json` is what the Player Elo tab reads | `elo/build.py` (the formula is its docstring); `nflbets/build/tab_elo.html` is the tab |

## Source vs generated -- never edit a generated file

These are rebuilt from source on every scheduled run, so an edit to one is lost
at the next refresh:

- `props/app/prop_model_2026.html` (gitignored: the audit's subject, never published)
- `betting/state.json`
- `nflbets/index.html` (by `nflbets/build/build.js`)
- `props/data/payload.json`, `props/data/priced_at.json`
- `props/data/suggest_ledger.json` (by `props/build/suggest_ledger.js` in the props job: the suggested
  parlays frozen at each wave's kickoff and graded after, so a hand edit there rewrites the record and
  the script's guard refuses it)
- `news/data/results.js`, `news/data/stats2026.js` and its twin `news/data/stats.json`, `news/data/units2026.js` and its twin `news/data/units.json`, `news/tools/out/week*-pack.md`, `news/tools/out/week*-lineups.json` and `week*-lineups-grade.md` (`news/tools/.cache/` is gitignored; the game notes, `news/data/notes/`, are source, written by hand)
- `props/research/totals/shadow/ledger.json` (by `shadow.py` in the betting job: the game-totals shadow's calls, frozen at kickoff, and its pre-registered bar, so a hand edit there rewrites the record and `shadow_check.py` fails it)
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
that feeds it. `news/index.html` only sends a visitor, and every old bookmark, to `../nflbets/`, the Matchups board
(`location.replace`, so Back does not loop, on the web and from disk alike, with a link for a browser without
scripts; never a meta refresh). The tracker's page, its week files, the team matchup, positives, negatives and keys
paragraphs, the rank chip and the player positions are in git history before that day. The job writes
`data/results.js`, `data/stats2026.js` and its twin `data/stats.json` (`pull-week.js`), `data/units2026.js` and its
twin `data/units.json` (`context.js`), and the reading pack and the lineups as kickoff found them in `tools/out/`;
it drafts no week file any more. Each twin is exactly its `.js` file's consts (`writeTwin` in `tools/lib.js`),
written with it and whenever it is missing or differs; `units.json` is what the snapshot fetches, and `stats.json`
is read by no page since the snapshot's Stat breakdown went (the owner's call, 16 October 2026), still written and
held by the smoke.

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
`vm`, sending a visitor to `../nflbets/`; and the fixed cases in `tools/cases.js` (each with the broken version a
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
node ../../nflbets/build/build.js   # the parts are the Bets and Stats page's source: rebuild it (see below)
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
payout floor a card states (a level "lands 25%+ by the model", a game hand's 40% legs, its -250 and its
High, Medium and Low floors) against its own numbers. V6 blocks a suggested leg or candidate on anyone
this week's report has Out, Doubtful or Questionable, or the roster has off its active list, released,
inactive this week or on no roster, or the inactive rule holds out, each worked out by the audit from
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
and during its game, a week with no player prices, paid ids to come, the season played out with and
without late lines), and the page smoke on four with `SMOKE_NOW` (two Monday nights under way among them,
when the smoke sets the page's clock back, one on a payload baked that Monday, its DraftKings lines then
newer than a press there): a change to the audit, the smoke or
the props parts comes with a run of it. **The props gate** (`.github/workflows/props-gate.yml`, its
logic in `.github/scripts/props_gate.py`) runs both on every PR, on a push to main that touches what it
covers, and by dispatch, and spends nothing (`weekly.py --no-odds`, no secret mapped, nothing
committed). Its first job sorts the changed paths into AUDIT (what the props job runs: `props/build/`,
the `props/data` scripts and model files but not the job's outputs, the research files `weekly.py`
runs, `lib/`, `props.yml`, the gate) and PAGE (`nflbets/`, the betting app, `betting/neutral_sites.json`
and `betting/tools`' build parts, the props parts, `liveparlays/build/`), a renamed file by its old path
too; with neither it passes at once, and a push or a dispatch runs everything. Job A runs `weekly.py
--no-odds` on the PR's code and today's nflverse files, then the page smoke on the payload it baked (the
published one when weekly.py refused); job B runs each case of `test_audit_phases.py` on a runner of its
own (the smoke cases alone when only PAGE changed). Each is differential: a failure is run again on
the base's code in a second checkout (`weekly.py --offline` over the same downloads, unless this run
refused at a download or read a file as not posted yet, when the base downloads its own), and fails the
gate when the base passes or has nothing to compare with (no such case, or a base refused at a download
where the change was not); a failure on both is a warning, a download refusal named as infrastructure, to
re-run. `python3 .github/scripts/test_props_gate.py` holds that judgement and the path sorting to their
cases, in the gate's first job. `python3 .github/scripts/props_gate.py dry-run 30` shows which of the last
30 PRs would have run which job, and `files <paths>` how paths are sorted. The audit's section V
checks the page a browser builds against the raw nflverse files (roster status, the
injury report, the stats, the schedule) when `PROPS_AUDIT_RAW=1`, which `weekly.py` sets;
by hand those comparisons are skipped and the rest run. Run by hand against a payload
baked before 9 October 2026 it fails V2 (lines on the wrong player) until the job rebakes it.

`weekly.py` also refuses (exits 1 before the workflow's commit step, so the last good data
stays live) when a required nflverse download fails (after `lib/netfetch.py`'s tries; `python3
test_fetch.py` holds weekly.py's downloads to them) or comes back wrong -- the schedule,
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

A game total is a leg like a team's win or cover (`total` beside `ml` and `ats`: `totalBet`,
`totalLeg`, `settleGameLeg`, `isGameLeg` in `part2.js`), offered over and under on the Game bets card
on each game's page on the Props tab (app v105, `patch_gamebets_props.py`, the owner's call of 14 October
2026: after the game's suggested parlays; until then it opened under each Matchups game, whose Game
snapshot now leads with a button that opens the game's page on the Props tab with the card brought into
view), and added by hand only: it never makes a suggested parlay. Its line is the
schedule's `g.tot`, its price the over and under odds beside it, `g.tov`/`g.tou`, which `payload.py`
carries from games.csv's `over_odds`/`under_odds` (free) and `weekly.py`'s bake replaces with
DraftKings' own where a fresh DraftKings total is used (`oddsfetch.py` now keeps the totals market's
prices it already pulls, no more credits; a DraftKings total on another number with no price of its
own drops the price). With no price on file the leg is shown at -110 marked est. Its chance is the
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
never clears the panel's bar and `pricedLegs` leaves the totals out; with Game total ticked the
suggested parlays take them only as the last fill, marked no edge (app v91-v93, below). The audit's J2
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
`eloAltP` takes the leg's stat), so the panel takes one only as a thin edge. The audit's K2 holds it
(on a payload baked before the model it says so and skips the projection checks; with it, a quarterback's
book price, the open weeks' own or one it plants, must reach a priced leg), and
`PROPS_AUDIT_PAYLOAD` boots the audit on another payload, to try data the job has not baked.

`.github/workflows/props.yml` runs four price pulls a week (Mon, Wed and Thu 08:17 UTC, and Sat
05:17 UTC for the weekend: Saturday's games and the whole Sunday slate, London to Sunday night;
~7 odds-API credits a game), eight post-game and stats runs, two Saturday catch-ups (16:07 and
23:07 UTC) and a daily 12:07 UTC run that lands after nflverse posts the day's injury report,
rosters and depth charts (about 14:20 UTC). The Sunday slate is priced on Saturday morning so the
owner has all of Saturday to look at it (his call, October 2026; the prices are about a day old
by kickoff): even 9.4 hours late, the latest GitHub has started one, the pull is on the site by
about 7:50am Pacific (6:50am PST from 1 November). GitHub fires this repo's crons about 2 to 9.4
hours late, so each pull prices every game kicking off before the next slot plus 10 hours, never
a game that has started, and not one priced in the last twelve hours: every game is bought once
(Thanksgiving's early game twice, Wednesday and Thursday, by design). The eleven `7 ` crons are
catch-ups (`weekly.py --catch-up`): each prices any game up to the very next slot that has no
prices and has not kicked off, once a pull's slot is ten hours gone, and spends nothing when every
pull ran; a dropped Saturday pull is made up by the 16:07 run on Saturday (Pacific), and the 23:07
one is the last chance before London. DraftKings' moneylines, spreads and totals are used only
while under a day old, so a Sunday game's give way to nflverse's on Sunday morning; the player
prices are DraftKings' Saturday ones to kickoff. A visitor's Refresh odds press (below) puts
DraftKings' current game lines and player lines, read from ESPN, over them in that browser alone. `python3 test_pull_schedule.py` (about a minute,
no credits) replays the season's schedule through `weekly.py`'s windows and `oddsfetch.py`'s
`choose()` at every lateness up to 9.4 hours and with pulls dropped, and holds the crons to
`PULL_SLOTS`: a change to either comes with a run of it. It commits straight to `main`. A refused
run (`weekly.py` exit 1) opens an issue labelled `props-refused`, or comments on the open one, with
`props/build/refused_note.py`'s text: the problems file, the games whose prices were bought and are
held (`priced_at.json` against the published payload's `baked_at`) with each kickoff in ET and the
hours left, the run's link, and what to do (merge a fix, then dispatch with `no_odds`); the next clean
publish closes it with its time. Both steps are continue-on-error and never stand in for the red run.

Sunday's early games, every Sunday kickoff before 4pm Eastern (the 1pm window, London and the other
games abroad), are never bought player prices (the owner's call, 13 October 2026: he bets props on the
afternoon and night games): `oddsfetch.py`'s `early_sunday()` skips them in `choose()`, in every mode,
catch-ups included, unless `--early` is passed by hand. That is about 9 of a week's games at 6 credits
each, so the free tier's 500 credits a month cover a five-week month with room over. Their moneylines,
spreads and totals still come in the slate's one game-lines call (and their DraftKings ids with them),
and their player legs are shown at the model's estimate, as any game without a book price. With no
player ids either, their player legs are never suggested, not even priced by a Refresh odds press (app
v109: a suggested leg needs DraftKings' id, below), while their team legs are. The page
says so wherever it says when player prices are pulled (app v103, `patch_early_sunday.py`: the Parlay
Builder's empty tiers and notes, and the parlay card); `test_pull_schedule.py`'s (e) holds that no
early game is ever bought.

Every pull also keeps DraftKings' own id (sid) for each outcome it reads, free on the same calls
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
rollover last season's file goes to `data/archive/` with its week's price files.

**Every suggested leg on DraftKings' slip** (app v109, `patch_dk_slip.py`, the owner's call of 16 October
2026). He built a parlay, pressed Finish parlay, and Open in DraftKings put only its first leg on
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
the Parlay Builder's levels (`pbPool`: the preferred, thin and totals lists), a game page's hands
(`gameLegPool`) and the Elo picks only with an id; every other rule (the band, the edge, market + form,
the far-off guard, which counts its legs first) is as it was, and a payload baked before `dk` suggests as
before. So after a press a `dkline` player leg is no longer suggested, and a team leg the press
re-priced is (the press gave its current id). A game counts as having player prices only where one of
its player legs has an id: with player bets ticked, prices on file and none with an id, an empty tier
says "No player legs DraftKings' betslip can take yet" and why (`PB_NO_ID`, with when they are pulled,
`PB_PULLED`, Sunday's early games never), a level short of legs says they are legs "DraftKings' betslip
can take", and the panel's notes say how many legs it left out for want of one, apart: those DraftKings
had only at another number (`moved`, `dkAtAnother`: a spread at nflverse's number where DraftKings' is
another, say, which the card would put on at DraftKings' number, and Refresh odds reads DraftKings'
current spreads and totals, which the levels can take) and those it had none for (`noId` less `moved`,
with why and when player ids come), still on the game pages to add to the builder. A game page's hand
left empty for want of ids says so and why (`gameNoIdWhy`: its player ids not pulled yet, never for
Sunday's early games, `dkEarlySunday`, or none for its other lines), never that the game has too few
lines. The suggestions record
takes the panel from `getPbTiers`, so it follows. The parlay card converts a leg rather than leave it off,
and the builder says so first (under "Bets and Stats: the loop", the parlay card). The audit works the
rule on its own (`dkIdAud`, `dkOk`, never the page's `dkIdOf`): M9 on made-up games with ids for some legs
and decoys under the keys a wrong rule would read (the pool less the legs with no id, the counts it says,
those at another number by the audit's own `dkElseAud` and those with none, the levels the legs with an id
alone build, a game with no entry and an empty table taken as before ids, no player id at all and its
reason, and no ids carried suggesting as before); M, M4 and M7 run on a made-up id table giving every priced line its id (as the
pull reads one with each price), so their rules still meet player legs and totals; M (the levels), M7 and
O (a game's hands) hold every leg a level or a hand may take or holds to an id; M8 a press's read
suggested nowhere where ids are carried and as before where they are not. The nflbets smoke holds the same on the page, a game's hands (and their
empty hands' words) and the Elo picks, its checks of the panel's notes reading the panel without the Elo picks'
own words.

Once the audit is clean, `weekly.py` runs the **suggestions record**, `node suggest_ledger.js` (the third
change after the review of Sunday 11 October 2026, the owner's call): the Parlay Builder's four suggested
parlays on its default choices (All, every game still to come, the default Bet amount), taken from the
published page itself (`nflbets/index.html` booted in jsdom on the payload just baked, with `elo/data`
beside it, since market + form decides which player legs qualify, and the window's clock held at the
run's time, so a boot of a few seconds cannot carry it past a kickoff) by the page's own `getPbTiers`, into `props/data/suggest_ledger.json`, which the workflow commits
with the rest of `props/data`. An entry is keyed `season|week|kickoff wave`, the wave being the earliest
kickoff among the games still to come at the run: rewritten by any run while that kickoff is to come and
the panel has changed, frozen from it and never changed again, so each is the panel as the job last saw
it before that wave (a wave no run landed before has none; an entry not frozen that is no longer the wave
is dropped; with no game to come nothing is taken). It keeps each level's legs, its model chance, fair
chance and decimal price, or why it is empty. A frozen entry is graded by the app's own `settleLeg` once
every leg has settled, as a book settles it: a leg lost loses; a push or void drops out and the rest are
paid at `parlayDec` on the legs left; every leg a push or void is a push, the stake back; pending while a
game or its stats are out; a grade once made is replaced only by a complete one; only the page's own
season is graded (the app's actuals are this season's, keyed by week, so last season's week 5 would read
this one's). A player with no stat line is graded as the page grades him (**who played**, below). The
`summary` gives per level the parlays graded won or lost, won, the wins expected by the fair chance and by
the model's, and the units on $1, each parlay once: an entry is the whole week's panel, so a parlay
unchanged across waves is frozen into each, and the same legs (in any order) of the same level in a
season's week are counted from the last entry that holds them (`repeats` says how many that set aside). Its guard holds the new ledger to the file the run started from and to the last
commit's: a frozen entry gone or changed in anything but its grade, an entry taken at or after its
kickoff or new and not this run's, a grade that does not follow its legs, a summary that does not follow
from the entries: refused, the file put back (the last commit's where the copy on disk had moved), exit 1.
It never refuses the run or turns it red: `weekly.py` logs the refusal in its report and publishes the
payload. It spends no credit. `node test_suggest_ledger.js` (about twenty seconds) runs it on made-up
weeks cut from the payload: taken (and kept by a run a second before its kickoff), rewritten before the
kickoff, unchanged and not written, frozen, graded against planted wins, losses, voids and pushes worked
out from the raw rows, the payload's snaps (planted) and the injury report (a player who played with no
stat line on zero; one his club's snaps leave out, void; one Out with no snap counts yet, void; neither,
pending), a grade kept that a payload can no longer settle, last season's entry never regraded
on this season's rows, a parlay two waves froze counted once, no game to come, and the guard end to end
and on hand-made ledgers. A
change to the script comes with a run of it.

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
visitor's browser only when **Refresh odds** is pressed, never on load, on a timer or in a job: a 44px
button with an aria-live status line beside it in the Parlay Builder's controls and over the Props tab's
game list (every game of the week still to come) and on a game's page (that game alone: its week's
scoreboard and its player lines, two or three requests). Both ESPN hosts answer a plain GET with
`access-control-allow-origin: *`; the page sends no header of its own (no preflight), `cache:
'no-store'`, four requests at a time, each with a timeout. The props job's only part is `PAY.espn_ids`,
the ESPN athlete id of every player the page can project (this season's stat rows, the payload's players
and the depth chart), from the nflverse roster it already downloads (`espn_ids` in `weekly.py`, `python3
test_espn_ids.py`); the payload carries no ESPN line. The reader (`espnRefresh` and its helpers in
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
over the publish it was read over (the game lines by `espnGlSig`, the player lines by `espnPlSig`: the
paid pull's time for the game, `PAY.dk`'s `at`, and its main lines), or over a newer publish where the read
is later than that publish's own time for the half (the game lines' DraftKings pull, `g.lat`, else the
bake; the paid pull's `at` for the player prices, else the bake); neither once the game has kicked off or
has a score, nor for a game not on the schedule in that week, nor from a value of another season or not
the page's shape (the key is then emptied). A rebake with the same lines never sets a read aside. So a
publish newer than the read always wins, a read made after a publish in a tab loaded before it stands,
and a game whose player prices are never bought (Sunday's early games) keeps its read to kickoff. What gave way is said on the status line for that load ("your earlier Refresh odds read gave way
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
`dk` is marked, `dkPressMade`, and does not count as the payload carrying ids). Each player leg's price after a press: the
paid pull's real price while its line is still DraftKings' line (the read has the same number, or none
for him); the read's line where DraftKings has moved it since, or where the pull has no price, priced by
the formula (`DK_EST` and `estPrice` in `part2.js`) and marked est. (src `dkline`); the model's estimate
where there is no line. A rung or touchdown the pull priced keeps its real price. The formula was fitted
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
receptions or passing touchdowns; the anytime touchdown; a yards rung DraftKings lists) counts as a book
price under the same rules: the 45-97% band, the 3-point edge, market + form (`eloAltP` reads a `dkline`
price as a book price), the far-off guard on its estimated fair chance (the formula's own, `legFair`) and
V6. Since app v109 it enters a suggestion (the Parlay Builder's levels, a game page's hands, the Elo picks)
only on a payload baked before `dk`: wherever the payload carries DraftKings' ids a suggested leg must
have one at its own line, and ESPN gives none for a player's line (the owner's call of 16 October 2026,
"Every suggested leg on DraftKings' slip" under Props). Every other kind
(completions, attempts, carries, rush + rec yards, interceptions, field goals, kicking points, the
receptions and passing-TD ladders, a rung DraftKings does not list) has no DraftKings price on file to
test against: priced, shown est. on the game pages, never suggested. Every `dkline` price is marked est.
with a title saying what it is priced from and when; a level, a hand or the builder with one says its
price is estimated; the parlay card looks a `dkline` player leg up in the pull's ids like any other leg,
at its line or converted to DraftKings' number, and lists it to add by hand only where they have nothing
for it (ESPN carries no outcome id for a player's line). A press drops every cache a price stands on (`PB_CACHE`, `GAME_TIER_CACHE`,
`PB_VIEW`; `ESPN_SEQ` is in `pbDataSig` and `gameSuggestSig`) and redraws, the focus kept on the button.
The status line says the published prices before a press, the read's progress during one ("3 of 14
games"), and after it when DraftKings' lines were read (for how many of the week's games, after a game
page's press), how many games have no player lines posted yet, how many had their game lines read and
their player lines not ("their published player prices stand"), and how many ESPN's scoreboard did not
answer for. The suggestions record is the job's, on the published prices: the job never presses the
button, and `suggest_ledger.js` is untouched. The audit's M8 holds it, blocking, on the reader itself fed
ESPN's recorded answers in `props/build/fixtures/espn/` through a fetch stub (and a feed made from their
shapes on the payload's own games, so it holds in any week; with no game to come those are skipped), against
`props/build/espn_rule.js`, the checks' own copy of the formula's constants: the parse, the paging, the
placement (a name never on a player an id names), the kickoff guards, every price, the precedence, what
the page chooses and on what rules (where the payload carries ids, no leg from the read in a level or a
hand; with them taken away, as a payload baked before them, the read's legs taken as before), the levels
and hands fresh right after a press, each id dated by its read, a read that gave way back on the published prices, nothing of it in `S` and no request to ESPN
without a press, and the kept read (the key's content after a press, a reload putting back exactly what
the press gave with no request, each rule that sets a half aside, a value from another season or junk
emptied, an empty schedule leaving the key alone, bad ids, keys and lines dropped, the merge and the save
that gives way for room); its status and card words are warnings. The nflbets smoke holds the buttons, a
press and its status line, market + form and the far-off guard on the read's legs, the card, a read that
gave way, and a real reload of the page (a second boot on the browser's kept read, with no request) on
stand-in answers of its own, and `elo/check_tab.js` market + form on a `dkline` price.

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
behind mark and note on a Team Rankings rating, the absences card's heading and hiding, and the week the
Pick'em Record's picker opens on. They print WARN, the state publishes, and the job's last step goes red
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
```

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
"through week N" is the last week whose games are all rated, with the week under way beside it; the models (game model, matchups, market + form,
Mismatches) keep the career rating, `elo` in `players.json` beside the season's `se` and `rank`. Opponents count through the
units: `K_UNIT` is 120 so a unit is rated as far from the average as it really is, and a big game against a weak one moves a player little.
They are of players who can play, the rest listed under the table where they would have stood: each club's
current roster is its rows at that club's own latest week (a club on its bye has none for the bye week, and reading
only the league's latest week once called every Chief and Panther a free agent); for each club's next game the
injury report's Out and Doubtful are out, Questionable stays listed with a Q unless he did not practise at the last
report, and before a club files its statuses a player out at its previous report (or inactive after being on it: the roster's
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
called ahead of time and are kept as a backtest (`src` on each graded call, the split on the tab's bar). Tiers are the betting app's Elo shields, lifted with
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
and on fixtures. The table scrolls sideways inside its card at
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
shows it, the Props tab opens on its Mismatches (the five biggest gaps between a starter's Elo and the unit he faces, in standard deviations, the top thirty behind Show more; a game that has kicked off leaves them, and each bubble wears the player's season shield); on a game's page each player with a Solid, Big or Huge one wears MISMATCH beside his name in the Diamond shield's blue, `pe-mmtag`, each leg in the builder carries its Elo matchup chance, and the Elo picks
(their own section at the foot of the Parlay Builder's suggested parlays, `#pbElo`) are built on it: 2-, 3- and 4-leg parlays of ranked players whose matchup says
they beat the book's price with its margin out (a real price, or, on a payload baked before `dk`, after a Refresh odds press one from DraftKings' line on a tested kind, est.), on the stats where the matchup has held up (plus money first, -200 to +300, one leg a
game), built from `pricedLegs()` in the props parts and filtered by the panel's ticked games and player sides (`pbAllows`) and, since app v109, wherever the payload carries DraftKings' ids, to legs with one at their own line (`dkCarries`, `dkIdOf`: the Parlay Builder's rule, under Props, "Every suggested leg on DraftKings' slip"; with none, the section says why and when player prices, and their ids, are pulled), each with Add to builder and Finish. A change to the formula is a change to `elo/build.py` (its docstring is the formula: say what
moved and why there) and a rebuild of the data; a change to the tab is `tab_elo.html` and a
rebuild of the page. The Elo model also stands on the Pick'em Record chart, table and pick
grid as a third model, beside Alpha Model and the Joker: `betting/tools/build.js` reads `elo/data/model.json` beside the season
in its published-mode hook (graded calls onto `processed[gid].elo`, the coming week's onto
`S.elo`, each graded there as soon as the season has its score, so a Sunday counts before Tuesday's re-rating; a game under way or awaiting its stats stays in `next` with its frozen call); `record_viz.js` (below) draws it on the chart and the table, and the build widens the app's own Joker lines in the pick grid to draw it there, each edit asserted
to land once. Vegas is the site's baseline: the Matchups board's calls, win chances, confidence, score predictions and records are the Vegas favourite's (nflverse's closing moneylines in `state.odds`, margin out, and the spread and total), the Pick'em Record's headline tiles are Vegas's record, Power Ratings (the Team Rankings tab) rate each team on this season's results alone, every game re-scored at each build (every team 1500 at the start; a weighted ridge of all the season's finals solved together, each worth its margin capped at 17, home field out, plus the opponent's rating now, so a game counts for what the opponent has turned out to be, not what it was rated when they met; recent weeks weigh a little more, a 16-week half-life, and every team is pulled toward average as if it had also played 16 average games; blended 0.8 to 0.2 with each team's expected lineup on this season's player Elo, which walk-forward helped a little; every constant chosen on 2012-2017 and tested once on 2018-2025, where it predicts the next game as well as the margin Elo it replaced in October 2026 (0.6447 against 0.6454 blended), which judged each game once, on the opponent's rating that week (the owner's Falcons-over-Packers and Chargers cases); THE POWER RATINGS in `elo/build.py`, `teams` in `elo/data/model.json`, drawn by `betting/tools/ratings_viz.js` with each team's record (the season's results from `betting/state.json`, so it is current before the Elo file is; a rating that predates a final is starred, and the note says the whole table predates it, since a final moves every team), the tier shields, the change since its last game (`before` is the same solve on the finals before that game, so the change includes the league's results since and a team moves in a week it does not play) and the chance against an average team; the margin Elo had replaced the lineup-on-player-Elo table, which walk-forward on 2018-2025 predicted the next game worse, in weeks 2-6 no better than picking the home team), and the Props list's pick column is the Vegas pick (the market's spread and total wherever a line is posted). The models are named on the page as Alpha Model (the main model), the Joker and the ELO Model (the Elo game model), Vegas the baseline (the Challenger and the Broly Model are off the site: the Betting loop); `betting/tools/build.js` renames the main model in the built app (`RENAME`), and `record_viz.js` and the pick-grid patch write the other names wherever the build draws them, never in the app's source. The Pick'em Record's chart and week-by-week table are drawn over the app's own by `betting/tools/record_viz.js` (wins against Vegas: each model's wins minus the Vegas favourite's on the same games, cumulative, Vegas the zero line; and a models-by-weeks grid shaded by record, every model's every week drawn alike), which the build puts in front of the app's script and `renderRecord()` calls last. Friends stand beside the models there (see "Friends' picks" below).  The X Bet Log is a bankroll, the same way: `betting/tools/bets_viz.js` (`renderBets()` is wrapped to call `betsViz()` after the app's own) draws its own chart with a switch, Balance (the account week by week from the deposit, a labelled reference line, green above and red below) or Weekly P&L (a labelled column a week from $0, a week off marked), leads the figures with the balance, and adds the balance after each week beside the table's running total; the weeks and the deposit are X's, from `liveparlays/xbets.json` (see "X's parlays and the X Bet Log" below), read only on every device (with no deposit in the file it is X's profit against break even, no balance), and the chosen view is each viewer's, kept in `S.bank` in the browser. The app source is never touched. `.github/workflows/elo.yml` re-rates daily, queued at 12:40 UTC, plus Saturday 20:40 and Sunday 03:40 UTC
for Sunday's calls on Friday's final report (GitHub starts this repo's scheduled runs 4-9 hours late, so a slot is queued
early enough to land before the London and 1pm kickoffs; Tuesday's run takes in Monday night; the rest move only who is
expected to play), runs `elo/check.py` and `elo/check_tab.js`, the gate on the Elo data, commits `elo/data`, and then
runs the nflbets smoke (skipped between the Super Bowl and the fortnight before week 1, when there is no game to call and
the smoke's Elo-picks checks have nothing to read): a page check, after the commit, so a page case the smoke has never
seen (a tied final, a top 25 of 24 quarterbacks, in October 2026) turns the run red without holding back the ratings.
What the files feed that touches a chance or a price is held before the commit by `check_tab.js`: market + form
(`eloAltP`, which decides whether a player leg qualifies for the suggestions) on every rated player, the Elo matchup
chance on every matchup line, and the Elo picks' chance and price as the products of their legs', on made-up book
prices, with no error thrown. The walk-forward record in `model.json` is the honest number: each season called by
a model fitted on the seasons before it. Do not tune the formula on the season in progress.

## College

X College Football Bets moved to its own repo, `DEMON-X13/cfb-hub`, on 2026-10-14, with its history and
its own CLAUDE.md; `cfb/index.html` here only redirects to it.

## Hockey

X NHL Bets moved to its own repo, `DEMON-X13/nhl-hub`, on 2026-10-13, with its own CLAUDE.md;
`nhl/index.html` here only redirects to it.

## Bets and Stats: the loop

The tab bar (`TABS` in `nflbets/build/build.js`) is Matchups (the board, Pick'ems until the owner's call of 16 October 2026,
"change the name Pickems to matchups"; its section, button id, file and `pk-` prefix keep the old name, which the prop
model's tab switch reads),
Props, Parlay Builder (the prop model's own Parlay Builder tab, `#parlay`), X Parlays (`#xparlays`, X's card alone), Team Rankings (the Power Ratings frame, renamed), ELO Ratings (the
Player Elo tab, renamed), Pick'em Record, X Bet Log (the Bet Log frame, still `#bets`); a prop model section with no button
there stays in the page, unshown. `liveparlays/` and `live/` redirect to `#xparlays`, and `news/` to the page, which opens on
the Matchups board. The Season Tracker tab is gone (the owner's call, 14 October 2026: its games are in the Game snapshot,
below): the board's address is `#matchups`, and an old `#tracker` or `#pickems` (every bookmark from before 16 October
2026, and `pickems/`'s redirect) lands on it, written over as `#matchups` (`routeTabs` in `tab_pickems.html`, by
`history.replaceState`; the smoke holds each, on an open page and on a fresh load, and that no text a visitor reads names
Pick'ems), and the build stops if `nflbets/build/tab_tracker.html` comes back. On a phone the bar scrolls sideways,
and the chosen tab's button is brought into it on load, on a new address and on a tap (the bar scrolls, never the page).
The Matchups board (`tab_pickems.html`) is six columns on a wide screen (date, matchup, win probability, confidence,
score prediction, final score) and one card a game at 900px and under; from 901 to 1,160px (the owner's window is
914) the columns are narrower and the win-probability bar takes what is left, its team labels dropped (the matchup
column names the teams), and the final-score column keeps 136px in every layout for a live "WAS leading 31–33", so
the board never scrolls sideways, as it did from 901 to about 1,100px until 14 October 2026, and nothing runs past a
card's edge. jsdom lays nothing out, so `smoke.js` sums each layout's least column widths, its gaps and the card's
padding against the page's content, less a 17px classic scrollbar, at that layout's narrowest width (one past the
middle layout's max-width, 1,161px, for the wide one; 901 for the one between), fails unless there is exactly one
layout between the phone card and a wide screen, and fails a final-score column under 136px or narrower than the
wide layout's.
`nflbets/index.html` is the prop model's page (part1 + part2 + part3, assembled by
`nflbets/build/build.js` the way `assemble.py` assembles it) with the Matchups board set in
front of it as its own `pk-` prefixed section, and the X Parlays section lifted out of
`liveparlays/build/page.html` into a section of its own, `tab-xparlays` (styles scoped to `#lpCard`,
script in a closure): X's card (`#lpCard`, X's placed parlays from `liveparlays/parlays.json`, read
only, a parlay marked `cleared` left out, a quiet line under the heading saying when the file last
changed; a settled parlay, gone or with every game over, last and in full under Finished, which says
each clears itself the day after its last game) and nothing else.

Every card on it, live or settled, has an X at its top right (the owner, 12 October 2026: "all of this
should look the same for everyone"), a 44px button named "Clear this parlay" that keeps clear of the
header's chips on a phone. It opens a small window, `#lpAsk`, asking "Clear this parlay?", naming it
(legs, week, price) and saying it is cleared from this device only and that X's parlays clear
themselves for everyone the day after their last game, with Cancel and Clear (Escape, Cancel and a
click outside clear nothing; Tab stays inside; the focus goes back to the X; a tap within 0.4 seconds
of it opening, a double tap's second, neither clears nor closes; it scrolls when taller than the
screen; leaving the tab closes it). Clear takes the parlay
off X Parlays in that browser alone, its games no longer read: its id, with when, goes into the
section's own key, `lp_cleared_here_v1`, never a retired one, which `storage.js` never removes (the
build refuses one that names it) and which is pruned on every read of the file of any id the file no
longer has or has cleared itself. Every change starts from what storage holds then, so two tabs of the
site in one browser never write an older list over each other, and a tab follows the other's change
(the `storage` event). With some cleared, "None of X's parlays is still live" becomes "None of the
parlays shown here is still live", since a cleared one may still be running. Nothing is sent anywhere: there is no owner mode, sign-in or token,
and a parlay leaves the page for everyone only by the file (`"cleared": true`, by hand or by
`autoclear.py`). With some cleared a quiet line at the foot says how many, with Show it (them) again;
with every one cleared that line is the card ("You cleared 2 parlays on this device"), and Show them
again empties the list with no window. `smoke_live.js` section O holds all of it.

The Parlay Builder tab is the prop model's suggested parlays panel (`#pbPanel`, drawn by `renderPb()`
in `part3.js`, from `renderParlay()`) over the builder (`#parlayBody`). At the top of its controls is
a **Bet amount** box (`#pbStake`: dollars, the decimal keypad on a phone, $1 to $100,000 in steps of
$1, cents kept), the visitor's own amount and the builder's own stake, one number (`S.stake`, $20 to
start, saved with the rest of the prop model state as the builder's stake always was), so it is set
once: the builder's box and its one-tap amounts set the same number. Every tier, the Elo picks' too,
pays it times its own decimal price ("$25 pays"), redrawn in place as it is typed (`pbPays`, each
card's `data-pb-pay` holding its price) with the builder following a moment later; leaving the box or
Enter settles it without redrawing the panel (`renderParlay({keepPb:true})`), so an Add to builder or
Finish pressed straight after typing lands. A typed amount is read by `stakeRead` ($ and thousands
commas allowed); one that is not a positive number (blank, a word, 0, a minus) leaves the amount as it
was, and a saved one that is not an amount reads as $20 (`pbStake`), so nothing drawn from it is NaN.
The panel is built from what
the visitor ticks, each choice kept in the browser's own prop model state (`S.ui.pb`: the boxes, the
games unticked, whether the games list is open; nothing else holds it): a mix, All (the default),
Teams only or Players only, which sets five boxes, Moneyline, Spread, Game total, Player overs and
Player unders (a touchdown and a ladder rung are overs; a box changed by hand lights the mix it makes,
or no mix at all: there is no Custom tag); and the week's games still to kick off, all ticked to start, with All and None. From those
alone it builds four tiers, each on its own: Safe, the likeliest 2-leg parlay; Medium, Aggressive and
Extreme, the 3-, 4- and 5-leg parlay with the best expected return (chance times payout) that lands at
least 25%, 12% and 5% of the time by the model's chance (`PB_TIERS`); where no parlay of a level's size reaches its floor
with any count of thin legs, the likeliest parlay of that size instead (`pbLikeliest`, chosen as Safe
is: the fewest thin legs, then the highest chance by the builder's own sums), marked `likeliest` and
ruled "the likeliest 3 legs" (4, 5) on its card, with its chance and price and no note about the floor
(the owner's call, October 2026: every level shows a parlay; the audit and the smoke work each such tier
out in full against every parlay of its size wherever its legs are a plain product). Under All nothing forces or caps a kind. A leg
qualifies as the old Suggested parlays window's did (a real price, or, on a payload baked before `dk`,
after a Refresh odds press one from DraftKings' line on a tested kind at the formula's price, est.: under
Props, "Refresh odds"; the model's chance 45-97% and 3 points above the chance that price implies, the
book's margin left in, market + form agreeing on a player leg: `formAgrees`), and since app v109, wherever
the payload carries DraftKings' ids, only with DraftKings' id at its own line (`dkIdOf`), so every leg a
level suggests goes on DraftKings' betslip (the owner's call of 16 October 2026: under Props, "Every
suggested leg on DraftKings' slip"); where those cannot fill a tier, the fewest legs the model still
rates at or above the book fill it, marked thin edge with a line saying what each kind lacked (a team bet
has no market + form), an id held to them the same; never a leg below the book (a `dkline` leg's book is
its estimated price). The panel's controls lead with Refresh odds (Odds, its status line beside it), and
a level with a player leg from the read (only on a payload baked before `dk`) marks it est., says its
price is estimated and why; a team leg a press re-priced is DraftKings' real price, with the id the press
read. A game total has no edge (it is the book's own
chance), so it is never preferred or thin: with Game total ticked the week's totals are a third list,
the market legs (`pool.mkt`), taken only where the legs with an edge cannot make a level of its size,
those legs then the base and the totals the only fill, the fewest first (`pbTier`); each is marked no
edge on its card with a line saying why (`pbMktLine`); a total takes the id rule too. With player bets
ticked and none of their prices in yet, a note says the levels are built without player legs; with
prices in and none of them with a DraftKings id, a note says that, and why (a line read by Refresh odds
carries none; DraftKings' own come with the prices the pull buys, and when); and where legs that would
have qualified were left out for want of an id, a note says how many, and that they are still on the
game pages to add by hand. A game gives one side (to win or to
cover) and its total, which a book takes on one ticket and which are unrelated (`legRho`); one leg a
player, no line twice. A tier is empty only when the picks do not make that many legs, and then says why ("Only 3 legs on your picks: tick more games or
bet types", or, with player bets ticked before any of the ticked games has a player price, "No
player prices yet: they are pulled on game day or the day before, Sunday's afternoon and night games on
Saturday morning, and never for Sunday's early games (before 4pm ET).", or, with player prices on file and
none of them with a DraftKings id, "No player legs DraftKings' betslip can take yet: ..." with why and when
they are pulled), never a smaller parlay. Its chance and price are the builder's own (`parlayProb`,
`parlayDec`, same-game legs priced together), worked on the legs in the builder's order, so Add to
builder (exactly those legs into `S.parlay`, on the Bet amount) shows the same numbers and pays what
the tier said; Finish opens the parlay card on the Bet amount. The search is a beam over a pairwise copula approximation, with only the
finalists worked by the real sums; the tiers are cached on a signature of the choices and the data
(`PB_CACHE`), and a game that kicks off while the page is open leaves the list and every tier
(`pbWatch` looks every half minute). The Elo picks are the panel's last section, and under them, at
its foot, the **Suggestions record** (app v99, `pbRecHtml`): the props job's `suggest_ledger.json` (see
the Props loop), read beside the payload once a load with no-store and kept outside `S` (`PB_REC`), drawn
from the entries' own grades (`pbRecSum`, app v100: each parlay once, from the last entry that holds it,
as the job's summary counts it), per level the parlays graded won or lost, won, the wins expected by the
book's fair chance and by the model's, and the units on $1 (a win a push shortened at what it paid),
pending parlays and pushes counted apart, with a line saying it starts on 12 October 2026 (Monday night's Bills at Rams the first
wave) and that each entry is the default panel frozen at kickoff; no file, or one that is not a ledger,
draws nothing. It is drawn when no game is left too. The audit's P2 holds it on made-up ledgers (no-store,
nothing without a file, each row worked out, an empty and a junk file), and the nflbets smoke on the
real file and a made-up one. With no game to come the panel says so. The old Suggested parlays window (`#suggModal`, its Any/overs/unders switch and
its stake box) is gone; a game page's own High/Medium/Low suggestions and their side switch stay.

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
call and marked est. wherever it is shown; a leg with no real price has none. A parlay's
(`parlayFair`) is the builder's own `parlayProb` on its legs with each chance replaced by its fair
chance, so same-game legs move together as the model's do; with a leg that has none it is null and the
parlay shows the model's chance alone, saying the fair chance needs every leg's book price. Every
level's card and the Elo picks' lead with it, labelled fair chance (", est." where it is), "model says
53%" (the Elo picks: "Elo says") beside it; the levels are still chosen on the model's chances, so a
level over its floor is ruled "best return that lands 25%+ by the model" (and the label wraps inside its
box, app v100: four levels side by side just over 1100px leave it narrower than "FAIR CHANCE, EST."). The
builder's summary leads with it ("fair chance all 3 land", "model says" beside it) and its confidence
tile rates it ("confidence all 3 land, on the fair chance"; the model's chance, said so, where there is
none; app v100), each builder row gives its leg's ("fair 55%"), a game page's High/Medium/Low hand leads
with it where every leg has a book price (the hands' floors, 35%, 20% and 10% by the model's chance, are
no longer stated on the page: app v106 took the game page's explanations off at the owner's ask, and the
audit holds the card to stating no floor), and the parlay card does too (below). A leg the model rates `FAR_OFF` (15 points) or more above its fair chance on its
side (`legFarOff`; only where a fair chance exists) is left out of the panel's preferred and thin lists
(`pbPool` counts it in `far`, and the panel's note says how many and why) and of a game page's hands
(`gameLegPool`), and flagged "model 77% · market 55%: far off the market" (`farText`) on the game pages
(the player lines, the touchdown and rungs on a book price, the Game bets card's team lines), in the
builder's rows and on an Elo pick, whose own selection (the Elo matchup chance) is left alone. The
audit's M holds every level's fair chance to `parlayProb` on its legs at theirs and its card to leading
with it; M7 works the rule on its own from the payload and holds `legFair` to it case by case, then
made-up lines one in three 25 points above the book's fair chance and one in three 6 points above: the
pool's count and note, no far leg on a level or a game hand, the flag on the game page (a main line; a
touchdown and a ladder rung planted on one-sided book prices, the ladders shown; the Game bets card's to
win and to cover) and in the builder, the builder's summary and confidence tile, each game hand as its
card draws it and made-up hands that are sure to take each branch (book-priced main lines, one with a
rung priced on one side, one with a leg on no book price), and the label free to wrap. The nflbets smoke holds the same on the page and the Elo picks, and
`smoke_live.js` section J the card, its image and Share link's text (fair, est. and none).

No device keeps a list of its own (the owner's call: visitors come to see X's parlays), and on
every device the builder's Save and lock is **Finish parlay**: it opens the parlay card
(`nflbets/build/card.html`, `pc-` prefixed, its own closure), a window showing the parlay as a
card (each leg and its price, the parlay's price, the stake and what it pays, the book's fair chance
first, then the model's (an Elo pick's, the Elo's) and the price's implied, or with no fair chance the
model's and why, the same lines in the window, the image and Share link's text (`chanceLines`), the
week and its dates, the site's mark) with **Download image** (a PNG drawn
on a canvas at twice its size, `parlay-week6-3legs.png`; the share sheet too where the browser can
share a file, which is how a phone saves it to Photos) and **Start over**. Beside them, **Open in
DraftKings** (a real link, in a new tab) opens the parlay on DraftKings' betslip,
`https://sportsbook.draftkings.com/?outcomes=<id>+<id>` with each `#` as `%23`, from the payload's `dk`
(see the Props loop): each leg's DraftKings id under its own key, a rung k+ as DraftKings' Over k-0.5
(or the whole k-1 its price was read from), in the card's order. Where DraftKings has no id at the leg's
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
slip yet: " and its reason in a few words; nothing under a leg that goes on as built, and nothing on the
prop model's own page, which has no card. Under the buttons the card says what it
opens, gives each leg's own link too (DraftKings documents no link for several outcomes), and names every
leg it still cannot open and why, from what the payload holds: its game's DraftKings prices not pulled yet, or
its game's lines read and none of its player prices yet (both with when they are pulled, the Parlay
Builder panel's words, and said only of a leg on no book price in a game with no DraftKings player price
in the payload: an id comes only with a price the job bought, so a game priced late has none; the owner's
Monday night of 12 October 2026, Bills at Rams, whose player prices the Monday pull had not read; a ladder
rung adds that once they are, it goes on as his Over at DraftKings' line on the stat, and 2+ touchdowns as
his anytime touchdown, each priced by DraftKings there), a market the pull does not read (carries, attempts, completions, interceptions, rush + rec yards,
targets and the kicking lines: only `oddsfetch.py`'s DEFAULT is pulled, so no pull brings their ids;
an id the payload has for one is opened all the same), no ids read for its game (a payload baked before
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
button's title says the same. DraftKings drops a moved id without a word, and a game's player ids are
read once, from a few hours to about 40 before its kickoff (Sunday night's on Saturday), so the day-long "puts all 3 legs on DraftKings' betslip"
it said before could be wrong on the very slip it named (dropped October 2026, with `fresh`). With no leg it can open the button
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
add by hand, a line each with why in a few words ("player prices for its game are not pulled yet"), and
the site's address last, as where it came from. The link is in the text and
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
nothing anywhere; a suggested tier's Finish (the panel's and the Elo picks', `data-pc-finish`,
answered by one listener in the card) finishes the same way. The build lifts renderParlay's pricing
out of `part3.js` into the card, so its price is the builder's own. Where X's parlays and the X Bet
Log come from is in "X's parlays and the X Bet Log" below. Then the Player Elo tab
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
`liveparlays/parlays.json`, `liveparlays/xbets.json`, `picks/friends.json` and `elo/data/*.json`, and the news job's
`news/data/units.json` as the page loads and a week's notes when the board or a window first wants them, so it is
rebuilt when a source changes, never when the data does; and ESPN's feed only when a visitor presses Refresh odds
(under Props, "Refresh odds"), held in memory and kept in the visitor's browser until it gives way (never in
`S`, never sent anywhere). A props patch, a betting build change or an edit to the live section's source means
rebuilding it too, and a change to `nflbets/build/deepdive.js` is held by the news smoke as well:

```
node nflbets/build/build.js
node nflbets/build/smoke.js       # must end "0 failures"; the Parlay Builder's panel, X Parlays and the X Bet Log from their files
node nflbets/build/smoke.js --season-over   # the same with every game played (the playoffs, the off-season)
node nflbets/build/smoke_live.js  # the X Parlays section from its file on its own tab (each card's X and Clear this parlay? too), on a plain browser and one the retired owner layer marked, and the parlay card (the builder's and a suggested tier's); must end "0 failures"
(cd news && npm ci && node tools/smoke.js)   # after a change to deepdive.js: the Deep Dive drawn on the real news files (the nflbets smoke only uses stand-ins); must end "all checks passed"
```

The elo job runs `smoke.js` every morning of the year, so it has to hold in any week: it takes the
board's week the way the board does (the first with a game still to play, else the last), checks
what needs a game to come only when there is one, and, once the page's own week (`liveWeek()`: the
first with a game not yet final, else the last) has no game still to kick off (within the hour of its last
kickoff or past it: Monday night under way before the props job rebakes after its final, which the Elo job,
dispatched by the betting job on a final, lands in; and the season's end), boots the page two days before
that week's last kickoff so the panel, the Elo picks and the builder checks still have a game to stand on;
a missing section there is a failed check, never a crash. `SMOKE_PAYLOAD=<file>` boots it on another
payload, to try a week the job has not baked, and `SMOKE_NOW=<ISO time>` runs it as if it were then
(Node's clock and every page's, the shift above laid over it; `props/build/test_audit_phases.py` uses both). `--season-over` gives every game a result first; run it after a change to the smoke or
to the Matchups board. Both smokes end on their own: a mistake in the smoke's code exits 1 at once
with its stack, a run still going after ten minutes stops and fails, and one left waiting on
nothing (no window open, its body not done) fails instead of ending Node with a silent exit 0.

**The Game snapshot.** A tap on a game on the Matchups board opens its Game snapshot straight away (the owner's
call, 14 October 2026: the row is the button, `role="button"`, `tabindex="0"`, `aria-haspopup="dialog"`, opened by a
click, Enter or Space, and wired once on the board in `wireRows()`, so a redraw never opens a window; until then a
tap opened the row on two buttons, the snapshot and the game's props). It is a window over the page
(`nflbets/build/snapshot.html`, `gs-` prefixed, its own closure, inlined by the build after the ELO tab's script,
with `nflbets/build/deepdive.js` set in as its own script just before it, so a change to either is a rebuild too;
the page's modal, Escape, Close and a click outside close it, Tab stays inside, the focus goes back to the
game's row) with everything the site has on that game: each team's record as Team Rankings counts it,
the kickoff and site, the game's preview and news, the Vegas line as the board reads it, every model's pick, chance and grade
(Vegas, Alpha Model, the Joker and the ELO Model, from
`state.json`'s `processed`, `atKickoff` and `joker` and `model.json`'s `graded` and `next`),
each team's Power Rating, the season's team stats side by side, Overall Offense against Overall Defense both
ways with the Deep Dive's position matchups, each team's expected
starters position by position with their season Elo, rank, shield and Q as on the ELO Ratings tab
(`lineups` in `matchups.json`), each name a 44px button to his own row on the game's page on the Props tab where the
prop model draws one (the owner's call, 16 October 2026: "in starters, make player names clickable to their props
page": `pkBoard.propsPlayers`, the players `renderGame` draws as rows, and `openOnProps(id, pid)`, which closes the
window and opens the page with his row open, highlighted by the ELO tab's `eloFocusPlayer` and focused; anyone else
plain text) and its ranked players out, and the Props tab's Mismatches in the game (the
Sources card, with each file's publish time and links to the full tabs, went on 14 October 2026, the owner's
call). It reads at a glance first (the owner's
ask, October 2026: easy to read, nothing smooshed): a pinned header that turns into the game in one
line (records and spread, or the score) once the verdict scrolls away, then a verdict card always
shown -- first, where the Props tab can open the game (`pkBoard.canProps`: the prop model has its row and
its week is open), a 44px **Game bets and player props** button, which closes the window and opens the
game's own page on the Props tab with its Game bets card brought into view (`pkBoard.openOnProps`); then
the head (`.gs-hero`): the away team, the middle (`.gs-mid`) and the home team, each team labelled Away or Home
("Home (listed)" at a neutral site) over its name and its record alone (3-2, bold, with no words for which games it
counts; the playoffs beside it once there are any; where the Elo file has counted a final the results have not,
the file's count, its title saying so), and no "at" circle between them (the owner's call, 14 October 2026: the
labels say it). The middle holds the score once there is one, the kickoff and site (a neutral one named so), and
the preview (below); under 900px (an iPad's 768 among them) the teams share a row and the middle goes full width
under them, the phone's smaller sizes from 760px. A played
game's note follows the head; then the
headline ("Jaguars favoured by 7.5", its chance and the board's own confidence pill; once played,
"Buccaneers won" with an Upset chip and the line it was favoured by under it) over the board's split
bar, the spread, total and moneylines (no line naming their sources any more, the owner's call, 14 October 2026),
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
It computes nothing of its own beyond the vote's counts and the Elo gap: the board
hands it the season, its own Vegas call and the way to the Props tab (`window.pkBoard`) and the ELO tab its one read of
`elo/data/` (`window.eloFiles`) and its Mismatches (`window.eloMismatches`). A played game says the
ratings, lineups and units are the files as they stand now, and a file that did not load, a game outside the
matchups' week or a team whose lineup is for another game is said in its card while the rest draws.
`smoke.js`'s last section (THE GAME SNAPSHOT) holds every number shown to its file (each number the
verdict and the summaries add is marked `data-gs-n` and worked out there on its own, as are the edge
marks in the cards and on the verdict's Team Elo and Offense vs defense answers, the side each names
with the edge, the dissenters, the unit ranks in the Starters headers and the badges),
the at-a-glance bars to the same numbers (each call's bar leaning toward its own pick, as far as its
chance and in that team's colour, and the Vegas split bar each side's chance wide), the
headline to the files and its confidence pill to the board's own, the header's game bar, the head (the away
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
props button (there exactly where `canProps` says, and
doing its job), the tabs' arrow keys, the Tab order and the 44px
tap heights are held too, on a wide screen and a phone; a row's click, Enter and Space open the window, no row has a
body, no redraw or score read opens one, and the focus goes back to the row on close. The position
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
(`#gsStats`, the tracker's eleven stat bars from `stats.json`) is gone (the owner's call, 16 October 2026: "get rid
of stat breakdown section"): the window no longer reads `stats.json`, which the news job still writes and its smoke
still holds, read by no page, and the build stops if the card or the read comes back. The window fetches
`../news/data/units.json` and the opened game's week's notes at runtime, `cache: 'no-store'`, each once a page
load, the units as the page loads and a week's notes once (the board's week once the board has its schedule,
another week's the first time one of its games opens), and never bakes them in, so a news job publish is on the
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
never, every new
control 44px, nothing thrown with every news file missing, and a page that bakes in none
of the news job's data and carries none of the old tab; the
real files are `news/tools/smoke.js`'s.

`nflbets/build/storage.js` (the browser's own storage), `nflbets/build/xbets.js` (the X Bet Log's
adapter), `nflbets/build/friends.js` (friends' picks, `window.FRIENDS`) and `nflbets/build/card.html` (the parlay card) are inlined by the build, so a change to any
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
a plain browser and on one the retired owner layer marked. `smoke.js` holds a real tier's link to
made-up ids under keys it works out on its own, with the other side of each line and the other team
under decoys (the tier's lines are made up, so the payload's own ids could never match them), the button
"Open in DraftKings" where every leg goes on and "Open N of M legs" where one does not, then a leg moved
off its id going on at DraftKings' number with the builder and the card saying so, and,
where the payload has ids for a game still to come, a builder parlay of its money line and a player's
Under to the payload's own ids, with another game's away spread at the page's line going on at its own id
or DraftKings' closest number, said under its row and on the card (skipped, and said, on a payload baked
before `dk`). Both smokes record every request a page makes: one to the retired
Firebase store or its sign-in services, or anything but a read, fails them.
`smoke.js` runs the build in memory (`require('./build.js')` writes nothing) and fails unless
`nflbets/index.html` matches it byte for byte (and that `preview.html` is gone), so a source committed without the
rebuild fails the gate, and the elo job, which runs this smoke every morning after its commit, goes red on it. It
also runs the betting job's `reference_models.json` gate on the copy of the betting app inside the
page (`BET_APP`). The prop model's storage key is read from part2's `SEASON`/`KEY` line at build
time and written into the storage layer, and the betting app's season (`betting/tools/build.js`
exports `BET_KEY` and `SEASON`) into the X Bet Log; the build stops if part2's `BET_KEY` is not the
app's. The Matchups board takes its
season from `state.json` and the X Parlays section from each game id, both asking ESPN for the
week in its own numbering (weeks 19-22 are the playoffs, seasontype 3), so nothing in
`nflbets/build/` or `liveparlays/` names a season.

**The hub look** (the owner's call of 16 October 2026: "make it match the color scheme and overall feel
of the nba and nhl hub so it's consistent across the board", and the title NFL Hub "to match the others").
The page is headed NFL Hub as the NBA Hub and the NHL Hub are: the wordmark (`NFL <em>Hub</em>`, a
football beside it where the NBA has its ball and the NHL its puck) and a tagline on the left, when the
data was built and the build tag in `.hub-stamp` on the right, then pill tabs. Its colours and type are
`nflbets/build/theme.css`, which the build lays over every other style, last (`<style id="hubTheme">`,
with the hubs' fonts, Unbounded and Manrope, in place of the prop model's), and hands to the framed
betting tabs (`window.THEME_FRAME_HEAD`, set in by `frames()` in `tab_pickems.html`): the NBA Hub's
lightened graphite exactly, as the NHL took it, with the NFL's gold (#FFD166, the NBA's own `--gold`) as
its accent where the NBA has orange and the NHL ice blue, yard lines behind the header where they have
court and rink lines, quiet text at the NHL's #B3B9CB and red text at its #FFA2B8 (the NBA's own fail
4.5:1 on a panel), the win-probability bars on the board and in the Game snapshot in the two clubs' own
colours as the other hubs draw theirs (`probCols` in `tab_pickems.html`, the owner's call of 16 October 2026,
the lime favourite having read as neon: each side its chip's colour with its percentage at 4.5:1, the home
side on another of its colours where the two would read as one; the nflbets smoke holds every pair of the 32
clubs to that). The parts keep their light
tokens underneath; a new hard-coded light colour in a part needs a rule in `theme.css`. Every text
holds 4.5:1 (3:1 large) on every tab, a game's page, the Game snapshot, the builder and the parlay
card, at 1280 and 390, checked in a real browser (jsdom computes no cascade). The parlay card and its
image carry the same palette written out in `card.html`, since the image must not depend on the page.
The root `index.html` (the landing page, which links the other hubs), `picks/` and the redirect pages
wear it too. `nflbets/preview.html` and `preview_theme.css`, the look on trial, are gone; the smoke fails
if `preview.html` comes back.

A parlay X placed at the book goes in `liveparlays/parlays.json`, and a week of the X Bet Log in
`liveparlays/xbets.json`, by Claude from what the owner sends, as each file's `how` field
describes: every device shows it on its next load.

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
node picks/tools/test_add.js             # the tool's test, and the real file held to its rules
```

then the branch, commit, PR and merge, as with any file the owner sends. `picks/friends.json` is
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
`xbets.js`) fetches `../picks/friends.json` no-store on every load, cleans it (a junk name or entry is
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
  visitor made -- their own builder, saved slips, picks, bankroll, settings, the parlays they
  cleared from X Parlays on that device, the Refresh odds reads they pressed for -- and nothing of X's. That cleared list only hides; it
  never changes or outranks the file, and it is pruned to the file on every load.
  Schedule, scores, stats, prices, ratings and projections are read from
  `props/data/payload.json` and `betting/state.json` on every load, and X's parlays and the X
  Bet Log from `liveparlays/`, and friends' picks from `picks/friends.json`. The prop model keys its
  saved season on `PAY.baked_at`, which moves on every run of the job, so a run always
  rebuilds; the betting app already merges only the visitor's keys over the published state.
- **A Refresh odds press is the visitor's, kept in their browser until a publish outranks it.** The lines a
  press reads from ESPN (DraftKings' game lines and player lines, under Props, "Refresh odds") live in the
  page's memory outside the saved state `S`, and in that browser's own storage under `props_press_v1`
  alone (app v108, the owner's call of 15 October 2026), never sent anywhere. A load puts a game's read
  back only before its kickoff and only where no publish is newer than the read (the prices it was read
  over, or a publish whose own time for them is older than the read): a newer publish wins and the read
  gives way, the builder's legs with it. Nothing is read
  from ESPN on load or on a timer.
- **A routine rebuild is silent.** The job publishes several times a week. Only a model or
  roster change is worth a banner.
- **Every page says which build it is.** `buildTag` on the Bets and Stats header: `APP_BUILD`
  (the prop model's parts) and the page's own hash (`PAGE_HASH`, the first seven hex of its
  SHA-256), so any source change -- the Matchups tab, the X Parlays section, the parlay card, the storage layer,
  the X Bet Log, the betting app -- shows as a new tag. Without it a stale copy cannot be told from a current one.
- **A frame's content is in the page.** The betting tabs are srcdoc frames filled from a
  string inside `nflbets/index.html`, so nothing is fetched or cached for them apart from
  the page itself: a refresh of the page is a refresh of the frames. No frame is filled by address
  any more (the Season Tracker tab, which framed `news/index.html`, went on 14 October 2026); the
  Game snapshot fetches the news job's files itself, `../news/data/units.json` and
  the week's notes, `cache: 'no-store'`, at runtime as the page loads (a week's notes when the board or a window
  first wants them), and the page bakes
  none of them in, so a news job publish is on the next load.
- **Data fetches are `cache: 'no-store'`.** The HTML is served by GitHub Pages with its own
  ten-minute cache, which a reload clears; nothing else may hold data longer than that.
- **X's parlays and the X Bet Log are files, the same on every device, read only everywhere.**
  There is no owner, no sign-in and no shared store: nothing on the page writes anywhere but the
  visitor's own browser storage. The X on a card in X Parlays clears it from that browser only
  (`lp_cleared_here_v1`, under "Bets and Stats: the loop"); for everyone, a parlay leaves the page
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
  the files through market + form and the Elo picks, gate the data). Seven of the ten NFL-job failures from 2 to 13
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
  alone, never X's data and never sent anywhere. What a browser saved before (the prop model's saved
  list, `my_parlays_v1`, the betting app's own Bet Log and `x_nfl_bets_preshare_<season>`) stays in
  its storage, undrawn and never deleted. Anything held per-session and not meant to persist
  (for example the game pages' suggested parlays, cached in `GAME_TIER_CACHE` in `part3.js`) is kept outside the saved state object `S`, so
  it is never serialised.
- **Downloads go through `lib/netfetch.py` (Python) or `lib/netfetch.js` (Node)**, one rule for every
  NFL job (`elo/build.py`, `weekly.py`, `update.js`, the Joker through `betting/jobkit.py`'s
  `download`, the news job's `lib.js` and `pull-week.js`), after a burst of 500s on one nflverse
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
- **No secrets in the repo.** `ODDS_API_KEY` is a repository secret and only the
  props workflow touches it.
