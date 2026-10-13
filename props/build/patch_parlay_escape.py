"""The parlay card prints every field of a leg as text, never as markup.

The X Parlays document lives in an open store: anyone with its address can write to it, and the
page lays its builder over every visitor's parlay card. The X Parlays branch cleans what comes in
from the store, but renderParlay still printed a leg's position, team, opponent and week, and the
book price box's value, straight into the HTML. A leg with markup in one of those fields would have
run as page markup on every device that drew it, the owner's included, where the owner link lives.
Each is now escaped, a second layer behind the cleaning. The audit puts a leg with markup in each
field and a markup book price on the card, and fails if any of it becomes an element. app v84.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P2 = HERE / 'part2.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(J, "<small>${l.pos} \\u00b7 ${l.team} v ${l.opp} \\u00b7 wk ${l.week}</small>",
     "<small>${esc(l.pos)} \\u00b7 ${esc(l.team)} v ${esc(l.opp)} \\u00b7 wk ${esc(l.week)}</small>")
sub1(J, """value="${S.bookPrice!=null?S.bookPrice:''}" style="width:110px">""",
     """value="${S.bookPrice!=null?esc(S.bookPrice):''}" style="width:110px">""")
sub1(P2, "const APP_BUILD='app v83 \\u00b7 2026-10-10';", "const APP_BUILD='app v84 \\u00b7 2026-10-10';")
sub1(A, """    console.log(`O. game tiers: ${spec.map(""",
     """    /* the parlay card prints a leg's fields as text: markup planted in the shared store never becomes an element */
    if(T.med&&T.med.legs.length){ const keepP=JSON.parse(JSON.stringify(S.parlay||{})), keepB=S.bookPrice, bad='<img src=x data-planted=1>';
      const l0=T.med.legs[0]; S.parlay={}; S.parlay[l0.key]=Object.assign({},l0,{pos:bad,team:bad,opp:bad,week:bad});
      S.bookPrice='"><img src=x data-planted=1>';
      try{ F('renderParlay')(); const body=d.getElementById('parlayBody');
        chk(!!body&&!body.querySelector('[data-planted]')&&/<img src=x data-planted=1>/.test(body.textContent),'markup in a parlay leg or the book price became an element on the parlay card'); }
      finally{ S.parlay=keepP; S.bookPrice=keepB; F('renderParlay')(); } }
    console.log(`O. game tiers: ${spec.map(""")
print('ok')
