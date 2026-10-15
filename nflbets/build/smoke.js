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
 * call on each game, the Game snapshot a tap on one opens (and its button to the game's page on the
 * Props tab, with the game bets), and the Props tab,
 * which is the prop model's Games tab running in this page; the Parlay Builder, its suggested
 * parlays panel over the builder (bet types, games, four tiers, the Elo picks, Add to builder,
 * Finish), and X Parlays on a tab of its own. X Parlays and the X Bet Log are the
 * files liveparlays/parlays.json and liveparlays/xbets.json, read only on every device: there is
 * no owner and no shared store, every request a page makes is recorded, and one to the retired
 * store or its sign-in services, or anything but a read, fails the smoke. A browser that still
 * carries what the retired layers left shows exactly the files and loses none of its own data.
 * The news job's files the Game snapshot reads (news/data/units.json, stats.json, the week's notes)
 * are never the real ones here: every run answers them with a 404 unless it is handed stand-ins of
 * the smoke's own, since the elo job runs this smoke every morning and a news job publish must never
 * turn it red (the real files are news/tools/smoke.js's to hold, in the news job).
 * jsdom and PapaParse are borrowed from props/build, so this needs no install of its own.
 *
 *   SMOKE_PAYLOAD=<file> node nflbets/build/smoke.js   boots the page on that payload instead of
 *                                                       props/data/payload.json (to try a week the job has not baked)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM, VirtualConsole } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
/* a price from DraftKings' line read on ESPN by Refresh odds, worked on its own (the props audit's rule, apart from the page) */
const ESPN_RULE = require(path.join(ROOT, 'props', 'build', 'espn_rule.js'));
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
const PAYLOAD = fs.readFileSync(process.env.SMOKE_PAYLOAD ? path.resolve(process.env.SMOKE_PAYLOAD) : path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const PAYLOAD_TXT = PAYLOAD;
const ELO_P = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'players.json'), 'utf8');
/* the suggestions record (props/build/suggest_ledger.js), as the page reads it beside the payload; none yet is a 404 */
const LEDGER_REAL = (() => { try { return fs.readFileSync(path.join(ROOT, 'props', 'data', 'suggest_ledger.json'), 'utf8'); } catch (e) { return null; } })();
/* the X Bet Log's file, as every device reads it */
const XBETS_REAL = fs.readFileSync(path.join(ROOT, 'liveparlays', 'xbets.json'), 'utf8');
/* the prop model's storage key, part2's own (the build hands it to the page) */
const PROP_KEY = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=\d{4}, KEY='([^']+)';/)[1];
/* the betting app's own key and season: the X Bet Log is that season's */
const { BET_KEY, SEASON: BET_SEASON } = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
const ELO_M = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'model.json'), 'utf8');
/* the matchups as published, except in a thin week (a lone Monday game has one or two players
   whose nudge clears the Elo picks' bar): then three real players' strongest trusted nudges are
   raised to clear it, in this copy only, so the Elo picks checks run on any day of the week; and a
   week with no starter questionable on one side of the games (a report not out yet, a lone Monday
   game) would leave the Game snapshot's Q with nothing to hold in that column, so the first starter
   of each lineup on that side is made questionable, in this copy only */
const ELO_MU = (() => {
  const raw = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'matchups.json'), 'utf8'), M = JSON.parse(raw);
  let planted = false;
  { const sideOf = (t, lu) => { const p = String(lu.game_id || '').split('_'); return p[3] === t ? 'home' : p[2] === t ? 'away' : null; };
    const has = {};
    for (const [t, lu] of Object.entries(M.lineups || {})) if ((lu.players || []).some(pid => (M.q || {})[pid])) has[sideOf(t, lu)] = true;
    for (const [t, lu] of Object.entries(M.lineups || {})) { const sd = sideOf(t, lu);
      if (sd && !has[sd] && (lu.players || []).length) { M.q = M.q || {}; M.q[lu.players[0]] = "questionable (the smoke's own: no starter on this side was)"; planted = true; } } }
  const ok = (g, st) => { const q = ((M.record[g + '|' + st] || {}).past); return !!q && q.rmse_elo < q.rmse_form && q.right_top >= 0.53; };
  const best = {};
  for (const [pid, v] of Object.entries(M.players || {})) for (const [st, a] of Object.entries(v.stats)) {
    if (!ok(v.group, st)) continue; const z = a[2] / M.fit[v.group + '|' + st].sd;
    if (!best[pid] || z > best[pid].z) best[pid] = { pid, st, z }; }
  const top = Object.values(best).sort((x, y) => y.z - x.z);
  if (top.filter(x => x.z >= 0.12).length >= 3) return planted ? JSON.stringify(M) : raw;
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
  /* the Challenger Model and the Broly Model are off the site (October 2026, the owner's call):
     outside the betting app's own source, which is never edited and still carries MODEL_H, the
     page names neither (the Pick'ems board, the Game snapshot) */
  { const rest = m ? HTML.replace(m[0], '\n</script>') : HTML, hit = rest.match(/.{0,40}(?:challenger|broly).{0,40}/i);
    chk(!hit, 'the page still names the Challenger Model or the Broly Model outside the betting app: ' + (hit ? hit[0] : '')); }
}
/* the page's clock. In the season the page runs on the real one. The prop model's page is on its
   own week, liveWeek() in part2.js: the first week of the payload's schedule with a game not yet
   final (no score, and under four hours since its kickoff), else the last week. Once every game of
   that week has kicked off or is within the hour of it (Monday night under way before the job
   rebakes after its final, the season's final weekend, the playoffs, the off-season until next
   season's schedule is in the payload), no game can take a builder leg, and much of what is checked
   here (the panel, the Elo picks, the badges and second prices on the builder's legs, the Finish
   card) has nothing to stand on; the page is then booted two days before that week's last kickoff,
   as it was on the Friday or Saturday of that week. The board, the results and the grades come
   from the files, so they are checked as they are. Schedule times are US Eastern, read through the
   time zone database rather than a date the clocks change on. */
const etKick = r => { const naive = Date.parse(`${r.d}T${r.t || '13:00'}:00Z`); if (!isFinite(naive)) return NaN;
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(naive)).find(p => p.type === 'timeZoneName');
  const m = tz && tz.value.match(/GMT([+-]\d+)/); return naive - (m ? +m[1] : -5) * 3600e3; };
const PAGE_WEEK = (() => { const sch = JSON.parse(PAYLOAD).sched || [], now = Date.now();
  const final = g => (g.hs != null && g.as != null && isFinite(g.hs) && isFinite(g.as)) || (isFinite(etKick(g)) && now >= etKick(g) + 4 * 3600e3);
  const ws = [...new Set(sch.map(g => +g.w))].sort((a, b) => a - b);
  return ws.find(w => sch.some(g => +g.w === w && !final(g))) ?? ws[ws.length - 1]; })();
const LAST_KICK = Math.max(...(JSON.parse(PAYLOAD).sched || []).filter(g => +g.w === PAGE_WEEK).map(etKick).filter(isFinite));
const PAGE_SHIFT_MS = isFinite(LAST_KICK) && Date.now() > LAST_KICK - 3600e3 ? Date.now() - (LAST_KICK - 2 * 86400e3) : 0;
function shiftClock(w) {
  if (!PAGE_SHIFT_MS) return;
  const D0 = w.Date;
  class D extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() - PAGE_SHIFT_MS); }
    static now() { return D0.now() - PAGE_SHIFT_MS; } }
  w.Date = D;
}
if (PAGE_SHIFT_MS) console.log(`the page's week ${PAGE_WEEK} has no game still to kick off: the page is run as at ${new Date(Date.now() - PAGE_SHIFT_MS).toISOString()}, two days before its last kickoff`);
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
/* a dollar figure to the cent with its thousands marked, and an amount as a tier names it ("$35",
   "$12.50"), worked here rather than by the page's own helpers */
const money = v => '$' + (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amtTxt = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
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
/* the book's fair chance on a leg, by the rule, worked here on its own from the page's payload and
   schedule as they stand: both sides of its line priced (a player's main line, a game's two
   moneylines or two spread prices on the leg's number, the total's over and under), that side's
   no-vig chance; one side priced, its implied chance over the week's median overround on two-sided
   lines of its kind (every kind's where it has none of its own), est.; no real price (legPrice's),
   none. The audit's M7 holds the page's legFair to it case by case */
function fairRule(w) {
  const PAY = w.eval('PAY'), S = w.eval('S'), legPrice = w.eval('legPrice'), isG = w.eval('isGameLeg');
  const imp = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100), px = v => v != null && isFinite(v) && v !== 0, nv = (a, b) => imp(a) / (imp(a) + imp(b));
  const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const vig = wk => { const by = { player: [], ml: [], ats: [], total: [] }, M = (PAY.mkt || {})[String(wk)] || {};
    for (const pid in M) for (const st in M[pid]) { const L = M[pid][st]; if (L && px(L.over) && px(L.under)) by.player.push(imp(L.over) + imp(L.under)); }
    for (const g of S.sched.filter(g => String(g.w) === String(wk))) { if (px(g.mla) && px(g.mlh)) by.ml.push(imp(g.mla) + imp(g.mlh));
      if (g.sp != null && isFinite(g.sp) && px(g.spa) && px(g.sph)) by.ats.push(imp(g.spa) + imp(g.sph));
      if (g.tot != null && isFinite(g.tot) && px(g.tov) && px(g.tou)) by.total.push(imp(g.tov) + imp(g.tou)); }
    const o = { all: med([...by.player, ...by.ml, ...by.ats, ...by.total]) }; for (const k in by) o[k] = med(by[k]); return o; };
  const ESR = ESPN_RULE.make(w);
  return l => { const lp = legPrice(l);
    /* priced from DraftKings' line read on ESPN (app v107): the formula's own fair chance, est. (a
       touchdown's its price over the week's typical player overround), by espn_rule.js */
    if (lp && lp.src === 'dkline' && px(lp.ml)) { const x = ESR.price(l); if (!x) return null;
      return x.kind === 'td' ? { p: Math.max(0.001, Math.min(0.999, imp(lp.ml) / ESR.playerVig(l.week))), est: true } : { p: x.fair, est: true }; }
    if (!lp || lp.src !== 'real' || !px(lp.ml)) return null;
    const g = S.sched.find(x => x.id === l.gid), u = l.side === 'under';
    if (l.stat === 'total') { if (g && g.tot != null && +l.k === +g.tot && px(g.tov) && px(g.tou)) return { p: u ? nv(g.tou, g.tov) : nv(g.tov, g.tou), est: false }; }
    else if (l.stat === 'ml' || l.stat === 'ats') { if (g && (l.team === g.h || l.team === g.a)) { const h = l.team === g.h;
      const own = l.stat === 'ml' ? (h ? g.mlh : g.mla) : (h ? g.sph : g.spa), oth = l.stat === 'ml' ? (h ? g.mla : g.mlh) : (h ? g.spa : g.sph);
      if ((l.stat === 'ml' || (g.sp != null && +l.k === (h ? -g.sp : +g.sp))) && px(own) && px(oth)) return { p: nv(own, oth), est: false }; } }
    else if (l.main) { const x = (((PAY.mkt || {})[String(l.week)] || {})[l.pid] || {})[l.stat]; if (x && +x.line === +l.k && px(x.over) && px(x.under)) return { p: u ? nv(x.under, x.over) : nv(x.over, x.under), est: false }; }
    const V = vig(l.week), ov = V[isG(l) ? l.stat : 'player'] || V.all; return ov > 0 ? { p: Math.max(0.001, Math.min(0.999, imp(lp.ml) / ov)), est: true } : null; };
}
/* a leg the panel, a game page's hands or the Elo picks may take: a real price (a player's main line only
   while it is still DraftKings' line, as a Refresh odds read has it), or one from DraftKings' line read on
   ESPN on a kind the estimate has been checked on, at the rule's own price, with no real price on file
   for that line */
function takenRule(w) {
  const ESR = ESPN_RULE.make(w), isG = w.eval('isGameLeg');
  return l => (l.src === 'real' && (isG(l) || !l.main || ESR.paidStands(l))) || (l.src === 'dkline' && !isG(l) && (() => { const x = ESR.price(l); return ESR.takeable(x) && x.price === l.price && !ESR.real(l); })());
}
/* a chance as the parlay card prints it */
const pct1 = p => p > 0 && p < 0.0005 ? '<0.1%' : (p * 100).toFixed(1) + '%';

/* the game the builder checks put their legs on: the season's last kickoff still to come, so
   it does not kick off while the smoke runs (the prop model drops a builder leg whose game has
   started), whatever day of the week the smoke runs on */
/* a leg's key in the payload's dk (weekly.py's dk_ids), worked out here on its own from what the
   leg is, never by the card's code: <pid>|ml, <pid>|ats|<its line>, game|total|<side>|<point>,
   <pid>|any_td (one touchdown; null for 2+), <pid>|<stat>|<side>|<point> for a main line, and a
   rung k+ as DraftKings' Over k-0.5 */
const dkPt = x => String(+x);
function dkKey(l) {
  if (l.stat === 'ml') return l.pid + '|ml';
  if (l.stat === 'ats') return `${l.pid}|ats|${dkPt(l.k)}`;
  if (l.stat === 'total') return `game|total|${l.side}|${dkPt(l.k)}`;
  if (l.stat === 'any_td') return (+l.k || 1) < 2 ? l.pid + '|any_td' : null;
  if (l.main) return `${l.pid}|${l.stat}|${l.side}|${dkPt(l.k)}`;
  return `${l.pid}|${l.stat}|over|${dkPt(l.k - 0.5)}`;
}
/* the keys a wrong lookup would land on: the other side of the line, the other team's bet, a rung's Under */
function dkDecoys(l, w) {
  const g = w.eval('S').sched.find(x => x.id === l.gid) || {}, them = l.pid === 'team:' + g.h ? g.a : g.h, flip = l.side === 'under' ? 'over' : 'under';
  if (l.stat === 'ml') return [`team:${them}|ml`];
  if (l.stat === 'ats') return [`team:${them}|ats|${dkPt(-l.k)}`, `team:${them}|ats|${dkPt(l.k)}`];
  if (l.stat === 'total') return [`game|total|${flip}|${dkPt(l.k)}`];
  if (l.stat === 'any_td') return [];
  if (l.main) return [`${l.pid}|${l.stat}|${flip}|${dkPt(l.k)}`];
  return [`${l.pid}|${l.stat}|under|${dkPt(l.k - 0.5)}`];
}
const dkIdOf = (DK, l) => { const k = dkKey(l); return k ? ((DK[String(l.week)] || {})[l.gid] || {})[k] : undefined; };

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
   it does not answer); friends: picks/friends.json's stand-in (an object, or a string that is not
   JSON; none, by default, is a 404: the real file is never read here); news: the news job's files, stand-ins by name ({ units, stats, notes: {
   '2026-w6': ... } }, each an object, a string that is not JSON, or missing for a 404; none at all
   by default). gate: promises by name ({ units, stats, notes, payload }) that hold back that file's
   answer until each resolves, and early: resolve once the board has drawn, not at the prop model's
   app-ready (which a held payload holds back). Every request is in `calls` with its method and cache mode. */
