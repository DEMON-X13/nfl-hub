"""Season tracker pull: survive a source refusing GitHub's servers.
  * Every request tries a plain descriptive UA first, then no UA, then the browser-like UA,
    with a short pause between. From GitHub's servers ESPN answers 403 to the browser-like
    UA and 200 to the others (diagnostic run 2026-09-15).
  * If ESPN's scoreboard still refuses, the schedule and final scores come from the
    nflverse games file instead (same source the other jobs use). TV is left blank
    in that case; the line is rebuilt from the spread and total.
  * Each TeamRankings table is optional. stats2026.js is only rewritten when the new
    pull has at least as many complete teams as the file already holds, so a blocked
    source can never wipe good numbers.
  * NEWS_FORCE_NFLVERSE=1 skips ESPN's scoreboard, for testing the fallback.
"""
from pathlib import Path

P = Path(__file__).with_name("pull-week.js")
s = P.read_text(encoding="utf-8")


def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)


sub("""const getJSON = async url => { const r = await fetch(url, UA); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); };
const getText = async url => { const r = await fetch(url, UA); if (!r.ok) throw new Error(r.status + ' ' + url); return r.text(); };""",
"""/* a source that refuses one set of headers sometimes accepts another; try three before giving up */
/* order matters: from GitHub's servers ESPN refuses the browser-like UA (403) but accepts a plain one (checked 2026-09-15) */
const HEADER_SETS = [{ 'User-Agent': 'nfl-hub-season-tracker/1.0 (+https://github.com/DEMON-X13/nfl-hub)', 'Accept': 'application/json,text/html' }, {}, UA.headers];
async function fetchRetry(url) {
  let last;
  for (let i = 0; i < HEADER_SETS.length; i++) {
    try {
      const r = await fetch(url, { headers: HEADER_SETS[i] });
      if (r.ok) return r;
      last = new Error(r.status + ' ' + url);
      if (![403, 408, 429, 500, 502, 503, 504].includes(r.status)) break;
    } catch (e) { last = e; }
    await new Promise(res => setTimeout(res, 1500));
  }
  throw last;
}
const getJSON = async url => (await fetchRetry(url)).json();
const getText = async url => (await fetchRetry(url)).text();

/* full team names from data/teams.js, used when ESPN is not available to supply them */
const FULL = {};
try { const t = fs.readFileSync(path.join(ROOT, 'data', 'teams.js'), 'utf8'); for (const m of t.matchAll(/ab:"([A-Z]{2,3})", name:"([^"]+)"/g)) FULL[m[1]] = m[2]; } catch (e) {}

/* ---------- fallback: schedule and scores from the nflverse games file ---------- */
const NFLVERSE_GAMES = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';
let nflverseRows = null;
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\\n') { row.push(cell.replace(/\\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
/* an Eastern date and time ("2026-09-17", "20:15") as an ISO instant, daylight saving included */
function easternISO(day, time) {
  const [y, mo, d] = day.split('-').map(Number), [h, mi] = (time || '13:00').split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess)).map(p => [p.type, p.value]));
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess + (guess - shown)).toISOString();
}
async function nflverseWeek(week) {
  if (!nflverseRows) nflverseRows = parseCSV(await getText(NFLVERSE_GAMES)).filter(r => r.season === String(SEASON) && r.game_type === 'REG');
  return nflverseRows.filter(r => +r.week === week).map(r => {
    const away = ab(r.away_team), home = ab(r.home_team);
    NAME[away] = NAME[away] || FULL[away] || away; NAME[home] = NAME[home] || FULL[home] || home;
    const done = r.away_score !== '' && r.home_score !== '' && r.away_score != null && r.home_score != null;
    const sp = parseFloat(r.spread_line), tot = parseFloat(r.total_line);
    const fav = isNaN(sp) ? '' : (sp > 0 ? `${home} -${sp}` : (sp < 0 ? `${away} -${-sp}` : 'EVEN'));
    return { away, home, kick: easternISO(r.gameday, r.gametime), done,
      awayScore: done ? parseInt(r.away_score, 10) : null, homeScore: done ? parseInt(r.home_score, 10) : null,
      tv: '', venue: r.stadium || '', line: [fav, isNaN(tot) ? '' : 'O/U ' + tot].filter(Boolean).join(', '),
      status: done ? 'Final' : '' };
  });
}""")

sub("""async function scoreboard(week){
  const j = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${SEASON}`);""",
"""let usedFallback = false;
async function scoreboard(week){
  if (process.env.NEWS_FORCE_NFLVERSE === '1') { usedFallback = true; return nflverseWeek(week); }
  let j;
  try { j = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${SEASON}`); }
  catch (e) {
    if (!usedFallback) console.log(`ESPN scoreboard unavailable (${e.message.split(' ')[0]}); using the nflverse schedule and scores instead`);
    usedFallback = true; return nflverseWeek(week);
  }""")

sub("""    const html = await getText(`https://www.teamrankings.com/nfl/stat/${slug}?date=${today}`);""",
"""    let html;
    try { html = await getText(`https://www.teamrankings.com/nfl/stat/${slug}?date=${today}`); }
    catch (e) { console.log(`TeamRankings ${slug} unavailable (${e.message.split(' ')[0]})`); continue; }""")

sub("""  const complete = TEAMS.filter(t => Object.keys(out[t]).length === 10);""",
"""  const complete = TEAMS.filter(t => Object.keys(out[t]).length === 10);
  /* never replace good numbers with a thinner pull: a blocked source must not wipe the stat bars */
  const statsFile = path.join(OUT, 'stats2026.js');
  const had = fs.existsSync(statsFile) ? (fs.readFileSync(statsFile, 'utf8').match(/^ "[A-Z]{2,3}": \\{/gm) || []).length : 0;
  if (complete.length < had) { console.log(`stats2026.js kept: this pull has ${complete.length} complete teams, the file already has ${had}`); return; }""")

P.write_text(s, encoding="utf-8", newline="\n")
print("pull-week.js patched")
