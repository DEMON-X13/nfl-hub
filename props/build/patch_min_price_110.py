"""The floor at +110 (app v144).

App v143 (patch_min_price.py, the owner's call of 7 November 2026: "id want to at least double my bet, so 1$ bet wins 2$
for a profit of 1$") made every Suggested Parlays level pay +100 or more: its price in full, parlayDec on its legs as its
card states it, at least PB_MIN_DEC, 2. Its review left one call to the owner. +100 is met on the page's own price, and a
same-game parlay's price there is the site's estimate of DraftKings' (parlayDec: a same-game group at the lower of its
legs multiplied and SGP_HOLD, 0.896, over their joint chance, fitted on two tickets and off by about 5% either way on
them), while most Safes landed just over the line (on the payload of 6 November 11 of the 14 games' Safes priced 2.004 to
2.084), so DraftKings' real slip could pay a little under +100 on exactly the levels the rule was made for. He was asked:
"I'd raise the floor to about +110, so the real slip almost always doubles your bet. Safe would then land a little less
often, about 38% instead of 40%. Want me to make that change?", and answered: "yes".

The rule. PB_MIN_DEC is 2.1 (+110): every level of every unit pays +110 or more on the card's own price, 5% over
doubling, which the estimate's error on the two tickets it was fitted on stays within. Everything else of app v143's rule
is as it was: the price held in full (pbExact's dec, never the approximate pbDecApprox), the beam's per-game slack keeping
candidates (PB_MIN_SLACK, a ratio of the price in full to the approximate one, so it holds at any floor), the search run
again with its reserve by the price where the price starved its finalists, the game total filling one place for the price
(pbTotalsKMax), pbPaysAny's pruned enumeration (its every bound is relative to PB_MIN_DEC), and the empty levels' two
wordings, which say +110 (PB_MIN_ML, worked from PB_MIN_DEC).

The words follow the level's own floor, never the page's constant alone. A level carries the floor it was chosen at
(minDec, from pbExact; kept in the record and this browser's copy by spTierOut, read back by spTierIn), so a level taken
from now on carries minDec 2.1 and its pill says "likeliest pair · +110+" (a fallback "likeliest 3 legs · +110+"), titled
"The likeliest 2-leg parlay paying at least +110 by the site’s price: $1 returns $2.10 or more" (the site's price, since
that is what the floor is met on), and a floor level's title "... by DraftKings’ fair chance and paying at least +110". A
level locked under app v143 carries minDec 2 and keeps the words it was drawn with: "likeliest pair · +100+", "The
likeliest 2-leg parlay paying at least +100: $1 returns $2 or more", "... and paying at least +100". One with no minDec
(taken before app v143) keeps "the likeliest pair" and no title, one taken before app v138 still no pill (pbRuleKnown).
pbMinMl(d) and pbMinUsd(d) word a floor from its decimal ("+110", "$2.10"; "+100", "$2"). No paragraph goes on the page
(app v130).

The record. suggest_ledger.js holds its own copy, MIN_DEC 2.1: ready() refuses a page whose PB_MIN_DEC is not it, the guard
holds this run's own levels (taken or built again by it) to minDec 2.1 and a price of 2.1 or more, and an entry locked
under app v143 (minDec 2) stays byte for byte; an entry not yet locked is rewritten by the next run, as any set that has
changed is.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v143 \\u00b7 2026-11-07';", "const APP_BUILD='app v144 \\u00b7 2026-11-07';")

# ---------------------------------------------------------------- the floor: +110
sub1('p3', """   times the approximate one on a 2-leg same-game parlay, 1.06 on 3, 1.12 on 4 and 1.22 on 5, so none that pays +100 is
   dropped */
const PB_MIN_DEC=2, PB_MIN_SLACK=[1,1,1.05,1.1,1.2,1.3], PB_MIN_ML=fmtML(decToML(PB_MIN_DEC));
""", """   times the approximate one on a 2-leg same-game parlay, 1.06 on 3, 1.12 on 4 and 1.22 on 5, so none that pays +100 is
   dropped.
   (app v144, the owner's "yes" of 7 November 2026 to "I'd raise the floor to about +110, so the real slip almost always
   doubles your bet") PB_MIN_DEC is 2.1, +110: the floor is met on the site's own estimate of DraftKings' same-game price
   (parlayDec's SGP_HOLD, off by about 5% either way on the tickets it was fitted on), so it sits 5% over doubling. The
   slack is a ratio and holds at any floor. pbMinMl and pbMinUsd word a floor from its decimal ("+110", "$2.10"), so a
   level's words follow the floor it carries (minDec), never this constant alone */
const PB_MIN_DEC=2.1, PB_MIN_SLACK=[1,1,1.05,1.1,1.2,1.3], PB_MIN_ML=fmtML(decToML(PB_MIN_DEC));
const pbMinMl=d=>fmtML(decToML(d)), pbMinUsd=d=>'$'+(Number.isInteger(d)?String(d):d.toFixed(2));
""")

# ---------------------------------------------------------------- the words: the level's own floor
sub1('p3', """/* (app v143) a level chosen among the parlays paying +100 or more (t.minDec, carried by the record since) says so; one
   read back from a lock taken before it was chosen without the rule and says what did choose it */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100), mp=t.minDec?` · ${PB_MIN_ML}+`:'';
  return t.likeliest?`${mp?'':'the '}likeliest ${n} legs${mp}`:t.floor?`least costly · ${pct}%+`:(mp?`likeliest pair${mp}`:'the likeliest pair');
}
function pbRuleTitle(t){ const n=t.legs.length, pay=t.minDec?`paying at least ${PB_MIN_ML}`:'';
  if(!t.likeliest&&t.floor) return `Smallest expected loss of the ${n}-leg parlays landing ${Math.round(t.floor*100)}%+ by DraftKings’ fair chance${pay?' and '+pay:''}`;
  return pay?`The likeliest ${n}-leg parlay ${pay}: $1 returns $${PB_MIN_DEC} or more`:''; }""",
     """/* (app v143) a level chosen among the parlays paying +100 or more (t.minDec, carried by the record since) says so; one
   read back from a lock taken before it was chosen without the rule and says what did choose it.
   (app v144) the words are the level's own floor (t.minDec): a level taken from app v144 on says +110, one locked under
   app v143 (minDec 2) the +100 it was chosen at, with the words it was drawn with then (its title no "by the site’s price") */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100), mp=t.minDec?` · ${pbMinMl(t.minDec)}+`:'';
  return t.likeliest?`${mp?'':'the '}likeliest ${n} legs${mp}`:t.floor?`least costly · ${pct}%+`:(mp?`likeliest pair${mp}`:'the likeliest pair');
}
function pbRuleTitle(t){ const n=t.legs.length, pay=t.minDec?`paying at least ${pbMinMl(t.minDec)}`:'';
  if(!t.likeliest&&t.floor) return `Smallest expected loss of the ${n}-leg parlays landing ${Math.round(t.floor*100)}%+ by DraftKings’ fair chance${pay?' and '+pay:''}`;
  return pay?`The likeliest ${n}-leg parlay ${pay}${t.minDec===2?'':' by the site’s price'}: $1 returns ${pbMinUsd(t.minDec)} or more`:''; }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched', ', '.join(str(p.name) for p in FILES.values()))
