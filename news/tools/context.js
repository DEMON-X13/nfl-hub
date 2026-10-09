/* Season context the page reads beside each week file. Rebuilt on every pull.

     node tools/context.js            (from news/)   or   require('./context').build()

   Writes three plain script data files (the page stays file:// friendly, no fetch):
     data/ranks2026.js     RANKS26: every team's rank and Elo on X NFL Bets' Team Rankings tab, read
                           from ../elo/data/model.json (`teams`, the team Elo of this season's results)
                           in the order that tab draws it. RANKS26_ASOF is the last game the ratings
                           have taken in. Until 2026-10-09 it was the Alpha Model's team Elo from
                           ../betting/state.json, which no page shows as a ranking any more; the two
                           disagreed by 6.4 places a team (Seattle 1st on the chip, 9th on the tab).
     data/players2026.js   PLAYERS26: team -> { name: position } from the nflverse roster,
                           keyed by full name, football name and first name, so the page
                           can write "(QB)" after a player's name.
     data/units2026.js     UNITS26: the Deep Dive. Six units per team, each with a rating in league
                           standard deviations (z), its rank, the numbers behind it, who is playing
                           there and who is not. Every row sets a unit against the unit it really
                           plays, measured on the same numbers from both sides:
                             qb     vs passD   pass EPA per dropback, made / allowed
                             ol     vs front   sack rate and QB-hit rate, allowed / forced
                             rb     vs runD    EPA and yards per carry, QB runs, scrambles and
                                               kneel-downs taken out, made / allowed
                             rec    vs db      EPA and yards per target, made / allowed
                           The page tags a row by the gap between the two ratings (app.js difficulty()).
                           Team numbers blend 2025 (weighted as PRIOR_GAMES games) with every
                           2026 game so far, so each week this season counts for more; each team
                           carries its own 2026 game count (g26), since a team that has played the
                           week's Thursday game has one more than the rest.
                           UNITS26_META says which week and season the lineups are for, when they were
                           built and from what, and the smoke test holds them to it.
                           Until 2026-10-08 the receivers were rated on YAC per catch and 20+ throws
                           (a style, not how well they play), the line and the front on different
                           stats, sacks were counted twice in pressure, and the who-lists were
                           season usage with no injury check (TB's QB row named an injured
                           Baker Mayfield). See lineups() for how the names are chosen now.
   Also writes, beside them:
     tools/out/weekN-lineups.json   the lineups as each team's kickoff found them (a team's entry stops
                           changing at its kickoff), so a later run can grade them against who played
     tools/out/weekN-lineups-grade.md   that grade, once nflverse has the week's snap counts
     tools/.cache/lineup-sources.json   the injury report, roster and schedule this build read (not
                           committed): the smoke test checks the lineups against the same files

   Sources: nflverse-data releases (team and player stats 2025 and 2026, snap counts, roster,
   injury report and depth charts 2026), the nflverse schedule and, when pull-week.js passes it,
   ESPN's injury list. Every nflverse file but the snap counts is required: if one cannot be
   downloaded after four tries the build writes nothing and exits non-zero, so the job stops before
   its commit and the last good files stay live. (Until 2026-10-09 a missing injury report quietly
   published lineups with no injury check, and a missing stats file kept the whole Deep Dive,
   lineups included, on a green run.) The snap counts only order the lists and ESPN's list only adds
   to the check: without either the build goes on, logs a warning and says so on the page.        */
'use strict';
const fs = require('fs'), path = require('path');
const { SEASON, GAMES_URL, parseCSV, fetchText, ab, seasonState, etToISO } = require('./lib');

const PRIOR = SEASON - 1, PRIOR_GAMES = 4;
const REL = 'https://github.com/nflverse/nflverse-data/releases/download';
const URLS = {
  games: GAMES_URL,
  team25: `${REL}/stats_team/stats_team_week_${PRIOR}.csv`,
  team26: `${REL}/stats_team/stats_team_week_${SEASON}.csv`,
  player26: `${REL}/stats_player/stats_player_week_${SEASON}.csv`,
  player25: `${REL}/stats_player/stats_player_week_${PRIOR}.csv`,
  roster26: `${REL}/rosters/roster_${SEASON}.csv`,
  injuries26: `${REL}/injuries/injuries_${SEASON}.csv`,
  depth26: `${REL}/depth_charts/depth_charts_${SEASON}.csv`,
  snaps26: `${REL}/snap_counts/snap_counts_${SEASON}.csv`,
};
const OPTIONAL = new Set(['snaps26']);

/* the job reads these lines in its log; a GitHub warning shows on the run's summary page */
const warn = msg => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `warning: ${msg}`);

const LAST_MODIFIED = {};
async function getCSV(name, opts) {
  const { text, lastModified } = await fetchText(URLS[name], opts);
  LAST_MODIFIED[name] = lastModified;
  return parseCSV(text);
}
const num = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
const dataFile = (name, obj, extra = '') => `/* Generated by tools/context.js. Do not edit by hand. */\nconst ${name} = ${JSON.stringify(obj)};\n${extra}`;

/* ---------------- the rank chip: X NFL Bets' Team Rankings ---------------- */
/* Ordered as betting/tools/ratings_viz.js orders the tab: Elo, highest first, ties in the file's order
   (Array.prototype.sort is stable). As of the last final whose kickoff came before model.json was built. */
function ranks(root, games) {
  const file = path.resolve(root, '..', 'elo', 'data', 'model.json');
  if (!fs.existsSync(file)) throw new Error('../elo/data/model.json not found');
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const teams = Object.entries(m.teams || {}).map(([t, v]) => [ab(t), v && v.elo]).filter(([, e]) => isFinite(e));
  if (teams.length < 32) throw new Error(`only ${teams.length} teams on Team Rankings`);
  teams.sort((a, b) => b[1] - a[1]);
  const R = {}; teams.forEach(([t, e], i) => { R[t] = { rank: i + 1, elo: Math.round(e) }; });
  const built = Date.parse(String(m.built_at || '').replace(/\+00:00$/, 'Z'));
  const asof = games.filter(r => r.season === String(SEASON) && String(r.home_score || '').trim())
    .map(r => ({ day: r.gameday, kick: etToISO(r.gameday, r.gametime) }))
    .filter(x => !isFinite(built) || Date.parse(x.kick) < built).map(x => x.day).sort().pop() || '';
  return { R, asof, built: m.built_at || '' };
}

