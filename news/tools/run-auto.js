/* Unattended weekly pull for the season tracker.
 *
 *   node tools/run-auto.js          (from news/)
 *
 * Works out where the season stands from the nflverse schedule (tools/lib.js seasonState: the first
 * regular-season week with an unplayed game), then runs tools/pull-week.js for that week. That script
 * refreshes data/results.js and data/stats2026.js (the self-updating parts of the site), drafts
 * data/weekN.js if it does not exist yet, writes the reading pack to tools/out/ and rebuilds the
 * context files. The narrative half of a week stays a person's job: the draft is not shown until it
 * is added to data/weeks.js and index.html by hand.
 *
 * After week 18 the tracker does not cover the playoffs: it stays on week 18, refreshing its finals,
 * and the page says the regular season is complete. When nflverse lists a later season than
 * tools/lib.js's SEASON, every run says so; the job keeps working on SEASON until a person moves it.
 * Exits non-zero when the schedule cannot be read or the pull fails, so the job commits nothing.
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
  if (st.newer.length) console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : 'note: '}the nflverse schedule now lists ${st.newer.join(', ')}; the tracker stays on ${SEASON} until SEASON in tools/lib.js is moved (HANDOFF.md, "A new season")`);
  if (st.phase === 'regular') console.log(`current week ${st.week}`);
  else console.log(`current week ${st.week}: the ${SEASON} regular season is complete (${st.phase}); refreshing week ${st.week}'s finals, no new week to draft`);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'pull-week.js'), String(st.week)], { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  process.exit(r.status ?? 1);
})().catch(e => { console.error(e.message || e); process.exit(1); });

module.exports = { where };
