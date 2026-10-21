/* Check the built NFL Hub page, the site's own front page since 17 October 2026 (index.html at the
 * root, https://demon-x13.github.io/nfl-hub/; nflbets/ until then, once X NFL Bets and Stats), built
 * from nflbets/build/, and the old addresses' redirects to it (nflbets/, pickems/, live/, liveparlays/,
 * news/).
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
 * which is the prop model's Games tab running in this page; the Parlay Builder (the builder, its
 * choices and the Top lines), Suggested Parlays (its two sections, Night games and the Sunday slot,
 * each headed by its record and backtest, each unit's model parlays and Elo picks, Add to builder,
 * Finish, the lock; since app v121 every level one game's legs, the Sunday slot's the best of its
 * games' own, and no pair DraftKings refuses on one slip, worked out here on the smoke's own copies),
 * the builder's notes on such a pair and on a same-game parlay mixed with other games, the parlay
 * card's link for every leg and its link for each game on such a mix, and X Parlays on a tab of its own. X Parlays and the X Bet Log are the
 * files liveparlays/parlays.json and liveparlays/xbets.json, read only on every device: there is
 * no owner and no shared store, every request a page makes is recorded, and one to the retired
 * store or its sign-in services, or anything but a read, fails the smoke. A browser that still
 * carries what the retired layers left shows exactly the files and loses none of its own data.
 * The news job's files the Game snapshot reads (news/data/units.json and the week's notes; stats.json
 * no more since the Stat breakdown went, 16 October 2026) are never the real ones here: every run answers them with a 404 unless it is handed stand-ins of
 * the smoke's own, since the elo job runs this smoke every morning and a news job publish must never
 * turn it red (the real files are news/tools/smoke.js's to hold, in the news job).
 * jsdom and PapaParse are borrowed from props/build, so this needs no install of its own.
 *
 *   SMOKE_PAYLOAD=<file> node nflbets/build/smoke.js   boots the page on that payload instead of
 *                                                       props/data/payload.json (to try a week the job has not baked)
 *   SMOKE_NOW=<ISO time> node nflbets/build/smoke.js   runs it as if it were then: Node's clock and every
 *                                                       page's moved by one offset (props/build/clock_now.js),
 *                                                       the smoke's own shift below laid over it
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const JSDOM_MOD = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom')), { VirtualConsole } = JSDOM_MOD;
/* SMOKE_NOW=<ISO time>: the smoke run as if it were then, Node's clock and every page's moved together
   (props/build/clock_now.js), before anything below reads the clock; unset, the real clock */
const JSDOM = require(path.join(ROOT, 'props', 'build', 'clock_now.js')).jsdomAt('SMOKE_NOW', JSDOM_MOD.JSDOM);
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
/* a price from DraftKings' line read on ESPN by Refresh odds, worked on its own (the props audit's rule, apart from the page) */
const ESPN_RULE = require(path.join(ROOT, 'props', 'build', 'espn_rule.js'));
/* the page: the site's root (nflbets/build/build.js writes it there) */
const SITE = 'https://demon-x13.github.io/nfl-hub/';
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
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
/* (app v118) its backtest beside it (props/build/suggest_backtest.js: the night games and Sunday slots of the weeks
   before the record took them, rebuilt on what the site had published at each lock and graded), read the same way */
const BACKTEST_REAL = (() => { try { return fs.readFileSync(path.join(ROOT, 'props', 'data', 'suggest_backtest.json'), 'utf8'); } catch (e) { return null; } })();
/* the X Bet Log's file, as every device reads it */
const XBETS_REAL = fs.readFileSync(path.join(ROOT, 'liveparlays', 'xbets.json'), 'utf8');
/* the prop model's storage key, part2's own (the build hands it to the page) */
const PROP_KEY = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=\d{4}, KEY='([^']+)';/)[1];
/* the prop model's season, from the same line: the year the page's Refresh odds reader asks ESPN's scoreboard for */
const PROP_SEASON = +fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=(\d{4}), KEY='[^']+';/)[1];
/* the card's read settled (its DraftKings part final), at once on a card without one */
const cardSettled = w => w.PARLAY_CARD && typeof w.PARLAY_CARD.checking === 'function' ? w.PARLAY_CARD.checking() : Promise.resolve();
/* (19 October 2026) the parlay card reads DraftKings' current lines for its own games as it opens, through the page's
   Refresh odds reader: for each game of its legs still to come, that week's scoreboard (scoreboard?dates=, ESPN's own
   week numbering: the playoffs seasontype 3) and that game's player lines (an event's propBets on ESPN's core host).
   cardReads holds the requests a card made (urls: every request since it opened) to exactly that: one scoreboard of the
   parlay's week a game and, since this smoke's scoreboard stand-in names no ESPN event, nothing on ESPN's core host at
   all (where a scoreboard names its events, the player lines of the parlay's own games alone: smoke_live.js's J2 holds
   that). The requests of a card's read that keeps to it are kept in CARD_CALLS, the only ESPN requests the page may make
   with no press (below) */
const espnWeekOwn = w => +w <= 18 ? `seasontype=2&week=${+w}` : `seasontype=3&week=${+w >= 22 ? 5 : +w - 18}`;
const CARD_CALLS = new Set();
const cardReads = (urls, legs, started) => { const gids = [...new Set(legs.map(l => l.gid))].filter(id => !started(id)), wk = legs.length ? legs[0].week : null;
  const got = urls.filter(u => /\/scoreboard\?dates=|sports\.core\.api\.espn\.com/.test(u)), sb = got.filter(u => /\/scoreboard\?dates=/.test(u));
  const ok = sb.length === gids.length && sb.every(u => u.includes(`dates=${PROP_SEASON}&${espnWeekOwn(wk)}&`)) && got.every(u => /\/scoreboard\?dates=/.test(u));
  if (ok) got.forEach(u => CARD_CALLS.add(u));
  return ok ? null
    : `${gids.length} game${gids.length === 1 ? '' : 's'} to come, week ${wk}: ` + (got.map(u => u.replace(/https:\/\/[^/]+/, '').slice(0, 90)).join(' | ') || 'no request'); };
/* the betting app's own key and season: the X Bet Log is that season's */
const { BET_KEY, SEASON: BET_SEASON } = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
const ELO_M = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'model.json'), 'utf8');
/* the matchups as published, except in a thin week (a lone Monday game has one or two players
   whose nudge clears the Elo picks' bar): then six rated players' strongest trusted nudges are
   raised to clear it, in this copy only, so the Elo picks checks (six candidates, for the four
   levels, Extreme's five legs among them) run on any day of the week; and a
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
  const best = {}, rated = JSON.parse(ELO_P).players || {};
  for (const [pid, v] of Object.entries(M.players || {})) for (const [st, a] of Object.entries(v.stats)) {
    if (!ok(v.group, st) || !rated[pid]) continue; const z = a[2] / M.fit[v.group + '|' + st].sd;
    if (!best[pid] || z > best[pid].z) best[pid] = { pid, st, z }; }
  const top = Object.values(best).sort((x, y) => y.z - x.z);
  if (top.filter(x => x.z >= 0.12).length >= 6) return planted ? JSON.stringify(M) : raw;
  for (const x of top.slice(0, 6)) { const v = M.players[x.pid]; v.stats[x.st][2] = Math.max(v.stats[x.st][2], 0.2 * M.fit[v.group + '|' + x.st].sd); }
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
   still going after fifteen minutes stops with what it has, and fails (it takes six to eight here, the
   upper end on a payload whose Sunday slot is live, since app v118 checks the slot's set; ten until then) */
const SMOKE_LIMIT_MS = 15 * 60 * 1000;
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
    chk(B.out === HTML, "index.html (the site's root) is not a fresh build of its sources: run node nflbets/build/build.js and commit the page");
    chk(!fs.existsSync(path.join(ROOT, 'nflbets', 'preview.html')), 'nflbets/preview.html is back: the hub look is the page itself since 16 October 2026, and the preview is gone');
    chk(!/PROP_KEY=\/\*PROP_KEY\*\/'/.test(HTML) && (HTML.match(/PROP_KEY=\/\*PROP_KEY\*\/"([^"]+)"/g) || []).length === 1 && HTML.split(`PROP_KEY=/*PROP_KEY*/${JSON.stringify(B.PROP_KEY)}`).length === 2,
      "the storage layer is not on part2's storage key " + B.PROP_KEY); }
}
/* ---- the page is the site's root, and every old address sends a visitor to it ----
   The owner's call of 17 October 2026: ".../nfl-hub/nflbets/ be .../nfl-hub/ and get rid of that page" (the
   landing page that listed it, Weekly Picks and the other hubs). The root's index.html is the built page
   (above, byte for byte), never the landing page; nflbets/index.html is a redirect, no copy of the page, and
   each old address's page, run in vm on the web and from disk, replaces itself (so Back does not loop) with
   the root at the tab it keeps: nflbets/ its own address's tab and query (nflbets/#suggest to the root's
   #suggest), pickems/ its hash as before (none: the board, which the page opens on), live/ and liveparlays/
   X Parlays, news/ the page. Each has a link to the same place for a browser without scripts, loads
   nothing, and none names nflbets/ outside a comment. nflbets/ has no meta refresh (news/ never had one);
   the others keep theirs, pointing at the root too. Each target is resolved against its own page's address
   and must land at the site's root, so a target one folder off (../nflbets/, ../../) fails. */
{ const vm = require('vm');
  chk(!/const PAGE_HASH=|id="hubTheme"|const BET_APP=/.test(fs.readFileSync(path.join(ROOT, 'nflbets', 'index.html'), 'utf8')),
    "nflbets/index.html is still a copy of the page: it is the redirect to the site's root since 17 October 2026, and the page is index.html at the root");
  chk(!/<a class="card" href="nflbets\/"|Weekly Picks<\/b>|The other hubs/.test(HTML), 'the root index.html is still the landing page that listed Bets and Stats, Weekly Picks and the other hubs');
  /* the betting tabs' frames are srcdoc, resolved against the page's address: the page names their files from the root */
  chk(HTML.includes("window.STATE_URL='betting/state.json';window.ELO_URL='elo/data/model.json';") && HTML.includes("const DATA_URL='props/data/payload.json';"),
    "the page does not name its files from the site's root, where it is (the payload, and the framed betting app's season and Elo model)");
  const went = (html, protocol, hash, search) => { const to = [];
    try { for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInNewContext(m[1], { location: { protocol, hash, search, replace: u => to.push(u), assign: u => to.push('assign ' + u) }, window: {}, document: {} }); }
    catch (e) { to.push('threw ' + e.message); }
    return to; };
  /* [page, its address, [hash, search, where it must land from the root], its meta refresh's target from the root (null: it has none)] */
  const REDIRECTS = [
    ['nflbets/index.html', 'nflbets/', [['', '', ''], ['#suggest', '', '#suggest'], ['#tracker', '?a=1', '?a=1#tracker'], ['#xparlays', '', '#xparlays']], null],
    ['pickems/index.html', 'pickems/', [['', '', ''], ['#record', '?a=1', '#record']], ''],
    ['live/index.html', 'live/', [['', '', '#xparlays'], ['#suggest', '', '#xparlays']], '#xparlays'],
    ['liveparlays/index.html', 'liveparlays/', [['', '', '#xparlays'], ['#bets', '', '#xparlays']], '#xparlays'],
    ['news/index.html', 'news/', [['', '', ''], ['#tracker', '?standalone', '']], null]];
  for (const [file, at, cases, meta] of REDIRECTS) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8'), bad = [];
    for (const [hash, search, want] of cases) for (const protocol of ['https:', 'http:', 'file:']) {
      const to = went(html, protocol, hash, search), land = to.length === 1 && !/^(threw|assign) /.test(to[0]) ? new URL(to[0], SITE + at).href : null;
      if (land !== SITE + want) bad.push(`${protocol} ${at}${search}${hash}: ${to.join(', ') || 'stays'} lands ${land} not ${SITE + want}`); }
    const links = [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(m => new URL(m[1], SITE + at).href);
    if (!links.length || links.some(h => h !== SITE + cases[0][2])) bad.push('its link goes to ' + (links.join(', ') || 'nowhere') + ', not ' + SITE + cases[0][2]);
    const ref = html.match(/<meta[^>]+http-equiv\s*=\s*["']?refresh[^>]*content="0; url=([^"]*)"/i);
    if (meta === null ? /http-equiv\s*=\s*["']?refresh/i.test(html) : !ref || new URL(ref[1], SITE + at).href !== SITE + meta)
      bad.push(meta === null ? 'it has a meta refresh' : 'its meta refresh goes to ' + (ref ? ref[1] : 'nowhere') + ', not ' + SITE + meta);
    if (/<script[^>]+src=|<link[^>]+stylesheet|<iframe/i.test(html)) bad.push('it loads something');
    if (/nflbets\//.test(html.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, ''))) bad.push('it still names nflbets/');
    chk(!bad.length, `${file}, the old address ${at}, does not send a visitor to the site's root as it should: ` + bad.join('; ')); } }
/* ---- the betting app inside the page carries the gated model numbers ----
   betting/tools/update.js gates the app source against reference_models.json; this is the same
   gate on the copy the site actually serves, the BET_APP string in the root index.html */
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
/* waits until f() holds (each 50ms) or ms have gone by, and gives f() then */
const until = async (f, ms = 4000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await wait(50); return f(); };
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
/* a leg's name as a row draws it (a Top 50 row's or a level card's .nm, a builder row's td.plr): on the hub, the matchup
   bubble's one button (app v114, glanceName in the props parts) with no name of the row's own beside it; a row drawn
   without the bubble, its own text. Anything else (two buttons, a name both ways) reads as no name */
const legNameOf = nm => { const own = [...nm.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(), b = [...nm.children].filter(x => x.matches('button.glance-name'));
  return b.length === 1 && !own ? txt(b[0]) : b.length ? '\u0000' : own; };
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
/* DraftKings' id for a leg at its own line, app v109's rule worked out here on its own (a suggestion takes
   only a leg that has one, wherever the payload carries ids): its key (dkKey), and for a rung k+ the whole
   Over k-1 its price was read from as well; none for 2+ touchdowns, and none once its game has kicked off
   (started: the caller's reading of the page's clock) */
function dkOwnId(DK, l, started) {
  if (!DK || typeof DK !== 'object' || started) return null;
  const D = ((DK[String(l.week)] || {})[l.gid]) || {}, k = dkKey(l);
  const keys = !k ? [] : (['ml', 'ats', 'total', 'any_td'].includes(l.stat) || l.main) ? [k] : [k, `${l.pid}|${l.stat}|over|${dkPt(l.k - 1)}`];
  for (const x of keys) if (typeof D[x] === 'string' && D[x]) return D[x];
  return null;
}
/* a leg a suggestion may take, as far as DraftKings' ids go: no table (a payload baked before ids), no entry
   for its game in its week (taken as before ids: weekly.py bakes PAY.dk {} from Monday night's final to the
   next week's first pull), or DraftKings' id at its own line */
function dkTakes(DK, l, started) {
  if (!DK || typeof DK !== 'object') return true;
  const W = DK[String(l.week)], E = W && typeof W === 'object' ? W[l.gid] : null;
  return !(E && typeof E === 'object') || !!dkOwnId(DK, l, started);
}
/* (app v121) the pairs DraftKings will not take on one slip, by the owner's words of 19 October 2026 ("If your parlay
   already has a receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets
   blocked", and "Some combos contradict each other, like QB under 1.5 passing TDs alongside two of his receivers to
   score. The book rejects it outright"), worked out here on their own, never by the page's dkClash: two legs of one
   game, one a player's passing touchdowns (over or under, a main line or a rung) and the other a teammate's anytime
   touchdown ('td'), or the passing touchdowns an over and the other the game's total ('total'); and the words the
   page says each in. No suggestion may hold such a pair (blocking: a legality rule) */
const isGameOwn = l => !!l && ['ml', 'ats', 'total'].includes(l.stat);
const clashOwn = (a, b) => { if (!a || !b || a.gid !== b.gid) return null;
  const one = (q, o) => isGameOwn(q) || q.stat !== 'passing_tds' ? null : !isGameOwn(o) && o.stat === 'any_td' && o.team === q.team && o.pid !== q.pid ? 'td' : q.side !== 'under' && o.stat === 'total' ? 'total' : null;
  return one(a, b) || one(b, a); };
const clashPairsOwn = legs => { const out = []; (legs || []).forEach((a, i) => legs.slice(i + 1).forEach((b, k) => { const x = clashOwn(a, b); if (x) out.push([i, i + 1 + k, x]); })); return out; };
const CLASH_SAY_OWN = { td: 'a quarterback’s passing TDs with a teammate’s touchdown', total: 'a quarterback’s passing TDs over with the game total' };
/* (app v121, the review's round) why a level a game's legs make in number has no parlay of them on one slip, in the
   page's words: the end of a set's empty level that its game (or, on the Sunday slot, some one of its games) makes
   that many legs and none that many that go together */
const CLASH_WHY_OWN = 'it takes no quarterback’s passing TDs with a teammate’s touchdown, or his passing TDs over with the game total.';
/* a parlay's pairs DraftKings refuses, as a check names them ('' for none) */
const clashTxt = legs => clashPairsOwn(legs).map(([i, j, k]) => `${legs[i].name} ${legs[i].label} with ${legs[j].name} ${legs[j].label} (${k})`).join('; ');
/* the most legs one parlay can take of a list, worked out here: one leg a player, one side and one total a game, and
   no pair DraftKings refuses. Only a player every one of whose legs is his passing touchdowns can clash whatever he is
   given (a quarterback with another line takes that), against a teammate every one of whose legs is his anytime
   touchdown, and, where none of his is an under, the game's total; so a game takes its players, its side and its
   total less the most of those clashes that can be had apart (a bipartite matching, Kuhn's) */
const maxFitOwn = list => { const byG = new Map(); let n = 0;
  for (const l of list || []) { if (!byG.has(l.gid)) byG.set(l.gid, []); byG.get(l.gid).push(l); }
  for (const L of byG.values()) { const pl = new Map(); let side = 0, tot = 0;
    for (const l of L) { if (isGameOwn(l)) { if (l.stat === 'total') tot = 1; else side = 1; } else { if (!pl.has(l.pid)) pl.set(l.pid, []); pl.get(l.pid).push(l); } }
    const P = [...pl.values()], Q = P.filter(ls => ls.every(l => l.stat === 'passing_tds')), O = P.filter(ls => ls.every(l => l.stat === 'any_td'));
    const adj = Q.map(ls => [...O.filter(o => o[0].team === ls[0].team).map(o => o[0].pid), ...(tot && !ls.some(l => l.side === 'under') ? ['#total'] : [])]);
    const mate = new Map(), aug = (i, seen) => { for (const r of adj[i]) { if (seen.has(r)) continue; seen.add(r); if (!mate.has(r) || aug(mate.get(r), seen)) { mate.set(r, i); return true; } } return false; };
    let M = 0; adj.forEach((_, i) => { if (aug(i, new Set())) M++; });
    n += P.length + side + tot - M; }
  return n; };
/* (app v121) the Sunday slot, one game a level (the owner, 19 October 2026: "the legs need to be part of the same game
   parlay only, and anytime there's a mix it bombs the hyperlink"), worked out here on its own, never by the page's
   spSlotBetter: each of the slot's games has its own set, built as a night game's is, and each level of the slot is the
   best of its games' own levels of that size: a parlay before none; one with no game total before one with one; one that
   meets its floor before the likeliest of its size; the fewer thin legs; then the better expected return (chance times
   price) where it met a floor, else the higher chance; then the earlier game of the slot. slotPickOwn gives the place,
   in the slot's order, of the game whose level it is (-1 for none) */
const slotBetterOwn = (a, b, floor) => { const k = r => [r.mkt ? 1 : 0, floor && r.likeliest ? 1 : 0, r.thin || 0], ka = k(a), kb = k(b);
  for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i];
  const v = r => floor && !r.likeliest ? r.corr * r.dec : r.corr; return v(a) > v(b); };
const slotPickOwn = (levels, floor) => { let b = -1; levels.forEach((r, i) => { if (r && r.legs && r.legs.length && (b < 0 || slotBetterOwn(r, levels[b], floor))) b = i; }); return b; };
/* the Elo picks of the slot the same way: each game's own four (its candidates alone), each level the best of theirs,
   one that meets its floor before the likeliest of its size, then the better expected return on the Elo chance where it
   met its floor, else the higher Elo chance, then the earlier game */
const eloSlotBetterOwn = (a, b) => { const la = a.likeliest ? 1 : 0, lb = b.likeliest ? 1 : 0; if (la !== lb) return la < lb;
  const v = x => x.floor && !x.likeliest ? x.p * x.dec : x.p; return v(a) > v(b); };
const eloSlotPickOwn = levels => { let b = -1; levels.forEach((r, i) => { if (r && r.legs && r.legs.length && (b < 0 || eloSlotBetterOwn(r, levels[b]))) b = i; }); return b; };
/* the slot's game a card names under its title (app v121), in the smoke's own words: "Seahawks at Broncos · Sun 4:25 PM
   ET" (the clubs' names, the kickoff in Eastern time by the time zone database) */
const tgameOwn = (g, TN) => `${(TN && TN[g.a]) || g.a} at ${(TN && TN[g.h]) || g.h} · ${etSay(etKick(g))}`;
/* the Parlay Builder panel's own text (its choices, notes and Top 50 lines). The Elo picks are on Suggested
   Parlays since app v111 (in each of its units since app v118); one inside it would be left out all the same, since
   their own words on DraftKings' betslip are not the panel's notes */
const pbOwnTxt = panel => { if (!panel) return ''; const c = panel.cloneNode(true); c.querySelectorAll('#pbElo, .pb-tiers[data-sp-kind="elo"]').forEach(e => e.remove()); return txt(c); };
/* (app v111) Suggested Parlays' prime-time games by the owner's rule of 16 October 2026, worked out here on its own:
   a kickoff on a Thursday, Sunday or Monday (the schedule's date, which is Eastern) at or after 7:00 pm Eastern;
   and a time as the tab says it, US Eastern ("Sun 6:20 PM ET") */
const PRIME_NIGHT = { 4: 'Thursday night', 0: 'Sunday night', 1: 'Monday night' };
const PB_TIERS_OWN = ['safe', 'med', 'aggr', 'xtrm'];
/* (app v113) the Parlay Builder's list is the Top 50 lines (the owner, 17 October 2026: "in parlay builder only do top
   50 now instead of 100"; the Top 30 since app v116, 18 October 2026: "its only showing top 30, but honestly top 30 is
   enough if you want to set it at that"), and of the stats the page projects only those DraftKings posts are offered as a bet ("i
   only want to show legs that draft kings does"): targets and FG attempts are projected and never a line, a leg or a
   suggestion anywhere. The smoke's own copies, never read from the page (its PB_TOP_N and NO_BET) */
const PB_TOP_N_OWN = 30;
/* the Top lines' check (holdTop), for the Refresh odds checks far below it */
let holdTopF = null;
const NO_BET_OWN = new Set(['targets', 'fg_att']);
const primeOwn = g => !!g && /^\d{4}-\d\d-\d\d$/.test(g.d || '') && PRIME_NIGHT[new Date(g.d + 'T12:00:00Z').getUTCDay()] != null && /^\d\d:\d\d$/.test(g.t || '') && g.t >= '19:00';
const etSay = ms => new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET';
/* (app v112) one night at a time, by the owner's rule of 17 October 2026 ("just show the next night game dont stack
   the monday night game until monday morning"), worked out here on its own: of the week's prime-time games still to
   kick off (primeOwn, kickoff order), the tab sets out those of the first Eastern date (both games of a
   doubleheader), and only from 6:00 AM Eastern on the morning after the latest prime-time night before that date
   anywhere on the schedule (any week, played or not); with none before it, at once. Eastern time through the time
   zone database (Intl), twice over so a clock change between the guess and the hour cannot move it, never the
   page's easternOffset or spNight. With the night not up yet, the tab says which game is next and when (waitOwn).
   Two games kicking off at the same moment are in the schedule's own order, as the page keeps them (its week's games
   are sorted on their date and time, a sort that leaves a tie as the schedule has it): never by game id, which put a
   Thursday night game moved to Sunday night's kickoff after it where the page puts it first */
const etOffOwn = ms => { const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName');
  const m = tz && tz.value.match(/GMT([+-]\d+)/); return m ? +m[1] : -5; };
const etAtOwn = (day, hm) => { const naive = Date.parse(`${day}T${hm}:00Z`); let t = naive + 5 * 3600e3; for (let i = 0; i < 3; i++) t = naive - etOffOwn(t) * 3600e3; return t; };
const nightOwn = (prime, sched, now) => {
  const at = g => { const i = (sched || []).findIndex(x => x.id === g.id); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  const G = (prime || []).filter(primeOwn).sort((a, b) => (etKick(a) - etKick(b)) || (at(a) - at(b)));
  if (!G.length) return { games: [], open: null, prev: null, up: false, on: [] };
  const D = G[0].d, games = G.filter(g => g.d === D), prev = (sched || []).filter(g => primeOwn(g) && g.d < D).map(g => g.d).sort().pop() || null;
  const open = prev ? etAtOwn(new Date(Date.parse(prev + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10), '06:00') : null, up = open == null || now >= open;
  return { games, open, prev, up, on: up ? games : [] };
};
const isoOwn = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const waitOwn = (N, sched, TN) => { const nm = x => `${(TN && TN[x.a]) || x.a} at ${(TN && TN[x.h]) || x.h}`, nightOf = d => PRIME_NIGHT[new Date(d + 'T12:00:00Z').getUTCDay()];
  const pg = N.prev ? (sched || []).filter(x => primeOwn(x) && x.d === N.prev).length : 0;
  return `Next up: ${nightOf(N.games[0].d)}, ${N.games.map(nm).join(' and ')}.` + (N.open != null ? ` ${N.games.length > 1 ? 'Their sets go' : 'Its set goes'} up ${etSay(N.open)}, the morning after ${nightOf(N.prev)}’s ${pg > 1 ? 'games' : 'game'}.` : ''); };
/* the tab's wait line for the night games, as drawn in their section (app v118: the Sunday slot's section has a wait
   line of its own, slotWaitHeld below), held to the rule: where the night is not up, one line naming its games and
   when their sets go up, and no night game's set; where it is up (or no prime-time game is left), none */
const SEC_NIGHT = '#spSets section.sp-sec[data-sp-sec="night"]', SEC_SLOT = '#spSets section.sp-sec[data-sp-sec="slot"]';
const waitHeld = (d, N, sched, TN) => { const el = d.querySelector(`${SEC_NIGHT} [data-sp-wait]`);
  if (!d.querySelector(SEC_NIGHT)) return 'Suggested Parlays has no Night games section';
  if (!N.games.length || N.up) return el ? `a wait line is drawn where the night's sets are up: ${txt(el)}` : null;
  if (!el) return `no wait line where the next night (${N.games.map(g => g.id).join(', ')}) is not up until ${isoOwn(N.open)}`;
  const want = waitOwn(N, sched, TN), bad = [];
  if (el.dataset.spWait !== isoOwn(N.open)) bad.push(`data-sp-wait ${el.dataset.spWait}, not ${isoOwn(N.open)}`);
  if (el.dataset.spNext !== N.games.map(g => g.id).join(' ')) bad.push(`data-sp-next ${el.dataset.spNext}, not ${N.games.map(g => g.id).join(' ')}`);
  if (txt(el) !== want) bad.push(`it reads "${txt(el)}", not "${want}"`);
  if (d.querySelector(`${SEC_NIGHT} .sp-game`)) bad.push('a set is drawn beside it');
  return bad.length ? bad.join('; ') : null; };
/* (app v118) the Sunday slot, by the owner's rule of 19 October 2026 ("I would like it to have ELO picks for the slot of
   Sunday games", then "do a separate section for night games and then the sunday slot of games"), worked out here on
   its own: a week's Sunday games (the schedule's date, which is Eastern) kicking off before 7:00 pm Eastern, in kickoff
   order and the schedule's own order on a tie (as the page keeps a week's games), one set across them, id
   <season>_<WW>_SUN; it goes up as a night does, at 6:00 AM Eastern on the morning after the latest prime-time night
   before its Sunday anywhere on the schedule (none: at once), locks 2 hours before its first kickoff, is under way from
   its first kickoff (its levels as they locked, nothing to add or finish) and off the tab from its last. The week it is
   looked for in is the page's own (the first with a game not final: no score and under four hours since its kickoff,
   else the last; the props parts' liveWeek, copied here), then the next, the first whose slot has a game still to kick
   off. Eastern time through the time zone database (etKick, etAtOwn), never the page's kickoff or spOpenAt */
const dowOwn = d => /^\d{4}-\d\d-\d\d$/.test(d || '') ? new Date(d + 'T12:00:00Z').getUTCDay() : null;
const scoredOwn = g => g.hs != null && g.as != null && isFinite(g.hs) && isFinite(g.as);
const liveWeekOwn = (weeks, sched, now) => { const ws = [...new Set(weeks.map(Number))].sort((a, b) => a - b);
  const fin = g => scoredOwn(g) || (isFinite(etKick(g)) && now >= etKick(g) + 4 * 3600e3);
  return ws.find(w => (sched || []).some(g => +g.w === w && !fin(g))) ?? ws[ws.length - 1]; };
const slotGamesOwn = (sched, wk) => (sched || []).map((g, i) => ({ g, i })).filter(({ g }) => +g.w === +wk && dowOwn(g.d) === 0 && /^\d\d:\d\d$/.test(g.t || '') && g.t < '19:00' && isFinite(etKick(g)))
  .sort((a, b) => (etKick(a.g) - etKick(b.g)) || (a.i - b.i)).map(x => x.g);
const slotOwn = (sched, wk, season) => { const G = slotGamesOwn(sched, wk); if (!G.length) return null;
  const first = etKick(G[0]), last = Math.max(...G.map(etKick)), prev = (sched || []).filter(g => primeOwn(g) && g.d < G[0].d).map(g => g.d).sort().pop() || null;
  const open = prev ? etAtOwn(new Date(Date.parse(prev + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10), '06:00') : null;
  return { id: `${season}_${String(wk).padStart(2, '0')}_SUN`, slot: true, w: +wk, games: G, d: G[0].d, t: G[0].t, first, last, lock: first - 2 * 3600e3, prev, open }; };
const slotNextOwn = (weeks, sched, now, season) => { const w0 = liveWeekOwn(weeks, sched, now);
  for (const wk of [w0, w0 + 1]) { const u = slotOwn(sched, wk, season); if (!u || !u.games.some(g => now < etKick(g) && !scoredOwn(g))) continue;
    return { ...u, up: u.open == null || now >= u.open }; }
  return null; };
/* where a slot stands at a moment: waiting for its morning, live, locked, under way (from its first kickoff) */
const slotPhaseOwn = (u, now) => !u ? 'none' : !u.up ? 'wait' : now < u.lock ? 'live' : now < u.first ? 'locked' : 'under';
const slotWaitOwn = (u, sched) => { const pg = u.prev ? (sched || []).filter(x => primeOwn(x) && x.d === u.prev).length : 0;
  return `Next up: week ${u.w}’s Sunday slot, ${u.games.length} game${u.games.length === 1 ? '' : 's'}. Its sets go up ${etSay(u.open)}, the morning after ${PRIME_NIGHT[dowOwn(u.prev)]}’s ${pg > 1 ? 'games' : 'game'}.`; };
/* the slot's section as drawn, held to the rule: not up, one wait line naming it and when its sets go up and no set;
   up, its unit (.sp-game.sp-slot) and no wait line; none to come, one line saying so and no set */
const slotWaitHeld = (d, U, sched, wk, seasonOver) => { const sec = d.querySelector(SEC_SLOT); if (!sec) return 'Suggested Parlays has no Sunday slot section';
  const el = sec.querySelector('[data-sp-wait]'), units = [...sec.querySelectorAll('.sp-game')], none = sec.querySelector('[data-sp-none="slot"]'), bad = [];
  if (!U) {
    if (el || units.length || !none) bad.push(`no Sunday slot is to come and the section draws ${el ? 'a wait line' : units.length ? 'a set' : 'no line saying so'}`);
    else if (!(seasonOver ? /^The \d{4} regular season is over: no Sunday slot is left\.$/.test(txt(none)) : txt(none) === `No Sunday game of week ${wk} is still to kick off.`)) bad.push(`its line reads "${txt(none)}"`);
    return bad.length ? bad.join('; ') : null; }
  if (!U.up) { const want = slotWaitOwn(U, sched);
    if (!el) bad.push(`no wait line where the slot (${U.id}) is not up until ${isoOwn(U.open)}`);
    else { if (el.dataset.spWait !== isoOwn(U.open)) bad.push(`data-sp-wait ${el.dataset.spWait}, not ${isoOwn(U.open)}`);
      if (el.dataset.spNext !== U.id) bad.push(`data-sp-next ${el.dataset.spNext}, not ${U.id}`);
      if (txt(el) !== want) bad.push(`it reads "${txt(el)}", not "${want}"`); }
    if (units.length || none) bad.push('a set or a none line is drawn beside it');
    return bad.length ? bad.join('; ') : null; }
  if (el || none) bad.push(`a ${el ? 'wait' : 'none'} line is drawn where the slot ${U.id} is up: ${txt(el || none)}`);
  if (units.length !== 1 || units[0].dataset.spGame !== U.id || !units[0].classList.contains('sp-slot')) bad.push(`the section draws ${units.map(x => x.dataset.spGame).join(', ') || 'no unit'}, not the slot ${U.id}`);
  return bad.length ? bad.join('; ') : null; };
/* two legs of one game together, worked out here on their own (a set's Safe is the likeliest pair of one
   game's legs, which move together): the builder's gaussian copula, a leg landing when its own normal clears
   the point its chance puts it at, the two normals correlated by legRho (and taken apart under 0.03, as
   parlayProb takes them), the bivariate normal integrated here by Simpson's rule on the normal curve worked
   from erf (Abramowitz and Stegun 7.1.26) */
const erfOwn = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const PhiOwn = z => 0.5 * (1 + erfOwn(z / Math.SQRT2));
const invPhiOwn = p => { let lo = -9, hi = 9; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (PhiOwn(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
function bvnOwn(h, k, r) {
  const b = Math.min(h, 9), a = -9, N = 400, dx = (b - a) / N, s = Math.sqrt(1 - r * r); if (b <= a) return 0;
  let sum = 0; for (let i = 0; i <= N; i++) { const x = a + i * dx, f = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI) * PhiOwn((k - r * x) / s); sum += f * (i === 0 || i === N ? 1 : i % 2 ? 4 : 2); }
  return sum * dx / 3;
}
const pairOwn = (a, b, rho) => Math.abs(rho) < 0.03 ? a.p * b.p : bvnOwn(invPhiOwn(a.p), invPhiOwn(b.p), (a.side === 'under' ? -1 : 1) * (b.side === 'under' ? -1 : 1) * rho);
/* a table of made-up DraftKings ids standing in for the payload's (a fixture of its own, never merged into
   the payload's): one under each leg's own key (dkKey), the game's lines and player prices read at `read` */
function dkFixture(legs, read, tag) {
  const dk = {};
  legs.forEach((l, i) => { const k = dkKey(l); if (!k) return; const D = ((dk[String(l.week)] ??= {})[l.gid] ??= { at: read, glat: read }); if (!(k in D)) D[k] = `${tag}${i}#${k}`; });
  return dk;
}
/* what a mismatch ranks, in the smoke's own words (tab_elo.html's MM_UNIT read as the units it averages): the matchup
   formula's units by their players' Elo, never "a pass defense ranked" or "a run defense ranked", which on the page are
   the ELO Ratings tab's tables alone (18 October 2026: an Elo pick's tag said "a pass defense ranked 20th" beside a
   bubble whose Faces line said the same club's Pass Defense was 12th) */
const MM_AGAINST_OWN = { QB: 'secondary and defensive line', WR: 'secondary', TE: 'secondary', RB: 'defensive line and linebackers' };
const MM_UNITS_OWN = { QB: ['DB', 'DL'], WR: ['DB'], TE: ['DB'], RB: ['DL', 'LB'] };
const ordOwn = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
const mmGradeOwn = s => { const x = Math.round(s * 10) / 10; return x >= 3 ? 'Huge' : x >= 2 ? 'Big' : x >= 1 ? 'Solid' : 'Slight'; };
const mmTitleOwn = (v, rank, n) => `${mmGradeOwn(v.score)} mismatch this week: edge ${v.score.toFixed(1)}, ${v.group} vs the ${v.opp} ${MM_AGAINST_OWN[v.group]}, ranked ${ordOwn(rank)} of ${n} on the matchup formula's player ratings`;
/* a club's rank on the matchup formula's units for a position, the smoke's own: matchups.json's league table (each
   club's opp_def where it has none), 1st the highest */
const mmRankOwn = (M, group, opp) => { const defs = {}; for (const v of Object.values(M.players || {})) if (v.opp_def) defs[v.opp] = v.opp_def;
  Object.assign(defs, (M.league && M.league.defs) || {}); const u = MM_UNITS_OWN[group], avg = d => u.reduce((a, k) => a + d[k], 0) / u.length;
  return defs[opp] ? { rank: 1 + Object.keys(defs).filter(t => avg(defs[t]) > avg(defs[opp])).length, n: Object.keys(defs).length } : null; };
/* the old words, anywhere under root (its text and every title): a defense "ranked" by the formula's units under the
   ELO Ratings tab's table's name, lower case as the Mismatches wrote it (the tab's and the bubble's own "Pass Defense
   ranked" are the table's) */
const MM_OLD_WORDS = /\b(?:pass|run) defense ranked\b|\bvs an? (?:pass|run) defense\b|\bagainst an? (?:pass|run) defense\b/;
const mmOldWords = root => { if (!root) return ''; const hits = [];
  const t = root.textContent || ''; if (MM_OLD_WORDS.test(t)) hits.push(t.match(MM_OLD_WORDS)[0]);
  for (const e of [root, ...root.querySelectorAll('[title]')]) { const ti = e.getAttribute && e.getAttribute('title'); if (ti && MM_OLD_WORDS.test(ti)) hits.push(ti); }
  return hits.join(' | '); };
/* the markets the price pull reads (oddsfetch.py's DEFAULT, as CLAUDE.md says it): a player leg on any other
   has no id that a pull will bring */
const DK_PULLED = ['passing_yards', 'passing_tds', 'rushing_yards', 'receiving_yards', 'receptions', 'any_td'];
/* a spread or a total as DraftKings' slip takes it, in the card's words */
const dkSigned = x => (+x > 0 ? '+' : '') + dkPt(x);

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
/* the page is the site's root: every request it or a frame of it makes to the site stays under the site
   (demon-x13.github.io/nfl-hub/), and none names a parent folder, which from the root leaves the site
   (../props/data/payload.json is demon-x13.github.io/props/data/payload.json); the ones that do are kept here */
const OFF_SITE = [];
const offSite = (s, base) => { let u = null; try { u = new URL(s, base); } catch (e) { OFF_SITE.push(s + ' (not an address)'); return; }
  if (/(^|\/)\.\.\//.test(s) || (u.host === new URL(SITE).host && !u.pathname.startsWith(new URL(SITE).pathname))) OFF_SITE.push(s); };
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
   app-ready (which a held payload holds back). pay: the payload's text in place of the published one
   (a copy a check has made of its own). Every request is in `calls` with its method and cache mode. */
/* a full collection before each boot: the smoke opens the page in a new window some forty times (the kept
   Refresh odds read alone reloads it a dozen), and V8 frees a closed one only when it must, so a run peaked
   near the heap's ceiling (4.3GB on a 16GB machine, where four phase replays at once ran out of memory) */
const GC = (() => { try { require('v8').setFlagsFromString('--expose-gc'); const f = require('vm').runInNewContext('gc'); return typeof f === 'function' ? f : () => {}; } catch (e) { return () => {}; } })();
/* backtest: the suggestions record's backtest in place of props/data/suggest_backtest.json (an object, or 404: it
   does not answer); gate.mu holds back elo/data/matchups.json, the last Elo file the ELO tab reads, so the page is
   seen before its Elo picks can be built */
function run(state, url = SITE, espn = null, noState = false, { seed = null, file = null, xbets = null, ledger = null, backtest = null, news = null, gate = null, early = false, friends = null, pay = null, elo = null } = {}) {
  GC();
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
          fetched.push(s.replace(/\?.*$/, '')); urls.push(s); calls.push({ url: s, method: m, cache: o && o.cache || null }); ALL_CALLS.push(m + ' ' + s); offSite(s, url);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); return Promise.reject(new TypeError('Failed to fetch')); }
          /* the news job's files: the run's stand-ins, or a 404 (never the real ones) */
          if (/(^|\/)news\/data\//.test(s)) { const nm = s.replace(/\?.*$/, '').match(/news\/data\/(?:notes\/(\d{4}-w\d+)|(units|stats))\.json$/) || [];
            const f = !news ? undefined : nm[1] ? (news.notes || {})[nm[1]] : nm[2] ? news[nm[2]] : undefined;
            return held(nm[1] ? 'notes' : nm[2], Promise.resolve(f === undefined || f === 404 ? { ok: false, status: 404 } : { ok: true, status: 200,
              json: async () => { if (typeof f === 'string') return JSON.parse(f); return JSON.parse(JSON.stringify(f)); } })); }
          if (s.includes('suggest_ledger.json')) { const t = ledger === 404 ? null : ledger ? JSON.stringify(ledger) : LEDGER_REAL;
            return Promise.resolve(t == null ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => JSON.parse(t) }); }
          if (s.includes('suggest_backtest.json')) { const t = backtest === 404 ? null : backtest ? JSON.stringify(backtest) : BACKTEST_REAL;
            return Promise.resolve(t == null ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => JSON.parse(t) }); }
          if (s.includes('state.json')) return noState
            ? Promise.resolve({ ok: false, status: 404 })
            : Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return held('payload', Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(pay != null ? pay : PAYLOAD) }));
          if (s.includes('parlays.json')) return Promise.resolve({ ok: true, status: 200, json: async () => file ? JSON.parse(JSON.stringify(file)) : JSON.parse(PARLAYS) });
          /* friends' picks: the run's stand-in (an object, or a string that is not JSON), else a 404, never the real file */
          if (s.includes('picks/friends.json')) return Promise.resolve(friends == null ? { ok: false, status: 404 } : { ok: true, status: 200,
            json: async () => typeof friends === 'string' ? JSON.parse(friends) : JSON.parse(JSON.stringify(friends)) });
          if (s.includes('xbets.json')) return Promise.resolve(xbets === 404 ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => xbets ? JSON.parse(JSON.stringify(xbets)) : JSON.parse(XBETS_REAL) });
          /* the Elo files: the published ones, or the run's own stand-in for one (elo: { players, model, mu }) */
          const eloF = (k, real) => Promise.resolve({ ok: true, status: 200, json: async () => elo && elo[k] != null ? JSON.parse(typeof elo[k] === 'string' ? elo[k] : JSON.stringify(elo[k])) : JSON.parse(real) });
          if (s.includes('elo/data/players.json')) return eloF('players', ELO_P);
          if (s.includes('elo/data/model.json')) return eloF('model', ELO_M);
          if (s.includes('elo/data/matchups.json')) return held('mu', eloF('mu', ELO_MU));
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
  /* the page's own half-minute look (pbWatch) is stopped in this window: the smoke moves the page's clock and plants the
     record and the browser's keep as it goes, and calls the look (pbWatchTick) itself where it holds it; a look on the
     real clock in between (app v118: it reads the record again for any unit at or past its lock it had not seen there)
     would read the stub's record over a planted one, at a moment that turns on how fast the run is */
  try { w.eval('if(typeof pbWatch==="function"&&pbWatch.on){ clearInterval(pbWatch.on); }'); } catch (e) {}
  /* what the page asked for as it loaded, before a check moves its clock (a set that reaches its lock on a
     clock moved here has the suggestions record read again, as the page does with a tab left open) */
  const bootCalls = calls.slice();
  await wait(700);                                  /* the scoreboard is read once on load, after the prop model is up */

  chk(!timedOut, 'the prop model never said app-ready');
  /* the page wears the hub look (theme.css, the NBA Hub's and the NHL Hub's colours with the NFL's gold),
     laid over every other style and handed to the framed betting tabs, and nothing of the retired preview */
  { const LIVE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const HEAD = LIVE.slice(0, LIVE.indexOf('</head>'));
    chk(HEAD.includes('<style id="hubTheme">') && HEAD.lastIndexOf('<style') === HEAD.indexOf('<style id="hubTheme">')
      && /<script>window\.THEME_FRAME_HEAD=/.test(LIVE) && /family=Unbounded/.test(LIVE) && !/PREVIEW_FRAME_HEAD|id="previewTheme"|pv-flag/.test(LIVE),
      'the page does not wear the hub look laid over its other styles and its frames, or still carries the preview');
    /* the Game snapshot's Deep Dive tags and its preview block, from their styles (each tag's text on its own opaque tint, the preview's text and the
       names it bolds on its block, each side of a position matchup on its box, and the better rank of a
       meeting on its tinted box (a tint that lets the card through is laid over the card's panel-2, the
       lighter of the two it runs between), at 4.5:1 or more. jsdom resolves no var(), so one is looked
       up on the window, then the root */
    { const rgba = v => { v = String(v || '').trim(); let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (m) { const h = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(1); }
        m = v.match(/^rgba?\(([^)]*)\)$/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return p.length >= 3 && p.every(x => !isNaN(x)) ? [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] : null; };
      const lum = c => { const f = x => (x /= 255) <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      for (const [name, h] of [['the page', LIVE]]) {
        const pw = new JSDOM(h, { virtualConsole: new VirtualConsole() }).window, pd = pw.document, box = pd.createElement('div');
        box.id = 'gsModal'; box.innerHTML = '<div class="gs-prev"><p class="gs-pv"><span class="gs-lab">Preview</span><span>x <b class="gs-pn">Name</b></span></p><p class="gs-pauto">x</p></div>'
          + ['easy', 'fav', 'even', 'tough', 'vtough'].map(c => `<span class="dtag ${c}">x</span>`).join('')
          + '<div class="dd"><div class="ddrow"><span class="ddunit">Offensive line</span><span class="ddrks"><span class="ddside ddoff"><span class="ddsn">SEA</span> <b class="ddrk">15th</b></span><span class="ddsep"> · </span><span class="ddside dddef"><span class="ddsn">DEN</span> <b class="ddrk">2nd</b></span></span><span class="ddend"><span class="dddu">Pass rush</span><span class="dtag even">Even</span></span></div>'
          + '<div class="ddrow ddelos"><span class="ddunit">Receivers</span><span class="ddrks"><span class="ddside ddoff"><span class="ddsn">SEA</span> <b class="ddelo gs-v gs-better">1532</b></span><span class="ddsep"> · </span><span class="ddside dddef"><span class="ddsn">DEN</span> <b class="ddelo gs-v">1488</b></span></span><span class="ddend"><span class="dddu">Coverage</span><span class="dtag fav">Favorable</span></span></div></div>'
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
        /* the Even tag reads as a chip (the owner's call, 16 October 2026: "make 'even' tags more
           distinguishable, looks like its not a button or color blends in too much"): its edge, the ring of
           its inset shadow, at 3:1 or more on both card colours, as a control's boundary must be, and its
           shape the other tags' (no border or padding of its own: the ring is drawn inside). The chip it
           replaced, #3A4155 with no ring on the #363D52 card, is held to fail the same rule */
        { const ev = box.querySelector('.dtag.even'), fv = box.querySelector('.dtag.fav'), card = ['--panel', '--panel-2'].map(k => String(pw.getComputedStyle(pd.documentElement).getPropertyValue(k) || '').trim());
          const ringOf = el => { const m = String(pw.getComputedStyle(el).getPropertyValue('box-shadow') || '').match(/inset\s+0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+[\d.]+px\s+(#[0-9a-f]{3,6}|rgba?\([^)]*\))|(#[0-9a-f]{3,6}|rgba?\([^)]*\))\s+0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+[\d.]+px\s+inset/i); return m ? m[1] || m[2] : null; };
          const edge = (ring, bg) => Math.min(...card.map(c => Math.max(ring ? ratio(c, ring) : 0, ratio(c, bg))));
          const ring = ringOf(ev), e = edge(ring, val(ev, 'background-color')), e0 = edge(null, '#3A4155');
          if (!(e >= 3)) bad.push(`the Even tag's edge reads ${e.toFixed(2)}:1 on the card (ring ${ring || 'none'}, tint ${val(ev, 'background-color')}): it blends into the card`);
          if (!(e0 < 3)) bad.push(`the smoke's own rule passes the old Even chip (${e0.toFixed(2)}:1)`);
          for (const k of ['padding-top', 'padding-left', 'border-top-width', 'border-radius', 'font-size', 'font-weight']) if (val(ev, k) !== val(fv, k)) bad.push(`the Even tag's ${k} is ${val(ev, k)}, the others' ${val(fv, k)}: not their shape`); }
        const pv = box.querySelector('.gs-prev'), pbg = val(pv, 'background-color');
        for (const el of [box.querySelector('.gs-pv'), box.querySelector('.gs-pv .gs-lab'), box.querySelector('.gs-pv b.gs-pn'), box.querySelector('.gs-pauto')]) { const r = ratio(pbg, val(el, 'color'));
          if (!(r >= 4.5)) bad.push(`the preview's ${el.className || el.tagName} reads ${r.toFixed(2)}:1 (${pbg} under ${val(el, 'color')})`); }
        /* a position matchup's row has no box of its own since 14 October 2026: its words on the card, both
           of the colours a card runs between (the preview's cards are a gradient of the two) */
        { const rw = box.querySelector('.ddrow'), card = ['--panel', '--panel-2'].map(k => String(pw.getComputedStyle(pd.documentElement).getPropertyValue(k) || '').trim());
          for (const cbg of card) for (const el of [rw.querySelector('.ddunit'), rw.querySelector('.ddsn'), rw.querySelector('.ddsep'), rw.querySelector('.ddrk'), rw.querySelector('.dddu')]) { const r = ratio(cbg, val(el, 'color'));
            if (!(r >= 4.5)) bad.push(`a matchup row's ${el.className} reads ${r.toFixed(2)}:1 (${cbg} under ${val(el, 'color')})`); }
          /* a side's Elo (the owner's call, 16 October 2026): the plain one on the card, the higher one on its
             tint laid over either card colour */
          const ep = box.querySelector('.ddelos .ddelo:not(.gs-better)'), eb = box.querySelector('.ddelos .ddelo.gs-better');
          for (const cbg of card) { const r1 = ratio(cbg, val(ep, 'color')), tb = over(val(eb, 'background-color'), cbg), r2 = ratio(tb, val(eb, 'color'));
            if (!(r1 >= 4.5)) bad.push(`a matchup row's Elo reads ${r1.toFixed(2)}:1 (${cbg} under ${val(ep, 'color')})`);
            if (!(r2 >= 4.5)) bad.push(`a matchup row's higher Elo reads ${r2.toFixed(2)}:1 (${tb} under ${val(eb, 'color')})`); } }
        { const ub = box.querySelector('.gs-ubox.gs-better'), card = String(pw.getComputedStyle(pd.documentElement).getPropertyValue('--panel-2') || '').trim(), ubg = over(val(ub, 'background-color'), card);
          for (const el of [ub.querySelector('.gs-lab'), ub.querySelector('.gs-urank'), ub.querySelector('.gs-urank small'), ub.querySelector('.gs-ush b'), ub.querySelector('.gs-utier')]) { const r = ratio(ubg, val(el, 'color'));
            if (!(r >= 4.5)) bad.push(`the better rank's box: its ${el.className || el.tagName} reads ${r.toFixed(2)}:1 (${ubg} under ${val(el, 'color')})`); } }
        chk(bad.length === 0, `${name}: a Game snapshot tag, the preview's text, a matchup side or the better rank's box is under 4.5:1 on its own background: ${bad.join('; ')}`);
        pw.close(); } } }
  chk(errs.length === 0, 'the page threw: ' + errs.join('; '));
  chk(d.title === 'NFL Hub' && txt(d.querySelector('h1')) === 'NFL Hub' && !!d.querySelector('h1 em') && !!d.querySelector('header .tagline')
    && !!d.querySelector('header .hub-stamp #saveState') && !!d.querySelector('header .hub-stamp #buildTag'),
    'the page is not headed NFL Hub, as the NBA Hub and the NHL Hub are: the wordmark and a tagline, and the stamp with the build');

  /* the tab bar: Matchups (the board, Pick'ems until the owner's call of 16 October 2026) open, Suggested
     Parlays after Props and before the Parlay Builder (app v111, the owner's call of that day; Suggest Parlays
     until app v112, the owner's call of 17 October 2026, "tab name suggest parlay should be Suggested Parlays"),
     the prop model's other sections in the page but not on the bar */
  const tabs = [...d.querySelectorAll('#tabs button')].map(b => b.textContent.trim());
  chk(tabs.join('|') === "Matchups|Props|Suggested Parlays|Parlay Builder|X Parlays|Team Rankings|ELO Ratings|Pick'em Record|X Bet Log", 'tabs are ' + tabs.join('|'));
  /* and no word a visitor reads names the old one */
  { const said = []; const walk = n => { if (n.nodeType === 3) { if (/\bSuggest Parlays\b/.test(n.nodeValue)) said.push(n.nodeValue.trim().slice(0, 80)); return; }
      if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) { for (const a of ['aria-label', 'title']) if (/\bSuggest Parlays\b/.test(n.getAttribute(a) || '')) said.push(a + ': ' + n.getAttribute(a).slice(0, 80)); for (const c of n.childNodes) walk(c); } };
    walk(d.body); chk(!said.length, 'the page still names the tab Suggest Parlays where a visitor reads it: ' + said.slice(0, 3).join(' / ')); }
  chk(!d.querySelector('header a'), 'the header carries a link');
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'Matchups is not the open tab');
  for (const id of ['tab-slate', 'tab-suggest', 'tab-parlay', 'tab-xparlays', 'tab-track', 'tab-week', 'tab-backup'])
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
  /* the split bar in the two clubs' own colours (16 October 2026, as the NBA and NHL hubs draw theirs): each
     side the colour probCols gives it, its percentage at 4.5:1 or more on it, and the two sides never one
     colour; on every pair of the 32 clubs too, since a week's games try only a few */
  { const P = w.pkBoard, hexL = h => { const v = String(h).replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
        .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)).reduce((t, x, i) => t + x * [0.2126, 0.7152, 0.0722][i], 0); },
      cr = (x, y) => { const a = hexL(x), b = hexL(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }, bad = [];
    if (!P || typeof P.probCols !== 'function') bad.push('pkBoard has no probCols');
    else {
      for (const c of cards) { const gm = state.schedule.find(x => x.game_id === c.dataset.game), pc = P.probCols(gm.away_team, gm.home_team);
        const sa = c.querySelector('.pk-prob .pk-a'), sh = c.querySelector('.pk-prob .pk-h');
        if (!sa || !sh || !sa.getAttribute('style').includes(`background:${pc[0].bg};color:${pc[0].ink}`) || !sh.getAttribute('style').includes(`background:${pc[1].bg};color:${pc[1].ink}`))
          bad.push(`${gm.game_id}'s bar is not in ${gm.away_team}'s ${pc[0].bg} and ${gm.home_team}'s ${pc[1].bg}`); }
      const clubs = Object.keys(state.teams || {}).length >= 32 ? Object.keys(state.teams) : [...new Set(state.schedule.flatMap(x => [x.away_team, x.home_team]))];
      for (const a of clubs) for (const h of clubs) if (a !== h) { const pc = P.probCols(a, h);
        for (const x of pc) if (!/^#[0-9A-Fa-f]{6}$/.test(x.bg) || !(cr(x.bg, x.ink) >= 4.5)) bad.push(`${a} at ${h}: a side in ${x.bg} under ${x.ink} reads ${cr(x.bg, x.ink).toFixed(2)}:1`);
        if (pc[0].bg.toLowerCase() === pc[1].bg.toLowerCase()) bad.push(`${a} at ${h}: both sides ${pc[0].bg}`); }
    }
    chk(bad.length === 0, "the win-probability bar is not in the two clubs' own colours, each percentage at 4.5:1: " + bad.slice(0, 6).join('; ')); }
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
    /* (app v112) its note says what a Suggested Parlays set does with a game total: a fill where the game's other
       legs run out, never marked Value */
    chk(!!gb && txt(gb.querySelector('p.muted')).includes('A Suggested Parlays set takes a game total only where the game\'s other legs cannot fill a parlay, and never marks it Value; tick it here to add one yourself.'),
      'the Game bets card does not say a Suggested Parlays set takes a game total only where the game\'s other legs cannot fill a parlay, never marked Value: ' + (gb ? txt(gb.querySelector('p.muted')).slice(0, 400) : 'no card'));
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
  chk(w.location.hash === '#matchups', 'a tap on the Matchups tab does not write its address, #matchups: ' + w.location.hash);

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
  /* (app v122) the Props list's rows are the Matchups board's (the owner's call of 20 October 2026, "change the
     matchup to look like" the board's row): its column heads, and each row's split bar in the two clubs' own colours
     (the page's slateCols, the board's rule on the prop model's tag colours, each percentage at 4.5:1 on its side,
     the two sides never one colour, on every pair of clubs), its win probability worked out here from the prop
     model's own lines (the two moneylines with the margin out, else the spread about 13.5 points, else the model's
     margin about the same; a pick'em spread with no moneylines no call), the board's band, the favourite's tag
     raised, its prediction gameCtx's scores rounded once with the margin their difference ("even" where level), and
     its final-score cell: the payload's score with whether the pick hit, else the scoreboard just read (the stub's
     first game to play over, home 27-20, its second on, away 14-10 in Q3 5:44), else 0 : 0, LIVE or Final */
  chk(/Date.*Matchup.*Win probability.*Confidence.*Score prediction.*Final score/.test(txt(d.querySelector('#tab-slate .gamehead')))
    && !/Biggest projections/.test(txt(d.querySelector('#tab-slate .gamehead'))), 'the Props list\'s column heads are not the Matchups board\'s: ' + txt(d.querySelector('#tab-slate .gamehead')));
  { const PS = w.eval('S').sched, hexL = h => { const v = String(h).replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
        .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)).reduce((t, x, i) => t + x * [0.2126, 0.7152, 0.0722][i], 0); },
      cr = (x, y) => { const a = hexL(x), b = hexL(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }, bad = [], cols = w.eval('typeof slateCols==="function"?slateCols:null');
    const ncdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), dd = 0.3989423 * Math.exp(-z * z / 2), q = dd * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - q : q; };
    const callOwn = g => { const ml = x => x != null && isFinite(x) && +x !== 0, im = x => x < 0 ? -x / (-x + 100) : 100 / (x + 100); let pH = null;
      if (ml(g.mla) && ml(g.mlh)) pH = im(+g.mlh) / (im(+g.mlh) + im(+g.mla));
      else if (g.sp != null && isFinite(g.sp)) { if (+g.sp !== 0) pH = ncdf(+g.sp / 13.5); }
      else pH = ncdf(w.eval('modelMargin')(g) / 13.5);
      if (pH == null || !isFinite(pH)) return null; const conf = Math.max(pH, 1 - pH), r = Math.round(conf * 100) / 100;
      return { pa: Math.round((1 - pH) * 100), pick: pH >= 0.5 ? g.h : g.a, band: `${r >= 0.75 ? 'HIGH' : r >= 0.60 ? 'MED' : r >= 0.55 ? 'LOW' : '50/50'} ${Math.round(conf * 100)}%` }; };
    const sb = scoreboard(state, wk).events.map(e => ({ id: e.id.slice(1), st: e.status.type.state, hs: +e.competitions[0].competitors[0].score, as: +e.competitions[0].competitors[1].score, cl: e.status.type.shortDetail }));
    let live = 0, over = 0;
    if (!cols) bad.push('the page has no slateCols');
    /* the rows as drawn now: Refresh scores above redrew the list, so the rows read before it are gone */
    const nowRows = [...d.querySelectorAll('#gamesList .game[data-game]')];
    if (!nowRows.length) bad.push('the list has no rows after Refresh scores');
    for (const r of nowRows) { const g = PS.find(x => x.id === r.dataset.game); if (!g) { bad.push(r.dataset.game + ' is no game'); continue; }
      const c = callOwn(g), sa = r.querySelector('.sl-prob .sl-a'), sh = r.querySelector('.sl-prob .sl-h'), pc = cols ? cols(g.a, g.h) : null;
      if (!sa || !sh) { bad.push(g.id + ' has no split bar'); continue; }
      if (pc && (!sa.getAttribute('style').includes(`background:${pc[0].bg};color:${pc[0].ink}`) || !sh.getAttribute('style').includes(`background:${pc[1].bg};color:${pc[1].ink}`))) bad.push(`${g.id}'s bar is not in ${g.a}'s ${pc[0].bg} and ${g.h}'s ${pc[1].bg}`);
      const pa = c ? c.pa : 50, raised = [...r.querySelectorAll('.matchup .ttag.sl-win')].map(txt).join();
      if (parseFloat(sa.style.width) !== pa || parseFloat(sh.style.width) !== 100 - pa) bad.push(`${g.id}'s bar is ${sa.style.width}/${sh.style.width}, not ${pa}/${100 - pa}`);
      if (txt(sa) !== (pa >= 14 ? pa + '%' : '') || txt(sh) !== (100 - pa >= 14 ? (100 - pa) + '%' : '')) bad.push(`${g.id}'s bar reads ${txt(sa)}/${txt(sh)}`);
      if (txt(r.querySelector('.sl-conf .sl-tier')) !== (c ? c.band : 'no call yet')) bad.push(`${g.id}'s band reads "${txt(r.querySelector('.sl-conf .sl-tier'))}", not "${c ? c.band : 'no call yet'}"`);
      if (raised !== (c ? c.pick : '')) bad.push(`${g.id} raises ${raised || 'no tag'}, not ${c ? c.pick : 'none'}`);
      { const st = state.schedule.find(x => x.game_id === g.id), neu = st ? (st.location === 'Neutral' || st.gametime === '09:30') : g.t === '09:30';
        if ((txt(r.querySelector('.matchup .at')) === 'vs') !== neu) bad.push(`${g.id} reads "${txt(r.querySelector('.matchup .at'))}" ${neu ? 'at a neutral site' : 'at a home game'}`); }
      const A = +w.eval('gameCtx')(g, g.a).implied.toFixed(0), H = +w.eval('gameCtx')(g, g.h).implied.toFixed(0), pby = r.querySelector('.sl-pred .sl-pby');
      if (txt(r.querySelector('.sl-pred .sl-psc')) !== `${A}–${H}` || (A === H ? txt(pby) !== 'even' : !(pby && txt(pby.querySelector('.ttag')) === (A > H ? g.a : g.h) && txt(pby).endsWith(`by ${Math.abs(A - H)}`))))
        bad.push(`${g.id}'s prediction reads "${txt(r.querySelector('.sl-pred'))}", not ${A}–${H} ${A === H ? 'even' : (A > H ? g.a : g.h) + ' by ' + Math.abs(A - H)}`);
      const res = txt(r.querySelector('.sl-result')), e = sb.find(x => x.id === g.id), has = w.eval('hasScore')(g);
      if (has) { const win = g.as > g.hs ? g.a : g.hs > g.as ? g.h : null;
        const want = (win ? `${win} won ${g.as}–${g.hs}` : `Tie ${g.as}–${g.hs}`) + (c && win ? (c.pick === win ? 'Pick hit' : 'Pick missed') : '');
        if (res !== want) bad.push(`${g.id}'s final score reads "${res}", not "${want}"`); }
      else if (e && e.st === 'post') { over++; const win = e.hs > e.as ? g.h : e.as > e.hs ? g.a : null, want = `${win} won ${e.as}–${e.hs}` + (c ? (c.pick === win ? 'Pick hit' : 'Pick missed') : '');
        if (res !== want || !r.querySelector(`.sl-tw.${win === g.h ? 'sl-home' : 'sl-away'} .sl-res.${c && c.pick === win ? 'sl-ok' : 'sl-bad'}`)) bad.push(`${g.id}, over on the scoreboard, reads "${res}", not "${want}" with its mark`); }
      else if (e && e.st === 'in') { live++; const lead = e.hs > e.as ? g.h : e.as > e.hs ? g.a : null, mw = r.querySelector('.sl-result .sl-mwin');
        if (!new RegExp(`^${lead} leading ${e.as}–${e.hs}${e.cl}$`).test(res) || !mw || !mw.classList.contains(c && c.pick === lead ? 'sl-ok' : 'sl-bad') || r.querySelector('.sl-res')) bad.push(`${g.id}, on now, reads "${res}"`); }
      else if (!/^(0 : 0|LIVE|Final)/.test(res)) bad.push(`${g.id}, not under way on the scoreboard, reads "${res}"`); }
    if (cols) { const clubs = [...new Set(PS.flatMap(x => [x.a, x.h]))];
      for (const a of clubs) for (const h of clubs) if (a !== h) { const pc = cols(a, h);
        for (const x of pc) if (!/^#[0-9A-Fa-f]{6}$/.test(x.bg) || !(cr(x.bg, x.ink) >= 4.5)) bad.push(`${a} at ${h}: a side in ${x.bg} under ${x.ink} reads ${cr(x.bg, x.ink).toFixed(2)}:1`);
        if (pc[0].bg.toLowerCase() === pc[1].bg.toLowerCase()) bad.push(`${a} at ${h}: both sides ${pc[0].bg}`); } }
    chk(bad.length === 0, `the Props list's rows are not the board's, worked from the prop model's own lines: ${bad.slice(0, 6).join('; ')}`);
    if (toPlay.length && !SEASON_OVER) chk(over + live > 0 || !nowRows.length || !PS.some(g => +g.w === wk && !w.eval('hasScore')(g)), `the Props list showed none of the scoreboard's games under way or over after Refresh scores (${over} over, ${live} on)`); }
  /* open a game: the prop model's own modal, with players in it */
  slateRows[0].click();
  await wait(100);
  const modal = d.getElementById('gameModal');
  chk(modal && !modal.hidden, 'clicking a game on the Props tab did not open the game');
  chk(txt(d.getElementById('gameView')).length > 200, 'the game modal is empty');
  /* a game's page carries its Game bets card (app v105), once */
  chk(d.querySelectorAll('#gameView .gbets').length === 1, 'the game view does not carry the Game bets card once');
  /* (app v122) the game's head carries what the list's row showed until then, under the list's old headings:
     the kickoff, the matchup, the three biggest projections (gameHeadline's), the expected score (gameCtx's,
     rounded once), its total and the pick with its margin, or even */
  { const head = d.querySelector('#gameView .ghead'), g = w.eval('S').sched.find(x => x.id === slateRows[0].dataset.game), bad = [];
    if (!head || !g) bad.push('no head card');
    else {
      const labs = [...head.querySelectorAll('.gh-lab')].map(txt).join('|');
      if (labs !== 'Kickoff|Matchup|Biggest projections|Expected score|Total pt|Vegas pick') bad.push('its headings are ' + labs);
      const gb = d.querySelector('#gameView .gbets');
      if (!gb || !(head.compareDocumentPosition(gb) & 4)) bad.push('it is not above the game\'s cards, where the matchup card was');
      const ca = w.eval('gameCtx')(g, g.a), ch = w.eval('gameCtx')(g, g.h), A = +ca.implied.toFixed(0), H = +ch.implied.toFixed(0);
      if (txt(head.querySelector('.tot b')) !== `${A} – ${H}`) bad.push(`its expected score reads "${txt(head.querySelector('.tot b'))}", not ${A} – ${H}`);
      if (txt(head.querySelector('.totpts b')) !== (ca.implied + ch.implied).toFixed(0)) bad.push(`its total reads ${txt(head.querySelector('.totpts b'))}`);
      const win = head.querySelector('.winner'), smalls = [...win.querySelectorAll('small')].map(txt);
      if (A === H ? !(win.querySelector('.none') && smalls.includes('even')) : !(txt(win.querySelector('.ttag')) === (A > H ? g.a : g.h) && smalls.includes(`by ${Math.abs(A - H)}`))) bad.push(`its pick reads "${txt(win)}"`);
      const lead = [...head.querySelectorAll('.lead > div')].map(x => `${txt(x.querySelector('.cat'))} ${txt(x.querySelector('.nm'))} ${(txt(x.querySelector('.v')).match(/^(\d+)yds/) || [])[1]}`).join(', ');
      const want = w.eval('gameHeadline')(g).map(x => `${x.k} ${w.eval('shortName')(x.v.pl.n)} ${x.v.mu.toFixed(0)}`).join(', ');
      if (lead !== want) bad.push(`its biggest projections read "${lead}", not "${want}"`);
      if (![g.a, g.h].every(t => [...head.querySelectorAll('.gh-match .ttag')].map(txt).includes(t))) bad.push('its matchup does not name both clubs');
    }
    chk(bad.length === 0, `the game's head does not carry the list's old figures: ${bad.join('; ')}`); }
  /* (app v124, the owner's call of 20 October 2026) the game's page draws no suggested parlays: in their place, under
     its head and over its Game bets card, three buttons, Matchup, Mismatches and Team Stats, each opening one card of
     the Game snapshot alone in its own little window (held on the stand-in news files under THE GAME SNAPSHOT) */
  { const bad = [], gv = d.getElementById('gameView'), bs = [...gv.querySelectorAll('.gwin [data-gp-pop]')], head = gv.querySelector('.ghead'), row = gv.querySelector('.gwin'), gb = gv.querySelector('.gbets');
    if (gv.querySelector('.gsugg, [data-gsugg-side], [data-gtier-add], .gsugg-tier, .gsugg-pick') || /Suggested parlays|Add all/.test(txt(gv))) bad.push('it still draws its suggested parlays, their side switch or an Add all');
    if (bs.map(b => `${b.dataset.gpPop}:${txt(b)}`).join() !== 'units:Matchup,mism:Mismatches,stats:Team Stats') bad.push('its buttons are ' + (bs.map(b => `${b.dataset.gpPop}:${txt(b)}`).join() || 'none'));
    if (!bs.every(b => b.tagName === 'BUTTON' && b.type === 'button' && b.getAttribute('aria-haspopup') === 'dialog' && b.dataset.gpGame === slateRows[0].dataset.game)) bad.push('a button is not a dialog button naming the game');
    if (!(head && row && gb && gv.querySelectorAll('.gwin').length === 1 && (head.compareDocumentPosition(row) & 4) && (row.compareDocumentPosition(gb) & 4))) bad.push('the buttons are not there once, under the head and over the Game bets card');
    if (typeof w.gameWindow !== 'function') bad.push('the hub window (window.gameWindow) is not on the page');
    chk(bad.length === 0, `the game's page does not carry its Matchup, Mismatches and Team Stats buttons in place of its suggested parlays: ${bad.join('; ')}`); }
  chk(d.querySelectorAll('#gameView .plrbtn').length > 0, 'the game view shows no players');
  chk(typeof w.closeGame === 'function', 'the prop model\'s closeGame is not on the page');
  w.closeGame();
  await wait(50);
  chk(modal.hidden, 'the game did not close');
  /* the Games tab's own state saved, under the prop model's own key */
  chk(!!w.localStorage.getItem(PROP_KEY), 'the prop model did not save its state under its own key');

  /* ---- the Parlay Builder (app v111, the owner's calls of 16 October 2026): its choices at the top (the Bet
     amount, Refresh odds, Build from, the bet types, the games), the Top 50 lines those choices make under
     them, then the visitor's own builder with a Refresh odds of its own; Suggested Parlays (each Thursday,
     Sunday and Monday night game's own parlays, the Elo picks under them) and X Parlays are tabs of their
     own. The four levels over every game, the lock on each leg, New legs and Reset are gone from the page;
     the level engine stays (getPbTiers, pbTier), and is held below on many sets of ticks, since each
     prime-time game's set is built by it ---- */
  const tabBtn = t => [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === t);
  /* Suggested Parlays builds a game's live set only while its tab is on the screen: before it was ever opened, the
     page has built none (a load of the hub pays nothing for a tab nobody opened), and a live game says so. A
     game past its lock (2 hours before kickoff, by its own kickoff and the page's clock) is drawn as locked
     whatever the tab, and where the record has no entry for it the page builds its own set at load, so the
     cache may hold that game's set alone. (app v112) Only the next night's games are on the tab, once its morning has
     come (nightOwn, the rule worked out here): a game the rule hides is not drawn at all, and none of its set built */
  /* (app v118) and the Sunday slot by its own rule (slotNextOwn): up and live, it too says it is built when the tab
     opens, its set (and its Elo picks) not built; not up, its section's wait line is the rule's */
  { const now = w.eval('Date.now()'), G = w.eval('typeof pbGames') === 'function' ? w.eval('pbGames()').filter(primeOwn) : [], live = G.filter(g => now < etKick(g) - 2 * 3600e3);
    const N = nightOwn(G, w.eval('S').sched, now), onIds = N.on.map(g => g.id), Sx0 = w.eval('S');
    const U = slotNextOwn(w.eval('PAY.sched').map(g => g.w), Sx0.sched, now, +w.eval('SEASON')), uLive = !!U && slotPhaseOwn(U, now) === 'live';
    const shown = live.filter(g => onIds.includes(g.id)).concat(uLive ? [U] : []).map(g => d.querySelector(`#spPanel [data-sp-game="${g.id}"] [data-sp-phase]`)), cached = w.eval('typeof SP_CACHE') !== 'undefined' ? w.eval('[...SP_CACHE.keys()]') : null;
    const hidden = G.filter(g => !onIds.includes(g.id)).filter(g => !!d.querySelector(`#spSets [data-sp-game="${g.id}"]`));
    chk(!!cached && cached.every(k => !live.some(g => k.startsWith(g.id + '|')) && !(uLive && k.startsWith(U.id + '|'))) && shown.every(x => !!x && x.dataset.spPhase === 'wait' && txt(x) === 'Built when this tab is open.') && !hidden.length
      && (!uLive || !d.querySelector(`#spPanel [data-sp-game="${U.id}"] .pb-tier`)),
      'Suggested Parlays built a set before its tab was opened, a unit it has not built (a night game or the Sunday slot) does not say it is built when the tab opens, or a game the night rule hides is drawn: ' + shown.map(x => x ? x.dataset.spPhase + ' ' + txt(x) : 'none').join(' / ') + (hidden.length ? ' / drawn: ' + hidden.map(g => g.id).join(', ') : ''));
    const wh = G.length ? waitHeld(d, N, Sx0.sched, w.eval('TEAM_NAMES')) : null;
    chk(!wh, 'before its tab was opened, Suggested Parlays does not say which night is next and when its set goes up where the night rule hides it: ' + wh);
    const sh = slotWaitHeld(d, U, Sx0.sched, liveWeekOwn(w.eval('PAY.sched').map(g => g.w), Sx0.sched, now), w.eval('seasonOver()'));
    chk(!sh, `before its tab was opened, the Sunday slot's section is not as its rule has it (${U ? U.id + ' ' + slotPhaseOwn(U, now) : 'none to come'}): ` + sh); }
  tabBtn('parlay').click();
  await wait(60);
  chk(!d.getElementById('tab-parlay').hidden && d.getElementById('tab-slate').hidden && (d.getElementById('tab-xparlays') || { hidden: true }).hidden && (d.getElementById('tab-suggest') || { hidden: true }).hidden, 'the Parlay Builder tab did not open');
  chk(w.location.hash === '#parlay', 'the Parlay Builder tab did not become the address #parlay');
  const pb = d.getElementById('parlayBody'), tabB = d.getElementById('tab-parlay'), panel = d.getElementById('pbPanel');
  /* a page without the engine fails here, and the checks that need it are left out rather than thrown on */
  const hasPb = ['getPbTiers', 'pbGames', 'getPbTop', 'spSet', 'spGames', 'spLockAt'].every(f => w.eval(`typeof ${f}`) === 'function');
  chk(hasPb && !!panel, 'the Parlay Builder has no Top lines under the builder, or Suggested Parlays no sets (#pbPanel, getPbTiers, pbGames, getPbTop, spSet, spGames, spLockAt)');
  /* (app v116, the owner, 18 October 2026: "that 5 leg parlay section can we move it up to the top of the page?") the
     builder first on its tab, then its choices and the Top lines, and nothing else */
  chk(!!panel && tabB.firstElementChild === pb && pb.nextElementSibling === panel && !panel.nextElementSibling && !tabB.querySelector('#lpCard'),
    'the Parlay Builder tab is not the builder over its choices and the Top lines, and nothing else');
  chk(!d.getElementById('suggModal') && !d.getElementById('suggOpen') && !d.getElementById('suggView') && !d.querySelector('[data-suggest-side], [data-suggest-save], #suggStake'),
    'the old Suggested parlays window or its switch is still in the page');
  /* the lock on each leg, New legs and Reset are gone, every trace of them (the owner's call of 16 October
     2026), and the Parlay Builder draws no level: its levels are each prime-time game's, on Suggested Parlays */
  chk(!d.querySelector('[data-pb-lock], [data-pb-turn], [data-pb-reset], .pb-lock') && ['PB_VIEW', 'pbLocked', 'pbShownTier', 'pbTurn', 'pbLockBtn'].every(n => w.eval(`typeof ${n}`) === 'undefined')
    && !!panel && !panel.querySelector('.pb-tier, [data-pb-add], [data-pc-finish], #pbElo, #pbRec, #spRec, .sp-rec, [data-sp-rec], .sp-game') && !/New legs|beside your lock/.test(txt(panel)),
    'a leg\'s lock, New legs or Reset is still in the page, or the Parlay Builder still draws a level, the Elo picks or the record: ' + (panel ? txt(panel).slice(0, 160) : ''));
  chk(/Parlay Builder|-leg parlay/.test(txt(pb.firstElementChild.querySelector('h2'))), 'the builder is not the first card on the tab: ' + txt(pb.firstElementChild));
  /* the empty builder points to the list by its length, under it (app v116) */
  if (!Object.keys(w.eval('S').parlay || {}).length) chk(txt(pb).includes(`or add a parlay from Suggested Parlays or a line from the Top ${PB_TOP_N_OWN} below. Each leg lands here and gets priced.`),
    `the empty builder does not point to the Top ${PB_TOP_N_OWN} lines below it: ` + txt(pb).slice(0, 240));
  chk(!/one line per stat per player|pulled from the odds market twice a week/.test(txt(pb)) && !pb.querySelector('.card ul'), 'the how-to list is still under the builder');
  /* the builder has a Refresh odds of its own (44px, its status line beside it), whether it holds a leg or none */
  const builderOdds = () => { const b = pb.querySelector('[data-espn-refresh="week"]'), st = b && d.getElementById(b.getAttribute('aria-describedby'));
    return !!b && txt(b) === 'Refresh odds' && w.getComputedStyle(b).minHeight === '44px' && !!st && pb.contains(st) && st.getAttribute('aria-live') === 'polite' && st.dataset.espnStatus === 'week'; };
  chk(builderOdds(), 'the empty builder has no 44px Refresh odds of its own with its status line');
  /* "the likeliest" worked out in full: where no two legs that could share a parlay move together
     (different games, or a game's side and its total), every parlay's chance is a plain product, so every
     parlay of a likeliest tier's size with as many thin legs is worked with parlayProb and none may
     land likelier. That holds whatever the legs are priced at, so a fallback chosen by any other
     measure (the best return under the floor, say) fails it on the week's own picks. Bounded, so
     a long list never stalls the smoke */
  /* (app v121) a leg that can join a parlay: the page's pbFits (one a player, one side and one total a game, no line
     twice), and never beside a leg DraftKings refuses it with (clashOwn, the smoke's own) */
  const fitsP = hasPb ? w.eval('pbFits') : null, fitsF = hasPb ? (cur, c) => fitsP(cur, c) && !cur.some(l => clashOwn(l, c)) : null, orderF = hasPb ? w.eval('pbOrder') : null, rhoF = hasPb ? w.eval('legRho') : null, ppF = hasPb ? w.eval('parlayProb') : null, LIKELY_CAP = 250000;
  const noMovers = list => list.every((a, i) => list.slice(i + 1).every(b => !fitsF([a], b) || Math.abs(rhoF(a, b)) < 0.03));
  const likeliestOf = (list, n, thin) => { let best = -1, legs = null, seen = 0;
    const rec = (i0, cur, th) => { if (seen > LIKELY_CAP) return;
      if (cur.length === n) { if (th !== thin) return; seen++; const pr = ppF(orderF(cur)).corr; if (pr > best) { best = pr; legs = cur.slice(); } return; }
      for (let i = i0; i < list.length; i++) { const c = list[i], th2 = th + (c.thin ? 1 : 0); if (th2 > thin || !fitsF(cur, c)) continue; cur.push(c); rec(i + 1, cur, th2); cur.pop(); } };
    rec(0, [], 0); return seen > LIKELY_CAP || !legs ? null : { best, legs, seen }; };
  /* a leg as a check names it, and the same leg (its line and side) */
  const legId = l => l.key + '|' + l.side + '|' + l.k;
  /* the rules a suggestion's leg is held to, worked out here on their own from the page's priced lines
     (pricedLegs, which keeps V6's players who will not play off them: the props audit's own check of that),
     for the Top 50 lines and for each prime-time game's set alike: its box and its game ticked (u), not
     kicked off, a real price (or the rule's own from DraftKings' line read on ESPN, on a kind it may take:
     takenRule), the model's chance 45-97% and at or above the price's own implied chance, a player's line
     only once the Elo files are in, never 15 points or more above the book's fair chance (fairRule), and
     DraftKings' id at its own line wherever the payload carries ids (dkTakes); preferred with 3 points of
     edge and, on a player's line, market + form 3 points above the book too, else thin; and with Game total
     ticked both sides of each game's posted total on a real price, a list of its own, no edge. The Top lines take
     the same (app v119, the owner's call of 19 October 2026: "only ones i can add via id"; from app v115 they kept a
     player's leg from a Refresh odds read with no id) */
  const impOwn = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100), decOwn = a => a > 0 ? 1 + a / 100 : 1 + 100 / -a;
  const kindOwn = l => ['ml', 'ats', 'total'].includes(l.stat) ? l.stat : l.side === 'under' ? 'under' : 'over';
  const maxOwn = list => { const pl = new Set(), gm = new Set(); for (const l of list) { if (/^(team:|game$)/.test(l.pid) || ['ml', 'ats', 'total'].includes(l.stat)) gm.add(l.gid + (l.stat === 'total' ? '|t' : '|s')); else pl.add(l.pid); } return pl.size + gm.size; };
  const qualOwn = (u, on, o) => {
    const out = { pref: [], thin: [], mkt: [], plId: false };
    if (!hasPb || !on.length) return out;
    const isG = w.eval('isGameLeg'), started = w.eval('gameStarted'), taken = takenRule(w), fo = fairRule(w), FAR = w.eval('FAR_OFF'), D = w.eval('PAY').dk, DK = D && typeof D === 'object' ? D : null;
    const loaded = w.eval('typeof window.eloLoaded') !== 'function' || w.eval('window.eloLoaded()'), alt = typeof w.eloAltP === 'function' ? w.eloAltP : null;
    const st = l => { const g = w.eval('S').sched.find(x => x.id === l.gid); return !!g && started(g); };
    const priced = c => c.price != null && isFinite(c.price) && c.price !== 0 && c.p >= 0.45 && c.p < 0.97;
    for (const c of w.eval('pricedLegs')(on)) {
      if (!isG(c) && dkTakes(DK, c, st(c))) out.plId = true;
      if (!u.k[kindOwn(c)] || u.off.includes(c.gid) || st(c) || !taken(c) || !priced(c) || c.p < impOwn(c.price)) continue;
      if (!isG(c) && !loaded) continue;
      const f = fo(c); if (f && c.p - f.p >= FAR - 1e-9) continue;
      if (!dkTakes(DK, c, st(c))) continue;
      const form = isG(c) || !alt || (() => { const a = alt(c.pid, c.side, c.price, c.src, c.stat); return a != null && a - impOwn(c.price) >= 0.03; })();
      (c.p - impOwn(c.price) >= 0.03 && form ? out.pref : out.thin).push(c); }
    if (u.k.total) for (const g of on) if (!u.off.includes(g.id)) for (const side of ['over', 'under']) { const c = w.eval('totalLeg')(g, side);
      if (c && c.src === 'real' && priced(c) && !st(c) && dkTakes(DK, c, st(c))) out.mkt.push(c); }
    return out; };
  /* the Top 50 lines, worked out here from qualOwn (app v112, the owner's call of 17 October 2026: "can we do
     reverse tags? like get rid of thin edge and no edge and come up with a name for that first section?"): every
     leg the ticks make, in two parts, the Value picks (the preferred legs) first and then the other lines (every
     thin-edge leg and, with Game total ticked, every total), each part ranked by what $1 on it is expected to make
     at the model's chance (its chance times its decimal price, less the $1), best first (the key, side and line in
     order on a tie), at most 50 in all (PB_TOP_N_OWN, app v113), so a total, at the book's own chance, ranks after every thin-edge line;
     each row saying its part (data-pb-grp value or other) and its rank, running on across both parts, its leg, its
     price (est. where it is priced from DraftKings' line read on ESPN), the model's chance, the book's fair chance
     (fairRule) or a dash, what $1 wins and what it is expected to make, Value marked on a Value pick and on nothing
     else (no thin edge or no edge any more), and its own Add, 44px, named for the leg; each part under its own
     heading (Value picks, Other lines, each with its count), the second list starting where the first ends; with
     no Value pick, its heading saying so over the other lines; with nothing to rank, the list says why. The other
     lines are the thin-edge lines and then the totals, each ranked on its own (app v112, round two): a total
     priced on one side only is put at 50%, so at plus money it is expected to make more than a thin-edge line, and
     ranked with them it came before them. Each bet once (the owner, 17 October 2026, Patrick Mahomes's Over 224.5
     and 225+ passing yards ranked 1 and 2 at -113: "i find it hard to believe that draft kings would let me bet
     both on the same parlay"): a ladder rung k+ lands exactly when the player's main Over at k-0.5 does, so where
     that half-point main Over is among the qualifying legs (either part) the rung is left out of every part, and
     the main line kept wherever it is (sameBetOwn); the count left out rides on the list as .same */
  const gameLegOwn = l => ['ml', 'ats', 'total'].includes(l.stat);
  const sameBetOwn = legs => { const half = new Set(legs.filter(l => !gameLegOwn(l) && l.main && l.side === 'over' && Math.abs(+l.k % 1) === 0.5).map(l => `${l.gid}|${l.pid}|${l.stat}|${+l.k + 0.5}`));
    return l => !gameLegOwn(l) && !l.main && l.side === 'over' && half.has(`${l.gid}|${l.pid}|${l.stat}|${+l.k}`); };
  const pbTopOwn = (u, on) => { const q = qualOwn(u, on), ord = (a, b) => legId(a).localeCompare(legId(b)), same = sameBetOwn([...q.pref, ...q.thin]);
    const rank = list => list.filter(x => !same(x.c)).map(x => ({ ...x, win: decOwn(x.c.price) - 1, ev: x.c.p * decOwn(x.c.price) - 1 })).sort((a, b) => (b.ev - a.ev) || ord(a.c, b.c));
    const rows = [...rank(q.pref.map(c => ({ c, value: true, thin: false, market: false }))), ...rank(q.thin.map(c => ({ c, value: false, thin: true, market: false }))),
      ...rank(q.mkt.map(c => ({ c, value: false, thin: false, market: true })))];
    const top = rows.slice(0, PB_TOP_N_OWN); top.full = rows.length;
    top.same = [...q.pref, ...q.thin, ...q.mkt].filter(same).length; top.q = q; return top; };
  /* how many lists the smoke held where more lines qualified than the list holds (each then exactly the first 50 of
     the order): the made-up list of sixty below is one, so this is never none */
  let topOver = 0;
  /* no word of the retired tags, thin edge and no edge, anywhere a visitor reads */
  const OLD_TAG = /\bthin[ -]edge\b|\bno edge\b/i;
  /* (app v113) the words a set's level drew under it until the owner's call of 17 October 2026, and the tab's lead, its
     foot and the record's sentence: none is on Suggested Parlays any more (pbThinLine's "is not a Value pick" and "are
     not Value picks", pbMktLine's "at the book's own chance with its margin out", the lead's "One night is shown at a
     time" and "A leg marked Value is one of", the foot's "Each set is built from its game's lines alone", the record's
     "The record starts with this change"), nor the long lock lines' "Refresh odds updates it until then" and
     "Refresh odds no longer changes it" */
  /* (app v113) what the lock line adds where the locked set is this browser's own (the record has none for the game) */
  const OWN_LINE = ' This browser’s own set: the site’s was not published in time, so the record does not grade it.';
  const WHY_GONE = /\bis not a Value pick\b|\bare not Value picks\b|own chance with its margin out|One night is shown at a time|A leg marked Value is one of|Each set is built from its game|The record starts with this change|Refresh odds (updates it until then|no longer changes it)/;
  const nmOk = (nm, l) => !!nm && legNameOf(nm) === l.name && txt(nm.querySelector('small')).startsWith(l.label);
  let holdSetF = null;
  /* (app v118) the units' own checks (blocksHeld, the Elo picks' rule and cards), for the made-up games further down */
  let SPH = null;
  const money1 = v => (v < -0.0005 ? '−' : '+') + '$' + Math.abs(v).toFixed(2);
  const addName = (l, on) => `${on ? 'Remove' : 'Add'} ${l.name}, ${l.label}, ${on ? 'from' : 'to'} the builder`;
  const holdTop = (lab, u, on) => {
    const want = pbTopOwn(u, on), rows = [...panel.querySelectorAll('ol.pb-top > li.pb-trow')], fo = fairRule(w), fmt = w.eval('fmtML'), P = w.eval('S').parlay, bad = [];
    const inB = l => { const x = P[l.key]; return !!x && x.k === l.k && x.side === l.side && !!x.main === !!l.main; };
    if (!want.length) { const none = panel.querySelector('.pb-top-none');
      chk(!rows.length && !!none && txt(none).length > 20 && !/NaN|undefined/.test(txt(none)), `${lab}: nothing qualifies on the ticks and the list draws rows, or does not say why: ${none ? txt(none) : rows.length + ' rows'}`); return 0; }
    if (rows.length !== want.length) bad.push(`${rows.length} rows where ${want.length} lines qualify`);
    /* (app v113) the Top 50: at most 50 rows, and where more lines qualify, exactly the first 50 of the order (the
       rows below each held to its rank there), under a heading that says so */
    { const h2 = panel.querySelector('#pbCard > .pb-hd h2');
      chk(rows.length <= PB_TOP_N_OWN && want.length === Math.min(PB_TOP_N_OWN, want.full) && !!h2 && txt(h2) === `Top ${PB_TOP_N_OWN} lines`,
        `${lab}: the list is not the Top ${PB_TOP_N_OWN} lines, at most ${PB_TOP_N_OWN} rows, ${want.full > PB_TOP_N_OWN ? `the first ${PB_TOP_N_OWN} of the ${want.full} lines that qualify in order` : `the ${want.full} lines that qualify`}: ${rows.length} rows under "${h2 ? txt(h2) : 'no heading'}"`);
      if (want.full > PB_TOP_N_OWN) topOver++; }
    want.forEach((x, i) => { const r = rows[i], l = x.c; if (!r) return;
      const b = r.querySelector('button[data-pb-leg]'), cs = [...r.querySelectorAll('.pb-tc')], f = fo(l), est = l.src === 'dkline', on2 = inB(l), grp = x.value ? 'value' : 'other';
      const got = cs.map(c => txt(c.querySelector('b')) + '/' + txt(c.querySelector('small')));
      const exp = [`${fmt(l.price)}${est ? ' est.' : ''}/price`, `${(l.p * 100).toFixed(0)}%/model`, f ? `${(f.p * 100).toFixed(0)}%/${f.est ? 'fair, est.' : 'fair'}` : '–/no fair', `${money1(x.win)}/wins on $1`, `${money1(x.ev)}/expected on $1`];
      const marks = [...r.querySelectorAll('i.pb-valmark')];
      if (!b || b.dataset.pbLeg !== l.key || b.dataset.side !== l.side || +b.dataset.k !== +l.k || txt(r.querySelector('.pb-trk')) !== String(i + 1) || r.dataset.pbRow !== String(i + 1) || r.dataset.pbGrp !== grp
        || !r.closest(`ol.pb-top[data-pb-sec="${grp}"]`)) bad.push(`row ${i + 1} is ${b ? b.dataset.pbLeg + ' ' + b.dataset.side + ' ' + b.dataset.k : 'no leg'} ${b ? ' (' + r.dataset.pbGrp + ', ranked ' + txt(r.querySelector('.pb-trk')) + '/' + r.dataset.pbRow + ')' : ''} where ${l.key} ${l.side} ${l.k} ranks there (${grp}, expected ${money1(x.ev)} on $1)`);
      else if (got.join(' | ') !== exp.join(' | ') || !nmOk(r.querySelector('.nm'), l) || marks.length !== (x.value ? 1 : 0) || (x.value && (txt(marks[0]) !== 'Value' || !marks[0].closest('.nm small'))) || OLD_TAG.test(txt(r)) || r.querySelector('.pb-thinmark')
        || (est && !(r.querySelector('.pb-tc i.est') || { title: '' }).title.startsWith('DraftKings’ line from ESPN, read ')) || (!est && r.querySelector('i.est')))
        bad.push(`row ${i + 1}, ${l.name} ${l.label}, reads ${got.join(' | ')}, ${marks.length} Value mark${marks.length === 1 ? '' : 's'}${OLD_TAG.test(txt(r)) ? ', an old tag' : ''}, not ${exp.join(' | ')}${x.value ? ', marked Value' : ', unmarked'}`);
      else if (b.getAttribute('aria-label') !== addName(l, on2) || b.getAttribute('aria-pressed') !== String(on2) || txt(b) !== (on2 ? 'Added' : 'Add') || w.getComputedStyle(b).minHeight !== '44px')
        bad.push(`row ${i + 1}'s Add is not a 44px button named "${addName(l, on2)}": ${b.getAttribute('aria-label')} ${w.getComputedStyle(b).minHeight}`);
      /* (app v119) no row carries app v115's line on a missing DraftKings id: every row has its id */
      else if (r.querySelector('[data-pb-slip], .pb-tslip'))
        bad.push(`row ${i + 1}, ${l.name} ${l.label} (${l.src}), carries a line on a missing DraftKings id, which app v119 took off: "${txt(r.querySelector('[data-pb-slip], .pb-tslip'))}"`); });
    /* the two parts as drawn: the Value picks' heading (its count, or with none a line saying so), its list, then the
       other lines' heading and count and their list starting at the next rank, in that order and nothing else */
    { const nV = want.filter(x => x.value).length, nO = want.length - nV, H = [...panel.querySelectorAll('h3.pb-topsec')], O = [...panel.querySelectorAll('ol.pb-top')];
      const hv = H.find(h => h.dataset.pbSec === 'value'), ho = H.find(h => h.dataset.pbSec === 'other'), ov = O.find(o => o.dataset.pbSec === 'value'), oo = O.find(o => o.dataset.pbSec === 'other'), nv = panel.querySelector('[data-pb-novalue]');
      const pill = h => h && h.querySelector('.pill') ? txt(h.querySelector('.pill')) : null, before = (a, b2) => !!a && !!b2 && !!(a.compareDocumentPosition(b2) & 4);
      const head = h => h ? txt(h).replace(/\s*\d+$/, '') : null;
      if (H.length !== 1 + (nO ? 1 : 0) || O.length !== (nV ? 1 : 0) + (nO ? 1 : 0)) bad.push(`${H.length} headings and ${O.length} lists for ${nV} Value picks and ${nO} other lines`);
      if (!hv || head(hv) !== 'Value picks' || pill(hv) !== (nV ? String(nV) : null)) bad.push(`the first part is headed "${hv ? txt(hv) : 'nothing'}", not Value picks${nV ? ' ' + nV : ' with no count'}`);
      if (nV ? !ov || ov.querySelectorAll(':scope > li.pb-trow').length !== nV || ov.hasAttribute('start') || !!nv || !before(hv, ov) : !!ov || !nv || !before(hv, nv) || txt(nv) !== 'No line on your picks is a Value pick right now.')
        bad.push(nV ? `the Value picks' list does not hold its ${nV} lines from rank 1 under its heading` : `with no Value pick the heading is not over a line saying so: "${nv ? txt(nv) : 'none'}"`);
      /* what each part is, under its heading: the Value picks' bar, and why the other lines miss it, the game totals
         last where Game total is ticked (market + form named where the Elo tab is on the page, as the page's formSig) */
      { const form = typeof w.eloLoaded === 'function', sub = h => h && h.nextElementSibling && h.nextElementSibling.matches('p.pb-topsub') ? txt(h.nextElementSibling) : null;
        const wantV = `The model rates each at least 3 points above the chance its price implies${form ? ', and on a player’s line market + form agrees' : ''}. Each is marked Value.`;
        const wantO = `These miss a Value pick’s bar (3 points above the chance the price implies${form ? ', and market + form agreeing on a player’s line' : ''}), though the model still rates each at or above the book’s price${u.k.total ? '; the game totals, at the book’s own chance, come last' : ''}. A suggested parlay takes them only where its Value picks run out.`;
        if (nV && sub(hv) !== wantV) bad.push(`the Value picks' line reads "${sub(hv)}", not "${wantV}"`);
        if (nO && sub(ho) !== wantO) bad.push(`the other lines' line reads "${sub(ho)}", not "${wantO}"`); }
      if (nO ? !ho || head(ho) !== 'Other lines' || pill(ho) !== String(nO) || !oo || oo.querySelectorAll(':scope > li.pb-trow').length !== nO || oo.getAttribute('start') !== (nV ? String(nV + 1) : null) || !before(hv, ho) || !before(ho, oo) || (ov && !before(ov, ho)) : !!ho || !!oo)
        bad.push(nO ? `the other lines are not headed Other lines ${nO} over their list starting at ${nV + 1}: "${ho ? txt(ho) : 'none'}", start ${oo ? oo.getAttribute('start') : 'no list'}` : 'with no other line the Other lines part is drawn');
      if (OLD_TAG.test(pbOwnTxt(panel)) || panel.querySelector('.pb-thinmark')) bad.push('the panel still speaks of thin edge or no edge: ' + (pbOwnTxt(panel).match(/.{0,60}(thin[ -]edge|no edge).{0,40}/i) || [''])[0]); }
    chk(!bad.length, `${lab}: the Top 30 lines are not every qualifying line, the Value picks first and then the other lines, the totals last, each part under its heading ranked by what $1 on it is expected to make, the ranks running on, each with its numbers, Value marked on a Value pick alone and its own Add: ` + bad.slice(0, 3).join('; '));
    /* (app v112, round two) the order as drawn: the Value picks, then the thin-edge lines, then the totals, never a
       line of an earlier part after one of a later; and each bet once: no row is a ladder rung k+ whose same bet,
       the player's main Over at k-0.5 on a half-point line, is among the qualifying legs (either part), and the
       page's count of the rungs it left out (getPbTop's same) is the one worked out here */
    { const partOf = r => { const b = r.querySelector('button[data-pb-leg]'); return r.dataset.pbGrp === 'value' ? 0 : b && /\|game\|total$/.test(b.dataset.pbLeg) ? 2 : 1; };
      const parts = rows.map(partOf), back = parts.findIndex((x, i) => i > 0 && x < parts[i - 1]);
      chk(back < 0, `${lab}: the Top 30 lines are not the Value picks, then the thin-edge lines, then the totals: row ${back + 1} (${back < 0 ? '' : ['a Value pick', 'a thin-edge line', 'a total'][parts[back]]}) follows ${back < 0 ? '' : ['a Value pick', 'a thin-edge line', 'a total'][parts[back - 1]]}`);
      const half = new Set([...want.q.pref, ...want.q.thin].filter(l => !gameLegOwn(l) && l.main && l.side === 'over' && Math.abs(+l.k % 1) === 0.5).map(l => `${l.key}|${+l.k + 0.5}`));
      const twice = rows.map(r => r.querySelector('button[data-pb-leg]')).filter(b => b && b.dataset.side === 'over' && half.has(`${b.dataset.pbLeg}|${+b.dataset.k}`));
      const got = w.eval('typeof getPbTop') === 'function' ? w.eval('getPbTop()').same : undefined;
      chk(!twice.length && got === want.same, `${lab}: the Top 30 lines list a bet twice, a ladder rung beside the same bet's half-point main Over (${twice.slice(0, 3).map(b => b.dataset.pbLeg + ' ' + b.dataset.k + '+').join(', ') || 'none'}), or the page counts ${got} rungs left out where ${want.same} are`); }
    { const lead = txt(panel.querySelector('.pb-lead')), foot = txt(panel.querySelector('.pb-foot'));
      chk(lead.includes(`first the Value picks, marked Value, then the other lines${u.k.total ? ', the game totals last' : ''}, each part ranked by what $1 on it is expected to make at the model’s chance, best first, ${PB_TOP_N_OWN} lines at most.`)
        && foot.includes('The Value picks come first, marked Value, then the other lines (the ones a suggested parlay takes only where the Value picks cannot fill it), each part ranked by what $1 on it is expected to make, any game totals last, ' + PB_TOP_N_OWN + ' lines at most in all. Each bet is listed once: a ladder rung that is the same bet as the player’s main line (225+ passing yards and Over 224.5) is shown as the main line.')
        && foot.includes('3 points above it or more is a Value pick') && foot.includes('a game total, priced at the book’s own chance, is never one'),
        `${lab}: the Top 30 lines' lead or foot does not say the Value picks come first, then the other lines: ${lead.slice(0, 260)} / ${foot.slice(0, 200)}`); }
    return want.length; };
  holdTopF = holdTop;
  /* the panel holds on whatever the week offers: the mix sets the boxes, every tier is its legs or says
     why, and every leg is of a ticked kind and game, has not kicked off and is never rated below the book */
  if (hasPb) { const Sx = w.eval('S'), games = w.eval('pbGames()'), U = () => Sx.ui.pb, KINDS = ['ml', 'ats', 'total', 'over', 'under'];
    const kindOf = w.eval('pbKind'), mlProb = w.eval('mlProb'), isG = w.eval('isGameLeg'), started = w.eval('gameStarted');
    /* the legs the picks make, and the most a parlay can take of them (one a player, one side and one total a game) */
    const maxLegs = () => { const u = U(), on = games.filter(g => !u.off.includes(g.id));
      if (!on.length || !KINDS.some(k => u.k[k])) return 0; const p = w.eval('pbPool')(on); return maxFitOwn([...p.pref, ...p.thin, ...(p.mkt || [])]); };
    /* what a card's rule says it is: Safe the likeliest pair, a level over its floor its best
       return, a level none of whose parlays reaches its floor the likeliest of its size */
    const ruleFor = t => t.likeliest ? `the likeliest ${t.n} legs` : t.floor ? `best return that lands ${Math.round(t.floor * 100)}%+ by the model` : 'the likeliest pair';
    const provedLikeliest = (lab, t, list) => { if (!noMovers(list)) return; const b = likeliestOf(list, t.n, t.thin); if (!b) return;
      chk(t.corr >= b.best - 1e-12, `${lab}: the ${t.id} tier, "${ruleFor(t)}", lands ${(t.corr * 100).toFixed(2)}% (${t.legs.map(l => l.name + ' ' + l.label).join(', ')}) where ${orderF(b.legs).map(l => l.name + ' ' + l.label).join(', ')} land ${(b.best * 100).toFixed(2)}% with as many thin legs (${b.seen} parlays of ${t.n} worked)`); };
    /* a leg's game has kicked off, by the page's clock; and DraftKings' id at the leg's own line in the
       payload's ids as they stand. No press has been made yet in this part, so PAY.dk is the payload's own
       (baked by the job) or a fixture of the smoke's, never one a press made: where it is an object the
       payload carries ids, and the levels take only legs with one */
    const startedL = l => { const g = Sx.sched.find(x => x.id === l.gid); return !!g && started(g); };
    const dkNow = () => { const D = w.eval('PAY').dk; return !!D && typeof D === 'object' ? D : null; };
    const ownId = l => dkTakes(dkNow(), l, startedL(l));
    /* one level as the engine built it (a tier of getPbTiers, or of a prime-time game's set), held to every rule
       a suggestion keeps: its size in different lines, of the kinds and games it may take, none kicked off, a
       real price at or above the book, DraftKings' id at its line, a total only as a market leg where the legs
       with an edge cannot make it, one side and one total a game and one leg a player, its chance and price the
       builder's own sums, its floor kept, its fair chance parlayProb at the legs' fair chances, no leg far off */
    const holdTier = (lab, t, pool, allow) => {
      chk(t.legs.length === t.n && new Set(t.legs.map(l => l.key)).size === t.n, `${lab}: the ${t.id} tier is not ${t.n} different lines`);
      chk(t.legs.every(l => allow(l) && !startedL(l)), `${lab}: the ${t.id} tier has a leg of a kind or a game not ticked, or one that has kicked off`);
      chk(t.legs.every(l => takenRule(w)(l) && (l.market || l.p >= mlProb(l.price)) && l.p >= 0.45 && l.p < 0.97), `${lab}: the ${t.id} tier has a leg with no real price (nor the rule's own from DraftKings' line on ESPN, on a kind it may take) or rated below the book`);
      chk(!dkNow() || t.legs.every(ownId), `${lab}: the ${t.id} tier has a leg DraftKings has no id for at its own line, so it cannot go on the slip: ` + t.legs.filter(l => !ownId(l)).map(l => l.name + ' ' + l.label).join(', '));
      /* (app v121) how many the legs with an edge leave to fill is the most of them one parlay can take with no pair
         DraftKings refuses (maxFitOwn), and no level holds such a pair (clashOwn) */
      chk(t.legs.every(l => (l.stat === 'total') === !!l.market) && (t.mkt || 0) === t.legs.filter(l => l.market).length
        && (!t.mkt || t.mkt === Math.max(0, t.n - maxFitOwn([...pool.pref, ...pool.thin]))),
        `${lab}: the ${t.id} tier holds a total that is not a market leg, or more totals than the legs with an edge leave to fill`);
      chk(!clashPairsOwn(t.legs).length, `${lab}: the ${t.id} tier holds a pair DraftKings will not take on one slip: ` + clashTxt(t.legs));
      { const sd = t.legs.filter(l => isG(l) && l.stat !== 'total'), tt = t.legs.filter(l => l.stat === 'total'), pl = t.legs.filter(l => !isG(l));
        chk(new Set(sd.map(l => l.gid)).size === sd.length && new Set(tt.map(l => l.gid)).size === tt.length && new Set(pl.map(l => l.pid)).size === pl.length,
          `${lab}: the ${t.id} tier has two sides or two totals on one game, or two legs on one player`); }
      chk(w.eval('parlayProb')(t.legs).corr === t.corr && w.eval('parlayDec')(t.legs.map(l => ({ leg: l, ml: l.price }))) === t.dec && (!t.floor || t.likeliest || t.corr >= t.floor) && (!t.likeliest || t.floor > 0),
        `${lab}: the ${t.id} tier's chance or price is not the builder's sum, or it is under its floor without being the likeliest of its size`);
      { const fo = fairRule(w), fs = t.legs.map(fo), FAR = w.eval('FAR_OFF');
        chk(fs.every(Boolean) ? (!!t.fair && t.fair.p != null && Math.abs(t.fair.p - w.eval('parlayProb')(t.legs.map((l, i) => ({ ...l, p: fs[i].p }))).corr) < 1e-9 && t.fair.est === fs.some(f => f.est)) : (!!t.fair && t.fair.p === null),
          `${lab}: the ${t.id} tier's fair chance ${t.fair && t.fair.p} is not parlayProb on its legs at their fair chances`);
        chk(t.legs.every((l, i) => !fs[i] || l.p - fs[i].p < FAR - 1e-9), `${lab}: the ${t.id} tier has a leg far off the market: ` + t.legs.filter((l, i) => fs[i] && l.p - fs[i].p >= FAR - 1e-9).map(l => l.name + ' ' + l.label).join(', ')); } };
    /* the engine on the ticks (getPbTiers: the all-games levels nothing on the page draws since app v111, but
       the engine every set is built by), then the Top 50 lines the same ticks make */
    const hold = lab => { const r = w.eval('getPbTiers()'), u = U(), m = maxLegs(); let built = 0;
      const on = games.filter(g => !u.off.includes(g.id)), pool = on.length && KINDS.some(k => u.k[k]) ? w.eval('pbPool')(on) : { pref: [], thin: [] };
      chk(r.tiers.map(t => t.id + t.n).join() === 'safe2,med3,aggr4,xtrm5', `${lab}: the tiers are not Safe 2, Medium 3, Aggressive 4, Extreme 5`);
      chk(!dkNow() || [...pool.pref, ...pool.thin, ...(pool.mkt || [])].every(ownId), `${lab}: the legs the levels are built from hold one DraftKings has no id for at its own line: ` + [...pool.pref, ...pool.thin, ...(pool.mkt || [])].filter(l => !ownId(l)).slice(0, 4).map(l => l.name + ' ' + l.label).join(', '));
      for (const t of r.tiers) {
        /* every level shows a parlay of its size whenever the picks make that many legs */
        if (!t.legs) { chk(typeof t.why === 'string' && t.why.length > 10 && m < t.n && !/of the time or more/.test(t.why), `${lab}: the ${t.id} tier is empty though the picks make ${m} legs for its ${t.n}, or says nothing: ${t.why}`); continue; }
        built++;
        holdTier(lab, t, pool, l => u.k[kindOf(l)] && !u.off.includes(l.gid) && games.some(g => g.id === l.gid));
        /* Safe's likeliest pair and a level's likeliest of its size, worked out in full where every parlay is a plain product */
        if ((t.likeliest || !t.floor) && !t.mkt) provedLikeliest(lab, t, [...pool.pref, ...pool.thin]);
      }
      /* with Game total ticked, one line says what a total on the list is (and only then): never a Value pick, last
         among the other lines, so a long list can end before them (app v112) */
      chk(txt(panel).includes('Game totals are never Value picks: each is priced at the book’s own chance, so the totals come last among the other lines, and on a long list the ' + PB_TOP_N_OWN + ' lines can end before them.') === !!u.k.total,
        `${lab}: ${u.k.total ? 'Game total is ticked and the list does not say a total is never a Value pick, that the totals come last among the other lines and that the ' + PB_TOP_N_OWN + ' can end before them' : 'Game total is not ticked and the list still speaks of totals'}`);
      holdTop(lab, u, on);
      return built; };
    const spPanel = d.getElementById('spPanel'), spOf = id => d.querySelector(`#spPanel .sp-game[data-sp-game="${id}"]`);
    const nightOf = g => PRIME_NIGHT[new Date(g.d + 'T12:00:00Z').getUTCDay()];
    const TN = w.eval('TEAM_NAMES'), pulledOwn = g => ({ 4: 'on Thursday, the day of the game', 1: 'on Monday, the day of the game', 0: 'on Saturday morning' })[new Date(g.d + 'T12:00:00Z').getUTCDay()];
    const SPU = { k: Object.fromEntries(KINDS.map(k => [k, true])), off: [] };
    /* (app v118) a unit of Suggested Parlays: a night game (a schedule row) or the Sunday slot (slotOwn's, the rule worked
       out here): the games it stands on, how the tab names it, where its legs come from in the page's words, when its
       player prices come, and the line under its heading before its lock */
    const unitGames = u => u.slot ? u.games : [u], unitWhat = u => u.slot ? 'the Sunday slot' : `${u.a} at ${u.h}`, unitWhere = u => u.slot ? 'the Sunday slot' : 'this game';
    const unitLock = u => u.slot ? u.lock : etKick(u) - 2 * 3600e3, unitPulled = u => u.slot ? 'the afternoon games’ are pulled on Saturday morning, and never the early games’ (before 4pm ET)' : `they are pulled ${pulledOwn(u)}`;
    const unitHead = u => { if (!u.slot) return { h: `${TN[u.a] || u.a} at ${TN[u.h] || u.h}`, pill: nightOf(u), small: null };
      const et = (ms, o) => new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', ...o });
      const day = et(u.first, { weekday: 'short', month: 'short', day: 'numeric' }), t0 = et(u.first, { hour: 'numeric', minute: '2-digit' }) + ' ET', t1 = et(u.last, { hour: 'numeric', minute: '2-digit' }) + ' ET';
      return { h: `Week ${u.w}, ${u.games.length} game${u.games.length === 1 ? '' : 's'}`, pill: null, small: `${day} · ${t0}${t1 !== t0 ? ' to ' + t1 : ''}` }; };
    const headHeld = (el, u) => { const H = unitHead(u), h4 = el && el.querySelector(':scope > .sp-hd > h4'), pill = el && el.querySelector(':scope > .sp-hd > .pill'), sm = el && el.querySelector(':scope > .sp-hd > small');
      return !!el && !!h4 && h4.id === 'spg-' + u.id && txt(h4) === H.h && (H.pill ? !!pill && txt(pill) === H.pill : !pill) && (!H.small || (!!sm && txt(sm) === H.small))
        && el.getAttribute('role') === 'group' && el.getAttribute('aria-labelledby') === 'spg-' + u.id && el.classList.contains('sp-slot') === !!u.slot && !el.querySelector('h3'); };
    /* (app v121) a level card's game, which only the Sunday slot's cards name (the owner, 19 October 2026: "the legs need
       to be part of the same game parlay only"): x the game its legs are of, or null where the card names none; the span
       in its title right after the legs' count and before its rule, its game id and its words the smoke's own (tgameOwn) */
    const tgameHeld = (c, x) => { const all = c ? [...c.querySelectorAll('.pb-tgame')] : [];
      if (!x) return !all.length;
      const th = c.querySelector(':scope > .pb-th'), kids = th ? [...th.children] : [], i = kids.findIndex(e => e.matches('span.pb-tgame'));
      return all.length === 1 && i === 2 && kids[1].matches('.pill') && (!kids[3] || kids[3].matches('.pb-rule')) && kids[i].dataset.pbTgame === x.id && txt(kids[i]) === tgameOwn(x, TN); };
    /* (app v118) a drawn unit's blocks, in order: its heading, its one phase line, then "Model parlays" over its four
       levels and "Elo picks" over theirs (each a .pb-tiers marked data-sp-kind), the Elo picks' only where the ELO tab is
       on the page, which it is on the hub; "Loading the Elo ratings…" in their place only while the Elo files are not
       in (eloIn: the smoke's own reading of whether the ELO tab has its ratings and its matchups), and, before them, this
       browser's own Elo picks said in one line where the set is the site's and the Elo picks are not. A unit not built
       yet (the tab off the screen) is its heading and "Built when this tab is open." alone; one at its lock with the
       record not read yet, its heading and the loading line alone. Each level card its level's id (safe .. xtrm, elo-safe
       .. elo-xtrm), and a level with legs its Add to builder and Finish named for the unit, unless the unit is under way
       (the Sunday slot from its first kickoff), when it has none and no leg has an Add */
    const eloIn = () => { const r = typeof w.eloUnit === 'function' ? w.eloUnit([], {}) : null; return r != null && !r.error; };
    /* the Elo files failed (eloUnit's error): one line saying so in the Elo picks' place, never "Loading" for good */
    const eloErr = () => { const r = typeof w.eloUnit === 'function' ? w.eloUnit([], {}) : null; return r && r.error || null; };
    const blocksHeld = (lab, u, v, el) => { const bad = [], kids = el ? [...el.children] : [], tag = x => x.tagName.toLowerCase() + (x.dataset.spKind ? `[${x.dataset.spKind}]` : x.dataset.spPhase ? `[${x.dataset.spPhase}]` : x.hasAttribute('data-sp-elo-wait') ? '[elo-wait]' : x.hasAttribute('data-sp-elo-err') ? '[elo-err]' : x.hasAttribute('data-sp-elo-none') ? '[elo-none]' : '');
      const shape = kids.map(tag).join(' '), under = !!v && !!v.under, ph = v ? (v.phase === 'live' ? 'live' : v.phase === 'loading' ? 'loading' : under ? 'under' : v.own ? 'own' : 'locked') : 'wait';
      const eloOwnLine = !!v && v.phase === 'locked' && !v.own && !!v.eloOwn;
      /* under way with no set of the site's and none kept: the line alone, nothing built of the page's own (app v118) */
      const want = ph === 'wait' || ph === 'loading' || (under && v.none) ? `div p[${ph}]` : `div p[${ph}] h5[model] div[model] h5[elo] ${under && v.eloNone ? 'p[elo-none]' : eloIn() ? (eloOwnLine ? 'p[eloown] ' : '') + 'div[elo]' : eloErr() ? 'p[elo-err]' : 'p[elo-wait]'}`;
      if (shape !== want) bad.push(`its blocks are ${shape || 'none'}, not ${want}`);
      const h5 = k => el && el.querySelector(`:scope > h5.sp-sub[data-sp-kind="${k}"]`);
      if (shape === want && ph !== 'wait' && ph !== 'loading' && !(under && v.none)) {
        if (txt(h5('model')) !== 'Model parlays' || txt(h5('elo')) !== 'Elo picks') bad.push(`its blocks are headed "${txt(h5('model'))}" and "${txt(h5('elo'))}"`);
        const wait = el.querySelector(':scope > [data-sp-elo-wait]'); if (wait && txt(wait) !== 'Loading the Elo ratings…') bad.push(`its Elo picks' loading line reads "${txt(wait)}"`);
        const err = el.querySelector(':scope > [data-sp-elo-err]'); if (err && txt(err) !== eloErr()) bad.push(`its Elo picks' line on the Elo files not loading reads "${txt(err)}"`);
        if (eloOwnLine && txt(el.querySelector(':scope > [data-sp-phase="eloown"]')) !== 'This browser’s own Elo picks: the site’s were not published in time, so the record does not grade them.') bad.push('its line on this browser\'s own Elo picks is not the page\'s one line');
        for (const [k, pre] of [['model', ''], ['elo', 'elo-']]) { const box = el.querySelector(`:scope > .pb-tiers[data-sp-kind="${k}"]`); if (!box) continue;
          const cards = [...box.children], ids = cards.map(c => c.dataset.pbTier || (c.classList.contains('none') ? c.className.split(' ')[1] : '?'));
          if (ids.join() !== PB_TIERS_OWN.map(id => pre + id).join() || cards.some(c => !c.matches('.pb-tier'))) bad.push(`its ${k} levels are ${ids.join(', ')}`);
          for (const c of cards) { const id = c.dataset.pbTier; if (!id) continue;
            const ab = c.querySelector(`[data-sp-add="${u.id}:${id}"]`), fb = c.querySelector(`[data-pc-finish="sp|${u.id}:${id}"]`), legs = [...c.querySelectorAll('.pb-legs li')], adds = c.querySelectorAll('.pb-legs [data-pb-leg]').length, label = txt(c.querySelector('.pb-tn'));
            if (under ? ab || fb || c.querySelector('.pb-acts') || adds : !ab || !fb || adds !== legs.length || !(ab.getAttribute('aria-label') || '').includes(`the ${label} ${k === 'elo' ? 'Elo pick' : 'parlay'} for ${unitWhat(u)}`) || fb.getAttribute('aria-label') !== `Finish the ${label} ${k === 'elo' ? 'Elo pick' : 'parlay'} for ${unitWhat(u)}`)
              bad.push(`its ${id} card ${under ? 'still has something to add or finish under way' : `has no Add to builder and Finish named for ${unitWhat(u)}, or a leg with no Add`}`); } } }
      chk(!bad.length, `${lab}, ${u.id}: the unit is not drawn as its heading, its line and its two blocks (the model's parlays, then the Elo picks): ` + bad.slice(0, 3).join('; '));
      return !bad.length; };
    /* (app v118) a unit's Elo picks held to the ELO tab's rule worked out here, on that unit's games alone whatever the
       Parlay Builder's ticks say (the owner's call of 19 October 2026: until then they stood on the ticked games and player
       sides, and a reader who had unticked the priced games saw none all of Sunday 18 October): the candidates every
       player's line on the unit's games (pricedLegs) with a real price, or one read from DraftKings' line on a tested kind,
       of -200 to +300, DraftKings' id at its line wherever the payload carries ids for its game, on a player the Elo file
       rates, whose Elo chance (the page's eloMatchupP, held by hand above) is 30% or more and beats the price, one a player,
       his best by value; each level's legs those candidates, different players, on the unit's games only, its chance and
       price the builder's sums on the legs' Elo chances (parlayProb, parlayDec, pbOrder), its floor kept (Safe's 35% the Elo
       picks' own) unless it is the likeliest of its size, which it says only under the floor; a level empty only where the
       candidates are fewer than it takes, saying so (or, with no player legs priced in the unit, when they come); with no
       more than eight candidates, each level the rule's own answer over every parlay of its size; and the same levels with
       the Parlay Builder's ticks planted to nothing (every game unticked, both player sides off), put back after */
    const ELO_LV_OWN = () => w.eval('PB_TIERS').map(t => ['elo-' + t[0], t[1], t[2], t[3] || 0.35]);
    const eloCandsOwn = G => { const ids = new Set(G.map(g => g.id)), DK = w.eval('PAY').dk, DKo = DK && typeof DK === 'object' ? DK : null, started = w.eval('gameStarted'), P = JSON.parse(ELO_P).players || {};
      const st = l => { const g = w.eval('S').sched.find(x => x.id === l.gid); return !!g && started(g); }, best = {};
      for (const l of w.eval('pricedLegs')(G)) { if (l.grp === 'TEAM' || !(l.src === 'real' || l.src === 'dkline') || !isFinite(l.price) || l.price < -200 || l.price > 300 || !ids.has(l.gid)) continue;
        if (!dkTakes(DKo, l, st(l)) || !P[l.pid]) continue;
        const imp = impOwn(l.price), pe = w.eloMatchupP(l, imp); if (pe == null) continue; const ev = pe * decOwn(l.price) - 1; if (!(pe >= 0.3 && ev > 0)) continue;
        const b = best[l.pid], id = legId(l); if (!b || ev > b.ev || (ev === b.ev && (!!l.main > !!b.l.main || (!!l.main === !!b.l.main && id < legId(b.l))))) best[l.pid] = { l, pe, ev }; }
      return Object.values(best).sort((a, b) => (b.ev - a.ev) || ((b.l.main ? 1 : 0) - (a.l.main ? 1 : 0)) || (legId(a.l) < legId(b.l) ? -1 : 1)); };
    const eloSumsOwn = legs => { const O = w.eval('pbOrder')(legs); return { O, p: w.eval('parlayProb')(O.map(l => ({ ...l, p: l.pe }))).corr, d: w.eval('parlayDec')(O.map(l => ({ leg: l, ml: l.price }))) }; };
    /* (app v121) never a parlay holding a pair DraftKings refuses (clashOwn: a quarterback's passing touchdowns with a
       teammate's touchdown, the only kind the Elo picks' candidates, all players' lines, can make) */
    const eloRuleOwn = (C, n, floor) => { const memo = new Map(); let best = null, likely = null;
      const go = (s0, cur) => { if (cur.length === n) { const k = cur.map(legId).sort().join(','), x = memo.get(k) || (() => { const e = { k, ...eloSumsOwn(cur) }; memo.set(k, e); return e; })();
          if (!likely || x.p > likely.p || (x.p === likely.p && x.k < likely.k)) likely = x;
          if (floor && x.p >= floor && (!best || x.p * x.d > best.p * best.d || (x.p * x.d === best.p * best.d && x.k < best.k))) best = x; return; }
        for (let i = s0; i <= C.length - (n - cur.length); i++) { if (cur.some(y => clashOwn(y, C[i]))) continue; go(i + 1, cur.concat(C[i])); } };
      go(0, []); return floor ? (best || likely) : likely; };
    /* one unit of games' Elo picks (G, its candidates C) held to the rule, each level its legs or why it is empty; where
       the empty level's words: the unit's own ('in this game', 'in the Sunday slot' for a slot of one game) */
    const eloUnitBad = (G, C, T, LV, where, plId, pulled) => { const bad = [], gids = new Set(G.map(g => g.id)), byId = new Map(C.map(c => [legId(c.l), c])), fit = maxFitOwn(C.map(c => c.l));
      T.forEach((t, i) => { const [id, label, n, floor] = LV[i];
        if (!t || !t.legs || !t.legs.length) { const N = C.length;
          /* (app v121) empty where its candidates are fewer than it takes, or where no n of them go together on DraftKings'
             slip, each said so; with no player prices in the unit, when they come */
          const why = !plId ? null : N >= n ? `No ${n} of the ${N} players ${where} go together on DraftKings’ slip: it takes no quarterback’s passing TDs with a teammate’s touchdown.` : `Only ${N} player${N === 1 ? '' : 's'} ${where} qualif${N === 1 ? 'ies' : 'y'}: this level takes ${n}.`;
          if (fit >= n || (where == null ? false : why ? t.why !== why : !(typeof t.why === 'string' && t.why.startsWith('No player ') && t.why.endsWith(`${where} yet: ${pulled}.`)))) bad.push(`${id} is empty (${t && t.why}) with ${N} candidates for its ${n}, ${fit} of them going together`);
          return; }
        const e = eloSumsOwn(t.legs);
        if (t.label !== label || t.n !== n || t.legs.length !== n || new Set(t.legs.map(l => l.pid)).size !== n || t.legs.some(l => !gids.has(l.gid))) bad.push(`${id} is not ${n} different players' legs on the unit's games: ${t.legs.map(l => l.gid + ' ' + l.name).join(', ')}`);
        else if (clashPairsOwn(t.legs).length) bad.push(`${id} holds a pair DraftKings will not take on one slip: ${clashTxt(t.legs)}`);
        else if (t.legs.some(l => { const c = byId.get(legId(l)); return !c || Math.abs(c.pe - l.pe) > 1e-12; })) bad.push(`${id} holds a leg the rule does not make a candidate of this unit: ${t.legs.filter(l => !byId.get(legId(l))).map(l => l.name + ' ' + l.label + ' ' + l.price).join(', ')}`);
        else if (t.p !== e.p || t.dec !== e.d || (!t.likeliest && floor && t.p < floor) || (!!t.likeliest && !(floor && t.p < floor))) bad.push(`${id}'s chance ${t.p} or price ${t.dec} is not the builder's sums on its legs' Elo chances (${e.p}, ${e.d}), or its floor ${floor} is not kept (likeliest ${!!t.likeliest})`);
        else if (C.length <= 8) { const r = eloRuleOwn(C.map(c => ({ ...c.l, pe: c.pe })), n, floor); if (!r || r.k !== t.legs.map(legId).sort().join(',')) bad.push(`${id} is not the rule's answer over every parlay of ${n} of the ${C.length} candidates: ${t.legs.map(l => l.name).join(', ')} where the rule gives ${r ? r.k : 'none'}`); } });
      return bad; };
    const eloLevelsHeld = (lab, u, T, o) => { const G = unitGames(u), gids = new Set(G.map(g => g.id)), C = eloCandsOwn(G), LV = ELO_LV_OWN();
      if (!Array.isArray(T) || T.map(t => t && t.id).join() !== LV.map(x => x[0]).join()) { chk(false, `${lab}, ${u.id}: the unit's Elo picks are not its four levels, elo-safe to elo-xtrm: ` + JSON.stringify((T || []).map(t => t && t.id))); return; }
      const plId = qualOwn(SPU, G, { read: false }).plId; let bad;
      if (!u.slot || G.length < 2) bad = eloUnitBad(G, C, T, LV, `in ${unitWhere(u)}`, plId, unitPulled(u));
      else {
        /* (app v121) the Sunday slot of two games or more: each game's own four, as the page builds a night game's (its
           eloUnit on the game alone), held to the rule on that game's candidates, and each level of the slot one of them,
           the best by the rule worked out here (eloSlotPickOwn); empty only where every game's is, saying so of any one
           game: none of them has as many candidates, or one has and no that many of them go together on DraftKings' slip */
        bad = []; const per = G.map(x => ({ x, C: eloCandsOwn([x]), T: ((typeof w.eloUnit === 'function' && w.eloUnit([x.id], { where: 'in this game' })) || {}).tiers }));
        for (const P of per) { if (!Array.isArray(P.T) || P.T.length !== 4) { bad.push(`its game ${P.x.id}'s own Elo picks are not four levels`); continue; }
          bad.push(...eloUnitBad([P.x], P.C, P.T, LV, null, plId, '').map(b => `its game ${P.x.id}'s own ${b}`)); }
        const most = Math.max(0, ...per.map(P => P.C.length)), sig = r => r && r.legs && r.legs.length ? r.legs.map(legId).join(',') + '|' + r.p + '|' + r.dec : 'none';
        T.forEach((t, i) => { const [id, , n] = LV[i], levels = per.map(P => P.T && P.T[i]), k = eloSlotPickOwn(levels), want = k < 0 ? null : levels[k];
          if (sig(t) !== sig(want)) bad.push(`the slot's ${id} is not the best of its games' own ${id} by the slot's rule: ${t.legs && t.legs.length ? t.legs.map(l => l.gid + ' ' + l.name).join(', ') : t.why} where the rule gives ${want ? per[k].x.id + ': ' + want.legs.map(l => l.name).join(', ') : 'none'}`);
          else if (!want) { const why = !plId ? null : most >= n ? `No ${n} players in any one game of the Sunday slot go together on DraftKings’ slip: it takes no quarterback’s passing TDs with a teammate’s touchdown.`
              : `Only ${most} player${most === 1 ? '' : 's'} in any one game of the Sunday slot qualif${most === 1 ? 'ies' : 'y'}: this level takes ${n}.`;
            if (why ? t.why !== why : !(typeof t.why === 'string' && t.why.startsWith('No player ') && t.why.endsWith(`in the Sunday slot yet: ${unitPulled(u)}.`))) bad.push(`the slot's ${id} is empty and says "${t.why}"${why ? `, not "${why}"` : ', not when its player prices come'}`); } }); }
      if (o && o.cands != null && o.cands !== C.length) bad.push(`the page counts ${o.cands} candidates where the rule makes ${C.length}`);
      chk(!bad.length, `${lab}, ${u.id}: the unit's Elo picks are not the ELO tab's rule on its own games (${C.length} candidates): ` + bad.slice(0, 3).join('; '));
      /* the same with the Parlay Builder's ticks planted to nothing */
      if (o && o.ticks) { const Sx = w.eval('S'), keepU = JSON.stringify(Sx.ui.pb), sig = R => JSON.stringify(((R && R.tiers) || []).map(t => t.legs && t.legs.length ? [t.id, t.legs.map(legId), t.p, t.dec] : [t.id, t.why])), was = sig(w.eval('spEloSet')(u.id));
        try { Sx.ui.pb = { k: { ml: false, ats: false, total: false, over: false, under: false }, off: [...new Set(w.eval('pbGames()').map(g => g.id).concat([...gids]))], gx: false };
          const now = sig(w.eval('spEloSet')(u.id));
          chk(now === was, `${lab}, ${u.id}: with every game unticked and both player sides off on the Parlay Builder tab the unit's Elo picks are not the same: ${now.slice(0, 200)} / ${was.slice(0, 200)}`); }
        finally { Sx.ui.pb = JSON.parse(keepU); } } };
    /* a prime-time game's set (and, app v118, the Sunday slot's: a unit) as the page builds it, held to the rules on that
       unit's own legs (qualOwn on every bet type, whatever the Parlay Builder's boxes say), and as the tab draws it: its
       heading (a night game's teams and night; the slot's week, games and window), when it locks (2 hours before its
       kickoff, the slot's first, said in Eastern time), each level a card with its legs, each leg's own Add, the set's
       Add to builder and Finish, or why it is empty, then its Elo picks (blocksHeld, eloLevelsHeld). Safe, the likeliest
       pair, is worked out in full on the unit's own legs with two legs together computed here (pairOwn), since a set's
       legs are one game's and move together (app v121: the Sunday slot's too, each level the best of its games' own
       levels by the slot's rule, slotPickOwn, each game's own set held as a night game's is). (app v112) vis: whether
       the night rule (nightOwn) sets the game out now (the slot's own rule for the slot). Every prime-time game's set is
       held to the rules (the props job's record takes them all, shown or not); one the rule hides is not on the tab at
       all, no card, leg, Add or Finish of it, and its levels cannot be finished from the tab (spTier) */
    const hiddenHeld = (lab, g) => { const el = spOf(g.id), any = d.querySelector(`#spSets [data-sp-add^="${g.id}:"], #spSets [data-pc-finish^="sp|${g.id}:"]${g.slot ? '' : `, #spSets [data-pb-leg^="${g.id}|"]`}`), fin = PB_TIERS_OWN.flatMap(id => [id, 'elo-' + id]).filter(id => w.eval('spTier')(`${g.id}:${id}`) != null);
      chk(!el && !any && !fin.length, `${lab}, ${g.id}: the ${g.slot ? 'slot\'s rule' : 'night rule'} hides its set until ${isoOwn((g.slot ? g.open : nightOwn(primeHere(), w.eval('S').sched, w.eval('Date.now()')).open) || 0)}, and the tab draws it, a leg or a button of it, or a level of it can still be finished (${fin.join(', ') || 'none'})`); };
    const holdSet = (lab, g, vis = true) => { if (w.eval('Date.now()') >= unitLock(g)) return holdLocked(lab, g, vis);
      const G = unitGames(g);
      const s = w.eval('spSet')(g.id), el = spOf(g.id), q = qualOwn(SPU, G);
      /* (app v121) every level is one game's legs, held to that game's own rules: a night game's its own, and each game of
         the Sunday slot its own (qualOwn on that game alone), as the page builds each of the slot's games' sets as it builds
         a night game's */
      const QG = new Map(G.map(x => [x.id, G.length === 1 ? q : qualOwn(SPU, [x])]));
      chk(!!s && s.tiers.map(t => t.id + t.n).join() === 'safe2,med3,aggr4,xtrm5', `${lab}, ${g.id}: the set is not Safe 2, Medium 3, Aggressive 4, Extreme 5`);
      if (!s) return 0;
      const lockOwn = unitLock(g), lk = el && el.querySelector(':scope > [data-sp-phase]');
      if (!vis) { if (!g.slot) chk(w.eval('spLockAt')(g) === lockOwn, `${lab}, ${g.id}: its set's lock is not 2 hours before kickoff, ${etSay(lockOwn)}`); hiddenHeld(lab, g); }
      else {
        chk((!!g.slot || w.eval('spLockAt')(g) === lockOwn) && !!el && !!lk && lk.dataset.spPhase === 'live' && txt(lk) === `Locks ${etSay(lockOwn)}, 2 hours before ${g.slot ? 'the first kickoff' : 'kickoff'}.`,
          `${lab}, ${g.id}: the set does not say it locks at ${etSay(lockOwn)}, 2 hours before ${g.slot ? 'the first kickoff' : 'kickoff'}: ${lk ? lk.dataset.spPhase + ' ' + txt(lk) : 'no set drawn'}`);
        chk(headHeld(el, g), `${lab}, ${g.id}: the set is not headed ${g.slot ? 'with its week, its games and their window' : `with its game and its night (${nightOf(g)})`}, an h4 that names the group: ${el ? txt(el.querySelector('.sp-hd')) : 'none'}`);
        blocksHeld(lab, g, { phase: 'live' }, el); }
      /* one level of game x's legs, held to the rules on x's own legs (qx) and, where it is drawn (c), as its card in unit g */
      const tierHeld = (lab2, x, t, c) => { const qx = QG.get(x.id), all = [...qx.pref, ...qx.thin], allM = [...all, ...qx.mkt];
        const ownSet = new Map(allM.map(l => [legId(l), l])), thinOf = new Set(qx.thin.map(legId)), mktOf = new Set(qx.mkt.map(legId)), prefOf = new Set(qx.pref.map(legId));
        holdTier(lab2, t, { pref: qx.pref, thin: qx.thin }, l => l.gid === x.id);
        chk(t.legs.every(l => ownSet.has(legId(l)) && !!l.thin === thinOf.has(legId(l)) && !!l.market === mktOf.has(legId(l))), `${lab2}: the ${t.id} level holds a leg the rules do not let a suggestion take, or keeps one thin or a total wrongly: ` + t.legs.filter(l => !ownSet.has(legId(l))).map(l => l.name + ' ' + l.label).join(', '));
        /* Safe: no pair of the game's legs with as many from the preferred list lands likelier, two legs worked out here
           (never a pair DraftKings refuses: fitsF) */
        if (!t.floor && !t.mkt) { const kMin = [0, 1, 2].find(k => maxFitOwn(qx.pref) >= 2 - k && maxFitOwn(all) >= 2), need = 2 - kMin, cand = capOwn(qx.pref).concat(capOwn(qx.thin));
          let best = -1, bl = null; for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) { const a = cand[i], b = cand[j];
            if (!fitsF([a], b) || [a, b].filter(y => !thinOf.has(legId(y))).length < need) continue; const pj = pairOwn(a, b, rhoF(a, b)); if (pj > best) { best = pj; bl = [a, b]; } }
          const mine = pairOwn(t.legs[0], t.legs[1], rhoF(t.legs[0], t.legs[1]));
          chk(t.thin === t.legs.filter(l => l.thin).length && t.legs.filter(l => !l.thin).length >= need && Math.abs(t.corr - mine) < 0.012 && mine >= best - 0.015,
            `${lab2}: Safe lands ${(mine * 100).toFixed(1)}% worked out here (${(t.corr * 100).toFixed(1)}% shown) where ${bl ? bl.map(l => l.name + ' ' + l.label).join(' + ') : 'no pair'} land ${(best * 100).toFixed(1)}%: it is not the likeliest pair on the game's legs`); }
        /* the card: its legs each with its own Add (44px, named for the leg), its rule, the fair chance first,
           Add to builder and Finish named for the unit, no lock (a set the night rule hides has no card: above) */
        if (!c) return;
        const lis = [...c.querySelectorAll('.pb-legs li')], P = w.eval('S').parlay, inB = l => { const y = P[l.key]; return !!y && y.k === l.k && y.side === l.side && !!y.main === !!l.main; };
        const ab = c.querySelector(`[data-sp-add="${g.id}:${t.id}"]`), fb = c.querySelector(`[data-pc-finish="sp|${g.id}:${t.id}"]`), what = `the ${t.label} ${/^elo-/.test(t.id) ? 'Elo pick' : 'parlay'} for ${unitWhat(g)}`;
        chk(c.dataset.pbTier === t.id && lis.length === t.n && t.legs.every((l, i) => { const b = lis[i].querySelector('button[data-pb-leg]');
            return nmOk(lis[i].querySelector('.nm'), l) && !!b && b.dataset.pbLeg === l.key && +b.dataset.k === +l.k && b.dataset.side === l.side && b.getAttribute('aria-label') === addName(l, inB(l)) && txt(b) === (inB(l) ? 'Added' : 'Add') && w.getComputedStyle(b).minHeight === '44px'; })
          && !!ab && !!fb && /^(Add|In the builder:) the /.test(ab.getAttribute('aria-label') || '') && (ab.getAttribute('aria-label') || '').includes(what) && fb.getAttribute('aria-label') === 'Finish ' + what && !c.querySelector('[data-pb-lock], [data-pb-turn], [data-pb-reset]'),
          `${lab2}: the ${t.id} card does not show its legs, each with its own 44px Add named for it, and Add to builder and Finish named for ${what}`);
        /* (app v121) a card of the Sunday slot names its game under its title, right after the legs' count and before its
           rule ("Seahawks at Broncos · Sun 4:25 PM ET"), and a night game's card names none (its unit's heading does) */
        chk(tgameHeld(c, g.slot ? x : null), `${lab2}: the ${t.id} card ${g.slot ? `does not name its game, "${tgameOwn(x, TN)}", in its title after the legs' count` : 'names a game in its title, which only the Sunday slot\'s cards do'}: ${txt(c.querySelector('.pb-th'))}`);
        /* (app v112) the reversed tags: Value on each of its legs that is a Value pick (the preferred list, worked
           out here: qualOwn's pref) and on no other, no thin edge or no edge anywhere. (app v113, the owner's call of
           17 October 2026: "in suggest parlays, get rid of all the long paragraph description stuff") A set's level
           draws no line under it saying why a leg is not a Value pick or why the game's total is there, whatever it
           holds (pbTierCard's quiet; the cards drawn as the retired Elo picks' section drew theirs keep theirs, held on
           cards of the smoke's own below); the est. line (a price that is an estimate) and a ruled-out player's Updated
           line stay */
        { const bad = [];
          t.legs.forEach((l, i) => { const mk = lis[i] ? [...lis[i].querySelectorAll('i.pb-valmark')] : [], val = prefOf.has(legId(l));
            if (mk.length !== (val ? 1 : 0) || (val && (txt(mk[0]) !== 'Value' || !mk[0].closest('.nm small')))) bad.push(`${l.name} ${l.label} ${val ? 'is a Value pick and is not marked Value' : 'is not a Value pick and is marked Value'}`); });
          if (OLD_TAG.test(txt(c)) || c.querySelector('.pb-thinmark')) bad.push('the card still says thin edge or no edge: ' + (txt(c).match(/.{0,40}(thin[ -]edge|no edge).{0,30}/i) || [''])[0]);
          const nT = t.legs.filter(l => thinOf.has(legId(l))).length, nM = t.legs.filter(l => mktOf.has(legId(l))).length;
          const lines = [...c.querySelectorAll('p.pb-thin')].filter(p => !p.classList.contains('pb-espnline') && !p.classList.contains('sp-upd')).map(txt);
          if (lines.length || WHY_GONE.test(txt(c))) bad.push(`it holds ${nT} legs that are not Value picks and ${nM} totals, and draws the line${lines.length === 1 ? '' : 's'} saying why: ${JSON.stringify(lines.length ? lines : [(txt(c).match(WHY_GONE) || [''])[0]])}`);
          chk(!bad.length, `${lab2}: the ${t.id} card does not mark Value exactly its Value picks, or still says why a leg is not one or why a total is there: ` + bad.slice(0, 3).join('; ')); }
        { const first = c.querySelector('.pb-nums > div'), qq = y => first && first.querySelector(y), F = t.fair, pc = v => (v * 100).toFixed(0) + '%', rule = c.querySelector('.pb-rule'), rest = c.cloneNode(true);
          rest.querySelectorAll('.pb-legs, .pb-thin, .pb-rule, .pb-tgame').forEach(y => y.remove());
          chk(!!first && first.classList.contains('pb-chance') && (F && F.p != null ? txt(qq('b')) === pc(F.p) && txt(qq('span')) === (F.est ? 'fair chance, est.' : 'fair chance') && txt(qq('small')) === `model says ${pc(t.corr)}`
            : txt(qq('b')) === pc(t.corr) && txt(qq('small')) === 'no fair chance: a leg has no book price')
            && !!rule && txt(rule) === ruleFor(t) && ![...c.querySelectorAll('p')].some(p => !p.classList.contains('pb-thin')) && !/floor|usual|below|short of|of the time|%\+(?!\d)/i.test(txt(rest)),
            `${lab2}: the ${t.id} card does not lead with its fair chance beside the model's under its rule "${ruleFor(t)}", or carries a note: ${first ? txt(first) : 'no figures'} / ${rule ? txt(rule) : ''}`); } };
      /* (app v121) the Sunday slot: each of its games' own set as the page builds it (spSet on the game), every level of it
         held as a night game's level is, on that game's own legs (nothing of it drawn), and empty only where that game does
         not make that many legs with no pair DraftKings refuses (maxFitOwn); the slot's level is one of them, the best by
         the rule worked out here (slotPickOwn), and empty only where every game's is */
      const per = g.slot ? G.map(x => ({ x, s: w.eval('spSet')(x.id) })) : null;
      if (per) for (const { x, s: sx } of per) {
        chk(!!sx && sx.tiers.map(t => t.id + t.n).join() === 'safe2,med3,aggr4,xtrm5', `${lab}, ${g.id}: its game ${x.id}'s own set is not Safe 2, Medium 3, Aggressive 4, Extreme 5`);
        if (sx) for (const t of sx.tiers) { const qx = QG.get(x.id), mx = maxFitOwn([...qx.pref, ...qx.thin, ...qx.mkt]);
          if (t.legs) tierHeld(`${lab}, ${g.id}, its game ${x.id}'s own set`, x, t, null);
          else chk(mx < t.n, `${lab}, ${g.id}: its game ${x.id}'s own ${t.id} level is empty though the game's legs make ${mx} of its ${t.n} with no pair DraftKings refuses: ${t.why}`); } }
      let built = 0;
      s.tiers.forEach((t, ti) => { const c = el && el.querySelector(`:scope > .pb-tiers[data-sp-kind="model"] > .pb-tier.${t.id}`);
        if (per) { const levels = per.map(P => P.s && P.s.tiers[ti]), k = slotPickOwn(levels, t.floor), want = k < 0 ? null : levels[k], sig = r => r && r.legs ? r.legs.map(legId).join(',') + '|' + r.corr + '|' + r.dec : 'none';
          chk(sig(t) === sig(want) && (!t.legs || t.legs.every(l => l.gid === per[k].x.id)),
            `${lab}, ${g.id}: the slot's ${t.id} level is not the best of its games' own ${t.id} levels by the slot's rule (one game's legs, a parlay before none, no total before one, its floor met before the likeliest, the fewer thin legs, then the better return or chance, the earlier game on a tie): ${t.legs ? t.legs.map(l => l.gid + ' ' + l.name + ' ' + l.label).join(', ') : t.why} where the rule gives ${want ? per[k].x.id + ': ' + want.legs.map(l => l.name + ' ' + l.label).join(', ') : 'none'}`); }
        if (!t.legs) {
          /* why it is empty: none of its legs (a night game), or none of any one of its games (the slot), make that many,
             or they do and no parlay of them that many is one DraftKings takes */
          const ms = G.map(x => { const qx = QG.get(x.id); return maxOwn([...qx.pref, ...qx.thin, ...qx.mkt]); }), m = Math.max(0, ...ms), where = g.slot ? 'any one game of the Sunday slot' : 'this game';
          const fit = Math.max(0, ...G.map(x => { const qx = QG.get(x.id); return maxFitOwn([...qx.pref, ...qx.thin, ...qx.mkt]); }));
          const what = m < t.n ? `${m ? `Only ${m} leg${m === 1 ? '' : 's'}` : 'No legs'} in ${where}` : `No ${t.n}-leg parlay in ${where}`;
          const tail = q.plId ? (g.slot ? 'a parlay takes one game’s legs, one leg a player, and one side and one total a game.' : 'a parlay takes one leg a player, and one side and one total a game.') : (g.slot ? unitPulled(g) : pulledOwn(g));
          /* (app v121, the review's round) where its player prices are in (before them, the words on when they come, as
             before) and the game (on the slot, some one game) makes legs enough in number for the level and no that many
             of them that go together on DraftKings' slip, it says that, in words of its own: "No 4 of this game’s legs go
             together on DraftKings’ slip: ...", the slot's "No 5 legs of any one game of the Sunday slot go together ..." */
          const clash = q.plId && m >= t.n && fit < t.n;
          const said = clash ? (g.slot ? `No ${t.n} legs of any one game of the Sunday slot go together on DraftKings’ slip: ${CLASH_WHY_OWN}` : `No ${t.n} of this game’s legs go together on DraftKings’ slip: ${CLASH_WHY_OWN}`) : null;
          chk(fit < t.n && typeof t.why === 'string' && (clash ? t.why === said : t.why.startsWith(what) && (q.plId ? t.why.endsWith(tail) : t.why.includes(tail))) && (!vis || (!!c && c.classList.contains('none') && txt(c.querySelector('.pb-why')) === t.why && !c.querySelector('.pb-tgame'))),
            `${lab}, ${g.id}: the ${t.id} level is empty though the ${g.slot ? 'legs of one of the slot\'s games' : 'game\'s legs'} make ${fit} of its ${t.n} with no pair DraftKings refuses, or it does not say so (${clash ? `"${said}": ${m} legs by count, ${fit} that go together` : `"${what}" ... "${tail}"`})${q.plId ? '' : ', with when its player prices (and DraftKings\' ids) come'}: ${t.why}`);
          return; }
        built++;
        const x = g.slot ? (G.find(y => y.id === t.legs[0].gid) || g) : g;
        chk(t.legs.every(l => l.gid === x.id), `${lab}, ${g.id}: the ${t.id} level is not one game's legs: ` + t.legs.map(l => l.gid).join(', '));
        tierHeld(`${lab}, ${g.id}`, x, t, vis ? (c || null) : null);
        if (vis && !c) chk(false, `${lab}, ${g.id}: the ${t.id} level is not drawn`); });
      /* (app v118) its Elo picks, live: the ELO tab's rule on its games alone (app v121: the slot's on each of its games
         alone, each level the best of theirs), drawn as the page's spEloSet has them */
      if (vis) { const e = w.eval('spEloSet')(g.id), eu = typeof w.eloUnit === 'function' ? w.eloUnit(G.map(x => x.id), { where: `in ${unitWhere(g)}`, perGame: !!g.slot }) : null;
        eloLevelsHeld(lab, g, e && e.tiers, { cands: eu ? eu.candidates : null, ticks: true });
        eloCardsHeld(lab, g, e && e.tiers, el, false); }
      return built; };
    /* a unit's Elo picks as its cards draw them (app v118: in the unit, with the ELO tab's card options, window.eloCardOpt):
       each level its card, with legs in the builder's order, each leg's Elo chance, its own 44px Add named for it (none
       under way), no Value mark, a shield where its player is ranked this season, the Elo chance (the fair chance first,
       "Elo says" beside it), its price and how it was chosen; an empty level why */
    const eloCardsHeld = (lab, u, T, el, under) => { const box = el && el.querySelector(':scope > .pb-tiers[data-sp-kind="elo"]'), bad = [], pc = v => (v * 100).toFixed(0) + '%', P = JSON.parse(ELO_P).players || {};
      if (!Array.isArray(T)) return; if (!box) { chk(false, `${lab}, ${u.id}: the unit's Elo picks are not drawn`); return; }
      const ruleOf = t => t.likeliest || !t.floor ? (t.n === 2 ? 'the likeliest pair' : `the likeliest ${t.n} legs`) : `best value that lands ${Math.round(t.floor * 100)}%+ by Elo`;
      for (const t of T) { const c = box.querySelector(`:scope > .pb-tier.${t.id}`); if (!c) { bad.push(`${t.id} not drawn`); continue; }
        if (!t.legs || !t.legs.length) { if (!c.classList.contains('none') || txt(c.querySelector('.pb-why')) !== t.why || c.querySelector('.pb-tgame')) bad.push(`${t.id} is empty and does not say why: ${txt(c)}`); continue; }
        /* (app v121) the slot's Elo picks are each one game's, the card naming it; a night game's names none */
        { const gx = u.slot ? unitGames(u).find(x => x.id === t.legs[0].gid) : null;
          if (u.slot && (!gx || t.legs.some(l => l.gid !== gx.id))) bad.push(`${t.id} is not one game's legs of the slot: ${t.legs.map(l => l.gid).join(', ')}`);
          else if (!tgameHeld(c, gx)) bad.push(`${t.id} ${gx ? `does not name its game, "${tgameOwn(gx, TN)}", in its title` : 'names a game, which only the Sunday slot\'s cards do'}: ${txt(c.querySelector('.pb-th'))}`); }
        if (clashPairsOwn(t.legs).length) bad.push(`${t.id} holds a pair DraftKings will not take on one slip: ${clashTxt(t.legs)}`);
        const lis = [...c.querySelectorAll('.pb-legs > li')], first = c.querySelector('.pb-nums > div'), F = t.fair;
        if (lis.length !== t.legs.length || t.legs.some((l, i) => { const b = lis[i].querySelector('button[data-pb-leg]'), em = lis[i].querySelector('.pr em'), sh = lis[i].querySelector('.nm .pe-badge');
            return !nmOk(lis[i].querySelector('.nm'), l) || txt(em) !== pc(l.pe) || lis[i].querySelector('.pb-valmark') || !!sh !== !!(P[l.pid] && P[l.pid].rank && P[l.pid].se != null)
              || (under ? !!b : !b || b.dataset.pbLeg !== l.key || b.dataset.side !== l.side || +b.dataset.k !== +l.k || !/^(Add|Remove) /.test(b.getAttribute('aria-label') || '') || w.getComputedStyle(b).minHeight !== '44px'); }))
          bad.push(`${t.id}'s legs are not its legs with their Elo chances, their Adds and shields: ${lis.map(x => txt(x.querySelector('.nm'))).join(', ')}`);
        if (!first || (F && F.p != null ? txt(first.querySelector('b')) !== pc(F.p) || txt(first.querySelector('small')) !== `Elo says ${pc(t.p)}` : txt(first.querySelector('b')) !== pc(t.p)))
          bad.push(`${t.id} does not lead with the fair chance, the Elo's beside it: ${first ? txt(first) : 'no figures'}`);
        if (txt(c.querySelector('.pb-nums > div:nth-child(2) b')) !== w.eval(`fmtML(decToML(${t.dec}))`) || [...c.querySelectorAll('.pb-rule')].map(txt).join('|') !== ruleOf(t) || +(c.querySelector('[data-pb-pay]') || { dataset: {} }).dataset.pbPay !== t.dec)
          bad.push(`${t.id}'s price or rule is not its own: ${txt(c.querySelector('.pb-th'))} ${txt(c.querySelector('.pb-nums'))}`); }
      chk(!bad.length, `${lab}, ${u.id}: the unit's Elo picks are not drawn as their levels: ` + bad.slice(0, 3).join('; ')); };
    /* a prime-time game past its lock (2 hours before its kickoff, by the page's clock) is drawn as the set it
       locked, from the record or, with none there, as this browser built it and keeps it (the lock's own rules
       are held on made-up games at clocks of their own: the audit's M10 and the reload below): here the phase
       and its line, the heading, and each level as it is shown, its legs one game's in different lines, one a
       player and one side and one total, none on a player the page's rules hold out (suggestable, which the
       audit's V6 holds to the sources), its chance and price the builder's own sums on its legs, each leg's own
       Add and the level's Add to builder and Finish; or why it is empty. So the smoke holds at any hour,
       between a Thursday, Sunday or Monday night game's lock and its kickoff too. (app v112) A game at its lock is
       always on the tab by the night rule (its night's morning has come, and every night before it has kicked
       off); one the rule worked out here hides is held to be off the tab, and its set is not built for it. (app v118)
       The Sunday slot the same (its legs on its games, one side and one total a game), and from its first kickoff under
       way: its levels as they locked, with nothing to add or finish and no level the card can finish (spTier); its
       Elo picks as kept, each level on the unit's games, its chance and price the builder's sums on its legs' Elo chances */
    const holdLocked = (lab, g, vis = true) => { if (!vis) { hiddenHeld(lab, g); return 0; }
      const lockOwn = unitLock(g), el = spOf(g.id), lk = el && el.querySelector(':scope > [data-sp-phase]'), v = w.eval('spShown')(g), gl = `${lab}, ${g.id}`, G = unitGames(g), gids = new Set(G.map(x => x.id));
      const under = !!g.slot && w.eval('Date.now()') >= g.first;
      /* (app v113) one short line: "Locked since Sun 6:20 PM ET.", and where the set is this browser's own, that it is and
         that the record does not grade it; (app v118) the Sunday slot under way, since when */
      chk(!!el && !!lk && v.phase === 'locked' && !!v.under === under && lk.dataset.spPhase === (under ? 'under' : v.own ? 'own' : 'locked')
        && txt(lk) === `Locked since ${etSay(lockOwn)}.${under ? ` Under way since ${etSay(g.first)}.${v.none ? ' The site’s set was not published in time.' : v.own ? OWN_LINE : ''}` : v.own ? OWN_LINE : ''}` && !!lk.querySelector('.sp-lockmark'),
        `${gl}: past its lock the set is not drawn as locked since ${etSay(lockOwn)}${under ? ', under way since ' + etSay(g.first) : ''}: ${v.phase} ${lk ? lk.dataset.spPhase + ' ' + txt(lk) : 'no set drawn'}`);
      chk(headHeld(el, g), `${gl}: the locked set is not headed ${g.slot ? 'with its week, its games and their window' : 'with its game and its night'}`);
      blocksHeld(lab, g, v, el);
      /* (app v118) under way with no set of the site's and none kept in this browser: nothing of the page's own, no card */
      if (under && v.none) { chk(v.tiers === null && v.elo === null && !el.querySelector('.pb-tier'), `${gl}: under way with no set of the site's, the page drew a set of its own`); return 0; }
      const T = v.tiers || [], ok = w.eval('suggestable'), P = w.eval('S').parlay, inB = l => { const x = P[l.key]; return !!x && x.k === l.k && x.side === l.side && !!x.main === !!l.main; }; let built = 0;
      chk(T.map(t => t && t.id + t.n).join() === 'safe2,med3,aggr4,xtrm5', `${gl}: the locked set is not Safe 2, Medium 3, Aggressive 4, Extreme 5`);
      for (const t of T) { const c = el && el.querySelector(`:scope > .pb-tiers[data-sp-kind="model"] > .pb-tier.${t.id}`);
        if (!t.legs) { chk(!!c && c.classList.contains('none') && txt(c.querySelector('.pb-why')) === t.why && t.why.length > 10, `${gl}: the locked ${t.id} level is empty and does not say why`); continue; }
        built++;
        const sd = t.legs.filter(l => isG(l) && l.stat !== 'total'), tt = t.legs.filter(l => l.stat === 'total'), pl = t.legs.filter(l => !isG(l));
        chk(t.legs.length === t.n && new Set(t.legs.map(l => l.key)).size === t.n && t.legs.every(l => gids.has(l.gid)) && new Set(sd.map(l => l.gid)).size === sd.length && new Set(tt.map(l => l.gid)).size === tt.length && new Set(pl.map(l => l.pid)).size === pl.length,
          `${gl}: the locked ${t.id} level is not ${t.n} different lines of the ${g.slot ? 'slot\'s games' : 'game'}, one a player and one side and one total a game`);
        /* (app v121) one game's legs, the Sunday slot's too, with no pair DraftKings refuses, and a card of the slot
           naming its game in its title (a night game's naming none) */
        { const gx = G.find(x => x.id === t.legs[0].gid);
          chk((!g.slot || (!!gx && t.legs.every(l => l.gid === gx.id))) && !clashPairsOwn(t.legs).length && (!c || tgameHeld(c, g.slot ? gx || null : null)),
            `${gl}: the locked ${t.id} level is not one game's legs, holds a pair DraftKings will not take on one slip (${clashTxt(t.legs) || 'none'}), or its card does not name its game as the slot's cards do: ${t.legs.map(l => l.gid).join(', ')} / ${c ? txt(c.querySelector('.pb-th')) : 'not drawn'}`); }
        /* before the first kickoff no level holds a player the rules hold out (one ruled out since the lock is built again);
           under way (the Sunday slot from its first kickoff) none is built again, as the record replaces none after it: a
           level the page built again carries a time before the first kickoff, and every other is the record's own, or this
           browser's kept, as they stand */
        if (!under) chk(pl.every(l => ok(l.pid)), `${gl}: the locked ${t.id} level holds a player the page's rules hold out, and was not built again: ` + pl.filter(l => !ok(l.pid)).map(l => l.name).join(', '));
        else { const kept = (() => { try { const K = JSON.parse(w.localStorage.getItem('props_sp_lock_v1') || 'null'); return K && K.games && K.games[g.id]; } catch (e) { return null; } })();
          const src = v.ledger ? (w.eval('spLedgerOf')(g) || {}).tiers : kept && kept.tiers, was = src && src.find(x => x && x.id === t.id), sig = ls => (ls || []).map(l => [l.gid, l.pid, l.stat, l.side, l.k].join('|')).sort().join(',');
          chk(t.updated ? (t.updated.by !== 'page' || Date.parse(t.updated.at) < g.first) : !!was && sig(was.legs) === sig(t.legs),
            `${gl}: under way, the ${t.id} level is not the one it locked (or a replacement made before its first kickoff): ` + (t.updated ? JSON.stringify(t.updated) : `${sig(t.legs)} against ${was ? sig(was.legs) : 'nothing kept'}`)); }
        chk(w.eval('parlayProb')(t.legs).corr === t.corr && w.eval('parlayDec')(t.legs.map(l => ({ leg: l, ml: l.price }))) === t.dec, `${gl}: the locked ${t.id} level's chance or price is not the builder's sums on its legs`);
        const lis = c ? [...c.querySelectorAll('.pb-legs li')] : [], what = `the ${t.label} ${/^elo-/.test(t.id) ? 'Elo pick' : 'parlay'} for ${unitWhat(g)}`, p = c && c.querySelector('[data-pb-pay]');
        chk(!!c && lis.length === t.n && t.legs.every((l, i) => { const b = lis[i].querySelector('button[data-pb-leg]');
            return nmOk(lis[i].querySelector('.nm'), l) && (under ? !b : !!b && b.dataset.pbLeg === l.key && +b.dataset.k === +l.k && b.dataset.side === l.side && b.getAttribute('aria-label') === addName(l, inB(l)) && w.getComputedStyle(b).minHeight === '44px'); })
          && (under ? !c.querySelector('[data-sp-add], [data-pc-finish], .pb-acts') : !!c.querySelector(`[data-sp-add="${g.id}:${t.id}"]`) && (c.querySelector(`[data-pc-finish="sp|${g.id}:${t.id}"]`) || { getAttribute: () => '' }).getAttribute('aria-label') === 'Finish ' + what) && !!p && +p.dataset.pbPay === t.dec,
          `${gl}: the locked ${t.id} card does not show its legs, ${under ? 'with nothing to add or finish under way, and its price' : `each with its own 44px Add named for it, its price, and Add to builder and Finish named for ${what}`}`);
        /* (app v112) Value on each locked leg that was a Value pick when it was taken (kept thin false, no total) and on no other */
        chk(!!c && t.legs.every((l, i) => { const mk = lis[i] ? [...lis[i].querySelectorAll('i.pb-valmark')] : [], val = l.thin === false && !l.market; return mk.length === (val ? 1 : 0) && (!val || txt(mk[0]) === 'Value'); }) && !OLD_TAG.test(txt(c))
          && ![...c.querySelectorAll('p.pb-thin')].some(p => !p.classList.contains('pb-espnline') && !p.classList.contains('sp-upd')) && !WHY_GONE.test(txt(c)),
          `${gl}: the locked ${t.id} card does not mark Value exactly the legs kept as Value picks, or still says thin edge or no edge, or why a leg is not a Value pick or a total is there (app v113)`); }
      /* its Elo picks as kept: each level on the unit's games, different players, its chance and price the builder's sums
         on its legs' Elo chances, drawn as its card */
      if (Array.isArray(v.elo)) { const bad = [];
        for (const t of v.elo) { if (!t || !t.legs || !t.legs.length) continue; const e = eloSumsOwn(t.legs);
          if (t.legs.length !== t.n || new Set(t.legs.map(l => l.pid)).size !== t.n || t.legs.some(l => !gids.has(l.gid) || !(l.pe > 0 && l.pe < 1)) || Math.abs(t.p - e.p) > 1e-12 || Math.abs(t.dec - e.d) > 1e-9) bad.push(`${t.id}: ${t.legs.map(l => l.gid + ' ' + l.name + ' ' + l.pe).join(', ')} at ${t.p}, ${t.dec} (the sums ${e.p}, ${e.d})`);
          /* (app v121) one game's legs, and no pair DraftKings refuses */
          else if (new Set(t.legs.map(l => l.gid)).size !== 1 || clashPairsOwn(t.legs).length) bad.push(`${t.id} is not one game's legs, or holds a pair DraftKings will not take on one slip: ${t.legs.map(l => l.gid + ' ' + l.name).join(', ')} ${clashTxt(t.legs)}`); }
        chk(v.elo.map(t => t && t.id).join() === PB_TIERS_OWN.map(id => 'elo-' + id).join() && !bad.length, `${gl}: the locked unit's Elo picks are not its four levels on its own games at the builder's sums on their Elo chances: ` + bad.slice(0, 2).join('; '));
        eloCardsHeld(lab, g, v.elo, el, under); }
      if (under) { const fin = PB_TIERS_OWN.flatMap(id => [id, 'elo-' + id]).filter(id => w.eval('spTier')(`${g.id}:${id}`) != null);
        chk(!fin.length, `${gl}: the Sunday slot under way still lets the card finish ${fin.join(', ')}`); }
      return built; };
    const capOwn = list => { if (list.length <= 60) return list; const by = f => [...list].sort((a, b) => (f(b) - f(a)) || legId(a).localeCompare(legId(b))), keep = new Map();
      for (const c of [...by(c => c.p).slice(0, 30), ...by(c => c.p * decOwn(c.price)).slice(0, 30)]) keep.set(legId(c), c); return [...keep.values()]; };
    const openSp = async () => { tabBtn('suggest').click(); await wait(80); };
    const openPb = async () => { tabBtn('parlay').click(); await wait(40); };
    const primeHere = () => w.eval('pbGames()').filter(primeOwn);
    /* (app v112) the night the tab sets out now, by the rule worked out here (nightOwn) on the page's clock */
    const shownHere = () => nightOwn(primeHere(), w.eval('S').sched, w.eval('Date.now()'));
    /* (app v118) the Sunday slot the tab is on now, by the rule worked out here (slotNextOwn), on the page's clock */
    const slotHere = () => slotNextOwn(w.eval('PAY.sched').map(g => g.w), w.eval('S').sched, w.eval('Date.now()'), +w.eval('SEASON'));
    /* every prime-time game of the week still to come is the page's spGames (the record takes them all); the tab
       sets out the next night's alone once its morning has come, and says when where it has not; each game's set
       held to the rules, and as drawn where it is shown. (app v118) In the Night games section; and in the Sunday slot's
       section the slot by its own rule, its set and its Elo picks held where it is up, its wait line where it is not */
    const holdSets = async lab => { await openSp(); const G = primeHere(), N = shownHere(), on = N.on.map(g => g.id), U = slotHere(); let n = 0;
      const drawnIds = [...d.querySelectorAll(`${SEC_NIGHT} .sp-game[data-sp-game]`)].map(x => x.dataset.spGame);
      chk(w.eval('spGames()').map(g => g.id).join() === G.map(g => g.id).join(), `${lab}: the page's prime-time games (spGames) are not the week's Thursday, Sunday and Monday night games still to come (${G.map(g => g.id).join(', ') || 'none'}): ` + w.eval('spGames()').map(g => g.id).join(', '));
      chk(drawnIds.join() === on.join() && w.eval('spOn()').map(g => g.id).join() === on.join(),
        `${lab}: Suggested Parlays does not set out exactly the next prime-time night's games once its morning has come (${on.join(', ') || (N.games.length ? 'none until ' + isoOwn(N.open) + ', then ' + N.games.map(g => g.id).join(', ') : 'none')}): ` + (drawnIds.join(', ') || 'none drawn'));
      { const wh = waitHeld(d, N, w.eval('S').sched, TN); chk(!wh, `${lab}: the wait line for the next night is not as the rule has it: ` + wh); }
      { const sh = slotWaitHeld(d, U, w.eval('S').sched, liveWeekOwn(w.eval('PAY.sched').map(g => g.w), w.eval('S').sched, w.eval('Date.now()')), w.eval('seasonOver()'));
        const su = w.eval('spSlotNext()');
        chk(!sh && (U ? !!su && su.id === U.id && su.games.map(g => g.id).join() === U.games.map(g => g.id).join() && !!su.up === !!U.up : !su),
          `${lab}: the Sunday slot is not as its rule has it (${U ? `${U.id}, ${U.games.map(g => g.id).join(' ')}, ${slotPhaseOwn(U, w.eval('Date.now()'))}` : 'none to come'}): ` + (sh || `the page's spSlotNext is ${su ? su.id + ' ' + su.games.map(g => g.id).join(' ') + (su.up ? ' up' : ' not up') : 'none'}`)); }
      /* a game the rule hides, on the tab as it is: no card, leg or button of it, and none of its levels finished */
      const hid = G.filter(g => !on.includes(g.id));
      for (const g of hid) hiddenHeld(lab, g);
      if (U && !U.up) hiddenHeld(lab, U);
      if (!G.length) chk(/^No Thursday, Sunday or Monday night game of week \d+ is still to kick off\./.test(txt(d.querySelector(`${SEC_NIGHT} > p.pb-none`))), `${lab}: with no prime-time game to come the Night games section does not say so: ` + txt(d.querySelector(SEC_NIGHT)).slice(0, 160));
      /* no word of the retired tags on the tab */
      const noOld = how => { const sx = txt(d.getElementById('spSets')), hx = txt(d.getElementById('spHead'));
        chk(!OLD_TAG.test(sx) && !OLD_TAG.test(hx) && !spPanel.querySelector('.pb-thinmark'), `${lab}${how}: Suggested Parlays still says thin edge or no edge: ` + (txt(spPanel).match(/.{0,60}(thin[ -]edge|no edge).{0,40}/i) || [''])[0]);
        /* (app v113) and none of its long paragraphs: no lead, no foot, no record sentence, no line under a level saying
           why a leg is not a Value pick or a total is there, no long lock line; (app v118) nor the retired Elo picks
           section's lead, in a unit or anywhere on the tab */
        const PAR = '#spHead .pb-lead, #spHead p.muted, #spSets .pb-foot, .sp-rec .sp-rec-line, .sp-rec p, #spPanel .pb-lead';
        chk(!WHY_GONE.test(sx) && !WHY_GONE.test(hx) && !spPanel.querySelector(PAR) && !/Players whose Elo matchup beats the book/.test(txt(spPanel)),
          `${lab}${how}: Suggested Parlays still draws one of its long paragraphs (the lead, the foot, the record's sentence, a level's why-line, a long lock line or the Elo picks' lead): ` + ((sx + ' ' + hx).match(new RegExp('.{0,60}(' + WHY_GONE.source + ').{0,40}')) || [spPanel.querySelector(PAR) ? 'a paragraph drawn' : txt(spPanel).match(/.{0,40}Players whose Elo matchup.{0,40}/) ? 'the Elo picks\' lead' : ''])[0]); };
      noOld('');
      /* (app v121) a game named in a card's title on the Sunday slot's cards alone */
      { const stray = [...d.querySelectorAll('.pb-tgame')].filter(e => !e.closest(`${SEC_SLOT} .sp-game.sp-slot .pb-tier > .pb-th`));
        chk(!stray.length, `${lab}: a card outside the Sunday slot names a game in its title: ` + stray.map(e => txt(e.closest('.pb-tier') || e)).slice(0, 2).join(' / ')); }
      /* then every prime-time game's set held to the rules and as drawn, its cards, legs, Adds, Finish, Value marks,
         the lines under a level, the fair chance first and its rule, at every hour as before the night rule: where
         the rule hides a game now, the tab's one question of which games it sets out (spOn) is stood in by every
         prime-time game for these checks (its own slot, put back whatever happens), the rule itself held above on
         the tab as it is. The Sunday slot only where its rule sets it out (it is held at every moment on made-up
         games of its own, below) */
      const slotN = () => U && U.up ? holdSet(lab, U, true) : 0;
      if (!hid.length || w.eval('typeof spOn') !== 'function') { for (const g of G) n += holdSet(lab, g, on.includes(g.id)); return n + slotN(); }
      w.__spOnHold = w.eval('spOn');
      try { w.eval('spOn=function(){ return spGames(); }; SP_SHOWN=null; renderSp()'); await wait(40);
        chk([...d.querySelectorAll(`${SEC_NIGHT} .sp-game[data-sp-game]`)].map(x => x.dataset.spGame).join() === G.map(g => g.id).join(), `${lab}: with spOn stood in by every prime-time game the tab does not draw them all (${G.map(g => g.id).join(', ')})`);
        for (const g of G) n += holdSet(lab, g, true);
        noOld(', every prime-time game drawn');
        console.log(`  (${lab}: ${hid.map(g => g.id).join(', ')} not on the tab by the night rule now: spOn stood in for ${hid.length === 1 ? 'its' : 'their'} cards' checks)`); }
      finally { w.eval('spOn=window.__spOnHold; delete window.__spOnHold; SP_SHOWN=null; renderSp()'); await wait(20); }
      return n + slotN(); };
    /* spOn stood in by every prime-time game (all) or put back: the one place the tab asks which games it sets out,
       so a check that needs the cards of a game the night rule hides (the rule itself held on the published week and
       on made-up games at clocks of their own) may stand it in */
    const SP_ON_REAL = w.eval('typeof spOn') === 'function' ? w.eval('spOn') : null;
    const standOn = all => { w.__spOnReal = SP_ON_REAL; w.eval(all ? 'spOn=function(){ return spGames(); }' : 'spOn=window.__spOnReal'); w.eval('SP_SHOWN=null; renderSp()'); };
    holdSetF = holdSet; SPH = { blocksHeld, headHeld, eloLevelsHeld, eloCardsHeld, eloSumsOwn, eloCandsOwn, eloRuleOwn, eloIn, holdLocked, unitGames, ELO_LV_OWN, SPU };
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
        /* and no box at all: the list says to tick one */
        d.querySelector('#pbPanel [data-pb-kind="ml"]').click(); await wait(20);
        chk(KINDS.every(k => !U().k[k]) && !panel.querySelector('ol.pb-top li') && /^No bet types ticked/.test(txt(panel.querySelector('.pb-top-none'))), 'with no bet type ticked the Top 30 lines draw a line, or do not say to tick one');
        d.querySelector('#pbPanel [data-pb-mix="all"]').click(); await wait(20); }
      /* one game ticked: every leg from it */
      d.querySelector('#pbPanel [data-pb-games="none"]').click(); await wait(20);
      chk(w.eval('getPbTiers()').tiers.every(t => !t.legs && /No games ticked/.test(t.why)) && !panel.querySelector('ol.pb-top li') && /^No games ticked/.test(txt(panel.querySelector('.pb-top-none'))),
        'None did not leave every tier, and the Top 30 lines, saying no game is ticked');
      d.querySelector(`#pbPanel [data-pb-game="${games[0].id}"]`).click(); await wait(20);
      hold('one game');
      d.querySelector('#pbPanel [data-pb-games="all"]').click(); await wait(20);

      /* ---- Suggested Parlays (#suggest, app v111, the owner's calls of 16 October 2026), on the week as it is
         published: its own tab after Props, headed with its Refresh odds, a set of four parlays for each game of the
         week still to come that kicks off on a Thursday, Sunday or Monday at or after 7:00 pm Eastern (worked out here
         on its own, primeOwn), each its own game's legs alone; (app v118, the owner's calls of 19 October 2026) in two
         sections, Night games and the Sunday slot, each headed by its own record, each unit's Elo picks under its
         model parlays (no section of their own at the tab's foot any more) ---- */
      { await openSp();
        chk(!d.getElementById('tab-suggest').hidden && d.getElementById('tab-parlay').hidden && w.location.hash === '#suggest' && txt(d.querySelector('#tabs button[aria-selected="true"]')) === 'Suggested Parlays',
          'the Suggested Parlays tab did not open, or did not become the address #suggest');
        const card = d.getElementById('spCard'), head = d.getElementById('spHead'), sets = d.getElementById('spSets'), sb = head && head.querySelector('[data-espn-refresh="week"]'), sst = sb && d.getElementById(sb.getAttribute('aria-describedby'));
        chk(!!spPanel && d.getElementById('tab-suggest').firstElementChild === spPanel && !!card && [...card.children].length === 2 && card.firstElementChild === head && head.nextElementSibling === sets
          && !d.getElementById('pbElo') && !d.getElementById('spRec') && !d.querySelector('[data-pb-elo-add], [data-pc-finish^="elo|"], [data-pb-elo-wait]')
          && txt(head.querySelector('h2')) === 'Suggested Parlays' && !!sb && w.getComputedStyle(sb).minHeight === '44px' && !!sst && sst.getAttribute('aria-live') === 'polite',
          'Suggested Parlays is not its head (its heading, a 44px Refresh odds with its status line) over its sets, or still draws the Elo picks\' own section (#pbElo), their own buttons or the record in its head (#spRec)');
        /* (app v113, the owner's call of 17 October 2026: "in suggest parlays, get rid of all the long paragraph
           description stuff. we dont need to clutter the page.") Its head is its heading and Refresh odds with its
           status line, and nothing else: no lead (until then it said one night is shown at a time and what a leg marked
           Value is); (app v118) the record is no longer there but at the head of each section */
        { const kids = [...head.children], hd = kids[0];
          chk(kids.length === 2 && hd.matches('.pb-hd') && txt(hd.querySelector('h2')) === 'Suggested Parlays' && txt(hd.querySelector('.pill')) === `week ${liveWeekOwn(w.eval('PAY.sched').map(g => g.w), w.eval('S').sched, w.eval('Date.now()'))}` && kids[1].matches('.pb-row.pb-odds-row.sp-odds')
            && txt(kids[1].querySelector('.pb-lbl')) === 'Odds' && !head.querySelector('.pb-lead, p, .sp-rec') && !WHY_GONE.test(txt(head)),
            'the head of Suggested Parlays is not its heading, its week and Refresh odds alone: ' + kids.map(x => x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + '.' + x.className).join(' ') + ' / ' + txt(head).slice(0, 200)); }
        /* (app v118) the two sections, in order, each its heading, then its record (hidden only with no record and no
           backtest: both files are read here, so drawn), then its units or its one line */
        { const secs = [...sets.children], bad = [];
          if (secs.map(x => x.tagName.toLowerCase() + '.' + x.className + '[' + x.dataset.spSec + ']').join(' ') !== 'section.sp-sec[night] section.sp-sec[slot]') bad.push('its sections are ' + secs.map(x => x.tagName + ' ' + x.className + ' ' + x.dataset.spSec).join(', '));
          for (const [sec, name] of [['night', 'Night games'], ['slot', 'Sunday slot']]) { const el = secs.find(x => x.dataset.spSec === sec); if (!el) continue;
            const k = [...el.children], h3 = k[0], rec = k[1], rest = k.slice(2);
            if (!h3 || !h3.matches('h3.sp-sech') || txt(h3) !== name || h3.id !== 'spsec-' + sec || el.getAttribute('aria-labelledby') !== 'spsec-' + sec) bad.push(`the ${sec} section is not headed "${name}" (an h3 that names it): ${h3 ? txt(h3) : 'nothing'}`);
            if (!rec || !rec.matches(`div.sp-rec[data-sp-recsec="${sec}"]`) || rec.hidden) bad.push(`the ${sec} section's record is not right under its heading, drawn`);
            if (!rest.length || !rest.every(x => x.matches('.sp-game[data-sp-game]')) && !(rest.length === 1 && rest[0].matches('p.pb-none'))) bad.push(`the ${sec} section's body is ${rest.map(x => x.tagName + '.' + x.className).join(', ') || 'nothing'}, not its units or one line`);
            if (sec === 'night' && rest.some(x => x.classList.contains('sp-slot'))) bad.push('the Night games section draws the Sunday slot');
            if (sec === 'slot' && rest.some(x => x.matches('.sp-game:not(.sp-slot)'))) bad.push('the Sunday slot section draws a night game'); }
          chk(!bad.length, 'Suggested Parlays is not its two sections, Night games and the Sunday slot, each its heading, its record and its units or one line: ' + bad.join('; ')); }
        /* the card's switch, on cards of the smoke's own (pbTierCard, as the page's callers call it): a level holding
           a leg that is not a Value pick and the game's total, and a leg priced from DraftKings' line read on ESPN, with
           a player ruled out after the lock. Drawn without quiet (as the retired Elo picks' section drew theirs until app
           v118), the lines saying why the leg is not a Value pick and why the total is there; drawn as a set's (quiet),
           and (app v118) as a unit's Elo picks are (the ELO tab's card options, quiet), neither, and the est. line and the
           Updated line on all three */
        { const gx = { id: '2099_01_A90_H90', w: 1 }, base = { gid: gx.id, week: 1, side: 'over', main: false, src: 'real', mu: null, grp: 'WR', pos: 'WR', team: 'H90', opp: 'A90' };
          const L = [{ ...base, key: gx.id + '|SM-W1|receptions', pid: 'SM-W1', stat: 'receptions', k: 4, p: 0.6, price: -110, name: 'Card Value', label: '4+ receptions', thin: false, market: false },
            { ...base, key: gx.id + '|SM-W2|receiving_yards', pid: 'SM-W2', stat: 'receiving_yards', k: 50, p: 0.55, price: -110, name: 'Card Thin', label: '50+ receiving yards', thin: true, market: false },
            { ...base, key: gx.id + '|game|total', pid: 'game', stat: 'total', k: 47.5, p: 0.5, price: -110, name: 'Game total', label: 'Over 47.5', grp: 'TEAM', pos: 'Game', thin: false, market: true },
            { ...base, key: gx.id + '|SM-W3|receptions', pid: 'SM-W3', stat: 'receptions', k: 3.5, main: true, p: 0.56, price: 105, src: 'dkline', name: 'Card Est', label: 'Over 3.5 receptions', thin: false, market: false,
              espn: { at: '2099-01-01T12:00Z', fair: 0.48, tested: true, listed: true } }];
          const T0 = { id: 'aggr', label: 'Aggressive', n: 4, floor: 0.12, legs: L, corr: 0.1, dec: 12, thin: 1, mkt: 1, fair: null, updated: { pid: 'SM-W4', name: 'Card Out', reason: 'Out on the report', at: '2099-01-01T15:00:00Z' } };
          const draw = o => { try { const box = d.createElement('div'); box.innerHTML = w.eval('pbTierCard')(T0, o); return box; } catch (e) { return null; } };
          const why = box => box ? [...box.querySelectorAll('p.pb-thin')].filter(p => !p.classList.contains('pb-espnline') && !p.classList.contains('sp-upd')).map(txt) : null;
          const eloC = draw({ chance: 0.1, kind: 'sp', what: 'the Elo picks', add: `data-sp-add="${gx.id}:elo-aggr"`, rule: '<span class="pb-rule">best value that lands 12%+ by Elo</span>' });
          const setC = draw({ kind: 'sp', fid: gx.id + ':aggr', add: `data-sp-add="${gx.id}:aggr"`, what: 'A90 at H90', quiet: true, mktWhy: 'this game’s other legs do not make a parlay of this size' });
          const unitC = typeof w.eloCardOpt === 'function' ? draw({ ...w.eloCardOpt({ ...T0, id: 'elo-aggr', p: 0.1 }), kind: 'sp', fid: gx.id + ':elo-aggr', add: `data-sp-add="${gx.id}:elo-aggr"`, what: 'A90 at H90', quiet: true }) : null;
          const we = why(eloC), ws = why(setC), wu = why(unitC), side = box => box && box.querySelectorAll('p.pb-espnline').length === 1 && txt(box.querySelector('p.sp-upd')) === `Updated: Card Out Out on the report (${etSay(Date.parse(T0.updated.at))}); this level was built again.`;
          chk(!!we && we.length === 2 && we[0].startsWith('One leg is not a Value pick: the model rates it at or above the book\'s price, but not 3 points above') && we[1] === 'The game total is at the book’s own chance with its margin out, so it is not a Value pick: it is here because your picks’ other legs do not make a parlay of this size.'
            && !!ws && ws.length === 0 && !WHY_GONE.test(txt(setC)) && !!wu && wu.length === 0 && !WHY_GONE.test(txt(unitC)) && side(eloC) && side(setC) && side(unitC),
            'a level\'s card drawn without quiet does not say why a leg is not a Value pick and why the total is there, or drawn as a set\'s or a unit\'s Elo picks (quiet) it still does, or one loses the est. line or the Updated line: ' + JSON.stringify({ loud: we, set: ws, elo: wu, upd: setC ? txt(setC.querySelector('p.sp-upd')) : null })); }
        /* the prime-time rule on made-up rows: Thursday, Sunday and Monday at or after 7:00 pm Eastern; not a
           Saturday night, a Sunday or Thanksgiving day game, a Monday at 6:59 pm, or a Friday (Christmas) night */
        const rule = w.eval('spPrime'), rows = [['2026-10-15', '20:15', true], ['2026-10-18', '20:20', true], ['2026-10-19', '19:00', true], ['2026-10-19', '18:59', false], ['2026-10-17', '20:00', false],
          ['2026-10-18', '16:25', false], ['2026-11-26', '16:30', false], ['2026-11-26', '20:20', true], ['2026-12-25', '20:15', false], ['2026-10-18', '09:30', false]];
        const wrong = rows.filter(([dd, tt, want]) => rule({ d: dd, t: tt }) !== want || primeOwn({ d: dd, t: tt }) !== want), sch = Sx.sched.filter(g => rule(g) !== primeOwn(g));
        chk(!wrong.length && !sch.length, 'the page\'s prime-time rule is not a Thursday, Sunday or Monday kickoff at or after 7:00 pm Eastern: ' + wrong.map(x => x.join(' ')).concat(sch.slice(0, 3).map(g => g.id + ' ' + g.d + ' ' + g.t)).join(', '));
        const n = await holdSets('this week, as published');
        { const N = shownHere(), U = slotHere(); console.log(`  (Suggested Parlays on the published week: ${primeHere().map(g => g.id).join(', ') || 'no prime-time game to come'}, ${N.on.length ? N.on.map(g => g.id).join(', ') + ' on the tab' : N.games.length ? 'none on the tab until ' + isoOwn(N.open) : 'none on the tab'}; the Sunday slot ${U ? `${U.id} (${U.games.length} games), ${slotPhaseOwn(U, w.eval('Date.now()'))}` : 'none to come'}; ${n} levels built)`); }
        await openPb(); }
      /* made-up lines on every starter (each a few points off his own projection), a made-up total of 44.5 on
         every game with none posted (a week the payload has no lines for yet: a clock far past the bake, the
         off-season replay, where weeks 8 to 18 of a mid-October payload have no total) and a price on every
         other total, so the tiers, and the totals' checks, are built on any day of the week; then Add to
         builder and Finish on one of them */
      const keepPay = w.eval('JSON.stringify({m:PAY.mkt[String(currentWeek())]||null,t:S.sched.map(g=>[g.tov,g.tou])})');
      w.eval(`(function(){ const cw=currentWeek(), M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{}); let J=0;
        window.__totPlanted=[];
        pbGames().forEach((g,gi)=>{ if(g.tot==null||!isFinite(g.tot)){ window.__totPlanted.push({g,had:Object.prototype.hasOwnProperty.call(g,'tot'),v:g.tot}); g.tot=44.5; }
          if(gi%2===0){ g.tov=-105; g.tou=-115; }
          const ro=rosterFor(g,false); for(const tm in ro) ro[tm].players.forEach((x,i)=>{ if(!x.starter) return;
            for(const l of statLines(x)){ if(l.prob||!(l.mu>2)) continue;
              /* one line in three priced so the book's fair chance on the model's side is 25 points under the
                 model's (far off the market), one 6 points under (an edge), the rest -112/-108 */
              const ln=(i%2?Math.floor(l.mu*1.25):Math.floor(l.mu*0.8))+0.5, kind=(J++)%3; let over=-112, under=-108;
              if(kind<2){ const pO=pOver(x.pl.grp,l.stat,l.mu,ln), ov=pO>=0.5, ps=ov?pO:1-pO, fs=Math.max(0.05,Math.min(0.9,ps-(kind===0?0.25:0.06))), fo=ov?fs:1-fs;
                over=probToAmerican(fo*1.03); under=probToAmerican((1-fo)*1.03); }
              ((M[x.pl.id]??={})[l.stat])={line:ln,over,under,n:x.pl.n,g:g.id}; } }); });
        PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); renderParlay(); })()`);
      /* (app v109) the made-up lines have no DraftKings id (the payload's ids name its own lines at its own
         numbers), and where the payload carries ids a level takes only a leg with one: a fixture of made-up
         ids in place of the payload's table, one under every priced leg's own key and each side of every
         total, so the levels are built on the made-up lines as before; put back with the rest below */
      const keepDkM = w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)');
      { const on = w.eval('pbGames()'), tl = w.eval('totalLeg');
        const legs = [...w.eval('pricedLegs')(on), ...on.flatMap(g => ['over', 'under'].map(s => tl(g, s)).filter(Boolean))];
        w.eval(`PAY.dk=${JSON.stringify(dkFixture(legs, new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'MU'))}; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()`); }
      await wait(60);
      const built = hold('made-up lines');
      chk(built >= 2, 'with a made-up line on every starter, fewer than two tiers were built');
      /* far off the market: the legs the model rates 15 points or more above their fair chance are out of
         the pool, the list and every level, the panel says how many and why, and one is flagged on its game page */
      { const fo = fairRule(w), FAR = w.eval('FAR_OFF'), isFar = l => { const f = fo(l); return !!f && l.p - f.p >= FAR - 1e-9; };
        const on = w.eval('pbGames()'), pool = w.eval('pbPool')(on), mlP = w.eval('mlProb');
        const left = w.eval('pricedLegs')(on).filter(c => w.eval('pbAllows')(c) && takenRule(w)(c) && c.p >= 0.45 && c.p < 0.97 && c.p - mlP(c.price) >= 0 && isFar(c));
        chk(left.length > 0 && pool.far === left.length && [...pool.pref, ...pool.thin].every(c => !isFar(c)) && [...pool.pref, ...pool.thin].some(c => !isG(c)),
          `the made-up lines left ${left.length} legs far off the market where the pool counts ${pool.far}, or one is in the pool, or no player leg is left in it`);
        chk(txt(panel).includes(`${left.length} line${left.length === 1 ? ' is' : 's are'} left out: the model rates ${left.length === 1 ? 'it' : 'each'} 15 points or more above the book’s fair chance`) && /still on the game pages, flagged far off the market/.test(txt(panel)),
          'the panel does not say how many lines it left out far off the market and why: ' + ((txt(panel).match(/\d+ lines? (is|are) left out[^.]*\./) || ['nothing'])[0]));
        const farL = w.eval('pricedLegs')(on).filter(l => l.main && !isG(l) && isFar(l)).sort((a, b) => String(a.key + a.side).localeCompare(String(b.key + b.side)))[0];
        if (farL) { const keepUi = w.eval('JSON.stringify({game:S.ui.game,open:S.ui.open,rungs:S.ui.showRungs})');
          w.eval(`S.ui.showRungs=false; S.ui.game=${JSON.stringify(farL.gid)}; S.ui.open={[${JSON.stringify(farL.pid)}]:true}; renderGame()`); await wait(20);
          const f = fo(farL), want = `${farL.side === 'under' ? 'Under' : 'Over'} ${farL.k} model ${Math.round(farL.p * 100)}% · market ${Math.round(f.p * 100)}%: far off the market`;
          const notes = [...d.querySelectorAll('#gameView p.faroff[data-far]')].map(txt);
          chk(notes.includes(want) && !!d.querySelector('#gameView tr.far'), `the game page does not flag ${farL.name}'s far-off line as "${want}": ${notes.join(' / ') || 'no flag'}`);
          w.eval(`(function(){ const k=${keepUi}; S.ui.game=k.game; S.ui.open=k.open||{}; S.ui.showRungs=k.rungs; closeGameModal(); })()`); await wait(20); } }
      /* (app v109) suggestions only from legs DraftKings' slip can take, on the fixture's ids. One game's
         player ids taken out: none of its player legs is left in the levels' lines, the list, a level or its
         game page's hands, and the panel says how many lines it left out, why (a line read by Refresh odds
         carries no id, and DraftKings' own come with its prices) and when player prices are pulled. Every
         player id taken out: the list and the levels have no player legs and say so, and with Players only
         every level is empty and says why. With no ids at all (a payload baked before them) every leg is taken
         as it always was. The pool's lists are capped, so a count is held to at least the legs the check saw go */
      { const on = w.eval('pbGames()'), poolF = () => w.eval('pbPool')(on), DK0 = JSON.parse(w.eval('JSON.stringify(PAY.dk)'));
        const plIn = p => [...p.pref, ...p.thin].filter(c => !isG(c)), keyOf = l => l.key + '|' + l.side + '|' + l.k, keys = p => [...p.pref, ...p.thin, ...(p.mkt || [])].map(keyOf).sort().join();
        const setDk = async o => { w.eval(`${o === null ? 'delete PAY.dk' : 'PAY.dk=' + JSON.stringify(o)}; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()`); await wait(30); };
        const cutPl = (o, gid) => { for (const wk2 in o) for (const id in o[wk2]) if (!gid || id === gid) for (const k of Object.keys(o[wk2][id])) if (!/^(team:|game\|)/.test(k) && !['at', 'glat', 'event'].includes(k)) delete o[wk2][id][k]; return o; };
        const PULLED_W = 'pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET)';
        const noteOf = re => (pbOwnTxt(panel).match(re) || [''])[0];
        const pool0 = poolF(), k0 = keys(pool0), x0 = plIn(pool0)[0], gX = x0 ? Sx.sched.find(g => g.id === x0.gid) : null;
        chk(pool0.noId === 0 && pool0.noIdPl === 0 && !/betslip can take/.test(pbOwnTxt(panel)), `with a made-up id on every leg the panel still leaves ${pool0.noId} out for want of one, or says so`);
        if (!gX) chk(false, 'with made-up lines on every starter no player leg is in the levels\' lines, so none can be taken out for want of an id');
        else {
          const hand0 = w.eval('gameLegPool')(gX), lost = plIn(pool0).filter(c => c.gid === gX.id).length;
          await setDk(cutPl(JSON.parse(JSON.stringify(DK0)), gX.id));
          const p1 = poolF(), r1 = w.eval('getPbTiers()'), hand1 = w.eval('gameLegPool')(gX), note = noteOf(/\d+ lines? (is|are) left out: the list takes only lines DraftKings’ betslip can take[^]*?to the builder\./);
          chk(!plIn(p1).some(c => c.gid === gX.id) && r1.tiers.every(t => !t.legs || t.legs.every(l => isG(l) || l.gid !== gX.id)) && [...p1.pref, ...p1.thin].every(ownId),
            `with ${gX.id}'s player ids taken out, a player leg of its is still in the levels' lines or a level`);
          holdTop(`with ${gX.id}'s player ids taken out`, U(), on);
          /* (every key of his game but its game lines is gone, so none of them is at another number either) */
          chk(lost > 0 && p1.noId >= lost && p1.noIdPl === p1.noId && p1.moved === 0, `with ${gX.id}'s player ids taken out the pool counts ${p1.noId} legs left out for want of an id (${p1.noIdPl} players', ${p1.moved} at another number) where at least ${lost} went, all players' and none at another number`);
          /* (where his game is the only one with player prices, as on a Monday night with one game left, the
             panel says instead that no player line can go on the slip yet, as with every id out below) */
          const lone = !qualOwn(U(), on).plId, nLone = noteOf(/No player line on your picks can go on DraftKings’ betslip yet[^]*?\(before 4pm ET\)\./);
          if (lone) chk(!panel.querySelector('ol.pb-top li') || (nLone.startsWith('No player line on your picks can go on DraftKings’ betslip yet, so the list below has no player lines: ') && nLone.includes(PULLED_W)),
            `with ${gX.id}, the only game with player prices, without its player ids, the panel does not say no player line can go on DraftKings' betslip yet, and when they are pulled: "${nLone || txt(panel).slice(0, 200)}"`);
          else chk(note.startsWith(`${p1.noId} line${p1.noId === 1 ? ' is' : 's are'} left out: the list takes only lines DraftKings’ betslip can take, by DraftKings’ own id at the line`)
            && note.includes('A player’s line read by Refresh odds carries no id') && note.includes(PULLED_W) && note.endsWith(`still on the game pages, where you can add ${p1.noId === 1 ? 'it' : 'them'} to the builder.`)
            && !/to add by hand|DraftKings had (it|them) only at another number/.test(pbOwnTxt(panel)),
            `the panel does not say how many lines it left out for want of a DraftKings id, why, and when player prices are pulled: "${note || txt(panel).slice(0, 200)}"`);
          chk(hand0.some(l => !isG(l)) ? hand1.every(ownId) && !hand1.some(l => !isG(l)) : hand1.every(ownId),
            `${gX.id}'s game page's hands keep a leg DraftKings has no id for at its line: ` + hand1.filter(l => !ownId(l)).map(l => l.name + ' ' + l.label).join(', '));
          /* a hand its game's lines would make but for DraftKings' ids counts the legs it left out for want of one
             (the engine's noId; the game page draws no hands since app v124), worked out from the pool with every leg */
          { const T1 = w.eval('GAME_TIER_CACHE={}; gameTiers')(gX), empty = ['high', 'med', 'low'].filter(id => !T1[id]), lostH = w.eval('gameLegPool')(gX, true).length - hand1.length;
            if (empty.length) {
              chk(T1.noId === lostH && lostH > 0, `with ${gX.id}'s player ids taken out, its hands do not count the legs DraftKings' betslip cannot take (${T1.noId} counted left out where ${lostH} are)`);
              console.log(`  (${gX.id} with its player ids taken out: ${empty.length} of its hands empty, each counting the legs left out for want of an id)`); }
            else console.log(`  (${gX.id} with its player ids taken out still fills every hand: the count of legs left out went untested)`); }
          /* every player id out */
          await setDk(cutPl(JSON.parse(JSON.stringify(DK0)), null));
          const p2 = poolF(), r2 = w.eval('getPbTiers()'), n2 = noteOf(/No player line on your picks can go on DraftKings’ betslip yet[^]*?\(before 4pm ET\)\./), rows2 = [...panel.querySelectorAll('ol.pb-top li [data-pb-leg]')];
          /* (a week of one or two games may make no level of team legs at all: then each level says why, the
             missing ids among it) */
          chk(!plIn(p2).length && p2.noIdPl > 0 && p2.noIdPl === p2.noId && r2.tiers.every(t => !t.legs || t.legs.every(isG)) && rows2.every(b => /\|(team:[A-Z]+\|(ml|ats)|game\|total)$/.test(b.dataset.pbLeg))
            && (rows2.length ? n2.startsWith('No player line on your picks can go on DraftKings’ betslip yet, so the list below has no player lines: ') && n2.includes(PULLED_W)
              && !/lines? (is|are) left out: the list takes only/.test(pbOwnTxt(panel))
              : r2.tiers.every(t => typeof t.why === 'string' && t.why.includes('no player legs DraftKings’ betslip can take yet') && t.why.includes(PULLED_W))),
            `with no player leg's id, the list and the levels are not built without player legs, or the panel does not say so once with when they are pulled: "${n2 || txt(panel).slice(0, 200)}"`);
          d.querySelector('#pbPanel [data-pb-mix="players"]').click(); await wait(20);
          const r3 = w.eval('getPbTiers()'), why3 = txt(panel.querySelector('.pb-top-none'));
          chk(r3.tiers.every(t => !t.legs && typeof t.why === 'string' && t.why.startsWith('No player legs DraftKings’ betslip can take yet: a player’s line read by Refresh odds carries no DraftKings id') && t.why.includes(PULLED_W))
            && !panel.querySelector('ol.pb-top li') && why3.startsWith('No player legs DraftKings’ betslip can take yet: ') && why3.includes(PULLED_W),
            'with Players only and no player leg\'s id, a level or a line is built, or it does not say it is empty for want of DraftKings\' ids, with when player prices are pulled: ' + r3.tiers.map(t => t.why || 'built').join(' / ') + ' / ' + why3);
          d.querySelector('#pbPanel [data-pb-mix="all"]').click(); await wait(20);
          /* a payload baked before ids: every leg as it always was */
          await setDk(null);
          const p4 = poolF();
          /* a game page's hands draw on lines of their own beyond the priced legs (a rung the fixture has no key
             for), so with no ids they hold at least what they held with an id on every priced leg */
          const hand4 = new Set(w.eval('gameLegPool')(gX).map(keyOf));
          chk(keys(p4) === k0 && p4.noId === 0 && hand0.every(l => hand4.has(keyOf(l))),
            'with no DraftKings ids in the payload (baked before them) the levels\' lines or a game page\'s hands are not what a made-up id on every leg gives: ' + JSON.stringify({ same: keys(p4) === k0, noId: p4.noId, lostHand: hand0.filter(l => !hand4.has(keyOf(l))).map(keyOf).slice(0, 3) }));
          await setDk(DK0); } }
      /* Game total alone, as the owner ticked it: every level the priced totals make legs for is
         built of totals only, and the list is the totals, each under Other lines and unmarked (a total is never
         a Value pick: app v112), the Value picks' heading saying there is none */
      { const keepK = JSON.stringify(U().k); for (const k of KINDS) U().k[k] = k === 'total'; w.eval('PB_CACHE=new Map(); renderParlay()'); await wait(40);
        const nT = new Set(w.eval('pbPool(pbGames())').mkt.map(l => l.gid)).size, rT = w.eval('getPbTiers()');
        hold('made-up lines, Game total alone');
        chk((nT >= 2 || games.length < 3) && rT.tiers.every(x => x.n > nT ? !x.legs : (!!x.legs && x.legs.every(l => l.market && l.stat === 'total') && x.mkt === x.n)),
          `with only Game total ticked, a level the totals make legs for was not built of totals alone (${nT} totals priced): ` + rT.tiers.map(x => x.why || x.legs.map(l => l.label).join('+')).join(' / '));
        { const lis = [...panel.querySelectorAll('ol.pb-top li')];
          chk(lis.every(li => !li.querySelector('.pb-valmark') && li.dataset.pbGrp === 'other' && !!li.closest('ol.pb-top[data-pb-sec="other"]') && !OLD_TAG.test(txt(li)) && /\|game\|total$/.test((li.querySelector('[data-pb-leg]') || { dataset: {} }).dataset.pbLeg || ''))
            && (!lis.length || (!!panel.querySelector('[data-pb-novalue]') && !panel.querySelector('ol.pb-top[data-pb-sec="value"]'))),
            'with only Game total ticked, a line on the list is not a game total under Other lines, unmarked, or the Value picks\' heading does not say there is none'); }
        Object.assign(U().k, JSON.parse(keepK)); w.eval('PB_CACHE=new Map(); renderParlay()'); await wait(40); }
      /* a line's own Add on the list: exactly that leg into the builder by the builder's own path (so it is
         priced as the builder prices it), the button Added and named to take it off, the focus kept on it
         through the redraw; a second press takes it off */
      { const keepP = w.eval('JSON.stringify(S.parlay)'); w.eval('S.parlay={}; save(); renderParlay()'); await wait(30);
        const b0 = panel.querySelector('ol.pb-top li [data-pb-leg]'), row = pbTopOwn(U(), games.filter(g => !U().off.includes(g.id)))[0];
        if (!b0 || !row) chk(false, 'with made-up lines on every starter the Top 30 lines are empty, so no line\'s Add can be pressed');
        else { const l = row.c; b0.focus(); b0.click(); await wait(40);
          const P = w.eval('S').parlay, x = P[l.key], b1 = panel.querySelector('ol.pb-top li [data-pb-leg]');
          chk(Object.keys(P).length === 1 && !!x && x.k === l.k && x.side === l.side && !!x.main === !!l.main && x.price === l.price && Math.abs(x.p - l.p) < 1e-9 && b1 && d.activeElement === b1
            && b1.getAttribute('aria-pressed') === 'true' && txt(b1) === 'Added' && b1.getAttribute('aria-label') === addName(l, true) && txt(pb).includes(l.name),
            `the Add on the first line (${l.name} ${l.label}) did not put exactly that leg in the builder at its price, or did not say it is in with the focus kept on it: ` + JSON.stringify(x && [x.k, x.side, x.price]));
          b1.click(); await wait(40);
          const b2 = panel.querySelector('ol.pb-top li [data-pb-leg]');
          chk(!w.eval('S').parlay[l.key] && !!b2 && txt(b2) === 'Add' && b2.getAttribute('aria-pressed') === 'false' && d.activeElement === b2, 'a second press of a line\'s Add did not take it off the builder, or lost the focus'); }
        /* the builder with a leg in it keeps its own Refresh odds */
        w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(30);
        if (!Object.keys(w.eval('S').parlay).length && row) { w.eval('toggleLeg')(row.c.key, row.c.k, Sx.sched.find(g => g.id === row.c.gid), row.c.side, !!row.c.main); await wait(20);
          chk(builderOdds(), 'the builder holding a leg has no 44px Refresh odds of its own with its status line'); w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(20); } }
      /* the sets on the made-up lines: every prime-time game's (one is made a Sunday night game where the week
         has none to come, its date and time put back after), each held as on the week as published */
      /* (a prime-time game past its lock, between it and its kickoff, is moved to the next Sunday night a day and
         more out with the rest of these checks, so the sets on the made-up lines are live whatever the hour) */
      const planted = (() => { const now = w.eval('Date.now()'), sun = () => { let t = now + 26 * 3600e3; while (new Date(t).getUTCDay() !== 0 || t < now + 26 * 3600e3) t += 3600e3; return new Date(t).toISOString().slice(0, 10); };
        const locked = primeHere().filter(g => now >= etKick(g) - 2 * 3600e3), why = locked.length ? 'past its lock' : 'no prime-time game to come this week';
        const G = locked.length ? locked : primeHere().length ? [] : w.eval('pbGames()').slice().sort((a, b) => etKick(b) - etKick(a)).slice(0, 1);
        if (!G.length) return null;
        const moved = G.map(g => { const was = { d: g.d, t: g.t }; g.d = sun(); g.t = '20:20'; return { g, was, why }; });
        w.eval('SP_CACHE=new Map(); PB_CACHE=new Map(); PB_TOP_CACHE=new Map()'); return moved; })();
      if (planted) console.log(`  (${planted.map(x => x.g.id).join(', ')} made a Sunday night game, ${planted[0].g.d}, for the sets' checks on made-up lines: ${planted[0].why})`);
      const builtSp = await holdSets('made-up lines');
      /* a set with a level of three legs or more, for the checks of a set's Add, the Bet amount, Add to builder and
         Finish: on the tab by the night rule where one is; where the night rule hides every such set now (the hours
         between a night's kickoff and the next night's morning), spOn stood in so those checks still run */
      const has3 = g => (w.eval('spSet')(g.id).tiers || []).some(t => t.legs && t.n >= 3), onNow = shownHere().on.map(g => g.id);
      let spGame = primeHere().filter(g => onNow.includes(g.id)).find(has3) || null, spStood = false;
      if (!spGame) { spGame = primeHere().find(has3) || null;
        if (spGame) { standOn(true); spStood = true; console.log(`  (${spGame.id}'s set is not on the tab by the night rule now (${onNow.join(', ') || 'none shown'}): spOn stood in for the checks of a set's Add, the Bet amount, Add to builder and Finish)`); } }
      const t = spGame ? w.eval('spSet')(spGame.id).tiers.filter(x => x.legs).slice(-1)[0] : null, fid = t ? `${spGame.id}:${t.id}` : null;
      chk(!!t, `with made-up lines on every starter no prime-time game's set has a level of three legs or more (${builtSp} levels built)`);
      /* a leg's own Add in a set, as on the list: that one leg, by the builder's own path */
      if (t) { const keepP = w.eval('JSON.stringify(S.parlay)'); w.eval('S.parlay={}; save(); renderParlay()'); await wait(30);
        const l = t.legs[t.legs.length - 1], sel = `#spPanel .sp-game[data-sp-game="${spGame.id}"] .pb-tier.${t.id} [data-pb-leg="${l.key}"][data-side="${l.side}"]`, b0 = d.querySelector(sel);
        if (b0) { b0.focus(); b0.click(); await wait(40); }
        const P = w.eval('S').parlay, x = P[l.key], b1 = d.querySelector(sel);
        chk(!!b0 && Object.keys(P).length === 1 && !!x && x.k === l.k && x.side === l.side && x.price === l.price && !!b1 && b1.getAttribute('aria-pressed') === 'true' && txt(b1) === 'Added' && d.activeElement === b1,
          `the Add on ${l.name} ${l.label} in ${spGame.id}'s ${t.label} did not put exactly that leg in the builder, or did not say so with the focus kept on it`);
        if (b1) { b1.click(); await wait(30); }
        chk(!w.eval('S').parlay[l.key], 'a second press of a set leg\'s Add did not take it off the builder');
        w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(30); }
      /* the Bet amount box, at the top of the Parlay Builder's controls: an amount of the visitor's own,
         which every set's level and the Elo picks pay on as it is typed, which a bad entry does not move,
         and which is kept as the builder's stake is */
      await openPb();
      const box = d.getElementById('pbStake'), stake0 = w.eval('S.stake');
      /* a level by the id its Finish names (unit:level, the Elo picks' elo-<level> among them since app v118), as the card
         finds it; a unit under way (the Sunday slot from its first kickoff) can finish none, so its levels as it shows them */
      const tierOf = id => { const tt = w.eval('spTier')(id); if (tt && tt.legs) return tt;
        const i = id.lastIndexOf(':'), u = i > 0 ? w.eval('spUnit')(id.slice(0, i)) : null, v = u ? w.eval('spShown')(u) : null;
        return v && v.under ? [...(v.tiers || []), ...(v.elo || [])].find(x => x && x.id === id.slice(i + 1) && x.legs) || null : null; };
      const paysAll = s => { const cards = [...d.querySelectorAll('#spPanel [data-pb-tier]')];
        return cards.length > 0 && cards.every(c => { const g2 = c.closest('[data-sp-game]'), tc = tierOf(g2 ? `${g2.dataset.spGame}:${c.dataset.pbTier}` : c.dataset.pbTier), p = c.querySelector('[data-pb-pay]');
          return !!tc && !!p && +p.dataset.pbPay === tc.dec && txt(p.querySelector('b')) === money(s * tc.dec) && txt(p.querySelector('span')) === amtTxt(s) + ' pays'; }); };
      const paysTxt = () => [...d.querySelectorAll('#spPanel .pb-nums div:last-child')].map(x => [...x.children].map(txt).join(' ')).join(' / ');
      chk(!!box && box.type === 'number' && box.getAttribute('inputmode') === 'decimal' && box.closest('.pb-row') === panel.querySelector('.pb-ctl > .pb-row') && box.value === String(stake0) && (!t || paysAll(stake0)),
        'the Parlay Builder has no Bet amount box at the top of its controls, showing the builder\'s stake that every set\'s level pays on: ' + (box ? box.outerHTML : 'no box') + ' / ' + paysTxt());
      if (box) {
        box.value = '35'; box.dispatchEvent(new w.Event('input'));
        chk(w.eval('S.stake') === 35 && (!t || paysAll(35)), 'typed $35 in the Bet amount box, the sets\' levels do not pay $35 times their price: ' + paysTxt());
        box.dispatchEvent(new w.Event('change')); await wait(20);
        for (const bad of ['', '-3', '0']) { const b = d.getElementById('pbStake'); b.value = bad; b.dispatchEvent(new w.Event('input')); b.dispatchEvent(new w.Event('change')); await wait(10);
          chk(w.eval('S.stake') === 35 && d.getElementById('pbStake').value === '35' && (!t || paysAll(35)) && !/NaN/.test(txt(panel) + txt(pb) + txt(spPanel)), `"${bad}" in the Bet amount box moved the amount off $35, or drew NaN: ` + paysTxt()); }
        await wait(400);
        chk(JSON.parse(w.localStorage.getItem(PROP_KEY)).stake === 35, 'the Bet amount is not saved with the prop model\'s state'); }
      const AMT = box ? 35 : stake0;
      if (t) await openSp();
      if (t && !d.querySelector(`#spPanel [data-sp-add="${fid}"]`)) chk(false, `${spGame.id}'s ${t.label} level, built on the made-up lines, is not drawn with its Add to builder, so its Add to builder and Finish cannot be pressed`);
      else if (t) {
        const addSel = `#spPanel [data-sp-add="${fid}"]`, finSel = `#spPanel [data-pc-finish="sp|${fid}"]`, gameW = `${spGame.a} at ${spGame.h}`;
        /* Add to builder: exactly the level's legs, and the builder prices them as the level did, on the amount in the box */
        const keepP = w.eval('JSON.stringify(S.parlay)');
        d.querySelector(addSel).focus(); d.querySelector(addSel).click(); await wait(60);
        const P = w.eval('S').parlay, q = w.PARLAY_CARD.quote();
        chk(Object.keys(P).length === t.n && t.legs.every(l => P[l.key] && P[l.key].k === l.k && P[l.key].side === l.side) && q && Math.abs(q.pr.corr - t.corr) < 1e-12 && Math.abs(q.useDec - t.dec) < 1e-9,
          'Add to builder did not put exactly the set level\'s legs in the builder at its chance and price');
        chk(!!q && q.stake === AMT && (d.getElementById('pStake') || {}).value === String(AMT) && Math.abs(q.payout - AMT * t.dec) < 1e-6 && txt(d.querySelector('#parlayBody .bigp .payout')) === '$' + (AMT * q.useDec).toFixed(2),
          `Add to builder did not carry the Bet amount: the builder is on ${q ? q.stake : 'nothing'} and pays ${q ? q.payout : '-'}, the level ${money(AMT * t.dec)} on ${amtTxt(AMT)}`);
        chk(/In the builder/.test(txt(d.querySelector(addSel))) && d.activeElement === d.querySelector(addSel), 'the set level does not say it is in the builder, or Add to builder lost the focus');
        { const hero = d.querySelector('#parlayBody .bigp .hero'), F = q && q.fair;
          chk(!!hero && !!F && (F.p != null ? Math.abs(F.p - t.fair.p) < 1e-12 && txt(hero.querySelector('b')) === (F.p * 100).toFixed(1) + '%' && txt(hero.querySelector('small')) === `model says ${(t.corr * 100).toFixed(1)}%`
            : txt(hero.querySelector('small')) === "no fair chance: it needs every leg's book price"),
            'the builder\'s summary after Add to builder does not lead with the level\'s fair chance, the model\'s beside it: ' + (hero ? txt(hero) : 'no summary')); }
        w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(40);
        /* the level's legs given DraftKings ids, made up (its lines are made up too, so the payload's own
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
        /* Finish: the parlay card for the level, named for its game, on the amount in the box, saving nothing */
        const n0 = w.eval('S.saved.length'), keys0 = JSON.stringify(Object.keys(w.localStorage).sort());
        const c0 = calls.length, fb = d.querySelector(finSel); fb.click(); await wait(40); await cardSettled(w);
        const view = d.getElementById('pcView'), cash = [...view.querySelectorAll('.pc-money b')].map(txt).join(' | ');
        { const bad = cardReads(calls.slice(c0).map(c => c.url), t.legs, id => { const x = w.eval('S').sched.find(y => y.id === id); return !x || w.eval('gameStarted')(x); });
          chk(!bad, `Finish on ${spGame.id}'s ${t.label} level: the card's check of DraftKings' lines did not read exactly its own game (its week's scoreboard), or read anything else: ` + bad); }
        chk(!d.getElementById('pcModal').hidden && txt(view).includes(`${t.label} parlay · ${gameW}`) && t.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label))
          && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t.dec}))`).replace('-', '−')
          && txt(view.querySelector('.pc-chance')).startsWith(t.fair && t.fair.p != null ? `Fair chance all ${t.n} land ${pct1(t.fair.p)}${t.fair.est ? ' (est.)' : ''} model says ${pct1(t.corr)} · the price says ` : `Model’s chance all ${t.n} land ${pct1(t.corr)} · the price says `),
          `Finish on ${spGame.id}'s ${t.label} does not open its card, "${t.label} parlay · ${gameW}", with its legs, price and chance: ` + txt(view).slice(0, 200));
        chk(cash === [money(AMT), money(AMT * t.dec), '+' + money(AMT * t.dec - AMT)].join(' | '),
          `Finish on the ${t.label} level does not open its card on the Bet amount: ${cash} for ${amtTxt(AMT)} at ${t.dec}`);
        /* Open in DraftKings: every leg with a key (all but a 2+ touchdown rung; since app v109 a level holds
           only legs DraftKings has an id for where the payload carries ids, and a leg priced from DraftKings'
           line read on ESPN is looked up like any other) opens, on its own made-up id, in the card's order,
           joined by + with each '#' as %23, no decoy among them; the button says it opens the parlay where
           every leg goes on, and "Open N of M legs" where one does not; the rest named under the buttons, and
           the note dated, saying what it opens as DraftKings had it then and promising no leg; with every leg
           on its own id, nothing said of a leg going on at another number */
        { const DK = w.eval('PAY').dk || {}, onSlip = l => !!dkKey(l), ids = t.legs.filter(onSlip).map(l => dkIdOf(DK, l)).filter(Boolean), a = d.getElementById('pcDk'), n = t.legs.filter(onSlip).length;
          const btn = n === t.legs.length ? 'Open in DraftKings' : `Open ${n} of ${t.legs.length} legs in DraftKings`;
          if (!n) console.log(`  (no leg of the ${t.label} level has a DraftKings key: none goes on the slip, and each is named to add by hand)`);
          else chk(ids.length === n && ids.every(x => /^SMK\d/.test(x)) && !!a && !a.hidden && a.getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(encodeURIComponent).join('+') && txt(a) === btn
            && !a.classList.contains('pc-dkall') && d.querySelectorAll('#pcDkNote [data-pc-dkmiss]').length === t.legs.length - n && !d.querySelector('#pcDkNote [data-pc-dkswap]') && !/goes on as|at its own line/.test(txt(d.getElementById('pcDkNote'))) && !d.getElementById('pcLink').hidden
            && /^DraftKings’ lines as read .* ET: Open in DraftKings opens /.test(txt(d.getElementById('pcDkNote'))) && txt(d.getElementById('pcDkNote')).includes(`opens ${n < t.legs.length ? n + ' of the ' + t.legs.length + ' legs' : 'the ' + t.n + ' legs'} as DraftKings had ${n === 1 ? 'it' : 'them'} then; a leg whose line DraftKings has moved or pulled since will not be on the slip`)
            && !/\bputs all\b|\ball \d+ legs on\b/.test(txt(d.getElementById('pcDkNote')) + ' ' + a.getAttribute('title')),
            `Open in DraftKings on the ${t.label} level does not open its legs' own ids (${ids.length} of ${n} keyed, ${t.legs.length} legs) under "${btn}", one link with no all-legs class: ` + (a ? txt(a) + ' ' + a.getAttribute('href') + ' hidden ' + a.hidden + ' class "' + a.className + '"' : 'no link') + ' / ' + txt(d.getElementById('pcDkNote')).slice(0, 200)); }
        w.eval(`(function(){ const k=${keepDk}; if(k===null) delete PAY.dk; else PAY.dk=k; })()`);
        w.eval('PARLAY_CARD.close()'); await wait(20);
        chk(d.getElementById('pcModal').hidden && d.activeElement === d.querySelector(finSel), 'closing the card did not give the focus back to the level\'s Finish');
        await wait(400);
        chk(w.eval('S.saved.length') === n0 && JSON.stringify(Object.keys(w.localStorage).sort()) === keys0, 'finishing a set\'s level saved it, or wrote a key');
        /* (app v109) the card puts a leg DraftKings has only at another number on the slip at DraftKings'
           number instead of leaving it to add by hand, and the builder says so first. The level's legs in the
           builder on a made-up id under each leg's own key (and the decoys): no line under any leg. Then one
           leg with a number (a spread, a total or a player's main line: sw) has its id only at a number two
           away, and another (gone) none for its bet at any number: the builder says "On DraftKings as" what
           goes on (DraftKings' number, in the card's words) under the first and "Not on DraftKings' slip yet:"
           with why in a few words under the second, nothing under the rest; Finish opens N-1 of N legs, sw on
           the id at DraftKings' number, in the card's order, under "Open N-1 of N legs in DraftKings", names sw
           as going on at DraftKings' number and that DraftKings prices it at its own line, and gone to add by
           hand; Share link's text says the same. Without the parlay card (the prop model's own page) the
           builder says nothing of DraftKings' slip. Each expectation worked out here from the legs */
        { const keepP2 = w.eval('JSON.stringify(S.parlay)'), read = new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', isG2 = w.eval('isGameLeg');
          d.querySelector(addSel).click(); await wait(60);
          const q = w.PARLAY_CARD.quote(), L = q ? q.legs : [], MKT = w.eval('MKT');
          const fix = () => { const dk = {}; L.forEach((l, i) => { const D = ((dk[String(l.week)] ??= {})[l.gid] ??= { at: read, glat: read });
            for (const k of dkDecoys(l, w)) if (!(k in D)) D[k] = 'DECOY' + i + '#' + k;
            const k = dkKey(l); if (k) D[k] = 'SMK' + i + '#' + k; }); return dk; };
          const put = async dk => { w.eval(`PAY.dk=${JSON.stringify(dk)}; renderParlay()`); await wait(30); };
          const rows = () => [...d.querySelectorAll('#parlayBody tr.legrow')], lineOf = i => { const r = rows()[i], x = r && r.querySelector('small.dkslip'); return x ? txt(x) : null; };
          const side = l => l.side === 'under' ? 'Under' : 'Over', lbl = st => ((MKT[st] && MKT[st].lbl) || String(st).replace(/_/g, ' ')).toLowerCase();
          /* a leg with no key at its own line (2+ touchdowns) has nothing to go on as here: why, in a few words */
          const noKey = (l, i) => `Not on DraftKings’ slip yet: ${q.prices[i].src === 'real' ? 'not among the lines read' : 'no anytime TD of his read'}`;
          await put(fix());
          chk(!!q && rows().length === L.length && L.every((l, i) => lineOf(i) === (dkKey(l) ? null : noKey(l, i))),
            'with DraftKings\' id for every leg at its own line, the builder says something of the slip under a leg: ' + rows().map((r, i) => lineOf(i)).filter(Boolean).join(' / '));
          const swI = L.findIndex(l => dkKey(l) && (l.stat === 'ats' || l.stat === 'total' || (l.main && !isG2(l)))), goneI = L.findIndex((l, i) => i !== swI && dkKey(l));
          if (swI < 0 || goneI < 0) console.log(`  (the ${t.label} level has no spread, total or main line beside another leg: the card's conversion is held by smoke_live.js)`);
          else {
            const ls = L[swI], lg = L[goneI], dk = fix(), Ds = dk[String(ls.week)][ls.gid], Dg = dk[String(lg.week)][lg.gid];
            const nearOf = l => l.stat === 'ats' ? `${l.pid}|ats|` : l.stat === 'total' ? `game|total|${l.side}|` : l.stat === 'ml' ? null : l.stat === 'any_td' ? null : l.main ? `${l.pid}|${l.stat}|${l.side}|` : `${l.pid}|${l.stat}|over|`;
            let p2 = +ls.k + 2; if (ls.stat === 'ats' && p2 === 0) p2 = +ls.k - 2;
            delete Ds[dkKey(ls)]; const swId = 'SWP' + swI + '#' + nearOf(ls) + dkPt(p2); Ds[nearOf(ls) + dkPt(p2)] = swId;
            const swap = ls.stat === 'ats' ? dkSigned(p2) : ls.stat === 'total' ? `${side(ls)} ${dkPt(p2)}` : `${side(ls)} ${dkPt(p2)} ${lbl(ls.stat)}`;
            { const nr = nearOf(lg); for (const k of Object.keys(Dg)) if (k === dkKey(lg) || (nr && k.startsWith(nr))) delete Dg[k]; }
            /* why the gone leg cannot go on, on a game whose prices were read: a market the pull never reads; on
               no book price, a rung with no line of his on its stat, 2+ touchdowns with no anytime touchdown of
               his, or a line DraftKings did not offer; on a book price, not among the lines read */
            const pl = !isG2(lg), booked = q.prices[goneI].src === 'real';
            const brief = pl && !DK_PULLED.includes(lg.stat) ? 'its market is not read here' : pl && !booked && !lg.main && lg.stat !== 'any_td' ? `no ${lbl(lg.stat)} line of his read`
              : pl && !booked && lg.stat === 'any_td' && +lg.k >= 2 ? 'no anytime TD of his read' : pl && !booked ? 'DraftKings did not offer it when read' : 'not among the lines read';
            await put(dk);
            const want = L.map((l, i) => i === swI ? `On DraftKings as ${swap}` : i === goneI ? `Not on DraftKings’ slip yet: ${brief}` : dkKey(l) ? null : noKey(l, i));
            chk(L.every((l, i) => lineOf(i) === want[i]) && (rows()[swI] || { querySelector: () => null }).querySelector(`small.dkslip[data-dkslip="${swI + 1}"]`),
              `the builder does not say under leg ${swI + 1} that it goes on DraftKings' slip at DraftKings' number, and under leg ${goneI + 1} that it cannot go on yet and why, and nothing under the rest: ` + JSON.stringify({ got: L.map((l, i) => lineOf(i)), want }));
            const fin = d.getElementById('pFinish'); if (fin && !fin.disabled) { fin.click(); await wait(40); }
            const on = L.map((l, i) => i === swI ? swId : i === goneI || !dkKey(l) ? null : dk[String(l.week)][l.gid][dkKey(l)]), ids = on.filter(Boolean);
            const a = d.getElementById('pcDk'), note = txt(d.getElementById('pcDkNote')), sw = d.querySelector(`#pcDkNote [data-pc-dkswap="${swI + 1}"]`);
            const btn = ids.length === L.length ? 'Open in DraftKings' : `Open ${ids.length} of ${L.length} legs in DraftKings`;
            chk(!!fin && !d.getElementById('pcModal').hidden && !!a && !a.hidden && txt(a) === btn && a.getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(encodeURIComponent).join('+')
              && !a.classList.contains('pc-dkall') && !!sw && txt(sw).startsWith(`${swI + 1}. `) && txt(sw).endsWith(`: goes on as ${swap}`) && d.querySelectorAll('#pcDkNote [data-pc-dkswap]').length === 1
              && note.includes('On DraftKings’ slip at its own line:') && note.includes('DraftKings prices a changed leg at its own line, so its slip’s payout can differ from this card’s.')
              && !!d.querySelector(`#pcDkNote [data-pc-dkmiss="${goneI + 1}"]`) && d.querySelectorAll('#pcDkNote [data-pc-dkmiss]').length === L.length - ids.length
              && note.includes(`opens ${ids.length} of the ${L.length} legs as DraftKings had them then`),
              `Finish does not open ${ids.length} of ${L.length} legs under "${btn}" (one link, no all-legs class), leg ${swI + 1} at DraftKings' ${swap} and said so, and leg ${goneI + 1} to add by hand: ` + (a ? txt(a) + ' ' + a.getAttribute('href') : 'no link') + ' / ' + note.slice(0, 400));
            { const lt = w.PARLAY_CARD.linkText(w.PARLAY_CARD.fromBuilder()), tx = lt ? lt.text : '', missN = L.map((l, i) => i + 1).filter(n => !on[n - 1]);
              chk(tx.includes(`On DraftKings’ slip at its own line: leg ${swI + 1} as ${swap} (DraftKings prices it at its own line, so its payout can differ)`)
                && tx.includes(`DraftKings betslip (opens ${ids.length} of the ${L.length} legs as DraftKings had them; add ${missN.length === 1 ? 'leg ' + missN[0] : 'legs ' + missN.slice(0, -1).join(', ') + ' and ' + missN[missN.length - 1]} by hand):\n` + a.getAttribute('href') + '\n'),
                `Share link's text does not say leg ${swI + 1} goes on as ${swap} at DraftKings' price, or what the link opens: ` + tx.slice(0, 500)); }
            w.eval('PARLAY_CARD.close()'); await wait(20);
            /* the prop model's own page has no parlay card: nothing of DraftKings' slip under its builder's legs */
            const pc = w.PARLAY_CARD; w.PARLAY_CARD = undefined; w.eval('renderParlay()'); await wait(20);
            chk(!d.querySelector('#parlayBody small.dkslip'), 'without the parlay card (the prop model\'s own page) the builder still says something of DraftKings\' slip');
            w.PARLAY_CARD = pc; }
          w.eval(`(function(){ const k=${keepDk}; if(k===null) delete PAY.dk; else PAY.dk=k; S.parlay=${keepP2}; save(); renderParlay(); })()`); await wait(40); }
        await openPb(); }
      w.eval(`S.stake=${JSON.stringify(stake0)}; save(); renderParlay()`); await wait(40);
      if (spStood) standOn(false);
      /* a game that kicks off leaves the list, every tier and Suggested Parlays, without a reload: the first
         game to come, and the last prime-time game. Each is first seen there before its kickoff, so its leaving is
         not taken from a tab that never drew it: the prime-time game on Suggested Parlays, where the night rule
         hides it now with the tab's one question of which games it sets out (spOn) stood in by every prime-time
         game (its own slot, put back whatever happens) */
      { const sp1 = primeHere().slice(-1)[0];
        for (const g0 of [w.eval('pbGames()')[0], sp1].filter(Boolean)) { const k0 = w.eval('kickoff')(g0).getTime(), D0 = w.Date, shift = k0 + 60e3 - D0.now();
          const isSp = !!sp1 && g0.id === sp1.id, stood = isSp && w.eval('typeof spOn') === 'function' && !shownHere().on.some(x => x.id === g0.id);
          if (stood) { w.__spOnKick = w.eval('spOn'); w.eval('spOn=function(){ return spGames(); }'); }
          try {
            w.eval('SP_SHOWN=null; renderParlay(); renderSp()'); await wait(40);
            chk(!!d.querySelector(`#pbPanel [data-pb-game="${g0.id}"]`) && (!isSp || (!!spOf(g0.id) && w.eval('spGames()').some(g => g.id === g0.id))),
              `${g0.id}, still to kick off, is not on the Parlay Builder's list of games${isSp ? ' or on Suggested Parlays' + (stood ? ' (spOn stood in by every prime-time game)' : '') : ''}, so its leaving at kickoff cannot be seen`);
            w.Date = class extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() + shift); } static now() { return D0.now() + shift; } };
            w.eval('renderParlay(); renderSp()'); await wait(40);
            chk(!d.querySelector(`#pbPanel [data-pb-game="${g0.id}"]`) && w.eval('getPbTiers()').tiers.every(x => !x.legs || x.legs.every(l => l.gid !== g0.id))
              && ![...panel.querySelectorAll('ol.pb-top [data-pb-leg]')].some(b => b.dataset.pbLeg.startsWith(g0.id + '|')) && !spOf(g0.id) && !w.eval('spGames()').some(g => g.id === g0.id),
              `${g0.id}, kicked off, is still on the Parlay Builder's list of games, in a tier, on the Top 30 lines or on Suggested Parlays`); }
          finally { w.Date = D0; if (stood) w.eval('spOn=window.__spOnKick; delete window.__spOnKick');
            w.eval('SP_SHOWN=null; renderParlay(); renderSp()'); await wait(40); } } }
      if (planted) { for (const x of planted) Object.assign(x.g, x.was); w.eval('SP_CACHE=new Map()'); }
      w.eval(`(function(){ const k=${keepPay}, cw=currentWeek(); if(k.m) PAY.mkt[String(cw)]=k.m; else delete PAY.mkt[String(cw)];
        S.sched.forEach((g,i)=>{ g.tov=k.t[i][0]; g.tou=k.t[i][1]; if(g.tov==null) delete g.tov; if(g.tou==null) delete g.tou; });
        for(const x of window.__totPlanted||[]){ if(x.had) x.g.tot=x.v; else delete x.g.tot; } delete window.__totPlanted;
        const kd=${keepDkM}; if(kd===null) delete PAY.dk; else PAY.dk=kd; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay(); })()`);
      await wait(40); }
  }
  /* with no game to come (the off-season, or every game of the week under way) the Parlay Builder and Suggest
     Parlays say so, offer nothing, and nothing breaks; (app v118) each section of Suggested Parlays in its own line,
     the Sunday slot's with the page's one question of which slot is to come (spSlotNext) stood in by none, as pbGames
     is for the nights, each put back after */
  if (hasPb) { w.__pbKeep = w.eval('[pbGames, seasonOver, spSlotNext]');
    const secLine = sec => txt(d.querySelector(`#spSets section.sp-sec[data-sp-sec="${sec}"] > p.pb-none`));
    const offers = () => d.querySelector('#spSets .sp-game, #spSets [data-pc-finish], #spSets [data-sp-add], #spSets [data-pb-leg]');
    try {
      w.eval('pbGames=function(){ return []; }; seasonOver=function(){ return true; }; spSlotNext=function(){ return null; }; renderParlay(); renderSp();'); await wait(20);
      const yr = w.eval('SEASON');
      chk(/regular season is over: no game is left/.test(txt(panel)) && !panel.querySelector('[data-pb-mix], .pb-tier, ol.pb-top, [data-pb-leg], [data-pc-finish]')
        && secLine('night') === `The ${yr} regular season is over: no Thursday, Sunday or Monday night game is left.` && secLine('slot') === `The ${yr} regular season is over: no Sunday slot is left.` && !offers(),
        'with the season over the Parlay Builder or a section of Suggested Parlays does not say so, or still offers something: ' + txt(panel).slice(0, 120) + ' / ' + secLine('night') + ' / ' + secLine('slot'));
      w.eval('seasonOver=function(){ return false; }; renderParlay(); renderSp();'); await wait(20);
      const wk0 = w.eval('currentWeek()');
      chk(/has kicked off, so there is nothing left to build from/.test(txt(panel)) && secLine('night') === `No Thursday, Sunday or Monday night game of week ${wk0} is still to kick off. Week ${wk0 + 1}’s sets come once its games are the week’s.`
        && secLine('slot') === `No Sunday game of week ${wk0} is still to kick off.` && !offers(),
        'with every game of the week under way the Parlay Builder or a section of Suggested Parlays does not say so: ' + txt(panel).slice(0, 120) + ' / ' + secLine('night') + ' / ' + secLine('slot')); }
    finally { w.eval('pbGames=window.__pbKeep[0]; seasonOver=window.__pbKeep[1]; spSlotNext=window.__pbKeep[2]; delete window.__pbKeep; renderParlay(); renderSp();'); await wait(20); } }
  /* every level shows a parlay of its size: ten made-up games standing in for the week's (pbGames
     and pricedLegs stood in for, so this holds on any day, the off-season included), only Spread
     ticked, as the owner had it. The covers are priced so that the likeliest legs and the
     best-paying ones differ: on the odd games four the model rates 57% to 58.5% at -115, on the
     even ones four it rates 46.5% to 48% at +140 (both over the 3-point bar), and two thin ones at
     59% and 58.8% at -135. Three legs land at most 20.3% and four 11.8% at any count of thin legs,
     short of Medium's 25% and Aggressive's 12%, so those two are the likeliest parlays of their
     size: the three and four likeliest -115 covers (H1, H3, H5, H7), never the +140 ones a choice by
     return would take or the first games on the list, worked out in full against every parlay of
     their size; Safe is the likeliest pair and Extreme its best return over 5%. The Top 50 lines on
     them are the ten covers by what $1 on each is expected to make */
  if (hasPb) { const Sx = w.eval('S'), cw = w.eval('currentWeek()'), keepU = JSON.stringify(Sx.ui.pb);
    w.__pbKeep4 = w.eval('[pbGames, pricedLegs]');
    const G = [...Array(10)].map((_, i) => ({ id: `2099_${String(cw).padStart(2, '0')}_A${i}_H${i}`, w: cw, a: 'A' + i, h: 'H' + i, d: `2099-01-0${1 + (i % 7)}`, t: '13:00' }));
    const COVER = [[0.48, 140], [0.585, -115], [0.475, 140], [0.58, -115], [0.47, 140], [0.575, -115], [0.465, 140], [0.57, -115], [0.59, -135], [0.588, -135]];
    w.__pb4 = { G, L: G.map((g, i) => ({ key: `${g.id}|team:${g.h}|ats`, gid: g.id, pid: 'team:' + g.h, stat: 'ats', k: -3.5, side: 'over', main: false, p: COVER[i][0], price: COVER[i][1],
      src: 'real', mu: null, name: 'Made-up ' + g.h, pos: 'Game', grp: 'TEAM', team: g.h, opp: g.a, week: cw, label: 'To cover -3.5' })) };
    w.eval('pbGames=function(){ return window.__pb4.G; }; pricedLegs=function(games){ return window.__pb4.L.filter(l=>(games||[]).some(g=>g.id===l.gid)).map(l=>({...l})); };');
    /* each cover under a made-up DraftKings id of its own (a fixture in place of the payload's table): a level
       takes only a leg with one, wherever the payload carries ids (app v109) */
    const keepDk4 = w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)');
    w.eval(`PAY.dk=${JSON.stringify(dkFixture(w.__pb4.L, new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'TEN'))}`);
    Sx.ui.pb = { k: { ml: false, ats: true, total: false, over: false, under: false }, off: [], gx: false };
    w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); renderParlay()'); await wait(40);
    const r = w.eval('getPbTiers()'), kinds = r.tiers.map(t => t.legs ? (t.likeliest ? 'likeliest' : 'built') : 'empty').join();
    chk(kinds === 'built,likeliest,likeliest,built' && r.tiers.every(t => t.legs && t.legs.length === t.n),
      `ten made-up games with only Spread ticked: the levels are ${kinds}, not Safe and Extreme built with Medium and Aggressive the likeliest of their size`);
    chk(!d.querySelector('#pbPanel [data-pb-mix].on') && !d.querySelector('#pbPanel .pb-custom') && !/\bCustom\b/.test(txt(panel)), 'ten made-up games with only Spread ticked: a mix is lit or a Custom tag shows');
    /* the Top 50 lines on the ten covers, ranked here by hand: chance times the decimal price, less 1 (the
       +140 covers first, 0.48 x 2.4 - 1 = +$0.15, the -135 thin ones last) */
    { const n = holdTop('ten made-up games, Spread only', Sx.ui.pb, G), order = [...panel.querySelectorAll('ol.pb-top li [data-pb-leg]')].map(b => b.dataset.pbLeg.split('|')[1].replace('team:', ''));
      chk(n === 10 && order.join() === 'H0,H2,H4,H6,H1,H3,H5,H7,H8,H9' && txt(panel.querySelector('ol.pb-top li .pb-tc:nth-child(5) b')) === '+$0.15',
        'ten made-up games: the Top 30 lines are not the ten covers best first by what $1 is expected to make (H0, H2, H4, H6 at +140, then the -115s, the -135s last): ' + order.join()); }
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
    /* (app v109) H1's id taken out, then put at another number (-4.5) alone: a suggestion takes a leg only
       with DraftKings' id at its own line, so H1 leaves the levels' lines, every level and the list, the pool
       counts it, and the panel says one line is left out for want of an id and that it is still on the game
       pages (no word of player prices: it is a team's). With no ids at all (a payload baked before them) H1 is
       back, and nothing is said */
    { const fx = JSON.parse(w.eval('JSON.stringify(PAY.dk)')), h1 = w.__pb4.L[1], D1 = fx[String(h1.week)][h1.gid], k1 = dkKey(h1), id1 = D1[k1];
      const has1 = p => [...p.pref, ...p.thin].some(l => l.gid === h1.gid), onList = () => [...panel.querySelectorAll('ol.pb-top [data-pb-leg]')].some(b => b.dataset.pbLeg.startsWith(h1.gid + '|'));
      /* what the panel says of H1: DraftKings has no id for it, or has its spread only at another number */
      const none1 = '1 line is left out: the list takes only lines DraftKings’ betslip can take, by DraftKings’ own id at the line, and DraftKings has none for it yet. It is still on the game pages, where you can add it to the builder.';
      const moved1 = '1 line is left out: DraftKings had it only at another number when its lines were last read, and the list takes only lines DraftKings’ betslip can take at their own number. Refresh odds reads DraftKings’ current spreads and totals, which the list can take. Added to the builder from the game pages, it goes on DraftKings’ slip at DraftKings’ number.';
      for (const [what, moved, one, other] of [['taken out', null, none1, moved1], ['only at -4.5', `${h1.pid}|ats|-4.5`, moved1, none1]]) {
        delete D1[k1]; if (moved) D1[moved] = id1;
        w.eval(`PAY.dk=${JSON.stringify(fx)}; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); renderParlay()`); await wait(30);
        const p = w.eval('pbPool')(G), rr = w.eval('getPbTiers()'), tx = pbOwnTxt(panel);
        chk(!has1(p) && !onList() && p.noId === 1 && p.noIdPl === 0 && p.moved === (moved ? 1 : 0) && rr.tiers.every(t => !t.legs || t.legs.every(l => l.gid !== h1.gid)) && tx.includes(one) && !tx.includes(other) && !/Refresh odds carries no id|to add by hand/.test(tx),
          `ten made-up games, H1's DraftKings id ${what}: H1 is still in the levels' lines, a level or the list, the pool counts ${p.noId} left out for want of an id (${p.moved} at another number), or the panel does not say "${one}" alone: ` + ((tx.match(/\d+ lines? (is|are) left out: [^]*?(builder|number)\./g) || ['nothing']).join(' ')));
        if (moved) delete D1[moved]; D1[k1] = id1; }
      /* a game the payload has no ids for, and an empty table (weekly.py's PAY.dk between Monday night's
         final and the next week's first pull): taken as before ids, H1 back and nothing said of ids */
      for (const [what, dk] of [['its game with no entry', (() => { const f2 = JSON.parse(JSON.stringify(fx)); delete f2[String(h1.week)][h1.gid]; return f2; })()], ['an empty table', {}]]) {
        w.eval(`PAY.dk=${JSON.stringify(dk)}; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); renderParlay()`); await wait(30);
        const p = w.eval('pbPool')(G);
        chk(has1(p) && onList() && p.noId === 0 && !/betslip can take|only at another number/.test(pbOwnTxt(panel)), `ten made-up games, ${what}: H1 is not back in the levels' lines and the list as before ids, or the panel speaks of ids: ${p.noId} left out`); }
      w.eval('delete PAY.dk; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); renderParlay()'); await wait(30);
      const p0 = w.eval('pbPool')(G);
      chk(has1(p0) && onList() && p0.noId === 0 && !/betslip can take/.test(pbOwnTxt(panel)), 'ten made-up games with no DraftKings ids in the payload (baked before them): H1 is not back in the levels\' lines and the list, or the panel still speaks of ids'); }
    w.eval(`(function(){ const k=${keepDk4}; if(k===null) delete PAY.dk; else PAY.dk=k; })()`);
    w.eval('pbGames=window.__pbKeep4[0]; pricedLegs=window.__pbKeep4[1]; PB_CACHE=new Map(); PB_TOP_CACHE=new Map();'); delete w.__pbKeep4; delete w.__pb4;
    Sx.ui.pb = JSON.parse(keepU); w.eval('renderParlay()'); await wait(20); }
  /* ---- each bet once, and the totals after every thin-edge line (app v112, round two: the owner, 17 October 2026,
     "why there are several instances of this where it's only a half yard difference?"), on made-up games of their
     own: pbGames and pricedLegs stood in for, and the Elo tab's market + form (window.eloAltP) on the made-up players
     alone, agreeing, so their lines can be Value picks; each in its own slot and put back whatever happens, so this
     holds on any day, the off-season included. The first game: a quarterback's main Over 224.5 passing yards and his
     225+ rung, the same bet (the rung left out); another's whole-number main Over 225 and his 226+ rung, two bets (both
     kept); a receiver's main Over 49.5 receiving yards that misses the 3-point bar and his 50+ rung that clears it (the
     rung left out: the main line is among the qualifying legs, if in the other part); a back's main Under 59.5 and his
     60+ rung (both kept: the main line is an Under); a rung of a receiver with no main line (kept, a thin-edge line);
     and its game total priced on its over alone at +120, put at 50%, expected to make $0.10 on $1, more than either
     thin-edge line (it comes after both). The second game: a 225+ rung of the first quarterback's id (kept: another
     game). The order, worked out here by hand on each line's chance times its decimal price less 1: the Value picks
     at +$0.15, +$0.13, +$0.11, +$0.10, +$0.09 and +$0.07, the thin-edge lines at +$0.03 and +$0.01, then the total */
  if (hasPb) { const Sx = w.eval('S'), cw = w.eval('currentWeek()'), keepU5 = JSON.stringify(Sx.ui.pb), wk5 = String(cw).padStart(2, '0');
    const O1 = { id: `2099_${wk5}_A40_H40`, w: cw, a: 'A40', h: 'H40', d: '2099-01-02', t: '13:00', tot: 47.5, tov: 120 }, O2 = { id: `2099_${wk5}_A41_H41`, w: cw, a: 'A41', h: 'H41', d: '2099-01-02', t: '16:25' };
    const pl = (g, pid, grp, stat, k, main, side, p, price, label) => ({ key: `${g.id}|${pid}|${stat}`, gid: g.id, pid, stat, k, side, main, p, price, src: 'real', mu: null,
      name: 'Once ' + pid.split('-')[1], pos: grp, grp, team: g.h, opp: g.a, week: cw, label });
    const L5 = [pl(O1, 'ONCE-QB1', 'QB', 'passing_yards', 224.5, true, 'over', 0.6, -110, 'Over 224.5 passing yards'), pl(O1, 'ONCE-QB1', 'QB', 'passing_yards', 225, false, 'over', 0.6, -113, '225+ passing yards'),
      pl(O1, 'ONCE-QB2', 'QB', 'passing_yards', 225, true, 'over', 0.58, -105, 'Over 225 passing yards'), pl(O1, 'ONCE-QB2', 'QB', 'passing_yards', 226, false, 'over', 0.57, -108, '226+ passing yards'),
      pl(O1, 'ONCE-WR1', 'WR', 'receiving_yards', 49.5, true, 'over', 0.54, -110, 'Over 49.5 receiving yards'), pl(O1, 'ONCE-WR1', 'WR', 'receiving_yards', 50, false, 'over', 0.61, -110, '50+ receiving yards'),
      pl(O1, 'ONCE-RB1', 'RB', 'rushing_yards', 59.5, true, 'under', 0.58, -110, 'Under 59.5 rushing yards'), pl(O1, 'ONCE-RB1', 'RB', 'rushing_yards', 60, false, 'over', 0.57, -110, '60+ rushing yards'),
      pl(O1, 'ONCE-WR2', 'WR', 'receiving_yards', 70, false, 'over', 0.53, -110, '70+ receiving yards'), pl(O2, 'ONCE-QB1', 'QB', 'passing_yards', 225, false, 'over', 0.56, -110, '225+ passing yards')];
    const WANT5 = [[O1, 'ONCE-QB1', 'passing_yards', 'over', 224.5], [O1, 'ONCE-QB2', 'passing_yards', 'over', 225], [O1, 'ONCE-RB1', 'rushing_yards', 'under', 59.5], [O1, 'ONCE-QB2', 'passing_yards', 'over', 226],
      [O1, 'ONCE-RB1', 'rushing_yards', 'over', 60], [O2, 'ONCE-QB1', 'passing_yards', 'over', 225], [O1, 'ONCE-WR1', 'receiving_yards', 'over', 49.5], [O1, 'ONCE-WR2', 'receiving_yards', 'over', 70],
      [O1, 'game', 'total', 'over', 47.5]].map(([g, pid, st, sd, k]) => `${g.id}|${pid}|${st} ${sd} ${k}`).join(', ');
    /* each main line's book prices, as the price pull writes them (PAY.mkt: a real main line's price is DraftKings'
       on its line there), over and under, so each has its two-sided fair chance; taken out after */
    const MK5 = [['ONCE-QB1', 'passing_yards', 224.5, -110, -110], ['ONCE-QB2', 'passing_yards', 225, -105, -115], ['ONCE-WR1', 'receiving_yards', 49.5, -110, -110], ['ONCE-RB1', 'rushing_yards', 59.5, -110, -110]];
    const cwS = JSON.stringify(String(cw)), keep5 = { alt: w.eloAltP, dk: w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)'), hadMkt: w.eval('!!PAY.mkt'), hadW: w.eval(`!!(PAY.mkt&&PAY.mkt[${cwS}])`) };
    w.__pbKeep5 = w.eval('[pbGames, pricedLegs]'); w.__pb5 = { G: [O1, O2], L: L5 };
    try {
      w.eval('pbGames=function(){ return window.__pb5.G; }; pricedLegs=function(games){ return window.__pb5.L.filter(l=>(games||[]).some(g=>g.id===l.gid)).map(l=>({...l})); };');
      if (typeof keep5.alt === 'function') w.eloAltP = (pid, ...a) => /^ONCE-/.test(String(pid)) ? 0.9 : keep5.alt(pid, ...a);
      w.eval(`(function(){ PAY.mkt=PAY.mkt||{}; const M=(PAY.mkt[${cwS}]=PAY.mkt[${cwS}]||{}); for(const [pid,st,line,over,under] of ${JSON.stringify(MK5)}) ((M[pid]??={})[st])={line,over,under,n:10,g:${JSON.stringify(O1.id)}}; })()`);
      const tl = w.eval('totalLeg')(O1, 'over');
      w.eval(`PAY.dk=${JSON.stringify(dkFixture([...L5, tl].filter(Boolean), new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'ONCE'))}`);
      Sx.ui.pb = { k: { ml: true, ats: true, total: true, over: true, under: true }, off: [], gx: false };
      w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()'); await wait(40);
      const n = holdTop('made-up games, each bet once and the totals last', Sx.ui.pb, [O1, O2]);
      const got = [...panel.querySelectorAll('ol.pb-top > li.pb-trow')].map(r => { const b = r.querySelector('button[data-pb-leg]'); return b ? `${b.dataset.pbLeg} ${b.dataset.side} ${b.dataset.k}` : 'no leg'; }).join(', ');
      const grps = [...panel.querySelectorAll('ol.pb-top > li.pb-trow')].map(r => r.dataset.pbGrp).join();
      chk(!!tl && tl.src === 'real' && tl.p === 0.5 && n === 9 && got === WANT5 && grps === 'value,value,value,value,value,value,other,other,other' && w.eval('getPbTop()').same === 2,
        `made-up games: the Top 30 lines are not the six Value picks, the two thin-edge lines and then the one-sided total at +120, with the two rungs that are the same bet as a half-point main Over left out (${w.eval('getPbTop()').same} counted left out): ` + got + ' / ' + grps);
    } finally {
      w.eval('pbGames=window.__pbKeep5[0]; pricedLegs=window.__pbKeep5[1]'); delete w.__pbKeep5; delete w.__pb5;
      w.eloAltP = keep5.alt; w.eval(`(function(){ const k=${keep5.dk}; if(k===null) delete PAY.dk; else PAY.dk=k;
        const M=PAY.mkt&&PAY.mkt[${cwS}]; if(M) for(const [pid] of ${JSON.stringify(MK5)}) delete M[pid];
        if(!${keep5.hadW}&&PAY.mkt) delete PAY.mkt[${cwS}]; if(!${keep5.hadMkt}) delete PAY.mkt; })()`);
      Sx.ui.pb = JSON.parse(keepU5); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()'); await wait(20); } }
  /* ---- the Top 30 (50 from app v113, the owner, 17 October 2026: "in parlay builder only do top 50 now instead of 100";
     30 since app v116, the owner, 18 October 2026: "its only showing top 30, but honestly top 30 is enough if you want to
     set it at that"), on sixty made-up games of their own (pbGames and pricedLegs stood in for, each in its own slot and
     put back whatever happens, so this holds on any day, the off-season included), only Moneyline ticked: each game's
     home side to win at -110 (1.909, the price implying 52.4%), twenty rated 60.0% down to 58.1% a tenth of a point at a
     time (3 points or more above it: Value picks) and forty 55.0% down to 53.05% a twentieth at a time (above it by less
     than 3: thin-edge lines). Ranked here by hand on the chance times 1.909 less 1: the twenty Value picks in game
     order, then the forty thin-edge lines in game order. The list is the first 30 of them, H100 to H119 and then H120 to
     H129, the last thirty (H130 to H159) left off, under "Top 30 lines", the Value picks' heading counting 20 and the
     other lines' 10, their ranks from 21 ---- */
  if (hasPb) { const Sx = w.eval('S'), cw = w.eval('currentWeek()'), keepU6 = JSON.stringify(Sx.ui.pb), wk6 = String(cw).padStart(2, '0');
    const G6 = [...Array(60)].map((_, i) => ({ id: `2099_${wk6}_A${100 + i}_H${100 + i}`, w: cw, a: 'A' + (100 + i), h: 'H' + (100 + i), d: '2099-01-03', t: '13:00' }));
    const L6 = G6.map((g, i) => ({ key: `${g.id}|team:${g.h}|ml`, gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false,
      p: Math.round((i < 20 ? 0.6 - i * 0.001 : 0.55 - (i - 20) * 0.0005) * 1e5) / 1e5, price: -110, src: 'real', mu: null, name: 'Made-up ' + g.h, pos: 'Game', grp: 'TEAM', team: g.h, opp: g.a, week: cw, label: 'To win' }));
    const keepDk6 = w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)');
    w.__pbKeep6 = w.eval('[pbGames, pricedLegs]'); w.__pb6 = { G: G6, L: L6 };
    try {
      w.eval('pbGames=function(){ return window.__pb6.G; }; pricedLegs=function(games){ return window.__pb6.L.filter(l=>(games||[]).some(g=>g.id===l.gid)).map(l=>({...l})); };');
      w.eval(`PAY.dk=${JSON.stringify(dkFixture(L6, new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'SIXTY'))}`);
      Sx.ui.pb = { k: { ml: true, ats: false, total: false, over: false, under: false }, off: [], gx: false };
      w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); renderParlay()'); await wait(40);
      const own = pbTopOwn(Sx.ui.pb, G6), n = holdTop('sixty made-up games, Moneyline only', Sx.ui.pb, G6);
      const rows = [...panel.querySelectorAll('ol.pb-top > li.pb-trow')], got = rows.map(r => (r.querySelector('button[data-pb-leg]') || { dataset: {} }).dataset.pbLeg || 'none');
      const hand = G6.slice(0, 30).map(g => `${g.id}|team:${g.h}|ml`), pills = [...panel.querySelectorAll('h3.pb-topsec .pill')].map(txt).join(), oo = panel.querySelector('ol.pb-top[data-pb-sec="other"]');
      chk(n === 30 && own.full === 60 && rows.length === 30 && got.join() === hand.join() && pills === '20,10' && !!oo && oo.getAttribute('start') === '21' && w.eval('getPbTop()').rows.length === 30
        && txt(panel.querySelector('#pbCard > .pb-hd h2')) === 'Top 30 lines',
        `sixty made-up games, each a line that qualifies: the list is not the first 30 of their order (the twenty Value picks H100 to H119, then the ten best thin-edge lines H120 to H129, H130 to H159 left off) under "Top 30 lines": ${rows.length} rows (${got.slice(18, 32).map(k => k.split('|')[1]).join(', ')} around the cut), the parts counting ${pills}`);
    } finally {
      w.eval('pbGames=window.__pbKeep6[0]; pricedLegs=window.__pbKeep6[1]'); delete w.__pbKeep6; delete w.__pb6;
      w.eval(`(function(){ const k=${keepDk6}; if(k===null) delete PAY.dk; else PAY.dk=k; })()`);
      Sx.ui.pb = JSON.parse(keepU6); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()'); await wait(20); }
    chk(topOver > 0, `no list the smoke held had more lines qualifying than the ${PB_TOP_N_OWN} it holds, so the cut was never held`); }
  /* ---- only the bets DraftKings posts (app v113, the owner, 17 October 2026: "there are certain bets in the props that
     are not part of draft kings like for FG attempts. i only want to show legs that draft kings does"): of the stats the
     page projects, targets and FG attempts (NO_BET_OWN, the smoke's own copy) are never a line on a game's page, a leg in
     the builder or a suggestion. FG attempts is still projected (a kicker's field goals made and kicking points stand on
     it). Held first on the week as it stands, every game still to come: every projected player's lines, the priced lines,
     each game page's hands, the Top 50 and the engine's levels on every bet type and game, each prime-time set, the Elo
     picks, every game's page with every player open, and the builder; then on a made-up game of the smoke's own, a Sunday
     night in 2099 between two clubs of the schedule whose kicker the page projects (laid into the schedule and taken out
     after, so it holds on any day, the off-season included), with DraftKings' main line and two ladder prices planted on
     each kicker's FG attempts, each with a made-up id (a fixture merged into a copy of the payload's table, put back
     after): still no line, leg or suggestion of it anywhere, and every line the page draws for the kickers put in the
     builder by its own box, none of them FG attempts ---- */
  if (hasPb) { const Sx = w.eval('S'), cw = w.eval('currentWeek()'), keepU7 = JSON.stringify(Sx.ui.pb), wk7 = String(cw).padStart(2, '0');
    const noBet = l => !!l && NO_BET_OWN.has(l.stat), legTxt = l => `${l.name} ${l.label} (${l.stat})`;
    const lineOf = el => (el.dataset.leg || el.dataset.pbLeg || '').split('|')[2] || '';
    const pageBad = () => [...d.querySelectorAll('#gameView [data-leg], #pbPanel [data-pb-leg], #spPanel [data-pb-leg], #parlayBody [data-drop]')]
      .filter(el => NO_BET_OWN.has(lineOf(el)) || NO_BET_OWN.has((el.dataset.drop || '').split('|')[2] || '')).map(el => el.dataset.leg || el.dataset.pbLeg || el.dataset.drop);
    const headsBad = () => [...d.querySelectorAll('#gameView .statblk h4, #gameView .tile .tl')].map(txt).filter(t => /^(FG attempts|Targets)\b/.test(t));
    const allOn = () => { Sx.ui.pb = { k: { ml: true, ats: true, total: true, over: true, under: true }, off: [], gx: false }; };
    /* everything the page offers on these games, read through the page's own functions: what each holds of NO_BET_OWN */
    const offered = G => { const bad = [];
      for (const g of G) { const ro = w.eval('rosterFor')(g, true);
        for (const tm in ro) for (const x of ro[tm].players) for (const l of w.eval('statLines')(x)) if (NO_BET_OWN.has(l.stat)) bad.push(`${x.pl.n}'s ${l.stat} line in ${g.id}`);
        for (const l of w.eval('gameLegPool')(g, true)) if (noBet(l)) bad.push('a hand\'s line ' + legTxt(l));
        const T = w.eval('gameTiers')(g); for (const id of ['high', 'med', 'low']) for (const l of ((T && T[id] && T[id].legs) || [])) if (noBet(l)) bad.push(`the ${id} hand's ` + legTxt(l));
        if (primeOwn(g)) { const s = w.eval('spSet')(g.id); for (const t of ((s && s.tiers) || [])) for (const l of (t.legs || [])) if (noBet(l)) bad.push(`the ${t.id} set's ` + legTxt(l)); } }
      for (const l of w.eval('pricedLegs')(G)) if (noBet(l)) bad.push('a priced line ' + legTxt(l));
      for (const l of w.eval('getPbTop()').rows) if (noBet(l)) bad.push('a Top 30 line ' + legTxt(l));
      for (const t of w.eval('getPbTiers()').tiers) for (const l of (t.legs || [])) if (noBet(l)) bad.push(`the ${t.id} level's ` + legTxt(l));
      if (typeof w.eloPicks === 'function') { const r = w.eloPicks(); for (const t of ((r && r.tiers) || [])) for (const l of t.legs) if (noBet(l)) bad.push(`the ${t.id} Elo pick's ` + legTxt(l)); }
      for (const l of Object.values(w.eval('S').parlay || {})) if (noBet(l)) bad.push('the builder\'s ' + legTxt(l));
      return bad; };
    /* each game's page with every player open, its ladders shown: no box, heading or tile of a stat that is no bet */
    const pagesBad = async (G, also) => { const bad = [], keepG = w.eval('JSON.stringify({game:S.ui.game,open:S.ui.open||{},rungs:S.ui.showRungs})');
      for (const g of G) { const ro = w.eval('rosterFor')(g, true), open = {}; for (const tm in ro) for (const x of ro[tm].players) open[x.pl.id] = true;
        w.__fgOpen = open; w.eval(`S.ui.showRungs=true; S.ui.game=${JSON.stringify(g.id)}; S.ui.open=window.__fgOpen; renderGame()`); await wait(20);
        bad.push(...pageBad().map(k => `${g.id}: a box ${k}`), ...headsBad().map(t => `${g.id}: "${t}"`));
        if (also) await also(g); }
      delete w.__fgOpen; w.eval(`(function(){ const k=${keepG}; S.ui.game=k.game; S.ui.open=k.open; S.ui.showRungs=k.rungs; closeGameModal(); })()`); await wait(20);
      return bad; };
    try {
      /* the week as it stands, every bet type and game ticked */
      allOn(); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()'); await wait(40);
      const G0 = w.eval('pbGames()'), b0 = offered(G0), p0 = await pagesBad(G0);
      chk(!b0.length && !p0.length && !pageBad().length, `on the week as it stands a line, leg or suggestion is a stat DraftKings does not post (${[...NO_BET_OWN].join(', ')}): ` + [...b0, ...p0, ...pageBad()].slice(0, 4).join('; '));
      console.log(`  (only DraftKings' markets: ${G0.length} game${G0.length === 1 ? '' : 's'} of the week as it stands held, every page with every player open)`);
      /* the made-up Sunday night game: two clubs of the schedule, the first pair in order whose kicker the page projects */
      const clubs = [...new Set(Sx.sched.flatMap(g => [g.a, g.h]))].sort(), mkG = (a, h) => ({ id: `2099_${wk7}_${a}_${h}`, w: cw, a, h, d: '2099-01-04', t: '20:20' });
      const kOf = g => { const ro = w.eval('rosterFor')(g, false); return Object.values(ro).flatMap(t => t.players).filter(x => x.pl.grp === 'K' && w.eval('statLines')(x).length); };
      let F = null; for (let i = 0; i + 1 < clubs.length && !F; i += 2) { const g = mkG(clubs[i], clubs[i + 1]); if (kOf(g).length) F = g; }
      if (!F) chk(false, 'no two clubs of the schedule give a kicker the page projects, so FG attempts cannot be planted on one');
      else {
        Sx.sched.push(F);
        const K = kOf(F), keepDk7 = w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)'), cwS = JSON.stringify(String(cw));
        const keepM = w.eval(`JSON.stringify({had:!!PAY.mkt, hadW:!!(PAY.mkt&&PAY.mkt[${cwS}])})`), keepP = w.eval('JSON.stringify(S.parlay)');
        try {
          /* FG attempts still projected for each kicker, and priced: DraftKings' main line a few points under the model's
             side, both ways (PAY.mkt, as the price pull writes it), and his 2+ and 3+ (S.odds, as a pull's ladder) */
          const plant = [], proj = K.map(x => w.eval('project')(x.pl, 'fg_att', x.opp, x.ctx));
          chk(proj.every(pr => !!pr && pr.mu > 0), `FG attempts is not projected for the made-up game's kicker${K.length === 1 ? '' : 's'}, which field goals made and kicking points stand on: ` + JSON.stringify(proj));
          K.forEach((x, i) => { const pr = proj[i]; if (!pr || !(pr.mu > 0)) return;
            const ln = Math.floor(pr.mu) + 0.5, pO = w.eval('pOver')('K', 'fg_att', pr.mu, ln), ov = pO >= 0.5, fs = Math.max(0.05, Math.min(0.9, (ov ? pO : 1 - pO) - 0.06)), fo = ov ? fs : 1 - fs;
            const over = w.eval('probToAmerican')(fo * 1.03), under = w.eval('probToAmerican')((1 - fo) * 1.03);
            const rung = k => w.eval('probToAmerican')(Math.max(0.05, Math.min(0.9, w.eval('pOver')('K', 'fg_att', pr.mu, k - 0.5) - 0.06)) * 1.03);
            plant.push({ pid: x.pl.id, name: x.pl.n, ln, over, under, r2: rung(2), r3: rung(3), team: x.team }); });
          w.__fgPlant = { F, plant };
          w.eval(`(function(){ const P=window.__fgPlant, cw=${cwS}; PAY.mkt=PAY.mkt||{}; const M=(PAY.mkt[cw]=PAY.mkt[cw]||{});
            for(const q of P.plant){ ((M[q.pid]??={}).fg_att)={line:q.ln,over:q.over,under:q.under,n:10,g:P.F.id}; (((S.odds[P.F.id]??={})[q.pid]??={}).fg_att)={'2':q.r2,'3':q.r3}; } })()`);
          /* a made-up DraftKings id on each planted line (and on the kickers' other lines), merged into a copy of the
             payload's table where it has one */
          const fx = dkFixture(plant.flatMap(q => [{ gid: F.id, week: cw, pid: q.pid, stat: 'fg_att', k: q.ln, side: 'over', main: true }, { gid: F.id, week: cw, pid: q.pid, stat: 'fg_att', k: q.ln, side: 'under', main: true },
            { gid: F.id, week: cw, pid: q.pid, stat: 'fg_att', k: 2, side: 'over', main: false }, { gid: F.id, week: cw, pid: q.pid, stat: 'fg_att', k: 3, side: 'over', main: false }]), new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'FGA');
          { const D = JSON.parse(keepDk7); if (D && typeof D === 'object') { (D[String(cw)] ??= {})[F.id] = (fx[String(cw)] || {})[F.id] || {}; w.eval(`PAY.dk=${JSON.stringify(D)}`); } }
          allOn(); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()'); await wait(40);
          const inPb = w.eval('pbGames()').some(g => g.id === F.id), b1 = offered([F]);
          /* on its page, every box the page draws for the kickers ticked into the builder by the page's own path (each a
             line DraftKings posts), and the builder then shows none of FG attempts */
          let ticked = 0;
          const p1 = await pagesBad([F], async () => { for (const q of plant) { const boxes = [...d.querySelectorAll(`#gameView input[data-leg^="${F.id}|${q.pid}|"]`)];
            for (const el of boxes) { const b = d.querySelector(`#gameView input[data-leg="${el.dataset.leg}"][data-k="${el.dataset.k}"][data-side="${el.dataset.side}"]`); if (b && !b.checked) { b.click(); await wait(10); ticked++; } } } });
          w.eval('renderParlay()'); await wait(20);
          const inB = Object.values(w.eval('S').parlay || {}), kLegs = inB.filter(l => l.gid === F.id);
          chk(inPb && !b1.length && !p1.length && ticked > 0 && kLegs.length > 0 && !kLegs.some(noBet) && !pageBad().length && !/FG attempts/.test(txt(d.getElementById('parlayBody'))),
            `on a made-up Sunday night game (${F.id}) with FG attempts priced for ${plant.map(q => q.name).join(' and ')}, a line, leg or suggestion of it is offered somewhere, or the kickers' own lines could not be put in the builder (${ticked} boxes ticked, ${kLegs.length} legs of the game in the builder): ` + [...b1, ...p1, ...kLegs.filter(noBet).map(legTxt), ...pageBad()].slice(0, 4).join('; '));
          console.log(`  (only DraftKings' markets: FG attempts priced on ${plant.length} kicker${plant.length === 1 ? '' : 's'} of a made-up game, ${F.id}; ${ticked} of their own lines put in the builder, none FG attempts)`);
          /* (app v113) an FG attempts leg a visitor's builder kept from before app v113 (S.parlay is the browser's)
             leaves it on the next draw, with one line saying why, and toggleLeg never adds one by any path */
          { const q0 = plant[0], key0 = `${F.id}|${q0.pid}|fg_att`, base = kLegs.find(l => l.pid === q0.pid) || kLegs[0];
            w.__fgOld = { ...base, key: key0, pid: q0.pid, stat: 'fg_att', k: 2, side: 'over', main: false, price: -110, src: 'est' };
            w.eval('S.parlay[window.__fgOld.key]=window.__fgOld; delete window.__fgOld; save(); renderParlay()'); await wait(20);
            const left = Object.values(w.eval('S').parlay || {}).filter(noBet), note = d.querySelector('#parlayBody [data-pb-notdk]');
            w.eval(`toggleLeg(${JSON.stringify(key0)},2,null,'over',false)`); await wait(10);
            const after = Object.values(w.eval('S').parlay || {}).filter(noBet);
            chk(!left.length && !!note && note.dataset.pbNotdk === '1' && txt(note) === '1 leg was removed: DraftKings does not offer FG attempts.' && !after.length,
              `an FG attempts leg kept in the builder from before is not removed with its line (${left.length} left; ${note ? '"' + txt(note) + '"' : 'no line'}), or toggleLeg still adds one (${after.length})`); }
        } finally {
          const i7 = Sx.sched.indexOf(F); if (i7 >= 0) Sx.sched.splice(i7, 1);
          w.__fgKeep = { m: JSON.parse(keepM) };
          w.eval(`(function(){ const P=window.__fgPlant, cw=${cwS}; if(P){ const M=PAY.mkt&&PAY.mkt[cw]; if(M) for(const q of P.plant){ if(M[q.pid]){ delete M[q.pid].fg_att; if(!Object.keys(M[q.pid]).length) delete M[q.pid]; } }
            delete S.odds[P.F.id]; } const k=window.__fgKeep.m; if(!k.hadW&&PAY.mkt) delete PAY.mkt[cw]; if(!k.had) delete PAY.mkt;
            const kd=${keepDk7}; if(kd===null) delete PAY.dk; else PAY.dk=kd; S.parlay=${keepP}; save(); })()`);
          delete w.__fgPlant; delete w.__fgKeep; } }
    } finally {
      Sx.ui.pb = JSON.parse(keepU7); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}; renderParlay()'); await wait(20); } }
  /* ---- Suggested Parlays on made-up games of its own (pbGames and pricedLegs stood in for, the games laid into
     the schedule and taken out after, so this holds on any day, the off-season included): a Thursday night
     game with one line, a Saturday night and a Sunday afternoon game (not prime time, never set out), a Sunday
     night game with ten lines, and a Monday 7:00 pm game with two. The Sunday night game's set is held to the
     rules, Safe worked out in full, and then its lock (the owner's call of 16 October 2026: "can we have the
     ability to refresh odds up until 2 hours before the game before it locks?"), at the page's own clock moved
     to each moment: live before the lock; from the lock the site's locked set, the record's entry (a made-up
     one, replaced wholesale), which a press no longer changes; a player in a level ruled out after the lock,
     that level alone built again and said so, kept in the browser, and the record's own replacement taking
     over from the page's; with no entry, the set the page builds once, kept in the browser outside S so a
     reload shows it again, which a press and new prices do not change; and once the game kicks off, its set
     off the tab and its kept copy pruned at the next write. Those checks need every made-up game's cards, so the
     tab's one question of which games it sets out (spOn) is stood in by every prime-time game; then, put back, the
     night rule itself (app v112, the owner's call of 17 October 2026: "just show the next night game dont stack the
     mondy night game until monday morning") on the same games, at the page's clock moved to each turn, worked out
     here on its own (nightOwn): the Thursday alone first; from its kickoff to 6:00 AM Eastern the next morning a
     line naming the Sunday night game and when its set goes up, then that set; from its kickoff to Monday 6:00 AM
     the Monday night games (a doubleheader, together), then theirs; the morning's turn redrawing an open tab by its
     own half-minute look (pbWatchTick, on spState's on= token); and a hidden game's level never finished ---- */
  if (hasPb) { const Sx = w.eval('S'), cw = w.eval('currentWeek()'), SEAS = w.eval('SEASON'), KK = 'props_sp_lock_v1', D0 = w.Date, fmt = w.eval('fmtML'), isG = w.eval('isGameLeg');
    const wk2 = String(cw).padStart(2, '0'), mk = (n, d0, t0) => ({ id: `2099_${wk2}_A${n}_H${n}`, w: cw, a: 'A' + n, h: 'H' + n, d: d0, t: t0 });
    const Q = mk(21, '2099-01-01', '20:15'), X = mk(22, '2099-01-03', '20:00'), Y = mk(23, '2099-01-04', '13:00'), P = mk(20, '2099-01-04', '20:20'), Z = mk(24, '2099-01-05', '19:00'), G2 = [Q, X, Y, P, Z];
    const leg = (g, tag, grp, team, stat, k, p, price, label) => ({ key: `${g.id}|${tag}|${stat}`, gid: g.id, pid: tag, stat, k, side: 'over', main: false, p, price, src: 'real', mu: null,
      name: tag.startsWith('team:') ? 'Made-up ' + tag.slice(5) : 'Fixture ' + tag.split('-')[1], pos: grp === 'TEAM' ? 'Game' : grp, grp, team, opp: team === g.h ? g.a : g.h, week: cw, label });
    const LP = [leg(P, 'P20-WR1', 'WR', P.h, 'receiving_yards', 60, 0.58, -105, '60+ rec yds'), leg(P, 'P20-WR2', 'WR', P.h, 'receiving_yards', 50, 0.62, -120, '50+ rec yds'),
      leg(P, 'P20-RB1', 'RB', P.a, 'rushing_yards', 60, 0.57, 100, '60+ rush yds'), leg(P, 'P20-TE1', 'TE', P.a, 'receptions', 4, 0.56, 105, '4+ rec'),
      leg(P, 'P20-WR3', 'WR', P.h, 'receptions', 5, 0.52, 130, '5+ rec'), leg(P, 'P20-RB2', 'RB', P.h, 'rushing_yards', 40, 0.6, -115, '40+ rush yds'),
      leg(P, 'P20-QB1', 'QB', P.a, 'passing_yards', 250, 0.55, 110, '250+ pass yds'), leg(P, 'P20-WR4', 'WR', P.a, 'receiving_yards', 70, 0.47, 160, '70+ rec yds'),
      { ...leg(P, 'team:H20', 'TEAM', P.h, 'ml', 0, 0.6, -130, 'To win') }, { ...leg(P, 'team:H20', 'TEAM', P.h, 'ats', -3.5, 0.55, -110, 'To cover -3.5') }];
    const LQ = [leg(Q, 'team:H21', 'TEAM', Q.h, 'ml', 0, 0.58, -120, 'To win')], LZ = [leg(Z, 'team:H24', 'TEAM', Z.h, 'ml', 0, 0.6, -125, 'To win'), leg(Z, 'Z24-WR1', 'WR', Z.h, 'receiving_yards', 60, 0.58, -105, '60+ rec yds')];
    const LALL = [...LP, ...LQ, ...LZ], byTag = tag => LP.find(l => l.pid === tag && l.stat !== 'ats');
    const keep = { pb: w.eval('[pbGames, pricedLegs]'), dk: w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)'), rec: w.eval('PB_REC'), done: w.eval('PB_REC_DONE'), key: w.localStorage.getItem(KK), parlay: w.eval('JSON.stringify(S.parlay)'), hash: w.location.hash,
      on: w.eval('typeof spOn') === 'function' ? w.eval('spOn') : null, slot: w.eval('typeof spSlotNext') === 'function' ? w.eval('spSlotNext') : null };
    /* the made-up lines as pricedLegs gives a week's: a player the page holds out (suggestable: V6's rule, which
       pricedLegs keeps) is left off, as the real one leaves him */
    w.__sp2 = { G: G2, L: LALL };
    w.eval('pbGames=function(){ return window.__sp2.G.filter(g=>!gameStarted(g)&&!hasScore(g)); }; pricedLegs=function(games){ return window.__sp2.L.filter(l=>(games||[]).some(g=>g.id===l.gid)&&(isGameLeg(l)||suggestable(l.pid))).map(l=>({...l})); };');
    Sx.sched.push(...G2);
    w.eval(`PAY.dk=${JSON.stringify(dkFixture(LALL, new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'SPF'))}`);
    const at = ms => { const sh = ms - D0.now(); w.Date = class extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() + sh); } static now() { return D0.now() + sh; } }; };
    const redraw = async () => { w.eval('SP_CACHE=new Map(); renderSp()'); await wait(30); };
    const elOf = g => d.querySelector(`#spPanel .sp-game[data-sp-game="${g.id}"]`), phaseOf = g => { const x = elOf(g) && elOf(g).querySelector('[data-sp-phase]'); return x ? x.dataset.spPhase : null; };
    /* a set as the tab draws it: each level's legs (name and label), its chance and price, or why it is empty */
    const nmOf = nm => legNameOf(nm) + ' ' + txt(nm.querySelector('small'));
    /* (app v118: the model's levels, data-sp-kind model; drawnElo the unit's Elo picks', each leg's own Elo chance beside
       its name, the legs in name order) */
    const drawn = g => { const el = elOf(g); return el ? [...el.querySelectorAll('.pb-tiers[data-sp-kind="model"] > .pb-tier')].map(c => c.classList.contains('none') ? c.className.split(' ')[1] + ' none: ' + txt(c.querySelector('.pb-why'))
      : `${c.dataset.pbTier}: ${[...c.querySelectorAll('.pb-legs li .nm')].map(nmOf).join(' + ')} | ${txt(c.querySelector('.pb-chance b'))} | ${txt(c.querySelector('.pb-chance small'))} | ${txt(c.querySelector('.pb-nums > div:nth-child(2) b'))}`).join(' / ') : null; };
    const drawnElo = g => { const el = elOf(g); return el ? [...el.querySelectorAll('.pb-tiers[data-sp-kind="elo"] > .pb-tier')].map(c => c.classList.contains('none') ? c.className.split(' ')[1] + ' none: ' + txt(c.querySelector('.pb-why'))
      : `${c.dataset.pbTier}: ${[...c.querySelectorAll('.pb-legs li')].map(li => nmOf(li.querySelector('.nm')) + ' ' + txt(li.querySelector('.pr em'))).sort().join(' + ')} | ${txt(c.querySelector('.pb-chance b'))} | ${txt(c.querySelector('.pb-chance small'))} | ${txt(c.querySelector('.pb-nums > div:nth-child(2) b'))}`).join(' / ') : null; };
    const kickP = etKick(P), lockP = kickP - 2 * 3600e3, isoS = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
    try {
      /* every prime-time game's set on the tab, whatever the night rule says (it is held below, put back); (app v118)
         and no Sunday slot: the made-up Sunday afternoon game would join the week's real Sunday games in one, which is
         held on made-up games of its own below (the page's one question of which slot is to come, spSlotNext, stood in
         by none, put back) */
      if (keep.on) w.eval('spOn=function(){ return spGames(); }');
      if (keep.slot) w.eval('spSlotNext=function(){ return null; }');
      w.eval('renderParlay()'); tabBtn('suggest').click(); await wait(80);
      /* live: the prime-time games alone, in kickoff order, each held to the rules; Safe worked out in full */
      const ids = [...d.querySelectorAll(`${SEC_NIGHT} .sp-game[data-sp-game]`)].map(x => x.dataset.spGame);
      chk(ids.join() === [Q, P, Z].map(g => g.id).join() && !d.querySelector(`${SEC_SLOT} .sp-game`), 'made-up games: Suggested Parlays (every prime-time game set out) does not set out the Thursday night, Sunday night and Monday 7:00 pm games alone among its night games, in kickoff order (not the Saturday night or the Sunday afternoon game): ' + ids.join(', '));
      const nP = holdSetF('a made-up Sunday night game', P); holdSetF('a made-up Thursday night game with one line', Q); holdSetF('a made-up Monday night game with two lines', Z);
      chk(nP === 4, `a made-up Sunday night game with ten lines does not build all four levels: ${nP}`);
      const live = drawn(P);
      /* Finish on the live set opens its card, named for its game */
      { const t = w.eval('spSet')(P.id).tiers.find(x => x.id === 'aggr'), fb = d.querySelector(`#spPanel [data-pc-finish="sp|${P.id}:aggr"]`);
        if (fb) { fb.click(); await wait(40); }
        const view = d.getElementById('pcView');
        chk(!!fb && !!t && !!t.legs && !d.getElementById('pcModal').hidden && txt(view).includes(`Aggressive parlay · ${P.a} at ${P.h}`) && t.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label))
          && txt(view.querySelector('.pc-price')) === fmt(w.eval('decToML')(t.dec)).replace('-', '−'), 'Finish on the made-up Sunday night game\'s Aggressive does not open its card with its game, legs and price: ' + txt(view).slice(0, 160));
        w.eval('PARLAY_CARD.close()'); await wait(20); }
      /* at the lock, before the record has answered: the tab says it is reading the site's locked set */
      at(lockP + 60e3); w.eval('PB_REC_DONE=false'); await redraw();
      chk(phaseOf(P) === 'loading' && txt(elOf(P).querySelector('[data-sp-phase]')) === 'Locked since Sun 6:20 PM ET. Loading the site’s set…' && !elOf(Q) && phaseOf(Z) === 'live',
        `at the lock, with the record not read yet, the made-up Sunday night game does not say it is reading the site's locked set (or the Thursday game, kicked off, is still there): ${phaseOf(P)} ${elOf(P) ? txt(elOf(P).querySelector('[data-sp-phase]')) : ''}`);
      /* the site's locked set: the record's entry, made up, drawn as it stands */
      const out = (l, x) => ({ gid: l.gid, week: l.week, pid: l.pid, team: l.team, grp: l.grp, stat: l.stat, k: l.k, side: l.side, main: l.main, price: l.price, src: l.src, name: l.name, label: l.label, p: l.p, fair: x, fair_est: false, thin: true, market: false });
      const T = (id, label, n, floor, legs, p, fair, dec, extra) => ({ id, label, n, floor, legs: legs.map(l => out(l, 0.5)), p, fair, fair_est: false, dec, likeliest: false, thin: legs.length, mkt: 0, ...(extra || {}) });
      const tML = LP.find(l => l.stat === 'ml'), [wr1, wr2, rb1, te1, wr3, rb2, qb1] = ['WR1', 'WR2', 'RB1', 'TE1', 'WR3', 'RB2', 'QB1'].map(x => byTag('P20-' + x));
      const takenAt = isoS(lockP - 3 * 3600e3), REC = { entries: {}, prime: { [`${SEAS}|${wk2}|${isoS(kickP)}|${P.id}`]: { season: SEAS, week: cw, gid: P.id, away: P.a, home: P.h, kickoff: isoS(kickP), lock: isoS(lockP), baked_at: takenAt, taken_at: takenAt, pool: {},
        tiers: [T('safe', 'Safe', 2, 0, [wr2, rb2], 0.4, 0.36, 3.3), T('med', 'Medium', 3, 0.25, [wr1, rb1, te1], 0.22, 0.19, 6.8), T('aggr', 'Aggressive', 4, 0.12, [tML, wr2, rb2, wr3], 0.13, 0.1, 12.5),
          { id: 'xtrm', label: 'Extreme', n: 5, floor: 0.05, why: 'No 5-leg parlay in this game.' }] } } };
      /* the Safe's two legs kept as Value picks (thin false, as the record keeps a preferred leg), the rest thin: the
         locked card marks Value on those two alone (app v112) */
      { const sf = REC.prime[Object.keys(REC.prime)[0]].tiers[0]; sf.legs.forEach(l => { l.thin = false; }); sf.thin = 0; }
      const mlOwn = dec => dec >= 2 ? '+' + Math.round((dec - 1) * 100) : '-' + Math.round(100 / (dec - 1)), pc = v => (v * 100).toFixed(0) + '%';
      /* (a level's chance and price drawn as the builder's own sums on its legs as kept, in the builder's order,
         which Add to builder then pays; its fair chance the one kept) */
      const keptSums = t => { const L = w.eval('pbOrder')(t.legs.map(l => ({ ...l, key: `${l.gid}|${l.pid}|${l.stat}` })));
        return { p: w.eval('parlayProb')(L).corr, dec: w.eval('parlayDec')(L.map(l => ({ leg: l, ml: l.price }))) }; };
      const recDrawn = R => R.prime[Object.keys(R.prime)[0]].tiers.map(t => { if (!t.legs) return `${t.id} none: ${t.why}`; const k = keptSums(t);
        return `${t.id}: ` + [...t.legs].sort((a, b) => a.name.localeCompare(b.name)).map(l => l.name + ' ' + l.label + (l.thin === false && !l.market ? ' Value' : '')).join(' + ') + ` | ${pc(t.fair)} | model says ${pc(k.p)} | ${mlOwn(k.dec)}`; }).join(' / ');
      const setRec = R => { w.__spRec = R; w.eval('PB_REC=window.__spRec; PB_REC_DONE=true; PB_REC_STATE=spState()'); };
      setRec(REC); w.eval('SP_KEEP=null'); w.localStorage.removeItem(KK); await redraw();
      const lockedTxt = () => txt(elOf(P).querySelector('[data-sp-phase]'));
      const want1 = recDrawn(REC), got1 = drawn(P) || '';
      /* (app v113) one short line, "Locked since Sun 6:20 PM ET.", where it said whose set it is, when the props job
         published it and that Refresh odds no longer changes it */
      chk(phaseOf(P) === 'locked' && lockedTxt() === 'Locked since Sun 6:20 PM ET.' && !!elOf(P).querySelector('[data-sp-phase] .sp-lockmark') && !WHY_GONE.test(txt(elOf(P))),
        'from the lock, the made-up Sunday night game does not show the site\'s locked set marked Locked in one short line: ' + (elOf(P) ? lockedTxt() : 'no set'));
      chk(got1 === want1, `from the lock the tab does not draw the record's entry as it stands: ${got1} / want ${want1}`);
      chk(w.eval('spTier')(`${P.id}:med`) && w.eval('spTier')(`${P.id}:med`).legs.map(l => l.pid).sort().join() === [wr1, rb1, te1].map(l => l.pid).sort().join(), 'the card would not finish the locked Medium on the record\'s legs');
      /* ---- (app v118) the unit's Elo picks from the lock (the owner's call of 19 October 2026: locked, kept and recorded
         with the set). The record's entry above carries none, as the props job's did before app v118: the page builds
         its own once, on the lines at hand (no made-up player is rated, so four empty levels, each saying why), keeps them
         in this browser beside the record's set (props_sp_lock_v1's elo, eloOwn and eloAt, never S) and says so in one
         line under the Elo picks' heading; read back from the browser, as a reload reads it, the same. A kept copy with
         legs (planted in the browser, as an earlier load would have left it) is drawn as kept, its chance the builder's
         sums on its legs' Elo chances, its price theirs, its fair chance the one kept; the card finishes it as an Elo pick.
         The record's own Elo picks, once an entry carries them, take over from the browser's: drawn as the record has
         them, the line gone, the browser's copy dropped ---- */
      const SPHx = SPH, ELO_OWN_LINE = 'This browser’s own Elo picks: the site’s were not published in time, so the record does not grade them.';
      const eloLine = () => { const x = elOf(P) && elOf(P).querySelector(':scope > [data-sp-phase="eloown"]'); return x ? txt(x) : null; };
      const keptE = () => { try { const k = JSON.parse(w.localStorage.getItem(KK) || 'null'); return k && k.games ? k.games[P.id] || null : null; } catch (e) { return null; } };
      const ELO_NONE = w.eval('PB_TIERS').map(t => `elo-${t[0]} none: Only 0 players in this game qualify: this level takes ${t[2]}.`).join(' / ');
      /* a kept Elo pick as the record and the browser keep it (spTierOut's shape): each leg its Elo chance beside the
         model's, its thin and market null; the level's chance and price checked only for shape (the page works them
         again on the legs) */
      const outE = (l, pe) => ({ ...out(l, 0.5), pe, thin: null, market: null });
      const TE = (id, label, n, floor, lp, extra) => { const legs = lp.map(([l, pe]) => outE(l, pe)), p0 = lp.reduce((a, [, pe]) => a * pe, 1), d0 = lp.reduce((a, [l]) => a * (l.price > 0 ? 1 + l.price / 100 : 1 + 100 / -l.price), 1);
        return { id, label, n, floor, legs, p: Math.round(p0 * 1e4) / 1e4, fair: 0.3, fair_est: false, dec: Math.round(d0 * 1e3) / 1e3, likeliest: false, thin: 0, mkt: 0, ...(extra || {}) }; };
      const TW = (id, label, n, floor, why, extra) => ({ id, label, n, floor, why, ...(extra || {}) });
      const eloKeptDrawn = list => list.map(t => { if (!t.legs) return `${t.id} none: ${t.why}`; const e = SPHx.eloSumsOwn(t.legs.map(l => ({ ...l, key: `${l.gid}|${l.pid}|${l.stat}` })));
        return `${t.id}: ` + t.legs.map(l => `${l.name} ${l.label} ${pc(l.pe)}`).sort().join(' + ') + ` | ${pc(t.fair)} | Elo says ${pc(e.p)} | ${mlOwn(e.d)}`; }).join(' / ');
      const ELO_KEPT = [TE('elo-safe', 'Safe', 2, 0.35, [[wr3, 0.55], [qb1, 0.66]]), TE('elo-med', 'Medium', 3, 0.25, [[wr1, 0.61], [rb1, 0.6], [byTag('P20-WR4'), 0.52]]),
        TW('elo-aggr', 'Aggressive', 4, 0.12, 'Only 3 players in this game qualify: this level takes 4.'), TW('elo-xtrm', 'Extreme', 5, 0.05, 'Only 3 players in this game qualify: this level takes 5.')];
      const ELO_REC = [TE('elo-safe', 'Safe', 2, 0.35, [[wr2, 0.66], [rb2, 0.64]]), TE('elo-med', 'Medium', 3, 0.25, [[wr1, 0.6], [rb1, 0.58], [te1, 0.55]]),
        TW('elo-aggr', 'Aggressive', 4, 0.12, 'Only 3 players in this game qualify: this level takes 4.'), TW('elo-xtrm', 'Extreme', 5, 0.05, 'Only 3 players in this game qualify: this level takes 5.')];
      const RECE = JSON.parse(JSON.stringify(REC)); RECE.prime[Object.keys(RECE.prime)[0]].elo = JSON.parse(JSON.stringify(ELO_REC));
      { const ge = keptE(), dE = drawnElo(P);
        chk(eloLine() === ELO_OWN_LINE && dE === ELO_NONE && !!ge && ge.eloOwn === true && Array.isArray(ge.elo) && ge.elo.map(t => t.id).join() === PB_TIERS_OWN.map(x => 'elo-' + x).join() && !ge.own
          && Date.parse(ge.eloAt) >= lockP + 60e3 && Date.parse(ge.eloAt) < lockP + 120e3 && !JSON.stringify(w.eval('S')).includes('eloOwn'),
          'from the lock, with the record\'s set and no Elo picks of its, the page does not build its own Elo picks once (on the lines at hand, four empty levels here), keep them in this browser outside S and say so in one line: ' + JSON.stringify({ line: eloLine(), drawn: dE, kept: ge && { eloOwn: ge.eloOwn, ids: (ge.elo || []).map(t => t.id), at: ge.eloAt, own: ge.own } }));
        SPHx.blocksHeld('a made-up Sunday night game locked with the record\'s set and this browser\'s own Elo picks', P, w.eval('spShown')(P), elOf(P));
        w.eval('SP_KEEP=null'); await redraw();
        chk(drawnElo(P) === dE && eloLine() === ELO_OWN_LINE, 'the Elo picks this browser kept at the lock are not the same read back from the browser: ' + drawnElo(P)); }
      /* the browser's copy with legs, as an earlier load left it */
      { const k = JSON.parse(w.localStorage.getItem(KK)); k.games[P.id].elo = JSON.parse(JSON.stringify(ELO_KEPT)); k.games[P.id].eloAt = isoS(lockP + 30e3); w.localStorage.setItem(KK, JSON.stringify(k));
        w.eval('SP_KEEP=null'); await redraw();
        const want = eloKeptDrawn(ELO_KEPT), t = w.eval('spTier')(`${P.id}:elo-med`);
        chk(drawnElo(P) === want && eloLine() === ELO_OWN_LINE && !!t && t.elo === true && t.legs.map(l => l.pid).sort().join() === ELO_KEPT[1].legs.map(l => l.pid).sort().join() && t.legs.every(l => l.pe != null),
          `the Elo picks kept in this browser are not drawn as kept (each leg's Elo chance, the chance the builder's sums on them, the fair chance kept), or the card would not finish them as an Elo pick: ${drawnElo(P)} / want ${want}`);
        SPHx.eloCardsHeld('a made-up Sunday night game, its Elo picks as this browser kept them', P, w.eval('spShown')(P).elo, elOf(P), false);
        /* Finish on the kept Medium: the card names it an Elo pick of the game, on the Elo chance (the tab drawn whole
           first, as its half-minute look would at the clock moved to the lock: the card opens nothing from a tab drawn
           before a kickoff since, the Thursday game's) */
        w.eval('renderParlay()'); await wait(30);
        const fb = elOf(P).querySelector(`[data-pc-finish="sp|${P.id}:elo-med"]`); if (fb) { fb.click(); await wait(40); }
        const view = d.getElementById('pcView'), ch = view ? txt(view.querySelector('.pc-chance')) : '', e = SPHx.eloSumsOwn(ELO_KEPT[1].legs.map(l => ({ ...l, key: `${l.gid}|${l.pid}|${l.stat}` })));
        chk(!!fb && !d.getElementById('pcModal').hidden && txt(view).includes(`Medium Elo pick · ${P.a} at ${P.h}`) && ch.startsWith(`Fair chance all 3 land ${pct1(0.3)} Elo says ${pct1(e.p)} · the price says `),
          'Finish on the kept Medium Elo pick does not open its card as an Elo pick of the game on the Elo chance: ' + (view ? txt(view).slice(0, 200) : 'no card'));
        w.eval('PARLAY_CARD.close()'); await wait(20); }
      /* the record's own Elo picks */
      setRec(RECE); await redraw();
      { const ge = keptE(), want = eloKeptDrawn(ELO_REC);
        chk(drawnElo(P) === want && eloLine() === null && !(ge && (ge.eloOwn || ge.elo)),
          `once the record's entry carries its Elo picks, the tab does not draw them as the record has them, or still says or keeps this browser's own: ${drawnElo(P)} / want ${want} / kept ${JSON.stringify(ge && { eloOwn: ge.eloOwn, elo: !!ge.elo })}`);
        SPHx.blocksHeld('a made-up Sunday night game locked with the record\'s set and Elo picks', P, w.eval('spShown')(P), elOf(P)); }
      /* a press after the lock (new prices too: the live set would move) changes nothing of it */
      const lockedNow = drawn(P); w.__sp2.L.find(l => l.pid === 'P20-WR2').price = 150; w.eval('ESPN_SEQ++; espnRedraw()'); await wait(40);
      chk(drawn(P) === lockedNow && phaseOf(P) === 'locked', 'a Refresh odds press after the lock, with new prices, changed the site\'s locked set: ' + drawn(P));
      w.__sp2.L.find(l => l.pid === 'P20-WR2').price = -120;
      /* ruled out after the lock: TE1, in the Medium alone, Out on the report. That level alone is built again
         from the lines at hand (none on him), marked Updated with his name and when, said to be the page's own
         change and kept in this browser beside the set; the other levels as the record has them */
      const INJ = w.eval('INJ'); INJ[te1.pid] = { k: 'out', s: 'Out' }; await redraw();
      /* (app v118) the record's Elo Medium holds him too: that level alone is built again (on the lines at hand, which
         make no Elo pick here: empty, saying why), marked Updated in this browser and kept beside the set's own */
      { const c = elOf(P) && elOf(P).querySelector('.pb-tiers[data-sp-kind="elo"] > .pb-tier.elo-med'), u = c && c.querySelector('[data-sp-upd]'), ge = keptE(), r = ge && ge.rep && ge.rep['elo-med'];
        const others = drawnElo(P).split(' / ').filter(x => !x.startsWith('elo-med')), wantO = eloKeptDrawn(ELO_REC).split(' / ').filter(x => !x.startsWith('elo-med'));
        chk(!!c && c.classList.contains('none') && txt(c.querySelector('.pb-why')) === 'Only 0 players in this game qualify: this level takes 3.' && !!u && u.dataset.spUpd === te1.pid && !!r && r.pid === te1.pid
          && txt(u) === `Updated in this browser: ${te1.name} held out (${etSay(Date.parse(r.at))}); this level was built again.` && others.join(' / ') === wantO.join(' / '),
          `with ${te1.name} ruled out after the lock, the record's Elo Medium (which holds him) is not built again alone, marked Updated in this browser and kept: ` + JSON.stringify({ drawn: drawnElo(P), upd: u ? txt(u) : null, kept: r || null })); }
      const medC = () => elOf(P).querySelector('.pb-tier.med'), upd = () => medC() && medC().querySelector('[data-sp-upd]'), medT = () => w.eval('spTier')(`${P.id}:med`), kept = () => { try { return JSON.parse(w.localStorage.getItem(KK) || 'null'); } catch (e) { return null; } };
      { const m = medT(), q = qualOwn({ k: { ml: true, ats: true, total: true, over: true, under: true }, off: [] }, [P]), okSet = new Set([...q.pref, ...q.thin, ...q.mkt].map(legId)), k1 = kept();
        const others = lockedNow.split(' / ').filter(s => !s.startsWith('med')), now = (drawn(P) || '').split(' / ').filter(s => !s.startsWith('med'));
        chk(!!m && m.legs.length === 3 && m.legs.every(l => l.gid === P.id && l.pid !== te1.pid && okSet.has(legId(l))) && !!upd() && upd().dataset.spUpd === te1.pid
          && !!k1 && !!k1.games[P.id] && !!k1.games[P.id].rep.med && Date.parse(k1.games[P.id].rep.med.at) >= lockP + 60e3 && Date.parse(k1.games[P.id].rep.med.at) < lockP + 120e3
          && txt(upd()) === `Updated in this browser: ${te1.name} held out (${etSay(Date.parse(k1.games[P.id].rep.med.at))}); this level was built again.` && now.join(' / ') === others.join(' / ')
          && !!k1 && k1.v === 1 && +k1.season === SEAS && !!k1.games[P.id] && k1.games[P.id].kickoff === isoS(kickP) && k1.games[P.id].rep.med && k1.games[P.id].rep.med.pid === te1.pid && !k1.games[P.id].own,
          `with ${te1.name} ruled out after the lock, the Medium alone is not built again without him and marked Updated as the page's change, kept in this browser, the other levels as locked: ` + JSON.stringify({ med: m && m.legs.map(l => l.pid), upd: upd() ? txt(upd()) : null, kept: k1 && k1.games[P.id] }));
        /* read again from the browser, as a reload reads it: the same Medium */
        const medNow = drawn(P); w.eval('SP_KEEP=null'); await redraw();
        chk(drawn(P) === medNow, 'the Medium the page built again for a player ruled out is not the same when read back from the browser: ' + drawn(P)); }
      /* the record's own replacement for the same player (the props job's run before kickoff) takes over from the page's */
      { const R2 = JSON.parse(JSON.stringify(RECE)), e = R2.prime[Object.keys(R2.prime)[0]];
        e.tiers[1] = T('med', 'Medium', 3, 0.25, [wr1, rb1, qb1], 0.21, 0.18, 7.1, { updated: { pid: te1.pid, name: te1.name, reason: 'Out on the report', at: isoS(lockP + 30e3) } });
        /* (app v118) and its Elo Medium, the record's own replacement for him too */
        e.elo[1] = TE('elo-med', 'Medium', 3, 0.25, [[wr1, 0.6], [rb1, 0.58], [qb1, 0.57]], { updated: { pid: te1.pid, name: te1.name, reason: 'Out on the report', at: isoS(lockP + 30e3) } });
        setRec(R2); await redraw();
        { const c = elOf(P) && elOf(P).querySelector('.pb-tiers[data-sp-kind="elo"] > .pb-tier.elo-med'), u = c && c.querySelector('[data-sp-upd]'), ge = keptE();
          chk(drawnElo(P) === eloKeptDrawn(e.elo) && !!u && txt(u) === `Updated: ${te1.name} Out on the report (${etSay(lockP + 30e3)}); this level was built again.` && !(ge && ge.rep && ge.rep['elo-med']),
            'the record\'s own replacement of its Elo Medium for the same player does not take over from the page\'s, or the page\'s is still kept: ' + JSON.stringify({ drawn: drawnElo(P), upd: u ? txt(u) : null })); }
        const m = medT(), k2 = kept();
        chk(!!m && m.legs.map(l => l.pid).sort().join() === [wr1, rb1, qb1].map(l => l.pid).sort().join() && !!upd() && txt(upd()) === `Updated: ${te1.name} Out on the report (${etSay(lockP + 30e3)}); this level was built again.`
          && !(k2 && k2.games[P.id] && k2.games[P.id].rep && k2.games[P.id].rep.med),
          'the record\'s own replacement of the Medium for the same player does not take over from the page\'s, or the page\'s is still kept: ' + JSON.stringify({ med: m && m.legs.map(l => l.pid), upd: upd() ? txt(upd()) : null, kept: k2 && k2.games[P.id] })); }
      delete INJ[te1.pid];
      /* no entry for the game in the record: the page builds the set once, says it is not the site's locked set,
         and keeps it in this browser (outside S); a reload, a press and new prices leave it as it was */
      setRec({ entries: {} }); w.eval('SP_KEEP=null'); w.localStorage.removeItem(KK); await redraw();
      const own0 = drawn(P), k3 = kept(), fresh = w.eval('SP_CACHE=new Map(); spSet')(P.id);
      chk(phaseOf(P) === 'own' && lockedTxt() === 'Locked since Sun 6:20 PM ET.' + OWN_LINE
        && !!k3 && !!k3.games[P.id] && k3.games[P.id].own === true && k3.games[P.id].tiers.length === 4 && k3.games[P.id].kickoff === isoS(kickP)
        && fresh.tiers.every(t => { const s = k3.games[P.id].tiers.find(x => x.id === t.id); return t.legs ? !!s && Array.isArray(s.legs) && s.legs.map(l => l.pid + l.stat).sort().join() === t.legs.map(l => l.pid + l.stat).sort().join() : !!s && !s.legs; })
        && !JSON.stringify(w.eval('S')).includes('"own":true') && w.eval('typeof S.sp') === 'undefined',
        'with no locked set in the record, the page does not build the set once, say it is not the site\'s, and keep it in this browser outside S: ' + (elOf(P) ? lockedTxt() : 'no set') + ' ' + JSON.stringify(k3 && Object.keys(k3.games || {})));
      w.__sp2.L.find(l => l.pid === 'P20-WR2').price = 150; w.__sp2.L.find(l => l.pid === 'P20-RB2').p = 0.66;
      w.eval('SP_KEEP=null; ESPN_SEQ++; espnRedraw()'); await wait(40);
      chk(drawn(P) === own0 && phaseOf(P) === 'own', 'the set the page built at the lock moved with a reload, a press and new prices: ' + drawn(P));
      w.__sp2.L.find(l => l.pid === 'P20-WR2').price = -120; w.__sp2.L.find(l => l.pid === 'P20-RB2').p = 0.6;
      /* after kickoff the game leaves the tab, and the next write of the key (the Monday game's own set, at its
         lock, with no entry in the record) prunes its kept copy */
      at(etKick(Z) - 2 * 3600e3 + 60e3); w.eval('SP_KEEP=null'); await redraw();
      const k4 = kept();
      chk(!elOf(P) && phaseOf(Z) === 'own' && !!k4 && !k4.games[P.id] && !!k4.games[Z.id], 'once the made-up Sunday night game kicked off, its set is still on the tab or its kept copy was not pruned at the next write: ' + JSON.stringify(k4 && Object.keys(k4.games || {})));
      /* ---- the night rule on the made-up games, spOn put back (app v112). The rule's own copy (nightOwn) gives
         what the tab sets out at each moment; the hand values beside it (the dates and 6:00 AM Eastern, EST in
         January, 11:00 UTC) hold that copy to what the fixture is for. A Monday doubleheader's second game (A25 at
         H25, 8:30 pm, no lines) is laid in for the Monday night, and taken out after ---- */
      if (keep.on) {
        w.__spOnBack = keep.on; w.eval('spOn=window.__spOnBack; SP_KEEP=null; SP_SHOWN=null'); w.localStorage.removeItem(KK); setRec({ entries: {} });
        const Z2 = mk(25, '2099-01-05', '20:30'), TNm = w.eval('TEAM_NAMES'), ids = a => a.map(g => g.id).join();
        const N_at = ms => nightOwn(G2.filter(g => etKick(g) > ms), Sx.sched, ms);
        const onTab = () => [...d.querySelectorAll(`${SEC_NIGHT} .sp-game[data-sp-game]`)].map(x => x.dataset.spGame).join();
        const view = async ms => { at(ms); w.eval('SP_CACHE=new Map(); renderParlay()'); await wait(30); };
        /* the tab at that moment against the rule: the games set out (drawn, spOn and spState's on= token), the wait
           line where the night is not up, and no level of a game off the tab finished (spTier) */
        const held = (what, ms, hand) => { const N = N_at(ms), want = ids(N.on), wh = waitHeld(d, N, Sx.sched, TNm), st = String(w.eval('spState()')).split(',');
          chk(ids(hand.on) === want && (!hand.next || ids(N.games) === ids(hand.next)) && (hand.open === undefined || N.open === hand.open) && (!hand.say || waitOwn(N, Sx.sched, TNm) === hand.say),
            `made-up games, ${what}: the smoke's own night rule gives ${want || 'none'} on the tab (next ${ids(N.games)}, up ${N.open != null ? isoOwn(N.open) : 'at once'}), not what the fixture is for: ${ids(hand.on) || 'none'}${hand.open !== undefined ? ' up ' + isoOwn(hand.open) : ''}`);
          const hid = G2.filter(g => etKick(g) > ms && primeOwn(g) && !N.on.includes(g)).flatMap(g => PB_TIERS_OWN.filter(id => w.eval('spTier')(`${g.id}:${id}`) != null).map(id => g.id + ':' + id));
          chk(onTab() === want && ids(w.eval('spOn()')) === want && st.includes('on=' + N.on.map(g => g.id).join('+')) && !wh && !hid.length,
            `made-up games, ${what}: Suggested Parlays sets out ${onTab() || 'none'} (spOn ${ids(w.eval('spOn()')) || 'none'}), where the night rule sets out ${want || 'none'}${wh ? '; ' + wh : ''}${hid.length ? '; a level of a game off the tab can be finished: ' + hid.join(', ') : ''}`);
          return N; };
        const UTC6 = day => Date.parse(`${day}T11:00:00Z`);
        try {
          /* the Thursday first: up from the morning after the last prime-time night before it on the schedule (the
             season's own last one; at once if the schedule has none), the Sunday and Monday games off the tab */
          const N0 = N_at(D0.now()), oQ = N0.open;
          if (oQ != null) { await view(oQ - 60e3); held('a minute before the Thursday night game\'s morning', oQ - 60e3, { on: [], next: [Q] }); }
          await view((oQ != null ? oQ : D0.now()) + 60e3); held('from the Thursday night game\'s morning', (oQ != null ? oQ : D0.now()) + 60e3, { on: [Q], next: [Q] });
          chk(!elOf(P) && !elOf(Z), 'made-up games: with the Thursday night game up, the Sunday or Monday night game is on the tab too (stacked)');
          /* from Thursday's kickoff: a line naming Sunday night's game, up Friday 6:00 AM Eastern; its set not built */
          const kQ = etKick(Q) + 60e3; await view(kQ);
          held('after the Thursday night game kicked off', kQ, { on: [], next: [P], open: UTC6('2099-01-02'), say: 'Next up: Sunday night, A20 at H20. Its set goes up Fri 6:00 AM ET, the morning after Thursday night’s game.' });
          chk(!w.eval('[...SP_CACHE.keys()]').some(k => k.startsWith(P.id + '|')) && (!w.PARLAY_CARD || w.PARLAY_CARD.fromTier('sp', `${P.id}:aggr`) == null),
            'made-up games: before its morning the Sunday night game\'s set was built for the tab, or the parlay card finishes one of its levels');
          /* the morning's turn on an open tab: drawn a minute before, the page's own half-minute look a minute after
             finds what it shows stale (only the on= token moved) and redraws it with the Sunday night set */
          const oP = UTC6('2099-01-02'); await view(oP - 60e3); held('a minute before Friday 6:00 AM', oP - 60e3, { on: [], next: [P] });
          chk(w.eval('pbStale()') === false, 'made-up games: a tab just drawn a minute before Friday 6:00 AM is already stale, so the morning\'s turn cannot be told by the on= token');
          at(oP + 60e3); const stale = w.eval('pbStale()'); w.pbWatchTick(); await wait(40);
          held('Friday 6:00 AM, redrawn by the page\'s own look', oP + 60e3, { on: [P], next: [P] });
          chk(stale === true && phaseOf(P) === 'live' && !!d.querySelector(`#spSets [data-pc-finish="sp|${P.id}:aggr"]`) && !!w.eval('spTier')(`${P.id}:aggr`),
            `made-up games: at Friday 6:00 AM an open tab is not redrawn by its own look with the Sunday night game's live set (stale ${stale}, ${phaseOf(P)})`);
          /* the Monday doubleheader: both games off the tab until Monday 6:00 AM, named together, then both set out in
             kickoff order */
          G2.push(Z2); Sx.sched.push(Z2);
          const kP = etKick(P) + 60e3; await view(kP);
          held('after the Sunday night game kicked off', kP, { on: [], next: [Z, Z2], open: UTC6('2099-01-05'), say: 'Next up: Monday night, A24 at H24 and A25 at H25. Their sets go up Mon 6:00 AM ET, the morning after Sunday night’s game.' });
          const oZ = UTC6('2099-01-05'); await view(oZ + 60e3);
          held('from Monday 6:00 AM', oZ + 60e3, { on: [Z, Z2], next: [Z, Z2] });
          chk(phaseOf(Z) === 'live' && phaseOf(Z2) === 'live' && !!w.eval('spTier')(`${Z.id}:safe`), 'made-up games: from Monday 6:00 AM the Monday doubleheader\'s two sets are not both live on the tab, or the first one\'s Safe cannot be finished');
        } finally {
          const i2 = G2.indexOf(Z2); if (i2 >= 0) G2.splice(i2, 1); const j2 = Sx.sched.indexOf(Z2); if (j2 >= 0) Sx.sched.splice(j2, 1); delete w.__spOnBack; }
      }
    } finally {
      w.Date = D0; Sx.sched.splice(Sx.sched.length - G2.length, G2.length);
      w.__spKeep = keep; w.eval('pbGames=window.__spKeep.pb[0]; pricedLegs=window.__spKeep.pb[1]; PB_REC=window.__spKeep.rec; PB_REC_DONE=window.__spKeep.done; SP_KEEP=null');
      if (keep.on) w.eval('spOn=window.__spKeep.on');
      if (keep.slot) w.eval('spSlotNext=window.__spKeep.slot');
      w.eval(`(function(){ const k=${keep.dk}; if(k===null) delete PAY.dk; else PAY.dk=k; S.parlay=${keep.parlay}; save(); })()`);
      if (keep.key == null) w.localStorage.removeItem(KK); else w.localStorage.setItem(KK, keep.key);
      delete w.__sp2; delete w.__spKeep; delete w.__spRec;
      w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); renderParlay(); renderSp()'); await wait(30);
      tabBtn('parlay').click(); await wait(40); } }
  /* ---- (app v118) the Sunday slot on made-up games of its own (the owner's calls of 19 October 2026: "I would like it to
     have ELO picks for the slot of Sunday games", then "do a separate section for night games and then the sunday slot of
     games"). The schedule is replaced wholesale for the block by one of the smoke's own (and pbGames and pricedLegs stood
     in for, the record and the browser's kept copy too, each put back whatever happens), so it holds on any day, the
     off-season included: in the page's first week, a Thursday night game, a Saturday game, four Sunday games (a 9:30 am
     game abroad, two at 1:00 pm laid in the schedule in the other order from their ids, a 4:25 pm one), a Sunday game at
     7:00 pm and a Monday night game; in its next week, a Thursday night game and two Sunday afternoon games. A line each
     on the Saturday and the Sunday 7:00 pm games better than any of the slot's, so a slot that took them would show it.
     The rule worked out here (slotNextOwn) gives the slot at each moment, the hand values beside it holding that copy to
     what the fixture is for: the four Sunday games before 7:00 pm in kickoff order and the schedule's on the tie, up from
     6:00 AM Eastern on the Friday (the morning after Thursday night's game), locked 2 hours before the 9:30 am kickoff,
     under way from it, gone from the 4:25 pm kickoff, when the next week's slot's wait line takes its place. At each
     moment the page's clock is moved there and the tab drawn: the section's wait line, its unit and line, its set and Elo
     picks held to the rules (holdSet, live; holdLocked, from the lock: the record's set and Elo picks, then this browser's
     own, kept across a reload), the redraw at the morning's turn by the page's own half-minute look (spState's s= token),
     the card's Finish of a level named for the slot, nothing to add or finish under way, and the browser's copy kept to
     the slot's last kickoff, not its first ---- */
  if (hasPb && SPH && holdSetF) { const Sx = w.eval('S'), SEAS = +w.eval('SEASON'), KK = 'props_sp_lock_v1', D0 = w.Date;
    const ws = [...new Set(w.eval('PAY.sched').map(g => +g.w))].sort((a, b) => a - b), W1 = ws[0], W2 = ws.length > 1 ? ws[1] : ws[0] + 1;
    const mk = (n, wk, d0, t0) => ({ id: `2099_${String(wk).padStart(2, '0')}_A${n}_H${n}`, w: wk, a: 'A' + n, h: 'H' + n, d: d0, t: t0 });
    const TN1 = mk(41, W1, '2099-01-01', '20:15'), X1 = mk(42, W1, '2099-01-03', '16:30'), S1 = mk(43, W1, '2099-01-04', '09:30'), S2 = mk(44, W1, '2099-01-04', '13:00'), S3 = mk(45, W1, '2099-01-04', '13:00');
    const S4 = mk(46, W1, '2099-01-04', '16:25'), N1 = mk(47, W1, '2099-01-04', '19:00'), M1 = mk(48, W1, '2099-01-05', '20:15'), TN2 = mk(51, W2, '2099-01-08', '20:15'), T1 = mk(52, W2, '2099-01-11', '13:00'), T2 = mk(53, W2, '2099-01-11', '16:05');
    const SCHED = [TN1, X1, S1, S3, S2, S4, N1, M1, TN2, T1, T2];
    const leg = (g, tag, grp, team, stat, k, p, price, label) => ({ key: `${g.id}|${tag}|${stat}`, gid: g.id, pid: tag, stat, k, side: 'over', main: false, p, price, src: 'real', mu: null,
      name: tag.startsWith('team:') ? 'Made-up ' + tag.slice(5) : 'Slot ' + tag.split('-')[1], pos: grp === 'TEAM' ? 'Game' : grp, grp, team, opp: team === g.h ? g.a : g.h, week: g.w, label });
    const LS = [leg(S1, 'team:H43', 'TEAM', S1.h, 'ml', 0, 0.6, -125, 'To win'), leg(S1, 'team:H43', 'TEAM', S1.h, 'ats', -3.5, 0.56, -110, 'To cover -3.5'), leg(S1, 'S43-WR1', 'WR', S1.h, 'receiving_yards', 60, 0.58, -105, '60+ rec yds'),
      leg(S3, 'team:H45', 'TEAM', S3.h, 'ml', 0, 0.62, -140, 'To win'), leg(S3, 'S45-RB1', 'RB', S3.a, 'rushing_yards', 50, 0.59, -110, '50+ rush yds'),
      leg(S2, 'team:H44', 'TEAM', S2.h, 'ml', 0, 0.57, -110, 'To win'), leg(S2, 'S44-QB1', 'QB', S2.a, 'passing_yards', 240, 0.56, 105, '240+ pass yds'),
      leg(S4, 'team:H46', 'TEAM', S4.h, 'ml', 0, 0.58, -115, 'To win'), leg(S4, 'S46-TE1', 'TE', S4.h, 'receptions', 4, 0.55, 110, '4+ rec'),
      /* (app v121) every level of the slot is one game's legs (the owner, 19 October 2026: "the legs need to be part of
         the same game parlay only"), so the 4:25 pm game is given legs enough for every level (five players and its
         side), among them its quarterback's passing touchdowns and a teammate's touchdown, a pair DraftKings refuses;
         the other games make two legs each at most, and the likeliest pair across the slot's games (two of their money
         lines, both Value picks) lands likelier than any one game's, so a slot built across its games would show it */
      leg(S4, 'S46-WR3', 'WR', S4.h, 'receiving_yards', 70, 0.6, -110, '70+ rec yds'), leg(S4, 'S46-RB4', 'RB', S4.a, 'rushing_yards', 60, 0.57, 100, '60+ rush yds'),
      leg(S4, 'S46-QB5', 'QB', S4.h, 'passing_tds', 2, 0.62, -105, '2+ pass TDs'), leg(S4, 'S46-WR6', 'WR', S4.h, 'any_td', 1, 0.6, 105, 'Scores a touchdown')];
    const LO = [leg(X1, 'team:H42', 'TEAM', X1.h, 'ml', 0, 0.7, -105, 'To win'), leg(N1, 'team:H47', 'TEAM', N1.h, 'ml', 0, 0.7, -105, 'To win'), leg(T1, 'team:H52', 'TEAM', T1.h, 'ml', 0, 0.6, -120, 'To win'), leg(T2, 'team:H53', 'TEAM', T2.h, 'ml', 0, 0.6, -120, 'To win')];
    const keep = { sched: Sx.sched, pb: w.eval('[pbGames, pricedLegs]'), dk: w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)'), rec: w.eval('PB_REC'), done: w.eval('PB_REC_DONE'), key: w.localStorage.getItem(KK), parlay: w.eval('JSON.stringify(S.parlay)') };
    const at = ms => { const sh = ms - D0.now(); w.Date = class extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() + sh); } static now() { return D0.now() + sh; } }; };
    const isoS = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z'), pc = v => (v * 100).toFixed(0) + '%', mlOwn = dec => dec >= 2 ? '+' + Math.round((dec - 1) * 100) : '-' + Math.round(100 / (dec - 1));
    const unitOf = ms => slotNextOwn(ws, SCHED, ms, SEAS), elS = id => d.querySelector(`${SEC_SLOT} .sp-game[data-sp-game="${id}"]`);
    const phaseLine = id => { const x = elS(id) && elS(id).querySelector(':scope > [data-sp-phase]'); return x ? `${x.dataset.spPhase} ${txt(x)}` : null; };
    const view = async ms => { at(ms); w.eval('SP_CACHE=new Map(); SP_SHOWN=null; renderParlay()'); await wait(40); };
    const sToken = () => (String(w.eval('spState()')).split(',').find(x => x.startsWith('s=')) || '');
    const drawnS = (id, k) => { const el = elS(id); return el ? [...el.querySelectorAll(`.pb-tiers[data-sp-kind="${k}"] > .pb-tier`)].map(c => c.classList.contains('none') ? c.className.split(' ')[1] + ' none: ' + txt(c.querySelector('.pb-why'))
      : `${c.dataset.pbTier}: ${[...c.querySelectorAll('.pb-legs li')].map(li => legNameOf(li.querySelector('.nm')) + ' ' + txt(li.querySelector('.nm small')) + (k === 'elo' ? ' ' + txt(li.querySelector('.pr em')) : '')).sort().join(' + ')} | ${txt(c.querySelector('.pb-chance b'))} | ${txt(c.querySelector('.pb-chance small'))} | ${txt(c.querySelector('.pb-nums > div:nth-child(2) b'))}`).join(' / ') : null; };
    /* the record's slot entry (made up) as the props job keeps one: the model's levels and the Elo picks', each leg on the
       slot's games */
    const out = (l, extra) => ({ gid: l.gid, week: l.week, pid: l.pid, team: l.team, grp: l.grp, stat: l.stat, k: l.k, side: l.side, main: l.main, price: l.price, src: l.src, name: l.name, label: l.label, p: l.p, fair: 0.5, fair_est: false, thin: true, market: false, ...(extra || {}) });
    const decs = ls => ls.reduce((a, l) => a * (l.price > 0 ? 1 + l.price / 100 : 1 + 100 / -l.price), 1), prodP = (ls, f) => ls.reduce((a, l) => a * f(l), 1);
    const TM = (id, label, n, floor, ls) => ({ id, label, n, floor, legs: ls.map(l => out(l)), p: Math.round(prodP(ls, l => l.p) * 1e4) / 1e4, fair: 0.3, fair_est: false, dec: Math.round(decs(ls) * 1e3) / 1e3, likeliest: false, thin: ls.length, mkt: 0 });
    const TE = (id, label, n, floor, lp) => ({ id, label, n, floor, legs: lp.map(([l, pe]) => out(l, { pe, thin: null, market: null })), p: Math.round(prodP(lp, x => x[1]) * 1e4) / 1e4, fair: 0.25, fair_est: false, dec: Math.round(decs(lp.map(x => x[0])) * 1e3) / 1e3, likeliest: false, thin: 0, mkt: 0 });
    const TW = (id, label, n, floor, why) => ({ id, label, n, floor, why });
    const [mlS1, , wrS1, mlS3, rbS3, mlS2, qbS2, mlS4, teS4, wrS4, rbS4] = LS;
    const sumsM = t => { const L = w.eval('pbOrder')(t.legs.map(l => ({ ...l, key: `${l.gid}|${l.pid}|${l.stat}` }))); return { p: w.eval('parlayProb')(L).corr, d: w.eval('parlayDec')(L.map(l => ({ leg: l, ml: l.price }))) }; };
    const keptDrawn = (list, k) => list.map(t => { if (!t.legs) return `${t.id} none: ${t.why}`; const e = k === 'elo' ? SPH.eloSumsOwn(t.legs.map(l => ({ ...l, key: `${l.gid}|${l.pid}|${l.stat}` }))) : sumsM(t);
      return `${t.id}: ` + t.legs.map(l => `${l.name} ${l.label}` + (k === 'elo' ? ' ' + pc(l.pe) : '')).sort().join(' + ') + ` | ${pc(t.fair)} | ${k === 'elo' ? 'Elo' : 'model'} says ${pc(e.p)} | ${mlOwn(e.d)}`; }).join(' / ');
    try {
      Sx.sched = SCHED.slice();
      w.__slt = { L: [...LS, ...LO] };
      w.eval('pbGames=function(){ const w0=currentWeek(); return S.sched.filter(g=>+g.w===w0&&!gameStarted(g)&&!hasScore(g)); }; pricedLegs=function(games){ return window.__slt.L.filter(l=>(games||[]).some(g=>g.id===l.gid)&&(isGameLeg(l)||suggestable(l.pid))).map(l=>({...l})); };');
      w.eval(`PAY.dk=${JSON.stringify(dkFixture([...LS, ...LO], new Date(D0.now() - 3600e3).toISOString().slice(0, 16) + 'Z', 'SLOT'))}; PB_REC={entries:{}}; PB_REC_DONE=true; SP_KEEP=null; S.parlay={};`);
      w.localStorage.removeItem(KK);
      tabBtn('suggest').click(); await wait(60);
      /* the rule's own copy against the fixture: the slot's games in order, its id, its morning, its lock, its kickoffs */
      const U0 = unitOf(etKick(TN1) + 60e3), first = etKick(S1), last = etKick(S4);
      chk(!!U0 && U0.id === `${SEAS}_${String(W1).padStart(2, '0')}_SUN` && U0.games.map(g => g.id).join() === [S1, S3, S2, S4].map(g => g.id).join() && U0.open === Date.parse('2099-01-02T11:00:00Z')
        && U0.lock === Date.parse('2099-01-04T12:30:00Z') && U0.first === Date.parse('2099-01-04T14:30:00Z') && U0.last === Date.parse('2099-01-04T21:25:00Z') && U0.prev === '2099-01-01',
        `the Sunday slot's fixture: the smoke's own rule does not give the four Sunday games before 7:00 pm in kickoff order (the schedule's on the tie), up Friday 6:00 AM Eastern, locked 2 hours before the 9:30 am kickoff: ` + JSON.stringify(U0 && { id: U0.id, games: U0.games.map(g => g.id), open: isoOwn(U0.open), lock: isoOwn(U0.lock), first: isoOwn(U0.first), last: isoOwn(U0.last) }));
      const ID = U0 ? U0.id : '', lab = `the made-up Sunday slot (${ID})`;
      /* the night after Thursday's game: not up, its wait line, nothing of it on the tab or finishable */
      await view(etKick(TN1) + 60e3);
      { const U = unitOf(etKick(TN1) + 60e3), sh = slotWaitHeld(d, U, SCHED, W1, false), hand = `Next up: week ${W1}’s Sunday slot, 4 games. Its sets go up Fri 6:00 AM ET, the morning after Thursday night’s game.`;
        chk(!sh && slotWaitOwn(U, SCHED) === hand && sToken() === `s=${ID}:w`, `${lab}, after Thursday night's kickoff: the section is not its wait line, "${hand}", with nothing of the slot drawn (spState ${sToken()}): ` + (sh || ''));
        const fin = PB_TIERS_OWN.flatMap(id => [id, 'elo-' + id]).filter(id => w.eval('spTier')(`${ID}:${id}`) != null);
        chk(!elS(ID) && !d.querySelector(`#spSets [data-sp-add^="${ID}:"], #spSets [data-pc-finish^="sp|${ID}:"]`) && !fin.length && !w.eval('[...SP_CACHE.keys()]').some(k => k.startsWith(ID + '|')),
          `${lab}, before its morning: the slot is drawn, built, or a level of it can be finished (${fin.join(', ') || 'none'})`); }
      /* the morning's turn on an open tab: drawn a minute before, the page's own look a minute after finds it stale (the
         s= token alone moved) and redraws it with the slot live */
      const oS = U0 ? U0.open : 0; await view(oS - 60e3);
      chk(w.eval('pbStale()') === false && sToken() === `s=${ID}:w`, `${lab}: a tab drawn a minute before the slot's morning is already stale, or spState says ${sToken()}`);
      at(oS + 60e3); const stale = w.eval('pbStale()'); w.pbWatchTick(); await wait(60);
      { const U = unitOf(oS + 60e3), sh = slotWaitHeld(d, U, SCHED, W1, false);
        chk(stale === true && !sh && sToken() === `s=${ID}:l` && !!phaseLine(ID) && phaseLine(ID).startsWith('live '), `${lab}: at Friday 6:00 AM an open tab is not redrawn by its own look with the slot live (stale ${stale}, ${sToken()}, ${phaseLine(ID)}): ` + (sh || ''));
        /* live: its set and its Elo picks held to the rules on its own games (none of the Saturday's or the 7:00 pm game's) */
        const nS = holdSetF(lab + ', live', U, true);
        const L0 = w.eval('spSet')(ID), gids = new Set(U.games.map(g => g.id));
        chk(nS >= 3 && L0.tiers.every(t => !t.legs || t.legs.every(l => gids.has(l.gid))), `${lab}: live, the slot builds ${nS} levels, or one holds a leg of a game not in the slot: ` + L0.tiers.map(t => t.legs ? t.legs.map(l => l.gid).join('/') : t.why).join(' | '));
        /* (app v121) one game a level, on the fixture as it was made for it: Safe is the 1:00 pm game's likeliest pair (its
           money line and its back), though the likeliest pair across the slot's games (two money lines, both Value picks,
           of the 9:30 am and the other 1:00 pm game, unrelated) lands likelier, which a slot built across its games took
           until app v121; Medium, Aggressive and Extreme are the 4:25 pm game's, the one game that makes that many legs,
           and none holds its quarterback's passing TDs with his teammate's touchdown (Extreme takes five of its six legs
           for it); worked out here (pairOwn, clashOwn) */
        { const T0 = Object.fromEntries(L0.tiers.map(t => [t.id, t])), sf = T0.safe, cross = pairOwn(mlS1, mlS3, rhoF(mlS1, mlS3)), qbS4 = LS.find(l => l.pid === 'S46-QB5'), tdS4 = LS.find(l => l.pid === 'S46-WR6');
          const one = (t, x) => !!t && !!t.legs && t.legs.length === t.n && t.legs.every(l => l.gid === x.id);
          chk(one(sf, S3) && sf.thin === 1 && cross > sf.corr + 0.003 && ['med', 'aggr', 'xtrm'].every(id => one(T0[id], S4) && !clashPairsOwn(T0[id].legs).length) && clashOwn(qbS4, tdS4) === 'td'
            && T0.xtrm.legs.filter(l => l === qbS4 || l.pid === qbS4.pid || l.pid === tdS4.pid).length === 1,
            `${lab}: live, the slot's levels are not one game's each (Safe the 1:00 pm game's likeliest pair, ${(sf && sf.corr * 100 || 0).toFixed(1)}%, under the two money lines across games, ${(cross * 100).toFixed(1)}%; the rest the 4:25 pm game's, with no pair DraftKings refuses): ` + L0.tiers.map(t => t.id + ' ' + (t.legs ? t.legs.map(l => l.gid.slice(-3) + ' ' + l.name).join('+') : t.why)).join(' | ')); }
        /* Finish on a level: the card names it for the slot */
        const t = L0.tiers.filter(x => x.legs).slice(-1)[0], fb = t && elS(ID).querySelector(`[data-pc-finish="sp|${ID}:${t.id}"]`); if (fb) { fb.click(); await wait(40); }
        const v0 = d.getElementById('pcView');
        chk(!!fb && !d.getElementById('pcModal').hidden && txt(v0).includes(`${t.label} parlay · the Sunday slot`) && t.legs.every(l => txt(v0).includes(l.name)), `${lab}: Finish on its ${t ? t.label : 'level'} does not open the card named for the Sunday slot: ` + (v0 ? txt(v0).slice(0, 160) : ''));
        w.eval('PARLAY_CARD.close()'); await wait(20);
        /* (app v121, the review's round) the 4:25 pm game one player short (its tight end's line taken off the fixture's
           lines, put back after): its side and four players make five legs by count, but its quarterback's passing TDs and
           his teammate's touchdown do not go together, so four on one slip, and no other game of the slot makes more than
           two. So the slot's Extreme is empty and says no five legs of any one game of the slot go together on DraftKings'
           slip (until the round it said "No 5-leg parlay in any one game of the Sunday slot: a parlay takes one game’s
           legs, ...", which is not why), and its Aggressive is the 4:25 pm game's four that do; holdSet holds the rest */
        { const all = w.__slt.L;
          try {
            w.__slt.L = all.filter(l => l !== teS4); w.eval('SP_CACHE=new Map(); SP_SHOWN=null; renderParlay()'); await wait(40);
            const qq = qualOwn(SPH.SPU, [S4]), q4 = [...qq.pref, ...qq.thin, ...qq.mkt];
            holdSetF(lab + ', live, its 4:25 pm game one player short', U, true);
            const T5 = Object.fromEntries((w.eval('spSet')(ID) || { tiers: [] }).tiers.map(t => [t.id, t]));
            chk(maxOwn(q4) === 5 && maxFitOwn(q4) === 4 && !!T5.xtrm && !T5.xtrm.legs && T5.xtrm.why === `No 5 legs of any one game of the Sunday slot go together on DraftKings’ slip: ${CLASH_WHY_OWN}`
              && !!T5.aggr && !!T5.aggr.legs && T5.aggr.legs.length === 4 && T5.aggr.legs.every(l => l.gid === S4.id) && !clashPairsOwn(T5.aggr.legs).length,
              `${lab}: with its 4:25 pm game one player short (${maxOwn(q4)} legs by count, ${maxFitOwn(q4)} that go together, worked out here), the slot's Extreme does not say no five legs of any one game go together on DraftKings' slip, or its Aggressive is not that game's four: ` + (T5.xtrm ? T5.xtrm.why || 'built' : 'none') + ' / ' + (T5.aggr && T5.aggr.legs ? T5.aggr.legs.map(l => l.name).join('+') : T5.aggr ? T5.aggr.why : 'none'));
          } finally { w.__slt.L = all; w.eval('SP_CACHE=new Map(); SP_SHOWN=null; renderParlay()'); await wait(40); } } }
      /* at the lock, the record not read yet: the line says so, and nothing else is drawn */
      at(U0.lock + 60e3); w.eval('PB_REC_DONE=false'); await view(U0.lock + 60e3);
      chk(phaseLine(ID) === 'loading Locked since Sun 7:30 AM ET. Loading the site’s set…' && sToken() === `s=${ID}:k`, `${lab}: at its lock, with the record not read yet, the slot does not say it is reading the site's set (${sToken()}): ${phaseLine(ID)}`);
      SPH.blocksHeld(lab + ', loading', unitOf(U0.lock + 60e3), w.eval('spShown')(unitOf(U0.lock + 60e3)), elS(ID));
      /* the record's slot entry: its set and its Elo picks, drawn as the record has them */
      const takenAt = isoS(U0.lock - 3 * 3600e3);
      /* (app v121) each level one game's legs, as the props job takes the slot's set from now on */
      const TIERS = [TM('safe', 'Safe', 2, 0, [mlS3, rbS3]), TM('med', 'Medium', 3, 0.25, [mlS4, wrS4, rbS4]), TM('aggr', 'Aggressive', 4, 0.12, [mlS4, wrS4, rbS4, teS4]), TW('xtrm', 'Extreme', 5, 0.05, 'No 5-leg parlay in any one game of the Sunday slot: a parlay takes one game’s legs, one leg a player, and one side and one total a game.')];
      const ELO = [TE('elo-safe', 'Safe', 2, 0.35, [[wrS4, 0.64], [rbS4, 0.62]]), TE('elo-med', 'Medium', 3, 0.25, [[wrS4, 0.64], [rbS4, 0.6], [teS4, 0.58]]), TW('elo-aggr', 'Aggressive', 4, 0.12, 'Only 3 players in any one game of the Sunday slot qualify: this level takes 4.'), TW('elo-xtrm', 'Extreme', 5, 0.05, 'Only 3 players in any one game of the Sunday slot qualify: this level takes 5.')];
      const REC = { entries: {}, prime: {}, slot: { [`${SEAS}|${String(W1).padStart(2, '0')}|${isoS(U0.first)}|${ID}`]: { season: SEAS, week: W1, gid: ID, games: U0.games.map(g => g.id), kickoff: isoS(U0.first), last: isoS(U0.last), lock: isoS(U0.lock), baked_at: takenAt, taken_at: takenAt, pool: {}, tiers: TIERS, elo: ELO } } };
      w.__sltRec = REC; w.eval('PB_REC=window.__sltRec; PB_REC_DONE=true'); await view(U0.lock + 60e3);
      const wantM = keptDrawn(TIERS, 'model'), wantE = keptDrawn(ELO, 'elo');
      chk(phaseLine(ID) === 'locked Locked since Sun 7:30 AM ET.' && drawnS(ID, 'model') === wantM && drawnS(ID, 'elo') === wantE,
        `${lab}: from its lock the slot does not draw the record's set and Elo picks as they stand: ${phaseLine(ID)} / ${drawnS(ID, 'model')} / want ${wantM} / ${drawnS(ID, 'elo')} / want ${wantE}`);
      SPH.holdLocked(lab + ', locked, the record\'s', unitOf(U0.lock + 60e3), true);
      { const t = w.eval('spTier')(`${ID}:elo-med`); chk(!!t && t.elo === true && t.game === 'the Sunday slot' && t.legs.map(l => l.pid).sort().join() === [wrS4, rbS4, teS4].map(l => l.pid).sort().join(), `${lab}: locked, the card would not finish the record's Elo Medium for the Sunday slot`); }
      /* (app v121, the review's round) a player ruled out after the slot's lock, on a page left open: the record's Medium is
         the 4:25 pm game's own Medium as the page builds it from these lines (each of the slot's games' sets in the page's
         cache, as an open page keeps them from before the lock: nothing they are signed on moves when a player is ruled
         out), and its first player is then ruled out (Out on the report, planted and put back) with the cache left as it
         is. Every level of the record's that holds him is built again from the lines as they stand: one game's legs of its
         size, none on him and no pair DraftKings refuses, the best of the slot's games' own levels by the slot's rule worked
         out here (slotPickOwn) on each game's set built afresh once the tab is drawn, marked Updated in this browser with
         his name and when, and kept in the browser; every other level as the record has it. Until the round the slot's
         level built again was read off each game's cached set, so it held him still */
      { const U = unitOf(U0.lock + 60e3), INJ = w.eval('INJ'), live = U.games.map(x => w.eval('spSet')(x.id)), i4 = U.games.findIndex(x => x.id === S4.id);
        const med4 = i4 >= 0 && live[i4] ? live[i4].tiers.find(t => t.id === 'med') : null, gone = med4 && med4.legs ? med4.legs.find(l => !/^team:/.test(l.pid)) : null;
        if (!gone) chk(false, `${lab}: the 4:25 pm game's own Medium has no player to rule out: ` + JSON.stringify(med4 && (med4.legs ? med4.legs.map(l => l.pid) : med4.why)));
        else { const R2 = JSON.parse(JSON.stringify(REC)), e2 = R2.slot[Object.keys(R2.slot)[0]], keepI = INJ[gone.pid];
          e2.tiers[1] = TM('med', 'Medium', 3, 0.25, med4.legs);
          const hold = e2.tiers.filter(t => t.legs && t.legs.some(l => l.pid === gone.pid)).map(t => t.id), sigL = ls => (ls || []).map(l => `${l.gid}|${l.pid}|${l.stat}|${l.side}|${+l.k}`).sort().join(',');
          try {
            w.__sltRec2 = R2; w.eval('PB_REC=window.__sltRec2; PB_REC_DONE=true; SP_KEEP=null'); w.localStorage.removeItem(KK);
            INJ[gone.pid] = { k: 'out', s: 'Out' }; w.eval('SP_SHOWN=null; renderParlay()'); await wait(40);
            const K = (() => { try { return JSON.parse(w.localStorage.getItem(KK)); } catch (e) { return null; } })(), rep = (K && K.games && K.games[ID] && K.games[ID].rep) || {}, bad = [];
            const shown = Object.fromEntries(PB_TIERS_OWN.map(id => [id, w.eval('spTier')(`${ID}:${id}`)]));
            /* each game's own set afresh, now, with him out: what the slot's level built again is held to */
            w.eval('SP_CACHE=new Map()'); const fresh = U.games.map(x => w.eval('spSet')(x.id));
            for (const [ti, t] of e2.tiers.entries()) { const c = elS(ID) && elS(ID).querySelector(`:scope > .pb-tiers[data-sp-kind="model"] > .pb-tier.${t.id}`), u = c && c.querySelector('[data-sp-upd]'), now = shown[t.id];
              if (!hold.includes(t.id)) { if (t.legs ? !now || sigL(now.legs) !== sigL(t.legs) : !!(now && now.legs)) bad.push(`${t.id}, which does not hold him, is not the record's`); if (u) bad.push(`${t.id}, which does not hold him, says it was built again`); continue; }
              const levels = fresh.map(f => f && f.tiers[ti]), k = slotPickOwn(levels, t.floor), want = k < 0 ? null : levels[k], r = rep[t.id];
              if (!now || !now.legs || now.legs.length !== t.n || now.legs.some(l => l.pid === gone.pid) || new Set(now.legs.map(l => l.gid)).size !== 1 || !U.games.some(x => x.id === now.legs[0].gid) || clashPairsOwn(now.legs).length)
                bad.push(`${t.id} built again is not ${t.n} legs of one of the slot's games with no pair DraftKings refuses and none on ${gone.name}: ` + (now ? (now.legs ? now.legs.map(l => l.gid.slice(-3) + ' ' + l.name + ' ' + l.label).join(' + ') : now.why) : 'none'));
              else if (!want || sigL(now.legs) !== sigL(want.legs)) bad.push(`${t.id} built again is not the best of the slot's games' own ${t.id} levels by the slot's rule, built afresh: ${sigL(now.legs)} where the rule gives ${want ? sigL(want.legs) : 'none'}`);
              if (!u || u.dataset.spUpd !== gone.pid || !r || r.pid !== gone.pid || txt(u) !== `Updated in this browser: ${gone.name} held out (${etSay(Date.parse(r.at))}); this level was built again.`)
                bad.push(`${t.id} is not marked Updated in this browser for ${gone.name}, and kept: ${u ? txt(u) : 'no line'} / ${JSON.stringify(r ? { pid: r.pid, at: r.at } : null)}`); }
            chk(hold.includes('med') && !bad.length, `${lab}: with ${gone.name}, in the record's Medium (${hold.join(', ')} hold him), ruled out after the lock on a page left open (its games' sets in the cache), the levels that hold him are not built again from the lines as they stand without him, the best of the slot's games' own, marked Updated: ` + bad.slice(0, 3).join('; '));
            SPH.holdLocked(lab + `, locked, the record's, ${gone.name} ruled out after it`, U, true);
          } finally {
            if (keepI) INJ[gone.pid] = keepI; else delete INJ[gone.pid];
            delete w.__sltRec2; w.eval('PB_REC=window.__sltRec; PB_REC_DONE=true; SP_KEEP=null'); w.localStorage.removeItem(KK); await view(U0.lock + 60e3); } } }
      /* no entry for it in the record: the page builds the set once (and its Elo picks), says it is this browser's own,
         keeps it outside S, and a reload shows it again */
      w.eval('PB_REC={entries:{}}; SP_KEEP=null'); w.localStorage.removeItem(KK); await view(U0.lock + 60e3);
      const ownM = drawnS(ID, 'model'), ownE = drawnS(ID, 'elo'), k1 = (() => { try { return JSON.parse(w.localStorage.getItem(KK)); } catch (e) { return null; } })(), g1 = k1 && k1.games && k1.games[ID];
      chk(phaseLine(ID) === 'own Locked since Sun 7:30 AM ET.' + OWN_LINE && !!g1 && g1.own === true && g1.kickoff === isoS(U0.first) && Array.isArray(g1.tiers) && g1.tiers.length === 4 && g1.eloOwn === true && Array.isArray(g1.elo) && g1.elo.length === 4
        && !JSON.stringify(w.eval('S')).includes(ID),
        `${lab}: with no entry in the record the page does not build the slot's set and Elo picks once, say it is this browser's own and keep both outside S: ${phaseLine(ID)} ` + JSON.stringify(g1 && { own: g1.own, kickoff: g1.kickoff, eloOwn: g1.eloOwn }));
      w.eval('SP_KEEP=null'); await view(U0.lock + 60e3);
      chk(drawnS(ID, 'model') === ownM && drawnS(ID, 'elo') === ownE && phaseLine(ID) === 'own Locked since Sun 7:30 AM ET.' + OWN_LINE, `${lab}: the set this browser kept is not the same read back from the browser: ${drawnS(ID, 'model')}`);
      /* under way, from its first kickoff (the 9:30 am game abroad): as it locked, nothing to add or finish, and the
         browser's copy kept, its games not all kicked off */
      await view(U0.first + 60e3);
      chk(drawnS(ID, 'model') === ownM && drawnS(ID, 'elo') === ownE && sToken() === `s=${ID}:u`, `${lab}: under way, the slot is not shown as it locked (${sToken()}): ${drawnS(ID, 'model')}`);
      SPH.holdLocked(lab + ', under way, this browser\'s own', unitOf(U0.first + 60e3), true);
      w.eval('spKeepSave()');
      { const k2 = (() => { try { return JSON.parse(w.localStorage.getItem(KK)); } catch (e) { return null; } })();
        chk(!!k2 && !!k2.games && !!k2.games[ID] && k2.games[ID].own === true, `${lab}: under way (its first game kicked off, its last not), the browser's copy of its set is pruned at a write: ` + JSON.stringify(k2 && Object.keys(k2.games || {}))); }
      /* the record's set under way, drawn as the record has it, nothing to add or finish */
      w.eval('PB_REC=window.__sltRec; SP_KEEP=null'); await view(U0.first + 60e3);
      chk(phaseLine(ID) === 'under Locked since Sun 7:30 AM ET. Under way since Sun 9:30 AM ET.' && drawnS(ID, 'model') === wantM && drawnS(ID, 'elo') === wantE
        && !elS(ID).querySelector('[data-sp-add], [data-pc-finish], [data-pb-leg], .pb-acts'),
        `${lab}: under way, the record's set is not shown as it locked with nothing to add or finish, under one line saying since when: ${phaseLine(ID)} / ${drawnS(ID, 'model')}`);
      SPH.holdLocked(lab + ', under way, the record\'s', unitOf(U0.first + 60e3), true);
      { const fin = PB_TIERS_OWN.flatMap(id => [id, 'elo-' + id]).filter(id => w.eval('spTier')(`${ID}:${id}`) != null || (w.PARLAY_CARD && w.PARLAY_CARD.fromTier('sp', `${ID}:${id}`) != null));
        chk(!fin.length, `${lab}: under way, the card still finishes ${fin.join(', ')}`); }
      /* under way with no entry in the record and nothing kept in this browser: nothing of the page's own is built (its
         games have begun, so a set built now would be of the games left, never locked), one line saying the site's set
         was not published in time, no card, and nothing kept */
      w.eval('PB_REC={entries:{}}; SP_KEEP=null'); w.localStorage.removeItem(KK); await view(U0.first + 60e3);
      { const k4 = (() => { try { return JSON.parse(w.localStorage.getItem(KK)); } catch (e) { return null; } })(), v4 = w.eval('spShown')(unitOf(U0.first + 60e3));
        chk(phaseLine(ID) === 'under Locked since Sun 7:30 AM ET. Under way since Sun 9:30 AM ET. The site’s set was not published in time.' && !elS(ID).querySelector('.pb-tier, .pb-tiers, h5')
          && v4.none === true && v4.tiers === null && v4.elo === null && !(k4 && k4.games && k4.games[ID]),
          `${lab}: under way with no record and nothing kept, the page built a set of its own, or does not say the site's was not published: ${phaseLine(ID)} / ${drawnS(ID, 'model')}`); }
      w.eval('PB_REC=window.__sltRec; SP_KEEP=null');
      /* from its last kickoff: gone, the next week's slot's wait line in its place, and the browser's copy pruned at the
         next write */
      await view(U0.last + 60e3);
      { const U = unitOf(U0.last + 60e3), hand = `Next up: week ${W2}’s Sunday slot, 2 games. Its sets go up Fri 6:00 AM ET, the morning after Thursday night’s game.`, sh = slotWaitHeld(d, U, SCHED, W1, false);
        w.eval('spKeepSave()'); const k3 = (() => { try { return JSON.parse(w.localStorage.getItem(KK)); } catch (e) { return null; } })();
        chk(!!U && U.id === `${SEAS}_${String(W2).padStart(2, '0')}_SUN` && U.games.map(g => g.id).join() === [T1, T2].map(g => g.id).join() && U.open === Date.parse('2099-01-09T11:00:00Z') && slotWaitOwn(U, SCHED) === hand
          && !sh && !elS(ID) && sToken() === `s=${U.id}:w` && !(k3 && k3.games && k3.games[ID]),
          `${lab}: from its last kickoff the slot is still on the tab, the next week's slot's wait line ("${hand}") is not in its place, or its kept copy was not pruned (${sToken()}): ` + (sh || JSON.stringify(k3 && Object.keys(k3.games || {})))); }
    } finally {
      w.Date = D0; Sx.sched = keep.sched;
      w.__sltKeep = keep; w.eval('pbGames=window.__sltKeep.pb[0]; pricedLegs=window.__sltKeep.pb[1]; PB_REC=window.__sltKeep.rec; PB_REC_DONE=window.__sltKeep.done; SP_KEEP=null');
      w.eval(`(function(){ const k=${keep.dk}; if(k===null) delete PAY.dk; else PAY.dk=k; S.parlay=${keep.parlay}; save(); })()`);
      if (keep.key == null) w.localStorage.removeItem(KK); else w.localStorage.setItem(KK, keep.key);
      delete w.__slt; delete w.__sltKeep; delete w.__sltRec;
      w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); SP_SHOWN=null; renderParlay(); renderSp()'); await wait(30);
      tabBtn('parlay').click(); await wait(40); } }
  /* ---- (app v121) the pairs DraftKings refuses, and a link a game, on made-up games of the smoke's own (the owner's calls
     of 19 October 2026: "If your parlay already has a receiver anytime TD, a team total, or the game total, adding the QB's
     passing TD over often gets blocked", "Some combos contradict each other, like QB under 1.5 passing TDs alongside two
     of his receivers to score. The book rejects it outright", then "the legs need to be part of the same game parlay
     only, and anytime there's a mix it bombs the hyperlink. also thinking about maybe adding links for each individual
     one may reduce the issues?"). Two made-up games are put on the schedule for the block (pbGames, pricedLegs, the
     night rule's spOn, the slot's spSlotNext, DraftKings' ids, one correlation and the builder stood in for, each put back
     whatever happens), so it holds on any day, the off-season included: a Monday night game whose quarterback's passing
     TDs and his receiver's touchdown are its two likeliest legs and move together strongly, so the likeliest pair and the
     best Medium a rule with no such pair would take are those two; and a Sunday afternoon game with a money line.
     Worked out here, each on its own: the night game's set holds neither that pair nor any other DraftKings refuses (and
     holdSet holds it to every rule); the builder says so of a pair it holds, word for word (data-pb-clash), the
     passing TDs' over with the game's total too and his under with his teammate's touchdown, and nothing of a parlay
     with none; it says one link a game where its legs mix two legs of one game with a leg of another (data-pb-multigame,
     on the hub only), and nothing of one leg a game; and the parlay card gives that mix a button for each game, its own
     legs' ids in the card's order, every leg's own link, the pairs DraftKings refuses by their numbers, and the Share
     link's text a link for each game; one leg a game one link, as before. (app v123, the owner's call of 20 October 2026:
     "do you think maybe we can add a different color button for all legs parlays on top of the individual ones? id like
     to still test those but have the inidividuals as a fallback plan") On that mix Open in DraftKings is kept, as the
     all-legs link (pc-dkall, the ice button), every leg on the slip in the card's order, in its own words and title, the
     games' buttons right after it as the fallback; the note, the status line once the card has checked DraftKings'
     lines (a stand-in for the page's reader on these made-up games, each answering that DraftKings has posted no
     player lines, so the check is done and the plan as it was), Share link's text (that link first, then each game's)
     and the Tab order say so, and the focus on it while the card checks stays on it; a one-link card's never wears
     the class ---- */
  if (hasPb && holdSetF && SPH) { const Sx = w.eval('S'), cw = w.eval('currentWeek()'), wk2 = String(cw).padStart(2, '0'), KK = 'props_sp_lock_v1';
    const mk = (n, d0, t0) => ({ id: `2099_${wk2}_A${n}_H${n}`, w: cw, a: 'A' + n, h: 'H' + n, d: d0, t: t0 });
    const C1 = mk(61, '2099-01-05', '20:15'), C2 = mk(62, '2099-01-04', '13:00'), C3 = { ...mk(63, '2099-01-05', '20:15'), tot: 44.5, tov: -110, tou: -110 };
    const leg = (g, tag, grp, team, stat, k, p, price, label, extra) => ({ key: `${g.id}|${tag}|${stat}`, gid: g.id, pid: tag, stat, k, side: 'over', main: false, p, price, src: 'real', mu: null,
      name: tag.startsWith('team:') ? 'Made-up ' + tag.slice(5) : 'Pair ' + tag.split('-')[1], pos: grp === 'TEAM' ? 'Game' : grp, grp, team, opp: team === g.h ? g.a : g.h, week: cw, label, ...(extra || {}) });
    /* every leg thin (no Elo rating for a made-up player, and the money line's edge under 3 points), so the likeliest pair
       is the likeliest of all */
    const QB = leg(C1, 'C61-QB1', 'QB', C1.h, 'passing_tds', 2, 0.66, -170, '2+ pass TDs'), TD = leg(C1, 'C61-WR1', 'WR', C1.h, 'any_td', 1, 0.64, -160, 'Scores a touchdown');
    const RB = leg(C1, 'C61-RB1', 'RB', C1.a, 'rushing_yards', 60, 0.58, -125, '60+ rush yds'), TE = leg(C1, 'C61-TE1', 'TE', C1.a, 'receptions', 4, 0.56, -115, '4+ rec');
    const WR2 = leg(C1, 'C61-WR2', 'WR', C1.a, 'receiving_yards', 50, 0.57, -120, '50+ rec yds'), ML1 = leg(C1, 'team:H61', 'TEAM', C1.h, 'ml', 0, 0.58, -130, 'To win');
    const ML2 = leg(C2, 'team:H62', 'TEAM', C2.h, 'ml', 0, 0.58, -130, 'To win');
    const QBU = leg(C1, 'C61-QB1', 'QB', C1.h, 'passing_tds', 1.5, 0.5, 110, 'Under 1.5 passing TDs', { side: 'under', main: true });
    const TOT = { key: `${C1.id}|game|total`, gid: C1.id, pid: 'game', stat: 'total', k: 44.5, side: 'over', main: true, p: 0.5, price: -110, src: 'real', mu: null, name: 'Pair game total', pos: 'Game', grp: 'TEAM', team: C1.a, opp: C1.h, week: cw, label: 'Over 44.5 points' };
    /* and a second Monday night game whose legs with an edge are its money line (a Value pick), its quarterback's
       passing TDs and his teammate's touchdown, with its total posted: three legs with an edge, but no three of them that
       DraftKings takes, so its Medium is the money line, the touchdown and a total (the totals fill what the legs with an
       edge leave to fill with no pair DraftKings refuses), and its Aggressive is empty, the game making three legs that go
       together and no four */
    const QB3 = leg(C3, 'C63-QB1', 'QB', C3.h, 'passing_tds', 2, 0.62, -150, '2+ pass TDs'), TD3 = leg(C3, 'C63-WR1', 'WR', C3.h, 'any_td', 1, 0.6, -140, 'Scores a touchdown'), ML3 = leg(C3, 'team:H63', 'TEAM', C3.h, 'ml', 0, 0.6, -110, 'To win');
    /* (app v121, the review's round) and, for the builder and the card alone (none of them is a line pricedLegs gives, so no
       set takes them): the night game's home side to cover -3.5, which DraftKings has only at -4.5 (the card puts it on
       there), and a player of the Sunday game and one of the second Monday night game with no DraftKings id at all */
    const ATS1 = leg(C1, 'team:H61', 'TEAM', C1.h, 'ats', -3.5, 0.55, -110, 'To cover -3.5'), NOID2 = leg(C2, 'C62-RB9', 'RB', C2.a, 'rushing_yards', 50, 0.57, -110, '50+ rush yds'), NOID3 = leg(C3, 'C63-TE9', 'TE', C3.a, 'receptions', 4, 0.56, -115, '4+ rec');
    const L1 = [QB, TD, RB, TE, WR2, ML1], LALL = [...L1, ML2, QB3, TD3, ML3], CK = 'team|QB:passing_tds|WR:any_td', lab = `a made-up Monday night game (${C1.id}) whose quarterback's passing TDs and receiver's touchdown are its likeliest pair`;
    const keep = { pb: w.eval('[pbGames, pricedLegs]'), dk: w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)'), corr: w.eval(`(function(){ const v=PAY.corr&&PAY.corr[${JSON.stringify(CK)}]; return v===undefined?null:v; })()`), parlay: w.eval('JSON.stringify(S.parlay)'),
      on: w.eval('typeof spOn') === 'function' ? w.eval('spOn') : null, slot: w.eval('typeof spSlotNext') === 'function' ? w.eval('spSlotNext') : null, key: w.localStorage.getItem(KK), card: w.PARLAY_CARD, ref: w.eval('espnRefresh') };
    const read = new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', DKF = dkFixture([...LALL, QBU, TOT, ...['over', 'under'].map(side => ({ gid: C3.id, week: cw, pid: 'game', stat: 'total', k: 44.5, side, main: true }))], read, 'PAIR');
    /* (app v121, the review's round) the Sunday game's lines read six hours before the night games' (its game lines and its
       player prices alike), so a card over both dates each game's link by its own read and its note by the older; and
       DraftKings' spread of the night game's home side at -4.5 alone */
    const read2 = new Date(Date.parse(read) - 6 * 3600e3).toISOString().slice(0, 16) + 'Z';
    Object.assign(DKF[String(cw)][C2.id], { at: read2, glat: read2 }); DKF[String(cw)][C1.id]['team:H61|ats|-4.5'] = 'PAIRATS#team:H61|ats|-4.5';
    const strip = l => { const { key, ...x } = l; return x; }, sortB = ls => [...ls].sort((a, b) => (a.week - b.week) || a.name.localeCompare(b.name));
    const putB = async ls => { w.__prB = Object.fromEntries(ls.map(l => [l.key, strip(l)])); w.eval('S.parlay=JSON.parse(JSON.stringify(window.__prB)); renderParlay()'); await wait(30); };
    const body = () => d.getElementById('parlayBody'), dkUrlOwn = ids => 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(encodeURIComponent).join('+'), idOwn = l => dkOwnId(DKF, l, false);
    /* the builder's note on the pairs, in the page's words, worked out here from the builder's order (the week, then the name) */
    const clashNoteOwn = ls => { const B = sortB(ls), P = clashPairsOwn(B); return !P.length ? null : `DraftKings may refuse ${P.length === 1 ? 'this pair' : 'these pairs'} on one slip: ${P.map(([i, j, k]) => `${B[i].name}, ${B[i].label}, with ${B[j].name}, ${B[j].label} (${CLASH_SAY_OWN[k]})`).join('; ')}.`; };
    /* (app v121, the review's round) what DraftKings' slip takes of each leg, worked out here on the fixture's own ids (the
       card's plan, as far as this fixture goes): DraftKings' id at the leg's own line; else, for a spread, the same team's
       id at DraftKings' closest number (the lower on a tie), the leg going on there (swap, in the card's words: "-4.5");
       else none, the leg added by hand. No press is made in the block, so no read is newer than the fixture's, and every
       other leg here has its id at its own line or none at all. Each leg is dated by the read of its game's ids it is
       looked up in (a team's line and the total by the game lines', a player's by the player prices') */
    const slipOwn = l => { const id = idOwn(l); if (id) return { id, swap: null };
      if (l.stat === 'ats') { const D = ((DKF[String(l.week)] || {})[l.gid]) || {}, pre = `${l.pid}|ats|`, ps = Object.keys(D).filter(k => k.startsWith(pre)).map(k => +k.slice(pre.length)).filter(isFinite).sort((x, y) => (Math.abs(x - l.k) - Math.abs(y - l.k)) || (x - y));
        if (ps.length) return { id: D[pre + dkPt(ps[0])], swap: dkSigned(ps[0]) }; }
      return { id: null, swap: null }; };
    const readAtOwn = l => { const D = ((DKF[String(l.week)] || {})[l.gid]) || {}; return Date.parse(['ml', 'ats', 'total'].includes(l.stat) ? D.glat : D.at); };
    /* the parlay as the card plans it, here: its legs in the builder's order, numbered; those that go on the slip (ok) and
       those that do not (miss); the games of the legs on the slip, in the order their first legs come, each dated by the
       oldest read of its own legs; a mix (multi) where those games are two or more and one of them has two or more legs on
       the slip, so a leg with no DraftKings id counts for nothing; and the read of them all, the oldest */
    const planOwn = ls => { const B = sortB(ls), each = B.map((l, i) => ({ l, n: i + 1, ...slipOwn(l), at: readAtOwn(l) })), ok = each.filter(x => x.id), miss = each.filter(x => !x.id), games = [];
      for (const x of ok) { let G = games.find(y => y.gid === x.l.gid); if (!G) games.push(G = { gid: x.l.gid, ok: [] }); G.ok.push(x); }
      games.forEach(G => { G.read = Math.min(...G.ok.map(x => x.at)); });
      return { B, each, ok, miss, games, gs: games.map(G => G.gid), multi: games.length > 1 && games.some(G => G.ok.length > 1), read: ok.length ? Math.min(...ok.map(x => x.at)) : null }; };
    const readTxtOwn = ms => new Date(ms).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
    /* the builder's line on a same-game parlay mixed with other games, from the plan: the games with legs on the slip alone */
    /* (app v123) DraftKings' betslip may not open that mix as one, so the card gives each game a link of its own beside
       the one for every leg */
    const multiNoteOwn = ls => { const p = planOwn(ls); return p.multi ? `These legs mix a same-game parlay with other games. DraftKings’ betslip may not open that mix as one, so the parlay card gives each of the ${p.games.length} games a link of its own beside one that tries them on one slip.` : null; };
    const notesOf = () => { const c = body() && body().querySelector('[data-pb-clash]'), m = body() && body().querySelector('[data-pb-multigame]');
      return { clash: c ? txt(c) : null, clashN: c ? c.dataset.pbClash : null, multi: m ? txt(m) : null, multiN: m ? m.dataset.pbMultigame : null }; };
    try {
      Sx.sched.push(C1, C2, C3); w.__prG = { G: [C1, C2, C3], L: LALL };
      w.eval('pbGames=function(){ return window.__prG.G.filter(g=>!gameStarted(g)&&!hasScore(g)); }; pricedLegs=function(games){ return window.__prG.L.filter(l=>(games||[]).some(g=>g.id===l.gid)&&(isGameLeg(l)||suggestable(l.pid))).map(l=>({...l})); };');
      if (keep.on) w.eval('spOn=function(){ return spGames(); }');
      if (keep.slot) w.eval('spSlotNext=function(){ return null; }');
      w.eval(`PAY.dk=${JSON.stringify(DKF)}; PAY.corr=PAY.corr||{}; PAY.corr[${JSON.stringify(CK)}]=0.5; S.parlay={}; SP_CACHE=new Map(); PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_SHOWN=null; renderParlay()`);
      tabBtn('suggest').click(); await wait(80);
      /* the night game's set: every rule a set keeps (holdSet, the pairs DraftKings refuses among them); and the fixture as
         it was made, worked out here with no such rule: the likeliest pair the quarterback's passing TDs and the
         touchdown, and the best Medium over its 25% (else the likeliest three) holding both, by the builder's own sums */
      const nB = holdSetF(lab, C1, true), s1 = w.eval('spSet')(C1.id), T1 = s1 ? Object.fromEntries(s1.tiers.map(t => [t.id, t])) : {};
      { const fitsNo = (cur, c) => !cur.some(l => l.key === c.key) && (isGameOwn(c) ? !cur.some(l => isGameOwn(l) && l.gid === c.gid && (l.stat === 'total') === (c.stat === 'total')) : !cur.some(l => !isGameOwn(l) && l.pid === c.pid));
        let bp = -1, bl = null; for (let i = 0; i < L1.length; i++) for (let j = i + 1; j < L1.length; j++) { if (!fitsNo([L1[i]], L1[j])) continue; const pj = pairOwn(L1[i], L1[j], rhoF(L1[i], L1[j])); if (pj > bp) { bp = pj; bl = [L1[i], L1[j]]; } }
        let mb = null, ml = null; for (let i = 0; i < L1.length; i++) for (let j = i + 1; j < L1.length; j++) for (let k = j + 1; k < L1.length; k++) { const ls = [L1[i], L1[j], L1[k]];
          if (!fitsNo([L1[i]], L1[j]) || !fitsNo([L1[i], L1[j]], L1[k])) continue; const O = orderF(ls), pr = ppF(O).corr, dc = w.eval('parlayDec')(O.map(l => ({ leg: l, ml: l.price }))), x = { ls, pr, ev: pr * dc };
          if (!ml || pr > ml.pr) ml = x; if (pr >= 0.25 && (!mb || x.ev > mb.ev)) mb = x; }
        const has2 = ls => !!ls && ls.includes(QB) && ls.includes(TD), med = mb || ml, held = t => !!t && !!t.legs && t.legs.some(l => l.pid === QB.pid) && t.legs.some(l => l.pid === TD.pid);
        chk(nB === 4 && clashOwn(QB, TD) === 'td' && has2(bl) && has2(med && med.ls) && !held(T1.safe) && !held(T1.med) && Object.values(T1).every(t => !t.legs || !clashPairsOwn(t.legs).length),
          `${lab}: the set does not build its four levels with no pair DraftKings refuses, where with no such rule its likeliest pair and its Medium would hold the quarterback's passing TDs and the touchdown (${nB} levels; no rule: ${bl ? bl.map(l => l.name).join('+') : 'none'}, ${med ? med.ls.map(l => l.name).join('+') : 'none'}; the set: ` + s1.tiers.map(t => t.id + ' ' + (t.legs ? t.legs.map(l => l.name).join('+') : t.why)).join(' | ') + ')'); }
      /* the second game: its set held to every rule (holdSet: a level empty only where the game's legs make too few with
         no pair DraftKings refuses), and, as it was made for it, its Medium the money line, the touchdown and a total */
      { const lab3 = `a made-up Monday night game (${C3.id}) whose quarterback's passing TDs and his teammate's touchdown are two of its three legs with an edge, its total posted`;
        holdSetF(lab3, C3, true); const s3 = w.eval('spSet')(C3.id), M3 = s3 && s3.tiers.find(t => t.id === 'med'), q3 = qualOwn(SPH.SPU, [C3]);
        chk(q3.pref.length + q3.thin.length === 3 && q3.mkt.length === 2 && maxFitOwn([...q3.pref, ...q3.thin]) === 2 && !!M3 && !!M3.legs && M3.mkt === 1 && M3.legs.some(l => l.pid === TD3.pid) && M3.legs.some(l => l.pid === ML3.pid) && !M3.legs.some(l => l.pid === QB3.pid),
          `${lab3}: its Medium is not the money line, the touchdown and a total, the one three-leg parlay of the game DraftKings takes (the legs with an edge make three by count and two that go together, so a total fills the third): ` + (M3 ? (M3.legs ? M3.legs.map(l => l.name + ' ' + l.label).join(' + ') : M3.why) : 'no Medium')
          + ` (${q3.pref.length} Value picks, ${q3.thin.length} thin, ${q3.mkt.length} totals worked out here)`);
        /* (app v121, the review's round) and its two empty levels as it was made for them: Aggressive, four legs by count
           (the two players, the side and the total) and three that go together, says no four of its legs go together on
           DraftKings' slip; Extreme, five, says the game has only four, as before. Until the round Aggressive said "No
           4-leg parlay in this game: a parlay takes one leg a player, and one side and one total a game.", which is not
           why */
        const A3 = s3 && s3.tiers.find(t => t.id === 'aggr'), X3 = s3 && s3.tiers.find(t => t.id === 'xtrm'), all3 = [...q3.pref, ...q3.thin, ...q3.mkt];
        chk(maxOwn(all3) === 4 && maxFitOwn(all3) === 3 && !!A3 && !A3.legs && A3.why === `No 4 of this game’s legs go together on DraftKings’ slip: ${CLASH_WHY_OWN}`
          && !!X3 && !X3.legs && X3.why === 'Only 4 legs in this game: a parlay takes one leg a player, and one side and one total a game.',
          `${lab3}: its Aggressive does not say no four of its legs go together on DraftKings' slip, or its Extreme that the game has only four legs (${maxOwn(all3)} by count, ${maxFitOwn(all3)} together, worked out here): ${A3 ? A3.why || 'built' : 'none'} / ${X3 ? X3.why || 'built' : 'none'}`); }
      /* a game page's hands (gameTiers, its own fits) the same: none holds a pair DraftKings refuses */
      { let GT = null; try { GT = w.eval('GAME_TIER_CACHE={}; gameTiers')(C1); } catch (e) { GT = null; console.log(`  (${C1.id}'s game page hands could not be built on made-up clubs: ${e && e.message})`); }
        if (GT) { const hs = ['high', 'med', 'low'].map(id => GT[id]).filter(h => h && Array.isArray(h.legs));
          chk(hs.every(h => !clashPairsOwn(h.legs).length), `${lab}: a game page's hand holds a pair DraftKings will not take on one slip: ` + hs.map(h => clashTxt(h.legs)).filter(Boolean).join(' | '));
          if (!hs.some(h => h.legs.some(l => l.pid === QB.pid)) || !hs.length) console.log(`  (${C1.id}'s game page hands: ${hs.map(h => h.legs.map(l => l.name).join('+')).join(' | ') || 'none'})`); } }
      /* the builder: a pair DraftKings refuses said so, word for word, under its legs; the passing TDs' over with the
         game's total and with the touchdown, two pairs; his under with the touchdown (either side) and not with the total
         (an over only); a parlay with none says nothing of it, and one game's legs, or one leg a game, nothing of a link a
         game; two legs of one game with a leg of another, that the card gives each game a link of its own (on the hub
         only, where the card is) */
      tabBtn('parlay').click(); await wait(40);
      const cases = [['the quarterback\'s passing TDs and his teammate\'s touchdown', [QB, TD]], ['the passing TDs\' over with the game\'s total and the touchdown', [QB, TD, TOT]],
        ['his passing TDs\' under with the touchdown and the total', [QBU, TD, TOT]], ['one game\'s legs with no such pair', [QB, RB, TE]], ['one leg a game', [QB, ML2]], ['two legs of one game with a leg of another', [QB, RB, ML2]],
        ['a pair DraftKings refuses beside a leg of another game', [QB, TD, ML2]],
        /* (app v121, the review's round) the mix line reads the card's own plan, so a leg DraftKings' slip cannot take counts
           for nothing: one leg a game on the slip beside a second leg of one of them with no id is a plain parlay on the
           slip, and says nothing of a link a game (until the round it said the card gives each of the 2 games a link);
           two legs of one game and one of another on the slip beside a third game's leg with no id is the mix, of 2 games
           (until the round it said 3); and a leg going on at DraftKings' number counts as on the slip */
        ['one leg a game on DraftKings\' slip, beside a second leg of one of those games with no DraftKings id', [QB, ML2, NOID2]],
        ['two legs of one game and one of another on the slip, beside a third game\'s leg with no DraftKings id', [QB, RB, ML2, NOID3]],
        ['two legs of one game, one going on at DraftKings\' number, with a leg of another', [QB, ATS1, ML2]]];
      for (const [what, ls] of cases) { await putB(ls); const got = notesOf(), wc = clashNoteOwn(ls), wm = multiNoteOwn(ls), np = clashPairsOwn(sortB(ls)).length, p = planOwn(ls), ng = p.games.length;
        chk(got.clash === wc && (wc ? got.clashN === String(np) : got.clashN === null) && got.multi === wm && (wm ? got.multiN === String(ng) : got.multiN === null),
          `the builder holding ${what} does not say what DraftKings refuses and whether the card gives each game a link, word for word ("${wc}", "${wm}"): ${JSON.stringify(got)}`);
        /* and under each leg's row what the slip does with it, from the same plan: at DraftKings' number said so, no id said
           not on the slip yet, and nothing under a leg that goes on as built */
        { const rows = [...body().querySelectorAll('tr.legrow')].map(r => { const x = r.querySelector('small.dkslip'); return x ? txt(x) : null; });
          chk(rows.length === p.each.length && p.each.every((x, i) => x.swap ? rows[i] === `On DraftKings as ${x.swap}` : x.id ? rows[i] === null : !!rows[i] && rows[i].startsWith('Not on DraftKings’ slip yet: ')),
            `the builder holding ${what} does not say under each leg's row what DraftKings' slip does with it (at DraftKings' number, not on the slip, or nothing): ${JSON.stringify(rows)}`); } }
      /* the prop model's own page has no parlay card: the pairs still said, no link a game */
      { await putB([QB, TD, ML2]); w.PARLAY_CARD = undefined; w.eval('renderParlay()'); await wait(20); const got = notesOf(); w.PARLAY_CARD = keep.card; w.eval('renderParlay()'); await wait(20);
        chk(got.clash === clashNoteOwn([QB, TD, ML2]) && got.multi === null, 'without the parlay card (the prop model\'s own page) the builder does not say what DraftKings refuses, or still says the card gives each game a link: ' + JSON.stringify(got)); }
      /* the card, from the builder: Finish on each parlay, its DraftKings buttons and note worked out here from the ids the
         fixture planted (dkOwnId, the card's order the builder's). (app v123) The card checks DraftKings' lines for its
         games as it opens, through the page's reader (espnRefresh): here a stand-in for it on these made-up games, put
         back below, each read answering a moment later that DraftKings has posted no player lines for it, so the check
         is done with the plan as planted; every card's games are read afresh, their last read set aside first. While
         the card checks, the focus is put on Open in DraftKings, as a visitor tabbing to it would; the waiting link is
         then what it is on any card (no address, no all-legs class, no game's button) */
      const IDS = [C1.id, C2.id, C3.id], unread = () => w.eval(`(function(){ for(const id of ${JSON.stringify(IDS)}) delete ESPN_OUT[id]; })()`);
      w.__prReads = []; w.eval(`espnRefresh=async function(gid){ window.__prReads.push(gid); await new Promise(r=>setTimeout(r,5)); ESPN_OUT[gid]={st:'none',why:'DraftKings has posted no player lines for it yet',when:Date.now()}; return true; }`);
      const cardOf = async ls => { await putB(ls); unread(); w.__prReads.length = 0;
        const fin = d.getElementById('pFinish'), a = d.getElementById('pcDk'), gb = d.getElementById('pcDkGames'); let busy = null;
        if (fin && !fin.disabled) { fin.click(); const cs = w.PARLAY_CARD.checkState();
          busy = { st: cs && cs.state, t: txt(a), dkall: a.classList.contains('pc-dkall'), href: a.hasAttribute('href'), hidden: a.hidden, gb: !!gb && gb.hidden && !gb.children.length };
          a.focus(); busy.focus = d.activeElement === a;
          await cardSettled(w); await wait(20); }
        return { opened: !!fin && !d.getElementById('pcModal').hidden, busy, reads: w.__prReads.slice() }; };
      /* what the card's link opens, in its words: "2 of the 3 legs", "the leg", "the 3 legs" */
      const whichOwn = p => p.miss.length ? `${p.ok.length} of the ${p.B.length} legs` : p.B.length === 1 ? 'the leg' : `the ${p.B.length} legs`;
      /* (app v123) the all-legs link's words on the mix: "Open all 3 legs in DraftKings", "Open 3 of 4 legs in DraftKings" */
      const allTxtOwn = p => p.miss.length ? `Open ${p.ok.length} of ${p.B.length} legs in DraftKings` : `Open all ${p.ok.length} legs in DraftKings`;
      /* the card's Tab order, read off the window as it stands: every control a visitor can reach in it (a button, a link
         with an address, a field, or one given a tabindex), in the page's order, none hidden or inside a hidden part */
      const tabOrder = () => [...d.getElementById('pcModal').querySelectorAll('button,a[href],input,select,[tabindex]')].filter(el => el.getAttribute('tabindex') !== '-1' && !el.disabled && !el.hidden && !el.closest('[hidden]'));
      /* every leg on the slip its own link, a row each, numbered as on the card, its own id alone; (app v121, the review's
         round) a leg going on at DraftKings' number says so in its row and its name, "(on DraftKings as -4.5)" */
      const legsHeld = p => { const ul = d.querySelector('#pcDkNote ul.pc-dklegs'), as = ul ? [...ul.querySelectorAll('li > a[data-pc-dkleg]')] : [], sw = x => x.swap ? ` (on DraftKings as ${x.swap})` : '';
        return p.ok.length < 2 ? !ul : !!ul && as.length === p.ok.length && p.ok.every((x, i) => as[i].dataset.pcDkleg === String(x.n) && as[i].getAttribute('href') === dkUrlOwn([x.id]) && txt(as[i]) === `${x.n}. ${x.l.name}, ${x.l.label}${sw(x)}`
          && as[i].getAttribute('target') === '_blank' && /noopener/.test(as[i].getAttribute('rel') || '') && as[i].getAttribute('aria-label') === `Open leg ${x.n}, ${x.l.name} ${x.l.label}${sw(x)}, in DraftKings` && w.getComputedStyle(as[i]).minHeight === '44px'); };
      const nums = xs => (xs.length === 1 ? 'leg ' : 'legs ') + (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs[0]);
      const clashCardOwn = B => { const P = clashPairsOwn(B); return !P.length ? null : `DraftKings may refuse ${P.length === 1 ? 'this pair' : 'these pairs'} on one slip: ${P.map(([i, j, k]) => `legs ${i + 1} and ${j + 1} (${CLASH_SAY_OWN[k]})`).join('; ')}.`; };
      /* (app v121, the review's round) and the card on a leg it cannot take, beside one leg a game and beside the mix, and on
         a leg it puts on at DraftKings' number in the mix: the games' buttons each dated by its own game's read (the Sunday
         game's six hours before the night game's), the note and Share link's text by the older */
      for (const [what, ls] of [['one game\'s legs, a pair DraftKings refuses among them', [QB, TD, TOT]], ['one leg a game', [QB, ML2]], ['two legs of one game with a leg of another', [QB, RB, ML2]],
        ['one leg a game on the slip, beside a second leg of one of those games with no DraftKings id', [QB, ML2, NOID2]], ['two legs of one game and one of another on the slip, beside a third game\'s leg with no DraftKings id', [QB, RB, ML2, NOID3]],
        ['two legs of one game, one going on at DraftKings\' number, with a leg of another', [QB, ATS1, ML2]]]) {
        const C = await cardOf(ls), opened = C.opened, p = planOwn(ls), { B, gs, multi } = p, a = d.getElementById('pcDk'), gb = d.getElementById('pcDkGames'), note = d.getElementById('pcDkNote'), bad = [];
        const okOf = gid => p.ok.filter(x => x.l.gid === gid), byHand = p.miss.length ? `; add ${nums(p.miss.map(x => x.n))} by hand` : '';
        const gbs = gb ? [...gb.querySelectorAll('a.pc-dkbtn[data-pc-dkgame]')] : [], cl = note && note.querySelector('[data-pc-dkclash]'), lt = w.PARLAY_CARD.linkText(w.PARLAY_CARD.current() || w.PARLAY_CARD.fromBuilder()), tx = lt ? lt.text : '';
        const name = gid => { const g = [C1, C2, C3].find(x => x.id === gid); return g.a + ' at ' + g.h; };
        if (!opened) bad.push('Finish did not open the card');
        /* (app v123) while it checked: the waiting link alone, the focus taken; then each of the parlay's games read once,
           the check done, the focus still on Open in DraftKings, and the status line saying what the slip opens */
        const which = whichOwn(p), allUrl = dkUrlOwn(p.ok.map(x => x.id)), allTxt = allTxtOwn(p), cs = w.PARLAY_CARD.checkState();
        if (!C.busy || C.busy.st !== 'busy' || C.busy.t !== 'Checking DraftKings’ lines…' || C.busy.dkall || C.busy.href || C.busy.hidden || !C.busy.gb || !C.busy.focus)
          bad.push('while the card checks DraftKings\' lines, Open in DraftKings is not the waiting link alone (no address, no all-legs class, no game\'s button), or cannot take the focus: ' + JSON.stringify(C.busy));
        { const gids = [...new Set(B.map(l => l.gid))].sort(); if (C.reads.slice().sort().join() !== gids.join() || !cs || cs.state !== 'done') bad.push(`the card's check did not read each of its games once and end done: read ${C.reads.join(', ') || 'nothing'} for ${gids.join(', ')}, ${cs ? cs.state : 'no check'}`);
          const OUT = w.eval('ESPN_OUT'), at = Math.min(...gids.map(id => +((OUT[id] || {}).when))), ckl = note && note.querySelector('[data-pc-dkcheck="done"]');
          if (!isFinite(at) || txt(ckl) !== `Checked against DraftKings’ lines at ${readTxtOwn(at)}.`) bad.push('the note does not end on when the card checked DraftKings\' lines: ' + (ckl ? txt(ckl) : 'no line')); }
        if (d.activeElement !== a) bad.push(`the focus on Open in DraftKings as the card checked did not stay on it once the check was done: it is on ${d.activeElement ? (d.activeElement.id || d.activeElement.getAttribute('data-pc-dkgame') || d.activeElement.tagName) : 'nothing'}`);
        { const msg = txt(d.getElementById('pcMsg')), want = multi ? `DraftKings’ lines checked: the all-legs link tries ${which} on one slip, and the ${p.games.length} games’ links open them a game at a time.` : `DraftKings’ lines checked: Open in DraftKings opens ${which}.`;
          if (msg !== want) bad.push(`the card's status line once checked is not "${want}": "${msg}"`); }
        /* the Tab order: Close, Open in DraftKings (on the mix, the all-legs link), each game's button on the mix, Share
           link, Download (and the share sheet where the browser has one), Start over, then the note's links, every leg's
           own among them in its order */
        { const T = tabOrder(), $i = id => d.getElementById(id), head = [$i('pcClose'), a, ...(multi ? gbs : []), $i('pcLink'), $i('pcDownload'), ...[$i('pcShare'), $i('pcAgain')].filter(x => x && !x.hidden)];
          const legLinks = [...(note ? note.querySelectorAll('ul.pc-dklegs a[data-pc-dkleg]') : [])], rest = T.slice(head.length);
          if (head.some((x, i) => T[i] !== x) || !rest.every(x => note.contains(x)) || legLinks.map(x => rest.indexOf(x)).some((k, i, A) => k < 0 || (i && k < A[i - 1])))
            bad.push('the card\'s Tab order is not Close, Open in DraftKings' + (multi ? ', each game\'s button' : '') + ', Share link, Download, Start over, then the note\'s links: ' + T.map(x => x.id || x.getAttribute('data-pc-dkgame') || (x.getAttribute('data-pc-dkleg') ? 'leg ' + x.getAttribute('data-pc-dkleg') : x.tagName)).join(', ')); }
        if (multi) {
          /* (app v123) Open in DraftKings kept on the mix, as the all-legs link: every leg on the slip, in the card's order,
             in the ice class beside the games' gold buttons, its words and its title the rule's, opening in a new tab */
          const allTitle = `Tries ${which} on one DraftKings betslip, in a new tab, as DraftKings’ lines were read ${readTxtOwn(p.read)}: DraftKings may not open a same-game parlay mixed with other games, so if the slip comes up short, open each game’s link instead`;
          if (!a || a.hidden || !a.classList.contains('pc-dkall') || !a.classList.contains('btn') || a.getAttribute('href') !== allUrl || txt(a) !== allTxt || a.getAttribute('title') !== allTitle
            || a.getAttribute('target') !== '_blank' || !/noopener/.test(a.getAttribute('rel') || '') || a.hasAttribute('aria-disabled') || a.hasAttribute('aria-busy') || a.hasAttribute('role'))
            bad.push(`Open in DraftKings is not the all-legs link ("${allTxt}", ${allUrl}, pc-dkall, "${allTitle}"): ` + (a ? `"${txt(a)}" ${a.getAttribute('href')} hidden ${a.hidden} class "${a.className}" "${a.getAttribute('title')}"` : 'no link'));
          if (!gb || gb.hidden || gb.previousElementSibling !== a || gb.nextElementSibling !== d.getElementById('pcLink') || gbs.some(x => x.classList.contains('pc-dkall'))) bad.push('the games\' buttons are not right after the all-legs link and before Share link, or one wears its class');
          /* (app v121, the review's round) each button's title dated by its own game's legs' read, the oldest of them */
          const gTitle = G => `Opens ${nums(G.ok.map(x => x.n))} (${name(G.gid)}) on DraftKings’ betslip, in a new tab, as DraftKings’ lines were read ${readTxtOwn(G.read)}: a line moved or pulled since will not be on it, so check each leg is there`;
          if (gbs.length !== p.games.length || p.games.some((G, i) => { const x = gbs[i];
            return !x || x.dataset.pcDkgame !== G.gid || x.getAttribute('href') !== dkUrlOwn(G.ok.map(y => y.id)) || txt(x) !== `Open ${name(G.gid)} in DraftKings` || x.getAttribute('target') !== '_blank'
              || x.getAttribute('title') !== gTitle(G); }))
            bad.push('the games\' buttons are not one a game with legs on the slip, in the order their first legs come, each opening its own legs\' ids and dated by their own read: ' + gbs.map(x => `${txt(x)} ${x.getAttribute('href')} "${x.getAttribute('title')}"`).join(' / ') + ' / want ' + p.games.map(gTitle).join(' / '));
          /* the note's first paragraph, word for word: the all-legs link tries it, each game's link the fallback, dated by
             the oldest read of the legs on the slip */
          const p0 = note && note.querySelector('p');
          if (txt(p0) !== `DraftKings’ lines as read ${readTxtOwn(p.read)}: these legs mix a same-game parlay with other games, which DraftKings may not open on one slip; ${allTxt} tries it all the same, and each of the ${p.games.length} games has a link of its own for when that slip comes up short. Each opens its legs as DraftKings had them then; a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet.${byHand ? ' Add by hand:' : ''}`
            || (note.querySelector('[data-pc-dkread]') || { dataset: {} }).dataset.pcDkread !== new Date(p.read).toISOString())
            bad.push(`the note does not say the all-legs link tries every leg on one slip and each game has a link of its own for when it comes up short, dated by the oldest read of the legs on the slip (${readTxtOwn(p.read)}): ` + txt(p0).slice(0, 400));
          /* Share link's text: the all-legs link first, alone on its line, then each game's under "Each game on its own:" */
          const lines = tx.split('\n'), i0 = lines.indexOf(`DraftKings betslip, ${p.miss.length ? which : 'every leg'} on one slip (DraftKings may not open a same-game parlay mixed with other games; if it does not, use each game’s link below)${byHand}:`), j0 = i0 + 3 + 2 * p.games.length;
          if (i0 < 0 || lines[i0 + 1] !== allUrl || lines[i0 + 2] !== 'Each game on its own:' || p.games.some((G, i) => lines[i0 + 3 + 2 * i] !== `${name(G.gid)}, ${nums(G.ok.map(x => x.n))}:` || lines[i0 + 4 + 2 * i] !== dkUrlOwn(G.ok.map(y => y.id)))
            || lines[j0] !== `DraftKings lines as read ${readTxtOwn(p.read)}: a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet`
            || lt.url !== null || JSON.stringify(lt.urls) !== JSON.stringify([allUrl, ...p.games.map(G => dkUrlOwn(G.ok.map(y => y.id)))]) || tx.includes('DraftKings betslip (opens') || lines.filter(x => x === allUrl).length !== 1)
            bad.push('Share link\'s text is not the all-legs link and then a link for each game, each under its game and legs, then the oldest read: ' + tx.slice(0, 600));
        } else {
          const one = allUrl;
          if (!a || a.hidden || a.getAttribute('href') !== one || txt(a) !== (p.miss.length ? `Open ${p.ok.length} of ${B.length} legs in DraftKings` : 'Open in DraftKings') || a.classList.contains('pc-dkall') || !gb || !gb.hidden || gbs.length) bad.push(`it is not one link for every leg on the slip, without the all-legs class, with no button for each game: ${a ? txt(a) + ' ' + a.getAttribute('href') + ' hidden ' + a.hidden + ' class "' + a.className + '"' : 'no link'} / ${gbs.length} game buttons`);
          if (!tx.includes(`DraftKings betslip (opens ${which} as DraftKings had them${byHand}):\n${one}\n`) || !lt || lt.url !== one || JSON.stringify(lt.urls) !== JSON.stringify([lt.url])) bad.push('Share link\'s text is not the one link: ' + tx.slice(0, 300));
          if (/a link of its own|mix a same-game parlay/.test(txt(note))) bad.push('the note speaks of a link a game');
          if (/One leg at a time/.test(txt(note))) bad.push('the note still has the old inline links, "One leg at a time"'); }
        if (!legsHeld(p)) bad.push('every leg\'s own link is not a row of its own under "Each leg on its own:", 44px, its id alone, one going on at DraftKings\' number saying so: ' + [...(note ? note.querySelectorAll('ul.pc-dklegs a') : [])].map(x => `${txt(x)} ${x.getAttribute('href')}`).join(' / '));
        if (p.ok.length > 1 && txt(note && note.querySelector('p.pc-dkone')) !== 'Each leg on its own:') bad.push('no "Each leg on its own:" over the legs\' own links');
        /* the legs it cannot take named by their numbers, and those it puts on at DraftKings' number */
        { const ms = [...d.querySelectorAll('#pcDkNote [data-pc-dkmiss]')].map(x => +x.dataset.pcDkmiss), ss = [...d.querySelectorAll('#pcDkNote [data-pc-dkswap]')].map(x => +x.dataset.pcDkswap);
          if (ms.join() !== p.miss.map(x => x.n).join() || ss.join() !== p.ok.filter(x => x.swap).map(x => x.n).join()) bad.push(`the card does not name exactly legs ${p.miss.map(x => x.n).join(', ') || 'none'} to add by hand and legs ${p.ok.filter(x => x.swap).map(x => x.n).join(', ') || 'none'} going on at DraftKings' number: ${ms.join(', ')} / ${ss.join(', ')}`); }
        { const want = clashCardOwn(B); if (want ? !cl || txt(cl) !== want || cl.dataset.pcDkclash !== String(clashPairsOwn(B).length) : !!cl) bad.push(`the card does not say ${want ? `"${want}"` : 'nothing'} of the pairs DraftKings refuses: ${cl ? txt(cl) : 'none'}`); }
        chk(!bad.length, `the parlay card on ${what} (${B.map(l => l.gid.slice(-7) + ' ' + l.name).join(', ')}): ` + bad.slice(0, 3).join('; '));
        w.eval('PARLAY_CARD.close()'); await wait(20); }
    } finally {
      w.PARLAY_CARD = keep.card; for (const g of [C1, C2, C3]) { const i = Sx.sched.indexOf(g); if (i >= 0) Sx.sched.splice(i, 1); }
      w.__prKeep = keep; w.eval('pbGames=window.__prKeep.pb[0]; pricedLegs=window.__prKeep.pb[1]; if(window.__prKeep.on) spOn=window.__prKeep.on; if(window.__prKeep.slot) spSlotNext=window.__prKeep.slot;');
      /* (app v123) the page's own reader back, and the made-up games' reads gone */
      w.eval(`espnRefresh=window.__prKeep.ref; for(const id of ${JSON.stringify([C1.id, C2.id, C3.id])}) delete ESPN_OUT[id];`); delete w.__prReads;
      w.eval(`(function(){ const k=${keep.dk}; if(k===null) delete PAY.dk; else PAY.dk=k; const c=${JSON.stringify(keep.corr)}; if(c===null) delete PAY.corr[${JSON.stringify(CK)}]; else PAY.corr[${JSON.stringify(CK)}]=c; S.parlay=${keep.parlay}; save(); })()`);
      if (keep.key == null) w.localStorage.removeItem(KK); else w.localStorage.setItem(KK, keep.key);
      delete w.__prG; delete w.__prKeep; delete w.__prB;
      if (!d.getElementById('pcModal').hidden) w.eval('PARLAY_CARD.close()');
      w.eval('SP_CACHE=new Map(); PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_SHOWN=null; renderParlay(); renderSp()'); await wait(30);
      tabBtn('parlay').click(); await wait(40); } }
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
  chk(/<head>\s*<script>window\.EMBED_TAB="record";window\.STATE_URL='betting\/state\.json';window\.ELO_URL='elo\/data\/model\.json';window\.XBETS=window\.XBETS\|\|\(function\(\)\{try\{return window\.parent!==window&&window\.parent\.XBETS\|\|null;\}catch\(e\)\{return null;\}\}\)\(\);if\(window\.XBETS\)document\.documentElement\.classList\.add\('xbets-ro'\);window\.FRIENDS=window\.FRIENDS\|\|\(function\(\)\{try\{return window\.parent!==window&&window\.parent\.FRIENDS\|\|null;\}catch\(e\)\{return null;\}\}\)\(\);<\/script>/.test(adminHtml),
    'the framed app is not told its tab, its season\'s and its Elo model\'s paths from the site\'s root, the page\'s X Bet Log and the friends\' picks');
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
  { const baked = HTML.match(/const (UNITS26|STATS26|WEEKS|RANKS26|PLAYERS26|RESULTS)\b|\b(UNITS26_META|STATS26_THROUGH|UNITS26_LINEUPS)\s*=|<script[^>]+src=[^>]*news\//), refs = [...new Set(HTML.match(/(['"`])(?:\.\.\/)*news\/[^'"`]*\1/g) || [])].map(x => x.slice(1, -1)).sort();
    chk(!baked && refs.join() === ['news/data/notes/${season}-w${week}.json', 'news/data/stats.json', 'news/data/units.json'].join(),
      'the page bakes in the news job\'s data or reads a news file other than units.json, the week\'s notes and, for a game page\'s Team Stats window (app v124), stats.json: ' + (baked ? baked[0] : refs.join(', '))); }
  { const nc = calls.filter(c => /(^|\/)news\/data\//.test(c.url)), n = f => nc.filter(c => c.url.replace(/\?.*$/, '').endsWith(f)).length;
    chk(nc.length > 0 && nc.every(c => c.method === 'GET' && c.cache === 'no-store') && n('news/data/units.json') === 1 && n('news/data/stats.json') === 0
      && new Set(nc.map(c => c.url)).size === nc.length,
      'the Game snapshot does not read the news job\'s files once each, no-store, as the page loads, or reads stats.json before a game page\'s Team Stats window asks for it: ' + nc.map(c => `${c.method} ${c.url} ${c.cache}`).join(' | ')); }

  /* the tabs keep their addresses: #suggest is Suggested Parlays (app v111; named so since app v112), #parlay the Parlay Builder, #xparlays X Parlays, #bets the X Bet Log */
  for (const [hash, id, label] of [['#suggest', 'tab-suggest', 'Suggested Parlays'], ['#parlay', 'tab-parlay', 'Parlay Builder'], ['#xparlays', 'tab-xparlays', 'X Parlays'], ['#bets', 'tab-bets', 'X Bet Log']]) {
    w.location.hash = '#pickems'; await wait(30); w.location.hash = hash; await wait(60);
    chk(!d.getElementById(id).hidden && d.getElementById('tab-pickems').hidden && txt(d.querySelector(`#tabs button[aria-selected="true"]`)) === label, `the old address ${hash} does not open ${label}`); }
  /* the Season Tracker's old address, where news/ sent every visitor, and the board's own old one, #pickems
     (every bookmark from before 16 October 2026, and pickems/'s redirect), land on Matchups, written over
     as #matchups */
  for (const old of ['#tracker', '#pickems']) {
    w.location.hash = '#xparlays'; await wait(40); w.location.hash = old; await wait(60);
    chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-xparlays').hidden && w.location.hash === '#matchups' && txt(d.querySelector('#tabs button[aria-selected="true"]')) === 'Matchups',
      `the old address ${old} does not land on Matchups as #matchups: ` + w.location.hash); }
  /* back to the board by its address */
  w.location.hash = '#slate'; await wait(40);
  w.location.hash = '#matchups';
  await wait(60);
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden && w.location.hash === '#matchups', 'setting the address did not switch tabs');
  /* the board is named Matchups wherever a visitor reads it: no Pick'ems left in the page's words (the
     Pick'em Record is another tab, and keeps its name), a game's page and its Game bets card drawn first */
  { const g0 = w.eval('(S.sched||[]).find(g=>g.w===S.ui.week)||(S.sched||[])[0]');
    if (g0) { w.eval(`S.ui.game=${JSON.stringify(g0.id)};S.ui.open={};renderGame()`); await wait(60); }
    const old = /pick['’]?ems\b/i, said = [];
    const walk = n => { if (n.nodeType === 3) { if (old.test(n.nodeValue)) said.push(n.nodeValue.trim().slice(0, 80)); return; }
      if (n.nodeType !== 1 || /^(SCRIPT|STYLE|TEMPLATE)$/.test(n.tagName)) return;
      for (const a of ['title', 'aria-label', 'placeholder', 'alt']) if (old.test(n.getAttribute(a) || '')) said.push(`${a}="${n.getAttribute(a).slice(0, 80)}"`);
      for (const c of n.childNodes) walk(c); };
    walk(d.body); if (old.test(d.title)) said.push('title: ' + d.title);
    chk(!said.length, 'the page still names the board Pick\'ems where a visitor reads it: ' + said.join(' | '));
    if (g0) { w.eval('closeGame()'); await wait(30); }
    w.location.hash = '#matchups'; await wait(40); }

  /* the page reads the two sites and bakes nothing */
  chk(fetched.includes('betting/state.json') && fetched.includes('props/data/payload.json'), 'the page did not fetch both sites, named from the site\'s root where it is: ' + fetched.join(', '));
  /* every file the page reads as it loads, named from the root (never ../, which from there leaves the site) */
  { const want = ['props/data/payload.json', 'props/data/suggest_ledger.json', 'betting/state.json', 'elo/data/players.json', 'elo/data/model.json', 'elo/data/matchups.json',
      'news/data/units.json', 'liveparlays/parlays.json', 'liveparlays/xbets.json', 'picks/friends.json'];
    const ours = bootCalls.map(c => c.url.replace(/\?.*$/, '')).filter(u => !/^https?:/.test(u));
    chk(want.every(f => ours.includes(f)) && ours.every(u => !/\.\.\//.test(u) && new URL(u, SITE).href.startsWith(SITE)),
      'the page does not read its files at the site\'s root, where it is: missing ' + want.filter(f => !ours.includes(f)).join(', ') + '; read ' + ours.join(', ')); }
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
  const s2 = await run(state, 'https://demon-x13.github.io/nfl-hub/#slate');
  chk(s2.errs.length === 0, 'the page threw opening on #slate: ' + s2.errs.join('; '));
  chk(!s2.d.getElementById('tab-slate').hidden && s2.d.getElementById('tab-pickems').hidden, 'opening on #slate did not open the Props tab');
  chk(s2.d.querySelectorAll('#gamesList .game').length > 0, 'opened on #slate, the Props tab has no games');

  /* opened on #tracker, where old links to the Season Tracker go (news/ sends its visitors to the board
     itself now), on #pickems, the board's address until 16 October 2026 (and pickems/'s redirect), or on
     #matchups, its address now, the board is showing and the address is #matchups */
  for (const at of ['#tracker', '#pickems', '#matchups']) {
    const t2 = await run(state, 'https://demon-x13.github.io/nfl-hub/' + at);
    chk(t2.errs.length === 0 && !t2.d.getElementById('tab-pickems').hidden && t2.w.location.hash === '#matchups' && txt(t2.d.querySelector('#tabs button[aria-selected="true"]')) === 'Matchups',
      `opened on ${at}, the page does not land on Matchups as #matchups: ` + t2.w.location.hash + ' ' + t2.errs.join('; '));
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
    chk(fetched.includes('elo/data/players.json') && fetched.includes('elo/data/model.json'), 'the page did not read the Elo files');
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
    /* (app v118) the Parlay Builder's ticks no longer reach the Elo picks (the owner's call of 19 October 2026: with the
       priced games unticked there, a reader saw none all of Sunday 18 October): eloPicks, on every game the page prices,
       the same with every game unticked and both player sides off (each unit's own Elo picks held so in holdSets and on
       the made-up games below); put back after */
    if (w.eval('typeof getPbTiers') === 'function') { const S = w.eval('S'), keep = JSON.stringify(S.ui.pb), sig = r => JSON.stringify(((r && r.tiers) || []).map(t => [t.id, (t.legs || []).map(l => l.key + '|' + l.side + '|' + l.k), t.p, t.dec]));
      const was = sig(w.eloPicks());
      try { S.ui.pb = { k: { ml: false, ats: false, total: false, over: false, under: false }, off: w.eval('pbGames()').map(g => g.id), gx: false };
        const now = sig(w.eloPicks());
        chk(now === was, 'the Elo picks still follow the Parlay Builder\'s ticks: with every game unticked and both player sides off they are ' + now.slice(0, 160) + ', not ' + was.slice(0, 160)); }
      finally { S.ui.pb = JSON.parse(keep); } }
    /* the suggestions: with the ratings in, a player leg is preferred only where market + form beats the book */
    { chk(w.eval('window.eloLoaded()') === true, 'the Elo tab does not say its files are in');
      if (w.eval('typeof getPbTiers') === 'function') {
      const pool = w.eval('pbPool(pbGames())'), mlProb = w.eval('mlProb'), altP = w.eval('window.eloAltP');
      chk(pool.pref.filter(c => c.grp !== 'TEAM').every(c => altP(c.pid, c.side, c.price, c.src) - mlProb(c.price) >= 0.03), 'a preferred player leg does not clear market + form');
      chk(altP('game', 'over', -110, 'real') === null, 'market + form prices a game total, which is no player\'s');
      { const q = eloP.groups.QB.top[0];   /* a quarterback's rating is a passer's: no second price on the touchdown he scores himself (app v102) */
        chk(altP(q.id, 'over', 200, 'real', 'any_td') === null && altP(q.id, 'over', 200, 'real', 'passing_yards') != null, 'market + form prices a quarterback\'s own touchdown on his passing rating, or no longer his passing line'); }
      chk(w.eval('getPbTiers().sig').split('|').includes('form') && w.eval('getPbTop().sig').split('|').includes('form') && w.eval('spSig')(w.eval('S').sched[0] || {}).split('|').includes('form'),
        'the suggestions\' signature (the levels\', the Top 30 lines\' or a set\'s) does not carry the Elo state: ' + w.eval('getPbTiers().sig')); } }
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
    /* Elo picks: Suggested Parlays' four levels on the Elo chance (17 October 2026, the owner's call: "can we also
       add an aggressive and extreme versions ... would want to see the best lines:value ratio for ELO mismatches").
       Legs whose Elo matchup (trusted stats only) beats the book's price with its margin out, prices held between
       -200 and +300, one leg a player (his best by value), ranked on value (until that day plus money first, so
       touchdowns filled them), the levels searched from the 30 best by value and the 10 likeliest by the Elo
       chance, each once (18 October 2026; with the six candidates here, all of them, so the rule worked out below
       over every parlay of their size is the whole of it; check_tab holds the union on 34 of its own); Safe, Medium,
       Aggressive and Extreme the best return over 35%, 25%, 12% and 5% by the Elo chance (Safe's 35% the Elo picks'
       own, ELO_SAFE_OWN, since 18 October 2026: until then the likeliest pair), else the likeliest of the size,
       marked so only under the floor; legs of one game allowed and priced together,
       every figure the builder's own sums, and the tab's fast sums those sums to the bit; each leg wearing its
       mismatch this week, where the Props tab's Mismatches has one, on the side it favours; built when Suggested
       Parlays is on the screen */
    /* the Elo picks' search is exact only while each parlay's sums stay within the bounds it reads about its quick
       reading, which were measured on the payload's own correlations: at the table of October 2026 (two players of one
       game 0.353 at most) the worst stray was 2.9 of the 4.5 deviations allowed, at 1.5 and 2 times the table no level
       missed its best, and at 2.6 times (0.92) 6 of 40 one-game slates did, by up to 22%. So the table the page prices
       with stays within twice that, 0.7, between two players of one game (the same player is never two legs of a pick) */
    { const C0 = JSON.parse(PAYLOAD_TXT).corr || {}, big = Object.entries(C0).filter(([k, v]) => /^(team|opp)\|/.test(k) && Math.abs(v) > 0.7);
      chk(!big.length, `the payload's correlations between two players of one game go past 0.7, past what the Elo picks' search was measured on (twice the table of October 2026): ${big.slice(0, 3).map(([k, v]) => k + ' ' + v).join(', ')}`); }
    { const MU = JSON.parse(ELO_MU);
      const trusted = (g, st) => { const p = ((MU.record[g + '|' + st] || {}).past); return !!p && p.rmse_elo < p.rmse_form && p.right_top >= 0.53; };
      const liveMu = (await w.eloFiles()).mu, Sx = w.eval('S');
      const gradeOf = s => { const x = Math.round(s * 10) / 10; return x >= 3 ? 'Huge' : x >= 2 ? 'Big' : x >= 1 ? 'Solid' : 'Slight'; };
      /* every leg of the block stands on made-up games of the smoke's own, two days out at the page's clock (on the
         schedule for the run and taken off after, as the matchup bubble's fixture is), never on the week's: until 18
         October 2026 it stood on matchups.json's own games, and once one kicked off (a Sunday afternoon, the Tuesday
         after, the off-season) its legs went with it and the block threw. Six rated players, each on a trusted stat of
         his in the tab's own matchups (not interceptions, which no mismatch reads for; a touchdown only where he has
         nothing else) and none ruled out, the first at a position the Mismatches read, for the mismatch planted on him */
      const MMG = ['QB', 'RB', 'WR', 'TE'];
      const stOf = (pid, v) => { const lv = liveMu && liveMu.players && liveMu.players[pid]; if (!lv) return null;
        const ok = Object.keys(v.stats || {}).filter(st => trusted(v.group, st) && st !== 'passing_interceptions' && lv.stats && lv.stats[st] && MU.fit[v.group + '|' + st]);
        return ok.find(st => st !== 'any_td') || ok[0] || null; };
      const pool = []; for (const [pid, v] of Object.entries(MU.players)) { if (!eloP.players[pid] || w.eloRuledOut(pid)) continue; const st = stOf(pid, v); if (st) pool.push({ pid, st, grp: v.group }); }
      const i0 = pool.findIndex(c => MMG.includes(c.grp) && c.st !== 'any_td');
      const byGame = i0 < 0 ? [] : [pool[i0], ...pool.filter((c, i) => i !== i0)].slice(0, 6);
      const weak = Object.entries(MU.players).flatMap(([pid, v]) => Object.keys(v.stats).filter(st => !trusted(v.group, st) && eloP.players[pid]).map(st => ({ pid, st })))[0];
      const wkE = w.eval('currentWeek()'), seasonE = +w.eval('SEASON'), atE = new Date(w.Date.now() + 2 * 86400e3).toISOString().slice(0, 10);
      const EG = [...'ABCDE'].map(c => ({ id: `${seasonE}_${String(wkE).padStart(2, '0')}_XE${c}_YE${c}`, w: wkE, d: atE, t: '13:00', a: 'XE' + c, h: 'YE' + c }));
      const wkOf = gid => { const g = Sx.sched.find(x => x.id === gid); return g ? g.w : wkE; };
      if (byGame.length >= 6 && weak) {
        Sx.sched.push(...EG);
        /* what the block stands in, each put back in the finally below whatever path it leaves by */
        const keepMu = {}; let undoDk = null, undoCorr = null, undoMkt = null, undoSlot = null;
        try {
        /* all six are put in the first made-up game (app v121: the Sunday slot's Elo picks are each one game's, the owner's
           call of 19 October 2026, "the legs need to be part of the same game parlay only", so one game has candidates
           enough for all four levels, Extreme's five among them, and the slot's picks are that game's, which eloPicks on
           every game gives too; until then they were spread over five games, a level taking legs of several), so a game's
           legs are taken and priced together; the second the prop model rates at 90%, far off the market: an Elo pick is
           chosen on its own chance, so it stays, flagged. Each nudge is the smoke's own, set in the tab's matchups (the file
           the page holds, every entry put back below), so the levels stand on numbers of the smoke's choosing whatever the
           week's file says: the second the likeliest and the best value, the first and third next */
        const GAME_OF = [0, 0, 0, 0, 0, 0], Z = [0.35, 0.5, 0.3, 0.25, 0.2, 0.15];
        const B = byGame.map((c, i) => ({ ...c, gid: EG[GAME_OF[i]].id, z: Z[i] }));
        for (const c of B) { keepMu[c.pid] = JSON.stringify(liveMu.players[c.pid]); liveMu.players[c.pid].stats[c.st][2] = c.z * MU.fit[liveMu.players[c.pid].group + '|' + c.st].sd; }
        const nudgeOf = c => c.z * MU.fit[liveMu.players[c.pid].group + '|' + c.st].sd;
        weak.gid = EG[4].id;
        /* a mismatch of the smoke's own on the first, in his made-up game: his rating set 4 standard deviations above
           his position's (the top of the Mismatches whatever the week has) and the club whose units he faces the
           league's weakest by the matchup formula (the tab's matchups, put back below), so the tags and the words are
           held at any hour, not only in a week that has one in a game to come */
        const mmC = { pid: B[0].pid, st: B[0].st, gid: B[0].gid };
        { const e0 = liveMu.players[mmC.pid], g0 = e0.group, defs = {};
          for (const v of Object.values(liveMu.players)) if (v.opp_def) defs[v.opp] = v.opp_def;
          Object.assign(defs, (liveMu.league && liveMu.league.defs) || {});
          const avg = d => MM_UNITS_OWN[g0].reduce((a, u) => a + d[u], 0) / MM_UNITS_OWN[g0].length, order = Object.keys(defs).sort((a, b) => avg(defs[b]) - avg(defs[a]));
          const nrm = liveMu.league && liveMu.league.norms && liveMu.league.norms[g0], opp = order[order.length - 1];
          e0.game_id = mmC.gid; e0.opp = opp; e0.opp_def = { ...defs[opp] };
          e0.elo = nrm ? nrm[0] + 4 * nrm[1] : Math.max(...Object.values(liveMu.players).filter(v => v.group === g0).map(v => v.elo)) + 400;
          mmC.opp = opp; mmC.group = g0; Object.assign(mmC, mmRankOwn(liveMu, g0, opp)); }
        /* (an anytime touchdown is one touchdown, the line DraftKings has an id for; the matchup reads no line) */
        const L = (c, price, side, extra) => Object.assign({ key: c.gid + '|' + c.pid + '|' + c.st, gid: c.gid, pid: c.pid, stat: c.st, k: c.st === 'any_td' ? 1 : 4.5, side, main: true, p: 0.5, price,
          src: 'real', mu: 4, name: eloP.players[c.pid].name, pos: 'X', grp: eloP.players[c.pid].group, team: 'X', opp: 'Y', week: wkOf(c.gid), label: side + ' test line' }, extra || {});
        const legs = [L(B[0], 120, 'over'), L(B[1], -110, 'over', { p: 0.9 }), L(B[2], 110, 'over'), L(B[3], -115, 'over'), L(B[4], 105, 'over'), L(B[5], -105, 'over'),
          L(B[0], 130, 'over', { key: B[0].gid + '|' + B[0].pid + '|dup' }),          /* the same player again */
          L(B[1], 1600, 'over', { key: 'long' }),                                       /* too long a price */
          L(B[2], -110, 'under', { key: 'under' }),                                     /* against his nudge */
          L(weak, 150, 'over', { key: 'weak' })];                                       /* a stat the matchup has not earned */
        if (!w.__realPricedLegs) w.__realPricedLegs = w.eval('pricedLegs');   /* the page's own, for the Refresh odds checks below */
        w.__legs = legs; w.eval('pricedLegs=function(){ return window.__legs.map(l=>Object.assign({},l)); }');
        /* each line under a made-up DraftKings id of its own at its line (a fixture in place of the payload's
           table, put back below): an Elo pick takes only a leg DraftKings' slip can take, wherever the payload
           carries ids (app v109) */
        const keepDkE = w.eval('JSON.stringify(PAY.dk===undefined?null:PAY.dk)'), fixE = dkFixture(legs, new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'ELO');
        const setDkE = o => w.eval(o === null ? 'delete PAY.dk' : `PAY.dk=${JSON.stringify(o)}`);
        setDkE(fixE); undoDk = () => w.eval(`(function(){ const k=${keepDkE}; if(k===null) delete PAY.dk; else PAY.dk=k; })()`);
        /* the legs of the game move together (correlations of the smoke's own in the page's table, put back below), so a
           level's legs are taken and priced together below the legs multiplied, whatever the week's table says of their
           stats. (app v121) All six being of one game, every two of them get the same 0.2, one value on every key their
           stats make: the table is keyed by position and stat, not by player, so two players of one position and stat
           share a key, and the earlier plant (0.6 on one key, 0.15 on the rest) put 0.6 on every quarterback's passing
           yards with every back's rushing yards, a matrix no Cholesky factor takes (two quarterbacks and two backs: an
           eigenvalue of 1.15 - 1.2 < 0), so parlayProb shrank it, the fast sums stood aside and the search's bounds no
           longer held. One value r on every pair is r times all ones plus 1 - r on the diagonal, positive for any r under
           1 and any number of legs, and 0.2 is within the table's own (two players of a club run to 0.353) */
        const ckOf = (a, b) => { const x = a.grp + ':' + a.stat, y = b.grp + ':' + b.stat; return (a.team === b.team ? 'team|' : 'opp|') + (x < y ? x + '|' + y : y + '|' + x); };
        const CK = new Map();
        for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (legs[i].pid !== legs[j].pid) CK.set(ckOf(legs[i], legs[j]), 0.2);
        const keepCorr = w.eval(`(function(){ const o={}; for(const k of ${JSON.stringify([...CK.keys()])}){ const v=PAY.corr&&PAY.corr[k]; o[k]=v===undefined?null:v; } return JSON.stringify(o); })()`);
        w.eval(`PAY.corr=PAY.corr||{}; Object.assign(PAY.corr,${JSON.stringify(Object.fromEntries(CK))})`);
        undoCorr = () => w.eval(`(function(){ const o=${keepCorr}; for(const k in o){ if(o[k]===null) delete PAY.corr[k]; else PAY.corr[k]=o[k]; } })()`);
        /* a leg priced on one side has as its fair chance that price over the week's typical overround on two-sided lines,
           and a week with none (the last week of a season played out, where the made-up games fall in the off-season)
           gives none, so the leg far off the market could not be told: where the made-up games' week has no two-sided
           line of its own, one player main line of the smoke's own goes in its market table for the block (put back
           below) */
        { const wk = JSON.stringify(String(wkE));
          const has = w.eval(`(function(){ const M=(PAY.mkt||{})[${wk}]||{}; for(const p in M) for(const s in M[p]){ const L=M[p][s]; if(L&&L.over&&L.under) return true; } return false; })()`);
          if (!has) { w.eval(`PAY.mkt=PAY.mkt||{}; PAY.mkt[${wk}]=PAY.mkt[${wk}]||{}; PAY.mkt[${wk}]['00-SMOKE-MKT']={receiving_yards:{line:40.5,over:-110,under:-110}}`);
            undoMkt = () => w.eval(`(function(){ const M=PAY.mkt[${wk}]; delete M['00-SMOKE-MKT']; if(!Object.keys(M).length) delete PAY.mkt[${wk}]; })()`); } }
        /* (app v118) the Elo picks are drawn in each unit of Suggested Parlays, no longer at its foot: the made-up games are
           made the tab's Sunday slot for the block (the page's spSlotUnit and spSlotNext stood in by a slot of exactly these
           five games, up and live whatever the hour, and spOn by no night game, so the tab draws this one unit), and the
           cards below are held in it; each put back below */
        const SLOT_E = `${seasonE}_${String(wkE).padStart(2, '0')}_SUN`;
        { w.__eloSlot = { G: EG, wk: wkE, keep: w.eval('[spSlotUnit, spSlotNext, spOn]') };
          w.eval(`spSlotUnit=function(wk){ const X=window.__eloSlot; if(+wk!==+X.wk) return null; return {id:spSlotId(wk),slot:true,w:+wk,d:X.G[0].d,t:X.G[0].t,games:X.G,last:Math.max(...X.G.map(g=>kickoff(g).getTime()))}; };
            spSlotNext=function(){ const u=spSlotUnit(window.__eloSlot.wk); return u?{...u,open:null,prev:null,up:true}:null; }; spOn=function(){ return []; }; SP_SHOWN=null;`);
          undoSlot = () => w.eval('spSlotUnit=window.__eloSlot.keep[0]; spSlotNext=window.__eloSlot.keep[1]; spOn=window.__eloSlot.keep[2]; delete window.__eloSlot; SP_SHOWN=null; SP_CACHE=new Map()'); }
        /* the Elo picks' levels, the smoke's own reading: Suggested Parlays' (PB_TIERS), Safe on the Elo picks' own 35% */
        const ELO_SAFE_OWN = 0.35, LV = w.eval('PB_TIERS').map(t => t[3] ? t : [t[0], t[1], t[2], ELO_SAFE_OWN]);
        const pP = w.eval('parlayProb'), pD = w.eval('parlayDec'), pOrd = w.eval('pbOrder'), dec = w.eval('mlToDec'), idOf = l => l.key + '|' + l.side + '|' + l.k;
        const r = w.eval('eloPicks()'), T = r ? r.tiers : [];
        /* the candidates: every player's best line by value, ranked on value, none of the lines the rule refuses */
        { const C = r ? r.cands : [], best = {};
          for (const l of legs) { const pe = w.eloMatchupP(l, w.eval(`mlProb(${l.price})`)); if (pe == null || l.price < -200 || l.price > 300) continue;
            const ev = pe * dec(l.price) - 1; if (pe >= 0.3 && ev > 0 && (!best[l.pid] || ev > best[l.pid].ev)) best[l.pid] = { l, ev }; }
          chk(!!C.length && C.length === Object.keys(best).length && C.every(l => best[l.pid] && idOf(best[l.pid].l) === idOf(l) && Math.abs(best[l.pid].ev - l.ev) < 1e-12) && C.every((l, i) => !i || C[i - 1].ev >= l.ev)
            && !C.some(l => ['long', 'under', 'weak'].includes(l.key)),
            'the Elo picks\' candidates are not each player\'s best line by value, ranked on value, or take a line they should pass on: ' + (C || []).map(l => `${l.name} ${l.price} ${l.ev.toFixed(3)}`).join(', ')); }
        chk(T.length === 4 && T.every((t, i) => t.id === 'elo-' + LV[i][0] && t.label === LV[i][1] && t.n === LV[i][2] && t.floor === LV[i][3] && t.legs.length === t.n),
          'the Elo picks are not Suggested Parlays\' four levels (Safe, Medium, Aggressive, Extreme) on their own floors (Safe 35%), each with its legs, from six candidates: ' + T.map(t => t.id + ' ' + t.legs.length + ' ' + t.floor).join(', '));
        /* every level at the builder's own sums on its legs (the Elo chances, a game's legs priced together), its floor
           held, and Suggested Parlays' rule worked out here over every parlay of its size from the candidates */
        { const C = r ? r.cands : [], memo = new Map(), sums = ls => { const k = ls.map(idOf).sort().join(','); let e = memo.get(k);
            if (!e) { const O = pOrd(ls); e = { k, O, p: pP(O.map(l => ({ ...l, p: l.pe }))).corr, d: pD(O.map(l => ({ leg: l, ml: l.price }))) }; memo.set(k, e); } return e; };
          /* (app v121) every parlay but one holding a pair DraftKings refuses (clashOwn) */
          const sub = (n, f) => { const go = (s0, cur) => { if (cur.length === n) { f(cur); return; } for (let i = s0; i <= C.length - (n - cur.length); i++) { if (cur.some(y => clashOwn(y, C[i]))) continue; go(i + 1, cur.concat(C[i])); } }; go(0, []); };
          for (const t of T) { if (!t.legs || !t.legs.length) { chk(false, `the ${t.label} Elo pick has no legs to hold to the rule: ${t.why || 'no reason given'}`); continue; }
            const e = sums(t.legs), O = pOrd(t.legs), lv = LV.find(x => 'elo-' + x[0] === t.id), fl = lv ? lv[3] : NaN;
            let best = null, likely = null;
            sub(t.n, ls => { const x = sums(ls); if (!likely || x.p > likely.p || (x.p === likely.p && x.k < likely.k)) likely = x;
              if (fl && x.p >= fl && (!best || x.p * x.d > best.p * best.d || (x.p * x.d === best.p * best.d && x.k < best.k))) best = x; });
            const want = fl ? (best || likely) : likely;
            /* (want is null where the candidates make no parlay of the level's size: counted as a failure, never read) */
            chk(!!want && t.legs.every((l, i) => idOf(l) === idOf(O[i])) && new Set(t.legs.map(l => l.pid)).size === t.n && t.p === e.p && t.dec === e.d && e.k === want.k && !!t.likeliest === (!!fl && !best),
              `the ${t.label} Elo pick is not Suggested Parlays' rule on the Elo chance (${fl ? `best return that lands ${fl * 100}%+, else the likeliest` : 'the likeliest'}) at the builder's own sums: ${t.legs.map(l => l.name).join(', ')} at ${t.p}, ${t.dec}${t.likeliest ? ' (likeliest)' : ''}; the rule ${want ? `${want.k} at ${want.p}, ${want.d}` : `none: ${C.length} candidates`}`); }
          /* the search works those sums fast, from parlayProb's draws kept (window.eloSums): parlayProb's and
             parlayDec's to the bit on every parlay worked out above */
          { const all = [...memo.values()]; let got = null; try { got = w.eloSums(C, all.map(e => e.O)); } catch (err) { got = null; }
            const off = all.filter((e, i) => !got || !got[i] || got[i].p !== e.p || got[i].dec !== e.d);
            chk(all.length > 0 && !off.length, `the Elo picks' fast sums are not parlayProb's and parlayDec's to the bit on ${off.length} of ${all.length} parlays: ${off.slice(0, 2).map(e => e.k + ' ' + e.p + ' ' + e.d).join('; ')}`); }
          /* two legs of one game, taken and priced together: never the legs multiplied */
          const sg = T.filter(t => new Set(t.legs.map(l => l.gid)).size < t.legs.length);
          chk(sg.length > 0 && sg.every(t => t.dec < t.legs.reduce((a, l) => a * dec(l.price), 1) - 1e-6),
            'no Elo pick takes two legs of one game, or one is priced as its legs multiplied: ' + T.map(t => t.id + ' ' + t.legs.map(l => l.gid).join('/') + ' ' + t.dec).join('; ')); }
        /* a price worked from DraftKings' line read on ESPN (app v107) counts as a book price here and in
           market + form, which pricedLegs offers only on the kinds the estimate has been checked on; a
           model-only estimate never does */
        /* (app v109) a leg with no DraftKings id at its line is never an Elo pick: B[0]'s id taken out (its line, and
           so the dup beside it), and moved to another number alone, no pick holds him */
        { const noId = JSON.parse(JSON.stringify(fixE)), wk0 = String(legs[0].week), D0 = noId[wk0][legs[0].gid], k0 = dkKey(legs[0]), id0 = D0[k0], kd = dkKey(legs[6]), idd = D0[kd];
          for (const [what, moved] of [['taken out', null]].concat(legs[0].stat === 'any_td' ? [] : [['only at 5.5', `${legs[0].pid}|${legs[0].stat}|over|5.5`]])) {
            delete D0[k0]; if (kd !== k0) delete D0[kd]; if (moved) D0[moved] = id0; setDkE(noId);
            const rn = w.eval('eloPicks()'), alln = ((rn && rn.tiers) || []).flatMap(t => t.legs);
            chk(alln.length > 0 && !alln.some(l => l.pid === legs[0].pid) && alln.every(l => dkOwnId(noId, l, false)), `with ${legs[0].name}'s DraftKings id ${what}, an Elo pick still takes him, or a leg with no id: ` + JSON.stringify(((rn && rn.tiers) || []).map(t => t.legs.map(l => l.key))));
            if (moved) delete D0[moved]; D0[k0] = id0; if (kd !== k0) D0[kd] = idd; }
          setDkE(fixE); }
        /* a price worked from DraftKings' line read on ESPN (app v107) counts as a book price in market + form,
           and in the Elo picks on a payload baked before DraftKings' ids; where the payload carries ids, such a
           leg (ESPN gives no id for a player's line) is no pick, its line having none; a model-only estimate
           never is */
        { w.__legs2 = legs.map((l, i) => Object.assign({}, l, i === 3 ? { src: 'dkline', espn: { fair: 0.45, at: '2026-10-15T03:08Z', tested: true, listed: true } } : i === 4 ? { src: 'est' } : {}));
          const keepPL = w.eval('pricedLegs'); w.eval('pricedLegs=function(){ return window.__legs2.map(l=>Object.assign({},l)); }');
          setDkE(null);
          const r2 = w.eval('eloPicks()') || {}, c2 = r2.cands || [], all2 = (r2.tiers || []).flatMap(t => t.legs);
          chk(c2.some(l => l.key === legs[3].key && l.src === 'dkline') && !c2.some(l => l.key === legs[4].key) && !all2.some(l => l.key === legs[4].key),
            'on a payload baked before DraftKings\' ids, the Elo picks do not take a leg priced from DraftKings\' line read on ESPN as a book price, or take a model-only estimate: ' + JSON.stringify((r2.tiers || []).map(t => t.legs.map(l => l.key + ' ' + l.src))));
          { const dkE = JSON.parse(JSON.stringify(fixE)); delete dkE[String(legs[3].week)][legs[3].gid][dkKey(legs[3])]; setDkE(dkE);
            const r3 = w.eval('eloPicks()') || {}, all3 = (r3.tiers || []).flatMap(t => t.legs).concat(r3.cands || []);
            chk(!!r3.tiers && !all3.some(l => l.src === 'dkline' || l.key === legs[4].key) && all3.every(l => dkOwnId(dkE, l, false)),
              'where the payload carries DraftKings\' ids, an Elo pick takes a leg priced from DraftKings\' line read on ESPN with no id at its line, or a model-only estimate: ' + JSON.stringify((r3.tiers || []).map(t => t.legs.map(l => l.key + ' ' + l.src)))); }
          setDkE(fixE);
          chk(w.eloAltP(legs[0].pid, 'over', -112, 'dkline', legs[0].stat) != null && w.eloAltP(legs[0].pid, 'over', -112, 'est', legs[0].stat) === null,
            'market + form does not read a price from DraftKings\' line read on ESPN as the book\'s, or reads a model-only estimate');
          w.__keepPL = keepPL; w.eval('pricedLegs=window.__keepPL'); w.eval('pricedLegs=function(){ return window.__legs.map(l=>Object.assign({},l)); }'); }
        /* the chance: the book's with its margin out, moved by the nudge in the stat's typical miss */
        { const l = ((r && r.cands) || [])[0], c = l && B.find(x => x.pid === l.pid && x.st === l.stat), sd = c && MU.fit[MU.players[l.pid].group + '|' + l.stat].sd;
          chk(!!c, 'the Elo picks have no candidate of the smoke\'s own to hold the chance to');
          if (c) { const fair = w.eval(`mlProb(${l.price})`) / 1.045, want = w.eloMatchupP(l, w.eval(`mlProb(${l.price})`));
            /* the normal curve by hand: the fair chance moved the nudge the smoke set, in standard deviations */
            const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
            const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
            let lo = -8, hi = 8; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (Phi(m) < fair) lo = m; else hi = m; }
            const byHand = Phi(lo + nudgeOf(c) / sd);
            chk(Math.abs(l.pe - want) < 1e-12 && Math.abs(l.pe - byHand) < 2e-4 && l.pe > fair, `an Elo pick's chance is not the book's fair chance moved by the matchup: ${l.pe} vs ${byHand}`); } }
        /* each pick's fair chance: parlayProb on its legs at the rule's fair chances */
        { const fo = fairRule(w);
          chk(T.every(t => { const fs = t.legs.map(fo); return fs.every(Boolean) ? !!t.fair && Math.abs(t.fair.p - pP(t.legs.map((l, i) => ({ ...l, p: fs[i].p }))).corr) < 1e-12 && t.fair.est === fs.some(f => f.est) : !!t.fair && t.fair.p === null; }),
            'an Elo pick\'s fair chance is not parlayProb on its legs at their fair chances: ' + T.map(t => JSON.stringify(t.fair)).join(' / ')); }
        /* (app v118) the unit the Elo picks are drawn in now: the made-up games made the tab's Sunday slot above, its Elo
           picks under its model parlays (no section of their own at the tab's foot, #pbElo, any more); each card is
           found again after every draw, which replaces the tab's units */
        const unitE = () => d.querySelector(`${SEC_SLOT} .sp-game[data-sp-game="${SLOT_E}"]`), cardEl = () => { const u = unitE(); return u && u.querySelector(':scope > .pb-tiers[data-sp-kind="elo"]'); };
        const cardOf = t => { const c = cardEl(); return c && c.querySelector(`:scope > .pb-tier[data-pb-tier="${t.id}"]`); };
        /* off Suggested Parlays, nothing new is built: the unit says it is built when the tab is open, and the tab's
           opening draws its levels */
        { const kp = w.eval('pricedLegs'); w.__legs3 = legs.map(l => ({ ...l, price: l.price === 105 ? 104 : l.price })); w.eval('pricedLegs=function(){ return window.__legs3.map(l=>Object.assign({},l)); }');
          [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click(); await wait(40);
          w.eval('renderPb()'); await wait(20);
          const el = unitE(), ph = el && el.querySelector(':scope > [data-sp-phase]');
          chk(!!el && !el.querySelector('.pb-tier') && !!ph && ph.dataset.spPhase === 'wait' && txt(ph) === 'Built when this tab is open.',
            'with Suggested Parlays off the screen, a unit\'s Elo picks built new levels, or the unit does not say it is built when the tab is open: ' + (el ? txt(el).slice(0, 160) : 'no unit'));
          w.__kp = kp; w.eval('pricedLegs=window.__kp'); }
        [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'suggest').click(); await wait(80);
        w.eval('PB_CACHE=new Map(); renderPb()'); await wait(40);
        /* the unit drawn: its blocks, and its Elo picks the ELO tab's rule on its own games (worked out here, every parlay
           of each level's size from the candidates) at the builder's sums, the very levels eloPicks gives on every game
           (the unit holds them all, every candidate being of its first game), each its card; then the rule on a slot of
           three of its games (each level one game's, app v121) and on one game alone (a night game's), and the same with the
           Parlay Builder's ticks planted to nothing, no leg of another game in any */
        { const uo = { id: SLOT_E, slot: true, w: wkE, games: EG, first: Math.min(...EG.map(etKick)), last: Math.max(...EG.map(etKick)) }, UT = PB_TIERS_OWN.map(id => w.eval('spTier')(`${SLOT_E}:elo-${id}`));
          chk(SPH.blocksHeld('the Elo picks\' made-up games as the Sunday slot', uo, { phase: 'live' }, unitE()) && UT.every((u, i) => !!u && u.elo === true && u.game === 'the Sunday slot' && !!T[i]
              && u.legs.map(idOf).join() === T[i].legs.map(idOf).join() && u.p === T[i].p && u.dec === T[i].dec),
            'the unit\'s Elo picks are not the levels eloPicks gives on the same games (every game here), or the card would not finish them as Elo picks of the Sunday slot: ' + UT.map(u => u ? u.id + ' ' + u.legs.map(l => l.name).join('+') : 'none').join(' / '));
          SPH.eloLevelsHeld('the Elo picks\' made-up games as the Sunday slot', uo, w.eval('spEloSet')(SLOT_E).tiers, { ticks: true });
          SPH.eloCardsHeld('the Elo picks\' made-up games as the Sunday slot', uo, w.eval('spEloSet')(SLOT_E).tiers, unitE(), false);
          /* (app v121) the ELO tab's levels on a unit worked out here, wholly on its own: each game's candidates alone (pg,
             the Sunday slot of two games or more) or the unit's (a night game, one game alone), each level the rule's answer
             over every parlay of its size from them (eloRuleOwn, no pair DraftKings refuses), the slot's the best of its
             games' by the slot's rule (eloSlotPickOwn), and an empty level's words: of any one game of the slot, else of the
             unit, none of them having as many candidates, or one having and no that many of them going together */
          const eloOwnUnit = (G2, CC, where, pg) => LV.map(([id, , n, fl]) => { const per = pg && G2.length > 1 ? G2.map(g => CC.filter(l => l.gid === g.id)) : [CC];
            const own = per.map(Cg => { const x = Cg.length >= n ? SPH.eloRuleOwn(Cg, n, fl) : null; return x ? { legs: x.O, p: x.p, dec: x.d, floor: fl, likeliest: !!fl && x.p < fl, k: x.k } : null; });
            const k = eloSlotPickOwn(own); if (k >= 0) return { id: 'elo-' + id, n, ...own[k] };
            const N = pg && G2.length > 1 ? Math.max(0, ...per.map(c => c.length)) : CC.length, of = pg && G2.length > 1 ? 'in any one game of the Sunday slot' : where;
            return { id: 'elo-' + id, n, why: N >= n ? (pg && G2.length > 1 ? `No ${n} players ${of} go together` : `No ${n} of the ${N} players ${of} go together`) + ' on DraftKings’ slip: it takes no quarterback’s passing TDs with a teammate’s touchdown.'
              : `Only ${N} player${N === 1 ? '' : 's'} ${of} qualif${N === 1 ? 'ies' : 'y'}: this level takes ${n}.` }; });
          const eloOwnBad = (R, OWN, gids) => { const bad = [];
            R.tiers.forEach((t, i) => { const want = OWN[i];
              if (!want.legs) { if ((t.legs && t.legs.length) || t.why !== want.why) bad.push(`${t.id} is not empty saying "${want.why}": ${t.why || t.legs.map(l => l.name).join('+')}`); return; }
              const e = t.legs && t.legs.length ? SPH.eloSumsOwn(t.legs) : null;
              if (!e || t.legs.some(l => !gids.has(l.gid)) || new Set(t.legs.map(l => l.gid)).size !== 1 || t.legs.map(idOf).sort().join(',') !== want.k || t.p !== e.p || t.dec !== e.d || !!t.likeliest !== want.likeliest)
                bad.push(`${t.id} is ${t.legs && t.legs.length ? t.legs.map(l => l.gid + ' ' + l.name).join(', ') : t.why}, where the rule on these games gives ${want.k}`); });
            return bad; };
          const C = r ? r.cands : [], sub = [EG[0], EG[1], EG[2]], one = [EG[0]];
          for (const [lab2, G2, where, pg] of [['three of its games as the Sunday slot', sub, 'in the Sunday slot', true], ['one of its games alone', one, 'in this game', false]]) {
            const gids = new Set(G2.map(g => g.id)), CC = C.filter(l => gids.has(l.gid)), sig = R => JSON.stringify(((R && R.tiers) || []).map(t => t.legs && t.legs.length ? [t.id, t.legs.map(idOf), t.p, t.dec] : [t.id, t.why]));
            const R = w.eloUnit(G2.map(g => g.id), { where, perGame: pg }), bad = [];
            if (!R || !Array.isArray(R.tiers) || R.candidates !== CC.length) bad.push(`it counts ${R && R.candidates} candidates where the rule makes ${CC.length}`);
            else bad.push(...eloOwnBad(R, eloOwnUnit(G2, CC, where, pg), gids));
            /* the Parlay Builder's ticks planted to nothing: the same levels */
            const Sx2 = w.eval('S'), keepU = JSON.stringify(Sx2.ui.pb);
            try { Sx2.ui.pb = { k: { ml: false, ats: false, total: false, over: false, under: false }, off: EG.map(g => g.id).concat(w.eval('pbGames()').map(g => g.id)), gx: false };
              const R2 = w.eloUnit(G2.map(g => g.id), { where, perGame: pg }); if (sig(R2) !== sig(R)) bad.push('with every game unticked and both player sides off they are ' + sig(R2).slice(0, 160)); }
            finally { Sx2.ui.pb = JSON.parse(keepU); }
            chk(!bad.length && R.tiers.every(t => t.legs && t.legs.length === t.n),
              `the Elo picks of a unit of ${lab2} are not the ELO tab's rule on those games alone, each level one game's and all four filled from the six in its first game, whatever the Parlay Builder's ticks: ` + bad.slice(0, 3).join('; ')); }
          /* (app v121) the Sunday slot of two made-up games of its own where the best Elo pick across them beats every one-game
             pick (the owner, 19 October 2026: "the legs need to be part of the same game parlay only, and anytime there's a
             mix it bombs the hyperlink"): the second made-up game holds a player of the best value and one of the worst, of
             two clubs, the third a quarterback's passing touchdowns and a teammate's anytime touchdown (a pair DraftKings
             refuses) and one more player, of the other club. The five are any rated quarterback in the tab's matchups, any
             rated back, receiver or tight end with an anytime touchdown fit, and three of the block's six besides them (a
             week's matchups may hold no quarterback the six do not already take: week 6's Monday night alone held two), and
             every nudge on their five lines and the matchups' trust in the two touchdown stats are the smoke's own, set for
             the case and put back after it, so it stands on numbers of the smoke's choosing at any hour. Across the two games
             Safe would take the quarterback with the best-value player, landing above its 35% and paying more than any one
             game's pair; each level of the slot is one game's, the best by the slot's rule, Medium empty saying no three
             players of any one game go together on DraftKings' slip, Aggressive and Extreme saying no game has as many
             players; and the third game alone says its three do not go together */
          { const rated = pid => !!eloP.players[pid] && !!liveMu.players[pid], mmPid = mmC.pid, inB = pid => B.some(c => c.pid === pid);
            const pick = (ok, not) => { const all = Object.keys(liveMu.players).filter(pid => rated(pid) && ok(liveMu.players[pid]) && !not.includes(pid)), score = pid => (inB(pid) ? 2 : 0) + (pid === mmPid ? 4 : 0) + (w.eloRuledOut(pid) ? 1 : 0);
              return all.sort((a, b) => (score(a) - score(b)) || (a < b ? -1 : 1))[0] || null; };
            const qbId = pick(v => v.group === 'QB', []), tdId = qbId && pick(v => ['RB', 'WR', 'TE'].includes(v.group) && !!MU.fit[v.group + '|any_td'], [qbId]);
            const rest = B.filter(c => c.pid !== qbId && c.pid !== tdId && c.pid !== mmPid).slice(0, 3);
            if (!qbId || !tdId || rest.length < 3 || !MU.fit['QB|passing_tds']) console.log('  (the Elo picks\' two-game slot: no rated quarterback, or no rated back, receiver or tight end beside him, in the tab\'s matchups: skipped)');
            else { const tdG = liveMu.players[tdId].group, keepRec = { qb: JSON.stringify(liveMu.record['QB|passing_tds'] || null), td: JSON.stringify(liveMu.record[tdG + '|any_td'] || null) }, keepG = w.__eloSlot.G, keepL = w.eval('pricedLegs');
              const keepX = Object.fromEntries([qbId, tdId, ...rest.map(c => c.pid)].map(pid => [pid, JSON.stringify(liveMu.players[pid].stats)]));
              try {
                const trust = { past: { rmse_elo: 1, rmse_form: 2, right_top: 0.6 } }; liveMu.record['QB|passing_tds'] = trust; liveMu.record[tdG + '|any_td'] = trust;
                const plant = (pid, st, z) => { const v = liveMu.players[pid], sd = MU.fit[v.group + '|' + st].sd; v.stats[st] = [1, 1, z * sd]; };
                const [hi, lo, ot] = rest; plant(qbId, 'passing_tds', 0.5); plant(tdId, 'any_td', 0.45); plant(hi.pid, hi.st, 0.5); plant(lo.pid, lo.st, 0.15); plant(ot.pid, ot.st, 0.2);
                const qbP = [qbId], wrP = [tdId];
                const G3 = [EG[1], EG[2]], cX = (c, gid, team) => ({ ...c, gid, team });
                const LX = [L(cX(hi, EG[1].id), -110, 'over', { team: 'X' }), L(cX(lo, EG[1].id), -105, 'over', { team: 'Y', opp: 'X' }),
                  L({ pid: qbId, st: 'passing_tds', gid: EG[2].id }, 120, 'over', { k: 1.5, team: 'X', label: 'Over 1.5 passing TDs' }), L({ pid: tdId, st: 'any_td', gid: EG[2].id }, 130, 'over', { team: 'X', label: 'Scores a touchdown' }),
                  L(cX(ot, EG[2].id), -110, 'over', { team: 'Y', opp: 'X' })];
                LX.forEach(l => { l.key = l.gid + '|' + l.pid + '|' + l.stat; });
                w.__legsX = LX; w.eval('pricedLegs=function(){ return window.__legsX.map(l=>Object.assign({},l)); }');
                setDkE(dkFixture(LX, new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'ELX'));
                w.__eloSlot.G = G3; w.eval('SP_CACHE=new Map(); SP_SHOWN=null; renderSp()'); await wait(60);
                const uo3 = { id: SLOT_E, slot: true, w: wkE, games: G3, first: Math.min(...G3.map(etKick)), last: Math.max(...G3.map(etKick)) };
                const CC = G3.flatMap(g => SPH.eloCandsOwn([g]).map(c => ({ ...c.l, pe: c.pe }))), gids3 = new Set(G3.map(g => g.id)), OWN = eloOwnUnit(G3, CC, 'in the Sunday slot', true), e3 = w.eval('spEloSet')(SLOT_E);
                const cross = SPH.eloRuleOwn(CC, 2, LV[0][3]), val = x => x.p * (x.d != null ? x.d : x.dec);
                /* the fixture as it was made: five candidates, two in one game and three in the other, the quarterback and his
                   teammate refused together, and the best Safe across the two games a mix of them that beats either game's */
                chk(CC.length === 5 && CC.filter(l => l.gid === EG[1].id).length === 2 && clashOwn(CC.find(l => l.pid === qbP[0]), CC.find(l => l.pid === wrP[0])) === 'td'
                  && !!cross && new Set(cross.O.map(l => l.gid)).size === 2 && cross.p >= LV[0][3] && !!OWN[0].legs && val(cross) > val(OWN[0]) + 1e-9,
                  `the Elo picks' two-game slot: the fixture is not five candidates over two games, the quarterback's passing TDs and his teammate's touchdown among them, with a Safe across the two games better than any one game's (${CC.map(l => l.gid.slice(-7) + ' ' + l.name + ' ' + l.stat).join(', ')}; across ${cross ? cross.k + ' ' + val(cross).toFixed(3) : 'none'}, one game's ${OWN[0].legs ? OWN[0].k + ' ' + val(OWN[0]).toFixed(3) : 'none'})`);
                const bad = !e3 || !Array.isArray(e3.tiers) ? ['no Elo picks'] : eloOwnBad(e3, OWN, gids3);
                chk(!bad.length && !!OWN[1].why && /^No 3 players in any one game of the Sunday slot go together on DraftKings’ slip/.test(OWN[1].why) && /^Only 3 players in any one game of the Sunday slot qualify/.test(OWN[2].why || ''),
                  'the Elo picks of a Sunday slot of two games are not each one game\'s, the best by the slot\'s rule, with the empty levels saying why of any one game (no three going together on DraftKings\' slip, then too few players): ' + bad.slice(0, 3).join('; ') + ' / ' + OWN.map(t => t.why || t.k).join(' | '));
                SPH.eloLevelsHeld('the Elo picks\' two-game slot', uo3, e3 && e3.tiers, {});
                SPH.eloCardsHeld('the Elo picks\' two-game slot', uo3, e3 && e3.tiers, unitE(), false);
                /* the third game alone, a night game's way: its three players do not go together, so Medium says so of them */
                { const C3 = CC.filter(l => l.gid === EG[2].id), R3 = w.eloUnit([EG[2].id], { where: 'in this game' }), b3 = R3 && Array.isArray(R3.tiers) ? eloOwnBad(R3, eloOwnUnit([EG[2]], C3, 'in this game', false), new Set([EG[2].id])) : ['no Elo picks'];
                  chk(!b3.length && !!R3 && R3.tiers[1].why === 'No 3 of the 3 players in this game go together on DraftKings’ slip: it takes no quarterback’s passing TDs with a teammate’s touchdown.',
                    'the Elo picks of a game whose three players include a quarterback\'s passing TDs and his teammate\'s touchdown are not the rule on its own, or its Medium does not say they do not go together: ' + b3.slice(0, 2).join('; ') + ' / ' + (R3 ? R3.tiers.map(t => t.why || t.legs.map(l => l.name).join('+')).join(' | ') : 'none')); } }
              finally {
                w.__eloSlot.G = keepG; w.__keepLX = keepL; w.eval('pricedLegs=window.__keepLX; delete window.__keepLX; delete window.__legsX');
                for (const [k, v] of [['QB|passing_tds', keepRec.qb], [tdG + '|any_td', keepRec.td]]) { const o = JSON.parse(v); if (o === null) delete liveMu.record[k]; else liveMu.record[k] = o; }
                for (const [pid, v] of Object.entries(keepX)) liveMu.players[pid].stats = JSON.parse(v);
                setDkE(fixE); w.eval('SP_CACHE=new Map(); SP_SHOWN=null; renderSp()'); await wait(40); } } } }
        /* each card leads with the fair chance, the Elo's beside it, and says how its level was chosen */
        { const pc = v => (v * 100).toFixed(0) + '%', rule = t => { const lv = LV.find(x => 'elo-' + x[0] === t.id), fl = lv && lv[3];
            return t.likeliest || !fl ? (t.n === 2 ? 'the likeliest pair' : `the likeliest ${t.n} legs`) : `best value that lands ${Math.round(fl * 100)}%+ by Elo`; };
          chk(T.every(t => { const c = cardOf(t), first = c && c.querySelector('.pb-nums > div'), F = t.fair;
            return !!first && first.classList.contains('pb-chance') && (F && F.p != null ? txt(first.querySelector('b')) === pc(F.p) && txt(first.querySelector('small')) === `Elo says ${pc(t.p)}` : txt(first.querySelector('b')) === pc(t.p)); }),
            'the Elo picks do not lead with the fair chance beside the Elo\'s: ' + [...(cardEl() ? cardEl().querySelectorAll('.pb-nums > div:first-child') : [])].map(txt).join(' / '));
          chk(T.every(t => { const c = cardOf(t); return !!c && c.classList.contains(t.id) && txt(c.querySelector('.pb-tn')) === t.label && txt(c.querySelector('.pb-th .pill')) === `${t.n} legs` && [...c.querySelectorAll('.pb-rule')].map(txt).join('|') === rule(t); }),
            'an Elo pick\'s card is not its level, its legs and how it was chosen ("best value that lands 35%+ by Elo", "best value that lands 25%+ by Elo", "the likeliest pair", "the likeliest 4 legs"): ' + T.map(t => { const c = cardOf(t); return c ? txt(c.querySelector('.pb-th')) : t.id + ' not drawn'; }).join(' / ')); }
        /* the leg the prop model rates far off the market is flagged on every card that holds it, and only it */
        { const fo = fairRule(w), farWant = l => { const f = fo(l); return !!f && l.p - f.p >= 0.15 - 1e-9; };
          chk(T.every(t => { const c = cardOf(t), lis = c ? [...c.querySelectorAll('.pb-legs > li')] : [];
            return lis.length === t.n && t.legs.every((l, i) => { const ff = lis[i].querySelector('[data-pb-far]'), f = fo(l);
              return farWant(l) ? !!ff && txt(ff) === `model ${Math.round(l.p * 100)}% · market ${Math.round(f.p * 100)}%${f.est ? ' est.' : ''}: far off the market` : !ff; }); })
            && T.some(t => t.legs.some(farWant)),
            'the Elo picks\' leg far off the market is not flagged, or another is: ' + (cardEl() ? [...cardEl().querySelectorAll('[data-pb-far]')].map(txt).join(' / ') : 'no unit')); }
        /* each leg on a player with a Solid mismatch or better this week, in that game, on the side it favours, wears it
           after his name: the game page's tag, its grade in words, the edge and the unit in its title; no other leg
           wears one. A mismatch is a player above his position's average against a unit below the league's, so it
           favours him: his over, a ladder rung and his touchdown (side over), never an under on him, nor more of his
           interceptions (18 October 2026: an Under on Matthew Golden wore "Solid mismatch", which reads as an edge for
           a bet against him). (app v118) Put on the unit's Elo picks after the tab draws them (eloDecorate), and on no
           card of its model parlays */
        const mmSide = l => l.side === 'over' && l.stat !== 'passing_interceptions';
        { const mm = {}; for (const v of (typeof w.eloMismatches === 'function' ? w.eloMismatches() : [])) if (gradeOf(v.score) !== 'Slight' && !mm[v.pid]) mm[v.pid] = v;
          let nTag = 0; const bad = [];
          /* the smoke's own mismatch is on the Mismatches, in its made-up game, against the club it was set against */
          { const v = mm[mmC.pid]; if (!v || String(v.game_id) !== String(mmC.gid) || v.opp !== mmC.opp || v.group !== mmC.group) bad.push(`the mismatch the smoke planted on ${mmC.pid} (${mmC.gid}, against ${mmC.opp}) is not on the Mismatches: ${v ? `${v.game_id} against ${v.opp}, ${v.score.toFixed(2)}` : 'none'}`); }
          for (const t of T) { const c = cardOf(t), lis = c ? [...c.querySelectorAll('.pb-legs > li')] : [];
            t.legs.forEach((l, i) => { const tags = lis[i] ? [...lis[i].querySelectorAll('.pe-mmtag')] : [], v = mm[l.pid] && String(mm[l.pid].game_id) === String(l.gid) ? mm[l.pid] : null;
              if (!v) { if (tags.length) bad.push(`${l.name} wears ${txt(tags[0])} with none this week in his game`); return; }
              if (!mmSide(l)) { if (tags.length) bad.push(`${l.name}'s ${l.side} wears ${txt(tags[0])}, a bet against the side his mismatch favours`); return; }
              const g = gradeOf(v.score), tg = tags[0], nm = lis[i] && lis[i].querySelector('.nm'), name = nm && (typeof w.hubGlance === 'function' ? nm.querySelector(':scope > button.glance-name') : [...nm.childNodes].find(x => x.nodeType === 3 && x.textContent.trim()));
              if (tags.length !== 1 || txt(tg) !== `${g} mismatch` || tg.dataset.peMmgrade !== g || tg.dataset.peMmtag !== v.score.toFixed(1) || !name || name.nextSibling !== tg || name.textContent !== l.name
                || tg.title !== mmTitleOwn(v, ...(v.pid === mmC.pid ? [mmC.rank, mmC.n] : [v.defRank, v.defN])) || w.getComputedStyle(tg).whiteSpace !== 'nowrap') bad.push(`${l.name}: ${tags.map(txt).join(', ') || 'no tag'} for ${g} (${v.score.toFixed(1)})${tg ? `, titled "${tg.title}"` : ''}`);
              else nTag++; }); }
          { const u = unitE(), onModel = u ? u.querySelectorAll(':scope > .pb-tiers[data-sp-kind="model"] .pe-mmtag').length : 0; if (onModel) bad.push(`${onModel} mismatch tags on the unit's model parlays`); }
          chk(!bad.length && nTag > 0, 'an Elo pick\'s leg does not wear its player\'s mismatch this week, after his name, or wears one he does not have: ' + (bad.join('; ') || 'no tag on ' + mmC.pid)); }
        /* the Props tab's Mismatches card words the planted mismatch as what it ranks, the matchup formula's units by
           their players' Elo, and nothing on it says "a pass defense ranked" (the card is drawn for the matchups' own
           week: that week stood in as the list's, put back after) */
        { const keepWk = liveMu.week;
          [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'slate').click(); await wait(60);
          const wsel = d.getElementById('weekSel');
          if (wsel) liveMu.week = +wsel.value; w.eval('renderSlate()'); await wait(40);
          const mc = d.getElementById('peMism'), b = mc && [...mc.querySelectorAll('.pe-mm-b')].find(x => x.dataset.mmPid === mmC.pid), sub = b && b.querySelector('.pe-mm-sub');
          const want = `vs the ${mmC.opp} ${MM_AGAINST_OWN[mmC.group]}, ${ordOwn(mmC.rank)} by player Elo.`;
          chk(!!sub && txt(sub).startsWith(want) && !mmOldWords(mc),
            `the Props tab's Mismatches do not word the smoke's mismatch as the matchup formula's units ("${want}"), or still say a pass or run defense ranked: ${sub ? txt(sub) : mc ? 'not on the card' : 'no card'}${mmOldWords(mc) ? ' / ' + mmOldWords(mc) : ''}`);
          liveMu.week = keepWk; w.eval('renderSlate()'); await wait(40);
          [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'suggest').click(); await wait(80);
          w.eval('PB_CACHE=new Map(); renderPb()'); await wait(40); }
        /* the side, planted: the mismatch player's leg made an Under at -110 that his matchup favours (his nudge turned
           against him in the tab's matchups, as Matthew Golden's -2.75 receiving yards stood beside his Solid
           mismatch), with a made-up DraftKings id of its own; every level that takes it draws it with no tag, where
           his over above wore one; then all put back and the levels drawn again */
        if (cardEl()) { const st = liveMu.players[mmC.pid].stats[mmC.st], keepZ = st[2];
          st[2] = -nudgeOf(B[0]);
          const legsU = legs.map((l, i) => i ? l : { ...l, side: 'under', price: -110, label: 'under test line' });
          setDkE(dkFixture(legsU, new Date(w.eval('Date.now()') - 3600e3).toISOString().slice(0, 16) + 'Z', 'ELU'));
          w.__legs = legsU; w.eval('PB_CACHE=new Map(); renderPb()'); await wait(40);
          const rU = PB_TIERS_OWN.map(id => w.eval('spTier')(`${SLOT_E}:elo-${id}`)).filter(Boolean), held = rU.filter(t => t.legs.some(l => l.pid === mmC.pid && l.side === 'under'));
          const worn = rU.flatMap(t => { const c = cardOf(t), lis = c ? [...c.querySelectorAll('.pb-legs > li')] : [];
            return t.legs.flatMap((l, i) => l.side === 'under' && lis[i] && lis[i].querySelector('.pe-mmtag') ? [`${t.label}: ${l.name} ${txt(lis[i].querySelector('.pe-mmtag'))}`] : []); });
          chk(held.length > 0 && !worn.length && w.eloMmFor && !w.eloMmFor(legsU[0]) && w.eloMmFor(legs[0]),
            `an Under on ${mmC.pid}, whose mismatch favours him, wears his mismatch tag (or no level takes it, or the page's rule reads the sides otherwise): ${held.length} levels hold it; ${worn.join('; ') || 'no tag'}`);
          st[2] = keepZ; w.__legs = legs; setDkE(fixE); w.eval('PB_CACHE=new Map(); renderPb()'); await wait(40); }
        else chk(false, 'Suggested Parlays drew no Elo picks in the unit to hold the side of a mismatch on');
        /* (app v112) an Elo pick's legs are chosen on the Elo matchup, not the edge: none is marked Value, and neither
           retired tag is drawn */
        chk(!!cardEl() && !cardEl().querySelector('.pb-valmark, .pb-thinmark') && !OLD_TAG.test(txt(cardEl())), 'an Elo pick\'s leg is marked Value, or the Elo picks still say thin edge or no edge: ' + (cardEl() ? [...cardEl().querySelectorAll('.pb-valmark')].length + ' marked' : 'no card'));
        /* (app v113) their lead was one short sentence, the owner's "get rid of all the long paragraph description stuff";
           (app v118) in a unit they have none, only their heading, "Elo picks", and the sentence that said they stood on the
           Parlay Builder's ticks is nowhere */
        { const u = unitE(), h = u && u.querySelector(':scope > h5.sp-sub[data-sp-kind="elo"]');
          chk(!!h && txt(h) === 'Elo picks' && h.nextElementSibling === cardEl() && !u.querySelector('.pb-lead') && !/Players whose Elo matchup beats the book|ticked on the Parlay Builder tab/.test(txt(d.getElementById('spPanel'))),
            'the unit\'s Elo picks are not under their heading alone, or a lead (or the old one, on the Parlay Builder\'s ticks) is still drawn: ' + (u ? txt(u).slice(0, 200) : 'no unit')); }
        /* a leg carries a shield where its player is ranked this season, and only there */
        const wantBadges = T.flatMap(t => t.legs).filter(l => eloP.players[l.pid] && eloP.players[l.pid].rank).length;
        chk(!!cardEl() && cardEl().querySelectorAll(':scope > .pb-tier').length === 4 && cardEl().querySelectorAll('.pb-legs .pe-badge').length === wantBadges, `the unit's Elo picks are not their four levels, or their legs' shields are wrong: ${cardEl() ? cardEl().querySelectorAll('.pb-legs .pe-badge').length : 'no unit'} for ${wantBadges}`);
        /* each leg of a pick has its own Add (44px, named for the leg), as a set's legs do */
        chk(!!cardEl() && T.every(t => { const c = cardOf(t), lis = c ? [...c.querySelectorAll('.pb-legs li')] : [];
            return lis.length === t.legs.length && t.legs.every((l, i) => { const b = lis[i].querySelector('button[data-pb-leg]');
              return !!b && b.dataset.pbLeg === l.key && b.dataset.side === l.side && +b.dataset.k === +l.k && b.getAttribute('aria-label') === `Add ${l.name}, ${l.label}, to the builder` && w.getComputedStyle(b).minHeight === '44px'; }); }),
          'an Elo pick\'s leg has no 44px Add of its own named for it');
        /* the Elo picks pay on the panel's Bet amount too, as it is typed */
        const eloStake0 = w.eval('S.stake'), amtBox = d.getElementById('pbStake');
        if (amtBox) { amtBox.value = '12.5'; amtBox.dispatchEvent(new w.Event('input')); amtBox.dispatchEvent(new w.Event('change')); await wait(20); }
        const eloAmt = amtBox ? 12.5 : eloStake0;
        chk(!!amtBox && !!cardEl() && T.every(t => { const c = cardOf(t), p = c && c.querySelector('[data-pb-pay]');
          return !!p && +p.dataset.pbPay === t.dec && txt(p.querySelector('b')) === money(12.5 * t.dec) && txt(p.querySelector('span')) === '$12.50 pays'; }),
          'the Elo picks do not pay the Bet amount ($12.50) times their price: ' + [...(cardEl() ? cardEl().querySelectorAll('.pb-nums div:last-child') : [])].map(x => [...x.children].map(txt).join(' ')).join(' / '));
        /* Add to builder (the unit's own, data-sp-add, since app v118) puts exactly those legs in the builder, which prices
           them at the card's price and pays what the card says; the button named for the level and the unit */
        for (const t of T) { const keepP = w.eval('JSON.stringify(S.parlay)'), c = cardOf(t), ab = c && c.querySelector(`[data-sp-add="${SLOT_E}:${t.id}"]`);
          if (ab) { chk(ab.getAttribute('aria-label') === `Add the ${t.label} Elo pick for the Sunday slot to the builder`, `the ${t.label} Elo pick's Add to builder is not named for it: ${ab.getAttribute('aria-label')}`);
            ab.click(); await wait(40); const P = w.eval('S').parlay, q = w.PARLAY_CARD.quote();
            chk(Object.keys(P).length === t.n && t.legs.every(l => P[l.key] && P[l.key].side === l.side && P[l.key].k === l.k && P[l.key].pe === undefined && P[l.key].p === l.p)
              && !!q && Math.abs(q.useDec - t.dec) < 1e-9 && Math.abs(q.payout - eloAmt * t.dec) < 1e-6 && txt(d.querySelector('#parlayBody .bigp .payout')) === '$' + (eloAmt * q.useDec).toFixed(2),
              `the ${t.label} Elo pick's Add to builder did not put exactly its legs in the builder, keeping the model's chances, at the card's price and payout: ` + JSON.stringify(Object.values(P).map(x => [x.stat, x.k, x.side])) + ` at ${q && q.useDec} for ${t.dec}`); }
          else chk(false, `the ${t.label} Elo pick has no Add to builder`);
          w.eval(`S.parlay=${keepP}; save(); renderParlay()`); await wait(40); }
        /* an Elo pick finishes as a card on every device, saved nowhere (its Finish the unit's own, "sp|<unit>:elo-<level>",
           its kicker "<Label> Elo pick · the Sunday slot", since app v118) */
        const nSaved = w.eval('S.saved.length');
        for (const t of T) { const c = cardOf(t), fb = c && c.querySelector(`[data-pc-finish="sp|${SLOT_E}:${t.id}"]`);
          chk(!!fb && /^Finish$/.test(txt(fb)) && fb.getAttribute('aria-label') === `Finish the ${t.label} Elo pick for the Sunday slot` && !d.querySelector('[data-elo-save], [data-pc-finish^="elo|"]'), `the ${t.label} Elo pick has no Finish of its unit's`);
          if (!fb) continue;
          fb.click(); await wait(40);
          const view = d.getElementById('pcView'), n = t.n;
          chk(!d.getElementById('pcModal').hidden && txt(view).includes(`${t.label} Elo pick · the Sunday slot`) && t.legs.every(l => txt(view).includes(l.name) && txt(view).includes(l.label))
            && txt(view.querySelector('.pc-price')) === w.eval(`fmtML(decToML(${t.dec}))`).replace('-', '−')
            && txt(view.querySelector('.pc-chance')).startsWith(t.fair && t.fair.p != null ? `Fair chance all ${n} land ${pct1(t.fair.p)}${t.fair.est ? ' (est.)' : ''} Elo says ${pct1(t.p)} · the price says ` : `Elo’s chance all ${n} land ${pct1(t.p)}`),
            `the ${t.label} Elo pick's card is not "${t.label} Elo pick · the Sunday slot", its legs, its price and its Elo chance: ` + txt(view).slice(0, 300));
          { const cash = [...view.querySelectorAll('.pc-money b')].map(txt).join(' | ');
            chk(cash === [money(eloAmt), money(eloAmt * t.dec), '+' + money(eloAmt * t.dec - eloAmt)].join(' | '), `the ${t.label} Elo pick's card is not on the Bet amount: ${cash} for ${amtTxt(eloAmt)} at ${t.dec}`); }
          w.eval('PARLAY_CARD.close()'); }
        chk(w.eval('S.saved.length') === nSaved, 'finishing an Elo pick saved it');
        w.eval(`S.stake=${JSON.stringify(eloStake0)}; save(); renderParlay()`); await wait(20);
        } finally {
          if (undoDk) undoDk(); if (undoCorr) undoCorr(); if (undoMkt) undoMkt(); if (undoSlot) undoSlot();
          for (const [pid, j] of Object.entries(keepMu)) liveMu.players[pid] = w.JSON.parse(j);
          for (const g of EG) { const i = Sx.sched.indexOf(g); if (i >= 0) Sx.sched.splice(i, 1); }
          w.eval('PB_CACHE=new Map()'); }
        chk(!Sx.sched.some(g => /_XE[A-E]_YE[A-E]$/.test(g.id)) && Object.keys(keepMu).every(pid => JSON.stringify(liveMu.players[pid]) === keepMu[pid]),
          'the Elo picks\' made-up games or the smoke\'s own matchups are still on the page after the block');
        [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click(); await wait(40);
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
          /* each of the three ranked as the matchup formula ranks them, the smoke's own reading (mmRankOwn's map of the
             clubs' units): clubs level on a unit share its rank, one more than the clubs above them, as on the Mismatches
             and the Game snapshot's Starters headers (20 October 2026: ATL and NO level on the secondary read 24th and 23rd) */
          { const defs = {}; for (const x of Object.values(MU.players || {})) if (x.opp_def) defs[x.opp] = x.opp_def;
            Object.assign(defs, (MU.league && MU.league.defs) || {});
            const ks = Object.keys(defs), want = ['DL', 'LB', 'DB'].map(u => defs[v.opp] ? `${ordOwn(1 + ks.filter(t => defs[t][u] > defs[v.opp][u]).length)} of ${ks.length}` : '–');
            const got = [...view.querySelectorAll('.pe-pl-def span b')].map(txt);
            chk(got.join('|') === want.join('|'), `a player's window does not rank the units he faces as the matchup formula does, level clubs sharing a rank: ${got.join(', ')} against ${want.join(', ')}`); }
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
        /* each bubble words what its edge ranks as the matchup formula's units by their players' Elo, the rank the smoke's own */
        { const bad = bubbles.map((b, i) => { const r = rows[i], k = mmRankOwn(MU, r.group, r.opp), want = k ? `vs the ${r.opp} ${MM_AGAINST_OWN[r.group]}, ${ordOwn(k.rank)} by player Elo.` : null, sub = b.querySelector('.pe-mm-sub');
            return want && sub && txt(sub).startsWith(want) ? '' : `${r.pid}: ${sub ? txt(sub) : 'no line'} (want "${want}")`; }).filter(Boolean);
          chk(!bad.length && !mmOldWords(card), 'a Mismatches bubble does not word its rank as the matchup formula\'s units, or says a pass or run defense ranked: ' + (bad.join(' | ') || mmOldWords(card))); }
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
            /* its title words what the edge ranks as the matchup formula's units, the rank the smoke's own */
            const byPid = {}; for (const r of w.eloMismatches()) if (r.game_id === rows[0].game_id && !byPid[r.pid]) byPid[r.pid] = r;
            const titleOf = pid => { const r = byPid[pid], k = r && mmRankOwn(MU, r.group, r.opp); return r && k ? mmTitleOwn(r, k.rank, k.n) : null; };
            const got = {}; for (const b of btns) { const t = b.querySelectorAll('.pe-mmtag');
              if (t.length) got[b.dataset.open] = t.length === 1 && t[0].parentNode.classList.contains('who') && t[0].previousSibling && t[0].previousSibling.nodeType === 3
                ? t[0].textContent + '|' + t[0].dataset.peMmgrade + (t[0].title === titleOf(b.dataset.open) ? '' : ` titled "${t[0].title}", not "${titleOf(b.dataset.open)}"`) : 'misplaced or twice'; }
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
          /* its Facing column ranks the formula's units and names them, and its note says so, nowhere "the pass defense" */
          { const trs = [...m.querySelectorAll('tbody tr')], bad = trs.map((tr, i) => { const r = rows[i], k = mmRankOwn(MU, r.group, r.opp), c = tr.children[3];
              return k && c && txt(c) === `${ordOwn(k.rank)} of ${k.n}${MM_AGAINST_OWN[r.group]}` ? '' : `${r.pid}: ${c ? txt(c) : 'no cell'}`; }).filter(Boolean), note = txt(m.querySelector('.pe-sub'));
            chk(!bad.length && !mmOldWords(m) && /Facing ranks the units he faces among all 32 defenses by their players' Elo/.test(note) && /not the ELO Ratings tab's Pass Defense or Run Defense table/.test(note),
              'the Mismatches window\'s Facing column does not rank and name the matchup formula\'s units, or its note still says the pass defense: ' + (bad.slice(0, 3).join(' | ') || mmOldWords(m) || note.slice(0, 200))); }
          d.getElementById('peMmClose').click(); await wait(20); chk(m.hidden, 'the mismatches window does not close'); }
        const opts = [...d.getElementById('weekSel').options].map(o => +o.value), other = opts.find(v => v !== +MU.week);
        if (other) { d.getElementById('weekSel').value = String(other); d.getElementById('weekSel').dispatchEvent(new w.Event('change', { bubbles: true })); await wait(60);
          chk(!d.getElementById('peMism'), 'mismatches show on a week they are not for');
          d.getElementById('weekSel').value = String(MU.week); d.getElementById('weekSel').dispatchEvent(new w.Event('change', { bubbles: true })); await wait(60); }
      } else chk(!card, 'mismatches show on a week they are not for');
      [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click(); await wait(40); }
    /* Overall Offense and Overall Defense: two pills under the position row, each with the position
       tables of its side the file carries (Run Offense, Pass Offense and Pass Protection, and Run Defense,
       Pass Defense and Pass Rush, from 16 October 2026, named by the file and sided by its `of`), an
       Offense row then a Defense row, each a table of the 32 teams in rank order (the ones with a rating best first: played, or carried
       from last season), each with its shield, a club yet to play marked carried from the season the
       file names, and no other; a position pill brings the players back (the tab's own gate,
       elo/check_tab.js, checks the rest) */
    { const U = eloM.units, played = U ? Object.values(U.off).filter(v => v.games || v.carried).length : 0, card = () => d.getElementById('peUnits');
      const pill = side => body.querySelector(`.pe-pos button[data-unit="${side}"]`), was = (body.querySelector('.pe-pos [aria-selected="true"]') || {}).dataset;
      if (!played) chk(!pill('off') && !card(), 'Overall Offense shows with no games rated');
      else {
        const PT = U.tables && typeof U.tables === 'object' ? Object.keys(U.tables).filter(k => U[k]) : [];
        const sideOf = k => U.tables[k].of === 'off' ? 'off' : 'def';
        chk([...body.querySelectorAll('.pe-pos button[data-unit]')].map(b => b.dataset.unit).join() === ['off', ...PT.filter(k => sideOf(k) === 'off'), 'def', ...PT.filter(k => sideOf(k) === 'def')].join(),
          'the position row\'s team pills are not Overall Offense and the offense tables, then Overall Defense and the defense tables, in the file\'s order');
        for (const side of ['off', 'def', ...PT]) {
          const name = side === 'off' ? 'Overall Offense' : side === 'def' ? 'Overall Defense' : U.tables[side].label;
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
  chk(['liveparlays/parlays.json', 'liveparlays/xbets.json'].every(f => calls.some(c => c.url.replace(/\?.*$/, '') === f && c.method === 'GET' && c.cache === 'no-store')),
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
      /* (app v109) and, on another game still to come whose away spread the payload has ids for, that team to
         cover at the page's line: on DraftKings' id at that line where the payload has one, else on the one at
         DraftKings' closest number (no press has been made, so no read is newer than the pull's; a tie to the
         lower), said under its row in the builder and on the card as going on at DraftKings' number */
      const atsKeys = x => Object.keys(((DK[String(x.w)] || {})[x.id]) || {}).filter(k => k.startsWith(`team:${x.a}|ats|`) && isFinite(+k.slice(`team:${x.a}|ats|`.length)));
      const gS = S.sched.find(x => x !== g && x.id !== g.id && !started(x) && atsKeys(x).length && w.gameBet(x, x.a, 'ats'));
      if (gS) w.eval('toggleLeg')(`${gS.id}|team:${gS.a}|ats`, 0, gS, 'over', false);
      w.eval('save(); renderParlay();'); await wait(60);
      const q = w.PARLAY_CARD.quote(), fin = d.getElementById('pFinish');
      /* each leg's id and, for the spread, what goes on: worked out here from the payload's table */
      const plan = q ? q.legs.map(l => { const own = dkIdOf(DK, l); if (own || l.stat !== 'ats') return { id: own || null, swap: null };
        const pre = `${l.pid}|ats|`, D = DK[String(l.week)][l.gid], ps = Object.keys(D).filter(k => k.startsWith(pre)).map(k => +k.slice(pre.length)).filter(isFinite)
          .sort((x, y) => (Math.abs(x - l.k) - Math.abs(y - l.k)) || (x - y));
        return ps.length ? { id: D[pre + dkPt(ps[0])], swap: dkSigned(ps[0]) } : { id: null, swap: null }; }) : [];
      const slipLines = [...d.querySelectorAll('#parlayBody tr.legrow')].map(r => { const x = r.querySelector('small.dkslip'); return x ? txt(x) : null; });
      chk(!!q && slipLines.length === q.legs.length && plan.every((p, i) => slipLines[i] === (p.swap ? `On DraftKings as ${p.swap}` : null)),
        `the builder does not say exactly which of its legs go on DraftKings' slip at DraftKings' number, on the payload's own ids: ${JSON.stringify(slipLines)} for ${JSON.stringify(plan)}`);
      const c0 = calls.length;
      if (fin && !fin.disabled) { fin.click(); await wait(30); await cardSettled(w); }
      if (q) { const bad = cardReads(calls.slice(c0).map(c => c.url), q.legs, id => { const x = S.sched.find(y => y.id === id); return !x || started(x); });
        chk(!bad, 'Finish on the builder\'s parlay on the payload\'s own ids: the card\'s check of DraftKings\' lines did not read exactly its own games (their week\'s scoreboard once a game), or read anything else: ' + bad); }
      const a = d.getElementById('pcDk'), ids = plan.map(p => p.id), sws = plan.map((p, i) => p.swap ? i + 1 : 0).filter(Boolean);
      /* (app v121) the money line and the Under are two legs of one game, so with the other game's spread they mix a
         same-game parlay with another game, which one DraftKings link may not open: a button for each game, its own legs'
         ids in the card's order (the games in the order their first legs come; the legs on the slip alone count, worked
         out here); (app v123) and, first, Open in DraftKings kept as the all-legs link (pc-dkall), every leg's id in the
         card's order, the games' buttons right after it; one game's legs alone, or one leg a game, are one link as
         before, without that class */
      const okL = q ? q.legs.map((l, j) => ({ l, n: j + 1, id: ids[j] })).filter(x => x.id) : [], gOrd = [...new Set(okL.map(x => x.l.gid))], multi = gOrd.length > 1 && gOrd.some(gid => okL.filter(x => x.l.gid === gid).length > 1);
      const gb = d.getElementById('pcDkGames'), gbs = gb ? [...gb.querySelectorAll('a.pc-dkbtn[data-pc-dkgame]')] : [], allUrl = 'https://sportsbook.draftkings.com/?outcomes=' + okL.map(x => encodeURIComponent(x.id)).join('+');
      if (q) console.log(`  (the payload's own ids for ${g.id}: ${q.legs.length} legs of ${new Set(q.legs.map(l => l.gid)).size} game${new Set(q.legs.map(l => l.gid)).size === 1 ? '' : 's'}, ${multi ? 'a same-game parlay mixed with another game: the all-legs link and a button a game' : 'one link'})`);
      chk(!!q && !!gb && !!a && (multi ? !gb.hidden && !a.hidden && a.classList.contains('pc-dkall') && a.getAttribute('href') === allUrl && gb.previousElementSibling === a && gb.nextElementSibling === d.getElementById('pcLink')
          && gbs.length === gOrd.length && gOrd.every((gid, i) => gbs[i].dataset.pcDkgame === gid && !gbs[i].classList.contains('pc-dkall')
          && gbs[i].getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + q.legs.map((l, j) => l.gid === gid ? ids[j] : null).filter(Boolean).map(encodeURIComponent).join('+'))
        : gb.hidden && !gbs.length && !a.classList.contains('pc-dkall')),
        `Open in DraftKings on the payload's own ids for ${g.id}${multi ? ' (two legs of it and one of another game)' : ''} is not ${multi ? `the all-legs link (pc-dkall, ${allUrl}) and right after it a button for each game, each its own legs' ids` : 'one link, without the all-legs class, with no button for each game'}: `
          + (a ? `"${txt(a)}" ${a.getAttribute('href')} hidden ${a.hidden} class "${a.className}" / ` : 'no link / ') + gbs.map(x => x.dataset.pcDkgame + ' ' + x.getAttribute('href')).join(' / '));
      /* (app v121, the review's round) each game's button dated by the oldest read of its own legs (a team's line by the game
         lines' read, glat, a player's by the player prices', at; "last read" where one is undated), and, among every leg's
         own link, the spread going on at DraftKings' number saying so in its row, "(on DraftKings as +3)", and no other */
      if (multi && q) { const readOwn = l => { const D = (DK[String(l.week)] || {})[l.gid] || {}, t = Date.parse(['ml', 'ats', 'total'].includes(l.stat) ? D.glat : D.at); return isFinite(t) ? t : null; };
        const say = ms => new Date(ms).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
        const nm = gid => { const x = S.sched.find(y => y.id === gid); return x ? x.a + ' at ' + x.h : gid; }, numsO = ns => (ns.length === 1 ? 'leg ' : 'legs ') + (ns.length > 1 ? ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1] : ns[0]);
        const want = gOrd.map(gid => { const ls = q.legs.map((l, j) => ({ l, n: j + 1 })).filter(x => x.l.gid === gid && ids[x.n - 1]), rs = ls.map(x => readOwn(x.l)), rd = rs.some(x => x == null) ? null : Math.min(...rs);
          return `Opens ${numsO(ls.map(x => x.n))} (${nm(gid)}) on DraftKings’ betslip, in a new tab, as DraftKings’ lines were ${rd == null ? 'last read' : 'read ' + say(rd)}: a line moved or pulled since will not be on it, so check each leg is there`; });
        /* (app v123) the all-legs link's words and title: "Open all 3 legs in DraftKings" (or "Open 2 of 3 legs" where a leg
           is added by hand), dated by the oldest read of the legs on the slip */
        { const rs = okL.map(x => readOwn(x.l)), rd = rs.some(x => x == null) ? null : Math.min(...rs), n = q.legs.length, k = okL.length;
          const allTxt = k < n ? `Open ${k} of ${n} legs in DraftKings` : `Open all ${k} legs in DraftKings`;
          const allTitle = `Tries ${k < n ? `${k} of the ${n} legs` : `the ${n} legs`} on one DraftKings betslip, in a new tab, as DraftKings’ lines were ${rd == null ? 'last read' : 'read ' + say(rd)}: DraftKings may not open a same-game parlay mixed with other games, so if the slip comes up short, open each game’s link instead`;
          chk(!!a && txt(a) === allTxt && a.getAttribute('title') === allTitle && a.getAttribute('target') === '_blank',
            `the all-legs link on the payload's own ids for ${g.id} is not "${allTxt}", titled "${allTitle}": "${a ? txt(a) : ''}" "${a ? a.getAttribute('title') : ''}"`); }
        const rows = [...d.querySelectorAll('#pcDkNote ul.pc-dklegs a[data-pc-dkleg]')].map(x => ({ n: +x.dataset.pcDkleg, t: txt(x), a: x.getAttribute('aria-label') || '' }));
        chk(gbs.length === want.length && gbs.every((x, i) => x.getAttribute('title') === want[i])
          && rows.length === ids.filter(Boolean).length && rows.every(r => { const sw = plan[r.n - 1] && plan[r.n - 1].swap, tail = sw ? ` (on DraftKings as ${sw})` : null;
            return tail ? r.t.endsWith(tail) && r.a.endsWith(`${tail}, in DraftKings`) : !/\(on DraftKings as /.test(r.t + r.a); }),
          `the card on the payload's own ids for ${g.id} does not date each game's button by its own legs' read, or does not say in a leg's own row that it goes on at DraftKings' number: ` + gbs.map(x => `"${x.getAttribute('title')}"`).join(' / ') + ' want ' + want.map(x => `"${x}"`).join(' / ') + ' / ' + rows.map(r => r.t).join(' / ')); }
      if (!multi) chk(!!q && q.legs.length === (under ? 2 : 1) + (gS ? 1 : 0) && ids.every(Boolean) && !!a && !a.hidden && a.getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(encodeURIComponent).join('+')
        && txt(a) === 'Open in DraftKings' && !d.querySelector('#pcDkNote [data-pc-dkmiss]')
        && [...d.querySelectorAll('#pcDkNote [data-pc-dkswap]')].map(x => +x.dataset.pcDkswap).join() === sws.join() && sws.every(n => txt(d.querySelector(`#pcDkNote [data-pc-dkswap="${n}"]`)).endsWith(`: goes on as ${plan[n - 1].swap}`)),
        `Open in DraftKings on the payload's own ids for ${g.id} (its money line${under ? ' and ' + under.L.n + '\'s Under ' + under.L.line : ''}${gS ? ', and ' + gS.a + ' to cover in ' + gS.id : ''}) is not those ids in the card's order under "Open in DraftKings", each at DraftKings' number said so: ` + (a ? txt(a) + ' ' + a.getAttribute('href') + ' hidden ' + a.hidden : 'no link') + ' / ' + txt(d.getElementById('pcDkNote')).slice(0, 300));
      w.eval('PARLAY_CARD.close()');
      S.parlay = JSON.parse(keep); w.eval('save(); renderParlay();'); await wait(40); } }

  /* ---- Refresh odds (app v107), on stand-in ESPN answers of the smoke's own, served by its fetch stub,
     never ESPN itself. The page reads ESPN only on a press: nothing from ESPN's core host on load; the
     button, 44px, in the Parlay Builder's controls, over the Props tab's game list and on a game's page,
     each with a status line beside it (aria-live) saying the published prices before a press. A press
     reads the week's scoreboard and each game's player lines (here the season's last game still to come
     read in full: the week's last game still to come, one game with no lines posted, one ESPN does not answer), applies DraftKings' game lines
     (real prices), draws the game's page with each est. price the rule's (espn_rule.js, the props audit's
     own working) and its title saying what it is priced from; on a payload baked with DraftKings' ids no leg
     from the read is suggested (it has no id: app v109), and on one baked before them a tested kind counts
     as a book price in the suggested parlays and never an untested one, and the parlay card names such a
     leg to add by hand. A
     failing ESPN and a 404 are worded as the status line says them, and a game's page reads that game
     alone. The stand-in takes the game's own player prices out whatever the payload holds, so it holds
     on any payload: the week's own, a lean week, one baked before PAY.espn_ids. The press's read kept in
     this browser (app v108) is held on real reloads of the page, each a window of its own on this one's
     storage and a payload copy of the check's own (below the game page's est. prices).
     The rules every check here keeps, as the props audit's do (its BLOCKING AND WARNINGS note): read the
     page's clock (w.Date.now(); the smoke's own shift, PAGE_SHIFT_MS, moves the page's alone, so a time
     built from Node's lands up to two days in the page's future); pick a game, a row or a player only from those the check can
     stand on; planted data on a fixture of its own (the stand-in id table replaces the payload's, never
     merged into it, and a planted Elo pick holds the levels' count of est. marks), never planted
     expectations over live structures; and hold with no game to come, the off-season included ---- */
  { const S = w.eval('S'), ko0 = x => w.eval('kickoff')(x).getTime(), g = hasPb ? (w.eval('pbGames()').slice().sort((a, b) => ko0(b) - ko0(a))[0] || null) : null, ESR = ESPN_RULE.make(w), has = w.eval('typeof espnRefresh') === 'function' && w.eval('typeof espnWhen') === 'function';
    chk(has, 'the page has no Refresh odds reader (espnRefresh, espnWhen)');
    /* (19 October 2026) a parlay card's read of its own games, as cardReads held it, is the one read with no press */
    { const noPress = calls.filter(c => /sports\.core\.api\.espn\.com|propBets/.test(c.url) && !CARD_CALLS.has(c.url));
      chk(!noPress.length, 'the page asked ESPN\'s core host for something on load, with no press and no parlay card\'s read of its own games: ' + noPress.map(c => c.url).slice(0, 3).join(' ')); }
    if (!g || !hasPb || !has) console.log('  (no game left to kick off: Refresh odds is not pressed, and no kept read is reloaded)');
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
      const reset = () => { unapply(); w.eval('ESPN_LIVE={}; ESPN_OUT={}; ESPN_NAMES={}; ESPN_SEQ++; PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); };
      const pressIn = async (ww, b) => { if (b) { b.focus(); b.click(); } for (let i = 0; i < 400 && ww.eval('ESPN_RUN.busy'); i++) await wait(25); await wait(30); }, press = b => pressIn(w, b);
      try {
        /* the parlay cards opened above read DraftKings' lines for their games as they opened (19 October 2026). This
           smoke's scoreboard stand-in has no DraftKings odds and no event ids, so they put no line on the page and kept
           nothing (held here), and left only what each found (ESPN_OUT), which a reload does not keep: set aside, so the
           buttons are seen as on a load with no press */
        chk(!Object.keys(w.eval('ESPN_LIVE')).length && !Object.keys(w.eval('ESPN_GL')).length && w.localStorage.getItem('props_press_v1') === null,
          'the parlay cards\' reads of DraftKings\' lines put a line on the page or kept a read, from a scoreboard with no odds and no player lines');
        w.eval('ESPN_OUT={}; espnPaint()');
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
          /* and the builder's own, and Suggested Parlays', each with its status line saying the same (app v111) */
          for (const [where, nm2] of [['#parlayBody', 'the builder'], ['#spPanel', 'Suggested Parlays']]) { const b2 = d.querySelector(`${where} [data-espn-refresh="week"]`), s2 = b2 && d.getElementById(b2.getAttribute('aria-describedby'));
            chk(!!b2 && w.getComputedStyle(b2).minHeight === '44px' && !!s2 && d.querySelector(where).contains(s2) && s2.getAttribute('aria-live') === 'polite' && txt(s2) === pub, `${nm2} has no 44px Refresh odds of its own with its status line saying the published prices: ${s2 ? txt(s2) : 'none'}`); }
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
        /* the stand-in's own id table alone: merged into the payload's real one (the job bakes it), a check
           would turn on which players the week's ids already name (the props audit's #270) */
        P.espn_ids = { ...ids };
        /* the week's scoreboard: DraftKings' game lines on every game, g's moved from the published, and gP's
           spread with no prices beside its number: gP is a game other than g (gN and gF last) whose published
           lines are older than the page's clock, so the press's read is put on it. On this scoreboard its
           number is moved off the published one, so the page drops the spread's prices, as a read does (the
           kept read's nulls); on boot 1's of the reload checks (spBare 'same') it is the published number,
           and the page keeps them (noTot: a scoreboard with no total for the game, boot 1's for gT). pubT: the published game lines' time, the page's rule with its fallbacks
           (espnApplyGame): the DraftKings pull's own (lat, which the bake writes only beside ls 'dk'), else
           baked_at */
        const pubT = x => Date.parse(before[x.id].lat || '') || Date.parse(P.baked_at || '') || 0;
        const gP = (c => c.find(x => x !== gN && x !== gF) || c[0] || null)(others.filter(x => pubT(x) < w.Date.now()));
        const toE = { WAS: 'WSH', LA: 'LAR' }, eab = t => toE[t] || t, fa = v => (v > 0 ? '+' : '') + v;
        const evOf = (x, i, spBare = 'moved', noTot = false) => { const lk = oc => ({ href: `https://sportsbook.draftkings.com/gateway?preurl=${encodeURIComponent(`https://sportsbook.draftkings.com/event/${80000 + i}?outcomes=0SM${i}${oc}`)}` });
          const bare = !!gP && x.id === gP.id, b0 = before[x.id].sp, mlA = -140 - i, mlH = 118 + i, tot = 43.5 + i;
          let spA = -(2.5 + i % 2); if (bare && spBare === 'same' && typeof b0 === 'number') spA = b0; else if (bare && b0 === spA) spA -= 1;
          const pr = o => bare ? {} : { odds: o };
          return { id: String(9300 + i), date: w.eval('kickoff')(x).toISOString(), competitions: [{ competitors: [{ homeAway: 'home', team: { abbreviation: eab(x.h) } }, { homeAway: 'away', team: { abbreviation: eab(x.a) } }],
            odds: [{ provider: { id: '100' }, moneyline: { home: { close: { odds: fa(mlH), link: lk('MH') } }, away: { close: { odds: fa(mlA), link: lk('MA') } } },
              pointSpread: { home: { close: { line: fa(-spA), ...pr('-106'), link: lk('SH') } }, away: { close: { line: fa(spA), ...pr('-114'), link: lk('SA') } } },
              ...(noTot ? {} : { total: { over: { close: { line: 'o' + tot, odds: '-108', link: lk('TO') } }, under: { close: { line: 'u' + tot, odds: '-112', link: lk('TU') } } } }) }] }] }; };
        const evs = games.map((x, i) => evOf(x, i)), evId = x => evs[games.indexOf(x)].id;
        const props = u => { const m = /\/events\/(\d+)\/competitions\/\d+\/odds\/100\/propBets\?(.*)$/.exec(u); return m ? { eid: m[1], q: new URLSearchParams(m[2]) } : null; };
        const pageOf = (its, q) => { const pg = +q.get('page') || 1; return { code: 200, body: { count: its.length, pageIndex: pg, pageSize: 1000, pageCount: Math.ceil(its.length / 1000), items: its.slice((pg - 1) * 1000, pg * 1000) } }; };
        const fullOf = E => u => { if (/\/scoreboard\?/.test(u)) return { code: 200, body: { events: E } };
          const p = props(u); if (p) { if (p.eid === evId(g)) return pageOf(items, p.q); if (gN && p.eid === evId(gN)) return { code: 404, body: { error: { message: 'No propBets found', code: 404 } } };
            if (gF && p.eid === evId(gF)) return { reject: true }; return pageOf([], p.q); }
          return { code: 404, body: {} }; }, full = fullOf(evs);
        w.fetch = (u, o) => { const s2 = String(u); if (!esp(s2)) return f0(u, o); net.log.push({ url: s2, cache: o && o.cache, headers: o && o.headers }); ALL_CALLS.push('GET ' + s2); return ans(net.route(s2)); };
        net.route = full; reset(); w.eval('renderParlay()'); await wait(30);
        /* the press, from the Parlay Builder: the payload's DraftKings ids as the press found them (dk0), and
           the page's clock either side of it, between which its one scoreboard read must be dated (T0: every
           game line and DraftKings id the press set) */
        const dk0 = clone(P.dk || {}), tP0 = w.Date.now();
        await press(d.querySelector('#pbPanel [data-espn-refresh="week"]'));
        const tP1 = w.Date.now(), LV = w.eval('ESPN_LIVE'), blk = (LV[wk] || {})[g.id];
        const T0 = (() => { const s = new Set([...Object.values(w.eval('ESPN_GL')).map(v => v.at), ...Object.values(w.eval('ESPN_IDAT')).flatMap(v => Object.values(v))]); return s.size === 1 ? [...s][0] : null; })();
        chk(T0 != null && T0 >= tP0 && T0 <= tP1, `the press's game lines and DraftKings ids are not dated by its one scoreboard read, between ${tP0} and ${tP1}: ${JSON.stringify(Object.values(w.eval('ESPN_GL')).map(v => v.at))} ${JSON.stringify(w.eval('ESPN_IDAT')).slice(0, 160)}`);
        /* a read's game lines are put on the page only where the read is later than the published lines' time
           (pubT, above): on a Monday night under way the smoke's shift sets the page two days back, before that
           Monday's pull (or a bake after the page's clock), and the press rightly leaves the published lines
           (test_audit_phases.py's smoke_mon5) */
        const readOn = x => T0 != null && T0 > pubT(x);
        chk(!!blk && net.log.filter(x => /\/scoreboard\?/.test(x.url)).length === 1 && net.log.every(x => x.cache === 'no-store' && !x.headers),
          `the press did not read ${g.id}'s stand-in lines on one scoreboard and plain no-store requests: ${net.log.map(x => x.url.replace(/https:\/\/[^/]+/, '')).slice(0, 4).join(' ')}`);
        { const st = txt(d.querySelector('#pbPanel [data-espn-status="week"]')), exp = `DraftKings’ lines from ESPN, read ${clk(Date.parse(blk && blk.at))}: player prices estimated from the line` + (gN ? '; 1 game has no player lines posted yet' : '') + (gF ? '; couldn’t read DraftKings’ player lines for 1 game: its published player prices stand' : '') + '.';
          chk(st === exp, `the status line after the press reads "${st}", not "${exp}"`);
          chk(['#parlayBody', '#spPanel'].every(x => txt(d.querySelector(`${x} [data-espn-status="week"]`)) === exp), 'after the press the builder\'s or Suggested Parlays\' own status line does not say what the Parlay Builder\'s says: ' + ['#parlayBody', '#spPanel'].map(x => txt(d.querySelector(`${x} [data-espn-status="week"]`))).join(' / '));
          chk(d.activeElement && d.activeElement.dataset && d.activeElement.dataset.espnRefresh === 'week', 'the focus did not stay on the Refresh odds button through the redraw'); }
        /* what the page shows right after the press, before any cache of the smoke's own is dropped: the Top 50
           lines, the levels the engine builds and each prime-time game's set are what a build from nothing gives
           on the read (the press drops the caches they stand on), and the list draws est. on exactly its lines
           priced from the read. An Elo pick (in each unit of Suggested Parlays since app v118; #pbElo, at its foot,
           from app v111) may take a leg priced from the read; one planted among them, of the page's own card, is drawn
           est. and is no line of the list's (counted with them, the smoke failed on the 15 October 2026 payload, when an
           Elo pick took Jayden Daniels' read line); and every unit the tab draws after the press has its Elo picks */
        { const sig = r => JSON.stringify(r.tiers.map(t => t.why || t.legs.map(l => [l.key, l.side, l.k, l.price, l.src])));
          const topSig = r => JSON.stringify(r.rows.map(l => [l.key, l.side, l.k, l.price, l.src]));
          const estList = () => [...d.querySelectorAll('#pbPanel ol.pb-top li .pb-tc i.est')].length, estElo = () => [...d.querySelectorAll('#spSets .pb-tiers[data-sp-kind="elo"] .pb-tier .pb-legs li .pr i.est')].length;
          const el = d.querySelector(SEC_NIGHT), nL0 = estList(), nE0 = estElo(); let html = '', pl = null;
          { const units = [...d.querySelectorAll('#spSets .sp-game')], bare = units.filter(u => !u.querySelector(':scope > [data-sp-phase="wait"], :scope > [data-sp-phase="loading"]') && !u.querySelector(':scope > .pb-tiers[data-sp-kind="elo"]')
              /* (app v118) the Sunday slot under way with no set of the site's and none kept: no card at all, rightly */
              && !(u.querySelector(':scope > [data-sp-phase="under"]') && !u.querySelector('.pb-tiers')));
            chk(!!el && !bare.length, 'after the press a unit of Suggested Parlays the tab draws has no Elo picks: ' + bare.map(u => u.dataset.spGame).join(', ')); }
          if (el) { const leg = { key: g.id + '|00-SMOKE-ELO|receptions', gid: g.id, week: g.w, pid: '00-SMOKE-ELO', name: 'Planted Elopick', label: 'Over 3.5 receptions', stat: 'receptions', k: 3.5, side: 'over', main: true,
              p: 0.5, price: 120, src: 'dkline', grp: 'WR', pos: 'WR', team: g.h, opp: g.a, pe: 0.5, espn: { at: new w.Date(w.Date.now()).toISOString(), fair: 0.45, tested: true, listed: true } };
            const t0 = { id: 'elo-safe', label: 'Safe', n: 1, legs: [leg], p: 0.5, dec: 2.2, fair: null };
            try { html = w.eval('pbTierCard')(t0, { ...(typeof w.eloCardOpt === 'function' ? w.eloCardOpt(t0) : {}), kind: 'sp', fid: 'smoke:elo-safe', add: 'data-sp-add="smoke:elo-safe"', quiet: true }); } catch (e) { html = ''; }
            el.insertAdjacentHTML('beforeend', `<div class="pb-tiers" data-sp-kind="elo" data-smoke-plant>${html}</div>`); pl = el.querySelector('[data-smoke-plant]');
            chk(!!html && estElo() === nE0 + 1 && estList() === nL0, `an Elo pick's leg priced from the read is counted with the list's est. marks, or not drawn est.: ${estList()} on the list against ${nL0}, ${estElo()} on the Elo picks against ${nE0}`); }
          try {
            const rNow = w.eval('getPbTiers()'), tNow = w.eval('getPbTop()'), drawnL = estList(), G0 = w.eval('spGames()'), sNow = G0.map(x => sig(w.eval('spSet')(x.id)));
            w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); const rNew = w.eval('getPbTiers()'), tNew = w.eval('getPbTop()'), sNew = G0.map(x => sig(w.eval('spSet')(x.id)));
            const nDk = tNew.rows.filter(l => l.src === 'dkline').length;
            chk(sig(rNow) === sig(rNew) && topSig(tNow) === topSig(tNew) && drawnL === nDk && sNow.join() === sNew.join(),
              `right after the press the page shows lines, levels or sets from before it (${drawnL} lines marked est. drawn where a build on the read gives ${nDk}): ${topSig(tNow).slice(0, 160)}`);
            /* (app v109) on a payload baked with DraftKings' ids, a leg priced from the read (no id: ESPN gives
               none for a player's line) is in no level, set or Elo pick, and every leg they hold has DraftKings' id
               at its own line, the press's own game-line ids among them (dkOwnId, here on the ids as they stand).
               (app v119) The Top lines the same: every row with its id (from app v115 they kept the read's legs) */
            if (keep.dk !== undefined) { const DKn = w.eval('PAY').dk, st = l => w.eval('gameStarted')(S.sched.find(x => x.id === l.gid) || {}), eloL = ((typeof w.eloPicks === 'function' && w.eloPicks()) || { tiers: [] }).tiers.flatMap(t => t.legs)
                .concat(w.eval('spOnAll()').flatMap(u => { const v = w.eval('spShown')(u); return v.phase === 'live' && Array.isArray(v.elo) ? v.elo.flatMap(t => t.legs || []) : []; }));
              const lv = rNew.tiers.flatMap(t => t.legs || []).concat(G0.flatMap(x => w.eval('spSet')(x.id).tiers.flatMap(t => t.legs || []))), tk = takenRule(w), isGt = w.eval('isGameLeg');
              const badT = tNew.rows.filter(l => !dkTakes(DKn, l, st(l)));
              /* (a game the table has no entry for is taken as before ids, so a leg from the read stands only there) */
              chk(lv.concat(eloL).every(l => dkTakes(DKn, l, st(l))) && !badT.length,
                `on a payload baked with DraftKings' ids, after the press a level, a set or an Elo pick holds a leg priced from the read, or one with no DraftKings id at its line, or the Top lines one with no DraftKings id at its line: ` + lv.concat(eloL).filter(l => !dkTakes(DKn, l, st(l))).concat(badT).slice(0, 4).map(l => l.name + ' ' + l.label + ' ' + l.src).join(', '));
              console.log(`  (after the press, DraftKings' ids baked: all ${tNew.rows.length} Top lines have DraftKings' id at their line; no level, set or Elo pick holds a leg from the read)`);
              if (holdTopF) holdTopF('the Top lines right after the press, DraftKings\' ids baked', S.ui.pb, w.eval('pbGames()').filter(x => !S.ui.pb.off.includes(x.id))); }
          } finally { if (pl) pl.remove(); }
          w.eval('renderParlay()'); await wait(20); }
        /* DraftKings' game lines, real, from the press, on each game whose published lines are older than the
           read (dated by it, ESPN_GL set); the published ones, untouched, on each whose lines are newer; and the
           team bets on g at whichever stand */
        { const GL = w.eval('ESPN_GL'), iso = T0 != null ? new Date(T0).toISOString() : null, eq = (x, k) => JSON.stringify(x[k]) === JSON.stringify(before[x.id][k]);
          const bad = games.filter(x => { const o = ESPN_RULE.oddsOf(evs[games.indexOf(x)], x);
            return readOn(x) ? !(o && Object.entries(o.lines).every(([k, v]) => x[k] === v) && x.ls === 'dk' && x.lat === iso && !!GL[x.id] && GL[x.id].at === T0)
              : !(!GL[x.id] && KEYS.every(k => eq(x, k))); });
          chk(!bad.length, `the press did not put DraftKings' game lines on exactly the games whose published lines are older than its read (${games.filter(readOn).length} of ${games.length}), the rest left as published: `
            + bad.slice(0, 3).map(x => `${x.id} ${readOn(x) ? 'read' : 'published'} ${JSON.stringify(KEYS.map(k => x[k]))} (published ${new Date(pubT(x)).toISOString()})`).join(', '));
          const on = readOn(g), src = on ? ESPN_RULE.oddsOf(evs[games.indexOf(g)], g).lines : before[g.id], tl = w.eval('pricedLegs')([g]).filter(l => l.grp === 'TEAM');
          chk((!on || tl.length > 0) && tl.every(l => l.src === 'real' && l.price === (l.stat === 'ml' ? (l.team === g.h ? src.mlh : src.mla) : (l.team === g.h ? src.sph : src.spa))),
            `${g.id}'s team bets are not at ${on ? 'DraftKings\' game lines as the press read them' : 'the published game lines, which are newer than the read'}, real: ${JSON.stringify(KEYS.map(k => g[k]))} / ${tl.map(l => l.label + ' ' + l.price + ' ' + l.src).join(', ')}`); }
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
        /* ---- the read kept across a reload (app v108). The week's press above wrote what it read to this
           browser's own key (props_press_v1), and a real reload of the page (a new window on this one's
           storage, served this window's payload: a copy of the published one with g's player prices out as
           above, its S.odds rows with them, and the stand-in id table in) puts it back before the first
           draw, asking ESPN for nothing: g's player lines, every game's DraftKings game lines and ids, the
           status lines, each est. price on g's page and a builder leg the read priced. Each half gives way only
           to a publish newer than the read (app v108, round 4): a publish since whose player prices for g were
           pulled after the read (PAY.dk's at for g later than it) sets those alone aside: its game lines
           stand, nothing says the read gave way, and the builder leg goes back to the model's estimate; one
           whose pull for g came before the read leaves all of it standing; one that moved its game lines too,
           pulled after the read, sets the whole game aside and says so. Junk, another season or another
           version under the key draws the published prices and empties it, and a game kicked off since has
           nothing put back while the rest stand. And a tab left open across a publish, on two real boots: a
           read made in a window loaded before a publish whose pulls came before the read stands over it,
           replayed field by field. Round 5: each kept game-line field beside the time of the read that set
           it, so a publish between two reads takes the earlier read's fields alone, and a number read without
           its prices keeps a publish's own prices on that number; a kept player line or rung off ESPN's
           half-point steps, past 1000 or past 40 rungs is dropped, and a read that found no player lines is
           said for a day at most; another tab's read is carried as it stands by a tab whose schedule no longer
           offers its game, and its player lines lent to a later read that found none only over the same
           publish. Every plant is on a payload copy (or a key copy) of the check's own, each expectation
           worked out from this window (or boot 1's) before the plant ---- */
        { const KK = 'props_press_v1', SEAS = w.eval('SEASON'), GL1 = w.eval('ESPN_GL'), LV1 = clone(LV[wk] || {}), OUT1 = clone(w.eval('ESPN_OUT'));
          const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
          const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
          const IDS = w.eval('pbGames()').map(x => x.id), kept = games.filter(x => GL1[x.id]), keptIds = kept.map(x => x.id), others1 = games.filter(x => x.id !== g.id);
          const READ1 = IDS.filter(id => LV1[id]), NONE = IDS.filter(id => !LV1[id] && OUT1[id] && OUT1[id].st === 'none');
          /* the games whose game lines a reload puts back are those the press put on the page (LINED), each
             dated by its read: a game whose published lines are newer than the read by the page's clock (the
             smoke's clock set back on a Monday night) keeps them through the press and so through a reload.
             sameGl: a game's lines, and whether a read stands on them, as this window has them */
          const LINED = IDS.filter(id => GL1[id]), glAt = id => GL1[id] ? GL1[id].at : 0;
          const sameGl = (ww, GL, x) => same(linesOf(ww, x.id), lines1[x.id]) && !!GL[x.id] === !!GL1[x.id] && (!GL1[x.id] || GL[x.id].at === GL1[x.id].at);
          const linesOf = (ww, id) => { const y = ww.eval('S').sched.find(z => z.id === id); return y ? KEYS.map(k => y[k] === undefined ? null : y[k]) : null; };
          const pressCalls = r => r.calls.filter(c => esp(c.url) || /propBets/.test(c.url)).map(c => c.url.replace(/https:\/\/[^/]+/, '').slice(0, 80));
          const estCells = dd => { const o = {}; for (const c of dd.querySelectorAll('#gameView td.num.est[data-est="dkline"]')) { const tr = c.closest('tr'), i = tr && !tr.closest('.gsugg') ? tr.querySelector('input[data-leg]') : null;
              if (i) o[[i.dataset.leg, i.dataset.k, i.dataset.side || '', i.dataset.main || ''].join('|')] = txt(c) + ' | ' + c.title; } return o; };
          const openG = async ww => { const S2 = ww.eval('S'); S2.ui.showRungs = true; S2.ui.showAll = false; S2.ui.open = {}; for (const tm in ro) for (const x of ro[tm].players) S2.ui.open[x.pl.id] = true;
            S2.ui.game = g.id; ww.eval('renderGame()'); await wait(30); return txt(ww.document.querySelector(`#gameView [data-espn-status="${g.id}"]`)); };
          const nm = id => { const x = S.sched.find(y => y.id === id); return x ? `${x.a} at ${x.h}` : id; };
          /* the status lines as a reload should word them, worked out here from what a window read (c: this
             one's by default; boot 1's in check 5): a failure to read is the press's moment and is not kept, so
             it is not said after a reload */
          const C1 = { lv: LV1, gat: glAt, none: NONE };
          const expWeek = ({ read, lined, gave = 0, pubAt }, c = C1) => {
            const asked = IDS.filter(id => read.includes(id) || lined.includes(id) || c.none.includes(id));
            const gaveS = gave ? `your earlier Refresh odds read of ${gave} game${gave === 1 ? '' : 's'} gave way to prices published since` : '';
            if (!asked.length) return `Prices as published ${when(pubAt)}` + (gaveS ? '; ' + gaveS : '') + '.';
            const t = Math.max(0, ...read.map(id => Date.parse(c.lv[id].at)), ...lined.map(c.gat));
            const of = asked.length < IDS.length ? ` for ${asked.length} of ${IDS.length} games${asked.length <= 3 ? ' (' + asked.map(nm).join(', ') + ')' : ''}` : '';
            const parts = [read.length ? `DraftKings’ lines from ESPN${of}, read ${clk(t)}: player prices estimated from the line` : `DraftKings’ game lines from ESPN${of}, read ${clk(t)}`];
            if (c.none.length) parts.push(`${c.none.length} game${c.none.length === 1 ? ' has' : 's have'} no player lines posted yet`);
            if (gaveS) parts.push(gaveS); if (of) parts.push('press Refresh odds here for the rest');
            return parts.join('; ') + '.'; };
          const expGame = ({ read, lined, gave = false, pubAt }, c = C1) => { const gaveS = gave ? '; your earlier Refresh odds read gave way to prices published since' : '';
            if (!read && !lined) return `Prices as published ${when(pubAt)}${gaveS}.`;
            const t = Math.max(read ? Date.parse(c.lv[g.id].at) : 0, lined ? c.gat(g.id) : 0);
            return (read ? `DraftKings’ lines from ESPN, read ${clk(t)}: player prices estimated from the line` : `DraftKings’ game lines from ESPN, read ${clk(t)}`) + gaveS + '.'; };
          /* this window, as the press left it: g's page (open, every player and rung shown), the game lines
             and ids each game's read set, and a builder leg priced from the read */
          const cells1 = estCells(d), lines1 = Object.fromEntries(games.map(x => [x.id, linesOf(w, x.id)])), dk1 = clone((P.dk || {})[wk] || {}), idat1 = clone(w.eval('ESPN_IDAT'));
          /* what a read at time at did to a game's lines (the page's ESPN_GL d, which the key keeps), worked out
             here on its own from the stand-in scoreboard E and the published lines: each field the scoreboard
             gave as [its value, at], a spread's or total's prices only beside their number, [null, at] for both
             where a number came without them and moved off the published one (none where it came at the
             published number: the page keeps those); {} where the page left the read off (on, false: its
             published lines are newer) */
          const dOf = (E, x, on, at) => { if (!on) return {}; const o = ESPN_RULE.oddsOf(E[games.indexOf(x)], x), L = (o && o.lines) || {}, b = before[x.id], dd = {}, p = v => [v, at];
            for (const k of ['mla', 'mlh']) if (L[k] != null) dd[k] = p(L[k]);
            for (const [n, a, c] of [['sp', 'spa', 'sph'], ['tot', 'tov', 'tou']]) if (L[n] != null) { dd[n] = p(L[n]);
              if (L[a] != null && L[c] != null) { dd[a] = p(L[a]); dd[c] = p(L[c]); } else if (b[n] !== L[n]) { dd[a] = p(null); dd[c] = p(null); } }
            return dd; };
          /* a kept read's lines (dd, as dOf gives them, read at gat) replayed over a publish's row r, as linesOf
             gives them, with the time the page then holds them at (the smoke's own working of the round-5 rule,
             espnKeepLines): the publish's own time for its lines (since) is the DraftKings pull's (lat beside ls
             'dk'), else 0 over the publish the read was read over (sameSig) and the bake's over another; nothing
             goes back unless the read is later than that. Over the same publish every field as the read left
             it, literally (a value set, a null dropped). Over a newer one only the fields whose own read is
             later than since, as a read would put them: a money line set; a spread or total number with its
             two prices set beside it, or without them dropping the row's prices only where the row has another
             number (a kept null price on the row's own number leaves the row's prices); DraftKings', dated by
             the latest of those fields' reads. at null: the row as published */
          const replay = (r, dd, gat, sameSig, bake) => { const o = Object.fromEntries(KEYS.map(k => [k, r[k]])), out = at => ({ row: KEYS.map(k => o[k] === undefined ? null : o[k]), at });
            const lat = r.ls === 'dk' ? Date.parse(r.lat || '') : NaN, since = isFinite(lat) ? lat : sameSig ? 0 : (Date.parse(bake || '') || 0);
            const on = Object.keys(dd).filter(k => sameSig || dd[k][1] > since), has = k => on.includes(k), put = k => { o[k] = dd[k][0] === null ? undefined : dd[k][0]; };
            if (!on.length || !(gat > since)) return out(null);
            if (sameSig) on.forEach(put);
            else { for (const k of ['mla', 'mlh']) if (has(k) && dd[k][0] !== null) put(k);
              for (const [n, a, c] of [['sp', 'spa', 'sph'], ['tot', 'tov', 'tou']]) { if (!has(n) || dd[n][0] === null) continue;
                if (has(a) && has(c) && dd[a][0] !== null && dd[c][0] !== null) { put(a); put(c); } else if (o[n] !== dd[n][0]) { o[a] = undefined; o[c] = undefined; }
                put(n); } }
            const t = Math.max(...on.map(k => dd[k][1])); o.ls = 'dk'; o.lat = new Date(t).toISOString(); return out(t); };
          const pick = Object.values(ro).flatMap(t2 => t2.players).filter(x => x.starter)
            .flatMap(x => ['receiving_yards', 'rushing_yards', 'passing_yards', 'receptions'].filter(st => (lines[x.pl.id] || {})[st] != null).map(st => ({ x, st })))[0] || null;
          const par0 = clone(S.parlay); let bk = null;
          if (pick) { const key = `${g.id}|${pick.x.pl.id}|${pick.st}`, L = lines[pick.x.pl.id][pick.st]; S.parlay = {}; w.eval('toggleLeg')(key, L, g, 'over', true); await wait(20);
            const leg = S.parlay[key], r1 = d.querySelector('#parlayBody tr.legrow');
            bk = { key, L, st: pick.st, pid: pick.x.pl.id, leg: leg ? clone(leg) : null, price: leg ? clone(w.eval('legPrice')(leg)) : null, row: txt(r1 && r1.querySelectorAll('td')[4]) }; }
          chk(!!bk && !!bk.leg && bk.leg.src === 'dkline' && bk.price.src === 'dkline' && bk.price.ml === bk.leg.price,
            `no builder leg on ${g.id} priced from the read, to carry through a reload: ${JSON.stringify(bk && { leg: bk.leg && [bk.leg.label, bk.leg.price, bk.leg.src], price: bk.price })}`);
          w.eval('save()'); await wait(600);
          const SNAP = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); SNAP[k] = w.localStorage.getItem(k); }
          S.parlay = par0; w.eval('save(); renderParlay()'); await wait(20);
          /* the key holds the page as the press left it (app v108): version 1, this season's, an entry for each
             game the scoreboard gave odds for (every game here) and no other, under its week, each worked out
             here from the stand-in answers, the payload's ids as the press found them (dk0) and this window:
             gl, what the read did to the game's lines where the page put them on (it is later than the published
             lines' time: dOf, every field the stand-in gave, gP's spread prices null beside a number moved
             without them, each field beside the time of the read that set or dropped it, T0) and nothing where
             the page left them off, dated by the read (T0); every DraftKings id the
             read gave where the pull had none at that key or the same one (a paid id the read did not see is
             never taken for the read's), each with the read's time; the pull's glat, or the read's where the
             game had none and the read placed an id; the event, the pull's where it had one, else the read's;
             a signature of what it was read over;
             pl, the player lines' block the read kept (g's the stand-in's), with a signature of the published
             player prices, and what the read found ('ok' or 'none': a failure to read is the press's moment and
             is not kept) */
          const K1 = (() => { try { return JSON.parse(SNAP[KK]); } catch (e) { return null; } })(), e1 = K1 && K1.games ? K1.games[g.id] : null;
          const wantOf = x => { const o = ESPN_RULE.oddsOf(evs[games.indexOf(x)], x), d0 = (dk0[wk] || {})[x.id] || {}, ids = {}, idat = {};
            for (const k of Object.keys((o && o.ids) || {})) if (d0[k] == null || d0[k] === o.ids[k]) { ids[k] = o.ids[k]; idat[k] = T0; }
            const glat = Object.keys(ids).length && !isFinite(Date.parse(d0.glat)) ? new Date(T0).toISOString() : typeof d0.glat === 'string' ? d0.glat : null;
            /* the event as the page holds it after the press: the paid pull's where it had one (a read sets
               PAY.dk's event only where it is missing), else the read's; kept where it is a string */
            const ev = d0.event ? d0.event : (o && o.event) ? o.event : d0.event;
            const u = OUT1[x.id], out = u && (u.st === 'ok' || u.st === 'none') ? { st: u.st, why: u.why || '', sb: false, when: u.when || 0 } : undefined;
            return { w: wk, gl: { at: T0, lines: dOf(evs, x, readOn(x), T0), ids, idat, glat, event: typeof ev === 'string' ? ev : null }, pl: u && u.st === 'ok' ? LV1[x.id] : undefined, out }; };
          const keyBad = x => { const k = K1 && K1.games && K1.games[x.id], e = wantOf(x), why = [];
            if (!k) return ['no entry'];
            if (k.w !== e.w) why.push('week ' + k.w);
            if (!k.gl) why.push('no game lines');
            else { for (const f of ['at', 'lines', 'ids', 'idat', 'glat', 'event']) if (!same(k.gl[f], e.gl[f])) why.push(`gl.${f} ${JSON.stringify(k.gl[f])} want ${JSON.stringify(e.gl[f])}`);
              if (typeof k.gl.sig !== 'string') why.push('no gl.sig'); }
            if (!same(k.pl, e.pl)) why.push(`pl ${k.pl ? 'not the read\'s' : 'missing'}`);
            if (typeof k.plsig !== 'string') why.push('no plsig');
            if (!same(k.out, e.out)) why.push(`out ${JSON.stringify(k.out)} want ${JSON.stringify(e.out)}`);
            return why; };
          const badK = games.map(x => [x.id, keyBad(x)]).filter(([, b]) => b.length);
          chk(!!K1 && K1.v === 1 && K1.season === SEAS && !!e1 && same(e1.pl, blk) && T0 != null && !badK.length && same(Object.keys(K1.games || {}).sort(), games.map(x => x.id).sort()),
            `after the week's press this browser's ${KK} does not hold the page as the press left it (version 1, season ${SEAS}, an entry for each of the week's ${games.length} games and no other: what the read did to the game lines where they stand, null beside a number read without its prices, every id it gave or found with its time, the pull's glat, the pull's event else the read's, ${g.id}'s player lines): `
            + (SNAP[KK] == null ? 'no such key' : JSON.stringify(K1 && { v: K1.v, season: K1.season, games: Object.keys(K1.games || {}).length, bad: badK.slice(0, 3) }).slice(0, 1200)));
          const strip = c => { if (c.prices && Array.isArray(c.prices[wk])) c.prices[wk] = c.prices[wk].filter(r => String(r.game_id || '').trim() !== g.id);
            for (const pid of Object.keys((c.mkt || {})[wk] || {})) for (const st of Object.keys(c.mkt[wk][pid] || {})) if (c.mkt[wk][pid][st] && c.mkt[wk][pid][st].g === g.id) delete c.mkt[wk][pid][st];
            if (c.dk && c.dk[wk]) delete c.dk[wk][g.id]; c.espn_ids = { ...ids }; return c; };
          const copyOf = f => { const c = strip(JSON.parse(PAYLOAD_TXT)); if (f) f(c); return JSON.stringify(c); };
          const reboot = (seedV, pay) => run(state, undefined, null, false, { pay, seed: w2 => { for (const [k, v] of Object.entries(seedV)) w2.localStorage.setItem(k, v); } });
          const keyOf = ww => { try { return JSON.parse(ww.localStorage.getItem(KK)); } catch (e) { return null; } };
          /* 1. the reload: everything the read set, put back, and nothing asked of ESPN */
          { const R = await reboot(SNAP, copyOf()), w2 = R.w, d2 = R.d, S2 = w2.eval('S'), LV2 = w2.eval('ESPN_LIVE'), GL2 = w2.eval('ESPN_GL');
            chk(!R.timedOut && !R.errs.length, `the page broke on a reload with a kept read: ${R.errs.join('; ')}`);
            chk(!pressCalls(R).length, `a reload with a kept read asked ESPN for its lines, with no press: ${pressCalls(R).slice(0, 3).join(' ')}`);
            chk(!(S2.odds[g.id] && Object.keys(S2.odds[g.id]).length), `the reload's payload copy still prices ${g.id}'s players: the check stands on nothing`);
            chk(same((LV2[wk] || {})[g.id], blk), `after a reload ${g.id}'s player lines are not the read's: ${JSON.stringify((LV2[wk] || {})[g.id] || null).slice(0, 160)}`);
            { const bad = games.filter(x => !sameGl(w2, GL2, x));
              chk(!bad.length, `after a reload the game lines are not those the press left (${kept.length} of ${games.length} games on DraftKings' read): ${bad.map(x => x.id + ' ' + JSON.stringify(linesOf(w2, x.id)) + ' want ' + JSON.stringify(lines1[x.id])).slice(0, 3).join(', ')}`); }
            { const P2 = w2.eval('PAY'), bad = games.filter(x => !same(((P2.dk || {})[wk] || {})[x.id], dk1[x.id])), I2 = w2.eval('ESPN_IDAT');
              chk(!bad.length && same(I2, idat1), `after a reload the DraftKings ids the read gave (and when each was read) are not back: ${bad.map(x => x.id).slice(0, 3).join(', ')} ${same(I2, idat1) ? '' : 'ESPN_IDAT ' + JSON.stringify(I2).slice(0, 120)}`); }
            { const st = txt(d2.querySelector('#pbPanel [data-espn-status="week"]')), exp = expWeek({ read: READ1, lined: LINED });
              chk(st === exp, `after a reload the Parlay Builder's status line reads "${st}", not "${exp}"`); }
            const gst = await openG(w2), cells2 = estCells(d2), expG = expGame({ read: true, lined: !!GL1[g.id] });
            chk(gst === expG, `after a reload ${g.id}'s page's status line reads "${gst}", not "${expG}"`);
            { const k1 = Object.keys(cells1), miss = k1.filter(k => cells2[k] !== cells1[k]), extra = Object.keys(cells2).filter(k => !(k in cells1));
              chk(k1.length > 0 && !miss.length && !extra.length, `after a reload ${g.id}'s page does not price the read's lines as before it (${k1.length} est. prices from DraftKings' line): ${miss.concat(extra).slice(0, 2).map(k => k + ': "' + (cells2[k] || 'none') + '" was "' + (cells1[k] || 'none') + '"').join('; ')}`); }
            if (bk && bk.leg) { const l2 = S2.parlay[bk.key], p2 = l2 ? w2.eval('legPrice')(l2) : null, r2 = d2.querySelector('#parlayBody tr.legrow'), row2 = txt(r2 && r2.querySelectorAll('td')[4]);
              chk(!!p2 && p2.src === 'dkline' && p2.ml === bk.price.ml && row2 === bk.row,
                `after a reload the builder's ${bk.leg.name} ${bk.leg.label}, priced from the read at ${bk.price.ml}, is not: ${p2 ? p2.ml + ' ' + p2.src : 'no leg'} "${row2}" (was "${bk.row}")`); }
            { const K2 = keyOf(w2); chk(!!K2 && !!K2.games[g.id] && same(K2.games[g.id].pl, blk) && games.every(x => K2.games[x.id] && K2.games[x.id].gl), `after a reload the key no longer holds the read that stands: ${JSON.stringify(K2 && Object.keys(K2.games))}`); }
            w2.close(); }
          /* 3. junk, another season and another version under the key: the published prices, nothing asked of ESPN, the key gone */
          let pubLines = null;
          for (const [what, val] of [['a value that is not JSON', 'not json'], ['last season\'s read', JSON.stringify({ ...K1, season: SEAS - 1 })], ['a read of another version', JSON.stringify({ ...K1, v: 2 })]]) {
            const R = await reboot({ [KK]: val }, copyOf()), w2 = R.w, st = txt(R.d.querySelector('#pbPanel [data-espn-status="week"]')), gst = await openG(w2), pub = `Prices as published ${when(P.baked_at)}.`;
            const live = Object.keys(w2.eval('ESPN_LIVE')).length + Object.keys(w2.eval('ESPN_GL')).length + Object.keys(w2.eval('ESPN_OUT')).length;
            chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && !live && w2.localStorage.getItem(KK) === null && st === pub && gst === pub && !R.d.querySelector('#gameView [data-est="dkline"]'),
              `a load with ${what} under ${KK} does not draw the published prices, ask ESPN for nothing and empty the key: ${JSON.stringify({ errs: R.errs.length, calls: pressCalls(R).length, live, key: w2.localStorage.getItem(KK) != null, st, gst })}`);
            if (!pubLines) pubLines = linesOf(w2, g.id);
            w2.close(); }
          /* 2. a later publish with new player prices for g pulled after the read (PAY.dk's at for g and the bake
             both the page's clock now, later than every read time): its game lines stand, its player lines give
             way, nothing says the read gave way (some of it stands), and the builder leg goes back to the model's
             estimate; its mirror, the same publish with g's player prices pulled a minute before the read: the
             read is the newer, so all of it stands; then one that moves g's game lines too, pulled after the read:
             nothing of g, and the status lines say so */
          const bk2 = new w.Date(w.Date.now()).toISOString(), mvPl = c => { c.baked_at = bk2; ((c.dk ??= {})[wk] ??= {})[g.id] = { at: bk2 }; };
          { const R = await reboot(SNAP, copyOf(mvPl)), w2 = R.w, d2 = R.d, S2 = w2.eval('S'), LV2 = w2.eval('ESPN_LIVE'), GL2 = w2.eval('ESPN_GL'), AS = w2.eval('ESPN_ASIDE');
            chk(!R.timedOut && !R.errs.length && !pressCalls(R).length, `a reload after newer player prices for ${g.id} broke or asked ESPN for its lines: ${R.errs.concat(pressCalls(R)).slice(0, 3).join('; ')}`);
            chk(!(LV2[wk] || {})[g.id] && !!AS[g.id] && AS[g.id].pl != null && AS[g.id].gl == null && games.every(x => sameGl(w2, GL2, x))
              && others1.every(x => same((LV2[wk] || {})[x.id], LV1[x.id])),
              `after newer player prices were published for ${g.id}, a reload does not keep its game lines (and the other games' reads) and set its player lines aside: ${JSON.stringify({ pl: !!(LV2[wk] || {})[g.id], aside: AS[g.id] || null, gl: !!GL2[g.id], lines: linesOf(w2, g.id) })}`);
            { const st = txt(d2.querySelector('#pbPanel [data-espn-status="week"]')), exp = expWeek({ read: READ1.filter(id => id !== g.id), lined: LINED, gave: GL1[g.id] ? 0 : 1, pubAt: bk2 });
              chk(st === exp, `after newer player prices for ${g.id}, the Parlay Builder's status line reads "${st}", not "${exp}" (the read gave way ${GL1[g.id] ? 'only in part' : 'wholly: its game lines were not on the page'})`); }
            const gst = await openG(w2), expG = expGame({ read: false, lined: !!GL1[g.id], gave: !GL1[g.id], pubAt: bk2 });
            chk(gst === expG && !Object.keys(estCells(d2)).length, `after newer player prices for ${g.id}, its page's status line reads "${gst}", not "${expG}", or a price from the read is still drawn`);
            if (bk && bk.leg) { const l2 = S2.parlay[bk.key], p2 = l2 ? w2.eval('legPrice')(l2) : null, est = l2 ? w2.eval('rungView')(S2.players[bk.pid], bk.st, l2.mu, bk.L + 0.5, g.w).est : null;
              chk(!!p2 && p2.src === 'est' && p2.ml === est, `after newer player prices for ${g.id}, the builder's ${bk.leg.name} ${bk.leg.label} is not back on the model's estimate: ${p2 ? p2.ml + ' ' + p2.src : 'no leg'}, want ${est}`); }
            { const K2 = keyOf(w2), k = K2 && K2.games[g.id]; chk(!!k && !!k.gl && !k.pl, `after newer player prices for ${g.id}, the key does not hold its game lines alone: ${JSON.stringify(k && Object.keys(k))}`); }
            w2.close(); }
          /* the mirror: g's player prices in the later publish pulled a minute before every read time of g's
             (the scoreboard's, its player lines', what that read found), the bake still after the read: the
             pull's own time decides, never the bake's. Everything stands as on the plain reload (1), the read's
             ids beside the pull's time in PAY.dk */
          { const tE = Math.min(T0, Date.parse(blk.at), (OUT1[g.id] || {}).when || Infinity) - 60e3, isoE = new Date(tE).toISOString();
            const R = await reboot(SNAP, copyOf(c => { c.baked_at = bk2; ((c.dk ??= {})[wk] ??= {})[g.id] = { at: isoE }; })), w2 = R.w, d2 = R.d, S2 = w2.eval('S'), LV2 = w2.eval('ESPN_LIVE'), GL2 = w2.eval('ESPN_GL'), AS = w2.eval('ESPN_ASIDE');
            const dkG = ((w2.eval('PAY').dk || {})[wk] || {})[g.id];
            chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && same((LV2[wk] || {})[g.id], blk) && !AS[g.id] && games.every(x => sameGl(w2, GL2, x))
              && others1.every(x => same((LV2[wk] || {})[x.id], LV1[x.id])) && same(dkG, { ...dk1[g.id], at: isoE }) && same(w2.eval('ESPN_IDAT'), idat1),
              `after a publish whose player prices for ${g.id} were pulled before the read (${isoE}), a reload does not keep all of the read (its player lines, the game lines, the other games' reads, the read's ids beside the pull's time): ${JSON.stringify({ errs: R.errs.slice(0, 2), calls: pressCalls(R).length, pl: !!(LV2[wk] || {})[g.id], aside: AS[g.id] || null, dk: dkG || null })}`);
            { const st = txt(d2.querySelector('#pbPanel [data-espn-status="week"]')), exp = expWeek({ read: READ1, lined: LINED, pubAt: bk2 });
              chk(st === exp && !/gave way/.test(st), `after a publish whose player prices for ${g.id} were pulled before the read, the Parlay Builder's status line reads "${st}", not "${exp}"`); }
            const gst = await openG(w2), expG = expGame({ read: true, lined: !!GL1[g.id], pubAt: bk2 }), cells2 = estCells(d2), k1 = Object.keys(cells1);
            chk(gst === expG && k1.length > 0 && k1.every(k => cells2[k] === cells1[k]) && Object.keys(cells2).length === k1.length,
              `after a publish whose player prices for ${g.id} were pulled before the read, its page's status line reads "${gst}", not "${expG}", or it does not price the read's lines as before the reload (${Object.keys(cells2).length} of ${k1.length} est. prices)`);
            if (bk && bk.leg) { const l2 = S2.parlay[bk.key], p2 = l2 ? w2.eval('legPrice')(l2) : null, r2 = d2.querySelector('#parlayBody tr.legrow'), row2 = txt(r2 && r2.querySelectorAll('td')[4]);
              chk(!!p2 && p2.src === 'dkline' && p2.ml === bk.price.ml && row2 === bk.row,
                `after a publish whose player prices for ${g.id} were pulled before the read, the builder's ${bk.leg.name} ${bk.leg.label}, priced from the read at ${bk.price.ml}, is not: ${p2 ? p2.ml + ' ' + p2.src : 'no leg'} "${row2}" (was "${bk.row}")`); }
            { const K2 = keyOf(w2), k = K2 && K2.games[g.id]; chk(!!k && !!k.gl && same(k.pl, blk), `after a publish whose player prices for ${g.id} were pulled before the read, the key does not hold its read whole: ${JSON.stringify(k && Object.keys(k))}`); }
            w2.close(); }
          { const mvGl = c => { mvPl(c); const r = c.sched.find(y => y.id === g.id); r.mla = r.mla == null ? -150 : r.mla < 0 ? r.mla - 10 : r.mla + 10;
              /* pulled after the read: the DraftKings pull's own time where the payload's lines are DraftKings'
                 (lat beside ls 'dk'), else the bake's, bk2 either way (the page's fallbacks) */
              if (r.ls === 'dk') r.lat = bk2; };
            const pub2 = JSON.parse(copyOf(mvGl)).sched.find(y => y.id === g.id), want = pub2.mla;
            const R = await reboot(SNAP, copyOf(mvGl)), w2 = R.w, d2 = R.d, LV2 = w2.eval('ESPN_LIVE'), GL2 = w2.eval('ESPN_GL'), AS = w2.eval('ESPN_ASIDE');
            const pubG = pubLines ? pubLines.map((v, i) => KEYS[i] === 'mla' ? want : KEYS[i] === 'lat' ? (pub2.lat === undefined ? null : pub2.lat) : v) : null;
            chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && !(LV2[wk] || {})[g.id] && !GL2[g.id] && !!AS[g.id] && AS[g.id].pl != null && AS[g.id].gl != null
              && same(linesOf(w2, g.id), pubG) && others1.every(x => sameGl(w2, GL2, x)),
              `after newer game lines and player prices for ${g.id}, a reload puts something of its read back, or not the other games': ${JSON.stringify({ pl: !!(LV2[wk] || {})[g.id], gl: !!GL2[g.id], aside: AS[g.id] || null, lines: linesOf(w2, g.id), want: pubG })}`);
            { const st = txt(d2.querySelector('#pbPanel [data-espn-status="week"]')), exp = expWeek({ read: READ1.filter(id => id !== g.id), lined: LINED.filter(id => id !== g.id), gave: 1, pubAt: bk2 });
              chk(st === exp, `with nothing of ${g.id}'s read standing, the Parlay Builder's status line reads "${st}", not "${exp}"`); }
            const gst = await openG(w2), expG = expGame({ read: false, lined: false, gave: true, pubAt: bk2 });
            chk(gst === expG, `with nothing of its read standing, ${g.id}'s page's status line reads "${gst}", not "${expG}"`);
            { const K2 = keyOf(w2); chk(!(K2 && K2.games[g.id]) && others1.every(x => K2 && K2.games[x.id]), `with nothing of ${g.id}'s read standing, the key still holds it, or not the rest: ${JSON.stringify(K2 && Object.keys(K2.games))}`); }
            w2.close(); }
          /* 4. g kicked off since the read (its kickoff two hours before the page's clock, on the copy): nothing
             of it put back and the key without it; the other games' reads stand */
          { const t0 = w.Date.now() - 2 * 3600e3, pt = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t0)).map(x => [x.type, x.value]));
            const R = await reboot(SNAP, copyOf(c => { const r = c.sched.find(y => y.id === g.id); r.d = `${pt.year}-${pt.month}-${pt.day}`; r.t = `${pt.hour}:${pt.minute}`; }));
            const w2 = R.w, S2 = w2.eval('S'), g2 = S2.sched.find(y => y.id === g.id), LV2 = w2.eval('ESPN_LIVE'), GL2 = w2.eval('ESPN_GL'), K2 = keyOf(w2);
            chk(!!g2 && w2.eval('gameStarted')(g2), `the copy's kickoff for ${g.id} two hours before the page's clock did not start it: ${g2 && g2.d} ${g2 && g2.t}`);
            chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && !(LV2[wk] || {})[g.id] && !GL2[g.id] && same(linesOf(w2, g.id), pubLines) && !(K2 && K2.games[g.id])
              && others1.every(x => sameGl(w2, GL2, x) && same((LV2[wk] || {})[x.id], LV1[x.id]) && K2 && K2.games[x.id]),
              `a reload after ${g.id} kicked off puts something of its read back, keeps it under the key, or drops the other games': ${JSON.stringify({ pl: !!(LV2[wk] || {})[g.id], gl: !!GL2[g.id], lines: linesOf(w2, g.id), want: pubLines, key: K2 && Object.keys(K2.games) })}`);
            w2.close(); }
          /* 5. a tab left open across a publish, on two real boots. Boot 1, a fresh window on the payload copy
             (P1) with nothing in its storage, presses the week's Refresh odds on a scoreboard of its own (evs1:
             gP's spread at its published number with no prices, which the page keeps, so the read keeps that
             number without its prices; no total for gT, so the read sets nothing of it); boot 2 loads boot 1's
             storage on a copy (P2) published since: new DraftKings game lines for g, for gP (its spread on
             another number, with its prices) and for gT (its total and its prices), each pulled a minute before
             boot 1's read (lat beside ls 'dk'), new player prices for g pulled then too (PAY.dk's at), baked once
             before the read and once after it (a rebake of those pulls: their own times decide, never the
             bake's). Every field the read set is later than those pulls (app v108, round 5: each field by the
             time of its own read), so each half of every game's read stands over P2: its lines the read's,
             replayed over P2's and dated by the read (replay: gP's spread number the read's and P2's prices for
             it dropped, since the read had that number without its prices and P2 has another; gT's total, which
             the read did not set, P2's), g's player lines, every game's DraftKings ids beside P2's with their
             read times, nothing set aside and no status line saying the read gave way. Every expectation is
             worked out from boot 1's stand-in answers and the copies' rows. gT: a game other than gP whose
             published lines are older than the page's clock (so the read is put on it), g where it can be */
          let nB = 0, bareSame = false, totP2 = false;
          const gT = [g, ...others].find(x => x !== gP && pubT(x) < w.Date.now()) || null, IX = k => KEYS.indexOf(k);
          { const R1 = await reboot({}, copyOf()), w1 = R1.w, d1 = R1.d, f1 = w1.fetch, evs1 = games.map((x, i) => evOf(x, i, 'same', x === gT)), route1 = fullOf(evs1);
            w1.fetch = (u, o) => { const s2 = String(u); if (!esp(s2)) return f1(u, o); ALL_CALLS.push('GET ' + s2); return ans(route1(s2)); };
            await pressIn(w1, d1.querySelector('#pbPanel [data-espn-refresh="week"]'));
            const GLb = clone(w1.eval('ESPN_GL')), LVb = clone(w1.eval('ESPN_LIVE')[wk] || {}), OUTb = clone(w1.eval('ESPN_OUT')), IDATb = clone(w1.eval('ESPN_IDAT')), dkB = clone((w1.eval('PAY').dk || {})[wk] || {});
            const Tb = (() => { const t = new Set([...Object.values(GLb).map(v => v.at), ...Object.values(IDATb).flatMap(v => Object.values(v))]); return t.size === 1 ? [...t][0] : null; })();
            const SNAPB = {}; for (let i = 0; i < w1.localStorage.length; i++) { const k = w1.localStorage.key(i); SNAPB[k] = w1.localStorage.getItem(k); }
            const KB = (() => { try { return JSON.parse(SNAPB[KK]); } catch (e) { return null; } })(), dB = x => dOf(evs1, x, Tb != null && Tb > pubT(x), Tb), glB = id => KB && KB.games && KB.games[id] && KB.games[id].gl;
            const badB = games.filter(x => !(glB(x.id) && same(glB(x.id).lines, dB(x))));
            bareSame = !!gP && !!glB(gP.id) && 'sp' in dB(gP) && !('spa' in dB(gP));
            chk(!R1.timedOut && !R1.errs.length && Tb != null && !!LVb[g.id] && !badB.length,
              `boot 1's press did not read the week on its own scoreboard, dated by its one read, or its ${KK} does not hold what the read did to each game's lines, each field beside its read's time (${gP ? gP.id + '\'s spread number with no prices' : 'no game for a spread without its prices'}${gT ? ', no total for ' + gT.id : ''}): ${JSON.stringify({ errs: R1.errs.slice(0, 2), Tb, pl: !!LVb[g.id], bad: badB.slice(0, 3).map(x => [x.id, glB(x.id) ? glB(x.id).lines : null, dB(x)]) })}`);
            const tE = Math.min(Tb == null ? w1.Date.now() : Tb, Date.parse((LVb[g.id] || {}).at) || Infinity, (OUTb[g.id] || {}).when || Infinity) - 60e3, isoE = new Date(tE).toISOString();
            w1.close();
            const Cb = { lv: LVb, gat: id => GLb[id] ? GLb[id].at : 0, none: IDS.filter(id => !LVb[id] && OUTb[id] && OUTb[id].st === 'none') };
            const READb = IDS.filter(id => LVb[id]), LINEDb = IDS.filter(id => GLb[id]), mv = v => v == null ? -150 : v < 0 ? v - 15 : v + 15;
            const P2of = bake => copyOf(c => { c.baked_at = bake; ((c.dk ??= {})[wk] ??= {})[g.id] = { at: isoE };
              const r = c.sched.find(y => y.id === g.id); r.mla = mv(r.mla); r.mlh = mv(r.mlh); r.sp = (typeof r.sp === 'number' ? r.sp : 0) + 1; r.spa = -125; r.sph = 105;
              r.tot = (typeof r.tot === 'number' ? r.tot : 44) + 1; r.tov = -118; r.tou = -102; r.ls = 'dk'; r.lat = isoE;
              if (gP) { const q = c.sched.find(y => y.id === gP.id); q.sp = (typeof q.sp === 'number' ? q.sp : 0) + 1; q.spa = -125; q.sph = 105; q.ls = 'dk'; q.lat = isoE; }
              if (gT && gT !== g) { const q = c.sched.find(y => y.id === gT.id); q.tot = (typeof q.tot === 'number' ? q.tot : 44) + 1; q.tov = -118; q.tou = -102; q.ls = 'dk'; q.lat = isoE; } });
            /* whether P2 publishes a game's lines as P1 did (the page's signature reads the same fields, a
               missing one as an empty one) */
            const P1j = JSON.parse(copyOf()), sv = v => v == null ? '' : String(v), sameRow = (a, b) => !!a && !!b && KEYS.every(k => sv(a[k]) === sv(b[k]));
            for (const [what, bake] of [['baked before the read', new Date(tE + 30e3).toISOString()], ['baked after the read', new w.Date(w.Date.now()).toISOString()]]) {
              const P2t = P2of(bake), P2j = JSON.parse(P2t), R = await reboot(SNAPB, P2t), w2 = R.w, d2 = R.d, LV2 = w2.eval('ESPN_LIVE'), AS = w2.eval('ESPN_ASIDE'), P2p = w2.eval('PAY'), GL2 = w2.eval('ESPN_GL');
              const row2 = x => P2j.sched.find(y => y.id === x.id), wantL = x => replay(row2(x), dB(x), Tb, sameRow(P1j.sched.find(y => y.id === x.id), row2(x)), bake);
              const badL = games.filter(x => !same(linesOf(w2, x.id), wantL(x).row) || (GL2[x.id] ? GL2[x.id].at : null) !== wantL(x).at);
              const badD = games.filter(x => !same(((P2p.dk || {})[wk] || {})[x.id], x.id === g.id ? { ...dkB[g.id], at: isoE } : dkB[x.id]));
              chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && !Object.keys(AS).length && !badL.length && !badD.length && same(w2.eval('ESPN_IDAT'), IDATb)
                && games.every(x => same((LV2[wk] || {})[x.id], LVb[x.id])),
                `a read made in a tab left open across a publish (${what}, its pulls for ${g.id}${gP ? ', ' + gP.id : ''}${gT && gT !== g ? ', ' + gT.id : ''} a minute before the read) does not stand whole over it on a reload, each field the read set put back and dated by its read: ${JSON.stringify({ errs: R.errs.slice(0, 2), calls: pressCalls(R).slice(0, 2), aside: AS, lines: badL.slice(0, 2).map(x => [x.id, linesOf(w2, x.id), GL2[x.id] ? GL2[x.id].at : null, wantL(x)]), dk: badD.slice(0, 3).map(x => x.id), idat: same(w2.eval('ESPN_IDAT'), IDATb), pl: !!(LV2[wk] || {})[g.id] })}`);
              /* the field the read did not set, which P2 changed: P2's, on its own (badL holds it with the rest) */
              if (gT && Object.keys(dB(gT)).length && !('tot' in dB(gT))) { const r1 = P1j.sched.find(y => y.id === gT.id), r2 = row2(gT), L2 = linesOf(w2, gT.id);
                chk(sv(r1.tot) !== sv(r2.tot) && ['tot', 'tov', 'tou'].every(k => L2[IX(k)] === (r2[k] == null ? null : r2[k])) && L2[IX('ls')] === 'dk' && L2[IX('lat')] === new Date(Tb).toISOString(),
                  `after a publish (${what}) that moved ${gT.id}'s total, which the kept read did not set, a reload does not show P2's total beside the read's other lines: ${JSON.stringify({ tot: ['tot', 'tov', 'tou', 'ls', 'lat'].map(k => L2[IX(k)]), want: ['tot', 'tov', 'tou'].map(k => r2[k]), was: r1.tot })}`);
                totP2 = true; }
              { const st = txt(d2.querySelector('#pbPanel [data-espn-status="week"]')), exp = expWeek({ read: READb, lined: LINEDb, pubAt: bake }, Cb);
                chk(st === exp && !/gave way/.test(st), `after a publish whose pulls came before the read (${what}), the Parlay Builder's status line reads "${st}", not "${exp}"`); }
              const gst = await openG(w2), expG = expGame({ read: !!LVb[g.id], lined: !!GLb[g.id], pubAt: bake }, Cb);
              chk(gst === expG && !/gave way/.test(gst) && Object.keys(estCells(d2)).length > 0, `after a publish whose pulls came before the read (${what}), ${g.id}'s page's status line reads "${gst}", not "${expG}", or it draws no price from the read`);
              { const K2 = keyOf(w2), k = K2 && K2.games[g.id]; chk(!!k && !!k.gl && same(k.pl, LVb[g.id]) && games.every(x => K2.games[x.id]), `after a publish whose pulls came before the read (${what}), the key does not hold the read that stands: ${JSON.stringify(K2 && Object.keys(K2.games))}`); }
              w2.close(); nB++; } }
          /* 6. what a kept read may not bring back, planted on a copy of this window's key (K1) and reloaded on
             the payload copy (app v108, round 5): under a made-up player in g's player lines, a line off ESPN's
             half-point steps, one past 1000 and one of 0 are dropped, and a rung list keeps only its half points
             over 0 and to 1000, once each, the 40 lowest, while the rest of g's block stands and its page prices
             the read's lines as before; and a read that found no player lines posted says so for a day at most
             by the page's clock: gN's, dated 25 hours back, is not put back (or said), while one dated 23 hours
             back, planted on another game (gH, its player lines taken out of the copy: a read that found none
             keeps none), is. Each expectation is that rule worked out here on K1 */
          let nBound = 0, noneDay = '';
          if (K1 && e1 && e1.pl) { const K6 = clone(K1), PID = '00-SMOKE-KEEP', ok = v => typeof v === 'number' && isFinite(v) && v > 0 && v <= 1000 && Number.isInteger(v * 2), now6 = w.Date.now();
            const pl6 = { receptions: 3.3, receiving_yards: 1000.5, passing_yards: 0, rushing_yards: 45.5 }, rg6 = Array.from({ length: 45 }, (_, i) => 10 * (45 - i)).concat([2.25, 1000.5, 0, -5, 2.5, 10]);
            K6.games[g.id].pl = { ...K6.games[g.id].pl, lines: { ...(K6.games[g.id].pl.lines || {}), [PID]: pl6 }, rungs: { ...(K6.games[g.id].pl.rungs || {}), [PID]: { receiving_yards: rg6 } } };
            const wantPl = { ...e1.pl, lines: { ...(e1.pl.lines || {}), [PID]: Object.fromEntries(Object.entries(pl6).filter(([, v]) => ok(v))) },
              rungs: { ...(e1.pl.rungs || {}), [PID]: { receiving_yards: [...new Set(rg6.filter(ok))].sort((a, b) => a - b).slice(0, 40) } } };
            nBound = Object.values(pl6).filter(v => !ok(v)).length + rg6.length - wantPl.rungs[PID].receiving_yards.length;
            const old = gN && NONE.includes(gN.id) && K6.games[gN.id] && K6.games[gN.id].out ? gN : null, gH = others1.find(x => x !== gN && x !== gF && K6.games[x.id]) || null;
            if (old) K6.games[old.id].out = { ...K6.games[old.id].out, when: now6 - 25 * 3600e3 };
            const outH = gH ? { st: 'none', why: '', sb: false, when: now6 - 23 * 3600e3 } : null; if (gH) { delete K6.games[gH.id].pl; K6.games[gH.id].out = outH; }
            const R = await reboot({ ...SNAP, [KK]: JSON.stringify(K6) }, copyOf()), w2 = R.w, d2 = R.d, LV2 = w2.eval('ESPN_LIVE'), OUT2 = w2.eval('ESPN_OUT'), K2 = keyOf(w2);
            chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && same((LV2[wk] || {})[g.id], wantPl) && !!K2 && !!K2.games[g.id] && same(K2.games[g.id].pl, wantPl),
              `a kept read with a player line off ESPN's half-point steps, past 1000 or of 0, or a rung list of ${rg6.length} with such rungs in it, does not come back with those dropped and the 40 lowest rungs left (the rest of ${g.id}'s block as read), on the page and under the key: ${JSON.stringify({ errs: R.errs.slice(0, 2), lines: (((LV2[wk] || {})[g.id] || {}).lines || {})[PID] || null, rungs: ((((LV2[wk] || {})[g.id] || {}).rungs || {})[PID] || {}).receiving_yards || null })}`);
            const gst = await openG(w2), cells2 = estCells(d2), k1 = Object.keys(cells1);
            chk(k1.length > 0 && k1.every(k => cells2[k] === cells1[k]) && Object.keys(cells2).length === k1.length,
              `with a kept line or rung out of bounds dropped, ${g.id}'s page does not price the read's lines as before the reload (${Object.keys(cells2).length} of ${k1.length} est. prices; "${gst}")`);
            if (old || gH) { const none6 = NONE.filter(id => !old || id !== old.id).concat(gH && !NONE.includes(gH.id) ? [gH.id] : []), st = txt(d2.querySelector('#pbPanel [data-espn-status="week"]')), exp = expWeek({ read: READ1.filter(id => !gH || id !== gH.id), lined: LINED }, { ...C1, none: IDS.filter(id => none6.includes(id)) });
              chk((!old || !OUT2[old.id]) && (!gH || (same(OUT2[gH.id], outH) && !(LV2[wk] || {})[gH.id])) && st === exp,
                `a kept read that found no player lines posted is not said for a day at most on a reload (${old ? old.id + '\'s, 25 hours old, not put back' : ''}${old && gH ? '; ' : ''}${gH ? gH.id + '\'s, 23 hours old, put back' : ''}): ${JSON.stringify({ old: old ? OUT2[old.id] || null : undefined, fresh: gH ? OUT2[gH.id] || null : undefined })} "${st}", want "${exp}"`);
              noneDay = [old && 'one 25 hours old not said', gH && 'one 23 hours old said'].filter(Boolean).join(', '); }
            w2.close(); }
          /* 7. another tab's read, written to this browser after a tab loaded, through that tab's own press (app
             v108, round 5: espnKeepWrite judges only the games this tab has its own entry for, on its own
             schedule). (a) A tab on a copy where g has kicked off (its schedule no longer offers g) presses the
             week: g's entry is carried as the other tab left it, every game it read is its own read's. (b) A
             tab on the payload copy reads g's page, where DraftKings has posted no player lines now: over the
             same publish its entry keeps the other tab's player lines beside what its own read found; (c) over
             a publish with g's player prices pulled since the other tab's read, never. Each expectation is
             worked out here from K1 and the tab's own read */
          let carried = false, lent = 0;
          { const t0 = w.Date.now() - 2 * 3600e3, pt = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t0)).map(x => [x.type, x.value]));
            const tab = async (pay, route, which) => { const R = await reboot({}, pay), w2 = R.w, f2 = w2.fetch;
              w2.fetch = (u, o) => { const s2 = String(u); if (!esp(s2)) return f2(u, o); ALL_CALLS.push('GET ' + s2); return ans(route(s2)); };
              w2.localStorage.setItem(KK, SNAP[KK]);
              if (which === 'week') await pressIn(w2, R.d.querySelector('#pbPanel [data-espn-refresh="week"]'));
              else { await openG(w2); await pressIn(w2, R.d.querySelector(`#gameView [data-espn-refresh="${g.id}"]`)); }
              const T = (() => { const s = new Set([...Object.values(w2.eval('ESPN_GL')).map(v => v.at), ...Object.values(w2.eval('ESPN_IDAT')).flatMap(v => Object.values(v))]); return s.size === 1 ? [...s][0] : null; })();
              return { R, w2, T, K: keyOf(w2) }; };
            if (others1.length) { const { R, w2, T, K } = await tab(copyOf(c => { const r = c.sched.find(y => y.id === g.id); r.d = `${pt.year}-${pt.month}-${pt.day}`; r.t = `${pt.hour}:${pt.minute}`; }), full, 'week');
              /* each other game's game lines from whichever read gave it something (its lines put on, or an id it
                 dated): this tab's, later, else the other tab's where that one did, else this tab's */
              const GLw = w2.eval('ESPN_GL'), IDw = w2.eval('ESPN_IDAT'), gave = (GLx, IDx, id) => !!GLx[id] || Object.keys(IDx[id] || {}).length > 0;
              const k1Gave = id => { const e = K1.games[id] && K1.games[id].gl; return !!e && (Object.keys(e.lines || {}).length > 0 || Object.keys(e.ids || {}).length > 0); };
              const off = others1.filter(x => !(K && K.games[x.id] && K.games[x.id].gl && K.games[x.id].gl.at === (gave(GLw, IDw, x.id) || !k1Gave(x.id) ? T : K1.games[x.id].gl.at)));
              chk(!R.timedOut && !R.errs.length && T != null && T > T0 && !!K && same(K.games[g.id], K1.games[g.id]) && !off.length,
                `a tab whose schedule has ${g.id} kicked off, pressing the week after another tab kept its read of ${g.id}, does not carry that read as it stands with its own read of every other game: ${JSON.stringify({ errs: R.errs.slice(0, 2), T, T0, g: K && K.games[g.id] ? Object.keys(K.games[g.id]) : null, same: !!K && same(K.games[g.id], K1.games[g.id]), off: off.slice(0, 3).map(x => x.id) })}`);
              carried = true; w2.close(); }
            if (e1 && e1.pl) { const none = u => { if (/\/scoreboard\?/.test(u)) return { code: 200, body: { events: evs } }; if (props(u)) return { code: 404, body: { error: { message: 'No propBets found', code: 404 } } }; return { code: 404, body: {} }; };
              for (const [what, f, lend] of [['the same publish', null, true], ['a publish with its player prices pulled since', mvPl, false]]) {
                const { R, w2, T, K } = await tab(copyOf(f), none, 'game'), k = K && K.games[g.id], o2 = w2.eval('ESPN_OUT')[g.id], ps = w2.eval('espnPlSig')(w2.eval('S').sched.find(y => y.id === g.id));
                chk(!R.timedOut && !R.errs.length && !!o2 && o2.st === 'none' && !!k && !!k.out && k.out.st === 'none' && k.out.when === o2.when && k.plsig === ps && (lend ? same(k.pl, e1.pl) : !k.pl) && (lend ? k.plsig === e1.plsig : k.plsig !== e1.plsig),
                  `a tab on ${what}, reading ${g.id}'s page where DraftKings has no player lines posted after another tab kept its lines, ${lend ? 'does not keep those lines beside its own read' : 'keeps the other tab\'s lines, read over another publish'}: ${JSON.stringify({ errs: R.errs.slice(0, 2), out: o2 || null, key: k ? { pl: !!k.pl, out: k.out || null, plsig: k.plsig, mine: ps, theirs: e1.plsig } : null })}`);
                lent++; w2.close(); } } }
          const bareMoved = !!gP && readOn(gP) && (dOf(evs, gP, true, T0).spa || [])[0] === null;
          /* 8. a number the read had without its prices, over a publish since that has that same number with
             prices of its own (app v108, round 5): the week's press read gP's spread off its published number
             with no prices, so the read dropped them (dOf's nulls); on a copy whose gP spread is DraftKings' at
             the read's number with prices of its own, pulled a minute before the read (and baked since, as every
             publish is: a bake of its own, so the page builds its schedule from it), a reload keeps those
             prices beside the read's other lines, which stand (replay: a kept null price never deletes a
             publish's real prices on the read's own number) */
          let keptPx = false;
          if (bareMoved) { const dP = dOf(evs, gP, true, T0), isoM = new Date(T0 - 60e3).toISOString();
            const pay8 = copyOf(c => { c.baked_at = new w.Date(w.Date.now()).toISOString(); const q = c.sched.find(y => y.id === gP.id); q.sp = dP.sp[0]; q.spa = -121; q.sph = 101; q.ls = 'dk'; q.lat = isoM; }), r8 = JSON.parse(pay8).sched.find(y => y.id === gP.id);
            const R = await reboot(SNAP, pay8), w2 = R.w, GL2 = w2.eval('ESPN_GL'), AS = w2.eval('ESPN_ASIDE'), want = replay(r8, dP, T0, false, JSON.parse(pay8).baked_at), L2 = linesOf(w2, gP.id);
            chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && !AS[gP.id] && same(L2, want.row) && !!GL2[gP.id] && GL2[gP.id].at === want.at && L2[IX('sp')] === dP.sp[0] && L2[IX('spa')] === -121 && L2[IX('sph')] === 101,
              `a kept read of ${gP.id}'s spread number without its prices, over a publish since with that same number and prices of its own, does not keep those prices beside the read's lines on a reload: ${JSON.stringify({ errs: R.errs.slice(0, 2), aside: AS[gP.id] || null, lines: L2, want: want.row, at: GL2[gP.id] ? GL2[gP.id].at : null })}`);
            keptPx = true; w2.close(); }
          /* 9. two reads of a game with a publish between them (app v108, round 5: each field by the time of the
             read that set it). Boot A, a fresh window on the payload copy, presses the week twice: first on the
             stand-in scoreboard (tA), then on one with no total for gT (tB), so its key holds gT's total from the
             first read and the rest of its lines from the second; boot B loads A's storage on a copy whose gT
             lines are DraftKings' (money lines, spread and total all moved) pulled between the two reads and
             baked after them: the second read's fields stand over it, the first read's total gives way to the
             copy's, and the lines are dated by the second read. Each expectation is worked out from the two
             stand-in scoreboards and the copy's row */
          let twoReads = false;
          if (gT) { const R1 = await reboot({}, copyOf()), w1 = R1.w, d1 = R1.d, f1 = w1.fetch, evsB = games.map((x, i) => evOf(x, i, 'moved', x === gT)); let route = full;
            w1.fetch = (u, o) => { const s2 = String(u); if (!esp(s2)) return f1(u, o); ALL_CALLS.push('GET ' + s2); return ans(route(s2)); };
            const btn = () => d1.querySelector('#pbPanel [data-espn-refresh="week"]'), atOf = () => { const G = w1.eval('ESPN_GL')[gT.id]; return G ? G.at : null; };
            await pressIn(w1, btn()); const tA = atOf(); await wait(20); route = fullOf(evsB); await pressIn(w1, btn()); const tB = atOf();
            const SN = {}; for (let i = 0; i < w1.localStorage.length; i++) { const k = w1.localStorage.key(i); SN[k] = w1.localStorage.getItem(k); }
            const KA = (() => { try { return JSON.parse(SN[KK]); } catch (e) { return null; } })(), dd = { ...dOf(evs, gT, true, tA), ...dOf(evsB, gT, true, tB) };
            w1.close();
            chk(!R1.timedOut && !R1.errs.length && tA != null && tB != null && tB > tA + 1 && !!KA && !!KA.games[gT.id] && !!KA.games[gT.id].gl && KA.games[gT.id].gl.at === tB && same(KA.games[gT.id].gl.lines, dd),
              `two presses of the week (the second with no total for ${gT.id}) do not keep each of ${gT.id}'s line fields beside the time of the read that set it: ${JSON.stringify({ errs: R1.errs.slice(0, 2), tA, tB, kept: KA && KA.games[gT.id] && KA.games[gT.id].gl ? KA.games[gT.id].gl.lines : null, want: dd })}`);
            if (tA != null && tB != null && tB > tA + 1) { const tM = Math.floor((tA + tB) / 2), o = ESPN_RULE.oddsOf(evsB[games.indexOf(gT)], gT).lines, oA = ESPN_RULE.oddsOf(evs[games.indexOf(gT)], gT).lines, m = v => v < 0 ? v - 15 : v + 15;
              const pay9 = copyOf(c => { c.baked_at = new w.Date(w.Date.now()).toISOString(); const q = c.sched.find(y => y.id === gT.id); q.mla = m(o.mla); q.mlh = m(o.mlh); q.sp = o.sp + 1; q.spa = -125; q.sph = 105; q.tot = oA.tot + 2; q.tov = -118; q.tou = -102; q.ls = 'dk'; q.lat = new Date(tM).toISOString(); });
              const r9 = JSON.parse(pay9).sched.find(y => y.id === gT.id), want = replay(r9, dd, tB, false, JSON.parse(pay9).baked_at);
              const R = await reboot(SN, pay9), w2 = R.w, GL2 = w2.eval('ESPN_GL'), AS = w2.eval('ESPN_ASIDE'), L2 = linesOf(w2, gT.id);
              chk(!R.timedOut && !R.errs.length && !pressCalls(R).length && !AS[gT.id] && same(L2, want.row) && !!GL2[gT.id] && GL2[gT.id].at === tB && want.at === tB
                && ['tot', 'tov', 'tou'].every(k => L2[IX(k)] === r9[k]) && L2[IX('mla')] === o.mla && L2[IX('sp')] === o.sp && L2[IX('lat')] === new Date(tB).toISOString(),
                `over a publish of ${gT.id}'s lines pulled between two reads of them, a reload does not keep the later read's fields and give the earlier read's total way to the publish's, dated by the later read: ${JSON.stringify({ errs: R.errs.slice(0, 2), aside: AS[gT.id] || null, lines: L2, want: want.row, at: GL2[gT.id] ? GL2[gT.id].at : null, tA, tM, tB })}`);
              twoReads = true; w2.close(); } }
          console.log(`Refresh odds kept across a reload: ${keptIds.length} games' game lines (${bareMoved ? gP.id + '\'s spread prices dropped by a number read without them' : 'no spread read without its prices'}), ${g.id}'s player lines and ${Object.keys(cells1).length} est. prices from them put back with no request; player prices or game lines pulled after the read set their half aside, pulled before it stand; junk, last season's, another version and a kickoff each set it aside; a tab left open across a publish stands field by field over it on ${nB} bakes${bareSame ? ` (${gP.id}'s spread number read without its prices, P2's prices for it dropped)` : ''}${totP2 ? `, ${gT.id}'s total the read did not set P2's` : ''}; ${nBound} kept values off ESPN's steps, out of bounds or past 40 rungs dropped${noneDay ? ', no player lines posted said for a day: ' + noneDay : ''}; another tab's read ${carried ? 'carried by a tab whose schedule no longer offers it, ' : ''}lent over the same publish and not over another (${lent} of 2)${keptPx ? `; a number read without its prices keeps a publish's own prices on it (${gP.id})` : ''}${twoReads ? `; a publish between two reads of ${gT.id} takes the earlier read's total alone` : ''}`); }
        S.ui.game = null; w.eval('closeGameModal()');
        /* the suggested parlays on that game alone, players only, on two payloads. Baked with DraftKings' ids
           (app v109; PAY.dk a plain copy of the table as the press left it, the press's game-line ids for g in
           it and none for a player's line, which ESPN never gives): no leg from the read is in the levels'
           lines, a level, a game page's hands or an Elo pick, and every level is empty and says it is for want
           of DraftKings' ids, with when player prices are pulled. Baked before them (no PAY.dk, as a payload
           from before 9 October 2026): a tested leg from the read counts as a book price (here a level holds
           one), an untested one never, each marked est. on its card; the press's own PAY.dk put back after */
        S.ui.pb.off = games.filter(x => x.id !== g.id).map(x => x.id).concat(w.eval('pbGames()').filter(x => String(x.w) !== wk).map(x => x.id)); for (const k of ['ml', 'ats', 'total']) S.ui.pb.k[k] = false; S.ui.pb.k.over = true; S.ui.pb.k.under = true;
        const dkPress = P.dk;
        { P.dk = JSON.parse(JSON.stringify(dkPress || {}));
          w.eval('PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); renderParlay()'); await wait(40);
          const PULLED_W = 'pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET)';
          const rA = w.eval('getPbTiers()'), pA = w.eval('pbPool')(w.eval('pbGames()').filter(x => !S.ui.pb.off.includes(x.id))), hA = w.eval('gameLegPool')(g);
          const fromRead = w.eval('pricedLegs')([g]).filter(l => l.src === 'dkline' && !dkOwnId(P.dk, l, false)), eloA = ((typeof w.eloPicks === 'function' && w.eloPicks()) || { tiers: [] }).tiers.flatMap(t => t.legs);
          chk(fromRead.length > 0 && rA.tiers.every(t => !t.legs && typeof t.why === 'string' && t.why.startsWith('No player legs DraftKings’ betslip can take yet: a player’s line read by Refresh odds carries no DraftKings id') && t.why.includes(PULLED_W))
            && ![...pA.pref, ...pA.thin].some(l => l.src === 'dkline') && pA.noIdPl === pA.noId && !hA.some(l => l.src === 'dkline') && hA.every(l => dkOwnId(P.dk, l, false)) && !eloA.some(l => l.src === 'dkline'),
            `on a payload baked with DraftKings' ids, the ${fromRead.length} legs priced from the read (none with an id) are suggested, or the levels do not say they are empty for want of DraftKings' ids: ` + rA.tiers.map(t => t.why || t.legs.map(l => l.label + ' ' + l.src).join('+')).join(' / '));
          /* (app v119, the owner's call of 19 October 2026: "i dont want to include those in the parlay builder, only ones i
             can add via id") the Top lines on these ticks take none of the read's legs either: every row has DraftKings'
             id at its line, and none carries a line on a missing id (holdTop). From app v115 to v118 they kept them */
          { const onT = w.eval('pbGames()').filter(x => !S.ui.pb.off.includes(x.id));
            w.eval('PB_TOP_CACHE=new Map(); renderPb()'); await wait(20);
            const tR = w.eval('getPbTop()').rows, kR = tR.filter(l => !dkOwnId(P.dk, l, false));
            chk(!kR.length, `on a payload baked with DraftKings' ids, the Top lines after the press hold ${kR.length} of ${tR.length} rows with no DraftKings id at their line: ` + kR.slice(0, 4).map(l => l.name + ' ' + l.label + ' ' + l.src).join(', '));
            if (holdTopF) holdTopF(`${g.id}'s player lines after a press, DraftKings' ids baked`, S.ui.pb, onT);
            console.log(`  (the Top lines after the press: all ${tR.length} rows with DraftKings' id at their line, the ${fromRead.length} legs priced from the read left out)`); } }
        delete P.dk;
        w.eval('PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); renderParlay()'); await wait(40);
        const r = w.eval('getPbTiers()'), taken = takenRule(w), legsAll = r.tiers.filter(t => t.legs).flatMap(t => t.legs), UNTESTED = l => ['completions', 'carries'].includes(l.stat) || (!l.main && l.stat === 'receptions');
        nLev = legsAll.filter(l => l.src === 'dkline').length;
        chk(nLev > 0, 'with DraftKings\' lines read by Refresh odds and no price of its own, no level on the game holds a leg priced from them: ' + r.tiers.map(t => t.why || t.legs.map(l => l.label + ' ' + l.src).join('+')).join(' / '));
        chk(legsAll.every(taken) && !legsAll.some(UNTESTED), 'a level holds a leg priced from DraftKings\' line that is not the rule\'s, or of a kind never suggested (completions, carries, a receptions rung): ' + legsAll.filter(l => !taken(l) || UNTESTED(l)).map(l => l.name + ' ' + l.label + ' ' + l.src).join(', '));
        chk(!w.eval('pricedLegs')([g]).some(l => l.src === 'dkline' && (UNTESTED(l) || !taken(l))) && !w.eval('gameLegPool')(g).some(l => l.src === 'dkline' && (UNTESTED(l) || !taken(l))),
          'the lines a suggestion or a game hand is built from hold an untested leg from DraftKings\' line, or one not the rule\'s');
        /* market + form on a leg from the read, worked here as for a real price (eloAltP on src 'real', which
           elo/check_tab.js holds equal to its 'dkline'), and the far-off rule on its estimated fair chance (the
           rule's own, fairRule): the panel's preferred legs and every level's thin mark follow them, and a game
           page's hands keep off a far one */
        { const fair = fairRule(w), FAR = w.eval('FAR_OFF'), mlP = w.eval('mlProb'), alt = typeof w.eloAltP === 'function' ? w.eloAltP : null;
          const form = l => { if (!alt) return true; const a = alt(l.pid, l.side, l.price, 'real', l.stat); return a != null && a - mlP(l.price) >= 0.03; };
          const pool = w.eval('pbPool')(w.eval('pbGames()').filter(x => !S.ui.pb.off.includes(x.id))), farOf = l => { const f = fair(l); return !f || l.p - f.p >= FAR - 1e-9; };
          const badPref = pool.pref.filter(l => l.src === 'dkline' && (!(l.p - mlP(l.price) >= 0.03) || !form(l) || farOf(l)));
          const badThin = legsAll.filter(l => l.src === 'dkline' && l.thin !== !(l.p - mlP(l.price) >= 0.03 && form(l)));
          const badHand = w.eval('gameLegPool')(g).filter(l => l.src === 'dkline' && farOf(l));
          chk(!!alt && !badPref.length && !badThin.length && !badHand.length && pool.pref.concat(pool.thin).every(l => l.src !== 'dkline' || !farOf(l)),
            `a leg priced from DraftKings' line is preferred or not thin without market + form or a 3-point edge, or far off its estimated fair chance in the panel or a game page's hands: ${[...badPref, ...badThin, ...badHand].slice(0, 4).map(l => l.name + ' ' + l.label + ' ' + l.price + (l.thin ? ' thin' : '')).join(', ')}`); }
        /* the Top 50 lines on these ticks mark est. exactly their lines priced from DraftKings' line, each titled
           with what it is priced from, and say once what such a line is and when the lines were read; and where
           the game is a prime-time one whose set is still live (before its lock, 2 hours before kickoff, by the
           page's clock: a locked set no press changes), its set on Suggested Parlays takes a leg from the read only
           by the rule (a tested kind at the formula's own price), marked est. on its card */
        const spLive = primeOwn(g) && w.eval('Date.now()') < etKick(g) - 2 * 3600e3;
        /* (app v112) a set the night rule hides now (nightOwn) has no cards on the tab: spOn stood in for these checks
           of its cards and its parlay card, put back after them */
        const spHid = spLive && typeof w.eval('spOn') === 'function' && !nightOwn(w.eval('pbGames()').filter(primeOwn), S.sched, w.eval('Date.now()')).on.some(x => x.id === g.id);
        if (spHid) { w.__spOnPress = w.eval('spOn'); w.eval('spOn=function(){ return spGames(); }'); console.log(`  (${g.id}'s set is not on the tab by the night rule now: spOn stood in for the checks of its cards after the press)`); }
        const pnl = d.getElementById('pbPanel'), tops = [...pnl.querySelectorAll('ol.pb-top > li.pb-trow')], topR = w.eval('getPbTop()').rows;
        chk(tops.length === topR.length && topR.some(l => l.src === 'dkline') && topR.every((l, i) => { const m = tops[i].querySelector('.pb-tc i.est'); return l.src === 'dkline' ? !!m && m.title.startsWith('DraftKings’ line from ESPN, read ') : !m; }),
          'the Top 30 lines do not mark est. exactly their lines priced from DraftKings\' line read by Refresh odds, with what each is priced from: ' + topR.filter(l => l.src === 'dkline').length + ' of ' + tops.length);
        chk(txt(pnl).includes('A player line marked est. is priced from DraftKings’ line read on ESPN by Refresh odds, where DraftKings’ own price is not on file or its line has moved since: DraftKings’ lines as read ' + when(at) + '; prices estimated.'),
          'the panel does not say what a line marked est. is and when DraftKings\' lines were read');
        if (spLive) { await (async () => { [...d.querySelectorAll('#tabs button')].find(b2 => b2.dataset.tab === 'suggest').click(); await wait(80); })();
          const ss = w.eval('spSet')(g.id), sl = ss.tiers.filter(t => t.legs), el = d.querySelector(`#spPanel .sp-game[data-sp-game="${g.id}"]`);
          chk(sl.flatMap(t => t.legs).every(l => taken(l) && !UNTESTED(l)) && sl.every(t => { const c = el && el.querySelector(`.pb-tier.${t.id}`), li = c ? [...c.querySelectorAll('.pb-legs li')] : [], nd = t.legs.filter(l => l.src === 'dkline').length;
              return li.length === t.legs.length && t.legs.every((l, i) => { const m = li[i].querySelector('.pr i.est'); return l.src === 'dkline' ? !!m && m.title.startsWith('DraftKings’ line from ESPN, read ') : !m; })
                && txt(c.querySelector('.pb-nums').children[1].querySelector('span')) === (nd ? 'price, est.' : 'price') && !!c.querySelector('.pb-espnline') === nd > 0; }),
            `${g.id}'s set holds a leg from the read the rule does not take, or its cards do not mark est. exactly their legs priced from DraftKings' line`);
          [...d.querySelectorAll('#tabs button')].find(b2 => b2.dataset.tab === 'parlay').click(); await wait(40); }
        /* the parlay card on a parlay with one: priced as estimated, each such leg named to add by hand (a set's
           level where the game's set holds one, else the same legs in the builder) */
        const sE = spLive ? w.eval('spSet')(g.id).tiers.find(t => t.legs && t.legs.some(l => l.src === 'dkline')) : null;
        const tE = sE || r.tiers.find(t => t.legs && t.legs.some(l => l.src === 'dkline'));
        if (tE) { const keepPE = JSON.stringify(S.parlay); if (!sE) { w.eval('pbPut')(tE.legs, 'the check\'s legs'); await wait(30); }
          const m = sE ? w.PARLAY_CARD.fromTier('sp', `${g.id}:${sE.id}`) : w.PARLAY_CARD.fromBuilder(), s1 = m ? w.PARLAY_CARD.linkText(m) : { title: '', text: '' }, L1 = m ? (sE ? sE.legs : w.PARLAY_CARD.quote().legs) : [];
          const miss = m ? m.dk.miss.filter(x => L1[x.n - 1] && L1[x.n - 1].src === 'dkline') : [];
          chk(!!m && m.priceNote === 'estimated price' && m.legs.every((x, i) => x.tag === (L1[i].src === 'real' ? 'book' : 'est.')) && miss.length === L1.filter(l => l.src === 'dkline').length
            && miss.every(x => x.why === 'price estimated from DraftKings’ line read on ESPN; its DraftKings id is not read') && / \(estimated price\)$/.test(s1.title)
            && miss.every(x => s1.text.includes(`${x.n}. ${x.who} ${x.what} (price estimated from DraftKings’ line read on ESPN, id not read)`)),
            `the parlay card on ${sE ? g.id + '\'s ' + tE.label : 'the ' + tE.label + ' level\'s legs in the builder'} does not price it as estimated, mark its legs from DraftKings' line est., or name each to add by hand, its id not read: ${m && m.priceNote} / ${m ? m.dk.miss.map(x => x.n + ' ' + x.why).join(' / ') : ''} / ${s1.title}`);
          S.parlay = JSON.parse(keepPE);
          /* and in the builder: the leg marked est., its fair chance est., and when the lines were read */
          const dl = tE.legs.find(l => l.src === 'dkline'), { key, thin, ...one } = dl; S.parlay = { [key]: one }; w.eval('save(); renderParlay()'); await wait(30);
          const row1 = d.querySelector('#parlayBody tr.legrow'), cell = row1 && row1.querySelectorAll('td')[4], lf = row1 && row1.querySelector('.legfair'), f = fairRule(w)(dl);
          chk(!!cell && txt(cell) === `${fmt(dl.price)} est.` && !!lf && !!f && txt(lf) === `fair ${(f.p * 100).toFixed(0)}% est.` && txt(d.querySelector('#parlayBody [data-espn-read]')).startsWith('DraftKings’ lines as read '),
            `the builder does not mark ${dl.name} ${dl.label} est. with its estimated fair chance, or say when the lines were read: "${txt(cell)}" "${txt(lf)}"`); }
        if (spHid) { w.eval('spOn=window.__spOnPress'); delete w.__spOnPress; }
        if (dkPress === undefined) delete P.dk; else P.dk = dkPress;
        w.eval('PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); renderParlay()'); await wait(20);
        /* a game's page reads that game alone */
        S.ui.game = g.id; w.eval('renderGame()'); await wait(20); net.log = [];
        await press(d.querySelector(`#gameView [data-espn-refresh="${g.id}"]`));
        { const us = net.log.map(x => x.url), pb = us.filter(u => props(u));
          chk(us.filter(u => /\/scoreboard\?/.test(u)).length === 1 && pb.length === 1 && props(pb[0]).eid === evId(g) && us.length === 2,
            `${g.id}'s page's Refresh odds read more than its game: ${us.map(u => u.replace(/https:\/\/[^/]+/, '')).join(' ')}`); }
        S.ui.game = null; w.eval('closeGameModal()');
        /* that press alone, on a page that has read nothing else: the week's status line says it read that
           game alone, and to press there for the rest; a spread id the pull had at a number DraftKings has
           since moved off keeps the pull's date on the card, the read's own ids the read's; and a reload
           (the press's lines put back, its read dropped) sends a leg it priced in the builder back to the
           model's estimate, no longer one to add by hand from ESPN */
        { reset(); const sp0 = ESPN_RULE.oddsOf(evs[games.indexOf(g)], g).lines.sp, kH = -sp0, OLD = new Date(Math.floor((w.Date.now() - 30 * 3600e3) / 60e3) * 60e3).toISOString();
          ((P.dk ??= {})[wk] ??= {})[g.id] = { glat: OLD, [`team:${g.h}|ats|${kH + 1}`]: 'SMKPAID' };
          const L0 = k => ({ gid: g.id, week: +g.w, pid: 'team:' + g.h, stat: 'ats', k, side: 'over', main: false, grp: 'TEAM', src: 'real', name: TEAM(g.h), label: 'To cover' });
          /* before the press, the pull's id at its own number, dated by the pull */
          const prePaid = w.PARLAY_CARD.dkPlan([L0(kH + 1)]);
          S.ui.game = g.id; w.eval('renderGame()'); await wait(20);
          await press(d.querySelector(`#gameView [data-espn-refresh="${g.id}"]`)); S.ui.game = null; w.eval('closeGameModal()'); w.eval('renderParlay()'); await wait(20);
          const n0 = w.eval('pbGames()').length, e = (w.eval('ESPN_LIVE')[wk] || {})[g.id], t = Math.max(Date.parse(e && e.at) || 0, (w.eval('ESPN_GL')[g.id] || {}).at || 0), st = txt(d.querySelector('#pbPanel [data-espn-status="week"]'));
          const exp = n0 > 1 ? `DraftKings’ lines from ESPN for 1 of ${n0} games (${g.a} at ${g.h}), read ${clk(t)}: player prices estimated from the line; press Refresh odds here for the rest.` : null;
          chk(!exp || st === exp, `after a press on ${g.id}'s page alone, the Parlay Builder's status line reads "${st}", not "${exp}"`);
          /* after it (app v109): a leg at the press's number on the press's id, dated by the press; a leg at the
             pull's number, which the press shows DraftKings has moved off since, goes on at DraftKings' number
             as the press read it (its id, dated by the press), said so, rather than on the pull's old id */
          const onRead = w.PARLAY_CARD.dkPlan([L0(kH)]), onPaid = w.PARLAY_CARD.dkPlan([L0(kH + 1)]), atRead = w.eval('espnIdAt')(g.id, `team:${g.h}|ats|${kH}`), idRead = P.dk[wk][g.id][`team:${g.h}|ats|${kH}`];
          chk(P.dk[wk][g.id].glat === OLD && !!atRead && !!idRead && idRead !== 'SMKPAID' && onRead.ok.length === 1 && onRead.ok[0].id === idRead && !onRead.ok[0].swap && +onRead.read === atRead
            && prePaid.ok.length === 1 && prePaid.ok[0].id === 'SMKPAID' && !prePaid.ok[0].swap && !!prePaid.read && prePaid.read.toISOString() === OLD
            && onPaid.ok.length === 1 && onPaid.ok[0].id === idRead && onPaid.ok[0].swap === dkSigned(kH) && +onPaid.read === atRead,
            `the card does not date the read's spread id by the press and the pull's by the pull, or does not put a leg at the pull's number on the press's newer one: ${JSON.stringify({ glat: P.dk[wk][g.id].glat, atRead, idRead, onRead: onRead.ok, onReadAt: onRead.read, prePaid: prePaid.ok, prePaidAt: prePaid.read, onPaid: onPaid.ok, onPaidAt: onPaid.read })}`);
          const x1 = Object.values(ro).flatMap(t2 => t2.players).find(x => (lines[x.pl.id] || {}).receiving_yards != null);
          if (x1) { const L = lines[x1.pl.id].receiving_yards, key = `${g.id}|${x1.pl.id}|receiving_yards`; S.parlay = {}; w.eval('toggleLeg')(key, L, g, 'over', true); w.eval('renderParlay()'); await wait(20);
            const leg1 = S.parlay[key], during = w.eval('legPrice')(leg1), cardDuring = w.PARLAY_CARD.fromBuilder();
            reset(); w.eval('renderParlay()'); await wait(20);
            const after = w.eval('legPrice')(leg1), cardAfter = w.PARLAY_CARD.fromBuilder(), est = w.eval('rungView')(S.players[x1.pl.id], 'receiving_yards', leg1.mu, L + 0.5, g.w).est;
            const why = c => (c && c.dk.miss.find(m => m.n === 1) || {}).why || '';
            chk(!!leg1 && leg1.src === 'dkline' && during.src === 'dkline' && why(cardDuring) === 'price estimated from DraftKings’ line read on ESPN; its DraftKings id is not read'
              && after.src === 'est' && after.ml === est && !d.querySelector('#parlayBody [data-espn-read]') && why(cardAfter) !== why(cardDuring) && !cardAfter.fairDk,
              `after a reload, ${x1.pl.n}'s over ${L} receiving yards, priced from the read, is not back on the model's estimate (${after.ml} ${after.src}, want ${est}) or the card still names it to add by hand from ESPN: "${why(cardAfter)}"`); } }
        /* ESPN not answering at all, and a week with no player lines posted, as the status line words them */
        reset(); net.route = () => ({ reject: true }); w.eval('renderParlay()'); await wait(20);
        /* this press from the builder's own Refresh odds (app v111): the same read, the focus kept on it */
        await press(d.querySelector('#parlayBody [data-espn-refresh="week"]'));
        chk(!!d.activeElement && d.activeElement.dataset.espnRefresh === 'week' && !!d.activeElement.closest('#parlayBody'), 'a press of the builder\'s own Refresh odds did not keep the focus on it through the redraw');
        { const n0 = w.eval('pbGames()').length, st = txt(d.querySelector('#pbPanel [data-espn-status="week"]'));
          chk(st === `Prices as published ${when(P.baked_at)}; couldn’t reach ESPN for ${n0} game${n0 === 1 ? '' : 's'}: ${n0 === 1 ? 'its' : 'their'} published prices stand.` && !Object.keys(w.eval('ESPN_LIVE')).length && games.every(x => KEYS.every(k => JSON.stringify(x[k]) === JSON.stringify(before[x.id][k]))),
            `with ESPN not answering, the status line reads "${st}", or a read or a game line changed`); }
        reset(); net.route = u => /\/scoreboard\?/.test(u) ? { code: 200, body: { events: evs } } : { code: 404, body: { error: { message: 'No propBets found', code: 404 } } }; w.eval('renderParlay()'); await wait(20);
        const tA = w.Date.now(); await press(d.querySelector('#pbPanel [data-espn-refresh="week"]')); const tB = w.Date.now();
        /* the game lines the read put on the page, as on the first press: only over published lines older than
           it (none at all, on a Monday night under way with the page set back, when the line says the
           published prices), every one dated by the one read */
        { const ids0 = w.eval('pbGames()').map(x => x.id), n0 = ids0.filter(id => evs.some((e, i) => games[i].id === id)).length, rest = ids0.length - n0, st = txt(d.querySelector('#pbPanel [data-espn-status="week"]'));
          const GLn = w.eval('ESPN_GL'), ats = [...new Set(ids0.filter(id => GLn[id]).map(id => GLn[id].at))], t2 = ats.length === 1 ? ats[0] : null;
          const off = games.filter(x => GLn[x.id] ? !(t2 != null && t2 >= tA && t2 <= tB && t2 > pubT(x)) : !(pubT(x) >= tA));
          chk(ats.length <= 1 && !off.length, `with no player lines posted, the press's game lines are not on exactly the games whose published lines are older than its read, dated by it: ${JSON.stringify(ats)} ${off.slice(0, 3).map(x => x.id + (GLn[x.id] ? ' read' : ' published') + ' ' + new Date(pubT(x)).toISOString()).join(', ')}`);
          const exp = (ats.length ? `DraftKings’ game lines from ESPN, read ${clk(Math.max(...ats))}` : `Prices as published ${when(P.baked_at)}`) + `; ${n0} game${n0 === 1 ? ' has' : 's have'} no player lines posted yet` + (rest ? `; couldn’t reach ESPN for ${rest} game${rest === 1 ? '' : 's'}: ${rest === 1 ? 'its' : 'their'} published prices stand` : '') + '.';
          chk(st === exp, `with no player lines posted, the status line reads "${st}", not "${exp}"`); }
      } finally {
        w.fetch = f0; reset(); w.__plStub = plStub; w.eval('pricedLegs=window.__plStub'); delete w.__plStub;
        const put = (o, k, v) => { if (v === undefined) delete o[k]; else o[k] = v; };
        put(P, 'espn_ids', keep.ids); put(P.mkt, wk, keep.mk); put(S.odds, g.id, keep.o); put(P, 'dk', keep.dk);
        S.ui.pb = keep.pb; S.parlay = keep.parlay; Object.assign(S.ui, { game: keep.ui.game, open: keep.ui.open, showRungs: keep.ui.rungs, showAll: keep.ui.all });
        w.eval('PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); save(); renderSlate(); renderParlay(); closeGameModal()'); await wait(30); }
      console.log(`Refresh odds, on stand-in ESPN answers for week ${wk}: ${nEst} est. prices on ${g.id}'s page the rule's, none of them on its levels with DraftKings' ids baked and ${nLev} without, the card, the builder, a game page's own read, a failing ESPN and no lines posted`); } }

  /* ---- X Parlays is the file: three parlays of a fixture's, one of them cleared ---- */
  { const F = await run(state, 'https://demon-x13.github.io/nfl-hub/#xparlays', null, false, { file: FIXFILE });
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
    const T = await run(state, 'https://demon-x13.github.io/nfl-hub/#xparlays', null, false, { seed });
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
    const R = await run(state, 'https://demon-x13.github.io/nfl-hub/#parlay', null, false, { seed: w2 => w2.localStorage.setItem(PROP_KEY, JSON.stringify({ stake: saved, ui: { pb } })) });
    await wait(300);
    const P = R.d.getElementById('pbPanel'), on = R.d.querySelector('#pbPanel [data-pb-mix].on'), games = R.w.eval('typeof pbGames') === 'function' ? R.w.eval('pbGames()').length : 0;
    chk(!R.timedOut && R.errs.length === 0 && JSON.stringify(R.w.eval('S').ui.pb) === JSON.stringify(pb), 'the suggested parlays\' saved choices did not come back with the page: ' + JSON.stringify(R.w.eval('S').ui.pb));
    chk(R.w.eval('typeof pbGames') === 'function' && (!games) || (!!on && on.dataset.pbMix === 'players' && [...P.querySelectorAll('[data-pb-kind]')].every(cb => cb.checked === ['over', 'under'].includes(cb.dataset.pbKind)) && !P.querySelector('details.pb-games').open),
      'the panel does not open on the visitor\'s own choices (Players only, the games list shut)');
    { const box = R.d.getElementById('pbStake'), shown = want % 1 ? want.toFixed(2) : String(want);
      chk(R.w.eval('S').stake === want && (!games || (!!box && box.value === shown)) && !/NaN/.test(txt(P)),
        `a saved amount of ${JSON.stringify(saved)} came back as ${JSON.stringify(R.w.eval('S').stake)}, the Bet amount box showing ${box ? JSON.stringify(box.value) : 'nothing'}, not ${shown}`); }
    R.w.close(); }

  /* ---- the suggestions record on Suggested Parlays (app v111): props/data/suggest_ledger.json, asked for beside the
     payload once a load with no-store, and (app v118, the owner's calls of 19 October 2026: "can we retroactively look
     back and find what we would have suggested and count it to the record?", then "do a separate section for night
     games and then the sunday slot of games") its backtest beside it, props/data/suggest_backtest.json, the same way. At
     the head of each section, Night games (the record's `prime` map) and the Sunday slot (`slot`), a row for the model's
     parlays (each entry's `tiers`) and one for the Elo picks (`elo`, levels elo-safe to elo-xtrm), a pill a level, as the
     ELO Ratings tab's record bar: won-lost and units on $1, then what is pending; where some of what is counted is the
     backtest's, one chip saying which weeks. The numbers are worked out here from the entries' own grades: each
     season's unit and level once, from the backtest first and the record over it (each in key order: a kickoff the
     league moved makes a new key), so the record's grade for a level wins over the backtest's; a push apart and a win a
     push shortened at what it paid; only levels with a grade. Each pill's title states its graded and won, the wins
     expected by the book's fair chance (on how many had one) and by the level's own chance (the model's, or the Elo's
     for an Elo pick), its pushes and how many came from the backtest. A file is read as a record only where it is an
     object with one of its maps an object (the ledger: entries, prime or slot; the backtest: prime or slot); with
     neither, nothing is drawn (the record's place hidden). Held on the real files as they stand and on made-up pairs,
     word for word: every number the page states, and so blocking ---- */
  { const LAB = { safe: 'Safe', med: 'Medium', aggr: 'Aggressive', xtrm: 'Extreme' }, isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
    const REC_SEC = { night: 'prime', slot: 'slot' }, REC_KIND = { model: { field: 'tiers', pre: '', name: 'Model parlays', by: 'the model' }, elo: { field: 'elo', pre: 'elo-', name: 'Elo picks', by: 'the Elo chance' } };
    const isRec = L => isMap(L) && (isMap(L.entries) || isMap(L.prime) || isMap(L.slot)), isBt = B => isMap(B) && (isMap(B.prime) || isMap(B.slot));
    const recOwn = (L, B, sec, kind) => { const K = REC_KIND[kind], o = {}; for (const id of Object.keys(LAB)) o[K.pre + id] = { label: LAB[id], won: 0, lost: 0, push: 0, u: 0, fair: 0, fairN: 0, model: 0, bt: 0 };
      const last = new Map(), wk = new Set(); let pending = 0;
      /* a unit the record holds levels of this kind for is the record's whole: the backtest's of it left out */
      const LR = isRec(L) && isMap(L[REC_SEC[sec]]) ? L[REC_SEC[sec]] : {}, held = new Set(Object.values(LR).filter(e => isMap(e) && Array.isArray(e[K.field])).map(e => e.season + '|' + e.gid));
      const take = (src, bt) => { const E = src && isMap(src[REC_SEC[sec]]) ? src[REC_SEC[sec]] : {};
        for (const k of Object.keys(E).sort()) { const e = E[k]; if (!isMap(e) || !Array.isArray(e[K.field]) || (bt && held.has(e.season + '|' + e.gid))) continue;
          for (const t of e[K.field]) { const g = e.grade && t && e.grade[t.id]; if (g && o[t.id] && Array.isArray(t.legs)) last.set([e.season, e.gid, t.id].join('|'), { t, g, bt, w: +e.week }); } } };
      take(isBt(B) ? B : null, true); take(isRec(L) ? L : null, false);
      for (const { t, g, bt, w: wkx } of last.values()) { const r = o[t.id];
        if (g.result === 'pending') { pending++; continue; } if (!['won', 'lost', 'push'].includes(g.result)) continue;
        if (bt) { r.bt++; if (wkx) wk.add(wkx); }
        if (g.result === 'push') { r.push++; continue; }
        r[g.result]++; r.u += (g.result === 'won' && isFinite(+g.payout) ? +g.payout : 0) - 1; r.model += isFinite(+t.p) ? +t.p : 0; if (t.fair != null && isFinite(+t.fair)) { r.fair += +t.fair; r.fairN++; } }
      return { o, pending, weeks: [...wk] }; };
    const un = v => (v > 0.0005 ? '+' : v < -0.0005 ? '−' : '') + Math.abs(v).toFixed(2), f1 = v => v.toFixed(1);
    /* what a section's record draws, worked out here: hidden with no record and no backtest; else its two rows, each its
       kind's name and a pill a level (or "None graded yet" where nothing of that kind is graded or pushed), then what is
       pending; and the backtest's chip over the weeks either row took from it, its title saying what they are */
    const recWant = (L, B, sec) => { if (!isRec(L) && !isBt(B)) return { hidden: true };
      const weeks = new Set(), rows = Object.entries(REC_KIND).map(([kind, K]) => { const R = recOwn(L, B, sec, kind), any = Object.values(R.o).some(r => r.won + r.lost + r.push); R.weeks.forEach(x => weeks.add(x));
        const pills = any ? Object.entries(R.o).map(([id, r]) => { const graded = r.won + r.lost;
          const title = `${K.name}, ${r.label}: ${graded} graded, ${r.won} won` + (graded ? `; wins expected ${r.fairN ? f1(r.fair) + ' by the book’s fair chance' + (r.fairN < graded ? ` (on the ${r.fairN} with one)` : '') + ', ' : ''}${f1(r.model)} by ${K.by}` : '')
            + (r.push ? `; ${r.push} push${r.push === 1 ? '' : 'es'}, the stake back` : '') + (r.bt ? `; ${r.bt} of them from the backtest` : '');
          return { id: `${sec}:${id}`, text: `${r.label} ${r.won}–${r.lost}` + (graded || r.push ? ` ${un(r.u)} units` : ''), title }; }) : [{ id: `${sec}:${kind}:none`, text: 'None graded yet', title: null }];
        if (R.pending) pills.push({ id: `${sec}:${kind}:pending`, text: `Pending ${R.pending}`, title: null });
        return { kind, name: K.name, pills }; });
      const W = [...weeks].sort((a, b) => a - b), run = W.length > 1 && W[W.length - 1] - W[0] === W.length - 1;
      const chip = W.length ? { id: `${sec}:bt`, text: `Incl. backtest, week${W.length > 1 ? 's' : ''} ${run ? W[0] + '–' + W[W.length - 1] : W.join(', ')}`,
        title: `${W.length > 1 ? 'Weeks' : 'Week'} ${W.join(', ')} ${W.length > 1 ? 'were' : 'was'} played before the record took this section: rebuilt by today’s rules on exactly what the site had published at each lock, and graded on the results.` } : null;
      return { hidden: false, rows, chip }; };
    /* what it draws, read off the page: in its section, right under the section's heading */
    const recShown = (D, sec) => { const s = D.querySelector(`#spSets section.sp-sec[data-sp-sec="${sec}"]`), el = s && s.querySelector(`:scope > .sp-rec[data-sp-recsec="${sec}"]`);
      if (!el) return { missing: true }; if (el.hidden) return { hidden: true, empty: !el.children.length && !txt(el) };
      const pill = x => ({ id: x.dataset.spRec, text: txt(x), title: x.getAttribute('title') });
      const rows = [...el.querySelectorAll(':scope > .bar[data-sp-reckind]')].map(b => ({ kind: b.dataset.spReckind, name: txt(b.querySelector(':scope > .sp-reck')), pills: [...b.querySelectorAll(':scope > .rec')].map(pill) }));
      const cb = el.querySelector(':scope > .bar.sp-recbtbar'), chipEl = cb && cb.querySelector(':scope > .rec.sp-recbt');
      const other = [...el.children].filter(x => !x.matches('.bar[data-sp-reckind], .bar.sp-recbtbar')).map(x => x.tagName.toLowerCase() + '.' + x.className);
      return { hidden: false, rows, chip: chipEl ? pill(chipEl) : null, other, first: s.firstElementChild && s.firstElementChild.nextElementSibling === el, order: [...el.children].map(x => x.dataset.spReckind || (x.classList.contains('sp-recbtbar') ? 'bt' : '?')).join() }; };
    const recHeld = (D, L, B, lab) => { for (const sec of ['night', 'slot']) { const want = recWant(L, B, sec), got = recShown(D, sec), chipNoTitle = c => c && { id: c.id, text: c.text };
        const ok = want.hidden ? got.hidden === true && got.empty === true
          : !got.hidden && !got.missing && got.first && JSON.stringify(got.rows) === JSON.stringify(want.rows) && JSON.stringify(chipNoTitle(got.chip)) === JSON.stringify(chipNoTitle(want.chip)) && !got.other.length && got.order === (want.chip ? 'model,elo,bt' : 'model,elo');
        chk(ok, `${lab}: the ${sec === 'night' ? 'Night games' : 'Sunday slot'} section's record is not its rows (the model's parlays, then the Elo picks: a pill a level, won-lost and units, each titled with its numbers, then what is pending) and the backtest's chip, right under its heading, as worked out from the files' grades: `
          + JSON.stringify(got).slice(0, 700) + ' / want ' + JSON.stringify(want).slice(0, 700));
        /* the chip's title, apart: which weeks the backtest gave, in words */
        if (ok && want.chip) chk(!!got.chip && got.chip.title === want.chip.title, `${lab}: the ${sec === 'night' ? 'Night games' : 'Sunday slot'} section's backtest chip is titled "${got.chip && got.chip.title}", not "${want.chip.title}"`); } };
    /* both files asked for once as the page loaded, beside the payload, with no-store; the record again (never the
       backtest, which does not change) only when a set reaches its lock with the page open */
    for (const [f, re] of [['suggest_ledger', /^props\/data\/suggest_ledger\.json\?t=\d+$/], ['suggest_backtest', /^props\/data\/suggest_backtest\.json\?t=\d+$/]]) {
      const ask = bootCalls.filter(c => c.url.includes(f + '.json'));
      chk(ask.length === 1 && re.test(ask[0].url) && ask[0].method === 'GET' && ask[0].cache === 'no-store'
        && calls.filter(c => c.url.includes(f + '.json')).every(c => c.method === 'GET' && c.cache === 'no-store') && (f === 'suggest_ledger' || calls.filter(c => c.url.includes(f + '.json')).length === 1),
        `the page did not ask for ${f}.json beside the payload, once as it loaded, with no-store` + (f === 'suggest_backtest' ? ', and never again' : '') + ': ' + JSON.stringify(ask)); }
    /* the real files as they stand, on a load of its own; then, in that same window, each made-up pair read in their place
       by the page's own read (pbRecLoad, as a load reads them: the window's fetch answering the two files with the pair),
       and one load with neither file there */
    const R = await run(state, 'https://demon-x13.github.io/nfl-hub/#suggest'); await wait(300);
    { const real = LEDGER_REAL ? JSON.parse(LEDGER_REAL) : null, bt = BACKTEST_REAL ? JSON.parse(BACKTEST_REAL) : null;
      recHeld(R.d, real, bt, 'the real record and backtest');
      { const want = recWant(real, bt, 'night'); console.log(`  (the real record: ${want.hidden ? 'hidden' : want.rows.map(r => r.name + ' ' + r.pills.map(p => p.text).join(', ')).join(' | ') + (want.chip ? ' | ' + want.chip.text : '')})`); }
      chk(!R.timedOut && R.errs.length === 0 && !/NaN|undefined/.test(txt(R.d.getElementById('spSets'))) && !R.d.getElementById('pbRec') && !R.d.getElementById('spRec'),
        'the page threw, the record reads NaN, or the old record (#pbRec, or #spRec in the tab\'s head) is still drawn: ' + R.errs.join('; ')); }
    const f0 = R.w.fetch;
    R.w.fetch = (u, o) => { const s2 = String(u), ov = R.w.__recOv;
      if (ov && /suggest_(ledger|backtest)\.json/.test(s2)) { const v = s2.includes('suggest_ledger') ? ov.L : ov.B;
        return Promise.resolve(v === 404 ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(v)) }); }
      return f0(u, o); };
    const reread = async (L, B) => { R.w.__recOv = { L, B }; await R.w.pbRecLoad(); await wait(20); };
    { const T = (id, n, p, fair, dec, tag) => ({ id, n, p, fair, dec, legs: Array.from({ length: n }, (_, i) => ({ gid: 'g' + tag, week: 5, pid: 'p' + tag + id + i, stat: 'receptions', k: 3.5, side: 'over', main: true, price: -110, src: 'real' })) });
      const G = (result, n, payout) => ({ result, legs: Array(n).fill(result === 'lost' ? 'loss' : result === 'push' ? 'void' : result === 'pending' ? null : 'win'), ...(payout != null ? { payout } : {}) });
      const E = (wk, kick, gid, tiers, elo, grade) => ({ season: 2026, week: wk, gid, kickoff: kick, lock: kick, taken_at: kick, tiers, ...(elo ? { elo } : {}), ...(grade ? { grade } : {}) });
      const FB = { how: 'the smoke\'s own backtest', from_week: 3, prime: {
          '2026|03|2026-09-25T00:15:00Z|2026_03_A_B': { ...E(3, '2026-09-25T00:15:00Z', '2026_03_A_B', [T('safe', 2, 0.47, 0.36, 2.9, 'a'), T('med', 3, 0.3, 0.22, 6, 'a'), T('aggr', 4, 0.15, 0.1, 11, 'a'), T('xtrm', 5, 0.06, 0.04, 30, 'a')],
            [T('elo-safe', 2, 0.5, 0.4, 3.1, 'ae'), T('elo-med', 3, 0.3, null, 6.5, 'ae')], { safe: G('won', 2, 2.9), med: G('lost', 3, 0), aggr: G('lost', 4, 0), xtrm: G('lost', 5, 0), 'elo-safe': G('won', 2, 3.1), 'elo-med': G('lost', 3, 0) }), src: 'backtest' },
          '2026|04|2026-10-02T00:15:00Z|2026_04_C_D': { ...E(4, '2026-10-02T00:15:00Z', '2026_04_C_D', [T('safe', 2, 0.5, 0.4, 2.5, 'c'), T('med', 3, 0.3, 0.2, 6, 'c')], [T('elo-safe', 2, 0.45, 0.35, 3, 'ce')],
            { safe: G('lost', 2, 0), med: G('push', 3, 1), 'elo-safe': G('lost', 2, 0) }), src: 'backtest' },
          /* a game the record holds the model's levels of: none of the backtest's counts for them, its Medium (which the
             record's entry has none of) neither, since a unit the record holds is the record's whole; its Elo picks, which the
             record has none of, count */
          '2026|05|2026-10-09T00:15:00Z|2026_05_E_F': { ...E(5, '2026-10-09T00:15:00Z', '2026_05_E_F', [T('safe', 2, 0.52, 0.42, 2.5, 'e'), T('med', 3, 0.3, 0.24, 6, 'e')], [T('elo-safe', 2, 0.55, 0.45, 2.2, 'ee')], { safe: G('won', 2, 2.5), med: G('won', 3, 6), 'elo-safe': G('won', 2, 2.2) }), src: 'backtest' },
          '2026|06|2026-10-16T00:15:00Z|2026_06_I_J': { ...E(6, '2026-10-16T00:15:00Z', '2026_06_I_J', [T('safe', 2, 0.5, 0.4, 2.5, 'i')], [T('elo-safe', 2, 0.5, 0.4, 2.5, 'ie')]), src: 'backtest' } },
        slot: { '2026|04|2026-10-04T17:00:00Z|2026_04_SUN': { ...E(4, '2026-10-04T17:00:00Z', '2026_04_SUN', [T('safe', 2, 0.5, 0.41, 2.6, 's'), T('med', 3, 0.27, 0.2, 7, 's')], [T('elo-safe', 2, 0.48, 0.38, 2.8, 'se')],
          { safe: G('won', 2, 2.6), med: G('lost', 3, 0), 'elo-safe': G('lost', 2, 0) }), src: 'backtest' } } };
      const FL = { how: 'the smoke\'s own', since: '2026-10-12', entries: { '2026|05|2026-10-11T17:00:00Z': { kickoff: '2026-10-11T17:00:00Z', tiers: [T('safe', 2, 0.5, 0.4, 2.4, 'old')], grade: { safe: G('won', 2, 2.4) } } },
        prime_since: '2026-10-16', prime: {
          '2026|05|2026-10-09T00:15:00Z|2026_05_E_F': E(5, '2026-10-09T00:15:00Z', '2026_05_E_F', [T('safe', 2, 0.52, 0.42, 2.5, 'e')], null, { safe: G('lost', 2, 0) }),
          '2026|06|2026-10-19T00:20:00Z|2026_06_G_H': E(6, '2026-10-19T00:20:00Z', '2026_06_G_H', [T('safe', 2, 0.55, null, 2.4, 'g'), T('med', 3, 0.28, 0.21, 6.2, 'g')], [T('elo-safe', 2, 0.5, 0.4, 2.6, 'ge'), T('elo-med', 3, 0.3, 0.25, 5, 'ge')],
            { safe: G('won', 2, 2.4), med: G('pending', 3), 'elo-safe': G('lost', 2, 0), 'elo-med': G('won', 3, 5) }) },
        slot_since: '2026-10-19', slot: { '2026|06|2026-10-18T17:00:00Z|2026_06_SUN': E(6, '2026-10-18T17:00:00Z', '2026_06_SUN', [T('safe', 2, 0.5, 0.4, 2.5, 't')], null, { safe: G('pending', 2) }) } };
      await reread(FL, FB);
      recHeld(R.d, FL, FB, 'a made-up record and backtest');
      { const n = recWant(FL, FB, 'night'), sl = recWant(FL, FB, 'slot'), row = r => r ? r.pills.map(p => p.text).join(' | ') : '';
        const hand = { model: 'Safe 2–2 +1.30 units | Medium 0–1 −1.00 units | Aggressive 0–1 −1.00 units | Extreme 0–1 −1.00 units | Pending 1',
          elo: 'Safe 2–2 +1.30 units | Medium 1–1 +3.00 units | Aggressive 0–0 | Extreme 0–0', nightChip: 'Incl. backtest, weeks 3–5', slotModel: 'Safe 1–0 +1.60 units | Medium 0–1 −1.00 units | Aggressive 0–0 | Extreme 0–0 | Pending 1', slotChip: 'Incl. backtest, week 4',
          safeTitle: 'Model parlays, Safe: 4 graded, 2 won; wins expected 1.2 by the book’s fair chance (on the 3 with one), 2.0 by the model; 2 of them from the backtest',
          slotChipTitle: 'Week 4 was played before the record took this section: rebuilt by today’s rules on exactly what the site had published at each lock, and graded on the results.' };
        const got = { model: row(n.rows[0]), elo: row(n.rows[1]), nightChip: n.chip && n.chip.text, slotModel: row(sl.rows[0]), slotChip: sl.chip && sl.chip.text, safeTitle: n.rows[0].pills[0].title, slotChipTitle: sl.chip && sl.chip.title };
        chk(JSON.stringify(got) === JSON.stringify(hand), 'the smoke\'s own reading of the made-up record is not the one worked out by hand: ' + JSON.stringify(got)); }
      /* the record alone (a backtest that is not one), and the backtest alone (no record): each counted on its own */
      for (const [lab, L, B] of [['the made-up record with a backtest that is not one', FL, { prime: [] }], ['the made-up backtest with no record', 404, FB]]) {
        await reread(L, B); recHeld(R.d, L === 404 ? null : L, isBt(B) ? B : null, lab); }
      /* a record with entries and no set graded yet, no backtest: each row of each section says none is graded */
      await reread({ entries: FL.entries, prime: { [Object.keys(FL.prime)[1]]: { ...FL.prime[Object.keys(FL.prime)[1]], grade: undefined } } }, 404);
      { const sh = recShown(R.d, 'night'), sl = recShown(R.d, 'slot');
        chk(!sh.hidden && !!sh.rows && sh.rows.map(r => r.pills.map(p => p.id + ' ' + p.text).join()).join(' | ') === 'night:model:none None graded yet | night:elo:none None graded yet' && !sh.chip
          && !sl.hidden && !!sl.rows && sl.rows.map(r => r.pills.map(p => p.text).join()).join(' | ') === 'None graded yet | None graded yet',
          'a record with no set graded does not say so in each row of each section: ' + JSON.stringify([sh, sl]).slice(0, 400)); }
      /* a record file that is not one with no backtest, and a backtest file that is not one with no record: nothing drawn */
      for (const [L, B] of [[[], 404], [5, 404], ['junk', 404], [{ how: 'x' }, 404], [{ entries: [] }, 404], [404, 'junk'], [404, { how: 'x', prime: [] }]]) {
        await reread(L, B); const a2 = recShown(R.d, 'night'), b2 = recShown(R.d, 'slot');
        chk(a2.hidden === true && a2.empty === true && b2.hidden === true && b2.empty === true, `a record file ${JSON.stringify(L)} and a backtest file ${JSON.stringify(B)}, neither one, drew something on Suggested Parlays`); }
      chk(R.errs.length === 0, 'the page threw reading the made-up records: ' + R.errs.join('; ')); }
    delete R.w.__recOv; R.w.fetch = f0; R.w.close();
    /* and a load with neither file there (404): nothing drawn, nothing thrown */
    { const N = await run(state, 'https://demon-x13.github.io/nfl-hub/#suggest', null, false, { ledger: 404, backtest: 404 }); await wait(300);
      const a2 = recShown(N.d, 'night'), b2 = recShown(N.d, 'slot');
      chk(a2.hidden === true && a2.empty === true && b2.hidden === true && b2.empty === true && N.errs.length === 0, 'a load with no record and no backtest drew something on Suggested Parlays, or threw');
      N.w.close(); } }
  /* ---- the set the page builds at a game's lock where the record has none, kept in this browser across a real
     reload (props_sp_lock_v1, outside S), on the week's own last prime-time game still to come, the page's clock
     moved to five minutes after its lock; and a record that has the game's entry taking over from it. (app v112) At
     its lock the game is on the tab by the night rule whatever the week (its night's 6:00 AM has passed, and every
     prime-time night before it has kicked off), so the page builds its set; held so on the boot itself below. (app v118)
     And its Elo picks beside it: built once from the lock (once the Elo files are in) and kept with the set (the kept
     copy's elo, eloOwn); a reload shows them again from the browser; with the record's set and no Elo picks of the
     record's, the browser's are shown beside the record's set, said in one line; once the record carries its own, they
     take over, the line gone and the browser's copy dropped ---- */
  { const g = w.eval('typeof spGames') === 'function' ? w.eval('spGames()').slice(-1)[0] : null, KK = 'props_sp_lock_v1';
    if (!g) console.log('  (no prime-time game to come: the set kept across a reload is held on the made-up games above, in one window)');
    else { const lockAt = etKick(g) - 2 * 3600e3 + 5 * 60e3, isoS = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
      const clock = extra => w2 => { const B = w2.Date, sh = lockAt - B.now(); w2.Date = class extends B { constructor(...a) { if (a.length) super(...a); else super(B.now() + sh); } static now() { return B.now() + sh; } }; if (extra) extra(w2); };
      const setOf = (D, kind = 'model') => { const el = D.querySelector(`#spPanel .sp-game[data-sp-game="${g.id}"]`); return el ? [...el.querySelectorAll(`:scope > .pb-tiers[data-sp-kind="${kind}"] > .pb-tier`)].map(c => c.classList.contains('none') ? c.className.split(' ')[1] + ' none' : c.dataset.pbTier + ': ' + [...c.querySelectorAll('.pb-legs [data-pb-leg]')].map(b => b.dataset.pbLeg + '|' + b.dataset.side + '|' + b.dataset.k + (kind === 'elo' ? '|' + txt(b.closest('li').querySelector('.pr em')) : '')).join(' + ')).join(' / ') : null; };
      const phase = D => { const x = D.querySelector(`#spPanel .sp-game[data-sp-game="${g.id}"] [data-sp-phase]`); return x ? x.dataset.spPhase : null; };
      const eloLine = D => { const x = D.querySelector(`#spPanel .sp-game[data-sp-game="${g.id}"] > [data-sp-phase="eloown"]`); return x ? txt(x) : null; };
      const eloIn = D => until(() => !!D.querySelector(`#spPanel .sp-game[data-sp-game="${g.id}"] > .pb-tiers[data-sp-kind="elo"]`), 10000);
      const keptOf = W2 => { try { const v = JSON.parse(W2.localStorage.getItem(KK)); return v && v.games ? v.games[g.id] || null : null; } catch (e) { return null; } };
      const ELO_LINE = 'This browser’s own Elo picks: the site’s were not published in time, so the record does not grade them.';
      const A = await run(state, 'https://demon-x13.github.io/nfl-hub/#suggest', null, false, { ledger: 404, seed: clock() }); await wait(400); await eloIn(A.d);
      const setA = setOf(A.d), eloA = setOf(A.d, 'elo'), keptA = A.w.localStorage.getItem(KK), vA = (() => { try { return JSON.parse(keptA); } catch (e) { return null; } })();
      { const NA = nightOwn(A.w.eval('pbGames()').filter(primeOwn), A.w.eval('S').sched, A.w.eval('Date.now()'));
        chk(NA.on.some(x => x.id === g.id) && A.w.eval('spOn()').some(x => x.id === g.id), `at ${g.id}'s lock the night rule (${NA.on.map(x => x.id).join(', ') || 'none'}) or the page (${A.w.eval('spOn()').map(x => x.id).join(', ') || 'none'}) does not set it out`); }
      chk(!A.timedOut && A.errs.length === 0 && phase(A.d) === 'own' && !!setA && !!vA && !!vA.games && !!vA.games[g.id] && vA.games[g.id].own === true && vA.games[g.id].kickoff === isoS(etKick(g)) && !JSON.stringify(A.w.eval('S')).includes(KK),
        `at ${g.id}'s lock with no record, the page did not build its set once and keep it in this browser outside S: ${phase(A.d)} ${keptA ? keptA.slice(0, 120) : 'nothing kept'}`);
      chk(!!eloA && eloA.split(' / ').length === 4 && vA && vA.games && vA.games[g.id] && vA.games[g.id].eloOwn === true && Array.isArray(vA.games[g.id].elo) && vA.games[g.id].elo.map(t => t.id).join() === PB_TIERS_OWN.map(x => 'elo-' + x).join() && eloLine(A.d) === null,
        `at ${g.id}'s lock with no record, the page did not build its Elo picks once and keep them beside its own set (no line: the whole set is the browser's): ${eloA} / ${JSON.stringify(vA && vA.games && vA.games[g.id] && { eloOwn: vA.games[g.id].eloOwn, elo: (vA.games[g.id].elo || []).map(t => t.id) })}`);
      A.w.close();
      if (keptA) {
        const B = await run(state, 'https://demon-x13.github.io/nfl-hub/#suggest', null, false, { ledger: 404, seed: clock(w2 => w2.localStorage.setItem(KK, keptA)) }); await wait(400); await eloIn(B.d);
        chk(!B.timedOut && B.errs.length === 0 && phase(B.d) === 'own' && setOf(B.d) === setA && setOf(B.d, 'elo') === eloA, `a reload at ${g.id}'s lock does not show the set and Elo picks this browser kept: ${setOf(B.d)} / kept ${setA}; ${setOf(B.d, 'elo')} / kept ${eloA}`);
        B.w.close();
        /* the record's own locked set for the game (made up: the kept set with its Medium taken away) takes over from the
           browser's; with no Elo picks of the record's, the browser's beside it, said in one line, kept */
        const tiers = vA.games[g.id].tiers.map(t => t.id === 'med' ? { id: 'med', label: 'Medium', n: 3, floor: 0.25, why: 'No 3-leg parlay in this game.' } : t);
        const entry = { season: w.eval('SEASON'), week: g.w, gid: g.id, kickoff: isoS(etKick(g)), lock: isoS(etKick(g) - 2 * 3600e3), taken_at: isoS(etKick(g) - 5 * 3600e3), tiers };
        const key = `${w.eval('SEASON')}|${String(g.w).padStart(2, '0')}|${isoS(etKick(g))}|${g.id}`, LED = { entries: {}, prime: { [key]: entry } };
        const C = await run(state, 'https://demon-x13.github.io/nfl-hub/#suggest', null, false, { ledger: LED, seed: clock(w2 => w2.localStorage.setItem(KK, keptA)) }); await wait(400); await eloIn(C.d);
        const vC = keptOf(C.w);
        chk(!C.timedOut && C.errs.length === 0 && phase(C.d) === 'locked' && /med none/.test(setOf(C.d) || '') && !(vC && vC.own),
          `with the record's locked set for ${g.id} published, the page still shows the set this browser built, or keeps it: ${phase(C.d)} ${setOf(C.d)}`);
        chk(setOf(C.d, 'elo') === eloA && eloLine(C.d) === ELO_LINE && !!vC && vC.eloOwn === true && Array.isArray(vC.elo),
          `with the record's locked set for ${g.id} and no Elo picks of the record's, the page does not show this browser's own beside it, said in one line, and keep them: ${setOf(C.d, 'elo')} / ${eloLine(C.d)} / kept ${JSON.stringify(vC && { eloOwn: vC.eloOwn })}`);
        C.w.close();
        /* the record carries its Elo picks (made up: the kept ones with the Medium taken away): they take over */
        const elo = vA.games[g.id].elo.map(t => t.id === 'elo-med' ? { id: 'elo-med', label: 'Medium', n: 3, floor: 0.25, why: 'Only 2 players in this game qualify: this level takes 3.' } : t);
        const D2 = await run(state, 'https://demon-x13.github.io/nfl-hub/#suggest', null, false, { ledger: { entries: {}, prime: { [key]: { ...entry, elo } } }, seed: clock(w2 => w2.localStorage.setItem(KK, keptA)) }); await wait(400); await eloIn(D2.d);
        const vD = keptOf(D2.w), eD = setOf(D2.d, 'elo') || '';
        chk(!D2.timedOut && D2.errs.length === 0 && /elo-med none/.test(eD) && eD.split(' / ').filter(x => !x.startsWith('elo-med')).join(' / ') === eloA.split(' / ').filter(x => !x.startsWith('elo-med')).join(' / ') && eloLine(D2.d) === null && !(vD && (vD.eloOwn || vD.elo)),
          `with the record's Elo picks for ${g.id} published, the page still shows (or says, or keeps) this browser's own: ${eD} / ${eloLine(D2.d)} / kept ${JSON.stringify(vD && { eloOwn: vD.eloOwn, elo: !!vD.elo })}`);
        D2.w.close(); } } }

  /* ---- (app v118) a unit's Elo picks say "Loading the Elo ratings…" while the Elo files are not in, and only then: a load
     whose matchups file (the ELO tab's last read, which a pick needs beside the ratings) is held back, on a made-up Sunday
     night game of its own a day and more out (laid into the schedule, with two team lines of its own, the tab's one
     question of which night games it sets out, spOn, stood in by it alone and the Sunday slot by none, so it holds at any
     hour): its unit drawn live with its model parlays and, under "Elo picks", the loading line and no Elo card; the file
     let through, the line gone and the four Elo levels drawn in its place ---- */
  { let release = null; const gate = { mu: new Promise(r => { release = r; }) };
    const R = await run(state, 'https://demon-x13.github.io/nfl-hub/#suggest', null, false, { gate }); await wait(300);
    const W = R.w, D = R.d, now = W.eval('Date.now()');
    let t = now + 26 * 3600e3; while (new Date(t).getUTCDay() !== 0) t += 3600e3;
    const cw = W.eval('currentWeek()'), g = { id: `${W.eval('SEASON')}_${String(cw).padStart(2, '0')}_A61_H61`, w: cw, a: 'A61', h: 'H61', d: new Date(t).toISOString().slice(0, 10), t: '20:20' };
    const L = [{ key: `${g.id}|team:H61|ml`, gid: g.id, pid: 'team:H61', stat: 'ml', k: 0, side: 'over', main: false, p: 0.6, price: -125, src: 'real', mu: null, name: 'Made-up H61', pos: 'Game', grp: 'TEAM', team: 'H61', opp: 'A61', week: cw, label: 'To win' },
      { key: `${g.id}|team:H61|ats`, gid: g.id, pid: 'team:H61', stat: 'ats', k: -3.5, side: 'over', main: false, p: 0.56, price: -110, src: 'real', mu: null, name: 'Made-up H61', pos: 'Game', grp: 'TEAM', team: 'H61', opp: 'A61', week: cw, label: 'To cover -3.5' }];
    W.__ld = { g, L }; W.eval('S.sched.push(window.__ld.g); pricedLegs=(function(real){ return function(games){ return (games||[]).some(x=>x.id===window.__ld.g.id)?window.__ld.L.map(l=>({...l})):real(games); }; })(pricedLegs); spOn=function(){ return [window.__ld.g]; }; spSlotNext=function(){ return null; }; SP_CACHE=new Map(); SP_SHOWN=null; renderSp();');
    await wait(60);
    const unit = () => D.querySelector(`#spSets .sp-game[data-sp-game="${g.id}"]`), shape = () => { const u = unit(); return u ? [...u.children].map(x => x.tagName.toLowerCase() + (x.dataset.spKind ? `[${x.dataset.spKind}]` : x.dataset.spPhase ? `[${x.dataset.spPhase}]` : x.hasAttribute('data-sp-elo-wait') ? '[elo-wait]' : '')).join(' ') : 'none'; };
    const s0 = shape(), w0 = unit() && unit().querySelector(':scope > [data-sp-elo-wait]'), e0 = W.eloUnit([g.id], {});
    chk(s0 === 'div p[live] h5[model] div[model] h5[elo] p[elo-wait]' && txt(w0) === 'Loading the Elo ratings…' && w0.matches('p.pb-why') && e0 === null && !unit().querySelector('.pb-tier[data-pb-tier^="elo-"], .pb-tier.elo-safe'),
      'with the Elo files not all in (the matchups held back), a unit does not say "Loading the Elo ratings…" under its Elo picks\' heading in place of their cards: ' + s0 + ' / ' + (w0 ? txt(w0) : 'no line'));
    release(); await until(() => !!(unit() && unit().querySelector(':scope > .pb-tiers[data-sp-kind="elo"]')), 10000);
    const s1 = shape(), ids = unit() ? [...unit().querySelectorAll(':scope > .pb-tiers[data-sp-kind="elo"] > .pb-tier')].map(c => c.className.split(' ')[1]).join() : '';
    chk(s1 === 'div p[live] h5[model] div[model] h5[elo] div[elo]' && ids === PB_TIERS_OWN.map(x => 'elo-' + x).join() && !D.querySelector('#spSets [data-sp-elo-wait]'),
      'once the Elo files are in, the unit still says it is loading the Elo ratings, or does not draw its four Elo levels in place of the line: ' + s1 + ' / ' + ids);
    chk(R.errs.length === 0, 'the page threw with the Elo files held back: ' + R.errs.join('; '));
    R.w.close(); }
  /* ---- the X Bet Log is the file: the three weeks carried over from the retired store ($100
     deposited; the balance 98.71 after week 1, 102.37 after week 3, week 2 a week off, 123.39 after
     week 4), the same on every device, read only, through the page's own XBETS and the frame ---- */
  /* the betting app as the page frames it, handed the page's X Bet Log. With `on`, the page around
     it, the frame shares that page's browser store, as a srcdoc frame of the page's origin does */
  const BET_FRAME = JSON.parse(HTML.match(/\nconst BET_APP=("(?:[^"\\]|\\.)*");\n<\/script>/)[1]);
  const frame = (X, tab, on) => new Promise(resolve => {
    const errs = [];
    const dom = new JSDOM(BET_FRAME.replace('window.EMBED_TAB=null', 'window.EMBED_TAB=' + JSON.stringify(tab)), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://demon-x13.github.io/nfl-hub/',
      beforeParse(fw) { fw.XBETS = X; fw.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
        if (on) Object.defineProperty(fw, 'localStorage', { get: () => on.localStorage, configurable: true });
        fw.confirm = () => true; fw.alert = () => {}; fw.scrollTo = () => {};
        fw.addEventListener('error', e => errs.push(e.message));
        fw.fetch = async (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase(); ALL_CALLS.push(m + ' ' + s); offSite(s, SITE);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); throw new TypeError('Failed to fetch'); }
          if (/elo\/data\/model\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(ELO_M) };
          if (/state\.json/.test(s)) return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) };
          return { ok: false, status: 404, json: async () => null }; }; } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs }), 1500); });
  const rowsOf = fd => [...fd.querySelectorAll('#betTable tbody tr')].map(tr => txt(tr.children[0]));
  const colOf = (fd, i) => [...fd.querySelectorAll('#betTable tbody tr')].map(tr => tr.children[i] ? txt(tr.children[i]) : '');
  const mineOf = (bets, deposit) => JSON.stringify({ myPicks: {}, bets, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit } });
  { const own = mineOf({ 5: { staked: 5, returned: 0, note: 'own week' } }, 40);
    const B = await run(state, 'https://demon-x13.github.io/nfl-hub/#bets', null, false, { xbets: XBFIX, seed: w2 => w2.localStorage.setItem(BET_KEY, own) });
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
    const O = await run(state, 'https://demon-x13.github.io/nfl-hub/#owner=the-old-owner-secret', null, false, { file: FIXFILE, xbets: XBFIX, seed: w2 => { for (const [k, v] of Object.entries(OLD)) w2.localStorage.setItem(k, v); } });
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
  /* ---- the matchup bubble a leg's name opens: its own section, at the end of this file ---- */
  await glanceChecks();
  /* ---- the light look and its switch: its own section, at the end of this file ---- */
  await lightChecks();

  /* ---- no page asked the retired store or its sign-in services anything, and nothing any page
     or frame sent was a write ---- */
  chk(ALL_CALLS.length > 100 && BAD_CALLS.length === 0, 'a page asked the retired store or its sign-in services, or sent a write: ' + BAD_CALLS.slice(0, 5).join(' | '));
  chk(OFF_SITE.length === 0, 'a page or one of its frames asked for a file outside the site, or named a parent folder (from the site\'s root that leaves the site): ' + [...new Set(OFF_SITE)].slice(0, 5).join(' | '));
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
   Offense vs defense, Mismatches, Starters (the Stat breakdown gone, the owner's call of 16 October
   2026); and there is no Sources card, no
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
  /* no Sources card (the owner's call, 14 October 2026) and no Stat breakdown (the owner's call, 16 October
     2026: "get rid of stat breakdown section") */
  const SNAP_SECS = ['gsMatch', 'gsCalls', 'gsTeams', 'gsUnits', 'gsMism', 'gsPos'], SNAP_CARDS = SNAP_SECS.slice(1);
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
        /* each words what its edge ranks as the matchup formula's units by their players' Elo (the window's Offense vs
           defense card draws the ELO Ratings tab's Pass Defense and Run Defense), and nothing in the window says a pass
           or run defense ranked */
        { const bad = li.map((x, i) => { const r = mine[i], k = r && mmRankOwn(eloMu, r.group, r.opp), sub = x.querySelector('.gs-mmsub');
            const want = k ? `Against the ${r.opp} ${MM_AGAINST_OWN[r.group]}, ${ordOwn(k.rank)} of ${k.n} by player Elo.` : null;
            return want && sub && txt(sub).startsWith(want) ? '' : `${x.dataset.pid}: ${sub ? txt(sub) : 'no line'} (want "${want}")`; }).filter(Boolean);
          chk(!bad.length && !mmOldWords(md), `snapshot (${label}): a mismatch does not word its rank as the matchup formula's units, or the window says a pass or run defense ranked: ${bad.slice(0, 2).join(' | ') || mmOldWords(md)}`); }
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
      /* no stats table and no fold for one under the possessions (the owner's call, 14 October 2026) */
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
      /* clubs level on a unit share its rank, one more than the clubs above them, as mmRankOwn ranks the Mismatches */
      const urk = (t, u) => defs[t] ? 1 + Object.keys(defs).filter(x => defs[x][u] > defs[t][u]).length : null;
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
      /* (app v122) the Props list's rows are the board's row, so they are held the same way */
      for (const [CARD, NAME] of [['.pk-game', "the Pick'ems board"], ['.game', "the Props list"]]) {
      const cardRe = new RegExp(`(^|,\\s*)\\${CARD}(\\s*,|$)`);
      const ruleFor = (media, prop) => { const r = rules.filter(x => cardRe.test(x.sel) && x.media === media && x.st.getPropertyValue(prop)); return r.length ? r[r.length - 1].st.getPropertyValue(prop) : null; };
      const mids = [...new Set(rules.filter(x => /min-width:\s*901px/.test(x.media) && cardRe.test(x.sel)).map(x => x.media))];
      const maxOf = m => { const mm = /max-width:\s*(\d+)px/.exec(m || ''); return mm ? +mm[1] : null; }, SCROLLBAR = 17, LIVE_W = 136;
      const cases = [['', mids.length && maxOf(mids[0]) ? maxOf(mids[0]) + 1 : 901], ...mids.map(m => [m, 901])], bad = [];
      const wideLast = least(ruleFor('', 'grid-template-columns')).slice(-1)[0];
      for (const [media, w] of cases) {
        const cols = least(ruleFor(media, 'grid-template-columns') || ruleFor('', 'grid-template-columns'));
        const gap = px(ruleFor(media, 'column-gap') || ruleFor(media, 'gap') || ruleFor('', 'column-gap') || ruleFor('', 'gap')) || 0;
        /* the card's own right padding, from its shorthand where that is how it is written */
        const padOf = m => { const r = rules.filter(x => x.sel === CARD && x.media === m && (x.st.getPropertyValue('padding-right') || x.st.getPropertyValue('padding')));
          if (!r.length) return null; const st = r[r.length - 1].st, t = (st.getPropertyValue('padding-right') || st.getPropertyValue('padding')).trim().split(/\s+/);
          return px(st.getPropertyValue('padding-right') ? t[0] : (t[1] || t[0])); };
        const pad = padOf(media) ?? padOf('') ?? 0;
        const need = cols.reduce((a, x) => a + x, 0) + gap * (cols.length - 1) + 2 * pad + 2, room = w - SCROLLBAR - 2 * 28;
        if (cols.length !== 6 || need > room) bad.push(`${media || 'wide'}: ${cols.length} columns need ${need}px at ${w}px wide, the page has ${room} beside a ${SCROLLBAR}px scrollbar`);
        if (cols.length === 6 && !(cols[5] >= wideLast)) bad.push(`${media || 'wide'}: the result column is ${cols[5]}px, narrower than the wide layout's ${wideLast}px, which holds the same text`);
        if (cols.length === 6 && !(cols[5] >= LIVE_W)) bad.push(`${media || 'wide'}: the result column is ${cols[5]}px, too narrow for a live "WAS leading 31–33" (about 134px at its 15px)`); }
      chk(mids.length === 1 && !bad.length, `${NAME}'s columns do not fit at every width they are laid out at, so the page scrolls sideways, or its result column is narrower than the wide layout's: ` + (bad.join('; ') || 'no layout between the phone card and a wide screen')); } }
    /* the page's modal pads its top, and a sticky header sticks inside that padding: the window's
       content showed in a band above its header once scrolled, so its modal has none */
    chk(rules.some(r => r.sel === '#gsModal' && !r.media && /^0(px)?$/.test(r.st.getPropertyValue('padding-top'))),
      'snapshot: the window\'s modal pads its top, so its content shows above the sticky header once scrolled');
    /* every control a thumb can hit is at least 44px tall at every width (48 for the verdict's
       answers), set by its own rule and never lowered by a narrower screen's */
    { const tall = [['#gsClose', 44], ['#gsModal .gs-props', 44], ['.gs-gl', 48], ['.gs-dbar .btn', 44], ['.gs-tog', 44], ['.gs-ptabs button', 44], ['#gsModal .gs-pl button.gs-pnm', 44], ['.gwin .gwin-btn', 44]];
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
      want('#gsModal .ddunit', false, 'justify-self', 'end'); want('#gsModal .ddend', false, 'justify-self', 'start');
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
      /* the Starters' names (the owner's call, 16 October 2026: "in starters, make player names clickable
         to their props page"): a starter is a button to his own row on the game's page on the Props tab
         exactly where that page draws a row for him (renderGame's own buttons, drawn here on the game and
         read off the page, so the board's copy of the rule cannot drift from it), the button the name box
         itself (the Q inside it, after the name), plain text for everyone else; a click closes the window
         and opens the game's page with his row open, highlighted and focused, the address #slate */
      { const md = o.md, gid = toCome.game_id, bad = [];
        R.w.eval(`S.ui.game=${JSON.stringify(gid)};S.ui.open={};renderGame()`); await wait(60);
        const rowsOn = new Set([...R.d.querySelectorAll('#gameView button.plrbtn[data-open]')].map(b => b.dataset.open));
        R.w.eval('closeGame()'); [...R.d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'pickems').click(); await wait(60);
        o.btn.click(); await wait(60);
        md.querySelector('[data-gs-gl="out"]').click(); await wait(10);
        const can = R.w.pkBoard.canProps(gid), pls = [...md.querySelectorAll('#gsPos .gs-pl[data-pid]')];
        const want = pls.filter(p => can && rowsOn.has(p.dataset.pid)).map(p => p.dataset.pid).sort().join();
        const links = [...md.querySelectorAll('#gsPos [data-gs-player]')], got = links.map(b => b.dataset.gsPlayer).sort().join();
        if (got !== want) bad.push(`the names that open the Props tab are ${got || 'none'}, the page draws rows for ${want || 'none'} of these starters`);
        if (can && pls.length && !links.length) bad.push('no starter is a link though the Props tab can open the game');
        for (const b of links) { const pl = b.closest('.gs-pl[data-pid]');
          if (b.tagName !== 'BUTTON' || b.type !== 'button' || !b.classList.contains('gs-pnm') || !pl || pl.dataset.pid !== b.dataset.gsPlayer || !/Props tab/.test(b.getAttribute('aria-label') || '')) { bad.push(`${b.dataset.gsPlayer}: the link is not the name box itself, a button named for the Props tab`); break; } }
        if (pls.some(p => !links.some(b => p.contains(b)) && (!p.querySelector('span.gs-pnm[data-gs-name]') || p.querySelector('button')))) bad.push('a starter the Props tab draws no row for is not plain text');
        const vis = links.find(b => !b.closest('[hidden]')) || links[0];
        if (vis) { const pid = vis.dataset.gsPlayer, into = [], siv = R.w.Element.prototype.scrollIntoView;
          R.w.Element.prototype.scrollIntoView = function (x) { into.push(this); };
          vis.click(); await wait(120);
          R.w.Element.prototype.scrollIntoView = siv;
          const S = R.w.eval('S'), row = [...R.d.querySelectorAll('#gameView button.plrbtn[data-open]')].find(b => b.dataset.open === pid);
          if (!md.hidden) bad.push('a click on a name did not close the window');
          if (R.d.getElementById('tab-slate').hidden || R.w.location.hash !== '#slate' || S.ui.game !== gid || R.d.getElementById('gameModal').hidden) bad.push(`a click on a name did not open the game's page on the Props tab (${R.w.location.hash}, ${S.ui.game})`);
          if (JSON.stringify(S.ui.open) !== JSON.stringify({ [pid]: true })) bad.push(`a click on a name opened ${JSON.stringify(S.ui.open)}, not his row alone`);
          if (!row || row.getAttribute('aria-expanded') !== 'true' || !row.classList.contains('pe-hl') || R.d.activeElement !== row) bad.push('his row on the game\'s page is not open, highlighted and focused');
          R.w.eval('closeGame()'); [...R.d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'pickems').click(); await wait(60); }
        else if (!md.hidden) R.d.getElementById('gsClose').click();
        await wait(20);
        chk(bad.length === 0, 'snapshot: the Starters\' names do not open their rows on the Props tab as the page draws them: ' + bad.join('; ')); }
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
      /* Open all opens the cards in their order on the page, with no Stat breakdown (the owner's call, 16
         October 2026), and closes them all again */
      { const md = o.md; o.btn.click(); await wait(60);
        const secs = [...md.querySelectorAll('#gsView section.gs-fold[id]')].map(x => x.id), all = md.querySelector('[data-gs-all]');
        all.click(); const opened = SNAP_CARDS.every(id => !R.d.getElementById(id + 'B').hidden);
        all.click(); const shut = SNAP_CARDS.every(id => R.d.getElementById(id + 'B').hidden);
        chk(secs.join() === SNAP_CARDS.join() && opened && shut && !R.d.getElementById('gsStats') && !md.querySelector('[data-gs-srow], .gs-sbar, [data-gs-fold="gsStats"]'),
          `snapshot: the cards are not Model Picks, Team strength, Offense vs defense, Mismatches and Starters, in that order, under Open all, or the Stat breakdown is still drawn: ${secs.join()}`);
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
   owner's call of the same day) and the Deep Dive inside Offense vs defense, from the news job's files; the
   Stat breakdown, which drew stats.json, is gone (the owner's call, 16 October 2026), and the window never
   reads that file, though the stand-in serves one. Every file here is a stand-in written below, never news/data's own: the elo job runs this
   smoke every morning, and a news job publish must never turn it red (news/tools/smoke.js holds the
   real files to their sources and to deepdive.js). Each number is worked out here on its own: the
   four tags of each possession by the rule (each row's edge, the offense unit's rating less the
   defense's, weighed by its matchup's weight: Easy from 1.5, Favorable from 0.5, the same the other
   way), the overall tag on the gap read as points and the records; the Deep Dive's rows must be deepdive.js's own html for
   the stand-in, set in whole (a compact row each: the unit, the two clubs and their figures, the tag, and
   no name, no one out and no number from the file anywhere in the window), each figure the Elo the Elo
   files have for that side, worked out here on its own (the owner's calls, 16 October 2026: the
   quarterback's own season Elo against the Overall Defense, Pass Protection against Pass Rush, Run
   Offense against Run Defense, Pass Offense against Pass Defense), the higher marked, each wearing the
   page's own tier shield for it (pkTierBadge, the ELO Ratings tab's) and a rank none, and on planted
   copies of the Elo files (no position tables, an unranked quarterback) the ranks in their place,
   unmarked, but the Overall Defense on the quarterback's rows, which model.json carries without them; and
   the basis, the "Position matchups" label's title, counts each club's games as the file does. A game with no note to come
   draws the automatic line in the head's middle with no news (on a 404 and on a notes file that is not
   JSON too), a played one with none draws nothing, and a written one is its preview alone, escaped,
   the players it marks **so** bold and nothing else markup (a marked "<b>x</b>" is its text, an
   unpaired ** stays as typed), its news and sources not shown, and once the game has started dated as
   written before kickoff; a file that does not
   load says so in its own part and nothing throws: a units file lacking a club, one that is not JSON. The
   Rams are LA on the board and LAR in the news job's files: a game of theirs draws its Deep Dive from the
   LAR entries. A playoff game (the news job stops at week 18) says
   the Deep Dive is the regular season's only. And the window keeps the visitor's place while the
   files come in late: with the news files and the prop model held back, each redraw puts the focus
   back on the same control (Close where it has gone) and keeps the card scrolled to where it was on
   the screen as blocks are drawn in above it (jsdom lays nothing out: the layout is planted).
   ===================================================================================== */
async function newsChecks() {
  const c0 = checks, f0 = fails.length;
  const DDM = require('./deepdive.js'), eloM = JSON.parse(ELO_M), eloP = JSON.parse(ELO_P), eloMu = JSON.parse(ELO_MU), now = Date.now() - PAGE_SHIFT_MS, kick = g => etKick({ d: g.gameday, t: g.gametime });
  /* the position matchups' figures, Elo against Elo (the owner's calls, 16 October 2026), worked out here on
     their own from the Elo files: the offense's starting quarterback's season Elo (the first quarterback of
     its lineup for this very game, ranked) against the Overall Defense (units.def, wherever model.json has
     it), Pass Protection against Pass Rush, Run Offense against Run Defense, Pass Offense against Pass
     Defense, each of those tables only where model.json's units.tables names it; null where the side shows
     its rank instead */
  const EROWS = { qb: ['QB', 'def'], ol: ['pass_pro', 'pass_rush'], rb: ['run_off', 'run_def'], rec: ['pass_off', 'pass_def'] };
  const figsWant = (M, PL, MU, gid, o, d) => { const U = (M && M.units) || {}, T = U.tables || {};
    const tab = (k, t) => (k === 'def' || T[k]) && U[k] && U[k][t] && typeof U[k][t].elo === 'number' ? U[k][t].elo : null;
    const lu = MU && MU.lineups && MU.lineups[o]; let qb = null;
    if (lu && lu.game_id === gid) { const pid = (lu.players || []).find(p => PL.players[p] && PL.players[p].group === 'QB'), e = pid && PL.players[pid];
      if (e && e.rank != null && typeof e.se === 'number') qb = e.se; }
    return Object.fromEntries(Object.entries(EROWS).map(([k, [x, y]]) => [k, [x === 'QB' ? qb : tab(x, o), tab(y, d)]])); };
  const anyFig = F => Object.values(F).some(p => p[0] != null || p[1] != null);
  /* the page's tier name and its tier shield, as the snapshot hands them to eloSides */
  const tierOf = R => e => { const t = R.w.pkEloTier && R.w.pkEloTier(e); return t ? t[0] : ''; };
  const shieldOf = R => e => R.w.pkTierBadge ? R.w.pkTierBadge(e) : '';
  /* a row's words, its shields' own (their titles name the tier) taken off */
  const plain = el => { const c = el.cloneNode(true); for (const x of c.querySelectorAll('svg')) x.remove(); return txt(c); };
  /* each drawn row against the figures: one figure a side, the Elo where figs has one (b.ddelo) and the rank
     where it has none (b.ddrk), the higher of two Elo marked gs-better and nothing else marked; each Elo
     wearing one shield, the page's pkTierBadge for that very Elo, right before it, and a rank none (the
     owner's call, 16 October 2026: "elo in offense vs defense pls add elo icon") */
  const figsBad = (md, figsOf, R) => { const bad = [];
    for (const r of md.querySelectorAll('#gsUnits .ddrow')) {
      const F = figsOf(r.dataset.ddOff, r.dataset.ddDef)[r.dataset.dd], sd = [...r.querySelectorAll('.ddside')];
      const lead = F[0] != null && F[1] != null && F[0] !== F[1] ? (F[0] > F[1] ? 0 : 1) : -1;
      sd.forEach((x, j) => { const f = x.querySelector('.ddrk, .ddelo'), who = `the ${r.dataset.dd} row of ${r.dataset.ddOff}, the ${j ? 'defense' : 'offense'}'s side`;
        if (!f) { bad.push(`${who} shows no figure`); return; }
        if (F[j] != null ? !(f.matches('.ddelo') && txt(f) === String(F[j])) : !f.matches('.ddrk')) bad.push(`${who} shows ${txt(f)} (want ${F[j] != null ? 'its Elo, ' + F[j] : 'its rank: the Elo files have none for it'})`);
        if (x.querySelectorAll('.gs-better').length !== (lead === j ? 1 : 0) || (lead === j && !f.classList.contains('gs-better'))) bad.push(`${who} is ${lead === j ? 'not ' : ''}marked better (${F.join(' against ')})`);
        const sh = [...x.querySelectorAll('svg')], tpl = R.d.createElement('template'); tpl.innerHTML = F[j] != null ? shieldOf(R)(F[j]) : '';
        const want = tpl.content.firstElementChild;
        if (F[j] != null ? !(want && sh.length === 1 && sh[0].matches('svg.tierbadge') && sh[0].outerHTML === want.outerHTML && sh[0].nextElementSibling === f && /tier/.test(sh[0].getAttribute('aria-label') || ''))
          : sh.length) bad.push(`${who} wears ${sh.length} shield${sh.length === 1 ? '' : 's'}${F[j] != null && sh.length === 1 ? ' that is not its tier\'s, named, before its Elo' : ''} (want ${F[j] != null ? 'its Elo ' + F[j] + '\'s, once' : 'none beside a rank'})`); });
    }
    return bad; };
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
  /* the stand-in stats.json: the snapshot's Stat breakdown went on 16 October 2026 (the owner's call), and its bars
     came back on 20 October as a game page's Team Stats window, which alone reads the file (below); the four
     stand-ins hold a tie (sacks), a pair at 0 (red zone), a number missing (explosive plays) and a negative */
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
        const el = q(`#gsUnits [data-gs-poss="${o}-${dd}"] .dd[data-dd-pos="${o}-${dd}"]`), want = DDM.possession(UNITS, o, dd, DDM.eloSides(eloM, eloP, eloMu, G.game_id, o, dd, tierOf(N1), shieldOf(N1)));
        const tpl = N1.d.createElement('template'); tpl.innerHTML = want ? want.html : '';
        if (!el) { bad.push(`${o} against ${dd} has no Deep Dive rows`); continue; }
        if (!tpl.content.firstElementChild || el.outerHTML !== tpl.content.firstElementChild.outerHTML) bad.push(`${o} against ${dd}: the rows are not deepdive.js's for the file`);
        const got = [...el.querySelectorAll('.ddrow')].map(r => `${r.dataset.dd}:${r.querySelectorAll('.dtag').length === 1 ? txt(r.querySelector('.dtag')) : 'tags ' + r.querySelectorAll('.dtag').length}`).join();
        if (got !== rowsWant(O, D)) bad.push(`${o} against ${dd}: the tags read ${got}, the rule makes them ${rowsWant(O, D)}`); }
      if (md.querySelectorAll('#gsUnits [data-gs-ddwhy]').length) bad.push('a possession says why it has no rows: ' + txt(q('#gsUnits [data-gs-ddwhy]')));
      /* each row compact (the owner's call, 14 October 2026): the unit, the two sides (the offense's then the
         defense's, each its club and one rank), then the defense's position it faces (the owner's call, 16
         October 2026; this smoke's own copy of them, the quarterback's the Overall defense since the same
         day's "QB needs to be vs team defense overall") and the tag together, in that order, and its words
         those alone, its shields' own taken off */
      const DPOS = { qb: 'Overall defense', ol: 'Pass rush', rb: 'Run defense', rec: 'Coverage' };
      for (const r of md.querySelectorAll('#gsUnits .ddrow')) { const k = [...r.children], sd = k[1] ? [...k[1].querySelectorAll('.ddside')] : [], e = k[2] ? [...k[2].children] : [];
        const words = `${txt(k[0])} ${r.dataset.ddOff} ${sd[0] ? txt(sd[0].querySelector('.ddrk, .ddelo')) : ''} · ${r.dataset.ddDef} ${sd[1] ? txt(sd[1].querySelector('.ddrk, .ddelo')) : ''} ${DPOS[r.dataset.dd]} ${e[1] ? txt(e[1]) : ''}`;
        if (k.length !== 3 || !k[0].matches('.ddunit') || !k[1].matches('.ddrks') || !k[2].matches('.ddend') || e.length !== 2 || !e[0].matches('.dddu') || !e[1].matches('.dtag')
          || txt(e[0]) !== DPOS[r.dataset.dd] || sd.length !== 2 || !sd[0].matches('.ddoff') || !sd[1].matches('.dddef')
          || sd.some(x => x.querySelectorAll('.ddrk, .ddelo').length !== 1) || txt(sd[0].querySelector('.ddsn')) !== r.dataset.ddOff || txt(sd[1].querySelector('.ddsn')) !== r.dataset.ddDef
          || plain(r).replace(/\s+/g, ' ') !== words.replace(/\s+/g, ' ')) { bad.push(`the ${r.dataset.dd} row of ${r.dataset.ddOff} is not its unit, the two clubs and figures, the defense's position and its tag alone: '${plain(r)}'`); break; }
        /* the quarterback's defense side is titled its Overall Defense; the receivers' its Pass Defense */
        if ((r.dataset.dd === 'qb' && !/ Overall Defense: Elo \d+/.test(sd[1].getAttribute('title') || '') && sd[1].querySelector('.ddelo'))
          || (r.dataset.dd === 'rec' && sd[1].querySelector('.ddelo') && !/ Pass Defense: Elo \d+/.test(sd[1].getAttribute('title') || ''))) { bad.push(`the ${r.dataset.dd} row of ${r.dataset.ddOff}: the defense's side is titled '${sd[1].getAttribute('title')}'`); break; } }
      /* each figure the Elo files' own, worked out above, the higher marked; a rank only where there is no Elo */
      bad.push(...figsBad(md, (o, d) => figsWant(eloM, eloP, eloMu, G.game_id, o, d), N1));
      const shown = namesShown(md, UNITS);
      if (shown.length) bad.push(`the window shows names from the units file: ${shown.join(', ')}`);
      /* what the rows rest on: the "Position matchups" label's title, never text under the card */
      const basis = htmlTxt(N1, DDM.basis(UNITS, a, h, anyFig(figsWant(eloM, eloP, eloMu, G.game_id, a, h)))), labs = [...md.querySelectorAll('#gsUnits [data-gs-basis]')];
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
    /* no Stat breakdown (the owner's call, 16 October 2026: "get rid of stat breakdown section") and no
       Sources card (14 October 2026), with a stat file there to read: none of its numbers drawn */
    chk(!q('#gsFiles') && !q('#gsStats') && !q('[data-gs-srow], [data-gs-sval], [data-gs-sbasis], .gs-sbar') && !!q('#gsUnits') && !/Stat breakdown|stat breakdown/.test(txt(md)),
      'news: the Stat breakdown, or the Sources card, is still drawn');
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
    chk(bad.length === 0, `news: a played game with a note (${P1.game_id}) is not drawn as the files have it: ${bad.join('; ')}`);
    await closeG(N1); }
  if (P2) { const m4 = await openG(N1, P2);
    chk(!!m4 && !m4.querySelector('.gs-prev'), `news: a played game with no note (${P2.game_id}) draws a preview`); await closeG(N1); }
  if (LATER) { const m5 = await openG(N1, LATER), why = [...(m5 ? m5.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt);
    chk(why.length === 2 && why.every(x => new RegExp(`are for week ${wk}: this game's come with its week`).test(x)) && !m5.querySelector('#gsUnits .dd'),
      `news: a game of a later regular-season week does not say its Deep Dive comes with its week: '${why.join(' / ')}'`); await closeG(N1); }
  /* each file read once a page load (the notes once a week), no-store, however often the window opened */
  await openG(N1, G); await closeG(N1);
  { const nc = N1.calls.filter(c => /(^|\/)news\/data\//.test(c.url)), urls = nc.map(c => c.url.replace(/\?.*$/, ''));
    chk(nc.every(c => c.cache === 'no-store' && c.method === 'GET') && new Set(urls).size === urls.length && urls.includes('news/data/units.json') && !urls.some(u => u.endsWith('news/data/stats.json'))
      && urls.includes(`news/data/notes/${season}-w${wk}.json`) && (!P1 || urls.includes(`news/data/notes/${season}-w${+P1.week}.json`)),
      'news: the news files are not each read once, no-store, at their addresses, or stats.json is read: ' + urls.join(', ')); }

  /* ---- (app v124, the owner's call of 20 October 2026: "get rid of the suggested parlays section from there.
     instead I want you to add three different buttons: Matchup, Mismatches, and Team Stats ... I want each button
     to pop up in its own little window") a game's page on the Props tab: each button opens one card of the Game
     snapshot alone, in the snapshot's window made narrow, over the game's page. Matchup is the snapshot's own
     Offense vs defense body and Mismatches its own, each to the byte; Team Stats the season's eleven team stats side
     by side on bars (stats.json, read once, no-store, only when the window first opens), worked out here on their
     own. The window's keys, focus and closing are held too: Escape closes it alone, the focus back on its button (on
     the one drawn since where the page redrew under it), the game's page and its scroll lock kept, and reaches no
     listener beneath; a click outside closes it, one inside does not, nor a double click's second; another tab's
     address and the game's page closing take it with them, the focus never left on the page's body; and the board's
     Game snapshot opened after it is the whole snapshot, with no bars ---- */
  const SR_OWN = [['pd', s => s.ppg == null || s.pa == null ? null : Math.round((s.ppg - s.pa) * 10) / 10, false, true, false], ['ppg', s => s.ppg, false], ['pa', s => s.pa, true],
    ['ypp', s => s.ypp, false], ['yppa', s => s.yppa, true], ['to', s => s.to, false, true], ['sk', s => s.sk, false], ['ska', s => s.ska, true],
    ['third', s => s.third, false, false, true], ['rz', s => s.rz, false, false, true], ['expl', s => s.expl, false]];
  const splitOwn = (x, y, lo) => { if (x == null || y == null || (x === 0 && y === 0)) return [0, 0]; let pa;
    if (lo) { const ix = 1 / Math.max(x, 0.01), iy = 1 / Math.max(y, 0.01); pa = ix / (ix + iy) * 100; } else { const m = Math.min(x, y, 0); pa = (x - m) + (y - m) === 0 ? 50 : (x - m) / ((x - m) + (y - m)) * 100; }
    pa = Math.round(pa * 10) / 10; return [pa, Math.round((100 - pa) * 10) / 10]; };
  const fmtOwn = (v, sign, pc) => v == null ? '–' : (v < 0 ? '−' + Math.abs(v) : (sign && v > 0 ? '+' : '') + v) + (pc ? '%' : '');
  /* the Team Stats window against the stand-in's two lines (SA the away side's, SH the home's; none for a team the
     file lacks): each of the eleven rows' numbers, the better one marked, the bar split and coloured, the counts */
  const statsBad = (R, md, a, h, SA, SH) => {
    const bad = [], box = md.querySelector('[data-gs-only="stats"]'); if (!box) return ['no Team Stats card in the window'];
    const q = sel => box.querySelector(sel); let na = 0, nh = 0;
    const rows = box.querySelectorAll('[data-gs-srow]');
    if ([...rows].map(r => r.dataset.gsSrow).join() !== SR_OWN.map(r => r[0]).join()) bad.push('the rows are ' + [...rows].map(r => r.dataset.gsSrow).join());
    for (const [k, f, lo, sign, pc] of SR_OWN) { const r = q(`[data-gs-srow="${k}"]`); if (!r) continue;
      const x = SA ? f(SA) : null, y = SH ? f(SH) : null, xx = x == null ? null : x, yy = y == null ? null : y;
      const [pa, ph] = splitOwn(xx, yy, lo), ba = xx != null && yy != null && xx !== yy && (lo ? xx < yy : xx > yy), bh = xx != null && yy != null && xx !== yy && !ba;
      if (ba) na++; if (bh) nh++;
      const va = r.querySelector(`[data-gs-sval="${a}"]`), vh = r.querySelector(`[data-gs-sval="${h}"]`), [ia, ih] = [...r.querySelectorAll('.gs-shalf i')];
      if (txt(va) !== fmtOwn(xx, sign, pc) || txt(vh) !== fmtOwn(yy, sign, pc)) bad.push(`${k} reads ${txt(va)} and ${txt(vh)}, the file ${fmtOwn(xx, sign, pc)} and ${fmtOwn(yy, sign, pc)}`);
      if (!!(va && va.closest('.gs-better')) !== ba || !!(vh && vh.closest('.gs-better')) !== bh || r.querySelectorAll('.gs-better').length !== (ba || bh ? 1 : 0)) bad.push(`${k}: the mark is on the wrong side`);
      if (!ia || !ih || ia.style.width !== pa + '%' || ih.style.width !== ph + '%') bad.push(`${k}'s bar is ${ia && ia.style.width} and ${ih && ih.style.width}, the numbers split it ${pa}% and ${ph}%`);
      if (ia && ih && (ia.style.getPropertyValue('--gs-tc') !== R.w.pkTagColor(a) || ih.style.getPropertyValue('--gs-tc') !== R.w.pkTagColor(h))) bad.push(`${k}'s bar is not in the teams' colours`); }
    if (SA && SH) {
      if (txt(q(`[data-gs-sb="${a}"]`)) !== String(na) || txt(q(`[data-gs-sb="${h}"]`)) !== String(nh)) bad.push(`the counts read ${txt(q(`[data-gs-sb="${a}"]`))} and ${txt(q(`[data-gs-sb="${h}"]`))}, the marks ${na} and ${nh}`);
      if (/Not in the file yet/.test(txt(box))) bad.push('it says a team is not in the file: ' + (txt(box).match(/Not in the file yet[^;.]*/) || [''])[0]); }
    else { const gone = [[a, SA], [h, SH]].filter(([, x]) => !x).map(([t]) => t);
      if (!txt(box).includes(`Not in the file yet: ${gone.join(' and ')}; ${gone.length === 1 ? 'its' : 'their'} numbers show as dashes.`)) bad.push(`it does not say ${gone.join(' and ')} is not in the file yet`); }
    return bad; };
  const statReads = R => R.calls.filter(c => c.url.replace(/\?.*$/, '').endsWith('news/data/stats.json'));
  /* the game's page on the Props tab, opened as the snapshot's button opens it, then one of its buttons pressed */
  const openPop = async (R, g, kind, settle = 150) => { const P = R.w.pkBoard, gm = R.d.getElementById('gameModal');
    if (!P.canProps(g.game_id)) return null;
    if (R.w.eval('S').ui.game !== g.game_id || gm.hidden || gm.closest('[hidden]')) { P.openOnProps(g.game_id); await wait(80); }
    const b = R.d.querySelector(`#gameView [data-gp-pop="${kind}"]`); if (!b) return null;
    b.click(); if (settle) await wait(settle); const md = R.d.getElementById('gsModal');
    return md && !md.hidden && md.dataset.gsOnly === kind ? md : null; };
  const shutPop = async R => { R.w.gameSnapshotClose(false); await wait(10); };
  const leaveGame = async R => { R.w.gameSnapshotClose(false); if (!R.d.getElementById('gameModal').hidden) R.w.closeGame(); await wait(30); };
  const key = (R, k, shift) => { const t = R.d.activeElement || R.d.body; t.dispatchEvent(new R.w.KeyboardEvent('keydown', { key: k, shiftKey: !!shift, bubbles: true, cancelable: true })); };
  const oneBody = (md, kind) => { const b = md && md.querySelector(`[data-gs-only="${kind}"] .gs-secbody`); return b ? b.innerHTML : null; };
  { const R = N1;
    if (!R.w.pkBoard.canProps(G.game_id)) console.log(`  (news: ${G.game_id} has no page on the Props tab, so the game page's windows went untested on the stand-ins)`);
    else {
      const ms = await openG(R, G), uB = ms && ms.querySelector('#gsUnitsB') ? ms.querySelector('#gsUnitsB').innerHTML : null, mB = ms && ms.querySelector('#gsMismB') ? ms.querySelector('#gsMismB').innerHTML : null;
      await closeG(R);
      const wkName = R.w.pkBoard.weekName(+G.week), reads0 = statReads(R).length;
      /* Matchup: the snapshot's Offense vs defense, to the byte, under a title naming it and the game */
      { const md = await openPop(R, G, 'units'), bad = [];
        if (!md) bad.push('it opens no window');
        else {
          const gm = R.d.getElementById('gameModal'), ttl = txt(R.d.getElementById('gsTitle'));
          if (!md.classList.contains('gs-one') || md.querySelectorAll('#gsView > section').length !== 1) bad.push('the window is not one card alone');
          if (ttl !== `${a}${R.w.pkBoard.neutral(G) ? 'vs' : 'at'}${h}Matchup · ${wkName}`) bad.push(`its title reads '${ttl}'`);
          if (uB == null || oneBody(md, 'units') !== uB) bad.push('its body is not the snapshot\'s Offense vs defense');
          if (md.querySelectorAll('.dd').length !== 2 || md.querySelector('[data-gs-past]')) bad.push('its Deep Dive rows are not both drawn, or a game to come says it was played');
          if (md.querySelector('[data-gs-fold], [data-gs-all], #gsMatch, #gsMini *')) bad.push('it draws the snapshot\'s folds, its verdict or its game bar');
          if (R.d.activeElement !== R.d.getElementById('gsClose')) bad.push('the focus is not on Close');
          if (gm.hidden || !R.d.body.classList.contains('modal-open') || R.w.eval('S').ui.game !== G.game_id) bad.push('the game\'s page is not open under it');
          /* Tab and Shift+Tab stay inside: Close is the one control */
          key(R, 'Tab'); const t1 = R.d.activeElement; key(R, 'Tab', true); const t2 = R.d.activeElement;
          if (t1 !== R.d.getElementById('gsClose') || t2 !== R.d.getElementById('gsClose')) bad.push('Tab leaves the window');
          /* Escape: this window alone, no listener beneath it, the focus back on its button */
          let seen = 0; const cnt = e => { if (e.key === 'Escape') seen++; }; R.d.addEventListener('keydown', cnt);
          key(R, 'Escape'); R.d.removeEventListener('keydown', cnt); await wait(10);
          const btn = R.d.querySelector('#gameView [data-gp-pop="units"]');
          if (!md.hidden || gm.hidden || seen !== 0 || R.d.activeElement !== btn || !R.d.body.classList.contains('modal-open') || R.w.eval('S').ui.game !== G.game_id)
            bad.push(`Escape did not close the window alone with the focus back on Matchup (open ${!md.hidden}, game ${!gm.hidden}, ${seen} beneath, focus ${R.d.activeElement && (R.d.activeElement.dataset.gpPop || R.d.activeElement.id || R.d.activeElement.tagName)})`);
          /* a second Escape is the game page's: it closes */
          key(R, 'Escape'); await wait(20);
          if (!gm.hidden) bad.push('a second Escape did not close the game\'s page'); }
        chk(bad.length === 0, `news: the game page's Matchup window (${G.game_id}) is not the snapshot's Offense vs defense alone in its own window: ${bad.join('; ')}`); }
      /* Mismatches: the snapshot's own, to the byte; the page redrawn under it, Escape gives the focus to the new button */
      { const md = await openPop(R, G, 'mism'), bad = [];
        if (!md) bad.push('it opens no window');
        else {
          if (txt(R.d.getElementById('gsTitle')) !== `${a}${R.w.pkBoard.neutral(G) ? 'vs' : 'at'}${h}Mismatches · ${wkName}`) bad.push(`its title reads '${txt(R.d.getElementById('gsTitle'))}'`);
          if (mB == null || oneBody(md, 'mism') !== mB) bad.push('its body is not the snapshot\'s Mismatches');
          const old = R.d.querySelector('#gameView [data-gp-pop="mism"]'); R.w.renderGame(); await wait(10);
          const nu = R.d.querySelector('#gameView [data-gp-pop="mism"]');
          if (md.hidden || old.isConnected || !nu) bad.push('a redraw of the game\'s page closed the window, or kept its buttons');
          key(R, 'Escape'); await wait(10);
          if (!md.hidden || R.d.activeElement !== nu) bad.push('after a redraw, Escape did not give the focus to the Mismatches button drawn since');
          /* a click inside stays; a double click's second, on the backdrop, stays; a click on the backdrop closes */
          const m2 = await openPop(R, G, 'mism', 0);
          if (!m2) bad.push('it did not open again');
          else {
            m2.dispatchEvent(new R.w.MouseEvent('click', { bubbles: true, detail: 2 }));
            R.d.getElementById('gsView').click();
            if (m2.hidden) bad.push('a double click\'s second click, or a click inside, closed the window');
            m2.dispatchEvent(new R.w.MouseEvent('click', { bubbles: true, detail: 0 })); await wait(10);
            if (!m2.hidden || R.d.getElementById('gameModal').hidden || R.d.activeElement !== R.d.querySelector('#gameView [data-gp-pop="mism"]')) bad.push('a click outside did not close the window alone, the focus on its button'); } }
        chk(bad.length === 0, `news: the game page's Mismatches window (${G.game_id}) is not the snapshot's Mismatches alone in its own window: ${bad.join('; ')}`); }
      /* Team Stats: loading, then the stand-in's eleven rows; stats.json read once, no-store, only now */
      { const bad = [];
        if (statReads(R).length !== reads0 || reads0 !== 0) bad.push(`stats.json was read ${statReads(R).length} times before Team Stats was pressed`);
        const md0 = await openPop(R, G, 'stats', 0), loading = md0 && txt(md0.querySelector('[data-gs-only="stats"]'));
        if (!md0 || loading !== 'Loading the team stats…') bad.push(`it does not open saying it is loading: '${loading}'`);
        await wait(150); const md = R.d.getElementById('gsModal');
        if (!md || md.hidden || md.dataset.gsOnly !== 'stats') bad.push('it closed or changed while its file came in');
        else {
          if (txt(R.d.getElementById('gsTitle')) !== `${a}${R.w.pkBoard.neutral(G) ? 'vs' : 'at'}${h}Team Stats · ${wkName}`) bad.push(`its title reads '${txt(R.d.getElementById('gsTitle'))}'`);
          bad.push(...statsBad(R, md, a, h, S1, S2));
          const basis = txt(md.querySelector('[data-gs-sbasis]'));
          if (!basis.startsWith(`${season} season through Oct 12: ${a} 5 games, ${h} 4 games.`)) bad.push(`the basis reads '${basis}'`);
          if (R.d.activeElement !== R.d.getElementById('gsClose')) bad.push('the focus left Close as the file came in'); }
        await shutPop(R); await openPop(R, G, 'stats'); await shutPop(R);
        const rs = statReads(R);
        if (rs.length !== 1 || rs[0].cache !== 'no-store' || rs[0].method !== 'GET') bad.push(`stats.json read ${rs.length} times (${rs.map(c => c.cache).join(', ')}), not once no-store`);
        /* another tab's address takes the window with it, the focus not left on the body */
        const m3 = await openPop(R, G, 'stats');
        if (m3) { R.w.location.hash = '#matchups'; await wait(60);
          if (!m3.hidden || !R.d.activeElement || R.d.activeElement === R.d.body) bad.push('a move to the Matchups tab left the window open, or the focus on the body'); }
        /* the game's page closing takes it with it */
        const m4 = await openPop(R, G, 'stats');
        if (m4) { R.w.closeGame(); await wait(30);
          if (!m4.hidden || !R.d.getElementById('gameModal').hidden || R.d.body.classList.contains('modal-open') || !R.d.activeElement || R.d.activeElement === R.d.body) bad.push('the game\'s page closing left the window open, the page locked, or the focus on the body'); }
        else bad.push('it did not open again');
        chk(bad.length === 0, `news: the game page's Team Stats window (${G.game_id}) is not the stand-in's stats side by side, read once when it opens: ${bad.slice(0, 8).join('; ')}`); }
      /* the board's snapshot after them is the whole snapshot, its title its own and no bars */
      { const md = await openG(R, G);
        chk(!!md && !md.classList.contains('gs-one') && !md.dataset.gsOnly && /Game snapshot/.test(txt(R.d.getElementById('gsTitle'))) && !md.querySelector('[data-gs-srow], [data-gs-only]') && !!md.querySelector('#gsUnits') && !!md.querySelector('#gsMatch'),
          'news: the board\'s Game snapshot opened after a game page\'s window is not the whole snapshot, or carries Team Stats');
        await closeG(R); }
      /* a played game (P1, its home side missing from the stat file): Matchup says so over the same body, Team
         Stats draws that side's dashes and says it is not in the file */
      if (P1 && R.w.pkBoard.canProps(P1.game_id)) { const bad = [];
        const ms1 = await openG(R, P1), uB1 = ms1 && ms1.querySelector('#gsUnitsB') ? ms1.querySelector('#gsUnitsB').innerHTML : null; await closeG(R);
        const mu1 = await openPop(R, P1, 'units');
        if (!mu1) bad.push('Matchup opens no window');
        else { const sb = mu1.querySelector('[data-gs-only="units"] .gs-secbody').cloneNode(true), pp = sb.querySelector('[data-gs-past]');
          if (!pp || txt(pp) !== 'Played. The ratings and the Deep Dive are the files as they stand now, after the game.' || sb.firstElementChild !== pp) bad.push(`Matchup does not open saying the game was played: '${pp ? txt(pp) : 'no note'}'`);
          if (pp) pp.remove(); if (uB1 == null || sb.innerHTML !== uB1) bad.push('Matchup\'s body is not the snapshot\'s'); }
        await shutPop(R);
        const ms2 = await openPop(R, P1, 'stats');
        if (!ms2) bad.push('Team Stats opens no window'); else bad.push(...statsBad(R, ms2, P1.away_team, P1.home_team, S1, null));
        await leaveGame(R);
        chk(bad.length === 0, `news: a played game's windows (${P1.game_id}) are not drawn as the files have them: ${bad.slice(0, 6).join('; ')}`); }
      await leaveGame(R); } }
  N1.w.close();

  /* ---- every news file missing: the automatic line with no news, each part saying it did not load, nothing thrown ---- */
  { const N2 = await run(st, undefined, null, false, { news: {} }); await wait(400);
    const m = await openG(N2, G), b = m && m.querySelector('.gs-prev');
    chk(!!m && N2.errs.length === 0 && !/could not be drawn/.test(txt(m)) && !!b && b.dataset.gsNote === 'auto' && !b.querySelector('[data-gs-news]')
      && [...m.querySelectorAll('#gsUnits [data-gs-ddwhy]')].length === 2 && [...m.querySelectorAll('#gsUnits [data-gs-ddwhy]')].every(x => /Deep Dive did not load/.test(txt(x)))
      && !m.querySelector('[data-gs-head]') && !m.querySelector('#gsStats') && !m.querySelector('#gsFiles'),
      'news: with every news file missing the window does not draw the automatic line and say each part did not load: ' + N2.errs.join('; ') + ' ' + (m ? txt(m.querySelector('#gsUnits')).slice(0, 80) : 'no window'));
    await closeG(N2);
    /* a game page's Team Stats window with stats.json missing says so, and nothing is thrown */
    if (N2.w.pkBoard.canProps(G.game_id)) { const p = await openPop(N2, G, 'stats'), t = p && txt(p.querySelector('[data-gs-only="stats"]'));
      chk(!!p && t === 'The team stats did not load (HTTP 404).' && !p.querySelector('[data-gs-srow]') && N2.errs.length === 0, `news: with stats.json missing the Team Stats window does not say it did not load: '${t}' ${N2.errs.join('; ')}`);
      await leaveGame(N2); }
    N2.w.close(); }
  /* ---- a notes file that is not JSON (and a stat file of the wrong shape beside it, which the Team Stats window says did not load): the automatic line, the Deep Dive drawn ---- */
  { const N3 = await run(st, undefined, null, false, { news: { units: UNITS, stats: { season, stats: [1, 2] }, notes: { [`${season}-w${wk}`]: 'this is not { json' } } }); await wait(400);
    const m = await openG(N3, G), b = m && m.querySelector('.gs-prev');
    chk(!!m && N3.errs.length === 0 && !!b && b.dataset.gsNote === 'auto' && !b.querySelector('[data-gs-news]') && !m.querySelector('#gsStats') && !!m.querySelector('#gsUnits .dd'),
      'news: a notes file that is not JSON does not draw the automatic line, or the Deep Dive is not drawn beside it: ' + N3.errs.join('; ') + ' ' + (b ? txt(b) : 'no preview'));
    await closeG(N3);
    /* the stat file of the wrong shape: the Team Stats window says it did not load, and draws no row */
    if (N3.w.pkBoard.canProps(G.game_id)) { const p = await openPop(N3, G, 'stats'), t = p && txt(p.querySelector('[data-gs-only="stats"]'));
      chk(!!p && t === 'The team stats did not load (not the stat file).' && !p.querySelector('[data-gs-srow]'), `news: a stat file of the wrong shape is drawn in the Team Stats window: '${t}'`);
      await leaveGame(N3); }
    N3.w.close(); }
  /* ---- a units file lacking one of the game's clubs: each possession says which, no rows, nothing thrown ---- */
  { const U4 = Object.assign({}, UNITS, { units: { [A]: UNITS.units[A] } });
    const N4 = await run(st, undefined, null, false, { news: { units: U4, stats: STATS, notes } }); await wait(400);
    const m = await openG(N4, G), why = [...(m ? m.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt), b = m && m.querySelector('.gs-prev');
    chk(!!m && N4.errs.length === 0 && !/could not be drawn/.test(txt(m)) && why.length === 2 && why.every(x => x === `The Deep Dive has no matchups for ${h}.`) && !m.querySelector('#gsUnits .dd')
      && !!b && !b.querySelector('[data-gs-news]') && !namesShown(m, U4).length,
      `news: a units file lacking ${h} does not say it has no matchups for it, or names a player from the file: ${N4.errs.join('; ')} '${why.join(' / ')}' ${b ? txt(b) : 'no preview'}`);
    N4.w.close(); }
  /* ---- a units file that is not JSON (beside a stat file of another season, which the Team Stats window names): each possession
     says so, nothing thrown ---- */
  { const N5 = await run(st, undefined, null, false, { news: { units: 'not { json', stats: Object.assign({}, STATS, { season: season - 1 }), notes } }); await wait(400);
    const m = await openG(N5, G), why = [...(m ? m.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt);
    chk(!!m && N5.errs.length === 0 && !/could not be drawn/.test(txt(m)) && why.length === 2 && why.every(x => /^The Deep Dive did not load\b/.test(x)) && !m.querySelector('#gsUnits .dd')
      && !m.querySelector('#gsStats'),
      `news: a units file that is not JSON is not said so: ${N5.errs.join('; ')} '${why.join(' / ')}'`);
    await closeG(N5);
    /* the stat file of another season: the Team Stats window says whose season it is, and draws no row */
    if (N5.w.pkBoard.canProps(G.game_id)) { const p = await openPop(N5, G, 'stats'), t = p && txt(p.querySelector('[data-gs-only="stats"]'));
      chk(!!p && t === `The team stats are ${season - 1}'s season; this game is ${season}'s.` && !p.querySelector('[data-gs-srow]'), `news: a stat file of another season is not said so in the Team Stats window: '${t}'`);
      await leaveGame(N5); }
    N5.w.close(); }

  /* ---- the figures' fallbacks (the owner's call, 16 October 2026: Elo against Elo where the files have it):
     an older model.json with none of the six position tables draws each side's rank from the units file,
     but the quarterback's own season Elo where his lineup is for this game and, against him, the Overall
     Defense, which model.json has without the tables; a quarterback unranked draws his row's rank, with no
     shield; nothing is marked beside a rank. Planted on copies of the Elo files: the away side's lineup for
     G a ranked quarterback alone, the home side's one made unranked ---- */
  { const M6 = JSON.parse(ELO_M), P6 = JSON.parse(ELO_P), MU6 = JSON.parse(ELO_MU);
    delete M6.units.tables; for (const k of ['run_def', 'pass_def', 'pass_rush', 'run_off', 'pass_off', 'pass_pro']) delete M6.units[k];
    const qbs = Object.entries(P6.players).filter(([, e]) => e.group === 'QB' && e.rank != null && typeof e.se === 'number');
    const qa = (qbs.find(([, e]) => e.team === a) || qbs[0])[0], qh = (qbs.find(([pid, e]) => e.team === h && pid !== qa) || qbs.find(([pid]) => pid !== qa))[0];
    P6.players[qh] = Object.assign({}, P6.players[qh], { rank: null });
    MU6.lineups = Object.assign({}, MU6.lineups, { [a]: { game_id: G.game_id, week: wk, players: [qa] }, [h]: { game_id: G.game_id, week: wk, players: [qh] } });
    const N6 = await run(st, undefined, null, false, { news: { units: UNITS, stats: STATS, notes }, elo: { model: M6, players: P6, mu: MU6 } }); await wait(400);
    const m = await openG(N6, G), bad = [];
    if (!m) bad.push('the game opens no window');
    else {
      for (const [o, dd] of [[a, h], [h, a]]) { const el = m.querySelector(`#gsUnits [data-gs-poss="${o}-${dd}"] .dd[data-dd-pos="${o}-${dd}"]`), want = DDM.possession(UNITS, o, dd, DDM.eloSides(M6, P6, MU6, G.game_id, o, dd, tierOf(N6), shieldOf(N6)));
        const tpl = N6.d.createElement('template'); tpl.innerHTML = want ? want.html : '';
        if (!el || !tpl.content.firstElementChild || el.outerHTML !== tpl.content.firstElementChild.outerHTML) bad.push(`${o} against ${dd}: the rows are not deepdive.js's for the files`); }
      bad.push(...figsBad(m, (o, d) => figsWant(M6, P6, MU6, G.game_id, o, d), N6));
      /* by hand: three Elo in the card, the away quarterback's against the home side's Overall Defense and,
         the other way, the away side's Overall Defense against the unranked home quarterback's rank, each
         with its shield; every other side a rank with none, and a mark only on the one row of two Elo */
      const elos = [...m.querySelectorAll('#gsUnits .ddelo')].map(x => `${x.closest('.ddrow').dataset.ddOff}:${x.closest('.ddrow').dataset.dd}:${txt(x)}`);
      const want3 = [`${a}:qb:${P6.players[qa].se}`, `${a}:qb:${M6.units.def[h].elo}`, `${h}:qb:${M6.units.def[a].elo}`];
      if (elos.join() !== want3.join()) bad.push(`the Elo drawn are ${elos.join(', ') || 'none'} (want ${want3.join(', ')})`);
      if (m.querySelectorAll('#gsUnits .ddrk').length !== 13 || m.querySelectorAll('#gsUnits .ddrow svg.tierbadge').length !== 3
        || [...m.querySelectorAll('#gsUnits .ddrow .gs-better')].some(x => x.closest('.ddrow').dataset.ddOff !== a || x.closest('.ddrow').dataset.dd !== 'qb'))
        bad.push(`${m.querySelectorAll('#gsUnits .ddrk').length} ranks and ${m.querySelectorAll('#gsUnits .ddrow svg.tierbadge').length} shields drawn (want 13 and 3), or a side marked beside a rank`);
      const labs = [...m.querySelectorAll('#gsUnits [data-gs-basis]')].map(l => l.getAttribute('title') || '');
      /* both possessions have an Elo now (the Overall Defense against each quarterback), so both say what the figures are */
      if (labs.length !== 2 || !labs.every(t => /^The figures are each side's Elo/.test(t))) bad.push(`the labels' titles do not say what the figures are: ${labs.map(t => t.slice(0, 40)).join(' | ')}`); }
    chk(bad.length === 0 && N6.errs.length === 0, `news: the matchup rows' fallbacks (no position tables, an unranked quarterback) are not drawn as the files say: ${N6.errs.join('; ')} ${bad.slice(0, 6).join('; ')}`);
    N6.w.close(); }

  /* ---- the Rams: LA on the board, LAR in the news job's files. A copy of G with LA at home (unless a side
     already is), the stand-ins keyed by deepdive.js's club codes as the job keys them: the Deep Dive reads
     LA's entries from LAR. And a made-up wild-card game
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
      if (!Object.keys(UL.units).includes('LAR') || Object.keys(UL.units).includes('LA')) bad.push('the stand-ins are not keyed LAR');
      for (const [o, dd] of [[la, lh], [lh, la]]) { const el = q(`#gsUnits [data-gs-poss="${o}-${dd}"] .dd[data-dd-pos="${o}-${dd}"]`), want = DDM.possession(UL, o, dd, DDM.eloSides(eloM, eloP, eloMu, LG.game_id, o, dd, tierOf(NL), shieldOf(NL)));
        const tpl = NL.d.createElement('template'); tpl.innerHTML = want ? want.html : '';
        if (!el || !tpl.content.firstElementChild || el.outerHTML !== tpl.content.firstElementChild.outerHTML) bad.push(`${o} against ${dd}: the Deep Dive is not deepdive.js's rows from LAR's entry: ${el ? 'other rows' : txt(q(`#gsUnits [data-gs-poss="${o}-${dd}"] [data-gs-ddwhy]`)) || 'none'}`); }
      if (![...m.querySelectorAll('#gsUnits [data-gs-basis]')].map(l => l.getAttribute('title') || '').some(t => t.includes(`, plus this season's ${gamesWant(UL, la, lh)}.`))) bad.push(`the Deep Dive's basis does not count LA's games from LAR's entry`);
      /* the Rams' Elo is model.json's LA, as the board names them */
      bad.push(...figsBad(m, (o, d) => figsWant(eloM, eloP, eloMu, LG.game_id, o, d), NL));
      if (eloM.units && eloM.units.tables && eloM.units.tables.pass_off && !m.querySelector(`#gsUnits .ddrow[data-dd="rec"][data-dd-off="LA"] .ddoff .ddelo`)) bad.push("the Rams' receivers row shows no Pass Offense Elo"); }
    chk(bad.length === 0 && NL.errs.length === 0, `news: a Rams game (${la} at ${lh}) does not read LA's entries from the files' LAR: ${NL.errs.join('; ')} ${bad.slice(0, 6).join('; ')}`);
    await closeG(NL);
    /* its Team Stats window (opened as a game page's button opens it) reads LA's stats from the file's LAR */
    { NL.w.gameWindow('stats', LG.game_id, null); await wait(150); const p = NL.d.getElementById('gsModal');
      const sb = p && !p.hidden && p.dataset.gsOnly === 'stats' ? statsBad(NL, p, la, lh, S1, S2) : ['no Team Stats window'];
      if (!Object.keys(SL.stats).includes('LAR') || Object.keys(SL.stats).includes('LA')) sb.push('the stand-in stats are not keyed LAR');
      chk(sb.length === 0, `news: a Rams game's Team Stats window does not read LA's stats from the file's LAR: ${sb.slice(0, 6).join('; ')}`);
      await shutPop(NL); }
    if (WC) { const mw = await openG(NL, WC), why = [...(mw ? mw.querySelectorAll('#gsUnits [data-gs-ddwhy]') : [])].map(txt), b = mw && mw.querySelector('.gs-prev');
      chk(!!mw && NL.errs.length === 0 && why.length === 2 && why.every(x => x === 'The Deep Dive covers the regular season only; its matchups end with week 18.') && !mw.querySelector('#gsUnits .dd')
        && !mw.querySelector('#gsUnits [data-gs-basis]') && (!b || !b.querySelector('[data-gs-news]')),
        `news: a wild-card game does not say the Deep Dive covers the regular season only: '${why.join(' / ')}' ${NL.errs.join('; ')}`);
      await closeG(NL); }
    NL.w.close(); }

  /* ---- the files coming in late: the news files and the prop model held back, released one by one. Each
     redraw keeps the focus on the same control (found again, a new element) or puts it on Close where that
     control has gone, never on the page's body; and the card scrolled to (Offense vs defense) stays where it
     was on the screen as the preview and the props button are drawn in above it and the Deep Dive inside it.
     jsdom lays nothing out, so the layout is planted: every element in the window 40px tall in the page's
     order, the header 64px, Offense vs defense 120px from the top of the screen; the arithmetic is then
     held. Each part says it is loading while its file is read, and draws once it is in ---- */
  { const gate = () => { let go; const p = new Promise(r => { go = r; }); return { p, go }; }, gU = gate(), gN = gate(), gP = gate();
    const NH = await run(st, undefined, null, false, { news: { units: UNITS, stats: STATS, notes }, gate: { units: gU.p, notes: gN.p, payload: gP.p }, early: true });
    const m = await openG(NH, G), bad = [];
    if (!m) bad.push('the game opens no window while the files are held');
    else {
      const q = sel => m.querySelector(sel), view = NH.d.getElementById('gsView'), PX = 40, tgt = () => NH.d.getElementById('gsUnits');
      if (NH.timedOut || NH.w.pkBoard.canProps(G.game_id) || q('[data-gs-props]')) bad.push('the prop model was up before its payload was let through');
      if (q('[data-gs-player]')) bad.push('a starter\'s name opens the Props tab before the prop model is up');
      if ([...m.querySelectorAll('#gsUnits [data-gs-ddwhy]')].map(txt).join('|') !== 'Loading the Deep Dive…|Loading the Deep Dive…' || q('#gsStats')) bad.push('the Deep Dive does not say it is loading, or a Stat breakdown is drawn');
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
      /* the week's notes: the automatic preview drawn in above, the Deep Dive still loading */
      const r1 = await step('the notes coming in', () => q('[data-gs-fold="gsMism"]'), () => gN.go(), () => wait(150));
      keep('the notes coming in', r1, 'gsFold', 'gsMism');
      if (r1 && !(r1.i1 > r1.i0)) bad.push('nothing was drawn in above Offense vs defense as the notes came in');
      if (!q('.gs-prev')) bad.push('the preview was not drawn once its file came in');
      if (q('#gsUnits .dd') || ![...m.querySelectorAll('#gsUnits [data-gs-ddwhy]')].every(x => txt(x) === 'Loading the Deep Dive…')) bad.push('the Deep Dive does not say it is loading while its file is still read');
      /* the units, with a control that is not drawn again: the focus goes to Close; the Deep Dive's rows and
         headline tags drawn in inside Offense vs defense, which stays where it was */
      const gone = NH.d.createElement('button'); gone.type = 'button'; gone.dataset.gsFold = 'gone'; view.appendChild(gone);
      const r2 = await step('the units coming in', () => gone, () => gU.go(), () => wait(150));
      if (r2 && r2.at !== NH.d.getElementById('gsClose')) bad.push(`the units coming in: a control not drawn again leaves the focus on ${r2.at ? r2.at.tagName : 'nothing'}, not Close`);
      if (r2 && (top() !== 120 || m.scrollTop !== r2.y0 + PX * (r2.i1 - r2.i0))) bad.push(`the units coming in: Offense vs defense moved to ${top()}px`);
      if (!q('#gsUnits .dd') || q('#gsUnits [data-gs-ddwhy]')) bad.push('the Deep Dive was not drawn once its file came in');
      /* the prop model coming up: the props button drawn in first in the window */
      const r3 = await step('the prop model coming up', () => q('[data-gs-goto="gsUnits"]'), () => gP.go(), async () => { for (let i = 0; i < 200 && !NH.w.eval("typeof S==='object'&&!!S&&Array.isArray(S.sched)"); i++) await wait(50); await wait(400); });
      keep('the prop model coming up', r3, 'gsGoto', 'gsUnits');
      if (!!q('[data-gs-props]') !== NH.w.pkBoard.canProps(G.game_id)) bad.push('the props button is not drawn in once the prop model is up');
      { const on = NH.w.pkBoard.propsPlayers(G.game_id), want = [...m.querySelectorAll('#gsPos .gs-pl[data-pid]')].map(p => p.dataset.pid).filter(p => on.has(p)).sort().join();
        const got = [...m.querySelectorAll('#gsPos [data-gs-player]')].map(b => b.dataset.gsPlayer).sort().join();
        if (got !== want) bad.push(`once the prop model is up, the starters' names that open the Props tab are ${got || 'none'}, not ${want || 'none'}`); }
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
    const dom = new JSDOM(BET_FRAME.replace('window.EMBED_TAB=null', 'window.EMBED_TAB="record"'), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://demon-x13.github.io/nfl-hub/',
      beforeParse(fw) { if (X) fw.FRIENDS = X; fw.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
        fw.confirm = () => true; fw.alert = () => {}; fw.scrollTo = () => {};
        fw.addEventListener('error', e => errs.push(e.message));
        fw.fetch = async (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase(); ALL_CALLS.push(m + ' ' + s); offSite(s, SITE);
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
  const P = await run(st, 'https://demon-x13.github.io/nfl-hub/#record', null, false, { friends: FIX });
  await P.w.FRIENDS.ready();
  { const got = P.w.FRIENDS.get(), fc = P.calls.filter(c => /picks\/friends\.json/.test(c.url));
    chk(fc.length === 1 && fc[0].method === 'GET' && fc[0].cache === 'no-store' && fc[0].url.replace(/\?.*$/, '') === 'picks/friends.json', 'friends: the page does not read picks/friends.json once, no-store: ' + JSON.stringify(fc));
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
    const R = await run(st, 'https://demon-x13.github.io/nfl-hub/#record', null, false, { friends: fx }); await R.w.FRIENDS.ready();
    const got = R.w.FRIENDS.get(), Z = await frame(R.w.FRIENDS, st), head = await pickHead(Z);
    chk(got.friends.length === 0 && R.errs.length === 0 && Z.errs.length === 0 && rowsTh(Z.d).join('|') === baseRows && !Z.d.querySelector('.rv-flg, polyline.rv-friend') && head.join('|') === baseHead.join('|'),
      `friends: ${what} draws something, or throws: ${rowsTh(Z.d).join('|')} / ${head.join('|')} ${R.errs.concat(Z.errs).join('; ')}`);
    Z.w.close(); R.w.close(); }
  console.log(`friends' picks on the Pick'em Record: ${checks - c0} checks on stand-in files (week ${Wk}), ${fails.length - f0} failures`);
}

/* =====================================================================================
   LIGHT MODE (the owner's call of 17 October 2026: "keep this whole layout as dark mode, and then make a
   light mode version that people can tab on and off on the top right"). Dark is the look and every
   visitor's default whatever the system says; the switch at the top right of the header puts
   html[data-theme="light"] on the page and on every framed tab, and keeps the choice in this browser
   alone under nflhub_theme_v1 (nflbets/build/theme.js), read by a script in the head before anything is
   drawn. Held here: the build (the head script before the styles and the body, the light palette in the
   page and in every frame's head, nothing following the system's scheme, the key named by that script
   alone), the light palette's own pairs at 4.5:1 (jsdom lays nothing out and composes no background, so
   the page's every text in both looks is the Chromium sweep's), the switch (in the header before the
   tabs, a 44px button named Light mode, aria-pressed), a press each way on the page and its frames, open
   and opened after, with nothing written but the key, a reload in the stored look before the body is
   parsed, and storage that throws or holds junk read as dark, throwing nothing. All on the page's own
   clock and the files as they stand: nothing here turns on the week or the hour.
   ===================================================================================== */
async function lightChecks() {
  const c0 = checks, f0 = fails.length, KEY = 'nflhub_theme_v1', URL0 = 'https://demon-x13.github.io/nfl-hub/';
  const head = HTML.slice(0, HTML.indexOf('</head>'));
  /* ---- the build ---- */
  const scripts = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const tm = scripts.find(m => m[1].includes(`'${KEY}'`)), TJS = tm ? tm[1] : '';
  chk(!!tm && tm.index < head.indexOf('<style') && tm.index < head.indexOf('<style id="hubTheme">') && !HTML.slice(HTML.indexOf('</head>')).includes(`'${KEY}'`),
    'light mode: the script that reads the visitor\'s look is not in the page\'s head before its styles (so before anything is drawn), or the key is read elsewhere too');
  chk(!!TJS && !new RegExp(`['"\`]${KEY}['"\`]`).test(HTML.replace(TJS, '')), 'light mode: something other than the head\'s script names ' + KEY);
  const CSS = (head.match(/<style id="hubTheme">\n?([\s\S]*?)<\/style>/) || [])[1] || '';
  const block = sel => { const i = CSS.indexOf(sel + '{'); if (i < 0) return null; const j = CSS.indexOf('}', i); return CSS.slice(i + sel.length + 1, j); };
  const tokens = body => Object.fromEntries((body || '').split(';').map(x => x.trim()).filter(x => x.startsWith('--')).map(x => [x.slice(0, x.indexOf(':')).trim(), x.slice(x.indexOf(':') + 1).trim()]));
  const DARK = tokens(block(':root')), LIGHT = tokens(block('html[data-theme="light"]'));
  const colourish = v => /#[0-9a-f]{3,8}\b|rgba?\(/i.test(v);
  const missing = Object.keys(DARK).filter(k => colourish(DARK[k]) && !(k in LIGHT));
  chk(Object.keys(DARK).length > 15 && Object.keys(LIGHT).length > 15 && missing.length === 0 && /color-scheme:\s*light/.test(block('html[data-theme="light"]') || '') && /color-scheme:\s*dark/.test(block(':root') || '') && !!LIGHT['--gold-ink'],
    `light mode: the page's hub look has no light palette beside the dark one (each colour token of :root given its light value, --gold-ink for gold read as text, color-scheme light): missing ${missing.join(', ')}`);
  chk(!/prefers-color-scheme/.test(CSS), 'light mode: the hub look follows the system\'s colour scheme; dark is every visitor\'s default, light only by the switch');
  { const m = HTML.match(/<script>window\.THEME_FRAME_HEAD=("(?:[^"\\]|\\.)*");<\/script>/); let fh = '';
    try { fh = m ? JSON.parse(m[1]) : ''; } catch (e) { fh = ''; }
    chk(!!CSS && fh.includes('<style>' + CSS + '</style>') && fh.includes('html[data-theme="light"]{'), 'light mode: the framed tabs\' head (THEME_FRAME_HEAD) does not carry the page\'s hub look, light palette and all'); }
  /* the light palette's own pairs, from its tokens and the light rules' own colours (a tint laid over the
     surface it sits on): the inks on every surface; gold, the pick, the miss and the ice read as text on the
     surfaces and on their own tints; the text on a gold, ink, pick or rose fill; and the Deep Dive's tags */
  { const rgba = v => { v = String(v || '').trim(); let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (m) { const h = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(1); }
      m = v.match(/^rgba?\(([^)]*)\)$/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return p.length >= 3 ? [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] : null; };
    const lum = c => { const f = x => (x /= 255) <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const on = (tint, base) => { const t = rgba(tint), b = Array.isArray(base) ? base : rgba(base); if (!t || !b) return null; return t[3] >= 1 ? t : [0, 1, 2].map(i => t[i] * t[3] + b[i] * (1 - t[3])).concat(1); };
    const ratio = (fg, bg) => { const a = rgba(fg), b = Array.isArray(bg) ? bg : rgba(bg); if (!a || !b) return 0; return (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05); };
    const T = k => LIGHT[k], bad = [];
    const need = (fg, bg, what, min = 4.5) => { const r = ratio(fg, bg); if (!(r >= min)) bad.push(`${what} ${r.toFixed(2)}:1`); };
    for (const ink of ['--ink', '--ink-2', '--muted']) for (const s of ['--bg', '--bg-2', '--panel', '--panel-2', '--panel-3']) need(T(ink), T(s), `${ink} on ${s}`);
    for (const [ink, tint] of [['--gold-ink', '--gold-soft'], ['--pick', '--pick-soft'], ['--miss', '--miss-soft'], ['--ice', '--ice-soft']])
      for (const s of ['--bg', '--panel', '--panel-2', '--panel-3']) { need(T(ink), T(s), `${ink} on ${s}`); need(T(ink), on(T(tint), T(s)), `${ink} on ${tint} over ${s}`); }
    need('#1E2230', T('--gold'), 'a gold button\'s text'); need('#1E2230', T('--gold-2'), 'a gold button\'s text, hovered');
    for (const f of ['--ink', '--pick', '--rose']) need('#FFFFFF', T(f), `white text on ${f}`);
    for (const c of ['easy', 'fav', 'even', 'tough', 'vtough']) { const r = block(`html[data-theme="light"] #gsModal .dtag.${c}`) || '';
      const bg = (r.match(/background:([^;]+)/) || [])[1], fg = (r.match(/(?:^|;)color:([^;]+)/) || [])[1];
      if (!bg || !fg) bad.push(`the Deep Dive's ${c} tag has no light colours of its own`); else for (const s of ['--panel', '--panel-2']) need(fg, on(bg, T(s)), `the ${c} tag on the card`);
      if (c === 'even') { const ring = (r.match(/inset 0 0 0 [\d.]+px (#[0-9a-f]{3,6})/i) || [])[1]; for (const s of ['--panel', '--panel-2']) need(ring, T(s), 'the Even tag\'s ring on the card', 3); } }
    chk(bad.length === 0, 'light mode: the light palette has a pair under 4.5:1 (3:1 for the Even ring): ' + bad.join('; ')); }

  /* ---- a visitor with nothing stored: dark, the switch, a press each way ---- */
  const A = await run(STATE, URL0, null, false, { seed: w2 => { const P = w2.Storage.prototype, s = P.setItem; w2.__lmWrites = null;
    P.setItem = function (k, v) { if (w2.__lmWrites) w2.__lmWrites.push(k); return s.call(this, k, v); }; } });
  { const { w, d, errs } = A, root = d.documentElement, cs = () => w.getComputedStyle(root);
    const b = d.querySelector('header [data-theme-toggle]'), nav = d.getElementById('tabs');
    chk(!!b && b.tagName === 'BUTTON' && b.type === 'button' && !!b.closest('.hub-stamp') && !!nav && !!(b.compareDocumentPosition(nav) & w.Node.DOCUMENT_POSITION_FOLLOWING),
      'light mode: the header has no light/dark switch, a button in its stamp, before the tabs');
    if (b) {
      const st = w.getComputedStyle(b), svgs = [...b.querySelectorAll('svg')];
      chk(b.getAttribute('aria-label') === 'Light mode' && txt(b) === '' && svgs.length === 2 && svgs.every(s => s.getAttribute('aria-hidden') === 'true')
        && st.minHeight === '44px' && st.minWidth === '44px' && st.height === '44px' && st.width === '44px',
        `light mode: the switch is not a 44px button named Light mode with its glyphs hidden from a screen reader: ${b.getAttribute('aria-label')} ${st.minHeight}/${st.height} ${st.minWidth}/${st.width}`);
      const look = () => ({ attr: root.getAttribute('data-theme'), kept: w.localStorage.getItem(KEY), pressed: b.getAttribute('aria-pressed'), title: b.getAttribute('title'), bg: cs().getPropertyValue('--bg').trim() });
      const dark0 = look();
      chk((dark0.attr == null || dark0.attr === 'dark') && dark0.kept == null && dark0.pressed === 'false' && dark0.title === 'Switch to light mode' && dark0.bg.toUpperCase() === String(DARK['--bg']).toUpperCase(),
        'light mode: a visitor with nothing stored is not on the dark look, the switch not pressed: ' + JSON.stringify(dark0));
      /* a frame open before the press and one opened after it, as the page's frames() makes them (jsdom loads
         no srcdoc, so each frame's load is played on the blank document it does have) */
      const openFrame = async t => { [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === t).click(); await wait(60);
        const f = d.querySelector(`#tab-${t} iframe.pk-frame`); if (f && f.contentDocument && f.contentDocument.documentElement && !f.contentDocument.documentElement.style.overflowY) f.dispatchEvent(new w.Event('load')); return f; };
      const frameLook = f => f && f.contentDocument && f.contentDocument.documentElement ? f.contentDocument.documentElement.getAttribute('data-theme') : 'no document';
      const tagOf = f => ((f && f.getAttribute('srcdoc') || '').match(/^<!DOCTYPE html>\s*<html\b[^>]*>/i) || [''])[0];
      const f1 = await openFrame('ratings');
      chk(!!f1 && /data-theme="dark"/.test(tagOf(f1)) && frameLook(f1) === 'dark' && (f1.getAttribute('srcdoc') || '').includes('html[data-theme="light"]{'),
        `light mode: a frame made on the dark look is not given it, or its head lacks the light palette: ${tagOf(f1)} / ${frameLook(f1)}`);
      const press = () => { w.__lmWrites = []; let threw = null; try { b.click(); } catch (e) { threw = e; } const wr = w.__lmWrites; w.__lmWrites = null; return { wr, threw }; };
      const p1 = press(), light1 = look();
      chk(!p1.threw && light1.attr === 'light' && light1.kept === 'light' && light1.pressed === 'true' && light1.title === 'Switch to dark mode' && light1.bg.toUpperCase() === String(LIGHT['--bg']).toUpperCase() && frameLook(f1) === 'light',
        `light mode: a press does not put the page and its open frame on the light look, keep it and mark the switch pressed: ${JSON.stringify(light1)}, frame ${frameLook(f1)}`);
      chk(p1.wr.length === 1 && p1.wr[0] === KEY, 'light mode: a press wrote something besides ' + KEY + ': ' + JSON.stringify(p1.wr));
      const f2 = await openFrame('record');
      chk(!!f2 && /data-theme="light"/.test(tagOf(f2)) && frameLook(f2) === 'light', `light mode: a frame opened on the light look is not made in it: ${tagOf(f2)} / ${frameLook(f2)}`);
      const p2 = press(), dark1 = look();
      chk(!p2.threw && dark1.attr === 'dark' && dark1.kept === 'dark' && dark1.pressed === 'false' && dark1.title === 'Switch to light mode' && dark1.bg.toUpperCase() === String(DARK['--bg']).toUpperCase() && frameLook(f1) === 'dark' && frameLook(f2) === 'dark',
        `light mode: a second press does not put the page and both frames back on the dark look: ${JSON.stringify(dark1)}, frames ${frameLook(f1)} ${frameLook(f2)}`);
      chk(p2.wr.length === 1 && p2.wr[0] === KEY, 'light mode: the second press wrote something besides ' + KEY + ': ' + JSON.stringify(p2.wr));
      chk(!/nflhub_theme|data-theme/.test(w.localStorage.getItem(PROP_KEY) || '') && !/nflhub_theme|"theme"/.test(String(w.eval('JSON.stringify(S)'))), 'light mode: the look is kept in the prop model\'s state');
      /* another tab of the site switched (its write fires the storage event here only): this one follows, page
         and frames, and writes nothing; a key of its own left alone changes nothing */
      const other = (v, key) => { w.localStorage.setItem(KEY, v); w.__lmWrites = [];
        w.dispatchEvent(new w.StorageEvent('storage', { key: key == null ? KEY : key })); const wr = w.__lmWrites; w.__lmWrites = null;
        return { ...look(), f1: frameLook(f1), f2: frameLook(f2), wr }; };
      const oLight = other('light'), oStill = other('dark', 'props_press_v1'), oDark = other('dark');
      chk(oLight.attr === 'light' && oLight.pressed === 'true' && oLight.f1 === 'light' && oLight.f2 === 'light'
        && oStill.attr === 'light' && oStill.f1 === 'light'
        && oDark.attr === 'dark' && oDark.pressed === 'false' && oDark.f1 === 'dark' && oDark.f2 === 'dark'
        && ![oLight, oStill, oDark].some(o => o.wr.length),
        `light mode: a switch made in another tab is not followed here (page, switch and frames), another key moved it, or following wrote something: ${JSON.stringify([oLight, oStill, oDark])}`); }
    chk(errs.length === 0, 'light mode: the page threw: ' + errs.join('; ')); }
  A.w.close();

  /* ---- a reload with light kept: the head's script reads it before the body is parsed and puts the look on
     the page before anything is drawn ---- */
  const B = await run(STATE, URL0, null, false, { seed: w2 => { w2.localStorage.setItem(KEY, 'light');
    const P = w2.Storage.prototype, g = P.getItem, rec = w2.__lmOrder = [];
    P.getItem = function (k) { if (k === KEY && !w2.__lmMO) { rec.push(w2.document.body ? 'read after the body' : 'read'); const de = w2.document.documentElement;
        w2.__lmMO = new w2.MutationObserver(ms => { for (const m of ms) { if (m.type === 'attributes') rec.push('look ' + de.getAttribute('data-theme')); else for (const n of m.addedNodes) if (n.nodeName === 'BODY') rec.push('body'); } });
        w2.__lmMO.observe(de, { attributes: true, attributeFilter: ['data-theme'], childList: true }); }
      return g.call(this, k); }; } });
  { const { w, d, errs } = B, rec = w.__lmOrder || [], b = d.querySelector('[data-theme-toggle]');
    chk(rec[0] === 'read' && rec.indexOf('look light') > 0 && rec.indexOf('body') > rec.indexOf('look light'),
      'light mode: a reload with light kept does not put the light look on the page before its body is parsed: ' + rec.slice(0, 5).join(' > '));
    chk(d.documentElement.getAttribute('data-theme') === 'light' && !!b && b.getAttribute('aria-pressed') === 'true' && w.getComputedStyle(d.documentElement).getPropertyValue('--bg').trim().toUpperCase() === String(LIGHT['--bg']).toUpperCase(),
      'light mode: a reload with light kept is not on the light look, the switch pressed');
    [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'bets').click(); await wait(60);
    const f = d.querySelector('#tab-bets iframe.pk-frame');
    chk(!!f && /^<!DOCTYPE html>\s*<html\b[^>]*data-theme="light"/i.test(f.getAttribute('srcdoc') || ''), 'light mode: a frame opened after a reload in light is not made in it');
    chk(errs.length === 0, 'light mode: the page reloaded in light threw: ' + errs.join('; ')); }
  B.w.close();

  /* ---- storage that throws on the key, read and write: dark, a press still changes the look for the visit,
     and nothing is thrown ---- */
  const C = await run(STATE, URL0, null, false, { seed: w2 => { const P = w2.Storage.prototype, g = P.getItem, s = P.setItem;
    P.getItem = function (k) { if (k === KEY) throw new w2.DOMException('denied', 'SecurityError'); return g.call(this, k); };
    P.setItem = function (k, v) { if (k === KEY) throw new w2.DOMException('full', 'QuotaExceededError'); return s.call(this, k, v); }; } });
  { const { d, errs } = C, b = d.querySelector('[data-theme-toggle]'), a0 = d.documentElement.getAttribute('data-theme');
    let threw = null; try { if (b) b.click(); } catch (e) { threw = e; }
    chk(!!b && (a0 == null || a0 === 'dark') && !threw && d.documentElement.getAttribute('data-theme') === 'light' && b.getAttribute('aria-pressed') === 'true' && errs.length === 0,
      `light mode: storage that throws is not read as dark, or a press then throws or does nothing: ${a0} / ${d.documentElement.getAttribute('data-theme')} ${threw || ''} ${errs.join('; ')}`); }
  C.w.close();

  /* ---- the head's script on a page of its own: whatever the key holds but 'light' reads as dark, and a
     window whose storage cannot be reached at all reads as dark and switches all the same ---- */
  const mini = async beforeParse => { const errs = [];
    const dom = new JSDOM(`<!DOCTYPE html><html lang="en"><head><script>${TJS}</script></head><body><header><button type="button" data-theme-toggle aria-label="Light mode" aria-pressed="false"></button></header></body></html>`,
      { runScripts: 'dangerously', url: URL0, virtualConsole: new VirtualConsole(), beforeParse(w2) { w2.addEventListener('error', e => errs.push(e.message)); beforeParse(w2); } });
    await wait(30);                                 /* the switch is drawn once the document is parsed */
    return { w: dom.window, d: dom.window.document, errs }; };
  for (const v of ['light', 'Light', 'LIGHT', ' light', 'light ', 'dark', '', '1', 'true', '{"theme":"light"}', 'null']) {
    const M = await mini(w2 => w2.localStorage.setItem(KEY, v)), a = M.d.documentElement.getAttribute('data-theme'), want = v === 'light' ? 'light' : null;
    chk(a === want && M.d.querySelector('button').getAttribute('aria-pressed') === String(v === 'light') && M.errs.length === 0,
      `light mode: a kept ${JSON.stringify(v)} reads as ${a || 'dark'}, not ${want || 'dark'}${M.errs.length ? ', and threw ' + M.errs.join('; ') : ''}`);
    M.w.close(); }
  { const M = await mini(w2 => Object.defineProperty(w2, 'localStorage', { configurable: true, get() { throw new w2.DOMException('denied', 'SecurityError'); } }));
    const a0 = M.d.documentElement.getAttribute('data-theme'); let threw = null; try { M.d.querySelector('button').click(); } catch (e) { threw = e; }
    chk(a0 == null && !threw && M.d.documentElement.getAttribute('data-theme') === 'light' && M.errs.length === 0,
      `light mode: a window whose storage cannot be reached does not read as dark and switch without throwing: ${a0} / ${M.d.documentElement.getAttribute('data-theme')} ${threw || ''} ${M.errs.join('; ')}`);
    M.w.close(); }
  console.log(`light mode: ${checks - c0} checks, ${fails.length - f0} failures`);
}

/* =====================================================================================
   THE MATCHUP BUBBLE (nflbets/build/glance.js and the props parts' glanceName, app v114; the owner's call of 17
   October 2026: "in the parlay builder, when i click on a player or a team, bring up a bubble pop up where it shows
   their matchup for the day so i can see info at a glance"). Blocking, all of it. Every name on a leg the Parlay
   Builder tab and Suggested Parlays draw (a row of the Top 50 lines, a leg of the builder, a leg on a set's level card
   and on an Elo pick's card) is one button of its leg's kind and id (p:<pid> for a player's line, t:<ABBR> for a team's
   moneyline or spread, g:<gid> for a game total), in its leg's game, keeping its row's own leg, named for what it
   opens, its tap target 44px tall and taken back out of the line (min-height 44px over 14px of padding a side, the
   same negative margin, on top of the line under it). A click opens one bubble, a dialog (not modal) labelled by its
   heading, the focus moved into it, holding exactly the numbers the files hold, each worked out here on the smoke's
   own reading of players.json, matchups.json, model.json, state.json and the payload, never the bubble's code: a
   player's season Elo, its tier and shield, his rank at his position (and prov.), his status, the game (home or away,
   the opponent, the kickoff in ET), the defense he faces (model.json's units table for his side of the ball, by the
   smoke's own map: a quarterback the opponent's Overall Defense, a back its Run Defense, a receiver or tight end its
   Pass Defense; named and ranked as the file has it, and the rank the ELO Ratings tab's own table draws for that club,
   read off the tab), his mismatch's grade and edge where he has one with no rank of its own, each trusted stat's
   recent form and projection, and the leg's line, price, the model's chance, the book's fair chance, market + form and
   the Elo matchup's chance; a team's or a game's two records as Team Rankings counts them, the line as the board reads
   it, each club's Power Rating and rank, Overall Offense against Overall Defense each way, every model's pick and its
   chance, the leg's team marked "this leg" and, on a moneyline alone, each model picking it to win ticked. Escape,
   Close, a click outside and another name close it, the focus back on the name (another name's own bubble taking
   its place), Tab stays inside it, Open game snapshot opens that game's window and closing it gives the name the
   focus back, and nothing is written to the browser's storage. On the week as it stands wherever the page draws a
   name (each place drawing a leg once), and at any hour, the off-season included, on fixtures of its own: a level card
   drawn by the page's own pbTierCard with a real player's line, his game's team (to win and to cover) and total, and
   a made-up player with no Elo row and a team bet on a made-up game with no line; the builder holding those two
   made-up legs; a status planted on the real player, Out and then questionable; the page drawing its rows again while
   a bubble is open (renderParlay with the same leg drawn earlier in the page, renderSp with one leg on two levels of a
   set and an Elo pick's level of the same id, a builder leg's price moved, the leg taken out of the builder): bound to
   the same place's copy, marked open, its focus and toggle there, and closed with the focus on its neighbour when the
   leg is gone; the reader's scroll in the bubble kept through a redraw and a resize, as a bubble and as the sheet a short
   screen falls back to (jsdom lays nothing out: the browser's rule, a measure with the max-height cleared taking the
   scroll to the top, is stood in on the bubble alone); a player the ratings file rates on the other side of the ball
   from his leg (Travis Hunter, a defensive back there, on a receiving line) set against the defense his leg faces, his
   rank kept at his rated position; a club yet to play this season marked carried from last season on the Faces line;
   and a builder row whose stored price is not the one it shows (a ladder rung at the book's price now), its market +
   form and Elo matchup on the price shown, as the bubble's.
   ===================================================================================== */
async function glanceChecks() {
  const c0 = checks, f0 = fails.length;
  const Pl = JSON.parse(ELO_P), MO = JSON.parse(ELO_M), MU = JSON.parse(ELO_MU);
  const R = await run(STATE);
  const { w, d, errs } = R;
  try { await w.eloFiles(); } catch (e) {}
  await wait(300);
  const S = w.eval('S'), TN = w.eval('TEAM_NAMES'), fo = fairRule(w), legPrice = w.eval('legPrice'), legKey = w.eval('legKey');
  const box = () => d.getElementById('glanceBox'), shown = () => { const b = box(); return !!b && !b.hidden; };
  const nOf = k => { const b = box(), e = b && b.querySelector(`[data-glance-n="${k}"]`); return e ? txt(e) : null; };
  /* a whole per cent shown against a chance worked out here (the page's normal curve and the smoke's agree to 1e-7) */
  const near = (s, p) => { const m = /^(\d+)%/.exec(s || ''); return !!m && p != null && Math.abs(+m[1] - p * 100) <= 0.5 + 1e-4; };
  /* ---- the smoke's own readings ---- */
  const ordOwn = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
  const decOwn = x => Math.abs(x) >= 10 ? x.toFixed(0) : x.toFixed(1);
  const pxOwn = v => v == null ? '–' : (v > 0 ? '+' + v : '' + v);
  const estOwn = src => src === 'dkline' || src === 'est' ? ' est.' : src === 'fair' ? ' fair' : '';
  const mlOwn = x => x == null || !isFinite(x) || !+x ? null : (+x > 0 ? '+' : '−') + Math.abs(Math.round(+x));
  const impOwn = x => x < 0 ? -x / (-x + 100) : 100 / (x + 100);
  const kickOwn = (dd, t) => { if (!dd) return ''; const day = new Date(dd + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return day; const h = +m[1]; return `${day} · ${(h % 12) || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'} ET`; };
  const TIERS = [['HOF', 1750], ['Elite', 1700], ['Master', 1650], ['Diamond', 1600], ['Platinum', 1550], ['Gold', 1500], ['Silver', 1450], ['Bronze', 1400], ['Iron', 1350]];
  const tierOwn = e => (TIERS.find(([, lo]) => e >= lo) || ['Wood'])[0];
  const trustOwn = (g, st) => { const r = MU.record && MU.record[g + '|' + st], p = r && r.past; return !!p && p.rmse_elo < p.rmse_form && p.right_top >= 0.53; };
  const LBL = { passing_yards: 'Pass yds', passing_tds: 'Pass TD', attempts: 'Att', completions: 'Comp', passing_interceptions: 'INT', rushing_yards: 'Rush yds', carries: 'Carries',
    receptions: 'Rec', receiving_yards: 'Rec yds', targets: 'Tgt', scrim_yards: 'Rush+rec', any_td: 'TDs' };
  /* the Mismatches' units: the secondary and the line for a quarterback, the secondary for a receiver or tight end, the
     line and the linebackers for a back (the matchup formula's player ratings, matchups.json), for the grade alone */
  const MM_OWN = { QB: [['DB', 'DL'], 'pass defense'], WR: [['DB'], 'pass defense'], TE: [['DB'], 'pass defense'], RB: [['DL', 'LB'], 'run defense'] };
  const uval = (g, x) => MM_OWN[g][0].reduce((a, k) => a + x[k], 0) / MM_OWN[g][0].length;
  /* the defense a player faces: model.json's units table the Game snapshot's position matchups set against his side of
     the ball (the smoke's own map: a quarterback the opponent's Overall Defense, a back its Run Defense, a receiver or
     tight end its Pass Defense), only once a team has a rating and where the file names the table; its name as the
     tab names it, the club's rank in it, out of the clubs it lists, and carried as the file has it */
  const FACE_OWN = { QB: 'def', RB: 'run_def', WR: 'pass_def', TE: 'pass_def' };
  const faceOwn = (grp, opp) => { const U = MO.units, key = FACE_OWN[grp];
    if (!key || !opp || !U || !U.off || !U.def || !Object.values(U.off).some(v => v.games || v.carried)) return null;
    const T = U[key], meta = key === 'def' ? null : U.tables && U.tables[key];
    if (!T || typeof T !== 'object' || (key !== 'def' && !(meta && meta.label))) return null;
    const v = T[opp]; if (!v || v.rank == null) return null;
    const pr = U.params || {}, from = pr.carry && pr.carry_from != null ? pr.carry_from : null;
    return { key, name: key === 'def' ? 'Overall Defense' : String(meta.label), rank: v.rank, n: Object.keys(T).length, carried: !!v.carried && from != null, from }; };
  /* and the rank the ELO Ratings tab's own table draws for each club (its pill pressed, its # column read off the rows),
     with the table's heading, so the bubble can never say one rank and the tab another */
  const TAB_RANK = {};
  { const body = d.getElementById('peBody'), was = body && body.querySelector('.pe-pos [aria-selected="true"]');
    for (const key of [...new Set(Object.values(FACE_OWN))]) { const pill = body && body.querySelector(`.pe-pos button[data-unit="${key}"]`); if (!pill) continue;
      pill.click(); await wait(20); const card = d.getElementById('peUnits'); if (!card) continue;
      const rows = {}; for (const tr of card.querySelectorAll('tbody tr.pe-tmrow')) rows[tr.dataset.team] = +txt(tr.querySelector('td.pe-rank'));
      TAB_RANK[key] = { name: txt(card.querySelector('h2')).replace(/\s*\d{4}\b.*$/, '').trim(), rows }; }
    const back = was && (was.dataset.pos ? body.querySelector(`.pe-pos button[data-pos="${was.dataset.pos}"]`) : body.querySelector(`.pe-pos button[data-unit="${was.dataset.unit}"]`));
    if (back) { back.click(); await wait(20); } }
  const startedOwn = gid => { const r = S.sched.find(x => x.id === gid); return !!r && isFinite(etKick(r)) && w.Date.now() >= etKick(r); };
  const outOwn = pid => !!((S.inactive && S.inactive[pid]) || (MU.out && MU.out[pid]));
  /* his mismatch: his Elo above his position's norm and the unit he faces below the league's, in standard deviations,
     among the expected starters still to play and not ruled out; graded Huge from 3, Big from 2, Solid from 1 */
  const mmOwn = (pid, gid) => {
    const L = MU.league || {}, P = Object.entries(MU.players || {}).map(([id, v]) => ({ id, ...v })).filter(v => MM_OWN[v.group] && !outOwn(v.id) && !startedOwn(v.game_id));
    const v = P.find(x => x.id === pid && x.game_id === gid); if (!v) return null;
    const zs = a => { const m = a.reduce((s, x) => s + x, 0) / a.length, sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)) || 1; return x => (x - m) / sd; };
    const n = L.norms && L.norms[v.group]; let pz;
    if (n) pz = x => (x - n[0]) / (n[1] || 1); else { const grp = P.filter(x => x.group === v.group); if (grp.length < 2) return null; pz = zs(grp.map(x => x.elo)); }
    const by = {}; for (const x of P) by[x.opp] = x.opp_def; if (L.defs) Object.assign(by, L.defs);
    const a = pz(v.elo), b = zs(Object.values(by).map(x => uval(v.group, x)))(uval(v.group, v.opp_def)); if (!(a > 0 && b < 0)) return null;
    const s = a - b, x = Math.round(s * 10) / 10; return { score: s, grade: x >= 3 ? 'Huge' : x >= 2 ? 'Big' : x >= 1 ? 'Solid' : 'Slight' }; };
  /* market + form: the book's chance moved by his career Elo on the side of the bet (the rule in tab_elo.html, worked here) */
  const ALT_OWN = { c: -0.05, book: 0.8, form: 0.3, step: 40, fitSd: { QB: 34.1, RB: 21.3, WR: 27.6, TE: 27.0 } };
  const sdOwn = {}; { const by = {}; for (const e of Object.values(Pl.players || {})) if (e && e.group && isFinite(e.elo)) (by[e.group] = by[e.group] || []).push(e.elo);
    for (const g in by) { const v = by[g], m = v.reduce((a, x) => a + x, 0) / v.length; if (v.length >= 10) sdOwn[g] = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length); } }
  const lgt = p => Math.log(p / (1 - p)), sgm = x => 1 / (1 + Math.exp(-x));
  const mfOwn = (l, price, src) => {
    if (!l.pid || String(l.pid).startsWith('team:') || l.pid === 'game' || !(src === 'real' || src === 'dkline') || price == null || !isFinite(price)) return null;
    const e = Pl.players[l.pid], grp = (e && e.group) || ((S.players[l.pid] || {}).grp) || null; if (l.stat === 'any_td' && grp === 'QB') return null;
    const imp = impOwn(price); if (!(imp > 0 && imp < 1)) return null;
    const z = e ? (e.elo - 1500) / ALT_OWN.step * (ALT_OWN.fitSd[e.group] && sdOwn[e.group] > 0 ? ALT_OWN.fitSd[e.group] / sdOwn[e.group] : 1) : 0;
    return sgm(ALT_OWN.c + ALT_OWN.book * lgt(imp) + ALT_OWN.form * z * (l.side === 'under' ? -1 : 1)); };
  /* the Elo matchup's chance: the book's with a 4.5% margin out, moved by the trusted nudge in the stat's typical miss */
  const muOwn = (l, price) => { const v = MU.players && MU.players[l.pid]; if (!v || !v.stats || !v.stats[l.stat] || !trustOwn(v.group, l.stat) || price == null || !isFinite(price)) return null;
    const f = MU.fit && MU.fit[v.group + '|' + l.stat]; if (!f || !(f.sd > 0)) return null;
    const fair = Math.min(0.99, Math.max(0.01, impOwn(price) / 1.045)); return PhiOwn(invPhiOwn(fair) + (l.side === 'under' ? -1 : 1) * v.stats[l.stat][2] / f.sd); };
  /* a team's record as Team Rankings counts it: the regular season's finals, or the ratings file's where it has more */
  const recOwn = (t, sched = STATE.schedule) => { const reg = g => g.game_type ? g.game_type === 'REG' : +g.week <= 18, r = [0, 0, 0]; let n = 0;
    for (const g of sched) if (g.result != null && (g.home_team === t || g.away_team === t) && reg(g)) { n++; const m = g.home_team === t ? g.result : -g.result; r[m > 0 ? 0 : m < 0 ? 1 : 2]++; }
    const f = (MO.teams && MO.teams[t] && MO.teams[t].record) || [0, 0, 0], x = n >= f[0] + f[1] + f[2] ? r : f; return x[0] + '-' + x[1] + (x[2] ? '-' + x[2] : ''); };
  const prRank = t => Object.entries(MO.teams || {}).sort((x, y) => y[1].elo - x[1].elo).findIndex(x => x[0] === t) + 1;
  /* every model's call as the Game snapshot reads it: Vegas (the moneylines with the margin out, else the spread), Alpha
     (graded, else frozen at kickoff), the Joker, the ELO Model (graded, else this season's next) */
  const callsOwn = g => { const gid = g.game_id, pr = (STATE.processed || {})[gid], ak = (STATE.atKickoff || {})[gid], one = x => x && x.pick ? { pick: x.pick, pHome: x.pHome != null ? +x.pHome : null } : null;
    const o = (STATE.odds || {})[gid], sp = g.spread_line != null && isFinite(g.spread_line) ? +g.spread_line : null; let vh = null;
    if (o && isFinite(o.home) && isFinite(o.away) && o.home && o.away) { const hh = impOwn(+o.home), aa = impOwn(+o.away); vh = hh / (hh + aa); } else if (sp != null && sp !== 0) vh = PhiOwn(sp / 13.5);
    const eg = (MO.graded || []).find(x => x.game_id === gid), en = !eg && MO.next && +MO.next.season === +STATE.season ? (MO.next.games || []).find(x => x.game_id === gid) : null;
    return { vegas: vh == null ? null : { pick: vh >= 0.5 ? g.home_team : g.away_team, p: Math.max(vh, 1 - vh) }, alpha: pr ? one(pr) : one(ak),
      joker: one(pr && pr.joker) || one((STATE.joker || {})[gid]), elo: eg ? { pick: eg.pick, pHome: eg.p_home } : en ? { pick: en.pick, pHome: en.p_home } : null }; };
  const chOwn = (x, g) => x.p != null ? x.p : x.pHome != null ? (x.pick === g.home_team ? x.pHome : 1 - x.pHome) : null;

  /* ---- a name: one button of its leg's kind and id, keeping its row's leg, named, 44px ---- */
  const kindOf = key => { const [gid, pid, stat] = String(key).split('|'); return pid === 'game' && stat === 'total' ? ['g', gid, gid] : /^team:/.test(pid) ? ['t', pid.slice(5), gid] : ['p', pid, gid]; };
  const WHAT = { p: 'his matchup', t: 'the team’s matchup', g: 'the game’s matchup' };
  const nameOwn = (kind, id, gid, leg) => { if (kind === 't') return TN[id] || id;
    if (kind === 'g') { const r = S.sched.find(x => x.id === gid); return r ? `${TN[r.a] || r.a} at ${TN[r.h] || r.h}` : null; }
    return S.players[id] ? S.players[id].n : leg && leg.name; };
  const tapOk = b => { const cs = w.getComputedStyle(b);
    return cs.minHeight === '44px' && cs.boxSizing === 'border-box' && cs.paddingTop === '14px' && cs.paddingBottom === '14px' && cs.marginTop === '-14px' && cs.marginBottom === '-14px'
      && cs.display === 'inline-block' && cs.position === 'relative' && cs.zIndex === '1'; };
  const nameBad = (row, key, side, k) => {
    const bs = row ? [...row.querySelectorAll('[data-glance]')] : [], b = bs[0], [kind, id, gid] = kindOf(key);
    if (bs.length !== 1 || b.tagName !== 'BUTTON' || b.getAttribute('type') !== 'button' || !b.classList.contains('glance-name')) return `${key}: ${bs.length} names drawn as the bubble's button, not one`;
    const K = w.glanceLeg(b.dataset.glanceLeg), nm = nameOwn(kind, id, gid, K && K.leg);
    if (b.dataset.glance !== `${kind}:${id}` || b.dataset.glanceGame !== gid) return `${key}: data-glance ${b.dataset.glance} in ${b.dataset.glanceGame}, not ${kind}:${id} in ${gid}`;
    if (!K || K.leg.key !== key || (K.leg.side || 'over') !== (side || 'over') || +K.leg.k !== +k) return `${key}: the leg it keeps is not its row's (${K ? [K.leg.key, K.leg.side, K.leg.k].join(' ') : 'none'})`;
    if (b.getAttribute('aria-haspopup') !== 'dialog' || b.getAttribute('aria-label') !== `${nm}: ${WHAT[kind]}` || txt(b) !== nm) return `${key}: named "${b.getAttribute('aria-label')}", reads "${txt(b)}", for ${nm}`;
    if (!tapOk(b)) return `${key}: its tap target is not 44px tall and taken back out of the line`;
    return ''; };

  /* ---- what one bubble holds, against the smoke's own reading ---- */
  const legBad = (kind, K, wantPrice, wantSrc) => {
    const bad = [], l = K.leg, B = box(), lb = B && B.querySelector('[data-glance-legbox]');
    if (!lb) return ['no leg in the bubble'];
    if (K.price !== wantPrice || (K.src || '') !== (wantSrc || '')) bad.push(`the leg is kept at ${K.price} ${K.src}, not the ${wantPrice} ${wantSrc} its row shows`);
    if (nOf('label') !== l.label) bad.push(`line ${nOf('label')}, not ${l.label}`);
    if (nOf('price') !== pxOwn(wantPrice) + estOwn(wantSrc)) bad.push(`price ${nOf('price')}, not ${pxOwn(wantPrice) + estOwn(wantSrc)}`);
    if (nOf('model') !== (l.p * 100).toFixed(0) + '%') bad.push(`model ${nOf('model')}, not ${(l.p * 100).toFixed(0)}%`);
    const f = fo(l), fw = f && f.p != null ? (f.p * 100).toFixed(0) + '%' + (f.est ? ' est.' : '') : 'none';
    if (nOf('fair') !== fw) bad.push(`fair ${nOf('fair')}, not ${fw}`);
    /* a player the page has ruled out shows no Elo matchup: his bubble says he has none to show */
    const mf = kind === 'p' ? mfOwn(l, wantPrice, wantSrc) : null, mu = kind === 'p' && !(typeof w.eloRuledOut === 'function' && w.eloRuledOut(l.pid)) ? muOwn(l, wantPrice) : null;
    if (mf == null ? nOf('mf') !== null : !near(nOf('mf'), mf)) bad.push(`market + form ${nOf('mf')}, not ${mf == null ? 'none' : (mf * 100).toFixed(2)}`);
    if (mu == null ? nOf('mu') !== null : !near(nOf('mu'), mu)) bad.push(`Elo matchup ${nOf('mu')}, not ${mu == null ? 'none' : (mu * 100).toFixed(2)}`);
    return bad; };
  const playerBad = (pid, gid, K) => {
    const bad = [], l = K && K.leg, e = Pl.players[pid], sp = S.players[pid] || null, r = S.sched.find(x => x.id === gid) || null, B = box();
    const name = sp ? sp.n : l.name, team = (l && l.team) || (sp && sp.team) || '', pos = (l && l.pos) || (sp && sp.pos) || '';
    if (txt(d.getElementById('glanceTitle')) !== name) bad.push(`headed ${txt(d.getElementById('glanceTitle'))}, not ${name}`);
    if (nOf('pos') !== pos || nOf('team') !== (team || null)) bad.push(`${nOf('pos')} · ${nOf('team')}, not ${pos} · ${team}`);
    /* his status: the tag the page wears beside his name (the report and the roster as the page reads them), else the matchups file's out */
    const it = w.injTag ? w.injTag(pid) : w.eval('injTag')(pid), ow = MU.out && MU.out[pid] || null;
    const wantInj = it ? it.t : ow ? 'OUT' : null, why = B.querySelector('.glance-why');
    if (nOf('inj') !== wantInj || (wantInj && txt(why) !== (it ? it.title : ow))) bad.push(`status ${nOf('inj')} (${txt(why)}), not ${wantInj} (${it ? it.title : ow})`);
    if (e && e.se != null) { const gx = Pl.groups[e.group], row = gx && (gx.top || []).find(x => x.id === pid), sh = B.querySelector('.glance-sh'), want = d.createElement('span'); want.innerHTML = w.pkTierBadge(e.se);
      if (nOf('se') !== String(e.se) || nOf('tier') !== tierOwn(e.se) || !sh || sh.innerHTML !== want.innerHTML) bad.push(`Elo ${nOf('se')} ${nOf('tier')}, not ${e.se} ${tierOwn(e.se)} with its shield`);
      if (e.rank && (nOf('rank') !== '#' + e.rank || nOf('of') !== String(gx.active) || (nOf('prov') === 'prov.') !== !!(row && row.prov))) bad.push(`rank ${nOf('rank')} of ${nOf('of')} ${nOf('prov') || ''}, not #${e.rank} of ${gx.active}${row && row.prov ? ' prov.' : ''}`); }
    else { const sd = Object.values(Pl.groups || {}).flatMap(x => x.sidelined || []).find(x => x.id === pid), want = sd ? 'not ranked: ' + sd.why : 'no Elo rating this season';
      if (nOf('noelo') !== want || nOf('se') !== null) bad.push(`no Elo row said "${nOf('noelo')}", not "${want}"`); }
    const opp = r ? (team === r.h ? r.a : team === r.a ? r.h : null) : null;
    if (r) { if ((opp && (nOf('ha') !== (team === r.h ? 'vs' : 'at') || nOf('opp') !== opp)) || nOf('kick') !== kickOwn(r.d, r.t)) bad.push(`game ${nOf('ha')} ${nOf('opp')} ${nOf('kick')}, not ${team === r.h ? 'vs' : 'at'} ${opp} ${kickOwn(r.d, r.t)}`); }
    /* the defense he faces: model.json's table for his side of the ball, the leg's (a receiving line is an offense's,
       whatever position the ratings file rates him at: Travis Hunter, a defensive back there, has receiving lines),
       named and ranked as the file has it, and the rank the ELO Ratings tab's own table draws for that club; none for
       a kicker or with no such table */
    { const grp = (l && l.grp) || (sp && sp.grp) || (e && e.group) || '', fw = faceOwn(grp, opp), tb = fw && TAB_RANK[fw.key], tr = tb ? tb.rows[opp] : undefined;
      if (!fw) { if (nOf('unit') !== null || B.querySelector('[data-glance-faces]')) bad.push(`a Faces line (${nOf('uclub')} ${nOf('unit')} ${nOf('urank')}) where a ${grp || 'player of no position'} faces no table of the file's`); }
      else {
        if (nOf('unit') !== fw.name || nOf('uclub') !== opp || nOf('urank') !== ordOwn(fw.rank) || nOf('uof') !== String(fw.n) || (fw.carried ? nOf('ucarry') !== `carried from ${fw.from}` : nOf('ucarry') !== null)
          || (B.querySelector('[data-glance-faces]') || { dataset: {} }).dataset.glanceFaces !== fw.key)
          bad.push(`faces ${nOf('uclub')} ${nOf('unit')} ${nOf('urank')} of ${nOf('uof')}${nOf('ucarry') ? ' ' + nOf('ucarry') : ''}, not ${opp} ${fw.name} ${ordOwn(fw.rank)} of ${fw.n}${fw.carried ? ' carried from ' + fw.from : ''}`);
        if (!tb || tr == null || nOf('urank') !== ordOwn(tr) || nOf('unit') !== tb.name) bad.push(`faces ${opp} ${nOf('unit')} ${nOf('urank')}, where the ELO Ratings tab's own table draws ${tb ? `${tb.name}: ${opp} ${tr == null ? 'not ranked' : ordOwn(tr)}` : 'no such table'}`); }
      /* one rank for one defense: the mismatch line ranks nothing, and the bubble says "ranked" once at most */
      const ml = B.querySelector('[data-glance-mm] dd');
      if (ml && (/\b\d+(st|nd|rd|th)\b|ranked/i.test(txt(ml)) || /\b\d+(st|nd|rd|th)\b|ranked/i.test(ml.title || ''))) bad.push(`the mismatch line states a rank of its own: "${txt(ml)}" (${ml.title})`);
      if ((txt(B).match(/ranked \d+(st|nd|rd|th)\b/g) || []).length > (fw ? 1 : 0)) bad.push(`the bubble ranks a defense more than once: "${txt(B).slice(0, 300)}"`); }
    const v = MU.players && MU.players[pid];
    if (!v || v.game_id !== gid || outOwn(pid)) { if (nOf('nomu') === null || B.querySelector('tr[data-glance-stat]') || nOf('mm') !== null) bad.push('a matchup drawn where the file has none for this game, or no line saying so'); }
    else {
      const m = mmOwn(pid, gid);
      if (m ? nOf('mm') !== m.grade || nOf('gap') !== m.score.toFixed(1) : nOf('mm') !== null) bad.push(`mismatch ${nOf('mm')} ${nOf('gap')}, not ${m ? m.grade + ' ' + m.score.toFixed(1) : 'none'}`);
      const sts = (MU.stats && MU.stats[v.group] || Object.keys(v.stats || {})).filter(s => v.stats && v.stats[s] && trustOwn(v.group, s)), rows = [...B.querySelectorAll('tr[data-glance-stat]')];
      if (rows.map(x => x.dataset.glanceStat).join() !== sts.join()) bad.push(`trusted stats ${rows.map(x => x.dataset.glanceStat).join()}, not ${sts.join()}`);
      else rows.forEach((tr, i) => { const a = v.stats[sts[i]], f = tr.querySelector('[data-glance-n="form"]'), p = tr.querySelector('[data-glance-n="proj"]');
        if (txt(tr.querySelector('th')) !== (LBL[sts[i]] || sts[i]) || txt(f) !== decOwn(a[0]) || txt(p) !== decOwn(a[1])) bad.push(`${sts[i]}: ${txt(tr)}, not ${decOwn(a[0])} -> ${decOwn(a[1])}`); });
      if (!sts.length && nOf('notrust') === null) bad.push('no trusted stat and no line saying so'); }
    return bad; };
  const teamBad = (gid, me, stat) => {
    const bad = [], g = STATE.schedule.find(x => x.game_id === gid), r = S.sched.find(x => x.id === gid), B = box(), toWin = !!me && stat === 'ml';
    if (/your bet/i.test(txt(B))) bad.push('it still says "your bet"');
    const a = g ? g.away_team : r.a, h = g ? g.home_team : r.h, neutral = !!g && (g.location === 'Neutral' || g.gametime === '09:30');
    const head = `${TN[a] || a} ${neutral ? 'vs' : 'at'} ${TN[h] || h}`;
    if (txt(d.getElementById('glanceTitle')) !== head) bad.push(`headed ${txt(d.getElementById('glanceTitle'))}, not ${head}`);
    if (nOf('kick') !== kickOwn(g ? g.gameday : r.d, g ? g.gametime : r.t)) bad.push(`kickoff ${nOf('kick')}`);
    const ths = [...B.querySelectorAll('th[data-glance-team]')];
    if (ths.map(x => x.dataset.glanceTeam).join() !== [a, h].join() || ths.some(x => x.classList.contains('glance-me') !== (x.dataset.glanceTeam === me) || !!x.querySelector('.glance-mine') !== (x.dataset.glanceTeam === me)) || (me && txt(ths.find(x => x.dataset.glanceTeam === me).querySelector('.glance-mine')) !== 'this leg'))
      bad.push(`the clubs ${ths.map(x => x.dataset.glanceTeam + (x.classList.contains('glance-me') ? '*' : '')).join()}, not ${a},${h} with ${me || 'none'} marked`);
    for (const t of [a, h]) if (nOf('rec:' + t) !== recOwn(t)) bad.push(`${t} record ${nOf('rec:' + t)}, not ${recOwn(t)}`);
    if (MO.teams && MO.teams[a] && MO.teams[h]) { for (const t of [a, h]) if (nOf('pr:' + t) !== String(MO.teams[t].elo) || nOf('prk:' + t) !== '#' + prRank(t)) bad.push(`${t} Power Rating ${nOf('pr:' + t)} ${nOf('prk:' + t)}, not ${MO.teams[t].elo} #${prRank(t)}`); }
    else if (nOf('nopr') === null || nOf('pr:' + a) !== null) bad.push('a Power Rating drawn for a club the file has none for, or no line saying so');
    /* the line the leg stands on: the prop model's own row (its spread, total and moneylines, which the leg, the Top 50
       and the Game bets card are priced on), DraftKings' named so; the board's (state.json's spread and total, the
       closing moneylines) only for a game the prop model has no row for (18 October 2026: the board's line sat beside
       a leg on another number) */
    { const fin = v => v != null && isFinite(v) ? +v : null;
      const sp = r ? fin(r.sp) : g ? fin(g.spread_line) : null, tot = r ? fin(r.tot) : g ? fin(g.total_line) : null;
      const o = !r && g ? (STATE.odds || {})[gid] : null, mA = r ? mlOwn(r.mla) : o ? mlOwn(o.away) : null, mH = r ? mlOwn(r.mlh) : o ? mlOwn(o.home) : null;
      const spT = sp == null ? null : sp > 0 ? `${h} −${sp}` : sp < 0 ? `${a} −${-sp}` : 'Pick\'em', mlT = mA || mH ? `${a} ${mA || '–'} / ${h} ${mH || '–'}` : null;
      const any = !!spT || tot != null || !!mlT, src = r && r.ls === 'dk' && any ? 'DraftKings' : null;
      if (nOf('spread') !== spT || nOf('total') !== (tot == null ? null : String(tot)) || nOf('ml') !== mlT || (nOf('noline') !== null) !== !any || nOf('lsrc') !== src)
        bad.push(`line ${nOf('spread')} / ${nOf('total')} / ${nOf('ml')} / ${nOf('noline')} (${nOf('lsrc') || 'no source'}), not the leg's own ${spT} / ${tot} / ${mlT} (${src || 'no source'})`); }
    /* Overall Offense against Overall Defense, each way */
    { const U = MO.units, on = !!U && !!U.off && Object.values(U.off).some(v => v.games || v.carried);
      for (const [o, df] of [[a, h], [h, a]]) { const li = B.querySelector(`[data-glance-poss="${o}-${df}"]`), vo = on && U.off[o], vd = on && U.def[df];
        if (!vo || !vd) { if (li) bad.push(`${o} offense against ${df} defense drawn with no unit rating`); continue; }
        const got = li ? ['oelo', 'ork', 'delo', 'drk'].map(k => txt(li.querySelector(`[data-glance-n="${k}"]`))).join(' ') : 'none', want = [vo.elo, ordOwn(vo.rank), vd.elo, ordOwn(vd.rank)].join(' ');
        if (got !== want) bad.push(`${o} offense against ${df} defense ${got}, not ${want}`); } }
    /* every model's pick, the clicked team's side marked */
    if (g) { const C = callsOwn(g);
      for (const id of ['vegas', 'alpha', 'joker', 'elo']) { const li = B.querySelector(`[data-glance-model="${id}"]`), x = C[id], ok = x && (x.pick === a || x.pick === h);
        if (!li) { bad.push(`no ${id} line`); continue; }
        if (!ok) { if (li.dataset.pick || nOf('p:' + id) !== null) bad.push(`${id} drawn with a pick the files do not have`); continue; }
        const p = chOwn(x, g);
        const tick = toWin && x.pick === me;
        if (li.dataset.pick !== x.pick || !(p == null ? nOf('p:' + id) === '–' : near(nOf('p:' + id), p)) || li.classList.contains('glance-with') !== tick || !!li.querySelector('.glance-chk') !== tick)
          bad.push(`${id} ${li.dataset.pick} ${nOf('p:' + id)}${li.querySelector('.glance-chk') ? ' ticked' : ''}, not ${x.pick} ${p == null ? '-' : (p * 100).toFixed(2)}${tick ? ' ticked' : ''} (a ${stat || 'leg'} on ${me || 'no team'})`); } }
    else if (B.querySelector('[data-glance-model]')) bad.push('model picks drawn for a game the board does not have');
    return bad; };
  const bubbleBad = (btn, wantPrice, wantSrc) => {
    const bad = [], B = box(), K = w.glanceLeg(btn.dataset.glanceLeg), [kind, id] = [btn.dataset.glance.slice(0, 1), btn.dataset.glance.slice(2)], gid = btn.dataset.glanceGame;
    if (d.querySelectorAll('#glanceBox').length !== 1 || !shown()) return ['no bubble, or more than one'];
    const hd = d.getElementById('glanceTitle');
    if (B.getAttribute('role') !== 'dialog' || B.getAttribute('aria-modal') !== 'false' || B.getAttribute('aria-labelledby') !== 'glanceTitle' || !hd || !B.contains(hd) || B.dataset.glanceOf !== btn.dataset.glance || B.dataset.glanceGame !== gid)
      bad.push('not a dialog labelled by its heading, for this name');
    if (!B.contains(d.activeElement)) bad.push('the focus is not in it');
    if (btn.getAttribute('aria-expanded') !== 'true') bad.push('its name does not say it is open');
    const xb = B.querySelector('button[data-glance-close]'); if (!xb || txt(xb) !== 'Close' || w.getComputedStyle(xb).minHeight !== '44px') bad.push('no 44px Close');
    const sn = B.querySelector('button[data-glance-snap]'), onBoard = STATE.schedule.some(x => x.game_id === gid);
    if (!!sn !== onBoard || (sn && (txt(sn) !== 'Open game snapshot' || sn.dataset.glanceSnap !== gid || w.getComputedStyle(sn).minHeight !== '44px'))) bad.push(`Open game snapshot ${sn ? 'drawn' : 'missing'} for a game ${onBoard ? 'on' : 'not on'} the board`);
    if (!K) bad.push('its leg is not kept'); else bad.push(...legBad(kind, K, wantPrice, wantSrc));
    bad.push(...(kind === 'p' ? playerBad(id, gid, K) : teamBad(gid, kind === 't' ? id : null, K ? K.leg.stat : String(btn.dataset.glanceLeg || '').split('|')[2])));
    return bad; };
  /* the browser's storage, watched while bubbles open and close: nothing may be written */
  const SPR = w.Storage.prototype, keepSet = SPR.setItem, keepRm = SPR.removeItem, keepClr = SPR.clear, writes = []; let watching = false;
  SPR.setItem = function (k, v) { if (watching) writes.push('set ' + k); return keepSet.call(this, k, v); };
  SPR.removeItem = function (k) { if (watching) writes.push('remove ' + k); return keepRm.call(this, k); };
  SPR.clear = function () { if (watching) writes.push('clear'); return keepClr.call(this); };
  const openOn = async (btn, wantPrice, wantSrc, where) => { watching = true; btn.click(); await wait(20); const bad = bubbleBad(btn, wantPrice, wantSrc);
    if (shown()) { box().querySelector('[data-glance-close]').click(); await wait(10); } watching = false;
    chk(bad.length === 0 && !shown() && d.activeElement === btn, `the matchup bubble from ${where} (${btn.dataset.glance}, ${btn.dataset.glanceLeg}): ${bad.join('; ') || 'Close did not close it with the focus back on the name'}`); };
  const priceOf = (where, K) => where === 'the builder' ? legPrice(K.leg) : { ml: K.leg.price, src: K.leg.src };

  /* ---- on the week as it stands: every name the page draws, and the first of each kind in each place opened ---- */
  [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'suggest').click(); await wait(400);
  const live = () => { const out = [];
    for (const li of d.querySelectorAll('#pbPanel ol.pb-top li.pb-trow')) { const a = li.querySelector('button[data-pb-leg]'); if (a) out.push({ where: 'the Top 30', row: li.querySelector('.nm'), key: a.dataset.pbLeg, side: a.dataset.side, k: a.dataset.k }); }
    for (const tr of d.querySelectorAll('#parlayBody tr.legrow')) { const b = tr.querySelector('button[data-drop]'), l = b && S.parlay[b.dataset.drop]; if (l) out.push({ where: 'the builder', row: tr.querySelector('td.plr'), key: b.dataset.drop, side: l.side, k: l.k }); }
    for (const [sel, where] of [['#spSets .pb-tiers[data-sp-kind="model"]', 'a set’s card'], ['#spSets .pb-tiers[data-sp-kind="elo"]', 'an Elo pick’s card']]) for (const li of d.querySelectorAll(`${sel} .pb-tier .pb-legs li`)) {
      const a = li.querySelector('button[data-pb-leg]'); if (a) out.push({ where, row: li.querySelector('.nm'), key: a.dataset.pbLeg, side: a.dataset.side, k: a.dataset.k }); }
    return out; };
  /* the builder, on the week as it stands: a player's line, a team's and a total, each the first the Top 50 lists */
  const keepParlay = JSON.stringify(S.parlay);
  for (const kd of ['p', 't', 'g']) { const li = [...d.querySelectorAll('#pbPanel ol.pb-top li.pb-trow')].find(x => x.querySelector(`[data-glance^="${kd}:"]`)), a = li && li.querySelector('button[data-pb-leg]');
    if (a && a.getAttribute('aria-pressed') !== 'true') { a.click(); await wait(30); } }
  await wait(400);                                  /* the page's own save of the builder (a 300ms debounce) lands before the storage is watched */
  const L0 = live(), byPlace = {};
  { const bad = L0.map(P => { const x = nameBad(P.row, P.key, P.side, P.k); return x ? `${P.where} ${x}` : ''; }).filter(Boolean);
    chk(bad.length === 0, `a name on a leg is not the matchup bubble's button for its leg: ${bad.slice(0, 4).join(' | ')}`); }
  /* within one place a leg is drawn once (the builder, the Top 50 lines, each level card of a set or of its Elo picks, each a
     place of its own: a unit's eight cards are eight places, app v118), so a bubble's place and its leg's key, side and
     line find one copy after a redraw */
  { const idOf = b => String(b.dataset.glanceLeg || '').split('|').slice(0, 5).join('|'), dup = [];
    for (const pl of [d.getElementById('parlayBody'), d.getElementById('pbPanel'), ...d.querySelectorAll('#spPanel .pb-tier')]) { if (!pl) continue; const seen = new Set();
      for (const b of pl.querySelectorAll('[data-glance]')) { const k = b.dataset.glance + '|' + idOf(b); if (seen.has(k)) dup.push(`${pl.id || pl.dataset.pbTier} ${k}`); seen.add(k); } }
    chk(dup.length === 0, `a leg is drawn twice in one place, so a bubble opened on it cannot tell its copies apart: ${dup.slice(0, 4).join(' | ')}`); }
  for (const P of L0) { const b = P.row && P.row.querySelector('[data-glance]'); if (!b) continue; const k = P.where + '|' + b.dataset.glance[0]; if (!byPlace[k]) byPlace[k] = { P, b }; }
  for (const { P, b } of Object.values(byPlace)) { const K = w.glanceLeg(b.dataset.glanceLeg); if (!K) continue; const pr = priceOf(P.where, K); await openOn(b, pr.ml, pr.src, P.where + ' (the week as it stands)'); }

  /* ---- at any hour: the fixtures ---- */
  const wk = w.eval('currentWeek()'), season = +w.eval('SEASON');
  /* a game both schedules have and a real player on it: a ranked player with a matchup row and a trusted stat where the
     matchups file has one (in the season), else a ranked player of either club (the off-season, a file of no starters) */
  const both = id => S.sched.some(x => x.id === id) && STATE.schedule.some(x => x.game_id === id);
  const mrow = Object.entries(MU.players || {}).find(([pid, v]) => Pl.players[pid] && Pl.players[pid].se != null && Pl.players[pid].rank && S.players[pid]
    && both(v.game_id) && Object.keys(v.stats || {}).some(st => trustOwn(v.group, st)) && !outOwn(pid));
  const r = mrow ? S.sched.find(x => x.id === mrow[1].game_id) : (S.sched.find(x => +x.w === +wk && both(x.id)) || S.sched.find(x => both(x.id)));
  const pid = mrow ? mrow[0] : r ? Object.keys(Pl.players || {}).find(id => Pl.players[id].rank && Pl.players[id].se != null && S.players[id]
    && [r.a, r.h].includes(S.players[id].team) && ['QB', 'RB', 'WR', 'TE'].includes(S.players[id].grp)) : null;
  const pick = r ? [pid, mrow ? mrow[1] : null] : null;
  const at = new Date(w.Date.now() + 2 * 86400e3).toISOString().slice(0, 10);
  const FAKE = { id: `${season}_${String(wk).padStart(2, '0')}_XXA_XXH`, w: wk, d: at, t: '13:00', a: 'XXA', h: 'XXH' };
  const fakeP = { key: legKey(FAKE.id, 'XX-0000001', 'receiving_yards'), gid: FAKE.id, pid: 'XX-0000001', stat: 'receiving_yards', k: 40.5, side: 'over', main: true, p: 0.58, price: -110, src: 'real',
    mu: 44, name: 'Planted Receiver', pos: 'WR', grp: 'WR', team: 'XXA', opp: 'XXH', week: wk, label: 'Over 40.5 receiving yards' };
  const fakeT = { key: legKey(FAKE.id, 'team:XXA', 'ml'), gid: FAKE.id, pid: 'team:XXA', stat: 'ml', k: 0, side: 'over', main: false, p: 0.52, price: 110, src: 'est', mu: null,
    name: 'XXA', pos: 'Game', grp: 'TEAM', team: 'XXA', opp: 'XXH', week: wk, label: 'To win' };
  chk(!!r, 'the matchup bubble: no game in both the payload\'s schedule and the board\'s to stand a fixture on');
  let GRADES_SEEN = [];
  if (r) {
    const v = pick[1], sp = pid && S.players[pid], st = v ? Object.keys(v.stats).find(s => trustOwn(v.group, s)) : sp && sp.grp === 'QB' ? 'passing_yards' : 'receiving_yards';
    const kk = v ? Math.round(v.stats[st][1]) + 0.5 : 50.5, team = v ? v.team : sp && sp.team, opp = team === r.h ? r.a : r.h;
    const realP = sp ? { key: legKey(r.id, pid, st), gid: r.id, pid, stat: st, k: kk, side: 'over', main: true, p: 0.57, price: -110, src: 'real', mu: kk,
      name: sp.n, pos: sp.pos, grp: sp.grp, team, opp, week: r.w, label: `Over ${kk} ${st}` } : null;
    const realT = { key: legKey(r.id, 'team:' + r.h, 'ml'), gid: r.id, pid: 'team:' + r.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.6, price: r.mlh != null ? r.mlh : -150, src: r.mlh != null ? 'real' : 'est', mu: null,
      name: TN[r.h] || r.h, pos: 'Game', grp: 'TEAM', team: r.h, opp: r.a, week: r.w, label: 'To win' };
    const realG = w.eval('totalLeg')(r, 'under') || { key: legKey(r.id, 'game', 'total'), gid: r.id, pid: 'game', stat: 'total', k: 44.5, side: 'under', main: true, p: 0.5, price: -110, src: 'est', mu: 44.5,
      name: `${TN[r.a] || r.a} at ${TN[r.h] || r.h}`, pos: 'Game', grp: 'TEAM', team: r.a, opp: r.h, week: r.w, label: 'Under 44.5 points' };
    S.sched.push(FAKE);
    /* and a line of each player the Mismatches grade at either end of each grade the smoke works out (the lowest edge
       and the highest), so every grade the week has, and its bounds, is read off a bubble whatever the rows above drew */
    const graded = {}; for (const [id, x] of Object.entries(MU.players || {})) { if (!S.players[id] || !S.sched.some(y => y.id === x.game_id) || id === pid) continue;
      const m = mmOwn(id, x.game_id); if (!m) continue; const G2 = graded[m.grade] = graded[m.grade] || {};
      if (!G2.lo || m.score < G2.lo.s) G2.lo = { id, x, s: m.score }; if (!G2.hi || m.score > G2.hi.s) G2.hi = { id, x, s: m.score }; }
    const mmLegs = Object.values(graded).flatMap(G2 => G2.lo.id === G2.hi.id ? [G2.lo] : [G2.lo, G2.hi]).map(({ id, x }) => { const sp2 = S.players[id], st2 = Object.keys(x.stats || {})[0] || 'receiving_yards', k2 = x.stats && x.stats[st2] ? Math.round(x.stats[st2][1]) + 0.5 : 20.5, g2 = S.sched.find(y => y.id === x.game_id);
      return { key: legKey(x.game_id, id, st2), gid: x.game_id, pid: id, stat: st2, k: k2, side: 'under', main: true, p: 0.52, price: 105, src: 'real', mu: k2,
        name: sp2.n, pos: sp2.pos, grp: sp2.grp, team: x.team, opp: x.opp, week: g2.w, label: `Under ${k2} ${st2}` }; });
    GRADES_SEEN = Object.keys(graded);
    /* and a club to cover, the one a model picks to win where one does: a team's leg that is not to win, whose bubble
       ticks no model all the same (a pick to win says nothing of a cover) */
    const gB = STATE.schedule.find(x => x.game_id === r.id), cs = gB ? callsOwn(gB) : {};
    const sT = ['vegas', 'alpha', 'joker', 'elo'].map(k => cs[k] && cs[k].pick).find(t => t === r.a || t === r.h) || r.a, sO = sT === r.h ? r.a : r.h;
    const realS = { key: legKey(r.id, 'team:' + sT, 'ats'), gid: r.id, pid: 'team:' + sT, stat: 'ats', k: -3.5, side: 'over', main: false, p: 0.53, price: -110, src: 'real', mu: null,
      name: TN[sT] || sT, pos: 'Game', grp: 'TEAM', team: sT, opp: sO, week: r.w, label: 'To cover -3.5' };
    /* and a player the ratings file rates on the other side of the ball from his leg, on a receiving line in the
       fixture's game (Travis Hunter, a defensive back in players.json, has receiving lines in the payload): one the
       payload carries so, else a ranked defender of the file's planted on a receiver's line; his bubble sets him
       against the Pass Defense his leg faces, and keeps his Elo and rank at the position he is rated at */
    const twoId = Object.keys(S.players).find(id => Pl.players[id] && Pl.players[id].se != null && Pl.players[id].rank && FACE_OWN[S.players[id].grp] && !FACE_OWN[Pl.players[id].group])
      || Object.keys(Pl.players || {}).find(id => Pl.players[id].se != null && Pl.players[id].rank && !FACE_OWN[Pl.players[id].group] && Pl.players[id].group !== 'K' && id !== pid)
      || Object.keys(Pl.players || {}).find(id => Pl.players[id].group && !FACE_OWN[Pl.players[id].group] && Pl.players[id].group !== 'K' && id !== pid);
    const twoP = twoId ? { key: legKey(r.id, twoId, 'receiving_yards'), gid: r.id, pid: twoId, stat: 'receiving_yards', k: 40.5, side: 'over', main: true, p: 0.55, price: -115, src: 'real', mu: 42,
      name: S.players[twoId] ? S.players[twoId].n : Pl.players[twoId].name, pos: 'WR', grp: 'WR', team: r.a, opp: r.h, week: r.w, label: 'Over 40.5 receiving yards' } : null;
    chk(!!twoP, 'the matchup bubble: no player in the ratings file rated on the other side of the ball to plant on a receiving line');
    const legs = [realP, realT, realS, realG, fakeP, fakeT, twoP, ...mmLegs].filter(Boolean), at1 = l => lis[legs.indexOf(l)].querySelector('[data-glance]');
    const host = d.createElement('div'); host.id = 'glFix'; host.className = 'card'; d.body.appendChild(host);
    host.innerHTML = w.pbTierCard({ id: 'glfix', label: 'Fixture', legs, corr: 0.05, dec: 20, fair: null, floor: null }, { quiet: true, kind: 'sp', fid: 'glfix' });
    const lis = [...host.querySelectorAll('.pb-legs li')];
    { const bad = legs.map((l, i) => { const x = lis[i] ? nameBad(lis[i].querySelector('.nm'), l.key, l.side, l.k) : `${l.key}: not drawn`; return x; }).filter(Boolean);
      chk(lis.length === legs.length && bad.length === 0, `the matchup bubble: a name on a level card of the smoke's own is not the bubble's button for its leg: ${bad.join(' | ')}`); }
    for (let i = 0; i < lis.length; i++) { const b = lis[i].querySelector('[data-glance]'); if (b) await openOn(b, legs[i].price, legs[i].src, `a level card of the smoke's own (${legs[i].name}, ${legs[i].label})`); }
    /* the player rated on the other side of the ball: his receiving line sets him against the Pass Defense (the leg's
       side), where the file has one for the club, and his rank stays the one at his rated position */
    if (twoP) { const fw = faceOwn('WR', twoP.opp), e2 = Pl.players[twoP.pid], g2 = Pl.groups && Pl.groups[e2.group], b = at1(twoP);
      watching = true; b.click(); await wait(20);
      const fc = box().querySelector('[data-glance-faces]'), got = [fc ? fc.dataset.glanceFaces : null, nOf('uclub'), nOf('rank'), nOf('of')].join(' ');
      box().querySelector('[data-glance-close]').click(); await wait(10); watching = false;
      const rk2 = e2.se != null && e2.rank, want = [fw ? fw.key : null, fw ? twoP.opp : null, rk2 ? '#' + e2.rank : null, rk2 && g2 && g2.active ? String(g2.active) : null].join(' ');
      chk(got === want, `the matchup bubble of ${twoP.name}, rated a ${e2.group} and on a receiver's line, does not set him against the defense his leg faces with his rank at his rated position: ${got}, not ${want}`); }
    /* a club yet to play this season, on the rating carried from last season (week 1, or a team on its bye then): the
       Faces line marks it "carried from <season>", as the ELO Ratings tab marks it, on the same rank. Planted on the
       page's own copy of model.json (eloFiles) and the smoke's alike, every value put back after */
    { const L = realP || twoP, F = await w.eloFiles(), U = F && F.model && F.model.units, key = L && FACE_OWN[L.grp], club = L && L.opp;
      const T = U && key && U[key], T0 = T && MO.units && MO.units[key];
      if (!T || !T[club] || !T0 || !T0[club] || !faceOwn(L.grp, club)) chk(false, `the matchup bubble: no ${key || 'unit'} table rating for ${club || 'the fixture\'s opponent'} to mark carried`);
      else {
        const keep = { v: T[club].carried, v0: T0[club].carried, p: U.params, p0: MO.units.params }, from = season - 1;
        const P1 = { ...(U.params || {}), carry: (U.params && U.params.carry) || 0.42, carry_from: from };
        T[club].carried = true; T0[club].carried = true; U.params = P1; MO.units.params = { ...P1 };
        const b = at1(L); watching = true; b.click(); await wait(20);
        const bad = bubbleBad(b, L.price, L.src), cw = nOf('ucarry'), rk = nOf('urank');
        box().querySelector('[data-glance-close]').click(); await wait(10); watching = false;
        const put = (o, k, v) => { if (v === undefined) delete o[k]; else o[k] = v; };
        put(T[club], 'carried', keep.v); put(T0[club], 'carried', keep.v0); put(U, 'params', keep.p); put(MO.units, 'params', keep.p0);
        chk(cw === `carried from ${from}` && rk === ordOwn(T[club].rank) && !bad.length,
          `the matchup bubble does not mark a club carried from last season on its Faces line, on the rank the tab draws: "${cw}" ${rk} (${bad.join('; ')})`); } }
    /* a final the board has and the ratings file has not counted yet (the betting job graded it before the Elo job ran):
       the record counts it, as Team Rankings does, planted on the board's own schedule for a made-up opponent */
    { const P = w.pkBoard, b = at1(realT), extra = { game_id: `${season}_01_XXZ_${r.h}`, week: 1, game_type: 'REG', gameday: '2026-09-10', gametime: '13:00', away_team: 'XXZ', home_team: r.h, home_score: 30, away_score: 3, result: 27 };
      const before = recOwn(r.h), want = recOwn(r.h, STATE.schedule.concat([extra]));
      P.ST.sched.push(extra); watching = true; b.click(); await wait(20);
      const got = nOf('rec:' + r.h); box().querySelector('[data-glance-close]').click(); await wait(10); watching = false;
      P.ST.sched.splice(P.ST.sched.indexOf(extra), 1);
      chk(got === want && want !== before, `the matchup bubble does not count a final the board has that the ratings file has not: ${r.h} ${got}, not ${want} (${before} before it)`); }
    /* the line is the one the leg stands on: the prop model's row moved off the board's (DraftKings' read a point and a
       half away, its own moneylines, as a fresh pull or a Refresh odds press leaves it), and the bubble draws the row's,
       named DraftKings, never the board's closing line beside a leg on another number; every value put back after */
    { const b = at1(realT), gB = STATE.schedule.find(x => x.game_id === r.id), keep = ['sp', 'tot', 'mla', 'mlh', 'ls'].map(k => [k, Object.prototype.hasOwnProperty.call(r, k), r[k]]);
      const bsp = gB && gB.spread_line != null && isFinite(gB.spread_line) ? +gB.spread_line : null, btot = gB && gB.total_line != null && isFinite(gB.total_line) ? +gB.total_line : null;
      Object.assign(r, { sp: bsp == null ? 3.5 : bsp + 1.5, tot: btot == null ? 47.5 : btot + 2.5, mla: 163, mlh: -191, ls: 'dk' });
      watching = true; b.click(); await wait(20);
      const bad = bubbleBad(b, realT.price, realT.src), sp = nOf('spread'), src = nOf('lsrc'), tt = nOf('total');
      box().querySelector('[data-glance-close]').click(); await wait(10); watching = false;
      for (const [k, had, v] of keep) { if (had) r[k] = v; else delete r[k]; }
      chk(!bad.length && src === 'DraftKings' && tt === String(btot == null ? 47.5 : btot + 2.5) && sp !== (bsp == null ? null : bsp > 0 ? `${r.h} −${bsp}` : bsp < 0 ? `${r.a} −${-bsp}` : 'Pick\'em'),
        `the matchup bubble's line is not the one the leg stands on (the prop model's row, named DraftKings), with the row moved off the board's: ${sp} total ${tt} (${src || 'no source'}); ${bad.join('; ')}`); }
    /* his status as the page knows it, planted: ruled out (no matchup to show, OUT and why), then questionable */
    { const L = realP || fakeP, b = at1(L), sid = L.pid, keepI = S.inactive[sid], INJ = w.eval('INJ'), keepQ = INJ[sid];
      S.inactive[sid] = { week: wk, status: 'Out', inj: 'Knee' };
      watching = true; b.click(); await wait(20);
      const s1 = [nOf('inj'), txt(box().querySelector('.glance-why')), nOf('nomu') !== null, !box().querySelector('tr[data-glance-stat]'), nOf('mu') === null], bad1 = bubbleBad(b, L.price, L.src);
      box().querySelector('[data-glance-close]').click(); await wait(10);
      if (keepI) S.inactive[sid] = keepI; else delete S.inactive[sid];
      INJ[sid] = { k: 'q', t: 'Q', title: 'Questionable (ankle); limited in practice' };
      b.click(); await wait(20);
      const s2 = [nOf('inj'), txt(box().querySelector('.glance-why'))], bad2 = bubbleBad(b, L.price, L.src);
      box().querySelector('[data-glance-close]').click(); await wait(10); watching = false;
      if (keepQ) INJ[sid] = keepQ; else delete INJ[sid];
      chk(s1.join('|') === 'OUT|ruled out, knee|true|true|true' && s2.join('|') === 'Q|Questionable (ankle); limited in practice' && !bad1.length && !bad2.length,
        `the matchup bubble does not say a player is ruled out (and show no matchup) or questionable as the page reads it: ${s1.join('|')} / ${s2.join('|')} ${bad1.concat(bad2).join('; ')}`); }

    /* ---- the window itself, on the real player's name and the team's beside it ---- */
    { const b1 = at1(realP || fakeP), b2 = at1(realT), key = (el, k, o) => el.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));
      const bad = []; watching = true;
      b1.click(); await wait(20);
      { const f = [...box().querySelectorAll('button')], first = f[0], last = f[f.length - 1];
        last.focus(); key(last, 'Tab'); if (d.activeElement !== first) bad.push('Tab from the last control does not come round to the first');
        first.focus(); key(first, 'Tab', { shiftKey: true }); if (d.activeElement !== last) bad.push('Shift+Tab from the first control does not go round to the last');
        box().focus(); key(box(), 'Tab', { shiftKey: true }); if (d.activeElement !== last) bad.push('Shift+Tab from the bubble itself leaves it'); }
      key(d.activeElement, 'Escape'); await wait(10);
      if (shown() || d.activeElement !== b1 || b1.hasAttribute('aria-expanded')) bad.push('Escape does not close it with the focus back on the name');
      b1.click(); await wait(20); const outside = d.querySelector('#spCard h2') || d.querySelector('header h1');
      outside.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); await wait(10);
      if (shown() || d.activeElement !== b1) bad.push('a click outside does not close it with the focus back on the name');
      b1.click(); await wait(20); b2.click(); await wait(20);
      if (d.querySelectorAll('#glanceBox').length !== 1 || !shown() || box().dataset.glanceOf !== b2.dataset.glance || !box().contains(d.activeElement) || b1.hasAttribute('aria-expanded') || b2.getAttribute('aria-expanded') !== 'true')
        bad.push('another name does not close the first bubble and open its own, the focus in it');
      key(d.activeElement, 'Escape'); await wait(10);
      if (shown() || d.activeElement !== b2) bad.push('Escape on the second bubble does not give its name the focus back');
      b2.click(); await wait(20); b2.click(); await wait(10);
      if (shown()) bad.push('its own name pressed again does not close it');
      /* Open game snapshot: the bubble closes and that game's window opens; closing it gives the name the focus back */
      b2.click(); await wait(20); const sn = box().querySelector('[data-glance-snap]');
      if (!sn) bad.push('no Open game snapshot on a game the board has');
      else { sn.click(); await wait(80); const gm = d.getElementById('gsModal'), g = STATE.schedule.find(x => x.game_id === r.id), tt = gm && [...gm.querySelectorAll('#gsTitle .pk-ttag')].map(txt);
        if (shown() || !gm || gm.hidden || !tt || tt.join() !== [g.away_team, g.home_team].join()) bad.push(`Open game snapshot does not close the bubble and open ${r.id}'s window (${tt})`);
        w.gameSnapshotClose(); await wait(20);
        if (d.activeElement !== b2) bad.push('closing the game snapshot does not give the name the focus back'); }
      /* the tab changed by the address (a hash change, as Back makes) with the focus in the bubble: the page clicks the
         tab's button for the reader, the bubble closes and the focus goes to the chosen tab's button, never the body */
      { const t0 = d.querySelector('#tabs button[aria-selected="true"]'), sec0 = d.querySelector('main section:not([hidden])');
        /* the fixture's cards are set in the tab on the screen for this, so the tab change hides the name too */
        if (sec0) sec0.appendChild(host);
        b1.click(); await wait(20); box().focus(); const inside = box().contains(d.activeElement);
        w.location.hash = '#matchups'; await wait(60);
        const sel = d.querySelector('#tabs button[aria-selected="true"]');
        if (!inside || shown() || !sel || sel.dataset.tab !== 'pickems' || d.activeElement !== sel || b1.hasAttribute('aria-expanded'))
          bad.push(`a tab changed by the address does not close the bubble with the focus on the chosen tab's button (${shown() ? 'still open' : 'closed'}, tab ${sel && sel.dataset.tab}, focus on ${d.activeElement && (d.activeElement.id || d.activeElement.dataset.tab || d.activeElement.tagName)})`);
        if (t0) t0.click(); await wait(20); d.body.appendChild(host); }
      watching = false;
      chk(bad.length === 0, 'the matchup bubble as a window: ' + bad.join('; ')); }
    host.remove();

    /* ---- the page draws its rows again while a bubble is open (the half-minute look at a kickoff or a lock, a Refresh
       odds press finishing): the bubble stays on its own leg's copy in the place it was opened from, wherever else the
       page draws the same leg, marked open there, its focus and its toggle there; follows that copy's new price; and,
       where that place no longer draws the leg, closes with the focus on its neighbour there, never on the page's body ---- */
    { const bad = [], builder = () => d.getElementById('parlayBody');
      const part = what => { chk(bad.length === 0, `the matchup bubble across a redraw (${what}): ${bad.join('; ')}`); bad.length = 0; };
      /* the builder's legs on the made-up game two days out, which no kickoff takes out of the builder at any hour */
      const fakeH = { ...fakeT, key: legKey(FAKE.id, 'team:XXH', 'ml'), pid: 'team:XXH', name: 'XXH', team: 'XXH', opp: 'XXA', p: 0.48, price: -130 };
      const fakeS = { ...fakeT, key: legKey(FAKE.id, 'team:XXA', 'ats'), stat: 'ats', k: 2.5, p: 0.51, price: -110, label: 'To cover +2.5' };
      let L = fakeP, X = fakeT;
      const copyIn = (pl, l) => pl ? [...pl.querySelectorAll('[data-glance]')].find(b => { const K = w.glanceLeg(b.dataset.glanceLeg);
        return !!K && K.leg.key === l.key && (K.leg.side || 'over') === (l.side || 'over') && +K.leg.k === +l.k; }) || null : null;
      const expanded = () => [...d.querySelectorAll('[data-glance][aria-expanded="true"]')];
      const where = el => !el || el === d.body ? 'the body' : `${el.closest('[id]') ? el.closest('[id]').id : ''} ${el.getAttribute('aria-label') || el.className || el.tagName}`;
      const key = (el, k) => (el || d.body).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      const tab = t => [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === t).click();
      const keepP = JSON.stringify(S.parlay), tierOf = (id, label, ls) => ({ id, label, legs: ls, corr: 0.2, dec: 4, fair: null, floor: null });
      /* the builder drawn again (renderParlay), the same leg drawn earlier in the page than the builder (a card of the smoke's own, first in the body) */
      tab('parlay'); await wait(40);
      const early = d.createElement('div'); early.id = 'glEarly'; d.body.insertBefore(early, d.body.firstChild);
      early.innerHTML = w.pbTierCard(tierOf('safe', 'Safe', [L, X]), { quiet: true, kind: 'sp', fid: 'glearly' });
      S.parlay = { [L.key]: { ...L }, [X.key]: { ...X } }; w.eval('renderParlay()'); await wait(40);
      const b0 = copyIn(builder(), L);
      if (!b0 || !copyIn(early, L)) bad.push('the builder or the early card does not draw the leg');
      else {
        b0.click(); await wait(20); w.eval('renderParlay()'); await wait(30);
        { const b1 = copyIn(builder(), L);
          if (!shown() || !b1 || b1 === b0 || b1.getAttribute('aria-expanded') !== 'true' || expanded().length !== 1 || !box().contains(d.activeElement))
            bad.push(`after renderParlay the bubble is not bound to the builder's new copy of ${L.name}, marked open, the focus in it (shown ${shown()}; marked open: ${expanded().map(where).join(', ') || 'none'}; the focus on ${where(d.activeElement)})`); }
        key(d.activeElement, 'Escape'); await wait(10);
        if (shown() || d.activeElement !== copyIn(builder(), L)) bad.push(`Escape after renderParlay gives the focus to ${where(d.activeElement)}, not the builder's copy of ${L.name}`);
        copyIn(builder(), L).click(); await wait(20); w.eval('renderParlay()'); await wait(30); copyIn(builder(), L).click(); await wait(20);
        if (shown() || expanded().length) bad.push('after renderParlay the builder\'s name pressed again does not close its bubble');
        /* its price moved under it (a Refresh odds press, a rung's book price): the bubble follows the copy's numbers */
        copyIn(builder(), L).click(); await wait(20); S.parlay[L.key].price = 105; w.eval('renderParlay()'); await wait(30);
        { const lp = legPrice(S.parlay[L.key]), c = copyIn(builder(), L);
          if (!shown() || nOf('price') !== pxOwn(lp.ml) + estOwn(lp.src) || !c || c.getAttribute('aria-expanded') !== 'true')
            bad.push(`a builder leg's price moved under its open bubble: the bubble says ${nOf('price')}, not ${pxOwn(lp.ml) + estOwn(lp.src)}`); }
        key(d.activeElement, 'Escape'); await wait(10); }
      part('renderParlay: the builder\'s copy, its focus, its toggle and a price moved under it');
      /* the reader's place in the bubble kept through a redraw and a resize: scrolled to its foot (the leg's own box), a
         redraw on the page that leaves the leg as it was, or a resize, places it again and must not take it back to the
         top. jsdom lays nothing out, so the browser's rule is stood in on the bubble alone: a measure of its height with
         its max-height cleared takes its scroll back to the top, as Chromium does (offsetHeight there, 400px); the
         screen's height stood in too, for the sheet a short screen falls back to; all put back after */
      if (b0) { const B = box(); let st = 0;
        const keepH = Object.getOwnPropertyDescriptor(w, 'innerHeight');
        Object.defineProperty(B, 'scrollTop', { configurable: true, get: () => st, set: v => { st = Math.max(0, +v || 0); } });
        Object.defineProperty(B, 'offsetHeight', { configurable: true, get: () => { if (!B.style.maxHeight) st = 0; return 400; } });
        try {
          for (const [lab, hgt] of [['as a bubble', 900], ['as the sheet a short screen falls back to', 150]]) {
            Object.defineProperty(w, 'innerHeight', { configurable: true, writable: true, value: hgt });
            copyIn(builder(), L).click(); await wait(20); B.scrollTop = 225;
            w.eval('renderParlay()'); await wait(30); const a1 = st, sheet1 = B.classList.contains('glance-sheet');
            w.dispatchEvent(new w.Event('resize')); await wait(10); const a2 = st;
            if (!shown() || a1 !== 225 || a2 !== 225 || sheet1 !== (hgt < 400)) bad.push(`${lab}, scrolled 225px down, the bubble is at ${a1}px after renderParlay and ${a2}px after a resize${sheet1 !== (hgt < 400) ? `, ${sheet1 ? '' : 'not '}a sheet` : ''}`);
            key(d.activeElement, 'Escape'); await wait(10); } }
        finally { delete B.scrollTop; delete B.offsetHeight; if (keepH) Object.defineProperty(w, 'innerHeight', keepH); else delete w.innerHeight; }
        part('the reader\'s scroll in the bubble across a redraw and a resize'); }
      /* the leg taken out of the builder: the bubble closes, the focus on the name now in its place there */
      S.parlay = Object.fromEntries([fakeP, fakeT, fakeH, fakeS].map(l => [l.key, { ...l }])); w.eval('renderParlay()'); await wait(40);
      { const n0 = [...builder().querySelectorAll('[data-glance]')], mid = n0[1], Km = mid && w.glanceLeg(mid.dataset.glanceLeg);
        if (!Km) bad.push('the builder does not draw three legs');
        else { mid.click(); await wait(20); delete S.parlay[Km.leg.key]; w.eval('renderParlay()'); await wait(30);
          const n1 = [...builder().querySelectorAll('[data-glance]')];
          if (shown() || expanded().length || d.activeElement !== n1[1]) bad.push(`with ${Km.leg.name} taken out of the builder, the bubble ${shown() ? 'is still open' : 'closed'} with the focus on ${where(d.activeElement)}, not the leg now in its place`);
          /* and the builder emptied: the focus on the builder's (or the tab's) first control */
          n1[0].click(); await wait(20); S.parlay = {}; w.eval('renderParlay()'); await wait(30);
          const fa = d.activeElement;
          if (shown() || !fa || fa === d.body || !fa.isConnected || !fa.closest('#tab-parlay')) bad.push(`with the builder emptied under an open bubble, the focus is on ${where(fa)}`); } }
      part('the leg taken out of the builder');
      early.remove(); S.parlay = JSON.parse(keepP); w.eval('renderParlay()'); await wait(40);

      /* Suggested Parlays drawn again (renderSp): one leg on a set's Safe and Extreme cards and on the same unit's Elo Safe
         card (app v118: the Elo picks in each unit, the same level's place in another block of it), the page's spGames, spOn
         and spShown stood in for a set of the smoke's own on the fixture's game (with no Sunday slot, spSlotNext stood in by
         none), so it holds at any hour; each put back after */
      tab('suggest'); await wait(40);
      L = realP || realT; X = realP ? realT : realS;
      const SP = { games: w.spGames, on: w.spOn, shown: w.spShown, slot: w.spSlotNext };
      let tiers = [tierOf('safe', 'Safe', [L, X]), tierOf('extreme', 'Extreme', [realS, realG, L])];
      const eloT = () => [{ ...tierOf('elo-safe', 'Safe', [L, realG].map(l => ({ ...l, pe: 0.6 }))), p: 0.36, floor: 0.35 }];
      w.spGames = () => [r]; w.spOn = () => [r]; w.spSlotNext = () => null; w.spShown = () => ({ phase: 'live', lock: w.Date.now() + 864e5, tiers, elo: eloT() });
      w.eval('renderSp()'); await wait(30);
      const card = id => d.querySelector(`#spSets [data-sp-game="${r.id}"] .pb-tier[data-pb-tier="${id}"]`);
      const e0 = copyIn(card('extreme'), L);
      if (!e0 || !copyIn(card('safe'), L) || !copyIn(card('elo-safe'), L)) bad.push('the stood-in set or its Elo pick does not draw the leg on each card');
      else {
        e0.click(); await wait(20); w.eval('renderSp()'); await wait(30);
        { const e1 = copyIn(card('extreme'), L);
          if (!shown() || !e1 || e1 === e0 || e1.getAttribute('aria-expanded') !== 'true' || expanded().length !== 1 || !box().contains(d.activeElement))
            bad.push(`after renderSp the bubble is not bound to the Extreme card's new copy of ${L.name}, marked open, the focus in it (marked open: ${expanded().map(x => x.closest('.pb-tier').dataset.pbTier).join(', ') || 'none'})`); }
        key(d.activeElement, 'Escape'); await wait(10);
        if (shown() || d.activeElement !== copyIn(card('extreme'), L)) bad.push(`Escape after renderSp gives the focus to ${where(d.activeElement)}${d.activeElement && d.activeElement.closest('.pb-tier') ? ' (' + d.activeElement.closest('.pb-tier').dataset.pbTier + ')' : ''}, not the Extreme card's copy`);
        copyIn(card('extreme'), L).click(); await wait(20); w.eval('renderSp()'); await wait(30); copyIn(card('extreme'), L).click(); await wait(20);
        if (shown() || expanded().length) bad.push('after renderSp the Extreme card\'s name pressed again does not close its bubble');
        part('renderSp: the Extreme card\'s copy, its focus and its toggle');
        /* the unit's Elo Safe card drawn again: its own copy, a place of its own ([data-sp-game] .pb-tier[data-pb-tier=
           "elo-safe"]), not the set's Safe card's before it in the same unit; the name a bubble button for its leg there */
        { const o0 = copyIn(card('elo-safe'), L), nb = o0 ? nameBad(o0.closest('.nm'), L.key, L.side, L.k) : 'no copy';
          if (nb) bad.push('the Elo Safe card\'s name is not the bubble\'s button for its leg: ' + nb);
          if (o0) { o0.click(); await wait(20); w.eval('renderSp()'); await wait(30);
            const o1 = copyIn(card('elo-safe'), L), s1 = copyIn(card('safe'), L);
            if (!shown() || !o1 || o1 === o0 || o1.getAttribute('aria-expanded') !== 'true' || expanded().length !== 1 || (s1 && s1.getAttribute('aria-expanded') === 'true'))
              bad.push(`after renderSp the bubble is not bound to the Elo Safe card's own new copy (marked open: ${expanded().map(x => x.closest('.pb-tier') ? x.closest('.pb-tier').dataset.pbTier : where(x)).join(', ') || 'none'})`);
            key(d.activeElement, 'Escape'); await wait(10);
            if (shown() || d.activeElement !== copyIn(card('elo-safe'), L)) bad.push(`Escape after renderSp gives the focus to ${where(d.activeElement)}, not the Elo Safe card's copy`); } }
        part('renderSp: the unit\'s Elo Safe card\'s own copy, not the set\'s Safe card\'s');
        /* the leg gone from the Extreme card (its set built again): the bubble closes, the focus on the leg now in its place there */
        copyIn(card('extreme'), L).click(); await wait(20);
        const n0 = [...card('extreme').querySelectorAll('[data-glance]')], i0 = n0.indexOf(copyIn(card('extreme'), L));
        tiers = [tiers[0], tierOf('extreme', 'Extreme', [realS, realG])]; w.eval('renderSp()'); await wait(30);
        const n1 = [...card('extreme').querySelectorAll('[data-glance]')], want = n1[Math.min(i0, n1.length - 1)];
        if (shown() || expanded().length || !want || d.activeElement !== want) bad.push(`with ${L.name} gone from the Extreme card, the bubble ${shown() ? 'is still open' : 'closed'} with the focus on ${where(d.activeElement)}, not the leg now in its place there`); }
      part('renderSp: the leg gone from its card');
      w.spGames = SP.games; w.spOn = SP.on; w.spShown = SP.shown; w.spSlotNext = SP.slot; w.eval('renderSp()'); await wait(30);

      /* a builder row whose stored price is not the one it shows: a ladder rung added at -174, the book's price on it -114
         now (legPrice reads the book): the row's own market + form and Elo matchup on the price it shows, as the bubble's */
      if (realP) { tab('parlay'); await wait(40);
        /* the real player's line on the made-up game two days out (his market + form and Elo matchup turn on him, not his game) */
        const kk = Math.max(1, Math.round(realP.k)), rung = { ...realP, key: legKey(FAKE.id, realP.pid, realP.stat), gid: FAKE.id, team: 'XXA', opp: 'XXH', week: FAKE.w, k: kk, main: false, price: -174, src: 'real', label: `${kk}+ ${realP.stat}` };
        const OD = S.odds = S.odds || {};
        OD[FAKE.id] = { [realP.pid]: { [realP.stat]: { [String(kk)]: -114 } } };
        S.parlay = { [rung.key]: rung }; w.eval('renderParlay()'); await wait(40);
        const tr = builder().querySelector('tr.legrow'), alt = tr && tr.querySelector('.pe-alt:not(.pe-muleg)'), mul = tr && tr.querySelector('.pe-muleg'), lp = legPrice(S.parlay[rung.key]);
        const mf = mfOwn(rung, -114, 'real'), mu = muOwn(rung, -114), b = tr && tr.querySelector('[data-glance]');
        if (lp.ml !== -114 || lp.src !== 'real') bad.push(`the rung planted at the book's -114 shows ${lp.ml} ${lp.src}`);
        if (mf == null ? !!alt : !alt || Math.abs(+alt.dataset.p - mf) > 1e-4) bad.push(`the builder row's market + form is ${alt ? alt.dataset.p : 'none'}, not ${mf == null ? 'none' : mf.toFixed(4)} on the -114 it shows (on the -174 it was stored at: ${(mfOwn(rung, -174, 'real') || 0).toFixed(4)})`);
        if (mu == null ? !!mul : !mul || !near(txt(mul.querySelector('b')), mu)) bad.push(`the builder row's Elo matchup is ${mul ? txt(mul.querySelector('b')) : 'none'}, not ${mu == null ? 'none' : (mu * 100).toFixed(2)} on the -114 it shows`);
        if (b) { b.click(); await wait(20);
          if (alt && nOf('mf') !== txt(alt.querySelector('b'))) bad.push(`the bubble's market + form ${nOf('mf')} is not its row's ${txt(alt.querySelector('b'))}`);
          if (mul && nOf('mu') !== txt(mul.querySelector('b'))) bad.push(`the bubble's Elo matchup ${nOf('mu')} is not its row's ${txt(mul.querySelector('b'))}`);
          key(d.activeElement, 'Escape'); await wait(10);
          await openOn(b, lp.ml, lp.src, 'the builder, a rung at the book\'s price now'); }
        else bad.push('the rung\'s name is not drawn as the bubble\'s button');
        delete OD[FAKE.id];
        S.parlay = JSON.parse(keepP); w.eval('renderParlay()'); await wait(40); }
      part('a builder row\'s market + form and Elo matchup on the price it shows, as its bubble\'s');
      tab('suggest'); await wait(40); }

    /* ---- the builder at any hour: a made-up player with no Elo row, on no book price (the builder shows the model's
       fair price, as for a line added from a game's page with none: the bubble shows the price the row shows, not the
       leg's own), and a team bet on a made-up game with no line ---- */
    const fakePb = { ...fakeP, price: null, src: undefined };
    S.parlay = { [fakePb.key]: fakePb, [fakeT.key]: { ...fakeT } }; w.eval('renderParlay()'); await wait(40);
    { const rows = [...d.querySelectorAll('#parlayBody tr.legrow')], bad = [];
      for (const l of [fakePb, fakeT]) { const tr = rows.find(x => (x.querySelector('button[data-drop]') || {}).dataset && x.querySelector('button[data-drop]').dataset.drop === l.key);
        const x = tr ? nameBad(tr.querySelector('td.plr'), l.key, l.side, l.k) : `${l.key}: not in the builder`; if (x) bad.push(x); }
      chk(rows.length === 2 && bad.length === 0, `the matchup bubble: a made-up leg's name in the builder is not the bubble's button for its leg: ${bad.join(' | ')}`);
      for (const tr of rows) { const b = tr.querySelector('[data-glance]'); if (!b) continue; const K = w.glanceLeg(b.dataset.glanceLeg); const pr = K ? legPrice(K.leg) : {}; await openOn(b, pr.ml, pr.src, 'the builder, a made-up game with no line'); }
      const tb = rows.map(x => x.querySelector('[data-glance^="t:"]')).find(Boolean);
      if (tb) { tb.click(); await wait(20);
        chk(nOf('noline') === 'no line posted yet' && nOf('nopr') !== null && !box().querySelector('[data-glance-snap], [data-glance-model], [data-glance-poss]') && nOf('rec:XXA') === '0-0',
          'the matchup bubble on a made-up game with no line does not say so, or draws a rating, a pick or a snapshot it has not got');
        box().querySelector('[data-glance-close]').click(); await wait(10); } }
    S.parlay = JSON.parse(keepParlay); S.sched.splice(S.sched.indexOf(FAKE), 1); w.eval('save(); renderParlay()'); await wait(40);
  }
  SPR.setItem = keepSet; SPR.removeItem = keepRm; SPR.clear = keepClr;
  chk(writes.length === 0, 'the matchup bubble wrote to the browser\'s storage: ' + writes.slice(0, 5).join(', '));
  chk(errs.length === 0, 'the matchup bubble: the page threw: ' + errs.join('; '));
  w.close();
  const kinds = Object.keys(byPlace).map(k => k.replace('|', ' ')).join(', '), gradesSeen = GRADES_SEEN;
  console.log(`the matchup bubble: ${checks - c0} checks (${L0.length} names on the week as it stands${kinds ? ', opened from ' + kinds : ''}; fixtures on ${r ? r.id + (pid ? ', ' + pid + (mrow ? ' with his matchup' : ' with no matchup row') : '') + (gradesSeen.length ? ', a mismatch graded ' + gradesSeen.join(', ') : '') : 'no game'} and a made-up game), ${fails.length - f0} failures`);
}
