/* The college job: read this season from ESPN, rate every team, call every game, freeze
   the call and the line before kickoff, grade what has finished, simulate the playoff
   picture and write cfb/state.json, which is everything the page shows.

    node cfb/tools/update.js              the season, from ESPN
    node cfb/tools/update.js --offline    from the feed files in cfb/tools/out/ (a missing file is a failed download)

   Free: ESPN's public feeds only, nothing spends a credit. The season and the clock come
   from season.js (CFB_SEASON and CFB_NOW stand in for them in tests); CFB_STATE, CFB_OUT,
   CFB_TEAMS and CFB_HISTORY move the files, so the simulation runs the job in a scratch folder.

   What the record grades is what the page showed before kickoff. A game's call and line are
   taken at every run while it is still to come and kept, untouched, from its kickoff on: by
   ESPN's status or by the clock, whichever says so first, so a run that lands after kickoff
   while ESPN still lists the game as scheduled cannot re-take them. A line is DraftKings' number
   as ESPN carries it at this run; when ESPN stops carrying a game's line, the old number is not
   kept for a game still to come (a look-ahead line weeks old would otherwise read as today's,
   with a call against it and a price to bet). Games that were already over when this job first
   ran are graded from the replay and marked so; a postponed or cancelled game is neither called
   nor graded; a placeholder opponent (ESPN's TBD) is shown but never counted.

   A download the season needs that fails is never published as if it were the season:
   - a week's scoreboard (or the postseason's) that does not download, after six tries, is
     carried from the last publish when every game in it is final or more than five days off,
     and said so on the page; otherwise the run stops here with exit 1 and writes nothing, so
     the last good state stays live. A scoreboard that comes back with under half the games
     the last publish had for that week stops the run the same way.
   - a game the last publish had graded or under way that ESPN no longer lists is kept as published.
   - the rankings that do not download are carried from the last publish, dated, and said so.
   - the first run of a new season appends the season just finished to data/history.json from
     the same scoreboards; if that pull fails the run stops (the new season cannot be rated).

   The model is cfb/tools/elo.js with the parameters fit.js wrote to cfb/data/model.json,
   replayed over cfb/data/history.json and then this season's finished games, in date
   order. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const HIST = require('./history');
const C = require('./season');
const { Elo, expected, spreadOf, coverProbs, roundHalf } = require('./elo');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = process.env.CFB_OUT || path.join(__dirname, 'out');
const STATE = process.env.CFB_STATE || path.join(ROOT, 'state.json');
const TEAMS = process.env.CFB_TEAMS || path.join(DATA, 'teams.json');
const HISTORY = process.env.CFB_HISTORY || path.join(DATA, 'history.json');
const NOW_MS = C.nowMs(), RUN = C.stamp(NOW_MS);
const SEASON = C.season();
const ARGS = new Set(process.argv.slice(2));
const OFFLINE = ARGS.has('--offline');
const SCHEMA = 2;
const P4 = new Set(['1', '4', '5', '8']);          // ACC, Big 12, Big Ten, SEC
const NOTRE_DAME = '87';
const INDEPENDENTS = '18';
const ATS_EDGE = 3;                                 // points the model must disagree with the line by to take a side
const SIMS = 3000;
const LOSS_COST = 55;                               // the committee proxy: Elo minus this per loss
const CARRY_DAYS = 5;                               // a week that did not download is carried only if every game is final or this far off
const STALE_DAYS = 2;                               // a game ESPN still lists as scheduled this long after kickoff no longer holds its week open
const DAY = 864e5;

const log = m => console.log(new Date().toISOString().slice(11, 19), m);
class Refusal extends Error {}

function rec(w, l) { return `${w}-${l}`; }
const isPh = id => E.isPlaceholder(id);
const realGame = g => !isPh(g.home) && !isPh(g.away);
/* a game still to be played: not final, not called off, not a scheduled game ESPN never updated */
const isOpen = g => g.state !== 'final' && g.state !== 'postponed' && !(g.state === 'pre' && Date.parse(g.date) < NOW_MS - STALE_DAYS * DAY);
/* kicked off, by ESPN's status or by the clock; a game whose time is still TBD is dated at the
   start of its day (midnight Eastern), so from then on it may have started and its call holds */
