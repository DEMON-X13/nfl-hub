"""The price rows no player takes, and when a run goes red for them, held to their cases.

The price pull of 11 October 2026 01:25 UTC published week 5 and then went red over three rows:
"Drew Ogletree (2026_05_IND_PIT)", "James Jordan (2026_05_SF_SEA)" and "Zonovan Knight
(2026_05_DET_ARI)", all unmatched. Each was a name the matcher could not read, not a player the
site lacks: the roster calls the Cardinals' back Bam Knight (his first name is Zonovan), the Colts'
tight end Andrew Ogletree, and the 49ers' back Jordan James, whom DraftKings prints with his names
swapped. weekly.py also reported every row it could not place, so even a signing the roster file
had not caught up with mailed the owner a failure for a page that was fine.

This runs weekly.bake on fixtures, the players' rows lifted from nflverse's roster files, and
holds it to:
  A. the three real rows land on the right players, and the run reports nothing;
  B. a few rows for players the roster has no row for: listed in the payload, logged, no problem;
  C. a name that could be two players is a problem;
  D. more than MISS_NAMES names on no player in the games to come is a problem (and four is not);
  E. more than MISS_SHARE of one game's player rows on no player is a problem;
  F. two book names placed on one player's same price is a problem;
  G. a row on a game already played is never a problem;
  H. the Eagles' receiver DeVonta Smith, beside the Panthers' defensive back Devonta Smith whose
     row the roster file keeps all season, takes his prices and main lines in their week-6 game;
and the name rule itself (names.py): a player's legal form (first name and surname) is a tier
below his printed names, so the real 2019 Saints-Rams game puts "Michael Thomas" on the Saints'
Michael Thomas and "Mike Thomas" on the Rams' (a Michael too), and without the Saints' row
"Michael Thomas" is never an exact match on the Rams' man; and the audit's copy of the rule
(nameRule in audit.js) reads every case the same way.

    python3 props/build/test_unmatched.py        must end "0 failures"

On origin/main's weekly.py and names.py, A, B, F, H and the name-rule cases fail: that is the bug.
"""
import contextlib, csv, datetime, io, json, os, shutil, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import weekly, names

checks = []
def chk(ok, what):
    checks.append((bool(ok), what))
    print(('  ok    ' if ok else '  FAIL  ') + what)

