/* The test of suggest_ledger.js: the suggestions record taken, rewritten, frozen and graded on
   made-up weeks, and the guard that refuses a ledger whose frozen entries moved.

     node props/build/test_suggest_ledger.js      ends "N checks, 0 failures"; exit 1 otherwise

   Each run is the script itself, as the props job runs it, on a made-up payload in a scratch folder
   with the clock set (SUGGEST_NOW), never on the real ledger. The made-up weeks are cut from the
   real payload: its latest week with player prices (W) is put back before its first kickoff (no
   scores, no stats), then played out a game at a time, with a made-up score wherever the real one
   is not in yet, so the test holds in any week of the season.

     A  the day of W's first kickoff: the wave is that kickoff, and its entry is taken. A2: a run a
        second before that kickoff keeps it (the page's clock is the run's, held still).
     B  hours later, the prices pulled again (here: W's player prices gone and the Safe parlay's games
        off the board): the entry is rewritten, and an entry no longer the wave is dropped.
     B2 the same payload again: nothing is written, byte for byte.
     C  the morning after the first game, its score and stats in and the prices back: the first entry
        is frozen exactly as B left it and graded as far as its legs allow, and the next wave is taken.
     D  W played out (made-up scores where the real ones are missing, a made-up void and push), with
        made-up frozen entries planted to hold every rule of a book's settlement: each level graded
        by the legs' own results, worked here from the raw scores, stat rows, the payload's snap counts
        (PAY.snaps, as weekly.py's who_played bakes them) and injury report and never by the app's code
        (a player with no stat line who took a snap graded on zero; one his club's snaps leave out, or
        Out with his club's snaps not in, void; neither, pending); a grade kept when the payload can no longer settle it; last season's entry, whose
        players have this season's rows in the same week, never regraded; a parlay frozen into two
        waves counted once; both waves unmoved; the next week's first wave taken.
     E  W's last kickoff under way: no game to come, so nothing new is taken (E2: nothing written).
     F  the guard: a ledger on disk whose frozen entry was edited is refused and the last commit's
        put back, while a wave to come rewritten since that commit is not; a payload that is not there is refused with the file untouched; and check() on
        hand-made ledgers fails every frozen entry changed or gone, a grade before kickoff, a grade
        that does not follow its legs, an entry taken at or after its kickoff or not by this run, and
        a summary that does not follow from the entries. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..');
const SCRIPT = path.join(HERE, 'suggest_ledger.js');
const SL = require('./suggest_ledger.js');
const REAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8'));
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest_ledger_'));
const LEDGER = path.join(DIR, 'suggest_ledger.json');

let n = 0; const fails = [];
const chk = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const clone = x => JSON.parse(JSON.stringify(x));
const iso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const H = 3600e3;
/* a schedule row's kickoff: its Eastern date and time, through the time zone database */
const etKick = g => { const naive = Date.parse(`${g.d}T${g.t || '13:00'}:00Z`);
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(naive)).find(p => p.type === 'timeZoneName');
  const m = tz && tz.value.match(/GMT([+-]\d+)/); return naive - (m ? +m[1] : -5) * H; };
const dec = ml => ml > 0 ? ml / 100 + 1 : 100 / -ml + 1;
const r3 = v => Math.round(v * 1e3) / 1e3;

/* one run of the script on a made-up payload at a made-up time */
let seq = 0;
function run(pay, now, extra = {}) {
  const pf = path.join(DIR, `payload_${++seq}.json`); fs.writeFileSync(pf, JSON.stringify(pay));
  const r = cp.spawnSync('node', [SCRIPT], { encoding: 'utf8', env: { ...process.env, SUGGEST_NOW: iso(now), SUGGEST_PAYLOAD: pf,
    SUGGEST_LEDGER: LEDGER, SUGGEST_PREV: 'none', ...extra } });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, out, last: out.trim().split('\n').pop() };
}
const read = () => JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const bytes = () => fs.readFileSync(LEDGER, 'utf8');

/* a stage the stages before it left broken stops with a failure, never a crash */
process.on('uncaughtException', e => { chk(false, 'the test stopped: ' + (e && e.stack || e)); end(); });
function end() {
  console.log(`${n} checks, ${fails.length} failures`);
  for (const f of fails) console.log('  FAIL: ' + f);
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails.length ? 1 : 0);
}

