/* The suggestions record: what the Parlay Builder's suggested parlays said before each wave of
   kickoffs, frozen there, and what happened to them.

     node props/build/suggest_ledger.js      (the props job runs it from weekly.py once the audit is clean)

   Why. On Sunday 11 October 2026 the owner's parlays did badly, and the review found the prop model
   over-confident against DraftKings every week since week 2 and the suggested parlays, built from its
   biggest edges, collecting its mistakes (the 1pm Safe pair said 53% where the book's fair chance was
   about 24%). App v98 leads every suggestion with the book's fair chance and leaves out the legs far
   off the market. This is the record that says, over the weeks, how the suggestions themselves did
   against both chances: written down as the panel showed them, before the games, never rebuilt after.

   What an entry is. The panel's four levels, Safe, Medium, Aggressive and Extreme, under its default
   choices (All, every game still to kick off ticked, the default Bet amount: what a visitor who has
   never touched the panel sees), taken from the published page itself: nflbets/index.html booted in
   jsdom on the payload the job has just baked, with the Elo files beside it (market + form decides
   which player legs qualify) and the window's clock at the run's time, read by the page's own
   getPbTiers. Keyed by the season, the week and the kickoff wave: the earliest kickoff among the
   games still to come at that moment. While that kickoff is to come, a run rewrites the entry
   whenever the panel has changed (prices pulled, a player ruled out); from that kickoff it is frozen
   and never changed again, so each entry is the panel as the job last saw it before that wave of
   games. The job lands late and not every hour, so a wave with no run between the kickoff before it
   and its own has no entry, and an entry not frozen that is no longer the wave (the schedule moved
   its game before it came) is dropped. With no game to come (a Monday night once it has kicked off,
   the season over) nothing new is taken.

   Each level as its card shows it: its legs (game, week, player or team, the team, stat, line, side,
   main line or not, the book's price and its source, the name and label, the model's chance, the
   leg's fair chance and whether it is estimated, thin edge, no edge), the model's chance all land
   (the builder's parlayProb), the book's fair chance (parlayFair; null where a leg has none), the
   decimal price (parlayDec: the payout on $1) and whether it is the likeliest of its size; an empty
   level keeps why it is empty. Chances to four places, prices to three.

   Grading. A frozen entry's level is graded once every leg has settled by the app's own settleLeg
   (settleGameLeg for a team's win or cover and a total) on the payload as baked: a leg lost loses the
   parlay; a push, or a void, drops out as a book drops it, the rest paid at parlayDec on the legs left
   (the whole price when none dropped), and every leg a push or void is a push, the stake back. Pending
   while any leg's game or stats are out. A player with no stat line once his game's stats are in is
   not void by that alone: nflverse writes a player's week only when he has a stat, so a receiver who
   played and was never targeted has none, and DraftKings grades a player who takes part in one play
   on what he did (zero catches: the over loses, the under wins). So such a leg is read against who
   played, nflverse's snap counts (PFR's, snap_counts_<season>.csv, which weekly.py downloads beside
   the roster, matched by the roster's PFR id, else by his name within his club): a snap of any kind
   and he is graded on zero by settleLeg itself (the page's own rowStats of nothing), none with his
   club's snaps in and the leg is void; with no snap counts for his club's game yet, Out on that week's
   injury report is void and anything else waits (pending) for them. A grade once made is replaced only
   by another complete one (a stat corrected), never undone by a payload that no longer holds the week;
   only the page's own season is graded at all, and an entry of another season keeps the grade it has
   (the app's actuals are this season's alone, so last season's week 5 would read this season's).
   Each level's grade: the result, each leg's settlement, and the payout on $1 (0 for a loss).

   The summary, per level, over the parlays graded won or lost (a push is counted apart): how many,
   how many won, the wins expected by the fair chance and by the model's (the sums of the chances the
   panel showed; a parlay a push shortened counts on its full chance), how many had a fair chance,
   and the units on $1 (the payout less the stake; a push is 0). A parlay counts once: an entry is the
   whole week's panel, so the same level parlay (the same legs, in any order) is frozen into every wave
   it outlived, and it is counted from the last of them, the panel nearest its games; `repeats` says how
   many frozen levels that set aside. The Parlay Builder's foot draws the same record from the entries
   (pbRecSum in part3.js, the same rule).

   The guard. Before anything is written the new ledger is held to the file the run started from: an
   entry whose kickoff has passed may not be gone or differ in anything but its grade; every entry was
   taken before its kickoff; an entry new or changed is this run's, for a wave still to come; a grade is
   only on a frozen entry and follows its legs' settlements; the summary follows from the entries. And
   to the last commit's (git show HEAD; SUGGEST_PREV names another file, 'none' skips it): no entry it
   had frozen may be gone or changed, whatever the file on disk says. A
   ledger that fails is not written, the file is put back as it was (the last commit's where the file
   on disk had itself moved a frozen entry), and the run exits 1. weekly.py logs that and goes on:
   the record never blocks the publish or turns it red.

   The page runs on the run's clock held still (SUGGEST_NOW or the machine's at the start), so a boot
   that takes seconds cannot carry it past a kickoff the script itself still counts as to come.

   SUGGEST_NOW (the clock), SUGGEST_PAYLOAD, SUGGEST_LEDGER, SUGGEST_PREV, SUGGEST_SNAPS and
   SUGGEST_ROSTER (the snap counts and the roster their PFR ids are read from; 'none' for neither) are
   for the test, test_suggest_ledger.js. No odds-API credit is ever spent: the page reads local files only.
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
const PAGE = path.join(ROOT, 'nflbets', 'index.html');
const PAGE_URL = 'https://demon-x13.github.io/nfl-hub/nflbets/';
const SINCE = '2026-10-12';
/* the panel's levels (PB_TIERS in part3.js; a run whose page has others is refused) */
const TIERS = ['safe', 'med', 'aggr', 'xtrm'], LABELS = { safe: 'Safe', med: 'Medium', aggr: 'Aggressive', xtrm: 'Extreme' };
const HOW = 'The suggestions record, written by props/build/suggest_ledger.js in the props job: the Parlay Builder\'s four suggested '
  + 'parlays under the default choices (All, every game still to kick off, the default Bet amount), taken from the published page on '
  + 'the payload just baked, keyed by season|week|kickoff wave (the earliest kickoff still to come at the run), rewritten while that '
  + 'kickoff is to come and frozen from it, so each entry is the panel as the job last saw it before that wave. A frozen entry is graded '
  + 'by the app\'s settleLeg once every leg has settled (a push or void leg drops out as a book drops it; every leg a push or void is a '
  + 'push; a player with no stat line who took a snap, by nflverse\'s snap counts, is graded on zero, one who did not is void), the payout '
  + 'on a $1 stake. summary: per level, parlays graded won or lost, each parlay once however many waves showed it, won, the wins expected '
  + 'by the fair chance and by the model\'s, and units on $1. Never edited by hand: the script refuses a ledger whose frozen entries moved.';

