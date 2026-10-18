r"""app v116: the Parlay Builder tab lists the Top 30 lines and puts the builder at its top.

The owner, Sunday 18 October 2026, with two screenshots of the tab: "its only showing top 30, but honestly top 30 is
enough if you want to set it at that", and of the builder holding five legs under the list, "that 5 leg parlay
section can we move it up to the top of the page?". (The list showed 30 rows because the reader had ticked a few
games; it had room for 50.)

So the list holds at most 30 lines (PB_TOP_N, the page's one number for it: its heading, "Top 30 lines", its lead, its
foot, the game totals' note and the empty builder's line all read it), and the order is as it was: the Value picks,
then the thin-edge lines, then the totals, each bet once, cut at the 30th. The checks keep their own copies of 30
(TOP_N_AUD in the audit, PB_TOP_N_OWN in the nflbets smoke), never read from the page.

And the builder (#parlayBody) comes first on the tab, over the choices and the list (#pbPanel), so a parlay being built
is the first thing on the tab, empty or not; the empty builder's line now points to the Top 30 "below". With the
builder over the list, a line added from the list grows the builder above it and would push the row the reader just
pressed down the screen (a phone's Safari has no scroll anchoring), so an Add on the list, or on a set's level card,
keeps its button where it was on the screen (pbLegClick scrolls the window by the distance the redraw moved it, at once
rather than by the page's smooth scrolling, so the row never slides) and the
focus on it, as before.
"""
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'const PB_TOP_N=30;' not in T['p3'], 'patch_top30_first.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v115 \\u00b7 2026-10-18';", "const APP_BUILD='app v116 \\u00b7 2026-10-18';", 'APP_BUILD')

# ---------------------------------------------------------------- the builder first on the tab
sub1('p1', """<section id="tab-parlay" hidden>
  <div id="pbPanel"></div>
  <div id="parlayBody"></div>
</section>""",
     """<section id="tab-parlay" hidden>
  <div id="parlayBody"></div>
  <div id="pbPanel"></div>
</section>""", 'the builder first')

# ---------------------------------------------------------------- the Top 30
sub1('p3', """/* ---------- the Parlay Builder's Top lines (app v111; 50 since app v113) ----------""",
     """/* ---------- the Parlay Builder's Top lines (app v111; 50 since app v113, 30 since app v116) ----------""", "the Top lines' comment")
sub1('p3', """   and thin (at or above the book, no more), uncapped (the Top 50 lines rank them all); pbPool caps them.
   o.read (app v115, the Top 50 lines alone)""",
     """   and thin (at or above the book, no more), uncapped (the Top 30 lines rank them all); pbPool caps them.
   o.read (app v115, the Top lines alone)""", "pbLegs' comment")
sub1('p3', "const PB_TOP_N=50;", "const PB_TOP_N=30;", 'PB_TOP_N')
sub1('p3', """  /* the Top 100 lines over the builder, and Suggested Parlays, drawn with it, unless only the amount moved""",
     """  /* the Top lines under the builder (app v116: the builder first on the tab), and Suggested Parlays, drawn with it, unless only the amount moved""",
     "renderParlay's comment")
sub1('p3', """or add a parlay from Suggested Parlays or a line from the Top ${PB_TOP_N} above. Each leg lands here and gets priced.""",
     """or add a parlay from Suggested Parlays or a line from the Top ${PB_TOP_N} below. Each leg lands here and gets priced.""",
     "the empty builder's line")

# ---------------------------------------------------------------- an Add keeps its place on the screen
sub1('p3', """  const key=b.dataset.pbLeg, kk=b.dataset.k, side=b.dataset.side, main=b.dataset.main==='1';
  const g=(S.sched||[]).find(x=>x.id===key.split('|')[0]);""",
     """  const key=b.dataset.pbLeg, kk=b.dataset.k, side=b.dataset.side, main=b.dataset.main==='1';
  const g=(S.sched||[]).find(x=>x.id===key.split('|')[0]);
  /* (app v116) where the button was on the screen: the builder is over the list, so the redraw below moves it */
  let top0=null; try{ top0=b.getBoundingClientRect().top; }catch(e){}""", 'pbLegClick top0')
sub1('p3', """  const f=(now[i]&&same(now[i]))?now[i]:now.find(same);
  try{ if(f) f.focus({preventScroll:true}); }catch(e){}
}""",
     """  const f=(now[i]&&same(now[i]))?now[i]:now.find(same);
  /* at once, not by the page's smooth scrolling (html{scroll-behavior:smooth}), so the row never slides */
  try{ if(f&&top0!=null&&typeof window.scrollBy==='function'){ const dy=f.getBoundingClientRect().top-top0;
    if(isFinite(dy)&&Math.abs(dy)>=1){ const de=document.documentElement, sb=de.style.scrollBehavior; de.style.scrollBehavior='auto'; window.scrollBy(0,dy); de.style.scrollBehavior=sb; } } }catch(e){}
  try{ if(f) f.focus({preventScroll:true}); }catch(e){}
}""", 'pbLegClick keeps its place')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v116, the Top 30 lines and the builder first on the Parlay Builder tab')