/* ---- the made-up week ---- */
const weeks = [...new Set(REAL.sched.map(g => +g.w))].sort((a, b) => a - b);
const priced = weeks.filter(w => ((REAL.prices || {})[String(w)] || []).length);
const W = priced.length ? priced[priced.length - 1] : weeks[0], WS = String(W);
const games = REAL.sched.filter(g => +g.w === W).sort((a, b) => etKick(a) - etKick(b));
const kicks = [...new Set(games.map(etKick))].sort((a, b) => a - b);
const first = games.filter(g => etKick(g) === kicks[0]), lastKick = kicks[kicks.length - 1];
const realStats = (REAL.stats || {})[WS] || [];
const teamsOf = gs => new Set(gs.flatMap(g => [g.h, g.a]));
const rowsFor = gs => { const t = teamsOf(gs); return realStats.filter(r => t.has(r.team)); };
/* a score for every game: the real one, else a made-up home win, 24-20 */
const scoreOf = g => g.hs != null && g.as != null ? { hs: g.hs, as: g.as } : { hs: 24, as: 20 };
function week(pay, { scored = [], stats = [] } = {}) {
  const ids = new Set(scored.map(g => g.id));
  for (const g of pay.sched) if (+g.w === W) { if (ids.has(g.id)) Object.assign(g, scoreOf(REAL.sched.find(x => x.id === g.id))); else { delete g.hs; delete g.as; } }
  for (const g of pay.sched) if (+g.w > W) { delete g.hs; delete g.as; }
  pay.stats = Object.fromEntries(Object.entries(pay.stats || {}).filter(([k]) => +k < W));
  if (stats.length) pay.stats[WS] = stats;
  /* who played (PAY.snaps): the real payload's, for the games played here, where it has them */
  pay.snaps = Object.fromEntries(Object.entries(pay.snaps || {}).filter(([k]) => +k < W));
  if (stats.length) pay.snaps[WS] = Object.fromEntries(Object.entries(((REAL.snaps || {})[WS]) || {}).filter(([gid]) => ids.has(gid)));
  return pay;
}
const stamp = (pay, t) => { pay.baked_at = iso(t).replace(/Z$/, '+00:00'); return pay; };

const tA = kicks[0] - 8 * H;
const P0 = stamp(week(clone(REAL)), tA - H);
const season = (() => { const m = fs.readFileSync(path.join(HERE, 'part2.js'), 'utf8').match(/const SEASON=(\d{4})/); return +m[1]; })();
const kA = `${season}|${String(W).padStart(2, '0')}|${iso(kicks[0])}`;

/* A: the wave is W's first kickoff */
let r = run(P0, tA);
chk(r.code === 0 && /^suggest ledger: written/.test(r.last), 'A: the first run did not write a ledger: ' + r.out.slice(-400));
let L = read(), eA = L.entries[kA];
chk(!!eA && Object.keys(L.entries).length === 1, `A: the one entry is not ${kA}: ${Object.keys(L.entries).join(', ')}`);
chk(!!eA && eA.taken_at === iso(tA) && eA.kickoff === iso(kicks[0]) && eA.week === W && eA.season === season, 'A: the entry is not dated by its run and its wave');
chk(!!eA && eA.games.length === games.length && games.every(g => eA.games.includes(g.id)), 'A: the entry is not built on every game of the week still to come');
chk(!!eA && eA.tiers.map(t => t.id).join() === 'safe,med,aggr,xtrm' && !eA.grade, 'A: the entry does not hold the four levels, ungraded');
const safeA = eA && eA.tiers[0];
chk(!!(safeA && safeA.legs && safeA.legs.length === 2), 'A: the made-up week gives no Safe parlay to hold the rewrite to');
for (const t of (eA ? eA.tiers : []).filter(t => t.legs)) {
  chk(t.legs.length === t.n && t.p > 0 && t.p < 1 && t.dec > 1 && (t.fair == null || (t.fair > 0 && t.fair < 1)), `A: ${t.id} is not a parlay of its size with a chance and a price`);
  chk(t.legs.every(l => l.gid && l.week === W && l.pid && l.stat && l.side && isFinite(l.k) && isFinite(l.price) && l.src === 'real' && l.name && l.label && l.p > 0 && l.p < 1), `A: a ${t.id} leg is missing what it needs to be graded`);
  /* legs in different games, one leg each: the price is the product of theirs */
  if (new Set(t.legs.map(l => l.gid)).size === t.legs.length) chk(Math.abs(t.dec - t.legs.reduce((a, l) => a * dec(l.price), 1)) < 0.002, `A: ${t.id}'s price is not its legs' product`);
}
chk(L.summary && L.summary.entries === 1 && L.summary.frozen_entries === 0, 'A: the summary does not count one entry, none frozen');
/* A2: a run a second before that kickoff, whose boot takes longer than that: the wave is still
   to come on the run's clock, so its entry stays (a page clock running on would drop it) */
{ const keep = bytes(); r = run(P0, kicks[0] - 1000);
  chk(r.code === 0 && !!read().entries[kA] && !/dropped/.test(r.last), 'A2: a run a second before the kickoff dropped its wave: ' + r.last);
  fs.writeFileSync(LEDGER, keep); }

