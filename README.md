# nfl-hub

One repo, one scheduled job, three sites. The job downloads the week's nflverse
files once, runs each app on them without anyone clicking anything, and commits
the results. GitHub Pages serves the repo root:

| Path | What | Source |
|---|---|---|
| `betting/` | X NFL Betting Model, public viewer (`index.html`) and full app (`admin.html`) | `betting/app/x_nfl_betting_model.html`, copied from `nfl-model-lab` when a version ships |
| `props/` | Prop Model | (phase 2) |
| `news/` | Season Tracker | (phase 3) |

## Betting site

- `betting/tools/update.js` runs the real app headlessly (jsdom), starting from
  the last published `betting/state.json`, feeds it the six nflverse files
  (games, team stats, player stats, roster, injury report, depth chart), and
  writes the new state with the private parts stripped (bets, bankroll,
  the owner's picks). Idempotent: a second run with no new data changes nothing.
- Gate: the app's embedded model numbers must equal
  `betting/tools/reference_models.json`, the numbers the research harness
  exported. A mismatch aborts the publish.
- `betting/tools/build.js` makes `index.html` (viewer) and `admin.html` (full
  app) from the one app file. The viewer removes the Downloads, Upload,
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

## The job

`.github/workflows/update.yml` runs every six hours and on demand (with a
"rebuild" switch that replays the betting season from the preseason board,
for the next time a model correction ships). It commits only if something
changed. nflverse publishes the stats files the night after games, so the
sites lag results by hours.

## Shipping a model change to the betting site

1. In `nfl-model-lab`, pass the release gate (`python app/tests/run_all.py`).
2. Copy `app/x_nfl_betting_model.html` and `app/tests/reference_models.json`
   here (`betting/app/`, `betting/tools/`).
3. Run the job with "rebuild" if the change affects grading; otherwise let the
   next scheduled run pick it up.