# ---- fixtures: week 5, three games to come and one played --------------------------------------
NOW = datetime.datetime(2026, 10, 11, 12, 0, tzinfo=datetime.timezone.utc)
SCHED = [
    {'id': '2026_05_IND_PIT', 'w': 5, 'd': '2026-10-11', 't': '13:00', 'a': 'IND', 'h': 'PIT'},
    {'id': '2026_05_DET_ARI', 'w': 5, 'd': '2026-10-11', 't': '16:25', 'a': 'DET', 'h': 'ARI'},
    {'id': '2026_05_SF_SEA', 'w': 5, 'd': '2026-10-11', 't': '16:25', 'a': 'SF', 'h': 'SEA'},
    {'id': '2026_05_TB_DAL', 'w': 5, 'd': '2026-10-08', 't': '20:15', 'a': 'TB', 'h': 'DAL'},
    {'id': '2026_06_CAR_PHI', 'w': 6, 'd': '2026-10-18', 't': '13:00', 'a': 'CAR', 'h': 'PHI'},
]
GAME = {t: g['id'] for g in SCHED if g['w'] == 5 for t in (g['a'], g['h'])}
GAME.update(CAR='2026_06_CAR_PHI', PHI='2026_06_CAR_PHI')
# the three, as nflverse's roster_2026.csv had them on 11 October 2026
REAL = [
    {'team': 'ARI', 'position': 'RB', 'status': 'ACT', 'full_name': 'Bam Knight', 'first_name': 'Zonovan', 'last_name': 'Knight', 'gsis_id': '00-0037157', 'football_name': 'Bam'},
    {'team': 'IND', 'position': 'TE', 'status': 'ACT', 'full_name': 'Andrew Ogletree', 'first_name': 'Andrew', 'last_name': 'Ogletree', 'gsis_id': '00-0037292', 'football_name': 'Andrew'},
    {'team': 'SF', 'position': 'RB', 'status': 'ACT', 'full_name': 'Jordan James', 'first_name': 'Jordan', 'last_name': 'James', 'gsis_id': '00-0040177', 'football_name': 'Jordan'},
]
# the two Smiths of the Panthers-Eagles game of week 6 (Sunday 18 October), as the same file had them
SMITHS = [
    {'team': 'PHI', 'position': 'WR', 'status': 'ACT', 'full_name': 'DeVonta Smith', 'first_name': 'DeVonta', 'last_name': 'Smith', 'gsis_id': '00-0036912', 'football_name': 'DeVonta', 'week': '5'},
    {'team': 'CAR', 'position': 'DB', 'status': 'DEV', 'full_name': 'Devonta Smith', 'first_name': 'DeVonta', 'last_name': 'Smith', 'gsis_id': '00-0041153', 'football_name': 'DeVonta', 'week': '4'},
]
# the two Thomases of the Saints at the Rams, week 2 of 2019, as nflverse's roster_2019.csv has them:
# the Rams' Mike Thomas is a Michael too
THOMASES = [
    {'team': 'NO', 'position': 'WR', 'status': 'ACT', 'full_name': 'Michael Thomas', 'first_name': 'Michael', 'last_name': 'Thomas', 'gsis_id': '00-0032765', 'football_name': 'Michael'},
    {'team': 'LA', 'position': 'WR', 'status': 'ACT', 'full_name': 'Mike Thomas', 'first_name': 'Michael', 'last_name': 'Thomas', 'gsis_id': '00-0033114', 'football_name': 'Mike'},
]
# and the two Brandon Johnsons of the Steelers at the Buccaneers, week 6 of 2026
JOHNSONS = [
    {'team': 'PIT', 'position': 'WR', 'status': 'DEV', 'full_name': 'Brandon Johnson', 'first_name': 'Brandon', 'last_name': 'Johnson', 'gsis_id': '00-0037382', 'football_name': 'Brandon'},
    {'team': 'TB', 'position': 'DB', 'status': 'DEV', 'full_name': 'Brandon Johnson', 'first_name': 'Brandon', 'last_name': 'Johnson', 'gsis_id': '00-0040027', 'football_name': 'Brandon'},
]
WORDS = ['Alpha', 'Bravo', 'Delta', 'Echo', 'Golf', 'Hotel', 'India', 'Kilo', 'Lima', 'Oscar', 'Papa', 'Romeo', 'Tango']

def player(team, first, last, gsis, pos='WR'):
    return {'team': team, 'position': pos, 'status': 'ACT', 'full_name': f'{first} {last}', 'first_name': first, 'last_name': last, 'gsis_id': gsis, 'football_name': first}

def roster(extra=(), drop=()):
    rows = [dict(r) for r in REAL]
    for t in GAME:
        for i, w in enumerate(WORDS):           # thirteen a club, each with a surname of his own
            rows.append(player(t, w, f'{t.title()}{w}son', f'00-9{t}{i:02d}'))
    rows += [dict(r) for r in extra]
    rows = [r for r in rows if r['team'] not in drop]
    for r in rows: r.update(season='2026', week=r.get('week') or '5')
    return rows

def price(name, team, market='any_td', k='1', odds='1500'):
    return {'game_id': GAME[team], 'player': name, 'market': market, 'threshold': k, 'odds': odds}

def base_prices6():
    """the same for the Panthers-Eagles game of week 6"""
    return [price(f'{w} {t.title()}{w}son', t, m, k) for t in ('CAR', 'PHI') for w in WORDS for m, k in (('any_td', '1'), ('receptions', '3'))]

def base_prices():
    """two rows for every filler (a touchdown and receptions): 52 player rows a game, as a real one"""
    return [price(f'{w} {t.title()}{w}son', t, m, k) for t in GAME if GAME[t].startswith('2026_05') for w in WORDS for m, k in (('any_td', '1'), ('receptions', '3'))]

