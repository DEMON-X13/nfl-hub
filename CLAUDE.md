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

## The three sites

GitHub Pages serves the repo root. Each site is a separate app with its own
build and its own scheduled workflow.

| Path | What | Source of truth |
|---|---|---|
| `props/` | Prop Model, retired as a site: `index.html` redirects to `nflbets/`; `admin.html` is the full app for a manual run or a backup | `props/build/part1.html`, `part2.js`, `part3.js` |
| `betting/` | X NFL Betting Model, retired as a site: `index.html` redirects to `nflbets/`; `admin.html` is the app `nflbets/` frames | `betting/app/x_nfl_betting_model.html` (copied in from `nfl-model-lab`) |
| `news/` | Season Tracker | `news/` directly; the narrative half is written by a person |
| `nflbets/` | X NFL Bets and Stats: the two models on one page, built one tab at a time | `nflbets/build/tab_pickems.html` + the props parts + the betting app |

## Source vs generated -- never edit a generated file

These are rebuilt from source on every scheduled run, so an edit to one is lost
at the next refresh:

- `props/app/prop_model_2026.html`, `props/index.html`, `props/admin.html`
- `betting/index.html`, `betting/admin.html`, `betting/state.json`
- `nflbets/index.html`
- `props/data/payload.json`, `news/data/results.js`, `news/data/stats2026.js`

`betting/app/x_nfl_betting_model.html` is the exception: it is the betting app's
source, shipped in from `nfl-model-lab`, not generated here.

## Props: the loop

Edit the parts, then from `props/build/`:

```
python3 assemble.py        # part1 + payload.json + part2 + part3 -> ../app/prop_model_2026.html
node audit.js              # the gate: must end "0 failures, 0 runtime errors"
node publish.js            # -> props/index.html (public) + props/admin.html (all tabs)
rm -f ../app/app.js        # gitignored build leftover; weekly.py removes it too
```

`node_modules` for the audit lives in `props/build/` (`npm ci`).

The audit is a real gate: `weekly.py` refuses to commit when it is not clean, so
a broken audit means the site silently stops updating and the run is marked
failed. Write audit checks against the app's invariants, never against whatever
the week's data happens to offer -- a lean week must not fail the build.

`.github/workflows/props.yml` runs twelve times a week: four price pulls
(Mon/Wed/Thu/Sat, ~7 odds-API credits a game) and eight post-game and stats runs
that spend nothing. It commits straight to `main`.

## Betting: the loop

```
cd betting/tools && npm install
node betting/tools/update.js     # download + grade + write state.json
node betting/tools/build.js      # -> betting/index.html + betting/admin.html
node betting/tools/smoke.js      # viewer check
```

Gate: the app's embedded model numbers must equal
`betting/tools/reference_models.json`, or the publish aborts.

## Bets and Stats: the loop

`nflbets/index.html` is the prop model's page (part1 + part2 + part3, assembled by
`nflbets/build/build.js` the way `assemble.py` assembles it) with the Pick'ems board set in
front of it as its own `pk-` prefixed section, and the betting site's Records, Power
Ratings and Bet Log tabs framed from `betting/admin.html?embed=1#tab`. Nothing is baked
in: it fetches `props/data/payload.json` and `betting/state.json`, so it is rebuilt when
a source changes, never when the data does. A props patch or a betting build change
means rebuilding it too:

```
node nflbets/build/build.js
node nflbets/build/smoke.js       # must end "0 failures"
```

## The sites behave like websites

The owner publishes a change and expects it on every device on the next load. Nothing
may quietly outrank what the job published:

- **Published data wins over anything a browser kept.** Local storage holds only what the
  visitor made -- parlays, saved slips, picks, bankroll, the bet log, corrected lines,
  settings. Schedule, scores, stats, prices, ratings and projections are read from
  `props/data/payload.json` and `betting/state.json` on every load. The prop model keys its
  saved season on `PAY.baked_at`, which moves on every run of the job, so a run always
  rebuilds; the betting app already merges only the visitor's keys over the published state.
- **A routine rebuild is silent.** The job publishes several times a week. Only a model or
  roster change is worth a banner.
- **Every page says which build it is.** `buildTag` on the Bets and Stats header, `PAGE_BUILD`
  in `data-build` on Live Parlays. Without it a stale copy cannot be told from a current one.
- **A frame is not covered by a refresh of the page around it.** A framed tab carries the
  publishing timestamp in its address (`&v=`), so a new publish is a new address.
- **Data fetches are `cache: 'no-store'`.** The HTML is served by GitHub Pages with its own
  ten-minute cache, which a reload clears; nothing else may hold data longer than that.

## Conventions

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
- **`live_parlays_v1` has two owners.** The live page owns `lines` (a line you corrected)
  and `removed` (a parlay you deleted there); the prop model owns `sent`, the ids of the
  saved parlays it has pushed to that page. Each side reads the whole object and writes it
  back whole, so neither may drop a half it does not own. The writer lives above the
  live-tracking banner in `part2.js`, outside the block `liveparlays/build/build.js` lifts,
  because the live page may read that key and must never carry a writer for it.
- **Visitor data is the visitor's.** Picks, parlays, bankroll, bets and
  self-loaded odds live in the browser's local storage only and are never
  written to the repo. Anything held per-session and not meant to persist (for
  example a shuffled parlay alternative) is kept outside the saved state object
  `S`, so it is never serialised.
- **No secrets in the repo.** `ODDS_API_KEY` is a repository secret and only the
  props workflow touches it.
