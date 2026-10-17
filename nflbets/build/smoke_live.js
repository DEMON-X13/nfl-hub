/* Check the X Parlays section of the built NFL Hub page (the site's root, index.html, since 17 October
 * 2026; nflbets/ until then).
 *
 *   node nflbets/build/smoke_live.js        (from the hub root)
 *
 * The section reads liveparlays/parlays.json, the scoreboard and the box scores, and draws one
 * list, X Parlays: the parlays in the file, the same on every device, read only everywhere. A
 * parlay the file marks cleared is not drawn. Every card has an X at its top right, the same for
 * every visitor: it asks "Clear this parlay?" and Clear takes the parlay off X Parlays in that
 * browser alone, kept under the section's own key (lp_cleared_here_v1) and sent nowhere (section
 * O). No device keeps a list of its own: the Parlay
 * Builder finishes a parlay as a card to download (nflbets/build/card.html), saved nowhere. There
 * is no owner, no sign-in and no shared store: the page writes nothing anywhere but the browser's
 * own storage. X Parlays is a tab of its own (#xparlays); the Parlay Builder (#parlay) is its choices
 * and the Top 50 lines over the builder, and Suggested Parlays (#suggest, app v111) each prime-time
 * game's own set of four levels, whose Finish opens the same card. The test boots the whole page against a stubbed file
 * and a stubbed ESPN, with the real payload and state, opens the X Parlays tab and checks what the section renders, on a
 * browser with nothing of its own and on one that carries what the retired owner and reader layers
 * left (their flags, their copies of the old shared document), which must show exactly the file
 * and lose none of its own. Every request every run makes is recorded: one to the retired store or
 * its sign-in services, or one that is not a read, fails the run. Section J is the card: Finish,
 * the window, the image (a canvas stubbed with a recorder, since jsdom draws nothing), every dollar
 * figure whole on a long shot, and that finishing writes nothing anywhere; Open in DraftKings and Share
 * link on made-up ids, a leg DraftKings has only at another number going on the slip at DraftKings'
 * number (app v109), named under the buttons, in the shared text and under its row in the builder, and
 * a leg with nothing to convert to named with why; and a Suggested Parlays set finished from its own
 * tab (app v111), live and then locked from the record's entry, each of its legs with an Add of its
 * own. jsdom and PapaParse are borrowed from props/build; run npm ci there first.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const STATE = fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8');
const URL_ = 'https://demon-x13.github.io/nfl-hub/#xparlays';
/* the Parlay Builder's address, where section J finishes a parlay as a card */
const URL_PB = 'https://demon-x13.github.io/nfl-hub/#parlay';
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
/* (app v112) Suggested Parlays sets out one night at a time (the owner's call of 17 October 2026: "just show the next
   night game dont stack the mondy night game until monday morning"): the next prime-time night's games, from 6:00 AM
   Eastern on the morning after the latest prime-time night before it on the schedule (any week; none before it, at
   once). Worked out here on its own: a Thursday, Sunday or Monday kickoff at or after 7:00 pm Eastern is prime time,
   and Eastern time is read through the time zone database (Intl), never the page's own helpers */
const PRIME_NIGHT_L = { 4: 'Thursday night', 0: 'Sunday night', 1: 'Monday night' };
const primeL = g => !!g && /^\d{4}-\d\d-\d\d$/.test(g.d || '') && PRIME_NIGHT_L[new Date(g.d + 'T12:00:00Z').getUTCDay()] != null && /^\d\d:\d\d$/.test(g.t || '') && g.t >= '19:00';
const etOffL = ms => { const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName');
  const m = tz && tz.value.match(/GMT([+-]\d+)/); return m ? +m[1] : -5; };
