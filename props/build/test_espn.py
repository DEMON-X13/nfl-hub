"""espn_lines.py, the free read of DraftKings' lines from ESPN, held to its cases on a local server that
answers with recorded responses (fixtures/espn/: week 6 of 2026 as ESPN gave it on 15 October, two games,
SEA at DEN and NYJ at NE, trimmed to a few players each; no network, no credits, no real waits, and
props/data is untouched):

    python3 props/build/test_espn.py        must end "0 failures"

  A. a read: every page to pageCount at limit=1000 with a cache-buster; a main line's twin items kept as
     one value; a milestone's k as the rung k+; the anytime touchdown, which has no target; an athlete
     the roster has no espn_id for looked up once and placed by name, and one nobody in the game is left
     unmatched; the game lines by club in the payload's terms with DraftKings' ids; read_at the server's
     Date header and never a lastUpdated label (they run three hours ahead).
  B. a neutral site where ESPN calls the other club home, and an event matched by its clubs.
  C. 500s and then the answer, through netfetch.
  D. a game kicked off before the read (not read, frozen, never rewritten) and during it (thrown away).
  E. a junk body, an answer with no items or pageCount, and pages of 25: the last entry kept and a problem.
  F. a 404 (no player lines posted yet): not a failure.
  G. ESPN not answering: logged only, the last entry kept, two games in a row end the read.
  H. no main line across every game within 36 hours of kickoff, and I. under 80% placed by id: a problem.
  J. two values for one player and stat: the latest lastUpdated, as an order.
  K. the file written whole or not at all; the command line end to end.
  L. the bake: ESPN's game lines beside the pull's (the fresher wins, a stale one never), PAY.espn and
     espn_meta, DraftKings' ids filled in for a game the pull has none of, never over one it has.
  M. no good read for a day with a game within two days is a problem; N. the rollover moves the files;
     O. weekly.py's step reads the report and problem lines, and reads nothing --offline."""
import contextlib, copy, csv, datetime, email.utils, http.server, io, json, math, os, shutil, sys, tempfile, threading, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import espn_lines as E  # noqa: E402
import weekly  # noqa: E402
import names  # noqa: E402
import netfetch as N  # noqa: E402

FIX = os.path.join(HERE, 'fixtures', 'espn')
SB0 = json.load(open(os.path.join(FIX, 'scoreboard_w6.json'), encoding='utf-8'))
ITEMS0 = {e: json.load(open(os.path.join(FIX, f'props_{e}.json'), encoding='utf-8')) for e in ('401872995', '401873001')}
ATH = json.load(open(os.path.join(FIX, 'athletes.json'), encoding='utf-8'))
ROSTER0 = list(csv.DictReader(open(os.path.join(FIX, 'roster.csv'), newline='', encoding='utf-8')))
S = 2026
SEA_DEN, NYJ_NE = f'{S}_06_SEA_DEN', f'{S}_06_NYJ_NE'
DARNOLD, WADDLE, HORTON, MYERS, BADIE, MCCLAIN, WILSON, HENRY = ('00-0034869', '00-0036613', '00-0040648', '00-0031492',
                                                               '00-0037085', '00-0041267', '00-0037740', '00-0033090')


def at(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))


GAMES = [{'id': SEA_DEN, 'espn': '401872995', 'a': 'SEA', 'h': 'DEN', 'w': 6, 'ko': at('2026-10-16T00:15Z')},
         {'id': NYJ_NE, 'espn': '401873001', 'a': 'NYJ', 'h': 'NE', 'w': 6, 'ko': at('2026-10-18T17:00Z')}]
NOW = at('2026-10-15T02:32Z')
# SEA at DEN had two pages on 15 October; the trimmed copy is padded back over the limit with team items
# (no athlete: counted and ignored), so it still needs a second page
FILLER = [{'type': {'id': '98', 'name': 'Team filler'}, 'current': {'target': {'value': 1.5}}} for _ in range(1100)]

st = {}


def reset(**kw):
    st.clear()
    st.update(sb=copy.deepcopy(SB0), items={'401872995': ITEMS0['401872995'] + FILLER, '401873001': list(ITEMS0['401873001'])},
              plan={}, date={'*': NOW}, hits={}, urls=[])
    st.update(kw)


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def date_time_string(self, timestamp=None):
        return email.utils.format_datetime(self._date.astimezone(datetime.timezone.utc), usegmt=True)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        p = u.path.split('/')
        if u.path.endswith('/scoreboard'):
            key = 'sb'
        elif u.path.endswith('/propBets'):
            key = f"pb:{p[p.index('events') + 1]}:{q.get('page')}"
        elif '/athletes/' in u.path:
            key = f'ath:{p[-1]}'
        else:
            key = '?'
        st['hits'][key] = st['hits'].get(key, 0) + 1
        st['urls'].append(self.path)
        seq = st['plan'].get(key) or st['plan'].get(key.rsplit(':', 1)[0]) or [200]
        act = seq.pop(0) if len(seq) > 1 else seq[0]
        self._date = st['date'].get(key) or st['date']['*']
        code, body = 200, b''
        if isinstance(act, int) and act != 200:
            code, body = act, b'{"error":{"message":"planned","code":%d}}' % act
        elif act == 'junk':
            body = b'this is not json {'
        elif act == 'noitems':
            body = b'{"count": 3, "data": []}'
        elif key == 'sb':
            body = json.dumps(st['sb']).encode()
        elif key.startswith('pb:'):
            ev = key.split(':')[1]
            its = st['items'].get(ev)
            if not its:
                code, body = 404, b'{"error":{"message":"No propBets found for eventId %s and provider 100","code":404}}' % ev.encode()
            else:
                lim = int(q.get('limit') or 25)
                size = 25 if (lim > 1000 or act == 'p25') else lim
                pages = math.ceil(len(its) / size)
                n = int(q.get('page') or 1)
                body = json.dumps({'count': len(its), 'pageIndex': n, 'pageSize': size, 'pageCount': pages,
                                   'items': its[(n - 1) * size:n * size]}).encode()
        elif key.startswith('ath:'):
            a = ATH.get(key[4:])
            code, body = (200, json.dumps(a).encode()) if a else (404, b'{"error":{"code":404}}')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json;charset=UTF-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
