"""weekly.py's apply_espn (the props job's ESPN read into the payload) and the steps around it, held to their cases.

Since 20 October 2026 (the owner's call: no scheduled paid pull) every run of the props job reads DraftKings' lines
from ESPN (espn_read.js, the page's own reader) and publishes them: PAY.espn, each game still to come with its game
lines and ids (gl), its player lines (pl) and what the last read of them found (out), and the schedule's game lines
(ls 'dk', lat, lsr 'espn'), which the page installs at boot (espnPublished). No case here reads the network or spends
a credit; the last one boots the real page in jsdom.

  A. a game this run read 'ok': its block (cleaned) and out replace the published ones, its game lines too
  B. a read that failed (or a game that kicked off while it was read) carries the published halves, each with its own
     time, never this run's; a read whose scoreboard still had the game's lines takes those
  C. 'none' drops the published block (DraftKings no longer offers those lines) and says none, dated by the read
  D. nothing at or after a kickoff: a half dated at or after it dropped; a game started, scored or of another week
     left out; the published payload of another season carries nothing (a rollover); a read of another week ignored
  E. the schedule: the read's lines by the press's own set and drop rule (a spread or total read without its prices
     drops the old prices unless its number is unmoved), ls 'dk', lat the read's time to the second, lsr 'espn'; not
     where the read is a day old (nflverse's stand) or a DraftKings pull by hand is newer
  F. cleaning by the page's rules: a line off the half point, at 0 or past 1000, a stat the page does not keep, a
     player id not of the page's shape dropped; rungs each once, in order, at most 40; touchdowns once, sorted
  G. the overdue rule: a game kicking off within 48 hours whose player lines were last read over 24 hours ago (or never)
     is one problem naming it, worded so it never reads as a refusal or as an nflverse file not posted yet; its game
     lines never stand in for them (a scoreboard that answers while every player read fails still goes red), and a
     'none' is a read (a game with no player lines posted does not go red)
  H. nothing of the read in mkt, prices or dk; read_at the read's, null with no read; a paid pull's game-line ids for a
     game the read also covers (the same DraftKings ids: a paid sid is ESPN's bet-link outcome id) left in dk as baked,
     and the read published beside them
  I. load_read: no file, a file from before this run began, of another week, not JSON, not a read; a skipped read
  J. espn_step: an earlier run's read.json deleted before the read; a crash, a timeout and a page with no reader
     each a problem at once (never a refusal); the season over or no game to come, no read and no problem
  K. espn_apply_step: an error in apply_espn refuses the run (the published payload, its read with it, stays live)
  L. payload.py never carries espn forward (its carry run on a published payload holding one)
  M. the page installs exactly what apply_espn publishes: the real page booted in jsdom on a payload this made, every
     game's block in ESPN_LIVE equal to the published one, every game in ESPN_PUB with its outcome, its lines on the
     schedule marked read from ESPN, and the page's ESPN_KEEP_STATS the stats espn_rules reads from part3.js. Its three
     games are the published payload's last week's first three with their scores taken off, so it holds once every game
     has been played (the off-season) as well as mid-season

  N. espn_close (app v136): a game that kicked off gets DraftKings' main lines as the last published read had them
     before its kickoff (no rung, touchdown or game line), or this run's read where later and still before it; nothing
     read at or after the kickoff; an entry carried as it stands and never replaced; a game still to come never in it;
     a junk entry, another season's game or a bad line dropped; nothing carried across a rollover; and payload.py
     never carries it

    python3 props/build/test_apply_espn.py        must end "0 failures"
"""
import contextlib, copy, datetime, io, json, os, re, shutil, subprocess, sys, tempfile, types
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import weekly as W

UTC = datetime.timezone.utc
S = W.SEASON
NOW = datetime.datetime(2026, 10, 21, 12, 0, tzinfo=UTC)          # a Wednesday
RULES = W.espn_rules()
keep_real = W.espn_close_seed
W.espn_close_seed = lambda path=None: {}          # the cases hand a seed where one is meant (N); the real file is not theirs
NOT_POSTED = re.compile(r'^\s*\S+: not posted yet \(', re.M)

checks = []
def chk(ok, what):
    checks.append((bool(ok), what))
    print(('  ok    ' if ok else '  FAIL  ') + what)

def case(label, fn):
    try: fn()
    except Exception as e:
        import traceback; traceback.print_exc()
        chk(False, f'{label}: raised {type(e).__name__}: {e}')

def gid(a, h, w=7): return f'{S}_{w:02d}_{a}_{h}'
TNF, SUN, SNF, MNF = gid('NE', 'CHI'), gid('PIT', 'NO'), gid('KC', 'SEA'), gid('DAL', 'PHI')
def sched():
    return [
        {'id': TNF, 'w': 7, 'd': '2026-10-22', 't': '20:15', 'a': 'NE', 'h': 'CHI', 'sp': 3.0, 'tot': 50.5, 'mla': 130.0, 'mlh': -155.0, 'spa': -110.0, 'sph': -110.0, 'tov': -110.0, 'tou': -110.0},
        {'id': SUN, 'w': 7, 'd': '2026-10-25', 't': '13:00', 'a': 'PIT', 'h': 'NO', 'sp': -2.5, 'tot': 41.5, 'tov': -105.0, 'tou': -115.0},
        {'id': SNF, 'w': 7, 'd': '2026-10-25', 't': '20:20', 'a': 'KC', 'h': 'SEA', 'sp': 1.5, 'tot': 47.5},
        {'id': MNF, 'w': 7, 'd': '2026-10-26', 't': '20:15', 'a': 'DAL', 'h': 'PHI', 'sp': 6.5, 'tot': 46.5},
        {'id': gid('LA', 'LV'), 'w': 7, 'd': '2026-10-21', 't': '07:00', 'a': 'LA', 'h': 'LV', 'sp': 3.0},            # kicked off at 11:00 UTC
        {'id': gid('NYJ', 'NE', 6), 'w': 6, 'd': '2026-10-18', 't': '13:00', 'a': 'NYJ', 'h': 'NE', 'hs': 26.0, 'as': 10.0},   # played
    ]
