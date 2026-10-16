"""The props audit, and the Bets and Stats page smoke, replayed on past payloads at their own moment.

On 15 October 2026 two props runs were refused by audit checks that turned on the week's data (#270,
#271: made-up ESPN and DraftKings ids laid over the payload's real ones), and a sweep then found more
that turned on the week or the hour: a Sunday at 3pm whose first game's RB1 had nothing to project
(no lines, so no 2+ touchdown box), a Monday night under way (the audit moved the page's clock back
before the last kickoff and left Node's where it was), the off-season (a leg left in the builder by an
earlier section, unticked by the next click, then a crash), a week with no game's moneylines posted
(the audit's copy of the fair-chance rule without the page's fallback), and an Elo pick taking a leg
priced from a Refresh odds read (counted with the levels' est. marks); and in the page smoke, a Monday
night under way (its shift sets the page's clock two days back, and a press check dated a made-up pull
by Node's, about a day in the page's future), and a Monday night under way on a payload baked that Monday
(the page set back before that Monday's DraftKings pull, so a press rightly left the published game lines,
which the smoke took for the read's and then crashed on). audit.js's BLOCKING AND WARNINGS
note gives the rules each check keeps since; this replays the audit where each of those broke, so a
change to the audit, the smoke or the props parts is held to every shape the job has published:

  each case     a payload from git history (or one built here from it), with that commit's own
                props/data beside it (the audit reads the week's CSVs too: a payload beside today's
                files false-fails V2), audited with PROPS_AUDIT_NOW at the case's moment and
                PROPS_AUDIT_RAW unset (section V's raw comparisons are today's files: weekly.py runs
                them on the payload it bakes)
  the tree      a scratch props/: build/ from this checkout (working copies, uncommitted edits and
                new files included; node_modules linked), the app assembled from its parts, raw/
                fake_wk1.csv, and data/ from `git archive <commit> props/data`
  the verdict   weekly.audit_verdict on the summary line, as the job reads it (audit.js exits 0
                whatever it finds), so a crash with no summary line is a failure too
  the smoke     nflbets/build/smoke.js with SMOKE_NOW, in a scratch hub: nflbets/, betting/,
                props/build/ and liveparlays/ from this checkout, and that commit's props/data,
                elo/data, betting/state.json and liveparlays/*.json over them (the smoke reads them
                all); it must end "0 failures"

The season played out (every game given a score, the week 17 and 18 games given week 7's lines, as
real closing lines would be; and the same with no lines past week 7, nflverse's shape for weeks not
yet posted) is built here from the 15 October payload, never committed.

No credit is spent and nothing is downloaded: every input is in git. One audit takes about 2.5
minutes alone, 3 to 6.5 four at a time; the off-season ones about a minute.

    python3 props/build/test_audit_phases.py               every case, 4 at a time; must end "0 failures"
    python3 props/build/test_audit_phases.py --quick       Sunday 3pm, Monday night under way, the off-season
    python3 props/build/test_audit_phases.py -j 2 sun_3pm  named cases, 2 at a time
    --audit FILE / --smoke FILE   run another copy of audit.js or smoke.js, and --part3 FILE assemble the
                                  audit's app from another part3.js (to show a check fails on a broken
                                  version); --keep DIR keeps every case's tree and output there
"""
import argparse, concurrent.futures as cf, json, os, re, shutil, subprocess, sys, tempfile, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from weekly import audit_verdict

