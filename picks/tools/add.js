#!/usr/bin/env node
/* Friends' picks on the Pick'em Record: picks/friends.json, kept by Claude from the Weekly Picks
 * files the owner sends (the owner's call, 15 October 2026: "going to track some friends picks over
 * the course of the season").
 *
 *   node picks/tools/add.js <file>...   merge each sent file into picks/friends.json
 *   node picks/tools/add.js --check     hold picks/friends.json to its rules; exit 1 on a problem
 *   node picks/tools/add.js --rename <old> <new>   show a friend under another name (the owner's
 *                                       call, 15 October 2026: "make D money fresh just D")
 *   node picks/tools/add.js --remove <name>...   take friends off the Pick'em Record, their weeks with
 *                                       them (the owner's call, 24 October 2026: "get rid of the real
 *                                       life players for the pick em record, K, X, D, Gonz")
 *
 * A sent file is what picks/index.html's Save file writes (kind 'nfl-hub-weekly-picks', version 1:
 * name, season, week, saved_at, tiebreaker, picks[{game_id, pick, kickoff, ...}]). It is refused
 * whole unless its kind and version are that, its season is betting/state.json's, its week a
 * whole number 1-22, its name plain text, its saved_at a time, and every game id it names one of
 * that week's games on state.json's schedule, picked once at most, for one of the two teams. A pick
 * saved at or after its game's kickoff (the schedule's kickoff, US Eastern, as the hub's page
 * and picks/ read it, never the file's own) is not counted: it is left out and said so. A game the
 * file leaves unpicked is left out.
 *
 * A friend is one name (matched without regard to case or spaces). A week sent again replaces that
 * friend's week, except a game that had kicked off when the new file was saved: there the pick the
 * earlier file made before kickoff stands, since the new file could not change it (picks/ locks a
 * game at kickoff, so its pick in a later file is the old one, or none). Each pick keeps the
 * saved_at of the file it came from, so the page and --check can hold it to its kickoff.
 *
 * A removal takes the friend out of the file whole, found by their name or any name in their `aka`
 * (without regard to case or spaces); a name no friend has refuses the whole removal, nothing written.
 * A file sent later under a removed name adds that friend again, from that file alone.
 *
 * A rename keeps the names the friend went by before in `aka`, so a later file still saved under
 * the old name lands on the same friend and keeps the name the owner chose; no two friends share a
 * name or an aka.
 *
 * The file is written by this tool alone, by hand, never by a job, and every page only reads it.
 * Nothing is downloaded: the schedule is betting/state.json as it stands in the checkout.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const FILE = process.env.FRIENDS_FILE || path.join(ROOT, 'picks', 'friends.json');
const STATE = process.env.FRIENDS_STATE || path.join(ROOT, 'betting', 'state.json');

const HOW = "Friends' picks on the Pick'em Record: each friend's Weekly Picks (picks/), week by week, which the Pick'em Record shows beside the models on every device, read only. Claude keeps this file from the files the owner sends, with node picks/tools/add.js <file> (never by hand, never by a job); node picks/tools/add.js --check holds it to its rules. season is the NFL season (a file for another season than the betting app's shows nothing). friends is a list, in the order they were first added: name is the friend's name as their file gives it (or as the owner renamed them, with node picks/tools/add.js --rename <old> <new>; aka then lists the names they went by, and a file sent under one of them lands on the same friend), and weeks holds a week for each file sent, keyed w1 to w22 (w19 to w22 are the playoffs). A week is saved_at, when the last file for it was saved, tiebreaker ({game_id, total_points} or null), and picks, keyed by the nflverse game id as betting/state.json's schedule writes it, each the team picked and when the file that picked it was saved. A pick counts only if it was saved before its game's kickoff; it is graded on the finals the models are graded on (state.json's processed), a tie counting for nobody. A week sent again replaces the friend's week, but a game already kicked off keeps the pick made before it. updated is when this file last changed.";

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const GID = /^(\d{4})_(\d{2})_([A-Z]{2,3})_([A-Z]{2,3})$/;
const TEAM = /^[A-Z]{2,3}$/;
const NAME_MAX = 40;
const key = n => String(n).trim().replace(/\s+/g, ' ').toLowerCase();
const cleanName = n => typeof n === 'string' ? n.trim().replace(/\s+/g, ' ') : '';
const okName = n => !!n && n.length <= NAME_MAX && !/[<>&"`*\u0000-\u001f]/.test(n);
const time = s => { if (typeof s !== 'string') return null; const t = Date.parse(s); return isFinite(t) ? t : null; };

/* the schedule's kickoff (US Eastern) as an instant, exactly as picks/index.html's kickAt reads it */
function kickAt(d, t) {
  if (!d || !t) return null;
  const guess = new Date(`${d}T${t}:00Z`);
  const inZone = z => new Date(guess.toLocaleString('en-US', { timeZone: z }));
  const k = new Date(guess.getTime() + (inZone('UTC') - inZone('America/New_York')));
  return isNaN(k) ? null : k.getTime();
}

