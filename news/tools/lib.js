/* What the news job's tools share: the season, the CSV reader, a patient fetch, the schedule's state and
   the JSON twins of the data files.

   SEASON is the one place the job's season is set. run-auto.js, pull-week.js, context.js, notes.js and
   the smoke test all read it from here; nothing else names a year. The data files keep their 2026
   names (stats2026.js, units2026.js ...) until a person sets up a new season (HANDOFF.md, "A new
   season"). When nflverse posts the next season's schedule, run-auto.js says so on every run and
   keeps working on this one, so a spring schedule release never flips the job to an empty season.   */
'use strict';
const { fetchRetry } = require('../../lib/netfetch.js');   // the download rule the NFL jobs share

const SEASON = 2026;
const GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';
const UA = 'nfl-hub-season-tracker/1.0 (+https://github.com/DEMON-X13/nfl-hub)';

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift() || [];
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/* A download that fails is tried again by lib/netfetch.js, the rule every NFL job shares: a 5xx, 429,
   403 (here only: alternating a descriptive user agent with none), timeout or reset is tried again on
   waits of 5, 15, 30 and 60 seconds, five tries over nearly two minutes. nflverse's release links answer
   a 500 now and then (three in a row on 2026-10-09; on 2026-10-13 a burst outlasted the Elo job's 15
   seconds of tries, which this one's 17 would not have survived either) and work a little later. A 404
   and any other 4xx are answered at once. Returns the text and the file's Last-Modified; an error's
   message starts with the HTTP status where there was one ("404 <url>"), which context.js and
   lineup-checks.js read as "not published yet" before the season's first game. */
const WAITS = [5000, 15000, 30000, 60000];
async function fetchText(url, opts = {}) {
  const waits = opts.wait == null ? WAITS : Array.isArray(opts.wait) ? opts.wait : Array(Math.max(0, (opts.tries || 5) - 1)).fill(opts.wait);
  try {
    const { body, res } = await fetchRetry(url, { waits: opts.tries ? waits.slice(0, opts.tries - 1) : waits, headers: [{ 'User-Agent': UA }, {}], retryOn: [403] });
    return { text: body, lastModified: res.headers.get('last-modified') || '' };
  } catch (e) {
    if (!e.status) throw e;
    const x = new Error(`${e.status} ${url}${e.tries > 1 ? ` (on ${e.tries} tries)` : ''}`); x.status = e.status;
    throw x;
  }
}

/* The news files use LAR for the Rams; nflverse uses LA (and a few old codes) */
const AB = { LA: 'LAR', STL: 'LAR', OAK: 'LV', SD: 'LAC', WSH: 'WAS', JAC: 'JAX' };
const ab = t => AB[t] || t;

const unplayed = r => !String(r.home_score ?? '').trim() || !String(r.away_score ?? '').trim();

/* Where the season stands, from the nflverse schedule:
     regular      week is the first regular season week with an unplayed game (the week to build)
     postseason   the regular season is final and the Super Bowl is not yet played (between rounds,
                  before the next round is listed, included)
     over         the Super Bowl has been played
   Outside the regular season, week is the last regular season week: the job stays on it and
   says the regular season is complete. It does not cover the playoffs. `newer` lists any later
   season the schedule already holds. */
function seasonState(rows, season = SEASON) {
  const mine = rows.filter(r => String(r.season) === String(season));
  const reg = mine.filter(r => r.game_type === 'REG');
  const lastWeek = reg.length ? Math.max(...reg.map(r => +r.week)) : 0;
  const newer = [...new Set(rows.map(r => +r.season).filter(s => s > season))].sort();
  if (!reg.length) return { season, phase: 'none', week: 0, lastWeek, newer };
  const open = reg.filter(unplayed).map(r => +r.week);
  if (open.length) return { season, phase: 'regular', week: Math.min(...open), lastWeek, newer };
  /* over only once the Super Bowl is final: between rounds every listed playoff game can be played
     while the next round is not listed yet (until 2026-10-09 that read as over) */
  const sb = mine.filter(r => r.game_type === 'SB');
  return { season, phase: sb.length && !sb.some(unplayed) ? 'over' : 'postseason', week: lastWeek, lastWeek, newer };
}

/* Eastern wall time to UTC: try both offsets and keep the one New York agrees with (no fixed dates) */
function etToISO(day, time) {
  if (!day) return null;
  const t = time || '13:00';
  for (const off of ['-04:00', '-05:00']) {
    const d = new Date(`${day}T${t}:00${off}`);
    const hh = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York' }).format(d);
    if (hh === t) return d.toISOString();
  }
  return new Date(`${day}T${t}:00-05:00`).toISOString();
}

/* "DAL -9.5, O/U 49.5" from nflverse's spread_line (the home side's expected margin) and total_line */
function lineText(r) {
  const sp = parseFloat(r.spread_line), tot = parseFloat(r.total_line);
  const away = ab(r.away_team), home = ab(r.home_team);
  const fav = isNaN(sp) ? '' : (sp > 0 ? `${home} -${sp}` : (sp < 0 ? `${away} -${-sp}` : 'PK'));
  return [fav, isNaN(tot) ? '' : 'O/U ' + tot].filter(Boolean).join(', ');
}

