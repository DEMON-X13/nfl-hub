"""Who took part in a finished game (weekly.py's who_played), held to its cases.

The page voided a leg on any player with no stat line once his game's stats were in. nflverse writes a
player's week only when he has a stat, so a receiver who played and was never targeted has no row:
Tory Horton (SEA, week 5 of 2026) ran 11 offensive snaps against the 49ers with no target, DraftKings
graded his receptions over 1.5 a loss, and the page showed it void. The bake now reads nflverse's snap
counts (PFR's) and writes the payload's snaps and a row of zeros for a player who took a snap in his
role; the page's settleLeg reads them (the audit's V9 and V15 hold that side). This holds the bake:

  A. a snap row is placed by its PFR id through the roster (Horton, with his real week-5 row; a player
     traded since, on the club he played for), else by its name within its game when that player is on
     the row's club ("Named Fallback" at PFR, "Named Fallback Jr." on the roster);
  B. listed, with no stat line and a snap of any kind: Horton, the name fallback, a back on special
     teams only, a kicker, the traded player; not listed: a player with a stat line, one whose row has
     no snaps, a lineman (a position the page does not project);
  C. a row of zeros, in the stats' own shape (every column, zeros, from_snaps), for a snap in his role
     (on offence; a kicker on special teams), never for a snap on special teams alone;
  D. a club whose stats are not in has no entry, and nor has a club with a skill-position snap row no
     player takes (a name only the other club has): its players with no stat line wait, and the name is
     reported;
  E. with no snap counts this run, the published payload's word is carried, less a club whose stats
     are gone and a player a stat correction has given a real row; nothing from another season;
  F. a finished game's club with stats in and no snap counts 72 hours after kickoff is overdue, and
     the run says so; not before;
  G. weekly.bake end to end: the payload carries the snaps and the stats the rows of zeros, a game to
     come none, and an overdue club is a problem.

    python3 props/build/test_who_played.py        must end "0 failures"
"""
import contextlib, datetime, io, json, os, shutil, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
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

S = weekly.SEASON
G1, G2, G3 = f'{S}_05_SF_SEA', f'{S}_05_TB_DAL', f'{S}_05_BUF_LA'
SCHED = [
    {'id': G1, 'w': 5, 'd': f'{S}-10-11', 't': '16:25', 'a': 'SF', 'h': 'SEA', 'hs': 20, 'as': 17},
    {'id': G2, 'w': 5, 'd': f'{S}-10-08', 't': '20:15', 'a': 'TB', 'h': 'DAL', 'hs': 24, 'as': 27},
    {'id': G3, 'w': 5, 'd': f'{S}-10-12', 't': '20:15', 'a': 'BUF', 'h': 'LA'},
]
HORTON = '00-0040648'
def ros(gsis, team, pos, full, pfr=''):
    first, last = full.split(' ', 1)
    return {'season': str(S), 'week': '5', 'gsis_id': gsis, 'team': team, 'position': pos, 'status': 'ACT', 'full_name': full,
            'first_name': first, 'last_name': last, 'football_name': first, 'pfr_id': pfr}
ROSTER = [
    ros(HORTON, 'SEA', 'WR', 'Tory Horton', 'HortTo00'),
    ros('00-T-NAMED', 'SEA', 'TE', 'Named Fallback Jr.'),                  # no PFR id: placed by his name
    ros('00-T-STAT', 'SEA', 'WR', 'Stat Guy', 'StatGu00'),                  # has a stat line
    ros('00-T-TEAMS', 'SEA', 'RB', 'Teams Only', 'TeamOn00'),               # special teams only
    ros('00-T-ZERO', 'SEA', 'TE', 'Zero Snaps', 'ZeroSn00'),                # a row of no snaps
    ros('00-T-KICK', 'SF', 'K', 'Kick Er', 'KickEr00'),                     # a kicker who never tried a kick
    ros('00-T-TRADE', 'NYJ', 'WR', 'Traded Man', 'TradMa00'),               # played for SF, a Jet now
    ros('00-T-LINE', 'SF', 'T', 'Line Man', 'LineMa00'),                    # a lineman
    ros('00-T-ELSE', 'TB', 'WR', 'Elsewhere Guy'),                          # a Buccaneer; PFR has the name on Dallas
    ros('00-T-SEAQB', 'SEA', 'QB', 'Sea Qb', 'SeaQb000'), ros('00-T-SFQB', 'SF', 'QB', 'Sf Qb', 'SfQb0000'),
    ros('00-T-DALWR', 'DAL', 'WR', 'Dal Wr', 'DalWr000'),
]
def stat(gsis, team, opp, gid, pos, name, **st):
    r = {'player_id': gsis, 'player_display_name': name, 'position': pos, 'season': str(S), 'week': '5', 'season_type': 'REG',
         'game_id': gid, 'team': team, 'opponent_team': opp}
    r.update({k: str(v) for k, v in st.items()})
    return r