const kickedOff = g => g.state === 'live' || g.state === 'final' || (g.state === 'pre' && Date.parse(g.date) <= NOW_MS);
const keyOf = (type, week) => type === 3 ? 'post' : 'w' + week;
const labelOf = key => key === 'post' ? 'the postseason' : 'week ' + key.slice(1);

/* one feed: from ESPN, saved to out/ for an offline rerun; offline, a missing file is a failed download */
async function feed(file, fetcher) {
  const f = path.join(OUT, file);
  if (OFFLINE) { if (!fs.existsSync(f)) throw new Error(`no saved ${file}`); return JSON.parse(fs.readFileSync(f, 'utf8')); }
  const j = await fetcher();
  fs.writeFileSync(f, JSON.stringify(j));
  return j;
}

/* a published row back into the raw shape gameRow() gives, for a game carried from the last publish */
const rawOf = (r, teams) => ({ id: r.id, season: SEASON, type: r.type, week: r.week, date: r.date, state: r.state, detail: r.detail, home: r.home, away: r.away,
  hs: r.hs, as: r.as, neutral: r.neutral, conf: r.conf, note: r.note, venue: r.venue, tv: r.tv, hrank: r.hrank, arank: r.arank, hrec: r.hrec, arec: r.arec,
  hconf: teams[r.home]?.conf || null, aconf: teams[r.away]?.conf || null, odds: null, tbd: !!r.tbd, carried: true });

