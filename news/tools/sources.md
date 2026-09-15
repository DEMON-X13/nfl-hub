# Where the news comes from, and how it becomes a week

This is the model. The sources are fixed. The reading happens every Wednesday.

## 1. Pulled automatically (tools/pull-week.js)

| What | Source | Notes |
|---|---|---|
| Schedule, kickoff (UTC), TV, venue | ESPN scoreboard feed, `site.api.espn.com/.../scoreboard?seasontype=2&week=N&dates=2026` | Works from Node with a browser user agent. Blocked from curl. |
| Final scores for past weeks | Same feed, weeks 1 to N-1 | Written to `data/results.js`. Records and Final labels update from it. |
| Betting line and total | Same feed, `odds[0].details` and `overUnder` | Present for upcoming games only. |
| Team stats, season to date (2026 only, zeros before a team has played) | TeamRankings `/nfl/stat/<slug>?date=today` | Slugs: points-per-game, opponent-points-per-game, yards-per-play, opponent-yards-per-play, turnover-margin-per-game, sacks-per-game, qb-sacked-per-game, third-down-conversion-pct, red-zone-scoring-pct. Season column includes playoffs once they start. |
| Explosive plays (20+ yards) | ESPN core team statistics, `passingBigPlays + rushingBigPlays` over games played | ESPN calls them big plays. |
| Injuries | ESPN injuries feed, `site.api.espn.com/.../nfl/injuries` | One call, all teams. Status, body part, short comment. |
| Team headlines | ESPN team news feed per team, `.../teams/<id>/news?limit=8` | Headlines and links only. Read the ones that matter. |

Not scriptable: Pro Football Reference (Cloudflare blocks every automated request). Use it in a browser only.

## 2. Read every week, per game (the fixed panel)

Read these in this order for each of the 16 games. Same panel every week, so "consensus" means something.

1. **NFL.com** weekly game picks and the game preview (the analyst panel's split is the first bullet when they disagree).
2. **ESPN** game preview and both team pages (injury designations, depth chart notes).
3. **CBS Sports** and **Fox Sports** previews and expert picks.
4. **Sharp Football Analysis** for the market and power rating angle.
5. **Two beat writers per team**, found with the searches printed in the reading pack. Prefer the team's main newspaper or The Athletic writer. Local radio and team sites are fine for injury detail.
6. **Team official sites** for the Wednesday and Friday injury reports and transactions.

Optional when time allows: PFF (public pieces), The Ringer, Football Outsiders style write ups.

## 3. The consensus rule

A point goes on the card only if two or more sources make it. If sources split, that becomes one bullet that says who is on which side. Numbers carry their source's number. Injuries are dated in the bullet ("out Friday", "questionable as of Wednesday").

## 4. What gets written, per game

Week `headline` and `intro` are about the games only. No stadiums, buildings, ceremonies or other off field news.
The intro names the two or three marquee matchups of the week, picked from the numbers: both teams' power rank
(`data/ranks2026.js`), how close the spread is, the total, division games, and records. Say why each one matters.
Quarterback availability that changes a game is fair to mention.

Written automatically, not by hand: player positions after names (from `data/players2026.js`), the rank chip
(`data/ranks2026.js`, the betting model's Power Ratings rank) and the Deep Dive section under Keys to victory
(`data/units2026.js`). `tools/context.js` builds all three at the end of every pull.


- Game `note`: one line on what the game is.
- Each team: `headline` (one short line), `matchup` (3 bullets, the game from this team's angle), `strengths` (4 or 5, shown as Positives), `weaknesses` (4 or 5, shown as Negatives), `keys` (3, shown as Keys to victory, phrased as instructions).
- Every bullet starts with a short bold sentence, then the detail. Names in bold with `<strong>`.
- No em dashes, no double dashes, bullets not paragraphs, every number claim carries the number.

The exact field list and schema are in `tools/week-request.md`.

## 5. The Wednesday run, start to finish

```bash
npm install --no-save jsdom
```

```bash
node tools/pull-week.js N
```

1. Read `tools/out/weekN-pack.md`. Run the searches listed under each game.
2. Fill `data/weekN.js`: headline, intro, each game note, every team's five fields. Set `updated` to today.
3. Add `<script src="data/weekN.js"></script>` to `index.html` above `data/weeks.js`, and append `WEEKN` in `data/weeks.js`.
4. `node tools/smoke.js`, then commit and push. Pages redeploys in a minute or two.

Manual: say "build Week N" in Claude Code and the session does all of this. Automatic: the same steps can run as a scheduled cloud agent on Wednesday mornings once the repo is connected to Claude Code's GitHub integration and the owner is comfortable with an unattended publish.
