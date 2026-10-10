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
     espn-q-dnp  nobody listed whom ESPN has Questionable, before the team files, with a note of no practice
                 on the last practice day before kickoff (the day before a Thursday game, two days before
                 any other)
     next-qb     a quarterback carrying a tag has a next quarterback named beside him whenever the team
                 has one these same rules let play, and the one named is one of those
   "Filed" is official and nothing else: the team's rows on the week's report carry a game status.
   (A version of these checks also counted a practice report two days before kickoff as filed, the
   same shortcut the build took, so for a Thursday game Tuesday's practice report "filed" the team
   and both the build and its check let ESPN's Out and the last-game rule go: Mayfield and Winfield
   were listed on the Wednesday before TB at DAL and the checks passed. A check that shares the
   build's shortcut cannot catch it.)
   What it shares with the build is the reading of a source, never a rule: an ESPN entry is matched to
   a player and a practice note is dated by the same functions (context.js espnIndex, weekPractice and
   notePractice), so the two cannot disagree about what a note says. (Until 2026-10-09 the check matched
   ESPN by the roster's full name, the build by the chart's, and the check dated a note older than the
   report as no news even for a team with no rows yet: it failed "Olu Fashanu" and Breece Hall, whom the
   build rightly listed.)

   Until 2026-10-09 the smoke test only checked the lineups against themselves, and they named
   Hendrickson, Gonzalez, Elliss, Banks and DeVonta Smith (each Out in week 4 and not practising in
   week 5) as playing, because ESPN's mid-week "Questionable" stopped the rule before it ran.       */
'use strict';
const { SEASON, ab, seasonState, etToISO, parseCSV, fetchText, unplayed } = require('./lib');
const { weekPractice, espnIndex, lastPracticeDay, etDay } = require('./context');

const norm = s => String(s || '').toLowerCase().replace(/[.'’,]/g, '').replace(/-/g, ' ').replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '').replace(/\s+/g, ' ').trim();
const lc = s => String(s || '').trim().toLowerCase();
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
  const [g, r] = await Promise.all([fetchText('https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'), fetchText(`${REL}/rosters/roster_${SEASON}.csv`)]);
  const games = parseCSV(g.text);
  /* no injury report before the season's first game: a 404 then is an empty report (context.js reads it the same way) */
  let i;
  try { i = await fetchText(`${REL}/injuries/injuries_${SEASON}.csv`); }
  catch (e) {
    if (/^404\b/.test(e.message || '') && !games.some(x => String(x.season) === String(SEASON) && x.game_type === 'REG' && !unplayed(x))) i = { text: '', lastModified: '' };
    else throw e;
  }
  return { games, injuries: i.text ? parseCSV(i.text) : [], roster: parseCSV(r.text), espn: null, report_modified: i.lastModified, from: 'a fresh download' };
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
  const filed = t => !!teamStatus[t];
  const roster = {}, rosterByName = {};
  for (const r of S.roster || []) { if (!r.gsis_id) continue; roster[r.gsis_id] = r; rosterByName[`${ab(r.team)}|${norm(r.full_name)}`] ??= r.gsis_id; }
  /* ESPN's entry for a player, by id through every name he goes by (the build's own index) */
  const espnOf = espnIndex(S.espn, S.roster, S.chart_names);

  /* the newest practice this week, read as the build reads it: the report's, or an ESPN note written
     since the team's last game where it is newer */
  const lastKick = {};
  for (const r of reg) { const w = +r.week; for (const t of [ab(r.away_team), ab(r.home_team)]) if (w === last[t]) lastKick[t] = etDay(etToISO(r.gameday, r.gametime)); }
  const practice = (id, team, name) => {
    const p = weekPractice({ row: id && rep[id], teamOnReport: !!teamRows[team], reportDay: practiceDay, note: espnOf(id, team, name), since: lastKick[team] || '' });
    return { ...p, k: p.st === 'limited' || p.st === 'full' ? 'practised' : p.st };
  };
  /* the kickoff the build worked to (ESPN's where it had one), else the schedule's */
  const kickDay = t => etDay((S.kicks && S.kicks[t]) || kick[t]);
  /* every rule a player can break, as [check, why]: an empty list means the rules let him play */
  const verdicts = (id, team, name) => {
    const v = [], x = id && rep[id], ro = id && roster[id], P = practice(id, team, name), pr = P.k;
    const st2 = lc(x && x.report_status);
    if (st2 === 'out' || st2 === 'doubtful') v.push(['official', `is ${st2} on the week ${week} report`]);
    if (st2 === 'questionable' && pr === 'dnp') v.push(['q-dnp', `is questionable with no practice on the week ${week} report`]);
    const prev = id && last[team] && wk[last[team]] && wk[last[team]][id];
    if (!st2 && !filed(team) && prev && lc(prev.report_status) === 'out' && !(pr === 'practised' || pr === 'unlisted'))
      v.push(['last-game', `was out in week ${last[team]} and has not practised since`]);
    if (ro) {
      if (ab(ro.team) !== team) v.push(['roster', `is on ${ab(ro.team)}'s roster now`]);
      else if (OFF.has(ro.status)) v.push(['roster', `is ${ro.status} on the roster`]);
      else if (ro.status === 'INA' && pr !== 'practised') v.push(['roster', 'was inactive last game and has not practised this week']);
    }
    const e = espnOf(id, team, name);
    if (e && !st2 && !filed(team) && /^(out|doubtful|injured reserve|suspension)$/i.test(e.status || '')) v.push(['espn', `is ${e.status} on ESPN's list`]);
    const kd = kickDay(team), lpd = kd ? lastPracticeDay(kd) : '';
    if (e && !st2 && !filed(team) && lc(e.status) === 'questionable' && P.src === 'espn' && P.st === 'dnp' && lpd && P.day >= lpd)
      v.push(['espn-q-dnp', `is questionable on ESPN's list and did not practise ${P.day}, the last practice day before kickoff (${kd})`]);
    return v;
  };
  let listed = 0;
  for (const [team, T] of Object.entries(U)) {
    if (!kick[team]) continue;   // no game this week (a bye): not on the page
    for (const u of UNITS) for (const p of (T[u] && T[u].who) || []) {
      listed++;
      const id = p.id || rosterByName[`${team}|${norm(p.n)}`];
      for (const [k, why] of verdicts(id, team, p.n)) add(k, `${team} ${u}: ${p.n} ${why}`);
    }
    /* a quarterback in doubt: the next one named whenever the team has one these rules let play */
    const q = T.qb && T.qb.who && T.qb.who[0];
    if (q && q.q && !(T.qb.who.length > 1)) {
      const nx = T.qb.next;
      if (nx) {
        const v = verdicts(nx.id || rosterByName[`${team}|${norm(nx.n)}`], team, nx.n);
        if (v.length) add('next-qb', `${team}: the next quarterback named, ${nx.n}, ${v.map(x => x[1]).join(' and ')}`);
      } else {
        const free = Object.values(roster).filter(r => ab(r.team) === team && (r.status === 'ACT' || r.status === 'INA') && /^QB$/.test(r.position || r.depth_chart_position || '') && norm(r.full_name) !== norm(q.n))
          .filter(r => !verdicts(r.gsis_id, team, r.full_name).length);
        if (free.length) add('next-qb', `${team}: ${q.n} is ${q.q} and no next quarterback is named, though ${free.map(r => r.full_name).join(', ')} ${free.length > 1 ? 'are' : 'is'} available`);
      }
    }
  }
  return { fails, listed, week, phase: st.phase };
}

module.exports = { check, loadSources };