# (label, what it is, payload commit, the moment, kind): kind 'audit', 'smoke', or 'audit:<synth>'
CASES = [
    ('presat',       'Saturday before the pull',                     '3944ccf', '2026-10-10T17:16Z', 'audit'),
    ('sat_priced',   'the Sunday slate priced',                      '97a1015', '2026-10-11T01:56Z', 'audit'),
    ('sun_midslate', 'Sunday mid-slate',                             '5df831f', '2026-10-11T17:39Z', 'audit'),
    ('sun_night',    'Sunday night',                                 'b91f865', '2026-10-11T21:50Z', 'audit'),
    ('mon_before',   'Monday before kickoff (BUF at LA priced)',     '4b2468c', '2026-10-12T22:55Z', 'audit'),
    ('mon_live',     'Monday night under way',                       '4b2468c', '2026-10-13T01:30Z', 'audit'),
    ('no_prices',    'a week with no player prices yet',             'd4e07d2', '2026-10-15T08:16Z', 'audit'),
    ('paid_ids',     'paid DraftKings ids on a game to come',        '417be84', '2026-10-15T19:05Z', 'audit'),
    ('sun_3pm',      'Sunday 3pm, a first game whose RB1 has no lines', '417be84', '2026-10-18T19:00Z', 'audit'),
    ('mon_live6',    'Monday night under way, week 6',               '417be84', '2026-10-20T01:30Z', 'audit'),
    ('season_over',  'the season played out, closing lines on weeks 17-18', '417be84', '2027-02-15T15:00Z', 'audit:over_lines'),
    ('season_bare',  'the season played out, no lines past week 7',  '417be84', '2027-02-15T15:00Z', 'audit:over_bare'),
    ('smoke_paid',   'page smoke, paid ids on a game to come',       '417be84', '2026-10-15T19:05Z', 'smoke'),
    ('smoke_noprices', 'page smoke, no player prices yet',           'd4e07d2', '2026-10-15T08:16Z', 'smoke'),
    ('smoke_mon6',   'page smoke, Monday night under way, week 6 (the page set back)', '417be84', '2026-10-20T01:30Z', 'smoke'),
    ('smoke_mon5',   'page smoke, Monday night under way, the payload baked that Monday', '4b2468c', '2026-10-13T01:30Z', 'smoke'),
]
QUICK = ['sun_3pm', 'mon_live6', 'season_over']
LINE_KEYS = ['sp', 'tot', 'mla', 'mlh', 'spa', 'sph', 'tov', 'tou']
SMOKE_LINE = re.compile(r'(\d+) checks, (\d+) failures')


def season_over(pay, lines):
    """The season played out: every game without a score given one (never a tie), the payload's week
    the last, season_over set; with lines, each week 17 and 18 game given a week 7 game's lines"""
    P = json.loads(pay)
    for i, g in enumerate(P['sched']):
        if g.get('hs') is None or g.get('as') is None:
            hs = 17 + (i % 5) * 3
            g['hs'], g['as'] = float(hs), float(hs - 3 - (i % 4) * 2 if i % 2 else hs + 4 + (i % 3))
    if lines:
        src = [g for g in P['sched'] if int(g['w']) == 7 and g.get('sp') is not None and g.get('mla') is not None]
        assert src, 'the payload has no week 7 game with lines to lend weeks 17 and 18'
        late = [g for g in P['sched'] if int(g['w']) in (17, 18)]
        for i, g in enumerate(late):
            for k in LINE_KEYS:
                if src[i % len(src)].get(k) is not None: g[k] = src[i % len(src)][k]
    P['week'] = max(int(g['w']) for g in P['sched'])
    P['season_over'] = True
    return json.dumps(P)


def files(prefix):
    """this checkout's files under prefix: tracked and new ones, as they stand on disk"""
    out = subprocess.check_output(['git', '-C', ROOT, 'ls-files', '--cached', '--others', '--exclude-standard', '-z', prefix])
    return [f for f in out.decode().split('\0') if f and os.path.isfile(os.path.join(ROOT, f))]


def copy_tree(dst, prefixes):
    for pre in prefixes:
        for f in files(pre):
            if '/node_modules/' in f or '__pycache__' in f: continue
            t = os.path.join(dst, f); os.makedirs(os.path.dirname(t), exist_ok=True); shutil.copy2(os.path.join(ROOT, f), t)
    os.symlink(os.path.join(ROOT, 'props', 'build', 'node_modules'), os.path.join(dst, 'props', 'build', 'node_modules'))


def overlay(dst, sha, paths):
    tar = subprocess.run(['git', '-C', ROOT, 'archive', sha, *paths], capture_output=True, check=True).stdout
    subprocess.run(['tar', '-x', '-C', dst], input=tar, check=True)


