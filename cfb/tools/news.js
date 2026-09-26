/* The CFB News tab's file: the week's slate as a newsletter, the way news/ does the NFL,
   with the writing done from the numbers since nobody is going to write forty college
   previews a week by hand.

    node cfb/tools/news.js              after update.js; reads cfb/state.json, writes cfb/news.json
    node cfb/tools/news.js --offline    from the ESPN answers a previous run saved in cfb/tools/out/

   For every game of the current week with a major school in it (or a ranked team), ESPN's
   game summary gives the broadcast, the venue, both teams' scoring and yardage per game and
   allowed, each team's last five results, its record against the spread and ESPN's own
   projection; the team statistics feed adds yards per play, third downs, sacks taken and
   made, turnovers and penalties. From those, plus the model's call and the line the job
   froze, this writes the card's note and each team's matchup bullets. Free, like the job. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');

const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out');
const STATE = path.join(ROOT, 'state.json'), NEWS = path.join(ROOT, 'news.json');
const ARGS = new Set(process.argv.slice(2));
const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=';
const TEAMSTAT = (season, id) => `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${season}/types/2/teams/${id}/statistics`;
const INJURIES = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/injuries';
const TEAMNEWS = id => `https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?team=${id}&limit=12`;
const log = m => console.log(new Date().toISOString().slice(11, 19), m);

async function cached(name, url) {
  const file = path.join(OUT, name + '.json');
  if (ARGS.has('--offline')) return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  try { const j = await E.getJSON(url); fs.writeFileSync(file, JSON.stringify(j)); return j; }
  catch (e) { log(`${name}: ${e.message}`); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; }
}
async function inBatches(items, n, fn) { const out = []; for (let i = 0; i < items.length; i += n) out.push(...await Promise.all(items.slice(i, i + n).map(fn))); return out; }

const num = v => { if (v === null || v === undefined) return null; const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : null; };
const r1 = v => v === null ? null : Math.round(v * 10) / 10;
const ORD = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th');
const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;
const fmtHalf = n => (Math.abs(n) % 1 ? n.toFixed(1) : String(Math.round(n)));

/* ---------- the numbers ---------- */
function statsFromSummary(sum, teamId) {
  const t = (sum?.boxscore?.teams || []).find(x => String(x.team?.id) === String(teamId));
  const get = n => num((t?.statistics || []).find(s => s.name === n)?.displayValue);
  return { ppg: get('totalPointsPerGame'), pa: get('totalPointsPerGameAllowed'), ypg: get('yardsPerGame'), ypga: get('yardsPerGameAllowed'),
    passg: get('passingYardsPerGame'), rushg: get('rushingYardsPerGame'), passa: get('passingYardsPerGameAllowed'), rusha: get('rushingYardsPerGameAllowed') };
}
function statsFromTeam(j) {
  const cats = j?.splits?.categories || []; const get = (cat, n) => num(cats.find(c => c.name === cat)?.stats.find(s => s.name === n)?.displayValue);
  const gp = get('general', 'gamesPlayed') || get('passing', 'teamGamesPlayed') || null;
  const per = v => (v === null || !gp) ? null : r1(v / gp);
  return { ypp: get('passing', 'avgGain'), third: get('miscellaneous', 'thirdDownConvPct'), sk: get('defensive', 'sacks'), ska: get('passing', 'sacks'),
    ppg2: get('scoring', 'totalPointsPerGame'), ypg2: per(get('passing', 'netTotalYards')), passg2: get('passing', 'passingYardsPerGame'), rushg2: get('rushing', 'rushingYardsPerGame'),
    to: (get('miscellaneous', 'totalTakeaways') !== null && get('miscellaneous', 'totalGiveaways') !== null && gp) ? r1((get('miscellaneous', 'totalTakeaways') - get('miscellaneous', 'totalGiveaways')) / gp) : null,
    pen: per(get('general', 'totalPenaltyYards')), rz: get('miscellaneous', 'redzoneTouchdownPct') || null, gp };
}
/* what the site's own results say: games played, points for and against; the whole season,
   every opponent, so it holds for a lower-division side too */
