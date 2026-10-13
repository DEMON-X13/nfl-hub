/* The college season in play and the job's clock, from one place: update.js, news.js, the
   smoke test and the simulation all read them here, and nothing else names a season.

   A season runs from late August to the title game in January. From February to July the
   finished season stays on the site (its phase reads 'over'); on 1 August the next season's
   schedule takes over (phase 'opening' until its first game is final). update.js appends the
   season just finished to data/history.json the first time it runs in the new one, so the
   ratings carry over without a hand edit.

   CFB_NOW stands in for the clock and CFB_SEASON for the season, for tests. */
'use strict';

const nowMs = () => {
  const v = process.env.CFB_NOW;
  if (!v) return Date.now();
  const t = Date.parse(v);
  if (!isFinite(t)) throw new Error(`CFB_NOW is not a date: ${v}`);
  return t;
};
/* the season a date falls in: August to December is that year's, January to July the year before's */
const seasonOf = ms => { const d = new Date(ms); return d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; };
const season = () => +(process.env.CFB_SEASON || seasonOf(nowMs()));
/* the run's stamp: the minute, in UTC, the way the job writes `frozen` and a line's `at` */
const stamp = ms => new Date(ms).toISOString().slice(0, 16) + 'Z';

module.exports = { nowMs, seasonOf, season, stamp };
