/* Smoke test for the built betting app: the string build.js returns, which nflbets/index.html
 * carries as the srcdoc of its Pick'em Record, Power Ratings and Bet Log frames.
 *
 *   node betting/tools/smoke.js
 *
 * Loads the built app in jsdom with fetch stubbed to serve betting/state.json, and checks:
 * the published season is shown, every tab but My Picks is there, a visitor's pick is kept in
 * their own storage and graded against the published result, and the embedded form (the
 * page around it sets window.EMBED_TAB and window.STATE_URL before the app runs) opens the
 * tab it is told to, headless, reading the season from where it is told.
 *
 * Then the published state against what it was built from (section 5): the season is the app's;
 * the injury report, roster and depth chart are this run's, and anything stale is shown as stale;
 * no quarterback who missed his team's last game on the injury report is counted back in before
 * this week's report clears him, and the absences card names the starter a change replaced; no
 * game played abroad keeps nflverse's 'Home'; every coming game has a call from every model (or
 * the model's status says why it has none); no call changes after its kickoff (against the last
 * committed state: BETTING_PREV_STATE names another file, for tests); a scoreboard final is
 * counted for every model at once, on the call frozen at kickoff; Team Rankings' record is the
 * season's and a rating that predates a final says so; a model that could not run is disclosed on
 * the Pick'em Record, and the weeks the Joker was refitted on after they were played are drawn
 * like every other week, with no mark, note or record without them; Joker Jr, a test model retired in October
 * 2026, is gone from a state this run wrote and draws nothing from one that still carries it.
 * Each holds whatever the week offers: a check with nothing to look at this week (no game graded
 * yet, no Thursday game, a bye) is skipped, and the rules themselves are also run on cases made
 * up here, so they are tested every week. It holds in every phase of a season (the week before
 * the opener with nothing graded and no injury report yet, week 1, between playoff rounds, after
 * the Super Bowl, a season the Joker cannot call): BETTING_STATE names a made-up state to test one.
 *
 * Section 6 is the X Bet Log: the app handed a stub of the page's window.XBETS (X's weeks and
 * deposit, as nflbets/build/xbets.js reads them from liveparlays/xbets.json), the same on every
 * device: X's weeks and balance, read only (no form, Remove, deposit box, backup card or Save), a
 * note never drawn as markup, the browser's own log and deposit left in its key as they were
 * whatever a frame saves, a file with no deposit, one that arrives late, one that could not be
 * read and one for another season. Without XBETS -- the app on its own -- every check above runs
 * on the browser's own log.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..', '..');
const { buildApp } = require('./build.js');
const html = buildApp().replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, '');
/* BETTING_STATE names another state to test (a made-up playoff round, say); the published one by default */
const state = fs.readFileSync(process.env.BETTING_STATE || path.join(ROOT, 'betting', 'state.json'), 'utf8');
const eloModel = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'model.json'), 'utf8');
const PATCHES = require('./patches.js');
const { season: APP_SEASON, key: APP_KEY } = PATCHES.season(fs.readFileSync(path.join(ROOT, 'betting', 'app', 'x_nfl_betting_model.html'), 'utf8'));
const MINE = 'x_nfl_viewer_picks_' + APP_SEASON;
for (const gone of ['index.html', 'admin.html'])
  if (fs.existsSync(path.join(ROOT, 'betting', gone))) throw new Error('betting/' + gone + ' is back; the betting site has no pages, the app lives in nflbets/index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('  FAIL', m); } };

function load(picks) {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/',
    beforeParse(w) {
      w.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
      w.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      if (picks) w.localStorage.setItem(MINE, JSON.stringify(picks));
      w.addEventListener('error', e => errors.push(e.message));
    } });
  return { dom, errors };
}

