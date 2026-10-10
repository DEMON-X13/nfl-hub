/* Headless weekly update for the betting site.
 *
 *   node betting/tools/update.js            download nflverse files, grade, write betting/state.json
 *   node betting/tools/update.js --offline  use files already in data/ (no download)
 *   node betting/tools/update.js --rebuild  start from the preseason board and replay the season
 *
 * Runs the real app (betting/app/x_nfl_betting_model.html) in jsdom through the
 * same upload path the owner used by hand, starting from the previously
 * published state, so grading is idempotent: games already graded are skipped,
 * games whose stats are not published yet wait for the next run.
 *
 * The app runs with the behaviour patches in betting/tools/patches.js (who starts at
 * quarterback, neutral sites, the call frozen at kickoff), the same ones the page runs it with.
 * The season is the app's own (freshState), so the files downloaded are that season's.
 *
 * Gate: before writing, the app's embedded model numbers must equal
 * betting/tools/reference_models.json (the numbers the research harness
 * exported). A mismatch aborts the publish.
 *
 * A file the season needs and cannot be had fails the run before anything is written, so the
 * last good state stays live and the job goes red: games.csv always; the roster and depth chart
 * from a week before the season's first game; the injury report from its first kickoff (none is
 * filed before the week of the opener, and nflverse's file is a 404 until one is: before then the
 * run publishes without it and the absences card says there is no report yet); both stats files
 * once a game is a day and a half old (patches.filesDue). A failed download is never covered by an
 * older copy left in data/.
 *
 * BETTING_NOW (an ISO time) stands in for the clock, for tests.
 *
 * Exit code 0 = state written (or unchanged); 1 = gate, missing file or runtime failure.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const Papa = require('papaparse');

const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'betting', 'app', 'x_nfl_betting_model.html');
const STATE = path.join(ROOT, 'betting', 'state.json');
const EVENTS = path.join(ROOT, 'betting', 'events.json');
const DATA = path.join(ROOT, 'data');
const REF = path.join(__dirname, 'reference_models.json');
const patches = require('./patches.js');
/* the season and the storage key are the app's own (freshState and KEY), the one place they are set */
const { season: SEASON, key: KEY } = patches.season(fs.readFileSync(APP, 'utf8'));
const args = new Set(process.argv.slice(2));
const NOW = process.env.BETTING_NOW ? Date.parse(process.env.BETTING_NOW) : Date.now();
if (!isFinite(NOW)) throw new Error('BETTING_NOW is not a time: ' + process.env.BETTING_NOW);
const T0 = Date.now();