const r4 = v => v == null || !isFinite(v) ? null : Math.round(v * 1e4) / 1e4;
const r3 = v => v == null || !isFinite(v) ? null : Math.round(v * 1e3) / 1e3;
const iso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, y) => (o[y] = x[y], o), {}) : x);
const callOf = e => { const { grade, ...c } = e || {}; return c; };
/* the file's own style: one-space indent, each leg, grade, game list and pool on a line of its own,
   so an entry reads down the page and a grade added is a small diff */
const ONE_LINE = p => (p.length === 6 && p[0] === 'entries' && p[2] === 'tiers' && p[4] === 'legs')
  || (p.length === 4 && p[0] === 'entries' && p[2] === 'grade') || (p.length === 3 && p[0] === 'entries' && (p[2] === 'games' || p[2] === 'pool'))
  || (p.length === 3 && p[0] === 'summary' && p[1] === 'tiers');
function dumps(v, ind = '', p = []) {
  const pad = ind + ' ';
  if (v && typeof v === 'object' && (ONE_LINE(p) || !Object.keys(v).length)) return JSON.stringify(v);
  if (Array.isArray(v)) return '[\n' + v.map((x, i) => pad + dumps(x, pad, [...p, i])).join(',\n') + '\n' + ind + ']';
  if (v && typeof v === 'object') return '{\n' + Object.keys(v).map(k => pad + JSON.stringify(k) + ': ' + dumps(v[k], pad, [...p, k])).join(',\n') + '\n' + ind + '}';
  return JSON.stringify(v);
}
const readText = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
const parse = t => { if (t == null) return null; try { return JSON.parse(t); } catch (e) { return undefined; } };

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
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { if (!/navigation/i.test(String(e && e.message))) errs.push('jsdom: ' + (e && e.message)); });
    const timer = setTimeout(() => reject(new Error('the page did not say app-ready within 60 s')), 60000);
    new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: PAGE_URL, virtualConsole: vc,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        /* the window's clock is the run's, held still: a boot of a few seconds must not carry the page
           past a kickoff the script, on the same instant, still counts as to come */
        const D0 = w.Date;
        class D extends D0 { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
        w.Date = D;
        w.addEventListener('error', e => errs.push(e.message));
        /* the payload just baked, and the page's other files from this checkout; nothing else */
        w.fetch = u => {
          const url = new URL(String(u), PAGE_URL), rel = url.pathname.replace(/^\/nfl-hub\//, '');
          const ok = t => Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t });
          if (url.host === 'demon-x13.github.io' && rel === 'props/data/payload.json') return ok(payloadText);
          if (url.host === 'demon-x13.github.io' && /^(elo\/data|betting|liveparlays|props\/data)\/[\w.-]+\.json$/.test(rel) && rel !== LEDGER_REL) {
            const t = readText(path.join(ROOT, rel)); if (t != null) return ok(t); }
          return Promise.resolve({ ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '' });
        };
        w.document.addEventListener('app-ready', () => { clearTimeout(timer); resolve({ w, errs }); });
      } });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function ready(w, errs, payload) {
  for (let i = 0; i < 300 && !w.eval("typeof window.eloLoaded==='function'&&window.eloLoaded()"); i++) await sleep(100);
  const why = [];
  const PAY = w.eval('typeof PAY==="undefined"?null:PAY');
  if (!PAY || PAY.baked_at !== payload.baked_at) why.push('the page did not load the payload');
  if (!w.eval("typeof window.eloLoaded==='function'&&window.eloLoaded()")) why.push('the Elo files did not load, so the page would take no player leg (market + form)');
  if (errs.length) why.push('the page threw: ' + errs.slice(0, 3).join('; '));
  if (w.eval('PB_TIERS').map(t => t[0] + ':' + t[1]).join() !== TIERS.map(id => id + ':' + LABELS[id]).join()) why.push("the page's levels are not the four this record keeps");
  const u = w.eval('pbUi()'), all = w.eval('PB_KINDS').every(([k]) => u.k[k]);
  if (!all || u.off.length) why.push('the panel is not on its default choices');
  return why;
}

