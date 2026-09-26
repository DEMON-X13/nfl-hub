/* The player and goalie model: every skater carries an offence and a defence rating, every
   goalie a save rating, in goals per game for a player on the ice all game. A club's attack for
   a game is its skaters' offence weighted by their share of the ice time (five shares in all,
   five men on the ice), its defence their defence the same way plus the goalie, so a club is
   exactly the sum of who dressed, how much they played and who was in the net. Each side's
   expected goals is half the league's total plus its attack less the other side's defence and
   goalie, plus home ice for the home side; the goals layer in elo.js turns the two means into a
   win chance, a puck line and a total, and a fitted share of the team Elo's chance is blended in.

   After a final, each side's regulation goals against what was expected is the surprise: it moves
   the offence of the skaters who scored it and the defence of the skaters and the goalie who
   conceded it, each by his share of the ice time to a fitted power (so a fourth-liner moves
   relatively more than his minutes say), the goalie by his own share. A player's first rating is
   a rookie's, below average; ratings carry part way toward zero between seasons.

   Fit on 2022-23 to 2024-25 by coordinate search on log loss with the lineup known and minutes
   projected from each player's last eight games; 2021-22 warms up; 2025-26 is held out and scored
   three ways (last game's lineup, lineup known, actual minutes). Each season from 2024 on is also
   scored cold, its parameters searched on the seasons before it: that walk-forward is the honest
   number, and it decides `use`, whether the site's call is this model's or the team Elo's.

    node nhl/tools/players.js          replay with the parameters in nhl/data/players.json, write it
    node nhl/tools/players.js fit      search the parameters again first

   Tonight: each club's lineup is the last game's minus the injury report's Out and IR, its goalie
   the announced starter in nhl/data/starters.json where there is one, else the goalie who did not
   play yesterday on a back to back, else the one with more starts in the last ten. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const { Elo, expected, goals, homeByGoals, spreadOf } = require('./elo');

const ROOT = path.join(__dirname, '..'), DATA = path.join(ROOT, 'data');
const OUTF = path.join(DATA, 'players.json');
const WARM = 2022, FIT_TO = 2025;
const DEFAULT = { K: 0.06, gShare: 0.5, pow: 0.5, carry: 0.8, rookie: -0.05, hfa: 0.12, blend: 0.3, clip: 3, recent: 8 };
const GRID = {
  K: [0.02, 0.03, 0.04, 0.06, 0.08, 0.1, 0.14],
  gShare: [0, 0.25, 0.5, 0.75, 1, 1.5],
  pow: [0.5, 0.75, 1],
  carry: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
  rookie: [0, -0.02, -0.05, -0.08, -0.12],
  hfa: [0.06, 0.09, 0.12, 0.15, 0.18],
  blend: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1],
  clip: [2, 3, 4, 6],
};
const log = m => console.log(new Date().toISOString().slice(11, 19), m);
const model = JSON.parse(fs.readFileSync(path.join(DATA, 'model.json'), 'utf8'));

/* ---------- the data: every game with a box score, in date order, with its score and the team Elo's view ---------- */
function loadGames() {
  const H = JSON.parse(fs.readFileSync(path.join(DATA, 'history.json'), 'utf8'));
  const col = Object.fromEntries(H.cols.map((c, i) => [c, i]));
  const res = {};
  for (const r of H.rows) res[r[col.id]] = { hs: r[col.hs], as: r[col.as], periods: r[col.periods], neutral: r[col.neutral], season: r[col.season] };
  const stateFile = path.join(ROOT, 'state.json'); let S = null;
  if (fs.existsSync(stateFile)) { S = JSON.parse(fs.readFileSync(stateFile, 'utf8')); for (const g of S.games) if (g.state === 'final' && g.hs !== null) res[g.id] = { hs: g.hs, as: g.as, periods: g.periods, neutral: g.neutral, season: S.season }; }
  const games = [];
  for (const f of fs.readdirSync(DATA).filter(f => /^box_\d+\.jsonl$/.test(f)).sort()) for (const l of fs.readFileSync(path.join(DATA, f), 'utf8').split('\n')) {
    if (!l) continue; const b = JSON.parse(l); const r = res[b.id]; if (!r) continue;
    games.push(Object.assign(b, r));
  }
  games.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1);
  /* the team Elo's chance on every game, replayed over the whole history, for the blend */
  const m = new Elo(model.params); const elo = {};
  const all = H.rows.map(r => ({ id: r[col.id], season: r[col.season], date: r[col.date], home: r[col.home], away: r[col.away], hs: r[col.hs], as: r[col.as], periods: r[col.periods], neutral: r[col.neutral] }));
  if (S) for (const g of S.games) if (g.state === 'final' && g.hs !== null) all.push({ id: g.id, season: S.season, date: g.date, home: g.home, away: g.away, hs: g.hs, as: g.as, periods: g.periods, neutral: g.neutral });
  all.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  for (const g of all) { m.newSeason(g.season); elo[g.id] = m.play(g); }
  return { games, elo, eloModel: m, state: S };
}