function readState(file = STATE) {
  const S = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!S || !Array.isArray(S.schedule) || !S.season) throw new Error(`${file} has no season or schedule`);
  const games = new Map();
  for (const g of S.schedule) games.set(g.game_id, { id: g.game_id, week: +g.week, home: g.home_team, away: g.away_team, kick: kickAt(g.gameday, g.gametime) });
  return { season: +S.season, games };
}

/* one sent file, read against the schedule: {name, week, saved_at, tiebreaker, picks:{gid:pick}, late:[gid]}, or throws why it is refused */
function readSent(d, st) {
  const no = why => { throw new Error(why); };
  if (!isObj(d)) no('not a Weekly Picks file (not a JSON object)');
  if (d.kind !== 'nfl-hub-weekly-picks') no(`not a Weekly Picks file (kind ${JSON.stringify(d.kind)})`);
  if (d.version !== 1) no(`a Weekly Picks file of version ${JSON.stringify(d.version)}; this tool reads version 1`);
  if (+d.season !== st.season) no(`season ${JSON.stringify(d.season)}, where betting/state.json is ${st.season}`);
  const week = d.week;
  if (!Number.isInteger(week) || week < 1 || week > 22) no(`week ${JSON.stringify(week)} is not a week 1-22`);
  const name = cleanName(d.name);
  if (!okName(name)) no(`the name ${JSON.stringify(d.name)} is empty, over ${NAME_MAX} characters or not plain text`);
  const saved = time(d.saved_at);
  if (saved == null) no(`saved_at ${JSON.stringify(d.saved_at)} is not a time`);
  if (!Array.isArray(d.picks)) no('it has no list of picks');
  const picks = {}, late = [], seen = new Set();
  for (const p of d.picks) {
    if (!isObj(p)) no('a pick is not an object');
    const g = st.games.get(p.game_id);
    if (!g) no(`${JSON.stringify(p.game_id)} is not a game on betting/state.json's schedule`);
    if (g.week !== week) no(`${p.game_id} is week ${g.week}, not week ${week}`);
    if (seen.has(g.id)) no(`${g.id} is picked twice`);
    seen.add(g.id);
    if (p.pick == null || p.pick === '') continue;
    if (p.pick !== g.home && p.pick !== g.away) no(`${g.id}: ${JSON.stringify(p.pick)} is not ${g.away} or ${g.home}`);
    if (g.kick == null) no(`${g.id} has no kickoff on the schedule`);
    if (saved >= g.kick) { late.push(g.id); continue; }
    picks[g.id] = p.pick;
  }
  let tiebreaker = null;
  const tb = d.tiebreaker;
  if (tb != null) {
    const g = isObj(tb) && st.games.get(tb.game_id), n = isObj(tb) ? tb.total_points : null;
    if (!g || g.week !== week || !Number.isInteger(n) || n < 0 || n > 200) no(`the tiebreaker ${JSON.stringify(tb)} is not a game of week ${week} and a total of 0-200 points`);
    if (saved < g.kick) tiebreaker = { game_id: g.id, total_points: n };
  }
  return { name, week, saved_at: new Date(saved).toISOString(), saved, tiebreaker, picks, late };
}