/* ---- the panel as a visitor's page shows it now: null with no game to come ---- */
function takePanel(w, now) {
  const games = w.eval('pbGames()');
  if (!games.length) return null;
  const kick = w.eval('kickoff'), legFair = w.eval('legFair'), season = w.eval('SEASON'), week = w.eval('currentWeek()');
  const wave = Math.min(...games.map(g => kick(g).getTime()));
  if (!(wave > now)) throw new Error('a game still to come kicks off at or before the clock');
  const r = w.eval('getPbTiers()'), memo = {};
  const leg = l => { const f = legFair(l, memo);
    return { gid: l.gid, week: l.week, pid: l.pid, team: l.team, grp: l.grp, stat: l.stat, k: l.k, side: l.side, main: !!l.main,
      price: l.price, src: l.src, name: l.name, label: l.label, p: r4(l.p), fair: f ? r4(f.p) : null, fair_est: !!(f && f.est),
      thin: !!l.thin, market: !!l.market }; };
  const tiers = r.tiers.map(t => t.legs
    ? { id: t.id, label: t.label, n: t.n, floor: t.floor, legs: t.legs.map(leg), p: r4(t.corr),
        fair: t.fair && t.fair.p != null ? r4(t.fair.p) : null, fair_est: !!(t.fair && t.fair.est), dec: r3(t.dec),
        likeliest: !!t.likeliest, thin: t.thin || 0, mkt: t.mkt || 0 }
    : { id: t.id, label: t.label, n: t.n, floor: t.floor, why: t.why });
  return { key: `${season}|${String(week).padStart(2, '0')}|${iso(wave)}`,
    entry: { season, week, kickoff: iso(wave), games: games.map(g => g.id), baked_at: w.eval('PAY.baked_at') || null,
      pool: { pref: r.pref, thin: r.thin, mkt: r.mkt, far: r.far }, tiers } };
}

