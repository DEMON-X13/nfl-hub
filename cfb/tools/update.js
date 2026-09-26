/* The college job: read this season from ESPN, rate every team, call every game, freeze
   the call and the line before kickoff, grade what has finished, simulate the playoff
   picture and write cfb/state.json, which is everything the page shows.

    node cfb/tools/update.js              the season, from ESPN
    node cfb/tools/update.js --offline    from the scoreboard files a previous run saved in cfb/tools/out/

   Free: ESPN's public feeds only, nothing spends a credit. Idempotent: a call or a line
   made before kickoff is kept once the game has started, so the record grades what the
   page actually showed; games that were already over when this job first ran are
   graded from the replay and marked so.

   The model is cfb/tools/elo.js with the parameters fit.js wrote to cfb/data/model.json,
   replayed over cfb/data/history.json and then this season's finished games, in date
   order. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const { Elo, expected, spreadOf, coverProbs, roundHalf } = require('./elo');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data'), OUT = path.join(__dirname, 'out');
const STATE = path.join(ROOT, 'state.json');
const SEASON = +(process.env.CFB_SEASON || 2026);
const ARGS = new Set(process.argv.slice(2));
const P4 = new Set(['1', '4', '5', '8']);          // ACC, Big 12, Big Ten, SEC
const NOTRE_DAME = '87';
const INDEPENDENTS = '18';
const ATS_EDGE = 3;                                 // points the model must disagree with the line by to take a side
const SIMS = 3000;
const LOSS_COST = 55;                               // the committee proxy: Elo minus this per loss

const log = m => console.log(new Date().toISOString().slice(11, 19), m);
const num = v => (v === null || v === undefined ? null : +v);

function rec(w, l) { return `${w}-${l}`; }

async function pullSeason() {
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = []; for (let w = 1; w <= 16; w++) jobs.push([w, 2]); jobs.push([1, 3]);
  const games = new Map(), teams = JSON.parse(fs.readFileSync(path.join(DATA, 'teams.json'), 'utf8'));
  for (let i = 0; i < jobs.length; i += 4) {
    const batch = await Promise.all(jobs.slice(i, i + 4).map(async ([w, t]) => {
      const file = path.join(OUT, `sb_${SEASON}_${t}_${w}.json`);
      if (ARGS.has('--offline')) return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { events: [] };
      try { const j = await E.scoreboard(SEASON, w, t); fs.writeFileSync(file, JSON.stringify(j)); return j; }
      catch (e) { log(`week ${w}/${t}: ${e.message}${fs.existsSync(file) ? ' (using the saved copy)' : ''}`); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { events: [] }; }
    }));
    for (const j of batch) {
      E.teamsOf(j, teams.teams);
      for (const ev of j.events || []) { const g = E.gameRow(ev); if (g && g.season === SEASON) { if (g.type !== 2) g.type = 3; games.set(g.id, g); } }
    }
  }
  let rankings = {};
  try {
    const file = path.join(OUT, 'rankings.json');
    if (ARGS.has('--offline')) rankings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    else { rankings = await E.rankings(); fs.writeFileSync(file, JSON.stringify(rankings)); }
  } catch (e) { log(`rankings: ${e.message}`); }
  try { if (!ARGS.has('--offline')) teams.confs = await E.conferences(); } catch (e) { log(`conferences: ${e.message}`); }
  fs.writeFileSync(path.join(DATA, 'teams.json'), JSON.stringify(teams));
  return { games: [...games.values()].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0), teams, rankings };
}

function loadHistory() {
  const H = JSON.parse(fs.readFileSync(path.join(DATA, 'history.json'), 'utf8'));
  const col = Object.fromEntries(H.cols.map((c, i) => [c, i]));
  return H.rows.map(r => ({ id: r[col.id], season: r[col.season], date: r[col.date], home: r[col.home], away: r[col.away], hs: r[col.hs], as: r[col.as], neutral: r[col.neutral], hconf: r[col.hconf], aconf: r[col.aconf] }))
    .filter(g => g.season < SEASON).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

/* ---------- the playoff picture ---------- */
function standingsOf(teams, games, confs) {
  const S = {};
  for (const id of Object.keys(teams)) if (teams[id].fbs) S[id] = { w: 0, l: 0, cw: 0, cl: 0 };
  for (const g of games) {
    if (g.state !== 'final' || g.type !== 2) continue;
    const hw = g.hs > g.as; const th = S[g.home], ta = S[g.away];
    if (th) { hw ? th.w++ : th.l++; }
    if (ta) { hw ? ta.l++ : ta.w++; }
    const sameConf = teams[g.home]?.conf && teams[g.home].conf === teams[g.away]?.conf && teams[g.home].conf !== INDEPENDENTS;
    if (sameConf && g.conf && !/championship/i.test(g.note || '')) { if (th) { hw ? th.cw++ : th.cl++; } if (ta) { hw ? ta.cl++ : ta.cw++; } }
  }
  return S;
}