function run(state, url = 'https://demon-x13.github.io/nfl-hub/nflbets/', espn = null, noState = false, { seed = null, file = null, xbets = null, ledger = null, news = null, gate = null, early = false, friends = null } = {}) {
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
        const held = (k, p) => gate && gate[k] ? gate[k].then(() => p) : p;
        w.fetch = (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase();
          fetched.push(s.replace(/\?.*$/, '')); urls.push(s); calls.push({ url: s, method: m, cache: o && o.cache || null }); ALL_CALLS.push(m + ' ' + s);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); return Promise.reject(new TypeError('Failed to fetch')); }
          /* the news job's files: the run's stand-ins, or a 404 (never the real ones) */
          if (/\/news\/data\//.test(s)) { const nm = s.replace(/\?.*$/, '').match(/news\/data\/(?:notes\/(\d{4}-w\d+)|(units|stats))\.json$/) || [];
            const f = !news ? undefined : nm[1] ? (news.notes || {})[nm[1]] : nm[2] ? news[nm[2]] : undefined;
            return held(nm[1] ? 'notes' : nm[2], Promise.resolve(f === undefined || f === 404 ? { ok: false, status: 404 } : { ok: true, status: 200,
              json: async () => { if (typeof f === 'string') return JSON.parse(f); return JSON.parse(JSON.stringify(f)); } })); }
          if (s.includes('suggest_ledger.json')) { const t = ledger === 404 ? null : ledger ? JSON.stringify(ledger) : LEDGER_REAL;
            return Promise.resolve(t == null ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => JSON.parse(t) }); }
          if (s.includes('state.json')) return noState
            ? Promise.resolve({ ok: false, status: 404 })
            : Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return held('payload', Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PAYLOAD) }));
          if (s.includes('parlays.json')) return Promise.resolve({ ok: true, status: 200, json: async () => file ? JSON.parse(JSON.stringify(file)) : JSON.parse(PARLAYS) });
          /* friends' picks: the run's stand-in (an object, or a string that is not JSON), else a 404, never the real file */
          if (s.includes('picks/friends.json')) return Promise.resolve(friends == null ? { ok: false, status: 404 } : { ok: true, status: 200,
            json: async () => typeof friends === 'string' ? JSON.parse(friends) : JSON.parse(JSON.stringify(friends)) });
          if (s.includes('xbets.json')) return Promise.resolve(xbets === 404 ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => xbets ? JSON.parse(JSON.stringify(xbets)) : JSON.parse(XBETS_REAL) });
          if (s.includes('elo/data/players.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_P) });
          if (s.includes('elo/data/model.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_M) });
          if (s.includes('elo/data/matchups.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_MU) });
          if (espn && s.includes('/scoreboard')) { const wk = +(s.match(/week=(\d+)/) || [])[1]; return Promise.resolve({ ok: true, status: 200, json: async () => espn(wk) }); }
          return Promise.resolve({ ok: false, status: 404 }); };
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, errs, fetched, urls, calls }), 300));
        if (early) { const iv = setInterval(() => { if (w.document.querySelector('.pk-game[data-game]')) { clearInterval(iv); setTimeout(() => resolve({ w, d: w.document, errs, fetched, urls, calls }), 300); } }, 50); }
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
    chk(!/id="previewTheme"/.test(LIVE) && !/<script>window\.PREVIEW_FRAME_HEAD=/.test(LIVE), 'the preview theme leaked into the live page');
    /* the Game snapshot's Deep Dive tags and its preview block in both looks, from their styles (the
       preview is never booted here): each tag's text on its own opaque tint, the preview's text and the
       names it bolds on its block, each side of a position matchup on its box, and the better rank of a
       meeting on its tinted box (a tint that lets the card through is laid over the card's panel-2, the
       lighter of the two it runs between), at 4.5:1 or more. jsdom resolves no var(), so one is looked
       up on the window, then the root */
    { const rgba = v => { v = String(v || '').trim(); let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (m) { const h = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(1); }
        m = v.match(/^rgba?\(([^)]*)\)$/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return p.length >= 3 && p.every(x => !isNaN(x)) ? [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] : null; };
      const lum = c => { const f = x => (x /= 255) <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      for (const [name, h] of [['the page', LIVE], ['the preview', PV]]) {
        const pw = new JSDOM(h, { virtualConsole: new VirtualConsole() }).window, pd = pw.document, box = pd.createElement('div');
        box.id = 'gsModal'; box.innerHTML = '<div class="gs-prev"><p class="gs-pv"><span class="gs-lab">Preview</span><span>x <b class="gs-pn">Name</b></span></p><p class="gs-pauto">x</p></div>'
          + ['easy', 'fav', 'even', 'tough', 'vtough'].map(c => `<span class="dtag ${c}">x</span>`).join('')
          + '<div class="dd"><div class="ddrow"><span class="ddunit">Offensive line</span><span class="ddrks"><span class="ddside ddoff"><span class="ddsn">SEA</span> <b class="ddrk">15th</b></span><span class="ddsep"> · </span><span class="ddside dddef"><span class="ddsn">DEN</span> <b class="ddrk">2nd</b></span></span><span class="dtag even">Even</span></div></div>'
          + '<div class="gs-ubox gs-better"><span class="gs-lab">SEA offense</span><span class="gs-urank"><span>13th</span> <small>of 32</small></span><span class="gs-ush"><b>1521</b><span class="gs-utier">Gold</span></span></div>';
        pd.body.appendChild(box);
        const clear = v => ['', 'transparent', 'none', 'rgba(0, 0, 0, 0)', 'initial'].includes(String(v || '').trim());
        const val = (el, prop) => { let v = String(pw.getComputedStyle(el).getPropertyValue(prop) || '').trim(); if (prop === 'background-color' && clear(v)) v = String(pw.getComputedStyle(el).getPropertyValue('background') || '').trim();
          const m = v.match(/^var\((--[\w-]+)\)$/);
          if (m) v = String(pw.getComputedStyle(box).getPropertyValue(m[1]) || '').trim() || String(pw.getComputedStyle(pd.documentElement).getPropertyValue(m[1]) || '').trim(); return v; };
        const ratio = (bg, ink) => { const b = rgba(bg), k = rgba(ink); return b && k && b[3] === 1 ? (Math.max(lum(b), lum(k)) + 0.05) / (Math.min(lum(b), lum(k)) + 0.05) : 0; };
        /* a tint with alpha laid over an opaque colour */
        const over = (bg, base) => { const t = rgba(bg), u = rgba(base); if (!t || !u || t[3] === 1) return bg; return `rgb(${[0, 1, 2].map(i => Math.round(t[i] * t[3] + u[i] * (1 - t[3]))).join(', ')})`; };
        const bad = [];
        for (const el of box.querySelectorAll('.dtag')) { const bg = val(el, 'background-color'), r = ratio(bg, val(el, 'color'));
          if (!(r >= 4.5)) bad.push(`the ${el.className} tag reads ${r.toFixed(2)}:1 (${bg} under ${val(el, 'color')})`); }
        const pv = box.querySelector('.gs-prev'), pbg = val(pv, 'background-color');
        for (const el of [box.querySelector('.gs-pv'), box.querySelector('.gs-pv .gs-lab'), box.querySelector('.gs-pv b.gs-pn'), box.querySelector('.gs-pauto')]) { const r = ratio(pbg, val(el, 'color'));
          if (!(r >= 4.5)) bad.push(`the preview's ${el.className || el.tagName} reads ${r.toFixed(2)}:1 (${pbg} under ${val(el, 'color')})`); }
        /* a position matchup's row has no box of its own since 14 October 2026: its words on the card, both
           of the colours a card runs between (the preview's cards are a gradient of the two) */
        { const rw = box.querySelector('.ddrow'), card = ['--panel', '--panel-2'].map(k => String(pw.getComputedStyle(pd.documentElement).getPropertyValue(k) || '').trim());
          for (const cbg of card) for (const el of [rw.querySelector('.ddunit'), rw.querySelector('.ddsn'), rw.querySelector('.ddsep'), rw.querySelector('.ddrk')]) { const r = ratio(cbg, val(el, 'color'));
            if (!(r >= 4.5)) bad.push(`a matchup row's ${el.className} reads ${r.toFixed(2)}:1 (${cbg} under ${val(el, 'color')})`); } }
        { const ub = box.querySelector('.gs-ubox.gs-better'), card = String(pw.getComputedStyle(pd.documentElement).getPropertyValue('--panel-2') || '').trim(), ubg = over(val(ub, 'background-color'), card);
          for (const el of [ub.querySelector('.gs-lab'), ub.querySelector('.gs-urank'), ub.querySelector('.gs-urank small'), ub.querySelector('.gs-ush b'), ub.querySelector('.gs-utier')]) { const r = ratio(ubg, val(el, 'color'));
            if (!(r >= 4.5)) bad.push(`the better rank's box: its ${el.className || el.tagName} reads ${r.toFixed(2)}:1 (${ubg} under ${val(el, 'color')})`); } }
        chk(bad.length === 0, `${name}: a Game snapshot tag, the preview's text, a matchup side or the better rank's box is under 4.5:1 on its own background: ${bad.join('; ')}`);
        pw.close(); } } }
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
  const PAYLOAD = JSON.parse(PAYLOAD_TXT);
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
  /* a final is "X won 24-16", or "Tie 27-27" when it ended level (NYG at WAS, week 5 of 2026) */
  const done = cards.filter(c => / won |^Tie \d/.test(txt(c.querySelector('.pk-result')))).length;
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

  /* a game's row is a button to its Game snapshot (since 14 October 2026; it opened in place on two
     buttons before): Tab reaches it, it says it opens a window, and nothing is open until one is tapped */
  chk(cards.length > 0 && cards.every(c => c.getAttribute('role') === 'button' && c.getAttribute('tabindex') === '0' && c.getAttribute('aria-haspopup') === 'dialog' && !c.hasAttribute('aria-expanded')),
    'a game\'s row is not a button to a window that Tab reaches (role button, tabindex 0, aria-haspopup dialog, no aria-expanded)');
  chk(!d.querySelector('.pk-gbody, #pkBoard button[data-snap], #pkBoard button[data-props-game]') && (!d.getElementById('gsModal') || d.getElementById('gsModal').hidden),
    'a game was open before anything was tapped, or a row still opens in place on buttons');

  /* tap one: its Game snapshot, whose first button is the game's own page on the Props tab, where its
     game bets are (app v105, the owner's call of 14 October 2026), where the Props tab can open it */
  const first = cards[0];
  first.click();
  await wait(120);
  const gsm = () => d.getElementById('gsModal');
  chk(!!gsm() && !gsm().hidden && new RegExp(`${gameOf(first).away_team}.*${gameOf(first).home_team}`).test(txt(d.getElementById('gsTitle'))), 'tapping a game did not open its Game snapshot');
  chk(!first.querySelector('.pk-gbody, .gbets, input[data-leg], table, .pk-lines, .pk-tolegs') && !d.querySelector('#pkBoard input[data-leg]'), 'the tapped game opened in place on the board, or the board offers a line to tick');
  const pkRow = id => w.eval('S').sched.find(x => x.id === id);
  const pkCanOpen = id => { const r = pkRow(id); return !!r && w.eval('weekOpen')(+r.w); };
  const pbtn = gsm() && gsm().querySelector('#gsMatch button[data-gs-props]');
  chk(!!pbtn === pkCanOpen(first.dataset.game) && w.pkBoard.canProps(first.dataset.game) === pkCanOpen(first.dataset.game)
    && (!pbtn || (pbtn.dataset.gsProps === pkRow(first.dataset.game).id && /^Game bets and player props/.test(txt(pbtn)) && d.getElementById('gsMatch').firstElementChild.contains(pbtn))),
    `the Game snapshot ${pkCanOpen(first.dataset.game) ? 'has no button, first in it, to the game\'s page on the Props tab' : 'offers a page the Props tab cannot open'}`);
  /* the button stands alone, with no caption beside it (the owner wants less text): its name, which starts
     with the words it shows, and its title say it opens the game on the Props tab */
  chk(!pbtn || (pbtn.parentElement.childElementCount === 1 && !txt(pbtn.parentElement).replace(txt(pbtn), '') && !gsm().querySelector('.gs-propswhat')
      && /^Game bets and player props\b.*\bProps tab\b/.test(pbtn.getAttribute('aria-label') || '') && /\bon the Props tab\b/.test(pbtn.getAttribute('title') || '')),
    'the props button has a caption beside it, or its name and title do not say it opens the game on the Props tab: ' + (pbtn ? txt(pbtn.parentElement) + ' | ' + pbtn.getAttribute('aria-label') : ''));

  /* the button closes the snapshot and opens the game's page on the Props tab, on its week, with the
     Game bets card brought into view (it follows the game's suggested parlays) */
  const gbView = () => d.getElementById('gameView'), gbCard = () => gbView().querySelector('.gbets');
  const gbPage = async id => { w.eval(`S.ui.game=${JSON.stringify(id)};S.ui.open={};renderGame()`); await wait(60); };
  if (pbtn) {
    const into = [], siv = w.Element.prototype.scrollIntoView;
    w.Element.prototype.scrollIntoView = function (o) { into.push(this); if (siv) try { siv.call(this, o); } catch (e) { /* jsdom */ } };
    pbtn.click();
    await wait(120);
    w.Element.prototype.scrollIntoView = siv;
    chk(gsm().hidden, 'the Game snapshot\'s props button did not close the window');
    chk(!d.getElementById('tab-slate').hidden && d.getElementById('tab-pickems').hidden && w.location.hash === '#slate', 'the button did not open the Props tab: ' + w.location.hash);
    chk(!d.getElementById('gameModal').hidden && w.eval('S').ui.game === first.dataset.game && +d.getElementById('weekSel').value === +pkRow(first.dataset.game).w,
      'the button did not open the game\'s own page on its week');
    chk(!!gbCard() && /Game bets/.test(txt(gbCard().querySelector('h2'))), 'the game\'s page on the Props tab has no Game bets card');
    chk(into.some(el => el === gbCard()), 'the button did not bring the game\'s Game bets card into view');
  } else if (gsm() && !gsm().hidden) w.gameSnapshotClose(false);
  /* the card on the game's page: both sides priced by the prop model, off its own state */
  const gbRows = () => (gbCard() ? [...gbCard().querySelectorAll('tr')] : []);
  const teamLines = id => { const r = pkRow(id); return r && w.gameBet(r, r.h, 'ats') ? 4 : 2; };
  const hasTot = w.eval('typeof totalBet') === 'function' && w.eval('typeof totalBook') === 'function';
  chk(hasTot, 'the prop model prices no game total (no totalBet or totalBook)');
  const totLines = id => { const r = pkRow(id); return hasTot && r && w.eval('totalBet')(r, 'over') ? 2 : 0; };
  const nLines = id => teamLines(id) + totLines(id);
  const started = gid => w.eval('gameStarted')(pkRow(gid));
  const gid = first.dataset.game, row = pkRow(gid);
  if (row) {
    await gbPage(gid);
    const rows = gbRows(), gb = gbCard();
    chk(!!gb && d.querySelectorAll('#gameView .gbets').length === 1, 'the game\'s page does not carry the Game bets card once');
    /* to win for both sides, and to cover for both where the prop model has a spread (a game whose
       spread is not posted yet offers the money line alone, and says so), and the game total over
       and under where a total is posted */
    const firstLines = teamLines(gid);
    chk(rows.length === nLines(gid), `expected ${firstLines === 4 ? 'to win and to cover' : 'to win'} for both sides${totLines(gid) ? ' and the total' : ''}, got ${rows.length} row(s): ${gb ? txt(gb) : ''}`);
    chk(rows.filter(r => /To win/.test(txt(r))).length === 2, 'both sides should have a to-win price');
    chk(rows.filter(r => /To cover/.test(txt(r))).length === firstLines - 2, 'both sides should have a to-cover price where there is a spread, and none where there is not');
    chk(firstLines === 4 || /No spread posted yet/.test(txt(gb)), 'a game with no spread does not say why it offers the money line alone');
    const pcts = rows.filter(r => /To win/.test(txt(r))).map(r => parseInt(txt(r.querySelector('.pct')), 10));
    chk(Math.abs(pcts[0] + pcts[1] - 100) <= 1, `the two win chances do not add up: ${pcts.join(' + ')}`);
    chk(rows.filter(r => /To win|To cover/.test(txt(r))).every(r => /[-+]\d+est\./.test(txt(r).replace(/\s/g, ''))), 'a row is missing our own price');
    /* the total: over and under on the posted number, the chances summing to one, a price on each
       (the book's where the payload has one, -110 est. where it has none, and saying so) */
    { const tr = rows.filter(r => /^(Over|Under) [\d.]+/.test(txt(r.querySelector('.thr'))));
      if (totLines(gid)) {
        const tp = tr.map(r => parseInt(txt(r.querySelector('.pct')), 10)), real = w.eval('totalBook')(row, 'over') != null;
        chk(tr.length === 2 && Math.abs(tp[0] + tp[1] - 100) <= 1 && tr.every(r => txt(r.querySelector('.thr')).endsWith(String(row.tot))), 'the game total is not offered over and under on the posted total: ' + tr.map(txt).join(' / '));
        chk(real ? tr.every(r => /^[-+]\d+$/.test(txt(r.querySelector('.book')))) : (tr.every(r => /^-110est\.$/.test(txt(r.querySelector('.est')).replace(/\s/g, ''))) && /the -110 is an estimate/.test(txt(gb))),
          'the game total does not carry the book\'s price, or -110 marked est. with a note when there is none: ' + tr.map(txt).join(' / '));
        /* its chance is the market's own (props/research/totals/): the over and under prices with the
           margin out, 50% without both; the model's points are a display beside the line, not the chance */
        const imp = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100), has = v => v != null && isFinite(v) && v !== 0;
        const nv = has(row.tov) && has(row.tou) ? imp(row.tov) / (imp(row.tov) + imp(row.tou)) : 0.5;
        const head = txt([...gb.querySelectorAll('.statblk h4')].find(h => /^Game total/.test(txt(h))) || { textContent: '' });
        chk(tp[0] === Math.round(nv * 100) && tp[1] === Math.round((1 - nv) * 100) && head.includes(`model's points ${w.eval('modelTotal')(row).toFixed(1)}`) && head.includes(`book line ${row.tot}`)
          && /The total's chance is the book's own/.test(txt(gb)),
          `the game total is not at the market's chance (${Math.round(nv * 100)}%) with the model's points shown as a display: ${head} / ${tp.join('% ')}%`); }
      else chk(!tr.length, 'a game with no total posted offers one'); }
    /* the same game priced by the prop model's own gameBet, on the same row */
    const own = w.gameBet(row, row.a, 'ml');
    chk(own && Math.round(own.p * 100) === pcts[0], `the card's away win chance ${pcts[0]} is not the prop model's ${own && Math.round(own.p * 100)}`);
  }

  /* a line on a game that has not kicked off can be ticked onto the prop model's parlay from its page */
  const openId = cards.map(c => c.dataset.game).find(id => pkRow(id) && !started(id));
  if (openId) {
    await gbPage(openId);
    const boxes = [...gbCard().querySelectorAll('input[data-leg]')];
    chk(boxes.length === nLines(openId) && boxes.every(b => !b.checked), `a game not yet kicked off should offer ${nLines(openId)} unticked lines, got ${boxes.length}`);
    chk(/Tick one and it joins the parlay/.test(txt(gbCard())), 'the card does not say a tick joins the parlay');
    const key = boxes[0].dataset.leg;
    boxes[0].click();
    await wait(60);
    const leg = w.eval('S').parlay[key];
    chk(!!leg && leg.grp === 'TEAM' && leg.stat === 'ml' && leg.label === 'To win', 'ticking To win did not put a team leg on the parlay: ' + JSON.stringify(leg));
    const box2 = gbCard().querySelector(`input[data-leg="${key}"]`);
    chk(box2 && box2.checked && box2.closest('tr').classList.contains('on'), 'the ticked row does not show as on');
    chk(/1-leg parlay/.test(txt(d.getElementById('parlayBody'))) && txt(d.getElementById('parlayBody')).includes(leg.name), 'the Parlay Builder does not show the leg in the builder');
    /* the total ticks the same way, one side at a time: the other side comes off */
    { const ov = gbCard().querySelector('input[data-leg$="|game|total"][data-side="over"]');
      if (ov) { const tk = ov.dataset.leg; ov.click(); await wait(60);
        gbCard().querySelector('input[data-leg$="|game|total"][data-side="under"]').click(); await wait(60);
        const tl = w.eval('S').parlay[tk];
        chk(!!tl && tl.stat === 'total' && tl.side === 'under' && !gbCard().querySelector('input[data-leg$="|game|total"][data-side="over"]').checked
          && gbCard().querySelector('input[data-leg$="|game|total"][data-side="under"]').checked && /Under [\d.]+ points/.test(txt(d.getElementById('parlayBody'))),
          'ticking the total\'s under did not take the over\'s place, or is not shown');
        gbCard().querySelector('input[data-leg$="|game|total"][data-side="under"]').click(); await wait(60);
        chk(!w.eval('S').parlay[tk], 'unticking the total did not take it off the parlay'); } }
    /* the page was drawn again by each tick: the row is found afresh */
    gbCard().querySelector(`input[data-leg="${key}"]`).click();
    await wait(60);
    chk(!w.eval('S').parlay[key], 'unticking did not take the leg off the parlay');
    chk(/Parlay Builder/.test(txt(d.getElementById('parlayBody'))), 'the builder still shows a parlay after unticking');
    /* a team line far off the market is flagged on the card: the model's side to win priced so the
       book's fair chance on it is 25 points under the model's */
    { const r = pkRow(openId), keep = [r.mla, r.mlh], toML = w.eval('probToAmerican');
      const bet = t => w.gameBet(r, t, 'ml'), fav = bet(r.h).p >= bet(r.a).p ? r.h : r.a, p = bet(fav).p, f = Math.max(0.05, p - 0.25);
      const own = toML(f * 1.03), oth = toML((1 - f) * 1.03), imp = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100), fair = imp(own) / (imp(own) + imp(oth));
      if (fav === r.h) { r.mlh = own; r.mla = oth; } else { r.mla = own; r.mlh = oth; }
      await gbPage(openId);
      const notes = [...gbCard().querySelectorAll('p.faroff[data-far]')].map(txt), want = `To win model ${Math.round(p * 100)}% · market ${Math.round(fair * 100)}%: far off the market`;
      chk(notes.includes(want) && gbCard().querySelectorAll('tr.far').length === notes.length, `the Game bets card does not flag a far-off to win as "${want}": ${notes.join(' / ') || 'no flag'}`);
      r.mla = keep[0]; r.mlh = keep[1]; await gbPage(openId); }
  } else chk(cards.every(c => !pkRow(c.dataset.game) || started(c.dataset.game)), 'no game offered lines although one has not kicked off');
  /* a game that kicked off: no boxes, a tick or a cross on every line once the score is in */
  const lockedId = cards.map(c => c.dataset.game).find(id => pkRow(id) && started(id));
  if (lockedId) {
    await gbPage(lockedId);
    chk(!gbCard().querySelector('input[data-leg]') && /How each side did/.test(txt(gbCard())), 'a game that kicked off still offers lines');
    const scored = w.eval('hasScore')(pkRow(lockedId));
    const marks = [...gbCard().querySelectorAll('td.pick .res')];
    chk(marks.length === nLines(lockedId), `a kicked-off game should mark ${nLines(lockedId)} lines, got ${marks.length}`);
    if (scored) chk(marks.every(m => /win|loss/.test(m.className) || /push/.test(txt(m))) && gbCard().querySelectorAll('tr.hit, tr.miss').length >= 2, 'a game with a score is not marked won or lost line by line');
    else chk(marks.every(m => txt(m) === '–'), 'a game without a score should show dashes, not results');
  }
  /* back to the board as it was */
  w.closeGame(); await wait(40);
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'pickems').click();
  await wait(60);

  /* Enter and Space on a focused row open its snapshot too, and Escape hands the focus back to the row;
     a redraw of the board (a scoreboard read, a new week) never opens a window, and a window open
     across one hands the focus to the same game's new row */
  { const row0 = () => d.querySelector(`.pk-game[data-game="${first.dataset.game}"]`), bad = [];
    const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const esc = async () => { key(d.activeElement || d.body, 'Escape'); await wait(30); };
    const keyup = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
    for (const k of ['Enter', ' ']) {
      /* Space opens as it comes up, as a button's does: not on its way down */
      row0().focus(); key(row0(), k);
      if (k === ' ') { await wait(40); if (gsm() && !gsm().hidden) bad.push('Space opened the window on its way down, so its way up would click Close'); keyup(row0(), k); }
      await wait(80);
      if (!gsm() || gsm().hidden) bad.push(`${k === ' ' ? 'Space' : k} on a focused row did not open its snapshot`);
      await esc();
      if (!gsm().hidden || d.activeElement !== row0()) bad.push(`Escape after ${k === ' ' ? 'Space' : k} did not close the window and hand the focus back to the row`); }
    d.getElementById('pkNow').click(); await wait(250);
    if (!gsm().hidden) bad.push('a scoreboard read opened a window');
    { const sel = d.getElementById('pkWeek'), was = sel.value, other = [...sel.options].find(o => o.value !== was);
      if (other) { sel.value = other.value; sel.dispatchEvent(new w.Event('change')); await wait(40); sel.value = was; sel.dispatchEvent(new w.Event('change')); await wait(40); }
      if (!gsm().hidden) bad.push('a new week on the board opened a window'); }
    row0().focus(); row0().click(); await wait(80);
    const before = row0();
    d.getElementById('pkNow').click(); await wait(250);
    if (gsm().hidden) bad.push('a scoreboard read closed the open window');
    d.getElementById('gsClose').click(); await wait(30);
    if (!row0() || row0() === before || d.activeElement !== row0()) bad.push('closed after the board was redrawn, the window did not hand the focus to the game\'s new row');
    chk(bad.length === 0, 'the board\'s rows do not open the Game snapshot as buttons do: ' + bad.join('; ')); }
  cards = [...d.querySelectorAll('.pk-game')];

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
  /* a game's page carries its Game bets card (app v105), once */
  chk(d.querySelectorAll('#gameView .gbets').length === 1, 'the game view does not carry the Game bets card once');
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
  /* "the likeliest" worked out in full: where no two legs that could share a parlay move together
     (different games, or a game's side and its total), every parlay's chance is a plain product, so every
     parlay of a likeliest tier's size with as many thin legs is worked with parlayProb and none may
     land likelier. That holds whatever the legs are priced at, so a fallback chosen by any other
     measure (the best return under the floor, say) fails it on the week's own picks. Bounded, so
     a long list never stalls the smoke */
  const fitsF = hasPb ? w.eval('pbFits') : null, orderF = hasPb ? w.eval('pbOrder') : null, rhoF = hasPb ? w.eval('legRho') : null, ppF = hasPb ? w.eval('parlayProb') : null, LIKELY_CAP = 250000;
  const noMovers = list => list.every((a, i) => list.slice(i + 1).every(b => !fitsF([a], b) || Math.abs(rhoF(a, b)) < 0.03));
  const likeliestOf = (list, n, thin) => { let best = -1, legs = null, seen = 0;
    const rec = (i0, cur, th) => { if (seen > LIKELY_CAP) return;
      if (cur.length === n) { if (th !== thin) return; seen++; const pr = ppF(orderF(cur)).corr; if (pr > best) { best = pr; legs = cur.slice(); } return; }
      for (let i = i0; i < list.length; i++) { const c = list[i], th2 = th + (c.thin ? 1 : 0); if (th2 > thin || !fitsF(cur, c)) continue; cur.push(c); rec(i + 1, cur, th2); cur.pop(); } };
    rec(0, [], 0); return seen > LIKELY_CAP || !legs ? null : { best, legs, seen }; };
  /* the panel holds on whatever the week offers: the mix sets the boxes, every tier is its legs or says
     why, and every leg is of a ticked kind and game, has not kicked off and is never rated below the book */
  if (hasPb) { const Sx = w.eval('S'), games = w.eval('pbGames()'), U = () => Sx.ui.pb, KINDS = ['ml', 'ats', 'total', 'over', 'under'];
    const kindOf = w.eval('pbKind'), mlProb = w.eval('mlProb'), isG = w.eval('isGameLeg'), started = w.eval('gameStarted');
    /* the legs the picks make, and the most a parlay can take of them (one a player, one side and one total a game) */
    const maxLegs = () => { const u = U(), on = games.filter(g => !u.off.includes(g.id));
      if (!on.length || !KINDS.some(k => u.k[k])) return 0; const p = w.eval('pbPool')(on); return w.eval('pbMaxLegs')([...p.pref, ...p.thin, ...(p.mkt || [])]); };
    /* what a card's rule says it is: Safe the likeliest pair, a level over its floor its best
       return, a level none of whose parlays reaches its floor the likeliest of its size */
    const ruleFor = t => t.likeliest ? `the likeliest ${t.n} legs` : t.floor ? `best return that lands ${Math.round(t.floor * 100)}%+ by the model` : 'the likeliest pair';
    const provedLikeliest = (lab, t, list) => { if (!noMovers(list)) return; const b = likeliestOf(list, t.n, t.thin); if (!b) return;
      chk(t.corr >= b.best - 1e-12, `${lab}: the ${t.id} tier, "${ruleFor(t)}", lands ${(t.corr * 100).toFixed(2)}% (${t.legs.map(l => l.name + ' ' + l.label).join(', ')}) where ${orderF(b.legs).map(l => l.name + ' ' + l.label).join(', ')} land ${(b.best * 100).toFixed(2)}% with as many thin legs (${b.seen} parlays of ${t.n} worked)`); };
    const hold = lab => { const r = w.eval('getPbTiers()'), u = U(), m = maxLegs(); let built = 0;
      const on = games.filter(g => !u.off.includes(g.id)), pool = on.length && KINDS.some(k => u.k[k]) ? w.eval('pbPool')(on) : { pref: [], thin: [] };
      chk(r.tiers.map(t => t.id + t.n).join() === 'safe2,med3,aggr4,xtrm5', `${lab}: the tiers are not Safe 2, Medium 3, Aggressive 4, Extreme 5`);
      for (const t of r.tiers) {
        /* every level shows a parlay of its size whenever the picks make that many legs */
        if (!t.legs) { chk(typeof t.why === 'string' && t.why.length > 10 && m < t.n && !/of the time or more/.test(t.why), `${lab}: the ${t.id} tier is empty though the picks make ${m} legs for its ${t.n}, or says nothing: ${t.why}`); continue; }
        built++;
        chk(t.legs.length === t.n && new Set(t.legs.map(l => l.key)).size === t.n, `${lab}: the ${t.id} tier is not ${t.n} different lines`);
        chk(t.legs.every(l => u.k[kindOf(l)] && !u.off.includes(l.gid) && games.some(g => g.id === l.gid) && !started(Sx.sched.find(g => g.id === l.gid))),
          `${lab}: the ${t.id} tier has a leg of a kind or a game not ticked, or one that has kicked off`);
        chk(t.legs.every(l => takenRule(w)(l) && (l.market || l.p >= mlProb(l.price)) && l.p >= 0.45 && l.p < 0.97), `${lab}: the ${t.id} tier has a leg with no real price (nor the rule's own from DraftKings' line on ESPN, on a kind it may take) or rated below the book`);
        /* a total only as a market leg, marked no edge, and only where the legs with an edge cannot make the level */
        chk(t.legs.every(l => (l.stat === 'total') === !!l.market) && (t.mkt || 0) === t.legs.filter(l => l.market).length
          && (!t.mkt || w.eval('pbTier')(w.eval('PB_TIERS').find(s => s[0] === t.id), { pref: pool.pref, thin: pool.thin, mkt: [] }, new Map()) === null),
          `${lab}: the ${t.id} tier holds a total that is not a market leg, or took one where the legs with an edge make the level`);
        { const sd = t.legs.filter(l => isG(l) && l.stat !== 'total'), tt = t.legs.filter(l => l.stat === 'total'), pl = t.legs.filter(l => !isG(l));
          chk(new Set(sd.map(l => l.gid)).size === sd.length && new Set(tt.map(l => l.gid)).size === tt.length && new Set(pl.map(l => l.pid)).size === pl.length,
            `${lab}: the ${t.id} tier has two sides or two totals on one game, or two legs on one player`); }
        chk(w.eval('parlayProb')(t.legs).corr === t.corr && w.eval('parlayDec')(t.legs.map(l => ({ leg: l, ml: l.price }))) === t.dec && (!t.floor || t.likeliest || t.corr >= t.floor) && (!t.likeliest || t.floor > 0),
          `${lab}: the ${t.id} tier's chance or price is not the builder's sum, or it is under its floor without being the likeliest of its size`);
        /* its fair chance is parlayProb on its legs at the rule's fair chances, and no leg on it is one the
           model rates FAR_OFF or more above its fair chance */
        { const fo = fairRule(w), fs = t.legs.map(fo), FAR = w.eval('FAR_OFF');
          chk(fs.every(Boolean) ? (!!t.fair && t.fair.p != null && Math.abs(t.fair.p - w.eval('parlayProb')(t.legs.map((l, i) => ({ ...l, p: fs[i].p }))).corr) < 1e-9 && t.fair.est === fs.some(f => f.est)) : (!!t.fair && t.fair.p === null),
            `${lab}: the ${t.id} tier's fair chance ${t.fair && t.fair.p} is not parlayProb on its legs at their fair chances`);
          chk(t.legs.every((l, i) => !fs[i] || l.p - fs[i].p < FAR - 1e-9), `${lab}: the ${t.id} tier has a leg far off the market: ` + t.legs.filter((l, i) => fs[i] && l.p - fs[i].p >= FAR - 1e-9).map(l => l.name + ' ' + l.label).join(', ')); }
        /* Safe's likeliest pair and a level's likeliest of its size, worked out in full where every parlay is a plain product */
        if ((t.likeliest || !t.floor) && !t.mkt) provedLikeliest(lab, t, [...pool.pref, ...pool.thin]);
        /* a level with totals takes exactly as many as the legs with an edge leave to fill */
        if (t.mkt) chk(t.mkt === Math.max(0, t.n - w.eval('pbMaxLegs')([...pool.pref, ...pool.thin])), `${lab}: the ${t.id} tier takes ${t.mkt} totals where the legs with an edge leave fewer to fill`);
        const card = d.querySelector(`#pbPanel .pb-tier.${t.id}`);
        chk(!!card && card.querySelectorAll('.pb-legs li').length === t.n && !!card.querySelector(`[data-pb-add="${t.id}"]`) && !!card.querySelector(`[data-pc-finish="pb|${t.id}"]`),
          `${lab}: the ${t.id} card does not show its legs with Add to builder and Finish`);
        /* it leads with the fair chance, labelled so (est. where it is), "model says" beside it; with none, the model's and why */
        if (card) { const first = card.querySelector('.pb-nums > div'), q = x => first && first.querySelector(x), F = t.fair, pc = v => (v * 100).toFixed(0) + '%';
          chk(!!first && first.classList.contains('pb-chance') && (F && F.p != null
            ? txt(q('b')) === pc(F.p) && txt(q('span')) === (F.est ? 'fair chance, est.' : 'fair chance') && txt(q('small')) === `model says ${pc(t.corr)}`
            : txt(q('b')) === pc(t.corr) && txt(q('small')) === 'no fair chance: a leg has no book price'),
            `${lab}: the ${t.id} card does not lead with its fair chance${F && F.p != null ? ' ' + pc(F.p) : ''} beside the model's ${pc(t.corr)}: ${first ? txt(first) : 'no figures'}`); }
        /* its rule says what it is, and nothing else on it speaks of the floor: the chance and the price */
        if (card) { const rule = card.querySelector('.pb-rule'), rest = card.cloneNode(true); rest.querySelectorAll('.pb-legs, .pb-thin, .pb-rule').forEach(x => x.remove());
          chk(!!rule && txt(rule) === ruleFor(t) && ![...card.querySelectorAll('p')].some(p => !p.classList.contains('pb-thin')) && !/floor|usual|below|short of|of the time|%\+(?!\d)/i.test(txt(rest)),
            `${lab}: the ${t.id} card's rule reads "${rule ? txt(rule) : ''}", not "${ruleFor(t)}", or it carries a note: ${txt(rest).slice(0, 140)}`); } }
      /* with Game total ticked, one line says what a total in a tier is (and only then) */
      chk(txt(panel).includes('Game totals have no edge: each is priced at the book’s own chance, so a level takes one only where the legs with an edge on your picks cannot make a parlay of its size, and marks it no edge.') === !!u.k.total,
        `${lab}: ${u.k.total ? 'Game total is ticked and the panel does not say a total has no edge and only fills' : 'Game total is not ticked and the panel still speaks of totals'}`);
      return built; };
    if (!games.length) chk(/no game is left|nothing left to build from/.test(txt(panel)), 'with no game to come the panel does not say so: ' + txt(panel).slice(0, 160));
    else {
      chk(d.querySelectorAll('#pbPanel [data-pb-game]').length === games.length && games.every(g => !started(g)), 'the panel\'s games are not this week\'s still to kick off');
      for (const [m, ks] of [['teams', ['ml', 'ats', 'total']], ['players', ['over', 'under']], ['all', KINDS]]) {
        d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).click(); await wait(20);
        chk(KINDS.every(k => U().k[k] === ks.includes(k)) && d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).getAttribute('aria-pressed') === 'true', `the ${m} mix did not set its boxes`);
        hold('this week, ' + m); }
      /* a box by hand that makes none of the mixes lights no mix, and there is no Custom tag (the
         boxes say what is ticked); the choice is the browser's own, saved with the prop model's state */
      const noMix = () => !d.querySelector('#pbPanel [data-pb-mix].on') && !d.querySelector('#pbPanel [data-pb-mix][aria-pressed="true"]') && !d.querySelector('#pbPanel .pb-custom') && !/\bCustom\b/.test(txt(panel));
      { const cb = d.querySelector('#pbPanel [data-pb-kind="ml"]'); cb.click(); await wait(20);
        chk(U().k.ml === false && noMix(), 'unticking Moneyline under All leaves a mix lit or shows a Custom tag');
        await wait(400);
        chk(JSON.parse(w.localStorage.getItem(PROP_KEY)).ui.pb.k.ml === false, 'the bet types are not saved in the browser with the prop model\'s state');
        d.querySelector('#pbPanel [data-pb-kind="ml"]').click(); await wait(20); }
      /* Spread alone, as the owner ticked it: no mix lit, no Custom tag, and every level that the
         week's spreads make enough legs for shows a parlay (the likeliest of its size where none
         reaches its floor) */
      { d.querySelector('#pbPanel [data-pb-mix="all"]').click(); await wait(20);
        for (const k of ['ml', 'total', 'over', 'under']) { d.querySelector(`#pbPanel [data-pb-kind="${k}"]`).click(); await wait(20); }
        chk(KINDS.every(k => U().k[k] === (k === 'ats')) && [...d.querySelectorAll('#pbPanel [data-pb-kind]')].every(cb => cb.checked === (cb.dataset.pbKind === 'ats')) && noMix(),
          'Spread alone, ticked by hand, leaves another box ticked, a mix lit or a Custom tag beside the mix switch');
        hold('this week, Spread only');
        /* and Moneyline alone: another pick where a level may fall back to the likeliest of its size */
        d.querySelector('#pbPanel [data-pb-kind="ats"]').click(); await wait(20); d.querySelector('#pbPanel [data-pb-kind="ml"]').click(); await wait(20);
        chk(KINDS.every(k => U().k[k] === (k === 'ml')) && noMix(), 'Moneyline alone, ticked by hand, leaves another box ticked, a mix lit or a Custom tag');
        hold('this week, Moneyline only');
        d.querySelector('#pbPanel [data-pb-mix="all"]').click(); await wait(20); }
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
      w.eval(`(function(){ const cw=currentWeek(), M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{}); let J=0;
        pbGames().forEach((g,gi)=>{ if(gi%2===0){ g.tov=-105; g.tou=-115; }
          const ro=rosterFor(g,false); for(const tm in ro) ro[tm].players.forEach((x,i)=>{ if(!x.starter) return;
            for(const l of statLines(x)){ if(l.prob||!(l.mu>2)) continue;
              /* one line in three priced so the book's fair chance on the model's side is 25 points under the
                 model's (far off the market), one 6 points under (an edge), the rest -112/-108 */
              const ln=(i%2?Math.floor(l.mu*1.25):Math.floor(l.mu*0.8))+0.5, kind=(J++)%3; let over=-112, under=-108;
              if(kind<2){ const pO=pOver(x.pl.grp,l.stat,l.mu,ln), ov=pO>=0.5, ps=ov?pO:1-pO, fs=Math.max(0.05,Math.min(0.9,ps-(kind===0?0.25:0.06))), fo=ov?fs:1-fs;
                over=probToAmerican(fo*1.03); under=probToAmerican((1-fo)*1.03); }
              ((M[x.pl.id]??={})[l.stat])={line:ln,over,under,n:x.pl.n,g:g.id}; } }); });
        PB_CACHE=new Map(); renderParlay(); })()`);
      await wait(60);
      const built = hold('made-up lines');
      chk(built >= 2, 'with a made-up line on every starter, fewer than two tiers were built');
      /* far off the market: the legs the model rates 15 points or more above their fair chance are out of
         the pool and every level, the panel says how many and why, and one is flagged on its game page */
      { const fo = fairRule(w), FAR = w.eval('FAR_OFF'), isFar = l => { const f = fo(l); return !!f && l.p - f.p >= FAR - 1e-9; };
        const on = w.eval('pbGames()'), pool = w.eval('pbPool')(on), mlP = w.eval('mlProb');
        const left = w.eval('pricedLegs')(on).filter(c => w.eval('pbAllows')(c) && takenRule(w)(c) && c.p >= 0.45 && c.p < 0.97 && c.p - mlP(c.price) >= 0 && isFar(c));
        chk(left.length > 0 && pool.far === left.length && [...pool.pref, ...pool.thin].every(c => !isFar(c)) && [...pool.pref, ...pool.thin].some(c => !isG(c)),
          `the made-up lines left ${left.length} legs far off the market where the pool counts ${pool.far}, or one is in the pool, or no player leg is left in it`);
        chk(txt(panel).includes(`${left.length} leg${left.length === 1 ? ' is' : 's are'} left out: the model rates ${left.length === 1 ? 'it' : 'each'} 15 points or more above the book’s fair chance`) && /still on the game pages, flagged far off the market/.test(txt(panel)),
          'the panel does not say how many legs it left out far off the market and why: ' + ((txt(panel).match(/\d+ legs? (is|are) left out[^.]*\./) || ['nothing'])[0]));
        const farL = w.eval('pricedLegs')(on).filter(l => l.main && !isG(l) && isFar(l)).sort((a, b) => String(a.key + a.side).localeCompare(String(b.key + b.side)))[0];
        if (farL) { const keepUi = w.eval('JSON.stringify({game:S.ui.game,open:S.ui.open,rungs:S.ui.showRungs})');
          w.eval(`S.ui.showRungs=false; S.ui.game=${JSON.stringify(farL.gid)}; S.ui.open={[${JSON.stringify(farL.pid)}]:true}; renderGame()`); await wait(20);
          const f = fo(farL), want = `${farL.side === 'under' ? 'Under' : 'Over'} ${farL.k} model ${Math.round(farL.p * 100)}% · market ${Math.round(f.p * 100)}%: far off the market`;
          const notes = [...d.querySelectorAll('#gameView p.faroff[data-far]')].map(txt);
          chk(notes.includes(want) && !!d.querySelector('#gameView tr.far'), `the game page does not flag ${farL.name}'s far-off line as "${want}": ${notes.join(' / ') || 'no flag'}`);
          w.eval(`(function(){ const k=${keepUi}; S.ui.game=k.game; S.ui.open=k.open||{}; S.ui.showRungs=k.rungs; closeGameModal(); })()`); await wait(20); } }
      /* Game total alone, as the owner ticked it: every level the priced totals make legs for is
         built of totals only, each marked no edge, and its card says why they are there */
      { const keepK = JSON.stringify(U().k); for (const k of KINDS) U().k[k] = k === 'total'; w.eval('PB_CACHE=new Map(); renderParlay()'); await wait(40);
        const nT = new Set(w.eval('pbPool(pbGames())').mkt.map(l => l.gid)).size, rT = w.eval('getPbTiers()');
        hold('made-up lines, Game total alone');
        chk((nT >= 2 || games.length < 3) && rT.tiers.every(x => x.n > nT ? !x.legs : (!!x.legs && x.legs.every(l => l.market && l.stat === 'total') && x.mkt === x.n)),
          `with only Game total ticked, a level the totals make legs for was not built of totals alone (${nT} totals priced): ` + rT.tiers.map(x => x.why || x.legs.map(l => l.label).join('+')).join(' / '));
        for (const x of rT.tiers.filter(x => x.legs)) { const c = d.querySelector(`#pbPanel .pb-tier.${x.id}`);
          chk(!!c && [...c.querySelectorAll('.pb-legs li')].every(li => /no edge/i.test(txt(li))) && /because your picks do not make a parlay of this size from legs with an edge/.test(txt(c)),
            `the ${x.id} card does not mark its totals no edge or say why they are there`); }
        Object.assign(U().k, JSON.parse(keepK)); w.eval('PB_CACHE=new Map(); renderParlay()'); await wait(40); }
      /* lock a leg and ask for new legs on the page: the lock holds, the card draws the turned legs,
         and Finish opens the parlay card on them, not on the panel's own */
      { const T = w.eval('getPbTiers()').tiers.find(x => x.legs && x.n >= 3);
        chk(!!T, 'with made-up lines no level of three legs or more to lock a leg on');
        if (T) { const idOf = w.eval('pbId'), lid = idOf(T.legs[0]), cardOf = () => d.querySelector(`#pbPanel .pb-tier.${T.id}`);
          cardOf().querySelector(`[data-pb-lock="${T.id}|${lid}"]`).click(); await wait(20);
          chk(cardOf().querySelector(`[data-pb-lock="${T.id}|${lid}"]`).getAttribute('aria-pressed') === 'true', 'the lock on the page did not take');
          cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click(); await wait(20);
          const x = w.eval(`pbShownTier('${T.id}')`);
          chk(!!x && !!x.legs && x.legs.some(l => idOf(l) === lid) && x.legs.map(idOf).join() !== T.legs.map(idOf).join() && x.legs.every(l => txt(cardOf()).includes(l.name)),
            'New legs on the page did not keep the locked leg, turn the rest, or draw them');
          /* the turned card says it is chosen from the legs left beside the lock */
          const rule = txt(cardOf().querySelector('.pb-rule'));
          chk(/ left .*beside your lock/.test(rule), `the turned card is ruled "${rule}", not on the legs left beside the lock`);
          if (x && x.legs) { d.querySelector(`#pbPanel [data-pc-finish="pb|${T.id}"]`).click(); await wait(40);
            const view = d.getElementById('pcView');
            chk(!d.getElementById('pcModal').hidden && x.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label)), 'Finish after New legs did not open the parlay card on the turned legs');
            w.eval('PARLAY_CARD.close()'); await wait(20); }
          /* None and then All is a change of picks: the turn and the lock are gone */
          d.querySelector('#pbPanel [data-pb-games="none"]').click(); await wait(20); d.querySelector('#pbPanel [data-pb-games="all"]').click(); await wait(20);
          chk(!cardOf().querySelector('[data-pb-lock][aria-pressed="true"]') && !cardOf().querySelector('[data-pb-reset]'), 'ticking None and then All on the page brought a lock or a turn back');
          w.eval('PB_VIEW={sig:null,t:{}}; renderParlay()'); await wait(20); } }
      const t = w.eval('getPbTiers()').tiers.filter(x => x.legs).slice(-1)[0];
      /* the Bet amount box, at the top of the panel's controls: an amount of the visitor's own,
         which every tier (the panel's four and the Elo picks') pays on as it is typed, which a bad
         entry does not move, and which is kept as the builder's stake is */
      const box = d.getElementById('pbStake'), stake0 = w.eval('S.stake');
      const tierOf = id => (/^elo/.test(id) ? ((typeof w.eloPicks === 'function' && w.eloPicks()) || { tiers: [] }) : w.eval('getPbTiers()')).tiers.find(x => x.id === id && x.legs);
      const paysAll = s => { const cards = [...d.querySelectorAll('#pbPanel [data-pb-tier]')];
        return cards.length > 0 && cards.every(c => { const tc = tierOf(c.dataset.pbTier), p = c.querySelector('[data-pb-pay]');
          return !!tc && !!p && +p.dataset.pbPay === tc.dec && txt(p.querySelector('b')) === money(s * tc.dec) && txt(p.querySelector('span')) === amtTxt(s) + ' pays'; }); };
      const paysTxt = () => [...d.querySelectorAll('#pbPanel .pb-nums div:last-child')].map(x => [...x.children].map(txt).join(' ')).join(' / ');
      chk(!!box && box.type === 'number' && box.getAttribute('inputmode') === 'decimal' && box.closest('.pb-row') === panel.querySelector('.pb-ctl > .pb-row') && box.value === String(stake0) && paysAll(stake0),
        'the suggested parlays have no Bet amount box at the top of their controls, showing the builder\'s stake that every tier pays on: ' + (box ? box.outerHTML : 'no box') + ' / ' + paysTxt());
      if (box) {
        box.value = '35'; box.dispatchEvent(new w.Event('input'));
        chk(w.eval('S.stake') === 35 && paysAll(35), 'typed $35 in the Bet amount box, the tiers do not pay $35 times their price: ' + paysTxt());
        box.dispatchEvent(new w.Event('change')); await wait(20);
        for (const bad of ['', '-3', '0']) { const b = d.getElementById('pbStake'); b.value = bad; b.dispatchEvent(new w.Event('input')); b.dispatchEvent(new w.Event('change')); await wait(10);
          chk(w.eval('S.stake') === 35 && d.getElementById('pbStake').value === '35' && paysAll(35) && !/NaN/.test(txt(panel) + txt(pb)), `"${bad}" in the Bet amount box moved the amount off $35, or drew NaN: ` + paysTxt()); }
        await wait(400);
        chk(JSON.parse(w.localStorage.getItem(PROP_KEY)).stake === 35, 'the Bet amount is not saved with the prop model\'s state'); }
      const AMT = box ? 35 : stake0;
      if (t) {
        /* Add to builder: exactly the tier's legs, and the builder prices them as the tier did, on the amount in the box */
        const keepP = w.eval('JSON.stringify(S.parlay)');
        d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`).click(); await wait(60);
        const P = w.eval('S').parlay, q = w.PARLAY_CARD.quote();
        chk(Object.keys(P).length === t.n && t.legs.every(l => P[l.key] && P[l.key].k === l.k && P[l.key].side === l.side) && q && Math.abs(q.pr.corr - t.corr) < 1e-12 && Math.abs(q.useDec - t.dec) < 1e-9,
          'Add to builder did not put exactly the tier\'s legs in the builder at the tier\'s chance and price');
        chk(!!q && q.stake === AMT && (d.getElementById('pStake') || {}).value === String(AMT) && Math.abs(q.payout - AMT * t.dec) < 1e-6 && txt(d.querySelector('#parlayBody .bigp .payout')) === '$' + (AMT * q.useDec).toFixed(2),
          `Add to builder did not carry the Bet amount: the builder is on ${q ? q.stake : 'nothing'} and pays ${q ? q.payout : '-'}, the tier ${money(AMT * t.dec)} on ${amtTxt(AMT)}`);
        chk(/In the builder/.test(txt(d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`))), 'the tier does not say it is in the builder');
        { const hero = d.querySelector('#parlayBody .bigp .hero'), F = q && q.fair;
          chk(!!hero && !!F && (F.p != null ? Math.abs(F.p - t.fair.p) < 1e-12 && txt(hero.querySelector('b')) === (F.p * 100).toFixed(1) + '%' && txt(hero.querySelector('small')) === `model says ${(t.corr * 100).toFixed(1)}%`
            : txt(hero.querySelector('small')) === "no fair chance: it needs every leg's book price"),
            'the builder\'s summary after Add to builder does not lead with the tier\'s fair chance, the model\'s beside it: ' + (hero ? txt(hero) : 'no summary')); }
        w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(40);
        /* the tier's legs given DraftKings ids, made up (its lines are made up too, so the payload's own
           ids could never match them): each under the key a leg of its kind has, worked out here on its
           own (dkKey), and the other side of each line, the other team and a rung's Under under a decoy,
           so a card that looked a leg up under the wrong side, team or point opens a decoy or nothing.
           Read an hour ago by the page's clock, so the card promises every leg */
        const keepDk = w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)');
        { const dk = {}, read = new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z';
          t.legs.forEach((l, i) => { const D = ((dk[String(l.week)] ??= {})[l.gid] ??= { at: read, glat: read });
            for (const k of dkDecoys(l, w)) if (!(k in D)) D[k] = 'DECOY' + i + '#' + k;
            const k = dkKey(l); if (k) D[k] = 'SMK' + i + '#' + k; });
          w.eval(`PAY.dk=${JSON.stringify(dk)}`); }
        /* Finish: the parlay card for the tier, on the amount in the box, saving nothing */
        const n0 = w.eval('S.saved.length'), keys0 = JSON.stringify(Object.keys(w.localStorage).sort());
        const fb = d.querySelector(`#pbPanel [data-pc-finish="pb|${t.id}"]`); fb.click(); await wait(40);
        const view = d.getElementById('pcView'), cash = [...view.querySelectorAll('.pc-money b')].map(txt).join(' | ');
        chk(!d.getElementById('pcModal').hidden && new RegExp(t.label + ' parlay', 'i').test(txt(view)) && t.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label))
          && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t.dec}))`).replace('-', '−')
          && txt(view.querySelector('.pc-chance')).startsWith(t.fair && t.fair.p != null ? `Fair chance all ${t.n} land ${pct1(t.fair.p)}${t.fair.est ? ' (est.)' : ''} model says ${pct1(t.corr)} · the price says ` : `Model’s chance all ${t.n} land ${pct1(t.corr)} · the price says `),
          `Finish on the ${t.label} tier does not open its card with its legs, price and chance: ` + txt(view).slice(0, 200));
        chk(cash === [money(AMT), money(AMT * t.dec), '+' + money(AMT * t.dec - AMT)].join(' | '),
          `Finish on the ${t.label} tier does not open its card on the Bet amount: ${cash} for ${amtTxt(AMT)} at ${t.dec}`);
        /* Open in DraftKings: every leg with a key (all but a 2+ touchdown rung, and a player's leg priced
           from DraftKings' line read on ESPN, which carries no id and goes on by hand) opens, on its own
           made-up id, in the card's order, joined by + with each '#' as %23, no decoy among them; the rest
           named under the buttons, a leg from ESPN's read saying its price is estimated and its id not
           read, and the note dated, saying what it opens as DraftKings had it then and promising no leg */
        { const DK = w.eval('PAY').dk || {}, onSlip = l => !!dkKey(l) && !(l.src === 'dkline' && !w.eval('isGameLeg')(l)), ids = t.legs.filter(onSlip).map(l => dkIdOf(DK, l)).filter(Boolean), a = d.getElementById('pcDk'), n = t.legs.filter(onSlip).length;
          const espnMiss = t.legs.map((l, i) => ({ l, i })).filter(({ l }) => l.src === 'dkline' && !w.eval('isGameLeg')(l));
          chk(espnMiss.every(({ l, i }) => { const li = d.querySelector(`#pcDkNote [data-pc-dkmiss="${i + 1}"]`); return !!li && txt(li).endsWith(': price estimated from DraftKings’ line; its id was not read'); }),
            `Open in DraftKings on the ${t.label} tier does not name each leg priced from DraftKings' line read on ESPN to add by hand, its price estimated and its id not read: ` + [...d.querySelectorAll('#pcDkNote [data-pc-dkmiss]')].map(txt).join(' / '));
          if (!n) console.log(`  (every leg of the ${t.label} tier is priced from DraftKings' line read on ESPN: none goes on the slip, and each is named to add by hand)`);
          else chk(ids.length === n && ids.every(x => /^SMK\d/.test(x)) && !!a && !a.hidden && a.getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(encodeURIComponent).join('+')
            && d.querySelectorAll('#pcDkNote [data-pc-dkmiss]').length === t.legs.length - n && !d.getElementById('pcLink').hidden
            && /^DraftKings’ lines as read .* ET: Open in DraftKings opens /.test(txt(d.getElementById('pcDkNote'))) && txt(d.getElementById('pcDkNote')).includes(`opens ${n < t.legs.length ? n + ' of the ' + t.legs.length + ' legs' : 'the ' + t.n + ' legs'} as DraftKings had ${n === 1 ? 'it' : 'them'} then; a leg whose line DraftKings has moved or pulled since will not be on the slip`)
            && !/\bputs all\b|\ball \d+ legs on\b/.test(txt(d.getElementById('pcDkNote')) + ' ' + a.getAttribute('title')),
            `Open in DraftKings on the ${t.label} tier does not open its legs' own ids (${ids.length} of ${n} keyed, ${t.legs.length} legs): ` + (a ? a.getAttribute('href') + ' hidden ' + a.hidden : 'no link') + ' / ' + txt(d.getElementById('pcDkNote')).slice(0, 200)); }
        w.eval(`(function(){ const k=${keepDk}; if(k===null) delete PAY.dk; else PAY.dk=k; })()`);
        w.eval('PARLAY_CARD.close()'); await wait(20);
        chk(d.getElementById('pcModal').hidden && d.activeElement === d.querySelector(`#pbPanel [data-pc-finish="pb|${t.id}"]`), 'closing the card did not give the focus back to the tier\'s Finish');
        await wait(400);
        chk(w.eval('S.saved.length') === n0 && JSON.stringify(Object.keys(w.localStorage).sort()) === keys0, 'finishing a suggested tier saved it, or wrote a key'); }
      w.eval(`S.stake=${JSON.stringify(stake0)}; save(); renderParlay()`); await wait(40);
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
  /* every level shows a parlay of its size: ten made-up games standing in for the week's (pbGames
     and pricedLegs stood in for, so this holds on any day, the off-season included), only Spread
     ticked, as the owner had it. The covers are priced so that the likeliest legs and the
     best-paying ones differ: on the odd games four the model rates 57% to 58.5% at -115, on the
     even ones four it rates 46.5% to 48% at +140 (both over the 3-point bar), and two thin ones at
     59% and 58.8% at -135. Three legs land at most 20.3% and four 11.8% at any count of thin legs,
     short of Medium's 25% and Aggressive's 12%, so those two are the likeliest parlays of their
     size: the three and four likeliest -115 covers (H1, H3, H5, H7), never the +140 ones a choice by
     return would take or the first games on the list, worked out in full against every parlay of
     their size, marked so and ruled "the likeliest 3 legs" and "the likeliest 4 legs" with no note;
     Safe is the likeliest pair and Extreme its best return over 5%. Finish on a fallback opens its
     card like any tier's */
  if (hasPb) { const Sx = w.eval('S'), cw = w.eval('currentWeek()'), keepU = JSON.stringify(Sx.ui.pb);
    w.__pbKeep4 = w.eval('[pbGames, pricedLegs]');
    const G = [...Array(10)].map((_, i) => ({ id: `2099_${String(cw).padStart(2, '0')}_A${i}_H${i}`, w: cw, a: 'A' + i, h: 'H' + i, d: `2099-01-0${1 + (i % 7)}`, t: '13:00' }));
    const COVER = [[0.48, 140], [0.585, -115], [0.475, 140], [0.58, -115], [0.47, 140], [0.575, -115], [0.465, 140], [0.57, -115], [0.59, -135], [0.588, -135]];
    w.__pb4 = { G, L: G.map((g, i) => ({ key: `${g.id}|team:${g.h}|ats`, gid: g.id, pid: 'team:' + g.h, stat: 'ats', k: -3.5, side: 'over', main: false, p: COVER[i][0], price: COVER[i][1],
      src: 'real', mu: null, name: 'Made-up ' + g.h, pos: 'Game', grp: 'TEAM', team: g.h, opp: g.a, week: cw, label: 'To cover -3.5' })) };
    w.eval('pbGames=function(){ return window.__pb4.G; }; pricedLegs=function(games){ return window.__pb4.L.filter(l=>(games||[]).some(g=>g.id===l.gid)).map(l=>({...l})); };');
    Sx.ui.pb = { k: { ml: false, ats: true, total: false, over: false, under: false }, off: [], gx: false };
    w.eval('PB_CACHE=new Map(); renderParlay()'); await wait(40);
    const r = w.eval('getPbTiers()'), kinds = r.tiers.map(t => t.legs ? (t.likeliest ? 'likeliest' : 'built') : 'empty').join();
    chk(kinds === 'built,likeliest,likeliest,built' && r.tiers.every(t => t.legs && t.legs.length === t.n),
      `ten made-up games with only Spread ticked: the levels are ${kinds}, not Safe and Extreme built with Medium and Aggressive the likeliest of their size`);
    chk(!d.querySelector('#pbPanel [data-pb-mix].on') && !d.querySelector('#pbPanel .pb-custom') && !/\bCustom\b/.test(txt(panel)), 'ten made-up games with only Spread ticked: a mix is lit or a Custom tag shows');
    for (const t of r.tiers) { const c = d.querySelector(`#pbPanel .pb-tier.${t.id}`), rule = c && c.querySelector('.pb-rule');
      const want = t.likeliest ? `the likeliest ${t.n} legs` : t.floor ? `best return that lands ${Math.round(t.floor * 100)}%+ by the model` : 'the likeliest pair';
      chk(!!c && !!rule && txt(rule) === want && c.querySelectorAll('.pb-legs li').length === t.n && txt(c).includes(`${(t.corr * 100).toFixed(0)}%`) && ![...c.querySelectorAll('p')].some(p => !p.classList.contains('pb-thin')),
        `ten made-up games: the ${t.id} card does not show its legs and chance under the rule "${want}" with no note: ${c ? txt(c).slice(0, 160) : 'no card'}`); }
    /* the likeliest 3 and 4 legs are the three and four likeliest -115 covers (a plain product, legs
       in different games), and no parlay of their size with as many thin legs lands likelier; the
       best-paying 3 and 4 are the +140 covers, so the case tells a fallback by return from the likeliest */
    const pool4 = w.eval('pbPool')(G), teams = c => c.map(l => l.team).sort().join(), mlToDec = w.eval('mlToDec');
    for (const [id, want] of [['med', 'H1,H3,H5'], ['aggr', 'H1,H3,H5,H7']]) { const t = r.tiers.find(x => x.id === id), p = want.split(',').reduce((a, h) => a * COVER[+h.slice(1)][0], 1);
      chk(!!t && !!t.legs && teams(t.legs) === want && Math.abs(t.corr - p) < 1e-12, `ten made-up games: ${id} is not the likeliest covers ${want}: ${t && t.legs ? teams(t.legs) : 'none'}`);
      const all = [...pool4.pref, ...pool4.thin], b = t && t.legs && noMovers(all) ? likeliestOf(all, t.n, t.thin) : null;
      chk(!!b && t.corr >= b.best - 1e-12, `ten made-up games: ${id} lands ${t && t.corr} where ${b ? teams(b.legs) + ' land ' + b.best : 'no parlay could be worked'}`);
      const ret = [], n = id === 'med' ? 3 : 4;
      (function rec(i0, cur) { if (cur.length === n) { ret.push({ c: cur.slice(), ev: cur.reduce((a, l) => a * l.p * mlToDec(l.price), 1) }); return; }
        for (let i = i0; i < pool4.pref.length; i++) { if (!fitsF(cur, pool4.pref[i])) continue; cur.push(pool4.pref[i]); rec(i + 1, cur); cur.pop(); } })(0, []);
      const byRet = ret.sort((a, b2) => b2.ev - a.ev)[0];
      chk(!!byRet && teams(byRet.c) !== want, `ten made-up games: the best-paying ${n} covers are the likeliest too (${byRet ? teams(byRet.c) : 'none'}), so the case cannot tell a fallback by return from the likeliest`); }
    /* Finish on a fallback opens its card, with its legs and price */
    { const t = r.tiers.find(x => x.id === 'aggr'), fb = d.querySelector('#pbPanel [data-pc-finish="pb|aggr"]');
      if (fb) { fb.click(); await wait(40); }
      const view = d.getElementById('pcView');
      chk(!!fb && !d.getElementById('pcModal').hidden && /Aggressive parlay/i.test(txt(view)) && !!t && !!t.legs && t.legs.every(l => txt(view).includes(l.name))
        && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t && t.dec}))`).replace('-', '−'), 'Finish on the likeliest 4 legs does not open its card with its legs and price: ' + txt(view).slice(0, 160));
      w.eval('PARLAY_CARD.close()'); await wait(20); }
    w.eval('pbGames=window.__pbKeep4[0]; pricedLegs=window.__pbKeep4[1]; PB_CACHE=new Map();'); delete w.__pbKeep4; delete w.__pb4;
    Sx.ui.pb = JSON.parse(keepU); w.eval('renderParlay()'); await wait(20); }
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
  chk(/<head>\s*<script>window\.EMBED_TAB="record";window\.STATE_URL='\.\.\/betting\/state\.json';window\.XBETS=window\.XBETS\|\|\(function\(\)\{try\{return window\.parent!==window&&window\.parent\.XBETS\|\|null;\}catch\(e\)\{return null;\}\}\)\(\);if\(window\.XBETS\)document\.documentElement\.classList\.add\('xbets-ro'\);window\.FRIENDS=window\.FRIENDS\|\|\(function\(\)\{try\{return window\.parent!==window&&window\.parent\.FRIENDS\|\|null;\}catch\(e\)\{return null;\}\}\)\(\);<\/script>/.test(adminHtml),
    'the framed app is not told its tab, its season path, the page\'s X Bet Log and the friends\' picks');
  /* the frames reach the page's X Bet Log through window.parent: a sandboxed frame could not */
  chk([...d.querySelectorAll('iframe.pk-frame')].every(f => !f.hasAttribute('sandbox')), 'a betting frame is sandboxed, so it cannot reach the X Bet Log');
  chk(/html\.embed header,html\.embed #tabs\{display:none\}/.test(adminHtml) && /classList\.add\('embed'\)/.test(adminHtml),
    'the framed app has no embed mode, so the frame would show its header and tab bar');
  chk(/data-tab="record"/.test(adminHtml), 'the framed app has no Records tab');
  /* the frame takes its content's height and never scrolls up and down by itself: allowed to, a
     classic scrollbar (Windows Chrome's, with its arrows) stuck in it with nothing to scroll, since
     the charts drawn without the bar came out a few px taller than the height measured with it.
     jsdom loads no srcdoc, so the frame's load is played on the blank document it does have */
  { if (!(recFrame.contentDocument && recFrame.contentDocument.documentElement && recFrame.contentDocument.documentElement.style.overflowY)) recFrame.dispatchEvent(new w.Event('load'));
    const fd = recFrame.contentDocument;
    chk(!!fd && !!fd.documentElement && fd.documentElement.style.overflowY === 'hidden' && !fd.documentElement.style.overflowX,
      'a betting frame, once loaded, can still scroll up and down by itself (a scrollbar can stick in it with nothing to scroll), or no longer scrolls sideways'); }
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

  /* ---- the Season Tracker tab is gone (14 October 2026): its games are in each Game snapshot. Every
     frame in the page is one of the three betting tabs, and the page carries none of the news job's
     data or code: the snapshot fetches its three files as the page loads, no-store, and a news job
     commit never leaves this page stale ---- */
  chk(!d.getElementById('tab-tracker') && !d.querySelector('#tabs button[data-tab="tracker"], iframe.nt-frame, #ntTop, #ntNote'), 'the Season Tracker tab is still in the page');
  chk(d.querySelectorAll('iframe').length === 3 && d.querySelectorAll('iframe.pk-frame').length === 3, 'a frame in the page is not one of the three betting tabs');
  { const baked = HTML.match(/const (UNITS26|STATS26|WEEKS|RANKS26|PLAYERS26|RESULTS)\b|\b(UNITS26_META|STATS26_THROUGH|UNITS26_LINEUPS)\s*=|<script[^>]+src=[^>]*news\//), refs = [...new Set(HTML.match(/(['"`])\.\.\/news\/[^'"`]*\1/g) || [])].map(x => x.slice(1, -1)).sort();
    chk(!baked && refs.join() === ['../news/data/notes/${season}-w${week}.json', '../news/data/stats.json', '../news/data/units.json'].join(),
      'the page bakes in the news job\'s data or reads a news file other than units.json, stats.json and the week\'s notes: ' + (baked ? baked[0] : refs.join(', '))); }
  { const nc = calls.filter(c => /\/news\/data\//.test(c.url)), n = f => nc.filter(c => c.url.replace(/\?.*$/, '').endsWith(f)).length;
    chk(nc.length > 0 && nc.every(c => c.method === 'GET' && c.cache === 'no-store') && n('news/data/units.json') === 1 && n('news/data/stats.json') === 1
      && new Set(nc.map(c => c.url)).size === nc.length,
      'the Game snapshot does not read the news job\'s files once each, no-store, as the page loads: ' + nc.map(c => `${c.method} ${c.url} ${c.cache}`).join(' | ')); }

  /* the tabs keep their addresses: #parlay is the Parlay Builder, #xparlays X Parlays, #bets the X Bet Log */
  for (const [hash, id, label] of [['#parlay', 'tab-parlay', 'Parlay Builder'], ['#xparlays', 'tab-xparlays', 'X Parlays'], ['#bets', 'tab-bets', 'X Bet Log']]) {
    w.location.hash = '#pickems'; await wait(30); w.location.hash = hash; await wait(60);
    chk(!d.getElementById(id).hidden && d.getElementById('tab-pickems').hidden && txt(d.querySelector(`#tabs button[aria-selected="true"]`)) === label, `the old address ${hash} does not open ${label}`); }
  /* the Season Tracker's old address, where news/ sent every visitor, lands on Pick'ems, written over as #pickems */
  w.location.hash = '#xparlays'; await wait(40); w.location.hash = '#tracker'; await wait(60);
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-xparlays').hidden && w.location.hash === '#pickems' && txt(d.querySelector('#tabs button[aria-selected="true"]')) === "Pick'ems",
    'the old address #tracker does not land on Pick\'ems as #pickems: ' + w.location.hash);
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
      /* the board's line and the prop model's differ: the prices, and the note that said so, are on the Props tab now */
      chk(!card(moved.game_id).querySelector('.pk-lines, .gbets'), 'an opened game on the board still carries game bets or a note on two lines'); }
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

  /* opened on #tracker, where old links to the Season Tracker go (news/ sends its visitors to the board
     itself now), the board is showing and the address is #pickems */
  { const t2 = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#tracker');
    chk(t2.errs.length === 0 && !t2.d.getElementById('tab-pickems').hidden && t2.w.location.hash === '#pickems' && txt(t2.d.querySelector('#tabs button[aria-selected="true"]')) === "Pick'ems",
      'opened on #tracker, the page does not land on Pick\'ems as #pickems: ' + t2.w.location.hash + ' ' + t2.errs.join('; '));
    t2.w.close(); }

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
      { const q = eloP.groups.QB.top[0];   /* a quarterback's rating is a passer's: no second price on the touchdown he scores himself (app v102) */
        chk(altP(q.id, 'over', 200, 'real', 'any_td') === null && altP(q.id, 'over', 200, 'real', 'passing_yards') != null, 'market + form prices a quarterback\'s own touchdown on his passing rating, or no longer his passing line'); }
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
        /* the second the prop model rates at 90%, far off the market: an Elo pick is chosen on its own
           chance, so it stays, flagged */
        const legs = [L(byGame[0], 120, 'over'), L(byGame[1], -110, 'over', { p: 0.9 }), L(byGame[2], 110, 'over'),
          L(byGame[0], 130, 'over', { key: byGame[0].gid + '|' + byGame[0].pid + '|dup' }),        /* same player again */
          L(byGame[1], 1600, 'over', { key: 'long' }),                                              /* too long a price */
          L(byGame[2], -110, 'under', { key: 'under' }),                                            /* against his nudge */
          L(weak, 150, 'over', { key: 'weak' })];                                                   /* a stat the matchup has not earned */
        if (!w.__realPricedLegs) w.__realPricedLegs = w.eval('pricedLegs');   /* the page's own, for the Refresh odds checks below */
        w.__legs = legs; w.eval('pricedLegs=function(){ return window.__legs.map(l=>Object.assign({},l)); }');
        const r = w.eval('eloPicks()');
        const t2 = r.tiers[0], t3 = r.tiers[1];
        chk(r.tiers.length === 2 && t2.legs.length === 2 && t3.legs.length === 3, 'Elo picks should make a 2- and a 3-leg parlay from these lines: ' + JSON.stringify(r.tiers.map(t => t.legs.map(l => l.key))));
        chk(t3 && t3.legs[0].price > 0 && t3.legs[1].price > 0 && t3.legs[2].price < 0, 'Elo picks do not put plus money first');
        chk(t3 && new Set(t3.legs.map(l => l.gid)).size === 3 && new Set(t3.legs.map(l => l.pid)).size === 3, 'Elo picks took two legs from one game or one player');
        chk(t3 && t3.legs.every(l => !['long', 'under', 'weak'].includes(l.key)), 'Elo picks took a line they should have passed on: ' + JSON.stringify(t3 && t3.legs.map(l => l.key)));
        chk(t2 && Math.abs(t2.dec - t2.legs.reduce((a, l) => a * w.eval('mlToDec')(l.price), 1)) < 1e-9, 'an Elo parlay is not priced as its legs multiplied');
        /* a price worked from DraftKings' line read on ESPN (app v107) counts as a book price here and in
           market + form, which pricedLegs offers only on the kinds the estimate has been checked on; a
           model-only estimate never does */
        { w.__legs2 = legs.map((l, i) => Object.assign({}, l, i === 2 ? { src: 'dkline', espn: { fair: 0.45, at: '2026-10-15T03:08Z', tested: true, listed: true } } : i === 3 ? { src: 'est' } : {}));
          const keepPL = w.eval('pricedLegs'); w.eval('pricedLegs=function(){ return window.__legs2.map(l=>Object.assign({},l)); }');
          const r2 = w.eval('eloPicks()'), all2 = r2.tiers.flatMap(t => t.legs);
          chk(all2.some(l => l.key === legs[2].key && l.src === 'dkline') && !all2.some(l => l.key === legs[3].key),
            'the Elo picks do not take a leg priced from DraftKings\' line read on ESPN as a book price, or take a model-only estimate: ' + JSON.stringify(r2.tiers.map(t => t.legs.map(l => l.key + ' ' + l.src))));
          chk(w.eloAltP(legs[0].pid, 'over', -112, 'dkline', legs[0].stat) != null && w.eloAltP(legs[0].pid, 'over', -112, 'est', legs[0].stat) === null,
            'market + form does not read a price from DraftKings\' line read on ESPN as the book\'s, or reads a model-only estimate');
          w.__keepPL = keepPL; w.eval('pricedLegs=window.__keepPL'); w.eval('pricedLegs=function(){ return window.__legs.map(l=>Object.assign({},l)); }'); }
        /* the chance: the book's with its margin out, moved by the nudge in the stat's typical miss */
        { const l = t3.legs[0], a = MU.players[l.pid].stats[l.stat], sd = MU.fit[MU.players[l.pid].group + '|' + l.stat].sd;
          const fair = w.eval(`mlProb(${l.price})`) / 1.045, want = w.eloMatchupP(l, w.eval(`mlProb(${l.price})`));
          /* the normal curve by hand: the fair chance moved a[2]/sd standard deviations */
          const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
          const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
          let lo = -8, hi = 8; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (Phi(m) < fair) lo = m; else hi = m; }
          const byHand = Phi(lo + a[2] / sd);
          chk(Math.abs(l.pe - want) < 1e-12 && Math.abs(l.pe - byHand) < 2e-4 && l.pe > fair, `an Elo pick's chance is not the book's fair chance moved by the matchup: ${l.pe} vs ${byHand}`); }
        /* each pick's fair chance: parlayProb on its legs at the rule's fair chances (one leg a game, so their product) */
        { const fo = fairRule(w);
          chk([t2, t3].every(t => { const fs = t.legs.map(fo); return fs.every(Boolean) ? !!t.fair && Math.abs(t.fair.p - w.eval('parlayProb')(t.legs.map((l, i) => ({ ...l, p: fs[i].p }))).corr) < 1e-12 && t.fair.est === fs.some(f => f.est) : !!t.fair && t.fair.p === null; }),
            'an Elo pick\'s fair chance is not parlayProb on its legs at their fair chances: ' + [t2, t3].map(t => JSON.stringify(t.fair)).join(' / ')); }
        w.eval('PB_CACHE=new Map(); renderPb()'); await wait(40);
        const card = d.querySelector('#pbPanel #pbElo');
        /* each card leads with the fair chance, the Elo's beside it; the leg far off the market is flagged, and only it */
        { const pc = v => (v * 100).toFixed(0) + '%', fo = fairRule(w);
          chk([t2, t3].every(t => { const c = card && card.querySelector(`[data-pb-tier="${t.id}"]`), first = c && c.querySelector('.pb-nums > div'), F = t.fair;
            return !!first && first.classList.contains('pb-chance') && (F && F.p != null ? txt(first.querySelector('b')) === pc(F.p) && txt(first.querySelector('small')) === `Elo says ${pc(t.p)}` : txt(first.querySelector('b')) === pc(t.p)); }),
            'the Elo picks do not lead with the fair chance beside the Elo\'s: ' + [...(card ? card.querySelectorAll('.pb-nums > div:first-child') : [])].map(txt).join(' / '));
          const far = card ? [...card.querySelectorAll('[data-pb-tier="elo3"] [data-pb-far]')].map(txt) : [], f1 = fo(legs[1]);
          chk(far.length === 1 && !!f1 && far[0] === `model 90% · market ${Math.round(f1.p * 100)}%${f1.est ? ' est.' : ''}: far off the market` && !!card && !card.querySelector('[data-pb-tier="elo2"] [data-pb-far]'),
            'the Elo pick\'s leg far off the market is not flagged, or another is: ' + far.join(' / ')); }
        /* a leg carries a shield where its player is ranked this season, and only there */
        const wantBadges = [t2, t3].flatMap(t => t.legs).filter(l => eloP.players[l.pid] && eloP.players[l.pid].rank).length;
        chk(!!card && /Elo picks/.test(txt(card.querySelector('h3'))) && card.querySelectorAll('.pb-tier').length === 2 && card.querySelectorAll('.pb-legs .pe-badge').length === wantBadges, `the Elo picks are not a section of the suggested parlays, or their legs' shields are wrong: ${card ? card.querySelectorAll('.pb-legs .pe-badge').length : 'no section'} for ${wantBadges}`);
        /* the Elo picks pay on the panel's Bet amount too, as it is typed */
        const eloStake0 = w.eval('S.stake'), amtBox = d.getElementById('pbStake');
        if (amtBox) { amtBox.value = '12.5'; amtBox.dispatchEvent(new w.Event('input')); amtBox.dispatchEvent(new w.Event('change')); await wait(20); }
        const eloAmt = amtBox ? 12.5 : eloStake0;
        chk(!!amtBox && !!card && [t2, t3].every(t => { const p = card.querySelector(`[data-pb-tier="${t.id}"] [data-pb-pay]`);
          return !!p && +p.dataset.pbPay === t.dec && txt(p.querySelector('b')) === money(12.5 * t.dec) && txt(p.querySelector('span')) === '$12.50 pays'; }),
          'the Elo picks do not pay the Bet amount ($12.50) times their price: ' + [...(card ? card.querySelectorAll('.pb-nums div:last-child') : [])].map(x => [...x.children].map(txt).join(' ')).join(' / '));
        /* Add to builder puts exactly those legs in the builder */
        { const keepP = w.eval('JSON.stringify(S.parlay)'), ab = card && card.querySelector('[data-pb-elo-add="elo2"]');
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
            && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t2.dec}))`).replace('-', '\u2212')
            && txt(view.querySelector('.pc-chance')).startsWith(t2.fair && t2.fair.p != null ? `Fair chance all 2 land ${pct1(t2.fair.p)}${t2.fair.est ? ' (est.)' : ''} Elo says ${pct1(t2.p)} · the price says ` : `Elo\u2019s chance all 2 land ${pct1(t2.p)}`),
            'an Elo pick\'s card is not its legs, its price and its Elo chance: ' + txt(view));
          { const cash = [...view.querySelectorAll('.pc-money b')].map(txt).join(' | ');
            chk(cash === [money(eloAmt), money(eloAmt * t2.dec), '+' + money(eloAmt * t2.dec - eloAmt)].join(' | '), `an Elo pick's card is not on the Bet amount: ${cash} for ${amtTxt(eloAmt)} at ${t2.dec}`); }
          w.eval('PARLAY_CARD.close()'); }
        chk(w.eval('S.saved.length') === nSaved, 'finishing an Elo pick saved it');
        w.eval(`S.stake=${JSON.stringify(eloStake0)}; save(); renderParlay()`); await wait(20);
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
      if (onWeek && rows0.length && !card) chk(false, `the week has ${rows0.length} mismatches and the Props list draws no card for them`);
      else if (onWeek && rows0.length) {
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
          /* the game page tags every player drawn there with a favourable mismatch this week (Solid
             and up, graded as the card grades it) MISMATCH beside his name, its grade kept on the tag,
             once, and nobody else; a redraw
             does not double it */
          const tagCheck = () => { const grade = x => x >= 3 ? 'Huge' : x >= 2 ? 'Big' : x >= 1 ? 'Solid' : null;
            const btns = [...d.querySelectorAll('#gameView button.plrbtn[data-open]')], drawn = new Set(btns.map(b => b.dataset.open));
            const exp = {}; for (const r of w.eloMismatches()) { const g = grade(Math.round(r.score * 10) / 10);
              if (r.game_id === rows[0].game_id && g && drawn.has(r.pid)) exp[r.pid] = 'Mismatch|' + g; }
            const got = {}; for (const b of btns) { const t = b.querySelectorAll('.pe-mmtag');
              if (t.length) got[b.dataset.open] = t.length === 1 && t[0].parentNode.classList.contains('who') && t[0].previousSibling && t[0].previousSibling.nodeType === 3 ? t[0].textContent + '|' + t[0].dataset.peMmgrade : 'misplaced or twice'; }
            const k = o => JSON.stringify(Object.entries(o).sort());
            return Object.keys(exp).length > 0 && k(got) === k(exp) ? '' : `expected ${k(exp)}, drew ${k(got)}`; };
          { const bad = tagCheck(); chk(!bad, 'the game page does not tag the players with a favourable mismatch beside their names: ' + bad); }
          w.eval('renderGame()'); await wait(40);
          { const bad = tagCheck(); chk(!bad, 'a redrawn game page does not tag its mismatches once: ' + bad); }
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
       teams in rank order (the ones with a rating best first: played, or carried from last season),
       each with its shield, a club yet to play marked carried from the season the file names, and no
       other; a position pill brings the players back (the tab's own gate, elo/check_tab.js, checks the rest) */
    { const U = eloM.units, played = U ? Object.values(U.off).filter(v => v.games || v.carried).length : 0, card = () => d.getElementById('peUnits');
      const pill = side => body.querySelector(`.pe-pos button[data-unit="${side}"]`), was = (body.querySelector('.pe-pos [aria-selected="true"]') || {}).dataset;
      if (!played) chk(!pill('off') && !card(), 'Overall Offense shows with no games rated');
      else {
        for (const side of ['off', 'def']) {
          const name = side === 'off' ? 'Overall Offense' : 'Overall Defense';
          chk(!!pill(side) && txt(pill(side)) === name, 'no ' + name + ' pill in the position row'); if (!pill(side)) break;
          pill(side).click(); await wait(30);
          const rows = card() ? [...card().querySelectorAll('tbody tr.pe-tmrow')] : [], T = U[side];
          const vals = rows.filter(r => T[r.dataset.team] && (T[r.dataset.team].games || T[r.dataset.team].carried)).map(r => +txt(r.querySelector('.pe-elo')));
          chk(rows.length === Object.keys(T).length && rows.every((r, i) => T[r.dataset.team].rank === i + 1) && vals.every((v, i) => !i || v <= vals[i - 1]) && rows.every(r => r.querySelector('.pe-shield svg')),
            `${name} is not every team in rank order, best first, with shields`);
          { const from = (U.params || {}).carry_from, bad = rows.filter(r => { const v = T[r.dataset.team], m = r.querySelector('.pe-carry');
              return v.carried ? !m || txt(m) !== `carried from ${from}` : !!m; }).map(r => r.dataset.team);
            chk(!bad.length, `${name}: a club yet to play is not marked carried from ${from}, or one that has played is: ${bad.join(', ')}`); }
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
  /* Open in DraftKings on the payload's own ids (dk, baked by weekly.py's dk_ids), where it has them for
     a game still to come: the builder holds that game's home money line and, where the payload has a
     main line DraftKings has an Under for at the same point, that player's Under; Finish opens the
     card, and its link is those ids, looked up here on their own (dkKey), in the card's order */
  { const S = w.eval('S'), P = w.eval('PAY'), started = w.eval('gameStarted'), DK = P.dk || {};
    const cand = Object.values(DK).flatMap(gs => Object.keys(gs || {})).map(gid => S.sched.find(x => x.id === gid)).filter(g => g && !started(g) && dkIdOf(DK, { stat: 'ml', pid: 'team:' + g.h, week: g.w, gid: g.id }));
    if (!cand.length) console.log(`  (${'dk' in P ? 'the payload has no DraftKings ids for a game still to come' : 'the payload was baked before DraftKings\' ids (dk)'}: Open in DraftKings on its own ids is skipped; the tiers and smoke_live.js hold it on made-up ones)`);
    else { const g = cand[0], keep = JSON.stringify(S.parlay), mk = P.mkt[String(g.w)] || {};
      S.parlay = {}; S.parlay[g.id + '|team:' + g.h + '|ml'] = teamLeg(g);
      const under = Object.entries(mk).flatMap(([pid, sts]) => Object.entries(sts).map(([st, L]) => ({ pid, st, L })))
        .find(x => x.L.g === g.id && S.players[x.pid] && dkIdOf(DK, { pid: x.pid, stat: x.st, side: 'under', k: x.L.line, main: true, week: g.w, gid: g.id }));
      if (under) w.eval('toggleLeg')(`${g.id}|${under.pid}|${under.st}`, under.L.line, g, 'under', true);
      w.eval('save(); renderParlay();'); await wait(60);
      const q = w.PARLAY_CARD.quote(), fin = d.getElementById('pFinish');
      if (fin && !fin.disabled) { fin.click(); await wait(30); }
      const a = d.getElementById('pcDk'), ids = q ? q.legs.map(l => dkIdOf(DK, l)) : [];
      chk(!!q && q.legs.length === (under ? 2 : 1) && ids.every(Boolean) && !!a && !a.hidden && a.getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(encodeURIComponent).join('+')
        && !d.querySelector('#pcDkNote [data-pc-dkmiss]'),
        `Open in DraftKings on the payload's own ids for ${g.id} (its money line${under ? ' and ' + under.L.n + '\'s Under ' + under.L.line : ''}) is not those ids in the card's order: ` + (a ? a.getAttribute('href') + ' hidden ' + a.hidden : 'no link') + ' / ' + txt(d.getElementById('pcDkNote')).slice(0, 200));
      w.eval('PARLAY_CARD.close()');
      S.parlay = JSON.parse(keep); w.eval('save(); renderParlay();'); await wait(40); } }

  /* ---- Refresh odds (app v107), on stand-in ESPN answers of the smoke's own, served by its fetch stub,
     never ESPN itself. The page reads ESPN only on a press: nothing from ESPN's core host on load; the
     button, 44px, in the Parlay Builder's controls, over the Props tab's game list and on a game's page,
     each with a status line beside it (aria-live) saying the published prices before a press. A press
     reads the week's scoreboard and each game's player lines (here the season's last game still to come
     read in full: the week's last game still to come, one game with no lines posted, one ESPN does not answer), applies DraftKings' game lines
     (real prices), draws the game's page with each est. price the rule's (espn_rule.js, the props audit's
     own working) and its title saying what it is priced from, counts a tested kind as a book price in the
     suggested parlays and never an untested one, and the parlay card names such a leg to add by hand. A
     failing ESPN and a 404 are worded as the status line says them, and a game's page reads that game
     alone. The stand-in takes the game's own player prices out whatever the payload holds, so it holds
     on any payload: the week's own, a lean week, one baked before PAY.espn_ids ---- */
  { const S = w.eval('S'), ko0 = x => w.eval('kickoff')(x).getTime(), g = hasPb ? (w.eval('pbGames()').slice().sort((a, b) => ko0(b) - ko0(a))[0] || null) : null, ESR = ESPN_RULE.make(w), has = w.eval('typeof espnRefresh') === 'function' && w.eval('typeof espnWhen') === 'function';
    chk(has, 'the page has no Refresh odds reader (espnRefresh, espnWhen)');
    chk(!calls.some(c => /sports\.core\.api\.espn\.com|propBets/.test(c.url)), 'the page asked ESPN\'s core host for something on load, with no press: ' + calls.filter(c => /sports\.core|propBets/.test(c.url)).map(c => c.url).slice(0, 3).join(' '));
    if (!g || !hasPb || !has) console.log('  (no game left to kick off: Refresh odds is not pressed)');
    else { const P = w.eval('PAY'), wk = String(g.w), clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v)), fmt = w.eval('fmtML'), when = w.eval('espnWhen'), clk = w.eval('espnClock');
      const games = w.eval('pbGames()').filter(x => String(x.w) === wk), others = games.filter(x => x.id !== g.id), gN = others[0] || null, gF = others[1] || null;
      const KEYS = w.eval('ESPN_GL_KEYS'), before = Object.fromEntries(games.map(x => [x.id, Object.fromEntries(KEYS.map(k => [k, x[k]]))]));
      const keep = { ids: clone(P.espn_ids), mk: clone(P.mkt[wk]), o: clone(S.odds[g.id]), pb: clone(S.ui.pb), parlay: clone(S.parlay), dk: clone(P.dk),
        ui: clone({ game: S.ui.game, open: S.ui.open, rungs: S.ui.showRungs, all: S.ui.showAll }) };
      const f0 = w.fetch, net = { log: [], route: () => ({ code: 500 }) };
      const esp = u => /^https:\/\/(site|sports\.core)\.api\.espn\.com\//.test(u) && (/\/scoreboard\?dates=/.test(u) || /sports\.core/.test(u) || /\/roster$/.test(u));
      const ans = r => r.reject ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ ok: r.code === 200, status: r.code, headers: { get: () => null },
        json: async () => { if (r.junk) throw new SyntaxError('Unexpected token'); return clone(r.body); } });
      let nEst = 0, nLev = 0;
      /* the Elo picks' checks above left their own lines in place of the page's: the page's, for these */
      const plStub = w.eval('pricedLegs'); if (w.__realPricedLegs) w.eval('pricedLegs=window.__realPricedLegs');
      const unapply = () => { const GL = w.eval('ESPN_GL'); for (const id of Object.keys(GL)) { const x = S.sched.find(y => y.id === id); if (!x) continue;
        for (const k of KEYS) { if (GL[id].orig[k] === undefined) delete x[k]; else x[k] = GL[id].orig[k]; } } w.eval('ESPN_GL={}'); };
      const reset = () => { unapply(); w.eval('ESPN_LIVE={}; ESPN_OUT={}; ESPN_NAMES={}; ESPN_SEQ++; PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_VIEW={sig:null,key:null,t:{}}'); };
      const press = async b => { if (b) { b.focus(); b.click(); } for (let i = 0; i < 400 && w.eval('ESPN_RUN.busy'); i++) await wait(25); await wait(30); };
      try {
        /* the buttons and their status lines before a press */
        { const pub = `Prices as published ${when(P.baked_at)}.`, b = d.querySelector('#pbPanel [data-espn-refresh="week"]'), st = d.querySelector('#pbPanel [data-espn-status="week"]');
          chk(!!b && txt(b) === 'Refresh odds' && w.getComputedStyle(b).minHeight === '44px' && !!st && st.getAttribute('aria-live') === 'polite' && b.getAttribute('aria-describedby') === st.id && txt(st) === pub,
            `the Parlay Builder's controls have no 44px Refresh odds button with its status line saying the published prices: ${b ? txt(b) + ' ' + w.getComputedStyle(b).minHeight : 'none'} / ${txt(st)}`);
          const ws = d.getElementById('weekSel'); if (ws && ws.value !== wk) { ws.value = wk; ws.dispatchEvent(new w.Event('change')); await wait(30); }
          const so = d.querySelector('#slateOdds [data-espn-refresh="week"]');
          chk(!!so && !d.getElementById('slateOdds').hidden && w.getComputedStyle(so).minHeight === '44px' && txt(d.querySelector('#slateOdds [data-espn-status="week"]')) === pub, 'the Props tab has no 44px Refresh odds button over its game list, with its status line');
          S.ui.game = g.id; w.eval('renderGame()'); await wait(20);
          const gb = d.querySelector(`#gameView [data-espn-refresh="${g.id}"]`), gs = d.querySelector(`#gameView [data-espn-status="${g.id}"]`);
          chk(!!gb && w.getComputedStyle(gb).minHeight === '44px' && !!gs && txt(gs) === pub, `${g.id}'s page has no 44px Refresh odds button for the game, with its status line`);
          S.ui.game = null; w.eval('closeGameModal()'); }
        /* the game's own player prices out: every player leg is priced from the read or by the model */
        delete S.odds[g.id];
        for (const pid of Object.keys(P.mkt[wk] || {})) for (const st of Object.keys(P.mkt[wk][pid])) if (P.mkt[wk][pid][st] && P.mkt[wk][pid][st].g === g.id) delete P.mkt[wk][pid][st];
        if (P.dk && P.dk[wk]) delete P.dk[wk][g.id];
        /* the stand-in read of g: each starter's yards and receptions lines set where the model makes the over
           about 60% (an edge, not far off the market), completions and carries the same (untested: never
           suggested), ladders DraftKings lists (all but each ladder's last rung), touchdowns offered; each
           player under a made-up ESPN id in PAY.espn_ids */
        const ro = w.eval('rosterFor')(g, false), pOver = w.eval('pOver'), items = [], ids = {}, WANT = ['passing_yards', 'rushing_yards', 'receiving_yards', 'receptions', 'completions', 'carries'];
        const mainT = Object.fromEntries(Object.entries(ESPN_RULE.TYPES.main).map(([k, v]) => [v, k])), mileT = Object.fromEntries(Object.entries(ESPN_RULE.TYPES.mile).map(([k, v]) => [v, k]));
        const lineFor = (x, l) => { let b = null; for (let L = 0.5; L < Math.max(4, l.mu * 3); L += 1) { const p = pOver(x.pl.grp, l.stat, l.mu, L); if (!b || Math.abs(p - 0.6) < Math.abs(b.p - 0.6)) b = { L, p }; } return b.L; };
        const lines = {}; let n = 0;
        for (const tm in ro) for (const x of ro[tm].players) { if (!x.starter) continue; const aid = String(6100000 + (++n)), ath = { $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/athletes/${aid}?lang=en&region=us` };
          ids[aid] = x.pl.id;
          for (const l of w.eval('statLines')(x)) { if (l.prob) { items.push({ type: { id: '31' }, athlete: ath }); continue; }
            if (!WANT.includes(l.stat)) continue;
            const L = lineFor(x, l); (lines[x.pl.id] ??= {})[l.stat] = L;
            items.push({ type: { id: mainT[l.stat] }, athlete: ath, current: { target: { value: L } } }, { type: { id: mainT[l.stat] }, athlete: ath, current: { target: { value: L } } });
            for (const r of l.rungs.slice(0, -1)) items.push({ type: { id: mileT[l.stat] }, athlete: ath, current: { target: { value: r.k } } }); } }
        P.espn_ids = Object.assign({}, keep.ids || {}, ids);
        /* the week's scoreboard: DraftKings' game lines on every game, g's moved from the published */
        const toE = { WAS: 'WSH', LA: 'LAR' }, eab = t => toE[t] || t, fa = v => (v > 0 ? '+' : '') + v;
        const evOf = (x, i) => { const lk = oc => ({ href: `https://sportsbook.draftkings.com/gateway?preurl=${encodeURIComponent(`https://sportsbook.draftkings.com/event/${80000 + i}?outcomes=0SM${i}${oc}`)}` });
          const spA = -(2.5 + i % 2), mlA = -140 - i, mlH = 118 + i, tot = 43.5 + i;
          return { id: String(9300 + i), date: w.eval('kickoff')(x).toISOString(), competitions: [{ competitors: [{ homeAway: 'home', team: { abbreviation: eab(x.h) } }, { homeAway: 'away', team: { abbreviation: eab(x.a) } }],
            odds: [{ provider: { id: '100' }, moneyline: { home: { close: { odds: fa(mlH), link: lk('MH') } }, away: { close: { odds: fa(mlA), link: lk('MA') } } },
              pointSpread: { home: { close: { line: fa(-spA), odds: '-106', link: lk('SH') } }, away: { close: { line: fa(spA), odds: '-114', link: lk('SA') } } },
              total: { over: { close: { line: 'o' + tot, odds: '-108', link: lk('TO') } }, under: { close: { line: 'u' + tot, odds: '-112', link: lk('TU') } } } }] }] }; };
        const evs = games.map(evOf), evId = x => evs[games.indexOf(x)].id;
        const props = u => { const m = /\/events\/(\d+)\/competitions\/\d+\/odds\/100\/propBets\?(.*)$/.exec(u); return m ? { eid: m[1], q: new URLSearchParams(m[2]) } : null; };
        const pageOf = (its, q) => { const pg = +q.get('page') || 1; return { code: 200, body: { count: its.length, pageIndex: pg, pageSize: 1000, pageCount: Math.ceil(its.length / 1000), items: its.slice((pg - 1) * 1000, pg * 1000) } }; };
        const full = u => { if (/\/scoreboard\?/.test(u)) return { code: 200, body: { events: evs } };
          const p = props(u); if (p) { if (p.eid === evId(g)) return pageOf(items, p.q); if (gN && p.eid === evId(gN)) return { code: 404, body: { error: { message: 'No propBets found', code: 404 } } };
            if (gF && p.eid === evId(gF)) return { reject: true }; return pageOf([], p.q); }
          return { code: 404, body: {} }; };
        w.fetch = (u, o) => { const s2 = String(u); if (!esp(s2)) return f0(u, o); net.log.push({ url: s2, cache: o && o.cache, headers: o && o.headers }); ALL_CALLS.push('GET ' + s2); return ans(net.route(s2)); };
        net.route = full; reset(); w.eval('renderParlay()'); await wait(30);
        /* the press, from the Parlay Builder */
        await press(d.querySelector('#pbPanel [data-espn-refresh="week"]'));
        const LV = w.eval('ESPN_LIVE'), blk = (LV[wk] || {})[g.id];
        chk(!!blk && net.log.filter(x => /\/scoreboard\?/.test(x.url)).length === 1 && net.log.every(x => x.cache === 'no-store' && !x.headers),
          `the press did not read ${g.id}'s stand-in lines on one scoreboard and plain no-store requests: ${net.log.map(x => x.url.replace(/https:\/\/[^/]+/, '')).slice(0, 4).join(' ')}`);
        { const st = txt(d.querySelector('#pbPanel [data-espn-status="week"]')), exp = `DraftKings’ lines from ESPN, read ${clk(Date.parse(blk && blk.at))}: player prices estimated from the line` + (gN ? '; 1 game has no lines posted yet' : '') + (gF ? '; couldn’t reach ESPN for 1 game: its published prices stand' : '') + '.';
          chk(st === exp, `the status line after the press reads "${st}", not "${exp}"`);
          chk(d.activeElement && d.activeElement.dataset && d.activeElement.dataset.espnRefresh === 'week', 'the focus did not stay on the Refresh odds button through the redraw'); }
        /* DraftKings' game lines, real, from the press */
        { const o = ESPN_RULE.oddsOf(evs[games.indexOf(g)], g), tl = w.eval('pricedLegs')([g]).filter(l => l.grp === 'TEAM');
          chk(Object.entries(o.lines).every(([k, v]) => g[k] === v) && g.ls === 'dk' && tl.length > 0 && tl.every(l => l.src === 'real' && l.price === (l.stat === 'ml' ? (l.team === g.h ? o.lines.mlh : o.lines.mla) : (l.team === g.h ? o.lines.sph : o.lines.spa))),
            `${g.id}'s game lines are not DraftKings' as the press read them, real: ${JSON.stringify(KEYS.map(k => g[k]))} / ${tl.map(l => l.label + ' ' + l.price + ' ' + l.src).join(', ')}`); }
        /* the game's page: each est. price the rule's, marked est. with what it is priced from */
        S.ui.showRungs = true; S.ui.showAll = false; S.ui.open = {}; for (const tm in ro) for (const x of ro[tm].players) S.ui.open[x.pl.id] = true; S.ui.game = g.id;
        w.eval('renderGame()'); await wait(30);
        const view = d.getElementById('gameView'), at = blk.at, gst = view.querySelector(`[data-espn-status="${g.id}"]`);
        chk(!!gst && txt(gst).startsWith('DraftKings’ lines from ESPN, read '), 'the game page\'s status line does not say when DraftKings\' lines were read: ' + txt(gst));
        const row = sel => [...view.querySelectorAll(sel)].map(i => i.closest('tr')).find(tr => tr && !tr.closest('.gsugg')) || null;
        let mainSeen = false, untSeen = false, unlSeen = false, tdSeen = false;
        for (const tm in ro) for (const x of ro[tm].players) { if (!x.starter) continue;
          const base = { gid: g.id, week: g.w, pid: x.pl.id, team: tm, opp: x.opp };
          for (const l of w.eval('statLines')(x)) {
            if (l.prob) { const own = ESR.price({ ...base, stat: 'any_td', k: 1, side: 'over', main: false }), tr = row(`input[data-leg="${g.id}|${x.pl.id}|any_td"][data-k="1"]`), c = tr && tr.querySelector('td.num.est');
              if (!own) continue; nEst++; tdSeen = true;
              chk(!!c && txt(c) === fmt(own.price) + 'est.' && c.dataset.est === 'dkline' && c.title.startsWith(`DraftKings’ line from ESPN, read ${when(at)}; the price is our estimate (typically within`),
                `${x.pl.n}'s anytime touchdown from DraftKings' line is not ${fmt(own.price)} est. with its title: "${txt(c)}" "${c ? c.title : ''}"`); continue; }
            if (!(lines[x.pl.id] || {})[l.stat]) continue;
            const L = lines[x.pl.id][l.stat], tested = ['passing_yards', 'rushing_yards', 'receiving_yards', 'receptions'].includes(l.stat);
            for (const side of ['over', 'under']) { const own = ESR.price({ ...base, stat: l.stat, k: L, side, main: true }), tr = row(`input[data-leg="${g.id}|${x.pl.id}|${l.stat}"][data-main="1"][data-side="${side}"]`), c = tr && tr.querySelector('td.num.est'); nEst++;
              chk(!!own && !!tr && tr.classList.contains('est-line') && txt(tr.querySelector('.thr')) === `${side === 'under' ? 'Under' : 'Over'} ${L}` && txt(c) === fmt(own.price) + 'est.' && c.dataset.est === 'dkline'
                && c.title.startsWith(`DraftKings’ line from ESPN, read ${when(at)}; the price is our estimate (`) && c.title.includes(tested ? 'typically within 0.5 points on yards' : 'untested on this market'),
                `${x.pl.n}'s ${l.stat} ${side} ${L} from DraftKings' line is not drawn as its main line at ${own ? fmt(own.price) : '?'} est., titled ${tested ? 'with how close it has been' : 'untested'}: "${txt(tr)}" "${c ? c.title : ''}"`);
              if (tested) mainSeen = true; else untSeen = true; }
            const blkEl = row(`input[data-leg="${g.id}|${x.pl.id}|${l.stat}"][data-main="1"]`), h4 = blkEl && blkEl.closest('.statblk') && blkEl.closest('.statblk').querySelector('h4 em.mline');
            chk(txt(h4) === `DraftKings line ${L}`, `${x.pl.n}'s ${l.stat} block does not name DraftKings' line ${L}: ${txt(h4)}`);
            for (const r of l.rungs) { const own = ESR.price({ ...base, stat: l.stat, k: r.k, side: 'over', main: false }), tr = row(`input[data-leg="${g.id}|${x.pl.id}|${l.stat}"][data-k="${r.k}"]:not([data-main])`), c = tr && tr.querySelector('td.num.est');
              if (!own || !tr) continue; nEst++;
              chk(txt(c) === fmt(own.price) + 'est.' && c.dataset.est === 'dkline' && (own.listed ? !c.title.startsWith('Not on DraftKings') : c.title.startsWith('Not on DraftKings')),
                `${x.pl.n}'s ${r.k}+ ${l.stat} from DraftKings' line is not ${fmt(own.price)} est.${own.listed ? '' : ', marked not on DraftKings'}: "${txt(c)}" "${c ? c.title : ''}"`);
              if (!own.listed) unlSeen = true; } } }
        chk(mainSeen && untSeen && unlSeen && tdSeen, `the stand-in read drew no ${[!mainSeen && 'tested main line', !untSeen && 'untested main line', !unlSeen && 'rung DraftKings does not list', !tdSeen && 'touchdown'].filter(Boolean).join(', ')} from DraftKings' line`);
        S.ui.game = null; w.eval('closeGameModal()');
        /* the suggested parlays on that game alone, players only: a tested leg from the read counts as a
           book price (here a level holds one), an untested one never, each marked est. on its card */
        S.ui.pb.off = games.filter(x => x.id !== g.id).map(x => x.id).concat(w.eval('pbGames()').filter(x => String(x.w) !== wk).map(x => x.id)); for (const k of ['ml', 'ats', 'total']) S.ui.pb.k[k] = false; S.ui.pb.k.over = true; S.ui.pb.k.under = true;
        w.eval('PB_CACHE=new Map(); PB_VIEW={sig:null,key:null,t:{}}; renderParlay()'); await wait(40);
        const r = w.eval('getPbTiers()'), taken = takenRule(w), legsAll = r.tiers.filter(t => t.legs).flatMap(t => t.legs), UNTESTED = l => ['completions', 'carries'].includes(l.stat) || (!l.main && l.stat === 'receptions');
        nLev = legsAll.filter(l => l.src === 'dkline').length;
        chk(nLev > 0, 'with DraftKings\' lines read by Refresh odds and no price of its own, no level on the game holds a leg priced from them: ' + r.tiers.map(t => t.why || t.legs.map(l => l.label + ' ' + l.src).join('+')).join(' / '));
        chk(legsAll.every(taken) && !legsAll.some(UNTESTED), 'a level holds a leg priced from DraftKings\' line that is not the rule\'s, or of a kind never suggested (completions, carries, a receptions rung): ' + legsAll.filter(l => !taken(l) || UNTESTED(l)).map(l => l.name + ' ' + l.label + ' ' + l.src).join(', '));
        chk(!w.eval('pricedLegs')([g]).some(l => l.src === 'dkline' && (UNTESTED(l) || !taken(l))) && !w.eval('gameLegPool')(g).some(l => l.src === 'dkline' && (UNTESTED(l) || !taken(l))),
          'the lines a suggestion or a game hand is built from hold an untested leg from DraftKings\' line, or one not the rule\'s');
        const pnl = d.getElementById('pbPanel');
        for (const t of r.tiers.filter(t => t.legs)) { const c = pnl.querySelector(`.pb-tier.${t.id}`), li = c ? [...c.querySelectorAll('.pb-legs li')] : [], nd = t.legs.filter(l => l.src === 'dkline').length;
          chk(li.length === t.legs.length && t.legs.every((l, i) => { const m = li[i].querySelector('.pr i.est'); return l.src === 'dkline' ? !!m && m.title.startsWith('DraftKings’ line from ESPN, read ') : !m; })
            && txt(c.querySelector('.pb-nums').children[1].querySelector('span')) === (nd ? 'price, est.' : 'price') && !!c.querySelector('.pb-espnline') === nd > 0,
            `the ${t.id} card does not mark est. exactly its legs priced from DraftKings' line, with their title, its price est. and its line on them`); }
        chk(txt(pnl).includes('A player leg marked est. is priced from DraftKings’ line read on ESPN by Refresh odds, where DraftKings’ own price is not on file or its line has moved since: DraftKings’ lines as read ' + when(at) + '; prices estimated.'),
          'the panel does not say what a leg marked est. is and when DraftKings\' lines were read');
        /* Finish on a level with one: the card prices it as estimated and names it to add by hand */
        const tE = r.tiers.find(t => t.legs && t.legs.some(l => l.src === 'dkline'));
        if (tE) { const m = w.PARLAY_CARD.fromTier('pb', tE.id), s1 = w.PARLAY_CARD.linkText(m);
          const miss = m.dk.miss.filter(x => tE.legs[x.n - 1].src === 'dkline');
          chk(m.priceNote === 'estimated price' && m.legs.every((x, i) => x.tag === (tE.legs[i].src === 'real' ? 'book' : 'est.')) && miss.length === tE.legs.filter(l => l.src === 'dkline').length
            && miss.every(x => x.why === 'price estimated from DraftKings’ line read on ESPN; its DraftKings id is not read') && / \(estimated price\)$/.test(s1.title)
            && miss.every(x => s1.text.includes(`${x.n}. ${x.who} ${x.what} (price estimated from DraftKings’ line read on ESPN, id not read)`)),
            `the parlay card on the ${tE.label} level does not price it as estimated, mark its legs from DraftKings' line est., or name each to add by hand, its id not read: ${m.priceNote} / ${m.dk.miss.map(x => x.n + ' ' + x.why).join(' / ')} / ${s1.title}`);
          /* and in the builder: the leg marked est., its fair chance est., and when the lines were read */
          const dl = tE.legs.find(l => l.src === 'dkline'), { key, thin, ...one } = dl; S.parlay = { [key]: one }; w.eval('save(); renderParlay()'); await wait(30);
          const row1 = d.querySelector('#parlayBody tr.legrow'), cell = row1 && row1.querySelectorAll('td')[4], lf = row1 && row1.querySelector('.legfair'), f = fairRule(w)(dl);
          chk(!!cell && txt(cell) === `${fmt(dl.price)} est.` && !!lf && !!f && txt(lf) === `fair ${(f.p * 100).toFixed(0)}% est.` && txt(d.querySelector('#parlayBody [data-espn-read]')).startsWith('DraftKings’ lines as read '),
            `the builder does not mark ${dl.name} ${dl.label} est. with its estimated fair chance, or say when the lines were read: "${txt(cell)}" "${txt(lf)}"`); }
        /* a game's page reads that game alone */
        S.ui.game = g.id; w.eval('renderGame()'); await wait(20); net.log = [];
        await press(d.querySelector(`#gameView [data-espn-refresh="${g.id}"]`));
        { const us = net.log.map(x => x.url), pb = us.filter(u => props(u));
          chk(us.filter(u => /\/scoreboard\?/.test(u)).length === 1 && pb.length === 1 && props(pb[0]).eid === evId(g) && us.length === 2,
            `${g.id}'s page's Refresh odds read more than its game: ${us.map(u => u.replace(/https:\/\/[^/]+/, '')).join(' ')}`); }
        S.ui.game = null; w.eval('closeGameModal()');
        /* ESPN not answering at all, and a week with no player lines posted, as the status line words them */
        reset(); net.route = () => ({ reject: true }); w.eval('renderParlay()'); await wait(20);
        await press(d.querySelector('#pbPanel [data-espn-refresh="week"]'));
        { const n0 = w.eval('pbGames()').length, st = txt(d.querySelector('#pbPanel [data-espn-status="week"]'));
          chk(st === `Prices as published ${when(P.baked_at)}; couldn’t reach ESPN for ${n0} game${n0 === 1 ? '' : 's'}: ${n0 === 1 ? 'its' : 'their'} published prices stand.` && !Object.keys(w.eval('ESPN_LIVE')).length && games.every(x => KEYS.every(k => JSON.stringify(x[k]) === JSON.stringify(before[x.id][k]))),
            `with ESPN not answering, the status line reads "${st}", or a read or a game line changed`); }
        reset(); net.route = u => /\/scoreboard\?/.test(u) ? { code: 200, body: { events: evs } } : { code: 404, body: { error: { message: 'No propBets found', code: 404 } } }; w.eval('renderParlay()'); await wait(20);
        await press(d.querySelector('#pbPanel [data-espn-refresh="week"]'));
        { const ids0 = w.eval('pbGames()').map(x => x.id), n0 = ids0.filter(id => evs.some((e, i) => games[i].id === id)).length, rest = ids0.length - n0, st = txt(d.querySelector('#pbPanel [data-espn-status="week"]'));
          const exp = `DraftKings’ game lines from ESPN, read ${clk(w.eval('ESPN_GL')[g.id].at)}; ${n0} game${n0 === 1 ? ' has' : 's have'} no lines posted yet` + (rest ? `; couldn’t reach ESPN for ${rest} game${rest === 1 ? '' : 's'}: ${rest === 1 ? 'its' : 'their'} published prices stand` : '') + '.';
          chk(st === exp, `with no player lines posted, the status line reads "${st}", not "${exp}"`); }
      } finally {
        w.fetch = f0; reset(); w.__plStub = plStub; w.eval('pricedLegs=window.__plStub'); delete w.__plStub;
        const put = (o, k, v) => { if (v === undefined) delete o[k]; else o[k] = v; };
        put(P, 'espn_ids', keep.ids); put(P.mkt, wk, keep.mk); put(S.odds, g.id, keep.o); put(P, 'dk', keep.dk);
        S.ui.pb = keep.pb; S.parlay = keep.parlay; Object.assign(S.ui, { game: keep.ui.game, open: keep.ui.open, showRungs: keep.ui.rungs, showAll: keep.ui.all });
        w.eval('PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_VIEW={sig:null,key:null,t:{}}; save(); renderSlate(); renderParlay(); closeGameModal()'); await wait(30); }
      console.log(`Refresh odds, on stand-in ESPN answers for week ${wk}: ${nEst} est. prices on ${g.id}'s page the rule's, ${nLev} legs from them on its levels, the card, the builder, a game page's own read, a failing ESPN and no lines posted`); } }

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
  /* ---- on a phone the tab bar scrolls sideways, and the chosen tab is brought into it ----
     jsdom lays nothing out, so the bar is drawn as a phone draws it: 358px of bar, each button
     110px with a 6px gap, scrolled by its scrollLeft (held between 0 and its width less the
     bar's). Opened on #xparlays (where the old Live Parlays links land), then sent to every
     tab's address in turn and tapped, the chosen button must sit inside the bar each time */
  { const BAR = { left: 16, width: 358 }, BW = 110, GAP = 6;
    const R = (l, wd) => ({ left: l, right: l + wd, width: wd, top: 0, bottom: 40, height: 40, x: l, y: 0 });
    const seed = w2 => {
      const max = el => Math.max(0, el.children.length * (BW + GAP) - GAP + 10 - BAR.width);
      Object.defineProperty(w2.HTMLElement.prototype, 'scrollLeft', { configurable: true,
        get() { return this.__sl || 0; }, set(x) { this.__sl = this.id === 'tabs' ? Math.max(0, Math.min(+x || 0, max(this))) : +x || 0; } });
      const was = w2.Element.prototype.getBoundingClientRect;
      w2.Element.prototype.getBoundingClientRect = function () {
        if (this.id === 'tabs') return R(BAR.left, BAR.width);
        const p = this.parentElement;
        if (p && p.id === 'tabs') return R(BAR.left + 5 + [...p.children].indexOf(this) * (BW + GAP) - p.scrollLeft, BW);
        return was.call(this); };
      w2.__vscroll = 0; for (const f of ['scrollTo', 'scrollBy']) { w2[f] = () => { w2.__vscroll++; }; }
      w2.Element.prototype.scrollIntoView = function () { if (this.closest && this.closest('#tabs')) w2.__vscroll++; }; };
    const T = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#xparlays', null, false, { seed });
    await wait(200);
    const nav = T.d.getElementById('tabs'), inBar = b => { const n = nav.getBoundingClientRect(), r = b.getBoundingClientRect(); return r.left >= n.left && r.right <= n.right; };
    const sel = () => T.d.querySelector('#tabs button[aria-selected="true"]');
    chk(!T.timedOut && T.errs.length === 0, 'the page broke with the tab bar laid out as a phone lays it: ' + T.errs.join('; '));
    chk(txt(sel()) === 'X Parlays' && nav.scrollLeft > 0 && inBar(sel()), `opened on #xparlays at phone width, the X Parlays button is not brought into the tab bar (scrollLeft ${nav.scrollLeft})`);
    const seen = [];
    for (const b of [...nav.querySelectorAll('button')].reverse()) {
      T.w.location.hash = '#' + b.dataset.tab; await wait(60);
      seen.push(b.dataset.tab + (sel() === b && inBar(b) ? '' : ' (off the bar)')); }
    chk(seen.every(s => !/off the bar/.test(s)), 'sent to a tab\'s address at phone width, its button is not brought into the tab bar: ' + seen.join(', '));
    { const last = [...nav.querySelectorAll('button')].pop(); T.w.location.hash = '#pickems'; await wait(60); last.click(); await wait(30);
      chk(sel() === last && inBar(last), 'a tab tapped at the bar\'s cut-off edge is not brought into it'); }
    chk(T.w.__vscroll === 0, 'bringing a tab into the bar scrolled the page, not the bar');
    T.w.close(); }
  /* ---- the suggested parlays' choices and the amount bet are the visitor's own, and come back
     with the page; a saved amount that is not one reads as $20 ---- */
  for (const [saved, want] of [[12.5, 12.5], ['<b>', 20]]) {
    const pb = { k: { ml: false, ats: false, total: false, over: true, under: true }, off: [], gx: false };
    const R = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { seed: w2 => w2.localStorage.setItem(PROP_KEY, JSON.stringify({ stake: saved, ui: { pb } })) });
    await wait(300);
    const P = R.d.getElementById('pbPanel'), on = R.d.querySelector('#pbPanel [data-pb-mix].on'), games = R.w.eval('typeof pbGames') === 'function' ? R.w.eval('pbGames()').length : 0;
    chk(!R.timedOut && R.errs.length === 0 && JSON.stringify(R.w.eval('S').ui.pb) === JSON.stringify(pb), 'the suggested parlays\' saved choices did not come back with the page: ' + JSON.stringify(R.w.eval('S').ui.pb));
    chk(R.w.eval('typeof pbGames') === 'function' && (!games) || (!!on && on.dataset.pbMix === 'players' && [...P.querySelectorAll('[data-pb-kind]')].every(cb => cb.checked === ['over', 'under'].includes(cb.dataset.pbKind)) && !P.querySelector('details.pb-games').open),
      'the panel does not open on the visitor\'s own choices (Players only, the games list shut)');
    { const box = R.d.getElementById('pbStake'), shown = want % 1 ? want.toFixed(2) : String(want);
      chk(R.w.eval('S').stake === want && (!games || (!!box && box.value === shown)) && !/NaN/.test(txt(P)),
        `a saved amount of ${JSON.stringify(saved)} came back as ${JSON.stringify(R.w.eval('S').stake)}, the Bet amount box showing ${box ? JSON.stringify(box.value) : 'nothing'}, not ${shown}`); }
    R.w.close(); }

  /* ---- the suggestions record at the foot of the Parlay Builder's panel: props/data/suggest_ledger.json,
     asked for beside the payload once a load with no-store, the real file drawn as it stands, a made-up
     one level by level and none at all drawing nothing. The numbers are worked out here from the
     entries' grades: per level the parlays graded won or lost (a push and a pending parlay apart), won,
     the wins expected by the fair chance and by the model's, the units on $1 (a win a push shortened at
     what it paid), each parlay once however many waves froze it (its season's week, level and legs in
     any order), counted from the last ---- */
  { const recOf = L => { const o = {}; for (const id of ['safe', 'med', 'aggr', 'xtrm']) o[id] = { g: 0, w: 0, f: 0, fn: 0, m: 0, u: 0, push: 0 };
      const once = new Map(), E = L.entries || {};
      for (const k of Object.keys(E).sort()) for (const t of E[k].tiers || []) { const g = (E[k].grade || {})[t.id]; if (!g || !o[t.id] || !t.legs) continue;
        once.set(k.split('|').slice(0, 2).join('|') + '#' + t.id + '#' + t.legs.map(l => [l.gid, l.pid, l.stat, l.side, l.k, l.main ? 1 : 0].join('|')).sort().join('+'), { t, g }); }
      for (const { t, g } of once.values()) { const r = o[t.id];
        if (g.result === 'push') { r.push++; continue; } if (g.result !== 'won' && g.result !== 'lost') continue;
        r.g++; if (g.result === 'won') r.w++; r.m += t.p; if (t.fair != null) { r.f += t.fair; r.fn++; } r.u += (g.result === 'won' ? g.payout : 0) - 1; }
      return o; };
    const rowsWant = L => { const o = recOf(L), lab = { safe: 'Safe', med: 'Medium', aggr: 'Aggressive', xtrm: 'Extreme' };
      return Object.entries(o).map(([id, r]) => [lab[id], String(r.g), String(r.w), r.g ? r.f.toFixed(1) + (r.fn < r.g ? '*' : '') : '\u2013', r.g ? r.m.toFixed(1) : '\u2013',
        r.g || r.push ? (r.u > 0.0005 ? '+' : r.u < -0.0005 ? '\u2212' : '') + Math.abs(r.u).toFixed(2) : '\u2013'].join('|')).join(' / '); };
    const rowsShown = D => [...D.querySelectorAll('#pbRec tbody tr')].map(tr => [...tr.children].map(c => c.textContent.trim()).join('|')).join(' / ');
    const ask = calls.filter(c => /suggest_ledger\.json/.test(c.url));
    chk(ask.length === 1 && /^\.\.\/props\/data\/suggest_ledger\.json\?t=\d+$/.test(ask[0].url) && ask[0].method === 'GET' && ask[0].cache === 'no-store',
      'the page did not ask for the suggestions record beside the payload, once, with no-store: ' + JSON.stringify(ask));
    { const R = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay'); await wait(300);
      const el = R.d.getElementById('pbRec'), real = LEDGER_REAL ? JSON.parse(LEDGER_REAL) : null;
      chk(!!el && !!R.d.querySelector('#pbCard #pbRec') && (real ? !el.hidden && /^Suggestions record/.test(txt(el)) && /starts on 12 October 2026/.test(txt(el)) : el.hidden),
        'the real suggestions record is not drawn at the foot of the panel: ' + txt(el));
      if (real) { const any = Object.values(recOf(real)).some(r => r.g);
        chk(any ? rowsShown(R.d) === rowsWant(real) : /No suggested parlay has been graded yet/.test(txt(el)), `the real record reads ${rowsShown(R.d) || txt(el)}, not ${rowsWant(real)}`); }
      chk(!R.timedOut && R.errs.length === 0 && !/NaN|undefined/.test(txt(el)), 'the page threw, or the record reads NaN: ' + R.errs.join('; '));
      R.w.close(); }
    { const T = (id, n, p, fair, dec, tag) => ({ id, n, p, fair, dec, legs: Array.from({ length: n }, (_, i) => ({ gid: 'g' + tag + i, week: 5, pid: 'p' + tag + id + i, stat: 'receptions', k: 3.5, side: 'over', main: true, price: -110, src: 'real' })) });
      const G = (result, n, payout, legs) => ({ result, legs: legs || Array(n).fill(result === 'lost' ? 'loss' : result === 'push' ? 'void' : result === 'pending' ? null : 'win'), ...(payout != null ? { payout } : {}) });
      /* Thursday's entry froze the 4pm Extreme too, its legs the other way round and at an older price */
      const thu = T('xtrm', 5, 0.05, 0.03, 28, 'b'); thu.legs.reverse();
      const FIX = { how: 'the smoke\'s own', since: '2026-10-12', entries: {
        '2026|05|2026-10-09T00:15:00Z': { kickoff: '2026-10-09T00:15:00Z', tiers: [thu], grade: { xtrm: G('won', 5, 28) } },
        /* the Medium won with a leg pushed: paid 3.2 on the two left, not its 5.6 */
        '2026|05|2026-10-11T13:30:00Z': { kickoff: '2026-10-11T13:30:00Z', tiers: [T('safe', 2, 0.47, 0.36, 2.9, 'a'), T('med', 3, 0.33, 0.24, 5.6, 'a'), T('aggr', 4, 0.16, 0.11, 10.4, 'a'), T('xtrm', 5, 0.07, 0.05, 26, 'a')],
          grade: { safe: G('won', 2, 2.9), med: G('won', 3, 3.2, ['win', 'push', 'win']), aggr: G('lost', 4, 0), xtrm: G('push', 5, 1) } },
        '2026|05|2026-10-11T17:00:00Z': { kickoff: '2026-10-11T17:00:00Z', tiers: [T('safe', 2, 0.55, 0.41, 2.4, 'b'), T('med', 3, 0.29, null, 6, 'b'), T('aggr', 4, 0.14, 0.1, 11, 'b'), T('xtrm', 5, 0.06, 0.04, 31, 'b')],
          grade: { safe: G('lost', 2, 0), med: G('lost', 3, 0), aggr: G('pending', 4), xtrm: G('won', 5, 31) } } } };
      const R = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { ledger: FIX }); await wait(300);
      chk(rowsShown(R.d) === rowsWant(FIX) && rowsShown(R.d) === 'Safe|2|1|0.8|1.0|+0.90 / Medium|2|1|0.2*|0.6|+1.20 / Aggressive|1|0|0.1|0.2|\u22121.00 / Extreme|1|1|0.0|0.1|+30.00',
        `a made-up record reads ${rowsShown(R.d)}, not ${rowsWant(FIX)}`);
      chk(/1 parlay is waiting on its games or stats/.test(txt(R.d.getElementById('pbRec'))) && /1 push/.test(txt(R.d.getElementById('pbRec'))), 'the made-up record does not count its pending parlay and its push apart');
      R.w.close();
      const N = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { ledger: 404 }); await wait(300);
      chk(!!N.d.getElementById('pbRec') && N.d.getElementById('pbRec').hidden && !txt(N.d.getElementById('pbRec')), 'with no record file the panel draws one anyway');
      N.w.close(); } }

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

  /* ---- the Game snapshot: its own section, at the end of this file, then the Season Tracker's games
     in it, on stand-in news files ---- */
  await snapshotChecks();
  await newsChecks();
  await friendsChecks();

  /* ---- no page asked the retired store or its sign-in services anything, and nothing any page
     or frame sent was a write ---- */
  chk(ALL_CALLS.length > 100 && BAD_CALLS.length === 0, 'a page asked the retired store or its sign-in services, or sent a write: ' + BAD_CALLS.slice(0, 5).join(' | '));
  chk(!/firebaseio|identitytoolkit|securetoken/.test(HTML), 'the built page still names the retired store or its sign-in services');

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));

