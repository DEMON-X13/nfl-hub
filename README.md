# nfl-hub

One repo, five workflows in `.github/workflows/` (four scheduled jobs, one per model or
site: `elo.yml`, `news.yml`, `props.yml` and `update.yml`, the betting job; and the props gate,
`props-gate.yml`, on pull requests) and one site, NFL Hub at the repo's root, plus the standalone
Weekly Picks page. Each scheduled job downloads its sources, runs its model without anyone clicking
anything, and commits the data; the pages fetch it on load. The props gate runs the props job's and
the page's checks on a change before it merges and commits nothing.
GitHub Pages serves the repo root, and the root's `index.html` is NFL Hub (since 17 October 2026, the owner's
call: "can you make https://demon-x13.github.io/nfl-hub/nflbets/ be https://demon-x13.github.io/nfl-hub/ and get rid
of that page"; until then the page was `nflbets/` and the root a landing page linking it, Weekly Picks and the other
hubs):

| Path | What | Source |
|---|---|---|
| `index.html` (the root), from `nflbets/` | NFL Hub (once X NFL Bets and Stats), the one NFL site, in the NBA Hub's and the NHL Hub's look (dark, with a light look a visitor can switch to at the header's top right): both models on one page, the Props tab first, and a Game snapshot of every game, which the matchup bubble opens (the Matchups board went on 22 October 2026); `nflbets/index.html` only redirects old bookmarks to the root | built by `nflbets/build/build.js` from the props parts, the betting app, the page's glue (`nflbets/build/hub.html`), the X Parlays section, the storage layer, the look (`nflbets/build/theme.css` and `theme.js`), the admin link (`admin.js`), the parlay card (`card.html`), the matchup bubble (`glance.js`), the Player Elo tab and the Game snapshot (with `nflbets/build/deepdive.js`); rebuilt by hand when a source changes, never by a job |
| `betting/` | X NFL Betting Model: no pages, only the app source, tools, job and data; the app runs inside the page | `betting/app/x_nfl_betting_model.html`, copied from `nfl-model-lab` when a version ships |
| `props/` | Prop Model: no pages, only the parts, build, job and data (`props/data/payload.json` is what the page reads, with the job's own read of DraftKings' lines on ESPN in it) | `props/` is the prop model package; its own `weekly.py` does the refresh |
| `news/` | the news job: no page since 14 October 2026 (`news/` sends a visitor to the root); the Deep Dive and each game's preview, which the Game snapshot reads, and the stat bars, which a game page's Team Stats window on the Props tab reads since 20 October 2026 (app v124) | moved from `DEMON-X13/nfl-news-tracker`; `tools/run-auto.js` does the scripted half, and the game notes in `data/notes/` are written each Wednesday by Claude |
| `elo/` | Player Elo: every player rated by position since 2012, the game model and matchup formula built on those ratings, and each team's Overall Offense and Overall Defense and six position tables on this season's play-by-play | `elo/build.py`; `.github/workflows/elo.yml` re-rates every morning |
| `liveparlays/` | the X Parlays section's source, X's placed parlays and the X Bet Log, shown read only on the site owner's devices alone since 20 October 2026 (the admin link; the files stay public by address); its `index.html`, like `live/` and `pickems/`, only redirects old bookmarks to the root | `liveparlays/build/page.html`, `liveparlays/parlays.json` and `liveparlays/xbets.json` (kept by Claude from what the owner sends) |
| `cfb/` | a redirect: CFB Hub (once X College Football Bets) lives in its own repo, `DEMON-X13/cfb-hub` | `cfb-hub` |
| `picks/` | Weekly Picks: a visitor picks the winner of each game of the current week (`betting/state.json`'s schedule, the first week with a game still to play) and saves the picks as a JSON file to send to X; kept in that browser only, a game locks at kickoff, nothing is sent anywhere; the files friends send X go in `picks/friends.json`, which the Pick'em Record draws beside the models | `picks/index.html`, hand-written, no build; reads `betting/state.json` on every load and team names and colours from `news/data/teams.js`; `picks/friends.json`, kept by Claude with `picks/tools/add.js` |
| `nhl/` | a redirect: X NHL Bets moved to `DEMON-X13/nhl-hub` on 2026-10-13 | `nhl-hub` |

## Betting site

- `betting/tools/update.js` runs the real app headlessly (jsdom), starting from
  the last published `betting/state.json`, feeds it the six nflverse files
  (games, team stats, player stats, roster, injury report, depth chart), and
  writes the new state with the private parts stripped (bets, bankroll,
  the owner's picks). Idempotent: a second run with no new data changes nothing.
- Gate: the app's embedded model numbers must equal
  `betting/tools/reference_models.json`, the numbers the research harness
  exported. A mismatch aborts the publish.
- `betting/tools/build.js` builds the app from the one app file for
  `nflbets/build/build.js`, which carries it inside NFL Hub's page and
  shows its Records (as Pick'em Record), Power Ratings (as Team Rankings) and Bet
  Log (as X Bet Log) tabs in frames, the app's own header and tab bar hidden. It
  loads the published season from `betting/state.json` and keeps the visitor's
  own picks, bankroll, Bet Build and any odds they load in their browser only,
  under one key; the job's published state wins on every load. Picks are graded
  against the published results. nflverse's moneylines, spreads and totals are
  published with the state (`odds`): they are Vegas, the baseline on the Pick'em
  Record and in the Game snapshot. The X Bet Log is X's, from
  `liveparlays/xbets.json`, read only and shown on the site owner's devices alone
  (see X Parlays below); nothing a visitor does in the app changes what anyone
  else sees.
- `betting/events.json`: manual team news the job cannot infer (resting
  starters). One entry per line, applied once by id:
  `{"id":"2026-wk18-KC-rest","type":"rest","team":"KC","week":18,"note":"clinched"}`.
- `betting/tools/smoke.js`: loads the built viewer with the published state and
  checks the tabs, the pick storage and the grading of a visitor's pick, then the
  state against what it was built from.

Local run:

```
cd betting/tools && npm install
node betting/tools/update.js            # download + grade + write state.json
python3 betting/joker/joker.py          # the Joker's picks into state.json
node betting/tools/build.js             # checks the app builds; writes nothing
node betting/tools/smoke.js             # the built app, plain and embedded
node nflbets/build/build.js             # the page that carries the app
```

## Prop model

`props/` is the prop model package, plus `requirements.txt` and a lockfile so
the job can install it. `props/build/weekly.py` downloads nflverse's files
(the schedule, player stats, roster, injury report, depth charts and snap
counts), bakes stats and injuries into the payload, assembles the prop model's
page (gitignored: the audit's subject, never published; the prop model has no
pages of its own, its parts are the source of NFL Hub's page, the root's
`index.html`), reads DraftKings' game lines and player lines from ESPN's free
feed with the page's own reader and publishes that read in the payload, keeps
DraftKings' player lines game by game in its archive, runs the audit (some
45,000 checks) against the assembled page and then the suggestions record. No
job buys a price since 20 October 2026: a game line is DraftKings' own price
from ESPN's scoreboard, and a player's line is priced at the page's estimate of
DraftKings' price, marked est. `raw/feat.pkl` (43MB, the fitted feature table
for 2019-2025) is committed so the job does not rebuild it. Visitors' parlays
and bets stay in their browser.

Its workflow, `.github/workflows/props.yml`, runs about 22 times a week, every
run free: the slots are set by the Suggested Parlays locks they must land before
(`props/build/test_lock_runs.py` holds them), plus post-game and stats runs and a
daily run after nflverse posts the day's injury report. It runs
`weekly.py --no-commit` and commits `props/data` itself; a refused run commits
nothing, so the last good data stays live, and opens a `props-refused` issue.
After the publish, on `main`, the touchdown shadow's steps run (research only,
never shown). No workflow maps `ODDS_API_KEY`: the repository secret is unused,
left in the settings on purpose so a rollback stays one revert.
`props/data/oddsfetch.py` and `credits.py` are tools to run by hand. On the site
owner's devices the parlay card's Pull from DraftKings spends his own Odds API
credits, from his browser, on that one parlay.

## The news job

`news/` was the Season Tracker, a newsletter-style page and then a tab of X NFL
Bets and Stats; since October 14, 2026 (the owner's call) what it said of each
game is in that game's Game snapshot, the window the matchup bubble's Open game
snapshot opens (a tap on a game on the Matchups board until that board went on
22 October 2026), and `news/` on its own sends a visitor to the site's root.
`tools/run-auto.js` works out the current week from the nflverse schedule and
runs `tools/pull-week.js`, which refreshes `data/results.js` (scores, records)
and `data/stats2026.js` with its twin `data/stats.json` (the stat bars) from
ESPN and TeamRankings, rebuilds the Deep Dive (`data/units2026.js` and its twin
`data/units.json`) with `tools/context.js`, and writes the reading pack to
`tools/out/`. The snapshot fetches `units.json` as the page loads, and a game
page's Team Stats window on the Props tab fetches `stats.json` the first time it
opens (since app v124, 20 October 2026; from 16 October, when the snapshot's Stat
breakdown went, no page read it). Each game's one-line preview and short news
note is written each Wednesday by Claude into `data/notes/<season>-w<N>.json`
from the pack (see `HANDOFF.md`) and checked with `tools/notes.js`; until a game
has one the snapshot shows an automatic line. Free sources, no credits. Workflow
`.github/workflows/news.yml`: about nineteen runs a week, post-game and timed to
the injury report, and once on a push to the job's code or the notes.

## X Parlays and the X Bet Log

X Parlays is a tab of NFL Hub (`#xparlays`; `live/` and `liveparlays/`
redirect there) on the site owner's devices alone: X's placed parlays, and
nothing else. X's parlays are the slips placed at the book, in
`liveparlays/parlays.json`, followed live against ESPN's public scoreboard and
box scores in the browser; a parlay marked `cleared` stays in the file as
history and is not drawn. The section's source is `liveparlays/build/page.html`,
lifted in by `nflbets/build/build.js` with its styles scoped to its card and its
script in a closure. The X Bet Log tab is X's week-by-week log from
`liveparlays/xbets.json`, with the balance from its deposit.

The Parlay Builder is its own tab (`#parlay`), the builder at its top (under the
list until 18 October 2026). Under it a visitor picks All, Teams only or
Players only (or ticks moneyline, spread, game total, player overs and player
unders by hand) and the week's games to build from, types a Bet amount (the
builder's own stake, one number), and gets the Top 50 lines those choices make
(the Top 100 until 17 October 2026, the Top 50 until 18 October 2026, the Top 30
until 31 October 2026): up to 40 player lines, a mix of bet types (each type's
likeliest first, one of each type, then a second of each, and so on: app v141),
then the game bets, each ranked by what $1 on it is expected to
return at DraftKings' fair chance (since 27 October 2026, app v138: every leg is
stated at DraftKings' fair chance, the model's projection beside it as information,
and no line is marked a Value pick until a model earns it), each with its own Add.
Every price is DraftKings' line read from ESPN (the props job's read, published
with the payload, or a visitor's Refresh odds press), a player's at the page's
estimate of DraftKings' price. ESPN gives no DraftKings id for a player's line, so
a visitor's Open in DraftKings carries team bets and totals, and player legs go on
DraftKings by hand (on the site owner's devices the parlay card's Pull from
DraftKings puts them on).

Suggested Parlays (`#suggest`) is three sections: Record, Day games (one set
across the week's Sunday games before 7 pm Eastern, not drawn from 4 pm Eastern
on Sunday) and Night games (each Thursday, Sunday and Monday night game's own set,
shown one night at a time). Each set has four levels, each the likeliest parlay of
2 to 12 legs whose price is at least its own: Safe +110, Medium +300, Aggressive
+700 and Extreme +1500 (app v145; Extreme is kept in the record and hidden on the
tab). Each level shows its price, DraftKings' fair chance, its expected return at
it (negative: the book's margin) and what the Bet amount pays, with Add to builder
and Finish; each set locks 2 hours before its kickoff, its first kickoff for the
Day games, and is graded by the props job's suggestions record. A player's leg
there wears his Mismatch tag where this week's Mismatches tag him (app v142, which
took the Elo picks off). A tap on a player's or a team's name on either tab opens
the matchup bubble, their matchup for the day at a glance, and its Open game
snapshot opens the game's whole Game snapshot. Only the bets DraftKings posts are
offered (FG attempts went on 17 October 2026), and only main lines, anytime
touchdowns and team bets: no ladder bets since 21 October 2026 (app v127). A game
total is priced at the book's own chance (`props/research/totals/README.md` says
why), and a suggested parlay takes one only where its game's other legs cannot
make the level. No device keeps a list of its own: the builder, kept in the
browser alone, finishes a parlay as a card to download as an image
(`nflbets/build/card.html`), saved nowhere.

