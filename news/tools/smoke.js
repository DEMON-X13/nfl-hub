/* Smoke test for the news job's data. There is no page here any more: the Season Tracker's page was retired
   on 14 October 2026 and its games went into X NFL Bets and Stats' Game snapshot, which fetches
   data/units.json, data/stats.json and data/notes/ at runtime and draws the Deep Dive with
   nflbets/build/deepdive.js. This holds the files the job writes to the sources they come from, and to what
   that module draws from them:
     - the twins: units.json and stats.json are exactly the consts of units2026.js and stats2026.js;
     - each team's stat line against its own game count in results.js;
     - the Deep Dive's tag constants against their values, and every club's Overall Offense and Defense
       against ../elo/data/model.json, X NFL Bets' own file (tools/deepdive-checks.js);
     - every game of the units' week drawn both ways by deepdive.js possession(): the four rows in order,
       each tag the weighted edge worked out on its own, the ranks and edge shown the file's; and the Overall
       line's tag, deepdive.js headTag() on model.json's units, against the rule (tools/deepdive-checks.js);
     - who the drawn rows name: a starter out named, a quarterback in doubt with the next one named, nobody
       both listed and out (warnings);
     - the Deep Dive's lineups against the nflverse injury report, roster and schedule they were built from
       (tools/lineup-checks.js; the build's own snapshot in tools/.cache when it matches, a fresh download
       otherwise), and to the week the schedule says is current;
     - the fixed cases in tools/cases.js: the rules and their checks on weeks the real files produced (the
       Wednesday before a Thursday game, a quarterback with no healthy backup, the postseason's stat tables,
       the notes' rules), each with the version a review caught fed to the checks, which must fail it;
     - the game notes in data/notes/ (tools/notes.js), every problem a warning;
     - news/index.html, the retired page's address: it sends the visitor to ../nflbets/.
   Run from news/:  npm ci && node tools/smoke.js
   The lineup checks need the nflverse files: when the build's snapshot is missing and the network
   is too, they fail, unless NEWS_SMOKE_OFFLINE=1 says to skip them (each skip is printed).          */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SEASON } = require('./lib');
const LC = require('./lineup-checks');
const DC = require('./deepdive-checks');
const NOTES = require('./notes');
const DD = require('../../nflbets/build/deepdive.js');

const ROOT = path.resolve(__dirname, '..');
const OFFLINE = process.env.NEWS_SMOKE_OFFLINE === '1';

let failed = 0;
const check = (label, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (detail !== undefined ? '  (' + detail + ')' : '')); if (!ok) failed++; };
const skip = (label, why) => console.log('SKIP ' + label + '  (' + why + ')');
/* Warnings: who the Deep Dive lists and what its notes say (the lineup rules against the injury report,
   roster and ESPN's list, a starter out named, a quarterback in doubt with the next one named, nobody
   both listed and out) and the hand-written game notes, every problem in them, their shape included.
   Each is presentation on the week's own data: it prints WARN, never fails the smoke, and is written to
   SMOKE_WARNINGS_FILE when set, which the job reads after its commit to go red, so a lineup case no rule
   has seen, or a note that breaks a rule, never holds back the week's scores, stats and Deep Dive.
   Everything else stays a failure: the twins, the stat lines and their game counts, the unit ranks, the
   tags and the Overall line's tag the snapshot draws, the Overall ratings against model.json, the
   lineups being for the schedule's week and checked on this run's own download, the old address, and
   every fixed case in tools/cases.js (made-up data: only a change to the code can fail one) */
const warned = [];
const warn = (label, ok, detail) => { console.log((ok ? 'ok   ' : 'WARN ') + label + (detail !== undefined ? '  (' + detail + ')' : '')); if (!ok) warned.push(label + (detail !== undefined ? ' (' + detail + ')' : '')); };
const brief = (list, n = 4) => list.length ? `${list.length}: ${list.slice(0, n).join(' | ')}` : undefined;

