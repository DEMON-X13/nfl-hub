"""espn_archive.py held to its cases, on fixtures of its own (no network: the fetch is stubbed, and so is
lib/netfetch.py's download where the default fetch is tried; props/data is untouched):

    python3 test_espn_archive.py        # from props/build or the repo's root; must end "N checks, 0 failures"

The parse on a trimmed real answer (fixtures/espn_archive/propbets_401872926.json, 2026 week 1's ARI at LAC: twins,
one athlete and market at two numbers, the touchdown list, markets left out) and on made-up items for every market of
the map (by name, by id, a name and id that disagree); the pages to pageCount and every rule a page breaks; which games
a run reads (the earliest week with a game to come, the played games of the last 8 days not yet final, never a game in
play, a final one or another season's; with --backfill every played game); a game to come rewritten with a new close,
a line it no longer has kept as gone, an espn: key moved onto the gsis id the roster gives it since; a played game read
once more and frozen, and a frozen game never read or written again whatever ESPN says; a 404, a failure and a read
with nothing kept leaving a game exactly as it was, and no write at all where nothing changed; the roster's mapping
(an id it gives two players mapped to neither); a played game not frozen a day on a problem; a file that will not read
or is of another season left as it is; --offline and weekly.py's step reading nothing; an exception in the step a
problem, never a refusal; the file's shape (valid JSON, a game's head a line, a player's lines a line); and the default
fetch through lib/netfetch.py (a 404, a 403 tried again with the other headers, a 500 a failure)."""
import contextlib, datetime, io, json, os, re, sys, tempfile, types

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import espn_archive as A  # noqa: E402

UTC = datetime.timezone.utc
n = bad = 0


def check(ok, what):
    global n, bad
    n += 1
    if not ok:
        bad += 1
        print('FAIL: ' + what)


FIX = json.load(open(os.path.join(HERE, 'fixtures', 'espn_archive', 'propbets_401872926.json'), encoding='utf-8'))
NAME_OF = {st: (name, i) for name, (i, st) in A.MARKETS.items()}


def item(stat, aid, op, cur, lu='2026-10-25T16:00Z', name=True):
    """a made-up propBets item of the archive's market for stat ('any_td': the touchdown list)"""
    nm, tid = A.ANY_TD if stat == 'any_td' else NAME_OF[stat]
    t = {'id': tid, 'name': nm} if name else {'id': tid}
    it = {'athlete': {'$ref': f'http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/athletes/{aid}?lang=en&region=us'},
          'type': t, 'lastUpdated': lu, 'open': {}, 'current': {}}
    if op is not None:
        it['open'] = {'target': {'value': op, 'displayValue': str(op)}}
    if cur is not None:
        it['current'] = {'target': {'value': cur, 'displayValue': str(cur)}}
    return it


def page(items, pages=1, size=1000):
    return {'count': len(items), 'pageIndex': 1, 'pageSize': size, 'pageCount': pages, 'items': items}


class Feed:
    """ESPN's propBets, stubbed: answers[ESPN event id] is a page, a list of pages, 404, or an exception to raise"""

    def __init__(self, answers):
        self.answers, self.urls = answers, []

    def __call__(self, url):
        self.urls.append(url)
        m = re.fullmatch(r'https://sports\.core\.api\.espn\.com/v2/sports/football/leagues/nfl/events/(\d+)/competitions/(\d+)'
                         r'/odds/100/propBets\?(.*)', url)
        assert m and m.group(1) == m.group(2), url
        q = dict(x.split('=', 1) for x in m.group(3).split('&'))
        a = self.answers.get(m.group(1), 404)
        if isinstance(a, Exception):
            raise a
        if a == 404:
            return 404, None
        pages = a if isinstance(a, list) else [a]
        return 200, json.loads(json.dumps(pages[int(q['page']) - 1]))

    def events(self):
        return sorted({re.search(r'/events/(\d+)/', u).group(1) for u in self.urls})


def never(url):
    raise AssertionError('fetched ' + url)


# ---- the parse, on the trimmed real answer -------------------------------------------------------------------
idmap = {'2578570': '00-0033119', '4361307': '00-0037744', '4686612': '00-0040727', '3045523': '00-0033307'}
P = A.parse(FIX['items'], idmap)
check(P['lines'].get('00-0033119') == {'passing_yards': [226.5, 219.5, '2026-09-13T23:24Z'], 'passing_tds': [1.5, 1.5, '2026-09-13T01:42Z']},
      f"the quarterback's twins kept once, open and close: {P['lines'].get('00-0033119')}")
