/* The suggestions record's backtest: what Suggested Parlays would have set out for each night game and Sunday slot
   of the weeks before the record took them, rebuilt by today's rules on exactly what the site had published at the
   unit's lock, and graded on the results.

     node props/build/suggest_backtest.js            (by hand; the props job never runs it)
     node props/build/suggest_backtest.js --check    (the file against its rules and the record's guard; writes nothing)

   Why. The owner, 19 October 2026: "i noticed there is only records for this week, can we retroactively look back and
   find what we would have suggested and count it to the record?", and "if you can also backfill the records for the
   suggested parlays as well. but maybe for that one do a separate section for night games and then the sunday slot of
   games". The props job's record (suggest_ledger.js) took the night games' sets from 16 October 2026 (app v111) and
   the Elo picks and the Sunday slot from app v118; this is the weeks before.

   What a unit is: a game kicking off on a Thursday, Sunday or Monday at or after 7:00 pm Eastern (a night game), or a
   week's Sunday games kicking off before 7:00 pm Eastern together (the Sunday slot), worked out here from the kickoffs
   through the time zone database. Each is rebuilt where its lock (2 hours before its kickoff, the slot's first) has
   passed and every one of its games has a final score, from FROM_WEEK (3: the first week the props job published a
   payload before its locks) on, and only where that lock came before the record first took a set's Elo picks (the
   earliest taken_at of a record entry with them; none yet, now): a unit locked after that is the record's, and one the
   record missed (no run of the props job before its lock) stays ungraded, as the tab says, never filled in here. (So a
   night game whose model levels the record took before app v118, week 6's two, is rebuilt for its Elo picks, the
   record's own levels counting for the rest: part3.js's spRecSum counts a unit the record holds of a kind from the
   record whole.) A unit already in the file is kept as it is, grades aside: the file only grows.

   How. The moment is the lock less a minute. The files are those of the last commit on the site's own line before it
   (git rev-list --first-parent --before on origin/main, the branch GitHub Pages serves; SUGGEST_BACKTEST_REF names
   another ref, for a test), never a branch's own commits, every file the page reads (the payload, the Elo files, the betting state and the
   rest), so the set is what the site's own files then made; the page is today's (index.html at the site's root), booted
   in jsdom with its clock held at that moment, and the set read by its own spSet, spEloSet and spTierOut, as the props
   job reads a set it takes. A unit whose files did not load (no payload, the Elo files or the matchups not there yet)
   is said and left out. Then the page is booted once more on today's files and every level graded by the app's own
   settleLeg, as suggest_ledger.js grades one (gradeTier, its rules: a push or void leg drops out, every leg a push or
   void is a push, a player with no stat line graded by the snap counts), a grade once complete kept.

   The file, props/data/suggest_backtest.json: {how, from_week, made, updated, prime_summary, prime, slot_summary,
   slot}, the two maps keyed and shaped as the record's (season|WW|kickoff|unit id; tiers, elo, grade), each entry also
   src 'backtest' and from {commit, committed}, the commit its files came from and when it landed. The page reads it
   beside the record (part3.js, spRecSum) and counts a unit's level from the record where the record has it, else from
   here, and says how many it took from here. Written in the record's own style (suggest_ledger.js's dumps). --check
   holds every entry to the record's guard (primeEntryBad: its key, its night or Sunday, its lock, its legs, its games,
   its grades) and to src and from, and the summaries to the entries; exit 1 on any failure. No credit is spent. */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const L = require('./suggest_ledger.js');
