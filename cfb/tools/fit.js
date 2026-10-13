/* Choose the model's parameters on the history and write cfb/data/model.json.

    node cfb/tools/fit.js

   A grid over K, the preseason carry, home field, the FCS base rating (what a school
   from the lower division starts at, since the history barely sees it play) and the
   margin multiplier, replaying
   every game since 2014 in date order and scoring the home win probability by log loss
   from 2016 on (the first two seasons are the warm-up). The spread's points-per-Elo and
   the margin's standard deviation are then least-squares fits under the chosen
   parameters, on the same seasons less the last, and the last season is reported as a
   holdout so the numbers in model.json mean something outside the fit. */
'use strict';
const fs = require('fs'), path = require('path');
const { Elo, fitSpread, spreadOf } = require('./elo');
const DATA = path.join(__dirname, '..', 'data');

const H = JSON.parse(fs.readFileSync(path.join(DATA, 'history.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(DATA, 'teams.json'), 'utf8'));
const FBS = new Set(Object.keys(T.confs));
const col = Object.fromEntries(H.cols.map((c, i) => [c, i]));
const games = H.rows.map(r => ({ id: r[col.id], season: r[col.season], type: r[col.type], week: r[col.week], date: r[col.date], home: r[col.home], away: r[col.away], hs: r[col.hs], as: r[col.as], neutral: r[col.neutral], hconf: r[col.hconf], aconf: r[col.aconf] }));
games.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const seasons = [...new Set(games.map(g => g.season))].sort();
const WARM = seasons.slice(0, 2), HOLD = seasons[seasons.length - 1];
console.log(`${games.length} games, seasons ${seasons[0]}-${HOLD}; warm-up ${WARM.join(',')}; holdout ${HOLD}`);

/* replay under one parameter set; returns per-game (season, diff, margin, pHome, homeWin) */
function replay(params) {
  const m = new Elo(params, FBS); const out = [];
  for (const g of games) {
    m.newSeason(g.season);
    const pre = m.play(g);
    out.push({ season: g.season, diff: pre.diff, margin: pre.margin, pHome: pre.pHome, win: g.hs > g.as ? 1 : g.hs < g.as ? 0 : 0.5 });
  }
  return out;
}
const scoreOf = (rows, pick) => {
  const r = rows.filter(pick); let ll = 0, acc = 0;
  for (const x of r) { const p = Math.min(0.999, Math.max(0.001, x.pHome)); ll -= x.win * Math.log(p) + (1 - x.win) * Math.log(1 - p); acc += (x.pHome >= 0.5) === (x.win >= 0.5) ? 1 : 0; }
  return { ll: ll / r.length, acc: acc / r.length, n: r.length };
};

const grid = [];
for (const K of [20, 30, 40, 50, 65]) for (const carry of [0.6, 0.7, 0.8, 0.9]) for (const hfa of [45, 60, 75]) for (const fcsBase of [800, 900, 1000, 1100, 1200]) for (const mov of [true, false]) grid.push({ K, carry, hfa, mov, fcsBase });
let best = null;
for (const p of grid) {
  const rows = replay(p);
  const s = scoreOf(rows, x => !WARM.includes(x.season) && x.season !== HOLD);
  if (!best || s.ll < best.s.ll) best = { p, s, rows };
}
console.log(`best ${JSON.stringify(best.p)}: log loss ${best.s.ll.toFixed(4)}, accuracy ${(best.s.acc * 100).toFixed(1)}% on ${best.s.n} games`);
const hold = scoreOf(best.rows, x => x.season === HOLD);
console.log(`holdout ${HOLD}: log loss ${hold.ll.toFixed(4)}, accuracy ${(hold.acc * 100).toFixed(1)}% on ${hold.n} games`);

const fitRows = best.rows.filter(x => !WARM.includes(x.season) && x.season !== HOLD);
const sp = fitSpread(fitRows.map(x => [x.diff, x.margin]));
const mae = rows => rows.reduce((a, x) => a + Math.abs(x.margin - spreadOf(x.diff, sp)), 0) / rows.length;
const holdRows = best.rows.filter(x => x.season === HOLD);
console.log(`spread: ${sp.ppe.toFixed(2)} Elo per point, intercept ${sp.b.toFixed(2)}, margin sd ${sp.sd.toFixed(2)}; MAE ${mae(fitRows).toFixed(2)} fit, ${mae(holdRows).toFixed(2)} holdout`);
/* calibration of the cover model on the holdout: how often the home side beats the model's own spread */
const beat = holdRows.filter(x => x.margin > spreadOf(x.diff, sp)).length / holdRows.length;
console.log(`holdout: home beats the model spread ${(beat * 100).toFixed(1)}% of the time (50% is calibrated)`);

fs.writeFileSync(path.join(DATA, 'model.json'), JSON.stringify({
  params: best.p, ppe: sp.ppe, b: sp.b, sd: sp.sd,
  fitted: { seasons: seasons.filter(s => !WARM.includes(s) && s !== HOLD), warmup: WARM, holdout: HOLD, on: new Date().toISOString().slice(0, 10),
    logloss: +best.s.ll.toFixed(4), accuracy: +best.s.acc.toFixed(4), games: best.s.n,
    holdoutLogloss: +hold.ll.toFixed(4), holdoutAccuracy: +hold.acc.toFixed(4), holdoutGames: hold.n,
    spreadMae: +mae(fitRows).toFixed(2), holdoutSpreadMae: +mae(holdRows).toFixed(2), holdoutHomeBeatsSpread: +beat.toFixed(3) },
}, null, 1));
console.log('wrote cfb/data/model.json');