function ownStats(S, id) {
  let gp = 0, pf = 0, pa = 0;
  for (const g of S.games) { if (g.state !== 'final' || g.hs === null || (g.home !== id && g.away !== id)) continue; gp++; pf += g.home === id ? g.hs : g.as; pa += g.home === id ? g.as : g.hs; }
  return gp ? { ppg: r1(pf / gp), pa: r1(pa / gp) } : { ppg: null, pa: null };
}
/* the box score's season averages when the summary still carries them (before kickoff), the
   team feed's and the site's own when it no longer does */
function seasonStats(sum, S, id) {
  const box = statsFromSummary(sum, id), own = ownStats(S, id);
  return { box, own, fill(t) {
    const st = Object.assign({}, box, t);
    if (st.ppg === null) st.ppg = t.ppg2 ?? own.ppg;
    if (st.pa === null) st.pa = own.pa;
    if (st.ypg === null) st.ypg = t.ypg2 ?? null;
    if (st.passg === null) st.passg = t.passg2 ?? null;
    if (st.rushg === null) st.rushg = t.rushg2 ?? null;
    for (const k of ['ppg2', 'ypg2', 'passg2', 'rushg2']) delete st[k];
    return st;
  } };
}
function lastFive(sum, teamId) {
  const t = (sum?.lastFiveGames || []).find(x => String(x.team?.id) === String(teamId));
  /* ESPN lists them oldest first; newest first is what a reader wants */
  return (t?.events || []).slice().sort((a, b) => (a.gameDate || '') < (b.gameDate || '') ? 1 : -1).slice(0, 5).map(e => ({ date: (e.gameDate || '').slice(0, 10), opp: e.opponent?.abbreviation || '', oppName: e.opponent?.displayName || '', at: e.atVs === '@' ? '@' : 'vs', score: e.score || '', result: e.gameResult || '', week: e.week ?? null }));
}
function atsOf(sum, teamId) {
  const t = (sum?.againstTheSpread || []).find(x => String(x.team?.id) === String(teamId));
  const r = (t?.records || [])[0]; return r?.summary || r?.displayValue || null;
}
function fpiOf(sum, side) { const v = num(sum?.predictor?.[side === 'home' ? 'homeTeam' : 'awayTeam']?.gameProjection); return v === null ? null : r1(v); }
function leadersOf(sum, teamId) {
  const t = (sum?.leaders || []).find(x => String(x.team?.id) === String(teamId));
  return (t?.leaders || []).map(c => { const l = (c.leaders || [])[0]; const cat = /pass/i.test(c.name) ? 'passing' : /rush/i.test(c.name) ? 'rushing' : /rec/i.test(c.name) ? 'receiving' : null; return l && cat ? { cat, name: l.athlete?.displayName || '', pos: l.athlete?.position?.abbreviation || '', line: l.displayValue || '' } : null; }).filter(Boolean).slice(0, 3);
}
function broadcastOf(sum, g) {
  const names = [...new Set((sum?.broadcasts || []).map(b => b.station || b.media?.shortName || (b.names || [])[0]).filter(Boolean))];
  return names.length ? names.join(' / ') : (g.tv || null);
}
function venueOf(sum, g) {
  const v = sum?.gameInfo?.venue; if (!v) return g.venue || null;
  const city = v.address?.city || '';
  const name = (v.fullName || '').replace(/\s*\(.*\)$/, '');
  return city ? `${name}, ${city}` : name;
}

/* ESPN's game summary carries the AP's preview, and once the game is played its recap. A
   written one opens with a dateline and a real first paragraph; the machine-made kind opens
   with "Team (2-1) at Team (3-0), Sept. 26 at 12 p.m." and lists numbers, which the page has
   already. The lead goes on the tile, a few paragraphs in the window, credited. */
