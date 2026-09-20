/* Check the built live tracker.
 *
 *   node live/build/smoke.js        (from the hub root)
 *
 * Seeds both apps' storage keys exactly as they write them, stubs ESPN, and checks what
 * renders, that removal takes out the right parlay and nothing else, and that the page says
 * something useful when it can neither read nor fetch. jsdom is borrowed from props/build,
 * so this needs no install of its own; run npm ci there first.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const HTML = fs.readFileSync(path.join(ROOT, 'live', 'index.html'), 'utf8');
const URL_ = 'https://demon-x13.github.io/nfl-hub/live/';
const PROP_KEY = 'props_2026_v1', BET_KEY = 'x_nfl_viewer_picks_2026';

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

const GID = '2026_02_CAR_ATL';          /* the early game */
const GID2 = '2026_02_KC_BUF';          /* the night game */
const EARLY = '2026-09-20T17:00Z', NIGHT = '2026-09-21T00:20Z';
const ev = (id, date, away, home, state, as, hs) => ({ id, date,
  competitions: [{ status: { type: { state, shortDetail: state === 'post' ? 'Final' : 'Q3 7:12' } },
    competitors: [{ homeAway: 'home', team: { abbreviation: home }, score: String(hs) },
                  { homeAway: 'away', team: { abbreviation: away }, score: String(as) }] }] });
const GID3 = '2026_02_NO_BAL';          /* the four o'clock game */
const LATE = '2026-09-20T20:25Z';
const sb = state => ({ events: [ev('401', EARLY, 'CAR', 'ATL', state, 17, 20),
                                 ev('403', LATE, 'NO', 'BAL', state, 10, 14),
                                 ev('402', NIGHT, 'KC', 'BUF', state, 7, 3)] });
