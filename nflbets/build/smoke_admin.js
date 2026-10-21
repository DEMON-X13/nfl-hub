/* Check the admin link and the hidden X tabs of the built NFL Hub page (index.html at the site's root): the
 * owner's call of 20 October 2026, X Parlays and the X Bet Log on the site owner's devices alone, "hide only".
 *
 *   node nflbets/build/smoke_admin.js        (from the hub root; it ends "N checks, 0 failures")
 *   SMOKE_ADMIN_HTML=<file> node nflbets/build/smoke_admin.js   the same on another copy of the page (a planted
 *                                                                 broken one, to see a check fail)
 *
 * The link is https://demon-x13.github.io/nfl-hub/#owner=<Odds API key>, handled by nflbets/build/admin.js in the
 * page's head (window.HUB_ADMIN). Everything here is blocking, holds at any hour and in any week (it reads nothing of
 * the week: its parlay file and X Bet Log are fixtures of its own), and never asks the real Odds API: every request
 * every boot makes is recorded and answered by stubs, The Odds API's among them (a fake key it takes, with credits
 * left in its x-requests-* headers; 401 INVALID_KEY for any other key; and boots where it fails on the network,
 * answers 429, or says the key has no credits left). A request to The Odds API on a boot that is not about the link or
 * the admin, a request off the site to anything but ESPN and The Odds API, or anything but a read, fails the run.
 *
 * What it holds:
 *  - the build: admin.js in the head right after the light/dark script, before every style and the body; the Odds
 *    API's host, apiKey= and the record's key in quotes nowhere outside it; no key in the page; exactly the two X
 *    tabs' buttons and their sections marked data-admin-only, hidden from the first paint unless the page is the
 *    admin's; the header's empty place for the admin right after the switch.
 *  - a good link: the key off the address before the body is parsed (so before the tab bar reads it), with
 *    #xparlays&owner=K keeping #xparlays; exactly one free GET of /v4/sports/?apiKey=K, no-store and with no
 *    referrer; the key kept; a reload (and the tab the link named put back first); a link pasted into an open page;
 *    the file: fallback; a refused link (nothing kept, one status line, still a visitor's page); a check that fails on
 *    the network or answers 429 (kept, not checked yet, checked again quietly on the next load, which a 200 marks
 *    checked and a refusal signs out); a key with no credits left (kept, 0 left).
 *  - the admin's page (a key kept): data-admin before the body, nine tabs, the stamp's switch then the Admin mark and
 *    a 44px Sign out button, X Parlays drawn from its file and the X Bet Log's file read, both no-store, no request to
 *    The Odds API on load; HUB_ADMIN's odds() (its two paths only, the key added by it, the headers read back), and a
 *    refused key marked so; Sign out (asked first; only the record removed; the two tabs gone, an open one landing on
 *    the board; X Parlays emptied); another tab's sign-out followed, writing nothing.
 *  - a visitor's page: seven tabs; #xparlays and #bets landing on #matchups, on load and in an open page; no request
 *    for parlays.json, xbets.json or ESPN for X Parlays, none to The Odds API; XBETS.enabled() false and ready() at
 *    once; nothing of the admin's place drawn.
 *  - what never makes an admin: the retired owner link's nflowner_v1, junk under the record's key, a record The Odds
 *    API refused (ok:false), storage that throws; the old owner link (#owner=the-old-owner-secret), refused by the
 *    format check with no request and the retired keys still taken out, and its twin on the admin's browser.
 *  - the key: in requests to api.the-odds-api.com alone, never in S, any other storage key, the address, the
 *    history's state or anything in the DOM.
 *
 * jsdom and PapaParse are borrowed from props/build (npm ci there first). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM, VirtualConsole } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
const SITE = 'https://demon-x13.github.io/nfl-hub/';
const HTML = fs.readFileSync(process.env.SMOKE_ADMIN_HTML ? path.resolve(process.env.SMOKE_ADMIN_HTML) : path.join(ROOT, 'index.html'), 'utf8');
const STATE = fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8');
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const ELO = Object.fromEntries(['players', 'model', 'matchups'].map(f => [f, fs.readFileSync(path.join(ROOT, 'elo', 'data', f + '.json'), 'utf8')]));
const PROP_KEY = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=\d{4}, KEY='([^']+)';/)[1];
const { BET_KEY, SEASON: BET_SEASON } = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
const KEY = 'nflhub_admin_v1';
/* the stub's keys: FAKE is The Odds API's (a key it takes), FAKE2 another it takes; anything else it refuses */
const FAKE = 'FAKEKEY0123456789ab', FAKE2 = 'FAKEKEY2abcdefghij01', BAD = 'NOTAKEY0123456789zz', LEFT = 412;
const ODDS_HOST = 'api.the-odds-api.com';
/* X Parlays' file and the X Bet Log for these runs: fixtures of their own, so the checks hold whatever the real
   files hold (three parlays, one cleared; three weeks and a $100 deposit) */
const FIXFILE = { updated: '2026-10-10T17:28:45Z', games: [`${BET_SEASON}_18_XXA_XXH`], parlays: [
  { id: 'fx-player', week: 18, stake: 5, price: 300, payout: 20, legs: [{ game: 0, player: 'Fixture Receiver', team: 'XXH', stat: 'receiving_yards', line: 50.5, side: 'over', main: true }] },
  { id: 'fx-team', week: 18, stake: 2, price: 120, payout: 4.4, legs: [{ game: 0, player: 'Fixture Home', team: 'XXH', stat: 'ml', line: 0, side: 'over', main: false }] },
  { id: 'fx-gone', cleared: true, week: 18, stake: 1, price: 150, payout: 2.5, legs: [{ game: 0, player: 'Fixture Runner', team: 'XXA', stat: 'rushing_yards', line: 60.5, side: 'over', main: true }] }] };
const XBFIX = { season: BET_SEASON, updated: '2026-10-10T17:28:44Z', deposit: 100, weeks: {
  w1: { staked: 10, returned: 8.71, note: '' }, w3: { staked: 11, returned: 14.66, note: '' }, w4: { staked: 8, returned: 29.02, note: '' } } };
/* a kept record, as admin.js writes it: checked, or not checked yet */
const REC = (k = FAKE, ok = true, more = {}) => JSON.stringify(Object.assign({ k, at: '2026-10-20T12:00:00.000Z', ok, checked: ok === true ? '2026-10-20T12:00:01.000Z' : null,
  left: ok === true ? 400 : null, leftAt: ok === true ? '2026-10-20T12:00:01.000Z' : null }, more));
