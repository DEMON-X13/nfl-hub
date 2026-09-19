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
  check([...d.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,mine,bank,ratings,backup', 'AI Picks, My Picks, Parlay Builder, Power Ratings and Backup tabs remain');
  check(!d.getElementById('rebuildBtn') && !d.getElementById('resetBtn') && !!d.getElementById('exportBtn'), 'viewer: Backup has save and import only');
  check(Object.keys(S.odds || {}).length > 0, 'published moneylines are available to the Parlay Builder tab');
  check(!d.getElementById('oddsFetch') && !d.getElementById('oddsFileBtn') && !d.getElementById('oddsClear'), 'Bank Roll: odds fetch/upload/clear card removed for visitors');
  check(Object.keys(S.myPicks).length === 0 && Object.values(S.processed).every(p => p.myPick === null), 'a new visitor has no picks and inherits none of the owner\'s');
  check(!d.getElementById('recordStats') || d.getElementById('tab-record').hidden, 'record tab is not shown');
  // the visitor picks the loser of the first graded game; save() should persist only picks
  S.myPicks[first] = loser; S.bank.start = 250; S.bets[1] = { staked: 20, returned: 35, note: 'visitor' }; w.eval('save()'); await sleep(400);
  const stored = JSON.parse(w.localStorage.getItem('x_nfl_viewer_picks_2026') || '{}');
  check(stored.myPicks && stored.myPicks[first] === loser, 'visitor pick saved to their own storage');
  check(stored.bank && stored.bank.start === 250 && stored.bets && stored.bets[1].returned === 35, 'visitor bankroll and bets saved to their own storage');
  check(w.localStorage.getItem('x_nfl_betting_model_2026_v1') === null, 'the full state is never written to the visitor\'s storage');

  // 2. returning visitor: pick graded against the published result
  const r2 = load({ myPicks: { [first]: loser }, bank: { start: 250, lastAmt: 20, filter: 'all', weeks: {} }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } }); await sleep(300);
  const S2 = r2.dom.window.eval('S');
  check(S2.processed[first].myPick === loser && S2.processed[first].myCorrect === (winner ? false : null), 'returning visitor: pick restored and graded as a miss');
  check(S2.bank.start === 250 && S2.bets[1] && S2.bets[1].returned === 35, 'returning visitor: bankroll and bets restored');
  check(r2.errors.length === 0, 'returning visitor: no runtime errors');
  const stamp = r2.dom.window.document.getElementById('saveState');
  await sleep(500);
  check(stamp && /^Updated /.test(stamp.textContent), 'page shows the publish time instead of an autosave note');

  // 3. admin page: same published season, every tab, private things from the same store
  const adminHtml = fs.readFileSync(path.join(ROOT, 'betting', 'admin.html'), 'utf8').replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, '');
  const a = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/admin.html',
    beforeParse(w2) { w2.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w2.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w2.confirm = () => true; w2.alert = () => {}; w2.scrollTo = () => {};
      w2.localStorage.setItem('x_nfl_viewer_picks_2026', JSON.stringify({ myPicks: { [first]: loser }, bank: { start: 250, lastAmt: 20, filter: 'all', weeks: {} }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } })); } });
  await sleep(600);
  const SA = a.window.eval('S'); const da = a.window.document;
  check(Object.keys(SA.processed).length === graded.length, 'admin: published season loaded');
  check([...da.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,mine,bank,record,bets,ratings,upload,backup', 'admin: every tab present');
  check(!!da.getElementById('oddsFetch'), 'admin: moneylines card kept');
  check(SA.processed[first].myPick === loser && SA.bets[1].returned === 35 && SA.bank.start === 250, 'admin: picks, bets and bankroll come from the same browser store as the viewer');
  check(/straight-up, \d+ of \d+/.test(da.getElementById('recordStats').textContent) && !!da.querySelector('#modelChart svg'), 'admin: record and chart render from the published games');

  check(!da.getElementById('rebuildBtn') && !da.getElementById('resetBtn') && !!da.getElementById('exportBtn') && !!da.getElementById('importBtn'), 'admin: Backup keeps save and import, drops rebuild and reset');
  check(/your picks, Bet Log, bankroll and Bet Build/.test(da.getElementById('tab-backup').textContent), 'admin: Backup says what it covers');
  a.window.eval('S.lastBackup=Date.now()-3*86400000; S.lastBackupHow="downloaded"; save()'); await sleep(900);
  const kept = JSON.parse(a.window.localStorage.getItem('x_nfl_viewer_picks_2026') || '{}');
  check(kept.lastBackup && Date.now() - kept.lastBackup > 2 * 86400000, 'admin: the last-backup time is kept in the browser store');
  console.log(fails ? `${fails} check(s) failed` : `viewer + admin smoke test passed (${graded.length} graded games in the published state)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
