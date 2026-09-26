/* A full run of the job over a fabricated season, so the whole pipeline is proved before a
   single real game is played: the freeze, the grading, the record, the standings, the playoff
   picture and the page.

    node nhl/tools/simulate.js            must end "0 failures"

   The real schedule (nhl/state.json) is played with invented scores up to a chosen day:
   goals drawn from the model's own Poisson layer, one in four games past regulation, a few
   shootouts. Every game in the next two days gets an invented DraftKings line. ESPN
   scoreboard files in that shape are written to a scratch folder and update.js is run
   --offline over them three times, as the job would be: the morning the lines are up
   (calls frozen), the next morning (those games final, the next day's lines moved), and a
   quiet rerun (nothing changed, the file left alone). Then the checks: a frozen call keeps
   its line and its view after the game, the grades follow the score, the record adds up,
   the standings count every final, and the smoke test passes over the fabricated state.
   Nothing in nhl/ is written: the scratch folder is os.tmpdir(). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const E = require('./espn');
const { goals, spreadOf } = require('./elo');

const ROOT = path.join(__dirname, '..');
const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'state.json'), 'utf8'));
const model = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'model.json'), 'utf8'));
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'nhl-sim-'));
const OUT = path.join(SCRATCH, 'out'), STATE = path.join(SCRATCH, 'state.json'), TEAMS = path.join(SCRATCH, 'teams.json');
fs.mkdirSync(OUT);
fs.copyFileSync(path.join(ROOT, 'data', 'teams.json'), TEAMS);

let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const poisson = l => { let k = 0, p = Math.exp(-l), s = p, u = rnd(); while (u > s) { k++; p *= l / k; s += p; } return k; };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };

const games = real.games.filter(g => g.type === 2).map(g => ({ id: g.id, date: g.date, start: g.start, home: g.home, away: g.away, neutral: g.neutral, venue: g.venue, mu: g.mu, xt: g.xt, diff: g.diff }));
const first = games[0].date;
const T0 = addDays(first, 45);                        // six weeks in: the day the lines are up
const T1 = addDays(T0, 1);

/* an invented final: the goals layer's means, a coin for overtime when tied, a shootout one time in three */
function score(g) {
  const G = goals(g.xt, g.mu, g.diff, model.pull);
  let hs = poisson(G.lh), as = poisson(G.la), periods = 3;
  if (hs === as) { periods = rnd() < 0.35 ? 5 : 4; if (rnd() < G.pOT) hs++; else as++; }
  return { hs, as, periods };
}
/* an invented DraftKings line around the model's view, with noise, in the feed's shape */
function odds(g, shift = 0) {
  const p = 1 / (1 + Math.pow(10, -(g.diff + shift) / 400)) + (rnd() - 0.5) * 0.06;
  const am = q => q >= 0.5 ? Math.round(-100 * q / (1 - q) / 5) * 5 : Math.round(100 * (1 - q) / q / 5) * 5;
  const fav = p >= 0.5 ? 'home' : 'away';
  const total = Math.round(g.xt * 2) / 2 + (rnd() < 0.3 ? 0.5 : 0);
  return [{ provider: { name: 'DraftKings' }, details: `${fav === 'home' ? g.home : g.away} ${am(Math.max(p, 1 - p))}`, overUnder: total, spread: -1.5,
    homeTeamOdds: { favorite: fav === 'home' }, awayTeamOdds: { favorite: fav === 'away' },
    moneyline: { home: { close: { odds: String(am(p)) } }, away: { close: { odds: String(am(1 - p)) } } },
    pointSpread: { home: { close: { line: fav === 'home' ? '-1.5' : '+1.5', odds: fav === 'home' ? '+190' : '-230' } }, away: { close: { line: fav === 'home' ? '+1.5' : '-1.5', odds: fav === 'home' ? '-230' : '+190' } } },
    total: { over: { close: { line: 'o' + total, odds: '-110' } }, under: { close: { line: 'u' + total, odds: '-110' } } } }];
}
const team = code => ({ id: E.CLUBS[code].id, abbreviation: code, displayName: E.CLUBS[code].name, shortDisplayName: E.CLUBS[code].name.split(' ').pop(), name: E.CLUBS[code].name.split(' ').pop(), logo: `https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/${code.toLowerCase()}.png`, color: '888888' });
function event(g, r, ods) {
  const done = !!r;
  const ls = n => done ? Array.from({ length: r.periods }, (_, i) => ({ value: i === 0 ? n : 0 })) : [];
  return { id: g.id, date: g.start, season: { year: real.season, type: 2 }, competitions: [{ date: g.start, neutralSite: g.neutral, venue: { fullName: g.venue },
    status: { type: done ? { state: 'post', name: 'STATUS_FINAL', completed: true, shortDetail: r.periods === 5 ? 'Final/SO' : r.periods === 4 ? 'Final/OT' : 'Final' } : { state: 'pre', name: 'STATUS_SCHEDULED', shortDetail: 'tonight' }, period: done ? r.periods : 0 },
    competitors: [{ homeAway: 'home', team: team(g.home), score: done ? String(r.hs) : '0', linescores: ls(done ? r.hs : 0), records: [{ summary: '0-0-0' }] },
      { homeAway: 'away', team: team(g.away), score: done ? String(r.as) : '0', linescores: ls(done ? r.as : 0), records: [{ summary: '0-0-0' }] }],
    odds: ods || undefined }] };
}
const results = {};
function writeFeed(through, linesOn, shift) {
  const byDate = {}; for (const g of games) (byDate[g.date] = byDate[g.date] || []).push(g);
  for (const [d, gs] of Object.entries(byDate)) {
    const evs = gs.map(g => {
      if (d <= through) { results[g.id] = results[g.id] || score(g); return event(g, results[g.id], null); }
      return event(g, null, linesOn.includes(d) ? odds(g, shift) : null);
    });
    fs.writeFileSync(path.join(OUT, `sb_${d}.json`), JSON.stringify({ events: evs }));
  }
}
function run(today) {
  const out = execFileSync('node', [path.join(__dirname, 'update.js'), '--offline'], { env: Object.assign({}, process.env, { NHL_TODAY: today, NHL_STATE: STATE, NHL_OUT: OUT, NHL_TEAMS: TEAMS, NHL_SEASON: String(real.season) }), encoding: 'utf8' });
  process.stdout.write(out.split('\n').map(l => '   ' + l).join('\n'));
  return JSON.parse(fs.readFileSync(STATE, 'utf8'));
}

