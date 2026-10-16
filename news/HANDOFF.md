# The news job and the game notes: handoff brief

All paths here are relative to `news/`.

## What this is now

Until 14 October 2026 this folder was the Season Tracker, a page of its own (and then a framed tab of X
NFL Bets and Stats) with a hand-written narrative for every team each week. The owner folded it into the
**Game snapshot**: tapping a game on X NFL Bets and Stats' Matchups board
(**https://demon-x13.github.io/nfl-hub/nflbets/**) opens a window with everything the site has on it, and
the tracker's per-game content now lives there:

- a one-line **preview** and a short **news** note for each game, written by hand each Wednesday into
  `data/notes/<season>-w<N>.json`, every player named in bold (`**Bo Nix**`); the snapshot shows the
  preview alone (the owner's call, 14 October 2026: the news and its sources stay in the file, unshown, and
  are still written); until a game has one, the snapshot shows an automatic line;
- the **Deep Dive** (the four position matchups each way, a compact row each: the unit, the two clubs and
  their Elo from `../elo/data` (the quarterback's own against the Overall Defense, Pass Protection against
  Pass Rush, Run Offense against Run Defense, Pass Offense against Pass Defense, each Elo with its tier's
  shield; the owner's calls of 16 October 2026), the rank from this file only where there is no Elo, the
  defense's position it faces (Overall defense, Pass rush, Run defense, Coverage) and the tag, this file's
  own, the quarterback's still on the pass defense; who plays and who is out stay in the file, unshown since
  14 October 2026) inside its Offense vs defense card, from `data/units.json`, drawn by
  `../nflbets/build/deepdive.js`.

The **Stat breakdown** (the eleven stat bars from `data/stats.json`) went on 16 October 2026 (the owner's
call, "get rid of stat breakdown section"): the job still writes `stats2026.js` and `stats.json` and the
smoke still holds them, but no page reads them. The page reads the notes and `units.json` at runtime
(`cache: 'no-store'`), so nothing here ever needs NFL Hub rebuilt. The tracker's page, its week files, the matchup, positives, negatives and keys paragraphs, the
rank chip and the player positions were dropped; they are in git history before that day. `index.html` is
now a tiny page that sends a visitor (and any old bookmark) to `../nflbets/`.

The **news job** (`.github/workflows/news.yml`) keeps running: it produces the Deep Dive and the stats and
holds them to their sources.

## Read this first: which week to write

**N is the first regular season week in the nflverse schedule that still has an unplayed game.**
`node tools/run-auto.js` prints it as `current week N`; the week of `data/units.json` is the same week.

- Write the notes for week N, never N+1 while week N still has games to play.
- If `data/notes/<season>-wN.json` already has every game of the week, stop and report that: there is
  nothing to write. Rewrite a note only when its news has changed (a quarterback ruled out, a trade).
- After week 18 there is no week to write: the job does not cover the playoffs (`run-auto.js` says the
  regular season is complete). Covering them would be an owner decision.

## The weekly job: the Wednesday notes

Each Wednesday (a Claude Code routine runs it; also whenever the owner asks), from `news/`:

1. `git pull`, `npm ci`, and read `tools/out/weekN-pack.md`: the games, ESPN's injury report and each team's
   headlines, dated, which the job commits on every run. Prefer the committed pack: the routine's sandbox
   reaches less of the web than GitHub's runners (below), so a pack it pulls itself can be thinner. Then
   read the panel in `tools/sources.md` for each game.
2. Write `data/notes/<season>-wN.json`, the format and rules in `tools/week-request.md`: for each game a
   one-sentence `preview` (the game's story: form, a key player, a storyline), a short `news` note (the one
   or two things a fan should know this week: a starter out or back, a quarterback change, a trade, a
   coaching change; `""` when nothing is notable) and the `sources` it came from. Every fact is in the pack
   or a source read this week, two sources for anything not on an injury report.
3. `node tools/notes.js --strict` must end `all notes pass (strict)`, and `node tools/smoke.js` must end
   `all checks passed`.
4. Work on a branch, commit, push, open the PR and merge it, as `CLAUDE.md` says.

The rules `tools/notes.js` holds a file to, in short: no betting language at all (no spread, in words or as
a number like -3.5, -3½ or "Indianapolis -7"; no favourite, underdog, moneyline, odds, total, line, cover,
price or book: the snapshot shows the market apart); no record or score typed in the preview (the records
are shown beside it, and a typed one goes stale); none of the site's own ranks (the Deep Dive beside the
note moves with every run; `siteRankQuote()` in `tools/lib.js` lists the phrases); no em dashes or double
dashes; plain text, no markup, but for every player named in bold, `**Pat Surtain II**` (players only,
never a coach, an owner or a team, and a name straight after a role such as "owner" or "coach" stays
plain; the lengths count the text without the markers). Shape and game ids are
failures; the wording rules are warnings, so the job never holds back the week's data over a note, but the
routine runs `--strict`, which refuses both.

## Files

| File | What it holds |
|---|---|
| `data/units2026.js` | `const UNITS26`, the Deep Dive: six units per team (passing offense, pass protection, run game, receivers, pass rush, coverage), each a rating in league standard deviations with its rank, the numbers behind it, who plays and who is out, from nflverse team and player stats with 2025 counted as 4 games plus the team's own 2026 games (`g26`), and each team's Overall Offense and Defense from `../elo/data/model.json`. `UNITS26_META` says which week, season and report the lineups are for and carries the tag constants; `UNITS26_BASIS` and `UNITS26_LINEUPS` the lines under the rows. Written by `tools/context.js`, which says how. |
| `data/units.json` | Its twin, what the Game snapshot fetches: `{ season, week, built_at, meta, basis, lineups, units }`, exactly the consts of `units2026.js` (`writeTwin` in `tools/lib.js`), written with it and whenever it is missing or differs. |
| `data/stats2026.js` | `const STATS26`, season to date team stats for the stat bars (TeamRankings and ESPN), each team with `g`, the games its numbers cover (verified against `results.js`), `STATS26_THROUGH` the last game day included and `STATS26_ASOF` the pull's day. After week 18 the tables are asked for as of the day after the last regular-season game. Written by `tools/pull-week.js`. |
| `data/stats.json` | Its twin: `{ season, through, asof, stats }`, exactly the consts of `stats2026.js`. Read by no page since the snapshot's Stat breakdown went (16 October 2026). |
| `data/results.js` | `const RESULTS`, final scores keyed `wk<n>:AWAY-HOME`, which the smoke test holds each stat line to; `LINES` beside it is each game's line from the nflverse schedule, kept for reference (no page reads it). |
| `data/teams.js` | `const TEAMS`, the 32 teams' names and colours. `../picks/` reads it, so it stays. |
| `data/notes/<season>-w<N>.json` | The game notes, written by hand (above). Never written by the job. |
| `tools/run-auto.js` | Works out the current week and runs the pull for it; what the job runs. |
| `tools/pull-week.js` | Results, stats and their twin, the reading pack (`tools/out/weekN-pack.md`), then `context.js`. Exits non-zero when the Deep Dive cannot build. |
| `tools/context.js` | The Deep Dive: `units2026.js` and `units.json`, each week's lineups as kickoff found them (`tools/out/weekN-lineups.json`) and last week's graded against the snap counts (`tools/out/weekN-lineups-grade.md`). Every nflverse file but the snap counts is required: one that does not download (after `../lib/netfetch.js`'s tries) means nothing is written and the run fails, so the last good files stay live. |
| `tools/lineup-checks.js` | The lineup rules stated on the source data (nobody listed whom the report or ESPN rules out, a quarterback in doubt has the next one named, the announced starter starts ...), which the smoke test runs. It shares the build's reading of a source, never a rule. |
| `tools/deepdive-checks.js` | The tags stated on their own: each row's tag is its weighted edge, the Overall line's tag the gap read as points, the constants this file's own copy; `checkPossession` holds what `deepdive.js` draws to them, `checkHead` its Overall tag. |
| `tools/notes.js` | The notes validator: `node tools/notes.js [--strict] [file...]`. |
| `tools/cases.js` | Fixed cases the rules and their checks must keep, each from a week the real files produced, with the broken version a review caught fed to the checks, which must fail it. `node tools/cases.js` runs them alone. |
| `tools/lib.js` | `SEASON` (the one place the year is set), the CSV reader, the patient fetch, `seasonState()`, `siteRankQuote()` and the twins. |
| `tools/sources.md` | The source map, the fixed reading panel and the consensus rule. |
| `tools/week-request.md` | The notes file's format and its rules, with an example. |

## The job

`.github/workflows/news.yml` runs about nineteen times a week and on a push to the tools, the notes, the
address page or `../nflbets/build/deepdive.js`: five post-game runs and a mid-day refresh Monday, Tuesday
and Friday for the results and stats, and eleven for the Deep Dive's lineups, timed to the injury report
(nflverse files a day's report about 14:30 UTC the next morning; ESPN shows the game statuses the evening
they are filed). **GitHub starts this repo's scheduled runs 2.3 to 9.4 hours late**, and now and then not at
all, so each slot that must land before a kickoff is early enough to make it 9.4 hours late, and has a twin;
the cron comments say which kickoff each is for. A run in which a required nflverse file does not download
fails before its commit. A run that finds nothing new commits nothing beyond the day's "as of" dates:
`units2026.js` is rewritten only when the Deep Dive changed (its `built_at` says when it last did).

**The routine runs in a sandbox with a narrower network than Actions.** Learned on 15 September 2026: from
the routine's container the ESPN feeds, TeamRankings and direct reads of nfl.com, espn.com, cbssports.com
and si.com were blocked, while web search still worked. GitHub's runners are not affected, so the pack and
the stats keep arriving on schedule. If a pull in the sandbox reports feeds unavailable, write from the pack
the job committed (`git restore tools/out/weekN-pack.md`) and never commit a thinner pack or stats file.

## Verifying a change

```bash
npm ci
node tools/smoke.js        # must end "all checks passed"; WARN lines above it publish
```

There is no page to render: the smoke test holds the files the job writes to their sources and to what the
Game snapshot draws from them. Blocking: the twins are exactly their `.js` consts; each team's stat line is
its own game count in `results.js`; the tag constants are their values and every club's Overall ratings are
`../elo/data/model.json`'s; every game of the units' week, drawn both ways by `deepdive.js`, has its four
rows in order with each tag the weighted edge worked out on its own, each figure the Elo the Elo files have for
it (`eloWant`, the checks' own reading of `../elo/data`: the quarterback's against the Overall Defense; the
rank only where there is none; each Elo with the shield `eloSides` was handed, a stand-in here), the higher marked,
and the edges the file's, each row its unit, the two clubs and figures, the defense's position and its tag alone
(no name, no one out, no other number: the owner's calls of 14 and 16 October 2026; the smoke prints, without
checking, how often the higher Elo and the tag point opposite ways, since the tag is the Deep Dive's own), and
its Overall line's tag the rule's on `model.json`'s units; the lineups are for the schedule's week (and, in
the job, checked on that run's own download); `index.html` sends a visitor to `../nflbets/`; every fixed
case in `tools/cases.js`. Warnings (WARN, the job publishes and goes red after its commit): the other
lineup rules, a quarterback in doubt with the next one named in the file, nobody both listed and out, and every problem in a notes file, its shape included, so a bad note never holds back the
week's data. The lineup checks read the build's own snapshot (`tools/.cache/`, not committed) when it
matches `units2026.js`, else download the files: **run `node tools/context.js` first when the committed
`units2026.js` is older than the report**. Offline with no snapshot, `NEWS_SMOKE_OFFLINE=1` skips them.

## The Deep Dive's lineups

The names in each row are the coming game's lineup: the latest depth chart before kickoff, passing over
anyone off the roster, ruled Out or Doubtful (or Questionable without practising) once the team files its
game statuses, out per ESPN before then, or out in the team's last game and not practising since; a
Questionable or not-practising player stays listed with the tag, and a quarterback in doubt has the next one
named beside him. A team has filed only when its rows on the week's report carry a game status: a practice
report never counts (for a Thursday game, counting Tuesday's would have listed Mayfield and Winfield on the
Wednesday before TB at DAL). ESPN's mid-week "Questionable" clears no one; ESPN's notes are dated by the
practice's weekday, never the game's; and a quarterback ESPN's current notes name plainly as this week's
starter starts when the rules let him play (added 10 October 2026, when the Deep Dive listed Caleb Williams
while ESPN's notes said Ben Johnson had named Tyson Bagent the Week 5 starter): `announcedStarter()` in
`tools/context.js` says which notes count and which hedges refuse one, and `tools/cases.js` holds it.

## A new season

The year is set once, `SEASON` in `tools/lib.js`. When nflverse posts the next season's schedule (about
May), `run-auto.js` says so on every run and keeps working on the current season. To move on: set
`SEASON`, rename `stats2026.js` and `units2026.js` and their constants in `tools/` (`lib.js`'s
`UNITS_CONSTS` and `STATS_CONSTS`, `context.js`, `pull-week.js`, `smoke.js`, `cases.js`), run
`node tools/context.js` and the smoke test; the twins keep their names, and the notes carry the season in
theirs. Until the season's first game nflverse has no current-season stats, snap counts or injury report,
and `context.js` reads their 404 as "no games yet". That is a deliberate setup, not something the job does
on its own.

## Hard constraints

- No em dashes and no double dashes anywhere: notes, commit messages, chat.
- The notes are plain text but for a player's name in bold, `**Bo Nix**` (players only); the page escapes
  them, then draws each pair bold. No betting language, no typed records in a preview, no site ranks.
- Never edit a generated file by hand: `units2026.js`, `units.json`, `stats2026.js`, `stats.json`,
  `results.js` and `tools/out/` are the job's.

## Backlog

- The Wednesday routine that wrote the old week files ("NFL tracker: build and publish the week", id
  `trig_017MSjEeFD8c5atgAEzBbWiF`, possibly under another account) must not run any more: its prompt
  builds `data/weekN.js`, which nothing reads. The notes routine replaces it; its prompt is "The weekly
  job" above.
