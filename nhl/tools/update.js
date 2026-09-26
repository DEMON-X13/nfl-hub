/* The NHL job: read this season from ESPN, rate every club, call every game, freeze the call
   and the lines before puck drop, grade what has finished, simulate the playoff picture and
   write nhl/state.json, which is everything the page shows.

    node nhl/tools/update.js              the season, from ESPN
    node nhl/tools/update.js --offline    from the scoreboard files a previous run saved in nhl/tools/out/

   Free: ESPN's public feeds only, nothing spends a credit. One request per day from the
   season's start to the end of June, skipping the days the last state already has complete,
   so the whole schedule is known and a run in season is a couple of hundred small requests. Idempotent: a call or a line made before puck drop is kept once
   the game has started, so the record grades what the page actually showed; games that were
   already over when this job first ran are graded from the replay and marked so.

   The model is nhl/tools/elo.js with the parameters fit.js wrote to nhl/data/model.json,
   replayed over nhl/data/history.json and then this season's finished games, in date order. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const { Elo, expected, spreadOf, goals, coverProbs, totalProbs } = require('./elo');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data'), OUT = path.join(__dirname, 'out');
const STATE = path.join(ROOT, 'state.json');
const ARGS = new Set(process.argv.slice(2));
const TODAY = E.etDate(new Date());
const SEASON = +(process.env.NHL_SEASON || E.seasonOf(TODAY));
const EDGE = 0.05;                                  // the model's chance must beat the book's implied by this to take a side
const SIMS = 2000;
const SHRINK = 20;                                  // games before a club's own scoring rate outweighs the league's

const log = m => console.log(new Date().toISOString().slice(11, 19), m);
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const implied = am => am === null || am === undefined ? null : (am > 0 ? 100 / (am + 100) : -am / (-am + 100));
const r3 = x => +x.toFixed(3);

/* ---------- the season, from ESPN ---------- */
async function pullSeason(prev) {
  fs.mkdirSync(OUT, { recursive: true });
  const teams = JSON.parse(fs.readFileSync(path.join(DATA, 'teams.json'), 'utf8'));
  const games = new Map();
  const complete = new Set();
  if (prev && prev.season === SEASON) {
    const byDate = {};
    for (const g of prev.games) { (byDate[g.date] = byDate[g.date] || []).push(g); games.set(g.id, g); }
    for (const [d, rs] of Object.entries(byDate)) if (d < TODAY && rs.every(r => r.state === 'final')) complete.add(d);
  }
  const days = [];
  /* every day of the season, so the whole schedule is known and the playoff picture is the rest
     of the season and not the next fortnight; a day already complete is not asked for again */
  for (let d = `${SEASON - 1}-10-01`, to = `${SEASON}-06-30`; d <= to; d = addDays(d, 1)) if (!complete.has(d)) days.push(d);
  let asked = 0, ok = 0;
  for (let i = 0; i < days.length; i += 4) {
    const batch = await Promise.all(days.slice(i, i + 4).map(async d => {
      const file = path.join(OUT, `sb_${d}.json`);
      if (ARGS.has('--offline')) return [d, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null];
      asked++;
      try { const j = await E.scoreboard(d); fs.writeFileSync(file, JSON.stringify(j)); ok++; return [d, j]; }
      catch (e) { log(`${d}: ${e.message}${fs.existsSync(file) ? ' (using the saved copy)' : ''}`); return [d, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null]; }
    }));
    for (const [d, j] of batch) {
      if (!j) continue;
      E.teamsOf(j, teams.teams);
      /* the day's rows are what the feed says now, so a postponed game leaves its old date */
      for (const [id, g] of games) if (g.date === d) games.delete(id);
      for (const ev of j.events || []) { const g = E.gameRow(ev); if (g && g.season === SEASON && g.type !== 1 && g.date === d) { if (g.type !== 2) g.type = 3; games.set(g.id, g); } }
    }
    if (!ARGS.has('--offline')) await new Promise(r => setTimeout(r, 200));
  }
  if (asked && !ok) throw new Error('ESPN scoreboard unreachable: every day asked for failed');
  log(`${days.length} days read (${complete.size} already complete), ${asked} asked, ${ok} answered`);
  fs.writeFileSync(path.join(DATA, 'teams.json'), JSON.stringify(teams));
  return { games: [...games.values()].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0), teams };
}

