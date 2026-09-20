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

- **The copy in the repository.** `Save to GitHub` writes the parlays on screen to
  `live/parlays.json` on the **`parlay-data`** branch, and every device loads it when the page
  opens. Reading needs nothing, because the repository is public. Writing needs a fine-grained
  token with `Contents: read and write`, kept in the browser of whichever device does the
  saving and never put in a link, a code or the saved file; *Forget the token on this device*
  removes it. That branch has no history from `main` and builds no site, so **a save starts no
  Pages deployment and leaves `main`'s history alone**. The repository being public means what
  is saved there is world-readable: parlay legs and lines, deliberately, and never a token.
- It reads the parlays saved in that browser by the two models -- the prop model's Saved
  parlays under `props_2026_v1`, the betting model's Bet Build parlays under
  `x_nfl_viewer_picks_2026`. Both sites are served from one origin, so both keys are
  readable. It never writes to either, and settlement still happens in the two apps.
- Scores come from ESPN's public feeds, fetched by the reader's browser. **No odds-API
  credits are ever spent here**; `ODDS_API_KEY` buys prices for the prop model and nothing
  else touches it. No job runs for this page either.
- **Auto-refresh starts off**, so the page asks ESPN for nothing that was not asked for: one
  fetch when it opens, then only on Refresh now or once an interval (15/30/60s) is turned on.
  An interval only fires while the tab is visible, and with auto off returning to the tab does
  not fetch either. A finished game's box score is fetched once and kept, since it cannot
  change. End to end the lag is ESPN's own plus at most the interval.
- Parlays are listed in the order the day runs: anything still to finish first, then by when
  a parlay can settle -- its **last** kickoff, not its first, so one carrying a four o'clock
  leg sits below one made only of one o'clock games. Settled parlays go to the bottom.
- A player leg is drawn the way a book draws it: the target as the heading (`43.5+`, or
  `under 54.5`), the man and the stat under it, and a **progress bar** with his number in a
  pill where it falls, a tick at the line and the line labelled beneath. The bar runs a
  quarter past the line, so the tick sits at 80% and a number past its target visibly is.
  Gold while it is running, green once it lands, red once it is gone.
- Nothing reads as a blank. Before kickoff the strip shows **0-0** with the kick time and every
  leg reads `0 / 43.5` on a zeroed stat line; a player ESPN has not put in the box score yet
  reads 0 too, because that is what he has.
- Each parlay carries a **score strip** of the games it rides on, with the clock, the one in
  progress highlighted, and under every player leg **his whole line** from the box score --
  carries and rushing yards, catches and receiving yards on targets, completions and passing
  yards with touchdowns and interceptions, kicks made of attempted -- not only the one number
  being bet on.
- **A book line that moved** after the bet was placed can be corrected per leg by tapping
  the line number itself on the row. The leg is then measured against what was actually bet, its label
  follows the new number, and `undo` puts the model's own line back. The correction is kept
  in this page's key and rides along in a sent link; the parlay saved in the owning app is
  left exactly as it was, so nothing about settlement or the Track Record changes.
- Local storage does not travel between devices, so it finds the parlays made in the browser
  it is running in. **Send to a device** packs what is on screen into the page's own URL;
  opening that link anywhere unpacks it into this page's own key (`live_parlays_v1`), never
  into the two apps'. The packed form is kept small deliberately -- games listed once and
  referenced, stats as two-letter codes, defaults and labels dropped -- because iMessage cut
  a 993-character link in half; a four-leg parlay now travels in about 520. Each parlay also has its own
  **Send**, which is the one to use: one parlay is about 450 characters and travels as a link,
  where a whole slate is a couple of thousand and does not. Above that length the page copies
  the **code** rather than the link and says why -- plain text carries no URL for Messages to
  detect, so it is never split -- and **Paste a code** on the other device takes the code or a
  whole link either way. Remove takes one out again, and Clear finished sweeps the settled ones.

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
