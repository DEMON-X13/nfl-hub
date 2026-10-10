/* Cases the tracker's rules and their checks must keep, each cut down from a week the real nflverse
   files produced or a review built from them: a few rows each, named and numbered as the real files
   have them. The smoke test runs every case (offline, in a few milliseconds); alone:

     node tools/cases.js            (from news/)

   Each case states the rule and, where a review found a version that broke it, also feeds the
   checks what that version produced, so the check is proved to catch it (a mutation test that
   stays in the gate):

     thursday-wednesday   the Wednesday before a Thursday game: nflverse has Tuesday's practice
                          report, no game statuses yet. Nobody has filed, so ESPN's Out and the
                          last-game rule speak: Mayfield and Winfield are not listed. The lineup a
                          "practice two days before kickoff counts as filed" shortcut built (both
                          listed) fails the checks.
     thursday-filed       Thursday morning, Wednesday's report with game statuses: the official
                          report wins both ways (Mayfield Out is out; Winfield Questionable and
                          practising is listed, tagged, over ESPN's Out; Parrish, out in week 4 and
                          off this week's filed report, is cleared though ESPN still says Out).
     espn-placeholder     ESPN's mid-week "Questionable" clears no one: out last game and not
                          practising is out (Hendrickson, Gonzalez, Elliss, Banks, DeVonta Smith).
     next-qb-none         NYJ: Geno Smith Questionable, the only other active quarterback (Klubnik)
                          Out: no next quarterback can be named, the row says so and the check passes
                          (a version of the check failed here and stopped the job for the week).
     next-qb-roster       the same with a third quarterback active but not on the chart: he is named
                          from the roster; a chart-only lineup that names nobody fails the check, and
                          so does one that names the Out Klubnik.
     stats-postseason     after week 18 the TeamRankings tables are asked for the day after the last
                          regular-season game; a table that takes in a wild card game matches no count
                          and is not published as if it did.
     season-phase         between playoff rounds the season is not "over"; after the Super Bowl it is.
     practice-notes       ESPN's practice notes read clause by clause, the latest practice day winning,
                          and dated by the weekday that goes with the practice, never the game's
                          ("non-participant for Friday's practice and is questionable for Sunday's game"
                          is Friday; a version read it as the Sunday before), nor on or before the team's
                          last game; a plan ("will be a full participant") and a game ("did not
                          participate in Friday's loss") are not practices.
     friday-rule5         NYJ on Friday night, before the team files: Geno Smith Questionable per ESPN,
                          whose Friday line says he did not practise, is out (the owner's rule: ESPN
                          Questionable and no practice on the last practice day) and Klubnik starts.
                          The lineup the Sunday-dated reading built (Smith listed) fails the checks.
     friday-back          Breece Hall, out in week 4 and not practising Thursday, back in full on
                          Friday per ESPN's Friday line: he is listed (a version passed him over).
     wednesday-no-rows    Wednesday night, NYJ with no week-5 rows yet (as every Sunday team then):
                          Hall in full on Wednesday per ESPN is listed and the checks pass (a version
                          of the check dated the note as old news and failed the week).
     espn-chart-names     ESPN names players as the chart does ("Olu Fashanu", "Kiko Mauigoa"), not as
                          the roster ("Olumuyiwa Fashanu", "Francisco Mauigoa"): the build and the
                          check find both through the same index and the checks pass (a version of
                          the check matched the roster's name only and failed the week).
     next-qb-espn         two Questionable quarterbacks on a Friday, the backup not practising per
                          ESPN: no next one can be named and the checks pass (a version of the check
                          had no ESPN-Questionable rule and failed the week); naming him fails.
     announced-starter    CHI on Friday night, the live run of 2026-10-10 02:43 UTC: ESPN's notes on Bagent
                          and on Keenum say Ben Johnson named Bagent the Week 5 starter, Williams is
                          Questionable and limited Friday. Bagent starts and Williams is passed over, "not
                          starting", his tag kept; so from Keenum's note alone (a teammate's), from Williams's
                          own, and from each accepted form. The lineup the build made without the rule
                          (Williams listed, Bagent next) fails the check (announced).
     announced-hedged     the same note hedged or conditional (will start if, unless, could, may, is in line
                          to start should, would, likely, if ... then, X or Y, either, an accepted form beside
                          could, would, may, might, likely or should, ESPN's own "has not yet confirmed the
                          plan", in his note or a teammate's): no change, Williams listed and tagged, Bagent
                          next.
     announced-dated      no change for a note from before CHI's week-4 game or on its day (ESPN's Oct 3 line
                          among them), one dated after kickoff, or one about week 6, the Falcons, next week or
                          a Thursday game.
     announced-out        Bagent named the starter but Out, or Doubtful, on the filed report: he stays out and
                          the chart decides (Williams, Questionable and practising, starts; Keenum next).
     announced-newest     Monday's note names Bagent, Friday's names Williams: Williams starts; two as new that
                          disagree name nobody.
     announced-elsewhere  no ESPN list, a list with nothing on CHI, a CHI note naming Green Bay's quarterback
                          (alone, or newer than Bagent's): CHI and GB keep what their own notes say; and on
                          CLE's real roster a running back's "Sanders will start" never names the quarterback
                          Shedeur Sanders (a last name alone is the note's own player).
     site-ranks           the narrative check catches the site's own ranks and lets third-party ones by. */
'use strict';
const { SEASON, seasonState, siteRankQuote } = require('./lib');
const { lineups, schedule, notePractice, espnIndex } = require('./context');
const LC = require('./lineup-checks');
const PW = require('./pull-week');

const Y = String(SEASON);
const game = (week, day, time, away, home, score) => ({ season: Y, game_type: 'REG', week: String(week), gameday: day, gametime: time,
  away_team: away, home_team: home, away_score: score ? String(score[0]) : '', home_score: score ? String(score[1]) : '' });
const player = (team, id, name, pos, status = 'ACT') => ({ season: Y, team, gsis_id: id, full_name: name, first_name: name.split(' ')[0],
  last_name: name.split(' ').slice(1).join(' '), football_name: name.split(' ')[0], position: pos === 'FS' || pos === 'SS' || /CB/.test(pos) ? 'DB' : pos, depth_chart_position: pos, status });
const injury = (week, team, id, name, pos, injuryName, status, practice) => ({ season: Y, season_type: 'REG', game_type: 'REG', team, week: String(week), gsis_id: id,
  position: pos, full_name: name, report_primary_injury: status ? injuryName : '', report_status: status || '', practice_primary_injury: injuryName,
  practice_status: { dnp: 'Did Not Participate In Practice', limited: 'Limited Participation in Practice', full: 'Full Participation in Practice' }[practice] || '' });
const chartRow = (dt, team, id, name, grp, slot, rank) => ({ dt, team, player_name: name, gsis_id: id, pos_grp: grp, pos_abb: slot, pos_rank: String(rank) });

