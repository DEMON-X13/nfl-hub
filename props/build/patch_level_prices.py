"""Each level the likeliest parlay at its payout (app v144).

Run after patch_min_price_110.py, on parts that one has patched (both, on origin/main's parts of app v143, give the parts of
app v144 byte for byte).

The owner's calls of 7 November 2026. First, asked "I'd raise the floor to about +110, so the real slip almost always doubles
your bet. Safe would then land a little less often, about 38% instead of 40%. Want me to make that change?", he answered
"yes" (patch_min_price_110.py). Then: "in suggested props. i want the med prop to be at least $4 outcome from 1$ and
aggressive to be $8 or more. I want the best possible model confidence to match what level bet". "$4 outcome from 1$" is $4
returned on $1, decimal 4.00, as his earlier "1$ bet wins 2$ for a profit of 1$" (app v143) was decimal 2.00; "the best
possible model confidence" is the chance a card states, DraftKings' fair chance by the builder's own sums (parlayProb on
legChance), since the prop model's own chance carried nothing beyond it (app v138).

Where it stood. App v143 made every level pay +100 or more; Safe was the likeliest pair paying it, and Medium, Aggressive and
Extreme the least costly parlay landing 25%, 12% or 5% at the fair chance among those, else the likeliest of their size. The
record's levels since app v138 priced Medium at 2.84 to 3.41, Aggressive at 5.14 to 6.36 and Extreme at 10.8 to 14.5, so none
would meet the new prices: a floor of chance and a floor of price pull a level opposite ways, and the owner chose the price.

The rule. Each level is the likeliest parlay of its size (its chance the card's, parlayProb on its legs at their chances, a
tie to 1e-9 to the larger lean and then the lower id, as every tie has been broken since app v138) whose price in full
(parlayDec on its legs, as the card states it, est. where a leg is) is at least its own least price: Safe 2 legs at 2.10
(+110), Medium 3 legs at 4.00 (+300), Aggressive 4 legs at 8.00 (+700), Extreme 5 legs at 16.00 (+1500). Extreme's is the
doubling carried on (2, 4, 8, 16), a call made with this change and said to the owner; Extreme stays hidden on the tab and kept in the
record. The four are one table, PB_TIERS' fifth figure, whose fourth, the floor of chance, is 0 for every level: the chance
floors and "least costly" leave Suggested Parlays' levels and the all-games engine (getPbTiers), and the game page's hands
(gameTiers, drawn nowhere) keep their own search. The leg counts, the leg rules, the totals' fill (as many as the legs with a
chance leave, one at most for the price where they leave none), the Sunday slot's best-of (each level one game's, the
likeliest of the games' own after the totals and the thin legs), a level built again for a player ruled out, and every
level's price held in full are as they were, each on the level's own price; pbPaysAny and the empty levels' two wordings take
it too: "No 3 legs in this game pay +300 or more together." where pbPaysAny shows none does, "No 3 legs found in this game
that pay +300 or more together." where it cannot tell, the slot's and the engine's alike.

The search. The likeliest parlay paying +700 on four legs is no likely partial parlay: at the fair chance every parlay of a
game returns about the same on $1 (each leg's margin, SGP_HOLD on a same-game group), so a parlay's chance is about that over
its price, the likeliest paying a level's price is one whose price in full lands just over it, and the likeliest partials are
the shortest legs, which no fourth leg takes to +700. A beam by the chance, the app v143 search (pbBeam, pbBestReturn and
pbLikeliest, gone with pbGrow, pbEntry and pbMinSlack), cannot be made to find it. So pbLevelCands looks at every parlay of
the size, on the search's own figures (pbCtx: each leg's chance, the price's implied chance and its decimal, each pair's lift
by Plackett's integral, as pbJoint works them), walking the legs likeliest first: those that go together on one slip
(pbPairOk), with exactly k fill legs (k from the fewest up, as before), whose legs multiplied pay the price (a parlay never
pays more, so a branch whose legs and the dearest the rest can add fall short is given up) and whose approximate price times
its slack does (app v143's rule, PB_MIN_SLACK, kept). Each is keyed by the lesser of its approximate chance and its
approximate return over the price (one that pays the price in full lands at most its return over it, and at most its chance),
the best 1,500 kept (every tie of the 1,500th with them, so the same lines keep the same parlays whatever the order they were
met in; a branch given up where its chance, the rest at their likeliest with every lift among them at the pool's largest,
cannot reach the 1,500th). pbLevelPick walks them best key first, each worked in full by pbExact (its price first, false under
the level's, then its chance), and keeps the likeliest that pays; it stops once no parlay left can beat it by more than 0.05
points of chance (PB_LV_TOL), one whose key times 1.03 (PB_LV_C: about the 99th percentile of the chance in full over the
search's reading of chance, and of the return in full over the search's reading of return, on week 9's parlays of 3 to 5
legs, most of it the full sums' own noise) is under the best's chance in full plus that. Where the kept ran out first with
some let go (many parlays short of the price in full ahead of the one that pays it), it runs again keeping eight times as
many; it stops at 6,000 parlays worked in full (PB_LV_EVALS), a bound no real game has come near. The totals' pass looks only
at parlays holding a total (the first pass has looked at every one with none). Where that walk works some and finds none
that pays, a second walk is made by the search's chance alone among the parlays whose search price already pays the level,
under a bound of 12,000 of its own (PB_LV_EVALS2): wherever every leg returns alike, the key ties every parlay short of the
price with the answer, and where the search's price also runs above the price in full (legs that all move together beyond
what their pairs say) the first walk can spend its bound on parlays that never pay. The audit's made-up lines (every
starter's main line set off his own projection at -105 to -115) are such a world: on TB at CHI's 53 lines, 124,312 of the
211,454 parlays of four pay +700 in full, the first walk's 7,505 by key all fell short, and the second finds one landing
10.19% where the likeliest paying lands 10.27%, in 1.7 s. No game of week 9 needs it, and every level there is what it was
without it. pbPaysAny now works every whole parlay its legs multiplied let through in full (up to 3,000), where it skipped
those whose search price times its slack fell short, so it says false only where none of them pays.

Measured, on the payload of 7 November 2026 at Saturday 18:00 UTC (week 9: Sunday night's TB at CHI, Monday night's BUF at
MIN and the Sunday slot's 12 games, every unit live). Against every parlay of each level's size in each of the 14 games, the
best by the search's reading worked in full (all of them on 2 and 3 legs, the best 20,000 on 4 and 40,000 on 5, which reach
past the best paying by more than the reading's error): every Safe and every Medium the likeliest outright; 10 of the 14
Aggressives the likeliest and the rest within 0.065 points of chance (0.012 on average); the Extremes within 0.105 (0.050 on
average), against a tolerance of about 0.2, the full sums' own noise. Against 24 pools made from those games' legs (16 to 18
legs each, every leg at a random price from -450 to +160 and a random margin of 2% to 8%, the legs' own correlations kept),
every parlay of each size worked in full: every Safe, Medium and Aggressive the likeliest, and the Extremes within 0.075
(18 of 24 exactly). The four levels of the week's 14 games built in about 2.4 s in jsdom (Safe 0.14 s, Medium 0.5, Aggressive
0.46, Extreme 1.34; at most 0.27 s a level, each one task of spOpenSoft), and every unit's set in 2.3 s against app v143's
2.1 s on the same payload and clock.

The words, by each level's own recorded rule. A level taken from now on carries its price (minDec: 2.1, 4, 8 or 16) and the
rule (pick: 'likeliest'), kept in the record and this browser's copy by spTierOut and read back by spTierIn, which now reads
the floor of chance a level was kept with, its own, so a Medium locked under app v143 keeps its "least costly". Its pill
reads "likeliest pair · +110+", "likeliest 3 legs · +300+", "likeliest 4 legs · +700+" or "likeliest 5 legs · +1500+", its
title "The likeliest 3-leg parlay paying at least +300 by the site’s price: $1 returns $4 or more" (Safe "$2.10"). A level
locked under app v143 (minDec 2, no pick) draws what app v143 drew for it ("likeliest pair · +100+", "least costly · 25%+"
titled "... by DraftKings’ fair chance and paying at least +100", "likeliest 3 legs · +100+" titled "The likeliest 3-leg parlay
paying at least +100: $1 returns $2 or more"); one locked before as before. No paragraph goes on the page (app v130).

On that payload at that clock, TB at CHI's levels go from +104 (fair 39.8%), +202 (25.5%), +516 (12.4%) and +1148 (6.0%) to
+113 (38.0%), +311 (19.1%), +704 (9.5%) and +1513 (4.5%); BUF at MIN's from +112, +241, +498 and +1345 to +112, +301, +704 and
+1546; the Sunday slot's from +101, +184, +513 and +1130 to +110, +301, +701 and +1514.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p3', 'part3.js'),)}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k].name}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p3', r"""const PB_TIERS=[['safe','Safe',2,0],['med','Medium',3,0.25],['aggr','Aggressive',4,0.12],['xtrm','Extreme',5,0.05]];
/* (app v143, the owner's call of 7 November 2026: "id want to at least double my bet, so 1$ bet wins 2$") every level pays
   +100 or more: its price in full (pbExact's dec, parlayDec on its legs, as its card states it) at least PB_MIN_DEC. The
   search's approximate price (pbDecApprox) only keeps candidates, times a slack for each game holding two legs or more of
   the parlay (PB_MIN_SLACK, by their count: across games the two prices are one product): the price in full is at most 1.02
   times the approximate one on a 2-leg same-game parlay, 1.06 on 3, 1.12 on 4 and 1.22 on 5, so none that pays +100 is
   dropped.
   (app v144, the owner's "yes" of 7 November 2026 to "I'd raise the floor to about +110, so the real slip almost always
   doubles your bet") PB_MIN_DEC is 2.1, +110: the floor is met on the site's own estimate of DraftKings' same-game price
   (parlayDec's SGP_HOLD, off by about 5% either way on the tickets it was fitted on), so it sits 5% over doubling. The
   slack is a ratio and holds at any floor. pbMinMl and pbMinUsd word a floor from its decimal ("+110", "$2.10"), so a
   level's words follow the floor it carries (minDec), never this constant alone */
