"""Pulls move overnight, and off the top of the hour.

Measured against this repo's own history, GitHub's scheduler runs 2 to 4.5 hours
behind: Update sites was due Tuesday 11:00 UTC and started 15:23, due 17:00 and
started 19:55. The prop model's Thursday slot had about 10 hours of cushion before
kickoff and Thanksgiving's early game had 4, which is inside the delay we have
already seen. That game would probably have gone unpriced.

Mon/Wed/Thu move to 08:17 UTC and Saturday to 23:17. Overnight for a US owner, a
quieter window for the scheduler, and :17 avoids the most contended minute on the
platform. Replayed over the season: same 1,904 credits, every game priced once,
Thanksgiving's cushion goes from 4.0h to 9.7h and both night games from 10.2h to
about 16h.

One game gets tighter rather than looser: Week 15 has the season's only two
Saturday games, and Chicago at Buffalo kicks off 01:20 UTC with the Saturday pull
at 23:17, a 2 hour cushion. Moving Saturday earlier only shifts the problem onto
the other Saturday game, so that week is worth a manual run rather than a schedule
contorted around two games in December.
"""
from pathlib import Path

HERE = Path(__file__).parent
W = HERE / 'weekly.py'
Y = HERE.parent.parent / '.github' / 'workflows' / 'props.yml'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(W, '''# weekday -> hour UTC, matching the crons in .github/workflows/props.yml.
# Saturday runs in the evening so the Sunday slate is priced closer to kickoff.
PULL_TIMES={0:14, 2:14, 3:14, 5:22}      # Mon, Wed, Thu 14:00; Sat 22:00''',
     '''# weekday -> (hour, minute) UTC, matching the crons in .github/workflows/props.yml.
# Overnight, because GitHub's scheduler runs 2-4.5 hours late for this repo and the
# cushion before kickoff has to absorb that. Never on the hour: :00 is the most
# contended minute on the platform and the likeliest to be dropped.
PULL_TIMES={0:(8,17), 2:(8,17), 3:(8,17), 5:(23,17)}   # Mon, Wed, Thu 08:17; Sat 23:17''')

sub1(W, '''    now=now or datetime.datetime.now(datetime.timezone.utc)
    for d in range(9):
        t=now+datetime.timedelta(days=d)
        h=PULL_TIMES.get(t.weekday())
        if h is None: continue
        nxt=t.replace(hour=h,minute=0,second=0,microsecond=0)
        if (nxt-now).total_seconds()>1800:
            return (nxt-now).total_seconds()/3600+1
    return 120.0''',
     '''    now=now or datetime.datetime.now(datetime.timezone.utc)
    for d in range(9):
        t=now+datetime.timedelta(days=d)
        hm=PULL_TIMES.get(t.weekday())
        if hm is None: continue
        nxt=t.replace(hour=hm[0],minute=hm[1],second=0,microsecond=0)
        if (nxt-now).total_seconds()>1800:
            return (nxt-now).total_seconds()/3600+1
    return 120.0''')

y = Y.read_text(encoding='utf-8')
old = '''    - cron: "0 14 * * 1"    # Monday 10am ET: Monday night
    - cron: "0 14 * * 3"    # Wednesday 10am ET: holiday games, nothing in an ordinary week
    - cron: "0 14 * * 4"    # Thursday 10am ET: Thursday night, and a Friday game if there is one
    - cron: "0 22 * * 6"    # Saturday 6pm ET: the Sunday slate, priced ~20h out'''
new = '''    # Overnight, and never on the hour: this repo's scheduled runs land 2-4.5 hours
    # late, so the cushion before kickoff has to absorb that, and :00 is the minute
    # most likely to be dropped under load.
    - cron: "17 8 * * 1"    # Monday 04:17 ET: Monday night, ~16h of cushion
    - cron: "17 8 * * 3"    # Wednesday 04:17 ET: holiday games, nothing in an ordinary week
    - cron: "17 8 * * 4"    # Thursday 04:17 ET: Thursday night, and Thanksgiving's early game
    - cron: "17 23 * * 6"   # Saturday 19:17 ET: the Sunday slate, priced ~18h out'''
assert y.count(old) == 1, 'props.yml crons not as expected'
Y.write_text(y.replace(old, new), encoding='utf-8', newline='\n')

print('pulls move to 08:17 / 23:17 UTC')