const FILES = {
  'games.csv': 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv',
  [`stats_team_week_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_${SEASON}.csv`,
  [`stats_player_week_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${SEASON}.csv`,
  [`roster_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${SEASON}.csv`,
  [`injuries_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_${SEASON}.csv`,
  [`depth_charts_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_${SEASON}.csv`,
};
const PRIVATE = ['bets', 'bank', 'myPicks', 'lastBackup', 'lastBackupHow'];   // odds are public (nflverse moneylines), published for the Bank Roll tab
/* keys earlier runs published and nothing reads any more. The app is seeded with the last
 * published state and keeps every key of it, so a key that is no longer written still has to
 * be left out here or it is carried forward for good. */
const RETIRED = ['picks', 'publishedBuild'];
/* Joker Jr, a test model the job ran beside the Joker for a few days of October 2026, was
 * retired for trailing it. Its step published state.jokerLong (its calls), state.jokerLongInfo,
 * processed[gid].jokerLong (its grades) and, while it could not run, modelStatus.jokerLong; the
 * app is seeded with the published state and keeps all of them, so they are dropped here: those
 * keys and nothing else (a modelStatus left empty goes too, as jobkit.set_status never leaves an
 * empty one). On a state that carries none of them this changes nothing. */
function dropJokerJr(out) {
  delete out.jokerLong; delete out.jokerLongInfo;
  for (const r of Object.values(out.processed || {})) if (r && typeof r === 'object') delete r.jokerLong;
  if (out.modelStatus && typeof out.modelStatus === 'object') {
    delete out.modelStatus.jokerLong;
    if (!Object.keys(out.modelStatus).length) delete out.modelStatus;
  }
}
/* the injury report's columns the app reads (the week's designations, who and where); the
 * rest of nflverse's columns, the injuries themselves among them, are left out of the file
 * the site fetches on every load */
const INJ_COLS = ['season', 'game_type', 'team', 'week', 'gsis_id', 'position', 'full_name', 'report_status', 'practice_status'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function download() {
  fs.mkdirSync(DATA, { recursive: true });
  const failed = {};
  for (const [name, url] of Object.entries(FILES)) {
    const dest = path.join(DATA, name);
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const txt = await r.text();
      if (txt.length < 200 || /<html/i.test(txt.slice(0, 300))) throw new Error('not a CSV');
      fs.writeFileSync(dest, txt);
      log(`downloaded ${name} (${(txt.length / 1048576).toFixed(1)} MB)`);
    } catch (e) {
      /* an older copy in data/ is last run's, not this one's: it is set aside, so a file that did not
         come down this run is missing, and required() decides whether that stops the run */
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      failed[name] = e.message; log(`WARN ${name}: ${e.message}`);
    }
  }
  return failed;
}

/* which files this run cannot do without, from where the season stands in games.csv
   (patches.filesDue, the rule the smoke test holds the published state to as well) */
function required(games) {
  const due = patches.filesDue(games.filter(r => +r.season === SEASON), NOW);
  return name => name === 'games.csv' || (/^(roster|depth_charts)_/.test(name) && due.lineups) || (/^injuries_/.test(name) && due.injuries) || (/^stats_/.test(name) && due.stats);
}

function embedded(html, name) {
  const m = html.match(new RegExp('^const ' + name + ' = (\\{.*?\\});$', 'm'));
  return m ? JSON.parse(m[1]) : null;
}
function close(a, b, tol) {
  if (a && typeof a === 'object' && !Array.isArray(a)) { const ka = Object.keys(a), kb = Object.keys(b || {}); return ka.length === kb.length && ka.every(k => close(a[k], b[k], tol)); }
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => close(x, b[i], tol));
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol;
  return a === b;
}
function gate(html) {
  const ref = JSON.parse(fs.readFileSync(REF, 'utf8'));
  const A = embedded(html, 'MODEL'), H = embedded(html, 'MODEL_H'), QB = embedded(html, 'QB_MODEL');
  const bad = [];
  for (const k of ['params', 'league_means', 'pure', 'teams']) { if (!close(A[k], ref.A[k], 1e-9)) bad.push('MODEL.' + k); if (!close(H[k], ref.H[k], 1e-9)) bad.push('MODEL_H.' + k); }
  if (!close(QB, ref.QB, 1e-9)) bad.push('QB_MODEL');
  if (bad.length) throw new Error('GATE FAILED: embedded numbers differ from reference_models.json in ' + bad.join(', '));
  log('gate: embedded model numbers match the harness reference');
}

async function main() {
  const raw = fs.readFileSync(APP, 'utf8');
  gate(raw);
  const html = patches(raw);
  const failed = args.has('--offline') ? {} : await download();
  const present = Object.keys(FILES).filter(n => fs.existsSync(path.join(DATA, n)));
  if (!present.includes('games.csv')) throw new Error('no games.csv available' + (failed['games.csv'] ? ': ' + failed['games.csv'] : ''));
  { const need = required(Papa.parse(fs.readFileSync(path.join(DATA, 'games.csv'), 'utf8'), { header: true, skipEmptyLines: true }).data);
    const missing = Object.keys(FILES).filter(n => need(n) && !present.includes(n));
    if (missing.length) throw new Error('the season needs ' + missing.map(n => n + (failed[n] ? ' (' + failed[n] + ')' : ' (not in data/)')).join(', ')
      + ' and it could not be had: nothing is written, the last published state stays live');
    /* a report that downloads but is not this season's is as good as missing */
    if (present.includes(`injuries_${SEASON}.csv`) && need(`injuries_${SEASON}.csv`)) {
      const rows = Papa.parse(fs.readFileSync(path.join(DATA, `injuries_${SEASON}.csv`), 'utf8'), { header: true, skipEmptyLines: true }).data;
      if (!rows.some(r => +r.season === SEASON)) throw new Error(`injuries_${SEASON}.csv has no ${SEASON} rows: nothing is written`);
    } }

  const saved = (!args.has('--rebuild') && fs.existsSync(STATE)) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
  const errors = [];
  const dom = new JSDOM(html.replace(/<script src="https:\/\/cdnjs[^"]*papaparse[^"]*"><\/script>/, ''), {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
    beforeParse(w) {
      w.Papa = { parse(input, cfg) {
        if (input && typeof input.text === 'function') {
          input.text().then(t => {
            if (cfg.step) Papa.parse(t, { header: true, skipEmptyLines: true, step: r => cfg.step(r), complete: () => cfg.complete && cfg.complete() });
            else cfg.complete(Papa.parse(t, { header: cfg.header, skipEmptyLines: cfg.skipEmptyLines }));
          });
          return;
        }
        return Papa.parse(input, cfg);
      } };
      w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      w.fetch = () => Promise.reject(new Error('no network inside the app'));
      /* BETTING_NOW: the app's own clock too, so what it stamps (the files' read times) agrees
         with the publish time a test sets */
      if (process.env.BETTING_NOW) { const Real = w.Date, t0 = Date.now();
        const now = () => NOW + (Date.now() - t0);
        w.Date = class extends Real { constructor(...a) { if (a.length) super(...a); else super(now()); } static now() { return now(); } }; }
      if (saved) w.localStorage.setItem(KEY, JSON.stringify(saved));
      w.addEventListener('error', e => errors.push(e.message));
    },
  });
  const w = dom.window;
  await sleep(100);
  const S = () => w.eval('S');
  const before = Object.keys(S().processed).length;
  log(`app ${w.eval('APP_BUILD')} | ${saved ? 'resuming from published state' : 'fresh preseason state'} | graded so far: ${before}`);

  // manual team news (resting starters etc.) from events.json, applied once by id
  if (fs.existsSync(EVENTS)) {
    const ev = JSON.parse(fs.readFileSync(EVENTS, 'utf8'));
    const st = S(); let added = 0;
    for (const e of ev) {
      if (!e.id || st.events.some(x => x.id === e.id)) continue;
      st.events.push({ id: e.id, type: e.type, team: e.team, note: e.note || '', week: e.week, startGames: st.gamesPlayed[e.team] || 0, ended: false });
      added++;
    }
    if (added) log(`events.json: ${added} new team-news entries applied`);
  }

  // carry the text on the File so the Papa shim never needs a browser file reader
  const files = present.map(n => { const txt = fs.readFileSync(path.join(DATA, n), 'utf8'); const f = new w.File([txt], n); f.text = async () => txt; return f; });
  await w.handleAnyFiles(files);
  await sleep(8000);                       // the depth chart streams; give it time
  // moneylines from games.csv, the same way the app's Fetch moneylines button does it
  { const rows = Papa.parse(fs.readFileSync(path.join(DATA, 'games.csv'), 'utf8'), { header: true, skipEmptyLines: true }).data;
    const st0 = S(); const known = new Set(st0.schedule.map(g => g.game_id)); st0.odds = st0.odds || {}; let n = 0;
    for (const row of rows) { if (!known.has(row.game_id)) continue; const a = parseFloat(row.away_moneyline), h = parseFloat(row.home_moneyline);
      if (!isFinite(a) && !isFinite(h)) continue; st0.odds[row.game_id] = { away: isFinite(a) ? a : null, home: isFinite(h) ? h : null, src: 'nflverse' }; n++; }
    log(`moneylines: ${n} games`); }
  /* each coming game's call, recorded until its kickoff and kept from then on (patches.js) */
  const frozen = w.eval(`freezeAtKickoff(${NOW})`);
  w.eval('renderAll()');
  const st = S();
  /* who the app expects at quarterback against who nflverse's schedule names, for the log: the
     schedule's names are not trusted either way (it named Drew Lock for SEA while Darnold
     started), but a disagreement is worth a look */
  { const cur = w.eval('currentWeekDefault()'), last = s => String(s || '').toLowerCase().replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '').trim().split(/[\s.]+/).filter(Boolean).pop();
    const off = [];
    for (const g of st.schedule.filter(x => +x.week === cur && x.result == null))
      for (const [team, named] of [[g.away_team, g.away_qb_name], [g.home_team, g.home_qb_name]]) {
        const exp = w.eval(`expectedQB(${JSON.stringify(team)},${cur})`); if (!exp || !named) continue;
        const nm = exp === '__none__' ? 'nobody' : w.eval(`qbName(${JSON.stringify(exp)})`);
        if (last(nm) !== last(named)) off.push(`${team} ${nm} (nflverse's schedule: ${named})`);
      }
    log(`quarterbacks, week ${cur}: ${off.length ? 'the app and the schedule disagree on ' + off.join('; ') : 'the app and the schedule agree'} | calls held for kickoff: ${frozen}`); }
  const after = Object.keys(st.processed).length;
  const logText = w.document.getElementById('log').textContent.trim().split('\n').filter(Boolean).slice(0, 12).join(' | ');
  log(`graded: ${after} (was ${before}) | log: ${logText}`);
  if (errors.length) throw new Error('app errors: ' + errors.join('; '));

  const out = {};
  for (const k of Object.keys(st)) if (!PRIVATE.includes(k) && !RETIRED.includes(k)) out[k] = st[k];
  dropJokerJr(out);
  if (out.injuries && Array.isArray(out.injuries.rows))
    out.injuries = { ...out.injuries, rows: out.injuries.rows.map(r => Object.fromEntries(INJ_COLS.filter(c => c in r).map(c => [c, r[c]]))) };

  // the publish stamp only moves when the content moved, so a quiet run commits nothing
  const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
  const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.published;
    if (c.depth) delete c.depth.diff; if (c.injuries) delete c.injuries.loaded; if (c.roster) delete c.roster.loaded;   // per-upload bookkeeping, not content
    return JSON.stringify(c); };
  const changed = !prev || strip(prev) !== strip(out);
  out.published = changed || !prev ? new Date(NOW + (Date.now() - T0)).toISOString() : prev.published;
  const json = JSON.stringify(out);
  if (changed) fs.writeFileSync(STATE, json);
  log(`state.json ${changed ? 'written' : 'unchanged'} (${(json.length / 1024).toFixed(0)} KB, ${after} graded games, week ${w.eval('currentWeekDefault()')} next)`);
  /* for the workflow: a newly graded game is what the Elo job's team ratings are waiting on */
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `graded_new=${after - before}\n`);
  process.exit(0);
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
