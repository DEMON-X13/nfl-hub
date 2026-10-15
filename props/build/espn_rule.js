/* A price from DraftKings' line read on ESPN, worked here on its own, apart from the page (app v107).

   The page's Refresh odds button (props/build/part3.js, espnRefresh) reads DraftKings' lines from ESPN's
   free feed in the browser, on a press, into ESPN_LIVE[week][gid] = {at, lines, rungs, td}, and prices a
   player leg from its line (part2.js, DK_EST and estPrice; part3.js, espnPrice), marked est. This file
   is the checks' own working of the same thing, for props/build/audit.js and nflbets/build/smoke.js to
   hold the reader and every such price the page offers to: its own reading of ESPN's answers (TYPES,
   parse, oddsOf: which item is which market, the twins, the milestones, the touchdown list, the game
   lines by club), its own copy of the formula's constants (the research's est_price.js, fitted on
   DraftKings' own prices, 2026 weeks 2-3 and the DET at BUF ladders of week 2) and its own reading of a
   game's read (which line, which rungs DraftKings lists, who it offers a touchdown, whether a club's
   lines are complete, whether the read came before kickoff). Only the inputs the spec names as the
   page's own are read from the page: the read itself (ESPN_LIVE, held to parse by the audit), the
   model's raw projections (project), the game's implied points (gameCtx) and the depth chart (depthOf).
   A real DraftKings price from the paid pull (PAY.mkt, the page's S.odds) wins while its line is still
   DraftKings' line: a main line the read has at another number is the read's (moved, paidStands).

   Which kinds the page may take into a suggestion is also said here, on its own (TESTED): a main line
   on passing, rushing or receiving yards, receptions or passing touchdowns, the anytime touchdown, and
   a yards rung DraftKings lists; every other priced leg is shown and never suggested.

   Change a constant here only with the formula itself, and the page's copy with it: the audit fails
   every price that moves on one side alone. */
'use strict';
/* the formula's constants, as fitted (the page's DK_EST says the same in its own words) */
const K = {
  m: { yards: 0.0566, rec: 0.0599, ptd: 0.0590, count: 0.0599 },
  hold: { rec: [1 / 3, 2 / 3], ptd: [0.31, 0.69], count: [0.31, 0.69] },
  floor05: 0.55,
  rec: [-0.8043, 0.9832, 0.5807, -0.3849, -1.5382, 0.1087, 0.3277],
  recNoModel: [-1.6857, 0.9139, -1.2604, 0.1956, 0.5013],
  recNoYds: [-0.0014, 0.3610, -0.3505, -0.0211, 0.0289],
  ptd: [-2.1748, 0.08940, 0.6796, -1.0848, 0.4490],
  ptdNoYds: [-0.8108, 0.11039, -1.2846],
  recLine: { '0.5': 0.650, '1.5': 0.476, '2.5': 0.501, '3.5': 0.480, '4.5': 0.485 }, recLineElse: 0.488,
  ptdLine: { '0.5': 0.627, '1.5': 0.432, '2.5': 0.356 }, ptdLineElse: 0.464,
  lam: 0.565, sd: 3.50, rungHold: 0.129, shortest: -1000, longest: 2000,
  td: { a: -3.5915, b: 0.2459, yd: { QB: 0.8897, RB: 0.8807, WR: 0.7962, TE: 0.8213 }, pts: 0.8324, a0: -1.1839, b0: 0.7768, a1: 0.5961, b1: 1.4369 },
  tdVig: 1.0566, completeHours: 36, completeRec: 4,
};
const YARDS = ['passing_yards', 'rushing_yards', 'receiving_yards', 'scrim_yards'];
const TESTED = { main: ['passing_yards', 'rushing_yards', 'receiving_yards', 'receptions', 'passing_tds'], rung: ['passing_yards', 'rushing_yards', 'receiving_yards'] };
const finite = v => v != null && isFinite(v);
/* ESPN's type ids, the checks' own copy: main lines, milestones (k means k+), the anytime touchdown */
const TYPES = {
  main: { 8: 'passing_yards', 9: 'completions', 10: 'passing_tds', 11: 'carries', 12: 'rushing_yards', 13: 'receiving_yards', 14: 'receptions',
    15: 'passing_interceptions', 16: 'attempts', 20: 'scrim_yards', 22: 'kick_pts', 24: 'fg_made' },
  mile: { 194: 'passing_yards', 207: 'completions', 198: 'passing_tds', 201: 'carries', 196: 'rushing_yards', 195: 'receiving_yards', 202: 'receptions',
    199: 'passing_interceptions', 200: 'attempts', 197: 'scrim_yards', 203: 'kick_pts', 205: 'fg_made' },
  td: '31',
};
const AB = { WSH: 'WAS', LAR: 'LA', JAC: 'JAX' };
const club = a => { const u = String(a || '').toUpperCase(); return AB[u] || u; };
/* one event's items, read on their own: {aid: {lines: {stat: L}, rungs: {stat: [k...] ascending}, td}};
   a main line's twins (its Over and Under) are one line, two different lines for one player and stat
   are no line, an item of any other market, or with no athlete, is not read */