E.SITE = E.CORE = f'http://127.0.0.1:{srv.server_port}'
E.WAITS = (0, 0, 0)
checks = []


def chk(ok, what):
    checks.append((bool(ok), what))
    print(('  ok    ' if ok else '  FAIL  ') + what)


def case(label, fn):
    try:
        fn()
    except Exception as e:
        import traceback
        traceback.print_exc()
        chk(False, f'{label}: raised {type(e).__name__}: {e}')


def roster(blank=('4597703',), drop=('4362748',)):
    """the fixture roster with Tory Horton's espn_id taken off (placed by name) and Tyler Badie gone
    (nobody by his name: unmatched); Malik McClain has none in the real file"""
    out = []
    for r in ROSTER0:
        if r['espn_id'] in drop:
            continue
        r = dict(r)
        if r['espn_id'] in blank:
            r['espn_id'] = ''
        out.append(r)
    return out


def read(now=NOW, prev=None, rows=None, deadline=None):
    rows = rows if rows is not None else roster()
    logs = []
    pool = lambda: names.Pool(rows, [], [{'id': g['id'], 'w': 6, 'a': g['a'], 'h': g['h']} for g in GAMES])
    N._budget['left'] = N.BUDGET_S
    out, rep, probs = E.read_week(S, 6, GAMES, rows, copy.deepcopy(prev), clock=lambda: now, log=logs.append, pool_fn=pool, deadline=deadline)
    return out, rep, probs, logs


def pb_hits(ev):
    return sum(v for k, v in st['hits'].items() if k.startswith(f'pb:{ev}:'))


FIRST = {}


