"""DraftKings' ids for the parlay card's Open in DraftKings, held to the real file and to their cases.

oddsfetch.py keeps DraftKings' own id (sid) for every outcome a price pull reads, in
props/data/dk_links_wk{W}.json, keyed by the book's own names (game|player|stat|side|point).
weekly.py's bake (dk_ids) turns them into the payload's dk, keyed the way the page names a leg, under
the week and the game, for the games still to come:
    <pid>|<stat>|over|<point> and under    a player's line, at DraftKings' point
    <pid>|any_td                           his touchdown (the book's Yes)
    team:<ABBR>|ml                         a team to win
    team:<ABBR>|ats|<point>                a team to cover, its own line
    game|total|over|<point> and under      the game total
    event                                  DraftKings' event id
    at, glat                               when the game's player prices (priced_at.json) and its game
                                           lines (gamelines_wk{W}.csv's pulled_at) were read: an id names
                                           one outcome at one number, so the card dates what it opens
The card (nflbets/build/card.html, dkLeg) looks a leg up by that key, a rung k+ as DraftKings'
Over k-0.5 (or Over k-1, the whole line oddsfetch's threshold() reads a k+ price from), and opens
the ids it finds on DraftKings' betslip.

This holds, with no network and no credits:
  A. the real file of the 11 October 2026 pull (week 5) and the payload committed with it (b91f865): Derrick
     Henry's rushing yards Over and Under 79.5, his touchdown, the Ravens-Falcons total, both teams'
     money lines and spreads and the event come out as the ids in the file; every player key is on the
     player the job placed that book name's prices on; no team defence's touchdown; nothing of a game
     not still to come; and every price row and main line the payload carries for the game, a leg the
     page offers with a real price, has its id under the key the card builds; each game is dated by the
     reads committed with the file (its player prices and its game lines, 21:47 UTC);
  B. the pieces on made-up rows: a point written as the page writes it, a key two book names would
     give two ids left out (one id, kept), a No, an unknown market, a malformed key and a file that
     will not read left out without costing the rest; a read time written as the page reads it, from
     an offset too, and one that will not read, or a row with none, left undated;
  C. the bake writes dk into the payload, for the games still to come only, dated by the reads, and a
     later bake with no file leaves an empty dk, never the last one's ids;
  D. at a rollover last season's file goes to data/archive/ with its week's price files.

    python3 props/build/test_dk_links.py        must end "0 failures"
"""
import contextlib, datetime, io, json, os, shutil, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), 'data')
sys.path.insert(0, HERE)
import weekly, names

checks = []
def chk(ok, what):
    checks.append((bool(ok), what))
    print(('  ok    ' if ok else '  FAIL  ') + what)

def case(label, fn):
    try: fn()
    except Exception as e:
        import traceback; traceback.print_exc()
        chk(False, f'{label}: raised {type(e).__name__}: {e}')

def quiet(fn, *a):
    with contextlib.redirect_stdout(io.StringIO()): return fn(*a)

def payload_pool(pay):
    """the name rule's pool on the payload's own roster (the raw roster file is not committed): each
    player's printed names and legal form as the payload's roster entry carries them, names_of's
    split, every one at a position the book prices"""
    pool = names.Pool([], [], pay['sched'])
    for g, e in (pay.get('roster') or {}).items():
        pool.who[g] = [[e[2]] + ([e[4]] if len(e) > 4 and e[4] else []), e[0], (e[5] if len(e) > 5 and e[5] else '')]
        pool.skill.add(g)
    return pool

# ---- A. the real file and the payload baked with it ------------------------------------------------
GID = '2026_05_BAL_ATL'
# the commit that wrote the file and the payload baked beside it ("props: refresh 2026-10-11 21:48 UTC"):
# read from git, so a later pull that rewrites the week's file (or prices the game in play) cannot move
# the case; on a checkout without that history the files as they are now are read instead, and said
AT = 'b91f865'
def committed(rel, text=False):
    try:
        r = subprocess.run(['git', 'show', f'{AT}:{rel}'], cwd=HERE, capture_output=True, timeout=60)
        if r.returncode == 0: return r.stdout.decode('utf-8') if text else json.loads(r.stdout.decode('utf-8'))
    except (OSError, ValueError, subprocess.TimeoutExpired): pass
    return None