const PB_MIN_DEC=2.1, PB_MIN_SLACK=[1,1,1.05,1.1,1.2,1.3], PB_MIN_ML=fmtML(decToML(PB_MIN_DEC));
const pbMinMl=d=>fmtML(decToML(d)), pbMinUsd=d=>'$'+(Number.isInteger(d)?String(d):d.toFixed(2));
""",
     r"""/* (app v144, the owner's call of 7 November 2026: "in suggested props. i want the med prop to be at least $4 outcome from 1$
   and aggressive to be $8 or more. I want the best possible model confidence to match what level bet") each level has a
   least price of its own, the fifth figure (a decimal: $1 returns that or more), and no floor of chance (the fourth, 0 for
   every level since): Safe 2.1 (+110: the owner's "yes" of the same day to "I'd raise the floor to about +110, so the real
   slip almost always doubles your bet"), Medium 4 (+300), Aggressive 8 (+700) and Extreme 16 (+1500, the doubling carried on;
   Extreme is hidden on the tab and kept in the record). Each level is the likeliest parlay of its size whose price in full
   pays its own least price (pbLevel, below): "the best possible model confidence" is the chance its card states,
   DraftKings' fair chance by the builder's own sums, since the model's own chance carried nothing beyond it (app v138) */
const PB_TIERS=[['safe','Safe',2,0,2.1],['med','Medium',3,0,4],['aggr','Aggressive',4,0,8],['xtrm','Extreme',5,0,16]];
/* (app v143, the owner's call of 7 November 2026: "id want to at least double my bet, so 1$ bet wins 2$") every level pays
   its least price: its price in full (pbExact's dec, parlayDec on its legs, as its card states it) at least the level's own
   (PB_TIERS' fifth figure since app v144; PB_MIN_DEC, one for every level, from app v143 to app v144's first form). The
   search's approximate price (pbDecApprox's reading) only keeps candidates, times a slack for each game holding two legs or
   more of the parlay (PB_MIN_SLACK, by their count: across games the two prices are one product): the price in full is at
   most 1.02 times the approximate one on a 2-leg same-game parlay, 1.06 on 3, 1.12 on 4 and 1.22 on 5, so none that pays is
   dropped. The slack is a ratio and holds at any least price. The price is met on the site's own estimate of DraftKings'
   same-game price (parlayDec's SGP_HOLD, off by about 5% either way on the tickets it was fitted on), which is why Safe's sits
   at +110, 5% over doubling. pbMinMl and pbMinUsd word a least price from its decimal ("+110", "$2.10", "+300", "$4"), so a
   level's words follow the price it carries (minDec), never the page's table alone */
const PB_MIN_SLACK=[1,1,1.05,1.1,1.2,1.3];
const pbMinMl=d=>fmtML(decToML(d)), pbMinUsd=d=>'$'+(Number.isInteger(d)?String(d):d.toFixed(2));
""",
     'the table of the four least prices')

sub1('p3', r"""/* a partial parlay one leg (c) longer than P, scored from P's own figures: the model's product times c's chance and its lift
   with each leg (pbJoint's terms), and each game's count, price product and book product (pbDecApprox's), the price worked
   from them as pbDecApprox works it. s: the legs' indexes sorted; o: in the order they were put together (the legs pbEval
   would have been given) */