function empty(season) { return { how: HOW, season, updated: null, friends: [] }; }

/* merge one sent file (read by readSent) into the friends file, in place; says what it did */
function merge(F, s, st, now = new Date()) {
  let f = F.friends.find(x => key(x.name) === key(s.name));
  const byName = !!f;
  if (!f) f = F.friends.find(x => Array.isArray(x.aka) && x.aka.some(a => key(a) === key(s.name)));
  const isNew = !f;
  if (!f) { f = { name: s.name, weeks: {} }; F.friends.push(f); }
  const wk = 'w' + s.week, old = f.weeks[wk];
  const picks = {};
  let kept = 0;
  /* a game kicked off when this file was saved keeps the pick an earlier file made before it */
  if (old && isObj(old.picks)) for (const [gid, p] of Object.entries(old.picks)) {
    const g = st.games.get(gid);
    if (g && g.kick != null && s.saved >= g.kick && isObj(p) && time(p.saved_at) < g.kick) { picks[gid] = p; kept++; }
  }
  for (const [gid, pick] of Object.entries(s.picks)) picks[gid] = { pick, saved_at: s.saved_at };
  const order = [...st.games.values()].filter(g => g.week === s.week).sort((a, b) => a.kick - b.kick || (a.id < b.id ? -1 : 1)).map(g => g.id);
  const sorted = {}; for (const gid of order) if (picks[gid]) sorted[gid] = picks[gid];
  let tiebreaker = s.tiebreaker;
  if (!tiebreaker && old && old.tiebreaker) { const g = st.games.get(old.tiebreaker.game_id); if (g && s.saved >= g.kick) tiebreaker = old.tiebreaker; }
  f.weeks[wk] = { saved_at: s.saved_at, tiebreaker, picks: sorted };
  f.weeks = Object.fromEntries(Object.entries(f.weeks).sort((a, b) => +a[0].slice(1) - +b[0].slice(1)));
  if (byName && s.name !== f.name) f.name = s.name;
  F.updated = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `${f.name}${f.name !== s.name ? ` (sent as ${s.name})` : ''}, week ${s.week}: ${Object.keys(s.picks).length} pick(s) added${old ? ' (the week sent before replaced' + (kept ? `; ${kept} pick(s) made before kickoff kept from it` : '') + ')' : ''}${isNew ? ', a new friend' : ''}`
    + (s.late.length ? `; ${s.late.length} pick(s) saved after kickoff not counted: ${s.late.join(', ')}` : '')
    + (s.tiebreaker ? `; tiebreaker ${s.tiebreaker.total_points} points on ${s.tiebreaker.game_id}` : '');
}

/* show a friend under another name, the old one kept in aka so a later file under it still finds them; says what it did */
function rename(F, from, to, now = new Date()) {
  const f = F.friends.find(x => key(x.name) === key(from));
  if (!f) throw new Error(`no friend is named ${JSON.stringify(from)}`);
  const name = cleanName(to);
  if (!okName(name)) throw new Error(`the name ${JSON.stringify(to)} is empty, over ${NAME_MAX} characters or not plain text`);
  if (F.friends.some(x => x !== f && (key(x.name) === key(name) || (x.aka || []).some(a => key(a) === key(name)))))
    throw new Error(`${name} is already another friend's name`);
  const old = f.name, weeks = f.weeks;
  const aka = [...new Map([...(f.aka || []), old].filter(x => key(x) !== key(name)).map(x => [key(x), x])).values()];
  for (const k of Object.keys(f)) delete f[k];
  Object.assign(f, { name }, aka.length ? { aka } : {}, { weeks });
  F.updated = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return old;
}