def a():
    reset()
    out, rep, probs, logs = read()
    FIRST['file'] = out
    g = out['games'].get(SEA_DEN, {})
    chk(st['hits'].get('pb:401872995:1') == 1 and st['hits'].get('pb:401872995:2') == 1 and 'pb:401872995:3' not in st['hits'],
        f"A: SEA at DEN read to its pageCount, two pages and no more: {sorted(k for k in st['hits'] if k.startswith('pb:4018729'))}")
    pbs = [u for u in st['urls'] if '/propBets' in u]
    chk(pbs and all('limit=1000' in u and '&_=' in u for u in pbs), 'A: every page asked at limit=1000 with a cache-buster')
    chk(g.get('lines', {}).get(DARNOLD) == {'attempts': 30.5, 'carries': 2.5, 'completions': 19.5, 'passing_interceptions': 0.5,
                                            'passing_tds': 1.5, 'passing_yards': 220.5, 'rushing_yards': 4.5},
        f"A: Sam Darnold's main lines, each twin pair one value (220.5 passing yards, 1.5 TDs): {g.get('lines', {}).get(DARNOLD)}")
    chk(g.get('counts', {}).get('main') == 7 + 2 + 2 + 2, f"A: main lines counted once a twin pair: {g.get('counts')}")
    chk(g.get('rungs', {}).get(WADDLE) == {'receiving_yards': [25, 40, 50, 60, 70, 80], 'receptions': [3, 4, 5, 6, 7, 8]},
        f"A: a milestone's target k is the rung k+ (Waddle's receiving yards 25+ .. 80+): {g.get('rungs', {}).get(WADDLE)}")
    chk(g.get('rungs', {}).get(MYERS, {}).get('kick_pts') == [4, 6, 8, 10, 13] and g.get('lines', {}).get(MYERS) == {'fg_made': 1.5, 'kick_pts': 6.5},
        "A: a kicker's points and field goals, main and rungs")
    chk(DARNOLD in g.get('td', []) and WADDLE in g.get('td', []) and HORTON in g.get('td', []), f"A: the anytime touchdown, offered with no target: {g.get('td')}")
    chk(g.get('lines', {}).get(HORTON) == {'receiving_yards': 3.5, 'receptions': 0.5} and st['hits'].get('ath:4597703') == 1,
        'A: Tory Horton, with no espn_id on the roster, looked up once and placed by his name')
    chk(out['games'].get(NYJ_NE, {}).get('td', []).count(MCCLAIN) == 1 and st['hits'].get('ath:4682509') == 1,
        'A: Malik McClain (a NYJ rookie whose roster row has no espn_id, the one miss of weeks 5 and 6) placed by name')
    um = g.get('unmatched', [])
    chk(len(um) == 1 and um[0]['espn_id'] == '4362748' and um[0]['name'] == 'Tyler Badie' and um[0]['kinds'] == ['any_td'] and BADIE not in g.get('td', []),
        f'A: an athlete nobody in the game is called (Tyler Badie, taken off the roster) is unmatched and placed on nobody: {um}')
    chk(any('1 unmatched: Tyler Badie' in r and '2 by name' in r for r in rep), f'A: the report names the unmatched and the placed by name: {rep[:1]}')
    chk(g.get('game') and {k: v for k, v in g['game'].items() if k not in ('at', 'ids')} == {'mla': -142, 'mlh': 120, 'sp': -2.5, 'spa': -112, 'sph': -108, 'tot': 40.5, 'tov': -112, 'tou': -108},
        f"A: DraftKings' game lines in the payload's terms (sp games.csv's spread_line: SEA by 2.5 away is -2.5; games.csv itself has -142/120, -2.5, -112/-108, 40.5): {g.get('game')}")
    chk(g.get('game', {}).get('ids') == {'team:DEN|ml': '0ML84695720_1', 'team:SEA|ml': '0ML84695720_3', 'team:DEN|ats|2.5': '0HC84695720P250_1',
                                         'team:SEA|ats|-2.5': '0HC84695720N250_3', 'game|total|over|40.5': '0OU84695720O4050_1', 'game|total|under|40.5': '0OU84695720U4050_3'}
        and g.get('dk_event') == '34118277', f"A: DraftKings' event and outcome ids keyed as the payload's dk: {g.get('game', {}).get('ids')} {g.get('dk_event')}")
    lus = [it.get('lastUpdated') for it in ITEMS0['401872995'] if it.get('lastUpdated')]
    chk(g.get('read_at') == '2026-10-15T02:32Z' and g.get('game', {}).get('at') == '2026-10-15T02:32Z' and max(lus) != '2026-10-15T02:32Z',
        f"A: read_at is the server's Date, not a lastUpdated label (latest {max(lus)}): {g.get('read_at')}")
    chk(g.get('kickoff') == '2026-10-16T00:15Z' and g.get('frozen') is False and g.get('event') == '401872995', 'A: the entry carries its event, ESPN\'s kickoff, and is not frozen')
    chk(out['run']['ok'] and out['run']['read'] == 2 and out['last_ok'] == '2026-10-15T02:32Z' and not probs, f"A: a clean run, last_ok its time, no problem: {out['run']} {probs}")
    # lastUpdated planted three hours ahead of the server (as ESPN labels it) moves nothing
    reset(date={'*': at('2026-10-15T02:40Z')})
    st['items']['401872995'] = [dict(it, lastUpdated='2026-10-15T05:28Z') if it.get('lastUpdated') else it for it in st['items']['401872995']]
    out2, *_ = read(now=at('2026-10-15T02:39Z'))
    chk(out2['games'][SEA_DEN]['read_at'] == '2026-10-15T02:40Z', f"A: with every label at 05:28Z the read is still dated by the server, 02:40Z: {out2['games'][SEA_DEN]['read_at']}")


case('A', a)


def b():
    reset()
    ev = st['sb']['events'][0]
    c = ev['competitions'][0]
    for x in c['competitors']:
        x['homeAway'] = 'away' if x['homeAway'] == 'home' else 'home'
    o = c['odds'][0]
    for k in ('moneyline', 'pointSpread'):
        o[k]['home'], o[k]['away'] = o[k]['away'], o[k]['home']
    games = [dict(GAMES[0], espn=''), GAMES[1]]
    N._budget['left'] = N.BUDGET_S
    out, rep, probs = E.read_week(S, 6, games, roster(), None, clock=lambda: NOW, log=lambda m: None,
                                  pool_fn=lambda: names.Pool(roster(), [], games))
    g = out['games'].get(SEA_DEN, {})
    chk(g.get('game') == FIRST['file']['games'][SEA_DEN]['game'] and g.get('lines') == FIRST['file']['games'][SEA_DEN]['lines'],
        'B: ESPN calling SEA home (as at a neutral site) and no espn column: matched by its clubs, and the game lines by club come out the same')


case('B', b)


def c_():
    reset(plan={'sb': [500, 502, 200]})
    out, rep, probs, logs = read()
    chk(st['hits']['sb'] == 3 and out['run']['ok'] and out['run']['read'] == 2, f"C: two 5xx then the scoreboard, through netfetch: {st['hits']['sb']} tries, run {out['run']}")
    reset(plan={'pb:401873001:1': [503, 200]})
    out, *_ = read()
    chk(st['hits']['pb:401873001:1'] == 2 and out['games'][NYJ_NE]['read_at'], 'C: a 503 on the player lines, then the answer')


case('C', c_)


