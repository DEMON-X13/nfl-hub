/* Check the built X NFL Bets and Stats page (nflbets/).
 *
 *   node nflbets/build/smoke.js                  (from the hub root)
 *   node nflbets/build/smoke.js --season-over    the same, on this season with every game played
 *
 * The second is how the playoffs and the off-season look to the page: every game in
 * betting/state.json has its result (24-17 to the home side where it has none yet, on a line of
 * its own where it has none: the home side by 2.5, 44.5 points, -140/+120) and is graded. The elo
 * job runs the plain smoke every morning, January included, so a change to this file or to the
 * Pick'ems board is run both ways.
 *
 * Boots the real page against a stubbed state.json and payload.json: the Pick'ems board, the
 * call on each game, the prop model's prices that open underneath one, and the Props tab,
 * which is the prop model's Games tab running in this page. X Parlays and the X Bet Log are the
 * files liveparlays/parlays.json and liveparlays/xbets.json, read only on every device: there is
 * no owner and no shared store, every request a page makes is recorded, and one to the retired
 * store or its sign-in services, or anything but a read, fails the smoke. A browser that still
 * carries what the retired layers left shows exactly the files and loses none of its own data.
 * jsdom and PapaParse are borrowed from props/build, so this needs no install of its own.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM, VirtualConsole } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
const HTML = fs.readFileSync(path.join(ROOT, 'nflbets', 'index.html'), 'utf8');
const STATE = JSON.parse(fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8'));
const SEASON_OVER = process.argv.includes('--season-over');
if (SEASON_OVER) {
  const proto = Object.values(STATE.processed)[0] || {};
  STATE.odds = STATE.odds || {};
  for (const g of STATE.schedule) {
    if (g.result != null) continue;
    if (g.spread_line == null) g.spread_line = 2.5;
    if (g.total_line == null) g.total_line = 44.5;
    if (!STATE.odds[g.game_id]) STATE.odds[g.game_id] = { home: -140, away: 120, src: 'smoke' };
    Object.assign(g, { home_score: 24, away_score: 17, result: 7 });
    STATE.processed[g.game_id] = Object.assign(JSON.parse(JSON.stringify(proto)),
      { week: +g.week, home: g.home_team, away: g.away_team, pick: g.home_team, result: 7, correct: true, line: g.spread_line });
  }
}
const PARLAYS = fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8');
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const ELO_P = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'players.json'), 'utf8');
/* the X Bet Log's file, as every device reads it */
const XBETS_REAL = fs.readFileSync(path.join(ROOT, 'liveparlays', 'xbets.json'), 'utf8');
/* the prop model's storage key, part2's own (the build hands it to the page) */
const PROP_KEY = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=\d{4}, KEY='([^']+)';/)[1];
/* the betting app's own key and season: the X Bet Log is that season's */
const { BET_KEY, SEASON: BET_SEASON } = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
const ELO_M = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'model.json'), 'utf8');
/* the matchups as published, except in a thin week (a lone Monday game has one or two players
   whose nudge clears the Elo picks' bar): then three real players' strongest trusted nudges are
   raised to clear it, in this copy only, so the Elo picks checks run on any day of the week */
const ELO_MU = (() => {
  const raw = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'matchups.json'), 'utf8'), M = JSON.parse(raw);
  const ok = (g, st) => { const q = ((M.record[g + '|' + st] || {}).past); return !!q && q.rmse_elo < q.rmse_form && q.right_top >= 0.53; };
  const best = {};
  for (const [pid, v] of Object.entries(M.players || {})) for (const [st, a] of Object.entries(v.stats)) {
    if (!ok(v.group, st)) continue; const z = a[2] / M.fit[v.group + '|' + st].sd;
    if (!best[pid] || z > best[pid].z) best[pid] = { pid, st, z }; }
  const top = Object.values(best).sort((x, y) => y.z - x.z);
  if (top.filter(x => x.z >= 0.12).length >= 3) return raw;
  for (const x of top.slice(0, 3)) { const v = M.players[x.pid]; v.stats[x.st][2] = 0.2 * M.fit[v.group + '|' + x.st].sd; }
  return JSON.stringify(M);
})();

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
/* how the smoke ends, whichever way it ends: the count, every failure, an exit code. The jsdom
   windows it leaves open (the X Parlays section's refresh, among others) keep the
   process alive, so nothing ends it but this. */
let ended = false;
function finish(why) {
  if (ended) return; ended = true;
  if (why) { checks++; fails.push(why); }
  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
}
/* a promise the page leaves rejected (an async handler that threw) is a failure, not a crash.
   The smoke's own code never lands here: its body ends in a .catch that stops the run with the
   stack, so a mistake in the smoke is a fast exit 1, never a run that waits on open windows. */
process.on('unhandledRejection', e => { checks++; fails.push('the page threw in an async handler: ' + (e && e.stack || e)); });
/* and it never hangs: the elo job runs it every morning with no time limit of its own, so a run
   still going after ten minutes (it takes one or two) stops with what it has, and fails */
const SMOKE_LIMIT_MS = 10 * 60 * 1000;
setTimeout(() => finish(`the smoke did not finish in ${Math.round(SMOKE_LIMIT_MS / 1000)} s: stopped with what it had`), SMOKE_LIMIT_MS).unref();
/* nor does it pass by running out of things to wait on: a body stuck on a promise nothing will
   settle, with no window open to keep the process up, would otherwise end Node with exit 0 and
   no count, which a job reads as a pass */
process.on('beforeExit', () => finish('the smoke stopped before it finished: its body was waiting on something nothing would settle'));

/* ---- the published page is a fresh build of its sources ----
   Nothing rebuilds the page on a schedule: it is rebuilt by hand when a source changes. A
   source committed without the rebuild would pass every other check while the site served the
   old page, so the build is run here in memory and must match the published files byte for
   byte. The elo job runs this smoke every morning, so a stale page stops it loudly. */
{ let B = null;
  try { B = require('./build.js'); } catch (e) { chk(false, 'the sources do not build: ' + e.message); }
  if (B) {
    chk(B.out === HTML, 'nflbets/index.html is not a fresh build of its sources: run node nflbets/build/build.js and commit the page');
    chk(B.pv === fs.readFileSync(path.join(ROOT, 'nflbets', 'preview.html'), 'utf8'), 'nflbets/preview.html is not a fresh build of its sources: run node nflbets/build/build.js');
    chk(!/PROP_KEY=\/\*PROP_KEY\*\/'/.test(HTML) && (HTML.match(/PROP_KEY=\/\*PROP_KEY\*\/"([^"]+)"/g) || []).length === 1 && HTML.split(`PROP_KEY=/*PROP_KEY*/${JSON.stringify(B.PROP_KEY)}`).length === 2,
      "the storage layer is not on part2's storage key " + B.PROP_KEY); }
}
/* ---- the betting app inside the page carries the gated model numbers ----
   betting/tools/update.js gates the app source against reference_models.json; this is the same
   gate on the copy the site actually serves, the BET_APP string in nflbets/index.html */
{ const m = HTML.match(/\nconst BET_APP=("(?:[^"\\]|\\.)*");\n<\/script>/);
  const app = m ? JSON.parse(m[1]) : '';
  const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'betting', 'tools', 'reference_models.json'), 'utf8'));
  const emb = name => { const x = app.match(new RegExp('^const ' + name + ' = (\\{.*?\\});$', 'm')); try { return x ? JSON.parse(x[1]) : null; } catch (e) { return null; } };
  const close = (a, b, tol) => {
    if (a && typeof a === 'object' && !Array.isArray(a)) { const ka = Object.keys(a), kb = Object.keys(b || {}); return ka.length === kb.length && ka.every(k => close(a[k], b[k], tol)); }
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => close(x, b[i], tol));
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol;
    return a === b; };
  const A = emb('MODEL'), H = emb('MODEL_H'), QB = emb('QB_MODEL'), bad = [];
  if (!A || !H || !QB) bad.push('the model constants are missing');
  else { for (const k of ['params', 'league_means', 'pure', 'teams']) { if (!close(A[k], ref.A[k], 1e-9)) bad.push('MODEL.' + k); if (!close(H[k], ref.H[k], 1e-9)) bad.push('MODEL_H.' + k); }
    if (!close(QB, ref.QB, 1e-9)) bad.push('QB_MODEL'); }
  chk(app.length > 100000 && bad.length === 0, 'the betting app in the published page does not carry the reference model numbers: ' + bad.join(', '));
}
/* the page's clock. In the season the page runs on the real one. Once the prop model's last game
   is about to kick off (its final weekend, the playoffs, the off-season, until next season's
   schedule is in the payload) no game can take a builder leg, and much of what is checked here
   (the builder, the badges and second prices on its legs, the Finish card) has nothing
   to stand on; the page is then booted two days before that last kickoff, as it was on the
   Friday of the season's final weekend. The board, the results and the grades come from the
   files, so they are checked as they are. Schedule times are US Eastern, read through the time
   zone database rather than a date the clocks change on. */
const etKick = r => { const naive = Date.parse(`${r.d}T${r.t || '13:00'}:00Z`); if (!isFinite(naive)) return NaN;
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(naive)).find(p => p.type === 'timeZoneName');
  const m = tz && tz.value.match(/GMT([+-]\d+)/); return naive - (m ? +m[1] : -5) * 3600e3; };
const LAST_KICK = Math.max(...(JSON.parse(PAYLOAD).sched || []).map(etKick).filter(isFinite));
const PAGE_SHIFT_MS = isFinite(LAST_KICK) && Date.now() > LAST_KICK - 3600e3 ? Date.now() - (LAST_KICK - 2 * 86400e3) : 0;
function shiftClock(w) {
  if (!PAGE_SHIFT_MS) return;
  const D0 = w.Date;
  class D extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() - PAGE_SHIFT_MS); }
    static now() { return D0.now() - PAGE_SHIFT_MS; } }
  w.Date = D;
}
if (PAGE_SHIFT_MS) console.log(`the payload's last game kicks off within the hour or has: the page is run as at ${new Date(Date.now() - PAGE_SHIFT_MS).toISOString()}, two days before it`);
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const wait = ms => new Promise(r => setTimeout(r, ms));
/* a box's overflow both ways (jsdom keeps the shorthand apart from the longhands), the box a table
   scrolls in at a desktop width (it or one between it and its card: jsdom reads only the rules a
   desktop screen gets), and whether a sticky cell can stick in that box: nothing between them may
   be a box of its own, as the page's every-table clip would make the table one that never scrolls */
const ovf = (w, el) => { const c = w.getComputedStyle(el), o = c.getPropertyValue('overflow').trim().split(/\s+/).filter(Boolean);
  return [c.getPropertyValue('overflow-x') || o[0] || 'visible', c.getPropertyValue('overflow-y') || o[1] || o[0] || 'visible']; };
const scrollBox = (w, card, table) => { for (let el = table; el && el !== card; el = el.parentElement) if (/^(auto|scroll)$/.test(ovf(w, el)[0])) return el; return null; };
const sticksIn = (w, cell, box) => { if (!cell || !box || w.getComputedStyle(cell).getPropertyValue('position') !== 'sticky') return false;
  for (let el = cell.parentElement; el && el !== box; el = el.parentElement) if (ovf(w, el).some(v => !/^(visible|clip)$/.test(v))) return false;
  return true; };
const TEAM = t => ({ LA: 'Rams', KC: 'Chiefs', IND: 'Colts', NYG: 'Giants' }[t] || t);

/* the game the builder checks put their legs on: the season's last kickoff still to come, so
   it does not kick off while the smoke runs (the prop model drops a builder leg whose game has
   started), whatever day of the week the smoke runs on */
function laterGame(w, S) {
  const ko = x => { const k = w.eval('kickoff')(x); return k ? k.getTime() : -Infinity; }, started = w.eval('gameStarted');
  return S.sched.filter(x => !started(x)).sort((a, b) => ko(b) - ko(a))[0] || null;
}

/* the week the board opens on, taken the way the board takes it: the first week with a game
   still to play (no published result), and once every game has one (the playoffs, the
   off-season) the last week of the schedule. Never Infinity. */
function openWeek(st) {
  const weeks = [...new Set(st.schedule.map(g => +g.week))].sort((a, b) => a - b);
  return weeks.find(wk => st.schedule.some(g => +g.week === wk && g.result == null)) || weeks[weeks.length - 1];
}

/* what ESPN's scoreboard says about the week: for the games with no published result, the
   first is over (the home side won 27-20), the second is on (the away side leads 14-10 in
   the third quarter), the rest have not kicked off. Games with a result are final. */
function scoreboard(state, week) {
  const games = state.schedule.filter(g => +g.week === week);
  let n = 0;
  return { events: games.map(g => {
    const graded = g.result != null;
    const kind = graded ? 'final' : (n++ === 0 ? 'post' : (n === 2 ? 'in' : 'pre'));
    const hs = kind === 'final' ? g.home_score : kind === 'post' ? 27 : kind === 'in' ? 10 : 0;
    const as = kind === 'final' ? g.away_score : kind === 'post' ? 20 : kind === 'in' ? 14 : 0;
    const st = kind === 'in' ? { state: 'in', shortDetail: 'Q3 5:44' } : kind === 'pre' ? { state: 'pre', shortDetail: '8:15 PM' } : { state: 'post', shortDetail: 'Final' };
    return { id: 'e' + g.game_id, date: g.gameday + 'T17:00Z', status: { type: st }, competitions: [{ competitors: [
      { homeAway: 'home', team: { abbreviation: g.home_team }, score: String(hs) },
      { homeAway: 'away', team: { abbreviation: g.away_team }, score: String(as) } ] }] };
  }) };
}

/* boot the page; resolves once the prop model says it is ready and the board has drawn */
/* There is no owner and no shared store: X's parlays and the X Bet Log are the files
   liveparlays/parlays.json and liveparlays/xbets.json, read by every device. The retired store
   (a Firebase database) and its sign-in and token services must never be asked anything, and no
   page may send anything but a read: every request of every run is kept, and one that breaks the
   rule is refused and kept in BAD_CALLS, which fails the smoke. */
const RETIRED = /firebaseio\.com|firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|store\.test/;
const ALL_CALLS = [], BAD_CALLS = [];
/* the parlay file some checks read in place of the real one: three placed parlays of their own (a
   player leg, a team bet, and one cleared), so they hold whatever the real file holds this week */
const FIXFILE = { updated: '2026-10-10T17:28:45Z', games: [`${BET_SEASON}_18_XXA_XXH`], parlays: [
  { id: 'fx-player', week: 18, stake: 5, price: 300, payout: 20, legs: [{ game: 0, player: 'Fixture Receiver', team: 'XXH', stat: 'receiving_yards', line: 50.5, side: 'over', main: true }] },
  { id: 'fx-team', week: 18, stake: 2, price: 120, payout: 4.4, legs: [{ game: 0, player: 'Fixture Home', team: 'XXH', stat: 'ml', line: 0, side: 'over', main: false }] },
  { id: 'fx-gone', cleared: true, week: 18, stake: 1, price: 150, payout: 2.5, legs: [{ game: 0, player: 'Fixture Runner', team: 'XXA', stat: 'rushing_yards', line: 60.5, side: 'over', main: true }] }] };
/* the X Bet Log as it was carried over from the retired store on 10 October 2026, for this season */
const XBFIX = { season: BET_SEASON, updated: '2026-10-10T17:28:44Z', deposit: 100, weeks: {
  w1: { staked: 10, returned: 8.71, note: '' }, w3: { staked: 11, returned: 14.66, note: '' }, w4: { staked: 8, returned: 29.02, note: '' } } };

/* seed: what the browser holds before the page opens; file: the parlay file it reads in place of
   liveparlays/parlays.json; xbets: the X Bet Log's file in place of liveparlays/xbets.json (404:
   it does not answer). Every request is in `calls` with its method and cache mode. */