def iso(t): return t.astimezone(UTC).strftime('%Y-%m-%dT%H:%M:%S.000Z')
def ago(h): return iso(NOW - datetime.timedelta(hours=h))
def block(at, **kw):
    b = {'at': at, 'lines': {'00-0039851': {'passing_yards': 248.5, 'passing_tds': 1.5}, '00-0036275': {'rushing_yards': 61.5}},
         'rungs': {'00-0036275': {'rushing_yards': [50, 60, 70]}}, 'td': ['00-0036275', '00-0039851']}
    b.update(kw); return b
def gl(at, **lines):
    L = {'mla': 124, 'mlh': -148, 'sp': 3, 'spa': -118, 'sph': -102, 'tot': 50.5, 'tov': -115, 'tou': -105}; L.update(lines)
    L = {k: v for k, v in L.items() if v is not None}
    return {'at': at, 'lines': L, 'ids': {'team:CHI|ml': '0ML1_1', 'team:NE|ml': '0ML1_3', 'game|total|over|50.5': '0OU1_1'}, 'event': '34118033'}
READ_AT = iso(NOW + datetime.timedelta(seconds=5))
def read(games, week=7, at=READ_AT): return {'v': 1, 'week': week, 'read_at': at, 'games': games}
def rg(st, pl=None, g=None, at=None, why=None):
    return {'out': {'st': st, 'why': why, 'at': at}, 'gl': g, 'pl': pl, 'placed': {}, 'counts': {}}
def pay(): return {'season': S, 'sched': sched(), 'mkt': {'7': {'00-0039851': {'passing_yards': {'line': 230.5, 'g': TNF}}}}, 'prices': {'7': [{'game_id': TNF, 'player': 'X'}]}, 'dk': {}}
def prev(games=None, season=S): return {'season': season, 'sched': sched(), 'espn': {'v': 1, 'read_at': ago(10), 'games': games or {}}}
def apply(p, pv, rd, now=NOW):
    return W.apply_espn(p, pv, rd, now, RULES)
def G(p, g): return next(x for x in p['sched'] if x['id'] == g)

# ---------------------------------------------------------------------------------------------------------- A
def a():
    p = pay(); pv = prev({TNF: {'w': '7', 'gl': gl(ago(10)), 'pl': block(ago(10)), 'out': {'st': 'ok', 'at': ago(10)}}})
    t = READ_AT
    notes, probs = apply(p, pv, read({TNF: rg('ok', block(t, lines={'00-0039851': {'passing_yards': 250.5}}), gl(t, sp=3.5), at=t)}))
    e = p['espn']['games'][TNF]
    chk(e['pl']['at'] == t and e['pl']['lines'] == {'00-0039851': {'passing_yards': 250.5}} and e['out'] == {'st': 'ok', 'at': t},
        f"A: an 'ok' read replaces the published block and out: {e.get('out')}, {e.get('pl', {}).get('lines')}")
    chk(e['gl']['at'] == t and e['gl']['lines']['sp'] == 3.5 and e['w'] == '7', f"A: and the game lines with the read's own: {e['gl']['at']} sp {e['gl']['lines']['sp']}")
    chk(set(e['gl']) == {'at', 'lines', 'ids', 'event'} and e['gl']['ids'] == gl(t)['ids'] and e['gl']['event'] == '34118033',
        'A: the game lines published as read: at, lines, ids and event, nothing else')
    chk(p['espn']['read_at'] == READ_AT and p['espn']['v'] == 1, f"A: read_at is the read's ({p['espn']['read_at']})")
    chk(not probs and any('1 with player lines read now' in n for n in notes), f'A: no problem, and the report says what was read: {notes}')
case('A', a)

# ---------------------------------------------------------------------------------------------------------- B
def b():
    old = {'w': '7', 'gl': gl(ago(10)), 'pl': block(ago(9)), 'out': {'st': 'ok', 'at': ago(9)}}
    for st in ('failed', 'kicked'):
        p = pay(); notes, probs = apply(p, prev({TNF: copy.deepcopy(old)}), read({TNF: rg(st, why='HTTP 403')}))
        e = p['espn']['games'].get(TNF, {})
        chk(e.get('pl') == old['pl'] and e.get('out') == old['out'] and e.get('gl') == old['gl'], f"B: a '{st}' read carries the published halves, each with its own time: {e.get('out')}")
    p = pay(); apply(p, prev({TNF: copy.deepcopy(old)}), read({TNF: rg('failed', g=gl(READ_AT, tot=51.5), why='HTTP 0')}))
    e = p['espn']['games'][TNF]
    chk(e['gl']['at'] == READ_AT and e['gl']['lines']['tot'] == 51.5 and e['pl'] == old['pl'], "B: a read whose player lines failed takes the scoreboard's new game lines and carries the block")
    p = pay(); apply(p, prev({TNF: copy.deepcopy(old)}), None)
    chk(p['espn']['games'][TNF] == {**old, 'w': '7'} and p['espn']['read_at'] is None, 'B: no read at all carries everything, read_at null')
    p = pay(); apply(p, prev({TNF: copy.deepcopy(old)}), {'v': 1, 'week': 7, 'read_at': READ_AT, 'skipped': 'no reader', 'games': {}})
    chk(p['espn']['games'][TNF] == {**old, 'w': '7'} and p['espn']['read_at'] is None, 'B: a skipped read carries everything too')
    p = pay(); apply(p, prev({TNF: copy.deepcopy(old)}), read({}))
    chk(p['espn']['games'][TNF] == {**old, 'w': '7'}, 'B: a game the read has no entry for is carried')
case('B', b)

