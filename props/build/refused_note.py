"""The body of the props-refused issue: what a refused props run held back, for whoever fixes it.

On 15 October 2026 a props run bought the week's prices at 13:27 UTC and the audit refused them; they
were published at 19:02, once someone had noticed the red run, merged a fix and run the job again. The
failure email went to an inbox, and nothing said which games were waiting or how long was left before
they kicked off. props.yml now opens an issue (labelled props-refused) when weekly.py refuses a run, or
comments on the one already open, with this as its text, and closes it on the next clean publish:

  - the problems file weekly.py wrote (its first 3000 characters): why the run was refused
  - the games whose player prices were bought since the payload on the site was baked and are held
    (priced_at.json, which the workflow keeps, against the published payload's baked_at and schedule),
    each with its kickoff in ET and the hours left before it; a game already kicked off is said so
  - the run's link, and what to do: merge a fix, then dispatch props.yml with no_odds ticked, which
    bakes the kept prices and spends nothing

It reads the files only; it never fails (a file missing is said in the text), so the step that posts it
cannot hide the refusal it reports.

    python3 refused_note.py --problems "$RUNNER_TEMP/props-build-problems.txt" --run <the run's url>
"""
import argparse, datetime, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(os.path.dirname(HERE), 'data')
sys.path.insert(0, HERE)
from weekly import kickoff   # the schedule's Eastern date and time as a UTC instant, the page's rule


def when(s):
    """an instant as the job writes it ('2026-10-15T13:25Z', '...+00:00', or no zone: UTC)"""
    s = str(s or '').strip().replace('Z', '+00:00')
    try: t = datetime.datetime.fromisoformat(s)
    except ValueError: return None
    return t if t.tzinfo else t.replace(tzinfo=datetime.timezone.utc)


def et(g):
    """the schedule's own Eastern date and time, as the page writes it: 'Sun Oct 18, 1:00pm ET'"""
    try:
        d = datetime.datetime.strptime(f"{g['d']} {g['t']}", '%Y-%m-%d %H:%M')
        return d.strftime('%a %b ') + str(d.day) + ', ' + (d.strftime('%I:%M').lstrip('0') + ('am' if d.hour < 12 else 'pm')) + ' ET'
    except (KeyError, ValueError, TypeError):
        return f"{g.get('d', '?')} {g.get('t', '')} ET".strip()


def held(data=DATA, now=None):
    """[(game, kickoff ET, hours to go or None, priced at)] for the games priced after the published bake"""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    try: priced = json.load(open(os.path.join(data, 'priced_at.json'), encoding='utf-8'))
    except (OSError, ValueError): return None, 'priced_at.json would not read'
    try: pay = json.load(open(os.path.join(data, 'payload.json'), encoding='utf-8'))
    except (OSError, ValueError): return None, 'the published payload.json would not read'
    baked = when(pay.get('baked_at'))
    sched = {g.get('id'): g for g in pay.get('sched') or []}
    rows = []
    for gid, at in priced.items():
        t = when(at)
        if baked and t and t <= baked: continue
        g = sched.get(gid)
        ko = kickoff(g) if g else None
        hrs = (ko - now).total_seconds() / 3600 if ko else None
        rows.append((gid, et(g) if g else 'not on the published schedule', hrs, at))
    rows.sort(key=lambda r: (r[2] is None, r[2] if r[2] is not None else 0, r[0]))   # by kickoff
    return rows, pay.get('baked_at')


def note(problems_path, run_url, data=DATA, now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    out = [f"The props job refused a run at {now:%Y-%m-%d %H:%M} UTC: nothing from it is published, and the "
           "last good payload stays live. The prices it bought are kept (committed beside the published "
           "payload, never in it), so the next clean run bakes them without buying them again.", '',
           f"Run: {run_url}", '', '### Why it refused', '']
    try:
        p = open(problems_path, encoding='utf-8').read().strip() if problems_path else ''
    except OSError:
        p = ''
    if p:
        out += ['```', p[:3000] + ('\n... (cut at 3000 characters: the run\'s log has the rest)' if len(p) > 3000 else ''), '```']
    else:
        out += ['weekly.py wrote no problems file (it stopped before it could): the run\'s log says why.']
    out += ['', '### Prices bought and held', '']
    rows, baked = held(data, now)
    if rows is None:
        out += [f'Not worked out: {baked}.']
    elif not rows:
        out += [f'None: no game\'s player prices were bought since the payload on the site was baked ({baked}).']
    else:
        out += [f'Bought since the payload on the site was baked ({baked}), and not on the site until a run publishes:', '',
                '| Game | Kickoff | To go | Priced |', '|---|---|---|---|']
        for gid, ko, hrs, at in rows:
            go = 'kicked off' if hrs is not None and hrs <= 0 else (f'{hrs:.1f} h' if hrs is not None else '?')
            out.append(f'| {gid} | {ko} | {go} | {at} |')
        live = [h for _, _, h, _ in rows if h is not None and h > 0]
        if live: out += ['', f'The first of them kicks off in {min(live):.1f} hours.']
    out += ['', '### What to do', '',
            'Merge a fix (the props gate on its PR runs the job on the fix\'s code first), then dispatch '
            'props.yml with no_odds ticked (`gh workflow run props.yml -f no_odds=true`): it bakes the kept '
            'prices, spends no credit, and closes this issue when it publishes.']
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--problems', default='')
    ap.add_argument('--run', default='(no run link)')
    ap.add_argument('--data', default=DATA)
    ap.add_argument('--now', help='an ISO instant to write it as of (testing)')
    a = ap.parse_args()
    print(note(a.problems, a.run, a.data, when(a.now) if a.now else None))
    return 0


if __name__ == '__main__':
    sys.exit(main())
