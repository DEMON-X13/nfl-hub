"""Price every game by the last pull before it kicks off, whatever day that is.

The window was a weekday guess: 36 hours on a Thursday, 120 otherwise. That worked
for an ordinary week and quietly failed elsewhere. Two games this season kick off
on a Wednesday night, and the Thursday pull runs after they have started, so they
were never priced at all -- Week 1's New England at Seattle, and Week 12's Green
Bay at the Rams on 25 November. Monday night was priced on Saturday morning, about
58 hours before kickoff, on lines that had two days left to move.

The window is now derived from the schedule instead of the calendar: price every
game in the current week that kicks off before the *next* scheduled pull, and no
more. That needs no holiday special cases. A Wednesday kickoff is covered by the
Wednesday pull, a Black Friday game by the Thursday pull, Monday night by the
Monday pull, because in each case that is the last pull before it starts.

Pulls move to Mon/Wed/Thu/Sat at 14:00 UTC. Simulated over the whole 272-game
season: every game priced, none priced twice, 1,904 credits against 1,890 today.
The extra 14 is the two Wednesday games that used to be missed. Wednesday costs
nothing in an ordinary week, because no game kicks off before Thursday's pull.
"""
from pathlib import Path

HERE = Path(__file__).parent
W = HERE / 'weekly.py'
Y = HERE.parent.parent / '.github' / 'workflows' / 'props.yml'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(W, """def problems_file():""",
     '''PULL_DAYS={0,2,3,5}          # Mon, Wed, Thu, Sat: the crons in .github/workflows/props.yml
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
    return 120.0

def problems_file():''')

sub1(W, """        hours=a.hours or (36 if today.weekday()==3 else 120)
        rc,out=run([PY,'oddsfetch.py','--week',str(week),'--hours',str(hours)],DATA,'oddsfetch')""",
     """        hours=a.hours or hours_to_next_pull()
        say(f"  pricing week {week} games kicking off within {hours:.0f}h, which reaches the next scheduled pull")
        rc,out=run([PY,'oddsfetch.py','--week',str(week),'--hours',f'{hours:.1f}'],DATA,'oddsfetch')""")

y = Y.read_text(encoding='utf-8')
old = '''  schedule:
    # Two pulls a week, 10am Eastern (14:00 UTC in season). The price pull spends
    # odds-API credits (about 7 a game): Thursday covers the Thursday night game,
    # Saturday covers the rest of the slate. Nothing else on this schedule.
    - cron: "0 14 * * 4"    # Thursday
    - cron: "0 14 * * 6"    # Saturday'''
new = '''  schedule:
    # 14:00 UTC, four days a week. Each run prices only the games that kick off
    # before the next run, so every game is priced by the last pull before it
    # starts and none is priced twice. About 7 credits a game, ~112 a week.
    - cron: "0 14 * * 1"    # Monday: Monday night
    - cron: "0 14 * * 3"    # Wednesday: holiday games, nothing in an ordinary week
    - cron: "0 14 * * 4"    # Thursday: Thursday night, and a Friday game if there is one
    - cron: "0 14 * * 6"    # Saturday: the Sunday slate'''
assert y.count(old) == 1, 'props.yml schedule block not as expected'
Y.write_text(y.replace(old, new), encoding='utf-8', newline='\n')

print('weekly.py prices to the next pull; props.yml runs Mon/Wed/Thu/Sat')