# ---------------------------------------------------------------------------------------------------------- C
def c():
    old = {'w': '7', 'gl': gl(ago(10)), 'pl': block(ago(9)), 'out': {'st': 'ok', 'at': ago(9)}}
    p = pay(); apply(p, prev({TNF: old}), read({TNF: rg('none', at=READ_AT, why='DraftKings has posted no player lines for it yet')}))
    e = p['espn']['games'][TNF]
    chk('pl' not in e and e['out'] == {'st': 'none', 'at': READ_AT} and e['gl'] == old['gl'], f"C: 'none' drops the published block and says none at the read's time: {e}")
    p = pay(); apply(p, prev({TNF: old}), read({TNF: rg('none', at=None)}))
    chk(p['espn']['games'][TNF]['out'] == {'st': 'none', 'at': READ_AT}, "C: a 'none' with no time of its own is dated by the read")
    p = pay(); apply(p, prev({TNF: {'w': '7', 'out': {'st': 'none', 'at': ago(3)}}}), read({TNF: rg('failed')}))
    chk(p['espn']['games'][TNF] == {'w': '7', 'out': {'st': 'none', 'at': ago(3)}}, "C: a published 'none' is carried by a failed read, with no block")
case('C', c)

# ---------------------------------------------------------------------------------------------------------- D
def d():
    ko = W.kickoff(G(pay(), TNF)); at_ko = iso(ko)
    p = pay(); apply(p, prev({TNF: {'w': '7', 'gl': gl(at_ko), 'pl': block(ago(5)), 'out': {'st': 'ok', 'at': ago(5)}}}), None)
    e = p['espn']['games'][TNF]
    chk('gl' not in e and e['pl']['at'] == ago(5), f'D: a half dated at the kickoff is dropped, the rest kept: {sorted(e)}')
    old = {'w': '7', 'gl': gl(ago(10)), 'pl': block(ago(9)), 'out': {'st': 'ok', 'at': ago(9)}}
    p = pay(); pv = prev({gid('LA', 'LV'): dict(old), gid('NYJ', 'NE', 6): dict(old, w='6'), SUN: dict(old, w='8')})
    apply(p, pv, read({gid('LA', 'LV'): rg('ok', block(READ_AT), gl(READ_AT), at=READ_AT)}))
    chk(not p['espn']['games'], f'D: a game started, a game scored and an entry of another week are left out: {list(p["espn"]["games"])}')
    p = pay(); apply(p, prev({TNF: old}, season=S - 1), None)
    chk(not p['espn']['games'], 'D: a published payload of another season (a rollover) carries nothing')
    p = pay(); apply(p, prev({TNF: old}), read({TNF: rg('ok', block(READ_AT), gl(READ_AT), at=READ_AT)}, week=6))
    chk(p['espn']['games'][TNF]['pl']['at'] == ago(9) and p['espn']['games'][TNF]['gl']['at'] == ago(10), "D: a read of another week is not this game's: the published halves carried")
case('D', d)

# ---------------------------------------------------------------------------------------------------------- E
def e():
    t = ago(1)
    p = pay(); apply(p, prev(), read({TNF: rg('ok', block(t), gl(t), at=t)}))
    g = G(p, TNF)
    chk(g['ls'] == 'dk' and g['lat'] == t and g['lsr'] == 'espn' and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z', g['lat']),
        f"E: the game's lines on the schedule from the read: ls dk, lat the read's time to the second, lsr espn ({g.get('ls')} {g.get('lat')} {g.get('lsr')})")
    chk((g['mla'], g['mlh'], g['sp'], g['spa'], g['sph'], g['tot'], g['tov'], g['tou']) == (124, -148, 3, -118, -102, 50.5, -115, -105), 'E: every line and price the read had is set')
    # a spread and total read without their prices: moved, the old prices go; unmoved, they stay
    p = pay(); apply(p, prev(), read({TNF: rg('failed', g=gl(t, sp=3.5, spa=None, sph=None, tot=50.5, tov=None, tou=None))}))
    g = G(p, TNF)
    chk(g['sp'] == 3.5 and 'spa' not in g and 'sph' not in g and g['tot'] == 50.5 and g['tov'] == -110.0 and g['tou'] == -110.0,
        f"E: a spread moved with no prices drops the old ones; a total unmoved with no prices keeps them: {[g.get(k) for k in ('sp', 'spa', 'sph', 'tot', 'tov', 'tou')]}")
    p = pay(); apply(p, prev(), read({TNF: rg('failed', g=gl(t, mla=None, mlh=None))}))
    chk(G(p, TNF)['mla'] == 130.0 and G(p, TNF)['mlh'] == -155.0, 'E: a moneyline the read did not have is left as it was')
    # a day old: in PAY.espn, and not on the schedule
    p = pay(); apply(p, prev({SUN: {'w': '7', 'gl': gl(ago(24)), 'out': {'st': 'none', 'at': ago(24)}}}), None)
    chk(p['espn']['games'][SUN]['gl']['at'] == ago(24) and 'lsr' not in G(p, SUN) and G(p, SUN)['sp'] == -2.5, 'E: game lines read 24 hours ago stay published and leave the schedule to nflverse')
    p = pay(); apply(p, prev({SUN: {'w': '7', 'gl': gl(ago(23.9))}}), None)
    chk(G(p, SUN).get('lsr') == 'espn' and G(p, SUN)['sp'] == 3, 'E: carried game lines under a day old go on the schedule again (the schedule is rebuilt every run)')
    # a DraftKings pull by hand newer than the read wins; an older one gives way
    p = pay(); G(p, TNF).update(ls='dk', lat=W.dk_stamp(iso(NOW))); apply(p, prev(), read({TNF: rg('failed', g=gl(ago(1)))}))
    chk('lsr' not in G(p, TNF) and G(p, TNF)['sp'] == 3.0 and G(p, TNF)['mla'] == 130.0, "E: a DraftKings pull newer than the read keeps the schedule's lines")
    p = pay(); G(p, TNF).update(ls='dk', lat='2026-10-20T08:17Z'); apply(p, prev(), read({TNF: rg('failed', g=gl(ago(1)))}))
    chk(G(p, TNF).get('lsr') == 'espn' and G(p, TNF)['lat'] == ago(1), 'E: an older DraftKings pull gives way to the read')
