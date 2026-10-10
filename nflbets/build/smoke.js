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
 * which is the prop model's Games tab running in this page; the Parlay Builder, its suggested
 * parlays panel over the builder (bet types, games, four tiers, the Elo picks, Add to builder,
 * Finish), and X Parlays on a tab of its own. X Parlays and the X Bet Log are the
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
  chk(tabs.join('|') === "Pick'ems|Props|Parlay Builder|X Parlays|Team Rankings|ELO Ratings|Pick'em Record|X Bet Log", 'tabs are ' + tabs.join('|'));
  chk(!d.querySelector('header a'), 'the header carries a link');
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'Pick\'ems is not the open tab');
  for (const id of ['tab-slate', 'tab-parlay', 'tab-xparlays', 'tab-track', 'tab-week', 'tab-backup'])
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
     whose spread is not posted yet offers the money line alone, and says so), and the game
     total over and under where a total is posted */
  const teamLines = id => { const r = w.eval('S').sched.find(x => x.id === id); return r && w.gameBet(r, r.h, 'ats') ? 4 : 2; };
  const hasTot = w.eval('typeof totalBet') === 'function' && w.eval('typeof totalBook') === 'function';
  chk(hasTot, 'the prop model prices no game total (no totalBet or totalBook)');
  const totLines = id => { const r = w.eval('S').sched.find(x => x.id === id); return hasTot && r && w.eval('totalBet')(r, 'over') ? 2 : 0; };
  const nLines = id => teamLines(id) + totLines(id);
  const firstLines = teamLines(first.dataset.game);
  chk(rows.length === nLines(first.dataset.game), `expected ${firstLines === 4 ? 'to win and to cover' : 'to win'} for both sides${totLines(first.dataset.game) ? ' and the total' : ''}, got ${rows.length} row(s): ${txt(body)}`);
  chk(rows.filter(r => /To win/.test(txt(r))).length === 2, 'both sides should have a to-win price');
  chk(rows.filter(r => /To cover/.test(txt(r))).length === firstLines - 2, 'both sides should have a to-cover price where there is a spread, and none where there is not');
  chk(firstLines === 4 || /No spread posted yet/.test(txt(body)), 'a game with no spread does not say why it offers the money line alone');
  const pcts = rows.filter(r => /To win/.test(txt(r))).map(r => parseInt(txt(r.querySelector('.pct')), 10));
  chk(Math.abs(pcts[0] + pcts[1] - 100) <= 1, `the two win chances do not add up: ${pcts.join(' + ')}`);
  chk(rows.filter(r => /To win|To cover/.test(txt(r))).every(r => /[-+]\d+est\./.test(txt(r).replace(/\s/g, ''))), 'a row is missing our own price');
  /* the total: over and under on the posted number, the chances summing to one, a price on each
     (the book's where the payload has one, -110 est. where it has none, and saying so) */
  { const tr = rows.filter(r => /^(Over|Under) [\d.]+/.test(txt(r.querySelector('.thr')))), row = w.eval('S').sched.find(x => x.id === first.dataset.game);
    if (totLines(first.dataset.game)) {
      const tp = tr.map(r => parseInt(txt(r.querySelector('.pct')), 10)), real = w.eval('totalBook')(row, 'over') != null;
      chk(tr.length === 2 && Math.abs(tp[0] + tp[1] - 100) <= 1 && tr.every(r => txt(r.querySelector('.thr')).endsWith(String(row.tot))), 'the game total is not offered over and under on the posted total: ' + tr.map(txt).join(' / '));
      chk(real ? tr.every(r => /^[-+]\d+$/.test(txt(r.querySelector('.book')))) : (tr.every(r => /^-110est\.$/.test(txt(r.querySelector('.est')).replace(/\s/g, ''))) && /the -110 is an estimate/.test(txt(body))),
        'the game total does not carry the book\'s price, or -110 marked est. with a note when there is none: ' + tr.map(txt).join(' / ')); }
    else chk(!tr.length, 'a game with no total posted offers one'); }
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
    chk(/Tick one and it joins the parlay/.test(txt(openCard.querySelector('.gbets'))) && /Parlay Builder/.test(txt(openCard.querySelector('.pk-tolegs a[href="#parlay"]'))), 'no note pointing at the Parlay Builder');
    const key = boxes[0].dataset.leg;
    boxes[0].click();
    await wait(60);
    const leg = w.eval('S').parlay[key];
    chk(!!leg && leg.grp === 'TEAM' && leg.stat === 'ml' && leg.label === 'To win', 'ticking To win did not put a team leg on the parlay: ' + JSON.stringify(leg));
    const box2 = openCard.querySelector(`input[data-leg="${key}"]`);
    chk(box2 && box2.checked && box2.closest('tr').classList.contains('on'), 'the ticked row does not show as on');
    chk(/1 from this game is on the parlay/.test(txt(openCard.querySelector('.pk-tolegs'))), 'the note does not count the leg');
    chk(/1-leg parlay/.test(txt(d.getElementById('parlayBody'))) && txt(d.getElementById('parlayBody')).includes(leg.name), 'the Parlay Builder does not show the leg in the builder');
    /* the total ticks the same way, one side at a time, and counts as this game's */
    { const ov = openCard.querySelector('input[data-leg$="|game|total"][data-side="over"]');
      if (ov) { ov.click(); await wait(60);
        const un = openCard.querySelector('input[data-leg$="|game|total"][data-side="under"]'); un.click(); await wait(60);
        const tl = w.eval('S').parlay[ov.dataset.leg];
        chk(!!tl && tl.stat === 'total' && tl.side === 'under' && /2 from this game are on the parlay/.test(txt(openCard.querySelector('.pk-tolegs'))) && /Under [\d.]+ points/.test(txt(d.getElementById('parlayBody'))),
          'ticking the total\'s under did not take the over\'s place, or is not counted and shown: ' + txt(openCard.querySelector('.pk-tolegs')));
        openCard.querySelector('input[data-leg$="|game|total"][data-side="under"]').click(); await wait(60);
        chk(!w.eval('S').parlay[ov.dataset.leg], 'unticking the total did not take it off the parlay'); } }
    /* the card was drawn again by each tick: the row is found afresh */
    openCard.querySelector(`input[data-leg="${key}"]`).click();
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

  /* ---- the Parlay Builder: the suggested parlays panel over the visitor's own builder, the
     whole of its tab; X Parlays is a tab of its own ---- */
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'parlay').click();
  await wait(60);
  chk(!d.getElementById('tab-parlay').hidden && d.getElementById('tab-slate').hidden && (d.getElementById('tab-xparlays') || { hidden: true }).hidden, 'the Parlay Builder tab did not open');
  chk(w.location.hash === '#parlay', 'the Parlay Builder tab did not become the address #parlay');
  const pb = d.getElementById('parlayBody'), tabB = d.getElementById('tab-parlay'), panel = d.getElementById('pbPanel');
  /* a page without the panel's engine fails here, and the checks that need it are left out rather than thrown on */
  const hasPb = w.eval('typeof getPbTiers') === 'function' && w.eval('typeof pbGames') === 'function';
  chk(hasPb && !!panel, 'the Parlay Builder has no suggested parlays panel (#pbPanel, getPbTiers, pbGames)');
  chk(!!panel && tabB.firstElementChild === panel && panel.nextElementSibling === pb && !pb.nextElementSibling && !tabB.querySelector('#lpCard'),
    'the Parlay Builder tab is not the suggested parlays over the builder and nothing else');
  chk(!d.getElementById('suggModal') && !d.getElementById('suggOpen') && !d.getElementById('suggView') && !d.querySelector('[data-suggest-side], [data-suggest-save], #suggStake'),
    'the old Suggested parlays window or its switch is still in the page');
  chk(/Parlay Builder|-leg parlay/.test(txt(pb.firstElementChild.querySelector('h2'))), 'the builder is not the first card under the panel: ' + txt(pb.firstElementChild));
  chk(!/one line per stat per player|pulled from the odds market twice a week/.test(txt(pb)) && !pb.querySelector('.card ul'), 'the how-to list is still under the builder');
  /* the panel holds on whatever the week offers: the mix sets the boxes, every tier is its legs or says
     why, and every leg is of a ticked kind and game, has not kicked off and is never rated below the book */
  if (hasPb) { const Sx = w.eval('S'), games = w.eval('pbGames()'), U = () => Sx.ui.pb, KINDS = ['ml', 'ats', 'total', 'over', 'under'];
    const kindOf = w.eval('pbKind'), mlProb = w.eval('mlProb'), isG = w.eval('isGameLeg'), started = w.eval('gameStarted');
    const hold = lab => { const r = w.eval('getPbTiers()'), u = U(); let built = 0;
      chk(r.tiers.map(t => t.id + t.n).join() === 'safe2,med3,aggr4,xtrm5', `${lab}: the tiers are not Safe 2, Medium 3, Aggressive 4, Extreme 5`);
      for (const t of r.tiers) {
        if (!t.legs) { chk(typeof t.why === 'string' && t.why.length > 10, `${lab}: the ${t.id} tier is empty and says nothing`); continue; }
        built++;
        chk(t.legs.length === t.n && new Set(t.legs.map(l => l.key)).size === t.n, `${lab}: the ${t.id} tier is not ${t.n} different lines`);
        chk(t.legs.every(l => u.k[kindOf(l)] && !u.off.includes(l.gid) && games.some(g => g.id === l.gid) && !started(Sx.sched.find(g => g.id === l.gid))),
          `${lab}: the ${t.id} tier has a leg of a kind or a game not ticked, or one that has kicked off`);
        chk(t.legs.every(l => l.src === 'real' && l.p >= mlProb(l.price) && l.p >= 0.45 && l.p < 0.97), `${lab}: the ${t.id} tier has a leg with no real price or rated below the book`);
        chk(new Set(t.legs.filter(isG).map(l => l.gid)).size === t.legs.filter(isG).length && new Set(t.legs.filter(l => !isG(l)).map(l => l.pid)).size === t.legs.filter(l => !isG(l)).length,
          `${lab}: the ${t.id} tier has two game bets on one game, or two legs on one player`);
        chk(w.eval('parlayProb')(t.legs).corr === t.corr && w.eval('parlayDec')(t.legs.map(l => ({ leg: l, ml: l.price }))) === t.dec && (!t.floor || t.corr >= t.floor),
          `${lab}: the ${t.id} tier's chance or price is not the builder's sum, or it is under its floor`);
        const card = d.querySelector(`#pbPanel .pb-tier.${t.id}`);
        chk(!!card && card.querySelectorAll('.pb-legs li').length === t.n && !!card.querySelector(`[data-pb-add="${t.id}"]`) && !!card.querySelector(`[data-pc-finish="pb|${t.id}"]`),
          `${lab}: the ${t.id} card does not show its legs with Add to builder and Finish`); }
      return built; };
    if (!games.length) chk(/no game is left|nothing left to build from/.test(txt(panel)), 'with no game to come the panel does not say so: ' + txt(panel).slice(0, 160));
    else {
      chk(d.querySelectorAll('#pbPanel [data-pb-game]').length === games.length && games.every(g => !started(g)), 'the panel\'s games are not this week\'s still to kick off');
      for (const [m, ks] of [['teams', ['ml', 'ats', 'total']], ['players', ['over', 'under']], ['all', KINDS]]) {
        d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).click(); await wait(20);
        chk(KINDS.every(k => U().k[k] === ks.includes(k)) && d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).getAttribute('aria-pressed') === 'true', `the ${m} mix did not set its boxes`);
        hold('this week, ' + m); }
      /* a box by hand makes the mix Custom; the choice is the browser's own, saved with the prop model's state */
      { const cb = d.querySelector('#pbPanel [data-pb-kind="ml"]'); cb.click(); await wait(20);
        chk(U().k.ml === false && !d.querySelector('#pbPanel [data-pb-mix].on') && /Custom/.test(txt(panel)), 'unticking Moneyline under All does not read as Custom');
        await wait(400);
        chk(JSON.parse(w.localStorage.getItem(PROP_KEY)).ui.pb.k.ml === false, 'the bet types are not saved in the browser with the prop model\'s state');
        d.querySelector('#pbPanel [data-pb-kind="ml"]').click(); await wait(20); }
      /* one game ticked: every leg from it */
      d.querySelector('#pbPanel [data-pb-games="none"]').click(); await wait(20);
      chk(w.eval('getPbTiers()').tiers.every(t => !t.legs && /No games ticked/.test(t.why)), 'None did not leave every tier saying no game is ticked');
      d.querySelector(`#pbPanel [data-pb-game="${games[0].id}"]`).click(); await wait(20);
      hold('one game');
      d.querySelector('#pbPanel [data-pb-games="all"]').click(); await wait(20);
      /* made-up lines on every starter (each a few points off his own projection) and a price on
         every other total, so the tiers are built on any day of the week; then Add to builder and
         Finish on one of them */
      const keepPay = w.eval('JSON.stringify({m:PAY.mkt[String(currentWeek())]||null,t:S.sched.map(g=>[g.tov,g.tou])})');
      w.eval(`(function(){ const cw=currentWeek(), M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{});
        pbGames().forEach((g,gi)=>{ if(gi%2===0){ g.tov=-105; g.tou=-115; }
          const ro=rosterFor(g,false); for(const tm in ro) ro[tm].players.forEach((x,i)=>{ if(!x.starter) return;
            for(const l of statLines(x)){ if(l.prob||!(l.mu>2)) continue; ((M[x.pl.id]??={})[l.stat])={line:(i%2?Math.floor(l.mu*1.25):Math.floor(l.mu*0.8))+0.5,over:-112,under:-108,n:x.pl.n,g:g.id}; } }); });
        PB_CACHE=new Map(); renderParlay(); })()`);
      await wait(60);
      const built = hold('made-up lines');
      chk(built >= 2, 'with a made-up line on every starter, fewer than two tiers were built');
      const t = w.eval('getPbTiers()').tiers.filter(x => x.legs).slice(-1)[0];
      if (t) {
        /* Add to builder: exactly the tier's legs, and the builder prices them as the tier did */
        const keepP = w.eval('JSON.stringify(S.parlay)');
        d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`).click(); await wait(60);
        const P = w.eval('S').parlay, q = w.PARLAY_CARD.quote();
        chk(Object.keys(P).length === t.n && t.legs.every(l => P[l.key] && P[l.key].k === l.k && P[l.key].side === l.side) && q && Math.abs(q.pr.corr - t.corr) < 1e-12 && Math.abs(q.useDec - t.dec) < 1e-9,
          'Add to builder did not put exactly the tier\'s legs in the builder at the tier\'s chance and price');
        chk(/In the builder/.test(txt(d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`))), 'the tier does not say it is in the builder');
        w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(40);
        /* Finish: the parlay card for the tier, on its $10, saving nothing */
        const n0 = w.eval('S.saved.length'), keys0 = JSON.stringify(Object.keys(w.localStorage).sort());
        const fb = d.querySelector(`#pbPanel [data-pc-finish="pb|${t.id}"]`); fb.click(); await wait(40);
        const view = d.getElementById('pcView');
        chk(!d.getElementById('pcModal').hidden && new RegExp(t.label + ' parlay', 'i').test(txt(view)) && t.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label))
          && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t.dec}))`).replace('-', '−') && txt(view).includes('Model’s chance all ' + t.n + ' land ' + (t.corr * 100).toFixed(1) + '%')
          && txt(view.querySelector('.pc-money b')) === '$10.00', `Finish on the ${t.label} tier does not open its card with its legs, price, chance and $10: ` + txt(view).slice(0, 200));
        w.eval('PARLAY_CARD.close()'); await wait(20);
        chk(d.getElementById('pcModal').hidden && d.activeElement === d.querySelector(`#pbPanel [data-pc-finish="pb|${t.id}"]`), 'closing the card did not give the focus back to the tier\'s Finish');
        await wait(400);
        chk(w.eval('S.saved.length') === n0 && JSON.stringify(Object.keys(w.localStorage).sort()) === keys0, 'finishing a suggested tier saved it, or wrote a key'); }
      /* a game that kicks off leaves the list and every tier, without a reload */
      { const g0 = w.eval('pbGames()')[0], k0 = w.eval('kickoff')(g0).getTime(), D0 = w.Date, shift = k0 + 60e3 - D0.now();
        w.Date = class extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() + shift); } static now() { return D0.now() + shift; } };
        w.eval('renderParlay()'); await wait(40);
        chk(!d.querySelector(`#pbPanel [data-pb-game="${g0.id}"]`) && w.eval('getPbTiers()').tiers.every(x => !x.legs || x.legs.every(l => l.gid !== g0.id)), 'a game that kicked off is still on the list or in a tier');
        w.Date = D0; w.eval('renderParlay()'); await wait(40); }
      w.eval(`(function(){ const k=${keepPay}, cw=currentWeek(); if(k.m) PAY.mkt[String(cw)]=k.m; else delete PAY.mkt[String(cw)];
        S.sched.forEach((g,i)=>{ g.tov=k.t[i][0]; g.tou=k.t[i][1]; if(g.tov==null) delete g.tov; if(g.tou==null) delete g.tou; }); PB_CACHE=new Map(); renderParlay(); })()`);
      await wait(40); }
  }
  /* with no game to come (the off-season, or every game of the week under way) the panel says so,
     offers nothing, and nothing breaks */
  if (hasPb) { w.__pbKeep = w.eval('[pbGames, seasonOver]');
    w.eval('pbGames=function(){ return []; }; seasonOver=function(){ return true; }; renderParlay();'); await wait(20);
    chk(/regular season is over: no game is left/.test(txt(panel)) && !panel.querySelector('[data-pb-mix], .pb-tier, #pbElo, [data-pc-finish]'), 'with the season over the panel does not say so, or still offers something: ' + txt(panel).slice(0, 160));
    w.eval('seasonOver=function(){ return false; }; renderParlay();'); await wait(20);
    chk(/has kicked off, so there is nothing left to build from/.test(txt(panel)), 'with every game of the week under way the panel does not say so: ' + txt(panel).slice(0, 160));
    w.eval('pbGames=window.__pbKeep[0]; seasonOver=window.__pbKeep[1]; renderParlay();'); await wait(20); }
  /* ---- X Parlays: X's parlays from the file, the whole of its own tab, read only, the same on
     every device: nothing of the browser's own is drawn, there is no list of its own ---- */
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'xparlays').click();
  await wait(60);
  chk(!d.getElementById('tab-xparlays').hidden && d.getElementById('tab-parlay').hidden && w.location.hash === '#xparlays', 'the X Parlays tab did not open, or did not become the address #xparlays');
  const lp = d.getElementById('lpCard'), tabP = d.getElementById('tab-xparlays');
  chk(!!lp && tabP.firstElementChild === lp && !lp.nextElementSibling && !d.getElementById('myCard') && !d.getElementById('myApp'),
    'X Parlays is not the whole of its tab, or a list of the browser\'s own is in the page');
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
    chk(lp.querySelectorAll('.savedp').length === fileCount && !/Smoke Saved Side/.test(txt(tabP) + txt(tabB)) && S.saved.some(p => p.id === 'live-smoke'),
      'a browser\'s own saved parlay is drawn on the page, or was dropped from its saved list');
    S.saved = S.saved.filter(p => p.id !== 'live-smoke'); w.eval('save(); renderParlay();'); await wait(40); }
  chk(w.localStorage.getItem('live_parlays_v1') === null && w.localStorage.getItem('my_parlays_v1') === null && typeof w.LIVE_IO === 'undefined', 'the page wrote a key for the section, or still carries the shared key');
  /* the builder carries the one-tap amounts */
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
  chk(!d.getElementById('tab-ratings').hidden && d.getElementById('tab-parlay').hidden && d.getElementById('tab-xparlays').hidden, 'the Power Ratings tab did not open');
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

  /* the tabs keep their addresses: #parlay is the Parlay Builder, #xparlays X Parlays, #bets the X Bet Log */
  for (const [hash, id, label] of [['#parlay', 'tab-parlay', 'Parlay Builder'], ['#xparlays', 'tab-xparlays', 'X Parlays'], ['#bets', 'tab-bets', 'X Bet Log']]) {
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
    /* the panel's player sides reach the Elo picks too */
    if (w.eval('typeof getPbTiers') === 'function') { const S = w.eval('S'), keep = JSON.stringify(S.ui.pb); S.ui.pb.k.over = false; const r = w.eloPicks();
      chk(!r || r.tiers.every(t => t.legs.every(l => l.side === 'under')), 'the Elo picks ignore the panel\'s unticked Player overs');
      S.ui.pb = JSON.parse(keep); }
    /* the suggestions: with the ratings in, a player leg is preferred only where market + form beats the book */
    { chk(w.eval('window.eloLoaded()') === true, 'the Elo tab does not say its files are in');
      if (w.eval('typeof getPbTiers') === 'function') {
      const pool = w.eval('pbPool(pbGames())'), mlProb = w.eval('mlProb'), altP = w.eval('window.eloAltP');
      chk(pool.pref.filter(c => c.grp !== 'TEAM').every(c => altP(c.pid, c.side, c.price, c.src) - mlProb(c.price) >= 0.03), 'a preferred player leg does not clear market + form');
      chk(altP('game', 'over', -110, 'real') === null, 'market + form prices a game total, which is no player\'s');
      chk(w.eval('getPbTiers().sig').split('|').includes('form'), 'the suggestions\' signature does not carry the Elo state: ' + w.eval('getPbTiers().sig')); } }
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
        w.eval('PB_CACHE=new Map(); renderPb()'); await wait(40);
        const card = d.querySelector('#pbPanel #pbElo');
        /* a leg carries a shield where its player is ranked this season, and only there */
        const wantBadges = [t2, t3].flatMap(t => t.legs).filter(l => eloP.players[l.pid] && eloP.players[l.pid].rank).length;
        chk(!!card && /Elo picks/.test(txt(card.querySelector('h3'))) && card.querySelectorAll('.pb-tier').length === 2 && card.querySelectorAll('.pb-legs .pe-badge').length === wantBadges, `the Elo picks are not a section of the suggested parlays, or their legs' shields are wrong: ${card ? card.querySelectorAll('.pb-legs .pe-badge').length : 'no section'} for ${wantBadges}`);
        /* Add to builder puts exactly those legs in the builder */
        { const keepP = w.eval('JSON.stringify(S.parlay)'), ab = card.querySelector('[data-pb-elo-add="elo2"]');
          if (ab) { ab.click(); await wait(40); const P = w.eval('S').parlay;
            chk(Object.keys(P).length === 2 && t2.legs.every(l => P[l.key] && P[l.key].side === l.side && P[l.key].pe === undefined), 'an Elo pick\'s Add to builder did not put exactly its legs in the builder'); }
          else chk(false, 'an Elo pick has no Add to builder');
          w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(40); }
        /* an Elo pick finishes as a card on every device, saved nowhere */
        const nSaved = w.eval('S.saved.length'), fb = d.querySelector('#pbElo [data-pc-finish="elo|elo2"]');
        chk(!!fb && /^Finish$/.test(txt(fb)) && !d.querySelector('[data-elo-save]'), 'an Elo pick has no Finish');
        if (fb) { fb.click(); await wait(40);
          const view = d.getElementById('pcView');
          chk(!d.getElementById('pcModal').hidden && /Elo pick/i.test(txt(view)) && t2.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label))
            && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t2.dec}))`).replace('-', '\u2212') && txt(view).includes('Elo\u2019s chance all 2 land ' + (t2.p * 100).toFixed(1) + '%'),
            'an Elo pick\'s card is not its legs, its price and its Elo chance: ' + txt(view));
          w.eval('PARLAY_CARD.close()'); }
        chk(w.eval('S.saved.length') === nSaved, 'finishing an Elo pick saved it');
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
  { const F = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#xparlays', null, false, { file: FIXFILE });
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
    chk(!F.d.getElementById('tab-xparlays').hidden && F.d.getElementById('tab-parlay').hidden && txt(F.d.querySelector('#tabs button[aria-selected="true"]')) === 'X Parlays', 'opened on #xparlays, the X Parlays tab is not the one showing');
    F.w.close(); }
  /* ---- the suggested parlays' choices are the visitor's own, and come back with the page ---- */
  { const pb = { k: { ml: false, ats: false, total: false, over: true, under: true }, off: [], gx: false };
    const R = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { seed: w2 => w2.localStorage.setItem(PROP_KEY, JSON.stringify({ stake: 20, ui: { pb } })) });
    await wait(300);
    const P = R.d.getElementById('pbPanel'), on = R.d.querySelector('#pbPanel [data-pb-mix].on');
    chk(!R.timedOut && R.errs.length === 0 && JSON.stringify(R.w.eval('S').ui.pb) === JSON.stringify(pb), 'the suggested parlays\' saved choices did not come back with the page: ' + JSON.stringify(R.w.eval('S').ui.pb));
    chk(R.w.eval('typeof pbGames') === 'function' && (!R.w.eval('pbGames()').length) || (!!on && on.dataset.pbMix === 'players' && [...P.querySelectorAll('[data-pb-kind]')].every(cb => cb.checked === ['over', 'under'].includes(cb.dataset.pbKind)) && !P.querySelector('details.pb-games').open),
      'the panel does not open on the visitor\'s own choices (Players only, the games list shut)');
    R.w.close(); }

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

  /* ---- no page asked the retired store or its sign-in services anything, and nothing any page
     or frame sent was a write ---- */
  chk(ALL_CALLS.length > 100 && BAD_CALLS.length === 0, 'a page asked the retired store or its sign-in services, or sent a write: ' + BAD_CALLS.slice(0, 5).join(' | '));
  chk(!/firebaseio|identitytoolkit|securetoken/.test(HTML), 'the built page still names the retired store or its sign-in services');

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));