/* ---------------------------------------------------------------- 5. the published state against reality */
function boot(st, opts = {}) {
  const errors = [], fetched = [];
  const elo = opts.elo || eloModel;
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/nflbets/',
    beforeParse(w) { w.EMBED_TAB = opts.tab || 'record'; w.STATE_URL = '../betting/state.json';
      w.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
      w.fetch = async url => { const u = String(url); fetched.push(u);
        if (/elo\/data\/model\.json/.test(u)) return { ok: true, status: 200, json: async () => JSON.parse(elo) };
        if (/espn\.com/.test(u)) return opts.espn ? { ok: true, status: 200, json: async () => opts.espn } : { ok: false, status: 503, json: async () => ({}) };
        return { ok: /state\.json/.test(u), status: 200, json: async () => JSON.parse(typeof st === 'string' ? st : JSON.stringify(st)) }; };
      w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      w.addEventListener('error', e => errors.push(e.message)); } });
  return { w: dom.window, d: dom.window.document, errors, fetched };
}
const kick = PATCHES.kickoffMs;
const DAY = 86400000;
async function reality() {
  const P = JSON.parse(state), pub = Date.parse(P.published);
  const J = JSON.stringify;
  /* 5a. one season: the app's (freshState), published as `season`, every scheduled game in it */
  check(P.season === APP_SEASON, `5a: the state's season ${P.season} is not the app's ${APP_SEASON}`);
  check(P.schedule.every(g => String(g.game_id).startsWith(APP_SEASON + '_')), '5a: the schedule carries a game of another season');

  const { w, d, errors } = boot(P, { tab: 'ratings' }); await new Promise(r => setTimeout(r, 700));
  check(errors.length === 0, '5: runtime errors: ' + errors.join('; '));
  const S = w.eval('S'), cur = w.eval('currentWeekDefault()'), phase = w.eval('seasonPhase()');
  const weekGames = S.schedule.filter(g => +g.week === cur);
  /* the files the job could not publish without at this state's publish time (patches.filesDue):
     the roster and depth chart from a week before the first kickoff, the injury report from the
     first kickoff (none exists before the week of the opener), until the Super Bowl is in */
  const due = PATCHES.filesDue(S.schedule, pub);

  /* 5b. this run's files: the job refuses to publish without them, so a state whose report or
     roster was read more than a few minutes from its own publish time (the same run reads them
     seconds before it publishes) was built on a copy left over from another run */
  if (due.lineups && phase !== 'over') {
    check(!!(S.roster && S.depth), '5b: in season the state has no roster or depth chart');
    const fresh = [['roster', S.roster && S.roster.loaded]];
    if (due.injuries) { check(!!(S.injuries && S.injuries.rows && S.injuries.rows.length), '5b: the season has kicked off and the state has no injury report');
      fresh.push(['injury report', S.injuries && S.injuries.loaded]); }
    for (const [k, v] of fresh)
      check(v && Math.abs(Date.parse(v) - pub) < 15 * 60000, `5b: the ${k} was read at ${v}, not by the run that published at ${P.published}`);
    /* stale upstream files are shown as stale: the report not reaching this week a day before its
       first kickoff, no report at all once one is due, a depth chart more than a day and a half
       old; before the opener "no injury report yet" is said plainly, not flagged */
    const asof = w.eval(`injAsOf(${pub})`);
    const ks = weekGames.map(kick).filter(t => t != null), wk1 = ks.length ? Math.min(...ks) : null;
    const hasRep = !!(S.injuries && S.injuries.rows && S.injuries.rows.length);
    const repWeek = hasRep ? Math.max(...S.injuries.rows.map(r => +r.week || 0)) : 0;
    const repLate = hasRep && repWeek < cur && wk1 != null && wk1 - pub < DAY;
    const noRep = !hasRep && due.injuries;
    const depthOld = S.depth && S.depth.dt && pub - Date.parse(S.depth.dt) > 36 * 3600000;
    const repLine = hasRep ? /the injury report through week \d+/ : due.injuries ? /no injury report</ : /no injury report yet/;
    check(repLine.test(asof) && /the depth chart of/.test(asof), '5b: the absences card does not say what it was built from: ' + asof.slice(0, 160));
    check(/inj-stale/.test(asof) === !!(repLate || noRep || depthOld), `5b: the absences card ${repLate || noRep || depthOld ? 'does not flag' : 'flags'} a stale input (report ${hasRep ? 'through week ' + repWeek : 'none'}, week ${cur}, depth ${S.depth && S.depth.dt}): ` + asof.slice(0, 200));
    /* the card itself, while there is a coming game to list absences for: between playoff rounds it
       says it is waiting for the next one instead */
    if (phase === 'on') check(!!d.querySelector('#injSuggest .inj-asof'), '5b: the absences card has no source line');
    else check(/next round/.test(d.getElementById('injSuggest').textContent), '5b: with every posted game played the absences card does not say it waits for the next round');
  }

  /* 5c. who starts at quarterback, on the real report: a quarterback who did not start his team's
     last game and was on that week's report is not this week's starter, and not "returning", until
     this week's report clears him (a Full or Limited practice and no Out or Doubtful, or a report
     his team filed without him). Written from the raw files, not the app's helpers. */
  const rows = (S.injuries && S.injuries.rows) || [];
  const rowsOf = (id, wk) => rows.filter(r => r.gsis_id === id && +r.week === +wk);
  const filed = (tm, wk) => rows.some(r => w.eval(`normTeam(${J(r.team)})`) === tm && +r.week === +wk);
  const lastGame = tm => Object.entries(S.processed).filter(([, p]) => (p.home === tm || p.away === tm) && +p.week < cur).sort((x, y) => +y[1].week - +x[1].week)[0];
  const cleared = (id, tm) => { const r = rowsOf(id, cur);
    if (r.some(x => ['Out', 'Doubtful'].includes(String(x.report_status || '').trim()))) return false;
    return r.length ? r.some(x => /full|limited/i.test(x.practice_status || '')) : filed(tm, cur); };
  let qbCases = 0;
  const card = d.getElementById('injSuggest'), cardRows = card ? [...card.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.textContent.replace(/\s+/g, ' ').trim())) : [];
  for (const tm of [...new Set(weekGames.filter(g => g.result == null).flatMap(g => [g.home_team, g.away_team]))]) {
    const lg = lastGame(tm); if (!lg) continue;
    const started = S.qb && S.qb.starters && S.qb.starters[lg[0]] && S.qb.starters[lg[0]][tm] && S.qb.starters[lg[0]][tm].id;
    if (!started) continue;
    const exp = w.eval(`expectedQB(${J(tm)},${cur})`);
    for (const q of w.eval(`teamQBs(${J(tm)})`)) {
      if (q.id === started || !rowsOf(q.id, lg[1].week).length || cleared(q.id, tm)) continue;
      qbCases++;
      const name = w.eval(`qbName(${J(q.id)})`);
      check(exp !== q.id, `5c: ${tm} expects ${name} at quarterback, who missed week ${lg[1].week} on the injury report and is not cleared this week`);
      check(!cardRows.some(c => c[0] === tm && c[1] === name && /returning/.test(c[3] || '')), `5c: the absences card has ${tm} ${name} "returning" before the report clears him`);
    }
  }
  /* 5d. the absences card names the starter a change replaced: never "A -> A" */
  for (const c of cardRows) { const m = (c[4] || '').match(/^[+−-]?[\d.]+ pts\s*(.+?) -?[\d.]+ → (.+?) -?[\d.]+/);
    if (m) check(m[1] !== m[2], `5d: the absences card reads ${c[0]} ${m[1]} -> ${m[2]}`); }
  /* 5e. the rule itself, on a made-up quarterback above the team's starter, every week a team has
     a graded game behind it and a game this week: missed last week on the report -> held; DNP
     this week -> held; Limited -> starts; a report his team filed without him -> starts; Questionable
     and DNP on the final report -> out */
  { const tm = [...new Set(weekGames.filter(g => g.result == null).flatMap(g => [g.home_team, g.away_team]))].find(t => lastGame(t) && S.qb && S.qb.stint && S.qb.stint[t] && S.qb.stint[t].last);
    if (tm && S.depth && S.depth.byId) {
      const lw = lastGame(tm)[1].week, X = '00-TEST-QB', keep = J({ depth: S.depth.byId, rows: S.injuries ? S.injuries.rows : null });
      const run = (mine, other) => w.eval(`(()=>{ S.depth.byId[${J(X)}]={team:${J(tm)},slot:'QB',rank:-1,name:'Test Starter'};
        S.injuries=S.injuries||{rows:[],weeks:[]};
        S.injuries.rows=S.injuries.rows.filter(r=>!(normTeam(r.team)===${J(tm)}&&+r.week===${cur})&&r.gsis_id!==${J(X)})
          .concat([{season:S.season,team:${J(tm)},week:${lw},gsis_id:${J(X)},position:'QB',full_name:'Test Starter',report_status:'Out',practice_status:'Did Not Participate In Practice'}])
          .concat(${J(mine ? [mine] : [])}.map(r=>Object.assign({season:S.season,team:${J(tm)},week:${cur},gsis_id:${J(X)},position:'QB',full_name:'Test Starter'},r)))
          .concat(${J(other ? [other] : [])}.map(r=>Object.assign({season:S.season,team:${J(tm)},week:${cur},gsis_id:'00-TEST-OTHER',position:'WR',full_name:'Someone Else'},r)));
        return expectedQB(${J(tm)},${cur}); })()`);
      const DNP = 'Did Not Participate In Practice';
      check(run(null, null) !== X, `5e: ${tm}: a made-up starter Out in week ${lw} with no report yet this week is counted back in`);
      check(run({ report_status: '', practice_status: DNP }, null) !== X, `5e: ${tm}: a made-up starter Out in week ${lw} and DNP this week is counted back in`);
      check(run({ report_status: '', practice_status: 'Limited Participation in Practice' }, null) === X, `5e: ${tm}: a made-up starter back at practice (Limited) is still held out`);
      check(run(null, { report_status: 'Out', practice_status: DNP }) === X, `5e: ${tm}: a made-up starter left off a report his team filed is still held out`);
      check(run({ report_status: 'Questionable', practice_status: DNP }, null) !== X, `5e: ${tm}: a made-up starter Questionable with no practice is counted in`);
      { run(null, null); const html2 = w.eval('renderImpact()');
        check(/Test Starter not cleared/.test(html2) && !/Test Starter[^<]*<\/td><td>Starting QB<\/td><td><span class="tier low">returning/.test(html2), `5e: ${tm}: the absences card does not say the made-up starter is not cleared`); }
      w.eval(`(()=>{ const k=${keep}; S.depth.byId=k.depth; if(k.rows) S.injuries.rows=k.rows; })()`);
    } else console.log('  (5e skipped: no team this week has a graded game behind it)'); }
  console.log(`  5c: ${qbCases} quarterback${qbCases === 1 ? '' : 's'} held out this week on the report`);

  /* 5f. no game played abroad keeps nflverse's 'Home' (betting/neutral_sites.json): on the page, and
     in the state the job wrote (a state carrying atKickoff is this job's; one from before it is
     read right by the page and rewritten by the next run) */
  { const N = PATCHES.NEUTRAL, st = new Set((N.stadiums || []).map(x => x.toLowerCase()));
    const abroad = g => g.location === 'Home' && ((N.games || {})[g.game_id] === 'Neutral' || st.has(String(g.stadium || '').trim().toLowerCase()));
    const bad = S.schedule.filter(abroad);
    check(!bad.length, '5f: games played abroad still coded Home on the page: ' + bad.map(g => g.game_id + ' (' + g.stadium + ')').join(', '));
    if ('atKickoff' in P) { const badP = P.schedule.filter(abroad);
      check(!badP.length, '5f: the job wrote games played abroad as Home: ' + badP.map(g => g.game_id + ' (' + g.stadium + ')').join(', ')); }
    for (const g of S.schedule.filter(x => (N.games || {})[x.game_id] === 'Neutral'))
      check(w.eval(`features(S.schedule.find(x=>x.game_id===${J(g.game_id)}),S.teams).neutral`) === 1, `5f: ${g.game_id} is not neutral in Alpha's inputs`); }

  /* 5g. every coming game of this week has a call from every model, and a graded game is graded on
     the call published for it; a model the job could not run says why instead (modelStatus) */
  { const ms = P.modelStatus || {};
    for (const [k, name] of [['joker', 'the Joker'], ['broly', 'the Broly Model']]) {
      if (ms[k]) { check(typeof ms[k].why === 'string' && ms[k].why && ms[k].since, `5g: ${name}'s status has no reason or time`); continue; }
      const calls = P[k] || {};
      /* Broly prices a game from both moneylines or, without them, the spread (betting/broly/stats.py market_prob) */
      const both = o => !!o && o.home != null && o.away != null;
      const need = weekGames.filter(g => g.result == null && (k !== 'broly' || g.spread_line != null || both((P.odds || {})[g.game_id])));
      const missing = need.filter(g => !calls[g.game_id]);
      check(!missing.length, `5g: ${name} has no call for ${missing.map(g => g.game_id).join(', ')} this week and no status saying why`);
      const off = Object.entries(P.processed).filter(([gid, r]) => r[k] && calls[gid] && r[k].pick !== calls[gid].pick).map(([gid]) => gid);
      check(!off.length, `5g: ${name}'s graded pick is not its published call for ${off.join(', ')}`);
    }
    for (const [gid, r] of Object.entries(P.processed)) if (r.atKickoff === true) check(['pick', 'pHome'].every(x => r[x] != null), `5g: ${gid} was graded on a frozen call with no pick`); }

  /* 5h. no call changes after its kickoff: against the last committed state */
  { let prev = null;
    try { prev = JSON.parse(process.env.BETTING_PREV_STATE ? fs.readFileSync(process.env.BETTING_PREV_STATE, 'utf8')
      : require('child_process').execSync('git show HEAD:betting/state.json', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString()); } catch (e) { prev = null; }
    if (process.env.BETTING_REBUILD) console.log('  (5h skipped: a rebuild replays the season from the preseason board on purpose)');
    else if (!prev || prev.season !== P.season) console.log('  (5h skipped: no earlier state of this season to compare with)');
    else { let n = 0;
      /* every game kicked off by this run: the last committed state was made before this run, so
         its call for such a game is either the last one before kickoff or already frozen */
      const started = S.schedule.filter(g => { const k = kick(g); return k != null && k <= pub; }).map(g => g.game_id);
      for (const gid of started) {
        for (const k of ['joker', 'broly']) { const a = (prev[k] || {})[gid], b = (P[k] || {})[gid];
          if (a && b) { n++; check(a.pick === b.pick && a.pHome === b.pHome, `5h: ${k}'s call for ${gid} moved after kickoff: ${J(a)} -> ${J(b)}`); } }
        const call = st => (st.atKickoff || {})[gid] || (st.processed[gid] && { pick: st.processed[gid].pick, pHome: st.processed[gid].pHome, h: st.processed[gid].h });
        const fa = call(prev), fb = call(P), same = (x, y) => x == null || y == null || Math.abs(x - y) < 1e-6;
        if (fa && fb && fa.pick) { n++; check(fa.pick === fb.pick && same(fa.pHome, fb.pHome) && ((fa.h && fa.h.pick) || null) === ((fb.h && fb.h.pick) || null) && same(fa.h && fa.h.pHome, fb.h && fb.h.pHome),
          `5h: Alpha's or the Challenger's call for ${gid} moved after kickoff: ${fa.pick} ${fa.pHome}/${fa.h && fa.h.pick} -> ${fb.pick} ${fb.pHome}/${fb.h && fb.h.pick}`); }
      }
      console.log(`  5h: ${n} calls on games kicked off by ${P.published} held from the state before it`); } }

  /* 5i. Team Rankings: the record is the season's results, and a rating that predates a final says so */
  { const EM = JSON.parse(eloModel), T = EM.teams || {}, tr = [...d.querySelectorAll('#ratingsTable table.rt-v tbody tr')];
    const reg = g => g.game_type ? g.game_type === 'REG' : +g.week <= 18;
    /* the Elo file's record counts the regular season only (elo/build.py power_ratings), so a
       playoff final is behind when it kicked off after the file was built */
    const built = Date.parse(EM.built_at || '');
    let lag = 0;
    for (const t of tr) { const tm = t.children[1].textContent.trim().split(/\s+/)[0];
      const fs2 = S.schedule.filter(g => g.result != null && reg(g) && (g.home_team === tm || g.away_team === tm));
      const r = [0, 0, 0]; for (const g of fs2) { const m = g.home_team === tm ? g.result : -g.result; r[m > 0 ? 0 : m < 0 ? 1 : 2]++; }
      const rr = (T[tm] && T[tm].record) || [0, 0, 0];
      const behind = fs2.length > rr[0] + rr[1] + rr[2] || S.schedule.some(g => g.result != null && !reg(g) && (g.home_team === tm || g.away_team === tm) && isFinite(built) && kick(g) > built);
      const use = fs2.length >= rr[0] + rr[1] + rr[2] ? r : rr, want = use[0] + '-' + use[1] + (use[2] ? '-' + use[2] : '');
      check(t.querySelector('.rt-rec').textContent === want, `5i: Team Rankings has ${tm} at ${t.querySelector('.rt-rec').textContent}, the season has ${want}`);
      if (behind) lag++;
      check(!!t.querySelector('.rt-lag') === behind, `5i: ${tm}'s rating ${behind ? 'predates a final and does not say so' : 'is marked behind but counts every final'}`); }
    check(!lag || /Rated before their latest game/.test(d.getElementById('ratingsTable').textContent), '5i: teams rated before their latest game, with no note under the table');
    console.log(`  5i: ${lag} team${lag === 1 ? '' : 's'} rated before their latest final`); }

  /* 5j. the season's phase: with every game played the absences card stops listing a coming week */
  { const keep = J(S.schedule.map(g => [g.result, g.game_type]));
    /* every game played and no Super Bowl among them (a real one, once posted, is set aside here) */
    w.eval(`S.schedule.forEach(g=>{ if(g.result==null) g.result=3; if(g.game_type==='SB') g.game_type='CON'; })`);
    check(w.eval('seasonPhase()') === 'waiting' && /next round/.test(w.eval('renderImpact()')), '5j: with every posted game played the absences card does not wait for the next round');
    w.eval(`(()=>{ const g=S.schedule[S.schedule.length-1]; g.game_type='SB'; })()`);
    check(w.eval('seasonPhase()') === 'over' && w.eval('renderImpact()') === '', '5j: after the Super Bowl the absences card still lists a coming week');
    w.eval(`(()=>{ const k=${keep}; S.schedule.forEach((g,i)=>{ g.result=k[i][0]; g.game_type=k[i][1]; }); })()`);
    check(w.eval('seasonPhase()') === phase, '5j: the schedule was not restored'); }

  /* 5k. a scoreboard final counts for every model at once, on the call frozen at kickoff */
  { const g = weekGames.find(x => x.result == null && !P.processed[x.game_id]);
    if (!g) console.log('  (5k skipped: no game left to play this week)');
    else {
      const st = JSON.parse(state), sg = st.schedule.find(x => x.game_id === g.game_id);
      /* kicked off yesterday, the job froze a call for it before kickoff: the other side, so the test can tell */
      const y = new Date(Date.now() - DAY), ymd = y.toISOString().slice(0, 10);
      sg.gameday = ymd; sg.gametime = '13:00';
      const other = t => t === g.home_team ? g.away_team : g.home_team;
      const live = (() => { const b = boot(st); return b; })(); await new Promise(r => setTimeout(r, 600));
      const board = live.w.eval(`predict(S.schedule.find(x=>x.game_id===${J(g.game_id)}),S.teams)`);
      st.atKickoff = Object.assign({}, st.atKickoff || {}, { [g.game_id]: { pick: other(board.pick), conf: 0.55, margin: 1, pHome: other(board.pick) === g.home_team ? 0.55 : 0.45, blended: false, h: { pick: other(board.pick), conf: 0.55, margin: 1, pHome: 0.5 } } });
      st.joker = Object.assign({}, st.joker, { [g.game_id]: (st.joker || {})[g.game_id] || { pick: g.home_team, pHome: 0.6 } });
      st.broly = Object.assign({}, st.broly, { [g.game_id]: (st.broly || {})[g.game_id] || { pick: g.away_team, pHome: 0.4 } });
      const E = JSON.parse(eloModel); E.next = E.next || { games: [] }; E.next.games = (E.next.games || []).filter(x => x.game_id !== g.game_id).concat([{ game_id: g.game_id, pick: g.home_team }]);
      const espn = { events: [{ id: '1', date: y.toISOString(), competitions: [{ status: { type: { state: 'post', shortDetail: 'Final' } },
        competitors: [{ homeAway: 'home', team: { abbreviation: g.home_team }, score: '24' }, { homeAway: 'away', team: { abbreviation: g.away_team }, score: '17' }] }] }] };
      const b = boot(st, { espn, elo: J(E) }); await new Promise(r => setTimeout(r, 900));
      const SB = b.w.eval('S'), row = SB.processed[g.game_id];
      check(!!row && row.fromScoreboard, `5k: a final on the scoreboard (${g.game_id}) was not settled`);
      if (row) {
        check(row.pick === other(board.pick) && row.h && row.h.pick === other(board.pick), `5k: the settled game was graded on today's call (${row.pick}), not the one frozen at kickoff (${other(board.pick)})`);
        for (const k of ['joker', 'elo', 'broly']) check(row[k] && typeof row[k].correct === 'boolean', `5k: the scoreboard final was not counted for ${k}`);
        const tx = b.d.getElementById('modelChart').textContent.replace(/\s+/g, ' ');
        const n = k => Object.values(SB.processed).filter(r => k(r) === true || k(r) === false).length;
        const cnt = { 'Alpha Model': n(r => r.correct), 'The Joker': n(r => r.joker && r.joker.correct), 'ELO Model': n(r => r.elo && r.elo.correct), 'Broly Model': n(r => r.broly && r.broly.correct) };
        for (const [name, c] of Object.entries(cnt)) { const m = tx.match(new RegExp(name + ' (\\d+)–(\\d+)'));
          check(!!m && +m[1] + +m[2] === c, `5k: ${name}'s record does not count the settled final (${m && m[0]}, ${c} decided)`); }
      }
      b.d.getElementById('picksToggle').click(); await new Promise(r => setTimeout(r, 60));
      check(b.errors.length === 0, '5k: runtime errors: ' + b.errors.join('; '));
      /* before the scoreboard has it, a game under way shows the frozen call in the grid (which the
         record draws once the season has a graded game: before the first, it says none is graded) */
      if (!Object.keys(P.processed).length) console.log('  (5k grid skipped: no game graded yet, so the record has no pick grid)');
      else { const c = boot(st); await new Promise(r => setTimeout(r, 700));
      c.w.eval(`S.picksOpen=true; S.picksWeek=${cur}; renderRecord()`);
      const tr = [...c.d.querySelectorAll('.pickgrid tbody tr')].find(t => t.textContent.includes(g.away_team + ' at ' + g.home_team));
      check(!!tr && tr.children[1].textContent.trim().startsWith(other(board.pick)), `5k: the pick grid shows ${tr && tr.children[1].textContent.trim()} for a game under way, not the call frozen at its kickoff (${other(board.pick)})`); }
    } }

  /* 5l. the record says what it is: a model the job could not rescore is disclosed under the legend.
     And every week is drawn alike: the weeks of this season the Joker was refitted on after they
     were played (S.jokerFit, which the state keeps as data) are shaded, labelled, counted and shown
     in the tooltip like any other week of any model, with no hatch, label, note, asterisk or record
     without them (the owner's call, October 2026) */
  { const st = JSON.parse(state);
    /* the record is drawn once a game is graded: before the first final, one made-up graded game */
    if (!Object.keys(st.processed).length) { const g = st.schedule[0];
      Object.assign(g, { result: 7, home_score: 24, away_score: 17 });
      st.processed[g.game_id] = { week: +g.week, home: g.home_team, away: g.away_team, pick: g.home_team, conf: 0.6, margin: 3, pHome: 0.6, result: 7, correct: true, line: 3, h: null, news: [] }; }
    const wks = [...new Set(Object.values(st.processed).map(r => +r.week))].sort((x, y) => x - y);
    /* the published fit when it is this season's, else one made up for the test */
    if (!(st.jokerFit && +st.jokerFit.season === +st.season && (st.jokerFit.weeks || []).some(x => wks.includes(+x)))) delete st.jokerFit;
    st.jokerFit = st.jokerFit || { season: st.season, weeks: wks.slice(0, 1), fitted_on: 'made up for the smoke test' };
    /* a season the Joker could not call (its status says why) still has the rule tested, on one made-up call */
    if (!Object.values(st.processed).some(r => r.joker && st.jokerFit.weeks.includes(+r.week))) {
      const r = Object.values(st.processed).find(x => st.jokerFit.weeks.includes(+x.week) && x.result != null && x.result !== 0);
      if (r) r.joker = { pick: r.home, pHome: 0.6, correct: r.result > 0 }; }
    st.modelStatus = { broly: { since: P.published, why: 'made up for the smoke test' } };
    const b = boot(st); await new Promise(r => setTimeout(r, 700));
    const notes = b.d.querySelector('#modelChart .rv-notes'), nt = notes ? notes.textContent : '';
    check(/Broly Model could not be rescored/.test(nt) && /made up for the smoke test/.test(nt), '5l: a model that could not run is not disclosed: ' + nt.slice(0, 300));
    /* the Joker's refitted weeks, drawn as any week: each cell, the tooltip, the season cell and the legend */
    const alike = (b, fit, tag) => {
      const S2 = b.w.eval('S'), rows = Object.values(S2.processed).filter(r => r.correct !== null);
      const fw = (fit.weeks || []).map(Number);
      const tx = sel => [...b.d.querySelectorAll(sel)].map(x => x.textContent).join(' ').replace(/\s+/g, ' ');
      const all = tx('#modelChart') + ' ' + tx('#recordTable');
      check(!/fitted|refitted|fit, not a prediction|after the fact|hatched/i.test(all), `5l${tag}: the record still marks the Joker's refitted weeks: ` + (all.match(/.{0,80}(fitted|after the fact|hatched).{0,60}/i) || [''])[0]);
      check(!b.d.querySelector('#recordTable td.rv-fit'), `5l${tag}: a cell of the week-by-week grid is still drawn as fitted`);
      const weeks = [...new Set(rows.map(r => +r.week))].sort((x, y) => x - y);
      const jok = r => r.joker && (r.joker.correct === true || r.joker.correct === false) ? r.joker.correct : null;
      const tally = rs => { let w = 0, l = 0; for (const r of rs) { const v = jok(r); if (v === true) w++; else if (v === false) l++; } return { w, l }; };
      const pct = t => Math.round(100 * t.w / (t.w + t.l));
      const shade = t => { const g = t.w + t.l, p = t.w / g, a = Math.min(0.42, Math.abs(p - 0.5) / 0.3 * 0.42).toFixed(3);
        return p > 0.5 ? `background:rgba(27,122,78,${a})` : (p < 0.5 ? `background:rgba(192,57,43,${a})` : ''); };
      const jr = [...b.d.querySelectorAll('#recordTable table.rv-grid tbody tr')].find(t => /The Joker/.test(t.querySelector('th').textContent));
      check(!!jr && jr.children.length === weeks.length + 2, `5l${tag}: the Joker has no full row in the week-by-week grid`);
      if (!jr) return 0;
      let seen = 0;
      weeks.forEach((w, i) => { const t = tally(rows.filter(r => +r.week === w)), td = jr.children[i + 1]; if (!t.w && !t.l) return;
        const ok = td.className === 'rv-c' && td.textContent.trim() === `${t.w}–${t.l}${pct(t)}%` && (td.getAttribute('style') || '') === shade(t)
          && td.getAttribute('title') === `The Joker, ${w > 18 ? 'Playoffs ' + (w - 18) : 'Week ' + w}: ${t.w} of ${t.w + t.l} (${pct(t)}%)`;
        check(ok, `5l${tag}: the Joker's week ${w} is not drawn like any other week: ${td.outerHTML.slice(0, 200)}`);
        if (fw.includes(w)) seen++;
        /* the tooltip: the week's record, nothing added */
        const hit = b.d.querySelector(`#modelChart .rv-hit[data-i="${i}"]`);
        if (hit) { hit.dispatchEvent(new b.w.Event('mouseenter'));
          const tip = ((b.d.querySelector('#modelChart .rv-tip') || {}).textContent || '').replace(/\s+/g, ' ');
          check(tip.includes(`The Joker ${t.w}–${t.l} · season`), `5l${tag}: the tooltip for week ${w} does not give the Joker's record as it stands: ${tip.slice(0, 200)}`); } });
      /* the season counts every week, on the grid and on the legend, and so does the line against Vegas */
      const T = tally(rows), sc = jr.children[jr.children.length - 1];
      check(sc.textContent.trim() === `${T.w}–${T.l}${pct(T)}%` && sc.getAttribute('title') === `The Joker, season: ${T.w} of ${T.w + T.l} (${pct(T)}%)`, `5l${tag}: the Joker's season cell does not count every week: ${sc.outerHTML.slice(0, 200)}`);
      let net = 0;
      for (const r of rows) { const a = jok(r), vp = r.line == null || r.line === 0 ? null : (r.line > 0 ? r.home : r.away);
        if (a === null || vp === null) continue; net += (a ? 1 : 0) - (vp === (r.result > 0 ? r.home : r.away) ? 1 : 0); }
      const sign = n => n > 0 ? '+' + n : (n < 0 ? '−' + Math.abs(n) : '0');
      const lg = tx('#modelChart .lgdrow');
      const want = `The Joker ${T.w}–${T.l} ${sign(net)} vs Vegas`, at = lg.indexOf(want);
      check(at >= 0 && lg[at + want.length] !== '*',
        `5l${tag}: the Joker's legend does not count every week (${T.w}–${T.l}, ${sign(net)} vs Vegas, no mark): ${lg.slice(0, 300)}`);
      return seen; };
    const before5l = fails, seen = alike(b, st.jokerFit, '');
    check(seen > 0, `5l: no refitted week of the Joker's was there to hold to the rule (${st.jokerFit.weeks})`);
    if (fails === before5l) console.log(`  5l: the Joker's refitted week${st.jokerFit.weeks.length > 1 ? 's' : ''} ${st.jokerFit.weeks.join(', ')} drawn like any other (${seen} on the grid, the tooltip, the season and the legend)`);
    /* and the published state, when the job has written a fit for this season and the Joker has a
       graded call in one of its weeks */
    if (P.jokerFit && +P.jokerFit.season === +P.season && Object.values(P.processed).some(r => r.joker && (P.jokerFit.weeks || []).map(Number).includes(+r.week))) {
      const e = boot(P); await new Promise(r => setTimeout(r, 700));
      alike(e, P.jokerFit, ' (published)');
      check(e.errors.length === 0, '5l (published): runtime errors: ' + e.errors.join('; '));
    }
    check(b.errors.length === 0, '5l: runtime errors: ' + b.errors.join('; ')); }

  /* 5m. Joker Jr, a test model retired in October 2026, stays retired. A state this run wrote (its
     stamp is not the last commit's) carries none of what its step published (update.js drops it);
     the last commit's may, until the job's next run. And a state that still carries all of it, its
     calls, grades and a status saying it could not run, draws exactly what the same state without
     it draws: the record's chart and notes, the week-by-week grid and the pick grid */
  { const has = st => 'jokerLong' in st || 'jokerLongInfo' in st || Object.values(st.processed || {}).some(r => r && 'jokerLong' in r) || !!(st.modelStatus && 'jokerLong' in st.modelStatus);
    let prev = null; try { prev = JSON.parse(process.env.BETTING_PREV_STATE ? fs.readFileSync(process.env.BETTING_PREV_STATE, 'utf8')
      : require('child_process').execSync('git show HEAD:betting/state.json', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString()); } catch (e) { prev = null; }
    if (prev && prev.published !== P.published) check(!has(P), '5m: a state written since the last commit still carries Joker Jr\'s keys (update.js dropJokerJr)');
    else if (has(P)) console.log('  (5m: the state is the last commit\'s and still carries Joker Jr\'s keys; the job\'s next run drops them)');
    const st = JSON.parse(state); delete st.jokerLong; delete st.jokerLongInfo;
    for (const r of Object.values(st.processed)) delete r.jokerLong;
    if (st.modelStatus) { delete st.modelStatus.jokerLong; if (!Object.keys(st.modelStatus).length) delete st.modelStatus; }
    /* the record and its grids are drawn once a game is graded: before the first final, one made-up graded game */
    if (!Object.keys(st.processed).length) { const g = st.schedule[0];
      Object.assign(g, { result: 7, home_score: 24, away_score: 17 });
      st.processed[g.game_id] = { week: +g.week, home: g.home_team, away: g.away_team, pick: g.home_team, conf: 0.6, margin: 3, pHome: 0.6, result: 7, correct: true, line: 3, h: null, news: [] }; }
    st.showAllModels = true;
    const jr = JSON.parse(J(st)), wk = w.eval('currentWeekDefault()');
    jr.jokerLong = {};
    for (const g of jr.schedule.filter(x => +x.week <= wk)) jr.jokerLong[g.game_id] = { pick: g.away_team, pHome: 0.45, backfill: true };
    for (const r of Object.values(jr.processed)) r.jokerLong = { pick: r.away, pHome: 0.45, correct: r.result != null ? r.result < 0 : null, backfill: true };
    jr.jokerLongInfo = { since: P.published, fitted_on: '2010-2025 regular season and playoffs', walk_forward: { long_fit: 0.65, joker_recipe_2019_start: 0.63, vegas: 0.66, games: 1355 } };
    jr.modelStatus = Object.assign({}, jr.modelStatus, { jokerLong: { since: P.published, why: 'its fitted model is missing (made up for the smoke test)' } });
    const draw = async s => { const b = boot(s); await new Promise(r => setTimeout(r, 700));
      b.w.eval(`S.picksOpen=true; S.picksWeek=${wk}; renderRecord()`); await new Promise(r => setTimeout(r, 60));
      const t = sel => [...b.d.querySelectorAll(sel)].map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
      return { chart: t('#modelChart'), lines: b.d.querySelectorAll('#modelChart svg polyline').length, grid: t('#recordTable table.rv-grid tbody tr'),
        picks: t('.pickgrid thead th') + ' || ' + t('.pickgrid tbody tr'), errors: b.errors }; };
    const a = await draw(st), z = await draw(jr);
    check(!/Joker Jr|jokerLong/.test(a.chart + a.grid + a.picks + z.chart + z.grid + z.picks), '5m: the record names Joker Jr: ' + (z.chart.match(/.{0,80}(Joker Jr|jokerLong).{0,80}/) || [''])[0]);
    check(a.chart === z.chart && a.lines === z.lines, '5m: a state carrying Joker Jr\'s calls, grades or status draws a different chart or notes: ' + z.chart.slice(0, 300));
    check(!!a.grid && a.grid === z.grid, '5m: a state carrying Joker Jr\'s grades draws a different week-by-week grid: ' + z.grid.slice(0, 300));
    check(/The Joker/.test(a.picks) && a.picks === z.picks, '5m: a state carrying Joker Jr\'s calls draws a different pick grid: ' + z.picks.slice(0, 300));
    check(!a.errors.length && !z.errors.length, '5m: runtime errors: ' + a.errors.concat(z.errors).join('; '));
    console.log(`  5m: a state carrying Joker Jr's ${Object.keys(jr.jokerLong).length} calls, ${Object.keys(jr.processed).length} grades and a status draws the record as one without them`); }
}

/* ---------------------------------------------------------------- 6. the X Bet Log, handed in
   Inside the Bets and Stats page the frame is handed window.XBETS (nflbets/build/xbets.js): X's
   weeks and deposit, read from liveparlays/xbets.json, the same on every device and read only. A
   stub stands in for it here: it hands back what it is given, notes and all, so the app's own
   escaping is what is tested, and it has nothing to write with. */
function stubXB({ weeks, deposit = null, at = '2026-10-10T17:28:44Z', ok = true, other = null }) {
  const subs = [];
  const X = { weeks: JSON.parse(JSON.stringify(weeks)), deposit,
    enabled: () => true, ready: async () => {}, onChange: f => { subs.push(f); },
    get: () => ({ weeks: JSON.parse(JSON.stringify(X.weeks)), deposit: X.deposit, season: APP_SEASON,
      status: { applied: ok, ok, err: ok ? null : 'HTTP 404', at, other } }),
    fire: () => subs.forEach(f => f()) };
  return X;
}
function loadXB(X, tab, mine) {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/nflbets/',
    beforeParse(w) { w.EMBED_TAB = tab || 'bets'; w.STATE_URL = '../betting/state.json'; w.XBETS = X;
      w.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
      w.fetch = async url => { const u = String(url);
        if (/elo\/data\/model\.json/.test(u)) return { ok: true, status: 200, json: async () => JSON.parse(eloModel) };
        return { ok: /state\.json/.test(u), status: 200, json: async () => JSON.parse(state) }; };
      w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      if (mine) w.localStorage.setItem(MINE, JSON.stringify(mine));
      w.addEventListener('error', e => errors.push(e.message)); } });
  return { w: dom.window, d: dom.window.document, errors };
}
async function xbetLog() {
  const rows = d => [...d.querySelectorAll('#betTable tbody tr')].map(tr => tr.children[0].textContent.trim());
  const cells = (d, i) => [...d.querySelectorAll('#betTable tbody tr')].map(tr => tr.children[i] ? tr.children[i].textContent.trim() : '');
  const XSS = '<img src=x onerror="window.__xss=1">';
  /* X's log as the file holds it (the three weeks carried over from the retired store, deposit
     $100): every device sees X's weeks and balance, read only, never the browser's own log */
  { const X = stubXB({ weeks: { 1: { staked: 10, returned: 8.71, note: '' }, 3: { staked: 11, returned: 14.66, note: XSS }, 4: { staked: 8, returned: 29.02, note: '' } }, deposit: 100 });
    const mine = { myPicks: {}, bets: { 5: { staked: 5, returned: 0, note: 'mine' } }, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit: 40 } };
    const v = loadXB(X, 'bets', mine); await sleep(700);
    check(v.errors.length === 0, '6: the X Bet Log threw: ' + v.errors.join('; '));
    check(v.d.documentElement.classList.contains('xbets-ro') && /html\.xbets-ro #tab-bets>\.card:first-child \.bar,html\.xbets-ro #backupCard,html\.xbets-ro \.bv-dep/.test(html),
      '6: the X Bet Log is not read only (the entry bar, the backup card and the deposit box hidden)');
    check(rows(v.d).join() === 'Week 1,Week 3,Week 4' && !v.d.querySelector('#betTable [data-betdel]') && !v.d.querySelector('.bv-dep, #betDeposit') && v.d.getElementById('betSave').disabled,
      '6: the X Bet Log does not show X\'s weeks without Remove, the deposit box and Save week: ' + rows(v.d).join());
    /* the deposit's balance, week by week: 98.71 after week 1, 102.37 after week 3 (week 2 a week
       off), 123.39 after week 4 */
    check(cells(v.d, 5).join() === '$98.71,$102.37,$123.39' && /\$123\.39/.test((v.d.querySelector('#betChart .stat.bv-balance') || { textContent: '' }).textContent)
      && /\$100\.00 deposited/.test(v.d.querySelector('#betChart .stat.bv-balance').textContent),
      '6: the balance is not X\'s from the $100 deposit: ' + cells(v.d, 5).join() + ' / ' + ((v.d.querySelector('#betChart .stat.bv-balance') || {}).textContent || 'no balance'));
    { const svg = v.d.querySelector('#betChart svg.bv-balance'), end = v.d.querySelector('#betChart .bv-end');
      check(!!svg && /Deposited \$100\.00/.test(svg.textContent) && !!end && end.textContent === '$123.39' && /Wk 2/.test(svg.textContent) && svg.querySelectorAll('circle').length === 4,
        '6: the balance chart is not Start to week 4 from the $100 deposit to $123.39, week 2 included: ' + (svg ? svg.textContent.slice(0, 160) : 'no chart')); }
    check(!v.d.querySelector('#betTable img') && !v.w.__xss, '6: a note was drawn as markup by betsViz');
    v.w.eval('renderBetsApp()');
    check(!v.d.querySelector('#betTable img') && !v.w.__xss, '6: a note was drawn as markup by the app\'s own Bet Log table');
    v.w.eval('renderBets()');
    { const note = v.d.getElementById('xbNote').textContent;
      check(v.d.querySelector('#tab-bets h2').textContent === 'X Bet Log' && /Every week X bet/.test(note) && /read only/.test(note) && /Updated /.test(note)
        && !/owner|Synced|sign|Not synced|store/i.test(note) && !v.d.getElementById('xbSignOut') && !v.d.getElementById('xbBackup'),
        '6: the X Bet Log is not headed so, does not say what it is and when it changed, or still speaks of an owner, a sign-in or a store: ' + note); }
    check(!/Week 5|mine/.test(v.d.getElementById('betTable').textContent) && !/\$40\.00/.test(v.d.getElementById('betChart').textContent), '6: the browser\'s own old log or deposit is shown as X\'s');
    /* a click that saves the app's whole state (the chart's switch) leaves this browser's own log
       and deposit as they were, and keeps the view the viewer chose */
    v.d.querySelector('[data-bv="pnl"]').click(); await sleep(500);
    const kept = JSON.parse(v.w.localStorage.getItem(MINE));
    check(Object.keys(kept.bets).join() === '5' && kept.bets[5].note === 'mine' && kept.bank.deposit === 40 && kept.bank.betView === 'pnl',
      '6: a save wrote X\'s log or deposit over the browser\'s own: ' + JSON.stringify(kept));
    /* nothing in the frame can write X's log: Save week and Remove are not there to press, and
       the app's own save of a week changes only what this frame shows until it reloads */
    v.d.getElementById('betWeek').value = '7'; v.d.getElementById('betStaked').value = '10'; v.d.getElementById('betReturned').value = '25';
    v.d.getElementById('betSave').click(); await sleep(300);
    const kept2 = JSON.parse(v.w.localStorage.getItem(MINE));
    check(Object.keys(kept2.bets).join() === '5' && typeof X.write === 'undefined', '6: Save week in the X Bet Log wrote a week'); }
  /* no deposit in the file: X's profit against break even, no balance */
  { const X = stubXB({ weeks: { 1: { staked: 10, returned: 30, note: '' } }, deposit: null });
    const v = loadXB(X, 'bets', { myPicks: {}, bets: {}, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit: 75 } }); await sleep(700);
    check(!v.d.querySelector('#betChart .stat.bv-balance') && /Break even/.test(v.d.querySelector('#betChart svg').textContent) && !/\$75/.test(v.d.getElementById('betChart').textContent),
      '6: with no deposit in the file the X Bet Log shows a balance, or the browser\'s own deposit'); }
  /* the file arrives after the frame has drawn: the frame takes it */
  { const X = stubXB({ weeks: {}, deposit: null });
    const v = loadXB(X, 'bets'); await sleep(700);
    check(rows(v.d).length === 0 && /No weeks logged yet/.test(v.d.getElementById('betChart').textContent), '6: an empty X Bet Log does not say so');
    X.weeks = { 2: { staked: 4, returned: 9, note: '' } }; X.deposit = 50; X.fire(); await sleep(100);
    check(rows(v.d).join() === 'Week 2' && /\$55\.00/.test(v.d.querySelector('#betChart .stat.bv-balance').textContent), '6: the log arriving late did not redraw the frame: ' + rows(v.d).join()); }
  /* the file could not be read: the frame says so, shows nothing of the browser's own */
  { const X = stubXB({ weeks: {}, ok: false });
    const v = loadXB(X, 'bets', { myPicks: {}, bets: { 3: { staked: 1, returned: 0, note: 'own' } }, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit: 9 } }); await sleep(700);
    check(/could not be read/.test(v.d.getElementById('xbNote').textContent) && rows(v.d).length === 0 && v.d.documentElement.classList.contains('xbets-ro'),
      '6: a file that could not be read is not said, or the browser\'s own log is shown in its place'); }
  /* a file for another season: no weeks of this one, and the frame says which it holds */
  { const X = stubXB({ weeks: {}, other: APP_SEASON - 1 });
    const v = loadXB(X, 'bets'); await sleep(700);
    check(new RegExp(String(APP_SEASON - 1)).test(v.d.getElementById('xbNote').textContent) && rows(v.d).length === 0, '6: a log for another season is not said'); }
}