case('E', e)

# ---------------------------------------------------------------------------------------------------------- F
def f():
    raw = {'at': READ_AT,
           'lines': {'00-0039851': {'passing_yards': 248.5, 'passing_tds': 1.25, 'targets': 7.5, 'rushing_yards': 0, 'carries': 1000.5, 'attempts': 33.5},
                     'bad id!': {'passing_yards': 200.5}, '__proto__x': {'receptions': True}, '00-0040734': {'receptions': True, 'carries': '6.5'}},
           'rungs': {'00-0036275': {'rushing_yards': [70, 50, 50, 60.5, 60.25, 2000] + list(range(80, 130)), 'fg_made': 'x'}},
           'td': ['00-0039851', '00-0036275', '00-0039851', 'bad id!', 7]}
    p = pay(); apply(p, prev(), read({TNF: rg('ok', raw, at=READ_AT)}))
    b = p['espn']['games'][TNF]['pl']
    chk(b['lines'] == {'00-0039851': {'passing_yards': 248.5, 'attempts': 33.5}}, f"F: only lines on a half point, above 0, at most 1000, of a kept stat, on a player id of the page's shape: {b['lines']}")
    r = b['rungs'].get('00-0036275', {}).get('rushing_yards', [])
    chk(r == sorted(set(r)) and len(r) == 40 and r[:3] == [50, 60.5, 70] and 2000 not in r and 60.25 not in r and 'fg_made' not in b['rungs']['00-0036275'],
        f'F: rungs each once, in order, at most 40, every one a line: {r[:5]}... ({len(r)})')
    chk(b['td'] == ['00-0036275', '00-0039851'], f"F: touchdowns once each and sorted: {b['td']}")
    p = pay(); apply(p, prev({TNF: {'w': '7', 'pl': raw, 'out': {'st': 'ok', 'at': READ_AT}}}), read({}, at=iso(NOW + datetime.timedelta(minutes=1))))
    chk(p['espn']['games'][TNF]['pl'] == b, 'F: a carried block is cleaned by the same rules')
    p = pay(); apply(p, prev(), read({TNF: rg('ok', {'at': 'not a time', 'lines': {}}, at=READ_AT)}))
    chk(TNF not in p['espn']['games'], "F: an 'ok' with no block the page could keep publishes nothing for it")
case('F', f)

# ---------------------------------------------------------------------------------------------------------- G
def g():
    # TNF kicks off in 36h; SUN in 77h
    p = pay(); _, probs = apply(p, prev({TNF: {'w': '7', 'pl': block(ago(31)), 'out': {'st': 'ok', 'at': ago(31)}}, SUN: {'w': '7', 'out': {'st': 'ok', 'at': ago(40)}}}), read({TNF: rg('failed')}))
    chk(len(probs) == 1 and f'{TNF} last read 31h ago, kickoff in 36h' in probs[0] and SUN not in probs[0],
        f'G: a game within 48h last read 31h ago is a problem; one 77h out is not: {probs}')
    chk(probs and probs[0].startswith('ESPN:') and not probs[0].startswith(('BLOCKED', 'AUDIT')) and not NOT_POSTED.search(probs[0]) and 'stays published' in probs[0],
        'G: worded as a problem the run publishes with, never a refusal or a file not posted yet')
    p = pay(); _, probs = apply(p, prev(), read({TNF: rg('failed')}))
    chk(probs and f'{TNF} never read, kickoff in 36h' in probs[0], f'G: never read: {probs}')
    p = pay(); _, probs = apply(p, prev(), read({TNF: rg('none', at=READ_AT)}))
    chk(not probs, f"G: a fresh 'none' is a read: no problem ({probs})")
    p = pay(); _, probs = apply(p, prev({TNF: {'w': '7', 'gl': gl(ago(2))}}), read({TNF: rg('failed')}))
    chk(probs and f'{TNF} never read, kickoff in 36h' in probs[0], f'G: game lines read 2h ago and no player read ever: never read, the game lines do not date it ({probs})')
    # the review's case (20 October 2026): ESPN's core host refusing the runners while its scoreboard answers, every
    # player read failed run after run, each run's game lines fresh
    p = pay(); _, probs = apply(p, prev(), read({TNF: rg('failed', g=gl(READ_AT), why='HTTP 403'), SUN: rg('failed', g=gl(READ_AT), why='HTTP 403')}))
    chk(len(probs) == 1 and f'{TNF} never read, kickoff in 36h' in probs[0] and SUN not in probs[0] and "player lines not read" in probs[0],
        f"G: every player read failed with the scoreboard's game lines fresh: the game within 48h never read, the one 77h out not ({probs})")
    p2 = pay(); later = NOW + datetime.timedelta(hours=30); at2 = iso(later + datetime.timedelta(seconds=5))
    _, probs = apply(p2, p, read({TNF: rg('failed', g=gl(at2), why='HTTP 403'), SUN: rg('failed', g=gl(at2), why='HTTP 403')}, at=at2), now=later)
    chk(len(probs) == 1 and f'{TNF} never read, kickoff in 6h' in probs[0] and SUN not in probs[0],
        f'G: and 30 hours on, with its game lines read again, the same ({probs})')
    p = pay(); _, probs = apply(p, prev({TNF: {'w': '7', 'gl': gl(ago(2)), 'out': {'st': 'none', 'at': ago(30)}}}), read({TNF: rg('failed', g=gl(READ_AT))}))
    chk(probs and f'{TNF} last read 30h ago' in probs[0], f"G: a 'none' 30h old is overdue, its game lines read now notwithstanding: {probs}")
    p = pay(); _, probs = apply(p, prev({TNF: {'w': '7', 'gl': gl(ago(2)), 'out': {'st': 'none', 'at': ago(3)}}}), read({TNF: rg('failed', g=gl(READ_AT))}))
    chk(not probs, f"G: a 'none' 3h old is a read: DraftKings has posted no player lines, no problem ({probs})")
    p = pay(); _, probs = apply(p, prev({TNF: {'w': '7', 'gl': gl(ago(2)), 'out': {'st': 'ok', 'at': ago(30)}, 'pl': block(ago(30))}}), read({TNF: rg('failed')}))
    chk(probs and 'last read 30h ago' in probs[0], f'G: the player lines date it where there was a player read: {probs}')