/* =====================================================================================
   THE GAME SNAPSHOT (nflbets/build/snapshot.html): the window a tap on a Pick'ems game opens
   (its row is the button). The body above runs this last but one, so the request rule after it
   covers these runs too. The news job's files it reads are 404s here, as on every run but those of
   THE SEASON TRACKER'S GAMES below, which hand it stand-ins.

   Every number the window shows is held to the file it comes from, worked out here on its own:
   each team's record as Team Rankings counts it (betting/state.json's regular-season finals,
   the rating file's where that has more), its Power Rating, rank, change and chance against an
   average team (elo/data/model.json `teams`, ranked by rating), both Overall Offense and Overall
   Defense (`units`), each expected starter's season Elo, rank, shield and Q (players.json and
   matchups.json `lineups` and `q`), in his position's rows and his team's column, the ranked
   players out (each group's `sidelined`), every model's pick, chance and grade (state.json's
   processed, atKickoff and joker, model.json's graded and next, Vegas from the closing
   moneylines), the line, and the Mismatches, which must be the Props tab's own
   (window.eloMismatches, and the bubbles on the Props tab). It opens on a game to come, on a
   game final on the scoreboard and on a graded one; closes on Escape, Close and a click
   outside; keeps Tab inside, in its order, and hands the focus back to the row; reads
   no Elo file a second time; says so in each section when matchups.json, or the ratings, did not
   load while the rest draws; draws a playoff game; lays the position table out fixed, names
   wrapping, and puts every questionable starter's Q inside his own name's box in his team's column
   (the rules and the structure, since jsdom lays nothing out); and gives its modal no top padding
   for the sticky header to stick inside.

   The verdict is held as a visitor reads it: the headline (the Vegas favourite's nickname and the
   spread it is favoured by, or once played the winner and whether it was an upset, the line under
   it) and the confidence pill, which must be the board's own for that game; the model vote, Vegas
   kept apart (how many of the three models agree with it, the dissenters named); the played-game
   note under the score; the header's one-line game bar;
   each answer line a button that opens its card. The cards fold (Model Picks and Team strength
   open on a wide screen, every card folded on a phone) and every number in a folded card, a folded
   or a Starters tab not shown is still the file's; the Starters
   tabs (Offense, Defense, Kicker) hold every group in its tab, move on the arrow keys and keep the
   choice; the edge mark sits on the higher season Elo of each pair of starters and the better unit
   rank in each defensive group's header, nowhere else, and on the verdict's Team Elo and Offense vs
   defense answers on the higher rating and the better rank of each meeting, the side with the edge
   named; the bars are held to the same numbers (each call's lean toward its pick, its length and
   colour, the split bar's two widths); the badges count the players out and the
   Mismatches; every control is at least 44px tall (the rules, again). With every game played
   (--season-over) there is no game to come, and the played-game checks carry it.

   The owner's clean-up of 14 October 2026 is held too: the head is the away team, the middle and
   the home team, the middle holding the score (once there is one), the kickoff line and the
   preview, with no "at" circle, the played note after the head, and under 900px (the rules) the
   teams on one row and the middle under them; each record is the record alone ("3-2", the
   playoffs' "playoffs 1-0" beside it once there are any, held on a made-up graded wild-card
   game), never "this season"; no line names the sources of the
   spread, total and moneylines; Offense vs defense has no note under it, what its ratings rest on
   being the duel boxes' title, its two boxes of a meeting one class and one shape (the better rank's
   tinted, no edge chip; the rules give them one size); the cards run Model Picks, Team strength,
   Stat breakdown, Offense vs defense, Mismatches, Starters; and there is no Sources card, no
   publish times and no links away from the window. And the owner's trim of the same day: the
   first card is titled Model Picks; it, Team strength and Offense vs defense carry no summary in
   their title and no note under them (Team strength's star note alone, where a rating predates a
   final), Team strength has no Tier row; each possession is titled "<Nickname> Possession", centred
   (the rules), with no stats fold under it; and the Starters card's two teams sit under its tabs,
   directly over the table.
   ===================================================================================== */