/* B: the prices move before the kickoff: rewritten; an entry no longer the wave is dropped */
const tB = tA + 4 * H;
const P0b = stamp(clone(P0), tB - H);
P0b.prices[WS] = []; if (P0b.mkt) P0b.mkt[WS] = {};
const safeGames = new Set((safeA && safeA.legs || []).map(l => l.gid));
for (const g of P0b.sched) if (safeGames.has(g.id)) for (const k of ['sp', 'tot', 'mla', 'mlh', 'spa', 'sph', 'tov', 'tou']) delete g[k];
{ const x = read(), stale = clone(eA); stale.kickoff = iso(lastKick); stale.taken_at = iso(tA - H);
  x.entries[`${season}|${String(W).padStart(2, '0')}|${iso(lastKick)}`] = stale; x.summary = SL.summarize(x.entries);
  fs.writeFileSync(LEDGER, JSON.stringify(x, null, 1)); }
r = run(P0b, tB);
L = read(); const eB = L.entries[kA];
chk(r.code === 0 && /rewrote/.test(r.last), 'B: the entry was not rewritten: ' + r.last);
chk(!!eB && eB.taken_at === iso(tB) && JSON.stringify(eB.tiers) !== JSON.stringify(eA.tiers), 'B: the rewritten entry is not the new panel, dated by its run');
chk(!!eB && eB.tiers.every(t => !t.legs || t.legs.every(l => l.grp === 'TEAM' && !safeGames.has(l.gid))), 'B: the rewritten entry still holds a leg the new payload has no price for');
chk(Object.keys(L.entries).length === 1, 'B: an entry that is no longer the wave was not dropped: ' + Object.keys(L.entries).join(', '));
/* B2: nothing changed, nothing written */
const before = bytes();
r = run(P0b, tB + H);
chk(r.code === 0 && /^suggest ledger: unchanged/.test(r.last) && bytes() === before, 'B2: a run that changed nothing wrote the ledger: ' + r.last);

/* C: the first game played; frozen as B left it; the next wave taken */
const tC = kicks[0] + 16 * H;
const P1 = stamp(week(clone(REAL), { scored: first, stats: rowsFor(first) }), tC - H);
r = run(P1, tC);
L = read(); const eC = L.entries[kA];
chk(r.code === 0, 'C: the run failed: ' + r.out.slice(-400));
chk(!!eC && JSON.stringify(SL.callOf(eC)) === JSON.stringify(SL.callOf(eB)), 'C: the first entry moved after its kickoff');
chk(!!eC && !!eC.grade && Object.keys(eC.grade).join() === eC.tiers.filter(t => t.legs).map(t => t.id).join(), 'C: the frozen entry was not given a grade for every level with a parlay');
const later = kicks.find(k => k > tC);
const kC = later ? `${season}|${String(W).padStart(2, '0')}|${iso(later)}` : null;
chk(!kC || (!!L.entries[kC] && L.entries[kC].taken_at === iso(tC) && !L.entries[kC].grade), `C: the next wave ${kC} was not taken`);
const ledgerC = bytes();

/* D: the week played out, with made-up entries planted for every rule of a settlement */
const tD = lastKick + 36 * H;
const P2 = stamp(week(clone(REAL), { scored: games, stats: rowsFor(games) }), tD - H);
/* the plants: a player of a game with stats, given his own stat row (a QB's 250 passing yards); a game
   tied (a moneyline push); a player with no row in a game whose stats are in (a void) */
const gq = games[0], qbTeam = gq.h;
const qb = (REAL.players || []).find(p => p.t === qbTeam && p.g === 'QB') || (REAL.players || []).find(p => p.g === 'QB');
P2.stats[WS] = P2.stats[WS].filter(x => x.player_id !== qb.id);
P2.stats[WS].push({ player_id: qb.id, player_display_name: qb.n, position: 'QB', season, week: W, season_type: 'REG', team: qbTeam, opponent_team: gq.a,
  completions: 20, attempts: 30, passing_yards: 250, passing_tds: 2, passing_interceptions: 0, carries: 3, rushing_yards: 12, rushing_tds: 0, receptions: 0, targets: 0,
  receiving_yards: 0, receiving_tds: 0, fg_att: 0, fg_made: 0, pat_made: 0, pat_att: 0, fg_made_0_19: 0, fg_made_20_29: 0, fg_made_30_39: 0, fg_made_40_49: 0, fg_made_50_59: 0, fg_made_60_: 0 });