TIMES = ('priced_at.json', 'gamelines_wk5.csv')    # the reads the ids are dated by, committed with them

def a():
    raw, pay = committed('props/data/dk_links_wk5.json'), committed('props/data/payload.json')
    times = {fn: committed('props/data/' + fn, text=True) for fn in TIMES}
    if raw is None or pay is None or None in times.values():
        print(f'  (commit {AT} is not in this checkout: the files as they are now)')
        path = os.path.join(DATA, 'dk_links_wk5.json')
        if not os.path.exists(path): chk(False, f'A. {path} is missing'); return
        raw = json.load(open(path, encoding='utf-8'))
        pay = json.load(open(os.path.join(DATA, 'payload.json'), encoding='utf-8'))
        times = {fn: open(os.path.join(DATA, fn), encoding='utf-8').read() for fn in TIMES if os.path.exists(os.path.join(DATA, fn))}
    byid = {g['id']: g for g in pay['sched']}
    to_come = {GID, '2026_05_BUF_LA'}           # the two games still to come when the file was written
    tmp = tempfile.mkdtemp(prefix='test_dk_links_')
    try:
        json.dump(raw, open(os.path.join(tmp, 'dk_links_wk5.json'), 'w', encoding='utf-8'))
        for fn, t in times.items(): open(os.path.join(tmp, fn), 'w', encoding='utf-8').write(t)
        pool = payload_pool(pay)
        dk, n, clash = quiet(weekly.dk_ids, tmp, byid, to_come, pool.match)
    finally: shutil.rmtree(tmp, ignore_errors=True)
    D = (dk.get('5') or {}).get(GID) or {}
    sid = lambda k: (raw.get(k) or {}).get('sid')
    henry = '00-0032764'
    chk(D.get(f'{henry}|rushing_yards|over|79.5') == sid(f'{GID}|Derrick Henry|rushing_yards|Over|79.5') is not None,
        f"A. Derrick Henry's rushing yards Over 79.5 is the file's id ({D.get(f'{henry}|rushing_yards|over|79.5')})")
    chk(D.get(f'{henry}|rushing_yards|under|79.5') == sid(f'{GID}|Derrick Henry|rushing_yards|Under|79.5') is not None, "A. and the Under")
    chk(D.get(f'{henry}|any_td') == sid(f'{GID}|Derrick Henry|any_td|Yes|') is not None, f"A. his touchdown is the file's Yes ({D.get(f'{henry}|any_td')})")
    chk(D.get('game|total|over|43.5') == sid(f'{GID}|game|total|Over|43.5') is not None and D.get('game|total|under|43.5') == sid(f'{GID}|game|total|Under|43.5') is not None,
        f"A. the Ravens-Falcons total, Over and Under 43.5, are the file's ids ({D.get('game|total|over|43.5')})")
    chk(D.get('team:BAL|ml') == sid(f'{GID}|game|ml|away|') is not None and D.get('team:ATL|ml') == sid(f'{GID}|game|ml|home|') is not None, 'A. the money lines are each team\'s, away and home')
    # nflverse's spread is +3 for the home side favoured by 3: the page's home leg is ATL -3, its away leg BAL +3
    g = byid[GID]
    chk(D.get(f'team:ATL|ats|{weekly.dk_point(-g["sp"])}') == sid(f'{GID}|game|spread|home|-3.0') is not None and D.get('team:BAL|ats|3') == sid(f'{GID}|game|spread|away|3.0') is not None,
        f"A. the spreads are keyed by each team's own line, as the page's cover leg carries it (ATL {-g['sp']}, BAL {g['sp']})")
    chk(D.get('event') == '34118099', f"A. the event is DraftKings' event id ({D.get('event')})")
    chk(not any('D/ST' in k or 'Falcons' in k or 'Ravens' in k for k in D), 'A. no team defence\'s touchdown')
    chk(set(dk) == {'5'} and set(dk['5']) == to_come and not clash, f'A. only the games still to come, no key two names gave two ids ({sorted(dk.get("5", {}))}, {clash})')
    # every player key on the player the job put that book name's prices on
    placed = {r['player']: r['pid'] for r in pay['prices']['5'] if r['game_id'] == GID and r.get('pid')}
    book = {}
    for k in raw:
        p = k.split('|')
        if p[0] == GID and len(p) == 5 and p[1] != 'game' and not names.is_team_row(p[1]): book.setdefault(p[1], set()).add(p[2])
    wrong = [b for b in book if b in placed and not any(k.startswith(placed[b] + '|') for k in D)]
    chk(not wrong and all(b in placed for b in book), f'A. every book name the file prices is on the player its prices are on ({wrong}, unplaced {sorted(b for b in book if b not in placed)})')
    pids = {k.split('|')[0] for k in D if not k.startswith(('team:', 'game|', 'event')) and k not in ('at', 'glat')}
    chk(pids <= set(placed.values()), f'A. no id on a player the prices are not on ({sorted(pids - set(placed.values()))})')
    # every leg the page offers with a real price on the game has its id under the card's key
    miss = []
    for r in pay['prices']['5']:
        if r['game_id'] != GID or not r.get('pid'): continue
        k = int(r['threshold'])
        if r['market'] == 'any_td':
            if k == 1 and f"{r['pid']}|any_td" not in D: miss.append(f"{r['player']} touchdown")
        elif not any(f"{r['pid']}|{r['market']}|over|{weekly.dk_point(p)}" in D for p in (k - 0.5, k - 1)): miss.append(f"{r['player']} {r['market']} {k}+")
    for pid, sts in (pay['mkt'].get('5') or {}).items():
        for st, L in sts.items():
            if L.get('g') != GID: continue
            for side in ('over', 'under'):
                if f'{pid}|{st}|{side}|{weekly.dk_point(L["line"])}' not in D: miss.append(f"{L['n']} {st} {side} {L['line']}")
    chk(not miss, f'A. every price row and main line of the game opens: its id is under the key the card builds ({len(miss)} missing: {miss[:5]})')
    chk(n == sum(len([k for k in v if k not in ('at', 'glat')]) for v in dk['5'].values()) and n > 100, f'A. {n} ids counted, the read times not among them')
    # dated by the reads committed with the file: the Ravens-Falcons player prices and the slate's game
    # lines both at 21:47 UTC; Bills-Rams had its game lines read then and no player prices yet, so no at
    priced = json.loads(times.get('priced_at.json') or '{}')
    gl = {r['game_id']: r.get('pulled_at') for r in __import__('csv').DictReader(io.StringIO(times.get('gamelines_wk5.csv') or ''))}
    B = (dk.get('5') or {}).get('2026_05_BUF_LA') or {}
    chk(D.get('at') == priced.get(GID) == '2026-10-11T21:47Z' and D.get('glat') == gl.get(GID) == '2026-10-11T21:47Z',
        f"A. Ravens-Falcons is dated by its price pull (at {D.get('at')}) and its game lines' read (glat {D.get('glat')})")
    chk(B.get('glat') == gl.get('2026_05_BUF_LA') and 'at' not in B and not any(k not in ('at', 'glat', 'event') and not k.startswith(('team:', 'game|')) for k in B),
        f"A. Bills-Rams, game lines only, carries glat ({B.get('glat')}) and no at")