function loadHistory() {
  const H = JSON.parse(fs.readFileSync(path.join(DATA, 'history.json'), 'utf8'));
  const col = Object.fromEntries(H.cols.map((c, i) => [c, i]));
  return H.rows.map(r => ({ id: r[col.id], season: r[col.season], type: r[col.type], date: r[col.date], home: r[col.home], away: r[col.away], hs: r[col.hs], as: r[col.as], periods: r[col.periods], neutral: r[col.neutral] }))
    .filter(g => g.season < SEASON).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

/* ---------- scoring rates: each club's goals for and against this season, shrunk to the league ---------- */
class Rates {
  constructor(leagueTotal) { this.half = leagueTotal / 2; this.gf = {}; this.ga = {}; this.n = {}; }
  rate(id, which) { const n = this.n[id] || 0; const own = n ? (which === 'gf' ? this.gf[id] : this.ga[id]) / n : this.half; return (own * n + this.half * SHRINK) / (n + SHRINK); }
  /* the expected total of a game: each side's scoring against the other's conceding */
  total(home, away) { return (this.rate(home, 'gf') + this.rate(away, 'ga')) / 2 + (this.rate(away, 'gf') + this.rate(home, 'ga')) / 2; }
  add(g) { for (const [id, f, a] of [[g.home, g.hs, g.as], [g.away, g.as, g.hs]]) { this.gf[id] = (this.gf[id] || 0) + f; this.ga[id] = (this.ga[id] || 0) + a; this.n[id] = (this.n[id] || 0) + 1; } }
}

/* ---------- standings ---------- */
function standingsOf(games) {
  const S = {};
  for (const id of E.TEAMS) S[id] = { w: 0, l: 0, otl: 0, pts: 0, rw: 0, row: 0, gf: 0, ga: 0, gp: 0 };
  for (const g of games) {
    if (g.state !== 'final' || g.type !== 2 || g.hs === null) continue;
    const hw = g.hs > g.as, past = g.periods > 3;
    const W = S[hw ? g.home : g.away], L = S[hw ? g.away : g.home];
    W.w++; W.pts += 2; if (!past) W.rw++; if (g.periods !== 5) W.row++;
    if (past) { L.otl++; L.pts++; } else L.l++;
    S[g.home].gf += g.hs; S[g.home].ga += g.as; S[g.away].gf += g.as; S[g.away].ga += g.hs; S[g.home].gp++; S[g.away].gp++;
  }
  return S;
}
const order = (ids, S, ratings) => ids.slice().sort((a, b) => S[b].pts - S[a].pts || S[b].rw - S[a].rw || S[b].row - S[a].row || (S[b].gf - S[b].ga) - (S[a].gf - S[a].ga) || ratings[b] - ratings[a]);

/* the sixteen: the top three of each division and two wild cards a conference, seeded the league's way */
function fieldOf(S, ratings) {
  const out = {};
  for (const conf of ['East', 'West']) {
    const divs = [...new Set(E.TEAMS.filter(t => E.CLUBS[t].conf === conf).map(t => E.CLUBS[t].div))];
    const top = {}, rest = [];
    for (const d of divs) { const o = order(E.TEAMS.filter(t => E.CLUBS[t].div === d), S, ratings); top[d] = o.slice(0, 3); rest.push(...o.slice(3)); }
    const wc = order(rest, S, ratings).slice(0, 2);
    const [d1, d2] = divs.slice().sort((a, b) => order([top[a][0], top[b][0]], S, ratings)[0] === top[a][0] ? -1 : 1);
    out[conf] = { divs: { [d1]: top[d1], [d2]: top[d2] }, wild: wc,
      /* four series: the stronger division winner takes the second wild card */
      series: [[top[d1][0], wc[1]], [top[d1][1], top[d1][2]], [top[d2][0], wc[0]], [top[d2][1], top[d2][2]]] };
  }
  return out;
}

/* ---------- the playoff picture: the rest of the season played SIMS times ---------- */
function playoffPicture(games, ratings, model, rates) {
  let seed = 20261007; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const remaining = games.filter(g => g.type === 2 && g.state !== 'final').map(g => {
    const diff = ratings[g.home] - ratings[g.away] + (g.neutral ? 0 : model.params.hfa);
    const G = goals(rates.total(g.home, g.away), spreadOf(diff, model), diff, model.pull);
    return { home: g.home, away: g.away, pHome: expected(diff), tie: G.tie, pOT: G.pOT };
  });
  const base = standingsOf(games);
  const tally = {}; for (const id of E.TEAMS) tally[id] = { playoff: 0, div: 0, conf: 0, cup: 0, pts: 0 };
  const series = (a, b, hfa) => {                      // best of seven, 2-2-1-1-1, a has home ice
    let wa = 0, wb = 0, g = 0;
    while (wa < 4 && wb < 4) { const aHome = [0, 1, 4, 6].includes(g); const d = ratings[a] - ratings[b] + (aHome ? hfa : -hfa); if (rnd() < expected(d)) wa++; else wb++; g++; }
    return wa === 4 ? a : b;
  };
  for (let i = 0; i < SIMS; i++) {
    const S = {}; for (const id of E.TEAMS) S[id] = Object.assign({}, base[id]);
    for (const g of remaining) {
      const r = rnd();
      if (r < g.tie) { const hw = rnd() < g.pOT; const W = S[hw ? g.home : g.away], L = S[hw ? g.away : g.home]; W.w++; W.pts += 2; if (rnd() < 0.55) W.row++; L.otl++; L.pts++; }
      else { const hw = rnd() < g.pHome; const W = S[hw ? g.home : g.away], L = S[hw ? g.away : g.home]; W.w++; W.pts += 2; W.rw++; W.row++; L.l++; }
    }
    const F = fieldOf(S, ratings);
    const finalists = [];
    for (const conf of ['East', 'West']) {
      const f = F[conf];
      for (const d of Object.keys(f.divs)) tally[f.divs[d][0]].div++;
      for (const t of [].concat(...Object.values(f.divs), f.wild)) tally[t].playoff++;
      const seedOf = t => S[t].pts + S[t].rw / 100;
      const r1 = f.series.map(([a, b]) => series(a, b, model.params.hfa));
      const r2 = [[r1[0], r1[1]], [r1[2], r1[3]]].map(([a, b]) => seedOf(a) >= seedOf(b) ? series(a, b, model.params.hfa) : series(b, a, model.params.hfa));
      const cf = seedOf(r2[0]) >= seedOf(r2[1]) ? series(r2[0], r2[1], model.params.hfa) : series(r2[1], r2[0], model.params.hfa);
      tally[cf].conf++; finalists.push(cf);
    }
    const [e, w] = finalists; const seedOf = t => S[t].pts + S[t].rw / 100;
    tally[seedOf(e) >= seedOf(w) ? series(e, w, model.params.hfa) : series(w, e, model.params.hfa)].cup++;
    for (const id of E.TEAMS) tally[id].pts += S[id].pts;
  }
  const odds = {};
  for (const id of E.TEAMS) { const t = tally[id]; odds[id] = { playoff: r3(t.playoff / SIMS), div: r3(t.div / SIMS), conf: r3(t.conf / SIMS), cup: r3(t.cup / SIMS), expPts: +(t.pts / SIMS).toFixed(1) }; }
  /* if the season ended today */
  const now = fieldOf(base, ratings);
  const standings = {};
  for (const div of ['Atlantic', 'Metropolitan', 'Central', 'Pacific']) standings[div] = order(E.TEAMS.filter(t => E.CLUBS[t].div === div), base, ratings).map(t => Object.assign({ team: t }, base[t]));
  return { sims: SIMS, odds, standings, bracket: now, remaining: remaining.length };
}

/* ---------- the run ---------- */
async function main() {
  const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
  const prevGames = new Map(((prev && prev.season === SEASON && prev.games) || []).map(g => [g.id, g]));
  const model = JSON.parse(fs.readFileSync(path.join(DATA, 'model.json'), 'utf8'));
  const { games, teams: T } = await pullSeason(prev);
  log(`${games.length} games this season, ${games.filter(g => g.state === 'final').length} final`);

  /* replay: the history, then this season's finals, keeping each one's pre-game view and the scoring rates before it */
  const m = new Elo(model.params);
  for (const g of loadHistory()) { m.newSeason(g.season); m.play(g); }
  m.newSeason(SEASON);
  const rates = new Rates(model.leagueTotal);
  const replayed = {};
  for (const g of games) if (g.state === 'final' && g.hs !== null) { replayed[g.id] = Object.assign(m.play(g), { xt: rates.total(g.home, g.away) }); rates.add(g); }
  const ratings = m.r;
  for (const id of E.TEAMS) m.rating(id);

  /* the club table: names and logos from the feed, the fixed conference and division, this season's line, the rating and its rank */
  const S = standingsOf(games);
  const teams = {};
  for (const id of E.TEAMS) {
    const t = T.teams[id] || {};
    teams[id] = Object.assign({ abbr: id, name: E.CLUBS[id].name, short: E.CLUBS[id].name.split(' ').pop(), logo: null, color: null }, t, { conf: E.CLUBS[id].conf, div: E.CLUBS[id].div, rating: +ratings[id].toFixed(1) }, S[id],
      { gfRate: +rates.rate(id, 'gf').toFixed(2), gaRate: +rates.rate(id, 'ga').toFixed(2) });
  }
  E.TEAMS.slice().sort((a, b) => teams[b].rating - teams[a].rating).forEach((id, i) => { teams[id].rank = i + 1; });

  /* every game's call and lines: frozen before puck drop, kept after */
  const now = new Date().toISOString().slice(0, 16) + 'Z';
  const out = [];
  for (const g of games) {
    const p = prevGames.get(g.id);
    const row = { id: g.id, type: g.type, date: g.date, start: g.start, state: g.state, detail: g.detail, home: g.home, away: g.away, hs: g.hs, as: g.as, periods: g.periods,
      neutral: g.neutral, note: g.note, venue: g.venue, hrec: g.hrec, arec: g.arec };
    let view;
    if (g.state === 'pre') { const v = m.predict(g); view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, xt: rates.total(g.home, g.away), frozen: now }; }
    /* a call frozen before puck drop keeps its view after */
    else if (p && p.frozen) view = { pHome: p.pHome, diff: p.diff, rh: p.rh, ra: p.ra, xt: p.xt, frozen: p.frozen };
    else if (replayed[g.id]) { const v = replayed[g.id]; view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, xt: v.xt, frozen: null }; }
    else { const v = m.predict(g); view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, xt: rates.total(g.home, g.away), frozen: null }; }   // live with no frozen call: the current view
    const mu = spreadOf(view.diff, model);
    const G = goals(view.xt, mu, view.diff, model.pull);
    Object.assign(row, { pHome: +view.pHome.toFixed(4), rh: +view.rh.toFixed(1), ra: +view.ra.toFixed(1), diff: +view.diff.toFixed(2), mu: +mu.toFixed(2), xt: +view.xt.toFixed(2), tie: r3(G.tie), frozen: view.frozen });
    /* the lines: taken while the game is still to come, kept once it is not */
    let line = null;
    if (g.state === 'pre' && g.odds) line = Object.assign({}, g.odds, { at: now });
    else if (p && p.line) line = p.line;
    row.line = line;
    row.pick = view.pHome >= 0.5 ? 'home' : 'away';
    if (line) {
      /* the moneyline: a side whose chance beats the book's implied by the edge */
      const ih = implied(line.homeML), ia = implied(line.awayML);
      if (ih !== null && ia !== null) { row.mlEdge = { home: r3(view.pHome - ih), away: r3(1 - view.pHome - ia) }; row.mlPick = row.mlEdge.home >= EDGE ? 'home' : row.mlEdge.away >= EDGE ? 'away' : null; }
      if (line.homeLine !== null && line.homeLine !== undefined) {
        const cp = coverProbs(G, line.homeLine);
        row.cover = { home: r3(cp.cover), push: r3(cp.push), away: r3(cp.lose) };
        const jh = implied(line.homeSpreadOdds), ja = implied(line.awaySpreadOdds);
        if (jh !== null && ja !== null) { row.plEdge = { home: r3(cp.cover - jh), away: r3(cp.lose - ja) }; row.plPick = row.plEdge.home >= EDGE ? 'home' : row.plEdge.away >= EDGE ? 'away' : null; }
      }
      if (line.total !== null && line.total !== undefined) {
        const tp = totalProbs(G, line.total);
        row.ou = { over: r3(tp.over), push: r3(tp.push), under: r3(tp.under) };
        const jo = implied(line.overOdds), ju = implied(line.underOdds);
        if (jo !== null && ju !== null) { row.ouEdge = { over: r3(tp.over - jo), under: r3(tp.under - ju) }; row.ouPick = row.ouEdge.over >= EDGE ? 'over' : row.ouEdge.under >= EDGE ? 'under' : null; }
      }
    }
    if (g.state === 'final' && g.hs !== null) {
      const margin = g.hs - g.as, total = g.hs + g.as;
      const res = { su: (margin > 0) === (row.pick === 'home') };
      if (row.mlPick) res.ml = (margin > 0) === (row.mlPick === 'home') ? 'win' : 'loss';
      if (line && line.homeLine !== null && line.homeLine !== undefined) {
        const covered = margin + line.homeLine;
        res.homeCover = covered > 0 ? 'win' : covered < 0 ? 'loss' : 'push';
        if (row.plPick) res.pl = res.homeCover === 'push' ? 'push' : ((res.homeCover === 'win') === (row.plPick === 'home') ? 'win' : 'loss');
      }
      if (line && line.total !== null && line.total !== undefined) {
        res.over = total > line.total ? 'win' : total < line.total ? 'loss' : 'push';
        if (row.ouPick) res.ou = res.over === 'push' ? 'push' : ((res.over === 'win') === (row.ouPick === 'over') ? 'win' : 'loss');
      }
      row.result = res;
    }
    out.push(row);
  }

  /* the record: straight up on every game, and on the moneyline, the puck line and the total where a side was taken */
  const fresh = () => ({ su: { w: 0, l: 0 }, ml: { w: 0, l: 0 }, pl: { w: 0, l: 0, p: 0 }, ou: { w: 0, l: 0, p: 0 } });
  const record = Object.assign(fresh(), { byMonth: {}, bands: {} });
  const bandOf = p => { const c = Math.max(p, 1 - p); return c >= 0.7 ? '70+' : c >= 0.6 ? '60-70' : '50-60'; };
  for (const r of out) {
    if (!r.result) continue;
    const mo = r.type === 3 ? 'playoffs' : r.date.slice(0, 7);
    const bm = record.byMonth[mo] = record.byMonth[mo] || fresh();
    const bd = record.bands[bandOf(r.pHome)] = record.bands[bandOf(r.pHome)] || fresh();
    const bump = t => {
      r.result.su ? t.su.w++ : t.su.l++;
      for (const k of ['ml', 'pl', 'ou']) { const v = r.result[k]; if (v === 'win') t[k].w++; else if (v === 'loss') t[k].l++; else if (v === 'push') t[k].p++; }
    };
    bump(record); bump(bm); bump(bd);
  }

  const playoff = playoffPicture(games, ratings, model, rates);
  const top = E.TEAMS.slice().sort((a, b) => playoff.odds[b].cup - playoff.odds[a].cup).slice(0, 4).map(t => `${t} ${Math.round(playoff.odds[t].cup * 100)}%`).join(', ');
  log(`playoff picture: ${top} for the Cup; ${SIMS} sims over ${playoff.remaining} games left`);

  const state = { published: new Date().toISOString(), season: SEASON, today: TODAY, model, clubs: E.CLUBS, teams, games: out, record, playoff, edge: EDGE };
  const before = prev ? JSON.stringify(Object.assign({}, prev, { published: null, today: null })) : null;
  const after = JSON.stringify(Object.assign({}, state, { published: null, today: null }));
  if (before === after) { log('nothing changed; state.json left alone'); return; }
  fs.writeFileSync(STATE, JSON.stringify(state));
  const fin = out.filter(g => g.result).length;
  log(`wrote nhl/state.json: ${fin} graded (${record.su.w}-${record.su.l} straight up, ${record.pl.w}-${record.pl.l}-${record.pl.p} on the puck line, ${record.ou.w}-${record.ou.l}-${record.ou.p} on totals), ${out.length} games`);
}
main().catch(e => { console.error(e); process.exit(1); });