def run_case(case, base, a):
    label, what, sha, now, kind = case
    d = os.path.join(base, label); os.makedirs(d)
    env = {k: v for k, v in os.environ.items() if k not in ('PROPS_AUDIT_RAW', 'PROPS_AUDIT_PAYLOAD', 'PROPS_AUDIT_NOW', 'SMOKE_NOW', 'SMOKE_PAYLOAD')}
    t0 = time.time()
    try:
        if kind.startswith('audit'):
            copy_tree(d, ['props/build'])
            if a.audit: shutil.copy2(a.audit, os.path.join(d, 'props', 'build', 'audit.js'))
            if a.part3: shutil.copy2(a.part3, os.path.join(d, 'props', 'build', 'part3.js'))
            os.makedirs(os.path.join(d, 'props', 'raw')); shutil.copy2(os.path.join(ROOT, 'props', 'raw', 'fake_wk1.csv'), os.path.join(d, 'props', 'raw'))
            overlay(d, sha, ['props/data'])
            if ':' in kind:
                pf = os.path.join(d, 'props', 'data', 'payload.json')
                with open(pf) as f: pay = f.read()
                with open(pf, 'w') as f: f.write(season_over(pay, kind.endswith('lines')))
            cwd = os.path.join(d, 'props', 'build')
            subprocess.run([sys.executable, 'assemble.py'], cwd=cwd, check=True, capture_output=True)
            r = subprocess.run(['node', 'audit.js'], cwd=cwd, env={**env, 'PROPS_AUDIT_NOW': now}, capture_output=True, text=True, timeout=a.timeout)
            out = (r.stdout or '') + (r.stderr or '')
            ok, line = audit_verdict(out)
        else:
            copy_tree(d, ['nflbets', 'betting', 'props/build', 'liveparlays'])
            if a.smoke: shutil.copy2(a.smoke, os.path.join(d, 'nflbets', 'build', 'smoke.js'))
            overlay(d, sha, ['props/data', 'elo/data', 'betting/state.json', 'liveparlays/parlays.json', 'liveparlays/xbets.json'])
            r = subprocess.run(['node', 'nflbets/build/smoke.js'], cwd=d, env={**env, 'SMOKE_NOW': now}, capture_output=True, text=True, timeout=a.timeout)
            out = (r.stdout or '') + (r.stderr or '')
            m = [x for x in (SMOKE_LINE.search(l) for l in out.splitlines()) if x]
            ok = r.returncode == 0 and bool(m) and m[-1].group(2) == '0'
            line = m[-1].group(0) if m else f'smoke produced no summary line (exit {r.returncode})'
    except subprocess.TimeoutExpired as e:
        out = ((e.stdout or b'').decode(errors='replace') if isinstance(e.stdout, bytes) else (e.stdout or '')); ok, line = False, f'timed out after {a.timeout}s'
    except Exception as e:  # a tree that cannot be built is a failure of this test, said as such
        out, ok, line = repr(e), False, f'could not run: {e!r}'
    with open(os.path.join(d, 'out.txt'), 'w') as f: f.write(out)
    fails = [l.strip() for l in out.splitlines() if l.strip().startswith(('FAIL', 'RUNTIME', 'TypeError', 'ReferenceError', 'Error:'))]
    return label, what, sha, now, ok, line, round(time.time() - t0), fails


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('cases', nargs='*', help='labels to run (default every case)')
    ap.add_argument('-j', type=int, default=4, help='cases at a time (default 4)')
    ap.add_argument('--quick', action='store_true', help='run ' + ', '.join(QUICK))
    ap.add_argument('--audit', help='an audit.js to run in place of this checkout\'s')
    ap.add_argument('--smoke', help='a smoke.js to run in place of this checkout\'s')
    ap.add_argument('--part3', help='a part3.js to assemble the audit\'s app from (a broken page the audit must fail)')
    ap.add_argument('--keep', help='keep every case\'s tree and output in this folder')
    ap.add_argument('--timeout', type=int, default=1200, help='seconds a case may take (default 1200)')
    a = ap.parse_args()
    for f in (a.audit, a.smoke, a.part3):
        if f: assert os.path.isfile(f), f
    a.audit, a.smoke, a.part3 = [f and os.path.abspath(f) for f in (a.audit, a.smoke, a.part3)]
    want = a.cases or (QUICK if a.quick else [c[0] for c in CASES])
    unknown = [x for x in want if x not in {c[0] for c in CASES}]
    if unknown: ap.error('no such case: ' + ', '.join(unknown) + ' (cases: ' + ', '.join(c[0] for c in CASES) + ')')
    todo = [c for c in CASES if c[0] in want]
    base = os.path.abspath(a.keep) if a.keep else tempfile.mkdtemp(prefix='audit-phases-')
    os.makedirs(base, exist_ok=True)
    for c in todo:
        if os.path.exists(os.path.join(base, c[0])): shutil.rmtree(os.path.join(base, c[0]))
    print(f'{len(todo)} case(s), {a.j} at a time, in {base}', flush=True)
    t0 = time.time(); res = []
    with cf.ThreadPoolExecutor(max_workers=max(1, a.j)) as ex:
        for fut in cf.as_completed([ex.submit(run_case, c, base, a) for c in todo]):
            label, what, sha, now, ok, line, secs, fails = r = fut.result(); res.append(r)
            print(f"{'ok  ' if ok else 'FAIL'} {label:15} {sha} @{now}  {line}  [{secs}s]  {what}", flush=True)
            if not ok:
                for l in fails[:12]: print('       ' + l[:300])
    bad = [r for r in res if not r[4]]
    if not a.keep: shutil.rmtree(base, ignore_errors=True)
    print(f'\n{len(res)} cases, {len(bad)} failures [{round(time.time() - t0)}s]' + ('' if not bad else ': ' + ', '.join(r[0] for r in bad)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