const others = games.filter(g => g.id !== gq.id && !teamsOf([gq]).has(g.h) && !teamsOf([gq]).has(g.a));
const gTie = others[0], gWin = others[1], gLose = others[2];
Object.assign(P2.sched.find(g => g.id === gTie.id), { hs: 20, as: 20 });
const sc = id => P2.sched.find(g => g.id === id);
const winner = g => { const x = sc(g.id); return x.hs > x.as ? x.h : x.a; }, loser = g => { const x = sc(g.id); return x.hs > x.as ? x.a : x.h; };
const margin = g => Math.abs(sc(g.id).hs - sc(g.id).as);
const team = (g, t, stat, k, price) => ({ gid: g.id, week: W, pid: 'team:' + t, team: t, grp: 'TEAM', stat, k, side: 'over', main: false, price, src: 'real', name: t, label: stat, p: 0.6, fair: 0.55, fair_est: false, thin: false, market: false });
const player = (pid, g, stat, k, side, main, price) => ({ gid: g.id, week: W, pid, team: qbTeam, grp: 'QB', stat, k, side, main, price, src: 'real', name: pid, label: stat, p: 0.6, fair: 0.5, fair_est: false, thin: false, market: false });
const L_WIN = team(gWin, winner(gWin), 'ml', 0, 150), L_LOSE = team(gLose, loser(gLose), 'ml', 0, 120), L_TIE = team(gTie, gTie.h, 'ml', 0, -110);
const L_ATS_PUSH = team(gWin, winner(gWin), 'ats', -margin(gWin), -110);
const L_OVER = player(qb.id, gq, 'passing_yards', 239.5, 'over', true, -115), L_UNDER = player(qb.id, gq, 'passing_yards', 239.5, 'under', true, -105);
const L_EXACT = player(qb.id, gq, 'passing_tds', 2, 'over', true, 130), L_RUNG = player(qb.id, gq, 'passing_yards', 250, 'over', false, 200);
const L_VOID = player('XX-0000001', gq, 'rushing_yards', 20.5, 'over', true, -110);
/* no stat line, read against who played (the payload's snaps, as weekly.py bakes them; placing a snap
   row on a player, by PFR id or name, is the bake's, and test_who_played.py holds it): the snap counts
   are in for every game of W but gOut's; XX-PLAYED (gq) and XX-NAMED (another game, on the home club)
   took a snap with no stat line, XX-ZERO took none; in gOut, whose snaps are not in, XX-OUT was Out on
   the report and XX-UNK on none */
const gOut = others[3] || others[0], gNamed = gLose;
const at = (l, g, team) => ({ ...l, gid: g.id, team });
const L_PLAYED_O = player('XX-PLAYED', gq, 'receptions', 0.5, 'over', true, -150), L_PLAYED_U = { ...L_PLAYED_O, side: 'under', price: 120 };
const L_NAMED_U = at({ ...player('XX-NAMED', gq, 'receiving_yards', 8.5, 'under', true, 110), name: 'Named Fallback Jr.' }, gNamed, gNamed.h);
const L_ZERO = player('XX-ZERO', gq, 'receptions', 1.5, 'over', true, -105);
const L_OUT = at(player('XX-OUT', gq, 'receptions', 2.5, 'over', true, -110), gOut, gOut.h), L_UNK = at(player('XX-UNK', gq, 'receptions', 2.5, 'over', true, -110), gOut, gOut.a);
{ const real = ((REAL.snaps || {})[WS]) || {};
  P2.snaps[WS] = Object.fromEntries(games.filter(g => g.id !== gOut.id).map(g => [g.id, { [g.h]: [...((real[g.id] || {})[g.h] || [])], [g.a]: [...((real[g.id] || {})[g.a] || [])] }]));
  P2.snaps[WS][gq.id][qbTeam].push('XX-PLAYED'); P2.snaps[WS][gNamed.id][gNamed.h].push('XX-NAMED'); }
P2.injuries = [...(P2.injuries || []), { season: String(season), week: String(W), gsis_id: 'XX-OUT', team: gOut.h, report_status: 'Out', practice_status: 'Did Not Participate In Practice', injury: 'Knee' }];
const OUTS = new Set(P2.injuries.filter(x => x.report_status === 'Out').map(x => String(+x.week) + '|' + x.gsis_id));
const tier = (id, n, legs, extra = {}) => ({ id, label: SL.LABELS[id], n, floor: 0, legs, p: 0.3, fair: 0.25, fair_est: false, dec: r3(legs.reduce((a, l) => a * dec(l.price), 1)), likeliest: false, thin: 0, mkt: 0, ...extra });
const kX = kicks[0] - 3 * H, kY = kicks[0] - 2 * H, kX2 = kicks[0] - 2.5 * H, kZ = kicks[0] - 1.5 * H;
const plant = (k, tiers, more = {}) => ({ season, week: W, kickoff: iso(k), games: games.map(g => g.id), baked_at: null, pool: { pref: 0, thin: 0, mkt: 0, far: 0 }, tiers, taken_at: iso(k - H), ...more });
const X = plant(kX, [
  tier('safe', 2, [L_WIN, L_OVER]),                                   /* won, the whole price */
  tier('med', 3, [L_VOID, L_RUNG, L_TIE]),                            /* won: a void and a push drop out, the rung paid alone */
  tier('aggr', 4, [L_WIN, L_LOSE, L_ATS_PUSH, L_EXACT]),             /* lost */
  tier('xtrm', 5, [L_VOID, L_TIE, L_ATS_PUSH, L_EXACT, { ...L_VOID, pid: 'XX-0000002' }]) ]); /* every leg a push or a void: a push */
