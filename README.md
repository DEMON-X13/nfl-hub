# nfl-hub

One repo, six scheduled jobs (one per model or site, in `.github/workflows/`) and
four sites with pages. Each job downloads its sources, runs its model without
anyone clicking anything, and commits the data; the pages fetch it on load.
GitHub Pages serves the repo root:

| Path | What | Source |
|---|---|---|
| `nflbets/` | X NFL Bets and Stats, the one NFL site: both models on one page | built by `nflbets/build/build.js` from the props parts, the betting app, the X Parlays section, the storage layer and the Player Elo tab; rebuilt by hand when a source changes, never by a job |
| `betting/` | X NFL Betting Model: no pages, only the app source, tools, job and data; the app runs inside `nflbets/` | `betting/app/x_nfl_betting_model.html`, copied from `nfl-model-lab` when a version ships |
| `props/` | Prop Model: no pages, only the parts, build, job and data | `props/` is the prop model package; its own `weekly.py` does the refresh |
| `news/` | Season Tracker, the newsletter-style site | moved from `DEMON-X13/nfl-news-tracker`; its `tools/pull-week.js` does the scripted half |
| `elo/` | Player Elo: every player rated by position since 2012, the game model and matchup formula built on those ratings, and each team's Overall Offense and Overall Defense on this season's key stats from the play-by-play | `elo/build.py`; `.github/workflows/elo.yml` re-rates every morning |
| `liveparlays/` | the X Parlays section's source, X's placed parlays and the X Bet Log, which every device sees, read only; its `index.html`, like `live/` and `pickems/`, only redirects old bookmarks to `nflbets/` | `liveparlays/build/page.html`, `liveparlays/parlays.json` and `liveparlays/xbets.json` (kept by Claude from what the owner sends) |
| `cfb/` | X College Football Bets, a test site: a rating model on every FBS game, moneylines and spreads | `cfb/index.html`, `cfb/tools/`; `.github/workflows/cfb.yml` |
| `nhl/` | X NHL Bets: a rating model on every NHL game, moneylines, puck lines and totals, the standings and the playoff picture | `nhl/index.html`, `nhl/tools/`; `.github/workflows/nhl.yml` runs three times a day |

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
  `nflbets/build/build.js`, which carries it inside the Bets and Stats page and
  shows its Records (as Pick'em Record), Power Ratings and Bet Log (as X Bet
  Log) tabs in frames, the app's own header and tab bar hidden. It loads the
  published season from `betting/state.json` and keeps the visitor's own picks,
  bankroll, Bet Build and any odds they load in their browser only, under one
  key; the job's published state wins on every load. Picks are graded against
  the published results. nflverse's moneylines, spreads and totals are published
  with the state (`odds`): they are the Pick'ems board's Vegas baseline. The X
  Bet Log is X's, from `liveparlays/xbets.json`, the same on every device and
  read only (see X Parlays below); nothing a visitor does in the app changes
  what anyone else sees.
- `betting/events.json`: manual team news the job cannot infer (resting
  starters). One entry per line, applied once by id:
  `{"id":"2026-wk18-KC-rest","type":"rest","team":"KC","week":18,"note":"clinched"}`.
- `betting/tools/smoke.js`: loads the built viewer with the published state and
  checks the tabs, the pick storage and the grading of a visitor's pick.

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

`props/` is the prop model package as it was, plus `requirements.txt` and a
lockfile so the job can install it. `props/build/weekly.py` downloads the five
nflverse files, pulls prop prices from the-odds-api (needs the `ODDS_API_KEY`
repository secret; about 7 credits a game, 500 free a month), rebuilds the
payload, bakes stats, injuries and prices into it, assembles the page and runs
the 26,000-check audit against the assembled page, which is gitignored: the prop
model has no pages of its own, its parts are the source of `nflbets/index.html`.
`raw/feat.pkl` (43MB, the fitted feature table for 2019-2025) is committed so
the job does not rebuild it. Visitors' parlays and bets stay in their browser.

