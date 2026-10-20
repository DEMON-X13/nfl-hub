/* The parlay card's name rule against the job's, case by case.
 *
 *   node nflbets/build/test_dkname.js        (from the hub root; must end "N checks, 0 failures")
 *
 * Pull from DraftKings (nflbets/build/card.html, on the site owner's devices alone, since 20 October 2026) reads
 * DraftKings' own prices for a parlay's player legs from The Odds API, which names each player as DraftKings prints him.
 * The card places that name on one of the game's players by the job's own rule, props/build/names.py (Pool.match: a
 * printed name, then the legal form, then a short first name, a nickname of props/build/nicknames.json or a two-word name
 * swapped; one player in the first tier with any, else none), ported into the card (dkNameRule, between its "the name
 * rule" and "end of the name rule" marks) with nicknames.json set into its NICKNAMES slot by nflbets/build/build.js. A
 * looser rule would put DraftKings' price and slip id for one player on another's leg, so this holds the port to the
 * original on:
 *   A. every pair of props/build/test_unmatched.py's PAIRS (names.name_rule: the tier a book name is of a player's names,
 *      or none), read from that file by Python's ast, never run;
 *   B. every case of the props audit's own copy of the rule (audit.js, its two chk(nameRule(...)) lines), read from
 *      audit.js: the card answers as names.py does, and as the audit expects;
 *   C. Pool.match over whole games, built here from test_unmatched.py's own fixtures (its REAL, SMITHS, THOMASES,
 *      BENGALS and JOHNSONS rows, its schedule and its filler players, by ast) and a few of this test's own (accents,
 *      suffixes, punctuation, a nickname shared by two): names.py's Pool on the roster rows, against the card's
 *      pullPlayers and dkNameRule on the payload's roster entries weekly.py would bake from the same rows (its entry
 *      rule, names.names_of, and the rows it keeps: a skill position by the roster or the stats). The card places a
 *      name on exactly the player names.py does, or on nobody where names.py places it on nobody (a name names.py
 *      places on a defensive back is a player the payload never carries, so the card, which never sees him, places
 *      it on nobody: held so);
 *   D. names.norm on awkward strings (accents, ligatures, suffixes, punctuation, tabs, control spaces) against the
 *      card's dkNrm;
 *   E. every nickname of nicknames.json both ways, through the card's table as the build set it.
 * The card's code is read from the page as the build makes it (require('./build.js').out), so the slot is filled
 * exactly as the page has it. Python is spawned isolated (python3 -I), names.py imported from props/build. */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const BUILD = path.join(ROOT, 'props', 'build');
let checks = 0; const fails = [];
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const end = () => { console.log(`${checks} checks, ${fails.length} failures`); fails.forEach(f => console.log('  FAIL:', f)); process.exit(fails.length ? 1 : 0); };

/* ---- the card's rule, from the page the build makes ---- */
const OUT = require('./build.js').out;
const A = '/* ---- the name rule (props/build/names.py', Z = '/* ---- end of the name rule ---- */';
const ai = OUT.indexOf(A), zi = OUT.indexOf(Z);
chk(ai > 0 && zi > ai && OUT.split(A).length === 2 && OUT.split(Z).length === 2, "the page's parlay card has no one name rule between its marks");
if (!(ai > 0 && zi > ai)) end();
const pp = OUT.indexOf('function pullPlayers(g){'), ppEnd = pp > 0 ? OUT.indexOf('\n  /*', pp) : -1;
chk(pp > 0 && ppEnd > pp, "the page's parlay card has no pullPlayers");
if (!(pp > 0 && ppEnd > pp)) end();
const CARD = vm.runInNewContext(`${OUT.slice(ai, zi)}\n${OUT.slice(pp, ppEnd)}\n({dkNameRule, dkNrm, DK_NICK, pullPlayers, setPay:p=>{ PAY=p; }})`, { PAY: null });