/* ---------- the replay ---------- */
const regGoals = (g, side) => { const w = g.hs > g.as ? 'home' : 'away'; const n = side === 'home' ? g.hs : g.as; return g.periods > 3 && side === w ? n - 1 : n; };

class Model {
  constructor(P) { this.p = P; this.r = {}; this.season = null; this.hist = {}; this.last = {}; }
  player(id, name, pos, team) {
    let x = this.r[id];
    if (!x) x = this.r[id] = { name, pos, team, o: this.p.rookie, d: this.p.rookie, gk: pos === 'G' ? this.p.rookie : 0, gp: 0, toi: [], seasons: {} };
    x.name = name; x.pos = pos; x.team = team; return x;
  }
  newSeason(season) {
    if (this.season !== null && season !== this.season) {
      for (const [id, x] of Object.entries(this.r)) { x.seasons[this.season] = +(x.pos === 'G' ? x.gk : x.o + x.d).toFixed(3); x.o *= this.p.carry; x.d *= this.p.carry; x.gk *= this.p.carry; }
    }
    this.season = season;
  }
  /* a side's attack, defence and goalie from a lineup of {id, share} and a goalie id */
  strength(lineup, goalieId) {
    let o = 0, d = 0;
    for (const l of lineup) { const x = this.r[l.id]; if (x) { o += x.o * l.share; d += x.d * l.share; } }
    const g = this.r[goalieId]; return { o, d, gk: g ? g.gk : 0 };
  }
  /* shares from the box (actual minutes): five shares across the skaters who dressed */
  static actualShares(box, team) {
    const sk = box.skaters.filter(s => s.team === team); const tot = sk.reduce((a, s) => a + s.toi, 0) || 1;
    return sk.map(s => ({ id: s.id, share: 5 * s.toi / tot }));
  }
  /* shares from each player's recent games: the lineup that dressed, minutes projected */
  projectedShares(box, team) {
    const sk = box.skaters.filter(s => s.team === team);
    const est = sk.map(s => { const x = this.r[s.id]; const t = x && x.toi.length ? x.toi.reduce((a, b) => a + b, 0) / x.toi.length : 600; return { id: s.id, t }; });
    const tot = est.reduce((a, s) => a + s.t, 0) || 1;
    return est.map(s => ({ id: s.id, share: 5 * s.t / tot }));
  }
  /* the goalie who played most of the game */
  static goalieOf(box, team) { const gs = box.goalies.filter(g => g.team === team).sort((a, b) => b.toi - a.toi); return gs[0] ? gs[0].id : null; }
  /* expected goals each side, from strengths */
  means(H, A, neutral) {
    const half = model.leagueTotal / 2;
    return { lh: Math.max(0.5, half + H.o - A.d - A.gk + (neutral ? 0 : this.p.hfa)), la: Math.max(0.5, half + A.o - H.d - H.gk) };
  }
  /* the view of a game before it is played, on the shares given */
  predict(g, hs, as, hg, ag, eloDiff) {
    const H = this.strength(hs, hg), A = this.strength(as, ag);
    const { lh, la } = this.means(H, A, g.neutral);
    const G = goals(lh + la, lh - la, eloDiff, model.pull);
    const pG = homeByGoals(G), pE = expected(eloDiff);
    return { lh, la, pHome: (1 - this.p.blend) * pG + this.p.blend * pE, pGoals: pG, mu: lh - la, total: lh + la, tie: G.tie };
  }
  /* rate a finished game: the surprise on each side moves who was on the ice */
  play(box, view) {
    const P = this.p;
    for (const side of ['home', 'away']) {
      const team = box[side], other = side === 'home' ? 'away' : 'home';
      const exp = side === 'home' ? view.lh : view.la;
      const surprise = Math.max(-P.clip, Math.min(P.clip, regGoals(box, side) - exp));
      const own = Model.actualShares(box, team), opp = Model.actualShares(box, box[other]);
      const w = l => Math.pow(l.share / 5, P.pow);
      const wo = own.reduce((a, l) => a + w(l), 0) || 1, wd = opp.reduce((a, l) => a + w(l), 0) || 1;
      for (const l of own) { const x = this.r[l.id]; if (x) x.o += P.K * surprise * w(l) / wo * 5; }
      for (const l of opp) { const x = this.r[l.id]; if (x) x.d -= P.K * surprise * w(l) / wd * 5 * (1 / (1 + P.gShare)); }
      const gk = this.r[Model.goalieOf(box, box[other])]; if (gk) gk.gk -= P.K * surprise * P.gShare / (1 + P.gShare) * 5;
    }
    for (const s of box.skaters) { const x = this.player(s.id, s.name, s.pos, s.team); x.gp++; x.toi.push(s.toi); if (x.toi.length > P.recent) x.toi.shift(); }
    for (const gl of box.goalies) { const x = this.player(gl.id, gl.name, 'G', gl.team); if (gl.toi > 1200) x.gp++; }
    for (const side of ['home', 'away']) this.last[box[side]] = box;
  }
}

