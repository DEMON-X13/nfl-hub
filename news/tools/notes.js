/* The game notes: data/notes/<season>-w<week>.json, a one-sentence preview and a short news note for each
   game of a week, written each Wednesday by hand (HANDOFF.md) and read at runtime by X NFL Bets and Stats'
   Game snapshot, which shows them under the two teams' records and escapes every word. A game with no
   note shows an automatic line instead, so a file may leave games out.

     { "season": 2026, "week": 6, "written": "2026-10-14",
       "games": { "2026_06_SEA_DEN": { "preview": "...", "news": "...", "sources": ["ESPN", "Denver Post"] } } }

   The rules, each a failure or a warning (CLAUDE.md, "Checks block or warn"):
     failures  the shape: JSON that parses, season and week whole numbers and the file name's, written
               an ISO date or datetime, games an object keyed by the week's own nflverse game ids
               (betting/state.json's schedule, LA for the Rams), each with a preview string, news a string
               where given, sources an array of names where given.
     warnings  the wording: a preview one sentence of 40 to 200 characters ending in . ! or ?, with no
               record or score typed (the records are shown beside it, and a typed one goes stale); news
               at most 300 characters; in either, no betting words (a spread, in words or as a number:
               -3.5, -3½, or a whole one where a spread is written, "Indianapolis -7", "(-7)", "Line: IND
               -7", "at -3"; a favourite or underdog, the line, odds or a price like +150, a total,
               covering, a book's name, a bet or parlay: the notes are the games' story, the snapshot
               shows the market apart), none of the site's own ranks (tools/lib.js siteRankQuote: they
               move under a note that does not), no em dash or double dash, no markup (plain text: the
               page shows it as typed); sources short names.
   The wording rules are warnings so the job never holds back the week's results, stats and Deep Dive over a
   note: the news smoke (tools/smoke.js) reports every note problem, failures included, as a warning. The
   Wednesday routine runs this --strict before it commits, so a note that breaks any rule is not committed.

     node tools/notes.js [--strict] [file...]      (from news/; default: every file in data/notes/)

   Exits 1 on any failure, and with --strict on any warning too. require('./notes').check(obj, { file,
   schedule }) gives { fails, warns } for one file: file its name, schedule { season, games: [{ game_id,
   week }] }; with no schedule, or one of another season, the keys are held to the id's form alone. */
'use strict';
const fs = require('fs'), path = require('path');
const { siteRankQuote } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'data', 'notes');

/* a spread written as a whole number: only where a spread is written, after a team's name or code
   ("Indianapolis -7", "IND -7", "Jaguars -3"), "Line:" or "at" ("Colts at -3"), or alone in brackets
   ("Indianapolis (-7) hosts"), never a stat ("a -5 turnover margin", "Stroud (-2 yards)", "(-0.07 EPA)") or a
   score ("won 24-17"). A half point (-3.5, -3½) is one wherever it stands */
const TEAM_WORDS = ['Arizona', 'Atlanta', 'Baltimore', 'Buffalo', 'Carolina', 'Chicago', 'Cincinnati', 'Cleveland', 'Dallas', 'Denver',
  'Detroit', 'Green Bay', 'Houston', 'Indianapolis', 'Jacksonville', 'Kansas City', 'Las Vegas', 'Los Angeles', 'Miami', 'Minnesota',
  'New England', 'New Orleans', 'New York', 'Philadelphia', 'Philly', 'Pittsburgh', 'San Francisco', 'Seattle', 'Tampa Bay', 'Tennessee',
  'Washington', 'Cardinals', 'Falcons', 'Ravens', 'Bills', 'Panthers', 'Bears', 'Bengals', 'Browns', 'Cowboys', 'Broncos', 'Lions',
  'Packers', 'Texans', 'Colts', 'Jaguars', 'Jags', 'Chiefs', 'Raiders', 'Chargers', 'Rams', 'Dolphins', 'Vikings', 'Patriots', 'Pats',
  'Saints', 'Giants', 'Jets', 'Eagles', 'Steelers', '49ers', 'Niners', 'Seahawks', 'Buccaneers', 'Bucs', 'Titans', 'Commanders',
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'JAC', 'KC', 'LA', 'LAR',
  'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS', 'WSH'];
const STAT = '(?:%|(?:percent|yards?|yds|points?|pts|turnovers?|takeaways?|giveaways?|margin|differential|EPA|sacks?|plays?|a game|per game|in (?:the )?(?:turnover|point))\\b)';
const SPREAD_WHOLE = new RegExp(`(?:\\b(?:${TEAM_WORDS.join('|')})|\\b[Ll]ine:|\\b[Aa]t)\\s+[+−-]\\d{1,2}(?![\\d½]|[.,]\\d|\\s*${STAT})|\\(\\s*[+−-]\\d{1,2}\\s*\\)`);

/* the betting words: a note is the game's story, never its market. "Las Vegas" is a city, "on the line" and
   "the line of scrimmage" are football, and coverage is not covering */
