/* The suggestions record: what Suggested Parlays said of each Thursday, Sunday and Monday night game before
   it locked, frozen there, and what happened to it; and, before that, what the Parlay Builder's
   all-games panel said before each wave of kickoffs.

     node props/build/suggest_ledger.js      (the props job runs it from weekly.py once the audit is clean)

   Why. On Sunday 11 October 2026 the owner's parlays did badly, and the review found the prop model
   over-confident against DraftKings every week since week 2 and the suggested parlays, built from its
   biggest edges, collecting its mistakes (the 1pm Safe pair said 53% where the book's fair chance was
   about 24%). App v98 leads every suggestion with the book's fair chance and leaves out the legs far
   off the market. This is the record that says, over the weeks, how the suggestions themselves did
   against both chances: written down as the page showed them, before the games, never rebuilt after.

   Two kinds of entry, each in a map of its own.

   prime (since app v111, 16 October 2026, the owner's call: "do a section for Thurs night, sun night, and
   monday night games ONLY ... do similar tracking/grading as ELO tracking"). Each prime-time game's own
   four levels on the Suggested Parlays tab, Safe, Medium, Aggressive and Extreme, 2 to 5 legs from that game
   alone: a game kicking off on a Thursday, Sunday or Monday at or after 7:00 pm US Eastern (the page's
   spPrime, which the guard below works out again on its own from the kickoff). Taken from the published
   page itself: index.html, at the site's root, booted in jsdom on the payload the job has just baked, with the Elo files
   beside it (market + form decides which player legs qualify) and the window's clock at the run's time,
   read by the page's own spGames, spSet and spTierOut, so the record holds exactly the sets the tab shows
   (every prime-time game's, each taken from its first run, though since app v112 the tab sets out one night at
   a time, from 6:00 AM Eastern the morning after the night before: spOn). Keyed
   season|week|kickoff|game id. A set LOCKS 2 hours before its kickoff (the owner's call, 16 October 2026:
   "can we have the ability to refresh odds up until 2 hours before the game before it locks?"; the page's
   spLockAt). While the lock is to come a run rewrites the entry whenever the set has changed (prices
   pulled, a player ruled out); from the first run at or after the lock it is frozen, holding the version
   the last run before the lock wrote. GitHub starts this repo's runs 2 to 9 hours late and not every hour,
   so that is the last publish before the lock, which may be many hours before it, never one at the lock
   itself; a game no run landed before its lock has no entry at all (the page then builds its own set once,
   says it is not the site's, and keeps it in the visitor's browser), and an entry not yet locked whose game
   is no longer a prime-time game to come (flexed, moved) is dropped. One change is allowed after the lock,
   on any run before kickoff (the owner's call, 16 October 2026, "Replace that level only"): a level holding
   a player the page's own rules now keep out of every suggestion (spOutWhy, the rule pricedLegs and V6 obey:
   Out or Doubtful on the latest report, inactive, held out until cleared, questionable) is built again from
   the data at hand by the page's spRebuild, that level alone, and carries `updated` {pid, name, reason, at},
   with the same written into the entry's `updates` list beside the level's id; the other levels stay as
   locked. From kickoff nothing changes but the grade.

   Since app v118 (the owner's calls of 19 October 2026: "I would like it to have ELO picks for the slot of Sunday
   games", and "do a separate section for night games and then the sunday slot of games") each entry carries the
   unit's Elo picks too, `elo`, the ELO tab's four levels on that game's lines alone (elo-safe, elo-med, elo-aggr,
   elo-xtrm, in spTierOut's shape, each leg with its Elo chance `pe`, the level's p the Elo chance all land), taken,
   locked, replaced and graded with the model's, their grades beside the model's in `grade`; an entry taken before
   app v118 has none.

   slot (since app v118). The Sunday slot's set on the Suggested Parlays tab: every Sunday game of the week kicking off
   before 7:00 pm Eastern (the page's spSlotUnit), the four model levels and the four Elo picks across them, keyed
   season|week|first kickoff|<season>_<WW>_SUN, with `games` (the slot's game ids) and `last` (its last kickoff), taken
   from the page's spSlotNext, spSet and spEloSet while its lock, 2 hours before its first kickoff, is to come, and
   locked, replaced and graded by the same rules as a night game's, from its first kickoff on.

   suggest_backtest.json beside it is the record's weeks before it took them (suggest_backtest.js, run by hand,
   never by the job): this script neither reads nor writes it.

   entries (12 to 16 October 2026). The Parlay Builder's four levels under its default choices on every
   game still to kick off, keyed season|week|kickoff wave (the earliest kickoff still to come at the run),
   rewritten while that kickoff was to come and frozen from it. App v111 took that panel off the page, so no
   wave is taken any more: an entry not yet frozen is dropped, and the frozen ones stay exactly as they were,
   still graded, summarised in `summary` and drawn nowhere.

   Each level as its card shows it: its legs (game, week, player or team, the team, stat, line, side,
   main line or not, the book's price and its source, the name and label, the model's chance, the
   leg's fair chance and whether it is estimated, thin edge, no edge), the model's chance all land
   (the builder's parlayProb), the book's fair chance (parlayFair; null where a leg has none), the
   decimal price (parlayDec: the payout on $1) and whether it is the likeliest of its size; an empty
   level keeps why it is empty. Chances to four places, prices to three.

   Grading, both kinds alike. A frozen entry's level is graded once every leg has settled by the app's own
   settleLeg (settleGameLeg for a team's win or cover and a total) on the payload as baked: a leg lost loses
   the parlay; a push, or a void, drops out as a book drops it, the rest paid at parlayDec on the legs left
   (the whole price when none dropped; a same-game remainder priced together, as the builder prices it), and
   every leg a push or void is a push, the stake back. Pending while any leg's game or stats are out. A player
   with no stat line once his game's stats are in is not void by that alone: nflverse writes a player's week
   only when he has a stat, so a receiver who played and was never targeted has none, and DraftKings grades a
   player who takes part in one play on what he did (zero catches: the over loses, the under wins). settleLeg
   reads who played from the payload (PAY.snaps, which weekly.py's who_played bakes from nflverse's snap
   counts before this runs): a snap of any kind and he is graded on zero, none with his club's snaps in and
   the leg is void; with no snap counts for his club's game yet, Out on that week's injury report is void and
   anything else waits (pending) for them. The page and the record grade alike. A grade once made is replaced
   only by another complete one (a stat corrected), never undone by a payload that no longer holds the week;
   only the page's own season is graded at all, and an entry of another season keeps the grade it has (the
   app's actuals are this season's alone, so last season's week 5 would read this season's). Each level's
   grade: the result, each leg's settlement, and the payout on $1 (0 for a loss). A prime-time entry is
   graded from its kickoff, on the levels as they stand (a level replaced after the lock graded as replaced).

   The summaries, per level, over the parlays graded won or lost (a push is counted apart): how many, how
   many won, the wins expected by the fair chance and by the model's (the sums of the chances the page
   showed; a parlay a push shortened counts on its full chance), how many had a fair chance, and the units
   on $1 (the payout less the stake; a push is 0). prime_summary counts each season's game and level once,
   from the last key that holds it (a kickoff the league moved makes a new key), as the Suggested Parlays tab's
   record bar does (spRecSum in part3.js, the same rule, from the entries' own grades). summary counts the
   old entries' parlays once each: an entry was the whole week's panel, so the same level parlay (the same
   legs, in any order) frozen into every wave it outlived is counted from the last of them; `repeats` says
   how many frozen levels that set aside.

   The guard. Before anything is written the new ledger is held to the file the run started from. An old
   entry whose kickoff has passed may not be gone or differ in anything but its grade; every old entry was
   taken before its kickoff. A prime-time entry is keyed on its own season, week, kickoff and game, kicks
   off on a Thursday, Sunday or Monday at or after 7 pm Eastern, locks exactly 2 hours before it, was taken
   before its lock, and holds only legs of its own game, as many as its level says (its Elo picks, where it has
   them, the four elo-<level>s by the same rules); a Sunday slot's entry is keyed the same way on the slot's id,
   <season>_<WW>_SUN, kicks off on a Sunday before 7 pm Eastern, names its games (each of its own season and week)
   and holds only legs of them; one whose lock has
   passed may not be gone or differ in anything but its grade and the levels a ruled-out player let a run
   replace: a replacement is recorded in `updates` (the list only ever grows), made from the lock to
   kickoff, by this run, for a player the level held and does not hold now, and a level carrying `updated`
   is the last replacement recorded for it. Any entry new or changed otherwise is this run's, before its
   kickoff (old) or its lock (prime). A grade is only on a frozen entry and follows its legs' settlements;
   each summary follows from its entries. And to the last commit's (git show HEAD; SUGGEST_PREV names
   another file, 'none' skips it): no entry it had frozen or locked may be gone or changed beyond those
   rules (a replacement there may be an earlier run's, not yet committed), whatever the file on disk says.
   A ledger that fails is not written, the file is put back as it was (the last commit's where the file on
   disk had itself moved a frozen or locked entry), and the run exits 1. weekly.py logs that and goes on:
   the record never blocks the publish or turns it red.

   The page runs on the run's clock held still (SUGGEST_NOW or the machine's at the start), so a boot
   that takes seconds cannot carry it past a lock or kickoff the script itself still counts as to come.

   Since app v124 (the owner's call of 20 October 2026: no scheduled paid pull) the sets stand on the props job's own
   read of DraftKings' lines on ESPN, which the payload carries (PAY.espn) and the page installs at boot: so the record
   is refused where the payload carries a read of player lines for a game still to come and the page applied none
   (the job and the page shipped out of order would record sets of team legs only), and where the page asked ESPN for
   player lines on load (the record stands on the payload alone).

   SUGGEST_NOW (the clock), SUGGEST_PAYLOAD, SUGGEST_LEDGER, SUGGEST_PREV and SUGGEST_PAGE are for the test,
   test_suggest_ledger.js. No odds-API credit is ever spent: the page reads local files only.
   Exit 0: written, or unchanged and not written. Exit 1: refused, nothing written. The last line
   starts "suggest ledger:". */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..');