check(P['lines'].get('00-0037744') == {'receiving_yards': [60.5, 56.5, '2026-09-13T22:22Z'], 'receptions': [6.5, 6.5, '2026-09-13T20:48Z']},
      f"the tight end's lines: {P['lines'].get('00-0037744')}")
check(P['conflict'] == {('00-0040727', 'receiving_yards'): [[26.5, 26.5, '2026-09-13T23:07Z'], [26.5, 27.5, '2026-09-13T23:07Z']]},
      f'one athlete and market at two numbers kept as a conflict, both numbers: {P["conflict"]}')
check('00-0040727' not in P['lines'], 'a conflicted line is also kept as a line')
check(P['td'] == {'00-0033119', '00-0037744', 'espn:4429025'}, f"the anytime touchdown list, the unmapped one by ESPN id: {P['td']}")
check(P['unmapped'] == {'4429025'}, f"the athletes the roster does not map: {P['unmapped']}")
check('00-0033307' not in P['lines'], 'a market left out (longest reception, first-half yards, milestones) was kept')
check(P['counts']['items'] == 19 and P['counts']['kept'] == 13 and P['counts']['lines'] == 4 and P['counts']['conflict'] == 1,
      f"the counts: {P['counts']}")

# every market of the map, by name with its id, by id alone; a disagreement, an unknown name and a bad close left out
its = [item(st, str(500 + i), 10.5 + i, 11.5 + i) for i, st in enumerate(sorted(NAME_OF))]
P = A.parse(its, {})
check(sorted(st for m in P['lines'].values() for st in m) == sorted(NAME_OF) and len(NAME_OF) == 12,
      f"the twelve main markets by name: {sorted(st for m in P['lines'].values() for st in m)}")
check(set(NAME_OF) == {'passing_yards', 'completions', 'passing_tds', 'carries', 'rushing_yards', 'receiving_yards', 'receptions',
                       'passing_interceptions', 'attempts', 'scrim_yards', 'kick_pts', 'fg_made'}, f'the stat names are the page\'s: {sorted(NAME_OF)}')
part3 = open(os.path.join(HERE, 'part3.js'), encoding='utf-8').read()
m = re.search(r'const ESPN_MAIN=\{([^}]*)\};', part3)
page_main = dict(re.findall(r"(\d+):'([a-z_]+)'", m.group(1))) if m else {}
check(page_main == {i: st for i, st in A.MARKETS.values()}, f"the map is not the page's ESPN_MAIN, id for id: {page_main}")
check(re.search(r"const ESPN_ANY_TD='(\d+)'", part3).group(1) == A.ANY_TD[1], "the touchdown list's id is not the page's ESPN_ANY_TD")
P = A.parse([item('rushing_yards', '600', 40.5, 41.5, name=False)], {})
check(P['lines'] == {'espn:600': {'rushing_yards': [40.5, 41.5, '2026-10-25T16:00Z']}}, f'an item with no name, by its id: {P["lines"]}')
x = item('rushing_yards', '601', 40.5, 41.5)
x['type']['id'] = '13'
y = item('receptions', '602', 3.5, 3.5)
y['type']['name'] = 'Receptions Milestones'
z = item('receptions', '603', 3.5, 0)
w = item('receptions', '604', '4.5', '5.5')
v = item('carries', '605', None, 12.5)
P = A.parse([x, y, z, w, v, {'type': {'id': '8'}}, 'junk', item('receptions', 'x', 1.5, 1.5)], {})
check(P['lines'] == {'espn:604': {'receptions': [4.5, 5.5, '2026-10-25T16:00Z']}, 'espn:605': {'carries': [None, 12.5, '2026-10-25T16:00Z']}},
      f'a name and id that disagree, an unknown name, a close of 0 and junk left out; a number as text read; no open kept as null: {P["lines"]}')
# twins at two lastUpdated: kept once, at the later
P = A.parse([item('receptions', '700', 4.5, 5.5, '2026-10-25T10:00Z'), item('receptions', '700', 4.5, 5.5, '2026-10-25T12:00Z')], {})
check(P['lines'] == {'espn:700': {'receptions': [4.5, 5.5, '2026-10-25T12:00Z']}} and not P['conflict'], f'twins at two times: {P}')