/* Y: a leg on a game no payload holds any more (last season's), graded won before: the grade stays */
const gone = { ...L_WIN, gid: `${season - 1}_05_AAA_BBB`, team: 'AAA', pid: 'team:AAA' };
const Y = plant(kY, [tier('safe', 2, [gone, { ...L_UNDER }]), { id: 'med', label: 'Medium', n: 3, floor: 0.25, why: 'made up' },
  tier('aggr', 4, [L_WIN, L_OVER, L_TIE, { ...L_UNDER, pid: 'XX-0000003' }]) ]);   /* won: a push and a void drop out */
Y.grade = { safe: { result: 'won', legs: ['win', 'win'], payout: Y.tiers[0].dec } };
/* X2: X's Safe parlay again, its legs the other way round, frozen at a later wave: one parlay */
const X2 = plant(kX2, [tier('safe', 2, [L_OVER, L_WIN])]);
/* Z: players with no stat line, read against who played */
const Z = plant(kZ, [
  tier('safe', 2, [L_PLAYED_O, L_WIN]),                               /* lost: he played, no catch, the over loses */
  tier('med', 3, [L_PLAYED_U, L_WIN, L_OUT]),                          /* won: his under wins on zero, the Out leg void */
  tier('aggr', 4, [L_NAMED_U, L_ZERO, L_WIN, L_OVER]),                /* won: by his name, on zero; no snaps, void */
  tier('xtrm', 5, [L_UNK, L_WIN, L_OVER, L_TIE, L_NAMED_U]) ]);       /* pending: no snaps for his club yet, and not Out */
/* PS: last season's week W, an all-player Safe graded lost; this season's rows for the same players
   and week would win it: never regraded */
const kP = kicks[0] - 365 * 24 * H, prevGid = `${season - 1}_${String(W).padStart(2, '0')}_${gq.a}_${gq.h}`;
const PS = { ...plant(kP, [tier('safe', 2, [{ ...L_OVER, gid: prevGid }, { ...L_EXACT, gid: prevGid }])]), season: season - 1, games: [prevGid] };
PS.grade = { safe: { result: 'lost', legs: ['loss', 'loss'], payout: 0 } };
const kPS = `${season - 1}|${String(W).padStart(2, '0')}|${iso(kP)}`;
{ const x = read(), wk = String(W).padStart(2, '0');
  for (const [k, e] of [[kX, X], [kY, Y], [kX2, X2], [kZ, Z]]) x.entries[`${season}|${wk}|${iso(k)}`] = e;
  x.entries[kPS] = PS;
  x.summary = SL.summarize(x.entries); fs.writeFileSync(LEDGER, JSON.stringify(x, null, 1)); }