/* lineups() for one fixture, and the U the page reads (what check() takes) */
function build(F) {
  const S = schedule(F.games, F.now);
  const teams = [...new Set(F.roster.map(r => r.team))];
  const LU = lineups({ roster: F.roster, injuries: F.injuries, chart: F.chart, espn: F.espn || null, player26: [], snaps26: [],
    week: S.week, kicks: S.kicks, lastGame: S.lastGame, opps: S.opps, teams, now: F.now, reportModified: F.reportModified });
  const U = {};
  for (const t of teams) {
    const L = LU.teams[t];
    U[t] = Object.fromEntries(['qb', 'ol', 'rb', 'rec', 'front', 'db'].map(u => [u, { who: L.L[u] || [], ...(L.out[u] ? { out: L.out[u] } : {}) }]));
    if (L.next) U[t].qb.next = L.next;
    if (L.nextNone) { U[t].qb.next = null; U[t].qb.next_none = L.nextNone; }
  }
  return { U, week: S.week, snap: { chart_names: LU.chartNames, kicks: S.kicks } };
}
/* the check, on the sources as the build's snapshot carries them (snap: its chart names and kickoffs) */
const checkOf = (F, U, week, snap = {}) => LC.check(U, { season: SEASON, week }, { games: F.games, injuries: F.injuries, roster: F.roster, espn: F.espn || null, report_modified: F.reportModified, ...snap });
const names = list => (list || []).map(p => p.n);
const failKeys = r => Object.keys(r.fails).sort().join(',') || 'none';
const clone = x => JSON.parse(JSON.stringify(x));

/* ---- TB at DAL, week 5 (Thursday October 8, 8:15pm ET) ---- */
const TB = {
  games: [game(4, '2026-10-04', '13:00', 'TB', 'SEA', [17, 24]), game(4, '2026-10-04', '16:25', 'DAL', 'NYG', [27, 20]), game(5, '2026-10-08', '20:15', 'TB', 'DAL')],
  roster: [player('TB', '00-0034855', 'Baker Mayfield', 'QB'), player('TB', '00-0041251', 'Jalon Daniels', 'QB'),
    player('TB', '00-0036411', 'Antoine Winfield Jr.', 'FS'), player('TB', '00-0039846', 'Tykee Smith', 'SS'), player('TB', '00-0037268', 'Zyon McCollum', 'LCB'),
    player('TB', '00-0040143', 'Jacob Parrish', 'NB'), player('TB', '00-0036993', 'Ifeatu Melifonwu', 'FS'),
    player('DAL', '00-0033077', 'Dak Prescott', 'QB')],
  chart: [chartRow('2026-10-06T14:08:49Z', 'TB', '00-0034855', 'Baker Mayfield', '3WR 1TE', 'QB', 1), chartRow('2026-10-06T14:08:49Z', 'TB', '00-0041251', 'Jalon Daniels', '3WR 1TE', 'QB', 2),
    chartRow('2026-10-06T14:08:49Z', 'TB', '00-0037268', 'Zyon McCollum', 'Base 3-4 D', 'LCB', 1), chartRow('2026-10-06T14:08:49Z', 'TB', '00-0039846', 'Tykee Smith', 'Base 3-4 D', 'SS', 1),
    chartRow('2026-10-06T14:08:49Z', 'TB', '00-0036411', 'Antoine Winfield Jr.', 'Base 3-4 D', 'FS', 1), chartRow('2026-10-06T14:08:49Z', 'TB', '00-0036993', 'Ifeatu Melifonwu', 'Base 3-4 D', 'FS', 2),
    chartRow('2026-10-06T14:08:49Z', 'TB', '00-0040143', 'Jacob Parrish', 'Base 3-4 D', 'NB', 1),
    chartRow('2026-10-06T14:08:49Z', 'DAL', '00-0033077', 'Dak Prescott', '3WR 1TE', 'QB', 1)],
  injuries: [injury(4, 'TB', '00-0034855', 'Baker Mayfield', 'QB', 'Thumb', 'Out', 'dnp'), injury(4, 'TB', '00-0036411', 'Antoine Winfield Jr.', 'S', 'Rib', 'Out', 'dnp'),
    injury(5, 'TB', '00-0034855', 'Baker Mayfield', 'QB', 'Thumb', '', 'dnp'), injury(5, 'TB', '00-0036411', 'Antoine Winfield Jr.', 'S', 'Rib', '', 'dnp')],
  espn: [{ team: 'TB', name: 'Baker Mayfield', pos: 'QB', status: 'Out', type: 'Thumb', comment: 'Mayfield (thumb) did not practice Tuesday.', long: '', date: '2026-10-07T18:02:00Z' },
    { team: 'TB', name: 'Antoine Winfield Jr.', pos: 'S', status: 'Out', type: 'Ribs', comment: 'Winfield (ribs) did not practice Tuesday.', long: '', date: '2026-10-07T18:02:00Z' }],
  reportModified: 'Wed, 07 Oct 2026 14:30:00 GMT',   // Tuesday's practice report, posted Wednesday morning
  now: '2026-10-07T21:30:00Z',
};

/* ---- NYJ, week 5 (Sunday October 11): Geno Smith Questionable, Cade Klubnik Out ---- */
const NYJ = {
  games: [game(4, '2026-10-04', '13:00', 'NYJ', 'MIA', [20, 23]), game(5, '2026-10-11', '13:00', 'NYJ', 'DEN')],
  roster: [player('NYJ', '00-0030565', 'Geno Smith', 'QB'), player('NYJ', '00-0041056', 'Cade Klubnik', 'QB'), player('NYJ', '00-0039152', 'Will Levis', 'QB', 'DEV'),
    player('DEN', '00-0039732', 'Bo Nix', 'QB')],
  chart: [chartRow('2026-10-09T14:00:00Z', 'NYJ', '00-0030565', 'Geno Smith', '3WR 1TE', 'QB', 1), chartRow('2026-10-09T14:00:00Z', 'NYJ', '00-0041056', 'Cade Klubnik', '3WR 1TE', 'QB', 2),
    chartRow('2026-10-09T14:00:00Z', 'DEN', '00-0039732', 'Bo Nix', '3WR 1TE', 'QB', 1)],
  injuries: [injury(5, 'NYJ', '00-0030565', 'Geno Smith', 'QB', 'Ankle', 'Questionable', 'limited'), injury(5, 'NYJ', '00-0041056', 'Cade Klubnik', 'QB', 'Knee', 'Out', 'dnp')],
  reportModified: 'Sat, 10 Oct 2026 14:30:00 GMT',
  now: '2026-10-10T20:00:00Z',
};

/* ---- CLE at NYJ, week 5 (Sunday October 11), on Friday night: the real roster, chart and Thursday report
   (Hall and Mauigoa out in week 4 and not practising Thursday), with Fashanu out and not practising as
   the review added him; ESPN's list is each case's own ---- */
