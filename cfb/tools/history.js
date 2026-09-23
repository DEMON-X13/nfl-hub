/* Pull past seasons' results from ESPN into cfb/data/history.json, once.

    node cfb/tools/history.js               2014 to last season
    node cfb/tools/history.js 2019 2025     a range

   Regular-season weeks 1 to 16 and the whole postseason of each season, every game with
   an FBS team in it. Scores only: ESPN carries no odds for a finished game, so the
   model is fitted on results alone and the market comparison starts the season the
   job goes live. The file is committed; the job never re-pulls it. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const OUT = path.join(__dirname, '..', 'data', 'history.json');
const TEAMS = path.join(__dirname, '..', 'data', 'teams.json');

const from = +process.argv[2] || 2014, to = +process.argv[3] || (new Date().getFullYear() - 1);
const COLS = ['id', 'season', 'type', 'week', 'date', 'home', 'away', 'hs', 'as', 'neutral', 'hconf', 'aconf', 'note'];

async function main() {
  const rows = new Map(); const teams = fs.existsSync(TEAMS) ? JSON.parse(fs.readFileSync(TEAMS, 'utf8')).teams || {} : {};
  for (let season = from; season <= to; season++) {
    let n = 0;
    const jobs = [];
    for (let w = 1; w <= 16; w++) jobs.push([w, 2]);
    jobs.push([null, 3]);
    for (let i = 0; i < jobs.length; i += 4) {
      const batch = await Promise.all(jobs.slice(i, i + 4).map(([w, t]) => E.scoreboard(season, w, t).catch(e => { console.log(`  ${season} week ${w ?? 'post'}: ${e.message}`); return { events: [] }; })));
      for (const j of batch) {
        E.teamsOf(j, teams);
        for (const ev of j.events || []) {
          const g = E.gameRow(ev);
          if (!g || g.state !== 'final' || g.hs === null || g.as === null || g.season !== season) continue;
          if (g.type !== 2) g.type = 3;
          if (!rows.has(g.id)) n++;
          rows.set(g.id, COLS.map(c => g[c]));
        }
      }
    }
    console.log(`${season}: ${n} games`);
  }
  const all = [...rows.values()].sort((a, b) => a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : 0);
  fs.writeFileSync(OUT, JSON.stringify({ cols: COLS, pulled: new Date().toISOString().slice(0, 10), rows: all }));
  const confs = await E.conferences();
  fs.writeFileSync(TEAMS, JSON.stringify({ confs, teams }, null, 0));
  console.log(`wrote ${all.length} games to ${path.relative(process.cwd(), OUT)}; ${Object.keys(teams).length} teams`);
}
main().catch(e => { console.error(e); process.exit(1); });
