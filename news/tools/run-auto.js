/* Unattended weekly pull for the season tracker.
 *
 *   node tools/run-auto.js          (from news/)
 *
 * Works out the current week from the nflverse schedule (the first regular-season
 * week with an unplayed game), then runs tools/pull-week.js for it. That script
 * refreshes data/results.js and data/stats2026.js (the self-updating parts of the
 * site), drafts data/weekN.js if it does not exist yet, and writes the reading pack
 * to tools/out/. The narrative half of a week stays a person's job: the draft is
 * not shown until it is added to data/weeks.js and index.html by hand.
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const SEASON = 2026;
const GAMES = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';

async function currentWeek() {
  const r = await fetch(GAMES);
  if (!r.ok) throw new Error('games.csv HTTP ' + r.status);
  const lines = (await r.text()).split('\n');
  const head = lines[0].split(',');
  const col = n => head.indexOf(n);
  const iSeason = col('season'), iType = col('game_type'), iWeek = col('week'), iHome = col('home_score');
  let unplayed = [], maxWeek = 0;
  for (const line of lines.slice(1)) {
    const f = line.split(',');
    if (f[iSeason] !== String(SEASON) || f[iType] !== 'REG') continue;
    const w = parseInt(f[iWeek], 10); maxWeek = Math.max(maxWeek, w);
    if (!String(f[iHome] || '').trim()) unplayed.push(w);
  }
  return unplayed.length ? Math.min(...unplayed) : maxWeek;
}

(async () => {
  const week = await currentWeek();
  console.log(`current week ${week}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'pull-week.js'), String(week)], { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  process.exit(r.status ?? 1);
})().catch(e => { console.error(e); process.exit(1); });