case('G', g)

# ---------------------------------------------------------------------------------------------------------- H
def h():
    p = pay(); before = copy.deepcopy({k: p[k] for k in ('mkt', 'prices', 'dk')})
    apply(p, prev(), read({TNF: rg('ok', block(READ_AT), gl(READ_AT), at=READ_AT), SUN: rg('none', at=READ_AT)}))
    chk({k: p[k] for k in ('mkt', 'prices', 'dk')} == before, 'H: nothing of the read in mkt, prices or dk')
    chk('espn' not in json.dumps(p['mkt']) + json.dumps(p['prices']) and p['dk'] == {}, "H: PAY.dk stays the bake's ({}): a read's ids are the page's to merge")
    # a paid pull by hand (or Thursday 22 October's, the last scheduled one) baked TNF's game-line ids, which are the very
    # ids ESPN's bet links carry: dk keeps them as baked, and the read is published as read, ids and all
    p = pay(); paid = {**gl(READ_AT)['ids'], 'event': '34118033', 'glat': '2026-10-21T10:17Z'}; p['dk'] = {'7': {TNF: dict(paid)}}
    apply(p, prev(), read({TNF: rg('ok', block(READ_AT), gl(READ_AT), at=READ_AT)}))
    e = p['espn']['games'].get(TNF, {})
    chk(p['dk'] == {'7': {TNF: paid}} and e.get('gl', {}).get('ids') == gl(READ_AT)['ids'] and e.get('pl', {}).get('at') == READ_AT and G(p, TNF).get('lsr') == 'espn',
        f"H: paid game-line ids equal to the read's: dk left as baked, the read published (gl, pl, the schedule's lines): {p['dk']} {sorted(e)}")
case('H', h)

# ---------------------------------------------------------------------------------------------------------- I
def i():
    tmp = tempfile.mkdtemp(prefix='test_apply_espn_')
    try:
        f = os.path.join(tmp, 'read.json')
        chk(W.load_read(f, NOW, 7)[0] is None, 'I: no file, no read')
        json.dump(read({}), open(f, 'w')); r, why = W.load_read(f, NOW, 7)
        chk(r is not None and why is None, f'I: this run\'s read is taken ({why})')
        json.dump(read({}, at=ago(2)), open(f, 'w')); r, why = W.load_read(f, NOW, 7)
        chk(r is None and 'before this run began' in why, f'I: a read from before this run began is never this run\'s: {why}')
        json.dump(read({}, week=6), open(f, 'w')); r, why = W.load_read(f, NOW, 7)
        chk(r is None and 'week 6' in why, f'I: a read of another week is not taken: {why}')
        open(f, 'w').write('{nope'); chk(W.load_read(f, NOW, 7)[0] is None, 'I: a file that is not JSON is not taken')
        json.dump({'v': 2, 'read_at': READ_AT}, open(f, 'w')); chk(W.load_read(f, NOW, 7)[0] is None, 'I: a file that is not a read (v 1) is not taken')
        json.dump({'v': 1, 'week': 7, 'read_at': READ_AT, 'skipped': 'the page has no espnReadWeek', 'games': {}}, open(f, 'w')); r, why = W.load_read(f, NOW, 7)
        chk(r is not None and r.get('skipped'), 'I: a skipped read is handed back as it is, for the caller to make a problem of')
    finally: shutil.rmtree(tmp, ignore_errors=True)
case('I', i)

# ---------------------------------------------------------------------------------------------------------- J
def j():
    tmp = tempfile.mkdtemp(prefix='test_apply_espn_')
    real = (W.ESPN_READ, W.run)
    try:
        W.ESPN_READ = os.path.join(tmp, 'read.json')
        pp = os.path.join(tmp, 'payload.json'); json.dump(pay(), open(pp, 'w'))
        def step(act, season_over=False, wk=7):
            W.problems[:] = []; W.report[:] = []; seen = []
            json.dump(read({}, at=ago(30)), open(W.ESPN_READ, 'w'))          # an earlier run's
            def fake(args, cwd, label, soft=False, env=None, timeout=None):
                seen.append({'args': args, 'soft': soft, 'timeout': timeout, 'stale': os.path.exists(W.ESPN_READ)})
                return act()
            W.run = fake
            with contextlib.redirect_stdout(io.StringIO()):
                r = W.espn_step(types.SimpleNamespace(offline=False), wk, season_over, pp, NOW)
            return r, list(W.problems), seen
        r, probs, seen = step(lambda: (0, '  ESPN: done'))
        chk(seen and not seen[0]['stale'] and r is None and not os.path.exists(W.ESPN_READ), "J: an earlier run's read.json is deleted before the read, and never taken for this run's")
        chk(seen and seen[0]['soft'] and seen[0]['timeout'] == W.ESPN_TIMEOUT and seen[0]['args'][:2] == ['node', 'espn_read.js'], f'J: the read runs soft, with a timeout: {seen and seen[0]}')
        def wrote(doc): return lambda: (json.dump(doc, open(W.ESPN_READ, 'w')), (0, 'ESPN: read'))[1]
        r, probs, _ = step(wrote(read({TNF: rg('none', at=READ_AT)})))
        chk(r and r['games'] and not probs, 'J: a read written by this run is taken, no problem')
        for lab, act, want in (('a crash', lambda: (1, 'ESPN: the read stopped: TypeError'), 'stopped (exit 1)'),
                               ('a timeout', lambda: (W.TIMED_OUT, 'ESPN: ...'), f'did not finish within {W.ESPN_TIMEOUT}s'),
                               ('a page with no reader', wrote({'v': 1, 'week': 7, 'read_at': READ_AT, 'skipped': 'the page has no espnReadWeek', 'games': {}}), 'no espnReadWeek')):
            r, probs, _ = step(act)
            chk(r is None and len(probs) == 1 and want in probs[0] and not probs[0].startswith(('BLOCKED', 'AUDIT')) and not W.blocked(),
                f'J: {lab} is a problem at once, never a refusal: {probs}')
        r, probs, seen = step(lambda: (0, ''), season_over=True)
        chk(r is None and not probs and not seen and not os.path.exists(W.ESPN_READ), 'J: the season over: no read, no problem, the old file gone')
        r, probs, seen = step(lambda: (0, ''), wk=6)
        chk(r is None and not probs and not seen, 'J: no game of the week still to come: no read, no problem')
        out = open(os.path.join(HERE, 'weekly.py'), encoding='utf-8').read()
        said = re.findall(r'say\(f?"(  ESPN[^"]*)"', out)
        chk(said and not any(NOT_POSTED.search(s) or s.lstrip().startswith('BLOCKED') for s in said), f"J: none of weekly.py's ESPN lines reads as a file not posted yet or a refusal ({len(said)})")
    finally:
        W.ESPN_READ, W.run = real; W.problems[:] = []; W.report[:] = []
        shutil.rmtree(tmp, ignore_errors=True)
