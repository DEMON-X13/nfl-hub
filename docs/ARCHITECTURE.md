# The map

Deeper reference than `CLAUDE.md`. Read that first for the build loops and the
working agreement; read this when you need to find something or need the
vocabulary. It is a map, not a copy of the code -- the code is the truth, and
anything here that contradicts it is out of date.

## What this is

One repo, served straight from its root by GitHub Pages. No server, no framework, no
bundler. The site's root is NFL Hub (once X NFL Bets and Stats): the root's `index.html`, built by
`nflbets/build/build.js` from the prop model's parts, the betting app, the X Parlays
section, the parlay card, the storage layer, the look and its light/dark switch, the Player Elo tab and the Game
snapshot (the owner's call of 17 October 2026, "can you make https://demon-x13.github.io/nfl-hub/nflbets/ be
https://demon-x13.github.io/nfl-hub/ and get rid of that page": until then the page was `nflbets/index.html` and the
root a static landing page linking it, Weekly Picks and the other hubs). `nflbets/` keeps the page's source,
`build/`, and its `index.html` is a hand-written redirect to the root for old bookmarks. The one other page is the
standalone Weekly Picks page, `picks/` (hand-written; it reads
`betting/state.json` and keeps a visitor's picks in that browser; its NFL Hub link, `../`, is the page now). `news/` is no longer
a page: the Season Tracker went into each game's Game snapshot on 14 October 2026 (the
owner's call), and `news/` holds the news job that writes what the snapshot reads, and the
week's game notes, written by hand; its `index.html` only sends a visitor to the root, `../`.
The pages carry no season data: each fetches what the scheduled jobs commit (named from the root, where the page is: `props/data/payload.json`,
`betting/state.json`, `elo/data/*.json`, and the news job's `news/data/units.json`
and the week's notes, which the Game snapshot fetches as the page loads, and `news/data/stats.json`, which a
game page's Team Stats window fetches the first time it opens, app v124)
and what Claude commits from what the owner sends (`liveparlays/parlays.json`,
`liveparlays/xbets.json`, `picks/friends.json`) on every load (the two X files on the site owner's devices alone since
20 October 2026: the admin link, below). The props job reads ESPN's free feed of DraftKings' lines on every run and
publishes the read inside the payload (app v125, "the published read"); beyond that, a page reads ESPN itself only when a
visitor presses Refresh odds or opens a parlay card (app v107, below), held in that page's memory and (app v108) in that
browser's own storage until a newer publish or its game's kickoff sets it aside, never sent anywhere; and the site
owner's browser alone asks The Odds API, with his own key, for the key's free check and for Pull from DraftKings on his
parlay card. Five scheduled GitHub Actions jobs, one per model
or site, rebuild the data from their sources and commit it; none of them buys anything.

X NHL Bets and CFB Hub are in their own repos. `nflbets/index.html` (beside the page's source, `nflbets/build/`),
`pickems/` and `live/` are redirects to the root for old bookmarks (`nflbets/` with its own tab and query, `pickems/`
with its hash, `live/` to `#xparlays`), and
`liveparlays/` holds one too (to `#xparlays`), beside the X Parlays section's source and `parlays.json`.

```
index.html NFL Hub                   the site's root, the one NFL site: both models, the Props tab first, Player Elo
nflbets/   NFL Hub's source          build/ (build.js writes the root's index.html); index.html a redirect to the root
props/     Prop Model                no page: the parts, build, job and payload.json
betting/   X NFL Betting Model       no page: the app source, tools, job and state.json; framed into the page
elo/       Player Elo                no page: build.py, job and data/
news/      the news job              no page: the Deep Dive and the game notes the Game snapshot reads, and the stat bars
cfb/       a redirect to DEMON-X13/cfb-hub, where CFB Hub lives now
picks/     Weekly Picks              a standalone page: pick each game of the current week, save the picks as a file;
                                     friends.json, the friends' picks the Pick'em Record draws (kept by tools/add.js)
nhl/       a redirect to DEMON-X13/nhl-hub, where X NHL Bets lives now
```

Picks, bankroll, bets, odds and parlays a visitor makes stay in that browser's local
storage, and so does the visitor's choice of which of X's parlays to stop seeing on that device
(the X on each card in X Parlays) and of the light or dark look (`nflhub_theme_v1`); on the site owner's own devices the
admin link's record of his Odds API key (`nflhub_admin_v1`). X's parlays and the X Bet Log are files in the repository (`liveparlays/parlays.json`,
`liveparlays/xbets.json`), read only, shown on the site owner's devices alone ("hide only": public by address all the same;
below). Nothing on any page writes anywhere
but the visitor's own browser; everything else changes only with a commit. The one thing that leaves a browser is the
admin's key, from his own, to The Odds API.

## Repo layout

```
CLAUDE.md               build loops, conventions, how the owner works
docs/ARCHITECTURE.md    this file
index.html              NFL Hub, the page (generated by nflbets/build/build.js; the hand-written
                        landing page until 17 October 2026)
lib/netfetch.py, .js    the download rule every NFL job shares (retries on a 5xx, 429, timeout or
                        reset; a 404 at once; written whole), with test_netfetch.py and .js

betting/
  app/x_nfl_betting_model.html   THE SOURCE. one file, ~300KB, copied in from
                                 the nfl-model-lab repo when a version ships
  state.json                     generated by tools/update.js (and the Joker's picks by
                                 joker/joker.py) -- the season
  events.json                    hand-written: team news the job cannot infer
  neutral_sites.json             hand-written: games nflverse codes 'Home' that are played abroad
                                 (by game id, or by a non-US stadium), read as neutral everywhere here
  jobkit.py                      what joker.py runs on: the season (state.json's), kickoff
                                 times, the freeze at kickoff, grading, and modelStatus when a model
                                 cannot run
  joker/                         the Joker: python, fitted model, the vendored rating/QB pieces of the harness
  broly/                         the Broly Model, retired 13 October 2026 (off the site, out of the
                                 job): stats.py (its inputs) and fit.py stay for research/
                                 models_compare/backtest.py; broly.py (it refuses to run),
                                 model.json and prior_2025.json are the record of what ran
  tools/update.js                download + grade + write state.json; refuses (exit 1, nothing
                                 written) when a file the season needs did not download
  tools/patches.js               behaviour patches to the app, applied as it is loaded (never to the
                                 file), by update.js and build.js alike: who starts at quarterback,
                                 the absences card, neutral sites, the call frozen at kickoff, the
                                 season's phase, no Challenger (its ratings never made); also the
                                 one place the season is read (freshState)
  tools/build.js                 the app, built: buildApp() for nflbets/build/build.js;
                                 run on its own it checks and writes nothing
  tools/ratings_viz.js, record_viz.js, bets_viz.js
                                 Power Ratings, the Pick'em Record's chart and table, and the
                                 X Bet Log, drawn over the app's own (built in by tools/build.js;
                                 bets_viz.js draws X's log read only inside the page)
  tools/tiers.js                 the Elo tiers reshaped at build time (Wood under 1350 up to
                                 Elite, HOF from 1750)
  tools/smoke.js                 loads the built app, plain and embedded, and checks it; then
                                 checks the published state against what it was built from
  tools/reference_models.json    the release gate's expected model numbers

props/
  build/part1.html               THE SOURCE: <head>, all CSS, page skeleton
  build/part2.js                 THE SOURCE: state, model maths, odds, parlay maths
  build/part3.js                 THE SOURCE: rendering, wiring, the parlay engines
  build/assemble.py              part1 + part2 + part3 -> the audit's page (payload.json
                                 only checked: the app fetches it at boot)
  build/audit.js                 ~28k checks. THE COMMIT GATE: failures and runtime
                                 errors refuse the publish, warnings (W.<kind>, each
                                 kind's reason in WARN) publish and redden the run
  build/payload.py               rebuilds data/payload.json (weekly.py runs it)
  build/test_audit_gate.py       weekly.py's reading of the audit's summary line, on cases,
                                 warnings among them, and its tail (audit_step, finish,
                                 props.yml's last step) on a planted warning and failure
  build/test_audit_phases.py     the audit (and the page smoke) replayed on past payloads at
                                 their own moment (PROPS_AUDIT_NOW, SMOKE_NOW), each beside
                                 its own commit's props/data; the props gate's job B
  build/clock_now.js             PROPS_AUDIT_NOW / SMOKE_NOW: one offset on Node's Date and
                                 every jsdom window's
  build/refused_note.py          the props-refused issue's text: why, the published payload's
                                 bake and ESPN read, the next game with its kickoff, the run,
                                 what to do (merge a fix, `gh workflow run props.yml`; nothing
                                 is held since no run buys a price) (props.yml posts it)
  build/test_lock_runs.py        props.yml's crons held to every Suggested Parlays lock of the
                                 season (20 October 2026, replacing test_pull_schedule.py, gone
                                 with the paid pull): a run sure to land before each lock at
                                 9.4 hours late, reading no more than 12 hours before it (24
                                 with that run dropped), no cron on the hour; offline
  build/weekly.py                the whole refresh: download, bake, assemble, read DraftKings'
                                 lines on ESPN (espn_read.js), apply the read (apply_espn:
                                 PAY.espn and the schedule's lines, lsr 'espn'), audit, then
                                 the suggestions record (props.yml commits); buys no price
                                 since 20 October 2026 (--no-odds, --catch-up, --hours and
                                 --local accepted, doing nothing); exits 1, publishing nothing,
                                 when a required download fails, the read cannot be applied or
                                 the audit is not clean (warnings, a stale or failed read
                                 alone publish, listed as problems); at a rollover moves last
                                 season's price files to data/archive/<season>/
  build/espn_read.js             the job's read of ESPN (step 4): boots the assembled page in
                                 jsdom on the payload just baked and calls its espnReadWeek on
                                 the week's games to come, every request through
                                 lib/netfetch.js under a 150 s deadline, each answer recorded
                                 in raw/espn/ (--offline, PROPS_ESPN_REPLAY replay them) ->
                                 raw/espn/read.json (with who each player is and how placed)
  build/test_espn_read.js        its test: a replay of fixtures/espn/, a 404 as none, a 403
                                 tried again with no headers, the deadline, the recording keys,
                                 a page with no reader skipped, no host but ESPN's
  build/test_apply_espn.py       weekly.py's apply_espn on its cases (the carry, ok and none, a
                                 half at kickoff, the rollover, the 24-hour rule, a by-hand line
                                 newer, the set and drop rule, the cleaning, the overdue rule,
                                 nothing in mkt, prices or dk) and the real page installing it
  build/suggest_ledger.js        the suggestions record: each prime-time game's four
                                 Suggested Parlays levels, shown on the tab or not
                                 (spGames, not the night rule), taken from the published page
                                 (the root's index.html in jsdom, nflbets/index.html until
                                 17 October 2026) on the payload just baked,
                                 rewritten until the set locks 2 hours before kickoff,
                                 a level built again after the lock only for a player
                                 ruled out since, graded by settleLeg (a player with no
                                 stat line by the payload's snaps: played, zero; not,
                                 void) -> data/suggest_ledger.json's prime, each game's
                                 level counted once; the retired all-games panel's
                                 entries kept, frozen and graded; its guard refuses a
                                 ledger whose frozen or locked entries moved; since app
                                 v118 each set's Elo picks (elo) too, and the Sunday
                                 slot's sets in its slot map; since app v125 the sets
                                 stand on the payload's ESPN read (graded at estimated
                                 prices from week 7), and it refuses a page that drops
                                 that read or asks ESPN's player lines on load
  build/test_suggest_ledger.js   its test: made-up weeks cut from the payload, the
                                 rewrite, the lock, a run hours late, the ruled-out
                                 level, a book's settlement, the guard, the Sunday slot
                                 and the Elo picks, and since app v127 no ladder bet in
                                 any set it takes (offeredOwn) (about a minute)
  build/suggest_backtest.js      by hand, never by a job: the record's weeks before it
                                 took them (from week 3), each night game and Sunday slot
                                 rebuilt by today's page on the files of the last commit
                                 before its lock, graded -> data/suggest_backtest.json;
                                 --check holds the file to the record's guard
  build/season.py                the season, read from SEASON in part2.js (the one place it
                                 is set), and the raw files named after it
  build/names.py                 a book's player name onto a player id, within the line's
                                 own game (mktbuild.py and the price rows use it), in
                                 tiers: a printed name, then his legal first name with
                                 his surname, then a short first name or a nickname
                                 (build/nicknames.json, read by audit.js too) or a
                                 two-word name swapped (these looser tiers only among
                                 players at a position the book prices); two in a tier
                                 are ambiguous unless only one plays such a position
  build/test_unmatched.py        the name rule and when unplaced price rows turn a run red
  build/test_who_played.py       who took part (who_played in weekly.py): snap rows placed
                                 by PFR id or name, the payload's snaps and rows of zeros,
                                 the carry and the overdue rule, weekly.bake end to end
  data/mktbuild.py               every week's wk{W}_lines.csv onto the players (weekly.py
                                 runs it for every week on every run)
  data/oddsfetch.py              the price pull (the-odds-api), by hand only since 20 October
                                 2026 (no job runs it, nor credits.py): choose() picks the games;
                                 priced_at.json is when each game was last priced;
                                 dk_links_wk{W}.json is DraftKings' own id for every
                                 outcome it read, which the bake turns into the payload's dk;
                                 MARKETS and TEAMS are the parlay card's reference for Pull
                                 from DraftKings (build.js holds the card's club names to TEAMS)
  build/test_dk_links.py         the payload's dk against the real week-5 file and its cases
  build/test_espn_ids.py         the payload's espn_ids (weekly.py espn_ids): every player the
                                 page can project, by the roster's espn_id, and bake() itself
                                 carrying nothing of ESPN's (apply_espn adds the read)
  build/patch_espn_prices.py     app v107: Refresh odds, the browser's on-demand read of
                                 DraftKings' lines from ESPN, the best-guess price and its
                                 precedence (its docstring is the design)
  build/patch_press_keep.py      app v108: a Refresh odds read kept in the browser across a
                                 reload until its game kicks off or the job publishes newer
                                 prices for it (its docstring is the design)
  build/patch_dk_slip.py         app v109: a suggestion takes only legs with DraftKings' id at
                                 their own line (dkIdOf, dkCarries), and the builder says
                                 under each leg what DraftKings' slip will take of it
  build/patch_suggest_tab.py     app v111: the Suggest Parlays tab, Suggested Parlays since
                                 app v112 (each Thursday, Sunday and Monday night game's own
                                 four levels, locked 2 hours before kickoff, the record at
                                 the top, the Elo picks at the foot) and the Parlay
                                 Builder's Top 100 lines (the Top 50 from app v113, the Top
                                 30 since app v116); the
                                 all-games levels and their locks gone (its docstring is the
                                 design)
  build/patch_suggested_night.py app v112: the tab renamed Suggested Parlays and shown one
                                 night at a time (spNight, spOn: the next prime-time night,
                                 from 6:00 AM Eastern the morning after the night before
                                 it), the Value tag in place of thin edge and no edge
                                 (pbIsValue, pbValMark), and the Top 100 lines in two
                                 parts, Value picks then Other lines, the totals last of
                                 those and each bet once (a ladder rung left out where it
                                 is the same bet as a half-point main Over) (its docstring
                                 is the design)
  build/patch_declutter_top50.py app v113: Suggested Parlays without the long paragraphs (no
                                 lead, foot or record sentence, a set's cards quiet,
                                 pbTierCard's o.quiet, one short lock line and Updated line,
                                 the Elo picks' lead one sentence), the Parlay Builder's Top
                                 50 lines (PB_TOP_N 50, 30 since app v116), and FG
                                 attempts in NO_BET with targets, DraftKings posting
                                 neither (a builder leg kept from before removed with a
                                 line, toggleLeg adding none) (its docstring is the design)
  build/patch_glance.py          app v114: glanceName, a leg's name on the Top lines, the
                                 builder, a set's level cards and the Elo picks' cards drawn
                                 as the matchup bubble's button (button.glance-name, data-glance,
                                 data-glance-game, data-glance-leg) where window.hubGlance is
                                 on the page, plain text on the prop model's own page;
                                 GLANCE_LEGS, window.glanceLeg
  build/patch_top50_moved.py     app v115: the Top lines alone keep a player's line read by
                                 Refresh odds on a tested kind with no DraftKings id at its
                                 own number (pbLegs' read option; getPbTop's kept), each with
                                 one quiet line under its game (pbTopSlip, data-pb-slip:
                                 moved or none, and what the parlay card's dkPlan puts on the
                                 slip); every level, set, hand and Elo pick still takes only
                                 a leg with an id (its docstring is the design)
  build/patch_top30_first.py     app v116: the Top 30 lines (PB_TOP_N 30), and the builder
                                 (#parlayBody) first on the Parlay Builder tab, over the
                                 choices and the list (#pbPanel); pbLegClick keeps a pressed
                                 Add where it was on the screen (its docstring is the design)
  build/patch_ladder_anchor.py   app v117: after a press, a count's rung that is the main Over
                                 is priced at the paid pull's own Over on the read's line, the
                                 anchor its other rungs stand on, so a ladder never climbs
  build/patch_slots.py           app v118: Suggested Parlays in two sections, Night games and
                                 the Sunday slot (spSlotUnit, every Sunday game before 7 pm
                                 Eastern, one set), each with its record (the model's row and
                                 the Elo picks', the backtest counted where the record has no
                                 entry), and each set's own Elo picks (window.eloUnit),
                                 locked, kept and recorded with it (its docstring is the design)
  build/patch_game_windows.py    app v124: a game's page without its Suggested parlays card (the
                                 hands' engine kept, drawn nowhere); Matchup, Mismatches and
                                 Team Stats buttons in its place, each opening one card of the
                                 Game snapshot alone (window.gameWindow, the hub's only)
  build/patch_espn_only.py       app v125: DraftKings' lines read from ESPN for every visitor,
                                 published by the props job (espnReadWeek split out of
                                 espnRefresh; espnPublished; espnWasRead, espnLastRead,
                                 espnPressed; the id rule by an entry's content, dkEntryCarries,
                                 which fixed a press over dk:{} dropping every player leg; no
                                 paid-pull timing in any word; a locked leg's kept price and fair
                                 chance; the pull hooks for the parlay card) (its docstring is the
                                 design)
  build/patch_tab_leave.py       app v126: leaving the Props tab closes the game's page (tabLeft,
                                 from the tab switch), a focus left on what it hid going to the
                                 chosen tab's button; Escape only on a game's page on the screen
                                 (gameShown)
  build/patch_no_ladders.py      app v127: no ladder bet anywhere, only main lines, anytime
                                 touchdowns and team bets (isLadder in part2.js; pricedLegs and
                                 gameLegPool make no rung; a game's page draws no Threshold
                                 ladders box, rung row or 2+ touchdowns row, and "No DraftKings
                                 line yet." for a stat with no main line; toggleLeg refuses one;
                                 pbDropLadders takes one kept from before out at boot and on an
                                 import, said in one line, data-pb-noladder, but a locked set's
                                 kept leg) (its docstring is the design)
  build/espn_rule.js             the checks' own working of a price from a read and of ESPN's
                                 answers (audit M8, the nflbets smoke)
  build/fixtures/espn/           ESPN's recorded answers for week 6 of 2026 (the scoreboard, two
                                 games' player lines, athletes, the roster's ESPN ids): the
                                 audit's fetch stub serves them, so M8 never touches the network
  build/patch_*.py               one committed script per past change, each with a
                                 prose docstring saying why
  data/payload.json              generated. everything the page fetches at boot, the job's
                                 ESPN read (espn) among it
  data/suggest_ledger.json       generated by suggest_ledger.js, never by hand: prime,
                                 each prime-time game's set as the job locked it and its
                                 grade, read by Suggested Parlays (its locked sets and its
                                 record); entries, the all-games panel's from 12 to 16
                                 October 2026, frozen, graded and drawn nowhere; slot
                                 (app v118), each Sunday slot's set; each set's elo
  data/suggest_backtest.json     written by suggest_backtest.js by hand, never edited: the
                                 record's prime and slot maps for weeks 3 to 6, each entry
                                 src backtest with the commit it was rebuilt from; the
                                 page counts a level from it where the record has none
  data/*.csv, *.json             prices, lines, fitted model pieces (scale.json and
                                 tdrate.json are carried into the payload); the week files
                                 are this season's, last season's are in data/archive/
  app/prop_model_2026.html       generated by assemble.py, gitignored: the audit's
                                 subject, never published
  raw/espn/                      gitignored: espn_read.js's read.json and every ESPN answer it
                                 recorded, replayed by --offline and the props gate's base run;
                                 never committed (the read is in the payload)
  raw/feat.pkl                   43MB fitted feature table (seasons FIRST..BASE), committed so
                                 the job does not rebuild it, except on a new season's first
                                 run, which adds the season just finished and commits it
  research/features.py           builds raw/feat.pkl, seasons from build/season.py (weekly.py
                                 runs it when the table lacks BASE); the only research script
                                 the job runs
  research/totals/               the game-totals study (README.md: the question, the rules,
                                 every result and the verdict the page follows since v88: a
                                 total at the market's own chance). Its downloader, dataset
                                 builder, harness, four frozen candidates, leakage checks and
                                 the judge's scripts; data/ and out/ are gitignored, nothing
                                 the site reads
  research/totals/shadow.py      the shadow (README.md, "The shadow"): the frozen ratings
                                 candidate's call on each game to come from games.csv alone,
                                 frozen at kickoff, graded after the final, against a bar set
                                 before its first call; the betting job runs it and
                                 shadow_check.py (each may fail alone) and commits
                                 shadow/ledger.json, which no page reads. shadow_equiv.py
                                 proves it is the harness's candidate; test_shadow.py its test

elo/
  build.py                       THE SOURCE: the player Elo formula and the roster model,
                                 and Overall Offense and Overall Defense (an Elo on nine key
                                 stats from the season's play-by-play, weighted, each club
                                 starting the season at 0.42 of its final rating the season
                                 before, THE CARRY), and Run Defense, Pass Defense and Pass
                                 Rush and their offense sides, Run Offense, Pass Offense and
                                 Pass Protection (the same Elo on two stats each, 16 October
                                 2026),
                                 explained in its docstring; downloads
                                 2012-now nflverse player stats and the play-by-play of the
                                 season and the two before it into cache/ (gitignored) and writes
                                 data/; exits 1 and writes nothing when a required source
                                 cannot be had
  check.py                       the gate: data/ against the roster, the injury report, the
                                 schedule, the play-by-play (every team's stats and ratings
                                 replayed from it, last season replayed too for the carry, with
                                 the gate's own copy of the share) and what was published (the last commit's
                                 data/ and history/: the top ten carried, frozen calls kept),
                                 Team Rankings (`teams`) solved again from games.csv by its
                                 own iteration, plus the build's functions on fixtures; the job runs it
                                 before committing
  check_tab.js                   the ELO Ratings tab (nflbets/build/tab_elo.html) in jsdom on
                                 data/: kicked-off games leave the Mismatches, shields agree,
                                 every ranked row has a trend line (week 1 too), a player kept
                                 out is priced by nothing but keeps his past weeks' ratings;
                                 Overall Offense and Overall Defense with the file's position
                                 tables, an Offense row and a Defense row (Run, Pass and Pass
                                 Protection or Pass Rush a side, each paired with its other
                                 side and with its own walk-forward note, the pair's and its
                                 own alone; a file with the defense tables and no pair draws
                                 them as before, one without any draws two pills): the 32
                                 teams, every value and rank the file's, the weights read from
                                 the file, the sort, the team window, each club's line from its
                                 own start, a club yet to play shown on its carried rating and
                                 marked so, an old file's fallback (before the stats; before the
                                 carry);
                                 the table scrolls in its own box at a desktop width with the
                                 page's stylesheet round it, the team column free to stick;
                                 and the money the files feed: market + form on every rated
                                 player, the Elo matchup chance on every matchup line, the Elo
                                 picks' four levels at the builder's own sums (parlayProb,
                                 parlayDec, PB_TIERS, pbOrder loaded from the props parts),
                                 each its floor's rule, likeliest only under its floor, the
                                 fast sums the parts' to the bit, and fixtures F1-F6 held to a
                                 full enumeration (the search's quality: correlated one-game
                                 slates, seeded slates clustered at the floors, the union of
                                 the 30 best by value and the 10 likeliest), no error (the
                                 gate on that, the page smoke running after the commit)
  tools/units_fit.py             the fit and the walk-forward test behind Overall Offense and
                                 Overall Defense: 2012-2025 play-by-play, every constant fitted
                                 on 2012-2017 (the carry's share chosen there, one season left
                                 out at a time), the build's weights scored on 2018-2025 with
                                 the carry and without; run by hand, never by the job; says
                                 whether the build carries its numbers
  tools/def_units_fit.py         the same for the six position tables: their stats' constants
                                 on 2012-2017, each facet's two tables' weights fitted together
                                 there on the next game's measure (EPA a run, EPA a dropback,
                                 sack rate; the defense's shares and the offense's), tested once
                                 on 2018-2025 against the raw numbers so far, as a pair and
                                 each table alone; run by hand; says whether the build carries
                                 them
  tools/deepdive_vs_units.py     the Deep Dive's rows against the Overall Offense and Defense
                                 units (and the units with the carry), the same team-games,
                                 2018-2025, by stretch of the season; a test, run by hand
  tools/joker_base_fit.py        the ELO Model's calls on the Joker's baseline (19 October 2026,
                                 the owner's test): how far the Elo matchup moves the Joker's
                                 chance (JOKER_BASE's BETA), fitted on 2021-2025 on study 4's
                                 walk-forward calls and features.json, tested walk-forward on
                                 2022-2025 against each model alone; run by hand after a build;
                                 says whether the build carries it
  tools/seed_calls.py            recovers the calls published before the ledger began, from
                                 the commits that changed data/model.json (HEAD's history, or
                                 a ref given), into history/
  history/calls_<season>.json    source: those calls (the ledger's start); never regenerated
  data/players.json              generated: the rankings by position (this season's rating,
                                 the bell curve, who is sidelined and why, a Q for questionable)
                                 and every player the models may price, on his career rating
                                 with the season's path and his club; `past`, beside the map,
                                 the season's path of each player kept out of it (out, or gone
                                 from his club), for the Prop Record's weeks he played
  data/model.json                generated: the fitted position weights (`coef`), the
                                 walk-forward record (and the who-played one, for comparison),
                                 this season's graded calls, frozen at kickoff, and the coming
                                 week's (the Pick'em Record's ELO Model: since 19 October 2026
                                 the Joker's chance moved by the Elo matchup, `base` joker, with
                                 `p_elo`, `p_joker` and `m` beside it; `joker_base`, its
                                 constant and walk-forward; `record.joker_base`), `teams`, the team
                                 ratings of this season's results, every game re-scored against
                                 what its opponent has turned out to be (Power Ratings), `units` (Overall
                                 Offense and Overall Defense: each team's rating, its start and
                                 line, whether it is carried (no game yet), every key stat with
                                 its league rank, the weights, the carry; and the position
                                 tables `run_def`, `pass_def`, `pass_rush`, `run_off`,
                                 `pass_off` and `pass_pro`, named with their side, pair and
                                 walk-forward in `tables`), `phase`, and
                                 `sources` (what each download gave)
  data/matchups.json             generated: the matchup formula per position and stat (its
                                 terms and spread), its walk-forward record, the coming week's
                                 projections, each club's expected lineup and who is out of it
  data/calls.json                generated: the ledger of the ELO Model's calls as published
                                 before each kickoff (on the Joker's baseline from 19 October
                                 2026, each with its `p_joker`, `p_elo` and `m`; the season's
                                 games before that re-picked on it as backtests, the call first
                                 made kept in `was`); the record grades these
  requirements.txt               pandas, numpy, tzdata, pinned

news/
  index.html                     not a page since 14 October 2026: sends a visitor to ../, the
                                 site's root (../nflbets/ until 17 October 2026)
                                 (location.replace, on the web and from disk; a link without scripts)
  data/results.js  stats2026.js  generated by tools/pull-week.js (results.js also carries
                                 LINES, every game's nflverse line; stats each team's verified
                                 game count, the regular season only after week 18)
  data/stats.json                generated: stats2026.js's consts as JSON (its twin, lib.js
                                 writeTwin); read by no page from the day the Game snapshot's
                                 Stat breakdown went (16 October 2026), and since app v124 by
                                 a game page's Team Stats window, when it first opens
  data/units2026.js              generated by tools/context.js: the Deep Dive (UNITS26_META: week,
                                 build, report, the Overall Offense/Defense build it read and the
                                 tag constants; each team's `overall` is its pair from
                                 elo/data/model.json `units`)
  data/units.json                generated: units2026.js's consts as JSON (its twin), what the
                                 Game snapshot's Deep Dive fetches
  data/notes/<season>-w<N>.json  HAND-WRITTEN each Wednesday by Claude: each game's preview, news
                                 and sources, keyed by nflverse game id; never written by the job
  data/teams.js                  hand-written team reference (picks/ reads it)
  tools/lib.js                   SEASON (the one place it is set), the CSV reader, the
                                 patient fetch, seasonState (regular / postseason / over after
                                 the Super Bowl), siteRankQuote (phrases a note may not use),
                                 the twins (writeTwin, UNITS_CONSTS, STATS_CONSTS)
  tools/pull-week.js             refreshes results, stats and stats.json, writes the reading pack
                                 to tools/out/, runs context.js; exits non-zero when context.js
                                 cannot build
  tools/context.js               the Deep Dive, units2026.js and units.json; required nflverse
                                 sources or nothing; keeps each week's lineups as kickoff found them
                                 and grades last week's against snap counts (tools/out/weekN-lineups*)
  tools/notes.js                 the notes' rules: the shape and the ids fail, the wording warns,
                                 the bold among it (players in **...**, checked against the
                                 site's player names, players()); --strict (the Wednesday
                                 routine) refuses both
  tools/lineup-checks.js         the lineup rules on the source data, run by the smoke test
                                 ("filed" is the official game status, nothing else)
  tools/deepdive-checks.js       the Deep Dive's headline and weighted row tags stated on their
                                 own (own copy of the constants), run by the smoke and the cases on
                                 what nflbets/build/deepdive.js draws (checkPossession, checkHead;
                                 each row's two sides the offense's then the defense's, each
                                 headed by its own club)
  tools/cases.js                 fixed cases from real weeks the rules and checks must keep,
                                 each with the broken version the checks must fail; run by smoke
  tools/run-auto.js              works out where the season stands, then runs pull-week
  tools/smoke.js                 the gate: the generated files against their sources, the twins,
                                 every game of the week drawn by deepdive.js, the notes (warnings),
                                 index.html's redirect run in vm
  tools/sources.md  week-request.md   the reading panel, and the notes' format and rules
  tools/.cache/                  gitignored: the files context.js read, for the smoke test
  HANDOFF.md                     how to write a week's notes -- read before touching news/

nflbets/
  build/build.js                 THE BUILD: the prop model's parts, hub.html,
                                 tab_elo.html, snapshot.html, deepdive.js, the X Parlays section,
                                 card.html, storage.js, xbets.js, friends.js, glance.js,
                                 theme.js, admin.js and the betting app, theme.css over it -> the root's index.html
                                 (nflbets/index.html until 17 October 2026; required, it
                                 builds in memory and writes nothing: the smoke's freshness check);
                                 refuses a page that names a parent folder
                                 (from the root that leaves the site), or names The
                                 Odds API's host, apiKey= or nflhub_admin_v1 outside
                                 admin.js; fills the card's NICKNAMES slot from
                                 props/build/nicknames.json and holds its DK_TEAMS to
                                 oddsfetch.py's TEAMS; stops if tab_pickems.html or the
                                 Matchups board comes back (22 October 2026)
  build/hub.html                 the page's glue (pk- prefixed, one closure; tab_pickems.html, the
                                 Matchups tab, until its board went on 22 October 2026, app v128):
                                 the season's read of state.json and the Vegas call on it
                                 (window.pkBoard, ST, a pk-state event once it has answered),
                                 the betting app's tag, colour, confidence and Elo-tier code
                                 (BETTING slot; window.pkTag, pkTierBadge...), probCols, the
                                 Props tab's stamp (window.slateStamp), the scoreboard on load
                                 (scoresOnLoad), the tabs as addresses (routeTabs) and the
                                 framed betting tabs (frames)
  build/tab_elo.html             the Player Elo tab and the Elo pieces on the prop tabs (pe-)
  build/snapshot.html            the Game snapshot (gs-): the window a game page's Game snapshot
                                 button opens (app v128; a tap on a Matchups game until 22
                                 October 2026) and the matchup bubble too, everything the site
                                 has on that game, the news job's preview, news and Deep Dive
                                 among it (fetched at runtime); since app v124 also one card
                                 alone (window.gameWindow) for a game page's Matchup,
                                 Mismatches and Team Stats buttons; inlined after tab_elo.html
  build/deepdive.js              the Deep Dive's renderer, pure (no DOM, no fetch): inlined just
                                 before the snapshot as window.gsDeepDive, and required by
                                 news/tools/smoke.js and cases.js, which hold it to the real data
  build/card.html                the parlay card (pc-): Finish parlay, its window and its PNG
                                 download, on every device, for the builder, a Suggested Parlays
                                 level and an Elo pick;
                                 the builder's pricing is lifted into it; on the site owner's
                                 devices Pull from DraftKings (20 October 2026: that parlay's
                                 player markets from The Odds API through HUB_ADMIN, placed by
                                 names.py's rule ported in, window.dkPulledFor, in memory only)
  build/admin.js                 the admin link (20 October 2026), in the head right after
                                 theme.js: #owner=<key> taken off the address, checked free and
                                 kept under nflhub_admin_v1; window.HUB_ADMIN, the one code that
                                 holds or sends the key, to The Odds API alone; data-admin on
                                 <html>; the header's Admin mark and Sign out ("hide only")
  build/storage.js               the browser's own storage, inlined by the build: the window.storage
                                 the prop model saves through (localStorage, nothing else), and the
                                 retired shared store's leftovers taken out of a browser on load
  build/xbets.js                 the X Bet Log's adapter (window.XBETS), inlined after it: reads
                                 liveparlays/xbets.json for the betting frames, read only, on the
                                 admin's browser alone (enabled() false on a visitor's)
  build/friends.js               friends' picks (window.FRIENDS), inlined after xbets.js: reads
                                 picks/friends.json for the Pick'em Record, read only
  build/glance.js                the matchup bubble (glance-, app v114), the page's last script:
                                 window.hubGlance opens it from a leg's name; a non-modal
                                 dialog over the Parlay Builder and Suggested Parlays with the
                                 player's (or both clubs') matchup for the day and the leg's
                                 own numbers, read from eloGlance and eloFiles (tab_elo.html),
                                 gsReadings and gameSnapshot (snapshot.html), pkBoard and the
                                 parts' legFair, legPrice, injTag and S; it keeps its place
                                 (placeOf) and the leg's key, side and line across redraws by
                                 a MutationObserver connected only while open; fetches and
                                 keeps nothing (build.js refuses one that does)
  build/smoke.js  smoke_live.js  the page, and the X Parlays section, in jsdom: the gates
                                 (smoke.js also: Suggested Parlays' sets, their night rule,
                                 their lock and their short lines, the Elo picks' four
                                 levels, the matchup bubble (THE MATCHUP BUBBLE), and the Parlay Builder,
                                 the builder first, its Top 30 lines, their two parts, the
                                 totals last, each bet once and a Refresh odds read's lines
                                 kept with their slip line, only DraftKings' markets offered,
                                 no ladder bet anywhere (app v127, and one kept in the
                                 builder taken out at boot),
                                 held to their rules, the old addresses' redirects to the
                                 root, the light look and its switch (LIGHT MODE), the Props
                                 tab first and the board's old addresses landing on it, the
                                 scoreboard on load, the Game snapshot and a game page's
                                 Matchup, Mismatches, Team Stats and Game snapshot
                                 windows on stand-in news files, never the
                                 real ones, the page is a fresh build, its tag's hash is
                                 its own, the served betting app carries the reference numbers;
                                 --season-over runs it with every game played; both stop
                                 with exit 1 on their own throw, after ten minutes, or
                                 when left waiting on nothing before they finish; both fail a
                                 request to the retired store or anything but a read, and
                                 smoke.js one that leaves the site or names a parent folder;
                                 smoke.js boots a visitor, with an admin-seeded boot for the X
                                 tabs; smoke_live.js the admin's browser and a visitor's, J3
                                 Pull from DraftKings on a stubbed Odds API, and a unit of the
                                 props gate's job C, the one place the pull's money rules are
                                 held)
  build/smoke_admin.js           the admin link and the hidden X tabs (20 October 2026), on
                                 fixtures and stubs of its own: the link, the check, the
                                 record, the header, Sign out, a visitor's page, the key in
                                 nothing but The Odds API's requests; the props gate's job C
  build/test_dkname.js           the parlay card's name rule against props/build/names.py
                                 (test_unmatched.py's pairs and games, the audit's cases,
                                 nicknames both ways); the props gate's job C
  build/theme.css                the hub look: the NBA Hub's and NHL Hub's colours and type with the
                                 NFL's gold, laid over every other style and into the frames
                                 (THEME_FRAME_HEAD); dark by default, and its light palette,
                                 html[data-theme="light"] (--gold-ink for gold text, #FFD166
                                 kept for fills), a light twin for every dark rule with a
                                 colour of its own; the switch's own styles (.hub-theme)
  build/theme.js                 the light/dark switch (17 October 2026), inlined in the head
                                 before the styles: reads the visitor's look before first paint
                                 from nflhub_theme_v1 (junk or storage that throws: dark),
                                 answers [data-theme-toggle], switches open frames, follows
                                 another tab by the storage event; keeps nothing else
  index.html                     a hand-written redirect to the root, for old bookmarks
                                 (location.replace('../'+search+hash), no meta refresh); the
                                 page itself until 17 October 2026, generated by build/build.js

liveparlays/
  build/page.html                THE SOURCE of the X Parlays section
  parlays.json                   X's placed parlays, read only, shown on the site owner's devices
                                 alone since 20 October 2026 (public by address): kept by
                                 Claude from the slips the owner sends (a cleared one stays as
                                 history, not drawn); its `how` says how
  xbets.json                     the X Bet Log: season, deposit and weeks, read only, shown on the
                                 site owner's devices alone (public by address): kept by Claude
                                 from what the owner sends; its `how` says how
  index.html                     redirect to the root's #xparlays (nflbets/#xparlays until
                                 17 October 2026): X Parlays for the admin, the Props tab for a
                                 visitor (the Matchups board until 22 October 2026)

live/  pickems/                  redirects to the root for old bookmarks (live/ to #xparlays,
                                 pickems/ with its hash; to nflbets/ until 17 October 2026)

research/                        the homework toward the next game model (README.md: the rules and
                                 the list of studies); nothing a site or job reads, and no model
                                 until the owner gives the all clear
  common.py  fetch.py            the seasons explored (2003-2025; 1999-2002 only to warm up a
                                 history; 2026 on held out and never read) and the loaders; the
                                 downloader into data/ (gitignored); fetch.py --fivethirtyeight
                                 fetches study 5's files (538's two Elo files, each checked against
                                 its SHA-256, nflverse's weekly player stats and draft picks)
  win_indicators/                study 1: the top win indicators since 2003, in the game and
                                 before it (build.py, rank.py, report.py writes the README's
                                 tables; results/ committed, out/ gitignored)
  elo_vs_site/                   study 2: the study's Elo against the site's own ratings (the
                                 app's Elo, Team Rankings via elo/build.py's power_ratings(), the
                                 ELO Model's published walk-forward) on the same games
  equation15/                    study 3: an equation on the 15 indicators (equation.py: 50
                                 variations scored with each season left out on 2004-2023, the
                                 best frozen in results/equation.json and tested on 2024-2025)
  models_compare/                study 4: the five game models the site ran until 13 October 2026
                                 (Alpha, the Challenger, the Joker, Broly, the ELO Model; the
                                 Challenger and Broly since retired) run walk forward on 2021-2025 with
                                 their own code and side by side (backtest.py; elo_features.py
                                 runs elo/build.py with its cache and output in out/, 2026 dropped)
  fivethirtyeight/               study 5: FiveThirtyEight's quarterback-adjusted Elo rebuilt from
                                 its published rules and checked against 538's own file (qbelo.py:
                                 the rule checks, the REBUILD, PREGAME, LINES, PROOF and SENSITIVITY
                                 runs; locations.csv and venues.csv, the clubs' and venues' points),
                                 then set beside Alpha, the Joker and the ELO Model on study 4's
                                 games (compare.py); results/ committed, out/ gitignored
  exam/                          the one place a held-out season (2026 on) is read, to apply a
                                 frozen equation: blind_2026.py, study 3's equation on 2026
```

## Bets and Stats: one page over both models

NFL Hub (once X NFL Bets and Stats) is the one site, the root's `index.html` since 17 October 2026 (`nflbets/` until
then, whose `index.html` now sends an old bookmark to the root with its tab): the props and betting sites have no pages
of their own any more, only their source, tools, jobs and data. `nflbets/build/build.js` assembles the prop model
from its parts (title, heading and tab bar swapped; every prop model section kept in the
page, listeners and all, whether or not it has a button yet), sets the page's glue into it from
`nflbets/build/hub.html` (a few styles and one closure, every class and id prefixed `pk-`; until 22 October 2026 that
file was the Matchups tab, `tab_pickems.html`, whose board, its own section, was set in front of the prop model's), and
sets the betting app's Records, Power Ratings
and Bet Log (the X Bet Log) tabs into frames: the app as `betting/tools/build.js` builds it is carried in
the page as a string and becomes a frame's srcdoc when its tab is first opened, with
`window.EMBED_TAB` (the tab, which also hides the app's header and tab bar) and
`window.STATE_URL` (`betting/state.json`) and `window.ELO_URL` (`elo/data/model.json`, since 17 October 2026: the
app read its Elo model at a fixed `../elo/data/model.json`, which is its fallback on its own from `betting/`) written in
front of it, both named from the root, since a srcdoc frame resolves an address against its parent's, and the page's
light or dark look written into its `<html>` tag (`data-theme`, by `frames()`, again as it loads). A srcdoc frame is the
page's own origin, so the app keeps its browser store, and nothing is fetched or cached
for it apart from the page. The frame follows its content's height (a ResizeObserver on its body)
and its document never scrolls up and down by itself (`overflow-y: hidden` on its root, set as it
loads), so no classic scrollbar can stick in it when the content measured with a bar comes out
taller without one; sideways it still scrolls where something is really wider. The betting app's tag, colours,
confidence bands and Elo tiers are lifted from it at build time into the glue's closure (the Game snapshot's tags, split
bar and confidence pill, and every Elo shield on the page: `window.pkTag`, `pkTierBadge`, `pkEloTier`, `pkTierDefs`),
scoped there since the prop model has its own `tag()`.
The prop model's tabs run on the prop model's own state under its own storage key, and
the framed tabs on the betting app's, so a pick, parlay or bet made in either is what
this page shows. The Season Tracker tab, which framed `news/index.html` by its address, is gone
(the owner's call, 14 October 2026: its games are in the Game snapshot, below), and no frame is
filled by address any more. Tabs are addresses, each its button's `data-tab`: `#slate`, `#suggest` (Suggested
Parlays, a tab since app v111, which needed no routing of its own; Suggest Parlays until the owner's call of 17
October 2026, "tab name suggest parlay should be Suggested Parlays", app v112, its section, address and `sp` names
keeping the old one), `#parlay` (the Parlay Builder), `#xparlays`
(X Parlays), `#record` and so on (`routeTabs()` in `nflbets/build/hub.html`). The Props tab is the first tab since the
Matchups tab went (app v128, the owner's call of 22 October 2026: "i think we are good to remove matchups tabs since most
the important info was moved to props tab"): the bare address opens on it and stays bare, and the board's old addresses,
`#matchups` (16 to 22 October 2026), `#pickems` (before it, Pick'ems until the owner's call of 16 October 2026) and
`#tracker`, land on it, written over as `#slate` (`OLD_ADDR`, `history.replaceState`; on the board, written over as
`#matchups`, until 22 October 2026). X Parlays and the X Bet Log (`#bets`) are
the site owner's tabs alone since 20 October 2026 (the admin link, below): their buttons and sections carry
`data-admin-only` (`TABS`' fourth field), hidden from the first paint unless `html[data-admin="on"]`; on a visitor's page
`routeTabs` takes the two buttons off the bar before it wires the rest, and `#xparlays` and `#bets` land on the Props
tab, written over as `#slate`; signing out (`hub-admin`) does the same to an open page. On a phone the tab bar is
wider than the screen and scrolls sideways, so on load, on a new address and on a tap the chosen
button is brought into the bar by the bar's own `scrollLeft`, never by scrolling the page.
Every tab change goes through the prop model's switch (the `#tabs` buttons' click in `part3.js`, which `routeTabs`
clicks on a `hashchange`), and a window that lives in a tab's section is that tab's own (app v126): leaving the Props
tab closes the game's page as its Back does (`tabLeft`, `closeGame`), and `tab_elo.html` closes the Mismatches list
(`#peMmModal`, on the Props tab) and the ELO tab's player and team windows (`#pePlModal`, `#peTmModal`) on leaving
theirs, so none hidden with its tab holds body's `modal-open` (the tab the address went to could not scroll) or answers
Escape; a focus left on what the switch hid goes to the chosen tab's button, and Escape closes a game's page only where
it is on the screen (`gameShown`). The whole Game snapshot (in `body`) is no tab's window when the matchup bubble opens
it: it stays open across a move and, closed there, gives the focus to the name that opened it where that is on the
screen, else the chosen tab's button; opened by a game's page's Game snapshot button (app v128, `FROMPAGE`) it goes with
the page, on its Back and on a move, as the page's one-card windows do.
The page is dark for every visitor by default, whatever the system says; the round 44px switch at the header's top
right (`nflbets/build/theme.js`, set in the head before anything is drawn, the owner's call of 17 October 2026: "keep
this whole layout as dark mode, and then make a light mode version that people can tab on and off on the top right")
puts the light look on it (`html[data-theme="light"]`, `theme.css`'s light palette), on its frames open and opened
after (`frames()`), and on another open tab of the site by the `storage` event, and keeps the choice in that browser
alone under `nflhub_theme_v1` (CLAUDE.md, "The light look"; the nflbets smoke's LIGHT MODE section holds it). The parlay
card and its image keep `card.html`'s dark palette.
The header's stamp (`.hub-stamp`) is the light/dark switch, the admin's place (`#hubAdmin`, `.hub-admin`: empty and
hidden but on the admin's page, the Admin mark and Sign out, or for one load the line saying an admin link was refused;
`admin.js` fills it), when the data was built and the build tag. The header's `buildTag` is the prop model's `APP_BUILD` and the page's own hash (`PAGE_HASH`,
seven hex of the page's SHA-256 taken with a placeholder in its slot), so every source change
shows. `smoke.js` builds the page in memory and fails unless the published files match it, checks
the hash, and runs `betting/tools/reference_models.json`'s gate on the `BET_APP` string.
The page's glue (`nflbets/build/hub.html`) reads the season once, `betting/state.json` (no-store), into
`window.pkBoard.ST` (`{sched, odds, season, state, done, err}`), and once that read has answered, ok or not, sets
`ST.done` (`ST.err` the reason where it failed), dispatches `pk-state` on the document and wires the frames, which do not
depend on it. `pkBoard` hands the Game snapshot, the matchup bubble and the Props list's `slateNeutral` the season,
Vegas's call on nflverse's lines (`call`: the two moneylines with the margin out, else the spread about 13.5 points), where
a game stands (`outcome`: the published result, else the props job's final in the payload, else the Props tab's scoreboard read, `LIVE.games` once `LIVE.slate`), its
kickoff, its site ("vs" for nflverse's Neutral or a 9:30am Eastern kickoff) and week name (weeks 19-22 Wild Card to Super
Bowl), `probCols` and the way to the game's page on the Props tab (`canProps`, `propsPlayers`, `openOnProps`). The
scoreboard on load (`scoresOnLoad`, app v128): once the prop model is up (app-ready, and 300 ms) the glue reads ESPN's
scoreboard once for the Props list (the read its Refresh scores makes, seasontype 2, on the prop model's own `SEASON`, no
box score), and only where a game of that week has kicked off with no score in the payload, the one case it can add
anything; with none, no scoreboard request on load at all, and never on a timer. The read goes into `LIVE.games` and
`LIVE.slate` as a press's does, and the list is drawn again with it only while nothing is open over the page (`pageBusy`,
`listRedraw`: no window, no game's page), the focus put back where it was; otherwise the stamp says it and the list shows
it on its next draw (closing a game's page draws it). `closeGameModal` (part3) takes body's `modal-open` off only where no
other window is still open. Nothing read is stored. Until 22 October 2026 **the Matchups board** stood in front of the Props tab (`tab_pickems.html`,
its own section, Pick'ems until the owner's call of 16 October 2026): Vegas's call on every game of a week in six columns
(date, matchup, win probability, confidence, score prediction, final score; one card a game at 900px and under, a middle
layout from 901 to 1,160px), a week picker, Vegas's records and a foot, ESPN's scoreboard read on every load (`PK_LIVE`,
`readScores`; weeks 19-22 seasontype 3), and a note once the regular season was over; a game's row was a button
(`role="button"`, `tabindex="0"`, `aria-haspopup="dialog"`: a click, Enter or Space opened its Game snapshot, the owner's
call of 14 October 2026; before that a tap opened the row on two buttons, the snapshot and the game's props), wired once
on the board (`wireRows()`). It went in app v128 (`props/build/patch_snapshot_button.py`, the owner's call of 22 October
2026, "i think we are good to remove matchups tabs since most the important info was moved to props tab", and, asked
where the whole snapshot should open from, "Button on Props"): its row had been the Props list's since app v122, which
keeps its columns and their layout sum (below), and three of the snapshot's cards opened from a game's page since app
v124. `build.js` refuses `tab_pickems.html`, a section in `hub.html`, the board's ids and names (`id="tab-pickems"`,
`id="pkBoard"`, `pk-game`, `wireRows`, `PK_LIVE`) and a Matchups button or a `data-tab` of `pickems` or `matchups` back.
The game bets (to win, to cover, the total) opened under the board's games until 14 October 2026 and are
on the game's page on the Props tab since (app v105, after its suggested parlays, and since app v124, which took
those off the page, after its head and its Matchup, Mismatches and Team Stats buttons, and Game snapshot since app
v128), with the note on two spreads gone. The **Game snapshot** is `nflbets/build/snapshot.html`'s window (`#gsModal`,
every name `gs-`, its script one closure that the build sets in last, after the Player Elo tab's and `deepdive.js`; the
page's modal style, Escape, Close or a click outside closes it, Tab stays inside, the focus goes back to the
button that opened it, full screen and scrolling on a phone), opened whole by a game's page's fourth button, Game
snapshot (`data-gp-pop="snap"`, `window.gameWindow('snap', gid, button)`, `open(gid, from, {page:true})`; app v128), and
by the matchup bubble's Open game snapshot (`window.gameSnapshot(gid, from)`), with everything the site has on that one
game, at a glance first. Opened from a game's page (`FROMPAGE`) it is that page's window: it goes with the page (its
Back, `closeGameModal` wrapped, and a `hashchange`), closes quietly on a key once the page is off the screen, Escape
closes it alone with the page kept, and its focus goes back to its button (or the one drawn since, the page's Back, the
game's row, the chosen tab's button: `oneFocus`). It is drawn from `gameFor(gid)` (the season's row, else the prop
model's own), so for a game the season has no row for it shows "Loading the season…" (`p.gs-msg[data-gs-season="loading"]`)
until `pk-state` redraws it whole, or, where the read failed, "The season did not load (<why>), so the snapshot cannot
be drawn: it reads `betting/state.json`. Reload the page to try again." (`"failed"`), and with the season in but the game
missing draws from the prop model's row. Its header
is pinned and, once the verdict's line has scrolled under it, shows the game in one line instead
(`#gsMini`: each team's record and the spread, or the score; hidden from a screen reader, the dialog
keeps its title). The verdict (`#gsMatch`, always shown) leads, where the Props tab can open the game
(`pkBoard.canProps`: the prop model has its row and its week is open) and the window is not over that very game's page
(`overOwnPage`, app v128: so the snapshot the bubble opens has it, and the one a game's own Game snapshot button opens,
where it would only redraw the page under it, does not), with a 44px "Game bets and player
props" button (`data-gs-props`), which closes the window and opens the game's own page on the Props tab
(its week chosen on the slate, the tab opened, then the page, as a click on the game there opens it) with
its Game bets card brought into view (`pkBoard.openOnProps`); then the head (`.gs-hero`), away team |
middle (`.gs-mid`) | home team: each team labelled Away or Home ("Home (listed)" at a neutral site)
over its name and its record alone (3-2, as Team Rankings counts it, with no words for which games it
counts; the playoffs beside it once there are any; the Elo file's count, so titled, where it has a
final the results have not), the middle the score once there is one, the kickoff in the viewer's time
and the site (a neutral one named so), and the game's preview (`.gs-prev`, below); no "at" circle
between the teams (the owner's call, 14 October 2026: the labels say it); under 900px (an iPad's 768
among them) the teams share a row and the middle goes full width under them, the phone's smaller
sizes from 760px. A played game's note, ruled in gold,
follows the head; then the headline -- the Vegas favourite's nickname and the spread it is favoured
by, its chance and its confidence pill (Vegas's band, `BET.tier`, "Confidence in Vegas's pick"; the board's own until it
went), or once played the winner with an Upset or Favourite won chip and the line it was favoured by under it -- over the
split bar in the two clubs' colours (`.pk-prob`, `probCols`), the spread, total and moneylines (one row on every phone, the moneylines one over the other;
the line naming their sources went on 14 October 2026, the owner's call), and five answer lines
(`.gs-glance`), each a button
(`data-gs-goto`) that opens its card and brings it under the header: the model picks with Vegas kept
apart as the baseline (how many of the three models agree with it, the ones that do not named with
their dots, the ones with no call yet, how many of the four calls were right once played), the Team
Elo gap with both ratings and ranks, which side ranks higher on offense against defense each way with
the four ranks, who is out by name and how many starters are questionable, and the top mismatch with
its edge on a four-step meter. Under it five cards (`CARDS`, in this order; the Sources card, with
each file's publish time and links to the full tabs, went on 14 October 2026, the owner's call, and
the Stat breakdown, the season's eleven team stats from `stats.json` as bars, on 16 October 2026, the
owner's call, "get rid of stat breakdown section", its bars back since app v124 as a game page's Team Stats
window, below), each a button (`[data-gs-fold]`, `aria-expanded`)
with its title, a badge where a count helps (Starters: the ranked players out; Mismatches: how many)
and, but for Model Picks, Team strength and Offense vs defense (the owner's call, 14 October 2026:
no summary in their title and no note under them), a one-line summary over a body that folds (Model
Picks and Team strength open on a wide screen, every card folded on a phone, Open all and Close all;
nothing saved, nothing redrawn): Model Picks (`#gsCalls`, titled so since 14 October 2026, one lean chart: a row a call, its bar under its name and pick, leaning from 50/50 toward
the side its call picks, as far as its chance, in that team's colour -- Vegas, Alpha Model, the
Joker and the ELO Model -- graded once the game is played:
`processed` once the job has graded it, else `atKickoff` and `joker` in `state.json` and
`graded` or `next` in `elo/data/model.json`); Team strength (each team's Power Rating, rank, shield,
change and chance against an average team, from `teams`, ranked as Team Rankings ranks them; no Tier row,
and under it only the star's note, where a rating predates its team's latest final);
Offense vs defense, Overall Offense against Overall Defense both
ways, one possession under the other, laid out like the head, centred and limited (the owner's call,
14 October 2026): "Seahawks Possession", the Deep Dive's headline tag and its points on the gap
centred under it; the two overall ratings, `units`, in two boxes
of one size and shape either side of "vs", `.gs-ubox`, the better rank's tinted and no separate edge
chip, a unit with no game yet this season shown on its rating carried from last season and marked so;
then the Deep Dive's four position matchups for that possession under "Position matchups", below,
a compact centred row each, its unit, the two clubs and their Elo, each with its tier's shield (the higher
marked; a side with no Elo its rank, below), the defense's position it faces (the owner's call, 16 October 2026)
and its tag; no stats fold and no note under the card: what the ratings rest on is the boxes' title,
what the matchups rest on the label's);
the side of every comparison with the edge wears one mark, `gs-better`; the
Mismatches in the game (the Props tab's own rows, `window.eloMismatches`, ranked among the week's,
each edge on the four-step meter with its legend); and Starters (the team's ranked players out
first, each group's `sidelined`, the box red when someone is; then each team's expected starters,
`lineups` in `matchups.json`, each name a button to his row on the game's page on the Props tab where
the prop model draws one (16 October 2026; `pkBoard.propsPlayers`, `openOnProps(id, pid)`), side by side under each position on Offense, Defense and Kicker tabs
-- `role="tablist"`, the arrow keys, Home and End, the choice kept while the page is open; the two
teams' header under the tabs, directly over the table, since 14 October 2026 -- each
with his season Elo, rank and shield as on the ELO Ratings tab and a Q from the report, the higher
Elo of each pair marked, and each defensive group's header carrying both teams' units as the
matchup formula ranks them among the league's). One type scale (11, 13, 15, 18, 22 and 30px, custom
properties on `#gsModal`; a phone takes the top two to 20 and 26) and every control at least 44px tall;
red text on the red tint (the Upset
chip, the out badge and heading) is a darker red, `--gs-miss-ink` (5.3:1 there, against the page's
red at 4.4:1), and the Big mismatch grade's green a shade darker than the ELO tab's (4.9:1 on white,
against 4:1); the hub look (`theme.css`) lifts the lean bars' team colours toward white, the mismatch
grades' colours, the page's quiet text (#B3B9CB, 4.87:1 on panel-2) and its red
(`--miss` and `--gs-miss-ink` to #FFA2B8, 5.05:1 on panel-2) so they read
there (and the Deep Dive's tags, Even's ring at 3:1 on the card, the preview block and its bold names, each side of a
position matchup and the better rank's tinted box with them): every text in the
window, every card open, is at least 4.5:1 on what it sits on in the hub look, dark or light (the light look gives the
window's red, its lean bars and the Deep Dive's tags light tints of their own, the Even ring among them). It computes nothing of its
own beyond the vote's counts and the Elo gap, each
marked `data-gs-n` and held by the smoke: the
page's glue (the board until it went) hands it the season as loaded, the Vegas call, where a game stands and the way to
the Props tab (`window.pkBoard`: `canProps`, `propsPlayers`, `openOnProps`), and the Player Elo tab its one read of `elo/data/`
(`window.eloFiles`), so no file is fetched twice. A played game says the ratings, lineups and
units are the files as they stand now; a game outside the matchups' week, a game under way, a lineup for a
team's next game rather than this one, and a file that did not load are each said in their card,
and the rest still draws. `smoke.js`'s last section (THE GAME SNAPSHOT) holds every number to its
file, on a game to come, a final on the scoreboard, a graded game and a playoff game, with
matchups.json or the ratings missing, read with the cards and the Starters tabs as
the window opens (so a folded card or a tab not shown is held like the rest); the headline to the
files and its confidence pill to Vegas's band on them; the dissenters, the badges, the edge marks in every
card, among the starters and on the verdict's Team Elo and Offense vs defense answers (the higher
rating, the better rank of each offense and defense that meet, the side named with the edge), and the
unit ranks in their headers; the bars, to the same numbers (each call's bar leaning toward its pick,
`gs-toh` home and `gs-toa` away, as far as its chance and in that team's colour; the split bar under
the headline each side's Vegas chance wide); the game bar; the head (away team, middle, home team,
the middle's score, kickoff and preview in that order, no "at" circle, the Away and Home labels),
each record the record alone, no line naming the line's sources, each meeting in Offense vs defense
two boxes of one class with no note or edge chip, and no Sources card, publish time or link away;
the answers' buttons, the folding,
the tabs' keys and kept choice, the props button (exactly where `canProps` says and the window is not over that game's
own page, and doing its job), the Tab order and the 44px tap heights; and the way in: a game's page's Game snapshot
button opening the whole window of its game, the focus on Close and back on the button, Escape closing it alone and a
second the page, a click outside closing it and a click inside or a double click's second not, a redraw under it, no
Refresh scores press opening a window, Back taking it with the page, its loading line before the season and its failed
line with none (until 22 October 2026 a board row's click, Enter and Space). The position table is `table-layout: fixed` (each team half
the card) and its names wrap: laid out automatically, a long name set a column's width and pushed
the home side past the card on 34 of week 4-6's 45 games at 390px. A player's Q sits inside his
name's own box (`.gs-pnm`), inline after the name: as a flex item of its own beside a wrapping
name it was pushed to the inner edge of its half, beside the other team's player, on 69 of the
season's 510 Q's at 390px and 109 at 360 in Chromium (NYG at WAS read "Malik Nabers Q" for Terry
McLaurin's). jsdom lays nothing out, so the smoke holds the rules and the structure: every Q's
parent is the box whose own text is its player's name, inline, in his team's column, checked on
every game a questionable starter's lineup is for (a week with none on one side has one planted,
in the smoke's copy of the matchups). The window's modal has no top padding (the panel's margin
makes the gap), since a sticky header sticks inside its scroller's padding and the content showed
in a band above it once scrolled.
What the Season Tracker said of each game is in its snapshot, from the news job's files (the
owner's call, 14 October 2026; "News: the job and the game notes" below). The preview (`.gs-prev`,
in the head's middle under the kickoff) is the game's entry in
`news/data/notes/<season>-w<week>.json`, its Preview line alone (the note's news and sources stay in
the file, unshown since the owner's call of 14 October 2026; labelled
"Preview, written <day>, before kickoff" once the game has started)
(`data-gs-note="written"`, escaped, then each `**...**` pair of 1 to 60 characters drawn bold,
`b.gs-pn`, an unpaired `**` left as typed); until a game is written, and only for a game still
to come, an automatic line (`data-gs-note="auto"`: who visits whom with their records, the day and
time, and no news);
a played game with no note has none. In Offense vs defense each possession's title has
`deepdive.headTag`'s tag and points ("−0.9 pts") centred under it, and under its two boxes `deepdive.possession`'s four
rows (tagged on the quarterback against the pass defense, the line against the pass rush, the run game
against the run defense, the receivers against the coverage), each a compact centred row: its unit, the
two sides' clubs and Elo ("SEA 1532 · DEN 1488", the offense's then the defense's, the owner's calls of 16
October 2026: the quarterback's own season Elo against the Overall Defense, `units.def` ("QB needs to be
vs team defense overall"), Pass Protection against Pass Rush, Run Offense against Run Defense, Pass
Offense against Pass Defense, `deepdive.eloSides` on the Elo files the window already has, the higher
marked, each titled with what it is, its Elo, rank and tier, and each wearing its tier's shield, the
page's `pkTierBadge` handed in as `badge` ("pls add elo icon"); a side with no Elo its rank from
`units.json`, with no shield, the quarterback row's defense side its `overall.def` rank), the defense's
position it faces (Overall defense, Pass rush, Run defense, Coverage) and its tag, the Deep Dive's own
(the quarterback's still on the pass defense, as fitted, which its title and the basis say), the edge in
the tag's title, Even a chip of its own with a light ring ("make 'even' tags more distinguishable"); no names, no one out and no other numbers (the owner's call, 14 October 2026),
where `units.json` is for the game's week (`deepdive.applies`), else one line saying why (a
playoff game says the Deep Dive covers the regular season only); `deepdive.basis` (and when the news
job built the file) is the title of the "Position matchups" label over them, not a note under the
card; `nflbets/build/deepdive.js` is one module, inlined
before the snapshot as `window.gsDeepDive` and required by the news job's smoke and cases. The window
fetches the two files itself at runtime (`news/data/units.json` and the opened game's week's notes, named from the
site's root, `../news/...` until 17 October 2026,
never `stats.json` as the page loads or for the whole snapshot since the Stat breakdown went, which `build.js`
refuses back, only for a game page's Team Stats window the first time it opens (app v124, below);
`cache: 'no-store'`, each once a page load, fetched as the page loads, the notes of the current week once
the season is in (`weekNotes` on `pk-state`; until 22 October 2026 once the board had its schedule) and another week's
when one of its games opens), never baked into the page; a
file still being read says so in its own part ("Loading the Deep Dive…"), one that did not load or has the wrong shape is
said in its own part alone, and a late file or the prop model coming up redraws the window with the focus
and the reader's place kept. `smoke.js` holds all of
it on stand-in news files served by its fetch stub, never `news/data`'s own: the elo job runs it every
morning, and a news job publish must never turn it red (the real files are `news/tools/smoke.js`'s).
The Player Elo tab (`nflbets/build/tab_elo.html`, `pe-` prefixed, its own closure) reads
`elo/data/players.json`, `model.json` and `matchups.json` on load and draws one card: the
rankings by position, a bell-curve histogram by tier shield over the table, each player's
season line. A click on a player opens his window: his rating, then his matchup this week.
The position row ends with the team pills, Overall Offense and Overall Defense first, which put a table of
the 32 teams in the card's place (`units` in `model.json`): rank, team, record, rating and
shield, and each key stat with its league rank, the weighted ones first, sortable by column,
scrolling sideways inside the card at every width with the team column held; a
click on a team opens its window (its rating game by game from its own start, every stat ranked
raw and with opponents counted, what each weighted stat adds, its coming opponent). Every team is
rated from a season's first day, starting from 0.42 of its final rating the season before
(`params.carry` of `params.carry_from`), so the opponents-counted ranks and the adds carry that
share too; a team yet to play is ranked and shown on that carried rating, marked "carried from"
that season in the table and its window. The weights and the stats are read from the file, a file
from before them draws the old three columns, and one from before the carry (one start a side)
draws its lines from that start, with no mark. With the two come the file's position tables
(`units.tables`, from 16 October 2026: Run Defense, Pass Defense and Pass Rush, and the offense's
side of the same facets, Run Offense, Pass Offense and Pass Protection, each on two stats and named
with its side `of` and its `pair`), the pills in two rows headed Offense and Defense, each facet
over its other side (two by two under each heading on a phone), drawn the same way, the text
naming their weights (and which way is better in their stats' own words) and, under it, the
walk-forward tests the file carries for each (a forecast of the next game's measure from the table
with its pair's ratings on the same stats, beside the same forecast from both clubs' raw numbers;
and the table alone against its own side's raw numbers alone); a team's window heads its values
Allowed, Made or Value by its stats and gives its opponent's rank in the pair; a file with the
defense tables and no pair says, as it did, that the opponent's rank is Overall Offense's; a file
without any draws the two pills alone.
The same script puts the Mismatches card on the Props tab (games still to kick off only) and, on a game's page,
a MISMATCH tag beside the name of each player with a Solid, Big or Huge mismatch that week (`mmTags`), a ranked player's shield and his
Elo matchup chance on each leg in the builder, a "market + form" price on each leg with a
real book price (graded in the Prop Record, the `tab-track` section, which has no button),
and the Elo picks, since app v118 each Suggested Parlays set's own on its night game's or Sunday slot's games alone
(`window.eloUnit`, drawn by the props parts with `window.eloCardOpt`, the mismatch tags put on by `eloDecorate`, no
longer on the Parlay Builder's ticks), from app v111 to v117 at the foot of Suggested Parlays (`#pbElo`, until then the foot of the Parlay
Builder's suggested parlays; drawn with the sets' own `pbTierCard`, each leg with its own Add and no Value mark,
since `pricedLegs` sets neither `thin` nor `market` and the picks are chosen on the Elo matchup, and kept to the
Parlay Builder's ticked games and player sides by `pbAllows` and, since app v109, wherever the payload carries
DraftKings' ids, to legs with one at their own line, `dkIdOf`). Since 18 October 2026 they are Suggested Parlays' own
four levels on the Elo chance (`eloPicks`, `eloSuggest`; ids `elo-safe`, `elo-med`, `elo-aggr`, `elo-xtrm`, which the
card's `elo|elo-<level>` names): the candidates (`eloCands`) each player's best leg by value, searched from the 30 best
by value and the 10 likeliest (`epKeep`), each level the best expected return over its floor, Safe's the Elo picks'
own 35% (`EP.safe`, `epTiers`, since 18 October 2026; until then the likeliest pair, as Suggested Parlays' Safe still is)
and the others 25%, 12% and 5%, legs of one game priced together by the builder's own `parlayProb` and `parlayDec`; the search (`epPrep`,
`epScan`, `epLevel`) a branch and bound over a quick reading (`epGroup`, `epBounds`) whose finalists are worked by fast
sums equal to the parts' to the bit (`epDraws`, `epSums`, `epDec`), every level worked again by the parts before it is
drawn (`EP_FAST` off should they differ), built only while the tab is on the screen and cached (`EP_CACHE`; the ELO tab
wraps `renderSp`); each leg on a player with a Solid-or-better mismatch wearing "<Grade> mismatch" after his name's
button, on the side it favours only (`epMm`, `epMmFor`, `epMmTag`). The Mismatches' words (`mmLine`, `mmTitle`,
`mmAgainst`) name the matchup formula's units, "vs the LAC secondary and defensive line, 32nd by player Elo", never
"pass defense ranked", which is the ELO Ratings tab's table's alone. `window.eloGlance` {trusted, labels, unit, grade,
against, outWhy} is what the matchup bubble (`glance.js`) reads here: `unit(group, opp)` the tab's own table for a
side of the ball (a quarterback the Overall Defense, a back the Run Defense, a receiver or tight end the Pass Defense),
ranked as the table draws it. The ELO Model model's calls and record
are on the Pick'em Record and the build's team ratings of results on Power Ratings, both through
`betting/tools/build.js` (Power Ratings' Record column is the season's own results from
`betting/state.json`, current within hours of a final, and a team whose latest final the Elo file
has not taken in yet is starred until the Elo job, which the betting job starts on a new grade,
rebuilds it). It borrows the page glue's team tag (the Matchups tab's until it went on 22 October 2026) and the tier shields
(`betting/tools/tiers.js`: Wood under 1350 up to Elite from 1700, HOF from 1750) through
`window.pkTag`, `pkTagColor`, `pkTierBadge`, `pkEloTier` and `pkTierDefs`.
X Parlays is a tab of its own (`#xparlays`, the section `tab-xparlays`):
`nflbets/build/build.js` lifts `liveparlays/build/page.html` -- its styles scoped to its card,
`#lpCard`, and its script in a closure. The section draws one list, X's (`#lpCard`, the whole of
the tab): the placed parlays in `liveparlays/parlays.json`, read on every
load and on Refresh now, read only, on the site owner's devices alone since 20 October 2026 (`lpAdmin`, exported as
`window.lpAdmin` for the page's app-ready listener: on a visitor's page `draw()` and `refresh()` return at once, so
neither the file nor ESPN's scores are read), a parlay marked `"cleared": true` left out (and
its games not read), a quiet line under the heading saying when the file last changed (its
`updated`). Nothing a browser holds is drawn there: no saved parlays, no builder, no betting slips.

Every card, live or settled, has an X at its top right (`.lp-x`, a 44px button named "Clear this
parlay", `data-lp-clear` its id), the same on every device that shows the tab: there is no owner mode beyond the admin
link, which only says whose browser it is. It opens a
small window over the page (`#lpAsk`, inside `#lpCard`, an `alertdialog`) asking "Clear this
parlay?", naming it (legs, week, price, note) and saying it is cleared from X Parlays on this device
only, nothing sent anywhere, and that X's parlays clear themselves the day after their
last game ("for everyone" until 20 October 2026); Cancel, Escape (ahead of any window beneath it) and a click outside clear nothing, Tab
stays inside, the focus starts on Cancel and goes back to the X. A tap within 0.4 seconds of the
window opening (a double tap's second, which on a phone can land on Clear) neither clears nor
closes, while a key's click always counts; the window scrolls, its panel centred by auto margins,
so Clear stays reachable on a phone on its side; and a hashchange (the back button) closes it,
clearing nothing, as does any key pressed while its tab is hidden. Clear takes the parlay off X
Parlays in this browser: its id, with when, joins the section's own key, `lp_cleared_here_v1` (a
list of `{id, at}`), its games are no longer read, and the focus moves to the X now in its place.
The list is the visitor's own choice of what to see on that device, never X's data: written only
when it changes, removed when empty, pruned on every read of the file of any id the file no longer
has or has cleared itself (not when the file does not answer), each change made on what storage
holds at that moment (a second tab of the site never writes its older copy over a clear, and follows
one through the `storage` event; Show them again brings back only the ones that tab showed as
cleared), and never touched by `storage.js`
(the build refuses one that names it). With some cleared, a quiet line at the foot says how many,
with Show it (them) again; with every parlay cleared it is the whole card, in place of "Nothing to
watch yet". With any cleared and every parlay shown settled, the card says "None of the parlays
shown here is still live", not that none of X's is. Show them again empties the list, with no window, and reads their games again. The
build holds the section's storage to that one key and its requests to reads.

Suggested Parlays is the prop model's own tab (`#suggest`, `tab-suggest`, `#spPanel`, after Props; app v111,
`patch_suggest_tab.py`, the owner's calls of 16 October 2026, quoted in CLAUDE.md's Bets and Stats loop, "Do a
section for Thurs night, sun night, and monday night games ONLY. do absolute best suggestions"; renamed, shown one
night at a time and its legs tagged Value by app v112, below): for each
prime-time game of the week still to come a set of four levels from that game's lines alone (the tab sets out the
next night's alone, from its morning), the lock that holds
each set from 2 hours before its kickoff, the record of the locked sets at the top (below, with the suggestions
record) and the Elo picks at the foot. `renderSp()` draws it, the frame once (`#spHead`, `#spSets`; until app v118
`#pbElo` too), from `renderPb()` and on a click of its tab's button, since a live set is built only while the tab is
on the screen. Since app v118 (`patch_slots.py`) `#spSets` is two sections, Night games and the Sunday slot (every
Sunday game before 7 pm Eastern, one set, `spSlotUnit`, up from the night rule's opening, `spOpenAt`, locked 2 hours
before its first kickoff, under way with nothing to add from it to its last), each headed by its record (`spRecHtml(sec)`:
a row for the model's parlays and one for the Elo picks, the backtest, `suggest_backtest.json`, counted where the record
has no entry and said in a chip), and each unit (`spUnit`: a night game or the slot) its model parlays and its own Elo
picks (`spEloSet`, the ELO tab's `window.eloUnit`), locked, kept and recorded together. A prime-time game (`spPrime`) kicks off on a Thursday, Sunday or Monday at or after 19:00 Eastern,
read from the schedule's `g.d` and `g.t`, which are Eastern already: Thursday, Sunday and Monday night football,
both games of a Monday doubleheader, Thanksgiving's night game and a Christmas night game on one of those days;
never a day game, a Saturday or a Friday. `spGames()` is those of `pbGames()` (the week's games still to kick off,
with no score), in kickoff order, every one of which the record takes; which of them the tab sets out is `spOn()`
(**one night at a time**, below). A game's set is `spBuild(g)`: `pbPool([g], SP_ALL, SP_SEARCH)` and `pbTier` on
each of `PB_TIERS`, so Safe, the likeliest 2-leg parlay, and Medium, Aggressive and Extreme, the 3-, 4- and 5-leg
parlay with the best expected return (the model's chance times the book's price) that lands at least 25%, 12% and
5% of the time (`pbBestReturn`, which Safe, with no floor, also is), each a same-game parlay. Where no parlay of a
level's size clears its floor with any count of thin legs, the level is the likeliest parlay of that size instead
(`pbLikeliest`): chosen as Safe is, the preferred legs alone first and then the fewest thin legs, by a beam on the
search's own chance, its best few worked with the builder's own `parlayProb` and the highest of those taken. The
level carries `likeliest: true`, and its card's rule reads "the likeliest 3 legs" (4, 5) where a level over its
floor reads "best return that lands 25%+ by the model" and Safe "the likeliest pair"; the card shows its chance and
price like any other and says nothing about the floor (the owner's call, October 2026: every level shows a parlay,
"just state the percentage"). The tab's footer says so in a line. `SP_ALL` ticks every bet type, whatever the
Parlay Builder's boxes say, so the page and the record agree. `SP_SEARCH` is the owner's "absolute best" on one
game's small pool, passed to `pbPool` and the searches as `opt` (`pbOpt` lays it over `PB_SEARCH`, the all-games
panel's own widths, which a call without it keeps): each list cut to 60 legs (`cap`; the panel's 40), beams of 200
by return and by chance (`beam`; 12) and 400 for the likeliest (`wide`; 24), the best 4 (`likely`; 3) and 10
(`final`; 8) worked by the real sums. At those widths a priced game takes about a second in jsdom (week 5's Bills
at Rams, 26 legs, 1.1 s against 1.0 s at the panel's widths, the same four parlays; week 6's Seahawks at Broncos
1.45 s), most of it the real sums' draws, so a hidden tab draws only a set already built and says "Built when this
tab is open." for the rest. A set is cached in `SP_CACHE` on `spSig(g)` (the game, its kickoff and `pbDataSig`, so
a publish, the Elo files arriving and a press, `ESPN_SEQ`, rebuild it); the searches are seeded, so the same data
gives the same set. The audit's M and the smoke hold the engine's likeliest level (and Safe's pair) to its word:
wherever no two legs that could share a parlay move together, so that every parlay is a plain product, every parlay
of its size with as many thin legs is worked with `parlayProb` and none may land likelier, on the week's own picks
through `getPbTiers` (Spread alone, Moneyline alone, and in the audit Teams only on four games) and on ten made-up
games whose covers are priced so that the likeliest ones (-115) and the best-paying ones (+140) differ, so a
fallback chosen by return fails; and the audit's M10 works each level of a set out in full on made-up prime-time
games whose made-up players' lines do not move together (a Monday doubleheader, one game of nine legs, where Medium
has no parlay over 25%, the other of eighteen, past the panel's beam, where only a search as wide as the set's
finds them). A leg qualifies from `pricedLegs()` (a real book price, or a `dkline` one, DraftKings' line read on ESPN at
the formula's price, on a tested kind: until app v125 only on a payload baked before `dk`, after a Refresh odds press;
since, from the props job's published read or a press, on every payload; the
model's chance 45-97% and 3 points over the chance that price implies, `mlProb(price)`, the book's margin left in,
which is stricter than its margin-out chance; market + form agreeing on a player leg; nobody V6 keeps out), and
those, `pbPool`'s preferred list, are the **Value picks**, each marked Value (below); where they cannot fill a level,
the fewest legs the model still rates at or over the book fill it (the thin legs, `thin: true`), unmarked (until
app v113 with a line under a set's card saying why they are not Value picks for each kind of leg, `pbThinLine`: "One
leg is not a Value pick: the model rates it at or above the book's price, but not 3 points above.", "N legs are not
Value picks: the model rates them ..."; a team bet, which has no market + form, missed only the 3-point bar; a player
leg the bar with market + form agreeing; `pbTierCard` draws it since only on a card not passed `o.quiet`, which every
set's card is), and never a leg under the book. Since app v109
(`patch_dk_slip.py`, the owner's call of 16 October 2026: Open in DraftKings had put only the first leg of his
parlay on DraftKings' betslip, the others having no DraftKings id, and there is no free source of ids, DraftKings'
own odds feed answering neither other sites nor cloud or GitHub runners) every list `pbLegs` builds, the preferred,
the thin and the totals, takes a leg only with DraftKings' id at its own line wherever the payload carries ids:
`dkIdOf(l)`, from `PAY.dk` by the card's keys and rung rule (a moneyline exact, a spread or total at its own
number, the anytime touchdown for one touchdown only, a player's main line at its line, a rung k+ as Over k-0.5
else the whole k-1), null once the game has kicked off, and `dkCarries(l)`, which is false on a payload baked
before `dk` (and for the `PAY.dk` a press makes on one, marked by `dkPressMade`), where the sets and the list
suggest as before, and for a game with no entry in its week, which is taken the same way (`weekly.py` bakes
`PAY.dk` `{}` from Monday night's final until the next week's first pull). Since app v125 (`patch_espn_only.py`) an
entry counts as carrying the pull's ids only by its content (`dkEntryCarries`: the paid pull's time, `at`, or a player's
key, anything but `event`, `glat`, `at`, `team:` and `game|` keys, the card's `dkHasPlayer` rule), so an entry a read of
ESPN makes (the published read's, a press's, the card's check's) never does, a JSON copy of the table reads the same, and
on every payload the job now bakes (`PAY.dk` `{}`, no pull running) the rule is dormant: the `dkline` legs are suggested
everywhere. That fixed a live bug: a press over `dk:{}` had written an entry for its game, which then counted as
carrying ids, and every player leg of that game left every level, hand and Elo pick. The far-off guard counts its legs first;
a leg left out for want of an id is counted (`noId`, `noIdPl` the players', `moved` and `movedPl` those DraftKings
had at another number, `dkAtAnother`; the totals left out with them), and a game counts as having player prices
(`plGames`) only where one of its player legs has an id (`plNoId` the games whose player legs have none). So a
`dkline` player leg is never suggested where ids are carried (ESPN gives none for a player's line), a team leg a
press re-priced is (the press gave its current id), and until app v125 a Sunday early game's player legs never were. The audit
works the rule on its own (`dkIdAud`, `dkOk`, `dkEntryCarriesAud`, never the page's `dkIdOf`): M9 on made-up games with ids for some
legs and decoys under the keys a wrong rule would read (the pool less the legs with no id, the counts said, at
another number (`dkElseAud`) and with none, the levels the legs with an id alone build, a game with no entry and an
empty table taken as before ids, no player id at all and its reason, no ids carried suggesting as before); M, M4
and M7 run on a made-up id table giving every priced line its id, so their rules still meet player legs and totals,
and M, M7 and O hold every leg a level, the list or a game hand may take or holds to an id; M8 holds a press's read
suggested nowhere where ids are carried and as before where they are not. A game total has no edge: it is priced at
the book's own chance (see **game bets** below), which sits under the chance its price implies, so `pricedLegs()`
leaves the totals out and a total is never preferred or thin. With Game total ticked (always, for a set) `pbLegs`
adds the totals as a third list, the market legs (`pool.mkt`: both sides of each ticked game's posted total on a
real price, 45-97%), and `pbTier` uses them only where the legs with an edge cannot make a level of its size, with
every leg with an edge as the base and the totals the only fill, the fewest first; a total is never a Value pick
and wears no mark, and until app v113 a line under a set's card said why (`pbMktLine`: "The game total is at the
book's own chance with its margin out, so it is not a Value pick: it is here because ...", the sets' reason,
`o.mktWhy`, "this game's other legs do not make a parlay of this size", and with none passed "your picks' other legs
do not make a parlay of this size"; app v112's second round, where the sets' read "this game's legs with an edge do
not ..." and the default "your picks do not make a parlay of this size from Value picks"). A set's cards are quiet
since app v113 and draw neither line; `pbTierCard` still draws both on a card not passed `o.quiet`, which the audit's
M2 holds on cards of its own with the sets' reason and the smoke on one of its own with the default, word for word,
blocking. A game gives one side (to win or to cover) and its total (`pbFits`,
`pbMaxLegs`; unrelated, `legRho`), one leg a player, no line twice. A level is empty only when the game does not
make that many legs (`pbMaxLegs` under its size), and then says why (`spWhy`), never offering a smaller parlay:
"Only 3 legs in this game" ("... that DraftKings' betslip can take" where legs were left out for want of an id),
and, where the game has no player legs yet, since app v125 that DraftKings had posted none for it when its lines were
last read from ESPN, with when, or that they have not been read yet (`spNoPl`, dated by `espnLastRead`, the published read
or a press), or, the dormant id rule's, that a player's line read from ESPN carries no DraftKings id; until then that its
player prices are pulled (`spPulled`, gone: on the day for a Thursday or Monday game, on Saturday morning for Sunday
night's), that DraftKings had posted none when Refresh odds last read it, or that none it has can go on DraftKings'
betslip yet.
Each level is a card (`pbTierCard`, its `o.kind` 'sp', `o.fid` "<game id>:<level>" and `o.what` the game, which
names its buttons, and since app v113 `o.quiet`, so under its legs it draws only the est. line where a leg's price is
an estimate and a ruled-out level's Updated line): the fair chance first and the model's beside it (below), its price and what the Bet amount
pays, its legs, each with its own **Add** (`pbLegAddBtn`: `data-pb-leg` the leg's key with `data-k`, `data-side`
and `data-main`, 44px, `aria-pressed`, named "Add <name>, <label>, to the builder" and "Remove ... from the
builder" while it is in), which one delegated listener answers on Suggested Parlays and on the Parlay Builder's list
alike (`pbLegClick`): that leg into the builder or out of it by `toggleLeg`'s own path, so the builder prices it as
a tick on its game's page does, the focus kept on the same button once both are drawn again. Under its legs a level
has **Add to builder** (`data-sp-add="<game id>:<level>"`, `spAddClick`: exactly the level's legs, as the tab shows
it, into `S.parlay` by `pbPut`, asking first when the builder holds others, on the Bet amount, so it pays what the
level said) and **Finish** (`data-pc-finish="sp|<game id>:<level>"`, which the parlay card answers through
`window.spTier`). Both redraw first where what is on the screen is stale (`pbStale`). The tab's controls are its
record and Refresh odds (`espnCtl(null, 'sp')`, the same read of every game of the week still to come); the Bet
amount is the Parlay Builder's. With no prime-time game left to come the tab says so (the season over, or none of
the week's still to kick off), and the Elo picks still draw under it.

**Without the long paragraphs** (app v113, `patch_declutter_top50.py`, the owner's call of 17 October 2026: "in suggest
parlays, get rid of all the long paragraph description stuff. we dont need to clutter the page."). `spHeadHtml` is
the heading, `spRecHtml`'s pills and Refresh odds, and nothing else: the lead under the heading (`p.pb-lead`: what a
set is, one night at a time, the lock, what a Value pick is), the foot under the sets (`p.pb-foot` in `spSetsHtml`:
how a set is built, its rules and its floors) and the record's sentence under its pills (`p.sp-rec-line`) are gone,
and a set's cards are quiet (above). The lock lines are one short line each and `spUpdLine` one line (**The lock**,
below), and the Elo picks' lead (`eloSuggest` in `tab_elo.html`) one sentence: "Players whose Elo matchup beats the
book's price, on the games and player sides ticked on the Parlay Builder tab." Kept: the record's pills (each pill's
title still giving its expected wins and pushes), Refresh odds and its status line, the wait line, an empty level's
reason and the est. line (a price that is an estimate is money). The audit (`holdSets` on the week, M10, M11, M2 and
M13 on made-up games and cards, P2 on the record: the quiet cards blocking, the words warnings) and the nflbets smoke
(`WHY_GONE`, no word of the gone paragraphs anywhere on the tab at any hour; the head's three children alone; every
lock and Updated line word for word; a card of its own drawn both ways; the record's pills alone; the Elo picks'
sentence; all blocking) hold it, and `smoke_live.js` its Thursday fixture's lines.

**Value picks** (app v112, `patch_suggested_night.py`, the owner's call of 17 October 2026: "can we do reverse tags?
like get rid of thin edge and no edge and come up with a name for that first section?"). The marks are reversed: a
Value pick, `pbIsValue(l)` (`!!l && l.thin === false && !l.market`: a leg on `pbPool`'s preferred list, never a
thin leg or a total), wears the one mark a leg has, `pbValMark(l)`, `<i class="pb-valmark">Value</i>` (the gold
filled, its text #1A1A1A on it in either look), beside its label on a level's card (`pbTierCard`) and on a row of the
Top 30 lines (`pbTopRow`); a thin leg and a total wear none, where they wore `pb-thinmark`'s "thin edge" and "no
edge", and until app v113 the lines above said why they are not Value picks on a set's card too. An Elo pick's legs come from `pricedLegs()`, which sets
neither `thin` nor `market`, so `pbIsValue` is false on each and none is marked. Which legs a level takes, its order
and its numbers do not move, and the record still writes each leg's `thin` and `market` (`suggest_ledger.js`), so a
locked set read back from it (`spLegIn`) is marked by what it kept. From app v112's
second round to app v113 the tab's lead said a leg marked Value is one of the model's best, rated at least 3 points
above the chance its price implies, and where the Elo tab is on the page (`formSig() !== ''`) that "on a player's line
market + form (the book's chance moved by his Elo rating) agrees", and the sets' foot that the Value picks are marked
and the others are not; both went with app v113. The audit holds `pbIsValue` on its own cases (a preferred leg, a thin one, a total, a leg that says
neither, `thin` undefined or 0, no leg) and the marks on cards of its own, and with the nflbets smoke the Value mark
on every Value pick and on nothing else, and no old tag, on every set's cards and every Top 30 row; the smoke holds
the Elo picks' legs unmarked too, and `smoke_live.js` each leg of a locked set the record kept as Value picks marked
Value.

**One night at a time** (app v112, `patch_suggested_night.py`, the owner's call of 17 October 2026: "just show the
next night game dont stack the mondy night game until monday morning"). `spNight()` is `{games, open, prev, up}`:
`G = spGames()`; `games`, those on `G[0].d`, its Eastern date (both games of a Monday doubleheader); `prev`, the latest
Eastern date before it of any `spPrime` game on the whole schedule (`S.sched`, any week, played or not); `open`,
`SP_OPEN_H` (6) o'clock Eastern on the day after `prev` (its offset from `easternOffset(day)`), null with no `prev`;
`up`, `open == null || Date.now() >= open`. So Sunday night's set goes up on Friday at 6:00 AM Eastern, the morning
after Thursday's game, Monday night's on Monday morning, after Sunday night's, Thursday's on Tuesday morning, after
Monday night's, and the season's first night at once. `spOn()` is `up ? games : []`, the one place the tab asks which
games it sets out: `spSetsHtml` draws `spOn()`'s games (`spGameHtml` each), so a set is built, live or as the page's
own copy at the lock, only for a game on the screen; with `spOn()` empty and `spGames()` not, it draws one line,
`p.pb-none.sp-wait` (`data-sp-wait` the instant, ISO with no milliseconds, `data-sp-next` the games' ids,
space-joined): "Next up: Monday night, Commanders at 49ers. Its set goes up Mon 6:00 AM ET, the morning after Sunday
night's game." ("Their sets go up" for two games); with no prime-time game left the lines are as before. `spTier(fid)`
finds its game in `spOn()` alone, so a level the tab does not show is not finished from it. `spState()` appends
`on=` and the ids `spOn()` sets out, joined by `+`, so `pbWatch`'s 30-second look (`pbStale` against `SP_SHOWN`)
redraws an open page at the 6:00 AM turn. The record is untouched: `suggest_ledger.js` still takes every prime-time
game's set by `spGames` and `spSet`, so on the payload baked on Saturday 17 October 2026 the tab sets out
`2026_06_DAL_GB` alone while the job holds `2026_06_WAS_SF`'s set too; from Sunday night's kickoff to 10:00 UTC
Monday (6:00 AM EDT) the tab names `2026_06_WAS_SF` and when, and from then sets it out. The checks work the rule out
on their own copy through the time zone database (`Intl`, America/New_York), never by calling `spNight` or
`easternOffset`, at the page's clock. The audit (`nightRuleAud`) on the week as it stands (`holdSets`: the games drawn
and `spOn` the rule's, the wait line's instant and games, `spTier` a level only of a game set out and null for one off
the tab) and in M11 on made-up nights of 2019 of its own (a Saturday night and a Sunday afternoon game that are no
prime-time night, a Monday doubleheader, a Thursday in the next week and the Sunday the clocks went back, the page's
clock set to each moment across 6:00 AM Eastern and put back, each case's answer written beside it, and the redraw at
the turn: `spState()` moving with no game kicked off, `pbStale()` true and `pbWatchTick` redrawing once): which games,
the instant, the Finish and the redraw are blocking, and the line's words (`W.wording`) and the sets' kickoff order
(`W.order`) warnings, the audit's alone. The nflbets smoke (`nightOwn`, `waitOwn`, `waitHeld`) holds the same on the
week as it stands and on made-up games of its own (the Thursday alone, then the Sunday night's line and set, then the
Monday doubleheader's, together; the turn redrawing an open tab by its half-minute look, `pbWatchTick`, with only
`spState()`'s `on=` token moved; a hidden game drawn nowhere, no leg or button of it, and none of its levels found
by `spTier`); it has no warnings, so the line's words and the order, the games of one night in kickoff order and two
at one kickoff in the schedule's own order as the page keeps them (never by game id), fail it too. `smoke_live.js`
holds only the night of its Thursday night fixture (31 December 2099, `nightOpenL`, its own copy): before it is up,
no set drawn and one wait line whose instant, games and words are the rule's, and `spTier` null for its Safe; once it
is up, that game's set and no line; all blocking. A check that needs the cards of a game the rule hides at that hour
(the smoke's set checks, `smoke_live.js`'s card checks, the audit's `spAllOn`) stands `spOn` in
(`spOn=function(){ return spGames(); }`) and puts it back after (the page's own function kept in a slot of its own;
the audit in `try`/`finally`, so a section that throws leaves nothing stood in for the next; the smoke on its own
path, since a thrown error ends the smoke at once), as the checks stand in `pbGames`, `pricedLegs`, `spGames` and
`spSet` elsewhere, so it holds at any hour of the week.

**The lock** (the owner's call of 16 October 2026: "can we have the ability to refresh odds up until 2 hours before
the game before it locks?", and of a locked leg's player ruled out, "Replace that level only"). `spShown(g)` is a
set as the tab shows it. Before `spLockAt(g)` (kickoff less `SP_LOCK_MS`, 2 hours, the kickoff as `kickoff()` reads
it) it is live, `spSet(g.id)`, which a press re-picks, and the tab says so in one short line (`data-sp-phase="live"`,
"Locks Sun 6:20 PM ET, 2 hours before kickoff.", `spEt` in US Eastern; until app v113 it went on "; Refresh odds
updates it until then."). From the lock it waits for the record's read to answer (`PB_REC_DONE`;
`data-sp-phase="loading"`, "Locked since Sun 6:20 PM ET. Loading the site's set…"), then is the site's locked set: the
game's entry in the record's `prime` (`spLedgerOf`: of this season and of the game's kickoff as it stands, taken
before its lock, the last such key), its levels read back by `spTierIn` (each leg by `spLegIn`, on the game's own
id, a level of the wrong size or a leg that is not one refused; its chance and price worked out again on the legs
as kept by `parlayProb` and `parlayDec`, the builder's own sums, so the card pays what Add to builder then pays, the
fair chance the one kept at the lock, cached in `SP_IN`), marked Locked in one line (`data-sp-phase="locked"`,
"Locked since Sun 6:20 PM ET."; until app v113 the line went on to say whose set it is, when the job took it and that
Refresh odds no longer changes it), the same for everyone, which no press changes. A locked leg's own Add puts the leg in as it was locked (`pbLegClick`),
never `toggleLeg`'s reading of the line now, and since app v125 carries `kept:{fair, est}` (`spLegIn`), which `legPrice`
and `legFair` read first, so the builder and the card keep its locked price and fair chance through any later publish or
press; a live set's and the Top lines' go by `toggleLeg`. A set that reaches
its lock with the page open has the record read again (`pbWatch` against `PB_REC_STATE`, the sets' sides of their
locks when the record was last read; a read again that fails keeps the one before). Each set's head gives its
kickoff in Eastern (`spKickEt`), as its lock is said. With no entry, the page's own: the set
built once, at the first draw after the lock, written out by `spTierOut` (the record's own shape) and kept in
`props_sp_lock_v1` (`SP_KEEP` in memory, `{v:1, season, games:{gid:{kickoff, own, at, tiers, rep}}}`, outside `S`),
said to be this browser's and not the set the record grades (`data-sp-phase="own"`, "Locked since Sun 6:20 PM ET.
This browser's own set: the site's was not published in time, so the record does not grade it."); `spKeepSave` prunes a game
that has kicked off, moved or left the schedule on every write and removes the key when nothing is left, and a
browser that keeps nothing still shows one set a load. The record's entry, once a load reads one, takes the place
of the browser's own, which is dropped. A locked level holding a player `spOutWhy` now gives a reason for (the
page's `suggestable`: Out or Doubtful on the latest report, inactive, held out until cleared, questionable, V6's
rule, so the same as every level's legs) is built again by `spRebuild(gid, level)` from the lines at hand, that
level alone, kept in the browser's entry for the game (`rep[level]`: the player, the reason, when, the level in
`spTierOut`'s shape) and marked by `spUpdLine`, one line since app v113 ("Updated in this browser: <player> ruled
out (Sun 6:55 PM ET); this level was built again.", the record's own "Updated: ..."; until then the page's own went on
", so this level was built again from the lines at hand. This page made the change, from the latest published report,
and keeps it in this browser; the record grades the site's locked set, which the props job updates the same way only
if it runs again before kickoff."): the job's runs start 2 to 9 hours late and replace a level only before kickoff, so
the page's change is usually the browser's alone; where the record's level carries its own
`updated` for the same player (the props job's replacement, made on a run before kickoff), the record's stands and
the page's is dropped. `spTier(fid)` is a level by its "<game id>:<level>" as `spShown` gives it, with its game
("SEA at DEN"), for Add to builder and the parlay card, and since app v112 only for a game `spOn()` sets out (null
for any other). `spState()` (each game to come and which side of its lock it is on, and since app v112 `on=` the
games set out) goes into `SP_SHOWN` with each draw, so `pbWatch` redraws when a set reaches its lock as when a game
kicks off, and at the morning a night goes up.

The Parlay Builder is the prop model's own tab (`#parlay`, `tab-parlay`; app v111, the owner's call of 16 October
2026: "move top section with odds, build from, bet types, game checkboxes into new section tab called 'Parlay
Builder'. add leg parlay section for live builder, in that section add refresh odds button and show top 100 line +
profit ratio and allow each line item to be added to parley builder"): the builder (`#parlayBody`) first, then its
choices and the **Top 30 lines** they make (the Top 100 until app v113, `patch_declutter_top50.py`, the owner's call of
17 October 2026: "in parlay builder only do top 50 now instead of 100"; the Top 50 until app v116,
`patch_top30_first.py`, the owner's of 18 October 2026, with a screenshot of the tab: "its only showing top 30, but
honestly top 30 is enough if you want to set it at that", the list having shown 30 rows because the reader had ticked
a few games) (`#pbPanel`, `renderPb()` in `part3.js`, `pbPanel()`, wired by `wirePb()`). Until app v116 `#pbPanel`
came first, over the builder; the owner's "that 5 leg parlay section can we move it up to the top of the page?" (the
same day, of the builder holding five legs under the list) put `#parlayBody` before it in `tab-parlay` (`part1.html`,
and `build.js`'s match of that section), so the builder, empty or not, with its Refresh odds and its stake, is the
first thing on the tab, over the choices and the list. A line added from the list grows the builder above it (a
phone's Safari has no scroll anchoring), so `pbLegClick` keeps the pressed Add's button where it was on the screen
(`window.scrollBy` by the distance the redraw moved it, its `getBoundingClientRect().top` read before and after) and
the focus on it, on the list and on a set's level card alike. The audit's layout check (blocking), the nflbets smoke
and `smoke_live.js` hold the builder first.
The four levels it drew over every game until then (`getPbTiers`' cards, each with a lock on every leg, New legs
and Reset: app v95, `patch_pb_lock_turn.py`, and `PB_VIEW`, `pbLocked`, `pbShownTier`) are gone, every trace of
them; the levels are each prime-time game's own, on Suggested Parlays. Its controls are, in order, the **Bet amount**
box (`#pbStake`, a number box with `inputmode="decimal"`, min $1, max $100,000, step $1), which is the builder's
own stake, `S.stake`: one amount, $20 to start, saved with the prop model's state, set from either box or the
builder's one-tap amounts (its hint says every parlay on Suggested Parlays pays on it). Every level card on Suggested Parlays (`pbTierCard`, which draws the Elo picks too) pays
it times the level's own decimal price, `pbPayHtml(dec)`, under "$25 pays"; each card's `data-pb-pay` holds its
price so `pbPays()` redraws every payout in place, on either tab, as the amount is typed, and the builder follows
250 ms later (`pbSyncBuilder`). The box's `change` (leaving it, or Enter) settles the amount and redraws only the
builder, `renderParlay({keepPb:true})`, so a level's Add to builder or Finish pressed straight after typing is not
lost to a redraw. A typed amount is read by `stakeRead` (a $ sign and thousands commas allowed, kept to the cent,
held to $1-$100,000; `null` for anything not a positive number, which leaves the amount as it was), and the amount
in use is `pbStake()`, which reads a saved value that is not an amount as $20, so nothing drawn from it is NaN. The
Top 30 lines are on $1 and never move with it. Then **Refresh odds** (app v107: `espnCtl`, a 44px button and its
aria-live status line, which reads DraftKings' lines for every game of the week still to come from ESPN on a press;
the same button is in the builder, at the top of Suggested Parlays, over the Props tab's game list, `#slateOdds`, and
on a game's page for that game alone), and the choices, kept in the prop model's state (`S.ui.pb`: `k`, the five
boxes; `off`, the games unticked; `gx`, whether the games list is open): a mix -- All (the default), Teams only,
Players only -- which sets five boxes, Moneyline (`ml`), Spread (`ats`), Game total (`total`), Player overs and
Player unders (a touchdown is an over, as a ladder rung was until app v127 offered none), a box changed by hand lighting the mix it makes, or no mix
at all (`pbMix` answers `custom` inside; there is no Custom tag); and the week's games still to kick off (away @
home, the viewer's own time), all ticked to start, with All and None. The **Top 30 lines** are `getPbTop()`
(`pbTopBuild`, cached in `PB_TOP_CACHE` on `pbSig()`, the levels' own signature of the week, the games, those
unticked, the boxes and `pbDataSig`, so ticking back is instant and a press or a kickoff rebuilds it):
`pbLegs(games, u, {read: true})` on the ticked games, the lists a level is searched from before `pbPool` cuts them
(the preferred, the thin and, with Game total ticked, the totals), every rule above held but for the read option
(app v115, the list's alone: a player's line read by Refresh odds kept with no DraftKings id, **The Top lines keep a
line DraftKings moved**, below), in two parts (app v112, the
owner's call of 17 October 2026, under **Value picks** above): `rows = [...rank(P1), ...rank(P2), ...rank(P3)]
.slice(0, PB_TOP_N)`, `P1` the Value picks (`pref`), `P2` the thin legs and `P3` the totals (`mkt`), each after
`once()` (below) and each ranked on its own by `p × dec − 1`, what $1 on the leg is expected to make at the model's
chance, best first (the lower `pbOrd` on a tie), at most `PB_TOP_N`, 30 (100 until app v113, 50 until app v116), in all: the Value picks, then the other
lines, the thin ones and then the totals, so a thin edge never ranks over a Value pick, and a total, the book's own
chance and never a Value pick, comes last, the order a level fills in. The totals' place is set, never left to the
sort (app v112's second round): a total priced on one side only is put at 50% (`totalOver`, with a price missing),
so at plus money it can be expected to make more than a thin leg (its over alone at +120: +$0.10 on $1), and ranked
with the thin legs, as app v112 first had them, `[...rank(pref), ...rank([...thin, ...mkt])]`, it came before them
(until app v112 the first group was the preferred legs and the totals, the thin ones after them). **Each bet once**
(app v112's second round, the owner, 17 October 2026: "why there are several instances of this where it's only a
half yard difference? i find it hard to believe that draft kings would let me bet both on the same parlay"; week 6's
list held seven such pairs, Patrick Mahomes's Over 224.5 and 225+ passing yards ranked 1 and 2 at -113 each; dormant
since app v127, when `pricedLegs` stopped making rungs, **No ladder bets** under "Props: how it fits together", so no
rung reaches the list, `same` is 0 on every real list and the checks hold it on made-up lines alone): a
ladder rung k+ lands exactly when the player's main Over at k-0.5 on a half-point line does and is priced from it,
so `once()` drops from every part a rung (`rungOf`: not `isGameLeg`, not `main`, side over) whose
`gid|pid|stat|k` is in `mainOver`, the set of `gid|pid|stat|k+0.5` of every main Over among `pref` and `thin` with
`k % 1` 0.5. The main line stays wherever it ranks (a rung that was the Value pick goes for a main line that is a
thin leg too), the rung goes even where its main line ranks past the 30th, and its slot goes to the next line; a
whole-number main line (Over 225 pushes at 225, where 226+ loses), an Under, a main Over that does not qualify and
another game's never take a rung's place. `out.same` counts the rungs dropped (on `getPbTop()`, drawn nowhere). A
level never took both (one leg a player) and the builder holds one leg a stat (`legKey`), so it was the list alone,
and the sets are untouched. `pbPanel` draws the two
parts, the rows' prefix of Value picks first: `h3.pb-topsec[data-pb-sec="value"]`, "Value picks" and its count in a
`.pill`, a `p.pb-topsub` saying what a Value pick is, and `ol.pb-top[data-pb-sec="value"]`; then
`h3.pb-topsec[data-pb-sec="other"]`, "Other lines" and its count, a `p.pb-topsub` saying what they miss ("These miss
a Value pick's bar (3 points above the chance the price implies, and market + form agreeing on a player's line),
though the model still rates each at or above the book's price; the game totals, at the book's own chance, come
last. A suggested parlay takes them only where its Value picks run out.", the market + form clause where `form`, the
totals clause with Game total ticked), and `ol.pb-top[data-pb-sec="other"]` with
`start` the rank after the last Value pick (none when there is no Value pick), so the ranks run on across both. With
no Value pick and some rows, the Value picks heading has no count and `p.pb-topsub[data-pb-novalue]` under it says so
("No line on your picks is a Value pick right now."); with no other line, no Other lines part. Each row (`pbTopRow`,
`li.pb-trow`, `data-pb-row` its rank, `data-pb-grp` its part, value or other, where it was edge or thin with the first thin row under a gold rule
until app v112) gives the rank, the player or team
with the line and its game (a Value pick marked Value, `pbValMark`, and no other row marked; under the game, on a
read's leg kept with no id, `pbTopSlip`'s line since app v115, below), its price (est. on a
`dkline` leg, titled as everywhere),
the model's chance (`data-pb-model`), the book's fair chance (`legFair`; `data-pb-fair`, "fair, est." where it is,
"no fair" with none), what $1 wins (`data-pb-win`, the decimal price less 1) and what $1 is expected to make
(`data-pb-ev`), and its Add (`pbLegAddBtn`, the sets' own): the five figures in a row beside the name on a wide
screen, under it from 1,100px, three to a row from 640px. A note says where the totals go whenever Game total is
ticked ("Game totals are never Value picks: each is priced at the book's own chance, so the totals come last among
the other lines, and on a long list the 30 lines can end before them."); the lead and the foot say the order (the
lead "first the Value picks, marked Value, then the other lines, the game totals last, each part ranked by ...,
best first, 30 lines at most.", the foot "... each part ranked by what $1 on it is expected to make, any game totals
last, 30 lines at most in all. Only main lines, anytime touchdowns and team bets are listed: no ladder bets, such as
250+ passing yards or 2+ touchdowns.", which until app v127 said "Each bet is listed once: a ladder rung that is the
same bet as the player's main line (225+ passing yards and Over 224.5) is shown as the main line."). The audit's `topAud` (`topFullAud`, with its own rung rule, `sameBetAud`) and
the smoke's `pbTopOwn` (`sameBetOwn`) work the order, each bet once, the parts and the marks out on their own, and
hold each part as drawn: its heading and count, exactly its rows under it in rank order, the second list's `start`,
the parts in that order, and with no Value pick the line saying so; on the week as it stands, no row a rung whose
half-point main Over qualifies, `same` the count they work out, and no Value pick after a thin leg or a thin leg
after a total (the audit reading each row's part from its own pool, never the page's marks); and the audit each
main line a rung was dropped for exactly at its rank in the order without the dropped rungs, and the list the first
30 of that order, at most 30 rows drawn, under "Top 30 lines". The heading (`Top ${PB_TOP_N} lines`), the lead, the
foot, the totals' note and the empty builder's line ("... or a line from the Top 30 below.", "above" until app v116
put the builder over the list) all read `PB_TOP_N`; the checks keep their own copies of 30 (50 until app v116), the
audit's `TOP_N_AUD` and the smoke's `PB_TOP_N_OWN`, never read from the page (the heading and the cut blocking, the
words warnings in the audit, the empty builder's "below" among them, which the smoke holds blocking). Until app v127
only the smoke met a priced ladder rung on the week as it stands (week 6's list left out 7; the audit boots with no baked
odds, `NO_BAKED`, `S.odds` empty, so its real lists carried none); since, no rung reaches either's (the audit's NL1 and
the smoke's no-ladder checks hold `same` 0), and their made-up games (M12 for the audit) hold the rule. Both again on made-up games of their own (`pbGames` and `pricedLegs` stood in, each in its own slot
and put back on every path, so they hold on any day, the off-season included; each case's answer written beside
it): a main Over 224.5 passing yards with its 225+ rung dropped, a whole-number Over 225 with its 226+ kept, an
Under main line with a rung on its stat kept, a 225+ rung in another game kept, a Value-pick rung dropped for its
thin main line, a rung whose main line does not qualify (or has none) kept, and the game's total priced on its over
alone at +120, put at 50% and expected to make $0.10, more than any thin leg there, still after every thin leg (the
smoke: nine rows in an order worked out by hand, six Value picks, two thin legs, the total, `same` 2, market + form
stood in for the made-up players; the audit's M12 A, and B: 103 lines once its nine rungs are dropped, more than the
30 the list holds, eight Value-pick pairs at the top, whose freed slots go to the lines ranked 23 to 30 without them,
the 31st off the list, exactly 30 rows drawn, and a thin main line past the 30th off the list with its rung dropped
all the same; until app v116 the same lines cut at 50, the lines ranked 43 to 50 taking the slots). The smoke holds
the cut on sixty made-up games of its own too (Moneyline only, each home side at -110, twenty Value picks rated 60.0%
down to 58.1% a tenth of a point at a time and forty thin legs 55.0% down to 53.05% a twentieth at a time; forty and
twenty, cut at 50, until app v116): the first 30, the twenty (H100 to H119) and the ten best thin legs (H120 to H129),
H130 to H159 off, under "Top 30 lines", the parts counting 20 and 10, the second list starting at 21; and it fails
unless some list it held had more lines than 30 (`topOver`). Which lines, their part, rank and numbers are blocking; the words are
warnings in the audit (`W.wording`) and fail the smoke, which has no warnings.

The notes over the list say what the all-games panel's said: the Elo ratings still loading, a line marked est. and
when DraftKings' lines were read, the totals' lack of edge, no player line able to go on DraftKings' betslip yet or
no player lines in yet (since app v125 with when DraftKings' lines were last read from ESPN, `pbNoPl`; until then with
when the player prices are pulled), how many lines are left out far off the market and why, and
how many for want of a DraftKings id, apart: those DraftKings had at another number (`mvN`, which the card puts on
at DraftKings' number from the game pages; since app v115 only those still left out, a line with a real price whose
id is at another number or a spread or total at nflverse's number, since a read's line the list keeps never reaches
it) and those it had none for (`noneN`), each still on the game pages to add to the builder. An empty list says why (`pbTopWhy`: no box or no game ticked; since app v125 no player lines yet,
`pbNoPl(ids)`: "No player lines yet: DraftKings had posted none for these games when its lines were last read from ESPN
(Tue 8:07 AM ET). Press Refresh odds to read them now.", or that they "have not been read from ESPN yet", the published
read or a press, `espnLastRead`; until then no player prices yet, `PB_NO_PL`, gone, with when they are pulled; or, the
dormant id rule's, none DraftKings' betslip can take, `PB_NO_ID`, "a player’s line read from ESPN carries no DraftKings
id."; under Players only or after "No line on your picks qualifies yet, and" under a mix; else "No line
on your picks qualifies yet: tick more games or bet types.", "that DraftKings' betslip can take" where legs were
left out for want of an id). With no game left to come the panel says so (the season over, or the week's games all
started). The builder, empty or holding legs, has a Refresh odds of its own (`espnCtl(null, 'builder')`, its own
status line, `espnRedraw` keeping the focus on it, as it does inside `#parlayBody` and `#spPanel`). The level
engine (`pbPool`, `pbTier` and the searches, `pbBuild`, `getPbTiers`) is kept and only widened: `pbAllows(l, u)`,
`pbLegs(games, u)`, `pbPool(games, u, opt)` and the searches take the choices and the widths as arguments,
defaulting to the reader's own and `PB_SEARCH`, so a call as before is exactly as before; `getPbTiers()` still
builds the all-games levels on the ticks, which nothing on the page draws, and the audit and the smoke hold the
engine through it. The search is a beam over a pairwise approximation of the copula (each correlated pair's joint
chance exact, by a Plackett integral), its finalists worked by `parlayProb` with fewer draws, and the winner by the
builder's own `parlayProb` and `parlayDec` on the legs in the builder's order, so Add to builder shows the same
price and chance as the level did. A game that kicks off with the page open leaves the games list, the list and
Suggested Parlays at the next look (`pbWatch`, every 30 seconds, through `pbStale`: the games drawn, `PB_SHOWN`, or
the sets' sides of their locks and the games set out, `SP_SHOWN`, no longer what they are) or draw. The old Suggested parlays window
(`suggModal`, its Any/overs/unders switch and stake box) is gone; a game page's High/Medium/Low suggestions stayed
until app v124 took them off the page (below, the game page's windows), their pool (`gameLegPool`) held to the same
id rule since app v109 (`gameLegPool(g, true)` every leg as before, so `gameTiers` counts the legs the ids left out,
and until app v124 a hand left empty for want of them said so and why, `gameNoIdWhy`, gone with the card: its player
ids not pulled yet, never for Sunday's early games, `dkEarlySunday`, or none for its other lines); the engine is kept,
drawn nowhere, and held to the rule still, as are the Elo picks (`eloPicks` in `tab_elo.html`, which says why where none is
left); dormant since app v125, no entry a read of ESPN makes carrying ids.

**Only the bets DraftKings offers** (app v113, `patch_declutter_top50.py`, the owner's call of 17 October 2026: "there
are certain bets in the props that are not part of draft kings like for FG attempts. i only want to show legs that
draft kings does."). The page's reader of DraftKings' lines on ESPN knows which player markets DraftKings posts
(`ESPN_MAIN`, `ESPN_MILE` and the anytime touchdown: passing yards, completions, attempts, passing touchdowns,
interceptions, carries, rushing yards, receptions, receiving yards, rush + rec yards, kicking points, field goals made),
and FG attempts was the one stat the page offered as a bet outside them. It joins targets in `NO_BET` (`part2.js`):
projected still (a kicker's field goals made and kicking points stand on it), never a line on a game's page (`statLines`
leaves it out) and so never a leg of the builder, a set, a game page's hands, the Top 30 or the Elo picks.
`renderParlay` takes an FG attempts leg a visitor's builder kept from before (`S.parlay`) out on its next draw, as it
takes out a started game's, with a line, `data-pb-notdk` its count ("1 leg was removed: DraftKings does not offer FG
attempts."), and `toggleLeg` returns on a `NO_BET` stat, so no path adds one. The audit's M13 holds it on its own copy
of DraftKings' markets (`DK_PLAYER_AUD`, `DK_GAME_AUD`, `NOT_DK_AUD`, never the page's `NO_BET`: every projected stat
in one or the other and the reader's markets the copy's), on the week as it stands (every game's page, `pricedLegs`,
the hands, the Top 30, the sets, the all-games levels and the builder) and on a made-up Monday night of two made-up
kickers whose FG attempts and field goals made are each priced as a Value pick with DraftKings' ids (field goals made
reaching every place, FG attempts none); the nflbets smoke on its own copy (`NO_BET_OWN`) on the week, on a made-up
Sunday night game with FG attempts priced and given ids for the schedule's kickers, and on a leg kept from before
(removed with its line, `toggleLeg` adding none); both blocking.

**The Top lines keep a line DraftKings moved** (app v115, `patch_top50_moved.py`, the owner's call of 18 October 2026:
"any idea why the player props are not showing up in the top 50 anymore? :/"; history: reversed in app v119,
`patch_top_id_only.py`, the owner's "only ones i can add via id", when `pbTopBuild` dropped the read option, `kept` and
`pbTopSlip`, and the id rule itself dormant since app v125). On a fresh load the Top 50 held 43
player lines of 50; a Refresh odds press reads DraftKings' current player lines from ESPN, by Sunday morning most had
moved since the Saturday pull, a line the read has at another number is priced there by the formula (src `dkline`,
est.), and ESPN gives no DraftKings id for a player's line, so the id rule (app v109, `dkCarries`, `dkIdOf`) left
every such line out wherever the payload carries ids: on that morning's payload with every priced main line moved by
half a point, 40 rows with 7 player lines, and the press, kept in `props_press_v1` until a newer publish, kept them
out across a reload. `pbLegs(games, u, o)` takes `o.read` (the Top lines alone, `pbTopBuild`): `readKept(c)`, a leg
with `src === 'dkline'`, not `isGameLeg`, its `espn` read `tested` and `listed` (a main line over or under on passing,
rushing or receiving yards, receptions or passing touchdowns, the anytime touchdown, a yards rung DraftKings lists;
`pricedLegs` gives no other), stands as one with an id, so it qualifies by every other rule as before (the band, the
3-point edge and market + form for a Value pick, the far-off guard on its estimated fair chance, V6, `once()`, the
totals last) and ranks with the rest; `kept` counts those with no id (`getPbTop()`'s `kept`, drawn nowhere), and since
they never reach the left-out count, "left out: DraftKings had them only at another number" counts only what is still
left out. Everything that builds a parlay is unchanged and slip-only: `pbPool` and so the sets and `getPbTiers`, a game
page's hands (`gameLegPool`) and the Elo picks call `pbLegs` without it. Such a row carries one quiet line under its
game, `pbTopSlip(l)`, `small.pb-tslip[data-pb-slip]`: "Moved since DraftKings’ prices were pulled" (`moved`) where the
pull read that main line of his at another number (`PAY.mkt`), else "No DraftKings id at this line" (`none`: a
touchdown, a rung, a main line the pull had no price for), then, where the parlay card is on the page, what its plan
for the leg (`dkPlan`, read through `dkSlipRows` as the builder's rows read it) does on DraftKings' slip: ": the slip
link has the old line, 224.5" (the id the pull read at the old number, `dkNear`), ": the slip link has Over 224.5
passing yards instead" (a line it converts) or ": add it on DraftKings by hand" (no id); on the prop model's own page,
which has no card, the cause alone. The audit works it out on its own (`readTopAud`, `dkTopOk`, `slipAud`, `SLIP_AUD`
the prop page's words; `qualAud`'s top mode; `holdTop` each row's line, blocking, its words `W.wording`; M8 after its
press) and on M14, a made-up Monday night game of two made-up clubs and four made-up players on which a press moves the
quarterback's passing yards, a receiver's receiving yards and a back's rushing yards (tested) and the quarterback's
completions (untested), leaves a second receiver's receptions where the pull had them and reads his receiving yards
alone: before the press and after one that moves nothing, the pull's lines alone with their ids; after it, every moved
tested line on the list at the read's number at the rule's price, marked moved, the one the pull had no price for
marked none, no completions line, the unmoved receptions at the pull's price with its id and no line; nothing from the
read with no id in a level, the set, a hand's pool or a hand; the counts the audit's own; with no ids carried the
read's legs listed as before with no line; blocking, on made-up data. The nflbets smoke (no warnings) holds it with
`qualOwn`'s read option (the Top lines only) and `slipOwn` in `holdTop` (every row's line, its kind worked out on its
own from `PAY.mkt` and the ids, its words from the card's own plan), and in its Refresh odds section, on a payload baked
with ids: the Top lines after the press keeping the read's legs with no id, each with its line, while no level, set or
Elo pick holds one; a plant of the pull at another number on one of the read's main lines marked moved with "the slip
link has the old line", the old number offered nowhere; without the parlay card the cause alone; and both kinds met
(`SLIP_SEEN`).

**The book's fair chance, and legs far off it** (app v98, after the review of Sunday 11 October 2026
found the model over-confident against DraftKings every week since week 2: on that Sunday's 389 main
lines its Brier 0.258 against the book's 0.243, its sides 10-20 points above the book's fair chance
landing 50% where it said 64%, 20+ points 55% where it said 77%; the 1pm Safe pair said 53% where its
fair chance was about 24%). Labelling and selection, never a refit. `legFair(l)` in `part3.js` is a
leg's fair chance, DraftKings' prices with the margin taken out: where both sides of the same line
have a real price (a player's main line over and under in `PAY.mkt`, a game's two moneylines or its two
spread prices on the leg's own number, the total's `tov`/`tou` on the posted total) that side's no-vig
chance, `mlProb(own)/(mlProb(own)+mlProb(other))` as `devigOver` works it; where one side is (a ladder
rung, an anytime touchdown, a team line or total missing its other price, a main line the payload has
moved), the price's implied chance over the week's typical overround on two-sided lines of its kind
(`fairVig`: the median, over that week's two-sided lines, of the two implied chances summed; player
main lines for a player's leg, the moneylines, spreads or totals for a game's; every kind's where the
week has none of its own; none at all, no fair chance), worked from the payload on every call, never
a fixed number, `est: true` and marked est. wherever it is shown; a leg with no real price
(`legPrice`'s est. or fair) has none. `parlayFair(legs)` is `parlayProb` on the legs with each chance
replaced by its fair chance (legs in one game move together as the model's do); `p` is null, with
`miss` legs counted, where a leg has none. Every level carries it (`pbTier` wraps `pbTierOf`;
`pbWithFair`), and so do a game page's hands (`gameTiers`, drawn nowhere since app v124) and the Elo picks (`eloPicks` in
`tab_elo.html`). `pbTierCard` leads with it (`pbChanceHtml`: the figure, "fair chance" or "fair
chance, est.", and "model says 53%" beside it, the Elo picks' "Elo says"; with none, the chosen-on
chance and "no fair chance: a leg has no book price"); the levels are still chosen on the model's
chances, the floors included, so a level over its floor is ruled "... by the model". The builder's
summary leads with it ("fair chance all 3 land", "model says ..."; with none, "model's chance all 3
land" and why, in a line under the figures), each leg row gives its own (`.legfair`), and a game
page's hand led with it where every leg had one until app v124 took the hands off the page. A leg whose model chance on its side is `FAR_OFF`
(0.15) or more above its fair chance (`legFarOff`, to a billionth; only where a fair chance exists) is
left out of the preferred and thin lists every suggestion is built from (`pbLegs`, which counts it in `far`;
the Parlay Builder's note says how many lines and why), so of every set and the Top 30 lines, and of a game page's
hands (`gameLegPool`), and is flagged "model 77% · market
55%: far off the market" (`farText`) on the game pages (player main lines, the touchdown on a book price, and the
rungs until app v127 drew none, the Game bets card's team lines: a `p.faroff` under the table and the row marked
`far`), in the builder's rows and on an Elo pick, whose own selection is the Elo matchup chance and is
left alone. A total is the book's own chance and so never far off. The audit's M (every level's fair
chance to `parlayProb` on its legs at theirs, no far leg, the card leading with it) and M7 (the rule
worked on its own from the payload and held to `legFair` case by case: both sides, a moved main line,
a rung, a touchdown, both team lines, a spread on another number, the total, one side missing, no line
of its kind, none at all, an estimated price; then made-up lines one in three 25 points above the
book's fair chance and one in three 6 points above: the pool's count and note, no far leg on a level
or a game hand, the flag on the game page (main lines, a touchdown on a one-sided price, and since app v127 a rung
priced so beside it drawing no row, box or flag; the Game bets card's to win and to cover) and in the builder, the builder's summary and its confidence tile,
which rates the fair chance where there is one (app v100), and until app v124 each game hand as its card drew it,
with made-up hands sure to take every branch, which went with the card) hold it, and the nflbets smoke and `smoke_live.js` section J
hold the same on the page, the Elo picks and the card. App v100 (`patch_honest_review.py`) also says on
a game page that its hands' floors are by the model's chance and lets the panel's fair-chance label wrap.

**The suggestions record** (app v99, `patch_suggest_record.py`; the third change after that review; since app v111
the record of Suggested Parlays, the owner's call of 16 October 2026: "do similar tracking/grading as ELO tracking";
every prime-time game's set, shown on the tab or not, since the tab's night rule, app v112, is `spOn` and the record
reads `spGames`) is what the page suggested, written down before the games and graded after, so how the suggestions do is read off
the page rather than remembered. `props/build/suggest_ledger.js` runs in the props job (`weekly.py`, once the audit
is clean; never a reason to refuse or redden a run). It boots the published page, the root's `index.html`
(`nflbets/index.html` until 17 October 2026), in jsdom at the site's root on
the payload just baked, the Elo files beside it (market + form decides which player legs qualify, so the props app
alone would not be the page a visitor sees) and the window's clock held at the run's time (moving, a boot of a few
seconds could carry it past a lock or a kickoff the script still counts as to come), and reads each prime-time
game's set with the page's own `spGames`, `spSet` and `spTierOut`, into the ledger's `prime` map, keyed
`season|WW|kickoff|game id`: `{season, week, gid, away, home, kickoff, lock, baked_at, pool, tiers, taken_at}`,
`grade` once the game has kicked off and `updates` once a level has been replaced. A set locks at `spLockAt`, 2
hours before its kickoff (the script refuses a page that locks at another time): while the lock is to come a run
rewrites the entry whenever the set has changed, and from the first run at or after it the entry is locked, holding
the version the last run before the lock wrote. GitHub starts this repo's runs 2 to 9 hours late and not every
hour, so that is the last publish before the lock, which may be many hours before it (`build/test_lock_runs.py` holds
`props.yml`'s crons to every lock: a run sure to land before it, reading no more than 12 hours before it). Since app v125
the sets stand on that run's own read of DraftKings' lines on ESPN, which the payload carries and the page installs, so
from week 7 the record is graded at the page's estimated prices on DraftKings' lines (weeks 1-6 and the backtest on the
paid pull's real ones); the script refuses a page that applied none of the payload's well-formed read, or asked ESPN's
player lines on load. A game no run reached before
its lock has no entry (the page builds its own, above), and an entry not yet locked whose game is no longer a
prime-time game to come is dropped. From the lock to kickoff one change is allowed: a level holding a player the
page now keeps out (`spOutWhy`) is built again by `spRebuild`, that level alone, and carries `updated` {pid, name,
reason, at}, the same appended to `updates` with the level's id. The `entries` map is the all-games panel's record
from 12 to 16 October 2026 (keyed `season|week|kickoff wave`, the earliest kickoff among the games still to come,
rewritten while that kickoff was to come and frozen from it, its four levels on the default choices read with
`getPbTiers`): no wave is taken any more, an entry not yet frozen is dropped, and the frozen ones stay to the byte
but for their grades, still graded and summarised in `summary`. Each level keeps its legs (game, week, player or
team, stat, line, side, price, the model's and the fair chance), its model chance (`parlayProb`), fair chance
(`parlayFair`) and decimal price (`parlayDec`), or why it is empty. A frozen or locked entry is graded by the app's
own `settleLeg`/`settleGameLeg` once every leg has settled: a loss loses; a push or a void drops out, the rest paid
at `parlayDec` on the legs left; every leg a push or void is a push; a grade once made is replaced only by a
complete one; only the page's own season is graded. A player with no stat line is graded by `settleLeg` on the
payload's `snaps` (below): a snap and he is graded on zero, none with his club's snaps in and he is void; no snap
counts yet, Out on the report is void and anything else waits. `prime_summary` counts each season's game and level
once, from the last key that holds it (a kickoff the league moved makes a new key), as the page's `spRecSum` does;
`summary` counts each old parlay once (an entry was the whole week's panel, so a parlay unchanged across waves is
in each; the same legs of the same level in a season's week count from the last entry that holds them). Its guard
holds the new ledger to the one the run started from and to the last commit's: an old entry frozen and gone or
changed (grades aside), or taken at or after its kickoff; a prime entry whose key is not its own fields, whose
kickoff is not a Thursday, Sunday or Monday at or after 7 pm Eastern (worked out with `Intl` on its own), whose
lock is not exactly 2 hours before it, taken at or after its lock, with a leg on another game or a level short of
its legs, or, once locked, gone or changed beyond its grade and a replacement the rule allows (in `updates`, which
only grows, made from the lock to kickoff by this run for a player the level held and does not hold now); an entry
new or changed not by this run; a grade that does not follow its legs or a summary that does not follow from the
entries: refused, the file put back (the last commit's where the disk copy had moved), exit 1.
`test_suggest_ledger.js` (about a minute) runs the script on made-up weeks cut from the payload (or
`SL_TEST_PAYLOAD`'s), its prime-time games moved where each stage needs them (those a week of few games lacks made up
between clubs of its own, each with a row of zeros so its stats are in) and prime time worked out on its own (taken for every prime-time game and
none other, rewritten before the lock and a second before it, unchanged, locked with the last pre-lock version, a
run hours late, a game whose lock no run reached given none, one flexed off prime time dropped, a ruled-out
player's level replaced and that level only, nothing but the grade after kickoff, graded on planted wins, losses,
voids and pushes worked out from the raw rows, the payload's snaps and the injury report, last season's entries
never regraded, a repeated parlay and a game's level two kickoffs hold counted once, no game to come, the guard end
to end, on hand-made ledgers and on a copy of the real one; since app v127 every leg of every set and its Elo picks a
game bet, a main line or the one touchdown, `offeredOwn`, though its read carries yards milestones). The page reads the file beside the payload
(`PB_REC_URL`, no-store, `PB_REC` outside `S`, `PB_REC_DONE` once the read has answered either way; a file with
neither map an object is none) and draws, at the top of Suggested Parlays, the record (`#spRec`, `spRecHtml`): a pill
a level (`data-sp-rec`), won-lost and units on $1 from the `prime` entries' grades by `spRecSum` (a push and a
pending level counted apart, a win a push shortened at what it paid; the wins expected by the fair chance and by
the model's in each pill's title), "No prime-time set graded yet" until one is, "Pending N" beside them, and a line
saying it starts with this change, 16 October 2026, and that Refresh odds never changes it; no file, nothing. The
all-games record (`pbRecHtml`, `pbRecSum`, under the panel until app v111) is drawn nowhere. The audit's P2 and the
nflbets smoke hold it on made-up ledgers (and the smoke on the real file).

The Parlay Builder works as ever, and its Save and lock is **Finish parlay** on every device, which
opens the **parlay card** (`nflbets/build/card.html`, every name `pc-`, set in by the build like
the tabs):
a window (`#pcModal`, the page's modal style, over everything; Escape, Close or a click outside
closes it, Tab stays inside it, the focus goes back to Finish) showing the parlay as a card --
each leg (who, the builder's own label for the market, line and side, the game and its kickoff,
its price and whether that is the book's or an estimate), the parlay's price as the builder
works it out (American, decimal and implied), the stake and what it pays, the book's fair chance
first ("Fair chance all 3 land 21.0%", "(est.)" where a leg is priced on one side only), then the
model's ("model says 15.9%"; an Elo pick's, "Elo says") and the price's implied chance, or with no
fair chance the model's and the price's and "No fair chance: it needs every leg's book price"
(`chanceLines`, read by the window, the image and Share link's text alike), the week and its
dates, the site's mark and address -- and **Download
image** saves it as a PNG (`parlay-week6-3legs.png`), drawn with the canvas 2D API at twice its
size (no library) and handed over by `canvas.toBlob` and an `<a download>`; where the browser
can share a file (`navigator.canShare({files})`, a phone) a second button opens the share sheet,
which is how it reaches Photos. Every dollar figure is shown whole with its thousands marked
($17,620.00), never cut with an ellipsis: in the window Stake, Pays and Profit are flex tiles no
narrower than their figures, so one too wide for three across goes onto a second row; on the image
the figures step down from 19px to 14px to fit three across, then the tiles take two rows (Stake
and Pays, then Profit the card's width), then one to a row, the card growing to hold them.
**Open in DraftKings**, a link in a new tab, opens the parlay on DraftKings' betslip
(`https://sportsbook.draftkings.com/?outcomes=<id>+<id>`, each `#` as `%23`) from the payload's `dk`, every
leg it has an id for in the card's order (`dkLeg`, `dkPlan`), and where it has none, the game's page
("Open game in DraftKings", every leg in one game to come) or DraftKings' NFL page ("Open DraftKings"),
`dkPlan`'s `home`, to add them by hand. Since 20 October 2026 the ids in `dk` are a read's of ESPN alone (the published
read, a press, the card's check: DraftKings' event and its moneyline, spread and total ids, never a player's), so a
visitor's Open in DraftKings carries only team legs and totals, every player leg is named to add by hand with the ESPN
read's reason (`dkNoLine`, `dklineWhy`, `DKLINE_WHY`: "which gives no DraftKings id for a player’s line: add it on
DraftKings by hand"; a team leg with no ids, `dkNoGameLines`), and one line under the buttons says so (`BYHAND`, where a
leg's game carries no paid player ids); on the admin's card Pull from DraftKings (below) gives the player legs their ids.
The paths below that read a player's id from `dk` stand for a payload a pull by hand baked ids into, and since app v127
(**No ladder bets**, under "Props: how it fits together") those for a rung k+ and 2+ touchdowns (the conversions, the
moved rule's rung, Pull's ladder markets) stand, dormant, for a Suggested Parlays set locked before that day and a pull's
ids, no ladder bet reaching the builder or a live set. Since app v109 (the owner's call of 16 October 2026, after a parlay
that opened only its first leg) the card converts a leg rather than leave it off: where DraftKings has no
id at the leg's own line but has the same bet at another number, `dkLeg` returns `{id, at, swap, now}` and
the leg goes on at DraftKings' number (`dkNear`: a spread the same team's, a total the same side, a
player's main line the same player, stat and side, at the newest number a Refresh odds press read,
`espnIdAt`, else the page's main line for him where DraftKings has it, else the closest number, a tie to
the lower; a rung k+ with no Over k-0.5 or k-1 the player's Over at DraftKings' closest number for that
stat; 2+ touchdowns the anytime touchdown; a moneyline and an anytime touchdown exact or nothing). An id
at the leg's own line is taken unless a press read since has DraftKings at another number, and a `dkline`
leg is looked up like any other. `dkPlan` returns `swaps` and `each` (every leg's reading, in order) beside
`ok` and `miss`; the note lists each converted leg ("On DraftKings' slip at its own line: 2. Card Runner,
100+ receiving yards: goes on as Over 64.5 receiving yards", `data-pc-dkswap`) and says DraftKings prices
a changed leg at its own line, so its slip's payout can differ from the card's, whose legs and price are
the builder's, untouched; the button reads "Open in DraftKings" where every leg goes on and "Open 2 of 3
legs in DraftKings" where one does not. The builder says it first: where the card is on the page,
`renderParlay` reads `window.PARLAY_CARD.dkPlan` on its legs (`dkSlipRows`) and puts a quiet line
(`dkSlipLine`, `small.dkslip` in `--ink-2`, `data-dkslip`) under a leg that will not go on as built, "On
DraftKings as Over 64.5 receiving yards" or "Not on DraftKings' slip: " ("... slip yet: " until app v125) and the reason in a few words,
nothing under one that goes on as built, and nothing on the prop model's own page, which has no card.
Under the buttons the card says what it
opens, dated by the oldest read of the legs it opens (`dk`'s `at` and `glat`): the legs as DraftKings had
them at that read, never a promise that every leg lands, since DraftKings drops an id whose line has moved
or been pulled since and a game's player ids are read once, from a few hours to about 40 before its kickoff (Sunday night's on Saturday) (the day-long
promise it made before went in October 2026, with `dkPlan`'s `fresh`), links each leg on its own, and names the legs it
cannot open and why (since app v125 a player leg on a game no pull by hand read the ESPN read's reason, above; until then,
and still for a game a pull by hand read but for the first two, the paid pull's: the
game's prices not pulled yet, its player prices not pulled yet, both with when they are and only for a leg
on no book price in a game the payload has no DraftKings player price for (`dkPlayerPriced`, `dkLinesPriced`,
`dkBooked`; a rung adds that once they are it goes on as his Over at DraftKings' line on the stat, 2+
touchdowns as his anytime touchdown), a market the pull does not read (`DK_READ`, oddsfetch's
DEFAULT), no ids for its game (all of them in a payload baked before `dk`), a player's line on no book price
DraftKings did not offer when read, 2+ touchdowns with no anytime touchdown of his among prices read
("DraftKings did not offer his anytime touchdown", dated), a rung with no line of his on its stat among them
("DraftKings had no <stat> line of his", dated), a `dkline` leg the pull's ids have nothing for (`DKLINE_WHY`), or a game kicked off;
until app v109 a line DraftKings had elsewhere was named too, "DraftKings had it at 79.5 when its lines were
last read", and left off the slip, where it now goes on at 79.5).
Since 19 October 2026 (the owner's report on Monday night's Commanders at 49ers, "same thing again.... put in that
link and its only showing" one leg of four: the pull's ids for the total and McLaurin's receiving yards dead by the
evening, DraftKings having moved both lines) the card checks DraftKings' current lines as it opens: `open()` reads each
game of its legs still to kick off in turn through the page's Refresh odds reader, `espnRefresh(gid)`, unless its player
lines were read (answered or found not posted, `ESPN_OUT`) in the last two minutes, waiting for a press already running.
While it reads, Open in DraftKings ("Checking DraftKings’ lines…", no `href`, `aria-disabled`, `aria-busy`) and Share
link wait (a press of Share link says "Checking DraftKings’ lines first…"), the note under them is its waiting line
alone, with no leg's own link (`data-pc-dkwait`), and Download, Start over and Close work; it waits at most `CHECK_CAP_MS` (10 seconds), then works on the plan
as it stands with the line "Could not check DraftKings’ current lines: …", as a read that fails does, and a read ending
later still updates the same card. Done, it works `dkPlan` again on the same legs (`m.dkLegs`) and draws only its
DraftKings part (`paintDk`: the button and `#pcDkNote`, which ends "Checked against DraftKings’ lines at <time> ET."),
the focus kept, and says the outcome in its status line (`#pcMsg`); `ck` is the open card's check, so a card closed or replaced is never drawn from an older read, and
`PARLAY_CARD.checking()` (a promise) and `checkState()` say where it stands. A moved total or spread then goes on at
DraftKings' current number on the read's id (`dkNear`), and `dkLeg`'s moved rule (`dkReadLine`, `dkMoved`) leaves off a
player's id read by the pull before the newest read of his game's player lines where that read has his main line on the
stat at another number ("DraftKings has moved his receiving yards line to 49.5 since its prices were read (…), and its
slip drops a moved line: add it by hand at 49.5"; brief "moved to 49.5 since it was read"; a ladder rung whose main line
moved to anything but its own number, k-0.5 or the whole k-1, names its own bet: "add 4+ receptions by hand (DraftKings’
Over 4.5 is another bet)"). A line moved and moved back, or re-posted at its number, takes a new id no free read can see:
the note's caution stands for it. The read is a press for those games (a live set of them re-picks on it), and the page
under the card is drawn once, after the last game is read: the card holds the page's `espnRedraw` back during its own
reads (`holdRedraw`), since each redraw empties every cache and draws the tabs again (about half a second on Suggested
Parlays in Chromium). The page under an open card never scrolls (`keepModal` puts body's `modal-open` back whatever
redraw takes it off), a control a redraw replaces is found again by an attribute it keeps (`lastFocus`, `refind`), and a
closed card's focus goes to its Finish or the one standing for it, its set's Add to builder or heading, or the chosen
tab's button, never a hidden tab's control or the body (`backTo`).
**Pull from DraftKings** (20 October 2026, the owner's call; CLAUDE.md, "Pull from DraftKings", has the whole of it): on
the site owner's devices alone (`HUB_ADMIN.on()`, the admin link's), the card's first button (`#pcPull`, `data-pc-pull`)
spends his Odds API credits on that parlay's player legs, through `window.HUB_ADMIN.odds` alone. `pullPlan(legs)` asks one
market a player leg (`PULL_BASE`, `oddsfetch.py`'s MARKETS turned round; since app v127 the base markets alone on a live
page, the ladder paths that follow dormant for a set locked before that day; a rung the `_alternate` ladder, `PULL_ALT`,
unless the base market holds its Over k-0.5 or k-1: where this load's own pull of the base market has rows of his that
the moved rule has not set aside, those rows decide, else DraftKings' main line now, `mainNow`, the ESPN read's else the
payload's, being k-0.5; where the moved rule has set them aside, the base market again, since `pullFor`'s moved verdict
reads that pull and only a fresh one clears it (`pullMarket`, the second review of 21 October 2026: the ladder alone left
the leg dead, a credit on every press), then the ladder where the fresh answer lacks the rung and no ladder row of his
already pulled has it; a rung the base answer could not price, with the ladder not asked, says to pull again for his
ladder, `whyOf:'ladder'`, which then asks it), "up to" one credit a game and market, a pair pulled under
`PULL_FRESH_MS` (5 minutes) ago free; a press makes one free events look-up (matched by club pair, `DK_TEAMS`, within
`PULL_EVENT_H`) and asks inline ("Pull now: up to 3 of your 212 credits."), then one event-odds GET a game
(`bookmakers=draftkings`, `includeSids`, `includeLinks`, `PULL_TIMEOUT_MS`), a paid call never retried by itself. What it
read is `PULL` in the card's closure, never `S` or storage, each row placed by a name the job already placed (`pullPlaced`)
or the job's own rule ported in (`dkNameRule`, `nicknames.json` in its `/*NICKNAMES*/` slot; `test_dkname.js` holds it to
`names.py`). `pullFor(l)`, handed out as `window.dkPulledFor`, prices a pulled leg in the builder and the card as
DraftKings' own by the builder's own sums (the props parts' `parlayLegs`, `legPrice`, `legFair` hooks), converts a moved
main line or an unlisted rung at DraftKings' number with its price, or says why; a pulled line stands against an ESPN read
of his main line elsewhere unless that read came more than 15 minutes after the pull (`PULL_MOVED_MS`). Its sids go on
this card's slip alone (`dkPulledLeg` in `dkLeg`), never into `PAY.dk`. `PARLAY_CARD.pullPlan()`, `pull()`,
`pullState()`, `pulledFor(l)` and `nameRule(desc, players)`; `smoke_live.js` J3 holds it on a stubbed Odds API, and V that a
visitor's card has no button and asks nothing.
**Share link** sends the parlay as one text (`linkText`: a line a leg, each price marked est. or fair
where it is not the book's and the title's likewise, the stake and what it pays, the chances, then the
button's link, always a DraftKings one, alone on its line under what it opens -- "DraftKings betslip (opens 2
of the 4 legs as DraftKings had them; add legs 3 and 4 by hand):", never "all", or the game's page or DraftKings' NFL page "(add the legs by
hand)" -- when DraftKings' lines were read with the caution that a line moved or pulled since is not on
the slip, a line naming each converted leg ("On DraftKings' slip at its own line: leg 2 as Over 64.5
receiving yards (DraftKings prices it at its own line, so its payout can differ)"), the legs to add by
hand each with why in a few words, the site's address last) by
`navigator.share({title, text})`, or copied, the same text, where there is no share sheet, it cannot share
it or it fails (a cancel does nothing); neither touches the image. The link is never the share's `url`:
on an iPhone WebKit hands the sheet the text and the url as two items, so Messages showed the link as a card
with only DraftKings' domain and the sheet's Copy dropped it (WebKit bug 203221), which the owner saw as the
link "compressed" and missing legs, and only sometimes, since Android's Chrome joins the two.
**Start over** empties the builder. Finishing writes nothing: not `S.saved`, no key of the page,
nothing anywhere else. The card's price is the builder's own: the build lifts renderParlay's
pricing block out of `part3.js` into the card's `quote()` (its `/*QUOTE*/` slot), so it cannot
drift. A suggested level finishes the same way: its Finish carries `data-pc-finish="sp|<game id>:<level>"` (a
Suggested Parlays level, which `fromTier` reads through `window.spTier` as the tab shows it, live or locked, only
for a game the tab sets out since app v112, and heads "Medium parlay · SEA at DEN") or `"elo|<pick>"` (an Elo pick), which one listener in the card answers
(`finishFrom`, which redraws first where what is on the screen is stale, `pbStale`); Start over gives the focus to
the tab's choices on the screen (the Parlay Builder's mix, `[data-pb-mix]`, as before app v116 put the builder over
it, or Suggested Parlays' first Add to builder). What a browser
saved before -- the prop model's saved list, `my_parlays_v1` -- is left in its storage untouched
and not drawn. The section reads ESPN's public scoreboard and box scores in the browser, each game's
season and week from its id in ESPN's numbering. The builder drops a leg once its game kicks off,
and nothing keeps a copy: a parlay X bet is followed once it is in the file. A leg on a player on no line
of the box score is void (marked V, not lost or won) when there is official word he was not
playing that week -- Out or Doubtful on the injury report the page reads, or the page's record of
a game-day inactive or a reserve list -- and otherwise graded on nothing with the row saying he
is not on the box score.
`liveparlays/index.html` is a redirect (to the root's `#xparlays`: X Parlays for the admin, the Props tab for a visitor,
written over as `#slate`; the board until 22 October 2026).
`nflbets/build/smoke.js` boots the built page, as a visitor (an admin-seeded boot for the X tabs), in
jsdom at the site's root, `https://demon-x13.github.io/nfl-hub/`, against both sites' published data and walks every
tab, holds every old address's redirect to the root (run in `vm` on the web and from disk, none naming the Matchups tab,
its board or Pick'ems in the words a visitor reads), the Props tab first and the board's old addresses (and on a
visitor's page the X tabs') landing on it as `#slate` (app v128), the scoreboard on load (THE SCOREBOARD ON LOAD, on
fixtures of its own at any hour), every file the page reads as it loads read at the root and no request of the page or
a frame leaving the site or naming a parent folder, the light look and its switch (LIGHT MODE), and holds Suggested Parlays and the Parlay Builder to their rules on the
week as it stands (the tab's name and no word a visitor reads naming it Suggest Parlays, the mixes and their boxes, a
box by hand, a game unticked and the games list, the builder first on the tab, the Top 30 lines worked out on its own
and ranked, cut at 30 (on sixty made-up games of its own too), in their two
parts under their headings with the Value mark on the Value picks alone, the totals after every thin leg and each
bet once, then again on made-up games of its own (a main Over 224.5 with its 225+ rung dropped, a whole-number Over
225 with its 226+ kept, an Under with a rung kept, a one-sided total at +120 after both thin legs), each line's Add,
the games the night rule sets out, worked out on its own at the page's clock (two at one kickoff in the schedule's
order), and the wait line, its words too, where it sets out none, every prime-time game's cards with `spOn` stood in
where the rule hides some, the engine's levels
and each prime-time set's, their size, floor, legs and price against the builder's own sums, every leg of a level, the list, a game hand or an Elo pick on
DraftKings' id at its line where the payload carries ids (by an entry's content since app v125, and on `dk:{}` a press's
read leaving the player legs in), the published read (its status line, nothing beyond it before a press, every plant
with its game's read taken out, a reload's precedence), a leg's Add and a level's Add to builder and Finish, the
builder's own Refresh odds, the lock on made-up games of its own: live before it, the record's set after it, the
page's own kept in the browser across a reload, a press after it changing nothing, a ruled-out player's level
replaced alone, `spOn` stood in for those and put back, then the night rule on the same games at the clock moved
across each 6:00 AM turn; Suggested Parlays without its long paragraphs (no lead, foot, record sentence or
why-line under a set's level, its head the heading, the record's pills and Refresh odds alone, every lock and Updated
line word for word, the Elo picks' one sentence); only DraftKings' markets offered (no FG attempts line, leg or
suggestion on the week or on a made-up game with it priced, a kept leg removed with its line); no ladder bet anywhere
since app v127 (its own `ladderOwn`: none in `pricedLegs`, the hands' pool, the Top 30 as built and drawn, the levels,
the sets or the Elo picks, on the week and with DraftKings' book prices planted on every rung and 2+ touchdowns, after
its press too, none on a game's page, the no-line line, `toggleLeg`'s refusals, and a real reboot taking a kept ladder
out of the builder with its one line, a locked set's kept leg staying); the choices kept, a
game kicking off, and with `--season-over` both tabs saying there is no game
left); `nflbets/build/smoke_live.js` does the same for the
X Parlays section against a stubbed parlay file and scoreboard, on the admin's browser (its runs' default since 20
October 2026) and a visitor's, each with and without what the retired owner and reader layers left (section N; section V
a visitor's page: no X tab, no file read, no Pull, no Odds API request) (its section O: every card's X, Cancel, Escape and a click
outside clearing nothing, Clear removing exactly that parlay and keeping it gone after a reload but
not on a fresh browser, the list pruned, the all-cleared line and Show them again, the focus, no
request but reads, a double tap's second tap ignored, the window closed by leaving the tab and
scrolling when tall, two tabs on one storage, and the still-live line with live parlays cleared), and (its section J) the parlay card: Finish, the window with
every leg and the price, the image on a recorder canvas (jsdom draws nothing; it measures figures as
a wide bold face does), a long shot's stake, payout and profit whole in the window and on the image
(stepped down to fit, and a second row of tiles for a figure too wide even so), the share sheet,
Open in DraftKings and Share link on made-up ids (no url field and the whole betslip link alone on its
line in the text, all, part and none on the slip: the game's page, the NFL page, the owner's game with its
lines and no player prices; a leg converted to DraftKings' number, of every kind that can be, a `dkline`
one, a press's newer number taken over the pull's and an older one not, each named in the note and the
text, and "Open N of M legs" where one still is not on; the builder's line under each such leg and under
no other, and none on the prop model's own page; the same text copied without a share sheet; nothing
promising every leg), Escape, Tab and Start over, and that finishing writes
nothing; and (J2) the card's check of DraftKings' lines as it opens, on an ESPN of its own that holds or fails an
answer (the waiting buttons and note, the cap, the moved rule and a rung's own bet, a line the read has none for, the
converted total, the two lines and the status line, one redraw a read, the requests exactly the parlay's games' with a
third game of the week never asked about, a card opened again, closed or replaced while its read runs, an older read
never painting a newer card, a card waiting on a press of its game, a payload baked before ids, and the focus after Start
over and after a level the tab no longer draws); and (J3) Pull from DraftKings on a stubbed Odds API (the plan's cost,
the free look-up and the inline question, one paid GET a game with the expected markets, the prices and the slip ids the
stub's at the builder's own sums, every leg case, the errors with no paid retry, a re-open within 5 minutes free, a
sign-out midway, the 15-minute moved rule, and the key nowhere in the DOM, Share text or image). Since app v127 the
rungs and 2+ touchdowns J2 and J3 seed stand for a set locked before that day: each such boot first holds that the page
took them out with the builder's one line (`ladderBoot`), then puts every leg back, and R8 a kept rung stays with no line.
`smoke.js` holds each card's read to its
own games (`cardReads`). Both record every request a page
makes, and a request to the retired store or its sign-in services, or anything but a read, fails
them; so does one to `api.the-odds-api.com` on any `smoke.js` boot and on a `smoke_live.js` run but an admin's with its
stand-in, and `smoke.js` fails a request to ESPN's core host on load (the scoreboard is read on load only where
`scoresOnLoad` says, which the smoke works out on its own: THE SCOREBOARD ON LOAD). `nflbets/build/smoke_admin.js` holds the admin link (below). The elo job runs `smoke.js`, after its commit (a page check, never a gate on the Elo data),
every morning, playoffs and off-season included, so it holds in any week: `state.json`'s current week is
taken as the Game snapshot takes it for the week's notes (the first with a game to play, else the last; the week the
Matchups board opened on until it went on 22 October 2026), the checks that need
a game still to come run only when there is one, and once the payload's last game is about to kick
off the page is booted two days before it (the builder drops a leg whose game has started, so the
builder checks need a game to come). `smoke.js --season-over` runs it on the season with
every game given a result. A throw in either smoke's own code ends it at once with exit 1 and the
stack; a run still going after ten minutes stops and fails, and one left waiting on nothing
(no window open, its body not done) fails rather than ending with a silent exit 0.

### The admin link

(20 October 2026, the owner's calls "okay maybe we can do that and move X Parlays and X Bet Log in there for my eyes only"
and "Hide only, build it"; CLAUDE.md, "The admin link", has the whole of it.)
`https://demon-x13.github.io/nfl-hub/#owner=<his Odds API key>` makes a browser the site owner's. `nflbets/build/admin.js`,
in the page's head right after `theme.js` and before every style, the body and every other script, takes the key off
the address at once (only the fragment, never `?owner=`; `history.replaceState`, else `location.replace('#'+rest)`; a
`hashchange` listener for a link pasted into an open tab, ahead of `routeTabs`'), refuses one that is not 16-64 letters
and digits with no request, checks any other once for free (`GET https://api.the-odds-api.com/v4/sports/?apiKey=K`:
200 kept and checked; 401 `INVALID_KEY`, `DEACTIVATED_KEY` or `MISSING_KEY` refused, nothing kept; `OUT_OF_USAGE_CREDITS`
kept with 0 left; anything else kept unchecked, `ok:null`, and checked again quietly each load), keeps it in this
browser's storage under `nflhub_admin_v1` (`{k, at, ok, checked, left, leftAt}`; `ok:false`, junk or storage that throws
read as a visitor) and reloads at the link's tab. Admin at load, `html[data-admin="on"]` is set before the body is parsed.
`window.HUB_ADMIN` (`on()`, `info()`, `odds(path, params, signal)` for `sports/americanfootball_nfl/events` and an
event's `/<32 hex>/odds` alone, `credits()`, `signOut()`, and a `hub-admin` event) is the one code on the page that holds
the key or sends it, and only to The Odds API. The header's stamp has `#hubAdmin` after the light/dark switch: the Admin
mark (its title the check and the credits left) and Sign out (a button: asks, removes the record alone, takes the X tabs
off the bar with no reload; another tab's sign-out followed). On the admin's devices X Parlays and the X Bet Log are on the
bar (eight tabs, Props first; nine, Matchups first, until 22 October 2026) and the parlay card has Pull from DraftKings;
on anyone else's the two buttons are taken off the bar (six tabs), `#xparlays` and `#bets` land on the Props tab,
written over as `#slate` (`#matchups` until 22 October 2026), X Parlays reads nothing (`lpAdmin`) and `xbets.js` reads no
file (`enabled()` false, `ready()` at once). It is **hide only**: the two files stay public by address, and anyone could
hand-write the stored record and see the two tabs; what it protects is the key. The link stays in the browser's history
and address-bar suggestions where it was opened, and the storage on `demon-x13.github.io` is shared by every one of the
owner's hubs. `build.js` refuses a page that names The Odds API's host, `apiKey=` or `'nflhub_admin_v1'` outside `admin.js`
or carries a key, and an `admin.js` that keeps or sends anything else; `nflbets/build/smoke_admin.js` (the props gate's
job C) holds the link, the check, the record, the two pages, Sign out and the key in nothing but The Odds API's requests,
on stubs of its own.

### X's parlays and the X Bet Log

Both are files in the repository, beside each other in `liveparlays/`, and the site owner's browser reads them (the admin
link, above), read only, on every load (`cache: 'no-store'`); since 20 October 2026 a visitor's reads neither, and the
files stay public by address. There is no sign-in, no token and no shared store:
nothing on the page writes anywhere but the visitor's own browser storage. The X on a card in X
Parlays clears it from that browser alone (`lp_cleared_here_v1`, above); on every device, a parlay
leaves the page when the file marks it cleared, by hand or by the betting job's `autoclear.py` the
day after its last game.

- **`liveparlays/parlays.json`** is X Parlays: `games` (the game ids, listed once), `parlays` (each
  an `id`, `week`, `stake`, `price`, `payout`, an optional `note`, and `legs` pointing at a game by
  its place in `games`, with the player as ESPN spells him, the team, the stat, the line, the side
  and `main`) and `updated`. Claude keeps it from the slips the owner sends in chat: a new slip is a
  new parlay; a line the book moved before the bet is written as the line X took; a parlay the owner
  no longer wants on the page gets `"cleared": true`, which keeps it in the file as history and off
  the page. Its `how` field says all of this, for whoever edits it next.
- **`liveparlays/xbets.json`** is the X Bet Log: `season` (the betting app's; a file for another
  season shows no weeks and says which it holds), `deposit` (for the balance; `null` for none, and
  the chart is then X's profit against break even), `weeks` keyed `w1` to `w22`, each `staked`,
  `returned` (everything that came back, stakes included) and an optional plain-text `note`, and
  `updated`. Claude adds or changes a week from what the owner sends. `nflbets/build/xbets.js` reads
  it, cleans it (a week 1-22, amounts of 0 or more, a note without angle brackets, 140 characters
  at most) and hands it to the betting frames as `parent.XBETS` (a srcdoc frame is the page's origin;
  the frames must not be sandboxed); `betting/tools/build.js`'s hook lays the weeks into the app's
  `S.bets` and the deposit into `S.bank.deposit`, starts the frame read only (`html.xbets-ro`: no
  entry bar, Remove, deposit box or backup card; Save week shut), and keeps the browser's own Bet Log
  and deposit in the app's key exactly as they were, whatever a frame saves. On a visitor's page (since 20 October 2026)
  `XBETS.enabled()` is false, nothing is read, and the frame is not read only: it keeps the browser's own log, which no
  tab of the hub shows (the betting smoke holds both).

`nflbets/build/storage.js`, inlined before the prop model's script, defines the `window.storage`
the prop model saves through (this browser's localStorage and nothing else, its builder and saved
parlays read back without `<`, `>`, `"` and a backtick, as the page always read them), and takes
out of a browser, once on load, what the retired layers left: their flags (`nflowner_v1`,
`nflsync_owner_v1`, `nflsync_device_v1`, `xparlays_v1`, `nflsync_v1`) and their copies of the old
shared parlay document (`nflsync_base_v1`, `xparlays_cache_v1`). The section's old key,
`live_parlays_v1`, goes only where all it holds is in the file: the one line the store last held
corrected (`file|w3-dk-sgp-5|4` at 239.5, which is the file's), deletions, betting slips it deleted
itself. Anything else in it -- any other corrected line (on a parlay of the browser's own, on another
of X's legs, or on that leg at another number, which a browser last opened before the store may
hold), a kept builder, a slip never deleted, a key it never wrote -- keeps it, unread.
`xbets.js` takes out the X Bet Log's last copy (`xbets_cache_<season>`) and
moved-in mark (`xbets_joined_<season>`) on every load, the admin's or a visitor's, and, once the admin's load has read the
file, a week that never reached the store (`xbets_pending_<season>`) only when the file has it as it was written. The
admin link's record, `nflhub_admin_v1`, is `admin.js`'s alone: `storage.js` never reads, writes or removes it. Nothing that holds a
visitor's own data is touched: the prop model's key, `my_parlays_v1`, the betting app's key,
`x_nfl_bets_preshare_<season>` and `lp_cleared_here_v1` (the parlays this browser cleared from X
Parlays) stay as they are.

Until 10 October 2026 both lived in a Firebase Realtime Database written from the owner's devices
(an owner link and Firebase sign-in, which the admin link of 20 October 2026 is not: it keeps one record in the admin's
own browser and writes nothing anywhere); its last state was carried into the two files that day (the
25 placed parlays the owner had deleted marked cleared, the corrected line already the file's, the
three weeks and the $100 deposit of the X Bet Log), and the page no longer asks it anything. The
owner may delete the database, or set its rules to `{"rules":{".read":false,".write":false}}`.

### Friends' picks on the Pick'em Record

The owner tracks some friends' picks over the season (15 October 2026). A friend picks a week on
`picks/` and sends the owner its Save file (kind `nfl-hub-weekly-picks`, version 1); Claude merges it
into `picks/friends.json` with `node picks/tools/add.js <file>...` (`--check` holds the file to its rules
and `betting/state.json`'s schedule; `test_add.js` is its test). The tool refuses a file whole for a
wrong kind, version, season, week, name or game id; a pick saved at or after its game's kickoff (the
schedule's, never the file's) is left out and named; a week sent again replaces that friend's week but
keeps the earlier pick on a game that had kicked off when the new file was saved. The file is written
only by the tool, indented one space, a pick a line. `--rename <old> <new>` shows a friend under
another name (D money fresh became D on 15 October 2026), keeping the old one in `aka` so a later
file saved under it lands on the same friend and keeps the new name.

`nflbets/build/friends.js` fetches it no-store on every load, cleans it (a junk entry dropped; a
missing, non-JSON, other-season or listless file draws no friend) and hands it to the betting frames as
`parent.FRIENDS`. `betting/tools/record_viz.js`'s `rvFriends()` grades each pick saved before kickoff on
the finals the models are graded on (a tie for nobody; pending until the final) and draws the friends
apart from the models: dashed lines with hollow dots against Vegas on the chart, with a Friends legend
row; Friends rows under the week-by-week grid ("to play", "N pending"); a column each in the pick grid
(the pick-grid patch in `betting/tools/build.js`). The nflbets smoke holds it on stand-ins; the betting
smoke holds the real file to the tool's rules as a warning.

## Props: how it fits together

```
nflverse CSVs  ->  weekly.py  ->  data/payload.json   (no price bought since 20 October 2026; data/oddsfetch.py by hand only)
ESPN's feed (site + core api)  ->  espn_read.js (the assembled page's espnReadWeek, in jsdom)  ->  raw/espn/read.json
  ->  weekly.py's apply_espn  ->  data/payload.json's espn and the schedule's game lines (lsr 'espn')  ->  espnPublished at boot
ESPN's feed (site + core api)  ->  the visitor's browser, on a press of Refresh odds  ->  memory, and that browser's props_press_v1 (never a file)
The Odds API  ->  the site owner's browser alone (HUB_ADMIN), on Pull from DraftKings  ->  the parlay card's memory (never a file or a key)
part1.html + part2.js + part3.js  ->  assemble.py  ->  app/prop_model_2026.html (gitignored)
  (payload.json only checked)                     ->  audit.js  (must be clean, or no commit)
part1.html + part2.js + part3.js  ->  nflbets/build/build.js  ->  index.html (the site's root)
index.html + payload.json + elo/data  ->  suggest_ledger.js  ->  data/suggest_ledger.json
  (after a clean audit; each prime-time game's set, locked 2 hours before kickoff, graded after;
   never blocks the publish)  ->  Suggested Parlays' locked sets and record
```

`payload.json` is fetched when the app boots (`let PAY=null` and `DATA_URL` in front of
part2: `../data/payload.json` in the audit's copy, `props/data/payload.json` on the Bets
and Stats page, the site's root since 17 October 2026, `../props/data/payload.json` before), so the page and the data are separate files. Its keys: `sched` (272
games), `players` (about 590: about 460 with last season's rows, each with seeded EWMA stat history,
and since app v104 every other player the depth chart lists at a position the page projects who is on
a roster, ACT, DEV or INA, carried with `gp` and `cn` 0 and no stat arrays: a backup who has not played
since, a veteran who did not play last season or whose few snaps fell under `keep()`'s bar, a rookie;
`payload.py`), `toff`/`tdef`/`tdefg`
(team offence, defence, defence-by-position), `mkt` + `mkt_meta` (real main lines per
week, each with the book's name `n` and game `g`; `mkt_v` 2 says they carry them), `prices`
(raw odds rows per week, each with the player id `pid` it was matched to; `unmatched` lists
rows on a game still to play that matched nobody, with pool.match's reason: `ambiguous` turns
the run red, a few `unmatched` do not, see `price_problems` in `weekly.py`), `stats` (actual results per week:
nflverse's rows, and a row of zeros marked `from_snaps` for a player who took a snap in his role with no
stat line), `snaps` (who took part, `snaps[week][game][club]`: the players with no stat line who took a
snap of any kind, a club for every game whose snap counts and stats are in; `who_played` in `weekly.py`,
from nflverse's snap counts; `settleLeg` grades such a player on zero, one his club's list leaves out
void, and waits where there is no club, unless the report had him Out), `corr`
(the pair correlation table: 329 entries, 341 since the quarterback's touchdown joined in app v102), `model`/`grid`/`dist`/`qs`/`k`/`prior`/`pts` (fitted
model pieces), `mkt_scale` and `tdrate` (from `data/scale.json` and `data/tdrate.json`) and
`tdmult` (the touchdown cap), `norm` (league means by position group, and the implied-points
spread), `injuries` (this week's report in full, with practice status, and earlier weeks'
Outs and Doubtfuls, and every earlier row of a player in `ina`), `ina` (the skill players the roster
has inactive for their club's last game: status INA, or an ACT row with nflverse's inactive code, I01 or
I02, which is how a club whose rows have moved on to the next week writes it; `bake` in `weekly.py`),
`roster` (every skill player's team, roster status, name and the week
the row is for, then where they differ his football name with his surname (or null) and
his legal form, `names_of` in `names.py`, which the audit matches book
names against, and anyone else the page can show, whatever position the roster gives him),
`depth` + `depth_dt`, `price_pull` + `credits` (the last price pull, frozen at week 6's since no job pulls), `dk` (DraftKings' own id for
every outcome the pulls read on a game still to come, `dk[week][game][key]`, the key a leg's own
without its game, then its side and DraftKings' point: `<pid>|<stat>|over|79.5`, `<pid>|any_td`,
`team:BAL|ml`, `team:ATL|ats|-3`, `game|total|under|43.5`, and `event`, DraftKings' event id, with `at`
and `glat`, when the game's player prices and its game lines were read; `dk_ids`
in `weekly.py` builds it from `data/dk_links_wk{W}.json`, a player placed by the rule his prices are;
the parlay card's Open in DraftKings and Share link read it, and since app v109 the suggestions, which
take only a leg with an id at its own line, `dkIdOf`, wherever it is there, `dkCarries`; baked `{}` since no job pulls,
the entries a read of ESPN adds at the page never counting, by their content, app v125), `espn_ids` (app v107: `{ESPN athlete id:
pid}` for every player the page can project, from the roster's `espn_id`; `espn_ids` in `weekly.py`, an id
the roster gives two players left out; Refresh odds and the job's read place each athlete of DraftKings' lines by it, and by
name within his game where it lacks him), `espn` (app v125: the props job's read of DraftKings' lines on ESPN, `{v:1,
read_at, games:{gid:{w, gl:{at, lines, ids, event}, pl:{at, lines, rungs, td}, out:{st 'ok'|'none', at}}}}`, one entry a
game still to come with anything to publish, every time before its kickoff; `apply_espn` in `weekly.py` works it out again
on every run from this run's read and the published payload's, and `payload.py` never carries it; about 23 KB a week),
`season`, `week` and
`season_over`, `not_posted` (`stats` and/or `injuries` when nflverse has not posted this
season's file yet: the slate says so, and the audit expects none of it), `build` (the data
build) and `baked_at`. Only this season's games are baked: a price or line row of another
season's game is dropped, and a payload of another season carries no lines forward. A `sched` game
carries `ls` (`dk` or `nflverse`: whose moneyline, spread and total it has), `lat` (when
DraftKings' were read, to the second) and, since app v125, `lsr` 'espn' where they are the job's read of ESPN (else a
pull by hand's, which a newer read replaces); DraftKings' are used only while under a day old. Its total `tot` comes
with the over and under prices `tov`/`tou` (nflverse's `over_odds`/`under_odds`, or DraftKings'
own where its total is used: since app v125 the read's), absent on a payload baked before them.

**Refresh odds** (app v107, `patch_espn_prices.py`; CLAUDE.md's Props loop has the design and the held-out
table). A visitor's press reads ESPN's free feed in the browser: the week's scoreboard
(`site.api.espn.com/.../scoreboard`, DraftKings' moneylines, spread and total with their prices, and its bet
links' event and outcome ids) and each game's player lines (`sports.core.api.espn.com/.../odds/100/propBets`,
a line and no price), every game of the week still to come from the Parlay Builder's controls or its builder,
Suggested Parlays or the Props tab, one game from its page. The reader (`espnRefresh`, `espnOdds`, `espnParseItems`,
`espnProps`, `espnPlace`,
`espnBlock`, `espnReadGame` in `part3.js`) keeps what it read outside `S`: `ESPN_LIVE[week][gid] = {at,
lines:{pid:{stat:L}}, rungs:{pid:{stat:[k...]}}, td:[pid]}`, `ESPN_GL[gid]` (the published game lines a
press replaced, which `save()` writes in their place, `espnSavable`), `ESPN_OUT[gid]` (how each game's read
ended, for the status lines), `ESPN_IDAT[gid][key]` (when the read gave or found each DraftKings id it put
in `PAY.dk`, `espnIdAt`, which the parlay card dates it by) and `ESPN_SEQ` (in `pbDataSig` and
`gameSuggestSig`). The game lines replace `g.mla` ... `g.tou` where newer (`ls` 'dk', `lat`, real prices);
a player leg's price is the paid pull's while its line stands, else the read's line at the formula's price
(`DK_EST`, `estPrice` in `part2.js`; `espnPrice`, `mainOf`, `plEst` in `part3.js`; src `dkline`, est.),
else the model's estimate. A builder leg a press priced goes back to the page's own price once the press
no longer stands (`espnLegBack`, in `legPrice`: a reload that set its read aside, or a later read that moved
its line). Since app v108 each press also writes its read to the browser's own storage, `props_press_v1`
(`espnKeepPut`, `espnKeepWrite`: `{v:1, season, saved, games:{gid:{w, gl:{at, lines, ids, event, sig}, pl,
plsig, out}}}`, the scoreboard's odds, the `ESPN_LIVE` block and what the read found), and `boot()` puts it
back before the first draw with no request (`espnRestore`): each half over the publish it was read over
(`espnGlSig`, the published `ESPN_GL_KEYS` fields, `lat` among them; `espnPlSig`, its `PAY.dk` `at`, its `PAY.mkt` rows and,
since app v125, the published read's `pl.at`, `out.st` and `out.at`), or
over a newer one where the read is later than that publish's own time for it (`g.lat` where it carries
DraftKings' lines, the published read's or a pull's; for the player lines `pubP`, the later of the published read's `pl.at`
or `out.at` and the paid pull's `at`, else `baked_at`), neither once it has kicked off or has a score;
the game half is what the reads did (`ESPN_GL[gid].d`, each field set or dropped), replayed; junk or another
season's value empties the key; what gave way is in `ESPN_ASIDE` for the status line; a reload writes a
game's kept lines back exactly (`espnKeepLines`) and its ids with their read times (`espnKeepIds`); a half
dated after the page's clock is dropped; a write merges half by half with the browser's copy, each half
from whichever tab read it later, never one this load set aside (`ESPN_KEEP_GONE`, `{gl, pl}`); a failed
save of `S` empties the key and retries (`espnKeepDrop`). Where legs
are chosen (`pricedLegs`, `pbPool`, `gameLegPool`, the Elo picks) a `dkline` leg counts as a book price on
a tested kind only (`ESPN_TESTED`; since app v127 its yards rungs among them no leg, **No ladder bets**, below), and from app v109 to v124 was suggested only on a payload baked before `dk`:
where the payload carries ids a suggested leg needs one at its own line, and ESPN gives none for a
player's line (the game-line ids a press reads do count: a team leg it re-priced can be suggested; the
`PAY.dk` a press makes on a payload with none is marked, `dkPressMade`, and does not count as carrying
ids). Since app v125 an entry counts as carrying ids only by its content (`dkEntryCarries`), no entry a read makes does,
and the job bakes `PAY.dk` `{}`, so a `dkline` leg is suggested everywhere again. The parlay card looks a `dkline` leg up
in the pull's ids like any other leg (none but a pull by hand's since app v125, so a visitor adds it by hand).

**The published read** (app v125, `patch_espn_only.py`, `build/espn_read.js`, `weekly.py`'s `apply_espn`; CLAUDE.md's
Props loop has the whole of it). The props job reads with the page's own reader: `espnReadWeek(w, games, onStep)`, split
out of `espnRefresh` (which keeps its behaviour on top of it), returns `{sbAt, out, gl, pl}` and applies nothing, touching
only `ESPN_RUN`'s counters and the `ESPN_NAMES` cache. `espn_read.js` boots `app/prop_model_2026.html` in jsdom on the
payload just baked, as a visitor's browser boots it, calls it on the current week's games still to come, every request
through `lib/netfetch.js` (a plain User-Agent then none, a 403 tried again, a 150-second deadline), records each answer in
`raw/espn/` and writes `raw/espn/read.json` (with `placed`: each player's ESPN athlete id, ESPN's name and how he was
placed). The read never refuses the run (a crash, a timeout or a page with no reader is a problem, red after the
commit); `apply_espn` (an error in it refuses) writes `PAY.espn` (above) from this read and the published payload's (an
`ok` replacing a block, a `none` dropping it, an unread game carried with its own times, every half before kickoff,
nothing across a rollover, the block cleaned by the page's own rules, `espn_rules`) and puts each game's lines on the
schedule (`ls` 'dk', `lat`, `lsr` 'espn', under a day old, never over a newer pull by hand's), nothing of it in `mkt`,
`prices` or `dk`; a game kicking off within 48 hours whose player lines no run has read for 24 is a problem. At boot, outside
`NO_BAKED` and before `espnRestore`, `espnPublished()` installs each block into `ESPN_LIVE` (recorded in `ESPN_PUB`;
`espnKeptGame(e, {published:true})`, no `late` guard), merges each game's ids and event into `PAY.dk` as an entry a read
made (`ESPN_PUB_IDS`, `espnIdAt`), and writes no `ESPN_GL`, `ESPN_OUT`, `ESPN_IDAT`, kept read or `S`. A fresh press applies
its game lines over the published read's whatever `lat` says, and its `ok` player lines over the published block;
`espnWasRead`, `espnLastRead` and `espnPressed` tell the published read from a press (the no-lines words, the status line:
"DraftKings’ lines as the site read them from ESPN <time>: player prices estimated from the line"). Held by
`test_apply_espn.py`, `test_espn_read.js`, `test_espn_ids.py`, the audit's M17 (made-up games, blocking) and V-ESPN
(the payload, and with `PROPS_AUDIT_RAW` this run's `read.json`: blocks, game lines, who each line is on; a placement by
the surname alone the one warning, `W.espnName`), `suggest_ledger.js`'s refusal of a page that drops it, and the nflbets
smoke.

**No ladder bets** (app v127, `patch_no_ladders.py`, whose docstring is the design; the owner's call of 21 October 2026,
"is it possible to not do ladders and just include Same Game Parlay eligible stuff"; CLAUDE.md's Props loop has the
whole of it). The site offers main lines, the anytime touchdown and team bets alone. `isLadder(l)` (`part2.js`, beside
`isGameLeg`): a leg on a stat in `MKT` that is no game bet and is the anytime touchdown at k 2 or more (k missing read as
1) or any other stat off its main line (`!l.main`); a leg on no known stat never is. `pricedLegs` makes no rung (paid,
`S.odds`, or from DraftKings' milestones on ESPN, `pl.rungs`) and never made 2+ touchdowns, so the Top 30 lines, every
set, the all-games levels and the Elo picks hold none; `gameLegPool` lost its rung loop too. A game's page draws no
Threshold ladders box (`showRungs`, `#rungCb` and `S.ui.showRungs` gone; a saved one is not read), no `tr.rung` and no
"Scores two or more" row, and a stat with no main line draws `p.noline[data-noline]`, "No DraftKings line yet.", in
place of its table. `toggleLeg` refuses a ladder after its take-off branch. `pbDropLadders()` takes a ladder out of
`S.parlay` at boot (after the saved state and the bake, before `espnPublished` and the first draw) and on a backup
import, never on a draw, but a leg carrying `kept` (a locked set's, `spLegIn`), and `renderParlay` draws one line first
among its dropped notes, `data-pb-noladder="N"`, while `PB_NOLADDER.sig` is the builder's keys (`pbLegSig()`), which its
own drops of a game kicked off or FG attempts re-stamp, so only the visitor's change ends it; `S.saved` is never touched. Locked sets are drawn, added (`pbPut`, a locked leg's own Add) and finished (`fromTier`) as before.
Dormant, standing for a set locked before that day and a pull's ids: `once()` and `getPbTop().same`, `plEst` and
`espnPrice`'s 'rung', `dkIdOf`'s rung keys, the card's rung and 2+ touchdowns conversions and Pull from DraftKings'
ladder markets (`PULL_ALT`, `pullMarket`, `whyOf` 'ladder'), `dkClashWhy`'s rung. Live as before: `statLines`' rungs (the
Track Record), the ESPN reader's milestones (`ESPN_MILE`, `pl.rungs`) and `settleLeg` on the ladders the records hold.
`build.js` refuses the old box, row and words back and needs the refusal and the strip. Held by the audit's NL1-NL4 (the
week as it stands, a made-up Monday night game of its own, `toggleLeg`, the boot's strip by reboots) with K, K2, S, O,
M7, M8, M17's G, V14, I3 and the Top 30 foot's words; the nflbets smoke's no-ladder section (the week, planted book
prices on every rung and 2+ touchdowns, the no-line line, `toggleLeg`, after its press, a real reboot); `smoke_live.js`'s
`ladderBoot` in J2's and J3's boots and R8; and `test_suggest_ledger.js`'s `offeredOwn` on every set's legs. Each by its
own reading of a ladder (`ladderAud`, `ladderOwn`, `offeredOwn`), never the page's.

Who is playing is decided on every load from the payload, outside `S`: `RSTAT` (the roster
status by player) and `INJ` (this week's tags: Q, did not practise, limited), with the ruled
out in `S.inactive` (Out, Doubtful, Questionable without practice, "pending" -- out or
doubtful in his team's last game, or inactive for it (`ina`) after being on its report in any status
(app v104, the Elo build's WHO PLAYS rule, which reads inactive the same way, INA or the I01/I02 code,
since the same day: Caleb Williams, Questionable and then inactive in week 5 of
2026), no stat line in it, and no status yet: held until he practises or his club files a report he
is not on --, a game-day inactive, and a reserve list, a release or a retirement, kept as
`week:'season'`). The season replays week by week, each week graded
on its own injury report, before today's roster and report are applied.

Who starts is `rosterFor` in `part2.js`: the depth chart's order over the players who are not ruled
out, the chart re-counted past the ruled out, a player shown with three games or with a place on the
chart within his position's depth (one or two games are marked thin history; `pricedLegs` takes nobody
under three, and a game page's hands only one the chart moved up). A player with no game the model counts
last season or this (`noHistory`), or one moved up whose games give the
model no workload (`nothingToProject`), has nothing to project from: he gets no lines (`statLines`
returns none), so no price, headline, game hand, suggested parlay or Elo pick, and is shown in his
place (a starter's slot on the chart, or one it moves him up to) marked thin history with a line saying
so, never replaced there by the next man down (app v104; before it a club whose QB1 was out with a QB2
like that started nobody).

`S` is the live state object, built by `freshState()` in `part2.js` from `PAY`
and then updated as weeks are ingested. It holds `players`, `teams`, `defs`,
`sched`, `processed`, `actuals`, `projections` (frozen pre-game numbers), plus
the visitor's own `parlay`, `saved`, `odds`, `stake`, `margin` and `ui`. `S` is
what gets serialised to local storage -- anything that must not persist has to
live outside it.

Sections. part1.html's own tab bar (Games, Suggested Parlays, Parlay Builder, Track Record, Weekly Update,
Backup) is the audit's standalone page; the Bets and Stats build replaces it with its own
bar. `tab-slate` is the Props tab (`slateView` + the `gameModal` overlay), `tab-suggest` is
Suggested Parlays (`spPanel`: the record, the next prime-time night's sets, the Elo picks), `tab-parlay` is
the Parlay Builder (`parlayBody`, the builder, first since app v116, over `pbPanel`, its choices and the Top 30
lines), the build adds
`tab-xparlays` (X Parlays, `#lpCard` alone), and three have no
button, kept because the prop model draws into them: `tab-track` (Track Record, the Prop
Record: `trackBody`), `tab-week` (Weekly Update) and `tab-backup` (Backup).

The games list and a game's head (app v122). `renderSlate` draws each game as the Matchups board's row in the
prop model's own names (`button.game[data-game]` with `sl-` cells: date, matchup, win probability, confidence,
score prediction, final score), worked from the prop model's own lines (`slateCall`, `slateTier`, `slateCols`,
`slateNeutral`, `slateOutcome`, `slateResult`, `slatePred` in part3), and since the board went (22 October 2026, app
v128) it is the page's one list of the week's games, on the page's first tab: six columns on a wide screen, one card a
game at 900px and under, and from 901 to 1,160px (the owner's window is 914) a layout of its own that narrows the
columns and lets the win-probability bar take what is left, the final-score column keeping 136px in every layout for a
live "WAS leading 31–33", so it never scrolls sideways (the board did from 901 to about 1,100px, its last column ran into
the card's padding up to 1,140, and with a classic scrollbar up to 1,156, until 14 October 2026). jsdom lays nothing
out, so `smoke.js` sums each layout's least column widths, its gaps and the card's padding against the page's content,
less a 17px classic scrollbar, at that layout's narrowest width (one past the middle layout's max-width, 1,161px, wide;
901 between), and wants exactly one layout between the phone card and a wide screen and no final-score column under
136px or narrower than the wide one's (the board's were held so until it went). Its final-score cells take the
scoreboard the page reads on load where a game of the week is under way (`scoresOnLoad`, the glue's) or a Refresh
scores press. What the row showed before (kickoff,
matchup, biggest projections, expected score, total points, Vegas pick) is the head card of the game's page,
`gameHeadCard` (`.ghead`), the first card `renderGame` draws after its controls.

A game's windows (app v124, `patch_game_windows.py`, the owner's call of 20 October 2026: "get rid of the suggested
parlays section from there. instead I want you to add three different buttons: Matchup, Mistmatches, and Team Stats
... I want each button to pop up in its own little window"). The game's page draws no Suggested parlays card any more
(`gameSuggestCard`, its High, Medium and Low hands, their Add all and the Any, Player overs and Player unders switch,
`gameNoIdWhy`, `.gsugg` and `.sugg-side`; `S.ui.suggestSide`, `SUGGEST_SIDES`, `suggestSide` and `sideAllows` went
with it, so a saved side filters nothing), and its engine (`gameTiers`, `gameLegPool`, `GAME_TIERS`,
`GAME_TIER_CACHE`, `gameSuggestSig`) is kept, drawn nowhere, as `getPbTiers()` is. In its place, between `.ghead` and
the Game bets card (`.gbets`), `gameWinBtns(g)` draws three 44px buttons (`.gwin` > `button.gwin-btn[data-gp-pop]`,
`units`, `mism` and `stats`, `aria-haspopup="dialog"`), Matchup, Mismatches and Team Stats, and since app v128 a fourth,
Game snapshot (`snap`, the owner's call of 22 October 2026, "Button on Props", when the Matchups tab went; four to a
row, two by two at 680px and under), only where
`window.gameWindow` is on the page (the hub; the audit's standalone page draws none), and `renderGame` binds each to
`window.gameWindow(kind, g.id, button)`. For `snap` that is the whole Game snapshot, `open(gid, from, {page:true})`,
which goes with the page as the others do (`FROMPAGE`, above); for the other three it is the Game snapshot's window
(`snapshot.html`, `#gsModal`) in a one-card mode, `open(gid, from, {only})` and `drawOne`: the class `gs-one`, 720px at most and a little window with a 10px margin
on a phone, a title naming the game and the card, and one card unfolded, Matchup the snapshot's own Offense vs defense
body (`unitsBody`, which `unitsSec` wraps) with a "Played." line first on a played game, Mismatches its own body
(`mmParts`, which `mismatchSec` wraps), and Team Stats the old Stat breakdown's bars (`teamStatsBody`, `SROWS`,
`statSplit`, `statNum`: eleven rows from `news/data/stats.json`, each pair split on a bar in the clubs' colours, the
better marked, the counts and the basis under them, a club the file lacks in dashes, a file of another season or of
the wrong shape said so, the Rams read as LAR), the file read once a page load, no-store, only the first time a Team
Stats window opens (`statFile`). A game `state.json` lacks is read from the prop model's own `S.sched` row
(`gameFor`). Escape, caught first, closes the window alone and leaves the game's page open under it; Tab stays inside;
a click outside closes it, but not a double click's second within 400ms; the focus goes back to its button, or the
same button drawn since, else Back, else the game's row, else the chosen tab's button, never the body (`oneFocus`); it
closes with the game's page (`closeGameModal` wrapped), on a `hashchange`, and on a key once the game's page is off the
screen. `build.js` guards each of those pieces (and the fourth button, `b('snap','Game snapshot')`) and refuses the old
card back; the audit's O holds the buttons (none on its own page, the four in order with a stand-in window, four to a
row and two at 680px and under), M7 and M8 the engine alone, and I3 that a saved side is not read; the
nflbets smoke holds the buttons and, on its stand-in news files, every window (CLAUDE.md, **A game's page: Matchup,
Mismatches and Team Stats**, has the whole of it).

### Vocabulary

- **leg** -- one line on a parlay. Keyed `gid|pid|stat` (`legKey()`), plus a
  threshold `k` and a `side` (`over`/`under`). One line per player per stat.
- **main line** -- the real sportsbook over/under for a stat (`main:true`).
- **rung / ladder bet** -- a rung is a step on a **threshold ladder**, the "10+, 20+, 30+" style
  alternatives (`LADDER` in `part2.js`). A ladder bet is a player's over off his main line (a rung k+) or two
  or more touchdowns (`isLadder`), which since app v127 (**No ladder bets**) nothing offers or suggests and
  the builder refuses: `statLines` still builds the rungs (the Track Record grades their frozen chances), the
  records settle the ladders they hold, and the game page's checkbox that showed them is gone.
- **anytime touchdown** -- `any_td`, a yes/no leg (`prob` in `MARKETS`), for a back, a receiver, a
  tight end and, since app v102, a quarterback: a
  touchdown the player scores himself, running or catching, never a pass he throws, as DraftKings
  settles it and as `rowStats` and `espnStats` count it. Its chance is a logit capped by expected
  touches at `tdrate` x `tdmult`. A quarterback's is worded "Scores a rushing or receiving TD (not
  a TD pass)" (`tdLabel()`), and market + form gives it no second price (his rating is a passer's).
  Two or more (`tdPlus`) is still priced and settled, but a ladder bet: a game's page drew it as a
  "Scores two or more" row until app v127, and since nothing offers it.
- **game bets** -- `ml` (to win), `ats` (to cover) and `total` (the game's points over or
  under `g.tot`, `pid:'game'`), one team bet and one total per game in the builder, a parlay of
  a level's taking one team bet a game and its total only as the last fill, `grp:'TEAM'`. A total's chance is
  `totalBet()`: the market's own, mu the posted total and the over's chance its over and under
  prices with the margin out (`totalOver()`), 50% without both; `TOTAL_SD` (13.2, from
  2010-2025) prices only another number than the posted one, Normal about it. The model's own
  points (`modelTotal()`) are shown on the Game bets card as "model's points", never used: the
  study in `props/research/totals/README.md` found no points model that beat the posted total on
  2024-2026, and the rule used before (the model's points halfway to the total) worse than it.
  Its price is `g.tov`/`g.tou`, else -110 marked est.; it settles over, under or push in
  `settleGameLeg()`.
- **corr vs indep** -- `parlayProb()` returns both: `indep` is the legs
  multiplied naively, `corr` is a gaussian-copula Monte Carlo over the shipped
  pair correlation table. `corr` is the number the UI shows. It is seeded, so it
  is deterministic. A game total's pairs are `legRho()`'s own: with a player leg on
  the same game `TOTAL_RHO` by position and stat (measured on 2019-2024 finals), with a
  win or cover bet 0.
- **SGP pricing** -- `parlayDec()`. Legs sharing a game are priced as one
  same-game parlay (never longer than multiplying), legs across games multiply.
- **margin** -- the book's cut, `light`/`typical`/`heavy`, a visitor setting.
- **suggested parlays** -- two engines. The levels (`PB_TIERS`: Safe/Medium/Aggressive/Extreme,
  2/3/4/5 legs, floors 25/12/5% after Safe, `pbTier` on `pbPool`) are, since app v111, each
  prime-time game's set on Suggested Parlays (`spSet`, from that game's `pricedLegs` and its total
  on every bet type, `SP_ALL`, searched wider, `SP_SEARCH`, cached in `SP_CACHE`, outside `S`;
  the tab sets out one night's at a time, `spOn`, the record every one); `getPbTiers()`, the same
  levels over every ticked game, is kept for the audit and the smoke and drawn nowhere. The
  Parlay Builder's Top 30 lines (`getPbTop`, `PB_TOP_CACHE`) rank the legs those levels are
  searched from, the Value picks first, then the other lines, the thin ones and then the
  totals, each bet once (a ladder rung that is a half-point main Over's bet left out; dormant since app
  v127, no rung reaching the list). The
  Elo picks use `pricedLegs()` too, and since 18 October 2026 the same four levels on the Elo
  chance (`eloPicks` in `tab_elo.html`, an exact search by the builder's own sums); since app v109 all of them, and a game page's hands,
  take only legs with DraftKings' id at their own line, `dkIdOf`,
  wherever the payload carries ids (from app v115 to v118 the Top lines also kept a player's line read
  by Refresh odds with none, `pbTopSlip`; dormant since app v125, no payload the job bakes carrying ids, so
  all of them take DraftKings' lines read from ESPN at the page's estimated prices). `gameTiers()` is a game page's High,
  Medium and Low (`GAME_TIERS`: 2, 3 and 4 legs, paying at least +100/+250/+500 at
  35%/20%/10% or better, no leg shorter than `GAME_LEG_MIN`, -250), cached per game
  in `GAME_TIER_CACHE`, outside `S`; drawn nowhere since app v124, which took the game page's
  Suggested parlays card off (its Matchup, Mismatches and Team Stats buttons in its place), and
  kept, as `getPbTiers()` is, for the audit and the smoke. The sets, locked 2 hours before kickoff, are recorded
  per game in `props/data/suggest_ledger.json`'s `prime` (the suggestions record).
- **matchup bubble / place** -- (app v114) the window a leg's name opens on the hub
  (`glance.js`, `glanceName` in `part3.js`): the player's or both clubs' matchup for the day
  and the leg's own numbers. Its place is where the name was drawn (the builder, the Top lines, a
  level card in its set or in the Elo picks), which it keeps across a redraw. "This leg" in it
  is a row's line, never a bet the visitor made.
- **Value pick / thin / market** -- (app v112) a leg `pbPool` puts on its preferred list, 3 points
  above the chance its price implies with market + form agreeing on a player's line (`thin:
  false`, not `market`): `pbIsValue()`, and the one mark a leg wears, Value (`pbValMark`). A thin
  leg (`thin: true`, at or above the book by less) and a game total (`market: true`, the book's
  own chance) are not Value picks, fill a level only where the Value picks cannot, and wear no
  mark, a line under the level saying why (`pbThinLine`, `pbMktLine`); they wore "thin edge" and
  "no edge" until app v112. An Elo pick's legs say neither and are not marked. The record keeps
  `thin` and `market` on every leg.
- **night** -- (app v112) the prime-time games of one Eastern date: Suggested Parlays sets out the
  next night still to come alone (`spNight`, `spOn`), from 6:00 AM Eastern (`SP_OPEN_H`) on the
  morning after the prime-time night before it on the schedule.
- **liveWeek / weekOpen** -- the first week with an unfinished game; a later week
  is not "open" and shows fixtures only, because projections need recent form.
- **locked** -- kickoff has passed; the game stops accepting picks. A Suggested Parlays set locks
  earlier, 2 hours before its kickoff (`spLockAt`): from then to kickoff it is the record's set,
  which no Refresh odds press changes; a locked leg keeps its locked price and fair chance (`kept`, app v125).
- **published read** -- (app v125) the props job's own read of DraftKings' lines on ESPN, made on every
  run by `espn_read.js` with the page's `espnReadWeek`, published in the payload (`PAY.espn`, and the
  schedule's game lines marked `lsr` 'espn') and installed at boot by `espnPublished` for every visitor
  and the record. Its player prices are the page's estimate of DraftKings' (`dkline`, est.).
- **press / kept read** -- a visitor's Refresh odds read in that browser (app v107), and that read kept
  in its storage across a reload (`props_press_v1`, app v108), standing over the publish it was read over
  or where newer than the publish's own time; a fresh press always applies over the published read.
- **read-made entry** -- (app v125) a `PAY.dk` game entry a read of ESPN made (the published read's, a
  press's, the parlay card's check's): only `event`, `glat` and team and game-line ids, so it never counts
  as carrying the pull's ids (`dkEntryCarries`: an entry carries only with a paid `at` or a player's key).
- **admin** -- (20 October 2026) the browser the admin link (`#owner=<Odds API key>`, `admin.js`) was
  opened in: the site owner's, "hide only", with X Parlays, the X Bet Log and Pull from DraftKings; every
  other browser is a visitor's.
- **pulled leg** -- a player leg Pull from DraftKings priced on the admin's card (`l.pulled`, from
  `window.dkPulledFor`, on a fresh copy only, never `S.parlay`), at DraftKings' own price and slip id, in
  the card's memory for that page load.

### The audit is a gate, not a test suite

`weekly.py` exits with an error when `audit.js` is not clean (its summary line read as
numbers by `audit_verdict`, 0 failures and 0 runtime errors, a missing line not clean;
`build/test_audit_gate.py` holds that to its cases), so the job stops before its commit step: a failing check means the site stops updating and the
scheduled run is marked failed. Its warnings do not: a check the audit names as presentation only
(`W.<kind>` in `audit.js`, the kinds and their reasons in `WARN`: who is shown starting or listed,
an ordering, which correctly priced parlay a level or a game hand picks, a note's wording in the
panel, a rule the week's data left untested, the credit panel) counts on the summary line
("28944 checks, 0 failures, 2 warnings, 0 runtime errors"), the run publishes, and the warnings go
into the problems file, so the job goes red after its commit (`audit_warnings`). Everything else
blocks: a number, a price or a leg on the wrong player or game, a sum, settlement, the payload
against its sources, a runtime error, a chance or payout floor a card states against its numbers;
and V6 blocks a suggested leg or candidate on anyone this week's report has Out, Doubtful or
Questionable, the roster has off its active list, released, inactive this week or on no roster, or
the inactive rule holds out, worked out by the audit from the sources (`NOPLAY`), whatever the
listing warnings say. A check on made-up data
stays blocking: only a code change can fail it. It does the same when a required download (schedule,
stats, roster, injury report) fails, the stats would shrink, or the ESPN read cannot be applied (no run buys a
price since 20 October 2026, so nothing is held) -- except that a 404 on the stats or the injury report, with none of this season's
published yet, is a file nflverse has not posted: the run publishes without it and says so. ESPN not answering
never refuses: the last read stays published, and a stale read near a kickoff is a problem after the commit.
Write checks against the app's invariants, never against whatever that week's
data happens to offer, nor the hour it runs: `audit.js`'s BLOCKING AND WARNINGS note gives the five
rules (the page's clock; a row the check can stand on; planted data on a fixture of its own; the page's
fallbacks; the off-season), after two refusals on 15 October 2026 (#270, #271) by checks that laid
made-up ids over the week's real ones. **The props gate** (`.github/workflows/props-gate.yml`, logic in
`.github/scripts/props_gate.py`) holds a PR to them before it merges: on a change to what the props job
or the page runs it bakes today's data with `weekly.py --no-odds` (today's nflverse files and today's read of ESPN,
recorded so the base replays the same answers) and runs the page smoke and `elo/check_tab.js` on it (job A),
replays every `build/test_audit_phases.py` case on a runner of its own (job B; the smoke cases alone
when only the page's files changed), and runs the unit tests, `UNITS` in `props_gate.py` (job C, since 20 October 2026:
the ESPN read and its application, the crons against the locks, the ids, the names, who played, the downloads, the audit's
verdict, the card's name rule, the admin link and `smoke_live.js`, the parlay card and Pull from DraftKings on a stubbed
Odds API; 45 minutes at most, room for both page smokes at their own caps here and again on the base; its step's env sets
`NODE_OPTIONS` to `--max-old-space-size=6144`, smoke_live.js's live heap being over Node's default on a runner under about
16 GiB, where it and the base both died of out-of-memory and job C passed it as a warning), each failure run again on the base's code, so only a failure that is the PR's fails the `props-gate` check. Section V is the reality check: it builds the page the way a
browser does and compares it with the raw files the job downloaded (`PROPS_AUDIT_RAW=1`,
set by `weekly.py`) -- nobody on a reserve list listed, every Out off the page and every
Questionable tagged, every main line and price on the player the book named, the stats
complete, the teams the roster's, every price of this season's games -- and proves the rules
on made-up reports, so a bye, week 1, a week with no report yet or a pre-season with no
stats, no report and no prices (V0b, and the track-record checks that need prices only when
the payload has some) cannot fail it.

## Betting: how it fits together

The app is developed in a separate repo (`nfl-model-lab`) and shipped here as
one HTML file. `update.js` runs that real app headlessly in jsdom, through the
same upload path the owner would use by hand, starting from the last published
`state.json`, and writes the new state with the private parts stripped (bets,
bankroll, the owner's picks). It is idempotent: already-graded games are skipped,
games whose stats are not out yet wait for the next run.

`state.json` holds `teams` (Alpha Model's team ratings and EPA: Power Ratings shows Alpha
Model's EPA, but its order and Elo are the
team ratings of results in `elo/data/model.json`), `schedule`, `processed` (graded games), `odds` (nflverse's
moneylines, spread and total: the Game snapshot's Vegas baseline, the Matchups board's until it went on 22 October
2026), `qb`, `injuries`
(the report's columns the app reads), `depth`, `roster`, `events`, `joker`,
`atKickoff` (each coming game's Alpha call, recorded by every run before its
kickoff and kept from then on; the game is graded on it, `processed[gid].atKickoff`),
`jokerFit` (the weeks the Joker was fitted on after they were played, kept as data, and `calls`,
the history file their calls come from), `modelStatus` (only while
the Joker could not run: since when and why), `prevElo`/`prevRanks`, `published`, and
the app's own bookkeeping (`gamesPlayed`, `modelBuild`, `prevRanksWeek`, `season`,
`showAllModels`, which the build turns on because it also shows the Joker, the ELO Model and Vegas
on the Pick'em Record, and `snapWeek`). What a retired model published is dropped by `update.js`
(`RETIRED_MODELS`), since the app is seeded with the last published state and keeps every key of
it: Joker Jr's `jokerLong` and `jokerLongInfo`, the Challenger's `teamsH`, `processed[gid].h` and
`atKickoff[gid].h`, and the Broly Model's `broly`, `processed[gid].broly` and `modelStatus.broly`
(the last two taken off the site on 13 October 2026).

The app runs with the patches in `tools/patches.js`, in the job and on the page alike. Who starts
at quarterback: a quarterback who did not start his team's last game and was on that week's injury
report is held out until this week's report clears him (a Full or Limited practice, or a report his
team filed without him); Questionable with no practice on the final report is out. The depth chart
keeps an injured starter at the top and the game designations come only with the final report, so
without this every starter who missed the last game was counted back in from Tuesday (Mayfield,
Caleb Williams). The absences card names the starter a change replaced, says "not cleared" for a
held quarterback, and ends with the date of the injury report and depth chart it was built from,
flagging either when stale. A game abroad that nflverse codes 'Home' is neutral
(`neutral_sites.json`). The season's phase: once every posted game is played the card waits for
the next round, and after the Super Bowl it is empty. The smoke test holds in every phase: the
week before the opener (no game graded, no injury report yet), a week part played, between
playoff rounds, after the Super Bowl, and a season the Joker cannot call (`modelStatus`); a check
with nothing to look at says it was skipped. Team Rankings stars a team whose regular-season
finals outnumber its rating's record, or whose playoff final kicked off after the Elo file was
built (the Elo file's record is the regular season's); the note under the table says the whole
table predates that final, since every final re-scores every team's games.

Every call is frozen at kickoff: Alpha's through `atKickoff`, the Joker's through `jobkit.freeze`
(a game that has kicked off keeps the call of the last run before it). A closing line nflverse posts afterwards, a depth chart that moves, or a refit never rewrites
a call a reader saw. The page shows the frozen call for a game under way and settles a scoreboard
final on it, for every model at once (the ELO Model included).

A required file that does not download fails `update.js` before anything is written: games.csv
always, the roster and depth chart from a week before the season, the injury report from its first
kickoff (the league files none before the week of the opener and nflverse's file is a 404 until it
does, so before then the run publishes without one and the absences card says "no injury report
yet"), both stats files once a final is a day and a half old (`patches.filesDue`, the one rule the
job and the smoke test both use). An older copy in `data/` is never used in its place. The
Joker refuses the same way on its own inputs (the season's stats and play-by-play once a final is
a day and a half old), keeps its last good picks, writes `modelStatus` and exits 1; the workflow
carries on past it (`continue-on-error`) and the Pick'em Record says so.

**The Joker** (`betting/joker/`) is a separate gradient-boosted-trees model,
fitted 2019-2025 and refitted once with 2026 weeks 1-2 in its training (`tune_2026.py`, 24
September 2026), whose picks `joker.py` writes into `state.json` (`joker`, the pick
and home win chance for every game, regular season and playoffs, and `processed[gid].joker` once
graded) and show beside Alpha Model's on the Pick'em Record. Its calls on weeks 1-2 are not the
refit's, which saw those games' results (25-7, +2 against Vegas, in sample): on 12 October 2026 the
owner asked for the record it actually had, so `joker.py` takes those 32 games' calls on every run
from `betting/joker/history/2026_w1_w2.json`, written once from git and never by the job. Week 2's
are the calls `state.json` carried before each kickoff (`src: 'published'`, the commit and its time
on each); week 1 was played before the Joker existed (its model was fitted on 15 September, after the
week's last kickoff), so its calls are that original model's, fitted on 2019-2025 alone, called after
the games on the ratings from the games before each and the game's own closing lines (`src: 'backtest'`, the
same calls the state carried from its first commit). Its quarterback inputs give it no hindsight there:
the backup-quarterback drop is zero in a team's first game of a season, and the starters' names, which
games.csv records from the game itself, move none of the 16 chances when blanked (rescored from f0397e4's
model on 12 October 2026, every chance the file's to four places). Both are the model #117 put back. Week 1 is counted like any other week, as
the ELO Model's own backtest weeks 1-2 are on the same chart, so the models are compared on the same
games; `src` rides on each call and grade, and the record draws no hatch, label or note (the owner's
call of October 2026, kept). The real record: 13-3 in week 1, 11-5 in week 2, 24-8 and +1 against
Vegas (the refit showed 25-7, +2), one win fewer on the season than the refit showed. From week 3 the refit
model's calls were made before kickoff and stand. `joker.py` refuses a run where a week in
`fitted_weeks` has a game with no call in a history file, and the smoke test (5n) holds every call
of the file to the published state and its grade, and every call the last commit's copy of the file
held to that copy; 5h let such a call move onto the file's once, from the refit's call (which carries
no `src`), and holds it from then like any other call after its kickoff.
Each run also logs, in the job's
output, any input that has drifted from the scale it was fitted on (`drift.py`). It refuses a season more than
one past its frozen data.

The season is the app's (`freshState`), read by `patches.season()`: `update.js` downloads that
season's files and publishes `season`, which `joker.py` reads, so an early 2027
schedule in games.csv moves nothing until a 2027 app ships. The visitor's store is keyed on it.

Gate: the app's embedded model numbers must equal `reference_models.json` or the
publish aborts; that includes `MODEL_H`, the retired Challenger's, which still ships in the app and
is held as shipped although the site no longer makes or shows it. Shipping a model change means passing the release gate in
`nfl-model-lab`, then copying both the app and `reference_models.json` here.

Tabs: AI Picks, Parlay Builder, Records, Bet Log, Power Ratings, Data Upload,
Backup (the build drops My Picks). The Bets and Stats page frames Records, Power
Ratings and Bet Log only, with the app's header and tab bar hidden; the Bet Log there is the X
Bet Log, read only (the page hands the frames `window.XBETS`; see "X's parlays and the X Bet Log").

## College

CFB Hub (then X College Football Bets) moved whole to `DEMON-X13/cfb-hub` on 2026-10-14 with its history (page at
the root, `tools/`, `data/`, `.github/workflows/update.yml`); `cfb/index.html` here redirects to it.

## Hockey

X NHL Bets moved whole to `DEMON-X13/nhl-hub` on 2026-10-13 (page at the root, `tools/`, `data/`,
`.github/workflows/update.yml`); `nhl/index.html` here redirects to it.

## News: the job and the game notes

The Season Tracker's page and its tab are gone (the owner's call, 14 October 2026): each game's
preview and Deep Dive are in its Game snapshot (opened from each game's page on the Props tab since app v128, from the
Matchups board until then), and `news/index.html` only sends
a visitor to the site's root, `../` (`../nflbets/` until 17 October 2026, when the page moved there). The week files, the team paragraphs, the rank chip and the player positions
are in git history before that day. The job is automated: `pull-week.js` refreshes scores, records
and the stat bars (`stats2026.js` and its twin `stats.json`, which no page read from 16 October 2026 until app v124 gave a game's page on the Props tab its Team Stats window, which reads it when it first opens) from ESPN and TeamRankings and writes the
reading pack, and `context.js` the Deep Dive (`units2026.js` and its twin `units.json`); it drafts no
week file. **The game notes are written by a person**: each Wednesday a Claude routine (and Claude
whenever the owner asks) writes `data/notes/<season>-w<N>.json` from the pack, checks it with
`node tools/notes.js --strict` and the smoke, and merges it; the snapshot shows it on its next load,
with no rebuild of the page, and an automatic line for a game not yet written. Read
`news/HANDOFF.md` before touching anything here. A note names every player in bold (`**Bo Nix**`,
players only, the owner's call of 14 October 2026) and quotes no betting word, no typed record and
none of the site's own ranks (they move under it); `notes.js` fails a note's shape and warns on its
wording, and the job's smoke reports every note problem as a warning, so a note never holds back the
week's scores, stats and Deep Dive; so do the Deep Dive's lineup checks, which warn. After week 18 the
job stays on week 18; it does not cover the playoffs.

## Workflows

| Workflow | When | Does |
|---|---|---|
| `props.yml` | 22 runs a week (UTC), every one free since 20 October 2026 (the owner's call: no scheduled paid pull; no odds-API key mapped): Mon, Wed and Thu 08:17 (Monday night, Thanksgiving's early game, Thursday night), Sat 05:17 (the weekend, on the site by Saturday morning Pacific), Sun 04:47 (new that day, for the Sunday slot's lock 2 hours before its first kickoff), 8 post-game and stats runs, Saturday 16:07 and 23:07, and a daily 12:07 that lands after nflverse posts the day's injury report; set by the Suggested Parlays locks they must land before, since GitHub fires this repo's crons 2-9.4 hours late, and held to them by `build/test_lock_runs.py` (which replaced `test_pull_schedule.py`). Until that day four of the slots were price pulls (~7 credits a game) and the rest catch-ups | `weekly.py --no-commit` (download, bake, assemble, read DraftKings' lines on ESPN with `espn_read.js`, apply the read with `apply_espn`, audit, then the suggestions record, `suggest_ledger.js`, which never fails the run), then the workflow commits `props/data` (the ledger with it) to `main` unless `weekly.py` refused the run (a required download failed, the stats would shrink, the read could not be applied, the audit is not clean), in which case it commits nothing and opens (or comments on) a `props-refused` issue with `build/refused_note.py`'s text (why, the published payload and its read, the next game and its kickoff, what to do: a fix, then `gh workflow run props.yml`), which the next clean publish closes; afterwards the run fails if `weekly.py` reported problems (a stale ESPN read near a kickoff, a reader that crashed, the audit's warnings). The `no_odds` dispatch input is kept and read by nothing; `props/raw/espn/` is never committed |
| `props-gate.yml` | every pull request, a push to main that touches what the props job or the page runs, and on demand | sorts the change's paths (AUDIT, PAGE, neither: passes at once); job A `weekly.py --no-odds` on today's nflverse files and today's read of ESPN (recorded, so the base replays the same answers: `--offline` over a copy, or `PROPS_ESPN_REPLAY` when it goes online), then the page smoke and `elo/check_tab.js` on its payload (40 minutes at most); job B each `test_audit_phases.py` case on a runner of its own; job C the unit tests (`UNITS`: `test_apply_espn.py`, `test_espn_read.js`, `test_lock_runs.py`, `test_espn_ids.py`, `test_dk_links.py`, `test_unmatched.py`, `test_who_played.py`, `test_fetch.py`, `test_audit_gate.py`, both `lib/test_netfetch`, `nflbets/build/test_dkname.js`, `nflbets/build/smoke_admin.js`, `nflbets/build/smoke_live.js`; 45 minutes at most, with `NODE_OPTIONS=--max-old-space-size=6144` for smoke_live.js's heap, here and on the base); a failure is run again on the base's code and fails the `props-gate` check when the base passes or has nothing to compare with (`test_props_gate.py` holds the judgement); the verdict waits on all three. Spends nothing (no secret mapped; `ODDS_API_KEY` set empty), commits nothing |
| `update.yml` (the betting job) | Fri/Mon/Tue mornings ET with an afternoon catch-up each, post-game runs, two runs before each Thursday, Saturday and Sunday kickoff window (set so a 9-hour late start still lands before kickoff), an ":37 hourly" slot GitHub fires about six times a day, and on demand with a "rebuild" switch | betting `update.js` and `joker/joker.py` (which may fail on its own without stopping the publish), the game-totals shadow `props/research/totals/shadow.py` with `shadow_check.py` (the same), the clearing of X's finished parlays (`liveparlays/tools/autoclear.py` after its test, the same), `smoke.js` (which builds the app; its few presentation checks warn, publish, and redden the run's last step, which runs only after a smoke with no failure); commits `betting/state.json`, `props/research/totals/shadow/ledger.json` and `liveparlays/parlays.json`; starts `elo.yml` when a final was graded, even if the smoke or the commit failed (the Elo job reads nflverse, not this state) |
| `news.yml` | about 19 slots a week (UTC): five post-game runs, a mid-day refresh Mon/Tue/Fri, and eleven for the Deep Dive's lineups timed to the injury report (Tue and Wed afternoon, Wed evening and early Thu for Thursday games, Thu afternoon for Thursday night, Fri evening, Sat afternoon to early Sun four times for Sunday), each early enough to land before its kickoff at the 2.3-9.4 hour lateness GitHub shows this repo; and on a push to its tools, the game notes, `news/index.html` or `nflbets/build/deepdive.js` | `run-auto.js` (`pull-week.js`, which runs `context.js`; a required nflverse file that fails stops the run before the commit), `smoke.js` (the files against their sources, the twins, every game of the week drawn by `deepdive.js`, the lineups against the report they came from, the notes, the redirect, and `cases.js`; the lineup and notes checks warn, publish, and redden the run's last step, which runs only after a smoke with no failure); commits only what changed: `results.js`, `stats2026.js`, `stats.json`, `units2026.js`, `units.json` and `tools/out` (never a note) |
| `elo.yml` | queued daily 12:40 UTC (08:40 EDT), Saturday 20:40 and Sunday 03:40 UTC; GitHub starts them 4-9 hours late, so the weekend slots are set to land before Sunday's first kickoff | restores the finished seasons' nflverse files (`actions/cache`, `elo/cache-past`, the set `elo/cache/past.lst` names), `elo/build.py` (refuses to write on a failed required download), `elo/check.py`, `elo/check_tab.js`, commits `elo/data`; then the nflbets smoke (a page check: it reddens the run, never holds the ratings back); saves the finished seasons' files when their set changed |

Every workflow runs on `ubuntu-24.04`, pinned: `ubuntu-latest` becomes Ubuntu 26.04 on 19 October
2026, to be tried on purpose in a dispatched branch run before the pin moves.

No job spends money since 20 October 2026: the props job reads DraftKings' lines from ESPN's free feed, and no workflow
maps `ODDS_API_KEY` (the repository secret stays until the owner deletes it; until that day `props.yml` spent ~7 credits a
game, ~112 a week, of 500 free a month). The Odds API is asked only from the site owner's own browser, with his own key
(the admin link's free check, and Pull from DraftKings on his parlay card, up to a credit a game and market), and by hand
(`props/data/oddsfetch.py`, `credits.py`). The other four jobs use free sources.

Every download the four NFL jobs make goes through `lib/netfetch.py` or `lib/netfetch.js`: a transient
failure (a 5xx, 408, 425 or 429, a timeout, a reset, a cut-off transfer, an empty or HTML body) is tried
again after 5, 15, 30 and 60 seconds under a ten-minute budget a process, and a 404 or other 4xx is
answered at once with its status, so each job's "not posted yet" rules read it as before. The props
job's read of ESPN goes through `lib/netfetch.js` too (`espn_read.js`: a plain User-Agent, then none on a 403, a
150-second deadline for the whole read). Each NFL job has a
`timeout-minutes` (elo 40, props 45, betting 40, news 30), so a stalled socket fails the run within the
hour, not at GitHub's six. The Elo job reads 49 nflverse files a run in season, 43 of them finished seasons' (50 and 44 while the
rankings are still on the finished season, which also reads the play-by-play of the season before it); the
finished seasons' are kept between runs by `actions/cache` (CLAUDE.md, "Player Elo: the loop").

## Gotchas

- Editing a generated file is wasted work: the next scheduled run overwrites it.
  Change the source and rebuild.
- `betting/app/x_nfl_betting_model.html` looks generated but is **source**.
- The props audit needs `npm ci` in `props/build/` first.
- `parlayProb()` is seeded and deterministic; don't assume Monte Carlo noise
  explains a changed number.
- A line read from ESPN is never a book price: nothing of a read (the published one or a press) goes into
  `PAY.mkt`, `PAY.prices`, the paid `PAY.dk` or `S.odds`, which `mainOf`, `legFair`, `fairVig` and the Track
  Record read as DraftKings' quoted prices. A player's price from a read is the page's estimate (`dkline`, est.).
- `weekly.py`'s `espn_rules` reads `ESPN_KEEP_STATS` and `ESPN_KEEP_PID` out of `part3.js`, so the job publishes
  exactly what the page installs; a change to those lines' shape refuses the run until `weekly.py` follows.
- The admin gate hides two tabs and protects nothing in their files (public by address); what it protects is the
  Odds API key, which only `admin.js` may hold or send, and `build.js` refuses a page that names the API's host,
  `apiKey=` or the record's key anywhere else.
