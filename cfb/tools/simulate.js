/* The job run end to end over fabricated seasons, so what it does with a game kicking off, a
   feed that fails, a line ESPN drops, a postponement, Army-Navy week, the playoff and a new
   season is proved before the real thing happens.

    node cfb/tools/simulate.js            must end "0 failures"

   The real schedule (cfb/state.json) is played with invented scores. ESPN's scoreboards,
   rankings and the CFB News feeds are written in their shapes (fixtures.js) to a scratch folder
   and update.js and news.js are run --offline over them, the clock set by CFB_NOW, as the job
   would run through a week:
     1  the week's lines are up (calls frozen; five look-ahead lines on the next week)
     2  half the week has kicked off: ESPN still lists some as scheduled, with a moved line, has
        dropped the look-ahead lines, has called one game off after it was called and no longer
        lists another that kicked off (the frozen calls and lines must hold, the dropped game's
        too; the dropped lines must go)
     3  the week is final (graded on the frozen calls; the game called off was finished after
        all and is graded on the line frozen before its kickoff; the next week current)
     4  the next week's scoreboard fails (the run refuses, nothing written)
     5  a far week and the rankings fail (carried from the last publish, said so)
     6  a game is postponed, and the feed no longer carries the CFP ranking (neither called nor
        graded, the week not held open; the ranking carried and dated)
   then, each in its own folder: a line ESPN leaves out on the last run before kickoff (held for
   the grade, never offered; one read more than a day before kickoff is not); Army-Navy week with a bowl
   earlier the same day; the conference title games over with Army-Navy still to play and no
   playoff game listed (the odds play the bracket shown); the 2025 playoff from
   data/history.json, between rounds and over; and the first run of the next season (last season
   appended to the history from the same scoreboards, or a refusal when that pull fails, has an
   empty week or comes back short of the last publish). After each run the smoke test runs,
   strict, over the files it wrote and the last publish before it. Nothing in cfb/ is written:
   the scratch folder is os.tmpdir(), removed at the end (CFB_SIM_KEEP=1 keeps it).

   CFB_SIM_TOOLS runs update.js and news.js from another folder (the gate's own tests run a
   mutated copy through here and expect it to fail); the smoke test is always this folder's. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const F = require('./fixtures');
const C = require('./season');

const ROOT = path.join(__dirname, '..');
const TOOLS = process.env.CFB_SIM_TOOLS || __dirname;
const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'state.json'), 'utf8'));
const TEAMS0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'teams.json'), 'utf8'));
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'cfb-sim-'));
const SEASON0 = real.season;
const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const say = m => console.log(m);
const H = 3600e3, DAY = 864e5;
const iso = ms => new Date(ms).toISOString().slice(0, 16) + 'Z';
const isPh = id => !(Number(id) > 0);
const realG = g => !isPh(g.home) && !isPh(g.away);
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

/* ---------- the runs ---------- */
function folder(name) {
  const d = path.join(SCRATCH, name); fs.mkdirSync(path.join(d, 'out'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'data', 'teams.json'), path.join(d, 'teams.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'history.json'), path.join(d, 'history.json'));
  return d;
}
const envOf = (d, now, extra) => Object.assign({}, process.env, { CFB_NOW: new Date(now).toISOString(), CFB_OUT: path.join(d, 'out'), CFB_STATE: path.join(d, 'state.json'),
  CFB_TEAMS: path.join(d, 'teams.json'), CFB_HISTORY: path.join(d, 'history.json'), CFB_NEWS: path.join(d, 'news.json') }, extra || {});
function run(script, d, now, extra) {
  const r = spawnSync(process.execPath, [path.join(TOOLS, script), '--offline'], { env: envOf(d, now, extra), encoding: 'utf8', maxBuffer: 1 << 26 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
/* the smoke test, strict, over what the run wrote and the publish before it */
function smoke(label, d, now, prev, extra) {
  const env = envOf(d, now, Object.assign({ CFB_SMOKE_STRICT: '1', CFB_PREV_STATE: prev || 'none' }, extra || {}));
  delete env.CFB_NOW;
  const r = spawnSync(process.execPath, [path.join(__dirname, 'smoke.js')], { env, encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = (r.stdout || '') + (r.stderr || '');
  chk(r.status === 0 && / 0 failures/.test(out), `${label}: the smoke test passes over the run's files\n${out.split('\n').filter(l => /FAIL|SKIP|Error/.test(l)).slice(0, 8).join('\n')}`);
}
const keep = (d, name) => { const f = path.join(d, name); fs.copyFileSync(path.join(d, 'state.json'), f); return f; };

/* ---------- the schedule, played with invented scores ---------- */
const tbdOf = g => g.tbd === true || (g.tbd === undefined && g.state === 'pre' && /^TBD$/i.test(g.detail || ''));
const sched = real.games.map(g => ({ id: g.id, type: g.type, week: g.week, date: g.date, home: g.home, away: g.away, neutral: g.neutral, conf: g.conf, note: g.note,
  venue: g.venue, tv: g.tv, tbd: tbdOf(g), detail: tbdOf(g) ? 'TBD' : 'scheduled', mu: g.mu || 0, pHome: g.pHome || 0.5 }));
const RES = {};
function score(g) {
  if (!RES[g.id]) {
    const hw = rnd() < g.pHome; const w = 17 + Math.floor(rnd() * 28), l = Math.max(0, w - 1 - Math.floor(rnd() * 24));
    RES[g.id] = hw ? { hs: w, as: l } : { hs: l, as: w };
  }
  return RES[g.id];
}
/* an invented DraftKings line around the model's own margin */
function lineOf(g, shift = 0) {
  const hl = Math.round((-g.mu + (rnd() - 0.5) * 6 + shift) * 2) / 2 || -0.5;
  const p = Math.min(0.95, Math.max(0.05, g.pHome));
  const am = q => q >= 0.5 ? -Math.round(100 * q / (1 - q) / 5) * 5 : Math.round(100 * (1 - q) / q / 5) * 5;
  return { book: 'DraftKings', details: null, total: 50.5, homeLine: hl, homeSpreadOdds: -110, awaySpreadOdds: -110, homeML: am(p), awayML: am(1 - p) };
}
const LINES = {};
const lineFor = (g, key = 'a') => (LINES[g.id + key] = LINES[g.id + key] || lineOf(g, key === 'b' ? 1 : 0));
/* the weeks: W in the middle of the season, every real game in it and the next */
const regWeeks = [...new Set(sched.filter(g => g.type === 2).map(g => g.week))].sort((a, b) => a - b);
const okWeek = w => sched.filter(g => g.type === 2 && g.week === w && realG(g)).length >= 10 && !sched.some(g => g.type === 2 && g.week === w && !realG(g))
  && sched.filter(g => g.type === 2 && g.week === w + 1 && realG(g)).length >= 6;
const cands = regWeeks.filter(okWeek);
const W = cands[Math.floor(cands.length / 2)];
const wk = w => sched.filter(g => g.type === 2 && g.week === w);
const writeFeeds = (d, season, rows, stateOf, lineOfG, omit = []) => F.writeScoreboards(path.join(d, 'out'), season, rows.map(g => Object.assign({}, g, stateOf(g))), TEAMS0.teams, { lineOf: lineOfG, omit });
/* a poll: the top 25 by the published ratings */
const apOf = (season, cfp) => {
  const top = Object.keys(real.teams).filter(id => real.teams[id].fbs).sort((a, b) => real.teams[b].rating - real.teams[a].rating).slice(0, 25);
  const ranks = top.map((team, i) => ({ rank: i + 1, prev: i + 1, team, record: null }));
  const out = { ap: { name: 'AP Top 25', week: 'Week ' + W, date: `${season}-10-01`, season, ranks } };
  if (cfp) out.cfp = { name: 'College Football Playoff Rankings', week: 'Week ' + W, date: `${season}-10-02`, season, ranks };
  return out;
};
const writePolls = (d, season, polls) => fs.writeFileSync(path.join(d, 'out', 'rankings_raw.json'), JSON.stringify(F.rankingsRaw(polls, season)));

/* ---------- the CFB News feeds ---------- */
function newsFeeds(d, S, plant) {
  const out = path.join(d, 'out'); const T = S.teams;
  const slate = S.games.filter(g => g.type === 2 && g.week === S.week && realG(g) && (T[g.home].major || T[g.away].major));
  const ids = [...new Set(slate.flatMap(g => [g.home, g.away]))];
  const stat = (n, v) => ({ name: n, displayValue: String(v) });
  for (const g of slate) {
    const side = id => ({ team: { id }, statistics: [stat('totalPointsPerGame', 30.1), stat('totalPointsPerGameAllowed', 21.4), stat('yardsPerGame', 410), stat('yardsPerGameAllowed', 350)] });
    const leaders = id => ({ team: { id }, leaders: [
      { name: 'passingYards', leaders: [{ athlete: { displayName: plant.qb[id] || `Passer ${T[id].abbr}`, position: { abbreviation: 'QB' } }, displayValue: '98/148, 1,304 YDS, 14 TD, 1 INT' }] },
      { name: 'rushingYards', leaders: [{ athlete: { displayName: `Runner ${T[id].abbr}`, position: { abbreviation: 'RB' } }, displayValue: '64 CAR, 304 YDS, 3 TD' }] }] });
    fs.writeFileSync(path.join(out, `summary_${g.id}.json`), JSON.stringify({ boxscore: { teams: [side(g.home), side(g.away)] }, leaders: [leaders(g.home), leaders(g.away)],
      predictor: { homeTeam: { gameProjection: '60.0' }, awayTeam: { gameProjection: '40.0' } }, lastFiveGames: [], broadcasts: [{ media: { shortName: 'ESPN' } }] }));
  }
  for (const id of ids) {
    const gp = 4 + (Number(id) % 2);
    fs.writeFileSync(path.join(out, `teamstat_${S.season}_${id}.json`), JSON.stringify({ splits: { categories: [
      { name: 'general', stats: [stat('gamesPlayed', gp), stat('totalPenaltyYards', 50 * gp)] },
      { name: 'passing', stats: [stat('avgGain', 6.1), stat('sacks', 2 * gp + 1), stat('netTotalYards', 400 * gp), stat('passingYardsPerGame', 250)] },
      { name: 'rushing', stats: [stat('rushingYardsPerGame', 150)] },
      { name: 'defensive', stats: [stat('sacks', 3 * gp - 1)] },
      { name: 'scoring', stats: [stat('totalPointsPerGame', 30.1)] },
      { name: 'miscellaneous', stats: [stat('thirdDownConvPct', 41.2), stat('totalTakeaways', 8), stat('totalGiveaways', 6)] }] } }));
    fs.writeFileSync(path.join(out, `teamnews_${id}.json`), JSON.stringify({ articles: plant.news[id] || [] }));
  }
  fs.writeFileSync(path.join(out, 'injuries.json'), JSON.stringify({ injuries: Object.entries(plant.injuries).map(([id, list]) => ({ id, injuries: list })) }));
  return slate;
}

/* ================= the season, a week at a time ================= */
function weekRuns() {
  if (W === undefined) { chk(false, 'the published schedule has no middle week with ten real games to simulate'); return; }
  say(`the ${SEASON0} schedule, week ${W} and ${W + 1}, in ${SCRATCH}`);
  const d = folder('season');
  const wW = wk(W).filter(realG), wN = wk(W + 1).filter(realG);
  const T0 = Math.min(...wW.map(g => Date.parse(g.date))) - 6 * H;
  const kicks = wW.map(g => Date.parse(g.date)).sort((a, b) => a - b);
  const T1 = kicks[Math.floor(kicks.length / 2)] + 60e3;
  const T2 = kicks[kicks.length - 1] + 8 * H;
  const look = wN.slice(0, 5).map(g => g.id);
  /* a placeholder opponent in week W+2, never a win for anyone */
  const host = wN[0];
  const ph = { id: '990000001', type: 2, week: W + 2, date: iso(Date.parse(host.date) + 7 * DAY), home: host.home, away: '-2', neutral: false, conf: false, note: null, venue: null, tv: null, tbd: true, detail: 'TBD', mu: 0, pHome: 0.5 };
  const rows = sched.concat([ph]);
  const fin = g => ({ state: 'final', hs: score(g).hs, as: score(g).as, detail: 'Final' });
  const pre = g => ({ state: 'pre', hs: null, as: null });
  const past = (g, t) => g.type === 2 && g.week < W && realG(g) && Date.parse(g.date) < t;

  /* 1: the week's lines are up */
  writeFeeds(d, SEASON0, rows, g => past(g, T0) ? fin(g) : pre(g), g => (g.type === 2 && g.week === W && realG(g)) || look.includes(g.id) ? lineFor(g) : null);
  writePolls(d, SEASON0, apOf(SEASON0, true));
  let r = run('update.js', d, T0);
  chk(r.code === 0, `run 1 writes the state: ${r.out.slice(-400)}`);
  if (r.code !== 0) return;
  const S1 = read(path.join(d, 'state.json'));
  chk(S1.schema === 2 && S1.week === W && S1.phase === 'regular', `run 1: week ${W}, regular season (${S1.week}, ${S1.phase})`);
  const by1 = new Map(S1.games.map(g => [g.id, g]));
  chk(wW.every(g => by1.get(g.id).frozen === iso(T0) && by1.get(g.id).line && by1.get(g.id).line.at === iso(T0)), 'run 1: every game of the week has its call and line taken at this run');
  chk(look.every(id => by1.get(id).line), 'run 1: the look-ahead lines ESPN carries are shown');
  chk(by1.get(ph.id).placeholder && by1.get(ph.id).pick === null && !by1.get(ph.id).line, 'a game against a TBD opponent is shown without a call');
  /* the news, written from feeds with the cases a tile must not get wrong planted in them */
  const g0 = S1.games.filter(g => g.type === 2 && g.week === W && realG(g) && (S1.teams[g.home].major || S1.teams[g.away].major)).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  if (g0) {
    const Hh = S1.teams[g0.home], A = S1.teams[g0.away];
    const lastOpp = S1.games.filter(x => x.state === 'final' && (x.home === g0.home || x.away === g0.home)).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    const pastT = lastOpp ? S1.teams[lastOpp.home === g0.home ? lastOpp.away : lastOpp.home] : null;
    const at = (h, extra) => Object.assign({ headline: h, description: '', published: new Date(T0 - 2 * H).toISOString(), type: 'Story', links: { web: { href: 'https://www.espn.com/college-football/story/_/id/1' } } }, extra || {});
    const plant = {
      qb: { [g0.home]: 'Planted Quarterback', [g0.away]: 'Hurt Passer' },
      injuries: { [g0.home]: [{ athlete: { displayName: 'Planted Quarterback', position: { abbreviation: 'QB' } }, status: 'Out' }, { athlete: { displayName: 'Kicker Fine', position: { abbreviation: 'PK' } }, status: 'Active' }], [g0.away]: [] },
      news: {
        [g0.home]: [at(`Point guard commits to ${Hh.short}`, { links: { web: { href: 'https://www.espn.com/mens-college-basketball/story/_/id/2' } } }),
          ...(pastT ? [at(`${Hh.short} QB ruled out vs. ${pastT.short}`)] : []), at(`${Hh.short} gets ready for ${A.short}`)],
        [g0.away]: [at(`${A.short} QB Hurt Passer out for season with torn ACL`)],
      },
    };
    newsFeeds(d, S1, plant);
    r = run('news.js', d, T0);
    chk(r.code === 0, `news.js writes the slate: ${r.out.slice(-300)}`);
    const N = read(path.join(d, 'news.json')); const n0 = N.games.find(x => x.id === g0.id);
    chk(N.schema === 2 && !!n0, 'news.json is written with the planted game on its slate');
    if (n0) {
      const hb = n0.teams.home, ab = n0.teams.away;
      chk(!(hb.around || []).some(h => /Point guard/.test(h)), `a basketball headline is not a football tile's news: ${hb.around}`);
      chk(!pastT || !(hb.around || []).some(h => h.includes(pastT.short)), `a headline about last week's opponent is not this week's news: ${hb.around}`);
      chk((hb.around || []).some(h => /gets ready/.test(h)), `the program's own football headline is kept: ${hb.around}`);
      chk((hb.leaders || []).some(l => l.name === 'Planted Quarterback' && l.out), 'a season leader Out on the injury report is marked out');
      chk((ab.leaders || []).some(l => l.name === 'Hurt Passer' && l.out), 'a season leader a headline has out for the season is marked out');
      chk(!(hb.injuries || []).some(i => /active/i.test(i.status)) && hb.bullets.some(b => /Injuries/.test(b) && /out/.test(b)), 'the injury bullet keeps the Out and drops the Active');
      chk(ab.bullets.some(b => /lists nobody/.test(b)), 'a side the injury report lists nobody for says so');
      chk(hb.stats.skg !== null && Math.abs(hb.stats.skg - hb.stats.sk / hb.stats.gp) < 0.051, 'sacks are carried a game');
      /* the game summary does not answer an hour later: the preview stays, dated, not a thin one */
      fs.unlinkSync(path.join(d, 'out', `summary_${g0.id}.json`));
      r = run('news.js', d, T0 + H);
      const m0 = read(path.join(d, 'news.json')).games.find(x => x.id === g0.id);
      chk(r.code === 0 && m0 && m0.stale === N.published && sameJSON(m0.teams, n0.teams), `a game summary that does not answer keeps the last run's preview, dated (${m0 && m0.stale})`);
    }
  }
  smoke('run 1', d, T0, null);
  const P1 = keep(d, 'state1.json');

  /* 2: half the week has kicked off; ESPN lags on some, moves their line, drops the look-ahead
     lines, and has called one off after it was called (weather) */
  let flip = 0;
  const started = wW.filter(g => Date.parse(g.date) <= T1), toCome = wW.filter(g => Date.parse(g.date) > T1);
  const off2 = started[0];
  const gone2 = started.find(g => g.id !== off2.id);              // kicked off, and ESPN no longer lists it
  writeFeeds(d, SEASON0, rows.filter(g => !gone2 || g.id !== gone2.id), g => {
    if (past(g, T0)) return fin(g);
    if (g.id === off2.id) return { state: 'postponed', hs: 0, as: 0, detail: 'Postponed' };
    if (g.type === 2 && g.week === W && realG(g) && Date.parse(g.date) <= T1) return (flip++ % 2) ? { state: 'live', hs: 7, as: 3, detail: '2nd 5:00' } : pre(g);
    return pre(g);
  }, g => g.type === 2 && g.week === W && realG(g) ? lineFor(g, 'b') : null);
  r = run('update.js', d, T1);
  chk(r.code === 0, `run 2 writes the state: ${r.out.slice(-300)}`);
  const S2 = read(path.join(d, 'state.json')); const by2 = new Map(S2.games.map(g => [g.id, g]));
  const o2 = by2.get(off2.id);
  chk(o2.state === 'postponed' && !o2.result && !o2.line && o2.frozen === by1.get(off2.id).frozen, 'run 2: a game called off after its call keeps the call, loses the line and is not graded');
  chk(started.filter(g => g.id !== off2.id).every(g => { const a = by1.get(g.id), b = by2.get(g.id); return !!b && b.frozen === a.frozen && b.pHome === a.pHome && sameJSON(b.line, a.line); }),
    `run 2: the ${started.length} games that kicked off keep the call and line taken before kickoff, even where ESPN still lists them as scheduled with a new line`);
  chk(toCome.every(g => by2.get(g.id).frozen === iso(T1) && by2.get(g.id).line.at === iso(T1)), 'run 2: the games still to come are called again on the new line');
  chk(look.every(id => !by2.get(id).line && !by2.get(id).atsPick), 'run 2: a line ESPN stopped carrying is dropped, with its call against the spread');
  chk(sameJSON(o2.heldLine, by1.get(off2.id).line), 'run 2: the line frozen before the called-off game is kept aside, off the board');
  if (gone2) {
    const a = by1.get(gone2.id), b = by2.get(gone2.id);
    chk(!!b && b.gone && b.frozen === a.frozen && b.pHome === a.pHome && sameJSON(b.line, a.line) && S2.notes.some(n => /no longer in ESPN's schedule since its kickoff/.test(n)),
      `run 2: a game that kicked off and that ESPN no longer lists keeps its call and line, and the page is told (${b ? b.gone + ' ' + b.frozen : 'dropped'})`);
  }
  smoke('run 2', d, T1, P1);
  const P2 = keep(d, 'state2.json');

  /* 3: the week is final */
  writeFeeds(d, SEASON0, rows, g => (g.type === 2 && g.week <= W && realG(g)) ? fin(g) : pre(g), g => g.type === 2 && g.week === W + 1 && realG(g) ? lineFor(g) : null);
  r = run('update.js', d, T2);
  chk(r.code === 0, `run 3 writes the state: ${r.out.slice(-300)}`);
  const S3 = read(path.join(d, 'state.json')); const by3 = new Map(S3.games.map(g => [g.id, g]));
  chk(S3.week === W + 1, `run 3: the next week is current (${S3.week})`);
  chk(wW.every(g => { const a = by2.get(g.id), b = by3.get(g.id); return !!a && !!b && b.result && b.frozen === a.frozen && b.pHome === a.pHome && b.result.su === ((b.hs > b.as) === (a.pHome >= 0.5)); }), 'run 3: every game of the week is graded on the call frozen before its kickoff');
  chk(S3.record.live.su.w + S3.record.live.su.l === S3.games.filter(g => g.result && g.frozen).length && S3.record.live.su.w + S3.record.live.su.l >= wW.length, 'run 3: the record called before kickoff counts the week');
  const o3 = by3.get(off2.id);
  chk(o3.result && sameJSON(o3.line, by1.get(off2.id).line) && !o3.heldLine && o3.result.ats !== undefined, `run 3: the game called off and finished after all is graded on the line frozen before its kickoff (${o3.line && o3.line.at})`);
  if (gone2) chk(!!by3.get(gone2.id) && !by3.get(gone2.id).gone && !!by3.get(gone2.id).result, 'run 3: the dropped game back in ESPN\'s schedule is graded');
  smoke('run 3', d, T2, P2);
  const P3 = keep(d, 'state3.json');
  const bytes3 = fs.readFileSync(path.join(d, 'state.json'));

  /* 4: next week's scoreboard does not download */
  writeFeeds(d, SEASON0, rows, g => (g.type === 2 && g.week <= W && realG(g)) ? fin(g) : pre(g), g => g.type === 2 && g.week === W + 1 && realG(g) ? lineFor(g) : null, [`sb_${SEASON0}_2_${W + 1}.json`]);
  r = run('update.js', d, T2 + H);
  chk(r.code === 1 && /REFUSED/.test(r.out) && fs.readFileSync(path.join(d, 'state.json')).equals(bytes3), `run 4: a failed download of the coming week refuses the run and writes nothing (exit ${r.code})`);

  /* 5: a far week and the rankings do not download: carried and said so */
  const far = regWeeks.filter(w => wk(w).every(g => Date.parse(g.date) - (T2 + H) > 5 * DAY)).pop();
  writeFeeds(d, SEASON0, rows, g => (g.type === 2 && g.week <= W && realG(g)) ? fin(g) : pre(g), g => g.type === 2 && g.week === W + 1 && realG(g) ? lineFor(g) : null, far ? [`sb_${SEASON0}_2_${far}.json`] : []);
  fs.unlinkSync(path.join(d, 'out', 'rankings_raw.json'));
  r = run('update.js', d, T2 + H);
  chk(r.code === 0, `run 5 publishes with what it could carry: ${r.out.slice(-300)}`);
  const S5 = read(path.join(d, 'state.json'));
  chk(S5.rankings.ap && S5.rankings.ap.carried && S5.notes.some(n => /rankings/.test(n)), 'run 5: the rankings are carried from the last publish and the page is told');
  if (far) chk(S5.games.filter(g => g.type === 2 && g.week === far).every(g => g.carried) && S5.notes.some(n => n.includes('week ' + far)), `run 5: week ${far} is carried and said so`);
  smoke('run 5', d, T2 + H, P3);
  const P5 = keep(d, 'state5.json');

  /* 6: a game is postponed, and the feed no longer carries the committee's ranking */
  writePolls(d, SEASON0, apOf(SEASON0));
  const off = wN[1];
  writeFeeds(d, SEASON0, rows, g => g.id === off.id ? { state: 'postponed', hs: 0, as: 0, detail: 'Postponed' } : (g.type === 2 && g.week <= W && realG(g)) ? fin(g) : pre(g), g => g.type === 2 && g.week === W + 1 && realG(g) && g.id !== off.id ? lineFor(g) : null);
  r = run('update.js', d, T2 + 2 * H);
  const S6 = read(path.join(d, 'state.json')); const o6 = S6.games.find(g => g.id === off.id);
  chk(r.code === 0 && o6.state === 'postponed' && !o6.result && !o6.line && o6.hs === null, `run 6: a postponed game is neither graded (0-0 is not a final) nor offered (${o6 && o6.state})`);
  chk(S6.rankings.cfp && S6.rankings.cfp.carried && S6.rankings.ap && !S6.rankings.ap.carried && S6.notes.some(n => /no longer carried the College Football Playoff/.test(n)), 'run 6: a poll the feed stops carrying is kept, dated, and the page is told');
  smoke('run 6', d, T2 + 2 * H, P5);
}

/* ================= a line ESPN leaves out on the last run before kickoff ================= */
function holdRuns() {
  const d = folder('hold');
  const fbsG = g => realG(g) && real.teams[g.home] && real.teams[g.away] && real.teams[g.home].fbs && real.teams[g.away].fbs;
  const wW = wk(W).filter(fbsG).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  /* a game with another kicking off within the next 20 hours: the one held, the other's line read too long ago */
  const major = g => real.teams[g.home].major || real.teams[g.away].major;
  const i = wW.findIndex((g, j) => major(g) && j + 1 < wW.length && Date.parse(wW[j + 1].date) - Date.parse(g.date) < 20 * H && Date.parse(wW[j + 1].date) > Date.parse(g.date));
  if (i < 0) { chk(false, `week ${W} has no two FBS games within 20 hours to hold a line on`); return; }
  const tgt = wW[i], g3 = wW[i + 1], k = Date.parse(tgt.date);
  const nxt = wk(W + 1).filter(realG).find(g => Date.parse(g.date) - k > 2 * DAY);
  const tA = k - 20 * H, tB = k - 3 * H, tC = Date.parse(g3.date) + 8 * H;
  const at = t => g => {
    if (g.type === 2 && realG(g) && Date.parse(g.date) < t - 4 * H && (g.week < W || (g.week === W && Date.parse(g.date) <= tC))) return { state: 'final', hs: score(g).hs, as: score(g).as, detail: 'Final' };
    if (g.type === 2 && realG(g) && g.week === W && Date.parse(g.date) < t) return { state: 'live', hs: 7, as: 3, detail: '2nd 5:00' };
    return { state: 'pre', hs: null, as: null };
  };
  /* the held game's line puts the model five points off it, so it carries a call against the spread
     to grade: the model's margin is the job's own, read from a first pass at the same moment */
  const L = lineOf(tgt);
  const lineAt = t => g => g.id === tgt.id ? (t === tB ? null : L) : g.id === g3.id && t === tB ? null : (g.type === 2 && g.week === W && realG(g) && Date.parse(g.date) > t) || (nxt && g.id === nxt.id && t === tA) ? lineFor(g) : null;
  writeFeeds(d, SEASON0, sched, at(tA), lineAt(tA)); writePolls(d, SEASON0, apOf(SEASON0));
  let r = run('update.js', d, tA);
  chk(r.code === 0, `hold run A0: ${r.out.slice(-300)}`); if (r.code !== 0) return;
  L.homeLine = Math.round((-read(path.join(d, 'state.json')).games.find(g => g.id === tgt.id).mu + 5) * 2) / 2;
  fs.unlinkSync(path.join(d, 'state.json'));
  writeFeeds(d, SEASON0, sched, at(tA), lineAt(tA));
  r = run('update.js', d, tA);
  chk(r.code === 0, `hold run A: ${r.out.slice(-300)}`); if (r.code !== 0) return;
  smoke('hold run A', d, tA, null);
  /* the publish before run B read g3's line more than a day ago (made so: the job ran, ESPN had it then) */
  const SA = read(path.join(d, 'state.json'));
  const g3A = SA.games.find(g => g.id === g3.id); g3A.line.at = iso(tB - 30 * H); g3A.frozen = g3A.line.at;
  fs.writeFileSync(path.join(d, 'state.json'), JSON.stringify(SA));
  const PA = keep(d, 'stateA.json');
  const byA = new Map(SA.games.map(g => [g.id, g]));
  writeFeeds(d, SEASON0, sched, at(tB), lineAt(tB));
  r = run('update.js', d, tB);
  chk(r.code === 0, `hold run B: ${r.out.slice(-300)}`); if (r.code !== 0) return;
  const SB = read(path.join(d, 'state.json')); const byB = new Map(SB.games.map(g => [g.id, g]));
  const b = byB.get(tgt.id);
  chk(b.line && b.line.held && b.line.at === iso(tA) && b.line.homeLine === L.homeLine && b.atsPick, `hold run B: a line ESPN left out three hours before kickoff, read 20 hours before it, is held with its call (${JSON.stringify(b.line)}, ${b.atsPick})`);
  chk(!byB.get(g3.id).line, `hold run B: a line read more than a day before kickoff is not held (${JSON.stringify(byB.get(g3.id).line)})`);
  if (nxt) chk(byA.get(nxt.id).line && !byB.get(nxt.id).line, 'hold run B: a look-ahead line ESPN dropped a week out is not held');
  newsFeeds(d, SB, { qb: {}, injuries: {}, news: {} });
  r = run('news.js', d, tB);
  const nB = r.code === 0 ? read(path.join(d, 'news.json')).games.find(x => x.id === tgt.id) : null;
  chk(nB && /last read/.test(nB.line) && nB.teams.home.bullets.some(x => /DraftKings' last line, read/.test(x)), `hold run B: the news cites the held line as the last one read (${nB && nB.line})`);
  smoke('hold run B (line held)', d, tB, PA);
  const PB = keep(d, 'stateB.json');
  writeFeeds(d, SEASON0, sched, at(tC), lineAt(tC));
  r = run('update.js', d, tC);
  chk(r.code === 0, `hold run C: ${r.out.slice(-300)}`); if (r.code !== 0) return;
  const c = read(path.join(d, 'state.json')).games.find(g => g.id === tgt.id);
  chk(c.result && sameJSON(c.line, b.line) && c.frozen === b.frozen && ['win', 'loss', 'push'].includes(c.result.ats), `hold run C: the game is graded against the spread on the held line (${c.result && c.result.ats})`);
  smoke('hold run C (graded)', d, tC, PB);
}

/* ================= the conference title games over, Army-Navy to come, no playoff game listed ================= */
function titleRuns() {
  const d = folder('titles');
  const confOf = note => Object.keys(real.confs).find(c => note.startsWith(real.confs[c].short + ' ') || note.startsWith(real.confs[c].name.replace(/ Conference$/, '') + ' '));
  const titles = sched.filter(g => g.type === 2 && /championship/i.test(g.note || ''));
  const rows = sched.map(g => {
    if (!titles.includes(g)) return g;
    const c = confOf(g.note); const two = Object.keys(real.teams).filter(id => real.teams[id].fbs && String(real.teams[id].conf) === String(c)).sort((a, b) => real.teams[b].rating - real.teams[a].rating);
    return two.length >= 2 ? Object.assign({}, g, { home: two[0], away: two[1], neutral: true, tbd: false, detail: 'scheduled', pHome: 0.6 }) : g;
  });
  chk(rows.filter(g => titles.some(t => t.id === g.id) && realG(g)).length >= 4, 'the schedule has conference title games to play');
  const titleDay = Math.max(...titles.map(g => Date.parse(g.date)));
  const later = rows.filter(g => g.type === 2 && realG(g) && Date.parse(g.date) > titleDay);
  const now = titleDay + 14 * H;
  writeFeeds(d, SEASON0, rows, g => g.type === 2 && realG(g) && Date.parse(g.date) <= titleDay ? { state: 'final', hs: score(g).hs, as: score(g).as, detail: 'Final' } : { state: 'pre', hs: null, as: null }, () => null);
  writePolls(d, SEASON0, apOf(SEASON0, true));
  const r = run('update.js', d, now);
  chk(r.code === 0, `the title games over: ${r.out.slice(-300)}`); if (r.code !== 0) return;
  const S = read(path.join(d, 'state.json'));
  const seat = new Map(S.playoff.bracket.field.map(f => [f.team, f.seed]));
  chk(S.playoff.bracket.final && !S.playoff.bracket.set && (!later.length || S.phase === 'regular'), `the title games over: the field is decided before ESPN lists the playoff (${S.playoff.bracket.final}, ${S.playoff.bracket.set}, ${S.phase}, week ${S.week})`);
  chk(Object.entries(S.playoff.odds).every(([id, o]) => o.playoff === (seat.has(id) ? 1 : 0) && o.bye === (seat.has(id) && seat.get(id) <= 4 ? 1 : 0)), 'the title games over: the odds play the bracket shown, nobody else in');
  smoke('the title games over', d, now, null);
}

/* ================= Army-Navy week: a bowl the same morning does not end the regular season ================= */
function armyNavy() {
  const d = folder('armynavy');
  const reg = sched.filter(g => g.type === 2 && realG(g));
  const last = Math.max(...reg.map(g => Date.parse(g.date)));
  const day = new Date(last + 7 * DAY).toISOString().slice(0, 10);
  const wmax = Math.max(...reg.map(g => g.week));
  const an = Object.assign({}, reg[reg.length - 1], { id: '990000010', week: wmax, date: `${day}T20:00Z`, note: null, tbd: false });
  const bowl = Object.assign({}, reg[0], { id: '990000011', type: 3, week: 1, date: `${day}T17:00Z`, note: 'Celebration Bowl', neutral: true, tbd: false });
  const rows = sched.concat([an, bowl]);
  writeFeeds(d, SEASON0, rows, g => g.id === an.id || g.id === bowl.id || g.type === 3 || !realG(g) ? { state: 'pre', hs: null, as: null } : { state: 'final', hs: score(g).hs, as: score(g).as, detail: 'Final' }, g => g.id === an.id ? lineFor(g) : null);
  writePolls(d, SEASON0, apOf(SEASON0));
  const now = Date.parse(`${day}T12:00Z`);
  const r = run('update.js', d, now);
  const S = r.code === 0 ? read(path.join(d, 'state.json')) : {};
  chk(r.code === 0 && S.week === wmax && S.phase === 'regular', `Army-Navy week: the regular season's last game holds the week (${S.week}, ${S.phase}), the earlier bowl does not end it`);
  if (r.code === 0) smoke('Army-Navy week', d, now, null);
}

/* ================= the playoff: 2025's, from data/history.json ================= */
function playoff() {
  const Hj = read(path.join(ROOT, 'data', 'history.json')); const col = Object.fromEntries(Hj.cols.map((c, i) => [c, i]));
  const rows = Hj.rows.filter(r => r[col.season] === 2025).map(r => ({ id: r[col.id], type: r[col.type], week: r[col.week], date: r[col.date], home: r[col.home], away: r[col.away],
    hs: r[col.hs], as: r[col.as], neutral: r[col.neutral], conf: false, note: r[col.note], tbd: false }));
  const cfp = rows.filter(g => /college football playoff/i.test(g.note || ''));
  if (cfp.length !== 11) { chk(false, `the 2025 playoff in history.json has 11 games (${cfp.length})`); return; }
  const title = cfp.find(g => /national championship/i.test(g.note));
  /* the committee's seeds, 2025: the first round's hosts 5-8, their visitors 12-9, the byes 1-4 */
  const seeds = ['84', '194', '61', '2641', '2483', '145', '245', '201', '333', '2390', '2655', '256'];
  const polls = { cfp: { name: 'College Football Playoff Rankings', week: 'Final', date: '2025-12-07', season: 2025, ranks: seeds.map((team, i) => ({ rank: i + 1, prev: i + 1, team, record: null })) } };
  const d = folder('playoff');
  const between = Date.parse('2026-01-05T12:00Z');
  const asOf = t => g => g.id === title.id && t < Date.parse(title.date) ? { home: '-1', away: '-2', state: 'pre', hs: null, as: null } : Date.parse(g.date) < t ? { state: 'final', detail: 'Final' } : { state: 'pre', hs: null, as: null };
  writeFeeds(d, 2025, rows, asOf(between), () => null);
  writePolls(d, 2025, polls);
  let r = run('update.js', d, between, { CFB_SEASON: '2025' });
  chk(r.code === 0, `the 2025 playoff between rounds: ${r.out.slice(-300)}`);
  if (r.code !== 0) return;
  let S = read(path.join(d, 'state.json'));
  const out = cfp.filter(g => Date.parse(g.date) < between).map(g => g.hs > g.as ? g.away : g.home);
  chk(S.playoff.bracket.set && sameJSON(S.playoff.bracket.field.map(f => f.team), seeds), `the bracket is the committee's, drawn from ESPN's games (${S.playoff.bracket.field.map(f => f.team)})`);
  chk(out.every(id => S.playoff.odds[id].title === 0) && out.length === 8, `the eight teams out have no title chance (${out.map(id => S.playoff.odds[id].title)})`);
  chk(['84', '2483', '2390', '145'].every(id => S.playoff.odds[id].title > 0) && S.week === 'post' && S.phase === 'postseason', 'the four left share the title chances; the site is in the postseason');
  smoke('the 2025 playoff between rounds', d, between, null, { CFB_SEASON: '2025' });
  const after = Date.parse('2026-01-21T12:00Z');
  writeFeeds(d, 2025, rows, asOf(after), () => null);
  r = run('update.js', d, after, { CFB_SEASON: '2025' });
  S = read(path.join(d, 'state.json'));
  const champ = title.hs > title.as ? title.home : title.away;
  chk(r.code === 0 && S.playoff.odds[champ].title === 1 && S.phase === 'over', `the champion has the title, the season is over (${S.playoff.odds[champ] && S.playoff.odds[champ].title}, ${S.phase})`);
  smoke('the 2025 playoff over', d, after, null, { CFB_SEASON: '2025' });
}

/* ================= the next season: the last one into the history, the new one opening ================= */
function rollover() {
  const next = SEASON0 + 1;
  const d = folder('rollover');
  /* a finished season: every slot ESPN held for a team still to be decided (title games, bowls,
     the playoff) has its teams by January */
  const fbs = Object.keys(real.teams).filter(id => real.teams[id].fbs).sort((a, b) => real.teams[b].rating - real.teams[a].rating);
  let j = 0; const next2 = not => { let id; do { id = fbs[j++ % fbs.length]; } while (id === not); return id; };
  const done = sched.map(g => { if (realG(g)) return g; const home = isPh(g.home) ? next2(g.away) : g.home; return Object.assign({}, g, { home, away: isPh(g.away) ? next2(home) : g.away }); });
  const fin = g => realG(g) ? { state: 'final', hs: score(g).hs, as: score(g).as, detail: 'Final' } : { state: 'pre', hs: null, as: null };
  writeFeeds(d, SEASON0, done, fin, () => null);
  const shifted = sched.map(g => Object.assign({}, g, { id: '8' + g.id, date: iso(Date.parse(g.date) + 364 * DAY) }));
  writeFeeds(d, next, shifted, () => ({ state: 'pre', hs: null, as: null }), () => null);
  writePolls(d, SEASON0, apOf(SEASON0));                         // last season's final poll, still the feed's latest
  const now = Date.parse(`${next}-08-10T12:00Z`);
  fs.copyFileSync(path.join(ROOT, 'state.json'), path.join(d, 'state.json'));
  const histBefore = read(path.join(d, 'history.json')).rows.length;
  /* the pull of last season failing refuses the new one */
  fs.renameSync(path.join(d, 'out', `sb_${SEASON0}_2_${W}.json`), path.join(d, 'out', 'held.json'));
  let r = run('update.js', d, now);
  chk(r.code === 1 && /history/.test(r.out) && read(path.join(d, 'history.json')).rows.length === histBefore, `a new season whose predecessor cannot be pulled into the history refuses (exit ${r.code})`);
  fs.renameSync(path.join(d, 'out', 'held.json'), path.join(d, 'out', `sb_${SEASON0}_2_${W}.json`));
  /* a week that answers with no games, or with only part of them, is a hole too */
  const sbW = path.join(d, 'out', `sb_${SEASON0}_2_${W}.json`), sb2 = path.join(d, 'out', `sb_${SEASON0}_2_2.json`);
  const full = { W: fs.readFileSync(sbW), two: fs.readFileSync(sb2) };
  fs.writeFileSync(sbW, JSON.stringify({ events: [] }));
  r = run('update.js', d, now);
  chk(r.code === 1 && new RegExp(`week ${W} answered with no finals`).test(r.out) && !/the postseason answered/.test(r.out) && read(path.join(d, 'history.json')).rows.length === histBefore, `a last season with a week that answered empty refuses the new one (exit ${r.code}: ${r.out.split('\n').filter(l => /REFUSED/.test(l)).join(' ').slice(0, 200)})`);
  fs.writeFileSync(sbW, full.W);
  const part = JSON.parse(full.two); part.events = part.events.slice(0, Math.floor(part.events.length / 3));
  fs.writeFileSync(sb2, JSON.stringify(part));
  r = run('update.js', d, now);
  chk(r.code === 1 && /short of its last publish/.test(r.out) && read(path.join(d, 'history.json')).rows.length === histBefore, `a last season with a week that answered a third of its games refuses the new one (exit ${r.code}: ${r.out.split('\n').filter(l => /REFUSED/.test(l)).join(' ').slice(0, 200)})`);
  fs.writeFileSync(sb2, full.two);
  r = run('update.js', d, now);
  chk(r.code === 0, `the first run of ${next}: ${r.out.slice(-300)}`);
  if (r.code !== 0) return;
  const S = read(path.join(d, 'state.json')); const Hn = read(path.join(d, 'history.json'));
  const si = Hn.cols.indexOf('season');
  chk(Hn.rows.filter(x => x[si] === SEASON0).length === done.length, `${SEASON0} is appended to the history (${Hn.rows.filter(x => x[si] === SEASON0).length} games)`);
  chk(S.season === next && S.phase === 'opening' && !S.rankings.ap, `${next} opens on its own schedule, with no poll of last season's (${S.season}, ${S.phase}, ${Object.keys(S.rankings)})`);
  smoke(`the first run of ${next}`, d, now, null);
}

/* ================= go ================= */
try { weekRuns(); } catch (e) { chk(false, 'the week runs threw: ' + e.stack); }
try { holdRuns(); } catch (e) { chk(false, 'the held line runs threw: ' + e.stack); }
try { armyNavy(); } catch (e) { chk(false, 'Army-Navy threw: ' + e.stack); }
try { titleRuns(); } catch (e) { chk(false, 'the title games threw: ' + e.stack); }
try { playoff(); } catch (e) { chk(false, 'the playoff threw: ' + e.stack); }
try { rollover(); } catch (e) { chk(false, 'the rollover threw: ' + e.stack); }
console.log(`${checks} checks, ${fails.length} failures`);
for (const f of fails) console.log('  FAIL ' + f);
if (process.env.CFB_SIM_KEEP) console.log(`  the runs are kept in ${SCRATCH}`);
else fs.rmSync(SCRATCH, { recursive: true, force: true });
process.exit(fails.length ? 1 : 0);
