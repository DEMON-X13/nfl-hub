/* The test of suggest_ledger.js: the suggestions record taken, rewritten, locked, replaced and graded on
   made-up weeks, and the guard that refuses a ledger whose frozen or locked entries moved.

     node props/build/test_suggest_ledger.js      ends "N checks, 0 failures"; exit 1 otherwise

   Each run is the script itself, as the props job runs it, on a made-up payload in a scratch folder with
   the clock set (SUGGEST_NOW), never on the real ledger (G alone runs it on a copy of it). The made-up
   weeks are cut from the real payload: its latest week with player prices (W) is put back before its first
   kickoff (no scores, no stats), then played out, with a made-up score wherever the real one is not in
   yet, so the test holds in any week of the season. Its schedule is moved where a stage needs it, so the
   prime-time games it stands on are there whatever the real week holds: the game with the most player
   prices (gP) kicks off at or after 8 pm on a prime night (moved to the Monday at 8:15 pm where it does
   not), and a second game is a prime-time one. Which games are prime time, a Thursday, Sunday or Monday
   at or after 7 pm US Eastern, is worked out here on its own from each kickoff (primeAt), never by the
   script or the page.
   Since app v124 (no scheduled paid pull: every set stands on the props job's own read of DraftKings' lines on ESPN, in
   the payload as PAY.espn) the made-up week W is the current week (the Elo matchups' where they are of this payload's
   season, else the first with a game still to play), its paid prices, main lines and ids taken out, and the test plants
   its own read of ESPN on every game of W (readOf: each club's charted starters on the tested stats, the yards ladders
   DraftKings lists, the touchdown list), dated half an hour before each run's clock and before each game's kickoff as
   moved (stamp), so every set's player legs are priced from DraftKings' lines (dkline, est.), as they now are. gP is the
   game the read gives the most lines. A holds them so, and that a read dated at kickoff, and a read that is junk or
   missing, give team legs only (no throw), and that a page dropping a well-formed read is refused with the file
   untouched; B takes gP's read away; B3 moves its lines (the set rewritten on the moved lines); C restamps a newer read
   after the lock (the set as locked); R's level built again takes the read's lines; D grades a level of dkline legs with
   a void at its stored estimated prices.

     A  hours before the first prime-time lock: one set taken for every prime-time game of W, none for any
        other, keyed season|week|kickoff|game, locking 2 hours before kickoff, every leg on its own game;
        the old all-games panel takes nothing, its entry not yet frozen dropped and its frozen one kept to
        the byte.
     B  hours later, gP's player prices gone: its set rewritten; a prime game moved to 4:25 pm dropped, a
        game moved to Saturday 8:15 pm not taken, one moved to Monday 7:15 pm taken. B2: the same payload
        again writes nothing. B3: a run a second before gP's lock, the prices back: rewritten (live to its
        lock).
     C  an hour after gP's lock, the prices back: its set stays as the last run before the lock left it
        (B's), though the page would now build another; a game moved to a prime-time kickoff whose lock has
        already passed gets no entry (no run before its lock).
     R  half an hour later, a player of a locked level ruled Out on the report: that level alone built again
        from the data at hand, marked updated (player, reason, time) and recorded in updates, the other
        levels as locked. R2: the same again writes nothing. R3: after kickoff, another player ruled Out:
        nothing changes but the grade.
     D  W played out (made-up scores where the real ones are missing, a made-up void and push), with
        made-up frozen entries of both kinds planted to hold every rule of a book's settlement: each level
        graded by the legs' own results, worked here from the raw scores, stat rows, the payload's snap counts
        (PAY.snaps, as weekly.py's who_played bakes them) and injury report and never by the app's code (a
        player with no stat line who took a snap graded on zero; one his club's snaps leave out, or Out with
        his club's snaps not in, void; neither, pending; a void and a push dropping out, the one leg left paid
        its own price; a quarterback's touchdown passes not his touchdown); a grade kept when the payload can
        no longer settle it; last season's entries never regraded; an old-panel parlay frozen into two waves
        counted once, and a game's level two kickoffs hold counted once, from the last; both summaries worked
        out here from the grades; the next week's prime-time sets taken.
     E  W's last prime-time kickoff under way: no prime-time game to come, nothing new taken (E2: nothing
        written).
     F  the guard: a ledger on disk whose locked set (or frozen old entry) was edited is refused and the last
        commit's put back, while a set still to lock rewritten since that commit, or a locked level an earlier
        run replaced, is not; a payload that is not there is refused with the file untouched; and check() on
        hand-made ledgers fails every rule (a locked level changed with no player ruled out, gone, its fields
        moved, a replacement for a player the level did not hold, not this run's, after kickoff, its record
        rewritten, its mark not the last one recorded, still holding him; a set taken after its lock or not by
        this run; a key, lock or night not its own; a leg on another game or a level short of legs; a grade
        before kickoff or not its legs'; either summary not its entries').
     G  the real ledger, copied, on the real payload at the real clock: refused nothing, every frozen old
        entry the same to the byte but its grade (only facts that hold at any hour are checked); and the real
        backtest (suggest_backtest.json) held to its rules (suggest_backtest.js --check's).
   Since app v118 the stages hold the Sunday slot and the Elo picks too: A, the week's Sunday slot (its Sunday games
   before 7 pm Eastern, worked out here on its own, slotAt) taken as one set while its lock (2 hours before its first
   kickoff) is to come, keyed on its id, its games those, every leg on one of them, and every set (each night game's and
   the slot's) carrying the four Elo picks, each leg on its unit's games with its Elo chance; B, the slot's games
   following the schedule's moves; C, the slot locked as B left it; D, the slot's levels and every set's Elo picks graded
   by the legs (the same own settlement), the slot's and the Elo picks' summaries worked out here, the next week's slot
   taken; E, nothing new; F, check() on hand-made slot entries and Elo picks (every rule above). */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..');
const SCRIPT = path.join(HERE, 'suggest_ledger.js');
const SL = require('./suggest_ledger.js');
/* the real payload, or SL_TEST_PAYLOAD's, to try a week the job has not baked (a week of few games, say) */
const REAL = JSON.parse(fs.readFileSync(process.env.SL_TEST_PAYLOAD || path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8'));
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest_ledger_'));
const LEDGER = path.join(DIR, 'suggest_ledger.json');

let n = 0; const fails = [];
const chk = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const clone = x => JSON.parse(JSON.stringify(x));
const iso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const H = 3600e3, DAY = 24 * H, LOCK = 2 * H;
const pad = w => String(w).padStart(2, '0');
/* a schedule row's kickoff: its Eastern date and time, through the time zone database */
const etKick = g => { const naive = Date.parse(`${g.d}T${g.t || '13:00'}:00Z`);
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(naive)).find(p => p.type === 'timeZoneName');
  const m = tz && tz.value.match(/GMT([+-]\d+)/); return naive - (m ? +m[1] : -5) * H; };
/* prime time, this test's own copy: a Thursday, Sunday or Monday at or after 7 pm in New York */
const NYF = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
const primeAt = ms => { const p = Object.fromEntries(NYF.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return ['Thu', 'Sun', 'Mon'].includes(p.weekday) && +p.hour >= 19; };
/* the Sunday slot's day, this test's own copy: a Sunday before 7 pm in New York */
const slotAt = ms => { const p = Object.fromEntries(NYF.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return p.weekday === 'Sun' && +p.hour < 19; };
const addDays = (d, k) => new Date(Date.parse(d + 'T12:00:00Z') + k * DAY).toISOString().slice(0, 10);
const dow = d => new Date(d + 'T12:00:00Z').getUTCDay();
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
/* a ledger written in the script's own style, its summaries worked by the script's own rule (a hand plant) */
const write = x => { x.summary = SL.summarize(x.entries || {}); if (x.prime) x.prime_summary = SL.summarizePrime(x.prime); if (x.slot) x.slot_summary = SL.summarizePrime(x.slot); fs.writeFileSync(LEDGER, SL.dumps(x) + '\n'); };
/* an entry's text in the file, its grade lines left out: what "the same to the byte" is held to */
function block(text, map, key) {
  const top = text.indexOf(`\n "${map}": {`); if (top < 0) return null;
  const i = text.indexOf(`\n  ${JSON.stringify(key)}: {`, top); if (i < 0) return null;
  const j = text.indexOf('\n  }', i + 1); if (j < 0) return null;
  return text.slice(i, j).replace(/,?\n   "grade": (\{\}|\{[\s\S]*?\n   \})/, '');
}

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
const season = (() => { const m = fs.readFileSync(path.join(HERE, 'part2.js'), 'utf8').match(/const SEASON=(\d{4})/); return +m[1]; })();
/* (app v124) the current week: the Elo matchups' (so the Elo picks have their nudges) where they are of this season and
   week of the schedule, else the first with a game still to play, else the last; never the latest with paid prices */
const MU = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'elo', 'data', 'matchups.json'), 'utf8')); } catch (e) { return null; } })();
const W = MU && +MU.season === season && weeks.includes(+MU.week) ? +MU.week
  : (weeks.find(w => REAL.sched.some(g => +g.w === w && (g.hs == null || g.as == null))) || weeks[weeks.length - 1]), WS = String(W), WW = pad(W);
const realW = REAL.sched.filter(g => +g.w === W);
/* the week's Sunday (the date most of its Sunday games are on), its Saturday and its Monday */
const sunD = (() => { const c = {}; for (const g of realW) if (g.d && dow(g.d) === 0) c[g.d] = (c[g.d] || 0) + 1;
  const best = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; if (best) return best;
  const d0 = realW.map(g => g.d).sort()[0]; return addDays(d0, (7 - dow(d0)) % 7); })();
const satD = addDays(sunD, -1), monD = addDays(sunD, 1);
/* (app v124) the test's own read of DraftKings' lines on ESPN for a game: each club's charted QB1 (passing yards), RB1
   (rushing yards), WR1-2 (receiving yards and receptions) and TE1 (receiving yards), each line at 0.8 of his recent mean
   (two in three) or 1.15 of it (so the model leans to the over or the under), the yards ladders DraftKings lists (the
   page's own rungs), and every one of them on the touchdown list; dated by stamp */
const LADDER_Y = { passing_yards: [150, 200, 225, 250, 275, 300, 325, 350], rushing_yards: [25, 40, 50, 60, 75, 90, 100, 125], receiving_yards: [20, 25, 40, 50, 60, 75, 90, 100, 125] };
const STATS_OF = { QB: r => r === 1 ? ['passing_yards'] : null, RB: r => r === 1 ? ['rushing_yards'] : null, WR: r => r <= 2 ? ['receiving_yards', 'receptions'] : null, TE: r => r === 1 ? ['receiving_yards'] : null };
const playerById = new Map((Array.isArray(REAL.players) ? REAL.players : Object.values(REAL.players || {})).map(p => [p.id, p]));
const readOf = g => { const lines = {}, rungs = {}, td = []; let i = 0;
  for (const [pid, d] of Object.entries(REAL.depth || {}).sort(([a], [b]) => a.localeCompare(b))) {
    const [team, pos, rank] = d || []; if (team !== g.a && team !== g.h) continue;
    const want = STATS_OF[pos] && STATS_OF[pos](+rank), pl = playerById.get(pid); if (!want || !pl) continue;
    const L = {}; for (const st of want) { const v = Array.isArray(pl[st]) ? pl[st][0] : null; if (!(v > 1)) continue; L[st] = Math.floor(v * (i++ % 3 === 2 ? 1.15 : 0.8)) + 0.5; }
    if (!Object.keys(L).length) continue; lines[pid] = L; td.push(pid);
    for (const st of Object.keys(L)) if (LADDER_Y[st]) (rungs[pid] = rungs[pid] || {})[st] = LADDER_Y[st].slice(); }
  return Object.keys(lines).length ? { w: String(g.w), pl: { at: null, lines, rungs, td: td.sort() }, out: { st: 'ok', at: null } } : null; };
