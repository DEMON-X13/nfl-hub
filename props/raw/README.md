# raw/

Downloaded nflverse CSVs live here. Not committed (too large, gitignored): `build/weekly.py`
downloads this season's files on every run, named after the season `SEASON` in
`build/part2.js` sets (`build/season.py` has the list): `games.csv`, `pw_<season>.csv`,
`roster_<season>.csv`, `injuries_<season>.csv`, `depth_charts_<season>.csv`. A runner starts
with this folder empty, so a required file that fails to download stops the run before
anything is published; `weekly.py --offline` reuses the files already here, for testing.
The audit compares the payload with them when `PROPS_AUDIT_RAW=1` (weekly.py sets it).

The earlier seasons, which only rebuilding `feat.pkl` needs, fetch with:

    cd raw
    for y in 2019 2020 2021 2022 2023 2024 2025; do
      curl -sL -o pw_$y.csv \
      "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_$y.csv"
      sleep 1
    done
    curl -sL -o games.csv "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
    curl -sL -o roster_2026.csv "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2026.csv"
    curl -sL -o depth_charts_2026.csv "https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_2026.csv"

Then from research/: `python3 features.py` rebuilds `feat.pkl` (the model fit itself,
fit4.py, is not in this repo). `feat.pkl` (43MB) is committed so the job does not rebuild
it; `weekly.py` runs features.py only when it is missing.

`fake_wk1.csv` is a test fixture (2025 week 1 relabelled as 2026) used by audit.js.
