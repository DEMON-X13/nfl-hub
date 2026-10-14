/* Unattended pull for the news job (.github/workflows/news.yml).
 *
 *   node tools/run-auto.js          (from news/)
 *
 * Works out where the season stands from the nflverse schedule (tools/lib.js seasonState: the first
 * regular-season week with an unplayed game), then runs tools/pull-week.js for that week. That script
 * refreshes data/results.js and data/stats2026.js with its twin stats.json, writes the reading pack to
 * tools/out/ and rebuilds the Deep Dive (data/units2026.js and units.json), which X NFL Bets and Stats'
 * Game snapshot reads. The game notes (data/notes/) stay a person's job, written each Wednesday from the
 * pack (HANDOFF.md); nothing here writes them.
 *
 * After week 18 the job does not cover the playoffs: it stays on week 18, refreshing its finals. When
 * nflverse lists a later season than tools/lib.js's SEASON, every run says so; the job keeps working on
 * SEASON until a person moves it. Exits non-zero when the schedule cannot be read or the pull fails, so
 * the job commits nothing.
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const { SEASON, GAMES_URL, parseCSV, fetchText, seasonState } = require('./lib');

async function where() {
  const { text } = await fetchText(GAMES_URL);
  return seasonState(parseCSV(text));
}

if (require.main === module) (async () => {
  const st = await where();
  if (st.phase === 'none') throw new Error(`the nflverse schedule has no ${SEASON} regular season`);
  if (st.newer.length) console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : 'note: '}the nflverse schedule now lists ${st.newer.join(', ')}; the job stays on ${SEASON} until SEASON in tools/lib.js is moved (HANDOFF.md, "A new season")`);
  if (st.phase === 'regular') console.log(`current week ${st.week}`);
  else console.log(`current week ${st.week}: the ${SEASON} regular season is complete (${st.phase}); refreshing week ${st.week}'s finals`);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'pull-week.js'), String(st.week)], { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  process.exit(r.status ?? 1);
})().catch(e => { console.error(e.message || e); process.exit(1); });

module.exports = { where };