async function pullSeason(prev, notes) {
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = []; for (let w = 1; w <= 16; w++) jobs.push([w, 2]); jobs.push([1, 3]);
  const teams = JSON.parse(fs.readFileSync(TEAMS, 'utf8'));
  const got = [];
  for (let i = 0; i < jobs.length; i += 4) {
    got.push(...await Promise.all(jobs.slice(i, i + 4).map(([w, t]) => feed(`sb_${SEASON}_${t}_${w}.json`, () => E.scoreboard(SEASON, w, t))
      .then(json => ({ key: keyOf(t, w), json }), err => ({ key: keyOf(t, w), err })))));
  }
  const games = new Map(), count = {};
  for (const r of got) {
    if (r.err) { log(`${labelOf(r.key)}: ${r.err.message}`); continue; }
    E.teamsOf(r.json, teams.teams);
    count[r.key] = 0;
    for (const ev of r.json.events || []) {
      const g = E.gameRow(ev);
      if (!g || g.season !== SEASON) continue;
      if (g.type !== 2) g.type = 3;
      games.set(g.id, g);
      if (realGame(g)) count[r.key]++;
    }
  }

  /* what the last publish of this season had, week by week, to carry or to hold the feed to */
  const prevRows = prev && prev.season === SEASON ? prev.games || [] : null;
  const prevTeams = (prev && prev.teams) || {};
  const byKey = new Map();
  for (const r of prevRows || []) { const k = keyOf(r.type, r.week); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(r); }
  const refuse = [], carried = new Map();
  const settled = r => r.state === 'final' || r.state === 'postponed' || Date.parse(r.date) - NOW_MS > CARRY_DAYS * DAY;
  for (const r of got.filter(x => x.err)) {
    const rows = byKey.get(r.key) || [];
    if (!prevRows) { refuse.push(`${labelOf(r.key)} did not download (${r.err.message}) and there is no earlier publish of ${SEASON} to carry`); continue; }
    const live = rows.filter(x => !settled(x));
    if (live.length) { refuse.push(`${labelOf(r.key)} did not download (${r.err.message}); ${live.length} of its ${rows.length} games are under way or within ${CARRY_DAYS} days of kickoff`); continue; }
    for (const x of rows) carried.set(x.id, x);
    notes.push(`ESPN's scoreboard for ${labelOf(r.key)} did not answer at this run; its ${rows.length} games are shown as last published.`);
  }
  for (const r of got.filter(x => !x.err)) {
    const before = (byKey.get(r.key) || []).filter(realGame).length;
    if (before >= 4 && count[r.key] < before / 2) refuse.push(`ESPN returned ${count[r.key]} games for ${labelOf(r.key)} where the last publish had ${before}`);
  }
  if (refuse.length) throw new Refusal(refuse.join('; '));
  /* a game the last publish had graded or under way that ESPN no longer lists keeps its row */
  for (const p of prevRows || []) {
    if (games.has(p.id) || carried.has(p.id)) continue;
    if ((p.state === 'final' || p.state === 'live') && realGame(p)) { carried.set(p.id, p); notes.push(`${prevTeams[p.away]?.abbr || p.away} @ ${prevTeams[p.home]?.abbr || p.home} is no longer in ESPN's schedule; kept as last published.`); }
    else log(`${p.id} (${prevTeams[p.away]?.abbr || p.away} @ ${prevTeams[p.home]?.abbr || p.home}, ${p.state}) is no longer in ESPN's schedule and had not been played; dropped`);
  }
  for (const p of carried.values()) games.set(p.id, rawOf(p, prevTeams));

  /* the polls: this season's, read now; carried and dated when ESPN does not answer */
  let rankings = {};
  const prevPolls = prev && prev.season === SEASON ? prev.rankings || {} : {};
  const carryPolls = why => {
    const out = {};
    for (const [k, v] of Object.entries(prevPolls)) out[k] = Object.assign({}, v, { carried: true, read: v.read || (prev.published || '').slice(0, 16) + 'Z' });
    if (Object.keys(out).length) notes.push(`${why}; the polls shown are the ones read ${Object.values(out)[0].read.slice(0, 10)}.`);
    else notes.push(`${why}; no poll is shown.`);
    return out;
  };
  try {
    const raw = await feed('rankings_raw.json', () => E.getJSON(E.RANKINGS));
    rankings = E.rankingsOf(raw, SEASON);
    for (const v of Object.values(rankings)) v.read = RUN;
    if (!Object.keys(rankings).length && Object.keys(prevPolls).length) rankings = carryPolls(`ESPN's rankings feed carried no ${SEASON} poll at this run`);
  } catch (e) { log(`rankings: ${e.message}`); rankings = carryPolls(`ESPN's rankings did not answer at this run (${e.message})`); }

  if (!OFFLINE) { try { teams.confs = await E.conferences(); } catch (e) { log(`conferences: ${e.message}; the saved list kept`); } }
  if (!teams.confs || !Object.keys(teams.confs).length) throw new Refusal('no conference list: neither ESPN nor teams.json has one, so no team can be called FBS');
  return { games: [...games.values()].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0), teams, rankings };
}

/* data/history.json must reach the season before this one: on the first run of a new season
   the season just finished is pulled from the same scoreboards and appended */