const plantedC = read();
r = run(P2, tD);
L = read();
chk(r.code === 0, 'D: the run failed: ' + r.out.slice(-600));
/* both waves as they were frozen */
for (const k of [kA, kC].filter(Boolean)) chk(!!L.entries[k] && JSON.stringify(SL.callOf(L.entries[k])) === JSON.stringify(SL.callOf(plantedC.entries[k])), `D: ${k} moved after its kickoff`);
/* every leg settled here, from the raw score and stat rows, never by the app's code */
function settle(l) {
  const g = P2.sched.find(x => x.id === l.gid);
  if (['ml', 'ats', 'total'].includes(l.stat)) {
    if (!g || g.hs == null || g.as == null) return null;
    if (l.stat === 'total') { const t = g.hs + g.as; return t === +l.k ? 'push' : ((l.side === 'under' ? t < l.k : t > l.k) ? 'win' : 'loss'); }
    const m = l.team === g.h ? g.hs - g.as : g.as - g.hs, v = l.stat === 'ml' ? m : m + l.k;
    return v > 0 ? 'win' : v < 0 ? 'loss' : 'push';
  }
  const rows = (P2.stats[String(l.week)] || []).filter(x => g && (x.team === g.h || x.team === g.a) && ['QB', 'RB', 'WR', 'TE', 'K', 'FB', 'HB'].includes(x.position));
  const row = rows.find(x => x.player_id === l.pid);
  let v;
  if (!row) {
    if (!rows.length) return null;
    /* no stat line: did he play? his club's snaps in: a snap, zero; none, void. Not in: Out, void; else wait */
    const G = ((P2.snaps || {})[String(l.week)] || {})[l.gid];
    if (!G || !(l.team in G)) return OUTS.has(String(l.week) + '|' + l.pid) ? 'void' : null;
    if (!G[l.team].includes(l.pid)) return 'void';
    v = 0;
  } else v = l.stat === 'any_td' ? row.rushing_tds + row.receiving_tds : row[l.stat];
  if (l.stat === 'any_td') return v >= (l.k || 1) ? 'win' : 'loss';
  if (l.main) return v === l.k ? 'push' : ((l.side === 'under' ? v < l.k : v > l.k) ? 'win' : 'loss');
  return v >= l.k ? 'win' : 'loss';
}
function expect(t) {
  const legs = t.legs.map(settle);
  if (legs.some(x => x == null)) return { result: 'pending', legs };
  if (legs.includes('loss')) return { result: 'lost', legs, payout: 0 };
  const left = t.legs.filter((l, i) => legs[i] === 'win');
  if (!left.length) return { result: 'push', legs, payout: 1 };
  /* the legs left, in different games: their prices multiplied */
  const apart = new Set(left.map(l => l.gid)).size === left.length;
  return { result: 'won', legs, payout: left.length === t.legs.length ? t.dec : apart ? r3(left.reduce((a, l) => a * dec(l.price), 1)) : null };
}
const same = (g, w) => !!g && g.result === w.result && JSON.stringify(g.legs) === JSON.stringify(w.legs) && (w.payout == null ? g.result !== 'won' || g.payout > 1 : Math.abs(g.payout - w.payout) < 0.0015);
let graded = 0, pend = 0;
for (const [k, e] of Object.entries(L.entries)) {
  if (Date.parse(e.kickoff) > tD) { chk(!e.grade, `D: ${k}, still to come, has a grade`); continue; }
  for (const t of e.tiers.filter(t => t.legs)) {
    const g = e.grade && e.grade[t.id], w = expect(t);
    if (k === kPS) { chk(JSON.stringify(g) === JSON.stringify(PS.grade[t.id]), `D: last season's ${t.id} was regraded on this season's week ${W}: ${JSON.stringify(g)}`); continue; }
    if (k.endsWith(iso(kY)) && t.id === 'safe') { chk(JSON.stringify(g) === JSON.stringify(Y.grade.safe), 'D: a grade made before was undone by a payload that cannot settle it'); continue; }
    chk(same(g, w), `D: ${k} ${t.id} graded ${JSON.stringify(g)}, the legs say ${JSON.stringify(w)}`);
    if (g && g.result !== 'pending') graded++; else pend++;
  }
}
const gx = (L.entries[`${season}|${String(W).padStart(2, '0')}|${iso(kX)}`] || {}).grade || {};
chk(gx.safe && gx.safe.result === 'won' && gx.safe.payout === X.tiers[0].dec, 'D: two legs won do not pay the whole price');
chk(gx.med && gx.med.result === 'won' && JSON.stringify(gx.med.legs) === '["void","win","push"]' && gx.med.payout === r3(dec(L_RUNG.price)), 'D: a void and a push did not drop out, the leg left paid alone: ' + JSON.stringify(gx.med));
chk(gx.aggr && gx.aggr.result === 'lost' && gx.aggr.payout === 0, 'D: a parlay with a leg lost is not lost');
chk(gx.xtrm && gx.xtrm.result === 'push' && gx.xtrm.payout === 1 && gx.xtrm.legs.every(x => x === 'push' || x === 'void'), 'D: every leg a push or a void is not a push, the stake back: ' + JSON.stringify(gx.xtrm));
const gy = (L.entries[`${season}|${String(W).padStart(2, '0')}|${iso(kY)}`] || {}).grade || {};
chk(!gy.med && gy.aggr && gy.aggr.result === 'won' && JSON.stringify(gy.aggr.legs) === '["win","win","push","void"]' && gy.aggr.payout === r3(dec(L_WIN.price) * dec(L_OVER.price)), 'D: a level with no parlay was graded, or a planted level was not: ' + JSON.stringify(gy));
const gz = (L.entries[`${season}|${String(W).padStart(2, '0')}|${iso(kZ)}`] || {}).grade || {};
chk(gz.safe && gz.safe.result === 'lost' && JSON.stringify(gz.safe.legs) === '["loss","win"]', 'D: a player who played with no stat line did not lose his over on zero: ' + JSON.stringify(gz.safe));
chk(gz.med && gz.med.result === 'won' && JSON.stringify(gz.med.legs) === '["win","win","void"]' && gz.med.payout === r3(dec(L_PLAYED_U.price) * dec(L_WIN.price)),
  'D: a player who played with no stat line did not win his under on zero, or one Out with no snap counts in was not void: ' + JSON.stringify(gz.med));
