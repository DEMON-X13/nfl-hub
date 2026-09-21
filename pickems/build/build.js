/* Build the Pick'ems page.
 *
 *   node pickems/build/build.js        (from the hub root)
 *
 *   pickems/index.html   one page, one tab for now: the betting model's call on every game,
 *                        and underneath each one the prop model's price on both sides.
 *
 * The maths is lifted out of props/build/part2.js at build time rather than copied, the way
 * live/build/build.js and betting/tools/build.js lift from the same file: two pages pricing
 * the same bet have to price it identically, and moving any of it fails this build rather
 * than letting them drift apart.
 *
 * The market rows and the fitted margin grid are baked in -- 30KB of the prop model's
 * payload rather than its 942KB -- so the page's only fetch is betting/state.json, which it
 * would be loading anyway.
 *
 * Neither site is touched. This page reads what they publish.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = {
  part2: fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8'),
  part3: fs.readFileSync(path.join(ROOT, 'props', 'build', 'part3.js'), 'utf8'),
  // the confidence bands belong to the betting model, whose call this board shows: they were
  // cut where its walk-forward record changes, and a second copy here would drift off them
  betting: fs.readFileSync(path.join(ROOT, 'betting', 'app', 'x_nfl_betting_model.html'), 'utf8'),
};

const lift = (file, from, to, what) => {
  const src = SRC[file];
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  if (a < 0 || b < 0) throw new Error(`the ${what} is not where pickems/build expects it in ${file}.js`);
  return src.slice(a, b).trimEnd();
};

const LIFTED = [
  lift('part2', 'const TEAM_NAMES=', 'const TEAM_COLORS=', 'team names'),
  // the board is the betting app's row, so its tags are the betting app's: the colour table,
  // the contrast maths that picks a readable text colour, and tag() itself
  lift('betting', 'const TEAM_COLORS=', '\n', 'team colours'),
  lift('betting', 'function hex2rgb(', 'function tier(', 'tag colours and tag()'),
  lift('part2', 'const clip=', 'function relz', 'clip'),
  lift('part2', '/* the team model from the other project', 'function gameCtx', 'model margin'),
  lift('part2', 'const MARGIN_SD=', '/* chance of k or more touchdowns', 'game bet maths'),
  lift('part2', 'function confTier(', '/* rungs worth showing', 'confidence tiers'),
  lift('part2', 'function probToAmerican(', 'function legKey', 'probability to american'),
  lift('part2', 'function bookImplied(', '/* the full picture for one rung', 'book pricing'),
  lift('part3', 'function fmtML(', 'function mlToDec', 'american price formatter'),
  lift('betting', 'function tier(', 'function statsFromRow', 'betting confidence bands'),
].join('\n');

for (const need of ['const TEAM_NAMES', 'function fmtML', 'const clip=', 'function modelMargin',
                    'function gameBet', 'function gameMu', 'function confTier',
                    'function probToAmerican', 'function bookImplied', 'function bookPrice', 'function tier(',
                    'function tag(', 'function tagColor(', 'const PROB_HI'])
  if (!LIFTED.includes(need)) throw new Error('the lifted block is missing ' + need);

/* bookImplied reads the visitor's margin setting off the prop model's state object, which
   does not exist here. This page has no settings, so it prices at the middle one. */
const SHIM = `const S_MARGIN='typical';\nconst S={margin:S_MARGIN};`;

const pay = JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8'));
if (!pay.grid || !Array.isArray(pay.sched)) throw new Error('the prop model payload is not the shape this build reads');
const MKT = {};
for (const g of pay.sched) {
  const row = { h: g.h, a: g.a };
  for (const k of ['sp', 'tot', 'mla', 'mlh', 'spa', 'sph']) if (g[k] != null && isFinite(g[k])) row[k] = g[k];
  MKT[g.id] = row;
}
const DATA = `const PAY={grid:${JSON.stringify(pay.grid)}};\nconst MKT=${JSON.stringify(MKT)};`;

const page = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
for (const slot of ['/*LIFTED*/', '/*DATA*/'])
  if (!page.includes(slot)) throw new Error(`page.html has no ${slot} slot`);
const out = page.replace('/*LIFTED*/', SHIM + '\n' + LIFTED).replace('/*DATA*/', DATA);
fs.writeFileSync(path.join(ROOT, 'pickems', 'index.html'), out);
console.log(`pickems/index.html written: ${(out.length / 1024).toFixed(1)} KB `
  + `(${LIFTED.split('\n').length} lines lifted from the prop model, ${Object.keys(MKT).length} games of market)`);
