/* ESPN's public college football feeds, the way news/tools/pull-week.js and the Live
   Parlays section read the NFL ones. No key, no credits. `groups=80` is FBS: every game
   with an FBS team in it, so an FBS team's game against an FCS school is included and
   the FCS side shows up as a team too.

   A scoreboard event is flattened by gameRow() into the row shape the whole site uses:
   the id, the season, the week, the kickoff, both team ids, scores, the neutral-site
   flag, each side's conference, the poll rank ESPN showed at the time, DraftKings' line
   when ESPN carries it (upcoming games only; past seasons have none) and the status. */
'use strict';

const SB = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';
const RANKINGS = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings';
const CONFS = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard/conferences?groups=80';

/* from GitHub's servers ESPN refuses a browser-like UA but accepts a plain one, the same
   finding news/tools/pull-week.js made; a plain header set goes first */
const HEADER_SETS = [
  { 'User-Agent': 'nfl-hub-cfb/1.0 (+https://github.com/DEMON-X13/nfl-hub)', Accept: 'application/json' },
  {},
];

async function getJSON(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    for (const headers of HEADER_SETS) {
      try {
        const r = await fetch(url, { headers, redirect: 'follow' });
        if (r.ok) return await r.json();
        last = new Error(`HTTP ${r.status} ${url}`);
      } catch (e) { last = e; }
    }
    await new Promise(res => setTimeout(res, 1500 * (i + 1)));
  }
  throw last;
}

/* one week of one season. type 2 is the regular season, 3 the postseason: every bowl and
   the whole playoff come back as its week 1 (a date-only postseason query is unreliable,
   returning a handful of bowls for most seasons, checked 2026-09-23) */
async function scoreboard(season, week, type = 2) {
  const q = `groups=80&seasontype=${type}&week=${type === 3 ? 1 : week}&dates=${season}&limit=400`;
  return getJSON(`${SB}?${q}`);
}

const num = v => (v === undefined || v === null || v === '' ? null : (isFinite(+v) ? +v : null));
const american = s => { const n = num(String(s ?? '').replace('+', '')); return n; };

/* DraftKings via ESPN: the home line (negative when the home side is favoured), both
   moneylines and the total. null where ESPN carries nothing, which is every finished game
   and every game more than about a week out */
function oddsOf(comp) {
  const o = (comp.odds || [])[0];
  if (!o) return null;
  const out = { book: o.provider?.name || null, details: o.details || null, total: num(o.overUnder) };
  const ps = o.pointSpread, ml = o.moneyline;
  const line = v => num(String(v ?? '').replace('+', ''));
  if (ps?.home?.close?.line !== undefined) out.homeLine = line(ps.home.close.line);
  else if (o.spread !== undefined && o.spread !== null) {
    /* older shape: `spread` is the favourite's number and details says who */
    const fav = o.awayTeamOdds?.favorite ? 'away' : 'home';
    out.homeLine = fav === 'home' ? -Math.abs(+o.spread) : Math.abs(+o.spread);
  } else out.homeLine = null;
  out.homeSpreadOdds = ps?.home?.close?.odds !== undefined ? american(ps.home.close.odds) : null;
  out.awaySpreadOdds = ps?.away?.close?.odds !== undefined ? american(ps.away.close.odds) : null;
  out.homeML = ml?.home?.close?.odds !== undefined ? american(ml.home.close.odds) : null;
  out.awayML = ml?.away?.close?.odds !== undefined ? american(ml.away.close.odds) : null;
  if (out.homeLine === null && out.homeML === null) return null;
  return out;
}

function gameRow(ev) {
  const comp = ev.competitions?.[0];
  if (!comp || !comp.competitors) return null;
  const home = comp.competitors.find(c => c.homeAway === 'home'), away = comp.competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return null;
  const st = comp.status?.type || {};
  const state = st.state === 'post' ? 'final' : st.state === 'in' ? 'live' : 'pre';
  const rank = c => { const r = c.curatedRank?.current; return r && r <= 25 ? r : null; };
  const note = (comp.notes || [])[0]?.headline || null;
  return {
    id: ev.id, season: ev.season?.year ?? null, type: ev.season?.type ?? 2, week: ev.week?.number ?? null,
    date: comp.date || ev.date, state, detail: st.shortDetail || st.detail || null,
    home: home.team.id, away: away.team.id,
    hs: state === 'pre' ? null : num(home.score), as: state === 'pre' ? null : num(away.score),
    neutral: !!comp.neutralSite, conf: !!comp.conferenceCompetition,
    hconf: home.team.conferenceId || null, aconf: away.team.conferenceId || null,
    hrank: rank(home), arank: rank(away),
    hrec: (home.records || [])[0]?.summary || null, arec: (away.records || [])[0]?.summary || null,
    note, odds: oddsOf(comp),
    venue: comp.venue?.fullName || null,
    tv: [...new Set((comp.broadcasts || []).flatMap(b => b.names || []).concat((comp.geoBroadcasts || []).filter(b => b.market?.type === 'National').map(b => b.media?.shortName).filter(Boolean)))].join(' / ') || null,
  };
}

/* the team table from a scoreboard: id -> names, colours, conference. Later calls overwrite
   earlier ones, so pulling the seasons in order leaves each team's current conference */
function teamsOf(json, into = {}) {
  for (const ev of json.events || []) for (const c of (ev.competitions?.[0]?.competitors || [])) {
    const t = c.team;
    into[t.id] = { abbr: t.abbreviation || t.shortDisplayName, name: t.displayName, short: t.shortDisplayName || t.location,
      nick: t.name || null, conf: t.conferenceId || null, color: t.color ? '#' + t.color : null, alt: t.alternateColor ? '#' + t.alternateColor : null,
      logo: t.logo || null };
  }
  return into;
}

async function conferences() {
  const j = await getJSON(CONFS);
  const out = {};
  for (const c of j.conferences || []) if (String(c.parentGroupId) === '80') out[String(c.groupId)] = { name: c.name, short: c.shortName || c.name };
  return out;
}

/* AP, Coaches and, from November, the CFP committee's ranking: name -> [{rank, team, record}] */
async function rankings() {
  const j = await getJSON(RANKINGS);
  const out = {};
  for (const r of j.rankings || []) {
    if (!/AP Top 25|AFCA Coaches|College Football Playoff|CFP/i.test(r.name)) continue;
    const key = /AP/.test(r.name) ? 'ap' : /Coaches/.test(r.name) ? 'coaches' : 'cfp';
    out[key] = { name: r.name, week: r.occurrence?.displayValue || null, date: (r.date || '').slice(0, 10),
      ranks: (r.ranks || []).map(x => ({ rank: x.current, prev: x.previous ?? null, team: x.team?.id, record: x.recordSummary || null })),
      others: (r.others || []).map(x => ({ team: x.team?.id, points: x.points ?? null })) };
  }
  return out;
}

module.exports = { getJSON, scoreboard, gameRow, teamsOf, conferences, rankings, SB };
