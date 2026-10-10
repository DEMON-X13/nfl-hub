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
/* the prop model's storage key, part2's own (the build hands it to the page) */
const PROP_KEY = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=\d{4}, KEY='([^']+)';/)[1];
/* the betting app's own key and season: X's betting slips are read from it, and the X Bet Log is that season's */
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
   windows it leaves open (the sync layer's polls, the X Parlays section's refresh) keep the
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
      "the sync layer and the X Parlays section are not both on part2's storage key " + B.PROP_KEY); }
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
   document, and a PUT to <url>.json replaces the node. The X Bet Log's document sits beside it,
   at <parent>/xbets/<season>, written by PATCH (a key with slashes is a path; null deletes). Two
   devices are two runs on one store.
   The store keeps rules, as the owner's locked ones do once `locked` is set: a write must carry
   ?auth= with an ID token of the owner's uid that has not expired, or it is refused 401
   {"error":"Permission denied"}. Firebase's sign-in (identitytoolkit, email and password) and
   token service (securetoken, refresh tokens) are stubbed beside it: one owner account, tokens
   issued by number, a refresh token that is deleted is revoked. Nothing here touches a real store. */
const STORE_URL = 'https://store.test/nflhub', BETS_ROOT = 'https://store.test/xbets';
const sha256 = t => require('crypto').createHash('sha256').update(t).digest('hex');
/* the smoke's own owner link and account; the site's real secret is not in the repository */
const OWNER_SECRET = 'smoke-test-owner-secret', OWNER_HASH = sha256(OWNER_SECRET);
const API_KEY = 'smoke-api-key', OWNER_UID = 'smoke-owner-uid', OWNER_EMAIL = 'x@smoke.test', OWNER_PW = 'the-right-password';
const OTHER_EMAIL = 'someone@smoke.test', OTHER_PW = 'their-password';
function mkStore(conf) {
  return { node: null, bets: null, puts: [], patches: [], writes: [], revGets: 0, docGets: 0, fail: false, locked: false, refused: 0,
    conf: Object.assign({ url: STORE_URL, ownerHash: OWNER_HASH }, conf || {}), ids: {}, rts: {}, n: 0, refreshes: 0, signIns: 0 };
}
const res = (status, body) => Promise.resolve({ ok: status < 300, status, json: async () => body });
/* a token pair from the stub's sign-in service */
function issue(store, uid) { const n = ++store.n, id = 'id-' + n, rt = 'rt-' + n; store.ids[id] = { uid, exp: Date.now() + 3600e3 }; store.rts[rt] = uid; return { id, rt }; }
const authOf = s => { const m = s.match(/[?&]auth=([^&]+)/); return m ? decodeURIComponent(m[1]) : null; };
const allowed = (store, s) => { if (!store.locked) return true; const t = store.ids[authOf(s)]; return !!t && t.exp > Date.now() && t.uid === OWNER_UID; };
function patchTree(node, ops) {
  node = node && typeof node === 'object' ? node : {};
  for (const [p, v] of Object.entries(ops)) { const ks = p.split('/'); let o = node;
    for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]] || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    if (v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); }
  return node;
}
function storeFetch(store, s, o) {
  if (/(^|\/)sync\.json/.test(s)) return res(200, store.conf);
  if (s.startsWith('https://identitytoolkit.googleapis.com/')) { store.signIns++;
    const b = JSON.parse(o.body), acct = { [OWNER_EMAIL]: [OWNER_PW, OWNER_UID], [OTHER_EMAIL]: [OTHER_PW, 'someone-else-uid'] }[b.email];
    if (!s.includes('key=' + API_KEY)) return res(400, { error: { message: 'API key not valid. Please pass a valid API key.' } });
    if (!acct || acct[0] !== b.password) return res(400, { error: { message: 'INVALID_LOGIN_CREDENTIALS' } });
    const t = issue(store, acct[1]); return res(200, { idToken: t.id, refreshToken: t.rt, expiresIn: '3600', localId: acct[1], email: b.email }); }
  if (s.startsWith('https://securetoken.googleapis.com/')) { store.refreshes++;
    const rt = decodeURIComponent((String(o && o.body).match(/refresh_token=([^&]+)/) || [])[1] || ''), uid = store.rts[rt];
    if (!uid) return res(400, { error: { message: 'TOKEN_EXPIRED' } });
    const t = issue(store, uid); return res(200, { id_token: t.id, refresh_token: t.rt, expires_in: '3600', user_id: uid }); }
  if (s.startsWith(BETS_ROOT + '/')) {
    if (store.fail) return res(500, null);
    const p = s.slice(BETS_ROOT.length).replace(/\?.*$/, '');
    if (o && o.method && o.method !== 'GET') { store.writes.push({ method: o.method, path: '/xbets' + p, auth: authOf(s) });
      if (!allowed(store, s)) { store.refused++; return res(401, { error: 'Permission denied' }); }
      if (o.method !== 'PATCH' || p !== '/' + BET_SEASON + '.json') return res(400, { error: 'the X Bet Log is written by PATCH of its season, nothing else' });
      const ops = JSON.parse(o.body); store.patches.push(ops); store.bets = patchTree(store.bets, ops); return res(200, null); }
    if (p === '/' + BET_SEASON + '.json') return res(200, store.bets ? JSON.parse(JSON.stringify(store.bets)) : null);
    if (p === '/' + BET_SEASON + '/rev.json') return res(200, store.bets ? store.bets.rev || null : null);
    return res(404, null);
  }
  if (!s.startsWith(STORE_URL)) return null;
  if (store.fail) return res(500, null);
  const p = s.slice(STORE_URL.length).replace(/\?.*$/, '');
  if (o && o.method === 'PUT') { store.writes.push({ method: 'PUT', path: p, auth: authOf(s) });
    if (!allowed(store, s)) { store.refused++; return res(401, { error: 'Permission denied' }); }
    const b = JSON.parse(o.body); store.node = b; store.puts.push(b); return res(200, null); }
  if (p === '/rev.json') { store.revGets++; return res(200, store.node ? store.node.rev : null); }
  if (p === '/doc.json') { store.docGets++; return res(200, store.node ? store.node.doc : null); }
  return res(404, null);
}
const storeDoc = store => store.node ? JSON.parse(store.node.doc.json) : null;
/* the parlay file the sync checks read in place of the real one: three placed parlays of their
   own (a player leg, a team bet, one to delete), so they hold whatever the real file holds this week */
const FIXFILE = { updated: null, games: [`${BET_SEASON}_18_XXA_XXH`], parlays: [
  { id: 'fx-player', week: 18, stake: 5, price: 300, payout: 20, legs: [{ game: 0, player: 'Fixture Receiver', team: 'XXH', stat: 'receiving_yards', line: 50.5, side: 'over', main: true }] },
  { id: 'fx-team', week: 18, stake: 2, price: 120, payout: 4.4, legs: [{ game: 0, player: 'Fixture Home', team: 'XXH', stat: 'ml', line: 0, side: 'over', main: false }] },
  { id: 'fx-gone', week: 18, stake: 1, price: 150, payout: 2.5, legs: [{ game: 0, player: 'Fixture Runner', team: 'XXA', stat: 'rushing_yards', line: 60.5, side: 'over', main: true }] }] };