const linesOf = g => { const e = readOf(g); return e ? Object.values(e.pl.lines).reduce((a, x) => a + Object.keys(x).length, 0) : 0; };
const rowsOf = id => linesOf(REAL.sched.find(g => g.id === id));
const byPrices = [...realW].sort((a, b) => rowsOf(b.id) - rowsOf(a.id) || etKick(a) - etKick(b));
const gP = byPrices[0];
/* the schedule's moves, each from the stage that makes it on */
const MOVE = {};
if (!(primeAt(etKick(gP)) && (gP.t || '') >= '20:00')) MOVE[gP.id] = { d: monD, t: '20:15' };
const isPrimeReal = g => primeAt(etKick(MOVE[g.id] ? { ...g, ...MOVE[g.id] } : g));
const spare = realW.filter(g => g.id !== gP.id && !isPrimeReal(g));
/* a week of few games (the divisional round on, the Super Bowl alone, and the off-season, whose latest priced
   week is the Super Bowl's) has too few to spare for the stages' moves (a Sunday night game where it has none,
   a Saturday night, a Monday 7:15 pm and one moved beside the priced game): those it lacks are made up, each a
   copy of one of the week's own games between two clubs of the test's own (no roster, so no leg on it), laid
   into the real payload's schedule so every made-up payload carries them. So the test holds in any week */
{ const need = 3 + (realW.some(g => g.id !== gP.id && isPrimeReal(g)) ? 0 : 1), tpl = realW.find(g => g.id !== gP.id) || gP;
  for (let i = 0; spare.length < need; i++) { const a = 'ZA' + 'ABCDEFGH'[i], h = 'ZH' + 'ABCDEFGH'[i], g = { ...tpl, id: `${season}_${WW}_${a}_${h}`, a, h, d: sunD, t: '13:00' };
    delete g.hs; delete g.as; REAL.sched.push(g); realW.push(g); spare.push(g); } }
let gSN = realW.find(g => g.id !== gP.id && isPrimeReal(g));
if (!gSN) { gSN = spare.shift(); MOVE[gSN.id] = { d: sunD, t: '20:20' }; }
const gSat = spare.shift(), gMon = spare.shift(), gN = spare.shift();
const P_GP = MOVE[gP.id] ? { ...gP, ...MOVE[gP.id] } : gP, kP = etKick(P_GP);
const pTime = P_GP.t;
const MOVE_B = { ...MOVE, [gSN.id]: { d: sunD, t: '16:25' }, [gSat.id]: { d: satD, t: '20:15' }, [gMon.id]: { d: monD, t: '19:15' } };
const hm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const MOVE_C = { ...MOVE_B, [gN.id]: { d: P_GP.d, t: hm(+pTime.slice(0, 2) * 60 + +pTime.slice(3) - 30) } };
const moved = (pay, mv) => { for (const g of pay.sched) if (mv[g.id]) Object.assign(g, mv[g.id]); return pay; };

const games = realW.map(g => MOVE_C[g.id] ? { ...g, ...MOVE_C[g.id] } : g).sort((a, b) => etKick(a) - etKick(b));
const kicks = [...new Set(games.map(etKick))].sort((a, b) => a - b);
const lastKick = kicks[kicks.length - 1];
const realStats = (REAL.stats || {})[WS] || [];
const teamsOf = gs => new Set(gs.flatMap(g => [g.h, g.a]));
/* the week's stat rows for the games played here: nflverse's own where it has posted the club's, else the
   club's rows of its latest earlier week moved onto this one (its opponent this week's). The made-up week
   is played out whatever day the test runs, so a game the real week has not played yet still has its
   stats in, as a game needs before a leg on it settles */
const rowsFor = gs => { const t = teamsOf(gs), have = new Set(realStats.map(r => r.team)), out = realStats.filter(r => t.has(r.team));
  for (const g of gs) for (const [club, opp] of [[g.h, g.a], [g.a, g.h]]) { if (have.has(club)) continue; let found = false;
    for (let w2 = W - 1; w2 >= 1; w2--) { const rs = ((REAL.stats || {})[String(w2)] || []).filter(r => r.team === club);
      if (rs.length) { out.push(...rs.map(r => ({ ...r, week: W, opponent_team: opp }))); found = true; break; } }
    /* a club of the test's own (a made-up game of a short week) has no rows anywhere: one made-up row of zeros
       puts its game's stats in, as a game needs before a leg on it settles */
    if (!found) out.push({ player_id: 'XX-ROW-' + club, player_display_name: 'Row ' + club, position: 'WR', season, week: W, season_type: 'REG', team: club, opponent_team: opp,
      completions: 0, attempts: 0, passing_yards: 0, passing_tds: 0, passing_interceptions: 0, carries: 0, rushing_yards: 0, rushing_tds: 0, receptions: 0, targets: 0,
      receiving_yards: 0, receiving_tds: 0, fg_att: 0, fg_made: 0, pat_made: 0, pat_att: 0, fg_made_0_19: 0, fg_made_20_29: 0, fg_made_30_39: 0, fg_made_40_49: 0, fg_made_50_59: 0, fg_made_60_: 0 }); }
  return out; };
/* a score for every game: the real one, else a made-up home win, 24-20 */
const scoreOf = g => g.hs != null && g.as != null ? { hs: g.hs, as: g.as } : { hs: 24, as: 20 };
function week(pay, { scored = [], stats = [] } = {}) {
  const ids = new Set(scored.map(g => g.id));
  /* (app v124) no paid prices for W (no job buys them): the week's player prices, main lines and ids out, and the test's
     own read of ESPN in their place, for every game of W (dated by stamp) */
  if (pay.prices) delete pay.prices[WS]; if (pay.mkt) delete pay.mkt[WS]; if (pay.dk && typeof pay.dk === 'object') delete pay.dk[WS];
  pay.espn = { v: 1, read_at: null, games: {} };
  for (const g of pay.sched) if (+g.w === W) { const e = readOf(g); if (e) pay.espn.games[g.id] = e; }
  for (const g of pay.sched) if (+g.w === W) { if (ids.has(g.id)) Object.assign(g, scoreOf(REAL.sched.find(x => x.id === g.id))); else { delete g.hs; delete g.as; } }
  for (const g of pay.sched) if (+g.w > W) { delete g.hs; delete g.as; }
  pay.stats = Object.fromEntries(Object.entries(pay.stats || {}).filter(([k]) => +k < W));
  if (stats.length) pay.stats[WS] = stats;
  /* who played (PAY.snaps): the real payload's, for the games played here, where it has them */
  pay.snaps = Object.fromEntries(Object.entries(pay.snaps || {}).filter(([k]) => +k < W));
  if (stats.length) pay.snaps[WS] = Object.fromEntries(Object.entries(((REAL.snaps || {})[WS]) || {}).filter(([gid]) => ids.has(gid)));
  return pay;
}
/* the bake's time, and (app v124) the read's: half an hour before it, every game's entry dated so, one whose kickoff (as
   moved) is not after the read dropped, as the job drops a game that has kicked off */
const stamp = (pay, t) => { pay.baked_at = iso(t).replace(/Z$/, '+00:00');
  const E = pay.espn, at = t - 30 * 60e3;
  if (E && typeof E === 'object' && E.games && typeof E.games === 'object') { E.read_at = new Date(at).toISOString();
    for (const gid of Object.keys(E.games)) { const g = pay.sched.find(x => x.id === gid), e = E.games[gid];
      if (!g || !(etKick(g) > at + 60e3)) { delete E.games[gid]; continue; }
      if (e.pl) e.pl.at = new Date(at).toISOString(); if (e.out) e.out.at = new Date(at).toISOString(); } }
  return pay; };
const kOf = (g, mv) => etKick(mv[g.id] ? { ...g, ...mv[g.id] } : g);
const keyOf = (g, mv) => `${season}|${WW}|${iso(kOf(g, mv))}|${g.id}`;
const primesUnder = mv => realW.filter(g => primeAt(kOf(g, mv)));
/* the week's Sunday slot under a schedule's moves, worked out here: its games in kickoff order (the schedule's on a
   tie), its key and its lock; null with no Sunday game before 7 pm */
const slotUnder = (mv, gs = realW) => { const G = gs.map((g, i) => ({ g, i, k: kOf(g, mv) })).filter(x => slotAt(x.k)).sort((a, b) => a.k - b.k || a.i - b.i);
  if (!G.length) return null; const k = G[0].k, id = `${season}_${pad(+G[0].g.w)}_SUN`;
  return { id, games: G.map(x => x.g.id), kick: k, lock: k - LOCK, key: `${season}|${pad(+G[0].g.w)}|${iso(k)}|${id}` }; };
/* a set's Elo picks (since app v118): the four, each a parlay of its size on the unit's games with every leg's Elo
   chance, or why it has none */
const eloHeld = (e, games, lab) => {
  chk(Array.isArray(e.elo) && e.elo.map(t => t.id).join() === SL.ELO_TIERS.join(), `${lab}: its Elo picks are not the four: ${JSON.stringify((e.elo || []).map(t => t.id))}`);
  for (const x of e.elo || []) {
    if (!x.legs) { chk(typeof x.why === 'string' && x.why.length > 0, `${lab} ${x.id}: an Elo pick with no parlay says no why`); continue; }
    chk(x.legs.length === x.n && x.p > 0 && x.p < 1 && x.dec > 1 && x.legs.every(l => games.includes(l.gid) && l.pe > 0 && l.pe < 1 && l.grp !== 'TEAM' && l.thin === null),
      `${lab} ${x.id}: an Elo pick is not a parlay of its size on the unit's games, each a player's leg with its Elo chance and no Value mark`);
    chk(new Set(x.legs.map(l => l.pid)).size === x.legs.length, `${lab} ${x.id}: an Elo pick takes a player twice`); } };

const primesA = primesUnder(MOVE);
const minLock = Math.min(...primesA.map(g => kOf(g, MOVE) - LOCK));
const tA = minLock - 6 * H;
const P0 = stamp(moved(week(clone(REAL)), MOVE), tA - H);
const KP = keyOf(gP, MOVE), lockP = kP - LOCK;