/* one season played out: returns the champion of each conference and each team's record */
function simulateSeason(teams, games, ratings, model, rnd) {
  const S = {}; for (const id of Object.keys(teams)) if (teams[id].fbs) S[id] = { w: 0, l: 0, cw: 0, cl: 0 };
  const champGame = {};                              // conf -> the scheduled title game
  const play = (g, hw) => {
    const th = S[g.home], ta = S[g.away];
    if (th) { hw ? th.w++ : th.l++; } if (ta) { hw ? ta.l++ : ta.w++; }
    const sameConf = teams[g.home]?.conf && teams[g.home].conf === teams[g.away]?.conf && teams[g.home].conf !== INDEPENDENTS;
    if (sameConf && g.conf && !g.isChamp) { if (th) { hw ? th.cw++ : th.cl++; } if (ta) { hw ? ta.cl++ : ta.cw++; } }
  };
  const winnerOf = {};
  for (const g of games) {
    if (g.type !== 2) continue;
    if (g.isChamp) { champGame[teams[g.home].conf] = g; }
    let hw;
    if (g.state === 'final') hw = g.hs > g.as;
    else { const p = expected(ratings[g.home] - ratings[g.away] + (g.neutral ? 0 : model.params.hfa)); hw = rnd() < p; }
    winnerOf[g.id] = hw ? g.home : g.away;
    play(g, hw);
  }
  const champs = {};
  const byConf = {};
  for (const id of Object.keys(S)) { const c = teams[id].conf; if (!c || c === INDEPENDENTS) continue; (byConf[c] = byConf[c] || []).push(id); }
  for (const c of Object.keys(byConf)) {
    if (champGame[c]) { champs[c] = winnerOf[champGame[c].id]; continue; }
    const order = byConf[c].slice().sort((a, b) => {
      const pa = S[a].cw / Math.max(1, S[a].cw + S[a].cl), pb = S[b].cw / Math.max(1, S[b].cw + S[b].cl);
      return pb - pa || (S[b].cw - S[a].cw) || (ratings[b] - ratings[a]);
    });
    if (order.length < 2) { champs[c] = order[0]; continue; }
    const [a, b] = order;
    champs[c] = rnd() < expected(ratings[a] - ratings[b]) ? a : b;   // the title game, on a neutral field
  }
  return { S, champs };
}

/* the committee, as a proxy: rating less a cost per loss */
const proxy = (id, S, ratings) => ratings[id] - LOSS_COST * (S[id]?.l || 0);

function fieldOf(order, champs) {
  /* the five highest-placed conference champions are in; seven more by placing; seeded straight */
  const champSet = new Set(Object.values(champs));
  const autos = order.filter(id => champSet.has(id)).slice(0, 5);
  const autoSet = new Set(autos);
  const rest = order.filter(id => !autoSet.has(id)).slice(0, 7);
  const field = order.filter(id => autoSet.has(id) || rest.includes(id)).slice(0, 12);
  return field.map((id, i) => ({ seed: i + 1, team: id, auto: autoSet.has(id) }));
}

function simulatePlayoff(field, ratings, hfa, rnd) {
  const win = (a, b, home) => rnd() < expected(ratings[a] - ratings[b] + (home ? hfa : 0)) ? a : b;
  const t = i => field[i - 1].team;
  const r1 = [win(t(8), t(9), true), win(t(7), t(10), true), win(t(6), t(11), true), win(t(5), t(12), true)];
  const q = [win(t(1), r1[0]), win(t(2), r1[1]), win(t(3), r1[2]), win(t(4), r1[3])];
  const s = [win(q[0], q[3]), win(q[1], q[2])];
  return win(s[0], s[1]);
}

