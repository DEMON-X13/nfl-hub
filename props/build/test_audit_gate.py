"""The weekly job's audit gate, held to its cases.

weekly.py publishes only when the audit is clean, and it decides that from the audit's summary
line ("26980 checks, 0 failures, 2 warnings, 0 runtime errors"). It used to ask whether the text
'0 failures' and '0 runtime errors' appeared in that line, which '10 failures' and '20 runtime
errors' contain, so an audit with ten failures would have been published. audit_verdict now reads
the line as numbers: the count of failures and of runtime errors must both be 0 over at least one
check, and an output with no summary line, or one in another shape, is not clean.

Warnings (the audit's presentation-only checks, audit.js says which) never make it unclean, however
many: a run with only warnings publishes, and audit_warnings hands weekly.py their count and lines
for the problems file, so the job goes red after its commit. The line from before the warnings
("26980 checks, 0 failures, 0 runtime errors") is read the same way, with none. And the problems
entry the warnings make never reads as a refusal: blocked() and props.yml's last step take an
entry starting BLOCKED or AUDIT for one.

    python3 props/build/test_audit_gate.py       must end "0 failures"
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import weekly
from weekly import audit_verdict, audit_warnings

CASES = [
    # (what the audit printed, clean?)
    ('26980 checks, 0 failures, 0 runtime errors', True),
    ('M. suggested parlays: 39 tiers built\n\n26980 checks, 0 failures, 0 runtime errors\n', True),
    ('26980 checks, 10 failures, 0 runtime errors', False),
    ('26980 checks, 20 failures, 0 runtime errors', False),
    ('26980 checks, 100 failures, 0 runtime errors', False),
    ('26980 checks, 0 failures, 10 runtime errors', False),
    ('26980 checks, 0 failures, 1 runtime errors', False),
    ('26980 checks, 3 failures, 0 runtime errors\n  FAIL: a note that reads 0 failures, 0 runtime errors', False),
    ('0 checks, 0 failures, 0 runtime errors', False),
    ('', False),
    ('TypeError: cannot read properties of undefined\n    at audit.js:12', False),
    ('26980 checks, 0 failures', False),
    ('26980 checks, 0 failures, 0 runtime errors (and 4 more)', False),
    # the warnings: never unclean on their own, and never hiding a failure
    ('26980 checks, 0 failures, 0 warnings, 0 runtime errors', True),
    ('26980 checks, 0 failures, 3 warnings, 0 runtime errors\n  WARN: LA: with QB1 out the quarterback shown is nobody [starters]', True),
    ('26980 checks, 0 failures, 10 warnings, 0 runtime errors', True),
    ('26980 checks, 0 failures, 100 warnings, 0 runtime errors', True),
    ('26980 checks, 10 failures, 0 warnings, 0 runtime errors', False),
    ('26980 checks, 1 failures, 5 warnings, 0 runtime errors', False),
    ('26980 checks, 0 failures, 2 warnings, 1 runtime errors', False),
    ('26980 checks, 0 failures, 2 warnings, 10 runtime errors', False),
    ('0 checks, 0 failures, 0 warnings, 0 runtime errors', False),
    ('26980 checks, 0 failures, 2 warnings', False),
    ('26980 checks, 0 failures, two warnings, 0 runtime errors', False),
    ('26980 checks, 0 failures, 2 warnings, 0 runtime errors\n  WARN: a note that reads 10 failures, 0 runtime errors [wording]', True),
    ('26980 checks, 0 failures, 0 warnings, 0 runtime errors\n\n27001 checks, 2 failures, 0 warnings, 0 runtime errors', False),
]

fails = []
for out, want in CASES:
    clean, line = audit_verdict(out)
    if clean is not want:
        fails.append(f'{out.splitlines()[-1] if out else "(no output)"!r}: read as {"clean" if clean else "not clean"} ({line})')

# audit_warnings: the count from the summary line, the lines under it
WCASES = [
    ('26980 checks, 0 failures, 0 runtime errors', 0, 0),
    ('26980 checks, 0 failures, 0 warnings, 0 runtime errors', 0, 0),
    ('A. game context\n  WARN: not under the summary [order]\n\n26980 checks, 0 failures, 2 warnings, 0 runtime errors\n'
     '  WARN: LA: the starter shown is nobody [starters]\n  WARN: week 6: the Completed heading is missing [order]\n'
     '  (a starters warning: who is shown)\n  (a order warning: an ordering)', 2, 4),
    ('', 0, 0),
]
for out, n, nl in WCASES:
    got = audit_warnings(out)
    if got[0] != n or len(got[1]) != nl:
        fails.append(f'audit_warnings read {got[0]} warnings and {len(got[1])} lines, not {n} and {nl}: {out[-80:]!r}')

# the problems entry a warning makes is published, never read as a refusal, and a failure still is
weekly.problems[:] = ["the audit's 2 warnings (presentation only, published): 26980 checks, 0 failures, 2 warnings, 0 runtime errors\n"
                      "    WARN: LA: the starter shown is nobody [starters]"]
if weekly.blocked(): fails.append('a warnings entry reads as a refusal')
weekly.problems[:] = ['AUDIT NOT CLEAN: 26980 checks, 1 failures, 2 warnings, 0 runtime errors']
if not weekly.blocked(): fails.append('a failed audit does not read as a refusal')
weekly.problems[:] = []

# the run's tail end to end: weekly.audit_step and finish() on planted audit outputs, then the
# props.yml step that reads the problems file after the commit, run as the job runs it. Warnings
# alone: exit 0 (the commit step runs), the suggestions record taken, the step goes red saying what
# was built was published. A failure: exit 1 (no commit), no record, the step says nothing was.
import io, re, shutil, subprocess, tempfile, contextlib, types
YML = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.github', 'workflows', 'props.yml'), encoding='utf-8').read()
m = re.search(r'- name: Fail the run if the build reported problems\n(?:.*\n)*?\s+run: \|\n((?:\s{10}.*\n|\n)+)', YML)
STEP = '\n'.join(l[10:] for l in m.group(1).splitlines()) if m else None
if not STEP: fails.append('props.yml has no "Fail the run if the build reported problems" step to run')
WARNED = ('A. game context: 272 games\n\n26980 checks, 0 failures, 2 warnings, 0 runtime errors\n'
          '  WARN: LA: with QB1 out the quarterback shown is nobody, not the chart\'s QB2 Stetson Bennett [starters]\n'
          '  WARN: the high tier lands 31%, under its 35% floor, without saying so [compose]\n'
          '  (a starters warning: who is shown starting)\n  (a compose warning: which parlay a level picks)\n')
FAILED = ('A. game context: 272 games\n\n26980 checks, 1 failures, 1 warnings, 0 runtime errors\n'
          '  FAIL: price rows: 1 wrong or unreported (Puka Nacua placed on Davante Adams)\n'
          '  WARN: week 6: the Completed heading is missing [order]\n')
tmp = tempfile.mkdtemp()
real = (weekly.run, weekly.suggestions_record, os.environ.get('RUNNER_TEMP'))
try:
    os.environ['RUNNER_TEMP'] = tmp
    for lab, out, want_rc, want_rec, want_say in [('warnings only', WARNED, 0, True, 'what it built was published'),
                                                    ('a failure', FAILED, 1, False, 'nothing was published')]:
        weekly.problems[:] = []; weekly.report[:] = []; weekly.PUBLISHED[0] = None; took = []
        weekly.run = lambda args, cwd, label, soft=False, env=None, out=out: (0, out)   # the audit exits 0 and says it all in its summary
        weekly.suggestions_record = lambda offline=False: took.append(1)
        with contextlib.redirect_stdout(io.StringIO()):
            weekly.audit_step(types.SimpleNamespace(offline=True))
            rc = weekly.finish(types.SimpleNamespace(offline=True))
        pf = os.path.join(tmp, 'props-build-problems.txt')
        body = open(pf, encoding='utf-8').read() if os.path.exists(pf) else ''
        if rc != want_rc: fails.append(f'{lab}: weekly.py exits {rc}, not {want_rc}')
        if bool(took) != want_rec: fails.append(f'{lab}: the suggestions record was {"" if took else "not "}taken')
        if 'WARN:' not in body and lab == 'warnings only': fails.append(f'{lab}: the problems file does not list the warnings: {body[:200]!r}')
        if STEP:
            r = subprocess.run(['bash', '-c', STEP], env=dict(os.environ, RUNNER_TEMP=tmp), capture_output=True, text=True)
            if r.returncode != 1 or want_say not in r.stdout:
                fails.append(f'{lab}: props.yml\'s last step exits {r.returncode} saying {r.stdout[:160]!r}, not 1 with "{want_say}"')
        print(f'  {lab}: weekly.py exits {rc}; the job\'s last step: {r.stdout.splitlines()[0] if STEP and r.stdout else "?"}')
finally:
    weekly.run, weekly.suggestions_record = real[0], real[1]
    if real[2] is None: os.environ.pop('RUNNER_TEMP', None)
    else: os.environ['RUNNER_TEMP'] = real[2]
    weekly.problems[:] = []; weekly.report[:] = []
    shutil.rmtree(tmp, ignore_errors=True)

old = lambda a: '0 failures' in a and '0 runtime errors' in a
print(f'(the old substring test read "26980 checks, 10 failures, 0 runtime errors" as '
      f'{"clean" if old("26980 checks, 10 failures, 0 runtime errors") else "not clean"})')
n = len(CASES) + len(WCASES) + 2 + 2 * 4
print(f'{n} checks, {len(fails)} failures')
for f in fails: print('  FAIL', f)
sys.exit(1 if fails else 0)