const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..');
const OUT_REL = 'props/data/suggest_backtest.json';
const OUT = process.env.SUGGEST_BACKTEST || path.join(ROOT, OUT_REL);
const PAGE = path.join(ROOT, 'index.html');
const PAGE_URL = 'https://demon-x13.github.io/nfl-hub/';
const FROM_WEEK = 3;
/* the line the site is served from: the commits whose files a visitor could have been served */
const REF = process.env.SUGGEST_BACKTEST_REF || 'origin/main';
const HOW = 'The suggestions record\'s backtest, written by props/build/suggest_backtest.js by hand (never by a job): each night game '
  + '(Thursday, Sunday or Monday at or after 7 pm Eastern) and Sunday slot (the week\'s Sunday games before 7 pm Eastern) of the weeks before '
  + 'the record took them, from week 3, rebuilt by today\'s rules (the page at the site\'s root) on exactly the files of the last commit on the '
  + 'main line before the unit\'s lock (2 hours before its kickoff, the slot\'s first), the clock at the lock less a minute, and graded on the '
  + 'results by the app\'s settleLeg as the record grades. Keyed and shaped as the record\'s prime and slot maps, each entry marked src '
  + 'backtest with the commit its files came from. The page counts a unit\'s level from the record where it has one, else from here. Never '
  + 'edited by hand: the file only grows, a unit once in it kept as it is but for its grades.';

const iso = L.iso, pad = w => String(w).padStart(2, '0');
const git = (args, buf) => cp.execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, encoding: buf ? null : 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const readText = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---- the page, booted on the files of a commit (or today's, commit null), its clock held at `now` ---- */
function boot(commit, now) {
  const { JSDOM, VirtualConsole } = require(path.join(HERE, 'node_modules', 'jsdom'));
  const Papa = require(path.join(HERE, 'node_modules', 'papaparse'));
  const html = fs.readFileSync(PAGE, 'utf8');
  const file = rel => { if (!commit) return readText(path.join(ROOT, rel)); try { return git(['show', `${commit}:${rel}`]); } catch (e) { return null; } };
  return new Promise((resolve, reject) => {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { if (!/navigation|Could not parse CSS/i.test(String(e && e.message))) errs.push('jsdom: ' + (e && e.message)); });
    const timer = setTimeout(() => reject(new Error('the page did not say app-ready within 60 s')), 60000);
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: PAGE_URL, virtualConsole: vc,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        const D0 = w.Date;
        class D extends D0 { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
        w.Date = D;
        w.addEventListener('error', e => errs.push(e.message));
        /* the site's own files as they stood in the commit; the record itself answers 404 (a set is rebuilt from
           the data, never read back from a record), and nothing off the site is read */
        w.fetch = u => {
          const url = new URL(String(u), PAGE_URL), rel = url.pathname.replace(/^\/nfl-hub\//, '');
          const nf = () => Promise.resolve({ ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '' });
          if (url.host !== 'demon-x13.github.io' || /suggest_(ledger|backtest)\.json$/.test(rel) || !/^[\w./-]+\.json$/.test(rel)) return nf();
          const t = file(rel); if (t == null) return nf();
          return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t });
        };
        w.document.addEventListener('app-ready', () => { clearTimeout(timer); resolve({ w, dom, errs, payload: file('props/data/payload.json') }); });
      } });
  });
}
async function ready(w, errs) {
  for (let i = 0; i < 300 && !w.eval("typeof window.eloLoaded==='function'&&window.eloLoaded()"); i++) await sleep(100);
  try { await Promise.race([w.eval("typeof window.eloFiles==='function'?window.eloFiles():null"), sleep(30000)]); } catch (e) {}
  const why = [];
  if (!w.eval("typeof window.eloLoaded==='function'&&window.eloLoaded()")) why.push('the Elo ratings did not load');
  if (errs.length) why.push('the page threw: ' + errs.slice(0, 3).join('; '));
  for (const f of ['spUnit', 'spSet', 'spEloSet', 'spTierOut', 'spLockAt', 'settleLeg', 'parlayDec', 'kickoff'])
    if (w.eval(`typeof ${f}`) !== 'function') why.push(`the page has no ${f}`);
  return why;
}