/* ---- names.py's answers (and the cases), from Python ---- */
const PY = String.raw`
import ast, json, os, sys
B = sys.argv[1]
sys.path.insert(0, B)
import names
def lits(path, wanted):
    tree = ast.parse(open(path, encoding='utf-8').read())
    out = {}
    for n in tree.body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name) and n.targets[0].id in wanted:
            out[n.targets[0].id] = ast.literal_eval(n.value)
    return out
T = lits(os.path.join(B, 'test_unmatched.py'), {'PAIRS', 'SCHED', 'REAL', 'SMITHS', 'THOMASES', 'BENGALS', 'JOHNSONS', 'WORDS'})
missing = {'PAIRS', 'SCHED', 'REAL', 'SMITHS', 'THOMASES', 'BENGALS', 'JOHNSONS', 'WORDS'} - set(T)
if missing: raise SystemExit('test_unmatched.py no longer has ' + ', '.join(sorted(missing)))
inp = json.load(sys.stdin)
SCHED = T['SCHED']
GAME = {t: g['id'] for g in SCHED if g['w'] == 5 for t in (g['a'], g['h'])}
GAME.update(CAR='2026_06_CAR_PHI', PHI='2026_06_CAR_PHI')
def player(team, first, last, gsis, pos='WR'):
    return {'team': team, 'position': pos, 'status': 'ACT', 'full_name': f'{first} {last}', 'first_name': first, 'last_name': last, 'gsis_id': gsis, 'football_name': first}
def roster(extra=()):
    rows = [dict(r) for r in T['REAL']]
    for t in GAME:
        for i, w in enumerate(T['WORDS']):
            rows.append(player(t, w, f'{t.title()}{w}son', f'00-9{t}{i:02d}'))
    rows += [dict(r) for r in extra]
    for r in rows: r.update(season='2026', week=r.get('week') or '5')
    return rows
def entry(r):
    # weekly.py's bake: [team, status, name, week, then his football name with the surname where it differs, then his legal form]
    e = [r['team'], r['status'], r['full_name'], int(float(r.get('week') or 0))]
    printed, legal = names.names_of(r)
    fb = [n for n in printed if names.norm(n) != names.norm(r['full_name'])]
    if legal: e += [fb[0] if fb else None, legal]
    elif fb: e.append(fb[0])
    return e
def baked(rows, stats):
    # the rows weekly.py keeps in the payload's roster: a skill position by the roster, or one the stats show at one
    shown = {s['player_id'] for s in stats if (s.get('position') or '').upper() in names.SKILL}
    return {r['gsis_id']: entry(r) for r in rows if r.get('gsis_id') and ((r.get('position') or '').upper() in names.SKILL or r['gsis_id'] in shown)}
nola = [{'id': '2019_02_NO_LA', 'w': 2, 'a': 'NO', 'h': 'LA'}]
cin = [{'id': '2021_01_MIN_CIN', 'w': 1, 'a': 'MIN', 'h': 'CIN'}]
six = SCHED + [{'id': '2026_06_PIT_TB', 'w': 6, 'a': 'PIT', 'h': 'TB'}]
mikey = dict(T['THOMASES'][0], gsis_id='00-8000012', full_name='Mikey Thomas', first_name='Mikey', football_name='Mikey')
dbs = [dict(T['SMITHS'][1], gsis_id='00-8000011', team='PHI')]
wrstat = [{'player_id': '00-0041153', 'week': '3', 'team': 'CAR', 'position': 'WR', 'player_display_name': 'Devonta Smith'}]
own = [player('DET', 'José', 'Núñez', '00-7000001'), player('DET', 'Amon-Ra', 'St. Brown', '00-7000002'), player('ARI', 'Marvin', 'Harrison Jr.', '00-7000003'),
       player('ARI', 'Drew', 'Hale', '00-7000004'), player('ARI', 'Andy', 'Hale', '00-7000005'), player('DET', "D'Andre", "O'Neal", '00-7000006'),
       dict(player('DET', 'Robert', 'Quill', '00-7000007'), full_name='Bobby Quill', football_name='Bobby')]
POOL = [
    ('a Jim Jordan beside Jordan James', roster([player('SF', 'Jim', 'Jordan', '00-8000005')]), [], SCHED, 'James Jordan', 5, '2026_05_SF_SEA'),
    ('a player exactly the book\'s name over a nickname', roster([player('IND', 'Drew', 'Ogletree', '00-8000006')]), [], SCHED, 'Drew Ogletree', 5, '2026_05_IND_PIT'),
    ('never a player of another game', roster([player('IND', 'Drew', 'Ogletree', '00-8000006')]), [], SCHED, 'Drew Ogletree', 5, '2026_05_DET_ARI'),
    ('the legal form (Zonovan Knight)', roster(), [], SCHED, 'Zonovan Knight', 5, '2026_05_DET_ARI'),
    ('a nickname (Drew Ogletree)', roster(), [], SCHED, 'Drew Ogletree', 5, '2026_05_IND_PIT'),
    ('a two-word name swapped (James Jordan)', roster(), [], SCHED, 'James Jordan', 5, '2026_05_SF_SEA'),
    ('a filler exactly', roster(), [], SCHED, 'Delta Detdeltason', 5, '2026_05_DET_ARI'),
    ('a filler with a short first name', roster(), [], SCHED, 'Del Detdeltason', 5, '2026_05_DET_ARI'),
    ('a filler of the other game', roster(), [], SCHED, 'Delta Detdeltason', 5, '2026_05_SF_SEA'),
    ('a name nobody has', roster(), [], SCHED, 'Nobody Atall', 5, '2026_05_SF_SEA'),
    ('2019 NO at LA, Michael Thomas', T['THOMASES'], [], nola, 'Michael Thomas', 2, '2019_02_NO_LA'),
    ('2019 NO at LA, Mike Thomas', T['THOMASES'], [], nola, 'Mike Thomas', 2, '2019_02_NO_LA'),
    ('without the Saints\' row, Michael Thomas', T['THOMASES'][1:], [], nola, 'Michael Thomas', 2, '2019_02_NO_LA'),
    ('a legal form before a nickname (Mikey Thomas)', T['THOMASES'][1:] + [mikey], [], nola, 'Michael Thomas', 2, '2019_02_NO_LA'),
    ('DeVonta Smith, the receiver beside a back', roster(T['SMITHS'] + T['JOHNSONS']), [], six, 'DeVonta Smith', 6, '2026_06_CAR_PHI'),
    ('Brandon Johnson, the receiver beside a back', roster(T['SMITHS'] + T['JOHNSONS']), [], six, 'Brandon Johnson', 6, '2026_06_PIT_TB'),
    ('two defensive backs of the name', roster([T['SMITHS'][1]] + dbs), [], SCHED, 'DeVonta Smith', 6, '2026_06_CAR_PHI'),
    ('a back the stats have at receiver', roster(T['SMITHS']), wrstat, SCHED, 'DeVonta Smith', 6, '2026_06_CAR_PHI'),
    ('2021 MIN at CIN, Mike Thomas', T['BENGALS'], [], cin, 'Mike Thomas', 1, '2021_01_MIN_CIN'),
    ('without the receiver\'s row, Mike Thomas', T['BENGALS'][1:], [], cin, 'Mike Thomas', 1, '2021_01_MIN_CIN'),
    ('the receiver alone, Michael Thomas', T['BENGALS'][:1], [], cin, 'Michael Thomas', 1, '2021_01_MIN_CIN'),
    ('accents (Jose Nunez)', roster(own), [], SCHED, 'Jose Nunez', 5, '2026_05_DET_ARI'),
    ('punctuation (Amon Ra St Brown)', roster(own), [], SCHED, 'Amon Ra St Brown', 5, '2026_05_DET_ARI'),
    ('a suffix (Marvin Harrison)', roster(own), [], SCHED, 'Marvin Harrison', 5, '2026_05_DET_ARI'),
    ('a suffix the other way (Marvin Harrison Jr.)', roster(own), [], SCHED, 'Marvin Harrison Jr.', 5, '2026_05_DET_ARI'),
    ('a printed name (Drew Hale) beside an Andy', roster(own), [], SCHED, 'Drew Hale', 5, '2026_05_DET_ARI'),
    ('a nickname two players answer to (Andrew Hale)', roster(own), [], SCHED, 'Andrew Hale', 5, '2026_05_DET_ARI'),
    ('a football name (Bobby Quill)', roster(own), [], SCHED, 'Bobby Quill', 5, '2026_05_DET_ARI'),
    ('the legal form of a football name (Robert Quill)', roster(own), [], SCHED, 'Robert Quill', 5, '2026_05_DET_ARI'),
    ('a nickname of the legal form (Rob Quill)', roster(own), [], SCHED, 'Rob Quill', 5, '2026_05_DET_ARI'),
    ('apostrophes (DAndre ONeal)', roster(own), [], SCHED, 'DAndre ONeal', 5, '2026_05_DET_ARI'),
    ('a team defence\'s row', roster(own), [], SCHED, 'Detroit Lions D/ST', 5, '2026_05_DET_ARI'),
]
pool = []
for label, rows, stats, sched, book, week, gid in POOL:
    m = names.Pool(rows, stats, sched).match(book, week, gid)
    g = next(x for x in sched if x['id'] == gid)
    pool.append({'label': label, 'book': book, 'game': {'id': g['id'], 'a': g['a'], 'h': g['h'], 'w': g['w']}, 'roster': baked(rows, stats), 'py': list(m),
                 'team_row': names.is_team_row(book)})
pairs = [{'book': b, 'full': f, 'others': o, 'legal': l, 'want': w, 'py': names.name_rule(b, f, o, l)} for b, f, o, l, w in T['PAIRS']]
audit = [{'book': c['book'], 'full': c['full'], 'legal': c['legal'], 'py': names.name_rule(c['book'], c['full'], [], c['legal'] or None)} for c in inp['audit']]
norms = [{'s': s, 'py': names.norm(s)} for s in inp['norms']]
nick = [[g, sorted(v)] for g, v in sorted(names.NICK.items())]
print(json.dumps({'pairs': pairs, 'audit': audit, 'pool': pool, 'norms': norms, 'nick': nick}))
`;
/* B's cases, from the audit's two lines of chk(nameRule(...)): each call, its book name, the player's full name, his
   legal form where given, and what the audit expects (null for !nameRule(...), the tier for ==='tier', else any) */