const LEDGER_REL = 'props/data/suggest_ledger.json';
const LEDGER = process.env.SUGGEST_LEDGER || path.join(ROOT, LEDGER_REL);
const PAYLOAD = process.env.SUGGEST_PAYLOAD || path.join(ROOT, 'props', 'data', 'payload.json');
/* NFL Hub, the site's root page since 17 October 2026 (nflbets/ before; nflbets/build/build.js writes it) */
/* the page the record is taken from: the site's own (SUGGEST_PAGE, for the test alone: a page that drops the payload's ESPN read) */
const PAGE = process.env.SUGGEST_PAGE || path.join(ROOT, 'index.html');
const PAGE_URL = 'https://demon-x13.github.io/nfl-hub/';
const SINCE = '2026-10-12', PRIME_SINCE = '2026-10-16';
/* the levels (PB_TIERS in part3.js; a run whose page has others is refused) */
const TIERS = ['safe', 'med', 'aggr', 'xtrm'], LABELS = { safe: 'Safe', med: 'Medium', aggr: 'Aggressive', xtrm: 'Extreme' };
/* (app v118) the Elo picks' four, each unit's beside its model levels */
const ELO_TIERS = TIERS.map(id => 'elo-' + id), LEVELS = [...TIERS, ...ELO_TIERS];
const SLOT_SINCE = '2026-10-19';
/* the maps of units: the night games and the Sunday slots */
const UNIT_MAPS = ['prime', 'slot'];
/* a prime-time set locks this long before its kickoff (SP_LOCK_MS in part3.js; a page that locks at
   another time is refused) */
const LOCK_MS = 2 * 3600e3;
const HOW = 'The suggestions record, written by props/build/suggest_ledger.js in the props job. prime (since 16 October 2026): each '
  + 'Thursday, Sunday and Monday night game\'s four parlays on the Suggested Parlays tab (Safe, Medium, Aggressive, Extreme, every leg '
  + 'from that game), taken from the published page on the payload just baked, keyed season|week|kickoff|game, rewritten while the '
  + 'set\'s lock (2 hours before kickoff) is to come and locked from it, so each entry is the set as the job last published it before '
  + 'the lock; from the lock to kickoff a level holding a player ruled out since is built again, that level alone, and recorded in '
  + 'updates. Since app v118 each entry holds the unit\'s Elo picks too (elo: elo-safe to elo-xtrm, each leg with its Elo chance pe), '
  + 'taken, locked, replaced and graded with the model\'s levels; and slot holds each week\'s Sunday slot (every Sunday game before 7 pm '
  + 'Eastern, one set across them), keyed season|week|first kickoff|<season>_<WW>_SUN with its games, locked 2 hours before its first '
  + 'kickoff by the same rules. entries (12 to 16 October 2026): the Parlay Builder\'s retired all-games panel under its default choices, keyed '
  + 'season|week|kickoff wave and frozen at that kickoff; no new one is taken. A frozen entry of either kind is graded by the app\'s '
  + 'settleLeg once every leg has settled (a push or void leg drops out as a book drops it; every leg a push or void is a push; a '
  + 'player with no stat line who took a snap, by nflverse\'s snap counts, is graded on zero, one who did not is void), the payout on '
  + 'a $1 stake. prime_summary, slot_summary (each with its elo) and summary: per level, parlays graded won or lost (prime: each game\'s level once; entries: each parlay '
  + 'once however many waves showed it), won, the wins expected by the fair chance and by the model\'s, and units on $1. Never edited '
  + 'by hand: the script refuses a ledger whose frozen or locked entries moved.';

