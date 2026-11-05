"""The Mismatch scorecard's test (elo/scorecard/scorecard.py), offline and in seconds, on fixtures of its own made in a
temp dir (a tiny matchups.json and players.json, games.csv, the archive, the player stats, the snap counts and
players.csv): every freeze and grade rule, every refusal of check and its pass on valid runs (check run through git on
a scratch repo too), the decision's arithmetic on made-up graded rows, the bootstrap's determinism, and the committed
ledger's bar pinned. The Elo job runs it before scorecard.py run; it must end "0 failures".

    python3 elo/scorecard/test_scorecard.py

BAR_PIN is the bar's SHA-256: a change that moves the bar must edit this line too, which is the point.
"""
import contextlib
import copy
import csv
import datetime
import hashlib
import io
import itertools
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scorecard as sc  # noqa: E402

BAR_PIN = '552609258e58c303d2bac2c3441c41adeddcfb53e9578a43b4643180be51411d'

fails = []


def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok:
        fails.append(what)


def T(s):
    return sc.when(s)


def plus(s, **kw):
    return sc.iso(T(s) + datetime.timedelta(**kw))


# ------------------------------------------------------------------ fixtures
# Sunday 13 September 2026: G1 AAA at BBB 13:00 ET (17:00 UTC), G2 CCC at DDD 16:25 ET (20:25 UTC), G3 EEE at FFF
# 20:20 ET (00:20 UTC Monday); a wild-card game in January (postseason: no row)
K1, K2, K3 = '2026-09-13T17:00:00Z', '2026-09-13T20:25:00Z', '2026-09-14T00:20:00Z'
GAMES = [
    {'game_id': '2026_01_AAA_BBB', 'season': 2026, 'game_type': 'REG', 'week': 1, 'gameday': '2026-09-13', 'gametime': '13:00',
     'away_team': 'AAA', 'home_team': 'BBB'},
    {'game_id': '2026_01_CCC_DDD', 'season': 2026, 'game_type': 'REG', 'week': 1, 'gameday': '2026-09-13', 'gametime': '16:25',
     'away_team': 'CCC', 'home_team': 'DDD'},
    {'game_id': '2026_01_EEE_FFF', 'season': 2026, 'game_type': 'REG', 'week': 1, 'gameday': '2026-09-13', 'gametime': '20:20',
     'away_team': 'EEE', 'home_team': 'FFF'},
    {'game_id': '2026_18_AAA_CCC', 'season': 2026, 'game_type': 'REG', 'week': 18, 'gameday': '2027-01-10', 'gametime': '13:00',
     'away_team': 'AAA', 'home_team': 'CCC'},
    {'game_id': '2026_19_BBB_DDD', 'season': 2026, 'game_type': 'WC', 'week': 19, 'gameday': '2027-01-16', 'gametime': '16:30',
     'away_team': 'BBB', 'home_team': 'DDD'},
]
G1, G2, G3, G18, GWC = (g['game_id'] for g in GAMES)
# players: a lead back per club and a quarterback with no mm
P = {'A1': ('00-0000001', 'Al Back', 'AAA', G1), 'B1': ('00-0000002', 'Bo Back', 'BBB', G1),
     'C1': ('00-0000003', 'Cy Back', 'CCC', G2), 'D1': ('00-0000004', 'Di Back', 'DDD', G2),
     'E1': ('00-0000005', 'Ed Back', 'EEE', G3), 'F1': ('00-0000006', 'Fa Back', 'FFF', G3),
     'W1': ('00-0000007', 'Wi Back', 'BBB', GWC), 'X9': ('00-0000009', 'Xo Back', 'ZZZ', '2026_01_YYY_ZZZ')}
QB = ('00-0000008', 'Qu Arter', 'AAA', G1)


def block(key, shift, tag, proj=60.0, no_elo=55.0, sd=30.0, group='RB', mm=True):
    pid, _, team, gid = P[key] if key in P else QB
    b = {'group': group, 'game_id': gid, 'team': team, 'opp': 'X', 'home': 1,
         'stats': {'rushing_yards': {'avg': 58.0, 'proj': proj, 'no_elo': no_elo, 'elo': proj - no_elo, 'sd': sd, 'z': 0.1}}}
    if mm:
        b['mm'] = {'stat': 'rushing_yards', 'shift': shift, 'tag': tag}
    return pid, b


def matchups(blocks, built):
    return {'built_at': built, 'season': 2026, 'week': 1, 'avg': dict(blocks),
            'avg_fit': {'mismatch': {'lead': {'RB': 'rushing_yards'}, 'tag': 0.035}}}