const AUD = fs.readFileSync(path.join(BUILD, 'audit.js'), 'utf8');
const audLines = AUD.split('\n').filter(l => /^\s*chk\(nameRule\('/.test(l));
chk(audLines.length === 2, `the audit's nameRule cases are not its two chk(nameRule(...)) lines: ${audLines.length} found`);
const audCases = [];
for (const line of audLines) for (const m of line.matchAll(/(!?)nameRule\('([^']*)','([^']*)'(?:,\{legal:'([^']*)'\})?\)(?:==='(\w+)')?/g))
  audCases.push({ book: m[2], full: m[3], legal: m[4] || '', want: m[1] ? null : (m[5] || 'any') });
chk(audCases.length >= 15, `too few of the audit's nameRule cases were read: ${audCases.length}`);
const NORMS = ['José Núñez', 'Amon-Ra St. Brown', "D'Andre O'Neal", 'Odell Beckham Jr.', 'Marvin Harrison Jr', 'Kenneth Walker III', 'A.J. Brown', '  Lots   of\tspace ',
  'Ja’Marr Chase', 'ﬁnley Fiﬁ', 'Ćelić Žák Ii', 'Name\u001cWith\u001fControls', 'Trailing V', 'JR Smith', 'Smith Sr. ', 'O`Brien', 'Él Niño-López iv', '', 'X'];
const r = spawnSync('python3', ['-I', '-c', PY, BUILD], { input: JSON.stringify({ audit: audCases, norms: NORMS }), encoding: 'utf8', timeout: 120000 });
if (r.status !== 0) { chk(false, 'names.py could not be run: ' + (r.stderr || r.error || '').toString().trim().slice(-400)); end(); }
const PYR = JSON.parse(r.stdout.trim().split('\n').pop());
const one = (desc, full, others, legal) => CARD.dkNameRule(desc, [{ pid: 'X', names: [full, ...(others || [])], legal: legal || '' }]);

/* A. the pairs: the tier, or none */
for (const c of PYR.pairs) {
  const got = one(c.book, c.full, c.others, c.legal), tier = got.pid ? got.how : null;
  chk(tier === c.py, `A. ${JSON.stringify(c.book)} for ${JSON.stringify(c.full)}${c.others.length ? ' or ' + c.others.join('/') : ''}${c.legal ? ' (legally ' + c.legal + ')' : ''}: the card says ${tier}, names.py ${c.py}`);
  chk(c.py === c.want, `A. names.py itself no longer gives test_unmatched.py's answer for ${JSON.stringify(c.book)}: ${c.py}, not ${c.want}`);
}
chk(PYR.pairs.length >= 20, `A. too few of test_unmatched.py's PAIRS were read: ${PYR.pairs.length}`);
/* B. the audit's cases: as names.py, and as the audit expects */
PYR.audit.forEach((c, i) => {
  const got = one(c.book, c.full, [], c.legal), tier = got.pid ? got.how : null, want = audCases[i].want;
  chk(tier === c.py, `B. ${JSON.stringify(c.book)} for ${JSON.stringify(c.full)}${c.legal ? ' (legally ' + c.legal + ')' : ''}: the card says ${tier}, names.py ${c.py}`);
  chk(want === 'any' ? !!tier : tier === want, `B. ${JSON.stringify(c.book)} for ${JSON.stringify(c.full)}: the card says ${tier}, the audit expects ${want}`);
});
/* C. whole games: the card's placement on the baked roster against names.py's on the rows */
for (const c of PYR.pool) {
  CARD.setPay({ roster: c.roster });
  const players = CARD.pullPlayers(c.game), got = c.team_row ? { pid: null, how: 'team row' } : CARD.dkNameRule(c.book, players);
  const [pid, how] = c.py;
  chk(players.every(p => [c.game.a, c.game.h].includes(c.roster[p.pid][0])) && players.length === Object.values(c.roster).filter(e => [c.game.a, c.game.h].includes(e[0])).length, `C. ${c.label}: the card's players are not exactly the game's clubs' from the baked roster`);
  chk((got.pid || null) === (pid || null) && (!pid || got.how === how),
    `C. ${c.label}: ${JSON.stringify(c.book)} in ${c.game.id}: the card places it on ${got.pid || 'nobody'} (${got.how}), names.py on ${pid || 'nobody'} (${how})`);
}
chk(PYR.pool.some(c => !c.py[0] && c.py[1] === 'ambiguous') && PYR.pool.some(c => c.py[1] === 'short') && PYR.pool.some(c => c.py[1] === 'first') && PYR.pool.some(c => c.py[1] === 'swapped') && PYR.pool.some(c => c.py[1] === 'exact'),
  'C. the whole-game cases do not meet every tier and an ambiguous name');
/* D. normalisation */
for (const c of PYR.norms) chk(CARD.dkNrm(c.s) === c.py, `D. ${JSON.stringify(c.s)}: the card normalises it to ${JSON.stringify(CARD.dkNrm(c.s))}, names.py to ${JSON.stringify(c.py)}`);
/* E. every nickname both ways, through the card's own table */
{ const card = Object.keys(CARD.DK_NICK).sort().map(k => [k, [...CARD.DK_NICK[k]].sort()]);
  chk(JSON.stringify(card) === JSON.stringify(PYR.nick), "E. the card's nickname table (set in by the build) is not names.py's: " + JSON.stringify(card).slice(0, 200));
  let n = 0;
  for (const [given, nicks] of PYR.nick) for (const nick of nicks) { n++;
    const got = one(`${nick} Zzyzx`, `${given} Zzyzx`, [], ''), back = one(`${given} Zzyzx`, `${nick} Zzyzx`, [], '');
    chk(got.how === 'short' && back.how === 'short', `E. ${nick} for ${given} (and back) is not a short form on the card: ${got.how} / ${back.how}`); }
  chk(n >= 30, `E. too few nicknames met: ${n}`); }
end();