function pbGrow(x,P,c){
  const s=P.s, n=s.length, S=new Array(n+1); let j=0, put=false;
  for(let i=0;i<n;i++){ if(!put&&c<s[i]){ S[j++]=c; put=true; } S[j++]=s[i]; }
  if(!put) S[j]=c;
  const o=P.o; let raw=P.raw*x.p[c];
  for(let i=0;i<n;i++){ const v=pbLift(x,o[i],c,false); if(v!==1) raw*=v; }
  const gc=x.gc[c], G=P.g, Gc=G.slice(); let gi=-1;
  for(let i=0;i<G.length;i+=4) if(G[i]===gc){ gi=i; break; }
  if(gi<0) Gc.push(gc,1,x.dec[c],x.q[c]);
  else { let pj=G[gi+3]*x.q[c]; for(let i=0;i<n;i++) if(x.gc[o[i]]===gc){ const v=pbLift(x,o[i],c,true); if(v!==1) pj*=v; }
    Gc[gi+1]=G[gi+1]+1; Gc[gi+2]=G[gi+2]*x.dec[c]; Gc[gi+3]=pj; }
  let d=1;
  for(let i=0;i<Gc.length;i+=4){ const cnt=Gc[i+1], mult=Gc[i+2];
    if(cnt<2){ d*=mult; continue; }
    const pj=Math.max(0,Math.min(1,Gc[i+3])); d*=(pj>0&&isFinite(pj))?Math.min(mult,(1/pj)*SGP_HOLD):mult; }
  const pr=Math.max(0,Math.min(1,raw)), ev=pr*d, ln=P.ln+x.ln[c];
  return {s:S,o:o.concat(c),raw,pr,d,ev,g:Gc,ln,kpr:pbEvKey(pr),kev:pbEvKey(ev),kln:pbEvKey(ln),st:0,e:null};
}
/* a scored parlay as pbEval gives it ({legs, pr, d, ev, id, ln, ids}), made once */
const pbEntry=(x,E)=>{ if(!E.e){ const ids=E.s.map(i=>x.id[i]).sort(); E.e={legs:E.o.map(i=>x.L[i]),pr:E.pr,d:E.d,ev:E.ev,id:ids.join(','),ln:E.ln,ids}; } return E.e; };
""",
     r"""""",
     "pbGrow and pbEntry, the beam's own (the beam is gone)")

sub1('p3', r"""/* the beam: every partial parlay one leg longer, the best `width` of them by `by` kept at each
   size; one well under the floor is dropped as soon as it is (another leg only lowers it).
   (app v138) Each scored from its parent's figures (pbGrow) and kept by its legs' indexes, the same parlays in the same
   order as before (pbRank: the score to 1e-9, the larger lean, the id), each step's best `width` chosen by a selection on
   the rounded score (pbKth), only those sorted; a set of up to 5 legs among fewer than 64 is keyed by a small number, any
   other by its indexes joined.
   (app v143) minD: at the last step a parlay whose approximate price, times its slack (pbMinSlack), is under it is not kept,
   before the width cut, so the width keeps the best of those that can pay the level's least price; a call without it is
   exactly as before. (The review of app v143) The beam it returns says how many the price set aside there (cut); res: at
   each step, besides its best `width` by the score, the `res` partials it would not keep of the highest approximate price
   (times its slack), so a pool crowded with short legs, whose best partials by the score pay under the floor with any leg
   after them (or, at the last step, pay it only by the slack and not in full), still meets the parlays that pay it
   (pbBestReturn and pbLikeliest call it so only where the price set some aside and their finalists ran short) */
function pbBeam(pools,floor,by,width,memo,minD,res){
  const x=pbCtx(memo), P=pools.map(pl=>pl.map(c=>pbCtxLeg(x,c))), kk=by==='ev'?'kev':'kpr', small=x.N<64&&pools.length<=5, last=pools.length-1;
  const cmp=(a,b)=>(b[kk]-a[kk])||(b.kln-a.kln)||pbEntry(x,a).id.localeCompare(pbEntry(x,b).id);
  let beam=[x.root], cut=0;
  const done=b=>{ const out=b.map(E=>pbEntry(x,E)); out.cut=cut; return out; };
  for(let s=0;s<pools.length;s++){
    const stamp=++x.st, next=[], Pc=P[s];
    for(let bi=0;bi<beam.length;bi++){ const B=beam[bi], o=B.o, bs=B.s, n=bs.length;
      for(let ci=0;ci<Pc.length;ci++){ const c=Pc[ci];
        let fit=true; for(let i=0;i<n;i++) if(!pbPairOk(x,o[i],c)){ fit=false; break; }
        if(!fit) continue;
        let k;
        if(small){ k=0; let put=false; for(let i=0;i<n;i++){ const v=bs[i]; if(!put&&c<v){ k=k*64+c+1; put=true; } k=k*64+v+1; } if(!put) k=k*64+c+1; }
        else { const S=bs.slice(); S.push(c); S.sort((a,b)=>a-b); k=S.join(','); }
        let E=x.sets.get(k);
        if(E){ if(E.st===stamp) continue; }
        else { E=pbGrow(x,B,c); x.sets.set(k,E); }
        E.st=stamp;
        if(floor&&E.pr<floor*0.9) continue;
        if(minD&&s===last&&!(E.d*pbMinSlack(E.g)>=minD)){ cut++; continue; }
        next.push(E); } }
    if(!next.length) return done([]);
    let keep=next;
    if(next.length>width){
      const sk=new Float64Array(next.length); for(let i=0;i<next.length;i++) sk[i]=next[i][kk];
      const T=pbKth(sk,width), hi=[], eq=[];
      for(let i=0;i<next.length;i++){ const v=next[i][kk]; if(v>T) hi.push(next[i]); else if(v===T) eq.push(next[i]); }
      if(hi.length+eq.length>width) eq.sort(cmp);
      keep=hi.concat(eq.slice(0,width-hi.length)); }
    keep.sort(cmp);
    beam=keep.length>width?keep.slice(0,width):keep;
    if(res&&next.length>beam.length){ const inB=new Set(beam), R=[];
      for(const E of next) if(!inB.has(E)) R.push([E.d*pbMinSlack(E.g),E]);
      R.sort((a,b)=>(b[0]-a[0])||cmp(a[1],b[1]));
      for(let i=0;i<R.length&&i<res;i++) beam.push(R[i][1]); }
  }
  return done(beam);
}
""",
     r"""""",
     'pbBeam, gone')

sub1('p3', r"""/* a level's best return: preferred legs alone first, then with k legs from the thin list, fewest
   first. The best few by the search's own score are worked exactly, and the best of those that
   clears the floor is the tier; null when none does. Safe, with no floor, is the likeliest pair.
   opt: the search's widths (pbOpt; the panel's own without it). (app v143) Every candidate pays +100 or more: the beams
   keep only those whose approximate price can (with its slack, pbMinSlack), and the finalists are the first o.final of
   them, in the search's own order, whose price in full is PB_MIN_DEC or more (one under it is set aside, not counted).
   (The review of app v143) Where the price set some aside and the finalists ran short of o.final, the earlier steps' cuts,
   made on the score alone, may have let go of the parlays that pay it (a game of many short legs): the beams are run again
   keeping at each step besides their best by the score their o.beam best by the price (pbBeam's res), and that is the
   search. Safe's beam keeps every pair and is never run again */
function pbBestReturn([id,label,n,floor],pool,memo,kMax,opt){
  const o=pbOpt(opt), P=pool.pref, U=[...pool.pref,...pool.thin];
  /* kMax, when given, is the most fill legs a parlay may take (the totals' pass, pbTier) */
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    const pick=res=>{ const fin=new Map(), minD=PB_MIN_DEC; let cut=0;
      const add=b=>{ cut+=b.cut||0; for(const e of b) fin.set(e.id,e); };
      if(!floor) add(pbBeam(pools,0,'pr',Infinity,memo,minD));
      else { add(pbBeam(pools,floor,'ev',o.beam,memo,minD,res)); add(pbBeam(pools,floor,'pr',o.beam,memo,minD,res)); }
      /* the finalists that clear the floor by the search's own score, in the beam's own order (app v136), each then
         worked in full, which is what the card shows and what the floor is held to. (app v138) The best of them in full
         is taken, no longer the first to clear the floor: at DraftKings' fair chance every estimated leg returns the same
         on $1, so the finalists differ only by how their legs move together and by the same-game price, where the
         search's pairwise score errs by more than the gaps between them, and the card's "least costly" (Safe's "the
         likeliest pair") is said of the figures it states. The highest chance times price (Safe: chance) to 1e-9, a tie
         to the larger lean, then the lower id; the full sums are seeded and kept, so the same lines give the same pick */
      const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort(pbRank(floor?'ev':'pr'));
      let best=null, kept=0;
      for(const e of top){ if(kept>=o.final) break;
        const r=pbExact(e.legs,floor,PB_MIN_DEC); if(r===false){ cut++; continue; } kept++; if(!r) continue;
        const x={v:floor?r.corr*r.dec:r.corr,ln:e.ln,id:e.id}; if(!best||pbRank('v')(x,best.x)<0) best={x,r}; }
      return {best,short:cut>0&&kept<o.final}; };
    let q=pick(0);
    if(floor&&q.short&&isFinite(o.beam)) q=pick(o.beam);
    if(q.best) return q.best.r;
  }
  return null;
}
/* the likeliest n-leg parlay on the picks, for a level none of whose parlays reaches its floor.
   Chosen as Safe is: preferred legs alone first, then with k thin legs, fewest first. At each k a
   beam by the search's own chance, twice as wide as the floor search's, and its best few (three for
   the panel) by that chance worked with the builder's own sums (parlayProb, on the legs in the
   builder's order), the highest of those the tier (the lower id on a tie, so the same picks always
   give the same parlay). Legs in different games are a plain product, so there the search's chance
   is the builder's and this is the likeliest parlay outright. null only when the picks do not make
   n legs at all. (app v143) Among the parlays paying +100 or more alone, as pbBestReturn's: the beam keeps those whose
   approximate price can, and its best few are the first o.likely whose price in full does (null where none does); (the
   review of app v143) where the price set some aside and those ran short of o.likely, the beam again with its o.wide best
   by the price kept at each step beside its best by the chance (pbBeam's res), as pbBestReturn's */