def d():
    prev = FIRST['file']
    reset()
    st['items']['401872995'] = [dict(it, current={'target': {'value': 999.5}}) if it.get('athlete') else it for it in st['items']['401872995']]
    out, rep, probs, logs = read(now=at('2026-10-16T00:20Z'), prev=prev)
    chk(pb_hits('401872995') == 0 and out['games'][SEA_DEN]['frozen'] is True
        and {k: v for k, v in out['games'][SEA_DEN].items() if k != 'frozen'} == {k: v for k, v in prev['games'][SEA_DEN].items() if k != 'frozen'},
        'D: a game kicked off before the read is not read, and its entry is frozen as it was')
    out2, *_ = read(now=at('2026-10-16T09:00Z'), prev=out)
    chk(out2['games'][SEA_DEN] == out['games'][SEA_DEN], 'D: a frozen entry is never rewritten')
    # kicked off while its pages were read: the last page answers after kickoff
    reset(date={'*': at('2026-10-16T00:10Z'), 'pb:401872995:2': at('2026-10-16T00:16Z')})
    out3, rep3, probs3, _ = read(now=at('2026-10-16T00:10Z'), prev=prev)
    chk(out3['games'][SEA_DEN]['read_at'] == prev['games'][SEA_DEN]['read_at'] and out3['games'][SEA_DEN]['lines'] == prev['games'][SEA_DEN]['lines']
        and any('kicked off while it was being read' in r for r in rep3) and not probs3,
        f'D: a read whose last page answered after kickoff is thrown away, the last read before kickoff stands: {rep3}')
    out4, *_ = read(now=at('2026-10-16T00:30Z'), prev=out3)
    chk(out4['games'][SEA_DEN]['frozen'] and out4['games'][SEA_DEN]['read_at'] == prev['games'][SEA_DEN]['read_at'], 'D: and the next run freezes it')


case('D', d)


def e():
    prev = FIRST['file']
    for act, label in (('junk', 'a body that is not JSON'), ('noitems', 'an answer with no items or pageCount'), ('p25', 'pages of 25 (the limit ignored)')):
        reset(plan={'pb:401873001': [act]})
        out, rep, probs, _ = read(prev=prev)
        chk(out['games'][NYJ_NE] == prev['games'][NYJ_NE] and not out['run']['ok'] and out['last_ok'] == prev['last_ok']
            and len(probs) == 1 and NYJ_NE in probs[0] and 'looks changed' in probs[0] and out['games'][SEA_DEN]['read_at'],
            f'E: {label}: the last entry kept, a problem, the other game still read: {probs}')
    reset()
    st['items']['401872995'] = ITEMS0['401872995'] + FILLER
    st['plan'] = {'pb:401872995': ['p25']}
    out, rep, probs, _ = read(prev=prev)
    chk(st['hits'].get('pb:401872995:1') == 1 and 'pb:401872995:2' not in st['hits'] and probs and 'limit rule' in probs[0],
        'E: pages of 25 are seen on the first page, and the other 49 are never asked for')
    reset(sb={'nothing': 1})
    out, rep, probs, _ = read(prev=prev)
    chk(out['games'] == prev['games'] and probs and 'scoreboard' in probs[0], f'E: a scoreboard with no events: every entry kept, a problem: {probs}')


case('E', e)


def f():
    reset()
    st['items']['401873001'] = []
    out, rep, probs, _ = read()
    g = out['games'][NYJ_NE]
    chk(g['read_at'] is None and g['lines'] == {} and g['game'] and out['run']['ok'] and out['run']['not_posted'] == 1 and not probs,
        f"F: a 404 (DraftKings has posted no player lines yet) is a read with none, its game lines kept, not a failure: {out['run']}")
    out2, *_ = read(prev=FIRST['file'])
    chk(out2['games'][NYJ_NE]['lines'] == FIRST['file']['games'][NYJ_NE]['lines'] and out2['games'][NYJ_NE]['read_at'] == FIRST['file']['games'][NYJ_NE]['read_at'],
        'F: a 404 after a read keeps that read')


case('F', f)


def g_():
    prev = FIRST['file']
    reset(plan={'pb:401873001': [500]})
    out, rep, probs, _ = read(prev=prev)
    chk(out['games'][NYJ_NE] == prev['games'][NYJ_NE] and not probs and not out['run']['ok'] and out['last_ok'] == prev['last_ok']
        and any(NYJ_NE in r and 'its last read stands' in r for r in rep),
        f'G: ESPN failing after netfetch\'s tries on one game: logged, its last read stands, no problem, last_ok unmoved: {probs}')
    reset(plan={'sb': [500]})
    out, rep, probs, _ = read(prev=prev)
    chk(out['games'] == prev['games'] and not probs and not out['run']['ok'] and st['hits']['sb'] == len(E.WAITS) + 1,
        'G: the scoreboard failing: every entry kept, logged only')
    keep = E.FAIL_STOP
    E.FAIL_STOP = 1
    try:
        reset(plan={'pb:401872995': [500]})
        out, rep, probs, _ = read(prev=prev)
        chk(pb_hits('401873001') == 0 and out['games'][NYJ_NE] == prev['games'][NYJ_NE], 'G: games in a row that do not answer end the read (FAIL_STOP)')
    finally:
        E.FAIL_STOP = keep
    reset()
    out, rep, probs, _ = read(prev=prev, deadline=-1)
    chk(st['hits'] == {} and out['games'] == prev['games'] and not out['run']['ok'], 'G: past its deadline the read asks for nothing more')