const SEVEN = "Matchups|Props|Suggested Parlays|Parlay Builder|Team Rankings|ELO Ratings|Pick'em Record";
const NINE = "Matchups|Props|Suggested Parlays|Parlay Builder|X Parlays|Team Rankings|ELO Ratings|Pick'em Record|X Bet Log";

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
let ended = false;
function finish(why) {
  if (ended) return; ended = true;
  if (why) { checks++; fails.push(why); }
  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
}
process.on('unhandledRejection', e => { checks++; fails.push('the page threw in an async handler: ' + (e && e.stack || e)); });
setTimeout(() => finish('the admin smoke did not finish in 8 minutes: stopped with what it had'), 8 * 60 * 1000).unref();
process.on('beforeExit', () => finish('the admin smoke stopped before it finished: its body was waiting on something nothing would settle'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 4000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await wait(25); return f(); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const GC = (() => { try { require('v8').setFlagsFromString('--expose-gc'); const f = require('vm').runInNewContext('gc'); return typeof f === 'function' ? f : () => {}; } catch (e) { return () => {}; } })();
const tabsOf = d => [...d.querySelectorAll('#tabs button')].map(b => b.textContent.trim()).join('|');
const keysOf = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };
/* the kept record as JSON, {} where there is none (so a check reads a missing field rather than throwing) */
const recOf = w => { try { return JSON.parse(w.localStorage.getItem(KEY)) || {}; } catch (e) { return { junk: true }; } };

/* The Odds API, stubbed: mode 'good' (200 for FAKE and FAKE2 with their credits in the x-requests-* headers, 401
   INVALID_KEY for any other key), 'net' (a network failure), '429', '500', 'out' (401 OUT_OF_USAGE_CREDITS for the
   keys it takes, with no headers) or 'refuse' (401 DEACTIVATED_KEY for every key) */
function oddsAnswer(mode, s) {
  const u = new URL(s), k = u.searchParams.get('apiKey');
  const hdr = h => ({ get: n => Object.prototype.hasOwnProperty.call(h, String(n).toLowerCase()) ? h[String(n).toLowerCase()] : null });
  const ans = (status, body, h = {}) => Promise.resolve({ ok: status >= 200 && status < 300, status, headers: hdr(h), json: async () => JSON.parse(JSON.stringify(body)) });
  if (mode === 'net') return Promise.reject(new TypeError('Failed to fetch'));
  if (mode === '429') return ans(429, { message: 'Too many requests', error_code: 'EXCEEDED_FREQ_LIMIT' });
  if (mode === '500') return ans(500, { message: 'Internal error' });
  if (mode === 'refuse') return ans(401, { message: 'API key has been deactivated', error_code: 'DEACTIVATED_KEY' });
  if (k !== FAKE && k !== FAKE2) return ans(401, { message: 'API key is not valid', error_code: 'INVALID_KEY' });
  if (mode === 'out') return ans(401, { message: 'Usage quota has been reached', error_code: 'OUT_OF_USAGE_CREDITS' });
  const H = { 'x-requests-remaining': String(LEFT), 'x-requests-used': '88', 'x-requests-last': /\/odds$/.test(u.pathname) ? '6' : '0' };
  if (/^\/v4\/sports\/?$/.test(u.pathname)) return ans(200, [{ key: 'americanfootball_nfl', group: 'American Football', title: 'NFL', active: true }], H);
  if (/^\/v4\/sports\/americanfootball_nfl\/events$/.test(u.pathname)) return ans(200, [], H);
  if (/^\/v4\/sports\/americanfootball_nfl\/events\/[0-9a-f]{32}\/odds$/.test(u.pathname)) return ans(200, { id: 'x', bookmakers: [] }, H);
  return ans(404, { message: 'Not found' });
}
/* every request of every boot, and the ones that broke the rules */
const BAD_CALLS = [];
/* a boot of the page. url: its address; seed(w): what the browser holds before it opens; odds: The Odds API's mode
   (a string, or a function of the request's url and its number on this boot), oddsOk: whether this boot may ask it
   at all (a boot about the link or the admin's page; any other that asks it fails the run). Resolves once the prop
   model is up (app-ready) and the boot's own settle time has passed. Every request is in calls, with its method,
   cache mode, referrer policy, credentials and headers; navs counts the navigations jsdom refused (a reload); seen
   records, in order, each replaceState and each data-admin set, with whether the body existed then */
function boot({ url = SITE, seed = null, odds = 'good', oddsOk = false, file = FIXFILE, xbets = XBFIX, settle = 300 } = {}) {
  GC();
  return new Promise(resolve => {
    const errs = [], calls = [], seen = [], navs = [];
    /* a visitor's boot turned into one about the link (a link pasted into the open page) */
    const allowOdds = () => { oddsOk = true; };
    let nOdds = 0;
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { const m = String(e && e.message); if (/navigation/i.test(m)) navs.push(m); else errs.push('jsdom: ' + m); });
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: vc,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        w.addEventListener('error', e => errs.push(e.message));
        const RS = w.History.prototype.replaceState;
        w.History.prototype.replaceState = function (st, t, u) { seen.push({ ev: 'replaceState', u: String(u), href: w.location.href, body: !!w.document.body }); return RS.apply(this, arguments); };
        const SA = w.Element.prototype.setAttribute;
        w.Element.prototype.setAttribute = function (n, v) { if (n === 'data-admin') seen.push({ ev: 'data-admin ' + v, href: w.location.href, body: !!w.document.body }); return SA.apply(this, arguments); };
        if (seed) seed(w);
        const answer = (ok, body) => Promise.resolve({ ok, status: ok ? 200 : 404, headers: { get: () => null }, json: async () => typeof body === 'string' ? JSON.parse(body) : JSON.parse(JSON.stringify(body)) });
        w.fetch = (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase();
          let host = ''; try { host = new URL(s, w.location.href).host; } catch (e) {}
          calls.push({ url: s, host, method: m, cache: o && o.cache || null, referrerPolicy: o && o.referrerPolicy || null, credentials: o && o.credentials || null, headers: o && o.headers || null, body: !!(w.document && w.document.body) });
          if (m !== 'GET') { BAD_CALLS.push(m + ' ' + s); return Promise.reject(new TypeError('Failed to fetch')); }
          if (host === ODDS_HOST) {
            if (!oddsOk) { BAD_CALLS.push('The Odds API asked on a visitor\'s boot: ' + s.replace(/apiKey=[^&]*/, 'apiKey=…')); return Promise.reject(new TypeError('Failed to fetch')); }
            nOdds++; const md = typeof odds === 'function' ? odds(s, nOdds) : odds; return oddsAnswer(md, s); }
          if (/espn\.com$/.test(host)) return answer(true, s.includes('/summary') ? {} : { events: [] });
          if (host !== new URL(SITE).host && !/^file:/.test(s) && !/^file:/.test(w.location.href)) { BAD_CALLS.push('off the site: ' + s); return Promise.reject(new TypeError('Failed to fetch')); }
          if (s.includes('payload.json')) return answer(true, PAYLOAD);
          if (s.includes('state.json')) return answer(true, STATE);
          if (s.includes('parlays.json')) return answer(file != null, file);
          if (s.includes('xbets.json')) return answer(xbets != null, xbets);
          for (const f of Object.keys(ELO)) if (s.includes(`elo/data/${f}.json`)) return answer(true, ELO[f]);
          return answer(false, null); };
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, errs, calls, seen, navs, allowOdds }), settle));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs, calls, seen, navs, allowOdds, timedOut: true }), 30000);
  });
}
/* the requests a boot made to The Odds API, to the site's X files, and to ESPN for X Parlays (its own reads carry a
   cache-buster, &_=, which the board's and Refresh odds' do not end on) */
const oddsCalls = R => R.calls.filter(c => c.host === ODDS_HOST);
const xCalls = R => R.calls.filter(c => /liveparlays\/(parlays|xbets)\.json/.test(c.url) || /scoreboard\?seasontype=\d&week=\d+&dates=\d{4}&_=\d+$/.test(c.url) || /\/summary\?event=[^&]*&_=\d+$/.test(c.url));
const isCheck = (c, k) => c.url === `https://${ODDS_HOST}/v4/sports/?apiKey=${encodeURIComponent(k)}` && c.method === 'GET' && c.cache === 'no-store' && c.referrerPolicy === 'no-referrer' && !c.credentials && !c.headers;
/* the key, wherever it should never be: S, any other storage key, the address, the history's state, the DOM's
   text and attributes, a request to anything but The Odds API */
function keyNowhere(R, k, what) {
  const { w, d } = R, bad = [];
  let S = ''; try { S = String(w.eval('JSON.stringify(typeof S==="object"?S:null)')); } catch (e) {}
  if (S.includes(k)) bad.push('S');
  for (const [kk, v] of Object.entries(keysOf(w))) if (kk !== KEY && (String(v).includes(k) || kk.includes(k))) bad.push('storage ' + kk);
  if (w.location.href.includes(k)) bad.push('the address');
  try { if (JSON.stringify(w.history.state || null).includes(k)) bad.push("the history's state"); } catch (e) {}
  if (d.documentElement.outerHTML.includes(k)) bad.push('the DOM');
  for (const c of R.calls) if (c.url.includes(k) && c.host !== ODDS_HOST) bad.push('a request to ' + c.host);
  chk(!bad.length, `${what}: the admin key is somewhere it must never be: ${bad.join(', ')}`);
}
/* the head's script alone on a page of its own, for the cases that need nothing else: what a kept value reads as,
   the link's address handling, storage that cannot be reached */