const NYJ5 = {
  games: [game(4, '2026-10-04', '13:00', 'NYJ', 'CHI', [12, 23]), game(5, '2026-10-11', '13:00', 'CLE', 'NYJ')],
  roster: [player('NYJ', '00-0030565', 'Geno Smith', 'QB'), player('NYJ', '00-0041056', 'Cade Klubnik', 'QB'), player('NYJ', '00-0039152', 'Will Levis', 'QB', 'DEV'),
    player('NYJ', '00-0038120', 'Breece Hall', 'RB'), player('NYJ', '00-0039794', 'Braelon Allen', 'RB'),
    { ...player('NYJ', '00-0039790', 'Olumuyiwa Fashanu', 'T'), football_name: 'Olu' }, player('NYJ', '00-0040186', 'Francisco Mauigoa', 'ILB'),
    player('CLE', '00-0033537', 'Deshaun Watson', 'QB')],
  chart: [chartRow('2026-10-06T06:02:22Z', 'NYJ', '00-0030565', 'Geno Smith', '3WR 1TE', 'QB', 1), chartRow('2026-10-06T06:02:22Z', 'NYJ', '00-0041056', 'Cade Klubnik', '3WR 1TE', 'QB', 2),
    chartRow('2026-10-06T06:02:22Z', 'NYJ', '00-0038120', 'Breece Hall', '3WR 1TE', 'RB', 1), chartRow('2026-10-06T06:02:22Z', 'NYJ', '00-0039794', 'Braelon Allen', '3WR 1TE', 'RB', 2),
    chartRow('2026-10-06T06:02:22Z', 'NYJ', '00-0039790', 'Olu Fashanu', '3WR 1TE', 'LT', 1), chartRow('2026-10-06T06:02:22Z', 'NYJ', '00-0040186', 'Kiko Mauigoa', 'Base 4-3 D', 'SLB', 1),
    chartRow('2026-10-06T06:02:22Z', 'CLE', '00-0033537', 'Deshaun Watson', '3WR 1TE', 'QB', 1)],
  injuries: [injury(4, 'NYJ', '00-0038120', 'Breece Hall', 'RB', 'Quadricep', 'Out', 'dnp'), injury(4, 'NYJ', '00-0040186', 'Francisco Mauigoa', 'LB', 'Quadricep', 'Out', 'dnp'),
    injury(4, 'NYJ', '00-0039790', 'Olumuyiwa Fashanu', 'T', 'Knee', 'Out', 'dnp'),
    injury(5, 'NYJ', '00-0038120', 'Breece Hall', 'RB', 'Quadricep', '', 'dnp'), injury(5, 'NYJ', '00-0040186', 'Francisco Mauigoa', 'LB', 'Quadricep', '', 'dnp'),
    injury(5, 'NYJ', '00-0039790', 'Olumuyiwa Fashanu', 'T', 'Knee', '', 'dnp')],
  reportModified: 'Fri, 09 Oct 2026 14:19:06 GMT',   // Thursday's practice report, no game statuses for a Sunday team
  now: '2026-10-09T21:30:00Z',
};
const espnNote = (name, status, type, comment, date = '2026-10-09T20:00:00Z') => ({ team: 'NYJ', name, pos: '', status, type, comment, long: '', date });

/* ---- CHI at GB, week 5 (Sunday October 11), Friday night: the live run of 2026-10-10 02:43 UTC. The real roster,
   chart and Thursday report (Williams out in week 4, not practising Thursday, no game statuses for a Sunday team);
   ESPN's notes as the committed packs carry them. Bagent's and Keenum's appeared between the packs of October 5,
   15:04 and 20:04 UTC (week4-pack.md), and were still there on Friday night (week5-pack.md, with Williams's Friday
   line); ESPN's own dates are not in the packs, so each is dated within the hours it appeared ---- */
const CHI_DT = '2026-10-09T14:19:58Z';
const CHI5 = {
  games: [game(4, '2026-10-04', '13:00', 'NYJ', 'CHI', [12, 23]), game(4, '2026-10-04', '13:00', 'GB', 'TB', [17, 14]),
    game(5, '2026-10-11', '13:00', 'CHI', 'GB'), game(6, '2026-10-18', '13:00', 'CHI', 'ATL')],
  roster: [player('CHI', '00-0039918', 'Caleb Williams', 'QB'), player('CHI', '00-0038416', 'Tyson Bagent', 'QB'), { ...player('CHI', '00-0028986', 'Case Keenum', 'QB'), first_name: 'Casey' },
    player('CHI', '00-0041172', 'Miller Moss', 'QB', 'DEV'), player('CHI', '00-0035647', 'Montez Sweat', 'DE'),
    player('GB', '00-0036264', 'Jordan Love', 'QB'), player('GB', '00-0028118', 'Tyrod Taylor', 'QB')],
  chart: [chartRow(CHI_DT, 'CHI', '00-0039918', 'Caleb Williams', '3WR 1TE', 'QB', 1), chartRow(CHI_DT, 'CHI', '00-0038416', 'Tyson Bagent', '3WR 1TE', 'QB', 2),
    chartRow(CHI_DT, 'CHI', '00-0028986', 'Case Keenum', '3WR 1TE', 'QB', 3),
    chartRow(CHI_DT, 'GB', '00-0036264', 'Jordan Love', '3WR 1TE', 'QB', 1), chartRow(CHI_DT, 'GB', '00-0028118', 'Tyrod Taylor', '3WR 1TE', 'QB', 2)],
  injuries: [injury(4, 'CHI', '00-0039918', 'Caleb Williams', 'QB', 'Hamstring', 'Out', 'dnp'), injury(5, 'CHI', '00-0039918', 'Caleb Williams', 'QB', 'Hamstring', '', 'dnp')],
  reportModified: 'Fri, 09 Oct 2026 14:19:06 GMT',   // Thursday's practice report
  now: '2026-10-10T02:43:49Z',
};
const chiNote = (name, comment, date, status = 'Active', type = '', team = 'CHI') => ({ team, name, pos: '', status, type, comment, long: '', date });
const WILLIAMS_FRI = chiNote('Caleb Williams', "Williams (hamstring) was a limited practice participant Friday and is listed as questionable for Sunday's game at Green Bay.", '2026-10-09T21:10:00Z', 'Questionable', 'Hamstring');
const BAGENT = chiNote('Tyson Bagent', "Bears head coach Ben Johnson said that Bagent will start Sunday's game against the Packers in Green Bay, Sean Hammond of the Chicago Tribune reports.", '2026-10-05T18:00:00Z');
const KEENUM = chiNote('Case Keenum', "Keenum is expected to remain in a backup role for Sunday's game against the Packers after head coach Ben Johnson said that Tyson Bagent will start at quarterback in Week 5, Sean Hammond of the Chicago Tribune reports.", '2026-10-05T18:00:00Z');
/* the QB row as the build made it on the live run, before the rule: ESPN's notes contradict it */
const CHI_WAS = { who: [{ id: '00-0039918', n: 'Caleb Williams', pos: 'QB', q: 'questionable: hamstring' }], next: { id: '00-0038416', n: 'Tyson Bagent', pos: 'QB', from: 'chart' } };
const qbRow = q => `who ${names(q.who)}${q.who[0] && q.who[0].q ? ` (${q.who[0].q})` : ''}; out ${(q.out || []).map(p => `${p.n}: ${p.why}`).join('; ') || 'nobody'}; next ${q.next ? q.next.n : q.next_none || 'none'}`;
const unchanged = q => names(q.who).join() === 'Caleb Williams' && /^questionable: hamstring/.test(q.who[0].q || '') && !!q.next && q.next.n === 'Tyson Bagent' && !(q.out || []).some(p => /named the starter/.test(p.why));

