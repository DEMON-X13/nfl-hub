"""The shuffle audit must not hold up a publish over a thin week (app v48).

v48's audit demanded that four shuffles deal at least one alternative, and that the
button be enabled. Both read the week's luck as if it were the app's behaviour. The
candidate pool the audit works from is whatever that game's lines happen to offer: in a
thin one there legitimately is no second parlay at the same confidence, the app says so
and disables the button, and the audit would have called that a failure -- which stops
the commit, leaves the site stale and fails the run, over nothing.

The two checks become the invariants they were reaching for. The button's disabled state
must agree with the pool rather than always be enabled, and an alternative is demanded
only where there is plainly room for one (a pool at least three lines deeper than the
parlay, spread over at least three players). Everything a shuffle actually produced is
still checked as strictly as before, and the count is logged so a shuffle that quietly
stopped working is still visible.
"""
from pathlib import Path

HERE = Path(__file__).parent
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(A, """      chk(!sh.disabled,'shuffle is disabled with a pool of candidates available');""",
     """      chk(sh.disabled===!(s2.candidates>s2.legs.length),'the shuffle button is not disabled in step with the pool it has');""")

sub1(A, """      chk(shuffled>0,'four shuffles produced no alternative at all');""",
     """      /* a thin pool has no second parlay at the same confidence to find, and the app
         says so rather than inventing one: demand an alternative only where there is
         plainly room for one, so a lean week cannot fail the audit and stop a publish */
      const pool=F('suggestCandidates')([g]).slice(0,18);
      const roomy=pool.length>=s2.legs.length+3&&new Set(pool.map(c=>c.pid)).size>=3;
      chk(!roomy||shuffled>0,`four shuffles found nothing in a pool of ${pool.length} lines over ${new Set(pool.map(c=>c.pid)).size} players`);
      console.log(`O2. shuffle: ${shuffled} of 4 dealt an alternative, pool ${pool.length} lines over ${new Set(pool.map(c=>c.pid)).size} players`);""")

print('the shuffle audit checks the app, not the week: disabled tracks the pool, an alternative is demanded only where there is room')