def bake(prices, extra=(), drop=(), week=5, now=NOW, lines=()):
    """weekly.bake on these rows (and main lines, wk{week}_lines.csv): (problems, payload, what it logged)"""
    tmp = tempfile.mkdtemp(prefix='test_unmatched_')
    try:
        data = os.path.join(tmp, 'data'); os.makedirs(data)
        with open(os.path.join(data, f'prices_wk{week}.csv'), 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=['game_id', 'player', 'market', 'threshold', 'odds']); w.writeheader(); w.writerows(prices)
        if lines:
            with open(os.path.join(data, f'wk{week}_lines.csv'), 'w', newline='', encoding='utf-8') as f:
                w = csv.DictWriter(f, fieldnames=['game_id', 'stat', 'player', 'line', 'over', 'under']); w.writeheader(); w.writerows(lines)
        pp = os.path.join(tmp, 'payload.json')
        json.dump({'season': 2026, 'sched': SCHED, 'mkt': {}, 'players': [], 'depth': {}}, open(pp, 'w', encoding='utf-8'))
        raw = {'srows': [], 'stats': {}, 'skipped_live': set(), 'irows': [], 'rrows': roster(extra, drop)}
        weekly.DATA = data; weekly.problems.clear(); weekly.report.clear()
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            weekly.bake(pp, {'season': 2026}, [], week, False, now, raw)
        return list(weekly.problems), json.load(open(pp, encoding='utf-8')), out.getvalue()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def pid_of(pay, name, team, week='5'):
    return {r.get('pid') for r in pay['prices'][week] if r['player'] == name and r['game_id'] == GAME[team]}

def case(label, fn):
    try: fn()
    except Exception as e:
        import traceback; traceback.print_exc()
        chk(False, f'{label}: raised {type(e).__name__}: {e}')

# ---- A. the three rows of 11 October land on their players, and nothing is reported ------------
def a():
    probs, pay, log = bake(base_prices() + [price('Drew Ogletree', 'IND', odds='2000'), price('James Jordan', 'SF', odds='3500'), price('Zonovan Knight', 'ARI', odds='1700')])
    chk(pid_of(pay, 'Drew Ogletree', 'IND') == {'00-0037292'}, "A. DraftKings' Drew Ogletree is the Colts' Andrew Ogletree (00-0037292)")
    chk(pid_of(pay, 'James Jordan', 'SF') == {'00-0040177'}, "A. DraftKings' James Jordan is the 49ers' Jordan James (00-0040177)")
    chk(pid_of(pay, 'Zonovan Knight', 'ARI') == {'00-0037157'}, "A. DraftKings' Zonovan Knight is the Cardinals' Bam Knight (00-0037157)")
    chk(not probs, f'A. the run reports nothing ({probs})')
    chk(not pay.get('unmatched'), f"A. the payload's unmatched is empty ({pay.get('unmatched')})")
    chk((pay.get('roster') or {}).get('00-0037157', [])[4:] == [None, 'Zonovan Knight'], f"A. the payload's roster entry carries his legal form apart, for the audit ({(pay.get('roster') or {}).get('00-0037157')})")
    chk('Zonovan Knight as Bam Knight (first)' in log, 'A. the log says Zonovan Knight was placed by his legal first name')
case('A', a)

# ---- B. a few rows for players nobody has: in the payload and the log, not a problem -----------
def b():
    nobody = [price('Newly Signed', 'DET'), price('Practice Callup', 'ARI'), price('Waiver Claim', 'SEA')]
    starter = [price('Signed Starter', 'PIT', m, k) for m, k in (('any_td', '1'), ('receptions', '4'), ('receiving_yards', '40'), ('rushing_yards', '20'))]
    probs, pay, log = bake(base_prices() + nobody + starter)
    chk(not probs, f'B. three depth players and one starter in every market (4 of 56 rows) the roster lacks are no problem ({probs})')
    want = sorted(f"{r['player']} ({r['game_id']}): unmatched" for r in nobody + starter[:1])
    chk(pay.get('unmatched') == want, f"B. every one is in the payload's unmatched, as the audit requires ({pay.get('unmatched')})")
    chk(all(not r.get('pid') for r in pay['prices']['5'] if r['player'] in ('Newly Signed', 'Signed Starter')), 'B. and on no player')
    chk('Newly Signed' in log and 'Signed Starter' in log, 'B. the log names them')
case('B', b)

# ---- C. a name that could be two players ---------------------------------------------------------
def c():
    twins = [player('IND', 'Kenneth', 'Smithers', '00-8000001'), player('IND', 'Kendall', 'Smithers', '00-8000002'),
             player('SEA', 'Carter', 'Mike', '00-8000003'), player('SF', 'Carter', 'Mike', '00-8000004')]
    probs, pay, log = bake(base_prices() + [price('Ken Smithers', 'IND'), price('Carter Mike', 'SEA')], extra=twins)
    chk(any('Ken Smithers' in p and 'ambiguous' in p for p in probs), f'C. "Ken Smithers" (Kenneth or Kendall) is a problem ({probs})')
    chk(any('Carter Mike' in p and 'ambiguous' in p for p in probs), 'C. two players of one exact name in a game is a problem')
    chk(not pid_of(pay, 'Ken Smithers', 'IND') - {None}, 'C. and it is on neither of them')