chk(gz.aggr && gz.aggr.result === 'won' && JSON.stringify(gz.aggr.legs) === '["win","void","win","win"]' && gz.aggr.payout === r3(dec(L_NAMED_U.price) * dec(L_WIN.price) * dec(L_OVER.price)),
  'D: a player who played with no stat line on another club was not graded on zero, or one with no snaps was not void: ' + JSON.stringify(gz.aggr));
chk(gz.xtrm && gz.xtrm.result === 'pending' && gz.xtrm.legs[0] === null, 'D: a player with no stat line, no snap counts for his club and not Out did not wait: ' + JSON.stringify(gz.xtrm));
chk(JSON.stringify((L.entries[kPS] || {}).grade) === JSON.stringify(PS.grade), 'D: last season\'s entry was regraded: ' + JSON.stringify((L.entries[kPS] || {}).grade));
/* the summary, worked here from the grades: a parlay (a season's week, a level, its legs in any order)
   once, from the last frozen entry that holds it */
{ const want = {}; for (const id of SL.TIERS) want[id] = { graded: 0, won: 0, push: 0, exp_fair: 0, exp_model: 0, units: 0 };
  const once = new Map(), lid = l => [l.gid, l.pid, l.stat, l.side, l.k, l.main ? 1 : 0].join('|');
  for (const k of Object.keys(L.entries).sort()) { const e = L.entries[k]; for (const t of e.tiers) { const g = (e.grade || {})[t.id]; if (!g || !t.legs) continue;
    once.set([e.season, e.week, t.id, t.legs.map(lid).sort().join('+')].join('#'), { t, g }); } }
  chk([...once.values()].filter(x => x.t.id === 'safe' && x.t.legs.some(l => l.pid === L_WIN.pid) && x.t.legs.some(l => l.pid === L_OVER.pid) && x.t.n === 2 && x.t.legs.every(l => l.gid !== prevGid)).length === 1
    && L.summary.repeats >= 1, 'D: X\'s Safe parlay, frozen again at a later wave, is not one parlay, or the summary counts no repeat');
  for (const { t, g } of once.values()) { if (g.result === 'pending') continue;
    const s = want[t.id]; if (g.result === 'push') { s.push++; continue; } s.graded++; if (g.result === 'won') s.won++; s.exp_model += t.p; s.exp_fair += t.fair || 0; s.units += g.payout - 1; }
  for (const id of SL.TIERS) { const a = L.summary.tiers[id], b = want[id];
    chk(a.graded === b.graded && a.won === b.won && a.push === b.push && Math.abs(a.exp_fair - b.exp_fair) < 1e-3 && Math.abs(a.exp_model - b.exp_model) < 1e-3 && Math.abs(a.units - b.units) < 2e-3,
      `D: the summary's ${id} is not its grades': ${JSON.stringify(a)} against ${JSON.stringify(b)}`); } }
chk(graded >= 5, `D: only ${graded} levels graded on a week played out`);
{ const t0 = X.tiers[0], three = {}; for (const h of [5, 4, 3]) three[`${season}|01|${iso(kX - h * H)}`] = { season, week: 1, kickoff: iso(kX - h * H), tiers: [{ ...t0, legs: h === 4 ? [...t0.legs].reverse() : t0.legs }], grade: { safe: { result: 'won', legs: ['win', 'win'], payout: t0.dec } } };
  const sm = SL.summarize(three);
  chk(sm.tiers.safe.graded === 1 && sm.tiers.safe.won === 1 && Math.abs(sm.tiers.safe.units - (t0.dec - 1)) < 2e-3 && sm.repeats === 2 && sm.frozen_entries === 3,
    'D: one parlay on an unchanged panel across three waves is not counted once: ' + JSON.stringify(sm)); }
/* the next week's first wave */
const next = REAL.sched.filter(g => +g.w === W + 1).map(etKick).sort((a, b) => a - b).find(k => k > tD);
if (next) chk(!!L.entries[`${season}|${String(W + 1).padStart(2, '0')}|${iso(next)}`], 'D: the next week\'s first wave was not taken');

/* E: the last kickoff under way, no game to come: nothing new */
fs.writeFileSync(LEDGER, ledgerC);
const tE = lastKick + H / 2;
const P3 = stamp(week(clone(REAL), { scored: games.filter(g => etKick(g) < lastKick), stats: rowsFor(games.filter(g => etKick(g) < lastKick)) }), tE - H);
const keysC = Object.keys(JSON.parse(ledgerC).entries).join();
r = run(P3, tE);
chk(r.code === 0 && /no game to come/.test(r.last) && Object.keys(read().entries).join() === keysC, 'E: a run with no game to come took an entry: ' + r.last);
const e1 = bytes(); r = run(P3, tE + 60e3);
chk(r.code === 0 && bytes() === e1, 'E2: the same run again wrote the ledger');

