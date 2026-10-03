# Where the data comes from

All nflverse, all free, all reachable from a sandbox (GitHub is allowlisted).

    stats_player_week_YYYY.csv   github.com/nflverse/nflverse-data/releases/download/stats_player/
    roster_2026.csv              .../releases/download/rosters/
    injuries_2026.csv            .../releases/download/injuries/
    depth_charts_2026.csv        .../releases/download/depth_charts/   (~50MB)
    games.csv                    raw.githubusercontent.com/nflverse/nfldata/master/data/

Note the release tag is `stats_player`, not `player_stats`. The older tag exists and
returns 404 for recent seasons — that cost an hour once.

## Market lines

`wk{W}_lines.csv` (stat,player,line,over,under) is written by `oddsfetch.py` from
the-odds-api.com (with hyphens: the unhyphenated domain is a confirmed impersonator
reselling the same data at 3x) on each of `build/weekly.py`'s price pulls, with
`prices_wk{W}.csv` and `gamelines_wk{W}.csv` beside it. `mktbuild.py` matches names onto
player IDs and embeds them. ~95% match; misses are players with no NFL history.
`mkt_meta` in `payload.json` records each week's source.

Week 1 was the best price across the US books, which is fine for spotting
disagreement and wrong for parlay pricing, since you cannot combine legs across
several sportsbooks; from week 2 the pull takes DraftKings alone (`--book`). The key
is the `ODDS_API_KEY` repository secret: about 7 credits a game, 500 a month free.