function pbLikeliest(n,pool,memo,kMax,opt){
  const o=pbOpt(opt), P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    const pick=res=>{ let best=null, kept=0; const B=pbBeam(pools,0,'pr',o.wide,memo,PB_MIN_DEC,res); let cut=B.cut||0;
      for(const e of B){ if(kept>=o.likely) break;
        const r=pbExact(e.legs,0,PB_MIN_DEC); if(!r){ cut++; continue; } kept++;
        const pr=r.corr;
        /* (app v138) the highest to 1e-9, a tie to the larger lean, then the lower id */
        if(!best||pbRank('pr')({pr,ln:e.ln,id:e.id},{pr:best.pr,ln:best.e.ln,id:best.e.id})<0) best={e,pr,r}; }
      return {best,short:cut>0&&kept<o.likely}; };
    let q=pick(0);
    if(q.short&&isFinite(o.wide)) q=pick(o.wide);
    if(q.best) return q.best.r;
  }
  return null;
}
/* one level: the best return over its floor, else (Medium, Aggressive, Extreme) the likeliest
   parlay of its size, marked likeliest so its card says which it is */
function pbTierOn(t,pool,memo,kMax,opt){
  const r=pbBestReturn(t,pool,memo,kMax,opt); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo,kMax,opt); return x?{...x,likeliest:true}:null;
}
/* the legs with an edge first, exactly as before (preferred, then the fewest thin); only where
   they cannot make a parlay of the level's size at all are the totals added: every leg with an
   edge, preferred and thin alike, is then the base and the totals the only fill, exactly as many
   totals as those legs leave to fill (pbTotalsFill) and no more, by the same two searches, so a
   total never takes the place of a leg with an edge. (app v121) Those legs are counted as one parlay can take them, with
   no pair DraftKings refuses (pbMaxFit): a quarterback's passing TDs and his teammate's touchdown are one leg's room,
   not two, so a total fills where they cannot both go.
   (The review of app v143) Since a level of their size shows a parlay wherever they make one, they find none only where
   none they make pays +100 (or they make none): then the game total may fill one place for the price (pbTotalsKMax: as
   many as they leave, one at most where they leave none), so a level is empty only where no parlay of its size in the
   unit pays +100, totals and all */
const pbTotalsFill=(n,pool)=>Math.max(0,n-pbMaxFit([...pool.pref,...pool.thin]));
const pbTotalsKMax=(n,pool)=>Math.max(1,pbTotalsFill(n,pool));
function pbTierOf(t,pool,memo,opt){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo,undefined,opt); if(r) return r;
  const mk=pool.mkt||[], E=[...pool.pref,...pool.thin], n=t[2], kM=pbTotalsKMax(n,pool);
  return mk.length?pbTierOn(t,{pref:E,thin:mk},memo,kM,opt):null;
}
""",
     r"""/* (app v144) the likeliest n-leg parlay paying minD or more in full: "the best possible model confidence to match what level
   bet". At DraftKings' fair chance every parlay of a game returns about the same on $1 (each leg's margin, and SGP_HOLD on a
   same-game group), so a parlay's chance is about that return over its price, and the likeliest one paying a level's price is
   one whose price in full lands just over it. That parlay is no likely partial parlay: the likeliest partials are the
   shortest legs, which no fourth leg takes to +700, so a beam by the chance (pbBeam's, app v138 to app v143) could not find
   it. So every parlay of the size is looked at, on the search's own figures (pbCtx: each leg's chance, the price's implied
   chance and its decimal, and each pair's lift by Plackett's integral, as pbJoint works them), and only the few that can be
   the answer are worked in full.

   pbLevelCands: every n legs of the list that go together on one slip (pbPairOk on each pair), with exactly k fill legs (the
   thin list, or the totals on the totals' pass), whose legs multiplied pay minD (a parlay never pays more than that, so none
   short of it can pay in full; the legs walked likeliest first, a branch given up once its legs and the dearest the rest can
   add fall short) and whose approximate price times its slack does (the app v143 rule). Each is kept with its key, the
   lesser of its approximate chance and its approximate return over minD: a parlay that pays minD in full lands at most its
   return over minD, and at most its chance. The best M by key are kept (every tie of the M-th with them, so the same lines
   keep the same parlays whatever the order they were met in), a branch given up where its chance, the rest at their likeliest
   with every lift among them at the pool's largest, cannot reach the M-th; over: whether any was let go.

   pbLevelPick: those walked best key first (a tie to the larger lean, then the lower id, as the search breaks every tie), each
   worked in full by pbExact (its price first, false under minD, then its chance), the likeliest that pays the level (a tie
   to 1e-9 to the larger lean, then the lower id). The walk stops at the first parlay whose key times PB_LV_C is under the
   best's chance in full plus PB_LV_TOL (0.05 points of chance; 1.03: about the 99th percentile of the chance in full over the
   search's reading of chance, and of the return in full over the search's reading of return, on week 9's parlays of 3 to 5
   legs, most of the spread the full sums' own noise). It is a stop measured, not a bound (the review of 7 November 2026):
   that ratio reaches 1.07 on 4 legs and 1.09 on 5, and the levels it took on the payloads of 7 and 1 November were within
   0.105 points of chance of the likeliest of every parlay of their size worked in full, against the full sums' own noise of
   about 0.2 (patch_level_prices.py's docstring has the measurements). Where the kept
   ran out first with some let go (the price starving them: many parlays short of it in full ahead of the one that pays),
   the search is run again keeping eight times as many; and it stops at PB_LV_EVALS parlays worked in full, a bound no real
   game has come near.

   Where that walk finds none that pays though it worked some, a second walk is made: by the search's chance alone, among
   the parlays whose search price already pays the level (mode 1), each worked in full as before, under a bound of its own.
   The key above ties every parlay short of the price with the answer wherever the legs return alike (a parlay's chance
   times its price about the same for all, as at DraftKings' fair chance on lines at one margin), and where the search's
   price also runs above the price in full (legs that all move together, beyond what their pairs say) the first walk can
   spend its bound on parlays that never pay: on a made-up game of 53 correlated lines at -105 to -115, every one of its
   first 7,500 by key fell short in full, where the second walk finds one within 0.08 points of chance of the likeliest
   that pays, after about 6,400 prices worked in full (a price alone costs about a tenth of a millisecond). No game of week
   9 needs it: there the first walk finds every level.

   How close it comes to every parlay of the size worked in full, and how fast, is in patch_level_prices.py's docstring.
   Where pool.pref is not empty (a chance hook's Value picks, setChanceHook) the preferred legs alone are tried first and then
   with k thin legs, fewest first, as every level has been searched since app v100. kMin: the fewest fill legs (1 on the
   totals' pass, whose parlays with none are the first pass's own) */
