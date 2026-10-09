/* The Deep Dive's lineups held to the files they were built from: the nflverse injury report, roster
   and schedule (and ESPN's injury list when the build had it). The smoke test runs these; each check
   is a rule the lineups promise, stated on the source data, so a lean week, a bye, week 1, a week
   with no report yet or a game already played passes as long as the rule holds.

     week        the lineups are for the week the schedule says is current, in this season
     official    nobody listed whom this week's report rules Out or Doubtful
     q-dnp       nobody listed who is Questionable on this week's report with no practice on it
     last-game   nobody listed who was Out in his team's last game and has not practised since, unless
                 his team has filed its game statuses (which then speak for him)
     roster      nobody listed who is off the active roster (IR, PUP, practice squad, cut...) or now on
                 another team; nobody listed who was inactive last game without practising this week
     espn        nobody listed whom ESPN rules Out, Doubtful, on IR or suspended before the team files
     next-qb     a quarterback carrying a tag has the next quarterback named beside him

   Until 2026-10-09 the smoke test only checked the lineups against themselves, and they named
   Hendrickson, Gonzalez, Elliss, Banks and DeVonta Smith (each Out in week 4 and not practising in
   week 5) as playing, because ESPN's mid-week "Questionable" stopped the rule before it ran.       */
'use strict';
const { SEASON, ab, seasonState, etToISO, parseCSV, fetchText } = require('./lib');
const { notePractice } = require('./context');