case('G', g_)


def h():
    reset()
    MAIN = set(E.MAIN)
    st['items']['401872995'] = [it for it in ITEMS0['401872995'] if (it.get('type') or {}).get('id') not in MAIN]
    out, rep, probs, _ = read(prev=FIRST['file'])
    chk(out['games'] == FIRST['file']['games'] and probs and 'no main line on any of the 1 game' in probs[0],
        f'H: no main line on SEA at DEN, the one game within 36h of kickoff: the read is treated as failed, a problem: {probs}')
    reset()
    st['items']['401873001'] = [it for it in ITEMS0['401873001'] if (it.get('type') or {}).get('id') not in MAIN]
    out, rep, probs, _ = read(prev=None)
    chk(not probs and out['games'][NYJ_NE]['read_at'], 'H: no main line on a game 62h away is DraftKings not posting yet, not a problem')


case('H', h)


def i():
    keep = E.MAP_MIN
    E.MAP_MIN = 3
    try:
        reset()
        rows = [dict(r, espn_id='') for r in roster()]
        out, rep, probs, _ = read(prev=FIRST['file'], rows=rows)
        chk(out['games'] == FIRST['file']['games'] and probs and 'espn_id' in probs[0] and not any(k.startswith('ath:') for k in st['hits']),
            f"I: under 80% of a game's athletes placed by id: the read is treated as failed, a problem, and nobody looked up: {probs}")
    finally:
        E.MAP_MIN = keep


case('I', i)


def j():
    reset()
    base = next(it for it in ITEMS0['401872995'] if (it.get('type') or {}).get('id') == '8' and '3912547' in it['athlete']['$ref'])
    st['items']['401872995'] = ITEMS0['401872995'] + [dict(base, current={'target': {'value': 230.5}}, lastUpdated='2026-10-14T23:00Z'),
                                                      dict(base, current={'target': {'value': 210.5}}, lastUpdated='2026-10-01T00:00Z')] + FILLER
    out, rep, probs, logs = read()
    chk(out['games'][SEA_DEN]['lines'][DARNOLD]['passing_yards'] == 230.5 and any('two passing_yards lines' in l for l in logs),
        'J: two values for one player and stat: the latest lastUpdated is kept (an order among the items) and logged')


case('J', j)


def k():
    tmp = tempfile.mkdtemp(prefix='test_espn_')
    try:
        path = os.path.join(tmp, 'espn_wk6.json')
        E.write_file(path, FIRST['file'])
        before = open(path, 'rb').read()
        chk(json.loads(before) == FIRST['file'] and before.startswith(b'{\n "how"'), 'K: the file is written with indent 1')
        real = E.os.replace
        E.os.replace = lambda *a: (_ for _ in ()).throw(OSError('disk full'))
        try:
            E.write_file(path, dict(FIRST['file'], week=99))
            raised = False
        except OSError:
            raised = True
        finally:
            E.os.replace = real
        chk(raised and open(path, 'rb').read() == before and os.listdir(tmp) == ['espn_wk6.json'], 'K: a write that fails leaves the old file whole and no part file')
        try:
            E.write_file(path, {'bad': {1, 2}})
        except TypeError:
            pass
        chk(open(path, 'rb').read() == before and os.listdir(tmp) == ['espn_wk6.json'], 'K: a file that cannot be written as JSON leaves the old one whole')
        # the command line end to end: games.csv and the roster from raw/, the file into data/
        raw, data = os.path.join(tmp, 'raw'), os.path.join(tmp, 'data')
        os.makedirs(raw)
        os.makedirs(data)
        with open(os.path.join(raw, weekly.GAMES), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['game_id', 'season', 'game_type', 'week', 'gameday', 'gametime', 'away_team', 'home_team', 'espn'])
            w.writerow([SEA_DEN, S, 'REG', 6, '2026-10-15', '20:15', 'SEA', 'DEN', '401872995'])
            w.writerow([NYJ_NE, S, 'REG', 6, '2026-10-18', '13:00', 'NYJ', 'NE', '401873001'])
            w.writerow([f'{S}_05_BUF_LA', S, 'REG', 5, '2026-10-12', '20:15', 'BUF', 'LA', ''])
        mnf = {'event': '1', 'kickoff': '2026-10-13T00:15Z', 'read_at': '2026-10-12T20:00Z', 'frozen': False, 'lines': {'x': {'receptions': 4.5}}}
        E.write_file(os.path.join(data, 'espn_wk5.json'), {'how': E.HOW, 'season': S, 'week': 5, 'games': {f'{S}_05_BUF_LA': mnf}})
        with open(os.path.join(raw, weekly.ROSTER), 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(ROSTER0[0]))
            w.writeheader()
            w.writerows(roster())
        keep = E.RAW, E.DATA
        E.RAW, E.DATA = raw, data
        reset()
        so = io.StringIO()
        try:
            N._budget['left'] = N.BUDGET_S
            with contextlib.redirect_stdout(so):
                rc = E.main(['--week', '6', '--now', '2026-10-15T02:32Z'])
        finally:
            E.RAW, E.DATA = keep
        got = E.load_file(os.path.join(data, 'espn_wk6.json'))
        lines = so.getvalue().splitlines()
        chk(rc == 0 and got and got['games'][SEA_DEN]['lines'] == FIRST['file']['games'][SEA_DEN]['lines']
            and any(l.startswith("ESPN: week 6: DraftKings' lines read for 2 of 2") for l in lines),
            f"K: espn_lines.py --week 6 reads the week from raw/ and writes data/espn_wk6.json, its report lines marked ESPN: ({lines[:1]})")
        w5 = E.load_file(os.path.join(data, 'espn_wk5.json'))['games'][f'{S}_05_BUF_LA']
        chk(w5 == dict(mnf, frozen=True), f"K: last week's Monday night, read before the week moved on, is frozen as it was, with no request: {w5}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


case('K', k)

SCHED = [{'id': SEA_DEN, 'w': 6, 'd': '2026-10-15', 't': '20:15', 'a': 'SEA', 'h': 'DEN', 'sp': -3.5, 'tot': 41.5, 'tov': -110.0, 'tou': -110.0, 'mla': -150.0, 'mlh': 130.0},
         {'id': NYJ_NE, 'w': 6, 'd': '2026-10-18', 't': '13:00', 'a': 'NYJ', 'h': 'NE', 'sp': 3.0, 'tot': 44.5, 'mla': 140.0, 'mlh': -160.0}]
GL_COLS = ['game_id', 'away_moneyline', 'home_moneyline', 'spread_line', 'away_spread_odds', 'home_spread_odds', 'total_line', 'over_odds', 'under_odds', 'pulled_at']


def bake(files, now, prev_pay=None):
    """weekly.bake on a scratch data/ holding files {name: text or object}"""
    tmp = tempfile.mkdtemp(prefix='test_espn_bake_')
    try:
        data = os.path.join(tmp, 'data')
        os.makedirs(data)
        for fn, v in files.items():
            with open(os.path.join(data, fn), 'w', encoding='utf-8', newline='') as fh:
                fh.write(v if isinstance(v, str) else json.dumps(v))
        pp = os.path.join(tmp, 'payload.json')
        json.dump(dict(prev_pay or {}, season=S, sched=copy.deepcopy(SCHED), mkt={}, players=[], depth={}), open(pp, 'w', encoding='utf-8'))
        raw = {'srows': [], 'stats': {}, 'skipped_live': set(), 'irows': [], 'rrows': roster(), 'snap_rows': None}
        keep = weekly.DATA
        weekly.DATA = data
        weekly.problems.clear()
        weekly.report.clear()
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                weekly.bake(pp, {'season': S}, [], 6, False, now, raw)
        finally:
            weekly.DATA = keep
        return json.load(open(pp, encoding='utf-8')), list(weekly.problems), list(weekly.report)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def gl(rows):
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=GL_COLS)
    w.writeheader()
    for r in rows:
        w.writerow(r)
    return out.getvalue()


