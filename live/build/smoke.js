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
/* a prop row is a bar now: the knob carries what he has, the label under the tick the line */
const knob = row => txt(row.querySelector('.knob'));
const lineAt = row => txt(row.querySelector('.lineLbl'));
const status = row => txt(row.querySelector('.status'));
const who = row => txt(row.querySelector('.who') || row.querySelector('.nm'));
const target = row => txt(row.querySelector('.tgt'));
/* Send copies a link when it is short enough to message and the code when it is not */
const codeOf = v => v.includes('#p=') ? v.slice(v.indexOf('#p=') + 3) : v;
const hashOf = v => '#p=' + codeOf(v);

const GID = '2026_02_CAR_ATL';          /* the early game */
const GID2 = '2026_02_KC_BUF';          /* the night game */
const EARLY = '2026-09-20T17:00Z', NIGHT = '2026-09-21T00:20Z';
const ev = (id, date, away, home, state, as, hs) => ({ id, date,
  competitions: [{ status: { type: { state, shortDetail: state === 'post' ? 'Final' : (state === 'pre' ? '1:00 PM ET' : 'Q3 7:12') } },
    /* before kickoff ESPN carries no score at all, which is the case worth testing */
    competitors: [{ homeAway: 'home', team: { abbreviation: home }, score: state === 'pre' ? undefined : String(hs) },
                  { homeAway: 'away', team: { abbreviation: away }, score: state === 'pre' ? undefined : String(as) }] }] });
const GID3 = '2026_02_NO_BAL';          /* the four o'clock game */
const LATE = '2026-09-20T20:25Z';
const sb = state => ({ events: [ev('401', EARLY, 'CAR', 'ATL', state, 17, 20),
                                 ev('403', LATE, 'NO', 'BAL', state, 10, 14),
                                 ev('402', NIGHT, 'KC', 'BUF', state, 7, 3)] });