const ADMIN_JS = (() => { const head = HTML.slice(0, HTML.indexOf('</head>')); const m = [...head.matchAll(/<script>\n?([\s\S]*?)<\/script>/g)].find(x => x[1].includes(`KEY='${KEY}'`)); return m ? m[1] : ''; })();
function mini({ url = SITE, seed = null, odds = 'good', oddsOk = true } = {}) {
  const errs = [], calls = [], navs = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { const m = String(e && e.message); if (/navigation/i.test(m)) navs.push(m); else errs.push('jsdom: ' + m); });
  const dom = new JSDOM(`<!DOCTYPE html><html lang="en"><head><script>${ADMIN_JS}</script></head><body><header><div class="hub-stamp"><button type="button" data-theme-toggle></button><span class="hub-admin" id="hubAdmin" hidden></span></div></header><nav id="tabs"><button data-tab="pickems" aria-selected="true">Matchups</button><button data-tab="xparlays" data-admin-only>X Parlays</button></nav></body></html>`,
    { runScripts: 'dangerously', url, virtualConsole: vc, beforeParse(w) { w.addEventListener('error', e => errs.push(e.message)); w.confirm = () => true;
      w.fetch = (u, o) => { const s = String(u); let host = ''; try { host = new URL(s).host; } catch (e) {} calls.push({ url: s, host, method: String((o && o.method) || 'GET').toUpperCase(), cache: o && o.cache || null, referrerPolicy: o && o.referrerPolicy || null, credentials: o && o.credentials || null, headers: o && o.headers || null });
        if (host === ODDS_HOST && oddsOk) return oddsAnswer(odds, s); BAD_CALLS.push('mini page: ' + s); return Promise.reject(new TypeError('Failed to fetch')); };
      if (seed) seed(w); } });
  return { w: dom.window, d: dom.window.document, errs, calls, navs };
}