# ---- the roster's mapping and the kickoff ----------------------------------------------------------------------
rm = A.roster_map([{'espn_id': '100', 'gsis_id': '00-1'}, {'espn_id': '101.0', 'gsis_id': '00-2'}, {'espn_id': '102', 'gsis_id': '00-3'},
                   {'espn_id': '102', 'gsis_id': '00-4'}, {'espn_id': '', 'gsis_id': '00-5'}, {'espn_id': '103', 'gsis_id': ''},
                   {'espn_id': '100', 'gsis_id': '00-1'}])
check(rm == {'100': '00-1', '101': '00-2'}, f'the roster map (a float id read, an id two players share mapped to neither): {rm}')
check(A.kickoff('2026-10-29', '20:15') == datetime.datetime(2026, 10, 30, 0, 15, tzinfo=UTC), 'a daylight-time kickoff')
check(A.kickoff('2026-11-01', '13:00') == datetime.datetime(2026, 11, 1, 18, 0, tzinfo=UTC), 'the Sunday the clocks go back')
check(A.kickoff('2027-01-10', '16:30') == datetime.datetime(2027, 1, 10, 21, 30, tzinfo=UTC), 'a playoff kickoff in standard time')

# ---- the pages -------------------------------------------------------------------------------------------------
filler = [{'type': {'id': '19', 'name': 'Longest Reception (incl. overtime)'}, 'athlete': {'$ref': '/athletes/1'}}] * 999
two = [page(filler + [item('passing_yards', '100', 220.5, 221.5)], pages=2), page([item('receptions', '101', 4.5, 4.5)], pages=2)]
f = Feed({'9001': two})
r = A.read_game('9001', f, 1)
check(r['st'] == 'ok' and len(r['items']) == 1001, f"two pages read to the pageCount: {r['st']}, {len(r.get('items') or [])}")
check(len(f.urls) == 2 and all('limit=1000' in u for u in f.urls) and ['page=1' in f.urls[0], 'page=2' in f.urls[1]] == [True, True]
      and all('&_=1' in u for u in f.urls), f'the addresses: {f.urls}')
for ans, why in (([two[0], RuntimeError('reset')], 'page 2 failing'), ([page(filler[:5], pages=2), two[1]], 'a short page 1 of 2'),
                 (page([], size=25), 'pages of 25'), (page([], pages=6), 'six pages'), ({'items': 'x'}, 'no items')):
    class Mixed(Feed):
        def __call__(self, url, _a=ans):
            self.urls.append(url)
            pg = int(re.search(r'page=(\d+)', url).group(1))
            a = _a[pg - 1] if isinstance(_a, list) else _a
            if isinstance(a, Exception):
                raise a
            return 200, a
    r = A.read_game('9001', Mixed({}), 1)
    check(r['st'] == 'failed', f'{why}: {r}')
check(A.read_game('9001', Feed({}), 1) == {'st': 'none'}, 'a 404 is none')
check(A.read_game('9001', Feed({'9001': RuntimeError('boom')}), 1)['st'] == 'failed', 'a raise is failed')

# ---- a season of games -----------------------------------------------------------------------------------------
tmp = tempfile.mkdtemp()
COLS = ['game_id', 'season', 'game_type', 'week', 'gameday', 'gametime', 'away_team', 'home_team', 'home_score', 'espn']
GAMES = [
    ('2026_01_ARI_LAC', 2026, 'REG', 1, '2026-09-13', '16:25', '23', '401872926'),   # played 44 days before
    ('2026_06_GB_CHI', 2026, 'REG', 6, '2026-10-17', '13:00', '20', '6001'),         # played 10 days before
    ('2026_07_LA_SF', 2026, 'REG', 7, '2026-10-25', '16:25', '27', '7001'),          # played 2 days before
    ('2026_07_NO_ATL', 2026, 'REG', 7, '2026-10-25', '13:00', '17', '7003'),         # played, ESPN answers 404
    ('2026_07_DAL_WAS', 2026, 'REG', 7, '2026-10-27', '07:00', '', '7002'),          # an hour in play, no score
    ('2026_08_MIA_BAL', 2026, 'REG', 8, '2026-10-29', '20:15', '', '9001'),          # to come
    ('2026_08_NE_NYJ', 2026, 'REG', 8, '2026-11-01', '13:00', '', '9002'),           # to come
    ('2026_09_KC_BUF', 2026, 'REG', 9, '2026-11-08', '13:00', '', '9101'),           # to come, a later week
    ('2026_10_TBD_TBD', 2026, 'REG', 10, '2026-11-15', '13:00', '', ''),             # no ESPN id
    ('2025_01_KC_LAC', 2025, 'REG', 1, '2025-09-07', '16:25', '24', '5001'),         # another season
    ('2026_07_PIT_CLE', 2026, 'PRE', 7, '2026-10-25', '13:00', '10', '7009'),        # not a regular-season or playoff game
]
gcsv = os.path.join(tmp, 'games.csv')
with open(gcsv, 'w', encoding='utf-8') as fh:
    fh.write(','.join(COLS) + '\n')
    for gid, s, t, wk, d, tm, hs, e in GAMES:
        a_, h_ = gid.split('_')[2:4]
        fh.write(f'{gid},{s},{t},{wk},{d},{tm},{a_},{h_},{hs},{e}\n')
