# raw/

Downloaded nflverse CSVs live here. Not shipped (too large); fetch with:

    cd raw
    for y in 2019 2020 2021 2022 2023 2024 2025; do
      curl -sL -o pw_$y.csv \
      "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_$y.csv"
      sleep 1
    done
    curl -sL -o games.csv "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
    curl -sL -o roster26.csv "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2026.csv"
    curl -sL -o dc26.csv "https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_2026.csv"

Then from research/: `python3 fit4.py` rebuilds the model, and the intermediate
`feat.pkl` / `boom.pkl` land here too.

`fake_wk1.csv` is a test fixture (2025 week 1 relabelled as 2026) used by audit.js.