function parse(items) {
  const per = {}, bad = new Set();
  for (const it of items || []) {
    const tid = String(((it || {}).type || {}).id || ''), m = /\/athletes\/(\d+)/.exec(String(((it || {}).athlete || {}).$ref || ''));
    const kind = TYPES.main[tid] ? 'main' : TYPES.mile[tid] ? 'rung' : tid === TYPES.td ? 'td' : null;
    if (!kind || !m) continue;
    const a = per[m[1]] || (per[m[1]] = { lines: {}, rungs: {}, td: false });
    if (kind === 'td') { a.td = true; continue; }
    const v = Number(((it.current || {}).target || {}).value);
    if (!(v > 0)) continue;
    if (kind === 'rung') { const st = TYPES.mile[tid]; a.rungs[st] = [...new Set([...(a.rungs[st] || []), v])].sort((x, y) => x - y); continue; }
    const st = TYPES.main[tid];
    if (st in a.lines && a.lines[st] !== v) bad.add(m[1] + '|' + st);
    a.lines[st] = v;
  }
  for (const k of bad) { const [aid, st] = k.split('|'); delete per[aid].lines[st]; }
  return per;
}
/* the read a game's page keeps, from parse and the ids placed on players ({aid: pid}): the first ESPN
   id (by number) a player has */
function block(per, placed) {
  const b = { lines: {}, rungs: {}, td: [] }, seen = new Set();
  for (const aid of Object.keys(placed).sort((x, y) => x - y)) { const pid = placed[aid], a = per[aid]; if (!a || seen.has(pid)) continue; seen.add(pid);
    if (Object.keys(a.lines).length) b.lines[pid] = { ...a.lines };
    if (Object.keys(a.rungs).length) b.rungs[pid] = JSON.parse(JSON.stringify(a.rungs));
    if (a.td) b.td.push(pid); }
  b.td.sort(); return b;
}
/* DraftKings' game lines on a scoreboard event, read on their own, for the game {a, h} by club (never by
   home and away): the moneylines, sp as the schedule writes it (positive when its home club is
   favoured), the prices, the total, and the outcome ids keyed as the payload's dk is; null with no
   DraftKings odds or other clubs */
function oddsOf(ev, g) {
  let c, o;
  try { c = ev.competitions[0]; o = (c.odds || []).find(x => String(((x || {}).provider || {}).id) === '100'); } catch (e) { return null; }
  if (!o) return null;
  const side = {}; for (const x of c.competitors || []) side[x.homeAway] = club(((x || {}).team || {}).abbreviation);
  if ([side.home, side.away].sort().join() !== [g.a, g.h].sort().join()) return null;
  const am = s => { const t = String(s == null ? '' : s).trim().toUpperCase(); return t === 'EVEN' ? 100 : (/^[+-]?\d+$/.test(t) && Math.abs(+t) >= 100 ? +t : null); };
  const ln = s => { const t = String(s == null ? '' : s).trim().toLowerCase().replace(/^[ou]/, ''); return t === 'pk' ? 0 : (/^[+-]?\d+(\.\d+)?$/.test(t) ? +t : null); };
  const id = cl => { try { const u = new URL(String(cl.link.href)), v = new URL(u.searchParams.get('preurl') || u.href); return { oc: v.searchParams.get('outcomes') || null, ev: (/\/event\/(\d+)/.exec(v.pathname) || [])[1] || null }; } catch (e) { return {}; } };
  const lines = {}, ids = {}, evs = new Set(), take = cl => { const r = id(cl); if (r.ev) evs.add(r.ev); return r.oc; };
  for (const s of ['home', 'away']) { const team = side[s], away = team === g.a, ml = ((o.moneyline || {})[s] || {}).close || {}, sp = ((o.pointSpread || {})[s] || {}).close || {};
    if (am(ml.odds) != null) { lines[away ? 'mla' : 'mlh'] = am(ml.odds); const k = take(ml); if (k) ids[`team:${team}|ml`] = k; }
    if (ln(sp.line) != null) { const L = ln(sp.line); lines.sp = away ? L : (L === 0 ? 0 : -L); if (am(sp.odds) != null) lines[away ? 'spa' : 'sph'] = am(sp.odds);
      const k = take(sp); if (k) ids[`team:${team}|ats|${String(L)}`] = k; } }
  for (const s of ['over', 'under']) { const t = ((o.total || {})[s] || {}).close || {}, L = ln(t.line);
    if (L != null) { lines.tot = L; if (am(t.odds) != null) lines[s === 'over' ? 'tov' : 'tou'] = am(t.odds); const k = take(t); if (k) ids[`game|total|${s}|${String(L)}`] = k; } }
  take(o);
  return { lines, ids, event: evs.size === 1 ? [...evs][0] : null };
}
const logistic = z => 1 / (1 + Math.exp(-z));
const logit = p => Math.log(p / (1 - p));
const american = q => q >= 0.5 ? -Math.round(100 * q / (1 - q)) : Math.round(100 * (1 - q) / q);
const implied = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100);