/* ---------------- positions from the roster ---------------- */
/* writers use either form of a first name; the roster keeps one */
const NICK = {};
for (const [a, b] of [['Josh', 'Joshua'], ['Mike', 'Michael'], ['Matt', 'Matthew'], ['Chris', 'Christopher'], ['Nick', 'Nicholas'],
  ['Jon', 'Jonathan'], ['Rob', 'Robert'], ['Bob', 'Robert'], ['Will', 'William'], ['Dan', 'Daniel'], ['Tony', 'Anthony'], ['Alex', 'Alexander'],
  ['Ben', 'Benjamin'], ['Zach', 'Zachary'], ['Tom', 'Thomas'], ['Jake', 'Jacob'], ['Joe', 'Joseph'], ['Sam', 'Samuel'], ['Andy', 'Andrew'],
  ['Drew', 'Andrew'], ['Jim', 'James'], ['Jimmy', 'James'], ['Dave', 'David'], ['Ed', 'Edward'], ['Greg', 'Gregory'], ['Jeff', 'Jeffrey'],
  ['Pat', 'Patrick'], ['Steve', 'Steven'], ['Tim', 'Timothy'], ['Cam', 'Cameron'], ['Trey', 'Treyvon'], ['Kenny', 'Kenneth'], ['Ken', 'Kenneth']]) {
  (NICK[a] ??= []).push(b); (NICK[b] ??= []).push(a);
}
function players(roster) {
  const P = {};
  for (const r of roster) {
    if (['CUT', 'RET'].includes(r.status)) continue;
    const team = ab(r.team), pos = r.depth_chart_position || r.position; if (!team || !pos) continue;
    const t = (P[team] ??= {});
    const firsts = new Set([r.football_name, r.first_name].filter(Boolean));
    for (const f of [...firsts]) for (const alt of (NICK[f] || [])) firsts.add(alt);
    for (const n of new Set([r.full_name, ...[...firsts].map(f => `${f} ${r.last_name}`)])) {
      if (n && n.trim().split(' ').length >= 2 && !n.includes('undefined') && !t[n]) t[n] = pos;
    }
  }
  if (Object.keys(P).length < 32) throw new Error(`the roster covered ${Object.keys(P).length} teams`);
  return P;
}

/* ---------------- Deep Dive: the ratings ---------------- */
/* QB runs, scrambles and kneel-downs come out of the run game: they are a quarterback's, not the
   backs', and a scramble is a dropback. Summed per team and week from the player file. */
function qbRushing(players) {
  const Q = {};
  for (const r of players || []) {
    if (r.season_type && r.season_type !== 'REG') continue;
    if (r.position !== 'QB') continue;
    const e = (Q[ab(r.team) + '|' + r.week] ??= { car: 0, ryd: 0, repa: 0 });
    e.car += num(r.carries); e.ryd += num(r.rushing_yards); e.repa += num(r.rushing_epa);
  }
  return Q;
}
function teamTotals(rows, qbr = {}) {
  /* per team: offence totals from its own rows, defence-allowed totals from opponents' rows */
  const T = {}, NONE = { car: 0, ryd: 0, repa: 0 };
  const get = t => (T[t] ??= { g: 0, att: 0, sk: 0, pepa: 0, tgt: 0, tepa: 0, tyd: 0, hitA: 0, car: 0, ryd: 0, repa: 0,
    oatt: 0, osk: 0, opepa: 0, otgt: 0, otepa: 0, otyd: 0, ocar: 0, oryd: 0, orepa: 0, dhit: 0 });
  for (const r of rows) {
    if (r.season_type && r.season_type !== 'REG') continue;
    const t = get(ab(r.team)), o = get(ab(r.opponent_team)), q = qbr[ab(r.team) + '|' + r.week] || NONE;
    t.g++; t.att += num(r.attempts); t.sk += num(r.sacks_suffered); t.pepa += num(r.passing_epa);
    t.tgt += num(r.targets); t.tepa += num(r.receiving_epa); t.tyd += num(r.receiving_yards);
    t.car += num(r.carries) - q.car; t.ryd += num(r.rushing_yards) - q.ryd; t.repa += num(r.rushing_epa) - q.repa;
    t.dhit += num(r.def_qb_hits);
    o.hitA += num(r.def_qb_hits);   // the hits this defence put on the other team's quarterback
    o.oatt += num(r.attempts); o.osk += num(r.sacks_suffered); o.opepa += num(r.passing_epa);
    o.otgt += num(r.targets); o.otepa += num(r.receiving_epa); o.otyd += num(r.receiving_yards);
    o.ocar += num(r.carries) - q.car; o.oryd += num(r.rushing_yards) - q.ryd; o.orepa += num(r.rushing_epa) - q.repa;
  }
  return T;
}
function blend(prior, cur) {
  /* 2025 scaled to PRIOR_GAMES games, plus every 2026 game at full weight */
  const out = {};
  for (const t of new Set([...Object.keys(prior), ...Object.keys(cur)])) {
    const p = prior[t], c = cur[t], o = {};
    const sp = p && p.g ? PRIOR_GAMES / p.g : 0;
    for (const k of Object.keys(p || c)) o[k] = (p ? p[k] * sp : 0) + (c ? c[k] : 0);
    o.g26 = c ? c.g : 0;
    out[t] = o;
  }
  return out;
}
const div = (a, b) => b > 0 ? a / b : null;
function rankOf(values, t, higherBetter) {
  const arr = Object.entries(values).filter(([, v]) => v != null).sort((a, b) => higherBetter ? b[1] - a[1] : a[1] - b[1]);
  const i = arr.findIndex(([k]) => k === t);
  return i < 0 ? null : i + 1;
}
/* Eight ratings, each in league standard deviations (0 is average, + is better for that side).
   Every row on the page sets one against its mirror, measured on the same numbers:
     qb    vs passD   pass EPA per dropback, made and allowed
     ol    vs front   sack rate and QB-hit rate (sacks included), allowed and forced
     rb    vs runD    EPA and yards per carry by anyone but a quarterback, made and allowed
     rec   vs db      EPA and yards per target, made and allowed                            */