/* ---- who played: nflverse's snap counts, for a player the app would void ----
   { teams: Set of 'gid|team' whose snaps are in, snaps: Map 'gid|pfr' and 'gid|team|name' -> snaps of
   any kind }, and the roster's gsis id -> PFR id; null where the file is not there or not the shape */
function readCsv(f) {
  const t = f && f !== 'none' ? readText(f) : null; if (t == null) return null;
  const Papa = require(path.join(HERE, 'node_modules', 'papaparse'));
  return Papa.parse(t, { header: true, skipEmptyLines: true }).data;
}
function whoPlayed(season, normName) {
  const raw = path.join(ROOT, 'props', 'raw');
  const rows = readCsv(process.env.SUGGEST_SNAPS || path.join(raw, `snap_counts_${season}.csv`));
  const ros = readCsv(process.env.SUGGEST_ROSTER || path.join(raw, `roster_${season}.csv`));
  const pfr = new Map();
  for (const r of ros || []) if (r.gsis_id && r.pfr_id) pfr.set(r.gsis_id, r.pfr_id);
  if (!rows || !rows.length || !('game_id' in rows[0]) || !('offense_snaps' in rows[0])) return { teams: new Set(), snaps: new Map(), pfr, file: false };
  const teams = new Set(), snaps = new Map(), n = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
  for (const r of rows) {
    if (!r.game_id || !r.team) continue;
    teams.add(r.game_id + '|' + r.team);
    const s = n(r.offense_snaps) + n(r.defense_snaps) + n(r.st_snaps);
    if (r.pfr_player_id) snaps.set(r.game_id + '|' + r.pfr_player_id, Math.max(s, snaps.get(r.game_id + '|' + r.pfr_player_id) || 0));
    const k = r.game_id + '|' + r.team + '|' + normName(r.player);
    snaps.set(k, Math.max(s, snaps.get(k) || 0));
  }
  return { teams, snaps, pfr, file: true };
}
/* a leg the app voids (no stat line once his game's stats are in), read against who played: a snap
   and he is graded on zero by the app's own settleLeg; his club's snaps in without him, void; no
   snaps for his club's game yet, void only when the injury report had him Out, else pending */
function noLine(w, l, who, out) {
  const g = l.gid + '|' + l.team, key = who.pfr.get(l.pid);
  if (who.teams.has(g)) {
    const s = (key && who.snaps.get(l.gid + '|' + key)) || who.snaps.get(g + '|' + w.eval('normName')(l.name)) || 0;
    if (!(s > 0)) return 'void';
    const S = w.eval('S'), wk = String(l.week), had = !!S.actuals[wk], A = (S.actuals[wk] ??= {});
    A[l.pid] = { ...w.eval('rowStats')({}), team: l.team };
    try { return w.eval('settleLeg')({ ...l }) || null; } finally { delete A[l.pid]; if (!had) delete S.actuals[wk]; }
  }
  return out.has(String(l.week) + '|' + l.pid) ? 'void' : null;
}