case('A', a)

# ---- B. the pieces --------------------------------------------------------------------------------
SCHED = [{'id': '2026_06_IND_PIT', 'w': 6, 'd': '2026-10-18', 't': '13:00', 'a': 'IND', 'h': 'PIT', 'sp': 3.0},
         {'id': '2026_06_SF_SEA', 'w': 6, 'd': '2026-10-18', 't': '16:25', 'a': 'SF', 'h': 'SEA', 'sp': -2.5}]
ROSTER = [{'team': 'IND', 'position': 'TE', 'status': 'ACT', 'full_name': 'Andrew Ogletree', 'first_name': 'Andrew', 'last_name': 'Ogletree', 'gsis_id': '00-0037292', 'football_name': 'Andrew'},
          {'team': 'PIT', 'position': 'WR', 'status': 'ACT', 'full_name': 'Calvin Austin', 'first_name': 'Calvin', 'last_name': 'Austin', 'gsis_id': '00-0037800', 'football_name': 'Calvin'},
          {'team': 'SEA', 'position': 'WR', 'status': 'ACT', 'full_name': 'Jaxon Smith-Njigba', 'first_name': 'Jaxon', 'last_name': 'Smith-Njigba', 'gsis_id': '00-0038543', 'football_name': 'Jaxon'}]
