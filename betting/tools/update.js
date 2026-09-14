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
 * Gate: before writing, the app's embedded model numbers must equal
 * betting/tools/reference_models.json (the numbers the research harness
 * exported). A mismatch aborts the publish.
 *
 * Exit code 0 = state written (or unchanged); 1 = gate or runtime failure.
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
const KEY = 'x_nfl_betting_model_2026_v1';
const SEASON = 2026;
const args = new Set(process.argv.slice(2));

const FILES = {
  'games.csv': 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv',
  [`stats_team_week_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_${SEASON}.csv`,
  [`stats_player_week_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${SEASON}.csv`,
  [`roster_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${SEASON}.csv`,
  [`injuries_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_${SEASON}.csv`,
  [`depth_charts_${SEASON}.csv`]: `https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_${SEASON}.csv`,
};
const PRIVATE = ['bets', 'bank', 'odds', 'myPicks', 'lastBackup', 'lastBackupHow'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function download() {
  fs.mkdirSync(DATA, { recursive: true });
  const got = [];
  for (const [name, url] of Object.entries(FILES)) {
    const dest = path.join(DATA, name);
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const txt = await r.text();
      if (txt.length < 200 || /<html/i.test(txt.slice(0, 300))) throw new Error('not a CSV');
      fs.writeFileSync(dest, txt);
      got.push(name); log(`downloaded ${name} (${(txt.length / 1048576).toFixed(1)} MB)`);
    } catch (e) {
      if (fs.existsSync(dest)) log(`WARN ${name}: ${e.message}; keeping the previous copy`);
      else log(`WARN ${name}: ${e.message}; no copy available, skipping`);
    }
  }
  return got;
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
  const html = fs.readFileSync(APP, 'utf8');
  gate(html);
  if (!args.has('--offline')) await download();
  const present = Object.keys(FILES).filter(n => fs.existsSync(path.join(DATA, n)));
  if (!present.includes('games.csv')) throw new Error('no games.csv available');

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
  w.eval('renderAll()');
  const st = S();
  const after = Object.keys(st.processed).length;
  const logText = w.document.getElementById('log').textContent.trim().split('\n').filter(Boolean).slice(0, 12).join(' | ');
  log(`graded: ${after} (was ${before}) | log: ${logText}`);
  if (errors.length) throw new Error('app errors: ' + errors.join('; '));

  const out = {};
  for (const k of Object.keys(st)) if (!PRIVATE.includes(k)) out[k] = st[k];
  // the publish stamp only moves when the content moved, so a quiet run commits nothing
  const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
  const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.published; delete c.publishedBuild;
    if (c.depth) delete c.depth.diff; if (c.injuries) delete c.injuries.loaded; if (c.roster) delete c.roster.loaded;   // per-upload bookkeeping, not content
    return JSON.stringify(c); };
  const changed = !prev || strip(prev) !== strip(out);
  out.published = changed || !prev ? new Date().toISOString() : prev.published;
  out.publishedBuild = w.eval('APP_BUILD');
  const json = JSON.stringify(out);
  if (changed) fs.writeFileSync(STATE, json);
  log(`state.json ${changed ? 'written' : 'unchanged'} (${(json.length / 1024).toFixed(0)} KB, ${after} graded games, week ${w.eval('currentWeekDefault()')} next)`);
  process.exit(0);
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
