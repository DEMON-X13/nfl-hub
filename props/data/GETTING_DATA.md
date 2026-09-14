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

`wk1_lines.csv` is hand-transcribed from a published weekly props article
(stat,player,line,over,under). `mktbuild.py` matches names onto player IDs and
embeds them. ~95% match; misses are players with no NFL history.

These are BEST AVAILABLE across several books, so they are fine for spotting
disagreement and wrong for parlay pricing, since you cannot combine legs across
four sportsbooks.

The real fix is a free key from the-odds-api.com (with hyphens — the unhyphenated
domain is a confirmed impersonator reselling the same data at 3x). Its
`*_alternate` markets are exactly the X+ ladder format the app uses. ~5 credits per
game, 500/month free, which covers a full slate weekly if pulled once.