E = lambda s: {'sid': s, 'link': 'https://sportsbook.draftkings.com/?outcomes=' + s.replace('#', '%23')}

def b():
    for x, want in (('79.5', '79.5'), ('80.0', '80'), ('80', '80'), ('-3.0', '-3'), ('-0.0', '0'), ('0.5', '0.5'), (-7.5, '-7.5'), (43.5, '43.5')):
        chk(weekly.dk_point(x) == want, f'B. a point of {x!r} is written {want!r}, as String(+k) writes it on the page ({weekly.dk_point(x)!r})')
    for bad in ('nan', 'inf', 'x'):
        try: weekly.dk_point(bad); chk(False, f'B. {bad!r} is not a point')
        except ValueError: chk(True, f'B. {bad!r} is not a point')
    pool = names.Pool(ROSTER, [], SCHED)
    byid = {g['id']: g for g in SCHED}
    tmp = tempfile.mkdtemp(prefix='test_dk_links_')
    try:
        g1, g2 = SCHED[0]['id'], SCHED[1]['id']
        json.dump({f'{g1}|Drew Ogletree|receptions|Over|2.5': E('A#1'), f'{g1}|Andrew Ogletree|receptions|Over|2.5': E('A#2'),    # one key, two ids: out
                   f'{g1}|Drew Ogletree|receptions|Under|2.5': E('A#3'), f'{g1}|Andrew Ogletree|receptions|Under|2.5': E('A#3'),  # one key, one id: kept
                   f'{g1}|Calvin Austin|any_td|No|': E('N#1'), f'{g1}|Calvin Austin|any_td|Yes|': E('Y#1'),
                   f'{g1}|Calvin Austin|tackles|Over|4.5': E('U#1'), f'{g1}|Calvin Austin|receiving_yards|Over|': E('U#2'),
                   f'{g1}|Pittsburgh Steelers D/ST|any_td|Yes|': E('T#1'), f'{g1}|Nobody Known|receptions|Over|3.5': E('U#3'),
                   f'{g1}|game|ml|away|': E('M#a'), f'{g1}|game|spread|home|-3.0': E('S#h'), f'{g1}|game|total|Over|44.0': E('O#1'),
                   f'{g1}|game|ml|draw|': E('U#4'), f'{g1}|bad': E('U#5'), f'{g1}|event': {'sid': '777'}, f'{g1}|game|ml|home|': {'link': 'x'}},
                  open(os.path.join(tmp, 'dk_links_wk6.json'), 'w', encoding='utf-8'))
        json.dump({f'{g2}|Jaxon Smith-Njigba|receiving_yards|Over|64.5': E('J#1'), f'{g2}|game|spread|away|2.5': E('S#a'),
                   '2025_06_SF_SEA|game|ml|home|': E('L#1')}, open(os.path.join(tmp, 'dk_links_wk7.json'), 'w', encoding='utf-8'))
        open(os.path.join(tmp, 'dk_links_wk8.json'), 'w').write('{not json')
        # the reads: g1's player prices at 05:17 UTC and its game lines with an offset, g2's price time
        # unreadable and its game-line row with no time (a row from before the rows carried one)
        json.dump({g1: '2026-10-17T05:17Z', g2: 'Saturday'}, open(os.path.join(tmp, 'priced_at.json'), 'w', encoding='utf-8'))
        open(os.path.join(tmp, 'gamelines_wk6.csv'), 'w').write(f'game_id,away_moneyline,home_moneyline,spread_line,pulled_at\n{g1},120,-140,3.0,2026-10-16T22:17:00+00:00\n{g2},110,-130,-2.5,\n')
        log = io.StringIO()
        with contextlib.redirect_stdout(log): dk, n, clash = weekly.dk_ids(tmp, byid, {g1, g2}, pool.match)
        D1, D2 = dk.get('6', {}).get(g1, {}), dk.get('6', {}).get(g2, {})
        chk('00-0037292|receptions|over|2.5' not in D1 and (g1, '00-0037292|receptions|over|2.5') in clash, f'B. Drew and Andrew Ogletree giving his Over two ids: the key is left out and listed ({clash})')
        chk(D1.get('00-0037292|receptions|under|2.5') == 'A#3', 'B. the two names giving one id: kept')
        chk(D1.get('00-0037800|any_td') == 'Y#1' and 'N#1' not in D1.values(), "B. a touchdown is the book's Yes, never its No")
        chk(not {'U#1', 'U#2', 'U#3', 'U#4', 'U#5', 'T#1'} & set(D1.values()), f'B. an unknown market, a line with no point, a name on nobody, a team defence, an unknown side and a malformed key are left out ({D1})')
        chk(D1.get('team:IND|ml') == 'M#a' and D1.get('team:PIT|ats|-3') == 'S#h' and D1.get('game|total|over|44') == 'O#1' and D1.get('event') == '777' and 'team:PIT|ml' not in D1,
            f'B. the game lines: a team to win, to cover on its own line, the total on a whole number, the event; an entry with no id left out ({D1})')
        chk(D2 == {'00-0038543|receiving_yards|over|64.5': 'J#1', 'team:SF|ats|2.5': 'S#a'} and '2025_06_SF_SEA' not in json.dumps(dk),
            f'B. a game is filed under its own week whatever the file, and another season\'s game is left out ({D2})')
        chk(D1.get('at') == '2026-10-17T05:17Z' and D1.get('glat') == '2026-10-16T22:17Z',
            f"B. a game is dated by its price pull and its game lines' read, an offset written in UTC as the page reads it ({D1.get('at')}, {D1.get('glat')})")
        chk('at' not in D2 and 'glat' not in D2, f'B. a read time that will not read, or a row with none, leaves the game undated ({D2})')
        chk('dk_links_wk8.json not read' in log.getvalue() and n == len(D1) - 2 + len(D2), f'B. a file that will not read is said, and costs nothing else ({n} ids, the read times not counted)')
        dk2, n2, _ = quiet(weekly.dk_ids, tmp, byid, {g2}, pool.match)
        chk(set(dk2.get('6', {})) == {g2}, 'B. a game not still to come has no ids')
    finally: shutil.rmtree(tmp, ignore_errors=True)