async function loadHistory(notes) {
  let H = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
  const si = H.cols.indexOf('season');
  const last = H.rows.reduce((m, r) => Math.max(m, r[si]), 0);
  if (last < SEASON - 1) {
    const need = []; for (let s = last + 1; s <= SEASON - 1; s++) need.push(s);
    const rows = [];
    for (const s of need) {
      /* a scratch team table: last season's conferences must not overwrite this season's */
      try { rows.push(...await HIST.seasonRows(s, (y, w, t) => feed(`sb_${y}_${t}_${w}.json`, () => E.scoreboard(y, w, t)), {})); }
      catch (e) { throw new Refusal(`history.json ends at ${last} and the ${s} season did not download (${e.message}); ${SEASON} cannot be rated without it. Run node cfb/tools/history.js ${s} ${s} when ESPN answers`); }
    }
    if (!rows.length) throw new Refusal(`history.json ends at ${last} and ESPN has no finals for ${need.join(', ')}`);
    H = HIST.mergeRows(H, need, rows);
    fs.writeFileSync(HISTORY, JSON.stringify(H));
    log(`history.json: ${need.join(', ')} appended, ${rows.length} games`);
    notes.push(`The ${need.join(', ')} season was added to the model's history at this run.`);
  }
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

/* one season played out: returns the champion of each conference and each team's record.
   `games` is the regular season's real games: a placeholder opponent is not a game anyone can win */
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

const pairKey = (a, b) => [a, b].sort().join('|');
/* the bracket played out: a game already played keeps its result, a team already out loses */
function simulatePlayoff(field, ratings, hfa, rnd, cfp) {
  const win = (a, b, home) => {
    if (cfp) {
      const k = cfp.decided.get(pairKey(a, b)); if (k) return k;
      if (cfp.out.has(a) && !cfp.out.has(b)) return b;
      if (cfp.out.has(b) && !cfp.out.has(a)) return a;
    }
    return rnd() < expected(ratings[a] - ratings[b] + (home ? hfa : 0)) ? a : b;
  };
  const t = i => field[i - 1].team;
  const r1 = [win(t(8), t(9), true), win(t(7), t(10), true), win(t(6), t(11), true), win(t(5), t(12), true)];
  const q = [win(t(1), r1[0]), win(t(2), r1[1]), win(t(3), r1[2]), win(t(4), r1[3])];
  const s = [win(q[0], q[3]), win(q[1], q[2])];
  return win(s[0], s[1]);
}

/* the real playoff, once ESPN has its games: who is out, who won, and once the first round's
   eight and the four byes are known, the field seeded as the bracket is drawn (the byes and the
   first round's hosts in the committee's order, each host's opponent at the matching seed) */
function cfpOf(games, rankings, ratings) {
  const cfpGames = games.filter(g => g.type === 3 && /college football playoff|\bCFP\b/i.test(g.note || '')).sort((a, b) => a.date < b.date ? -1 : 1);
  const decided = new Map(), out = new Set(); let champion = null;
  for (const g of cfpGames) {
    if (g.state !== 'final' || g.hs === null || !realGame(g)) continue;
    const w = g.hs > g.as ? g.home : g.away, l = w === g.home ? g.away : g.home;
    decided.set(pairKey(g.home, g.away), w); out.add(l);
    if (/national championship/i.test(g.note || '')) champion = w;
  }
  const res = { set: false, decided, out, champion, field: null };
  const named = cfpGames.filter(g => /first round/i.test(g.note || ''));
  const first = named.length ? named : cfpGames.slice(0, 4);
  if (first.length !== 4 || !first.every(realGame)) return res;
  const firstTeams = new Set(first.flatMap(g => [g.home, g.away]));
  const byes = [...new Set(cfpGames.filter(g => !first.includes(g)).flatMap(g => [g.home, g.away]).filter(id => !isPh(id) && !firstTeams.has(id)))];
  if (byes.length !== 4) return res;
  const poll = rankings.cfp || rankings.ap || null;
  const rk = id => { const r = poll && poll.ranks.find(x => x.team === id); return r ? r.rank : 100 + (2000 - (ratings[id] || 0)) / 1000; };
  byes.sort((a, b) => rk(a) - rk(b));
  const hosts = first.map(g => g.home).sort((a, b) => rk(a) - rk(b));
  const opp = id => first.find(g => g.home === id).away;
  const seeds = [...byes, ...hosts, ...hosts.slice().reverse().map(opp)];
  res.set = true;
  res.field = seeds.map((team, i) => ({ seed: i + 1, team }));
  return res;
}

function playoffPicture(teams, games, ratings, model, rankings, confs) {
  /* a seeded generator so a run that changes nothing writes the same numbers */
  let seed = 20260901; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (const g of games) g.isChamp = g.type === 2 && realGame(g) && /championship/i.test(g.note || '') && teams[g.home]?.conf && teams[g.home].conf === teams[g.away]?.conf;
  const reg = games.filter(g => g.type === 2 && realGame(g) && g.state !== 'postponed');
  const regOver = !games.some(g => g.type === 2 && isOpen(g));
  const cfp = cfpOf(games, rankings, ratings);

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
  const today = fieldOf(order, champs);
  const champSet = new Set(Object.values(champs));
  /* the field the odds play: the real bracket once it is drawn, today's once the regular season
     is over (nothing left to change it), the proxy's in each simulated season before that */
  const fixed = cfp.set ? cfp.field : regOver ? today : null;

  const tally = {}; for (const id of Object.keys(teams)) if (teams[id].fbs) tally[id] = { playoff: 0, bye: 0, conf: 0, title: 0, wins: 0 };
  for (let i = 0; i < SIMS; i++) {
    const { S: SS, champs: cc } = simulateSeason(teams, reg, ratings, model, rnd);
    const field = fixed || fieldOf(Object.keys(SS).sort((a, b) => proxy(b, SS, ratings) - proxy(a, SS, ratings)), cc);
    for (const c of Object.values(cc)) if (tally[c]) tally[c].conf++;
    for (const f of field) { if (!tally[f.team]) continue; tally[f.team].playoff++; if (f.seed <= 4) tally[f.team].bye++; }
    const champ = simulatePlayoff(field, ratings, model.params.hfa, rnd, cfp);
    if (tally[champ]) tally[champ].title++;
    for (const id of Object.keys(SS)) tally[id].wins += SS[id].w;
  }
  const odds = {};
  for (const id of Object.keys(tally)) { const t = tally[id]; odds[id] = { playoff: +(t.playoff / SIMS).toFixed(3), bye: +(t.bye / SIMS).toFixed(3), conf: +(t.conf / SIMS).toFixed(3), title: +(t.title / SIMS).toFixed(3), expWins: +(t.wins / SIMS).toFixed(1) }; }
  for (const id of cfp.out) if (odds[id]) odds[id].title = 0;

  const shown = (cfp.set ? cfp.field : today).map(f => ({ seed: f.seed, team: f.team, auto: champSet.has(f.team) && (cfp.set || f.auto) }));
  const field = shown.map(f => Object.assign(f, { conf: f.auto ? teams[f.team].conf : null, rank: poll ? (poll.ranks.find(r => r.team === f.team)?.rank ?? null) : null,
    record: rec(S[f.team]?.w || 0, S[f.team]?.l || 0), out: cfp.out.has(f.team), champion: cfp.champion === f.team }));
  const basis = cfp.set ? 'committee\'s bracket' : poll ? (rankings.cfp ? 'CFP rankings' : 'AP poll') : 'model';
  return { sims: SIMS, lossCost: LOSS_COST, odds, standings, champs, bracket: { basis, set: cfp.set, final: regOver, field } };
}

/* ---------- the record ---------- */
const su0 = () => ({ w: 0, l: 0 }), ats0 = () => ({ w: 0, l: 0, p: 0 });
/* the book's favourite: the side the spread favours, the moneyline where the spread is level */
function favouriteOf(line) {
  if (!line) return null;
  if (line.homeLine !== null && line.homeLine !== undefined && line.homeLine !== 0) return line.homeLine < 0 ? 'home' : 'away';
  if (line.homeML !== null && line.homeML !== undefined && line.awayML !== null && line.awayML !== undefined && line.homeML !== line.awayML) return line.homeML < line.awayML ? 'home' : 'away';
  return null;
}
function recordOf(out, teams) {
  const record = { su: su0(), ats: ats0(), major: { su: su0(), ats: ats0() }, byWeek: {}, bands: {},
    live: { su: su0(), ats: ats0() }, replayed: { su: su0() }, fbs: { su: su0(), ats: ats0() }, book: { games: 0, model: su0(), book: su0() } };
  const bandOf = p => { const c = Math.max(p, 1 - p); return c >= 0.8 ? '80+' : c >= 0.65 ? '65-80' : '50-65'; };
  for (const r of out) {
    if (!r.result) continue;
    const wk = `${r.type === 3 ? 'post' : r.week}`; const bw = record.byWeek[wk] = record.byWeek[wk] || { su: su0(), ats: ats0() };
    const bd = record.bands[bandOf(r.pHome)] = record.bands[bandOf(r.pHome)] || { su: su0(), ats: ats0() };
    const isMajor = teams[r.home]?.major || teams[r.away]?.major;
    const suOnly = t => { r.result.su ? t.w++ : t.l++; };
    const bump = (t) => { suOnly(t.su); if (r.result.ats === 'win') t.ats.w++; else if (r.result.ats === 'loss') t.ats.l++; else if (r.result.ats === 'push') t.ats.p++; };
    bump(record); bump(bw); bump(bd); if (isMajor) bump(record.major);
    if (r.frozen) bump(record.live); else suOnly(record.replayed.su);
    if (teams[r.home]?.fbs && teams[r.away]?.fbs) bump(record.fbs);
    /* the baseline: DraftKings' favourite on the games the model called before kickoff with a line */
    const fav = r.frozen ? favouriteOf(r.line) : null;
    if (fav) {
      record.book.games++;
      suOnly(record.book.model);
      (fav === 'home') === (r.hs > r.as) ? record.book.book.w++ : record.book.book.l++;
    }
  }
  return record;
}

/* ---------- the run ---------- */
async function main() {
  const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
  const prevGames = new Map(((prev && prev.season === SEASON && prev.games) || []).map(g => [g.id, g]));
  const model = JSON.parse(fs.readFileSync(path.join(DATA, 'model.json'), 'utf8'));
  const notes = [];
  const { games, teams: T, rankings } = await pullSeason(prev, notes);
  const confs = T.confs; const FBS = new Set(Object.keys(confs));
  const history = await loadHistory(notes);
  log(`${SEASON}: ${games.length} games, ${games.filter(g => g.state === 'final').length} final; ${Object.keys(rankings).join(', ') || 'no'} rankings`);

  /* replay: the history, then this season's finals, keeping each one's pre-game view */
  const m = new Elo(model.params, FBS);
  for (const g of history) { m.newSeason(g.season); m.play(g); }
  m.newSeason(SEASON);
  const replayed = {};
  for (const g of games) if (g.state === 'final' && g.hs !== null) replayed[g.id] = m.play(g);
  const ratings = m.r;

  /* the team table, with this season's records, the model's rank and the polls */
  const seen = new Set(); for (const g of games) { seen.add(g.home); seen.add(g.away); }
  const teams = {};
  for (const id of seen) {
    const t = T.teams[id] || { abbr: id, name: id, short: id };
    const fbs = !isPh(id) && FBS.has(String(t.conf));
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

  /* every game's call and line: taken while it is to come, frozen from kickoff on */
  const out = [];
  for (const g of games) {
    const p = prevGames.get(g.id);
    const placeholder = !realGame(g);
    const started = kickedOff(g);
    const row = { id: g.id, week: g.week, type: g.type, date: g.date, state: g.state, detail: g.detail, home: g.home, away: g.away, hs: g.hs, as: g.as,
      neutral: g.neutral, conf: g.conf, note: g.note, venue: g.venue, tv: g.tv, hrank: g.hrank, arank: g.arank, hrec: g.hrec, arec: g.arec };
    if (g.tbd) row.tbd = true;
    if (placeholder) row.placeholder = true;
    if (g.carried) row.carried = true;
    let view;
    if (g.state === 'pre' && !started) { const v = m.predict(g); view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, frozen: RUN }; }
    /* a call frozen before kickoff keeps its view after. A frozen row carries its rating gap (diff);
       ones frozen before it did are rebuilt from the frozen ratings and home field, which is how
       the gap was made, so a game frozen on Thursday and final on Friday still has its margin */
    else if (p && p.frozen) view = { pHome: p.pHome, diff: p.diff ?? (p.rh - p.ra + (g.neutral ? 0 : model.params.hfa)), rh: p.rh, ra: p.ra, frozen: p.frozen };
    else if (replayed[g.id]) { const v = replayed[g.id]; view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, frozen: null }; }
    else { const v = m.predict(g); view = { pHome: v.pHome, diff: v.diff, rh: v.rh, ra: v.ra, frozen: null }; }   // under way with no frozen call, or called off: the current view
    const mu = spreadOf(view.diff, model);
    Object.assign(row, { pHome: +view.pHome.toFixed(4), rh: +view.rh.toFixed(1), ra: +view.ra.toFixed(1), diff: +view.diff.toFixed(2), mu: +mu.toFixed(2), spread: roundHalf(-mu), frozen: view.frozen });
    /* the line: ESPN's, read at this run, while the game is to come; from kickoff, the one the
       last run before it read; none for a game called off or with an opponent still TBD */
    let line = null;
    if (placeholder || g.state === 'postponed') line = null;
    else if (!started) line = g.odds ? Object.assign({}, g.odds, { at: RUN }) : (g.carried && p ? p.line : null);
    else line = p ? p.line : null;
    row.line = line;
    row.pick = placeholder ? null : view.pHome >= 0.5 ? 'home' : 'away';
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
    if (g.state === 'final' && g.hs !== null && !placeholder) {
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

  const record = recordOf(out, teams);

  /* the current week: the first regular-season week with a game still to play (a bowl the same
     day as Army-Navy does not end the regular season), the postseason after; the phase says
     where the season is */
  const open = out.filter(isOpen);
  const openReg = open.filter(g => g.type === 2), openPost = open.filter(g => g.type === 3);
  const week = openReg.length ? Math.min(...openReg.map(g => g.week)) : 'post';
  const anyFinal = out.some(g => g.state === 'final');
  const phase = openReg.length ? (anyFinal ? 'regular' : 'opening') : openPost.length ? 'postseason' : anyFinal ? 'over' : 'opening';

  const playoff = playoffPicture(teams, games, ratings, model, rankings, confs);
  log(`playoff picture (${playoff.bracket.basis}): ${playoff.bracket.field.slice(0, 4).map(f => teams[f.team].abbr).join(', ')} on the byes; ${SIMS} sims`);

  const state = {
    schema: SCHEMA, published: new Date(NOW_MS).toISOString(), run: RUN, season: SEASON, phase, week, model, confs, p4: [...P4], teams, rankings, games: out, record, playoff,
    atsEdge: ATS_EDGE, notes,
  };
  for (const n of notes) log('note: ' + n);
  const strip = s => JSON.stringify(Object.assign({}, s, { published: null, run: null }));
  fs.writeFileSync(TEAMS, JSON.stringify(T));
  if (prev && strip(prev) === strip(state)) { log('nothing changed; state.json left alone'); return; }
  fs.writeFileSync(STATE, JSON.stringify(state));
  const fin = out.filter(g => g.result).length;
  log(`wrote ${path.relative(process.cwd(), STATE) || STATE}: ${SEASON} ${phase}, week ${week}, ${fin} graded (${record.su.w}-${record.su.l} straight up, ${record.live.su.w}-${record.live.su.l} called before kickoff, ${record.ats.w}-${record.ats.l}-${record.ats.p} against the spread), ${Object.keys(teams).length} teams`);
}
main().catch(e => {
  if (e instanceof Refusal) console.error(`REFUSED, nothing written, the last publish stays live: ${e.message}`);
  else console.error(e);
  process.exit(1);
});