/* ---- the made-up legs and levels the plants are built from ---- */
const LBL = SL.LABELS;
const tier = (id, nn, legs, extra = {}) => ({ id, label: LBL[id], n: nn, floor: 0, legs, p: 0.3, fair: 0.25, fair_est: false, dec: r3(legs.reduce((a, l) => a * dec(l.price), 1)), likeliest: false, thin: 0, mkt: 0, ...extra });
const why = id => ({ id, label: LBL[id], n: { safe: 2, med: 3, aggr: 4, xtrm: 5 }[id], floor: 0, why: 'made up' });
const four = (...ts) => SL.TIERS.map(id => ts.find(t => t.id === id) || why(id));
const teamLeg = (g, t, stat, k, price, extra = {}) => ({ gid: g.id, week: W, pid: 'team:' + t, team: t, grp: 'TEAM', stat, k, side: 'over', main: false, price, src: 'real', name: t, label: stat, p: 0.6, fair: 0.55, fair_est: false, thin: false, market: false, ...extra });
const plLeg = (pid, g, team, stat, k, side, main, price, extra = {}) => ({ gid: g.id, week: W, pid, team, grp: 'WR', stat, k, side, main, price, src: 'real', name: pid, label: stat, p: 0.6, fair: 0.5, fair_est: false, thin: false, market: false, ...extra });

/* ---- the old all-games panel, planted: LX frozen (graded on games no schedule holds), LU still to come ---- */
const oldKey = k => `${season}|${WW}|${iso(k)}`;
const goneG = { id: `${season - 1}_05_AAA_BBB` }, goneG2 = { id: `${season - 1}_05_CCC_DDD` };
const LXk = tA - 3 * DAY, LUk = tA + H;
const LX = { season, week: W, kickoff: iso(LXk), games: [goneG.id, goneG2.id], baked_at: null, pool: { pref: 2, thin: 0, mkt: 0, far: 0 },
  tiers: [tier('safe', 2, [teamLeg(goneG, 'AAA', 'ml', 0, 150), teamLeg(goneG2, 'CCC', 'ml', 0, -120)]), why('med'), why('aggr'), why('xtrm')], taken_at: iso(LXk - H) };
LX.grade = { safe: { result: 'won', legs: ['win', 'win'], payout: LX.tiers[0].dec } };
const LU = { ...clone(LX), kickoff: iso(LUk), taken_at: iso(tA - 2 * H) }; delete LU.grade;
write({ how: 'planted', since: '2026-10-12', updated: null, entries: { [oldKey(LXk)]: LX, [oldKey(LUk)]: LU } });
const LXtext = () => block(bytes(), 'entries', oldKey(LXk));
const LX0 = LXtext();

/* A: hours before the first lock, every prime-time game's set taken */
let r = run(P0, tA);
chk(r.code === 0 && /^suggest ledger: written/.test(r.last), 'A: the first run did not write a ledger: ' + r.out.slice(-400));
let L = read();
const keysA = primesA.map(g => keyOf(g, MOVE)).sort();
chk(Object.keys(L.prime || {}).sort().join() === keysA.join(), `A: the sets taken are not one for each prime-time game: ${Object.keys(L.prime || {}).join(', ')} against ${keysA.join(', ')}`);
chk(L.prime_since === SL.PRIME_SINCE && L.since === '2026-10-12', 'A: since or prime_since is not the record\'s');
chk(!L.entries[oldKey(LUk)] && /dropped .*retired all-games panel/.test(r.last) && Object.keys(L.entries).join() === oldKey(LXk), 'A: the old panel\'s entry not yet frozen was not dropped, or a wave was taken: ' + Object.keys(L.entries).join(', '));
chk(LX0 && LXtext() === LX0, 'A: the old panel\'s frozen entry is not the same to the byte');
for (const g of primesA) {
  const e = L.prime[keyOf(g, MOVE)]; if (!e) continue; const k = kOf(g, MOVE);
  chk(e.season === season && e.week === W && e.gid === g.id && e.away === g.a && e.home === g.h && e.kickoff === iso(k) && e.lock === iso(k - LOCK) && e.taken_at === iso(tA),
    `A: ${g.id}'s set is not dated, keyed and locked as its game: ${JSON.stringify({ ...e, tiers: undefined })}`);
  chk(e.tiers.map(t => t.id).join() === SL.TIERS.join() && !e.grade && !e.updates, `A: ${g.id}'s set does not hold the four levels, ungraded`);
  for (const t of e.tiers.filter(t => t.legs)) {
    chk(t.legs.length === t.n && t.p > 0 && t.p < 1 && t.dec > 1 && (t.fair == null || (t.fair > 0 && t.fair < 1)), `A: ${g.id} ${t.id} is not a parlay of its size with a chance and a price`);
    chk(t.legs.every(l => l.gid === g.id && l.week === W && l.pid && l.stat && l.side && isFinite(l.k) && isFinite(l.price) && l.name && l.label && l.p > 0 && l.p < 1), `A: a ${g.id} ${t.id} leg is not on its own game, or is missing what it needs to be graded`);
    const pl = t.legs.filter(l => l.grp !== 'TEAM'), side = t.legs.filter(l => l.stat === 'ml' || l.stat === 'ats'), tot = t.legs.filter(l => l.stat === 'total');
    chk(new Set(pl.map(l => l.pid)).size === pl.length && side.length <= 1 && tot.length <= 1, `A: ${g.id} ${t.id} has a player twice, or two sides or two totals of the game`);
  }
  chk(!!e.tiers.find(t => t.id === 'safe').legs || !e.tiers.some(t => t.legs && t.n > 2), `A: ${g.id} has a bigger parlay and no Safe pair`);
}
const eA = L.prime[KP];
chk(!!eA && eA.tiers.some(t => t.legs), `A: the made-up week gives gP (${gP.id}, ${rowsOf(gP.id)} price rows) no parlay to hold the rewrite to`);
chk(L.prime_summary && L.prime_summary.entries === keysA.length && L.prime_summary.graded_entries === 0, 'A: the prime-time summary does not count the sets, none graded');
/* (app v124) every set's player legs priced from the test's read: dkline, the fair chance est., never under the price */
const mlP = ml => ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100);
{ const sets = [...Object.values(L.prime), ...Object.values(L.slot || {})], lv = sets.flatMap(e => e.tiers.filter(t => t.legs));
  const pls = lv.flatMap(t => t.legs.filter(l => l.grp !== 'TEAM'));
  chk(pls.length > 0, `A: no set holds a player leg priced from the read (${sets.length} sets)`);
  chk(pls.every(l => l.src === 'dkline' && l.fair_est === true && isFinite(l.price) && l.price !== 0 && l.p >= mlP(l.price) - 1e-4),
    'A: a player leg is not priced from the read (dkline, its fair chance est.), or is under its price: ' + JSON.stringify(pls.filter(l => !(l.src === 'dkline' && l.fair_est === true && l.p >= mlP(l.price) - 1e-4)).slice(0, 2)));
  chk(lv.every(t => !t.legs.some(l => l.grp !== 'TEAM') || t.fair_est === true), 'A: a level holding a leg priced from the read does not say its fair chance is estimated');
  const elo = sets.flatMap(e => (e.elo || []).filter(t => t.legs).flatMap(t => t.legs));
  chk(elo.every(l => l.src === 'dkline'), 'A: an Elo pick holds a leg not priced from the read: ' + JSON.stringify(elo.filter(l => l.src !== 'dkline').slice(0, 2))); }
/* a side run (its own copy of the ledger): gP's read dated at its kickoff gives it no player leg; a read that is junk, or
   none, gives every set team legs alone and throws nothing; a page that drops a well-formed read is refused, the file
   untouched */
{ const SIDE = path.join(DIR, 'side.json'), side = (pay, extra = {}) => { fs.writeFileSync(SIDE, bytes()); const rr = run(pay, tA, { SUGGEST_LEDGER: SIDE, ...extra }); return { rr, L: JSON.parse(fs.readFileSync(SIDE, 'utf8')) }; };
  const teamOnly = x => [...Object.values(x.prime), ...Object.values(x.slot || {})].every(e => e.tiers.every(t => !t.legs || t.legs.every(l => l.grp === 'TEAM')));
  { const PK = clone(P0), e = PK.espn.games[gP.id]; chk(!!e, `A: the test's read has no lines for gP (${gP.id})`);
    if (e) { e.pl.at = e.out.at = new Date(kP).toISOString(); const { rr, L: x } = side(PK);
      chk(rr.code === 0 && !!x.prime[KP] && x.prime[KP].tiers.every(t => !t.legs || t.legs.every(l => l.grp === 'TEAM')), 'A: a read dated at gP\'s kickoff gave its set a player leg: ' + rr.last); } }
  for (const [lab, junk] of [['junk', 'junk'], ['of another version', { v: 2, games: P0.espn.games }], ['missing', undefined]]) {
    const PJ = clone(P0); if (junk === undefined) delete PJ.espn; else PJ.espn = junk; const { rr, L: x } = side(PJ);
    chk(rr.code === 0 && Object.keys(x.prime).length === keysA.length && teamOnly(x), `A: a read ${lab} did not give every set team legs alone, or the run failed: ` + rr.last); }
  { const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), m = 'function espnPublished(){';
    chk(page.includes(m), 'A: the site\'s page has no espnPublished to stand in for a page that drops the read (rebuild index.html)');
    const PG = path.join(DIR, 'page_drops_read.html'); fs.writeFileSync(PG, page.replace(m, m + ' return 0;'));
    fs.writeFileSync(SIDE, bytes()); const before = bytes(), rr = run(P0, tA, { SUGGEST_LEDGER: SIDE, SUGGEST_PAGE: PG });
    chk(rr.code === 1 && /did not apply the payload's ESPN read/.test(rr.out) && fs.readFileSync(SIDE, 'utf8') === before, 'A: a page that drops the payload\'s well-formed ESPN read was not refused with the file untouched: ' + rr.out.slice(-300)); } }
/* (app v118) every set's Elo picks, and the week's Sunday slot: one set while its lock is to come */
for (const g of primesA) { const e = L.prime[keyOf(g, MOVE)]; if (e) eloHeld(e, [g.id], `A: ${g.id}`); }
const slotA = slotUnder(MOVE), KS = slotA && slotA.key;
chk(L.slot_since === SL.SLOT_SINCE && L.slot && typeof L.slot === 'object', 'A: no slot map, or slot_since is not the record\'s');
if (slotA && slotA.lock > tA) {
  const e = L.slot[KS];
  chk(!!e && Object.keys(L.slot).join() === KS, `A: the Sunday slot is not one set keyed ${KS}: ${Object.keys(L.slot).join(', ')}`);
  if (e) {
    chk(e.season === season && e.week === W && e.gid === slotA.id && JSON.stringify(e.games) === JSON.stringify(slotA.games) && e.kickoff === iso(slotA.kick) && e.lock === iso(slotA.lock) && e.taken_at === iso(tA) && !e.grade,
      `A: the slot is not dated, keyed and locked as its games are, or holds other games: ${JSON.stringify({ ...e, tiers: undefined, elo: undefined })} against ${JSON.stringify(slotA)}`);
    chk(e.tiers.map(t => t.id).join() === SL.TIERS.join(), 'A: the slot does not hold the four levels');
    for (const t of e.tiers.filter(t => t.legs)) {
      chk(t.legs.length === t.n && t.legs.every(l => slotA.games.includes(l.gid)), `A: the slot's ${t.id} holds a leg on a game not its own, or is short`);
      const pl = t.legs.filter(l => l.grp !== 'TEAM');
      chk(new Set(pl.map(l => l.pid)).size === pl.length, `A: the slot's ${t.id} takes a player twice`); }
    eloHeld(e, slotA.games, 'A: the slot'); }
} else chk(!Object.keys(L.slot || {}).length, 'A: a Sunday slot was taken after its lock');

