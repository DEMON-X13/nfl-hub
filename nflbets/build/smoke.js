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
 * which is the prop model's Games tab running in this page. jsdom and PapaParse are borrowed
 * from props/build, so this needs no install of its own.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
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
/* the prop model's storage key, part2's own (the build hands it to the page) */
const PROP_KEY = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=\d{4}, KEY='([^']+)';/)[1];
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
   windows it leaves open (the sync layer's polls, the Live Parlays section's refresh) keep the
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
    chk(!/PROP_KEY=\/\*PROP_KEY\*\/'/.test(HTML) && (HTML.match(/PROP_KEY=\/\*PROP_KEY\*\/"([^"]+)"/g) || []).length === 2 && HTML.split(`PROP_KEY=/*PROP_KEY*/${JSON.stringify(B.PROP_KEY)}`).length === 3,
      "the sync layer and the Live Parlays section are not both on part2's storage key " + B.PROP_KEY); }
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
   (the builder, the badges and second prices on its legs, the sync layer's parlays) has nothing
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
/* a shared store for the sync layer, as a Firebase Realtime Database answers over REST: the
   node at <url> holds {rev, at, doc}, <url>/rev.json is the tag alone, <url>/doc.json the
   document, and a PUT to <url>.json replaces the node. Two devices are two runs on one store. */
const STORE_URL = 'https://store.test/nflhub';
function mkStore() { return { node: null, puts: [], revGets: 0, docGets: 0, fail: false }; }
const res = (status, body) => Promise.resolve({ ok: status < 300, status, json: async () => body });
function storeFetch(store, s, o) {
  if (/(^|\/)sync\.json/.test(s)) return res(200, { url: STORE_URL });
  if (!s.startsWith(STORE_URL)) return null;
  if (store.fail) return res(500, null);
  const p = s.slice(STORE_URL.length).replace(/\?.*$/, '');
  if (o && o.method === 'PUT') { const b = JSON.parse(o.body); store.node = b; store.puts.push(b); return res(200, null); }
  if (p === '/rev.json') { store.revGets++; return res(200, store.node ? store.node.rev : null); }
  if (p === '/doc.json') { store.docGets++; return res(200, store.node ? store.node.doc : null); }
  return res(404, null);
}
const storeDoc = store => store.node ? JSON.parse(store.node.doc.json) : null;

function run(state, url = 'https://demon-x13.github.io/nfl-hub/nflbets/', espn = null, noState = false, { sync = null, seed = null, net = null } = {}) {
  return new Promise(resolve => {
    const errs = [], fetched = [], urls = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        shiftClock(w);
        w.addEventListener('error', e => errs.push(e.message));
        if (seed) seed(w);
        w.fetch = (u, o) => { const s = String(u); fetched.push(s.replace(/\?.*$/, '')); urls.push(s);
          /* a device of its own offline: the store does not answer it, whatever it answers others */
          if (sync && net && net.down && s.startsWith(STORE_URL)) return Promise.reject(new TypeError('Failed to fetch'));
          if (sync) { const r = storeFetch(sync, s, o); if (r) return r; }
          if (s.includes('state.json')) return noState
            ? Promise.resolve({ ok: false, status: 404 })
            : Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PAYLOAD) });
          if (s.includes('parlays.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PARLAYS) });
          if (s.includes('elo/data/players.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_P) });
          if (s.includes('elo/data/model.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_M) });
          if (s.includes('elo/data/matchups.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_MU) });
          if (espn && s.includes('/scoreboard')) { const wk = +(s.match(/week=(\d+)/) || [])[1]; return Promise.resolve({ ok: true, status: 200, json: async () => espn(wk) }); }
          return Promise.resolve({ ok: false, status: 404 }); };
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, errs, fetched, urls }), 300));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs, fetched, urls, timedOut: true }), 20000);
  });
}