function ratings(team25, team26, player25, player26) {
  const B = blend(teamTotals(team25, qbRushing(player25)), teamTotals(team26, qbRushing(player26)));
  const teams = Object.keys(B).filter(t => t.length >= 2 && t.length <= 3);
  const M = {};
  for (const t of teams) {
    const x = B[t], db = x.att + x.sk, odb = x.oatt + x.osk;
    M[t] = {
      pass_epa: div(x.pepa, db), o_pass_epa: div(x.opepa, odb),
      sack_rate: div(x.sk, db), hit_rate: div(x.hitA, db), o_sack_rate: div(x.osk, odb), o_hit_rate: div(x.dhit, odb),
      rush_epa: div(x.repa, x.car), ypc: div(x.ryd, x.car), o_rush_epa: div(x.orepa, x.ocar), o_ypc: div(x.oryd, x.ocar),
      rec_epa: div(x.tepa, x.tgt), rec_ypt: div(x.tyd, x.tgt), o_rec_epa: div(x.otepa, x.otgt), o_rec_ypt: div(x.otyd, x.otgt),
      g26: x.g26,
    };
  }
  const col = k => Object.fromEntries(teams.map(t => [t, M[t][k]]));
  const z = (k, sign) => {
    const v = teams.map(t => M[t][k]).filter(x => x != null); const mu = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 1;
    return t => M[t][k] == null ? 0 : sign * (M[t][k] - mu) / sd;
  };
  const RATE = {
    qb: t => z('pass_epa', 1)(t),
    passD: t => z('o_pass_epa', -1)(t),
    ol: t => (z('sack_rate', -1)(t) + z('hit_rate', -1)(t)) / 2,
    front: t => (z('o_sack_rate', 1)(t) + z('o_hit_rate', 1)(t)) / 2,
    rb: t => (z('rush_epa', 1)(t) + z('ypc', 1)(t)) / 2,
    runD: t => (z('o_rush_epa', -1)(t) + z('o_ypc', -1)(t)) / 2,
    rec: t => (z('rec_epa', 1)(t) + z('rec_ypt', 1)(t)) / 2,
    db: t => (z('o_rec_epa', -1)(t) + z('o_rec_ypt', -1)(t)) / 2,
  };
  /* each rating restandardised, so a gap of 1 means one league standard deviation on every row */
  const Z = {}, R = {};
  for (const u of Object.keys(RATE)) {
    const raw = Object.fromEntries(teams.map(t => [t, RATE[u](t)]));
    const v = Object.values(raw), mu = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 1;
    Z[u] = Object.fromEntries(teams.map(t => [t, Math.round((raw[t] - mu) / sd * 100) / 100]));
    R[u] = Object.fromEntries(teams.map(t => [t, rankOf(Z[u], t, true)]));
  }
  const sub = (k, higherBetter) => t => rankOf(col(k), t, higherBetter);
  const r2 = v => v == null ? null : Math.round(v * 100) / 100, pc = v => v == null ? null : Math.round(v * 1000) / 10, r1 = v => v == null ? null : Math.round(v * 10) / 10;
  const S = {};
  for (const t of teams) {
    const m = M[t];
    S[t] = {
      qb: [['EPA per dropback', r2(m.pass_epa), sub('pass_epa', true)(t)]],
      ol: [['sack rate allowed', pc(m.sack_rate), sub('sack_rate', false)(t), '%'], ['QB hits allowed per dropback', pc(m.hit_rate), sub('hit_rate', false)(t), '%']],
      rb: [['EPA per carry, QB runs out', r2(m.rush_epa), sub('rush_epa', true)(t)], ['yards per carry, QB runs out', r1(m.ypc), sub('ypc', true)(t)]],
      rec: [['EPA per target', r2(m.rec_epa), sub('rec_epa', true)(t)], ['yards per target', r1(m.rec_ypt), sub('rec_ypt', true)(t)]],
      front: [['sack rate', pc(m.o_sack_rate), sub('o_sack_rate', true)(t), '%'], ['QB hits per dropback', pc(m.o_hit_rate), sub('o_hit_rate', true)(t), '%']],
      db: [['EPA per target allowed', r2(m.o_rec_epa), sub('o_rec_epa', false)(t)], ['yards per target allowed', r1(m.o_rec_ypt), sub('o_rec_ypt', false)(t)]],
    };
  }
  return { teams, Z, R, S, g26: Object.fromEntries(teams.map(t => [t, M[t].g26])) };
}

/* ---------------- Deep Dive: who is playing ---------------- */
/* Each unit's names are the coming game's lineup: the team's latest depth chart before kickoff,
   passing over anyone who will not play. The first rule that speaks wins:
     1. the roster: anyone not ACT on it, or now on another team. INA (inactive for the last game)
        waits for the report: practising this week (full or limited) clears it, otherwise he is out.
     2. the official game status, once the team has filed it (a game status on the week's report, or a
        report of the last practice before the game, two days before kickoff or later): Out or Doubtful
        is out; Questionable with no practice on that report is out (in weeks 2 to 4, 6 of the 10
        Questionable starters who had not practised sat); Questionable and practising is listed with a
        tag; a filed report that does not designate him clears him.
     3. before the team files, ESPN's list where it says Out, Doubtful, injured reserve or suspended.
        ESPN's Questionable clears no one: from Tuesday to Friday it is a placeholder. (On 2026-10-07
        ESPN moved Hendrickson, Gonzalez, Elliss, Banks and DeVonta Smith from Tuesday's Out to
        Questionable, none of them practising, and the Deep Dive listed all five as playing.)
     4. before the team files: out in the team's last game (its last game, not last week's, so a bye
        counts) and not practising since: the report's practice status, or ESPN's practice note where
        it is newer than the report or the report has no row for the team yet. With no practice
        reported at all this week he is still out.
     5. ESPN Questionable with no practice on the last practice day before kickoff (its note says so)
        is out, as in rule 2.
     6. anyone else not practising is listed, tagged "not practising"; and the quarterback row names
        the next quarterback on the chart whenever the starter carries a tag.
   A team with no chart within ten days of kickoff falls back on 2026 usage, still minus the out.
   A chart starter passed over is kept as out, so the page can say who is missing and why. */
const STATUS = { RES: 'on injured reserve', PUP: 'on the PUP list', NON: 'on the non-football injury list', SUS: 'suspended',
  RET: 'retired', CUT: 'released', DEV: 'on the practice squad', EXE: 'on the exempt list', TRD: 'traded', TRT: 'traded' };
const normName = s => String(s || '').toLowerCase().replace(/[.'’,]/g, '').replace(/-/g, ' ')
  .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '').replace(/\s+/g, ' ').trim();
const lc = s => String(s || '').trim().toLowerCase();
const CHART_DAYS = 10;
const isQB = p => p === 'QB', isRB = p => ['RB', 'HB', 'FB'].includes(p), isRec = p => ['WR', 'TE'].includes(p);
const isOL = p => ['T', 'G', 'C', 'OL', 'OT', 'OG'].includes(p), isFront = p => ['DE', 'DT', 'NT', 'DL', 'LB', 'OLB', 'ILB', 'MLB', 'EDGE'].includes(p);
const isDB = p => ['CB', 'S', 'FS', 'SS', 'DB', 'SAF'].includes(p);
const FRONT_SLOTS = ['LDE', 'LDT', 'NT', 'RDT', 'RDE', 'DE', 'DT', 'WLB', 'LILB', 'MLB', 'RILB', 'SLB', 'LOLB', 'ROLB', 'OLB', 'ILB', 'LB'];
const DB_SLOTS = ['LCB', 'RCB', 'SS', 'FS', 'NB', 'CB', 'S'];
const OL_SLOTS = ['LT', 'LG', 'C', 'RG', 'RT'];

/* dates as Eastern calendar days, "YYYY-MM-DD", so they compare as strings */
const etDay = iso => { const d = new Date(iso); return isNaN(d) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); };
const addDays = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const weekdayOf = day => WEEKDAYS[new Date(day + 'T12:00:00Z').getUTCDay()];

