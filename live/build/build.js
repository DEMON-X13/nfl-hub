/* Build the live tracker page.
 *
 *   node live/build/build.js        (from the hub root)
 *
 *   live/index.html   one small page that watches the parlays already saved in this
 *                     browser by the prop model and the betting model.
 *
 * The ESPN parsing and the betting-model reader are not copied here: they are lifted out
 * of props/build/part2.js at build time, between the banners below, so there is one source
 * of truth for the fiddly half and the prop model's audit keeps testing it. Only the page
 * itself -- shell, styling and rendering -- lives in page.html.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8');

const FROM = "/* ---------- live tracking: ESPN's public feeds ----------";
const TO = '/* ---------- track record:';
const a = SRC.indexOf(FROM), b = SRC.indexOf(TO);
if (a < 0 || b < 0 || b <= a) throw new Error('the live block is not where build.js expects it in part2.js');
const shared = SRC.slice(a, b).trimEnd();
for (const need of ['function espnStats', 'function liveLeg', 'function liveGameLeg', 'function espnGames', 'function bettingParlays'])
  if (!shared.includes(need)) throw new Error('the extracted block is missing ' + need);

const page = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
if (!page.includes('/*SHARED*/')) throw new Error('page.html has no /*SHARED*/ slot');
const out = page.replace('/*SHARED*/', shared);
fs.writeFileSync(path.join(ROOT, 'live', 'index.html'), out);
console.log(`live/index.html written: ${(out.length / 1024).toFixed(1)} KB (${shared.split('\n').length} lines shared from the prop model)`);