case('B', b)

# ---- C. the bake ----------------------------------------------------------------------------------
def c():
    now = datetime.datetime(2026, 10, 18, 18, 0, tzinfo=datetime.timezone.utc)     # IND-PIT kicked off at 17:00 UTC, SF-SEA is at 20:25
    tmp = tempfile.mkdtemp(prefix='test_dk_links_')
    keep = weekly.DATA
    try:
        data = os.path.join(tmp, 'data'); os.makedirs(data)
        g1, g2 = SCHED[0]['id'], SCHED[1]['id']
        json.dump({f'{g1}|Calvin Austin|any_td|Yes|': E('Y#1'), f'{g1}|event': {'sid': '1'},
                   f'{g2}|Jaxon Smith-Njigba|any_td|Yes|': E('Y#2'), f'{g2}|game|total|Under|47.5': E('O#2'), f'{g2}|event': {'sid': '2'}},
                  open(os.path.join(data, 'dk_links_wk6.json'), 'w', encoding='utf-8'))
        json.dump({g1: '2026-10-17T05:17Z', g2: '2026-10-17T05:17Z'}, open(os.path.join(data, 'priced_at.json'), 'w', encoding='utf-8'))
        open(os.path.join(data, 'gamelines_wk6.csv'), 'w').write(f'game_id,total_line,over_odds,under_odds,pulled_at\n{g2},47.5,-110,-110,2026-10-18T08:17Z\n')
        pp = os.path.join(tmp, 'payload.json')
        def bake():
            json.dump({'season': 2026, 'sched': [dict(g) for g in SCHED], 'mkt': {}, 'players': [], 'depth': {}, 'dk': {'5': {'old': {'event': 'x'}}}}, open(pp, 'w', encoding='utf-8'))
            raw = {'srows': [], 'stats': {}, 'skipped_live': set(), 'irows': [], 'rrows': [dict(r, season='2026', week='6') for r in ROSTER]}
            weekly.DATA = data; weekly.problems.clear(); weekly.report.clear()
            out = io.StringIO()
            with contextlib.redirect_stdout(out): weekly.bake(pp, {'season': 2026}, [], 6, False, now, raw)
            return json.load(open(pp, encoding='utf-8')), out.getvalue(), list(weekly.problems)
        pay, log, probs = bake()
        chk(pay.get('dk') == {'6': {g2: {'00-0038543|any_td': 'Y#2', 'game|total|under|47.5': 'O#2', 'event': '2', 'at': '2026-10-17T05:17Z', 'glat': '2026-10-18T08:17Z'}}},
            f"C. the bake writes dk for the game still to come alone, dated by its reads, and none of the last payload's ({pay.get('dk')})")
        chk('DraftKings ids: 3 on 1 game(s) still to come' in log and not probs, f'C. it says how many, and reports no problem ({probs})')
        os.remove(os.path.join(data, 'dk_links_wk6.json'))
        pay, log, probs = bake()
        chk(pay.get('dk') == {}, f"C. with no file the payload's dk is empty, not the last one's ({pay.get('dk')})")
    finally:
        weekly.DATA = keep
        shutil.rmtree(tmp, ignore_errors=True)
