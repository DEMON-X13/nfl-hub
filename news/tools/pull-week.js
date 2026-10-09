/* Weekly pull. Fills the structured half of a week before anyone reads the news.
   Run from news/ on Wednesday:   node tools/pull-week.js 2
   Needs jsdom for the TeamRankings tables:  npm ci

   Writes:
     data/results.js        final scores for every completed game of the season so far (records and Final labels
                            update themselves), and LINES: every game's line from the nflverse schedule (the
                            closing line once played, the current one before), which the game overlay shows
                            with its date instead of the line frozen in the week file on draft day
     data/stats2026.js      season to date team stats for the stat bars (a team missing here shows zeros), each
                            team with the number of games its numbers cover (g), and STATS26_THROUGH the last
                            game day they include: on a Friday the Thursday teams have one more than the rest
     data/weekN.js          a draft week file with all 16 games filled in, empty narrative fields (only if it does not exist)
     tools/out/weekN-pack.md   the reading pack: games, lines, injuries, headlines, and the searches to run per game

   Sources: ESPN public feeds (schedule, scores, odds, TV, venues, injuries, team news, 20+ yard plays) and
   TeamRankings season tables (per game team stats). Pro Football Reference blocks scripts; do not add it here.
   The season is tools/lib.js's SEASON. Exits non-zero when context.js cannot build (a required nflverse
   file did not download), so the job stops before its commit and the last good files stay live.   */
const fs = require('fs'), path = require('path');
const lib = require('./lib');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WEEK = parseInt(args.find(a => /^\d+$/.test(a)) || '', 10);
const OUT = (() => { const i = args.indexOf('--out'); return i >= 0 ? path.resolve(args[i + 1]) : path.join(ROOT, 'data'); })();
if (!WEEK) { console.error('usage: node tools/pull-week.js <week> [--out dir]'); process.exit(1); }
const SEASON = lib.SEASON;
const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36', 'Accept': 'application/json,text/html' } };

/* team keys: the site uses these abbreviations; ESPN differs on a few */
const TEAMS = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LV','LAC','LAR','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SF','SEA','TB','TEN','WAS'];
const ESPN_AB = { WSH:'WAS', LA:'LAR', JAC:'JAX' };
const ab = espn => ESPN_AB[espn] || espn;
const ESPN_ID = { ATL:1, BUF:2, CHI:3, CIN:4, CLE:5, DAL:6, DEN:7, DET:8, GB:9, TEN:10, IND:11, KC:12, LV:13, LAR:14, MIA:15, MIN:16, NE:17, NO:18, NYG:19, NYJ:20, PHI:21, ARI:22, PIT:23, LAC:24, SF:25, SEA:26, TB:27, WAS:28, CAR:29, JAX:30, BAL:33, HOU:34 };
const TR_NAME = { 'Arizona':'ARI','Atlanta':'ATL','Baltimore':'BAL','Buffalo':'BUF','Carolina':'CAR','Chicago':'CHI','Cincinnati':'CIN','Cleveland':'CLE','Dallas':'DAL','Denver':'DEN','Detroit':'DET','Green Bay':'GB','Houston':'HOU','Indianapolis':'IND','Jacksonville':'JAX','Kansas City':'KC','Las Vegas':'LV','LA Chargers':'LAC','LA Rams':'LAR','Miami':'MIA','Minnesota':'MIN','New England':'NE','New Orleans':'NO','NY Giants':'NYG','NY Jets':'NYJ','Philadelphia':'PHI','Pittsburgh':'PIT','San Francisco':'SF','Seattle':'SEA','Tampa Bay':'TB','Tennessee':'TEN','Washington':'WAS' };
const NAME = {};

