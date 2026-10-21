# Where the data comes from

All nflverse, all free, all reachable from a sandbox (GitHub is allowlisted).

    stats_player_week_YYYY.csv   github.com/nflverse/nflverse-data/releases/download/stats_player/
    roster_2026.csv              .../releases/download/rosters/
    injuries_2026.csv            .../releases/download/injuries/
    depth_charts_2026.csv        .../releases/download/depth_charts/   (~50MB)
    games.csv                    raw.githubusercontent.com/nflverse/nfldata/master/data/

Note the release tag is `stats_player`, not `player_stats`. The older tag exists and
returns 404 for recent seasons — that cost an hour once.

## DraftKings' lines, read from ESPN (since 20 October 2026)

Free, no key. Every run of the props job reads DraftKings' game lines (with their prices and
DraftKings' own ids) and player lines (the numbers, never a price: the page prices them by its
fitted formula, marked est.) from ESPN's two public hosts, with the page's own reader run in
jsdom (`build/espn_read.js`, under "Weekly build" in `props/README.md`):

    scoreboard                   site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=<season>&seasontype=2&week=<w>
    a game's player lines        sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/<id>/competitions/<id>/odds/100/propBets?limit=1000&page=<n>
    an athlete's name            sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/<season>/athletes/<id>
    a club's roster              site.api.espn.com/apis/site/v2/sports/football/nfl/teams/<id>/roster

Provider 100 is DraftKings. A 404 on a game's player lines means none posted yet. Each answer is
recorded under `raw/espn/` (ignored), with the read the job publishes, `raw/espn/read.json`.

## Market lines (the paid pulls, weeks 1-6 of 2026)

`wk{W}_lines.csv` (game_id,stat,player,line,over,under) was written by `oddsfetch.py` from
the-odds-api.com (with hyphens: the unhyphenated domain is a confirmed impersonator
reselling the same data at 3x) on each of `build/weekly.py`'s price pulls until 20 October
2026, with `prices_wk{W}.csv` and `gamelines_wk{W}.csv` beside it; no job runs it now (a pull
by hand is still baked the same way). On every run `weekly.py` matches
every week's lines onto player ids with `mktbuild.py` (and every price row with the same
matcher, `build/names.py`): only among the players of the line's own game, from this
season's roster (rookies included) and the team each played for that week, by the full
name, the football name, or a short first name (Cam for Cameron). A name that matches
nobody, or two players, goes to the run's problems when its game is still to come, never to
a guess: the old league-wide surname-and-initial fallback put Tampa's Jalon Daniels' lines on
Washington's Jayden Daniels. Each line keeps the book's name and game (`n`, `g`) beside the
price, and the audit checks them. Files from before the lines carried their game (weeks 1-5
of 2026) find it in the same week's prices file. `mkt_meta` in `payload.json` records each
week's source and the date of its latest pull (`priced_at.json`). The files are named by week
alone; only rows of this season's games are baked, and at a rollover `weekly.py` moves last
season's files to `archive/<season>/`.

Week 1 was the best price across the US books, which is fine for spotting
disagreement and wrong for parlay pricing, since you cannot combine legs across
several sportsbooks; from week 2 the pull takes DraftKings alone (`--book`). No workflow maps
a key any more: a pull by hand takes `ODDS_API_KEY` from your own environment, about 7 credits a
game, 500 a month free.