/* jsdom has no SubtleCrypto or TextEncoder; a browser on https has both, and the owner link needs them */
const WEBCRYPTO = require('crypto').webcrypto, { TextEncoder: NodeTextEncoder } = require('util');
function cryptoFor(w) { Object.defineProperty(w, 'crypto', { value: WEBCRYPTO, configurable: true }); w.TextEncoder = NodeTextEncoder; }

/* owner: the owner link's secret in this browser (true for the smoke's own); session: a Firebase
   session in it; file: the parlay file it reads in place of liveparlays/parlays.json. Every request
   is in `calls` with its method, and a reload the page asks for is counted in `nav` (jsdom cannot
   navigate). */
function run(state, url = 'https://demon-x13.github.io/nfl-hub/nflbets/', espn = null, noState = false, { sync = null, seed = null, net = null, owner = null, session = null, file = null } = {}) {
  return new Promise(resolve => {
    const errs = [], fetched = [], urls = [], calls = [], nav = { reloads: 0 };
    const vc = new VirtualConsole(); vc.sendTo(console, { omitJSDOMErrors: true });
    vc.on('jsdomError', e => { if (/navigation/i.test(String(e && e.message))) nav.reloads++; else console.error('jsdom: ' + (e && e.message)); });
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: vc,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        shiftClock(w); cryptoFor(w);
        w.addEventListener('error', e => errs.push(e.message));
        if (owner) w.localStorage.setItem('nflowner_v1', owner === true ? OWNER_SECRET : owner);
        if (session) w.localStorage.setItem('nflsync_owner_v1', JSON.stringify(session));
        if (seed) seed(w);
        w.fetch = (u, o) => { const s = String(u); fetched.push(s.replace(/\?.*$/, '')); urls.push(s); calls.push(((o && o.method) || 'GET') + ' ' + s);
          /* a device of its own offline: the store does not answer it, whatever it answers others */
          if (sync && net && net.down && s.startsWith('https://store.test/')) return Promise.reject(new TypeError('Failed to fetch'));
          if (sync) { const r = storeFetch(sync, s, o); if (r) return r; }
          if (s.includes('state.json')) return noState
            ? Promise.resolve({ ok: false, status: 404 })
            : Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PAYLOAD) });
          if (s.includes('parlays.json')) return Promise.resolve({ ok: true, status: 200, json: async () => file ? JSON.parse(JSON.stringify(file.value || file)) : JSON.parse(PARLAYS) });
          if (s.includes('elo/data/players.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_P) });
          if (s.includes('elo/data/model.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_M) });
          if (s.includes('elo/data/matchups.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_MU) });
          if (espn && s.includes('/scoreboard')) { const wk = +(s.match(/week=(\d+)/) || [])[1]; return Promise.resolve({ ok: true, status: 200, json: async () => espn(wk) }); }
          return Promise.resolve({ ok: false, status: 404 }); };
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, errs, fetched, urls, calls, nav }), 300));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs, fetched, urls, calls, nav, timedOut: true }), 20000);
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
  /* ---- the X Parlays section: X's card at the top, the builder, then Your parlays, where the
     Saved parlays card was. With no store (this run: sync.json does not answer) X's card is the
     placed parlays from the file, read only, and everything this browser makes is its own ---- */
  const lp = d.getElementById('lpCard'), myc = d.getElementById('myCard');
  chk(!!lp && d.getElementById('tab-parlay').firstElementChild === lp && lp.nextElementSibling === pb && !!myc && pb.nextElementSibling === myc,
    'X Parlays is not at the top of its tab, with the builder under it and Your parlays under that');
  chk(/^X Parlays/.test(txt(lp.querySelector('h2'))) && /^Your parlays/.test(txt(myc.querySelector('h2'))) && !/Live Parlays/.test(txt(d.getElementById('tab-parlay'))), 'the cards are not headed X Parlays and Your parlays');
  chk(!d.getElementById('savedCard') && !d.getElementById('betParlays'), 'the old Saved parlays or betting-slips card is still drawn beside the section');
  chk(!!lp.querySelector('#now') && !!lp.querySelector('#stamp') && !!lp.querySelector('#app') && !!myc.querySelector('#myApp'), 'the section is missing its controls');
  const fileCount = JSON.parse(PARLAYS).parlays.length;
  chk(lp.querySelectorAll('.savedp').length === fileCount, `X Parlays shows ${lp.querySelectorAll('.savedp').length} parlays with no store; the file holds ${fileCount}`);
  chk(!fileCount || [...lp.querySelectorAll('.savedp .pill')].some(x => txt(x) === 'placed'), 'the file parlays are not labelled placed');
  chk(!lp.querySelector('[data-rm], [data-edit], [data-stake-of]') && lp.querySelector('#clear').hidden, 'X Parlays offers a control on a browser that is not the owner\'s');
  chk(!myc.hidden, 'Your parlays is not shown on a browser that is not the owner\'s');
  /* a saved parlay is watched the moment it is saved: no sending. On a browser that is not the
     owner's it is the visitor's own, under Your parlays */
  { const S = w.eval('S'); const lp = myc; const before = lp.querySelectorAll('.savedp').length;
    const g = S.sched.find(x => x.id === (cards[0] && cards[0].dataset.game)) || S.sched[0];
    S.saved.push({ id: 'live-smoke', saved: new Date().toISOString(), week: g.w, stake: 3, payout: 9, price: 200,
      legs: [{ gid: g.id, stat: 'ml', k: 0, side: 'over', main: false, name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win', p: 0.55, price: -120, src: 'real' }] });
    w.eval('save(); renderParlay();');
    await wait(80);
    chk(lp.querySelectorAll('.savedp').length === before + 1, 'a saved parlay did not appear in the section on its own');
    const mine = [...lp.querySelectorAll('.savedp')].find(c => /prop model/.test(txt(c.querySelector('.pill'))));
    chk(!!mine, 'the saved parlay is not labelled as the prop model\'s');
    chk(d.getElementById('lpCard').querySelectorAll('.savedp').length === fileCount, 'a visitor\'s saved parlay went into X Parlays');
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
      /* a file parlay is X's placed slip and keeps its stake */
      const filed = [...d.getElementById('lpCard').querySelectorAll('.savedp')].find(c => /placed/.test(txt(c.querySelector('.pill'))));
      chk(!filed || !filed.querySelector('[data-stake-of]'), 'a file parlay offers to change its stake'); }
    /* the builder and the suggestions window carry the one-tap amounts */
    chk(/data-stake-chip/.test(HTML) && /function stakeChips\(/.test(HTML), 'the amount buttons are not in the built page');
    /* and deleting it here deletes the parlay itself */
    mine.querySelector('[data-rm]').click();
    await wait(80);
    chk(!S.saved.some(p => p.id === 'live-smoke'), 'deleting a saved parlay in the section left it in the saved list');
    chk(lp.querySelectorAll('.savedp').length === before, 'the deleted parlay is still drawn');
    const st = JSON.parse(w.localStorage.getItem('my_parlays_v1') || '{}');
    chk(!(st.removed && st.removed['prop|live-smoke']), 'a deleted saved parlay was written to the device deletions instead of deleted');
    chk(w.localStorage.getItem('live_parlays_v1') === null && w.LIVE_IO.set('{"removed":{"file|x":1}}') === false, 'a browser with no store wrote X\'s key'); }
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

  /* ---- Sync: X's parlays, one document every device reads and only X's devices write ---- */
  /* with no store address the page runs on this browser alone, and says so */
  chk(fetched.includes('sync.json'), 'the page never read nflbets/sync.json for the store address');
  chk(w.NFLSYNC && w.NFLSYNC.state().live === false && w.NFLSYNC.state().url === null, 'with sync.json unreachable the page should be local-only');
  chk(/Not synced/.test(txt(d.getElementById('syncStamp'))), 'the header does not say the page is not synced: ' + txt(d.getElementById('syncStamp')));
  /* a game that has not kicked off, so the builder keeps the leg */
  const openGame = S => laterGame(w, S);
  const teamLeg = g => ({ gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.55, price: -120, src: 'real',
    name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win' });
  const settle = () => wait(900);
  /* ---- X's devices: the owner link marks them, and among themselves they share as every device
     once did: two, then more, of X's devices on one store ---- */
  { const store = mkStore();
    /* device A, first to open the page on an empty store: whatever it makes seeds the document */
    const A = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: store });
    chk(!A.timedOut && A.errs.length === 0, 'device A broke: ' + A.errs.join('; '));
    chk(A.w.NFLSYNC.state().live === true && A.w.NFLSYNC.state().url === STORE_URL && A.w.NFLSYNC.role() === 'owner', 'device A did not come up synced as the owner\'s: ' + JSON.stringify(A.w.NFLSYNC.state()));
    chk(!A.d.getElementById('ownerMark').hidden && !A.d.getElementById('xpOwner').hidden && !A.d.getElementById('xpSignOut').hidden && A.d.getElementById('myCard').hidden && A.d.getElementById('xpSignIn').hidden,
      'the owner\'s device does not show the owner mark and sign-out, or still shows Your parlays or a sign-in it has no use for');
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
    chk(!!A.d.querySelector('#lpCard #syncStamp') && !A.d.querySelector('header #syncStamp'), 'the sync stamp is not in the X Parlays card, or is still in the header');
    /* a poll after its own push reads the tag alone and fetches nothing */
    const dg = store.docGets, puts = store.puts.length;
    await A.w.NFLSYNC.poll();
    chk(store.docGets === dg && store.puts.length === puts, 'a poll with nothing changed fetched the document or pushed it again');
    /* device B opens the page fresh and sees exactly what A made, in the builder and in the section */
    const B = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { owner: true, file: FIXFILE, sync: store });
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
    const filep = [...lpB.querySelectorAll('.savedp')].find(c => /placed/.test(txt(c.querySelector('.pill'))));
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
    const C = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: store });
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
    const D = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: fresh, seed: w => w.localStorage.setItem(PROP_KEY, JSON.stringify(blob)) });
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
    const E = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: fresh, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(blobE));
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
    const F = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: fresh, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(blobF)); w.localStorage.setItem('nflsync_v1', 'some-earlier-rev'); } });
    chk(!F.timedOut && F.errs.length === 0, 'device F broke: ' + F.errs.join('; '));
    await settle();
    chk(!F.w.eval('S').saved.some(p => p.id === 'ghost'), 'device F kept a parlay the document lacks although it had shared before');
    chk(fresh.puts.length === putsF && !storeDoc(fresh).prop.saved.some(p => p.id === 'ghost'), 'device F pushed a parlay another device had deleted');
    chk(F.w.localStorage.getItem('nflsync_v1') === fresh.node.rev, 'device F did not remember the rev it took');
    for (const x of [A, B, C, D, E, F]) x.w.close();
  }

  /* ---- the owner link: opened once as #owner=<secret>; the secret leaves the address at once,
     and on a match this browser is the owner's (kept in it); a wrong one marks nothing ---- */
  { const store = mkStore();
    const L = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#owner=' + encodeURIComponent(OWNER_SECRET), null, false, { sync: store, file: FIXFILE });
    await settle();
    chk(!L.timedOut && L.errs.length === 0, 'the owner link broke the page: ' + L.errs.join('; '));
    chk(!/owner=/.test(L.w.location.href) && L.w.location.hash === '#parlay' && !L.d.getElementById('tab-parlay').hidden, 'the owner link is still in the address, or the page did not open on X Parlays: ' + L.w.location.href);
    chk(L.w.localStorage.getItem('nflowner_v1') === OWNER_SECRET && L.w.NFLSYNC.role() === 'owner', 'the owner link did not mark this browser as the owner\'s');
    chk(!L.d.getElementById('ownerMark').hidden && !L.d.getElementById('xpSignOut').hidden && /sign out of owner/.test(txt(L.d.getElementById('xpSignOut'))), 'the owner\'s browser shows no owner mark or "sign out of owner"');
    const bad = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#owner=not-the-secret', null, false, { sync: store, file: FIXFILE });
    await settle();
    chk(!/owner=/.test(bad.w.location.href) && bad.w.localStorage.getItem('nflowner_v1') === null && bad.w.NFLSYNC.role() === 'reader' && bad.d.getElementById('ownerMark').hidden,
      'a wrong owner link stays in the address or marks the browser as the owner\'s');
    chk(/does not match/.test(txt(bad.d.getElementById('xpSub'))), 'a wrong owner link is not said: ' + txt(bad.d.getElementById('xpSub')));
    /* a new ownerHash in sync.json signs every device out */
    const moved = mkStore({ ownerHash: sha256('another-secret') });
    const M2 = await run(state, undefined, null, false, { sync: moved, owner: true, file: FIXFILE });
    await settle();
    chk(M2.w.NFLSYNC.role() === 'reader' && M2.d.getElementById('ownerMark').hidden, 'a browser is still the owner\'s after ownerHash changed');
    for (const x of [L, bad, M2]) x.w.close(); }


  /* ---- everyone else's device: X's parlays, read only; the visitor's own apart ----
     The owner's device O builds a document of every kind X Parlays shows: a saved parlay, the
     builder, a builder kept at kickoff, a betting slip, a placed parlay deleted, a line corrected. */
  const slip = (id, g, g2) => ({ id, week: g.w, type: 'parlay', stake: 3, legs: [
    { game_id: g.id, away: g.a, home: g.h, pick: g.h, ml: -150 }, { game_id: g2.id, away: g2.a, home: g2.h, pick: g2.a, ml: 130 }] });
  const savedOf = (id, g, extra) => Object.assign({ id, saved: new Date().toISOString(), week: g.w, stake: 3, payout: 9, price: 200, legs: [teamLeg(g)] }, extra || {});
  const pillsOf = card => [...card.querySelectorAll('.savedp')].map(c => [...c.querySelectorAll('.pill')].map(txt).join('|'));
  const puts = x => x.calls.filter(c => /^(PUT|PATCH|POST|DELETE) https:\/\/store\.test\//.test(c)).length;
  { const store = mkStore();
    const O = await run(state, undefined, null, false, { sync: store, owner: true, file: FIXFILE });
    await settle();
    const SO = O.w.eval('S'), g = openGame(SO), g2 = SO.sched.find(x => x.id !== g.id) || g, key = g.id + '|team:' + g.h + '|ml';
    O.w.localStorage.setItem(BET_KEY, JSON.stringify({ myPicks: {}, bets: {}, bank: { build: [slip('x-slip', g, g2)] } }));
    SO.parlay[key] = teamLeg(g);
    SO.saved.push(savedOf('x-saved', g));
    O.w.eval('save(); renderParlay();');
    { const lv = JSON.parse(O.w.LIVE_IO.get() || '{}');
      lv.removed = { 'file|fx-gone': 1 }; lv.lines = { 'file|fx-player|0': 60.5 };
      lv.kept = { kx: { at: new Date().toISOString(), week: g.w, stake: 4, price: 300, payout: 16, legs: [{ gid: g.id, stat: 'receptions', k: 4.5, side: 'over', main: true, name: 'Kept Receiver', team: g.h, week: g.w }] } };
      chk(O.w.LIVE_IO.set(JSON.stringify(lv)) !== false, 'the owner\'s device could not write X\'s key'); }
    await O.w.NFLSYNC.poll(); await settle();
    { const doc = storeDoc(store);
      chk(!!doc && doc.prop.saved.some(p => p.id === 'x-saved') && !!doc.prop.parlay[key] && doc.live.removed['file|fx-gone'] === 1 && doc.live.kept.kx
        && doc.live.bet && doc.live.bet[O.w.NFLSYNC.device()] && doc.live.bet[O.w.NFLSYNC.device()][0].id === 'x-slip',
        'the owner\'s parlays, deletion, kept builder and betting slip did not all reach the store: ' + JSON.stringify(doc && doc.live)); }

    /* V, a visitor: X Parlays is X's document, every kind, with nothing to press */
    const V = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { sync: store, file: FIXFILE });
    await settle();
    const lpV = V.d.getElementById('lpCard'), myV = V.d.getElementById('myCard'), SV = V.w.eval('S');
    chk(!V.timedOut && V.errs.length === 0, 'the visitor\'s device broke: ' + V.errs.join('; '));
    chk(V.w.NFLSYNC.role() === 'reader' && V.w.NFLSYNC.state().live === false && V.d.getElementById('ownerMark').hidden && V.d.getElementById('xpSignOut').hidden && V.d.getElementById('xpSignIn').hidden,
      'a visitor\'s device is not a reader, or shows an owner control');
    { const p = pillsOf(lpV);
      chk(p.length === 6, `X Parlays on a visitor's device should show X's saved parlay, builder, kept builder, betting slip and two placed parlays, 6: ${p.length} (${p.join(' / ')})`);
      chk(p.filter(x => x === 'prop model').length === 1 && p.some(x => /^prop model\|in X.s builder$/.test(x)) && p.some(x => /^prop model\|builder at kickoff$/.test(x))
        && p.filter(x => x === 'betting model').length === 1 && p.filter(x => x === 'placed').length === 2, 'X Parlays is not labelled saved, in X\'s builder, kept at kickoff, betting model and placed: ' + p.join(' / ')); }
    chk(!/Fixture Runner/.test(txt(lpV)), 'a placed parlay X deleted still shows on a visitor\'s device');
    { const card = [...lpV.querySelectorAll('.savedp')].find(c => /Fixture Receiver/.test(txt(c)));
      chk(!!card && txt(card.querySelector('.lineLbl')) === '60.5' && /moved from 50\.5/.test(txt(card)) && !card.querySelector('[data-reset]'), 'X\'s corrected line is not what a visitor\'s device measures against: ' + (card ? txt(card).slice(0, 160) : 'no card')); }
    chk(!lpV.querySelector('[data-rm], [data-edit], [data-stake-of], [data-reset], #restoreAll') && lpV.querySelector('#clear').hidden, 'X Parlays offers a visitor a control');
    chk(!myV.hidden && /On this device only/.test(txt(myV)) && /Nothing of yours/.test(txt(myV.querySelector('#myApp'))), 'Your parlays is not shown, empty, on a visitor\'s device');
    chk(Object.keys(SV.parlay).length === 0 && SV.saved.length === 0, 'a visitor\'s builder or saved list did not start empty: it took X\'s');
    chk(/^X.s parlays · updated /.test(txt(V.d.getElementById('syncStamp'))), 'a visitor\'s stamp does not say these are X\'s parlays and when they changed: ' + txt(V.d.getElementById('syncStamp')));
    /* everything V does is V's, in this browser */
    const docBefore = JSON.stringify(store.node), patchesBefore = store.patches.length;
    SV.parlay[key] = teamLeg(g); V.w.eval('save(); renderParlay();');
    SV.saved.push({ id: 'v-own', saved: new Date().toISOString(), week: g.w, stake: 2, payout: 6, price: 200,
      legs: [{ gid: g.id, stat: 'receiving_yards', k: 30.5, side: 'over', main: true, name: 'Visitor Receiver', team: g.h, week: g.w, label: '30.5+', p: 0.5, price: -110, src: 'real' }] });
    SV.stake = 77; SV.margin = 'none'; V.w.eval('save(); renderParlay();');
    await settle();
    { const own = [...myV.querySelectorAll('.savedp')], builder = own.find(c => /in the builder/.test(txt(c))), saved = own.find(c => /Visitor Receiver/.test(txt(c)));
      chk(own.length === 2 && !!builder && !!saved, 'the visitor\'s builder and saved parlay are not under Your parlays: ' + own.length);
      chk(pillsOf(lpV).length === 6, 'the visitor\'s parlays went into X Parlays');
      const ed = saved && saved.querySelector('[data-edit]');
      if (ed) { ed.click(); const inp = myV.querySelector('input.lineInput'); inp.value = '33.5'; inp.dispatchEvent(new V.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
      chk(!!ed && Object.values((JSON.parse(V.w.localStorage.getItem('my_parlays_v1') || '{}').lines) || {}).includes(33.5), 'a line corrected under Your parlays was not kept in the visitor\'s own key');
      const x = [...myV.querySelectorAll('.savedp')].find(c => /Visitor Receiver/.test(txt(c)));
      if (x) x.querySelector('[data-rm]').click();
      chk(!!x && !SV.saved.some(p => p.id === 'v-own'), 'the visitor could not delete their own parlay'); }
    chk(V.w.LIVE_IO.set(JSON.stringify({ removed: { 'file|fx-player': 1 } })) === false, 'a visitor\'s device can write X\'s key');
    chk(V.w.XBETS.write({ bets: {} }, { bets: { 9: { staked: 1, returned: 2, note: '' } } }) === false, 'a visitor\'s device can write the X Bet Log');
    await V.w.NFLSYNC.poll(); await settle();
    chk(puts(V) === 0 && JSON.stringify(store.node) === docBefore && store.patches.length === patchesBefore, `a visitor's device wrote to the store (${puts(V)} writes)`);
    chk(pillsOf(lpV).length === 6 && JSON.parse(V.w.localStorage.getItem(PROP_KEY)).stake === 77, 'the visitor\'s stake, or X\'s list, did not stand');

    /* X changes things on O; V sees each on its next look */
    SO.saved.push(savedOf('x-new', g, { stake: 6 })); O.w.eval('save(); renderParlay();');
    { const lv = JSON.parse(O.w.LIVE_IO.get()); lv.removed['file|fx-team'] = 1; lv.lines['file|fx-player|0'] = 70.5; O.w.LIVE_IO.set(JSON.stringify(lv)); }
    O.w.localStorage.setItem(BET_KEY, JSON.stringify({ myPicks: {}, bets: {}, bank: { build: [slip('x-slip', g, g2), slip('x-slip2', g2, g)] } }));
    await O.w.NFLSYNC.poll(); await settle();
    await V.w.NFLSYNC.poll(); await wait(300);
    { const p = pillsOf(lpV), card = [...lpV.querySelectorAll('.savedp')].find(c => /Fixture Receiver/.test(txt(c)));
      chk(p.filter(x => x === 'prop model').length === 2, 'X\'s new parlay did not reach the visitor on its next look: ' + p.join(' / '));
      chk(p.filter(x => x === 'placed').length === 1 && !/Fixture Home/.test(txt(lpV)), 'a placed parlay X deleted did not go from the visitor\'s view');
      chk(!!card && txt(card.querySelector('.lineLbl')) === '70.5', 'X\'s new correction did not reach the visitor');
      chk(p.filter(x => x === 'betting model').length === 2, 'X\'s new betting slip did not reach the visitor: ' + p.join(' / ')); }
    chk(puts(V) === 0, 'the visitor\'s device wrote while following X');

    /* a visitor's browser from when every device wrote the document: what it took from the
       document (its mirror) leaves its own list, once, and nothing is written */
    const cur = storeDoc(store), ownKey = g.id + '|team:' + g.a + '|ml', ownLeg = Object.assign(teamLeg(g), { pid: 'team:' + g.a, name: TEAM(g.a), team: g.a });
    const mineOwn = { id: 'mine-own', saved: new Date().toISOString(), week: g.w, stake: 2, payout: 4, price: 100,
      legs: [{ gid: g.id, stat: 'receptions', k: 3.5, side: 'over', main: true, name: 'Own Receiver', team: g.h, week: g.w }] };
    const base = { rev: 'r-mirror', revs: ['r-mirror'], doc: { prop: { saved: cur.prop.saved, parlay: cur.prop.parlay, stake: 5 }, live: { lines: { 'prop|mine-own|0': 4.5, 'file|fx-player|0': 70.5 }, removed: {}, kept: cur.live.kept } }, hist: [] };
    const blob = { stake: 5, saved: cur.prop.saved.concat([mineOwn]), parlay: Object.assign({}, cur.prop.parlay, { [ownKey]: ownLeg }) };
    const Mi = await run(state, undefined, null, false, { sync: store, file: FIXFILE, seed: w2 => { w2.localStorage.setItem(PROP_KEY, JSON.stringify(blob));
      w2.localStorage.setItem('nflsync_v1', 'r-mirror'); w2.localStorage.setItem('nflsync_base_v1', JSON.stringify(base)); w2.localStorage.setItem('live_parlays_v1', JSON.stringify(base.doc.live)); } });
    await settle();
    { const SM = Mi.w.eval('S'), ls2 = k => Mi.w.localStorage.getItem(k), my = JSON.parse(ls2('my_parlays_v1') || '{}');
      chk(SM.saved.map(p => p.id).join() === 'mine-own' && Object.keys(SM.parlay).join() === ownKey, 'a visitor\'s mirror of the document was not taken out of their own list: ' + SM.saved.map(p => p.id).join() + ' / ' + Object.keys(SM.parlay).join());
      chk(['nflsync_v1', 'nflsync_base_v1', 'live_parlays_v1'].every(k => ls2(k) === null) && !!ls2('xparlays_v1') && Mi.w.NFLSYNC.state().stripped === cur.prop.saved.length + Object.keys(cur.prop.parlay).length,
        'the mirror\'s keys were not removed, or the strip was not recorded: ' + JSON.stringify(Mi.w.NFLSYNC.state()));
      chk(my.lines && my.lines['prop|mine-own|0'] === 4.5 && !('file|fx-player|0' in my.lines), 'a line the visitor corrected on their own parlay did not move to their own key, or one of X\'s did');
      chk(puts(Mi) === 0, 'stripping a visitor\'s mirror wrote to the store');
      chk([...Mi.d.querySelectorAll('#myCard .savedp')].some(c => /Own Receiver/.test(txt(c))) && pillsOf(Mi.d.getElementById('lpCard')).filter(x => x === 'prop model').length === 2,
        'after the strip the visitor\'s own parlay is not under Your parlays, or X\'s are not under X Parlays'); }
    /* a browser that saved parlays before the store had an address never mirrored the document:
       its parlays are its own, and on a visitor's device they do not join X's */
    const P0 = await run(state, undefined, null, false, { sync: store, file: FIXFILE, seed: w2 => w2.localStorage.setItem(PROP_KEY, JSON.stringify({ stake: 3, saved: [savedOf('presync', g)] })) });
    await settle();
    chk(P0.w.eval('S').saved.some(p => p.id === 'presync') && !storeDoc(store).prop.saved.some(p => p.id === 'presync') && puts(P0) === 0 && P0.w.NFLSYNC.state().joined === 0,
      'a visitor\'s parlays from before the store joined X\'s document, or were lost');
    chk([...P0.d.querySelectorAll('#myCard .savedp')].length === 1, 'a visitor\'s own parlay from before the store is not under Your parlays');

    /* the store out of reach: a visitor sees the copy it last saw, and says so */
    store.fail = true;
    const Vc = await run(state, undefined, null, false, { sync: store, file: FIXFILE, seed: w2 => w2.localStorage.setItem('xparlays_cache_v1', V.w.localStorage.getItem('xparlays_cache_v1')) });
    await settle();
    chk(pillsOf(Vc.d.getElementById('lpCard')).filter(x => x === 'prop model').length === 2 && /last saw/.test(txt(Vc.d.getElementById('syncStamp'))),
      'with the store out of reach a visitor does not see the copy it last saw, or is not told: ' + txt(Vc.d.getElementById('syncStamp')));
    store.fail = false;

    /* the owner signs this device out: what it holds of X's leaves its own, and it reloads as a reader */
    const docNow = storeDoc(store), navBefore = O.nav.reloads;
    await O.w.NFLSYNC.signOut();
    { const ls2 = k => O.w.localStorage.getItem(k), left = JSON.parse(ls2(PROP_KEY) || '{}');
      chk(ls2('nflowner_v1') === null && !!ls2('xparlays_v1') && ls2('nflsync_v1') === null && ls2('nflsync_base_v1') === null && ls2('live_parlays_v1') === null && O.nav.reloads > navBefore,
        'signing out of owner did not drop the mark, strip the mirror and reload');
      chk(!(left.saved || []).some(p => docNow.prop.saved.some(q => q.id === p.id)) && !Object.keys(left.parlay || {}).some(k => k in docNow.prop.parlay), 'signing out left X\'s parlays as the browser\'s own');
      chk(JSON.stringify(storeDoc(store).prop.saved.map(p => p.id)) === JSON.stringify(docNow.prop.saved.map(p => p.id)), 'signing out changed X\'s document'); }
    { const keep = {}; for (let i = 0; i < O.w.localStorage.length; i++) { const k = O.w.localStorage.key(i); keep[k] = O.w.localStorage.getItem(k); }
      const O2 = await run(state, undefined, null, false, { sync: store, file: FIXFILE, seed: w2 => { for (const [k, v] of Object.entries(keep)) w2.localStorage.setItem(k, v); } });
      await settle();
      chk(O2.w.NFLSYNC.role() === 'reader' && puts(O2) === 0 && O2.w.eval('S').saved.length === 0, 'a device signed out of owner comes back as the owner\'s, writes, or keeps X\'s parlays as its own');
      O2.w.close(); }
    for (const x of [O, V, Mi, P0, Vc]) x.w.close();
  }

  /* ---- Firebase sign-in: the store's rules locked to the owner's uid ----
     sync.json carries apiKey and owner; every write needs the owner's ID token (?auth=). */
  { const store = mkStore({ ownerHash: '', apiKey: API_KEY, owner: OWNER_UID }); store.locked = true;
    /* the stub keeps the rules: a write with no token, or anyone else's, is refused */
    const forged = await storeFetch(store, STORE_URL + '.json?print=silent', { method: 'PUT', body: JSON.stringify({ rev: 'f', at: 'f', doc: { rev: 'f', at: 'f', revs: ['f'], json: '{"prop":{"saved":[]}}' } }) });
    const other = issue(store, 'someone-else-uid');
    const forged2 = await storeFetch(store, STORE_URL + '.json?print=silent&auth=' + other.id, { method: 'PUT', body: '{}' });
    chk(forged.status === 401 && forged2.status === 401 && store.node === null && (await forged.json()).error === 'Permission denied', 'the stub store took a write without the owner\'s token: the checks below would prove nothing');
    store.writes = [];
    const R = await run(state, undefined, null, false, { sync: store, file: FIXFILE });
    await settle();
    chk(R.w.NFLSYNC.role() === 'reader' && !R.d.getElementById('xpSignIn').hidden && /Owner sign-in/.test(txt(R.d.getElementById('xpSignIn'))) && R.d.getElementById('xpSignOut').hidden,
      'with sign-in set up a visitor\'s device does not offer "Owner sign-in"');
    const form = async (email, pw) => { if (R.d.getElementById('xpSignInBox').hidden) R.d.getElementById('xpSignIn').click();
      R.d.getElementById('xpEmail').value = email; R.d.getElementById('xpPass').value = pw;
      R.d.getElementById('xpSignInBox').dispatchEvent(new R.w.Event('submit', { cancelable: true })); await wait(300); };
    await form(OWNER_EMAIL, 'a-wrong-password');
    chk(/wrong email or password/.test(txt(R.d.getElementById('xpSignInMsg'))) && R.w.localStorage.getItem('nflsync_owner_v1') === null && R.nav.reloads === 0 && R.d.getElementById('xpPass').value === '',
      'a wrong password is not said, keeps the password in its box, or signs in: ' + txt(R.d.getElementById('xpSignInMsg')));
    await form(OTHER_EMAIL, OTHER_PW);
    chk(/not the owner/.test(txt(R.d.getElementById('xpSignInMsg'))) && R.w.localStorage.getItem('nflsync_owner_v1') === null, 'an account that is not the owner\'s was signed in');
    await form(OWNER_EMAIL, OWNER_PW);
    const sess = JSON.parse(R.w.localStorage.getItem('nflsync_owner_v1') || 'null');
    { let leaked = false; for (let i = 0; i < R.w.localStorage.length; i++) if (String(R.w.localStorage.getItem(R.w.localStorage.key(i))).includes(OWNER_PW)) leaked = true;
      chk(!!sess && sess.uid === OWNER_UID && !!sess.refreshToken && !leaked && R.nav.reloads === 1, 'the owner\'s sign-in did not keep a session (and never the password) and reload as the owner\'s device'); }
    /* the device as it reloads: the owner's, and its writes carry the owner's token */
    const O = await run(state, undefined, null, false, { sync: store, session: sess, file: FIXFILE });
    await settle();
    const SO = O.w.eval('S'), g = openGame(SO);
    chk(O.w.NFLSYNC.role() === 'owner' && O.w.NFLSYNC.state().signedIn && !O.d.getElementById('ownerMark').hidden && /^sign out$/.test(txt(O.d.getElementById('xpSignOut'))), 'a signed-in device is not the owner\'s');
    SO.saved.push(savedOf('signed-1', g)); O.w.eval('save(); renderParlay();'); await settle();
    chk(!!storeDoc(store) && storeDoc(store).prop.saved.some(p => p.id === 'signed-1') && store.writes.filter(x => x.method === 'PUT').every(x => x.auth && store.ids[x.auth] && store.ids[x.auth].uid === OWNER_UID),
      'the signed-in owner\'s write did not land, or a write went without the owner\'s token');
    chk(/^Signed in · Synced/.test(txt(O.d.getElementById('syncStamp'))), 'the signed-in owner\'s stamp does not say so: ' + txt(O.d.getElementById('syncStamp')));
    /* the X Bet Log's writes carry it too */
    await O.w.XBETS.ready();
    O.w.XBETS.write({ bets: {} }, { bets: { 4: { staked: 10, returned: 30, note: 'signed' } } }); await settle();
    chk(store.bets && store.bets.weeks && store.bets.weeks.w4 && store.writes.filter(x => x.method === 'PATCH').every(x => store.ids[x.auth] && store.ids[x.auth].uid === OWNER_UID), 'the X Bet Log was not written with the owner\'s token');
    /* an ID token past its hour: renewed with the refresh token before the write */
    const old = issue(store, OWNER_UID); store.ids[old.id].exp = Date.now() - 1000;
    const E = await run(state, undefined, null, false, { sync: store, file: FIXFILE, session: { uid: OWNER_UID, email: OWNER_EMAIL, idToken: old.id, refreshToken: old.rt, exp: Date.now() - 1000 } });
    await settle();
    const ref0 = store.refreshes; E.w.eval('S').saved.push(savedOf('renewed', g)); E.w.eval('save(); renderParlay();'); await settle();
    chk(store.refreshes > ref0 && storeDoc(store).prop.saved.some(p => p.id === 'renewed') && JSON.parse(E.w.localStorage.getItem('nflsync_owner_v1')).idToken !== old.id, 'an expired ID token was not renewed before the write');
    /* one the page thinks good that the store has stopped taking: refused, renewed, written */
    const stale = issue(store, OWNER_UID);
    const E2 = await run(state, undefined, null, false, { sync: store, file: FIXFILE, session: { uid: OWNER_UID, email: OWNER_EMAIL, idToken: stale.id, refreshToken: stale.rt, exp: Date.now() + 3600e3 } });
    await settle(); store.ids[stale.id].exp = Date.now() - 1;
    const ref1 = store.refreshes, ref1d = store.refused; E2.w.eval('S').saved.push(savedOf('retried', g)); E2.w.eval('save(); renderParlay();'); await settle();
    chk(store.refused > ref1d && store.refreshes > ref1 && storeDoc(store).prop.saved.some(p => p.id === 'retried'), 'a refused write was not renewed and tried again');
    /* a refresh token revoked (the password changed): the stamp asks for sign-in, nothing is lost,
       and the change lands once the device is signed in again */
    const rv = issue(store, OWNER_UID); store.ids[rv.id].exp = Date.now() - 1; delete store.rts[rv.rt];
    const K = await run(state, undefined, null, false, { sync: store, file: FIXFILE, session: { uid: OWNER_UID, email: OWNER_EMAIL, idToken: rv.id, refreshToken: rv.rt, exp: Date.now() - 1000 } });
    await settle();
    const SK = K.w.eval('S'); SK.saved.push(savedOf('k-unsent', g)); K.w.eval('save(); renderParlay();'); await settle();
    chk(K.w.NFLSYNC.state().blocked === 'signin' && /sign in to publish/.test(txt(K.d.getElementById('syncStamp'))) && !K.d.getElementById('xpSignIn').hidden, 'a lapsed sign-in is not said, or no sign-in is offered: ' + txt(K.d.getElementById('syncStamp')));
    chk(!storeDoc(store).prop.saved.some(p => p.id === 'k-unsent') && SK.saved.some(p => p.id === 'k-unsent') && JSON.parse(K.w.localStorage.getItem(PROP_KEY)).saved.some(p => p.id === 'k-unsent'),
      'a change made while the sign-in had lapsed was written, or lost from the device');
    /* held, not retried: another change and another look send nothing to the store or the token service */
    const putsK = store.writes.length, refK = store.refreshes;
    SK.stake = 13; K.w.eval('save();'); await settle(); await K.w.NFLSYNC.poll(); await settle();
    chk(store.writes.length === putsK && store.refreshes === refK && K.w.NFLSYNC.state().pending, 'a device whose sign-in lapsed keeps trying to write, or forgot it has a change to write');
    await K.w.NFLSYNC.signIn(OWNER_EMAIL, OWNER_PW); await settle();
    chk(storeDoc(store).prop.saved.some(p => p.id === 'k-unsent') && K.nav.reloads === 0 && /^Signed in · Synced/.test(txt(K.d.getElementById('syncStamp'))), 'the change did not land once the device signed in again: ' + txt(K.d.getElementById('syncStamp')));
    for (const x of [R, O, E, E2, K]) x.w.close();
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
    const P = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: store });
    await settle();
    const Q = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: store, net: netQ });
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
    const R = await run(state, undefined, null, false, { owner: true, file: FIXFILE, sync: store, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(snap.prop));
      w.localStorage.setItem('nflsync_v1', snap.seen); w.localStorage.setItem('nflsync_base_v1', snap.base); } });
    await settle();
    { const SR = R.w.eval('S'), doc = storeDoc(store);
      chk(!R.timedOut && R.errs.length === 0, 'device R broke: ' + R.errs.join('; '));
      chk(SR.saved.some(p => p.id === 'unsent') && !SR.saved.some(p => p.id === 'race-Q'), 'a browser\'s unsent parlay was lost on its next visit, or a parlay deleted elsewhere came back: ' + SR.saved.map(p => p.id).join(','));
      chk(doc.prop.saved.some(p => p.id === 'unsent') && !doc.prop.saved.some(p => p.id === 'race-Q') && store.puts.length > putsR, 'the unsent parlay did not reach the store, or the deleted one came back: ' + ids(doc)); }
    for (const x of [P, R]) x.w.close();
  }


  /* ---- the X Bet Log: X's weeks, one document beside the parlays', every device reads it and
     only X's devices write it, a week at a time ---- */
  { const store = mkStore();
    const mineOf = (bets, deposit) => JSON.stringify({ myPicks: {}, bets, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit } });
    const seeded = mineOf({ 1: { staked: 10, returned: 0, note: 'a' }, 2: { staked: 20, returned: 35, note: 'b' } }, 100);
    const A = await run(state, undefined, null, false, { sync: store, owner: true, file: FIXFILE, seed: w2 => w2.localStorage.setItem(BET_KEY, seeded) });
    await settle();
    const W = st2 => st2 && st2.weeks || {};
    chk(W(store.bets).w1 && W(store.bets).w1.staked === 10 && W(store.bets).w2 && W(store.bets).w2.returned === 35 && Object.keys(W(store.bets)).length === 2,
      'the owner\'s own weeks did not move into the shared X Bet Log: ' + JSON.stringify(store.bets));
    { const pre = JSON.parse(A.w.localStorage.getItem('x_nfl_bets_preshare_' + BET_SEASON) || 'null'), joined = JSON.parse(A.w.localStorage.getItem('xbets_joined_' + BET_SEASON) || 'null');
      chk(!!pre && pre.bets && pre.bets[2].returned === 35 && !!joined && joined.added.join() === '1,2' && joined.differ.length === 0, 'moving in left no copy of the browser\'s own log, or no record of what it added: ' + JSON.stringify(joined)); }
    chk(A.w.localStorage.getItem(BET_KEY) === seeded, 'moving the log in changed the betting app\'s own key');
    chk(!(store.bets.bank && store.bets.bank.deposit != null), 'the deposit was shared with shareDeposit off');
    chk(store.patches.every(ops => Object.keys(ops).every(k => /^weeks\/w([1-9]|1\d|2[0-2])$|^rev$|^at$|^bank(\/deposit)?$/.test(k))), 'the X Bet Log was written with something other than its weeks: ' + JSON.stringify(store.patches));
    /* the parlays' whole-node writes never touch it: it is not inside /nflhub */
    { const SA = A.w.eval('S'), g = openGame(SA); SA.saved.push({ id: 'bets-beside', saved: new Date().toISOString(), week: g.w, stake: 1, payout: 2, price: 100, legs: [teamLeg(g)] });
      A.w.eval('save(); renderParlay();'); await settle();
      chk(storeDoc(store).prop.saved.some(p => p.id === 'bets-beside') && W(store.bets).w2, 'a parlay write and the X Bet Log did not both stand'); }
    /* B, a visitor with a log of its own: sees X's, cannot write it, keeps its own */
    const seededB = mineOf({ 5: { staked: 5, returned: 0, note: 'mine' } }, 50);
    const B = await run(state, undefined, null, false, { sync: store, file: FIXFILE, seed: w2 => w2.localStorage.setItem(BET_KEY, seededB) });
    await settle();
    const xb = B.w.XBETS; await xb.ready();
    chk(Object.keys(xb.get().weeks).join() === '1,2' && xb.get().owner === false && xb.get().deposit === null && xb.get().status.applied, 'a visitor does not see X\'s weeks (and only them, with no deposit): ' + JSON.stringify(xb.get()));
    const nP = store.patches.length;
    chk(xb.write({ bets: {} }, { bets: { 9: { staked: 1, returned: 2, note: '' } } }) === false && store.patches.length === nP, 'a visitor\'s device wrote the X Bet Log');
    let fired = 0; xb.onChange(() => { fired++; });
    /* A logs week 3 (a note with markup, which nobody's frame may draw as markup); B sees it on its next look */
    { const cur = A.w.XBETS.get().weeks;
      A.w.XBETS.write({ bets: cur }, { bets: Object.assign({}, cur, { 3: { staked: 5, returned: 12.5, note: '<img src=x onerror=alert(1)>' } }) }); await settle();
      const last = store.patches[store.patches.length - 1];
      chk(W(store.bets).w3 && Object.keys(last).filter(k => k.startsWith('weeks/')).join() === 'weeks/w3' && !/[<>]/.test(W(store.bets).w3.note), 'logging week 3 wrote more than week 3, or kept the markup: ' + JSON.stringify(last)); }
    await xb.poll(); await wait(100);
    chk(xb.get().weeks[3] && xb.get().weeks[3].returned === 12.5 && fired > 0, 'a visitor did not get X\'s week 3 on its next look, or was not told');
    /* a second of X's browsers, whose own log has week 2 different and a week 4: week 4 joins, week 2 stays X's */
    const C = await run(state, undefined, null, false, { sync: store, owner: true, file: FIXFILE, seed: w2 => w2.localStorage.setItem(BET_KEY, mineOf({ 2: { staked: 99, returned: 0, note: 'other' }, 4: { staked: 4, returned: 8, note: '' } }, null)) });
    await settle();
    { const joined = JSON.parse(C.w.localStorage.getItem('xbets_joined_' + BET_SEASON) || 'null');
      chk(W(store.bets).w4 && W(store.bets).w4.returned === 8 && W(store.bets).w2.staked === 20 && !!joined && joined.added.join() === '4' && joined.differ.join() === '2',
        'another of X\'s browsers did not add its own week 4 and keep the shared week 2: ' + JSON.stringify(joined)); }

    /* the frames: the betting app as the page frames it, handed a device's X Bet Log */
    const BET_FRAME = JSON.parse(HTML.match(/\nconst BET_APP=("(?:[^"\\]|\\.)*");\n<\/script>/)[1]);
    const frame = (X, tab) => new Promise(resolve => {
      const errs = [];
      const dom = new JSDOM(BET_FRAME.replace('window.EMBED_TAB=null', 'window.EMBED_TAB=' + JSON.stringify(tab)), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://demon-x13.github.io/nfl-hub/nflbets/',
        beforeParse(fw) { fw.XBETS = X; fw.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
          fw.confirm = () => true; fw.alert = () => {}; fw.scrollTo = () => {};
          fw.addEventListener('error', e => errs.push(e.message));
          fw.fetch = async u => { const s = String(u);
            if (/elo\/data\/model\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(ELO_M) };
            if (/state\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) };
            return { ok: false, status: 404, json: async () => null }; }; } });
      setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs }), 1500); });
    const rowsOf = fd => [...fd.querySelectorAll('#betTable tbody tr')].map(tr => txt(tr.children[0]));
    await xb.poll();
    const FB = await frame(xb, 'bets');
    chk(FB.errs.length === 0 && FB.d.documentElement.classList.contains('xbets-ro'), 'a visitor\'s X Bet Log frame is not read only: ' + FB.errs.join('; '));
    chk(rowsOf(FB.d).join() === 'Week 1,Week 2,Week 3,Week 4' && !FB.d.querySelector('[data-betdel], .bv-dep, #betDeposit') && /Week by week/.test(txt(FB.d.querySelector('#betTable h2'))),
      'a visitor\'s frame does not show X\'s weeks, read only: ' + rowsOf(FB.d).join());
    chk(!FB.d.querySelector('#betTable img') && /img src=x/.test(txt(FB.d.getElementById('betTable'))), 'a note was drawn as markup');
    chk(/Every week X bet/.test(txt(FB.d.getElementById('xbNote'))) && /Synced/.test(txt(FB.d.getElementById('xbNote'))) && txt(FB.d.querySelector('#tab-bets h2')) === 'X Bet Log',
      'a visitor\'s frame is not headed X Bet Log with what it is and that it is synced: ' + txt(FB.d.getElementById('xbNote')));
    chk(!/Week 5|mine/.test(txt(FB.d.getElementById('betTable'))), 'a visitor\'s own old log is shown as X\'s');
    { const nV = store.patches.length, pv = FB.d.querySelector('[data-bv="pnl"]'); if (pv) pv.click(); await wait(400);
      const keptB = JSON.parse(B.w.localStorage.getItem(BET_KEY));
      chk(!!pv && keptB.bets[5] && Object.keys(keptB.bets).join() === '5' && keptB.bank.deposit === 50 && store.patches.length === nV, 'a visitor\'s save wrote X\'s log over their own, or wrote to the store'); }
    /* the owner's frames: the form, and a save writes only the week it changed; a frame loaded
       earlier that saves its whole state writes nothing of the log */
    const FR = await frame(A.w.XBETS, 'record'), FA = await frame(A.w.XBETS, 'bets');
    chk(!FA.d.documentElement.classList.contains('xbets-ro') && !!FA.d.querySelector('#betTable [data-betdel]') && !FA.d.getElementById('betSave').disabled && /Owner on this device/.test(txt(FA.d.getElementById('xbNote'))),
      'the owner\'s frame is read only, or does not say whose it is: ' + txt(FA.d.getElementById('xbNote')));
    { const fd = FA.d, n0 = store.patches.length;
      fd.getElementById('betWeek').value = '7'; fd.getElementById('betStaked').value = '10'; fd.getElementById('betReturned').value = '25'; fd.getElementById('betNote').value = 'from the frame';
      fd.getElementById('betSave').click(); await wait(1200);
      const mine = store.patches.slice(n0);
      chk(W(store.bets).w7 && W(store.bets).w7.returned === 25 && mine.length >= 1 && mine.every(ops => Object.keys(ops).filter(k => k.startsWith('weeks/')).join() === 'weeks/w7'),
        'Save week in the owner\'s frame did not write week 7, and only week 7: ' + JSON.stringify(mine));
      FR.w.eval('save()'); await wait(800);
      chk(W(store.bets).w7 && store.patches.length === n0 + mine.length, 'a frame loaded before week 7 was logged wrote over it when it saved');
      chk(rowsOf(FR.d).includes('Week 7'), 'the other frame did not take the new week');
      const del = fd.querySelector('#betTable [data-betdel="7"]'); if (del) del.click(); await wait(1200);
      chk(!!del && !W(store.bets).w7 && W(store.bets).w4, 'Remove did not take week 7, and only week 7, out of the X Bet Log'); }
    /* a visitor sees the deposit only when sync.json shares it */
    const shared = mkStore({ shareDeposit: true });
    const D = await run(state, undefined, null, false, { sync: shared, owner: true, file: FIXFILE, seed: w2 => w2.localStorage.setItem(BET_KEY, mineOf({ 1: { staked: 10, returned: 30, note: '' } }, 250)) });
    await settle();
    const Ev = await run(state, undefined, null, false, { sync: shared, file: FIXFILE }); await settle(); await Ev.w.XBETS.ready();
    chk(shared.bets && shared.bets.bank && shared.bets.bank.deposit === 250 && Ev.w.XBETS.get().deposit === 250, 'with shareDeposit on the owner\'s deposit is not shared');
    { const FE = await frame(Ev.w.XBETS, 'bets');
      chk(/\$270\.00/.test(txt(FE.d.querySelector('#betChart .stat.bv-balance'))), 'with the deposit shared a visitor does not see the balance');
      FE.w.close(); }
    /* turned off again: the deposit leaves the document, and no visitor sees it meanwhile */
    shared.conf.shareDeposit = false;
    const Ev2 = await run(state, undefined, null, false, { sync: shared, file: FIXFILE }); await settle(); await Ev2.w.XBETS.ready();
    chk(Ev2.w.XBETS.get().deposit === null, 'a visitor sees a deposit sync.json no longer shares');
    { const FE2 = await frame(Ev2.w.XBETS, 'bets');
      chk(!FE2.d.querySelector('#betChart .stat.bv-balance') && !/\$250/.test(txt(FE2.d.getElementById('betChart'))), 'a visitor\'s frame shows the deposit or the balance it is not shared');
      FE2.w.close(); }
    const D2 = await run(state, undefined, null, false, { sync: shared, owner: true, file: FIXFILE }); await settle();
    chk(!(shared.bets.bank && shared.bets.bank.deposit != null), 'an owner\'s device did not take the deposit out once it is no longer shared');
    for (const x of [A, B, C, D, D2, Ev, Ev2, FB, FR, FA]) x.w.close();
  }

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));