/* ---- a level's grade, by the app's own settlement ---- */
function gradeTier(w, t, who, out) {
  const settle = w.eval('settleLeg'), parlayDec = w.eval('parlayDec'), isGame = w.eval('isGameLeg');
  const sched = new Set(w.eval('S').sched.map(g => g.id));
  /* a leg on a game the page's schedule does not hold (another season's) cannot be settled here */
  const one = l => { if (!sched.has(l.gid)) return null; const s = settle({ ...l }) || null;
    return s === 'void' && !isGame(l) ? noLine(w, l, who, out) : s; };
  const legs = t.legs.map(one);
  if (legs.some(x => x == null)) return { result: 'pending', legs };
  if (legs.includes('loss')) return { result: 'lost', legs, payout: 0 };
  const left = t.legs.filter((l, i) => legs[i] === 'win');
  if (!left.length) return { result: 'push', legs, payout: 1 };
  const payout = left.length === t.legs.length ? t.dec : r3(parlayDec(left.map(l => ({ leg: { ...l }, ml: l.price }))));
  return { result: 'won', legs, payout };
}
const DONE = new Set(['won', 'lost', 'push']);

/* ---- the summary: the same record the Parlay Builder's foot draws ----
   one parlay, one count: a level parlay (its legs, in any order) of a season's week (its entry's key,
   season|week|kickoff) frozen into several waves' entries is counted from the last of them */
const legId = l => [l.gid, l.pid, l.stat, l.side, l.k, l.main ? 1 : 0].join('|');
const parlayId = (key, t) => [String(key).split('|').slice(0, 2).join('|'), t.id, t.legs.map(legId).sort().join('+')].join('#');
function summarize(entries) {
  const out = {}, last = new Map(); let pending = 0, frozen = 0, seen = 0;
  for (const id of TIERS) out[id] = { label: LABELS[id], graded: 0, won: 0, lost: 0, push: 0, exp_fair: 0, fair_n: 0, exp_model: 0, units: 0 };
  for (const key of Object.keys(entries).sort()) {
    const e = entries[key]; if (!e.grade) continue; frozen++;
    for (const t of e.tiers || []) { const g = e.grade[t.id]; if (!g || !out[t.id] || !Array.isArray(t.legs)) continue; seen++; last.set(parlayId(key, t), { t, g }); }
  }
  for (const { t, g } of last.values()) {
    const s = out[t.id];
    if (g.result === 'pending') { pending++; continue; }
    if (g.result === 'push') { s.push++; continue; }
    s.graded++; if (g.result === 'won') s.won++; else s.lost++;
    s.exp_model += t.p; if (t.fair != null) { s.exp_fair += t.fair; s.fair_n++; }
    s.units += g.payout - 1;
  }
  for (const id of TIERS) { const s = out[id]; s.exp_fair = r4(s.exp_fair); s.exp_model = r4(s.exp_model); s.units = r3(s.units); }
  return { tiers: out, pending, repeats: seen - last.size, frozen_entries: frozen, entries: Object.keys(entries).length };
}