/* F: the guard, end to end. The file on disk had a frozen entry edited: refused, the last commit's put back */
fs.writeFileSync(LEDGER, ledgerC);
const published = path.join(DIR, 'published.json'); fs.writeFileSync(published, ledgerC);
{ const x = JSON.parse(ledgerC), t = x.entries[kA].tiers.find(t => t.legs); t.legs[0].price += 5; fs.writeFileSync(LEDGER, JSON.stringify(x, null, 1)); }
r = run(P1, tC + H, { SUGGEST_PREV: published });
chk(r.code === 1 && /FAIL .*frozen at its kickoff/.test(r.out) && bytes() === ledgerC, 'F: a frozen entry edited on disk was not refused with the last commit\'s put back: ' + r.out.slice(-300));
/* the wave to come rewritten by an earlier run not yet committed (the last commit holds an older take):
   not a refusal, since only what the last commit had frozen is held to it */
if (kC) { const x = JSON.parse(ledgerC); x.entries[kC].tiers[0].p = 0.5; x.entries[kC].taken_at = iso(tA); fs.writeFileSync(published, JSON.stringify(x, null, 1));
  r = run(P1, tC + H, { SUGGEST_PREV: published });
  chk(r.code === 0 && /^suggest ledger: unchanged/.test(r.last) && bytes() === ledgerC, 'F: an uncommitted rewrite of the wave to come was refused against the last commit: ' + r.out.slice(-300)); }
/* a payload that is not there: refused, the file as it was */
r = run(P1, tC + H, { SUGGEST_PAYLOAD: path.join(DIR, 'nothing.json') });
chk(r.code === 1 && /^suggest ledger: refused/.test(r.last) && bytes() === ledgerC, 'F: a missing payload was not refused, or the file moved');
/* check() on hand-made ledgers */
{ const base = JSON.parse(ledgerC), now = tC + H, runAt = iso(now);
  const t = (what, f, want) => { try { const x = clone(base); f(x); if (!/summary/.test(what)) x.summary = SL.summarize(x.entries);
    const bad = SL.check(x, base, now, runAt); chk(want ? bad.some(b => want.test(b)) : !bad.length, `F: check() on ${what}: ${JSON.stringify(bad)}`); }
    catch (e) { chk(false, `F: check() on ${what} could not be set up on the ledger C left: ${e.message}`); } };
  t('the ledger as it is', () => {}, null);
  t('a frozen level\'s chance changed', x => { x.entries[kA].tiers[0].p += 0.01; }, /frozen at its kickoff.*changed \(tiers\)/);
  t('a frozen entry gone', x => { delete x.entries[kA]; }, /is gone/);
  t('a grade changed on a frozen entry', x => { const g = x.entries[kA].grade; for (const id in g) g[id] = { result: 'lost', legs: x.entries[kA].tiers.find(t => t.id === id).legs.map(() => 'loss'), payout: 0 }; }, null);
  t('a grade that does not follow its legs', x => { const id = Object.keys(x.entries[kA].grade)[0]; x.entries[kA].grade[id] = { result: 'won', legs: x.entries[kA].tiers.find(t => t.id === id).legs.map((l, i) => i ? 'win' : 'loss'), payout: 3 }; }, /graded won/);
  t('a loss that pays', x => { const id = Object.keys(x.entries[kA].grade)[0]; x.entries[kA].grade[id] = { result: 'lost', legs: x.entries[kA].tiers.find(t => t.id === id).legs.map(() => 'loss'), payout: 1 }; }, /a loss paying/);
  t('every leg won paying less than the price', x => { const id = Object.keys(x.entries[kA].grade)[0], tt = x.entries[kA].tiers.find(t => t.id === id); x.entries[kA].grade[id] = { result: 'won', legs: tt.legs.map(() => 'win'), payout: tt.dec - 0.5 }; }, /every leg won/);
  if (kC) {
    t('the wave to come rewritten by this run', x => { x.entries[kC].tiers[0].p = 0.5; x.entries[kC].taken_at = runAt; }, null);
    t('the wave to come changed, not by this run', x => { x.entries[kC].tiers[0].p = 0.5; }, /not taken by this run/);
    t('the wave to come graded', x => { x.entries[kC].grade = {}; }, /graded before its kickoff/);
    t('an entry taken at its kickoff', x => { x.entries[kC].taken_at = x.entries[kC].kickoff; }, /at or after its kickoff/);
    t('an entry keyed on another kickoff', x => { const e = x.entries[kC]; delete x.entries[kC]; e.taken_at = runAt; x.entries[kC.replace(/\|[^|]+$/, '|' + iso(later + H))] = e; }, /keyed on another kickoff/);
  }
  t('a summary that is not the entries\'', x => { x.summary.tiers.safe.won += 1; }, /summary does not follow/);
}

console.log(`week ${W} made up (${games.length} games, waves ${kicks.length}); ${graded} levels graded and ${pend} pending at D`);
end();