/* the report's practice column, and ESPN's practice notes ("did not participate at practice Thursday",
   "was a non-participant", "remained absent from practice", "was limited", "practiced in full") */
const practiceOf = (s, why) => /did not/i.test(s || '') ? (/not injury related/i.test(why || '') ? 'rest' : 'dnp') : /limited/i.test(s || '') ? 'limited' : /full/i.test(s || '') ? 'full' : null;
const N_ANY = /practi[cs]|participa|warmups|walkthrough|workout|\bDNP\b/i;
const N_DNP = /\b(did not|didn'?t|won'?t|will not|unable to) (participate|practice|take part)|non-?participant|\bmiss(?:ed|es|ing)?\b[^,.;]*practice|\babsent\b|\b(?:not|wasn'?t|weren'?t) (?:present|spotted|seen|on the field)|\bsat out\b|\b(?:held|kept) out\b|\bDNP\b/i;
const N_LIM = /\blimited\b/i, N_FULL = /\bfull(?:[- ]go|y)?\b|\bin full\b/i;
function notePractice(text, noteDay) {
  if (!text || !noteDay) return null;
  let best = null;
  for (const c of String(text).split(/(?<=[.;])\s+|,\s*(?:and|but|after|before|while)\s+|\s+(?:after|before|while|and then)\s+/i)) {
    if (!N_ANY.test(c)) continue;
    const st = N_DNP.test(c) ? 'dnp' : N_LIM.test(c) ? 'limited' : N_FULL.test(c) ? 'full' : null;
    if (!st) continue;
    const days = c.toLowerCase().match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/g);
    let day = noteDay;
    if (days) { const want = days[days.length - 1]; for (let i = 0; i < 7; i++) { const d = addDays(noteDay, -i); if (weekdayOf(d) === want) { day = d; break; } } }
    if (!best || day > best.day) best = { st, day };
  }
  return best;
}