/* B: hours later, gP's player prices gone and the schedule moved */
const tB = tA + 2 * H;
const noPrices = pay => { if (pay.prices) pay.prices[WS] = (pay.prices[WS] || []).filter(x => x.game_id !== gP.id);
  for (const p of Object.values((pay.mkt || {})[WS] || {})) for (const s of Object.keys(p)) if (p[s] && p[s].g === gP.id) delete p[s];
  /* (app v124) and its read of DraftKings' lines */
  if (pay.espn && pay.espn.games) delete pay.espn.games[gP.id];
  return pay; };
const P0b = stamp(moved(noPrices(clone(P0)), MOVE_B), tB - H);
r = run(P0b, tB);
L = read(); const eB = L.prime[KP];
chk(r.code === 0 && new RegExp('rewrote ' + KP.replace(/[|.]/g, '\\$&')).test(r.last), 'B: gP\'s set was not rewritten: ' + r.last);
chk(!!eB && eB.taken_at === iso(tB) && JSON.stringify(eB.tiers) !== JSON.stringify(eA && eA.tiers), 'B: the rewritten set is not the new one, dated by its run');
chk(!!eB && eB.tiers.every(t => !t.legs || t.legs.every(l => l.grp === 'TEAM')), 'B: the rewritten set still holds a player leg the payload has no price for');
chk(!L.prime[keyOf(gSN, MOVE)] && !Object.values(L.prime).some(e => e.gid === gSN.id), `B: ${gSN.id}, moved to 4:25 pm, kept a set`);
chk(!Object.values(L.prime).some(e => e.gid === gSat.id), `B: ${gSat.id}, moved to a Saturday night, has a set`);
chk(!!L.prime[keyOf(gMon, MOVE_B)] && L.prime[keyOf(gMon, MOVE_B)].taken_at === iso(tB), `B: ${gMon.id}, moved to Monday 7:15 pm, has no set`);
chk(Object.keys(L.prime).sort().join() === primesUnder(MOVE_B).map(g => keyOf(g, MOVE_B)).sort().join(), 'B: the sets are not one for each prime-time game: ' + Object.keys(L.prime).join(', '));
chk(LXtext() === LX0, 'B: the old panel\'s frozen entry is not the same to the byte');
/* the slot under B's moves (a game moved to Sunday 4:25 pm joins it, one moved to a Saturday night leaves it) */
const slotB = slotUnder(MOVE_B), KSB = slotB && slotB.key;
if (slotB && slotB.lock > tB) chk(!!L.slot[KSB] && JSON.stringify(L.slot[KSB].games) === JSON.stringify(slotB.games) && Object.keys(L.slot).join() === KSB,
  `B: the Sunday slot does not follow the schedule's moves: ${JSON.stringify(Object.values(L.slot).map(e => e.games))} against ${JSON.stringify(slotB.games)}`);
const ledgerB = bytes();
/* B2: nothing changed, nothing written */
r = run(P0b, tB + H);
chk(r.code === 0 && /^suggest ledger: unchanged/.test(r.last) && bytes() === ledgerB, 'B2: a run that changed nothing wrote the ledger: ' + r.last);
/* B3: a second before gP's lock, the read back with every line of gP moved a yard (or a catch) up: still live, rewritten,
   its player legs on the moved lines (app v124: a moved line in the read rewrites a live set) */
const P1 = stamp(moved(clone(P0), MOVE_B), lockP - H);
{ const e = P1.espn.games[gP.id]; if (e) for (const o of Object.values(e.pl.lines)) for (const st of Object.keys(o)) o[st] += 1; }
r = run(P1, lockP - 1000);
{ const e = read().prime[KP] || {}, mv = (P1.espn.games[gP.id] || { pl: { lines: {} } }).pl.lines, mains = (e.tiers || []).flatMap(t => t.legs || []).filter(l => l.grp !== 'TEAM' && l.main);
  chk(r.code === 0 && e.taken_at === iso(lockP - 1000), 'B3: a run a second before the lock did not rewrite the set: ' + r.last);
  chk(mains.every(l => mv[l.pid] && mv[l.pid][l.stat] === l.k), 'B3: a main line in the rewritten set is not on the read\'s moved line: ' + JSON.stringify(mains.filter(l => !(mv[l.pid] && mv[l.pid][l.stat] === l.k)).slice(0, 2))); }
fs.writeFileSync(LEDGER, ledgerB);

/* C: an hour after gP's lock, the prices back: locked as B left it */
const tC = lockP + H;
const PC = stamp(moved(clone(P0), MOVE_C), tC - H);
r = run(PC, tC);
L = read(); const eC = L.prime[KP];
chk(r.code === 0, 'C: the run failed: ' + r.out.slice(-400));
chk(!!eC && JSON.stringify(eC) === JSON.stringify(eB), 'C: gP\'s set moved after its lock (the page would build another now; the record keeps the last run\'s before it)');
chk(!Object.values(L.prime).some(e => e.gid === gN.id), `C: ${gN.id}, moved to a prime-time kickoff whose lock had passed, got a set no run took before its lock`);
chk(LXtext() === LX0, 'C: the old panel\'s frozen entry is not the same to the byte');
if (slotB && slotB.lock > tB && slotB.lock < tC) chk(JSON.stringify(L.slot[KSB]) === JSON.stringify(JSON.parse(ledgerB).slot[KSB]), 'C: the Sunday slot moved after its lock');
const ledgerC = bytes();

/* R: half an hour later, a player of a locked level ruled Out */
const tR = tC + H / 2;
const RULED = plLeg('XX-RULED', gP, gP.h, 'receptions', 3.5, 'over', true, -120, { name: 'Ruled Out Jr.' });
const FINE = ['XX-FINE1', 'XX-FINE2', 'XX-FINE3'].map(pid => plLeg(pid, gP, gP.a, 'receiving_yards', 30.5, 'over', true, -110));
const SAFE_R = tier('safe', 2, [teamLeg(gP, gP.h, 'ml', 0, -150), RULED]), AGGR_R = tier('aggr', 4, [...FINE, teamLeg(gP, gP.a, 'ats', 3.5, -110)]);
/* (app v118) and its Elo Safe holding him too, so the Elo picks' replacement is held end to end beside the model's */
const ELO_R = { ...tier('safe', 2, [{ ...RULED, pe: 0.6, thin: null, market: null }, { ...FINE[0], pe: 0.55, thin: null, market: null }]), id: 'elo-safe', floor: 0.35 };
{ const x = JSON.parse(ledgerC); const e = x.prime[KP]; e.tiers = e.tiers.map(t => t.id === 'safe' ? SAFE_R : t.id === 'aggr' ? AGGR_R : t);
  if (Array.isArray(e.elo)) e.elo = e.elo.map(t => t.id === 'elo-safe' ? ELO_R : t); write(x); }
const plantedR = read(), ledgerR0 = bytes();
const out = (pay, pid, team) => { pay.injuries = [...(pay.injuries || []), { season: String(season), week: WS, gsis_id: pid, team, report_status: 'Out', practice_status: 'Did Not Participate In Practice', injury: 'Knee' }]; return pay; };
const PR = stamp(out(clone(PC), 'XX-RULED', gP.h), tR - H);
r = run(PR, tR);
L = read(); const eR = L.prime[KP] || {}, pR = plantedR.prime[KP];
const sR = (eR.tiers || []).find(t => t.id === 'safe') || {};
chk(r.code === 0 && /replaced /.test(r.last), 'R: the run did not replace the level holding a player ruled out: ' + r.out.slice(-400));
chk(sR.updated && sR.updated.pid === 'XX-RULED' && sR.updated.name === 'Ruled Out Jr.' && typeof sR.updated.reason === 'string' && sR.updated.reason && sR.updated.at === iso(tR),
  'R: the replaced level is not marked updated with the player, the reason and the run\'s time: ' + JSON.stringify(sR.updated));
chk(!(sR.legs || []).some(l => l.pid === 'XX-RULED') && (!sR.legs || (sR.legs.length === 2 && sR.legs.every(l => l.gid === gP.id))), 'R: the replaced level still holds him, or is not a pair on its own game');
/* (app v124) built from the read at hand: a player leg on it priced from it, a main line at the read's own number */
{ const rl = (PR.espn.games[gP.id] || { pl: { lines: {} } }).pl.lines;
  chk((sR.legs || []).filter(l => l.grp !== 'TEAM').every(l => l.src === 'dkline' && (!l.main || (rl[l.pid] && rl[l.pid][l.stat] === l.k))), 'R: the level built again holds a player leg not priced from the read at hand: ' + JSON.stringify(sR.legs)); }
const eS = (eR.elo || []).find(t => t.id === 'elo-safe') || {};
chk(Array.isArray(pR.elo), 'R: the locked set has no Elo picks to plant a ruled-out player in (the run that took it built none)');
chk(eS.updated && eS.updated.pid === 'XX-RULED' && eS.updated.at === iso(tR) && !(eS.legs || []).some(l => l.pid === 'XX-RULED') && (!eS.legs || (eS.legs.length === 2 && eS.legs.every(l => l.gid === gP.id && l.pe > 0 && l.pe < 1))),
  'R: the Elo Safe holding the player ruled out was not built again for him, marked updated, on its own game: ' + JSON.stringify(eS).slice(0, 300));
chk(JSON.stringify(eR.updates) === JSON.stringify([{ tier: 'safe', ...sR.updated }, { tier: 'elo-safe', ...eS.updated }]), 'R: the replacements are not recorded in updates, the model\'s then the Elo pick\'s: ' + JSON.stringify(eR.updates));
chk(['med', 'aggr', 'xtrm'].every(id => JSON.stringify(eR.tiers.find(t => t.id === id)) === JSON.stringify(pR.tiers.find(t => t.id === id)))
  && ['elo-med', 'elo-aggr', 'elo-xtrm'].every(id => JSON.stringify((eR.elo || []).find(t => t.id === id)) === JSON.stringify((pR.elo || []).find(t => t.id === id))), 'R: a level with no one ruled out moved');
{ const strip = e => { const { tiers, elo, updates, ...c } = e; return JSON.stringify(c); };
  chk(strip(eR) === strip(pR), 'R: the locked set moved beyond the level replaced'); }
chk(L.prime_summary.updates === 2, 'R: the prime-time summary does not count the two replacements');
const ledgerR = bytes();
r = run(PR, tR + 5 * 60e3);
chk(r.code === 0 && /^suggest ledger: unchanged/.test(r.last) && bytes() === ledgerR, 'R2: the same run again wrote the ledger: ' + r.last);
/* R3: after kickoff, another player ruled Out: nothing changes but the grade */
r = run(out(clone(PR), 'XX-FINE1', gP.a), kP + H / 2);
L = read();
{ const e = L.prime[KP] || {}, strip = x => { const { grade, ...c } = x || {}; return JSON.stringify(c); };
  chk(r.code === 0 && strip(e) === strip(JSON.parse(ledgerR).prime[KP]) && !!e.grade, 'R3: a set changed after kickoff, or was not graded from it: ' + r.last); }
const ledgerR3 = bytes();

/* D: the week played out, with made-up entries of both kinds planted for every rule of a settlement */
const tD = lastKick + 36 * H;
const P2 = stamp(moved(week(clone(REAL), { scored: games, stats: rowsFor(games) }), MOVE_C), tD - H);
/* the plants: a player of a game with stats, given his own stat row (a QB's 250 passing yards); a game
   tied (a moneyline push); a player with no row in a game whose stats are in (a void) */