const PB_LV_C=1.03, PB_LV_TOL=5e-4, PB_LV_M=1500, PB_LV_EVALS=6000, PB_LV_EVALS2=12000;
function pbLevelCands(x,I,fl,n,k,minD,M,mode){
  const m=I.length, out={key:[],set:[],over:false};
  if(m<n) return out;
  const ord=I.map((c,i)=>i).sort((a,b)=>(x.p[I[b]]-x.p[I[a]])||(x.id[I[a]]<x.id[I[b]]?-1:x.id[I[a]]>x.id[I[b]]?1:0));
  const L=Int32Array.from(ord.map(i=>I[i])), FL=Uint8Array.from(ord.map(i=>fl[i]?1:0));
  const P=new Float64Array(m), Q=new Float64Array(m), DE=new Float64Array(m), GC=new Int32Array(m);
  for(let i=0;i<m;i++){ P[i]=x.p[L[i]]; Q[i]=x.q[L[i]]; DE[i]=x.dec[L[i]]; GC[i]=x.gc[L[i]]; }
  /* each pair, by place: whether the two go together, the chance's lift, the book's (two legs of one game alone) */
  const OK=new Uint8Array(m*m), LM=new Float64Array(m*m), LB=new Float64Array(m*m); let Lmax=1;
  for(let a=0;a<m;a++) for(let b=0;b<m;b++){ if(a===b) continue; const ok=pbPairOk(x,L[a],L[b]); OK[a*m+b]=ok?1:0;
    const v=pbLift(x,L[a],L[b],false); LM[a*m+b]=v; if(ok&&v>Lmax) Lmax=v; LB[a*m+b]=GC[a]===GC[b]?pbLift(x,L[a],L[b],true):1; }
  /* the r dearest legs from each place on, multiplied (r up to n) */
  const TOP=new Float64Array((m+1)*(n+1)); { const cur=[]; for(let i=m;i>=0;i--){ if(i<m){ cur.push(DE[i]); cur.sort((a,b)=>b-a); if(cur.length>n) cur.length=n; }
      let pr=1; TOP[i*(n+1)]=1; for(let r=1;r<=n;r++){ pr*=r<=cur.length?cur[r-1]:0; TOP[i*(n+1)+r]=pr; } } }
  const slackOf=c=>c>1?PB_MIN_SLACK[Math.min(c,PB_MIN_SLACK.length-1)]:1;
  /* at each depth: the places that can still join (after the last taken, going with every leg taken), each one's chance
     lifted by the legs taken (WM) and its book chance by the legs taken of its own game (WB); the legs taken; and their
     games (game, count, legs multiplied, the book's chance all land) */
  const CAND=[], WM=[], WB=[]; for(let d=0;d<=n;d++){ CAND.push(new Int32Array(m)); WM.push(new Float64Array(m)); WB.push(new Float64Array(m)); }
  const CN=new Int32Array(n+1), ch=new Int32Array(n), pr=new Float64Array(n+1), mu=new Float64Array(n+1);
  const Gg=new Int32Array((n+1)*n), Gc=new Int32Array((n+1)*n), Gm=new Float64Array((n+1)*n), Gb=new Float64Array((n+1)*n), Gn=new Int32Array(n+1);
  /* (the review of 7 November 2026) pruned again only once another M have come in past what the last prune kept (lim):
     every tie of the M-th is kept, so on a pool of tied legs a prune on every push past 2M was quadratic (24 tied legs of
     one game at 50% and -112, Extreme at +1500: 29 s in one task); the same parlays kept, in the same order, since a prune
     keeps exactly those at or over the M-th of all met and thr only ever rises */
  let thr=-Infinity, keys=[], sets=[], lim=2*M;
  const prune=()=>{ const T=pbKth(Float64Array.from(keys),M), K2=[], S2=[];
    for(let i=0;i<keys.length;i++) if(keys[i]>=T){ K2.push(keys[i]); S2.push(sets[i]); }
    if(K2.length<keys.length) out.over=true; keys=K2; sets=S2; thr=T; lim=Math.max(2*M,keys.length+M); };
  const tw=new Float64Array(m);
  for(let i=0;i<m;i++){ CAND[0][i]=i; WM[0][i]=1; WB[0][i]=1; } CN[0]=m; pr[0]=1; mu[0]=1; Gn[0]=0;
  const rec=(d,nf)=>{
    const need=n-d, C=CAND[d], wm=WM[d], wb=WB[d], cn=CN[d], o=d*n, gn=Gn[d];
    if(need>=2&&thr>-Infinity){ let t=0; for(let s=0;s<cn;s++) tw[t++]=P[C[s]]*wm[s];
      if(t<need) return; const a=tw.subarray(0,t); a.sort(); let ub=pr[d]; for(let r=0;r<need;r++) ub*=a[t-1-r]; ub*=Math.pow(Lmax,need*(need-1)/2);
      if(ub<thr*(1-1e-12)) return; }
    for(let s=0;s<=cn-need;s++){
      const j=C[s], f=FL[j]; if(f){ if(nf>=k) continue; } else if(d-nf>=n-k) continue;
      if(mu[d]*TOP[j*(n+1)+need]<minD*(1-1e-12)) break;
      const p=pr[d]*P[j]*wm[s], mult=mu[d]*DE[j], g=GC[j];
      let gi=-1; for(let t=0;t<gn;t++) if(Gg[o+t]===g){ gi=t; break; }
      if(need===1){
        if(!(mult>=minD*(1-1e-12))||p<thr) continue;
        let dd=1, sl=1;
        for(let t=0;t<gn;t++){ let cnt=Gc[o+t], mm=Gm[o+t], pj=Gb[o+t]; if(t===gi){ cnt++; mm*=DE[j]; pj*=Q[j]*wb[s]; }
          if(cnt<2){ dd*=mm; continue; } pj=Math.max(0,Math.min(1,pj)); dd*=(pj>0&&isFinite(pj))?Math.min(mm,SGP_HOLD/pj):mm; sl*=slackOf(cnt); }
        if(gi<0) dd*=DE[j];
        if(!(mode===1?dd>=minD:dd*sl>=minD)) continue;
        const pp=Math.max(0,Math.min(1,p)), key=mode===1?pp:Math.min(pp,pp*dd/minD);
        if(key<thr) continue;
        ch[d]=j; keys.push(key); const S=new Array(n); for(let a=0;a<n;a++) S[a]=L[ch[a]]; sets.push(S);
        if(keys.length>=lim) prune();
        continue; }
      const o2=(d+1)*n; let gn2=gn;
      for(let t=0;t<gn;t++){ Gg[o2+t]=Gg[o+t]; Gc[o2+t]=Gc[o+t]; Gm[o2+t]=Gm[o+t]; Gb[o2+t]=Gb[o+t]; }
      if(gi<0){ Gg[o2+gn2]=g; Gc[o2+gn2]=1; Gm[o2+gn2]=DE[j]; Gb[o2+gn2]=Q[j]; gn2++; }
      else { Gc[o2+gi]++; Gm[o2+gi]*=DE[j]; Gb[o2+gi]*=Q[j]*wb[s]; }
      Gn[d+1]=gn2; ch[d]=j; pr[d+1]=p; mu[d+1]=mult;
      const C2=CAND[d+1], wm2=WM[d+1], wb2=WB[d+1], row=j*m; let c2=0;
      for(let u=s+1;u<cn;u++){ const v=C[u]; if(!OK[row+v]) continue; C2[c2]=v; wm2[c2]=wm[u]*LM[row+v]; wb2[c2]=wb[u]*LB[row+v]; c2++; }
      CN[d+1]=c2; if(c2<need-1) continue;
      rec(d+1,nf+f); }
  };
  rec(0,0);
  if(keys.length>M) prune();
  out.key=keys; out.set=sets; return out;
}
/* what the last searches did, for the checks and the measurements (parlays worked in full, kept, runs): drawn nowhere */
const PB_LV_STAT={ev:0,kept:0,runs:0,second:0};
function pbLevelPick(x,I,fl,n,k,minD){
  /* the first walk's bound is a run's, as it was; the second's its whole */
  const walk=(mode,cap)=>{ let ev=0;
    for(let M=PB_LV_M;;M*=8){
      const C=pbLevelCands(x,I,fl,n,k,minD,M,mode);
      const E=C.set.map((s,i)=>({key:C.key[i],s,ln:s.reduce((a,c)=>a+x.ln[c],0),id:s.map(c=>x.id[c]).sort().join(',')}));
      E.sort((a,b)=>(pbEvKey(b.key)-pbEvKey(a.key))||(pbEvKey(b.ln)-pbEvKey(a.ln))||a.id.localeCompare(b.id));
      let best=null, done=!C.over, ev0=ev;
      for(const e of E){
        if(best&&e.key*PB_LV_C<best.pr+PB_LV_TOL){ done=true; break; }
        if((mode===1?ev:ev-ev0)>=cap){ done=true; break; }
        ev++; const r=pbExact(e.s.map(c=>x.L[c]),0,minD); if(!r) continue;
        const c={pr:r.corr,ln:e.ln,id:e.id}; if(!best||pbRank('pr')(c,best)<0) best={...c,r}; }
      PB_LV_STAT.ev+=ev-ev0; PB_LV_STAT.kept+=E.length; PB_LV_STAT.runs++;
      if(done) return {r:best?best.r:null,ev}; } };
  const a=walk(0,PB_LV_EVALS); if(a.r||!a.ev) return a.r;
  PB_LV_STAT.second++; return walk(1,PB_LV_EVALS2).r;
}
function pbLevel(n,pool,memo,kMax,minD,kMin){
  const x=pbCtx(memo), P=pool.pref, U=[...pool.pref,...pool.thin], I=U.map(l=>pbCtxLeg(x,l)), fl=U.map((l,i)=>i>=P.length);
  for(let k=kMin||0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const r=pbLevelPick(x,I,fl,n,k,minD); if(r) return r; }
  return null;
}
/* one level: (app v144) the likeliest parlay of its size paying its own least price (t[4]), marked pick 'likeliest' so its
   card and the record say the rule that chose it; null where none does (app v138 to app v143: the least costly over a
   floor of chance, else the likeliest of the size, marked likeliest) */