rcsv = os.path.join(tmp, 'roster.csv')
rcsv2 = os.path.join(tmp, 'roster2.csv')
ROSTER = [('2578570', '00-0033119'), ('4361307', '00-0037744'), ('4686612', '00-0040727'), ('100', '00-0000100'), ('101', '00-0000101'),
          ('777', '00-0000777'), ('777', '00-0000778')]
for path, extra in ((rcsv, []), (rcsv2, [('102', '00-0000102')])):
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('season,team,gsis_id,espn_id\n')
        for e, g in ROSTER + extra:
            fh.write(f'2026,XXX,{g},{e}\n')
out = os.path.join(tmp, 'espn_lines_2026.json')
gm = A.season_games(A.read_csv(gcsv), 2026)
check(sorted(gm) == sorted(g[0] for g in GAMES if g[1] == 2026 and g[2] == 'REG' and g[7]),
      f"the season's games (no other season, no game with no ESPN id, no preseason): {sorted(gm)}")

V1 = page([item('passing_yards', '100', 225.5, 225.5), item('passing_yards', '100', 225.5, 225.5), item('receptions', '101', 4.5, 4.5),
           item('receiving_yards', '102', 50.5, 52.5), item('receiving_yards', '777', 30.5, 30.5), item('any_td', '101', None, None),
           item('any_td', '102', None, None)])
V2 = page([item('passing_yards', '100', 225.5, 230.5, '2026-10-27T17:00Z'), item('receiving_yards', '102', 50.5, 53.5),
           item('receiving_yards', '777', 30.5, 30.5), item('any_td', '102', None, None)])
NE1 = page([item('rushing_yards', '300', 60.5, 62.5)])
SEVEN = json.loads(json.dumps(FIX))
SEVEN2 = page([item('passing_yards', '2578570', 1.5, 999.5)])
now1 = datetime.datetime(2026, 10, 27, 12, 0, tzinfo=UTC)


def run(now, answers, roster=rcsv, **k):
    feed = Feed(answers)
    with contextlib.redirect_stdout(io.StringIO()):
        notes, probs = A.run(2026, now, games_csv=gcsv, roster_csv=roster, out=out, fetch=k.pop('fetch', feed), **k)
    return feed, notes, probs


def stored():
    return json.load(open(out, encoding='utf-8')) if os.path.exists(out) else None


# run 1: the week's games to come and the games played in the last 8 days; never in play, older, another season's
f, notes, probs = run(now1, {'9001': V1, '9002': NE1, '7001': SEVEN, '9101': NE1, '7002': NE1, '6001': NE1, '401872926': NE1, '5001': NE1})
check(f.events() == ['7001', '7003', '9001', '9002'], f'run 1 read the week to come and the recent played games alone: {f.events()}')
S1 = stored()
G = S1['games']
check(sorted(G) == ['2026_07_LA_SF', '2026_08_MIA_BAL', '2026_08_NE_NYJ'], f'run 1 wrote: {sorted(G)}')
g = G['2026_08_MIA_BAL']
check(g['final'] is False and g['w'] == 8 and g['espn'] == '9001' and g['kickoff'] == '2026-10-30T00:15:00Z'
      and g['first_read'] == g['last_read'] == '2026-10-27T12:00:00Z', f'a game to come: {dict((k, v) for k, v in g.items() if k != "lines")}')
