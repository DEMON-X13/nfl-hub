/* Weekly pull. Fills the structured half of a week before anyone reads the news.
   Run from the repo root on Wednesday:   node tools/pull-week.js 2
   Needs jsdom for the TeamRankings tables:  npm install --no-save jsdom

   Writes:
     data/results.js        final scores for every completed 2026 game so far (records and Final labels update themselves)
     data/stats2026.js      season to date team stats for the stat bars (a team missing here shows zeros)
     data/weekN.js          a draft week file with all 16 games filled in, empty narrative fields (only if it does not exist)
     tools/out/weekN-pack.md   the reading pack: games, lines, injuries, headlines, and the searches to run per game

   Sources: ESPN public feeds (schedule, scores, odds, TV, venues, injuries, team news, 20+ yard plays) and
   TeamRankings season tables (per game team stats). Pro Football Reference blocks scripts; do not add it here.   */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WEEK = parseInt(args.find(a => /^\d+$/.test(a)) || '', 10);
const OUT = (() => { const i = args.indexOf('--out'); return i >= 0 ? path.resolve(args[i + 1]) : path.join(ROOT, 'data'); })();
if (!WEEK) { console.error('usage: node tools/pull-week.js <week> [--out dir]'); process.exit(1); }
const SEASON = 2026;
const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36', 'Accept': 'application/json,text/html' } };

/* team keys: the site uses these abbreviations; ESPN differs on a few */
const TEAMS = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LV','LAC','LAR','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SF','SEA','TB','TEN','WAS'];
const ESPN_AB = { WSH:'WAS', LA:'LAR', JAC:'JAX' };
const ab = espn => ESPN_AB[espn] || espn;
const ESPN_ID = { ATL:1, BUF:2, CHI:3, CIN:4, CLE:5, DAL:6, DEN:7, DET:8, GB:9, TEN:10, IND:11, KC:12, LV:13, LAR:14, MIA:15, MIN:16, NE:17, NO:18, NYG:19, NYJ:20, PHI:21, ARI:22, PIT:23, LAC:24, SF:25, SEA:26, TB:27, WAS:28, CAR:29, JAX:30, BAL:33, HOU:34 };
const TR_NAME = { 'Arizona':'ARI','Atlanta':'ATL','Baltimore':'BAL','Buffalo':'BUF','Carolina':'CAR','Chicago':'CHI','Cincinnati':'CIN','Cleveland':'CLE','Dallas':'DAL','Denver':'DEN','Detroit':'DET','Green Bay':'GB','Houston':'HOU','Indianapolis':'IND','Jacksonville':'JAX','Kansas City':'KC','Las Vegas':'LV','LA Chargers':'LAC','LA Rams':'LAR','Miami':'MIA','Minnesota':'MIN','New England':'NE','New Orleans':'NO','NY Giants':'NYG','NY Jets':'NYJ','Philadelphia':'PHI','Pittsburgh':'PIT','San Francisco':'SF','Seattle':'SEA','Tampa Bay':'TB','Tennessee':'TEN','Washington':'WAS' };
const NAME = {};

const getJSON = async url => { const r = await fetch(url, UA); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); };
const getText = async url => { const r = await fetch(url, UA); if (!r.ok) throw new Error(r.status + ' ' + url); return r.text(); };
const et = iso => {   // Eastern day and time strings for the fallback fields
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'America/New_York' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { hour:'numeric', minute:'2-digit', timeZone:'America/New_York' }).format(d) + ' ET';
  return { day, time };
};
const longDate = iso => new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric', timeZone:'America/New_York' }).format(new Date(iso));

async function scoreboard(week){
  const j = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${SEASON}`);
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
      tv, venue, line: odds ? [odds.details, odds.overUnder != null ? 'O/U ' + odds.overUnder : ''].filter(Boolean).join(', ') : '',
      status: c.status && c.status.type && c.status.type.shortDetail || '' };
  });
}

async function results(){
  const out = {};
  for (let w = 1; w <= WEEK; w++) {   // includes the current week: a game that has gone final counts as soon as it has
    const games = await scoreboard(w);
    games.filter(g => g.done).forEach(g => { out['wk' + w + ':' + g.away + '-' + g.home] = [g.awayScore, g.homeScore]; });
    console.log(`week ${w}: ${games.filter(g => g.done).length} of ${games.length} final`);
  }
  const body = `/* Final scores for every completed ${SEASON} game, keyed "wk<week>:AWAY-HOME" as [away, home].
   Regenerated by tools/pull-week.js. The page merges these into each week's games at load,
   so records and Final labels stay current without editing week files. */\nconst RESULTS = ${JSON.stringify(out, null, 1)};\n`;
  fs.writeFileSync(path.join(OUT, 'results.js'), body);
  console.log('results.js:', Object.keys(out).length, 'games');
  return out;
}

async function stats(){
  let JSDOM; try { JSDOM = require('jsdom').JSDOM; } catch (e) { console.log('stats2026.js skipped: jsdom not installed (npm install --no-save jsdom)'); return; }
  const SRC = { 'points-per-game':'ppg', 'opponent-points-per-game':'pa', 'yards-per-play':'ypp', 'opponent-yards-per-play':'yppa', 'turnover-margin-per-game':'to', 'sacks-per-game':'sk', 'qb-sacked-per-game':'ska', 'third-down-conversion-pct':'third', 'red-zone-scoring-pct':'rz' };
  const out = {}; TEAMS.forEach(t => out[t] = {});
  const today = new Date().toISOString().slice(0, 10);
  for (const [slug, field] of Object.entries(SRC)) {
    const html = await getText(`https://www.teamrankings.com/nfl/stat/${slug}?date=${today}`);
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
  const complete = TEAMS.filter(t => Object.keys(out[t]).length === 10);
  const body = `/* ${SEASON} season to date team stats, regenerated by tools/pull-week.js on ${today} (before Week ${WEEK}).
   A team is listed only when all ten stats were available; the page shows zeros for any team missing here.
   Fields: ppg, pa, ypp, yppa, to, sk, ska, third, rz, expl (per game; third and rz are percentages). */\nconst STATS26 = ${JSON.stringify(Object.fromEntries(complete.map(t => [t, out[t]])), null, 1)};\nconst STATS26_THROUGH = "Week ${WEEK - 1}";\n`;
  fs.writeFileSync(path.join(OUT, 'stats2026.js'), body);
  console.log('stats2026.js:', complete.length, 'teams complete');
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

async function pack(games){
  const dir = path.join(ROOT, 'tools', 'out'); fs.mkdirSync(dir, { recursive: true });
  let inj = {};
  try {
    const j = await getJSON('https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries');
    (j.injuries || []).forEach(t => { const key = ab((t.abbreviation || '').toUpperCase()) || Object.keys(NAME).find(k => NAME[k] === t.displayName); inj[key || t.displayName] = (t.injuries || []).map(i => `${i.athlete.displayName} (${i.athlete.position ? i.athlete.position.abbreviation : '?'}) ${i.status}${i.details && i.details.type ? ', ' + i.details.type : ''}${i.shortComment ? ': ' + i.shortComment : ''}`); });
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
  await results();
  await stats();
  await draftWeek(games);
  await pack(games);
  console.log('done. Next: read tools/out/week' + WEEK + '-pack.md and fill data/week' + WEEK + '.js');
})().catch(e => { console.error(e); process.exit(1); });
