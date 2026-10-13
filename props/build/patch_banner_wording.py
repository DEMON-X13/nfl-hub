"""The rebuild banner no longer speaks of "Your parlays".

When the model or the rosters change, the prop model rebuilds the season in the browser and says so in
a banner, which told the reader that "Your parlays, stake and prices were kept". On the Bets and Stats
page there is no Your parlays any more: a visitor sees X's parlays and a builder that finishes into a
card nobody saves, and on the owner's devices the parlays are X's. The banner now says the saved
parlays, the stake and the prices were kept, which is true on both. Nothing else changes. app v85.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P2 = HERE / 'part2.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(J, "so the season was rebuilt from the current one. Your parlays, stake and prices were kept;",
     "so the season was rebuilt from the current one. Saved parlays, the stake and prices were kept;")
sub1(J, "rebuilt from the current baseline. Your parlays, stake and prices were kept;",
     "rebuilt from the current baseline. Saved parlays, the stake and prices were kept;")
sub1(P2, "const APP_BUILD='app v84 \\u00b7 2026-10-10';", "const APP_BUILD='app v85 \\u00b7 2026-10-10';")
print('ok')