def l_():
    f = copy.deepcopy(FIRST['file'])                      # read 2026-10-15T02:32Z
    paid = {'game_id': SEA_DEN, 'away_moneyline': -135, 'home_moneyline': 115, 'spread_line': -3.0, 'away_spread_odds': -110, 'home_spread_odds': -110,
            'total_line': 41.5, 'over_odds': -105, 'under_odds': -115, 'pulled_at': '2026-10-14T08:17Z'}
    links = {f'{SEA_DEN}|game|ml|home|': {'sid': 'PAID-DEN-ML'}, f'{SEA_DEN}|event': {'sid': '34118277'}}
    now = at('2026-10-15T12:00Z')
    pay, probs, rep = bake({'espn_wk6.json': f, 'gamelines_wk6.csv': gl([paid]), 'dk_links_wk6.json': links,
                            'priced_at.json': {}}, now, prev_pay={'espn': {'5': {'x': 1}}})
    g = {x['id']: x for x in pay['sched']}[SEA_DEN]
    chk((g['mla'], g['mlh'], g['sp'], g['spa'], g['sph'], g['tot'], g['tov'], g['tou'], g['ls'], g['lat']) == (-142, 120, -2.5, -112, -108, 40.5, -112, -108, 'dk', '2026-10-15T02:32Z'),
        f"L: ESPN's read, fresher than the pull's, wins every number and dates the line: {[g.get(k) for k in ('mla', 'mlh', 'sp', 'tot', 'tov', 'ls', 'lat')]}")
    chk(any("the latest read ESPN's on 2" in r for r in rep), f"L: the report says the line came from ESPN's read: {[r for r in rep if 'game lines' in r]}")
    paid2 = dict(paid, pulled_at='2026-10-15T05:17Z')
    pay2, *_ = bake({'espn_wk6.json': f, 'gamelines_wk6.csv': gl([paid2])}, now)
    g2 = {x['id']: x for x in pay2['sched']}[SEA_DEN]
    chk((g2['sp'], g2['tot'], g2['tov'], g2['lat']) == (-3.0, 41.5, -105, '2026-10-15T05:17Z'), f"L: a pull fresher than the read wins: {[g2.get(k) for k in ('sp', 'tot', 'tov', 'lat')]}")
    pay3, *_ = bake({'espn_wk6.json': f, 'gamelines_wk6.csv': gl([paid])}, at('2026-10-16T03:00Z'))
    g3 = {x['id']: x for x in pay3['sched']}[SEA_DEN]
    chk(g3['sp'] == -2.5 and g3['ls'] == 'dk', 'L: a played game keeps the last read before its kickoff (under a day before it), so its grading does not move')
    pay4, *_ = bake({'espn_wk6.json': f}, at('2026-10-17T04:00Z'))
    g4 = {x['id']: x for x in pay4['sched']}[NYJ_NE]
    chk(g4['sp'] == 3.0 and g4['ls'] == 'nflverse', f"L: a read more than a day old gives way to nflverse's line: {g4.get('sp')} {g4.get('ls')}")
    # a read with a total and no prices on nflverse's own number takes nflverse's prices, never an older pull's
    f5 = copy.deepcopy(f)
    b5 = f5['games'][SEA_DEN]['game']
    b5['tot'] = 41.5
    b5.pop('tov')
    b5.pop('tou')
    pay5, *_ = bake({'espn_wk6.json': f5, 'gamelines_wk6.csv': gl([dict(paid, total_line=42.5, pulled_at='2026-10-15T01:00Z')])}, now)
    g5 = {x['id']: x for x in pay5['sched']}[SEA_DEN]
    chk((g5['tot'], g5['tov'], g5['tou']) == (41.5, -110.0, -110.0), f"L: a read's total with no prices, on nflverse's number, takes nflverse's prices: {[g5.get(k) for k in ('tot', 'tov', 'tou')]}")
    es = pay['espn'].get('6', {})
    chk(sorted(es) == [NYJ_NE, SEA_DEN] and set(es[SEA_DEN]) == {'at', 'frozen', 'lines', 'rungs', 'td'} and es[SEA_DEN]['lines'] == f['games'][SEA_DEN]['lines']
        and es[SEA_DEN]['at'] == '2026-10-15T02:32Z' and es[SEA_DEN]['frozen'] is False and '5' not in pay['espn'],
        f"L: PAY.espn is the current week's games {{at, frozen, lines, rungs, td}}, and an older payload's is never carried: {sorted(pay['espn'])}")
    chk(pay['espn_meta'] == {'at': '2026-10-15T02:32Z', 'ok': True, 'games_read': 2, 'games_carried': 0, 'note': 'read 2 game(s)'}, f"L: espn_meta: {pay['espn_meta']}")
    dk = pay['dk']['6']
    chk(dk[SEA_DEN]['team:DEN|ml'] == 'PAID-DEN-ML' and dk[SEA_DEN]['event'] == '34118277' and dk[SEA_DEN]['team:SEA|ml'] == '0ML84695720_3',
        f"L: ESPN's ids fill in beside the pull's, never over one it has: {dk[SEA_DEN]}")
    chk(dk[NYJ_NE].get('event') == f['games'][NYJ_NE]['dk_event'] and dk[NYJ_NE].get('glat') == '2026-10-15T02:32Z' and 'at' not in dk[NYJ_NE],
        f"L: a game the pull never bought gets ESPN's event id and game-line ids, dated by the read, and no player read time: {dk[NYJ_NE]}")
    pay6, probs6, _ = bake({}, now, prev_pay={'espn': {'6': {SEA_DEN: {}}}, 'espn_meta': {'ok': True}})
    chk(pay6['espn'] == {} and pay6['espn_meta']['ok'] is False and pay6['espn_meta']['at'] is None and not probs6,
        f"L: with no file the payload says nothing was read, and an older payload's lines are never carried: {pay6['espn_meta']} {probs6}")
    f7 = copy.deepcopy(f)
    f7['games'][SEA_DEN]['frozen'] = True
    pay7, *_ = bake({'espn_wk6.json': f7}, at('2026-10-16T03:00Z'))
    chk(pay7['espn']['6'][SEA_DEN]['frozen'] is True and SEA_DEN not in pay7['dk'].get('6', {}), 'L: a played game stays in PAY.espn, frozen, and gets no ids')
    pay8, *_ = bake({'espn_wk6.json': f}, at('2026-10-16T03:00Z'))
    chk(pay8['espn']['6'][SEA_DEN]['frozen'] is True and pay8['espn']['6'][NYJ_NE]['frozen'] is False,
        'L: a game whose kickoff has passed is frozen in the payload even when no read has run since')


