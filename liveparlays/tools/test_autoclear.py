"""The test of autoclear.py: which parlays clear, on which day, and that nothing else in the file moves.

    python liveparlays/tools/test_autoclear.py      # ends "N checks, 0 failures"; exit 1 otherwise

Made-up games and parlays in a scratch folder: a parlay clears two Eastern days after its last game
and not one day before, never with a game still to finish or one games.csv does not list, never twice;
the file is untouched when nothing clears and otherwise changes only in the cleared parlays and
"updated"; and the real liveparlays/parlays.json is in the style the script writes, so its first clear
is a small diff, not a rewrite.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SCRIPT = os.path.join(HERE, 'autoclear.py')
sys.path.insert(0, HERE)
import autoclear  # noqa: E402

fails = []
n = 0


def chk(ok, msg):
    global n
    n += 1
    if not ok:
        fails.append(msg)


GAMES = """game_id,season,game_type,week,gameday,weekday,gametime,away_team,away_score,home_team,home_score
2026_05_AAA_BBB,2026,REG,5,2026-10-11,Sunday,13:00,AAA,17,BBB,20
2026_05_CCC_DDD,2026,REG,5,2026-10-11,Sunday,20:20,CCC,24,DDD,10
2026_05_EEE_FFF,2026,REG,5,2026-10-11,Sunday,16:25,EEE,,FFF,
2026_05_GGG_HHH,2026,REG,5,2026-10-12,Monday,20:15,GGG,31,HHH,30
"""
DOC = {
    'how': 'made up ’ for the test',
    'updated': '2026-10-11T15:57:29Z',
    'games': ['2026_05_AAA_BBB', '2026_05_CCC_DDD', '2026_05_EEE_FFF', '2026_05_GGG_HHH', '2026_05_ZZZ_YYY'],
    'parlays': [
        {'id': 'sunday', 'week': 5, 'stake': 1, 'legs': [{'game': 0, 'player': 'A', 'team': 'AAA', 'stat': 'ml', 'line': 0, 'side': 'over', 'main': False},
                                                         {'game': 1, 'player': 'B', 'team': 'CCC', 'stat': 'total', 'line': 44.5, 'side': 'over', 'main': True}]},
        {'id': 'unfinished', 'week': 5, 'stake': 1, 'legs': [{'game': 0}, {'game': 2}]},
        {'id': 'monday', 'week': 5, 'stake': 1, 'legs': [{'game': 1}, {'game': 3}]},
        {'id': 'old', 'week': 2, 'stake': 1, 'cleared': True, 'legs': [{'game': 0}]},
        {'id': 'badindex', 'week': 5, 'stake': 1, 'legs': [{'game': 0}, {'game': 9}]},
        {'id': 'unlisted', 'week': 5, 'stake': 1, 'legs': [{'game': 4}]},
        {'id': 'nolegs', 'week': 5, 'stake': 1, 'legs': []},
    ],
}


def run(today, doc=DOC):
    d = tempfile.mkdtemp(prefix='autoclear_')
    g, f = os.path.join(d, 'games.csv'), os.path.join(d, 'parlays.json')
    with open(g, 'w', encoding='utf-8') as x:
        x.write(GAMES)
    before = autoclear.dumps(doc)
    with open(f, 'w', encoding='utf-8') as x:
        x.write(before)
    r = subprocess.run([sys.executable, SCRIPT, '--games', g, '--file', f, '--today', today], capture_output=True, text=True)
    with open(f, encoding='utf-8') as x:
        after = x.read()
    return r, before, after


def cleared(text):
    return [p['id'] for p in json.loads(text)['parlays'] if p.get('cleared') is True]


# game day and the next day: nothing clears, and the file is not touched at all
for day in ('2026-10-11', '2026-10-12'):
    r, b, a = run(day)
    chk(r.returncode == 0 and a == b and 'nothing to clear' in r.stdout, f'{day}: the file moved, or the run failed, with nothing due to clear: {r.stdout}{r.stderr}')

# two days after Sunday: the Sunday parlay clears; Monday night's waits a day more
r, b, a = run('2026-10-13')
chk(r.returncode == 0 and cleared(a) == ['sunday', 'old'], f'on Tuesday the cleared parlays are {cleared(a)}, not the Sunday one (and the old one already cleared)')
doc = json.loads(a)
sun = next(p for p in doc['parlays'] if p['id'] == 'sunday')
chk(sun.get('cleared_on') == '2026-10-13' and sun.get('cleared_by') == 'auto', f'the cleared parlay does not say when and how: {sun}')
old = next(p for p in doc['parlays'] if p['id'] == 'old')
chk('cleared_on' not in old and 'cleared_by' not in old, 'a parlay cleared by hand was marked again')
chk(doc['updated'] != DOC['updated'], 'the file\'s updated stamp did not move when a parlay cleared')
# nothing but the cleared parlay and the stamp changed
base = json.loads(b)
for k in ('how', 'games'):
    chk(doc[k] == base[k], f'"{k}" changed')
for p0, p1 in zip(base['parlays'], doc['parlays']):
    if p0['id'] == 'sunday':
        chk({k: v for k, v in p1.items() if k not in ('cleared', 'cleared_on', 'cleared_by')} == p0, 'the cleared parlay changed beyond its clear')
    else:
        chk(p1 == p0, f'{p0["id"]} changed though it was not cleared')
chk(a == autoclear.dumps(doc), 'the file was not written in its own style')

# three days after Sunday (two after Monday night): Monday's clears too; the rest never do
r, b, a = run('2026-10-14')
chk(sorted(cleared(a)) == ['monday', 'old', 'sunday'], f'on Wednesday the cleared parlays are {cleared(a)}')
for keep in ('unfinished', 'badindex', 'unlisted', 'nolegs'):
    chk(keep not in cleared(a), f'{keep} was cleared')

# run again on the cleared file: nothing more, and the file is left alone
d = json.loads(a)
r2, b2, a2 = run('2026-10-20', d)
chk(cleared(a2) == cleared(a) and a2 == b2, 'a second run on an already cleared file changed it')

# the real file is in the style the script writes, so a clear is a small diff
real = os.path.join(ROOT, 'liveparlays', 'parlays.json')
with open(real, encoding='utf-8') as x:
    text = x.read()
chk(autoclear.dumps(json.loads(text)) == text, 'liveparlays/parlays.json is not in the style autoclear.py writes: its first clear would rewrite the whole file')

print(f'{n} checks, {len(fails)} failures')
for m in fails:
    print('  FAIL:', m)
sys.exit(1 if fails else 0)
