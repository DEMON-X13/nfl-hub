/* Past seasons' results from ESPN, in cfb/data/history.json.

    node cfb/tools/history.js               2014 to the season before the one in play
    node cfb/tools/history.js 2019 2025     a range, merged into the file (other seasons kept)

   Regular-season weeks 1 to 16 and the whole postseason of each season, every game with
   an FBS team in it. Scores only: ESPN carries no odds for a finished game, so the
   model is fitted on results alone and the market comparison starts the season the
   job goes live. The file is committed. update.js appends the season just finished on its
   first run of a new season (seasonRows below, the same code), so the ratings carry from one
   season to the next without a hand edit; it refuses to run the new season when that pull
   fails. A pull that misses a week fails here too: a season with a hole in it would quietly
   skew every rating after it. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const OUT = path.join(__dirname, '..', 'data', 'history.json');
const TEAMS = path.join(__dirname, '..', 'data', 'teams.json');

const COLS = ['id', 'season', 'type', 'week', 'date', 'home', 'away', 'hs', 'as', 'neutral', 'hconf', 'aconf', 'note'];

/* every final of one season, as history rows. fetchWeek(season, week, type) returns a
   scoreboard or throws; a throw fails the whole season */
async function seasonRows(season, fetchWeek, teams = {}) {
  const rows = new Map();
  const jobs = [];
  for (let w = 1; w <= 16; w++) jobs.push([w, 2]);
  jobs.push([1, 3]);
  for (let i = 0; i < jobs.length; i += 4) {
    const batch = await Promise.all(jobs.slice(i, i + 4).map(([w, t]) => fetchWeek(season, w, t)
      .catch(e => { throw new Error(`${season} ${t === 3 ? 'postseason' : 'week ' + w}: ${e.message}`); })));
    for (const j of batch) {
      E.teamsOf(j, teams);
      for (const ev of j.events || []) {
        const g = E.gameRow(ev);
        if (!g || g.state !== 'final' || g.hs === null || g.as === null || g.season !== season) continue;
        if (E.isPlaceholder(g.home) || E.isPlaceholder(g.away)) continue;
        if (g.type !== 2) g.type = 3;
        rows.set(g.id, COLS.map(c => g[c]));
      }
    }
  }
  return [...rows.values()];
}

/* the file with these seasons' rows replaced by the new ones, in date order */
function mergeRows(H, seasons, rows) {
  const si = COLS.indexOf('season'), di = COLS.indexOf('date');
  const drop = new Set(seasons);
  const all = (H && H.rows || []).filter(r => !drop.has(r[si])).concat(rows);
  all.sort((a, b) => a[di] < b[di] ? -1 : a[di] > b[di] ? 1 : 0);
  return { cols: COLS, pulled: new Date().toISOString().slice(0, 10), rows: all };
}

async function main() {
  const { season } = require('./season');
  const from = +process.argv[2] || 2014, to = +process.argv[3] || (season() - 1);
  const teamsFile = fs.existsSync(TEAMS) ? JSON.parse(fs.readFileSync(TEAMS, 'utf8')) : {};
  const teams = teamsFile.teams || {};
  const H = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const seasons = [], rows = [];
  for (let s = from; s <= to; s++) {
    const r = await seasonRows(s, (y, w, t) => E.scoreboard(y, w, t), teams);
    console.log(`${s}: ${r.length} games`);
    seasons.push(s); rows.push(...r);
  }
  const out = mergeRows(H, seasons, rows);
  fs.writeFileSync(OUT, JSON.stringify(out));
  let confs = teamsFile.confs || {};
  try { confs = await E.conferences(); } catch (e) { console.log(`conferences: ${e.message}; the saved list kept`); }
  fs.writeFileSync(TEAMS, JSON.stringify({ confs, teams }, null, 0));
  console.log(`wrote ${out.rows.length} games to ${path.relative(process.cwd(), OUT)}; ${Object.keys(teams).length} teams`);
}

module.exports = { COLS, seasonRows, mergeRows };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
