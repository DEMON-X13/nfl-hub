"""Saturday's pull moves to the evening, so Sunday is priced closer to kickoff.

The Sunday slate was priced Saturday at 10am Eastern, a median 28 hours before
kickoff. At 6pm Eastern that becomes 20 hours, after Saturday's practice reports
and late scratches. Replayed over the season it costs the same 1,904 credits, and
still prices every game exactly once.

That means pull times are no longer all the same hour, so the window function
needs a time per day rather than one constant. It also has to consider a pull
later the same day: a manual run on a Saturday morning must look ahead to that
evening's pull, not skip past it to Monday and buy the whole Sunday slate twice.
"""
from pathlib import Path

HERE = Path(__file__).parent
W = HERE / 'weekly.py'
Y = HERE.parent.parent / '.github' / 'workflows' / 'props.yml'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(W, '''PULL_DAYS={0,2,3,5}          # Mon, Wed, Thu, Sat: the crons in .github/workflows/props.yml
PULL_HOUR_UTC=14

def hours_to_next_pull(now=None):
    """How far ahead to price: up to the next scheduled pull, plus an hour of slack
    for a late runner. Every game is then priced by the last pull before it kicks
    off, with no special case for a holiday or a Wednesday night game."""
    now=now or datetime.datetime.now(datetime.timezone.utc)
    t=now
    for _ in range(9):
        t=(t+datetime.timedelta(days=1)).replace(hour=PULL_HOUR_UTC,minute=0,second=0,microsecond=0)
        if t.weekday() in PULL_DAYS:
            return (t-now).total_seconds()/3600+1
    return 120.0''',
     '''# weekday -> hour UTC, matching the crons in .github/workflows/props.yml.
# Saturday runs in the evening so the Sunday slate is priced closer to kickoff.
PULL_TIMES={0:14, 2:14, 3:14, 5:22}      # Mon, Wed, Thu 14:00; Sat 22:00

def hours_to_next_pull(now=None):
    """How far ahead to price: up to the next scheduled pull, plus an hour of slack
    for a late runner. Every game is then priced by the last pull before it kicks
    off, with no special case for a holiday or a Wednesday night game.

    Today counts: a manual Saturday morning run must see that evening's pull rather
    than skip to Monday and buy the Sunday slate the evening run would buy anyway.
    A pull less than half an hour away is treated as already happening."""
    now=now or datetime.datetime.now(datetime.timezone.utc)
    for d in range(9):
        t=now+datetime.timedelta(days=d)
        h=PULL_TIMES.get(t.weekday())
        if h is None: continue
        nxt=t.replace(hour=h,minute=0,second=0,microsecond=0)
        if (nxt-now).total_seconds()>1800:
            return (nxt-now).total_seconds()/3600+1
    return 120.0''')

y = Y.read_text(encoding='utf-8')
old = '''    # 14:00 UTC, four days a week. Each run prices only the games that kick off
    # before the next run, so every game is priced by the last pull before it
    # starts and none is priced twice. About 7 credits a game, ~112 a week.
    - cron: "0 14 * * 1"    # Monday: Monday night
    - cron: "0 14 * * 3"    # Wednesday: holiday games, nothing in an ordinary week
    - cron: "0 14 * * 4"    # Thursday: Thursday night, and a Friday game if there is one
    - cron: "0 14 * * 6"    # Saturday: the Sunday slate'''
new = '''    # Four runs a week. Each prices only the games that kick off before the next
    # run, so every game is priced by the last pull before it starts and none is
    # priced twice. About 7 credits a game, ~112 a week. Times must match
    # PULL_TIMES in props/build/weekly.py.
    - cron: "0 14 * * 1"    # Monday 10am ET: Monday night
    - cron: "0 14 * * 3"    # Wednesday 10am ET: holiday games, nothing in an ordinary week
    - cron: "0 14 * * 4"    # Thursday 10am ET: Thursday night, and a Friday game if there is one
    - cron: "0 22 * * 6"    # Saturday 6pm ET: the Sunday slate, priced ~20h out'''
assert y.count(old) == 1, 'props.yml schedule block not as expected'
Y.write_text(y.replace(old, new), encoding='utf-8', newline='\n')

print('Saturday pull moves to 22:00 UTC; the window function reads a time per day')
