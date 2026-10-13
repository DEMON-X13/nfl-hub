/* ESPN's college feeds, fabricated from a published state.json, for the simulation and the
   gate's tests: the scoreboard by week (and the postseason), the rankings and the CFB News
   feeds (game summary, team statistics, team news, injuries), each in the shape the job reads
   (espn.js gameRow/oddsOf/rankingsOf, news.js). ESPN itself is never called. */
'use strict';
const fs = require('fs'), path = require('path');

const teamOf = (id, t) => ({ id, abbreviation: t.abbr, displayName: t.name, shortDisplayName: t.short, location: t.short, name: t.nick || null,
  conferenceId: t.conf || undefined, color: t.color ? t.color.slice(1) : undefined, alternateColor: t.alt ? t.alt.slice(1) : undefined, logo: t.logo || undefined });

const am = n => n === null || n === undefined ? undefined : (n > 0 ? '+' + n : String(n));
/* DraftKings' line in the scoreboard's odds shape, from a published line */
function oddsOf(line) {
  if (!line) return undefined;
  const hl = line.homeLine;
  return [{ provider: { name: line.book || 'DraftKings' }, details: line.details || null, overUnder: line.total ?? undefined,
    pointSpread: hl === null || hl === undefined ? undefined : { home: { close: { line: am(hl) || '0', odds: am(line.homeSpreadOdds ?? -110) } }, away: { close: { line: am(-hl) || '0', odds: am(line.awaySpreadOdds ?? -110) } } },
    moneyline: { home: { close: { odds: am(line.homeML) } }, away: { close: { odds: am(line.awayML) } } } }];
}

const STATUS = {
  pre: d => ({ state: 'pre', name: 'STATUS_SCHEDULED', completed: false, shortDetail: d || 'Scheduled' }),
  live: d => ({ state: 'in', name: 'STATUS_IN_PROGRESS', completed: false, shortDetail: d || '2nd 5:00' }),
  final: () => ({ state: 'post', name: 'STATUS_FINAL', completed: true, shortDetail: 'Final' }),
  postponed: () => ({ state: 'post', name: 'STATUS_POSTPONED', completed: false, shortDetail: 'Postponed' }),
};

/* one scoreboard event from a state row (plus `odds`, the line ESPN is to carry, or null) */
function eventOf(g, teams, season, odds) {
  const T = id => teams[id] || { abbr: 'TBD', name: 'TBD', short: 'TBD', nick: 'TBD', conf: null };
  const st = (STATUS[g.state] || STATUS.pre)(g.detail);
  const side = (id, ha, sc, rk, rec) => ({ homeAway: ha, team: teamOf(id, T(id)), score: sc === null || sc === undefined ? '0' : String(sc),
    curatedRank: { current: rk || 99 }, records: rec ? [{ summary: rec }] : [] });
  return { id: g.id, date: g.date, season: { year: season, type: g.type }, week: { number: g.type === 3 ? 1 : g.week },
    competitions: [{ date: g.date, neutralSite: !!g.neutral, conferenceCompetition: !!g.conf, timeValid: !g.tbd, status: { type: st },
      competitors: [side(g.home, 'home', g.hs, g.hrank, g.hrec), side(g.away, 'away', g.as, g.arank, g.arec)],
      notes: g.note ? [{ headline: g.note }] : [], odds: odds ? oddsOf(odds) : undefined,
      venue: g.venue ? { fullName: g.venue } : undefined, broadcasts: g.tv ? [{ names: g.tv.split(' / ') }] : [] }] };
}

/* every scoreboard file the job reads for a season: weeks 1-16 and the postseason. `lineOf(g)`
   says which line ESPN carries for a game (default: none); `omit` names files not to write
   (a download that failed) */
function writeScoreboards(dir, season, rows, teams, { lineOf = () => null, omit = [] } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const files = {};
  for (let w = 1; w <= 16; w++) files[`sb_${season}_2_${w}.json`] = [];
  files[`sb_${season}_3_1.json`] = [];
  for (const g of rows) {
    const f = g.type === 3 ? `sb_${season}_3_1.json` : `sb_${season}_2_${g.week}.json`;
    (files[f] = files[f] || []).push(eventOf(g, teams, season, lineOf(g)));
  }
  for (const [f, evs] of Object.entries(files)) {
    const p = path.join(dir, f);
    if (omit.includes(f)) { if (fs.existsSync(p)) fs.unlinkSync(p); continue; }
    fs.writeFileSync(p, JSON.stringify({ events: evs }));
  }
}

/* the rankings feed's raw answer from published polls */
function rankingsRaw(polls, season) {
  const name = { ap: 'AP Top 25', coaches: 'AFCA Coaches Poll', cfp: 'College Football Playoff Rankings' };
  return { rankings: Object.entries(polls || {}).map(([k, p]) => ({ name: p.name || name[k], season: { year: p.season ?? season }, occurrence: { displayValue: p.week },
    date: p.date ? p.date + 'T12:00Z' : undefined, ranks: p.ranks.map(r => ({ current: r.rank, previous: r.prev, team: { id: r.team }, recordSummary: r.record })) })) };
}

module.exports = { eventOf, oddsOf, writeScoreboards, rankingsRaw, teamOf };