/* ---- the guard: every failure as a sentence; none is a ledger fit to write ---- */
/* the entries prev had frozen (their kickoff passed by now) that L has lost or changed, grades aside */
function frozenMoved(L, prev, now) {
  const bad = [], E = (L && L.entries) || {};
  for (const [key, pe] of Object.entries((prev && prev.entries) || {})) {
    if (!pe || !pe.kickoff || Date.parse(pe.kickoff) > now) continue;
    const e = E[key];
    if (!e) { bad.push(`${key}: an entry frozen at its kickoff ${pe.kickoff} is gone`); continue; }
    if (canon(callOf(e)) !== canon(callOf(pe))) {
      const diff = [...new Set([...Object.keys(callOf(e)), ...Object.keys(callOf(pe))])].filter(k => canon(e[k]) !== canon(pe[k]));
      bad.push(`${key}: frozen at its kickoff ${pe.kickoff}, and changed (${diff.join(', ')})`);
    }
  }
  return bad;
}
function check(L, prev, now, runAt) {
  const bad = [], E = (L && L.entries) || {}, t = s => Date.parse(s);
  for (const [key, e] of Object.entries(E)) {
    if (!e || !e.kickoff || !e.taken_at) { bad.push(`${key}: no kickoff or no time taken`); continue; }
    if (!(t(e.taken_at) < t(e.kickoff))) bad.push(`${key}: taken at ${e.taken_at}, at or after its kickoff ${e.kickoff}`);
    if (!key.endsWith('|' + e.kickoff)) bad.push(`${key}: keyed on another kickoff than its own ${e.kickoff}`);
    const frozen = t(e.kickoff) <= now;
    if (e.grade && !frozen) bad.push(`${key}: graded before its kickoff`);
    for (const [id, g] of Object.entries(e.grade || {})) {
      const tier = (e.tiers || []).find(x => x.id === id);
      if (!tier || !tier.legs) { bad.push(`${key} ${id}: a grade for a level with no parlay`); continue; }
      const s = g.legs || [];
      const ok = s.length === tier.legs.length && s.every(x => x == null || ['win', 'loss', 'push', 'void'].includes(x));
      const want = !ok ? null : s.some(x => x == null) ? 'pending' : s.includes('loss') ? 'lost' : s.every(x => x !== 'win') ? 'push' : 'won';
      if (!ok || g.result !== want) { bad.push(`${key} ${id}: graded ${g.result} on legs ${JSON.stringify(s)}`); continue; }
      if (want === 'lost' && g.payout !== 0) bad.push(`${key} ${id}: a loss paying ${g.payout}`);
      if (want === 'push' && g.payout !== 1) bad.push(`${key} ${id}: a push paying ${g.payout}`);
      if (want === 'won' && !(g.payout > 1)) bad.push(`${key} ${id}: a win paying ${g.payout}`);
      if (want === 'won' && s.every(x => x === 'win') && g.payout !== tier.dec) bad.push(`${key} ${id}: every leg won and it pays ${g.payout}, not its price ${tier.dec}`);
    }
  }
  if (prev) {
    bad.push(...frozenMoved(L, prev, now));
    for (const [key, e] of Object.entries(E)) {
      const pe = (prev.entries || {})[key];
      if (pe && canon(callOf(e)) === canon(callOf(pe))) continue;
      if (e.taken_at !== runAt || !(t(e.kickoff) > now)) bad.push(`${key}: new or changed, and not taken by this run before its kickoff`);
    }
  }
  if (canon(L.summary) !== canon(summarize(E))) bad.push('the summary does not follow from the entries');
  return bad;
}