Its workflow, `.github/workflows/props.yml`, runs four price pulls a week
(Mon/Wed/Thu/Sat) and eight post-game and stats runs and one every morning for the
day's injury report, which spend credits only on a game a dropped pull left unpriced. It runs `weekly.py --no-commit` and
commits `props/data` itself. The betting job never touches the key.

## Season tracker

`news/` is the tracker as it was. `tools/run-auto.js` works out the current
week from the nflverse schedule and runs `tools/pull-week.js`, which refreshes
`data/results.js` (scores, records) and `data/stats2026.js` (the stat bars)
from ESPN and TeamRankings, rebuilds the context files (`data/ranks2026.js`,
`players2026.js`, `units2026.js`) with `tools/context.js`, drafts
`data/weekN.js` if it does not exist, and writes the reading pack to
`tools/out/`. The narrative half of a week is still written by a person: the
draft is not shown until it is added to `data/weeks.js` and `index.html` (see
`HANDOFF.md`). Free sources, no credits. Workflow `.github/workflows/news.yml`:
Friday, Monday and Tuesday at 8am Eastern, five post-game runs, and once on a
push to the pull code.

## X Parlays and the X Bet Log

X Parlays is a tab of `nflbets/` (`#xparlays`; `live/` and `liveparlays/`
redirect there): X's placed parlays, the same on every device, and nothing else.
X's parlays are the slips placed at the book, in `liveparlays/parlays.json`,
followed live against ESPN's public scoreboard and box scores in the browser; a
parlay marked `cleared` stays in the file as history and is not drawn. The
section's source is `liveparlays/build/page.html`, lifted in by
`nflbets/build/build.js` with its styles scoped to its card and its script in a
closure. The X Bet Log tab is X's week-by-week log from `liveparlays/xbets.json`,
with the balance from its deposit.

The Parlay Builder is its own tab (`#parlay`): suggested parlays over the builder.
A visitor picks All, Teams only or Players only (or ticks moneyline, spread, game
total, player overs and player unders by hand) and the week's games to build
from, and gets a Safe 2-leg, Medium 3-leg, Aggressive 4-leg and Extreme 5-leg
parlay, each with its book price, the model's chance and what $10 pays, Add to
builder and Finish. No device keeps a list of its own: the builder, kept in the
browser alone, finishes a parlay as a card to download as an image
(`nflbets/build/card.html`), saved nowhere.

Both files are kept by Claude from what the owner sends in chat (a slip's legs,
stake, price and payout; a week's stake and return), as each file's `how` field
says, and every device reads them, read only, on every load. There is no owner,
no sign-in and no shared store: nothing on the page writes anywhere but the
visitor's own browser. (Until 10 October 2026 they lived in a Firebase database
written from the owner's devices; that is retired and its last state is in the
files.) No odds-API credits are spent and no job runs for them.

The ESPN parsing is not copied into the section: inside the page it uses the
prop model's own readers from `props/build/part2.js`, so there is one source of
truth and the prop model's audit keeps testing it.

```
node nflbets/build/build.js         # -> nflbets/index.html
node nflbets/build/smoke_live.js    # the section from its file, and the parlay card
node nflbets/build/smoke.js         # the whole page, the suggested parlays, X Parlays and the X Bet Log from their files
```

## The betting job

`.github/workflows/update.yml` is the betting job (the file name is a leftover
from when one job ran every site): hourly at :37, so the Vegas lines and the Joker follow
nflverse within the hour, plus Friday, Monday and Tuesday mornings (Eastern)
with an afternoon catch-up each, post-game and injury-report runs, and on
demand with a "rebuild" switch that replays the betting season from the
preseason board, for the next time a model correction ships. It runs
`update.js`, `joker.py` and `smoke.js` (which builds the app), and commits
`betting/state.json` only if something changed. Free
nflverse files only.

## Shipping a model change to the betting site

1. In `nfl-model-lab`, pass the release gate (`python app/tests/run_all.py`).
2. Copy `app/x_nfl_betting_model.html` and `app/tests/reference_models.json`
   here (`betting/app/`, `betting/tools/`).
3. Run the job with "rebuild" if the change affects grading; otherwise let the
   next scheduled run pick it up.