function playoffPicture(teams, games, ratings, model, rankings, confs) {
  /* a seeded generator so a run that changes nothing writes the same numbers */
  let seed = 20260901; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (const g of games) g.isChamp = g.type === 2 && /championship/i.test(g.note || '') && teams[g.home]?.conf && teams[g.home].conf === teams[g.away]?.conf;
  const tally = {}; for (const id of Object.keys(teams)) if (teams[id].fbs) tally[id] = { playoff: 0, bye: 0, conf: 0, title: 0, wins: 0 };
  for (let i = 0; i < SIMS; i++) {
    const { S, champs } = simulateSeason(teams, games, ratings, model, rnd);
    const order = Object.keys(S).sort((a, b) => proxy(b, S, ratings) - proxy(a, S, ratings));
    const field = fieldOf(order, champs);
    for (const c of Object.values(champs)) if (tally[c]) tally[c].conf++;
    for (const f of field) { tally[f.team].playoff++; if (f.seed <= 4) tally[f.team].bye++; }
    const champ = simulatePlayoff(field, ratings, model.params.hfa, rnd);
    tally[champ].title++;
    for (const id of Object.keys(S)) tally[id].wins += S[id].w;
  }
  const odds = {};
  for (const id of Object.keys(tally)) { const t = tally[id]; odds[id] = { playoff: +(t.playoff / SIMS).toFixed(3), bye: +(t.bye / SIMS).toFixed(3), conf: +(t.conf / SIMS).toFixed(3), title: +(t.title / SIMS).toFixed(3), expWins: +(t.wins / SIMS).toFixed(1) }; }

  /* if the season ended today: the committee's ranking where there is one, the AP poll
     until then, unranked teams by the proxy behind them; each conference's leader as
     its champion */
  const S = standingsOf(teams, games, confs);
  const poll = rankings.cfp || rankings.ap || null;
  const ranked = poll ? poll.ranks.map(r => r.team).filter(id => S[id]) : [];
  const rankedSet = new Set(ranked);
  const order = ranked.concat(Object.keys(S).filter(id => !rankedSet.has(id)).sort((a, b) => proxy(b, S, ratings) - proxy(a, S, ratings)));
  const champs = {}; const byConf = {};
  for (const id of Object.keys(S)) { const c = teams[id].conf; if (!c || c === INDEPENDENTS) continue; (byConf[c] = byConf[c] || []).push(id); }
  const standings = {};
  for (const c of Object.keys(byConf)) {
    const sorted = byConf[c].slice().sort((a, b) => {
      const pa = S[a].cw / Math.max(1, S[a].cw + S[a].cl), pb = S[b].cw / Math.max(1, S[b].cw + S[b].cl);
      return pb - pa || (S[b].cw - S[a].cw) || (proxy(b, S, ratings) - proxy(a, S, ratings));
    });
    const played = games.find(g => g.isChamp && g.state === 'final' && teams[g.home].conf === c);
    champs[c] = played ? (played.hs > played.as ? played.home : played.away) : sorted[0];
    standings[c] = sorted.map(id => ({ team: id, w: S[id].w, l: S[id].l, cw: S[id].cw, cl: S[id].cl }));
  }
  const field = fieldOf(order, champs).map(f => Object.assign(f, { conf: f.auto ? teams[f.team].conf : null, rank: poll ? (poll.ranks.find(r => r.team === f.team)?.rank ?? null) : null, record: rec(S[f.team].w, S[f.team].l) }));
  return { sims: SIMS, lossCost: LOSS_COST, odds, standings, champs, bracket: { basis: poll ? (rankings.cfp ? 'CFP rankings' : 'AP poll') : 'model', field } };
}

