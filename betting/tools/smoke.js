/* Smoke test for the built viewer page.
 *
 *   node betting/tools/smoke.js
 *
 * Loads betting/index.html in jsdom with fetch stubbed to serve betting/state.json,
 * and checks: the published season is shown, the private tabs are gone, a visitor's
 * pick is kept in their own storage and graded against the published result.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'betting', 'index.html'), 'utf8').replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, '');
const state = fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('  FAIL', m); } };

function load(picks) {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/',
    beforeParse(w) {
      w.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
      w.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      if (picks) w.localStorage.setItem('x_nfl_viewer_picks_2026', JSON.stringify(picks));
      w.addEventListener('error', e => errors.push(e.message));
    } });
  return { dom, errors };
}

(async () => {
  const published = JSON.parse(state);
  const graded = Object.keys(published.processed);
  const first = graded[0]; const p0 = published.processed[first];
  const winner = p0.result > 0 ? p0.home : p0.result < 0 ? p0.away : null;
  const loser = winner === p0.home ? p0.away : p0.home;

  // 1. fresh visitor
  const { dom, errors } = load(null); await sleep(300);
  const w = dom.window, d = w.document; const S = w.eval('S');
  check(errors.length === 0, 'no runtime errors: ' + errors.join('; '));
  check(Object.keys(S.processed).length === graded.length, `published season loaded (${Object.keys(S.processed).length} graded)`);
  check([...d.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,mine,ratings', 'only AI Picks, My Picks and Power Ratings tabs remain');
  check(Object.keys(S.myPicks).length === 0 && Object.values(S.processed).every(p => p.myPick === null), 'a new visitor has no picks and inherits none of the owner\'s');
  check(!d.getElementById('recordStats') || d.getElementById('tab-record').hidden, 'record tab is not shown');
  // the visitor picks the loser of the first graded game; save() should persist only picks
  S.myPicks[first] = loser; w.eval('save()'); await sleep(400);
  const stored = JSON.parse(w.localStorage.getItem('x_nfl_viewer_picks_2026') || '{}');
  check(stored[first] === loser, 'visitor pick saved to their own storage');
  check(w.localStorage.getItem('x_nfl_betting_model_2026_v1') === null, 'the full state is never written to the visitor\'s storage');

  // 2. returning visitor: pick graded against the published result
  const r2 = load({ [first]: loser }); await sleep(300);
  const S2 = r2.dom.window.eval('S');
  check(S2.processed[first].myPick === loser && S2.processed[first].myCorrect === (winner ? false : null), 'returning visitor: pick restored and graded as a miss');
  check(r2.errors.length === 0, 'returning visitor: no runtime errors');
  const stamp = r2.dom.window.document.getElementById('saveState');
  await sleep(500);
  check(stamp && /^Updated /.test(stamp.textContent), 'page shows the publish time instead of an autosave note');

  console.log(fails ? `${fails} check(s) failed` : `viewer smoke test passed (${graded.length} graded games in the published state)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