function cases() {
  const out = [];
  const add = (name, label, ok, detail) => out.push({ name, label, ok: !!ok, detail });

  { // thursday-wednesday
    const { U, week } = build(TB), r = checkOf(TB, U, week);
    add('thursday-wednesday', 'no TB team is filed on a practice report: Mayfield and Winfield are passed over',
      !names(U.TB.qb.who).includes('Baker Mayfield') && !names(U.TB.db.who).includes('Antoine Winfield Jr.') && /per ESPN/.test((U.TB.qb.out || [])[0] && U.TB.qb.out[0].why),
      `qb ${names(U.TB.qb.who)}; db ${names(U.TB.db.who)}; out ${(U.TB.qb.out || []).map(p => p.n + ': ' + p.why)}`);
    add('thursday-wednesday', 'the checks pass on that lineup', failKeys(r) === 'none', failKeys(r));
    const old = clone(U);
    old.TB.qb.who = [{ id: '00-0034855', n: 'Baker Mayfield', pos: 'QB' }]; delete old.TB.qb.out;
    old.TB.db.who = [{ id: '00-0037268', n: 'Zyon McCollum', pos: 'LCB' }, { id: '00-0039846', n: 'Tykee Smith', pos: 'SS' }, { id: '00-0036411', n: 'Antoine Winfield Jr.', pos: 'FS' }];
    const rm = checkOf(TB, old, week);
    add('thursday-wednesday', "the practice-report shortcut's lineup (both listed) fails the checks", (rm.fails.espn || []).length === 2 && (rm.fails['last-game'] || []).length === 2, failKeys(rm));
  }
  { // thursday-filed
    const F = { ...TB, reportModified: 'Thu, 08 Oct 2026 14:30:00 GMT', now: '2026-10-08T15:00:00Z',
      espn: [...TB.espn, { team: 'TB', name: 'Jacob Parrish', pos: 'CB', status: 'Out', type: 'Hamstring', comment: 'Parrish (hamstring) is out.', long: '', date: '2026-10-02T18:00:00Z' }],
      injuries: [...TB.injuries.filter(r => r.week === '4'), injury(4, 'TB', '00-0040143', 'Jacob Parrish', 'CB', 'Hamstring', 'Out', 'dnp'),
        injury(5, 'TB', '00-0034855', 'Baker Mayfield', 'QB', 'Thumb', 'Out', 'dnp'), injury(5, 'TB', '00-0036411', 'Antoine Winfield Jr.', 'S', 'Rib', 'Questionable', 'limited')] };
    const { U, week } = build(F), r = checkOf(F, U, week), w = (U.TB.db.who || []).find(p => p.n === 'Antoine Winfield Jr.');
    add('thursday-filed', "the filed report wins: Mayfield Out is out, Winfield Questionable and practising is listed and tagged, Parrish (off it) is cleared over ESPN's stale Out",
      !names(U.TB.qb.who).includes('Baker Mayfield') && w && /^questionable/.test(w.q || '') && !names(U.TB.db.out).includes('Jacob Parrish'),
      `qb ${names(U.TB.qb.who)}; Winfield ${w ? w.q : 'not listed'}; db passed over: ${(U.TB.db.out || []).map(p => p.n + ', ' + p.why).join('; ') || 'nobody'}`);
    add('thursday-filed', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
  }
  { // espn-placeholder
    const F = { ...TB, espn: TB.espn.map(e => e.name === 'Antoine Winfield Jr.' ? { ...e, status: 'Questionable', comment: 'questionable' } : e) };
    const { U, week } = build(F), r = checkOf(F, U, week), out = (U.TB.db.out || []).find(p => p.n === 'Antoine Winfield Jr.');
    add('espn-placeholder', "ESPN's mid-week Questionable clears no one: out last game and not practising is out",
      !names(U.TB.db.who).includes('Antoine Winfield Jr.') && out && /out in week 4/.test(out.why), out ? out.why : `listed: ${names(U.TB.db.who)}`);
    add('espn-placeholder', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
  }
  { // next-qb-none
    const { U, week } = build(NYJ), r = checkOf(NYJ, U, week), q = U.NYJ.qb;
    add('next-qb-none', 'no other quarterback can play: none is named and the row says why',
      names(q.who).join() === 'Geno Smith' && /^questionable/.test(q.who[0].q || '') && q.next === null && /Cade Klubnik/.test(q.next_none || ''), q.next_none || JSON.stringify(q.next));
    add('next-qb-none', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
  }
  { // next-qb-roster
    const F = { ...NYJ, roster: NYJ.roster.map(p => p.full_name === 'Will Levis' ? { ...p, status: 'ACT' } : p) };
    const { U, week } = build(F), r = checkOf(F, U, week), q = U.NYJ.qb;
    add('next-qb-roster', 'a backup off the chart is named from the roster', q.next && q.next.n === 'Will Levis' && q.next.from === 'roster', JSON.stringify(q.next));
    add('next-qb-roster', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
    const chartOnly = clone(U); delete chartOnly.NYJ.qb.next; delete chartOnly.NYJ.qb.next_none;
    const r1 = checkOf(F, chartOnly, week);
    add('next-qb-roster', 'a chart-only lineup that names nobody fails the check', (r1.fails['next-qb'] || []).some(m => /Will Levis is available/.test(m)), failKeys(r1));
    const wrong = clone(U); wrong.NYJ.qb.next = { id: '00-0041056', n: 'Cade Klubnik', pos: 'QB', from: 'chart' };
    const r2 = checkOf(F, wrong, week);
    add('next-qb-roster', 'naming the Out Klubnik as next fails the check', (r2.fails['next-qb'] || []).some(m => /Cade Klubnik, is out/.test(m)), failKeys(r2));
  }
  { // stats-postseason
    const reg = [game(1, '2026-09-13', '13:00', 'MIA', 'BUF', [10, 20]), game(2, '2026-09-20', '13:00', 'BUF', 'NYJ', [30, 20]), game(18, '2027-01-10', '13:00', 'NE', 'BUF', [15, 25])];
    const wc = { ...game(19, '2027-01-17', '16:30', 'KC', 'BUF', [20, 27]), game_type: 'WC' };
    const d1 = PW.statsDate([...reg, wc], '2027-01-18'), d2 = PW.statsDate([...reg.slice(0, 2), game(18, '2027-01-10', '13:00', 'NE', 'BUF')], '2026-10-09');
    add('stats-postseason', 'after week 18 TeamRankings is asked for the day after the last regular-season game, in season for today',
      d1.date === '2027-01-11' && d1.phase === 'postseason' && d2.date === '2026-10-09', `${d1.date} (${d1.phase}), ${d2.date} (${d2.phase})`);
    const res = { out: { 'wk1:MIA-BUF': [10, 20], 'wk2:BUF-NYJ': [30, 20], 'wk18:NE-BUF': [15, 25] }, kickOf: { 'wk1:MIA-BUF': '2026-09-13T17:00:00Z', 'wk2:BUF-NYJ': '2026-09-20T17:00:00Z', 'wk18:NE-BUF': '2027-01-10T18:00:00Z' } };
    const regOnly = PW.gamesCovered('BUF', { ppg: 25, pa: 15 }, res), withWc = PW.gamesCovered('BUF', { ppg: 25.5, pa: 16.3 }, res);
    add('stats-postseason', "a table of the regular season matches 3 games; one with the wild card in it matches none and claims none",
      regOnly.checked && regOnly.g === 3 && !withWc.checked && withWc.g == null, `${JSON.stringify(regOnly)} / ${JSON.stringify(withWc)}`);
    const out = { BUF: { ppg: 25.5, pa: 16.3, ypp: 5.5 }, NYJ: { ppg: 20, pa: 30, ypp: 5 } };
    const resN = { out: { ...res.out }, kickOf: { ...res.kickOf } };
    const kept = PW.verifyCounts(out, ['BUF', 'NYJ'], resN, { BUF: { ppg: 25, pa: 15, ypp: 5.4, g: 3 } }), none = PW.verifyCounts(out, ['BUF', 'NYJ'], resN, null);
    add('stats-postseason', 'an unmatched team keeps its last verified line, or goes out without a count',
      kept.carried.join() === 'BUF' && kept.T.BUF.g === 3 && kept.T.BUF.ppg === 25 && kept.T.NYJ.g === 1 && none.uncounted.join() === 'BUF' && none.T.BUF.g === undefined,
      `carried ${kept.carried}, uncounted ${none.uncounted}`);
  }
  { // season-phase
    const reg = [game(18, '2027-01-10', '13:00', 'NE', 'BUF', [15, 25])];
    const wc = { ...game(19, '2027-01-17', '16:30', 'KC', 'BUF', [20, 27]), game_type: 'WC' }, sbOpen = { ...game(22, '2027-02-14', '18:30', 'BUF', 'SF'), game_type: 'SB' };
    const between = seasonState([...reg, wc]).phase, waiting = seasonState([...reg, wc, sbOpen]).phase, over = seasonState([...reg, wc, { ...sbOpen, away_score: '24', home_score: '20' }]).phase;
    add('season-phase', 'between rounds and before the Super Bowl it is the postseason; after it, over', between === 'postseason' && waiting === 'postseason' && over === 'over', `${between}, ${waiting}, ${over}`);
  }
  { // practice-notes
    const n1 = notePractice("didn't practice Wednesday but returned limited Thursday", '2026-10-09'), n2 = notePractice('Smith was limited Wednesday after missing practice Tuesday.', '2026-10-08');
    const n3 = notePractice('Gonzalez (shoulder) did not participate in practice Thursday.', '2026-10-09'), n4 = notePractice('He returned to the lineup but was limited in snaps.', '2026-10-09');
    add('practice-notes', 'the latest practice day in a note wins, clause by clause',
      n1 && n1.st === 'limited' && n1.day === '2026-10-08' && n2 && n2.st === 'limited' && n2.day === '2026-10-07' && n3 && n3.st === 'dnp' && n3.day === '2026-10-08' && n4 === null,
      [n1, n2, n3, n4].map(x => JSON.stringify(x)).join(' '));
    /* ESPN's own lines from the committed packs, each read after the team's week 4 game (Sunday October 4);
       ESPN dates a note by its last update, which can be game day */
    const since = '2026-10-04', R = [
      ["Allen (groin) was listed as a non-participant for Friday's practice and is questionable for Sunday's game against the Commanders, Nathan Brown of The Indianapolis Star reports.", '2026-10-11', 'dnp', '2026-10-09'],
      ["Hall (quadricep) was a full participant in Wednesday's practice and is expected to play Sunday against the Broncos.", '2026-10-11', 'full', '2026-10-07'],
      ['Coach Aaron Glenn said Friday that Smith (ankle) did not practice Thursday.', '2026-10-09', 'dnp', '2026-10-08'],
      ["Allen (groin) was listed as a non-participant for Friday's practice and is questionable for Sunday's game against the Commanders, Nathan Brown of The Indianapolis Star reports.", '2026-10-09', 'dnp', '2026-10-09'],
      ["Maye (shoulder) was a full participant in Friday's practice and does not have an injury designation for Sunday's game against Buffalo.", '2026-10-10', 'full', '2026-10-09'],
      ["Hall (quadricep) was a full participant in Wednesday's practice and is expected to play Sunday against the Broncos.", '2026-10-07', 'full', '2026-10-07'],
      ["Shipley (foot) was a limited participant in Saturday's practice but does not carry an injury designation into Monday's game against the Bears.", '2026-10-10', 'limited', '2026-10-10'],
      ["Dallas (toe) practiced fully Friday and doesn't have a designation for Sunday's game in Tampa Bay.", '2026-10-09', 'full', '2026-10-09'],
      ["Darrisaw (concussion) didn't practice Wednesday or Thursday.", '2026-10-08', 'dnp', '2026-10-08'],
      ["McLaurin (hamstring) wasn't present for warmups Thursday after missing Wednesday's practice, Tashan Reed of The Washington Post reports.", '2026-10-08', 'dnp', '2026-10-08'],
    ].map(([t, d, st, day]) => ({ t, want: `${st} ${day}`, got: (x => x ? `${x.st} ${x.day}` : 'none')(notePractice(t, d, since)) }));
    /* off a bye (last game September 27) a game's weekday can fall after the last game: still not a practice */
    R.push(...[["Evans (hamstring) was limited at practice and is expected to play Thursday against the Cowboys.", '2026-10-07', 'limited', '2026-10-07']]
      .map(([t, d, st, day]) => ({ t, want: `${st} ${day}`, got: (x => x ? `${x.st} ${x.day}` : 'none')(notePractice(t, d, '2026-09-27')) })));
    const bad = R.filter(x => x.got !== x.want);
    add('practice-notes', "a weekday that names the game is not the practice's day: ESPN's Friday line is Friday, not the Sunday before",
      !bad.length, bad.map(x => `${x.got} for "${x.t.slice(0, 60)}...", want ${x.want}`).join('; ') || `${R.length} notes`);
    const none = [["Smith (ankle) did not practice Friday.", '2026-10-05'], ["Pollard (ankle) will be a full participant in Friday's practice, Jim Wyatt of the Titans' official site reports.", '2026-10-09'],
      ["Boerkircher did not participate in Friday's 34-17 preseason loss to Carolina.", '2026-10-10']].filter(([t, d]) => notePractice(t, d, since) !== null);
    add('practice-notes', "no practice this week: one on or before the last game, a plan, a game",
      !none.length, none.map(([t]) => t).join(' | ') || 'none read');
  }
  { // friday-rule5
    const F = { ...NYJ5, espn: [espnNote('Geno Smith', 'Questionable', 'Ankle', "Smith (ankle) was listed as a non-participant for Friday's practice and is questionable for Sunday's game against the Browns.")] };
    const { U, week, snap } = build(F), r = checkOf(F, U, week, snap), out = (U.NYJ.qb.out || []).find(p => p.n === 'Geno Smith');
    add('friday-rule5', "ESPN Questionable and no practice on Friday per ESPN's Friday line is out: Klubnik starts",
      names(U.NYJ.qb.who).join() === 'Cade Klubnik' && out && /not practising Friday, per ESPN/.test(out.why), `qb ${names(U.NYJ.qb.who)}; ${out ? out.why : 'Smith not passed over'}`);
    add('friday-rule5', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
    const old = clone(U);
    old.NYJ.qb = { who: [{ id: '00-0030565', n: 'Geno Smith', pos: 'QB', q: 'questionable: ankle' }], next: { id: '00-0041056', n: 'Cade Klubnik', pos: 'QB', from: 'chart' } };
    const rm = checkOf(F, old, week, snap);
    add('friday-rule5', "the lineup the Sunday-dated reading built (Smith listed) fails the checks", (rm.fails['espn-q-dnp'] || []).some(m => /Geno Smith/.test(m)), failKeys(rm));
  }
  { // friday-back
    const F = { ...NYJ5, espn: [espnNote('Breece Hall', 'Active', '', "Hall (quadricep) was a full participant in Friday's practice and doesn't have an injury designation for Sunday's game against the Browns.")] };
    const { U, week, snap } = build(F), r = checkOf(F, U, week, snap);
    add('friday-back', 'out last game, no practice Thursday, in full Friday per ESPN: listed', names(U.NYJ.rb.who).includes('Breece Hall'),
      `rb ${names(U.NYJ.rb.who)}; passed over: ${(U.NYJ.rb.out || []).map(p => p.n + ', ' + p.why).join('; ') || 'nobody'}`);
    add('friday-back', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
  }
  { // wednesday-no-rows
    const F = { ...NYJ5, injuries: NYJ5.injuries.filter(r => r.week === '4'), reportModified: 'Wed, 07 Oct 2026 14:30:00 GMT', now: '2026-10-07T21:30:00Z',
      espn: [espnNote('Breece Hall', 'Questionable', 'Quadricep', "Hall (quadricep) was a full participant in Wednesday's practice and is expected to play Sunday against the Broncos.", '2026-10-07T20:00:00Z')] };
    const { U, week, snap } = build(F), r = checkOf(F, U, week, snap);
    add('wednesday-no-rows', "no report rows yet: ESPN's Wednesday note clears Hall", names(U.NYJ.rb.who).includes('Breece Hall'), `rb ${names(U.NYJ.rb.who)}`);
    add('wednesday-no-rows', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
    /* Thursday night, the report holding Wednesday's practice but still no NYJ rows: a note of that same
       Wednesday is all there is for him, so it counts though it is no newer than the report */
    const G = { ...F, reportModified: 'Thu, 08 Oct 2026 14:30:00 GMT', now: '2026-10-08T21:30:00Z' };
    const g = build(G), rg = checkOf(G, g.U, g.week, g.snap);
    add('wednesday-no-rows', "a day later, the team still not on the report: the same note clears him and the checks pass",
      names(g.U.NYJ.rb.who).includes('Breece Hall') && failKeys(rg) === 'none', `rb ${names(g.U.NYJ.rb.who)}; ${failKeys(rg)}`);
  }
  { // espn-chart-names
    const F = { ...NYJ5, espn: [espnNote('Olu Fashanu', 'Questionable', 'Knee', 'Fashanu (knee) was a full participant in practice Friday.'),
      espnNote('Kiko Mauigoa', 'Questionable', 'Quadricep', "Mauigoa (quadricep) was a full participant in Friday's practice.")] };
    const { U, week, snap } = build(F), r = checkOf(F, U, week, snap);
    add('espn-chart-names', "ESPN's chart-name notes clear Fashanu and Mauigoa in the build",
      names(U.NYJ.ol.who).includes('Olumuyiwa Fashanu') && names(U.NYJ.front.who).includes('Francisco Mauigoa'), `ol ${names(U.NYJ.ol.who)}; front ${names(U.NYJ.front.who)}`);
    add('espn-chart-names', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
    const withChart = espnIndex(F.espn, F.roster, snap.chart_names), rosterOnly = espnIndex(F.espn, F.roster, []);
    add('espn-chart-names', "the index finds Fashanu by his football name and Mauigoa only through the chart",
      withChart('00-0039790', 'NYJ', 'Olumuyiwa Fashanu') && withChart('00-0040186', 'NYJ', 'Francisco Mauigoa') && rosterOnly('00-0039790', 'NYJ', 'Olumuyiwa Fashanu') && !rosterOnly('00-0040186', 'NYJ', 'Francisco Mauigoa'),
      `chart names: ${snap.chart_names.length}`);
  }
  { // next-qb-espn
    const F = { ...NYJ5, espn: [espnNote('Geno Smith', 'Questionable', 'Ankle', 'Smith (ankle) was limited at practice Friday.'), espnNote('Cade Klubnik', 'Questionable', 'Knee', 'Klubnik (knee) did not practice Friday.')] };
    const { U, week, snap } = build(F), r = checkOf(F, U, week, snap), q = U.NYJ.qb;
    add('next-qb-espn', 'Smith listed and tagged; Klubnik, Questionable and not practising Friday per ESPN, cannot be next and the row says so',
      names(q.who).join() === 'Geno Smith' && /^questionable/.test(q.who[0].q || '') && q.next === null && /Cade Klubnik is questionable \(knee\) and not practising Friday, per ESPN/.test(q.next_none || ''),
      q.next_none || JSON.stringify(q.next));
    add('next-qb-espn', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
    const wrong = clone(U); wrong.NYJ.qb.next = { id: '00-0041056', n: 'Cade Klubnik', pos: 'QB', from: 'chart' }; delete wrong.NYJ.qb.next_none;
    const rw = checkOf(F, wrong, week, snap);
    add('next-qb-espn', 'naming Klubnik as next fails the check', (rw.fails['next-qb'] || []).some(m => /Cade Klubnik, is questionable on ESPN's list/.test(m)), failKeys(rw));
  }
  { // announced-starter
    const F = { ...CHI5, espn: [WILLIAMS_FRI, BAGENT, { ...KEENUM, date: '2026-10-06T16:00:00Z' }] };
    const { U, week, snap } = build(F), r = checkOf(F, U, week, snap), q = U.CHI.qb, w = (q.out || []).find(p => p.n === 'Caleb Williams');
    add('announced-starter', "ESPN's notes name Bagent the Week 5 starter: he starts, Williams is passed over, not starting, with his tag",
      names(q.who).join() === 'Tyson Bagent' && w && w.why === 'not starting (questionable: hamstring): Tyson Bagent named the starter, per ESPN' && !q.next && !q.next_none, qbRow(q));
    add('announced-starter', 'the checks pass on it', failKeys(r) === 'none', failKeys(r));
    const old = clone(U); old.CHI.qb = clone(CHI_WAS);
    const rm = checkOf(F, old, week, snap);
    add('announced-starter', 'the lineup the build made without the rule (Williams listed, Bagent next) fails the check',
      (rm.fails.announced || []).some(m => /^CHI: .*names Tyson Bagent the starter.*lists Caleb Williams$/.test(m)), (rm.fails.announced || []).join(' | ') || failKeys(rm));
    /* each accepted form alone, in Bagent's own note, a teammate's or Williams's own */
    const FORMS = [KEENUM, { ...WILLIAMS_FRI, comment: "Williams (hamstring) was a limited practice participant Friday, but head coach Ben Johnson said Tyson Bagent will start Sunday's game against the Packers." },
      'Johnson named Bagent the starter for Week 5.', 'Johnson named Bagent the Week 5 starter.', "Bagent has been named the starter for Sunday's game against the Packers.",
      "Bagent was named the team's starting quarterback for Sunday's game in Green Bay.", 'Bagent will make the start Sunday against the Packers.',
      'Bagent will make his second straight start Sunday.', 'Bagent will get the start Sunday at Lambeau Field.', 'Bagent will draw the start against Green Bay.',
      "Bagent will be the Bears' starting quarterback Sunday.", 'Bagent will be under center Sunday against the Packers.',
      "Johnson announced Friday that Bagent is expected to start Sunday's game against the Packers.", 'Bagent is set to start Sunday against the Packers.',
      'Bagent has cleared the concussion protocol and will start Sunday.', "Head coach Ben Johnson confirmed Friday that Bagent (thumb) will start Sunday's game against the Packers.",
      'Ben Johnson said Friday he will start Bagent on Sunday.', "Johnson provided an update Friday, saying Bagent will start Sunday's game against the Packers."];
    const bad = FORMS.map(x => {
      const n = typeof x === 'string' ? { ...BAGENT, comment: x, date: '2026-10-09T18:00:00Z' } : x;
      const G = { ...CHI5, espn: n.name === 'Caleb Williams' ? [n] : [WILLIAMS_FRI, n] }, g = build(G), rg = checkOf(G, g.U, g.week, g.snap);
      return names(g.U.CHI.qb.who).join() === 'Tyson Bagent' && failKeys(rg) === 'none' ? null : `${n.name}: "${n.comment.slice(0, 60)}" -> ${names(g.U.CHI.qb.who)} ${failKeys(rg)}`;
    }).filter(Boolean);
    add('announced-starter', `each accepted form names Bagent, in his own note, Keenum's or Williams's (${FORMS.length})`, !bad.length, bad.join(' | '));
  }
  { // announced-hedged
    const HEDGED = ["Bears head coach Ben Johnson said that Bagent will start Sunday's game against the Packers if Caleb Williams (hamstring) is unable to play.",
      "Bagent will start Sunday's game against the Packers unless Caleb Williams (hamstring) is cleared to return.",
      "Bagent could start Sunday's game against the Packers in Green Bay.", "Bagent may start Sunday's game against the Packers in Green Bay.",
      "Bagent is in line to start Sunday's game against the Packers should Caleb Williams (hamstring) be unable to play.",
      "Bears head coach Ben Johnson said that Bagent would start Sunday's game against the Packers.", "Bagent is likely to start Sunday's game against the Packers.",
      "Bagent is expected to start Sunday's game against the Packers if Williams (hamstring) cannot go.",
      "If Caleb Williams (hamstring) cannot play, then Bagent will start Sunday's game against the Packers.",
      "Bagent or Keenum will start Sunday's game against the Packers.",
      // an accepted form beside a hedge: the sentence is not plain, so it does not count
      "Bagent is expected to start Sunday's game against the Packers, though Caleb Williams (hamstring) could still be cleared.",
      "Bagent will start Sunday's game against the Packers, Johnson said, though he would not rule out Caleb Williams (hamstring).",
      "Bagent is set to start Sunday's game against the Packers, but Caleb Williams (hamstring) may yet be cleared to play.",
      "Bagent will start Sunday's game against the Packers, though Johnson said Caleb Williams (hamstring) might be ready.",
      "Bagent is expected to start Sunday's game against the Packers, with Caleb Williams (hamstring) likely sidelined.",
      "Bagent is expected to start Sunday's game against the Packers should Caleb Williams (hamstring) be held out.",
      // ESPN's Oct 3 line with this week's opponent and date, so only its second sentence can stop it
      'Bagent is expected to start Sunday versus the Packers after getting most of the first-team reps in practice, Ian Rapoport of NFL Network reports. However, coach Ben Johnson has not yet confirmed the plan.',
      "Johnson said he has not decided whether Bagent will start Sunday's game against the Packers."];
    const notes = [...HEDGED.map(t => ({ ...BAGENT, comment: t, date: '2026-10-09T18:00:00Z' })),
      { ...KEENUM, comment: "Keenum is expected to remain in a backup role for Sunday's game against the Packers, and Tyson Bagent will start if Caleb Williams (hamstring) cannot play.", date: '2026-10-09T18:00:00Z' },
      { ...KEENUM, comment: "Johnson said either Bagent or Keenum will start Sunday's game against the Packers.", date: '2026-10-09T18:00:00Z' }];
    const bad = notes.map(n => {
      const G = { ...CHI5, espn: [WILLIAMS_FRI, n] }, g = build(G), rg = checkOf(G, g.U, g.week, g.snap);
      return unchanged(g.U.CHI.qb) && failKeys(rg) === 'none' ? null : `"${n.comment.slice(0, 70)}" -> ${qbRow(g.U.CHI.qb)}; ${failKeys(rg)}`;
    }).filter(Boolean);
    add('announced-hedged', `a hedged or conditional note changes nothing: Williams listed and tagged, Bagent next (${notes.length})`, !bad.length, bad.join(' | '));
  }
  { // announced-dated
    const said = 'Bears head coach Ben Johnson said that Bagent will start Sunday.';
    const DATED = [[said, '2026-10-02T20:00:00Z', 'before the week-4 game'], [said, '2026-10-04T23:30:00Z', "on the week-4 game's day"],
      ['Bagent is expected to start Sunday versus the Jets after getting most of the first-team reps in practice, Ian Rapoport of NFL Network reports. However, coach Ben Johnson has not yet confirmed the plan.', '2026-10-03T15:00:00Z', "ESPN's Oct 3 line"],
      [said, '2026-10-11T20:30:00Z', 'after kickoff'],
      ['Bears head coach Ben Johnson said that Bagent will start in Week 6.', '2026-10-09T18:00:00Z', 'week 6'],
      ['Bears head coach Ben Johnson said that Bagent will start against the Falcons.', '2026-10-09T18:00:00Z', "week 6's opponent"],
      ['Bears head coach Ben Johnson said that Bagent will start next week.', '2026-10-09T18:00:00Z', 'next week'],
      ["Bears head coach Ben Johnson said that Bagent will start Thursday night's game.", '2026-10-09T18:00:00Z', 'a Thursday game']];
    const bad = DATED.map(([t, date, what]) => {
      const G = { ...CHI5, espn: [WILLIAMS_FRI, { ...BAGENT, comment: t, date }] }, g = build(G), rg = checkOf(G, g.U, g.week, g.snap);
      return unchanged(g.U.CHI.qb) && failKeys(rg) === 'none' ? null : `${what}: ${qbRow(g.U.CHI.qb)}; ${failKeys(rg)}`;
    }).filter(Boolean);
    add('announced-dated', `a note about another game changes nothing: ${DATED.map(x => x[2]).join(', ')}`, !bad.length, bad.join(' | '));
  }
  { // announced-out
    const bad = ['Out', 'Doubtful'].map(st => {
      const F = { ...CHI5, reportModified: 'Sat, 10 Oct 2026 14:30:00 GMT', now: '2026-10-10T20:00:00Z', espn: [WILLIAMS_FRI, BAGENT, KEENUM],
        injuries: [...CHI5.injuries.filter(r => r.week === '4'), injury(5, 'CHI', '00-0039918', 'Caleb Williams', 'QB', 'Hamstring', 'Questionable', 'limited'),
          injury(5, 'CHI', '00-0038416', 'Tyson Bagent', 'QB', 'Concussion', st, 'dnp')] };
      const { U, week, snap } = build(F), r = checkOf(F, U, week, snap), q = U.CHI.qb;
      return names(q.who).join() === 'Caleb Williams' && /^questionable/.test(q.who[0].q || '') && q.next && q.next.n === 'Case Keenum' && failKeys(r) === 'none'
        ? null : `${st}: ${qbRow(q)}; ${failKeys(r)}`;
    }).filter(Boolean);
    add('announced-out', 'named the starter but Out or Doubtful on the filed report: Bagent stays out, Williams starts, Keenum next, the checks pass', !bad.length, bad.join(' | '));
  }
  { // announced-newest
    const back = { ...WILLIAMS_FRI, comment: "Williams (hamstring) was a full participant in Friday's practice, and head coach Ben Johnson said Williams will start Sunday's game against the Packers." };
    const F = { ...CHI5, espn: [BAGENT, back] }, { U, week, snap } = build(F), r = checkOf(F, U, week, snap), q = U.CHI.qb;
    add('announced-newest', "Monday's note names Bagent, Friday's names Williams: the newest wins, Williams starts and nobody is passed over",
      names(q.who).join() === 'Caleb Williams' && !(q.out || []).length && failKeys(r) === 'none', `${qbRow(q)}; ${failKeys(r)}`);
    const G = { ...CHI5, espn: [WILLIAMS_FRI, BAGENT, { ...KEENUM, comment: "Keenum is expected to remain in a backup role after head coach Ben Johnson said that Caleb Williams will start Sunday's game against the Packers." }] };
    const g = build(G), rg = checkOf(G, g.U, g.week, g.snap);
    add('announced-newest', 'two notes as new that disagree name nobody: no change', unchanged(g.U.CHI.qb) && failKeys(rg) === 'none', `${qbRow(g.U.CHI.qb)}; ${failKeys(rg)}`);
  }
  { // announced-elsewhere
    /* Saturday: Friday's report has Williams limited, so with no word from ESPN he is listed, untagged */
    const base = { ...CHI5, reportModified: 'Sat, 10 Oct 2026 14:30:00 GMT', now: '2026-10-10T20:00:00Z',
      injuries: [...CHI5.injuries.filter(r => r.week === '4'), injury(5, 'CHI', '00-0039918', 'Caleb Williams', 'QB', 'Hamstring', '', 'limited')] };
    const vanNess = chiNote('Lukas Van Ness', "Van Ness (shoulder) does not have an injury designation for Sunday's game against the Bears. Bears head coach Ben Johnson said that Tyson Bagent will start Sunday's game against the Packers.", '2026-10-09T18:00:00Z', 'Active', '', 'GB');
    const sweat = chiNote('Montez Sweat', "Sweat (knee) was a full participant in Friday's practice. Packers head coach Matt LaFleur said that Tyrod Taylor will start Sunday's game against the Bears.", '2026-10-09T22:00:00Z');
    const R = [['no ESPN list', null, 'Caleb Williams'], ["ESPN's notes on GB only, one naming Bagent", [vanNess], 'Caleb Williams'],
      ["a CHI note naming GB's Taylor, nothing else", [sweat], 'Caleb Williams'], ["a CHI note naming GB's Taylor, newer than Bagent's and Keenum's", [BAGENT, KEENUM, sweat], 'Tyson Bagent']]
      .map(([what, espn, want]) => {
        const G = { ...base, espn }, g = build(G), rg = checkOf(G, g.U, g.week, g.snap);
        const ok = names(g.U.CHI.qb.who).join() === want && names(g.U.GB.qb.who).join() === 'Jordan Love' && !(g.U.GB.qb.out || []).length && failKeys(rg) === 'none';
        return ok ? null : `${what}: CHI ${qbRow(g.U.CHI.qb)}; GB ${qbRow(g.U.GB.qb)}; ${failKeys(rg)}`;
      }).filter(Boolean);
    add('announced-elsewhere', "no list, another team's notes, another team's quarterback: CHI keeps its own reading, GB keeps Love", !R.length, R.join(' | '));
    /* CLE's real roster has a running back and a quarterback named Sanders: a last name alone is the note's own
       player, so the back's note never makes Shedeur Sanders the starter over Watson */
    const H = { ...NYJ5, games: [...NYJ5.games, game(4, '2026-10-01', '20:15', 'PIT', 'CLE', [24, 27])],
      roster: [...NYJ5.roster, player('CLE', '00-0040668', 'Shedeur Sanders', 'QB'), player('CLE', '00-0040466', 'Raheim Sanders', 'RB')],
      chart: [...NYJ5.chart, chartRow('2026-10-06T06:02:22Z', 'CLE', '00-0040668', 'Shedeur Sanders', '3WR 1TE', 'QB', 2)],
      espn: [{ team: 'CLE', name: 'Raheim Sanders', pos: 'RB', status: 'Active', type: '', comment: 'Sanders will start Sunday against the Jets with Quinshon Judkins (personal) ruled out, Zac Jackson reports.', long: '', date: '2026-10-09T18:00:00Z' }] };
    const SAN = [H, { ...H, espn: [{ ...H.espn[0], name: 'Shedeur Sanders', pos: 'QB',
      comment: 'Sanders was a full participant Friday, and the Browns announced that Raheim Sanders will start at running back Sunday against the Jets.' }] }].map(G => {
      const h = build(G), rh = checkOf(G, h.U, h.week, h.snap);
      return names(h.U.CLE.qb.who).join() === 'Deshaun Watson' && !(h.U.CLE.qb.out || []).length && failKeys(rh) === 'none' ? null : `${G.espn[0].name}'s note: ${qbRow(h.U.CLE.qb)}; ${failKeys(rh)}`;
    }).filter(Boolean);
    add('announced-elsewhere', 'the running back Raheim Sanders "will start", in his note or in Shedeur\'s: Watson stays CLE\'s starter', !SAN.length, SAN.join(' | '));
  }
  { // site-ranks
    const site = ["the secondary ranks 26th in the site's units", 'ranks 1st in the tracker', 'Seahawks, 1st in the power ratings', 'It sits 25th in the power rankings', 'the Deep Dive has them Favorable', 'its power rank is 3rd'];
    const other = ["PFF's unit grade of 72.4", 'ESPN FPI power ratings have them 3rd', 'a deep dive into the tape', "the NFL.com power rankings put them 5th", 'per TeamRankings, 3rd'];
    const missed = site.filter(x => !siteRankQuote(x)), caught = other.filter(x => siteRankQuote(x));
    add('site-ranks', "the site's own ranks are caught, a third party's with its source are not", !missed.length && !caught.length, `missed: ${missed.join(' | ') || 'none'}; caught: ${caught.join(' | ') || 'none'}`);
  }
  return out;
}

module.exports = { cases };
if (require.main === module) {
  let bad = 0;
  for (const c of cases()) { console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: ${c.label}${c.detail ? `  (${c.detail})` : ''}`); if (!c.ok) bad++; }
  console.log(bad ? `\n${bad} case(s) failed` : '\nall cases hold');
  process.exit(bad ? 1 : 0);
}