/* a data file's consts, read here on its own (classic-script consts live in the script's scope) */
function load(rel, names) {
  const file = path.join(ROOT, rel);
  try { return vm.runInNewContext(`${fs.readFileSync(file, 'utf8')}\n;({ ${names.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} })`, {}, { filename: file }); }
  catch (e) { return { error: e.message }; }
}
const readJSON = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } };
/* the same value, whatever the order of an object's keys */
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',')}}` : JSON.stringify(v);
const same = (a, b) => canon(a) === canon(b);

async function run() {
  /* ---- the files ---- */
  const CU = load('data/units2026.js', ['UNITS26', 'UNITS26_META', 'UNITS26_BASIS', 'UNITS26_LINEUPS']);
  const CS = load('data/stats2026.js', ['STATS26', 'STATS26_THROUGH', 'STATS26_ASOF']);
  const CR = load('data/results.js', ['RESULTS']);
  const U = CU.UNITS26, META = CU.UNITS26_META, S26 = CS.STATS26, R = CR.RESULTS || {};
  check('the data files load: units2026.js, stats2026.js, results.js', !CU.error && !CS.error && !CR.error && !!U && !!META && !!S26 && !!CR.RESULTS,
    [CU.error, CS.error, CR.error].filter(Boolean).join(' | ') || `${Object.keys(U || {}).length} clubs' units for week ${META && META.week}, ${Object.keys(S26 || {}).length} clubs' stats, ${Object.keys(R).length} finals`);
  if (!U || !META) { console.log('\nno units to check'); return 1; }

  /* the twins: what the Game snapshot fetches is exactly the .js file's consts */
  const UJ = readJSON(path.join(ROOT, 'data', 'units.json')), SJ = readJSON(path.join(ROOT, 'data', 'stats.json'));
  { const diff = !UJ ? ['units.json missing or not JSON'] : [['season', META.season], ['week', META.week], ['built_at', META.built_at], ['meta', META], ['basis', CU.UNITS26_BASIS], ['lineups', CU.UNITS26_LINEUPS], ['units', U]]
      .filter(([k, v]) => !same(UJ[k], v)).map(([k]) => k).concat(Object.keys(UJ).filter(k => !['season', 'week', 'built_at', 'meta', 'basis', 'lineups', 'units'].includes(k)).map(k => `extra ${k}`));
    check("units.json is units2026.js's consts exactly (the Game snapshot reads it)", !diff.length, diff.length ? `${diff.join(', ')} (rebuild with node tools/context.js)` : `week ${UJ.week}, built ${UJ.built_at}`); }
  { const diff = !SJ ? ['stats.json missing or not JSON'] : [['season', SEASON], ['through', CS.STATS26_THROUGH], ['asof', CS.STATS26_ASOF], ['stats', S26]]
      .filter(([k, v]) => !same(SJ[k], v)).map(([k]) => k).concat(Object.keys(SJ).filter(k => !['season', 'through', 'asof', 'stats'].includes(k)).map(k => `extra ${k}`));
    check("stats.json is stats2026.js's consts exactly (the Game snapshot reads it)", !diff.length, diff.length ? `${diff.join(', ')} (run node tools/pull-week.js)` : `through ${SJ.through}, as of ${SJ.asof}`); }
  /* the Deep Dive is drawn from what the page fetches */
  const D = UJ || { season: META.season, week: META.week, built_at: META.built_at, meta: META, basis: CU.UNITS26_BASIS, lineups: CU.UNITS26_LINEUPS, units: U };

  /* ---- the stat bars: each team's numbers are its own first g finals in results.js, g its own count.
     A team the pull could not verify carries no g (pull-week.js verifyCounts) and none is claimed for it ---- */
  { const FIELDS = ['ppg', 'pa', 'ypp', 'yppa', 'to', 'sk', 'ska', 'third', 'rz', 'expl'];
    const bad = Object.entries(S26 || {}).flatMap(([t, s]) => Object.entries(s).filter(([k, v]) => !(FIELDS.includes(k) && typeof v === 'number' && isFinite(v)) && !(k === 'g' && Number.isInteger(v) && v >= 0)).map(([k, v]) => `${t} ${k} ${JSON.stringify(v)}`));
    check('every stat is a number of a known kind', !bad.length, brief(bad) || `${Object.keys(S26 || {}).length} teams`);
    const teams = Object.keys(S26 || {}).filter(t => S26[t].g != null), uncounted = Object.keys(S26 || {}).filter(t => S26[t].g == null);
    if (uncounted.length && teams.length) console.log(`     (${uncounted.join(', ')}: no verified game count in stats2026.js, so none is claimed or checked)`);
    if (teams.length) {
      const wrong = teams.filter(t => {
        const games = Object.entries(R).map(([k, sc]) => { const [wk, p] = k.split(':'); const [a, h] = p.split('-'); return a === t ? [+wk.slice(2), sc[0], sc[1]] : h === t ? [+wk.slice(2), sc[1], sc[0]] : null; }).filter(Boolean).sort((x, y) => x[0] - y[0]).slice(0, S26[t].g);
        if (games.length !== S26[t].g) return true;
        const f = games.reduce((a, x) => a + x[1], 0) / (games.length || 1), ag = games.reduce((a, x) => a + x[2], 0) / (games.length || 1);
        return S26[t].g > 0 && (Math.abs(f - S26[t].ppg) > 0.06 || Math.abs(ag - S26[t].pa) > 0.06);
      });
      check("each team's stats are its own game count in results.js", wrong.length === 0, wrong.length ? wrong.map(t => `${t} g=${S26[t].g} ppg ${S26[t].ppg}`).join(', ') : `${teams.length} teams`);
    } else skip("each team's stats are its own game count in results.js", 'stats2026.js has no game counts yet; the next pull-week.js run writes them'); }

  /* ---- the Deep Dive's data ---- */
  { const f = DC.checkMeta(META);
    check('deep dive tag constants are their own values (row weights, 0.5 and 1.5; headline 11.9126 points a unit, 0.9645 and 2.8935)', f.length === 0, f.join('; ') || JSON.stringify(META.tags)); }
  const M = readJSON(path.resolve(ROOT, '..', 'elo', 'data', 'model.json'));
  { const r = DC.checkOverall(U, META, M, SEASON);
    check(`deep dive Overall Offense and Defense are model.json's (${r.mode})`, r.fails.length === 0, brief(r.fails) || `built ${META.overall && (META.overall.built_at || META.overall.missing)}`); }
  const UN = ['qb', 'ol', 'rb', 'rec', 'front', 'db'], clubs = Object.keys(U);
  check('every unit ranks the whole league once, each with a finite rating', clubs.length === 32 && UN.every(u => clubs.map(t => U[t][u].rank).sort((a, b) => a - b).join() === Array.from({ length: 32 }, (_, i) => i + 1).join() && clubs.every(t => isFinite(U[t][u].z)))
    && ['passD', 'runD'].every(k => clubs.every(t => isFinite(U[t].vs[k].z))), `${clubs.length} clubs`);
  warn('no player is both listed and out', clubs.every(t => UN.every(u => !(U[t][u].out || []).some(p => (U[t][u].who || []).some(x => x.n === p.n)))));

  /* the sources the lineups were built from: the build's own snapshot when it matches, else a fresh download.
     Their schedule gives the week's games below; with none, betting/state.json's */
  let S = null, why = '';
  try { S = await LC.loadSources(path.join(ROOT, 'tools', '.cache', 'lineup-sources.json'), META, fs); } catch (e) { why = e.message; }
  let games = [], gamesFrom = '';
  if (S) { games = S.games.filter(r => String(r.season) === String(SEASON) && r.game_type === 'REG' && +r.week === META.week).map(r => [r.away_team, r.home_team]); gamesFrom = `the schedule the lineups were checked on (${S.from})`; }
  else {
    const st = readJSON(path.resolve(ROOT, '..', 'betting', 'state.json'));
    if (st && Array.isArray(st.schedule) && +st.season === SEASON) games = st.schedule.filter(g => (g.game_type || 'REG') === 'REG' && +g.week === META.week).map(g => [g.away_team, g.home_team]);
    gamesFrom = "betting/state.json's schedule";
  }
  check(`the units' week ${META.week} has its slate, from ${gamesFrom}`, games.length >= 13 && games.length <= 16 && DD.applies(D, SEASON, META.week), `${games.length} games`);

  /* every game of the week as the Game snapshot draws it, both ways: the four rows, their tags, ranks and
     edges, and the Overall line's tag on model.json's units */
  const sides = games.flatMap(([a, h]) => [[a, h], [h, a]]);
  const drawn = {};
  { const bad = [];
    for (const [off, def] of sides) {
      let r = null; try { r = DD.possession(D, off, def); } catch (e) { bad.push(`${off} v ${def}: threw ${e.message}`); continue; }
      if (!r) { bad.push(`${off} v ${def}: no units for one side`); continue; }
      drawn[off + '-' + def] = r.html;
      bad.push(...DC.checkPossession(r.html, off, def, U[DD.club(off)], U[DD.club(def)]));
    }
    check('deep dive: every game of the week drawn both ways, four rows each, every tag the weighted edge, the ranks and edges the file\'s', sides.length > 0 && bad.length === 0, brief(bad) || `${sides.length} possessions`); }
  if (!M || !M.units || !M.units.off || !M.units.def) skip("the Overall line's tag on every possession", 'no Overall ratings in ../elo/data/model.json');
  else {
    const bad = sides.flatMap(([off, def]) => {
      let t; try { t = DD.headTag(D.meta, M.units.off[off], M.units.def[def]); } catch (e) { return [`${off} v ${def}: threw ${e.message}`]; }
      return DC.checkHead(t, M.units.off[off], M.units.def[def], D.meta, `${off} v ${def}`);
    });
    check(`the Overall line's tag on every possession is the rule's, on model.json's units (built ${M.built_at}, ${M.units.season})`, bad.length === 0, brief(bad) || `${sides.length} possessions`);
  }

  /* who the drawn rows name: every unit missing a starter says so (the defense's pass rush and coverage on its
     side of the line's and the receivers' rows), the quarterback row names who starts, and one in doubt has
     the next one named (this file's own words for where he comes from) */
  { const NF = { chart: 'next on the chart', roster: 'next on the roster', usage: "next by this season's dropbacks" };
    const sideOf = (html, key) => { const seg = (html.split(`class="ddrow" data-dd="${key}"`)[1] || '').split('class="ddrow"')[0]; const [o, d] = seg.split('class="ddside dddef"'); return { off: o || '', def: d || '' }; };
    const miss = [], qbMiss = []; let outs = 0, doubt = 0;
    for (const [off, def] of sides) {
      const html = drawn[off + '-' + def]; if (!html) continue;
      const A = U[DD.club(off)], O = U[DD.club(def)];
      /* [the unit, the row it is drawn in, which side of that row] */
      for (const [unit, key, part, who] of [[A.qb, 'qb', 'off', off], [A.ol, 'ol', 'off', off], [A.rb, 'rb', 'off', off], [A.rec, 'rec', 'off', off], [O.front, 'ol', 'def', def], [O.db, 'rec', 'def', def]])
        if ((unit.out || []).length && ++outs && !sideOf(html, key)[part].includes('class="ddout"')) miss.push(`${who} ${part === 'def' ? (key === 'ol' ? 'front' : 'db') : key}`);
      const q = A.qb;
      if ((q.out || []).length && (q.who || []).length && !sideOf(html, 'qb').off.includes(DD.esc(q.who[0].n) + ' starts;')) miss.push(`${off} qb starter`);
      if ((q.who || []).length && (q.next || q.next_none) && ++doubt && !sideOf(html, 'qb').off.includes(q.next ? `${NF[q.next.from] || NF.chart}: ${DD.esc(q.next.n)}` : DD.esc(q.next_none))) qbMiss.push(off);
    }
    warn('a starter who is out is named in his row, on every game of the week', miss.length === 0, miss.join(', ') || `${outs} unit(s) with someone out, each named`);
    warn('a quarterback in doubt names the next one, on every game of the week', qbMiss.length === 0, qbMiss.join(',') || `${doubt} quarterback(s) in doubt, each with the next one`); }
  /* the quarterback row on made-up states: a backup from the roster says so, and no backup is said, not left blank */
  { const [off, def] = sides[0] || ['ARI', 'LA'], X = JSON.parse(JSON.stringify(D)), q = X.units[DD.club(off)].qb;
    q.who = [{ n: 'Zed Quux', pos: 'QB', q: 'questionable: ankle' }]; q.next = { n: 'Quin Zorb', pos: 'QB', from: 'roster' }; delete q.next_none; delete q.out;
    const a = DD.possession(X, off, def).html.split('class="ddrow"')[1];
    q.next = null; q.next_none = 'no other quarterback on the roster can play (Quin Zorb is out (knee))';
    const b = DD.possession(X, off, def).html.split('class="ddrow"')[1];
    check('the quarterback row says where the next one comes from, or that none can play',
      a.includes('Zed Quux may not start (questionable: ankle); next on the roster: Quin Zorb.') && b.includes('Zed Quux may not start (questionable: ankle); no other quarterback on the roster can play (Quin Zorb is out (knee)).'),
      a.match(/may not start[^<]*/) + ' | ' + b.match(/may not start[^<]*/)); }

  /* ---- the retired page's address: on the web and from disk alike it sends the visitor to X NFL Bets and
     Stats (location.replace, so Back does not loop), with a link for a browser without scripts, never a
     meta refresh, and loads nothing else ---- */
  { const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    const went = protocol => { const to = []; try { for (const src of inline) vm.runInNewContext(src, { location: { protocol, hash: '#tracker', search: '?standalone', replace: u => to.push(u) }, window: {}, document: {} }); } catch (e) { to.push('threw ' + e.message); } return to.join(','); };
    const got = ['https:', 'http:', 'file:'].map(went);
    check('news/index.html sends the visitor to ../nflbets/ with location.replace, on the web and from disk, with a link and no meta refresh',
      got.every(x => x === '../nflbets/') && /<a href="\.\.\/nflbets\/">/.test(html) && !/http-equiv\s*=\s*["']?refresh/i.test(html) && !/<script[^>]+src=|<link[^>]+stylesheet/i.test(html), got.join(' ; ')); }

  /* ---- the cases the rules and their checks must keep, each from a week the real files produced (tools/cases.js) ---- */
  for (const c of require('./cases').cases()) check(`case ${c.name}: ${c.label}`, c.ok, c.ok ? undefined : c.detail);

  /* ---- the game notes (tools/notes.js). Every problem is a warning here, its shape too: a note is a person's
     writing beside the job's data, and a bad one must never hold back the week's results, stats and Deep Dive.
     The Wednesday routine runs node tools/notes.js --strict before it commits, which refuses them all ---- */
  { const R2 = NOTES.checkFiles(null);
    if (!R2.length) skip('the game notes keep their rules', 'no file in data/notes/ yet');
    for (const r of R2) warn(`notes ${path.basename(r.file)}: the shape and the writing rules (tools/notes.js)`, !r.fails.length && !r.warns.length,
      r.fails.length || r.warns.length ? brief([...r.fails.map(m => 'failure: ' + m), ...r.warns], 6) : `${r.games}${r.of != null ? ` of ${r.of}` : ''} games`); }

  /* ---- the Deep Dive's lineups against the report, roster and schedule they were built from ---- */
  if (!S && OFFLINE) skip('lineups against the injury report, roster and schedule', 'NEWS_SMOKE_OFFLINE=1 and no build snapshot: ' + why);
  else if (!S) check('lineups: the injury report, roster and schedule could be read', false, why + ' (set NEWS_SMOKE_OFFLINE=1 to skip these checks offline)');
  else {
    const r = LC.check(U, META, S), RULES = {
      week: 'the lineups are for the schedule\'s current week', official: 'nobody listed whom the report rules Out or Doubtful',
      'q-dnp': 'nobody listed who is Questionable with no practice on the report', 'last-game': 'nobody listed who was Out last game and has not practised since',
      roster: 'nobody listed who is off the active roster, elsewhere, or inactive and not practising', espn: "nobody listed whom ESPN rules out before the team files",
      'espn-q-dnp': "nobody listed whom ESPN has Questionable and not practising on the last practice day, before the team files",
      'next-qb': 'a quarterback in doubt has the next one named',
      announced: "the quarterback ESPN's notes name as this week's starter is listed, when the rules let him play" };
    console.log(`     (lineups checked against ${S.from}: ${r.listed} players listed for week ${r.week}${S.espn ? ', with ESPN\'s list' : ''})`);
    for (const [k, label] of Object.entries(RULES)) {
      if ((k === 'espn' || k === 'espn-q-dnp' || k === 'announced') && !S.espn) { skip('lineups: ' + label, 'no ESPN list in these sources'); continue; }
      const f = r.fails[k] || [];
      (k === 'week' ? check : warn)('lineups: ' + label, f.length === 0, f.length ? `${f.length}: ${f.slice(0, 6).join('; ')}${S.from !== 'the build\'s own snapshot' && !/rebuild with/.test(f[0]) ? ' (rebuild with node tools/context.js)' : ''}` : undefined);
    }
  }
  /* in the job the smoke runs straight after the build: the lineups must have been checked against this
     run's own download (the build's snapshot, written by this run), not a kept file. units2026.js's own
     stamp moves only when the Deep Dive changes, so it is not the proof of a run */
  if (process.env.GITHUB_ACTIONS === 'true') check("the lineups were built and checked on this run's download", !!S && S.from === "the build's own snapshot" && !!S.run_at && Date.now() - Date.parse(S.run_at) < 6 * 3600e3,
    S ? `${S.from}${S.run_at ? ', written ' + S.run_at : ''}` : 'no sources');
  return failed ? 1 : 0;
}

/* ends on its own: a mistake in this file's code exits 1 at once with its stack */
run().then(code => {
  if (warned.length) {
    console.log(`\n${warned.length} warning(s), presentation only: ${failed ? 'listed for a look; this run has failures too, so nothing is published' : 'the job publishes and goes red after its commit'}`);
    /* only on a run with no failure: a failed run is not committed, so the job's last step, which says
       the files were published, must not speak for it */
    if (!failed && process.env.SMOKE_WARNINGS_FILE) fs.writeFileSync(process.env.SMOKE_WARNINGS_FILE, warned.join('\n') + '\n'); }
  console.log(failed || code ? `\n${failed || 1} check(s) failed` : '\nall checks passed');
  process.exit(failed || code ? 1 : 0);
}, e => { console.log('FAIL smoke test crashed  (' + (e && e.stack || e) + ')'); process.exit(1); });