Both files are kept by Claude from what the owner sends in chat (a slip's legs,
stake, price and payout, added with `liveparlays/tools/add.py`; a week's stake
and return), as each file's `how` field says. The site owner's devices read them,
read only, on every load: since 20 October 2026 X Parlays and the X Bet Log are
tabs only in a browser where his admin link (`#owner=<his Odds API key>`) has been
opened. It is hide only: the files stay public by address, a visitor's page reads
neither, and what it protects is his key, which goes from his browser to The Odds
API alone. There is no sign-in and no shared store: nothing on the page writes
anywhere but the visitor's own browser. (Until 10 October 2026 they lived in a
Firebase database written from the owner's devices; that is retired and its last
state is in the files.) The betting job clears a finished parlay itself
(`liveparlays/tools/autoclear.py`, the day after its last game).

The ESPN parsing is not copied into the section: inside the page it uses the
prop model's own readers from `props/build/part2.js`, so there is one source of
truth and the prop model's audit keeps testing it.

```
node nflbets/build/build.js         # -> index.html, at the site's root
node nflbets/build/smoke_live.js    # the section from its file, and the parlay card
node nflbets/build/smoke_admin.js   # the admin link and the hidden X tabs
node nflbets/build/smoke.js         # the whole page, Suggested Parlays, and on an admin's boot X Parlays and the X Bet Log from their files
```

## The betting job

`.github/workflows/update.yml` is the betting job (the file name is a leftover
from when one job ran every site): Friday, Monday and Tuesday mornings (Eastern)
with an afternoon catch-up each, post-game runs, two runs before each Thursday,
Saturday and Sunday kickoff window, and a slot at :37 every hour on paper, which
GitHub fires about six times a day with gaps of up to 8 hours (a background
refresh of the lines and the injury report, not an hourly promise); and on
demand with a "rebuild" switch that replays the betting season from the
preseason board, for the next time a model correction ships. It runs
`update.js`, `joker.py`, the game-totals shadow, the clearing of X's finished
parlays and `smoke.js` (which builds the app), commits `betting/state.json`, the
shadow's ledger and `liveparlays/parlays.json` only if something changed, and
starts the Elo job when a final was graded. Free nflverse files only.

## Shipping a model change to the betting site

1. In `nfl-model-lab`, pass the release gate (`python app/tests/run_all.py`).
2. Copy `app/x_nfl_betting_model.html` and `app/tests/reference_models.json`
   here (`betting/app/`, `betting/tools/`).
3. Run the job with "rebuild" if the change affects grading; otherwise let the
   next scheduled run pick it up.