const gq = games[0], qbTeam = gq.h;
Object.assign(P2.sched.find(g => g.id === gq.id), { hs: 27, as: 17 });
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
const team = (g, t, stat, k, price) => teamLeg(g, t, stat, k, price, { name: t });
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
const at = (l, g, tm) => ({ ...l, gid: g.id, team: tm });
const L_PLAYED_O = player('XX-PLAYED', gq, 'receptions', 0.5, 'over', true, -150), L_PLAYED_U = { ...L_PLAYED_O, side: 'under', price: 120 };
const L_NAMED_U = at({ ...player('XX-NAMED', gq, 'receiving_yards', 8.5, 'under', true, 110), name: 'Named Fallback Jr.' }, gNamed, gNamed.h);
const L_ZERO = player('XX-ZERO', gq, 'receptions', 1.5, 'over', true, -105);
const L_OUT = at(player('XX-OUT', gq, 'receptions', 2.5, 'over', true, -110), gOut, gOut.h), L_UNK = at(player('XX-UNK', gq, 'receptions', 2.5, 'over', true, -110), gOut, gOut.a);
{ const real = ((REAL.snaps || {})[WS]) || {};
  P2.snaps[WS] = Object.fromEntries(games.filter(g => g.id !== gOut.id).map(g => [g.id, { [g.h]: [...((real[g.id] || {})[g.h] || [])], [g.a]: [...((real[g.id] || {})[g.a] || [])] }]));
  P2.snaps[WS][gq.id][qbTeam].push('XX-PLAYED'); P2.snaps[WS][gNamed.id][gNamed.h].push('XX-NAMED'); }
P2.injuries = [...(P2.injuries || []), { season: String(season), week: String(W), gsis_id: 'XX-OUT', team: gOut.h, report_status: 'Out', practice_status: 'Did Not Participate In Practice', injury: 'Knee' }];
const OUTS = new Set(P2.injuries.filter(x => x.report_status === 'Out').map(x => String(+x.week) + '|' + x.gsis_id));
/* the old panel's plants, spread over the week's games (its waves before the first kickoff) */
const kX = kicks[0] - 3 * H, kY = kicks[0] - 2 * H, kX2 = kicks[0] - 2.5 * H, kZ = kicks[0] - 1.5 * H, kQ = kicks[0] - 1.25 * H;
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
/* Q: the planted quarterback's own touchdown (a run or a catch, app v102): his two touchdown passes and
   no run do not win it */
const L_QBTD = { ...player(qb.id, gq, 'any_td', 1, 'over', false, 235), label: 'Scores a rushing or receiving TD (not a TD pass)' };
const Q = plant(kQ, [tier('safe', 2, [L_QBTD, L_WIN])]);              /* lost: the touchdown passes are not his */
/* E: (app v124) a level of legs priced from DraftKings' lines read on ESPN (dkline, est.) with a void: the rest paid at
   their stored estimated prices, never priced again from a read */
const kE = kicks[0] - 1.75 * H, dkl = l => ({ ...l, src: 'dkline', fair_est: true });
const EX = plant(kE, [tier('med', 3, [dkl(L_VOID), dkl(L_RUNG), dkl(L_NAMED_U)], { fair_est: true })]);   /* won: the void out, the rung and the under paid at their own prices */
/* PS: last season's week W, an all-player Safe graded lost; this season's rows for the same players
   and week would win it: never regraded */
const kPS0 = kicks[0] - 365 * DAY, prevGid = `${season - 1}_${WW}_${gq.a}_${gq.h}`;
const PS = { ...plant(kPS0, [tier('safe', 2, [{ ...L_OVER, gid: prevGid }, { ...L_EXACT, gid: prevGid }])]), season: season - 1, games: [prevGid] };
PS.grade = { safe: { result: 'lost', legs: ['loss', 'loss'], payout: 0 } };
const kPS = `${season - 1}|${WW}|${iso(kPS0)}`;

/* the prime-time plants, each on one game and at a prime-time kickoff of its own before the run */
const primeBack = (from, k) => { const out2 = []; for (let t = Math.floor(from / (15 * 60e3)) * 15 * 60e3; out2.length < k && t > from - 40 * DAY; t -= 15 * 60e3) if (primeAt(t) && !out2.some(x => Math.abs(x - t) < 6 * H)) out2.push(t); return out2; };
const satNight = from => { for (let t = Math.ceil(from / (15 * 60e3)) * 15 * 60e3; t < from + 9 * DAY; t += 15 * 60e3) {
  const p = Object.fromEntries(NYF.formatToParts(new Date(t)).map(x => [x.type, x.value])); if (p.weekday === 'Sat' && +p.hour === 20) return t; } return null; };
const primeFwd = (from, to) => { for (let t = Math.ceil(from / (15 * 60e3)) * 15 * 60e3; t <= to; t += 15 * 60e3) if (primeAt(t)) return t; return null; };
const [pk1, pk2, pk3, pk4] = primeBack(kicks[0] - 6 * H, 4);
const pkLast = primeFwd(lastKick + 15 * 60e3, tD - 60e3);
const prime = (g, k, tiers, more = {}) => ({ season, week: W, gid: g.id, away: g.a, home: g.h, kickoff: iso(k), lock: iso(k - LOCK), baked_at: null,
  pool: { pref: 0, thin: 0, mkt: 0, far: 0 }, tiers, taken_at: iso(k - LOCK - H), ...more });
const pkey = e => `${e.season}|${pad(e.week)}|${e.kickoff}|${e.gid}`;
const ML_Q = team(gq, gq.h, 'ml', 0, 150), ATS_PUSH_Q = team(gq, gq.h, 'ats', -10, -110), TOT_PUSH_Q = { ...team(gq, gq.h, 'total', 44, -110), pid: 'game', side: 'under', main: true };
const PX = prime(gq, pk1, four(
  tier('safe', 2, [ML_Q, L_OVER]),                                    /* won, the whole price */
  tier('med', 3, [L_VOID, L_RUNG, TOT_PUSH_Q]),                       /* won: a void and a push drop out, the rung paid alone */
  tier('aggr', 4, [ML_Q, ATS_PUSH_Q, L_EXACT, L_UNDER]),             /* lost */
  tier('xtrm', 5, [L_VOID, TOT_PUSH_Q, ATS_PUSH_Q, L_EXACT, { ...L_VOID, pid: 'XX-0000002' }]))); /* a push */
const PZ = prime(gq, pk2, four(
  tier('safe', 2, [L_PLAYED_O, ML_Q]),                                /* lost: he played, no catch */
  tier('med', 3, [L_PLAYED_U, ML_Q, L_ZERO]),                         /* won: the under on zero, no snap void */
  tier('aggr', 4, [L_QBTD, ML_Q, L_OVER, L_RUNG])));                  /* lost: the touchdown passes are not his */
const ML_OUT = team(gOut, winner(gOut), 'ml', 0, 140), TOT_OUT = { ...team(gOut, gOut.h, 'total', sc(gOut.id).hs + sc(gOut.id).as - 0.5, -110), pid: 'game', main: true };
const PO = prime(gOut, pk3, four(
  tier('safe', 2, [L_OUT, L_UNK]),                                    /* pending: no snaps for his club, not Out */
  tier('med', 3, [L_OUT, ML_OUT, TOT_OUT])));                         /* won: the Out leg void */
/* a game's level two kickoffs hold (the league moved it): counted once, from the last key */
const PWa = prime(gWin, pk4, four(tier('safe', 2, [L_WIN, L_ATS_PUSH])));           /* won: the push drops out, the money line paid alone */
const PWb = pkLast ? prime(gWin, pkLast, four(tier('safe', 2, [team(gWin, loser(gWin), 'ml', 0, 120), L_ATS_PUSH]))) : null;   /* lost */
/* last season's: graded lost, never regraded */
const kPPS = primeBack(kicks[0] - 364 * DAY, 1)[0];
const PPS = { ...prime({ id: prevGid, a: gq.a, h: gq.h }, kPPS, four(tier('safe', 2, [{ ...L_OVER, gid: prevGid }, { ...L_EXACT, gid: prevGid }]))), season: season - 1 };
PPS.grade = { safe: { result: 'lost', legs: ['loss', 'loss'], payout: 0 } };
{ const x = JSON.parse(ledgerR3);
  for (const [k, e] of [[kX, X], [kY, Y], [kX2, X2], [kZ, Z], [kQ, Q], [kE, EX]]) x.entries[oldKey(k)] = e;
  x.entries[kPS] = PS;
  for (const e of [PX, PZ, PO, PWa, PWb, PPS].filter(Boolean)) x.prime[pkey(e)] = e;
  write(x); }
const plantedD = read();
r = run(P2, tD);
L = read();
chk(r.code === 0, 'D: the run failed: ' + r.out.slice(-600));
chk(LXtext() === LX0, 'D: the old panel\'s frozen entry is not the same to the byte');
{ const strip = x => { const { grade, ...c } = x || {}; return JSON.stringify(c); };
  chk(strip(L.prime[KP]) === strip(plantedD.prime[KP]), 'D: gP\'s locked set moved after its kickoff'); }
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
  /* the legs left, in different games or one alone: their prices multiplied (a same-game remainder is
     priced together, so only held over 1 here) */
  const apart = new Set(left.map(l => l.gid)).size === left.length;
  return { result: 'won', legs, payout: left.length === t.legs.length ? t.dec : apart ? r3(left.reduce((a, l) => a * dec(l.price), 1)) : null };
}
const same = (g, w) => !!g && g.result === w.result && JSON.stringify(g.legs) === JSON.stringify(w.legs) && (w.payout == null ? g.result !== 'won' || g.payout > 1 : Math.abs(g.payout - w.payout) < 0.0015);
let graded = 0, pend = 0;
for (const map of ['entries', 'prime', 'slot']) for (const [k, e] of Object.entries(L[map])) {
  if (Date.parse(e.kickoff) > tD) { chk(!e.grade, `D: ${k}, still to come, has a grade`); continue; }
  for (const t of SL.levelsOf(e).filter(t => t.legs)) {
    const g = e.grade && e.grade[t.id], w = expect(t);
    if (k === kPS || k === pkey(PPS)) { chk(JSON.stringify(g) === JSON.stringify((k === kPS ? PS : PPS).grade[t.id]), `D: last season's ${k} ${t.id} was regraded on this season's week ${W}: ${JSON.stringify(g)}`); continue; }
    if (k === oldKey(kY) && t.id === 'safe') { chk(JSON.stringify(g) === JSON.stringify(Y.grade.safe), 'D: a grade made before was undone by a payload that cannot settle it'); continue; }
    if (k === oldKey(LXk)) { chk(JSON.stringify(g) === JSON.stringify(LX.grade[t.id]), 'D: the old frozen entry\'s grade was undone'); continue; }
    chk(same(g, w), `D: ${k} ${t.id} graded ${JSON.stringify(g)}, the legs say ${JSON.stringify(w)}`);
    if (g && g.result !== 'pending') graded++; else pend++;
  }
}
const gOf = (map, key) => ((L[map][key] || {}).grade) || {};
const gx = gOf('entries', oldKey(kX));
chk(gx.safe && gx.safe.result === 'won' && gx.safe.payout === X.tiers[0].dec, 'D: two legs won do not pay the whole price');
chk(gx.med && gx.med.result === 'won' && JSON.stringify(gx.med.legs) === '["void","win","push"]' && gx.med.payout === r3(dec(L_RUNG.price)), 'D: a void and a push did not drop out, the leg left paid alone: ' + JSON.stringify(gx.med));
chk(gx.aggr && gx.aggr.result === 'lost' && gx.aggr.payout === 0, 'D: a parlay with a leg lost is not lost');
chk(gx.xtrm && gx.xtrm.result === 'push' && gx.xtrm.payout === 1 && gx.xtrm.legs.every(x => x === 'push' || x === 'void'), 'D: every leg a push or a void is not a push, the stake back: ' + JSON.stringify(gx.xtrm));
const gy = gOf('entries', oldKey(kY));
chk(!gy.med && gy.aggr && gy.aggr.result === 'won' && JSON.stringify(gy.aggr.legs) === '["win","win","push","void"]' && gy.aggr.payout === r3(dec(L_WIN.price) * dec(L_OVER.price)), 'D: a level with no parlay was graded, or a planted level was not: ' + JSON.stringify(gy));
{ const ge = gOf('entries', oldKey(kE));
  chk(ge.med && ge.med.result === 'won' && JSON.stringify(ge.med.legs) === '["void","win","win"]' && ge.med.payout === r3(dec(L_RUNG.price) * dec(L_NAMED_U.price)),
    'D: a level of legs priced from the read with a void is not paid the rest at their stored prices: ' + JSON.stringify(ge.med)); }
