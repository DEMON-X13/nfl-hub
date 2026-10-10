/* The whole job, played offline in a scratch folder, so every part of it is proved before it touches
   the real files: the freeze, the grading, the record, the standings, the lineups, the goalies, the
   playoffs, the season's rollover and the page.

    node nhl/tools/simulate.js            must end "0 failures"

   Four parts, each on fixtures in the feeds' own shapes (ESPN's scoreboard, game summary and injury
   report; DailyFaceoff's page), read through NHL_FIXTURES, NHL_OUT, NHL_DATA, NHL_STATE, NHL_TEAMS,
   NHL_TODAY and NHL_NOW. Nothing in nhl/ is written: the scratch folder is os.tmpdir().

   B. Today's real data through the job: the published state, box scores and injury report are
      turned back into the feeds (the injury rows in ESPN's shape, with no athlete id field and the id
      in the player's link, some with no link at all), plus a few planted cases: a club's top goalie
      put on injured reserve, one of its skaters out by name only, another club's goalie listed on a
      third club's report, DailyFaceoff confirming a backup, naming a goalie with no NHL game and an
      unconfirmed one, and a stale entry from the day before. The job runs in its order (update.js
      --scores, fetch_box.js, starters.js, players.js, update.js) and the smoke test holds the result
      to those sources. Then the refusals: a scoreboard day that does not answer (exit 1, nothing
      written), an injury report that does not answer (the last one kept), DailyFaceoff silent or
      changed shape (said, and sources.js fails the run).
   A. A fabricated season on the real schedule: invented scores up to a day six weeks in, invented
      DraftKings lines, update.js run as the job would be: the morning the lines are up (calls made),
      that evening with some games under way, one of them still "scheduled" in the feed past its puck
      drop, and the lines moved (calls kept), the next morning (those games final and graded on the
      calls shown), and a quiet rerun (the file left alone).
   C. The same season played out, then the playoffs: the field from the final table, a sweep, an
      upset, series under way; a club knocked out has no Cup chance and the bracket shows the
      scores; then every round to the Final, and a champion.
   D. The rollover: the first run in August closes the finished season into season_<year>.json, the
      new season's ratings are that season's carried, and a season missing everywhere is refused. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const E = require('./espn');
const { goals } = require('./elo');

const ROOT = path.join(__dirname, '..'), REAL_DATA = path.join(ROOT, 'data');
const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'state.json'), 'utf8'));
const model = JSON.parse(fs.readFileSync(path.join(REAL_DATA, 'model.json'), 'utf8'));
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'nhl-sim-'));
const SEASON = real.season;

let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const poisson = l => { let k = 0, p = Math.exp(-l), s = p, u = rnd(); while (u > s) { k++; p *= l / k; s += p; } return k; };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const minute = ms => new Date(ms).toISOString().slice(0, 16) + 'Z';
const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const mkdir = (...p) => { const d = path.join(SCRATCH, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
/* run one of the job's scripts; its log indented under ours */
function run(script, args, env, label) {
  const r = spawnSync('node', [path.join(__dirname, script)].concat(args || []), { env: Object.assign({}, process.env, { GITHUB_ACTIONS: '' }, env), encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(`  [${label || script}${args && args.length ? ' ' + args.join(' ') : ''}] exit ${r.status}\n` + out.split('\n').filter(Boolean).slice(-6).map(l => '      ' + l.slice(0, 220)).join('\n') + '\n');
  return { status: r.status, out };
}
/* a data folder: the fixed files copied, the box scores linked (the current season's copied, since fetch_box.js appends to it) */
function dataDir(name, from = REAL_DATA) {
  const d = mkdir(name);
  for (const f of ['history.json', 'model.json', 'teams.json', 'players.json']) if (fs.existsSync(path.join(from, f))) fs.copyFileSync(path.join(from, f), path.join(d, f));
  for (const f of fs.readdirSync(REAL_DATA).filter(f => /^box_\d+\.jsonl$/.test(f))) {
    if (+f.slice(4, 8) >= SEASON) fs.copyFileSync(path.join(REAL_DATA, f), path.join(d, f)); else fs.symlinkSync(path.join(REAL_DATA, f), path.join(d, f));
  }
  return d;
}

/* ---------- the feeds' shapes ---------- */
const team = code => ({ id: E.CLUBS[code].id, abbreviation: code, displayName: E.CLUBS[code].name, shortDisplayName: E.CLUBS[code].name.split(' ').pop(), name: E.CLUBS[code].name.split(' ').pop(), logo: `https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/${code.toLowerCase()}.png`, color: '888888' });
const am = n => n === null || n === undefined ? undefined : (n > 0 ? '+' + n : String(n));
/* a line this site keeps, back in ESPN's odds shape */
const oddsOfLine = l => !l ? undefined : [{ provider: { name: l.book || 'DraftKings' }, overUnder: l.total,
  homeTeamOdds: { favorite: l.homeLine !== null && l.homeLine < 0 }, awayTeamOdds: { favorite: l.homeLine !== null && l.homeLine > 0 },
  moneyline: { home: { close: { odds: am(l.homeML) } }, away: { close: { odds: am(l.awayML) } } },
  pointSpread: l.homeLine === null || l.homeLine === undefined ? undefined : { home: { close: { line: am(l.homeLine), odds: am(l.homeSpreadOdds) } }, away: { close: { line: am(-l.homeLine), odds: am(l.awaySpreadOdds) } } },
  total: { over: { close: { line: 'o' + l.total, odds: am(l.overOdds) } }, under: { close: { line: 'u' + l.total, odds: am(l.underOdds) } } } }];
/* an invented DraftKings line around the model's view, with noise */
function invented(g, shift = 0) {
  const p = Math.min(0.85, Math.max(0.15, 1 / (1 + Math.pow(10, -((g.diff || 0) + shift) / 400)) + (rnd() - 0.5) * 0.06));
  const ml = q => q >= 0.5 ? Math.round(-100 * q / (1 - q) / 5) * 5 : Math.round(100 * (1 - q) / q / 5) * 5;
  const fav = p >= 0.5;
  const total = Math.round((g.xt || 6) * 2) / 2 + (rnd() < 0.3 ? 0.5 : 0);
  return { book: 'DraftKings', total, homeML: ml(p), awayML: ml(1 - p), homeLine: fav ? -1.5 : 1.5, homeSpreadOdds: fav ? 190 : -230, awaySpreadOdds: fav ? -230 : 190, overOdds: -110, underOdds: -110 };
}
/* one game as a scoreboard event: pre, in or post */
function event(g, x = {}) {
  const st = x.state || 'pre';
  const ls = n => st === 'pre' ? [] : Array.from({ length: x.periods || 3 }, (_, i) => ({ value: i === 0 ? n : 0 }));
  const type = st === 'post' ? { state: 'post', name: 'STATUS_FINAL', completed: true, shortDetail: x.detail || (x.periods === 5 ? 'Final/SO' : x.periods === 4 ? 'Final/OT' : 'Final') }
    : st === 'in' ? { state: 'in', name: 'STATUS_IN_PROGRESS', shortDetail: x.detail || '10:00 - 2nd' } : { state: 'pre', name: 'STATUS_SCHEDULED', shortDetail: x.detail || 'scheduled' };
  return { id: String(g.id), date: g.start, season: { year: SEASON, type: x.type || 2 }, competitions: [{ date: g.start, neutralSite: !!g.neutral,
    status: { type, period: st === 'pre' ? 0 : (x.periods || 2) },
    competitors: [{ homeAway: 'home', team: team(g.home), score: String(x.hs ?? 0), linescores: ls(x.hs ?? 0), records: [{ summary: g.hrec || '0-0-0' }] },
      { homeAway: 'away', team: team(g.away), score: String(x.as ?? 0), linescores: ls(x.as ?? 0), records: [{ summary: g.arec || '0-0-0' }] }],
    odds: x.odds }] };
}
const writeDays = (dir, byDate) => { for (const [d, evs] of Object.entries(byDate)) fs.writeFileSync(path.join(dir, `sb_${d}.json`), JSON.stringify({ events: evs })); };
/* an invented final: the goals layer's means, overtime when tied, a shootout one time in three */
function score(g) {
  const G = goals(g.xt || 6, g.mu || 0, g.diff || 0, model.pull);
  let hs = poisson(G.lh), as = poisson(G.la), periods = 3;
  if (hs === as) { periods = rnd() < 0.35 ? 5 : 4; if (rnd() < G.pOT) hs++; else as++; }
  return { hs, as, periods };
}
/* a box line back into ESPN's game summary, which fetch_box.js reads */
const mmss = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
const summaryOf = b => ({ boxscore: { players: [b.home, b.away].map(code => ({ team: { id: E.CLUBS[code].id }, statistics: [
  { name: 'forwards', labels: ['G', 'A', '+/-', 'SOG', 'TOI'], athletes: b.skaters.filter(s => s.team === code && s.pos !== 'D').map(s => ({ athlete: { id: s.id, displayName: s.name, position: { abbreviation: s.pos } }, stats: [s.g, s.a, s.pm, s.sog, mmss(s.toi)].map(String) })) },
  { name: 'defenses', labels: ['G', 'A', '+/-', 'SOG', 'TOI'], athletes: b.skaters.filter(s => s.team === code && s.pos === 'D').map(s => ({ athlete: { id: s.id, displayName: s.name, position: { abbreviation: s.pos } }, stats: [s.g, s.a, s.pm, s.sog, mmss(s.toi)].map(String) })) },
  { name: 'goalies', labels: ['SA', 'GA', 'TOI'], athletes: b.goalies.filter(x => x.team === code).map(x => ({ athlete: { id: x.id, displayName: x.name, position: { abbreviation: 'G' } }, stats: [x.sa, x.ga, mmss(x.toi)].map(String) })) }] })) } });
/* an injury row in ESPN's shape: no athlete id field, the id in the player's links when we give one */
const injRow = (name, pos, status, id, detail) => ({ status, date: '2026-10-01T12:00Z', athlete: Object.assign({ displayName: name, position: { abbreviation: pos || 'C' } },
  id ? { links: [{ rel: ['playercard', 'desktop', 'athlete'], href: `https://www.espn.com/nhl/player/_/id/${id}/${String(name).toLowerCase().replace(/[^a-z]+/g, '-')}` }, { rel: ['stats'], href: `sportscenter://x-callback-url/showClubhouse?uid=s:70~l:90~a:${id}` }] } : {}),
  details: { type: detail || 'Lower Body', returnDate: '2026-11-01' } });
const dfoPage = data => `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { data } }, page: '/starting-goalies' })}</script></body></html>`;

/* ---------- B. today's real data through the job ---------- */
function partB() {
  console.log('B. the real state, box scores and injury report through the job, offline');
  const B = dataDir('B'), FX = mkdir('B-fx'), OUTB = mkdir('B-sb'), STB = path.join(SCRATCH, 'B-state.json'), PREVB = path.join(SCRATCH, 'B-prev.json');
  fs.copyFileSync(path.join(ROOT, 'state.json'), STB); fs.copyFileSync(path.join(ROOT, 'state.json'), PREVB);
  const NOW = minute(Date.parse(real.published)), TODAY = E.etDate(NOW);
  /* the scoreboard, from the state's own rows */
  const byDate = {};
  for (const g of real.games) {
    const x = g.state === 'final' ? { state: 'post', hs: g.hs, as: g.as, periods: g.periods, detail: g.detail } : g.state === 'live' ? { state: 'in', hs: g.hs, as: g.as, periods: g.periods || 2, detail: g.detail } : { state: 'pre', odds: oddsOfLine(g.line), detail: g.detail };
    (byDate[g.date] = byDate[g.date] || []).push(event(g, Object.assign(x, { type: g.type })));
  }
  /* last night: a game the published state still has under way (or one today still to come) is final in the feed now,
     with its box score; the job reads the scores first, so it is boxed and rated in this same run */
  const boxFile = path.join(B, `box_${SEASON}.jsonl`);
  const lines = fs.readFileSync(boxFile, 'utf8').split('\n').filter(Boolean);
  const lastOf = c => lines.map(l => JSON.parse(l)).filter(b => b.home === c || b.away === c).pop();
  const fresh = real.games.filter(g => g.state === 'live').pop() || real.games.find(g => g.state === 'pre' && g.date === TODAY);
  if (fresh && lastOf(fresh.home) && lastOf(fresh.away)) {
    const ev = byDate[fresh.date].find(e => e.id === String(fresh.id));
    Object.assign(ev, event(fresh, { state: 'post', hs: 4, as: 2, periods: 3, type: fresh.type }));
    const hb = lastOf(fresh.home), ab = lastOf(fresh.away);
    fs.writeFileSync(path.join(FX, `summary_${fresh.id}.json`), JSON.stringify(summaryOf({ home: fresh.home, away: fresh.away,
      skaters: hb.skaters.filter(s => s.team === fresh.home).concat(ab.skaters.filter(s => s.team === fresh.away)), goalies: hb.goalies.filter(x => x.team === fresh.home).concat(ab.goalies.filter(x => x.team === fresh.away)) })));
  }
  writeDays(OUTB, byDate);
  /* three boxed finals held back, to be read again from summaries in ESPN's shape */
  const finals = new Set(real.games.filter(g => g.state === 'final').map(g => String(g.id)));
  const held = lines.filter(l => finals.has(JSON.parse(l).id)).slice(-3).map(l => JSON.parse(l));
  fs.writeFileSync(boxFile, lines.filter(l => !held.some(h => h.id === JSON.parse(l).id)).join('\n') + '\n');
  for (const h of held) fs.writeFileSync(path.join(FX, `summary_${h.id}.json`), JSON.stringify(summaryOf(h)));
  /* who is who: every player of this season's and last season's box scores */
  const boxes = []; for (const f of fs.readdirSync(REAL_DATA).filter(f => /^box_\d+\.jsonl$/.test(f) && +f.slice(4, 8) >= SEASON - 1).sort()) for (const l of fs.readFileSync(path.join(REAL_DATA, f), 'utf8').split('\n')) if (l) boxes.push(JSON.parse(l));
  const idOf = {}, nameIds = {};
  for (const b of boxes) for (const p of b.skaters.concat(b.goalies)) { idOf[p.team + '|' + E.normName(p.name)] = p.id; (nameIds[E.normName(p.name)] = nameIds[E.normName(p.name)] || new Set()).add(p.id); }
  const starterOf = (b, c) => { const gs = b.goalies.filter(x => x.team === c).sort((x, y) => y.toi - x.toi); return gs[0] || null; };
  const startsThisSeason = c => { const n = {}; for (const b of boxes) if (b.season === SEASON && (b.home === c || b.away === c)) { const s = starterOf(b, c); if (s) n[s.id] = (n[s.id] || { id: s.id, name: s.name, n: 0 }), n[s.id].n++; } return Object.values(n).sort((a, b) => b.n - a.n); };
  /* the injury report in ESPN's shape: every row of the committed one, its id in the link when the box scores know him, one in four with no link */
  const inj = readJSON(path.join(REAL_DATA, 'injuries.json'));
  const feed = {}; let k = 0;
  for (const [club, list] of Object.entries(inj.teams || {})) feed[club] = (list || []).map(r => {
    const id = /^\d+$/.test(String(r.id)) ? r.id : idOf[club + '|' + E.normName(r.name)] || (nameIds[E.normName(r.name)] && nameIds[E.normName(r.name)].size === 1 ? [...nameIds[E.normName(r.name)]][0] : null);
    return injRow(r.name, r.pos, r.status, ++k % 4 === 0 ? null : id, r.detail);
  });
  /* the planted cases, on clubs with a game still to come and two goalies who have started */
  const toCome = real.games.filter(g => g.state === 'pre' && Date.parse(g.start) > Date.parse(NOW)).sort((a, b) => a.start < b.start ? -1 : 1);
  const clubs = [...new Set(toCome.flatMap(g => [g.home, g.away]))].filter(c => startsThisSeason(c).length >= 2);
  const listed = (c, name) => (inj.teams[c] || []).some(r => E.normName(r.name) === E.normName(name));
  const X = clubs.find(c => !listed(c, startsThisSeason(c)[0].name));
  const Y = clubs.find(c => c !== X && !listed(c, startsThisSeason(c)[0].name));
  const Z = E.TEAMS.find(c => c !== X && c !== Y);
  const xg = startsThisSeason(X)[0], yg = startsThisSeason(Y)[0];
  const lastBoxX = boxes.filter(b => b.home === X || b.away === X).pop();
  const xs = lastBoxX.skaters.filter(s => s.team === X).sort((a, b) => b.toi - a.toi)[0];
  (feed[X] = feed[X] || []).push(injRow(xg.name, 'G', 'Injured Reserve', xg.id, 'Groin'));
  feed[X].push(injRow(xs.name, xs.pos, 'Out', null, 'Upper Body'));                     // name only
  (feed[Z] = feed[Z] || []).push(injRow(yg.name, 'G', 'Day-To-Day', yg.id, 'Illness'));   // listed under another club
  fs.writeFileSync(path.join(FX, 'injuries.json'), JSON.stringify({ timestamp: NOW, status: 'success', injuries: Object.entries(feed).map(([c, l]) => ({ id: E.CLUBS[c].id, displayName: E.CLUBS[c].name, injuries: l })) }));
  console.log(`  planted: ${xg.name} (${X}'s top starter) on injured reserve, ${xs.name} (${X}) out by name only, ${yg.name} (${Y}'s top starter) on ${Z}'s report`);
  /* DailyFaceoff: the first day with games to come; a backup confirmed, a goalie with no NHL game, an unconfirmed one, a stale entry */
  const D = toCome[0].date, onD = toCome.filter(g => g.date === D);
  const g1 = onD.find(g => ![X, Y].includes(g.home) && startsThisSeason(g.home).length >= 2) || onD[0];
  const g2 = onD.find(g => g !== g1 && ![X, Y].includes(g.home) && startsThisSeason(g.home).length >= 1);
  const g3 = onD.find(g => g !== g1 && g !== g2 && ![X, Y].includes(g.home) && startsThisSeason(g.home).length >= 1);
  const backup = startsThisSeason(g1.home)[1] || startsThisSeason(g1.home)[0];
  const dfo = [{ date: D, homeTeamName: E.CLUBS[g1.home].name, awayTeamName: E.CLUBS[g1.away].name, homeGoalieName: backup.name, homeNewsStrengthName: 'Confirmed', awayGoalieName: 'Zed Newman', awayNewsStrengthName: 'Likely' }];
  if (g2) dfo.push(Object.assign({ homeTeamName: E.CLUBS[g2.home].name, awayTeamName: E.CLUBS[g2.away].name, homeGoalieName: startsThisSeason(g2.home)[0].name, homeNewsStrengthName: 'Unconfirmed', awayGoalieName: null }, D === TODAY ? {} : { date: D }));
  const staleOn = g3 || g1;
  dfo.push({ date: addDays(D, -1), homeTeamName: E.CLUBS[staleOn.home].name, awayTeamName: E.CLUBS[staleOn.away].name, homeGoalieName: 'Stale Entry', homeNewsStrengthName: 'Confirmed' });
  fs.writeFileSync(path.join(FX, 'dailyfaceoff.html'), dfoPage(dfo));
  console.log(`  DailyFaceoff on ${D}: ${backup.name} confirmed for ${g1.home}, Zed Newman likely for ${g1.away}${g2 ? `, ${startsThisSeason(g2.home)[0].name} unconfirmed for ${g2.home}` : ''}, and a stale entry for ${staleOn.home} on ${addDays(D, -1)}`);

  /* the job, in the workflow's own order (read from nhl.yml, so a step moved there is a step moved here) */
  const env = { NHL_DATA: B, NHL_STATE: STB, NHL_TEAMS: path.join(B, 'teams.json'), NHL_OUT: OUTB, NHL_FIXTURES: FX, NHL_NOW: NOW, NHL_TODAY: TODAY, NHL_SEASON: String(SEASON) };
  const yml = path.join(ROOT, '..', '.github', 'workflows', 'nhl.yml');
  const steps = (fs.existsSync(yml) ? [...fs.readFileSync(yml, 'utf8').matchAll(/run: node nhl\/tools\/(\S+\.js)([^\n]*)/g)].map(m => [m[1], m[2].trim().split(/\s+/).filter(Boolean)]) : [['update.js', ['--scores']], ['fetch_box.js', []], ['starters.js', []], ['players.js', []], ['update.js', []]])
    .filter(([s]) => ['update.js', 'fetch_box.js', 'starters.js', 'players.js'].includes(s));
  console.log('  the job\'s steps: ' + steps.map(([s, a]) => [s].concat(a).join(' ')).join(' -> '));
  const stepRuns = steps.map(([s, a]) => ({ s, r: run(s, s === 'update.js' ? ['--offline'].concat(a) : a, env) }));
  for (const { s, r } of stepRuns) chk(r.status === 0, `${s} runs`);
  const fb = stepRuns.find(x => x.s === 'fetch_box.js').r;
  if (fresh) {
    const boxedNow = fs.readFileSync(boxFile, 'utf8').split('\n').filter(Boolean).some(l => JSON.parse(l).id === String(fresh.id));
    chk(boxedNow, `last night's final (${fresh.away}@${fresh.home}, ${fresh.date}), still under way in the published state, is boxed in the same run`);
    const pj = readJSON(path.join(B, 'players.json'));
    chk(pj.teams[fresh.home].lastBox === fresh.date && pj.asOf >= fresh.date, `and the lineups are rated through it (${fresh.home} last box ${pj.teams[fresh.home].lastBox}, ratings as of ${pj.asOf})`);
  }
  const again = fs.readFileSync(boxFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const byId = l => JSON.stringify(l.slice().sort((x, y) => x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  for (const h of held) {
    const b = again.find(x => x.id === h.id);
    chk(b && byId(b.skaters) === byId(h.skaters) && byId(b.goalies) === byId(h.goalies), `a box score read from ESPN's summary shape is the one the job read before: ${h.id}`);
    chk(b && b.hs !== undefined && b.hs !== null && b.periods, `a box line carries its game's score: ${h.id}`);
  }
  const injOut = readJSON(path.join(B, 'injuries.json'));
  const rows = Object.values(injOut.teams).reduce((a, l) => a.concat(l), []);
  chk(rows.length === Object.values(feed).reduce((a, l) => a + l.length, 0), `every row of the report is kept (${rows.length})`);
  chk(rows.every(r => r.id === null || /^\d+$/.test(r.id)), 'no injury id is "undefined": each is the ESPN id from the player link, or empty');
  chk(rows.filter(r => r.id).length >= rows.length / 2, `the ids come from the links (${rows.filter(r => r.id).length} of ${rows.length})`);
  const st = readJSON(path.join(B, 'starters.json'));
  chk(st.ok === true && st.games.length >= (g2 ? 3 : 2), `DailyFaceoff's page shape is read (${st.games.length} games)`);
  chk(st.games.some(e => e.date === D && e.home === g1.home && e.homeGoalie.status === 'Confirmed' && e.id === String(g1.id)), 'a game read off the page is matched to the schedule with its date and id');
  if (g2) chk(st.games.some(e => e.home === g2.home && e.homeGoalie && e.homeGoalie.status === 'Unconfirmed'), '"Unconfirmed" is read as unconfirmed');
  const SB = readJSON(STB);
  const pre = SB.games.filter(g => g.state === 'pre' && Date.parse(g.start) > Date.parse(NOW) && g.pm);
  const goalieOn = (g, c) => g.pm[g.home === c ? 'home' : 'away'].goalie;
  chk(pre.filter(g => g.home === X || g.away === X).every(g => !goalieOn(g, X) || goalieOn(g, X).id !== xg.id), `${xg.name}, put on injured reserve, is in goal for ${X} in no game to come`);
  chk(!SB.players.teams[X].lineup.some(p => p.id === xs.id), `${xs.name}, out by name only, is not in ${X}'s lineup`);
  chk(SB.players.teams[X].out.some(o => o.name === xs.name && o.id === xs.id), `${xs.name} is matched by club and name and listed out for ${X}`);
  chk(pre.filter(g => g.home === Y || g.away === Y).every(g => !goalieOn(g, Y) || goalieOn(g, Y).id !== yg.id), `${yg.name}, on ${Z}'s report, is in goal for ${Y} in no game to come`);
  const c1 = SB.games.find(g => g.id === g1.id);
  chk(c1.pm.home.goalie && c1.pm.home.goalie.id === backup.id && /confirmed by DailyFaceoff/.test(c1.pm.home.goalie.how), `the confirmed backup ${backup.name} is in goal for ${g1.home} on ${D}: ${c1.pm.home.goalie && c1.pm.home.goalie.name} (${c1.pm.home.goalie && c1.pm.home.goalie.how})`);
  chk(c1.pm.away.goalie && c1.pm.away.goalie.name === 'Zed Newman' && c1.pm.away.goalie.debut, `a goalie DailyFaceoff names with no NHL game starts on a rookie's rating: ${c1.pm.away.goalie && c1.pm.away.goalie.name}`);
  if (g2) { const c2 = SB.games.find(g => g.id === g2.id); chk(/unconfirmed/.test(c2.pm.home.goalie.how), `an unconfirmed goalie is said to be unconfirmed: ${c2.pm.home.goalie.how}`); }
  chk(!SB.games.some(g => g.pm && [g.pm.home, g.pm.away].some(t => t && t.goalie && t.goalie.name === 'Stale Entry')), "a name DailyFaceoff gave for the day before is not used today");
  chk(SB.games.filter(g => g.state === 'pre' && g.date > D && (g.home === g1.home || g.away === g1.home) && g.pm).every(g => !(g.pm[g.home === g1.home ? 'home' : 'away'].goalie || {}).announced), `the goalie DailyFaceoff named for ${g1.home} on ${D} is not carried to its later games`);
  const b2b = pre.filter(g => [g.pm.home, g.pm.away].some(t => t.goalie && /back to back/.test(t.goalie.how)));
  chk(SB.games.filter(g => g.state !== 'pre' && g.frozen).every(g => !(g.pm && g.pm.pHome === g.pHome && g.pm.xt === g.xt) || (g.mu === g.pm.mu && g.by === 'players')), "every started call that is the player model's carries its margin again");
  console.log(`  ${pre.length} games to come lined up, ${b2b.length} with a back to back; ${SB.players.injuries.matched} of ${SB.players.injuries.rows} report rows matched, ${SB.players.injuries.out} out`);
  const sm = run('smoke.js', [], { NHL_STATE: STB, NHL_DATA: B, NHL_PREV_STATE: PREVB }, 'smoke.js over B');
  chk(sm.status === 0 && / 0 failures/.test(sm.out), 'smoke over the real data through the new job: ' + sm.out.trim().split('\n').filter(l => /checks|FAIL/.test(l)).slice(0, 6).join(' | '));
  chk(run('sources.js', [], { NHL_STATE: STB, NHL_DATA: B }).status === 0, 'sources.js: every source read');

  /* the refusals */
  const OUT2 = mkdir('B-sb-missing'); for (const f of fs.readdirSync(OUTB)) fs.copyFileSync(path.join(OUTB, f), path.join(OUT2, f));
  const needDay = SB.games.filter(g => g.state !== 'final' && g.date <= addDays(TODAY, 1)).map(g => g.date).sort()[0];
  if (needDay) {
    fs.rmSync(path.join(OUT2, `sb_${needDay}.json`));
    const before = fs.readFileSync(STB, 'utf8');
    const r = run('update.js', ['--offline'], Object.assign({}, env, { NHL_OUT: OUT2 }), 'update.js, a needed day unanswered');
    chk(r.status === 1 && /did not answer/.test(r.out), `a scoreboard day with games to finish or call (${needDay}) that does not answer fails the run`);
    chk(fs.readFileSync(STB, 'utf8') === before, 'and nothing is written: the last state stays');
  }
  const FX2 = mkdir('B-fx-noinj'); for (const f of fs.readdirSync(FX)) if (f !== 'injuries.json') fs.copyFileSync(path.join(FX, f), path.join(FX2, f));
  const pulled = injOut.pulled;
  const r2 = run('fetch_box.js', [], Object.assign({}, env, { NHL_FIXTURES: FX2 }), 'fetch_box.js, no injury report');
  chk(r2.status === 0 && readJSON(path.join(B, 'injuries.json')).pulled === pulled, 'an injury report that does not answer keeps the last one, and the run goes on');
  /* the page over a state whose injury report is a day old */
  const old = readJSON(STB); old.players.injuries.pulled = minute(Date.parse(old.published) - 20 * 3600000);
  const STALE = path.join(SCRATCH, 'B-stale.json'); fs.writeFileSync(STALE, JSON.stringify(old));
  const sm2 = run('smoke.js', [], { NHL_STATE: STALE, NHL_DATA: B, NHL_PREV_STATE: 'none' }, 'smoke.js, stale injury report');
  chk(sm2.status === 0, 'the page says the injury report is stale: ' + sm2.out.trim().split('\n').filter(l => /checks|FAIL/.test(l)).slice(0, 4).join(' | '));
  /* DailyFaceoff: silent, then a shape it cannot read, on a day with games */
  const B2 = mkdir('B-dfo'); for (const f of ['starters.json']) fs.copyFileSync(path.join(B, f), path.join(B2, f));
  fs.copyFileSync(path.join(B, 'injuries.json'), path.join(B2, 'injuries.json'));
  const FX3 = mkdir('B-fx-nodfo');
  const envD = Object.assign({}, env, { NHL_DATA: B2, NHL_FIXTURES: FX3, NHL_TODAY: D });
  chk(run('starters.js', [], envD, 'starters.js, no answer').status === 0, 'DailyFaceoff silent: starters.js still exits 0');
  const s1 = readJSON(path.join(B2, 'starters.json'));
  chk(s1.ok === false && /did not answer/.test(s1.why) && s1.games.length === st.games.filter(e => e.date >= addDays(D, -1)).length, "DailyFaceoff silent: said, and the games already read stay for their own dates");
  chk(run('sources.js', [], { NHL_STATE: STB, NHL_DATA: B2 }).status === 0, 'DailyFaceoff silent is a warning, not a broken source');
  fs.writeFileSync(path.join(FX3, 'dailyfaceoff.html'), dfoPage([{ matchup: 'a shape nobody knows', goalies: ['x', 'y'] }]));
  run('starters.js', [], envD, 'starters.js, a new shape');
  const s2 = readJSON(path.join(B2, 'starters.json'));
  chk(s2.ok === false && /shape/.test(s2.why), "DailyFaceoff answering in a shape the job cannot read is said: " + s2.why);
  chk(run('sources.js', [], { NHL_STATE: STB, NHL_DATA: B2 }).status === 1, 'and sources.js fails the run after the commit');
  return { B, NOW };
}

/* ---------- A. a fabricated season through update.js ---------- */
function partA(B) {
  console.log('A. a fabricated season on the real schedule: calls made, kept at puck drop, graded');
  const DA = dataDir('A', B), OUT = mkdir('A-sb'), STATE = path.join(SCRATCH, 'A-state.json');
  const games = real.games.filter(g => g.type === 2).map(g => ({ id: g.id, date: g.date, start: g.start, home: g.home, away: g.away, neutral: g.neutral, mu: g.mu, xt: g.xt, diff: g.diff }));
  const first = games[0].date;
  /* a day six weeks in whose games start at different times, so an evening run finds some under way and some not */
  let T0 = addDays(first, 45);
  for (let i = 45; i < 75; i++) { const d = addDays(first, i); if (new Set(games.filter(g => g.date === d).map(g => g.start)).size >= 2) { T0 = d; break; } }
  const T1 = addDays(T0, 1);
  const results = {}, lines = {};
  const feed = (through, opts = {}) => {
    const byDate = {};
    for (const g of games) {
      let x;
      if (g.date <= through) { results[g.id] = results[g.id] || score(g); x = Object.assign({ state: 'post' }, results[g.id]); }
      else if (opts.live && opts.live(g)) { const r = results[g.id] = results[g.id] || score(g); x = { state: 'in', hs: Math.min(r.hs, 1), as: Math.min(r.as, 1), periods: 2, detail: '8:12 - 2nd' }; }
      else { const on = (opts.lines || []).includes(g.date); if (on && (!lines[g.id] || opts.move)) lines[g.id] = invented(g, opts.move ? 40 : 0); x = { state: 'pre', odds: on ? oddsOfLine(lines[g.id]) : undefined }; }
      (byDate[g.date] = byDate[g.date] || []).push(event(g, x));
    }
    writeDays(OUT, byDate);
  };
  const env = now => ({ NHL_TODAY: E.etDate(now), NHL_NOW: now, NHL_STATE: STATE, NHL_OUT: OUT, NHL_TEAMS: path.join(DA, 'teams.json'), NHL_DATA: DA, NHL_SEASON: String(SEASON) });
  console.log(`  finals through ${addDays(T0, -1)}, lines on ${T0} and ${T1}`);
  /* run 1: the morning of T0 */
  feed(addDays(T0, -1), { lines: [T0, T1] });
  chk(run('update.js', ['--offline'], env(T0 + 'T12:00Z'), 'run 1, the morning').status === 0, 'run 1');
  const A = readJSON(STATE);
  const dayA = A.games.filter(g => g.date === T0);
  chk(dayA.length > 0 && dayA.every(g => g.state === 'pre' && g.line && g.frozen && g.callV), `every game on ${T0} has a call and a line (${dayA.length})`);
  chk(dayA.every(g => g.cover && g.ou && g.mlEdge), 'each call has cover, total and moneyline chances');
  chk(dayA.some(g => g.mlPick || g.plPick || g.ouPick), 'some side is taken on the day');
  chk(dayA.some(g => g.by === 'players'), "the player model's call is made on the day");
  chk(A.games.filter(g => g.result).length === games.filter(g => g.date < T0).length, 'every earlier game is graded from the replay');
  chk(A.games.filter(g => g.result).every(g => !g.frozen && !g.line), 'a replayed game carries no line and no call made before it');
  const byIdA = Object.fromEntries(dayA.map(g => [g.id, g]));
  const CALL = ['pHome', 'rh', 'ra', 'diff', 'mu', 'xt', 'tie', 'frozen', 'before', 'pm', 'elo', 'by', 'line', 'pick', 'mlEdge', 'mlPick', 'cover', 'plEdge', 'plPick', 'ou', 'ouEdge', 'ouPick'];
  const same = (a, b) => CALL.filter(k => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
  /* run 1b: that evening, the earliest games under way (one still "scheduled" in the feed), the lines moved on the rest */
  const starts = [...new Set(dayA.map(g => g.start))].sort();
  const firstStart = dayA.filter(g => g.start <= starts[0]).length >= 2 || starts.length < 3 ? starts[0] : starts[1];
  const evening = minute(Date.parse(firstStart) + 5 * 60000);
  const early = dayA.filter(g => g.start <= firstStart), late = dayA.filter(g => g.start > firstStart);
  const delayed = early[early.length - 1];
  feed(addDays(T0, -1), { lines: [T0, T1], move: true, live: g => g.date === T0 && g.start <= firstStart && (g.id !== delayed.id || early.length === 1) });
  chk(run('update.js', ['--offline'], env(evening), 'run 1b, the evening').status === 0, 'run 1b');
  const A2 = readJSON(STATE); fs.copyFileSync(STATE, path.join(SCRATCH, 'A-evening.json'));
  for (const g of early) {
    const n = A2.games.find(x => x.id === g.id);
    chk(!same(n, g).length, `a call is kept from puck drop on (${n.state}${n.state === 'pre' ? ', still scheduled in the feed' : ''}): ${g.id} ${same(n, g).map(k => `${k} ${JSON.stringify(g[k])} -> ${JSON.stringify(n[k])}`).join('; ').slice(0, 200)}`);
  }
  chk(early.length < 2 || A2.games.some(g => g.id === delayed.id && g.state === 'pre'), 'a game past its puck drop that the feed still has as scheduled is in the test');
  chk(A2.games.some(g => g.state === 'live' && g.hs !== null), 'a game under way has a score');
  for (const g of late) { const n = A2.games.find(x => x.id === g.id); chk(n.line.at === evening && JSON.stringify(n.line) !== JSON.stringify(g.line), `a game still to come takes the moved line: ${g.id}`); }
  /* run 2: the next morning, T0 final */
  feed(T0, { lines: [T1] });
  chk(run('update.js', ['--offline'], env(T1 + 'T12:00Z'), 'run 2, the next morning').status === 0, 'run 2');
  const Bs = readJSON(STATE);
  const byIdEve = Object.fromEntries(A2.games.map(g => [g.id, g]));
  const dayB = Bs.games.filter(g => g.date === T0);
  chk(dayB.every(g => g.state === 'final' && g.result), `every game on ${T0} is final and graded`);
  for (const g of dayB) {
    const shown = g.start <= firstStart ? byIdA[g.id] : byIdEve[g.id];                // the call on the page at puck drop
    const r = results[g.id];
    const moved = same(g, shown);
    chk(!moved.length, `the call graded is the call shown before puck drop: ${g.id} ${moved.map(k => `${k} ${JSON.stringify(shown[k])} -> ${JSON.stringify(g[k])}`).join('; ').slice(0, 200)}`);
    chk(g.hs === r.hs && g.as === r.as && g.periods === r.periods, `score carried: ${g.id}`);
    chk(g.result.su === ((r.hs > r.as) === (g.pick === 'home')), `straight-up grade follows the score: ${g.id}`);
    const covered = r.hs - r.as + g.line.homeLine;
    chk(g.result.homeCover === (covered > 0 ? 'win' : covered < 0 ? 'loss' : 'push'), `puck line grade follows the margin: ${g.id}`);
    if (shown.plPick) chk(g.result.pl === (g.result.homeCover === 'push' ? 'push' : ((g.result.homeCover === 'win') === (shown.plPick === 'home') ? 'win' : 'loss')), `the puck line side shown is the one graded: ${g.id}`);
    else chk(!g.result.pl, `no puck line side shown, none graded: ${g.id}`);
    if (shown.ouPick) { const t = r.hs + r.as; chk(g.result.ou === (t === g.line.total ? 'push' : ((t > g.line.total) === (shown.ouPick === 'over') ? 'win' : 'loss')), `totals pick graded: ${g.id}`); }
    if (shown.mlPick) chk(g.result.ml === ((r.hs > r.as) === (shown.mlPick === 'home') ? 'win' : 'loss'), `moneyline pick graded: ${g.id}`);
  }
  const dayT1 = Bs.games.filter(g => g.date === T1);
  chk(dayT1.every(g => g.state === 'pre' && g.line && g.line.at.startsWith(T1)), `the lines on ${T1} are the morning's, refreshed`);
  const R = Bs.record; const graded = Bs.games.filter(g => g.result);
  chk(R.su.w + R.su.l === graded.length, `the record counts every graded game (${R.su.w}-${R.su.l} of ${graded.length})`);
  chk(R.pl.w + R.pl.l + R.pl.p === graded.filter(g => g.result.pl).length, 'the puck line record counts every graded pick');
  chk(R.ou.w + R.ou.l + R.ou.p === graded.filter(g => g.result.ou).length, 'the totals record counts every graded pick');
  chk(Object.values(R.byMonth).reduce((a, m) => a + m.su.w + m.su.l, 0) === graded.length, 'the months add to the whole');
  const gp = Object.values(Bs.teams).reduce((a, t) => a + t.gp, 0);
  chk(gp === 2 * graded.length, `the standings count every final twice (${gp} vs ${2 * graded.length})`);
  const pts = Object.values(Bs.teams).reduce((a, t) => a + t.pts, 0), otl = Object.values(Bs.teams).reduce((a, t) => a + t.otl, 0);
  chk(pts === 2 * graded.length + otl, 'points are two a game plus the loser point');
  chk(otl === graded.filter(g => g.periods > 3).length, 'a loser point for every game past regulation');
  chk(Bs.playoff.remaining === games.filter(g => g.date > T0).length && Bs.phase === 'regular', `the simulation plays the ${Bs.playoff.remaining} games left, in the regular season`);
  /* run 3: nothing new; the file is left alone */
  const beforeC = fs.readFileSync(STATE, 'utf8');
  run('update.js', ['--offline'], env(T1 + 'T12:00Z'), 'run 3, a quiet rerun');
  chk(fs.readFileSync(STATE, 'utf8') === beforeC, 'a rerun with nothing new leaves state.json alone');
  const sm = run('smoke.js', [], { NHL_STATE: STATE, NHL_DATA: B, NHL_PREV_STATE: path.join(SCRATCH, 'A-evening.json') }, 'smoke.js over A');
  chk(sm.status === 0 && / 0 failures/.test(sm.out), 'smoke over the fabricated season: ' + sm.out.trim().split('\n').filter(l => /checks|FAIL/.test(l)).slice(0, 6).join(' | '));
  return { games, results };
}

/* ---------- C. the playoffs ---------- */
function partC(B, games, results) {
  console.log('C. the season played out, then the playoffs');
  const DC = dataDir('C', B), OUT = mkdir('C-sb'), STATE = path.join(SCRATCH, 'C-state.json');
  const lastReg = games[games.length - 1].date;
  const byDate = {};
  for (const g of games) { results[g.id] = results[g.id] || score(g); (byDate[g.date] = byDate[g.date] || []).push(event(g, Object.assign({ state: 'post' }, results[g.id]))); }
  writeDays(OUT, byDate);
  const env = day => ({ NHL_TODAY: day, NHL_NOW: day + 'T16:00Z', NHL_STATE: STATE, NHL_OUT: OUT, NHL_TEAMS: path.join(DC, 'teams.json'), NHL_DATA: DC, NHL_SEASON: String(SEASON) });
  chk(run('update.js', ['--offline'], env(addDays(lastReg, 1)), 'the regular season over').status === 0, 'the regular season runs to its end');
  const C1 = readJSON(STATE);
  chk(C1.phase === 'postseason', `the regular season over is the postseason (${C1.phase})`);
  const field = conf => [].concat(...C1.playoff.bracket[conf].series);
  chk(['East', 'West'].every(c => field(c).every(t => C1.playoff.odds[t].playoff === 1)) && Object.values(C1.playoff.odds).filter(o => o.playoff === 1).length === 16, 'the field is the real one: sixteen clubs in, for certain');
  /* the first round: a sweep, an upset, series under way */
  let n = 0, day = addDays(lastReg, 3);
  const po = [], pgame = (a, b, aHome, aWins, d) => { const id = `9${String(++n).padStart(8, '0')}`; const home = aHome ? a : b, away = aHome ? b : a; const hs = (aWins === aHome) ? 3 : 1, as = (aWins === aHome) ? 1 : 3; po.push({ id, date: d, start: d + 'T23:00Z', home, away, neutral: false, state: 'post', hs, as, periods: 3 }); };
  const playSeries = (a, b, results2, d0) => results2.forEach((aWins, i) => pgame(a, b, [0, 1, 4, 6].includes(i), aWins, addDays(d0, i * 2)));
  const [e0, e1, e2] = C1.playoff.bracket.East.series, [w0, w1, w2] = C1.playoff.bracket.West.series;
  playSeries(e0[0], e0[1], [true, true, true, true], day);                  // a sweep
  playSeries(w0[0], w0[1], [false, true, false, false, false], day);        // the top seed knocked out
  playSeries(e1[0], e1[1], [true, false, true], day);                       // under way
  playSeries(w1[0], w1[1], [false, true], day);
  playSeries(e2[0], e2[1], [true], day); playSeries(w2[0], w2[1], [false], day);
  const sched = { id: '900000999', date: addDays(day, 8), start: addDays(day, 8) + 'T23:00Z', home: e1[0], away: e1[1], neutral: false, state: 'pre' };
  const writePo = list => { const pb = {}; for (const g of list) (pb[g.date] = pb[g.date] || []).push(event(g, g.state === 'post' ? { state: 'post', hs: g.hs, as: g.as, periods: g.periods, type: 3 } : { state: 'pre', type: 3, odds: oddsOfLine(invented(g)) })); for (const [d, evs] of Object.entries(pb)) { const f = path.join(OUT, `sb_${d}.json`); const had = fs.existsSync(f) ? readJSON(f).events : []; fs.writeFileSync(f, JSON.stringify({ events: had.filter(e => !evs.some(x => x.id === e.id)).concat(evs) })); } };
  writePo(po.concat([sched]));
  chk(run('update.js', ['--offline'], env(addDays(day, 7)), 'the first round under way').status === 0, 'the first round runs');
  const C2 = readJSON(STATE);
  const O = C2.playoff.odds;
  chk(O[e0[1]].cup === 0 && O[e0[1]].conf === 0, `${e0[1]}, swept, has no Cup or conference chance left (${O[e0[1]].cup}, ${O[e0[1]].conf})`);
  chk(O[w0[0]].cup === 0 && O[w0[0]].conf === 0, `${w0[0]}, the top seed knocked out, has none either`);
  chk(O[e0[0]].cup > 0 && O[w0[1]].cup > 0, 'the winners go on with a chance');
  chk(Math.abs(Object.values(O).reduce((a, o) => a + o.cup, 0) - 1) < 0.02, 'Cup chances still sum to one');
  const sw = (C2.playoff.series || []).find(s => s.a === [e0[0], e0[1]].sort()[0] && s.b === [e0[0], e0[1]].sort()[1]);
  chk((C2.playoff.series || []).length === 6 && sw && sw.winner === e0[0] && sw.wins[e0[0]] === 4 && sw.wins[e0[1]] === 0 && C2.playoff.series.every(s => s.round === 1), `every first-round series with a game in it, each with its score and its winner once it has one (${(C2.playoff.series || []).length})`);
  chk(JSON.stringify(C2.playoff.bracket) === JSON.stringify(C1.playoff.bracket), 'the first round as drawn is kept');
  const sg = C2.games.find(g => g.id === sched.id);
  chk(sg && sg.type === 3 && sg.line && sg.frozen, 'a playoff game to come has a call and a line');
  chk(C2.record.byMonth.playoffs && C2.record.byMonth.playoffs.su.w + C2.record.byMonth.playoffs.su.l === po.length, 'the playoffs are their own row of the record');
  const sm = run('smoke.js', [], { NHL_STATE: STATE, NHL_DATA: B, NHL_PREV_STATE: 'none' }, 'smoke.js over the playoffs');
  chk(sm.status === 0 && / 0 failures/.test(sm.out), 'smoke over the playoffs: ' + sm.out.trim().split('\n').filter(l => /checks|FAIL/.test(l)).slice(0, 6).join(' | '));
  /* every round to the Final: the higher seed 4-2, the bracket's way */
  const pts = t => C1.teams[t].pts + C1.teams[t].rw / 100;
  const best = (a, b) => pts(a) >= pts(b) ? [a, b] : [b, a];
  const all = po.filter(g => !['East', 'West'].some(c => [1, 2].some(i => { const s = C1.playoff.bracket[c].series[i]; return (g.home === s[0] && g.away === s[1]) || (g.home === s[1] && g.away === s[0]); })));
  n = 100; let d2 = addDays(day, 10);
  const finish = (a, b, d) => { const [hi, lo] = best(a, b); [true, false, true, true, false, true].forEach((w, i) => { const id = `9${String(++n).padStart(8, '0')}`; const aHome = [0, 1, 4, 6].includes(i); all.push({ id, date: addDays(d, i), start: addDays(d, i) + 'T23:00Z', home: aHome ? hi : lo, away: aHome ? lo : hi, neutral: false, state: 'post', hs: (w === aHome) ? 4 : 2, as: (w === aHome) ? 2 : 4, periods: 3 }); }); return hi; };
  const conf = {};
  for (const c of ['East', 'West']) {
    const s = C1.playoff.bracket[c].series;
    const r1 = s.map((x, i) => i === 0 ? (c === 'East' ? e0[0] : w0[1]) : finish(x[0], x[1], d2));
    const r2 = [finish(r1[0], r1[1], addDays(d2, 8)), finish(r1[2], r1[3], addDays(d2, 8))];
    conf[c] = finish(r2[0], r2[1], addDays(d2, 16));
  }
  const champ = finish(conf.East, conf.West, addDays(d2, 24));
  for (const f of fs.readdirSync(OUT)) if (f > `sb_${lastReg}.json`) fs.rmSync(path.join(OUT, f));
  writePo(all);
  chk(run('update.js', ['--offline'], env(addDays(d2, 32)), 'the Final played').status === 0, 'the playoffs run to the Final');
  const C3 = readJSON(STATE);
  chk(C3.phase === 'over' && C3.playoff.champion === champ, `the season is over and ${champ} won the Cup (${C3.phase}, ${C3.playoff.champion})`);
  chk(C3.playoff.odds[champ].cup === 1 && Object.entries(C3.playoff.odds).every(([t, o]) => t === champ || o.cup === 0), 'the champion has the Cup, nobody else a chance');
  const sm3 = run('smoke.js', [], { NHL_STATE: STATE, NHL_DATA: B, NHL_PREV_STATE: 'none' }, 'smoke.js over a finished season');
  chk(sm3.status === 0 && / 0 failures/.test(sm3.out), 'smoke over a finished season: ' + sm3.out.trim().split('\n').filter(l => /checks|FAIL/.test(l)).slice(0, 6).join(' | '));
  return { STATE, C3 };
}

/* ---------- D. the rollover ---------- */
function partD(B, C) {
  console.log('D. the first run of the next season');
  const DD = dataDir('D', B), OUT = mkdir('D-sb'), STATE = path.join(SCRATCH, 'D-state.json');
  fs.copyFileSync(C.STATE, STATE);
  const aug = `${SEASON}-08-05`;
  const env = { NHL_TODAY: aug, NHL_NOW: aug + 'T16:00Z', NHL_STATE: STATE, NHL_OUT: OUT, NHL_TEAMS: path.join(DD, 'teams.json'), NHL_DATA: DD };
  const r = run('update.js', ['--offline'], env, 'update.js in August');
  chk(r.status === 0, 'the first run of a new season runs');
  const file = path.join(DD, `season_${SEASON}.json`);
  chk(fs.existsSync(file), `the finished season is closed into season_${SEASON}.json`);
  const closed = fs.existsSync(file) ? readJSON(file).rows.length : 0;
  chk(closed === C.C3.games.filter(g => g.state === 'final').length, `with every final of it, playoffs too (${closed})`);
  const Dn = readJSON(STATE);
  chk(Dn.season === SEASON + 1 && Dn.games.length === 0 && Dn.phase === 'offseason', `the new season has no games yet (${Dn.season}, ${Dn.games.length}, ${Dn.phase})`);
  const carry = model.params.carry;
  const off = E.TEAMS.map(t => Math.abs(Dn.teams[t].rating - (1500 + (C.C3.teams[t].rating - 1500) * carry))).sort((a, b) => b - a)[0];
  chk(off < 0.2, `each club starts the new season at its finished-season rating carried ${carry} of the way (largest gap ${off.toFixed(2)})`);
  const sm = run('smoke.js', [], { NHL_STATE: STATE, NHL_DATA: DD, NHL_PREV_STATE: 'none' }, 'smoke.js before the schedule is out');
  chk(sm.status === 0 && / 0 failures/.test(sm.out), 'smoke with no games: ' + sm.out.trim().split('\n').filter(l => /checks|FAIL/.test(l)).slice(0, 6).join(' | '));
  const pl = run('players.js', [], { NHL_DATA: DD, NHL_STATE: STATE, NHL_TODAY: aug }, 'players.js in August');
  chk(pl.status === 0 && new RegExp(`seasons \\d{4}-${SEASON}`).test(pl.out), `the player model keeps the finished season's box scores: ${(/\d+ games with box scores, seasons \d{4}-\d{4}/.exec(pl.out) || [''])[0]}`);
  /* a season that is nowhere is refused */
  const r2 = run('update.js', ['--offline'], Object.assign({}, env, { NHL_TODAY: `${SEASON + 1}-08-05`, NHL_NOW: `${SEASON + 1}-08-05T16:00Z` }), 'update.js a year on, with nothing of the year between');
  chk(r2.status === 1 && /is in neither/.test(r2.out), 'a season missing from the history and the last state is refused');
}

try {
  const { B } = partB();
  const { games, results } = partA(B);
  const C = partC(B, games, results);
  partD(B, C);
} catch (e) { chk(false, 'the simulation itself broke: ' + (e.stack || e.message)); }
fs.writeSync(1, [`${checks} checks, ${fails.length} failures`].concat(fails.map(f => '  FAIL ' + f)).join('\n') + '\n');
if (process.env.NHL_SIM_KEEP) console.log('scratch kept: ' + SCRATCH); else fs.rmSync(SCRATCH, { recursive: true, force: true });
process.exit(fails.length ? 1 : 0);