case('C', c)

# ---- D. many names on no player at once ------------------------------------------------------------
def d():
    five = [price('Unknown One', 'IND'), price('Unknown Two', 'PIT'), price('Unknown Three', 'DET'), price('Unknown Four', 'ARI'), price('Unknown Five', 'SEA')]
    probs, pay, log = bake(base_prices() + five[:4])
    chk(not probs, f'D. four names on no player, one a game, is no problem ({probs})')
    probs, pay, log = bake(base_prices() + five)
    chk(all(any(r['player'] in p for p in probs) for r in five), f'D. five is a problem naming them all ({probs})')
    probs, pay, log = bake(base_prices(), drop=('SEA',))
    chk(any('2026_05_SF_SEA' in p for p in probs), "D. a club's roster gone (Seattle) is a problem")
case('D', d)

# ---- E. a large share of one game's rows on no player -----------------------------------------------
def e():
    two = [price(n, 'DET', m, k) for n in ('Big Signing', 'Other Signing') for m, k in (('any_td', '1'), ('receptions', '4'), ('receiving_yards', '40'), ('rushing_yards', '20'))]
    probs, pay, log = bake(base_prices() + two)
    chk(any('2026_05_DET_ARI' in p for p in probs), f'E. two players in every market, 8 of 60 rows in one game, is a problem ({probs})')
case('E', e)

# ---- F. two book names on one player's same price -------------------------------------------------------
def f():
    probs, pay, log = bake(base_prices() + [price('Drew Ogletree', 'IND', odds='2000'), price('Andrew Ogletree', 'IND', odds='2500')])
    chk(any('Andrew Ogletree' in p and 'Drew Ogletree' in p and 'one player' in p for p in probs), f'F. Drew and Andrew Ogletree both on his touchdown price is a problem ({probs})')
    probs, pay, log = bake(base_prices() + [price('Drew Ogletree', 'IND', odds='2000'), price('Andrew Ogletree', 'IND', 'receptions', '2', '-120')])
    chk(not probs, f'F. the two names on different markets are not ({probs})')
case('F', f)

# ---- G. a played game is graded, not reported ---------------------------------------------------------
def g():
    probs, pay, log = bake(base_prices() + [price('Nobody Here', 'TB'), price('Nobody Either', 'DAL'), price('Nor Him', 'TB'), price('Nor Her', 'DAL'), price('Nor Them', 'TB')])
    chk(not probs and not pay.get('unmatched'), f'G. five names on no player in a game already played are no problem ({probs})')
case('G', g)

# ---- H. a shared name in the game, and only one of the two at a position the book prices ---------------
NOW6 = datetime.datetime(2026, 10, 12, 12, 0, tzinfo=datetime.timezone.utc)   # Monday: the first week-6 pull
def h():
    smith = [price('DeVonta Smith', 'PHI', m, k, o) for m, k, o in (('any_td', '1', '195'), ('receiving_yards', '60', '-111'), ('receptions', '5', '-137'))]
    lines = [{'game_id': '2026_06_CAR_PHI', 'stat': st, 'player': 'DeVonta Smith', 'line': l, 'over': o, 'under': u}
             for st, l, o, u in (('receiving_yards', '59.5', '-111', '-113'), ('receptions', '4.5', '-137', '108'))]
    probs, pay, log = bake(base_prices6() + smith, extra=SMITHS, week=6, now=NOW6, lines=lines)
    chk(pid_of(pay, 'DeVonta Smith', 'PHI', '6') == {'00-0036912'}, f"H. DraftKings' DeVonta Smith is the Eagles' receiver (00-0036912), not Carolina's defensive back ({pid_of(pay, 'DeVonta Smith', 'PHI', '6')})")
    chk(sorted(((pay.get('mkt') or {}).get('6') or {}).get('00-0036912', {})) == ['receiving_yards', 'receptions'], f"H. and his two main lines are his ({((pay.get('mkt') or {}).get('6') or {})})")
    chk(not probs, f'H. the run reports nothing ({probs})')
    chk('DeVonta Smith (2026_06_CAR_PHI) as 00-0036912, not 00-0041153' in log, 'H. the log says which of the two took the name, and why')
    twins = [dict(SMITHS[0], gsis_id='00-8000010', team='CAR')]
    probs, pay, log = bake(base_prices6() + smith, extra=SMITHS + twins, week=6, now=NOW6)
    chk(any('DeVonta Smith' in p and 'ambiguous' in p for p in probs), f'H. two receivers of the name in the game stay ambiguous and are reported ({probs})')
