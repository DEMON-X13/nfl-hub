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
  /* My Picks is gone on purpose: the picks it held never left the browser that made them,
     and losing a week of them was the whole reason for dropping it. The key is untouched. */
  check([...d.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,bank,ratings,backup', 'AI Picks, Parlay Builder, Power Ratings and Backup tabs remain, without My Picks');
  check(!d.getElementById('tab-mine'), 'the My Picks section is gone with its tab');
  check(![...d.querySelectorAll('#tab-record th, .pickgrid th')].some(th => th.textContent.trim() === 'You'), 'no You column survives');
  check(!d.getElementById('rebuildBtn') && !d.getElementById('resetBtn') && !!d.getElementById('exportBtn'), 'viewer: Backup has save and import only');
  check(Object.keys(S.odds || {}).length > 0, 'published moneylines are available to the Parlay Builder tab');
  check(!d.getElementById('oddsFetch') && !d.getElementById('oddsFileBtn') && !d.getElementById('oddsClear'), 'Bank Roll: odds fetch/upload/clear card removed for visitors');
  check(Object.keys(S.myPicks).length === 0 && Object.values(S.processed).every(p => p.myPick === null), 'a new visitor has no picks and inherits none of the owner\'s');
  check(!d.getElementById('recordStats') || d.getElementById('tab-record').hidden, 'record tab is not shown');
  { d.querySelector('#tabs button[data-tab="backup"]').click();
    const bs = d.getElementById('backupState');
    check(bs && bs.className !== 'err' && !/Everything you have entered/.test(bs.textContent), 'a visitor with no data gets no backup alarm: ' + (bs && bs.textContent.trim().slice(0, 60)));
    check(w.eval('myDataCount()') === 0, "myDataCount counts the visitor's own entries, not the published season"); }
  // the visitor picks the loser of the first graded game; save() should persist only picks
  S.myPicks[first] = loser; S.bank.lastAmt = 35; S.bets[1] = { staked: 20, returned: 35, note: 'visitor' }; w.eval('save()'); await sleep(400);
  const stored = JSON.parse(w.localStorage.getItem('x_nfl_viewer_picks_2026') || '{}');
  check(stored.myPicks && stored.myPicks[first] === loser, 'visitor pick saved to their own storage');
  check(stored.bank && stored.bank.lastAmt === 35 && stored.bets && stored.bets[1].returned === 35, 'visitor stake and bets saved to their own storage');
  check(w.localStorage.getItem('x_nfl_betting_model_2026_v1') === null, 'the full state is never written to the visitor\'s storage');

  // 2. returning visitor: pick graded against the published result
  const r2 = load({ myPicks: { [first]: loser }, bank: { lastAmt: 35, filter: 'all', build: [], mode: 'straight' }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } }); await sleep(300);
  const S2 = r2.dom.window.eval('S');
  check(S2.processed[first].myPick === loser && S2.processed[first].myCorrect === (winner ? false : null), 'returning visitor: pick restored and graded as a miss');
  check(S2.bank.lastAmt === 35 && S2.bets[1] && S2.bets[1].returned === 35, 'returning visitor: stake and bets restored');
  check(r2.errors.length === 0, 'returning visitor: no runtime errors');
  const stamp = r2.dom.window.document.getElementById('saveState');
  await sleep(500);
  check(stamp && /^Updated /.test(stamp.textContent), 'page shows the publish time instead of an autosave note');
  r2.dom.window.eval('save()'); await sleep(500);
  check(/^Updated /.test(stamp.textContent), 'the publish time survives a save (no "Autosaved" on a published page)');
  { const S3 = r2.dom.window.eval('S'); S3.myPicks[first] = loser;
    r2.dom.window.document.querySelector('#tabs button[data-tab="backup"]').click();
    r2.dom.window.eval('renderBackupState()');
    const bs2 = r2.dom.window.document.getElementById('backupState');
    check(bs2.className === 'err' && /Everything you have entered/.test(bs2.textContent), 'a visitor who has picks does get the backup warning'); }

  // 3. admin page: same published season, every tab, private things from the same store
  const adminHtml = fs.readFileSync(path.join(ROOT, 'betting', 'admin.html'), 'utf8').replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, '');
  const a = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/admin.html',
    beforeParse(w2) { w2.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w2.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w2.confirm = () => true; w2.alert = () => {}; w2.scrollTo = () => {};
      w2.localStorage.setItem('x_nfl_viewer_picks_2026', JSON.stringify({ myPicks: { [first]: loser }, bank: { lastAmt: 35, filter: 'all', build: [], mode: 'straight' }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } })); } });
  await sleep(600);
  const SA = a.window.eval('S'); const da = a.window.document;
  check(Object.keys(SA.processed).length === graded.length, 'admin: published season loaded');
  check([...da.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,bank,record,bets,ratings,upload,backup', 'admin: every tab present but My Picks');
  check(!da.getElementById('tab-mine'), 'admin: the My Picks section is gone with its tab');
  check(![...da.querySelectorAll('#tab-record th, .pickgrid th')].some(th => th.textContent.trim() === 'You'), 'admin: no You column survives');
  check(!!da.getElementById('oddsFetch'), 'admin: moneylines card kept');
  check(SA.processed[first].myPick === loser && SA.bets[1].returned === 35 && SA.bank.lastAmt === 35, 'admin: picks, bets and stake come from the same browser store as the viewer');
  check(/straight-up, \d+ of \d+/.test(da.getElementById('recordStats').textContent) && !!da.querySelector('#modelChart svg'), 'admin: record and chart render from the published games');

  // Power Ratings carries the Impact absences table and not the rank-tag note
  check(!!da.querySelector('#tab-ratings #injCard #injSuggest') && /Impact absences, week \d+/.test(da.getElementById('injSuggest').textContent), 'admin: Impact absences is not under Power Ratings');
  check(!da.querySelector('#tab-upload #injSuggest'), 'admin: Impact absences is still on Data Upload too');
  check(!/Rank tags and the Elo change column/.test(da.getElementById('ratingsTable').textContent), 'admin: the rank-tag note is still under the ratings');
  check(!da.getElementById('injCard').hidden, 'admin: the absences card is hidden although it has rows');
  for (const [where, re] of [['modelChart', /Running season accuracy after each week/], ['recordTable', /Early weeks bounce around/], ['injSuggest', /Two absences carry a measured effect/]])
    check(!re.test(da.getElementById(where).textContent), `admin: the note is still under ${where}`);
  check(/Impact absences, week \d+/.test(da.getElementById('injSuggest').textContent) && !!da.querySelector('#injSuggest table'), 'admin: dropping the note took the absences table with it');
  { const rt = da.getElementById('ratingsTable');
    check(rt.parentElement.id === 'ratingsCard' && rt.parentElement.classList.contains('card') && rt.parentElement.parentElement.id === 'tab-ratings', 'admin: the ratings table is not in a card of its own');
    check(rt.querySelectorAll('tbody tr').length === 32 && rt.querySelectorAll('tbody .tierbadge').length === 32, 'admin: every Elo should carry its tier shield');
    check(!rt.querySelector('.tierlegend') && !/Challenger 1700/.test(rt.textContent), 'admin: the tier key is still on the ratings table'); }
  const dv = dom.window.document;
  check(!!dv.querySelector('#tab-ratings #injCard #injSuggest') && !/Rank tags and the Elo change column/.test(dv.getElementById('ratingsTable').textContent), 'viewer: Power Ratings does not carry the absences table, or still carries the note');
  check(!da.getElementById('rebuildBtn') && !da.getElementById('resetBtn') && !!da.getElementById('exportBtn') && !!da.getElementById('importBtn'), 'admin: Backup keeps save and import, drops rebuild and reset');
  check(/your picks, Bet Log, bankroll and Bet Build/.test(da.getElementById('tab-backup').textContent), 'admin: Backup says what it covers');
  a.window.eval('S.lastBackup=Date.now()-3*86400000; S.lastBackupHow="downloaded"; save()'); await sleep(900);
  const kept = JSON.parse(a.window.localStorage.getItem('x_nfl_viewer_picks_2026') || '{}');
  check(kept.lastBackup && Date.now() - kept.lastBackup > 2 * 86400000, 'admin: the last-backup time is kept in the browser store');
  // 4. embedded: the X NFL Bets and Stats page frames one tab of the admin page, headless
  const e = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/admin.html?embed=1#record',
    beforeParse(w3) { w3.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w3.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w3.confirm = () => true; w3.alert = () => {}; w3.scrollTo = () => {}; } });
  await sleep(600);
  const de = e.window.document;
  check(de.documentElement.classList.contains('embed'), 'embed: the page marks itself embedded');
  check(!de.getElementById('tab-record').hidden && de.getElementById('tab-picks').hidden, 'embed: #record opens the Records tab');
  check(/straight-up, \d+ of \d+/.test(de.getElementById('recordStats').textContent), 'embed: the record renders');
  check(/html\.embed header,html\.embed #tabs\{display:none\}/.test(adminHtml), 'embed: header and tab bar are hidden by the stylesheet');
  const plain = a.window.document.documentElement;
  check(!plain.classList.contains('embed'), 'a page opened normally is not embedded');
  console.log(fails ? `${fails} check(s) failed` : `viewer + admin smoke test passed (${graded.length} graded games in the published state)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
