# Research toward the next model

The homework before the next game model (the owner's call, 12 October 2026: the models so far
"are not going far enough"). Each study answers one question the owner asks, with the scripts and
the results committed so it can be run again. **No model is built here until the owner gives the
all clear**: a study may fit a small regression to ask whether something carries signal, but
nothing is frozen as a formula or wired into a site.

## The rules every study keeps

- **Seasons.** 2003-2025 are explored (`SEASONS` in `common.py`). 2026 on is the final exam
  (`HOLDOUT_FROM`): never downloaded or read here, so the model can be tested on seasons it has
  never seen. The cut was 2024 until the owner put 2024 and 2025 into the exploration on
  12 October 2026 ("we are just collecting data right now").
- **The data** is nflverse's: `games.csv` (schedule, scores, closing lines) and the play-by-play,
  downloaded by `python3 -I research/fetch.py` into `research/data/raw/` (gitignored, about
  400 MB). `common.py`'s loaders refuse a held-out season.
- **Honest numbers.** A rate is shown on the games it was measured on, beside a baseline (the
  closing line's favourite, home field). Anything that predicts is scored on seasons it was not
  fitted on (leave one season out, or walk forward), with an interval, and many stats tried at
  once are read as many tries, not one.
- **Each study** has its own folder, a README with the question, the method, the answer and the
  numbers, and the scripts that produce them; its `out/` (built tables) is gitignored, its
  `results/` committed.

## The studies

| # | Folder | The question | Answer in short |
|---|---|---|---|
| 1 | `win_indicators/` | Since 2003, what are the top 15 win indicators in the NFL? | see its README |