async function main() {
  const now = nowMs(), runAt = iso(now);
  const startText = readText(LEDGER), headText = prevText();
  const start = parse(startText), head = parse(headText);
  if (start === undefined) throw new Error(LEDGER + ' is not JSON');
  const payloadText = readText(PAYLOAD); if (payloadText == null) throw new Error('no payload at ' + PAYLOAD);
  const payload = JSON.parse(payloadText);
  const { w, errs } = await boot(payloadText, now);
  const why = await ready(w, errs, payload);
  if (why.length) throw new Error(why.join('; '));

  const base = start || { how: HOW, since: SINCE, updated: null, summary: null, entries: {} };
  const next = JSON.parse(JSON.stringify(base));
  next.how = HOW; next.since = base.since || SINCE; next.entries = next.entries || {};
  const E = next.entries, said = [];
  /* the wave to come: rewritten while its kickoff is to come, when the panel has changed */
  const take = takePanel(w, now);
  for (const [key, e] of Object.entries(E))
    if (Date.parse(e.kickoff) > now && (!take || key !== take.key)) { delete E[key]; said.push(`dropped ${key}, no longer the wave`); }
  if (take) {
    const old = E[take.key], { baked_at, ...fresh } = take.entry;
    const same = old && (() => { const { taken_at, baked_at: b, ...o } = callOf(old); return canon(o) === canon(fresh); })();
    if (!same) { E[take.key] = { ...take.entry, taken_at: runAt }; said.push(`${old ? 'rewrote' : 'took'} ${take.key}`); }
    else said.push(`${take.key} unchanged`);
  } else said.push('no game to come');
  /* the frozen entries' grades: this season's only (another's keeps the grade it has) */
  const season = w.eval('SEASON'), who = whoPlayed(season, w.eval('normName'));
  const ruledOut = new Set((payload.injuries || []).filter(r => r && r.report_status === 'Out').map(r => String(+r.week) + '|' + r.gsis_id));
  if (!who.file) said.push('no snap counts: a leg on a player with no stat line waits');
  for (const [key, e] of Object.entries(E)) {
    if (Date.parse(e.kickoff) > now || e.season !== season) continue;
    const g = {};
    for (const t of e.tiers || []) {
      if (!t.legs) continue;
      const was = (e.grade || {})[t.id], now1 = gradeTier(w, t, who, ruledOut);
      g[t.id] = now1.result === 'pending' && was && DONE.has(was.result) ? was : now1;
    }
    e.grade = g;
  }
  /* the entries in kickoff order, then the summary */
  next.entries = Object.fromEntries(Object.keys(E).sort().map(k => [k, E[k]]));
  next.summary = summarize(next.entries);

  const bad = check(next, start, now, runAt);
  /* against the last commit, what it had frozen (an entry still to come may differ from it by an
     earlier run's rewrite not yet committed) */
  if (head && headText !== startText) bad.push(...frozenMoved(next, head, now).map(b => 'against the last commit: ' + b));
  if (bad.length) {
    for (const b of bad) console.log('FAIL ' + b);
    /* put the file back: the last commit's where the file on disk had itself moved a frozen entry */
    const startBad = !!(head && start && frozenMoved(start, head, now).length);
    const back = startBad ? headText : startText;
    if (back == null) { try { fs.unlinkSync(LEDGER); } catch (e) {} } else if (readText(LEDGER) !== back) fs.writeFileSync(LEDGER, back);
    console.log(`suggest ledger: refused, ${bad.length} failure${bad.length === 1 ? '' : 's'}; the ${startBad ? "last commit's" : 'last good'} ledger stays`);
    return 1;
  }
  const s = next.summary, rec = TIERS.map(id => `${id} ${s.tiers[id].won}/${s.tiers[id].graded}`).join(', ');
  const tail = `${s.entries} entr${s.entries === 1 ? 'y' : 'ies'}, ${s.pending} level${s.pending === 1 ? '' : 's'} pending; won/graded ${rec}`;
  if (start && canon({ ...next, updated: null }) === canon({ ...start, updated: null })) {
    console.log(`suggest ledger: unchanged (${said.join('; ')}); ${tail}`); return 0; }
  next.updated = runAt;
  const out = { how: next.how, since: next.since, updated: next.updated, summary: next.summary, entries: next.entries };
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, dumps(out) + '\n');
  console.log(`suggest ledger: written (${said.join('; ')}); ${tail}`);
  return 0;
}

module.exports = { check, frozenMoved, summarize, parlayId, callOf, canon, dumps, TIERS, LABELS, LEDGER_REL };
if (require.main === module) {
  main().then(code => process.exit(code), e => { console.log('suggest ledger: refused: ' + (e && e.message || e)); process.exit(1); });
}