SROWS = [stat('00-T-STAT', 'SEA', 'SF', G1, 'WR', 'Stat Guy', receptions=3, targets=4, receiving_yards=41),
         stat('00-T-SEAQB', 'SEA', 'SF', G1, 'QB', 'Sea Qb', attempts=30, completions=20, passing_yards=230),
         stat('00-T-SFQB', 'SF', 'SEA', G1, 'QB', 'Sf Qb', attempts=28, completions=17, passing_yards=198),
         stat('00-T-DALWR', 'DAL', 'TB', G2, 'WR', 'Dal Wr', receptions=5, targets=7, receiving_yards=60)]
def stats_of(srows):
    """the payload's stats as read_raw builds them (the positions the page projects, by week)"""
    out = {}
    for r in srows:
        if r['position'] in weekly.SKILL and r['game_id'] in (G1, G2): out.setdefault('5', []).append(dict(r))
    return out
SNAPHEAD = ['game_id', 'pfr_game_id', 'season', 'game_type', 'week', 'player', 'pfr_player_id', 'position', 'team', 'opponent',
            'offense_snaps', 'offense_pct', 'defense_snaps', 'defense_pct', 'st_snaps', 'st_pct']
def snap(gid, player, pfr, pos, team, opp, off, de=0, st=0):
    return dict(zip(SNAPHEAD, [gid, 'x', str(S), 'REG', '5', player, pfr, pos, team, opp, str(off), '0.5', str(de), '0', str(st), '0.1']))
SNAPS = [
    # Horton's row as nflverse's snap_counts_2026.csv has it for 2026_05_SF_SEA
    dict(zip(SNAPHEAD, [G1, '202610110sea', str(S), 'REG', '5', 'Tory Horton', 'HortTo00', 'WR', 'SEA', 'SF', '11', '0.17', '0', '0', '0', '0'])),
    snap(G1, 'Named Fallback', '', 'TE', 'SEA', 'SF', 14),
    snap(G1, 'Stat Guy', 'StatGu00', 'WR', 'SEA', 'SF', 40),
    snap(G1, 'Teams Only', 'TeamOn00', 'RB', 'SEA', 'SF', 0, st=9),
    snap(G1, 'Zero Snaps', 'ZeroSn00', 'TE', 'SEA', 'SF', 0),
    snap(G1, 'Sea Qb', 'SeaQb000', 'QB', 'SEA', 'SF', 60),
    snap(G1, 'Kick Er', 'KickEr00', 'K', 'SF', 'SEA', 0, st=5),
    snap(G1, 'Traded Man', 'TradMa00', 'WR', 'SF', 'SEA', 22),
    snap(G1, 'Line Man', 'LineMa00', 'T', 'SF', 'SEA', 60),
    snap(G1, 'Unknown Lineman', 'UnknLi00', 'G', 'SF', 'SEA', 60),        # no player takes him, not a position the page projects
    snap(G2, 'Elsewhere Guy', '', 'WR', 'DAL', 'TB', 12),                   # the name is a Buccaneer's: no player on Dallas
    snap(G2, 'Dal Wr', 'DalWr000', 'WR', 'DAL', 'TB', 50),
    snap(G2, 'Tb Wr', 'TbWr0000', 'WR', 'TB', 'DAL', 50),                   # Tampa's stats are not in
    snap(G3, 'Buf Wr', 'BufWr000', 'WR', 'BUF', 'LA', 50),                  # a game to come
]
def run(snap_rows=SNAPS, srows=SROWS, roster=ROSTER):
    pool = names.Pool(roster, srows, SCHED)
    shown = {r['player_id'] for r in srows if r['position'] in weekly.SKILL}
    return weekly.who_played(snap_rows, srows, roster, stats_of(srows), SCHED, pool, shown)