case('J', j)

# ---------------------------------------------------------------------------------------------------------- K
def k():
    tmp = tempfile.mkdtemp(prefix='test_apply_espn_'); real = W.apply_espn
    try:
        pp = os.path.join(tmp, 'payload.json'); json.dump(pay(), open(pp, 'w'))
        W.problems[:] = []; W.report[:] = []
        def boom(*a, **kw): raise KeyError('w')
        W.apply_espn = boom
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            W.espn_apply_step(pp, prev(), read({}), NOW)
        chk(W.blocked() and any(p.startswith('BLOCKED: the ESPN read could not be applied') for p in W.problems), f'K: an error applying the read refuses the run: {W.problems}')
        W.apply_espn = real; W.problems[:] = []
        with contextlib.redirect_stdout(io.StringIO()):
            W.espn_apply_step(pp, prev(), read({TNF: rg('ok', block(READ_AT), gl(READ_AT), at=READ_AT)}), NOW)
        raw = open(pp, encoding='utf-8').read(); got = json.loads(raw)
        chk(not W.blocked() and got['espn']['games'][TNF]['pl']['at'] == READ_AT and ', ' not in raw[:200] and ': ' not in raw[:200],
            "K: applied, the payload is written back as the bake writes it (no spaces), the read in it")
    finally:
        W.apply_espn = real; W.problems[:] = []; W.report[:] = []
        shutil.rmtree(tmp, ignore_errors=True)
case('K', k)

# ---------------------------------------------------------------------------------------------------------- L
def l():
    src = open(os.path.join(HERE, 'payload.py'), encoding='utf-8').read()
    # payload.py's own carry, from its retired set to the end of its loop, run on a published payload holding a read
    start = src.index('_RETIRED='); end = src.index('\n', src.index('for _k,_v in _prev.items():'))
    end = src.index('\n', end + 1)
    ns = {'_prev': {'espn': {'v': 1, 'games': {'x': 1}}, 'espn_close': {'v': 1, 'weeks': {}}, 'roster_season': 2025, 'kept': 1, 'mkt': 'new'}, 'out': {'mkt': 'built'}}
    exec(src[start:end], ns)
    chk('espn' not in ns['out'] and 'espn_close' not in ns['out'] and ns['out'].get('kept') == 1 and ns['out']['mkt'] == 'built' and 'roster_season' not in ns['out'],
        f"L: payload.py's carry keeps what it does not rebuild, but never espn or espn_close: {sorted(ns['out'])}")
case('L', l)

