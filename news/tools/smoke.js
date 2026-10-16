/* Smoke test for the news job's data. There is no page here any more: the Season Tracker's page was retired
   on 14 October 2026 and its games went into NFL Hub's Game snapshot, which fetches data/units.json and
   data/notes/ at runtime and draws the Deep Dive with nflbets/build/deepdive.js (data/stats.json, which
   its Stat breakdown read, is still written and held here, though no page reads it since that card went
   on 16 October 2026, the owner's call). This holds the files the job writes to the sources they come from, and to what
   that module draws from them:
     - the twins: units.json and stats.json are exactly the consts of units2026.js and stats2026.js;
     - each team's stat line against its own game count in results.js;
     - the Deep Dive's tag constants against their values, and every club's Overall Offense and Defense
       against ../elo/data/model.json, X NFL Bets' own file (tools/deepdive-checks.js);
     - every game of the units' week drawn both ways by deepdive.js possession(): the four rows in order,
       each tag the weighted edge worked out on its own, each row's two sides the offense's then the
       defense's, each its own club, its figure the Elo ../elo/data has for it (the owner's call, 16 October
       2026: the quarterback's own season Elo from players.json through matchups.json's lineup for the game,
       against the Overall Defense; Pass Protection against Pass Rush, Run Offense against Run Defense, Pass
       Offense against Pass Defense, from model.json's units), worked out by tools/deepdive-checks.js on its
       own, the higher marked, each Elo wearing the shield eloSides() was handed for it (a stand-in here:
       the page's own pkTierBadge is held by nflbets/build/smoke.js), and the rank from units.json only
       where there is no Elo, with no shield, the edge shown the
       file's, the defense's position it faces named (the owner's call, 16 October 2026), and no name, no
       one out and no other number in a row (the owner's call, 14 October 2026: a row is its unit, the
       clubs and figures, the defense's position and its tag; who plays is the snapshot's Starters card's);
       how often the higher Elo and the row's tag point opposite ways is printed, never checked (the tag
       is the Deep Dive's tested rule on its own ratings); what the rows rest on,
       deepdive.js basis() (the snapshot's "Position matchups" label's title), naming each side with its
       own count of this season's games; and the Overall
       line's tag, deepdive.js headTag() on model.json's units, against the rule (tools/deepdive-checks.js);
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
/* Warnings: who the Deep Dive's file lists (the lineup rules against the injury report, roster and
   ESPN's list, nobody both listed and out) and the hand-written game notes, every problem in them, their
   shape included.
   Each is presentation on the week's own data: it prints WARN, never fails the smoke, and is written to
   SMOKE_WARNINGS_FILE when set, which the job reads after its commit to go red, so a lineup case no rule
   has seen, or a note that breaks a rule, never holds back the week's scores, stats and Deep Dive.
   Everything else stays a failure: the twins, the stat lines and their game counts, the unit ranks, the
   tags, the note's game counts and the Overall line's tag the snapshot draws, the Overall ratings against
   model.json, the lineups being for the schedule's week and checked on this run's own download, the old
   address, and every fixed case in tools/cases.js (made-up data: only a change to the code can fail one) */
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
  if (S) { games = S.games.filter(r => String(r.season) === String(SEASON) && r.game_type === 'REG' && +r.week === META.week).map(r => [r.away_team, r.home_team, r.game_id]); gamesFrom = `the schedule the lineups were checked on (${S.from})`; }
  else {
    const st = readJSON(path.resolve(ROOT, '..', 'betting', 'state.json'));
    if (st && Array.isArray(st.schedule) && +st.season === SEASON) games = st.schedule.filter(g => (g.game_type || 'REG') === 'REG' && +g.week === META.week).map(g => [g.away_team, g.home_team, g.game_id]);
    gamesFrom = "betting/state.json's schedule";
  }
  check(`the units' week ${META.week} has its slate, from ${gamesFrom}`, games.length >= 13 && games.length <= 16 && DD.applies(D, SEASON, META.week), `${games.length} games`);

  /* every game of the week as the Game snapshot draws it, both ways: the four rows, their tags, figures
     and edges, and the Overall line's tag on model.json's units. The figures are Elo from ../elo/data (the
     owner's call, 16 October 2026), handed to possession() by deepdive.js eloSides() as the snapshot hands
     them, and held to deepdive-checks.js's own reading of the same files. The tier shield each Elo wears is
     the page's pkTierBadge there; here a stand-in naming its Elo, so the plumbing is held (one shield beside
     each Elo, its own, none beside a rank) */
  const BADGE = e => `<svg class="tierbadge" data-elo="${e}" role="img" aria-label="stand-in tier"><title>stand-in tier</title></svg>`;
  const sides = games.flatMap(([a, h, gid]) => [[a, h, gid], [h, a, gid]]);
  const PL = readJSON(path.resolve(ROOT, '..', 'elo', 'data', 'players.json')), MU = readJSON(path.resolve(ROOT, '..', 'elo', 'data', 'matchups.json'));
  { const bad = [], seen = { elo: 0, rank: 0 }, split = { rows: 0, opposite: 0, even: 0, at: [] };
    for (const [off, def, gid] of sides) {
      let r = null; try { r = DD.possession(D, off, def, DD.eloSides(M, PL, MU, gid, off, def, null, BADGE)); } catch (e) { bad.push(`${off} v ${def}: threw ${e.message}`); continue; }
      if (!r) { bad.push(`${off} v ${def}: no units for one side`); continue; }
      const W = DC.eloWant(M, PL, MU, gid, off, def);
      bad.push(...DC.checkPossession(r.html, off, def, U[DD.club(off)], U[DD.club(def)], W, BADGE));
      for (const row of r.rows) { const [o, d] = W[row.key]; for (const x of [o, d]) seen[x ? 'elo' : 'rank']++;
        /* the higher Elo against the tag's side: Favorable or Easy is the offense's, Tough or Very tough the defense's */
        if (!o || !d || o.elo === d.elo) continue; split.rows++;
        if (row.tag === 'Even') { split.even++; continue; }
        const tagO = /Favorable|Easy/.test(row.tag); if (tagO !== (o.elo > d.elo)) { split.opposite++; split.at.push(`${off} ${row.key} ${o.elo}-${d.elo} ${row.tag}`); } }
    }
    check('deep dive: every game of the week drawn both ways, four rows each, every tag the weighted edge, each row\'s two sides headed by their own clubs, each figure the Elo ../elo/data has for it with its shield (the rank only where it has none), the quarterback\'s against the Overall Defense, the higher marked, the edges the file\'s, the defense\'s position named, no name or other number in a row', sides.length > 0 && bad.length === 0, brief(bad) || `${sides.length} possessions, ${seen.elo} sides on Elo and ${seen.rank} on a rank`);
    console.log(`     (the higher Elo and the row's tag: of ${split.rows} rows with two different Elo, ${split.even} tagged Even and ${split.opposite} tagged the other way${split.at.length ? ': ' + split.at.slice(0, 12).join(', ') + (split.at.length > 12 ? ', ...' : '') : ''})`); }
  /* what the rows rest on (deepdive.js basis(), the title of the snapshot's "Position matchups" label): each
     side named with its own count of this season's games,
     the file's g26, worked out here, and a club with no count given none. On every game of the week, and on a
     made-up pair whose counts differ, so a count given to the other side fails in a week where they tie */
  { const rx = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const said = (txt, t, n) => new RegExp(`(?<![A-Z])${rx(t)} ${n} game${n === 1 ? '' : 's'}(?![a-z])`).test(txt);
    const counted = (txt, t) => new RegExp(`(?<![A-Z])${rx(t)} \\d+ games?(?![a-z])`).test(txt);
    const bad = [];
    const hold = (DX, a, h, at) => {
      let txt; try { txt = DD.basis(DX, a, h); } catch (e) { bad.push(`${at}: threw ${e.message}`); return; }
      for (const t of [a, h]) {
        const u = (DX.units || {})[DD.club(t)], n = u ? u.g26 : null;
        if (n != null ? !said(txt, t, n) : counted(txt, t)) bad.push(`${at}: ${n != null ? `no "${t} ${n} game${n === 1 ? '' : 's'}"` : `${t} given a count the file does not have`}`);
      }
    };
    for (const [a, h] of games) hold(D, a, h, `${a} at ${h}`);
    if (games.length && D.units && D.units[DD.club(games[0][0])] && D.units[DD.club(games[0][1])]) {
      const [a, h] = games[0], X = JSON.parse(JSON.stringify(D));
      X.units[DD.club(a)].g26 = 1; X.units[DD.club(h)].g26 = 7; hold(X, a, h, `made-up ${a} 1, ${h} 7`);
      X.units[DD.club(a)].g26 = null; hold(X, a, h, `made-up ${a} none, ${h} 7`);
    }
    check("deep dive: what the rows rest on gives each side its own count of this season's games (units.json's g26), on every game of the week and a made-up pair",
      games.length > 0 && bad.length === 0, brief(bad) || `${games.length} games`); }
  if (!M || !M.units || !M.units.off || !M.units.def) skip("the Overall line's tag on every possession", 'no Overall ratings in ../elo/data/model.json');
  else {
    const bad = sides.flatMap(([off, def]) => {
      let t; try { t = DD.headTag(D.meta, M.units.off[off], M.units.def[def]); } catch (e) { return [`${off} v ${def}: threw ${e.message}`]; }
      return DC.checkHead(t, M.units.off[off], M.units.def[def], D.meta, `${off} v ${def}`);
    });
    check(`the Overall line's tag on every possession is the rule's, on model.json's units (built ${M.built_at}, ${M.units.season})`, bad.length === 0, brief(bad) || `${sides.length} possessions`);
  }

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
     The Wednesday routine runs node tools/notes.js --strict before it commits, which refuses them all. A file
     the validator throws on is a warning too, never a crash: it would hold the week's data back the same way ---- */
  try {
    const R2 = NOTES.checkFiles(null);
    if (!R2.length) skip('the game notes keep their rules', 'no file in data/notes/ yet');
    for (const r of R2) warn(`notes ${path.basename(r.file)}: the shape and the writing rules (tools/notes.js)`, !r.fails.length && !r.warns.length,
      r.fails.length || r.warns.length ? brief([...r.fails.map(m => 'failure: ' + m), ...r.warns], 6) : `${r.games}${r.of != null ? ` of ${r.of}` : ''} games`);
  } catch (e) { warn('the game notes keep their rules (tools/notes.js)', false, `the validator threw: ${e && e.message || e}`); }

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
