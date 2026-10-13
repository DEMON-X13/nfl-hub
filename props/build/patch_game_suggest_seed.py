"""A game's suggested parlay no longer comes up empty when good pairs are there.

The card on a game page builds greedily, and its first leg is forced: the leg with the best
chance-times-payout alone. That leg can be a long price no second leg lifts over the card's
30% floor. Monday night of week 3 was the case: the Bears at +160 (46%) led the seven lines
that qualified at PHI at CHI, every pair with it came to about 28%, and the card said nothing
clears the bar while the week's window was offering a 36% pair from the same game. The first
leg is now the best-scoring one that can be paired above the floor (the same order as before,
so a game whose best leg pairs gets the same parlay as before); a game with no such pair is
empty as it was. The audit now asserts it on the game it opens: where any two of the game's
candidates clear the floor together, the card is not empty. app v70.
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


sub1(J, """  const dec=legs=>legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1);
  let cur=[];
  while(cur.length<GAME_SUGGEST_CAP){""",
     """  const dec=legs=>legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1);
  /* the first leg is the best-scoring one that can be paired above the floor: the best leg
     alone can be a long price nothing lifts over it, which left the card empty beside good pairs */
  const pairs=c1=>cands.some(c2=>c2.key!==c1.key&&!(c1.grp==='TEAM'&&c2.grp==='TEAM')
    &&parlayProb([c1,c2],3000).corr>=GAME_SUGGEST_FLOOR);
  const single=c=>c.p*parlayDec([{leg:c,ml:c.price}],2000);
  const seed=[...cands].map(c=>({c,s:single(c)})).sort((a,b)=>b.s-a.s).map(x=>x.c).find(pairs);
  let cur=seed?[seed]:[];
  while(seed&&cur.length<GAME_SUGGEST_CAP){""")

sub1(P2, "const APP_BUILD='app v69 \\u00b7 2026-09-28';", "const APP_BUILD='app v70 \\u00b7 2026-09-28';")

sub1(A, """    w.eval('GAME_SUGGEST_CACHE={}');
    const s2=F('gameSuggestion')(g);
    chk(put===0||s2.legs.length>=2,'priced lines are available and still no suggestion');""",
     """    w.eval('GAME_SUGGEST_CACHE={}');
    const s2=F('gameSuggestion')(g);
    chk(put===0||s2.legs.length>=2,'priced lines are available and still no suggestion');
    /* a pair above the floor among the candidates means the card is not empty */
    { const cs=F('suggestCandidates')([g]).slice(0,15), fl=w.eval('GAME_SUGGEST_FLOOR');
      let pairOk=false;
      for(let i=0;i<cs.length&&!pairOk;i++) for(let j=i+1;j<cs.length&&!pairOk;j++){
        if(cs[i].key===cs[j].key||(cs[i].grp==='TEAM'&&cs[j].grp==='TEAM')) continue;
        if(F('parlayProb')([cs[i],cs[j]],20000).corr>=fl+0.02) pairOk=true; }
      chk(!pairOk||s2.legs.length>=2,'two of the game\\'s lines clear the floor together and the card is empty'); }""")