class Env:
    """a scratch tree: data/ (the published Elo files), cache/ (the build's nflverse files), archive/ and the ledgers"""

    def __init__(self, root):
        self.root = root
        self.data, self.cache, self.arch = (os.path.join(root, d) for d in ('data', 'cache', 'archive'))
        for d in (self.data, self.cache, self.arch):
            os.makedirs(d, exist_ok=True)
        self.ledger = os.path.join(root, 'ledger.json')
        self.out = os.path.join(root, 'new.json')
        self.games(GAMES)
        self.names()
        self.players_csv({v[0]: 'PFR' + k for k, v in P.items()})
        self.stats([])
        self.snaps([])
        self.archive({})
        with contextlib.redirect_stdout(io.StringIO()):
            sc.main(['init', '--ledger', self.ledger, '--now', '2026-09-01T00:00:00Z', '--season', '2026'])

    def games(self, rows):
        cols = ['game_id', 'season', 'game_type', 'week', 'gameday', 'gametime', 'away_team', 'home_team']
        with open(os.path.join(self.cache, 'games.csv'), 'w', newline='') as f:
            w = csv.DictWriter(f, cols)
            w.writeheader()
            for r in rows:
                w.writerow(r)

    def names(self):
        pl = {v[0]: {'name': v[1], 'group': 'RB', 'team': v[2]} for v in P.values()}
        with open(os.path.join(self.data, 'players.json'), 'w') as f:
            json.dump({'players': pl}, f)

    def matchups(self, blocks, built):
        with open(os.path.join(self.data, 'matchups.json'), 'w') as f:
            json.dump(matchups(blocks, built), f)

    def players_csv(self, pfr):
        with open(os.path.join(self.cache, 'players.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['gsis_id', 'pfr_id'])
            for g, p in pfr.items():
                w.writerow([g, p])

    def stats(self, rows):
        """rows: (game id, player key, team, week, rushing yards)"""
        with open(os.path.join(self.cache, 'stats_player_week_2026.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['player_id', 'season', 'week', 'season_type', 'game_id', 'team', 'rushing_yards', 'receiving_yards'])
            for gid, key, team, week, yds in rows:
                w.writerow([P[key][0] if key in P else key, 2026, week, 'REG', gid, team, yds, 0])

    def snaps(self, rows):
        """rows: (game id, PFR id, team, offense snaps)"""
        with open(os.path.join(self.cache, 'snap_counts_2026.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['game_id', 'season', 'week', 'pfr_player_id', 'team', 'offense_snaps', 'defense_snaps', 'st_snaps'])
            for gid, pfr, team, n in rows:
                w.writerow([gid, 2026, 1, pfr, team, n, 0, 0])

    def archive(self, games):
        """games: {gid: (final, {player key: (open, close)})}"""
        out = {'v': 1, 'season': 2026, 'games': {}}
        for gid, (final, lines) in games.items():
            out['games'][gid] = {'w': 1, 'final': final, 'lines': {P[k][0]: {'rushing_yards': [o, c, 'x']} for k, (o, c) in lines.items()}}
        with open(os.path.join(self.arch, 'espn_lines_2026.json'), 'w') as f:
            json.dump(out, f)

    def run(self, now, hold=True):
        """scorecard.py run as the job runs it: written aside, checked against the ledger before, then moved in"""
        before = sc.read_json(self.ledger)
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = sc.main(['run', '--ledger', self.ledger, '--out', self.out, '--data', self.data, '--cache', self.cache,
                          '--archive', self.arch, '--now', now])
        new = sc.read_json(self.out)
        bad = sc.problems(new, before)
        if hold:
            check(rc == 0 and not bad, f'the run at {now} passes check' + (f': {bad}' if bad else ''))
        shutil.copy(self.out, self.ledger)
        return new, buf.getvalue()


def row(led, key, gid=None):
    pid = P[key][0]
    for r in led['calls'].values():
        if r['pid'] == pid and (gid is None or r['gid'] == gid):
            return r
    return None


# ------------------------------------------------------------------ record and freeze

def freeze_rules(tmp):
    print('record, rewrite, drop and freeze')
    e = Env(os.path.join(tmp, 'freeze'))
    blocks = dict([block('A1', 0.05, True), block('B1', -0.02, False), block('C1', 0.0, False), block('D1', 0.01, False),
                   block('E1', 0.04, True), block('F1', -0.06, False), block('W1', 0.07, True), block('X9', 0.02, False),
                   block('QB', 0, False, group='QB', mm=False)])
    e.matchups(blocks, '2026-09-11T12:00+00:00')
    led, out = e.run('2026-09-11T12:10:00Z')
    keys = sorted(led['calls'])
    check(len(keys) == 6, f'every lead block of a regular-season game to come recorded, shift <= 0 and untagged too ({len(keys)})')
    check(row(led, 'B1')['shift'] == -0.02 and row(led, 'B1')['tag'] is False and row(led, 'C1')['shift'] == 0.0,
          'a block with shift below 0 and one at 0 are rows, untagged')
    check(row(led, 'W1') is None and 'postseason' in out, 'a postseason game gets no row, and the run says so')
    check(row(led, 'X9') is None and 'games.csv does not have' in out, 'a game off the schedule gets no row, and the run says so')
    check(not any(r['pid'] == QB[0] for r in led['calls'].values()), 'a block with no mm is no row')
    a1 = row(led, 'A1')
    check(a1 == {'season': 2026, 'week': 1, 'gid': G1, 'pid': P['A1'][0], 'name': 'Al Back', 'pos': 'RB', 'club': 'AAA',
                 'kickoff': K1, 'stat': 'rushing_yards', 'shift': 0.05, 'tag': True, 'proj': 60.0, 'no_elo': 55.0,
                 'sd': 30.0, 'published': '2026-09-11T12:00+00:00', 'written_at': '2026-09-11T12:10:00Z', 'grade': None},
          'a row carries the block, its game and kickoff, the publish and the run')
    # a later publish: A1 moves, B1 the same, D1 dropped
    b2 = dict(blocks)
    b2.update([block('A1', 0.03, False, proj=58.0)])
    del b2[P['D1'][0]]
    e.matchups(b2, '2026-09-12T12:00+00:00')
    led, _ = e.run('2026-09-12T12:05:00Z')
    a1 = row(led, 'A1')
    check(a1['shift'] == 0.03 and a1['tag'] is False and a1['proj'] == 58.0 and a1['written_at'] == '2026-09-12T12:05:00Z'
          and a1['published'] == '2026-09-12T12:00+00:00', 'a row whose numbers moved is rewritten before kickoff')
    check(row(led, 'B1')['written_at'] == '2026-09-11T12:10:00Z' and row(led, 'B1')['published'] == '2026-09-11T12:00+00:00',
          'a row whose numbers did not move is kept as first written')
    check(row(led, 'D1') is None, 'a block the newest publish before kickoff dropped: its row is dropped')
    # the same files again: nothing changed, the ledger is written as it was (run_at kept)
    led2, out = e.run('2026-09-12T13:00:00Z')
    check(led2 == led and 'nothing changed' in out, 'a run that changes nothing writes the ledger as it was (no commit)')
    # at G1's kickoff exactly: frozen; the block moves and is then dropped: the row stays
    b3 = dict(b2)
    b3.update([block('A1', 0.09, True), block('C1', 0.02, False)])
    e.matchups(b3, '2026-09-13T16:55+00:00')
    led, _ = e.run(K1)
    check(row(led, 'A1')['shift'] == 0.03, 'at kickoff exactly the row is frozen: a moved block does not rewrite it')
    check(row(led, 'C1')['shift'] == 0.02, 'a game still to come (by a second or more) is still rewritten')
    b4 = {k: v for k, v in b3.items() if k != P['A1'][0]}
    e.matchups(b4, '2026-09-13T18:00+00:00')
    led, _ = e.run('2026-09-13T18:00:00Z')
    check(row(led, 'A1') is not None and row(led, 'A1')['shift'] == 0.03, 'after kickoff a block the publish dropped: the frozen row stays')
    # D1's game (G2) first seen after its kickoff: no row
    b5 = dict(b4)
    b5.update([block('D1', 0.08, True)])
    e.matchups(b5, '2026-09-13T21:00+00:00')
    led, _ = e.run('2026-09-13T21:00:00Z')
    check(row(led, 'D1') is None, 'a game first seen after its kickoff gets no row')
    return e


def move_rules(tmp):
    print('a game moved after its rows froze')
    for hours, void in ((25, True), (23, False)):
        e = Env(os.path.join(tmp, f'moved{hours}'))
        e.matchups(dict([block('E1', 0.05, True), block('F1', -0.01, False)]), '2026-09-12T12:00+00:00')
        e.run('2026-09-12T12:10:00Z')
        moved = [dict(g) for g in GAMES]
        k = T(K3) + datetime.timedelta(hours=hours)
        et = k.astimezone(sc.ET)
        moved[2].update({'gameday': et.strftime('%Y-%m-%d'), 'gametime': et.strftime('%H:%M')})
        e.games(moved)
        e.archive({G3: (True, {'E1': (60.5, 61.5), 'F1': (40.5, 39.5)})})
        e.stats([(G3, 'E1', 'EEE', 1, 70), (G3, 'F1', 'FFF', 1, 20)])
        led, _ = e.run(plus(K3, hours=1))            # after the old kickoff: frozen, not yet played
        r = row(led, 'E1')
        if void:
            check(r['grade'] is not None and r['grade']['result'] == 'void' and r['grade']['why'] == 'moved',
                  'moved 25 hours: void (moved), at once')
        else:
            check(r['grade'] is None and r['kickoff'] == K3, 'moved 23 hours: not void, the row frozen at its kickoff')
            led, _ = e.run(sc.iso(k + datetime.timedelta(hours=71)))
            check(row(led, 'E1')['grade'] is None, 'moved 23 hours: waits for 72 hours after the game\'s new kickoff')
            led, _ = e.run(sc.iso(k + datetime.timedelta(hours=72)))
            g = row(led, 'E1')['grade']
            check(g is not None and g['result'] == 'over' and g['close'] == 61.5, 'moved 23 hours: graded as any other row')


def grade_rules(tmp):
    print('grading')
    e = Env(os.path.join(tmp, 'grade'))
    e.games(GAMES)
    blocks = dict([block('A1', 0.05, True), block('B1', -0.02, False), block('C1', 0.04, True), block('D1', 0.01, False)])
    e.matchups(blocks, '2026-09-12T12:00+00:00')
    e.run('2026-09-12T12:10:00Z')
    # A1: a stat row, over the close and under the open; B1: a whole-number close he lands on (push); C1: no stat row, a
    # snap (graded 0); D1: no stat row, his club's snaps without him (did not play)
    e.archive({G1: (True, {'A1': (80.5, 70.5), 'B1': (44.5, 45.0)}), G2: (True, {'C1': (30.5, 31.5), 'D1': (50.5, 52.5)})})
    e.stats([(G1, 'A1', 'AAA', 1, 75), (G1, 'B1', 'BBB', 1, 45), (G2, '00-0000099', 'CCC', 1, 12)])
    e.snaps([(G2, 'PFRC1', 'CCC', 4), (G2, 'PFRZZ', 'DDD', 30)])
    led, _ = e.run(plus(K1, hours=71, minutes=59))
    check(row(led, 'A1')['grade'] is None, 'a frozen row waits until kickoff + 72 hours')
    led, out = e.run(plus(K2, hours=72))
    a, b, c, d = (row(led, k)['grade'] for k in ('A1', 'B1', 'C1', 'D1'))
    check(a == {'result': 'over', 'close': 70.5, 'open': 80.5, 'vs_open': 'under', 'actual': 75.0, 'how': 'stat',
                'at': plus(K2, hours=72)}, 'graded at kickoff + 72 hours: over the close, and under the open kept beside it')
    check(b['result'] == 'push' and b['actual'] == 45.0, 'a stat that lands on a whole-number close is a push')
    check(c['result'] == 'under' and c['actual'] == 0.0 and c['how'] == 'snaps', 'no stat row and a snap in the game: graded on 0')
    check(d == {'result': 'void', 'why': 'did not play', 'at': plus(K2, hours=72)},
          'no stat row and his club\'s snaps without him: void, did not play')
    s = led['summary']['2026']
    check(s['graded'] == 2 and s['push'] == 1 and s['void'] == {'did not play': 1}, 'the push and the void are left out of the graded rows')
    check(s['tagged'] == {'n': 2, 'over': 1, 'rate': 0.5} and s['untagged'] == {'n': 0, 'over': 0, 'rate': None},
          'the tagged and untagged over-rates count the graded rows alone')
    # a grade is never changed: the stats move, the next runs keep it
    e.stats([(G1, 'A1', 'AAA', 1, 10), (G1, 'B1', 'BBB', 1, 90), (G2, 'C1', 'CCC', 1, 99)])
    led2, _ = e.run(plus(K2, days=20))
    check(all(row(led2, k)['grade'] == row(led, k)['grade'] for k in ('A1', 'B1', 'C1', 'D1')), 'a grade once written is never changed')

    print('waiting, then voided at 14 days')
    e = Env(os.path.join(tmp, 'late'))
    e.matchups(dict([block('A1', 0.05, True), block('B1', -0.02, False), block('C1', 0.04, True), block('D1', 0.01, False)]),
               '2026-09-12T12:00+00:00')
    e.run('2026-09-12T12:10:00Z')
    # A1: no close for him (his game final in the archive without his line); B1: a close, no stat row, no PFR id and his
    # club's game not in the snap counts (cannot tell); C1: his game not final in the archive
    e.archive({G1: (True, {'B1': (44.5, 45.5)}), G2: (False, {'C1': (30.5, 31.5), 'D1': (50.5, 52.5)})})
    e.stats([(G1, 'A1', 'AAA', 1, 75), (G2, '00-0000099', 'CCC', 1, 12)])
    e.players_csv({})
    e.snaps([(G2, 'PFRZZ', 'CCC', 30)])
    led, _ = e.run(plus(K1, days=13, hours=23))
    check(all(row(led, k)['grade'] is None for k in ('A1', 'B1', 'C1')), 'no close, an archive not final, play not told: each waits')
    led, _ = e.run(plus(K2, days=14))
    g = {k: row(led, k)['grade'] for k in ('A1', 'B1', 'C1')}
    check(g['A1']['why'] == 'no close' and g['B1']['why'] == 'not told' and g['C1']['why'] == 'no close',
          f"14 days after kickoff: void, no close (no line; not final) and not told ({[v['why'] for v in g.values()]})")
    # the stats lack D1's game entirely
    e2 = Env(os.path.join(tmp, 'nostats'))
    e2.matchups(dict([block('D1', 0.01, False)]), '2026-09-12T12:00+00:00')
    e2.run('2026-09-12T12:10:00Z')
    e2.archive({G2: (True, {'D1': (50.5, 52.5)})})
    e2.stats([(G1, 'A1', 'AAA', 1, 75)])
    led, _ = e2.run(plus(K2, days=3))
    check(row(led, 'D1')['grade'] is None, 'the stats not carrying the game: waits')
    led, _ = e2.run(plus(K2, days=14))
    check(row(led, 'D1')['grade']['why'] == 'no stats', '... and void at 14 days (no stats)')

    print('a file missing')
    e3 = Env(os.path.join(tmp, 'missing'))
    e3.matchups(dict([block('A1', 0.05, True)]), '2026-09-12T12:00+00:00')
    e3.run('2026-09-12T12:10:00Z')
    os.remove(os.path.join(e3.cache, 'stats_player_week_2026.csv'))
    led, out = e3.run(plus(K1, days=15))
    check(row(led, 'A1')['grade'] is None and 'graded nothing' in out and 'stats_player_week_2026.csv' in out,
          'the stats file absent: nothing graded (not even voided at 14 days), and the run says so')
    e3.stats([(G1, 'A1', 'AAA', 1, 75)])
    os.remove(os.path.join(e3.arch, 'espn_lines_2026.json'))
    led, out = e3.run(plus(K1, days=15))
    check(row(led, 'A1')['grade'] is None and 'espn_lines_2026.json' in out, 'the archive absent: the same')


# ------------------------------------------------------------------ check's refusals

def refusals(tmp):
    print('check: each refusal, and the pass')
    e = Env(os.path.join(tmp, 'check'))
    e.matchups(dict([block('A1', 0.05, True), block('B1', -0.02, False), block('C1', 0.04, True)]), '2026-09-12T12:00+00:00')
    e.run('2026-09-12T12:10:00Z')
    e.archive({G1: (True, {'A1': (80.5, 70.5), 'B1': (44.5, 45.5)})})
    e.stats([(G1, 'A1', 'AAA', 1, 75), (G1, 'B1', 'BBB', 1, 30)])
    old, _ = e.run(plus(K1, hours=72))                 # A1 and B1 graded; C1 (G2) frozen, waiting
    e.matchups(dict([block('C1', 0.04, True)]), '2026-09-15T12:00+00:00')
    new, _ = e.run(plus(K1, hours=80), hold=False)
    base = copy.deepcopy(new)
    base['run_at'] = plus(K1, hours=80)
    check(sc.problems(base, old) == [], 'a valid run passes')

    def refused(what, edit, needle):
        n = copy.deepcopy(base)
        edit(n)
        bad = sc.problems(n, old)
        check(any(needle in b for b in bad), f'refused: {what} ({bad[:2]})')

    refused('the bar edited', lambda n: n.update(bar=n['bar'].replace('30 graded', '20 graded')), 'bar differs')
    refused('the bar\'s sha256 edited', lambda n: n.update(bar_sha256='0' * 64), 'bar_sha256 differs')
    refused('the bar\'s registration edited', lambda n: n.update(bar_registered='2026-09-12T00:00:00Z'), 'bar_registered differs')
    ka, kc = f'{G1}|{P["A1"][0]}', f'{G2}|{P["C1"][0]}'
    refused('a frozen row edited (shift)', lambda n: n['calls'][kc].update(shift=0.09), 'a frozen row')
    refused('a frozen row edited (tag)', lambda n: n['calls'][ka].update(tag=False), 'a frozen row')
    refused('a frozen row removed', lambda n: n['calls'].pop(kc), 'a frozen row removed')
    refused('a grade edited', lambda n: n['calls'][ka]['grade'].update(result='under', actual=60.0), 'grade changed')
    refused('a grade taken away', lambda n: n['calls'][ka].update(grade=None), 'grade changed')

    def add_late(n):
        r = dict(n['calls'][kc])
        r.update(pid=P['D1'][0], name='Di Back', club='DDD', grade=None, written_at=n['run_at'])
        n['calls'][f'{G2}|{P["D1"][0]}'] = r
    refused('a row added for a game already kicked off', add_late, 'at or after its kickoff')

    def wrong_summary(n):
        n['summary']['2026']['tagged']['over'] += 1
    refused('a summary that does not follow from the rows', wrong_summary, 'summary does not follow')
    refused('a grade that does not follow its actual', lambda n: n['calls'][kc].update(
        grade={'result': 'over', 'close': 40.5, 'open': 40.5, 'vs_open': 'under', 'actual': 30.0, 'how': 'stat', 'at': n['run_at']}),
        'graded over on actual')
    refused('a run_at earlier than the committed one', lambda n: n.update(run_at=plus(K1, hours=1)), 'not later than')

    print('check through git: scorecard.py check --against HEAD on a scratch repo')
    repo = os.path.join(tmp, 'repo')
    os.makedirs(os.path.join(repo, 'elo', 'scorecard'))
    shutil.copy(os.path.join(HERE, 'scorecard.py'), os.path.join(repo, 'elo', 'scorecard', 'scorecard.py'))
    with open(os.path.join(repo, 'elo', 'scorecard', 'ledger.json'), 'w') as f:
        f.write(sc.dumps(old))
    git = lambda *a: subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', *a], cwd=repo, capture_output=True, text=True)
    git('init', '-q')
    git('add', '.')
    git('commit', '-qm', 'ledger')
    good, badf = os.path.join(tmp, 'good.json'), os.path.join(tmp, 'bad.json')
    with open(good, 'w') as f:
        f.write(sc.dumps(base))
    n = copy.deepcopy(base)
    n['calls'][ka]['grade']['result'] = 'under'
    with open(badf, 'w') as f:
        f.write(sc.dumps(n))
    sc_py = os.path.join(repo, 'elo', 'scorecard', 'scorecard.py')
    p1 = subprocess.run([sys.executable, sc_py, 'check', '--ledger', good, '--against', 'HEAD'], capture_output=True, text=True)
    p2 = subprocess.run([sys.executable, sc_py, 'check', '--ledger', badf, '--against', 'HEAD'], capture_output=True, text=True)
    check(p1.returncode == 0 and 'ok:' in p1.stdout, f'a valid ledger passes against git HEAD ({p1.stdout.strip()[:80]})')
    check(p2.returncode == 1 and 'REFUSED' in p2.stdout and 'grade changed' in p2.stdout, 'an edited grade is refused against git HEAD')
    p3 = subprocess.run([sys.executable, sc_py, 'run', '--ledger', good, '--out', good], capture_output=True, text=True)
    check(p3.returncode == 1 and 'never in place' in p3.stdout, 'run refuses to write the ledger in place')


# ------------------------------------------------------------------ the decision's arithmetic

def made_up(n_games, per_game, tagged_over, untagged_over, tag_share, seed=1, corr=0.0):
    """graded rows on made-up games: tagged rows go over with tagged_over, untagged with untagged_over; shift is drawn
    and the actual less the close leans with it by corr"""
    rng = random.Random(seed)
    calls = {}
    for g in range(n_games):
        gid = f'2026_{1 + g // 16:02d}_G{g:03d}'
        for j in range(per_game):
            tag = rng.random() < tag_share
            shift = round(rng.uniform(0.035, 0.09) if tag else rng.uniform(-0.08, 0.034), 4)
            over = rng.random() < (tagged_over if tag else untagged_over)
            dev = (1 if over else -1) * (rng.uniform(1, 30)) + corr * shift * 400
            if (dev > 0) != over:
                dev = (abs(dev) if over else -abs(dev))
            close = 50.5
            pid = f'00-{g:04d}{j:03d}'
            calls[f'{gid}|{pid}'] = {'season': 2026, 'week': 1 + g // 16, 'gid': gid, 'pid': pid, 'name': None, 'pos': 'RB',
                                     'club': 'X', 'kickoff': '2026-09-13T17:00:00Z', 'stat': 'rushing_yards', 'shift': shift,
                                     'tag': tag, 'proj': 1.0, 'no_elo': 1.0, 'sd': 1.0, 'published': 'x', 'written_at': 'x',
                                     'grade': {'result': 'over' if over else 'under', 'close': close, 'open': close,
                                               'vs_open': 'over' if over else 'under', 'actual': close + round(dev, 1),
                                               'how': 'stat', 'at': 'x'}}
    return calls


def d_without_s(seed=6):
    """tagged rows go over 80% of the time but only by a yard or two, untagged ones 45% by 20 to 40 yards: D is wholly
    above 0, S is not (a PASS needs both)"""
    rng = random.Random(seed)
    calls = made_up(120, 3, 0.5, 0.5, 0.35, seed=seed)
    for r in calls.values():
        over = rng.random() < (0.8 if r['tag'] else 0.45)
        dev = (0.5 if r['tag'] else 40) * (rng.uniform(1, 2) if r['tag'] else rng.uniform(0.5, 1))
        r['grade'].update(result='over' if over else 'under', actual=50.5 + round(dev if over else -dev, 1))
    return calls


def spearman_own(x, y):
    def ranks(v):
        o = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(o):
            j = i
            while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]:
                j += 1
            for k in range(i, j + 1):
                r[o[k]] = (i + j) / 2 + 1
            i = j + 1
        return r
    rx, ry = ranks(x), ranks(y)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    c = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    return c / (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5


def decision():
    import numpy as np
    print('the decision, on made-up graded rows')
    LR = {2026: '2027-01-10T18:00:00Z'}
    after = '2027-01-25T00:00:00Z'
    cases = [('UNDECIDED: fewer than 30 graded tagged rows', made_up(40, 2, 0.95, 0.2, 0.3, seed=2), 'UNDECIDED'),
             ('PASS: tagged go over, the shift leans with the result', made_up(120, 3, 0.85, 0.3, 0.35, seed=3, corr=1.0), 'PASS'),
             ('FAIL: tagged go under', made_up(120, 3, 0.15, 0.55, 0.35, seed=4), 'FAIL'),
             ('NO EDGE SHOWN: no difference', made_up(120, 3, 0.47, 0.47, 0.35, seed=5), 'NO EDGE SHOWN'),
             ('NO EDGE SHOWN: D wholly above 0, S not', d_without_s(), 'NO EDGE SHOWN')]
    for what, calls, want in cases:
        s = sc.summarize(calls, after, LR, {})['2026']
        tn = s['tagged']['n']
        check(s['state'] == 'decided' and s['verdict'] == want and s['decided_at'] == after,
              f"{what}: {s.get('verdict')} (tagged {s['tagged']['over']}/{tn}, D [{s['D']['lo']}, {s['D']['hi']}], "
              f"S [{s['S']['lo']}, {s['S']['hi']}])")
        if want == 'UNDECIDED':
            check(tn < 30, f'  ... {tn} tagged rows')
        if want == 'PASS':
            check(s['D']['lo'] > 0 and s['S']['lo'] > 0, '  ... both intervals wholly above 0')
        if want == 'FAIL':
            check(s['D']['hi'] < 0, '  ... D wholly below 0')
        if what.endswith('S not'):
            check(s['D']['lo'] > 0 and s['S']['lo'] <= 0, '  ... D wholly above 0 and S\'s interval reaching 0')
    calls = cases[1][1]
    s = sc.summarize(calls, '2027-01-09T00:00:00Z', LR, {})['2026']
    check(s['state'] == 'running' and 'verdict' not in s, 'before the season\'s last regular-season kickoff: running, no verdict')
    c2 = copy.deepcopy(calls)
    next(iter(c2.values()))['grade'] = None
    s = sc.summarize(c2, after, LR, {})['2026']
    check(s['state'] == 'running' and 'verdict' not in s and s['open'] == 1, 'a row not graded yet: running, no verdict')
    s = sc.summarize(calls, after, {2026: None}, {})['2026']
    check(s['state'] == 'running', 'no last regular-season kickoff known: running')
    prev = sc.summarize(calls, after, LR, {})
    later = sc.summarize(calls, '2027-02-20T00:00:00Z', LR, prev)['2026']
    check(later['decided_at'] == after and later['verdict'] == 'PASS', 'decided once: the decision keeps its time on later runs')
    # determinism: twice, and in another order
    a = sc.summarize(calls, after, LR, {})
    rev = dict(reversed(list(calls.items())))
    b = sc.summarize(rev, after, LR, {})
    check(a == b == json.loads(json.dumps(a)), 'the bootstrap is deterministic, whatever the rows\' order, and survives JSON')
    D, S = sc.season_numbers(sorted([r for r in calls.values()], key=lambda r: (r['gid'], r['pid'])))
    check(D['resamples'] == 10000 and S['resamples'] == 10000, '10,000 resamples of games')
    # Spearman: the estimate is average-rank Spearman, and a resample's weights are its expanded sample
    rows = sorted(calls.values(), key=lambda r: (r['gid'], r['pid']))
    x = [r['shift'] for r in rows]
    y = [r['grade']['actual'] - r['grade']['close'] for r in rows]
    check(abs(S['est'] - round(spearman_own(x, y), 4)) < 1e-9, f"S's estimate is Spearman with average ranks ({S['est']})")
    rng = random.Random(9)
    xs = [round(rng.choice([0.01, 0.02, 0.03, 0.05]), 2) for _ in range(30)]
    ys = [rng.choice([-3.0, 1.0, 2.0, 7.0]) for _ in range(30)]
    ok = True
    for _ in range(20):
        w = [rng.choice([0, 1, 1, 2, 3]) for _ in range(30)]
        ex = list(itertools.chain.from_iterable([xi] * wi for xi, wi in zip(xs, w)))
        ey = list(itertools.chain.from_iterable([yi] * wi for yi, wi in zip(ys, w)))
        got = sc.spearman_w(np.array(xs), np.array(ys), np.array([w], float))[0]
        ok &= abs(got - spearman_own(ex, ey)) < 1e-9
    check(ok, 'a resample\'s weighted Spearman equals Spearman on its expanded sample (ties throughout)')
    # the intervals, rebuilt from the bar's own stream on a small case: one draw of 10,000 x games from default_rng(2026),
    # the games in id order, each resample's expanded sample worked row by row here
    small = made_up(7, 2, 0.6, 0.4, 0.45, seed=11, corr=0.5)
    rows = sorted(small.values(), key=lambda r: (r['gid'], r['pid']))
    gids = sorted({r['gid'] for r in rows})
    draw = np.random.default_rng(2026).integers(0, len(gids), size=(10000, len(gids)))
    ds, ss = [], []
    for res in draw:
        ex = [r for g in res for r in rows if r['gid'] == gids[g]]
        t = [r['grade']['result'] == 'over' for r in ex if r['tag']]
        u = [r['grade']['result'] == 'over' for r in ex if not r['tag']]
        if t and u:
            ds.append(sum(t) / len(t) - sum(u) / len(u))
        xs_, ys_ = [r['shift'] for r in ex], [r['grade']['actual'] - r['grade']['close'] for r in ex]
        if len(set(xs_)) > 1 and len(set(ys_)) > 1:
            ss.append(spearman_own(xs_, ys_))
    own = [round(float(v), 4) for v in (*np.quantile(ds, [0.05, 0.95]), *np.quantile(ss, [0.05, 0.95]))]
    D, S = sc.season_numbers(rows)
    check([D['lo'], D['hi'], S['lo'], S['hi']] == own and D['resamples'] == len(ds) and S['resamples'] == len(ss),
          f"D's and S's intervals are the bar's: default_rng(2026), 10,000 resamples of games ({own}, {len(ds)} with a D)")
    xd = np.array([1.0, 0, 1, 0, 1]), np.array([True, True, False, False, True])
    w = np.array([[2, 1, 1, 3, 0]], float)
    check(abs(sc.d_w(xd[0], xd[1], w)[0] - (2 / 3 - 1 / 4)) < 1e-12, "a resample's D is the weighted over-rates' difference")


def pinned():
    print('the bar, pinned')
    check(hashlib.sha256(sc.BAR.encode('utf-8')).hexdigest() == BAR_PIN == sc.BAR_SHA256, 'scorecard.BAR is the pinned bar')
    led = sc.read_json(sc.LEDGER)
    check(led.get('bar') == sc.BAR and led.get('bar_sha256') == BAR_PIN, 'the committed ledger carries the pinned bar')
    readme = open(os.path.join(HERE, 'README.md'), encoding='utf-8').read()
    check(sc.BAR in readme, 'README.md carries the bar word for word')


def main():
    tmp = tempfile.mkdtemp(prefix='scorecard_')
    try:
        freeze_rules(tmp)
        move_rules(tmp)
        grade_rules(tmp)
        refusals(tmp)
        decision()
        pinned()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f'{len(fails)} failures')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
