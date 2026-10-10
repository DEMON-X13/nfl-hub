/* Check the X Parlays section of the built Bets and Stats page.
 *
 *   node nflbets/build/smoke_live.js        (from the hub root)
 *
 * The section reads liveparlays/parlays.json, the scoreboard and the box scores, and draws one
 * list, X Parlays: the parlays in the file, the same on every device, read only everywhere. A
 * parlay the file marks cleared is not drawn. No device keeps a list of its own: the Parlay
 * Builder finishes a parlay as a card to download (nflbets/build/card.html), saved nowhere. There
 * is no owner, no sign-in and no shared store: the page writes nothing anywhere but the browser's
 * own storage. The test boots the whole page against a stubbed file and a stubbed ESPN, with the
 * real payload and state, opens the X Parlays tab and checks what the section renders, on a
 * browser with nothing of its own and on one that carries what the retired owner and reader layers
 * left (their flags, their copies of the old shared document), which must show exactly the file
 * and lose none of its own. Every request every run makes is recorded: one to the retired store or
 * its sign-in services, or one that is not a read, fails the run. Section J is the card: Finish,
 * the window, the image (a canvas stubbed with a recorder, since jsdom draws nothing), every dollar
 * figure whole on a long shot, and that finishing writes nothing anywhere. jsdom and PapaParse are
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
/* the retired store and its sign-in and token services: no page may ask any of them anything */
const RETIRED = /firebaseio\.com|firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|googleapis\.com\/identitytoolkit|store\.test/;
/* every request of every run, and the ones that broke the rule: a request to the retired store,
   or anything but a read */
const ALL_CALLS = [], BAD_CALLS = [];
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
   keeps every piece of text drawn on it (and the font it was drawn in), a toBlob that hands back a
   blob of the type asked for, a blob address, and a download that is an anchor clicked, recorded.
   Its measure is a wide face's: figures ($ + , . and digits) at 0.68 of the font size, as bold
   digits in the fallback faces phones and Chromium draw with when the page's fonts are not there,
   the rest at 0.55, so a figure that would be cut on a real canvas is cut on this one */