const r4 = v => v == null || !isFinite(v) ? null : Math.round(v * 1e4) / 1e4;
const r3 = v => v == null || !isFinite(v) ? null : Math.round(v * 1e3) / 1e3;
const iso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const pad = w => String(w).padStart(2, '0');
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, y) => (o[y] = x[y], o), {}) : x);
const callOf = e => { const { grade, ...c } = e || {}; return c; };
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
/* the file's own style: one-space indent, each leg, grade, replacement, game list and pool on a line of
   its own, so an entry reads down the page and a grade added is a small diff */
const MAPS1 = ['entries', 'prime', 'slot'], SUMS1 = ['summary', 'prime_summary', 'slot_summary'];
const ONE_LINE = p => (p.length === 6 && MAPS1.includes(p[0]) && (p[2] === 'tiers' || p[2] === 'elo') && p[4] === 'legs')
  || (p.length === 4 && MAPS1.includes(p[0]) && (p[2] === 'grade' || p[2] === 'updates'))
  || (p.length === 3 && MAPS1.includes(p[0]) && (p[2] === 'games' || p[2] === 'pool'))
  || (p.length === 5 && (p[0] === 'prime' || p[0] === 'slot') && (p[2] === 'tiers' || p[2] === 'elo') && p[4] === 'updated')
  || (p.length === 3 && SUMS1.includes(p[0]) && p[1] === 'tiers')
  || (p.length === 4 && SUMS1.includes(p[0]) && p[1] === 'elo' && p[2] === 'tiers');
function dumps(v, ind = '', p = []) {
  const sp = ind + ' ';
  if (v && typeof v === 'object' && (ONE_LINE(p) || !Object.keys(v).length)) return JSON.stringify(v);
  if (Array.isArray(v)) return '[\n' + v.map((x, i) => sp + dumps(x, sp, [...p, i])).join(',\n') + '\n' + ind + ']';
  if (v && typeof v === 'object') return '{\n' + Object.keys(v).map(k => sp + JSON.stringify(k) + ': ' + dumps(v[k], sp, [...p, k])).join(',\n') + '\n' + ind + '}';
  return JSON.stringify(v);
}
const readText = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
const parse = t => { if (t == null) return null; try { return JSON.parse(t); } catch (e) { return undefined; } };

/* prime time, worked out here on its own from a kickoff instant through the time zone database (never the
   page's spPrime, which reads the schedule's Eastern date and time): a Thursday, Sunday or Monday at or after
   7:00 pm in New York */
