/* What the tracker's tools share: the season, the CSV reader, a patient fetch and the schedule's state.

   SEASON is the one place the tracker's season is set. run-auto.js, pull-week.js, context.js and the
   smoke test all read it from here; nothing else names a year. The page's data files keep their 2026
   names (stats2026.js, units2026.js ...) until a person sets up a new season (HANDOFF.md, "A new
   season"). When nflverse posts the next season's schedule, run-auto.js says so on every run and
   keeps working on this one, so a spring schedule release never flips the job to an empty season.   */
'use strict';

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

/* A download that fails is tried again: four attempts, 2, 5 and 10 seconds apart, alternating a
   descriptive user agent with none. nflverse's release links answer a 500 now and then (three in a
   row on 2026-10-09) and work a few seconds later. Returns the text and the file's Last-Modified. */
const WAITS = [2000, 5000, 10000];
async function fetchText(url, opts = {}) {
  const tries = opts.tries || 4, wait = opts.wait == null ? WAITS : opts.wait;
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: i % 2 ? {} : { 'User-Agent': UA }, redirect: 'follow' });
      if (r.ok) return { text: await r.text(), lastModified: r.headers.get('last-modified') || '' };
      last = new Error(r.status + ' ' + url);
      if (![403, 408, 429, 500, 502, 503, 504].includes(r.status)) break;
    } catch (e) { last = e; }
    if (i < tries - 1) await new Promise(res => setTimeout(res, Array.isArray(wait) ? (wait[i] ?? wait[wait.length - 1] ?? 0) : wait));
  }
  throw last;
}

/* The tracker's teams use LAR for the Rams; nflverse uses LA (and a few old codes) */
const AB = { LA: 'LAR', STL: 'LAR', OAK: 'LV', SD: 'LAC', WSH: 'WAS', JAC: 'JAX' };
const ab = t => AB[t] || t;

const unplayed = r => !String(r.home_score ?? '').trim() || !String(r.away_score ?? '').trim();

/* Where the season stands, from the nflverse schedule:
     regular      week is the first regular season week with an unplayed game (the week to build)
     postseason   the regular season is final and the Super Bowl is not yet played (between rounds,
                  before the next round is listed, included)
     over         the Super Bowl has been played
   Outside the regular season, week is the last regular season week: the tracker stays on it and
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

/* ESPN abbreviations inside a line string ("WSH -3") written the tracker's way ("WAS -3") */
const ESPN_LINE_AB = { WSH: 'WAS', LA: 'LAR', JAC: 'JAX' };
const fixLineAbbr = s => String(s || '').replace(/\b(WSH|LA|JAC)\b(?= [-+]|\s*$)/g, m => ESPN_LINE_AB[m] || m);

/* The narrative never quotes the site's own ranks: the Deep Dive and the rank chip beside it move with
   every run, the narrative does not (on 2026-10-09, 146 of the 192 unit ranks the Week 5 file quoted
   had moved). The phrases are the ones the site's own voice uses: "in the tracker", "the site's units",
   "the power ratings" (the chip's old name), "power rank", "Elo rank", "the Deep Dive". A third party's
   numbers with their source are the writer's to quote, so "PFF's unit grade", "ESPN's FPI power
   ratings", "the NFL.com power rankings" and "a deep dive into the tape" pass (until 2026-10-09 the
   pattern also caught those, and a narrative quoting one would have stopped the job). */
const RANK_QUOTE = [
  /\bthe tracker\b|\btracker's\b/i,
  /\b(?:the |our )?site's (?:units?|unit (?:grades?|numbers)|(?:run|pass) defen[cs]e grade|lowest-graded|grades?|numbers|ranks?|ratings?)\b/i,
  /\bthe power (?:ratings?|rankings?)\b|\bpower rank\b|\bElo rank\b/i,
  /\bDeep Dive\b/,
];
/* the first such phrase in a string, with a little of the text around it, or null */
function siteRankQuote(text) {
  const t = String(text || '').replace(/<[^>]+>/g, '');
  let best = null;
  for (const rx of RANK_QUOTE) { const m = rx.exec(t); if (m && (!best || m.index < best.index)) best = m; }
  return best ? t.slice(Math.max(0, best.index - 40), best.index + best[0].length + 20) : null;
}

module.exports = { SEASON, GAMES_URL, UA, parseCSV, fetchText, ab, unplayed, seasonState, etToISO, lineText, fixLineAbbr, RANK_QUOTE, siteRankQuote };