console.log(`fabricated season from ${first}: finals through ${addDays(T0, -1)}, lines on ${T0} and ${T1}`);
/* run 1: the morning of T0, lines up on T0 and T1, everything before final */
writeFeed(addDays(T0, -1), [T0, T1], 0);
const A = run(T0);
const dayA = A.games.filter(g => g.date === T0);
chk(dayA.length > 0 && dayA.every(g => g.state === 'pre' && g.line && g.frozen), `every game on ${T0} is frozen with a line (${dayA.length})`);
chk(dayA.every(g => g.cover && g.ou && g.mlEdge), 'each frozen game has cover, total and moneyline chances');
chk(dayA.some(g => g.mlPick || g.plPick || g.ouPick), 'some side is taken on the day');
const finalsA = A.games.filter(g => g.result).length;
chk(finalsA === games.filter(g => g.date < T0).length, `every earlier game is graded from the replay (${finalsA})`);
chk(A.games.filter(g => g.result).every(g => !g.frozen && !g.line), 'a replayed game carries no line and no freeze');

/* run 2: the next morning, T0 final, T1's lines moved */
writeFeed(T0, [T1], 25);
const B = run(T1);
const byIdA = Object.fromEntries(dayA.map(g => [g.id, g]));
const dayB = B.games.filter(g => g.date === T0);
chk(dayB.every(g => g.state === 'final' && g.result), `every game on ${T0} is final and graded`);
for (const g of dayB) {
  const a = byIdA[g.id]; const r = results[g.id];
  chk(g.frozen === a.frozen && g.pHome === a.pHome && g.xt === a.xt, `frozen view kept after the game: ${g.id}`);
  chk(JSON.stringify(g.line) === JSON.stringify(a.line), `frozen line kept after the game: ${g.id}`);
  chk(g.hs === r.hs && g.as === r.as && g.periods === r.periods, `score carried: ${g.id}`);
  chk(g.result.su === ((r.hs > r.as) === (g.pick === 'home')), `straight-up grade follows the score: ${g.id}`);
  const covered = r.hs - r.as + g.line.homeLine;
  chk(g.result.homeCover === (covered > 0 ? 'win' : covered < 0 ? 'loss' : 'push'), `puck line grade follows the margin: ${g.id}`);
  if (g.plPick) chk(g.result.pl === (g.result.homeCover === 'push' ? 'push' : ((g.result.homeCover === 'win') === (g.plPick === 'home') ? 'win' : 'loss')), `puck line pick graded: ${g.id}`);
  if (g.ouPick) { const t = r.hs + r.as; chk(g.result.ou === (t === g.line.total ? 'push' : ((t > g.line.total) === (g.ouPick === 'over') ? 'win' : 'loss')), `totals pick graded: ${g.id}`); }
  if (g.mlPick) chk(g.result.ml === ((r.hs > r.as) === (g.mlPick === 'home') ? 'win' : 'loss'), `moneyline pick graded: ${g.id}`);
}
const dayT1 = B.games.filter(g => g.date === T1);
chk(dayT1.every(g => g.state === 'pre' && g.line && g.line.at.startsWith(T1)), `the lines on ${T1} are the morning's, refreshed`);
/* the record adds up */
const R = B.record; const graded = B.games.filter(g => g.result);
chk(R.su.w + R.su.l === graded.length, `the record counts every graded game (${R.su.w}-${R.su.l} of ${graded.length})`);
chk(R.pl.w + R.pl.l + R.pl.p === graded.filter(g => g.result.pl).length, 'the puck line record counts every graded pick');
chk(R.ou.w + R.ou.l + R.ou.p === graded.filter(g => g.result.ou).length, 'the totals record counts every graded pick');
chk(R.pl.w + R.pl.l + R.pl.p > 0 || dayB.every(g => !g.plPick), 'the puck line record is live once picks are graded');
const monthSum = Object.values(R.byMonth).reduce((a, m) => a + m.su.w + m.su.l, 0);
chk(monthSum === graded.length, 'the months add to the whole');
/* the standings */
const gp = Object.values(B.teams).reduce((a, t) => a + t.gp, 0);
chk(gp === 2 * graded.length, `the standings count every final twice (${gp} vs ${2 * graded.length})`);
const pts = Object.values(B.teams).reduce((a, t) => a + t.pts, 0), otl = Object.values(B.teams).reduce((a, t) => a + t.otl, 0);
chk(pts === 2 * graded.length + otl, 'points are two a game plus the loser point');
chk(otl === graded.filter(g => g.periods > 3).length, 'a loser point for every game past regulation');
chk(Object.values(B.teams).some(t => t.rating !== A.teams[Object.keys(B.teams)[0]].rating), 'ratings moved with the results');
chk(B.playoff.remaining === games.filter(g => g.date > T0).length, `the simulation plays the ${B.playoff.remaining} games left`);
/* run 3: nothing new; the file is left alone */
const beforeC = fs.readFileSync(STATE, 'utf8');
run(T1);
chk(fs.readFileSync(STATE, 'utf8') === beforeC, 'a rerun with nothing new leaves state.json alone');
/* the page over the fabricated state */
try { const sm = execFileSync('node', [path.join(__dirname, 'smoke.js')], { env: Object.assign({}, process.env, { NHL_STATE: STATE }), encoding: 'utf8' }); chk(/ 0 failures/.test(sm), 'smoke over the fabricated state: ' + sm.trim().split('\n').pop()); }
catch (e) { chk(false, 'smoke over the fabricated state failed: ' + (e.stdout || e.message).toString().trim().split('\n').slice(-5).join(' | ')); }
console.log(`${checks} checks, ${fails.length} failures`);
for (const f of fails) console.log('  FAIL ' + f);
fs.rmSync(SCRATCH, { recursive: true, force: true });
process.exit(fails.length ? 1 : 0);