/* take friends out of the file, each found by their name or an aka; every name must find one, else nothing is
   removed. Says whom it took out */
function remove(F, names, now = new Date()) {
  const found = [];
  for (const n of names) {
    const f = F.friends.find(x => key(x.name) === key(n) || (Array.isArray(x.aka) && x.aka.some(a => key(a) === key(n))));
    if (!f) throw new Error(`no friend is named ${JSON.stringify(n)}`);
    if (!found.includes(f)) found.push(f);
  }
  F.friends = F.friends.filter(f => !found.includes(f));
  F.updated = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return found.map(f => f.name);
}

/* the friends file against its rules and the schedule: a list of problems, none when it is good */
function check(F, st) {
  const bad = [];
  if (!isObj(F)) return ['not a JSON object'];
  if (typeof F.how !== 'string' || !F.how) bad.push('no how');
  if (F.season !== st.season) bad.push(`season ${JSON.stringify(F.season)}, where betting/state.json is ${st.season}`);
  if (F.updated != null && time(F.updated) == null) bad.push('updated is not a time');
  if (!Array.isArray(F.friends)) return bad.concat('friends is not a list');
  const names = new Set();
  for (const f of F.friends) {
    if (!isObj(f) || !okName(f.name) || cleanName(f.name) !== f.name) { bad.push(`a friend's name ${JSON.stringify(f && f.name)} is not plain text of 1-${NAME_MAX} characters`); continue; }
    for (const n of [f.name, ...(f.aka || [])]) {
      if (names.has(key(n))) bad.push(`${n} is listed twice`);
      names.add(key(n)); }
    if (f.aka != null && (!Array.isArray(f.aka) || f.aka.some(a => !okName(a) || cleanName(a) !== a))) bad.push(`${f.name}: aka is not a list of plain names`);
    if (!isObj(f.weeks)) { bad.push(`${f.name}: weeks is not an object`); continue; }
    for (const [wk, W] of Object.entries(f.weeks)) {
      const w = /^w(\d{1,2})$/.test(wk) ? +wk.slice(1) : NaN, at = `${f.name}, ${wk}`;
      if (!(w >= 1 && w <= 22)) { bad.push(`${at}: not a week w1-w22`); continue; }
      if (!isObj(W) || time(W.saved_at) == null || !isObj(W.picks)) { bad.push(`${at}: no saved_at or picks`); continue; }
      if (W.tiebreaker != null) { const g = isObj(W.tiebreaker) && st.games.get(W.tiebreaker.game_id);
        if (!g || g.week !== w || !Number.isInteger(W.tiebreaker.total_points) || W.tiebreaker.total_points < 0) bad.push(`${at}: the tiebreaker is not a game of the week and a total`); }
      if (!Object.keys(W.picks).length) bad.push(`${at}: no picks`);
      for (const [gid, p] of Object.entries(W.picks)) {
        const g = st.games.get(gid);
        if (!g) { bad.push(`${at}: ${gid} is not on the schedule`); continue; }
        if (g.week !== w) bad.push(`${at}: ${gid} is week ${g.week}`);
        if (!isObj(p) || (p.pick !== g.home && p.pick !== g.away)) { bad.push(`${at}: ${gid}'s pick ${JSON.stringify(p && p.pick)} is not ${g.away} or ${g.home}`); continue; }
        const t = time(p.saved_at);
        if (t == null) bad.push(`${at}: ${gid}'s pick has no saved_at`);
        else if (g.kick == null || t >= g.kick) bad.push(`${at}: ${gid}'s pick was saved at or after its kickoff`);
        else if (t > time(W.saved_at)) bad.push(`${at}: ${gid}'s pick was saved after the week's saved_at`);
      }
    }
  }
  return bad;
}