function lineups(src) {
  const { roster, injuries, chart, espn, player26, snaps26, week, kicks, lastGame, teams } = src;
  /* the report's newest practice: nflverse files a day's report the next morning (about 14:30 UTC),
     so the file's Last-Modified day, less one, is the last practice day it holds */
  const reportDay = src.reportModified && isFinite(Date.parse(src.reportModified)) ? addDays(etDay(src.reportModified), -1) : '';
  /* the roster, by id and by team and name */
  const byId = {}, byTeamName = {}, byPfr = {};
  for (const r of roster || []) {
    if (!r.gsis_id) continue;
    const e = { id: r.gsis_id, n: r.full_name, team: ab(r.team), status: r.status, pos: r.depth_chart_position || r.position };
    byId[r.gsis_id] = e;
    for (const nm of new Set([r.full_name, `${r.football_name || r.first_name} ${r.last_name}`])) byTeamName[`${e.team}|${normName(nm)}`] ??= r.gsis_id;
    if (r.pfr_id) byPfr[r.pfr_id] = r.gsis_id;
  }
  const idOf = (team, name, id) => (id && byId[id]) ? id : (byTeamName[`${team}|${normName(name)}`] || null);
  /* this week's report, and each week's by id for the team's last game */
  const rep = {}, byWeek = {}, teamRows = {}, teamStatus = {};
  for (const r of injuries || []) {
    if (r.season_type && r.season_type !== 'REG') continue;
    (byWeek[+r.week] ??= {})[r.gsis_id] = r;
    if (+r.week === week) {
      rep[r.gsis_id] = r; teamRows[ab(r.team)] = true;
      if (lc(r.report_status)) teamStatus[ab(r.team)] = true;
    }
  }
  const kickDay = t => kicks[t] ? etDay(kicks[t]) : '';
  /* filed: the team's report carries game statuses, or holds the last practice before the game */
  const filed = {};
  for (const t of teams) filed[t] = !!(teamStatus[t] || (teamRows[t] && reportDay && kickDay(t) && reportDay >= addDays(kickDay(t), -2)));
  const esp = {};
  for (const e of espn || []) esp[`${e.team}|${normName(e.name)}`] = e;
  const reported = Object.keys(rep).length > 0;

  /* practice this week: the report's, or ESPN's note where it is newer; "unlisted" is a team that has
     filed a practice report without him on it (he practised in full) */
  function practice(id, team, name) {
    const x = id && rep[id];
    let base = null;
    if (x && practiceOf(x.practice_status)) base = { st: practiceOf(x.practice_status, x.practice_primary_injury), day: reportDay, src: 'report' };
    else if (!x && teamRows[team]) base = { st: 'unlisted', day: reportDay, src: 'report' };
    const e = esp[`${team}|${normName(name)}`];
    const since = lastGame[team] && lastGame[team].kick ? etDay(lastGame[team].kick) : '';
    const noteDay = e && e.date ? etDay(e.date) : '';
    const n = noteDay && (!since || noteDay > since) ? notePractice(`${e.comment || ''} ${e.long || ''}`, noteDay) : null;
    if (n && (!base || !base.day || n.day > base.day)) return { ...n, src: 'espn' };
    return base || { st: null };
  }
  const practising = p => p.st === 'limited' || p.st === 'full' || p.st === 'unlisted';

  function ruling(id, team, name, r) {
    const x = id && rep[id], pr = practice(id, team, name), e = esp[`${team}|${normName(name || (r && r.n))}`];
    const injury = lc((x && (x.report_primary_injury || x.practice_primary_injury)) || (e && e.type));
    const w = injury ? ` (${injury})` : '';
    /* 2. the official game status */
    if (x && lc(x.report_status)) {
      const st = lc(x.report_status);
      if (st === 'out' || st === 'doubtful') return { out: true, why: `${st}${w}` };
      if (st === 'questionable') {
        if (pr.st === 'dnp') return { out: true, why: `questionable${w} and not practising before the game` };
        return { out: false, q: `questionable${injury ? `: ${injury}` : ''}`, practising: practising(pr) };
      }
      return { out: false, practising: practising(pr) };
    }
    if (filed[team]) return { out: false, practising: practising(pr) };
    /* 3. ESPN's rulings, before the team files */
    if (e) {
      const st = lc(e.status), what = lc(e.type);
      if (st === 'injured reserve') return { out: true, why: 'on injured reserve, per ESPN' };
      if (st === 'out' || st === 'doubtful' || st === 'suspension') return { out: true, why: `${st === 'suspension' ? 'suspended' : st}${what && st !== 'suspension' ? ` (${what})` : ''}, per ESPN` };
    }
    /* 4. out in the team's last game and not practising since */
    const lg = lastGame[team], p = lg && id && byWeek[lg.week] && byWeek[lg.week][id];
    if (p && lc(p.report_status) === 'out' && !practising(pr)) {
      return { out: true, why: `out in week ${lg.week} and ${pr.st === 'dnp' ? 'not practising' : 'no practice reported since'}${w}` };
    }
    /* 5. ESPN Questionable with no practice on the last practice day before kickoff */
    const eq = e && lc(e.status) === 'questionable';
    if (eq && pr.src === 'espn' && pr.st === 'dnp' && kickDay(team) && pr.day >= addDays(kickDay(team), -2)) {
      return { out: true, why: `questionable${w} and not practising ${weekdayOf(pr.day).replace(/^./, c => c.toUpperCase())}, per ESPN` };
    }
    /* 6. listed, with what is known */
    const tags = [];
    if (eq) tags.push(`questionable${injury ? `: ${injury}` : ''}`);
    if (pr.st === 'dnp') tags.push(eq ? 'not practising' : `not practising${injury ? `: ${injury}` : ''}`);
    return { out: false, ...(tags.length ? { q: tags.join(', ') } : {}), practising: practising(pr) };
  }
  function avail(id, team, name) {
    const r = id && byId[id];
    if (r) {
      if (r.team !== team) return { out: true, why: `with ${r.team} now` };
      if (r.status && r.status !== 'ACT' && r.status !== 'INA') return { out: true, why: STATUS[r.status] || 'off the active roster' };
    }
    const a = ruling(id, team, name, r);
    if (a.out) return a;
    /* INA: inactive for the last game; only a full or limited practice this week clears it */
    const pr = practice(id, team, name);
    if (r && r.status === 'INA' && !(pr.st === 'limited' || pr.st === 'full')) return { out: true, why: 'inactive last game' };
    const { practising: _, ...rest } = a;
    return rest;
  }

  /* 2026 usage on this team, by id: the order inside a unit, and the fallback */
  const use = {};
  const U = (team, id) => ((use[team] ??= {})[id] ??= { att: 0, db: 0, car: 0, tgt: 0, sk: 0, hit: 0, tfl: 0, osn: 0, dsn: 0, lastWk: 0, lastAtt: 0 });
  for (const r of player26 || []) {
    if (r.season_type && r.season_type !== 'REG') continue;
    const team = ab(r.team), id = idOf(team, r.player_display_name || r.player_name, r.player_id) || r.player_id; if (!id) continue;
    const e = U(team, id);
    e.att += num(r.attempts); e.db += num(r.attempts) + num(r.sacks_suffered); e.car += num(r.carries); e.tgt += num(r.targets);
    e.sk += num(r.def_sacks); e.hit += num(r.def_qb_hits); e.tfl += num(r.def_tackles_for_loss);
    if (num(r.attempts) > 0 && +r.week >= e.lastWk) { e.lastWk = +r.week; e.lastAtt = num(r.attempts); }
    e.pos ??= r.position; e.n ??= r.player_display_name || r.player_name;
  }
  for (const r of snaps26 || []) {
    if (r.game_type && r.game_type !== 'REG') continue;
    const team = ab(r.team), id = (r.pfr_player_id && byPfr[r.pfr_player_id]) || idOf(team, r.player, null) || `pfr:${r.pfr_player_id || r.player}`;
    const e = U(team, id); e.osn += num(r.offense_snaps); e.dsn += num(r.defense_snaps); e.pos ??= r.position; e.n ??= r.player;
  }
  const lastPass = {};
  for (const t of Object.keys(use)) lastPass[t] = Math.max(0, ...Object.values(use[t]).map(e => e.lastWk));
  const usage = (team, id) => (use[team] && use[team][id]) || { att: 0, db: 0, car: 0, tgt: 0, sk: 0, hit: 0, tfl: 0, osn: 0, dsn: 0, lastWk: 0, lastAtt: 0 };
  const frontKey = e => 2 * e.sk + e.hit + e.tfl + e.dsn / 100;

  /* the chart: each team's latest snapshot before its kickoff */
  const snap = {};
  for (const r of chart || []) {
    if (r.pos_grp === 'Special Teams') continue;
    const team = ab(r.team), k = kicks[team];
    if (k && r.dt >= k) continue;
    if (!snap[team] || r.dt > snap[team].dt) snap[team] = { dt: r.dt, rows: [] };
    if (r.dt === snap[team].dt) snap[team].rows.push(r);
  }
  let repaired = 0, chartUsed = '';
  const out = {}, passedLog = [];
  for (const team of teams) {
    const s = snap[team], kick = kicks[team] || src.now || new Date().toISOString();
    const fresh = s && (Date.parse(kick) - Date.parse(s.dt)) / 864e5 <= CHART_DAYS;
    const person = (id, name, chartPos) => {
      const r = id && byId[id], a = avail(id, team, name);
      return { id, n: (r && r.n) || name, pos: (r && r.pos) || chartPos, ...a };
    };
    const used = new Set(), passed = {};
    const shown = p => ({ ...(p.id ? { id: p.id } : {}), n: p.n, pos: p.pos, ...(p.q ? { q: p.q } : {}) });
    const entry = (p, unit) => {
      if (!p.out) return shown(p);
      ((passed[unit] ??= []).some(x => x.n === p.n)) || passed[unit].push({ ...(p.id ? { id: p.id } : {}), n: p.n, pos: p.pos, why: p.why });
      return null;
    };
    const L = {};
    let next = null;
    if (fresh) {
      chartUsed = chartUsed > s.dt ? chartUsed : s.dt;
      const rows = s.rows.map(r => {
        let id = r.gsis_id && byId[r.gsis_id] ? r.gsis_id : null;
        if (!id) { id = idOf(team, r.player_name, null); if (id) repaired++; }
        /* no roster to check it against: the chart's own id still finds him in the injury report */
        if (!id && /^00-\d{7}$/.test(r.gsis_id || '')) id = r.gsis_id;
        return { id, name: r.player_name, slot: r.pos_abb, rank: +r.pos_rank || 99, grp: r.pos_grp || '' };
      });
      const key = r => r.id || `name:${normName(r.name)}`;
      /* the first available player in each slot, in the slots' order; anyone ahead of him is out */
      const fill = (slots, unit, per = 1, filter = () => true) => {
        const picks = [];
        for (const slot of slots) {
          const inSlot = rows.filter(r => r.slot === slot && filter(r)).sort((a, b) => a.rank - b.rank);
          let got = 0;
          for (const r of inSlot) {
            if (got >= per) break;
            if (used.has(key(r))) continue;
            const p = person(r.id, r.name, r.slot), e = entry(p, unit);
            if (!e) continue;
            used.add(key(r)); picks.push({ ...e, u: usage(team, r.id) }); got++;
          }
        }
        return picks;
      };
      const strip = arr => arr.map(({ u, ...e }) => e);
      L.qb = strip(fill(['QB'], 'qb'));
      /* the next quarterback on the chart, available, for a starter who carries a tag */
      if (L.qb[0] && L.qb[0].q) {
        for (const r of rows.filter(r => r.slot === 'QB').sort((a, b) => a.rank - b.rank)) {
          if (used.has(key(r))) continue;
          const p = person(r.id, r.name, r.slot);
          if (!p.out) { next = shown(p); break; }
        }
      }
      L.ol = strip(fill(OL_SLOTS, 'ol'));
      L.rb = strip(fill(['RB'], 'rb', 2));
      /* receivers: the chart ranks wide receivers 1..n across its three WR slots; the starters are the first three */
      const wr = rows.filter(r => r.slot === 'WR').sort((a, b) => a.rank - b.rank);
      const recPicks = [];
      for (const r of wr) { if (recPicks.length >= 3) break; if (used.has(key(r))) continue; const p = person(r.id, r.name, 'WR'), e = entry(p, 'rec'); if (!e) continue; used.add(key(r)); recPicks.push({ ...e, u: usage(team, r.id) }); }
      recPicks.push(...fill(['TE'], 'rec'));
      L.rec = strip(recPicks.sort((a, b) => b.u.tgt - a.u.tgt).slice(0, 3));
      const defSlots = [...new Set(rows.filter(r => /^Base/.test(r.grp) || /D$/.test(r.grp)).map(r => r.slot))];
      L.front = strip(fill(defSlots.filter(x => FRONT_SLOTS.includes(x)), 'front').sort((a, b) => frontKey(b.u) - frontKey(a.u)).slice(0, 3));
      L.db = strip(fill(defSlots.filter(x => DB_SLOTS.includes(x)), 'db').sort((a, b) => b.u.dsn - a.u.dsn).slice(0, 3));
    } else {
      /* no chart: 2026 usage on this team, current roster only, minus the out */
      const mine = Object.entries(use[team] || {});
      const top = (filter, score, k, unit, record = true) => {
        const picks = [];
        for (const [id, e] of mine.filter(([id, e]) => filter((byId[id] && byId[id].pos) || e.pos || '') && score(e) > 0).sort((a, b) => score(b[1]) - score(a[1]))) {
          if (picks.length >= k) break;
          const p = person(byId[id] ? id : null, e.n, e.pos), x = record ? entry(p, unit) : (p.out ? null : shown(p));
          if (x) picks.push(x);
        }
        return picks;
      };
      /* the quarterback: whoever threw most in the team's last game, then the season */
      const qbScore = e => (e.lastWk === lastPass[team] ? 1e6 * e.lastAtt : 0) + e.att;
      L.qb = top(isQB, qbScore, 1, 'qb');
      if (L.qb[0] && L.qb[0].q) next = top(isQB, qbScore, 2, 'qb', false).find(p => p.n !== L.qb[0].n) || null;
      L.ol = top(isOL, e => e.osn, 5, 'ol');
      L.rb = top(isRB, e => e.car, 2, 'rb');
      L.rec = top(isRec, e => e.tgt, 3, 'rec');
      L.front = top(isFront, frontKey, 3, 'front');
      L.db = top(isDB, e => e.dsn, 3, 'db');
    }
    for (const u of Object.keys(passed)) for (const p of passed[u]) passedLog.push(`${team} ${u}: ${p.n} (${p.pos}) ${p.why}`);
    /* whose numbers the passing rank mostly is, when that is not the starter's */
    let note = null;
    const qbs = Object.entries(use[team] || {}).filter(([, e]) => isQB(e.pos || '') && e.db > 0).sort((a, b) => b[1].db - a[1].db);
    const tot = qbs.reduce((a, [, e]) => a + e.db, 0);
    if (L.qb[0] && qbs.length && tot > 0) {
      const [lid, le] = qbs[0], ln = (byId[lid] && byId[lid].n) || le.n;
      if (ln !== L.qb[0].n && le.db / tot > 0.5) note = `The passing numbers are the team's, mostly ${ln}'s dropbacks.`;
    }
    out[team] = { L, out: passed, next, note, chart: fresh ? s.dt : null };
  }
  return { teams: out, chart: chartUsed, reported, reportDay, filed, repaired, passedLog };
}