case('L', l_)


def m():
    f = copy.deepcopy(FIRST['file'])                      # its last good read 2026-10-15T02:32Z
    sp = E.stale_problem({6: f}, 6, SCHED, at('2026-10-17T00:00Z'), weekly.kickoff)
    chk(sp and 'since 2026-10-15T02:32Z (45h)' in sp and '1 game(s)' in sp, f'M: no good read for 45 hours with NYJ at NE 41 hours away: a problem: {sp}')
    chk(E.stale_problem({6: f}, 6, SCHED, at('2026-10-15T20:00Z'), weekly.kickoff) is None, 'M: a read 17 hours old is not')
    chk(E.stale_problem({6: f}, 6, SCHED, at('2026-10-16T03:00Z'), weekly.kickoff) is None,
        'M: nor is one 24 hours old with no game within 48h to come (SEA at DEN played, NYJ at NE 62 hours away)')


case('M', m)


def n():
    tmp = tempfile.mkdtemp(prefix='test_espn_arch_')
    keep = weekly.DATA
    try:
        weekly.DATA = tmp
        json.dump({'season': S - 1, 'week': 1, 'games': {f'{S - 1}_01_DAL_PHI': {}}}, open(os.path.join(tmp, 'espn_wk1.json'), 'w'))
        json.dump({'season': S - 1, 'week': 2, 'games': {}}, open(os.path.join(tmp, 'espn_wk2.json'), 'w'))
        json.dump({'season': S, 'week': 3, 'games': {f'{S}_03_DAL_PHI': {}}}, open(os.path.join(tmp, 'espn_wk3.json'), 'w'))
        with contextlib.redirect_stdout(io.StringIO()):
            moved = weekly.archive_other_seasons()
        arch = os.path.join(tmp, 'archive', str(S - 1))
        chk(sorted(os.listdir(arch)) == ['espn_wk1.json', 'espn_wk2.json'] and os.path.exists(os.path.join(tmp, 'espn_wk3.json')) and len(moved) == 2,
            f"N: at a rollover last season's ESPN files (one with no game too) go to data/archive/<season>/, this season's stay: {moved}")
        chk(E.load_all(tmp, S) == {3: json.load(open(os.path.join(tmp, 'espn_wk3.json')))}, 'N: the bake reads only this season\'s files')
    finally:
        weekly.DATA = keep
        shutil.rmtree(tmp, ignore_errors=True)


