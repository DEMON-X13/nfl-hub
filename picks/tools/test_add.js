/* node picks/tools/test_add.js: picks/tools/add.js on made-up schedules and sent files, then the
   real picks/friends.json held to the tool's own rules against the real betting/state.json.
   Writes only into a temporary directory; the real file is read, never written. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const T = require('./add.js');
const ROOT = path.resolve(__dirname, '..', '..');
let fails = 0, n = 0;
const ok = (c, what) => { n++; if (!c) { fails++; console.log('  FAIL ' + what); } };
const throws = (f, re, what) => { let m = null; try { f(); } catch (e) { m = e.message; } ok(m !== null && re.test(m), what + (m === null ? ' (accepted)' : ` (said: ${m})`)); };

/* a made-up season: week 6 with a Thursday night game and two Sunday games (US Eastern) */
const sched = [
  { game_id: '2030_06_SEA_DEN', week: 6, gameday: '2030-10-17', gametime: '20:15', away_team: 'SEA', home_team: 'DEN' },
  { game_id: '2030_06_BAL_CLE', week: 6, gameday: '2030-10-20', gametime: '13:00', away_team: 'BAL', home_team: 'CLE' },
  { game_id: '2030_06_WAS_SF', week: 6, gameday: '2030-10-20', gametime: '16:25', away_team: 'WAS', home_team: 'SF' },
  { game_id: '2030_07_SF_SEA', week: 7, gameday: '2030-10-24', gametime: '20:15', away_team: 'SF', home_team: 'SEA' },
  /* across the change from daylight time: 1 November 2030 is EDT, 4 November EST */
  { game_id: '2030_09_NE_NYJ', week: 9, gameday: '2030-11-04', gametime: '20:15', away_team: 'NE', home_team: 'NYJ' }];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friends-'));
const stFile = path.join(dir, 'state.json');
fs.writeFileSync(stFile, JSON.stringify({ season: 2030, schedule: sched }));
const st = T.readState(stFile);

/* the kickoff is Eastern, daylight time or not */
ok(st.games.get('2030_06_SEA_DEN').kick === Date.parse('2030-10-18T00:15:00Z'), 'kickAt: 20:15 EDT is 00:15 UTC the next day');
ok(st.games.get('2030_09_NE_NYJ').kick === Date.parse('2030-11-05T01:15:00Z'), 'kickAt: 20:15 EST is 01:15 UTC the next day');

const sent = (o = {}) => Object.assign({ kind: 'nfl-hub-weekly-picks', version: 1, name: 'D money fresh', season: 2030, week: 6,
  saved_at: '2030-10-16T12:00:00.000Z', tiebreaker: null,
  picks: [{ game_id: '2030_06_SEA_DEN', pick: 'SEA' }, { game_id: '2030_06_BAL_CLE', pick: 'CLE' }, { game_id: '2030_06_WAS_SF', pick: 'SF' }] }, o);

/* refused whole */
throws(() => T.readSent(sent({ kind: 'something-else' }), st), /not a Weekly Picks file/, 'another kind is refused');
throws(() => T.readSent(sent({ version: 2 }), st), /version/, 'another version is refused');
throws(() => T.readSent(sent({ season: 2029 }), st), /season/, 'another season is refused');
throws(() => T.readSent(sent({ week: 23 }), st), /week/, 'week 23 is refused');
throws(() => T.readSent(sent({ week: '6' }), st), /week/, 'a week that is not a number is refused');
throws(() => T.readSent(sent({ name: '  ' }), st), /name/, 'an empty name is refused');
throws(() => T.readSent(sent({ name: '<b>D</b>' }), st), /name/, 'a name with markup is refused');
throws(() => T.readSent(sent({ saved_at: 'yesterday' }), st), /saved_at/, 'a saved_at that is not a time is refused');
throws(() => T.readSent(sent({ picks: [{ game_id: '2030_06_NYG_DAL', pick: 'NYG' }] }), st), /not a game on/, 'a game id not on the schedule is refused');
throws(() => T.readSent(sent({ picks: [{ game_id: '2030_07_SF_SEA', pick: 'SF' }] }), st), /is week 7/, 'a game of another week is refused');
throws(() => T.readSent(sent({ picks: [{ game_id: '2030_06_BAL_CLE', pick: 'BAL' }, { game_id: '2030_06_BAL_CLE', pick: 'CLE' }] }), st), /twice/, 'a game picked twice is refused');
throws(() => T.readSent(sent({ picks: [{ game_id: '2030_06_BAL_CLE', pick: 'PIT' }] }), st), /is not BAL or CLE/, 'a pick of neither team is refused');
throws(() => T.readSent(sent({ tiebreaker: { game_id: '2030_06_WAS_SF', total_points: 'lots' } }), st), /tiebreaker/, 'a tiebreaker that is not a total is refused');