/* ---------- the run ---------- */
async function main() {
  const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
  const prevGames = new Map(((prev && prev.season === SEASON && prev.games) || []).map(g => [g.id, g]));
  const model = JSON.parse(fs.readFileSync(path.join(DATA, 'model.json'), 'utf8'));
  const { games, teams: T, rankings } = await pullSeason();
  const confs = T.confs; const FBS = new Set(Object.keys(confs));
  log(`${games.length} games this season, ${games.filter(g => g.state === 'final').length} final; ${Object.keys(rankings).join(', ') || 'no'} rankings`);

  /* replay: the history, then this season's finals, keeping each one's pre-game view */
  const m = new Elo(model.params, FBS);
  for (const g of loadHistory()) { m.newSeason(g.season); m.play(g); }
  m.newSeason(SEASON);
  const replayed = {};
  for (const g of games) if (g.state === 'final' && g.hs !== null) replayed[g.id] = m.play(g);
  const ratings = m.r;

  /* the team table, with this season's records, the model's rank and the polls */
  const seen = new Set(); for (const g of games) { seen.add(g.home); seen.add(g.away); }
  const teams = {};
  for (const id of seen) {
    const t = T.teams[id] || { abbr: id, name: id, short: id };
    const fbs = FBS.has(String(t.conf));
    teams[id] = Object.assign({}, t, { fbs, rating: +(ratings[id] ?? (fbs ? model.params.fbsBase : model.params.fcsBase)).toFixed(1) });
  }
  const apRank = {}; for (const r of rankings.ap?.ranks || []) apRank[r.team] = r.rank;
  const coRank = {}; for (const r of rankings.coaches?.ranks || []) coRank[r.team] = r.rank;
  const cfpRank = {}; for (const r of rankings.cfp?.ranks || []) cfpRank[r.team] = r.rank;
  const S = standingsOf(teams, games, confs);
  const fbsOrder = Object.keys(teams).filter(id => teams[id].fbs).sort((a, b) => teams[b].rating - teams[a].rating);
  fbsOrder.forEach((id, i) => { teams[id].rank = i + 1; });
  let pf = {}, pa = {};
  for (const g of games) if (g.state === 'final') { pf[g.home] = (pf[g.home] || 0) + g.hs; pa[g.home] = (pa[g.home] || 0) + g.as; pf[g.away] = (pf[g.away] || 0) + g.as; pa[g.away] = (pa[g.away] || 0) + g.hs; }
  for (const id of Object.keys(teams)) {
    const t = teams[id]; const s = S[id] || { w: 0, l: 0, cw: 0, cl: 0 };
    Object.assign(t, s, { pf: pf[id] || 0, pa: pa[id] || 0, ap: apRank[id] ?? null, coaches: coRank[id] ?? null, cfp: cfpRank[id] ?? null });
    t.major = t.fbs && (P4.has(String(t.conf)) || id === NOTRE_DAME || t.ap !== null || t.cfp !== null);
  }

  /* every game's call and line: frozen before kickoff, kept after */
  const now = new Date().toISOString().slice(0, 16) + 'Z';
  const out = [];
  for (const g of games) {
    const p = prevGames.get(g.id);
    const row = { id: g.id, week: g.week, type: g.type, date: g.date, state: g.state, detail: g.detail, home: g.home, away: g.away, hs: g.hs, as: g.as,
      neutral: g.neutral, conf: g.conf, note: g.note, venue: g.venue, tv: g.tv, hrank: g.hrank, arank: g.arank, hrec: g.hrec, arec: g.arec };
    let view;
    if (g.state === 'pre') { const v = m.predict(g); view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, frozen: now }; }
    /* a call frozen before kickoff keeps its view after. A frozen row carries its rating gap (diff);
       ones frozen before it did are rebuilt from the frozen ratings and home field, which is how
       the gap was made, so a game frozen on Thursday and final on Friday still has its margin */
    else if (p && p.frozen) view = { pHome: p.pHome, diff: p.diff ?? (p.rh - p.ra + (g.neutral ? 0 : model.params.hfa)), rh: p.rh, ra: p.ra, frozen: p.frozen };
    else if (replayed[g.id]) { const v = replayed[g.id]; view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, frozen: null }; }
    else { const v = m.predict(g); view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, frozen: null }; }   // live with no frozen call: the current view
    const mu = spreadOf(view.diff, model);
    Object.assign(row, { pHome: +view.pHome.toFixed(4), rh: +view.rh.toFixed(1), ra: +view.ra.toFixed(1), diff: +view.diff.toFixed(2), mu: +mu.toFixed(2), spread: roundHalf(-mu), frozen: view.frozen });
    /* the line: taken while the game is still to come, kept once it is not */
    let line = null;
    if (g.state === 'pre' && g.odds) line = Object.assign({}, g.odds, { at: now });
    else if (p && p.line) line = p.line;
    else if (g.state === 'pre' && p && p.line) line = p.line;
    row.line = line;
    row.pick = view.pHome >= 0.5 ? 'home' : 'away';
    if (line && line.homeLine !== null && line.homeLine !== undefined) {
      const cp = coverProbs(mu, model.sd, line.homeLine);
      row.cover = { home: +cp.cover.toFixed(3), push: +cp.push.toFixed(3), away: +cp.lose.toFixed(3) };
      row.edge = +(mu + line.homeLine).toFixed(1);                       // points in the home side's favour against the line
      /* no side against a school from the lower division: the model has almost nothing on it
         and the book's number is the better guess */
      const fcs = !teams[g.home].fbs || !teams[g.away].fbs;
      row.atsPick = !fcs && Math.abs(row.edge) >= ATS_EDGE ? (row.edge > 0 ? 'home' : 'away') : null;
      if (fcs) row.noAts = 'fcs';
    }
    if (g.state === 'final' && g.hs !== null) {
      const margin = g.hs - g.as;
      const res = { su: (margin > 0) === (row.pick === 'home') };
      if (line && line.homeLine !== null && line.homeLine !== undefined) {
        const covered = margin + line.homeLine;
        res.homeCover = covered > 0 ? 'win' : covered < 0 ? 'loss' : 'push';
        if (row.atsPick) res.ats = res.homeCover === 'push' ? 'push' : ((res.homeCover === 'win') === (row.atsPick === 'home') ? 'win' : 'loss');
        else res.ats = null;
      }
      row.result = res;
    }
    out.push(row);
  }

  /* the record: straight up on every game, against the spread where a side was taken */
  const record = { su: { w: 0, l: 0 }, ats: { w: 0, l: 0, p: 0 }, major: { su: { w: 0, l: 0 }, ats: { w: 0, l: 0, p: 0 } }, byWeek: {}, bands: {} };
  const bandOf = p => { const c = Math.max(p, 1 - p); return c >= 0.8 ? '80+' : c >= 0.65 ? '65-80' : '50-65'; };
  for (const r of out) {
    if (!r.result) continue;
    const wk = `${r.type === 3 ? 'post' : r.week}`; const bw = record.byWeek[wk] = record.byWeek[wk] || { su: { w: 0, l: 0 }, ats: { w: 0, l: 0, p: 0 } };
    const bd = record.bands[bandOf(r.pHome)] = record.bands[bandOf(r.pHome)] || { su: { w: 0, l: 0 }, ats: { w: 0, l: 0, p: 0 } };
    const isMajor = teams[r.home]?.major || teams[r.away]?.major;
    const bump = (t) => { r.result.su ? t.su.w++ : t.su.l++; if (r.result.ats === 'win') t.ats.w++; else if (r.result.ats === 'loss') t.ats.l++; else if (r.result.ats === 'push') t.ats.p++; };
    bump(record); bump(bw); bump(bd); if (isMajor) bump(record.major);
  }

  /* the current week: the first with a game still to play */
  const open = out.filter(g => g.state !== 'final');
  const week = open.length ? (open[0].type === 3 ? 'post' : Math.min(...open.filter(g => g.type === 2).map(g => g.week))) : 'post';

  const playoff = playoffPicture(teams, games, ratings, model, rankings, confs);
  log(`playoff picture: ${playoff.bracket.field.slice(0, 4).map(f => teams[f.team].abbr).join(', ')} on the byes; ${SIMS} sims`);

  const state = {
    published: new Date().toISOString(), season: SEASON, week, model, confs, p4: [...P4], teams, rankings, games: out, record, playoff,
    atsEdge: ATS_EDGE,
  };
  const before = prev ? JSON.stringify(Object.assign({}, prev, { published: null })) : null;
  const after = JSON.stringify(Object.assign({}, state, { published: null }));
  if (before === after) { log('nothing changed; state.json left alone'); return; }
  fs.writeFileSync(STATE, JSON.stringify(state));
  const fin = out.filter(g => g.result).length;
  log(`wrote cfb/state.json: week ${week}, ${fin} graded (${record.su.w}-${record.su.l} straight up, ${record.ats.w}-${record.ats.l}-${record.ats.p} against the spread), ${Object.keys(teams).length} teams`);
}
main().catch(e => { console.error(e); process.exit(1); });
