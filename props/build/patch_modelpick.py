"""The Games tab's "Winner" column is the model's pick; say so (app v43).

The column shows the side the model expects to win and by how much, and after the
final a line under it grading that pick (a check or cross, then who really won). Its
heading, "Winner", read like the result, and v42's check mark beside the winning team
in the Matchup column repeated a result the column already gives. The heading becomes
"Model pick" and the Matchup column's check mark goes. The game's own page keeps its
check mark, where it sits next to the "Final:" score.
"""
from pathlib import Path

HERE = Path(__file__).parent


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(HERE / 'part1.html', """<div class="c">Winner</div>""", """<div class="c">Model pick</div>""")
sub1(HERE / 'part3.js', """<div class="matchup">${tag(g.a)}${winMark(g,g.a)}<span class="at">at</span>${tag(g.h)}${winMark(g,g.h)}</div>""",
     """<div class="matchup">${tag(g.a)}<span class="at">at</span>${tag(g.h)}</div>""")
sub1(HERE / 'part2.js', "const APP_BUILD='app v42 \\u00b7 2026-09-18';", "const APP_BUILD='app v43 \\u00b7 2026-09-18';")
print('Winner column is Model pick; matchup check mark removed; app v43')