/* read */
{ const s = T.readSent(sent({ name: '  D  money fresh ', tiebreaker: { game_id: '2030_06_WAS_SF', game: 'WAS at SF', total_points: 48 },
    picks: [{ game_id: '2030_06_SEA_DEN', pick: 'SEA' }, { game_id: '2030_06_BAL_CLE', pick: null }, { game_id: '2030_06_WAS_SF', pick: 'SF' }] }), st);
  ok(s.name === 'D money fresh' && s.week === 6 && JSON.stringify(s.picks) === '{"2030_06_SEA_DEN":"SEA","2030_06_WAS_SF":"SF"}' && !s.late.length, 'a sent file is read, the name tidied and an unpicked game left out');
  ok(JSON.stringify(s.tiebreaker) === '{"game_id":"2030_06_WAS_SF","total_points":48}', 'the tiebreaker is kept as its game and total'); }
/* a pick saved after kickoff is not counted */
{ const s = T.readSent(sent({ saved_at: '2030-10-18T00:15:00.000Z' }), st);
  ok(!('2030_06_SEA_DEN' in s.picks) && s.late.join() === '2030_06_SEA_DEN' && Object.keys(s.picks).length === 2, 'a pick saved at its kickoff is left out and named'); }
{ const s = T.readSent(sent({ saved_at: '2030-10-18T00:14:59.000Z' }), st);
  ok('2030_06_SEA_DEN' in s.picks, 'a pick saved a second before kickoff counts'); }