/* ---- the units, worked out here from today's schedule: night games and Sunday slots ---- */
const NY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23' });
function kickMs(g) {
  /* the schedule's date and time are Eastern: the instant is found by trying both offsets through the zone database */
  for (const off of ['-04:00', '-05:00']) {
    const ms = Date.parse(`${g.d}T${g.t || '13:00'}:00${off}`);
    const p = Object.fromEntries(NY.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    if (`${p.year}-${p.month}-${p.day}` === g.d && `${p.hour}:${p.minute}` === (g.t || '13:00')) return ms;
  }
  return NaN;
}
/* when the record first took a set's Elo picks: the earliest taken_at of an entry of its prime or slot map that holds
   them (Infinity with none yet, so every unit locked by now is the backtest's to rebuild) */
function eloStart(Lg) {
  let t = Infinity;
  for (const map of ['prime', 'slot']) for (const e of Object.values((Lg && Lg[map]) || {})) if (e && Array.isArray(e.elo) && Date.parse(e.taken_at) < t) t = Date.parse(e.taken_at);
  return t;
}
function units(sched, season, now, until = Infinity) {
  const out = [], hasScore = g => g.hs != null && g.as != null && isFinite(g.hs) && isFinite(g.as);
  const weeks = [...new Set(sched.map(g => +g.w))].filter(w => w >= FROM_WEEK).sort((a, b) => a - b);
  for (const w of weeks) {
    const G = sched.filter(g => +g.w === w && g.d).map(g => ({ g, k: kickMs(g) })).filter(x => isFinite(x.k));
    for (const { g, k } of G) if (L.primeTime(k)) out.push({ map: 'prime', id: g.id, week: w, kick: k, games: [g] });
    const day = G.filter(x => L.slotTime(x.k)).sort((a, b) => a.k - b.k);
    if (day.length) out.push({ map: 'slot', id: L.slotId(season, w), week: w, kick: day[0].k, games: day.map(x => x.g) });
  }
  return out.filter(u => u.kick - L.LOCK_MS < Math.min(now, until) && u.games.every(hasScore)).sort((a, b) => a.kick - b.kick || (a.map < b.map ? -1 : 1));
}

/* ---- one unit's set, as the page built it at its lock on the files then published ---- */
async function rebuild(u, season) {
  const at = u.kick - L.LOCK_MS - 60e3, T = iso(at);
  const commit = git(['rev-list', '-1', '--first-parent', `--before=${T}`, REF]).trim();
  if (!commit) return { skip: `no commit before ${T}` };
  const committed = git(['show', '-s', '--format=%cI', commit]).trim();
  let b;
  try { b = await boot(commit, at); } catch (e) { return { skip: `${commit.slice(0, 7)}: ${e.message}` }; }
  const { w, dom, errs } = b;
  try {
    if (!b.payload) return { skip: `${commit.slice(0, 7)} has no payload` };
    const why = await ready(w, errs);
    if (why.length) return { skip: `${commit.slice(0, 7)}: ${why.join('; ')}` };
    if (w.eval('SEASON') !== season) return { skip: `${commit.slice(0, 7)}: the page reads another season` };
    const unit = w.eval('spUnit')(u.id);
    if (!unit) return { skip: `the page at ${commit.slice(0, 7)} has no unit ${u.id}` };
    const G = u.map === 'slot' ? unit.games : [unit];
    if (G.map(g => g.id).join() !== u.games.map(g => g.id).join()) return { skip: `the schedule at ${commit.slice(0, 7)} gives ${u.id} other games (${G.map(g => g.id).join(', ')})` };
    const kick = w.eval('kickoff')(unit).getTime(), lock = w.eval('spLockAt')(unit);
    if (kick !== u.kick || lock !== kick - L.LOCK_MS) return { skip: `the schedule at ${commit.slice(0, 7)} has ${u.id} at another kickoff (${iso(kick)})` };
    if (G.some(g => !(w.eval('kickoff')(g).getTime() > at))) return { skip: `a game of ${u.id} had kicked off by ${T}` };
    const s = w.eval('spSet')(u.id), e = w.eval('spEloSet')(u.id), out = w.eval('spTierOut');
    if (!s) return { skip: `the page at ${commit.slice(0, 7)} built no set for ${u.id}` };
    if (!e || !Array.isArray(e.tiers)) return { skip: `the page at ${commit.slice(0, 7)} built no Elo picks for ${u.id} (the matchups not there yet)` };
    const baked = w.eval('PAY.baked_at') || null;
    const head = u.map === 'slot'
      ? { season, week: u.week, gid: u.id, games: G.map(g => g.id), kickoff: iso(kick), last: iso(Math.max(...G.map(g => w.eval('kickoff')(g).getTime()))) }
      : { season, week: u.week, gid: u.id, away: unit.a, home: unit.h, kickoff: iso(kick) };
    const entry = JSON.parse(JSON.stringify({ ...head, lock: iso(lock), baked_at: baked, taken_at: T, src: 'backtest', from: { commit, committed },
      pool: { pref: s.pref, thin: s.thin, mkt: s.mkt, far: s.far }, tiers: s.tiers.map(t => out(t)), elo: e.tiers.map(t => out(t)) }));
    return { entry };
  } finally { try { w.close(); } catch (e) {} try { dom.window.close(); } catch (e) {} }
}

/* ---- the file against its rules: the record's guard on each entry, src and from, the summaries ---- */
function checkFile(B, now, Lg) {
  const bad = [];
  if (!B || typeof B !== 'object') return ['not a backtest file'];
  /* with the record beside it: no unit locked once the record took Elo picks (the record's alone) */
  const until = Lg ? eloStart(Lg) : Infinity;
  for (const map of ['prime', 'slot']) {
    for (const [key, e] of Object.entries(B[map] || {})) {
      bad.push(...L.primeEntryBad(key, e, now, map));
      if (e.src !== 'backtest' || !e.from || !/^[0-9a-f]{40}$/.test(e.from.commit || '') || !(Date.parse(e.from.committed) <= Date.parse(e.taken_at))) bad.push(`${key}: not marked a backtest from a commit before its moment`);
      if (!Array.isArray(e.elo)) bad.push(`${key}: no Elo picks`);
      if (!(Date.parse(e.lock) < until)) bad.push(`${key}: locked at ${e.lock}, once the record had taken Elo picks (${new Date(until).toISOString()}): the record's alone`);
      if (!e.grade) bad.push(`${key}: not graded`);
    }
    if (L.canon(B[map + '_summary']) !== L.canon(L.summarizePrime(B[map] || {}))) bad.push(`the ${map} summary does not follow from the entries`);
  }
  return bad;
}

async function main() {
  const now = Date.now(), check = process.argv.includes('--check');
  const startText = readText(OUT), start = startText ? JSON.parse(startText) : null;
  const Lg = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'suggest_ledger.json'), 'utf8')); } catch (e) { return null; } })();
  if (check) {
    const bad = checkFile(start, now, Lg);
    /* and every unit's commit on the site's own line, where git has that line here (a shallow checkout has not) */
    let line = null; try { line = new Set(git(['rev-list', '--first-parent', REF]).split('\n').filter(Boolean)); } catch (e) {}
    if (line && line.size > 1) { for (const map of ['prime', 'slot']) for (const [key, e] of Object.entries((start && start[map]) || {})) if (e && e.from && !line.has(e.from.commit)) bad.push(`${key}: built from ${e.from.commit}, not a commit of ${REF}'s own line`); }
    else console.log(`  (${REF}'s line is not here: the commits are not held to it)`);
    for (const b of bad) console.log('FAIL ' + b);
    console.log(`suggest backtest: ${bad.length ? 'refused, ' + bad.length + ' failure' + (bad.length === 1 ? '' : 's') : 'the file holds to its rules'}`);
    return bad.length ? 1 : 0;
  }
  /* today's page on today's files: the schedule to find the units, and the grades */
  const today = await boot(null, now);
  const why = await ready(today.w, today.errs);
  if (why.length) throw new Error('today\'s page: ' + why.join('; '));
  const season = today.w.eval('SEASON'), sched = JSON.parse(JSON.stringify(today.w.eval('S').sched));
  const next = start ? JSON.parse(JSON.stringify(start)) : {};
  next.how = HOW; next.from_week = FROM_WEEK; next.made = next.made || iso(now);
  next.prime = next.prime || {}; next.slot = next.slot || {};
  const said = [];
  try { git(['rev-parse', '--verify', REF]); } catch (e) { throw new Error(`no ${REF} to take the site's commits from (git fetch origin main)`); }
  for (const u of units(sched, season, now, eloStart(Lg))) {
    if (Object.values(next[u.map]).some(e => e.season === season && e.gid === u.id)) continue;
    const r = await rebuild(u, season);
    if (r.skip) { said.push(`left out ${u.id}: ${r.skip}`); console.log(`  ${u.id}: left out (${r.skip})`); continue; }
    next[u.map][L.primeKey(r.entry)] = r.entry;
    console.log(`  ${u.id}: built on ${r.entry.from.commit.slice(0, 7)} (${r.entry.from.committed}), ${r.entry.tiers.filter(t => t.legs).length} model levels, ${r.entry.elo.filter(t => t.legs).length} Elo picks`);
  }
  /* the grades, on today's page and files: a grade once complete is kept */
  for (const map of ['prime', 'slot']) L.gradeEntries(today.w, next[map], now, season);
  try { today.w.close(); } catch (e) {}
  for (const map of ['prime', 'slot']) next[map] = Object.fromEntries(Object.keys(next[map]).sort().map(k => [k, next[map][k]]));
  next.prime_summary = L.summarizePrime(next.prime); next.slot_summary = L.summarizePrime(next.slot);
  const out = { how: next.how, from_week: next.from_week, made: next.made, updated: null, prime_summary: next.prime_summary, prime: next.prime, slot_summary: next.slot_summary, slot: next.slot };
  /* what was in the file stays as it was, but for its grades */
  for (const map of ['prime', 'slot']) for (const [key, e] of Object.entries((start && start[map]) || {})) {
    const { grade, ...a } = e, { grade: g2, ...b } = out[map][key] || {};
    if (!out[map][key] || L.canon(a) !== L.canon(b)) throw new Error(`${key}: a unit already in the file moved`);
  }
  const bad = checkFile(out, now, Lg);
  if (bad.length) { for (const b of bad) console.log('FAIL ' + b); console.log('suggest backtest: refused, nothing written'); return 1; }
  if (start && L.canon({ ...out, updated: null }) === L.canon({ ...start, updated: null })) { console.log('suggest backtest: unchanged'); return 0; }
  out.updated = iso(now);
  fs.writeFileSync(OUT, L.dumps(out) + '\n');
  const rec = x => Object.keys(x.tiers).map(id => `${id} ${x.tiers[id].won}/${x.tiers[id].graded}`).join(', ');
  console.log(`suggest backtest: written; prime ${Object.keys(out.prime).length} (${rec(out.prime_summary)}; ${rec(out.prime_summary.elo)}), `
    + `slot ${Object.keys(out.slot).length} (${rec(out.slot_summary)}; ${rec(out.slot_summary.elo)})${said.length ? '; ' + said.join('; ') : ''}`);
  return 0;
}
module.exports = { checkFile, units, eloStart, OUT_REL, FROM_WEEK };
if (require.main === module) main().then(c => process.exit(c), e => { console.log('suggest backtest: refused: ' + (e && e.stack || e)); process.exit(1); });