/* replay in date order; `mode` is how the pre-game lineup is known: 'projected' (dressed, minutes
   from recent games), 'actual' (the box's minutes) or 'last' (the club's previous game, nothing
   known tonight). Returns per-game records for scoring, and the model after the last game */
function replay(P, games, elo, mode, collect) {
  const m = new Model(P); const recs = [];
  for (const g of games) {
    m.newSeason(g.season);
    for (const s of g.skaters) m.player(s.id, s.name, s.pos, s.team);
    for (const gl of g.goalies) m.player(gl.id, gl.name, 'G', gl.team);
    let hs, as, hg, ag;
    if (mode === 'actual') { hs = Model.actualShares(g, g.home); as = Model.actualShares(g, g.away); hg = Model.goalieOf(g, g.home); ag = Model.goalieOf(g, g.away); }
    else if (mode === 'last') { const lh = m.last[g.home], la = m.last[g.away]; hs = lh ? m.projectedShares(lh, g.home) : m.projectedShares(g, g.home); as = la ? m.projectedShares(la, g.away) : m.projectedShares(g, g.away); hg = lh ? Model.goalieOf(lh, g.home) : Model.goalieOf(g, g.home); ag = la ? Model.goalieOf(la, g.away) : Model.goalieOf(g, g.away); }
    else { hs = m.projectedShares(g, g.home); as = m.projectedShares(g, g.away); hg = Model.goalieOf(g, g.home); ag = Model.goalieOf(g, g.away); }
    const e = elo[g.id]; const view = m.predict(g, hs, as, hg, ag, e ? e.diff : 0);
    if (collect) recs.push({ season: g.season, pHome: view.pHome, pElo: e ? e.pHome : 0.5, mu: view.mu, total: view.total, margin: g.hs - g.as, tot: g.hs + g.as, win: g.hs > g.as ? 1 : 0 });
    /* the update always uses what actually happened */
    const real = mode === 'actual' ? view : m.predict(g, Model.actualShares(g, g.home), Model.actualShares(g, g.away), Model.goalieOf(g, g.home), Model.goalieOf(g, g.away), e ? e.diff : 0);
    m.play(g, real);
  }
  return { m, recs };
}
function score(recs, pick, key = 'pHome') {
  const r = recs.filter(pick); let ll = 0, acc = 0, mae = 0, tmae = 0;
  for (const x of r) { const p = Math.min(0.999, Math.max(0.001, x[key])); ll -= x.win * Math.log(p) + (1 - x.win) * Math.log(1 - p); acc += (p >= 0.5) === (x.win === 1) ? 1 : 0; mae += Math.abs(x.margin - x.mu); tmae += Math.abs(x.tot - x.total); }
  return { n: r.length, logloss: +(ll / r.length).toFixed(4), acc: +(acc / r.length).toFixed(4), marginMae: +(mae / r.length).toFixed(3), totalMae: +(tmae / r.length).toFixed(3) };
}
function fit(games, elo, fitFrom, fitTo, start) {
  let P = Object.assign({}, start);
  const inFit = x => x.season > fitFrom && x.season <= fitTo;
  const lossOf = p => score(replay(p, games, elo, 'projected', true).recs, inFit).logloss;
  let best = lossOf(P), moved = true, pass = 0;
  while (moved && pass < 5) {
    moved = false; pass++;
    for (const k of Object.keys(GRID)) for (const v of GRID[k]) { if (v === P[k]) continue; const q = Object.assign({}, P, { [k]: v }); const l = lossOf(q); if (l < best - 1e-6) { best = l; P = q; moved = true; } }
    log(`fit ${fitFrom + 1}-${fitTo} pass ${pass}: log loss ${best.toFixed(5)} ${JSON.stringify(P)}`);
  }
  return P;
}