const gqb = gOf('entries', oldKey(kQ));
chk(gqb.safe && gqb.safe.result === 'lost' && JSON.stringify(gqb.safe.legs) === '["loss","win"]', 'D: a quarterback\'s touchdown was won on his touchdown passes: ' + JSON.stringify(gqb.safe));
const gz = gOf('entries', oldKey(kZ));
chk(gz.safe && gz.safe.result === 'lost' && JSON.stringify(gz.safe.legs) === '["loss","win"]', 'D: a player who played with no stat line did not lose his over on zero: ' + JSON.stringify(gz.safe));
chk(gz.med && gz.med.result === 'won' && JSON.stringify(gz.med.legs) === '["win","win","void"]' && gz.med.payout === r3(dec(L_PLAYED_U.price) * dec(L_WIN.price)),
  'D: a player who played with no stat line did not win his under on zero, or one Out with no snap counts in was not void: ' + JSON.stringify(gz.med));
chk(gz.aggr && gz.aggr.result === 'won' && JSON.stringify(gz.aggr.legs) === '["win","void","win","win"]' && gz.aggr.payout === r3(dec(L_NAMED_U.price) * dec(L_WIN.price) * dec(L_OVER.price)),
  'D: a player who played with no stat line on another club was not graded on zero, or one with no snaps was not void: ' + JSON.stringify(gz.aggr));
chk(gz.xtrm && gz.xtrm.result === 'pending' && gz.xtrm.legs[0] === null, 'D: a player with no stat line, no snap counts for his club and not Out did not wait: ' + JSON.stringify(gz.xtrm));
chk(JSON.stringify(gOf('entries', kPS)) === JSON.stringify(PS.grade), 'D: last season\'s entry was regraded: ' + JSON.stringify(gOf('entries', kPS)));
/* the prime-time plants, each on its one game */
const px = gOf('prime', pkey(PX)), pz = gOf('prime', pkey(PZ)), po = gOf('prime', pkey(PO)), pwa = gOf('prime', pkey(PWa));
chk(px.safe && px.safe.result === 'won' && px.safe.payout === PX.tiers[0].dec, 'D: a prime-time pair won does not pay its whole price: ' + JSON.stringify(px.safe));
chk(px.med && px.med.result === 'won' && JSON.stringify(px.med.legs) === '["void","win","push"]' && px.med.payout === r3(dec(L_RUNG.price)), 'D: a prime-time level\'s void and total push did not drop out, the leg left paid its own price: ' + JSON.stringify(px.med));
chk(px.aggr && px.aggr.result === 'lost' && px.aggr.payout === 0 && JSON.stringify(px.aggr.legs) === '["win","push","push","loss"]', 'D: a prime-time level with a leg lost, beside a spread push, is not lost: ' + JSON.stringify(px.aggr));
chk(px.xtrm && px.xtrm.result === 'push' && px.xtrm.payout === 1, 'D: a prime-time level of pushes and voids is not a push: ' + JSON.stringify(px.xtrm));
chk(pz.safe && pz.safe.result === 'lost' && JSON.stringify(pz.safe.legs) === '["loss","win"]', 'D: a prime-time over on a player who played with no stat line did not lose: ' + JSON.stringify(pz.safe));
chk(pz.med && pz.med.result === 'won' && JSON.stringify(pz.med.legs) === '["win","win","void"]' && pz.med.payout > 1, 'D: a prime-time under on zero did not win, or a player with no snap was not void: ' + JSON.stringify(pz.med));
chk(pz.aggr && pz.aggr.result === 'lost' && pz.aggr.legs[0] === 'loss', 'D: a prime-time quarterback touchdown was won on his touchdown passes: ' + JSON.stringify(pz.aggr));
chk(po.safe && po.safe.result === 'pending' && JSON.stringify(po.safe.legs) === '["void",null]', 'D: a prime-time leg with no snaps in and not Out did not wait, or one Out was not void: ' + JSON.stringify(po.safe));
chk(po.med && po.med.result === 'won' && po.med.legs[0] === 'void' && po.med.payout > 1, 'D: a prime-time level with an Out leg was not won on the rest: ' + JSON.stringify(po.med));
chk(pwa.safe && pwa.safe.result === 'won' && pwa.safe.payout === r3(dec(L_WIN.price)), 'D: the one leg left after a push is not paid its own price: ' + JSON.stringify(pwa.safe));
chk(JSON.stringify(gOf('prime', pkey(PPS))) === JSON.stringify(PPS.grade), 'D: last season\'s prime-time set was regraded');
/* both summaries, worked here from the grades: an old-panel parlay (a season's week, a level, its legs in
   any order) once, from the last frozen entry that holds it; a prime-time game's level (a season, a game,
   a level) once, from the last key that holds it */
function want(map, idOf) {
  const out = {}; for (const id of SL.TIERS) out[id] = { graded: 0, won: 0, lost: 0, push: 0, exp_fair: 0, exp_model: 0, units: 0 };
  const once = new Map(); let pending = 0;
  for (const k of Object.keys(L[map]).sort()) { const e = L[map][k]; for (const t of e.tiers) { const g = (e.grade || {})[t.id]; if (!g || !t.legs) continue; once.set(idOf(e, t), { t, g }); } }
  for (const { t, g } of once.values()) { if (g.result === 'pending') { pending++; continue; }
    const s = out[t.id]; if (g.result === 'push') { s.push++; continue; } s.graded++; if (g.result === 'won') s.won++; else s.lost++; s.exp_model += t.p; s.exp_fair += t.fair || 0; s.units += g.payout - 1; }
  return { out, pending, once };
}
const lid = l => [l.gid, l.pid, l.stat, l.side, l.k, l.main ? 1 : 0].join('|');
for (const [map, sum, idOf] of [['entries', 'summary', (e, t) => [e.season, e.week, t.id, t.legs.map(lid).sort().join('+')].join('#')], ['prime', 'prime_summary', (e, t) => [e.season, e.gid, t.id].join('#')]]) {
  const w = want(map, idOf);
  for (const id of SL.TIERS) { const a = L[sum].tiers[id], b = w.out[id];
    chk(a.graded === b.graded && a.won === b.won && a.lost === b.lost && a.push === b.push && Math.abs(a.exp_fair - b.exp_fair) < 1e-3 && Math.abs(a.exp_model - b.exp_model) < 1e-3 && Math.abs(a.units - b.units) < 2e-3,
      `D: the ${sum}'s ${id} is not its grades': ${JSON.stringify(a)} against ${JSON.stringify(b)}`); }
  chk(L[sum].pending === w.pending, `D: the ${sum} counts ${L[sum].pending} pending, the grades ${w.pending}`);
  if (map === 'entries') chk([...w.once.values()].filter(x => x.t.id === 'safe' && x.t.legs.some(l => l.pid === L_WIN.pid) && x.t.legs.some(l => l.pid === L_OVER.pid && l.stat === L_OVER.stat) && x.t.legs.every(l => l.gid !== prevGid)).length === 1
    && L.summary.repeats >= 1, 'D: X\'s Safe parlay, frozen again at a later wave, is not one parlay, or the summary counts no repeat');
  if (map === 'prime' && PWb) chk((w.once.get([season, gWin.id, 'safe'].join('#')) || {}).g.result === 'lost', 'D: a game\'s level two kickoffs hold is not counted from the last');
}
chk(graded >= 8, `D: only ${graded} levels graded on a week played out`);
/* (app v118) the Elo picks' summaries and the Sunday slots', worked here from the grades: each season's unit and level
   once, from the last key that holds it */
for (const [map, sum] of [['prime', 'prime_summary'], ['slot', 'slot_summary']]) for (const [ids, part] of [[SL.TIERS, x => x], [SL.ELO_TIERS, x => x.elo]]) {
  const once = new Map(); let pending = 0; const own = Object.fromEntries(ids.map(id => [id, { graded: 0, won: 0, push: 0, exp_model: 0, units: 0 }]));
  for (const k of Object.keys(L[map]).sort()) { const e = L[map][k]; for (const t of SL.levelsOf(e)) { const g = (e.grade || {})[t.id]; if (!g || !t.legs || !own[t.id]) continue; once.set([e.season, e.gid, t.id].join('#'), { t, g }); } }
  for (const { t, g } of once.values()) { if (g.result === 'pending') { pending++; continue; } const s = own[t.id]; if (g.result === 'push') { s.push++; continue; } s.graded++; if (g.result === 'won') s.won++; s.exp_model += t.p; s.units += g.payout - 1; }
  const S0 = part(L[sum] || {}) || {};
  for (const id of ids) { const a = (S0.tiers || {})[id] || {}, b = own[id];
    chk(a.graded === b.graded && a.won === b.won && a.push === b.push && Math.abs(a.exp_model - b.exp_model) < 1e-3 && Math.abs(a.units - b.units) < 2e-3, `D: the ${sum}'s ${id} is not its grades': ${JSON.stringify(a)} against ${JSON.stringify(b)}`); }
  chk(S0.pending === pending, `D: the ${sum} counts ${S0.pending} pending ${ids === SL.TIERS ? 'model levels' : 'Elo picks'}, the grades ${pending}`); }
{ const nextSlot = slotUnder({}, REAL.sched.filter(g => +g.w === W + 1));
  if (nextSlot && nextSlot.lock > tD) chk(!!L.slot[nextSlot.key], `D: the next week's Sunday slot ${nextSlot.key} has no set`); }
{ const t0 = X.tiers[0], three = {}; for (const h of [5, 4, 3]) three[`${season}|01|${iso(kX - h * H)}`] = { season, week: 1, kickoff: iso(kX - h * H), tiers: [{ ...t0, legs: h === 4 ? [...t0.legs].reverse() : t0.legs }], grade: { safe: { result: 'won', legs: ['win', 'win'], payout: t0.dec } } };
  const sm = SL.summarize(three);
  chk(sm.tiers.safe.graded === 1 && sm.tiers.safe.won === 1 && Math.abs(sm.tiers.safe.units - (t0.dec - 1)) < 2e-3 && sm.repeats === 2 && sm.frozen_entries === 3,
    'D: one parlay on an unchanged panel across three waves is not counted once: ' + JSON.stringify(sm)); }