check(g['lines'] == {'00-0000100': {'passing_yards': [225.5, 225.5, '2026-10-25T16:00Z']}, '00-0000101': {'receptions': [4.5, 4.5, '2026-10-25T16:00Z']},
                     'espn:102': {'receiving_yards': [50.5, 52.5, '2026-10-25T16:00Z']}, 'espn:777': {'receiving_yards': [30.5, 30.5, '2026-10-25T16:00Z']}},
      f"its lines (an unmapped athlete and an id the roster gives two players kept by ESPN id): {g['lines']}")
check(g['td'] == ['00-0000101', 'espn:102'] and g['conflict'] == [] and g['gone'] == [], f"its touchdown list: {g['td']}")
s = G['2026_07_LA_SF']
check(s['final'] is True and s['lines']['00-0033119']['passing_yards'] == [226.5, 219.5, '2026-09-13T23:24Z']
      and s['conflict'] == [['00-0040727', 'receiving_yards', [[26.5, 26.5, '2026-09-13T23:07Z'], [26.5, 27.5, '2026-09-13T23:07Z']]]],
      f'a game played 2 days before read once more and frozen: {s.get("final")}')
check(any('404' in x and '2026_07_NO_ATL' in x for x in notes), f'a 404 on a played game said: {notes}')
check(len(probs) == 1 and '2026_07_NO_ATL' in probs[0] and not probs[0].startswith(('BLOCKED', 'AUDIT'))
      and '2026_07_LA_SF' not in probs[0] and '2026_06_GB_CHI' not in probs[0],
      f'a game played 43h before and not frozen is a problem, no other: {probs}')
text = open(out, encoding='utf-8').read()
lines = text.splitlines()
check(lines[0] == '{"v":1,"season":2026,' and lines[1].startswith('"how":') and lines[3] == '"games":{' and lines[-1] == '}}',
      f'the head of the file: {lines[:4]}')
check(lines.count('"00-0000101":{"receptions":[4.5,4.5,"2026-10-25T16:00Z"]},') == 1, 'a player\'s lines are not one line')
check(sum(1 for l in lines if l.startswith('"2026_')) == 3 and all(len(l) < 4000 for l in lines[4:]),
      'a game\'s head is not one line each, or a line carries more than a game\'s head or a player')
check(json.loads(text)['games'] == G, 'the file does not read back as written')

# run 2, six hours on: the game to come rewritten with its new close, a line it lacks kept as gone, the espn: key the
# roster now maps moved onto it; a failure leaves its game as it was; the frozen game never read again
now2 = now1 + datetime.timedelta(hours=6)
f, notes, probs = run(now2, {'9001': V2, '9002': RuntimeError('reset by peer'), '7001': SEVEN2}, roster=rcsv2)
S2 = stored()
G2 = S2['games']
g = G2['2026_08_MIA_BAL']
check(g['lines']['00-0000100']['passing_yards'] == [225.5, 230.5, '2026-10-27T17:00Z'], f"a new close, ESPN's open kept: {g['lines'].get('00-0000100')}")
check(g['first_read'] == '2026-10-27T12:00:00Z' and g['last_read'] == '2026-10-27T18:00:00Z' and g['final'] is False, 'its read times')
check(g['lines'].get('00-0000101') == {'receptions': [4.5, 4.5, '2026-10-25T16:00Z']} and ['00-0000101', 'receptions'] in g['gone'],
      f"a line the read lacks kept, as gone: {g.get('gone')}")
check('espn:102' not in g['lines'] and g['lines'].get('00-0000102') == {'receiving_yards': [50.5, 53.5, '2026-10-25T16:00Z']},
      f"the espn: key moved onto the gsis id the roster gives it since: {sorted(g['lines'])}")
check(g['td'] == ['00-0000101', '00-0000102'] and ['00-0000101', 'any_td'] in g['gone'], f"the touchdown list kept whole, the one gone said: {g['td']}, {g['gone']}")
check(G2['2026_08_NE_NYJ'] == G['2026_08_NE_NYJ'], 'a failed read changed its game')
check(G2['2026_07_LA_SF'] == G['2026_07_LA_SF'] and '7001' not in f.events(), 'a frozen game was read or rewritten')
check(any('failed' in x and '2026_08_NE_NYJ' in x for x in notes), f'a failed read said: {notes}')