function stubDraw(w) {
  const rec = { texts: [], draws: [], canvases: [], blobs: [], clicks: [], urls: [] };
  const em = (x, font) => [...String(x)].reduce((a, ch) => a + (/[\d$+,.\u2212-]/.test(ch) ? 0.68 : 0.55), 0) * (parseFloat((String(font).match(/([\d.]+)px/) || [])[1]) || 10);
  w.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null;
    rec.canvases.push(this);
    const st = { font: '10px sans-serif' };
    return new Proxy(st, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'measureText') return x => ({ width: em(x, t.font) });
        if (k === 'fillText') return x => { rec.texts.push(String(x)); rec.draws.push({ t: String(x), font: String(t.font) }); };
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
const PROP_KEY = PART2_SEASON[2], SEA = +PART2_SEASON[1];
/* the betting app's own key and season, which the X Bet Log's keys are named for */
const { BET_KEY, SEASON: BET_SEASON } = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
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

/* the parlay file a run reads in place of the real one (file), what the scoreboard says (state:
   pre, in or post), whether ESPN and the file answer (espn, data), what the browser holds before
   the page opens (seed), the payload as changed for the run (pay), and the X Bet Log's file
   (xbets). Every request is in calls, with its method; a request to the retired store, or one
   that is not a read, is refused and kept in BAD_CALLS, which fails the smoke. */
function run({ file = FILE, state = 'in', espn = 'ok', data = 'ok', seed = () => {}, pay = x => x, xbets = null } = {}) {
  return new Promise(resolve => {
    const calls = [], methods = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: URL_,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        try { seed(w); } catch (e) {}
        w.fetch = (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase(); calls.push(s); methods.push(m); ALL_CALLS.push(m + ' ' + s);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); return Promise.reject(new TypeError('Failed to fetch')); }
          if (s.includes('parlays.json')) return data === 'ok'
            ? Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(file)) })
            : Promise.resolve({ ok: false, status: 404 });
          if (s.includes('xbets.json')) return Promise.resolve(xbets ? { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(xbets)) } : { ok: false, status: 404 });
          /* the page around the section: its own season and the betting model's */
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => pay(JSON.parse(PAYLOAD)) });
          if (s.includes('state.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(STATE) });
          if (!/espn\.com/.test(s)) return Promise.resolve({ ok: false, status: 404 });
          return espn === 'ok'
            ? Promise.resolve({ ok: true, status: 200, json: async () => s.includes('/summary?') ? SUM : sb(state) })
            : Promise.resolve({ ok: false, status: 403 });
        };
        /* the section draws once the prop model is up and its builder has been drawn */
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, calls, methods }), 400));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, calls, methods, timedOut: true }), 20000);
  });
}
/* everything a browser holds, key by key */
const allKeys = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };

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

  // ---- C. the file is X Parlays: nothing a browser holds is drawn, and nothing of it is written ----
  chk(!/api\.github\.com/.test(HTML), 'the page still talks to the GitHub API');
  {
    const seed = w => { w.localStorage.setItem(PROP_KEY, propBlob()); w.localStorage.setItem(BET_KEY, betBlob()); };
    /* the browser's own saved parlay, builder and betting slip are drawn nowhere, though every one
       stays in its storage, untouched, with an old my_parlays_v1 */
    const myOld = JSON.stringify({ lines: { 'prop|mine|0': 22.5 }, removed: { 'bet|bb1': 1 }, kept: {} });
    const vis = await run({ seed: w => { seed(w); w.localStorage.setItem('my_parlays_v1', myOld); } });
    chk(!vis.d.getElementById('myCard') && !vis.d.getElementById('myApp') && vis.d.querySelectorAll('.savedp').length === 2 && vis.d.querySelectorAll('#lpCard .savedp').length === 2,
      'a browser\'s own parlays are drawn beside X\'s, or a list of its own is in the page: ' + vis.d.querySelectorAll('.savedp').length + ' cards');
    chk(!/Your parlays/i.test(txt(vis.d.getElementById('tab-parlay'))) && !/Kyle Pitts Receiving Yards/.test(txt(vis.d.getElementById('tab-parlay'))), 'the X Parlays tab still says Your parlays, or shows the browser\'s own parlay');
    chk([...vis.d.querySelectorAll('#lpCard .savedp .pill')].filter(x => /prop model|betting model/.test(txt(x))).length === 0, 'a parlay from the prop or betting model is drawn as X\'s');
    chk(vis.w.eval('S').saved.length === 1 && vis.w.eval('S').saved[0].id === 'mine' && JSON.parse(vis.w.localStorage.getItem(PROP_KEY)).saved[0].id === 'mine',
      'a browser\'s saved parlay was lost from its own storage');
    chk(vis.w.localStorage.getItem('my_parlays_v1') === myOld && vis.w.localStorage.getItem(BET_KEY) === betBlob(), 'a browser\'s my_parlays_v1 or betting key was rewritten');
    /* the browser's own copy of a parlay the file also has is not drawn: the file's is */
    const two = await run({ seed, file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'mine', week: 2, stake: 99, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 99.5, 'over', true)] }] } });
    chk(/\$99\.00/.test(txt(two.d.getElementById('lpCard'))) && !/\$15\.00/.test(txt(two.d.getElementById('tab-parlay'))), 'the placed copy is not X\'s, or the browser\'s own copy is drawn');
  }

  // ---- C2. a parlay still in this browser's builder is the browser's: not drawn in X Parlays ----
  {
    const b = await run({ seed: w => w.localStorage.setItem(PROP_KEY, workBlob()), file: { updated: null, games: [], parlays: [] } });
    chk(!b.d.querySelector('#lpCard .savedp') && txt(b.d.getElementById('app')) === 'Nothing to watch yet' && Object.keys(b.w.eval('S').parlay).length === 2,
      'a browser\'s builder parlay is drawn as one of X\'s, or the builder lost its legs: ' + txt(b.d.getElementById('app')));
    chk(!/in the builder|builder at kickoff/.test(txt(b.d.getElementById('lpCard'))), 'X Parlays still marks a parlay as in a builder');
  }

  // ---- C3. a builder parlay whose first game kicks off drops the leg, and nothing keeps a copy ----
  {
    /* Bijan's leg is on CAR at ATL, which has kicked off, so the builder drops it on load; the
       money line is on a game still to come and stays. The schedule is pinned so the case holds in
       any week of any season: CAR at ATL in the past, two other games in the future. */
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
    const kv = await run({ pay: pin, seed: w => w.localStorage.setItem(PROP_KEY, atKick()), file: { updated: null, games: [], parlays: [] } });
    chk(Object.keys(kv.w.eval('S').parlay).length === 1 && !!kv.w.eval('S').parlay[L2key], 'the builder should drop the leg whose game kicked off: ' + Object.keys(kv.w.eval('S').parlay).join(', '));
    chk(kv.w.localStorage.getItem('my_parlays_v1') === null && kv.w.localStorage.getItem('live_parlays_v1') === null && !kv.d.querySelector('.savedp') && typeof kv.w.lpKeep === 'undefined',
      'a builder at kickoff was kept, written or drawn: ' + kv.w.localStorage.getItem('live_parlays_v1'));
  }

  // ---- C4. two parlays in the file alike but for the side or the player are two parlays ----
  {
    const ml = (gi, team) => ({ game: gi, player: { ATL: 'Falcons', CAR: 'Panthers' }[team], team, stat: 'ml', line: 0, side: 'over', main: false });
    const file = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'falcons-over', week: 2, stake: 5, legs: [ml(0, 'ATL'), { game: 0, player: 'Total', team: 'ATL', stat: 'total', line: 36.5, side: 'over', main: true }] },
      { id: 'panthers-over', week: 2, stake: 5, legs: [ml(0, 'CAR'), { game: 0, player: 'Total', team: 'ATL', stat: 'total', line: 36.5, side: 'over', main: true }] },
      { id: 'pitts-3', week: 2, stake: 5, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receptions', 3, 'over', true)] },
      { id: 'bijan-3', week: 2, stake: 5, legs: [legF(0, 'Bijan Robinson', 'ATL', 'receptions', 3, 'over', true)] }] };
    const x = await run({ file });
    const t = [...x.d.querySelectorAll('.savedp')].map(c => txt(c));
    chk(t.length === 4 && t.some(c => /Falcons To Win/.test(c)) && t.some(c => /Panthers To Win/.test(c)), 'the file\'s Falcons and Panthers parlays are not both drawn: ' + t.length + ' cards');
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
  chk(!!d.getElementById('now') && !d.getElementById('every') && !d.getElementById('ver') && !d.getElementById('clear'), 'Refresh now stays; the interval picker, the build pill and Clear settled go');
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

  // ---- D1. X's parlays are read only on every device: nothing to delete, clear or bring back ----
  {
    const live = await run({ state: 'in' });
    chk(!live.d.getElementById('clear') && !live.d.getElementById('restoreAll'), 'Clear settled, or the way back, is still on the page');
    chk(/\[hidden\]\{display:none!important\}/.test(HTML), 'a hidden button is still drawn: the .btn display rule beats the hidden attribute without this');
    chk(live.d.querySelectorAll('#lpCard .savedp').length === 2 && !live.d.querySelector('#lpCard [data-rm], #lpCard .hidebtn, #lpCard button:not(#now)'), 'a placed parlay offers a delete, or X Parlays offers a control beside Refresh now');
    /* the section only: the Props game list carries its own LIVE pill once a real game has kicked off */
    chk(!live.d.querySelector('#lpCard .pill.warn') && !/\d of \d in/.test(txt(live.d.getElementById('lpCard'))), 'a running parlay still carries the "n of m in" tag');
    chk(typeof live.w.LIVE_IO === 'undefined' && typeof live.w.NFLSYNC === 'undefined' && live.w.localStorage.getItem('live_parlays_v1') === null, 'the shared key (LIVE_IO) or the sync layer is still on the page, or the section wrote a key');
    const done = await run({ state: 'post' });
    chk(done.d.querySelectorAll('#lpCard .savedp').length === 2 && done.d.querySelectorAll('#lpCard .pill.ok, #lpCard .pill.bad').length === 2, 'a finished parlay should still be drawn and say landed or gone');   /* the section only: the Props list has its own FINAL pills */
    /* a browser's own parlays, settled or not, saved before: drawn nowhere, nothing offered to clear
       them, and kept in its storage as they were */
    const ownBlob = JSON.stringify({ stake: 5, saved: [
      { id: 'own-won', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 43.5, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 }] },
      { id: 'own-lost', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 20.5, side: 'under', main: true, name: 'Chuba Hubbard', team: 'CAR', week: 2 }] }] });
    const mine = await run({ state: 'post', seed: w => { w.localStorage.setItem(PROP_KEY, ownBlob); w.localStorage.setItem(BET_KEY, betBlob()); } });
    chk(mine.d.querySelectorAll('.savedp').length === 2 && mine.d.querySelectorAll('#lpCard .savedp').length === 2 && !mine.d.querySelector('[data-rm]'),
      'a browser\'s own settled parlays or betting slip are drawn, or offered to delete');
    chk(mine.w.eval('S').saved.map(p => p.id).join() === 'own-won,own-lost' && mine.w.localStorage.getItem(BET_KEY) === betBlob() && mine.w.localStorage.getItem('my_parlays_v1') === null,
      'a browser\'s own saved parlays or betting slip were touched, or a key of its own was written');
  }

  // ---- D2. the line X took is the file's: no pencil, nothing to correct on the page ----
  {
    const one = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'k', week: 2, stake: 5, legs: [
        legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 41.5, 'over', true)] }] };
    const ro = await run({ file: one });
    chk(!ro.d.querySelector('#lpCard [data-edit], #lpCard [data-reset], #lpCard [data-stake-of], #lpCard .lineInput') && txt(ro.d.querySelector('#lpCard .lineLbl')) === '41.5' && target(ro.d.querySelector('#lpCard .sp-leg.prop')) === '41.5+',
      'a placed parlay\'s line or stake can be changed on the page, or the line drawn is not the file\'s');
    chk(!/moved from/.test(txt(ro.d.getElementById('lpCard'))), 'a line the file has is drawn as moved');
    /* a browser that kept a corrected line under the old shared key draws the file's line, not its own */
    const old = await run({ file: one, seed: w => w.localStorage.setItem('live_parlays_v1', JSON.stringify({ lines: { 'file|k|0': 60.5 }, removed: { 'file|k': 1 } })) });
    chk(old.d.querySelectorAll('#lpCard .savedp').length === 1 && txt(old.d.querySelector('#lpCard .lineLbl')) === '41.5',
      'a correction or a deletion the browser kept under the old shared key still changes X Parlays: ' + txt(old.d.getElementById('lpCard')).slice(0, 120));
  }

  // ---- K. a cleared parlay stays in the file as history and is not drawn, nor its games read ----
  {
    const file = { updated: '2026-10-10T17:28:45Z', games: ['2026_02_CAR_ATL', '2026_02_NO_BAL'], parlays: [
      { id: 'night', cleared: true, week: 2, stake: 10, price: 200, payout: 30, legs: [legF(1, 'Derrick Henry', 'BAL', 'rushing_yards', 70.5, 'over', true)] },
      FILE.parlays[1]] };
    const c = await run({ file });
    chk(c.d.querySelectorAll('#lpCard .savedp').length === 1 && !/Derrick Henry/.test(txt(c.d.getElementById('lpCard'))) && /Bijan Robinson/.test(txt(c.d.getElementById('lpCard'))),
      'a cleared parlay is drawn, or the one beside it is not: ' + c.d.querySelectorAll('#lpCard .savedp').length);
    chk(!c.calls.some(u => /\/summary\?event=403\b/.test(u)) && c.calls.filter(u => /\/summary\?event=401\b/.test(u)).length === 1, 'a cleared parlay\'s box score was read, or the other\'s was not: ' + c.calls.filter(u => u.includes('/summary?')).join(' '));
    /* the quiet line under the heading: the file's own word for when X's parlays last changed */
    { const up = txt(c.d.getElementById('lpUpdated')), want = new Date('2026-10-10T17:28:45Z').toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      chk(!!c.d.querySelector('#lpCard h2 + #lpUpdated') && up.includes('updated ' + want) && /^X.s placed parlays/.test(up), 'X Parlays does not say under its heading when the file last changed: ' + up); }
    /* every parlay cleared: the card says there is nothing to watch, and reads nothing from ESPN */
    const all = await run({ file: { updated: '2026-10-10T17:28:45Z', games: file.games, parlays: file.parlays.map(p => Object.assign({}, p, { cleared: true })) } });
    chk(txt(all.d.getElementById('app')) === 'Nothing to watch yet' && all.calls.filter(u => u.includes('/summary?')).length === 0,
      'with every parlay cleared X Parlays does not say there is nothing to watch, or read a box score: ' + txt(all.d.getElementById('app')));
    chk(/updated /.test(txt(all.d.getElementById('lpUpdated'))), 'with every parlay cleared the card lost its updated line');
    /* "cleared" means true and nothing else: a parlay marked false is drawn */
    const no = await run({ file: { updated: null, games: file.games, parlays: [Object.assign({}, FILE.parlays[0], { cleared: false })] } });
    chk(no.d.querySelectorAll('#lpCard .savedp').length === 1, 'a parlay marked cleared: false is not drawn');
  }

  // ---- L. the real file: every parlay X deleted is cleared, and the corrected line is in it ----
  {
    const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8'));
    chk(real.parlays.length >= 25 && real.parlays.filter(p => p.cleared === true).length >= 25, 'the 25 parlays X deleted are not kept in the file as cleared history');
    const sgp = real.parlays.find(p => p.id === 'w3-dk-sgp-5'), leg = sgp && sgp.legs[4];
    chk(!!leg && leg.player === 'Matthew Stafford' && leg.stat === 'passing_yards' && leg.side === 'under' && leg.line === 239.5,
      'the line X corrected (w3-dk-sgp-5, leg 4: Stafford\'s passing yards under) is not 239.5 in the file: ' + JSON.stringify(leg));
    /* drawn as it is when not cleared: the corrected line is what the leg is measured against */
    const shown = JSON.parse(JSON.stringify(real)); shown.parlays = shown.parlays.filter(p => p.id === 'w3-dk-sgp-5').map(p => Object.assign(p, { cleared: false }));
    const r = await run({ file: shown, state: 'post' });
    const row = [...r.d.querySelectorAll('#lpCard .sp-leg.prop')].find(x => /Matthew Stafford Passing Yards/.test(who(x)));
    chk(!!row && target(row) === 'under 239.5' && txt(row.querySelector('.lineLbl')) === '239.5', 'the corrected leg is not drawn on its line: ' + (row ? txt(row).slice(0, 120) : 'no row'));
    /* and as the file stands, X Parlays has nothing to watch */
    const now = await run({ file: real });
    if (!real.parlays.some(p => p.cleared !== true)) chk(txt(now.d.getElementById('app')) === 'Nothing to watch yet', 'with every parlay in the real file cleared, X Parlays does not say there is nothing to watch: ' + txt(now.d.getElementById('app')));
    chk(now.d.querySelectorAll('#lpCard .savedp').length === real.parlays.filter(p => p.cleared !== true).length, 'X Parlays does not draw exactly the real file\'s parlays that are not cleared');
  }

  // ---- N. a browser the retired layers left their mark on shows exactly the file, and keeps its own ----
  {
    /* what an owner's device or an old reader's carries: the owner link's secret, a sign-in session,
       the device id, the reader's mark, the rev it last saw, its copies of the old shared document
       (a merge base and a reader's last copy, each with a corrected line, and the section's key as the
       store last held it: the one line carried into the file, deletions and the slips it deleted), the
       X Bet Log's moved-in mark, its cache and a week that reached the store;
       and what is its own: the prop model's key, my_parlays_v1, the betting app's key and the log
       kept aside when it was shared */
    const xdoc = { prop: { saved: [{ id: 'x-old', week: 2, stake: 3, legs: [{ gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: true, name: 'Old Shared Receiver', team: 'ATL', week: 2 }] }], parlay: {} },
      live: { lines: { 'file|early|0': 50.5 }, removed: { 'file|night': 1 } } };
    const own = JSON.stringify({ stake: 25, saved: [{ id: 'own-1', week: 2, stake: 4, price: 300, payout: 16, legs: [{ gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: false, name: 'Own Receiver', team: 'ATL', week: 2 }] }], parlay: {} });
    const myOld = JSON.stringify({ lines: { 'prop|own-1|0': 4 }, removed: {}, kept: {} });
    const betOwn = JSON.stringify({ myPicks: {}, bets: { 1: { staked: 10, returned: 8.71, note: '' } }, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit: 100 } });
    const pre = JSON.stringify({ at: '2026-10-10T17:28:44Z', bets: { 1: { staked: 10, returned: 8.71, note: '' } }, deposit: 100 });
    const OLD = {
      nflowner_v1: 'the-old-owner-secret', nflsync_owner_v1: JSON.stringify({ uid: 'u', refreshToken: 'rt', idToken: 'it', exp: 1 }), nflsync_device_v1: 'dabc',
      xparlays_v1: JSON.stringify({ at: '2026-10-10T05:00:00Z', dropped: 0 }), nflsync_v1: 'r-old',
      nflsync_base_v1: JSON.stringify({ rev: 'r-old', revs: ['r-old'], doc: xdoc, hist: [] }),
      xparlays_cache_v1: JSON.stringify({ rev: 'r-old', at: '2026-10-10T05:00:00Z', doc: xdoc }),
      live_parlays_v1: JSON.stringify({ lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: { 'file|night': 1, 'file|w3-dk-sgp-5': 1, 'bet|s1': 1 }, bet: { dabc: [{ id: 's1', week: 2, type: 'parlay', stake: 1, legs: [] }] } }),
      ['xbets_joined_' + BET_SEASON]: JSON.stringify({ at: '2026-10-10T17:28:44Z', added: [1], differ: [] }), ['xbets_cache_' + BET_SEASON]: JSON.stringify({ weeks: { w1: { staked: 10, returned: 8.71, note: '' } } }),
      ['xbets_pending_' + BET_SEASON]: JSON.stringify({ at: '2026-10-10T17:28:44Z', ops: { 'weeks/w1': { staked: 10, returned: 8.71, note: '' } } }),
      [PROP_KEY]: own, my_parlays_v1: myOld, [BET_KEY]: betOwn, ['x_nfl_bets_preshare_' + BET_SEASON]: pre };
    /* the X Bet Log's file as it is, for this season: week 1 is the week waiting in the browser */
    const XB = Object.assign(JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'xbets.json'), 'utf8')), { season: BET_SEASON });
    XB.weeks = Object.assign({}, XB.weeks, { w1: { staked: 10, returned: 8.71, note: '' } });
    const o = await run({ seed: w => { for (const [k, v] of Object.entries(OLD)) w.localStorage.setItem(k, v); }, xbets: XB });
    await wait(300);
    const lp = o.d.getElementById('lpCard'), keys = allKeys(o.w);
    chk(!o.timedOut && lp.querySelectorAll('.savedp').length === 2 && !/Old Shared Receiver|Own Receiver/.test(txt(o.d.getElementById('tab-parlay'))) && txt(lp.querySelector('.lineLbl')) === '43.5',
      'a browser with the old owner\'s keys does not show exactly the file\'s parlays on the file\'s lines: ' + txt(lp).slice(0, 160));
    { const shown = o.d.body.cloneNode(true); shown.querySelectorAll('script, style').forEach(n => n.remove());
      chk(!o.d.querySelector('#ownerMark, #xpOwner, #xpSignIn, #xpSignOut, #xpSignInBox, #syncStamp') && !/\bowner\b|sign out|sign in|Not synced|Synced/i.test(txt(shown)),
        'a browser that was the owner\'s shows an owner mark, a sign-in or a sync stamp: ' + ((txt(shown).match(/.{0,60}(\bowner\b|sign out|sign in|Not synced|Synced).{0,60}/i) || [''])[0])); }
    chk(['nflowner_v1', 'nflsync_owner_v1', 'nflsync_device_v1', 'xparlays_v1', 'nflsync_v1', 'nflsync_base_v1', 'xparlays_cache_v1', 'live_parlays_v1', 'xbets_joined_' + BET_SEASON, 'xbets_cache_' + BET_SEASON, 'xbets_pending_' + BET_SEASON].every(k => !(k in keys)),
      'a flag or a copy the retired layers left was not taken out: ' + Object.keys(keys).join(', '));
    chk(keys.my_parlays_v1 === myOld && keys[BET_KEY] === betOwn && keys['x_nfl_bets_preshare_' + BET_SEASON] === pre && JSON.stringify(JSON.parse(keys[PROP_KEY]).saved) === JSON.stringify(JSON.parse(own).saved)
      && o.w.eval('S').saved.map(p => p.id).join() === 'own-1',
      'a browser\'s own data was touched: ' + JSON.stringify({ my: keys.my_parlays_v1 === myOld, bet: keys[BET_KEY] === betOwn, pre: keys['x_nfl_bets_preshare_' + BET_SEASON] === pre }));
    chk(typeof o.w.NFLSYNC === 'undefined' && typeof o.w.LIVE_IO === 'undefined' && o.w.XBETS && typeof o.w.XBETS.write === 'undefined' && typeof o.w.XBETS.signOut === 'undefined', 'the sync layer, the shared key or the X Bet Log\'s writer is still on the page');
    /* the builder finishes, on this browser too */
    chk(!!o.d.querySelector('#parlayBody') && !o.d.getElementById('pSave'), 'a browser that was the owner\'s still has Save and lock in the builder');
    /* what the old layers left that is not in the file (a line corrected on a parlay of the browser's
       own, a kept builder, a slip it never deleted, or a week that never reached the store) stays
       where it is, unread */
    const keep = { live_parlays_v1: JSON.stringify({ lines: { 'prop|own-1|0': 4.5 }, removed: {} }), ['xbets_pending_' + BET_SEASON]: JSON.stringify({ at: 'x', ops: { 'weeks/w6': { staked: 5, returned: 0, note: '' } } }) };
    const k2 = await run({ seed: w => { for (const [k, v] of Object.entries(keep)) w.localStorage.setItem(k, v); }, xbets: XB });
    await wait(300);
    const keys2 = allKeys(k2.w);
    chk(keys2.live_parlays_v1 === keep.live_parlays_v1 && keys2['xbets_pending_' + BET_SEASON] === keep['xbets_pending_' + BET_SEASON], 'a leftover holding something the files lack was deleted: ' + Object.keys(keys2).join(', '));
    for (const [what, v] of [['a kept builder', { kept: { k: { legs: [] } } }], ['a slip it never deleted', { removed: {}, bet: { d: [{ id: 's9', legs: [] }] } }], ['a key it never wrote', { lines: {}, other: 1 }],
      /* a line a browser corrected on one of X's placed parlays before the store (24 September), which
         the file does not have: on another leg, or on the carried leg at another number */
      ['a line corrected on another of X\'s legs', { lines: { 'file|w2-ml-3|0': 2.5 } }],
      ['the carried leg corrected to another number', { lines: { 'file|w3-dk-sgp-5|4': 250 }, removed: { 'file|w3-dk-sgp-5': 1 } }],
      ['the carried line beside one the file lacks', { lines: { 'file|w3-dk-sgp-5|4': 239.5, 'file|w4-dk-sgp-3|1': 6.5 } }]]) {
      const k3 = await run({ seed: w => w.localStorage.setItem('live_parlays_v1', JSON.stringify(v)) });
      chk(k3.w.localStorage.getItem('live_parlays_v1') === JSON.stringify(v), `the old shared key holding ${what} was deleted`); }
    /* the store's last section key as it stood, on its own, holds nothing the file lacks: it goes */
    { const v = { lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: { 'file|w3-dk-sgp-5': 1 } };
      const k4 = await run({ seed: w => w.localStorage.setItem('live_parlays_v1', JSON.stringify(v)) });
      chk(k4.w.localStorage.getItem('live_parlays_v1') === null, 'the old shared key holding only the line the file carries and a deletion was kept'); }
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

  // ---- J. every device finishes a parlay: a card to download, saved nowhere ----
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
    const all = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };
    /* what finishing must leave as it was: every key but the prop model's own, which the model
       rewrites as it likes, and in that one the saved list and the builder */
    const snap = x => { const a = all(x.w), pk = JSON.parse(a[PROP_KEY] || '{}'); delete a[PROP_KEY];
      return JSON.stringify({ a, saved: pk.saved, parlay: Object.keys(pk.parlay || {}).sort(), S: x.w.eval('JSON.stringify([S.saved, Object.keys(S.parlay).sort(), S.stake])') }); };
    /* every device finishes a parlay the same way: a plain browser, and one that was the owner's
       (the owner link's secret and a session still in it, which mean nothing now) */
    const wasOwner = w => { w.localStorage.setItem('nflowner_v1', 'the-old-owner-secret'); w.localStorage.setItem('nflsync_owner_v1', JSON.stringify({ uid: 'u', refreshToken: 'rt' })); };
    for (const [how, extra] of [['a plain browser', () => {}], ['a browser that was the owner\'s', wasOwner]]) {
      const v = await run({ pay: pin, file: { updated: null, games: [], parlays: [] }, seed: w => { w.localStorage.setItem(PROP_KEY, blob()); w.localStorage.setItem('my_parlays_v1', myOld); extra(w); } });
      const { w, d } = v, tab = d.getElementById('tab-parlay');
      const reads = () => v.methods.every(m => m === 'GET');
      const rec = stubDraw(w);
      /* the tab: X's card, the builder with its suggestions, nothing of the visitor's own */
      chk(!d.getElementById('myCard') && !/Your parlays/i.test(txt(tab)) && !!d.getElementById('lpCard') && !!d.getElementById('suggOpen') && d.querySelectorAll('#parlayBody tr.legrow').length === 2,
        `${how}: the X Parlays tab is not X's card and the builder with its two legs, or a list of the visitor's own is in it`);
      chk(!/saved-before|Kyle Pitts/.test(txt(tab)), `${how}: the visitor's saved parlay from before is drawn`);
      const fin = d.getElementById('pFinish');
      chk(!!fin && !d.getElementById('pSave') && /^Finish parlay$/.test(txt(fin)) && !fin.disabled, `${how}: the builder's save is not Finish parlay: ` + txt(d.querySelector('#parlayBody .actions')));
      if (!fin) continue;
      const before = snap(v), bad0 = BAD_CALLS.length;
      fin.click(); await wait(30);
      const md = d.getElementById('pcModal'), view = d.getElementById('pcView'), q = w.PARLAY_CARD.quote();
      const price = w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))').replace('-', '−');
      chk(!!md && !md.hidden && d.body.classList.contains('modal-open') && md.querySelector('[role="dialog"][aria-modal="true"]'), `${how}: Finish did not open the card's window`);
      chk(['Home Side', 'To win', 'Card Runner', 'Over 64.5 rushing yards', '−135', '+105'].every(t => txt(view).includes(t)), `${how}: the card is missing a leg, its market or its price: ` + txt(view));
      chk(txt(view.querySelector('.pc-price')) === price && new RegExp(`${q.useDec.toFixed(2)} decimal`).test(txt(view)) && txt(view).includes((100 / q.useDec).toFixed(1) + '% implied'),
        `${how}: the card's price is not the builder's: ${txt(view.querySelector('.pc-price'))} for ${price}`);
      { const pays = txt(d.querySelector('#parlayBody .bigp .payout')), m = [...view.querySelectorAll('.pc-money b')].map(txt);
        chk(m.length === 3 && m[0] === '$25.00' && m[1].replace(/,/g, '') === pays && txt(view).includes('Model’s chance all 2 land ' + (q.pr.corr * 100).toFixed(1) + '%'),
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
      chk(snap(v) === before && reads() && BAD_CALLS.length === bad0 && w.localStorage.getItem('my_parlays_v1') === myOld && w.localStorage.getItem('live_parlays_v1') === null,
        `${how}: finishing a parlay changed what the browser keeps, or sent something other than a read (${v.methods.filter(m => m !== 'GET').length} writes)`);
      chk(w.eval('S').saved.map(p => p.id).join() === 'saved-before' && ![...d.querySelectorAll('#tab-parlay .savedp')].some(c => /Card Runner/.test(txt(c))), `${how}: a finished parlay went into the saved list or onto the page`);
      /* the builder changed and finished again is the new parlay */
      w.eval('S.stake=40; save(); renderParlay()'); await wait(20);
      d.getElementById('pFinish').click(); await wait(20);
      chk(txt(d.querySelector('#pcView .pc-money b')) === '$40.00', `${how}: the card did not follow the builder's new stake`);
      d.getElementById('pcClose').click();
      /* a long shot: every dollar figure whole, thousands marked, in the window and on the image.
         The window's tiles may wrap but never cut (no ellipsis, no clipping, none narrower than
         its figure); the image's figures step down a size to fit three across, and a figure too
         wide even so takes a second row of tiles, the card that much taller */
      { const fmt = x => '$' + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const css = [...d.querySelectorAll('style')].map(e => e.textContent).join('\n');
        const rules = [...css.matchAll(/\.pc-money(?:\s+(?:b|div))?\s*\{([^}]*)\}/g)].map(x => x[1]);
        chk(rules.length >= 3 && !rules.some(r => /ellipsis|overflow\s*:\s*hidden|min-width\s*:\s*0/.test(r)),
          `${how}: the window's money tiles can cut a figure: ` + rules.filter(r => /ellipsis|overflow|min-width/.test(r)).join(' / '));
        const shot = async (stake, bp) => {
          w.eval(`S.stake=${stake}; S.bookPrice=${bp}; save(); renderParlay()`); await wait(20);
          d.getElementById('pFinish').click(); await wait(20);
          const q = w.PARLAY_CARD.quote(), want = [fmt(stake), fmt(stake * q.useDec), '+' + fmt(stake * q.useDec - stake)];
          const win = [...d.querySelectorAll('#pcView .pc-money b')].map(txt), n0 = rec.draws.length, c0 = rec.canvases.length;
          d.getElementById('pcDownload').click(); await wait(60);
          const drawn = rec.draws.slice(n0).filter(x => /\$/.test(x.t)), cv = rec.canvases[c0];
          d.getElementById('pcClose').click();
          return { want, win, drawn, h: cv ? cv.height : 0,
            whole: want.every(x => drawn.some(y => y.t === x)) && !drawn.some(y => y.t.includes('\u2026')),
            px: Math.min(...drawn.map(y => parseFloat((y.font.match(/([\d.]+)px/) || [])[1]) || 0)) }; };
        const a = await shot(20, 88000);
        chk(a.want[2] === '+$17,600.00' && a.win.join('|') === a.want.join('|'), `${how}: the window does not show a long shot's stake, payout and profit whole: ${a.win.join(' / ')} for ${a.want.join(' / ')}`);
        chk(a.whole && a.px >= 14 && a.px < 19, `${how}: the image cut a long shot's figures, or did not step them down to fit: ` + a.drawn.map(y => y.t + ' @' + y.font.split(' ')[1]).join(' | '));
        const b = await shot(100000, 500000);
        chk(b.whole && b.win.join('|') === b.want.join('|') && b.h === a.h + 2 * 66,
          `${how}: a figure too wide for three tiles across was cut, or the tiles did not take a second row (${a.h} then ${b.h} px): ` + b.drawn.map(y => y.t + ' @' + y.font.split(' ')[1]).join(' | '));
        w.eval('S.stake=40; S.bookPrice=null; save(); renderParlay()'); await wait(20);
        d.getElementById('pFinish').click(); await wait(20); }
      /* Start over empties the builder, and only the builder */
      d.getElementById('pcAgain').click(); await wait(30);
      chk(md.hidden && Object.keys(w.eval('S').parlay).length === 0 && !d.getElementById('pFinish') && w.eval('S').saved.map(p => p.id).join() === 'saved-before' && reads(),
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
        chk(!!tb && /^Finish parlay$/.test(txt(tb)) && !d.querySelector('#suggView [data-suggest-save]'), `${how}: a suggestion's save is not Finish parlay`);
        if (tb) { tb.click(); await wait(20);
          chk(!md.hidden && /Safe suggestion/i.test(txt(d.getElementById('pcView'))) && txt(d.querySelector('#pcView .pc-price')) === '+210' && /Card Runner/.test(txt(d.getElementById('pcView'))) && /41\.0%/.test(txt(d.getElementById('pcView'))),
            `${how}: the suggestion's card is not its legs, price and chance: ` + txt(d.getElementById('pcView')));
          d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          chk(md.hidden && !d.getElementById('suggModal').hidden && d.activeElement === tb, `${how}: Escape on the card closed the suggestions under it too, or the focus did not go back to the tier`); }
        chk(w.eval('S').saved.map(p => p.id).join() === 'saved-before' && reads(), `${how}: finishing a suggestion saved it`);
        w.eval('closeSuggest()'); }
    }

  }

  // ---- I. the file's own shape is what a person would write ----
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8'));
  chk(Array.isArray(real.games) && Array.isArray(real.parlays), 'liveparlays/parlays.json is not the shape the page reads');
  chk(typeof real.how === 'string' && /stat/.test(real.how) && /cleared/.test(real.how) && /Claude/.test(real.how), 'the file does not explain how to edit itself, or how a parlay is cleared');
  { const xb = JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'xbets.json'), 'utf8'));
    chk(typeof xb.how === 'string' && /Claude/.test(xb.how) && /staked/.test(xb.how) && /deposit/.test(xb.how) && Number.isInteger(xb.season) && xb.weeks && typeof xb.weeks === 'object'
      && Object.entries(xb.weeks).every(([k, v]) => /^w([1-9]|1\d|2[0-2])$/.test(k) && v.staked >= 0 && v.returned >= 0 && typeof v.note === 'string' && !/[<>]/.test(v.note))
      && (xb.deposit === null || xb.deposit >= 0) && !isNaN(Date.parse(xb.updated)),
      'liveparlays/xbets.json is not the shape the X Bet Log reads, or does not explain how to edit itself'); }
  const shaped = await run({ file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
    { id: 'x', week: 2, stake: 5, legs: [legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true)] }] } });
  chk(shaped.d.querySelectorAll('.sp-leg').length === 1, 'a hand-written parlay did not render');
  chk(knob(shaped.d.querySelector('.sp-leg')) === '86', 'a hand-written parlay is not tracked');

  // ---- M. no run asked the retired store anything, and nothing any run sent was a write ----
  chk(ALL_CALLS.length > 100 && BAD_CALLS.length === 0, 'a page asked the retired store or its sign-in services, or sent a write: ' + BAD_CALLS.slice(0, 5).join(' | '));
  chk(!/firebaseio|identitytoolkit|securetoken/.test(HTML), 'the built page still names the retired store or its sign-in services');

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));
