"""The props job's runs held to the Suggested Parlays locks they must land before, offline (replaces
test_pull_schedule.py, retired with the paid pull on 20 October 2026).

The suggestions record (suggest_ledger.js) takes each set from the last run of the props job before its lock: each
Thursday, Sunday and Monday night game's set locks 2 hours before its kickoff, and each week's Sunday slot (every
Sunday game before 7 pm Eastern) 2 hours before its first kickoff. Since the job reads DraftKings' lines from ESPN on
every run, the set the record grades is made from the lines that run read, and no visitor's press counts. GitHub
starts this repo's scheduled runs 2 to 9.4 hours late (October 2026), so a run is sure to land before a lock only
when it starts 9.4 hours before it, and may land as early as 2 hours after its slot. Before 20 October 2026 the
Sunday slot's 1 pm lock had no run sure to land on Sunday morning: Saturday 23:07 UTC was the last, its read up to
15 hours old at the lock. The Sunday 04:47 UTC cron (lands 06:47-14:11 UTC) is for it.

For every set's lock of the season's schedule (props/raw/games.csv where a run downloaded it, else the published
payload's schedule; and the same season with week 18 flexed to three Saturday games and a Sunday night game, as the
league sets it late in December), worked out on the schedule's own Eastern date and time (weekly.kickoff), this
holds props.yml's crons to:

  (a) some run is sure to land before the lock: a cron slot s with s + 9.4 h at or before it
  (b) the latest such run reads no more than 12 hours before the lock, even landing at its earliest (s + 2 h): a set
      is never taken from lines half a day older than its lock
  (c) with that run dropped (GitHub drops a scheduled run now and then), the one before it is still sure to land
      before the lock and reads no more than 24 hours before it
  and that no cron is on the hour (:00 is the minute most likely to be dropped). It prints the worst gap of each
  kind of lock.

    python3 props/build/test_lock_runs.py                        must end "0 failures"
    python3 props/build/test_lock_runs.py --drop "47 4 * * 0"    as if props.yml had no such cron (it fails (b))
    python3 props/build/test_lock_runs.py --games FILE           on a games.csv instead
"""
import argparse, csv, datetime, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); PKG = os.path.dirname(HERE); ROOT = os.path.dirname(PKG)
sys.path.insert(0, HERE)
import weekly

UTC = datetime.timezone.utc
H = datetime.timedelta(hours=1)
WORKFLOW = os.path.join(ROOT, '.github', 'workflows', 'props.yml')
EARLIEST, LATEST = 2.0, 9.4      # hours late GitHub has started this repo's scheduled runs
FRESH, FRESH_DROPPED = 12.0, 24.0
LOCK = 2 * H                     # SP_LOCK_MS in part3.js, LOCK_MS in suggest_ledger.js

checks = 0; fails = []
def check(ok, what):
    global checks
    checks += 1
    if not ok: fails.append(what)
    return ok

def read_crons(path, drop=()):
    """[(cron string, minute, hour, cron weekday or None for every day)] from the workflow's schedule"""
    out = []
    for c in re.findall(r'^\s*-\s*cron:\s*"([^"]+)"', open(path, encoding='utf-8').read(), re.M):
        if c in drop: continue
        m, h, dom, mon, dow = c.split()
        assert dom == '*' and mon == '*', f'{c}: only weekday crons are read here'
        for d in ([None] if dow == '*' else [int(x) % 7 for x in dow.split(',')]):
            out.append((c, int(m), int(h), d))
    return out

def slots(crons, lock, days=4):
    """every cron slot from `days` days before the lock up to it, oldest first"""
    out = []
    for back in range(days + 1):
        day = (lock - datetime.timedelta(days=back)).date()
        for c, m, h, dow in crons:
            if dow is None or dow == (day.weekday() + 1) % 7:           # cron's Sunday is 0
                t = datetime.datetime(day.year, day.month, day.day, h, m, tzinfo=UTC)
                if t <= lock: out.append((t, c))
    return sorted(out)

def load_schedule(games=None):
    """[{id, w, d, t}] of the season's regular season: a games.csv given, else the one a run downloaded into
    props/raw, else the published payload's schedule"""
    path = games or os.path.join(PKG, 'raw', 'games.csv')
    if os.path.exists(path):
        rows = [r for r in csv.DictReader(open(path, encoding='utf-8')) if r['season'] == str(weekly.SEASON) and r['game_type'] == 'REG']
        if rows: return [{'id': r['game_id'], 'w': int(r['week']), 'd': r['gameday'], 't': r['gametime']} for r in rows], os.path.relpath(path, ROOT)
    pay = json.load(open(os.path.join(PKG, 'data', 'payload.json'), encoding='utf-8'))
    return [{k: g[k] for k in ('id', 'w', 'd', 't')} for g in pay['sched']], 'props/data/payload.json'

