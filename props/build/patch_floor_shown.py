"""The 30% floor on a game's suggested parlay holds on the number the card shows.

gameSuggestion() and the shuffle both keep a three-leg hand only while it clears
GAME_SUGGEST_FLOOR, but they check that on a quick estimate (3,000 and 1,500 runs) and
then show the chance from a full one (20,000 runs). Right at the floor the two disagree:
the audit found a hand built at 30.1% whose alternatives were shown at 28.7%, 28.9% and
28.7%, each one having cleared the floor on its quick estimate and fallen under it on
the full one. The card said "30% or better" over a parlay that was not.

Now the full estimate is the one the floor is held on. A suggestion that drops under it
loses its last leg, since two legs are always kept; a shuffled hand that drops under it
is not dealt, and the shuffle goes on to the next.
"""
import io
p='part3.js'
s=io.open(p,encoding='utf-8').read()
old1="""  const val=cur.length<2?{legs:[],candidates:cands.length}
    :{legs:cur,candidates:cands.length,corr:parlayProb(cur,20000).corr,
      dec:parlayDec(cur.map(l=>({leg:l,ml:l.price}))),mult:dec(cur)};
  GAME_SUGGEST_CACHE[g.id]={sig,val};"""
new1="""  /* the floor was held on a quick estimate while building; the chance shown is the full
     one, and a hand above two legs that only cleared the floor by noise loses its last leg */
  let corr=cur.length<2?0:parlayProb(cur,20000).corr;
  while(cur.length>2&&corr<GAME_SUGGEST_FLOOR){ cur=cur.slice(0,-1); corr=parlayProb(cur,20000).corr; }
  const val=cur.length<2?{legs:[],candidates:cands.length}
    :{legs:cur,candidates:cands.length,corr,
      dec:parlayDec(cur.map(l=>({leg:l,ml:l.price}))),mult:dec(cur)};
  GAME_SUGGEST_CACHE[g.id]={sig,val};"""
old2="""    const corr=parlayProb(legs,20000).corr, gap=Math.abs(corr-base.corr);
    if(!best||gap<best.gap) best={legs,corr,gap};"""
new2="""    const corr=parlayProb(legs,20000).corr, gap=Math.abs(corr-base.corr);
    if(legs.length>2&&corr<GAME_SUGGEST_FLOOR) continue;     /* cleared the floor by noise only */
    if(!best||gap<best.gap) best={legs,corr,gap};"""
for old,new in [(old1,new1),(old2,new2)]:
    assert s.count(old)==1, old[:40]
    s=s.replace(old,new)
io.open(p,'w',encoding='utf-8').write(s)
print('floor held on the shown chance')
