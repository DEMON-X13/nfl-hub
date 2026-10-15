"""Each player's ESPN athlete id in the payload (weekly.py's espn_ids), held to its cases.

The page's Refresh odds button (app v107, part3.js espnRefresh) reads DraftKings' player lines from ESPN's
free feed in the visitor's browser, on a press and never on a schedule (the owner, 15 October 2026: "would
rather it be on demand rather than like a constant job"). ESPN names each line's player by its own athlete
id, so the props job bakes PAY.espn_ids, {ESPN id: the payload's player id}, from nflverse's roster (its
espn_id beside its gsis_id), the file the run already downloads: no request, and nothing else of ESPN's in
the payload. This holds it on the real roster rows of fixtures/espn/roster.csv (SEA, DEN, NYJ and NE, week 6
of 2026, as nflverse had them on 15 October):

  A. every row with an ESPN id places on its gsis id: Sam Darnold (3912547), Jaylen Waddle (4372016) and
     Geno Smith (15864); a rookie the roster has no ESPN id for (Malik McClain) is not there, and the page
     places him by name within his game;
  B. only the players the payload carries: a defender or a player off the payload's list is left out;
  C. an id the roster gives two players is left out (and named), never guessed; an id written as a float
     ("15864.0") reads as its integer; a blank or a word is no id;
  D. weekly.bake end to end: the payload carries espn_ids for its own players and no ESPN line, game line
     or read of any kind (no espn, espn_meta); a bake on a roster without a player drops his id, so the
     map is always this run's.

    python3 props/build/test_espn_ids.py        must end "0 failures"
"""
import contextlib, csv, io, json, os, shutil, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import weekly

checks = []
def chk(ok, what):
    checks.append((bool(ok), what))
    print(('  ok    ' if ok else '  FAIL  ') + what)

def case(label, fn):
    try: fn()
    except Exception as e:
        import traceback; traceback.print_exc()
        chk(False, f'{label}: raised {type(e).__name__}: {e}')

ROSTER = list(csv.DictReader(open(os.path.join(HERE, 'fixtures', 'espn', 'roster.csv'), newline='', encoding='utf-8')))
DARNOLD, WADDLE, GENO, MCCLAIN, SINGLETON = '00-0034869', '00-0036613', '00-0030565', '00-0041267', '00-0031898'
SKILL = {r['gsis_id'] for r in ROSTER if r['position'] in ('QB', 'RB', 'WR', 'TE', 'K')}

def a():
    ids, amb = weekly.espn_ids(ROSTER, SKILL)
    chk(ids.get('3912547') == DARNOLD and ids.get('4372016') == WADDLE and ids.get('15864') == GENO,
        f"A: Darnold, Waddle and Geno Smith are placed by their ESPN ids: {[ids.get(k) for k in ('3912547', '4372016', '15864')]}")
    chk(MCCLAIN not in ids.values(), 'A: Malik McClain, with no ESPN id on the roster, is not in the map')
    want = {r['espn_id']: r['gsis_id'] for r in ROSTER if r['espn_id'].strip() and r['gsis_id'] in SKILL}
    chk(ids == want and not amb, f'A: every skill player with an ESPN id is in the map and nothing else ({len(ids)} of {len(want)})')
    chk(list(ids) == sorted(ids, key=int), 'A: the map is written in the order of the ESPN ids, so a rebake changes only what changed')
case('A', a)

def b():
    ids, _ = weekly.espn_ids(ROSTER, {DARNOLD, WADDLE})
    chk(ids == {'3912547': DARNOLD, '4372016': WADDLE}, f'B: only the players the payload carries: {ids}')
    chk(SINGLETON not in weekly.espn_ids(ROSTER, SKILL)[0].values(), 'B: a linebacker the payload does not carry is left out')
case('B', b)

def c():
    rows = [dict(r) for r in ROSTER if r['gsis_id'] in (DARNOLD, WADDLE, GENO)]
    rows.append(dict(rows[0], gsis_id='00-0099999', full_name='Someone Else'))         # Geno's ESPN id on a second player
    rows[2] = dict(rows[2], espn_id='4372016.0')                                      # a float
    rows.append(dict(rows[1], gsis_id='00-0099998', espn_id=''))
    rows.append(dict(rows[1], gsis_id='00-0099997', espn_id='n/a'))
    ids, amb = weekly.espn_ids(rows, {DARNOLD, WADDLE, GENO, '00-0099999', '00-0099998', '00-0099997'})
    chk('15864' not in ids and amb == ['15864'], f'C: an id the roster gives two players is left out and named: {ids} {amb}')
    chk(ids.get('4372016') == WADDLE, 'C: an id written as a float reads as its integer')
    chk(not {'00-0099998', '00-0099997'} & set(ids.values()), 'C: a blank or a word is no id')
case('C', c)

def d():
    S = weekly.SEASON
    tmp = tempfile.mkdtemp(prefix='test_espn_ids_')
    try:
        data = os.path.join(tmp, 'data'); os.makedirs(data)
        pp = os.path.join(tmp, 'payload.json')
        players = [{'id': g} for g in sorted(SKILL)]
        def bake(rrows):
            json.dump({'season': S, 'sched': [], 'mkt': {}, 'players': players, 'depth': {}}, open(pp, 'w', encoding='utf-8'))
            raw = {'srows': [], 'stats': {}, 'skipped_live': set(), 'irows': [], 'rrows': rrows, 'snap_rows': []}
            weekly.DATA = data; weekly.problems.clear(); weekly.report.clear()
            with contextlib.redirect_stdout(io.StringIO()):
                weekly.bake(pp, {'season': S}, [], 6, False, weekly.datetime.datetime(S, 10, 15, 3, tzinfo=weekly.datetime.timezone.utc), raw)
            return json.load(open(pp, encoding='utf-8'))
        pay = bake(ROSTER)
        chk(pay.get('espn_ids') == weekly.espn_ids(ROSTER, SKILL)[0] and pay['espn_ids'].get('3912547') == DARNOLD,
            f"D: the payload carries espn_ids for its own players ({len(pay.get('espn_ids') or {})})")
        chk(not ({'espn', 'espn_meta'} & set(pay)), f"D: the payload carries no ESPN read: {sorted({'espn', 'espn_meta'} & set(pay))}")
        pay2 = bake([r for r in ROSTER if r['gsis_id'] != WADDLE])
        chk('4372016' not in pay2['espn_ids'] and pay2['espn_ids'].get('3912547') == DARNOLD, 'D: a rebake on a roster without a player drops his id')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
case('D', d)

fails = [w for ok, w in checks if not ok]
print(f'{len(checks)} checks, {len(fails)} failures')
sys.exit(1 if fails else 0)
