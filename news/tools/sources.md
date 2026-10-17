# Where the news comes from, and how it becomes a week's notes

The sources are fixed. The reading happens every Wednesday, for the notes in `data/notes/<season>-w<N>.json`
that X NFL Bets and Stats' Game snapshot shows under each game's records (`HANDOFF.md`, "The weekly job").

## 1. Pulled automatically (tools/pull-week.js and tools/context.js)

| What | Source | Notes |
|---|---|---|
| Schedule, kickoff (UTC), TV, venue | ESPN scoreboard feed, `site.api.espn.com/.../scoreboard?seasontype=2&week=N&dates=2026` | Falls back to the nflverse schedule when ESPN refuses. |
| Final scores | Same feed, weeks 1 to N | `data/results.js`; the stat lines are held to them. |
| Lineups for the Deep Dive | nflverse injury report, roster and depth charts, plus ESPN's injury list and practice notes (`tools/context.js`) | The report's game statuses once filed; before then ESPN's Questionable clears no one, and with a note of no practice on the last practice day it rules him out. A note's practice is dated by its own weekday, never the game's. Each week's lineups are kept as kickoff found them and graded against the snap counts the week after. |
| Team stats, season to date | TeamRankings `/nfl/stat/<slug>?date=today` | points-per-game, opponent-points-per-game, yards-per-play, opponent-yards-per-play, turnover-margin-per-game, sacks-per-game, qb-sacked-per-game, third-down-conversion-pct, red-zone-scoring-pct, into `data/stats2026.js` and `stats.json`. |
| Explosive plays (20+ yards) | ESPN core team statistics, `passingBigPlays + rushingBigPlays` over games played | ESPN calls them big plays. |
| Injuries | ESPN injuries feed, `site.api.espn.com/.../nfl/injuries` | One call, all teams: status, body part, short comment. In the pack, dated. |
| Team headlines | ESPN team news feed per team, `.../teams/<id>/news?limit=8` | Headlines and links, dated, in the pack. Read the ones that matter. |

Not scriptable: Pro Football Reference (Cloudflare blocks every automated request). Use it in a browser only.

## 2. Read every week, per game (the fixed panel)

Read these for each game, in this order. Same panel every week, so "two sources" means something.

1. **ESPN** game preview and both team pages (injury designations, depth chart notes).
2. **NFL.com** game preview and the team's transactions.
3. **CBS Sports** and **Fox Sports** previews.
4. **Two beat writers per team**, found with the searches printed in the reading pack: the team's main
   newspaper or The Athletic writer. Local radio and team sites are fine for injury detail.
5. **Team official sites** for the Wednesday and Friday injury reports and transactions.

Only this week's reporting: from the day after the team's last game.

## 3. The consensus rule

A fact goes in a note only if it is on an injury report or two sources say it. Injuries are dated in the note
where it matters ("did not practise Wednesday", "ruled out Friday"). Name the outlets in `sources`.

## 4. What gets written, per game

- `preview`: one sentence, the game's story: form, a key player, a storyline.
- `news`: the one or two things a fan should know this week (a starter out or back, a quarterback change, a
  trade, a coaching change), or `""` when nothing is notable.
- `sources`: the outlets, short names.

Never the market (the snapshot shows the line and the models apart), never a record or score in the preview
(the records sit beside it), never the site's own ranks. The format and the full rules are in
`tools/week-request.md`; `node tools/notes.js --strict` holds a file to them.

Written automatically, not by hand: the Deep Dive (`data/units.json`) and the records, which the Game snapshot
draws beside the notes; the stat bars (`data/stats.json`) are still written but read by no page since 16 October
2026 (the owner's call: the Stat breakdown went).