const SUM = { boxscore: { players: [
  { team: { abbreviation: 'ATL' }, statistics: [
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Bijan Robinson' }, stats: ['17', '86', '5.1', '1', '22'] }] },
    { name: 'receiving', labels: ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'], athletes: [{ athlete: { displayName: 'Kyle Pitts' }, stats: ['2', '21', '10.5', '0', '12', '4'] }] }] },
  { team: { abbreviation: 'CAR' }, statistics: [
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Chuba Hubbard' }, stats: ['12', '31', '2.6', '0', '9'] }] }] }] } };

const leg = (pid, name, stat, k, side, main, label, team) =>
  ({ key: `${GID}|${pid}|${stat}`, gid: GID, pid, stat, k, side, main, name, label, team, week: 2, p: 0.6, price: -110, src: 'real' });

/* the two blobs as their own apps write them, with the neighbouring fields a removal must not disturb */
const propBlob = () => JSON.stringify({ stake: 55, margin: 'typical', odds: { gX: { p1: { rushing_yards: { 40: -120 } } } },
  parlay: { 'keep|me': { gid: GID } },
  saved: [
    { id: 'sp1', week: 2, stake: 20, price: 580, payout: 136, legs: [
      leg('p1', 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL'),
      leg('p2', 'Chuba Hubbard', 'rushing_yards', 54.5, 'under', true, 'Under 54.5 rushing yards', 'CAR'),
      leg('p3', 'Kyle Pitts', 'receptions', 3, 'over', false, '3+ receptions', 'ATL')] },
    { id: 'sp2', week: 2, stake: 5, price: 300, payout: 20, legs: [
      leg('p4', 'Kyle Pitts', 'receiving_yards', 30.5, 'over', true, 'Over 30.5 receiving yards', 'ATL'),
      leg('p5', 'Bijan Robinson', 'receptions', 2, 'over', false, '2+ receptions', 'ATL')] }] });
const betBlob = () => JSON.stringify({ myPicks: { g1: 'KC' }, bets: { 2: { staked: 40, returned: 0 } },
  bank: { lastAmt: 20, filter: 'all', mode: 'parlay', build: [
    { id: 'b1', week: 2, type: 'parlay', stake: 25, legs: [
      { game_id: GID, away: 'CAR', home: 'ATL', pick: 'ATL', ml: -150 },
      { game_id: GID, away: 'CAR', home: 'ATL', pick: 'CAR', ml: 130 }] }] } });

function run({ seed = w => { w.localStorage.setItem(PROP_KEY, propBlob()); w.localStorage.setItem(BET_KEY, betBlob()); },
               mode = 'ok', state = 'in', hash = '' } = {}) {
  return new Promise(resolve => {
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: URL_ + hash,
      beforeParse(w) {
        w.confirm = () => true; w.alert = () => {};
        w.fetch = u => mode === 'fail'
          ? Promise.resolve({ ok: false, status: 403 })
          : Promise.resolve({ ok: true, status: 200, json: async () => String(u).includes('/summary?') ? SUM : sb(state) });
        try { seed(w); } catch (e) {}
      } });
    const w = dom.window;
    try { seed(w); } catch (e) {}
    if (typeof w.refresh === 'function') w.refresh();
    setTimeout(() => resolve({ w, d: w.document }), 700);
  });
}

(async () => {
  // ---- A. both apps' parlays render, in the hub's look ----
  const { w, d } = await run();
  chk(/Space Grotesk/.test(HTML) && /Inter Tight/.test(HTML), 'the page does not load the hub fonts');
  chk(/--gold:#D39A1F/.test(HTML) && /--pick:#1B7A4E/.test(HTML), 'the page does not use the hub colour tokens');
  chk(!!d.querySelector('header .brand h1'), 'the page has no branded header');
  const cards = [...d.querySelectorAll('.savedp')];
  chk(cards.length === 3, `expected 3 parlays (2 prop, 1 betting), got ${cards.length}`);
  chk(d.querySelectorAll('.savedp.prop').length === 2, 'the prop parlays are not marked as such');
  chk(d.querySelectorAll('.savedp:not(.prop)').length === 1, 'the betting parlay is not marked as such');
  const rows = [...d.querySelector('.savedp.prop').querySelectorAll('.sp-leg')].map(txt);
  chk(rows.length === 3, `the first prop parlay should show 3 legs, showed ${rows.length}`);
  chk(/86 \/ 43\.5/.test(rows[0]) && /hit/.test(rows[0]), 'an over that cleared is not marked hit: ' + rows[0]);
  chk(/31 \/ 54\.5/.test(rows[1]) && /to spare/.test(rows[1]), 'a live under does not show its room: ' + rows[1]);
  chk(/2 \/ 3/.test(rows[2]) && /1 to go/.test(rows[2]), 'a rung does not show what is left: ' + rows[2]);
  chk(!!d.querySelector('.sp-leg .res.win'), 'a hit leg has no tick');
  const bet = [...d.querySelector('.savedp:not(.prop)').querySelectorAll('.sp-leg')].map(txt);
  chk(/CAR 17.20 ATL/.test(bet[0]) && /Q3 7:12/.test(bet[0]), 'a betting leg does not show the score and clock: ' + bet[0]);
  chk(/\$20\.00/.test(txt(d.querySelector('.savedp.prop'))), 'the prop stake is missing');
  chk(/\$25\.00/.test(txt(d.querySelector('.savedp:not(.prop)'))), 'the betting stake is missing');
  chk(d.querySelectorAll('[data-rm]').length === 3, 'every parlay should offer Remove');
  chk(d.getElementById('clearDone').hidden, 'Clear finished should stay hidden while a game is live');

  // ---- B. removing one prop parlay leaves everything else alone ----
  d.querySelector('.savedp.prop [data-rm]').click();
  const after = JSON.parse(w.localStorage.getItem(PROP_KEY));
  chk(after.saved.length === 1 && after.saved[0].id === 'sp2', 'Remove took out the wrong prop parlay');
  chk(after.stake === 55 && after.margin === 'typical' && after.odds.gX && after.parlay['keep|me'],
    'removing a parlay disturbed the rest of the prop model state');
  chk(w.localStorage.getItem(BET_KEY) === betBlob(), 'removing a prop parlay touched the betting key');
  chk(d.querySelectorAll('.savedp').length === 2, 'the removed parlay is still on screen');

  // ---- C. removing the betting parlay keeps that app's other data ----
  d.querySelector('.savedp:not(.prop) [data-rm]').click();
  const b = JSON.parse(w.localStorage.getItem(BET_KEY));
  chk(Array.isArray(b.bank.build) && b.bank.build.length === 0, 'Remove did not take the betting parlay out');
  chk(b.myPicks.g1 === 'KC' && b.bets['2'].staked === 40 && b.bank.lastAmt === 20,
    'removing a betting parlay disturbed picks, bet log or bankroll');
  chk(d.querySelectorAll('.savedp').length === 1, 'the removed betting parlay is still on screen');

  // ---- D. Clear finished, once every game is final ----
  const f = await run({ state: 'post' });
  chk(!f.d.getElementById('clearDone').hidden, 'Clear finished should appear once the games are final');
  f.d.getElementById('clearDone').click();
  chk(f.d.querySelectorAll('.savedp').length === 0, 'Clear finished left parlays behind');
  chk(JSON.parse(f.w.localStorage.getItem(PROP_KEY)).saved.length === 0, 'Clear finished did not write the prop key');
  chk(JSON.parse(f.w.localStorage.getItem(BET_KEY)).bank.build.length === 0, 'Clear finished did not write the betting key');
  chk(JSON.parse(f.w.localStorage.getItem(BET_KEY)).myPicks.g1 === 'KC', 'Clear finished disturbed the betting picks');

  // ---- E. nothing saved in this browser ----
  const e = await run({ seed: () => {} });
  chk(/Nothing saved in this browser/.test(txt(e.d.getElementById('app'))), 'an empty browser is not explained');
  chk(/do not travel between devices/.test(txt(e.d.getElementById('app'))), 'the per-browser limit is not explained');

  // ---- F. the fetch is refused ----
  const c = await run({ mode: 'fail' });
  chk(/not loading/.test(txt(c.d.getElementById('app'))) && /HTTP 403/.test(txt(c.d.getElementById('app'))),
    'a refused fetch is not explained');
  chk(c.d.querySelectorAll('.savedp').length === 3, 'the parlays should still list when the scores cannot load');
  chk(c.d.querySelectorAll('[data-rm]').length === 3, 'Remove should still work when the scores cannot load');

  // ---- G. the day's order: earliest kickoff first, finished at the bottom ----
  {
    const nightLeg = Object.assign({}, leg('p9', 'Josh Allen', 'passing_yards', 250.5, 'over', true, 'Over 250.5 passing yards', 'BUF'),
      { key: `${GID2}|p9|passing_yards`, gid: GID2 });
    const seed = w => {
      w.localStorage.setItem(PROP_KEY, JSON.stringify({ saved: [
        { id: 'night', week: 2, stake: 10, price: 200, payout: 30, legs: [nightLeg] },
        { id: 'early', week: 2, stake: 10, price: 200, payout: 30, legs: [
          leg('p1', 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL')] }] }));
      w.localStorage.removeItem(BET_KEY);
    };
    const o = await run({ seed });
    const order = [...o.d.querySelectorAll('.savedp')].map(c => txt(c.querySelector('.sp-leg .nm')));
    chk(order.length === 2, `ordering: expected 2 parlays, got ${order.length}`);
    chk(/Bijan Robinson/.test(order[0]) && /Josh Allen/.test(order[1]),
      'the night game should sort below the early one, got: ' + order.join(' | '));

    /* the real case: two parlays both holding a one o'clock leg, one of them also holding a
       four o'clock leg. The one that cannot settle until later goes second, even though both
       start at the same time -- which sorting on the earliest kickoff would have got wrong. */
    const seed2 = w => {
      w.localStorage.setItem(PROP_KEY, JSON.stringify({ saved: [
        { id: 'spans', week: 2, stake: 10, price: 200, payout: 30, legs: [
          leg('pa', 'Alvin Kamara', 'rushing_yards', 40.5, 'over', true, 'Over 40.5 rushing yards', 'NO'),
          Object.assign({}, leg('pb', 'Early Guy', 'rushing_yards', 20.5, 'over', true, 'Over 20.5 rushing yards', 'ATL'), { gid: GID }) ] },
        { id: 'oneslot', week: 2, stake: 10, price: 200, payout: 30, legs: [
          leg('p1', 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL')] }] }));
      w.localStorage.removeItem(BET_KEY);
    };
    /* the four o'clock leg belongs to the late game */
    const fix = w => { seed2(w); const v = JSON.parse(w.localStorage.getItem(PROP_KEY));
      v.saved[0].legs[0].gid = GID3; w.localStorage.setItem(PROP_KEY, JSON.stringify(v)); };
    const o2 = await run({ seed: fix });
    const ord2 = [...o2.d.querySelectorAll('.savedp')].map(c => txt(c.querySelector('.sp-leg .nm')));
    chk(ord2.length === 2, `ordering: expected 2 parlays, got ${ord2.length}`);
    chk(/Bijan Robinson/.test(ord2[0]), 'the one o\'clock-only parlay should come first, got: ' + ord2.join(' | '));
    chk(/Kamara|Early Guy/.test(ord2[1]), 'the parlay carrying a four o\'clock leg should come second, got: ' + ord2.join(' | '));
    /* once the early one is final it drops to the bottom even though it kicked off first */
    const f = await run({ seed, state: 'post' });
    chk([...f.d.querySelectorAll('.savedp')].length === 2, 'ordering: parlays vanished when final');
  }

  // ---- H. parlays travel between devices in the link ----
  {
    const a = await run();
    let copied = null;
    a.w.navigator.clipboard = { writeText: t => { copied = t; return Promise.resolve(); } };
    a.d.getElementById('send').click();
    await new Promise(r => setTimeout(r, 60));
    chk(!!copied && copied.includes('#p='), 'Send did not produce a link with the parlays in it');
    const hash = copied.slice(copied.indexOf('#'));
    chk(/Link copied/.test(txt(a.d.querySelector('.note'))), 'Send did not say the link was ready');

    /* a clean device opens it */
    const b = await run({ seed: () => {}, hash });
    chk(b.d.querySelectorAll('.savedp').length === 3, `the link should carry 3 parlays, got ${b.d.querySelectorAll('.savedp').length}`);
    chk(/3 parlays added/.test(txt(b.d.querySelector('.note'))), 'the arrival was not announced');
    chk([...b.d.querySelectorAll('.pill')].some(x => /sent here/.test(x.textContent)), 'an imported parlay is not labelled');
    chk(!/#p=/.test(b.w.location.href), 'the link was left in the address bar');
    chk(!b.w.localStorage.getItem(PROP_KEY) && !b.w.localStorage.getItem(BET_KEY),
      'importing wrote into the two apps instead of this page\'s own key');
    chk(!!b.w.localStorage.getItem('live_parlays_v1'), 'the imported parlays were not stored');
    /* an imported parlay can be removed like any other */
    b.d.querySelector('[data-rm]').click();
    chk(b.d.querySelectorAll('.savedp').length === 2, 'an imported parlay could not be removed');

    /* opening the same link twice adds nothing */
    const c = await run({ seed: w => w.localStorage.setItem('live_parlays_v1', b.w.localStorage.getItem('live_parlays_v1')), hash });
    chk(/already here/.test(txt(c.d.querySelector('.note'))) || c.d.querySelectorAll('.savedp').length <= 3,
      'a repeated link duplicated the parlays');
    /* a mangled link says so rather than failing silently */
    const e2 = await run({ seed: () => {}, hash: '#p=notbase64!!' });
    chk(/could not be read|carried no parlays/.test(txt(e2.d.querySelector('.note')) || ''), 'a broken link is not explained');
  }

  // ---- I. a line that moved after the bet was placed ----
  {
    const a = await run();
    const row = [...a.d.querySelectorAll('.savedp.prop .sp-leg')][0];   /* Bijan, over 43.5, 86 so far */
    chk(/86 \/ 43\.5/.test(txt(row)) && /hit/.test(txt(row)), 'the starting row is not what the test expects: ' + txt(row));
    const btn = row.querySelector('[data-edit]');
    chk(!!btn, 'a player prop leg offers no way to correct its line');
    chk(!a.d.querySelector('.savedp:not(.prop) [data-edit]'), 'a moneyline leg should have no line to edit');
    btn.click();
    const inp = a.d.querySelector('.lineEdit input');
    chk(!!inp && inp.value === '43.5', 'the editor did not open prefilled with the current line');
    inp.value = '100';
    inp.dispatchEvent(new a.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    const after = txt([...a.d.querySelectorAll('.savedp.prop .sp-leg')][0]);
    chk(/86 \/ 100/.test(after), 'the corrected line is not what the leg is measured against: ' + after);
    chk(/14 to go/.test(after), 'the distance left was not recomputed on the new line: ' + after);
    chk(/moved from 43\.5/.test(after), 'the row does not say the line moved: ' + after);
    chk(/Over 100 rushing yards/.test(after) && !/Over 43\.5 rushing/.test(after),
      'the label still quotes the old line, contradicting the corrected one: ' + after);
    /* stored here, and nowhere else */
    const store = JSON.parse(a.w.localStorage.getItem('live_parlays_v1'));
    chk(store.lines && Object.values(store.lines)[0] === 100, 'the corrected line was not stored');
    chk(JSON.parse(a.w.localStorage.getItem(PROP_KEY)).saved[0].legs[0].k === 43.5,
      'correcting a line changed the parlay saved in the prop model');
    /* and it rides along when the parlay is sent to another device */
    let copied = null;
    a.w.navigator.clipboard = { writeText: t => { copied = t; return Promise.resolve(); } };
    a.d.getElementById('send').click();
    await new Promise(r => setTimeout(r, 60));
    const sent = JSON.parse(Buffer.from(copied.slice(copied.indexOf('#p=') + 3).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    chk(sent.some(x => x.legs.some(l => l.k === 100)), 'a sent parlay did not carry the corrected line');
    /* undo puts the model's own line back */
    a.d.querySelector('[data-reset]').click();
    await new Promise(r => setTimeout(r, 60));
    const undone = txt([...a.d.querySelectorAll('.savedp.prop .sp-leg')][0]);
    chk(/86 \/ 43\.5/.test(undone) && !/moved from/.test(undone), 'undo did not restore the original line: ' + undone);

    /* Escape leaves it alone */
    const b2 = await run();
    const row2 = [...b2.d.querySelectorAll('.savedp.prop .sp-leg')][0];
    row2.querySelector('[data-edit]').click();
    const inp2 = b2.d.querySelector('.lineEdit input');
    inp2.value = '999';
    inp2.dispatchEvent(new b2.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    chk(/86 \/ 43\.5/.test(txt([...b2.d.querySelectorAll('.savedp.prop .sp-leg')][0])), 'Escape saved the line anyway');
  }

  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f2 => console.log('  FAIL:', f2));
  process.exit(fails.length ? 1 : 0);
})();