function units(src) {
  const RT = ratings(src.team25, src.team26, src.player25, src.player26);
  const { teams, Z, R, S, g26 } = RT;
  if (teams.length < 32) throw new Error(`the stats covered ${teams.length} teams`);
  const LU = lineups({ ...src, teams });
  const U = {};
  for (const t of teams) {
    const lu = LU.teams[t];
    const unit = u => ({ rank: R[u][t], z: Z[u][t], who: lu.L[u] || [], ...(lu.out[u] ? { out: lu.out[u] } : {}), stats: S[t][u] });
    U[t] = {
      g26: g26[t],
      qb: { ...unit('qb'), ...(lu.next ? { next: lu.next } : {}), ...(lu.note ? { note: lu.note } : {}) }, ol: unit('ol'), rb: unit('rb'), rec: unit('rec'), front: unit('front'), db: unit('db'),
      vs: { passD: { rank: R.passD[t], z: Z.passD[t] }, runD: { rank: R.runD[t], z: Z.runD[t] } },
    };
  }
  return { U, LU };
}

/* ---------------- the week, its kickoffs and each team's last game ---------------- */
function schedule(games, now) {
  const st = seasonState(games);
  const rows = games.filter(r => r.season === String(SEASON) && r.game_type === 'REG');
  const kicks = {}, lastGame = {};
  for (const r of rows.filter(r => +r.week === st.week)) { const k = etToISO(r.gameday, r.gametime); kicks[ab(r.away_team)] = k; kicks[ab(r.home_team)] = k; }
  /* each team's last game before this week: rule 4 looks there, so a team back from a bye is covered */
  for (const r of rows.filter(r => +r.week < st.week)) {
    const k = etToISO(r.gameday, r.gametime);
    for (const t of [ab(r.away_team), ab(r.home_team)]) if (!lastGame[t] || +r.week > lastGame[t].week) lastGame[t] = { week: +r.week, kick: k };
  }
  return { ...st, kicks, lastGame, now };
}