# run 3: a 404 and an empty read on games with lines kept leave them exactly as they were, and nothing changed writes nothing
before = open(out, 'rb').read()
mt = os.stat(out).st_mtime_ns
f, notes, probs = run(now2 + datetime.timedelta(hours=1), {'9001': 404, '9002': page([item('receptions', '9', None, None)])})
check(open(out, 'rb').read() == before and os.stat(out).st_mtime_ns == mt, 'a run that changed nothing wrote the file')
check(f.events() == ['7002', '7003', '9001', '9002'], f'run 3 read (the game in play since 11:00 UTC now played): {f.events()}')
check(any('nothing of the kept markets' in x and '2026_08_NE_NYJ' in x for x in notes), f'an empty read said: {notes}')

# run 4, five hours after the Thursday game's kickoff (no score yet): read once more and frozen; the game in play an
# hour later still read on its own clock. Run 5: the frozen game never read again, whatever ESPN now says
now4 = datetime.datetime(2026, 10, 30, 5, 15, tzinfo=UTC)
V3 = page([item('passing_yards', '100', 225.5, 231.5, '2026-10-30T03:16Z'), item('any_td', '100', None, None)])
f, notes, probs = run(now4, {'9001': V3, '9002': NE1})
g = stored()['games']['2026_08_MIA_BAL']
check('9001' in f.events() and g['final'] is True and g['lines']['00-0000100']['passing_yards'] == [225.5, 231.5, '2026-10-30T03:16Z'],
      f"a played game's last read, frozen: {g.get('final')}, {g['lines'].get('00-0000100')}")
check(g['td'] == ['00-0000100', '00-0000101', '00-0000102'], f"its touchdown list: {g['td']}")
frozen = json.dumps(g, sort_keys=True)
f, notes, probs = run(now4 + datetime.timedelta(hours=7), {'9001': page([item('passing_yards', '100', 1.5, 2.5)]), '9002': NE1})
check('9001' not in f.events() and json.dumps(stored()['games']['2026_08_MIA_BAL'], sort_keys=True) == frozen, 'a frozen game was read or rewritten')
f, notes, probs = run(datetime.datetime(2026, 10, 30, 1, 15, tzinfo=UTC), {'9001': V3, '9002': NE1})
check('9001' not in f.events(), 'a game an hour into play was read')

# with --backfill every played game of the season not yet final, whatever its age; never another season's
f, notes, probs = run(now1, {'401872926': json.loads(json.dumps(FIX)), '6001': NE1, '7003': NE1, '9002': NE1}, backfill=True)
G5 = stored()['games']
check(f.events() == ['401872926', '6001', '7003', '9002'] and G5['2026_01_ARI_LAC']['final'] is True and G5['2026_06_GB_CHI']['final'] is True
      and G5['2026_07_NO_ATL']['final'] is True and '5001' not in f.events(), f'the backfill read: {f.events()}')
check(not probs, f'a backfill that froze every played game left a problem: {probs}')
check(json.dumps(G5['2026_08_MIA_BAL'], sort_keys=True) == frozen, 'a frozen game whose kickoff reads as to come (the clock set back) was read again')

# another season's game in the file is not written back; a file of another season, or one that will not read, is left alone
arc = json.load(open(out, encoding='utf-8'))
arc['games']['2025_01_KC_LAC'] = {'w': 1, 'final': True, 'lines': {}}
open(out, 'w', encoding='utf-8').write(json.dumps(arc))
f, notes, probs = run(now1 + datetime.timedelta(hours=1), {'9001': V2, '9002': NE1})
check('2025_01_KC_LAC' not in stored()['games'], 'a game of another season was written back')
for junk, why in (('{"v":1,"season":2025,"games":{}}', 'another season'), ('{"v":1,', 'a file that will not read'), ('[]', 'not an archive')):
    open(out, 'w', encoding='utf-8').write(junk)
    f, notes, probs = run(now1, {'9001': V1})
    check(open(out, encoding='utf-8').read() == junk and not f.urls and len(probs) == 1 and probs[0].startswith('ESPN archive: '),
          f'{why}: {probs}, {f.urls}')
os.remove(out)

# --offline reads nothing
f, notes, probs = run(now1, {'9001': V1}, offline=True, fetch=never)
check(not os.path.exists(out) and not probs and 'offline' in notes[0], f'--offline: {notes}, {probs}')