/* ESPN abbreviations inside a line string ("WSH -3") written the news files' way ("WAS -3") */
const ESPN_LINE_AB = { WSH: 'WAS', LA: 'LAR', JAC: 'JAX' };
const fixLineAbbr = s => String(s || '').replace(/\b(WSH|LA|JAC)\b(?= [-+]|\s*$)/g, m => ESPN_LINE_AB[m] || m);

/* A written note never quotes the site's own ranks: the Deep Dive beside it in the Game snapshot moves
   with every run, the note does not (on 2026-10-09, 146 of the 192 unit ranks the old tracker's Week 5
   narrative quoted had moved). tools/notes.js warns on one. The phrases are the ones the site's own voice
   uses: "in the tracker", "the site's units", "the power ratings" (the old rank chip's name), "power
   rank", "Elo rank", "the Deep Dive", and the
   Deep Dive's headline, the ELO Ratings tab's "Overall Offense" and "Overall Defense" (capitalised as the
   site names them: "the best overall defense" is a writer's own words). A third party's
   numbers with their source are the writer's to quote, so "PFF's unit grade", "ESPN's FPI power
   ratings", "the NFL.com power rankings" and "a deep dive into the tape" pass (until 2026-10-09 the
   pattern also caught those, and a narrative quoting one would have stopped the job). */
const RANK_QUOTE = [
  /\bthe tracker\b|\btracker's\b/i,
  /\b(?:the |our )?site's (?:units?|unit (?:grades?|numbers)|(?:run|pass) defen[cs]e grade|lowest-graded|grades?|numbers|ranks?|ratings?)\b/i,
  /\bthe power (?:ratings?|rankings?)\b|\bpower rank\b|\bElo rank\b/i,
  /\bDeep Dive\b/,
  /\bOverall (?:Offense|Defense)\b/,
  /\bTotal (?:Offense|Defense)\b/,                       // the ELO tab's unit tables before they were renamed Overall
  /\b(?:ELO Ratings|Team Rankings|Power Ratings) tab\b/i,   // the site's own tabs, however the rank is named
];
/* the first such phrase in a string, with a little of the text around it, or null */
function siteRankQuote(text) {
  const t = String(text || '').replace(/<[^>]+>/g, '');
  let best = null;
  for (const rx of RANK_QUOTE) { const m = rx.exec(t); if (m && (!best || m.index < best.index)) best = m; }
  return best ? t.slice(Math.max(0, best.index - 40), best.index + best[0].length + 20) : null;
}

/* The JSON twins. X NFL Bets and Stats' Game snapshot fetches the Deep Dive and the stat bars at runtime
   (no-store), as data/units.json and data/stats.json; the job and its checks keep units2026.js and
   stats2026.js, which the lineup checks and the stat counts read as they always have. Each twin is built from the .js file's own consts as they stand on disk, so
   the two never say different things: context.js and pull-week.js write the twin whenever they write the .js
   file, and whenever the twin is missing or differs from it (a run that leaves units2026.js alone still
   writes a missing units.json). The smoke test holds each twin to its consts on its own. */
const vm = require('vm'), fs = require('fs'), path = require('path');
/* the named top-level consts of a data file (classic-script consts live in the script's scope, not on a global) */
function consts(file, names) {
  const src = fs.readFileSync(file, 'utf8');
  return vm.runInNewContext(`${src}\n;({ ${names.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} })`, {}, { filename: file });
}
const UNITS_CONSTS = ['UNITS26', 'UNITS26_META', 'UNITS26_BASIS', 'UNITS26_LINEUPS'];
const STATS_CONSTS = ['STATS26', 'STATS26_THROUGH', 'STATS26_ASOF'];
function unitsTwin(C) {
  const m = C.UNITS26_META || {};
  return { season: m.season, week: m.week, built_at: m.built_at, meta: C.UNITS26_META, basis: C.UNITS26_BASIS, lineups: C.UNITS26_LINEUPS, units: C.UNITS26 };
}
const statsTwin = C => ({ season: SEASON, through: C.STATS26_THROUGH, asof: C.STATS26_ASOF, stats: C.STATS26 });
/* write the twin of a .js data file beside it when it is missing or says something else; returns what was done */
function writeTwin(jsFile, jsonFile, names, twin) {
  if (!fs.existsSync(jsFile)) return 'no ' + path.basename(jsFile);
  const body = JSON.stringify(twin(consts(jsFile, names))) + '\n';
  let had = null; try { had = fs.readFileSync(jsonFile, 'utf8'); } catch (e) { /* none yet */ }
  if (had === body) return 'unchanged';
  fs.writeFileSync(jsonFile, body);
  return had == null ? 'written' : 'rewritten';
}

module.exports = { SEASON, GAMES_URL, UA, parseCSV, fetchText, ab, unplayed, seasonState, etToISO, lineText, fixLineAbbr, RANK_QUOTE, siteRankQuote,
  consts, UNITS_CONSTS, STATS_CONSTS, unitsTwin, statsTwin, writeTwin };
