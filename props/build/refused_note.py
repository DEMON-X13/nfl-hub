"""The body of the props-refused issue: why a props run was refused, for whoever fixes it.

On 15 October 2026 a props run bought the week's prices at 13:27 UTC and the audit refused them; they
were published at 19:02, once someone had noticed the red run, merged a fix and run the job again. The
failure email went to an inbox, and nothing said what was waiting. props.yml now opens an issue (labelled
props-refused) when weekly.py refuses a run, or comments on the one already open, with this as its text,
and closes it on the next clean publish:

  - the problems file weekly.py wrote (its first 3000 characters): why the run was refused
  - the published payload's bake time and the next game still to come, with its kickoff in ET and the
    hours left before it (the payload on the site is the last good one, and its ESPN read with it)
  - the run's link, and what to do: merge a fix, then dispatch props.yml (`gh workflow run props.yml`),
    which spends nothing: since 20 October 2026 (the owner's call) the job buys no prices and every run
    reads DraftKings' lines from ESPN, so nothing is held between runs

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


def published(data=DATA, now=None):
    """(the published payload's baked_at, the next game still to come as (id, kickoff ET, hours to go), when
    its read of ESPN was made) or (None, why)"""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    try: pay = json.load(open(os.path.join(data, 'payload.json'), encoding='utf-8'))
    except (OSError, ValueError): return None, 'the published payload.json would not read'
    nxt = None
    for g in pay.get('sched') or []:
        ko = kickoff(g)
        if ko and ko > now and g.get('hs') is None and (nxt is None or ko < nxt[1]): nxt = (g, ko)
    espn = pay.get('espn') if isinstance(pay.get('espn'), dict) else {}
    return (pay.get('baked_at'), (nxt[0]['id'], et(nxt[0]), (nxt[1] - now).total_seconds() / 3600) if nxt else None, espn.get('read_at')), None


def note(problems_path, run_url, data=DATA, now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    out = [f"The props job refused a run at {now:%Y-%m-%d %H:%M} UTC: nothing from it is published, and the "
           "last good payload stays live, with the read of DraftKings' lines it was published with.", '',
           f"Run: {run_url}", '', '### Why it refused', '']
    try:
        p = open(problems_path, encoding='utf-8').read().strip() if problems_path else ''
    except OSError:
        p = ''
    if p:
        out += ['```', p[:3000] + ('\n... (cut at 3000 characters: the run\'s log has the rest)' if len(p) > 3000 else ''), '```']
    else:
        out += ['weekly.py wrote no problems file (it stopped before it could): the run\'s log says why.']
    out += ['', '### What is on the site', '']
    got, why = published(data, now)
    if got is None:
        out += [f'Not worked out: {why}.']
    else:
        baked, nxt, read = got
        out += [f'The payload baked at {baked}' + (f', its read of ESPN made at {read}' if read else '') + '.']
        if nxt: out += [f'The next game, {nxt[0]}, kicks off {nxt[1]}, in {nxt[2]:.1f} hours: until a run publishes, its lines '
                        'and its set on Suggested Parlays stand on that payload.']
    out += ['', '### What to do', '',
            'Merge a fix (the props gate on its PR runs the job on the fix\'s code first), then dispatch '
            'props.yml (`gh workflow run props.yml`): every run is free, and it closes this issue when it publishes.']
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