# weekly.py's step: --offline and a replay read nothing, an exception is a problem and never a refusal
with contextlib.redirect_stdout(io.StringIO()):
    import weekly as W  # noqa: E402
calls = []
W.say = lambda s: calls.append(('say', s))
W.problems.clear()
W.archive_step(types.SimpleNamespace(offline=True), now1, run=lambda *a, **k: calls.append('ran') or ([], []))
check('ran' not in calls and any('ESPN archive skipped' in s for _, s in calls) and not W.problems, f'weekly.py --offline: {calls}')
os.environ['PROPS_ESPN_REPLAY'] = '/x'
calls.clear()
W.archive_step(types.SimpleNamespace(offline=False), now1, run=lambda *a, **k: calls.append('ran') or ([], []))
os.environ.pop('PROPS_ESPN_REPLAY')
check('ran' not in calls and not W.problems, f'weekly.py replaying ESPN: {calls}')


def boom(*a, **k):
    raise ValueError('a planted failure')


with contextlib.redirect_stderr(io.StringIO()):
    W.archive_step(types.SimpleNamespace(offline=False), now1, run=boom)
check(len(W.problems) == 1 and W.problems[0].startswith('ESPN archive: ValueError: a planted failure') and not W.blocked(),
      f'an exception in the step: {W.problems}')
W.problems.clear()
seen = {}
W.archive_step(types.SimpleNamespace(offline=False), now1,
               run=lambda season, now, **k: seen.update(k, season=season) or (['ESPN archive: a note'], ['ESPN archive: a problem']))
check(seen.get('season') == W.SEASON and seen.get('out', '').endswith(f'props/data/espn_lines_{W.SEASON}.json')
      and seen.get('games_csv', '').endswith('props/raw/games.csv') and W.problems == ['ESPN archive: a problem'],
      f"the step's files and its problems: {seen}, {W.problems}")
W.problems.clear()
real_run = A.run
try:
    A.run = lambda season, now, **k: seen.update(default=True) or (['ESPN archive: the default'], [])
    W.archive_step(types.SimpleNamespace(offline=False), now1)
finally:
    A.run = real_run
check(seen.get('default') and not W.problems, "weekly.py's step does not run espn_archive.run by default")
src = open(os.path.join(HERE, 'weekly.py'), encoding='utf-8').read()
check('\nimport espn_archive' not in src, 'weekly.py imports espn_archive at its top, where a broken module would stop the run')
check(src.index('espn_apply_step(pp,prev,read,now)\n') < src.index('    archive_step(a,now)\n') < src.index('    audit_step(a)\n'),
      "weekly.py does not run the archive after the read is applied and before the audit")

# the default fetch, through lib/netfetch.py: a 404 none, a 403 tried with the other headers, a 500 a failure
got = []


def fake(answers):
    def dl(url, dest, **k):
        got.append((url, k))
        a = answers.pop(0)
        if isinstance(a, Exception):
            raise a
        open(dest, 'w', encoding='utf-8').write(json.dumps(a))
        return dest
    return dl


real = A.netfetch.download
try:
    A.netfetch.download = fake([A.netfetch.FetchError('x: HTTP Error 404', 404)])
    check(A.net_fetch('https://x/1') == (404, None), 'a 404 through netfetch is not (404, None)')
    got.clear()
    A.netfetch.download = fake([A.netfetch.FetchError('x: HTTP Error 403', 403), page([])])
    r = A.net_fetch('https://x/2')
    check(r == (200, page([])) and len(got) == 2 and 'User-Agent' in got[0][1]['headers'] and 'User-Agent' not in got[1][1]['headers']
          and got[0][1]['waits'] == A.WAITS, f'a 403 tried again with the other headers: {r}, {got}')
    A.netfetch.download = fake([A.netfetch.FetchError('x: HTTP Error 500', 500)])
    check(A.read_game('9001', A.net_fetch, 1)['st'] == 'failed', 'a 500 through netfetch is not a failed read')
finally:
    A.netfetch.download = real
asrc = open(os.path.join(HERE, 'espn_archive.py'), encoding='utf-8').read()
check('urlopen' not in asrc and 'urlretrieve' not in asrc and 'netfetch.download(' in asrc, 'espn_archive.py downloads other than through lib/netfetch.py')

print(f'{n} checks, {bad} failures')
sys.exit(1 if bad else 0)
