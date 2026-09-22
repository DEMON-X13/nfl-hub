# nfl-hub

One repo, one scheduled job, three sites. The job downloads the week's nflverse
files once, runs each app on them without anyone clicking anything, and commits
the results. GitHub Pages serves the repo root:

| Path | What | Source |
|---|---|---|
| `nflbets/` | X NFL Bets and Stats, the one site: both models on one page | built by `nflbets/build/build.js` from the props parts, the betting app and the Live Parlays section |
| `betting/` | X NFL Betting Model: no pages, only the app source, tools, job and data; the app runs inside `nflbets/` | `betting/app/x_nfl_betting_model.html`, copied from `nfl-model-lab` when a version ships |
| `props/` | Prop Model: no pages, only the parts, build, job and data | `props/` is the prop model package; its own `weekly.py` does the refresh |
| `news/` | Season Tracker, the newsletter-style site | moved from `DEMON-X13/nfl-news-tracker`; its `tools/pull-week.js` does the scripted half |
| `live/` | Live Parlays, one small page that watches the parlays saved in the two models | built from `live/build/page.html` plus logic lifted out of the prop model |

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
  shows its Records, Power Ratings and Bet Log tabs in frames. It loads the
  published season from `betting/state.json`. Picks, bankroll and bets are kept
  in the browser under one key. Uploads grade for that session only; the job's
  published state wins on the next load. To carry picks over from a local copy
  of the app, use Import backup on the Bet Log tab. (The viewer trim below is
  kept for a revert:) it removes the Downloads, Upload,
  Record & Bets and Backup tabs, loads `state.json`, and keeps the visitor's own
  picks, bankroll, bets and any odds they load in their browser only. Picks are
  graded against the published results. Moneylines from nflverse are published
  with the state so the Bank Roll tab works without a fetch. Nothing a visitor does can change what anyone else sees; only a
  commit to this repo changes the site.
- `betting/events.json`: manual team news the job cannot infer (resting
  starters). One entry per line, applied once by id:
  `{"id":"2026-wk18-KC-rest","type":"rest","team":"KC","week":18,"note":"clinched"}`.
- `betting/tools/smoke.js`: loads the built viewer with the published state and
  checks the tabs, the pick storage and the grading of a visitor's pick.

Local run:

```
cd betting/tools && npm install
node betting/tools/update.js            # download + grade + write state.json
node betting/tools/build.js             # checks the app builds; writes nothing
node betting/tools/smoke.js             # the built app, plain and embedded
node nflbets/build/build.js             # the page that carries the app
```

## Prop model

`props/` is the prop model package as it was, plus `requirements.txt` and a
lockfile so the job can install it. `props/build/weekly.py` downloads the five
nflverse files, pulls prop prices from the-odds-api (needs the `ODDS_API_KEY`
repository secret; about 7 credits a game, 500 free a month), rebuilds the
payload, bakes stats, injuries and prices into the page, assembles it and runs
the 26,000-check audit against the assembled page, which is gitignored: the prop
model has no pages of its own, its parts are the source of `nflbets/index.html`.
`raw/feat.pkl` (43MB, the fitted feature table for 2019-2025) is committed so
the job does not rebuild it. Visitors' parlays and bets stay in their browser.

Its workflow, `.github/workflows/props.yml`, runs Thursday and Saturday at
10am Eastern only, because those two runs are the ones that spend credits. The
betting job never touches the key.

## Season tracker

`news/` is the tracker as it was. `tools/run-auto.js` works out the current
week from the nflverse schedule and runs `tools/pull-week.js`, which refreshes
`data/results.js` (scores, records) and `data/stats2026.js` (the stat bars)
from ESPN and TeamRankings, drafts `data/weekN.js` if it does not exist, and
writes the reading pack to `tools/out/`. The narrative half of a week is still
written by a person: the draft is not shown until it is added to
`data/weeks.js` and `index.html` (see `HANDOFF.md`). Free sources, no credits.
Workflow `.github/workflows/news.yml`: Friday, Monday and Tuesday, 8am Eastern.

## Live parlays

`live/` is one page, about 31KB, that shows where the parlays in `live/parlays.json` stand
while the games are on. It is a reader and nothing else.

- It shows **two sources, both picked up on their own**, with nothing to press.
  `live/parlays.json` beside the page, which every device sees; and whatever the prop model
  and the betting model have saved **in the browser it is opened in**, read straight out of
  their own keys (`props_2026_v1`, `x_nfl_viewer_picks_2026`). Each card says which it came
  from. A parlay in both is shown once, and the browser's own copy wins.
- **The file is the only part that travels.** Change it and every device shows the change on
  its next load. It is written to be edited by hand: games listed once, legs pointing at them
  by index, stats spelled out, and a `how` field at the top saying what a leg needs.
- **The page never writes anything** -- not to the two models' keys, not anywhere. No token,
  no sending, no codes.
- The gap is stated rather than papered over: a parlay saved in the prop or betting model
  lives in that browser, because that is where those apps keep a visitor's own data, so it
  shows on that device and not the next one. Getting it to follow you means putting it in the
  file, and a browser cannot write to GitHub without a credential.
- **A browser cannot write to GitHub without a credential**, and a static page has nowhere
  safe to keep one, so the file is edited in the repository rather than from the page. That is
  the one thing this design gives up, deliberately.
- It loads no season data: a leg's game id (`2026_02_CAR_ATL`) carries the week and both
  teams, which is all it needs to find the game.
- A player leg is drawn the way a book draws it: the target as a heading (`43.5+`, or
  `under 54.5`), the man and the stat under it, his whole box-score line, and a progress bar
  with his number in a pill, a tick at the line and the line labelled beneath. The bar runs a
  quarter past the line, so the tick sits at 80%. Gold while running, green once landed, red
  once gone. Nothing reads as a blank: before kickoff it is 0-0 and `0 / 43.5`.
- Parlays sit in the order the day runs: still to finish first, then by when each can settle --
  its **last** kickoff, so one carrying a four o'clock leg sits below one made only of one
  o'clock games.
- Scores come from ESPN's public feeds, fetched by the reader's browser. **No odds-API credits
  are ever spent here** and no job runs for it. Auto-refresh starts **off**: one fetch on open,
  then only on `Refresh now` or once an interval is turned on. A finished game's box score is
  fetched once and kept.

The ESPN parsing is not copied into the page. `live/build/build.js` lifts it out of
`props/build/part2.js` between two banners and refuses to build if it has moved, so there is
one source of truth and the prop model's audit keeps testing it.

```
node live/build/build.js        # -> live/index.html
node live/build/smoke.js        # hands the page a file and a stubbed ESPN, checks what renders
```

## The betting job

`.github/workflows/update.yml` runs three windows a week, Friday, Monday and
Tuesday mornings (Eastern) with an afternoon catch-up each, covering the
Thursday, Sunday and Monday games, and on demand (with a "rebuild" switch that
replays the betting season from the preseason board, for the next time a model
correction ships). It commits only if something changed. nflverse publishes
the stats files overnight after games. This job downloads free nflverse files
only; when the prop model and news tracker join, each gets its own workflow
and schedule so any pull that spends API credits runs only when it should.

## Shipping a model change to the betting site

1. In `nfl-model-lab`, pass the release gate (`python app/tests/run_all.py`).
2. Copy `app/x_nfl_betting_model.html` and `app/tests/reference_models.json`
   here (`betting/app/`, `betting/tools/`).
3. Run the job with "rebuild" if the change affects grading; otherwise let the
   next scheduled run pick it up.
