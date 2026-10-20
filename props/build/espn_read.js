/* The props job's read of DraftKings' lines on ESPN (weekly.py's step 4).

   The owner's call of 20 October 2026: no scheduled paid pull. Every run of the props job reads DraftKings' game
   lines and player lines from ESPN's free feed, as a visitor's Refresh odds press does, and publishes the read
   with the payload (weekly.py's apply_espn: PAY.espn and the schedule's game lines), so every visitor, and the
   suggestions record, starts from DraftKings' lines. There is one reader, the page's own: this boots the assembled
   prop page (../app/prop_model_2026.html, assemble.py's) in jsdom on the payload just baked, as a visitor's browser
   boots it (no NO_BAKED, an empty localStorage, the run's clock), and calls the page's espnReadWeek (part3.js) on
   the current week's games still to come: the scoreboard, each game's player lines, every page of them, placed on
   the payload's players by PAY.espn_ids and else by name within the game's two clubs. espnReadWeek applies
   nothing; this writes what it returned to raw/espn/read.json:

     {v:1, week, read_at (this read's start, ISO), done_at, ms, requests, replay (the folder replayed, or null),
      deadline (true where the deadline cut the read short), outside (ESPN requests the page made outside the read:
      none expected), games:{gid:{out:{st 'ok'|'none'|'failed'|'kicked', why, at (ok and none: when, ISO)},
      gl:{at, lines, ids, event}|null (DraftKings' game lines and ids on the scoreboard), pl:{at, lines, rungs, td}|null
      (an 'ok' read's block), placed:{pid:{aid, name, how 'id'|'name'|'nameKey'}}|null (who each player of the block
      is, for the audit's V-ESPN), counts}}}
     or, for a page with no espnReadWeek, {v:1, week, read_at, skipped: why, games:{}}, which weekly.py makes a
     problem at once.

   Every request to ESPN's two hosts goes through lib/netfetch.js (the download rule the NFL jobs share): a plain
   User-Agent first and then none, a 403 tried again with the next set (news/tools/pull-week.js: ESPN refuses some
   headers from GitHub's servers and takes others), a 5xx or a timeout tried again after 2 and 5 seconds, a 404 at
   once (DraftKings has posted no player lines: 'none', dated by the 404's own Date header). Any other address the
   page asks is answered 404 here (the payload is served from disk), so nothing else leaves the machine. The page
   gives up on a request after 15 seconds; at the read's deadline (150 s) every request still waiting, and every
   new one, is answered at once as not reached, so espnReadWeek always finishes, 'failed' for what was not read.

   Each answer is recorded in raw/espn/ (<sha1 of its address without the page's _= cache-buster>.json: {url,
   status, date, body}), and --offline, or PROPS_ESPN_REPLAY=<folder>, replays them: the same answers give the same
   read (an answer missing is not reached). The props gate's base run reads this run's recordings that way. An
   online run clears the recordings first.

     node espn_read.js            (from props/build, after assemble.py and the bake)
     node espn_read.js --offline  the answers raw/espn/ recorded on the last online run

   Exit 0 whenever read.json is written (a read that failed game by game included), 1 on a crash: weekly.py makes
   either a problem only, never a refusal (the last read stays published). Its log lines start "ESPN" (weekly.py
   puts them in its report) and never say "not posted yet (" nor start "BLOCKED", which the props gate reads.

   For the tests (test_espn_read.js): PROPS_ESPN_DIR (the folder for read.json and the recordings), PROPS_ESPN_PAGE,
   PROPS_ESPN_PAYLOAD, PROPS_ESPN_NOW (the run's clock and the page's, clock_now.js), PROPS_ESPN_BASE (ESPN's hosts
   at a local server: <base>/<host>/<path>), PROPS_ESPN_DEADLINE_MS. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const HERE = __dirname;
const JSDOM = require('./clock_now.js').jsdomAt('PROPS_ESPN_NOW', require(path.join(HERE, 'node_modules', 'jsdom')).JSDOM);
const { VirtualConsole } = require(path.join(HERE, 'node_modules', 'jsdom'));
const Papa = require(path.join(HERE, 'node_modules', 'papaparse'));
const { fetchRetry } = require(path.join(HERE, '..', '..', 'lib', 'netfetch.js'));

const DIR = process.env.PROPS_ESPN_DIR || path.join(HERE, '..', 'raw', 'espn');
const OFFLINE = process.argv.includes('--offline');
const REPLAY = process.env.PROPS_ESPN_REPLAY || (OFFLINE ? DIR : null);
const PAGE = process.env.PROPS_ESPN_PAGE || path.join(HERE, '..', 'app', 'prop_model_2026.html');
const PAYLOAD = process.env.PROPS_ESPN_PAYLOAD || path.join(HERE, '..', 'data', 'payload.json');
const BASE = (process.env.PROPS_ESPN_BASE || '').replace(/\/+$/, '') || null;
const DEADLINE_MS = +process.env.PROPS_ESPN_DEADLINE_MS || 150000;
const BOOT_MS = 60000;
const PAGE_URL = 'https://demon-x13.github.io/nfl-hub/props/app/';
const ESPN = /^https:\/\/(site\.api|sports\.core\.api)\.espn\.com\//;
const HEADERS = [{ 'User-Agent': 'nfl-hub-props/1.0 (+https://github.com/DEMON-X13/nfl-hub)', Accept: 'application/json' }, {}];
const READ = path.join(DIR, 'read.json');
const RECORDING = /^[0-9a-f]{40}\.json$/;

const say = s => console.log(s);
const iso = t => t == null || !isFinite(t) ? null : new Date(t).toISOString();
/* an answer's address as recorded: the page's cache-buster (_=<now>) out, so a replay finds it */
function keyOf(u) { const x = new URL(u); x.searchParams.delete('_'); return x.toString(); }
const fileOf = (dir, key) => path.join(dir, crypto.createHash('sha1').update(key).digest('hex') + '.json');
/* ESPN's address, or (the tests) the same path at a local server */
const target = u => BASE ? u.replace(/^https:\/\/([^/]+)\//, `${BASE}/$1/`) : u;

let reading = false, deadlineAt = Infinity, cut = false, requests = 0, outside = 0;
const live = new Set();
function stopAll() { cut = true; for (const ac of live) ac.abort(); }

/* one ESPN request for the page: {status, date, body} (status 0: not reached), recorded or replayed */
async function espnGet(url, pageSignal) {
  requests++;
  const key = keyOf(url);
  if (Date.now() >= deadlineAt) { cut = true; return { status: 0, date: null, body: null, why: "past the read's deadline" }; }
  if (REPLAY) {
    try { const r = JSON.parse(fs.readFileSync(fileOf(REPLAY, key), 'utf8')); return { status: +r.status || 0, date: r.date || null, body: r.body == null ? null : String(r.body) }; }
    catch (e) { return { status: 0, date: null, body: null, why: 'no recorded answer' }; }
  }
  const ac = new AbortController(); live.add(ac);
  const onAbort = () => ac.abort();
  if (pageSignal) { if (pageSignal.aborted) ac.abort(); else pageSignal.addEventListener('abort', onAbort, { once: true }); }
  let date = null;
  const aborted = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
  const f = (u, o) => ac.signal.aborted ? Promise.reject(aborted())
    : fetch(target(u), { ...o, signal: o && o.signal ? AbortSignal.any([o.signal, ac.signal]) : ac.signal })
      .then(r => { date = r.headers.get('date'); return r; });
  const sleep = ms => new Promise(res => { if (ac.signal.aborted) return res(); const t = setTimeout(res, ms); ac.signal.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true }); });
  const job = fetchRetry(url, { headers: HEADERS, retryOn: [403], waits: [2000, 5000], timeoutMs: 15000, read: 'text', fetch: f, sleep, log: () => {}, name: key.replace(/^https:\/\//, '').slice(0, 90) })
    .then(({ body, res }) => ({ status: res.status, date: res.headers.get('date'), body }),
          e => ({ status: e && e.status || 0, date: e && e.status ? date : null, body: null, why: String(e && e.message || e) }));
  const stop = new Promise(res => ac.signal.addEventListener('abort', () => res({ status: 0, date: null, body: null, stopped: true,
    why: pageSignal && pageSignal.aborted ? 'the page gave up on it' : "past the read's deadline" }), { once: true }));
  const rec = await Promise.race([job, stop]);
  live.delete(ac); if (pageSignal) pageSignal.removeEventListener('abort', onAbort);
  job.catch(() => {});
  /* an answer cut short here is not ESPN's: not recorded, so a replay reads it as not reached too */
  if (!rec.stopped) {
    try { fs.writeFileSync(fileOf(DIR, key), JSON.stringify({ url: key, status: rec.status, date: rec.date, body: rec.body })); }
    catch (e) { say(`ESPN: an answer could not be recorded (${e.message})`); }
  }
  return rec;
}

function main() {
  const t0 = Date.now();
  fs.mkdirSync(DIR, { recursive: true });
  try { fs.unlinkSync(READ); } catch (e) { /* none there */ }
  if (!REPLAY) for (const f of fs.readdirSync(DIR)) if (RECORDING.test(f)) fs.unlinkSync(path.join(DIR, f));
  const html = fs.readFileSync(PAGE, 'utf8'), payloadText = fs.readFileSync(PAYLOAD, 'utf8');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/navigation/i.test(String(e && e.message))) errs.push(String(e && e.message)); });
  const boot = setTimeout(() => { say(`ESPN: the page did not say app-ready within ${BOOT_MS / 1000}s${errs.length ? ': ' + errs.slice(0, 3).join('; ') : ''}`); process.exit(1); }, BOOT_MS);
  const dom = new JSDOM(html, { url: PAGE_URL, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      /* suggest_ledger.js's shims: the page's CSV reader, and no dialog or scroll in jsdom */
      w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      w.addEventListener('error', e => errs.push(String(e && e.message)));
      const answer = r => ({ ok: r.status === 200, status: r.status,
        headers: { get: k => String(k).toLowerCase() === 'date' ? r.date || null : null },
        json: async () => { if (r.body == null) throw new w.SyntaxError('no body'); return w.JSON.parse(r.body); },
        text: async () => r.body == null ? '' : r.body });
      w.fetch = async (u, o) => {
        const url = new URL(String(u && u.url || u), PAGE_URL);
        if (url.origin === 'https://demon-x13.github.io' && url.pathname === '/nfl-hub/props/data/payload.json')
          return answer({ status: 200, date: null, body: payloadText });
        if (!ESPN.test(url.href)) return answer({ status: 404, date: null, body: null });
        /* the read is espnReadWeek's alone: anything the page asks of ESPN on its own (it asks nothing on load) is
           not reached, and counted */
        if (!reading) { outside++; return answer({ status: 0, date: null, body: null }); }
        const sig = o && o.signal;
        const r = await espnGet(url.href, sig);
        if (sig && sig.aborted) throw new w.DOMException('The operation was aborted.', 'AbortError');
        return answer(r);
      };
    } });
  const w = dom.window;
  w.document.addEventListener('app-ready', async () => {
    clearTimeout(boot);
    try {
      const week = w.eval('currentWeek()');
      if (typeof w.espnReadWeek !== 'function' || w.eval("typeof espnReadWeek") !== 'function') {
        const why = 'the page has no espnReadWeek, the reader the job reads ESPN with';
        fs.writeFileSync(READ, JSON.stringify({ v: 1, week, read_at: iso(Date.now()), skipped: why, games: {} }, null, 1));
        say(`ESPN: read skipped: ${why}`);
        process.exit(0);
      }
      const games = w.eval(`gamesIn(${+week}).filter(g=>!gameStarted(g)&&!hasScore(g))`);
      const readAt = Date.now();
      reading = true; deadlineAt = readAt + DEADLINE_MS;
      const dl = setTimeout(stopAll, DEADLINE_MS);
      const stuck = setTimeout(() => { say(`ESPN: espnReadWeek did not return within ${(DEADLINE_MS + 30000) / 1000}s`); process.exit(1); }, DEADLINE_MS + 30000);
      const r = await w.espnReadWeek(+week, games);
      reading = false; clearTimeout(dl); clearTimeout(stuck);
      const out = {};
      for (const g of games) {
        const o = (r && r.out && r.out[g.id]) || { st: 'failed', why: 'not read' }, gl = r && r.gl && r.gl[g.id], pl = r && r.pl && r.pl[g.id];
        out[g.id] = {
          out: { st: o.st, why: o.why || null, at: (o.st === 'ok' || o.st === 'none') ? iso(o.at) : null },
          gl: gl && gl.od ? { at: iso(gl.at), lines: gl.od.lines, ids: gl.od.ids || {}, event: gl.od.event == null ? null : gl.od.event } : null,
          pl: o.st === 'ok' && pl ? pl.block : null,
          placed: o.st === 'ok' && pl ? pl.placed || {} : null,
          counts: o.st === 'ok' && pl ? pl.counts || null : null };
      }
      const doc = { v: 1, week: +week, read_at: iso(readAt), done_at: iso(Date.now()), ms: Date.now() - readAt, requests, replay: REPLAY, deadline: cut, outside, games: out };
      fs.writeFileSync(READ, JSON.stringify(doc, null, 1));
      for (const [gid, e] of Object.entries(out)) {
        const c = e.counts || {}, glw = e.gl ? 'game lines read' : 'no DraftKings game lines on the scoreboard';
        if (e.out.st === 'ok') say(`ESPN: ${gid} ok, ${c.placed} players placed of ${c.athletes}, ${c.main} lines, ${c.rungs} rungs, ${c.td} touchdowns; ${glw}`);
        else if (e.out.st === 'none') say(`ESPN: ${gid} none: DraftKings had posted no player lines for it; ${glw}`);
        else say(`ESPN: ${gid} ${e.out.st === 'kicked' ? 'kicked off' : 'failed'}: ${e.out.why}; ${glw}`);
      }
      say(`ESPN: read week ${week} (${games.length} games still to come) in ${((Date.now() - readAt) / 1000).toFixed(1)}s, ${requests} requests`
        + (REPLAY ? `, replayed from ${path.relative(process.cwd(), REPLAY) || '.'}` : '') + (cut ? ", the deadline cut it short" : '')
        + (outside ? `, ${outside} asked outside the read and not reached` : '') + (errs.length ? `; the page said: ${errs.slice(0, 3).join('; ')}` : '')
        + ` (boot and read ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      process.exit(0);
    } catch (e) {
      say(`ESPN: the read stopped: ${e && e.stack || e}`);
      process.exit(1);
    }
  });
}
try { main(); } catch (e) { say(`ESPN: the read could not start: ${e && e.stack || e}`); process.exit(1); }
