/* Check the built live tracker.
 *
 *   node live/build/smoke.js        (from the hub root)
 *
 * Seeds both apps' storage keys exactly as they write them, stubs ESPN, and checks that the
 * page reads the parlays, tracks every kind of leg, and says something useful when it can
 * neither read nor fetch. jsdom is borrowed from props/build so this needs no install of
 * its own; run npm ci there first.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const HTML = fs.readFileSync(path.join(ROOT, 'live', 'index.html'), 'utf8');
const URL_ = 'https://demon-x13.github.io/nfl-hub/live/';

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };

const SB = { events: [{ id: '401', competitions: [{ status: { type: { state: 'in', shortDetail: 'Q3 7:12' } },
  competitors: [{ homeAway: 'home', team: { abbreviation: 'ATL' }, score: '20' },
                { homeAway: 'away', team: { abbreviation: 'CAR' }, score: '17' }] }] }] };
const SUM = { boxscore: { players: [
  { team: { abbreviation: 'ATL' }, statistics: [
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Bijan Robinson' }, stats: ['17', '86', '5.1', '1', '22'] }] },
    { name: 'receiving', labels: ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'], athletes: [{ athlete: { displayName: 'Kyle Pitts' }, stats: ['2', '21', '10.5', '0', '12', '4'] }] }] },
  { team: { abbreviation: 'CAR' }, statistics: [
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Chuba Hubbard' }, stats: ['12', '31', '2.6', '0', '9'] }] }] }] } };

const GID = '2026_02_CAR_ATL';
const leg = (pid, name, stat, k, side, main, label, team) =>
  ({ key: `${GID}|${pid}|${stat}`, gid: GID, pid, stat, k, side, main, name, label, team, week: 2, p: 0.6, price: -110, src: 'real' });

function run(seed, fetchMode) {
  return new Promise(resolve => {
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: URL_,
      beforeParse(w) {
        w.fetch = u => fetchMode === 'fail'
          ? Promise.resolve({ ok: false, status: 403 })
          : Promise.resolve({ ok: true, status: 200, json: async () => String(u).includes('/summary?') ? SUM : SB });
        /* the page reads storage the moment it parses, so it has to be seeded first */
        try { seed(w); } catch (e) { /* localStorage not up yet; seeded again below */ }
      } });
    const w = dom.window;
    try { seed(w); } catch (e) {}
    if (typeof w.refresh === 'function') w.refresh();
    setTimeout(() => resolve({ w, d: w.document }), 700);
  });
}

(async () => {
  // ---- A. both apps' parlays are read and tracked ----
  const seed = w => {
    w.localStorage.setItem('props_2026_v1', JSON.stringify({ saved: [{ id: 'sp1', week: 2, stake: 20, price: 580, payout: 136,
      legs: [leg('p1', 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL'),
             leg('p2', 'Chuba Hubbard', 'rushing_yards', 54.5, 'under', true, 'Under 54.5 rushing yards', 'CAR'),
             leg('p3', 'Kyle Pitts', 'receptions', 3, 'over', false, '3+ receptions', 'ATL')] }] }));
    w.localStorage.setItem('x_nfl_viewer_picks_2026', JSON.stringify({ bank: { build: [
      { id: 'b1', week: 2, type: 'parlay', stake: 25, legs: [
        { game_id: GID, away: 'CAR', home: 'ATL', pick: 'ATL', ml: -150 },
        { game_id: GID, away: 'CAR', home: 'ATL', pick: 'CAR', ml: 130 }] }] } }));
  };
  const { w, d } = await run(seed, 'ok');
  const cards = [...d.querySelectorAll('.card')];
  chk(cards.length === 2, `expected both parlays, got ${cards.length} card(s)`);
  chk(!!d.querySelector('.card.prop') && !!d.querySelector('.card.bet'), 'one card from each app should show');
  const rows = [...d.querySelectorAll('.card.prop .leg')].map(r => r.textContent.replace(/\s+/g, ' ').trim());
  chk(rows.length === 3, `the prop parlay should show 3 legs, showed ${rows.length}`);
  chk(/86 \/ 43\.5/.test(rows[0]) && /hit/.test(rows[0]), 'an over that cleared is not marked hit: ' + rows[0]);
  chk(/31 \/ 54\.5/.test(rows[1]) && /to spare/.test(rows[1]), 'a live under does not show the room it has left: ' + rows[1]);
  chk(/2 \/ 3/.test(rows[2]) && /1 to go/.test(rows[2]), 'a rung does not show what is left: ' + rows[2]);
  const bet = [...d.querySelectorAll('.card.bet .leg')].map(r => r.textContent.replace(/\s+/g, ' ').trim());
  chk(bet.length === 2 && /CAR 17.20 ATL/.test(bet[0]), 'a betting leg does not show the score: ' + bet[0]);
  chk(/Q3 7:12/.test(bet[0]), 'the game clock is missing');
  chk(/\$20\.00/.test(d.querySelector('.card.prop').textContent), 'the prop stake is missing');
  chk(/\$25\.00/.test(d.querySelector('.card.bet').textContent), 'the betting stake is missing');
  chk(!/error/.test(d.getElementById('stamp').textContent), 'a good fetch reported an error');
  chk(w.localStorage.getItem('props_2026_v1').includes('sp1'), 'the page wrote over the prop model key');
  chk(!!d.getElementById('every') && !!d.getElementById('now'), 'the interval control or refresh button is missing');

  // ---- B. nothing saved in this browser ----
  const b = await run(() => {}, 'ok');
  chk(/No saved parlays/.test(b.d.getElementById('app').textContent), 'an empty browser is not explained');
  chk(/do not travel between devices/.test(b.d.getElementById('app').textContent), 'the per-browser limit is not explained');

  // ---- C. the fetch is refused ----
  const c = await run(seed, 'fail');
  chk(/not loading/.test(c.d.getElementById('app').textContent), 'a refused fetch is not explained');
  chk(/HTTP 403/.test(c.d.getElementById('app').textContent), 'a refused fetch does not say what happened');
  chk(c.d.querySelectorAll('.card').length === 2, 'the parlays should still be listed when the scores cannot load');

  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
})();
