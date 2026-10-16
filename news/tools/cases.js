/* Cases the news job's rules and their checks must keep, each cut down from a week the real nflverse
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
     deepdive-weighted    two made-up teams whose edges the weights split from the old rule: the Game
                          snapshot's own possession() (nflbets/build/deepdive.js, run here on the fixture)
                          tags each row on its weighted edge (the line's +0.7 is Even, the run game's +1.7
                          and the receivers' +1.6 Favorable), the Rams' board code LA reads the file's LAR,
                          no name, reason or note in the file is drawn (a row is its unit, the two clubs and
                          ranks, the defense's position and its tag, the owner's calls of 14 and 16 October
                          2026), and the checks pass both ways; the old unweighted rule (what possession()
                          draws from a file without tags) fails them, and so do ranks or an edge that are not
                          the file's, a row's two sides drawn the other way round or headed by the wrong club,
                          a name or a number drawn in a row, the defense's position left out (the row as it
                          was drawn until 16 October 2026), the wrong one, one drawn twice or on the
                          offense's side, and a file whose constants were changed.
     deepdive-elo         the rows' figures are Elo against Elo (the owner's call, 16 October 2026): on a
                          made-up model.json with the six position tables, players.json and matchups.json,
                          the snapshot's own eloSides() and possession() draw the quarterback's own season
                          Elo (1580) against Pass Defense (1490), Pass Protection against Pass Rush (a tie,
                          1450 each, marked neither way), Run Offense against Run Defense (1510 against
                          1620, the defense marked) and Pass Offense against Pass Defense (1532 against
                          1490), each side titled with its Elo and rank, the higher marked, the tags the
                          Deep Dive's own and unchanged, and the checks pass on both possessions and on the
                          board's LA (the file's LA, units.json's LAR). An older model.json (no tables) draws
                          the ranks but the quarterback's Elo, and a quarterback unranked or whose lineup is
                          for another game draws his row's rank; the checks pass on each. The broken versions
                          fail: a figure off by one, the two sides' figures swapped, the wrong table (Run
                          Offense on the receivers' row), an Elo on a row whose file lacks the table, a rank
                          where the file has the Elo, the mark on the lower side, on a tie or left off, a
                          title without the rank, and the checks as they stood before (ranks only) on the
                          Elo rows.
     deepdive-headline    the Overall line's tag is this team's Overall Offense against the opponent's
                          Overall Defense from a made-up model.json, tagged by the gap read as points (+3.1
                          Easy one way, -1.8 Tough the other) by the snapshot's own headTag(); a tag from the
                          wrong side (this team's defense, or the opponent's offense) or the wrong club fails
                          the checks, and so do the points shown doubled or turned round (beside the tag or
                          in its title) and a tag with no rating to read; context.js's overall() reads LA as
                          LAR, refuses a model.json of last season and gives a fixed reason for one that does
                          not parse, and Overall ratings kept from an older file under the same build stamp,
                          or carried while the file is last season's, fail the checks against the file.
     site-ranks           the rank check catches the site's own ranks (the Overall Offense and Overall
                          Defense among them, under the old Total name too, and anything a site tab ranks)
                          and lets third-party ones by.
     notes-rules          the game notes (tools/notes.js): a note that keeps every rule passes clean ("C.J."
                          and "Jr." end no sentence, "Las Vegas", "on the line" and a score in the news are
                          not betting); each broken version fails in its own bucket: the shape (a game of
                          another week, a file named for another week, no preview, news that is not text, a
                          written date that is not one) a failure, the wording (a spread, a favourite, the
                          line, a price, a record typed, two sentences, a site rank, an em dash, markup, too
                          long or short) a warning. A spread is caught however it is written (-3.5, -3½, and a
                          whole number after a team, in brackets, after "Line:" or "at", where the rule took
                          only -3.5 and "Indianapolis -7 at home" passed), and a stat or a score with a minus
                          in it is not ("a -5 turnover margin", "won 24-17", "Stroud (-2 yards)", "(-0.07
                          EPA)"). A season or week that is not a number ("2026(", "*2026", "6(") fails, every
                          game with it, and throws nothing: the id's pattern was built from the season as
                          typed, and a "2026(" threw out of the news smoke and held back the week's data.
                          Players in bold (the owner, 14 October 2026): a note with every player written
                          **Name** passes clean on a made-up players list, and the same note with them
                          plain warns for each, named; each broken version warns and never fails: a player
                          left plain or only partly in a pair, an unpaired ** or a single *, a pair over 60
                          characters or with a space just inside, other markdown, a coach in bold (given,
                          or a head coach on the schedule), bold in the sources. Names are whole and
                          longest first ("Marvin Harrison Jr." is never read again as "Marvin Harrison",
                          and "Jaxon Smith" is not read inside "Jaxon Smith-Njigba"). The lengths count the
                          text without the markers (a preview of 196 characters and news of 298 pass with
                          the markers over the limit; 38 and 302 warn), and every other rule reads it so
                          too: a sentence after a bold name, a record or a book's name split by markers, a
                          preview ending in a bold "Jr.". The validator before it read an unpaired ** as
                          plain text and counted the markers in the lengths. A name is not always the
                          player's: a plain one straight after a role word ("Bengals owner Mike Brown said",
                          and coach, coordinator, GM, general manager, president, executive, chairman,
                          assistant, team doctor) does not warn, where the rule before it asked the writer to
                          bold the owner, and the same name elsewhere warns that the site knows it as a
                          player's ("if this is the player"). A pair that is no player's warns without the
                          schedule's coaches, which a week can find stale: one straight after a role word,
                          and a team's city, nickname or code ("**Broncos**", "**DEN**", "**the Denver
                          Broncos**"), where nothing warned before; a bold name the players list lacks
                          (Anton Harrison, Micah Parsons), after a position ("Jets WR") or a coach's "said",
                          does not. The players list reads every group's sidelined in players.json (Tyquan
                          Thornton, Edgerrin Cooper on injured reserve), which the reader before it missed. */
'use strict';
const { SEASON, seasonState, siteRankQuote } = require('./lib');
const { lineups, schedule, notePractice, espnIndex } = require('./context');
const LC = require('./lineup-checks');
const PW = require('./pull-week');
const DC = require('./deepdive-checks');
const NOTES = require('./notes');
const fs = require('fs'), os = require('os'), path = require('path');
const { overall } = require('./context');

/* the Game snapshot's own Deep Dive (nflbets/build/deepdive.js, the module the page inlines), run on a
   fixture's units.json: { meta, basis, lineups, units } */
const pageDeepDive = () => require(path.join(__dirname, '..', '..', 'nflbets', 'build', 'deepdive.js'));
const ddFile = (units, meta) => ({ season: meta && meta.season, week: meta && meta.week, built_at: meta && meta.built_at, meta, basis: '2025 season counted as 4 games', lineups: 'Lineups from a fixture', units });
/* a made-up team: each unit's rating (z) and rank, the opponent-facing pass and run defense beside them */
const ddTeam = (z, g26 = 5) => ({ g26, ...Object.fromEntries(['qb', 'ol', 'rb', 'rec', 'front', 'db'].map(u => [u, { rank: 16, z: z[u], who: [], stats: [] }])),
  vs: { passD: { rank: 16, z: z.passD }, runD: { rank: 16, z: z.runD } } });