case('C', c)

# ---- D. a rollover moves last season's file with its week's price files -----------------------------
def d():
    tmp = tempfile.mkdtemp(prefix='test_dk_links_')
    keep = weekly.DATA
    try:
        weekly.DATA = tmp
        json.dump({'2025_01_DAL_PHI|event': {'sid': '1'}}, open(os.path.join(tmp, 'dk_links_wk1.json'), 'w', encoding='utf-8'))
        open(os.path.join(tmp, 'prices_wk1.csv'), 'w').write('game_id,player,market,threshold,odds\n2025_01_DAL_PHI,A B,any_td,1,300\n')
        json.dump({'2026_02_DAL_NYG|event': {'sid': '2'}}, open(os.path.join(tmp, 'dk_links_wk2.json'), 'w', encoding='utf-8'))
        json.dump({}, open(os.path.join(tmp, 'dk_links_wk3.json'), 'w', encoding='utf-8'))
        moved = quiet(weekly.archive_other_seasons)
        left = sorted(f for f in os.listdir(tmp) if f.endswith(('.json', '.csv')))
        chk(moved == ['week 1 (2025)'] and left == ['dk_links_wk2.json', 'dk_links_wk3.json'] and os.path.exists(os.path.join(tmp, 'archive', '2025', 'dk_links_wk1.json')),
            f"D. at a rollover last season's dk_links_wk1.json goes to the archive with its prices; this season's and an empty one stay ({moved}, {left})")
    finally:
        weekly.DATA = keep
        shutil.rmtree(tmp, ignore_errors=True)
case('D', d)

fails = [w for ok, w in checks if not ok]
print(f'{len(checks)} checks, {len(fails)} failures')
sys.exit(1 if fails else 0)