(async () => {
  const state = STATE, week = openWeek(STATE);
  /* whether that week has a game still to play: in the playoffs and the off-season every game
     has its result, the board opens on the last week, and the checks that need a game to come
     (the scoreboard's live and just-finished games) wait for next season */
  const toPlay = state.schedule.filter(g => +g.week === week && g.result == null);
  const { w, d, errs, fetched, urls, timedOut } = await run(state, undefined, wk => scoreboard(state, wk));
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
  chk(tabs.join('|') === "Pick'ems|Props|Parlay Builders|Team Rankings|ELO Ratings|Pick'em Record|Bet Log", 'tabs are ' + tabs.join('|'));
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
  /* the button reads again (the Live Parlays section reads the scoreboard too, so count the delta) */
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
    chk(/Tick one and it joins the parlay/.test(txt(openCard.querySelector('.gbets'))) && !!openCard.querySelector('.pk-tolegs a[href="#parlay"]'), 'no note pointing at Parlay Builders');
    const key = boxes[0].dataset.leg;
    boxes[0].click();
    await wait(60);
    const leg = w.eval('S').parlay[key];
    chk(!!leg && leg.grp === 'TEAM' && leg.stat === 'ml' && leg.label === 'To win', 'ticking To win did not put a team leg on the parlay: ' + JSON.stringify(leg));
    const box2 = openCard.querySelector(`input[data-leg="${key}"]`);
    chk(box2 && box2.checked && box2.closest('tr').classList.contains('on'), 'the ticked row does not show as on');
    chk(/1 from this game is on the parlay/.test(txt(openCard.querySelector('.pk-tolegs'))), 'the note does not count the leg');
    chk(/1-leg parlay/.test(txt(d.getElementById('parlayBody'))) && txt(d.getElementById('parlayBody')).includes(leg.name), 'the Parlay Builders tab does not show the leg');
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

  /* ---- Parlay Builders: the prop model's Parlay Builder, suggestions, saved parlays and all ---- */
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'parlay').click();
  await wait(60);
  chk(!d.getElementById('tab-parlay').hidden && d.getElementById('tab-slate').hidden, 'the Parlay Builders tab did not open');
  chk(w.location.hash === '#parlay', 'the Parlay Builders tab did not become the address');
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
  /* ---- Live Parlays: the live page's section, where the Saved parlays card was ---- */
  const lp = d.getElementById('lpCard');
  chk(!!lp && lp.closest('#tab-parlay') && lp.previousElementSibling && lp.previousElementSibling.id === 'parlayBody', 'the Live Parlays section is not under the builder');
  chk(!d.getElementById('savedCard') && !d.getElementById('betParlays'), 'the old Saved parlays or betting-slips card is still drawn beside the section');
  chk(!!lp.querySelector('#now') && !!lp.querySelector('#stamp') && !!lp.querySelector('#app'), 'the section is missing its controls');
  const fileCount = JSON.parse(PARLAYS).parlays.length;
  chk(lp.querySelectorAll('.savedp').length >= fileCount, `the section shows ${lp.querySelectorAll('.savedp').length} parlays; the file alone holds ${fileCount}`);
  chk([...lp.querySelectorAll('.savedp .pill')].some(x => /in the repository/.test(txt(x))), 'the file parlays are not labelled');
  /* a saved parlay is watched the moment it is saved: no sending */
  { const S = w.eval('S'); const before = lp.querySelectorAll('.savedp').length;
    const g = S.sched.find(x => x.id === (cards[0] && cards[0].dataset.game)) || S.sched[0];
    S.saved.push({ id: 'live-smoke', saved: new Date().toISOString(), week: g.w, stake: 3, payout: 9, price: 200,
      legs: [{ gid: g.id, stat: 'ml', k: 0, side: 'over', main: false, name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win', p: 0.55, price: -120, src: 'real' }] });
    w.eval('save(); renderParlay();');
    await wait(80);
    chk(lp.querySelectorAll('.savedp').length === before + 1, 'a saved parlay did not appear in the section on its own');
    const mine = [...lp.querySelectorAll('.savedp')].find(c => /prop model/.test(txt(c.querySelector('.pill'))));
    chk(!!mine, 'the saved parlay is not labelled as the prop model\'s');
    /* its stake is the one thing on it you can change: tap, type, Enter, and the payout follows the locked price */
    { const pill = mine.querySelector('[data-stake-of="live-smoke"]');
      chk(!!pill && /\$3\.00/.test(txt(pill)), 'the saved parlay\'s stake is not a tap-to-change pill');
      if (pill) { pill.click();
        const box = mine.querySelector('input.lineInput');
        chk(!!box && +box.value === 3, 'tapping the stake did not open a box holding it');
        if (box) { box.value = '1'; box.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter' }));
          const sp = S.saved.find(p => p.id === 'live-smoke');
          chk(sp && sp.stake === 1 && sp.payout === 3, `the new stake did not land or the payout did not follow: ${sp && sp.stake} / ${sp && sp.payout}`);
          const again = [...lp.querySelectorAll('.savedp')].find(c => c.querySelector('[data-stake-of="live-smoke"]'));
          chk(!!again && /\$1\.00/.test(txt(again.querySelector('[data-stake-of]'))) && /\$3\.00/.test(txt(again.querySelector('.sp-money'))), 'the card did not redraw with the new stake and payout'); } }
      /* the locked price sets the payout every time: down to $0 and back up to $7 pays $21, not a drifted figure */
      const edit = v => { const pl = lp.querySelector('[data-stake-of="live-smoke"]'); if (!pl) return false; pl.click();
        const bx = lp.querySelector('input.lineInput'); if (!bx) return false; bx.value = String(v);
        bx.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter' })); return true; };
      chk(edit(0) && edit(7), 'the stake could not be changed twice in a row');
      { const sp = S.saved.find(p => p.id === 'live-smoke'); chk(sp && sp.stake === 7 && Math.abs(sp.payout - 21) < 1e-9, `$0 then $7 at +200 should pay $21: ${sp && sp.payout}`); }
      /* a redraw from elsewhere (the shared document re-read) waits while a box is open, and Escape drops the typing */
      { const pl = lp.querySelector('[data-stake-of="live-smoke"]'); pl.click();
        const bx = lp.querySelector('input.lineInput'); bx.value = '99';
        w.eval('window.lpDraw()');
        chk(lp.querySelector('input.lineInput') === bx, 'a redraw took the stake box away while it was being typed in');
        bx.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
        const sp = S.saved.find(p => p.id === 'live-smoke');
        chk(!lp.querySelector('input.lineInput') && sp.stake === 7, 'Escape did not close the box and keep the stake'); }
      /* a parlay locked at a price that is not a round number (a suggestion's) keeps its exact payout:
         opening the box and leaving it writes nothing, a change while it was open (another device's,
         applied underneath) stands, and a real change scales the exact locked ratio */
      { S.saved.push({ id: 'odd', saved: new Date().toISOString(), week: g.w, stake: 20, payout: 149.134, price: 646,
          legs: [{ gid: g.id, stat: 'ml', k: 0, side: 'over', main: false, name: TEAM(g.a), team: g.a, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win', p: 0.3, price: 150, src: 'real' }] });
        w.eval('save(); renderParlay();'); await wait(80);
        const odd = () => S.saved.find(p => p.id === 'odd');
        const box = () => { const pl = lp.querySelector('[data-stake-of="odd"]'); if (!pl) return null; pl.click(); return lp.querySelector('input.lineInput'); };
        let bx = box(); chk(!!bx, 'no stake pill on the second saved parlay');
        if (bx) { bx.dispatchEvent(new w.Event('blur'));
          chk(odd().stake === 20 && odd().payout === 149.134, `leaving an untouched box rewrote the parlay: ${odd().stake} / ${odd().payout}`); }
        bx = box();
        if (bx) { odd().stake = 30; odd().payout = 223.701;          /* another device's change, applied while the box is open */
          bx.dispatchEvent(new w.Event('blur'));
          chk(odd().stake === 30 && odd().payout === 223.701, 'leaving an untouched box put back the stake another device had changed'); }
        bx = box();
        if (bx) { bx.value = '10'; bx.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter' }));
          chk(odd().stake === 10 && Math.abs(odd().payout - 74.567) < 1e-9, `$10 should pay exactly half the locked $20 payout, 74.567: ${odd().payout}`); }
        S.saved = S.saved.filter(p => p.id !== 'odd'); w.eval('save(); renderParlay();'); await wait(80); }
      /* a file parlay is someone else's copy and keeps its stake */
      const filed = [...lp.querySelectorAll('.savedp')].find(c => /in the repository/.test(txt(c.querySelector('.pill'))));
      chk(!filed || !filed.querySelector('[data-stake-of]'), 'a file parlay offers to change its stake'); }
    /* the builder and the suggestions window carry the one-tap amounts */
    chk(/data-stake-chip/.test(HTML) && /function stakeChips\(/.test(HTML), 'the amount buttons are not in the built page');
    /* and deleting it here deletes the parlay itself */
    mine.querySelector('[data-rm]').click();
    await wait(80);
    chk(!S.saved.some(p => p.id === 'live-smoke'), 'deleting a saved parlay in the section left it in the saved list');
    chk(lp.querySelectorAll('.savedp').length === before, 'the deleted parlay is still drawn');
    const st = JSON.parse(w.localStorage.getItem('live_parlays_v1') || '{}');
    chk(!(st.removed && st.removed['prop|live-smoke']), 'a deleted saved parlay was written to the device deletions instead of deleted'); }
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
  chk(/<head>\s*<script>window\.EMBED_TAB="record";window\.STATE_URL='\.\.\/betting\/state\.json';<\/script>/.test(adminHtml), 'the framed app is not told its tab and its season path');
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

  /* ---- Bet Log: the betting site's Bet Log tab, framed, on the same browser store ---- */
  const betFrame = d.querySelector('#tab-bets iframe.pk-frame');
  chk(!!betFrame && !betFrame.getAttribute('srcdoc'), 'the Bet Log frame should not be filled before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'bets').click();
  await wait(60);
  chk(!d.getElementById('tab-bets').hidden && d.getElementById('tab-track').hidden, 'the Bet Log tab did not open');
  chk(w.location.hash === '#bets', 'the Bet Log tab did not become the address');
  chk(/window\.EMBED_TAB="bets";/.test(betFrame.getAttribute('srcdoc') || ''), 'the Bet Log frame is not opened on its tab');
  chk(/data-tab="bets"/.test(adminHtml) && /id="betSave"/.test(adminHtml), 'the framed app has no Bet Log tab with its form');
  /* every framed tab is the same app on this page's origin, so one store: a bet logged in either place is in both */
  chk([...d.querySelectorAll('iframe.pk-frame')].every(f => /^(record|ratings|bets)$/.test(f.dataset.embed) && !f.dataset.src && !f.getAttribute('src')), 'a framed tab is not one of the betting app\'s tabs, or points outside the page');
  chk((HTML.match(/const BET_APP=/g) || []).length === 1, 'the betting app should be in the page exactly once');

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
    const wantCards = 1 + (eloM.units && Object.values(eloM.units.off).some(v => v.games) ? 1 : 0);
    chk(body.querySelectorAll('.card').length === wantCards && /Rankings/.test(txt(body.querySelector('.card h2'))), 'the Elo tab should draw its rankings card, then Total Offense and Defense, and nothing else: ' + body.querySelectorAll('.card').length);
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
      chk(altOf(wrRow) > 0.5 && altOf(wrRow) < 0.75 && /market \+ form \d+%/.test(txt(wrRow.querySelector('.pe-alt'))), 'a top receiver\'s over at -115 should carry a market + form price above the book\'s: ' + altOf(wrRow));
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
        const nSaved = w.eval('S.saved.length');
        card.querySelector('[data-elo-save="elo2"]').click(); await wait(40);
        chk(w.eval('S.saved.length') === nSaved + 1 && w.eval('S.saved[S.saved.length-1].suggested') === 'Elo' && w.eval('S.saved[S.saved.length-1].legs.every(l=>l.pe===undefined)'),
          'saving an Elo parlay did not add it to Saved parlays cleanly');
        chk(!!d.querySelector('#suggView .pe-sugg [data-elo-save="elo2"][disabled]'), 'a saved Elo parlay does not say Saved');
        w.eval('S.saved.pop(); save(); closeSuggest()');
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
        } else chk(false, 'no ranked receiver has a matchup this week to open');
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
    /* Total Offense and Total Defense: every team that has played, best first, each with its shield, and the switch */
    { const U = eloM.units, played = U ? Object.values(U.off).filter(v => v.games).length : 0, card = () => d.getElementById('peUnits');
      if (!played) chk(!card(), 'Total Offense shows with no games rated');
      else {
        for (const side of ['off', 'def']) {
          const btn = card() && card().querySelector(`[data-unit="${side}"]`); chk(!!btn, 'no Total ' + side + ' button'); if (!btn) break;
          btn.click(); await wait(30);
          const rows = [...card().querySelectorAll('tbody tr')], vals = rows.map(r => +txt(r.querySelector('.pe-elo')));
          chk(rows.length === played && vals.every((v, i) => !i || v <= vals[i - 1]) && rows.every(r => r.querySelector('.pe-shield')),
            `Total ${side === 'off' ? 'Offense' : 'Defense'} is not every team that has played, best first, with shields`);
          chk(new RegExp(side === 'off' ? 'Total Offense' : 'Total Defense').test(txt(card().querySelector('h2'))) && !!card().querySelector('.pe-curve'), 'the unit card has the wrong title or no curve');
        }
        card().querySelector('[data-unit="off"]').click(); await wait(30); } }
    d.getElementById('peMore').click(); await wait(40);
    chk(rankRows().length === Math.min(25, eloP.groups.DL.top.length), 'Show the top 25 did not: ' + rankRows().length);
    chk(/walk-forward/.test(txt(d.getElementById('peWalkRec'))), 'the tab bar does not carry the walk-forward record: ' + txt(d.getElementById('peWalkRec')));
    /* the data has the shape the tab relies on */
    chk(eloM.groups.every(g => eloP.groups[g] && eloP.groups[g].top.length >= 10 && eloP.groups[g].top.every(r => r.elo > 1100 && r.elo < 1900)), 'a group has fewer than ten rated players or a rating out of range');
    /* the rankings are this season's: everyone ranked has played enough of it, and a badge's place is that rank */
    chk(eloM.groups.every(g => eloP.groups[g].min_games >= 1 && eloP.groups[g].top.every(r => r.games >= eloP.groups[g].min_games && Array.isArray(r.this_season) && r.this_season.length >= 1)), 'a ranked player has too few games this season');
    chk(Object.values(eloP.players).every(v => (v.rank == null) === (v.se == null)) && eloM.groups.every(g => eloP.groups[g].top.every(r => eloP.players[r.id] && eloP.players[r.id].rank === r.rank && eloP.players[r.id].se === r.elo)), 'the players map and the table disagree on a season rank');
    chk(Object.values(eloM.walk_forward).every(x => x.accuracy > 0.5 && x.games > 0), 'the walk-forward record should beat a coin on every season: ' + JSON.stringify(eloM.walk_forward));
    chk(eloM.coef.QB > 0 && eloM.coef.DB > 0, 'the fitted weights lost their sign');
    [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'pickems').click(); await wait(40); }

  /* ---- Sync: one document for every device ---- */
  /* with no store address the page runs on this browser alone, and says so */
  chk(fetched.includes('sync.json'), 'the page never read nflbets/sync.json for the store address');
  chk(w.NFLSYNC && w.NFLSYNC.state().live === false && w.NFLSYNC.state().url === null, 'with sync.json unreachable the page should be local-only');
  chk(/Not synced/.test(txt(d.getElementById('syncStamp'))), 'the header does not say the page is not synced: ' + txt(d.getElementById('syncStamp')));
  /* a game that has not kicked off, so the builder keeps the leg */
  const openGame = S => laterGame(w, S);
  const teamLeg = g => ({ gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.55, price: -120, src: 'real',
    name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win' });
  const settle = () => wait(900);
  { const store = mkStore();
    /* device A, first to open the page on an empty store: whatever it makes seeds the document */
    const A = await run(state, undefined, null, false, { sync: store });
    chk(!A.timedOut && A.errs.length === 0, 'device A broke: ' + A.errs.join('; '));
    chk(A.w.NFLSYNC.state().live === true && A.w.NFLSYNC.state().url === STORE_URL, 'device A did not come up synced: ' + JSON.stringify(A.w.NFLSYNC.state()));
    await settle();
    chk(/^Synced/.test(txt(A.d.getElementById('syncStamp'))), 'device A\'s header does not say Synced: ' + txt(A.d.getElementById('syncStamp')));
    const SA = A.w.eval('S'), gA = openGame(SA), key = gA.id + '|team:' + gA.h + '|ml';
    SA.parlay[key] = teamLeg(gA);
    SA.saved.push({ id: 'sync-1', saved: new Date().toISOString(), week: gA.w, stake: 3, payout: 9, price: 200, legs: [teamLeg(gA)] });
    A.w.eval('save(); renderParlay();');
    await settle();
    const docA = storeDoc(store);
    chk(!!docA && docA.prop && docA.prop.parlay && !!docA.prop.parlay[key], 'the builder leg was not written to the store: ' + JSON.stringify(docA));
    chk(!!docA && docA.prop.saved && docA.prop.saved.some(p => p.id === 'sync-1'), 'the saved parlay was not written to the store');
    chk(!!docA && docA.prop.stake === SA.stake, 'the stake was not written to the store');
    chk(!!docA && !('players' in docA.prop) && !('sched' in docA.prop) && !('odds' in docA.prop), 'the store holds more than what the visitor made');
    chk(store.node && typeof store.node.doc.json === 'string' && store.node.rev && store.node.doc.rev === store.node.rev, 'the store node is not {rev, at, doc:{rev, at, json}}');
    chk(/^Synced/.test(txt(A.d.getElementById('syncStamp'))), 'after a push the header does not say Synced: ' + txt(A.d.getElementById('syncStamp')));
    chk(/^Synced \u00b7 last change /.test(txt(A.d.getElementById('syncStamp'))) && /last checked at \d/.test(A.d.getElementById('syncStamp').title), 'the sync stamp does not say when the parlays last changed, or its tooltip when the page last checked: ' + txt(A.d.getElementById('syncStamp')));
    chk(!!A.d.querySelector('#lpCard #syncStamp') && !A.d.querySelector('header #syncStamp'), 'the sync stamp is not in the Live Parlays card, or is still in the header');
    /* a poll after its own push reads the tag alone and fetches nothing */
    const dg = store.docGets, puts = store.puts.length;
    await A.w.NFLSYNC.poll();
    chk(store.docGets === dg && store.puts.length === puts, 'a poll with nothing changed fetched the document or pushed it again');
    /* device B opens the page fresh and sees exactly what A made, in the builder and in the section */
    const B = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { sync: store });
    chk(!B.timedOut && B.errs.length === 0, 'device B broke: ' + B.errs.join('; '));
    await settle();
    const SB = B.w.eval('S');
    chk(!!SB.parlay[key], 'device B did not get the builder leg');
    chk(SB.saved.some(p => p.id === 'sync-1'), 'device B did not get the saved parlay');
    chk(new RegExp(TEAM(gA.h)).test(txt(B.d.getElementById('parlayBody'))), 'device B\'s builder does not show the leg');
    const lpB = B.d.getElementById('lpCard');
    chk([...lpB.querySelectorAll('.savedp .pill')].some(x => /in the builder/.test(txt(x))), 'device B\'s section does not show the builder parlay');
    chk([...lpB.querySelectorAll('.savedp .pill')].some(x => /prop model/.test(txt(x))), 'device B\'s section does not show the saved parlay');
    chk(store.puts.length === puts, 'device B pushed on opening, with nothing of its own to add');
    /* B deletes the saved parlay in the section and deletes a file parlay; A sees both on its next look */
    const mine = [...lpB.querySelectorAll('.savedp')].find(c => /prop model/.test(txt(c.querySelector('.pill'))));
    mine.querySelector('[data-rm]').click();
    const filep = [...lpB.querySelectorAll('.savedp')].find(c => /in the repository/.test(txt(c.querySelector('.pill'))));
    filep.querySelector('[data-rm]').click();
    await settle();
    const docB = storeDoc(store);
    chk(!!docB && !docB.prop.saved.some(p => p.id === 'sync-1'), 'B\'s deletion of the saved parlay did not reach the store');
    chk(!!docB && Object.keys(docB.live.removed).length === 1, 'B\'s deletion of a file parlay did not reach the store: ' + JSON.stringify(docB && docB.live));
    const shownA = () => A.d.getElementById('lpCard').querySelectorAll('.savedp').length;
    const beforeA = shownA();
    await A.w.NFLSYNC.poll(); await settle();
    chk(!SA.saved.some(p => p.id === 'sync-1'), 'A still has the saved parlay B deleted');
    chk(shownA() === beforeA - 2, `A's section did not follow B's two deletions (${beforeA} -> ${shownA()})`);
    chk(JSON.parse(A.w.localStorage.getItem('live_parlays_v1')).removed && Object.keys(JSON.parse(A.w.localStorage.getItem('live_parlays_v1')).removed).length === 1, 'A\'s copy of the section key did not take B\'s deletion');
    chk(JSON.parse(A.w.localStorage.getItem(PROP_KEY)).saved.length === 0, 'A\'s browser copy of the prop state did not take B\'s deletion');
    /* A drops the builder leg; B follows */
    delete SA.parlay[key]; A.w.eval('save(); renderParlay();');
    await settle(); await B.w.NFLSYNC.poll(); await wait(200);
    chk(!SB.parlay[key], 'B still has the builder leg A dropped');
    chk(!new RegExp(TEAM(gA.h)).test(txt(B.d.getElementById('parlayBody'))), 'B\'s builder still shows the leg A dropped');
    /* A brings the deleted file parlay back; B follows */
    const restore = A.d.getElementById('lpCard').querySelector('#restoreAll') || null;
    if (restore) { restore.click(); await settle(); await B.w.NFLSYNC.poll(); await wait(200);
      chk(Object.keys(JSON.parse(B.w.localStorage.getItem('live_parlays_v1')).removed).length === 0, 'B did not follow A\'s restore'); }
    /* device C opens while the store is down: it must not push its empty builder over the document, and it takes the document when the store is back */
    store.fail = true;
    SB.parlay[key] = teamLeg(gA); B.w.eval('save(); renderParlay();');
    store.fail = false; await settle(); store.fail = true;
    const C = await run(state, undefined, null, false, { sync: store });
    chk(!C.timedOut && C.errs.length === 0, 'device C broke: ' + C.errs.join('; '));
    chk(C.w.NFLSYNC.state().live === false && C.w.NFLSYNC.state().ok === false, 'device C should be waiting on the store: ' + JSON.stringify(C.w.NFLSYNC.state()));
    chk(/Sync failed/.test(txt(C.d.getElementById('syncStamp'))), 'device C\'s header does not say the store is unreachable: ' + txt(C.d.getElementById('syncStamp')));
    const SC = C.w.eval('S'), putsC = store.puts.length;
    SC.saved.push({ id: 'offline', saved: new Date().toISOString(), week: gA.w, stake: 1, payout: 2, price: 100, legs: [teamLeg(gA)] });
    C.w.eval('save(); renderParlay();'); await settle();
    chk(store.puts.length === putsC, 'device C pushed while it had never read the document');
    store.fail = false; await C.w.NFLSYNC.poll(); await wait(200);
    chk(C.w.NFLSYNC.state().live === true && !!SC.parlay[key], 'device C did not take the document once the store answered: ' + JSON.stringify(C.w.NFLSYNC.state()));
    chk(/^Saving/.test(txt(C.d.getElementById('syncStamp'))), 'device C\'s header does not say it is saving the parlay it made offline: ' + txt(C.d.getElementById('syncStamp')));
    /* what C made while the store was down was its first document, so it joins rather than yields */
    await settle();
    chk(/^Synced/.test(txt(C.d.getElementById('syncStamp'))), 'device C\'s header does not say Synced once the store answers');
    chk(SC.saved.some(p => p.id === 'offline') && !!storeDoc(store) && storeDoc(store).prop.saved.some(p => p.id === 'offline'), 'the parlay C made while the store was down did not join the document');
    /* device D has a browser copy from before sync and opens on an empty store: its copy seeds the document */
    const fresh = mkStore();
    const blob = JSON.parse(A.w.localStorage.getItem(PROP_KEY)); blob.saved = [{ id: 'old-device', saved: new Date().toISOString(), week: gA.w, stake: 2, payout: 4, price: 100, legs: [teamLeg(gA)] }];
    const D = await run(state, undefined, null, false, { sync: fresh, seed: w => w.localStorage.setItem(PROP_KEY, JSON.stringify(blob)) });
    chk(!D.timedOut && D.errs.length === 0, 'device D broke: ' + D.errs.join('; '));
    await settle();
    chk(D.w.eval('S').saved.some(p => p.id === 'old-device'), 'device D lost its own saved parlay to an empty store');
    chk(!!storeDoc(fresh) && storeDoc(fresh).prop.saved.some(p => p.id === 'old-device'), 'device D\'s browser copy did not seed the empty store');
    /* a correction to a line in the section travels too */
    const edit = D.d.getElementById('lpCard').querySelector('[data-edit]');
    if (edit) { edit.click(); const inp = D.d.getElementById('lpCard').querySelector('input.lineInput'); inp.value = '44.5';
      inp.dispatchEvent(new D.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await settle();
      chk(!!storeDoc(fresh) && Object.values(storeDoc(fresh).live.lines).includes(44.5), 'a corrected line did not reach the store: ' + JSON.stringify(storeDoc(fresh) && storeDoc(fresh).live)); }
    else chk(false, 'no line to correct in device D\'s section');
    /* device E also has a browser copy from before sync, but opens on the store D already seeded: its
       parlays join the document instead of being replaced by it, its builder stands in for D's empty
       one, its deletion in the section is kept, and D sees all of it on its next look */
    const blobE = JSON.parse(A.w.localStorage.getItem(PROP_KEY)); blobE.saved = [{ id: 'other-device', saved: new Date().toISOString(), week: gA.w, stake: 5, payout: 15, price: 200, legs: [teamLeg(gA)] }];
    blobE.parlay = { [key]: teamLeg(gA) };
    const putsE = fresh.puts.length;
    const E = await run(state, undefined, null, false, { sync: fresh, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(blobE));
      w.localStorage.setItem('live_parlays_v1', JSON.stringify({ lines: {}, removed: { 'file|gone-before-sync': 1 } })); } });
    chk(!E.timedOut && E.errs.length === 0, 'device E broke: ' + E.errs.join('; '));
    await settle();
    const SE = E.w.eval('S'), docE = storeDoc(fresh);
    chk(SE.saved.some(p => p.id === 'other-device') && SE.saved.some(p => p.id === 'old-device'), 'device E did not keep its own saved parlay beside the document\'s: ' + JSON.stringify(SE.saved.map(p => p.id)));
    chk(!!SE.parlay[key], 'device E\'s builder leg was replaced by the document\'s empty builder');
    chk(fresh.puts.length === putsE + 1, `device E should have pushed its join exactly once (${fresh.puts.length - putsE} pushes)`);
    chk(!!docE && docE.prop.saved.some(p => p.id === 'other-device') && docE.prop.saved.some(p => p.id === 'old-device'), 'device E\'s saved parlay did not join the document: ' + JSON.stringify(docE && docE.prop.saved.map(p => p.id)));
    chk(!!docE && !!docE.prop.parlay[key], 'device E\'s builder leg did not join the document');
    chk(!!docE && docE.live.removed['file|gone-before-sync'] === 1, 'device E\'s deletion from before sync did not join the document: ' + JSON.stringify(docE && docE.live));
    chk(E.w.NFLSYNC.state().joined === 1 && /^Synced/.test(txt(E.d.getElementById('syncStamp'))), 'device E is not synced after its join: ' + JSON.stringify(E.w.NFLSYNC.state()));
    chk(E.w.localStorage.getItem('nflsync_v1') === fresh.node.rev, 'device E did not remember the rev it wrote');
    await D.w.NFLSYNC.poll(); await settle();
    chk(D.w.eval('S').saved.some(p => p.id === 'other-device'), 'device D did not get the parlay E brought');
    /* device F has shared before (it remembers a rev) and holds a parlay the document lacks: another
       device deleted it, so the document wins and nothing is pushed */
    const blobF = JSON.parse(E.w.localStorage.getItem(PROP_KEY)); blobF.saved = blobF.saved.concat([{ id: 'ghost', saved: new Date().toISOString(), week: gA.w, stake: 1, payout: 2, price: 100, legs: [teamLeg(gA)] }]);
    const putsF = fresh.puts.length;
    const F = await run(state, undefined, null, false, { sync: fresh, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(blobF)); w.localStorage.setItem('nflsync_v1', 'some-earlier-rev'); } });
    chk(!F.timedOut && F.errs.length === 0, 'device F broke: ' + F.errs.join('; '));
    await settle();
    chk(!F.w.eval('S').saved.some(p => p.id === 'ghost'), 'device F kept a parlay the document lacks although it had shared before');
    chk(fresh.puts.length === putsF && !storeDoc(fresh).prop.saved.some(p => p.id === 'ghost'), 'device F pushed a parlay another device had deleted');
    chk(F.w.localStorage.getItem('nflsync_v1') === fresh.node.rev, 'device F did not remember the rev it took');
    for (const x of [A, B, C, D, E, F]) x.w.close();
  }

  /* ---- two devices writing at once: nothing either saved is lost ----
     A write is the whole document, so a device that wrote without looking would erase what
     another device saved since it last read. Each write looks first and merges; a device that
     was offline merges when it is back; and a write overwritten by one made at the same moment
     is noticed by the device that made it and written again. */
  { const store = mkStore(), netQ = { down: false };
    const parlayOf = (id, g) => ({ id, saved: new Date().toISOString(), week: g.w, stake: 1, payout: 2, price: 100, legs: [teamLeg(g)] });
    const setVis = (x, v) => { Object.defineProperty(x.d, 'visibilityState', { value: v, configurable: true }); x.d.dispatchEvent(new x.w.Event('visibilitychange')); };
    const ids = st => (st && st.prop && st.prop.saved || []).map(p => p.id).join(',');
    const P = await run(state, undefined, null, false, { sync: store });
    await settle();
    const Q = await run(state, undefined, null, false, { sync: store, net: netQ });
    await settle();
    chk(!P.timedOut && !Q.timedOut && P.errs.length === 0 && Q.errs.length === 0, 'devices P or Q broke: ' + P.errs.concat(Q.errs).join('; '));
    const SP = P.w.eval('S'), SQ = Q.w.eval('S'), g = openGame(SP);
    /* Q's tab goes to the background, so it has not looked since P saved */
    setVis(Q, 'hidden');
    SP.saved.push(parlayOf('from-P', g)); P.w.eval('save(); renderParlay();'); await settle();
    chk(storeDoc(store).prop.saved.some(p => p.id === 'from-P'), 'P\'s saved parlay did not reach the store');
    SQ.stake = 7; Q.w.eval('save();'); await settle();
    { const doc = storeDoc(store);
      chk(doc.prop.saved.some(p => p.id === 'from-P') && doc.prop.stake === 7, `a device that had not looked erased a parlay another device saved (store: saved ${ids(doc)}, stake ${doc.prop.stake})`);
      chk(SQ.saved.some(p => p.id === 'from-P'), 'the device that merged did not take in the parlay it merged'); }
    await P.w.NFLSYNC.poll(); await settle();
    chk(SP.saved.some(p => p.id === 'from-P') && SP.stake === 7, 'P did not end with its parlay and Q\'s stake');
    /* Q loses its signal and is edited; P saves meanwhile; Q comes back */
    setVis(Q, 'visible'); await settle();
    netQ.down = true;
    SQ.stake = 33; Q.w.eval('save();'); await settle();
    chk(Q.w.NFLSYNC.state().pending === true && /Sync failed|Saving/.test(txt(Q.d.getElementById('syncStamp'))), 'an offline device does not show its change waiting: ' + txt(Q.d.getElementById('syncStamp')));
    SP.saved.push(parlayOf('laptop-parlay', g)); P.w.eval('save(); renderParlay();'); await settle();
    chk(storeDoc(store).prop.saved.some(p => p.id === 'laptop-parlay'), 'P\'s second parlay did not reach the store');
    netQ.down = false; Q.w.dispatchEvent(new Q.w.Event('online')); await settle(); await settle();
    { const doc = storeDoc(store);
      chk(doc.prop.saved.some(p => p.id === 'laptop-parlay') && doc.prop.stake === 33, `a device back online overwrote what was saved while it was away, or lost its own change (store: saved ${ids(doc)}, stake ${doc.prop.stake})`);
      chk(SQ.saved.some(p => p.id === 'laptop-parlay') && /^Synced/.test(txt(Q.d.getElementById('syncStamp'))), 'the device back online did not take the parlay saved meanwhile, or does not say Synced'); }
    await P.w.NFLSYNC.poll(); await settle();
    chk(SP.saved.some(p => p.id === 'laptop-parlay') && SP.stake === 33, 'P lost its parlay to the device that came back');
    Q.w.close();
    /* P and another device look at the same moment and both write: the other's write lands
       second, built on the same document, without P's. P sees on its next look that its write
       is not in the store's line of descent and writes it again, merged */
    await P.w.NFLSYNC.poll(); await settle();
    const before = JSON.parse(JSON.stringify(store.node));
    SP.saved.push(parlayOf('race-P', g)); P.w.eval('save(); renderParlay();'); await settle();
    chk(storeDoc(store).prop.saved.some(p => p.id === 'race-P'), 'P\'s race parlay did not reach the store');
    { const other = JSON.parse(before.doc.json); other.prop.saved.push(parlayOf('race-Q', g));
      const rev = 'beside-' + Date.now(), at = new Date().toISOString();
      store.node = { rev, at, doc: { rev, at, revs: (before.doc.revs || [before.rev]).concat([rev]), json: JSON.stringify(other) } }; }
    await P.w.NFLSYNC.poll(); await settle();
    { const doc = storeDoc(store);
      chk(doc.prop.saved.some(p => p.id === 'race-P') && doc.prop.saved.some(p => p.id === 'race-Q'), 'a write overwritten by one made at the same moment was not written again: store has ' + ids(doc));
      chk(SP.saved.some(p => p.id === 'race-Q') && P.w.NFLSYNC.state().recovered >= 1, 'P did not take the other device\'s parlay, or did not notice its write was overwritten'); }
    /* a write built on something older still: a device that had not looked for two writes
       lands one over both. P merges against the newest document it knows that the store
       descends from, so its own parlay and the one before it both survive */
    { await P.w.NFLSYNC.poll(); await settle();
      const r0 = JSON.parse(JSON.stringify(store.node));
      const step = (from, id, tag) => { const doc = JSON.parse(from.doc.json); doc.prop.saved.push(parlayOf(id, g));
        const rev = tag + '-' + Date.now(), at = new Date().toISOString();
        return { rev, at, doc: { rev, at, revs: (from.doc.revs || [from.rev]).concat([rev]), json: JSON.stringify(doc) } }; };
      store.node = step(r0, 'next-1', 'one');                        /* another device's write on r0, which P reads */
      await P.w.NFLSYNC.poll(); await settle();
      SP.saved.push(parlayOf('race-P2', g)); P.w.eval('save(); renderParlay();'); await settle();
      store.node = step(r0, 'stale-1', 'stale');                     /* a write built on r0 lands over both */
      await P.w.NFLSYNC.poll(); await settle();
      const doc = storeDoc(store);
      chk(['next-1', 'race-P2', 'stale-1'].every(id => doc.prop.saved.some(p => p.id === id)),
        'a write built on an older document erased what was saved after it: store has ' + ids(doc)); }
    /* a browser closed with a change it had not sent: on its next visit what it changed stays
       and what another device deleted meanwhile stays deleted */
    const keep = k => P.w.localStorage.getItem(k);
    const snap = { prop: JSON.parse(keep(PROP_KEY)), seen: keep('nflsync_v1'), base: keep('nflsync_base_v1') };
    chk(!!snap.base && JSON.parse(snap.base).rev === snap.seen, 'the browser does not keep the document at the rev it remembers');
    SP.saved = SP.saved.filter(p => p.id !== 'race-Q'); P.w.eval('save(); renderParlay();'); await settle();
    chk(!storeDoc(store).prop.saved.some(p => p.id === 'race-Q'), 'P\'s deletion did not reach the store');
    snap.prop.saved.push(parlayOf('unsent', g));
    const putsR = store.puts.length;
    const R = await run(state, undefined, null, false, { sync: store, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(snap.prop));
      w.localStorage.setItem('nflsync_v1', snap.seen); w.localStorage.setItem('nflsync_base_v1', snap.base); } });
    await settle();
    { const SR = R.w.eval('S'), doc = storeDoc(store);
      chk(!R.timedOut && R.errs.length === 0, 'device R broke: ' + R.errs.join('; '));
      chk(SR.saved.some(p => p.id === 'unsent') && !SR.saved.some(p => p.id === 'race-Q'), 'a browser\'s unsent parlay was lost on its next visit, or a parlay deleted elsewhere came back: ' + SR.saved.map(p => p.id).join(','));
      chk(doc.prop.saved.some(p => p.id === 'unsent') && !doc.prop.saved.some(p => p.id === 'race-Q') && store.puts.length > putsR, 'the unsent parlay did not reach the store, or the deleted one came back: ' + ids(doc)); }
    for (const x of [P, R]) x.w.close();
  }

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));
