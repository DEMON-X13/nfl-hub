/* Check the X Parlays section of the built Bets and Stats page.
 *
 *   node nflbets/build/smoke_live.js        (from the hub root)
 *
 * The section reads liveparlays/parlays.json, the scoreboard, and the prop and betting models
 * in the page around it, and draws one list, X Parlays (the owner's, the same on every device).
 * A visitor has no list of their own: their Parlay Builder finishes a parlay as a card to
 * download (nflbets/build/card.html), saved nowhere. The test boots the whole page against a
 * stubbed file and a stubbed ESPN, with the real payload and state, opens the X Parlays tab and
 * checks what the section renders, three ways: with no store (sync.json does not answer: X
 * Parlays is the file, read only, and nothing the browser holds is drawn), on the owner's device
 * (a stubbed store, the smoke's own owner secret in the browser: everything is X's, with every
 * control), and on a visitor's device (the store holds X's document; X Parlays shows it read
 * only). Section J is the card: Finish, the window, the image (a canvas stubbed with a recorder,
 * since jsdom draws nothing), and that finishing writes nothing anywhere. jsdom and PapaParse are
 * borrowed from props/build; run npm ci there first.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
const HTML = fs.readFileSync(path.join(ROOT, 'nflbets', 'index.html'), 'utf8');
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const STATE = fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8');
const URL_ = 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay';
/* a store for the owner's and a visitor's runs: the sync layer's node at STORE (rev and doc), and
   the owner link checked against the smoke's own secret (the site's real one is not in the repository) */
const STORE = 'https://store.test/nflhub', SECRET = 'smoke-live-owner-secret';
const HASH = require('crypto').createHash('sha256').update(SECRET).digest('hex');
const WEBCRYPTO = require('crypto').webcrypto, { TextEncoder: NodeTextEncoder } = require('util');
const nodeOf = doc => { const rev = 'r-' + Math.random().toString(36).slice(2, 8), at = new Date().toISOString(); return { rev, at, doc: { rev, at, revs: [rev], json: JSON.stringify(doc) } }; };

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
/* how the smoke ends, whichever way: the count, every failure, an exit code. A mistake in the
   smoke's own code stops it here with the stack (the .catch at the bottom), and a run still
   going after ten minutes (it takes about one) stops with what it has, so it never waits on
   the windows it left open */
let ended = false;
function finish(why) {
  if (ended) return; ended = true;
  if (why) { checks++; fails.push(why); }
  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
}
const SMOKE_LIMIT_MS = 10 * 60 * 1000;
setTimeout(() => finish(`the smoke did not finish in ${Math.round(SMOKE_LIMIT_MS / 1000)} s: stopped with what it had`), SMOKE_LIMIT_MS).unref();
/* nor does it pass by running out of things to wait on: with no window left open, a body stuck
   on a promise nothing will settle would end Node with exit 0 and no count */
process.on('beforeExit', () => finish('the smoke stopped before it finished: its body was waiting on something nothing would settle'));
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const knob = row => txt(row.querySelector('.knob'));
const lineAt = row => txt(row.querySelector('.lineLbl'));
const status = row => txt(row.querySelector('.status'));
const who = row => txt(row.querySelector('.who'));
const target = row => txt(row.querySelector('.tgt'));
const wait = ms => new Promise(r => setTimeout(r, ms));
/* jsdom draws nothing, so the card's image is checked on a recorder: a canvas whose 2D context
   keeps every piece of text drawn on it, a toBlob that hands back a blob of the type asked for, a
   blob address, and a download that is an anchor clicked, recorded */
function stubDraw(w) {
  const rec = { texts: [], canvases: [], blobs: [], clicks: [], urls: [] };
  w.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null;
    rec.canvases.push(this);
    const st = { font: '10px sans-serif' };
    return new Proxy(st, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'measureText') return x => ({ width: String(x).length * (parseFloat((String(t.font).match(/([\d.]+)px/) || [])[1]) || 10) * 0.55 });
        if (k === 'fillText') return x => { rec.texts.push(String(x)); };
        if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
        return () => {};
      },
      set(t, k, v) { t[k] = v; return true; } });
  };
  w.HTMLCanvasElement.prototype.toBlob = function (cb, type) { const b = new w.Blob(['\x89PNG'], { type: type || 'image/png' }); rec.blobs.push(b); setTimeout(() => cb(b), 0); };
  w.URL.createObjectURL = b => { rec.urls.push(b); return 'blob:https://demon-x13.github.io/card'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { rec.clicks.push({ href: this.href, download: this.download, attached: this.isConnected }); };
  return rec;
}

const EARLY = '2026-09-20T17:00Z', LATE = '2026-09-20T20:25Z';
const ev = (id, date, away, home, state, as, hs) => ({ id, date,
  competitions: [{ status: { type: { state, shortDetail: state === 'post' ? 'Final' : (state === 'pre' ? '1:00 PM ET' : 'Q3 7:12') } },
    competitors: [{ homeAway: 'home', team: { abbreviation: home }, score: state === 'pre' ? undefined : String(hs) },
                  { homeAway: 'away', team: { abbreviation: away }, score: state === 'pre' ? undefined : String(as) }] }] });
const sb = state => ({ events: [ev('401', EARLY, 'CAR', 'ATL', state, 17, 20),
                                 ev('403', LATE, 'NO', 'BAL', state, 10, 14)] });
const SUM = { boxscore: { players: [
  { team: { abbreviation: 'ATL' }, statistics: [
    { name: 'passing', labels: ['C/ATT', 'YDS', 'AVG', 'TD', 'INT'], athletes: [{ athlete: { displayName: 'Michael Penix Jr.' }, stats: ['18/27', '241', '8.9', '2', '1'] }] },
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Bijan Robinson' }, stats: ['17', '86', '5.1', '1', '22'] }] },
    { name: 'receiving', labels: ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'], athletes: [
      { athlete: { displayName: 'Kyle Pitts' }, stats: ['2', '21', '10.5', '0', '12', '4'] },
      { athlete: { displayName: 'Bijan Robinson' }, stats: ['4', '31', '7.8', '0', '12', '5'] }] }] },
  { team: { abbreviation: 'CAR' }, statistics: [
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Chuba Hubbard' }, stats: ['12', '31', '2.6', '0', '9'] }] }] }] } };

const legF = (game, player, team, stat, line, side, main) => ({ game, player, team, stat, line, side, main });
const FILE = {
  updated: '2026-09-20T17:30:00Z',
  games: ['2026_02_CAR_ATL', '2026_02_NO_BAL'],
  parlays: [
    { id: 'night', week: 2, stake: 10, price: 200, payout: 30, legs: [
      legF(1, 'Derrick Henry', 'BAL', 'rushing_yards', 70.5, 'over', true)] },
    { id: 'early', week: 2, stake: 20, price: 580, payout: 136, note: 'sunday', legs: [
      legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true),
      legF(0, 'Chuba Hubbard', 'CAR', 'rushing_yards', 54.5, 'under', true),
      legF(0, 'Kyle Pitts', 'ATL', 'receptions', 3, 'over', false),
      legF(0, 'Michael Penix Jr.', 'ATL', 'passing_yards', 225.5, 'over', true)] }] };

/* the prop model's own key, from part2, as the build hands it to the page */
const PART2_SEASON = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=(\d{4}), KEY='([^']+)';/);
const PROP_KEY = PART2_SEASON[2], SEA = +PART2_SEASON[1], BET_KEY = 'x_nfl_viewer_picks_2026';
/* the two models' own storage, written exactly as they write it */
const propBlob = () => JSON.stringify({ stake: 55, saved: [
  { id: 'mine', week: 2, stake: 15, price: 250, payout: 52, legs: [
    { gid: '2026_02_CAR_ATL', stat: 'receiving_yards', k: 20.5, side: 'over', main: true,
      name: 'Kyle Pitts', team: 'ATL', label: 'Over 20.5 receiving yards', week: 2 }] }] });
/* a parlay built but not saved: the prop model will not let it be locked without a price,
   so this is what a bet parlay usually looks like in storage on a Sunday */
/* the builder legs sit on a week that cannot have kicked off: the prop model drops a working leg
   whose game has started, which every real week-2 game has by now */
const workBlob = () => JSON.stringify({ stake: 40, saved: [], parlay: {
  '2026_02_CAR_ATL|bij|rushing_yards': { gid: '2026_18_CAR_ATL', pid: 'bij', stat: 'rushing_yards',
    k: 43.5, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 },
  '2026_02_NO_BAL|hen|rushing_yards': { gid: '2026_18_NO_BAL', pid: 'hen', stat: 'rushing_yards',
    k: 70.5, side: 'over', main: true, name: 'Derrick Henry', team: 'BAL', week: 2 } } });
const betBlob = () => JSON.stringify({ myPicks: {}, bets: {}, bank: { build: [
  { id: 'bb1', week: 2, type: 'parlay', stake: 25, legs: [
    { game_id: '2026_02_CAR_ATL', away: 'CAR', home: 'ATL', pick: 'ATL', ml: -150 },
    { game_id: '2026_02_NO_BAL', away: 'NO', home: 'BAL', pick: 'BAL', ml: 130 }] }] } });

/* role: 'local' (sync.json does not answer), 'owner' (a store, and the owner's secret in this
   browser) or 'reader' (a store holding doc, and no secret). store: a store from an earlier run,
   so two runs are two visits to one store. holdConf: sync.json does not answer until the run's
   release() is called */
function run({ file = FILE, state = 'in', espn = 'ok', data = 'ok', seed = () => {}, pay = x => x, role = 'local', doc = null, store: shared = null, holdConf = false } = {}) {
  let release = () => {};
  const gate = holdConf ? new Promise(r => { release = r; }) : null;
  return new Promise(resolve => {
    const calls = [], store = shared || { node: doc ? nodeOf(doc) : null, writes: 0 };
    const res = (status, body) => Promise.resolve({ ok: status < 300, status, json: async () => body });
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: URL_,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        Object.defineProperty(w, 'crypto', { value: WEBCRYPTO, configurable: true }); w.TextEncoder = NodeTextEncoder;
        if (role === 'owner') w.localStorage.setItem('nflowner_v1', SECRET);
        try { seed(w); } catch (e) {}
        w.fetch = (u, o) => { const s = String(u); calls.push(s);
          if (/(^|\/)sync\.json/.test(s)) { const conf = () => role === 'local' ? res(404, null) : res(200, { url: STORE, ownerHash: HASH });
            return gate ? gate.then(conf) : conf(); }
          if (s.startsWith('https://store.test/')) {
            if (o && o.method && o.method !== 'GET') { store.writes++; if (s.startsWith(STORE + '.json')) store.node = JSON.parse(o.body); return res(200, null); }
            const p = s.replace(/\?.*$/, '');
            if (p === STORE + '/rev.json') return res(200, store.node ? store.node.rev : null);
            if (p === STORE + '/doc.json') return res(200, store.node ? store.node.doc : null);
            return res(200, null); }
          if (s.includes('parlays.json')) return data === 'ok'
            ? Promise.resolve({ ok: true, status: 200, json: async () => file })
            : Promise.resolve({ ok: false, status: 404 });
          /* the page around the section: its own season and the betting model's */
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => pay(JSON.parse(PAYLOAD)) });
          if (s.includes('state.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(STATE) });
          if (!/espn\.com/.test(s)) return Promise.resolve({ ok: false, status: 404 });
          return espn === 'ok'
            ? Promise.resolve({ ok: true, status: 200, json: async () => s.includes('/summary?') ? SUM : sb(state) })
            : Promise.resolve({ ok: false, status: 403 });
        };
        /* the section draws once the prop model is up and its builder has been drawn */
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, calls, store, release }), 400));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, calls, store, timedOut: true }), 20000);
  });
}

