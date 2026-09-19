"""How It Works retires; Backup shows on the public page; tiles marked on top (app v45).

  * The How It Works tab goes, section and all. renderModel stays defined but is no
    longer called, since its container is gone.
  * The public page keeps the Backup tab (publish.js now removes only Weekly Update):
    a visitor's saved parlays live only in their browser, same as the owner's.
  * The stat tiles' gold accent moves from the left edge to the top, as on the
    betting model (v1.51).
"""
from pathlib import Path

HERE = Path(__file__).parent


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


p1 = HERE / 'part1.html'
sub1(p1, '    <button role="tab" data-tab="model">How It Works</button>\n', '')
s = p1.read_text(encoding='utf-8')
start = '<section id="tab-model" hidden>'
assert s.count(start) == 1
i = s.index(start); j = s.index('</section>', i) + len('</section>')
if s[j:j + 1] == '\n': j += 1
p1.write_text(s[:i] + s[j:], encoding='utf-8', newline='\n')
sub1(p1, '.stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--gold),rgba(211,154,31,.25))}',
     '.stat::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--gold),rgba(211,154,31,.25))}')

sub1(HERE / 'part3.js', 'renderParlay(); renderModel(); renderTrack();', 'renderParlay(); renderTrack();')

pub = HERE / 'publish.js'
sub1(pub, """ *   props/index.html   public: Games, Parlay Builder, Track Record, How It Works.
 *                      The Weekly Update and Backup tabs are removed; the week's
 *                      data is baked in by weekly.py, so visitors never upload.""",
     """ *   props/index.html   public: Games, Parlay Builder, Track Record, Backup.
 *                      The Weekly Update tab is removed; the week's data is baked in
 *                      by weekly.py, so visitors never upload. Backup stays: a
 *                      visitor's saved parlays live only in their own browser.""")
sub1(pub, """/* public page: no Weekly Update or Backup tab; the data is baked in */""",
     """/* public page: no Weekly Update tab; the data is baked in */""")
sub1(pub, """  for(const t of ['week','backup']){""", """  for(const t of ['week']){""")

sub1(HERE / 'part2.js', "const APP_BUILD='app v44 \\u00b7 2026-09-19';", "const APP_BUILD='app v45 \\u00b7 2026-09-19';")
print('How It Works retired; Backup public; tiles marked on top; app v45')