# ---------------------------------------------------------------------------------------------------------- N
def n():
    LV, NYJ = gid('LA', 'LV'), gid('NYJ', 'NE', 6)
    ko = W.kickoff(G(pay(), LV)); before = iso(ko - datetime.timedelta(hours=9)); at_ko = iso(ko)
    main = {'00-0039851': {'passing_yards': 248.5, 'passing_tds': 1.5}, '00-0036275': {'rushing_yards': 61.5}}
    def pv(games, close=None, season=S):
        x = prev(games, season); x['espn_close'] = close if close is not None else {'v': 1, 'weeks': {}}; return x
    # the published read of a game that has kicked off since: its main lines kept, nothing else
    p = pay(); notes, _ = apply(p, pv({LV: {'w': '7', 'gl': gl(before), 'pl': block(before), 'out': {'st': 'ok', 'at': before}}}), None)
    C = p['espn_close']
    chk(C == {'v': 1, 'weeks': {'7': {LV: {'at': before, 'lines': main}}}}, f"N: a game kicked off since keeps the published read's main lines, no rung, touchdown or game line: {C}")
    chk(any('kept for 1 game(s) played this season, 1 new' in x for x in notes), f'N: the report says it: {notes}')
    chk(LV not in p['espn']['games'], 'N: and the game leaves espn as before')
    # this run's read of it, later and still before the kickoff, wins; one at or after the kickoff never
    later = iso(ko - datetime.timedelta(hours=1))
    p = pay(); apply(p, pv({LV: {'w': '7', 'pl': block(before), 'out': {'st': 'ok', 'at': before}}}), read({LV: rg('ok', block(later, lines={'00-0036275': {'rushing_yards': 59.5}}), at=later)}))
    chk(p['espn_close']['weeks']['7'][LV] == {'at': later, 'lines': {'00-0036275': {'rushing_yards': 59.5}}}, f"N: this run's later read before the kickoff is kept: {p['espn_close']}")
    p = pay(); apply(p, pv({LV: {'w': '7', 'pl': block(at_ko), 'out': {'st': 'ok', 'at': at_ko}}}), read({LV: rg('ok', block(at_ko), at=at_ko)}))
    chk(p['espn_close'] == {'v': 1, 'weeks': {}}, f"N: nothing read at or after the kickoff is kept: {p['espn_close']}")
    # a 'none' published (no player lines posted) keeps nothing; a game still to come is never in it
    p = pay(); apply(p, pv({LV: {'w': '7', 'out': {'st': 'none', 'at': before}}, TNF: {'w': '7', 'pl': block(ago(5)), 'out': {'st': 'ok', 'at': ago(5)}}}), None)
    chk(p['espn_close'] == {'v': 1, 'weeks': {}} and TNF in p['espn']['games'], f"N: a 'none' keeps nothing and a game to come stays in espn alone: {p['espn_close']}")
    # carried as it stands, never replaced by a later published read; junk dropped
    kept = {'at': iso(ko - datetime.timedelta(hours=20)), 'lines': {'00-0039851': {'passing_yards': 240.5}}}
    old6 = {'at': '2026-10-18T12:00:00.000Z', 'lines': {'00-0036275': {'receptions': 3.5, 'rushing_yards': 0.3, 'carries': 1001}}}
    junk = {'7': {LV: kept, '2025_07_LA_LV': kept, 'not_an_id': kept}, '6': {NYJ: old6, gid('BUF', 'MIA', 6): {'at': 'never', 'lines': main}}, 'x': {}}
    p = pay(); apply(p, pv({LV: {'w': '7', 'pl': block(before), 'out': {'st': 'ok', 'at': before}}}, {'v': 1, 'weeks': junk}), None)
    W7, W6 = p['espn_close']['weeks'].get('7', {}), p['espn_close']['weeks'].get('6', {})
    chk(W7 == {LV: kept}, f"N: a kept entry is carried as it stands and never replaced, another season's or a junk id dropped: {W7}")
    chk(W6 == {NYJ: {'at': old6['at'], 'lines': {'00-0036275': {'receptions': 3.5}}}} and list(p['espn_close']['weeks']) == ['6', '7'],
        f"N: a carried entry cleaned by the page's rules, one with no time dropped, the weeks in order: {p['espn_close']['weeks']}")
    for bad in ({'v': 2, 'weeks': junk}, 'junk', None, {'v': 1, 'weeks': []}):
        p = pay(); apply(p, pv({}, bad), None)
        chk(p['espn_close'] == {'v': 1, 'weeks': {}}, f'N: a kept table that is not one carries nothing: {bad!r:.40}')
    # the seed (espn_close_seed.py's recovery from git) fills a game kept nowhere else, read before the kickoff, and
    # never replaces a kept entry or wins over a later read
    keep_seed = W.espn_close_seed
    try:
        W.espn_close_seed = lambda path=None: {'7': {LV: {'at': before, 'lines': {'00-0039851': {'passing_yards': 239.5, 'rushing_yards': 0.2}}}}}
        p = pay(); apply(p, pv({}), None)
        chk(p['espn_close']['weeks'] == {'7': {LV: {'at': before, 'lines': {'00-0039851': {'passing_yards': 239.5}}}}}, f"N: the seed fills a game kept nowhere else, cleaned: {p['espn_close']}")
        p = pay(); apply(p, pv({}, {'v': 1, 'weeks': {'7': {LV: kept}}}), None)
        chk(p['espn_close']['weeks']['7'][LV] == kept, 'N: the seed never replaces a kept entry')
        p = pay(); apply(p, pv({LV: {'w': '7', 'pl': block(later), 'out': {'st': 'ok', 'at': later}}}), None)
        chk(p['espn_close']['weeks']['7'][LV]['at'] == later, "N: a later published read wins over the seed")
        W.espn_close_seed = lambda path=None: {'7': {LV: {'at': at_ko, 'lines': main}}}
        p = pay(); apply(p, pv({}), None)
        chk(p['espn_close'] == {'v': 1, 'weeks': {}}, 'N: a seed read at the kickoff is never kept')
    finally:
        W.espn_close_seed = keep_seed
    # espn_close_seed itself: no file, junk, another season's give nothing; this season's weeks come back
    with tempfile.TemporaryDirectory() as td:
        f = os.path.join(td, 's.json')
        for body, want in (('{', {}), (json.dumps({'v': 1, 'season': S - 1, 'weeks': {'7': {}}}), {}), (json.dumps({'v': 2, 'season': S, 'weeks': {'7': {}}}), {}),
                           (json.dumps({'v': 1, 'season': S, 'weeks': {'7': {LV: kept}, '8': 'x'}}), {'7': {LV: kept}})):
            open(f, 'w').write(body)
            chk(keep_real(f) == want, f'N: espn_close_seed reads {body[:50]!r} as {want}')
        chk(keep_real(os.path.join(td, 'none.json')) == {}, 'N: espn_close_seed with no file gives nothing')
    # a rollover: the published payload another season's carries nothing
    p = pay(); apply(p, pv({LV: {'w': '7', 'pl': block(before), 'out': {'st': 'ok', 'at': before}}}, {'v': 1, 'weeks': {'6': {NYJ: old6}}}, season=S - 1), None)
    chk(p['espn_close'] == {'v': 1, 'weeks': {}}, f"N: nothing carried across a rollover: {p['espn_close']}")
case('N', n)