/* the chart file holds every snapshot since March (60 MB): keep the header and the last few weeks before parsing */
async function getChart(sinceISO) {
  const { text, lastModified } = await fetchText(URLS.depth26);
  LAST_MODIFIED.depth26 = lastModified;
  const nl = text.indexOf('\n'), since = sinceISO.slice(0, 10);
  const keep = [text.slice(0, nl)];
  for (const line of text.slice(nl + 1).split('\n')) if (line.slice(0, 10) >= since) keep.push(line);
  return parseCSV(keep.join('\n') + '\n');
}

/* ---------------- lineups kept per week, and graded against who played ---------------- */
/* tools/out/weekN-lineups.json: each team's lineup as the last run before its kickoff left it */
function freezeLineups(file, week, U, kicks, nowISO) {
  let F = { season: SEASON, week, teams: {} };
  try { const old = JSON.parse(fs.readFileSync(file, 'utf8')); if (old.season === SEASON && old.week === week) F = old; } catch (e) { /* a new week */ }
  let changed = 0;
  for (const t of Object.keys(kicks)) {
    if (!U[t] || Date.parse(kicks[t]) <= Date.parse(nowISO)) continue;   // kicked off: keep what was shown before
    const names = Object.fromEntries(['qb', 'ol', 'rb', 'rec', 'front', 'db'].map(u => [u, U[t][u].who.map(p => ({ id: p.id || null, n: p.n, pos: p.pos, ...(p.q ? { q: p.q } : {}) }))]));
    F.teams[t] = { kick: kicks[t], built_at: nowISO, units: names };
    changed++;
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(F, null, 1) + '\n');
  return changed;
}
/* every named player against nflverse's snap counts for that game: a starter with no snaps did not play */
function gradeLineups(F, snaps, roster) {
  const pfrOf = {}; for (const r of roster || []) if (r.gsis_id && r.pfr_id) pfrOf[r.gsis_id] = r.pfr_id;
  /* by id where the roster gives one; else by name, or first initial and last name ("Greg" and "Gregory") */
  const short = n => { const w = normName(n).split(' '); return w.length > 1 ? `${w[0][0]}.${w.slice(1).join(' ')}` : w[0]; };
  const played = new Set(), byName = new Set(), teamsIn = new Set();
  for (const r of snaps || []) {
    if (+r.week !== F.week || (r.game_type && r.game_type !== 'REG')) continue;
    const t = ab(r.team); teamsIn.add(t);
    if (num(r.offense_snaps) + num(r.defense_snaps) > 0) { played.add(r.pfr_player_id); byName.add(`${t}|${normName(r.player)}`); byName.add(`${t}|${short(r.player)}`); }
  }
  const missed = []; let named = 0;
  for (const [t, e] of Object.entries(F.teams)) {
    if (!teamsIn.has(t)) continue;
    for (const [u, list] of Object.entries(e.units)) for (const p of list) {
      named++;
      const ok = (p.id && pfrOf[p.id] && played.has(pfrOf[p.id])) || byName.has(`${t}|${normName(p.n)}`) || byName.has(`${t}|${short(p.n)}`);
      if (!ok) missed.push({ team: t, unit: u, ...p });
    }
  }
  return { named, missed, teams: [...teamsIn].filter(t => F.teams[t]).length };
}
const GRADE_WARN = 0.05;   // above 5% of named starters without a snap, or any quarterback, the run warns
function gradeWeeks(outDir, current, snaps, roster) {
  for (let w = current - 1; w >= Math.max(1, current - 3); w--) {
    const f = path.join(outDir, `week${w}-lineups.json`), g = path.join(outDir, `week${w}-lineups-grade.md`);
    if (!fs.existsSync(f)) continue;
    const F = JSON.parse(fs.readFileSync(f, 'utf8'));
    const G = gradeLineups(F, snaps, roster);
    if (!G.teams) continue;
    const share = G.named ? G.missed.length / G.named : 0, qbs = G.missed.filter(m => m.unit === 'qb');
    const body = [`# Week ${w} Deep Dive lineups against who played`, '',
      `Graded ${new Date().toISOString().slice(0, 10)} from nflverse's snap counts: ${G.teams} teams, ${G.named} players named, ${G.missed.length} without a snap (${(share * 100).toFixed(1)}%).`, '',
      ...(G.missed.length ? G.missed.map(m => `- ${m.team} ${m.unit}: ${m.n} (${m.pos}${m.q ? ', ' + m.q : ''})`) : ['- every named player played'])].join('\n') + '\n';
    const undated = t => t.replace(/^Graded \d{4}-\d\d-\d\d /m, 'Graded ');
    if (!fs.existsSync(g) || undated(fs.readFileSync(g, 'utf8')) !== undated(body)) fs.writeFileSync(g, body);
    console.log(`week ${w} lineups graded: ${G.missed.length} of ${G.named} named players without a snap`);
    if (share > GRADE_WARN || qbs.length) warn(`week ${w} Deep Dive: ${G.missed.length} of ${G.named} named players did not play${qbs.length ? `, quarterback ${qbs.map(q => q.team + ' ' + q.n).join(', ')}` : ''} (tools/out/week${w}-lineups-grade.md)`);
  }
}

/* opts: out, root, and from pull-week.js the week, its games ({away, home, kick}) and ESPN's injury
   list ([{team, name, pos, status, type, comment, long, date}]). Run alone, it works the week and
   kickoffs out itself; the week always comes from the nflverse schedule (tools/lib.js seasonState). */