/* the next week's prime-time sets, each whose lock is still to come */
const nextPrimes = REAL.sched.filter(g => +g.w === W + 1 && primeAt(etKick(g)) && etKick(g) - LOCK > tD);
for (const g of nextPrimes) chk(!!L.prime[`${season}|${pad(W + 1)}|${iso(etKick(g))}|${g.id}`], `D: the next week's prime-time game ${g.id} has no set`);
chk(!Object.keys(L.entries).some(k => !plantedD.entries[k]), 'D: an old-panel wave was taken');

/* E: the last prime-time kickoff under way, no prime-time game to come: nothing new */
fs.writeFileSync(LEDGER, ledgerC);
const lastPrime = Math.max(...realW.filter(g => primeAt(kOf(g, MOVE_C))).map(g => kOf(g, MOVE_C)));
const tE = lastPrime + H / 2;
const early = games.filter(g => etKick(g) < lastPrime);
const P3 = stamp(moved(week(clone(REAL), { scored: early, stats: rowsFor(early) }), MOVE_C), tE - H);
const keysC = Object.keys(JSON.parse(ledgerC).prime).join();
r = run(P3, tE);
chk(r.code === 0 && /no prime-time game to come/.test(r.last) && Object.keys(read().prime).join() === keysC && Object.keys(read().slot).join() === Object.keys(JSON.parse(ledgerC).slot).join(), 'E: a run with no prime-time game to come took or dropped a set: ' + r.last);
const e1 = bytes(); r = run(P3, tE + 60e3);
chk(r.code === 0 && bytes() === e1, 'E2: the same run again wrote the ledger');

/* F: the guard, end to end. The file on disk had a locked set edited: refused, the last commit's put back */
const tF = tC + 10 * 60e3;
const published = path.join(DIR, 'published.json');
const refused = (what, edit, re) => {
  fs.writeFileSync(LEDGER, ledgerC); fs.writeFileSync(published, ledgerC);
  const x = JSON.parse(ledgerC); edit(x); fs.writeFileSync(LEDGER, SL.dumps(x) + '\n');
  r = run(PC, tF, { SUGGEST_PREV: published });
  chk(r.code === 1 && re.test(r.out) && bytes() === ledgerC, `F: ${what} on disk was not refused with the last commit's put back: ` + r.out.slice(-300)); };
refused('a locked set edited', x => { x.prime[KP].pool.pref += 1; }, /FAIL .*locked at .*changed \(pool\)/);
refused('a locked level edited', x => { x.prime[KP].tiers[0].floor += 0.01; }, /FAIL .*changed with no player ruled out/);
refused('an old frozen entry edited', x => { x.entries[oldKey(LXk)].tiers[0].legs[0].price += 5; }, /FAIL .*frozen at its kickoff/);
/* a set still to lock rewritten by an earlier run not yet committed (the last commit holds an older take):
   not a refusal, since only what the last commit had locked is held to it */
{ const kU = Object.keys(JSON.parse(ledgerC).prime).find(k => Date.parse(JSON.parse(ledgerC).prime[k].lock) > tF);
  if (kU) { const x = JSON.parse(ledgerC); x.prime[kU].pool.pref += 1; x.prime[kU].taken_at = iso(tA); fs.writeFileSync(LEDGER, ledgerC); fs.writeFileSync(published, SL.dumps(x) + '\n');
    r = run(PC, tF, { SUGGEST_PREV: published });
    chk(r.code === 0 && /^suggest ledger: unchanged/.test(r.last) && bytes() === ledgerC, 'F: an uncommitted rewrite of a set still to lock was refused against the last commit: ' + r.out.slice(-300)); }
  else chk(false, 'F: the made-up week left no set still to lock at ' + iso(tF)); }