def ab():
    snaps, zero, unplaced = run()
    sea = ((snaps.get('5') or {}).get(G1) or {}).get('SEA')
    sf = ((snaps.get('5') or {}).get(G1) or {}).get('SF')
    chk(sea == sorted([HORTON, '00-T-NAMED', '00-T-TEAMS']), f'A/B: Seattle lists Horton (PFR id), the name fallback and the special-teams back, and nobody else: {sea}')
    chk(sf == sorted(['00-T-KICK', '00-T-TRADE']), f'A/B: San Francisco lists the kicker and the player traded since (by PFR id, on the club he played for): {sf}')
    chk('00-T-STAT' not in (sea or []) and '00-T-ZERO' not in (sea or []) and '00-T-LINE' not in (sf or []),
        'B: a player with a stat line, a row of no snaps and a lineman are not listed')
case('A/B', ab)

def c():
    snaps, zero, unplaced = run()
    rows = {r['player_id']: r for r in zero.get('5', [])}
    chk(set(rows) == {HORTON, '00-T-NAMED', '00-T-KICK', '00-T-TRADE'}, f'C: rows of zeros for a snap in his role, none for special teams alone: {sorted(rows)}')
    h = rows.get(HORTON) or {}
    chk(set(weekly.STATCOLS) <= set(h) and h.get('from_snaps') == 1, "C: Horton's row of zeros has every column of a stat row and says where it came from")
    chk(all(h.get(k) == 0 for k in weekly.STATCOLS[8:]), "C: Horton's row of zeros is all zeros")
    chk((h.get('team'), h.get('opponent_team'), h.get('position'), h.get('week'), h.get('season'), h.get('season_type'), h.get('player_display_name'))
        == ('SEA', 'SF', 'WR', 5.0, float(S), 'REG', 'Tory Horton'), f"C: Horton's row is his club's, against the 49ers, a receiver's, week 5: {h}")
    chk((rows.get('00-T-TRADE') or {}).get('team') == 'SF', 'C: the traded player\'s row is for the club he played for')
    chk((rows.get('00-T-NAMED') or {}).get('player_display_name') == 'Named Fallback Jr.', 'C: a row placed by name carries the roster\'s name')
case('C', c)

def d():
    snaps, zero, unplaced = run()
    chk(G2 not in (snaps.get('5') or {}), f'D: Dallas, with a snap row no player takes, and Tampa, with no stats in, have no entry: {(snaps.get("5") or {}).get(G2)}')
    chk(G3 not in (snaps.get('5') or {}), 'D: a game to come has no entry')
    chk(unplaced == [f'Elsewhere Guy ({G2} DAL)'], f'D: the name no Dallas player takes is reported, a lineman no player takes is not: {unplaced}')
    chk(not [r for r in zero.get('5', []) if r['team'] in ('TB', 'BUF', 'LA')], 'D: no row of zeros on a club whose stats are not in')
    # with the Dallas row placed by its PFR id, Dallas is in and lists nobody (its receiver has a stat line)
    fixed = [dict(r, pfr_player_id='ElseGu00') if r['player'] == 'Elsewhere Guy' else r for r in SNAPS]
    roster = [dict(r, team='DAL', pfr_id='ElseGu00') if r['gsis_id'] == '00-T-ELSE' else r for r in ROSTER]
    snaps2, zero2, unplaced2 = run(fixed, roster=roster)
    chk((snaps2.get('5') or {}).get(G2) == {'DAL': ['00-T-ELSE']} and not unplaced2, f'D: a club whose rows are all placed is in: {(snaps2.get("5") or {}).get(G2)}')
case('D', d)

