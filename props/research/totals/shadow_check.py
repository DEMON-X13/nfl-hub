"""The game-totals shadow's check: the ledger shadow.py just wrote, against the last commit's and games.csv.

The betting job runs it right after shadow.py (update.yml); a failure fails that step alone, which puts
the ledger back as the last commit had it, so a broken ledger is never published and the betting publish
goes on. It fails when:

  * the bar is not the one registered (shadow.BAR), or not the last commit's, or registered after a call;
  * the candidate recorded is not the frozen one, or cand_ratings.py is not that file;
  * a call was made at or after its kickoff;
  * a call the last commit had frozen, or whose kickoff has passed, is gone, unfrozen or changed in any
    field of the call (the line, the prices, either chance, mu, sd, the model total, the pick, the time
    it was made). The one change allowed is a rewrite by this run made before that kickoff (its
    called_at this run's own, later than the old one and before the kickoff), for a call the last
    commit had not frozen;
  * a verdict is written before the sample is in, is missing once it is, does not follow from the
    first 285 graded calls, or differs from the last commit's;
  * a graded result disagrees with games.csv (the scores, the total, over/under/push against the call's
    own line, the pick's units), a graded game is not final there, or a frozen call's final is there and
    the call is not graded;
  * the summary does not follow from the calls.

    python3 props/research/totals/shadow_check.py [--games PATH] [--ledger PATH] [--prev PATH | --no-prev] [--now ISO]

Without --prev the last commit's ledger is read with `git show HEAD:<ledger>` (none there: the first run,
checked on its own). SHADOW_NOW stands in for the clock. Ends "shadow check: 0 failures" (exit 0) or lists
each failure (exit 1).
"""
import os, sys, json, argparse, hashlib, subprocess
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import shadow

GRADE_FIELDS = ('home', 'away', 'total', 'result', 'units')


def head_ledger():
    root = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=HERE, capture_output=True, text=True)
    if root.returncode:
        return None
    r = subprocess.run(['git', 'show', f'HEAD:{shadow.LEDGER_REL}'], cwd=root.stdout.strip(),
                       capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else None


def check(L, prev, g, now):
    """Every failure as a sentence; an empty list is a clean ledger."""
    bad = []
    t = shadow.parse_iso
    # the bar and the candidate
    if L.get('bar') != shadow.BAR:
        bad.append('the bar in the ledger is not the one registered (shadow.BAR)')
    if prev and (prev.get('bar') != L.get('bar') or prev.get('bar_registered') != L.get('bar_registered')):
        bad.append('the bar or its registration time differs from the last commit\'s')
    cand = L.get('candidate') or {}
    if cand.get('sha256') != shadow.CAND_SHA256 or shadow.candidate_sha() != shadow.CAND_SHA256:
        bad.append('the candidate is not the frozen cand_ratings.py (sha256 88af3991...)')
    if prev and (prev.get('candidate') or {}) != cand:
        bad.append('the candidate recorded differs from the last commit\'s')
    calls = L.get('calls') or {}
    reg = t(L['bar_registered']) if L.get('bar_registered') else None
    for gid, c in calls.items():
        k, at = t(c['kickoff']), t(c['called_at'])
        if at >= k:
            bad.append(f'{gid}: called at {c["called_at"]}, at or after its kickoff {c["kickoff"]}')
        if reg is None or at < reg:
            bad.append(f'{gid}: called at {c["called_at"]}, before the bar was registered')
    # nothing frozen moved
    if prev:
        run_at = L.get('run_at')
        for gid, pc in (prev.get('calls') or {}).items():
            pk = t(pc['kickoff'])
            if not (pc.get('frozen') or pk <= now):
                continue
            c = calls.get(gid)
            if c is None:
                bad.append(f'{gid}: a call frozen at kickoff ({pc["kickoff"]}) is gone')
                continue
            if pc.get('frozen') and not c.get('frozen'):
                bad.append(f'{gid}: a frozen call is open again')
            if all(pc.get(f) == c.get(f) for f in shadow.CALL_FIELDS):
                continue
            rewrite = (not pc.get('frozen') and c.get('called_at') == run_at and
                       t(pc['called_at']) < t(c['called_at']) < min(pk, t(c['kickoff'])))
            if not rewrite:
                diff = [f for f in shadow.CALL_FIELDS if pc.get(f) != c.get(f)]
                bad.append(f'{gid}: the call changed after kickoff ({", ".join(diff)})')
        if prev.get('decision') and prev['decision'] != L.get('decision'):
            bad.append('the verdict differs from the last commit\'s')
    # grades against games.csv
    for gid, c in calls.items():
        row = g.get(gid)
        f = c.get('final')
        if f:
            if row is None or not row['played']:
                bad.append(f'{gid}: graded {f.get("total")} but games.csv has no final for it')
                continue
            h, a = int(row['home_score']), int(row['away_score'])
            want = {'home': h, 'away': a, 'total': h + a, 'result': shadow.result_of(h + a, c['line']),
                    'units': shadow.pick_units(c.get('pick'), c.get('pick_price'), shadow.result_of(h + a, c['line']))}
            diff = [k for k in GRADE_FIELDS if f.get(k) != want[k]]
            if diff:
                bad.append(f'{gid}: the graded result disagrees with games.csv ({", ".join(f"{k} {f.get(k)} not {want[k]}" for k in diff)})')
            if not c.get('frozen'):
                bad.append(f'{gid}: graded but not frozen')
        elif c.get('frozen') and row is not None and row['played']:
            bad.append(f'{gid}: games.csv has the final but the call is not graded')
    # the verdict: none before the sample is in, and the one the first 285 give once it is
    dec = L.get('decision')
    if dec:
        try:
            want_d = shadow.decide(calls, t(dec['decided_at']))
        except (KeyError, TypeError, ValueError):
            want_d = None
        if json.dumps(want_d, sort_keys=True) != json.dumps(dec, sort_keys=True):
            bad.append('the verdict does not follow from the calls (the first '
                       f'{shadow.BAR["games"]} graded, in grading order)')
    elif shadow.decide(calls, now) is not None:
        bad.append(f'{shadow.BAR["games"]} games are in and no verdict was written')
    # the summary
    want = shadow.summarize(calls, dec)
    if json.dumps(L.get('summary'), sort_keys=True) != json.dumps(json.loads(json.dumps(want)), sort_keys=True):
        bad.append('the summary does not follow from the calls')
    return bad


def games_index(path):
    g = shadow.load_games(path)
    return {r.game_id: {'played': bool(r.played), 'home_score': r.home_score, 'away_score': r.away_score}
            for r in g.itertuples(index=False)}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--games', default=shadow.DEFAULT_GAMES)
    ap.add_argument('--ledger', default=os.environ.get('SHADOW_LEDGER') or shadow.LEDGER)
    ap.add_argument('--prev', help='the last published ledger (default: git show HEAD)')
    ap.add_argument('--no-prev', action='store_true')
    ap.add_argument('--now')
    a = ap.parse_args(argv)
    now = shadow.now_utc(a.now)
    with open(a.ledger) as fh:
        L = json.load(fh)
    if a.no_prev:
        prev = None
    elif a.prev:
        with open(a.prev) as fh:
            prev = json.load(fh)
    else:
        prev = head_ledger()
    try:
        g = games_index(a.games)
    except shadow.Refuse as e:
        print('shadow check: cannot read games.csv:', e)
        return 1
    bad = check(L, prev, g, now)
    for b in bad:
        print('FAIL', b)
    print(f'shadow check: {len(bad)} failures' + ('' if prev else ' (no earlier ledger to hold it to)'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
