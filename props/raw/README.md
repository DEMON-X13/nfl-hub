# raw/

Downloaded nflverse CSVs live here. Not committed (too large, gitignored): `build/weekly.py`
downloads this season's files on every run, named after the season `SEASON` in
`build/part2.js` sets (`build/season.py` has the list): `games.csv`, `pw_<season>.csv`,
`roster_<season>.csv`, `injuries_<season>.csv`, `depth_charts_<season>.csv`. A runner starts
with this folder empty, so a required file that fails to download stops the run before
anything is published (a stats or injury file nflverse has not posted yet, with none of this
season's published, is the exception: the run goes on without it and the payload says so in
`not_posted`); `weekly.py --offline` reuses the files already here, for testing.
The audit compares the payload with them when `PROPS_AUDIT_RAW=1` (weekly.py sets it).

`feat.pkl` (43MB) is the feature table `build/payload.py` takes the baselines from (the season
before `SEASON`, `BASE` in `build/season.py`). It is committed, so a run does not rebuild it,
with one exception: on the first run of a new season it lacks the season just finished, and
`weekly.py` rebuilds it (it fetches `pw_<y>.csv` for every season `FIRST`..`BASE` and runs
`research/features.py`, which takes its seasons from `season.py`), the seasons it already held
coming out as they were, and the workflow commits it with the payload. To rebuild it by hand,
from `raw/`:

    BASE=$(cd ../build && python3 -c 'from season import BASE; print(BASE)')
    FIRST=$(cd ../build && python3 -c 'from season import FIRST; print(FIRST)')
    for y in $(seq $FIRST $BASE); do
      curl -sfL -o pw_$y.csv \
      "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_$y.csv"
      sleep 1
    done
    curl -sfL -o games.csv "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
    cd ../research && python3 features.py

(the model fit itself, fit4.py, is not in this repo; the page runs on the coefficients in
`data/final_model.json` whichever seasons the table holds).

`fake_wk1.csv` is a test fixture (2025 week 1, real rows) used by audit.js, which gives every
row the page's season as it reads it, so a rollover needs no new fixture.