/* a locked level an earlier run replaced, not yet committed: not a refusal against the last commit */
fs.writeFileSync(LEDGER, ledgerR); fs.writeFileSync(published, ledgerR0);
r = run(PR, tR + 5 * 60e3, { SUGGEST_PREV: published });
chk(r.code === 0 && /^suggest ledger: unchanged/.test(r.last) && bytes() === ledgerR, 'F: an earlier run\'s replacement, not yet committed, was refused against the last commit: ' + r.out.slice(-300));
/* a payload that is not there: refused, the file as it was */
fs.writeFileSync(LEDGER, ledgerC);
r = run(PC, tF, { SUGGEST_PAYLOAD: path.join(DIR, 'nothing.json') });
chk(r.code === 1 && /^suggest ledger: refused/.test(r.last) && bytes() === ledgerC, 'F: a missing payload was not refused, or the file moved');
/* check() on hand-made ledgers */
{ const base = JSON.parse(ledgerC), now = tF, runAt = iso(now);
  const t = (what, f, want, prevF) => { try { const prev = clone(base); if (prevF) prevF(prev); const x = clone(prev); f(x, prev);
      if (!/summary/.test(what)) { x.summary = SL.summarize(x.entries); x.prime_summary = SL.summarizePrime(x.prime); x.slot_summary = SL.summarizePrime(x.slot || {}); }
      const bad = SL.check(x, prev, now, runAt); chk(want ? bad.some(b => want.test(b)) : !bad.length, `F: check() on ${what}: ${JSON.stringify(bad)}`); }
    catch (e) { chk(false, `F: check() on ${what} could not be set up on the ledger C left: ${e.message}`); } };
  const SAFE = tier('safe', 2, [teamLeg(gP, gP.h, 'ml', 0, -150), RULED]);
  const held = p => { p.prime[KP].tiers[0] = clone(SAFE); };
  const upd = (o = {}) => ({ pid: 'XX-RULED', name: 'Ruled Out Jr.', reason: 'Out', at: runAt, ...o });
  const replace = (x, o = {}, legs = null) => { const u = upd(o); x.prime[KP].tiers[0] = legs ? { ...tier('safe', 2, legs), updated: u } : { ...why('safe'), updated: u }; x.prime[KP].updates = [...(x.prime[KP].updates || []), { tier: 'safe', ...u }]; };
  /* a set of this test's own, new and still to lock (the made-up week's own may be locked by now) */
  const kNew = primeFwd(now + 3 * H, now + 10 * DAY), gU = { id: 'XX_PRIME_U', a: 'AAA', h: 'BBB' };
  const U = { ...prime(gU, kNew, four(tier('safe', 2, [teamLeg(gU, 'BBB', 'ml', 0, -150), plLeg('XX-U1', gU, 'BBB', 'receptions', 3.5, 'over', true, -120)]))), taken_at: runAt };
  const addU = (x, o = {}) => { const e = { ...clone(U), ...o }; x.prime[pkey(e)] = e; return e; };
  t('the ledger as it is', () => {}, null);
  t('a locked level changed', x => { x.prime[KP].tiers[0].floor += 0.01; }, /changed with no player ruled out/);
  t('a locked set gone', x => { delete x.prime[KP]; }, /a set locked at .* is gone/);
  t('a locked set\'s time taken moved', x => { x.prime[KP].taken_at = iso(tB - H); }, /locked at .*changed \(taken_at\)/);
  t('a locked set\'s levels reordered', x => { x.prime[KP].tiers.reverse(); }, /its levels changed|its levels are not the four/);
  t('a level replaced by this run for a player it held', x => replace(x), null, held);
  t('a level replaced by this run with a parlay of its own game', x => replace(x, {}, [teamLeg(gP, gP.a, 'ml', 0, 130), plLeg('XX-NEW', gP, gP.a, 'receptions', 2.5, 'over', true, -110)]), null, held);
  t('a level replaced for a player it did not hold', x => replace(x, { pid: 'XX-OTHER' }), /who was not on the level as it was locked/, held);
  t('a level replaced, not by this run', x => replace(x, { at: iso(now - 60e3) }), /not this run's/, held);
  t('a level replaced at kickoff', x => replace(x, { at: x.prime[KP].kickoff }), /not between its lock and its kickoff/, held);
  t('a level replaced and still holding him', x => replace(x, {}, [teamLeg(gP, gP.a, 'ml', 0, 130), RULED]), /still holds him/, held);
  t('a level replaced twice by one run', x => { replace(x); replace(x, { reason: 'Inactive' }); }, /more than once/, held);
  t('a replacement recorded for a level that did not change', x => { x.prime[KP].updates = [{ tier: 'med', ...upd() }]; }, /did not change|not the last one recorded/);
  t('a replacement\'s record rewritten', x => { x.prime[KP].updates = []; }, /record of replacements rewritten/, p => { held(p); replace(p, { at: iso(lockP + 10 * 60e3) }); });
  t('a level\'s mark not the last replacement recorded', x => { x.prime[KP].tiers[0].updated.reason = 'Doubtful'; }, /not the last one recorded/, p => { held(p); replace(p, { at: iso(lockP + 10 * 60e3) }); });
  t('a replacement after the lock made by an earlier run, kept', () => {}, null, p => { held(p); replace(p, { at: iso(lockP + 10 * 60e3) }); });
  t('a set taken after its lock', x => { const e = clone(x.prime[KP]); e.gid = 'XX_LATE'; e.taken_at = runAt; for (const tt of e.tiers) for (const l of tt.legs || []) l.gid = 'XX_LATE'; x.prime[pkey(e)] = e; }, /not taken by this run before its lock/);
  t('a set new and still to lock, by this run', x => addU(x), null);
  t('a set still to lock, changed not by this run', x => addU(x, { taken_at: iso(now - H) }), /not taken by this run before its lock/);
  t('a set still to lock, graded', x => { addU(x).grade = {}; }, /graded before its kickoff/);
  t('a set taken at its lock', x => { addU(x, { taken_at: iso(kNew - LOCK) }); }, /at or after its lock/);
  t('a set keyed on another week', x => { const e = clone(U); x.prime[`${season}|${pad(W + 9)}|${e.kickoff}|${e.gid}`] = e; }, /not keyed on its own/);
  t('a set locking at another time', x => { addU(x, { lock: iso(kNew - H) }); }, /not 2 hours before its kickoff/);
  t('a set on a Saturday night', x => { const sat = satNight(now + 3 * H), e = { ...clone(U), kickoff: iso(sat), lock: iso(sat - LOCK), taken_at: runAt }; x.prime[pkey(e)] = e; }, /not a Thursday, Sunday or Monday/);
  t('a leg on another game', x => { const e = addU(x); e.tiers[0].legs[0].gid = gP.id; }, /a leg on another game/);
  t('a level short of legs', x => { const e = addU(x); e.tiers[0].legs.pop(); }, /legs on a level of 2/);
  t('a set graded on legs it does not follow', x => { x.prime[KP].grade = { safe: { result: 'won', legs: ['loss', 'win'], payout: 3 } }; }, /graded before its kickoff|graded won|a grade for a level with no parlay/);
  t('an old frozen entry changed', x => { x.entries[oldKey(LXk)].tiers[0].p += 0.01; }, /frozen at its kickoff.*changed \(tiers\)/);
  t('an old frozen entry gone', x => { delete x.entries[oldKey(LXk)]; }, /is gone/);
  t('an old frozen entry\'s grade that does not follow its legs', x => { x.entries[oldKey(LXk)].grade.safe = { result: 'won', legs: ['loss', 'win'], payout: 3 }; }, /graded won/);
  t('an old entry new and not this run\'s', x => { const e = clone(x.entries[oldKey(LXk)]); delete e.grade; e.kickoff = iso(now + DAY); e.taken_at = iso(now - H); x.entries[oldKey(now + DAY)] = e; }, /not taken by this run before its kickoff/);
  t('a summary that is not the entries\'', x => { x.summary = SL.summarize(x.entries); x.prime_summary = SL.summarizePrime(x.prime); x.summary.tiers.safe.won += 1; }, /summary does not follow/);
  t('a prime-time summary that is not the sets\'', x => { x.summary = SL.summarize(x.entries); x.prime_summary = SL.summarizePrime(x.prime); x.prime_summary.pending += 1; }, /prime-time summary does not follow/);
  /* (app v118) the Elo picks and the Sunday slot, on sets of this test's own */
  const eloT = (id, legs) => ({ ...tier(id.replace(/^elo-/, ''), legs.length, legs.map(l => ({ ...l, pe: 0.55, thin: null, market: null }))), id });
  const eloWhy = id => ({ ...why(id.replace(/^elo-/, '')), id });
  const fourE = (...ts) => SL.ELO_TIERS.map(id => ts.find(x => x.id === id) || eloWhy(id));
  const UE = () => ({ ...clone(U), elo: fourE(eloT('elo-safe', [plLeg('XX-E1', gU, 'BBB', 'receiving_yards', 50.5, 'over', true, -110), plLeg('XX-E2', gU, 'AAA', 'rushing_yards', 40.5, 'over', true, 120)])) });
  const addUE = (x, f) => { const e = UE(); if (f) f(e); x.prime[pkey(e)] = e; return e; };
  t('a set new with its Elo picks, by this run', x => addUE(x), null);
  t('a set\'s Elo picks not the four', x => addUE(x, e => { e.elo = e.elo.slice(1); }), /Elo picks are not the four/);
  t('an Elo pick\'s leg with no Elo chance', x => addUE(x, e => { delete e.elo[0].legs[0].pe; }), /with no Elo chance/);
  t('an Elo pick\'s leg on another game', x => addUE(x, e => { e.elo[0].legs[0].gid = gP.id; }), /a leg on another game/);
  t('an Elo pick short of legs', x => addUE(x, e => { e.elo[0].legs.pop(); }), /legs on a level of 2/);
  t('Elo picks added to a locked set', x => { x.prime[KP].elo = fourE(); }, /its levels changed/, p => { delete p.prime[KP].elo; });
  t('a locked set\'s Elo pick changed with no player ruled out', x => { x.prime[KP].elo[0].floor = 0.4; }, /changed with no player ruled out/, p => { p.prime[KP].elo = fourE(eloT('elo-safe', [plLeg('XX-E1', gP, gP.h, 'receiving_yards', 50.5, 'over', true, -110), plLeg('XX-E3', gP, gP.a, 'receiving_yards', 30.5, 'over', true, -110)])); });
  t('a locked set\'s Elo pick replaced by this run for a player it held', x => { const u = upd({ pid: 'XX-E1', name: 'E1' }); x.prime[KP].elo[0] = { ...eloWhy('elo-safe'), updated: u }; x.prime[KP].updates = [...(x.prime[KP].updates || []), { tier: 'elo-safe', ...u }]; }, null,
    p => { p.prime[KP].elo = fourE(eloT('elo-safe', [plLeg('XX-E1', gP, gP.h, 'receiving_yards', 50.5, 'over', true, -110), plLeg('XX-E3', gP, gP.a, 'receiving_yards', 30.5, 'over', true, -110)])); });
  /* a Sunday slot of this test's own, new and still to lock: the Sunday after now, 1 pm and 4:25 pm, two games */
  const sunAt = (from, h, m) => { for (let tt = Math.ceil(from / (15 * 60e3)) * 15 * 60e3; tt < from + 9 * DAY; tt += 5 * 60e3) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(tt)).map(x => [x.type, x.value]));
    if (p.weekday === 'Sun' && +p.hour === h && +p.minute === m) return tt; } return null; };
  const sk = sunAt(now + 3 * H, 13, 0), wk = W + 1, sid = `${season}_${pad(wk)}_SUN`, sg = [`${season}_${pad(wk)}_AAA_BBB`, `${season}_${pad(wk)}_CCC_DDD`];
  const gS1 = { id: sg[0], a: 'AAA', h: 'BBB' }, gS2 = { id: sg[1], a: 'CCC', h: 'DDD' };
  const SLOT = { season, week: wk, gid: sid, games: sg, kickoff: iso(sk), last: iso(sk + 3.4 * H), lock: iso(sk - LOCK), baked_at: null, pool: { pref: 0, thin: 0, mkt: 0, far: 0 },
    tiers: four(tier('safe', 2, [teamLeg(gS1, 'BBB', 'ml', 0, -150), teamLeg(gS2, 'DDD', 'ml', 0, 120)])), elo: fourE(), taken_at: runAt };
  const addS = (x, f) => { const e = clone(SLOT); if (f) f(e); x.slot = x.slot || {}; x.slot[pkey(e)] = e; return e; };
  t('a Sunday slot new, by this run', x => addS(x), null);
  t('a Sunday slot not the slot of its own week', x => addS(x, e => { e.gid = `${season}_${pad(wk + 1)}_SUN`; }), /not the Sunday slot of its own season and week/);
  t('a Sunday slot on a Sunday night', x => addS(x, e => { const k2 = sunAt(now + 3 * H, 20, 20); e.kickoff = iso(k2); e.lock = iso(k2 - LOCK); }), /not a Sunday before 7 pm Eastern/);
  t('a Sunday slot on a Monday', x => addS(x, e => { const k2 = sk + DAY; e.kickoff = iso(k2); e.lock = iso(k2 - LOCK); }), /not a Sunday before 7 pm Eastern/);
  t('a Sunday slot naming a game of another week', x => addS(x, e => { e.games = [sg[0], `${season}_${pad(wk + 1)}_EEE_FFF`]; }), /its games are not games of its own season and week/);
  t('a Sunday slot with no games', x => addS(x, e => { e.games = []; }), /its games are not games/);
  t('a Sunday slot with a leg on a game not its own', x => addS(x, e => { e.tiers[0].legs[1].gid = `${season}_${pad(wk)}_EEE_FFF`; }), /a leg on another game/);
  t('a Sunday slot taken at its lock', x => addS(x, e => { e.taken_at = e.lock; }), /at or after its lock/);
  t('a Sunday slot changed not by this run', x => addS(x, e => { e.taken_at = iso(now - H); }), /not taken by this run before its lock/);
  t('a Sunday slots\' summary that is not the sets\'', x => { addS(x); x.summary = SL.summarize(x.entries); x.prime_summary = SL.summarizePrime(x.prime); x.slot_summary = SL.summarizePrime(x.slot); x.slot_summary.pending += 1; }, /Sunday slots' summary does not follow/);
  { const LK = sk - LOCK, prevS = clone(base); prevS.slot = { [pkey(SLOT)]: { ...clone(SLOT), taken_at: iso(LK - H) } }; prevS.slot_summary = SL.summarizePrime(prevS.slot);
    const x = clone(prevS); x.slot[pkey(SLOT)].games = [sg[0]];
    chk(SL.primeMoved(x, prevS, LK + 60e3, iso(LK + 60e3), 'slot').some(b => /locked at .*changed \(games\)/.test(b)), 'F: a locked Sunday slot whose games changed was not refused');
    const y = clone(prevS); delete y.slot[pkey(SLOT)];
    chk(SL.primeMoved(y, prevS, LK + 60e3, iso(LK + 60e3), 'slot').some(b => /is gone/.test(b)), 'F: a locked Sunday slot gone was not refused'); }
  /* against the last commit (runAt null): an earlier run's replacement, not yet committed, is not a move */
  { const head = clone(base); held(head); const x = clone(head); replace(x, { at: iso(lockP + 10 * 60e3) });
    chk(!SL.primeMoved(x, head, now, null).length, 'F: an earlier run\'s replacement was read as a locked set moved, against the last commit');
    chk(SL.primeMoved(x, head, now, runAt).some(b => /not this run's/.test(b)), 'F: an earlier run\'s replacement was read as this run\'s, against the file the run started from'); }
}

/* G: the real ledger, copied, on the real payload at the real clock: only facts that hold at any hour */
{ const realText = fs.readFileSync(path.join(ROOT, SL.LEDGER_REL), 'utf8'), realL = JSON.parse(realText);
  const copy = path.join(DIR, 'real_prev.json'); fs.writeFileSync(copy, realText); fs.writeFileSync(LEDGER, realText);
  const realPay = path.join(ROOT, 'props', 'data', 'payload.json');
  const rr = cp.spawnSync('node', [SCRIPT], { encoding: 'utf8', env: { ...process.env, SUGGEST_PAYLOAD: realPay, SUGGEST_LEDGER: LEDGER, SUGGEST_PREV: copy } });
  const outG = (rr.stdout || '') + (rr.stderr || ''), now = Date.now();
  chk(rr.status === 0 && /^suggest ledger: (written|unchanged)/m.test(outG), 'G: the real ledger on the real payload was refused: ' + outG.slice(-500));
  const after = bytes(), A2 = JSON.parse(after);
  chk(A2.since === realL.since && A2.prime_since === (realL.prime_since || SL.PRIME_SINCE) && A2.prime && typeof A2.prime === 'object', 'G: since or prime_since moved, or no prime map');
  for (const [k, e] of Object.entries(realL.entries || {})) {
    if (Date.parse(e.kickoff) > now - 60e3) continue;
    chk(!!A2.entries[k] && block(after, 'entries', k) === block(realText, 'entries', k), `G: the real frozen entry ${k} is not the same to the byte but its grade`);
  }
  for (const map of ['prime', 'slot']) for (const [k, e] of Object.entries(realL[map] || {})) {
    if (Date.parse(e.lock) > now - 60e3) continue;
    const strip = x => { const { grade, tiers, elo, updates, ...c } = x || {}; return SL.canon(c); };
    chk(!!A2[map][k] && strip(A2[map][k]) === strip(e), `G: the real locked set ${k} moved`);
  }
  /* the backtest beside it (suggest_backtest.js, by hand): held to its rules, the record's guard on each entry */
  { const BT = path.join(ROOT, 'props', 'data', 'suggest_backtest.json');
    if (fs.existsSync(BT)) { const bad = require('./suggest_backtest.js').checkFile(JSON.parse(fs.readFileSync(BT, 'utf8')), now, realL);
      chk(!bad.length, 'G: the real backtest does not hold to its rules: ' + bad.slice(0, 4).join('; ')); } }
}

console.log(`week ${W} made up (${games.length} games, prime-time sets ${primesA.length}; gP ${gP.id}); ${graded} levels graded and ${pend} pending at D`);
end();