const norm = s => String(s || '').toLowerCase().replace(/[.'’,]/g, '').replace(/-/g, ' ').replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '').replace(/\s+/g, ' ').trim();
const lc = s => String(s || '').trim().toLowerCase();
const etDay = iso => { const d = new Date(iso); return isNaN(d) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); };
const addDays = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const UNITS = ['qb', 'ol', 'rb', 'rec', 'front', 'db'];
const OFF = new Set(['RES', 'PUP', 'NON', 'SUS', 'RET', 'CUT', 'DEV', 'EXE', 'TRD', 'TRT']);

/* the sources: the build's own snapshot when it matches the file on the page, else a fresh download */
async function loadSources(cacheFile, meta, fs) {
  try {
    const S = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (meta && S.built_at === meta.built_at) return { ...S, from: 'the build\'s own snapshot' };
  } catch (e) { /* no snapshot: download */ }
  const REL = 'https://github.com/nflverse/nflverse-data/releases/download';
  const [g, i, r] = await Promise.all([
    fetchText('https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'),
    fetchText(`${REL}/injuries/injuries_${SEASON}.csv`), fetchText(`${REL}/rosters/roster_${SEASON}.csv`)]);
  return { games: parseCSV(g.text), injuries: parseCSV(i.text), roster: parseCSV(r.text), espn: null, report_modified: i.lastModified, from: 'a fresh download' };
}

function check(U, meta, S) {
  const fails = {}, add = (k, msg) => (fails[k] ??= []).push(msg);
  const st = seasonState(S.games);
  /* week: built for the current week of this season */
  if (!meta) add('week', 'units2026.js carries no UNITS26_META (built before 2026-10-09): rebuild with node tools/context.js');
  else {
    if (meta.season !== SEASON) add('week', `built for season ${meta.season}, the tracker's is ${SEASON}`);
    if (meta.week !== st.week) add('week', `built for week ${meta.week}, the schedule's current week is ${st.week}`);
  }
  const week = st.week;
  const reg = S.games.filter(r => String(r.season) === String(SEASON) && r.game_type === 'REG');
  const kick = {}, last = {};
  for (const r of reg) {
    const k = etToISO(r.gameday, r.gametime), w = +r.week;
    for (const t of [ab(r.away_team), ab(r.home_team)]) {
      if (w === week) kick[t] = k;
      else if (w < week && (!last[t] || w > last[t])) last[t] = w;
    }
  }
  const rep = {}, wk = {}, teamRows = {}, teamStatus = {};
  for (const r of S.injuries || []) {
    if (r.season_type && r.season_type !== 'REG') continue;
    (wk[+r.week] ??= {})[r.gsis_id] = r;
    if (+r.week === week) { rep[r.gsis_id] = r; teamRows[ab(r.team)] = true; if (lc(r.report_status)) teamStatus[ab(r.team)] = true; }
  }
  const practiceDay = S.report_modified && isFinite(Date.parse(S.report_modified)) ? addDays(etDay(S.report_modified), -1) : '';
  const filed = t => !!(teamStatus[t] || (teamRows[t] && practiceDay && kick[t] && practiceDay >= addDays(etDay(kick[t]), -2)));
  const roster = {}, rosterByName = {};
  for (const r of S.roster || []) { if (!r.gsis_id) continue; roster[r.gsis_id] = r; rosterByName[`${ab(r.team)}|${norm(r.full_name)}`] ??= r.gsis_id; }
  const espn = {};
  for (const e of S.espn || []) espn[`${e.team}|${norm(e.name)}`] = e;

  /* the newest practice this week: the report's, or an ESPN note written since the team's last game
     that names a later practice day than the report holds */
  const lastKick = {};
  for (const r of reg) { const w = +r.week; for (const t of [ab(r.away_team), ab(r.home_team)]) if (w === last[t]) lastKick[t] = etDay(etToISO(r.gameday, r.gametime)); }
  const practice = (id, team, name) => {
    const x = id && rep[id];
    let p = x && /did not/i.test(x.practice_status || '') ? (/not injury related/i.test(x.practice_primary_injury || '') ? 'rest' : 'dnp')
      : x && /limited|full/i.test(x.practice_status || '') ? 'practised' : (!x && teamRows[team] ? 'unlisted' : null);
    const e = espn[`${team}|${norm(name)}`], nd = e && e.date ? etDay(e.date) : '';
    if (nd && (!lastKick[team] || nd > lastKick[team])) {
      const n = notePractice(`${e.comment || ''} ${e.long || ''}`, nd);
      if (n && (!practiceDay || n.day > practiceDay)) p = n.st === 'dnp' ? 'dnp' : 'practised';
    }
    return p;
  };
  let listed = 0;
  for (const [team, T] of Object.entries(U)) {
    if (!kick[team]) continue;   // no game this week (a bye): not on the page
    for (const u of UNITS) for (const p of (T[u] && T[u].who) || []) {
      listed++;
      const id = p.id || rosterByName[`${team}|${norm(p.n)}`];
      const who = `${team} ${u}: ${p.n}`;
      const x = id && rep[id], ro = id && roster[id], pr = practice(id, team, p.n);
      const st2 = lc(x && x.report_status);
      if (st2 === 'out' || st2 === 'doubtful') add('official', `${who} is ${st2} on the week ${week} report`);
      if (st2 === 'questionable' && pr === 'dnp') add('q-dnp', `${who} is questionable with no practice on the week ${week} report`);
      const prev = id && last[team] && wk[last[team]] && wk[last[team]][id];
      if (!st2 && !filed(team) && prev && lc(prev.report_status) === 'out' && !(pr === 'practised' || pr === 'unlisted'))
        add('last-game', `${who} was out in week ${last[team]} and has not practised since`);
      if (ro) {
        if (ab(ro.team) !== team) add('roster', `${who} is on ${ab(ro.team)}'s roster now`);
        else if (OFF.has(ro.status)) add('roster', `${who} is ${ro.status} on the roster`);
        else if (ro.status === 'INA' && pr !== 'practised') add('roster', `${who} was inactive last game and has not practised this week`);
      }
      const e = espn[`${team}|${norm(p.n)}`];
      if (e && !st2 && !filed(team) && /^(out|doubtful|injured reserve|suspension)$/i.test(e.status || '')) add('espn', `${who} is ${e.status} on ESPN's list`);
    }
    const q = T.qb && T.qb.who && T.qb.who[0];
    if (q && q.q && !T.qb.next && !(T.qb.who.length > 1)) {
      /* only a failure when the report shows another quarterback on the roster who could be named */
      const others = Object.values(roster).filter(r => ab(r.team) === team && r.status === 'ACT' && /^QB$/.test(r.position || r.depth_chart_position || '') && norm(r.full_name) !== norm(q.n));
      if (others.length) add('next-qb', `${team}: ${q.n} is ${q.q} and no next quarterback is named`);
    }
  }
  return { fails, listed, week, phase: st.phase };
}

module.exports = { check, loadSources };