(async () => {
  const published = JSON.parse(state);
  const graded = Object.keys(published.processed);
  /* the week before the opener nothing is graded yet: the visitor's storage is tested on the first
     scheduled game, and the checks that need a graded game say they were skipped */
  const g0 = published.schedule[0], first = graded[0] || g0.game_id;
  const p0 = published.processed[first] || { home: g0.home_team, away: g0.away_team, result: null };
  const winner = p0.result > 0 ? p0.home : p0.result < 0 ? p0.away : null;
  const loser = winner === p0.home ? p0.away : p0.home;
  if (!graded.length) console.log('  (no game graded yet this season: the checks on graded games are skipped)');

  // 1. fresh visitor
  const { dom, errors } = load(null); await sleep(300);
  const w = dom.window, d = w.document; const S = w.eval('S');
  check(errors.length === 0, 'no runtime errors: ' + errors.join('; '));
  check(Object.keys(S.processed).length === graded.length, `published season loaded (${Object.keys(S.processed).length} graded)`);
  /* My Picks is gone on purpose: the picks it held never left the browser that made them,
     and losing a week of them was the whole reason for dropping it. The key is untouched. */
  check([...d.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,bank,record,bets,ratings,upload,backup', 'every tab present but My Picks');
  check(!d.getElementById('tab-mine'), 'the My Picks section is gone with its tab');
  check(![...d.querySelectorAll('#tab-record th, .pickgrid th')].some(th => th.textContent.trim() === 'You'), 'no You column survives');
  check(!d.getElementById('rebuildBtn') && !d.getElementById('resetBtn') && !!d.getElementById('exportBtn'), 'Backup has save and import only');
  check(Object.keys(S.odds || {}).length > 0, 'published moneylines are available to the Parlay Builder tab');
  check(Object.keys(S.myPicks).length === 0 && Object.values(S.processed).every(p => p.myPick === null), 'a new visitor has no picks and inherits none of the owner\'s');
  { d.querySelector('#tabs button[data-tab="backup"]').click();
    const bs = d.getElementById('backupState');
    check(bs && bs.className !== 'err' && !/Everything you have entered/.test(bs.textContent), 'a visitor with no data gets no backup alarm: ' + (bs && bs.textContent.trim().slice(0, 60)));
    check(w.eval('myDataCount()') === 0, "myDataCount counts the visitor's own entries, not the published season"); }
  // the visitor picks the loser of the first graded game; save() should persist only picks
  S.myPicks[first] = loser; S.bank.lastAmt = 35; S.bets[1] = { staked: 20, returned: 35, note: 'visitor' }; w.eval('save()'); await sleep(400);
  const stored = JSON.parse(w.localStorage.getItem(MINE) || '{}');
  check(stored.myPicks && stored.myPicks[first] === loser, 'visitor pick saved to their own storage');
  check(stored.bank && stored.bank.lastAmt === 35 && stored.bets && stored.bets[1].returned === 35, 'visitor stake and bets saved to their own storage');
  check(w.localStorage.getItem(APP_KEY) === null, 'the full state is never written to the visitor\'s storage');

  // 2. returning visitor: pick graded against the published result
  const r2 = load({ myPicks: { [first]: loser }, bank: { lastAmt: 35, filter: 'all', build: [], mode: 'straight' }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } }); await sleep(300);
  const S2 = r2.dom.window.eval('S');
  check(!graded.length ? S2.myPicks[first] === loser : S2.processed[first].myPick === loser && S2.processed[first].myCorrect === (winner ? false : null), 'returning visitor: pick restored and graded as a miss');
  check(S2.bank.lastAmt === 35 && S2.bets[1] && S2.bets[1].returned === 35, 'returning visitor: stake and bets restored');
  check(r2.errors.length === 0, 'returning visitor: no runtime errors');
  const stamp = r2.dom.window.document.getElementById('saveState');
  await sleep(500);
  check(stamp && /^Updated /.test(stamp.textContent), 'page shows the publish time instead of an autosave note');
  r2.dom.window.eval('save()'); await sleep(500);
  check(/^Updated /.test(stamp.textContent), 'the publish time survives a save (no "Autosaved" on a published page)');
  { const S3 = r2.dom.window.eval('S'); S3.myPicks[first] = loser;
    r2.dom.window.document.querySelector('#tabs button[data-tab="backup"]').click();
    r2.dom.window.eval('renderBackupState()');
    const bs2 = r2.dom.window.document.getElementById('backupState');
    check(bs2.className === 'err' && /Everything you have entered/.test(bs2.textContent), 'a visitor who has picks does get the backup warning'); }

  // 3. the app on its own: same published season, every tab, private things from the same store
  const adminHtml = html;
  const a = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/admin.html',
    beforeParse(w2) { w2.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w2.fetch = async url => /elo\/data\/model\.json/.test(String(url)) ? { ok: true, status: 200, json: async () => JSON.parse(eloModel) } : ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w2.confirm = () => true; w2.alert = () => {}; w2.scrollTo = () => {};
      w2.localStorage.setItem(MINE, JSON.stringify({ myPicks: { [first]: loser }, bank: { lastAmt: 35, filter: 'all', build: [], mode: 'straight' }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } })); } });
  await sleep(600);
  const SA = a.window.eval('S'); const da = a.window.document;
  check(Object.keys(SA.processed).length === graded.length, 'admin: published season loaded');
  check([...da.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,bank,record,bets,ratings,upload,backup', 'admin: every tab present but My Picks');
  check(!da.getElementById('tab-mine'), 'admin: the My Picks section is gone with its tab');
  check(![...da.querySelectorAll('#tab-record th, .pickgrid th')].some(th => th.textContent.trim() === 'You'), 'admin: no You column survives');
  check(!!da.getElementById('oddsFetch'), 'admin: moneylines card kept');
  check((graded.length ? SA.processed[first].myPick : SA.myPicks[first]) === loser && SA.bets[1].returned === 35 && SA.bank.lastAmt === 35, 'admin: picks, bets and stake come from the same browser store as the viewer');
  check(!graded.length ? /No graded games yet/.test(da.getElementById('recordTable').textContent) : /straight-up, \d+ of \d+/.test(da.getElementById('recordStats').textContent) && !!da.querySelector('#modelChart svg'), 'admin: record and chart render from the published games');

  // Power Ratings carries the Impact absences table and not the rank-tag note
  // what the block says depends on the week's files, so the checks are on the shape: the element
  // is under Power Ratings; it carries the heading whenever the state has the files it is built
  // from; and its card is hidden exactly when it has nothing to say
  check(!!da.querySelector('#tab-ratings #injCard #injSuggest'), 'admin: Impact absences is not under Power Ratings');
  const injText = da.getElementById('injSuggest').textContent.trim();
  const injFiles = !!((SA.roster || SA.injuries) && SA.depth);
  /* between playoff rounds and after the Super Bowl there is no coming week to head it (5j) */
  check(!injFiles || a.window.eval('seasonPhase()') !== 'on' || /Impact absences, week \d+/.test(injText), 'admin: the state has the injury files but the absences block has no heading: ' + injText.slice(0, 80));
  check(!da.querySelector('#tab-upload #injSuggest'), 'admin: Impact absences is still on Data Upload too');
  check(!/Rank tags and the Elo change column/.test(da.getElementById('ratingsTable').textContent), 'admin: the rank-tag note is still under the ratings');
  check(da.getElementById('injCard').hidden === !injText, 'admin: the absences card is not hidden exactly when it is empty');
  for (const [where, re] of [['modelChart', /Running season accuracy after each week/], ['modelChart', /Early weeks bounce around/], ['injSuggest', /Two absences carry a measured effect/]])
    check(!re.test(da.getElementById(where).textContent), `admin: the note is still under ${where}`);
  { const rt = da.getElementById('ratingsTable');
    check(rt.parentElement.id === 'ratingsCard' && rt.parentElement.classList.contains('card') && rt.parentElement.parentElement.id === 'tab-ratings', 'admin: the ratings table is not in a card of its own');
    /* the team Elo of this season's results: every team, best first, each with its record, shield and change since its last game */
    { const rows = [...rt.querySelectorAll('table.rt-v tbody tr')], vals = rows.map(tr => +tr.querySelector('.elocell b').textContent), want = JSON.parse(eloModel).teams;
      check(rows.length === 32 && rows.length === Object.keys(want).length && vals.every((v, i) => i === 0 || v <= vals[i - 1]), 'admin: Power Ratings does not show the 32 team ratings, best first');
      check(Math.abs(vals.reduce((x, v) => x + v, 0) / vals.length - 1500) < 2, 'admin: the team ratings do not average 1500');
      check(rows.every(tr => tr.children.length === 8 && /^\d+-\d+(-\d+)?$/.test(tr.querySelector('.rt-rec').textContent) && tr.querySelector('.tierbadge') && tr.querySelector('.movecell .elomv') && /^\d+%$/.test(tr.querySelector('.rt-pct').textContent)), 'admin: every row should carry its record, tier shield, Elo change and chance against an average team');
      check(!rt.querySelector('[data-rv]') && !/Vegas|Alpha Model/.test(rt.textContent), 'admin: Power Ratings still shows Vegas or a Alpha Model switch');
      check(!!rt.querySelector('svg defs linearGradient[id^="tg-"]'), 'admin: the tier shields have no gradients to fill them');
      const T = e => a.window.eval('eloTier(' + e + ')[0]');
      check(T(1760) === 'HOF' && T(1720) === 'Elite' && T(1360) === 'Iron' && T(1300) === 'Wood' && /tier-hof/.test(a.window.eval('tierBadge(1760)')), 'admin: the built app does not carry the Wood to HOF ladder'); }
    check(!rt.querySelector('.tierlegend') && !/Elite 1700/.test(rt.textContent), 'admin: the tier key is still on the ratings table'); }
  const dv = dom.window.document;
  check(!!dv.querySelector('#tab-ratings #injCard #injSuggest') && !/Rank tags and the Elo change column/.test(dv.getElementById('ratingsTable').textContent), 'viewer: Power Ratings does not carry the absences table, or still carries the note');
  check(!da.getElementById('rebuildBtn') && !da.getElementById('resetBtn') && !!da.getElementById('exportBtn') && !!da.getElementById('importBtn'), 'admin: Backup keeps save and import, drops rebuild and reset');
  check(/your picks, Bet Log, bankroll and Bet Build/.test(da.getElementById('backupCard').textContent) && !!da.querySelector('#tab-bets #backupCard #exportBtn') && !!da.querySelector('#tab-bets #backupCard #importBtn'), 'admin: Save and Import are not on the Bet Log, or the card does not say what it covers');
  /* an import on the published page takes the visitor's entries from the file and keeps the published season */
  { const pub = JSON.stringify(a.window.eval('S.teams')), file = JSON.parse(JSON.stringify(a.window.eval('S')));
    file.teams = { OLD: { elo: 1 } }; file.myPicks = { imported_game: 'BUF' }; file.bets = { 7: { staked: 10, returned: 0, note: 'from the file' } };
    a.window.confirm = () => true;
    const inp = da.getElementById('importInput');
    Object.defineProperty(inp, 'files', { value: [{ text: async () => JSON.stringify(file) }], configurable: true });
    inp.dispatchEvent(new a.window.Event('change'));
    await sleep(100);
    const S2 = a.window.eval('S');
    check(S2.myPicks.imported_game === 'BUF' && S2.bets[7] && S2.bets[7].note === 'from the file' && JSON.stringify(S2.teams) === pub, 'admin: an import did not take the visitor\'s entries and keep the published season'); }
  a.window.eval('S.lastBackup=Date.now()-3*86400000; S.lastBackupHow="downloaded"; save()'); await sleep(900);
  const kept = JSON.parse(a.window.localStorage.getItem(MINE) || '{}');
  check(kept.lastBackup && Date.now() - kept.lastBackup > 2 * 86400000, 'admin: the last-backup time is kept in the browser store');
  // 4. embedded: the X NFL Bets and Stats page sets the app into a srcdoc frame, one tab of it, headless.
  //    The frame has the page's address, so the season path is given and the tab is named.
  const embedFetched = [];
  const e = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/nflbets/',
    beforeParse(w3) { w3.EMBED_TAB = 'record'; w3.STATE_URL = '../betting/state.json';
      w3.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w3.fetch = async url => { embedFetched.push(String(url)); const u = String(url);
        if (/elo\/data\/model\.json/.test(u)) return { ok: true, status: 200, json: async () => JSON.parse(eloModel) };
        return { ok: /state\.json/.test(u), status: 200, json: async () => JSON.parse(state) }; };
      w3.confirm = () => true; w3.alert = () => {}; w3.scrollTo = () => {}; } });
  await sleep(600);
  const de = e.window.document;
  check(de.documentElement.classList.contains('embed'), 'embed: the page marks itself embedded');
  check(!de.getElementById('tab-record').hidden && de.getElementById('tab-picks').hidden, 'embed: EMBED_TAB opens the Records tab');
  check(!graded.length || /straight-up, \d+ of \d+/.test(de.getElementById('recordStats').textContent), 'embed: the record renders');
  check(embedFetched.some(u => u === '../betting/state.json'), 'embed: the season is not read from ../betting/state.json: ' + embedFetched.join(', '));
  check(/html\.embed header,html\.embed #tabs\{display:none\}/.test(adminHtml), 'embed: header and tab bar are hidden by the stylesheet');
  /* the Elo model rides along: read from elo/data/model.json beside the season, graded onto
     the games it called, and drawn on Records like the Joker */
  if (!graded.length) check(/No graded games yet/.test(de.getElementById('recordTable').textContent), 'embed: before the first final the record does not say nothing is graded yet');
  else { const EM = JSON.parse(eloModel), SE = e.window.eval('S');
    /* graded: what the file graded, plus the coming week's calls whose games the season has scored.
       The Elo build grades a game on its score alone and the season only once the game's team
       stats are posted, hours later, so a game the season has not processed yet is left out */
    const gradedIds = EM.graded.filter(g => g.correct !== null && SE.processed[g.game_id]).map(g => g.game_id)
      .concat(((EM.next && EM.next.games) || []).filter(g => { const p = SE.processed[g.game_id]; return p && p.result != null && p.result !== 0; }).map(g => g.game_id));
    check(gradedIds.every(id => { const p = SE.processed[id], n = ((EM.next && EM.next.games) || []).find(g => g.game_id === id);
      return !n || p.elo.correct === (n.pick === (p.result > 0 ? p.home : p.away)); }), 'embed: a coming-week Elo call was graded against the wrong winner');
    check(embedFetched.some(u => /\.\.\/elo\/data\/model\.json/.test(u)), 'embed: the Elo model was not read from ../elo/data/model.json');
    check(gradedIds.length > 0 && gradedIds.every(id => SE.processed[id] && SE.processed[id].elo && typeof SE.processed[id].elo.correct === 'boolean'), 'embed: the Elo model\'s graded calls are not on the processed games');
    check(Object.keys(SE.elo || {}).length >= EM.graded.length + ((EM.next && EM.next.games) || []).length, 'embed: S.elo does not carry the graded and coming calls');
    /* the record's pictures: wins against Vegas (each model's wins minus the Vegas favourite's on
       the same games, week by week) and the week-by-week grid, the Elo model in both */
    const rec = de.getElementById('modelChart'), rtxt = rec.textContent.replace(/\s+/g, ' ');
    const want = gradedIds.filter(id => SE.processed[id].elo.correct).length;
    check(/Wins against Vegas/.test(rtxt) && !!rec.querySelector('svg.rv-chart') && !rec.querySelector('svg.wowchart'), 'embed: the record does not draw Wins against Vegas: ' + rtxt.slice(0, 120));
    check(new RegExp('ELO Model ' + want + '\u2013' + (gradedIds.length - want)).test(rtxt), `embed: the legend should give ELO Model ${want}\u2013${gradedIds.length - want}: ` + rtxt.slice(0, 300));
    check(rec.querySelectorAll('svg.rv-chart polyline[stroke="#E8730A"]').length === 1, 'embed: the Elo model has no line on the chart');
    /* the Broly Model, when the job has scored it: its record in the legend and its own line */
    { const bg = Object.values(SE.processed).filter(r => r.broly && typeof r.broly.correct === 'boolean'), bw = bg.filter(r => r.broly.correct).length;
      if (bg.length) {
        check(new RegExp('Broly Model ' + bw + '\u2013' + (bg.length - bw)).test(rtxt), `embed: the legend should give Broly Model ${bw}\u2013${bg.length - bw}: ` + rtxt.slice(0, 400));
        check(rec.querySelectorAll('svg.rv-chart polyline[stroke="#7A3FB0"]').length === 1, 'embed: the Broly Model has no line on the chart');
      } }
    check(/Challenger Model \d+\u2013\d+/.test(rtxt) && !/Challenger \d/.test(rtxt) && !/ELO based/.test(rtxt), 'embed: the Challenger Model or the ELO Model still has its old name: ' + rtxt.slice(0, 300));
    /* Vegas is the baseline: the headline tiles are its record, and the old names are gone */
    { const win = r => r.result > 0 ? r.home : r.away, im = x => x < 0 ? -x / (-x + 100) : 100 / (x + 100);
      let c = 0, n = 0; for (const [gid, r] of Object.entries(SE.processed)) { if (r.result == null || r.result === 0) continue; const o = (SE.odds || {})[gid];
        if (!o || !o.home || !o.away) continue; const ph = im(o.home) / (im(o.home) + im(o.away)); n++; if ((ph >= 0.5 ? r.home : r.away) === win(r)) c++; }
      const tiles = de.getElementById('recordStats').textContent.replace(/\s+/g, ' ');
      check(n > 0 && tiles.includes(`Vegas straight-up, ${c} of ${n}`), `embed: the headline tiles should be Vegas's ${c} of ${n}: ` + tiles.slice(0, 120)); }
    check(!/Main Model|main model/.test(de.body.textContent), 'embed: the page still says Main Model somewhere');
    /* the Bet Log as a bankroll: a Balance view (the account from the deposit, its reference line
       labelled, the latest balance at the line's end) and a Weekly P&L view (a column a week from $0,
       each labelled with its signed amount, a week off saying so), switched in place; the balance
       first among the figures; the table's running total with the balance beside it */
    { const SB = e.window.eval('S'); const keepB = JSON.stringify(SB.bets || {}), keepK = JSON.stringify(SB.bank || {});
      const M = '\u2212', tx = el => el.textContent.replace(/\s+/g, ' ');
      SB.bets = { 1: { staked: 10, returned: 8.71, note: '' }, 3: { staked: 11, returned: 14.66, note: '' } };
      SB.bank = Object.assign({}, SB.bank || {}, { deposit: 100, betView: 'balance' }); e.window.eval('renderRecord()');
      let bc = de.getElementById('betChart');
      check(!!bc.querySelector('svg.bv-balance') && /Deposited \$100\.00/.test(tx(bc.querySelector('svg'))) && tx(bc.querySelector('.bv-end')) === '$102.37'
        && ['Start', 'Wk 1', 'Wk 2', 'Wk 3'].every(l => tx(bc.querySelector('svg')).includes(l)) && bc.querySelectorAll('svg circle').length === 3,
        'embed: the Balance view does not run Start to week 3 from the $100 deposit to $102.37, week 2 included: ' + tx(bc.querySelector('svg') || bc).slice(0, 160));
      check(bc.querySelector('.stat-strip .stat').classList.contains('bv-balance') && tx(bc.querySelector('.bv-balance b')) === '$102.37' && /\+\$2\.37/.test(tx(bc)) && /1 of 2/.test(tx(bc)), 'embed: the figures do not lead with the balance $102.37');
      bc.querySelector('[data-bv="pnl"]').click(); bc = de.getElementById('betChart');
      const ptxt = tx(bc.querySelector('svg') || bc);
      check(SB.bank.betView === 'pnl' && !!bc.querySelector('svg.bv-pnl') && ptxt.includes(M + '$1.29') && ptxt.includes('+$3.66') && /no bets/.test(ptxt) && bc.querySelectorAll('svg path').length === 2,
        'embed: the Weekly P&L view does not show a labelled column for weeks 1 and 3 and say week 2 had no bets: ' + ptxt.slice(0, 160));
      bc.querySelector('.bv-hit[data-i="2"]').dispatchEvent(new e.window.Event('mouseenter'));
      check(/Week 3/.test(tx(bc.querySelector('.bv-tip'))) && /Balance \$102\.37/.test(tx(bc.querySelector('.bv-tip'))), 'embed: hovering week 3 does not show its money and the balance: ' + tx(bc.querySelector('.bv-tip')));
      const bt = de.getElementById('betTable'), cells = i => [...bt.querySelectorAll('tbody tr')].map(tr => tr.children[i].textContent).join('|');
      check(cells(4) === M + '$1.29|+$2.37' && cells(5) === '$98.71|$102.37', 'embed: the table does not carry the running total and the balance: ' + cells(4) + ' / ' + cells(5));
      SB.bank.betView = 'balance'; de.getElementById('betDeposit').value = ''; de.getElementById('betDepositSave').click();
      check(SB.bank.deposit === null && tx(de.querySelector('#betChart .bv-balance b')) === '–' && /Break even/.test(tx(de.querySelector('#betChart svg'))) && ![...de.querySelectorAll('#betTable thead th')].some(th => th.textContent === 'Balance'), 'embed: without a deposit the chart does not fall back to break even');
      SB.bets = JSON.parse(keepB); SB.bank = JSON.parse(keepK); e.window.eval('renderRecord()'); }
    check(/= Vegas/.test(rec.querySelector('svg.rv-chart').textContent), 'embed: the zero line is not marked as Vegas');
    /* the Main Model against Vegas, counted here from the published games */
    { const win = r => r.result > 0 ? r.home : r.away, vp = r => !r.line ? null : (r.line > 0 ? r.home : r.away);
      let net = 0; for (const r of Object.values(SE.processed)) { if (r.correct === null || vp(r) === null) continue; net += (r.correct ? 1 : 0) - (vp(r) === win(r) ? 1 : 0); }
      const sg = net > 0 ? '+' + net : (net < 0 ? '\u2212' + Math.abs(net) : '0');
      check(rtxt.includes('Alpha Model') && new RegExp('Alpha Model \\d+\u2013\\d+ ' + sg.replace('+', '\\+') + ' vs Vegas').test(rtxt), `embed: Alpha Model should read ${sg} vs Vegas: ` + rtxt.slice(0, 300)); }
    const gridRows = [...de.querySelectorAll('#recordTable table.rv-grid tbody tr')].map(tr => tr.querySelector('th').textContent.trim());
    /* every model with a decided game, in order, then Vegas: a model that has none (the Joker in a
       season it could not call, say) is left out rather than shown empty */
    { const dec = f => Object.values(SE.processed).some(r => { const v = f(r); return v === true || v === false; });
      const order = [['Alpha Model', r => r.correct], ['Challenger Model', r => r.h && r.h.correct], ['The Joker', r => r.joker && r.joker.correct],
        ['ELO Model', r => r.elo && r.elo.correct], ['Broly Model', r => r.broly && r.broly.correct]].filter(([n, f]) => (SE.showAllModels || n === 'Alpha Model') && dec(f)).map(([n]) => n).concat('Vegas');
      check(gridRows.includes('ELO Model') && gridRows.join('|') === order.join('|'), 'embed: the week-by-week grid rows are wrong: ' + gridRows.join('|') + ' (want ' + order.join('|') + ')'); }
    { const eloRow = [...de.querySelectorAll('#recordTable table.rv-grid tbody tr')].find(tr => tr.querySelector('th').textContent.trim() === 'ELO Model');
      check(!!eloRow && eloRow.querySelector('td.rv-season b').textContent === `${want}\u2013${gradedIds.length - want}`, 'embed: the grid\'s Elo season cell is wrong'); }
    de.getElementById('picksToggle').click(); await sleep(80);
    const gridHead = [...de.querySelector('.pickgrid').querySelectorAll('thead th')].map(th => th.textContent.trim());
    check(gridHead.includes('ELO Model') && gridHead.includes('Broly Model') && gridHead.includes('Challenger Model') && gridHead.includes('Alpha Model') && !gridHead.includes('Main Model'), 'embed: the pick grid lacks a model column: ' + gridHead.join('|'));
    const firstRow = de.querySelector('.pickgrid tbody tr');
    check(!!firstRow && firstRow.querySelectorAll('td').length === gridHead.length, 'embed: the pick grid rows do not match its columns');
    /* one week at a time: this week by default, the weeks before it in the picker, nothing beyond */
    const weeksAll = [...new Set(SE.schedule.map(g => +g.week))].sort((x, y) => x - y);
    const cur = weeksAll.find(w => SE.schedule.some(g => +g.week === w && g.result == null)) || weeksAll[weeksAll.length - 1];
    const sel = de.getElementById('picksWeek');
    check(!!sel && +sel.value === cur && /this week/.test(sel.selectedOptions[0].textContent), 'embed: the pick grid does not open on this week: ' + (sel && sel.selectedOptions[0].textContent));
    const opts = [...sel.options].map(o => +o.value), upTo = weeksAll.filter(x => x <= cur);
    check(opts.slice().sort((x, y) => x - y).join() === upTo.join(), 'embed: the picker should offer weeks ' + upTo.join(',') + ' only: ' + opts.join(','));
    check(de.querySelectorAll('.pickgrid').length === 1, 'embed: more than one week of picks is drawn at once');
    const thisWeekGame = SE.schedule.find(g => +g.week === cur);
    check(!!thisWeekGame && de.querySelector('.pickgrid').textContent.includes(thisWeekGame.away_team + ' at ' + thisWeekGame.home_team), 'embed: the grid shown is not this week\'s');
    /* the week before this one, when there is one (week 1 has none) */
    const before = upTo.length > 1 ? upTo[upTo.length - 2] : null;
    if (before != null) {
      sel.value = String(before); sel.dispatchEvent(new e.window.Event('change', { bubbles: true })); await sleep(80);
      const prevGame = SE.schedule.find(g => +g.week === before);
      check(+de.getElementById('picksWeek').value === before && de.querySelector('.pickgrid').textContent.includes(prevGame.away_team + ' at ' + prevGame.home_team), 'embed: picking the week before did not show it'); }
    /* a week part played (Thursday's game graded, Sunday's to come) is still this week */
    { const g = SE.schedule.find(x => +x.week === cur);
      e.window.eval(`(()=>{ const g=S.schedule.find(x=>x.game_id===${JSON.stringify(g.game_id)}); g.result=7; g.home_score=24; g.away_score=17;
        S.processed[g.game_id]={week:${cur},home:g.home_team,away:g.away_team,pick:g.home_team,conf:0.6,margin:3,pHome:0.6,result:7,correct:true,h:null,news:[]};
        S.picksWeek=null; renderRecord(); })()`); await sleep(80);
      const s2 = de.getElementById('picksWeek');
      check(!!s2 && +s2.value === cur && /this week/.test(s2.selectedOptions[0].textContent) && ![...s2.options].some(o => +o.value > cur),
        'embed: one graded game moved the picker past this week: ' + (s2 && s2.selectedOptions[0].textContent)); } }
  /* clicking a tab inside the frame must not throw on the address it cannot write */
  { let threw = null; e.window.addEventListener('error', ev => { threw = ev.message; });
    de.querySelector('#tabs button[data-tab="bets"]').click(); await sleep(50);
    check(!threw && !de.getElementById('tab-bets').hidden, 'embed: switching tabs inside the frame failed: ' + threw); }
  await xbetLog();
  await reality();
  const plain = a.window.document.documentElement;
  check(!plain.classList.contains('embed'), 'a page opened normally is not embedded');
  console.log(fails ? `${fails} check(s) failed` : `betting app smoke test passed (${graded.length} graded games in the published state)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