def flexed_week18(sched):
    """the season with week 18 as the league sets it late in December: three Saturday games and a Sunday night game"""
    w18 = sorted((g for g in sched if g['w'] == 18), key=lambda g: g['id'])
    if len(w18) < 6: return None
    sun = w18[0]['d']; sat = (datetime.date.fromisoformat(sun) - datetime.timedelta(days=1)).isoformat()
    moved = {w18[0]['id']: (sat, '13:00'), w18[1]['id']: (sat, '16:30'), w18[2]['id']: (sat, '20:00'),
             w18[3]['id']: (sun, '16:25'), w18[4]['id']: (sun, '16:25'), w18[5]['id']: (sun, '20:20')}
    return [dict(g, d=moved[g['id']][0], t=moved[g['id']][1]) if g['id'] in moved else dict(g) for g in sched]

def units(sched):
    """[(kind, id, lock)]: each Thursday, Sunday and Monday game at or after 7 pm Eastern (spPrime, on the schedule's
    own Eastern date and time), and each week's Sunday slot (every Sunday game before 7 pm Eastern, locked 2 hours
    before the first)"""
    out = []; sundays = {}
    for g in sched:
        wd = datetime.date.fromisoformat(g['d']).weekday(); t = g['t'] or '13:00'
        if wd in (3, 6, 0) and t >= '19:00':
            out.append(({3: 'Thursday night', 6: 'Sunday night', 0: 'Monday night'}[wd], g['id'], weekly.kickoff(g) - LOCK))
        elif wd == 6:
            sundays.setdefault(g['w'], []).append(g)
    for w, gs in sorted(sundays.items()):
        first = min(gs, key=lambda g: weekly.kickoff(g))
        out.append(('Sunday slot' + (', abroad' if (first['t'] or '13:00') < '13:00' else ''), f'week {w} slot', weekly.kickoff(first) - LOCK))
    return out

def hold(label, sched, crons, worst):
    for kind, uid, lock in units(sched):
        sure = [(s, c) for s, c in slots(crons, lock) if s + LATEST * H <= lock]
        if not check(bool(sure), f'{label}: {uid} ({kind}, lock {lock:%a %d %b %H:%M} UTC): no run is sure to land before it'): continue
        s, c = sure[-1]; age = (lock - (s + EARLIEST * H)).total_seconds() / 3600
        check(age <= FRESH, f'{label}: {uid} ({kind}, lock {lock:%a %d %b %H:%M} UTC): the latest run sure to land before it, "{c}" at '
              f'{s:%a %H:%M} UTC, reads up to {age:.1f}h before the lock, more than {FRESH:g}h')
        s2, c2 = sure[-2] if len(sure) > 1 else (None, None)
        age2 = (lock - (s2 + EARLIEST * H)).total_seconds() / 3600 if s2 else None
        check(s2 is not None and age2 <= FRESH_DROPPED, f'{label}: {uid} ({kind}): with "{c}" dropped, the run before it '
              + (f'"{c2}" at {s2:%a %H:%M} UTC reads up to {age2:.1f}h before the lock, more than {FRESH_DROPPED:g}h' if s2 else 'does not exist'))
        w = worst.setdefault(kind, [0, '', 0, 0])
        w[3] += 1
        if age > w[0]: w[0], w[1] = age, f'{uid}, lock {lock:%a %d %b %H:%M} UTC, the {s:%a %H:%M} run'
        if age2 is not None: w[2] = max(w[2], age2)

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--games'); ap.add_argument('--workflow', default=WORKFLOW)
    ap.add_argument('--drop', action='append', default=[], help='hold the schedule as if props.yml had no such cron')
    a = ap.parse_args()
    crons = read_crons(a.workflow, a.drop)
    check(bool(crons), 'props.yml has no cron')
    check(all(m != 0 for c, m, h, d in crons), f"a cron on the hour: {[c for c, m, h, d in crons if m == 0]}")
    sched, src = load_schedule(a.games)
    print(f'the {weekly.SEASON} regular season from {src} ({len(sched)} games), {len({c for c, *_ in crons})} crons'
          + (f', without {", ".join(a.drop)}' if a.drop else '') + f'; runs land {EARLIEST:g} to {LATEST:g}h after their slot')
    worst = {}
    hold('the season', sched, crons, worst)
    fl = flexed_week18(sched)
    if fl: hold('the season with week 18 flexed', fl, crons, worst)
    kinds = set(worst)
    check({'Thursday night', 'Sunday night', 'Monday night', 'Sunday slot'} <= kinds, f'a kind of lock missing from the season: {sorted(kinds)}')
    for k, (age, at, age2, n) in sorted(worst.items()):
        print(f'  {k:22} {n:3} locks: the latest sure run reads up to {age:4.1f}h before the lock at worst ({at}); one dropped, {age2:4.1f}h')
    print(f'{checks} checks, {len(fails)} failures')
    for f in fails[:20]: print('  FAIL ' + f)
    if len(fails) > 20: print(f'  ... and {len(fails) - 20} more')
    return 1 if fails else 0

if __name__ == '__main__': sys.exit(main())