(async () => {
  /* ======================= the build ======================= */
  { const head = HTML.slice(0, HTML.indexOf('</head>')), at = HTML.indexOf('<script>\n' + ADMIN_JS), theme = head.indexOf("KEY='nflhub_theme_v1'");
    chk(!!ADMIN_JS && at > 0 && at < head.indexOf('<style') && at < HTML.indexOf('<body') && theme > 0 && theme < at && !/<script>[\s\S]*?<\/script>\n<script>\n/.test(head.slice(head.indexOf('</script>', theme) + 9, at)),
      "the admin link's script is not in the page's head right after the light/dark script, before every style and the body");
    const rest = HTML.split(ADMIN_JS).join('\n');
    chk(HTML.split(ADMIN_JS).length === 2 && !/api\.the-odds-api\.com/i.test(rest) && !/apiKey=/.test(rest) && !/['"`]nflhub_admin_v1['"`]/.test(rest) && !/apiKey=[A-Za-z0-9]{16,}/.test(HTML),
      "the page names The Odds API's host, an apiKey= parameter or the admin record's key outside admin.js, or carries a key: " + ((rest.match(/.{0,50}(api\.the-odds-api\.com|apiKey=|['"`]nflhub_admin_v1['"`]).{0,30}/i) || [''])[0]));
    const nav = HTML.slice(HTML.indexOf('<nav role="tablist" id="tabs">'), HTML.indexOf('</nav>', HTML.indexOf('<nav role="tablist" id="tabs">')));
    const marked = [...nav.matchAll(/<button role="tab" data-tab="([^"]+)"[^>]*\sdata-admin-only[\s>]/g)].map(m => m[1]).join();
    const secs = [...HTML.matchAll(/<section id="(tab-[^"]+)"[^>]*\sdata-admin-only[\s>]/g)].map(m => m[1]).sort().join();
    chk(marked === 'xparlays,bets' && (nav.match(/data-admin-only/g) || []).length === 2 && secs === 'tab-bets,tab-xparlays' && (HTML.match(/<section [^>]*data-admin-only/g) || []).length === 2,
      `the X tabs are not exactly the two marked the admin's alone (buttons ${marked || 'none'}, sections ${secs || 'none'})`);
    const css = (head.match(/<style id="hubTheme">\n?([\s\S]*?)<\/style>/) || [])[1] || '';
    chk(/html:not\(\[data-admin="on"\]\) #tabs \[data-admin-only\]\{display:none!important\}/.test(css) && /\.hub-admin\[hidden\]\{display:none\}/.test(css),
      'the hub look does not hide the X tabs from the first paint unless the page is the admin\'s, or does not keep the admin\'s place hidden while empty');
    const stamp = (HTML.match(/<div class="hub-stamp">([\s\S]*?)<\/div>/) || [])[1] || '';
    chk(/^<button type="button" class="hub-theme" data-theme-toggle[^>]*>[\s\S]*?<\/button><span class="hub-admin" id="hubAdmin" hidden><\/span><span class="sub grow" id="saveState"><\/span><span class="sub" id="buildTag"><\/span>$/.test(stamp),
      "the header's stamp is not the switch, then the admin's empty, hidden place, then when the data was built and the build: " + stamp.replace(/<svg[\s\S]*?<\/svg>/g, '').slice(0, 200)); }

  /* ======================= a visitor's page ======================= */
  { const V = await boot({ url: SITE + '#xparlays' });
    const { w, d } = V;
    chk(!V.timedOut && V.errs.length === 0, "a visitor's page did not come up, or threw: " + V.errs.join('; '));
    chk(tabsOf(d) === SEVEN && !d.querySelector('[data-tab="xparlays"], [data-tab="bets"]'), "a visitor's tab bar is not the seven tabs, with the X tabs taken off it: " + tabsOf(d));
    chk(w.location.hash === '#matchups' && !d.getElementById('tab-pickems').hidden && d.getElementById('tab-xparlays').hidden && d.getElementById('tab-bets').hidden,
      "a visitor's #xparlays does not land on the Matchups board, written over as #matchups: " + w.location.hash);
    chk(d.documentElement.getAttribute('data-admin') == null && w.HUB_ADMIN && w.HUB_ADMIN.on() === false && w.HUB_ADMIN.info() === null,
      "a visitor's page with nothing kept is taken for the admin's");
    chk(xCalls(V).length === 0, "a visitor's page asked for X Parlays' or the X Bet Log's file, or ESPN for X Parlays: " + xCalls(V).map(c => c.url).join(', '));
    chk(oddsCalls(V).length === 0, "a visitor's page asked The Odds API something");
    chk(txt(d.getElementById('app')) === '' && txt(d.getElementById('lpUpdated')) === '', 'X Parlays drew something on a visitor\'s page: ' + txt(d.getElementById('app')).slice(0, 80));
    chk(w.XBETS && w.XBETS.enabled() === false, "a visitor's page has an X Bet Log (XBETS.enabled())");
    { const n0 = V.calls.length, r = await Promise.race([w.XBETS.ready().then(() => 'done'), wait(150).then(() => 'slow')]);
      chk(r === 'done' && V.calls.length === n0, "a visitor's XBETS.ready() does not resolve at once with no request"); }
    { const ha = d.getElementById('hubAdmin'), shown = d.body.cloneNode(true); shown.querySelectorAll('script, style').forEach(n => n.remove());
      chk(!!ha && ha.hidden && ha.innerHTML === '' && !/\bSign out\b|\bAdmin key\b|admin link/i.test(txt(shown)) && !d.querySelector('.ha-mark, .ha-out, [data-admin-out]'),
        "a visitor's page draws something of the admin's place: " + (ha ? ha.outerHTML.slice(0, 120) : 'no #hubAdmin')); }
    /* an address in an open page: the X tabs' land on the board too */
    for (const h of ['#bets', '#xparlays']) { w.location.hash = h; await until(() => w.location.hash === '#matchups', 1500);
      chk(w.location.hash === '#matchups' && !d.getElementById('tab-pickems').hidden && d.getElementById('tab-xparlays').hidden && d.getElementById('tab-bets').hidden,
        `in a visitor's open page, ${h} does not land on the Matchups board: ${w.location.hash}`); }
    chk(xCalls(V).length === 0 && oddsCalls(V).length === 0, "a visitor's page asked for an X file, ESPN for X Parlays or The Odds API after the addresses changed");

    /* ---- a link pasted into this open page: taken off the address in the hashchange, before the tab bar reads it ---- */
    { const s0 = V.seen.length; V.allowOdds(); w.location.hash = '#owner=' + FAKE;
      await until(() => !!w.localStorage.getItem(KEY) && V.navs.length > 0, 3000);
      const rs = V.seen.slice(s0).filter(x => x.ev === 'replaceState'), first = rs[0], rec = recOf(w), oc = oddsCalls(V);
      chk(!!first && !first.u.includes(FAKE) && !w.location.href.includes(FAKE) && !rs.some(x => x.u.includes('owner=')),
        'a link pasted into an open page is not taken off the address at once: ' + rs.map(x => x.u).join(' > ') + ' / ' + w.location.href.replace(FAKE, 'K'));
      chk(oc.length === 1 && isCheck(oc[0], FAKE), 'a link pasted into an open page is not checked by exactly one free GET of /v4/sports/, no-store and with no referrer: ' + oc.map(c => c.url.replace(FAKE, 'K')).join(', '));
      chk(rec && rec.k === FAKE && rec.ok === true && rec.left === LEFT && !!rec.checked && !!rec.leftAt && V.navs.length === 1,
        'a link pasted into an open page is not kept, checked, with its credits left, and the page reloaded: ' + JSON.stringify(rec && Object.assign({}, rec, { k: rec.k && 'K' })) + ' / reloads ' + V.navs.length);
      keyNowhere(V, FAKE, 'a link pasted into an open page'); }
    w.close(); }
  /* a link pasted into a tab that loaded as a visitor's after another tab of the site had kept the key (checked, or
     waiting for its quiet check): nothing to ask, but this tab is still a visitor's, so it reloads, once and with no
     request, at the tab the link named (put back after the tab bar wrote a visitor's #xparlays over as #matchups) */
  for (const [link, want, rec, what] of [['#xparlays&owner=' + FAKE, '#xparlays', REC(), 'kept and checked'], ['#owner=' + FAKE, '', REC(FAKE, null), 'kept, not checked yet']]) {
    const V = await boot({ url: SITE });
    const { w, d } = V, n0 = V.calls.length;
    chk(!V.timedOut && w.HUB_ADMIN.on() === false && tabsOf(d) === SEVEN, `a visitor's tab (for the link pasted after another tab ${what} the key) did not come up as a visitor's`);
    w.localStorage.setItem(KEY, rec);
    w.location.hash = link;
    await until(() => V.navs.length > 0, 1500); await wait(120);
    chk(V.navs.length === 1 && oddsCalls(V).length === 0 && w.location.hash === want && !w.location.href.includes(FAKE) && w.localStorage.getItem(KEY) === rec,
      `a link pasted into a visitor's tab after another tab ${what} its key does not reload that tab exactly once, with no request to The Odds API, at ${want || 'no tab'}: reloads ${V.navs.length}, Odds API requests ${oddsCalls(V).length}, address ${w.location.hash.replace(FAKE, 'K') || '(none)'}, record ${w.localStorage.getItem(KEY) === rec ? 'as kept' : 'changed'}`);
    chk(V.calls.slice(n0).every(c => c.host !== ODDS_HOST) && V.errs.length === 0, `a link pasted into a visitor's tab after another tab ${what} its key asked The Odds API, or the page threw: ` + V.errs.join('; '));
    keyNowhere(V, FAKE, `a link pasted into a visitor's tab after another tab ${what} its key`);
    w.close(); }
  { const V = await boot({ url: SITE + '#bets' });
    chk(V.w.location.hash === '#matchups' && !V.d.getElementById('tab-pickems').hidden && V.d.getElementById('tab-bets').hidden && tabsOf(V.d) === SEVEN && xCalls(V).length === 0,
      "a visitor's #bets does not land on the Matchups board with seven tabs and no X file read: " + V.w.location.hash);
    V.w.close(); }

  /* ======================= a good link ======================= */
  { const R = await boot({ url: SITE + '#owner=' + FAKE, oddsOk: true });
    await until(() => R.navs.length > 0, 3000);
    const rs = R.seen.filter(x => x.ev === 'replaceState'), oc = oddsCalls(R), rec = recOf(R.w);
    chk(!!rs[0] && !rs[0].body && !rs[0].u.includes('owner=') && rs[0].u === '/nfl-hub/', "a good link is not taken off the address before the page's body is parsed: " + rs.map(x => (x.body ? 'body ' : 'head ') + x.u.replace(FAKE, 'K')).join(' > '));
    chk(oc.length === 1 && isCheck(oc[0], FAKE) && !oc[0].body, 'a good link is not checked by exactly one free GET of /v4/sports/?apiKey=K, no-store, no referrer, no credentials or headers, from the head: ' + oc.map(c => c.url.replace(FAKE, 'K')).join(', '));
    chk(rec && rec.k === FAKE && rec.ok === true && rec.left === LEFT && !isNaN(Date.parse(rec.at)) && !isNaN(Date.parse(rec.checked)) && !isNaN(Date.parse(rec.leftAt)),
      'a good link\'s key is not kept, checked, with its credits left: ' + JSON.stringify(rec && Object.assign({}, rec, { k: rec.k === FAKE ? 'K' : rec.k })));
    chk(R.navs.length === 1, 'a good link does not reload the page once its key is kept: ' + R.navs.length);
    chk(!R.d.getElementById('hubAdmin').querySelector('.ha-msg') && R.errs.length === 0, 'a good link says it was refused, or the page threw: ' + R.errs.join('; '));
    keyNowhere(R, FAKE, 'a good link');
    R.w.close(); }
  /* the tab the link named: kept on the address before the body, and put back for the reload after this load (a
     visitor's) landed it on the board */
  { const R = await boot({ url: SITE + '#xparlays&owner=' + FAKE, oddsOk: true });
    await until(() => R.navs.length > 0, 3000);
    const rs = R.seen.filter(x => x.ev === 'replaceState');
    chk(!!rs[0] && !rs[0].body && rs[0].u === '/nfl-hub/#xparlays', '#xparlays&owner=K does not keep #xparlays as it takes the key off the address before the body: ' + rs.map(x => x.u.replace(FAKE, 'K')).join(' > '));
    chk(R.navs.length === 1 && R.w.location.hash === '#xparlays' && recOf(R.w).k === FAKE, '#xparlays&owner=K does not reload at #xparlays once its key is kept: ' + R.w.location.hash + ' / reloads ' + R.navs.length);
    keyNowhere(R, FAKE, '#xparlays&owner=K');
    R.w.close(); }
  /* the same key again, already kept and checked: no request and no reload; a key kept but not checked: no second check */
  { const R = await boot({ url: SITE + '#owner=' + FAKE, oddsOk: true, seed: w => w.localStorage.setItem(KEY, REC()) });
    chk(oddsCalls(R).length === 0 && R.navs.length === 0 && !R.w.location.href.includes(FAKE) && R.w.localStorage.getItem(KEY) === REC() && tabsOf(R.d) === NINE,
      'a link whose key is already kept and checked costs a request or a reload, or changes the record: ' + oddsCalls(R).length + ' / ' + R.navs.length);
    R.w.close(); }
  /* the address handling on a page of its own: the parts around the key kept in order; only the fragment counts */
  for (const [h, want, asked] of [['#a&owner=' + FAKE + '&b', '#a&b', 1], ['#owner=' + FAKE + '&bets', '#bets', 1], ['#owner=%20' + FAKE + '%20', '', 1], ['#lowner=' + FAKE, '#lowner=' + FAKE, 0], ['#owner=', '', 0]]) {
    const M = mini({ url: SITE + h }); await wait(60);
    chk(M.w.location.hash === want && M.calls.length === asked && M.errs.length === 0, `the link ${h.replace(FAKE, 'K')} leaves the address ${M.w.location.hash.replace(FAKE, 'K')} (not ${want.replace(FAKE, 'K')}) or asks The Odds API ${M.calls.length} times (not ${asked})`);
    M.w.close(); }
  { const M = mini({ url: SITE + '?owner=' + FAKE }); await wait(60);
    chk(M.calls.length === 0 && M.w.localStorage.getItem(KEY) == null, 'a key in the query (?owner=, which reaches GitHub\'s servers) is taken as a link');
    M.w.close(); }

  /* ======================= a refused link, and the checks that are not answered ======================= */
  { const R = await boot({ url: SITE + '#owner=' + BAD, oddsOk: true });
    await until(() => !!R.d.querySelector('#hubAdmin .ha-msg'), 3000); await wait(50);
    const ha = R.d.getElementById('hubAdmin'), msg = R.d.querySelector('#hubAdmin .ha-msg');
    chk(oddsCalls(R).length === 1 && isCheck(oddsCalls(R)[0], BAD) && R.w.localStorage.getItem(KEY) == null && R.navs.length === 0,
      'a link The Odds API refuses is not checked once and then left: nothing kept, no reload');
    chk(!!msg && !ha.hidden && msg.getAttribute('role') === 'status' && txt(msg) === 'The Odds API refused that admin link.' && txt(ha) === txt(msg) && !ha.querySelector('.ha-mark, .ha-out'),
      'a refused link does not say so in one status line, and nothing else, in the header: ' + (ha ? ha.innerHTML.slice(0, 160) : 'no #hubAdmin'));
    chk(tabsOf(R.d) === SEVEN && R.d.documentElement.getAttribute('data-admin') == null && !R.w.location.href.includes(BAD) && R.errs.length === 0,
      'a refused link leaves the page the admin\'s, the key on the address, or threw: ' + tabsOf(R.d));
    R.w.close(); }
  for (const [mode, what] of [['net', 'a check that fails on the network'], ['429', 'a check answered 429'], ['500', 'a check answered 500']]) {
    const R = await boot({ url: SITE + '#owner=' + FAKE, oddsOk: true, odds: mode });
    await until(() => R.navs.length > 0, 3000);
    const rec = recOf(R.w);
    chk(oddsCalls(R).length === 1 && rec && rec.k === FAKE && rec.ok === null && rec.checked === null && rec.left === null && R.navs.length === 1 && !R.d.querySelector('#hubAdmin .ha-msg'),
      `${what}: the key is not kept as not checked yet (ok:null), the page reloaded: ` + JSON.stringify(rec && Object.assign({}, rec, { k: 'K' })) + ' / reloads ' + R.navs.length);
    R.w.close(); }
  { const R = await boot({ url: SITE + '#owner=' + FAKE, oddsOk: true, odds: 'out' });
    await until(() => R.navs.length > 0, 3000);
    const rec = recOf(R.w);
    chk(rec && rec.k === FAKE && rec.ok === true && rec.left === 0 && !!rec.checked && R.navs.length === 1, 'a key with no credits left (401 OUT_OF_USAGE_CREDITS) is not kept, checked, with 0 left: ' + JSON.stringify(rec && Object.assign({}, rec, { k: 'K' })));
    R.w.close(); }
  /* a key kept but not checked yet: the admin's page, checked again quietly on load, and then checked, or signed out */
  { const R = await boot({ oddsOk: true, seed: w => w.localStorage.setItem(KEY, REC(FAKE, null)) });
    await until(() => recOf(R.w) && recOf(R.w).ok === true, 3000); await wait(30);
    const rec = recOf(R.w), mark = R.d.querySelector('#hubAdmin .ha-mark');
    chk(tabsOf(R.d) === NINE && R.d.documentElement.getAttribute('data-admin') === 'on' && oddsCalls(R).length === 1 && isCheck(oddsCalls(R)[0], FAKE) && R.navs.length === 0,
      'a key kept but not checked yet does not load the admin\'s page and check it once, quietly (no reload): ' + tabsOf(R.d) + ' / ' + oddsCalls(R).length);
    chk(rec && rec.ok === true && rec.left === LEFT && !!rec.checked && !!mark && /^Admin key checked .+; 412 credits left as of .+$/.test(mark.getAttribute('title') || ''),
      'a key checked quietly on load is not marked checked, with its credits, on the record and the Admin mark\'s title: ' + (mark ? mark.getAttribute('title') : 'no mark'));
    R.w.close(); }
  { const R = await boot({ oddsOk: true, odds: 'net', seed: w => w.localStorage.setItem(KEY, REC(FAKE, null)) });
    await until(() => oddsCalls(R).length > 0, 3000); await wait(50);
    const mark = R.d.querySelector('#hubAdmin .ha-mark');
    chk(tabsOf(R.d) === NINE && !!mark && mark.getAttribute('title') === 'Admin key not checked yet' && recOf(R.w).ok === null,
      'a key not checked yet whose check fails again is not still the admin\'s, marked not checked yet: ' + (mark ? mark.getAttribute('title') : 'no mark'));
    R.w.close(); }
  { const R = await boot({ url: SITE + '#xparlays', oddsOk: true, odds: 'refuse', seed: w => w.localStorage.setItem(KEY, REC(FAKE, null)) });
    await until(() => R.w.localStorage.getItem(KEY) == null, 3000); await until(() => !R.d.querySelector('[data-tab="xparlays"]'), 1500);
    chk(R.w.localStorage.getItem(KEY) == null && R.w.HUB_ADMIN.on() === false && R.d.documentElement.getAttribute('data-admin') == null && tabsOf(R.d) === SEVEN
      && R.w.location.hash === '#matchups' && !R.d.getElementById('tab-pickems').hidden && R.d.getElementById('tab-xparlays').hidden && R.d.getElementById('hubAdmin').hidden,
      'a key not checked yet that The Odds API then refuses does not sign this browser out, its X tabs gone and the board open: ' + tabsOf(R.d) + ' / ' + R.w.location.hash);
    R.w.close(); }

  /* ======================= the file: fallback (jsdom refuses replaceState on a file: address) =======================
     jsdom gives a page opened from disk no storage either (a browser does), so there the key cannot be kept: the
     page says so and does not reload. Where storage is there, the key is kept and the page reloads */
  { const R = await boot({ url: 'file:///home/owner/nfl-hub/index.html#owner=' + FAKE, oddsOk: true });
    await until(() => R.navs.length > 0 || !!R.d.querySelector('#hubAdmin .ha-msg'), 3000); await wait(30);
    let store = true; try { void R.w.localStorage.length; } catch (e) { store = false; }
    const rs = R.seen.filter(x => x.ev === 'replaceState'), rec = store ? recOf(R.w) : null;
    chk(!R.w.location.href.includes(FAKE) && !R.w.location.href.includes('owner=') && /index\.html#?$/.test(R.w.location.href) && !rs.some(x => x.u.includes(FAKE)) && oddsCalls(R).length === 1 && isCheck(oddsCalls(R)[0], FAKE),
      'a link opened from disk is not taken off the address by the fallback (location.replace) and checked once: ' + R.w.location.href.replace(FAKE, 'K'));
    chk(store ? (rec && rec.k === FAKE && rec.ok === true && R.navs.length === 1)
      : (R.navs.length === 0 && txt(R.d.getElementById('hubAdmin')) === 'This browser would not keep the admin key.' && R.w.HUB_ADMIN.on() === false),
      'a link opened from disk is not kept and the page reloaded, or, with no storage, does not say the key could not be kept: ' + txt(R.d.getElementById('hubAdmin')) + ' / reloads ' + R.navs.length);
    chk(R.errs.length === 0, 'the page opened from disk with a link threw: ' + R.errs.join('; '));
    R.w.close(); }

  /* ======================= the admin's page ======================= */
  { const W = Symbol('writes');
    const A = await boot({ url: SITE + '#xparlays', oddsOk: true, seed: w => { w.localStorage.setItem(KEY, REC());
      const P = w.Storage.prototype, s = P.setItem, r = P.removeItem; w[W] = null;
      P.setItem = function (k, v) { if (w[W]) w[W].push('set ' + k); return s.call(this, k, v); };
      P.removeItem = function (k) { if (w[W]) w[W].push('remove ' + k); return r.call(this, k); }; } });
    const { w, d } = A;
    await until(() => d.querySelectorAll('#lpCard .savedp').length === 2, 4000);
    chk(!A.timedOut && A.errs.length === 0, "the admin's page did not come up, or threw: " + A.errs.join('; '));
    { const on = A.seen.findIndex(x => x.ev === 'data-admin on');
      chk(on >= 0 && !A.seen[on].body && d.documentElement.getAttribute('data-admin') === 'on', "the admin's page is not marked data-admin=\"on\" before its body is parsed: " + A.seen.map(x => x.ev + (x.body ? ' (body)' : ' (head)')).join(' > ')); }
    chk(tabsOf(d) === NINE && d.querySelectorAll('#tabs [data-admin-only]').length === 2, "the admin's tab bar is not the nine tabs: " + tabsOf(d));
    chk(w.location.hash === '#xparlays' && !d.getElementById('tab-xparlays').hidden && d.querySelector('#tabs [data-tab="xparlays"]').getAttribute('aria-selected') === 'true',
      "the admin's #xparlays does not open X Parlays: " + w.location.hash);
    { const st = d.querySelector('header .hub-stamp'), kids = st ? [...st.children] : [], ha = d.getElementById('hubAdmin');
      const mark = ha && ha.querySelector('.ha-mark'), out = ha && ha.querySelector('.ha-out'), nav = d.getElementById('tabs');
      chk(kids.map(k => k.id || k.className).join('|') === 'hub-theme|hubAdmin|saveState|buildTag' && !ha.hidden && !!mark && txt(mark) === 'Admin' && !!out && txt(ha) === 'Admin Sign out'
        && !!(ha.compareDocumentPosition(nav) & w.Node.DOCUMENT_POSITION_FOLLOWING),
        "the admin's stamp is not the switch, then the Admin mark and Sign out, then the rest, before the tabs: " + kids.map(k => k.id || k.className).join('|') + ' / ' + (ha ? txt(ha) : 'no #hubAdmin'));
      chk(!!out && out.tagName === 'BUTTON' && out.type === 'button' && out.hasAttribute('data-admin-out') && !d.querySelector('header a'), "Sign out is not a button (the header carries no link)");
      if (out) { const cs = w.getComputedStyle(out), px = p => parseFloat(cs.getPropertyValue(p)) || 0, lh = parseFloat(w.getComputedStyle(ha).getPropertyValue('line-height'));
        const css = (HTML.match(/\n\.ha-out\{([^}]*)\}/) || [])[1] || '';
        chk(px('padding-top') === 13 && px('padding-bottom') === 13 && px('margin-top') === -13 && px('margin-bottom') === -13 && lh === 18 && /(^|;)font:inherit(;|$)/.test(css),
          `Sign out's tap target is not 44px tall (18px of line and 13px of padding a side, taken back out by its margin): padding ${px('padding-top')}/${px('padding-bottom')}, margin ${px('margin-top')}/${px('margin-bottom')}, line ${lh}`); }
      chk(!!mark && /^Admin key checked .+; 400 credits left as of .+$/.test(mark.getAttribute('title') || ''), "the Admin mark's title does not say when the key was checked and the credits left: " + (mark ? mark.getAttribute('title') : 'no mark')); }
    chk(oddsCalls(A).length === 0, "the admin's page with a checked key asked The Odds API on load: " + oddsCalls(A).length);
    { const lp = d.getElementById('lpCard');
      chk(lp.querySelectorAll('.savedp').length === 2 && /Fixture Home/.test(txt(lp)) && /Fixture Receiver/.test(txt(lp)) && !/Fixture Runner/.test(txt(lp)),
        "the admin's X Parlays does not draw exactly the file's two parlays not cleared: " + txt(lp).slice(0, 160)); }
    chk(['liveparlays/parlays.json', 'liveparlays/xbets.json'].every(f => A.calls.some(c => c.url.replace(/\?.*$/, '') === f && c.method === 'GET' && c.cache === 'no-store')),
      "the admin's page does not read X Parlays' file and the X Bet Log's on load, no-store");
    await w.XBETS.ready();
    { const x = w.XBETS.get();
      chk(w.XBETS.enabled() === true && JSON.stringify(Object.keys(x.weeks)) === '["1","3","4"]' && x.deposit === 100, "the admin's X Bet Log is not the file's: " + JSON.stringify(x)); }
    { const info = w.HUB_ADMIN.info(), own = Object.keys(w.HUB_ADMIN).filter(k => typeof w.HUB_ADMIN[k] !== 'function');
      chk(w.HUB_ADMIN.on() === true && !!info && info.ok === true && info.left === 400 && !('k' in info) && !JSON.stringify(info).includes(FAKE) && own.length === 0,
        "HUB_ADMIN does not say the page is the admin's, or hands out the key: " + JSON.stringify(info) + ' ' + own.join()); }

    /* ---- HUB_ADMIN.odds(): the one sender of the key, to its two paths alone ---- */
    { const n0 = oddsCalls(A).length, EV = 'a'.repeat(32);
      const no = e => ({ status: 'rejected: ' + (e && e.message), json: null });
      const ok1 = await w.HUB_ADMIN.odds('sports/americanfootball_nfl/events', { dateFormat: 'iso' }).catch(no);
      const ok2 = await w.HUB_ADMIN.odds(`sports/americanfootball_nfl/events/${EV}/odds`, { regions: 'us', markets: 'player_pass_yds,player_reception_yds', bookmakers: 'draftkings', includeSids: 'true' }).catch(no);
      const oc = oddsCalls(A).slice(n0);
      chk(oc.length === 2 && oc[0].url === `https://${ODDS_HOST}/v4/sports/americanfootball_nfl/events?apiKey=${FAKE}&dateFormat=iso`
        && oc[1].url === `https://${ODDS_HOST}/v4/sports/americanfootball_nfl/events/${EV}/odds?apiKey=${FAKE}&regions=us&markets=player_pass_yds%2Cplayer_reception_yds&bookmakers=draftkings&includeSids=true`
        && oc.every(c => c.method === 'GET' && c.cache === 'no-store' && c.referrerPolicy === 'no-referrer' && !c.credentials && !c.headers),
        'HUB_ADMIN.odds() does not send exactly a GET of its path with the key added, no-store and with no referrer: ' + oc.map(c => c.url.replace(FAKE, 'K')).join(' | '));
      chk(ok1.status === 200 && ok1.ok === true && Array.isArray(ok1.json) && ok1.left === LEFT && ok1.used === 88 && ok1.last === 0 && ok2.last === 6 && ok2.code === null && recOf(w).left === LEFT,
        "HUB_ADMIN.odds() does not resolve the answer with The Odds API's credits headers, or keep the credits left: " + JSON.stringify([ok1, ok2].map(a => ({ status: a.status, left: a.left, used: a.used, last: a.last }))));
      const n1 = oddsCalls(A).length, refused = [];
      for (const [p, q] of [['sports/americanfootball_nfl/odds', null], ['sports/basketball_nba/events', null], [`sports/americanfootball_nfl/events/${EV}/odds/../../x`, null], ['https://evil.example/v4/sports/', null],
        ['sports/americanfootball_nfl/events', { apiKey: 'X' }], [`sports/americanfootball_nfl/events/${EV.toUpperCase()}/odds`, null], [null, null]]) {
        try { await w.HUB_ADMIN.odds(p, q); refused.push('sent ' + p); } catch (e) { /* refused, as it must be */ } }
      chk(!refused.length && oddsCalls(A).length === n1, 'HUB_ADMIN.odds() sends the key to an address other than its two paths, or takes an apiKey of the caller\'s: ' + refused.join(', '));
      const cr = await w.HUB_ADMIN.credits().catch(e => ({ rejected: String(e && e.message) })), oc2 = oddsCalls(A).slice(n1);
      chk(cr && cr.left === LEFT && cr.used === 88 && oc2.length === 1 && isCheck(oc2[0], FAKE), 'HUB_ADMIN.credits() is not the free GET of /v4/sports/, resolving the credits: ' + JSON.stringify(cr)); }
    keyNowhere(A, FAKE, "the admin's page");

    /* ---- Sign out: asked first; Cancel changes nothing ---- */
    { const b = d.querySelector('[data-admin-out]');
      w.confirm = () => false; b.click(); await wait(30);
      chk(!!w.localStorage.getItem(KEY) && tabsOf(d) === NINE && w.HUB_ADMIN.on() === true && !d.getElementById('tab-xparlays').hidden,
        'Sign out answered Cancel signed out anyway');
      const nOdds = oddsCalls(A).length;
      let asked = null; w.confirm = m => { asked = m; return true; };
      w[W] = []; b.focus(); b.click(); await until(() => !d.querySelector('[data-tab="xparlays"]'), 1500); await wait(30);
      const wr = w[W]; w[W] = null;
      chk(asked === 'Sign out of admin on this device?', 'Sign out does not ask first: ' + asked);
      chk(wr.join() === 'remove ' + KEY && w.localStorage.getItem(KEY) == null, 'Sign out wrote something besides removing the admin record: ' + wr.join(', '));
      chk(w.HUB_ADMIN.on() === false && d.documentElement.getAttribute('data-admin') == null && tabsOf(d) === SEVEN && !d.querySelector('#tabs [data-admin-only]'),
        'Sign out does not take the page back to a visitor\'s, the X tabs off its bar: ' + tabsOf(d));
      chk(w.location.hash === '#matchups' && !d.getElementById('tab-pickems').hidden && d.getElementById('tab-xparlays').hidden && d.querySelector('#tabs [data-tab="pickems"]').getAttribute('aria-selected') === 'true',
        'Sign out on X Parlays does not land on the Matchups board: ' + w.location.hash);
      chk(d.getElementById('hubAdmin').hidden && d.getElementById('hubAdmin').innerHTML === '' && txt(d.getElementById('app')) === '' && w.XBETS.enabled() === false,
        "Sign out leaves the admin's place drawn, X Parlays drawn, or an X Bet Log");
      chk(d.activeElement === d.querySelector('#tabs [data-tab="pickems"]'), 'Sign out leaves the focus nowhere (not on the chosen tab): ' + (d.activeElement && d.activeElement.outerHTML.slice(0, 60)));
      chk(A.navs.length === 0 && oddsCalls(A).length === nOdds, 'Sign out reloaded the page or asked The Odds API');
      /* nothing reads for X Parlays after it: Refresh now pressed by a script, another tab's clear */
      const n0 = xCalls(A).length; try { w.lpRefresh(); } catch (e) {} w.dispatchEvent(new w.StorageEvent('storage', { key: 'lp_cleared_here_v1' })); await wait(80);
      chk(xCalls(A).length === n0, 'after Sign out, X Parlays still reads its file or ESPN'); }
    chk(A.errs.length === 0, "the admin's page threw: " + A.errs.join('; '));
    w.close(); }

  /* ======================= another tab signs out ======================= */
  { const B = await boot({ url: SITE + '#bets', oddsOk: true, seed: w => { w.localStorage.setItem(KEY, REC()); const P = w.Storage.prototype, s = P.setItem, r = P.removeItem;
      P.setItem = function (k, v) { if (w.__wr) w.__wr.push('set ' + k); return s.call(this, k, v); }; P.removeItem = function (k) { if (w.__wr) w.__wr.push('remove ' + k); return r.call(this, k); }; } });
    const { w, d } = B;
    chk(tabsOf(d) === NINE && w.location.hash === '#bets' && !d.getElementById('tab-bets').hidden, "the admin's #bets does not open the X Bet Log: " + w.location.hash);
    w.__wr = []; w.dispatchEvent(new w.StorageEvent('storage', { key: 'props_press_v1' })); w.dispatchEvent(new w.StorageEvent('storage', { key: KEY })); await wait(30);
    chk(tabsOf(d) === NINE && w.HUB_ADMIN.on() === true && !w.__wr.length, 'another key moving, or the record still there, signed this tab out, or following wrote something');
    w.localStorage.removeItem(KEY); w.__wr = [];
    w.dispatchEvent(new w.StorageEvent('storage', { key: KEY })); await until(() => tabsOf(d) === SEVEN, 1500); await wait(30);
    chk(w.HUB_ADMIN.on() === false && tabsOf(d) === SEVEN && d.documentElement.getAttribute('data-admin') == null && w.location.hash === '#matchups' && !d.getElementById('tab-pickems').hidden && d.getElementById('tab-bets').hidden && !w.__wr.length,
      "another tab's sign-out is not followed here (the X tabs gone, the X Bet Log landing on the board), or following wrote something: " + tabsOf(d) + ' / ' + w.location.hash + ' / ' + w.__wr.join());
    chk(B.errs.length === 0 && oddsCalls(B).length === 0, 'the page threw, or asked The Odds API, following another tab: ' + B.errs.join('; '));
    w.close(); }

  /* ======================= what never makes an admin ======================= */
  { /* a record The Odds API refused since (an odds() 401 marks it so), the retired owner link's secret, junk */
    for (const [what, seed] of [
      ['a record The Odds API refused (ok:false)', w => w.localStorage.setItem(KEY, REC(FAKE, false))],
      ["the retired owner link's nflowner_v1 and junk under the record's key", w => { w.localStorage.setItem('nflowner_v1', 'the-old-owner-secret'); w.localStorage.setItem(KEY, '{"k":"the-old-owner-secret","ok":true}'); }],
      ['storage that throws on the record', w => { const P = w.Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem;
        P.getItem = function (k) { if (k === KEY) throw new w.DOMException('denied', 'SecurityError'); return g.call(this, k); };
        P.setItem = function (k, v) { if (k === KEY) throw new w.DOMException('full', 'QuotaExceededError'); return s.call(this, k, v); };
        P.removeItem = function (k) { if (k === KEY) throw new w.DOMException('denied', 'SecurityError'); return r.call(this, k); }; }]]) {
      const R = await boot({ url: SITE + '#xparlays', seed });
      chk(!R.timedOut && R.errs.length === 0 && tabsOf(R.d) === SEVEN && R.d.documentElement.getAttribute('data-admin') == null && R.w.HUB_ADMIN.on() === false && R.w.location.hash === '#matchups'
        && xCalls(R).length === 0 && oddsCalls(R).length === 0 && R.d.getElementById('hubAdmin').hidden,
        `${what} makes the page the admin's, asks for something, or throws: ${tabsOf(R.d)} / ${R.errs.join('; ')}`);
      R.w.close(); }
    /* each value under the key that is not a record, on the head's script alone */
    for (const v of ['junk', '{}', '[]', 'null', 'true', JSON.stringify({ k: FAKE }), JSON.stringify({ k: FAKE, ok: 'yes' }), JSON.stringify({ k: 'short', ok: true }), JSON.stringify({ k: FAKE + '-x', ok: true }),
      JSON.stringify([{ k: FAKE, ok: true }]), JSON.stringify({ k: 12345678901234567, ok: true })]) {
      const M = mini({ seed: w => w.localStorage.setItem(KEY, v) }); await wait(30);
      chk(M.d.documentElement.getAttribute('data-admin') == null && M.w.HUB_ADMIN.on() === false && M.calls.length === 0 && M.errs.length === 0 && M.w.localStorage.getItem(KEY) === v,
        `the value ${v.slice(0, 40)} under the record's key makes the page the admin's, asks The Odds API, throws, or is rewritten`);
      M.w.close(); }
    { const M = mini({ seed: w => w.localStorage.setItem(KEY, REC(FAKE, true)) }); await wait(30);
      chk(M.d.documentElement.getAttribute('data-admin') === 'on' && M.w.HUB_ADMIN.on() === true && M.calls.length === 0, "the head's script alone does not take a checked record as the admin's (the case above is not testing what it says)");
      M.w.close(); }
    /* a window whose storage cannot be reached at all: a visitor's, nothing thrown, and a link refused for want of it */
    { const M = mini({ url: SITE + '#owner=' + FAKE, seed: w => Object.defineProperty(w, 'localStorage', { configurable: true, get() { throw new w.DOMException('denied', 'SecurityError'); } }) });
      await until(() => !!M.d.querySelector('#hubAdmin .ha-msg'), 2000);
      chk(M.errs.length === 0 && M.w.HUB_ADMIN.on() === false && M.d.documentElement.getAttribute('data-admin') == null && M.navs.length === 0 && /would not keep the admin key/.test(txt(M.d.getElementById('hubAdmin'))),
        'a window whose storage cannot be reached throws, is taken for the admin\'s, reloads, or does not say the key could not be kept: ' + M.errs.join('; ') + ' / ' + txt(M.d.getElementById('hubAdmin')));
      M.w.close(); }
    /* odds() answered 401 INVALID_KEY: the record marked refused, hub-admin fired, this load still the admin's */
    { const M = mini({ seed: w => w.localStorage.setItem(KEY, REC(FAKE2)), odds: 'refuse' }); await wait(30); let ev = null;
      M.d.addEventListener('hub-admin', e => { ev = e.detail; });
      const a = await M.w.HUB_ADMIN.odds('sports/americanfootball_nfl/events');
      let again = null; try { await M.w.HUB_ADMIN.odds('sports/americanfootball_nfl/events'); again = 'sent'; } catch (e) { again = String(e.message); }
      chk(a.status === 401 && a.code === 'DEACTIVATED_KEY' && recOf(M.w).ok === false && ev && ev.refused === true && M.w.HUB_ADMIN.on() === true && /refused/.test(again) && M.calls.length === 1,
        'a key The Odds API refuses in odds() is not marked refused (ok:false) with hub-admin fired, or is sent again: ' + JSON.stringify({ rec: (recOf(M.w) || {}).ok, ev, again }));
      const mk = M.d.querySelector('#hubAdmin .ha-mark');
      chk(!!mk && /^The Odds API refused this admin key/.test(mk.getAttribute('title') || '') && !/credits? left/.test(mk.getAttribute('title') || ''),
        "the Admin mark's title does not say The Odds API refused the key: " + (mk ? mk.getAttribute('title') : 'no mark'));
      M.w.close(); }
    /* keys the format check refuses with no request */
    for (const k of ['the-old-owner-secret', 'short', 'a'.repeat(65), FAKE + '!', 'abc def ghi jkl mno', '<b>abcdefghijklmnop</b>']) {
      const M = mini({ url: SITE + '#owner=' + encodeURIComponent(k) }); await wait(40);
      chk(M.calls.length === 0 && M.w.localStorage.getItem(KEY) == null && txt(M.d.getElementById('hubAdmin')) === 'That admin link was refused.' && !M.w.location.href.includes('owner='),
        `the link key ${k.slice(0, 24)} is not refused with no request, the address cleaned and one line saying so: ${txt(M.d.getElementById('hubAdmin'))}`);
      M.w.close(); } }

  /* ======================= the old owner link, on a browser the retired layers marked ======================= */
  { const ownProp = JSON.stringify({ stake: 25, saved: [{ id: 'own-1', week: 2, stake: 4, price: 300, payout: 16, legs: [{ gid: `${BET_SEASON}_02_CAR_ATL`, stat: 'receptions', k: 3, side: 'over', main: false, name: 'Own Receiver', team: 'ATL', week: 2 }] }], parlay: {} });
    const ownBets = JSON.stringify({ myPicks: {}, bets: { 1: { staked: 10, returned: 8.71, note: '' }, 9: { staked: 3, returned: 0, note: 'own' } }, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit: 100 } });
    const OLD = { nflowner_v1: 'the-old-owner-secret', nflsync_owner_v1: JSON.stringify({ uid: 'u', refreshToken: 'rt', idToken: 'it', exp: 1 }), nflsync_device_v1: 'dabc',
      xparlays_v1: JSON.stringify({ at: '2026-10-10T05:00:00Z', dropped: 0 }), nflsync_v1: 'r-old', nflsync_base_v1: '{"rev":"r-old"}', xparlays_cache_v1: '{"rev":"r-old"}',
      live_parlays_v1: JSON.stringify({ lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: { 'file|fx-team': 1 } }), ['xbets_joined_' + BET_SEASON]: '{}', ['xbets_cache_' + BET_SEASON]: '{"weeks":{}}',
      [PROP_KEY]: ownProp, my_parlays_v1: '{"lines":{"prop|own-1|0":4},"removed":{},"kept":{}}', [BET_KEY]: ownBets, ['x_nfl_bets_preshare_' + BET_SEASON]: '{"bets":{}}' };
    const GONE = ['nflowner_v1', 'nflsync_owner_v1', 'nflsync_device_v1', 'xparlays_v1', 'nflsync_v1', 'nflsync_base_v1', 'xparlays_cache_v1', 'live_parlays_v1', 'xbets_joined_' + BET_SEASON, 'xbets_cache_' + BET_SEASON];
    const kept = keys => keys.my_parlays_v1 === OLD.my_parlays_v1 && keys[BET_KEY] === ownBets && keys['x_nfl_bets_preshare_' + BET_SEASON] === OLD['x_nfl_bets_preshare_' + BET_SEASON]
      && !!keys[PROP_KEY] && JSON.stringify(JSON.parse(keys[PROP_KEY]).saved) === JSON.stringify(JSON.parse(ownProp).saved);
    { const O = await boot({ url: SITE + '#owner=the-old-owner-secret', seed: w => { for (const [k, v] of Object.entries(OLD)) w.localStorage.setItem(k, v); } });
      await wait(200);
      const keys = keysOf(O.w), ha = O.d.getElementById('hubAdmin');
      chk(!O.timedOut && O.errs.length === 0 && oddsCalls(O).length === 0 && !(KEY in keys) && !O.w.location.href.includes('owner=') && !O.w.location.href.includes('the-old-owner-secret'),
        'the old owner link is not refused by the format check, with no request and nothing kept, the address cleaned: ' + O.w.location.href + ' / ' + O.errs.join('; '));
      chk(txt(ha) === 'That admin link was refused.' && !ha.hidden && tabsOf(O.d) === SEVEN && O.d.querySelectorAll('#lpCard .savedp').length === 0 && xCalls(O).length === 0,
        "the old owner link does not leave a visitor's page saying the link was refused, with no X Parlays drawn or read: " + txt(ha) + ' / ' + tabsOf(O.d));
      chk(GONE.every(k => !(k in keys)), 'with the old owner link, a flag or a copy the retired layers left is still in the browser: ' + GONE.filter(k => k in keys).join(', '));
      chk(kept(keys), 'with the old owner link, the browser lost some of its own data');
      O.w.close(); }
    { const O = await boot({ url: SITE + '#xparlays', oddsOk: true, seed: w => { for (const [k, v] of Object.entries(OLD)) w.localStorage.setItem(k, v); w.localStorage.setItem(KEY, REC()); } });
      const lp = O.d.getElementById('lpCard'); await until(() => lp.querySelectorAll('.savedp').length === 2, 4000);
      const keys = keysOf(O.w);
      chk(!O.timedOut && O.errs.length === 0 && lp.querySelectorAll('.savedp').length === 2 && /Fixture Home/.test(txt(lp)) && !/Fixture Runner/.test(txt(lp))
        && txt([...lp.querySelectorAll('.savedp')].find(c => /Fixture Receiver/.test(txt(c))).querySelector('.lineLbl')) === '50.5',
        "the admin's browser the retired layers marked does not show exactly the file's parlays on the file's lines (its old deletion and correction still count): " + txt(lp).slice(0, 160));
      chk(GONE.every(k => !(k in keys)) && keys[KEY] === REC() && kept(keys), "the admin's browser the retired layers marked kept a retired flag, lost its admin record or some of its own data: " + GONE.filter(k => k in keys).join(', '));
      O.w.close(); } }

  chk(BAD_CALLS.length === 0, 'a request broke the rules (not a read, off the site, or The Odds API on a boot not about the admin): ' + BAD_CALLS.slice(0, 5).join(' | '));
  finish();
})().catch(e => finish('the admin smoke itself threw: ' + (e && e.stack || e)));