async function snapshotChecks() {
  /* st is the state the page was booted on: the published one, but for the made-up graded wild-card
     game, held on its own copy */
  let st = STATE;
  const eloP = JSON.parse(ELO_P), eloM = JSON.parse(ELO_M), eloMu = JSON.parse(ELO_MU);
  /* the verdict, then a folding card each */
  /* the Stat breakdown before Offense vs defense, and no Sources card (the owner's calls, 14 October 2026) */
  const SNAP_SECS = ['gsMatch', 'gsCalls', 'gsTeams', 'gsStats', 'gsUnits', 'gsMism', 'gsPos'], SNAP_CARDS = SNAP_SECS.slice(1);
  /* Every call's rows, in order: Vegas the baseline, then the three models on the site (the Challenger
     Model and the Broly Model came off it in October 2026, the owner's call) */
  const SNAP_MODELS = ['vegas', 'alpha', 'joker', 'elo'];
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
  /* the playoffs' record, from the schedule's playoff finals ('' before there are any) */
  const poOf = t => { const r = [0, 0, 0];
    for (const g of st.schedule) if (g.result != null && !reg(g) && (g.home_team === t || g.away_team === t)) { const m = g.home_team === t ? g.result : -g.result; r[m > 0 ? 0 : m < 0 ? 1 : 2]++; }
    return r[0] + r[1] + r[2] ? r[0] + '-' + r[1] + (r[2] ? '-' + r[2] : '') : ''; };
  const tRank = t => Object.entries(eloM.teams || {}).sort((a, b) => b[1].elo - a[1].elo).findIndex(([k]) => k === t) + 1;
  const im = x => x < 0 ? -x / (-x + 100) : 100 / (x + 100);
  const unitsOn = !!(eloM.units && eloM.units.off && Object.values(eloM.units.off).some(v => v.games || v.carried));
  /* every model's call on a game, from the files: the graded one, else the one published */
  const callsOf = g => { const pr = st.processed[g.game_id], ak = (st.atKickoff || {})[g.game_id];
    const one = x => x && x.pick ? { pick: x.pick, p: x.pHome == null ? null : (x.pick === g.home_team ? +x.pHome : 1 - x.pHome), correct: x.correct } : null;
    const o = (st.odds || {})[g.game_id], sp = g.spread_line != null && isFinite(g.spread_line) ? +g.spread_line : null;
    let vegas = null;
    if (o && isFinite(o.home) && isFinite(o.away) && o.home && o.away) { const ph = im(+o.home) / (im(+o.home) + im(+o.away)); vegas = { pick: ph >= 0.5 ? g.home_team : g.away_team, p: Math.max(ph, 1 - ph) }; }
    else if (sp != null && sp !== 0) vegas = { pick: sp > 0 ? g.home_team : g.away_team, p: null };
    const eg = (eloM.graded || []).find(x => x.game_id === g.game_id);
    const en = !eg && eloM.next && +eloM.next.season === +st.season ? (eloM.next.games || []).find(x => x.game_id === g.game_id) : null, e = eg || en;
    return { vegas, alpha: pr ? one(pr) : one(ak), joker: one(pr && pr.joker) || one((st.joker || {})[g.game_id]),
      elo: e ? { pick: e.pick, p: e.pick === g.home_team ? e.p_home : 1 - e.p_home, correct: eg ? eg.correct : undefined } : null }; };
  /* open a game's snapshot from the board (its week picked first): a tap on its row, which is the
     button (btn: the row, which the focus goes back to) */
  const open = async (R, g) => {
    const sel = R.d.getElementById('pkWeek');
    if (+sel.value !== +g.week) { sel.value = String(g.week); sel.dispatchEvent(new R.w.Event('change')); await wait(40); }
    const card = R.d.querySelector(`.pk-game[data-game="${g.game_id}"]`); if (!card) return { card: null, btn: null };
    card.focus(); card.click(); await wait(150);
    const md = R.d.getElementById('gsModal');
    return md && !md.hidden ? { card, btn: card, md } : { card, btn: null };
  };
  /* each Q in its own player's name box, after the name, in his team's column. Set beside the
     name box as a flex item of its own, a Q was pushed, when the name wrapped on a phone, to the
     inner edge of its half, beside the other team's player ('Malik Nabers Q' for Terry McLaurin's
     Q; nearer the other player than its own for 69 of the season's 510 Q's at 390px and 109 at 360
     in Chromium, none at 1280). jsdom lays nothing out, so the structure that keeps
     them together is held: the Q's parent is the box whose own text is the player's name, not a
     flex or grid box, the Q its only element and its last node, laid out inline, in the cell of the
     column of the team whose lineup he is in; and a questionable starter has one Q, no other */
  const qPlaced = (R, md, g) => {
    const L = eloMu.lineups || {}, Q = eloMu.q || {}, a = g.away_team, h = g.home_team, bad = [], sides = new Set();
    const pills = [...md.querySelectorAll('#gsPos .pe-q')];
    for (const pill of pills) {
      const pl = pill.closest('.gs-pl[data-pid]'), pid = pl ? pl.dataset.pid : null, e = pid ? eloP.players[pid] : null;
      const who = e ? e.name : pid || 'a Q outside any player';
      const box = pill.parentElement, own = box ? [...box.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : '';
      const disp = box ? R.w.getComputedStyle(box).display : '';
      if (!pl || !box || !pl.contains(box) || (e ? own !== e.name : !own)) bad.push(`${who}'s Q is not inside his name's box (its box reads '${own}')`);
      else if (/flex|grid/.test(disp) || box.children.length !== 1 || box.lastChild !== pill || /^(block|flex|grid|table)$/.test(R.w.getComputedStyle(pill).display)) bad.push(`${who}'s Q is not inline after his name (its box is ${disp || 'unstyled'}, with ${box.children.length} elements)`);
      const side = [a, h].find(t => ((L[t] || {}).players || []).includes(pid)), td = pill.closest('td');
      if (!side || pl.dataset.team !== side || !td || !td.classList.contains(side === a ? 'gs-a' : 'gs-h')) bad.push(`${who}'s Q is not in ${side || 'his team'}'s column`);
      else sides.add(side === a ? 'away' : 'home');
    }
    for (const pl of md.querySelectorAll('#gsPos .gs-pl[data-pid]')) { const n = pl.querySelectorAll('.pe-q').length;
      if (n !== (Q[pl.dataset.pid] ? 1 : 0)) bad.push(`${(eloP.players[pl.dataset.pid] || {}).name || pl.dataset.pid} has ${n} Q's, the report ${Q[pl.dataset.pid] ? 'one' : 'none'}`); }
    return { n: pills.length, bad, sides };
  };
  /* everything the window shows for a game, against the files; win is the winner when played
     (null on a tie), undefined for a game to come */
  const hold = (R, g, label, win) => {
    const md = R.d.getElementById('gsModal'), q = s => md.querySelector(s), a = g.away_team, h = g.home_team;
    chk(!!md && !md.hidden && !!q('[role="dialog"][aria-modal="true"][aria-labelledby="gsTitle"]') && new RegExp(`${a}.*${h}`).test(txt(R.d.getElementById('gsTitle'))) && R.d.activeElement === R.d.getElementById('gsClose'),
      `snapshot (${label}): the window did not open as a dialog titled with the game, with the focus on Close`);
    chk(SNAP_SECS.every(id => md.querySelector('#' + id)) && !/could not be drawn/.test(txt(md)) && R.errs.length === 0,
      `snapshot (${label}): a section is missing or failed: ${R.errs.join('; ')} ${(txt(md).match(/[^.]*could not be drawn[^.]*/) || [''])[0]}`);
    /* the matchup: records, the line, the score */
    for (const t of [a, h]) chk(txt(q(`[data-gs-rec="${t}"]`)) === recOf(t), `snapshot (${label}): ${t}'s record reads ${txt(q(`[data-gs-rec="${t}"]`))}, Team Rankings counts ${recOf(t)}`);
    /* each record is the record alone (3-2), the playoffs' beside it once there are any ("playoffs 1-0"):
       no words for which games it counts; where the rating file's count is shown, its title says so.
       The parts are held each on its own (the box's text joined them with no space, '4-1playoffs 0-1',
       and a check of the joined text failed every team with a playoff record) */
    for (const t of [a, h]) { const b = q(`[data-gs-rec="${t}"]`), box = b && b.closest('.gs-rec'), po = q(`[data-gs-po="${t}"]`);
      const fromFile = recOf(t) !== recOf(t, false), pw = poOf(t);
      const rest = box ? [...box.childNodes].filter(n => n !== b && n !== po).map(n => n.textContent).join('').trim() : '';
      chk(!!box && txt(b) === recOf(t) && /^\d+-\d+(-\d+)?$/.test(txt(b)) && !rest
        && (pw ? !!po && po.parentElement === box && /^playoffs \d+-\d+(-\d+)?$/.test(txt(po)) && txt(po) === 'playoffs ' + pw : !po)
        && !/season/i.test(txt(box)) && fromFile === !!b.getAttribute('title') && (!fromFile || /Elo file's count/.test(b.getAttribute('title'))),
        `snapshot (${label}): ${t}'s record is not the record alone${pw ? `, with the playoffs' ${pw} beside it` : ''}: '${txt(b)}' | '${txt(po)}'${rest ? ` and '${rest}'` : ''}${b && b.getAttribute('title') ? ` (titled '${b.getAttribute('title')}')` : ''}`); }
    /* the head: the away team, the middle, the home team; the middle the score where there is one, the
       kickoff line, then the preview where there is one; no "at" circle; each team labelled Away or Home
       (a neutral site's listed home team so, and its kickoff line naming the neutral site) */
    { const hero = q('#gsMatch .gs-hero'), kids = hero ? [...hero.children] : [], mid = q('#gsMatch .gs-hero > .gs-mid'), bad = [];
      if (kids.map(x => x.classList.contains('gs-away') ? 'away' : x.classList.contains('gs-home') ? 'home' : x.classList.contains('gs-mid') ? 'mid' : x.className).join() !== 'away,mid,home') bad.push(`the head is ${kids.map(x => x.className).join(' | ')}`);
      const parts = mid ? [...mid.children].map(x => x.classList.contains('gs-sc') ? 'score' : x.classList.contains('gs-when') ? 'when' : x.classList.contains('gs-prev') ? 'preview' : x.className) : [];
      const pw = (win !== undefined ? ['score'] : []).concat('when', q('.gs-prev') ? ['preview'] : []).join();
      if (parts.join() !== pw) bad.push(`the middle holds ${parts.join() || 'nothing'}, not ${pw}`);
      if (md.querySelector('.gs-at') || /^(at|vs)$/m.test(mid ? [...mid.childNodes].map(n => n.textContent.trim()).join('\n') : '')) bad.push('an "at" circle is still drawn');
      const neu = R.w.pkBoard.neutral(g), labs = [...md.querySelectorAll('#gsMatch .gs-team > .gs-lab')].map(txt).join();
      if (labs !== (neu ? 'Away,Home (listed)' : 'Away,Home')) bad.push(`the teams are labelled ${labs}`);
      if (neu && !/a neutral site/.test(txt(q('#gsMatch .gs-when')))) bad.push(`a neutral site's kickoff line reads '${txt(q('#gsMatch .gs-when'))}'`);
      if (q('#gsPast') && q('#gsMatch .gs-hero').nextElementSibling !== q('#gsPast')) bad.push('the played note is not right after the head');
      chk(bad.length === 0, `snapshot (${label}): the head is not the two teams with the score, the kickoff and the preview between them: ${bad.join('; ')}`); }
    /* no line naming the sources of the spread, total and moneylines (the owner's call, 14 October 2026) */
    chk(!q('.gs-src') && !/Moneylines: closing|Spread: nflverse|Spread and total: nflverse|the book's margin out/.test(txt(q('#gsMatch'))),
      `snapshot (${label}): the line still names its sources: ${(txt(q('#gsMatch')).match(/[^.]*(Moneylines: closing|nflverse)[^.]*/) || [''])[0]}`);
    { const sp = g.spread_line != null && isFinite(g.spread_line) ? +g.spread_line : null, o = (st.odds || {})[g.game_id];
      const spTxt = sp == null ? '–' : sp > 0 ? `${h} −${sp}` : sp < 0 ? `${a} −${-sp}` : "Pick'em";
      chk(txt(q('[data-gs-spread]')) === spTxt, `snapshot (${label}): the spread reads ${txt(q('[data-gs-spread]'))}, the file's is ${spTxt}`);
      if (o && o.home && o.away) chk(txt(q('[data-gs-ml]')) === `${a} ${amer(o.away)} · ${h} ${amer(o.home)}`, `snapshot (${label}): the moneylines read ${txt(q('[data-gs-ml]'))}`); }
    if (win !== undefined) chk(!!q('#gsPast') && /before kickoff/.test(txt(q('#gsPast'))) && /as they stand now/.test(txt(q('#gsPast'))) && /^\d+–\d+$/.test(txt(q('[data-gs-score]'))), `snapshot (${label}): a played game does not show its score and say the files are as they stand now`);
    else chk(!q('#gsPast') && !q('[data-gs-score]'), `snapshot (${label}): a game to come shows a score or says it was played`);
    /* every model's call */
    { const C = callsOf(g), bad = [];
      const ids = [...md.querySelectorAll('#gsCalls li.gs-call')].map(li => li.dataset.gsModel).join();
      if (ids !== SNAP_MODELS.join()) bad.push(`Every call's rows are ${ids || 'none'}, not ${SNAP_MODELS.join()}`);
      if (/challenger|broly/i.test(txt(md))) bad.push('the window still names the Challenger Model or the Broly Model');
      for (const id of SNAP_MODELS) {
        const tr = q(`#gsCalls [data-gs-model="${id}"]`), x = C[id];
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
        `snapshot (${label}): ${t}'s Overall ${s === 'off' ? 'Offense' : 'Defense'} is not the file's ${ordinal(v.rank)}, ${v.elo}: ${box ? txt(box).slice(0, 80) : 'missing'}`);
      const cm = box && box.querySelector('[data-gs-carried]'), from = (eloM.units.params || {}).carry_from;
      chk(v.carried ? !!cm && txt(cm) === `carried from ${from}` : !cm,
        `snapshot (${label}): ${t}'s Overall ${s === 'off' ? 'Offense' : 'Defense'} ${v.carried ? `is yet to play and not marked carried from ${from}` : 'has played and is marked carried'}`); }
    /* Overall Offense against Overall Defense: each meeting's two boxes one class and one shape, side by
       side either side of "vs" (the rules give them one size), titled with what the rating rests on, and
       no note under the card, no edge chip: the better rank's box is tinted (gs-better, held below) */
    if (unitsOn) { const bad = [];
      for (const d of md.querySelectorAll('#gsUnits .gs-duel')) { const k = [...d.children], cls = x => [...x.classList].filter(c => c !== 'gs-better').sort().join(' ');
        if (k.length !== 3 || !k[0].classList.contains('gs-ubox') || !k[2].classList.contains('gs-ubox') || !k[1].classList.contains('gs-vsx') || cls(k[0]) !== cls(k[2])) { bad.push(`a meeting is drawn as ${k.map(x => x.className).join(' | ')}`); continue; }
        for (const b of [k[0], k[2]]) if (b.dataset.gsUnit && !/^Overall (Offense|Defense), ranked among the league's \d+: this season's key stats, opponents and home field counted/.test(b.getAttribute('title') || '')) bad.push(`${b.dataset.gsUnit}'s box is titled '${b.getAttribute('title')}'`); }
      if (md.querySelectorAll('#gsUnits .gs-duel').length !== 2) bad.push(`${md.querySelectorAll('#gsUnits .gs-duel').length} meetings`);
      if (md.querySelector('#gsUnits .gs-uedge, #gsUnits .gs-note')) bad.push('an edge chip or a note is still drawn');
      if (/rate each side on this season's key stats|League ranks from team stats|The tag beside each meeting/.test(txt(q('#gsUnits')))) bad.push('the notes under the card are still in its text');
      chk(bad.length === 0, `snapshot (${label}): Offense vs defense's meetings are not two boxes of one shape with no note under them: ${bad.slice(0, 4).join('; ')}`); }
    /* position by position: each lineup's rated starters, each in his team's column under his
       position, with the ELO Ratings tab's season Elo, rank, shield and Q */
    { const L = eloMu.lineups || {}, pls = [...md.querySelectorAll('#gsPos .gs-pl[data-pid]')], bad = [];
      for (const t of [a, h]) { const all = (L[t] && L[t].players) || [], want = all.filter(pid => eloP.players[pid]), shown = pls.filter(x => x.dataset.team === t).map(x => x.dataset.pid);
        if (want.some(pid => !shown.includes(pid)) || shown.some(pid => !all.includes(pid))) bad.push(`${t} shows ${shown.length} of its ${want.length} rated starters`); }
      let grp = null;
      for (const tr of md.querySelectorAll('#gsPos tbody tr')) {
        if (tr.classList.contains('gs-grp')) { grp = Object.keys(eloP.groups).find(k => eloP.groups[k].label === txt(tr.querySelector('[data-gs-glab]')));
          if (!grp || tr.dataset.gsGrp !== grp) bad.push(`a group header reads '${txt(tr.querySelector('[data-gs-glab]'))}' for ${tr.dataset.gsGrp}`); continue; }
        for (const x of tr.querySelectorAll('.gs-pl[data-pid]')) { const e = eloP.players[x.dataset.pid];
          if (!!x.querySelector('.pe-q') !== !!(eloMu.q || {})[x.dataset.pid]) bad.push(`${e ? e.name : x.dataset.pid}'s Q is not the report's`);
          if (!e) { if (!/not rated yet/.test(txt(x))) bad.push(x.dataset.pid + ' is not said to be unrated'); continue; }
          if (e.group !== grp || x.dataset.grp !== e.group) bad.push(`${e.name} (${e.group}) sits under ${grp}`);
          if (!x.closest('td').classList.contains(x.dataset.team === a ? 'gs-a' : 'gs-h')) bad.push(e.name + ' is in the wrong column');
          if (e.rank != null && e.se != null) { if (txt(x.querySelector('.gs-pse')) !== String(e.se) || txt(x.querySelector('.gs-prk')) !== '#' + e.rank || !x.querySelector('svg.tierbadge')) bad.push(`${e.name} reads ${txt(x.querySelector('.gs-pse'))} ${txt(x.querySelector('.gs-prk'))}, the file ${e.se} #${e.rank}`); }
          else if (txt(x.querySelector('.gs-pcar')) !== String(e.elo) || x.querySelector('.gs-pse')) bad.push(`${e.name}, not ranked, does not read career ${e.elo}`); } }
      chk(pls.length > 0 && bad.length === 0, `snapshot (${label}): the position-by-position table is not the files': ${pls.length} players; ${bad.slice(0, 4).join('; ')}`);
      /* each Q with its own player (qPlaced, above) */
      { const r = qPlaced(R, md, g); chk(r.bad.length === 0, `snapshot (${label}): a Q is not with its own player: ${r.bad.slice(0, 4).join('; ')}${r.bad.length > 4 ? ` (${r.bad.length} in all)` : ''}`); }
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
    /* no Sources card: no publish times, no links away from the window (the owner's call, 14 October 2026) */
    chk(!q('#gsFiles') && !q('#gsStamps') && !q('[data-gs-go]') && ![...md.querySelectorAll('.gs-ttl')].some(x => /^Sources$/.test(txt(x))) && !md.querySelector('a[href]'),
      `snapshot (${label}): the Sources card, a publish time or a link to a full tab is still drawn`);

    /* the verdict and the cards' summaries repeat numbers and add a few counts: every element
       marked data-gs-n is held to the files, worked out here on their own -- the vote (how many
       of the calls pick each side, the side most pick, their average chance for it, how many
       landed once played), Vegas's chance on the split bar, the Team Elo gap and ranks, the
       units' ranks and the top mismatch -- and each one the files give must be shown */
    { const C = callsOf(g), want = {}, need = new Set(), bad = [];
      const IDS = SNAP_MODELS, on = x => x && (x.pick === a || x.pick === h);
      const calls = IDS.map(id => C[id]).filter(on), vg = on(C.vegas) ? C.vegas : null, mods = IDS.slice(1).filter(id => on(C[id]));
      const nA = mods.filter(id => C[id].pick === a).length, nH = mods.length - nA;
      const base = vg ? vg.pick : nH > nA ? h : nA > nH ? a : null, dis = base ? mods.filter(id => C[id].pick !== base) : [];
      const put = (k, v, must = true) => { want[k] = v; if (must) need.add(k); };
      if (mods.length) put('vote', base ? `${mods.length - dis.length} of ${mods.length}` : `${nA}–${nH}`);
      if (win !== undefined && calls.length) put('votehit', `${calls.filter(x => (x.correct === true || x.correct === false ? x.correct : (win ? x.pick === win : null)) === true).length} of ${calls.length}`);
      /* the models that do not agree, by name, and the vote in the verdict (Model Picks has no summary) */
      { const got = [...md.querySelectorAll('#gsMatch [data-gs-dissent]')].map(x => x.dataset.gsDissent).join();
        if (base && mods.length && got !== dis.join()) bad.push(`the dissenters read '${got}', the files '${dis.join()}'`);
        if (mods.length && !md.querySelector('#gsMatch [data-gs-n="vote"]')) bad.push('the vote is not in the verdict'); }
      if (C.vegas && C.vegas.p != null) { const pH = C.vegas.pick === h ? C.vegas.p : 1 - C.vegas.p, pa = Math.round((1 - pH) * 100);
        put('vconf', pc(C.vegas.p)); put('vaway', pa + '%', pa >= 14); put('vhome', (100 - pa) + '%', 100 - pa >= 14); }
      if (eloM.teams && eloM.teams[a] && eloM.teams[h]) { const ea = eloM.teams[a].elo, eh = eloM.teams[h].elo, hi = eh > ea ? h : ea > eh ? a : null;
        put('tedge', hi ? `${hi} +${Math.abs(eh - ea)}` : 'Even');
        for (const t of [a, h]) { put('telo:' + t, String(eloM.teams[t].elo)); put('trank:' + t, '#' + tRank(t)); } }
      if (unitsOn && [['off', a], ['def', h], ['off', h], ['def', a]].every(([s, t]) => eloM.units[s][t])) for (const s of ['off', 'def']) for (const t of [a, h]) put(`urank:${s}:${t}`, ordinal(eloM.units[s][t].rank));
      /* who is out (each group's sidelined) and how many expected starters are questionable */
      for (const t of [a, h]) { const outs = Object.keys(eloP.groups).flatMap(k => (eloP.groups[k].sidelined || []).filter(x => x.team === t));
        for (const x of outs) put('out:' + x.id, x.name);
        if (outs.length) put('outn:' + t, String(outs.length));
        const lu = (eloMu.lineups || {})[t], nq = lu ? (lu.players || []).filter(pid => (eloMu.q || {})[pid]).length : 0;
        if (nq) put('qn:' + t, String(nq)); }
      { const kicked = R.w.eloGameOn(g.game_id) || win !== undefined || etKick({ d: g.gameday, t: g.gametime }) <= R.w.Date.now();
        const mine = R.w.eloMismatches().map((v, i) => ({ ...v, n: i + 1 })).filter(v => v.game_id === g.game_id);
        if (+g.week === +eloMu.week && String(g.game_id).slice(0, 4) === String(eloMu.season) && !kicked && mine.length) {
          put('mm1:' + mine[0].pid, (eloP.players[mine[0].pid] || {}).name || mine[0].pid); put('mm1score', mine[0].score.toFixed(1)); } }
      const seen = new Set();
      for (const el of md.querySelectorAll('[data-gs-n]')) { const k = el.dataset.gsN; seen.add(k);
        if (!(k in want)) bad.push(`${k} reads '${txt(el)}', which the files do not give`);
        else if (txt(el) !== want[k]) bad.push(`${k} reads '${txt(el)}', the files '${want[k]}'`); }
      for (const k of need) if (!seen.has(k)) bad.push(`${k} (${want[k]}) is not shown`);
      chk(bad.length === 0 && !!q('#gsMatch .gs-glance') && ['vote', 'elo', 'units', 'out', 'mism'].every(k => q(`#gsMatch [data-gs-gl="${k}"]`)),
        `snapshot (${label}): the verdict or a card's summary is not the files': ${bad.slice(0, 5).join('; ')}`); }

    /* the edge marks: the one mark (gs-better) sits on the higher rating and chance and the better
       rank of each pair, nowhere else in those rows, and on neither side of a tie */
    { const bad = [], mark = el => !!el && (el.classList.contains('gs-better') || !!el.querySelector('.gs-better'));
      if (eloM.teams && eloM.teams[a] && eloM.teams[h]) {
        const T = eloM.teams, rows = { elo: t => T[t].elo, rank: t => -tRank(t), avg: t => T[t].p_avg };
        for (const [key, f] of Object.entries(rows)) { const va = f(a), vh = f(h), best = va == null || vh == null || va === vh ? null : va > vh ? a : h;
          for (const [t, cls] of [[a, 'gs-a'], [h, 'gs-h']]) if (mark(q(`tr[data-gs-row="${key}"] td.${cls}`)) !== (best === t)) bad.push(`Team strength ${key}: ${t} is${best === t ? ' not' : ''} marked`); }
        if (mark(q('tr[data-gs-row="chg"]'))) bad.push('Team strength chg is marked');
        if (q('tr[data-gs-row="tier"]') || [...md.querySelectorAll('#gsTeams .gs-mlab')].some(x => /^Tier$/i.test(txt(x)))) bad.push('Team strength still has a Tier row'); }
      if (unitsOn) { const U = eloM.units;
        for (const [o, d] of [[a, h], [h, a]])
          if (U.off[o] && U.def[d]) { const ro = U.off[o].rank, rd = U.def[d].rank, best = ro === rd ? null : ro < rd ? 'off' : 'def';
            for (const [s, t] of [['off', o], ['def', d]]) if (mark(q(`[data-gs-unit="${s}:${t}"]`)) !== (best === s)) bad.push(`${s}:${t} overall is${best === s ? ' not' : ''} marked`); } }
      /* the stats behind the ratings are the Stat breakdown's now (the owner's call, 14 October 2026): no
         stats table and no fold for one under the possessions */
      if (q('#gsUnits [data-gs-stat]') || q('#gsUnits [data-gs-sub]') || q('#gsUnits .gs-more') || q('#gsUnits table')) bad.push('Offense vs defense still draws the stats behind the ratings, or a fold for them');
      chk(bad.length === 0, `snapshot (${label}): an edge mark of Offense vs defense or Team strength is not the files', or a stat is still drawn under the units: ${bad.slice(0, 5).join('; ')}`); }

    /* the owner's trim of 14 October 2026: Model Picks so titled; it, Team strength and Offense vs defense
       with no summary in their title and no note under them (Team strength's star note alone, where a
       rating predates its team's latest final); each possession "<Nickname> Possession", its headline tag
       under the title; the Starters card's two teams directly under its tabs, over the first table */
    { const bad = [], NAMES = R.w.eval('TEAM_NAMES'), nick = t => NAMES[t] || t;
      if (txt(q('#gsCalls .gs-ttl')) !== 'Model Picks') bad.push(`the first card is titled '${txt(q('#gsCalls .gs-ttl'))}'`);
      for (const id of ['gsCalls', 'gsTeams', 'gsUnits']) if (q(`#${id} .gs-sum`)) bad.push(`${id} still has a summary: '${txt(q(`#${id} .gs-sum`))}'`);
      if (q('#gsCalls .gs-note') || /frozen at kickoff|Each bar leans|Vegas is the board's baseline/.test(txt(q('#gsCalls')))) bad.push('Model Picks still has its note');
      const tn = [...md.querySelectorAll('#gsTeams .gs-note')];
      if (tn.some(x => !/^\* Rated before its latest game/.test(txt(x))) || /Power Ratings are this season's results alone|Ratings built/.test(txt(q('#gsTeams')))) bad.push('Team strength still has its note');
      if (q('#gsUnits .gs-note')) bad.push('Offense vs defense has a note');
      const h4 = [...md.querySelectorAll('#gsUnits .gs-unit > .gs-uhd > h4')].map(txt).join('|'), hw = [a, h].map(t => `${nick(t)} Possession`).join('|');
      if (h4 !== hw) bad.push(`the possessions are titled '${h4}', not '${hw}'`);
      if (/have the ball|has the ball/.test(txt(q('#gsUnits')))) bad.push('a possession is still titled "When ... have the ball"');
      const tl = q('#gsPos [role="tablist"]'), pt = q('#gsPos .gs-pteams');
      if (tl && (!pt || pt.previousElementSibling !== tl || !pt.nextElementSibling || pt.nextElementSibling.getAttribute('role') !== 'tabpanel')) bad.push('the Starters card\'s two teams are not directly under its tabs, over the table');
      chk(bad.length === 0, `snapshot (${label}): the trim of 14 October 2026 does not hold: ${bad.join('; ')}`); }

    /* the at-a-glance visuals, held like the numbers, since a visitor reads the edge off them before
       any number: each call's bar in Every call leans from 50/50 toward the side it picks (gs-toh to
       the home side on the right, gs-toa to the away side on the left), in the picked team's colour,
       as far as its chance for that side (a point of chance over 50 is a point of the track's width,
       half of it at 100%); where the smoke cannot work the chance out (a Vegas pick from the spread
       alone), the bar is held to the chance the row prints. The Vegas split bar under the headline
       is each side's chance wide. The verdict's Team Elo answer marks the higher-rated team alone
       (neither when level); its Offense vs defense answer marks the better rank of each offense and
       defense that meet (neither on a tie) and names the side with the edge both ways, and each of
       the card's two matchups names the side with its edge */
    { const C = callsOf(g), bad = [], half = p => Math.max(0, Math.min(50, Math.round((p - 0.5) * 1000) / 10));
      const rows = [...md.querySelectorAll('#gsCalls li.gs-call[data-pick]')];
      for (const li of rows) { const id = li.dataset.gsModel, x = C[id], em = li.querySelector('.gs-track em');
        if (!x || !em) { bad.push(`${id} ${em ? 'draws a bar the files have no call for' : 'has no bar'}`); continue; }
        const toH = x.pick === h;
        if (!em.classList.contains(toH ? 'gs-toh' : 'gs-toa') || em.classList.contains(toH ? 'gs-toa' : 'gs-toh'))
          bad.push(`${id}'s bar leans ${em.classList.contains('gs-toh') ? 'home' : em.classList.contains('gs-toa') ? 'away' : 'nowhere'}, its pick ${x.pick} is ${toH ? 'home' : 'away'}`);
        const shown = (txt(li.querySelector('[data-gs-p]')).match(/^(\d+)%$/) || [])[1];
        if (x.p != null) { const w = half(x.p) + '%'; if (em.style.width !== w) bad.push(`${id}'s bar is ${em.style.width || 'no'} wide, its chance ${pc(x.p)} draws ${w}`); }
        else if (shown != null && !(Math.abs(parseFloat(em.style.width) - Math.max(0, Math.min(50, +shown - 50))) <= 0.51)) bad.push(`${id}'s bar is ${em.style.width || 'no'} wide for the ${shown}% it prints`);
        const col = typeof R.w.pkTagColor === 'function' ? R.w.pkTagColor(x.pick) : null;
        if (col && em.style.getPropertyValue('--gs-tc') !== col) bad.push(`${id}'s bar is in ${em.style.getPropertyValue('--gs-tc') || 'no colour'}, ${x.pick}'s is ${col}`); }
      for (const id of SNAP_MODELS) if (C[id] && (C[id].pick === a || C[id].pick === h) && !rows.some(li => li.dataset.gsModel === id)) bad.push(`${id}'s call has no bar`);
      /* the split bar: each side as wide as its chance */
      if (C.vegas && C.vegas.p != null) { const pH = C.vegas.pick === h ? C.vegas.p : 1 - C.vegas.p, pa = Math.round((1 - pH) * 100);
        const ba = q('#gsMatch .gs-split .pk-prob .pk-a'), bh = q('#gsMatch .gs-split .pk-prob .pk-h');
        if (!ba || !bh || ba.style.width !== pa + '%' || bh.style.width !== (100 - pa) + '%') bad.push(`the split bar is ${a} ${ba ? ba.style.width : 'missing'}, ${h} ${bh ? bh.style.width : 'missing'}; Vegas has ${a} ${pa}%, ${h} ${100 - pa}%`); }
      /* the verdict's Team Elo: the higher rating's box alone wears the mark */
      const marks = (gl, pre) => [...(q(`#gsMatch [data-gs-gl="${gl}"]`) || { querySelectorAll: () => [] }).querySelectorAll('.gs-better')]
        .map(el => { const n = el.querySelector(`[data-gs-n^="${pre}"]`); return n ? n.dataset.gsN : 'a box with no ' + pre; }).sort().join();
      if (eloM.teams && eloM.teams[a] && eloM.teams[h]) { const ea = eloM.teams[a].elo, eh = eloM.teams[h].elo, hi = eh > ea ? h : ea > eh ? a : null, got = marks('elo', 'telo:');
        if (got !== (hi ? 'telo:' + hi : '')) bad.push(`the verdict's Team Elo marks ${got || 'neither team'}, the higher rating is ${hi || 'neither (level)'}`); }
      /* the verdict's Offense vs defense: the better rank of each meeting marked, the side with the
         edge named; the card's matchups name theirs */
      if (unitsOn && [['off', a], ['def', h], ['off', h], ['def', a]].every(([s, t]) => eloM.units[s][t])) { const U = eloM.units, want = [], who = [];
        for (const [o, d] of [[a, h], [h, a]]) { const ro = U.off[o].rank, rd = U.def[d].rank, e = ro < rd ? 'off' : rd < ro ? 'def' : null;
          if (e) want.push(e === 'off' ? 'urank:off:' + o : 'urank:def:' + d);
          who.push({ e, t: e === 'off' ? o : e === 'def' ? d : null }); }
        const got = marks('units', 'urank:');
        if (got !== want.sort().join()) bad.push(`the verdict's Offense vs defense marks ${got || 'nothing'}, the better ranks are ${want.join() || 'level'}`);
        const gv = q('#gsMatch [data-gs-gl="units"] .gs-gv'), [w1, w2] = who;
        const head = w1.t && w1.t === w2.t ? `${w1.t} ranks higher both ways` : w1.e === 'off' && w2.e === 'off' ? 'Both offenses rank higher' : w1.e === 'def' && w2.e === 'def' ? 'Both defenses rank higher' : 'Even';
        const tagT = gv && gv.querySelector('.pk-ttag') ? txt(gv.querySelector('.pk-ttag')) : '', words = gv ? txt(gv).slice(tagT.length).trim() : '';
        if ((tagT ? `${tagT} ${words}` : words) !== head) bad.push(`the verdict's Offense vs defense reads '${txt(gv)}', the files make it '${head}'`);
        /* and in the card each meeting's tinted box is the side with the edge, the other its twin untinted */
        const tinted = [...md.querySelectorAll('#gsUnits .gs-duel')].map(d => [...d.querySelectorAll('.gs-ubox.gs-better')].map(b => b.dataset.gsUnit).join('+') || 'none').join('|');
        const tw = [[a, h], [h, a]].map(([o, d], i) => who[i].e === 'off' ? 'off:' + o : who[i].e === 'def' ? 'def:' + d : 'none').join('|');
        if (tinted !== tw) bad.push(`Offense vs defense tints ${tinted}, the better ranks are ${tw}`); }
      chk(bad.length === 0, `snapshot (${label}): a bar or an edge mark of the verdict is not the files': ${bad.slice(0, 5).join('; ')}${bad.length > 5 ? ` (${bad.length} in all)` : ''}`); }

    /* the starters' edge marks: the higher season Elo of a pair, both ranked, wears the mark and
       nothing else on the row does; each defensive group's header carries both teams' unit as the
       matchup formula ranks it (mu.league.defs, 1st the best), the better one marked */
    { const bad = [], defs = (eloMu.league && eloMu.league.defs) || {}, nD = Object.keys(defs).length;
      const urk = (t, u) => defs[t] ? Object.keys(defs).sort((x, y) => defs[y][u] - defs[x][u]).indexOf(t) + 1 : null;
      let marks = 0, units = 0;
      for (const tr of md.querySelectorAll('#gsPos tbody tr')) {
        if (tr.classList.contains('gs-grp')) { const u = tr.dataset.gsGrp;
          if (['DL', 'LB', 'DB'].includes(u) && nD) { const ra = urk(a, u), rh = urk(h, u), best = ra && rh && ra !== rh ? (ra < rh ? a : h) : null;
            for (const [t, r] of [[a, ra], [h, rh]]) { const el = tr.querySelector(`[data-gs-def="${t}:${u}"]`);
              if (!r) { if (el) bad.push(`${t} ${u} shows a unit rank the file has not`); continue; }
              units++;
              if (!el || txt(el) !== `${ordinal(r)} of ${nD}`) bad.push(`${t} ${u} unit reads '${txt(el)}', the file ${ordinal(r)} of ${nD}`);
              else if (el.classList.contains('gs-better') !== (best === t)) bad.push(`${t} ${u} unit is${best === t ? ' not' : ''} marked`); } }
          else if (tr.querySelector('[data-gs-def]')) bad.push(`${u} carries a unit rank`);
          continue; }
        const [ca, ch] = ['gs-a', 'gs-h'].map(c => tr.querySelector(`td.${c} .gs-pl[data-pid]`));
        const se = el => { const e = el && eloP.players[el.dataset.pid]; return e && e.rank != null && e.se != null ? e.se : null; };
        const sa = se(ca), sh = se(ch), best = sa != null && sh != null && sa !== sh ? (sa > sh ? ca : ch) : null;
        for (const el of [ca, ch]) if (el) { const m = !!el.querySelector('.gs-better'); if (m) marks++;
          if (m !== (el === best)) bad.push(`${(eloP.players[el.dataset.pid] || {}).name || el.dataset.pid} is${el === best ? ' not' : ''} marked`);
          else if (m && !el.querySelector('.gs-pse.gs-better')) bad.push('a mark sits off a starter\'s Elo'); } }
      chk(bad.length === 0 && (!md.querySelector('#gsPos .gs-pos') || marks > 0) && (!md.querySelector('#gsPos .gs-pos') || !nD || units > 0),
        `snapshot (${label}): an edge mark or a unit rank among the starters is not the files' (${marks} marks, ${units} unit ranks): ${bad.slice(0, 5).join('; ')}`); }

    /* the Starters tabs: every group in its own tab (Offense, Defense, Kicker), one panel shown, its
       tab selected and the only one in the Tab order; the panels not shown still hold their players,
       checked above with the rest */
    if (md.querySelector('#gsPos .gs-pos')) { const bad = [], TAB = { QB: 'off', RB: 'off', WR: 'off', TE: 'off', K: 'k', DL: 'def', LB: 'def', DB: 'def' };
      const tabs = [...md.querySelectorAll('#gsPos [role="tablist"] [role="tab"]')], panels = [...md.querySelectorAll('#gsPos [role="tabpanel"]')];
      if (!tabs.length || tabs.length !== panels.length) bad.push(`${tabs.length} tabs for ${panels.length} panels`);
      const shown = panels.filter(x => !x.hidden), sel = tabs.filter(t => t.getAttribute('aria-selected') === 'true');
      if (shown.length !== 1 || sel.length !== 1 || sel[0].getAttribute('aria-controls') !== shown[0].id || shown[0].getAttribute('aria-labelledby') !== sel[0].id || sel[0].tabIndex !== 0 || tabs.some(t => t !== sel[0] && t.tabIndex !== -1))
        bad.push('not one tab selected, alone in the Tab order, with its own panel shown');
      for (const tr of md.querySelectorAll('#gsPos tr.gs-grp')) { const pn = tr.closest('[role="tabpanel"]');
        if (!pn || pn.dataset.gsPanel !== TAB[tr.dataset.gsGrp]) bad.push(`${tr.dataset.gsGrp} is in the ${pn ? pn.dataset.gsPanel : 'no'} tab`); }
      const hiddenPl = panels.filter(x => x.hidden).reduce((n, x) => n + x.querySelectorAll('.gs-pl[data-pid]').length, 0);
      if (panels.length > 1 && !hiddenPl) bad.push('the tabs not shown hold no players');
      chk(bad.length === 0, `snapshot (${label}): the Starters tabs are not one per side of the ball with every group in its own: ${bad.join('; ')}`); }

    /* the badges count what their cards hold: the ranked players out, and the Mismatches shown */
    { const outs = [a, h].reduce((n, t) => n + Object.keys(eloP.groups).flatMap(k => (eloP.groups[k].sidelined || []).filter(x => x.team === t)).length, 0);
      const b = q('#gsPos [data-gs-badge="out"]'), mm = q('#gsMism [data-gs-badge="mism"]'), li = md.querySelectorAll('#gsMism li[data-pid]').length;
      chk((outs ? !!b && txt(b) === `${outs} out` && !!b.closest('.gs-shead') : !b) && (li ? !!mm && txt(mm) === `${li} in this game` && !!mm.closest('.gs-shead') : !mm),
        `snapshot (${label}): a card's badge does not count what the card holds: '${txt(b)}' for ${outs} out, '${txt(mm)}' for ${li} mismatches`); }

    /* the headline as a visitor reads it: the favourite's nickname and the spread it is favoured by,
       or once played the winner, whether it was an upset, and the line under it; the confidence pill
       is the board's own for this game; a played game's note sits under the score, ahead of the line */
    { const v = callsOf(g).vegas, bad = [], NAMES = R.w.eval('TEAM_NAMES'), nick = t => NAMES[t] || t, head = txt(q('#gsMatch .gs-favt'));
      const sp = g.spread_line != null && isFinite(g.spread_line) ? +g.spread_line : null, spSide = sp == null || sp === 0 ? null : sp > 0 ? h : a;
      if (v) { const by = spSide === v.pick ? ` by ${Math.abs(sp)}` : '';
        if (win === undefined) { if (!head.startsWith(`${v.pick} ${nick(v.pick)} favoured${by}`)) bad.push(`the headline reads '${head}', not ${nick(v.pick)} favoured${by}`); }
        else { if (win ? !head.startsWith(`${win} ${nick(win)} won`) : !/^A tie/.test(head)) bad.push(`the headline reads '${head}'`);
          const up = q('#gsMatch [data-gs-upset]'), want = win == null ? 'tie' : win === v.pick ? 'no' : 'yes';
          if (!up || up.dataset.gsUpset !== want || (want === 'yes') !== /Upset/.test(txt(up))) bad.push(`the result chip reads '${txt(up)}', the result is ${want === 'yes' ? 'an upset' : want}`);
          if (!txt(q('#gsMatch .gs-favsub')).startsWith(`${v.pick} was favoured${by}`)) bad.push(`the line under it reads '${txt(q('#gsMatch .gs-favsub'))}'`); }
        const mine = q('#gsMatch .gs-favp .pk-tier'), board = R.d.querySelector(`.pk-game[data-game="${g.game_id}"] .pk-conf .pk-tier`);
        if (v.p != null && (!mine || !board || txt(board) !== `${txt(mine)} ${pc(v.p)}`)) bad.push(`the confidence pill reads '${txt(mine)}', the board's '${txt(board)}'`); }
      if (win !== undefined && (!q('#gsPast') || q('#gsMatch .gs-hero').nextElementSibling !== q('#gsPast'))) bad.push('the played note is not under the head');
      chk(bad.length === 0, `snapshot (${label}): the headline is not the files' or the board's: ${bad.join('; ')}`); }

    /* the header's game bar (shown once the verdict's line scrolls away): the score, or each team's
       record and the spread; hidden from a screen reader, the dialog keeps its title */
    { const mini = q('#gsMini'), o = txt(q('[data-gs-score]')), word = / vs /.test(txt(R.d.getElementById('gsTitle'))) ? 'vs' : 'at';
      const sp = g.spread_line != null && isFinite(g.spread_line) ? +g.spread_line : null, spTxt = sp == null ? '' : sp > 0 ? `${h} −${sp}` : sp < 0 ? `${a} −${-sp}` : "Pick'em";
      const want = win !== undefined ? `${a} ${o} ${h} | Final` : `${a} ${recOf(a)} ${word} ${h} ${recOf(h)}${spTxt ? ' | ' + spTxt : ''}`;
      chk(!!mini && mini.getAttribute('aria-hidden') === 'true' && txt(mini) === want, `snapshot (${label}): the header's game bar reads '${txt(mini)}', the files '${want}'`); }

    /* each answer of the verdict is a button that opens its own card */
    { const gl = [...md.querySelectorAll('#gsMatch [data-gs-gl]')], to = { vote: 'gsCalls', elo: 'gsTeams', units: 'gsUnits', out: 'gsPos', mism: 'gsMism' };
      chk(gl.length === 5 && gl.every(b => b.tagName === 'BUTTON' && b.getAttribute('type') === 'button' && to[b.dataset.gsGl] === b.dataset.gsGoto),
        `snapshot (${label}): the verdict's answers are not each a button to its card: ${gl.map(b => b.tagName + ':' + b.dataset.gsGl + '>' + b.dataset.gsGoto).join(' ')}`); }

    /* every card folds: a button with its title and summary, aria-expanded and aria-controls
       naming its body, the body hidden exactly when the button says it is closed; on a wide screen
       Every call and Team strength open and the rest folded, and the numbers held above were read
       from the folded cards, the folded stats and the Starters tabs not shown */
    { const bad = [], WIDE = ['gsCalls', 'gsTeams'];
      for (const id of SNAP_CARDS) { const sec = q('#' + id), b = sec && sec.querySelector('.gs-shead > button[data-gs-fold]'), body = b && R.d.getElementById(b.getAttribute('aria-controls'));
        if (!b || !body || !sec.contains(body)) { bad.push(id + ' has no fold'); continue; }
        if ((b.getAttribute('aria-expanded') === 'true') === body.hidden) bad.push(`${id}: aria-expanded ${b.getAttribute('aria-expanded')} with its body ${body.hidden ? 'hidden' : 'shown'}`);
        if (body.hidden === WIDE.includes(id)) bad.push(`${id} is ${body.hidden ? 'folded' : 'open'} on opening`);
        /* Model Picks, Team strength and Offense vs defense with no summary (the owner's call, 14 October 2026) */
        const bare = ['gsCalls', 'gsTeams', 'gsUnits'].includes(id);
        if (bare ? !!b.querySelector('.gs-sum') : !txt(b.querySelector('.gs-sum'))) bad.push(`${id} ${bare ? 'has a summary' : 'has no summary'}`); }
      chk(bad.length === 0 && !q('#gsMatch [data-gs-fold]'), `snapshot (${label}): a card does not fold to its summary, or the verdict folds: ${bad.join('; ')}`); }
  };

  const R = await run(st, undefined, wk => scoreboard(st, wk));
  await wait(700);
  chk(!R.timedOut && R.errs.length === 0, 'snapshot: the page did not boot: ' + R.errs.join('; '));
  /* the position table on a phone: laid out fixed, so each team keeps half the card and a long name
     wraps inside its half (laid out automatically, a long name set the column's width and pushed
     the home side past the card's edge on 34 of 45 games at 390px in Chromium), and no rule stops a
     name wrapping (the Q is inside the name's box, so a name cut to an ellipsis would cut its Q).
     jsdom lays nothing out, so the rules themselves are held here */
  { const rules = [], walk = (list, media) => { for (const r of list) { if (r.cssRules && r.media) walk(r.cssRules, r.media.mediaText); else if (r.selectorText) rules.push({ sel: r.selectorText, media, st: r.style }); } };
    for (const sh of R.d.styleSheets) { try { walk(sh.cssRules, ''); } catch (e) { /* a sheet jsdom cannot read */ } }
    const has = (sel, phone, prop, val) => rules.some(r => r.sel === sel && (phone ? /max-width:\s*760px/.test(r.media) : !r.media) && r.st.getPropertyValue(prop) === val);
    chk(has('.gs-pos', false, 'table-layout', 'fixed') && has('.gs-pl .gs-pnm', false, 'overflow-wrap', 'anywhere')
      && !rules.some(r => /\.gs-pnm$|\.gs-pn span$/.test(r.sel) && /nowrap/.test(r.st.getPropertyValue('white-space'))),
      'snapshot: the position table is not laid out fixed with names wrapping, so a long name pushes the home side off the screen');
    /* the Pick'ems board's six columns fit at every width they are laid out at (above the phone card at
       900px): their least widths, the gaps and the card's padding within the page's content at the
       narrowest width of each layout (it scrolled sideways from 901 to about 1,100px until 14 October
       2026, the owner's window at 914), the middle layout's from its min-width and the wide one's from
       one past the middle one's max-width, less a classic scrollbar (Windows, 15-17px: from 1,141 to
       1,156px the wide layout's last column ran into the card's padding there). And the result column is
       never narrower than the wide layout's, since it holds the same text, and never under 136px (a live
       "WAS leading 31–33", about 134px, ran past the card's edge in a 108px column and 2px into the
       padding of the wide layout's 132px one). jsdom lays nothing out, so the rules
       themselves are summed */
    { const px = v => { const m = /^(-?[\d.]+)px$/.exec(String(v).trim()); return m ? +m[1] : null; };
      const least = cols => { const out = []; let depth = 0, cur = '';
        for (const ch of String(cols)) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ' ' && !depth) { if (cur) out.push(cur); cur = ''; } else cur += ch; }
        if (cur) out.push(cur);
        return out.map(t => { const mm = /^minmax\(\s*([^,]+),/.exec(t); return mm ? (px(mm[1]) || 0) : (px(t) || 0); }); };
      const ruleFor = (media, prop) => { const r = rules.filter(x => /(^|,\s*)\.pk-game(\s*,|$)/.test(x.sel) && x.media === media && x.st.getPropertyValue(prop)); return r.length ? r[r.length - 1].st.getPropertyValue(prop) : null; };
      const mids = [...new Set(rules.filter(x => /min-width:\s*901px/.test(x.media) && /\.pk-game/.test(x.sel)).map(x => x.media))];
      const maxOf = m => { const mm = /max-width:\s*(\d+)px/.exec(m || ''); return mm ? +mm[1] : null; }, SCROLLBAR = 17, LIVE_W = 136;
      const cases = [['', mids.length && maxOf(mids[0]) ? maxOf(mids[0]) + 1 : 901], ...mids.map(m => [m, 901])], bad = [];
      const wideLast = least(ruleFor('', 'grid-template-columns')).slice(-1)[0];
      for (const [media, w] of cases) {
        const cols = least(ruleFor(media, 'grid-template-columns') || ruleFor('', 'grid-template-columns'));
        const gap = px(ruleFor(media, 'column-gap') || ruleFor(media, 'gap') || ruleFor('', 'column-gap') || ruleFor('', 'gap')) || 0;
        /* the card's own right padding, from its shorthand where that is how it is written */
        const padOf = m => { const r = rules.filter(x => x.sel === '.pk-game' && x.media === m && (x.st.getPropertyValue('padding-right') || x.st.getPropertyValue('padding')));
          if (!r.length) return null; const st = r[r.length - 1].st, t = (st.getPropertyValue('padding-right') || st.getPropertyValue('padding')).trim().split(/\s+/);
          return px(st.getPropertyValue('padding-right') ? t[0] : (t[1] || t[0])); };
        const pad = padOf(media) ?? padOf('') ?? 0;
        const need = cols.reduce((a, x) => a + x, 0) + gap * (cols.length - 1) + 2 * pad + 2, room = w - SCROLLBAR - 2 * 28;
        if (cols.length !== 6 || need > room) bad.push(`${media || 'wide'}: ${cols.length} columns need ${need}px at ${w}px wide, the page has ${room} beside a ${SCROLLBAR}px scrollbar`);
        if (cols.length === 6 && !(cols[5] >= wideLast)) bad.push(`${media || 'wide'}: the result column is ${cols[5]}px, narrower than the wide layout's ${wideLast}px, which holds the same text`);
        if (cols.length === 6 && !(cols[5] >= LIVE_W)) bad.push(`${media || 'wide'}: the result column is ${cols[5]}px, too narrow for a live "WAS leading 31–33" (about 134px at its 15px)`); }
      chk(mids.length === 1 && !bad.length, "the Pick'ems board's columns do not fit at every width they are laid out at, so the page scrolls sideways, or its result column is narrower than the wide layout's: " + (bad.join('; ') || 'no layout between the phone card and a wide screen')); }
    /* the page's modal pads its top, and a sticky header sticks inside that padding: the window's
       content showed in a band above its header once scrolled, so its modal has none */
    chk(rules.some(r => r.sel === '#gsModal' && !r.media && /^0(px)?$/.test(r.st.getPropertyValue('padding-top'))),
      'snapshot: the window\'s modal pads its top, so its content shows above the sticky header once scrolled');
    /* every control a thumb can hit is at least 44px tall at every width (48 for the verdict's
       answers), set by its own rule and never lowered by a narrower screen's */
    { const tall = [['#gsClose', 44], ['#gsModal .gs-props', 44], ['.gs-gl', 48], ['.gs-dbar .btn', 44], ['.gs-tog', 44], ['.gs-ptabs button', 44]];
      const short = tall.filter(([sel, px]) => { const set = rules.filter(r => r.sel === sel && r.st.getPropertyValue('min-height'));
        return !set.some(r => !r.media) || set.some(r => !(parseFloat(r.st.getPropertyValue('min-height')) >= px)); });
      chk(short.length === 0, 'snapshot: a control in the window is under its tap height: ' + short.map(x => x[0]).join(', ')); }
    /* the owner's clean-up of 14 October 2026, in the rules (jsdom lays nothing out; the sizes were
       measured in Chromium at 1280, 914 and 390): the head three columns, the two teams the same width
       either side of the middle, and under 900px (the rule at 899px: three columns left the middle 231-369px
       wide from 761 to 899, 238 at an iPad's 768) the teams on one row and the middle under them; a
       meeting's two boxes in two equal columns either side of "vs", stretched to one height, the better
       rank's tint changing no size; a position matchup's row three columns about the middle, its clubs and
   ranks there (the owner's call, 14 October 2026), and each possession's head centred; no "at" circle,
       no sources line and no Sources card left in the styles */
    { const get = (sel, media, prop) => { const r = rules.filter(x => x.sel === sel && (media ? media.test(x.media) : !x.media) && x.st.getPropertyValue(prop)); return r.length ? r[r.length - 1].st.getPropertyValue(prop).replace(/\s+/g, ' ').trim() : ''; };
      const bad = [], want = (sel, media, prop, v) => { const got = get(sel, media, prop); if (got !== v) bad.push(`${sel}${media ? ` (${media.source})` : ''} ${prop} is '${got}', not '${v}'`); };
      const STACKED = /max-width:\s*899px/;
      const cols = get('.gs-hero', false, 'grid-template-columns').split(' ');
      if (cols.length !== 3 || cols[0] !== cols[2] || !/fr\)$/.test(cols[0])) bad.push(`the head's columns are '${cols.join(' ')}': not the two teams the same width either side of the middle`);
      want('.gs-hero', false, 'grid-template-areas', '"away mid home"');
      want('.gs-hero', STACKED, 'grid-template-areas', '"away home" "mid mid"'); want('.gs-hero', STACKED, 'grid-template-columns', 'minmax(0,1fr) minmax(0,1fr)');
      want('.gs-team.gs-away', false, 'grid-area', 'away'); want('.gs-team.gs-home', false, 'grid-area', 'home'); want('.gs-mid', false, 'grid-area', 'mid');
      want('.gs-duel', false, 'grid-template-columns', 'minmax(0,1fr) auto minmax(0,1fr)'); want('.gs-duel', false, 'align-items', 'stretch');
      want('#gsModal .ddrow', false, 'grid-template-columns', 'minmax(0,1fr) auto minmax(0,1fr)');
      want('#gsModal .ddunit', false, 'justify-self', 'end'); want('#gsModal .ddrow .dtag', false, 'justify-self', 'start');
      want('.gs-uhd', false, 'flex-direction', 'column'); want('.gs-uhd', false, 'align-items', 'center'); want('#gsModal .gs-dd', false, 'text-align', 'center');
      if (rules.some(x => /\.gs-more\b|table\.gs-ut\b|\.ddsides\b|\.ddwho\b|\.ddout\b|\.ddnum\b|\.gs-psrc\b/.test(x.sel))) bad.push('a rule for the stats fold, a matchup\'s old side boxes or the note\'s sources is still in the styles');
      for (const r of rules.filter(x => /\.gs-better/.test(x.sel) && /gs-ubox/.test(x.sel)))
        for (const prop of ['padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'border-width', 'border', 'width', 'height', 'min-height', 'font-size'])
          if (r.st.getPropertyValue(prop)) bad.push(`${r.sel} sets ${prop}, so the better rank's box is not its twin's size`);
      if (rules.some(x => /\.gs-at\b|\.gs-src\b|\.gs-files\b|\.gs-links\b|\.gs-uedge\b/.test(x.sel))) bad.push('a rule for the "at" circle, the sources line, the Sources card or the edge chip is still in the styles');
      chk(bad.length === 0, 'snapshot: the head, the meetings or the matchups are not laid out as the clean-up has them: ' + bad.join('; ')); } }
  /* every game's row opens its own game's window, priced by the prop model or not, the props button in
     it exactly where the Props tab can open the game */
  { const cards = [...R.d.querySelectorAll('.pk-game')].slice(0, 4), bad = [];
    for (const c of cards) { c.click(); await wait(60);
      const md = R.d.getElementById('gsModal'), g = st.schedule.find(x => x.game_id === c.dataset.game), r = R.w.eval('S').sched.find(x => x.id === c.dataset.game);
      const can = !!r && R.w.eval('weekOpen')(+r.w), pb = md && md.querySelector('#gsMatch [data-gs-props]');
      if (!md || md.hidden || !g || !new RegExp(`${g.away_team}.*${g.home_team}`).test(txt(R.d.getElementById('gsTitle')))) bad.push(c.dataset.game + ' opens no window of its own');
      else if (!!pb !== can || (pb && pb.dataset.gsProps !== c.dataset.game)) bad.push(`${c.dataset.game} ${can ? 'has no props button' : 'offers a page the Props tab cannot open'}`);
      R.w.gameSnapshotClose(false); await wait(10); }
    chk(cards.length > 0 && bad.length === 0, 'snapshot: a Pick\'ems row does not open its own game\'s window: ' + bad.join('; ')); }
  /* a game to come: the open week's first the scoreboard does not mark over or on, else a later week's */
  const ung = st.schedule.filter(g => +g.week === week && g.result == null);
  const toCome = ung.slice(2).concat(st.schedule.filter(g => +g.week > week && g.result == null))[0] || null;
  let opened = 0;
  if (toCome) {
    const o = await open(R, toCome); opened++;
    chk(!!o.btn, `snapshot: the game to come (${toCome.game_id}) opens no Game snapshot from its row`);
    if (o.btn) {
      hold(R, toCome, 'a game to come', undefined);
      /* Tab stays inside, both ways, and goes in the order a visitor reads: Close, the verdict's five
         answers, Open all, then each card's title (an open card's insides after its title); a tab
         the Starters card does not show, or one not chosen, is not in it */
      { const md = o.md, f = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && !x.closest('[hidden]') && x.tabIndex !== -1);
        f[f.length - 1].focus(); f[f.length - 1].dispatchEvent(new R.w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        const wrapped = R.d.activeElement === f[0];
        f[0].dispatchEvent(new R.w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
        chk(f.length > 3 && wrapped && R.d.activeElement === f[f.length - 1], 'snapshot: Tab does not stay inside the window');
        const key = x => x.id === 'gsClose' ? 'close' : x.dataset.gsProps ? 'props' : x.dataset.gsGl ? 'gl:' + x.dataset.gsGl : x.dataset.gsAll ? 'all' : x.dataset.gsFold ? 'card:' + x.dataset.gsFold : null;
        const props = R.w.pkBoard.canProps(toCome.game_id) ? ['props'] : [];
        const order = f.map(key).filter(Boolean).join(), want = ['close', ...props, 'gl:vote', 'gl:elo', 'gl:units', 'gl:out', 'gl:mism', 'all', ...SNAP_CARDS.map(id => 'card:' + id)].join();
        chk(order === want && !f.some(x => x.getAttribute('role') === 'tab' && x.getAttribute('aria-selected') !== 'true'), `snapshot: the Tab order is not Close, the props button, the verdict, Open all and the cards: ${order}`); }
      /* Escape closes it, and the focus goes back to the button */
      R.d.getElementById('gsClose').focus();
      R.d.activeElement.dispatchEvent(new R.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(20);
      chk(o.md.hidden && R.d.activeElement === o.btn && !R.d.body.classList.contains('modal-open'), 'snapshot: Escape does not close the window and hand the focus back to its game\'s row');
      /* a click outside the window closes it; a click inside does not */
      o.btn.click(); await wait(60);
      R.d.getElementById('gsView').click(); await wait(20);
      const stays = !o.md.hidden;
      o.md.click(); await wait(20);
      chk(stays && o.md.hidden, 'snapshot: a click outside the window does not close it, or one inside does');
      /* the cards fold and unfold: a click on a card's title, Open all and Close all, without the
         window being drawn again; on a phone (the narrow screen's media query) the window opens on
         the verdict with every card folded, and Tab steps over a folded card's insides */
      { const md = o.md, b = id => md.querySelector(`#${id} [data-gs-fold]`), shown = id => !R.d.getElementById(id + 'B').hidden, mm0 = R.w.matchMedia;
        o.btn.click(); await wait(60);
        const keep = md.querySelector('#gsPos table.gs-pos');
        const ok1 = ['gsCalls', 'gsTeams'].every(shown) && SNAP_CARDS.filter(x => !['gsCalls', 'gsTeams'].includes(x)).every(x => !shown(x));
        b('gsUnits').click();
        const ok2 = shown('gsUnits') && b('gsUnits').getAttribute('aria-expanded') === 'true' && md.querySelector('#gsUnits').classList.contains('gs-open');
        b('gsUnits').click();
        const ok2b = !shown('gsUnits') && b('gsUnits').getAttribute('aria-expanded') === 'false';
        const all = md.querySelector('[data-gs-all]'), ok3 = !!all && all.dataset.gsAll === 'open';
        all.click(); const ok4 = SNAP_CARDS.every(shown) && all.dataset.gsAll === 'close' && txt(all) === 'Close all';
        all.click(); const ok5 = SNAP_CARDS.every(id => !shown(id)) && !md.hidden && txt(all) === 'Open all' && !!keep && keep.isConnected;
        R.d.getElementById('gsClose').click(); await wait(20);
        R.w.matchMedia = mq => ({ matches: /max-width/.test(mq), media: mq, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        o.btn.click(); await wait(60);
        const ok6 = SNAP_CARDS.every(id => !shown(id) && b(id).getAttribute('aria-expanded') === 'false') && !!md.querySelector('#gsMatch .gs-glance') && md.querySelector('[data-gs-all]').dataset.gsAll === 'open';
        const f = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && !x.closest('[hidden]'));
        const ok7 = f.length >= SNAP_CARDS.length + 2 && !f.some(x => x.closest('.gs-secbody'));
        b('gsTeams').click(); const ok8 = shown('gsTeams') && SNAP_CARDS.filter(x => x !== 'gsTeams').every(id => !shown(id));
        R.w.matchMedia = mm0;
        R.d.getElementById('gsClose').click(); await wait(20);
        chk(ok1 && ok2 && ok2b && ok3 && ok4 && ok5 && ok6 && ok7 && ok8 && R.d.activeElement === o.btn,
          `snapshot: the cards do not fold and unfold, or a phone does not open on the verdict with the cards folded (${[ok1, ok2, ok2b, ok3, ok4, ok5, ok6, ok7, ok8].join(' ')})`); }
      /* an answer of the verdict opens its card, folded or not, and hands the focus to the card's
         title; the stats behind the units open and close under their one button; the Starters tabs
         answer a click, the arrow keys, Home and End, and the tab chosen stays chosen when the window
         opens again; none of it draws the window again */
      { const md = o.md, shown = id => !R.d.getElementById(id + 'B').hidden, bad = [];
        o.btn.click(); await wait(60);
        const keep = md.querySelector('#gsMatch');
        for (const [gl, id] of [['out', 'gsPos'], ['vote', 'gsCalls'], ['mism', 'gsMism']]) {
          md.querySelector(`[data-gs-gl="${gl}"]`).click(); await wait(10);
          if (!shown(id) || md.querySelector(`#${id} [data-gs-fold]`).getAttribute('aria-expanded') !== 'true' || R.d.activeElement !== md.querySelector(`#${id} [data-gs-fold]`)) bad.push(`${gl} does not open ${id} and focus its title`); }
        const tabs = () => [...md.querySelectorAll('#gsPos [role="tab"]')], sel = () => tabs().find(t => t.getAttribute('aria-selected') === 'true');
        const panelOk = () => { const t = sel(); return !!t && [...md.querySelectorAll('#gsPos [role="tabpanel"]')].every(p => p.hidden === (p.id !== t.getAttribute('aria-controls'))); };
        if (tabs().length > 1) {
          tabs()[1].click(); if (sel() !== tabs()[1] || !panelOk()) bad.push('a click on a tab does not show its panel');
          const key = k => sel().dispatchEvent(new R.w.KeyboardEvent('keydown', { key: k, bubbles: true }));
          key('ArrowRight'); if (sel() !== tabs()[2 % tabs().length] || R.d.activeElement !== sel() || !panelOk()) bad.push('ArrowRight does not move to the next tab');
          key('Home'); if (sel() !== tabs()[0] || R.d.activeElement !== sel() || !panelOk()) bad.push('Home does not move to the first tab');
          key('ArrowLeft'); if (sel() !== tabs()[tabs().length - 1] || !panelOk()) bad.push('ArrowLeft does not wrap to the last tab');
          key('End'); key('ArrowLeft'); const chosen = sel().dataset.gsTab;
          R.d.getElementById('gsClose').click(); await wait(20); o.btn.click(); await wait(60);
          if (sel().dataset.gsTab !== chosen || !panelOk()) bad.push('the tab chosen is not kept when the window opens again'); }
        else if (!keep.isConnected) bad.push('a toggle drew the window again');
        R.d.getElementById('gsClose').click(); await wait(20);
        chk(bad.length === 0 && R.d.activeElement === o.btn, `snapshot: the verdict's answers or the Starters tabs do not work: ${bad.join('; ')}`); }
      /* Open all opens the cards in their order on the page, the Stat breakdown before Offense vs defense
         (the owner's call, 14 October 2026), and closes them all again */
      { const md = o.md; o.btn.click(); await wait(60);
        const secs = [...md.querySelectorAll('#gsView section.gs-fold[id]')].map(x => x.id), all = md.querySelector('[data-gs-all]');
        all.click(); const opened = SNAP_CARDS.every(id => !R.d.getElementById(id + 'B').hidden);
        all.click(); const shut = SNAP_CARDS.every(id => R.d.getElementById(id + 'B').hidden);
        const st = R.d.getElementById('gsStats'), un = R.d.getElementById('gsUnits');
        chk(secs.join() === SNAP_CARDS.join() && opened && shut && !!st && !!un && !!(st.compareDocumentPosition(un) & R.w.Node.DOCUMENT_POSITION_FOLLOWING),
          `snapshot: the cards are not Model Picks, Team strength, Stat breakdown, Offense vs defense, Mismatches and Starters, in that order, under Open all: ${secs.join()}`);
        R.d.getElementById('gsClose').click(); await wait(20); }
    }
  }
  /* a game the scoreboard says is over that the job has not graded: graded here on the scoreboard's winner */
  const sbFinal = ung[0] || null;
  if (sbFinal) {
    const o = await open(R, sbFinal); opened++;
    if (o.btn) { hold(R, sbFinal, 'a final on the scoreboard', sbFinal.home_team);
      chk(txt(o.md.querySelector('[data-gs-score]')) === '20–27', 'snapshot: a final on the scoreboard does not show the scoreboard\'s score');
      R.d.getElementById('gsClose').click(); await wait(20); chk(o.md.hidden && R.d.activeElement === o.btn, 'snapshot: Close does not close the window and hand the focus back'); }
    else chk(false, 'snapshot: a game final on the scoreboard opens no Game snapshot from its row');
  }
  /* a graded game, the latest */
  const played = st.schedule.filter(g => g.result != null && st.processed[g.game_id]).sort((x, y) => +y.week - +x.week)[0] || null;
  if (played) {
    const o = await open(R, played); opened++;
    if (o.btn) { hold(R, played, 'a graded game', played.result > 0 ? played.home_team : played.result < 0 ? played.away_team : null);
      chk(txt(o.md.querySelector('[data-gs-score]')) === `${played.away_score}–${played.home_score}`, 'snapshot: a graded game does not show its final score');
      R.d.getElementById('gsClose').click(); await wait(20); }
    else chk(false, 'snapshot: a graded game opens no Game snapshot from its row');
  }
  chk(opened > 0, 'snapshot: no game to open the window on');
  /* every questionable starter's Q, in the game his lineup is for (each game drawn once): with his
     own name, in his team's column, both columns covered */
  { const L = eloMu.lineups || {}, Q = eloMu.q || {}, games = new Map();
    for (const lu of Object.values(L)) if ((lu.players || []).some(pid => Q[pid])) { const g = st.schedule.find(x => x.game_id === lu.game_id); if (g) games.set(g.game_id, g); }
    let n = 0; const bad = [], sides = new Set();
    for (const g of games.values()) {
      R.w.gameSnapshot(g.game_id, null); await wait(20);
      const r = qPlaced(R, R.d.getElementById('gsModal'), g); n += r.n; r.sides.forEach(x => sides.add(x)); bad.push(...r.bad.map(b => `${g.game_id}: ${b}`));
      R.w.gameSnapshotClose(false); }
    chk(games.size > 0 && n > 0 && sides.size === 2 && bad.length === 0,
      `snapshot: the questionable starters' Q's are not each with their own player in their team's column (${n} Q's in ${games.size} games, ${[...sides].join(' and ') || 'no'} column): ${bad.slice(0, 4).join('; ')}${bad.length > 4 ? ` (${bad.length} in all)` : ''}`);
    /* and in each of those games and every game with a ranked player out, the verdict's Who's out
       and the Starters summary: each player out by name, the count out and the count questionable,
       as the files have them */
    const withOuts = new Map(games);
    for (const k of Object.keys(eloP.groups)) for (const x of eloP.groups[k].sidelined || []) { const lu = L[x.team]; const g = lu && st.schedule.find(y => y.game_id === lu.game_id); if (g) withOuts.set(g.game_id, g); }
    const bad2 = []; let names = 0;
    for (const g of withOuts.values()) {
      R.w.gameSnapshot(g.game_id, null); await wait(20);
      const md = R.d.getElementById('gsModal'), want = {};
      for (const t of [g.away_team, g.home_team]) { const outs = Object.keys(eloP.groups).flatMap(k => (eloP.groups[k].sidelined || []).filter(x => x.team === t));
        for (const x of outs) want['out:' + x.id] = x.name;
        if (outs.length) want['outn:' + t] = String(outs.length);
        const nq = L[t] ? (L[t].players || []).filter(pid => Q[pid]).length : 0; if (nq) want['qn:' + t] = String(nq); }
      const seen = new Set();
      for (const el of md.querySelectorAll('[data-gs-n^="out"],[data-gs-n^="qn:"]')) { const k = el.dataset.gsN; seen.add(k); if (/^out:/.test(k)) names++;
        if (want[k] !== txt(el)) bad2.push(`${g.game_id}: ${k} reads '${txt(el)}', the files '${want[k] || 'nothing'}'`); }
      for (const k of Object.keys(want)) if (!seen.has(k)) bad2.push(`${g.game_id}: ${k} (${want[k]}) is not shown`);
      R.w.gameSnapshotClose(false); }
    chk(withOuts.size > 0 && bad2.length === 0, `snapshot: who is out or questionable is not the files' (${names} names in ${withOuts.size} games): ${bad2.slice(0, 4).join('; ')}`); }
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
    chk(!!o2.btn && !o2.md.hidden && M2.errs.length === 0 && /did not load/.test(txt(o2.md.querySelector('#gsTeams'))) && /unit ratings did not load/.test(txt(o2.md.querySelector('#gsUnits')))
      && /did not load/.test(txt(o2.md.querySelector('#gsPos'))) && /did not load/.test(txt(o2.md.querySelector('#gsCalls [data-gs-model="elo"]')))
      && txt(o2.md.querySelector(`[data-gs-rec="${any.home_team}"]`)) === recOf(any.home_team, false) && !!o2.md.querySelector('#gsCalls [data-gs-model="alpha"][data-pick]'),
      'snapshot: with the ratings missing the window does not say so in each section and draw the matchup: ' + M2.errs.join('; '));
    M2.w.close();
  }
  /* a club yet to play this season (made so in a copy of model.json: the away offense and the home
     defense of a game): its units are shown on their carried ratings, ranked, marked carried from the
     season the file names, and the note says each team starts from the file's share of it */
  if (any && unitsOn && (eloM.units.params || {}).carry_from != null) {
    const M6 = JSON.parse(ELO_M), from = M6.units.params.carry_from, c = M6.units.params.carry;
    for (const [s, t] of [['off', any.away_team], ['def', any.home_team]]) { const v = M6.units[s][t];
      if (v) Object.assign(v, { games: 0, line: [], before: null, change: null, carried: true, start: v.elo }); }
    const swap = w2 => { let real = null; Object.defineProperty(w2, 'fetch', { configurable: true, set: f => { real = f; },
      get: () => (u, o) => /elo\/data\/model\.json/.test(String(u)) ? Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(M6)) }) : real(u, o) }); };
    const C6 = await run(st, undefined, wk => scoreboard(st, wk), false, { seed: swap }); await wait(400);
    const o = await open(C6, any), md = o.md;
    const mark = (s, t) => { const b = md && md.querySelector(`[data-gs-unit="${s}:${t}"]`), m = b && b.querySelector('[data-gs-carried]');
      return !!b && !!m && txt(m) === `carried from ${from}` && txt(b.querySelector('[data-gs-uelo]')) === String(M6.units[s][t].elo) && txt(b.querySelector('[data-gs-urank]')) === ordinal(M6.units[s][t].rank); };
    /* what the rating rests on, the carry among it, is each box's title now (no note under the card) */
    chk(!!o.btn && C6.errs.length === 0 && mark('off', any.away_team) && mark('def', any.home_team)
      && !md.querySelector(`[data-gs-unit="def:${any.away_team}"] [data-gs-carried]`) && !md.querySelector(`[data-gs-unit="off:${any.home_team}"] [data-gs-carried]`)
      && [...md.querySelectorAll('#gsUnits [data-gs-unit]')].every(b => (b.getAttribute('title') || '').includes(`starting the season from ${c} of its final rating in ${from}`)) && !md.querySelector('#gsUnits .gs-note'),
      `snapshot: a unit yet to play is not shown on its carried rating, ranked and marked carried from ${from}, or the boxes' title does not give the carry: ` + C6.errs.join('; '));
    C6.w.close();
    /* the day the carry is for: every club carried and none played (made so in a copy): both duels
       drawn on the carried ratings, each unit marked, and nothing says the units have not started */
    const M7 = JSON.parse(ELO_M);
    for (const s of ['off', 'def']) for (const v of Object.values(M7.units[s]))
      Object.assign(v, { games: 0, line: [], before: null, change: null, carried: true, record: [0, 0, 0], start: v.elo });
    const swap7 = w2 => { let real = null; Object.defineProperty(w2, 'fetch', { configurable: true, set: f => { real = f; },
      get: () => (u, o) => /elo\/data\/model\.json/.test(String(u)) ? Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(M7)) }) : real(u, o) }); };
    const C7 = await run(st, undefined, wk => scoreboard(st, wk), false, { seed: swap7 }); await wait(400);
    const o7 = await open(C7, any), md7 = o7.md;
    const mark7 = (s, t) => { const b = md7 && md7.querySelector(`[data-gs-unit="${s}:${t}"]`), m = b && b.querySelector('[data-gs-carried]');
      return !!b && !!m && txt(m) === `carried from ${from}` && txt(b.querySelector('[data-gs-uelo]')) === String(M7.units[s][t].elo); };
    chk(!!o7.btn && C7.errs.length === 0 && [any.home_team, any.away_team].every(t => mark7('off', t) && mark7('def', t))
      && !/not yet/i.test(txt(md7.querySelector('#gsUnits'))) && !/start once a team has a rated game/.test(txt(md7)),
      `snapshot: with every club carried and none played, the window does not draw both duels on the carried ratings, marked carried from ${from}: ` + C7.errs.join('; '));
    C7.w.close();
  }
  /* a playoff game (a wild-card game after week 18, still to play): the window draws, and says
     what the files have for it */
  { const alt = JSON.parse(JSON.stringify(st)), src = alt.schedule.filter(x => +x.week === 18)[0];
    if (src) {
      const x = JSON.parse(JSON.stringify(src)); x.game_id = x.game_id.replace(/_18_/, '_19_'); x.week = 19; x.game_type = 'WC';
      for (const k of ['result', 'home_score', 'away_score']) delete x[k]; alt.schedule.push(x);
      const A = await run(alt, undefined, wk => scoreboard(alt, wk)); await wait(400);
      const o = await open(A, x);
      chk(!!o.btn && !o.md.hidden && A.errs.length === 0 && SNAP_SECS.every(id => o.md.querySelector('#' + id)) && !/could not be drawn/.test(txt(o.md))
        && /Wild Card/.test(txt(A.d.getElementById('gsTitle'))) && (+eloMu.week === 19 || /The matchups are for/.test(txt(o.md.querySelector('#gsMism')))),
        'snapshot: a playoff game\'s window does not draw, or does not say what the files have for it: ' + A.errs.join('; ') + ' ' + (o.md ? txt(o.md.querySelector('#gsMism')).slice(0, 120) : ''));
      /* a game the prop model has not got (this made-up wild-card game) cannot open on the Props tab: no button to it */
      chk(!!o.md && A.w.pkBoard.canProps(x.game_id) === false && !o.md.querySelector('[data-gs-props]'), 'snapshot: a game the Props tab cannot open offers a button to it');
      A.w.close(); } }
  /* a graded wild-card game (made up in a copy of the state: the latest graded game played again in
     week 19, its result, its line and every call and grade with it): both its teams have a playoff
     record, and the window is held whole on that copy, the record check among it, so "4-1" with
     "playoffs 1-0" beside it is held as the elo job's morning smoke meets it through the playoffs */
  if (played && played.result) {
    const alt = JSON.parse(JSON.stringify(STATE)), x = JSON.parse(JSON.stringify(played));
    x.game_id = played.game_id.replace(/_\d+_/, '_19_'); x.week = 19; x.game_type = 'WC';
    for (const k of ['processed', 'atKickoff', 'odds', 'joker']) if (alt[k] && alt[k][played.game_id]) alt[k][x.game_id] = JSON.parse(JSON.stringify(alt[k][played.game_id]));
    alt.schedule.push(x);
    const A = await run(alt, undefined, wk => scoreboard(alt, wk)); await wait(400);
    const o = await open(A, x);
    chk(!!o.btn && A.errs.length === 0 && [x.away_team, x.home_team].every(t => !!o.md.querySelector(`[data-gs-po="${t}"]`)),
      'snapshot: a graded wild-card game\'s window does not open, or does not show both teams\' playoff records: ' + A.errs.join('; '));
    if (o.btn) { st = alt; try { hold(A, x, 'a graded wild-card game', x.result > 0 ? x.home_team : x.away_team); } finally { st = STATE; } }
    A.w.close(); }
}

/* =====================================================================================
   THE SEASON TRACKER'S GAMES IN THE GAME SNAPSHOT (14 October 2026): the preview in the verdict (its
   sentence alone: a note's news and sources, and the automatic line's starters out, are not shown, the
   owner's call of the same day), the Deep Dive inside Offense vs defense, and the Stat breakdown, from the news job's
   files. Every file here is a stand-in written below, never news/data's own: the elo job runs this
   smoke every morning, and a news job publish must never turn it red (news/tools/smoke.js holds the
   real files to their sources and to deepdive.js). Each number is worked out here on its own: the
   four tags of each possession by the rule (each row's edge, the offense unit's rating less the
   defense's, weighed by its matchup's weight: Easy from 1.5, Favorable from 0.5, the same the other
   way), the overall tag on the gap read as points, the records, and the stat bars'
   numbers, marks, split widths and colours; the Deep Dive's rows must be deepdive.js's own html for
   the stand-in, set in whole (a compact row each: the unit, the two clubs and ranks, the tag, and no
   name, no one out and no number from the file anywhere in the window), and the basis, the "Position
   matchups" label's title, counts each club's games as the file does. A game with no note to come
   draws the automatic line in the head's middle with no news (on a 404 and on a notes file that is not
   JSON too), a played one with none draws nothing, and a written one is its preview alone, escaped,
   the players it marks **so** bold and nothing else markup (a marked "<b>x</b>" is its text, an
   unpaired ** stays as typed), its news and sources not shown, and once the game has started dated as
   written before kickoff; a file that does not
   load says so in its own part and nothing throws: a units file lacking a club, one that is not JSON,
   a stat file of another season. The Rams
   are LA on the board and LAR in the news job's files: a game of theirs draws its stats and its Deep
   Dive from the LAR entries. A playoff game (the news job stops at week 18) says
   the Deep Dive is the regular season's only. And the window keeps the visitor's place while the
   files come in late: with the news files and the prop model held back, each redraw puts the focus
   back on the same control (Close where it has gone) and keeps the card scrolled to where it was on
   the screen as blocks are drawn in above it (jsdom lays nothing out: the layout is planted).
   ===================================================================================== */
async function newsChecks() {
  const c0 = checks, f0 = fails.length;
  const DDM = require('./deepdive.js'), eloM = JSON.parse(ELO_M), now = Date.now() - PAGE_SHIFT_MS, kick = g => etKick({ d: g.gameday, t: g.gametime });
  /* a game to come, over a day off by the page's clock: the schedule's first, or one made so in a copy
     (with every game played, --season-over) */
  let st = STATE, G = STATE.schedule.find(g => g.result == null && kick(g) > now + 86400e3);
  if (!G) { st = JSON.parse(JSON.stringify(STATE)); G = st.schedule[st.schedule.length - 1];
    for (const k of ['result', 'home_score', 'away_score']) delete G[k];
    if (st.processed) delete st.processed[G.game_id];
    G.gameday = new Date(now + 7 * 86400e3).toISOString().slice(0, 10); }
  const season = +String(G.game_id).slice(0, 4), wk = +G.week, a = G.away_team, h = G.home_team, A = DDM.club(a), H = DDM.club(h);
  /* a played game of another week whose home side is not in the stat file (and a second of that week
     with no note), another game of G's week with a note, and a game of a later week */
  const played = st.schedule.filter(g => g.result != null && +g.week !== wk && ![a, h].includes(g.home_team) && ![a, h].includes(g.away_team)).sort((x, y) => +y.week - +x.week);
  const P1 = played[0] || null, P2 = P1 && st.schedule.find(g => g !== P1 && g.result != null && +g.week === +P1.week) || null;
  const reg = g => g.game_type ? g.game_type === 'REG' : +g.week <= 18;
  const G2 = st.schedule.find(g => +g.week === wk && g !== G) || null, LATER = st.schedule.find(g => +g.week > wk && reg(g)) || null;
  /* the stand-in units.json: the two clubs of G, each unit's rating against the league (z), so each of
     the eight rows takes the tag worked out below; names with markup in them, and eight starters out */
  const META = { season, week: wk, built_at: '2026-10-14T09:43:06.160Z',
    tags: { rows: { weights: { qb: 1, ol: 0.5956, rb: 0.3792, rec: 0.8925, front: 0.5956, db: 0.8925 }, fav: 0.5, easy: 1.5, fit: '2012-2017' },
      headline: { slope: 11.9126, fav: 0.9645, easy: 2.8935, fit: '2012-2017' } } };
  const pl = (T, k, n, pos, q) => Object.assign({ id: `${T}-${k}`, n, pos }, q ? { q } : {});
  const out = (T, k, n, pos, why) => ({ id: `${T}-${k}`, n, pos, why });
  const unit = (rank, z, who, more) => Object.assign({ rank, z, who, stats: [['EPA per play', 0.05, rank], ['success rate', 44.1, rank, '%']] }, more || {});
  const clubOf = (T, z, outs, more, g26) => ({ g26,
    qb: unit(4, z.qb, [pl(T, 'qb1', `${T} Passer <One>`, 'QB', more.q)], Object.assign(outs.qb ? { out: outs.qb } : {}, more.next ? { next: more.next } : {})),
    ol: unit(10, z.ol, [pl(T, 't1', `${T} Tackle`, 'T'), pl(T, 'c1', `${T} Center`, 'C')], outs.ol ? { out: outs.ol } : {}),
    rb: unit(15, z.rb, [pl(T, 'rb1', `${T} Runner`, 'RB')], {}),
    rec: unit(20, z.rec, [pl(T, 'wr1', `${T} Wideout & Co`, 'WR'), pl(T, 'te1', `${T} Tight End`, 'TE')], outs.rec ? { out: outs.rec } : {}),
    front: unit(12, z.front, [pl(T, 'de1', `${T} Edge`, 'DE')], outs.front ? { out: outs.front } : {}),
    db: unit(8, z.db, [pl(T, 'cb1', `${T} Corner`, 'CB')], outs.db ? { out: outs.db } : {}),
    vs: { passD: { rank: 7, z: z.passD }, runD: { rank: 20, z: z.runD } } });
  /* a game's two clubs, keyed as the news job keys them (deepdive.js's club codes: the Rams are LAR),
     the away side's 5 games this season and the home side's 4 */
  const unitsOf = (a, h) => { const A = DDM.club(a), H = DDM.club(h);
    return { season, week: wk, built_at: META.built_at, meta: META, basis: '2025 season counted as 4 games (a stand-in)', lineups: 'Lineups from a stand-in depth chart',
      units: {
        [A]: clubOf(A, { qb: 1.2, ol: 0.3, rb: 0, rec: -1.0, front: -0.2, db: 0.6, passD: 0.4, runD: -0.9 },
          { qb: [out(A, 'qbx', `${A} Starter <Hurt>`, 'QB', 'out (knee)')], rec: [out(A, 'wrx', `${A} Receiver & Son`, 'WR', 'out (ankle)'), out(A, 'tex', `${A} Blocker`, 'TE', 'doubtful')] }, {}, 5),
        [H]: clubOf(H, { qb: -0.4, ol: -0.5, rb: 1.1, rec: 0.9, front: -0.6, db: 0.9, passD: -0.6, runD: 0.2 },
          { ol: [out(H, 'gx', `${H} Guard`, 'G', 'out'), out(H, 'tx', `${H} Tackle Two`, 'T', 'out'), out(H, 'cx', `${H} Center Two`, 'C', 'out')], front: [out(H, 'dtx', `${H} Nose`, 'DT', 'out')], db: [out(H, 'sx', `${H} Safety`, 'S', 'out (concussion)')] },
          { q: 'Questionable', next: { n: `${H} Backup`, pos: 'QB', from: 'chart' } }, 4) } }; };
  const UNITS = unitsOf(a, h);
  /* each row's tag by the rule, worked here on its own */
  const tagOf = (x, fav, easy) => x >= easy ? 'Easy' : x >= fav ? 'Favorable' : x > -fav ? 'Even' : x > -easy ? 'Tough' : 'Very tough';
  const RW = META.tags.rows.weights;
  const rowsWant = (O, D) => [['qb', D.vs.passD], ['ol', D.front], ['rb', D.vs.runD], ['rec', D.db]].map(([k, v]) => `${k}:${tagOf(RW[k] * (O[k].z - v.z), 0.5, 1.5)}`).join();
  /* every name the stand-in units file carries (who plays, who is out, the next quarterback): none is shown
     anywhere in the window (the owner's call, 14 October 2026: the automatic line has no news, and the
     Deep Dive's rows name nobody) */
  const unitNames = U => Object.values(U.units).flatMap(u => ['qb', 'ol', 'rb', 'rec', 'front', 'db'].flatMap(k => [...(u[k].who || []), ...(u[k].out || []), ...(u[k].next ? [u[k].next] : [])].map(x => x.n)));
  const namesShown = (md, U) => { const t = txt(md); return [...new Set(unitNames(U))].filter(n => t.includes(n)); };
  /* the Deep Dive's basis counts each club's games as the file has them: "SEA 5 games, DEN 4 games" */
  const gamesWant = (U, a, h) => [a, h].map(t => { const n = U.units[DDM.club(t)].g26; return `${t} ${n} game${n === 1 ? '' : 's'}`; }).join(', ');
  /* the stand-in stats.json: G's two clubs and P1's visitors; P1's home side left out. A tie (sacks), a
     pair at 0 (red zone), a missing number (explosive plays), a negative (turnovers) */
  const S1 = { ppg: 24.6, pa: 19.2, ypp: 5.9, yppa: 5.1, to: -0.6, sk: 2.4, ska: 2.4, third: 41.5, rz: 0, expl: 3.8, g: 5 };
  const S2 = { ppg: 21.3, pa: 25, ypp: 5.2, yppa: 5.6, to: 0.8, sk: 2.4, ska: 1.6, third: 38, rz: 0, expl: null, g: 4 };
  const STATS = { season, through: 'Oct 12', asof: '2026-10-14', stats: { [A]: S1, [H]: S2 } };
  if (P1) STATS.stats[DDM.club(P1.away_team)] = S1;
  /* the notes: G's week with a note for G2 and none for G, and P1's week with one for P1 and none for P2 */
  const NOTE_P = { preview: 'A <i>tight</i> one & a "rematch" with **Pat <Surtain> & Co** behind it, a lone ** left as typed.', news: 'The <b>starter</b> **J.J. "Smith" Jr.** is back & practising in full; **<b>x</b>** is text and **a*b** stays as typed.', sources: ['ESPN', 'Denver <Post>'] };
  /* what the page must show of a note: its text with each pair of markers (one to sixty characters, no *
     inside) taken off, and those names bold, worked out here on their own */
  const shownOf = raw => { const names = []; const text = raw.replace(/\*\*([^*]{1,60})\*\*/g, (m, n) => { names.push(n); return n; }); return { text, names }; };
  const NOTE_G2 = { preview: 'The other game of the week, in a sentence of its own here.', news: '', sources: [] };
  const notes = { [`${season}-w${wk}`]: { season, week: wk, written: '2026-10-14', games: G2 ? { [G2.game_id]: NOTE_G2 } : {} } };
  if (P1) notes[`${season}-w${+P1.week}`] = { season, week: +P1.week, written: '2026-10-07T18:00:00Z', games: { [P1.game_id]: NOTE_P } };

  const recOf = t => { const reg = g => g.game_type ? g.game_type === 'REG' : +g.week <= 18, r = [0, 0, 0]; let n = 0;
    for (const g of st.schedule) if (g.result != null && reg(g) && (g.home_team === t || g.away_team === t)) { n++; const m = g.home_team === t ? g.result : -g.result; r[m > 0 ? 0 : m < 0 ? 1 : 2]++; }
    const f = (eloM.teams && eloM.teams[t] && eloM.teams[t].record) || [0, 0, 0], x = n >= f[0] + f[1] + f[2] ? r : f;
    return x[0] + '-' + x[1] + (x[2] ? '-' + x[2] : ''); };
  const openG = async (R, g) => { const sel = R.d.getElementById('pkWeek');
    if (+sel.value !== +g.week) { sel.value = String(g.week); sel.dispatchEvent(new R.w.Event('change')); await wait(40); }
    const card = R.d.querySelector(`.pk-game[data-game="${g.game_id}"]`); if (!card) return null;
    card.click(); await wait(200); const md = R.d.getElementById('gsModal'); return md && !md.hidden ? md : null; };
  const closeG = async R => { R.w.gameSnapshotClose(false); await wait(10); };
  const htmlTxt = (R, html) => { const t = R.d.createElement('template'); t.innerHTML = html; return txt(t.content); };
  /* the Stat breakdown of a game against the stand-in's two lines (SA the away side's, SH the home's): each
     of the eleven rows' numbers, the better one marked, the bar split and coloured, the summary's counts */
  const SR = [['pd', s => s.ppg == null || s.pa == null ? null : Math.round((s.ppg - s.pa) * 10) / 10, false, true, false], ['ppg', s => s.ppg, false], ['pa', s => s.pa, true],
    ['ypp', s => s.ypp, false], ['yppa', s => s.yppa, true], ['to', s => s.to, false, true], ['sk', s => s.sk, false], ['ska', s => s.ska, true],
    ['third', s => s.third, false, false, true], ['rz', s => s.rz, false, false, true], ['expl', s => s.expl, false]];
  const split = (x, y, lo) => { if (x == null || y == null || (x === 0 && y === 0)) return [0, 0]; let pa;
    if (lo) { const ix = 1 / Math.max(x, 0.01), iy = 1 / Math.max(y, 0.01); pa = ix / (ix + iy) * 100; } else { const m = Math.min(x, y, 0); pa = (x - m) + (y - m) === 0 ? 50 : (x - m) / ((x - m) + (y - m)) * 100; }
    pa = Math.round(pa * 10) / 10; return [pa, Math.round((100 - pa) * 10) / 10]; };
  const fmt = (v, sign, pct) => v == null ? '–' : (v < 0 ? '−' + Math.abs(v) : (sign && v > 0 ? '+' : '') + v) + (pct ? '%' : '');
  const statsBad = (R, md, a, h, SA, SH) => {
    const bad = [], q = sel => md.querySelector(sel); let na = 0, nh = 0;
    const rows = md.querySelectorAll('#gsStats [data-gs-srow]');
    if ([...rows].map(r => r.dataset.gsSrow).join() !== SR.map(r => r[0]).join()) bad.push('the rows are ' + [...rows].map(r => r.dataset.gsSrow).join());
    for (const [k, f, lo, sign, pct] of SR) { const r = q(`#gsStats [data-gs-srow="${k}"]`); if (!r) continue;
      const x = f(SA), y = f(SH), [pa, ph] = split(x, y, lo), ba = x != null && y != null && x !== y && (lo ? x < y : x > y), bh = x != null && y != null && x !== y && !ba;
      if (ba) na++; if (bh) nh++;
      const va = r.querySelector(`[data-gs-sval="${a}"]`), vh = r.querySelector(`[data-gs-sval="${h}"]`), [ia, ih] = [...r.querySelectorAll('.gs-shalf i')];
      if (txt(va) !== fmt(x, sign, pct) || txt(vh) !== fmt(y, sign, pct)) bad.push(`${k} reads ${txt(va)} and ${txt(vh)}, the file ${fmt(x, sign, pct)} and ${fmt(y, sign, pct)}`);
      if (!!(va && va.closest('.gs-better')) !== ba || !!(vh && vh.closest('.gs-better')) !== bh || r.querySelectorAll('.gs-better').length !== (ba || bh ? 1 : 0)) bad.push(`${k}: the mark is on the wrong side`);
      if (!ia || !ih || ia.style.width !== pa + '%' || ih.style.width !== ph + '%') bad.push(`${k}'s bar is ${ia && ia.style.width} and ${ih && ih.style.width}, the numbers split it ${pa}% and ${ph}%`);
      if (ia && ih && (ia.style.getPropertyValue('--gs-tc') !== R.w.pkTagColor(a) || ih.style.getPropertyValue('--gs-tc') !== R.w.pkTagColor(h))) bad.push(`${k}'s bar is not in the teams' colours`); }
    if (txt(q(`#gsStats [data-gs-sb="${a}"]`)) !== String(na) || txt(q(`#gsStats [data-gs-sb="${h}"]`)) !== String(nh)) bad.push(`the summary counts ${txt(q(`#gsStats [data-gs-sb="${a}"]`))} and ${txt(q(`#gsStats [data-gs-sb="${h}"]`))}, the marks ${na} and ${nh}`);
    if (/Not in the file yet/.test(txt(q('#gsStats')))) bad.push('it says a team is not in the file: ' + (txt(q('#gsStats')).match(/Not in the file yet[^;.]*/) || [''])[0]);
    return bad; };

  /* ---- the files as the job writes them ---- */
  const N1 = await run(st, undefined, null, false, { news: { units: UNITS, stats: STATS, notes } }); await wait(400);
  chk(!N1.timedOut && N1.errs.length === 0, 'news: the page did not boot with the news files: ' + N1.errs.join('; '));
  const md = await openG(N1, G);
  if (!md) chk(false, `news: the game to come (${G.game_id}) opens no Game snapshot`);
  else {
    const q = sel => md.querySelector(sel), NAMES = N1.w.eval('TEAM_NAMES'), nick = t => NAMES[t] || t;
    chk(!/could not be drawn/.test(txt(md)) && N1.errs.length === 0, 'news: a part of the window failed with the news files in: ' + N1.errs.join('; ') + (txt(md).match(/[^.]*could not be drawn[^.]*/) || [''])[0]);
    /* the automatic line: no note for this game, still to come */
    { const pv = md.querySelectorAll('.gs-prev'), box = pv[0], bad = [];
      const line = box && txt(box.querySelector('[data-gs-preview]')), word = N1.w.pkBoard.neutral(G) ? 'play' : 'visit';
      if (pv.length !== 1 || box.dataset.gsNote !== 'auto') bad.push(`${pv.length} preview blocks, ${box ? box.dataset.gsNote : 'none'}`);
      else {
        if (txt(box.querySelector(`[data-gs-prec="${a}"]`)) !== recOf(a) || txt(box.querySelector(`[data-gs-prec="${h}"]`)) !== recOf(h)) bad.push(`the records read ${txt(box.querySelector(`[data-gs-prec="${a}"]`))} and ${txt(box.querySelector(`[data-gs-prec="${h}"]`))}, Team Rankings counts ${recOf(a)} and ${recOf(h)}`);
        if (!line.startsWith(`The ${nick(a)} (${recOf(a)}) ${word} the ${nick(h)} (${recOf(h)})`) || !line.endsWith('.')) bad.push(`it reads '${line}'`);
        /* the Preview line alone: no news (the starters out it once listed), no sources */
        if (box.querySelector('[data-gs-news]') || /\bNews\b|Out:/.test(txt(box)) || box.querySelectorAll('.gs-pv').length !== 1) bad.push(`it still has a news line: '${txt(box)}'`);
        if (!box.querySelector('.gs-pauto') || box.querySelector('[data-gs-sources]')) bad.push('it does not say it is automatic, or names sources');
        /* in the head's middle, under the kickoff line; the Vegas headline after the head */
        if (box.parentElement !== q('#gsMatch .gs-hero > .gs-mid') || box.previousElementSibling !== q('#gsMatch .gs-mid > .gs-when') || box.nextElementSibling || q('#gsMatch .gs-hero').nextElementSibling !== q('#gsMatch .gs-fav')) bad.push('it is not in the head\'s middle under the kickoff line, with the Vegas headline after the head'); }
      chk(bad.length === 0, `news: the automatic preview of a game to come with no note is not the files': ${bad.join('; ')}`); }
    /* the props button is still first in the verdict, ahead of the preview */
    chk(!!q('#gsMatch [data-gs-props]') === N1.w.pkBoard.canProps(G.game_id), 'news: the props button is not in the window exactly where the Props tab can open the game');
    /* the Deep Dive: each possession deepdive.js's own rows for the stand-in, set in whole, its four tags the rule's */
    { const bad = [];
      for (const [o, dd, O, D] of [[a, h, UNITS.units[A], UNITS.units[H]], [h, a, UNITS.units[H], UNITS.units[A]]]) {
        const el = q(`#gsUnits [data-gs-poss="${o}-${dd}"] .dd[data-dd-pos="${o}-${dd}"]`), want = DDM.possession(UNITS, o, dd);
        const tpl = N1.d.createElement('template'); tpl.innerHTML = want ? want.html : '';
        if (!el) { bad.push(`${o} against ${dd} has no Deep Dive rows`); continue; }
        if (!tpl.content.firstElementChild || el.outerHTML !== tpl.content.firstElementChild.outerHTML) bad.push(`${o} against ${dd}: the rows are not deepdive.js's for the file`);
        const got = [...el.querySelectorAll('.ddrow')].map(r => `${r.dataset.dd}:${r.querySelectorAll('.dtag').length === 1 ? txt(r.querySelector('.dtag')) : 'tags ' + r.querySelectorAll('.dtag').length}`).join();
        if (got !== rowsWant(O, D)) bad.push(`${o} against ${dd}: the tags read ${got}, the rule makes them ${rowsWant(O, D)}`); }
      if (md.querySelectorAll('#gsUnits [data-gs-ddwhy]').length) bad.push('a possession says why it has no rows: ' + txt(q('#gsUnits [data-gs-ddwhy]')));
      /* each row compact (the owner's call, 14 October 2026): the unit, the two sides (the offense's then the
         defense's, each its club and one rank) and the tag, in that order, and its words those alone */
      for (const r of md.querySelectorAll('#gsUnits .ddrow')) { const k = [...r.children], sd = k[1] ? [...k[1].querySelectorAll('.ddside')] : [];
        const words = `${txt(k[0])} ${r.dataset.ddOff} ${sd[0] ? txt(sd[0].querySelector('.ddrk')) : ''} · ${r.dataset.ddDef} ${sd[1] ? txt(sd[1].querySelector('.ddrk')) : ''} ${txt(k[2])}`;
        if (k.length !== 3 || !k[0].matches('.ddunit') || !k[1].matches('.ddrks') || !k[2].matches('.dtag') || sd.length !== 2 || !sd[0].matches('.ddoff') || !sd[1].matches('.dddef')
          || sd.some(x => x.querySelectorAll('.ddrk').length !== 1) || txt(sd[0].querySelector('.ddsn')) !== r.dataset.ddOff || txt(sd[1].querySelector('.ddsn')) !== r.dataset.ddDef
          || txt(r).replace(/\s+/g, ' ') !== words.replace(/\s+/g, ' ')) { bad.push(`the ${r.dataset.dd} row of ${r.dataset.ddOff} is not its unit, the two clubs and ranks and its tag alone: '${txt(r)}'`); break; } }
      const shown = namesShown(md, UNITS);
      if (shown.length) bad.push(`the window shows names from the units file: ${shown.join(', ')}`);
      /* what the rows rest on: the "Position matchups" label's title, never text under the card */
      const basis = htmlTxt(N1, DDM.basis(UNITS, a, h)), labs = [...md.querySelectorAll('#gsUnits [data-gs-basis]')];
      if (labs.length !== 2 || labs.some(l => txt(l) !== 'Position matchups' || !(l.getAttribute('title') || '').startsWith(basis) || !/ Built .+ by the news job\.$/.test(l.getAttribute('title') || ''))) bad.push(`the matchups' labels are not titled with the Deep Dive's basis and when it was built: ${labs.map(l => `'${txt(l)}' '${l.getAttribute('title')}'`).join(', ')}`);
      if (txt(q('#gsUnits')).includes(basis) || q('#gsUnits .gs-note')) bad.push('the basis is still a note under the card');
      if (!labs.length || !labs.every(l => (l.getAttribute('title') || '').includes(`, plus this season's ${gamesWant(UNITS, a, h)}.`))) bad.push(`the basis does not count the file's games, '${gamesWant(UNITS, a, h)}': ${((labs[0] && labs[0].getAttribute('title') || '').match(/plus this season's[^.]*\./) || ['none'])[0]}`);
      chk(bad.length === 0, `news: the Deep Dive in Offense vs defense is not the file's: ${bad.join('; ')}`); }
    /* the Overall line's tag: the gap read as points, as the Deep Dive's headline read it */
    if (eloM.units && eloM.units.off && eloM.units.def) { const bad = [];
      for (const [o, dd] of [[a, h], [h, a]]) { const vo = eloM.units.off[o], vd = eloM.units.def[dd], el = q(`[data-gs-head="${o}-${dd}"]`);
        if (!vo || !vd || !isFinite(vo.raw) || !isFinite(vd.raw)) { if (el) bad.push(`${o}-${dd} wears a tag with no rating to read`); continue; }
        const pts = META.tags.headline.slope * (vo.raw - vd.raw), tag = tagOf(pts, META.tags.headline.fav, META.tags.headline.easy), text = `${pts >= 0 ? '+' : '−'}${Math.abs(pts).toFixed(1)} pts`;
        const ht = DDM.headTag(META, vo, vd), pill = el && el.querySelector('.dtag');
        /* at the end of the possession's title line, its points beside it, its explanation its title */
        if (!pill || txt(pill) !== tag || txt(el.querySelector('.gs-hpts')) !== text || pill.getAttribute('title') !== ht.title || !el.closest('.gs-unit') || !el.parentElement.matches('.gs-uhd') || !el.previousElementSibling || el.previousElementSibling.tagName !== 'H4' || el.nextElementSibling
          || txt(el.previousElementSibling) !== `${nick(o)} Possession`)
          bad.push(`${o}-${dd} reads '${el ? txt(el) : 'nothing'}', the rule '${tag} ${text}'`); }
      chk(bad.length === 0, `news: the Overall line's tag is not the gap read as points: ${bad.join('; ')}`); }
    /* the Stat breakdown: each of the eleven rows' numbers, the better one marked, the bar split and coloured */
    { const bad = statsBad(N1, md, a, h, S1, S2);
      if (!txt(q('#gsStats [data-gs-sbasis]')).startsWith(`${season} season through Oct 12: ${a} 5 games, ${h} 4 games.`)) bad.push(`the basis reads '${txt(q('#gsStats [data-gs-sbasis]'))}'`);
      chk(bad.length === 0, `news: the Stat breakdown is not the file's: ${bad.slice(0, 6).join('; ')}`); }
    /* the Stat breakdown before Offense vs defense, and no Sources card (the owner's calls, 14 October 2026) */
    chk(!q('#gsFiles') && !!q('#gsStats') && !!q('#gsUnits') && !!(q('#gsStats').compareDocumentPosition(q('#gsUnits')) & N1.w.Node.DOCUMENT_POSITION_FOLLOWING),
      'news: the Stat breakdown is not before Offense vs defense, or the Sources card is still drawn');
    await closeG(N1);
  }
  /* a note written for a game: its sentence as text, never markup, its news and outlets not shown; labelled
     Preview while the game is to come, and once it has started dated as written before kickoff (its words
     on the teams' form were true then; the records above it are as they stand now) */
  const dayWant = s => /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : new Date(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const labWant = (g, file) => g.result != null || kick(g) <= now ? `Preview, written ${dayWant(file.written)}, before kickoff` : 'Preview';
  if (G2) { const m2 = await openG(N1, G2), b = m2 && m2.querySelector('.gs-prev'), lab = labWant(G2, notes[`${season}-w${wk}`]);
    chk(!!b && b.dataset.gsNote === 'written' && txt(b.querySelector('[data-gs-preview]')) === NOTE_G2.preview && !b.querySelector('[data-gs-news]') && !b.querySelector('[data-gs-sources]') && !b.querySelector('.gs-pauto')
      && txt(b.querySelector('.gs-pv .gs-lab')) === lab,
      `news: a game with a note and no news does not show its sentence alone, labelled '${lab}': ${b ? txt(b) : 'no preview'}`);
    await closeG(N1); }
  if (P1) { const m3 = await openG(N1, P1), q3 = sel => m3 && m3.querySelector(sel), b = q3('.gs-prev'), bad = [];
    if (!b || b.dataset.gsNote !== 'written') bad.push('no written preview');
    else {
      const pv = b.querySelector('[data-gs-preview]');
      /* the text as written less its markers, each marked name in a b.gs-pn of its own text alone, nothing
         else markup: "<b>x</b>" marked is that text in bold, "**a*b**" and a lone "**" stay as typed */
      const held = (el, raw, what) => { const W = shownOf(raw), k = el ? [...el.children] : [];
        if (!el || el.textContent !== W.text || k.some(x => x.tagName !== 'B' || !x.classList.contains('gs-pn') || x.children.length) || k.map(x => x.textContent).join('|') !== W.names.join('|'))
          bad.push(`the ${what} reads '${el && el.innerHTML}', not '${W.text}' with ${W.names.join(', ')} bold`); };
      held(pv, NOTE_P.preview, 'preview');
      if (shownOf(NOTE_P.preview).names.join('|') !== 'Pat <Surtain> & Co' || !shownOf(NOTE_P.preview).text.includes('a lone ** left')) bad.push('the smoke\'s own reading of the markers is off');
      /* the note's news and its sources are in the file and not on the page (the owner's call, 14 October 2026) */
      if (b.querySelector('[data-gs-news]') || b.querySelector('[data-gs-sources]') || b.querySelectorAll('.gs-pv').length !== 1 || /practising in full|Denver <Post>|ESPN/.test(txt(b))) bad.push(`its news or sources are still shown: '${txt(b)}'`);
      /* in the head's middle, under the score and the kickoff line; the played note after the head */
      if (b.parentElement !== q3('#gsMatch .gs-hero > .gs-mid') || b.previousElementSibling !== q3('#gsMatch .gs-mid > .gs-when') || q3('#gsMatch .gs-hero').nextElementSibling !== q3('#gsPast')) bad.push('a played game\'s note is not in the head\'s middle, with its played note after the head');
      const lab = `Preview, written ${dayWant(notes[`${season}-w${+P1.week}`].written)}, before kickoff`;
      if (txt(b.querySelector('.gs-pv .gs-lab')) !== lab) bad.push(`its label reads '${txt(b.querySelector('.gs-pv .gs-lab'))}', not '${lab}'`); }
    /* a game of another week: the Deep Dive says whose week it is for, both ways, and draws no rows */
    const why = [...(m3 ? m3.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt);
    if (why.length !== 2 || why.some(x => !new RegExp(`are for week ${wk}: this game's ${+P1.week < wk ? 'week has gone' : 'come with its week'}`).test(x)) || q3('#gsUnits .dd')) bad.push(`its Deep Dive reads '${why.join(' / ')}'`);
    /* a team missing from the stat file: dashes, no mark, no bar, and said */
    const hv = [...(m3 ? m3.querySelectorAll(`#gsStats [data-gs-sval="${P1.home_team}"]`) : [])];
    if (hv.length !== 11 || hv.some(x => txt(x) !== '–') || q3('#gsStats .gs-better') || [...(m3 ? m3.querySelectorAll('#gsStats .gs-shalf i') : [])].some(i => i.style.width !== '0%') || !new RegExp(`Not in the file yet: ${P1.home_team}`).test(txt(q3('#gsStats'))))
      bad.push(`the stat breakdown of a team the file lacks reads ${hv.map(txt).join(' ')}`);
    chk(bad.length === 0, `news: a played game with a note (${P1.game_id}) is not drawn as the files have it: ${bad.join('; ')}`);
    await closeG(N1); }
  if (P2) { const m4 = await openG(N1, P2);
    chk(!!m4 && !m4.querySelector('.gs-prev'), `news: a played game with no note (${P2.game_id}) draws a preview`); await closeG(N1); }
  if (LATER) { const m5 = await openG(N1, LATER), why = [...(m5 ? m5.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt);
    chk(why.length === 2 && why.every(x => new RegExp(`are for week ${wk}: this game's come with its week`).test(x)) && !m5.querySelector('#gsUnits .dd'),
      `news: a game of a later regular-season week does not say its Deep Dive comes with its week: '${why.join(' / ')}'`); await closeG(N1); }
  /* each file read once a page load (the notes once a week), no-store, however often the window opened */
  await openG(N1, G); await closeG(N1);
  { const nc = N1.calls.filter(c => /\/news\/data\//.test(c.url)), urls = nc.map(c => c.url.replace(/\?.*$/, ''));
    chk(nc.every(c => c.cache === 'no-store' && c.method === 'GET') && new Set(urls).size === urls.length && urls.some(u => u.endsWith('news/data/units.json')) && urls.some(u => u.endsWith('news/data/stats.json'))
      && urls.some(u => u.endsWith(`news/data/notes/${season}-w${wk}.json`)) && (!P1 || urls.some(u => u.endsWith(`news/data/notes/${season}-w${+P1.week}.json`))),
      'news: the news files are not each read once, no-store, at their addresses: ' + urls.join(', ')); }
  N1.w.close();

  /* ---- every news file missing: the automatic line with no news, each part saying it did not load, nothing thrown ---- */
  { const N2 = await run(st, undefined, null, false, { news: {} }); await wait(400);
    const m = await openG(N2, G), b = m && m.querySelector('.gs-prev');
    chk(!!m && N2.errs.length === 0 && !/could not be drawn/.test(txt(m)) && !!b && b.dataset.gsNote === 'auto' && !b.querySelector('[data-gs-news]')
      && [...m.querySelectorAll('#gsUnits [data-gs-ddwhy]')].length === 2 && [...m.querySelectorAll('#gsUnits [data-gs-ddwhy]')].every(x => /Deep Dive did not load/.test(txt(x)))
      && !m.querySelector('[data-gs-head]') && /stat breakdown did not load/.test(txt(m.querySelector('#gsStats'))) && txt(m.querySelector('#gsStats .gs-sum')) === 'did not load'
      && !m.querySelector('#gsFiles'),
      'news: with every news file missing the window does not draw the automatic line and say each part did not load: ' + N2.errs.join('; ') + ' ' + (m ? txt(m.querySelector('#gsStats')).slice(0, 80) : 'no window'));
    N2.w.close(); }
  /* ---- a notes file that is not JSON and a stat file of the wrong shape: the automatic line (its news from the units), the stats said not loaded ---- */
  { const N3 = await run(st, undefined, null, false, { news: { units: UNITS, stats: { season, stats: [1, 2] }, notes: { [`${season}-w${wk}`]: 'this is not { json' } } }); await wait(400);
    const m = await openG(N3, G), b = m && m.querySelector('.gs-prev');
    chk(!!m && N3.errs.length === 0 && !!b && b.dataset.gsNote === 'auto' && !b.querySelector('[data-gs-news]') && /stat breakdown did not load/.test(txt(m.querySelector('#gsStats'))) && !!m.querySelector('#gsUnits .dd'),
      'news: a notes file that is not JSON does not draw the automatic line, or a stat file of the wrong shape is drawn: ' + N3.errs.join('; ') + ' ' + (b ? txt(b) : 'no preview'));
    N3.w.close(); }
  /* ---- a units file lacking one of the game's clubs: each possession says which, no rows, nothing thrown ---- */
  { const U4 = Object.assign({}, UNITS, { units: { [A]: UNITS.units[A] } });
    const N4 = await run(st, undefined, null, false, { news: { units: U4, stats: STATS, notes } }); await wait(400);
    const m = await openG(N4, G), why = [...(m ? m.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt), b = m && m.querySelector('.gs-prev');
    chk(!!m && N4.errs.length === 0 && !/could not be drawn/.test(txt(m)) && why.length === 2 && why.every(x => x === `The Deep Dive has no matchups for ${h}.`) && !m.querySelector('#gsUnits .dd')
      && !!b && !b.querySelector('[data-gs-news]') && !namesShown(m, U4).length,
      `news: a units file lacking ${h} does not say it has no matchups for it, or names a player from the file: ${N4.errs.join('; ')} '${why.join(' / ')}' ${b ? txt(b) : 'no preview'}`);
    N4.w.close(); }
  /* ---- a units file that is not JSON, and a stat file of another season: each says so in its own card and in
     Sources, nothing thrown ---- */
  { const N5 = await run(st, undefined, null, false, { news: { units: 'not { json', stats: Object.assign({}, STATS, { season: season - 1 }), notes } }); await wait(400);
    const m = await openG(N5, G), why = [...(m ? m.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt);
    chk(!!m && N5.errs.length === 0 && !/could not be drawn/.test(txt(m)) && why.length === 2 && why.every(x => /^The Deep Dive did not load\b/.test(x)) && !m.querySelector('#gsUnits .dd')
      && txt(m.querySelector('#gsStats .gs-msg')) === `The stat breakdown is ${season - 1}'s season; this game is ${season}'s.` && txt(m.querySelector('#gsStats .gs-sum')) === `${season - 1}'s numbers` && !m.querySelector('#gsStats [data-gs-srow]'),
      `news: a units file that is not JSON or a stat file of another season is not said so: ${N5.errs.join('; ')} '${why.join(' / ')}' '${m ? txt(m.querySelector('#gsStats .gs-secbody')) : 'no window'}'`);
    N5.w.close(); }

  /* ---- the Rams: LA on the board, LAR in the news job's files. A copy of G with LA at home (unless a side
     already is), the stand-ins keyed by deepdive.js's club codes as the job keys them: the Stat breakdown
     and the Deep Dive read LA's entries from LAR. And a made-up wild-card game
     (week 19): the news job stops at week 18, so the Deep Dive says it is the regular season's only ---- */
  { const lst = JSON.parse(JSON.stringify(st)), LG = lst.schedule.find(x => x.game_id === G.game_id);
    if (![LG.away_team, LG.home_team].includes('LA')) { LG.home_team = 'LA'; LG.game_id = LG.game_id.replace(/_[A-Z]+$/, '_LA'); }
    const la = LG.away_team, lh = LG.home_team, UL = unitsOf(la, lh);
    const SL = { season, through: 'Oct 12', asof: '2026-10-14', stats: { [DDM.club(la)]: S1, [DDM.club(lh)]: S2 } };
    const src = lst.schedule.filter(x => +x.week === 18 && reg(x))[0], WC = src ? JSON.parse(JSON.stringify(src)) : null;
    if (WC) { WC.game_id = WC.game_id.replace(/_18_/, '_19_'); WC.week = 19; WC.game_type = 'WC'; for (const k of ['result', 'home_score', 'away_score']) delete WC[k]; lst.schedule.push(WC); }
    const NL = await run(lst, undefined, null, false, { news: { units: UL, stats: SL, notes } }); await wait(400);
    const m = await openG(NL, LG), bad = [];
    if (!m) bad.push('the game opens no window');
    else {
      const q = sel => m.querySelector(sel);
      if (!Object.keys(UL.units).includes('LAR') || Object.keys(UL.units).includes('LA') || !Object.keys(SL.stats).includes('LAR')) bad.push('the stand-ins are not keyed LAR');
      bad.push(...statsBad(NL, m, la, lh, S1, S2).map(x => 'the Stat breakdown: ' + x));
      for (const [o, dd] of [[la, lh], [lh, la]]) { const el = q(`#gsUnits [data-gs-poss="${o}-${dd}"] .dd[data-dd-pos="${o}-${dd}"]`), want = DDM.possession(UL, o, dd);
        const tpl = NL.d.createElement('template'); tpl.innerHTML = want ? want.html : '';
        if (!el || !tpl.content.firstElementChild || el.outerHTML !== tpl.content.firstElementChild.outerHTML) bad.push(`${o} against ${dd}: the Deep Dive is not deepdive.js's rows from LAR's entry: ${el ? 'other rows' : txt(q(`#gsUnits [data-gs-poss="${o}-${dd}"] [data-gs-ddwhy]`)) || 'none'}`); }
      if (![...m.querySelectorAll('#gsUnits [data-gs-basis]')].map(l => l.getAttribute('title') || '').some(t => t.includes(`, plus this season's ${gamesWant(UL, la, lh)}.`))) bad.push(`the Deep Dive's basis does not count LA's games from LAR's entry`); }
    chk(bad.length === 0 && NL.errs.length === 0, `news: a Rams game (${la} at ${lh}) does not read LA's entries from the files' LAR: ${NL.errs.join('; ')} ${bad.slice(0, 6).join('; ')}`);
    await closeG(NL);
    if (WC) { const mw = await openG(NL, WC), why = [...(mw ? mw.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt), b = mw && mw.querySelector('.gs-prev');
      chk(!!mw && NL.errs.length === 0 && why.length === 2 && why.every(x => x === 'The Deep Dive covers the regular season only; its matchups end with week 18.') && !mw.querySelector('#gsUnits .dd')
        && !mw.querySelector('#gsUnits [data-gs-basis]') && (!b || !b.querySelector('[data-gs-news]')),
        `news: a wild-card game does not say the Deep Dive covers the regular season only: '${why.join(' / ')}' ${NL.errs.join('; ')}`);
      await closeG(NL); }
    NL.w.close(); }

  /* ---- the files coming in late: the news files and the prop model held back, released one by one. Each
     redraw keeps the focus on the same control (found again, a new element) or puts it on Close where that
     control has gone, never on the page's body; and the card scrolled to (Offense vs defense) stays where it
     was on the screen as the preview, the Stat breakdown's rows and the props button are drawn in above it.
     jsdom lays nothing out, so the layout is planted: every element in the window 40px tall in the page's
     order, the header 64px, Offense vs defense 120px from the top of the screen; the arithmetic is then
     held. Each part says it is loading while its file is read, and draws once it is in ---- */
  { const gate = () => { let go; const p = new Promise(r => { go = r; }); return { p, go }; }, gU = gate(), gS = gate(), gP = gate();
    const NH = await run(st, undefined, null, false, { news: { units: UNITS, stats: STATS, notes }, gate: { units: gU.p, notes: gU.p, stats: gS.p, payload: gP.p }, early: true });
    const m = await openG(NH, G), bad = [];
    if (!m) bad.push('the game opens no window while the files are held');
    else {
      const q = sel => m.querySelector(sel), view = NH.d.getElementById('gsView'), PX = 40, tgt = () => NH.d.getElementById('gsUnits');
      if (NH.timedOut || NH.w.pkBoard.canProps(G.game_id) || q('[data-gs-props]')) bad.push('the prop model was up before its payload was let through');
      if ([...m.querySelectorAll('#gsUnits [data-gs-ddwhy]')].map(txt).join('|') !== 'Loading the Deep Dive…|Loading the Deep Dive…' || txt(q('#gsStats .gs-sum')) !== 'loading…' || !/Loading the stat breakdown/.test(txt(q('#gsStats')))) bad.push('the Deep Dive or the Stat breakdown does not say it is loading');
      const idx = el => [...view.querySelectorAll('*')].indexOf(el);
      NH.w.Element.prototype.getBoundingClientRect = function () { const r = (t, hh) => ({ top: t, bottom: t + hh, height: hh, left: 0, right: 320, width: 320, x: 0, y: t });
        if (this.id === 'gsTop') return r(0, 64); if (this.id === 'gsModal') return r(0, 800);
        return this === tgt() ? r(64 + PX * idx(this) - m.scrollTop, PX) : r(-1e6, PX); };
      const top = () => tgt().getBoundingClientRect().top;
      /* each step: the control focused, the file let through, then the focus and the card's place held */
      const step = async (what, focus, release, settle) => {
        const f = focus(), i0 = idx(tgt()), y0 = m.scrollTop; f.focus();
        if (NH.d.activeElement !== f) { bad.push(`${what}: the control could not be focused`); return; }
        release(); await settle();
        const at = NH.d.activeElement, i1 = idx(tgt());
        return { f, at, i0, i1, y0 }; };
      m.scrollTop = 64 + PX * idx(tgt()) - 120;
      const keep = (what, r, key, val) => { if (!r) return;
        if (r.at === r.f || !r.at || !m.contains(r.at) || r.at.dataset[key] !== val) bad.push(`${what}: the focus is on ${r.at === r.f ? 'the old, removed control' : r.at && r.at.id ? '#' + r.at.id : r.at ? r.at.tagName : 'nothing'}, not ${key} ${val} drawn again`);
        if (top() !== 120 || m.scrollTop !== r.y0 + PX * (r.i1 - r.i0)) bad.push(`${what}: Offense vs defense moved to ${top()}px from 120 (scrolled ${m.scrollTop}, ${r.i1 - r.i0} blocks drawn in above it)`); };
      /* the units and the week's notes: the automatic preview drawn in above, the Deep Dive's rows inside */
      const r1 = await step('the units and the notes coming in', () => q('[data-gs-fold="gsStats"]'), () => gU.go(), () => wait(150));
      keep('the units and the notes coming in', r1, 'gsFold', 'gsStats');
      if (r1 && !(r1.i1 > r1.i0)) bad.push('nothing was drawn in above Offense vs defense as the units and the notes came in');
      if (!q('#gsUnits .dd') || !q('.gs-prev')) bad.push('the Deep Dive or the preview was not drawn once its file came in');
      if (txt(q('#gsStats .gs-sum')) !== 'loading…') bad.push(`the Stat breakdown reads '${txt(q('#gsStats .gs-sum'))}' while its file is still read`);
      /* a control that is not drawn again: the focus goes to Close; the Stat breakdown's rows drawn in above */
      const gone = NH.d.createElement('button'); gone.type = 'button'; gone.dataset.gsFold = 'gone'; view.appendChild(gone);
      const r2 = await step('the stats coming in', () => gone, () => gS.go(), () => wait(150));
      if (r2 && r2.at !== NH.d.getElementById('gsClose')) bad.push(`the stats coming in: a control not drawn again leaves the focus on ${r2.at ? r2.at.tagName : 'nothing'}, not Close`);
      if (r2 && (top() !== 120 || m.scrollTop !== r2.y0 + PX * (r2.i1 - r2.i0))) bad.push(`the stats coming in: Offense vs defense moved to ${top()}px`);
      if (r2 && !(r2.i1 > r2.i0)) bad.push('the Stat breakdown\'s rows were not drawn in above Offense vs defense');
      if (!q('#gsStats [data-gs-srow]') || /loading/.test(txt(q('#gsStats .gs-sum')))) bad.push(`the Stat breakdown is not drawn with every file in: '${txt(q('#gsStats .gs-sum'))}'`);
      /* the prop model coming up: the props button drawn in first in the window */
      const r3 = await step('the prop model coming up', () => q('[data-gs-goto="gsUnits"]'), () => gP.go(), async () => { for (let i = 0; i < 200 && !NH.w.eval("typeof S==='object'&&!!S&&Array.isArray(S.sched)"); i++) await wait(50); await wait(400); });
      keep('the prop model coming up', r3, 'gsGoto', 'gsUnits');
      if (!!q('[data-gs-props]') !== NH.w.pkBoard.canProps(G.game_id)) bad.push('the props button is not drawn in once the prop model is up');
      if (r3 && q('[data-gs-props]') && !(r3.i1 > r3.i0)) bad.push('the props button was not drawn in above Offense vs defense'); }
    chk(bad.length === 0 && NH.errs.length === 0, `news: the window does not keep the visitor's place as the files come in late: ${NH.errs.join('; ')} ${bad.slice(0, 6).join('; ')}`);
    NH.w.close(); }
  console.log(`the Season Tracker's games in the Game snapshot: ${checks - c0} checks on stand-in news files (${G.game_id} to come${P1 ? ', ' + P1.game_id + ' played' : ''}), ${fails.length - f0} failures`);
}

/* =====================================================================================
   FRIENDS' PICKS ON THE PICK'EM RECORD (the owner's call, 15 October 2026): picks/friends.json,
   read by the page (nflbets/build/friends.js, window.FRIENDS) no-store, handed to the betting frame
   and drawn by record_viz.js beside the models. All on stand-ins: the real file is never read here
   (picks/tools/test_add.js and the betting smoke hold it to its rules). A stand-in state takes the
   last week the models were graded in and plants four of its games: a home win and an away win,
   both graded and with a line (the home side favoured), one still to play and a tie. Three friends
   pick them, one of them a pick saved at its game's kickoff, and their records are worked out here
   on their own: the grid's rows and cells (pending said), the chart's dashed lines and the legend
   against Vegas, the pick grid's columns, and a junk name dropped. A missing file, a file that is not
   JSON, one of another season and one with no list each draw no friend and throw nothing.
   ===================================================================================== */
async function friendsChecks() {
  const c0 = checks, f0 = fails.length;
  const BET_FRAME = JSON.parse(HTML.match(/\nconst BET_APP=("(?:[^"\\]|\\.)*");\n<\/script>/)[1]);
  chk(/window\.FRIENDS=window\.FRIENDS\|\|\(function\(\)\{try\{return window\.parent!==window&&window\.parent\.FRIENDS\|\|null;/.test(BET_FRAME), 'the betting frame is not handed the page\'s FRIENDS');
  /* the stand-in state */
  const st = JSON.parse(JSON.stringify(STATE));
  const byWeek = {}; for (const r of Object.values(st.processed)) if (r.correct !== null) byWeek[+r.week] = (byWeek[+r.week] || 0) + 1;
  const Wk = Math.max(...Object.keys(byWeek).map(Number).filter(w => st.schedule.filter(g => +g.week === w).length >= 4));
  const games = st.schedule.filter(g => +g.week === Wk).slice(0, 4);
  const at = [['2026-10-15', '20:15'], ['2026-10-18', '13:00'], ['2026-10-18', '16:25'], ['2026-10-19', '20:15']];
  const kick = ['2026-10-16T00:15:00.000Z', '2026-10-18T17:00:00.000Z', '2026-10-18T20:25:00.000Z', '2026-10-20T00:15:00.000Z'];
  const res = [7, -3, null, 0];
  games.forEach((g, i) => { g.gameday = at[i][0]; g.gametime = at[i][1]; g.spread_line = 3;
    if (res[i] == null) { g.result = null; g.home_score = null; g.away_score = null; delete st.processed[g.game_id]; return; }
    Object.assign(g, { result: res[i], home_score: 20 + Math.max(0, res[i]), away_score: 20 - Math.min(0, res[i]) });
    st.processed[g.game_id] = { week: Wk, home: g.home_team, away: g.away_team, pick: g.home_team, conf: 0.6, margin: 3, pHome: 0.6, blended: false,
      result: res[i], correct: res[i] === 0 ? null : res[i] > 0, line: 3, news: [] }; });
  /* every later game unplayed, so this week is the pick grid's own */
  for (const g of st.schedule) if (+g.week > Wk) { g.result = null; delete st.processed[g.game_id]; }
  const [g1, g2, g3, g4] = games, H = g => g.home_team, A = g => g.away_team, early = '2026-10-14T12:00:00.000Z';
  const pk = (pick, saved_at = early) => ({ pick, saved_at });
  const FIX = { how: 'stand-in', season: BET_SEASON, updated: '2026-10-15T10:00:00Z', friends: [
    { name: 'Ann', weeks: { ['w' + Wk]: { saved_at: early, tiebreaker: { game_id: g4.game_id, total_points: 41 },
      picks: { [g1.game_id]: pk(H(g1)), [g2.game_id]: pk(H(g2)), [g3.game_id]: pk(A(g3)), [g4.game_id]: pk(H(g4)) } } } },
    { name: '<b>Junk</b>', weeks: { ['w' + Wk]: { saved_at: early, picks: { [g1.game_id]: pk(H(g1)) } } } },
    { name: 'Bo', weeks: { ['w' + Wk]: { saved_at: kick[1], tiebreaker: null,
      picks: { [g1.game_id]: pk(A(g1)), [g2.game_id]: pk(A(g2), kick[1]), [g3.game_id]: pk(H(g3)) } } } },
    { name: 'Cy', weeks: { ['w' + Wk]: { saved_at: early, tiebreaker: null, picks: { [g3.game_id]: pk(H(g3)) } } } }] };
  /* worked out by hand: Vegas picks the home side (line 3) and is right on g1, wrong on g2.
     Ann: g1 won, g2 lost, g3 pending, g4 a tie (nobody): 1-1, 1 pending, against Vegas 0.
     Bo: g1 lost, g2 saved at kickoff (not counted), g3 pending: 0-1, 1 pending, against Vegas -1.
     Cy: g3 pending alone: no line on the chart. */
  const want = { Ann: { w: 1, l: 1, p: 1, net: '0' }, Bo: { w: 0, l: 1, p: 1, net: '−1' }, Cy: { w: 0, l: 0, p: 1, net: null } };
  const frame = (X, s2) => new Promise(resolve => {
    const errs = [];
    const dom = new JSDOM(BET_FRAME.replace('window.EMBED_TAB=null', 'window.EMBED_TAB="record"'), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://demon-x13.github.io/nfl-hub/nflbets/',
      beforeParse(fw) { if (X) fw.FRIENDS = X; fw.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
        fw.confirm = () => true; fw.alert = () => {}; fw.scrollTo = () => {};
        fw.addEventListener('error', e => errs.push(e.message));
        fw.fetch = async (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase(); ALL_CALLS.push(m + ' ' + s);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); throw new TypeError('Failed to fetch'); }
          if (/elo\/data\/model\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(ELO_M) };
          if (/state\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(s2)) };
          return { ok: false, status: 404, json: async () => null }; }; } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs }), 1500); });
  const rowsTh = fd => [...fd.querySelectorAll('#recordTable table.rv-grid tbody tr')].map(tr => txt(tr.querySelector('th')));
  const rowOf = (fd, n) => [...fd.querySelectorAll('#recordTable table.rv-grid tbody tr.rv-friend')].find(tr => txt(tr.querySelector('th')) === n);
  const pickHead = async F => { F.w.eval(`S.picksOpen=true; S.picksWeek=${Wk}; renderRecord()`); await wait(80);
    return [...F.d.querySelectorAll('.pickgrid thead th')].map(th => txt(th)); };
  const base = await frame(null, st); const baseHead = await pickHead(base), baseRows = rowsTh(base.d).join('|'), baseLines = base.d.querySelectorAll('#modelChart polyline').length;
  chk(base.errs.length === 0 && !/Friends/.test(baseRows) && baseHead.join('|') === 'Game|Alpha Model|The Joker|ELO Model|Vegas', 'friends: a frame with no FRIENDS is not drawn as before: ' + baseRows + ' / ' + baseHead.join('|') + ' ' + base.errs.join('; '));
  base.w.close();

  /* the page reads the stand-in once, no-store, and cleans it */
  const P = await run(st, 'https://demon-x13.github.io/nfl-hub/nflbets/#record', null, false, { friends: FIX });
  await P.w.FRIENDS.ready();
  { const got = P.w.FRIENDS.get(), fc = P.calls.filter(c => /picks\/friends\.json/.test(c.url));
    chk(fc.length === 1 && fc[0].method === 'GET' && fc[0].cache === 'no-store' && fc[0].url.replace(/\?.*$/, '') === '../picks/friends.json', 'friends: the page does not read ../picks/friends.json once, no-store: ' + JSON.stringify(fc));
    chk(got.status.ok === true && got.friends.map(f => f.name).join() === 'Ann,Bo,Cy', 'friends: the page\'s FRIENDS is not the file\'s three friends, the junk name dropped: ' + JSON.stringify(got.friends.map(f => f.name)));
    chk(!/"D money fresh"|nfl-hub-weekly-picks/.test(HTML), 'friends: the page bakes in friends\' picks'); }
  const F = await frame(P.w.FRIENDS, st); await wait(200);
  { const th = rowsTh(F.d), i = th.indexOf('Friends');
    chk(F.errs.length === 0, 'friends: the frame threw: ' + F.errs.join('; '));
    chk(i > 0 && th[i - 1] === 'Vegas' && th.slice(i + 1).join() === 'Ann,Bo,Cy', 'friends: the grid does not list Ann, Bo and Cy under a Friends heading after Vegas: ' + th.join('|'));
    chk(!/Junk/.test(txt(F.d.getElementById('recordTable')) + txt(F.d.getElementById('modelChart'))), 'friends: a name that is not plain text is drawn');
    const heads = [...F.d.querySelectorAll('#recordTable thead th.rv-c')].map(h => h.childNodes[0] ? h.childNodes[0].textContent.trim() : ''), col = heads.indexOf(Wk > 18 ? 'Playoffs ' + (Wk - 18) : 'Week ' + Wk);
    for (const [n, t] of Object.entries(want)) { const tr = rowOf(F.d, n), cells = tr ? [...tr.querySelectorAll('td')] : [];
      const g = t.w + t.l, exp = g ? `${t.w}–${t.l}${Math.round(100 * t.w / g)}%${t.p ? ` · ${t.p} pending` : ''}` : `–${t.p} pending`;
      const wc = cells[col], sc = cells[cells.length - 1];
      chk(!!wc && txt(wc).replace(/\s/g, '') === exp.replace(/\s/g, '') && !!sc && txt(sc).replace(/\s/g, '') === exp.replace(/\s/g, ''),
        `friends: ${n}'s week ${Wk} and season should read ${exp}: ${wc ? txt(wc) : 'no cell'} / ${sc ? txt(sc) : 'no cell'}`);
      chk(!g ? /rv-pend/.test(wc && wc.className) && /none played yet/.test(wc.getAttribute('title')) : !/rv-pend/.test(wc && wc.className), `friends: ${n}'s pending week is not drawn as pending`);
      chk(cells.filter((c, j) => j !== col && j !== cells.length - 1).every(c => txt(c) === '–'), `friends: ${n} has a record in a week they did not pick`); }
    chk(/tiebreaker 41 points/.test(rowOf(F.d, 'Ann').querySelectorAll('td')[col].getAttribute('title')), 'friends: Ann\'s tiebreaker is not kept on her week');
    /* the chart: a dashed line each for the two with a decided game, none for Cy */
    const lines = [...F.d.querySelectorAll('#modelChart polyline.rv-friend')];
    chk(lines.length === 2 && lines.every(l => l.getAttribute('stroke-dasharray')) && F.d.querySelectorAll('#modelChart polyline').length === baseLines + 2,
      `friends: the chart does not draw two dashed friend lines beside the models' (${lines.length}, ${F.d.querySelectorAll('#modelChart polyline').length} lines against ${baseLines})`);
    const lg = txt(F.d.querySelector('#modelChart .rv-flg'));
    chk(/^Friends/.test(lg) && lg.includes('Ann 1–1 0 vs Vegas, 1 pending') && lg.includes('Bo 0–1 −1 vs Vegas, 1 pending') && lg.includes('Cy 1 pending'),
      'friends: the legend does not give each friend\'s record against Vegas and what is pending: ' + lg);
    const hit = F.d.querySelector(`#modelChart .rv-hit[data-i="${[...F.d.querySelectorAll('#modelChart .rv-hit')].length - 1}"]`);
    if (hit) { hit.dispatchEvent(new F.w.Event('mouseenter')); const tip = txt(F.d.querySelector('#modelChart .rv-tip'));
      chk(tip.includes('Ann 1–1 · season 0 vs Vegas') && tip.includes('Bo 0–1 · season −1 vs Vegas') && !tip.includes('Cy'), 'friends: the tooltip does not give the friends\' week: ' + tip); }
    /* the pick grid: a column a friend, the pick shown where it counts, a pick saved at kickoff not */
    const head = await pickHead(F);
    chk(head.join('|') === 'Game|Alpha Model|The Joker|ELO Model|Vegas|Ann|Bo|Cy', 'friends: the pick grid\'s columns are ' + head.join('|'));
    const cell = (g, n) => { const tr = [...F.d.querySelectorAll('.pickgrid tbody tr')].find(t => txt(t.querySelector('td')).startsWith(g.away_team + ' at ' + g.home_team)); return tr ? txt(tr.children[head.indexOf(n)]) : null; };
    chk(cell(g1, 'Ann') && cell(g1, 'Ann').startsWith(H(g1)) && cell(g2, 'Bo') === '–' && cell(g1, 'Bo').startsWith(A(g1)) && cell(g3, 'Cy').startsWith(H(g3)) && cell(g1, 'Cy') === '–',
      `friends: the pick grid's friend cells are wrong: Ann ${cell(g1, 'Ann')}, Bo's late pick ${cell(g2, 'Bo')}, Cy ${cell(g3, 'Cy')}`); }
  F.w.close(); P.w.close();

  /* nothing to draw: no file, not JSON, another season, no list */
  for (const [what, fx] of [['no file', null], ['a file that is not JSON', '{"friends": [oops'], ['another season', Object.assign({}, FIX, { season: BET_SEASON - 1 })], ['no list', { season: BET_SEASON, friends: 'Ann' }]]) {
    const R = await run(st, 'https://demon-x13.github.io/nfl-hub/nflbets/#record', null, false, { friends: fx }); await R.w.FRIENDS.ready();
    const got = R.w.FRIENDS.get(), Z = await frame(R.w.FRIENDS, st), head = await pickHead(Z);
    chk(got.friends.length === 0 && R.errs.length === 0 && Z.errs.length === 0 && rowsTh(Z.d).join('|') === baseRows && !Z.d.querySelector('.rv-flg, polyline.rv-friend') && head.join('|') === baseHead.join('|'),
      `friends: ${what} draws something, or throws: ${rowsTh(Z.d).join('|')} / ${head.join('|')} ${R.errs.concat(Z.errs).join('; ')}`);
    Z.w.close(); R.w.close(); }
  console.log(`friends' picks on the Pick'em Record: ${checks - c0} checks on stand-in files (week ${Wk}), ${fails.length - f0} failures`);
}