/* a main line's fair chance of the over and its margin: {p, m} */
function mainFair(o) {
  const L = +o.line; if (!finite(L)) return null;
  const held = (p, [lo, hi]) => Math.min(hi, Math.max(L === 0.5 ? Math.max(lo, K.floor05) : lo, p));
  const te = o.grp === 'TE' ? 1 : 0, rb = o.grp === 'RB' ? 1 : 0, ln = Math.log;
  if (YARDS.includes(o.stat)) return { p: 0.5, m: K.m.yards };
  if (['completions', 'attempts', 'carries', 'kick_pts'].includes(o.stat)) return { p: 0.5, m: K.m.count };
  if (o.stat === 'receptions') {
    const Y = o.recYdsLine, y = finite(Y) && Y > 0, mr = finite(o.muRec) && o.muRec > 0, my = finite(o.muRecYds) && o.muRecYds > 0;
    let z = null;
    if (y && mr && my) z = K.rec[0] + K.rec[1] * ln(Y) + K.rec[2] * ln(o.muRec) + K.rec[3] * ln(o.muRecYds) + K.rec[4] * ln(L + 0.5) + K.rec[5] * te + K.rec[6] * rb;
    else if (y) z = K.recNoModel[0] + K.recNoModel[1] * ln(Y) + K.recNoModel[2] * ln(L + 0.5) + K.recNoModel[3] * te + K.recNoModel[4] * rb;
    else if (mr) z = K.recNoYds[0] + K.recNoYds[1] * ln(o.muRec) + K.recNoYds[2] * ln(L + 0.5) + K.recNoYds[3] * te + K.recNoYds[4] * rb;
    if (z == null) return { p: K.recLine[String(L)] != null ? K.recLine[String(L)] : K.recLineElse, m: K.m.rec };
    return { p: held(logistic(z), K.hold.rec), m: K.m.rec };
  }
  if (o.stat === 'passing_tds') {
    const T = o.teamImplied;
    if (finite(T) && finite(o.passYdsLine)) return { p: held(logistic(K.ptd[0] + K.ptd[1] * T + K.ptd[2] * o.passYdsLine / 100 + K.ptd[3] * L + K.ptd[4] * (L === 0.5 ? 1 : 0)), K.hold.ptd), m: K.m.ptd };
    if (finite(T)) return { p: held(logistic(K.ptdNoYds[0] + K.ptdNoYds[1] * T + K.ptdNoYds[2] * L), K.hold.ptd), m: K.m.ptd };
    return { p: K.ptdLine[String(L)] != null ? K.ptdLine[String(L)] : K.ptdLineElse, m: K.m.ptd };
  }
  if (o.stat === 'passing_interceptions' || o.stat === 'fg_made') {
    if (!(finite(o.mu) && o.mu > 0)) return { p: 0.5, m: K.m.count };
    let below = 0, term = Math.exp(-o.mu);
    for (let n = 0; n <= Math.floor(L); n++) { below += term; term *= o.mu / (n + 1); }
    return { p: held(1 - below, K.hold.count), m: K.m.count };
  }
  return null;
}
const sidePrice = (f, side) => american((side === 'under' ? 1 - f.p : f.p) * (1 + f.m));
/* the normal curve by the error function's series the formula was fitted with (Abramowitz and Stegun
   7.1.26), so a price never turns on a different rounding of the same chance */