const NY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function primeTime(ms) {
  if (!isFinite(ms)) return false;
  const p = Object.fromEntries(NY.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return ['Thu', 'Sun', 'Mon'].includes(p.weekday) && +p.hour >= 19;
}
/* the Sunday slot's day, worked out the same way: a Sunday before 7:00 pm in New York */
function slotTime(ms) {
  if (!isFinite(ms)) return false;
  const p = Object.fromEntries(NY.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return p.weekday === 'Sun' && +p.hour < 19;
}
const primeKey = e => `${e.season}|${pad(e.week)}|${e.kickoff}|${e.gid}`;
const slotId = (season, week) => `${season}_${pad(week)}_SUN`;
/* a unit's levels, the model's and its Elo picks' (none on an entry taken before app v118) */
const levelsOf = e => [...((e && e.tiers) || []), ...((e && Array.isArray(e.elo)) ? e.elo : [])];

function nowMs() {
  const v = process.env.SUGGEST_NOW; if (!v) return Date.now();
  const t = Date.parse(v); if (!isFinite(t)) throw new Error('SUGGEST_NOW is not a time: ' + v);
  return t;
}
/* the last published ledger: SUGGEST_PREV, else the last commit's (null when there is none) */
function prevText() {
  const p = process.env.SUGGEST_PREV;
  if (p === 'none') return null;
  if (p) return readText(p);
  const r = cp.spawnSync('git', ['show', 'HEAD:' + LEDGER_REL], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() ? r.stdout : null;
}

/* ---- the page, booted as a visitor's browser boots it, on the run's clock ---- */
function boot(payloadText, now) {
  const { JSDOM, VirtualConsole } = require(path.join(HERE, 'node_modules', 'jsdom'));
  const Papa = require(path.join(HERE, 'node_modules', 'papaparse'));
  const html = fs.readFileSync(PAGE, 'utf8');
  return new Promise((resolve, reject) => {
    const errs = [], asked = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { if (!/navigation/i.test(String(e && e.message))) errs.push('jsdom: ' + (e && e.message)); });
    const timer = setTimeout(() => reject(new Error('the page did not say app-ready within 60 s')), 60000);
    new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: PAGE_URL, virtualConsole: vc,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        /* the window's clock is the run's, held still: a boot of a few seconds must not carry the page
           past a lock or kickoff the script, on the same instant, still counts as to come */
        const D0 = w.Date;
        class D extends D0 { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
        w.Date = D;
        w.addEventListener('error', e => errs.push(e.message));
        /* the payload just baked, and the page's other files from this checkout; nothing else (the record
           itself answers 404, so the page builds every set from the data, never from the ledger) */
        w.fetch = u => {
          asked.push(String(u));
          const url = new URL(String(u), PAGE_URL), rel = url.pathname.replace(/^\/nfl-hub\//, '');
          const ok = t => Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t });
          if (url.host === 'demon-x13.github.io' && rel === 'props/data/payload.json') return ok(payloadText);
          if (url.host === 'demon-x13.github.io' && /^(elo\/data|betting|liveparlays|props\/data)\/[\w.-]+\.json$/.test(rel) && rel !== LEDGER_REL) {
            const t = readText(path.join(ROOT, rel)); if (t != null) return ok(t); }
          return Promise.resolve({ ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '' });
        };
        w.document.addEventListener('app-ready', () => { clearTimeout(timer); resolve({ w, errs, asked }); });
      } });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function ready(w, errs, payload, asked) {
  for (let i = 0; i < 300 && !w.eval("typeof window.eloLoaded==='function'&&window.eloLoaded()"); i++) await sleep(100);
  /* the Elo picks stand on the matchups too, which the ELO tab reads after the ratings */
  try { await Promise.race([w.eval("typeof window.eloFiles==='function'?window.eloFiles():null"), sleep(30000)]); } catch (e) {}
  const why = [];
  const PAY = w.eval('typeof PAY==="undefined"?null:PAY');
  if (!PAY || PAY.baked_at !== payload.baked_at) why.push('the page did not load the payload');
  if (!w.eval("typeof window.eloLoaded==='function'&&window.eloLoaded()")) why.push('the Elo files did not load, so the page would take no player leg (market + form)');
  if (errs.length) why.push('the page threw: ' + errs.slice(0, 3).join('; '));
  if (w.eval('PB_TIERS').map(t => t[0] + ':' + t[1]).join() !== TIERS.map(id => id + ':' + LABELS[id]).join()) why.push("the page's levels are not the four this record keeps");
  const missing = ['spGames', 'spSet', 'spTierOut', 'spLockAt', 'spOutWhy', 'spRebuild', 'spSlotNext', 'spEloSet', 'spUnit', 'settleLeg', 'parlayDec', 'isGameLeg', 'kickoff']
    .filter(f => w.eval(`typeof ${f}`) !== 'function');
  if (missing.length) why.push("the page has no Suggested Parlays sets to take (no " + missing.join(', ') + ')');
  else if (w.eval('SP_LOCK_MS') !== LOCK_MS) why.push('the page locks a set at another time than 2 hours before kickoff');
  /* (app v124) the props job's own read of DraftKings' lines on ESPN, in the payload (PAY.espn): where it carries a
     well-formed block of player lines for a game still to come, read before its kickoff, the page must have applied it
     (espnGame), or every set would hold team legs only (the job and the page shipped out of order) */
  const E = payload && payload.espn;
  if (E && E.v === 1 && E.games && typeof E.games === 'object' && !Array.isArray(E.games)) {
    const toCome = w.eval('(function(id,wk,at){ const g=S.sched.find(x=>x.id===id); if(!g||String(g.w)!==String(wk)||gameStarted(g)||hasScore(g)) return false; const k=kickoff(g), t=Date.parse(at); return !!k&&isFinite(t)&&t<k.getTime(); })');
    const blocks = Object.entries(E.games).filter(([gid, e]) => e && typeof e === 'object' && e.pl && typeof e.pl === 'object' && e.pl.lines && typeof e.pl.lines === 'object'
      && Object.keys(e.pl.lines).length && typeof e.pl.at === 'string' && toCome(gid, e.w, e.pl.at));
    const espnGame = w.eval("typeof espnGame==='function'?espnGame:null");
    if (blocks.length && !(espnGame && blocks.some(([gid, e]) => !!espnGame(gid, String(e.w)))))
      why.push(`the page did not apply the payload's ESPN read (${blocks.length} game${blocks.length === 1 ? '' : 's'} with player lines, none read by the page)`);
  }
  /* nothing asked of ESPN's player lines on load: the record stands on the payload alone (the board's scoreboard on
     site.api answers 404 here, as ever) */
  const core = (asked || []).filter(u => /^https:\/\/sports\.core\.api\.espn\.com\//.test(u));
  if (core.length) why.push(`the page asked ESPN for player lines on load (${core.length}: ${core[0]})`);
  return why;
}

/* ---- the sets the tab shows now, each unit whose lock is still to come: every prime-time game's, and the Sunday
   slot of the week (spSlotNext, where it is this week's and none of its games has kicked off), each with its Elo picks
   where the ELO tab can build them (spEloSet) ---- */
function takeUnits(w, now, said) {
  const games = w.eval('spGames()'), kick = w.eval('kickoff'), lockAt = w.eval('spLockAt'), set = w.eval('spSet'), out = w.eval('spTierOut');
  const eloSet = w.eval('spEloSet'), slot = w.eval('spSlotNext()'), week = w.eval('currentWeek()');
  const season = w.eval('SEASON'), baked = w.eval('PAY.baked_at') || null, takes = [];
  let locked = 0, noElo = 0;
  const eloOf = id => { const e = eloSet(id); if (!e || !Array.isArray(e.tiers)) { noElo++; return {}; } return { elo: e.tiers.map(t => out(t)) }; };
  for (const g of games) {
    const k = kick(g).getTime(), lock = lockAt(g);
    if (!(k > now)) throw new Error(`${g.id}, a game still to come, kicks off at or before the clock`);
    if (lock !== k - LOCK_MS) throw new Error(`the page locks ${g.id} at another time than 2 hours before its kickoff`);
    /* from the lock its entry stands as the last run before it left it, or there is none: the job's runs
       land hours late, so that is the last publish before the lock, whenever it was */
    if (!(now < lock)) { locked++; continue; }
    const s = set(g.id);
    if (!s) throw new Error(`the page has no set for ${g.id}`);
    const entry = { season, week: +g.w, gid: g.id, away: g.a, home: g.h, kickoff: iso(k), lock: iso(lock), baked_at: baked,
      pool: { pref: s.pref, thin: s.thin, mkt: s.mkt, far: s.far }, tiers: s.tiers.map(t => out(t)), ...eloOf(g.id) };
    takes.push({ map: 'prime', key: primeKey(entry), entry });
  }
  let slotLocked = false, slotGames = 0;
  if (slot && +slot.w === +week) {
    const k = kick(slot).getTime(), lock = lockAt(slot);
    if (slot.id !== slotId(season, slot.w)) throw new Error(`the page names week ${slot.w}'s Sunday slot ${slot.id}`);
    if (lock !== k - LOCK_MS) throw new Error(`the page locks ${slot.id} at another time than 2 hours before its first kickoff`);
    if (slot.games.some(g => !(kick(g).getTime() > now))) slotLocked = true;   /* under way: a game has kicked off */
    else if (!(now < lock)) slotLocked = true;
    else {
      const s = set(slot.id);
      if (!s) throw new Error(`the page has no set for ${slot.id}`);
      slotGames = slot.games.length;
      const entry = { season, week: +slot.w, gid: slot.id, games: slot.games.map(g => g.id), kickoff: iso(k), last: iso(slot.last), lock: iso(lock), baked_at: baked,
        pool: { pref: s.pref, thin: s.thin, mkt: s.mkt, far: s.far }, tiers: s.tiers.map(t => out(t)), ...eloOf(slot.id) };
      takes.push({ map: 'slot', key: primeKey(entry), entry });
    }
  }
  if (noElo) said.push(`${noElo} set${noElo === 1 ? '' : 's'} taken with no Elo picks: the page could not build them (the Elo files or the matchups did not load)`);
  return { games: games.length, locked, takes, slot: slot && +slot.w === +week ? slot.id : null, slotLocked, slotGames };
}

/* ---- a locked set, from its lock to kickoff: a level holding a player now ruled out built again, that
   level alone (the page's spOutWhy and spRebuild, its own rule for every suggestion) ---- */
function replaceRuledOut(w, P, now, runAt, said) {
  const unit = w.eval('spUnit'), why = w.eval('spOutWhy'), rebuild = w.eval('spRebuild'), out = w.eval('spTierOut');
  const kick = w.eval('kickoff'), isGame = w.eval('isGameLeg'), season = w.eval('SEASON');
  for (const [key, e] of Object.entries(P)) {
    const k = Date.parse(e.kickoff);
    if (!(k - LOCK_MS <= now && now < k) || e.season !== season || !Array.isArray(e.tiers)) continue;
    /* the unit as the schedule has it now: one moved since the lock is another key's, and left alone, as is a Sunday slot
       whose games are not the ones it locked (a game moved into it or out since: a level built again now would stand on
       other games than the entry's, which the guard holds its legs to) */
    const g = unit(e.gid); if (!g || !kick(g) || iso(kick(g).getTime()) !== e.kickoff) continue;
    if (Array.isArray(e.games) && (!g.games || g.games.map(x => x.id).join() !== e.games.join())) continue;
    for (const field of ['tiers', 'elo']) {
      if (!Array.isArray(e[field])) continue;
      e[field].forEach((t, i) => {
        if (!t || !Array.isArray(t.legs)) return;
        const l = t.legs.find(x => !isGame({ ...x }) && why(x.pid)); if (!l) return;
        const nt = rebuild(e.gid, t.id); if (!nt || nt.id !== t.id) return;
        const upd = { pid: l.pid, name: l.name, reason: why(l.pid), at: runAt };
        e[field][i] = { ...out(nt), updated: upd };
        e.updates = [...(Array.isArray(e.updates) ? e.updates : []), { tier: t.id, ...upd }];
        said.push(`replaced ${key} ${t.id}: ${l.name} ${upd.reason}`);
      });
    }
  }
}

/* ---- a level's grade, by the app's own settlement ---- */
function gradeTier(w, t) {
  const settle = w.eval('settleLeg'), parlayDec = w.eval('parlayDec');
  const sched = new Set(w.eval('S').sched.map(g => g.id));
  /* a leg on a game the page's schedule does not hold (another season's) cannot be settled here */
  const one = l => sched.has(l.gid) ? settle({ ...l }) || null : null;
  const legs = t.legs.map(one);
  if (legs.some(x => x == null)) return { result: 'pending', legs };
  if (legs.includes('loss')) return { result: 'lost', legs, payout: 0 };
  const left = t.legs.filter((l, i) => legs[i] === 'win');
  if (!left.length) return { result: 'push', legs, payout: 1 };
  const payout = left.length === t.legs.length ? t.dec : r3(parlayDec(left.map(l => ({ leg: { ...l }, ml: l.price }))));
  return { result: 'won', legs, payout };
}
const DONE = new Set(['won', 'lost', 'push']);
function gradeEntries(w, E, now, season) {
  for (const e of Object.values(E)) {
    if (Date.parse(e.kickoff) > now || e.season !== season) continue;
    const g = {};
    for (const t of levelsOf(e)) {
      if (!t || !t.legs) continue;
      const was = (e.grade || {})[t.id], now1 = gradeTier(w, t);
      g[t.id] = now1.result === 'pending' && was && DONE.has(was.result) ? was : now1;
    }
    e.grade = g;
  }
}

/* ---- the summaries ---- */
const blankTiers = (ids = TIERS) => Object.fromEntries(ids.map(id => [id, { label: LABELS[id.replace(/^elo-/, '')], graded: 0, won: 0, lost: 0, push: 0, exp_fair: 0, fair_n: 0, exp_model: 0, units: 0 }]));
function tally(out, picked) {
  let pending = 0;
  for (const { t, g } of picked) {
    const s = out[t.id];
    if (g.result === 'pending') { pending++; continue; }
    if (g.result === 'push') { s.push++; continue; }
    s.graded++; if (g.result === 'won') s.won++; else s.lost++;
    s.exp_model += t.p; if (t.fair != null) { s.exp_fair += t.fair; s.fair_n++; }
    s.units += g.payout - 1;
  }
  for (const id of Object.keys(out)) { const s = out[id]; s.exp_fair = r4(s.exp_fair); s.exp_model = r4(s.exp_model); s.units = r3(s.units); }
  return pending;
}
/* the old entries: one parlay, one count: a level parlay (its legs, in any order) of a season's week (its
   entry's key, season|week|kickoff) frozen into several waves' entries is counted from the last of them */
const legId = l => [l.gid, l.pid, l.stat, l.side, l.k, l.main ? 1 : 0].join('|');
const parlayId = (key, t) => [String(key).split('|').slice(0, 2).join('|'), t.id, t.legs.map(legId).sort().join('+')].join('#');
function summarize(entries) {
  const out = blankTiers(), last = new Map(); let frozen = 0, seen = 0;
  for (const key of Object.keys(entries).sort()) {
    const e = entries[key]; if (!e.grade) continue; frozen++;
    for (const t of e.tiers || []) { const g = e.grade[t.id]; if (!g || !out[t.id] || !Array.isArray(t.legs)) continue; seen++; last.set(parlayId(key, t), { t, g }); }
  }
  const pending = tally(out, last.values());
  return { tiers: out, pending, repeats: seen - last.size, frozen_entries: frozen, entries: Object.keys(entries).length };
}
/* a map of units (the prime-time sets, the Sunday slots): each season's unit and level once, from the last key that
   holds it (a kickoff the league moved makes a new key), as the tab's record bar counts it (spRecSum in part3.js),
   the model's levels and the Elo picks' (elo, the wins expected by the Elo chance in exp_model) apart */
function summarizePrime(prime) {
  const out = blankTiers(), eo = blankTiers(ELO_TIERS), last = new Map(); let graded = 0, updates = 0;
  for (const key of Object.keys(prime).sort()) {
    const e = prime[key]; updates += Array.isArray(e.updates) ? e.updates.length : 0;
    if (!e.grade) continue; graded++;
    for (const t of levelsOf(e)) { const g = e.grade[t && t.id]; if (!g || !(out[t.id] || eo[t.id]) || !Array.isArray(t.legs)) continue; last.set([e.season, e.gid, t.id].join('|'), { t, g }); }
  }
  const all = [...last.values()];
  const pending = tally(out, all.filter(x => out[x.t.id])), eloPending = tally(eo, all.filter(x => eo[x.t.id]));
  const games = new Set(Object.values(prime).map(e => e.season + '|' + e.gid)).size;
  return { tiers: out, pending, elo: { tiers: eo, pending: eloPending }, games, entries: Object.keys(prime).length, graded_entries: graded, updates };
}

/* ---- the guard: every failure as a sentence; none is a ledger fit to write ---- */
/* a grade that does not follow its level's legs */
function gradeBad(key, e) {
  const bad = [];
  for (const [id, g] of Object.entries(e.grade || {})) {
    const tier = levelsOf(e).find(x => x && x.id === id);
    if (!tier || !tier.legs) { bad.push(`${key} ${id}: a grade for a level with no parlay`); continue; }
    const s = (g && g.legs) || [];
    const ok = s.length === tier.legs.length && s.every(x => x == null || ['win', 'loss', 'push', 'void'].includes(x));
    const want = !ok ? null : s.some(x => x == null) ? 'pending' : s.includes('loss') ? 'lost' : s.every(x => x !== 'win') ? 'push' : 'won';
    if (!ok || !g || g.result !== want) { bad.push(`${key} ${id}: graded ${g && g.result} on legs ${JSON.stringify(s)}`); continue; }
    if (want === 'lost' && g.payout !== 0) bad.push(`${key} ${id}: a loss paying ${g.payout}`);
    if (want === 'push' && g.payout !== 1) bad.push(`${key} ${id}: a push paying ${g.payout}`);
    if (want === 'won' && !(g.payout > 1)) bad.push(`${key} ${id}: a win paying ${g.payout}`);
    if (want === 'won' && s.every(x => x === 'win') && g.payout !== tier.dec) bad.push(`${key} ${id}: every leg won and it pays ${g.payout}, not its price ${tier.dec}`);
  }
  return bad;
}
const diffKeys = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].filter(k => canon((a || {})[k]) !== canon((b || {})[k]));
/* the old entries prev had frozen (their kickoff passed by now) that L has lost or changed, grades aside */
function frozenMoved(L, prev, now) {
  const bad = [], E = (L && L.entries) || {};
  for (const [key, pe] of Object.entries((prev && prev.entries) || {})) {
    if (!pe || !pe.kickoff || Date.parse(pe.kickoff) > now) continue;
    const e = E[key];
    if (!e) { bad.push(`${key}: an entry frozen at its kickoff ${pe.kickoff} is gone`); continue; }
    if (canon(callOf(e)) !== canon(callOf(pe))) bad.push(`${key}: frozen at its kickoff ${pe.kickoff}, and changed (${diffKeys(callOf(e), callOf(pe)).join(', ')})`);
  }
  return bad;
}
const primeLock = e => Date.parse(e && e.kickoff) - LOCK_MS;
const holds = (t, pid) => !!(t && Array.isArray(t.legs) && t.legs.some(l => l && l.pid === pid));
/* the prime-time entries prev had locked (their lock passed by now) that L has lost or changed beyond a
   grade and the levels a player ruled out let a run replace. runAt: the replacements new since prev are
   this run's (against the file the run started from); null against the last commit, which an earlier run's
   replacement, not yet committed, may also have moved past */
function primeMoved(L, prev, now, runAt, map = 'prime') {
  const bad = [], P = (L && L[map]) || {};
  for (const [key, pe] of Object.entries((prev && prev[map]) || {})) {
    if (!pe || !(primeLock(pe) <= now)) continue;
    const e = P[key], at = iso(primeLock(pe));
    if (!e) { bad.push(`${key}: a set locked at ${at} is gone`); continue; }
    const strip = x => { const { grade, tiers, elo, updates, ...c } = x || {}; return c; };
    const moved = diffKeys(strip(e), strip(pe));
    if (moved.length) { bad.push(`${key}: locked at ${at}, and changed (${moved.join(', ')})`); continue; }
    const pu = Array.isArray(pe.updates) ? pe.updates : [], u = Array.isArray(e.updates) ? e.updates : [];
    if (u.length < pu.length || canon(u.slice(0, pu.length)) !== canon(pu)) { bad.push(`${key}: locked at ${at}, and its record of replacements rewritten`); continue; }
    const fresh = u.slice(pu.length), T = levelsOf(e), PT = levelsOf(pe);
    if (!Array.isArray(e.tiers) || Array.isArray(e.elo) !== Array.isArray(pe.elo) || T.length !== PT.length || T.some((t, i) => !t || !PT[i] || t.id !== PT[i].id)) { bad.push(`${key}: locked at ${at}, and its levels changed`); continue; }
    if (runAt != null && fresh.some(x => !x || x.at !== runAt)) bad.push(`${key}: locked at ${at}, and a replacement recorded that is not this run's`);
    T.forEach((t, i) => {
      const mine = fresh.filter(x => x && x.tier === t.id), same = canon(t) === canon(PT[i]);
      if (same) { if (mine.length) bad.push(`${key} ${t.id}: a replacement recorded for a level that did not change`); return; }
      if (!mine.length) { bad.push(`${key} ${t.id}: locked at ${at}, and changed with no player ruled out`); return; }
      if (runAt != null && mine.length > 1) bad.push(`${key} ${t.id}: replaced more than once by one run`);
      if (!holds(PT[i], mine[0].pid)) bad.push(`${key} ${t.id}: replaced for ${mine[0].pid}, who was not on the level as it was locked`);
    });
  }
  return bad;
}
/* one prime-time entry (map 'prime') or Sunday slot's (map 'slot') on its own: its key, its night or its Sunday, its
   games, its lock, its legs (the model's levels and its Elo picks'), its replacements, its grades */
function primeEntryBad(key, e, now, map = 'prime') {
  const bad = [], t = s => Date.parse(s);
  if (!isMap(e) || !e.kickoff || !e.taken_at || !e.gid || !e.lock || !Array.isArray(e.tiers)) return [`${key}: no game, kickoff, lock, levels or time taken`];
  if (key !== primeKey(e)) bad.push(`${key}: not keyed on its own season, week, kickoff and game (${primeKey(e)})`);
  let games = [e.gid];
  if (map === 'slot') {
    if (e.gid !== slotId(e.season, e.week)) bad.push(`${key}: not the Sunday slot of its own season and week (${slotId(e.season, e.week)})`);
    if (!slotTime(t(e.kickoff))) bad.push(`${key}: kicks off ${e.kickoff}, not a Sunday before 7 pm Eastern`);
    const re = new RegExp(`^${e.season}_${pad(e.week)}_[A-Z]{2,3}_[A-Z]{2,3}$`);
    if (!Array.isArray(e.games) || !e.games.length || e.games.some(g => typeof g !== 'string' || !re.test(g)) || new Set(e.games).size !== e.games.length) bad.push(`${key}: its games are not games of its own season and week`);
    else games = e.games;
  } else if (!primeTime(t(e.kickoff))) bad.push(`${key}: kicks off ${e.kickoff}, not a Thursday, Sunday or Monday at or after 7 pm Eastern`);
  if (e.lock !== iso(t(e.kickoff) - LOCK_MS)) bad.push(`${key}: locks at ${e.lock}, not 2 hours before its kickoff`);
  if (!(t(e.taken_at) < t(e.kickoff) - LOCK_MS)) bad.push(`${key}: taken at ${e.taken_at}, at or after its lock`);
  if (e.tiers.map(x => x && x.id).join() !== TIERS.join()) bad.push(`${key}: its levels are not the four`);
  if (e.elo != null && (!Array.isArray(e.elo) || e.elo.map(x => x && x.id).join() !== ELO_TIERS.join())) bad.push(`${key}: its Elo picks are not the four`);
  for (const x of levelsOf(e)) {
    if (!x || !Array.isArray(x.legs)) continue;
    if (x.legs.length !== x.n) bad.push(`${key} ${x.id}: ${x.legs.length} legs on a level of ${x.n}`);
    if (x.legs.some(l => !l || !games.includes(l.gid))) bad.push(`${key} ${x.id}: a leg on another game than ${games.join(', ')}`);
    if (ELO_TIERS.includes(x.id) && x.legs.some(l => !(l.pe > 0 && l.pe < 1))) bad.push(`${key} ${x.id}: an Elo pick's leg with no Elo chance`);
  }
  const U = e.updates == null ? [] : e.updates;
  if (!Array.isArray(U)) bad.push(`${key}: its replacements are not a list`);
  else {
    for (const u of U) {
      if (!isMap(u) || !LEVELS.includes(u.tier) || !u.pid || !u.at) { bad.push(`${key}: a replacement that names no level, player or time`); continue; }
      if (!(t(u.at) >= t(e.kickoff) - LOCK_MS && t(u.at) < t(e.kickoff) && t(u.at) <= now)) bad.push(`${key} ${u.tier}: replaced at ${u.at}, not between its lock and its kickoff`);
    }
    for (const x of levelsOf(e)) {
      if (!x) continue;
      const mine = U.filter(u => isMap(u) && u.tier === x.id), lastU = mine[mine.length - 1];
      if (x.updated != null || lastU) {
        const { tier, ...want } = lastU || {};
        if (!lastU || canon(x.updated) !== canon(want)) bad.push(`${key} ${x.id}: its mark of a replacement is not the last one recorded for it`);
        else if (holds(x, lastU.pid)) bad.push(`${key} ${x.id}: replaced for ${lastU.pid}, and still holds him`);
      }
    }
  }
  if (e.grade && t(e.kickoff) > now) bad.push(`${key}: graded before its kickoff`);
  bad.push(...gradeBad(key, e));
  return bad;
}
function check(L, prev, now, runAt) {
  const bad = [], E = (L && L.entries) || {}, t = s => Date.parse(s);
  for (const [key, e] of Object.entries(E)) {
    if (!e || !e.kickoff || !e.taken_at) { bad.push(`${key}: no kickoff or no time taken`); continue; }
    if (!(t(e.taken_at) < t(e.kickoff))) bad.push(`${key}: taken at ${e.taken_at}, at or after its kickoff ${e.kickoff}`);
    if (!key.endsWith('|' + e.kickoff)) bad.push(`${key}: keyed on another kickoff than its own ${e.kickoff}`);
    if (e.grade && t(e.kickoff) > now) bad.push(`${key}: graded before its kickoff`);
    bad.push(...gradeBad(key, e));
  }
  for (const map of UNIT_MAPS) for (const [key, e] of Object.entries((L && L[map]) || {})) bad.push(...primeEntryBad(key, e, now, map));
  if (prev) {
    bad.push(...frozenMoved(L, prev, now));
    for (const [key, e] of Object.entries(E)) {
      const pe = (prev.entries || {})[key];
      if (pe && canon(callOf(e)) === canon(callOf(pe))) continue;
      if (e.taken_at !== runAt || !(t(e.kickoff) > now)) bad.push(`${key}: new or changed, and not taken by this run before its kickoff`);
    }
    for (const map of UNIT_MAPS) {
      bad.push(...primeMoved(L, prev, now, runAt, map));
      for (const [key, e] of Object.entries((L && L[map]) || {})) {
        const pe = (prev[map] || {})[key];
        if (pe && primeLock(pe) <= now) continue;   /* a locked set: primeMoved's rules */
        if (pe && canon(callOf(e)) === canon(callOf(pe))) continue;
        if (e.taken_at !== runAt || !(now < primeLock(e))) bad.push(`${key}: new or changed, and not taken by this run before its lock`);
      }
    }
  }
  if (canon(L.summary) !== canon(summarize(E))) bad.push('the summary does not follow from the entries');
  if (canon(L.prime_summary) !== canon(summarizePrime((L && L.prime) || {}))) bad.push('the prime-time summary does not follow from the sets');
  if (L.slot != null && canon(L.slot_summary) !== canon(summarizePrime(L.slot))) bad.push("the Sunday slots' summary does not follow from the sets");
  return bad;
}
const movedAgainst = (L, prev, now, runAt) => [...frozenMoved(L, prev, now), ...UNIT_MAPS.flatMap(m => primeMoved(L, prev, now, runAt, m))];

async function main() {
  const now = nowMs(), runAt = iso(now);
  const startText = readText(LEDGER), headText = prevText();
  const start = parse(startText), head = parse(headText);
  if (start === undefined) throw new Error(LEDGER + ' is not JSON');
  const payloadText = readText(PAYLOAD); if (payloadText == null) throw new Error('no payload at ' + PAYLOAD);
  const payload = JSON.parse(payloadText);
  const { w, errs, asked } = await boot(payloadText, now);
  const why = await ready(w, errs, payload, asked);
  if (why.length) throw new Error(why.join('; '));

  const base = start || { how: HOW, since: SINCE, updated: null, summary: null, entries: {} };
  const next = JSON.parse(JSON.stringify(base));
  next.how = HOW; next.since = base.since || SINCE; next.entries = isMap(next.entries) ? next.entries : {};
  next.prime_since = base.prime_since || PRIME_SINCE; next.prime = isMap(next.prime) ? next.prime : {};
  next.slot_since = base.slot_since || SLOT_SINCE; next.slot = isMap(next.slot) ? next.slot : {};
  const E = next.entries, P = next.prime, Q = next.slot, said = [];
  /* the old entries: the all-games panel left the page with app v111, so no wave is taken and one not yet
     frozen is dropped; the frozen ones stand */
  for (const [key, e] of Object.entries(E))
    if (Date.parse(e.kickoff) > now) { delete E[key]; said.push(`dropped ${key}, a wave of the retired all-games panel`); }
  /* the sets: each unit's rewritten while its lock is to come, when the set has changed (a night game's in prime, the
     Sunday slot's in slot) */
  const take = takeUnits(w, now, said), keys = new Set(take.takes.map(x => x.map + '|' + x.key)), M = { prime: P, slot: Q };
  for (const [map, X] of Object.entries(M)) for (const [key, e] of Object.entries(X))
    if (now < primeLock(e) && !keys.has(map + '|' + key)) { delete X[key]; said.push(`dropped ${key}, no longer a ${map === 'slot' ? 'Sunday slot' : 'prime-time game'} to come`); }
  for (const { map, key, entry } of take.takes) {
    const X = M[map], old = X[key], { baked_at, ...fresh } = entry;
    const same = old && (() => { const { taken_at, baked_at: b, ...o } = callOf(old); return canon(o) === canon(fresh); })();
    if (!same) { X[key] = { ...entry, taken_at: runAt }; said.push(`${old ? 'rewrote' : 'took'} ${key}`); }
    else said.push(`${key} unchanged`);
  }
  if (!take.games) said.push('no prime-time game to come');
  else if (take.locked) said.push(`${take.locked} prime-time set${take.locked === 1 ? '' : 's'} locked`);
  if (!take.slot) said.push('no Sunday slot to come this week');
  else if (take.slotLocked) said.push(`${take.slot} locked`);
  replaceRuledOut(w, P, now, runAt, said);
  replaceRuledOut(w, Q, now, runAt, said);
  /* the frozen entries' grades: this season's only (another's keeps the grade it has) */
  const season = w.eval('SEASON');
  if (!payload.snaps) said.push('a payload with no snap counts: a leg on a player with no stat line waits unless Out');
  gradeEntries(w, E, now, season);
  gradeEntries(w, P, now, season);
  gradeEntries(w, Q, now, season);
  /* each map in key order (kickoff order), then the summaries */
  next.entries = Object.fromEntries(Object.keys(E).sort().map(k => [k, E[k]]));
  next.prime = Object.fromEntries(Object.keys(P).sort().map(k => [k, P[k]]));
  next.slot = Object.fromEntries(Object.keys(Q).sort().map(k => [k, Q[k]]));
  next.summary = summarize(next.entries);
  next.prime_summary = summarizePrime(next.prime);
  next.slot_summary = summarizePrime(next.slot);

  const bad = check(next, start, now, runAt);
  /* against the last commit, what it had frozen or locked (a set still to lock may differ from it by an
     earlier run's rewrite not yet committed, and a locked one by an earlier run's replacement) */
  if (head && headText !== startText) bad.push(...movedAgainst(next, head, now, null).map(b => 'against the last commit: ' + b));
  if (bad.length) {
    for (const b of bad) console.log('FAIL ' + b);
    /* put the file back: the last commit's where the file on disk had itself moved a frozen or locked entry */
    const startBad = !!(head && start && movedAgainst(start, head, now, null).length);
    const back = startBad ? headText : startText;
    if (back == null) { try { fs.unlinkSync(LEDGER); } catch (e) {} } else if (readText(LEDGER) !== back) fs.writeFileSync(LEDGER, back);
    console.log(`suggest ledger: refused, ${bad.length} failure${bad.length === 1 ? '' : 's'}; the ${startBad ? "last commit's" : 'last good'} ledger stays`);
    return 1;
  }
  const s = next.summary, q = next.prime_summary, z = next.slot_summary;
  const rec = x => Object.keys(x.tiers).map(id => `${id} ${x.tiers[id].won}/${x.tiers[id].graded}`).join(', ');
  const unitTail = (name, x) => `${name}: ${x.entries} set${x.entries === 1 ? '' : 's'}, ${x.pending + x.elo.pending} level${x.pending + x.elo.pending === 1 ? '' : 's'} pending, won/graded ${rec(x)}, ${rec(x.elo)}; `;
  const tail = unitTail('prime', q) + unitTail('slot', z)
    + `old panel: ${s.entries} entr${s.entries === 1 ? 'y' : 'ies'}, ${s.pending} level${s.pending === 1 ? '' : 's'} pending, won/graded ${rec(s)}`;
  if (start && canon({ ...next, updated: null }) === canon({ ...start, updated: null })) {
    console.log(`suggest ledger: unchanged (${said.join('; ')}); ${tail}`); return 0; }
  next.updated = runAt;
  const out = { how: next.how, since: next.since, updated: next.updated, summary: next.summary, entries: next.entries,
    prime_since: next.prime_since, prime_summary: next.prime_summary, prime: next.prime,
    slot_since: next.slot_since, slot_summary: next.slot_summary, slot: next.slot };
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, dumps(out) + '\n');
  console.log(`suggest ledger: written (${said.join('; ')}); ${tail}`);
  return 0;
}

module.exports = { check, frozenMoved, primeMoved, primeEntryBad, summarize, summarizePrime, parlayId, callOf, canon, dumps, primeTime, slotTime, primeKey, slotId,
  levelsOf, boot, ready, gradeTier, gradeEntries, TIERS, ELO_TIERS, LEVELS, LABELS, LEDGER_REL, LOCK_MS, PRIME_SINCE, SLOT_SINCE, iso, r3, r4 };
if (require.main === module) {
  main().then(code => process.exit(code), e => { console.log('suggest ledger: refused: ' + (e && e.message || e)); process.exit(1); });
}