/* ---------- tonight ---------- */
function lineups(m, S, injuries, starters, today) {
  const upcoming = {}; const teams = {};
  const out = code => (injuries.teams && injuries.teams[code] || []).filter(x => /out|injured reserve|suspension/i.test(x.status || '')).map(x => x.id);
  const yesterday = {}; for (const g of S.games) if (g.state === 'final') for (const t of [g.home, g.away]) yesterday[t] = g.date;
  for (const code of E.TEAMS) {
    const last = m.last[code]; const gone = new Set(out(code));
    const dressed = last ? last.skaters.filter(s => s.team === code && !gone.has(s.id)) : [];
    const est = dressed.map(s => { const x = m.r[s.id]; const t = x && x.toi.length ? x.toi.reduce((a, b) => a + b, 0) / x.toi.length : 600; return { id: s.id, t }; });
    const tot = est.reduce((a, s) => a + s.t, 0) || 1;
    const shares = est.map(s => ({ id: s.id, share: 5 * s.t / tot }));
    /* the goalie */
    const gs = Object.entries(m.r).filter(([id, x]) => x.pos === 'G' && x.team === code && !gone.has(id)).map(([id, x]) => ({ id, name: x.name, gk: x.gk, gp: x.gp }));
    let goalie = null, how = null;
    const st = starters && starters.teams && starters.teams[code];
    if (st && st.id && m.r[st.id]) { goalie = st.id; how = st.status || 'announced'; }
    else if (gs.length) {
      const recent = S.games.filter(g => g.state === 'final' && (g.home === code || g.away === code)).slice(-10);
      const starts = {}; for (const g of recent) { const b = m.last[code]; if (b && b.id === g.id) { const gk = Model.goalieOf(b, code); starts[gk] = (starts[gk] || 0) + 1; } }
      const lastGk = last ? Model.goalieOf(last, code) : null;
      const b2b = last && yesterday[code] && require('./elo').daysBetween(last.date, today) === 1;
      const pick = gs.slice().sort((a, b) => (b.gp - a.gp) || (b.gk - a.gk));
      if (b2b && lastGk && pick.length > 1) { goalie = pick.find(g => g.id !== lastGk).id; how = 'back to back: the other goalie'; }
      else { goalie = pick[0].id; how = 'the usual starter'; }
    }
    const S1 = m.strength(shares, goalie);
    const outNames = out(code).map(id => m.r[id] ? { id, name: m.r[id].name, pos: m.r[id].pos, cost: +(m.r[id].pos === 'G' ? 0 : (m.r[id].o + m.r[id].d) * ((m.r[id].toi.reduce((a, b) => a + b, 0) / Math.max(1, m.r[id].toi.length)) / (tot / Math.max(1, est.length)) / Math.max(1, est.length) * 5)).toFixed(2) } : null).filter(Boolean);
    teams[code] = { offence: +S1.o.toFixed(3), defence: +S1.d.toFixed(3), goalie: goalie ? { id: goalie, name: m.r[goalie].name, gk: +m.r[goalie].gk.toFixed(3), how } : null, strength: +(S1.o + S1.d + S1.gk).toFixed(3), out: outNames,
      lineup: shares.map(s => ({ id: s.id, name: m.r[s.id].name, pos: m.r[s.id].pos, share: +s.share.toFixed(2), v: +((m.r[s.id].o + m.r[s.id].d) * s.share).toFixed(3) })).sort((a, b) => b.share - a.share), _shares: shares, _goalie: goalie };
  }
  return { teams };
}