function normal(z) { const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2; }
function normalInv(p) { let lo = -9, hi = 9; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (normal(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
/* a k+ rung's fair chance: yards a power curve about the line (its fair chance f at the line), a count
   the Poisson whose chance of the line's over is f */
function rungFair(stat, L, k, f) {
  f = f > 0 && f < 1 ? f : 0.5; let p;
  if (YARDS.includes(stat)) { const pw = v => Math.pow(Math.max(v, 0), K.lam);
    p = 1 - normal((pw(k - 0.5) - pw(L)) / K.sd + (f === 0.5 ? 0 : normalInv(1 - f))); }
  else {
    const atLeast = (mean, n) => { let s = 0, t = Math.exp(-mean); for (let i = 0; i < n; i++) { s += t; t *= mean / (i + 1); } return Math.max(1e-9, 1 - s); };
    const n0 = Math.floor(L) + 1; let lo = 0.01, hi = 40;
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (atLeast(mid, n0) < f) lo = mid; else hi = mid; }
    p = atLeast((lo + hi) / 2, Math.ceil(k - 1e-9)); }
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}
function rungPrice(p) { const a = american(logistic(logit(p) + K.rungHold)); return a < 0 ? Math.max(a, K.shortest) : Math.min(a, K.longest); }
function tdPrice(o) {
  if (!(o.p > 0 && o.p < 1)) return null;
  const c = K.td, lines = (o.grp === 'QB' ? [o.rushLine] : o.grp === 'RB' ? [o.rushLine, o.recLine] : [o.recLine]).filter(finite);
  let z;
  if (lines.length && c.yd[o.grp] != null) z = c.a + c.b * logit(o.p) + c.yd[o.grp] * Math.log(Math.max(0.5, lines.reduce((s, v) => s + v, 0)))
    + c.pts * Math.log(Math.min(40, Math.max(10, finite(o.teamImplied) ? o.teamImplied : 22)) / 22);
  else if (o.complete && !o.starter) z = c.a0 + c.b0 * logit(o.p);
  else z = c.a1 + c.b1 * logit(o.p);
  return american(Math.min(1000 / 1100, Math.max(100 / 2100, logistic(z))));
}

/* the rule on a page booted in a window: w is that window (its globals the page's) */
function make(w) {
  const F = n => w.eval(n);
  const PAY = () => F('PAY'), S = () => F('S'), LIVE = () => F('ESPN_LIVE');
  const game = gid => (S().sched || []).find(g => g.id === gid) || null;
  /* a game's read: null with none, a shape the reader does not write, or a read at or after kickoff */
  function entry(gid, week) {
    const W = LIVE()[String(week)], e = W && W[gid], g = game(gid);
    if (!e || typeof e !== 'object' || !e.lines || typeof e.lines !== 'object' || Array.isArray(e.lines) || !g) return null;
    const k = F('kickoff')(g), at = Date.parse(e.at);
    return k && isFinite(at) && at < k.getTime() ? e : null;
  }
  const line = (e, pid, stat) => { const v = e && e.lines[pid] && e.lines[pid][stat]; return typeof v === 'number' && isFinite(v) && v > 0 ? v : null; };
  const teamOf = pid => { const p = S().players[pid]; if (p && p.team) return p.team; const r = PAY().roster && PAY().roster[pid]; return (r && r[0]) || null; };
  function complete(e, g, team) {
    const k = F('kickoff')(g), at = Date.parse(e.at); if (!k || !isFinite(at) || k.getTime() - at > K.completeHours * 3600e3) return false;
    return Object.keys(e.lines).filter(pid => teamOf(pid) === team && line(e, pid, 'receiving_yards') != null).length >= K.completeRec;
  }
  function starter(pl, team) { const d = F('depthOf')(pl), top = { QB: 1, RB: 1, WR: 2, TE: 1 }[pl.grp]; return !!(d && top && d.team === team && d.pos === pl.grp && d.rank <= top); }
  /* the week's typical overround on its two-sided real player lines, for a touchdown's fair chance */
  function playerVig(week) { const M = (PAY().mkt || {})[String(week)] || {}, a = [];
    for (const pid in M) for (const st in M[pid]) { const L = M[pid][st]; if (L && finite(L.over) && L.over !== 0 && finite(L.under) && L.under !== 0) a.push(implied(L.over) + implied(L.under)); }
    if (!a.length) return K.tdVig; a.sort((x, y) => x - y); const h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; }
  /* the read's main line for a leg's player and stat, or null */
  const readLine = l => line(entry(l.gid, l.week), l.pid, l.stat);
  /* a main line of the paid pull's still DraftKings' line: the read has the same number, or none for him */
  function paidStands(l) { const L = (((PAY().mkt || {})[String(l.week)] || {})[l.pid] || {})[l.stat], E = readLine(l);
    return !!L && (E == null || E === +L.line); }
  /* the paid pull's own price for a leg on its own line (a main line at l.k), where there is one */
  function real(l) {
    if (l.main) { const L = (((PAY().mkt || {})[String(l.week)] || {})[l.pid] || {})[l.stat];
      return L && (l.k == null || +L.line === +l.k) ? { line: +L.line, price: l.side === 'under' ? L.under : L.over } : null; }
    const v = ((((S().odds || {})[l.gid] || {})[l.pid] || {})[l.stat] || {})[String(l.stat === 'any_td' ? (+l.k || 1) : l.k)];
    return v != null && isFinite(v) ? { price: v } : null;
  }
  /* the price DraftKings' line read on ESPN gives a player's leg {gid, week, pid, stat, k, side, main,
     team, opp}, by the formula: {price, fair, kind, tested, listed, line}, or null where ESPN has no
     line for it (a leg with a real price included: whether that wins is the caller's to hold) */
  function price(l) {
    const g = game(l.gid), e = g && entry(l.gid, l.week), pl = S().players[l.pid];
    if (!e || !pl) return null;
    const team = l.team || pl.team, opp = l.opp || (g.h === team ? g.a : g.h), ctx = F('gameCtx')(g, team);
    const mu = s => { const r = F('project')(pl, s, opp, ctx); return r && finite(r.mu) ? r.mu : null; };
    const T = ctx && finite(ctx.implied) ? ctx.implied : null;
    if (l.stat === 'any_td') {
      if ((+l.k || 1) !== 1 || !Array.isArray(e.td) || !e.td.includes(l.pid)) return null;
      const r = F('project')(pl, 'any_td', opp, ctx), a = tdPrice({ p: r && r.p, grp: pl.grp, rushLine: line(e, l.pid, 'rushing_yards'), recLine: line(e, l.pid, 'receiving_yards'),
        teamImplied: T, complete: complete(e, g, team), starter: starter(pl, team) });
      if (a == null) return null;
      return { price: a, fair: Math.max(0.001, Math.min(0.999, implied(a) / playerVig(l.week))), kind: 'td', tested: true, listed: true, line: null };
    }
    const L = line(e, l.pid, l.stat); if (L == null) return null;
    const inputs = { stat: l.stat, line: L, grp: pl.grp, recYdsLine: line(e, l.pid, 'receiving_yards'), passYdsLine: line(e, l.pid, 'passing_yards'), teamImplied: T };
    if (l.stat === 'receptions') { inputs.muRec = mu('receptions'); inputs.muRecYds = mu('receiving_yards'); }
    if (l.stat === 'passing_interceptions' || l.stat === 'fg_made') inputs.mu = mu(l.stat);
    const f = mainFair(inputs); if (!f) return null;
    if (l.main) return { price: sidePrice(f, l.side), fair: l.side === 'under' ? 1 - f.p : f.p, kind: 'main', tested: TESTED.main.includes(l.stat), listed: true, line: L };
    const k = +l.k;
    if (Math.abs(k - 0.5 - L) < 1e-9) return { price: sidePrice(f, 'over'), fair: f.p, kind: 'rung', tested: TESTED.main.includes(l.stat), listed: true, line: L, mainOver: true };
    let anchor = YARDS.includes(l.stat) ? 0.5 : f.p;
    if (!YARDS.includes(l.stat)) { const M = (((PAY().mkt || {})[String(l.week)] || {})[l.pid] || {})[l.stat];
      if (M && +M.line === L && finite(M.over) && M.over !== 0 && finite(M.under) && M.under !== 0) anchor = implied(M.over) / (implied(M.over) + implied(M.under)); }
    const p = rungFair(l.stat, L, k, anchor), r = e.rungs && e.rungs[l.pid] && e.rungs[l.pid][l.stat];
    return { price: rungPrice(p), fair: p, kind: 'rung', tested: TESTED.rung.includes(l.stat), listed: Array.isArray(r) && r.some(v => +v === k), line: L, mainOver: false };
  }
  /* a leg the page may take into a suggestion when it is priced from ESPN's read */
  const takeable = d => !!d && d.tested && d.listed && !d.mainOver;
  return { entry, line, readLine, paidStands, real, price, takeable, complete, starter, playerVig };
}
module.exports = { K, TESTED, TYPES, parse, block, oddsOf, make, mainFair, sidePrice, rungFair, rungPrice, tdPrice, implied, american };
