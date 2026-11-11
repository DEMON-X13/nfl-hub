#!/usr/bin/env python3
"""add.py's test, on a made-up week of its own, so it holds in any week and the off-season."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import add

PAY = {'week': 3,
       'sched': [{'id': '2026_03_WAS_NYG', 'w': 3, 'a': 'WAS', 'h': 'NYG'},
                 {'id': '2026_03_KC_ATL', 'w': 3, 'a': 'KC', 'h': 'ATL'}],
       'players': [{'id': '1', 'n': 'Jayden Daniels', 't': 'WAS'},
                   {'id': '2', 'n': 'Patrick Mahomes', 't': 'KC'},
                   {'id': '3', 'n': 'Marvin Harrison Jr.', 't': 'ATL'},
                   {'id': '4', 'n': 'Josh Allen', 't': 'BUF'}],
       'roster': {'5': ['WAS', 'RES', 'Terry McLaurin', 3], '6': ['NYG', 'ACT', 'Malik Nabers', 3],
                  '1': ['WAS', 'ACT', 'Jayden Daniels', 3]}}
fails = 0
def ok(c, what):
    global fails
    if not c:
        fails += 1
        print('FAIL', what)

def run(text, data=None):
    data = data or {'games': ['2026_03_KC_ATL'], 'parlays': [{'id': 'w3-dk-washnyg-2'}]}
    new = add.parse(text, add.World(PAY), data)
    add.merge(data, new)
    return data, new

def refused(text, bit):
    try:
        run(text)
    except add.Bad as e:
        ok(bit in str(e), f'refusal of {text!r} says {bit!r}: {e}')
        return
    ok(False, f'{text!r} refused')

d, new = run('$5 +650 note same game · boost\nJayden Daniels o224.5 pass yds\nMalik Nabers 60+ rec yds\n'
             'Jayden Daniels td\nWAS@NYG u44.5\n\n$1 +1300 pays 14 w3 id mine\nKC ml\nATL +3.5\n'
             'Marvin Harrison 2+ td\nPatrick Mahomes u1.5 pass td\nKC o47.5 total')
a, b = new
ok(a['id'] == 'w3-dk-wasnyg-4' and a['payout'] == 37.5 and a['note'] == 'same game · boost', f'head {a}')
ok(d['games'] == ['2026_03_KC_ATL', '2026_03_WAS_NYG'], f"games {d['games']}")
L = a['legs']
ok(L[0] == {'game': 1, 'player': 'Jayden Daniels', 'team': 'WAS', 'stat': 'passing_yards', 'line': 224.5,
            'side': 'over', 'main': True}, f'main line {L[0]}')
ok(L[1]['player'] == 'Malik Nabers' and L[1]['line'] == 60 and L[1]['main'] is False, f'threshold {L[1]}')
ok(L[2]['stat'] == 'any_td' and L[2]['line'] == 1 and not L[2]['main'], f'td {L[2]}')
ok(L[3] == {'game': 1, 'player': 'Commanders at Giants', 'team': 'NYG', 'stat': 'total', 'line': 44.5,
            'side': 'under', 'main': True}, f'total {L[3]}')
ok(b['id'] == 'mine' and b['payout'] == 14 and b['week'] == 3, f'head 2 {b}')
B = b['legs']
ok(B[0]['stat'] == 'ml' and B[0]['player'] == 'Chiefs' and B[0]['line'] == 0 and B[0]['game'] == 0, f'ml {B[0]}')
ok(B[1]['stat'] == 'ats' and B[1]['team'] == 'ATL' and B[1]['line'] == 3.5, f'ats {B[1]}')
ok(B[2]['player'] == 'Marvin Harrison Jr.' and B[2]['line'] == 2, f'2+ td on a suffix {B[2]}')
ok(B[4]['stat'] == 'total' and B[4]['team'] == 'ATL', f'total by one club {B[4]}')
_, n2 = run('$2 -110\nJayden Daniels o0.5 int')
ok(n2[0]['payout'] == 3.82, f"payout at -110 {n2[0]['payout']}")
refused('$5 +200\nTerry McLaurin 60+ rec yds', 'reserve')
refused('$5 +200\nJaden Danels o224.5 pass yds', 'Jayden Daniels')
refused('$5 +200\nJosh Allen td', 'no player')          # his club has no game this week
refused('$5 +200\nJayden Daniels o224 pass yds', 'half point')
refused('$5 +200\nJayden Daniels o224.5 punts', 'unknown stat')
refused('Jayden Daniels o224.5 pass yds', 'stake and price')
refused('$5 +200 id w3-dk-washnyg-2\nKC ml', 'already')
refused('$5 +200\nKC ml\nKC ml', 'twice')
print(f'test_add: {"0 failures" if not fails else f"{fails} failures"}')
sys.exit(1 if fails else 0)