/* the file as written: JSON indented one space (as liveparlays/ writes its files), each pick on one line, so a week added is a small diff */
function write(F, file = FILE) {
  F.how = HOW;
  const text = JSON.stringify(F, null, 1).replace(/\{\n\s+"pick": ("[A-Z]+"),\n\s+"saved_at": ("[^"]+")\n\s+\}/g, '{"pick": $1, "saved_at": $2}');
  JSON.parse(text);
  fs.writeFileSync(file, text + '\n');
}

function load(file, season) {
  if (!fs.existsSync(file)) return empty(season);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main(argv) {
  const st = readState();
  if (argv[0] === '--check') {
    const F = load(FILE, st.season), bad = check(F, st);
    for (const b of bad) console.log('  FAIL ' + b);
    const n = Array.isArray(F.friends) ? F.friends.reduce((a, f) => a + Object.values(f.weeks || {}).reduce((b, w) => b + Object.keys(w.picks || {}).length, 0), 0) : 0;
    console.log(bad.length ? `${path.relative(ROOT, FILE)}: ${bad.length} problem(s)` : `${path.relative(ROOT, FILE)}: ${(F.friends || []).length} friend(s), ${n} pick(s), all on the schedule and saved before kickoff`);
    return bad.length ? 1 : 0;
  }
  if (!argv.length || (argv[0] === '--rename' && argv.length !== 3) || (argv[0] === '--remove' && argv.length < 2)) { console.error('usage: node picks/tools/add.js <sent file>... | --check | --rename <old name> <new name> | --remove <name>...'); return 2; }
  const F = load(FILE, st.season);
  const before = check(F, st);
  if (before.length) { console.error(`${path.relative(ROOT, FILE)} does not pass its rules as it stands; nothing ${argv[0] === '--rename' ? 'renamed' : argv[0] === '--remove' ? 'removed' : 'added'}:\n  ` + before.join('\n  ')); return 1; }
  if (argv[0] === '--remove') {
    try { const gone = remove(F, argv.slice(1)); const bad = check(F, st); if (bad.length) throw new Error('the file without them breaks its rules: ' + bad.join('; '));
      write(F); console.log(`${path.relative(ROOT, FILE)}: removed ${gone.join(', ')}; ${F.friends.length} friend(s) left`); return 0; }
    catch (e) { console.error('  REFUSED: ' + e.message); return 1; }
  }
  if (argv[0] === '--rename') {
    try { const old = rename(F, argv[1], argv[2]); const bad = check(F, st); if (bad.length) throw new Error('the renamed file breaks its rules: ' + bad.join('; '));
      write(F); console.log(`${path.relative(ROOT, FILE)}: ${old} is now ${F.friends.find(x => (x.aka || []).includes(old)).name} (a file sent as ${old} still lands on them)`); return 0; }
    catch (e) { console.error('  REFUSED: ' + e.message); return 1; }
  }
  let refused = 0;
  for (const a of argv) {
    try {
      const s = readSent(JSON.parse(fs.readFileSync(a, 'utf8')), st);
      if (!Object.keys(s.picks).length) throw new Error('no pick in it was saved before its game kicked off' + (s.late.length ? ` (${s.late.length} too late)` : ''));
      console.log('  ' + merge(F, s, st));
    } catch (e) { refused++; console.error(`  REFUSED ${a}: ${e.message}`); }
  }
  const after = check(F, st);
  if (after.length) { console.error('the merged file breaks its rules; nothing written:\n  ' + after.join('\n  ')); return 1; }
  if (refused < argv.length) write(F);
  console.log(`${path.relative(ROOT, FILE)}: ${argv.length - refused} file(s) added${refused ? `, ${refused} refused` : ''}`);
  return refused ? 1 : 0;
}

module.exports = { kickAt, readState, readSent, merge, rename, remove, check, write, empty, HOW };
if (require.main === module) process.exit(main(process.argv.slice(2)));