async function build(opts = {}) {
  const root = opts.root || path.resolve(__dirname, '..');
  const out = opts.out || path.join(root, 'data');
  const toolsOut = opts.toolsOut || path.join(root, 'tools', 'out');
  const cacheDir = opts.cache || path.join(root, 'tools', '.cache');
  const now = opts.now || new Date().toISOString();
  fs.mkdirSync(out, { recursive: true });

  /* every required source first: nothing is written unless all of them arrived */
  const names = ['games', 'roster26', 'team25', 'team26', 'player25', 'player26', 'injuries26', 'snaps26'];
  const got = await Promise.allSettled(names.map(n => getCSV(n, opts.fetch)));
  const D = {}, failed = [];
  names.forEach((n, i) => {
    if (got[i].status === 'fulfilled') D[n] = got[i].value;
    else if (OPTIONAL.has(n)) { D[n] = []; warn(`${n} unavailable (${got[i].reason && got[i].reason.message}): the Deep Dive lists keep the chart's order without snap counts`); }
    else failed.push(`${n}: ${got[i].reason && got[i].reason.message}`);
  });
  if (failed.length) throw new Error(`required source unavailable, nothing written: ${failed.join('; ')}`);
  const S = schedule(D.games, now);
  if (S.phase === 'none') throw new Error(`the nflverse schedule has no ${SEASON} regular season`);
  if (opts.week && opts.week !== S.week) console.log(`note: asked for week ${opts.week}, the schedule's week is ${S.week}; using ${S.week}`);
  const week = S.week;
  /* pull-week.js's kickoffs (ESPN's) where it has them, the schedule's otherwise */
  const kicks = { ...S.kicks };
  if (opts.games && (!opts.week || opts.week === week)) for (const g of opts.games) if (g.kick) { kicks[g.away] = g.kick; kicks[g.home] = g.kick; }
  const firstKick = Object.values(kicks).filter(Boolean).sort()[0] || now;
  let chart;
  try { chart = await getChart(new Date(Math.min(Date.parse(firstKick), Date.parse(now)) - CHART_DAYS * 864e5).toISOString()); }
  catch (e) { throw new Error(`required source unavailable, nothing written: depth26: ${e.message}`); }
  for (const n of ['injuries26', 'depth26', 'roster26']) console.log(`${n}: Last-Modified ${LAST_MODIFIED[n] || 'not given'}`);
  const espn = Array.isArray(opts.espn) ? opts.espn : null;
  if (!espn) warn('ESPN injury list not available: the lineups rest on the nflverse report alone');

  /* the chip is the hub's own file, not a download: if it is missing or short, keep the chip as it was and say so */
  let RK = null;
  try { RK = ranks(root, D.games); } catch (e) { warn(`ranks2026.js kept: ${e.message}`); }
  const P = players(D.roster26);
  const { U, LU } = units({ team25: D.team25, team26: D.team26, player25: D.player25, player26: D.player26, snaps26: D.snaps26,
    roster: D.roster26, injuries: D.injuries26, chart, espn, week, kicks, lastGame: S.lastGame, now, reportModified: LAST_MODIFIED.injuries26 });

  const day = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }) : '';
  const lineSrc = [LU.chart ? `depth charts of ${day(LU.chart)}` : 'season usage (no current depth chart)',
    LU.reported ? `the week ${week} injury report${LU.reportDay ? ` (practice through ${day(LU.reportDay + 'T16:00:00Z')})` : ''}` : `the injury report (no week ${week} rows yet)`,
    espn && espn.length ? 'ESPN injuries' : null].filter(Boolean);
  const lineText = `Lineups from ${lineSrc.length > 1 ? lineSrc.slice(0, -1).join(', ') + ' and ' + lineSrc[lineSrc.length - 1] : lineSrc[0]}` +
    (espn && espn.length ? '' : `. ESPN's injury list could not be read on this run`) + (D.snaps26.length ? '' : `. Snap counts could not be read, so the order inside a unit is the chart's`);
  const META = { season: SEASON, week, phase: S.phase, built_at: now,
    report: { modified: LAST_MODIFIED.injuries26 || '', practice_day: LU.reportDay, filed: Object.keys(LU.filed).filter(t => LU.filed[t]).sort() },
    sources: { chart: LU.chart || null, espn: !!(espn && espn.length), snaps: D.snaps26.length > 0 } };

  /* everything arrived: write */
  if (RK) {
    fs.writeFileSync(path.join(out, 'ranks2026.js'), dataFile('RANKS26', RK.R, `const RANKS26_ASOF = ${JSON.stringify(RK.asof)};\nconst RANKS26_SRC = ${JSON.stringify({ file: 'elo/data/model.json', built_at: RK.built })};\n`));
    console.log(`ranks2026.js: Team Rankings order, #1 ${Object.keys(RK.R).find(t => RK.R[t].rank === 1)}, through ${RK.asof} (model.json built ${RK.built})`);
  }
  fs.writeFileSync(path.join(out, 'players2026.js'), dataFile('PLAYERS26', P));
  console.log(`players2026.js: ${Object.values(P).reduce((a, t) => a + Object.keys(t).length, 0)} names across ${Object.keys(P).length} teams`);
  fs.writeFileSync(path.join(out, 'units2026.js'), dataFile('UNITS26', U,
    `const UNITS26_BASIS = ${JSON.stringify(`2025 season counted as ${PRIOR_GAMES} games`)};\n` +
    `const UNITS26_LINEUPS = ${JSON.stringify(lineText)};\n` +
    `const UNITS26_META = ${JSON.stringify(META)};\n`));
  console.log(`units2026.js: ${Object.keys(U).length} teams, week ${week} (${S.phase}), 2026 games ${Math.min(...Object.values(U).map(u => u.g26))} to ${Math.max(...Object.values(U).map(u => u.g26))}; lineups from ${lineSrc.join(', ')}; ${LU.repaired} chart id(s) repaired by name; filed: ${META.report.filed.join(' ') || 'none'}`);
  for (const l of LU.passedLog) console.log('  passed over: ' + l);
  for (const t of Object.keys(U)) if (U[t].qb.next) console.log(`  ${t} qb: ${U[t].qb.who[0].n} (${U[t].qb.who[0].q}); next ${U[t].qb.next.n}`);

  /* the sources the smoke test checks the lineups against: the same files, not a later download */
  fs.mkdirSync(cacheDir, { recursive: true });
  const keepInj = D.injuries26.filter(r => r.season_type === 'REG' && (+r.week === week || Object.values(S.lastGame).some(g => g.week === +r.week)));
  fs.writeFileSync(path.join(cacheDir, 'lineup-sources.json'), JSON.stringify({ built_at: now, season: SEASON, week, report_modified: LAST_MODIFIED.injuries26 || '',
    injuries: keepInj, roster: D.roster26.map(r => ({ gsis_id: r.gsis_id, team: r.team, status: r.status, full_name: r.full_name, position: r.position })),
    games: D.games.filter(r => r.season === String(SEASON)).map(r => ({ game_id: r.game_id, season: r.season, game_type: r.game_type, week: r.week, gameday: r.gameday, gametime: r.gametime, away_team: r.away_team, home_team: r.home_team, away_score: r.away_score, home_score: r.home_score })),
    espn: espn || null, model_built_at: RK ? RK.built : null }));

  if (S.phase === 'regular') {
    fs.mkdirSync(toolsOut, { recursive: true });
    const n = freezeLineups(path.join(toolsOut, `week${week}-lineups.json`), week, U, kicks, now);
    console.log(`tools/out/week${week}-lineups.json: ${n} team(s) before kickoff updated`);
  }
  gradeWeeks(toolsOut, S.phase === 'regular' ? week : S.lastWeek + 1, D.snaps26, D.roster26);
  return { week, phase: S.phase, U, meta: META };
}

module.exports = { build, units, ratings, lineups, normName, notePractice, schedule, gradeLineups, URLS };
if (require.main === module) build().catch(e => { console.error(e.message || e); process.exit(1); });