# ---------------------------------------------------------------------------------------------------------- M
BOOT = r"""
'use strict';
const fs=require('fs'), path=require('path'), B=process.argv[2], PAY=process.argv[3], NOW=Date.parse(process.argv[4]);
const { JSDOM, VirtualConsole }=require(path.join(B,'node_modules','jsdom')); const Papa=require(path.join(B,'node_modules','papaparse'));
const P=f=>fs.readFileSync(path.join(B,f),'utf8');
const html=P('part1.html')+"let PAY=null;\nconst DATA_URL='../data/payload.json';\n"+P('part2.js')+'\n'+P('part3.js')+'\n</script>\n</body>\n</html>\n';
const text=fs.readFileSync(PAY,'utf8'), errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(String(e&&e.message)));
const dom=new JSDOM(html,{url:'https://demon-x13.github.io/nfl-hub/props/app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.Papa=Papa; w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
  const D0=w.Date; class D extends D0{ constructor(...a){ if(a.length) super(...a); else super(NOW); } static now(){ return NOW; } } w.Date=D;
  w.fetch=async u=>/payload\.json/.test(String(u))?{ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(text)}:{ok:false,status:404,headers:{get:()=>null},json:async()=>{throw new Error('404');}};
  w.addEventListener('error',e=>errs.push(e.message)); }});
const w=dom.window; const t=setTimeout(()=>{ console.log(JSON.stringify({err:'no app-ready',errs})); process.exit(1); },60000);
w.document.addEventListener('app-ready',()=>{ clearTimeout(t);
  const pub={}; for(const [wk,G] of Object.entries(w.eval('ESPN_PUB'))) for(const [g,x] of Object.entries(G)) pub[g]={st:x.st,at:x.at,when:x.when,gl:!!x.gl};
  const lines={}; for(const g of w.eval('S.sched')) if(g.lsr) lines[g.id]={ls:g.ls,lat:g.lat,lsr:g.lsr,sp:g.sp,src:w.eval('lineSource')(g)};
  console.log(JSON.stringify({live:w.eval('ESPN_LIVE'),pub,lines,stats:[...w.eval('ESPN_KEEP_STATS')].sort(),errs}));
  process.exit(0); });
"""
def m():
    tmp = tempfile.mkdtemp(prefix='test_apply_espn_')
    try:
        p = json.load(open(os.path.join(HERE, '..', 'data', 'payload.json'), encoding='utf-8'))
        p.pop('espn', None)
        for g in p['sched']:
            g.pop('lsr', None)
        # the payload's last week, three games of it with their scores taken off (on this copy alone: every game of it
        # may have been played, as from the Sunday of week 18 until the season rolls over), on a clock 30 hours before
        # the first of them
        wk = max(int(g['w']) for g in p['sched'])
        gs = sorted((g for g in p['sched'] if int(g['w']) == wk), key=lambda g: (W.kickoff(g), g['id']))[:3]
        chk(len(gs) == 3, f"M: the payload's last week has three games to stand on ({len(gs)})")
        for g in gs: g.pop('hs', None); g.pop('as', None)
        now = W.kickoff(gs[0]) - datetime.timedelta(hours=30)
        at = lambda h: iso(now - datetime.timedelta(hours=h))
        team = {}
        for pl in p['players']: team.setdefault(pl['t'], []).append(pl['id'])
        def blk(g, t):
            a, h = team.get(g['a'], []), team.get(g['h'], [])
            return {'at': t, 'lines': {a[0]: {'passing_yards': 230.5, 'targets': 3.5, 'receptions': 4.25}, h[0]: {'rushing_yards': 0, 'receiving_yards': 44.5}},
                    'rungs': {h[1]: {'receiving_yards': list(range(10, 120, 2)) + [15.5, 15.5]}}, 'td': [h[0], a[0], h[0], 'bad id!']}
        rd = {'v': 1, 'week': wk, 'read_at': at(0), 'games': {
            gs[0]['id']: rg('ok', blk(gs[0], at(0)), gl(at(0), sp=-3.5), at=at(0)),
            gs[1]['id']: rg('none', None, gl(at(0)), at=at(0)),
            gs[2]['id']: rg('failed', why='HTTP 403')}}
        pv = {'season': S, 'espn': {'v': 1, 'read_at': at(5), 'games': {gs[2]['id']: {'w': str(wk), 'pl': blk(gs[2], at(5)), 'out': {'st': 'ok', 'at': at(5)}, 'gl': gl(at(26))}}}}
        notes, probs = W.apply_espn(p, pv, rd, now, RULES)
        f = os.path.join(tmp, 'payload.json'); json.dump(p, open(f, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
        js = os.path.join(tmp, 'boot.js'); open(js, 'w').write(BOOT)
        r = subprocess.run(['node', js, HERE, f, iso(now)], capture_output=True, text=True, timeout=180)
        got = json.loads((r.stdout.strip().splitlines() or ['{}'])[-1])
        E = p['espn']['games']; live = got.get('live', {}).get(str(wk), {})
        chk(r.returncode == 0 and not got.get('errs'), f"M: the page boots on the payload apply_espn wrote, with no error: {r.returncode} {got.get('errs')} {r.stderr[-300:]}")
        chk(set(live) == {g for g, e in E.items() if e.get('pl')} == {gs[0]['id'], gs[2]['id']}, f'M: the page installs a block for exactly the games published with one: {sorted(live)}')
        chk(all(live[g] == E[g]['pl'] for g in live), "M: each block the page installs is exactly the published one (the job cleans by the page's own rules)")
        pub = got.get('pub', {})
        chk(set(pub) == set(E) and pub.get(gs[1]['id'], {}).get('st') == 'none' and pub.get(gs[0]['id'], {}).get('st') == 'ok' and pub[gs[0]['id']]['gl'],
            f"M: every published game is in the page's ESPN_PUB with its outcome: {pub}")
        L = got.get('lines', {})
        chk(set(L) == {gs[0]['id'], gs[1]['id']} and L[gs[0]['id']]['sp'] == -3.5 and all(x['ls'] == 'dk' and x['lsr'] == 'espn' and 'ESPN' in (x['src'] or '') for x in L.values()),
            f"M: the games whose lines are under a day old carry them on the page's schedule, said to be read from ESPN (not {gs[2]['id']}'s, 26h old): {L}")
        chk(got.get('stats') == sorted(RULES[0]), f"M: the page's ESPN_KEEP_STATS is the set espn_rules reads from part3.js: {got.get('stats')}")
    finally: shutil.rmtree(tmp, ignore_errors=True)
case('M', m)

fails = [w for ok, w in checks if not ok]
print(f'{len(checks)} checks, {len(fails)} failures')
sys.exit(1 if fails else 0)