case('N', n)


def o():
    class A:
        offline = False
    calls = []
    real = weekly.run
    try:
        weekly.run = lambda args, cwd, label, soft=False, env=None, timeout=None: (calls.append((args, soft, timeout)) or
                     (0, "ESPN: week 6: DraftKings' lines read for 2 of 2\n  netfetch noise\nESPN PROBLEM: ESPN's feed looks changed: x\n"))
        weekly.problems.clear()
        weekly.report.clear()
        with contextlib.redirect_stdout(io.StringIO()):
            weekly.espn_step(A, 6, False)
        chk(calls and calls[0][0][1:] == ['espn_lines.py', '--week', '6'] and calls[0][1] is True and calls[0][2] == weekly.ESPN_TIMEOUT,
            f'O: weekly.py runs espn_lines.py for the week, soft, with a stop: {calls}')
        chk(weekly.report == ["  ESPN: week 6: DraftKings' lines read for 2 of 2"] and weekly.problems == ["ESPN: ESPN's feed looks changed: x"]
            and not weekly.blocked(), f'O: its ESPN: lines go in the report and its problems in the problems, never a refusal: {weekly.problems}')
        # no good read for a day, with a game of the week within two days: a problem, from the file and games.csv's rows
        tmp = tempfile.mkdtemp(prefix='test_espn_stale_')
        keep = weekly.DATA
        try:
            weekly.DATA = tmp
            E.write_file(os.path.join(tmp, 'espn_wk6.json'), FIRST['file'])
            gs = [{'week': '6', 'gameday': '2026-10-18', 'gametime': '13:00'}]
            for now, want in ((at('2026-10-17T00:00Z'), True), (at('2026-10-15T20:00Z'), False)):
                weekly.problems.clear()
                with contextlib.redirect_stdout(io.StringIO()):
                    weekly.espn_step(A, 6, False, gs, now)
                chk(any('no good read' in p for p in weekly.problems) == want and not weekly.blocked(),
                    f"O: the step's stale rule at {E.stamp(now)} (last good read 2026-10-15T02:32Z, a game 2026-10-18 17:00Z): {'a problem' if want else 'none'} {weekly.problems[1:]}")
        finally:
            weekly.DATA = keep
            shutil.rmtree(tmp, ignore_errors=True)
        weekly.run = lambda *a, **kw: (1, 'Traceback ...\nKeyError: x')
        weekly.problems.clear()
        with contextlib.redirect_stdout(io.StringIO()):
            weekly.espn_step(A, 6, False)
        chk(len(weekly.problems) == 1 and 'stopped with an error' in weekly.problems[0] and not weekly.blocked(), 'O: an error in the read is a problem, not a refusal')
        calls.clear()
        weekly.run = lambda *a, **kw: calls.append(a) or (0, '')
        A.offline = True
        with contextlib.redirect_stdout(io.StringIO()):
            weekly.espn_step(A, 6, False)
            A.offline = False
            weekly.espn_step(A, 18, True)
        chk(not calls, 'O: --offline reads nothing (the file on disk is baked), nor does a season that is over')
    finally:
        weekly.run = real
        weekly.problems.clear()
        weekly.report.clear()
    rc, out = weekly.run([sys.executable, '-c', 'import time; print("ESPN: started", flush=True); time.sleep(5)'], HERE, 'slow', soft=True, timeout=1)
    chk(rc == -9 and 'stopped after 1s' in out and not weekly.problems, f"O: a read that hangs is stopped by the backstop, and soft it refuses nothing: {rc} {' '.join(out.split())[-60:]}")


case('O', o)

fails = [w for ok, w in checks if not ok]
print(f'{len(checks)} checks, {len(fails)} failures')
srv.shutdown()
sys.exit(1 if fails else 0)
