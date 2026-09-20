# nfl-hub

One repo, one scheduled job, three sites. The job downloads the week's nflverse
files once, runs each app on them without anyone clicking anything, and commits
the results. GitHub Pages serves the repo root:

| Path | What | Source |
|---|---|---|
| `betting/` | X NFL Betting Model, public viewer (`index.html`) and full app (`admin.html`) | `betting/app/x_nfl_betting_model.html`, copied from `nfl-model-lab` when a version ships |
| `props/` | Prop Model, one page (`index.html`) with the week's data baked in | `props/` is the prop model package; its own `weekly.py` does the refresh |
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
- `betting/tools/build.js` makes `index.html` (viewer) and `admin.html` (every
  tab) from the one app file. Both load the same published season; the admin
  page adds Record & Bets, Downloads, Upload and Backup. Picks, bankroll and
  bets are kept in the browser under one key shared by the two pages, so a
  pick made on either shows on both. Uploads on admin grade for that session
  only; the job's published state wins on the next load. To carry picks over
  from a local copy of the app, use Import backup on the admin page. The viewer removes the Downloads, Upload,
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
node betting/tools/build.js             # index.html + admin.html
node betting/tools/smoke.js             # viewer check
```

## Prop model

`props/` is the prop model package as it was, plus `requirements.txt` and a
lockfile so the job can install it. `props/build/weekly.py` downloads the five
nflverse files, pulls prop prices from the-odds-api (needs the `ODDS_API_KEY`
repository secret; about 7 credits a game, 500 free a month), rebuilds the
payload, bakes stats, injuries and prices into the page, assembles it and runs
the 27,000-check audit. `props/build/publish.js` then writes `props/index.html`
(public: Games, Parlay Builder, Track Record, How It Works) and `props/admin.html`
(every tab, including Weekly Update and Backup).
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

`live/` is one page, about 19KB against the prop model's 1.1MB, meant to be left open on a
phone or tablet while the games are on. It loads no season data: a leg's game id
(`2026_02_CAR_ATL`) already carries the week and both teams, which is everything it needs.

- It reads the parlays saved in that browser by the two models -- the prop model's Saved
  parlays under `props_2026_v1`, the betting model's Bet Build parlays under
  `x_nfl_viewer_picks_2026`. Both sites are served from one origin, so both keys are
  readable. It never writes to either, and settlement still happens in the two apps.
- Scores come from ESPN's public feeds, fetched by the reader's browser. **No odds-API
  credits are ever spent here**; `ODDS_API_KEY` buys prices for the prop model and nothing
  else touches it. No job runs for this page either.
- It refreshes every 30 seconds by default (15, 60 or off), only while the tab is visible,
  plus a Refresh button. End to end that is ESPN's own lag plus at most the interval.
- Local storage does not travel between devices, so it finds the parlays made in the browser
  it is running in. Moving them is what the Backup tab on each site is for.

The ESPN parsing and the betting-model reader are not copied into the page. `live/build/build.js`
lifts them out of `props/build/part2.js` at build time, so there is one source of truth and the
prop model's audit keeps testing them.

```
node live/build/build.js        # -> live/index.html
node live/build/smoke.js        # seeds both keys, stubs ESPN, checks what renders
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