/* the tool end to end, on its own files */
const fFile = path.join(dir, 'friends.json');
const run = (...files) => { const env = Object.assign({}, process.env, { FRIENDS_FILE: fFile, FRIENDS_STATE: stFile });
  try { return { code: 0, out: execFileSync(process.execPath, [path.join(__dirname, 'add.js'), ...files], { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; } };
const put = (name, o) => { const f = path.join(dir, name); fs.writeFileSync(f, JSON.stringify(o)); return f; };
const read = () => JSON.parse(fs.readFileSync(fFile, 'utf8'));
{ const r = run(put('d.json', sent()), put('x.json', sent({ name: 'X', saved_at: '2030-10-17T20:00:00.000Z', tiebreaker: { game_id: '2030_06_WAS_SF', total_points: 41 } })));
  const F = read();
  ok(r.code === 0 && F.season === 2030 && typeof F.how === 'string' && F.friends.map(f => f.name).join() === 'D money fresh,X', 'two files make two friends, in the order sent: ' + r.out);
  ok(JSON.stringify(F.friends[0].weeks.w6.picks['2030_06_SEA_DEN']) === '{"pick":"SEA","saved_at":"2030-10-16T12:00:00.000Z"}', 'each pick keeps when it was saved');
  ok(F.friends[1].weeks.w6.tiebreaker.total_points === 41, 'the tiebreaker is kept');
  ok(T.check(F, st).length === 0, 'the written file passes its own check: ' + T.check(F, st).join('; '));
  ok(/"2030_06_SEA_DEN": \{"pick": "SEA", "saved_at": "2030-10-16T12:00:00.000Z"\}/.test(fs.readFileSync(fFile, 'utf8')), 'each pick is written on one line'); }
/* sent again after Thursday's kickoff: the week is replaced, Thursday's earlier pick stands */
{ const r = run(put('d2.json', sent({ name: 'd MONEY fresh', saved_at: '2030-10-19T09:00:00.000Z',
    picks: [{ game_id: '2030_06_SEA_DEN', pick: 'DEN' }, { game_id: '2030_06_BAL_CLE', pick: 'BAL' }] })));
  const F = read(), w = F.friends[0].weeks.w6;
  ok(r.code === 0 && F.friends.length === 2 && /replaced/.test(r.out) && /1 pick\(s\) made before kickoff kept/.test(r.out), 'the same friend, any case, replaces the week: ' + r.out);
  ok(w.saved_at === '2030-10-19T09:00:00.000Z' && w.picks['2030_06_SEA_DEN'].pick === 'SEA' && w.picks['2030_06_SEA_DEN'].saved_at === '2030-10-16T12:00:00.000Z',
    'a game kicked off keeps the pick made before it, not the late one: ' + JSON.stringify(w.picks['2030_06_SEA_DEN']));
  ok(w.picks['2030_06_BAL_CLE'].pick === 'BAL' && !('2030_06_WAS_SF' in w.picks), 'the rest of the week is the new file\'s, a game it leaves out gone');
  ok(F.friends[0].name === 'd MONEY fresh', 'the name is the latest file\'s'); }
/* a new week for a friend is added beside the old one */
{ const r = run(put('d7.json', sent({ week: 7, saved_at: '2030-10-22T09:00:00.000Z', picks: [{ game_id: '2030_07_SF_SEA', pick: 'SEA' }] })));
  ok(r.code === 0 && Object.keys(read().friends[0].weeks).join() === 'w6,w7', 'another week is added beside the first'); }
/* refused: nothing written */
{ const before = fs.readFileSync(fFile, 'utf8');
  const r1 = run(put('bad.json', sent({ season: 2029 })));
  const r2 = run(put('late.json', sent({ saved_at: '2030-10-21T09:00:00.000Z' })));
  const r3 = run(put('junk.json', 'not json at all'));
  ok(r1.code === 1 && /REFUSED/.test(r1.out) && r2.code === 1 && /no pick in it was saved before/.test(r2.out) && r3.code === 1, 'a refused file exits 1: ' + [r1.out, r2.out, r3.out].join(' | '));
  ok(fs.readFileSync(fFile, 'utf8') === before, 'a refused file writes nothing'); }
/* --check */
{ ok(run('--check').code === 0, '--check passes the tool\'s own file');
  const F = read(), good = JSON.stringify(F);
  const bad = (mut, re, what) => { const G = JSON.parse(good); mut(G); const b = T.check(G, st); ok(b.some(x => re.test(x)), what + ': ' + b.join('; ')); };
  bad(G => { G.friends[0].weeks.w6.picks['2030_06_BAL_CLE'].saved_at = '2030-10-20T17:00:00.000Z'; }, /at or after its kickoff/, 'check: a pick saved at kickoff');
  bad(G => { G.friends[0].weeks.w6.picks['2030_06_BAL_CLE'].pick = 'PIT'; }, /is not BAL or CLE/, 'check: a pick of neither team');
  bad(G => { G.friends[0].weeks.w6.picks['2030_06_NYG_DAL'] = { pick: 'NYG', saved_at: '2030-10-16T12:00:00.000Z' }; }, /not on the schedule/, 'check: a game not on the schedule');
  bad(G => { G.friends[0].weeks.w7.picks['2030_06_BAL_CLE'] = G.friends[0].weeks.w6.picks['2030_06_BAL_CLE']; }, /is week 6/, 'check: a game under the wrong week');
  bad(G => { G.friends.push({ name: 'X ', weeks: {} }); }, /plain text/, 'check: an untidy name');
  bad(G => { G.friends.push({ name: 'x', weeks: {} }); }, /listed twice/, 'check: a friend twice');
  bad(G => { G.season = 2029; }, /season/, 'check: another season');
  bad(G => { G.friends = 'none'; }, /not a list/, 'check: friends not a list');
  bad(G => { G.friends[0].weeks.w23 = G.friends[0].weeks.w6; }, /not a week/, 'check: a week past 22');
  bad(G => { G.friends[0].weeks.w6.picks['2030_06_BAL_CLE'].saved_at = '2030-10-19T10:00:00.000Z'; }, /after the week's saved_at/, 'check: a pick saved after its week');
  fs.writeFileSync(fFile, JSON.stringify(Object.assign(JSON.parse(good), { season: 2029 })));
  const r = run(put('d8.json', sent({ week: 7, saved_at: '2030-10-22T09:00:00.000Z', picks: [{ game_id: '2030_07_SF_SEA', pick: 'SEA' }] })));
  ok(r.code === 1 && /does not pass its rules/.test(r.out), 'a file already broken is not added to'); }
/* a rename: the old name kept in aka, a later file under it lands on the renamed friend and keeps the new name */
{ const F = T.empty(2030);
  T.merge(F, T.readSent(sent(), st), st);
  T.merge(F, T.readSent(sent({ name: 'Gonz' }), st), st);
  ok(T.rename(F, 'd MONEY fresh', 'D') === 'D money fresh', 'rename: found without regard to case, says the old name');
  ok(F.friends[0].name === 'D' && JSON.stringify(F.friends[0].aka) === '["D money fresh"]' && Object.keys(F.friends[0]).join() === 'name,aka,weeks', 'rename: the new name, the old in aka, the weeks kept');
  ok(T.check(F, st).length === 0, 'rename: the file passes its rules: ' + T.check(F, st).join('; '));
  const said = T.merge(F, T.readSent(sent({ name: 'D Money Fresh', week: 7, saved_at: '2030-10-22T09:00:00.000Z', picks: [{ game_id: '2030_07_SF_SEA', pick: 'SF' }] }), st), st);
  ok(F.friends.length === 2 && F.friends[0].name === 'D' && F.friends[0].weeks.w7 && F.friends[0].weeks.w6, 'rename: a file under the old name lands on the renamed friend, keeping the new name');
  ok(/^D \(sent as D Money Fresh\), week 7/.test(said) && !/new friend/.test(said), 'rename: the merge says whom it landed on: ' + said);
  const G = JSON.parse(JSON.stringify(F));
  throws(() => T.rename(G, 'Gonz', 'd'), /already another friend's name/, 'rename: onto another friend\'s name is refused');
  throws(() => T.rename(G, 'Gonz', 'd money fresh'), /already another friend's name/, 'rename: onto another friend\'s old name is refused');
  throws(() => T.rename(G, 'Nobody', 'Z'), /no friend is named/, 'rename: a name no friend has is refused');
  throws(() => T.rename(G, 'Gonz', '<b>G</b>'), /not plain text/, 'rename: a name that is not plain text is refused');
  T.rename(G, 'D', 'D money fresh');
  ok(G.friends[0].name === 'D money fresh' && JSON.stringify(G.friends[0].aka) === '["D"]', 'rename back: the name back, D in aka, never the name itself');
  const H = JSON.parse(JSON.stringify(F)); H.friends[1].aka = ['D money fresh'];
  ok(T.check(H, st).some(x => /listed twice/.test(x)), 'check: an aka that is another friend\'s too');
  H.friends[1].aka = 'D'; ok(T.check(H, st).some(x => /aka is not a list/.test(x)), 'check: an aka that is not a list'); }
fs.rmSync(dir, { recursive: true, force: true });

/* the real file, against the real schedule */
{ const real = path.join(ROOT, 'picks', 'friends.json');
  if (fs.existsSync(real)) { const b = T.check(JSON.parse(fs.readFileSync(real, 'utf8')), T.readState(path.join(ROOT, 'betting', 'state.json')));
    ok(b.length === 0, 'picks/friends.json passes its rules: ' + b.join('; ')); }
  else console.log('  (picks/friends.json is not there: nothing real to check)'); }

console.log(fails ? `${fails} of ${n} checks failed` : `picks/tools/test_add.js: ${n} checks, 0 failures`);
process.exit(fails ? 1 : 0);