const SUM = { boxscore: { players: [
  { team: { abbreviation: 'ATL' }, statistics: [
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Bijan Robinson' }, stats: ['17', '86', '5.1', '1', '22'] }] },
    /* Bijan runs and catches, so one player landing in two groups is covered */
    { name: 'receiving', labels: ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'], athletes: [
      { athlete: { displayName: 'Kyle Pitts' }, stats: ['2', '21', '10.5', '0', '12', '4'] },
      { athlete: { displayName: 'Bijan Robinson' }, stats: ['4', '31', '7.8', '0', '12', '5'] }] }] },
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

/* a stand-in for the repository: holds one file, and refuses a write without a token */
function makeGh(initial) {
  const store = { body: initial || null, sha: initial ? 'sha0' : null, writes: [], auth: [] };
  store.fn = (u, opt) => {
    const method = (opt && opt.method) || 'GET';
    const auth = (opt && opt.headers && opt.headers.Authorization) || '';
    store.auth.push(auth);
    if (method === 'GET') {
      if (!store.body) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      return Promise.resolve({ ok: true, status: 200, json: async () =>
        ({ sha: store.sha, content: Buffer.from(JSON.stringify(store.body)).toString('base64') }) });
    }
    if (!auth) return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
    const sent = JSON.parse(opt.body);
    store.body = JSON.parse(Buffer.from(sent.content, 'base64').toString('utf8'));
    store.sha = 'sha' + (store.writes.length + 1);
    store.writes.push(sent);
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ content: { sha: store.sha } }) });
  };
  return store;
}
function run({ seed = w => { w.localStorage.setItem(PROP_KEY, propBlob()); w.localStorage.setItem(BET_KEY, betBlob()); },
               mode = 'ok', state = 'in', hash = '', gh = () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) }) } = {}) {
  return new Promise(resolve => {
    const calls = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: URL_ + hash,
      beforeParse(w) {
        w.confirm = () => true; w.alert = () => {};
        w.fetch = (u, opt) => { calls.push(String(u) + (opt && opt.method ? ' ' + opt.method : ''));
          const s = String(u);
          if (s.includes('api.github.com')) return gh(s, opt);
          return mode === 'fail'
            ? Promise.resolve({ ok: false, status: 403 })
            : Promise.resolve({ ok: true, status: 200, json: async () => s.includes('/summary?') ? SUM : sb(state) }); };
        try { seed(w); } catch (e) {}
      } });
    const w = dom.window;
    try { seed(w); } catch (e) {}
    if (typeof w.refresh === 'function') w.refresh();
    setTimeout(() => resolve({ w, d: w.document, calls }), 700);
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
  const rows = [...d.querySelector('.savedp.prop').querySelectorAll('.sp-leg')];
  chk(rows.length === 3, `the first prop parlay should show 3 legs, showed ${rows.length}`);
  chk(knob(rows[0]) === '86' && lineAt(rows[0]) === '43.5' && status(rows[0]) === 'hit',
    'an over that cleared is not shown as hit on the bar: ' + txt(rows[0]));
  chk(target(rows[0]) === '43.5+', 'an over does not read as a target to beat: ' + target(rows[0]));
  chk(knob(rows[1]) === '31' && lineAt(rows[1]) === '54.5' && /to spare/.test(status(rows[1])),
    'a live under does not show its room: ' + txt(rows[1]));
  chk(target(rows[1]) === 'under 54.5', 'an under does not read as an under: ' + target(rows[1]));
  chk(knob(rows[2]) === '2' && lineAt(rows[2]) === '3' && status(rows[2]) === '1 to go',
    'a rung does not show what is left: ' + txt(rows[2]));
  chk(who(rows[0]) === 'Bijan Robinson Rushing Yards', 'the row does not name the man and the stat: ' + who(rows[0]));
  /* the bar has to be filled in proportion, with the tick where the line is */
  { const fill = rows[0].querySelector('.fill'), tick = rows[0].querySelector('.tick');
    chk(/width:\s*100/.test(fill.getAttribute('style')), 'a cleared over should fill the bar: ' + fill.getAttribute('style'));
    chk(/left:\s*80/.test(tick.getAttribute('style')), 'the tick should sit at the line, a quarter short of the end: ' + tick.getAttribute('style'));
    const half = rows[1].querySelector('.fill');
    chk(/width:\s*45\.50/.test(half.getAttribute('style')), '31 of 54.5, on a bar a quarter past the line, is 45.5%: ' + half.getAttribute('style')); }
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
    const order = [...o.d.querySelectorAll('.savedp')].map(c => who(c.querySelector('.sp-leg')));
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
    const ord2 = [...o2.d.querySelectorAll('.savedp')].map(c => who(c.querySelector('.sp-leg')));
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
    chk(!!copied, 'Send copied nothing at all');
    chk(!!a.d.querySelector('.shareBox'), 'Send offered neither a link nor a code to copy');
    /* Send all copies the code once the link is too long to message, so accept either */
    const hash = hashOf(copied);
    chk(/(Link|Code) copied/.test(txt(a.d.querySelector('.note'))), 'Send did not say what was copied');

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
    chk(knob(row) === '86' && lineAt(row) === '43.5' && status(row) === 'hit',
      'the starting row is not what the test expects: ' + txt(row));
    const btn = row.querySelector('[data-edit]');
    chk(!!btn, 'a player prop leg offers no way to correct its line');
    chk(!a.d.querySelector('.savedp:not(.prop) [data-edit]'), 'a moneyline leg should have no line to edit');
    btn.click();
    const inp = a.d.querySelector('.lineInput');
    chk(!!inp && inp.value === '43.5', 'the editor did not open prefilled with the current line');
    inp.value = '100';
    inp.dispatchEvent(new a.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    const rowAfter = [...a.d.querySelectorAll('.savedp.prop .sp-leg')][0];
    chk(knob(rowAfter) === '86' && lineAt(rowAfter) === '100',
      'the corrected line is not what the leg is measured against: ' + txt(rowAfter));
    chk(status(rowAfter) === '14 to go', 'the distance left was not recomputed on the new line: ' + status(rowAfter));
    chk(target(rowAfter) === '100+', 'the heading still quotes the old line: ' + target(rowAfter));
    chk(/moved from 43\.5/.test(txt(rowAfter)), 'the row does not say the line moved: ' + txt(rowAfter));
    chk(/width:\s*68\.8/.test(rowAfter.querySelector('.fill').getAttribute('style')),
      'the bar was not refilled against the corrected line');
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
    const sent = JSON.parse(Buffer.from(codeOf(copied).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    chk(Array.isArray(sent.g) && Array.isArray(sent.p), 'the packed form is not the compact one');
    chk(sent.p.some(x => (x.l || []).some(l => l.n === 100)), 'a sent parlay did not carry the corrected line');
    chk(!JSON.stringify(sent).includes('rushing_yards'), 'stat names are still travelling in full');
    chk(sent.g.length === 1 && sent.g[0] === GID, 'games are not listed once and referenced');
    /* undo puts the model's own line back */
    a.d.querySelector('[data-reset]').click();
    await new Promise(r => setTimeout(r, 60));
    const undone = [...a.d.querySelectorAll('.savedp.prop .sp-leg')][0];
    chk(lineAt(undone) === '43.5' && !/moved from/.test(txt(undone)), 'undo did not restore the original line: ' + txt(undone));

    /* Escape leaves it alone */
    const b2 = await run();
    const row2 = [...b2.d.querySelectorAll('.savedp.prop .sp-leg')][0];
    row2.querySelector('[data-edit]').click();
    const inp2 = b2.d.querySelector('.lineInput');
    inp2.value = '999';
    inp2.dispatchEvent(new b2.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    chk(lineAt([...b2.d.querySelectorAll('.savedp.prop .sp-leg')][0]) === '43.5', 'Escape saved the line anyway');
  }

  // ---- J. light on ESPN: off by default, and nothing fetched twice for nothing ----
  {
    const a = await run();
    chk(a.d.getElementById('every').value === '0', 'auto-refresh should start off');
    chk(/off/.test(txt(a.d.querySelector('#every option[selected]')) || a.d.getElementById('every').value),
      'the off option is not the selected one');
    chk(a.calls.length > 0, 'the page should still fetch once when it opens');
    /* with auto off, coming back to the tab must not fetch */
    const before = a.calls.length;
    a.d.dispatchEvent(new a.w.Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 80));
    chk(a.calls.length === before, 'returning to the tab fetched even with auto-refresh off');
    /* pressing Refresh now does fetch */
    a.d.getElementById('now').click();
    await new Promise(r => setTimeout(r, 200));
    chk(a.calls.length > before, 'Refresh now did not fetch');

    /* a finished game's box score is fetched once and kept */
    const f = await run({ state: 'post' });
    const sums = () => f.calls.filter(u => u.includes('/summary?')).length;
    const first = sums();
    chk(first > 0, 'no box score was fetched at all');
    await f.w.refresh();
    await new Promise(r => setTimeout(r, 200));
    chk(sums() === first, `a finished game's box score was fetched again (${first} -> ${sums()})`);
  }

  // ---- K. the score and the whole stat line, not just the number being bet ----
  {
    const a = await run();
    const card = a.d.querySelector('.savedp.prop');
    const strip = txt(card.querySelector('.games'));
    chk(!!card.querySelector('.games'), 'a parlay on player props shows no score at all');
    chk(/CAR 17.20 ATL/.test(strip), 'the score strip does not carry the score: ' + strip);
    chk(/Q3 7:12/.test(strip), 'the score strip does not carry the clock: ' + strip);
    chk(!!card.querySelector('.gm.on'), 'a game in progress is not marked live on the strip');

    /* Bijan both runs and catches in the fixture, so both lines have to show */
    const bijan = [...card.querySelectorAll('.sp-leg')].find(r => /Bijan/.test(who(r)));
    const sl = txt(bijan.querySelector('.statline'));
    chk(!!sl, 'a player leg shows no stat line');
    chk(/17 car, 86 rush yds/.test(sl), 'the rushing line is missing or wrong: ' + sl);
    chk(/4 rec, 31 rec yds on 5/.test(sl), 'the receiving line is missing or wrong: ' + sl);
    chk(/1 TD/.test(sl), 'the touchdown is missing: ' + sl);

    /* a quarterback reads as a quarterback */
    const qbSum = { boxscore: { players: [{ team: { abbreviation: 'ATL' }, statistics: [
      { name: 'passing', labels: ['C/ATT', 'YDS', 'AVG', 'TD', 'INT'], athletes: [{ athlete: { displayName: 'Michael Penix Jr.' }, stats: ['18/27', '241', '8.9', '2', '1'] }] }] }] } };
    const st = a.w.espnStats(qbSum, 'ATL', 'Michael Penix');
    chk(/18\/27, 241 pass yds, 2 TD, 1 INT/.test(a.w.statLine(st)), 'a passing line does not read right: ' + a.w.statLine(st));
    chk(a.w.statLine(null) === '', 'a player with no stats should produce no line');

    /* the betting parlay's games get a strip too */
    chk(!!a.d.querySelector('.savedp:not(.prop) .games'), 'a team-bet parlay shows no score strip');
  }

  // ---- L. nought is a number: before kickoff, and for a man not yet in the box score ----
  {
    const b4 = await run({ state: 'pre' });
    const strip = txt(b4.d.querySelector('.savedp.prop .games'));
    chk(/CAR 0.0 ATL/.test(strip), 'before kickoff the strip should read 0\u20130, got: ' + strip);
    chk(/1:00 PM ET/.test(strip), 'the kickoff time is missing from the strip: ' + strip);
    const first = [...b4.d.querySelectorAll('.savedp.prop .sp-leg')][0];
    chk(knob(first) === '0' && lineAt(first) === '43.5', 'before kickoff a leg should read 0 against its line, got: ' + txt(first));
    chk(/1:00 PM ET/.test(status(first)), 'before kickoff the row should carry the kick time, got: ' + status(first));
    chk(/0 car, 0 rush yds/.test(txt(first)), 'before kickoff the stat line should be zeros, got: ' + txt(first));
    chk(!/not started|no box score/.test(txt(first)), 'a blank is still being shown instead of zeros: ' + txt(first));
    chk(/width:\s*0/.test(first.querySelector('.fill').getAttribute('style')), 'an empty bar should be empty');

    /* a player the box score has not mentioned yet has nought, not nothing */
    const seed = w => w.localStorage.setItem(PROP_KEY, JSON.stringify({ saved: [
      { id: 'ghost', week: 2, stake: 10, price: 200, payout: 30, legs: [
        leg('pz', 'Nobody Played', 'receiving_yards', 30.5, 'over', true, 'Over 30.5 receiving yards', 'ATL')] }] }));
    const g = await run({ seed });
    const row = g.d.querySelector('.savedp .sp-leg');
    chk(knob(row) === '0' && lineAt(row) === '30.5', 'a man missing from the box score should read 0, got: ' + txt(row));
    chk(/0 rec, 0 rec yds/.test(txt(row)), 'a man missing from the box score should show a zeroed line, got: ' + txt(row));

    /* the line number is the control now; there is no second button repeating it */
    const a = await run();
    chk(!a.d.querySelector('.lineBtn'), 'the old line button is still there');
    chk(!!a.d.querySelector('.ln.edit[data-edit]'), 'the line number is not the thing you tap');
    const ln = a.d.querySelector('.savedp.prop .ln.edit');
    chk(ln.getAttribute('role') === 'button' && ln.getAttribute('tabindex') === '0',
      'the line number is not reachable from the keyboard');
    ln.click();
    chk(!!a.d.querySelector('.lineInput'), 'tapping the line number did not open the editor');
  }

  // ---- M. the link has to survive being messaged ----
  {
    const seed = w => w.localStorage.setItem(PROP_KEY, JSON.stringify({ saved: [
      { id: 'big', week: 2, stake: 20, price: 580, payout: 136, legs: [
        leg('p1', 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL'),
        leg('p2', 'Travis Kelce', 'receiving_yards', 43.5, 'over', true, 'Over 43.5 receiving yards', 'ATL'),
        leg('p3', 'Michael Penix Jr.', 'passing_yards', 225.5, 'over', true, 'Over 225.5 passing yards', 'ATL'),
        leg('p4', 'Derrick Henry', 'rushing_yards', 70.5, 'over', true, 'Over 70.5 rushing yards', 'BAL')] }] }));
    const a = await run({ seed });
    let copied = null;
    a.w.navigator.clipboard = { writeText: t2 => { copied = t2; return Promise.resolve(); } };
    a.d.getElementById('send').click();
    await new Promise(r => setTimeout(r, 80));
    /* iMessage cut a 993-character link in half. A four-leg parlay must stay far under that. */
    chk(copied.length < 600, `a four-leg link is ${copied.length} chars, which is too long to message`);

    /* the code alone, pasted on the other device, has to work as well as the link */
    const code = codeOf(copied);
    const b = await run({ seed: () => {} });
    b.w.prompt = () => code;
    b.w.navigator.clipboard = { readText: () => Promise.resolve('') };
    b.d.getElementById('paste').click();
    await new Promise(r => setTimeout(r, 120));
    chk(b.d.querySelectorAll('.savedp').length === 1, 'pasting a code did not bring the parlay across');
    chk([...b.d.querySelectorAll('.sp-leg')].length === 4, 'the pasted parlay lost legs');
    chk(who(b.d.querySelector('.sp-leg')) === 'Bijan Robinson Rushing Yards', 'a pasted leg lost its man or its stat');

    /* a whole link pasted in works too, and rubbish says so */
    const c = await run({ seed: () => {} });
    c.w.prompt = () => copied;
    c.w.navigator.clipboard = { readText: () => Promise.resolve('') };
    c.d.getElementById('paste').click();
    await new Promise(r => setTimeout(r, 120));
    chk(c.d.querySelectorAll('.savedp').length === 1, 'pasting the whole link did not work');

    const e2 = await run({ seed: () => {} });
    e2.w.prompt = () => 'hello there';
    e2.w.navigator.clipboard = { readText: () => Promise.resolve('') };
    e2.d.getElementById('paste').click();
    await new Promise(r => setTimeout(r, 120));
    chk(/does not look like|could not be read/.test(txt(e2.d.querySelector('.note')) || ''),
      'rubbish pasted in is not explained');
  }

  // ---- N. one parlay at a time, and the code when a link will not carry it ----
  {
    /* a full slate: this is what broke -- Send packed every parlay into one URL */
    const many = [];
    for (let n = 0; n < 6; n++) many.push({ id: 'p' + n, week: 2, stake: 10, price: 300, payout: 40, legs: [
      leg('a' + n, 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL'),
      leg('b' + n, 'Travis Kelce', 'receiving_yards', 43.5, 'over', true, 'Over 43.5 receiving yards', 'ATL'),
      leg('c' + n, 'Chuba Hubbard', 'rushing_yards', 54.5, 'under', true, 'Under 54.5 rushing yards', 'CAR')] });
    const seed = w => { w.localStorage.setItem(PROP_KEY, JSON.stringify({ saved: many })); w.localStorage.removeItem(BET_KEY); };
    const a = await run({ seed });
    chk(a.d.querySelectorAll('[data-send]').length === 6, 'every parlay should have its own Send');

    /* one parlay on its own has to be short enough to travel as a link */
    let copied = null;
    a.w.navigator.clipboard = { writeText: v => { copied = v; return Promise.resolve(); } };
    a.d.querySelector('[data-send]').click();
    await new Promise(r => setTimeout(r, 80));
    chk(copied.includes('#p='), 'one parlay should still be sendable as a link, got a code');
    chk(copied.length < 500, `one parlay is ${copied.length} chars, too long for a link`);
    chk(/Link copied/.test(txt(a.d.querySelector('.note'))), 'sending one parlay did not offer a link');

    /* and it carries only that parlay */
    const b = await run({ seed: () => {}, hash: hashOf(copied) });
    chk(b.d.querySelectorAll('.savedp').length === 1, 'sending one parlay brought more than one across');

    /* everything at once is too long, so the code is what gets copied */
    const c = await run({ seed });
    let got = null;
    c.w.navigator.clipboard = { writeText: v => { got = v; return Promise.resolve(); } };
    c.d.getElementById('send').click();
    await new Promise(r => setTimeout(r, 80));
    chk(!got.includes('#p='), 'a link too long to message was still the thing copied');
    chk(/Code copied/.test(txt(c.d.querySelector('.note'))), 'the reader is not told the code was copied');
    chk(/cuts a long link in half/.test(txt(c.d.querySelector('.note'))), 'the reason is not explained');
    /* the code still works, which is the whole point of falling back to it */
    const e2 = await run({ seed: () => {} });
    e2.w.prompt = () => got;
    e2.w.navigator.clipboard = { readText: () => Promise.resolve('') };
    e2.d.getElementById('paste').click();
    await new Promise(r => setTimeout(r, 140));
    chk(e2.d.querySelectorAll('.savedp').length === 6, 'the code did not carry every parlay across');
  }

  // ---- O. the copy kept in the repository ----
  {
    const seedOne = w => { w.localStorage.setItem(PROP_KEY, JSON.stringify({ saved: [
      { id: 'sp1', week: 2, stake: 20, price: 580, payout: 136, legs: [
        leg('p1', 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL')] }] }));
      w.localStorage.removeItem(BET_KEY); };

    /* saving without a token asks for one, and nothing is written if none is given */
    const noTok = makeGh(null);
    const a = await run({ seed: seedOne, gh: noTok.fn });
    a.w.prompt = () => '';
    a.d.getElementById('ghSave').click();
    await new Promise(r => setTimeout(r, 120));
    chk(noTok.writes.length === 0, 'a save went ahead without a token');

    /* with a token it writes, to the data branch, and the token never reaches the file */
    const store = makeGh(null);
    const b = await run({ seed: seedOne, gh: store.fn });
    b.w.prompt = () => 'ghp_pretendtoken';
    b.d.getElementById('ghSave').click();
    await new Promise(r => setTimeout(r, 160));
    chk(store.writes.length === 1, 'nothing was written to the repository');
    const sent = store.writes[0];
    chk(sent.branch === 'parlay-data', `saved to the wrong branch: ${sent.branch}`);
    chk(!/ghp_|token/i.test(JSON.stringify(store.body)), 'the token reached the saved file');
    chk(JSON.stringify(store.body).includes('Bijan Robinson'), 'the parlay did not reach the saved file');
    chk(/Saved 1 parlay/.test(txt(b.d.querySelector('.note'))), 'the save was not confirmed on screen');
    chk(b.w.localStorage.getItem('live_gh_token') === 'ghp_pretendtoken', 'the token was not kept for next time');

    /* another device, no token, reads it on open */
    const c = await run({ seed: () => {}, gh: store.fn });
    await new Promise(r => setTimeout(r, 200));
    chk(c.d.querySelectorAll('.savedp').length === 1, 'a second device did not pick up the saved parlay');
    chk(who(c.d.querySelector('.sp-leg')) === 'Bijan Robinson Rushing Yards', 'the parlay came back wrong');
    chk([...c.d.querySelectorAll('.pill')].some(x => /from GitHub/.test(x.textContent)), 'a parlay from the repository is not labelled');
    chk(!c.w.localStorage.getItem('live_gh_token'), 'the reading device was made to hold a token');
    chk(store.auth.some(x => !x), 'the read was not attempted without a token');

    /* the device that made it does not show it twice */
    const d2 = await run({ seed: seedOne, gh: store.fn });
    await new Promise(r => setTimeout(r, 200));
    chk(d2.d.querySelectorAll('.savedp').length === 1, 'the saving device sees its own parlay twice');

    /* a refused token is reported rather than swallowed */
    const bad = makeGh(null);
    bad.fn = (u, opt) => ((opt && opt.method) === 'PUT'
      ? Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
      : Promise.resolve({ ok: false, status: 404, json: async () => ({}) }));
    const e3 = await run({ seed: seedOne, gh: bad.fn });
    e3.w.prompt = () => 'ghp_wrong';
    e3.d.getElementById('ghSave').click();
    await new Promise(r => setTimeout(r, 160));
    chk(/refused the token/.test(txt(e3.d.querySelector('.note'))), 'a refused token is not explained');

    /* and the token can be forgotten */
    const f2 = await run({ seed: seedOne, gh: store.fn });
    f2.w.localStorage.setItem('live_gh_token', 'ghp_x');
    f2.w.confirm = () => true;
    f2.w.draw();
    f2.d.getElementById('ghForget').click();
    chk(!f2.w.localStorage.getItem('live_gh_token'), 'the token could not be forgotten');
  }

  // ---- P. the page says where the shared copy stands ----
  {
    const seedOne = w => { w.localStorage.setItem(PROP_KEY, JSON.stringify({ saved: [
      { id: 'sp1', week: 2, stake: 20, price: 580, payout: 136, legs: [
        leg('p1', 'Bijan Robinson', 'rushing_yards', 43.5, 'over', true, 'Over 43.5 rushing yards', 'ATL')] }] }));
      w.localStorage.removeItem(BET_KEY); };

    /* the file exists but is empty, which is exactly what went wrong: nothing had been saved */
    const empty = makeGh({ v: 1, updated: null, g: [], p: [] });
    const a = await run({ seed: seedOne, gh: empty.fn });
    await new Promise(r => setTimeout(r, 200));
    chk(/nothing saved yet/.test(txt(a.d.getElementById('ghState'))),
      'a device with parlays does not say they are unsaved: ' + txt(a.d.getElementById('ghState')));

    /* a second device with nothing of its own is told where to go */
    const b = await run({ seed: () => {}, gh: empty.fn });
    await new Promise(r => setTimeout(r, 200));
    chk(/Nothing has been saved to GitHub yet/.test(txt(b.d.getElementById('app'))),
      'an empty device does not explain that the other one has to save first');

    /* once something is saved, both say so */
    const store = makeGh(null);
    const c = await run({ seed: seedOne, gh: store.fn });
    c.w.prompt = () => 'ghp_pretendtoken';
    c.d.getElementById('ghSave').click();
    await new Promise(r => setTimeout(r, 200));
    chk(/GitHub: 1 parlay, saved/.test(txt(c.d.getElementById('ghState'))),
      'after a save the bar does not say so: ' + txt(c.d.getElementById('ghState')));
    const d3 = await run({ seed: () => {}, gh: store.fn });
    await new Promise(r => setTimeout(r, 200));
    chk(/GitHub: 1 parlay/.test(txt(d3.d.getElementById('ghState'))),
      'a second device does not report what it loaded: ' + txt(d3.d.getElementById('ghState')));
  }

  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f2 => console.log('  FAIL:', f2));
  process.exit(fails.length ? 1 : 0);
})();