def e():
    snaps, zero, _ = run()
    prev = {'season': S, 'snaps': snaps, 'stats': {'5': [dict(r) for r in stats_of(SROWS)['5']] + zero['5']}}
    s2, z2 = weekly.carry_snaps(prev, stats_of(SROWS), SROWS, SCHED)
    chk(s2 == snaps and sorted(r['player_id'] for r in z2['5']) == sorted(r['player_id'] for r in zero['5']), 'E: with no snap counts, the published word is carried as it was')
    # a stat correction gives Horton a real row, and San Francisco's stats are gone
    srows = SROWS + [stat(HORTON, 'SEA', 'SF', G1, 'WR', 'Tory Horton', receptions=1, targets=1, receiving_yards=6)]
    stats = stats_of([r for r in srows if r['team'] != 'SF'])
    s3, z3 = weekly.carry_snaps(prev, stats, srows, SCHED)
    chk(((s3.get('5') or {}).get(G1) or {}).keys() == {'SEA'} and HORTON not in s3['5'][G1]['SEA'], f'E: a club whose stats are gone is dropped, and a player with a real row now: {s3}')
    chk(sorted(r['player_id'] for r in z3.get('5', [])) == ['00-T-NAMED'], f'E: only the rows of zeros still standing are carried: {[r["player_id"] for r in z3.get("5", [])]}')
    chk(weekly.carry_snaps({'season': S - 1, 'snaps': snaps, 'stats': prev['stats']}, stats_of(SROWS), SROWS, SCHED) == ({}, {}), 'E: nothing is carried from another season\'s payload')
case('E', e)

def f():
    snaps, _, _ = run()
    ko = weekly.kickoff(SCHED[0])
    late = weekly.snaps_overdue(snaps, stats_of(SROWS), SCHED, ko + datetime.timedelta(hours=80))
    chk(late == [f'{G2} DAL'], f'F: 80 hours after Sunday, Dallas (Thursday, stats in, no snap counts) is overdue and nothing else: {late}')
    chk(weekly.snaps_overdue({}, stats_of(SROWS), SCHED, weekly.kickoff(SCHED[1]) + datetime.timedelta(hours=60)) == [], 'F: 60 hours after kickoff nothing is overdue')
    chk(weekly.snaps_overdue({}, {}, SCHED, ko + datetime.timedelta(days=30)) == [], 'F: a club with no stats in is never overdue on its snap counts')
case('F', f)

def g():
    tmp = tempfile.mkdtemp(prefix='test_who_played_')
    try:
        data = os.path.join(tmp, 'data'); os.makedirs(data)
        pp = os.path.join(tmp, 'payload.json')
        json.dump({'season': S, 'sched': SCHED, 'mkt': {}, 'players': [], 'depth': {}}, open(pp, 'w', encoding='utf-8'))
        def bake(snap_rows, now):
            raw = {'srows': SROWS, 'stats': stats_of(SROWS), 'skipped_live': set(), 'irows': [], 'rrows': ROSTER, 'snap_rows': snap_rows}
            weekly.DATA = data; weekly.problems.clear(); weekly.report.clear()
            with contextlib.redirect_stdout(io.StringIO()):
                weekly.bake(pp, {'season': S}, [], 5, False, now, raw)
            return json.load(open(pp, encoding='utf-8')), list(weekly.problems)
        now = weekly.kickoff(SCHED[0]) + datetime.timedelta(hours=20)
        pay, probs = bake(SNAPS, now)
        chk(pay.get('snaps', {}).get('5', {}).get(G1, {}).get('SEA') == sorted([HORTON, '00-T-NAMED', '00-T-TEAMS']), 'G: the payload carries the snaps')
        zs = [r for r in pay['stats']['5'] if r.get('from_snaps')]
        chk(sorted(r['player_id'] for r in zs) == sorted([HORTON, '00-T-NAMED', '00-T-KICK', '00-T-TRADE']) and len(pay['stats']['5']) == len(stats_of(SROWS)['5']) + 4,
            'G: the payload\'s stats are nflverse\'s rows and the rows of zeros')
        chk(len(probs) == 1 and f'{G2} DAL' in probs[0] and 'Elsewhere Guy' in probs[0] and G1 not in probs[0],
            f'G: 20 hours after Sunday only Thursday\'s Dallas, left out over a name no player takes, is overdue, and the problem names it: {probs}')
        pay2, probs2 = bake([r for r in SNAPS if r['game_id'] != G1], weekly.kickoff(SCHED[0]) + datetime.timedelta(hours=80))
        chk(any('no snap counts in' in p and f'{G1} SEA' in p and f'{G1} SF' in p for p in probs2), f'G: a game 80 hours old with no snap counts is a problem: {probs2}')
        chk(not [r for r in pay2['stats']['5'] if r.get('from_snaps')] and G1 not in pay2['snaps'].get('5', {}), 'G: without its snap counts a game has no rows of zeros and no entry')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
case('G', g)

fails = [w for ok, w in checks if not ok]
print(f'{len(checks)} checks, {len(fails)} failures')
sys.exit(1 if fails else 0)