function pbTierOn(t,pool,memo,kMax,kMin){
  const r=pbLevel(t[2],pool,memo,kMax,t[4],kMin); return r?{...r,pick:'likeliest'}:null;
}
/* the legs with an edge first, exactly as before (preferred, then the fewest thin); only where
   they cannot make a parlay of the level's size at all are the totals added: every leg with an
   edge, preferred and thin alike, is then the base and the totals the only fill, exactly as many
   totals as those legs leave to fill (pbTotalsFill) and no more, so a total never takes the place of a leg with an edge.
   (app v121) Those legs are counted as one parlay can take them, with
   no pair DraftKings refuses (pbMaxFit): a quarterback's passing TDs and his teammate's touchdown are one leg's room,
   not two, so a total fills where they cannot both go.
   (The review of app v143) Since a level of their size shows a parlay wherever they make one, they find none only where
   none they make pays the level's price (or they make none): then the game total may fill one place for the price
   (pbTotalsKMax: as many as they leave, one at most where they leave none), so a level is empty only where no parlay of its
   size in the unit pays it, totals and all. (app v144) The totals' pass looks only at parlays holding one total or more:
   the first pass has looked at every one with none */
const pbTotalsFill=(n,pool)=>Math.max(0,n-pbMaxFit([...pool.pref,...pool.thin]));
const pbTotalsKMax=(n,pool)=>Math.max(1,pbTotalsFill(n,pool));
function pbTierOf(t,pool,memo,opt){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo); if(r) return r;
  const mk=pool.mkt||[], E=[...pool.pref,...pool.thin], n=t[2], kM=pbTotalsKMax(n,pool);
  return mk.length?pbTierOn(t,{pref:E,thin:mk},memo,kM,1):null;
}
""",
     'the search: every parlay of the size looked at, the likeliest paying the level worked in full')

sub1('p3', r"""/* (the review of app v143) whether some n of these legs that go together on one slip (pbFits) pay PB_MIN_DEC or more in
   full (parlayDec, the card's price), at most kMax of them a game total (l.market): true, false, or null where telling""",
     r"""/* (the review of app v143) whether some n of these legs that go together on one slip (pbFits) pay minD or more in full
   (parlayDec, the card's price; app v144: the level's own least price), at most kMax of them a game total (l.market): true, false, or null where telling""",
     'pbPaysAny on a least price of its own')

sub1('p3', r"""   one after it; a whole one is worked in full only where its approximate price (pbDecApprox) times its slack reaches the
   floor, the rule the search keeps a candidate by (at most PB_PAYS_FULL of them, the price in full being the dear part).""",
     r"""   one after it; (app v144) every whole one is worked in full (at most PB_PAYS_FULL of them; a price in full costs about a
   tenth of a millisecond), where until then only those whose approximate price (pbDecApprox) times its slack reached the
   floor were, so a false could stand where the search's price ran under the price in full.""",
     'pbPaysAny: the comment')

sub1('p3', r"""   An empty level says no n legs pay +100 together only where this is false, and else that none was found */
const PB_PAYS_CAP=60000, PB_PAYS_FULL=3000;
function pbPaysAny(list,n,kMax,cap){""",
     r"""   An empty level says no n legs pay its price together only where this is false, and else that none was found */
const PB_PAYS_CAP=60000, PB_PAYS_FULL=3000;
function pbPaysAny(list,n,kMax,cap,minD){""",
     'pbPaysAny takes minD')

sub1('p3', r"""
      if(!(pbDecApprox(cur,memo)*slack(cur)>=PB_MIN_DEC)) return;""",
     r"""""",
     "pbPaysAny: every whole parlay its legs multiplied let through worked in full, none set aside by the search's price")

sub1('p3', r"""  const slack=cur=>{ const c={}; for(const l of cur) c[l.gid]=(c[l.gid]||0)+1; let v=1; for(const k in c) if(c[k]>1) v*=PB_MIN_SLACK[Math.min(c[k],PB_MIN_SLACK.length-1)]; return v; };
""",
     r"""""",
     'pbPaysAny: no slack')

sub1('p3', r"""      if(parlayDec(pbOrder(cur.map(l=>({...l}))).map(l=>({leg:l,ml:l.price})))>=PB_MIN_DEC) hit=true; return; }""",
     r"""      if(parlayDec(pbOrder(cur.map(l=>({...l}))).map(l=>({leg:l,ml:l.price})))>=minD) hit=true; return; }""",
     'pbPaysAny: full at minD')

sub1('p3', r"""      if(b<PB_MIN_DEC) break;""",
     r"""      if(b<minD) break;""",
     'pbPaysAny: bound at minD')

sub1('p3', r"""function pbWhy(n,pool,c){""",
     r"""function pbWhy(n,pool,c,minD){""",
     "pbWhy takes the level's price")

sub1('p3', r"""  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool))===false?`on your picks pay ${PB_MIN_ML}`:`found on your picks that pay ${PB_MIN_ML}`} or more together: tick more games or bet types.`;""",
     r"""  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found. (app v144) the level's own price (minD) */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n){ const ml=pbMinMl(minD); return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool),undefined,minD)===false?`on your picks pay ${ml}`:`found on your picks that pay ${ml}`} or more together: tick more games or bet types.`; }""",
     "pbWhy: the level's own price")

sub1('p3', r"""  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,pool,c)}; });""",
     r"""  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,pool,c,t[4])}; });""",
     "pbBuild: each level's price")

sub1('p3', r"""/* (app v143) a level chosen among the parlays paying +100 or more (t.minDec, carried by the record since) says so; one
   read back from a lock taken before it was chosen without the rule and says what did choose it.
   (app v144) the words are the level's own floor (t.minDec): a level taken from app v144 on says +110, one locked under
   app v143 (minDec 2) the +100 it was chosen at, with the words it was drawn with then (its title no "by the site’s price") */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100), mp=t.minDec?` · ${pbMinMl(t.minDec)}+`:'';
  return t.likeliest?`${mp?'':'the '}likeliest ${n} legs${mp}`:t.floor?`least costly · ${pct}%+`:(mp?`likeliest pair${mp}`:'the likeliest pair');
}
function pbRuleTitle(t){ const n=t.legs.length, pay=t.minDec?`paying at least ${pbMinMl(t.minDec)}`:'';
  if(!t.likeliest&&t.floor) return `Smallest expected loss of the ${n}-leg parlays landing ${Math.round(t.floor*100)}%+ by DraftKings’ fair chance${pay?' and '+pay:''}`;
  return pay?`The likeliest ${n}-leg parlay ${pay}${t.minDec===2?'':' by the site’s price'}: $1 returns ${pbMinUsd(t.minDec)} or more`:''; }""",
     r"""/* (app v143) a level chosen among the parlays paying +100 or more (t.minDec, carried by the record since) says so; one
   read back from a lock taken before it was chosen without the rule and says what did choose it.
   (app v144) a level carrying pick 'likeliest' (every level taken since) is the likeliest parlay of its size paying its own
   least price (t.minDec) and says so: "likeliest pair · +110+", "likeliest 3 legs · +300+", "likeliest 4 legs · +700+",
   "likeliest 5 legs · +1500+", titled "The likeliest 3-leg parlay paying at least +300 by the site’s price: $1 returns $4 or
   more" (the site's price, since that is what the price is met on). One read back from a lock taken before keeps the words it
   was drawn with then, by its own figures: under app v143 (minDec 2, no pick) "likeliest pair · +100+" and "likeliest 3 legs
   · +100+", titled "The likeliest 3-leg parlay paying at least +100: $1 returns $2 or more", and "least costly · 25%+" titled
   "... by DraftKings’ fair chance and paying at least +100"; before app v143 (no minDec) "the likeliest pair", "the likeliest 3
   legs" and "least costly · 25%+", only the last titled */
