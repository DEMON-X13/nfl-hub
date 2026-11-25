r"""app v150: a level's walks no longer spend their budget on parlays already worked, and the second walk of one game has a
little more room.

The props job was refused twice on 24 November 2026 (17:26 and 22:12 UTC, issue #387) on one audit failure, blocking on the
audit's own made-up lines: LV at CLE's Aggressive took 5 legs landing 7.798% at +969 where 4 legs (Dareke Young Over 15.5
receiving yards, Dylan Laube Over 17.5 rush + rec yards, Harold Fannin Jr. Over 3.5 receptions, Tre Tucker Over 25.5
receiving yards) land 10.170% at +700. The made-up lines put most of that game's starters at -150 on a chance of 59%, so
some 13,000 sets of four with one longer leg priced within a hair of +700 by the search's reading, and every one the first
walk (1,500 worked in full), the second walk (1,559) and the wider re-run reached priced just under +700 in full: the first
paying set is about the 3,320th by the reading's order. Two things kept the search from it:

1. pbFreeWalk charged a set the level had already worked in full (read from LV.seen, which costs nothing) to the walk's
   units and its cap of evaluations, so the wider re-run (pbFreeGame's B3, eight times as many kept), which walks the same
   order from the top, spent its whole cap of 1,500 on the first walk's own 1,500 again and reached nothing new. A set
   already worked is now read from seen for free: no unit, no evaluation counted, no work (the work was already never
   charged twice). A walk that meets no seen set is exactly as before.

2. The second walk of one game (pbFreeGame's B2) had 1,000 units, all spent on sets of its own that did not pay, leaving the
   re-run 1,040 units, about 1,600 sets, short of the 3,320th. It now has PB_FREE.UNITS2G, 1,400 (UNITS2, the Day games'
   group walk's, stays 1,000). The level's work budget (PB_FREE.WORK, 1.5 s of W) is unchanged and still bounds every level,
   so no level can take longer than before.

On that game's made-up lines the Aggressive is then 4 legs landing 10.23% at +700. Units are the walks' old measure, which
binds no real level (CLAUDE.md, app v146: real levels use at most 1,710 units), so a real level moves only where a walk met
a set already worked, and then only to a parlay at least as likely by the rule's order.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'UNITS2G' not in T['p3'], 'patch_walk_seen.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v149 \\u00b7 2026-11-16';", "const APP_BUILD='app v150 \\u00b7 2026-11-24';", 'APP_BUILD')

sub1('p3', "UNITS1:2000,NODES1:6000000,UNITS2:1000,NODES2:500000,",
     "UNITS1:2000,NODES1:6000000,UNITS2:1000,UNITS2G:1400,NODES2:500000,", 'PB_FREE.UNITS2G')

sub1('p3', "  const B2=pbTake(LV,PB_FREE.UNITS2,PB_FREE.NODES2);",
     "  /* (v150) the second walk of one game: UNITS2G, the Day games' group walk keeping UNITS2 */\n"
     "  const B2=pbTake(LV,PB_FREE.UNITS2G,PB_FREE.NODES2);", 'the second walk\'s units')

sub1('p3', """  const work=e=>{ let r=B.seen?B.seen.get(e.id):undefined; const hit=r!==undefined; if(!hit){ r=pbExact(e.s.map(c=>x.L[c]),0,F); if(B.seen) B.seen.set(e.id,r||false); }
    const u=pbFreeCost(e.s.length,!!r); B.u-=u; PB_LV_STAT.units+=u; if(!hit) B.w-=pbWorkEx(e.s.length,!!r,e.s.cor?[e.s.length]:[]); if(!r) return; const c={pr:r.corr,n:e.s.length,ln:e.ln,id:e.id}; if(!best||pbFreeRank(c,best)<0){ best={...c,r}; mine=best; } };""",
     """  /* (v150) a set the level has worked in full already is read from seen for free: no unit, no evaluation counted */
  const seen=e=>!!B.seen&&B.seen.has(e.id);
  const work=e=>{ let r=B.seen?B.seen.get(e.id):undefined; const hit=r!==undefined; if(!hit){ r=pbExact(e.s.map(c=>x.L[c]),0,F); if(B.seen) B.seen.set(e.id,r||false);
      const u=pbFreeCost(e.s.length,!!r); B.u-=u; PB_LV_STAT.units+=u; B.w-=pbWorkEx(e.s.length,!!r,e.s.cor?[e.s.length]:[]); }
    if(!r) return; const c={pr:r.corr,n:e.s.length,ln:e.ln,id:e.id}; if(!best||pbFreeRank(c,best)<0){ best={...c,r}; mine=best; } };""",
     'the walk\'s work')

sub1('p3', "    if(ev>=cap||B.u<=0||B.w<=0){ cut=true; break; } ev++; work(e); }",
     "    if(seen(e)){ work(e); continue; }\n    if(ev>=cap||B.u<=0||B.w<=0){ cut=true; break; } ev++; work(e); }", 'phase 1, a seen set free')

sub1('p3', "if(!pbLvOpp(x,e.s)) continue; if(ev2>=PB_FREE.E2||B.u<=0||B.w<=0) break; ev2++; PB_LV_STAT.opp++; work(e); } }",
     "if(!pbLvOpp(x,e.s)) continue; if(seen(e)){ work(e); continue; } if(ev2>=PB_FREE.E2||B.u<=0||B.w<=0) break; ev2++; PB_LV_STAT.opp++; work(e); } }",
     'phase 2, a seen set free')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patch_walk_seen.py: app v150 applied')
