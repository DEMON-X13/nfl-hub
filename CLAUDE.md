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
| `props/` | Prop Model: no pages any more, only the parts, the build, the job and its data (`props/data/payload.json` is what `nflbets/` reads) | `props/build/part1.html`, `part2.js`, `part3.js` |
| `betting/` | X NFL Betting Model: no pages any more, only the app source, the tools, the job and its data (`betting/state.json` is what `nflbets/` reads); the app itself lives inside `nflbets/index.html` | `betting/app/x_nfl_betting_model.html` (copied in from `nfl-model-lab`) |
| `news/` | Season Tracker | `news/` directly; the narrative half is written by a person |
| `nflbets/` | X NFL Bets and Stats: the two models on one page, built one tab at a time, with Live Parlays as a section of the Parlay Builders tab | `nflbets/build/tab_pickems.html` + `liveparlays/build/page.html` + the props parts + the betting app |
| `liveparlays/` | retired as a page: `index.html` redirects to `nflbets/#parlay`; `parlays.json` is the file the section reads, and `build/page.html` is the section's source | `liveparlays/build/page.html`, `liveparlays/parlays.json` |

## Source vs generated -- never edit a generated file

These are rebuilt from source on every scheduled run, so an edit to one is lost
at the next refresh:

- `props/app/prop_model_2026.html` (gitignored: the audit's subject, never published)
- `betting/state.json`
- `nflbets/index.html`
- `props/data/payload.json`, `news/data/results.js`, `news/data/stats2026.js`

`betting/app/x_nfl_betting_model.html` is the exception: it is the betting app's
source, shipped in from `nfl-model-lab`, not generated here.

## Props: the loop

Edit the parts, then from `props/build/`:

```
python3 assemble.py        # part1 + payload.json + part2 + part3 -> ../app/prop_model_2026.html (gitignored)
node audit.js              # the gate: must end "0 failures, 0 runtime errors"
rm -f ../app/app.js        # gitignored build leftover; weekly.py removes it too
node ../../nflbets/build/build.js   # the parts are the Bets and Stats page's source: rebuild it (see below)
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
node betting/tools/build.js      # checks the app builds; writes nothing (nflbets/build/build.js sets it into the page)
node betting/tools/smoke.js      # the built app, on its own and embedded
node nflbets/build/build.js      # the app changed, so the page that carries it is rebuilt
```

Gate: the app's embedded model numbers must equal
`betting/tools/reference_models.json`, or the publish aborts.

## Bets and Stats: the loop

`nflbets/index.html` is the prop model's page (part1 + part2 + part3, assembled by
`nflbets/build/build.js` the way `assemble.py` assembles it) with the Pick'ems board set in
front of it as its own `pk-` prefixed section, the Live Parlays section lifted out of
`liveparlays/build/page.html` into the Parlay Builders tab (styles scoped to `#lpCard`,
script in a closure, standing where the prop model's Saved parlays card is: a saved parlay
is watched the moment it is saved, and deleting it there deletes it), and the betting
app's Records, Power Ratings and Bet Log tabs in frames: the app, as `betting/tools/build.js`
builds it, is carried in the page as a string (`BET_APP`) and becomes a frame's srcdoc when
its tab is first opened, with `window.EMBED_TAB` and `window.STATE_URL` written in front of
it. A srcdoc frame is the page's own origin, so the app keeps its browser store.
Nothing is baked in: it fetches `props/data/payload.json`, `betting/state.json` and
`liveparlays/parlays.json`, so it is rebuilt when a source changes, never when the data
does. A props patch, a betting build change or an edit to the live section's source means
rebuilding it too:

```
node nflbets/build/build.js
node nflbets/build/smoke.js       # must end "0 failures"; includes the sync layer against a stubbed store
node nflbets/build/smoke_live.js  # the Live Parlays section; must end "0 failures"
```

`nflbets/build/sync.js` (the sync layer) is inlined by the build, so a change to it is a rebuild too.

A parlay every device should see goes in `liveparlays/parlays.json`, by hand, as its `how`
field describes.

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
- **Every page says which build it is.** `buildTag` on the Bets and Stats header. Without it a
  stale copy cannot be told from a current one.
- **A frame's content is in the page.** The betting tabs are srcdoc frames filled from a
  string inside `nflbets/index.html`, so nothing is fetched or cached for them apart from
  the page itself: a refresh of the page is a refresh of the frames.
- **Data fetches are `cache: 'no-store'`.** The HTML is served by GitHub Pages with its own
  ten-minute cache, which a reload clears; nothing else may hold data longer than that.
- **The parlays are one document for every device.** The builder, the saved parlays, the
  stake, the book price, the margin, and the Live Parlays section's corrected lines and
  deletions are kept in a shared JSON document that every device reads when the page opens,
  writes on every change and re-reads every few seconds while on screen. The document lives
  in a Firebase Realtime Database reached over plain HTTPS, whose address is in
  `nflbets/sync.json` (read at run time, so pasting it in needs no rebuild); with the address
  blank the page runs on the browser alone and the header says "Not synced". The layer is
  `nflbets/build/sync.js`: it defines the `window.storage` the prop model saves through and
  the `window.LIVE_IO` the section's key goes through, pushes nothing until it has read the
  document once, adds a browser's own saved parlays to the document the first time that browser
  reads it (after that the document wins, so a deletion elsewhere holds), and the header's
  `syncStamp` says whether it is synced, saving or failing.
  Setting it up: Firebase console → new project → Realtime Database → rules
  `{"rules":{"nflhub":{".read":true,".write":true}}}` → the database URL plus `/nflhub` into
  `nflbets/sync.json`. Open rules mean anyone with the address can read and change the
  parlays; that is the trade for a static page with no login.

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
- **`live_parlays_v1` is the Live Parlays section's key.** It holds `lines` (a line you
  corrected) and `removed` (a file or betting-model parlay you deleted). A saved parlay is
  not in it: deleting one in the section deletes it from the prop model's own saved list,
  which is the only copy. The section reads the whole object and writes it back whole, so a
  key anything else puts there is carried through. Inside the Bets and Stats page the key is
  read and written through `LIVE_IO`, which is the sync layer, so it is shared like the
  parlays.
- **Visitor data is the visitor's.** Picks, parlays, bankroll, bets and self-loaded odds are
  never written to the repo. Picks, bankroll, bets and odds live in the browser's local
  storage only; the parlays and the section's key are shared through the sync document above
  when `nflbets/sync.json` names one. Anything held per-session and not meant to persist
  (for example a shuffled parlay alternative) is kept outside the saved state object `S`, so
  it is never serialised.
- **No secrets in the repo.** `ODDS_API_KEY` is a repository secret and only the
  props workflow touches it.