case('H', h)

# ---- the name rule ----------------------------------------------------------------------------------------
PAIRS = [   # (book, full name, other printed names, legal form, the rule's answer)
    ('Drew Ogletree', 'Andrew Ogletree', [], '', 'short'),
    ('Zonovan Knight', 'Bam Knight', [], 'Zonovan Knight', 'first'),
    ('Zonovan Knight', 'Bam Knight', [], '', None),
    ('Bam Knight', 'Bam Knight', [], 'Zonovan Knight', 'exact'),
    ('Michael Thomas', 'Michael Thomas', [], '', 'exact'),
    ('Michael Thomas', 'Mike Thomas', [], 'Michael Thomas', 'first'),
    ('Mike Thomas', 'Mike Thomas', [], 'Michael Thomas', 'exact'),
    ('Mike Thomas', 'Michael Thomas', [], '', 'short'),
    ('Kenny Moore', 'Kenny Moore', ['Kenneth Moore'], '', 'exact'),
    ('James Jordan', 'Jordan James', [], '', 'swapped'),
    ('Cam Ward', 'Cameron Ward', [], '', 'short'),
    ('Kenny Gainwell', 'Kenneth Gainwell', [], '', 'short'),
    ('A.J. Brown', 'AJ Brown', [], '', 'exact'),
    ('Jalon Daniels', 'Jayden Daniels', [], '', None),
    ('Jeremiyah Love', 'Jordan Love', [], '', None),
    ('Brian Robinson Jr.', 'Bijan Robinson', [], '', None),
    ('Rick Henry', 'Derrick Henry', [], '', None),
    ('Ian Thomas', 'Brian Thomas', [], '', None),
    ('Drew Jordan', 'Andrew James', [], '', None),
    ('James Jordan Smith', 'Jordan James Smith', [], '', None),
    ('Mike Evans', 'Michael Evans', [], '', 'short'),
    ('Odell Beckham', 'Odell Beckham Jr.', [], '', 'exact'),
]
def rule(book, full, others, legal):
    """names.name_rule, or on a names.py that knows no legal form, with it as one more name"""
    try: return names.name_rule(book, full, others, legal)
    except TypeError: return names.name_rule(book, full, [*others, legal] if legal else others)

def rules():
    for book, full, others, legal, want in PAIRS:
        got = rule(book, full, others, legal)
        chk(got == want, f'name rule: {book!r} for {full!r}{" or " + "/".join(others) if others else ""}{" (legally " + legal + ")" if legal else ""} is {want} (got {got})')
    pool = names.Pool(roster(extra=[player('SF', 'Jim', 'Jordan', '00-8000005')]), [], SCHED)
    chk(pool.match('James Jordan', 5, '2026_05_SF_SEA') == (None, 'ambiguous'), f"name rule: with a Jim Jordan beside Jordan James, James Jordan is ambiguous ({pool.match('James Jordan', 5, '2026_05_SF_SEA')})")
    pool = names.Pool(roster(extra=[player('IND', 'Drew', 'Ogletree', '00-8000006')]), [], SCHED)
    chk(pool.match('Drew Ogletree', 5, '2026_05_IND_PIT') == ('00-8000006', 'exact'), 'name rule: a player whose name is exactly the book\'s is taken over a nickname')
    chk(pool.match('Drew Ogletree', 5, '2026_05_DET_ARI') == (None, 'unmatched'), 'name rule: never a player of another game')
case('name rule', rules)