function pbRuleOf(t){
  const n=t.legs.length;
  if(t.pick==='likeliest'&&t.minDec) return `${n===2?'likeliest pair':`likeliest ${n} legs`} · ${pbMinMl(t.minDec)}+`;
  const pct=Math.round((t.floor||0)*100), mp=t.minDec?` · ${pbMinMl(t.minDec)}+`:'';
  return t.likeliest?`${mp?'':'the '}likeliest ${n} legs${mp}`:t.floor?`least costly · ${pct}%+`:(mp?`likeliest pair${mp}`:'the likeliest pair');
}
function pbRuleTitle(t){ const n=t.legs.length;
  if(t.pick==='likeliest'&&t.minDec) return `The likeliest ${n}-leg parlay paying at least ${pbMinMl(t.minDec)} by the site’s price: $1 returns ${pbMinUsd(t.minDec)} or more`;
  const pay=t.minDec?`paying at least ${pbMinMl(t.minDec)}`:'';
  if(!t.likeliest&&t.floor) return `Smallest expected loss of the ${n}-leg parlays landing ${Math.round(t.floor*100)}%+ by DraftKings’ fair chance${pay?' and '+pay:''}`;
  return pay?`The likeliest ${n}-leg parlay ${pay}: $1 returns ${pbMinUsd(t.minDec)} or more`:''; }""",
     "the words: each level's own rule")

sub1('p3', r"""function spWhy(n,pool,g){""",
     r"""function spWhy(n,pool,g,minD){""",
     "spWhy takes the level's price")

sub1('p3', r"""  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool))===false?`in ${where} pay ${PB_MIN_ML}`:`found in ${where} that pay ${PB_MIN_ML}`} or more together.`;""",
     r"""  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found. (app v144) the level's own price (minD) */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n){ const ml=pbMinMl(minD); return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool),undefined,minD)===false?`in ${where} pay ${ml}`:`found in ${where} that pay ${ml}`} or more together.`; }""",
     "spWhy: the level's own price")

sub1('p3', r"""function spLevel(t,pool,memo,g){ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; }""",
     r"""function spLevel(t,pool,memo,g){ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g,t[4])}; }""",
     "spLevel: the level's price")

sub1('p3', r"""    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per.map(s=>({...s,why:s.tiers[ti]&&s.tiers[ti].why})),u)}; });""",
     r"""    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per.map(s=>({...s,why:s.tiers[ti]&&s.tiers[ti].why})),u,t[4])}; });""",
     "spSlotBuild: the level's price")

sub1('p3', r"""    per.push({noId:pool.noId||0,plGames:pool.plGames,plNoId:pool.plNoId||0,max:pbMaxLegs(all),fit:pbMaxFit(all),why:r?null:spWhy(n,pool,gx)});
    if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best={id,label,n,floor,...r}; }
  return best||{id,label,n,floor,why:spWhySlot(n,per,u)};""",
     r"""    per.push({noId:pool.noId||0,plGames:pool.plGames,plNoId:pool.plNoId||0,max:pbMaxLegs(all),fit:pbMaxFit(all),why:r?null:spWhy(n,pool,gx,t[4])});
    if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best={id,label,n,floor,...r}; }
  return best||{id,label,n,floor,why:spWhySlot(n,per,u,t[4])};""",
     "spSlotLevel: the level's price")

sub1('p3', r"""function spWhySlot(n,per,u){""",
     r"""function spWhySlot(n,per,u,minD){""",
     "spWhySlot takes the level's price")

sub1('p3', r"""  /* (app v143) a game of the slot makes n legs on one slip: none of them pays +100 or more; (the review of app v143) said so
     where each such game's own level says so of itself (shown by pbPaysAny), else that none was found */
  if(m>=n&&f>=n){ const own=`No ${n} legs in this game pay ${PB_MIN_ML} or more together.`, shown=per.every(s=>(s.fit==null?(s.max||0):s.fit)<n||s.why===own);
    return `No ${n} legs ${shown?`of any one game of the Sunday slot pay ${PB_MIN_ML}`:`found in any one game of the Sunday slot that pay ${PB_MIN_ML}`} or more together.`; }""",
     r"""  /* (app v143) a game of the slot makes n legs on one slip: none of them pays +100 or more; (the review of app v143) said so
     where each such game's own level says so of itself (shown by pbPaysAny), else that none was found. (app v144) the
     level's own price (minD) */
  if(m>=n&&f>=n){ const ml=pbMinMl(minD), own=`No ${n} legs in this game pay ${ml} or more together.`, shown=per.every(s=>(s.fit==null?(s.max||0):s.fit)<n||s.why===own);
    return `No ${n} legs ${shown?`of any one game of the Sunday slot pay ${ml}`:`found in any one game of the Sunday slot that pay ${ml}`} or more together.`; }""",
     "spWhySlot: the level's own price")

sub1('p3', r"""  return r?{id:t[0],label:t[1],n:t[2],floor:t[3],...r}:{id:t[0],label:t[1],n:t[2],floor:t[3],why:spWhy(t[2],pool,g)};""",
     r"""  return r?{id:t[0],label:t[1],n:t[2],floor:t[3],...r}:{id:t[0],label:t[1],n:t[2],floor:t[3],why:spWhy(t[2],pool,g,t[4])};""",
     "spRebuild: the level's price")

sub1('p3', r"""   game's is (spSet on the game), and each level the best of theirs: a parlay before none; one without a game total
   before one with one; one that meets its floor before the likeliest of its size; the fewer thin legs; then the better
   expected return (chance times price) where it met a floor, else the higher chance (Safe's, and a likeliest one's); then
   the earlier game of the slot.""",
     r"""   game's is (spSet on the game), and each level the best of theirs: a parlay before none; one without a game total
   before one with one; one that meets its floor before the likeliest of its size; the fewer thin legs; then the better
   expected return (chance times price) where it met a floor, else the higher chance (Safe's, and a likeliest one's); then
   the earlier game of the slot. (app v144) No level has a floor of chance since, so it is the higher chance after the
   totals and the thin legs: each game's level the likeliest paying the level's price, the slot's the likeliest of those.""",
     "the slot's rule, said")

sub1('p3', r"""Within one game that is the order its own search keeps (pbTierOf, pbBestReturn,
   pbLikeliest), so the slot's level is the best same-game parlay its games make by the set's own rule */""",
     r"""Within one game that was the order its own search kept (pbTierOf,
   pbBestReturn, pbLikeliest, until app v144: pbLevel since), so the slot's level is the best same-game parlay its games make by
   the set's own rule */""",
     "the slot rule's comment")

sub1('p3', r"""/* the slack of a parlay the beam scores, from its games' counts (pbGrow's g: game, count, price product, book product) */
const pbMinSlack=G=>{ let v=1; for(let i=0;i<G.length;i+=4){ const c=G[i+1]; if(c>1) v*=PB_MIN_SLACK[Math.min(c,PB_MIN_SLACK.length-1)]; } return v; };
""",
     r"""""",
     "pbMinSlack, the beam's")

sub1('p3', r"""   than an empty box (October 2026). Under All nothing forces or caps a""",
     r"""   than an empty box (October 2026). (app v144: each level is the likeliest parlay of its size paying its own least
   price, PB_TIERS, with no floor of chance and no fallback.) Under All nothing forces or caps a""",
     "the panel's comment")

sub1('p3', r"""   pbCtx and pbGrow below; pbEval stays the reference reading, which the checks hold the search to.) Only the finalists are then worked with the
   real sums, and those are the numbers shown and the floors are held to. */""",
     r"""   pbCtx and pbGrow below; pbEval stays the reference reading, which the checks hold the search to. App v144: the beam is
   gone, and pbLevelCands reads every parlay of a level's size on the same figures, pbCtx's.) Only the finalists are then
   worked with the real sums, and those are the numbers shown and the floors are held to. */""",
     "the score's comment")

sub1('p3', r"""   indexes. Built for pbBeam, which on week 7's sets spent half the tab's time making and hashing the strings pbEval keys
   them by and sorting every step's thousands of candidates whole */""",
     r"""   indexes. Built for pbBeam, which on week 7's sets spent half the tab's time making and hashing the strings pbEval keys
   them by and sorting every step's thousands of candidates whole (app v144: the beam gone, read by pbLevelCands) */""",
     "pbCtx's comment")

sub1('p3', r"""    fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:t.thin||0,mkt:t.mkt||0,...(t.updated?{updated:t.updated}:{}),chance:'fair',...(t.minDec?{minDec:t.minDec}:{})}; }""",
     r"""    fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:t.thin||0,mkt:t.mkt||0,...(t.updated?{updated:t.updated}:{}),chance:'fair',...(t.minDec?{minDec:t.minDec}:{}),...(t.pick?{pick:t.pick}:{})}; }""",
     'spTierOut keeps the rule (pick)')

sub1('p3', r"""  const spec=t&&PB_TIERS.find(s=>s[0]===t.id); if(!spec) return null;
  const head={id:t.id,label:spec[1],n:spec[2],floor:spec[3]};""",
     r"""  const spec=t&&PB_TIERS.find(s=>s[0]===t.id); if(!spec) return null;
  /* (app v144) the floor of chance the level was kept with (its own: 0.25 on a Medium locked before app v144, 0 since) */
  const head={id:t.id,label:spec[1],n:spec[2],floor:typeof t.floor==='number'&&isFinite(t.floor)?t.floor:spec[3]};""",
     'spTierIn: the kept floor')

sub1('p3', r"""  /* (app v143) the price rule it was chosen by, where it was (minDec), so its pill says it; a level taken before has none */
  if(+t.minDec>1) C.minDec=+t.minDec;""",
     r"""  /* (app v143) the price rule it was chosen by, where it was (minDec), so its pill says it; a level taken before has none.
     (app v144) and the rule (pick 'likeliest': the likeliest of its size paying it) */
  if(+t.minDec>1) C.minDec=+t.minDec;
  if(t.pick==='likeliest') C.pick='likeliest';""",
     'spTierIn: the rule')

# (the review of 7 November 2026) the beam's widths, read by nothing since the beam went
sub1('p3', r"""const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40, PB_BEAM=12, PB_WIDE=24, PB_LIKELY=3, PB_FINAL=8;""",
     r"""const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40;""",
     "the beam's widths gone")

sub1('p3', r"""/* (app v111) the search's widths, as the panel has always run them: a caller may widen them (opt), as
   Suggested Parlays does for one game's pool (SP_SEARCH); a call without opt is exactly as before */
const PB_SEARCH={cap:PB_CAP,beam:PB_BEAM,wide:PB_WIDE,likely:PB_LIKELY,final:PB_FINAL};""",
     r"""/* (app v111) the search's widths, as the panel has always run them: a caller may widen them (opt), as
   Suggested Parlays does for one game's pool (SP_SEARCH); a call without opt is exactly as before. (app v144, the review of 7
   November 2026) the cap on each list alone (pbPool): the beam's widths, beam, wide, likely and final, went with pbBeam,
   pbBestReturn and pbLikeliest, and pbTier and pbTierOf no longer read their opt */
const PB_SEARCH={cap:PB_CAP};""",
     'PB_SEARCH the cap alone')

sub1('p3', r"""const SP_SEARCH={cap:60,beam:200,wide:400,likely:40,final:40};""",
     r"""/* (app v144, the review of 7 November 2026) the cap alone: the beam's widths went with it */
const SP_SEARCH={cap:60};""",
     'SP_SEARCH the cap alone')

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched', ', '.join(str(p.name) for p in FILES.values()))
