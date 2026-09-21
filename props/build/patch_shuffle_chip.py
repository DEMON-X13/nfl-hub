"""The "shuffled" chip goes; the header says enough without it (app v49).

v48 put a chip next to Medium whenever a shuffled parlay was on screen. It was
redundant three ways over: the Original button only exists while an alternative is
showing, the footer already says so in a sentence, and the legs themselves have
visibly changed. What it did do was crowd a header that now carries three buttons,
and on a phone it was one more thing pushing the chance and the price onto their
own line.

Shuffle and Original are untouched.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P2 = HERE / 'part2.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(J, """<h2>Suggested parlay</h2><span class="conf med">Medium</span>${s.alt?'<span class="pill">shuffled</span>':''}<span class="grow"></span>""",
     """<h2>Suggested parlay</h2><span class="conf med">Medium</span><span class="grow"></span>""")

sub1(P2, "const APP_BUILD='app v48 \\u00b7 2026-09-20';", "const APP_BUILD='app v49 \\u00b7 2026-09-20';")

print('the shuffled chip is gone; Shuffle and Original unchanged; app v49')