def tiers():
    # the real 2019 Saints at Rams: a legal form never stands level with a printed name
    nola = [{'id': '2019_02_NO_LA', 'w': 2, 'a': 'NO', 'h': 'LA'}]
    pool = names.Pool(THOMASES, [], nola)
    got = pool.match('Michael Thomas', 2, '2019_02_NO_LA')
    chk(got == ('00-0032765', 'exact'), f'name rule: 2019 NO at LA, "Michael Thomas" is the Saints\' Michael Thomas, exactly ({got})')
    got = pool.match('Mike Thomas', 2, '2019_02_NO_LA')
    chk(got == ('00-0033114', 'exact'), f'name rule: and "Mike Thomas" is the Rams\' Mike Thomas, exactly ({got})')
    got = names.Pool(THOMASES[1:], [], nola).match('Michael Thomas', 2, '2019_02_NO_LA')
    chk(got[1] != 'exact', f'name rule: without the Saints\' row, "Michael Thomas" is no exact match on the Rams\' Mike Thomas ({got})')
    chk(got == ('00-0033114', 'first'), f'name rule: it is his legal form, a loose placement the run logs ({got})')
    mikey = dict(THOMASES[0], gsis_id='00-8000012', full_name='Mikey Thomas', first_name='Mikey', football_name='Mikey')
    got = names.Pool(THOMASES[1:] + [mikey], [], nola).match('Michael Thomas', 2, '2019_02_NO_LA')
    chk(got == ('00-0033114', 'first'), f'name rule: a legal form is tried before a nickname (a made-up Saints Mikey Thomas beside him) ({got})')
    # a shared name with one of the two at a position the book prices, and with neither
    six = SCHED + [{'id': '2026_06_PIT_TB', 'w': 6, 'a': 'PIT', 'h': 'TB'}]
    pool = names.Pool(roster(extra=SMITHS + JOHNSONS), [], six)
    for book, gid, want in (('DeVonta Smith', '2026_06_CAR_PHI', '00-0036912'), ('Brandon Johnson', '2026_06_PIT_TB', '00-0037382')):
        got = pool.match(book, 6, gid)
        chk(got == (want, 'exact'), f'name rule: {book} in {gid} is the receiver {want}, the one of the two the book prices ({got})')
    dbs = [dict(SMITHS[1], gsis_id='00-8000011', team='PHI')]
    got = names.Pool(roster(extra=[SMITHS[1]] + dbs), [], SCHED).match('DeVonta Smith', 6, '2026_06_CAR_PHI')
    chk(got == (None, 'ambiguous'), f'name rule: two defensive backs of the name stay ambiguous ({got})')
    stats = [{'player_id': '00-0041153', 'week': '3', 'team': 'CAR', 'position': 'WR', 'player_display_name': 'Devonta Smith'}]
    got = names.Pool(roster(extra=SMITHS), stats, SCHED).match('DeVonta Smith', 6, '2026_06_CAR_PHI')
    chk(got == (None, 'ambiguous'), f'name rule: a back the stats have at receiver counts as one the book prices: ambiguous ({got})')
case('name tiers', tiers)

# ---- the audit's copy of the rule reads every case the same ---------------------------------------
def audit_rule():
    src = open(os.path.join(HERE, 'audit.js'), encoding='utf-8').read()
    i, j = src.find('const nrm='), src.find("chk(nameRule('Cam Ward'")
    if i < 0 or j < i: chk(False, "audit: nameRule not found in audit.js"); return
    body = src[i:j]
    js = ("const path=require('path'); const B=process.argv[1]; const req=p=>require(path.resolve(B,p));\n"
          "const pairs=JSON.parse(require('fs').readFileSync(0,'utf8'));\n"
          f"(function(require){{ {body}\n console.log(JSON.stringify(pairs.map(([b,f,o,l])=>nameRule(b,f,{{names:o,legal:l}})||null))); }})(req);")
    try:
        r = subprocess.run(['node', '-e', js, HERE], input=json.dumps([p[:4] for p in PAIRS]), capture_output=True, text=True, timeout=60)
    except FileNotFoundError:
        chk(False, 'audit: node is not installed, so the audit and this check cannot run'); return
    if r.returncode: chk(False, f'audit: nameRule did not run: {r.stderr.strip()[-300:]}'); return
    got = json.loads(r.stdout.strip().splitlines()[-1])
    for (book, full, others, legal, want), g_ in zip(PAIRS, got):
        py = rule(book, full, others, legal)
        chk(g_ == py, f'audit: nameRule reads {book!r} for {full!r}{" (legally " + legal + ")" if legal else ""} as names.py does ({g_} vs {py})')
case('audit', audit_rule)

fails = [w for ok, w in checks if not ok]
print(f'{len(checks)} checks, {len(fails)} failures')
sys.exit(1 if fails else 0)