/* a source that refuses one set of headers sometimes accepts another; try three before giving up */
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
const NFLVERSE_GAMES = lib.GAMES_URL;
let nflverseRows = null;
const parseCSV = lib.parseCSV;
async function nflverseSeason() {
  if (!nflverseRows) nflverseRows = parseCSV((await lib.fetchText(NFLVERSE_GAMES)).text).filter(r => r.season === String(SEASON) && r.game_type === 'REG');
  return nflverseRows;
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
  return (await nflverseSeason()).filter(r => +r.week === week).map(r => {
    const away = ab(r.away_team), home = ab(r.home_team);
    NAME[away] = NAME[away] || FULL[away] || away; NAME[home] = NAME[home] || FULL[home] || home;
    const done = r.away_score !== '' && r.home_score !== '' && r.away_score != null && r.home_score != null;
    return { away, home, kick: easternISO(r.gameday, r.gametime), done,
      awayScore: done ? parseInt(r.away_score, 10) : null, homeScore: done ? parseInt(r.home_score, 10) : null,
      tv: '', venue: r.stadium || '', line: lib.lineText(r),
      status: done ? 'Final' : '' };
  });
}
const et = iso => {   // Eastern day and time strings for the fallback fields
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'America/New_York' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { hour:'numeric', minute:'2-digit', timeZone:'America/New_York' }).format(d) + ' ET';
  return { day, time };
};
const longDate = iso => new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric', timeZone:'America/New_York' }).format(new Date(iso));
const etDate = iso => new Intl.DateTimeFormat('en-CA', { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'America/New_York' }).format(new Date(iso));

