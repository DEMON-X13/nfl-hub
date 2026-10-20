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

GitHub Pages serves the repo root, and the root is NFL Hub: its `index.html` is the page, built from
`nflbets/build/` by `nflbets/build/build.js` (the owner's call of 17 October 2026, "can you make
https://demon-x13.github.io/nfl-hub/nflbets/ be https://demon-x13.github.io/nfl-hub/ and get rid of that page": until
then the page was `nflbets/index.html` and the root a hand-written landing page linking it, Weekly Picks and the other
hubs, which went that day, its links with it). `nflbets/` is the page's source folder (`build/`), and its `index.html`
a hand-written redirect to the root for old bookmarks. The one other page is the standalone `picks/` (Weekly Picks),
whose NFL Hub link, `../`, now lands on the page; X NHL Bets and CFB Hub are in their own repos. `news/` is no
longer a page (the owner's call, 14 October 2026: the Season Tracker went into each game's Game snapshot on the
Matchups board): it holds the news job (`news.yml`), which writes the data the snapshot reads at runtime, and the
week's game notes, written by hand; `news/index.html` only sends a visitor to the root, `../`. `pickems/` and `live/` hold only
redirects for old bookmarks, to the root; `liveparlays/` holds a redirect (to the root's `#xparlays`) beside the X Parlays section's source and its
`parlays.json`. `props/`, `betting/` and `elo/` are models with no page of their own, each
with its own job (`props.yml`, `update.yml`, `elo.yml`); the page has no job: it is rebuilt
by hand when a source changes, and reads the models' data on every load, every file named from the root
(`props/data/payload.json`, never `../props/...`, which from the root would leave the site).

| Path | What | Source of truth |
|---|---|---|
| `props/` | Prop Model: no pages any more, only the parts, the build, the job and its data (`props/data/payload.json` is what the page reads) | `props/build/part1.html`, `part2.js`, `part3.js` |
| `betting/` | X NFL Betting Model: no pages any more, only the app source, the tools, the job and its data (`betting/state.json` is what the page reads); the app itself lives inside the page, the root's `index.html` | `betting/app/x_nfl_betting_model.html` (copied in from `nfl-model-lab`) |
| `news/` | The news job, no page of its own since 14 October 2026 (`index.html` sends a visitor to the root): the Deep Dive (`data/units2026.js` and its twin `units.json`), the stat bars (`data/stats2026.js` and `stats.json`, still written though no page reads them since the Stat breakdown went on 16 October 2026), the results and the week's reading pack, and each game's preview and news (`data/notes/<season>-w<N>.json`, written each Wednesday by Claude), which the Game snapshot fetches with `units.json` | `news/tools/` (the job); `news/data/notes/` (hand-written, `news/HANDOFF.md`); `news/data/teams.js` (hand-written, read by `picks/`) |
| `index.html` (the root), from `nflbets/` | NFL Hub (X NFL Bets and Stats until 16 October 2026; at `nflbets/` until 17 October 2026, whose `index.html` is now a redirect to the root), in the NBA Hub's and the NHL Hub's look (dark, with a light look a visitor can switch to at the header's top right): the two models on one page, built one tab at a time, with Suggested Parlays (two sections since app v118, each with its own record: Night games, each Thursday, Sunday and Monday night game's own Safe, Medium, Aggressive and Extreme, shown one night at a time, and the Sunday slot, one set across the week's Sunday games before 7 pm Eastern; each set with its own four Elo picks, locked 2 hours before its kickoff, the slot's first, and graded by the props job's suggestions record, weeks 3 to 6 replayed as a backtest), the Parlay Builder (the builder first, which finishes a parlay as a downloadable card, saved nowhere, over the Top 30 lines, Value picks first, each bet once, on the bet types and games a visitor ticks), X Parlays (X's placed parlays from `liveparlays/parlays.json`) and the X Bet Log (`liveparlays/xbets.json`) as tabs, a Game snapshot of every game on the Matchups board (with the news job's preview and Deep Dive), and a matchup bubble on the name of every leg the Parlay Builder and Suggested Parlays draw | `nflbets/build/tab_pickems.html` + `snapshot.html` and `deepdive.js` + `liveparlays/build/page.html` + the props parts + the betting app + `nflbets/build/card.html`, `storage.js`, `xbets.js`, `glance.js`, `theme.css` and `theme.js` |
| `picks/` | Weekly Picks: a visitor picks the winner of each game of the Matchups board's week (`betting/state.json`'s schedule, the first week with a game still to play) and saves them as a JSON file to send to X; picks are kept in that browser only, a game locks at kickoff, nothing is sent anywhere. The files friends send the owner go in `picks/friends.json`, which the Pick'em Record draws beside the models (below) | `picks/index.html` (hand-written, no build; team names and colours from `news/data/teams.js`); `picks/friends.json`, kept by Claude with `picks/tools/add.js` |
| `cfb/` | retired: CFB Hub (then X College Football Bets) moved whole to `DEMON-X13/cfb-hub` on 2026-10-14, with its history; `index.html` redirects there | `cfb-hub` |
| `nhl/` | retired: X NHL Bets moved whole to `DEMON-X13/nhl-hub` on 2026-10-13; `index.html` redirects there | `nhl-hub` |
| `liveparlays/` | retired as a page: `index.html` redirects to the root's `#xparlays`; `parlays.json` is X's placed parlays and `xbets.json` the X Bet Log, the two files Claude edits from what the owner sends, and `build/page.html` is the X Parlays section's source | `liveparlays/build/page.html`, `liveparlays/parlays.json`, `liveparlays/xbets.json` |
| `elo/` | Player Elo: every player rated by position since 2012, the roster model built on those ratings and the matchup formula; `elo/data/*.json` is what the Player Elo tab reads | `elo/build.py` (the formula is its docstring); `nflbets/build/tab_elo.html` is the tab |

## Source vs generated -- never edit a generated file

These are rebuilt from source on every scheduled run, so an edit to one is lost
at the next refresh:

- `props/app/prop_model_2026.html` (gitignored: the audit's subject, never published)
- `betting/state.json`
- `index.html` at the root, the page (by `nflbets/build/build.js`; until 17 October 2026 it wrote `nflbets/index.html`, which is now a hand-written redirect to the root, source like the other redirects)
- `props/data/payload.json`, `props/data/priced_at.json`
- `props/data/suggest_ledger.json` (by `props/build/suggest_ledger.js` in the props job: each prime-time
  game's Suggested Parlays set, shown on the tab or not, locked 2 hours before its kickoff and graded after, beside the retired all-games
  panel's entries, frozen at each wave's kickoff, so a hand edit there rewrites the record and the script's
  guard refuses it; since app v118 each set's Elo picks too, and the Sunday slot's sets in its `slot` map)
- `props/data/suggest_backtest.json` (by `props/build/suggest_backtest.js`, run by hand, never by a job: the record's
  weeks before it took them, rebuilt from git at each lock and graded; the file only grows, and `--check` and the
  record's test refuse it moved)
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
that feeds it. `news/index.html` only sends a visitor, and every old bookmark, to `../`, NFL Hub at the site's root (`../nflbets/`
until 17 October 2026), which opens on the Matchups board (`location.replace`, so Back does not loop, on the web and from disk alike, with a link for a browser without
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
runs, `lib/`, `props.yml`, the gate) and PAGE (`nflbets/`, the page itself at the root, `index.html`, and the old addresses' redirects to it,
`pickems/`, `live/`, `liveparlays/` and `news/index.html`, since 17 October 2026, the betting app, `betting/neutral_sites.json`
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
v109: a suggested leg needs DraftKings' id, below; since app v115 the Parlay Builder's Top 30 lines list one a press
priced, marked, and no parlay takes it), while their team legs are. The page
says so wherever it says when player prices are pulled (app v103, `patch_early_sunday.py`: the Parlay
Builder's notes and the empty line of its Top 30 lines (the Top 100 until app v113, the Top 50 until app v116), its empty tiers until app v111, and the parlay card;
no prime-time game is an early one, so Suggested Parlays never needs it); `test_pull_schedule.py`'s (e) holds that no
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
the levels (`pbPool`: the preferred, thin and totals lists; since app v111 each prime-time game's set on
Suggested Parlays and, uncapped, the legs the Parlay Builder's Top 30 lines are ranked from, which since app v115 keep
a player's line read by Refresh odds with none: **The Top lines keep a line DraftKings moved**, below), a game page's hands (`gameLegPool`) and
the Elo picks only with an id; every other rule (the band, the edge, market + form,
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
builder. A game page's hand
left empty for want of ids says so and why (`gameNoIdWhy`: its player ids not pulled yet, never for
Sunday's early games, `dkEarlySunday`, or none for its other lines), never that the game has too few
lines. The suggestions record
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
app v111 the Top lines and the sets), M7 and O (a game's hands) hold every leg a level, a list or a hand may
take or holds to an id (the Top lines, since app v115, but for the read's lines they keep, below); M8 a press's read
suggested nowhere where ids are carried (since app v115 but on the Top lines) and as before where they are
not. The nflbets smoke holds the same on the page (the Top 30 lines, the sets, a game's hands and their empty
hands' words, and the Elo picks), its checks of the Parlay Builder's notes reading that panel alone, never the
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
stands, every game played or to come, no line its page draws (every player opened, the ladders shown), no leg
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
the builder by its own box, none of them FG attempts; and an FG attempts leg kept in the builder from before removed
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

Once the audit is clean, `weekly.py` runs the **suggestions record**, `node suggest_ledger.js` (the third change
after the review of Sunday 11 October 2026, the owner's call; since app v111 the record of Suggested Parlays, the
owner's call of 16 October 2026: "do similar tracking/grading as ELO tracking"): each prime-time game's four levels
(under "Bets and Stats: the loop", Suggested Parlays), every prime-time game's to come whether or not the tab shows it
yet (since app v112 the tab sets out one night at a time, `spOn`; the record reads `spGames`, which the night rule
does not touch, so Monday night's set is the job's from its first run, the tab's from Monday morning, and the same set
either way), taken from the published page itself (`index.html` at the site's root, `nflbets/index.html` until 17 October
2026, booted in jsdom on the payload just baked, with `elo/data` beside it, since market + form decides which player legs
qualify, and the window's clock held at the run's time, so a boot of a few seconds cannot carry it past a lock or a
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
(a kickoff the league moved makes a new key), as the tab's record counts it (`spRecSum`); `summary` gives the old
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
--check`'s rules. A change to the
script comes with a run of it.

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
parlay's own games: under "Bets and Stats: the loop", the parlay card), never on load, on a timer or in a job: a 44px
button with an aria-live status line beside it in the Parlay Builder's controls and in its builder, at the
top of Suggested Parlays and over the Props tab's game list (every game of the week still to come) and on a
game's page (that game alone: its week's scoreboard and its player lines, two or three requests). Both ESPN hosts answer a plain GET with
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
where there is no line. A rung or touchdown the pull priced keeps its real price. On a count (receptions,
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
receptions or passing touchdowns; the anytime touchdown; a yards rung DraftKings lists) counts as a book
price under the same rules: the 45-97% band, the 3-point edge, market + form (`eloAltP` reads a `dkline`
price as a book price), the far-off guard on its estimated fair chance (the formula's own, `legFair`) and
V6. Since app v109 it enters a suggestion (a Suggested Parlays level, a game page's hands, the Elo picks, and
until app v115 the Top lines) only on a payload baked before `dk`: wherever the payload carries DraftKings' ids a suggested leg must
have one at its own line, and ESPN gives none for a player's line (the owner's call of 16 October 2026,
"Every suggested leg on DraftKings' slip" under Props). Since app v115 the Parlay Builder's Top 30 lines keep it there
too, with one quiet line under its game saying why it has no id and what DraftKings' slip does with it, and no parlay
takes it (the owner's call of 18 October 2026, "The Top lines keep a line DraftKings moved" under Props). Every other kind
(completions, attempts, carries, rush + rec yards, interceptions, field goals, kicking points, the
receptions and passing-TD ladders, a rung DraftKings does not list) has no DraftKings price on file to
test against: priced, shown est. on the game pages, never suggested. Every `dkline` price is marked est.
with a title saying what it is priced from and when; a level, a hand or the builder with one says its
price is estimated; the parlay card looks a `dkline` player leg up in the pull's ids like any other leg,
at its line or converted to DraftKings' number, and lists it to add by hand only where they have nothing
for it (ESPN carries no outcome id for a player's line). A press drops every cache a price stands on (`PB_CACHE`, `PB_TOP_CACHE`,
`SP_CACHE`, `GAME_TIER_CACHE`; `ESPN_SEQ` is in `pbDataSig` and `gameSuggestSig`) and redraws, the focus kept on
the button wherever it was (a game's page, the Parlay Builder's controls or its builder, Suggested Parlays, the
Props tab); a set is re-picked by a press until its lock and never after it.
The status line says the published prices before a press, the read's progress during one ("3 of 14
games"), and after it when DraftKings' lines were read (for how many of the week's games, after a game
page's press), how many games have no player lines posted yet, how many had their game lines read and
their player lines not ("their published player prices stand"), and how many ESPN's scoreboard did not
answer for. The suggestions record is the job's, on the published prices: the job never presses the
button, and a locked set is the record's, the same for everyone whatever a visitor presses. The audit's M8
holds it, blocking, on the reader itself fed
ESPN's recorded answers in `props/build/fixtures/espn/` through a fetch stub (and a feed made from their
shapes on the payload's own games, so it holds in any week; with no game to come those are skipped), against
`props/build/espn_rule.js`, the checks' own copy of the formula's constants: the parse, the paging, the
placement (a name never on a player an id names), the kickoff guards, every price, the precedence, what
the page chooses and on what rules (where the payload carries ids, no leg from the read in a level or a
hand, and since app v115 the read's legs on the Top lines, each with its line; with them taken away, as a payload baked before them, the read's legs taken as before), the levels
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
python3 elo/tools/joker_base_fit.py   # after a build: the ELO Model's calls on the Joker's baseline (JOKER_BASE), fitted on 2021-2025, walk-forward on 2022-2025; "the build carries these constants"
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
called ahead of time and are kept as a backtest (`src` on each graded call, the split on the tab's bar). **The ELO
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
on the Joker from `joker_base_from_week`, and the tab's bar draws them apart from the Elo-alone calls before them and
gives the baseline's walk-forward (its title the Joker's and the game model's alone). `elo/check.py` (JOKER) works the
rule out on its own on every coming call and ledger entry against `betting/state.json`, and `check_tab.js` holds the bar.
The season's games played before the first build on the Joker (`JOKER_FROM`, 19 October 2026 15:20 UTC) were
re-picked on it the same day, the owner's call ("i just dont see any changes in the ELO model pickem record and i wanted
you to change it based on what it would have picked"): each called again once, after the game, on what was known before
its kickoff (the Joker's call as frozen at kickoff, the game model fitted before the season on the pre-game ratings and
lineups), marked a backtest, the call first made kept in `was` (ledger and graded call), so the Pick'em Record grades the
re-pick: 62-29 where the first picks went 52-39 (`record.repicked`, `repicked_was`; the tab's bar names both). The gate
allows exactly that change to a frozen call (JOKER and RECORD: a game kicked off before `JOKER_FROM`, on the Joker's
frozen call, a backtest, its `was` the call the last publish had, every such game re-picked, and the re-pick held as it
stands on every run after). The game model is unchanged (fitted, its walk-forward graded, read by the power ratings):
never refit BETA on the season in play. Tiers are the betting app's Elo shields, lifted with
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
shows it, the Props tab opens on its Mismatches (the five biggest gaps between a starter's Elo and the unit he faces, in standard deviations, the top thirty behind Show more; a game that has kicked off leaves them, and each bubble wears the player's season shield; what they rank is the matchup formula's units, the player ratings of the defenders he faces, and since 18 October 2026 their words say so, "vs the LAC secondary and defensive line, 32nd by player Elo" (`mmLine`, `mmTitle`, `mmAgainst`; clubs level on a unit
share its rank, 1 + the clubs rated above, there, in a player's window and in the Game snapshot's Starters headers, since
20 October 2026, when ATL and NO level on the secondary read 24th and 23rd), as do a game page's MISMATCH title, the Game snapshot's Mismatches and an Elo pick's tag, since "pass defense ranked" on the page is the ELO Ratings tab's Pass Defense table alone, which can rank the same club far apart: LAC 32nd of the one for Patrick Mahomes in week 6, 4th of the other); on a game's page each player with a Solid, Big or Huge one wears MISMATCH beside his name in the Diamond shield's blue, `pe-mmtag`, each leg in the builder carries its Elo matchup chance, and the Elo picks
(since app v118 each Suggested Parlays set's own, on that night game's or Sunday slot's games alone, whatever the Parlay Builder's ticks say, `window.eloUnit`, locked and recorded with the set: under "Bets and Stats: the loop", **Two sections, the Sunday slot and each set's own Elo picks**; from app v111 to v117 their own section at the foot of Suggested Parlays, `#pbElo`, on the Parlay Builder's ticked games and player sides, until then of the Parlay Builder's suggested parlays; their legs wear no Value mark, since they are chosen on the Elo matchup, not the edge: app v112) are built on it.
Since 18 October 2026 (the owner's call of 17 October: "for the ELO picks suggestions, can we also add an aggressive
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
matchup says they beat the book's price with its margin out (a real price, or, on a payload baked before `dk`, after a
Refresh odds press one from DraftKings' line on a tested kind, est.), on the stats where the matchup has held up
(`muTrusted`), priced -200 to +300, at an Elo chance of 30% or more and an expected return above nothing, each player's
best leg by value (his Elo chance times the decimal price, less 1; the main line on a tie), built from `pricedLegs()`
in the props parts and filtered by the Parlay Builder's ticked games and player sides (`pbAllows`, the reader's own
choices, as before the move) and, since app v109, wherever the payload carries DraftKings' ids, to legs with one at
their own line (`dkCarries`, `dkIdOf`: the Parlay Builder's rule, under Props, "Every suggested leg on DraftKings'
slip"; with none, the section says why and when player prices, and their ids, are pulled); a level is searched from
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
Mismatches' own words), only on the side the mismatch favours, his over, a ladder rung or his touchdown, never an Under
or interceptions (`epMmFor`). Each level has Add to builder, an Add on each leg (app v111, as a set's) and Finish
(`elo|elo-<level>`, the card's kicker "Medium Elo pick"). A change to the formula is a change to `elo/build.py` (its docstring is the formula: say what
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
prices, with no error thrown. The walk-forward record in `model.json` is the honest number: each season called by
a model fitted on the seasons before it. Do not tune the formula on the season in progress.

## College

CFB Hub (then X College Football Bets) moved to its own repo, `DEMON-X13/cfb-hub`, on 2026-10-14, with its history and
its own CLAUDE.md; `cfb/index.html` here only redirects to it.

## Hockey

X NHL Bets moved to its own repo, `DEMON-X13/nhl-hub`, on 2026-10-13, with its own CLAUDE.md;
`nhl/index.html` here only redirects to it.

## Bets and Stats: the loop

The tab bar (`TABS` in `nflbets/build/build.js`) is Matchups (the board, Pick'ems until the owner's call of 16 October 2026,
"change the name Pickems to matchups"; its section, button id, file and `pk-` prefix keep the old name, which the prop
model's tab switch reads),
Props, Suggested Parlays (Suggest Parlays until the owner's call of 17 October 2026, "tab name suggest parlay should be
Suggested Parlays", app v112: its button, its heading and every word a visitor reads that names it; its section, address
and `sp` names keep the old one; the prop model's own section `tab-suggest`, `#suggest`, after Props since app v111: the
next prime-time night's parlays and the Elo picks), Parlay Builder (the prop model's own Parlay Builder tab, `#parlay`: the builder, then its
choices and the Top 30 lines), X Parlays (`#xparlays`, X's card alone), Team Rankings (the Power Ratings frame, renamed), ELO Ratings (the
Player Elo tab, renamed), Pick'em Record, X Bet Log (the Bet Log frame, still `#bets`); a prop model section with no button
there stays in the page, unshown. Every old address sends a visitor to the page at the site's root (the owner's call of
17 October 2026, above, when it moved there from `nflbets/`), by `location.replace`, so Back does not loop, with a link
for a browser without scripts: `nflbets/` with its own query and tab (`location.replace('../'+search+hash)`, so
`nflbets/#suggest` lands on the root's `#suggest`, and `#tracker` or `#pickems` on the Matchups board by the page's own
routing; no meta refresh), `pickems/` with its hash, `liveparlays/` and `live/` to `#xparlays` (these three keep the meta
refresh they had, pointing at the root too), and `news/` to the page, which opens on the Matchups board. The nflbets
smoke runs each in `vm` on the web and from disk, resolves where it lands against its own address (so a target one
folder off, `../nflbets/` or `../../`, fails), and holds its link, its meta refresh or none, that it loads nothing and
that it names `nflbets/` nowhere outside a comment; it holds too that the root's `index.html` is the built page and not
the landing page, and that `nflbets/index.html` is no copy of the page. The Season Tracker tab is gone (the owner's call, 14 October 2026: its games are in the Game snapshot,
below): the board's address is `#matchups`, and an old `#tracker` or `#pickems` (every bookmark from before 16 October
2026, and `pickems/`'s redirect) lands on it, written over as `#matchups` (`routeTabs` in `tab_pickems.html`, by
`history.replaceState`; the smoke holds each, on an open page and on a fresh load, and that no text a visitor reads names
Pick'ems or Suggest Parlays), and the build stops if `nflbets/build/tab_tracker.html` comes back. A tab's address is its button's
`data-tab`, so `#suggest` needed no routing of its own, and every address from before it (`#parlay`, `#slate`,
`#xparlays`) is as it was. On a phone the bar scrolls sideways,
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
The page, the root's `index.html` (`nflbets/index.html` until 17 October 2026), is the prop model's page (part1 + part2 + part3, assembled by
`nflbets/build/build.js` the way `assemble.py` assembles it, its payload named from the root, `props/data/payload.json`) with the Matchups board set in
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
of the time by the model's chance (`PB_TIERS`); where no parlay of a level's size reaches its floor with any count
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
open."), and a load of the hub pays nothing for a tab nobody opened. A leg qualifies as a suggested leg always has
(a real price, or, on a payload baked before `dk`, after a Refresh odds press one from DraftKings' line on a tested
kind at the formula's price, est.: under Props, "Refresh odds"; the model's chance 45-97% and 3 points above the
chance that price implies, the book's margin left in, market + form agreeing on a player leg: `formAgrees`; the
far-off guard, below; nobody V6 keeps out, through `pricedLegs`), and since app v109, wherever the payload carries
DraftKings' ids, only with DraftKings' id at its own line (`dkIdOf`), so every leg a level suggests goes on
DraftKings' betslip (the owner's call of 16 October 2026: under Props, "Every suggested leg on DraftKings' slip");
those are the Value picks, each marked Value (below); where they cannot fill a level, the fewest legs the model still
rates at or above the book fill it (the thin legs), unmarked (until app v113 with a line under the level saying why
they are not Value picks and what each kind lacked, `pbThinLine`: "One leg is not a Value pick: the model rates it at
or above the book's price, but not 3 points above."; a team bet has no market + form; a set's cards draw it no more,
**Without the long paragraphs**, below), an id held to them the same; never a leg
below the book (a `dkline` leg's book is its estimated price). A level with a player leg from a press (only on
a payload baked before `dk`) marks it est. and says its price is estimated and why; a team leg a press re-priced is
DraftKings' real price, with the id the press read. A game total has no edge (it is the book's own chance), so it is
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
A level is empty only when the game does not make that many legs, and then says why (`spWhy`: "Only 3 legs in this
game, and no player prices yet: they are pulled on Saturday morning.", "... that DraftKings' betslip can take", a
game's player prices, and DraftKings' ids with them, coming on the day of a Thursday or Monday game and on Saturday
morning for Sunday night's), never a smaller parlay. Its chance and price are the builder's own (`parlayProb`,
`parlayDec`, same-game legs priced together), worked on the legs in the builder's order. Each level is a card
(`pbTierCard`, drawn quiet, `o.quiet`, since app v113: under its legs only the est. line where a leg's price is an
estimate and a ruled-out level's Updated line): the book's fair chance first and the model's beside it, the price and what the Bet amount pays, then
its legs, each with its own **Add** (`data-pb-leg`, 44px, `aria-pressed`, named for the leg: "Add Bo Nix, 250+
passing yards, to the builder"), which puts that one leg in the builder by `toggleLeg`'s own path, so the builder
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
app v113 took off their lead was the matchup nudge's record). The tab is now two sections, `section.sp-sec`, Night games
(`data-sp-sec="night"`, the night rule's games as before) and the Sunday slot (`"slot"`), each headed `h3.sp-sech` with its
own record (`.sp-rec[data-sp-recsec]`, below). The Sunday slot (`spSlotUnit`, `spSlotNext`) is every Sunday game of a
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
carries its own four Elo picks under its model parlays (`h5.sp-sub` Model parlays, then Elo picks, each `.pb-tiers` with
`data-sp-kind`): the ELO tab's four levels on that unit's games alone (`window.eloUnit`, `eloCands`' `games`, no
`pbAllows`; each empty level saying why, with when the player prices come where the unit has none, `spEloSet`), drawn
with the ELO tab's card options (`window.eloCardOpt`: the Elo chance, each player's shield, the rule) and the set's own
buttons (`data-sp-add="<unit>:elo-<level>"`, `data-pc-finish="sp|<unit>:elo-<level>"`, the card's kicker "Safe Elo pick
· the Sunday slot"), their mismatch tags put on after the draw (`eloDecorate`, wrapping `renderSp`); live before the
lock, then the record's (the entry's `elo`), else this browser's own built once and kept beside the set
(`props_sp_lock_v1`'s `elo`, `eloOwn`, said in one line), a level holding a player ruled out after the lock built again
as a model level is. `#pbElo`, `eloSuggest` and `data-pb-elo-add` are gone, and `window.eloPicks()` (every game, no ticks)
is kept for `check_tab.js`. The props job's record takes them (under Props, the suggestions record: each entry's `elo`
beside its `tiers`, and the `slot` map). The record at each section's head (`spRecSum(L, sec, kind, B)`, `spRecHtml(sec)`)
is two rows, Model parlays and Elo picks (`data-sp-reckind`), a pill a level (`data-sp-rec="<sec>:<level>"`, the Elo picks'
`elo-<level>`), each unit's level counted once, from the record wherever it holds that unit's levels of the kind (all
four as it took them, so a level with no parlay or still pending is the record's) and else from the backtest
(**The backtest**, next), each pill's title saying how many came from the backtest and the wins expected by the book's
fair chance and by the level's own chance (the model's, or the Elo's), with one chip, `data-sp-rec="<sec>:bt"`, "Incl.
backtest, weeks 3–6", wherever some of it is.

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
mark on every Value pick and on nothing else, no Elo pick's leg marked, and no old tag anywhere.

**The lock** (the owner's call of 16 October 2026, after the sets above: "obviously dont want the lines and options
changing alot ... can we have the ability to refresh odds up until 2 hours before the game before it locks?"). A set
is live until 2 hours before its kickoff (`spLockAt`, `SP_LOCK_MS`): built from the published prices and, in the
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
puts that leg in as it was locked (its line and price), never the line as it stands now. Each set's kickoff is said
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

At the top of the tab is the **record** (`#spRec`, `spRecHtml`): a pill a level, as the ELO Ratings tab's record
bar, its won-lost and units on $1 from the `prime` entries' own grades (`spRecSum`, as the job's `prime_summary`
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

The Parlay Builder tab (`#parlay`, `tab-parlay`; app v111, the owner's call of 16 October 2026: "move top section
with odds, build from, bet types, game checkboxes into new section tab called 'Parlay Builder'. add leg parlay
section for live builder, in that section add refresh odds button and show top 100 line + profit ratio and allow
each line item to be added to parley builder") is the builder (`#parlayBody`) at its top, then its choices and the
**Top 30 lines** they make (the Top 100 until app v113, `patch_declutter_top50.py`, the owner's call of 17 October 2026:
"in parlay builder only do top 50 now instead of 100"; the Top 50 until app v116, `patch_top30_first.py`, the owner's of
18 October 2026, with a screenshot of the tab: "its only showing top 30, but honestly top 30 is enough if you want to
set it at that", the list having shown 30 rows because the reader had ticked a few games)
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
Players only, which sets five boxes, Moneyline, Spread, Game total, Player overs and Player unders (a touchdown and
a ladder rung are overs; a box changed by hand lights the mix it makes, or no mix at all: there is no Custom tag);
and the week's games still to kick off, all ticked to start, with All and None. From those alone, the **Top 30
lines** (`getPbTop`, `pbTopBuild`): every leg on the ticks that qualifies as a suggested leg does (`pbLegs`, the
lists a level is searched from, uncapped: the preferred and the thin legs and, with Game total ticked, both sides of
each ticked game's total, every rule above held, the id rule among them, but for a player's line read by Refresh odds
on a tested kind, which since app v115 the list alone keeps with none, under Props, **The Top lines keep a line
DraftKings moved**), in two parts (app v112, the owner's "come
up with a name for that first section", under **Value picks** above): first the Value picks, every preferred leg,
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
pairs). A ladder rung k+ (a player's over that is not his main line) lands exactly when his main Over at k-0.5 on a
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
each part ranked by what $1 on it is expected to make, any game totals last, 30 lines at most in all. Each bet is
listed once: a ladder rung that is the same bet as the player's main line (225+ passing yards and Over 224.5) is
shown as the main line."), and each row carries its part (`data-pb-grp`, value or other; edge or thin until app
v112, the first thin row under a gold rule, which went with the headings).
Each row (`pbTopRow`) gives its rank, the player or team, the line and its game, the Value mark on a Value pick and
no mark on any other row, its price (est. where it is, titled with what it is priced from and when), the model's
chance, the book's fair chance where there is one ("fair, est." where it is), what $1 wins if it lands and what $1
is expected to make, and an Add, the sets' own (and, since app v115, under its game the quiet line of a read's
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
drawn under the heading "Top 30 lines" (blocking: a number the page states). On the week as
it stands only the smoke meets a priced ladder rung (week 6's list left out 7): the audit boots with no baked odds
(`NO_BAKED`, `S.odds` empty), so its real lists carry no rung and its own made-up games (M12) are what hold the rule
for it. Both hold it
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
all-games panel's said: with player bets ticked and none of their prices in yet, that the list has no player lines
and when they are pulled; with prices in and none with a DraftKings id, that, and why (a line read by Refresh odds
carries none; DraftKings' own come with the prices the pull buys, and when); how many lines it left out far off the
market, and why; and how many for want of an id, apart (DraftKings at another number, or none), each still on the
game pages to add to the builder. An empty list says why (`pbTopWhy`: no box or no game ticked; "No player prices
yet: they are pulled on game day or the day before, Sunday's afternoon and night games on Saturday morning, and
never for Sunday's early games (before 4pm ET).", `PB_NO_PL`; "No player legs DraftKings' betslip can take yet: ..."
with why and when, `PB_NO_ID`; else "No line on your picks qualifies yet: tick more games or bet types."). The list
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
is gone; a game page's own High/Medium/Low suggestions and their side switch stay.

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
has ruled out, whose Matchup line says he has none to show). A team's or a game total's bubble: both records as Team
Rankings counts them, the Power Ratings and their rank, the line the leg stands on (the prop model's own row for the
game, named DraftKings where it is DraftKings'; the board's closing line only for a game the prop model has no row for:
until 18 October 2026 it was the board's, so a Bills "To cover -4.5" at -118 sat under "BUF -5.5 · BUF -258"), Overall
Offense against Overall Defense each way, each model's pick and chance, the leg's team marked "this leg" (a row's
line, not a bet the visitor made) and, on a moneyline alone, each model picking that team to win ticked; then the leg
and Open game snapshot. A file that has not loaded says so in its own line. The builder rows' own market + form and
Elo matchup (`decorateAlt`) read the price the row shows, as the bubble does (display only: the Track Record grades
market + form on its own rows). The nflbets smoke's THE MATCHUP BUBBLE section (`glanceChecks`, blocking) holds every
name as the right button for its leg, each place drawing a leg once, every number on its own reading (the Faces line on
its own map from model.json, `FACE_OWN`, and the rank the ELO Ratings tab's own table draws, read off the tab), the
line the leg stands on with the prop model's row moved off the board's, "this leg" and the moneyline-only tick, a
two-way player, a club planted carried, a player planted Out and Questionable, the window's keys, focus, Close, Open
game snapshot and a tab changed by the address, the redraws (renderParlay, a price moved, the leg taken out, renderSp,
an Elo pick's card), the reader's scroll, a stale stored price, and nothing written to storage, all on fixtures of its
own at any hour (the builder's legs on a made-up game two days out).

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
side (`legFarOff`; only where a fair chance exists) is left out of the preferred and thin lists every
suggestion is built from, the sets' and the Top 30 lines' (`pbPool` and `pbLegs` count it in `far`, and the
Parlay Builder's note says how many lines and why) and of a game page's hands
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
prices were read will not be on the slip.", as a read that fails does; a read that ends after the cap still updates
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
add by hand, a line each with why in a few words ("player prices for its game are not pulled yet"), and
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
`tab_pickems.html`): allowed to, a classic scrollbar, Windows Chrome's with its arrows, stuck in the
Pick'em Record with nothing to scroll, since its charts drawn without the bar came out a few px
taller than the height measured with it. Sideways, a box scrolls only where its content is really
wider (the week-by-week grid and the pick grid on a phone), with one bar.
Nothing is baked in: it fetches, each named from the site's root where it is, `props/data/payload.json`, `betting/state.json`,
`liveparlays/parlays.json`, `liveparlays/xbets.json`, `picks/friends.json` and `elo/data/*.json`, and the news job's
`news/data/units.json` as the page loads and a week's notes when the board or a window first wants them, so it is
rebuilt when a source changes, never when the data does; and ESPN's feed only when a visitor presses Refresh odds
(under Props, "Refresh odds") or opens a parlay card (its games alone), held in memory and kept in the visitor's browser until it gives way (never in
`S`, never sent anywhere). A props patch, a betting build change or an edit to the live section's source means
rebuilding it too, and a change to `nflbets/build/deepdive.js` is held by the news smoke as well:

```
node nflbets/build/build.js      # writes the page, the root's index.html
node nflbets/build/smoke.js       # must end "0 failures"; Suggested Parlays, its night rule, its lock and its short lines, the Elo picks' four levels, the Parlay Builder (the builder first) and its Top 30 lines, their two parts, the totals last, each bet once and the read's moved lines with their slip line, only DraftKings' markets, the matchup bubble, X Parlays and the X Bet Log from their files, the old addresses' redirects to the root, and the light look and its switch
node nflbets/build/smoke.js --season-over   # the same with every game played (the playoffs, the off-season)
node nflbets/build/smoke_live.js  # the X Parlays section from its file on its own tab (each card's X and Clear this parlay? too), on a plain browser and one the retired owner layer marked, and the parlay card (the builder's and a Suggested Parlays level's, and its check of DraftKings' current lines as it opens); must end "0 failures"
(cd news && npm ci && node tools/smoke.js)   # after a change to deepdive.js: the Deep Dive drawn on the real news files (the nflbets smoke only uses stand-ins); must end "all checks passed"
```

The elo job runs `smoke.js` every morning of the year, so it has to hold in any week: it takes the
board's week the way the board does (the first with a game still to play, else the last), checks
what needs a game to come only when there is one, and, once the page's own week (`liveWeek()`: the
first with a game not yet final, else the last) has no game still to kick off (within the hour of its last
kickoff or past it: Monday night under way before the props job rebakes after its final, which the Elo job,
dispatched by the betting job on a final, lands in; and the season's end), boots the page two days before
that week's last kickoff so the Top 30 lines, the sets, the Elo picks and the builder checks still have a game to stand on;
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
(Node's clock and every page's, the shift above laid over it; `props/build/test_audit_phases.py` uses both). `--season-over` gives every game a result first; run it after a change to the smoke or
to the Matchups board. Both smokes end on their own: a mistake in the smoke's code exits 1 at once
with its stack, a run still going after fifteen minutes stops and fails (smoke_live.js after ten), and one left waiting on
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
`news/data/units.json` and the opened game's week's notes (`news/data/notes/<season>-w<week>.json`), named from the
site's root (`../news/...` until 17 October 2026), at runtime, `cache: 'no-store'`, each once a page
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
a plain browser and on one the retired owner layer marked; and (J2) the card's check of DraftKings' lines as it opens,
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
heading or the chosen tab's button, and Start over's focus never on the page's body. `smoke.js` holds a real tier's link to
made-up ids under keys it works out on its own, with the other side of each line and the other team
under decoys (the tier's lines are made up, so the payload's own ids could never match them), the button
"Open in DraftKings" where every leg goes on and "Open N of M legs" where one does not, then a leg moved
off its id going on at DraftKings' number with the builder and the card saying so, and,
where the payload has ids for a game still to come, a builder parlay of its money line and a player's
Under to the payload's own ids, with another game's away spread at the page's line going on at its own id
or DraftKings' closest number, said under its row and on the card (skipped, and said, on a payload baked
before `dk`), each card's read of DraftKings' lines exactly its own games' (their week's scoreboard once a game, and
nothing else at ESPN: `cardReads`). Both smokes record every request a page makes: one to the retired
Firebase store or its sign-in services, or anything but a read, fails them, and `smoke.js` fails too any request
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
lean bar and Deep Dive tags back to its light tints, the Even tag's ring, the Elo grade colours, the ELO windows' rows
that weigh nothing quieted by the muted ink rather than faded), and a new one needs both, checked in a real browser.
`THEME_FRAME_HEAD` carries both palettes, and `frames()` in `tab_pickems.html` writes the page's look into a frame's
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
  cleared from X Parlays on that device, the Refresh odds reads they pressed for -- and nothing of X's. That cleared list only hides; it
  never changes or outranks the file, and it is pruned to the file on every load. The one thing the
  page keeps of its own making is a Suggested Parlays set it built at a game's lock where the record had none
  (`props_sp_lock_v1`, to kickoff; since app v118 its Elo picks too, and the Sunday slot's to its last kickoff), and the
  record's locked set takes its place as soon as a load reads one.
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
  from ESPN on load or on a timer; a parlay card opening reads its own games as a press would (19 October 2026).
- **A routine rebuild is silent.** The job publishes several times a week. Only a model or
  roster change is worth a banner.
- **Every page says which build it is.** `buildTag` on the Bets and Stats header: `APP_BUILD`
  (the prop model's parts) and the page's own hash (`PAGE_HASH`, the first seven hex of its
  SHA-256), so any source change -- the Matchups tab, the X Parlays section, the parlay card, the storage layer,
  the X Bet Log, the betting app, the look and its switch -- shows as a new tag. Without it a stale copy cannot be told from a current one.
- **A frame's content is in the page.** The betting tabs are srcdoc frames filled from a
  string inside the page, the root's `index.html`, so nothing is fetched or cached for them apart from
  the page itself: a refresh of the page is a refresh of the frames. No frame is filled by address
  any more (the Season Tracker tab, which framed `news/index.html`, went on 14 October 2026); the
  Game snapshot fetches the news job's files itself, `news/data/units.json` and
  the week's notes, named from the site's root, `cache: 'no-store'`, at runtime as the page loads (a week's notes when the board or a window
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
    `staked`, `returned` and an optional plain-text `note`, kept in the file and shown nowhere since the owner's call of 20
    October 2026, when the table's Note column went), plus `updated`. Claude adds or changes
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
  alone, never X's data and never sent anywhere, and so is their light or dark look (`nflhub_theme_v1`, `light` or
  `dark`, written by `theme.js` alone, never in `S`, under "The light look"). What a browser saved before (the prop model's saved
  list, `my_parlays_v1`, the betting app's own Bet Log and `x_nfl_bets_preshare_<season>`) stays in
  its storage, undrawn and never deleted. Anything held per-session and not meant to persist
  (for example the game pages' suggested parlays, cached in `GAME_TIER_CACHE` in `part3.js`, and Suggested Parlays'
  sets and the Top 30 lines, in `SP_CACHE` and `PB_TOP_CACHE`) is kept outside the saved state object `S`, so
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
