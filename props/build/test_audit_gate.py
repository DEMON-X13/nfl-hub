"""The weekly job's audit gate, held to its cases.

weekly.py publishes only when the audit is clean, and it decides that from the audit's summary
line ("26980 checks, 0 failures, 0 runtime errors"). It used to ask whether the text '0 failures'
and '0 runtime errors' appeared in that line, which '10 failures' and '20 runtime errors' contain,
so an audit with ten failures would have been published. audit_verdict now reads the line as
numbers: the count of failures and of runtime errors must both be 0 over at least one check, and
an output with no summary line, or one in another shape, is not clean.

    python3 props/build/test_audit_gate.py       must end "0 failures"
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from weekly import audit_verdict

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
]

fails = []
for out, want in CASES:
    clean, line = audit_verdict(out)
    if clean is not want:
        fails.append(f'{out.splitlines()[-1] if out else "(no output)"!r}: read as {"clean" if clean else "not clean"} ({line})')
old = lambda a: '0 failures' in a and '0 runtime errors' in a
print(f'(the old substring test read "26980 checks, 10 failures, 0 runtime errors" as '
      f'{"clean" if old("26980 checks, 10 failures, 0 runtime errors") else "not clean"})')
print(f'{len(CASES)} checks, {len(fails)} failures')
for f in fails: print('  FAIL', f)
sys.exit(1 if fails else 0)