let usedFallback = false;
async function scoreboard(week){
  if (process.env.NEWS_FORCE_NFLVERSE === '1') { usedFallback = true; return nflverseWeek(week); }
  let j;
  try { j = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${SEASON}`); }
  catch (e) {
    if (!usedFallback) console.log(`ESPN scoreboard unavailable (${e.message.split(' ')[0]}); using the nflverse schedule and scores instead`);
    usedFallback = true; return nflverseWeek(week);
  }
  return (j.events || []).map(e => {
    const c = e.competitions[0];
    const away = c.competitors.find(x => x.homeAway === 'away'), home = c.competitors.find(x => x.homeAway === 'home');
    NAME[ab(away.team.abbreviation)] = away.team.displayName; NAME[ab(home.team.abbreviation)] = home.team.displayName;
    const done = !!(c.status && c.status.type && c.status.type.completed);
    const odds = (c.odds || [])[0];
    const tv = [...new Set((c.broadcasts || []).flatMap(b => b.names || []))].join(' / ');
    const venue = c.venue ? [c.venue.fullName, c.venue.address && c.venue.address.city].filter(Boolean).join(', ') : '';
    return { away: ab(away.team.abbreviation), home: ab(home.team.abbreviation), kick: e.date, done,
      awayScore: done ? parseInt(away.score, 10) : null, homeScore: done ? parseInt(home.score, 10) : null,
      tv, venue, line: odds ? [lib.fixLineAbbr(odds.details), odds.overUnder != null ? 'O/U ' + odds.overUnder : ''].filter(Boolean).join(', ') : '',
      status: c.status && c.status.type && c.status.type.shortDetail || '' };
  });
}

/* every game's line from the nflverse schedule, keyed like RESULTS: the closing line once a game is
   played, the current one before. The overlay shows it with its date (until 2026-10-09 it showed the
   line the week file froze on draft day, with no date, up to 2 points off by kickoff) */
async function lines() {
  try {
    const L = {};
    for (const r of await nflverseSeason()) { const t = lib.lineText(r); if (t) L['wk' + (+r.week) + ':' + ab(r.away_team) + '-' + ab(r.home_team)] = t; }
    return L;
  } catch (e) { console.log(`lines unavailable (${String(e.message).split(' ')[0]}): the overlay shows each week file's own line, marked as such`); return null; }
}

async function results(){
  const out = {}, kickOf = {};
  for (let w = 1; w <= WEEK; w++) {   // includes the current week: a game that has gone final counts as soon as it has
    const games = await scoreboard(w);
    games.filter(g => g.done).forEach(g => { const k = 'wk' + w + ':' + g.away + '-' + g.home; out[k] = [g.awayScore, g.homeScore]; kickOf[k] = g.kick; });
    console.log(`week ${w}: ${games.filter(g => g.done).length} of ${games.length} final`);
  }
  const L = await lines();
  const today = new Date().toISOString().slice(0, 10);
  const body = `/* Final scores for every completed ${SEASON} game, keyed "wk<week>:AWAY-HOME" as [away, home].
   Regenerated by tools/pull-week.js. The page merges these into each week's games at load,
   so records and Final labels stay current without editing week files.
   LINES: each game's line from the nflverse schedule as of LINES_ASOF (the closing line once played). */\nconst RESULTS = ${JSON.stringify(out, null, 1)};\n` +
    (L ? `const LINES = ${JSON.stringify(L, null, 1)};\nconst LINES_ASOF = ${JSON.stringify(today)};\n` : '');
  fs.writeFileSync(path.join(OUT, 'results.js'), body);
  console.log('results.js:', Object.keys(out).length, 'games' + (L ? `, ${Object.keys(L).length} lines` : ', no lines'));
  return { out, kickOf };
}

/* How many of a team's games a season table covers: the count whose points per game and points
   allowed match the table's (TeamRankings' date= covers the games before that day, so a Sunday night
   run may or may not hold the afternoon's). Falls back to the finals before today. */
function gamesCovered(team, stat, res, today) {
  const mine = Object.entries(res.out).map(([k, sc]) => {
    const [wk, pair] = k.split(':'); const [a, h] = pair.split('-');
    if (a !== team && h !== team) return null;
    return { wk: +wk.slice(2), pf: h === team ? sc[1] : sc[0], pa: h === team ? sc[0] : sc[1], day: res.kickOf[k] ? etDate(res.kickOf[k]) : '' };
  }).filter(Boolean).sort((x, y) => x.wk - y.wk);
  let pf = 0, pa = 0; const match = [];
  for (let n = 1; n <= mine.length; n++) {
    pf += mine[n - 1].pf; pa += mine[n - 1].pa;
    if (stat.ppg != null && stat.pa != null && Math.abs(pf / n - stat.ppg) <= 0.051 && Math.abs(pa / n - stat.pa) <= 0.051) match.push(n);
  }
  const n = match.length ? match[match.length - 1] : mine.filter(g => g.day && g.day < today).length;
  return { g: n, last: n ? mine[n - 1].day : '', checked: match.length > 0 };
}

async function stats(res){
  let JSDOM; try { JSDOM = require('jsdom').JSDOM; } catch (e) { console.log('stats2026.js skipped: jsdom not installed (npm install --no-save jsdom)'); return; }
  const SRC = { 'points-per-game':'ppg', 'opponent-points-per-game':'pa', 'yards-per-play':'ypp', 'opponent-yards-per-play':'yppa', 'turnover-margin-per-game':'to', 'sacks-per-game':'sk', 'qb-sacked-per-game':'ska', 'third-down-conversion-pct':'third', 'red-zone-scoring-pct':'rz' };
  const out = {}; TEAMS.forEach(t => out[t] = {});
  const today = new Date().toISOString().slice(0, 10);
  for (const [slug, field] of Object.entries(SRC)) {
    let html;
    try { html = await getText(`https://www.teamrankings.com/nfl/stat/${slug}?date=${today}`); }
    catch (e) { console.log(`TeamRankings ${slug} unavailable (${e.message.split(' ')[0]})`); continue; }
    const d = new JSDOM(html).window.document, t = d.querySelector('table'); if (!t) { console.log('no table for', slug); continue; }
    const hdr = [...t.querySelectorAll('thead th')].map(x => x.textContent.trim());
    const ci = hdr.indexOf(String(SEASON)); if (ci < 0) { console.log(`no ${SEASON} column yet for ${slug}`); continue; }
    [...t.querySelectorAll('tbody tr')].forEach(r => {
      const c = [...r.children].map(x => x.textContent.trim()); const team = TR_NAME[c[1]]; if (!team) return;
      const v = parseFloat(String(c[ci]).replace('%', '').replace('+', '')); if (!isNaN(v)) out[team][field] = Math.round(v * 10) / 10;
    });
  }
  for (const team of TEAMS) {
    try {
      const j = await getJSON(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${SEASON}/types/2/teams/${ESPN_ID[team]}/statistics`);
      const get = (cat, name) => { const c = (j.splits.categories || []).find(x => x.name === cat); const s = c && c.stats.find(x => x.name === name); return s ? s.value : null; };
      const gp = get('general', 'gamesPlayed'), pass = get('passing', 'passingBigPlays'), rush = get('rushing', 'rushingBigPlays');
      if (gp && pass != null && rush != null) out[team].expl = Math.round((pass + rush) / gp * 10) / 10;
    } catch (e) { /* no games yet or feed hiccup: leave expl out, the page falls back */ }
  }
  /* keep a team with points for and against and at least 8 of the 10 stats; a stat a source leaves
     blank (Atlanta had no red zone trips in Week 1, so TeamRankings shows "--") is left out and the page shows a dash */
  const complete = TEAMS.filter(t => out[t].ppg != null && out[t].pa != null && Object.keys(out[t]).length >= 8);
  /* never replace good numbers with a thinner pull: a blocked source must not wipe the stat bars */
  const statsFile = path.join(OUT, 'stats2026.js');
  const had = fs.existsSync(statsFile) ? (fs.readFileSync(statsFile, 'utf8').match(/^ "[A-Z]{2,3}": \{/gm) || []).length : 0;
  if (complete.length < had) { console.log(`stats2026.js kept: this pull has ${complete.length} complete teams, the file already has ${had}`); return; }
  /* each team's own game count: until 2026-10-09 the label said "Week N-1" for every team, while the
     Thursday teams' numbers already held that week's game (TB's 20 points a game were over 5, shown as 4) */
  let through = '';
  for (const t of complete) {
    const c = gamesCovered(t, out[t], res, etDate(new Date().toISOString()));
    out[t].g = c.g;
    if (!c.checked) console.log(`stats2026.js: ${t}'s points per game match none of its game counts; ${c.g} assumed (finals before today)`);
    if (c.last > through) through = c.last;
  }
  const thru = through ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(through + 'T12:00:00Z')) : '';
  const body = `/* ${SEASON} season to date team stats, regenerated by tools/pull-week.js on ${today} (before Week ${WEEK}).
   A team is listed once it has points for and against and 8 of the 10 stats; a stat left out shows a dash on the page.
   Fields: ppg, pa, ypp, yppa, to, sk, ska, third, rz, expl (per game; third and rz are percentages), and g, the games they cover.
   STATS26_THROUGH: the last game day they include. */\nconst STATS26 = ${JSON.stringify(Object.fromEntries(complete.map(t => [t, out[t]])), null, 1)};\nconst STATS26_THROUGH = ${JSON.stringify(thru)};\nconst STATS26_ASOF = ${JSON.stringify(today)};\n`;
  fs.writeFileSync(path.join(OUT, 'stats2026.js'), body);
  console.log('stats2026.js:', complete.length, 'teams,', complete.filter(t => ['ppg', 'pa', 'ypp', 'yppa', 'to', 'sk', 'ska', 'third', 'rz', 'expl'].every(k => out[t][k] != null)).length, 'with all ten stats, through', thru || '(no games)');
}

async function draftWeek(games){
  const file = path.join(OUT, `week${WEEK}.js`);
  if (fs.existsSync(file)) { console.log(`week${WEEK}.js exists, not overwriting`); return; }
  const sorted = [...games].sort((a, b) => a.kick.localeCompare(b.kick));
  const teams = {}; TEAMS.forEach(t => teams[t] = { headline: '', matchup: [], strengths: [], weaknesses: [], keys: [] });
  const week = {
    id: 'wk' + WEEK, label: 'Week ' + WEEK, type: 'preview', status: 'live',
    dates: `${longDate(sorted[0].kick)} to ${longDate(sorted[sorted.length - 1].kick)}, ${SEASON}`,
    updated: new Intl.DateTimeFormat('en-US', { month:'long', day:'numeric', year:'numeric' }).format(new Date()),
    headline: '', intro: '',
    games: sorted.map(g => { const e = et(g.kick); return { away: g.away, home: g.home, day: e.day, time: e.time, kick: g.kick, tv: g.tv, venue: g.venue, line: g.line, note: '', preview: [], keys: [] }; }),
    teams
  };
  fs.writeFileSync(file, `/* Week ${WEEK} draft from tools/pull-week.js. Fill headline, intro, each game note, and every team's\n   headline, matchup, strengths, weaknesses, keys. See tools/sources.md for the procedure. */\nconst WEEK${WEEK} = ${JSON.stringify(week, null, 2)};\n`);
  console.log(`week${WEEK}.js drafted:`, sorted.length, 'games');
}

/* ESPN's injury list, kept for the pack and handed to context.js for the Deep Dive's lineups:
   it is the only injury source this job sees before nflverse files the week's game statuses */
let espnInjuries = null;
async function pack(games){
  const dir = path.join(ROOT, 'tools', 'out'); fs.mkdirSync(dir, { recursive: true });
  let inj = {};
  try {
    const j = await getJSON('https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries');
    espnInjuries = [];
    (j.injuries || []).forEach(t => {
      const key = ab((t.abbreviation || '').toUpperCase()) || Object.keys(NAME).find(k => NAME[k] === t.displayName);
      inj[key || t.displayName] = (t.injuries || []).map(i => `${i.athlete.displayName} (${i.athlete.position ? i.athlete.position.abbreviation : '?'}) ${i.status}${i.details && i.details.type ? ', ' + i.details.type : ''}${i.shortComment ? ': ' + i.shortComment : ''}`);
      /* the note and its date go to context.js too: a note newer than the nflverse report says who practised */
      if (key) for (const i of (t.injuries || [])) if (i.athlete && i.athlete.displayName)
        espnInjuries.push({ team: key, name: i.athlete.displayName, pos: i.athlete.position ? i.athlete.position.abbreviation : '', status: i.status || '',
          type: (i.details && i.details.type) || '', comment: i.shortComment || '', long: i.longComment || '', date: i.date || '' });
    });
  } catch (e) { console.log('injuries feed unavailable:', e.message); }
  const news = {};
  for (const team of TEAMS) {
    try {
      const j = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${ESPN_ID[team]}/news?limit=8`);
      news[team] = (j.articles || []).map(a => `- ${(a.published || '').slice(0, 10)} ${a.headline}${a.links && a.links.web ? ' <' + a.links.web.href + '>' : ''}`);
    } catch (e) { news[team] = ['- (news feed unavailable)']; }
  }
  const lines = [`# Week ${WEEK} reading pack`, '', `Generated ${new Date().toISOString().slice(0, 10)}. Facts below are pulled; everything narrative still has to be read and written.`, '', '## Games', ''];
  for (const g of [...games].sort((a, b) => a.kick.localeCompare(b.kick))) {
    const e = et(g.kick), A = g.away, H = g.home;
    lines.push(`### ${NAME[A] || A} at ${NAME[H] || H}`, `${e.day}, ${e.time}${g.tv ? ', ' + g.tv : ''}${g.venue ? ', ' + g.venue : ''}${g.line ? '. Line: ' + g.line : ''}`, '');
    lines.push(`Searches to run:`, `- "${NAME[A] || A} ${NAME[H] || H} preview week ${WEEK}"`, `- "${NAME[A] || A} injury report week ${WEEK}"`, `- "${NAME[H] || H} injury report week ${WEEK}"`, `- "${NAME[A] || A} vs ${NAME[H] || H} keys to the game"`, `- "NFL week ${WEEK} picks ${A} ${H}"`, '');
    for (const t of [A, H]) {
      lines.push(`${NAME[t] || t}, injuries:`, ...((inj[t] || []).length ? inj[t].map(x => '- ' + x) : ['- none listed']), '');
      lines.push(`${NAME[t] || t}, ESPN headlines:`, ...(news[t] || []), '');
    }
  }
  fs.writeFileSync(path.join(dir, `week${WEEK}-pack.md`), lines.join('\n') + '\n');
  console.log(`tools/out/week${WEEK}-pack.md written`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const games = await scoreboard(WEEK);
  console.log(`week ${WEEK}: ${games.length} games on the schedule`);
  const res = await results();
  await stats(res);
  await draftWeek(games);
  await pack(games);
  /* the rank chip, player positions and the Deep Dive units, beside the week files. A required source
     that did not download fails the run here: the job's commit step comes after, so it commits nothing
     and the last good data stays live everywhere */
  try { await require('./context').build({ out: OUT, week: WEEK, games, espn: espnInjuries }); }
  catch (e) { console.error('context files not rebuilt: ' + e.message); process.exitCode = 1; return; }
  console.log('done. Next: read tools/out/week' + WEEK + '-pack.md and fill data/week' + WEEK + '.js');
})().catch(e => { console.error(e); process.exit(1); });