function storyOf(sum) {
  const a = sum?.article; if (!a || !a.story) return null;
  const clean = t => t.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
  let paras = a.story.split(/<\/p>|\n\s*\n/).map(clean).filter(p => p.length > 30);
  if (!paras.length) return null;
  paras[0] = paras[0].replace(/^[A-Z][A-Za-z.' ]+,? ?[A-Za-z.]*\s*--\s*—?\s*/, '').replace(/^—\s*/, '');
  const machine = /^\S.*\(\d+-\d+\).* at .*\(\d+-\d+\)/.test(paras[0]) || /^Opening Line:/.test(paras[1] || '');
  if (machine) {
    /* the two "last game" paragraphs read "Baylor won 36-19 over Louisiana Tech on Sept. 19. Bennett led..." */
    const last = paras.filter(p => /^[A-Z][^.]{2,60} (won|beat|was beaten by|lost|defeated|fell) .*\d+-\d+.* on (Jan|Feb|March|April|May|June|July|Aug|Sept|Oct|Nov|Dec)\.? \d+\./.test(p)).slice(0, 2);
    if (!last.length) return null;
    /* one sentence each, the score line, without the stat lines that follow it */
    return { headline: null, kind: 'machine', lead: null, lastGame: last.map(p => p.split(/(?<=\d\.)\s(?=[A-Z])/)[0]).join(' '), paragraphs: [], source: 'AP, via ESPN' };
  }
  const cut = (t, n) => { if (t.length <= n) return t; const i = t.lastIndexOf('. ', n); return i > 60 ? t.slice(0, i + 1) : t.slice(0, n).replace(/\s+\S*$/, '') + '…'; };
  const body = paras.filter(p => !/^(Key stats|How to watch|Opening Line)/i.test(p)).slice(0, 4);
  return { headline: a.headline || null, kind: a.type || null, lead: cut(paras[0], 300), paragraphs: body.map(p => cut(p, 600)), source: 'AP, via ESPN' };
}

/* a team's own headlines from the last eight days: what the program is talking about. The
   feed mixes in league-wide pieces (bubble watches, uniform rankings, recruiting classes),
   so only a headline that names the school, its nickname or its coach is kept, and ESPN's
   own preview of this game is left out since the story above carries it */
function headlinesOf(j, t, since) {
  const names = [t.short, t.nick, t.name, (t.short || '').replace(/ St$/, ' State')].filter(Boolean).map(x => x.toLowerCase());
  const out = [];
  for (const a of j?.articles || []) {
    if (!a.headline || a.type === 'Preview' || a.type === 'Recap') continue;
    if ((a.published || '') < since) continue;
    const h = (a.headline + ' ' + (a.description || '')).toLowerCase();
    if (!names.some(n => n.length > 2 && h.includes(n))) continue;
    if (/rankings|bubble watch|projections|power rankings|best uniforms|betting|odds|picks|all-portal|takeaways|what we learned|highlights/i.test(a.headline)) continue;
    if (out.some(x => x.headline === a.headline.trim())) continue;
    out.push({ headline: a.headline.trim(), description: (a.description || '').replace(/\s+/g, ' ').trim(), date: (a.published || '').slice(0, 10), kind: a.type || null });
  }
  /* written pieces before clips, two on the tile and the bullet, three kept */
  const rank = x => x.kind === 'Media' ? 1 : 0;
  return out.sort((a, b) => rank(a) - rank(b) || (a.date < b.date ? 1 : -1)).slice(0, 3);
}

/* ---------- the writing ---------- */
function streakOf(S, id, games) {
  const mine = games.filter(g => g.state === 'final' && g.hs !== null && (g.home === id || g.away === id)).sort((a, b) => a.date < b.date ? 1 : -1);
  if (!mine.length) return null;
  const won = g => (g.home === id) === (g.hs > g.as);
  let n = 0; const first = won(mine[0]);
  for (const g of mine) { if (won(g) === first) n++; else break; }
  const last = mine[0]; const opp = S.teams[last.home === id ? last.away : last.home];
  const my = last.home === id ? last.hs : last.as, their = last.home === id ? last.as : last.hs;
  return { win: first, n, last: { opp: opp?.short || '?', my, their, home: last.home === id, neutral: last.neutral } };
}
function teamName(S, id) { const t = S.teams[id]; return t.ap ? `No. ${t.ap} ${t.short}` : t.short; }

function writeNote(S, g, ctx) {
  const T = S.teams, h = T[g.home], a = T[g.away];
  const conf = S.confs[h.conf]?.short;
  const sameConf = h.conf && h.conf === a.conf && h.conf !== '18';
  const sa = ctx.away.stats, sh = ctx.home.stats;
  const parts = [];
  /* the setting */
  let open;
  if (g.note && /championship|bowl|classic|playoff/i.test(g.note)) open = `${g.note}: ${teamName(S, g.away)} and ${teamName(S, g.home)}${g.neutral ? ' on a neutral field' : ''}`;
  else if (h.ap && a.ap) open = `A top-25 meeting${sameConf ? ` in ${conf} play` : ''}: ${teamName(S, g.away)} ${g.neutral ? 'meets' : 'visits'} ${teamName(S, g.home)}`;
  else if (!a.fbs) open = `${teamName(S, g.home)} hosts ${a.short} of the FCS`;
  else if (sameConf) open = `${teamName(S, g.away)} ${g.neutral ? 'meets' : 'goes to'} ${teamName(S, g.home)} ${(h.cw + h.cl === 0 && a.cw + a.cl === 0) ? `to open ${conf} play` : `in ${conf} play`}`;
  else open = `${teamName(S, g.away)} ${g.neutral ? 'meets' : 'visits'} ${teamName(S, g.home)} out of conference`;
  /* the line */
  const L = g.line;
  if (L && L.homeLine !== null && L.homeLine !== undefined) {
    const fav = L.homeLine < 0 ? h : L.homeLine > 0 ? a : null; const n = Math.abs(L.homeLine);
    let s = fav ? `${open}, ${fav === h ? 'the home side' : 'the visitor'} favored by ${fmtHalf(n)}` : `${open}, a pick'em`;
    parts.push(s + '.');
  } else parts.push(open + '.');
  /* the form */
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const form = (t, id, st, sk) => {
    const rec = t.fbs ? `${t.w}-${t.l}` : ((id === g.home ? g.hrec : g.arec) || `${t.w}-${t.l}`);
    if (!sk) return `${t.short} is ${rec}`;
    if (sk.n >= 3) return `${t.short} (${rec}) has ${sk.win ? 'won' : 'lost'} ${words[sk.n] || sk.n} straight`;
    return `${t.short} (${rec}) is ${sk.win ? `off a ${sk.last.my}-${sk.last.their} win over ${sk.last.opp}` : `off a ${sk.last.their}-${sk.last.my} loss to ${sk.last.opp}`}`;
  };
  /* the anecdote: the AP's opening line, else the sides' headlines, else the AP's line on each
     side's last game, else each side's form in words */
  if (ctx.story && ctx.story.lead) parts.push(ctx.story.lead);
  else if (ctx.around && ctx.around.length) parts.push(ctx.around.map(x => /[.!?]$/.test(x) ? x : x + '.').join(' '));
  else if (ctx.story && ctx.story.lastGame) parts.push(ctx.story.lastGame);
  else parts.push(`${form(a, g.away, sa, ctx.away.streak)}; ${form(h, g.home, sh, ctx.home.streak)}.`);
  return parts.join(' ');
}

function writeRecap(S, g, ctx) {
  const T = S.teams, h = T[g.home], a = T[g.away];
  const hw = g.hs > g.as; const w = hw ? h : a, l = hw ? a : h; const ws = hw ? g.hs : g.as, ls = hw ? g.as : g.hs;
  let s = `${teamName(S, w === h ? g.home : g.away)} beat ${teamName(S, l === h ? g.home : g.away)} ${ws}-${ls}${g.neutral ? ' on a neutral field' : w === h ? ' at home' : ' on the road'}`;
  const L = g.line;
  if (L && L.homeLine !== null && L.homeLine !== undefined) {
    const fav = L.homeLine < 0 ? h : L.homeLine > 0 ? a : null;
    if (fav) { const covered = (g.hs - g.as + L.homeLine) > 0 ? h : (g.hs - g.as + L.homeLine) < 0 ? a : null; s += `, ${fav === w ? 'as' : 'against'} a ${fmtHalf(Math.abs(L.homeLine))}-point favorite${covered ? (covered === fav ? ' that covered' : ' that did not cover') : ', a push'}`; }
    if (L.total) s += `; the total of ${L.total} went ${g.hs + g.as > L.total ? 'over' : g.hs + g.as < L.total ? 'under' : 'exactly'}`;
  }
  return s + '.';
}

function writeBullets(S, g, side, ctx) {
  const T = S.teams, me = T[g[side]], them = T[side === 'home' ? g.away : g.home], c = ctx[side], other = ctx[side === 'home' ? 'away' : 'home'];
  const out = [];
  const L = g.line; const p = side === 'home' ? g.pHome : 1 - g.pHome;
  if (L && L.homeLine !== null && L.homeLine !== undefined) {
    const my = side === 'home' ? L.homeLine : -L.homeLine;
    let s = `<strong>${my < 0 ? `Favored by ${fmtHalf(-my)}` : my > 0 ? `${fmtHalf(my)}-point underdog` : 'A pick\'em'} at DraftKings.</strong> The model gives ${me.short} ${Math.round(p * 100)} percent`;
    const mySpread = side === 'home' ? g.spread : -g.spread;
    s += mySpread < 0 ? ` and has it by ${fmtHalf(-mySpread)}` : mySpread > 0 ? ` and has it losing by ${fmtHalf(mySpread)}` : ' and calls it even';
    if (c.fpi !== null) s += `; ESPN's FPI ${c.fpi} percent`;
    if (c.ats) s += `. ${c.ats} against the spread this season`;
    out.push(s + '.');
  } else out.push(`<strong>No line yet.</strong> The model gives ${me.short} ${Math.round(p * 100)} percent${c.fpi !== null ? `, ESPN's FPI ${c.fpi}` : ''}.`);
  const sk = c.streak;
  if (sk) {
    const lf = c.lastFive.slice(0, 3).map(x => `${x.result} ${x.score} ${x.at} ${x.opp}`).join(', ');
    out.push(`<strong>${sk.n >= 3 ? (sk.win ? `${plural(sk.n, 'straight win')}.` : `${plural(sk.n, 'straight loss', 'straight losses')}.`) : (sk.win ? `Off a win.` : `Off a loss.`)}</strong> ${sk.win ? `${sk.last.my}-${sk.last.their} over` : `${sk.last.their}-${sk.last.my} to`} ${sk.last.opp}${sk.last.neutral ? '' : sk.last.home ? ' at home' : ' on the road'} last out${lf ? `; recent: ${lf}` : ''}.`);
  }
  const st = c.stats;
  if (st.ppg !== null) {
    let s = `<strong>${fmtHalf(st.ppg)} points a game, ${st.pa !== null ? fmtHalf(st.pa) + ' allowed' : ''}.</strong>`;
    const bits = [];
    if (st.ypg !== null) bits.push(`${Math.round(st.ypg)} yards a game${st.ypp !== null ? ` on ${st.ypp} a play` : ''}`);
    if (st.ypga !== null) bits.push(`${Math.round(st.ypga)} allowed`);
    if (st.third !== null) bits.push(`${Math.round(st.third)} percent on third down`);
    if (st.to !== null) bits.push(`${st.to > 0 ? '+' : ''}${st.to} a game in turnovers`);
    if (bits.length) s += ' ' + bits.join(', ') + '.';
    out.push(s);
  }
  if (other.stats.ppg !== null && st.pa !== null) out.push(`<strong>The matchup.</strong> ${them.short}'s offense averages ${fmtHalf(other.stats.ppg)}${other.stats.ypg !== null ? ` and ${Math.round(other.stats.ypg)} yards` : ''}; this defense has allowed ${fmtHalf(st.pa)}${st.ypga !== null ? ` and ${Math.round(st.ypga)}` : ''}${st.sk !== null ? `, with ${plural(st.sk, 'sack')}` : ''}.`);
  if (c.headlines.length) out.push(`<strong>Around the program.</strong> ${c.headlines.slice(0, 2).map(x => `${x.headline}${x.description && x.description !== x.headline && x.description.length <= 140 && !x.description.startsWith(x.headline) ? ` (${x.description.replace(/\.$/, '')})` : ''}`).join('; ')}.`);
  if (c.leaders.length) out.push(`<strong>Leaders.</strong> ${c.leaders.map(l => `<strong>${l.name}</strong> (${l.pos}) ${l.line.toLowerCase()} ${l.cat}`).join('; ')}.`);
  if (c.injuries.length) out.push(`<strong>Injuries.</strong> ${c.injuries.slice(0, 5).map(i => `<strong>${i.name}</strong> (${i.pos}) ${i.status.toLowerCase()}`).join(', ')}.`);
  return out;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const S = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const T = S.teams;
  const wkGames = S.games.filter(g => (S.week === 'post' ? g.type === 3 : g.type === 2 && g.week === S.week));
  const slate = wkGames.filter(g => T[g.home].major || T[g.away].major || g.hrank || g.arank).sort((a, b) => a.date < b.date ? -1 : 1);
  log(`week ${S.week}: ${slate.length} of ${wkGames.length} games on the slate`);
  const sums = await inBatches(slate, 4, g => cached(`summary_${g.id}`, SUMMARY + g.id));
  const teamIds = [...new Set(slate.flatMap(g => [g.home, g.away]))];
  const tstats = {}; await inBatches(teamIds, 4, async id => { tstats[id] = statsFromTeam(await cached(`teamstat_${S.season}_${id}`, TEAMSTAT(S.season, id))); });
  const since = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  const heads = {}; await inBatches(teamIds, 4, async id => { heads[id] = headlinesOf(await cached(`teamnews_${id}`, TEAMNEWS(id)), T[id] || {}, since); });
  const inj = {}; const ij = await cached('injuries', INJURIES);
  for (const t of ij?.injuries || []) inj[String(t.id)] = (t.injuries || []).map(x => ({ name: x.athlete?.displayName || '', pos: x.athlete?.position?.abbreviation || '', status: x.status || '' })).filter(x => x.name);

  const prevNews = fs.existsSync(NEWS) ? JSON.parse(fs.readFileSync(NEWS, 'utf8')) : null;
  const prevGame = new Map(((prevNews && prevNews.season === S.season && prevNews.games) || []).map(g => [g.id, g]));
  const games = slate.map((g, i) => {
    const sum = sums[i];
    const started = g.state !== 'pre' || (sum && !sum.predictor && !(sum.lastFiveGames || []).length);
    if (started && prevGame.has(g.id)) return prevGame.get(g.id);
    const recap = g.state === 'final' && g.hs !== null;
    const side = s => { const id = g[s]; return { stats: seasonStats(sum, S, id).fill(tstats[id] || {}), lastFive: lastFive(sum, id), ats: atsOf(sum, id), fpi: fpiOf(sum, s), leaders: leadersOf(sum, id), injuries: inj[id] || [], headlines: heads[id] || [], streak: streakOf(S, id, S.games) }; };
    const ctx = { home: side('home'), away: side('away') };
    const L = g.line;
    const lineText = L && L.homeLine !== null && L.homeLine !== undefined ? `${L.homeLine <= 0 ? T[g.home].abbr + ' ' + (L.homeLine === 0 ? 'PK' : L.homeLine) : T[g.away].abbr + ' -' + L.homeLine}${L.total ? `, O/U ${L.total}` : ''}` : null;
    ctx.story = storyOf(sum);
    /* one headline a side, never the same one twice: a piece that names both teams comes
       back from both feeds */
    ctx.around = [...new Set([ctx.away, ctx.home].flatMap(c => c.headlines.slice(0, 1)).map(x => x.headline))];
    let note = recap ? writeRecap(S, g, ctx) : writeNote(S, g, ctx);
    if (recap && ctx.story && ctx.story.lead) note += ' ' + ctx.story.lead;
    const credit = ctx.story && ctx.story.lead ? ctx.story.source : ctx.around.length ? 'ESPN' : (ctx.story && ctx.story.lastGame) ? ctx.story.source : null;
    return { id: g.id, away: g.away, home: g.home, kick: g.date, tv: broadcastOf(sum, g), venue: venueOf(sum, g), line: lineText, story: ctx.story, around: ctx.around, credit,
      note,
      teams: { home: Object.assign({ bullets: writeBullets(S, g, 'home', ctx) }, ctx.home, { streak: undefined }), away: Object.assign({ bullets: writeBullets(S, g, 'away', ctx) }, ctx.away, { streak: undefined }) } };
  });
  const dates = slate.length ? [slate[0].date, slate[slate.length - 1].date].map(d => new Date(d)) : [];
  const fmt = d => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  const news = { published: new Date().toISOString(), season: S.season, week: S.week, label: S.week === 'post' ? 'Postseason' : `Week ${S.week}`,
    dates: dates.length ? `${fmt(dates[0])} to ${fmt(dates[1])}, ${dates[1].getFullYear()}` : '', games };
  const prev = prevNews;
  const strip = n => JSON.stringify(Object.assign({}, n, { published: null }));
  if (prev && strip(prev) === strip(news)) { log('nothing changed; news.json left alone'); return; }
  fs.writeFileSync(NEWS, JSON.stringify(news));
  log(`wrote cfb/news.json: ${games.length} games, ${games.filter(g => g.tv).length} with a broadcast, ${games.filter(g => g.teams.home.stats.ppg !== null).length} with stats`);
}
main().catch(e => { console.error(e); process.exit(1); });