function run(state, url = 'https://demon-x13.github.io/nfl-hub/nflbets/', espn = null, noState = false, { seed = null, file = null, xbets = null } = {}) {
  return new Promise(resolve => {
    const errs = [], fetched = [], urls = [], calls = [];
    const vc = new VirtualConsole(); vc.sendTo(console, { omitJSDOMErrors: true });
    vc.on('jsdomError', e => { if (!/navigation/i.test(String(e && e.message))) console.error('jsdom: ' + (e && e.message)); });
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: vc,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        shiftClock(w);
        w.addEventListener('error', e => errs.push(e.message));
        if (seed) seed(w);
        w.fetch = (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase();
          fetched.push(s.replace(/\?.*$/, '')); urls.push(s); calls.push({ url: s, method: m, cache: o && o.cache || null }); ALL_CALLS.push(m + ' ' + s);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); return Promise.reject(new TypeError('Failed to fetch')); }
          if (s.includes('state.json')) return noState
            ? Promise.resolve({ ok: false, status: 404 })
            : Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PAYLOAD) });
          if (s.includes('parlays.json')) return Promise.resolve({ ok: true, status: 200, json: async () => file ? JSON.parse(JSON.stringify(file)) : JSON.parse(PARLAYS) });
          if (s.includes('xbets.json')) return Promise.resolve(xbets === 404 ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => xbets ? JSON.parse(JSON.stringify(xbets)) : JSON.parse(XBETS_REAL) });
          if (s.includes('elo/data/players.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_P) });
          if (s.includes('elo/data/model.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_M) });
          if (s.includes('elo/data/matchups.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_MU) });
          if (espn && s.includes('/scoreboard')) { const wk = +(s.match(/week=(\d+)/) || [])[1]; return Promise.resolve({ ok: true, status: 200, json: async () => espn(wk) }); }
          return Promise.resolve({ ok: false, status: 404 }); };
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, errs, fetched, urls, calls }), 300));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs, fetched, urls, calls, timedOut: true }), 20000);
  });
}
(async () => {
  const state = STATE, week = openWeek(STATE);
  /* whether that week has a game still to play: in the playoffs and the off-season every game
     has its result, the board opens on the last week, and the checks that need a game to come
     (the scoreboard's live and just-finished games) wait for next season */
  const toPlay = state.schedule.filter(g => +g.week === week && g.result == null);
  const { w, d, errs, fetched, urls, calls, timedOut } = await run(state, undefined, wk => scoreboard(state, wk));
  await wait(700);                                  /* the scoreboard is read once on load, after the prop model is up */

  chk(!timedOut, 'the prop model never said app-ready');
  /* the preview is the same page with the NBA Hub theme laid over it, and the live page has none of it */
  { const PV = fs.readFileSync(path.join(ROOT, 'nflbets', 'preview.html'), 'utf8'), LIVE = fs.readFileSync(path.join(ROOT, 'nflbets', 'index.html'), 'utf8');
    chk(/id="previewTheme"/.test(PV) && /<script>window\.PREVIEW_FRAME_HEAD=/.test(PV) && /<em>Bets and Stats<\/em>/.test(PV), 'nflbets/preview.html is missing its theme');
    chk(!/id="previewTheme"/.test(LIVE) && !/<script>window\.PREVIEW_FRAME_HEAD=/.test(LIVE), 'the preview theme leaked into the live page'); }
  chk(errs.length === 0, 'the page threw: ' + errs.join('; '));
  chk(d.title === 'X NFL Bets and Stats' && /X NFL Bets and Stats/.test(txt(d.querySelector('h1'))), 'the page is not headed X NFL Bets and Stats');

  /* the tab bar: Pick'ems open, the prop model's other sections in the page but not on the
     bar */
  const tabs = [...d.querySelectorAll('#tabs button')].map(b => b.textContent.trim());
  chk(tabs.join('|') === "Pick'ems|Props|X Parlays|Team Rankings|ELO Ratings|Pick'em Record|X Bet Log", 'tabs are ' + tabs.join('|'));
  chk(!d.querySelector('header a'), 'the header carries a link');
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'Pick\'ems is not the open tab');
  for (const id of ['tab-slate', 'tab-parlay', 'tab-track', 'tab-week', 'tab-backup'])
    chk(!!d.getElementById(id), `the prop model's ${id} section is missing, and its listeners with it`);
  /* which build: the prop model's version and the page's own hash, so a change to any source
     (not only the prop model's parts) shows as a new tag */
  { const m = HTML.match(/const PAGE_HASH='([0-9a-f]{7})';/);
    chk(!!m && txt(d.getElementById('buildTag')) === w.eval('APP_BUILD') + ' \u00b7 ' + m[1],
      'the page does not say which build it is, prop model and page hash: ' + txt(d.getElementById('buildTag')));
    /* the hash is the page's own: taken out again, the page hashes to it */
    const B = require('./build.js');
    chk(!!m && require('crypto').createHash('sha256').update(HTML.replace(m[0], `const PAGE_HASH='${B.HASH_SLOT}';`)).digest('hex').slice(0, 7) === m[1],
      'the build tag\'s hash is not the hash of this page: it was edited after it was built'); }

  /* ---- Pick'ems ---- */
  let cards = [...d.querySelectorAll('.pk-game')];
  const want = state.schedule.filter(g => +g.week === week).length;
  chk(cards.length === want, `expected ${want} games in week ${week}, got ${cards.length}`);
  chk(+d.getElementById('pkWeek').value === week, toPlay.length ? 'the board did not open on the first week with a game to play' : 'with every game played, the board did not open on the last week');
  chk(/Vegas · week \d+ \d+–\d+/.test(txt(d.getElementById('pkWeekRec'))), 'no week record: ' + txt(d.getElementById('pkWeekRec')));
  /* Vegas is the board's baseline: the favourite by the moneylines with the margin out */
  const vegasPick = g => { const o = (state.odds || {})[g.game_id], im = x => x < 0 ? -x / (-x + 100) : 100 / (x + 100);
    if (!o || !o.home || !o.away) return null; return im(o.home) / (im(o.home) + im(o.away)) >= 0.5 ? g.home_team : g.away_team; };
  chk(/Season \d+–\d+/.test(txt(d.getElementById('pkSeasonRec'))), 'no season record');

  /* the row is the betting app's: header, split bar, band, final-score cell */
  chk(!!d.querySelector('.pk-gamehead') && /Date.*Matchup.*Win probability.*Confidence.*Score prediction.*Final score/.test(txt(d.querySelector('.pk-gamehead'))),
    'the column header is not the betting board\'s');
  chk(cards.every(c => c.querySelector('.pk-probrow .pk-prob .pk-a') && c.querySelector('.pk-probrow .pk-prob .pk-h')), 'a game is missing its split bar');
  /* the board makes a call wherever Vegas has priced the game (both moneylines, or a spread),
     and says "no call yet" where it has not: a week whose lines are not posted is not a failure */
  const gameOf = c => state.schedule.find(x => x.game_id === c.dataset.game);
  const lined = g => { const o = (state.odds || {})[g.game_id];
    return !!(o && isFinite(o.home) && isFinite(o.away) && o.home && o.away) || (g.spread_line != null && isFinite(g.spread_line) && +g.spread_line !== 0); };
  chk(cards.every(c => lined(gameOf(c)) ? /HIGH|MED|LOW|50\/50/.test(txt(c.querySelector('.pk-tier'))) : /no call yet/.test(txt(c.querySelector('.pk-tier')))),
    'a game Vegas has priced is missing its confidence band, or one it has not shows a band');
  chk(cards.every(c => !!c.querySelector('.pk-ttag.pk-win') === lined(gameOf(c))), 'a game Vegas has priced has no pick marked on a matchup tag, or one it has not has a pick');
  /* the week still to play has its lines: they are posted well before the board reaches it */
  if (toPlay.length) chk(cards.some(c => lined(gameOf(c))), `no game in week ${week}, the week still to play, has a Vegas line`);
  chk(!d.querySelector('#tab-pickems .ttag'), 'a betting tag came through in the prop model\'s class names');
  chk(cards.every(c => c.querySelector('.pk-result')), 'a game is missing its final-score cell');
  /* every pick on the board is the Vegas favourite */
  { const bad = cards.filter(c => { const g = state.schedule.find(x => x.game_id === c.dataset.game), v = vegasPick(g), w = c.querySelector('.pk-ttag.pk-win');
      return v && (!w || txt(w) !== v); });
    chk(bad.length === 0, `the board's picks are not the Vegas favourites on ${bad.length} games`); }
  /* the score prediction: the spread split around the book's total, whole points */
  const PAYLOAD = JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8'));
  let predOk = 0, predAll = 0;
  for (const c of cards) {
    const g = state.schedule.find(x => x.game_id === c.dataset.game), v = vegasPick(g);
    const row = PAYLOAD.sched.find(x => x.id === g.game_id), tot = g.total_line != null ? g.total_line : (row && row.tot);
    if (!v || g.spread_line == null || !row || tot == null) continue;
    predAll++;
    let hs = Math.round((tot + g.spread_line) / 2), as = Math.round((tot - g.spread_line) / 2);
    if (hs === as) { if (v === g.home_team) hs++; else as++; }
    if (txt(c.querySelector('.pk-pred .pk-psc')) === `${as}–${hs}`) predOk++;
  }
  chk((predAll > 0 || !toPlay.length) && predOk === predAll, `score predictions are the spread around the book's total: ${predOk} of ${predAll}`);
  /* a prediction's "by" is the gap between the two scores it shows */
  { const bad = cards.filter(c => { const m = txt(c.querySelector('.pk-pred .pk-psc')).match(/^(\d+)–(\d+)$/), by = txt(c.querySelector('.pk-pred .pk-pby')).match(/by (\d+)/);
      return m && (!by || +by[1] !== Math.abs(+m[1] - +m[2])); });
    chk(bad.length === 0, `a predicted margin disagrees with its own score on ${bad.length} games`); }
  /* the scoreboard is asked for in state.json's season, in ESPN's numbering of the week */
  const espnWk = wk => wk <= 18 ? `seasontype=2&week=${wk}` : `seasontype=3&week=${wk >= 22 ? 5 : wk - 18}`;
  chk(urls.some(u => u.includes('/scoreboard?') && u.includes(`${espnWk(week)}&dates=${state.season}`)), 'the Pick\'ems board did not read the scoreboard for its own season and week: ' + urls.filter(u => u.includes('/scoreboard?')).join(' '));
  /* a neutral-site game reads "vs" and every other "at" */
  { const neutralOf = g => g.location === 'Neutral' || g.gametime === '09:30';
    const bad = cards.filter(c => { const g = state.schedule.find(x => x.game_id === c.dataset.game); return (txt(c.querySelector('.pk-at')) === 'vs') !== neutralOf(g); });
    chk(bad.length === 0, 'a neutral-site game reads "at", or a home game "vs": ' + bad.map(c => c.dataset.game).join(', ')); }
  /* the season-over note shows exactly when every game is graded and the schedule has no playoffs */
  chk(!!d.getElementById('pkOver') === (state.schedule.every(g => g.result != null) && !state.schedule.some(g => +g.week > 18)), 'the season-over note is wrong for this season');
  const pend = cards.filter(c => /0 : 0/.test(txt(c.querySelector('.pk-result')))).length;
  const done = cards.filter(c => / won /.test(txt(c.querySelector('.pk-result')))).length;
  const on = cards.filter(c => / leading |Tied /.test(txt(c.querySelector('.pk-result')))).length;
  chk(pend + done + on === cards.length, `every result cell is 0 : 0, a result or a game on now: ${pend} + ${done} + ${on} of ${cards.length}`);
  /* the scoreboard was read on load: a game the job has not reached shows what ESPN says */
  const ungraded = toPlay;
  chk(/scores \d/.test(txt(d.getElementById('pkStamp'))), 'the Pick\'ems stamp does not say when the scoreboard was read: ' + txt(d.getElementById('pkStamp')));
  if (ungraded.length) {
    const g0 = ungraded[0], c0 = cards.find(c => c.dataset.game === g0.game_id), hit0 = vegasPick(g0) === g0.home_team;
    chk(new RegExp(`${g0.home_team} won 20–27`).test(txt(c0.querySelector('.pk-result'))) && new RegExp(hit0 ? 'Pick hit' : 'Pick missed').test(txt(c0.querySelector('.pk-result'))),
      'a game finished on the scoreboard does not read "HOME won 20–27" with the favourite\'s result: ' + txt(c0.querySelector('.pk-result')));
    chk(!!c0.querySelector(`.pk-tw.pk-home .pk-res.${hit0 ? 'pk-ok' : 'pk-bad'}`) && c0.classList.contains('pk-played'), 'the scoreboard winner carries no tick or cross');
    chk(c0.querySelector('.pk-result .pk-mwin').classList.contains(hit0 ? 'pk-ok' : 'pk-bad'), 'a finished call is not coloured by whether it landed');
  }
  if (ungraded.length > 1) {
    const g1 = ungraded[1], c1 = cards.find(c => c.dataset.game === g1.game_id);
    chk(new RegExp(`${g1.away_team} leading 14–10`).test(txt(c1.querySelector('.pk-result'))) && /Q3 5:44/.test(txt(c1.querySelector('.pk-result'))),
      'a game on now does not read "AWAY leading 14–10 / Q3 5:44": ' + txt(c1.querySelector('.pk-result')));
    const behind = vegasPick(g1) === g1.home_team;
    chk(c1.querySelector('.pk-result .pk-mwin').classList.contains(behind ? 'pk-bad' : 'pk-ok') && !c1.querySelector('.pk-res'), 'a call on now is not coloured by whether it leads, or a game on now carries a mark');
  }
  /* the button reads again (the X Parlays section reads the scoreboard too, so count the delta) */
  const sbReads = () => fetched.filter(u => u.includes('/scoreboard')).length;
  const sbBefore = sbReads();
  d.getElementById('pkNow').click();
  await wait(200);
  chk(sbReads() === sbBefore + 1, `Refresh scores did not read the scoreboard again: ${sbBefore} -> ${sbReads()}`);
  cards = [...d.querySelectorAll('.pk-game')];        /* the board is redrawn on every read */
  /* the games still to play first, the finals under one Completed heading right above them */
  { const kids = [...d.getElementById('pkBoard').children].filter(n => n.matches('.pk-game,.pk-sep'));
    const firstFin = kids.findIndex(n => n.matches('.pk-game.pk-played')), seps = kids.filter(n => n.matches('.pk-sep'));
    const lastTodo = kids.map(n => n.matches('.pk-game:not(.pk-played)')).lastIndexOf(true);
    chk(firstFin < 0 || lastTodo < firstFin, 'a game still to play sits below a final on the board');
    chk(firstFin < 0 ? seps.length === 0 : (seps.length === 1 && kids[firstFin - 1] === seps[0] && /Completed/.test(txt(seps[0]))),
      'the board\'s Completed heading is missing, doubled or not right above the first final'); }
  const graded = cards.find(c => c.classList.contains('pk-played') && lined(gameOf(c)));
  if (graded) chk(!!graded.querySelector('.pk-matchup .pk-res') && /Pick (hit|missed)/.test(txt(graded.querySelector('.pk-result'))),
    'a graded game shows no tick or cross and no Pick hit/missed');

  /* nothing is open until a game is clicked */
  chk(!d.querySelector('.pk-gbody'), 'a game was open before anything was clicked');

  /* open one and the prop model prices both sides, off its own state */
  const first = cards[0];
  first.click();
  await wait(60);
  const body = first.querySelector('.pk-gbody');
  chk(!!body, 'clicking a game opened nothing');
  chk(!!body && !!body.querySelector('.gbets') && /Game bets/.test(txt(body.querySelector('.gbets h2'))), 'the opened game is not the prop model\'s Game bets card');
  chk(!body || !body.querySelector('.card'), 'the card chrome should come off inside the row');
  const rows = body ? [...body.querySelectorAll('tr')] : [];
  /* to win for both sides, and to cover for both where the prop model has a spread (a game
     whose spread is not posted yet offers the money line alone, and says so) */
  const nLines = id => { const r = w.eval('S').sched.find(x => x.id === id); return r && w.gameBet(r, r.h, 'ats') ? 4 : 2; };
  const firstLines = nLines(first.dataset.game);
  chk(rows.length === firstLines, `expected ${firstLines === 4 ? 'to win and to cover' : 'to win'} for both sides, got ${rows.length} row(s): ${txt(body)}`);
  chk(rows.filter(r => /To win/.test(txt(r))).length === 2, 'both sides should have a to-win price');
  chk(rows.filter(r => /To cover/.test(txt(r))).length === firstLines - 2, 'both sides should have a to-cover price where there is a spread, and none where there is not');
  chk(firstLines === 4 || /No spread posted yet/.test(txt(body)), 'a game with no spread does not say why it offers the money line alone');
  const pcts = rows.filter(r => /To win/.test(txt(r))).map(r => parseInt(txt(r.querySelector('.pct')), 10));
  chk(Math.abs(pcts[0] + pcts[1] - 100) <= 1, `the two win chances do not add up: ${pcts.join(' + ')}`);
  chk(rows.every(r => /[-+]\d+est\./.test(txt(r).replace(/\s/g, ''))), 'a row is missing our own price');
  /* the same game priced by the prop model's own gameBet, on the same row */
  const gid = first.dataset.game, row = w.eval('S').sched.find(x => x.id === gid);
  const own = w.gameBet(row, row.a, 'ml');
  chk(own && Math.round(own.p * 100) === pcts[0], `the board's away win chance ${pcts[0]} is not the prop model's ${own && Math.round(own.p * 100)}`);
  chk(first.classList.contains('pk-open'), 'the card did not mark itself open');
  /* the two lines: said where the board's spread and the prop model's differ, and only there */
  { const g = state.schedule.find(x => x.game_id === gid), differ = g.spread_line != null && row.sp != null && +g.spread_line !== +row.sp;
    chk(!!body.querySelector('.pk-lines') === differ, `the opened game ${differ ? 'does not say' : 'says'} its prices are on a different line from the board's`); }

  /* a line on a game that has not kicked off can be ticked onto the prop model's parlay */
  const started = gid => w.eval('gameStarted')(w.eval('S').sched.find(x => x.id === gid));
  chk(cards.every(c => started(c.dataset.game) === !c.querySelector('input[data-leg]') || !c.querySelector('.pk-gbody')), 'boxes and kickoffs disagree');
  const openCard = cards.find(c => !started(c.dataset.game));
  if (openCard) {
    if (openCard !== first) { first.click(); await wait(30); openCard.click(); await wait(60); }
    const boxes = [...openCard.querySelectorAll('input[data-leg]')];
    chk(boxes.length === nLines(openCard.dataset.game) && boxes.every(b => !b.checked), `a game not yet kicked off should offer ${nLines(openCard.dataset.game)} unticked lines, got ${boxes.length}`);
    chk(/Tick one and it joins the parlay/.test(txt(openCard.querySelector('.gbets'))) && !!openCard.querySelector('.pk-tolegs a[href="#parlay"]'), 'no note pointing at X Parlays');
    const key = boxes[0].dataset.leg;
    boxes[0].click();
    await wait(60);
    const leg = w.eval('S').parlay[key];
    chk(!!leg && leg.grp === 'TEAM' && leg.stat === 'ml' && leg.label === 'To win', 'ticking To win did not put a team leg on the parlay: ' + JSON.stringify(leg));
    const box2 = openCard.querySelector(`input[data-leg="${key}"]`);
    chk(box2 && box2.checked && box2.closest('tr').classList.contains('on'), 'the ticked row does not show as on');
    chk(/1 from this game is on the parlay/.test(txt(openCard.querySelector('.pk-tolegs'))), 'the note does not count the leg');
    chk(/1-leg parlay/.test(txt(d.getElementById('parlayBody'))) && txt(d.getElementById('parlayBody')).includes(leg.name), 'the X Parlays tab does not show the leg in the builder');
    box2.click();
    await wait(60);
    chk(!w.eval('S').parlay[key], 'unticking did not take the leg off the parlay');
    chk(/Parlay Builder/.test(txt(d.getElementById('parlayBody'))), 'the builder still shows a parlay after unticking');
    if (openCard !== first) { openCard.click(); await wait(30); first.click(); await wait(60); }
  } else chk(cards.every(c => started(c.dataset.game)), 'no game offered lines although one has not kicked off');
  const lockedCard = cards.find(c => started(c.dataset.game));
  if (lockedCard) { const wasOpen = lockedCard === first; if (!wasOpen) { lockedCard.click(); await wait(60); }
    chk(!lockedCard.querySelector('input[data-leg]') && !lockedCard.querySelector('.pk-tolegs') && /How each side did/.test(txt(lockedCard.querySelector('.gbets'))), 'a game that kicked off still offers lines');
    /* resolved the way the game's own page resolves it: a tick or a cross on every line once the score is in */
    const scored = w.eval('hasScore')(w.eval('S').sched.find(x => x.id === lockedCard.dataset.game));
    const marks = [...lockedCard.querySelectorAll('td.pick .res')];
    chk(marks.length === nLines(lockedCard.dataset.game), `a kicked-off game should mark ${nLines(lockedCard.dataset.game)} lines, got ${marks.length}`);
    if (scored) chk(marks.every(m => /win|loss/.test(m.className) || /push/.test(txt(m))) && lockedCard.querySelectorAll('tr.hit, tr.miss').length >= 2, 'a game with a score is not marked won or lost line by line');
    else chk(marks.every(m => txt(m) === '–'), 'a game without a score should show dashes, not results');
    if (!wasOpen) { lockedCard.click(); await wait(30); } }

  /* clicking inside the prices does not toggle; clicking the row does */
  first.querySelector('.pk-gbody').click();
  await wait(60);
  chk(!!first.querySelector('.pk-gbody'), 'clicking inside the prices closed them');
  first.click();
  await wait(60);
  chk(!first.querySelector('.pk-gbody'), 'clicking again did not close the game');

  /* ---- Props: the prop model's Games tab, as it is on its own site ---- */
  const propsBtn = [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'slate');
  propsBtn.click();
  await wait(60);
  chk(!d.getElementById('tab-slate').hidden && d.getElementById('tab-pickems').hidden, 'the Props tab did not open');
  chk(w.location.hash === '#slate', 'the Props tab did not become the address: ' + w.location.hash);
  const slateRows = d.querySelectorAll('#gamesList .game');
  chk(slateRows.length > 0, 'the Props tab has no games');
  const wk = +d.getElementById('weekSel').value;
  chk(slateRows.length === w.eval('S').sched.filter(g => +g.w === wk).length, `Props shows ${slateRows.length} games for week ${wk}`);
  for (const id of ['weekSel', 'weekRec', 'seasonRec', 'slateNow'])
    chk(!!d.getElementById(id), `the Games tab's ${id} is missing`);
  for (const id of ['slateEvery', 'slateDot'])
    chk(!d.getElementById(id), `the Games tab's ${id} should be gone`);
  chk(txt(d.getElementById('slateStamp')) === '', 'the Props stamp says something before the scoreboard is read: ' + txt(d.getElementById('slateStamp')));
  d.getElementById('slateNow').click();
  await wait(300);
  chk(/scores \d/.test(txt(d.getElementById('slateStamp'))), 'Refresh scores on the Props tab left no stamp: ' + txt(d.getElementById('slateStamp')));
  chk(/Week \d+ \d+–\d+/.test(txt(d.getElementById('weekRec'))), 'the prop model\'s week record is not drawn: ' + txt(d.getElementById('weekRec')));
  chk(txt(d.querySelector('#tab-slate .gamehead')).includes('Biggest projections'), 'the Games column header is not the prop model\'s');
  /* open a game: the prop model's own modal, with players in it */
  slateRows[0].click();
  await wait(100);
  const modal = d.getElementById('gameModal');
  chk(modal && !modal.hidden, 'clicking a game on the Props tab did not open the game');
  chk(txt(d.getElementById('gameView')).length > 200, 'the game modal is empty');
  /* a game here is its players: the Game bets card is the Pick'ems tab's job now */
  chk(!d.querySelector('#gameView .gbets') && !/Game bets/.test(txt(d.getElementById('gameView'))), 'the game view still carries the Game bets card');
  chk(d.querySelectorAll('#gameView .plrbtn').length > 0, 'the game view shows no players');
  chk(typeof w.closeGame === 'function', 'the prop model\'s closeGame is not on the page');
  w.closeGame();
  await wait(50);
  chk(modal.hidden, 'the game did not close');
  /* the Games tab's own state saved, under the prop model's own key */
  chk(!!w.localStorage.getItem(PROP_KEY), 'the prop model did not save its state under its own key');

  /* ---- X Parlays: X's parlays at the top, the visitor's own Parlay Builder (suggestions and all)
     under them, and the visitor's own parlays under that ---- */
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'parlay').click();
  await wait(60);
  chk(!d.getElementById('tab-parlay').hidden && d.getElementById('tab-slate').hidden, 'the X Parlays tab did not open');
  chk(w.location.hash === '#parlay', 'the X Parlays tab did not become the address #parlay');
  const pb = d.getElementById('parlayBody');
  /* the suggestions are behind a button in a window, so the builder heads the tab */
  chk(!d.getElementById('suggCard') && !!d.getElementById('suggOpen'), 'the suggestions are still taking up the tab');
  chk(/Parlay Builder|-leg parlay/.test(txt(pb.firstElementChild.querySelector('h2'))), 'the builder is not the first card: ' + txt(pb.firstElementChild));
  d.getElementById('suggOpen').click();
  await wait(60);
  chk(!d.getElementById('suggModal').hidden && !!d.querySelector('#suggView #suggCard'), 'the suggestions window did not open');
  d.getElementById('suggClose').click();
  await wait(60);
  chk(d.getElementById('suggModal').hidden, 'the suggestions window would not close');
  chk(!/one line per stat per player|pulled from the odds market twice a week/.test(txt(pb)) && !pb.querySelector('.card ul'), 'the how-to list is still under the builder');
  /* ---- the X Parlays section: X's card at the top and the builder under it, the last thing in
     the tab. X's card is the placed parlays in liveparlays/parlays.json that are not cleared, read
     only, the same on every device: nothing of the browser's own is drawn, there is no list of its
     own, and its builder finishes a parlay as a card (Finish parlay) ---- */
  const lp = d.getElementById('lpCard'), tabP = d.getElementById('tab-parlay');
  chk(!!lp && tabP.firstElementChild === lp && lp.nextElementSibling === pb && pb.nextElementSibling && pb.nextElementSibling.id === 'suggModal' && !pb.nextElementSibling.nextElementSibling
    && !d.getElementById('myCard') && !d.getElementById('myApp'),
    'X Parlays is not at the top of its tab with the builder under it and nothing after, or a list of the browser\'s own is in the page');
  chk(/^X Parlays/.test(txt(lp.querySelector('h2'))) && !/Your parlays|Live Parlays/.test(txt(tabP)), 'the card is not headed X Parlays, or the tab still says Your parlays or Live Parlays');
  chk(!d.getElementById('savedCard') && !d.getElementById('betParlays'), 'the old Saved parlays or betting-slips card is still drawn beside the section');
  chk(!!lp.querySelector('#now') && !!lp.querySelector('#stamp') && !!lp.querySelector('#app') && !!lp.querySelector('#lpUpdated'), 'the section is missing its controls or its updated line');
  const fileCount = JSON.parse(PARLAYS).parlays.filter(p => p && p.cleared !== true).length;
  chk(lp.querySelectorAll('.savedp').length === fileCount, `X Parlays shows ${lp.querySelectorAll('.savedp').length} parlays; the file holds ${fileCount} not cleared`);
  chk(fileCount || txt(lp.querySelector('#app')) === 'Nothing to watch yet', 'with every parlay in the file cleared, X Parlays does not say there is nothing to watch: ' + txt(lp.querySelector('#app')));
  chk(!fileCount || [...lp.querySelectorAll('.savedp .pill')].some(x => txt(x) === 'placed'), 'the file parlays are not labelled placed');
  chk(!lp.querySelector('[data-rm], [data-edit], [data-stake-of], [data-reset], #clear, #restoreAll'), 'X Parlays offers a control to change X\'s parlays');
  /* the card's window is in the page, and nothing asks whose device this is */
  chk(!!d.getElementById('pcModal') && d.getElementById('pcModal').hidden && /function finishBuilder\(/.test(HTML) && !!w.PARLAY_CARD && typeof w.PARLAY_CARD.visitor === 'undefined' && typeof w.lpOwner === 'undefined',
    'the parlay card\'s window is not in the page, or the page still asks whether a device is the owner\'s');
  /* a parlay this browser saved before is kept in its storage and drawn nowhere */
  { const S = w.eval('S'), g = S.sched.find(x => x.id === (cards[0] && cards[0].dataset.game)) || S.sched[0];
    S.saved.push({ id: 'live-smoke', saved: new Date().toISOString(), week: g.w, stake: 3, payout: 9, price: 200,
      legs: [{ gid: g.id, stat: 'ml', k: 0, side: 'over', main: false, name: 'Smoke Saved Side', team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win', p: 0.55, price: -120, src: 'real' }] });
    w.eval('save(); renderParlay();');
    await wait(80);
    chk(lp.querySelectorAll('.savedp').length === fileCount && !/Smoke Saved Side/.test(txt(tabP)) && S.saved.some(p => p.id === 'live-smoke'),
      'a browser\'s own saved parlay is drawn in the X Parlays tab, or was dropped from its saved list');
    S.saved = S.saved.filter(p => p.id !== 'live-smoke'); w.eval('save(); renderParlay();'); await wait(40); }
  chk(w.localStorage.getItem('live_parlays_v1') === null && w.localStorage.getItem('my_parlays_v1') === null && typeof w.LIVE_IO === 'undefined', 'the page wrote a key for the section, or still carries the shared key');
  /* the builder and the suggestions window carry the one-tap amounts */
  chk(/data-stake-chip/.test(HTML) && /function stakeChips\(/.test(HTML), 'the amount buttons are not in the built page');

  chk(!/\bplan\b/i.test(txt(pb)), 'a week plan section is in the builder');

  /* ---- Pick'em Record: the betting app's Records tab, in a frame filled when first opened ---- */
  /* the betting site has no pages: the app is inside this page, and nothing points outside it */
  chk(!/betting\/(admin|index)\.html/.test(HTML), 'the page still points at a betting page');
  chk(!fs.existsSync(path.join(ROOT, 'betting', 'admin.html')) && !fs.existsSync(path.join(ROOT, 'betting', 'index.html')) && !fs.existsSync(path.join(ROOT, 'props', 'admin.html')) && !fs.existsSync(path.join(ROOT, 'props', 'index.html')),
    'a retired props or betting page is back in the repository');
  const recFrame = d.querySelector('#tab-record iframe.pk-frame');
  chk(!!recFrame && !recFrame.getAttribute('srcdoc') && !recFrame.getAttribute('src'), 'the Records frame should not be filled before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'record').click();
  await wait(60);
  chk(!d.getElementById('tab-record').hidden && d.getElementById('tab-ratings').hidden, 'the Pick\'em Record tab did not open');
  chk(w.location.hash === '#record', 'the Pick\'em Record tab did not become the address');
  /* the frame is filled from the page itself, opened on its tab, reading the season from
     the betting site's data */
  const adminHtml = recFrame.getAttribute('srcdoc') || '';
  chk(adminHtml.length > 100000 && /const MODEL = /.test(adminHtml), 'the Records frame was not filled with the betting app: ' + adminHtml.length + ' chars');
  chk(/^<!DOCTYPE html>/i.test(adminHtml.trim()), 'the framed app does not start with its doctype');
  chk(/<head>\s*<script>window\.EMBED_TAB="record";window\.STATE_URL='\.\.\/betting\/state\.json';window\.XBETS=window\.XBETS\|\|\(function\(\)\{try\{return window\.parent!==window&&window\.parent\.XBETS\|\|null;\}catch\(e\)\{return null;\}\}\)\(\);if\(window\.XBETS\)document\.documentElement\.classList\.add\('xbets-ro'\);<\/script>/.test(adminHtml),
    'the framed app is not told its tab, its season path and the page\'s X Bet Log');
  /* the frames reach the page's X Bet Log through window.parent: a sandboxed frame could not */
  chk([...d.querySelectorAll('iframe.pk-frame')].every(f => !f.hasAttribute('sandbox')), 'a betting frame is sandboxed, so it cannot reach the X Bet Log');
  chk(/html\.embed header,html\.embed #tabs\{display:none\}/.test(adminHtml) && /classList\.add\('embed'\)/.test(adminHtml),
    'the framed app has no embed mode, so the frame would show its header and tab bar');
  chk(/data-tab="record"/.test(adminHtml), 'the framed app has no Records tab');
  chk(!/betting\/(admin|index)\.html/.test(adminHtml) && !/<\/script>[\s\S]*const BET_APP=/.test(adminHtml), 'the framed app carries a copy of itself or points at a betting page');

  /* ---- Prop Record: off the bar. The prop model's Track Record section stays in the page,
     unshown, and no address opens it ---- */
  chk(!d.querySelector('#tabs button[data-tab="track"]') && !!d.getElementById('tab-track') && d.getElementById('tab-track').hidden, 'the Prop Record is still on the bar, or its section left the page');
  { const was = w.location.hash; w.location.hash = '#track'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(40);
    chk(d.getElementById('tab-track').hidden, 'an address of #track opened the Prop Record');
    w.location.hash = was; }

  /* ---- Power Ratings: the betting site's Power Ratings tab, framed ---- */
  const ratFrame = d.querySelector('#tab-ratings iframe.pk-frame');
  chk(!!ratFrame && !ratFrame.getAttribute('srcdoc'), 'the Power Ratings frame should not be filled before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'ratings').click();
  await wait(60);
  chk(!d.getElementById('tab-ratings').hidden && d.getElementById('tab-parlay').hidden, 'the Power Ratings tab did not open');
  chk(w.location.hash === '#ratings', 'the Power Ratings tab did not become the address');
  chk(/window\.EMBED_TAB="ratings";/.test(ratFrame.getAttribute('srcdoc') || ''), 'the Power Ratings frame is not opened on its tab');
  chk(/data-tab="ratings"/.test(adminHtml), 'the framed app has no Power Ratings tab');

  /* ---- X Bet Log: the betting site's Bet Log tab, framed, with X's log handed in ---- */
  const betFrame = d.querySelector('#tab-bets iframe.pk-frame');
  chk(!!betFrame && !betFrame.getAttribute('srcdoc') && betFrame.title === 'X Bet Log', 'the X Bet Log frame should not be filled before its tab is opened, and is titled X Bet Log');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'bets').click();
  await wait(60);
  chk(!d.getElementById('tab-bets').hidden && d.getElementById('tab-track').hidden, 'the X Bet Log tab did not open');
  chk(w.location.hash === '#bets', 'the X Bet Log tab did not become the address #bets');
  chk(/window\.EMBED_TAB="bets";/.test(betFrame.getAttribute('srcdoc') || ''), 'the X Bet Log frame is not opened on its tab');
  chk(/data-tab="bets"/.test(adminHtml) && /id="betSave"/.test(adminHtml) && /<h2>X Bet Log<\/h2>/.test(adminHtml), 'the framed app has no X Bet Log tab with its form');
  /* every framed tab is the same app on this page's origin, so one store: a bet logged in either place is in both */
  chk([...d.querySelectorAll('iframe.pk-frame')].every(f => /^(record|ratings|bets)$/.test(f.dataset.embed) && !f.dataset.src && !f.getAttribute('src')), 'a framed tab is not one of the betting app\'s tabs, or points outside the page');
  chk((HTML.match(/const BET_APP=/g) || []).length === 1, 'the betting app should be in the page exactly once');

  /* the renamed tabs keep their old addresses: a bookmark of #parlay or #bets still opens them */
  for (const [hash, id, label] of [['#parlay', 'tab-parlay', 'X Parlays'], ['#bets', 'tab-bets', 'X Bet Log']]) {
    w.location.hash = '#pickems'; await wait(30); w.location.hash = hash; await wait(60);
    chk(!d.getElementById(id).hidden && d.getElementById('tab-pickems').hidden && txt(d.querySelector(`#tabs button[aria-selected="true"]`)) === label, `the old address ${hash} does not open ${label}`); }
  /* back to the board by address */
  w.location.hash = '#pickems';
  await wait(60);
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'setting the address did not switch tabs');

  /* the page reads the two sites and bakes nothing */
  chk(fetched.includes('../betting/state.json') && fetched.includes('../props/data/payload.json'), 'the page did not fetch both sites: ' + fetched.join(', '));
  chk(!/const MKT=\{"|const PAY=\{grid:/.test(HTML), 'the page bakes data in, so it goes stale between builds');
  chk(!/api\.github\.com/.test(HTML), 'the page talks to the GitHub API');

  /* ---- the board on other seasons' shapes: a neutral site, two lines, the playoffs, the end ---- */
  { const alt = JSON.parse(JSON.stringify(state)), P0 = PAYLOAD;    /* the payload as parsed above */
    /* two wild-card games after week 18, still to play */
    for (const g of alt.schedule.filter(x => +x.week === 18).slice(0, 2)) {
      const x = JSON.parse(JSON.stringify(g)); x.game_id = x.game_id.replace(/_18_/, '_19_'); x.week = 19;
      for (const k of ['result', 'home_score', 'away_score']) delete x[k]; alt.schedule.push(x); }
    /* the week this board opens on: this one in the season, the wild card once the regular
       season is played */
    const altWeek = openWeek(alt);
    const home = alt.schedule.find(g => +g.week === altWeek && !(g.location === 'Neutral' || g.gametime === '09:30'));
    if (home) Object.assign(home, { location: 'Neutral', stadium: 'Wembley Stadium' });
    /* a game the prop model has a spread for, in the open week when there is one (week 1 before
       any line is posted has none, and nor does a wild-card week: then the check goes to a week
       that does) */
    const allPriced = alt.schedule.filter(g => { const r = P0.sched.find(x => x.id === g.game_id); return r && r.sp != null; });
    const priced = allPriced.filter(g => +g.week === altWeek).concat(allPriced.filter(g => +g.week !== altWeek));
    const moved = priced[0], kept = moved && priced.find(g => g !== moved && +g.week === +moved.week);
    if (moved) moved.spread_line = P0.sched.find(x => x.id === moved.game_id).sp + 1;
    if (kept) kept.spread_line = P0.sched.find(x => x.id === kept.game_id).sp;
    const A = await run(alt, undefined, wk => scoreboard(alt, wk));
    chk(+A.d.getElementById('pkWeek').value === altWeek, `with the wild card scheduled the board did not open on week ${altWeek}: ${A.d.getElementById('pkWeek').value}`);
    chk(!A.timedOut && A.errs.length === 0, 'the board broke on a schedule with a neutral site and the playoffs: ' + A.errs.join('; '));
    const card = id => A.d.querySelector(`.pk-game[data-game="${id}"]`);
    if (home) chk(txt(card(home.game_id).querySelector('.pk-at')) === 'vs' && /Wembley/.test(card(home.game_id).querySelector('.pk-at').title), 'a game nflverse marks Neutral does not read "vs" with its stadium');
    const open1 = c => { c.click(); return wait(60); };
    if (moved) {
      if (+moved.week !== +A.d.getElementById('pkWeek').value) { A.d.getElementById('pkWeek').value = String(moved.week); A.d.getElementById('pkWeek').dispatchEvent(new A.w.Event('change')); await wait(40); }
      await open1(card(moved.game_id));
      chk(/nflverse's line/.test(txt(card(moved.game_id).querySelector('.pk-lines'))), 'a game whose board and prop-model spreads differ does not say so when opened');
      if (kept) { await open1(card(kept.game_id)); chk(!card(kept.game_id).querySelector('.pk-lines'), 'a game on one line says it is on two'); } }
    const opt = [...A.d.getElementById('pkWeek').options].find(o => +o.value === 19);
    chk(!!opt && txt(opt) === 'Wild Card', 'the first playoff week is not named Wild Card: ' + (opt ? txt(opt) : 'no option'));
    A.d.getElementById('pkWeek').value = '19'; A.d.getElementById('pkWeek').dispatchEvent(new A.w.Event('change'));
    await wait(40);
    chk(A.d.querySelectorAll('.pk-game').length === 2 && !A.d.getElementById('pkOver'), 'the wild-card week does not show its two games');
    A.d.getElementById('pkNow').click(); await wait(200);
    chk(A.urls.some(u => u.includes('/scoreboard?') && u.includes(`seasontype=3&week=1&dates=${alt.season}`)), 'a playoff week is not read from ESPN\'s postseason scoreboard: ' + A.urls.filter(u => u.includes('/scoreboard?')).slice(-2).join(' '));
    A.w.close();
    /* every game graded and no playoffs in the schedule: the season is over, and the board says so */
    const over = JSON.parse(JSON.stringify(state));
    for (const g of over.schedule) if (g.result == null) Object.assign(g, { home_score: 24, away_score: 17, result: 7 });
    const O = await run(over, undefined, wk => scoreboard(over, wk));
    chk(!!O.d.getElementById('pkOver') && new RegExp(`The ${over.season} regular season is over`).test(txt(O.d.getElementById('pkOver'))) && +O.d.getElementById('pkWeek').value === Math.max(...over.schedule.map(g => +g.week)),
      'a finished regular season does not say it is over, or does not open on its last week');
    O.w.close(); }

  /* opened on #slate, the Props tab is the one showing */
  const s2 = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#slate');
  chk(s2.errs.length === 0, 'the page threw opening on #slate: ' + s2.errs.join('; '));
  chk(!s2.d.getElementById('tab-slate').hidden && s2.d.getElementById('tab-pickems').hidden, 'opening on #slate did not open the Props tab');
  chk(s2.d.querySelectorAll('#gamesList .game').length > 0, 'opened on #slate, the Props tab has no games');

  /* the page with no scoreboard to read (checked below, once it has had time to try) */
  const b = await run(state);

  /* the betting tabs do not depend on this tab's fetch: with state.json gone they still frame */
  const noState = await run(state, undefined, null, true);
  [...noState.d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'ratings').click();
  await wait(60);
  const ff = noState.d.querySelector('#tab-ratings iframe.pk-frame');
  chk(!!ff && /window\.EMBED_TAB="ratings";/.test(ff.getAttribute('srcdoc') || ''),
    'with the season unreachable the framed tabs should still be filled');
  /* and with no scoreboard to read, the stamp says so and the board stands */
  await wait(700);
  chk(/scores not loading/.test(txt(b.d.getElementById('pkStamp'))) && b.d.getElementById('pkStamp').classList.contains('bad'), 'an unreachable scoreboard is not said: ' + txt(b.d.getElementById('pkStamp')));
  chk(b.d.querySelectorAll('.pk-game').length > 0 && b.errs.length === 0, 'an unreachable scoreboard broke the board');

  /* ---- Player Elo: the ratings and the roster model, read from elo/data ---- */
  { const eloP = JSON.parse(ELO_P), eloM = JSON.parse(ELO_M);
    chk(fetched.includes('../elo/data/players.json') && fetched.includes('../elo/data/model.json'), 'the page did not read the Elo files');
    [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click();
    await wait(80);
    chk(!d.getElementById('tab-elo').hidden && w.location.hash === '#elo', 'the Player Elo tab did not open');
    const body = d.getElementById('peBody');
    chk(body.querySelectorAll('.card').length === 1 && /Rankings/.test(txt(body.querySelector('.card h2'))), 'the Elo tab should draw its rankings card and nothing else (Overall Offense and Defense are pills in its position row): ' + body.querySelectorAll('.card').length);
    const posBtns = [...body.querySelectorAll('.pe-pos button[data-pos]')];
    chk(posBtns.map(b => b.dataset.pos).join() === eloM.groups.join(), 'the position picker does not list every rated group: ' + posBtns.map(b => b.dataset.pos).join());
    const rankRows = () => [...body.querySelectorAll('.card')].find(c => /Rankings/.test(txt(c.querySelector('h2')))).querySelectorAll('tbody tr');
    chk(rankRows().length === 10, 'the rankings should open on the top ten: ' + rankRows().length);
    chk(txt(rankRows()[0]).includes(eloP.groups.QB.top[0].name) && txt(rankRows()[0]).includes(String(eloP.groups.QB.top[0].elo)), 'the top quarterback is not first: ' + txt(rankRows()[0]));
    chk(rankRows()[0].querySelector('svg.pe-spark') !== null, 'the season trend line is missing');
    chk([...rankRows()].every(tr => tr.querySelector('svg.tierbadge') && /HOF|Elite|Master|Diamond|Platinum|Gold|Silver|Bronze|Iron|Wood/.test(txt(tr))), 'a ranked player has no tier shield on the team scale');
    chk(!!d.querySelector('#peDefs svg defs linearGradient[id^="tg-"]'), 'the tier shields have no gradient definitions on the page');
    /* the ladder as betting/tools/tiers.js sets it: Wood under 1350, Iron from 1350, Elite from 1700, HOF from 1750 as a gem */
    { const T = e => w.pkEloTier(e)[0];
      chk(T(1760) === 'HOF' && T(1749) === 'Elite' && T(1700) === 'Elite' && T(1699) === 'Master' && T(1350) === 'Iron' && T(1349) === 'Wood' && T(1100) === 'Wood', 'the tiers are not Wood, Iron ... Elite, HOF at their lines');
      chk(/tier-hof/.test(w.pkTierBadge(1760)) && /tier-wood/.test(w.pkTierBadge(1300)) && !/tier-hof|tier-wood/.test(w.pkTierBadge(1720)) && /tg-hof-gem/.test(w.pkTierDefs), 'HOF is not a gem or Wood not its plain shield');
      chk(![1800, 1720, 1600, 1500, 1400, 1300].some(e => /Challenger/.test(T(e) + w.pkTierBadge(e))), 'a tier is still called Challenger'); }
    /* the sidelined are out of the rankings and listed where they would have stood */
    chk(eloM.groups.every(g => Array.isArray(eloP.groups[g].sidelined)), 'a group has no sidelined list');
    { const sideIds = new Set(eloM.groups.flatMap(g => eloP.groups[g].sidelined.map(x => x.id)));
      chk(eloM.groups.every(g => eloP.groups[g].top.every(r => !sideIds.has(r.id))), 'a sidelined player is still ranked');
      const withSide = eloM.groups.find(g => eloP.groups[g].sidelined.some(x => x.would_rank <= 10));
      if (withSide) { posBtns.find(b => b.dataset.pos === withSide).click(); await wait(40);
        const note = [...body.querySelectorAll('.pe-note')].find(p => /Not ranked/.test(txt(p)));
        const first = eloP.groups[withSide].sidelined.find(x => x.would_rank <= 10);
        chk(!!note && txt(note).includes(first.name) && txt(note).includes(first.why), 'the sidelined are not listed under the rankings: ' + (note ? txt(note).slice(0, 120) : 'no note')); }
      chk(eloM.groups.every(g => eloP.groups[g].sidelined.every(x => /reserve|free agent|practice squad|retired|out|list|suspended/i.test(x.why))), 'a sidelined player has no reason'); }
    posBtns.find(b => b.dataset.pos === 'DL').click(); await wait(40);
    chk(txt(rankRows()[0]).includes(eloP.groups.DL.top[0].name), 'switching to the defensive line did not redraw the rankings');
    /* a ranked player's shield and place stand in front of his name on his builder leg; a team leg has none */
    { const S = w.eval('S'), top = eloP.groups.QB.top[0]; const g = laterGame(w, S);
      const key = g.id + '|' + top.id + '|passing_yards';
      S.parlay[key] = { gid: g.id, pid: top.id, stat: 'passing_yards', k: 200, side: 'over', main: false, p: 0.5, price: -110, src: 'est', name: top.name, pos: 'QB', grp: 'QB', week: g.w, label: '200+ pass yds' };
      S.parlay[g.id + '|team:' + g.h + '|ml'] = { gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.55, price: -120, src: 'real', name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win' };
      w.eval('renderParlay()'); await wait(80);
      const rows = [...d.querySelectorAll('#parlayBody tr.legrow')];
      const mine = rows.find(tr => txt(tr).includes(top.name)), team = rows.find(tr => txt(tr).includes(TEAM(g.h)) && !txt(tr).includes(top.name));
      chk(!!mine && !!mine.querySelector('td.plr .pe-badge svg.tierbadge') && new RegExp('#' + top.rank + '\\b').test(txt(mine.querySelector('.pe-badge'))), 'the top quarterback\'s builder leg has no shield and place: ' + (mine ? txt(mine).slice(0, 80) : 'no leg'));
      chk(mine.querySelector('td.plr').firstElementChild.classList.contains('pe-badge'), 'the badge is not in front of the name');
      chk(!!team && !team.querySelector('.pe-badge'), 'a team leg got a player badge');
      chk(!!d.getElementById('peDefs') && d.querySelectorAll('#peDefs defs, #peBody defs').length === 1, 'the shield gradients are not defined exactly once on the page');
      w.eval('renderParlay()'); await wait(80);
      chk(d.querySelectorAll('#parlayBody tr.legrow .pe-badge').length === 1, 'a redraw doubled or lost the badge');
      /* market + form: a second price on a leg the book has priced, none on an estimated or team leg */
      chk(!mine.querySelector('.pe-alt') && !team.querySelector('.pe-alt'), 'an estimated or team leg got a market + form price');
      const wr = eloP.groups.WR.top[0], key2 = g.id + '|' + wr.id + '|receiving_yards';
      S.parlay[key2] = { gid: g.id, pid: wr.id, stat: 'receiving_yards', k: 70, side: 'over', main: true, p: 0.55, price: -115, src: 'real', name: wr.name, pos: 'WR', grp: 'WR', week: g.w, label: '70+ rec yds' };
      S.parlay[key] = Object.assign({}, S.parlay[key], { price: -110, src: 'real', side: 'under' });
      w.eval('renderParlay()'); await wait(80);
      const rows2 = [...d.querySelectorAll('#parlayBody tr.legrow')];
      const wrRow = rows2.find(tr => txt(tr).includes(wr.name)), qbRow = rows2.find(tr => txt(tr).includes(top.name));
      const altOf = tr => tr && tr.querySelector('.pe-alt') ? +tr.querySelector('.pe-alt').dataset.p : null;
      { const want = w.eloAltP(wr.id, 'over', -115, 'real');
        chk(want != null && Math.abs(altOf(wrRow) - want) < 0.001 && altOf(wrRow) > w.eval('mlProb')(-115) && /market \+ form \d+%/.test(txt(wrRow.querySelector('.pe-alt'))), 'a top receiver\'s over at -115 should carry the tab\'s market + form price, above the book\'s: ' + altOf(wrRow) + ' vs ' + want); }
      chk(altOf(qbRow) !== null && altOf(qbRow) < w.eval('mlProb')(-110), 'a top quarterback\'s under should price below the book\'s chance: ' + altOf(qbRow));
      chk(/Market \+ form/.test(txt(d.querySelector('#parlayBody .pe-altsum')) || '') && /\d+\.\d% to all land/.test(txt(d.querySelector('#parlayBody .pe-altsum'))), 'the builder does not sum the market + form chances: ' + txt(d.querySelector('#parlayBody .pe-altsum')));
      const nMu = d.querySelectorAll('#parlayBody .pe-muleg').length;
      w.eval('renderParlay()'); await wait(80);
      chk(d.querySelectorAll('#parlayBody .pe-alt:not(.pe-muleg)').length === 2 && d.querySelectorAll('#parlayBody .pe-altsum').length === 1
        && d.querySelectorAll('#parlayBody .pe-muleg').length === nMu, 'a redraw doubled or lost the second prices');
      delete S.parlay[key]; delete S.parlay[key2]; delete S.parlay[g.id + '|team:' + g.h + '|ml']; w.eval('save(); renderParlay()'); await wait(80); }
    /* the window's side switch reaches the Elo picks too */
    { const S = w.eval('S'); S.ui.suggestSide = 'under'; const r = w.eloPicks();
      chk(!r || r.tiers.every(t => t.legs.every(l => l.side === 'under')), 'the Elo picks ignore the side switch');
      S.ui.suggestSide = 'any'; }
    /* the suggestions: with the ratings in, a player leg is a candidate only where market + form beats the book */
    { chk(w.eval('window.eloLoaded()') === true, 'the Elo tab does not say its files are in');
      const cands = w.eval('suggestCandidates()'), mlProb = w.eval('mlProb'), altP = w.eval('window.eloAltP');
      chk(cands.filter(c => c.grp !== 'TEAM').every(c => altP(c.pid, c.side, c.price, c.src) - mlProb(c.price) >= 0.03), 'a suggested player leg does not clear market + form');
      chk(w.eval('getSuggestions().sig').split('|').includes('form'), 'the week\'s suggestion signature does not carry the Elo state: ' + w.eval('getSuggestions().sig')); }
    /* the Props game view: the same shield on a ranked player's row */
    { [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'slate').click(); await wait(60);
      const S = w.eval('S'); const top = eloP.groups.QB.top[0];
      const g = S.sched.find(x => (x.h === top.team || x.a === top.team) && !w.eval('gameStarted')(x)) || S.sched.find(x => x.h === top.team || x.a === top.team);
      S.ui.game = g.id; w.eval('renderGame()'); await wait(120);
      const row = d.querySelector(`button.plrbtn[data-open="${top.id}"]`);
      chk(!!row && !!row.querySelector('.who .pe-badge svg.tierbadge') && new RegExp('#' + top.rank + '\\b').test(txt(row.querySelector('.pe-badge'))), 'the top quarterback\'s row in the Props game view has no shield: ' + (row ? txt(row).slice(0, 80) : 'no row for ' + top.name + ' in ' + g.id));
      chk(row.querySelector('.who').firstElementChild.classList.contains('pe-badge'), 'the shield is not in front of the name on the game view');
      chk(d.querySelectorAll(`button.plrbtn[data-open="${top.id}"] .pe-badge`).length === 1, 'the game view row has more than one shield');
      w.eval('renderGame()'); await wait(60);
      chk(d.querySelectorAll(`button.plrbtn[data-open="${top.id}"] .pe-badge`).length === 1, 'redrawing the game doubled or lost the shield');
      S.ui.game = null; w.eval('renderSlate()'); }
    /* the market + form card is still drawn at the top of the Track Record, which is off the bar */
    { w.eval('renderTrack()'); await wait(80);
      const card = d.querySelector('#trackBody .pe-track');
      chk(!!card && card === d.getElementById('trackBody').firstElementChild, 'the market + form card is not at the top of the Prop Record');
      const trs = card ? [...card.querySelectorAll('tbody tr')] : [];
      const weeksGraded = new Set(w.eval('trackRecord()').filter(r => r.kind === 'main' && r.imp != null).map(r => r.w));
      chk(trs.length === weeksGraded.size + 1 && /^All/.test(txt(trs[trs.length - 1])), `the card should have a row per graded week and an All row: ${trs.length} rows for ${weeksGraded.size} weeks`);
      chk(trs.every(tr => tr.querySelectorAll('td').length === 11 && /0\.\d{3}/.test(txt(tr))), 'a row lacks its eleven cells or its Brier scores');
      w.eval('renderTrack()'); await wait(40);
      chk(d.querySelectorAll('#trackBody .pe-track').length === 1, 'redrawing the Prop Record doubled the card');
      /* past weeks are graded on the rating each player took into the week, not today's */
      { const pl = Object.entries(eloP.players).find(([, v]) => (v.h || []).length >= 2);
        if (pl) { const [pid, v] = pl;
          chk(w.eval(`eloPre(${JSON.stringify(pid)},1)`) === v.s0 && w.eval(`eloPre(${JSON.stringify(pid)},${v.h[0][0] + 1})`) === v.h[0][1],
            'eloPre does not read the rating a player took into the week'); } }
      [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click(); await wait(40); }
    /* Elo picks: legs whose Elo matchup (trusted stats only) beats the book's price with its
       margin out, plus money first, one leg a game and a player, prices held between -200 and
       +300, saved like any suggestion */
    { const MU = JSON.parse(ELO_MU);
      const trusted = (g, st) => { const p = ((MU.record[g + '|' + st] || {}).past); return !!p && p.rmse_elo < p.rmse_form && p.right_top >= 0.53; };
      const cand = [];
      for (const [pid, v] of Object.entries(MU.players)) for (const [st, a] of Object.entries(v.stats))
        if (trusted(v.group, st) && eloP.players[pid] && a[2] / MU.fit[v.group + '|' + st].sd >= 0.12) cand.push({ pid, st, gid: v.game_id, z: a[2] / MU.fit[v.group + '|' + st].sd });
      cand.sort((a, b) => b.z - a.z);
      /* one leg a game is the rule under test, so the three legs are given three games of their
         own: the coming week can be a single Monday game, which must not fail the smoke */
      const byGame = []; for (const c of cand) if (!byGame.some(x => x.pid === c.pid)) byGame.push(c);
      byGame.forEach((c, i) => { c.gid = c.gid + '#' + i; });
      const weak = Object.entries(MU.players).flatMap(([pid, v]) => Object.keys(v.stats).filter(st => !trusted(v.group, st) && eloP.players[pid]).map(st => ({ pid, st, gid: v.game_id + '#w' })))[0];
      if (byGame.length >= 3 && weak) {
        const L = (c, price, side, extra) => Object.assign({ key: c.gid + '|' + c.pid + '|' + c.st, gid: c.gid, pid: c.pid, stat: c.st, k: 4.5, side, main: true, p: 0.5, price,
          src: 'real', mu: 4, name: eloP.players[c.pid].name, pos: 'X', grp: eloP.players[c.pid].group, team: 'X', opp: 'Y', week: 3, label: side + ' test line' }, extra || {});
        const legs = [L(byGame[0], 120, 'over'), L(byGame[1], -110, 'over'), L(byGame[2], 110, 'over'),
          L(byGame[0], 130, 'over', { key: byGame[0].gid + '|' + byGame[0].pid + '|dup' }),        /* same player again */
          L(byGame[1], 1600, 'over', { key: 'long' }),                                              /* too long a price */
          L(byGame[2], -110, 'under', { key: 'under' }),                                            /* against his nudge */
          L(weak, 150, 'over', { key: 'weak' })];                                                   /* a stat the matchup has not earned */
        w.__legs = legs; w.eval('pricedLegs=function(){ return window.__legs.map(l=>Object.assign({},l)); }');
        const r = w.eval('eloPicks()');
        const t2 = r.tiers[0], t3 = r.tiers[1];
        chk(r.tiers.length === 2 && t2.legs.length === 2 && t3.legs.length === 3, 'Elo picks should make a 2- and a 3-leg parlay from these lines: ' + JSON.stringify(r.tiers.map(t => t.legs.map(l => l.key))));
        chk(t3 && t3.legs[0].price > 0 && t3.legs[1].price > 0 && t3.legs[2].price < 0, 'Elo picks do not put plus money first');
        chk(t3 && new Set(t3.legs.map(l => l.gid)).size === 3 && new Set(t3.legs.map(l => l.pid)).size === 3, 'Elo picks took two legs from one game or one player');
        chk(t3 && t3.legs.every(l => !['long', 'under', 'weak'].includes(l.key)), 'Elo picks took a line they should have passed on: ' + JSON.stringify(t3 && t3.legs.map(l => l.key)));
        chk(t2 && Math.abs(t2.dec - t2.legs.reduce((a, l) => a * w.eval('mlToDec')(l.price), 1)) < 1e-9, 'an Elo parlay is not priced as its legs multiplied');
        /* the chance: the book's with its margin out, moved by the nudge in the stat's typical miss */
        { const l = t3.legs[0], a = MU.players[l.pid].stats[l.stat], sd = MU.fit[MU.players[l.pid].group + '|' + l.stat].sd;
          const fair = w.eval(`mlProb(${l.price})`) / 1.045, want = w.eloMatchupP(l, w.eval(`mlProb(${l.price})`));
          /* the normal curve by hand: the fair chance moved a[2]/sd standard deviations */
          const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
          const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
          let lo = -8, hi = 8; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (Phi(m) < fair) lo = m; else hi = m; }
          const byHand = Phi(lo + a[2] / sd);
          chk(Math.abs(l.pe - want) < 1e-12 && Math.abs(l.pe - byHand) < 2e-4 && l.pe > fair, `an Elo pick's chance is not the book's fair chance moved by the matchup: ${l.pe} vs ${byHand}`); }
        w.eval('openSuggest()'); await wait(40);
        const card = d.querySelector('#suggView .pe-sugg');
        /* a leg carries a shield where its player is ranked this season, and only there */
        const wantBadges = [t2, t3].flatMap(t => t.legs).filter(l => eloP.players[l.pid] && eloP.players[l.pid].rank).length;
        chk(!!card && card.querySelectorAll('.sugg-tier').length === 2 && card.querySelectorAll('.sugg-legs .pe-badge').length === wantBadges, `the Elo picks card is missing, or its legs' shields are wrong: ${card ? card.querySelectorAll('.sugg-legs .pe-badge').length : 'no card'} for ${wantBadges}`);
        /* an Elo pick finishes as a card on every device, saved nowhere */
        const nSaved = w.eval('S.saved.length'), fb = card.querySelector('[data-pc-finish="elo|elo2"]');
        chk(!!fb && /^Finish parlay$/.test(txt(fb)) && !card.querySelector('[data-elo-save]'), 'an Elo pick\'s save is not Finish parlay');
        if (fb) { fb.click(); await wait(40);
          const view = d.getElementById('pcView');
          chk(!d.getElementById('pcModal').hidden && /Elo pick/i.test(txt(view)) && t2.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label))
            && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t2.dec}))`).replace('-', '\u2212') && txt(view).includes('Elo\u2019s chance all 2 land ' + (t2.p * 100).toFixed(1) + '%'),
            'an Elo pick\'s card is not its legs, its price and its Elo chance: ' + txt(view));
          w.eval('PARLAY_CARD.close()'); }
        chk(w.eval('S.saved.length') === nSaved, 'finishing an Elo pick saved it');
        w.eval('closeSuggest()');
      } else chk(false, 'the smoke could not find the matchups it needs for Elo picks');
      /* a player's window: a click on his row in the rankings opens his rating and his matchup this week, a row a stat */
      { const plOpen = () => { const m = d.getElementById('pePlModal'); return !!m && !m.hidden; };
        [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'WR').click(); await wait(40);
        const rowsWR = [...d.querySelectorAll('#peBody tr.pe-plrow')];
        chk(rowsWR.length === 10 && rowsWR.every(tr => tr.querySelector('button.pe-plbtn')), 'the receivers in the rankings are not clickable');
        const withMu = rowsWR.find(tr => MU.players[tr.dataset.pePl] && !w.eloRuledOut(tr.dataset.pePl));
        if (withMu) { withMu.click(); await wait(40);
          const view = d.getElementById('pePlView'), pid = withMu.dataset.pePl, v = MU.players[pid];
          chk(plOpen() && txt(view).includes(eloP.players[pid].name) && view.querySelectorAll('.pe-pl-tiles div').length === 4, 'clicking a receiver did not open his window with his rating');
          const statRows = [...view.querySelectorAll('tbody tr')];
          chk(statRows.length === MU.stats.WR.filter(st => v.stats[st]).length && txt(view).includes(v.opp), 'the window does not show a row per stat and the opponent: ' + statRows.length);
          { const sts = MU.stats.WR.filter(st => v.stats[st]), trusted = st => { const p = (MU.record['WR|' + st] || {}).past; return !!p && p.rmse_elo < p.rmse_form && p.right_top >= 0.53; };
            chk(statRows.every((tr, i) => tr.classList.contains('pe-weak') === !trusted(sts[i])), 'a stat is faded where it should not be, or the other way round'); }
          chk(view.querySelectorAll('.pe-pl-def span').length === 3 && /of \d+/.test(txt(view.querySelector('.pe-pl-def'))), 'the window does not rank the three units he faces');
          d.getElementById('pePlClose').click(); await wait(20);
          chk(!plOpen(), 'Close did not close the player window');
          withMu.querySelector('button.pe-plbtn').click(); await wait(20);
          chk(plOpen(), 'the name button did not open the window');
          d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(20);
          chk(!plOpen(), 'Escape did not close the player window');
        } else console.log('  (the player window: none of the ten receivers shown plays a game still to come, as on a Monday with one game left; skipped)');
        [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'K').click(); await wait(40);
        d.querySelector('#peBody tr.pe-plrow').click(); await wait(20);
        chk(plOpen() && /no matchup formula for kickers/.test(txt(d.getElementById('pePlView'))) && !d.querySelector('#pePlView tbody tr'), 'a kicker\'s window does not say there is no formula');
        d.getElementById('pePlClose').click(); await wait(20); }
      [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'QB').click(); await wait(40);
    }
    /* mismatches over the Props game list: five bubbles, biggest first, the top thirty in a window */
    { const MU = JSON.parse(ELO_MU); [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'slate').click(); await wait(60);
      w.eval('renderSlate()'); await wait(60);
      const onWeek = +d.getElementById('weekSel').value === +MU.week, card = d.getElementById('peMism');
      /* a lean week, a Monday with one game say, can have no starter above his position's
         league average facing a unit below the league's: then there is no card, and no failure */
      const rows0 = onWeek ? w.eloMismatches() : [];
      if (onWeek && !rows0.length) chk(!card, 'a week with no mismatches still draws the card');
      if (onWeek && rows0.length) {
        const rows = rows0, bubbles = [...card.querySelectorAll('.pe-mm-b')];
        chk(rows.length > 0 && bubbles.length === Math.min(5, rows.length) && rows.every((r, i) => i === 0 || r.score <= rows[i - 1].score) && rows.every(r => r.zp > 0 && r.zd < 0),
          'the mismatch bubbles are not the five biggest favourable gaps');
        chk(bubbles[0].textContent.includes(rows[0].score.toFixed(1)) && card === d.querySelector('#slateView .bar').nextElementSibling, 'the mismatches card is not first under the Props bar');
        w.eval('renderSlate()'); await wait(40);
        chk(d.querySelectorAll('#peMism').length === 1, 'redrawing the Props list doubled the mismatches');
        /* a click on a mismatch opens his game with his stats open, scrolled to and highlighted */
        { const b0 = d.querySelector('#peMism .pe-mm-b'), pid = b0.dataset.mmPid; b0.click(); await wait(80);
          const S = w.eval('S'), row = [...d.querySelectorAll('#gameView [data-open]')].find(x => x.dataset.open === pid);
          chk(S.ui.game === rows[0].game_id && pid === rows[0].pid && Object.keys(S.ui.open).join() === pid && !d.getElementById('gameModal').hidden, 'a mismatch did not open its game with the player open');
          chk(!!row && row.getAttribute('aria-expanded') === 'true' && row.classList.contains('pe-hl') && !!row.nextElementSibling && row.nextElementSibling.classList.contains('plrbody') && row.nextElementSibling.classList.contains('pe-hl'),
            'the player\'s stats are not open and highlighted in his game');
          chk(d.querySelectorAll('#gameView .pe-hl').length === 2, 'more than the one player is highlighted');
          w.eval('closeGame()'); await wait(60); }
        /* a player the week's injury report has ruled out since the file was built is left off */
        { const S = w.eval('S'), top = rows[0].pid, was = S.inactive[top];
          S.inactive[top] = { week: +MU.week, status: 'Out' }; w.eval('renderSlate()'); await wait(40);
          const after = w.eloMismatches();
          /* the rest are scored again without him (the position's spread moves), so the count is not fixed: only his absence is */
          const nm = (JSON.parse(ELO_P).players[top] || {}).name || '\u0000';
          chk(!after.some(r => r.pid === top) && !txt(d.getElementById('peMism')).includes(nm), 'a player ruled Out is still on the mismatches');
          chk(w.eloRuledOut(top) === true, 'the tab does not read the page\'s inactive list');
          if (was) S.inactive[top] = was; else delete S.inactive[top]; w.eval('renderSlate()'); await wait(40);
          chk(w.eloMismatches().length === rows.length, 'the mismatches did not come back once the player was cleared'); }
        const more = d.getElementById('peMmMore');
        if (rows.length > 5) { more.click(); await wait(40);
          const m = d.getElementById('peMmModal');
          chk(!!m && !m.hidden && m.querySelectorAll('tbody tr').length === Math.min(30, rows.length), 'Show more does not open the top thirty');
          d.getElementById('peMmClose').click(); await wait(20); chk(m.hidden, 'the mismatches window does not close'); }
        const opts = [...d.getElementById('weekSel').options].map(o => +o.value), other = opts.find(v => v !== +MU.week);
        if (other) { d.getElementById('weekSel').value = String(other); d.getElementById('weekSel').dispatchEvent(new w.Event('change', { bubbles: true })); await wait(60);
          chk(!d.getElementById('peMism'), 'mismatches show on a week they are not for');
          d.getElementById('weekSel').value = String(MU.week); d.getElementById('weekSel').dispatchEvent(new w.Event('change', { bubbles: true })); await wait(60); }
      } else chk(!card, 'mismatches show on a week they are not for');
      [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click(); await wait(40); }
    /* Overall Offense and Overall Defense: two pills in the position row, each a table of the 32
       teams in rank order (the ones that have played best first), each with its shield; a position
       pill brings the players back (the tab's own gate, elo/check_tab.js, checks the rest) */
    { const U = eloM.units, played = U ? Object.values(U.off).filter(v => v.games).length : 0, card = () => d.getElementById('peUnits');
      const pill = side => body.querySelector(`.pe-pos button[data-unit="${side}"]`), was = (body.querySelector('.pe-pos [aria-selected="true"]') || {}).dataset;
      if (!played) chk(!pill('off') && !card(), 'Overall Offense shows with no games rated');
      else {
        for (const side of ['off', 'def']) {
          const name = side === 'off' ? 'Overall Offense' : 'Overall Defense';
          chk(!!pill(side) && txt(pill(side)) === name, 'no ' + name + ' pill in the position row'); if (!pill(side)) break;
          pill(side).click(); await wait(30);
          const rows = card() ? [...card().querySelectorAll('tbody tr.pe-tmrow')] : [], T = U[side];
          const vals = rows.filter(r => T[r.dataset.team] && T[r.dataset.team].games).map(r => +txt(r.querySelector('.pe-elo')));
          chk(rows.length === Object.keys(T).length && rows.every((r, i) => T[r.dataset.team].rank === i + 1) && vals.every((v, i) => !i || v <= vals[i - 1]) && rows.every(r => r.querySelector('.pe-shield svg')),
            `${name} is not every team in rank order, best first, with shields`);
          chk(!!card() && txt(card().querySelector('h2')).startsWith(name) && !!card().querySelector('.pe-curve') && body.querySelectorAll('.card').length === 1, `the ${name} card has the wrong title, no curve, or sits beside the players`);
          /* fifteen columns are wider than a desktop card: on the whole page's styles the table scrolls
             inside its card, and the team column sticks there */
          { const box = card() && scrollBox(w, card(), card().querySelector('table.pe-tt'));
            chk(!!box && sticksIn(w, card().querySelector('tbody td.pe-tm'), box), `${name}'s table does not scroll inside its card at a desktop width, or its team column cannot stick in it`); }
        }
        const back = was && was.pos ? body.querySelector(`.pe-pos button[data-pos="${was.pos}"]`) : body.querySelector('.pe-pos button[data-pos]');
        back.click(); await wait(30);
        chk(!card() && !!rankRows().length, 'a position pill does not bring the player rankings back'); } }
    d.getElementById('peMore').click(); await wait(40);
    /* against the position on screen, whichever it is by now: a week with fewer than 25 ranked at
       one position (24 quarterbacks after a run of injuries) is a lean week, not a broken tab */
    { const on = d.querySelector('.pe-pos [aria-selected="true"]'), pos = on && on.dataset.pos;
      chk(!!pos && !!eloP.groups[pos], 'no position is selected on the rankings');
      if (pos && eloP.groups[pos]) chk(rankRows().length === Math.min(25, eloP.groups[pos].top.length), `Show the top 25 did not for ${pos}: ${rankRows().length} of ${eloP.groups[pos].top.length}`); }
    chk(/walk-forward/.test(txt(d.getElementById('peWalkRec'))), 'the tab bar does not carry the walk-forward record: ' + txt(d.getElementById('peWalkRec')));
    /* the data has the shape the tab relies on */
    chk(eloM.groups.every(g => eloP.groups[g] && eloP.groups[g].top.length >= 10 && eloP.groups[g].top.every(r => r.elo > 1100 && r.elo < 1900)), 'a group has fewer than ten rated players or a rating out of range');
    /* the rankings are this season's: everyone ranked has played enough of it, and a badge's place is that rank */
    chk(eloM.groups.every(g => eloP.groups[g].min_games >= 1 && eloP.groups[g].top.every(r => r.games >= eloP.groups[g].min_games && Array.isArray(r.this_season) && r.this_season.length >= 1)), 'a ranked player has too few games this season');
    chk(Object.values(eloP.players).every(v => (v.rank == null) === (v.se == null)) && eloM.groups.every(g => eloP.groups[g].top.every(r => eloP.players[r.id] && eloP.players[r.id].rank === r.rank && eloP.players[r.id].se === r.elo)), 'the players map and the table disagree on a season rank');
    /* only completed seasons have to beat a coin: the season under way can stand at 1-1 on its opening weekend */
    chk(Object.entries(eloM.walk_forward).filter(([s]) => +s < +eloM.season).every(([, x]) => x.accuracy > 0.5 && x.games > 0) && Object.keys(eloM.walk_forward).some(s => +s < +eloM.season), 'the walk-forward record should beat a coin on every completed season: ' + JSON.stringify(eloM.walk_forward));
    chk(eloM.coef.QB > 0 && eloM.coef.DB > 0, 'the fitted weights lost their sign');
    [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'pickems').click(); await wait(40); }

  /* ---- No owner, no shared store: X's parlays and the X Bet Log are files every device reads ---- */
  /* nothing of the retired layer is on the page: no sync.json read, no sync layer, no shared key,
     no owner mark, sign-in or sync stamp */
  chk(!fetched.some(u => /sync\.json/.test(u)) && typeof w.NFLSYNC === 'undefined' && typeof w.LIVE_IO === 'undefined',
    'the page still reads nflbets/sync.json, or still carries the sync layer or the shared key');
  { const shown = d.body.cloneNode(true); shown.querySelectorAll('script, style').forEach(n => n.remove());
    chk(!d.querySelector('#ownerMark, #xpOwner, #xpSignIn, #xpSignOut, #xpSignInBox, #syncStamp') && !/\bowner\b|sign out|sign in|Not synced|Synced/i.test(txt(shown)),
      'the page shows an owner mark, a sign-in or a sync stamp: ' + ((txt(shown).match(/.{0,60}(\bowner\b|sign out|sign in|Not synced|Synced).{0,60}/i) || [''])[0])); }
  /* the two files are read on every load, never from a cache */
  chk(['../liveparlays/parlays.json', '../liveparlays/xbets.json'].every(f => calls.some(c => c.url.replace(/\?.*$/, '') === f && c.method === 'GET' && c.cache === 'no-store')),
    'the page does not read liveparlays/parlays.json and liveparlays/xbets.json on load with cache: no-store: ' + calls.filter(c => /liveparlays/.test(c.url)).map(c => c.url + ' ' + c.cache).join(', '));
  /* a game that has not kicked off, so the builder keeps the leg */
  const openGame = S => laterGame(w, S);
  const teamLeg = g => ({ gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.55, price: -120, src: 'real',
    name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win' });
  const settle = () => wait(900);
  /* the builder's save is Finish parlay on this device, as on every device, and finishing saves nothing */
  { const S = w.eval('S'), g = openGame(S), key = g ? g.id + '|team:' + g.h + '|ml' : null;
    if (g) { const n0 = S.saved.length, keys0 = JSON.stringify(Object.keys(w.localStorage).sort());
      S.parlay[key] = teamLeg(g); w.eval('save(); renderParlay();'); await wait(60);
      const fin = d.getElementById('pFinish');
      chk(!!fin && !d.getElementById('pSave') && /^Finish parlay$/.test(txt(fin)), 'the builder\'s save is not Finish parlay');
      if (fin && !fin.disabled) { fin.click(); await wait(30);
        chk(!d.getElementById('pcModal').hidden && new RegExp(TEAM(g.h)).test(txt(d.getElementById('pcView'))), 'Finish did not open the parlay card with its leg');
        w.eval('PARLAY_CARD.close()'); }
      chk(S.saved.length === n0 && JSON.stringify(Object.keys(w.localStorage).sort()) === keys0, 'finishing a parlay saved it, or wrote a key');
      delete S.parlay[key]; w.eval('save(); renderParlay();'); await wait(40); }
    else console.log('  (no game left to kick off: the builder\'s Finish is checked by smoke_live.js on a pinned schedule)'); }

  /* ---- X Parlays is the file: three parlays of a fixture's, one of them cleared ---- */
  { const F = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { file: FIXFILE });
    await settle();
    const lp = F.d.getElementById('lpCard');
    chk(!F.timedOut && F.errs.length === 0, 'the page broke on the fixture file: ' + F.errs.join('; '));
    chk(lp.querySelectorAll('.savedp').length === 2 && /Fixture Receiver/.test(txt(lp)) && /Fixture Home/.test(txt(lp)) && !/Fixture Runner/.test(txt(lp)),
      'X Parlays is not the fixture file\'s two parlays without the cleared one: ' + lp.querySelectorAll('.savedp').length);
    chk([...lp.querySelectorAll('.savedp .pill')].filter(x => txt(x) === 'placed').length === 2 && !lp.querySelector('[data-rm], [data-edit], [data-stake-of], [data-reset], #clear'),
      'the file\'s parlays are not labelled placed, or X Parlays offers a control');
    { const card = [...lp.querySelectorAll('.savedp')].find(c => /Fixture Receiver/.test(txt(c)));
      chk(!!card && txt(card.querySelector('.lineLbl')) === '50.5' && !/moved from/.test(txt(card)), 'a parlay is not drawn on the line the file gives: ' + (card ? txt(card).slice(0, 120) : 'no card')); }
    chk(/updated /.test(txt(F.d.getElementById('lpUpdated'))), 'X Parlays does not say when the file last changed: ' + txt(F.d.getElementById('lpUpdated')));
    F.w.close(); }

  /* ---- the X Bet Log is the file: the three weeks carried over from the retired store ($100
     deposited; the balance 98.71 after week 1, 102.37 after week 3, week 2 a week off, 123.39 after
     week 4), the same on every device, read only, through the page's own XBETS and the frame ---- */
  /* the betting app as the page frames it, handed the page's X Bet Log. With `on`, the page around
     it, the frame shares that page's browser store, as a srcdoc frame of the page's origin does */
  const BET_FRAME = JSON.parse(HTML.match(/\nconst BET_APP=("(?:[^"\\]|\\.)*");\n<\/script>/)[1]);
  const frame = (X, tab, on) => new Promise(resolve => {
    const errs = [];
    const dom = new JSDOM(BET_FRAME.replace('window.EMBED_TAB=null', 'window.EMBED_TAB=' + JSON.stringify(tab)), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://demon-x13.github.io/nfl-hub/nflbets/',
      beforeParse(fw) { fw.XBETS = X; fw.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
        if (on) Object.defineProperty(fw, 'localStorage', { get: () => on.localStorage, configurable: true });
        fw.confirm = () => true; fw.alert = () => {}; fw.scrollTo = () => {};
        fw.addEventListener('error', e => errs.push(e.message));
        fw.fetch = async (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase(); ALL_CALLS.push(m + ' ' + s);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); throw new TypeError('Failed to fetch'); }
          if (/elo\/data\/model\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(ELO_M) };
          if (/state\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) };
          return { ok: false, status: 404, json: async () => null }; }; } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs }), 1500); });
  const rowsOf = fd => [...fd.querySelectorAll('#betTable tbody tr')].map(tr => txt(tr.children[0]));
  const colOf = (fd, i) => [...fd.querySelectorAll('#betTable tbody tr')].map(tr => tr.children[i] ? txt(tr.children[i]) : '');
  const mineOf = (bets, deposit) => JSON.stringify({ myPicks: {}, bets, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit } });
  { const own = mineOf({ 5: { staked: 5, returned: 0, note: 'own week' } }, 40);
    const B = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#bets', null, false, { xbets: XBFIX, seed: w2 => w2.localStorage.setItem(BET_KEY, own) });
    await B.w.XBETS.ready();
    const x = B.w.XBETS.get();
    chk(JSON.stringify(x.weeks) === JSON.stringify({ 1: { staked: 10, returned: 8.71, note: '' }, 3: { staked: 11, returned: 14.66, note: '' }, 4: { staked: 8, returned: 29.02, note: '' } }) && x.deposit === 100 && x.status.ok === true,
      'the page\'s X Bet Log is not the file\'s three weeks and $100 deposit: ' + JSON.stringify(x));
    chk(typeof B.w.XBETS.write === 'undefined' && typeof B.w.XBETS.signOut === 'undefined' && B.w.XBETS.enabled() === true, 'the page\'s X Bet Log can still write, or sign anyone out');
    const FB = await frame(B.w.XBETS, 'bets', B.w);
    chk(FB.errs.length === 0 && FB.d.documentElement.classList.contains('xbets-ro'), 'the X Bet Log frame is not read only: ' + FB.errs.join('; '));
    chk(rowsOf(FB.d).join() === 'Week 1,Week 3,Week 4' && colOf(FB.d, 5).join() === '$98.71,$102.37,$123.39',
      'the X Bet Log frame does not show the file\'s weeks and the balance after each: ' + rowsOf(FB.d).join() + ' / ' + colOf(FB.d, 5).join());
    { const bal = FB.d.querySelector('#betChart .stat.bv-balance'), end = FB.d.querySelector('#betChart .bv-end'), svg = FB.d.querySelector('#betChart svg.bv-balance');
      chk(!!bal && /\$123\.39/.test(txt(bal)) && /\$100\.00 deposited/.test(txt(bal)) && !!end && txt(end) === '$123.39' && !!svg && /Deposited \$100\.00/.test(txt(svg)) && /Wk 2/.test(txt(svg)),
        'the X Bet Log frame\'s balance chart is not Start to week 4 from the $100 deposit to $123.39: ' + (bal ? txt(bal) : 'no balance') + ' / ' + (end ? txt(end) : 'no end')); }
    chk(!FB.d.querySelector('#betTable [data-betdel], .bv-dep, #betDeposit, #xbSignOut') && FB.d.getElementById('betSave').disabled && txt(FB.d.querySelector('#tab-bets h2')) === 'X Bet Log',
      'the X Bet Log frame offers Remove, a deposit box, sign-out or Save week');
    chk(/Every week X bet/.test(txt(FB.d.getElementById('xbNote'))) && /read only/.test(txt(FB.d.getElementById('xbNote'))) && !/owner|Synced|sign|store/i.test(txt(FB.d.getElementById('xbNote'))),
      'the X Bet Log frame does not say what it is, or still speaks of an owner, a sync or a store: ' + txt(FB.d.getElementById('xbNote')));
    chk(!/own week|\$40\.00/.test(txt(FB.d.getElementById('betTable')) + txt(FB.d.getElementById('betChart'))), 'the browser\'s own log or deposit is shown in the X Bet Log');
    /* a click that saves the frame's whole state (the chart's switch) leaves the browser's own log and deposit as they were */
    { const pv = FB.d.querySelector('[data-bv="pnl"]'); if (pv) pv.click(); await wait(400);
      const kept = JSON.parse(B.w.localStorage.getItem(BET_KEY));
      chk(!!pv && Object.keys(kept.bets).join() === '5' && kept.bets[5].note === 'own week' && kept.bank.deposit === 40 && kept.bank.betView === 'pnl',
        'a save in the X Bet Log frame wrote X\'s log or deposit over the browser\'s own: ' + JSON.stringify(kept)); }
    /* the Pick'em Record frame, which draws the Bet Log too, writes nothing of X's either */
    { const FR = await frame(B.w.XBETS, 'record', B.w); FR.w.eval('save()'); await wait(300);
      const kept = JSON.parse(B.w.localStorage.getItem(BET_KEY));
      chk(Object.keys(kept.bets).join() === '5' && kept.bank.deposit === 40, 'the Pick\'em Record frame wrote X\'s log over the browser\'s own'); FR.w.close(); }
    for (const x2 of [B, FB]) x2.w.close(); }
  /* the real file, whatever it holds this week: the frame shows exactly its weeks, read only, and
     the balance from its deposit */
  { const REAL = JSON.parse(XBETS_REAL);
    const R = await run(state, undefined, null, false, {}); await R.w.XBETS.ready();
    const x = R.w.XBETS.get(), weeks = Object.keys(REAL.weeks).map(k => +k.slice(1)).sort((a, b) => a - b);
    chk(x.status.ok === true && (REAL.season !== BET_SEASON ? Object.keys(x.weeks).length === 0 && x.status.other === REAL.season
      : JSON.stringify(Object.keys(x.weeks).map(Number)) === JSON.stringify(weeks) && x.deposit === REAL.deposit),
      'the page\'s X Bet Log is not liveparlays/xbets.json as it stands: ' + JSON.stringify(x));
    if (REAL.season === BET_SEASON && weeks.length) {
      const FR = await frame(R.w.XBETS, 'bets', R.w);
      chk(rowsOf(FR.d).join() === weeks.map(n => 'Week ' + n).join() && FR.d.documentElement.classList.contains('xbets-ro'), 'the X Bet Log frame does not show the real file\'s weeks: ' + rowsOf(FR.d).join());
      if (REAL.deposit != null) { const net = weeks.reduce((a, n) => a + REAL.weeks['w' + n].returned - REAL.weeks['w' + n].staked, 0), bal = FR.d.querySelector('#betChart .stat.bv-balance');
        chk(!!bal && txt(bal).includes('$' + (REAL.deposit + net).toFixed(2)), 'the X Bet Log frame\'s balance is not the real file\'s deposit plus its net: ' + (bal ? txt(bal) : 'no balance')); }
      FR.w.close(); }
    R.w.close(); }
  /* markup in a note is drawn as text; a file that cannot be read is said, and nothing of the
     browser's own is drawn in its place */
  { const B = await run(state, undefined, null, false, { xbets: Object.assign({}, XBFIX, { weeks: { w2: { staked: 1, returned: 3, note: '<img src=x onerror=alert(1)>' } } }) });
    await B.w.XBETS.ready();
    const FB = await frame(B.w.XBETS, 'bets', B.w);
    chk(!FB.d.querySelector('#betTable img') && /img src=x/.test(txt(FB.d.getElementById('betTable'))), 'a note in the X Bet Log was drawn as markup');
    const N = await run(state, undefined, null, false, { xbets: 404, seed: w2 => w2.localStorage.setItem(BET_KEY, mineOf({ 3: { staked: 2, returned: 0, note: 'mine' } }, 9)) });
    await N.w.XBETS.ready();
    const FN = await frame(N.w.XBETS, 'bets', N.w);
    chk(/could not be read/.test(txt(FN.d.getElementById('xbNote'))) && rowsOf(FN.d).length === 0, 'an X Bet Log file that cannot be read is not said, or the browser\'s own log stands in for it');
    for (const x2 of [B, FB, N, FN]) x2.w.close(); }

  /* ---- a browser the retired owner and reader layers left their mark on: exactly the files on
     screen, their flags and copies gone, and nothing of the browser's own lost. Its copies of the
     old document carry a stale correction and a deletion (neither may count); its section key is
     the store's last, the one line carried into the file and the deletion, so it goes (a key
     holding a correction the file lacks stays: smoke_live.js N) ---- */
  { const doc = { prop: { saved: [{ id: 'x-old', week: 2, stake: 3, legs: [teamLeg(openGame(w.eval('S')) || w.eval('S').sched[0])] }], parlay: {} }, live: { lines: { 'file|fx-player|0': 60.5 }, removed: { 'file|fx-team': 1 } } };
    const ownProp = JSON.stringify({ stake: 25, saved: [{ id: 'own-1', week: 2, stake: 4, price: 300, payout: 16, legs: [{ gid: `${BET_SEASON}_02_CAR_ATL`, stat: 'receptions', k: 3, side: 'over', main: false, name: 'Own Receiver', team: 'ATL', week: 2 }] }], parlay: {} });
    const ownBets = mineOf({ 1: { staked: 10, returned: 8.71, note: '' }, 9: { staked: 3, returned: 0, note: 'own' } }, 100);
    const OLD = { nflowner_v1: 'the-old-owner-secret', nflsync_owner_v1: JSON.stringify({ uid: 'u', refreshToken: 'rt', idToken: 'it', exp: 1 }), nflsync_device_v1: 'dabc',
      xparlays_v1: JSON.stringify({ at: '2026-10-10T05:00:00Z', dropped: 0 }), nflsync_v1: 'r-old', nflsync_base_v1: JSON.stringify({ rev: 'r-old', revs: ['r-old'], doc, hist: [] }),
      xparlays_cache_v1: JSON.stringify({ rev: 'r-old', at: '2026-10-10T05:00:00Z', doc }), live_parlays_v1: JSON.stringify({ lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: doc.live.removed }),
      ['xbets_joined_' + BET_SEASON]: '{}', ['xbets_cache_' + BET_SEASON]: '{"weeks":{}}',
      [PROP_KEY]: ownProp, my_parlays_v1: '{"lines":{"prop|own-1|0":4},"removed":{},"kept":{}}', [BET_KEY]: ownBets, ['x_nfl_bets_preshare_' + BET_SEASON]: '{"bets":{}}' };
    const O = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#owner=the-old-owner-secret', null, false, { file: FIXFILE, xbets: XBFIX, seed: w2 => { for (const [k, v] of Object.entries(OLD)) w2.localStorage.setItem(k, v); } });
    await settle(); await O.w.XBETS.ready();
    const lp = O.d.getElementById('lpCard'), keys = {};
    for (let i = 0; i < O.w.localStorage.length; i++) { const k = O.w.localStorage.key(i); keys[k] = O.w.localStorage.getItem(k); }
    chk(!O.timedOut && O.errs.length === 0 && lp.querySelectorAll('.savedp').length === 2 && /Fixture Home/.test(txt(lp)) && !/Fixture Runner/.test(txt(lp))
      && txt([...lp.querySelectorAll('.savedp')].find(c => /Fixture Receiver/.test(txt(c))).querySelector('.lineLbl')) === '50.5' && !/Own Receiver|x-old/.test(txt(O.d.getElementById('tab-parlay'))),
      'a browser that was the owner\'s does not show exactly the file\'s parlays on the file\'s lines (its old deletion and correction still count): ' + txt(lp).slice(0, 160));
    { const shown = O.d.body.cloneNode(true); shown.querySelectorAll('script, style').forEach(n => n.remove());
      chk(!O.d.querySelector('#ownerMark, #xpOwner, #xpSignIn, #xpSignOut, #syncStamp') && !/\bowner\b|sign out|sign in|Not synced|Synced/i.test(txt(shown)),
        'a browser that was the owner\'s shows an owner mark, a sign-in or a sync stamp'); }
    chk(['nflowner_v1', 'nflsync_owner_v1', 'nflsync_device_v1', 'xparlays_v1', 'nflsync_v1', 'nflsync_base_v1', 'xparlays_cache_v1', 'live_parlays_v1', 'xbets_joined_' + BET_SEASON, 'xbets_cache_' + BET_SEASON].every(k => !(k in keys)),
      'a flag or a copy the retired layers left is still in the browser: ' + Object.keys(keys).join(', '));
    chk(keys.my_parlays_v1 === OLD.my_parlays_v1 && keys[BET_KEY] === ownBets && keys['x_nfl_bets_preshare_' + BET_SEASON] === OLD['x_nfl_bets_preshare_' + BET_SEASON]
      && JSON.stringify(JSON.parse(keys[PROP_KEY]).saved) === JSON.stringify(JSON.parse(ownProp).saved) && O.w.eval('S').saved.map(p => p.id).join() === 'own-1',
      'a browser that was the owner\'s lost some of its own data');
    { const FO = await frame(O.w.XBETS, 'bets', O.w);
      chk(rowsOf(FO.d).join() === 'Week 1,Week 3,Week 4' && !/own/.test(txt(FO.d.getElementById('betTable'))) && FO.d.documentElement.classList.contains('xbets-ro'),
        'a browser that was the owner\'s does not show the file\'s X Bet Log, read only: ' + rowsOf(FO.d).join());
      FO.w.close(); }
    O.w.close(); }

  /* ---- the Game snapshot: its own section, at the end of this file ---- */
  await snapshotChecks();

  /* ---- no page asked the retired store or its sign-in services anything, and nothing any page
     or frame sent was a write ---- */
  chk(ALL_CALLS.length > 100 && BAD_CALLS.length === 0, 'a page asked the retired store or its sign-in services, or sent a write: ' + BAD_CALLS.slice(0, 5).join(' | '));
  chk(!/firebaseio|identitytoolkit|securetoken/.test(HTML), 'the built page still names the retired store or its sign-in services');

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));

/* =====================================================================================
   THE GAME SNAPSHOT (nflbets/build/snapshot.html): the window an opened Pick'ems game opens
   from its Game snapshot button. The body above runs this last but one, so the request rule
   after it covers these runs too.

   Every number the window shows is held to the file it comes from, worked out here on its own:
   each team's record as Team Rankings counts it (betting/state.json's regular-season finals,
   the rating file's where that has more), its Power Rating, rank, change and chance against an
   average team (elo/data/model.json `teams`, ranked by rating), both Overall Offense and Overall
   Defense (`units`), each expected starter's season Elo, rank, shield and Q (players.json and
   matchups.json `lineups` and `q`), in his position's rows and his team's column, the ranked
   players out (each group's `sidelined`), every model's pick, chance and grade (state.json's
   processed, atKickoff, joker and broly, model.json's graded and next, Vegas from the closing
   moneylines), the line, and the Mismatches, which must be the Props tab's own
   (window.eloMismatches, and the bubbles on the Props tab). It opens on a game to come, on a
   game final on the scoreboard and on a graded one; closes on Escape, Close and a click
   outside; keeps Tab inside and hands the focus back; links to the full tabs; reads no Elo file
   a second time; says so in each section when matchups.json, or the ratings, did not load while
   the rest draws; and draws a playoff game. With every game played (--season-over) there is no
   game to come, and the played-game checks carry it.
   ===================================================================================== */
async function snapshotChecks() {
  const st = STATE, eloP = JSON.parse(ELO_P), eloM = JSON.parse(ELO_M), eloMu = JSON.parse(ELO_MU);
  const week = openWeek(st);
  const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
  const pc = p => Math.round(p * 100) + '%';
  const amer = x => (+x > 0 ? '+' : '−') + Math.abs(Math.round(+x));
  const reg = g => g.game_type ? g.game_type === 'REG' : +g.week <= 18;
  /* a record as Team Rankings counts it: the regular-season finals, or the rating file's count
     when it has seen more games (withFile false: the schedule alone, as with the file missing) */
  const recOf = (t, withFile = true) => { const r = [0, 0, 0]; let n = 0;
    for (const g of st.schedule) if (g.result != null && reg(g) && (g.home_team === t || g.away_team === t)) { n++; const m = g.home_team === t ? g.result : -g.result; r[m > 0 ? 0 : m < 0 ? 1 : 2]++; }
    const f = (withFile && eloM.teams && eloM.teams[t] && eloM.teams[t].record) || [0, 0, 0], x = n >= f[0] + f[1] + f[2] ? r : f;
    return x[0] + '-' + x[1] + (x[2] ? '-' + x[2] : ''); };
  const tRank = t => Object.entries(eloM.teams || {}).sort((a, b) => b[1].elo - a[1].elo).findIndex(([k]) => k === t) + 1;
  const im = x => x < 0 ? -x / (-x + 100) : 100 / (x + 100);
  const unitsOn = !!(eloM.units && eloM.units.off && Object.values(eloM.units.off).some(v => v.games));
  /* every model's call on a game, from the files: the graded one, else the one published */
  const callsOf = g => { const pr = st.processed[g.game_id], ak = (st.atKickoff || {})[g.game_id];
    const one = x => x && x.pick ? { pick: x.pick, p: x.pHome == null ? null : (x.pick === g.home_team ? +x.pHome : 1 - x.pHome), correct: x.correct } : null;
    const o = (st.odds || {})[g.game_id], sp = g.spread_line != null && isFinite(g.spread_line) ? +g.spread_line : null;
    let vegas = null;
    if (o && isFinite(o.home) && isFinite(o.away) && o.home && o.away) { const ph = im(+o.home) / (im(+o.home) + im(+o.away)); vegas = { pick: ph >= 0.5 ? g.home_team : g.away_team, p: Math.max(ph, 1 - ph) }; }
    else if (sp != null && sp !== 0) vegas = { pick: sp > 0 ? g.home_team : g.away_team, p: null };
    const eg = (eloM.graded || []).find(x => x.game_id === g.game_id);
    const en = !eg && eloM.next && +eloM.next.season === +st.season ? (eloM.next.games || []).find(x => x.game_id === g.game_id) : null, e = eg || en;
    return { vegas, alpha: pr ? one(pr) : one(ak), challenger: pr ? one(pr.h) : one(ak && ak.h), joker: one(pr && pr.joker) || one((st.joker || {})[g.game_id]),
      elo: e ? { pick: e.pick, p: e.pick === g.home_team ? e.p_home : 1 - e.p_home, correct: eg ? eg.correct : undefined } : null,
      broly: one(pr && pr.broly) || one((st.broly || {})[g.game_id]) }; };
  /* open a game on the board (its week picked first), then its snapshot from its button */
  const open = async (R, g) => {
    const sel = R.d.getElementById('pkWeek');
    if (+sel.value !== +g.week) { sel.value = String(g.week); sel.dispatchEvent(new R.w.Event('change')); await wait(40); }
    const card = R.d.querySelector(`.pk-game[data-game="${g.game_id}"]`); if (!card) return { card: null, btn: null };
    if (!card.classList.contains('pk-open')) { card.click(); await wait(60); }
    const btn = card.querySelector('.pk-gbody button[data-snap]'); if (!btn) return { card, btn: null };
    btn.focus(); btn.click(); await wait(150);
    return { card, btn, md: R.d.getElementById('gsModal') };
  };
  /* everything the window shows for a game, against the files; win is the winner when played
     (null on a tie), undefined for a game to come */
  const hold = (R, g, label, win) => {
    const md = R.d.getElementById('gsModal'), q = s => md.querySelector(s), a = g.away_team, h = g.home_team;
    chk(!!md && !md.hidden && !!q('[role="dialog"][aria-modal="true"][aria-labelledby="gsTitle"]') && new RegExp(`${a}.*${h}`).test(txt(R.d.getElementById('gsTitle'))) && R.d.activeElement === R.d.getElementById('gsClose'),
      `snapshot (${label}): the window did not open as a dialog titled with the game, with the focus on Close`);
    chk(['gsMatch', 'gsTeams', 'gsUnits', 'gsPos', 'gsMism', 'gsFiles'].every(id => md.querySelector('#' + id)) && !/could not be drawn/.test(txt(md)) && R.errs.length === 0,
      `snapshot (${label}): a section is missing or failed: ${R.errs.join('; ')} ${(txt(md).match(/[^.]*could not be drawn[^.]*/) || [''])[0]}`);
    /* the matchup: records, the line, the score */
    for (const t of [a, h]) chk(txt(q(`[data-gs-rec="${t}"]`)) === recOf(t), `snapshot (${label}): ${t}'s record reads ${txt(q(`[data-gs-rec="${t}"]`))}, Team Rankings counts ${recOf(t)}`);
    { const sp = g.spread_line != null && isFinite(g.spread_line) ? +g.spread_line : null, o = (st.odds || {})[g.game_id];
      const spTxt = sp == null ? '–' : sp > 0 ? `${h} −${sp}` : sp < 0 ? `${a} −${-sp}` : "Pick'em";
      chk(txt(q('[data-gs-spread]')) === spTxt, `snapshot (${label}): the spread reads ${txt(q('[data-gs-spread]'))}, the file's is ${spTxt}`);
      if (o && o.home && o.away) chk(txt(q('[data-gs-ml]')) === `${a} ${amer(o.away)} · ${h} ${amer(o.home)}`, `snapshot (${label}): the moneylines read ${txt(q('[data-gs-ml]'))}`); }
    if (win !== undefined) chk(!!q('#gsPast') && /^\d+–\d+$/.test(txt(q('[data-gs-score]'))), `snapshot (${label}): a played game does not show its score and say the files are as they stand now`);
    else chk(!q('#gsPast') && !q('[data-gs-score]'), `snapshot (${label}): a game to come shows a score or says it was played`);
    /* every model's call */
    { const C = callsOf(g), bad = [];
      for (const id of ['vegas', 'alpha', 'challenger', 'joker', 'elo', 'broly']) {
        const tr = q(`tr[data-gs-model="${id}"]`), x = C[id];
        if (!tr) { bad.push(id + ' has no row'); continue; }
        if (!x) { if (tr.dataset.pick) bad.push(`${id} shows ${tr.dataset.pick}, the files have no call`); continue; }
        if (tr.dataset.pick !== x.pick || txt(tr.querySelector('.pk-ttag')) !== x.pick) bad.push(`${id} picks ${tr.dataset.pick}, the files ${x.pick}`);
        if (x.p != null && txt(tr.querySelector('[data-gs-p]')) !== pc(x.p)) bad.push(`${id} gives ${txt(tr.querySelector('[data-gs-p]'))}, the files ${pc(x.p)}`);
        const hit = tr.querySelector('[data-gs-hit]');
        if (win === undefined) { if (hit) bad.push(id + ' is graded before the game'); continue; }
        const want = x.correct === true || x.correct === false ? x.correct : (win ? x.pick === win : null);
        if (!hit || hit.dataset.gsHit !== (want === true ? 'hit' : want === false ? 'miss' : 'none')) bad.push(`${id} graded ${hit ? hit.dataset.gsHit : 'not at all'}, the files say ${want}`);
      }
      chk(bad.length === 0, `snapshot (${label}): the models' calls are not the files': ${bad.join('; ')}`); }
    /* team Elo, as Team Rankings draws it (a team the file has no rating for is said) */
    if (!eloM.teams || !eloM.teams[a] || !eloM.teams[h]) chk(/no rating for|did not load/.test(txt(q('#gsTeams'))), `snapshot (${label}): a team the ratings file lacks is not said`);
    else for (const t of [a, h]) { const T = eloM.teams[t];
      const chg = T.before == null ? 'no game yet' : T.elo === T.before ? 'no change' : (T.elo > T.before ? '+' : '−') + Math.abs(T.elo - T.before);
      chk(txt(q(`[data-gs-telo="${t}"]`)) === String(T.elo) && txt(q(`[data-gs-trank="${t}"]`)) === '#' + tRank(t) && txt(q(`[data-gs-tavg="${t}"]`)) === pc(T.p_avg) && txt(q(`[data-gs-tchg="${t}"]`)) === chg
        && !!q(`[data-gs-telo="${t}"]`).parentElement.querySelector('svg.tierbadge'),
        `snapshot (${label}): ${t}'s Power Rating reads ${txt(q(`[data-gs-telo="${t}"]`))} ${txt(q(`[data-gs-trank="${t}"]`))} ${txt(q(`[data-gs-tchg="${t}"]`))} ${txt(q(`[data-gs-tavg="${t}"]`))}, the file's ${T.elo} #${tRank(t)} ${chg} ${pc(T.p_avg)}`); }
    /* Overall Offense and Defense, both ways */
    if (unitsOn) for (const [t, s] of [[a, 'off'], [h, 'def'], [h, 'off'], [a, 'def']]) { const v = eloM.units[s] && eloM.units[s][t], box = q(`[data-gs-unit="${s}:${t}"]`);
      if (!v) { chk(/no rating for/.test(txt(q('#gsUnits'))), `snapshot (${label}): a unit the file lacks is not said`); continue; }
      chk(!!box && txt(box.querySelector('[data-gs-urank]')) === ordinal(v.rank) && txt(box.querySelector('[data-gs-uelo]')) === String(v.elo),
        `snapshot (${label}): ${t}'s Overall ${s === 'off' ? 'Offense' : 'Defense'} is not the file's ${ordinal(v.rank)}, ${v.elo}: ${box ? txt(box).slice(0, 80) : 'missing'}`); }
    /* position by position: each lineup's rated starters, each in his team's column under his
       position, with the ELO Ratings tab's season Elo, rank, shield and Q */
    { const L = eloMu.lineups || {}, pls = [...md.querySelectorAll('#gsPos .gs-pl[data-pid]')], bad = [];
      for (const t of [a, h]) { const all = (L[t] && L[t].players) || [], want = all.filter(pid => eloP.players[pid]), shown = pls.filter(x => x.dataset.team === t).map(x => x.dataset.pid);
        if (want.some(pid => !shown.includes(pid)) || shown.some(pid => !all.includes(pid))) bad.push(`${t} shows ${shown.length} of its ${want.length} rated starters`); }
      let grp = null;
      for (const tr of md.querySelectorAll('#gsPos tbody tr')) {
        if (tr.classList.contains('gs-grp')) { grp = Object.keys(eloP.groups).find(k => eloP.groups[k].label === txt(tr)); continue; }
        for (const x of tr.querySelectorAll('.gs-pl[data-pid]')) { const e = eloP.players[x.dataset.pid]; if (!e) { if (!/not rated yet/.test(txt(x))) bad.push(x.dataset.pid + ' is not said to be unrated'); continue; }
          if (e.group !== grp || x.dataset.grp !== e.group) bad.push(`${e.name} (${e.group}) sits under ${grp}`);
          if (!x.closest('td').classList.contains(x.dataset.team === a ? 'gs-a' : 'gs-h')) bad.push(e.name + ' is in the wrong column');
          if (e.rank != null && e.se != null) { if (txt(x.querySelector('.gs-pse')) !== String(e.se) || txt(x.querySelector('.gs-prk')) !== '#' + e.rank || !x.querySelector('svg.tierbadge')) bad.push(`${e.name} reads ${txt(x.querySelector('.gs-pse'))} ${txt(x.querySelector('.gs-prk'))}, the file ${e.se} #${e.rank}`); }
          else if (txt(x.querySelector('.gs-pcar')) !== String(e.elo) || x.querySelector('.gs-pse')) bad.push(`${e.name}, not ranked, does not read career ${e.elo}`);
          if (!!x.querySelector('.pe-q') !== !!(eloMu.q || {})[x.dataset.pid]) bad.push(`${e.name}'s Q is not the report's`); } }
      chk(pls.length > 0 && bad.length === 0, `snapshot (${label}): the position-by-position table is not the files': ${pls.length} players; ${bad.slice(0, 4).join('; ')}`);
      /* the ranked players out, as the ELO Ratings tab lists them */
      for (const t of [a, h]) { const want = Object.keys(eloP.groups).flatMap(k => (eloP.groups[k].sidelined || []).filter(x => x.team === t).map(x => x.id)).join();
        const got = [...md.querySelectorAll(`[data-gs-outs="${t}"] li[data-pid]`)].map(x => x.dataset.pid).join();
        chk(got === want, `snapshot (${label}): ${t}'s players out are ${got || 'none'}, the file's ${want || 'none'}`); } }
    /* the Mismatches: the Props tab's own rows for this game, in its order, with its ranks and edges */
    { const all = R.w.eloMismatches(), mine = all.map((v, i) => ({ ...v, n: i + 1 })).filter(v => v.game_id === g.game_id);
      const li = [...md.querySelectorAll('#gsMism li[data-pid]')];
      const kicked = R.w.eloGameOn(g.game_id) || win !== undefined || etKick({ d: g.gameday, t: g.gametime }) <= R.w.Date.now();
      if (+g.week !== +eloMu.week || String(g.game_id).slice(0, 4) !== String(eloMu.season)) chk(!li.length && /The matchups are for/.test(txt(q('#gsMism'))), `snapshot (${label}): a game outside the matchups' week shows mismatches or does not say why`);
      else if (kicked) chk(!li.length && /has kicked off/.test(txt(q('#gsMism'))), `snapshot (${label}): a game under way or played shows mismatches, or does not say why none`);
      else { chk(li.map(x => x.dataset.pid).join() === mine.map(v => v.pid).join() && li.every((x, i) => txt(x.querySelector('[data-gs-mm]')) === mine[i].score.toFixed(1) && txt(x.querySelector('.gs-mmn')) === '#' + mine[i].n)
          && (mine.length > 0 || /No mismatches in this game/.test(txt(q('#gsMism')))),
          `snapshot (${label}): the Mismatches are not the Props tab's for this game: ${li.map(x => x.dataset.pid).join()} against ${mine.map(v => v.pid).join()}`);
        /* and the bubbles the Props tab draws for this game are among them */
        const bubbles = [...R.d.querySelectorAll('#peMism [data-mm-game]')].filter(b => b.dataset.mmGame === g.game_id).map(b => b.dataset.mmPid);
        chk(bubbles.every(pid => li.some(x => x.dataset.pid === pid)), `snapshot (${label}): a Mismatches bubble on the Props tab for this game is not in the window`); } }
    /* when the files were published */
    chk(/Results and calls/.test(txt(q('#gsStamps'))) && /Elo ratings/.test(txt(q('#gsStamps'))) && /Lineups and matchups/.test(txt(q('#gsStamps'))), `snapshot (${label}): the window does not say when its files were published: ${txt(q('#gsStamps'))}`);
  };

  const R = await run(st, undefined, wk => scoreboard(st, wk));
  await wait(700);
  chk(!R.timedOut && R.errs.length === 0, 'snapshot: the page did not boot: ' + R.errs.join('; '));
  /* every opened game carries the button, priced by the prop model or not */
  { const cards = [...R.d.querySelectorAll('.pk-game')].slice(0, 4);
    for (const c of cards) { c.click(); await wait(40); }
    chk(cards.length > 0 && cards.every(c => c.querySelector('.pk-gbody button[data-snap]') && c.querySelector('.pk-gbody button[data-snap]').dataset.snap === c.dataset.game),
      'snapshot: an opened Pick\'ems game has no Game snapshot button');
    for (const c of cards) { c.click(); await wait(20); } }
  /* a game to come: the open week's first the scoreboard does not mark over or on, else a later week's */
  const ung = st.schedule.filter(g => +g.week === week && g.result == null);
  const toCome = ung.slice(2).concat(st.schedule.filter(g => +g.week > week && g.result == null))[0] || null;
  let opened = 0;
  if (toCome) {
    const o = await open(R, toCome); opened++;
    chk(!!o.btn, `snapshot: the game to come (${toCome.game_id}) has no Game snapshot button`);
    if (o.btn) {
      hold(R, toCome, 'a game to come', undefined);
      /* Tab stays inside, both ways */
      { const md = o.md, f = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && !x.closest('[hidden]'));
        f[f.length - 1].focus(); f[f.length - 1].dispatchEvent(new R.w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        const wrapped = R.d.activeElement === f[0];
        f[0].dispatchEvent(new R.w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
        chk(f.length > 3 && wrapped && R.d.activeElement === f[f.length - 1], 'snapshot: Tab does not stay inside the window'); }
      /* Escape closes it, and the focus goes back to the button */
      R.d.getElementById('gsClose').focus();
      R.d.activeElement.dispatchEvent(new R.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(20);
      chk(o.md.hidden && R.d.activeElement === o.btn && !R.d.body.classList.contains('modal-open'), 'snapshot: Escape does not close the window and hand the focus back to its button');
      /* a click outside the window closes it; a click inside does not */
      o.btn.click(); await wait(60);
      R.d.getElementById('gsView').click(); await wait(20);
      const stays = !o.md.hidden;
      o.md.click(); await wait(20);
      chk(stays && o.md.hidden, 'snapshot: a click outside the window does not close it, or one inside does');
      /* the links: Team Rankings, then Props on this game */
      o.btn.click(); await wait(60);
      o.md.querySelector('[data-gs-go="ratings"]').click(); await wait(60);
      chk(o.md.hidden && !R.d.getElementById('tab-ratings').hidden && R.d.getElementById('tab-pickems').hidden, 'snapshot: the Team Rankings link does not close the window and open the tab');
      [...R.d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'pickems').click(); await wait(60);
      const o2 = await open(R, toCome);
      o2.md.querySelector('[data-gs-go="slate"]').click(); await wait(120);
      { const S = R.w.eval('S'), row = S.sched.find(x => x.id === toCome.game_id), can = !!row && R.w.eval('weekOpen')(+row.w);
        chk(o2.md.hidden && !R.d.getElementById('tab-slate').hidden && (!can || (S.ui.game === toCome.game_id && !R.d.getElementById('gameModal').hidden)),
          'snapshot: Props for this game does not open the Props tab on the game');
        if (S.ui.game) R.w.eval('closeGame()'); }
      [...R.d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'pickems').click(); await wait(60);
    }
  }
  /* a game the scoreboard says is over that the job has not graded: graded here on the scoreboard's winner */
  const sbFinal = ung[0] || null;
  if (sbFinal) {
    const o = await open(R, sbFinal); opened++;
    if (o.btn) { hold(R, sbFinal, 'a final on the scoreboard', sbFinal.home_team);
      chk(txt(o.md.querySelector('[data-gs-score]')) === '20–27', 'snapshot: a final on the scoreboard does not show the scoreboard\'s score');
      R.d.getElementById('gsClose').click(); await wait(20); chk(o.md.hidden && R.d.activeElement === o.btn, 'snapshot: Close does not close the window and hand the focus back'); }
    else chk(false, 'snapshot: a game final on the scoreboard has no Game snapshot button');
  }
  /* a graded game, the latest */
  const played = st.schedule.filter(g => g.result != null && st.processed[g.game_id]).sort((x, y) => +y.week - +x.week)[0] || null;
  if (played) {
    const o = await open(R, played); opened++;
    if (o.btn) { hold(R, played, 'a graded game', played.result > 0 ? played.home_team : played.result < 0 ? played.away_team : null);
      chk(txt(o.md.querySelector('[data-gs-score]')) === `${played.away_score}–${played.home_score}`, 'snapshot: a graded game does not show its final score');
      R.d.getElementById('gsClose').click(); await wait(20); }
    else chk(false, 'snapshot: a graded game has no Game snapshot button');
  }
  chk(opened > 0, 'snapshot: no game to open the window on');
  /* the Elo files were read once, by the ELO Ratings tab, however often the window opened */
  for (const f of ['players', 'model', 'matchups']) { const n = R.fetched.filter(u => u.endsWith(`elo/data/${f}.json`)).length;
    chk(n === 1, `snapshot: elo/data/${f}.json was read ${n} times; the window reads the ELO Ratings tab's copy`); }
  R.w.close();

  /* a file that did not load: its sections say so, the rest draw */
  const without = re => w2 => { let real = null; Object.defineProperty(w2, 'fetch', { configurable: true, set: f => { real = f; },
    get: () => (u, o) => re.test(String(u)) ? Promise.resolve({ ok: false, status: 404 }) : real(u, o) }); };
  const any = toCome || played || sbFinal;
  if (any) {
    const M1 = await run(st, undefined, wk => scoreboard(st, wk), false, { seed: without(/elo\/data\/matchups\.json/) }); await wait(400);
    const o = await open(M1, any);
    chk(!!o.btn && !o.md.hidden && M1.errs.length === 0 && /expected lineups did not load/.test(txt(o.md.querySelector('#gsPos'))) && /matchups did not load/.test(txt(o.md.querySelector('#gsMism')))
      && (!eloM.teams || !eloM.teams[any.home_team] || txt(o.md.querySelector(`[data-gs-telo="${any.home_team}"]`)) === String(eloM.teams[any.home_team].elo)) && txt(o.md.querySelector(`[data-gs-rec="${any.away_team}"]`)) === recOf(any.away_team),
      'snapshot: with matchups.json missing the window does not say so where it is needed and draw the rest: ' + M1.errs.join('; '));
    M1.w.close();
    const M2 = await run(st, undefined, wk => scoreboard(st, wk), false, { seed: without(/elo\/data\/(model|players)\.json/) }); await wait(400);
    const o2 = await open(M2, any);
    chk(!!o2.btn && !o2.md.hidden && M2.errs.length === 0 && /did not load/.test(txt(o2.md.querySelector('#gsTeams'))) && /did not load/.test(txt(o2.md.querySelector('#gsUnits')))
      && /did not load/.test(txt(o2.md.querySelector('#gsPos'))) && /did not load/.test(txt(o2.md.querySelector('tr[data-gs-model="elo"]')))
      && txt(o2.md.querySelector(`[data-gs-rec="${any.home_team}"]`)) === recOf(any.home_team, false) && !!o2.md.querySelector('tr[data-gs-model="alpha"]'),
      'snapshot: with the ratings missing the window does not say so in each section and draw the matchup: ' + M2.errs.join('; '));
    M2.w.close();
  }
  /* a playoff game (a wild-card game after week 18, still to play): the window draws, and says
     what the files have for it */
  { const alt = JSON.parse(JSON.stringify(st)), src = alt.schedule.filter(x => +x.week === 18)[0];
    if (src) {
      const x = JSON.parse(JSON.stringify(src)); x.game_id = x.game_id.replace(/_18_/, '_19_'); x.week = 19; x.game_type = 'WC';
      for (const k of ['result', 'home_score', 'away_score']) delete x[k]; alt.schedule.push(x);
      const A = await run(alt, undefined, wk => scoreboard(alt, wk)); await wait(400);
      const o = await open(A, x);
      chk(!!o.btn && !o.md.hidden && A.errs.length === 0 && ['gsMatch', 'gsTeams', 'gsUnits', 'gsPos', 'gsMism', 'gsFiles'].every(id => o.md.querySelector('#' + id)) && !/could not be drawn/.test(txt(o.md))
        && /Wild Card/.test(txt(A.d.getElementById('gsTitle'))) && (+eloMu.week === 19 || /The matchups are for/.test(txt(o.md.querySelector('#gsMism')))),
        'snapshot: a playoff game\'s window does not draw, or does not say what the files have for it: ' + A.errs.join('; ') + ' ' + (o.md ? txt(o.md.querySelector('#gsMism')).slice(0, 120) : ''));
      A.w.close(); } }
}