(async () => {
  // ---- A. the file is the page ----
  const { w, d, calls } = await run();
  chk(calls.some(u => /parlays\.json/.test(u)), 'the page never read the parlay file');
  chk(d.querySelectorAll('.savedp').length === 2, `expected 2 parlays from the file, got ${d.querySelectorAll('.savedp').length}`);
  const cards = [...d.querySelectorAll('.savedp')];
  const rows = [...cards[0].querySelectorAll('.sp-leg')];
  chk(rows.length === 4, `the early parlay should show 4 legs, showed ${rows.length}`);
  chk(knob(rows[0]) === '86' && lineAt(rows[0]) === '43.5' && status(rows[0]) === 'hit',
    'an over that cleared is wrong: ' + txt(rows[0]));
  chk(target(rows[0]) === '43.5+', 'an over does not read as a target: ' + target(rows[0]));
  chk(knob(rows[1]) === '31' && /to spare/.test(status(rows[1])), 'a live under is wrong: ' + txt(rows[1]));
  chk(target(rows[1]) === 'under 54.5', 'an under does not read as an under: ' + target(rows[1]));
  chk(knob(rows[2]) === '2' && lineAt(rows[2]) === '3' && status(rows[2]) === '1 to go', 'a rung is wrong: ' + txt(rows[2]));
  chk(who(rows[0]) === 'Bijan Robinson Rushing Yards', 'the row does not name the man and the stat: ' + who(rows[0]));
  chk(/17 car, 86 rush yds/.test(txt(rows[0])) && /4 rec, 31 rec yds on 5/.test(txt(rows[0])),
    'a player in two groups does not show both lines: ' + txt(rows[0]));
  chk(/18\/27, 241 pass yds, 2 TD, 1 INT/.test(txt(rows[3])), 'a passing line is wrong: ' + txt(rows[3]));
  chk(/CAR 17.20 ATL/.test(txt(cards[0].querySelector('.games'))) && /Q3 7:12/.test(txt(cards[0].querySelector('.games'))),
    'the score strip is wrong: ' + txt(cards[0].querySelector('.games')));
  chk(/\$20\.00/.test(txt(cards[0])) && /\+580/.test(txt(cards[0])), 'the money row is wrong');
  chk(/sunday/.test(txt(cards[0])), 'a note on a parlay is not shown');
  { const fill = rows[0].querySelector('.fill'), tick = rows[0].querySelector('.tick');
    chk(/width:\s*100/.test(fill.getAttribute('style')), 'a cleared over should fill the bar');
    chk(/left:\s*80/.test(tick.getAttribute('style')), 'the tick should sit at 80%'); }

  // ---- B. the order the day runs in ----
  chk(/Bijan Robinson/.test(who(cards[0].querySelector('.sp-leg'))), 'the early parlay should be first');
  chk(/Derrick Henry/.test(who(cards[1].querySelector('.sp-leg'))), 'the late parlay should be second');

  // ---- C. it reads the two models, and never writes anything of theirs ----
  /* on the owner's device the browser's parlays are X's, drawn under X Parlays beside the file's;
     anywhere else (a visitor's device, or no store at all) X Parlays is X's alone, and nothing the
     browser holds is drawn: there is no list of a visitor's own */
  chk(!/api\.github\.com/.test(HTML), 'the page still talks to the GitHub API');
  /* the page may write its own key and no other: the two models' storage is theirs */
  {
    const seed = w => { w.localStorage.setItem(PROP_KEY, propBlob()); w.localStorage.setItem(BET_KEY, betBlob());
      w.localStorage.setItem('live_parlays_v1', JSON.stringify({ lines: {}, removed: {} })); };
    /* a saved parlay is watched the moment it is saved: nothing has to be sent */
    const plain = await run({ role: 'owner', seed: w => { w.localStorage.setItem(PROP_KEY, propBlob()); w.localStorage.setItem(BET_KEY, betBlob()); } });
    chk([...plain.d.querySelectorAll('.savedp')].some(c => /prop model/.test(txt(c.querySelector('.pill')))),
      'a saved parlay is not watched until something is pressed');
    const m = await run({ seed, role: 'owner' });
    const cards = [...m.d.querySelectorAll('.savedp')];
    chk(cards.length === 4, `2 from the file plus 2 from this browser expected, got ${cards.length}`);
    const pills = cards.map(c => txt(c.querySelector('.pill')));
    chk(pills.filter(x => x === 'prop model').length === 1, 'the prop model parlay is not picked up or not labelled');
    chk(pills.filter(x => x === 'betting model').length === 1, 'the betting parlay is not picked up or not labelled');
    chk(pills.filter(x => x === 'placed').length === 2, 'the file parlays are not labelled placed');
    chk(m.d.querySelectorAll('#lpCard .savedp').length === 4 && !m.d.getElementById('myCard'), 'on the owner\'s device the file\'s parlays and the browser\'s are not all under X Parlays, or a second list is in the page');
    const mine = cards.find(c => /prop model/.test(txt(c.querySelector('.pill'))));
    chk(!!mine && who(mine.querySelector('.sp-leg')) === 'Kyle Pitts Receiving Yards', 'the imported leg is wrong: ' + (mine ? who(mine.querySelector('.sp-leg')) : 'no card'));
    chk(!!mine && knob(mine.querySelector('.sp-leg')) === '21', 'an imported leg is not tracked against the live box score');
    /* the prop model rewrites its own key as it boots, but what was seeded survives in it */
    chk(m.w.eval('S').saved.length === 1 && m.w.eval('S').saved[0].id === 'mine', 'the seeded saved parlay was lost across the prop model\'s boot');
    chk(m.w.localStorage.getItem(BET_KEY) === betBlob(), 'the page wrote over the betting model key');
    /* a visitor's device with no store: X Parlays is the file, read only, and the browser's own
       saved parlay, builder and betting slip are drawn nowhere, though every one stays in its
       storage, untouched, with the visitor's old my_parlays_v1 */
    { const myOld = JSON.stringify({ lines: { 'prop|mine|0': 22.5 }, removed: { 'bet|bb1': 1 }, kept: {} });
      const vis = await run({ seed: w => { seed(w); w.localStorage.setItem('my_parlays_v1', myOld); } });
      chk(!vis.d.getElementById('myCard') && !vis.d.getElementById('myApp') && vis.d.querySelectorAll('.savedp').length === 2 && vis.d.querySelectorAll('#lpCard .savedp').length === 2,
        'with no store a visitor\'s own parlays are drawn, or a list of their own is in the page: ' + vis.d.querySelectorAll('.savedp').length + ' cards');
      chk(!/Your parlays/i.test(txt(vis.d.getElementById('tab-parlay'))) && !/Kyle Pitts Receiving Yards/.test(txt(vis.d.getElementById('tab-parlay'))), 'the X Parlays tab still says Your parlays, or shows the visitor\'s parlay');
      chk(vis.w.eval('S').saved.length === 1 && vis.w.eval('S').saved[0].id === 'mine' && JSON.parse(vis.w.localStorage.getItem(PROP_KEY)).saved[0].id === 'mine',
        'a visitor\'s saved parlay was lost from their own storage');
      chk(vis.w.localStorage.getItem('my_parlays_v1') === myOld && vis.w.localStorage.getItem(BET_KEY) === betBlob(), 'a visitor\'s my_parlays_v1 or betting key was rewritten'); }
    /* with no store, X's placed copy is X's; the browser's own copy of it is not drawn */
    { const two = await run({ seed, file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
        { id: 'mine', week: 2, stake: 99, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 99.5, 'over', true)] }] } });
      chk(/\$99\.00/.test(txt(two.d.getElementById('lpCard'))) && !/\$15\.00/.test(txt(two.d.getElementById('tab-parlay'))), 'the placed copy is not X\'s, or the visitor\'s own copy is drawn'); }
    /* on the owner's device the browser's parlays are X's: a parlay in both places is shown once,
       with this browser's copy winning */
    const dup = await run({ seed, role: 'owner', file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'mine', week: 2, stake: 99, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 99.5, 'over', true)] }] } });
    const same = [...dup.d.querySelectorAll('.savedp')].filter(c => /Kyle Pitts/.test(txt(c)));
    chk(same.length === 1, `a parlay in both places showed ${same.length} times`);
    chk(/\$15\.00/.test(txt(same[0])), "the file's older copy won over this browser's");
    /* and the same parlay under a different id is still the same parlay */
    const ren = await run({ seed, role: 'owner', file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'a-different-id', week: 2, stake: 99, legs: [
        legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 20.5, 'over', true)] }] } });
    const twice = [...ren.d.querySelectorAll('.savedp')].filter(c => /Kyle Pitts/.test(txt(c)));
    chk(twice.length === 1, `the same legs under another id showed ${twice.length} times`);
    chk(/\$15\.00/.test(txt(twice[0])), "the file's copy won over this browser's");
    chk(dup.w.NFLSYNC.role() === 'owner' && !dup.d.getElementById('myCard'), 'the owner\'s device draws a list of its own beside X\'s');
  }

  // ---- C2. a parlay still in the prop model's builder counts too ----
  {
    const seed = w => { w.localStorage.setItem(PROP_KEY, workBlob()); };
    const b = await run({ seed, role: 'owner', file: { updated: null, games: [], parlays: [] } });
    const card = [...b.d.querySelectorAll('.savedp')];
    chk(card.length === 1, `a parlay in the builder should show, got ${card.length} cards`);
    chk(/in the builder/.test(txt(card[0])), 'a builder parlay is not marked as one: ' + txt(card[0]));
    chk(card[0].querySelectorAll('.sp-leg').length === 2, 'a builder parlay lost legs');
    chk(/\$40\.00/.test(txt(card[0])), "the builder parlay should carry the builder's stake");
    chk(knob(card[0].querySelector('.sp-leg')) === '86', 'a builder leg is not tracked live');
    chk(Object.keys(b.w.eval('S').parlay).length === 2, 'the seeded builder legs were lost across the prop model\'s boot');
    /* it has an x too: cancelled it keeps the builder, confirmed it clears it */
    const x = card[0].querySelector('[data-rm][data-builder]');
    chk(!!x, 'the builder parlay has no delete button');
    if (x) { b.w.confirm = () => false; x.click(); await wait(60);
      chk(Object.keys(b.w.eval('S').parlay).length === 2 && b.d.querySelectorAll('.savedp').length === 1, 'cancelling the clear still cleared the builder');
      b.w.confirm = () => true; b.d.querySelector('.savedp [data-rm][data-builder]').click(); await wait(60);
      chk(Object.keys(b.w.eval('S').parlay).length === 0 && !b.d.querySelector('.savedp'), 'the x did not clear the builder and its card'); }
    /* saved and building at once: both show, and the saved one keeps its price */
    const both = JSON.parse(propBlob()); both.parlay = JSON.parse(workBlob()).parlay;
    const c2 = await run({ role: 'owner', seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(both));
        w.localStorage.setItem('live_parlays_v1', JSON.stringify({ lines: {}, removed: {} })); },
      file: { updated: null, games: [], parlays: [] } });
    chk(c2.d.querySelectorAll('.savedp').length === 2, 'saved and building should be two parlays');
  }

  // ---- C3. a builder parlay whose first game kicks off is kept and watched, not dropped ----
  {
    /* Bijan's leg is on CAR at ATL, which has kicked off, so the builder drops it on load; the
       money line is on a game still to come and stays. The section keeps the builder as it
       stood. The schedule is pinned so the case holds in any week of any season: CAR at ATL in
       the past, two other games in the future. */
    const G1 = `${SEA}_02_CAR_ATL`, P0 = JSON.parse(PAYLOAD), later = P0.sched.filter(x => x.id !== G1).slice(-2);
    const pin = P => { let r = P.sched.find(x => x.id === G1);
      if (!r) { r = { id: G1, w: 2, t: '13:00', a: 'CAR', h: 'ATL' }; P.sched.push(r); }
      r.d = '2000-01-02';
      for (const x of P.sched) if (later.some(y => y.id === x.id)) x.d = '2099-12-31';
      return P; };
    const L2 = later[0], L2key = `${L2.id}|team:${L2.h}|ml`;
    const atKick = () => JSON.stringify({ stake: 40, saved: [], parlay: {
      [`${G1}|00-0038542|rushing_yards`]: { gid: G1, pid: '00-0038542', stat: 'rushing_yards', k: 43.5, side: 'over', main: true,
        name: 'Bijan Robinson', team: 'ATL', week: 2 },
      [L2key]: { gid: L2.id, pid: 'team:' + L2.h, stat: 'ml', k: 0, side: 'over', main: false,
        name: L2.h, team: L2.h, grp: 'TEAM', week: L2.w } } });
    /* on the owner's device the kept builder is X's: the section's shared key */
    const k = await run({ pay: pin, role: 'owner', seed: w => w.localStorage.setItem(PROP_KEY, atKick()), file: { updated: null, games: [], parlays: [] } });
    const cards = [...k.d.querySelectorAll('.savedp')], S = k.w.eval('S');
    chk(Object.keys(S.parlay).length === 1 && !!S.parlay[L2key], 'the builder should drop the leg whose game kicked off: ' + Object.keys(S.parlay).join(', '));
    chk(cards.length === 1 && /builder at kickoff/.test(txt(cards[0])) && cards[0].querySelectorAll('.sp-leg').length === 2,
      'a builder parlay that lost a leg at kickoff is not kept whole and watched: ' + cards.map(c => txt(c).slice(0, 60)).join(' | '));
    { const pl = cards.length === 1 ? cards[0].querySelector('.sp-leg.prop') : null;
      chk(!!pl && knob(pl) === '86' && /\$40\.00/.test(txt(cards[0])), 'the kept parlay is not tracked live, or lost its stake'); }
    const st = JSON.parse(k.w.localStorage.getItem('live_parlays_v1') || '{}');
    chk(st.kept && Object.keys(st.kept).length === 1 && Object.values(st.kept)[0].legs.length === 2, 'the kept parlay is not under the section\'s own (shared) key: ' + JSON.stringify(st.kept));
    /* a redraw keeps one copy; a new leg in the builder is a parlay of its own again */
    k.w.eval('renderParlay()'); await wait(60);
    chk(Object.keys(JSON.parse(k.w.localStorage.getItem('live_parlays_v1') || '{}').kept || {}).length === 1, 'a redraw kept the builder twice');
    const g18 = later[1];
    S.parlay[g18.id + '|team:' + g18.h + '|ml'] = { gid: g18.id, pid: 'team:' + g18.h, stat: 'ml', k: 0, side: 'over', main: false, name: g18.h, team: g18.h, grp: 'TEAM', week: g18.w };
    k.w.eval('save(); renderParlay()'); await wait(80);
    chk(k.d.querySelectorAll('.savedp').length === 2 && [...k.d.querySelectorAll('.savedp .pill')].some(x => /in the builder/.test(txt(x))), 'a builder with a new leg is not shown beside the kept parlay');
    /* the x deletes the kept copy and nothing else */
    const kc = [...k.d.querySelectorAll('.savedp')].find(c => /builder at kickoff/.test(txt(c)));
    if (kc) { kc.querySelector('[data-rm]').click(); await wait(60); }
    chk(!!kc && Object.keys(JSON.parse(k.w.localStorage.getItem('live_parlays_v1') || '{}').kept || {}).length === 0 && Object.keys(S.parlay).length === 2,
      'deleting the kept parlay did not delete it, or touched the builder');
    /* anywhere else the builder is the visitor's alone: it drops the started leg as ever, and
       nothing of it is kept, written or drawn */
    const kv = await run({ pay: pin, seed: w => w.localStorage.setItem(PROP_KEY, atKick()), file: { updated: null, games: [], parlays: [] } });
    chk(Object.keys(kv.w.eval('S').parlay).length === 1 && kv.w.localStorage.getItem('my_parlays_v1') === null && kv.w.localStorage.getItem('live_parlays_v1') === null
      && !kv.d.querySelector('.savedp') && kv.w.lpKeep() === false,
      'a visitor\'s builder at kickoff was kept, written or drawn: ' + kv.w.localStorage.getItem('my_parlays_v1'));
  }

  // ---- C4. two parlays alike but for the side or the player are two parlays ----
  {
    const ml = (gi, team) => ({ game: gi, player: { ATL: 'Falcons', CAR: 'Panthers' }[team], team, stat: 'ml', line: 0, side: 'over', main: false });
    const file = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'falcons-over', week: 2, stake: 5, legs: [ml(0, 'ATL'), { game: 0, player: 'Total', team: 'ATL', stat: 'total', line: 36.5, side: 'over', main: true }] },
      { id: 'pitts-3', week: 2, stake: 5, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receptions', 3, 'over', true)] }] };
    const mine = JSON.stringify({ stake: 5, saved: [
      { id: 'panthers-over', week: 2, stake: 5, price: 300, payout: 20, legs: [
        { gid: '2026_02_CAR_ATL', pid: 'team:CAR', stat: 'ml', k: 0, side: 'over', main: false, name: 'Panthers', team: 'CAR', week: 2 },
        { gid: '2026_02_CAR_ATL', pid: 'total', stat: 'total', k: 36.5, side: 'over', main: true, name: 'Total', team: 'ATL', week: 2 }] },
      { id: 'bijan-3', week: 2, stake: 5, price: 150, payout: 12.5, legs: [
        { gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 }] }] });
    const x = await run({ file, role: 'owner', seed: w => w.localStorage.setItem(PROP_KEY, mine) });
    const t = [...x.d.querySelectorAll('.savedp')].map(c => txt(c));
    chk(t.length === 4 && t.some(c => /Falcons To Win/.test(c)) && t.some(c => /Panthers To Win/.test(c)), 'the file\'s Falcons parlay was hidden as a copy of a saved Panthers one: ' + t.length + ' cards');
    chk(t.some(c => /Kyle Pitts Receptions/.test(c)) && t.some(c => /Bijan Robinson Receptions/.test(c)), 'two players at the same line were taken for one parlay');
  }

  // ---- C5. a player who did not play: the leg is void, not lost ----
  {
    /* An Atlanta player (out of the payload, so any season) is ruled Out for the week on the
       injury report the page reads, and is on no line of the final box score. A second has no
       such word: he is graded on nothing, and the row says he is not on the box score. The
       second is one the real payload says nothing about either (no row on any week's injury
       report, no roster status but active), so a real Out later in the season cannot void him. */
    const onSheet = ['Bijan Robinson', 'Kyle Pitts', 'Michael Penix Jr.', 'Chuba Hubbard'];
    const P0 = JSON.parse(PAYLOAD), reported = new Set((P0.injuries || []).map(r => r.gsis_id));
    const atl = P0.players.filter(x => x.t === 'ATL' && !onSheet.includes(x.n));
    const OUT = atl[0], QUIET = atl.find(x => x !== OUT && !reported.has(x.id) && (x.st == null || x.st === 'ACT'));
    const pay = P => { P.injuries = (P.injuries || []).concat([{ season: String(SEA), week: '2', gsis_id: OUT.id, report_status: 'Out', game_status: '' }]); return P; };
    const file = { updated: null, games: [`${SEA}_02_CAR_ATL`], parlays: [
      { id: 'dnp-over', week: 2, stake: 10, legs: [legF(0, OUT.n, 'ATL', 'receiving_yards', 50.5, 'over', true), legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true)] },
      { id: 'dnp-under', week: 2, stake: 10, legs: [legF(0, OUT.n, 'ATL', 'receptions', 4.5, 'under', true)] },
      { id: 'quiet', week: 2, stake: 10, legs: [legF(0, QUIET.n, 'ATL', 'receiving_yards', 30.5, 'over', true)] }] };
    const rx = n => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const v = await run({ file, state: 'post', pay });
    const over = [...v.d.querySelectorAll('.savedp')].find(c => c.querySelectorAll('.sp-leg').length === 2);
    const drake = over && [...over.querySelectorAll('.sp-leg')].find(r => rx(OUT.n).test(who(r)));
    chk(!!drake && status(drake) === 'void' && txt(drake.querySelector('.res')) === 'V' && /did not play \(out\)/.test(txt(drake)),
      'a player ruled out and missing from the box score is not void: ' + (drake ? txt(drake) : 'no row'));
    chk(!!over && !/\bgone\b/.test(txt(over.querySelector('.sp-head'))) && /landed/.test(txt(over.querySelector('.sp-head'))) && /1 void/.test(txt(over.querySelector('.sp-head'))),
      'a parlay with a void leg and the rest won is not "landed, 1 void": ' + (over ? txt(over.querySelector('.sp-head')) : ''));
    const under = [...v.d.querySelectorAll('.savedp')].find(c => rx(OUT.n + ' Receptions').test(txt(c)));
    chk(!!under && status(under.querySelector('.sp-leg')) === 'void' && !/landed|gone/.test(txt(under.querySelector('.sp-head'))) && /\bvoid\b/.test(txt(under.querySelector('.sp-head'))),
      'an under on a player who did not play is graded instead of void: ' + (under ? txt(under.querySelector('.sp-head')) + ' / ' + status(under.querySelector('.sp-leg')) : ''));
    const quiet = [...v.d.querySelectorAll('.savedp')].find(c => [...c.querySelectorAll('.who')].some(x => rx(QUIET.n).test(txt(x))));
    chk(!!quiet && status(quiet.querySelector('.sp-leg')) === 'missed' && /not on the box score/.test(txt(quiet)) && /gone/.test(txt(quiet.querySelector('.sp-head'))),
      'a player with no word that he sat is not graded on nothing and said to be off the box score: ' + (quiet ? txt(quiet) : ''));
    /* the same leg while the game is on: void too, since he was ruled out */
    const live = await run({ file, state: 'in', pay });
    const d2 = [...live.d.querySelectorAll('.sp-leg')].find(r => rx(OUT.n + ' Receiving').test(who(r)));
    chk(!!d2 && status(d2) === 'void', 'a ruled-out player\'s leg is not void while the game is on: ' + (d2 ? status(d2) : ''));
  }

  // ---- C6. the scoreboard asked for in each game's own season and week, playoffs too ----
  {
    const file = { updated: null, games: ['2026_02_CAR_ATL', '2026_20_CAR_ATL', '2026_22_CAR_ATL', '2027_01_CAR_ATL'], parlays: [
      { id: 'reg', week: 2, stake: 1, legs: [{ game: 0, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] },
      { id: 'div', week: 20, stake: 1, legs: [{ game: 1, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] },
      { id: 'sb', week: 22, stake: 1, legs: [{ game: 2, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] },
      { id: 'next', week: 1, stake: 1, legs: [{ game: 3, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] }] };
    const q = await run({ file });
    const sbq = q.calls.filter(u => /\/scoreboard\?/.test(u)).map(u => (u.match(/seasontype=\d+&week=\d+&dates=\d+/) || [''])[0]);
    for (const want of ['seasontype=2&week=2&dates=2026', 'seasontype=3&week=2&dates=2026', 'seasontype=3&week=5&dates=2026', 'seasontype=2&week=1&dates=2027'])
      chk(sbq.includes(want), 'the scoreboard was not asked for ' + want + ': ' + sbq.join(', '));
    chk(q.d.querySelectorAll('.sp-leg.team .gm').length === 4, 'a playoff or next-season game was not tracked: ' + q.d.querySelectorAll('.sp-leg.team .gm').length);
  }

  // ---- D. the buttons are gone ----
  for (const id of ['ghSave', 'ghLoad', 'send', 'paste', 'clearDone', 'tokIn'])
    chk(!d.getElementById(id), `the ${id} control is still on the page`);
  chk(!d.querySelector('[data-send]'), 'a sending control survived');
  chk(!!d.getElementById('now') && !d.getElementById('every') && !d.getElementById('ver'), 'Refresh now stays; the interval picker and the build pill go');
  /* the build stamp: the one thing that tells a stale cached copy from a broken one, in the markup now */
  chk(/^app v\d+/.test(txt(d.getElementById('buildTag'))), 'the page does not say which build it is');
  chk(!/Parlays marked/.test(txt(d.getElementById('lpCard'))), 'the old footer text is in the section');
  /* X Parlays heads the tab and the builder is under it, the last thing in it: no list of a visitor's own */
  const lpc = d.getElementById('lpCard');
  chk(!!lpc && d.getElementById('tab-parlay').firstElementChild === lpc && lpc.nextElementSibling.id === 'parlayBody' && d.getElementById('parlayBody').nextElementSibling.id === 'suggModal'
    && !d.getElementById('suggModal').nextElementSibling && !d.getElementById('myCard') && !d.getElementById('myApp') && !d.getElementById('myClear'),
    'X Parlays is not at the top of its tab with the builder under it and nothing after, or Your parlays is still in the page');
  chk(!/Your parlays/i.test(txt(d.getElementById('tab-parlay'))), 'the X Parlays tab still says Your parlays');
  { const body = d.body.cloneNode(true); body.querySelectorAll('script, style').forEach(n => n.remove());
    chk(/^X Parlays/.test(txt(lpc.querySelector('h2'))) && !/Live Parlays/i.test(body.textContent) && !/Live Parlays/i.test(d.title), 'the section is still called Live Parlays somewhere a reader sees it'); }
  chk(!d.getElementById('savedCard') && !d.getElementById('betParlays'), 'the old cards are still drawn');

  // ---- D1. what is X's stays X's; what is yours you clear ----
  {
    /* with no store (and on any device but the owner's) a placed parlay is X's: no delete, and
       Clear settled is not offered, though both have landed or gone */
    const live = await run({ state: 'in' });
    chk(live.d.getElementById('clear').hidden, 'with nothing settled there is nothing to clear');
    chk(/\[hidden\]\{display:none!important\}/.test(HTML), 'a hidden button is still drawn: the .btn display rule beats the hidden attribute without this');
    chk(live.d.querySelectorAll('#lpCard .savedp').length === 2 && !live.d.querySelector('#lpCard [data-rm]'), 'a placed parlay offers a delete on a device that is not the owner\'s');
    /* the section only: the Props game list carries its own LIVE pill once a real game has kicked off */
    chk(!live.d.querySelector('#lpCard .pill.warn') && !/\d of \d in/.test(txt(live.d.getElementById('lpCard'))), 'a running parlay still carries the "n of m in" tag');
    chk(live.w.LIVE_IO.set('{"removed":{"file|night":1}}') === false && live.w.localStorage.getItem('live_parlays_v1') === null, 'a device that is not the owner\'s wrote X\'s key');
    const done = await run({ state: 'post' });
    chk(done.d.getElementById('clear').hidden && done.d.querySelectorAll('#lpCard .savedp').length === 2, 'Clear settled is offered on X\'s parlays, or took them, on a device that is not the owner\'s');
    chk(done.d.querySelectorAll('#lpCard .pill.ok, #lpCard .pill.bad').length === 2, 'a finished parlay should still say landed or gone');   /* the section only: the Props list has its own FINAL pills */

    /* a visitor's own parlays, settled or not, saved before visitors stopped saving: drawn nowhere,
       nothing offered to clear them, and kept in their storage as they were */
    const ownBlob = JSON.stringify({ stake: 5, saved: [
      { id: 'own-won', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 43.5, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 }] },
      { id: 'own-lost', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 20.5, side: 'under', main: true, name: 'Chuba Hubbard', team: 'CAR', week: 2 }] }] });
    const mine = await run({ state: 'post', seed: w => { w.localStorage.setItem(PROP_KEY, ownBlob); w.localStorage.setItem(BET_KEY, betBlob()); } });
    chk(mine.d.querySelectorAll('.savedp').length === 2 && mine.d.querySelectorAll('#lpCard .savedp').length === 2 && mine.d.getElementById('clear').hidden && !mine.d.querySelector('[data-rm]'),
      'a visitor\'s own settled parlays or betting slip are drawn, or offered to clear or delete');
    chk(mine.w.eval('S').saved.map(p => p.id).join() === 'own-won,own-lost' && mine.w.localStorage.getItem(BET_KEY) === betBlob() && mine.w.localStorage.getItem('my_parlays_v1') === null,
      'a visitor\'s own saved parlays or betting slip were touched, or a key of their own was written');

    /* on the owner's device X's parlays are the owner's to delete and clear, for every device */
    const own = await run({ state: 'in', role: 'owner' });
    chk(own.w.NFLSYNC.role() === 'owner' && own.d.querySelectorAll('#lpCard .savedp [data-rm]').length === 2 && !own.d.getElementById('myCard'), 'the owner\'s device cannot delete X\'s parlays, or shows a list of its own');
    own.d.querySelector('#lpCard .savedp [data-rm]').click();
    await wait(60);
    { const st = JSON.parse(own.w.localStorage.getItem('live_parlays_v1') || '{}');
      chk(own.d.querySelectorAll('#lpCard .savedp').length === 1 && st.removed && Object.keys(st.removed).length === 1 && /^file\|/.test(Object.keys(st.removed)[0]), 'the owner\'s deletion is not kept under X\'s key: ' + JSON.stringify(st)); }
    await wait(900);
    chk(own.store.writes > 0 && /file\|/.test(own.store.node.doc.json), 'the owner\'s deletion did not reach the store');
    const ownDone = await run({ state: 'post', role: 'owner' });
    chk(!ownDone.d.getElementById('clear').hidden, 'on the owner\'s device, with every game final, Clear settled should be offered');
    ownDone.d.getElementById('clear').click();
    await wait(60);
    chk(ownDone.d.querySelectorAll('#lpCard .savedp').length === 0 && /^Nothing to watch yet\s*bring back the 2 deleted$/.test(txt(ownDone.d.getElementById('app'))), 'Clear settled on the owner\'s device did not clear X\'s settled parlays, or offers no way back: ' + txt(ownDone.d.getElementById('app')));
    ownDone.d.getElementById('restoreAll').click();
    await wait(60);
    chk(ownDone.d.querySelectorAll('#lpCard .savedp').length === 2 && !ownDone.d.getElementById('restoreAll'), 'bringing them back did not bring them back');
  }

  // ---- D2. a line the book moved, corrected on the page ----
  {
    const one = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'k', week: 2, stake: 5, legs: [
        legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 41.5, 'over', true)] }] };
    /* X's placed line is X's: no pencil on a device that is not the owner's */
    const ro = await run({ file: one });
    chk(!ro.d.querySelector('#lpCard [data-edit]') && txt(ro.d.querySelector('#lpCard .lineLbl')) === '41.5', 'a placed parlay\'s line can be changed on a device that is not the owner\'s');
    /* nor on a visitor's own saved parlay, which is not drawn at all */
    const ownPitts = JSON.stringify({ stake: 5, saved: [{ id: 'pitts', week: 2, stake: 5, price: 200, payout: 15, legs: [
      { gid: '2026_02_CAR_ATL', stat: 'receiving_yards', k: 41.5, side: 'over', main: true, name: 'Kyle Pitts', team: 'ATL', week: 2 }] }] });
    { const vo = await run({ file: { updated: null, games: [], parlays: [] }, seed: w => w.localStorage.setItem(PROP_KEY, ownPitts) });
      chk(!vo.d.querySelector('[data-edit]') && !vo.d.querySelector('.savedp'), 'a visitor\'s own saved parlay is drawn with a line to change'); }
    /* on the owner's device a saved parlay's line and a placed one's are X's, kept in X's key */
    for (const [how, opts, key, card] of [['X\'s saved', { file: { updated: null, games: [], parlays: [] }, role: 'owner', seed: w => w.localStorage.setItem(PROP_KEY, ownPitts) }, 'live_parlays_v1', '#lpCard'],
      ['X\'s placed', { file: one, role: 'owner' }, 'live_parlays_v1', '#lpCard']]) {
      const e = await run(opts);
      const ln = e.d.querySelector(card + ' [data-edit]');
      chk(!!ln && txt(ln) === '41.5', `the line on ${how} parlay is not a control on the bar: ` + txt(ln || null));
      chk(!e.d.querySelector('.sp-leg.team [data-edit]'), 'a team bet has a line to edit and should not');
      if (!ln) continue;
      ln.click();
      const inp = e.d.querySelector('.lineInput');
      chk(!!inp && inp.value === '41.5', 'the editor does not open prefilled');
      inp.value = '50';
      inp.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await wait(60);
      const row = e.d.querySelector(card + ' .sp-leg.prop');
      chk(target(row) === '50+', 'the corrected line is not what the leg reads: ' + target(row));
      chk(/29 to go/.test(status(row)), 'the distance is not recomputed on the new line: ' + status(row));
      chk(/moved from 41\.5/.test(txt(row)), 'the row does not say where the line moved from');
      /* it is kept in the list's own key, and the prop model's is not touched */
      const store = JSON.parse(e.w.localStorage.getItem(key) || 'null');
      chk(store && store.lines && Object.values(store.lines)[0] === 50, `the correction to ${how} parlay was not stored under ${key}`);
      chk(e.w.localStorage.getItem(BET_KEY) === null, "correcting a line wrote to the betting model's key");
      /* and undone */
      e.d.querySelector(card + ' [data-reset]').click();
      await wait(60);
      chk(target(e.d.querySelector(card + ' .sp-leg.prop')) === '41.5+', 'undo did not put the line back');
      /* Escape leaves it alone */
      e.d.querySelector(card + ' [data-edit]').click();
      const i2 = e.d.querySelector('.lineInput'); i2.value = '99';
      i2.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await wait(60);
      chk(target(e.d.querySelector(card + ' .sp-leg.prop')) === '41.5+', 'Escape committed the edit anyway');
    }
  }

  // ---- D2b. a visitor's device: X's document, read only ----
  {
    const doc = { prop: { stake: 30, saved: [{ id: 'x1', week: 2, stake: 10, price: 250, payout: 35, legs: [
        { gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 43.5, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 }] }],
      parlay: { 'b|1': { gid: '2026_18_NO_BAL', pid: 'hen', stat: 'rushing_yards', k: 70.5, side: 'over', main: true, name: 'Derrick Henry', team: 'BAL', week: 18 } } },
      live: { lines: { 'prop|x1|0': 60.5 }, removed: { 'file|night': 1 } } };
    const v = await run({ role: 'reader', doc });
    const lp = v.d.getElementById('lpCard'), pills = [...lp.querySelectorAll('.savedp')].map(c => [...c.querySelectorAll('.pill')].map(txt).join('|'));
    chk(v.w.NFLSYNC.role() === 'reader' && pills.length === 3 && pills.includes('prop model') && pills.some(x => /in X.s builder/.test(x)) && pills.filter(x => x.startsWith('placed')).length === 1,
      'a visitor\'s X Parlays is not X\'s saved parlay, X\'s builder and the placed parlay X kept: ' + pills.join(' / '));
    const x1 = [...lp.querySelectorAll('.savedp')].find(c => /Bijan/.test(txt(c)) && /prop model/.test(txt(c)));
    chk(!!x1 && /60\.5\+/.test(txt(x1)) && /moved from 43\.5/.test(txt(x1)), 'X\'s corrected line is not shown on a visitor\'s device');
    chk(!lp.querySelector('[data-rm], [data-edit], [data-stake-of], [data-reset]') && !v.d.getElementById('myCard'), 'a visitor\'s X Parlays offers a control, or a list of their own is in the page');
    chk(v.store.writes === 0, 'a visitor\'s device wrote to the store');
  }

  // ---- D3. the scoreboard chips carry the result ----
  {
    const chip = (file, state) => run({ file, state }).then(x => x.d.querySelector('.gm'));
    const ml = (gi, team) => ({ game: gi, player: team, team, stat: 'ml', line: 0, side: 'over', main: false });
    const winning = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'w', week: 2, stake: 1, legs: [ml(0, 'ATL')] }] };      /* ATL up 20-17 */
    const losing = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'l', week: 2, stake: 1, legs: [ml(0, 'CAR')] }] };
    chk(/\bgood\b/.test((await chip(winning, 'in')).className), 'a game being won is not green');
    chk(/\bbad\b/.test((await chip(losing, 'in')).className), 'a game being lost is not red');
    /* a prop-only game has no row of its own, so its chip is the strip above the legs */
    const propOnly = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'p', week: 2, stake: 1, legs: [
        legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 400.5, 'over', true)] }] };
    const pc = await chip(propOnly, 'in');
    chk(/\btie\b/.test(pc.className), 'a leg still short with the game running is not yellow');
    chk(!!pc.closest('.games'), 'a prop-only game lost its score strip');
    /* a game total: CAR 17, ATL 20 is 37 points, clear of 36.5 over and short of 42.5 */
    const tot = (line, side) => ({ updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 't', week: 2, stake: 1, legs: [{ game: 0, player: 'Total', team: 'ATL', stat: 'total', line, side, main: true }] }] });
    { const x = await run({ file: tot(36.5, 'over'), state: 'in' }), row = x.d.querySelector('.sp-leg');
      chk(!!row && target(row) === 'Over 36.5' && /Total Points/.test(txt(row)) && knob(row) === '+0.5', 'a game total over its line does not read Over 36.5, +0.5: ' + txt(row));
      chk(/\bgood\b/.test(row.querySelector('.gm').className) && x.calls.filter(u => u.includes('/summary?')).length === 0, 'a total being won is not green, or it fetched a box score');
      /* points only go up: an over past its line is won with the game still on */
      chk(txt(row.querySelector('.res')) === '\u2713', 'an over past its line mid-game is not checked off as won: ' + txt(row)); }
    { const x = await run({ file: tot(36.5, 'under'), state: 'in' }), row = x.d.querySelector('.sp-leg');
      chk(txt(row.querySelector('.res')) === '\u2717', 'an under the total has already passed mid-game is not marked lost: ' + txt(row)); }
    { const x = await run({ file: tot(42.5, 'over'), state: 'in' }), row = x.d.querySelector('.sp-leg');
      chk(!/[\u2713\u2717]/.test(txt(row.querySelector('.res'))), 'an over still short of its line mid-game was settled: ' + txt(row)); }
    { const x = await run({ file: tot(42.5, 'over'), state: 'post' }), row = x.d.querySelector('.sp-leg');
      chk(/\bloss\b/.test(row.querySelector('.res').className) && knob(row) === '-5.5', 'a total that finished under an over bet is not lost: ' + txt(row)); }
    { const x = await run({ file: tot(42.5, 'under'), state: 'post' }), row = x.d.querySelector('.sp-leg');
      chk(/\bwin\b/.test(row.querySelector('.res').className) && target(row) === 'Under 42.5', 'an under that finished under is not won: ' + txt(row)); }
    const pre = await chip(winning, 'pre');
    chk(!/good|bad|tie/.test(pre.className), 'a game that has not kicked off is coloured');
  }

  // ---- E. nought before kickoff ----
  const b4 = await run({ state: 'pre' });
  const first = [...b4.d.querySelectorAll('.savedp')][0].querySelector('.sp-leg');
  chk(/CAR 0.0 ATL/.test(txt(b4.d.querySelector('.games'))), 'before kickoff the strip should read 0-0');
  chk(knob(first) === '0', 'before kickoff a leg should read 0');
  chk(/0 car, 0 rush yds|0 rec, 0 rec yds/.test(txt(first)), 'before kickoff the stat line should be zeros: ' + txt(first));

  // ---- F. an empty file, and a missing one ----
  const e1 = await run({ file: { updated: null, games: [], parlays: [] } });
  /* empty says so and nothing else: no tour of where parlays come from */
  chk(txt(e1.d.getElementById('app')) === 'Nothing to watch yet', 'an empty page should say only "Nothing to watch yet": ' + txt(e1.d.getElementById('app')));
  chk(!e1.d.getElementById('restoreAll'), 'the way back is offered with nothing deleted');
  const e2 = await run({ data: 'fail' });
  chk(/could not be read/.test(txt(e2.d.querySelector('.note')) || ''), 'a missing file is not explained');

  // ---- G. ESPN down: the parlays still list, only the numbers are stale ----
  const g1 = await run({ espn: 'fail' });
  chk(g1.d.querySelectorAll('.savedp').length === 2, 'the parlays should list when the scores cannot load');
  chk(/not loading/.test(txt(g1.d.querySelector('.note')) || ''), 'a failed score fetch is not explained');

  // ---- H. light on ESPN ----
  const h1 = await run();
  const before = h1.calls.length;
  h1.d.dispatchEvent(new h1.w.Event('visibilitychange'));
  await wait(80);
  chk(h1.calls.length === before, 'returning to the tab fetched on its own');
  h1.d.getElementById('now').click();
  await wait(200);
  chk(h1.calls.length > before, 'Refresh now did not fetch');
  const h2 = await run({ state: 'post' });
  const sums = () => h2.calls.filter(u => u.includes('/summary?')).length;
  const n1 = sums();
  await h2.w.lpRefresh(); await wait(200);
  chk(sums() === n1, `a finished game's box score was fetched again (${n1} -> ${sums()})`);

  // ---- H2. a box score is only asked for where a player leg needs one ----
  {
    const mlOnly = { updated: null, games: ['2026_02_CAR_ATL', '2026_02_NO_BAL'], parlays: [
      { id: 'ml', week: 2, stake: 2, price: 142, payout: 4.84, legs: [
        { game: 0, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false },
        { game: 1, player: 'Ravens', team: 'BAL', stat: 'ml', line: 0, side: 'over', main: false }] }] };
    const m = await run({ file: mlOnly });
    chk(m.calls.filter(u => u.includes('/summary?')).length === 0,
      'a parlay of moneylines fetched box scores it has no use for');
    const row = m.d.querySelector('.sp-leg');
    chk(/Falcons/.test(txt(row)) && /To Win/.test(txt(row)), 'a whole-game bet from the file is wrong: ' + txt(row));
    /* the score rides in the row as a chip; the last column is the clock and nothing else */
    const gm = row.querySelector('.gm');
    chk(!!gm && /CAR 17.20 ATL/.test(txt(gm)), 'the score chip is not in the row: ' + txt(gm || null));
    chk(!/Q3/.test(txt(gm)), 'the chip still carries the clock: ' + txt(gm));
    /* the clock sits where a player leg's clock sits, at the top right of the row */
    chk(txt(row.querySelector('.legtop .status')) === 'Q3 7:12', 'the clock is not in the status slot: ' + txt(row.querySelector('.legtop .status')));
    chk(!row.querySelector('.rs'), 'the team row still has a column of its own');
    /* and the row is built like a player row: a target, a name line and a bar */
    chk(!!row.querySelector('.legbody .legtop .tgt') && !!row.querySelector('.who') && !!row.querySelector('.pbar .knob'),
      'a team bet is not laid out like a player bet: ' + row.innerHTML.slice(0, 120));
    chk(/To Cover|To Win/.test(txt(row.querySelector('.who'))), 'the name line does not say what the bet is');
    chk(txt(row.querySelector('.lineLbl')) === 'line', 'the bar does not mark the line');
    chk(!/up \d|down \d/.test(txt(row)), 'the margin is still being said as well as shown: ' + txt(row));
    chk((txt(row).match(/Q3 7:12/g) || []).length === 1, 'the clock is in the row twice: ' + txt(row));
    chk(!m.d.querySelector('.games .gm'), 'a game already shown in a row is repeated in the strip above');
    chk(/\bgood\b/.test(gm.className), 'a team bet being won is not green');
    chk(/\bwin\b/.test(row.querySelector('.res').className), 'the marker on a bet being won is not green');
    const second = m.d.querySelectorAll('.sp-leg.team')[1];
    chk(txt(second.querySelector('.legtop .status')) === 'Q3 7:12', 'the second leg lost its clock: ' + txt(second));
    /* one game with a player leg must not drag in the box scores of the moneyline games */
    const mixed = JSON.parse(JSON.stringify(mlOnly));
    mixed.parlays.push({ id: 'pp', week: 2, stake: 1, legs: [
      legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true)] });
    const m2 = await run({ file: mixed });
    chk(m2.calls.filter(u => u.includes('/summary?')).length === 1,
      'one player leg fetched more box scores than there are games with player legs');
  }

  // ---- J. a visitor finishes a parlay: a card to download, saved nowhere ----
  {
    /* two legs on games of one week pinned to the far future, so no kickoff drops them in any
       week of any season: a team's money line and a player's main line, each with a book price */
    const P0 = JSON.parse(PAYLOAD), byWeek = {};
    for (const x of P0.sched) (byWeek[+x.w] = byWeek[+x.w] || []).push(x);
    const wk = Math.max(...Object.keys(byWeek).map(Number).filter(k => byWeek[k].length >= 2)), [g1, g2] = byWeek[wk];
    const other = P0.sched.find(x => +x.w !== wk);
    const pin = P => { for (const x of P.sched) if (x.id === g1.id || x.id === g2.id || (other && x.id === other.id)) { x.d = '2099-12-31'; x.t = '13:00'; } return P; };
    const mlKey = `${g1.id}|team:${g1.h}|ml`, rbKey = `${g2.id}|card-rb|rushing_yards`;
    const builder = () => ({
      [mlKey]: { gid: g1.id, pid: 'team:' + g1.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.58, price: -135, src: 'real', mu: null, name: 'Home Side', pos: 'Game', grp: 'TEAM', team: g1.h, opp: g1.a, week: wk, label: 'To win' },
      [rbKey]: { gid: g2.id, pid: 'card-rb', stat: 'rushing_yards', k: 64.5, side: 'over', main: true, p: 0.52, price: 105, src: 'real', mu: 66, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: 'Over 64.5 rushing yards' } });
    const oldSaved = [{ id: 'saved-before', saved: '2026-09-01T00:00:00Z', week: 2, stake: 4, price: 300, payout: 16, legs: [
      { gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: false, name: 'Kyle Pitts', team: 'ATL', week: 2 }] }];
    const blob = () => JSON.stringify({ stake: 25, saved: oldSaved, parlay: builder() });
    const myOld = JSON.stringify({ lines: { 'prop|saved-before|0': 4 }, removed: {}, kept: {} });
    const xdoc = { prop: { stake: 30, saved: [{ id: 'x1', week: 2, stake: 10, price: 250, payout: 35, legs: [
      { gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 43.5, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 }] }] }, live: { lines: {}, removed: {} } };
    const all = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };
    /* what finishing must leave as it was: every key but the prop model's own, which the model
       rewrites as it likes, and in that one the saved list and the builder */
    const snap = x => { const a = all(x.w), pk = JSON.parse(a[PROP_KEY] || '{}'); delete a[PROP_KEY];
      return JSON.stringify({ a, saved: pk.saved, parlay: Object.keys(pk.parlay || {}).sort(), S: x.w.eval('JSON.stringify([S.saved, Object.keys(S.parlay).sort(), S.stake])') }); };
    for (const [how, opts] of [['with no store', {}], ['a reader of X\'s document', { role: 'reader', doc: xdoc }]]) {
      const v = await run(Object.assign({ pay: pin, file: { updated: null, games: [], parlays: [] }, seed: w => { w.localStorage.setItem(PROP_KEY, blob()); w.localStorage.setItem('my_parlays_v1', myOld); } }, opts));
      const { w, d } = v, tab = d.getElementById('tab-parlay');
      let ioSets = 0; { const set = w.LIVE_IO.set; w.LIVE_IO.set = function () { ioSets++; return set.apply(this, arguments); }; }
      const rec = stubDraw(w);
      /* the tab: X's card, the builder with its suggestions, nothing of the visitor's own */
      chk(!d.getElementById('myCard') && !/Your parlays/i.test(txt(tab)) && !!d.getElementById('lpCard') && !!d.getElementById('suggOpen') && d.querySelectorAll('#parlayBody tr.legrow').length === 2,
        `${how}: the X Parlays tab is not X's card and the builder with its two legs, or a list of the visitor's own is in it`);
      chk(!/saved-before|Kyle Pitts/.test(txt(tab)), `${how}: the visitor's saved parlay from before is drawn`);
      const fin = d.getElementById('pFinish');
      chk(!!fin && !d.getElementById('pSave') && /^Finish parlay$/.test(txt(fin)) && !fin.disabled, `${how}: the builder's save is not Finish parlay on a visitor's device: ` + txt(d.querySelector('#parlayBody .actions')));
      if (!fin) continue;
      const before = snap(v), writes = v.store.writes;
      fin.click(); await wait(30);
      const md = d.getElementById('pcModal'), view = d.getElementById('pcView'), q = w.PARLAY_CARD.quote();
      const price = w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))').replace('-', '−');
      chk(!!md && !md.hidden && d.body.classList.contains('modal-open') && md.querySelector('[role="dialog"][aria-modal="true"]'), `${how}: Finish did not open the card's window`);
      chk(['Home Side', 'To win', 'Card Runner', 'Over 64.5 rushing yards', '−135', '+105'].every(t => txt(view).includes(t)), `${how}: the card is missing a leg, its market or its price: ` + txt(view));
      chk(txt(view.querySelector('.pc-price')) === price && new RegExp(`${q.useDec.toFixed(2)} decimal`).test(txt(view)) && txt(view).includes((100 / q.useDec).toFixed(1) + '% implied'),
        `${how}: the card's price is not the builder's: ${txt(view.querySelector('.pc-price'))} for ${price}`);
      { const pays = txt(d.querySelector('#parlayBody .bigp .payout')), m = [...view.querySelectorAll('.pc-money b')].map(txt);
        chk(m.length === 3 && m[0] === '$25.00' && m[1] === pays && txt(view).includes('Model’s chance all 2 land ' + (q.pr.corr * 100).toFixed(1) + '%'),
          `${how}: the card's stake, payout or chance is not the builder's: ${m.join(' / ')} against ${pays}`); }
      chk(new RegExp(`^${wk <= 18 ? 'Week ' + wk : '(Wild Card|Divisional|Conference|Super Bowl)'}`).test(txt(view.querySelector('.pc-sub'))) && /Dec 31/.test(txt(view.querySelector('.pc-sub')))
        && /X NFL Bets and Stats/i.test(txt(view)) && txt(view).includes('demon-x13.github.io/nfl-hub/nflbets'), `${how}: the card has no week and date, or no mark and address: ` + txt(view.querySelector('.pc-head')));
      chk(d.activeElement === d.getElementById('pcDownload'), `${how}: the window did not take the focus`);
      /* the image */
      d.getElementById('pcDownload').click(); await wait(60);
      const file = rec.clicks[0] && rec.clicks[0].download;
      chk(rec.clicks.length === 1 && new RegExp(`^parlay-${wk <= 18 ? 'week' + wk : 'playoffs-week' + wk}-2legs\\.png$`).test(file) && /^blob:/.test(rec.clicks[0].href) && rec.clicks[0].attached,
        `${how}: Download did not save the card as a named PNG: ` + JSON.stringify(rec.clicks));
      chk(rec.urls.length === 1 && rec.urls[0].type === 'image/png' && rec.canvases.length === 1 && rec.canvases[0].width === 1080 && rec.canvases[0].height > 2 * 400,
        `${how}: the download is not a PNG drawn at twice the card's size: ` + (rec.urls[0] && rec.urls[0].type) + ' ' + (rec.canvases[0] && rec.canvases[0].width));
      chk(['Home Side', 'To win', 'Card Runner', 'Over 64.5 rushing yards', '−135', '+105', price, '2-leg parlay', 'X NFL BETS AND STATS', 'demon-x13.github.io/nfl-hub/nflbets', '$25.00'].every(t => rec.texts.some(x => x.includes(t))),
        `${how}: the image does not carry every leg, the price, the stake and the mark: ` + rec.texts.join(' | '));
      chk(new RegExp('Saved as ' + file).test(txt(d.getElementById('pcMsg'))), `${how}: the window does not say the image was saved`);
      /* Escape closes it, and the focus goes back to Finish; the builder keeps its legs */
      d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      chk(md.hidden && !d.body.classList.contains('modal-open') && d.activeElement === d.getElementById('pFinish') && Object.keys(w.eval('S').parlay).length === 2,
        `${how}: Escape did not close the window, give the focus back to Finish, or the builder lost its legs`);
      /* Tab stays inside the window, both ways */
      d.getElementById('pFinish').click(); await wait(20);
      d.getElementById('pcAgain').focus(); d.getElementById('pcAgain').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      const wrapped = d.activeElement === d.getElementById('pcClose');
      d.getElementById('pcClose').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
      chk(wrapped && d.activeElement === d.getElementById('pcAgain'), `${how}: Tab leaves the card's window`);
      /* a click outside the card closes it too, and so does Close */
      md.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(10);
      chk(md.hidden, `${how}: a click outside the card did not close its window`);
      d.getElementById('pFinish').click(); await wait(10); d.getElementById('pcClose').click();
      chk(md.hidden, `${how}: Close did not close the card's window`);
      /* the share sheet, where the browser can share a file: the same PNG, by name */
      { const shared = []; Object.defineProperty(w.navigator, 'canShare', { value: () => true, configurable: true });
        Object.defineProperty(w.navigator, 'share', { value: async x => { shared.push(x); }, configurable: true });
        d.getElementById('pFinish').click(); await wait(20);
        chk(!d.getElementById('pcShare').hidden && /\bgo\b/.test(d.getElementById('pcShare').className) && d.activeElement === d.getElementById('pcShare'),
          `${how}: a browser that can share a file is not offered the share sheet first`);
        d.getElementById('pcShare').click(); await wait(60);
        const f = shared[0] && shared[0].files && shared[0].files[0];
        chk(!!f && f.name === file && f.type === 'image/png' && rec.clicks.length === 1, `${how}: the share sheet was not handed the card's PNG: ` + (f ? f.name + ' ' + f.type : 'nothing shared'));
        d.getElementById('pcClose').click();
        delete w.navigator.canShare; delete w.navigator.share; }
      /* finishing wrote nothing: not the saved list, not the builder, no key, not the store */
      chk(snap(v) === before && ioSets === 0 && v.store.writes === writes && w.localStorage.getItem('my_parlays_v1') === myOld && w.localStorage.getItem('live_parlays_v1') === null,
        `${how}: finishing a parlay changed what the browser keeps, wrote X's key or the store (${ioSets} LIVE_IO writes, ${v.store.writes - writes} store writes)`);
      chk(w.eval('S').saved.map(p => p.id).join() === 'saved-before' && ![...d.querySelectorAll('#tab-parlay .savedp')].some(c => /Card Runner/.test(txt(c))), `${how}: a finished parlay went into the saved list or onto the page`);
      /* the builder changed and finished again is the new parlay */
      w.eval('S.stake=40; save(); renderParlay()'); await wait(20);
      d.getElementById('pFinish').click(); await wait(20);
      chk(txt(d.querySelector('#pcView .pc-money b')) === '$40.00', `${how}: the card did not follow the builder's new stake`);
      /* Start over empties the builder, and only the builder */
      d.getElementById('pcAgain').click(); await wait(30);
      chk(md.hidden && Object.keys(w.eval('S').parlay).length === 0 && !d.getElementById('pFinish') && w.eval('S').saved.map(p => p.id).join() === 'saved-before' && ioSets === 0,
        `${how}: Start over did not clear the builder alone`);
      chk(d.activeElement === d.getElementById('suggOpen'), `${how}: after Start over the focus is lost`);
      /* two weeks in the builder cannot be one parlay: Finish says so, as Save did */
      w.eval(`S.parlay=${JSON.stringify(builder())}; S.parlay['other|team:${other ? other.h : 'X'}|ml']=${JSON.stringify({ gid: other ? other.id : 'x', pid: 'team:' + (other ? other.h : 'X'), stat: 'ml', k: 0, side: 'over', main: false, p: 0.5, price: 100, src: 'real', name: 'Elsewhere', pos: 'Game', grp: 'TEAM', team: other ? other.h : 'X', opp: other ? other.a : 'Y', week: other ? +other.w : wk + 1, label: 'To win' })}; save(); renderParlay()`);
      await wait(20);
      chk(!!d.getElementById('pFinish') && d.getElementById('pFinish').disabled && /same week to finish/.test(d.getElementById('pFinish').title), `${how}: a builder across two weeks can be finished`);
      /* the Suggested parlays window: a tier finishes the same way, its legs and its price */
      { const tierLegs = Object.values(builder()).map(l => Object.assign({ key: l.gid + '|' + l.pid + '|' + l.stat }, l));
        w.eval(`SUGGEST_CACHE={sig:'smoke',candidates:2,tiers:[{id:'safe',label:'Safe',floor:.5,legs:${JSON.stringify(tierLegs)},corr:0.41,indep:0.38,dec:3.1,added:0}]}; getSuggestions=function(){ return SUGGEST_CACHE; };`);
        d.getElementById('suggOpen').click(); await wait(30);
        const tb = d.querySelector('#suggView [data-pc-finish="model|safe"]');
        chk(!!tb && /^Finish parlay$/.test(txt(tb)) && !d.querySelector('#suggView [data-suggest-save]'), `${how}: a suggestion's save is not Finish parlay on a visitor's device`);
        if (tb) { tb.click(); await wait(20);
          chk(!md.hidden && /Safe suggestion/i.test(txt(d.getElementById('pcView'))) && txt(d.querySelector('#pcView .pc-price')) === '+210' && /Card Runner/.test(txt(d.getElementById('pcView'))) && /41\.0%/.test(txt(d.getElementById('pcView'))),
            `${how}: the suggestion's card is not its legs, price and chance: ` + txt(d.getElementById('pcView')));
          d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          chk(md.hidden && !d.getElementById('suggModal').hidden && d.activeElement === tb, `${how}: Escape on the card closed the suggestions under it too, or the focus did not go back to the tier`); }
        chk(w.eval('S').saved.map(p => p.id).join() === 'saved-before' && ioSets === 0, `${how}: finishing a suggestion saved it`);
        w.eval('closeSuggest()'); }
    }

    /* the owner's device: Save stays Save, and adds to X's parlays */
    { const o = await run({ role: 'owner', pay: pin, file: { updated: null, games: [], parlays: [] }, seed: w => w.localStorage.setItem(PROP_KEY, JSON.stringify({ stake: 25, saved: [], parlay: builder() })) });
      const sv = o.d.getElementById('pSave');
      chk(o.w.NFLSYNC.role() === 'owner' && !!sv && !o.d.getElementById('pFinish') && /^Save and lock this parlay$/.test(txt(sv)), 'the owner\'s builder does not offer Save and lock');
      if (sv) { sv.click(); await wait(80); }
      chk(o.w.eval('S').saved.length === 1 && Object.keys(o.w.eval('S').parlay).length === 0 && !(o.d.getElementById('pcModal') && !o.d.getElementById('pcModal').hidden), 'the owner\'s Save did not save the parlay, or opened the card');
      await wait(900);
      { const doc = o.store.node ? JSON.parse(o.store.node.doc.json) : null, id = o.w.eval('S').saved[0] && o.w.eval('S').saved[0].id;
        chk(!!doc && !!id && doc.prop.saved.some(x => x.id === id) && [...o.d.querySelectorAll('#lpCard .savedp')].some(c => /Card Runner/.test(txt(c))), 'the owner\'s saved parlay did not reach X\'s document and X Parlays'); } }

    /* the owner's device whose role is settled only after the builder was first drawn (sync.json
       slow to answer: the prop model waits six seconds for it, then boots on its own): Finish
       first, then Save and lock the moment the device is known to be the owner's */
    { const sl = await run({ role: 'owner', holdConf: true, pay: pin, file: { updated: null, games: [], parlays: [] }, seed: w => w.localStorage.setItem(PROP_KEY, JSON.stringify({ stake: 25, saved: [], parlay: builder() })) });
      const first = !!sl.d.getElementById('pFinish') && !sl.d.getElementById('pSave') && sl.w.NFLSYNC.role() == null;
      sl.release(); await wait(1500);
      chk(first && sl.w.NFLSYNC.role() === 'owner' && !!sl.d.getElementById('pSave') && !sl.d.getElementById('pFinish'),
        'a builder drawn before the device was known to be the owner\'s did not turn Finish into Save once it was: ' + sl.w.NFLSYNC.role()); }

    /* a browser that saved parlays before visitors stopped saving, opened as a reader, keeps them
       untouched; the day it opens the owner link they join X's document, nothing lost */
    { const r1 = await run({ role: 'reader', doc: xdoc, pay: pin, file: { updated: null, games: [], parlays: [] }, seed: w => { w.localStorage.setItem(PROP_KEY, blob()); w.localStorage.setItem('my_parlays_v1', myOld); } });
      chk(r1.w.NFLSYNC.role() === 'reader' && r1.w.eval('S').saved.map(p => p.id).join() === 'saved-before' && r1.store.writes === 0 && !!r1.w.localStorage.getItem('xparlays_v1') && !/Kyle Pitts/.test(txt(r1.d.getElementById('tab-parlay'))),
        'a reader\'s own saved parlay was lost or drawn, or the reader wrote');
      const kept = all(r1.w);
      const o2 = await run({ role: 'owner', store: r1.store, pay: pin, file: { updated: null, games: [], parlays: [] }, seed: w => { for (const [k, v] of Object.entries(kept)) w.localStorage.setItem(k, v); } });
      await wait(900);
      const doc = o2.store.node ? JSON.parse(o2.store.node.doc.json) : null;
      chk(o2.w.NFLSYNC.role() === 'owner' && o2.w.NFLSYNC.state().joined === 1 && !!doc && ['x1', 'saved-before'].every(id => doc.prop.saved.some(x => x.id === id))
        && [...o2.d.querySelectorAll('#lpCard .savedp')].some(c => /Kyle Pitts/.test(txt(c))),
        'the saved parlay a browser kept as a reader did not join X\'s document when it became the owner\'s: ' + JSON.stringify(doc && doc.prop.saved.map(x => x.id))); }
  }

  // ---- I. the file's own shape is what a person would write ----
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8'));
  chk(Array.isArray(real.games) && Array.isArray(real.parlays), 'liveparlays/parlays.json is not the shape the page reads');
  chk(typeof real.how === 'string' && /stat/.test(real.how), 'the file does not explain how to edit itself');
  const shaped = await run({ file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
    { id: 'x', week: 2, stake: 5, legs: [legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true)] }] } });
  chk(shaped.d.querySelectorAll('.sp-leg').length === 1, 'a hand-written parlay did not render');
  chk(knob(shaped.d.querySelector('.sp-leg')) === '86', 'a hand-written parlay is not tracked');

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));
