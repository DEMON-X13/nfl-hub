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
   skew every rating after it. A week that throws fails the season, and so does one that answers
   with no finals: week 1, any week between two weeks with games, or the postseason (seasonRows
   pulls finished seasons only). update.js also holds the pull to the last publish of that
   season (shortOf), which catches a week that answered with only part of its games. */
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
  const out = [...rows.values()];
  const holes = holesOf(out);
  if (holes.length) throw new Error(`${season}: ${holes.join(', ')} answered with no finals (a hole in the season)`);
  return out;
}

const keyOf = (type, week) => type === 3 ? 'the postseason' : 'week ' + week;
/* the weeks of a finished season that came back empty: week 1, any week between two weeks with
   games, and the postseason (weeks after the last one with games, 15 or 16, are often empty) */
function holesOf(rows) {
  const ti = COLS.indexOf('type'), wi = COLS.indexOf('week');
  const n = {}; let post = 0;
  for (const r of rows) { if (r[ti] === 3) post++; else n[r[wi]] = (n[r[wi]] || 0) + 1; }
  const weeks = Object.keys(n).map(Number);
  const lastW = weeks.length ? Math.max(...weeks) : 0;
  const out = [];
  for (let w = 1; w <= Math.max(1, lastW); w++) if (!n[w]) out.push('week ' + w);
  if (!post) out.push('the postseason');
  return out;
}

/* the weeks where a pull has fewer finals than the last publish of that season had (more than
   one game, or 5%, short: ESPN does revise a game now and then). `published` is that publish's
   finals as {type, week} */
function shortOf(rows, published) {
  const ti = COLS.indexOf('type'), wi = COLS.indexOf('week');
  const have = {}, had = {};
  for (const r of rows) { const k = keyOf(r[ti], r[wi]); have[k] = (have[k] || 0) + 1; }
  for (const g of published) { const k = keyOf(g.type, g.week); had[k] = (had[k] || 0) + 1; }
  return Object.keys(had).filter(k => (have[k] || 0) < had[k] - Math.max(1, Math.floor(had[k] * 0.05))).map(k => `${k}: ${have[k] || 0} finals where it had ${had[k]}`);
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

module.exports = { COLS, seasonRows, mergeRows, holesOf, shortOf };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