const etAtL = (day, hm) => { const naive = Date.parse(`${day}T${hm}:00Z`); let t = naive + 5 * 3600e3; for (let i = 0; i < 3; i++) t = naive - etOffL(t) * 3600e3; return t; };
const etSayL = ms => new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET';
/* when a night (its first game g, the schedule sched) goes up: null for at once, and the line the tab says until then */
const nightOpenL = (g, sched) => { const prev = sched.filter(x => primeL(x) && x.d < g.d).map(x => x.d).sort().pop() || null;
  return { prev, open: prev ? etAtL(new Date(Date.parse(prev + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10), '06:00') : null, pg: prev ? sched.filter(x => primeL(x) && x.d === prev).length : 0 }; };
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
function run({ file = FILE, state = 'in', espn = 'ok', data = 'ok', seed = () => {}, pay = x => x, xbets = null, url = URL_ } = {}) {
  return new Promise(resolve => {
    const calls = [], methods = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url,
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
    chk(!/Your parlays/i.test(txt(vis.d.getElementById('tab-xparlays'))) && !/Kyle Pitts Receiving Yards/.test(txt(vis.d.getElementById('tab-xparlays')) + txt(vis.d.getElementById('tab-parlay'))), 'the X Parlays tab still says Your parlays, or the browser\'s own parlay is shown');
    chk([...vis.d.querySelectorAll('#lpCard .savedp .pill')].filter(x => /prop model|betting model/.test(txt(x))).length === 0, 'a parlay from the prop or betting model is drawn as X\'s');
    chk(vis.w.eval('S').saved.length === 1 && vis.w.eval('S').saved[0].id === 'mine' && JSON.parse(vis.w.localStorage.getItem(PROP_KEY)).saved[0].id === 'mine',
      'a browser\'s saved parlay was lost from its own storage');
    chk(vis.w.localStorage.getItem('my_parlays_v1') === myOld && vis.w.localStorage.getItem(BET_KEY) === betBlob(), 'a browser\'s my_parlays_v1 or betting key was rewritten');
    /* the browser's own copy of a parlay the file also has is not drawn: the file's is */
    const two = await run({ seed, file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'mine', week: 2, stake: 99, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 99.5, 'over', true)] }] } });
    chk(/\$99\.00/.test(txt(two.d.getElementById('lpCard'))) && !/\$15\.00/.test(txt(two.d.getElementById('tab-xparlays')) + txt(two.d.getElementById('tab-parlay'))), 'the placed copy is not X\'s, or the browser\'s own copy is drawn');
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
    /* every game over: all three are under Finished; while it is on, only a gone one is, after every live one */
    const finOf = r => { const app = r.d.getElementById('app'), h = app.querySelector('.lp-done'), kids = [...app.children], at = h ? kids.indexOf(h) : Infinity;
      return [...app.querySelectorAll('.savedp')].map(c => ({ c, fin: kids.indexOf(c) > at })); };
    chk(finOf(v).length === 3 && finOf(v).every(x => x.fin), 'with every game over a parlay is not under Finished');
    chk(finOf(live).every(x => x.fin === /\bgone\b/.test(txt(x.c.querySelector('.sp-head')))),
      'with the game on, a parlay is under Finished though not gone, or a gone one is still among the live ones');
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
  /* X Parlays is the whole of its own tab, opened at its address; the builder is the Parlay Builder
     tab's, under its choices and the Top 50 lines (#pbPanel), and Suggested Parlays (#suggest, app v111)
     is a tab of its own, without the builder: no list of a visitor's own anywhere */
  const lpc = d.getElementById('lpCard'), tx = d.getElementById('tab-xparlays'), tb = d.getElementById('tab-parlay'), ts = d.getElementById('tab-suggest');
  chk(!!lpc && !!tx && tx.firstElementChild === lpc && !lpc.nextElementSibling && !tx.hidden && tb.hidden && txt(d.querySelector('#tabs button[aria-selected="true"]')) === 'X Parlays'
    && tb.firstElementChild.id === 'pbPanel' && (tb.firstElementChild.nextElementSibling || {}).id === 'parlayBody' && !tb.querySelector('#lpCard')
    && !!ts && ts.hidden && (ts.firstElementChild || {}).id === 'spPanel' && !ts.querySelector('#parlayBody, #pbPanel, #lpCard')
    && !d.getElementById('suggModal') && !d.getElementById('myCard') && !d.getElementById('myApp') && !d.getElementById('myClear'),
    'X Parlays is not the whole of its own tab (opened on #xparlays), the builder is not under the Parlay Builder\'s choices on its own tab, Suggested Parlays is not a tab of its own without the builder, or Your parlays is still in the page');
  chk(!/Your parlays/i.test(txt(tx)), 'the X Parlays tab still says Your parlays');
  { const body = d.body.cloneNode(true); body.querySelectorAll('script, style').forEach(n => n.remove());
    chk(/^X Parlays/.test(txt(lpc.querySelector('h2'))) && !/Live Parlays/i.test(body.textContent) && !/Live Parlays/i.test(d.title), 'the section is still called Live Parlays somewhere a reader sees it'); }
  chk(!d.getElementById('savedCard') && !d.getElementById('betParlays'), 'the old cards are still drawn');

  // ---- D1. X's parlays are read only on every device: nothing to delete, clear or bring back ----
  {
    const live = await run({ state: 'in' });
    chk(!live.d.getElementById('clear') && !live.d.getElementById('restoreAll'), 'Clear settled, or the way back, is still on the page');
    chk(/\[hidden\]\{display:none!important\}/.test(HTML), 'a hidden button is still drawn: the .btn display rule beats the hidden attribute without this');
    /* the one control a card carries is its X, which clears it on this device alone (section O) */
    chk(live.d.querySelectorAll('#lpCard .savedp').length === 2 && !live.d.querySelector('#lpCard [data-rm], #lpCard .hidebtn, #lpCard button:not(#now):not(.lp-x):not(#lpAskNo):not(#lpAskYes):not(#lpShowAll)'),
      'a placed parlay offers a delete, or X Parlays offers a control beside Refresh now and each card\'s X');
    /* the section only: the Props game list carries its own LIVE pill once a real game has kicked off */
    chk(!live.d.querySelector('#lpCard .pill.warn') && !/\d of \d in/.test(txt(live.d.getElementById('lpCard'))), 'a running parlay still carries the "n of m in" tag');
    chk(typeof live.w.LIVE_IO === 'undefined' && typeof live.w.NFLSYNC === 'undefined' && live.w.localStorage.getItem('live_parlays_v1') === null, 'the shared key (LIVE_IO) or the sync layer is still on the page, or the section wrote a key');
    const done = await run({ state: 'post' });
    chk(done.d.querySelectorAll('#lpCard .savedp').length === 2 && done.d.querySelectorAll('#lpCard .pill.ok, #lpCard .pill.bad').length === 2, 'a finished parlay should still be drawn and say landed or gone');   /* the section only: the Props list has its own FINAL pills */
    /* finished parlays stay in full view, last, under Finished with their count and when they
       clear themselves (the betting job's autoclear.py), and nothing is folded away */
    { const app = done.d.getElementById('app'), head = app.querySelector('.lp-done'), kids = [...app.children];
      chk(!!head && /^Finished/.test(txt(head)) && /^Finished2 · each clears itself the day after its last game$/.test(txt(head))
        && kids.indexOf(head) < kids.indexOf(app.querySelector('.savedp')) && !app.querySelector('details') && /None of X’s parlays is still live/.test(txt(app)),
        'finished parlays are not shown in full under "Finished" with their count and when they clear, with a line saying none is live: ' + txt(app).slice(0, 160)); }
    { const app = live.d.getElementById('app'), h = app.querySelector('.lp-done'), kids = [...app.children], at = h ? kids.indexOf(h) : Infinity;
      chk([...app.querySelectorAll('.savedp')].every(c => (kids.indexOf(c) > at) === /\bgone\b/.test(txt(c.querySelector('.sp-head')))),
        'mid-game a parlay is under Finished though it is not gone, or a gone one is still among the live ones'); }
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
    chk(!o.timedOut && lp.querySelectorAll('.savedp').length === 2 && !/Old Shared Receiver|Own Receiver/.test(txt(o.d.getElementById('tab-xparlays')) + txt(o.d.getElementById('tab-parlay'))) && txt(lp.querySelector('.lineLbl')) === '43.5',
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

  // ---- O. the X on every card: Clear this parlay?, and it is cleared on this device alone ----
  /* Every visitor sees the same X Parlays, with an X at the top right of every card, live or
     settled. The X asks first; Cancel, Escape and a click outside clear nothing; Clear takes that
     parlay off X Parlays in this browser, kept under the section's own key (lp_cleared_here_v1:
     the ids, each with when it was cleared), pruned of ids the file no longer has or has cleared,
     and never sent anywhere. Another browser still sees it. */
  {
    const HK = 'lp_cleared_here_v1';
    const seedHere = list => w => w.localStorage.setItem(HK, JSON.stringify(list));
    const at = '2026-10-12T20:00:00.000Z';
    const key = w => w.localStorage.getItem(HK);
    const ids = w => { try { return (JSON.parse(key(w)) || []).map(x => x.id).join(); } catch (e) { return 'junk'; } };
    const shownIds = d => [...d.querySelectorAll('#lpCard .savedp')].map(c => c.getAttribute('data-lp-id')).join();
    const xOf = (d, id) => [...d.querySelectorAll('#lpCard [data-lp-clear]')].find(b => b.getAttribute('data-lp-clear') === id);
    const dlg = d => d.getElementById('lpAsk');
    const key0 = (w, k, el) => (el || w.document.activeElement || w.document.body).dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ bubbles: true }, k)));
    /* every card has its X, live and settled: a real button, named, at the card's top right */
    for (const st of ['in', 'post']) {
      const r = await run({ state: st });
      const cs = [...r.d.querySelectorAll('#lpCard .savedp')];
      chk(cs.length === 2 && cs.every(c => { const b = c.firstElementChild;
        return c.querySelectorAll('.lp-x').length === 1 && b && b.matches('button.lp-x[type="button"][data-lp-clear]') && b.getAttribute('aria-label') === 'Clear this parlay'
          && b.getAttribute('data-lp-clear') === c.getAttribute('data-lp-id') && !!b.querySelector('svg[aria-hidden="true"]') && !txt(b); }),
        `a card ${st === 'post' ? 'settled' : 'live'} has no X of its own at its top right named "Clear this parlay": ` + cs.map(c => c.innerHTML.slice(0, 80)).join(' | '));
      chk(dlg(r.d) && dlg(r.d).hidden && r.w.localStorage.getItem(HK) === null, 'the Clear this parlay? window is open on load, or the page wrote its key before anything was cleared');
      r.w.close();
    }
    /* the X's look: a 44px target at the top right, clear of the header's chips (the card's
       padding and the header's own room hold the X, so the chips wrap before it on a phone), in
       the page's own tokens, so the hub look carries it */
    { const rule = (h, sel) => { const m = h.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1] : ''; };
      for (const [name, h] of [['the page', HTML]]) {
        const x = rule(h, '#lpCard .lp-x'), head = rule(h, '#lpCard .sp-head'), card = rule(h, '#lpCard .savedp');
        const px = (s, p) => +((s.match(new RegExp('(?:^|;)' + p + ':(-?[\\d.]+)px')) || [])[1]);
        const padR = +((card.match(/padding:[\d.]+px ([\d.]+)px/) || [])[1]);
        chk(/position:absolute/.test(x) && px(x, 'width') >= 44 && px(x, 'height') >= 44 && px(x, 'top') >= 0 && px(x, 'right') >= 0 && /position:relative/.test(card)
          && padR + px(head, 'padding-right') >= px(x, 'right') + px(x, 'width') && /var\(--muted\)/.test(x) && /#lpCard \.lp-x:focus-visible\{[^}]*var\(--ring\)/.test(h),
          `${name}: the X is not a 44px target at the card's top right clear of the header, in the page's tokens with a focus ring: ` + x + ' / ' + head + ' / ' + card);
        /* the window scrolls, its panel centred by its own auto margins, so a panel taller than a
           phone on its side still reaches Clear with the page behind held still */
        chk(/#lpCard \.lp-dlg\{[^}]*overflow-y:auto/.test(h) && /#lpCard \.lp-dlg\{[^}]*align-items:flex-start/.test(h) && /#lpCard \.lp-dlg-panel\{[^}]*margin:auto/.test(h),
          `${name}: the Clear this parlay? window does not scroll when its panel is taller than the screen: ` + rule(h, '#lpCard .lp-dlg') + ' / ' + rule(h, '#lpCard .lp-dlg-panel'));
        chk(/#lpCard \.lp-dlg\{[^}]*position:fixed/.test(h) &&/#lpCard \.lp-dlg-panel\{[^}]*background:var\(--panel\)[^}]*color:var\(--ink\)/.test(h) && /#lpCard \.lp-dlg-btns \.btn\{[^}]*min-height:44px/.test(h)
          && /#lpCard \.lp-here \.btn\{[^}]*min-height:44px/.test(h),
          `${name}: the Clear this parlay? window is not over the page in the page's tokens, or its buttons or Show them again are under 44px`);
      }
    }
    /* the X asks; Cancel, Escape and a click outside clear nothing, and the focus goes back to the X */
    const A = await run({ state: 'in' });
    /* a page with no X and no window (an older build) fails here once, rather than throwing below */
    const canRun = !!xOf(A.d, 'early') && !!dlg(A.d) && !!A.d.getElementById('lpAskYes');
    chk(canRun, 'X Parlays has no X on its cards or no Clear this parlay? window: the rest of section O cannot run');
    if (canRun) {
    { const { w, d, calls, methods } = A, n0 = calls.length;
      chk(shownIds(d) === 'early,night', 'the cards are not the file\'s: ' + shownIds(d));
      for (const how of ['Cancel', 'Escape', 'a click outside']) {
        const x = xOf(d, 'early'); x.focus(); x.click();
        const D = dlg(d), panel = D && D.querySelector('[role="alertdialog"]');
        chk(!!D && !D.hidden && !!panel && panel.getAttribute('aria-modal') === 'true' && txt(d.getElementById(panel.getAttribute('aria-labelledby'))) === 'Clear this parlay?'
          && txt(d.getElementById('lpAskWhat')) === '4-leg parlay · week 2 · +580 · sunday'
          && /on this device only/.test(txt(panel)) && /nothing is sent anywhere/.test(txt(panel)) && /clear themselves for everyone the day after their last game/.test(txt(panel))
          && d.activeElement === d.getElementById('lpAskNo') && txt(d.getElementById('lpAskNo')) === 'Cancel' && txt(d.getElementById('lpAskYes')) === 'Clear' && d.body.classList.contains('modal-open'),
          `the X does not open "Clear this parlay?" naming the parlay (legs, week, price), saying it is this device only and that X's parlays clear themselves for everyone, with the focus on Cancel (${how}): ` + txt(panel));
        /* Tab stays inside: from Clear to Cancel, and back from Cancel to Clear */
        if (how === 'Cancel') {
          d.getElementById('lpAskYes').focus(); key0(w, { key: 'Tab' });
          const fwd = d.activeElement === d.getElementById('lpAskNo');
          key0(w, { key: 'Tab', shiftKey: true });
          chk(fwd && d.activeElement === d.getElementById('lpAskYes'), 'Tab leaves the Clear this parlay? window');
          d.getElementById('lpAskNo').click();
        } else if (how === 'Escape') key0(w, { key: 'Escape' });
        else {
          /* a click inside the window is not outside it */
          d.getElementById('lpAskText').click();
          chk(!D.hidden, 'a click inside the Clear this parlay? window closed it');
          D.click();
        }
        chk(D.hidden && shownIds(d) === 'early,night' && key(w) === null && !d.body.classList.contains('modal-open') && d.activeElement === xOf(d, 'early'),
          `${how} cleared the parlay, left the window open, wrote the key or did not give the focus back to the X: ` + JSON.stringify({ hidden: D.hidden, shown: shownIds(d), key: key(w), focus: d.activeElement && d.activeElement.outerHTML.slice(0, 60) }));
      }
      /* Clear: exactly that parlay leaves, kept in this browser's own key with when it was cleared,
         the focus on the X now in its place, and nothing sent anywhere */
      const before = Date.now();
      xOf(d, 'early').click(); d.getElementById('lpAskYes').click();
      let st = null; try { st = JSON.parse(key(w)); } catch (e) {}
      chk(dlg(d).hidden && shownIds(d) === 'night' && Array.isArray(st) && st.length === 1 && st[0].id === 'early' && Date.parse(st[0].at) >= before - 1000 && Date.parse(st[0].at) <= Date.now() + 1000,
        'Clear did not take exactly that parlay off X Parlays, kept in this browser under ' + HK + ' with when: ' + JSON.stringify({ shown: shownIds(d), st }));
      chk(d.activeElement === xOf(d, 'night'), 'after a Clear the focus is not on the X that takes its place: ' + (d.activeElement && d.activeElement.outerHTML.slice(0, 60)));
      chk(calls.length === n0 && methods.every(m => m === 'GET'), 'clearing a parlay sent a request, or the page sent something but a read: ' + calls.slice(n0).join(' '));
      /* one left: a quiet line says one is cleared here, with the way back */
      chk(/^You cleared 1 parlay on this device ?Show it again$/.test(txt(d.querySelector('#app .lp-here'))) && !/Nothing to watch yet/.test(txt(d.getElementById('app'))),
        'with one parlay cleared the card does not say so quietly at its foot: ' + txt(d.querySelector('#app .lp-here')));
      /* the other too: the card says so quietly, with Show them again, and not that there is nothing to watch */
      xOf(d, 'night').click(); d.getElementById('lpAskYes').click();
      chk(shownIds(d) === '' && ids(w) === 'early,night' && /^You cleared 2 parlays on this device ?Show them again$/.test(txt(d.getElementById('app')))
        && d.activeElement === d.getElementById('lpShowAll') && !d.querySelector('#app .empty'),
        'with every parlay cleared on this device the card does not say so quietly with Show them again (the focus on it): ' + txt(d.getElementById('app')));
      /* Show them again: no window, the list emptied (the key gone), every card back, and their games read again */
      const n1 = calls.length;
      d.getElementById('lpShowAll').click();
      chk(dlg(d).hidden && shownIds(d) === 'early,night' && key(w) === null && !d.querySelector('#app .lp-here') && d.activeElement === xOf(d, 'early'),
        'Show them again did not bring every parlay back at once and empty the list: ' + JSON.stringify({ shown: shownIds(d), key: key(w) }));
      await wait(300);
      chk(calls.slice(n1).some(u => /parlays\.json/.test(u)) && calls.slice(n1).some(u => /\/summary\?event=401\b/.test(u)) && methods.every(m => m === 'GET'),
        'Show them again did not read the parlays\' games again, or sent something but a read: ' + calls.slice(n1).join(' '));
      w.close(); }
    /* Escape with the window open closes it alone: no window beneath it closes too */
    { const r = await run({ state: 'in' }), { w, d } = r;
      xOf(d, 'night').click();
      let other = 0; d.addEventListener('keydown', e => { if (e.key === 'Escape') other++; });
      key0(w, { key: 'Escape' });
      chk(dlg(d).hidden && other === 0 && d.activeElement === xOf(d, 'night'), 'Escape on the Clear this parlay? window reached the page beneath it');
      w.close(); }
    /* a double tap on the X: the second tap, landing a moment after the window opened (on Clear,
       which can sit under the X on a phone, or on the backdrop), neither clears nor closes; a key's
       click (no pointer) and a tap after the moment do */
    { const r = await run({ state: 'in' }), { w, d } = r;
      const tap = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      xOf(d, 'early').click();
      tap(d.getElementById('lpAskYes'));
      chk(!dlg(d).hidden && shownIds(d) === 'early,night' && key(w) === null, 'a second tap on Clear just after the window opened cleared the parlay without the visitor answering');
      tap(dlg(d));
      chk(!dlg(d).hidden, 'a second tap on the backdrop just after the window opened closed it');
      await wait(450);
      tap(d.getElementById('lpAskYes'));
      chk(dlg(d).hidden && shownIds(d) === 'night' && ids(w) === 'early', 'a tap on Clear once the window has been open a moment did not clear the parlay');
      w.close(); }
    /* the window is X Parlays' own: leaving the tab closes it, clearing nothing, and nothing hidden
       keeps the page held still or takes its keys */
    { const r = await run({ state: 'in' }), { w, d } = r;
      xOf(d, 'early').click();
      w.location.hash = '#parlay'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(60);
      chk(dlg(d).hidden && !d.body.classList.contains('modal-open') && shownIds(d) === 'early,night' && key(w) === null,
        'moving to another tab left the Clear this parlay? window open behind it, the page held still, or cleared the parlay');
      /* the focus on the Parlay Builder's own tab button, as the visitor who pressed it holds it: the
         tab bar is always there, where the tab's panel can have no control at all (once a week's
         games have all kicked off it says so and draws none, and the body, which cannot take the
         focus, left it on the hidden Cancel, so the check below read a Tab that moved nothing) */
      const b = d.querySelector('#tabs [data-tab="parlay"]'); try { b.focus(); } catch (e) {}
      chk(!!b && d.activeElement === b, 'the focus could not be put on the Parlay Builder\'s tab button, so Tab on another tab is not tried: ' + (d.activeElement && d.activeElement.outerHTML.slice(0, 60)));
      const was = d.activeElement; key0(w, { key: 'Tab' });
      chk(d.activeElement === was && d.activeElement !== d.getElementById('lpAskNo') && d.activeElement !== d.getElementById('lpAskYes'), 'Tab on another tab lands on the hidden window\'s buttons');
      let esc = 0; d.addEventListener('keydown', e => { if (e.key === 'Escape') esc++; });
      key0(w, { key: 'Escape' }, was);
      chk(esc === 1, 'Escape on another tab is taken by the hidden Clear this parlay? window');
      /* and the window open on a tab hidden without a hashchange closes at the next key */
      w.location.hash = '#xparlays'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(60);
      xOf(d, 'night').click(); d.getElementById('tab-xparlays').hidden = true;
      let esc2 = 0; d.addEventListener('keydown', e => { if (e.key === 'Escape') esc2++; });
      key0(w, { key: 'Escape' }, d.body);
      chk(dlg(d).hidden && esc2 === 1 && !d.body.classList.contains('modal-open') && key(w) === null, 'a Clear this parlay? window left open on a hidden tab still takes the keys');
      w.close(); }
    /* two tabs of the site in one browser share its storage: a clear in one is not undone by the
       other's older copy of the list (its Refresh now, or its own clear), and the other follows it */
    { const A2 = await run({ state: 'in' }), B2 = await run({ state: 'in' });
      /* jsdom keeps a storage for each window: B's is set to what the shared storage holds once A writes */
      const share = () => { const v = A2.w.localStorage.getItem(HK); if (v === null) B2.w.localStorage.removeItem(HK); else B2.w.localStorage.setItem(HK, v); };
      xOf(A2.d, 'early').click(); A2.d.getElementById('lpAskYes').click(); share();
      B2.d.getElementById('now').click(); await wait(300);
      chk(ids(B2.w) === 'early', 'Refresh now in a second tab wrote its older list over a clear made in the first: ' + key(B2.w));
      xOf(B2.d, 'night').click(); B2.d.getElementById('lpAskYes').click();
      chk(ids(B2.w) === 'early,night', 'a clear in a second tab lost the first tab\'s clear: ' + key(B2.w));
      /* the storage event: the other tab redraws on what the storage now holds */
      B2.w.localStorage.setItem(HK, JSON.stringify([{ id: 'early', at }].slice(0, 1)));
      B2.w.dispatchEvent(new B2.w.StorageEvent('storage', { key: HK }));
      chk(shownIds(B2.d) === 'night', 'a tab does not follow a change another tab made to the cleared list: ' + shownIds(B2.d));
      /* Show them again brings back the ones this tab shows as cleared, not one another tab clears after */
      B2.w.localStorage.setItem(HK, JSON.stringify([{ id: 'early', at }, { id: 'night', at }]));
      B2.d.getElementById('lpShowAll').click();
      chk(ids(B2.w) === 'night' && shownIds(B2.d) === 'early', 'Show them again in one tab brought back a parlay another tab cleared after it last read the list: ' + key(B2.w));
      await wait(300); A2.w.close(); B2.w.close(); }
    /* "None of X's parlays is still live" is said of X's file only when nothing is cleared here: X's
       two live parlays cleared on this device, a third already lost mid-game (CAR 17, ATL 20 is past
       an under 36.5), and the line speaks only for the one shown */
    { const file = JSON.parse(JSON.stringify(FILE));
      file.parlays.push({ id: 'dead', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ game: 0, player: 'Total', team: 'ATL', stat: 'total', line: 36.5, side: 'under', main: true }] });
      const r = await run({ state: 'in', file, seed: seedHere([{ id: 'early', at }, { id: 'night', at }]) });
      const t = txt(r.d.getElementById('app'));
      chk(shownIds(r.d) === 'dead' && !/None of X’s parlays is still live/.test(t) && /None of the parlays shown here is still live/.test(t),
        'with X\'s live parlays cleared on this device the card says none of X\'s parlays is still live: ' + t.slice(0, 160));
      const r2 = await run({ state: 'in', file });
      chk(shownIds(r2.d) === 'early,night,dead' && !/still live/.test(txt(r2.d.getElementById('app'))),
        'with nothing cleared and two of X\'s parlays live the card says none is still live: ' + txt(r2.d.getElementById('app')).slice(0, 160));
      r.w.close(); r2.w.close(); }
    /* the same browser after a reload: the parlay stays cleared, and its games are not followed */
    { const r = await run({ state: 'in', seed: seedHere([{ id: 'early', at }]) });
      chk(shownIds(r.d) === 'night' && ids(r.w) === 'early' && /^You cleared 1 parlay on this device/.test(txt(r.d.querySelector('#app .lp-here'))),
        'after a reload the parlay cleared on this device is back, or the list was lost: ' + shownIds(r.d));
      chk(!r.calls.some(u => /\/summary\?event=401\b/.test(u)) && r.calls.some(u => /\/summary\?event=403\b/.test(u)),
        'the games of a parlay cleared on this device are still followed, or the other\'s are not: ' + r.calls.filter(u => u.includes('/summary?')).join(' '));
      r.w.close(); }
    /* a fresh browser has every parlay: a clear is that device's alone */
    { const r = await run({ state: 'in' });
      chk(shownIds(r.d) === 'early,night' && key(r.w) === null, 'a fresh browser does not see every parlay in the file: ' + shownIds(r.d));
      r.w.close(); }
    /* pruned: an id the file no longer has, and one the file has cleared for everyone, leave the list */
    { const file = JSON.parse(JSON.stringify(FILE)); file.parlays[0].cleared = true;     /* night, cleared by the file */
      const r = await run({ file, seed: seedHere([{ id: 'early', at }, { id: 'long-gone', at }, { id: 'night', at }]) });
      chk(ids(r.w) === 'early' && JSON.parse(key(r.w))[0].at === at && shownIds(r.d) === '' && /^You cleared 1 parlay on this device/.test(txt(r.d.getElementById('app'))),
        'the list was not pruned to the ids the file still has and has not cleared: ' + key(r.w));
      const r2 = await run({ file, seed: seedHere([{ id: 'long-gone', at }, { id: 'night', at }]) });
      chk(key(r2.w) === null && shownIds(r2.d) === 'early', 'a list of ids the file no longer shows is not taken out of the browser: ' + key(r2.w));
      /* a file that does not answer prunes nothing: it cannot say what is gone */
      const r3 = await run({ data: 404, seed: seedHere([{ id: 'early', at }, { id: 'long-gone', at }]) });
      chk(ids(r3.w) === 'early,long-gone', 'with the file unread the list was pruned anyway: ' + key(r3.w));
      /* junk under the key: the page draws every parlay, and the junk goes */
      const r4 = await run({ seed: w => w.localStorage.setItem(HK, '{not json') });
      chk(shownIds(r4.d) === 'early,night' && key(r4.w) === null, 'junk under the key broke X Parlays or stayed: ' + shownIds(r4.d));
      for (const x of [r, r2, r3, r4]) x.w.close(); }
    /* a browser the retired owner layer marked: its flags go, the cleared list is the visitor's and stays */
    { const OLD2 = { nflowner_v1: 'the-old-owner-secret', nflsync_owner_v1: JSON.stringify({ uid: 'u' }), xparlays_v1: JSON.stringify({ at: '2026-10-10T05:00:00Z', dropped: 0 }),
        xparlays_cache_v1: JSON.stringify({ rev: 'r-old' }), live_parlays_v1: JSON.stringify({ lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: { 'file|night': 1 } }), [HK]: JSON.stringify([{ id: 'night', at }]) };
      const r = await run({ state: 'in', seed: w => { for (const [k, v] of Object.entries(OLD2)) w.localStorage.setItem(k, v); } });
      const keys = allKeys(r.w);
      chk(['nflowner_v1', 'nflsync_owner_v1', 'xparlays_v1', 'xparlays_cache_v1', 'live_parlays_v1'].every(k => !(k in keys)) && keys[HK] === OLD2[HK] && shownIds(r.d) === 'early'
        && r.d.querySelectorAll('#lpCard .lp-x').length === 1,
        'on a browser the retired owner layer marked, its flags stayed, or the cleared list was touched, or the card is not the same as anyone\'s: ' + JSON.stringify({ keys: Object.keys(keys), shown: shownIds(r.d) }));
      xOf(r.d, 'early').click(); r.d.getElementById('lpAskYes').click();
      chk(ids(r.w) === 'night,early' && shownIds(r.d) === '', 'on a browser the retired owner layer marked, Clear does not work as on any other');
      r.w.close(); }
    }
    A.w.close();
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
    /* DraftKings' ids for the two legs, made up (the payload's dk, as weekly.py bakes it: week, game,
       then the leg's key without the game, its side and DraftKings' point), each with a '#', and when
       they were read: the player ids (at) two hours ago, the game lines (glat) five, so the card
       dates the link by the older and still says every leg lands (under a day) */
    const DK_ML = 'SMOKE1#ml_' + g1.h, DK_EV = '880001', DK_RBS = { over: 'SMOKE2#rush_645', under: 'SMOKE2#rush_645u' };
    const stamp = ago => new Date(Date.now() - ago).toISOString().slice(0, 16) + 'Z';
    /* a read time as the card dates it, worked out here: weekday, month, day, time, Eastern */
    const readTxt = s => new Date(s).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
    const AT_P = stamp(2 * 3600e3), AT_G = stamp(5 * 3600e3);
    const dkMade = (at = AT_P, glat = AT_G) => ({ [String(wk)]: { [g1.id]: { event: DK_EV, [`team:${g1.h}|ml`]: DK_ML, [`team:${g1.a}|ml`]: 'SMOKE1#ml_' + g1.a, glat },
      [g2.id]: { event: '880002', 'card-rb|rushing_yards|over|64.5': DK_RBS.over, 'card-rb|rushing_yards|under|64.5': DK_RBS.under, at, glat } } });
    /* the book's prices on both legs' lines, so the card has a fair chance to lead with: the first game's
       two moneylines, and the runner's main line over and under at 64.5 (at 63.5 in the second browser,
       so his leg is on a line the payload has moved and its fair chance is the one-sided estimate) */
    const RB_LINE = { over: 64.5, under: 63.5 }, ML_G1 = { a: 115, h: -135 }, RB_PX = { over: 105, under: -125 };
    const pin = (P, side = 'over') => { for (const x of P.sched) { if (x.id === g1.id || x.id === g2.id || (other && x.id === other.id)) { x.d = '2099-12-31'; x.t = '13:00'; }
        if (x.id === g1.id) { x.mla = ML_G1.a; x.mlh = ML_G1.h; } }
      P.mkt = P.mkt || {}; P.mkt[String(wk)] = Object.assign({}, P.mkt[String(wk)], { 'card-rb': { rushing_yards: { line: RB_LINE[side], over: RB_PX.over, under: RB_PX.under, n: 'Card Runner', g: g2.id } } });
      P.dk = dkMade(); return P; };
    const mlKey = `${g1.id}|team:${g1.h}|ml`, rbKey = `${g2.id}|card-rb|rushing_yards`;
    /* the runner's main line is an Over in the first browser and an Under in the second, so a card
       that opened DraftKings' Over for an Under (or the other way) fails one of them */
    const Side = side => side === 'under' ? 'Under' : 'Over';
    const builder = (side = 'over') => ({
      [mlKey]: { gid: g1.id, pid: 'team:' + g1.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.58, price: -135, src: 'real', mu: null, name: 'Home Side', pos: 'Game', grp: 'TEAM', team: g1.h, opp: g1.a, week: wk, label: 'To win' },
      [rbKey]: { gid: g2.id, pid: 'card-rb', stat: 'rushing_yards', k: 64.5, side, main: true, p: 0.52, price: 105, src: 'real', mu: 66, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: Side(side) + ' 64.5 rushing yards' } });
    const oldSaved = [{ id: 'saved-before', saved: '2026-09-01T00:00:00Z', week: 2, stake: 4, price: 300, payout: 16, legs: [
      { gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: false, name: 'Kyle Pitts', team: 'ATL', week: 2 }] }];
    const blob = side => JSON.stringify({ stake: 25, saved: oldSaved, parlay: builder(side) });
    const myOld = JSON.stringify({ lines: { 'prop|saved-before|0': 4 }, removed: {}, kept: {} });
    const all = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };
    /* what finishing must leave as it was: every key but the prop model's own, which the model
       rewrites as it likes, and in that one the saved list and the builder */
    const snap = x => { const a = all(x.w), pk = JSON.parse(a[PROP_KEY] || '{}'); delete a[PROP_KEY];
      return JSON.stringify({ a, saved: pk.saved, parlay: Object.keys(pk.parlay || {}).sort(), S: x.w.eval('JSON.stringify([S.saved, Object.keys(S.parlay).sort(), S.stake])') }); };
    /* every device finishes a parlay the same way: a plain browser, and one that was the owner's
       (the owner link's secret and a session still in it, which mean nothing now) */
    const wasOwner = w => { w.localStorage.setItem('nflowner_v1', 'the-old-owner-secret'); w.localStorage.setItem('nflsync_owner_v1', JSON.stringify({ uid: 'u', refreshToken: 'rt' })); };
    for (const [how, extra, side] of [['a plain browser', () => {}, 'over'], ['a browser that was the owner\'s', wasOwner, 'under']]) {
      const v = await run({ url: URL_PB, pay: P => pin(P, side), file: { updated: null, games: [], parlays: [] }, seed: w => { w.localStorage.setItem(PROP_KEY, blob(side)); w.localStorage.setItem('my_parlays_v1', myOld); extra(w); } });
      const DK_RB = DK_RBS[side], rbLabel = Side(side) + ' 64.5 rushing yards';
      const { w, d } = v, tab = d.getElementById('tab-parlay');
      const reads = () => v.methods.every(m => m === 'GET');
      const rec = stubDraw(w);
      /* the tab: the suggested parlays and the builder with its two legs, nothing of the visitor's own */
      chk(!d.getElementById('myCard') && !/Your parlays/i.test(txt(tab)) && !tab.hidden && !!d.getElementById('pbPanel') && !tab.querySelector('#lpCard') && d.querySelectorAll('#parlayBody tr.legrow').length === 2,
        `${how}: the Parlay Builder tab is not the suggested parlays and the builder with its two legs, or a list of the visitor's own is in it`);
      chk(!/saved-before|Kyle Pitts/.test(txt(tab)), `${how}: the visitor's saved parlay from before is drawn`);
      /* the builder says under a leg what DraftKings' slip will do with it only where it will not go on
         as built (app v109): both legs here have DraftKings' id at their own line, so no row says anything.
         slipRows: each builder row's line about the slip, by the leg's own label */
      const slipRows = () => [...d.querySelectorAll('#parlayBody .dkslip')].map(s => [s.closest('tr.legrow') ? txt(s.parentElement.querySelector('b')) : '(outside a leg row)', txt(s)]);
      chk(slipRows().length === 0, `${how}: the builder says a leg DraftKings has at its own line will not go on as built: ` + JSON.stringify(slipRows()));
      const fin = d.getElementById('pFinish');
      chk(!!fin && !d.getElementById('pSave') && /^Finish parlay$/.test(txt(fin)) && !fin.disabled, `${how}: the builder's save is not Finish parlay: ` + txt(d.querySelector('#parlayBody .actions')));
      if (!fin) continue;
      const before = snap(v), bad0 = BAD_CALLS.length;
      fin.click(); await wait(30);
      const md = d.getElementById('pcModal'), view = d.getElementById('pcView'), q = w.PARLAY_CARD.quote();
      const price = w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))').replace('-', '−');
      chk(!!md && !md.hidden && d.body.classList.contains('modal-open') && md.querySelector('[role="dialog"][aria-modal="true"]'), `${how}: Finish did not open the card's window`);
      chk(['Home Side', 'To win', 'Card Runner', rbLabel, '−135', '+105'].every(t => txt(view).includes(t)), `${how}: the card is missing a leg, its market or its price: ` + txt(view));
      chk(txt(view.querySelector('.pc-price')) === price && new RegExp(`${q.useDec.toFixed(2)} decimal`).test(txt(view)) && txt(view).includes((100 / q.useDec).toFixed(1) + '% implied'),
        `${how}: the card's price is not the builder's: ${txt(view.querySelector('.pc-price'))} for ${price}`);
      { const pays = txt(d.querySelector('#parlayBody .bigp .payout')), m = [...view.querySelectorAll('.pc-money b')].map(txt);
        chk(m.length === 3 && m[0] === '$25.00' && m[1].replace(/,/g, '') === pays,
          `${how}: the card's stake or payout is not the builder's: ${m.join(' / ')} against ${pays}`); }
      /* the chance: the book's fair chance first, worked here from the prices pinned above (the money
         line's two sides with the margin out; the runner's over and under where his line is the
         payload's, else his price over the week's median overround, est.), the legs in different games
         so a plain product; then the model's and the price's. In the window, in the image and in the
         text Share link sends */
      const imp = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100), pc1 = p => (p * 100).toFixed(1) + '%';
      const fML = imp(ML_G1.h) / (imp(ML_G1.h) + imp(ML_G1.a));
      /* the week's median overround on its two-sided player lines: the pinned week's own, the runner's among them */
      const twoSided = Object.values(Object.assign({}, P0.mkt && P0.mkt[String(wk)], { 'card-rb': { rushing_yards: { over: RB_PX.over, under: RB_PX.under } } }))
        .flatMap(o => Object.values(o)).filter(L => L && L.over && L.under).map(L => imp(L.over) + imp(L.under)).sort((a, b) => a - b);
      const vigP = twoSided.length % 2 ? twoSided[twoSided.length >> 1] : (twoSided[twoSided.length / 2 - 1] + twoSided[twoSided.length / 2]) / 2;
      const fRB = side === 'over' ? imp(RB_PX.over) / (imp(RB_PX.over) + imp(RB_PX.under)) : Math.max(0.001, Math.min(0.999, imp(105) / vigP));
      const fair = q.legs.reduce((a, l) => a * (l.stat === 'ml' ? fML : fRB), 1), est = side !== 'over';
      const line1 = `Fair chance all 2 land ${pc1(fair)}${est ? ' (est.)' : ''}`, line2 = `model says ${pc1(q.pr.corr)} · the price says ${(100 / q.useDec).toFixed(1)}%`;
      chk(!!q.fair && Math.abs(q.fair.p - fair) < 1e-12 && q.fair.est === est && txt(view.querySelector('.pc-chance')).startsWith(line1 + ' ' + line2)
        && /Est\.: a leg is priced on one side only/.test(txt(view.querySelector('.pc-chance'))) === est,
        `${how}: the card does not lead with the fair chance (${line1}), then the model's and the price's: ` + txt(view.querySelector('.pc-chance')));
      chk(new RegExp(`^${wk <= 18 ? 'Week ' + wk : '(Wild Card|Divisional|Conference|Super Bowl)'}`).test(txt(view.querySelector('.pc-sub'))) && /Dec 31/.test(txt(view.querySelector('.pc-sub')))
        && /NFL Hub/.test(txt(view)) && txt(view.querySelector('.pc-foot b')) === 'demon-x13.github.io/nfl-hub' && !/nfl-hub\/nflbets/.test(txt(view)), `${how}: the card has no week and date, or no mark and the site's address (its root, demon-x13.github.io/nfl-hub): ` + txt(view.querySelector('.pc-head')) + ' / ' + txt(view.querySelector('.pc-foot')));
      chk(d.activeElement === d.getElementById('pcDownload'), `${how}: the window did not take the focus`);
      /* Open in DraftKings: one link to DraftKings' betslip, the legs' own ids in the card's order
         joined by +, each '#' as %23, in a new tab; under the buttons, what it opens and each leg's
         own link (DraftKings documents no link for several outcomes, so one at a time is offered too) */
      const DKU = ids => 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(x => x.replace(/#/g, '%23')).join('+');
      const order = q.legs.map(l => l.stat === 'ml' ? DK_ML : DK_RB);
      /* every leg on a line of its own in the shared text: its number, who, the bet and its price */
      const legsIn = t => q.legs.every((l, i) => new RegExp(`(^|\\n)${i + 1}\\. ${l.name}: ${l.label} \\([+-]\\d+\\)(\\n|$)`).test(t));
      const dkA = d.getElementById('pcDk'), note = () => d.getElementById('pcDkNote'), msg = () => txt(d.getElementById('pcMsg'));
      /* nothing promises that every leg will land: an id is DraftKings' outcome at one number, read once
         a game 12 to 35 hours before its kickoff, and DraftKings drops one whose line has moved since */
      const promises = t => /\bputs all\b|\bOpens all\b|\ball \d+ legs on\b|\(all \d+ legs\b|\bevery leg (lands|will)\b|\bat DraftKings’ own prices\b/i.test(t);
      /* what the note and the button say the link opens, dated by the read (or saying it is not recorded) */
      const opensNote = (which, at) => `${at ? 'DraftKings’ lines as read ' + readTxt(at) : 'When DraftKings’ lines were read is not recorded'}: Open in DraftKings opens ${which} as DraftKings had them ${at ? 'then' : 'when last read'}; a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet.`;
      const opensTitle = (which, at) => `Opens ${which} on DraftKings’ betslip, in a new tab, as DraftKings’ lines were ${at ? 'read ' + readTxt(at) : 'last read'}: a line moved or pulled since will not be on it, so check each leg is there`;
      /* the shared text's DraftKings lines: what the link opens, the link alone on its line, the read */
      const slipLines = (head, url, at) => `\nDraftKings betslip (opens ${head}):\n${url}\nDraftKings lines as ${at ? 'read ' + readTxt(at) : 'last read'}: a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet\n`;
      chk(!!dkA && !dkA.hidden && dkA.tagName === 'A' && dkA.getAttribute('href') === DKU(order) && dkA.getAttribute('target') === '_blank' && /\bnoopener\b/.test(dkA.getAttribute('rel') || '') && txt(dkA) === 'Open in DraftKings',
        `${how}: a parlay DraftKings has every leg of has no Open in DraftKings link to its betslip, in the card's order, in a new tab: ` + (dkA ? dkA.outerHTML : 'none'));
      chk(!!dkA && !!dkA.closest('.pc-actions') && dkA.nextElementSibling === d.getElementById('pcLink'), `${how}: Open in DraftKings and Share link are not side by side in the action row`);
      chk(/opens the 2 legs as DraftKings had them then/.test(txt(note())) && [...note().querySelectorAll('a[data-pc-dkleg]')].map(a => a.getAttribute('href')).join(' ') === order.map(x => DKU([x])).join(' ')
        && [...note().querySelectorAll('a')].every(a => a.getAttribute('target') === '_blank' && /noopener/.test(a.getAttribute('rel') || '')) && !note().querySelector('[data-pc-dkmiss]'),
        `${how}: the note under the buttons does not say what the link opens, or does not give each leg's own link: ` + txt(note()));
      /* the note is dated by the older read of the legs it opens (the game lines', five hours ago), and
         even so recent a read promises nothing: the legs as DraftKings had them then, and a line moved or
         pulled since is not on the slip. The button says the same */
      chk(txt(note()).startsWith(opensNote('the 2 legs', AT_G)) && dkA.getAttribute('title') === opensTitle('the 2 legs', AT_G) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')),
        `${how}: a read five hours old is not dated by the older read, or the note or the button promises every leg will land: ` + txt(note()) + ' / ' + dkA.getAttribute('title'));
      /* Share link: one text, the DraftKings link inside it, and no url of its own (the owner, October
         2026: on an iPhone the share sheet hands the text and a url as two items, Messages draws the url
         as a card showing only the domain and the sheet's Copy drops it, so the link "compressed" or went
         missing). The text: a line for every leg, the stake and what it pays, the chances, what the link
         opens, the betslip link itself alone on its line (every id, in the card's order), when DraftKings'
         lines were read and that a line moved since will not be on the slip, and the site's address last.
         canShare is asked about the same title and text; a cancel does nothing; with no share sheet, one
         that fails or one that cannot share it, the same text is copied, by the clipboard or a hidden box;
         never the image */
      { const nav = w.navigator, def = (k, v) => Object.defineProperty(nav, k, { value: v, configurable: true });
        const shared = [], copied = [], asked = [], clicks0 = rec.clicks.length, blobs0 = rec.blobs.length, canv0 = rec.canvases.length;
        const cash = [...view.querySelectorAll('.pc-money b')].map(txt), link = d.getElementById('pcLink');
        def('share', async x => { shared.push(x); }); def('clipboard', { writeText: async t => { copied.push(t); } }); def('canShare', x => { asked.push(x); return true; });
        chk(!!link && !link.hidden && txt(link) === 'Share link', `${how}: the card has no Share link`);
        link.click(); await wait(30);
        const s0 = shared[0] || {}, t0 = s0.text || '';
        chk(t0.includes(`\n${line1} · ${line2}\nDraftKings betslip (`), `${how}: Share link does not send the fair chance first, then the model's and the price's, then the DraftKings link: ` + JSON.stringify(t0));
        chk(shared.length === 1 && !('url' in s0) && !s0.files && JSON.stringify(Object.keys(s0).sort()) === '["text","title"]',
          `${how}: Share link handed the share sheet a url (or anything) beside its title and text, which an iPhone shows as a bare domain or drops: ` + JSON.stringify(s0));
        chk(asked.length === 1 && JSON.stringify(asked[0]) === JSON.stringify({ title: s0.title, text: t0 }), `${how}: canShare was not asked about the title and the text alone: ` + JSON.stringify(asked));
        chk(t0.split('\n').includes(DKU(order)) && dkA.getAttribute('href') === DKU(order) && t0.includes(slipLines('the 2 legs as DraftKings had them', DKU(order), AT_G)),
          `${how}: Share link's text does not carry the whole betslip link (every id, in the card's order) alone on its line, under what it opens and over the read: ` + JSON.stringify(t0));
        chk(s0.title === '2-leg parlay ' + price.replace('−', '-') && legsIn(t0) && t0.includes(`Stake ${cash[0]} · Pays ${cash[1]}`) && /\nDraftKings lines as read [^\n]*\ndemon-x13\.github\.io\/nfl-hub$/.test(t0)
          && !/Add by hand/.test(t0) && !promises(t0 + '\n' + s0.title) && !/ est\.\)| fair\)|\(.*price\)$/.test(t0 + '\n' + s0.title),
          `${how}: Share link did not send the title, every leg (book prices, unlabelled), the stake and payout, the read and the site last, or it promises every leg: ` + JSON.stringify(s0));
        chk(copied.length === 0 && rec.clicks.length === clicks0 && rec.blobs.length === blobs0 && rec.canvases.length === canv0, `${how}: Share link copied as well, or drew or downloaded the image`);
        /* a share sheet that cannot share it: the same text, copied */
        def('canShare', x => { asked.push(x); return false; }); link.click(); await wait(30);
        chk(shared.length === 1 && copied.length === 1 && copied[0] === t0 && msg() === 'Link copied', `${how}: a share sheet that cannot share the text did not copy the same text instead: ` + JSON.stringify(copied));
        delete nav.canShare; copied.length = 0;
        def('share', async x => { shared.push(x); throw new w.DOMException('The user cancelled', 'AbortError'); });
        const at = d.activeElement; link.click(); await wait(30);
        chk(shared.length === 2 && copied.length === 0 && msg() === '' && !md.hidden && rec.clicks.length === clicks0 && rec.blobs.length === blobs0 && d.activeElement === at,
          `${how}: cancelling the share sheet did something: ` + JSON.stringify({ copied, msg: msg() }));
        def('share', async () => { throw new w.DOMException('Not allowed', 'NotAllowedError'); });
        link.click(); await wait(30);
        chk(copied.length === 1 && copied[0] === t0 && msg() === 'Link copied', `${how}: a share sheet that failed did not copy the same text, the link in it and once, instead: ` + JSON.stringify(copied));
        delete nav.share;
        link.click(); await wait(30);
        chk(copied.length === 2 && copied[1] === t0 && copied[1].split(DKU(order)).length === 2 && msg() === 'Link copied',
          `${how}: with no share sheet the clipboard did not get the same text, the DraftKings link in it once: ` + JSON.stringify(copied.slice(1)));
        delete nav.clipboard; const cmds = [], boxed = []; d.execCommand = c => { cmds.push(c); const ta = md.querySelector('textarea'); boxed.push(ta ? ta.value : null); return true; };
        const at2 = d.activeElement; link.click(); await wait(30);
        chk(cmds.join() === 'copy' && boxed[0] === t0 && msg() === 'Link copied' && !md.querySelector('textarea') && d.activeElement === at2, `${how}: without the clipboard call the same text was not copied by a hidden box, or the box or the focus was left behind: ` + cmds.join() + ' ' + JSON.stringify(boxed));
        delete d.execCommand;
        chk(rec.clicks.length === clicks0 && rec.blobs.length === blobs0 && rec.canvases.length === canv0 && reads(), `${how}: Share link drew or downloaded the image, or sent a request`); }
      /* a leg DraftKings has only at another number goes on the slip at DraftKings' number (app v109, the
         owner's call of 16 October 2026: every leg on the slip, never "add by hand" where it can be helped):
         the button opens every leg, and the note, the shared text and the builder's row say which leg goes
         on as what, and that DraftKings prices it at its own line. A leg with nothing to convert to is named
         with why, and the button says how many of the legs it opens; none at all: the button and Share link
         still open DraftKings, the game's page where every leg is in one game, else its NFL page, every leg
         named with why (the owner's Monday night, 12 October 2026: Share link sent only the site's address) */
      { const reopen = async () => { d.getElementById('pcClose').click(); await wait(10); d.getElementById('pFinish').click(); await wait(20); };
        const nRb = q.legs.findIndex(l => l.pid === 'card-rb') + 1, shared = [];
        Object.defineProperty(w.navigator, 'share', { value: async x => { shared.push(x); }, configurable: true });
        /* the runner's own line gone from DraftKings' ids, two others in its place, 63.5 and 65. In the
           first browser his main line in PAY.mkt is 64.5, which DraftKings no longer has, so the closest
           number takes it (65, a point off where 63.5 is a point and a half); in the second it is 63.5, the
           page's main line, which DraftKings has, so that one does, though 65 is nearer his leg's 64.5 */
        const wantP = side === 'over' ? 65 : 63.5, wantId = side === 'over' ? 'SMOKE2#rush_65' : 'SMOKE2#rush_635', asRb = `${Side(side)} ${wantP} rushing yards`;
        const moved = q.legs.map(l => l.stat === 'ml' ? DK_ML : wantId);
        w.eval(`{ const E=PAY.dk['${wk}']['${g2.id}']; delete E['card-rb|rushing_yards|${side}|64.5']; E['card-rb|rushing_yards|${side}|63.5']='SMOKE2#rush_635'; E['card-rb|rushing_yards|${side}|65']='SMOKE2#rush_65'; } renderParlay()`);
        await wait(20);
        /* the builder says it first, on the runner's row alone */
        chk(JSON.stringify(slipRows()) === JSON.stringify([[rbLabel, 'On DraftKings as ' + asRb]]),
          `${how}: the builder does not say under the runner's leg that DraftKings' slip takes it as ${asRb}, or says it of another: ` + JSON.stringify(slipRows()));
        /* the prop model's own page has no parlay card, and its builder says nothing of DraftKings' slip */
        { const C = w.PARLAY_CARD; w.PARLAY_CARD = undefined; w.eval('renderParlay()'); await wait(20);
          const none = slipRows().length === 0; w.PARLAY_CARD = C; w.eval('renderParlay()'); await wait(20);
          chk(none, `${how}: with no parlay card (the prop model's own page) the builder still speaks of DraftKings' slip`); }
        await reopen();
        const swapOf = n => txt(note().querySelector(`[data-pc-dkswap="${n}"]`));
        chk(!dkA.hidden && dkA.getAttribute('href') === DKU(moved) && txt(dkA) === 'Open in DraftKings' && dkA.getAttribute('title') === opensTitle('the 2 legs', AT_G)
          && txt(note()).startsWith(opensNote('the 2 legs', AT_G)) && !note().querySelector('[data-pc-dkmiss]')
          && [...note().querySelectorAll('a[data-pc-dkleg]')].map(a => a.getAttribute('href')).join(' ') === moved.map(x => DKU([x])).join(' ')
          && note().querySelectorAll('[data-pc-dkswap]').length === 1 && swapOf(nRb) === `${nRb}. Card Runner, ${rbLabel}: goes on as ${asRb}`
          && txt(note()).includes('DraftKings prices a changed leg at its own line, so its slip’s payout can differ from this card’s.'),
          `${how}: with the runner's line at another number at DraftKings, the link does not put both legs on the slip (the runner at DraftKings' ${wantP}), or the note does not say he goes on as ${asRb} and that DraftKings prices him there: ` + txt(note()) + ' / ' + dkA.getAttribute('href') + ' / ' + txt(dkA));
        chk(!/ now\b/.test(txt(note())) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')), `${how}: the note says what DraftKings has "now", from a read that can be a day old, or promises every leg: ` + txt(note()));
        d.getElementById('pcLink').click(); await wait(30);
        chk(shared.length === 1 && !('url' in shared[0]) && shared[0].text.includes(slipLines('the 2 legs as DraftKings had them', DKU(moved), AT_G).slice(0, -1)
          + `\nOn DraftKings’ slip at its own line: leg ${nRb} as ${asRb} (DraftKings prices it at its own line, so its payout can differ)\n`)
          && !/Add by hand/.test(shared[0].text) && legsIn(shared[0].text) && !promises(shared[0].text),
          `${how}: Share link on a parlay with a leg at another number at DraftKings does not send the link to both and say the leg goes on as ${asRb}: ` + JSON.stringify(shared[0]));
        /* a read more than a day old (the Saturday pull, on Sunday afternoon): said as the five-hour read
           was, dated by it, and the shared text dates it; undated (a payload that does not say), the
           same, said so */
        const AT31 = stamp(31 * 3600e3);
        w.eval(`PAY.dk=${JSON.stringify(dkMade(AT31, stamp(30 * 3600e3)))}`); await reopen();
        chk(dkA.getAttribute('href') === DKU(order) && txt(note()).startsWith(opensNote('the 2 legs', AT31)) && dkA.getAttribute('title') === opensTitle('the 2 legs', AT31) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')),
          `${how}: ids read 31 hours ago are promised as every leg landing, or the note or the button does not date the older read: ` + txt(note()) + ' / ' + dkA.getAttribute('title'));
        d.getElementById('pcLink').click(); await wait(30);
        chk(shared.length === 2 && !('url' in shared[1]) && shared[1].text.includes(slipLines('the 2 legs as DraftKings had them', DKU(order), AT31)) && !promises(shared[1].text),
          `${how}: Share link on ids a day and more old does not carry the link and say when DraftKings' lines were read: ` + JSON.stringify(shared[1]));
        w.eval(`PAY.dk=${JSON.stringify(dkMade(undefined, undefined))}; delete PAY.dk['${wk}']['${g2.id}'].at`); await reopen();
        chk(dkA.getAttribute('href') === DKU(order) && txt(note()).startsWith(opensNote('the 2 legs', null)) && dkA.getAttribute('title') === opensTitle('the 2 legs', null) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')),
          `${how}: ids with no read time are promised as every leg landing, or the note does not say the time is not recorded: ` + txt(note()) + ' / ' + dkA.getAttribute('title'));
        d.getElementById('pcLink').click(); await wait(30);
        chk(shared.length === 3 && shared[2].text.includes(slipLines('the 2 legs as DraftKings had them', DKU(order), null)),
          `${how}: Share link on ids with no read time does not say they were the lines as last read: ` + JSON.stringify(shared[2]));
        shared.length = 0;
        /* a price that is not the book's (a rung at the model's estimate, which DraftKings has no id
           for) is labelled in the shared text as on the card, and so is the parlay's price; with a 2+
           touchdown rung beside it, four legs of which the link opens two: the text says which two it
           opens and which to add by hand, by number (the ids still undated: "as last read") */
        w.eval(`S.parlay['${g2.id}|card-rb|receiving_yards']=${JSON.stringify({ gid: g2.id, pid: 'card-rb', stat: 'receiving_yards', k: 100, side: 'over', main: false, p: 0.2, price: 210, src: 'est', mu: 40, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: '100+ receiving yards' })};`
          + ` S.parlay['${g2.id}|card-rb|any_td']=${JSON.stringify({ gid: g2.id, pid: 'card-rb', stat: 'any_td', k: 2, side: 'over', main: false, p: 0.08, price: 900, src: 'est', mu: null, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: '2+ touchdowns' })}; renderParlay()`);
        await wait(20); await reopen();
        { const qe = w.PARLAY_CARD.quote(), ne = qe.legs.findIndex(l => l.stat === 'receiving_yards') + 1, nt = qe.legs.findIndex(l => l.stat === 'any_td') + 1, pe = w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))');
          const onSlip = qe.legs.filter(l => l.stat === 'ml' || l.stat === 'rushing_yards').map(l => l.stat === 'ml' ? DK_ML : DK_RB), hand = [ne, nt].sort((a, b) => a - b);
          chk(qe.legs.length === 4 && /\+210\s*est\./.test(txt(d.getElementById('pcView'))) && /estimated price/.test(txt(d.querySelector('#pcView .pc-sub'))), `${how}: the card does not mark the rung's estimated price: ` + txt(d.getElementById('pcView')));
          /* a leg on no book price: no fair chance, the model's alone, and the card says why */
          chk(!!qe.fair && qe.fair.p === null && txt(d.querySelector('#pcView .pc-chance')) === `Model’s chance all 4 land ${(qe.pr.corr * 100).toFixed(1)}% · the price says ${(100 / qe.useDec).toFixed(1)}% No fair chance: it needs every leg’s book price`,
            `${how}: a parlay with a leg on no book price does not give the model's chance alone and say why: ` + txt(d.querySelector('#pcView .pc-chance')));
          /* the rung and the 2+ touchdowns have nothing to convert to here (no receiving line and no
             touchdown of his among DraftKings' ids), so they stay off the slip: the button says how many it
             opens, and the builder's rows say why, in the card's few words */
          chk(dkA.getAttribute('href') === DKU(onSlip) && txt(dkA) === 'Open 2 of 4 legs in DraftKings' && dkA.getAttribute('title') === opensTitle('2 of the 4 legs', null)
            && txt(note()).startsWith(opensNote('2 of the 4 legs', null)) && !note().querySelector('[data-pc-dkswap]'),
            `${how}: four legs with two on the slip: the button or the note is wrong: ` + txt(note()) + ' / ' + dkA.getAttribute('href') + ' / ' + txt(dkA));
          { const want = [['100+ receiving yards', 'Not on DraftKings’ slip yet: no receiving yards line of his read'], ['2+ touchdowns', 'Not on DraftKings’ slip yet: no anytime TD of his read']];
            const got = slipRows().sort((x, y) => x[0] < y[0] ? -1 : 1);
            chk(JSON.stringify(got) === JSON.stringify(want), `${how}: the builder does not say under the rung and the 2+ touchdowns that they are not on DraftKings' slip yet, and why, or says it of another leg: ` + JSON.stringify(got)); }
          d.getElementById('pcLink').click(); await wait(30);
          const se = shared[0] || {};
          chk(new RegExp(`(^|\\n)${ne}\\. Card Runner: 100\\+ receiving yards \\(\\+210 est\\.\\)(\\n|$)`).test(se.text || '') && se.title === `4-leg parlay ${pe} (estimated price)`
            && (se.text || '').includes(`\nAdd by hand at DraftKings:\n${hand.map(n => n === ne ? `${ne}. Card Runner 100+ receiving yards (no receiving yards line of his read)` : `${nt}. Card Runner 2+ touchdowns (no anytime TD of his read)`).join('\n')}\n`) && /\(-135\)/.test(se.text || '') && /\nModel’s chance all 4 land [\d.]+% · the price says [\d.]+% · No fair chance: it needs every leg’s book price\n/.test(se.text || ''),
            `${how}: Share link sends an estimated price as if it were the book's, or does not name the legs to add by hand: ` + JSON.stringify(se));
          chk(!('url' in se) && (se.text || '').includes(slipLines(`2 of the 4 legs as DraftKings had them; add legs ${hand[0]} and ${hand[1]} by hand`, DKU(onSlip), null)) && !promises(se.text || ''),
            `${how}: Share link on four legs with two on the slip does not say it opens 2 of the 4 and which to add by hand, over the link: ` + JSON.stringify(se));
          /* DraftKings has him at other numbers: Over 24.5 and Over 39.5 receiving yards, and his anytime
             touchdown. The 100+ rung goes on as his Over at DraftKings' number nearest the rung's own
             (Over 99.5): 39.5; the 2+ touchdowns as the anytime touchdown. Every leg on the slip, each
             change named in the note, the shared text and the builder's rows, the button whole */
          w.eval(`{ const E=PAY.dk['${wk}']['${g2.id}']; E['card-rb|receiving_yards|over|24.5']='SMOKE2#rec_245'; E['card-rb|receiving_yards|over|39.5']='SMOKE2#rec_395'; E['card-rb|any_td']='SMOKE2#td'; } renderParlay()`);
          await wait(20);
          { const want = [['100+ receiving yards', 'On DraftKings as Over 39.5 receiving yards'], ['2+ touchdowns', 'On DraftKings as anytime touchdown']];
            const got = slipRows().sort((x, y) => x[0] < y[0] ? -1 : 1);
            chk(JSON.stringify(got) === JSON.stringify(want), `${how}: the builder does not say the rung goes on as Over 39.5 receiving yards and the 2+ touchdowns as the anytime touchdown, or says it of another leg: ` + JSON.stringify(got)); }
          await reopen();
          const all4 = qe.legs.map(l => l.stat === 'ml' ? DK_ML : l.stat === 'rushing_yards' ? DK_RB : l.stat === 'receiving_yards' ? 'SMOKE2#rec_395' : 'SMOKE2#td');
          const asOf = { [ne]: 'Over 39.5 receiving yards', [nt]: 'anytime touchdown' }, sw = [ne, nt].sort((a, b) => a - b);
          chk(dkA.getAttribute('href') === DKU(all4) && txt(dkA) === 'Open in DraftKings' && dkA.getAttribute('title') === opensTitle('the 4 legs', null)
            && txt(note()).startsWith(opensNote('the 4 legs', null)) && !note().querySelector('[data-pc-dkmiss]')
            && [...note().querySelectorAll('[data-pc-dkswap]')].map(e => e.getAttribute('data-pc-dkswap') + ' ' + txt(e)).join(' | ')
              === sw.map(n => `${n} ${n}. Card Runner, ${n === ne ? '100+ receiving yards' : '2+ touchdowns'}: goes on as ${asOf[n]}`).join(' | ')
            && txt(note()).includes('DraftKings prices changed legs at its own lines, so its slip’s payout can differ from this card’s.') && !promises(txt(note()) + ' ' + dkA.getAttribute('title')),
            `${how}: a rung and 2+ touchdowns DraftKings has at another number do not go on the slip as its Over 39.5 and its anytime touchdown, or the note does not say so: ` + txt(note()) + ' / ' + dkA.getAttribute('href') + ' / ' + txt(dkA));
          shared.length = 0; d.getElementById('pcLink').click(); await wait(30);
          { const s4 = shared[0] || {};
            chk(shared.length === 1 && !('url' in s4) && (s4.text || '').includes(slipLines('the 4 legs as DraftKings had them', DKU(all4), null).slice(0, -1)
              + `\nOn DraftKings’ slip at its own line: ${sw.map(n => `leg ${n} as ${asOf[n]}`).join('; ')} (DraftKings prices them at its own line, so its payout can differ)\n`)
              && !/Add by hand/.test(s4.text || '') && !promises(s4.text || '') && s4.title === `4-leg parlay ${pe} (estimated price)`,
              `${how}: Share link on four legs, two at DraftKings' numbers, does not send the link to all four and say which go on as what: ` + JSON.stringify(s4)); }
          w.eval(`{ const E=PAY.dk['${wk}']['${g2.id}']; delete E['card-rb|receiving_yards|over|24.5']; delete E['card-rb|receiving_yards|over|39.5']; delete E['card-rb|any_td']; }`); }
        w.eval(`S.parlay=${JSON.stringify(builder(side))}; renderParlay()`); await wait(20); shared.length = 0;
        /* the cases where a leg has no id: what the payload holds says why. The runner's main line is in
           PAY.mkt on the second game, a DraftKings player price on it, so for the cases of a game whose
           player prices have not been pulled it is taken out (and put back after), and the player legs
           are what the builder offers on such a game: est. rungs and an est. touchdown */
        const NFL = 'https://sportsbook.draftkings.com/leagues/football/nfl', PULLED = 'they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET)';
        const GAME_NP = 'its game’s DraftKings prices have not been pulled yet: ' + PULLED, PL_NP = 'DraftKings’ player prices for its game have not been pulled yet: ' + PULLED;
        /* a rung on a game not pulled yet: once it is, the rung goes on as his Over at DraftKings' line (app v109) */
        const RUNG = s => `; once they are, it goes on as his Over at DraftKings’ ${s} line, priced by DraftKings there`;
        const missOf = n => txt(note().querySelector(`[data-pc-dkmiss="${n}"]`));
        const unprice = () => w.eval(`window.__rbMkt=PAY.mkt['${wk}']['card-rb']; delete PAY.mkt['${wk}']['card-rb']`), reprice = () => w.eval(`PAY.mkt['${wk}']['card-rb']=window.__rbMkt`);
        const rung = { gid: g2.id, pid: 'card-rb', stat: 'receiving_yards', k: 25, side: 'over', main: false, p: 0.45, price: 150, src: 'est', mu: 22, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: '25+ receiving yards' };
        const td = Object.assign({}, rung, { stat: 'any_td', k: 1, p: 0.35, price: 185, mu: null, label: 'Scores a touchdown' });
        const rungKey = `${g2.id}|card-rb|receiving_yards`, tdKey = `${g2.id}|card-rb|any_td`;
        /* every leg on a line of its own in the shared text, and each to add by hand with its brief */
        const reEsc = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const legsOf = (qx, t) => qx.legs.every((l, i) => new RegExp(`(^|\\n)${i + 1}\\. ${reEsc(l.name)}: ${reEsc(l.label)} \\([+-]\\d+( est\\.)?\\)(\\n|$)`).test(t));
        const handOf = (qx, t, brief) => qx.legs.every((l, i) => t.includes(`\n${i + 1}. ${l.name} ${l.label} (${brief(l)})\n`));
        unprice();
        /* (b) legs in two games, neither with an id (dk baked, neither game's prices pulled yet): the
           button opens DraftKings' NFL page, every leg is named with why (a rung: and that once they are, it
           goes on as his Over at DraftKings' line), and Share link sends that page */
        w.eval(`S.parlay=${JSON.stringify({ [mlKey]: builder(side)[mlKey], [rungKey]: rung })}; renderParlay(); PAY.dk={}`); await wait(20); await reopen();
        { const qb = w.PARLAY_CARD.quote(), nR = qb.legs.findIndex(l => l.pid === 'card-rb') + 1, nM = qb.legs.findIndex(l => l.stat === 'ml') + 1;
          chk(qb.legs.length === 2 && !dkA.hidden && txt(dkA) === 'Open DraftKings' && dkA.getAttribute('href') === NFL && dkA.getAttribute('target') === '_blank' && /\bnoopener\b/.test(dkA.getAttribute('rel') || '')
            && dkA.getAttribute('title') === 'Opens DraftKings’ NFL page, in a new tab, to add the legs by hand' && dkA.nextElementSibling === d.getElementById('pcLink')
            && txt(note()).startsWith('None of these legs can go on DraftKings’ betslip from here, so Open DraftKings opens its NFL page: add them there by hand.')
            && note().querySelectorAll('[data-pc-dkmiss]').length === 2 && missOf(nM).endsWith(': ' + GAME_NP) && missOf(nR).endsWith(': ' + GAME_NP + RUNG('receiving yards'))
            && !note().querySelector('a') && !d.getElementById('pcLink').hidden, `${how}: a parlay DraftKings has none of, over two games, does not offer DraftKings' NFL page, or does not name every leg and why: ` + txt(note()) + ' / ' + dkA.outerHTML);
          d.getElementById('pcLink').click(); await wait(30);
          const s2 = shared[0] || {};
          chk(shared.length === 1 && !('url' in s2) && (s2.text || '').includes(`\nDraftKings’ NFL page (add the legs by hand):\n${NFL}\nAdd by hand at DraftKings:\n`) && legsOf(qb, s2.text || '') && !/DraftKings lines/.test(s2.text || '') && /\ndemon-x13\.github\.io\/nfl-hub$/.test(s2.text || '')
            && handOf(qb, s2.text || '', () => 'its game’s prices are not pulled yet') && (s2.text || '').includes('\nAdd by hand at DraftKings:\n'),
            `${how}: Share link on a parlay DraftKings has none of, over two games, does not send DraftKings' NFL page and every leg to add by hand, with why: ` + JSON.stringify(s2));
          shared.length = 0; }
        /* the Tab order is the same with the button standing for the NFL page */
        { const f = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]')).map(el => el.id).join(' ');
          chk(f === 'pcClose pcDk pcLink pcDownload pcAgain', `${how}: with no leg on the slip the card's controls are not Close, Open DraftKings, Share link, Download, Start over: ` + f); }
        /* a payload baked before ids (no dk at all): the old reason, and still DraftKings' NFL page */
        w.eval('delete PAY.dk'); await reopen();
        chk(!dkA.hidden && dkA.getAttribute('href') === NFL && [1, 2].every(n => missOf(n).endsWith(': no DraftKings ids were read for its game')),
          `${how}: a payload baked before DraftKings' ids does not keep its reason, or offers no DraftKings page: ` + txt(note()));
        /* (a) the owner's case: Monday night, the game's lines and page read (event, its money lines,
           spreads and total, glat) and none of its player prices yet (no at, nothing in PAY.mkt); a
           parlay of two player legs in it, an est. rung and an est. touchdown. Each says DraftKings'
           player prices for its game have not been pulled yet (the rung: and that once they are, it goes on
           as his Over at DraftKings' line), the button opens the game's page, and Share link sends that page
           with both legs to add */
        const gameOnly = { [String(wk)]: { [g2.id]: { event: '880002', [`team:${g2.h}|ml`]: 'G2#ml_h', [`team:${g2.a}|ml`]: 'G2#ml_a', [`team:${g2.h}|ats|-3`]: 'G2#ats_h', [`team:${g2.a}|ats|3`]: 'G2#ats_a',
          'game|total|over|54.5': 'G2#o', 'game|total|under|54.5': 'G2#u', glat: AT_G } } };
        w.eval(`PAY.dk=${JSON.stringify(gameOnly)}; S.parlay=${JSON.stringify({ [rungKey]: rung, [tdKey]: td })}; renderParlay()`); await wait(20); await reopen();
        { const qa = w.PARLAY_CARD.quote(), EV = 'https://sportsbook.draftkings.com/event/880002', nR = qa.legs.findIndex(l => l.stat === 'receiving_yards') + 1, nT = qa.legs.findIndex(l => l.stat === 'any_td') + 1;
          chk(qa.legs.length === 2 && !dkA.hidden && txt(dkA) === 'Open game in DraftKings' && dkA.getAttribute('href') === EV && dkA.getAttribute('title') === 'Opens the game’s page in DraftKings, in a new tab, to add the legs by hand'
            && txt(note()).startsWith('None of these legs can go on DraftKings’ betslip from here, so Open game in DraftKings opens the game’s page: add them there by hand.')
            && missOf(nT).endsWith(': ' + PL_NP) && missOf(nR).endsWith(': ' + PL_NP + RUNG('receiving yards')) && !note().querySelector('a'),
            `${how}: the owner's case (game lines read, no player prices yet) does not say the player prices are not pulled yet, or does not open the game's DraftKings page: ` + txt(note()) + ' / ' + dkA.outerHTML);
          d.getElementById('pcLink').click(); await wait(30);
          const sa = shared[0] || {};
          chk(shared.length === 1 && !('url' in sa) && (sa.text || '').includes(`\nDraftKings, the game’s page (add the legs by hand):\n${EV}\nAdd by hand on the game’s DraftKings page:\n`) && sa.title.startsWith('2-leg parlay ' + w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))')) && !/DraftKings lines/.test(sa.text || '') && legsOf(qa, sa.text || '')
            && (sa.text || '').includes('\nAdd by hand on the game’s DraftKings page:\n')
            && handOf(qa, sa.text || '', () => 'player prices for its game are not pulled yet'),
            `${how}: Share link in the owner's case does not send the game's DraftKings page with both legs to add by hand, and why: ` + JSON.stringify(sa));
          shared.length = 0;
          /* in the same game, a market the pull never reads says so, never that a pull will bring it */
          const mk = w.PARLAY_CARD.dkPlan([Object.assign({}, rung, { stat: 'carries', k: 15, label: '15+ carries' }), Object.assign({}, rung, { stat: 'kick_pts', k: 8, label: '8+ kicking points' }), Object.assign({}, rung, { stat: 'passing_interceptions', k: 1, label: '1+ interceptions' })]);
          chk(mk.miss.length === 3 && ['carries', 'kicking points', 'interceptions'].every((s, i) => (mk.miss[i].why || '').startsWith(`DraftKings’ ${s} lines are not read here (`) && mk.miss[i].brief === 'its market is not read here')
            && !mk.miss.some(x => /pulled/.test(x.why.split('(')[0])),
            `${how}: a market the pull never reads (carries, kicking points, interceptions) is said to come with the pull, or is not said to be unread: ` + JSON.stringify(mk.miss)); }
        /* (d) the same game with a player leg and its home money line: the slip opens the money line, the
           player leg is to add by hand, with why, and Share link sends the slip */
        w.eval(`S.parlay=${JSON.stringify({ [tdKey]: td, [`${g2.id}|team:${g2.h}|ml`]: Object.assign({}, builder(side)[mlKey], { gid: g2.id, pid: 'team:' + g2.h, team: g2.h, opp: g2.a }) })}; renderParlay()`); await wait(20); await reopen();
        { const qd = w.PARLAY_CARD.quote(), nP = qd.legs.findIndex(l => l.pid === 'card-rb') + 1;
          chk(qd.legs.length === 2 && !dkA.hidden && txt(dkA) === 'Open 1 of 2 legs in DraftKings' && dkA.getAttribute('href') === DKU(['G2#ml_h']) && /1 of the 2 legs/.test(txt(note()))
            && missOf(nP).endsWith(': ' + PL_NP) && note().querySelectorAll('[data-pc-dkmiss]').length === 1 && !note().querySelector('[data-pc-dkswap]'),
            `${how}: a money line beside a player leg whose prices are not pulled does not open the money line alone (Open 1 of 2 legs in DraftKings), or does not say why the other is left: ` + txt(note()) + ' / ' + dkA.getAttribute('href') + ' / ' + txt(dkA));
          chk(JSON.stringify(slipRows()) === JSON.stringify([['Scores a touchdown', 'Not on DraftKings’ slip yet: player prices for its game are not pulled yet']]),
            `${how}: the builder does not say under the unpulled touchdown that it is not on DraftKings' slip yet, and why, or says it of the money line: ` + JSON.stringify(slipRows()));
          d.getElementById('pcLink').click(); await wait(30);
          const sd = shared[0] || {};
          chk(shared.length === 1 && !('url' in sd) && (sd.text || '').includes(slipLines(`1 of the 2 legs as DraftKings had it; add leg ${nP} by hand`, DKU(['G2#ml_h']), AT_G)) && (sd.text || '').includes(`\nAdd by hand at DraftKings:\n${nP}. Card Runner Scores a touchdown (player prices for its game are not pulled yet)\n`),
            `${how}: Share link on a money line beside an unpulled player leg does not send the slip and the player leg to add by hand: ` + JSON.stringify(sd));
          shared.length = 0; }
        /* a leg the card prices from the book is never said to be unpulled or not offered: its price is
           DraftKings', so a missing id is said neutrally (a links file that would not read, a name two
           book rows gave two ids). The runner's main line on a book price in the owner's game (no at),
           with and without his line in PAY.mkt; and a money line under an empty dk on a game whose lines
           are DraftKings' (g.ls 'dk') */
        { const book = Object.assign({}, builder(side)[rbKey]);
          const nb = w.PARLAY_CARD.dkPlan([book]);
          chk(!nb.url && (nb.miss[0] || {}).why === 'not among the DraftKings lines read for its game', `${how}: a book-priced player leg with no id in a game with no player ids is said to be unpulled: ` + JSON.stringify(nb.miss));
          reprice(); const nb2 = w.PARLAY_CARD.dkPlan([Object.assign({}, book, { src: 'est' })]); unprice();
          chk(!nb2.url && (nb2.miss[0] || {}).why === 'not among the DraftKings lines read for its game', `${how}: a player leg in a game whose DraftKings player prices are in the payload is said to be unpulled: ` + JSON.stringify(nb2.miss));
          const g1At = `S.sched.find(x=>x.id===${JSON.stringify(g1.id)})`, lsWas = w.eval(`JSON.stringify(${g1At}.ls)`);
          w.eval(`PAY.dk={}; ${g1At}.ls='dk'`);
          const nl = w.PARLAY_CARD.dkPlan([Object.assign({}, builder(side)[mlKey])]);
          w.eval(`${g1At}.ls=${lsWas === undefined ? 'undefined' : lsWas}`);
          chk(!nl.url && (nl.miss[0] || {}).why === 'no DraftKings ids were read for its game', `${how}: a money line whose game lines are DraftKings' but with no ids is said to be unpulled: ` + JSON.stringify(nl.miss)); }
        /* (c) a player leg in a game whose player prices were read (at) with no id for him and no book
           price (an est. touchdown): DraftKings did not offer it then, dated; a rung with no line of his on
           its stat: DraftKings had none then, dated; the runner's book-priced main line with no id: neutral; and a game still to come
           with no ids under a payload that has dk */
        { const dkC = { [String(wk)]: { [g2.id]: Object.assign({}, gameOnly[String(wk)][g2.id], { 'card-xx|receptions|over|4.5': 'X#1', 'card-rb|carries|over|14.5': 'C#1', at: AT_P }) } };
          w.eval(`PAY.dk=${JSON.stringify(dkC)}`);
          const c = w.PARLAY_CARD.dkPlan([Object.assign({}, rung), Object.assign({}, td), Object.assign({}, builder(side)[rbKey])]), whyC = n => (c.miss.find(x => x.n === n) || {}).why || '';
          chk(!c.url && c.event === 'https://sportsbook.draftkings.com/event/880002' && c.home === c.event && whyC(1) === `DraftKings had no receiving yards line of his when its prices were read (${readTxt(AT_P)})` && (c.miss.find(x => x.n === 1) || {}).brief === 'no receiving yards line of his read'
            && whyC(2) === `DraftKings did not offer this line when its prices were read (${readTxt(AT_P)})` && (c.miss.find(x => x.n === 2) || {}).brief === 'DraftKings did not offer it when read'
            && whyC(3) === 'not among the DraftKings lines read for its game',
            `${how}: a player leg on a game whose player prices were read, with no id for him, does not say DraftKings did not offer it then, dated (or a book-priced one says so): ` + JSON.stringify(c.miss));
          /* a market the pull does not read is still opened where the payload has its id */
          const cc = w.PARLAY_CARD.dkPlan([Object.assign({}, rung, { stat: 'carries', k: 15, label: '15+ carries' })]);
          chk(cc.url === DKU(['C#1']) && !cc.miss.length, `${how}: a carries rung whose id the payload has does not open: ` + JSON.stringify(cc));
          const e = w.PARLAY_CARD.dkPlan([Object.assign({}, builder(side)[mlKey])]);
          chk(!e.url && !e.event && e.home === NFL && (e.miss[0] || {}).why === GAME_NP,
            `${how}: a game to come with no ids does not say its prices have not been pulled yet, or offers a page other than DraftKings' NFL page: ` + JSON.stringify(e)); }
        reprice();
        w.eval(`S.parlay=${JSON.stringify(builder(side))}; renderParlay()`); await wait(20); shared.length = 0;
        delete w.navigator.share;
        /* every kind of leg against made-up ids on the first pinned game: a team's line, the total, a
           touchdown, a main line, a rung (Over k-0.5, or Over k-1 where the book's line is whole); the legs
           DraftKings has only at another number, which go on at DraftKings' (app v109: a spread the same
           team's, a total the same side, a rung the player's Over at the number nearest Over k-0.5, 2+
           touchdowns the anytime touchdown); and the legs with nothing to convert to, with why (a money
           line and an anytime touchdown have no number: the other team's money line or another player's
           touchdown is never taken for them; a rung on a stat DraftKings has no Over of his on; a main
           line's other side). Then the newest read: a Refresh odds press dates each id it gave (ESPN_IDAT),
           and an id at another number read since the leg's own one takes the leg there. A game whose lines
           are nflverse's converts alike; a game that has kicked off opens nothing; the game's page when
           every leg is in one game */
        const G = w.eval('S.sched').find(x => x.id === g1.id), ls0 = G.ls, past = P0.sched.find(x => ![g1.id, g2.id, other && other.id].includes(x.id) && Date.parse(x.d + 'T23:59:00Z') < Date.now() - 864e5);
        const made = { [String(wk)]: { [g1.id]: { event: '990', [`team:${g1.h}|ats|-3`]: 'A#h', [`team:${g1.a}|ats|3.5`]: 'A#a', [`team:${g1.a}|ml`]: 'M#a', 'game|total|over|43.5': 'T#o', 'game|total|under|44.5': 'T#u',
          'p1|any_td': 'D#1', 'p3|any_td': 'D#3', 'p1|receptions|over|4.5': 'R#1', 'p1|receptions|under|4.5': 'R#u', 'p1|receiving_yards|over|59': 'Y#59', 'p2|rushing_yards|over|79.5': 'Z#79', 'p2|rushing_yards|over|80': 'Z#80',
          'p2|receptions|over|3.5': 'Q#o', at: AT_P, glat: AT_G } } };
        if (past) (made[String(past.w)] = made[String(past.w)] || {})[past.id] = { [`team:${past.h}|ml`]: 'P#1' };
        w.eval(`PAY.dk=${JSON.stringify(made)}`);
        const L = o => Object.assign({ gid: g1.id, week: wk, name: 'N', label: 'L', side: 'over', main: false }, o);
        const legs = [L({ pid: 'team:' + g1.h, stat: 'ats', k: -3, grp: 'TEAM' }), L({ pid: 'team:' + g1.a, stat: 'ats', k: 3, grp: 'TEAM' }),
          L({ pid: 'game', stat: 'total', k: 43.5, main: true, grp: 'TEAM' }), L({ pid: 'game', stat: 'total', side: 'under', k: 43.5, main: true, grp: 'TEAM' }),
          L({ pid: 'p1', stat: 'any_td', k: 1, grp: 'WR' }), L({ pid: 'p3', stat: 'any_td', k: 2, grp: 'WR' }), L({ pid: 'p1', stat: 'receptions', k: 4.5, main: true, grp: 'WR' }),
          L({ pid: 'p1', stat: 'receiving_yards', k: 60, grp: 'WR' }), L({ pid: 'p2', stat: 'rushing_yards', k: 80, grp: 'RB' }), L({ pid: 'p2', stat: 'rushing_yards', k: 100, grp: 'RB' }),
          L({ pid: 'team:' + g1.h, stat: 'ml', k: 0, grp: 'TEAM' }), L({ pid: 'p1', stat: 'receptions', side: 'under', k: 4.5, main: true, grp: 'WR' }),
          L({ pid: 'p2', stat: 'any_td', k: 1, grp: 'RB' }), L({ pid: 'p2', stat: 'any_td', k: 2, grp: 'RB' }), L({ pid: 'p1', stat: 'rushing_yards', k: 50, grp: 'WR' }),
          L({ pid: 'p2', stat: 'receptions', side: 'under', k: 3.5, main: true, grp: 'RB' })];
        const plan = ls => { w.eval(`S.sched.find(x=>x.id===${JSON.stringify(g1.id)}).ls=${JSON.stringify(ls)}`); return w.PARLAY_CARD.dkPlan(legs.map(l => Object.assign({}, l))); };
        /* what each plan holds, worked out above leg by leg: the ids in the card's order, the legs on the
           slip, each change as "n swap", each leg left off as "n why", and when each leg on it was read */
        const shape = p => ({ url: p.url, ok: p.ok.map(x => x.n).join(), swaps: (p.swaps || []).map(x => x.n + ' ' + x.swap).join(' | '), miss: p.miss.map(x => x.n + ' ' + x.why).join(' | '),
          at: p.ok.map(x => x.n + ' ' + (x.at ? new Date(x.at).toISOString().slice(0, 16) + 'Z' : '-')).join(' | '), event: p.event });
        const offered = `DraftKings did not offer this line when its prices were read (${readTxt(AT_P)})`;
        const want = (ids, swaps, at) => ({ url: DKU(ids), ok: '1,2,3,4,5,6,7,8,9,10,12', swaps: swaps.join(' | '),
          miss: ['11 not among the DraftKings lines read for its game', '13 ' + offered, `14 DraftKings did not offer his anytime touchdown when its prices were read (${readTxt(AT_P)}), and 2+ touchdowns goes on the slip only as that`, `15 DraftKings had no rushing yards line of his when its prices were read (${readTxt(AT_P)})`, '16 ' + offered].join(' | '),
          at: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => n + ' ' + (at[n] || ([1, 2, 3, 4].includes(n) ? AT_G : AT_P))).join(' | '), event: 'https://sportsbook.draftkings.com/event/990' });
        const SW = ['2 +3.5', '4 Under 44.5', '6 anytime touchdown', '10 Over 80 rushing yards'];
        const IDS = ['A#h', 'A#a', 'T#o', 'T#u', 'D#1', 'D#3', 'R#1', 'Y#59', 'Z#79', 'Z#80', 'R#u'];
        const a = plan('dk');
        chk(JSON.stringify(shape(a)) === JSON.stringify(want(IDS, SW, {})),
          `${how}: a leg of some kind does not find its DraftKings id, does not go on at DraftKings' number where DraftKings has only another, or one with nothing to convert to does not say why: ` + JSON.stringify({ got: shape(a), want: want(IDS, SW, {}) }));
        /* the read the link stands on is the older of the two (the game lines'); no read, however recent,
           makes a promise of it (no fresh flag) */
        chk(!!a.read && a.read.toISOString().slice(0, 16) + 'Z' === AT_G && !('fresh' in a), `${how}: the plan is not dated by its older read, or still marks a recent read as one every leg lands on: ` + JSON.stringify({ read: a.read, fresh: a.fresh }));
        const b = plan('nflverse');
        chk(JSON.stringify(shape(b)) === JSON.stringify(shape(a)), `${how}: a team line on a game whose lines are nflverse's does not go on the slip at DraftKings' number as on one whose lines are DraftKings': ` + JSON.stringify(shape(b)));
        /* a leg priced from DraftKings' line read on ESPN (src dkline) is looked up like any other: its own
           line's id, else DraftKings' number for the same bet, else the reason that it was priced from that
           read and its id is not read */
        { const K = o => L(Object.assign({ pid: 'p1', stat: 'receptions', main: true, grp: 'WR', src: 'dkline' }, o));
          const one = (l, url, swaps, miss) => { const k = shape(w.PARLAY_CARD.dkPlan([l])), x = { url, ok: url ? '1' : '', swaps, miss, at: url ? '1 ' + AT_P : '', event: 'https://sportsbook.draftkings.com/event/990' };
            chk(JSON.stringify(k) === JSON.stringify(x), `${how}: a leg priced from DraftKings' line read on ESPN is not looked up like any other before it says its id is not read: ` + JSON.stringify({ got: k, want: x })); };
          one(K({ k: 4.5 }), DKU(['R#1']), '', '');
          one(K({ k: 5.5 }), DKU(['R#1']), '1 Over 4.5 receptions', '');
          one(K({ pid: 'p2', stat: 'passing_yards', k: 220.5, grp: 'QB' }), null, '', '1 price estimated from DraftKings’ line read on ESPN; its DraftKings id is not read'); }
        /* the newest read: a press read DraftKings' home spread at -3.5 an hour ago, after the pull's -3
           (five hours ago), so the -3 leg goes on at -3.5, dated by the press; the away spread at +7 an hour
           ago, so the +3 leg, with no id at its own number, takes the press's +7 over the pull's nearer
           +3.5; the under at 45.5, likewise over the pull's 44.5. The over keeps its own 43.5, which no
           read has moved */
        { const T1 = Date.now() - 3600e3, E = `PAY.dk['${wk}']['${g1.id}']`, H = `team:${g1.h}|ats|-3.5`, A7 = `team:${g1.a}|ats|7`;
          w.eval(`${E}[${JSON.stringify(H)}]='A#h35'; ${E}[${JSON.stringify(A7)}]='A#a7'; ${E}['game|total|under|45.5']='T#u455';`
            + ` ESPN_IDAT[${JSON.stringify(g1.id)}]={[${JSON.stringify(H)}]:${T1},[${JSON.stringify(A7)}]:${T1},'game|total|under|45.5':${T1}}`);
          const iso = new Date(T1).toISOString().slice(0, 16) + 'Z';
          const n1 = plan('dk'), w1 = want(['A#h35', 'A#a7', 'T#o', 'T#u455', ...IDS.slice(4)], ['1 -3.5', '2 +7', '4 Under 45.5', ...SW.slice(2)], { 1: iso, 2: iso, 4: iso });
          chk(JSON.stringify(shape(n1)) === JSON.stringify(w1),
            `${how}: a spread or total a press read at another number since the pull does not take the leg to the press's number, dated by the press: ` + JSON.stringify({ got: shape(n1), want: w1 }));
          /* the same press ten hours ago, before the pull's read of -3: the leg keeps its own line */
          w.eval(`ESPN_IDAT[${JSON.stringify(g1.id)}][${JSON.stringify(H)}]=${Date.now() - 10 * 3600e3}`);
          const n2 = plan('dk'), w2 = want(['A#h', 'A#a7', 'T#o', 'T#u455', ...IDS.slice(4)], ['2 +7', '4 Under 45.5', ...SW.slice(2)], { 2: iso, 4: iso });
          chk(JSON.stringify(shape(n2)) === JSON.stringify(w2),
            `${how}: a press read older than the pull's read of the leg's own line moved the leg off it: ` + JSON.stringify({ got: shape(n2), want: w2 }));
          w.eval(`delete ESPN_IDAT[${JSON.stringify(g1.id)}]; PAY.dk=${JSON.stringify(made)}`); }
        /* the same ids read 25 hours ago: dated by that read */
        made[String(wk)][g1.id].glat = stamp(25 * 3600e3); w.eval(`PAY.dk=${JSON.stringify(made)}`);
        { const c = plan('nflverse');
          chk(c.url === a.url && !('fresh' in c) && c.read.toISOString().slice(0, 16) + 'Z' === made[String(wk)][g1.id].glat, `${how}: ids read 25 hours ago are not dated by that read: ` + JSON.stringify({ read: c.read, fresh: c.fresh })); }
        w.eval(`S.sched.find(x=>x.id===${JSON.stringify(g1.id)}).ls=${JSON.stringify(ls0)}`);
        if (past) { const c = w.PARLAY_CARD.dkPlan([L({ gid: past.id, week: +past.w, pid: 'team:' + past.h, stat: 'ml', k: 0, grp: 'TEAM' })]);
          chk(!c.url && c.miss.length === 1 && /kicked off/.test(c.miss[0].why) && !c.event, `${how}: a leg whose game has kicked off is opened in DraftKings: ` + JSON.stringify(c)); }
        w.eval(`PAY.dk=${JSON.stringify(dkMade())}`); await reopen();
        chk(dkA.getAttribute('href') === DKU(order) && d.activeElement === d.getElementById('pcDownload'), `${how}: the card did not come back whole with the DraftKings ids put back`); }
      /* the image */
      d.getElementById('pcDownload').click(); await wait(60);
      const file = rec.clicks[0] && rec.clicks[0].download;
      chk(rec.clicks.length === 1 && new RegExp(`^parlay-${wk <= 18 ? 'week' + wk : 'playoffs-week' + wk}-2legs\\.png$`).test(file) && /^blob:/.test(rec.clicks[0].href) && rec.clicks[0].attached,
        `${how}: Download did not save the card as a named PNG: ` + JSON.stringify(rec.clicks));
      chk(rec.urls.length === 1 && rec.urls[0].type === 'image/png' && rec.canvases.length === 1 && rec.canvases[0].width === 1080 && rec.canvases[0].height > 2 * 400,
        `${how}: the download is not a PNG drawn at twice the card's size: ` + (rec.urls[0] && rec.urls[0].type) + ' ' + (rec.canvases[0] && rec.canvases[0].width));
      chk(['Home Side', 'To win', 'Card Runner', rbLabel, '−135', '+105', price, '2-leg parlay', 'NFL HUB', '$25.00'].every(t => rec.texts.some(x => x.includes(t))) && rec.texts.includes('demon-x13.github.io/nfl-hub') && !rec.texts.some(x => /nfl-hub\/nflbets/.test(x)),
        `${how}: the image does not carry every leg, the price, the stake and the mark: ` + rec.texts.join(' | '));
      chk(!rec.texts.some(x => /DraftKings|Share link/.test(x)), `${how}: the image carries the DraftKings link or the Share link: ` + rec.texts.join(' | '));
      { const all = rec.texts.join('');
        chk(all.includes(line1) && all.includes(line2), `${how}: the image does not lead its chance with the fair chance (${line1}), then the model's and the price's: ` + rec.texts.filter(x => /chance|says|%/.test(x)).join(' | ')); }
      chk(new RegExp('Saved as ' + file).test(txt(d.getElementById('pcMsg'))), `${how}: the window does not say the image was saved`);
      /* Escape closes it, and the focus goes back to Finish; the builder keeps its legs */
      d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      chk(md.hidden && !d.body.classList.contains('modal-open') && d.activeElement === d.getElementById('pFinish') && Object.keys(w.eval('S').parlay).length === 2,
        `${how}: Escape did not close the window, give the focus back to Finish, or the builder lost its legs`);
      /* Tab stays inside the window, both ways. The order is Close, Open in DraftKings, Share link,
         Download, Start over, then the note's own link for each leg under the buttons, the last */
      d.getElementById('pFinish').click(); await wait(20);
      const foc = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]'));
      const seq = foc.map(el => el.id || 'leg' + el.getAttribute('data-pc-dkleg')).join(' ');
      chk(seq === 'pcClose pcDk pcLink pcDownload pcAgain leg1 leg2', `${how}: the card's controls are not in the order Close, Open in DraftKings, Share link, Download, Start over, each leg's link: ` + seq);
      const lastC = foc[foc.length - 1];
      lastC.focus(); lastC.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      const wrapped = d.activeElement === d.getElementById('pcClose');
      d.getElementById('pcClose').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
      chk(wrapped && d.activeElement === lastC, `${how}: Tab leaves the card's window`);
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
      chk(d.activeElement === (d.querySelector('#pbPanel [data-pb-mix]') || d.body) && d.activeElement !== d.getElementById('pcAgain'), `${how}: after Start over the focus is lost`);
      /* two weeks in the builder cannot be one parlay: Finish says so, as Save did */
      w.eval(`S.parlay=${JSON.stringify(builder(side))}; S.parlay['other|team:${other ? other.h : 'X'}|ml']=${JSON.stringify({ gid: other ? other.id : 'x', pid: 'team:' + (other ? other.h : 'X'), stat: 'ml', k: 0, side: 'over', main: false, p: 0.5, price: 100, src: 'real', name: 'Elsewhere', pos: 'Game', grp: 'TEAM', team: other ? other.h : 'X', opp: other ? other.a : 'Y', week: other ? +other.w : wk + 1, label: 'To win' })}; save(); renderParlay()`);
      await wait(20);
      chk(!!d.getElementById('pFinish') && d.getElementById('pFinish').disabled && /same week to finish/.test(d.getElementById('pFinish').title), `${how}: a builder across two weeks can be finished`);
      /* Suggested Parlays (#suggest, app v111, the owner's call of 16 October 2026): each Thursday, Sunday
         and Monday night game of the week gets its own Safe, Medium, Aggressive and Extreme, and a level
         finishes the same way the builder does, its legs, its price and its chance, on the amount in the
         Parlay Builder's Bet amount box, the builder's own stake, which every level pays on. The sets'
         own rules (prime time, the levels, the lock, a player ruled out) are held to the engine in props'
         audit and smoke.js; here the set is a fixed one on the second pinned game, moved to Thursday 31
         December 2099 at 8:15 pm Eastern so it is a Thursday night game, so the card is checked on any
         day: first live (its lock, 2 hours before kickoff, is far off), then locked, from a record entry
         made up here, on the page's clock moved to an hour before that kickoff. Its two legs are the
         game's home money line and the runner's main line, each with DraftKings' id at its own line */
      { const KICK = Date.UTC(2100, 0, 1, 1, 15), LOCK = KICK - 2 * 3600e3;   /* 8:15 pm EST, UTC-5; the lock 6:15 pm */
        const ML_G2 = { a: 115, h: -135 }, DK_ML2 = { h: 'SMOKE3#ml_' + g2.h, a: 'SMOKE3#ml_' + g2.a };
        const mlKey2 = `${g2.id}|team:${g2.h}|ml`, fid = `${g2.id}:safe`;
        const ml2 = { gid: g2.id, pid: 'team:' + g2.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.58, price: ML_G2.h, src: 'real', mu: null, name: 'Home Side', pos: 'Game', grp: 'TEAM', team: g2.h, opp: g2.a, week: wk, label: 'To win' };
        const setLegs = [ml2, builder(side)[rbKey]].map(l => Object.assign({ key: l.gid + '|' + l.pid + '|' + l.stat }, l));
        const WHY = 'Only 2 legs in this game: a parlay takes one leg a player, and one side and one total a game.';
        const dk = dkMade(); dk[String(wk)][g2.id][`team:${g2.h}|ml`] = DK_ML2.h; dk[String(wk)][g2.id][`team:${g2.a}|ml`] = DK_ML2.a;
        w.eval(`(()=>{ const g=S.sched.find(x=>x.id===${JSON.stringify(g2.id)}); g.d='2099-12-31'; g.t='20:15'; g.mla=${ML_G2.a}; g.mlh=${ML_G2.h};
          PAY.dk=${JSON.stringify(dk)};
          pbGames=function(){ return S.sched.filter(x=>x.id===${JSON.stringify(g2.id)}); };
          spBuild=function(g){ return {gid:g.id,pref:2,thin:0,mkt:0,far:0,farDk:0,noId:0,moved:0,plGames:1,plNoId:0,tiers:[
            {id:'safe',label:'Safe',n:2,floor:0,legs:${JSON.stringify(setLegs)},corr:0.41,indep:0.38,dec:3.1,thin:0,mkt:0,fair:{p:0.33,est:false,miss:0}},
            {id:'med',label:'Medium',n:3,floor:0.25,why:${JSON.stringify(WHY)}},{id:'aggr',label:'Aggressive',n:4,floor:0.12,why:${JSON.stringify(WHY)}},{id:'xtrm',label:'Extreme',n:5,floor:0.05,why:${JSON.stringify(WHY)}}]}; };
          SP_CACHE=new Map(); renderParlay(); })()`);
        await wait(20);
        /* the night rule on this set as the page has it, before anything stands in for it: the Thursday night game is
           the next night, and goes up on the morning after the last prime-time night before it on the schedule (the
           season's own last one), so until then the tab names it and says when, and draws no set; once that morning
           has come, its set. Then the tab's one question of which games it sets out (spOn) is stood in by every
           prime-time game, so the card checks below hold on any day; put back at the end */
        { const S0 = w.eval('S'), G0 = S0.sched.find(x => x.id === g2.id), no = nightOpenL(G0, S0.sched), up = no.open == null || w.eval('Date.now()') >= no.open;
          const el = d.querySelector('#spSets [data-sp-wait]'), on = [...d.querySelectorAll('#spSets .sp-game[data-sp-game]')].map(x => x.dataset.spGame).join();
          const TNl = w.eval('TEAM_NAMES'), say = `Next up: Thursday night, ${TNl[g2.a] || g2.a} at ${TNl[g2.h] || g2.h}.` + (no.open != null ? ` Its set goes up ${etSayL(no.open)}, the morning after ${PRIME_NIGHT_L[new Date(no.prev + 'T12:00:00Z').getUTCDay()]}’s ${no.pg > 1 ? 'games' : 'game'}.` : '');
          chk(primeL(G0) && (up ? on === g2.id && !el : on === '' && !!el && el.dataset.spWait === new Date(no.open).toISOString().replace(/\.\d{3}Z$/, 'Z') && el.dataset.spNext === g2.id && txt(el) === say && w.eval('spTier')(fid) === null),
            `${how}: by the night rule the Thursday night game's set is ${up ? 'up' : 'not up until ' + new Date(no.open).toISOString()}, and the tab ${on ? 'sets out ' + on : el ? 'says "' + txt(el) + '"' : 'draws neither a set nor a line'}${up ? '' : ', not "' + say + '"'}`); }
        w.eval('window.__spOnL=spOn; spOn=function(){ return spGames(); }; SP_SHOWN=null; renderParlay()'); await wait(20);
        /* (put back whatever happens below, in its own slot) */
        try {
        const tabBtn = t => d.querySelector(`#tabs [data-tab="${t}"]`), sp = d.getElementById('tab-suggest');
        tabBtn('suggest').click(); await wait(30);
        chk(!!sp && !sp.hidden && tab.hidden && w.location.hash === '#suggest' && txt(d.querySelector('#tabs button[aria-selected="true"]')) === 'Suggested Parlays' && !!sp.querySelector('#spPanel') && !sp.querySelector('#parlayBody'),
          `${how}: the Suggested Parlays tab did not open on its own address (#suggest) with its panel and without the builder`);
        const set = () => d.querySelector(`#spPanel [data-sp-game="${g2.id}"]`);
        /* (app v113, the owner's call of 17 October 2026: "in suggest parlays, get rid of all the long paragraph
           description stuff") the lock line is one short line, and a set draws no lead, foot or record sentence, and
           no line under a level saying why a leg is not a Value pick or a total is there */
        chk(!!set() && txt(set().querySelector('[data-sp-phase="live"]')) === 'Locks Thu 6:15 PM ET, 2 hours before kickoff.',
          `${how}: the Thursday night game's set does not say in one short line that it is live until its lock, 2 hours before kickoff: ` + txt(set()));
        chk(!!set() && ![...set().querySelectorAll('p.pb-thin')].some(p => !p.classList.contains('pb-espnline') && !p.classList.contains('sp-upd')) && !sp.querySelector('#spHead .pb-lead, #spSets .pb-foot, #spRec p')
          && !/Refresh odds updates it until then|is not a Value pick|are not Value picks|One night is shown at a time|Each set is built from its game|The record starts with this change/.test(txt(sp.querySelector('#spHead')) + ' ' + txt(sp.querySelector('#spSets'))),
          `${how}: Suggested Parlays still draws one of its long paragraphs (a lead, a foot, the record's sentence or a level's why-line): ` + txt(sp.querySelector('#spSets')).slice(0, 200));
        const tb = d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`);
        chk(!!tb && /^Finish$/.test(txt(tb)) && !!d.querySelector(`#spPanel [data-sp-add="${fid}"]`) && !d.querySelector(`#spPanel [data-pc-finish="sp|${g2.id}:med"]`) && !d.querySelector(`#spPanel [data-sp-add="${g2.id}:med"]`)
          && txt(set() && set().querySelector('.pb-tier.med .pb-why')) === WHY,
          `${how}: a set's level has no Finish and Add to builder, or an empty level offers one or does not say why`);
        /* each leg of a set has its own Add, 44px, named for the leg, pressed while the leg is in the
           builder: the runner's main line is (the builder holds it from above), the home money line is not */
        const legBtn = key => set() && set().querySelector(`[data-pb-tier="safe"] [data-pb-leg="${key}"]`);
        { const css = [...d.querySelectorAll('style')].map(e => e.textContent).join('\n'), r = (css.match(/\.pb-legadd\{([^}]*)\}/) || [])[1] || '';
          const a = legBtn(mlKey2), b = legBtn(rbKey);
          chk(/min-height:44px/.test(r) && /min-width:44px/.test(r) && set().querySelectorAll('[data-pb-tier="safe"] [data-pb-leg]').length === 2
            && !!a && a.tagName === 'BUTTON' && a.getAttribute('aria-pressed') === 'false' && txt(a) === 'Add' && a.getAttribute('aria-label') === 'Add Home Side, To win, to the builder'
            && !!b && b.getAttribute('aria-pressed') === 'true' && txt(b) === 'Added' && b.getAttribute('aria-label') === `Remove Card Runner, ${rbLabel}, from the builder`,
            `${how}: a set's legs do not each have an Add of 44px named for the leg, pressed only where the leg is in the builder: ` + [a, b].map(x => x ? x.outerHTML : 'none').join(' | ')); }
        const cash = () => [...d.querySelectorAll('#pcView .pc-money b')].map(txt).join(' | ');
        if (tb) { tb.click(); await wait(20);
          chk(!md.hidden && txt(d.querySelector('#pcView .pc-kick')) === `Safe parlay · ${g2.a} at ${g2.h}` && txt(d.querySelector('#pcView .pc-price')) === '+210'
            && ['Home Side', 'To win', '−135', 'Card Runner', rbLabel, '+105'].every(t => txt(d.getElementById('pcView')).includes(t))
            && txt(d.querySelector('#pcView .pc-chance')).startsWith('Fair chance all 2 land 33.0% model says 41.0% · the price says ')
            && cash() === '$40.00 | $124.00 | +$84.00' && d.getElementById('pcAgain').hidden,
            `${how}: the set's card is not its game, legs, price, chance and the $40 amount it pays on (with no Start over, which is the builder's): ` + txt(d.getElementById('pcView')));
          const tA = d.getElementById('pcDk');
          chk(!tA.hidden && tA.getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + [DK_ML2.h, DK_RB].map(x => x.replace(/#/g, '%23')).join('+') && /opens the 2 legs as DraftKings had them then/.test(txt(d.getElementById('pcDkNote'))),
            `${how}: the set's card does not open its legs in DraftKings in the level's order: ` + tA.getAttribute('href'));
          d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          chk(md.hidden && d.activeElement === tb, `${how}: Escape on the card did not close it, or the focus did not go back to the set's Finish`); }
        /* an amount of the visitor's own in the Bet amount box, on the Parlay Builder tab: the set pays on
           it, Finish opens the card on it, and Add to builder leaves it in the builder, whose own Finish
           is on it too */
        { const box = d.getElementById('pbStake'), pay = () => { const p = set() && set().querySelector('[data-pb-tier="safe"] [data-pb-pay]'); return p ? txt(p.querySelector('b')) + ' / ' + txt(p.querySelector('span')) : 'no payout'; };
          chk(!!box && box.value === '40' && pay() === '$124.00 / $40 pays', `${how}: the Parlay Builder has no Bet amount box on the builder's $40, or the set does not pay on it: ${box ? box.value : 'no box'} / ${pay()}`);
          if (box) {
            tabBtn('parlay').click(); await wait(20);
            box.value = '12.5'; box.dispatchEvent(new w.Event('input')); box.dispatchEvent(new w.Event('change')); await wait(20);
            tabBtn('suggest').click(); await wait(30);
            chk(w.eval('S.stake') === 12.5 && d.getElementById('pbStake').value === '12.50' && pay() === '$38.75 / $12.50 pays', `${how}: $12.50 typed in the Bet amount box is not what the set pays on: ${pay()}`);
            const f2 = d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`);
            if (f2) { f2.click(); await wait(20); }
            chk(!!f2 && !md.hidden && cash() === '$12.50 | $38.75 | +$26.25', `${how}: Finish on the set did not open the card on the Bet amount: ` + cash());
            d.getElementById('pcClose').click();
            const add = d.querySelector(`#spPanel [data-sp-add="${fid}"]`);
            if (add) { add.click(); await wait(30); }
            const q = w.PARLAY_CARD.quote(), pS = d.getElementById('pStake'), inB = Object.keys(w.eval('S').parlay).sort().join();
            chk(!!add && inB === [mlKey2, rbKey].sort().join() && !!q && q.stake === 12.5 && !!pS && pS.value === '12.50' && d.activeElement === d.querySelector(`#spPanel [data-sp-add="${fid}"]`),
              `${how}: Add to builder did not leave exactly the set's legs in the builder on the Bet amount, or lost the focus: ${inB} / ${q ? q.stake : 'no builder'}`);
            d.getElementById('pFinish').click(); await wait(20);
            const fmt = x => '$' + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            chk(!md.hidden && !!q && cash() === ['$12.50', fmt(12.5 * q.useDec), '+' + fmt(12.5 * q.useDec - 12.5)].join(' | '), `${how}: the builder's Finish after Add to builder is not on the Bet amount: ` + cash());
            d.getElementById('pcClose').click();
            /* one leg's Add takes that leg out of the builder and puts it back, by the builder's own path
               (the home money line priced at the game's own moneyline), the focus kept on it */
            const a1 = legBtn(mlKey2); if (a1) { a1.click(); await wait(30); }
            const a2 = legBtn(mlKey2);
            chk(!!a1 && Object.keys(w.eval('S').parlay).join() === rbKey && !!a2 && a2.getAttribute('aria-pressed') === 'false' && a2.getAttribute('aria-label') === 'Add Home Side, To win, to the builder' && d.activeElement === a2,
              `${how}: a leg's Add, pressed while the leg is in the builder, did not take that leg alone out, or lost the focus: ` + Object.keys(w.eval('S').parlay).join());
            if (a2) { a2.click(); await wait(30); }
            const a3 = legBtn(mlKey2), L = w.eval('S').parlay[mlKey2];
            chk(!!L && Object.keys(w.eval('S').parlay).length === 2 && L.price === ML_G2.h && L.src === 'real' && L.stat === 'ml' && L.team === g2.h
              && !!a3 && a3.getAttribute('aria-pressed') === 'true' && txt(a3) === 'Added' && a3.getAttribute('aria-label') === 'Remove Home Side, To win, from the builder' && d.activeElement === a3,
              `${how}: a leg's Add did not put that leg in the builder at the game's own moneyline, or does not read Added with the focus on it: ` + JSON.stringify(L)); } }
        /* locked: from 2 hours before kickoff the set is the site's, the record's entry for the game (the
           props job's suggest_ledger.json, its prime map, made up here: this smoke's fetch stub serves no
           record), taken before the lock on other legs than the live set's, the away money line and the
           runner's line; the page's clock is moved to an hour before kickoff (Date.now alone: kickoff()
           reads the schedule's own times) and set back after */
        { const realNow = w.Date.now, kIso = new Date(KICK).toISOString().replace(/\.\d{3}Z$/, 'Z'), taken = new Date(KICK - 5.25 * 3600e3).toISOString().replace(/\.\d{3}Z$/, 'Z');
          const legOut = (l, fair) => ({ gid: l.gid, week: wk, pid: l.pid, team: l.team, grp: l.grp, stat: l.stat, k: l.k, side: l.side, main: !!l.main, price: l.price, src: 'real', name: l.name, label: l.label, p: l.p, fair, fair_est: false, thin: false, market: false });
          const away = { gid: g2.id, pid: 'team:' + g2.a, team: g2.a, grp: 'TEAM', stat: 'ml', k: 0, side: 'over', main: false, price: ML_G2.a, name: 'Away Side', label: 'To win', p: 0.5 };
          /* the Safe pair as the job keeps it: its chance and price the builder's sums on its legs, rounded as the
             record rounds them (4 places, 3); the card states the builder's own sums on the legs as kept, which Add
             to builder then pays, never the rounded figures */
          const safeLegs = [legOut(away, 0.45), legOut(builder(side)[rbKey], 0.5)], L2 = w.eval('pbOrder')(safeLegs.map(l => ({ ...l, key: `${l.gid}|${l.pid}|${l.stat}` })));
          const pj = w.eval('parlayProb')(L2).corr, dj = w.eval('parlayDec')(L2.map(l => ({ leg: l, ml: l.price }))), mny = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const entry = { season: SEA, week: wk, gid: g2.id, away: g2.a, home: g2.h, kickoff: kIso, lock: new Date(LOCK).toISOString().replace(/\.\d{3}Z$/, 'Z'), baked_at: taken, pool: {}, taken_at: taken,
            tiers: [{ id: 'safe', label: 'Safe', n: 2, floor: 0, legs: safeLegs, p: Math.round(pj * 1e4) / 1e4, fair: 0.25, fair_est: false, dec: Math.round(dj * 1e3) / 1e3, likeliest: false, thin: 0, mkt: 0 },
              ...[['med', 'Medium', 3, 0.25], ['aggr', 'Aggressive', 4, 0.12], ['xtrm', 'Extreme', 5, 0.05]].map(([id, label, n, floor]) => ({ id, label, n, floor, why: WHY }))] };
          w.eval(`PB_REC=${JSON.stringify({ prime: { [`${SEA}|${String(wk).padStart(2, '0')}|${kIso}|${g2.id}`]: entry } })}; PB_REC_DONE=true;`);
          w.Date.now = () => KICK - 3600e3;
          w.eval('renderParlay()'); await wait(30);
          const ph = set() && set().querySelector('[data-sp-phase]');
          /* (app v113) one short line: the record's set is the one shown (its legs, below), "Locked since Thu 6:15 PM ET." */
          chk(!!ph && ph.getAttribute('data-sp-phase') === 'locked' && txt(ph) === 'Locked since Thu 6:15 PM ET.' && !!ph.querySelector('.sp-lockmark') && txt(ph.querySelector('.sp-lockmark')) === 'Locked',
            `${how}: an hour before kickoff the set is not marked Locked in one short line, "Locked since Thu 6:15 PM ET.": ` + txt(ph));
          const lf = d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`);
          if (lf) { lf.click(); await wait(20); }
          chk(!!lf && !md.hidden && txt(d.querySelector('#pcView .pc-kick')) === `Safe parlay · ${g2.a} at ${g2.h}` && txt(d.querySelector('#pcView .pc-price')) === w.eval('fmtML')(w.eval('decToML')(dj)).replace('-', '−')
            && ['Away Side', '+115', 'Card Runner', rbLabel, '+105'].every(t => txt(d.getElementById('pcView')).includes(t)) && !txt(d.getElementById('pcView')).includes('Home Side')
            && txt(d.querySelector('#pcView .pc-chance')).startsWith(`Fair chance all 2 land 25.0% model says ${(pj * 100).toFixed(1)}% · the price says `)
            && cash() === `${mny(12.5)} | ${mny(12.5 * dj)} | +${mny(12.5 * dj - 12.5)}`
            && d.getElementById('pcDk').getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + [DK_ML2.a, DK_RB].map(x => x.replace(/#/g, '%23')).join('+'),
            `${how}: Finish on a locked set does not open the record's set, its legs, price, chance and the amount: ` + txt(d.getElementById('pcView')) + ' / ' + d.getElementById('pcDk').getAttribute('href'));
          if (lf) { d.getElementById('pcClose').click(); chk(d.activeElement === lf, `${how}: closing the locked set's card did not give the focus back to its Finish`); }
          chk(w.localStorage.getItem('props_sp_lock_v1') === null, `${how}: a locked set the record has was kept in the browser as the page's own`);
          /* the record keeps both legs as Value picks (thin false, no total): the locked card marks each Value (app v112) */
          chk(!!set() && [...set().querySelectorAll('[data-pb-tier="safe"] .pb-legs li')].length === 2 && [...set().querySelectorAll('[data-pb-tier="safe"] .pb-legs li')].every(li => li.querySelectorAll('i.pb-valmark').length === 1 && txt(li.querySelector('i.pb-valmark')) === 'Value')
            && !/\bthin[ -]edge\b|\bno edge\b/i.test(txt(set())), `${how}: the locked set's legs, kept as Value picks, are not each marked Value, or the set still says thin edge or no edge`);
          w.Date.now = realNow; w.eval('PB_REC=null; renderParlay()'); await wait(20); }
        } finally { w.eval('spOn=window.__spOnL; delete window.__spOnL; SP_SHOWN=null; renderParlay()'); }
        await wait(20);
        chk(w.eval('S').saved.map(p => p.id).join() === 'saved-before' && reads(), `${how}: finishing a suggestion saved it`); }
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
