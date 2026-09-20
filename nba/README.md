# NBA model

The NBA half of the hub: a game model, a daily job, and (next) a betting page like `betting/`.
The NBA has no weeks, so the unit is the slate, one Eastern calendar day. Ratings update after every
final, the job runs every morning, and the page will show today's and tomorrow's games.

## Layout

| Path | What |
|---|---|
| `data/games.csv` | Every game since the 2004-05 season, one row each: id, season (the year it ends), date, REG or POST, away, home, scores, neutral site, status, the home side's closing line and total when ESPN carried them, and the source |
| `model.json` | The fitted parameters, the fit and holdout report, every team's rating after the last final, and the model's number on each game not yet final |
| `tools/lib.js` | The games table, team codes, dates, ESPN access |
| `tools/history.js` | One-time import of the history the model is fitted on |
| `tools/fetch.js` | Daily pull of finals, the coming slate and its lines from ESPN |
| `tools/elo.js` | The model: replay, fit, report |

No dependencies: Node 22 and its built-in fetch.

## Data

- **History**: Neil Paine's continuation of the FiveThirtyEight NBA Elo game file
  (`github.com/Neil-Paine-1/NBA-elo`), every game since 1946 with scores. Seasons from 2005 on are
  kept. It runs to 2025-03-17. `history.js` maps its team codes onto this site's and folds defunct
  franchises into their current team (Sonics into OKC, Nets into BKN, the two Hornets into NOP and CHA).
- **From 2025-03-18 on**: ESPN's public scoreboard feed, the one the season tracker already uses,
  one request per day. It gives finals, the schedule about ten days out, the neutral-site flag (the
  Cup final), and a consensus line and total on most games. Preseason and postponed games are dropped.
  The NBA's own stats site blocks cloud runners and is not used.
- Team codes: `ATL BOS BKN CHA CHI CLE DAL DEN DET GSW HOU IND LAC LAL MEM MIA MIL MIN NOP NYK OKC ORL PHI PHX POR SAC SAS TOR UTA WAS`.

## The model

Elo with FiveThirtyEight's margin multiplier. Each team starts a season carried part way back to
1500. Before a game each side is adjusted for home court (none at a neutral site), altitude (Denver
and Utah at home), a back to back, three games in four nights, and three or more days off. The home
win chance is the logistic of the adjusted difference; the spread is that difference over a scale
fitted by least squares on the fit seasons.

Fit on 2008-2022 by coordinate search on log loss, holdout 2023-2025 (2005-2007 only warm the
ratings up). The fit is deterministic. What it found:

| Parameter | Value | In points |
|---|---|---|
| K | 20 | |
| home court | 60 Elo | 2.3 |
| altitude, on top | 60 Elo | 2.3 |
| back to back | -40 Elo | -1.5 |
| three in four | -5 Elo | -0.2 |
| three days off | +5 Elo | +0.2 |
| season carry | 0.70 | |
| scale | 26.2 Elo per point | |

Holdout (3,662 games): 65.3% straight up, log loss 0.624, spread error 10.7 points. That is what a
public NBA Elo does. It picks winners; it does not beat closing spreads on its own. The edge, if
there is one, has to come from the availability layer below and from early lines.

## Runs

`.github/workflows/nba.yml` runs every morning at 7am Eastern, pulls the days since the last final
plus ten days ahead, replays the ratings, and commits `games.csv` and `model.json` only if they
changed. On demand it takes a date range and a refit switch. A push that changes `nba/tools/*.js`
runs it once.

Local:

```
node nba/tools/history.js      # once; downloads the history file (or --file path/to/nba_elo.csv)
node nba/tools/fetch.js        # needs ESPN reachable; --from / --to for a range
node nba/tools/elo.js          # replay; add "fit" to refit
```

## What comes next, in order

1. **First run from Actions**: confirms the ESPN NBA feed answers from GitHub's runners (it does for
   the NFL feed; the NBA one could not be checked from the session that wrote this) and backfills
   2025-03-18 to the 2025 Finals and all of 2025-26. Then the 2026-27 preseason board is last season's
   ratings carried toward the mean; a Vegas win-total anchor can be added the way the Joker uses one.
2. **The page**: `nba/index.html` and `nba/admin.html` built the way `betting/` builds them, reading a
   published state: today's and tomorrow's slate with the model's pick, chance, spread and the line
   beside it, the ratings tab, a record by day and month, picks kept in the browser and graded against
   the published finals, and a Parlay Builder whose legs are independent games, so a team parlay's fair
   price is the product of the model's chances.
3. **Net rating term**: rolling four-factors net rating from ESPN box scores alongside Elo, the role
   net EPA plays in the NFL model.
4. **Availability layer**: the NBA's quarterback model. Each player's value from last season's
   minutes-weighted impact; a team's rating shifts by whoever is out on the day's injury report. This
   is what moves NBA lines, and it is the piece that could beat the market.
5. **Player props on the same page**: projections are minutes times a per-minute rate, so they come
   after the availability layer and reuse it. Fair lines first, book prices only where credits allow;
   same-game legs priced with a correlation table like the NFL props model's.