const DD_META = { season: SEASON, week: 6, phase: 'regular', built_at: '2026-10-13T16:00:00.000Z',
  overall: { file: 'elo/data/model.json', built_at: '2026-10-13T15:48+00:00', season: SEASON },
  tags: { rows: { weights: { qb: 1, ol: 0.5956, rb: 0.3792, rec: 0.8925, front: 0.5956, db: 0.8925 }, fav: 0.5, easy: 1.5, fit: '2012-2017' },
    headline: { slope: 11.9126, fav: 0.9645, easy: 2.8935, fit: '2012-2017' } } };
/* a model.json with every club's Overall Offense and Defense; MIN and NO set by hand, LA as the ELO build names the Rams */
const CLUBS = ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LA', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'];
function ddModel(season = SEASON, built = '2026-10-13T15:48+00:00') {
  const raw = { off: { MIN: 0.21, NO: -0.1 }, def: { MIN: 0.05, NO: -0.05 } }, units = { season, off: {}, def: {} };
  for (const s of ['off', 'def']) {
    CLUBS.forEach((t, i) => { if (!(t in raw[s])) raw[s][t] = +((s === 'off' ? 14 - i : i - 17) / 70).toFixed(6); });
    const order = CLUBS.slice().sort((a, b) => raw[s][b] - raw[s][a]);
    for (const t of CLUBS) units[s][t] = { elo: Math.round(1500 + raw[s][t] * 400), rank: order.indexOf(t) + 1, raw: raw[s][t], games: t === 'LA' ? 0 : 5, ...(t === 'LA' ? { carried: true } : { carried: false }), stats: {} };
  }
  return { built_at: built, units };
}
function withModel(M, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-case-'));
  try { fs.mkdirSync(path.join(dir, 'elo', 'data'), { recursive: true }); fs.mkdirSync(path.join(dir, 'news'));
    fs.writeFileSync(path.join(dir, 'elo', 'data', 'model.json'), typeof M === 'string' ? M : JSON.stringify(M)); return fn(path.join(dir, 'news')); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

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
  { // deepdive-weighted
    const A = ddTeam({ qb: 0.4, ol: 0.5, rb: 0.9, rec: 0.4, front: 0.2, db: -0.3, passD: 0.1, runD: 0.2 });
    const O = ddTeam({ qb: 0.1, ol: 1.0, rb: -0.2, rec: 0.4, front: -0.2, db: -1.2, passD: -0.3, runD: -0.8 });
    const D = ddFile({ MIN: A, NO: O }, DD_META), tags = r => r ? DC.parse(r.html).tags : [];
    let DD = null, mine = null, back = null, err = '';
    try { DD = pageDeepDive(); mine = DD.possession(D, 'MIN', 'NO'); back = DD.possession(D, 'NO', 'MIN'); } catch (e) { err = e.message; }
    /* by hand: qb 0.7 x 1; ol 0.7 x 0.5956 = 0.42; rb 1.7 x 0.3792 = 0.64; rec 1.6 x 0.8925 = 1.43. The other way:
       qb 0; ol 0.8 x 0.5956 = 0.48; rb -0.4 x 0.3792 = -0.15; rec 0.7 x 0.8925 = 0.62 */
    const HAND = ['Favorable', 'Even', 'Favorable', 'Favorable'], BACK = ['Even', 'Even', 'Even', 'Favorable'];
    add('deepdive-weighted', "possession() tags each row on its weighted edge: the line's +0.7 Even, the run game's +1.7 and the receivers' +1.6 Favorable; the other way the line's +0.8 Even",
      !err && tags(mine).join('|') === HAND.join('|') && mine.rows.map(r => r.tag).join('|') === HAND.join('|') && tags(back).join('|') === BACK.join('|'),
      err || `${tags(mine).join(',')} / ${tags(back).join(',')} (by hand ${HAND.join(',')} / ${BACK.join(',')})`);
    const f = err ? [err] : [...DC.checkMeta(DD_META), ...DC.checkPossession(mine.html, 'MIN', 'NO', A, O), ...DC.checkPossession(back.html, 'NO', 'MIN', O, A)];
    add('deepdive-weighted', 'the checks pass on both possessions', !f.length, f.join(' | ') || 'none');
    /* the board's codes: the Rams are LA on the board and LAR in the file */
    let la = null; try { la = DD && DD.possession(ddFile({ LAR: A, NO: O }, DD_META), 'LA', 'NO'); } catch (e) { err = e.message; }
    const fl = la ? DC.checkPossession(la.html, 'LA', 'NO', A, O) : ['no possession for LA'];
    add('deepdive-weighted', "the board's LA reads the file's LAR", !fl.length, fl.join(' | ') || 'LA-NO drawn');
    /* a row names nobody and shows no number (the owner's call, 14 October 2026: who plays is the Starters
       card's, the numbers the Stat breakdown's): a name, a reason, a quarterback next, a note and the stats
       in the file, markup among them, are not drawn at all, and the checks still pass */
    const X = clone(A); X.qb.who = [{ n: '<img src=x onerror=alert(1)>', pos: 'QB', q: 'questionable: "ankle"' }]; X.qb.out = [{ n: 'Zed & Quux', pos: 'QB', why: 'out (<b>knee</b>)' }];
    X.qb.next = { n: 'Quin Zorb', pos: 'QB', from: 'roster' }; X.rb.note = '</div><script>x()</script>'; X.rec.stats = [['yards a target', 8.7, 3]];
    let xh = '', fx = []; try { xh = DD.possession(ddFile({ MIN: X, NO: O }, DD_META), 'MIN', 'NO').html; fx = DC.checkPossession(xh, 'MIN', 'NO', X, O); } catch (e) { xh = 'threw ' + e.message; }
    add('deepdive-weighted', "a name, a reason, the next quarterback, a note and a stat in the file are not drawn in any row, and the checks pass",
      !/img|Zed|Quux|knee|ankle|Zorb|script|yards a target|8\.7/.test(xh) && !/^threw/.test(xh) && !fx.length, fx.join(' | ') || xh.slice(0, 160));
    /* the review's version: the old rule, the raw edge at 0.5 and 1.5 (what possession() draws from a file without tags) */
    const oldMeta = clone(DD_META); delete oldMeta.tags;
    let fo = [], oldRows = [];
    try { const r = DD.possession(ddFile({ MIN: A, NO: O }, oldMeta), 'MIN', 'NO'); oldRows = tags(r); fo = DC.checkPossession(r.html, 'MIN', 'NO', A, O); } catch (e) { fo = []; err = e.message; }
    add('deepdive-weighted', 'the old unweighted tags (Favorable, Favorable, Easy, Easy) fail the checks',
      oldRows.join('|') === DC.unweightedTags(A, O).slice(0, 4).join('|') && oldRows.join('|') !== HAND.join('|') && fo.some(x => /rows:/.test(x)), `${oldRows.join(',')}; ${fo.join(' | ') || 'passed'}`);
    /* a row showing a rank or an edge that is not the file's */
    const bent = mine ? [
      ["a rank that is not the file's", h => h.replace('<b class="ddrk">16th</b>', '<b class="ddrk">15th</b>'), /ranks/],
      ['an edge that is not the gap between the ratings', h => h.replace('Edge +0.7', 'Edge +0.8'), /"edge/],
      ['a row left out', h => h.replace(/<div class="ddrow" data-dd="rb"[\s\S]*?(?=<div class="ddrow" data-dd="rec")/, ''), /rows qb,ol,rec/],
      ['two tags in one row', h => h.replace('<span class="ddunit">Receivers</span>', '<span class="ddunit">Receivers</span><span class="dtag easy">Easy</span>'), /other than one tag/],
      /* the two sides of a meeting: the offense's left, the defense's right, each headed by its own club
         (every rank here is 16th, so only the sides themselves tell) */
      ["a row's two sides drawn the other way round", h => h.replace('class="ddside ddoff"', 'class="ddside SWAP"').replace('class="ddside dddef"', 'class="ddside ddoff"').replace('class="ddside SWAP"', 'class="ddside dddef"'), /sides ddd?[a-z]+,dd/],
      ['a side headed by the other club', h => h.replace('<span class="ddsn">MIN</span>', '<span class="ddsn">NO</span>'), /sides headed/],
      ['a rank given to one side twice', h => h.replace(/(<span class="ddsn">MIN<\/span> <b class="ddrk">16th<\/b>)/, '$1<b class="ddrk">16th</b>'), /2 ranks/],
      /* the rows as they were drawn until 14 October 2026: who plays, who is out and the numbers under each side */
      ['a name drawn in a row', h => h.replace('<span class="ddsn">MIN</span> <b class="ddrk">16th</b>', '<span class="ddsn">MIN</span> <b class="ddrk">16th</b><span class="ddwho">Sam Darnold (QB)</span>'), /the row reads/],
      ['a number drawn in a row', h => h.replace(/(<span class="ddunit">Running backs<\/span>)/, '$1<span class="ddnum">4.6 yards a carry (9th)</span>'), /the row reads/],
      /* the defense's position (the owner's call, 16 October 2026): the row as it was drawn before, without
         it; the wrong one (the coverage on the line's row); named twice; and drawn on the offense's side */
      ["the defense's position left out", h => h.replace('<span class="dddu">Pass rush</span>', ''), /the defense's position reads 'nothing'/],
      ["the wrong defense's position", h => h.replace('<span class="dddu">Pass rush</span>', '<span class="dddu">Coverage</span>'), /the defense's position reads 'Coverage'/],
      ["the defense's position named twice", h => h.replace('<span class="dddu">Run defense</span>', '<span class="dddu">Run defense</span><span class="dddu">Run defense</span>'), /the defense's position reads 'Run defense' \| 'Run defense'/],
      ["the defense's position on the offense's side", h => h.replace('<span class="dddu">Pass defense</span>', '').replace('<span class="ddunit">Quarterback</span>', '<span class="ddunit">Quarterback</span> <span class="dddu">Pass defense</span>'), /the row reads/],
    ].map(([what, bend, rx]) => { const b = bend(mine.html); return b !== mine.html && DC.checkPossession(b, 'MIN', 'NO', A, O).some(x => rx.test(x)) ? null : what; }).filter(Boolean) : ['no possession'];
    add('deepdive-weighted', "a rank or an edge that is not the file's, a row left out, a second tag, a row's sides the other way round, headed by the wrong club or ranked twice, a name or a number in a row, or the defense's position left out, wrong, named twice or on the offense's side fails the checks", !bent.length, bent.length ? `passed: ${bent.join(', ')}` : 'all thirteen fail');
    const changed = clone(DD_META); changed.tags.rows.weights.rb = 1; changed.tags.headline.slope = 12.787;
    const fb = DC.checkMeta(changed);
    add('deepdive-weighted', "a file whose constants were changed (the run game weighted 1, the headline's first slope 12.787) fails the checks",
      fb.length === 2 && fb.some(x => /row weight rb/.test(x)) && fb.some(x => /headline slope/.test(x)), fb.join(' | ') || 'passed');
  }
  { // deepdive-elo
    const A = ddTeam({ qb: 0.4, ol: 0.5, rb: 0.9, rec: 0.4, front: 0.2, db: -0.3, passD: 0.1, runD: 0.2 });
    const O = ddTeam({ qb: 0.1, ol: 1.0, rb: -0.2, rec: 0.4, front: -0.2, db: -1.2, passD: -0.3, runD: -0.8 });
    const D = ddFile({ MIN: A, NO: O, LAR: A }, DD_META), GID = `${SEASON}_06_MIN_NO`;
    /* the six position tables (each club ranked by its elo; MIN's offense and NO's defense set by hand,
       NO's offense and MIN's defense their mirror), named in units.tables as elo/build.py names them */
    const TAB = { run_def: ['Run Defense', 'def'], pass_def: ['Pass Defense', 'def'], pass_rush: ['Pass Rush', 'def'],
      run_off: ['Run Offense', 'off'], pass_off: ['Pass Offense', 'off'], pass_pro: ['Pass Protection', 'off'] };
    const SET = { pass_def: { NO: 1490, MIN: 1555 }, pass_rush: { NO: 1450, MIN: 1470 }, run_def: { NO: 1620, MIN: 1405 },
      run_off: { MIN: 1510, NO: 1388, LA: 1510 }, pass_off: { MIN: 1532, NO: 1601, LA: 1532 }, pass_pro: { MIN: 1450, NO: 1522, LA: 1450 } };
    const M = ddModel(); M.units.tables = {};
    for (const [k, [label, of]] of Object.entries(TAB)) {
      const elo = {}; CLUBS.forEach((t, i) => { elo[t] = SET[k][t] != null ? SET[k][t] : 1300 + i * 13; });
      const order = CLUBS.slice().sort((x, y) => elo[y] - elo[x] || (x < y ? -1 : 1));
      M.units[k] = Object.fromEntries(CLUBS.map(t => [t, { elo: elo[t], rank: order.indexOf(t) + 1, raw: (elo[t] - 1500) / 400, games: 5, carried: false, start: 1500, line: [], stats: {} }]));
      M.units.tables[k] = { label, of, pair: null, walk_forward: {} };
    }
    const qbP = (name, se, rank) => ({ name, group: 'QB', team: 'MIN', elo: 1550, se, rank });
    const PL = { groups: { QB: { label: 'Quarterbacks', active: 30 } }, players: { 'q-min': qbP('Made Up Passer', 1580, 4), 'q-no': { ...qbP('Other Passer', 1477, 18), team: 'NO' }, 'w-min': { name: 'A Wideout', group: 'WR', team: 'MIN', se: 1600, rank: 2 } } };
    const MU = { week: 6, lineups: { MIN: { game_id: GID, week: 6, players: ['w-min', 'q-min'] }, NO: { game_id: GID, week: 6, players: ['q-no'] }, LA: { game_id: `${SEASON}_06_LA_NO`, week: 6, players: ['q-min'] } } };
    let DD = null, mine = null, back = null, E = null, err = '';
    try { DD = pageDeepDive(); E = DD.eloSides(M, PL, MU, GID, 'MIN', 'NO'); mine = DD.possession(D, 'MIN', 'NO', E); back = DD.possession(D, 'NO', 'MIN', DD.eloSides(M, PL, MU, GID, 'NO', 'MIN')); } catch (e) { err = e.message; }
    const W = DC.eloWant(M, PL, MU, GID, 'MIN', 'NO'), WB = DC.eloWant(M, PL, MU, GID, 'NO', 'MIN');
    /* by hand: the figures the rows must show, offense then defense, and which side is marked */
    const HANDF = ['1580|1490', '1450|1450', '1510|1620', '1532|1490'], MARK = ['o', '-', 'd', 'o'];
    const P = mine ? DC.parse(mine.html) : { rows: [] };
    const figs = P.rows.map(r => r.ranks.join('|')), marks = P.rows.map(r => r.sides[0] && r.sides[0].better ? 'o' : r.sides[1] && r.sides[1].better ? 'd' : '-');
    add('deepdive-elo', "possession() draws Elo against Elo: the quarterback's own 1580 against Pass Defense 1490, Pass Protection against Pass Rush 1450 each, Run Offense 1510 against Run Defense 1620, Pass Offense 1532 against Pass Defense 1490, the higher marked and a tie neither",
      !err && figs.join() === HANDF.join() && marks.join() === MARK.join(), err || `${figs.join(', ')}; marks ${marks.join('')}`);
    const plain = mine && DD.possession(D, 'MIN', 'NO');
    add('deepdive-elo', "the tags are the Deep Dive's own, unchanged by the Elo (Favorable, Even, Favorable, Favorable)",
      !!plain && DC.parse(mine.html).tags.join('|') === DC.parse(plain.html).tags.join('|') && DC.parse(mine.html).tags.join('|') === 'Favorable|Even|Favorable|Favorable', mine ? DC.parse(mine.html).tags.join(',') : 'none');
    const f = err ? [err] : [...DC.checkPossession(mine.html, 'MIN', 'NO', A, O, W), ...DC.checkPossession(back.html, 'NO', 'MIN', O, A, WB)];
    add('deepdive-elo', 'the checks pass on both possessions, figures and marks worked out on their own', !f.length, f.join(' | ') || 'none');
    /* the board's LA: model.json and the lineups key the Rams LA, units.json LAR */
    let fl = ['not drawn'];
    try { const la = DD.possession(D, 'LA', 'NO', DD.eloSides(M, PL, MU, `${SEASON}_06_LA_NO`, 'LA', 'NO')); fl = DC.checkPossession(la.html, 'LA', 'NO', A, O, DC.eloWant(M, PL, MU, `${SEASON}_06_LA_NO`, 'LA', 'NO'));
      if (!/<b class="ddelo gs-v[^"]*">1532<\/b>/.test(la.html)) fl.push('no Pass Offense 1532 for LA'); } catch (e) { fl = [e.message]; }
    add('deepdive-elo', "the board's LA reads model.json's LA and units.json's LAR", !fl.length, fl.join(' | ') || 'LA-NO drawn');
    /* the fallbacks: an older model.json with no tables (the quarterback's Elo still drawn); a quarterback
       unranked; a lineup for another game */
    const OLD = clone(M); delete OLD.units.tables; for (const k of Object.keys(TAB)) delete OLD.units[k];
    const UNR = clone(PL); UNR.players['q-min'].rank = null;
    const OTHER = clone(MU); OTHER.lineups.MIN.game_id = `${SEASON}_07_MIN_GB`;
    const fb = [['an older model.json', OLD, PL, MU, ['1580|16th', '16th|16th', '16th|16th', '16th|16th']], ['an unranked quarterback', M, UNR, MU, ['16th|1490', '1450|1450', '1510|1620', '1532|1490']],
      ["a lineup for another game", M, PL, OTHER, ['16th|1490', '1450|1450', '1510|1620', '1532|1490']]].map(([what, m, pl, mu, want]) => {
      try { const r = DD.possession(D, 'MIN', 'NO', DD.eloSides(m, pl, mu, GID, 'MIN', 'NO')), got = DC.parse(r.html).rows.map(x => x.ranks.join('|'));
        const ff = DC.checkPossession(r.html, 'MIN', 'NO', A, O, DC.eloWant(m, pl, mu, GID, 'MIN', 'NO'));
        if (got.join() !== want.join()) ff.push(`figures ${got.join(', ')} (by hand ${want.join(', ')})`);
        return ff.length ? `${what}: ${ff.join('; ')}` : null; } catch (e) { return `${what}: threw ${e.message}`; } }).filter(Boolean);
    add('deepdive-elo', "an older model.json draws ranks but the quarterback's Elo, and an unranked quarterback or a lineup for another game his row's rank, unmarked; the checks pass on each", !fb.length, fb.join(' | ') || 'all three');
    /* the broken versions, each of which the checks must fail */
    const OLDW = DC.eloWant(OLD, PL, MU, GID, 'MIN', 'NO');
    const bent = mine ? [
      ['a figure off by one', h => h.replace('>1532</b>', '>1533</b>'), W, /figures/],
      ["the two sides' figures swapped", h => h.replace('>1510</b>', '>SWAP</b>').replace('>1620</b>', '>1510</b>').replace('>SWAP</b>', '>1620</b>'), W, /figures/],
      ["the wrong table (Run Offense's 1510 on the receivers' row)", h => h.replace('>1532</b>', '>1510</b>'), W, /figures 1510 vs 1490/],
      ['an Elo on a row whose file lacks the table', h => h, OLDW, /shows an Elo/],
      ['a rank where the file has the Elo', h => h.replace('<b class="ddelo gs-v gs-better">1532</b>', '<b class="ddrk">16th</b>'), W, /shows a rank/],
      ['the mark on the lower side', h => h.replace('<b class="ddelo gs-v gs-better">1532</b>', '<b class="ddelo gs-v">1532</b>').replace(/(data-dd="rec"[\s\S]*?)<b class="ddelo gs-v">1490<\/b>/, '$1<b class="ddelo gs-v gs-better">1490</b>'), W, /marked better/],
      ['a tie marked', h => h.replace('<b class="ddelo gs-v">1450</b>', '<b class="ddelo gs-v gs-better">1450</b>'), W, /marked better \(want the mark on neither/],
      ['the mark left off', h => h.replace('<b class="ddelo gs-v gs-better">1580</b>', '<b class="ddelo gs-v">1580</b>'), W, /not marked better/],
      ['a title without the rank', h => h.replace(/(title="MIN Pass Offense: Elo 1532), [^"]*"/, '$1"'), W, /titled/],
      ['the checks as they stood (ranks only) on the Elo rows', h => h, null, /shows an Elo/],
    ].map(([what, bend, w, rx]) => { const b = bend(mine.html); return (b !== mine.html || w !== W) && DC.checkPossession(b, 'MIN', 'NO', A, O, w).some(x => rx.test(x)) ? null : what; }).filter(Boolean) : ['no possession'];
    add('deepdive-elo', "a figure off by one, the sides swapped, the wrong table, an Elo where the file lacks the table, a rank where it has one, the mark wrong, on a tie or left off, a title without the rank, and the ranks-only checks on Elo rows each fail the checks", !bent.length, bent.length ? `passed: ${bent.join(', ')}` : 'all ten fail');
  }
  { // deepdive-headline
    const M = ddModel(), off = M.units.off, def = M.units.def;
    let OV = null, DD = null, h1 = null, h2 = null, err = '';
    try { OV = withModel(M, overall); } catch (e) { err = e.message; }
    try { DD = pageDeepDive(); h1 = DD.headTag(DD_META, off.MIN, def.NO); h2 = DD.headTag(DD_META, off.NO, def.MIN); } catch (e) { err = err || e.message; }
    /* by hand: MIN's offense 0.21 against NO's defense -0.05: 11.9126 x 0.26 = +3.10, Easy; NO's offense -0.10 against MIN's defense 0.05: -1.79, Tough */
    add('deepdive-headline', "the Overall line's tag is this team's Overall Offense against the opponent's Overall Defense: MIN +3.1 points Easy, NO -1.8 Tough",
      !err && h1 && h1.tag === 'Easy' && h1.text === '+3.1 pts' && h2 && h2.tag === 'Tough' && h2.text === '−1.8 pts', err || `${JSON.stringify(h1)} / ${JSON.stringify(h2)}`);
    add('deepdive-headline', "context.js's overall() reads model.json's LA as LAR, carried and all", !!OV && OV.off.LAR && !OV.off.LA && OV.off.LAR.carried === true, err || Object.keys((OV && OV.off) || {}).join(','));
    const f = h1 && h2 ? [...DC.checkHead(h1, off.MIN, def.NO, DD_META, 'MIN'), ...DC.checkHead(h2, off.NO, def.MIN, DD_META, 'NO')] : ['no tags'];
    add('deepdive-headline', 'the checks pass on both', !f.length, f.join(' | ') || 'none');
    /* the review's versions: the wrong side and the wrong club */
    const wrong = DD ? [
      ["this team's defense", DD.headTag(DD_META, def.MIN, def.NO)],
      ["the opponent's offense", DD.headTag(DD_META, off.MIN, off.NO)],
      ['the wrong club (MIN against its own defense)', DD.headTag(DD_META, off.MIN, def.MIN)],
    ].map(([what, t]) => DC.checkHead(t, off.MIN, def.NO, DD_META).length ? null : what).filter(Boolean) : ['no deepdive.js'];
    add('deepdive-headline', 'a tag from the wrong side or the wrong club fails the checks', !wrong.length, wrong.length ? `passed: ${wrong.join(', ')}` : 'all three fail');
    /* the points shown beside the tag or in its title, doubled or turned round (the tag left right) */
    const pts = h1 ? [
      ['the points shown doubled', { ...h1, text: h1.text.replace(/([\d.]+)/, x => (2 * x).toFixed(1)) }],
      ['the points shown with the sign turned round', { ...h1, text: h1.text.replace('+', '−') }],
      ["the tag's title with the points doubled", { ...h1, title: h1.title.replace(/about ([+−])([\d.]+) points/, (m, s, x) => `about ${s}${(2 * x).toFixed(1)} points`) }],
    ].map(([what, t]) => (t.text !== h1.text || t.title !== h1.title) && DC.checkHead(t, off.MIN, def.NO, DD_META).some(x => /points shown|title/.test(x)) ? null : what).filter(Boolean) : ['no tag'];
    add('deepdive-headline', 'points shown doubled or turned round, beside the tag or in its title, fail the checks', !pts.length, pts.length ? `passed: ${pts.join(', ')}` : 'all three fail');
    /* no rating on a side: no tag, and a tag with nothing to read it from fails; a file without the constants draws none, which fails */
    const none = DD ? DD.headTag(DD_META, undefined, def.NO) : 'no deepdive.js', noTags = clone(DD_META); delete noTags.tags;
    add('deepdive-headline', 'with no rating on a side there is no tag (one drawn anyway fails); a file without the constants drawing none where both are rated fails',
      none === null && !DC.checkHead(null, undefined, def.NO, DD_META).length && DC.checkHead(h1, undefined, def.NO, DD_META).length === 1
        && DD.headTag(noTags, off.MIN, def.NO) === null && /no meta\.tags\.headline/.test(DC.checkHead(null, off.MIN, def.NO, noTags).join(' ')), JSON.stringify(none));
    /* last season's model.json and one that does not parse: overall() refuses each, with a fixed reason for the second */
    let lastErr = '', junkErr = '';
    try { withModel(ddModel(SEASON - 1), overall); } catch (e) { lastErr = e.message; }
    try { withModel('<img src=x onerror=alert(1)>', overall); } catch (e) { junkErr = e.message; }
    add('deepdive-headline', "overall() refuses a model.json of last season, and gives a fixed reason for one that does not parse",
      new RegExp(`for ${SEASON - 1}, not ${SEASON}`).test(lastErr) && junkErr === '../elo/data/model.json does not parse', `${lastErr || 'read last season without complaint'} / ${junkErr || 'read the junk'}`);
    const U32 = Object.fromEntries(Object.keys(OV ? OV.off : {}).map(t => [t, { overall: { off: OV.off[t], def: OV.def[t] } }]));
    const same = DC.checkOverall(U32, DD_META, M, SEASON);
    const stale = clone(U32); if (stale.MIN) stale.MIN.overall.off = { ...stale.MIN.overall.off, elo: 1550, rank: 3, raw: 0.125 };
    const sf = DC.checkOverall(stale, DD_META, M, SEASON);
    const old = DC.checkOverall(U32, DD_META, ddModel(SEASON - 1), SEASON);
    add('deepdive-headline', "ratings kept from an older file under the same build stamp, or carried while model.json is last season's, fail against the file",
      Object.keys(U32).length === 32 && !same.fails.length && sf.fails.length === 1 && /^MIN off/.test(sf.fails[0]) && old.fails.length === 1, `same ${same.fails.join(';') || 'ok'}; stale ${sf.fails.join(';') || 'passed'}; last season ${old.fails.join(';') || 'passed'}`);
  }
  { // site-ranks
    const site = ["the secondary ranks 26th in the site's units", 'ranks 1st in the tracker', 'Seahawks, 1st in the power ratings', 'It sits 25th in the power rankings', 'the Deep Dive has them Favorable', 'its power rank is 3rd',
      "the ELO Ratings tab ranks Minnesota's Overall Offense 27th", "the Jets' Overall Defense is 7th",
      // Week 5 as written on October 7: the tab's tables under their old name (patch_week5_totals.py took them out)
      "the site's ELO Ratings tab ranks Minnesota's Total Offense 27th", "the Jets' Total Defense 7th and Cleveland's Total Offense 19th",
      'the Team Rankings tab has them 4th'];
    const other = ["PFF's unit grade of 72.4", 'ESPN FPI power ratings have them 3rd', 'a deep dive into the tape', "the NFL.com power rankings put them 5th", 'per TeamRankings, 3rd',
      'the best overall defense in the division', 'Overall, defense has carried them',
      'they rank 27th in total offense, per ESPN', 'per TeamRankings, 4th in yards a play'];
    const missed = site.filter(x => !siteRankQuote(x)), caught = other.filter(x => siteRankQuote(x));
    add('site-ranks', "the site's own ranks are caught, a third party's with its source are not", !missed.length && !caught.length, `missed: ${missed.join(' | ') || 'none'}; caught: ${caught.join(' | ') || 'none'}`);
  }
  { // notes-rules
    const sched = { season: SEASON, games: [{ game_id: `${SEASON}_06_SEA_DEN`, week: 6 }, { game_id: `${SEASON}_06_BUF_LV`, week: 6 }, { game_id: `${SEASON}_07_DEN_NYG`, week: 7 }] };
    const good = { season: SEASON, week: 6, written: `${SEASON}-10-14`, games: {
      [`${SEASON}_06_SEA_DEN`]: { preview: 'Drew Lock goes back to Denver on a short week, with C.J. Stroud watching from home and Ja\'Marr Chase in town.', news: 'Denver beat the Jets 27-24 on Sunday; Kenneth Walker III (ankle) did not practise Tuesday.', sources: ['ESPN', 'Denver Post'] },
      [`${SEASON}_06_BUF_LV`]: { preview: 'Josh Allen brings the Bills to Las Vegas with the division lead on the line against Maxx Crosby Jr. and a rested pass rush.', news: '' } } };
    const run = (o, file = `${SEASON}-w6.json`) => NOTES.check(o, { file, schedule: sched });
    const ok = run(good);
    add('notes-rules', 'a note that keeps every rule passes with no failure and no warning', !ok.fails.length && !ok.warns.length, [...ok.fails, ...ok.warns].join(' | ') || 'clean');
    const id = `${SEASON}_06_SEA_DEN`, bend = (fn, file) => { const o = clone(good); fn(o, o.games[id]); return run(o, file); };
    /* the shape: each a failure */
    const SHAPE = [
      ['a game of another week', o => { o.games[`${SEASON}_07_DEN_NYG`] = { preview: o.games[id].preview }; }],
      ['a game on no schedule', o => { o.games[`${SEASON}_06_XXX_YYY`] = { preview: o.games[id].preview }; }],
      ['a file named for another week', () => {}, `${SEASON}-w7.json`],
      ['a file not named <season>-w<week>.json', () => {}, 'week6.json'],
      ['no preview', (o, g) => { delete g.preview; }],
      ['a preview that is not text', (o, g) => { g.preview = ['one', 'two']; }],
      ['news that is not text', (o, g) => { g.news = { text: 'x' }; }],
      ['sources that are not names', (o, g) => { g.sources = 'ESPN'; }],
      ['a written date that is not one', o => { o.written = 'Wednesday'; }],
      ['games as a list', o => { o.games = [o.games[id]]; }],
      ['the week as text', o => { o.week = '6'; }],
    ].map(([what, fn, file]) => { const r = bend(fn, file); return r.fails.length ? null : what; }).filter(Boolean);
    add('notes-rules', 'a note of the wrong shape or for a game not in the week fails', !SHAPE.length, SHAPE.length ? `passed: ${SHAPE.join(', ')}` : 'all eleven fail');
    /* the wording: each a warning, never a failure */
    const WORDS = [
      ['a spread', 'Seattle are getting -3.5 points in Denver after a short week of practice.'],
      ['a favourite', 'Denver are favoured at home after two straight wins over division rivals.'],
      ['the line', 'The line has moved toward Denver all week after the injury news on Monday.'],
      ['a price', 'Denver at -150 is the pick after two straight wins over division rivals.'],
      ['the total', 'The total sits low for a Thursday night game between two good defenses.'],
      ['a book', 'DraftKings has Denver winning this game after two straight wins at home.'],
      ['a record typed', 'Seattle bring a 3-2 team to Denver after two straight wins over division rivals.'],
      ['two sentences', 'Seattle come to Denver on a short week. The Broncos have won two straight at home.'],
      ["the site's ranks", "The Deep Dive has Seattle's pass rush against Denver's line as the game's key."],
      ['an em dash', 'Seattle come to Denver on a short week — and the Broncos have won two straight.'],
      ['markup', 'Seattle come to Denver on a short week with <b>Drew Lock</b> at quarterback again.'],
      ['too short', 'Seattle visit Denver.'],
      ['too long', 'Seattle come to Denver on a short week '.repeat(6) + 'again.'],
      ['no full stop', 'Seattle come to Denver on a short week with Drew Lock at quarterback again'],
    ].map(([what, preview]) => { const r = bend((o, g) => { g.preview = preview; }); return !r.fails.length && r.warns.length ? null : `${what} (${r.fails.length} failure(s), ${r.warns.length} warning(s))`; }).filter(Boolean);
    const longNews = bend((o, g) => { g.news = 'Seattle lost two starters in the secondary on Sunday and signed a cornerback off the practice squad. '.repeat(4); });
    add('notes-rules', "a note's wording that breaks a rule warns and never fails: betting words, a record typed, two sentences, a site rank, an em dash, markup, the length",
      !WORDS.length && !longNews.fails.length && longNews.warns.some(x => /news: \d+ characters/.test(x)), WORDS.length ? `not a warning alone: ${WORDS.join(', ')}` : 'all fifteen warn');
    /* a spread however it is written: a half point as -3.5 or -3½, a whole number after a team's name or code, in
       brackets, after "Line:" or "at"; and a stat or a score with a minus in it is none (each as the news, which
       takes a score) */
    const SPREADS = ['Indianapolis -7 at home.', 'Indianapolis (-7) hosts Tennessee.', 'Line: IND -7.', 'The Colts at -3½ on Sunday.', 'Jaguars -3 in London.', 'Tennessee come to Indianapolis at -3 again.']
      .filter(t => !bend((o, g) => { g.news = t; }).warns.some(x => /a spread like/.test(x)));
    const STATS = ['Houston bring a -5 turnover margin to London.', 'Denver won 24-17 at home on Sunday.', 'C.J. Stroud (-2 yards) was sacked five times.', 'Seattle allowed the fewest points a play in the league (-0.07 EPA).']
      .map(t => { const r = bend((o, g) => { g.news = t; }); return r.fails.length || r.warns.length ? `"${t}": ${[...r.fails, ...r.warns].join('; ')}` : null; }).filter(Boolean);
    add('notes-rules', 'a spread is betting language however it is written (-3.5, -3½, Indianapolis -7, (-7), Line: IND -7, at -3), and a stat or score with a minus is not',
      !SPREADS.length && !STATS.length, [SPREADS.length ? `not flagged: ${SPREADS.join(' | ')}` : '', STATS.length ? `flagged: ${STATS.join(' | ')}` : ''].filter(Boolean).join('; ') || 'six flagged, four clean');
    /* a season or week that is not a number fails, every game with it, and throws nothing: the id's pattern was
       built from the season as typed, and "2026(" threw out of the news smoke and held back the week's data */
    const BAD = [['season', '2026('], ['season', '*2026'], ['week', '6(']].map(([k, v]) => {
      let r; try { r = bend(o => { o[k] = v; }); } catch (e) { return `${k} ${JSON.stringify(v)}: threw ${e.message}`; }
      const keys = Object.keys(good.games).filter(gid => !r.fails.some(m => m.startsWith(gid + ':')));
      return r.fails.some(m => m.startsWith(`${k} ${JSON.stringify(v)} is not`)) && !keys.length ? null : `${k} ${JSON.stringify(v)}: ${keys.length ? `${keys.join(', ')} not failed` : 'not failed as a ' + k}`;
    }).filter(Boolean);
    add('notes-rules', 'a season or week that is not a number ("2026(", "*2026", "6(") fails, every game with it, and nothing throws', !BAD.length, BAD.join(' | ') || 'all three fail');
    /* players in bold (the owner, 14 October 2026): every player named is **Name**, a pair the page draws in
       bold. The bold rule runs only on a players list, given here made up so the case never moves with the
       real files; a coach comes from the list given or the schedule's head coaches */
    const P = ['Drew Lock', 'C.J. Stroud', "Ja'Marr Chase", 'Kenneth Walker III', 'Josh Allen', 'Maxx Crosby Jr.', 'Marvin Harrison', 'Marvin Harrison Jr.', 'Jaxon Smith'];
    const runB = (o, opts = {}) => NOTES.check(o, { file: `${SEASON}-w6.json`, schedule: sched, players: P, coaches: ['Sean Payton'], ...opts });
    const bolded = clone(good), BUF = `${SEASON}_06_BUF_LV`;
    bolded.games[id].preview = "**Drew Lock** goes back to Denver on a short week, with **C.J. Stroud** watching from home and **Ja'Marr Chase** in town.";
    bolded.games[id].news = 'Denver beat the Jets 27-24 on Sunday; **Kenneth Walker III** (ankle) did not practise Tuesday.';
    bolded.games[BUF].preview = '**Josh Allen** brings the Bills to Las Vegas with the division lead on the line against **Maxx Crosby Jr.** and a rested pass rush.';
    const okB = runB(bolded), plainB = runB(good), want = P.slice(0, 6);
    const named = want.filter(n => plainB.warns.some(m => /the site knows as (?:a player|players), not in bold/.test(m) && m.includes(`"${n}"`)));
    add('notes-rules', 'a note with every player in bold passes clean; the same note with its players plain warns for each, named, and never fails',
      !okB.fails.length && !okB.warns.length && !plainB.fails.length && plainB.warns.length === 3 && named.length === want.length,
      `bold: ${[...okB.fails, ...okB.warns].join(' | ') || 'clean'}; plain: ${plainB.warns.length} warning(s), ${named.length} of ${want.length} named`);
    /* each broken version: a warning (its own message), never a failure */
    const bendB = (fn, opts) => { const o = clone(bolded); fn(o, o.games[id]); return runB(o, opts); };
    const coachSched = { ...sched, games: sched.games.map(g => ({ ...g, home_coach: 'Sean Payton', away_coach: 'Mike Macdonald' })) };
    const BOLDS = [
      ['a player left plain', /a name the site knows as a player, not in bold \("Drew Lock": if this is the player, write \*\*Drew Lock\*\*\)/, (o, g) => { g.preview = g.preview.replace('**Drew Lock**', 'Drew Lock'); }],
      ['a player only partly in a pair', /a player only partly in bold \("Kenneth Walker III"/, (o, g) => { g.news = g.news.replace('**Kenneth Walker III**', '**Kenneth Walker** III'); }],
      ['an unpaired **', /an unpaired \*\* or a single \*/, (o, g) => { g.preview = '**Drew Lock goes back to Denver on a short week with a rested Seattle defense waiting.'; }],
      ['a single *', /an unpaired \*\* or a single \*/, (o, g) => { g.news = g.news.replace('Sunday;', 'Sunday*;'); }],
      ['a pair over 60 characters', /a bold pair over 60 characters/, (o, g) => { g.news = '**Kenneth Walker III and the rest of the Seattle backfield all sat out on Tuesday** again.'; }],
      ['a space just inside a pair', /a space just inside a bold pair/, (o, g) => { g.news = g.news.replace('**Kenneth Walker III**', '** Kenneth Walker III**'); }],
      ['other markdown', /markup/, (o, g) => { g.news = g.news.replace('Sunday;', 'Sunday, per `ESPN`;'); }],
      ['a coach in bold', /a coach in bold \("Sean Payton"/, (o, g) => { g.preview = '**Drew Lock** goes back to Denver on a short week, where **Sean Payton** calls the plays against **C.J. Stroud**.'; }],
      ['a head coach on the schedule in bold', /a coach in bold \("Mike Macdonald"/, (o, g) => { g.preview = '**Drew Lock** goes back to Denver on a short week, where **Mike Macdonald** waits with **C.J. Stroud**.'; }, { schedule: coachSched, coaches: undefined }],
      ['bold in the sources', /a source is a plain name/, (o, g) => { g.sources = ['**ESPN**', 'Denver Post']; }],
    ].map(([what, rx, fn, opts]) => { const r = bendB(fn, opts); return !r.fails.length && r.warns.some(m => rx.test(m)) ? null : `${what} (${r.fails.length} failure(s); ${r.warns.join(' | ') || 'no warning'})`; }).filter(Boolean);
    add('notes-rules', 'bold that breaks a rule warns and never fails: a player plain or partly bold, an unpaired ** or a single *, a pair over 60 or with a space inside, other markdown, a coach in bold (given or on the schedule), bold sources',
      !BOLDS.length, BOLDS.join(' | ') || 'all ten warn');
    /* a name is not always the player's: "Bengals owner Mike Brown said" names the owner, though a Mike Brown
       plays for New England. A plain name straight after a role word is not asked to be bold, the same name
       elsewhere still is, and the warning says only that the site knows the name as a player's. The rule
       before it warned on the owner, so --strict refused a correct note or had the writer bold an owner */
    const PM = { players: [...P, 'Mike Brown'] };
    const ROLES = ['Bengals owner', 'Bengals head coach', 'Bengals defensive coordinator', 'Bengals GM', 'Bengals general manager', 'team president',
      'executive', 'chairman', 'senior defensive assistant', 'team doctor', 'co-owner'];
    const RW = ROLES.map(w => { const r = bendB((o, g) => { g.news = `${w} Mike Brown said the club will not make a trade this week.`; }, PM); return r.fails.length || r.warns.length ? `${w}: ${[...r.fails, ...r.warns].join('; ')}` : null; }).filter(Boolean);
    const MB = bendB((o, g) => { g.news = 'Mike Brown (ankle) did not practise Wednesday, and Bengals owner Mike Brown said nothing.'; }, PM);
    const mbOk = !MB.fails.length && MB.warns.length === 1 && /a name the site knows as a player, not in bold \("Mike Brown": if this is the player, write \*\*Mike Brown\*\*\)/.test(MB.warns[0]);
    add('notes-rules', 'a plain name straight after a role word (owner, coach, coordinator, GM, general manager, president, executive, chairman, assistant, team doctor) is that person, not the player: no warning; the same name elsewhere warns that the site knows it as a player\'s',
      !RW.length && mbOk, `${RW.length ? `warned: ${RW.join(' | ')}; ` : `${ROLES.length} clean; `}elsewhere: ${[...MB.fails, ...MB.warns].join(' | ') || 'no warning'}`);
    /* a pair that is no player's, worked out without the schedule's coaches, which a week can find stale: one
       straight after a role word, and a team (its city, nickname or code, or a run of them). A name the players
       list lacks is never one by that alone: the list is incomplete (Anton Harrison, Micah Parsons), and a
       position before a name ("Jets WR", "edge rusher") is not a role */
    const NONP = [
      ['an owner in bold', /a coach or other non-player in bold \("Mike Brown", straight after "owner"/, 'Bengals owner **Mike Brown** said the club will not make a trade this week.'],
      ['a coordinator in bold', /a coach or other non-player in bold \("Vic Fangio", straight after "coordinator"/, 'Eagles defensive coordinator **Vic Fangio** said **Drew Lock** would see pressure.'],
      ['a general manager in bold', /a coach or other non-player in bold \("John Schneider", straight after "general manager"/, 'Seattle general manager **John Schneider** signed a cornerback on Tuesday.'],
      ['a nickname in bold', /a team in bold \("Broncos"/, 'The **Broncos** signed a cornerback off the practice squad on Tuesday.'],
      ['a city in bold', /a team in bold \("Kansas City"/, '**Kansas City** signed a cornerback off the practice squad on Tuesday.'],
      ['a code in bold', /a team in bold \("DEN"/, '**DEN** signed a cornerback off the practice squad on Tuesday.'],
      ['a full team name in bold', /a team in bold \("the Denver Broncos"/, '**the Denver Broncos** signed a cornerback off the practice squad on Tuesday.'],
    ].map(([what, rx, t]) => { const r = bendB((o, g) => { g.news = t; }, PM); return !r.fails.length && r.warns.some(m => rx.test(m)) ? null : `${what} (${r.fails.length} failure(s); ${r.warns.join(' | ') || 'no warning'})`; }).filter(Boolean);
    const KNOWN = ['Jaguars left tackle **Anton Harrison** went on injured reserve and **Micah Parsons** has not been cleared.', 'Jets WR **Adonai Mitchell** had a procedure, and Bears edge rusher **Montez Sweat** is suspended.',
      'Falcons coach Kevin Stefanski said **Drew Lock** will start if he has no setbacks.']
      .map(t => { const r = bendB((o, g) => { g.news = t; }, PM); return r.fails.length || r.warns.length ? `"${t}": ${[...r.fails, ...r.warns].join('; ')}` : null; }).filter(Boolean);
    add('notes-rules', 'a pair that is no player\'s warns, without the schedule\'s coaches: one straight after a role word, and a team\'s city, nickname or code; a name the players list lacks, after a position or a coach\'s "said", does not',
      !NONP.length && !KNOWN.length, [NONP.length ? `not warned: ${NONP.join(' | ')}` : 'all seven warn', KNOWN.length ? `warned: ${KNOWN.join(' | ')}` : 'three clean'].join('; '));
    /* the players list: every group's sidelined in elo/data/players.json, a ranked player out of the rankings
       (Tyquan Thornton and Edgerrin Cooper on injured reserve) who is kept out of players, as the build keeps him;
       the reader before it read past[].name, which never carries a name, and missed them. Read from a made-up file */
    const pdir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-case-'));
    let PL = [], PT = null;
    try {
      const pf = path.join(pdir, 'players.json');
      fs.writeFileSync(pf, JSON.stringify({ players: { '00-1': { name: 'Drew Lock', group: 'QB', team: 'SEA' } }, past: { '00-0038575': { s0: 1520, h: [[3, 1520]] } },
        groups: { WR: { top: [{ id: '00-1', name: 'Drew Lock' }], sidelined: [{ id: '00-0038575', name: 'Tyquan Thornton', team: 'KC', would_rank: 30, why: 'on injured reserve' }] },
          LB: { sidelined: [{ id: '00-0039850', name: 'Edgerrin Cooper', team: 'GB', would_rank: 7, why: 'on injured reserve' }] }, TE: { sidelined: [] } } }));
      PL = NOTES.players([pf]);
      PT = bendB((o, g) => { g.news = '**Drew Lock** said Tyquan Thornton (ankle) went on injured reserve.'; }, { players: PL });
    } finally { fs.rmSync(pdir, { recursive: true, force: true }); }
    const side = ['Tyquan Thornton', 'Edgerrin Cooper', 'Drew Lock'].filter(n => !PL.includes(n));
    add('notes-rules', "the players list reads every group's sidelined in players.json (a ranked player on injured reserve is kept out of players), and a sidelined player left plain warns",
      !side.length && PT && !PT.fails.length && PT.warns.some(m => /not in bold \("Tyquan Thornton"/.test(m)), `list: ${PL.join(', ') || 'empty'}${side.length ? `; missing ${side.join(', ')}` : ''}; plain: ${PT ? PT.warns.join(' | ') || 'no warning' : 'not run'}`);
    /* names whole and longest first: "Marvin Harrison Jr." claims its place, so "Marvin Harrison" is not read in it,
       while a second, plain "Marvin Harrison" is; a hyphen is part of a name */
    const H = bendB((o, g) => { g.news = 'Marvin Harrison Jr. reunites with **C.J. Stroud**, and Marvin Harrison watched.'; }).warns.find(m => /not in bold/.test(m)) || '';
    const HB = bendB((o, g) => { g.news = '**Marvin Harrison Jr.** reunites with **C.J. Stroud** in Houston.'; });
    const HY = bendB((o, g) => { g.news = '**Jaxon Smith-Njigba** was limited on Wednesday.'; });
    add('notes-rules', 'a name is read whole and longest first: "Marvin Harrison Jr." bold is clean, plain is named once beside a plain "Marvin Harrison", and "Jaxon Smith" is not read in "Jaxon Smith-Njigba"',
      H.includes('("Marvin Harrison Jr.", "Marvin Harrison":') && !HB.warns.length && !HY.warns.length, `plain: ${H || 'no warning'}; bold: ${HB.warns.join(' | ') || 'clean'}; hyphen: ${HY.warns.join(' | ') || 'clean'}`);
    /* the lengths count the text without the markers: 196 and 298 pass with the raw text over the limit, 38 and
       302 warn and say so; filled with one long word so nothing else is read. The markers are counted out here
       on their own, as the page reads a pair */
    const fill = (head, n, tail) => head + 'x'.repeat(n - (head + tail).replace(/\*\*([^*]{1,60})\*\*/g, '$1').length) + tail;
    const LEN = [['preview', 196, false], ['preview', 38, true], ['news', 298, false], ['news', 302, true]].map(([k, n, bad]) => {
      const t = fill(k === 'preview' ? '**Drew Lock** and **C.J. Stroud** meet ' : '**Kenneth Walker III** and **Josh Allen** ', n, '.');
      const r = bendB((o, g) => { g[k] = t; }), hit = r.warns.filter(m => / characters \(/.test(m));
      const ok = !r.fails.length && (bad ? hit.length === 1 && hit[0].includes(`${n} characters`) : !hit.length) && (bad || t.length > (k === 'preview' ? 200 : 300));
      return ok ? null : `${k} of ${n} (${t.length} with the markers): ${hit.join(' | ') || 'no length warning'}`;
    }).filter(Boolean);
    add('notes-rules', 'the lengths count the text without the markers: a preview of 196 and news of 298 pass over the limit with them, 38 and 302 warn',
      !LEN.length, LEN.join(' | ') || 'all four as they should');
    /* every other rule reads the text without the markers too */
    const READ = [
      ['a sentence after a bold name is a second one', 'preview', 'Seattle come to Denver on a short week. **Drew Lock** has won two straight at home.', /2 sentences/],
      ['a record split by markers', 'preview', '**Drew Lock** brings a **3**-2 team to Denver after two straight wins over division rivals.', /a record or score typed \("3-2"/],
      ["a book's name split by markers", 'news', 'Draft**Kings** has Denver at home again on Sunday.', /betting language \(DraftKings/],
    ].map(([what, k, t, rx]) => { const r = bendB((o, g) => { g[k] = t; }); return !r.fails.length && r.warns.some(m => rx.test(m)) ? null : `${what}: ${r.warns.join(' | ') || 'no warning'}`; }).filter(Boolean);
    const JR = bendB(o => { o.games[BUF].preview = 'The Bills go to Las Vegas to face a rested pass rush led by **Maxx Crosby Jr.**'; });
    add('notes-rules', 'every other rule reads the text without the markers: a sentence after a bold name, a record or a book split by markers, and a preview ending in a bold "Jr." ends',
      !READ.length && !JR.fails.length && !JR.warns.length, [...READ, ...JR.warns].join(' | ') || 'all four');
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