function main() {
  const { games, elo, eloModel, state: S } = loadGames();
  const seasons = [...new Set(games.map(g => g.season))].sort();
  const last = seasons[seasons.length - 1];
  const prev = fs.existsSync(OUTF) ? JSON.parse(fs.readFileSync(OUTF, 'utf8')) : null;
  log(`${games.length} games with box scores, seasons ${seasons[0]}-${last}`);
  const refit = process.argv[2] === 'fit' || !prev;
  const HOLD = last > FIT_TO ? FIT_TO + 1 : last;                    // the newest complete season is held out; this season is scored as it goes
  let P = prev && !refit ? prev.params : fit(games, elo, WARM, HOLD - 1, DEFAULT);
  /* the report: fit seasons, the holdout three ways, and the team Elo on the same games */
  const proj = replay(P, games, elo, 'projected', true);
  const inFit = x => x.season > WARM && x.season < HOLD, inHold = x => x.season === HOLD;
  const report = { fitSeasons: `${WARM + 1}-${HOLD - 1}`, holdout: HOLD, fit: score(proj.recs, inFit), holdoutKnown: score(proj.recs, inHold), holdoutTeam: score(proj.recs, inHold, 'pElo'),
    holdoutLast: score(replay(P, games, elo, 'last', true).recs, inHold), holdoutActual: score(replay(P, games, elo, 'actual', true).recs, inHold) };
  /* walk-forward: each season from 2024 called by parameters searched on the seasons before it */
  const walk = prev && !refit && prev.report && prev.report.walk ? prev.report.walk : {};
  if (refit) for (const s of seasons.filter(s => s >= 2024 && s <= HOLD)) {
    const Ps = fit(games.filter(g => g.season < s), elo, WARM, s - 1, P);
    const r = replay(Ps, games.filter(g => g.season <= s), elo, 'projected', true).recs;
    walk[s] = { player: score(r, x => x.season === s), team: score(r, x => x.season === s, 'pElo'), params: Ps };
  }
  report.walk = walk;
  const ws = Object.values(walk);
  report.use = ws.length >= 2 && ws.every(w => w.player.logloss <= w.team.logloss + 0.002) && ws.reduce((a, w) => a + w.player.logloss, 0) < ws.reduce((a, w) => a + w.team.logloss, 0);
  log(`fit ${report.fit.n} games: log loss ${report.fit.logloss}, ${(report.fit.acc * 100).toFixed(1)}% | holdout ${HOLD}: known ${report.holdoutKnown.logloss}/${(report.holdoutKnown.acc * 100).toFixed(1)}%, last game ${report.holdoutLast.logloss}, actual ${report.holdoutActual.logloss}, team Elo ${report.holdoutTeam.logloss}/${(report.holdoutTeam.acc * 100).toFixed(1)}%`);
  for (const [s, w] of Object.entries(walk)) log(`walk-forward ${s}: player ${w.player.logloss}/${(w.player.acc * 100).toFixed(1)}% vs team ${w.team.logloss}/${(w.team.acc * 100).toFixed(1)}%`);
  log(`the site's call is the ${report.use ? 'player model' : 'team Elo'}`);

  /* tonight: the model after the last final, this season's injuries and starters */
  const m = proj.m;
  const injuries = fs.existsSync(path.join(DATA, 'injuries.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'injuries.json'), 'utf8')) : { teams: {} };
  const starters = fs.existsSync(path.join(DATA, 'starters.json')) ? JSON.parse(fs.readFileSync(path.join(DATA, 'starters.json'), 'utf8')) : null;
  const today = process.env.NHL_TODAY || E.etDate(new Date());
  const upcoming = {}; let teams = {};
  if (S) {
    const L = lineups(m, S, injuries, starters, today); teams = L.teams;
    for (const g of S.games) {
      if (g.state === 'final') continue;
      const th = teams[g.home], ta = teams[g.away];
      const v = m.predict(g, th._shares, ta._shares, th._goalie, ta._goalie, g.diff);
      upcoming[g.id] = { pHome: +v.pHome.toFixed(4), pGoals: +v.pGoals.toFixed(4), mu: +v.mu.toFixed(2), total: +v.total.toFixed(2), tie: +v.tie.toFixed(3),
        home: { goalie: th.goalie, out: th.out, strength: th.strength }, away: { goalie: ta.goalie, out: ta.out, strength: ta.strength } };
    }
    for (const t of Object.values(teams)) { delete t._shares; delete t._goalie; }
  }
  const players = {};
  for (const [id, x] of Object.entries(m.r)) {
    if (x.gp < 5 && Object.keys(x.seasons).length === 0) continue;
    players[id] = { name: x.name, pos: x.pos, team: x.team, o: +x.o.toFixed(3), d: +x.d.toFixed(3), gk: +x.gk.toFixed(3), v: +(x.pos === 'G' ? x.gk : x.o + x.d).toFixed(3), gp: x.gp, toi: x.toi.length ? Math.round(x.toi.reduce((a, b) => a + b, 0) / x.toi.length) : 0, seasons: x.seasons };
  }
  const out = { params: P, report, asOf: games[games.length - 1].date, season: last, games: games.length, players, teams, upcoming, generated: prev ? prev.generated : null };
  const same = prev && JSON.stringify(Object.assign({}, prev, { generated: null })) === JSON.stringify(Object.assign({}, out, { generated: null }));
  out.generated = same ? prev.generated : new Date().toISOString().slice(0, 16) + 'Z';
  if (!same) fs.writeFileSync(OUTF, JSON.stringify(out));
  const top = Object.values(players).filter(p => p.pos !== 'G' && p.gp >= 20).sort((a, b) => b.v - a.v).slice(0, 5).map(p => `${p.name} ${p.v}`).join(', ');
  const topG = Object.values(players).filter(p => p.pos === 'G' && p.gp >= 10).sort((a, b) => b.v - a.v).slice(0, 3).map(p => `${p.name} ${p.v}`).join(', ');
  log(`players.json: ${Object.keys(players).length} players, ${Object.keys(upcoming).length} upcoming, ${same ? 'unchanged' : 'written'}. Top skaters: ${top}. Top goalies: ${topG}`);
}
if (require.main === module) main();
module.exports = { Model, replay, score };