const BETTING = [
  [/\bspreads?\b/i, 'spread'], [/\bfavou?r(?:ite|ites|ed)\b/i, 'favourite'], [/\bunderdogs?\b/i, 'underdog'],
  [/\bmoney ?lines?\b/i, 'moneyline'], [/\bodds\b/i, 'odds'], [/\bover\/under\b|\bO\/U\b|\b(?:take|took|taking|hit|hits|cash|cashed) the (?:over|under)\b/i, 'over/under'],
  [/\b(?:the|point|game) totals?\b/i, 'the total'], [/\bcover(?:s|ed|ing)?\b/i, 'cover'], [/\bATS\b/, 'ATS'],
  [/(?<!\bLas )\bVegas\b/i, 'Vegas'], [/\bsports ?books?\b/i, 'sportsbook'], [/\bDraft ?Kings\b/i, 'DraftKings'], [/\bFan ?Duel\b/i, 'FanDuel'],
  [/\bbet(?:s|ting|tor|tors)?\b/i, 'bet'], [/\bwager(?:s|ed|ing)?\b/i, 'wager'], [/\bparlays?\b/i, 'parlay'],
  [/(?<!\bon )\bthe line\b(?! of scrimmage)/i, 'the line'], [/\bjuice\b/i, 'juice'], [/\bvig(?:orish)?\b/i, 'vig'],
  [/(?:^|[\s(])[+−-]\d{3,4}\b/, 'a price like +150'], [/(?:^|[\s(])[+−-]\d{1,2}(?:\.5\b|½)/, 'a spread like -3.5'],
  [SPREAD_WHOLE, 'a spread like Indianapolis -7'],
];
const RECORD = /\b\d{1,2}[-–]\d{1,2}(?:[-–]\d{1,2})?\b/;
const NAME = /^(\d{4})-w(\d{1,2})\.json$/;
const ISO = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const FIELDS = new Set(['season', 'week', 'written', 'games']), GAME_FIELDS = new Set(['preview', 'news', 'sources']);
/* an abbreviation or an initial before a full stop does not end a sentence ("C.J. Stroud", "Jr.", "vs.") */
const ABBR = new Set(['jr', 'sr', 'st', 'mr', 'mrs', 'dr', 'vs', 'no', 'mt', 'ft', 'lt', 'gen', 'sgt', 'jan', 'feb', 'aug', 'sept', 'oct', 'nov', 'dec']);
function sentences(t) {
  let n = 1;
  for (const m of t.matchAll(/([A-Za-z.]*)([.!?])["'”’)]?\s+(?=["'“‘(]?[A-Z0-9])/g)) {
    const word = m[1].replace(/\.$/, '');
    if (m[2] === '.' && (/^(?:[A-Za-z]\.)*[A-Za-z]$/.test(word) || ABBR.has(word.toLowerCase()))) continue;
    n++;
  }
  return n;
}

/* the wording rules both texts share */
function wording(t, at, warn) {
  for (const [rx, what] of BETTING) { const m = rx.exec(t); if (m) warn(`${at}: betting language (${what}: "${m[0].trim()}")`); }
  const q = siteRankQuote(t); if (q) warn(`${at}: quotes the site's own ranks ("${q.trim()}")`);
  if (/—/.test(t)) warn(`${at}: an em dash`);
  if (/--/.test(t)) warn(`${at}: a double dash`);
  if (/<\/?[a-z!][^>]*>|&[a-z]+;|&#\d+;/i.test(t)) warn(`${at}: markup (the notes are plain text: the page shows it as typed)`);
  if (t !== t.trim()) warn(`${at}: space at an end`);
}

function check(obj, opts = {}) {
  const fails = [], warns = [], fail = m => fails.push(m), warn = m => warns.push(m);
  const file = opts.file ? path.basename(opts.file) : null, named = file && NAME.exec(file);
  if (file && !named) fail(`${file}: the name is not <season>-w<week>.json`);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { fail('not a JSON object'); return { fails, warns }; }
  for (const k of Object.keys(obj)) if (!FIELDS.has(k)) warn(`an unknown field "${k}" (the page reads season, week, written and games)`);
  const season = obj.season, week = obj.week;
  if (!Number.isInteger(season) || season < 2000) fail(`season ${JSON.stringify(season)} is not a season`);
  if (!Number.isInteger(week) || week < 1 || week > 22) fail(`week ${JSON.stringify(week)} is not a week`);
  if (named && (+named[1] !== season || +named[2] !== week)) fail(`season ${season} week ${week} in a file named ${file}`);
  if (typeof obj.written !== 'string' || !ISO.test(obj.written) || !isFinite(Date.parse(obj.written))) fail(`written ${JSON.stringify(obj.written)} is not an ISO date or datetime`);
  const G = obj.games;
  if (!G || typeof G !== 'object' || Array.isArray(G)) { fail('games is not an object keyed by game id'); return { fails, warns }; }
  /* the week's games: betting/state.json's schedule when it is of this season, else the id's own form */
  const S = opts.schedule;
  const ids = S && +S.season === season && Array.isArray(S.games) ? new Set(S.games.filter(g => +g.week === week).map(g => g.game_id)) : null;
  if (ids && !ids.size) fail(`betting/state.json's schedule has no week ${week} game`);
  /* the id's own form, made only from a season and a week that are whole numbers: they are the writer's own
     text, and one like "2026(" makes no pattern. Without them no key can be a game of the week */
  const form = Number.isInteger(season) && Number.isInteger(week) ? new RegExp(`^${season}_${String(week).padStart(2, '0')}_[A-Z]{2,3}_[A-Z]{2,3}$`) : null;
  for (const [id, g] of Object.entries(G)) {
    if (ids ? !ids.has(id) : !form) fail(`${id}: not a game of ${JSON.stringify(season)} week ${JSON.stringify(week)}${ids ? " in betting/state.json's schedule" : ' (the season and week are not numbers)'}`);
    else if (!ids && !form.test(id)) fail(`${id}: not a game of ${season} week ${week}`);
    if (!g || typeof g !== 'object' || Array.isArray(g)) { fail(`${id}: not an object`); continue; }
    for (const k of Object.keys(g)) if (!GAME_FIELDS.has(k)) warn(`${id}: an unknown field "${k}" (the page reads preview, news and sources)`);
    if (typeof g.preview !== 'string' || !g.preview.trim()) fail(`${id}: no preview`);
    else {
      const t = g.preview.trim(), n = t.length, k = sentences(t);
      if (n < 40 || n > 200) warn(`${id} preview: ${n} characters (40 to 200)`);
      if (!/[.!?]["'”’)]?$/.test(t)) warn(`${id} preview: does not end in . ! or ?`);
      if (k > 1) warn(`${id} preview: ${k} sentences (one)`);
      const r = RECORD.exec(t); if (r) warn(`${id} preview: a record or score typed ("${r[0]}"; the records are shown beside it)`);
      wording(g.preview, `${id} preview`, warn);
    }
    if (g.news != null) {
      if (typeof g.news !== 'string') fail(`${id}: news is not text`);
      else if (g.news) {
        if (g.news.length > 300) warn(`${id} news: ${g.news.length} characters (at most 300)`);
        wording(g.news, `${id} news`, warn);
      }
    }
    if (g.sources != null) {
      if (!Array.isArray(g.sources) || g.sources.some(x => typeof x !== 'string' || !x.trim())) fail(`${id}: sources is not a list of names`);
      else for (const x of g.sources) { if (x.length > 40) warn(`${id} sources: "${x.slice(0, 50)}" is not a short name`); wording(x, `${id} sources`, warn); }
    }
  }
  return { fails, warns };
}

/* betting/state.json's schedule, the games a file's keys must be */
function schedule(file = path.join(ROOT, '..', 'betting', 'state.json')) {
  try { const s = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(s.schedule) ? { season: s.season, games: s.schedule } : null; }
  catch (e) { return null; }
}
/* every notes file, or the ones named: [{ file, fails, warns, games, of }] */
function checkFiles(files, sched = schedule()) {
  if (!files) files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().map(f => path.join(DIR, f)) : [];
  return files.map(file => {
    let obj;
    try { obj = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { return { file, fails: [`does not read as JSON (${e.message})`], warns: [], games: 0, of: null }; }
    const r = check(obj, { file, schedule: sched });
    const of = sched && obj && +sched.season === obj.season ? sched.games.filter(g => +g.week === obj.week).length : null;
    return { file, ...r, games: obj && obj.games && typeof obj.games === 'object' ? Object.keys(obj.games).length : 0, of };
  });
}

module.exports = { check, checkFiles, schedule, sentences, BETTING, DIR };

if (require.main === module) {
  const args = process.argv.slice(2), strict = args.includes('--strict');
  const named = args.filter(a => a !== '--strict').map(a => path.resolve(a));
  const sched = schedule();
  if (!sched) console.log("note: ../betting/state.json has no schedule here, so each game id is held to its form alone");
  const R = checkFiles(named.length ? named : null, sched);
  if (!R.length) { console.log(`no notes files in ${path.relative(process.cwd(), DIR) || DIR}`); process.exit(0); }
  let bad = 0;
  for (const r of R) {
    const rel = path.relative(process.cwd(), r.file) || r.file;
    console.log(`${r.fails.length ? 'FAIL' : r.warns.length ? (strict ? 'FAIL' : 'WARN') : 'ok  '} ${rel}: ${r.games}${r.of != null ? ` of ${r.of}` : ''} games, ${r.fails.length} failure(s), ${r.warns.length} warning(s)`);
    for (const m of r.fails) console.log('  FAIL ' + m);
    for (const m of r.warns) console.log(`  ${strict ? 'FAIL' : 'WARN'} ${m}`);
    if (r.fails.length || (strict && r.warns.length)) bad++;
  }
  console.log(bad ? `\n${bad} file(s) ${strict ? 'break the rules (--strict: warnings count)' : 'fail'}` : `\nall notes pass${strict ? ' (strict)' : ''}`);
  process.exit(bad ? 1 : 0);
}
