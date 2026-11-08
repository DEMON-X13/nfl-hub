"""Every level any size, and the Day games one set (app v145).

The owner's calls of 8 November 2026, on Suggested Parlays: "why are they day games only showing one game for each section?
shouldnt all the day games be considered ? like a mix and match", then "also, we can eliminate maximum legs for all the
sections, it cane be multiple legs as long as it meets the criteria of safe and meets min payout requirements", and "so for
example the safe section could sometimes have up to 5-6 legs but it meets safe req and min payout req".

The rule. Each level of every unit (each night game, the Day games, a level built again for a player ruled out, and the
all-games engine getPbTiers, drawn nowhere) is the likeliest parlay of 2 to PB_LV_CAP (12) legs, of any size, whose price in
full (parlayDec on its legs, the figure its card states) is at least its level's own price, app v144's: Safe 2.10 (+110),
Medium 4.00 (+300), Aggressive 8.00 (+700), Extreme 16.00 (+1500). "Likeliest" is the chance the card states, DraftKings' fair
chance by the builder's own sums (parlayProb on legChance); a tie to 1e-9 goes to the fewer legs, then the larger lean (the
model's chance less the fair chance, summed), then the lower id (each leg's pbId, sorted, joined, by localeCompare): pbFreeRank.
Every leg rule is as before (pbFits on every pair, so one leg a player, one side and one total a game and no pair DraftKings
refuses; the 45 to 97% band; V6), and the fill as before: with a preferred list (a chance hook, dormant) the fewest thin legs
first, and a game total only where no parlay of the legs with a chance pays, the fewest totals first. PB_TIERS' third figure
is now the fewest legs, 2 for every level; a built level's n is its legs' count, and an empty one's 2. PB_PICK,
'likeliest-any', marks a level chosen so, where app v144's carried 'likeliest' and a fixed size.

The Day games (the Sunday slot) are one unit: one set across all their games, a level's legs from any of them in any mix.
Its pools are each game's own pbPool([g], SP_ALL, SP_SEARCH), its lists to 60, kept apart by game in the slot's order
(spPools), never pbPool over the slot's games, whose cap of 60 would cut the union of about 400 legs to 60. From app v121 to
app v144 each of the slot's games had its own set and each level was the best of theirs (spSlotBuild, spSlotBetter, gone).
The engine splits its own pool by game the same way (pbSplitPool).

The search. One game (pbFreeOne, pbFreeGame): every candidate set of the game's legs by a depth-first walk over the places,
likeliest first, its chance and price read on the search's pairwise figures (pbCtx, pbLift), a branch let go once its
legs and the dearest the places left can add fall short of the price or its bound falls under the best kept (pbFreeCands),
each candidate keyed by the lesser of its reading's chance and its return over the price, the best 1,500 kept; then a phased
walk (pbFreeWalk) works them best key first in full (pbExact, its price first), stopping where a key times its size's measured
ratio of the full chance over the reading (PB_FREE.C) is under the best, and past it, within the kept, the parlays of the
make the reading understates (a leg linked to two others at opposite signs, pbLvOpp, PB_FREE.C2); run again keeping eight
times as many where candidates were let go, and where none paid, a second walk by the reading's chance alone. Several games
(pbFreeUnit, pbFreeDp): an exact knapsack across games, each game offering its single legs and the same-game groups that can
matter (found by the one-game walk in its front mode and worked in full standalone), a partial carried only while its chance
can still beat the best and its price reach the level's, dominance tie-safe (partials compared in blocks of equal chance and
lean, to 1e-9, so a tie goes to the rule); the complete parlays within 0.004 of the best then worked in full on the card and
checked on pbFits pair by pair. Across games a parlay of single legs is exact in chance and price (legRho is 0 across games,
and parlayDec the product of each game's own price), so on real data every Day games level is exact. pbPaysFree says whether
some parlay of the unit pays a price (a pruned enumeration, the dearest legs first), for the empty level's words.

The words, by each level's own recorded rule. A level taken from app v145 on: its pill "likeliest · +110+", "likeliest ·
+300+", "likeliest · +700+" or "likeliest · +1500+" (its size on the card's own "N legs" pill), titled "The likeliest parlay
paying at least +300 by the site’s price: $1 returns $4 or more" (Safe "$2.10"). One locked under app v144 (pick
'likeliest') keeps "likeliest 3 legs · +300+", one under app v143 its words then, one before app v138 no pill. A Day games
card whose legs span games shows "3 games" after its legs pill (data-pb-tgame the games' ids in the slot's order) and each
leg its own game ("SEA at DEN", pb-lgame); one whose legs are of one game shows that game, as before. The parlay card's
kicker is "Medium parlay · Day games" where the level's legs span games, else its one game. An empty level: "No parlay in this
game pays +300 or more." where pbPaysFree shows none does, "No parlay found in this game that pays +300 or more." where it
cannot tell; the Day games' "No parlay of the Day games pays …" and "No parlay found in the Day games that pays …"; the
engine's "No parlay on your picks pays … : tick more games or bet types." and its "found" twin; no size pill on an empty
level of the rule.

The record. suggest_ledger.js keeps its own copies (LEVEL_DEC, MIN_LEGS 2, CAP 12, PICK 'likeliest-any'); ready() refuses a
page whose PB_TIERS prices, fewest legs, PB_LV_CAP or PB_PICK differ; the guard refuses, on this run's own levels alone, one
outside 2 to 12 legs, whose n is not its count, whose pick is not the rule's or whose price is under its level's; a locked or
graded entry stays byte for byte. spTierIn reads a level back of any size from 2 to 12 whose n is its count, under the pick it
was taken by.

parlayProb counts the hits of 6 to 8 legs without a branch on each leg, as 2 to 5 since app v138 (the same count to the bit):
a 6-leg parlay in full cost 2.2 to 6 ms on the generic loop.

Measured, the page in jsdom, on four payloads at their own clocks (week 9 at Sunday 05:00 and Saturday 18:00 UTC, week 8 at
Sunday 12:00, week 7 at Sunday 10:00), every live unit's four levels against a reference that worked every parlay of every
size (the night games' best of every set by the search's reading, then in full; the Day games' by an exact enumeration of
single legs across games) and against app v144's level: every Day games level is the reference's exactly; every night Safe,
Medium and Aggressive is; the night Extremes within 0.060 points of chance of it (TB at CHI 0.048 and 0.025, CHI at SEA 0.048,
KC at SEA 0.060, four exact), none under app v144's own. The night games' levels are the same sizes as app v144's (2, 3, 4,
5 legs) and the same parlays but where the search now finds a likelier one (BUF at MIN's Extreme 4.675% where app v144 took
4.570%). The Day games mix: on week 9 at Saturday 18:00 Safe two legs of two games at 43.08% (app v144's best single game
38.56%), Medium two legs at 22.38% (19.71%), Aggressive three of three games at 10.59% (9.64%), Extreme four of four games at
5.05% (4.68%); on week 8 43.82%, 21.95%, 10.68% and 5.05% (38.59%, 19.49%, 9.65%, 4.69%); on week 7 43.53%, 22.53%, 10.68%
and 5.03% (38.55%, 19.88%, 9.70%, 4.66%), each at its price; expected return at the fair chance -8% to -19% where app v144's
was -19% to -27%. The largest size chosen on real data is 5, so the cap does not bind there (caps of 5, 10, 12 and 14 give the
same parlays); on made-up pools of 85%+ legs Safe takes 6 and 7 legs and Extreme up to 12. The longest step of a unit's
build (one level) 314 to 412 ms, a unit's whole set with its pools 1.2 to 1.7 s, as app v144's.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k].name}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


# PB_TIERS: every level 2 legs at the fewest, its own price; PB_MIN_SLACK gone
sub1('p3', r"""/* (app v144, the owner's call of 7 November 2026: "in suggested props. i want the med prop to be at least $4 outcome from 1$
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
""",
     r"""/* (app v144, the owner's call of 7 November 2026: "in suggested props. i want the med prop to be at least $4 outcome from 1$
   and aggressive to be $8 or more. I want the best possible model confidence to match what level bet") each level has a
   least price of its own, the fifth figure (a decimal: $1 returns that or more), and no floor of chance (the fourth, 0 for
   every level since): Safe 2.1 (+110: the owner's "yes" of the same day to "I'd raise the floor to about +110, so the real
   slip almost always doubles your bet"), Medium 4 (+300), Aggressive 8 (+700) and Extreme 16 (+1500, the doubling carried on;
   Extreme is hidden on the tab and kept in the record). Each level is the likeliest parlay of its size whose price in full
   pays its own least price (pbLevel, below): "the best possible model confidence" is the chance its card states,
   DraftKings' fair chance by the builder's own sums, since the model's own chance carried nothing beyond it (app v138).
   (app v145, the owner's calls of 8 November 2026: "also, we can eliminate maximum legs for all the sections, it cane be
   multiple legs as long as it meets the criteria of safe and meets min payout requirements" and "so for example the safe
   section could sometimes have up to 5-6 legs but it meets safe req and min payout req") no level has a size of its own:
   the third figure is the fewest legs, 2 for every level, and each level is the likeliest parlay of 2 to PB_LV_CAP legs
   paying its own least price (pbFreeUnit, below); a level built carries its legs' count as its n */
const PB_TIERS=[['safe','Safe',2,0,2.1],['med','Medium',2,0,4],['aggr','Aggressive',2,0,8],['xtrm','Extreme',2,0,16]];
/* (app v143, the owner's call of 7 November 2026: "id want to at least double my bet, so 1$ bet wins 2$") every level pays
   its least price: its price in full (pbExact's dec, parlayDec on its legs, as its card states it) at least the level's own
   (PB_TIERS' fifth figure since app v144; PB_MIN_DEC, one for every level, from app v143 to app v144's first form). The
   search's approximate price only keeps candidates, times a slack for the parlay's size (PB_FREE.SLACK since app v145;
   PB_MIN_SLACK, by each game's count of legs, until then): the price in full is at most 1.02 times the approximate one on a
   2-leg same-game parlay, 1.06 on 3, 1.12 on 4 and 1.22 on 5, so none that pays is dropped. The slack is a ratio and holds at
   any least price. The price is met on the site's own estimate of DraftKings' same-game price (parlayDec's SGP_HOLD, off by
   about 5% either way on the tickets it was fitted on), which is why Safe's sits at +110, 5% over doubling. pbMinMl and
   pbMinUsd word a least price from its decimal ("+110", "$2.10", "+300", "$4"), so a level's words follow the price it
   carries (minDec), never the page's table alone */
""",
     'PB_TIERS: every level 2 legs at the fewest, its own price; PB_MIN_SLACK gone')

# pbPaysFree in place of pbPaysAny
sub1('p3', r"""/* (the review of app v143) whether some n of these legs that go together on one slip (pbFits) pay minD or more in full
   (parlayDec, the card's price; app v144: the level's own least price), at most kMax of them a game total (l.market): true, false, or null where telling
   would take more than PB_PAYS_CAP parlays. A parlay never pays more than its legs multiplied, so the legs are tried
   highest price first and a partial whose price times the best the places left can add falls short is let go, with every
   one after it; (app v144) every whole one is worked in full (at most PB_PAYS_FULL of them; a price in full costs about a
   tenth of a millisecond), where until then only those whose approximate price (pbDecApprox) times its slack reached the
   floor were, so a false could stand where the search's price ran under the price in full.
   An empty level says no n legs pay its price together only where this is false, and else that none was found */
const PB_PAYS_CAP=60000, PB_PAYS_FULL=3000;
function pbPaysAny(list,n,kMax,cap,minD){
  const L=list.map(l=>({l,d:mlToDec(l.price)||1})).sort((a,b)=>b.d-a.d), m=L.length, memo=new Map(), lim=cap||PB_PAYS_CAP;
  if(m<n) return false;
  let seen=0, full=0, hit=false, over=false;
  const rec=(i0,cur,prod,fill)=>{ const need=n-cur.length;
    if(!need){ if(++seen>lim){ over=true; return; }
      if(++full>PB_PAYS_FULL){ over=true; return; }
      if(parlayDec(pbOrder(cur.map(l=>({...l}))).map(l=>({leg:l,ml:l.price})))>=minD) hit=true; return; }
    for(let i=i0;i<=m-need&&!hit&&!over;i++){
      let b=prod; for(let j=i;j<i+need;j++) b*=L[j].d;
      if(b<minD) break;
      const c=L[i].l, f2=fill+(c.market?1:0); if(kMax!=null&&f2>kMax) continue;
      if(!pbFits(cur,c)) continue;
      cur.push(c); rec(i+1,cur,prod*L[i].d,f2); cur.pop(); } };
  rec(0,[],1,0); return hit?true:over?null:false;
}
""",
     r"""/* (app v145) whether some 2 to cap (PB_LV_CAP) of these legs that go together on one slip (pbFits) pay minD or more in full
   (parlayDec, the card's price): true, false, or null where telling would take more than PB_PAYS_CAP sets or PB_PAYS_FULL
   prices in full. A parlay never pays more than its legs multiplied, so the legs are tried highest price first and a branch
   whose price times the dearest the places left can add falls short is let go, with every one after it; every set whose
   legs multiplied reach minD is worked in full (a price in full costs about a tenth of a millisecond). The totals are in the
   list where the level may take them (any number, one a game by pbFits), as the search's totals' pass takes them. An empty
   level says no parlay pays its price only where this is false, and else that none was found. (app v143 to app v144:
   pbPaysAny, of exactly n legs) */
const PB_PAYS_CAP=60000, PB_PAYS_FULL=3000;
function pbPaysFree(list,minD,cap){
  cap=cap||PB_LV_CAP;
  const L=list.map(l=>({l,d:mlToDec(l.price)||1})).sort((a,b)=>b.d-a.d), m=L.length, cur=[];
  if(m<2) return false;
  let seen=0, full=0, hit=false, over=false;
  const rec=(i0,prod)=>{
    for(let i=i0;i<m&&!hit&&!over;i++){
      let b=prod; for(let j=i,r=cap-cur.length;j<m&&r>0;j++,r--) b*=L[j].d;
      if(b<minD) break;
      const c=L[i].l; if(!pbFits(cur,c)) continue;
      cur.push(c); const p2=prod*L[i].d;
      if(cur.length>=2){ if(++seen>PB_PAYS_CAP) over=true;
        else if(p2>=minD){ if(++full>PB_PAYS_FULL) over=true;
          else if(parlayDec(pbOrder(cur.map(l=>({...l}))).map(l=>({leg:l,ml:l.price})))>=minD) hit=true; } }
      if(!hit&&!over&&cur.length<cap) rec(i+1,p2);
      cur.pop(); } };
  rec(0,1); return hit?true:over?null:false;
}
""",
     'pbPaysFree in place of pbPaysAny')

# the search: any size, the Day games one set
sub1('p3', r"""/* (app v144) the likeliest n-leg parlay paying minD or more in full: "the best possible model confidence to match what level
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
   about 0.2 (patch_level_prices.py's docstring has the measurements). Past that stop the walk goes on, without running the
   search again, down to the key times PB_LV_C2 (by the parlay's size: 1.12 on 3 legs, 1.15 on 4, 1.18 on 5), working in full
   only the parlays the search's reading understates by its own make (pbLvOpp: a leg linked to two others of the parlay at
   opposite effective signs, each of 0.1 or more, as a quarterback's passing yards over with one receiver under and another
   over: conditioned on him, the pairwise reading takes the two receivers as unrelated, where they move together, so the
   chance in full runs up to 9% over it on 3 legs, 12% on 4 and 15% on 5, against 1% for every other shape of star); such a
   parlay is rare near the top of a real game's (1 to 6% of the candidates of week 9's), so this costs about a fifth more
   time and moves no level of week 9's or week 8's, where without it a parlay built so as to be the likeliest at the price,
   beside a rival just over the stop, was missed by 0.33 points of chance on 3 legs and 0.64 on 4. Where the kept
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
/* (the review of 7 November 2026) the walk past its stop: how far, by the parlay's size, and the signs it looks for */
const PB_LV_C2=[1,1,1,1.12,1.15,1.18], PB_LV_OPP=0.1;
/* whether a leg of the parlay (its legs' places in x) is linked to two others at opposite effective signs (each correlation
   with the legs' sides, an under turning it, of PB_LV_OPP or more) */
function pbLvOpp(x,s){
  const n=s.length, R=new Float64Array(n*n);
  for(let a=0;a<n;a++) for(let b=a+1;b<n;b++){ const A=x.L[s[a]], B=x.L[s[b]], r=legRho(A,B)*(A.side==='under'?-1:1)*(B.side==='under'?-1:1); R[a*n+b]=r; R[b*n+a]=r; }
  for(let b=0;b<n;b++) for(let a=0;a<n;a++){ if(a===b) continue; const u=R[a*n+b]; if(Math.abs(u)<PB_LV_OPP) continue;
    for(let c=a+1;c<n;c++){ if(c===b) continue; const v=R[b*n+c]; if(Math.abs(v)>=PB_LV_OPP&&u*v<0) return true; } }
  return false;
}
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
const PB_LV_STAT={ev:0,kept:0,runs:0,second:0,opp:0};
function pbLevelPick(x,I,fl,n,k,minD){
  /* the first walk's bound is a run's, as it was; the second's its whole */
  const walk=(mode,cap)=>{ let ev=0;
    for(let M=PB_LV_M;;M*=8){
      const C=pbLevelCands(x,I,fl,n,k,minD,M,mode);
      const E=C.set.map((s,i)=>({key:C.key[i],s,ln:s.reduce((a,c)=>a+x.ln[c],0),id:s.map(c=>x.id[c]).sort().join(',')}));
      E.sort((a,b)=>(pbEvKey(b.key)-pbEvKey(a.key))||(pbEvKey(b.ln)-pbEvKey(a.ln))||a.id.localeCompare(b.id));
      /* past: the walk has reached its stop (PB_LV_C), and goes on to PB_LV_C2's working the opposite-sign parlays alone,
         within the parlays kept: past it, the search is never run again */
      let best=null, done=!C.over, ev0=ev, past=false; const c2=PB_LV_C2[Math.min(n,PB_LV_C2.length-1)];
      for(const e of E){
        if(best&&e.key*PB_LV_C<best.pr+PB_LV_TOL){ past=true; if(e.key*c2<best.pr+PB_LV_TOL) break; if(!pbLvOpp(x,e.s)) continue; PB_LV_STAT.opp++; }
        if((mode===1?ev:ev-ev0)>=cap){ done=true; break; }
        ev++; const r=pbExact(e.s.map(c=>x.L[c]),0,minD); if(!r) continue;
        const c={pr:r.corr,ln:e.ln,id:e.id}; if(!best||pbRank('pr')(c,best)<0) best={...c,r}; }
      if(past) done=true;
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
/* a level with its fair chance (parlayFair on its legs, in the builder's order), worked once it is chosen */
const pbWithFair=r=>r&&r.legs?{...r,fair:parlayFair(r.legs)}:r;
function pbTier(t,pool,memo,opt){ return pbWithFair(pbTierOf(t,pool,memo,opt)); }
""",
     r"""/* (app v145) every level of every unit is the likeliest parlay of 2 to PB_LV_CAP legs, of any size (the owner's calls of 8
   November 2026: "also, we can eliminate maximum legs for all the sections, it cane be multiple legs as long as it meets the
   criteria of safe and meets min payout requirements", "so for example the safe section could sometimes have up to 5-6 legs
   but it meets safe req and min payout req"), whose price in full (pbExact's dec, parlayDec, the card's price) is at least
   its own least price (PB_TIERS' fifth figure): "likeliest" the chance the card states (pbExact's corr, parlayProb on
   legChance), a tie to 1e-9 to the fewer legs, then the larger lean, then the lower id (pbFreeRank). And the Day games (the
   Sunday slot) are one set across all their games (the owner's "why are they day games only showing one game for each
   section? shouldnt all the day games be considered ? like a mix and match"): a level's legs from any of its games in any
   mix, each game's own pool (pbPool on the game, its lists to 60) kept apart by game.

   What the search rests on, verified in the page: legs of different games never move together (legRho 0), and parlayDec is
   the product over games of each game's own group price (a game's one leg its decimal; two or more its same-game price,
   SGP_HOLD over their joint implied chance, never above multiplying). parlayProb is the exact product where no pair moves
   together and a seeded draw over every leg where one does. So it decomposes by game.

   One game (a night game, or a unit of one game): pbFreeCands walks every set of 2 to cap of its legs that go together on
   one slip (pbPairOk on each pair) depth first, the legs likeliest first, on the search's own figures (pbCtx: each leg's
   chance, the price's implied chance and decimal, each pair's lift by Plackett's integral). A set is a candidate where its
   approximate price times PB_FREE.SLACK at its size pays the level (the price in full runs up to that over the reading), kept
   by its key, the lesser of its approximate chance and its approximate return over the price; the best M keys are kept and
   none under (1 - DELTA) of the best met, and a branch is given up where the most its chance or its return over the price
   could reach, the legs that can still join each lifting it at most by every lift over 1 they can meet, falls under the
   M-th (and in the price's own reading where the legs left cannot reach it at their dearest). pbFreeWalk works them best
   key first in full (pbExact, its price first), the likeliest that pays kept: phase 1 to the first whose key times
   PB_FREE.C at its size is under the best's chance plus TOL (C: the 99th percentile of the chance in full over the reading,
   by size), at most E1 worked; phase 2 past it, the opposite-sign parlays (pbLvOpp) alone, to C2 at their size, at most E2.
   Where some were let go and none paid, the search runs again keeping eight times as many (to 64 times); where it worked
   some and none paid, a second walk by the reading's chance alone among those whose reading already pays (at most E3), for
   pools where the key order starves (every leg returning alike while the reading's price runs over the price in full).

   Several games (the Day games, the all-games engine): pbFreeDp, an exact knapsack across games: each game gives one option
   or none, its single legs and, where they can help, its same-game groups; a partial is cut where its chance (to 1e-9), its
   price at the dearest the games left can add, or its chance times the best return they can add over the price, cannot
   reach the best complete one, and a partial goes where another of no more legs, at least its price and the same fill count
   has a better chance and lean (to 1e-9), or the same and is not alike on legs and price (alike ones all kept: the id
   decides on the card). A parlay is complete with 2 legs or more, its fill count exact and its price at least the level's
   (within PB_FREE.BORDER of it, worked on the card). The groups (pbFreeUnit): each game's sets (pbFreeCands' front mode)
   whose chance, where they cannot pay alone at most the best the other games return (rO, the best single leg's chance times
   price, to the power of the games left), can reach the singles' best; a parlay holding a group under that cannot beat it.
   Each game keeps its best PB_FREE.FM (300) groups by that key: where legs return more than they cost (a line priced with
   no margin or less than none, rO over 1) the bound lets every group of a game through, and on the audit's made-up lines,
   every starter's line at -112 or -150 and a total at +110/+105, the Day games' Extreme ran past 2 GB and 8 minutes; on
   real data no game came near 300 and no group ever entered a level.
   The complete parlays within PB_FREE.WIN of the best (BORDER with no group) are worked on the card, at most WIN_EVALS, every
   pair held to pbFits, the likeliest that pays by pbFreeRank.

   Passes (both): where pool.pref is not empty (a chance hook's Value picks, setChanceHook; dormant) parlays of exactly k thin
   legs, k from 0, the first k that pays; else one pass on pref and thin. Where none pays, the totals' pass: pref and thin the
   base and the totals the fill, exactly k totals for k from 1 (one at most in one game), the first k that pays (fewest
   totals first, as app v144's pbLevel). None: the level is empty.

   How close it comes to an independent enumeration of every parlay, and how fast, is in patch_free_legs.py's docstring.
   (app v144 to app v145: pbLevelCands, pbLevelPick and pbLevel, each level a fixed size; the Sunday slot each game's own set,
   the slot's level the best of theirs, spSlotBuild) */
const PB_LV_CAP=12, PB_PICK='likeliest-any';
const PB_FREE={M:1500,DELTA:0.15,TOL:5e-4,E1:1500,E2:300,E3:12000,
  SLACK:[1,1,1.05,1.10,1.20,1.30,1.35,1.40,1.45,1.50,1.55,1.60,1.65],
  C:[1,1,1.03,1.04,1.05,1.06,1.08,1.09,1.10,1.11,1.12,1.13,1.14],
  C2:[1,1,1,1.12,1.15,1.18,1.21,1.24,1.27,1.30,1.33,1.36,1.39],
  FRONT:1.03,FM:300,TRIES:8,WIN:0.004,WIN_EVALS:2000,BORDER:1e-9};
/* (the review of 7 November 2026) the opposite-sign make (pbLvOpp): each link of 0.1 or more */
const PB_LV_OPP=0.1;
/* whether a leg of the parlay (its legs' places in x) is linked to two others at opposite effective signs (each correlation
   with the legs' sides, an under turning it, of PB_LV_OPP or more) */
function pbLvOpp(x,s){
  const n=s.length, R=new Float64Array(n*n);
  for(let a=0;a<n;a++) for(let b=a+1;b<n;b++){ const A=x.L[s[a]], B=x.L[s[b]], r=legRho(A,B)*(A.side==='under'?-1:1)*(B.side==='under'?-1:1); R[a*n+b]=r; R[b*n+a]=r; }
  for(let b=0;b<n;b++) for(let a=0;a<n;a++){ if(a===b) continue; const u=R[a*n+b]; if(Math.abs(u)<PB_LV_OPP) continue;
    for(let c=a+1;c<n;c++){ if(c===b) continue; const v=R[b*n+c]; if(Math.abs(v)>=PB_LV_OPP&&u*v<0) return true; } }
  return false;
}
/* what the last searches did, for the checks and the measurements (parlays worked in full, kept, runs): drawn nowhere */
const PB_LV_STAT={ev:0,kept:0,runs:0,second:0,opp:0,groups:0};
/* the rule's order: the chance to 1e-9, then the fewer legs, then the larger lean (to 1e-9), then the lower id */
const pbFreeRank=(a,b)=>(pbEvKey(b.pr)-pbEvKey(a.pr))||(a.n-b.n)||(pbEvKey(b.ln)-pbEvKey(a.ln))||a.id.localeCompare(b.id);
/* one game's sets of 2 to cap of I (places in x), kept by key. mode 'level': the M best keys (min(c, c*d/F) where the price
   read times its slack pays F); 'level1' (the second walk): c where the price read pays; 'front' (a group of a game of
   several): every set whose key (c where it pays F, else c*rOb*d/F) is at least thr0. fl, k: the fill legs (fl[i]) and exactly
   how many a candidate holds (none, k null). c is the reading's chance (each leg's chance times its lifts with the legs taken,
   never above the parent's), q the book's, mult the legs multiplied, psi = SGP_HOLD * prod(p/q) * prod(lift/book lift) */
function pbFreeCands(x,I,F,cap,M,mode,thr0,rOb,fl,k){
  const m=I.length, out={key:[],set:[],over:false}; if(m<2) return out;
  const ord=I.map((c,i)=>i).sort((a,b)=>(x.p[I[b]]-x.p[I[a]])||(x.id[I[a]]<x.id[I[b]]?-1:x.id[I[a]]>x.id[I[b]]?1:0));
  const L=Int32Array.from(ord.map(i=>I[i])), FL=Uint8Array.from(ord.map(i=>fl&&fl[i]?1:0)), FR=mode==='front', SL=PB_FREE.SLACK;
  const P=new Float64Array(m), Q=new Float64Array(m), DE=new Float64Array(m), R=new Float64Array(m);
  for(let i=0;i<m;i++){ P[i]=x.p[L[i]]; Q[i]=x.q[L[i]]; DE[i]=x.dec[L[i]]; R[i]=P[i]/Q[i]; }
  const OK=new Uint8Array(m*m), LM=new Float64Array(m*m), LB=new Float64Array(m*m), SQ=new Float64Array(m*m), SIG=new Float64Array(m).fill(1), SIGC=new Float64Array(m).fill(1);
  for(let a=0;a<m;a++) for(let b=0;b<m;b++){ if(a===b) continue; const ok=pbPairOk(x,L[a],L[b]); OK[a*m+b]=ok?1:0;
    const lm=pbLift(x,L[a],L[b],false), lb=pbLift(x,L[a],L[b],true); LM[a*m+b]=lm; LB[a*m+b]=lb; const s=Math.sqrt(Math.max(1,lm/lb)); SQ[a*m+b]=s;
    if(ok){ SIG[a]*=s; SIGC[a]*=Math.sqrt(Math.max(1,lm)); } }
  /* the r dearest legs from each place on, multiplied (r up to cap; a missing factor 1) */
  const W=cap+1, TOP=new Float64Array((m+1)*W); { const cur=[]; for(let i=m;i>=0;i--){ if(i<m){ cur.push(DE[i]); cur.sort((a,b)=>b-a); if(cur.length>cap) cur.length=cap; }
      let pr=1; TOP[i*W]=1; for(let r=1;r<=cap;r++){ pr*=r<=cur.length?cur[r-1]:1; TOP[i*W+r]=pr; } } }
  const CAND=[], WM=[], WB=[], WS=[]; for(let d=0;d<=cap;d++){ CAND.push(new Int32Array(m)); WM.push(new Float64Array(m)); WB.push(new Float64Array(m)); WS.push(new Float64Array(m)); }
  const CN=new Int32Array(cap+1), ch=new Int32Array(cap), pr=new Float64Array(cap+1), pb=new Float64Array(cap+1), mu=new Float64Array(cap+1), ps=new Float64Array(cap+1);
  let thr=FR?thr0:-Infinity, keys=[], sets=[], lim=2*M, kmax=-Infinity;
  /* the kept: the M best keys, and none under (1-DELTA) times the best met; pruned again only once another M have come in
     past what the last prune kept, every tie of the M-th kept (app v144's rule) */
  const prune=()=>{ const kth=pbKth(Float64Array.from(keys),Math.min(M,keys.length)), T=FR?Math.max(thr0,kth):Math.max(kth,kmax*(1-PB_FREE.DELTA)), K2=[], S2=[];
    for(let i=0;i<keys.length;i++) if(keys[i]>=T){ K2.push(keys[i]); S2.push(sets[i]); }
    if(K2.length<keys.length) out.over=true; keys=K2; sets=S2; thr=T; lim=Math.max(2*M,keys.length+M); };
  for(let i=0;i<m;i++){ CAND[0][i]=i; WM[0][i]=1; WB[0][i]=1; WS[0][i]=1; } CN[0]=m; pr[0]=1; pb[0]=1; mu[0]=1; ps[0]=SGP_HOLD;
  const rec=(d,nf)=>{
    const C=CAND[d], wm=WM[d], wb=WB[d], ws=WS[d], cn=CN[d];
    for(let s=0;s<cn;s++){
      const j=C[s]; if(k!=null&&FL[j]&&nf>=k) continue;
      const c=d?Math.min(pr[d],pr[d]*P[j]*wm[s]):P[j], q=Math.min(1,pb[d]*Q[j]*wb[s]), mult=mu[d]*DE[j], psi=ps[d]*R[j]*wm[s]/wb[s], n=d+1, nf2=nf+FL[j];
      if(c<thr) continue;
      const dd=n>=2?Math.min(mult,(q>0?SGP_HOLD/q:mult)):mult;
      if(n>=2&&(k==null||nf2===k)){
        const key=FR?(dd>=F?c:c*rOb*dd/F):mode==='level1'?(dd>=F?c:-1):(dd*SL[Math.min(n,SL.length-1)]>=F?Math.min(c,c*dd/F):-1);
        if(key>=thr&&key>0){ ch[d]=j; keys.push(key); const S=new Array(n); for(let a=0;a<n;a++) S[a]=L[ch[a]]; sets.push(S);
          if(FR){ if(M&&keys.length>=lim) prune(); } else { if(keys.length>=lim) prune(); if(key>kmax){ kmax=key; if(kmax*(1-PB_FREE.DELTA)>thr) thr=kmax*(1-PB_FREE.DELTA); } } } }
      if(n>=cap) continue;
      if(!FR&&mult*TOP[(j+1)*W+(cap-n)]<F*(1-1e-12)) continue;
      /* the child's legs, their lifts, and H: the most the legs that can still join can raise psi (each leg's p/q times every
         lift ratio over 1 it can meet, the legs taken in full and the rest at their square root) */
      const C2=CAND[d+1], wm2=WM[d+1], wb2=WB[d+1], ws2=WS[d+1], row=j*m; let c2=0, H=1, g1=0, g2=0, g3=0, p1=0, p2=0, p3=0;
      for(let u=s+1;u<cn;u++){ const v=C[u]; if(!OK[row+v]) continue; const a=wm[u]*LM[row+v]; C2[c2]=v; wm2[c2]=a; wb2[c2]=wb[u]*LB[row+v]; const w2=ws[u]*SQ[row+v]; ws2[c2]=w2;
        const g=R[v]*SIG[v]*w2; if(g>1) H*=g; if(g>g1){ g3=g2; g2=g1; g1=g; } else if(g>g2){ g3=g2; g2=g; } else if(g>g3) g3=g;
        const pc=P[v]*a*SIGC[v]; if(pc>p1){ p3=p2; p2=p1; p1=pc; } else if(pc>p2){ p3=p2; p2=pc; } else if(pc>p3) p3=pc; c2++; }
      if(!c2) continue;
      /* every set under this one has a leg more at least (its growth g and chance factor p the best one leg left can give);
         in the level modes one that cannot pay yet two or three more where the dearest legs left cannot bring it to F, and
         in front mode one that cannot pay alone is completed by the other games' options, at most rOb on the return */
      let fe=Math.min(1,g1), fc=Math.min(1,p1);
      if(!FR){ const T0=(j+1)*W;
        if(mult*TOP[T0+1]*SL[Math.min(n+1,SL.length-1)]<F){ fe*=Math.min(1,g2); fc*=Math.min(1,p2);
          if(mult*TOP[T0+2]*SL[Math.min(n+2,SL.length-1)]<F){ fe*=Math.min(1,g3); fc*=Math.min(1,p3); } } }
      else if(mult*TOP[(j+1)*W+(cap-n)]<F) fe*=Math.min(1,rOb);
      if(Math.min(c*fc,psi*H*fe/F)<thr) continue;
      CN[d+1]=c2; ch[d]=j; pr[d+1]=c; pb[d+1]=q; mu[d+1]=mult; ps[d+1]=psi;
      rec(d+1,nf2); }
  };
  rec(0,0);
  if((!FR||M)&&keys.length>M) prune();
  PB_LV_STAT.kept+=keys.length;
  out.key=keys; out.set=sets; return out;
}
/* the walk: the candidates best key first (a tie to the larger lean, then the lower id), each worked in full (pbExact: its
   price first, false under F), the likeliest that pays by pbFreeRank. Phase 1 stops where the key times the largest C left
   is under the best's chance plus TOL, setting aside one whose own C falls short (at most E1 worked; E3 on the second walk,
   mode 1); phase 2, with a best and not on the second walk, the set aside and the rest, in order, the opposite-sign ones
   alone (pbLvOpp) to max(C, C2) at their size, at most E2 */
function pbFreeWalk(x,cand,F,mode){
  const E=cand.set.map((s,i)=>({key:cand.key[i],s,ln:s.reduce((a,c)=>a+x.ln[c],0),id:s.map(c=>x.id[c]).sort().join(',')}));
  E.sort((a,b)=>(pbEvKey(b.key)-pbEvKey(a.key))||(pbEvKey(b.ln)-pbEvKey(a.ln))||a.id.localeCompare(b.id));
  const C=PB_FREE.C, C2=PB_FREE.C2, TOL=PB_FREE.TOL, SUFC=new Float64Array(E.length+1);
  for(let i=E.length-1;i>=0;i--) SUFC[i]=Math.max(SUFC[i+1],C[E[i].s.length]);
  let best=null, ev=0, ev2=0, i=0; const rest=[];
  const work=e=>{ const r=pbExact(e.s.map(c=>x.L[c]),0,F); if(!r) return; const c={pr:r.corr,n:e.s.length,ln:e.ln,id:e.id}; if(!best||pbFreeRank(c,best)<0) best={...c,r}; };
  const cap=mode===1?PB_FREE.E3:PB_FREE.E1;
  for(;i<E.length;i++){ const e=E[i], n=e.s.length;
    if(best&&e.key*SUFC[i]<best.pr+TOL) break;
    if(best&&e.key*C[n]<best.pr+TOL){ rest.push(e); continue; }
    if(ev>=cap) break; ev++; work(e); }
  if(best&&mode!==1){ for(;i<E.length;i++) rest.push(E[i]);
    for(const e of rest){ const n=e.s.length; if(e.key*Math.max(C[n],C2[n])<best.pr+TOL) continue; if(!pbLvOpp(x,e.s)) continue; if(ev2>=PB_FREE.E2) break; ev2++; PB_LV_STAT.opp++; work(e); } }
  PB_LV_STAT.ev+=ev+ev2; PB_LV_STAT.runs++;
  return {best,ev:ev+ev2};
}
/* one game, one pass: legs (fl, k: the fill legs and exactly how many) */
function pbFreeGame(x,legs,fl,k,F,cap){
  const I=legs.map(l=>pbCtxLeg(x,l)); let worked=0;
  for(let M=PB_FREE.M;;M*=8){ const c=pbFreeCands(x,I,F,cap,M,'level',0,1,fl,k), w=pbFreeWalk(x,c,F,0); worked+=w.ev;
    if(w.best) return w.best.r; if(!c.over||M>=PB_FREE.M*64) break; }
  if(!worked) return null;
  PB_LV_STAT.second++; const c=pbFreeCands(x,I,F,cap,PB_FREE.M,'level1',0,1,fl,k), w=pbFreeWalk(x,c,F,1); return w.best?w.best.r:null;
}
/* one game's level: the passes */
function pbFreeOne(pool,F,memo,cap){
  const x=pbCtx(memo), P=pool.pref, base=[...P,...pool.thin];
  if(P.length){ const fl=base.map((l,i)=>i>=P.length);
    for(let k=0;k<=cap&&k<=pool.thin.length;k++){ const r=pbFreeGame(x,base,fl,k,F,cap); if(r) return r; } }
  else { const r=pbFreeGame(x,base,null,null,F,cap); if(r) return r; }
  const mk=pool.mkt||[], nT=new Set(mk.map(l=>l.gid)).size; if(!nT) return null;
  const all=[...base,...mk], fl=all.map((l,i)=>i>=base.length);
  for(let k=1;k<=nT;k++){ const r=pbFreeGame(x,all,fl,k,F,cap); if(r) return r; }
  return null;
}
/* the knapsack across games: G, a game's options each {c, d, n, ln, legs, t (its fill count)}; k: exactly how many fill legs
   (none, null); tol: how far under the best a complete parlay is returned */
function pbFreeDp(G0,F,cap,tol,k){
  const G=G0.map(g=>g.filter(o=>o.n<=cap)), m=G.length, Dmax=new Float64Array(m+1), Rmax=new Float64Array(m+1); Dmax[m]=1; Rmax[m]=1;
  for(let i=m-1;i>=0;i--){ let dm=1, rm=1; for(const o of G[i]){ if(o.d>dm) dm=o.d; if(o.c*o.d>rm) rm=o.c*o.d; } Dmax[i]=Dmax[i+1]*dm; Rmax[i]=Rmax[i+1]*rm; }
  const B=PB_FREE.BORDER, hi=F*(1+B), lo=F*(1-B), EPS=1e-12;
  let Pp=[{c:1,d:1,n:0,ln:0,kc:pbEvKey(1),kl:0,t:0,o:[]}], best=0, low=-Infinity, done=[];
  const setBest=c=>{ if(c>best){ best=c; low=pbEvKey(Math.max(0,best-tol)); } };
  /* a price at the border worked on the card (parlayDec on its legs, in the builder's order) */
  const pays=q=>q.d>=hi||parlayDec(pbOrder(q.o.flatMap(o=>o.legs).map(l=>({...l}))).map(l=>({leg:l,ml:l.price})))>=F;
  for(let i=0;i<m;i++){ const nx=Pp.slice();
    for(const p of Pp) for(const o of G[i]){ const n=p.n+o.n; if(n>cap) continue; const tt=p.t+(o.t||0); if(k!=null&&tt>k) continue;
      const c=p.c*o.c, kc=pbEvKey(c); if(kc<low) continue; const d=p.d*o.d, ln=p.ln+o.ln;
      const q={c,d,n,ln,kc,kl:pbEvKey(ln),t:tt,o:p.o.concat(o)};
      if(n>=2&&(k==null||tt===k)&&d>=lo&&pays(q)){ done.push(q); setBest(c); continue; }
      nx.push(q); }
    const keep=[], dm=Dmax[i+1], rm=Rmax[i+1];
    for(const p of nx){ if(p.kc<low||p.d*dm<F*(1-EPS)) continue; const ub=p.c*p.d*rm/F; if(ub<p.c&&pbEvKey(ub)<low) continue; keep.push(p); }
    keep.sort((a,b)=>(a.t-b.t)||(b.kc-a.kc)||(b.kl-a.kl)||(b.d-a.d)||(a.n-b.n));
    /* tie-safe dominance, within each fill count: B goes where a kept partial of an earlier (chance key, lean key) block has
       no more legs and at least its price, or one of its own block does and is not alike on legs and price */
    Pp=[]; const bestD=new Float64Array(cap+1).fill(-1); let curT=-1;
    for(let a=0;a<keep.length;){ if(keep[a].t!==curT){ curT=keep[a].t; bestD.fill(-1); }
      let b=a; const kc=keep[a].kc, kl=keep[a].kl, tt=keep[a].t; while(b<keep.length&&keep[b].kc===kc&&keep[b].kl===kl&&keep[b].t===tt) b++;
      const blk=[];
      for(let t=a;t<b;t++){ const p=keep[t]; let dom=false; for(let n=0;n<=p.n;n++) if(bestD[n]>=p.d){ dom=true; break; }
        if(!dom) for(const q of blk){ if(q.n<=p.n&&q.d>=p.d&&!(q.n===p.n&&q.d===p.d)){ dom=true; break; } }
        if(!dom){ blk.push(p); Pp.push(p); } }
      for(const q of blk) if(q.d>bestD[q.n]) bestD[q.n]=q.d;
      a=b; }
  }
  done=done.filter(q=>q.kc>=low); done.sort((a,b)=>(b.c-a.c)||(a.n-b.n)||(b.ln-a.ln)); return {best,done};
}
/* a unit's level: pools, one {pref, thin, mkt} a game (a game with no legs dropped); one game, its own search; several, the
   knapsack, each game's single legs and, where they can help, its groups */
function pbFreeUnit(pools0,F,memo,cap){
  cap=cap||PB_LV_CAP;
  const pools=pools0.filter(p=>p.pref.length+p.thin.length+(p.mkt||[]).length);
  if(!pools.length) return null;
  if(pools.length===1) return pbFreeOne(pools[0],F,memo,cap);
  const x=pbCtx(memo);
  const srt=a=>a.sort((u,v)=>(v.c-u.c)||(v.ln-u.ln)||(v.d-u.d)||(u.id<v.id?-1:u.id>v.id?1:0));
  const pass=(withTot,fillOf,k)=>{
    const legsOf=p=>[...p.pref,...p.thin,...(withTot?p.mkt||[]:[])], fillN=ls=>fillOf?ls.reduce((a,l)=>a+fillOf(l),0):0;
    const singles=pools.map(p=>srt(legsOf(p).map(l=>({c:l.p,d:mlToDec(l.price)||1,n:1,ln:pbLean(l),legs:[l],t:fillN([l]),id:pbId(l)}))));
    let r0=pbFreeDp(singles,F,cap,0,k), opts=singles; const cb=r0.best;
    let rO=0; for(const g of singles) for(const o of g) if(o.c*o.d>rO) rO=o.c*o.d;
    const rOb=rO<=1?rO:Math.pow(rO,pools.length-1);
    let added=0, thr=cb>0?cb:0.5*SGP_HOLD*rOb/F;
    for(let tries=1;;tries++){ const o2=singles.map(g=>g.slice()); added=0;
      pools.forEach((p,gi)=>{ const legs=legsOf(p); if(legs.length<2) return; const I=legs.map(l=>pbCtxLeg(x,l));
        const cnd=pbFreeCands(x,I,F,cap,PB_FREE.FM,'front',thr/PB_FREE.FRONT,rOb,null,null);
        for(const s of cnd.set){ const ls=s.map(c=>x.L[c]), ex=pbExact(ls,0,0); if(!ex) continue;
          const c=ex.corr, d=ex.dec, key=d>=F?c:c*rOb*d/F; if(key<thr) continue;
          o2[gi].push({c,d,n:ls.length,ln:ls.reduce((a,l)=>a+pbLean(l),0),legs:ls,grp:1,t:fillN(ls),id:ls.map(pbId).sort().join(',')}); added++; } });
      const r=added?pbFreeDp(o2.map(srt),F,cap,0,k):r0;
      if(r.best>=thr||tries>=PB_FREE.TRIES){ r0=r; opts=o2.map(srt); break; }
      thr=r.best>0?r.best:thr/4; }
    PB_LV_STAT.groups+=added;
    const r1=pbFreeDp(opts,F,cap,added?PB_FREE.WIN:PB_FREE.BORDER,k);
    let best=null, ev=0;
    for(const q of r1.done){ if(ev>=PB_FREE.WIN_EVALS) break; const legs=q.o.flatMap(o=>o.legs);
      if(!legs.every((l,i)=>pbFits(legs.slice(0,i),l))) continue;
      ev++; const ex=pbExact(legs,0,F); if(!ex) continue;
      const c={pr:ex.corr,n:legs.length,ln:q.ln,id:legs.map(pbId).sort().join(',')}; if(!best||pbFreeRank(c,best)<0) best={...c,r:ex}; }
    PB_LV_STAT.ev+=ev; PB_LV_STAT.runs++;
    return best?best.r:null; };
  if(pools.some(p=>p.pref.length)){ const nThin=pools.reduce((a,p)=>a+p.thin.length,0);
    for(let k=0;k<=cap&&k<=nThin;k++){ const r=pass(false,l=>l.thin?1:0,k); if(r) return r; } }
  else { const r=pass(false,null,null); if(r) return r; }
  const nT=pools.filter(p=>(p.mkt||[]).length).length;
  for(let k=1;k<=nT;k++){ const r=pass(true,l=>l.market?1:0,k); if(r) return r; }
  return null;
}
/* a pool kept apart by game: an array of pools is taken as it is; one pool is split by its legs' games, in the order of
   games (ids) where given, else as its legs first meet them */
function pbSplitPool(pool,ids){
  if(Array.isArray(pool)) return pool;
  const by=new Map(); for(const id of ids||[]) by.set(id,{pref:[],thin:[],mkt:[]});
  for(const k of ['pref','thin','mkt']) for(const l of pool[k]||[]){ if(!by.has(l.gid)) by.set(l.gid,{pref:[],thin:[],mkt:[]}); by.get(l.gid)[k].push(l); }
  return [...by.values()];
}
/* the games' pools as one, for the words and the set's counts */
function pbUnionPool(pools){
  const o={pref:[],thin:[],mkt:[]}, S0=['plGames','far','farDk','noId','noIdPl','moved','movedPl','plNoId'];
  for(const k of S0) o[k]=0;
  for(const p of pools){ o.pref.push(...p.pref); o.thin.push(...p.thin); o.mkt.push(...(p.mkt||[])); for(const k of S0) o[k]+=+p[k]||0; }
  return o;
}
/* one level: (app v145) the likeliest parlay of 2 to PB_LV_CAP legs paying its own least price (t[4]), marked pick
   'likeliest-any' (PB_PICK) so its card and the record say the rule that chose it; null where none does. pools: one pool a
   game, or one pool split by game (pbSplitPool). (app v144: pick 'likeliest', the likeliest of its fixed size; app v138 to
   app v143: the least costly over a floor of chance, else the likeliest of the size, marked likeliest) */
function pbTierOf(t,pools,memo,opt){
  const r=pbFreeUnit(pbSplitPool(pools),t[4],memo,PB_LV_CAP); return r?{...r,pick:PB_PICK}:null;
}
/* a level with its fair chance (parlayFair on its legs, in the builder's order), worked once it is chosen */
const pbWithFair=r=>r&&r.legs?{...r,fair:parlayFair(r.legs)}:r;
function pbTier(t,pool,memo,opt){ return pbWithFair(pbTierOf(t,pool,memo,opt)); }
""",
     'the search: any size, the Day games one set')

# pbWhy: of any size
sub1('p3', r"""function pbWhy(n,pool,c,minD){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);
  /* (app v109) short of legs only for want of DraftKings' ids: said so */
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found. (app v144) the level's own price (minD) */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n){ const ml=pbMinMl(minD); return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool),undefined,minD)===false?`on your picks pay ${ml}`:`found on your picks that pay ${ml}`} or more together: tick more games or bet types.`; }
  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:pbNoPl(c.ids); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }
  return `${what}: tick more games or bet types.`;
}
""",
     r"""function pbWhy(n,pool,c,minD){
  const all=[...pool.pref,...pool.thin,...(pool.mkt||[])], m=pbMaxLegs(all);
  /* (app v109) short of legs only for want of DraftKings' ids: said so */
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;
  /* (app v143) legs enough, on one slip: none pays the level's price; said so where pbPaysFree shows it (the totals in the
     list), else that none was found. (app v145) of any size, n the fewest legs (2) */
  if(m>=n&&pbMaxFit(all)>=n){ const ml=pbMinMl(minD); return pbPaysFree(all,minD)===false?`No parlay on your picks pays ${ml} or more: tick more games or bet types.`:`No parlay found on your picks that pays ${ml} or more: tick more games or bet types.`; }
  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:pbNoPl(c.ids); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }
  return `${what}: tick more games or bet types.`;
}
""",
     'pbWhy: of any size')

# pbBuild: the engine split by game
sub1('p3', r"""  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,pool,c,t[4])}; });""",
     r"""  /* (app v145) the pool kept apart by game, in the ticked games' order; a level built carries its legs' count */
  const per=pbSplitPool(pool,games.map(g=>g.id));
  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,per,memo); return r?{id,label,n:r.legs.length,floor,...r}:{id,label,n,floor,why:pbWhy(n,pool,c,t[4]),pick:PB_PICK}; });""",
     'pbBuild: the engine split by game')

# pbBuild: an empty level carries the rule
sub1('p3', r"""  const empty=why=>PB_TIERS.map(([id,label,n,floor])=>({id,label,n,floor,why}));
  if(!all.length){""",
     r"""  const empty=why=>PB_TIERS.map(([id,label,n,floor])=>({id,label,n,floor,why,pick:PB_PICK}));
  if(!all.length){""",
     'pbBuild: an empty level carries the rule')

# pbRuleOf: the any-size rule
sub1('p3', r"""   legs" and "least costly · 25%+", only the last titled */
function pbRuleOf(t){
  const n=t.legs.length;
  if(t.pick==='likeliest'&&t.minDec)""",
     r"""   legs" and "least costly · 25%+", only the last titled.
   (app v145) a level carrying pick 'likeliest-any' (PB_PICK: the likeliest parlay of any size paying its own least price)
   says so with no size (its card's head has its "N legs" pill): "likeliest · +110+", "likeliest · +300+", "likeliest ·
   +700+", "likeliest · +1500+", titled "The likeliest parlay paying at least +300 by the site’s price: $1 returns $4 or more"
   (Safe "$2.10"); one locked under app v144 or before keeps its own words, above */
function pbRuleOf(t){
  const n=t.legs.length;
  if(t.pick===PB_PICK&&t.minDec) return `likeliest · ${pbMinMl(t.minDec)}+`;
  if(t.pick==='likeliest'&&t.minDec)""",
     'pbRuleOf: the any-size rule')

# pbRuleTitle: the any-size rule
sub1('p3', r"""function pbRuleTitle(t){ const n=t.legs.length;
""",
     r"""function pbRuleTitle(t){ const n=t.legs.length;
  if(t.pick===PB_PICK&&t.minDec) return `The likeliest parlay paying at least ${pbMinMl(t.minDec)} by the site’s price: $1 returns ${pbMinUsd(t.minDec)} or more`;
""",
     'pbRuleTitle: the any-size rule')

# pbTierCard: the Day games across games
sub1('p3', r"""   o.game (app v121, the Sunday slot's cards): the game its legs are of, under its title */
function pbTierGame(gid){""",
     r"""   o.game (app v121, the Sunday slot's cards): the game its legs are of, under its title; (app v145) the Day games' games'
   ids, in their order: a level whose legs span two games or more says how many under its title (pbTierGames), its game
   ids in data-pb-tgame, and each leg names its own game under its label (pb-lgame); a level of one game keeps that game's
   line. An empty level taken under the any-size rule (pick PB_PICK) draws no "N legs" pill */
function pbTierGames(legs,order){
  const ids=[...new Set(legs.map(l=>l.gid))], at=id=>{ const i=Array.isArray(order)?order.indexOf(id):-1; return i<0?1e9+ids.indexOf(id):i; };
  ids.sort((a,b)=>at(a)-at(b));
  return ids.length<2?pbTierGame(ids[0]):`<span class="pb-tgame" data-pb-tgame="${esc(ids.join(' '))}">${ids.length} games</span>`; }
function pbLegGame(gid){ const g=(S.sched||[]).find(x=>x.id===gid); return g?`<small class="pb-lgame" data-pb-lgame="${esc(gid)}">${esc(g.a)} at ${esc(g.h)}</small>`:''; }
function pbTierGame(gid){""",
     'pbTierCard: the Day games across games')

# pbTierCard: no size on an empty level of the any-size rule
sub1('p3', r"""  if(t.why) return `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.n} legs</span></div>""",
     r"""  if(t.why) return `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${esc(t.label)}</span>${t.pick===PB_PICK?'':`<span class="pill">${t.n} legs</span>`}</div>""",
     'pbTierCard: no size on an empty level of the any-size rule')

# pbTierCard: whether the legs span games
sub1('p3', r"""  const fm={}, nE=t.legs.filter(l=>l.src==='dkline').length, nm=o.what?` the ${esc(t.label)} parlay for ${esc(o.what)}`:'';""",
     r"""  const fm={}, nE=t.legs.filter(l=>l.src==='dkline').length, nm=o.what?` the ${esc(t.label)} parlay for ${esc(o.what)}`:'', span=!!o.game&&new Set(t.legs.map(l=>l.gid)).size>1;""",
     'pbTierCard: whether the legs span games')

# pbTierCard: the head names the games
sub1('p3', r"""<span class="pill">${t.legs.length} legs</span>${o.game&&t.legs.length?pbTierGame(t.legs[0].gid):''}""",
     r"""<span class="pill">${t.legs.length} legs</span>${o.game&&t.legs.length?pbTierGames(t.legs,o.game):''}""",
     'pbTierCard: the head names the games')

# pbTierCard: each leg names its game where the legs span games
sub1('p3', r"""<li><span class="nm">${glanceName(l)}<small>${esc(l.label)}${pbValMark(l)}</small></span>""",
     r"""<li><span class="nm">${glanceName(l)}<small>${esc(l.label)}${pbValMark(l)}</small>${span?pbLegGame(l.gid):''}</span>""",
     'pbTierCard: each leg names its game where the legs span games')

# SP_SEARCH: the Day games one set
sub1('p3', r"""/* (app v121) the Sunday slot has no search of its own: each of its games' sets is built as a night game's is (spSet),
   and each of its levels is the best of theirs (spSlotBuild) */""",
     r"""/* (app v121 to app v145) the Sunday slot had no search of its own: each of its games' sets was built as a night game's is,
   and each of its levels was the best of theirs (spSlotBuild). (app v145) the Day games are one set, searched on the union
   of their games' pools (spBuild) */""",
     'SP_SEARCH: the Day games one set')

# the sets: the Day games one unit; spSlotBuild, spSlotBetter, spSlotLevel and spWhySlot gone
sub1('p3', r"""function spWhy(n,pool,g,minD){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]), where=g.slot?'the Sunday slot':'this game';
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found. (app v144) the level's own price (minD) */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n){ const ml=pbMinMl(minD); return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool),undefined,minD)===false?`in ${where} pay ${ml}`:`found in ${where} that pay ${ml}`} or more together.`; }
  if(!pool.plGames) return `${what}: ${pool.plNoId?'no player leg with a DraftKings id.':spNoPl(g)}`;
  /* (app v121) legs enough in number, but not on one slip */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])<n) return `No ${n} of this game’s legs go together on DraftKings’ slip.`;
  return `${what}.`;
}
/* (app v138) one level of a game's set, on the game's pool and the set's memo (spBuild's, and spOpenSoft's a level a step) */
function spLevel(t,pool,memo,g){ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g,t[4])}; }
function spSetOf(g,pool,tiers){
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0,
    max:pbMaxLegs([...pool.pref,...pool.thin,...pool.mkt]),fit:pbMaxFit([...pool.pref,...pool.thin,...pool.mkt])};
}
function spBuild(g){
  if(g.slot) return spSlotBuild(g);
  const pool=pbPool([g],SP_ALL,SP_SEARCH), memo=new Map();
  return spSetOf(g,pool,PB_TIERS.map(t=>spLevel(t,pool,memo,g)));
}
/* (app v138) a game's set built a level a step (spOpenSoft): w, the game, and once its first step has run the set's
   signature and pool and the memo its levels share, as spBuild's; the set kept in SP_CACHE with its last level, as spSet
   keeps one. A set built meanwhile (a draw) leaves the steps nothing to do */
function spPartStep(w){
  if(w.done) return;
  if(!w.pool){ w.sig=spSig(w.g); if(SP_CACHE.has(w.sig)){ w.done=true; return; } w.pool=pbPool([w.g],SP_ALL,SP_SEARCH); w.memo=new Map(); w.tiers=[]; }
  w.tiers.push(spLevel(PB_TIERS[w.tiers.length],w.pool,w.memo,w.g));
  if(w.tiers.length<PB_TIERS.length) return;
  w.done=true; if(SP_CACHE.has(w.sig)) return;
  SP_CACHE.set(w.sig,{sig:w.sig,...spSetOf(w.g,w.pool,w.tiers)}); if(SP_CACHE.size>48) SP_CACHE.delete(SP_CACHE.keys().next().value);
}
/* (app v121) the Sunday slot, one game a level (the owner, 19 October 2026: "the legs need to be part of the same game
   parlay only, and anytime there's a mix it bombs the hyperlink"): each of its games' own set, built exactly as a night
   game's is (spSet on the game), and each level the best of theirs: a parlay before none; one without a game total
   before one with one; one that meets its floor before the likeliest of its size; the fewer thin legs; then the better
   expected return (chance times price) where it met a floor, else the higher chance (Safe's, and a likeliest one's); then
   the earlier game of the slot. (app v144) No level has a floor of chance since, so it is the higher chance after the
   totals and the thin legs: each game's level the likeliest paying the level's price, the slot's the likeliest of those. Within one game that was the order its own search kept (pbTierOf,
   pbBestReturn, pbLikeliest, until app v144: pbLevel since), so the slot's level is the best same-game parlay its games make by
   the set's own rule */
const spSlotKey=(r,floor)=>[r.mkt?1:0,floor&&r.likeliest?1:0,r.thin||0];
function spSlotBetter(a,b,floor){
  const ka=spSlotKey(a,floor), kb=spSlotKey(b,floor);
  for(let i=0;i<ka.length;i++) if(ka[i]!==kb[i]) return ka[i]<kb[i];
  const v=r=>floor&&!r.likeliest?r.corr*r.dec:r.corr; return v(a)>v(b);
}
function spSlotBuild(u){
  const per=u.games.map(x=>spSet(x.id)).filter(Boolean), sum=k=>per.reduce((a,s)=>a+(+s[k]||0),0);
  const tiers=PB_TIERS.map((t,ti)=>{ const [id,label,n,floor]=t; let best=null;
    for(const s of per){ const r=s.tiers[ti]; if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best=r; }
    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per.map(s=>({...s,why:s.tiers[ti]&&s.tiers[ti].why})),u,t[4])}; });
  return {gid:u.id,tiers,pref:sum('pref'),thin:sum('thin'),mkt:sum('mkt'),far:sum('far'),farDk:sum('farDk'),noId:sum('noId'),moved:sum('moved'),plGames:sum('plGames'),plNoId:sum('plNoId'),
    max:Math.max(0,...per.map(s=>s.max||0)),fit:Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit)),games:per.map(s=>s.gid)};
}
/* one level of the Sunday slot built again now (spRebuild): each game's level from its lines as they stand, never the
   cache, the best of them by the slot's rule */
function spSlotLevel(u,t){
  const [id,label,n,floor]=t, per=[]; let best=null;
  for(const x of u.games){ const gx=spUnit(x.id); if(!gx) continue;
    const pool=pbPool([gx],SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH), all=[...pool.pref,...pool.thin,...pool.mkt];
    per.push({noId:pool.noId||0,plGames:pool.plGames,plNoId:pool.plNoId||0,max:pbMaxLegs(all),fit:pbMaxFit(all),why:r?null:spWhy(n,pool,gx,t[4])});
    if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best={id,label,n,floor,...r}; }
  return best||{id,label,n,floor,why:spWhySlot(n,per,u,t[4])};
}
/* why a level of the Sunday slot is empty: none of its games makes that many legs (one game's legs a parlay), and why */
function spWhySlot(n,per,u,minD){
  const m=Math.max(0,...per.map(s=>s.max||0)), noId=per.some(s=>s.noId), pl=per.some(s=>s.plGames), plNoId=per.some(s=>s.plNoId);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in any one game of the Sunday slot${noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in any one game of the Sunday slot`;
  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  /* (app v143) a game of the slot makes n legs on one slip: none of them pays +100 or more; (the review of app v143) said so
     where each such game's own level says so of itself (shown by pbPaysAny), else that none was found. (app v144) the
     level's own price (minD) */
  if(m>=n&&f>=n){ const ml=pbMinMl(minD), own=`No ${n} legs in this game pay ${ml} or more together.`, shown=per.every(s=>(s.fit==null?(s.max||0):s.fit)<n||s.why===own);
    return `No ${n} legs ${shown?`of any one game of the Sunday slot pay ${ml}`:`found in any one game of the Sunday slot that pay ${ml}`} or more together.`; }
  if(!pl) return `${what}: ${plNoId?'no player leg with a DraftKings id.':spNoPl(u)}`;
  if(m>=n&&f<n) return `No ${n} legs of any one game of the Sunday slot go together on DraftKings’ slip.`;
  return `${what}.`;
}
/* a unit's live set, the same for the same data (the searches are seeded), from the cache when nothing it
   stands on has moved: its games' kickoffs and pbDataSig (the publish, ESPN_SEQ) */
const spSig=g=>[g.id,...spGamesOf(g).map(x=>x.id+'@'+(x.d||'')+'T'+(x.t||'')),pbDataSig()].join('|');
function spSet(gid){
  const g=spUnit(gid); if(!g) return null;
  const sig=spSig(g);
  let r=SP_CACHE.get(sig);
  if(!r){ r={sig,...spBuild(g)}; SP_CACHE.set(sig,r); if(SP_CACHE.size>48) SP_CACHE.delete(SP_CACHE.keys().next().value); }
  return r;
}
/* one level of a unit built again now, from the lines at hand (a locked level holding a player ruled out); (app v142)
   a model level alone: a locked Elo pick is never built again */
function spRebuild(gid,id){
  const g=spUnit(gid); if(!g) return null;
  const t=PB_TIERS.find(s=>s[0]===id); if(!t) return null;
  /* (app v121) the Sunday slot's level is the best of its games' own, built the same way */
  if(g.slot) return spSlotLevel(g,t);
  const pool=pbPool(spGamesOf(g),SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH);
  return r?{id:t[0],label:t[1],n:t[2],floor:t[3],...r}:{id:t[0],label:t[1],n:t[2],floor:t[3],why:spWhy(t[2],pool,g,t[4])};
}
""",
     r"""function spWhy(n,pool,g,minD){
  const all=[...pool.pref,...pool.thin,...(pool.mkt||[])], m=pbMaxLegs(all), where=g.slot?'the Day games':'this game';
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  /* (app v143) legs enough, on one slip: none pays the level's price; said so where pbPaysFree shows it (the totals in the
     list), else that none was found. (app v145) of any size, n the fewest legs (2); the Day games one unit */
  if(m>=n&&pbMaxFit(all)>=n){ const ml=pbMinMl(minD), no=pbPaysFree(all,minD)===false;
    return g.slot?(no?`No parlay of the Day games pays ${ml} or more.`:`No parlay found in the Day games that pays ${ml} or more.`):(no?`No parlay in this game pays ${ml} or more.`:`No parlay found in this game that pays ${ml} or more.`); }
  if(!pool.plGames) return `${what}: ${pool.plNoId?'no player leg with a DraftKings id.':spNoPl(g)}`;
  /* (app v121) legs enough in number, but not on one slip */
  if(m>=n&&pbMaxFit(all)<n) return g.slot?`No ${n} of the Day games’ legs go together on DraftKings’ slip.`:`No ${n} of this game’s legs go together on DraftKings’ slip.`;
  return `${what}.`;
}
/* (app v145) a unit's pools, one a game (pbPool on the game alone, its lists to 60), in the unit's order: a night game's
   one, the Day games' each of theirs, kept apart by game (never pbPool over the slot's games, whose cap would cut their
   union to 60) */
const spPools=g=>spGamesOf(g).map(x=>pbPool([x],SP_ALL,SP_SEARCH));
/* (app v138) one level of a unit's set, on its pools and the set's memo (spBuild's, and spOpenSoft's a level a step);
   (app v145) a level built carries its legs' count as n, an empty one the fewest (2) and the rule (pick) */
function spLevel(t,pools,pool,memo,g){ const [id,label,n,floor]=t, r=pbTier(t,pools,memo,SP_SEARCH); return r?{id,label,n:r.legs.length,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g,t[4]),pick:PB_PICK}; }
function spSetOf(g,pool,tiers){
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0,
    max:pbMaxLegs([...pool.pref,...pool.thin,...pool.mkt]),fit:pbMaxFit([...pool.pref,...pool.thin,...pool.mkt]),...(g.slot?{games:g.games.map(x=>x.id)}:{})};
}
function spBuild(g){
  const pools=spPools(g), memo=new Map(), pool=pbUnionPool(pools);
  return spSetOf(g,pool,PB_TIERS.map(t=>spLevel(t,pools,pool,memo,g)));
}
/* (app v138) a unit's set built a level a step (spOpenSoft): w, the unit, and once its first step has run the set's
   signature, its pools and the memo its levels share, as spBuild's; the set kept in SP_CACHE with its last level, as spSet
   keeps one. A set built meanwhile (a draw) leaves the steps nothing to do. (app v145) the Day games too, their four levels
   on the union of their games' pools, where each of their games' own set was built until then */
function spPartStep(w){
  if(w.done) return;
  if(!w.pools){ w.sig=spSig(w.g); if(SP_CACHE.has(w.sig)){ w.done=true; return; } w.pools=spPools(w.g); w.pool=pbUnionPool(w.pools); w.memo=new Map(); w.tiers=[]; }
  w.tiers.push(spLevel(PB_TIERS[w.tiers.length],w.pools,w.pool,w.memo,w.g));
  if(w.tiers.length<PB_TIERS.length) return;
  w.done=true; if(SP_CACHE.has(w.sig)) return;
  SP_CACHE.set(w.sig,{sig:w.sig,...spSetOf(w.g,w.pool,w.tiers)}); if(SP_CACHE.size>48) SP_CACHE.delete(SP_CACHE.keys().next().value);
}
/* (app v121 to app v145) the Sunday slot was one game a level (the owner, 19 October 2026: "the legs need to be part of the
   same game parlay only, and anytime there's a mix it bombs the hyperlink"): each of its games' own set, and each level the
   best of theirs (spSlotBuild, spSlotBetter, spSlotLevel, worded by spWhySlot). Since app v123 a mixed parlay's card gives an
   all-legs link and one for each game, and since app v145 (the owner's "like a mix and match") the Day games are one set,
   a level's legs from any of their games (spBuild on the union of their games' pools, kept apart by game) */
/* a unit's live set, the same for the same data (the searches are seeded), from the cache when nothing it
   stands on has moved: its games' kickoffs and pbDataSig (the publish, ESPN_SEQ) */
const spSig=g=>[g.id,...spGamesOf(g).map(x=>x.id+'@'+(x.d||'')+'T'+(x.t||'')),pbDataSig()].join('|');
function spSet(gid){
  const g=spUnit(gid); if(!g) return null;
  const sig=spSig(g);
  let r=SP_CACHE.get(sig);
  if(!r){ r={sig,...spBuild(g)}; SP_CACHE.set(sig,r); if(SP_CACHE.size>48) SP_CACHE.delete(SP_CACHE.keys().next().value); }
  return r;
}
/* one level of a unit built again now, from the lines at hand (a locked level holding a player ruled out); (app v142)
   a model level alone: a locked Elo pick is never built again. (app v145) the Day games' on the union of their games'
   pools as they stand, as their set is built */
function spRebuild(gid,id){
  const g=spUnit(gid); if(!g) return null;
  const t=PB_TIERS.find(s=>s[0]===id); if(!t) return null;
  const pools=spPools(g);
  return spLevel(t,pools,pbUnionPool(pools),new Map(),g);
}
""",
     'the sets: the Day games one unit; spSlotBuild, spSlotBetter, spSlotLevel and spWhySlot gone')

# spTierOut: an empty level keeps its rule
sub1('p3', r"""  if(!t||!t.legs||!t.legs.length) return {id:t.id,label:t.label,n:t.n,floor:t.floor,why:t.why};""",
     r"""  if(!t||!t.legs||!t.legs.length) return {id:t.id,label:t.label,n:t.n,floor:t.floor,why:t.why,...(t.pick?{pick:t.pick}:{})};""",
     'spTierOut: an empty level keeps its rule')

# spTierIn: the size its own
sub1('p3', r"""  const head={id:t.id,label:spec[1],n:spec[2],floor:typeof t.floor==='number'&&isFinite(t.floor)?t.floor:spec[3]};""",
     r"""  /* (app v145) its size its own (a level of any size since app v145, of its level's fixed size before), 2 to PB_LV_CAP legs */
  const n0=Array.isArray(t.legs)?t.legs.length:(+t.n>=2?+t.n:spec[2]);
  const head={id:t.id,label:spec[1],n:n0,floor:typeof t.floor==='number'&&isFinite(t.floor)?t.floor:spec[3]};""",
     'spTierIn: the size its own')

# spTierIn: any size, the record's n
sub1('p3', r"""  if(!Array.isArray(t.legs)) return {...head,why:typeof t.why==='string'&&t.why?t.why:`No parlay of this size in ${g.slot?'the Sunday slot':'this game'}.`,...U};
  const legs=t.legs.map(l=>spLegIn(l,g)); if(legs.length!==spec[2]||legs.some(l=>!l)) return null;""",
     r"""  if(!Array.isArray(t.legs)) return {...head,why:typeof t.why==='string'&&t.why?t.why:`No parlay of this size in ${g.slot?'the Day games':'this game'}.`,...(t.pick===PB_PICK?{pick:PB_PICK}:{}),...U};
  const legs=t.legs.map(l=>spLegIn(l,g)); if(legs.length<2||legs.length>PB_LV_CAP||(t.n!=null&&+t.n!==legs.length)||legs.some(l=>!l)) return null;""",
     "spTierIn: any size, the record's n")

# spTierIn: the any-size rule
sub1('p3', r"""  if(t.pick==='likeliest') C.pick='likeliest';""",
     r"""  if(t.pick==='likeliest'||t.pick===PB_PICK) C.pick=t.pick;""",
     'spTierIn: the any-size rule')

# spTier: the kicker names the Day games
sub1('p3', r"""  return t&&t.legs&&t.legs.length?{...t,game:g.slot?`the Sunday slot`:`${g.a} at ${g.h}`}:null;""",
     r"""  /* (app v145) the card's kicker: the Day games where the level's legs span games, else its one game */
  if(!(t&&t.legs&&t.legs.length)) return null;
  const ids=[...new Set(t.legs.map(l=>l.gid))], one=ids.length===1?(S.sched||[]).find(x=>x.id===ids[0]):null;
  return {...t,game:g.slot?(one?`${one.a} at ${one.h}`:'Day games'):`${g.a} at ${g.h}`};""",
     'spTier: the kicker names the Day games')

# spGameHtml: the Day games' order
sub1('p3', r"""add:`data-sp-add="${g.id}:${t.id}"`,what,game:!!g.slot,...ro})""",
     r"""add:`data-sp-add="${g.id}:${t.id}"`,what,game:g.slot?g.games.map(x=>x.id):false,...ro})""",
     "spGameHtml: the Day games' order")

# spGameHtml: the buttons name the Day games
sub1('p3', r"""  const v=spShown(g), what=g.slot?'the Sunday slot':`${g.a} at ${g.h}`, lockT=v.lock!=null?spEt(v.lock,true):'';""",
     r"""  const v=spShown(g), what=g.slot?'the Day games':`${g.a} at ${g.h}`, lockT=v.lock!=null?spEt(v.lock,true):'';""",
     'spGameHtml: the buttons name the Day games')

# spWarmSteps: the Day games four steps
sub1('p3', r"""/* (app v135) what opening the tab has still to build, a step a game: each live unit's games (a night game, or each game
   of the Sunday slot), its own set (spSet, the cache the slot's levels are taken from), only where it is not built yet;
   a unit locked or under way builds nothing new (the record's set). (app v138) A game's set is four steps, a level each
   (spPartStep); (app v142) and nothing more, the Elo picks gone */
function spWarmSteps(){
  const steps=[], now=Date.now(), units=[...(spDayOff()?[]:[spSlotNext()].filter(u=>u&&u.up)),...spOn()];
  for(const u of units){
    const lock=spLockAt(u); if(lock!=null&&now>=lock) continue;
    for(const x of (u.slot?u.games:[u])){ const g=spUnit(x.id); if(!g) continue;
      if(!SP_CACHE.has(spSig(g))){ const w={g}; for(let i=0;i<PB_TIERS.length;i++) steps.push(()=>spPartStep(w)); } } }
  return steps;
}
""",
     r"""/* (app v135) what opening the tab has still to build: each live unit's own set, only where it is not built yet; a unit
   locked or under way builds nothing new (the record's set). (app v138) A set is four steps, a level each (spPartStep);
   (app v142) and nothing more, the Elo picks gone. (app v145) the Day games' too, their own four levels on the union of their
   games' pools, where until then each of their games' own set was built (four steps a game) and the slot's levels taken
   from those */
function spWarmSteps(){
  const steps=[], now=Date.now(), units=[...(spDayOff()?[]:[spSlotNext()].filter(u=>u&&u.up)),...spOn()];
  for(const u of units){
    const lock=spLockAt(u); if(lock!=null&&now>=lock) continue;
    if(!SP_CACHE.has(spSig(u))){ const w={g:u}; for(let i=0;i<PB_TIERS.length;i++) steps.push(()=>spPartStep(w)); } }
  return steps;
}
""",
     'spWarmSteps: the Day games four steps')

# APP_BUILD
sub1('p2', r"""const APP_BUILD='app v144 \u00b7 2026-11-07';""",
     r"""const APP_BUILD='app v145 \u00b7 2026-11-08';""",
     'APP_BUILD')

# parlayProb: 6 to 8 legs without a branch a leg
sub1('p2', r"""    else for(let s=0,b=0;s<sims;s++,b+=st){ let ok=true;
      for(let i=0,o=0;i<n&&ok;i++,o+=n){ let z=0; for(let k=0;k<=i;k++) z+=F[o+k]*Z[b+k]; if(dir[i]*z<=thr[i]) ok=false; }
      if(ok) hits++; }""",
     r"""    /* (app v145) 6, 7 and 8 legs the same way (a level of any size: a night Extreme of 6 legs or more, and a Day games mix
       holding a same-game group, is a draw over every leg): the same count to the bit; 9 legs or more as before */
    else if(n===6){ const d0=dir[0], d1=dir[1], d2=dir[2], d3=dir[3], d4=dir[4], d5=dir[5], t0=thr[0], t1=thr[1], t2=thr[2], t3=thr[3], t4=thr[4], t5=thr[5], r0_0=F[0], r1_0=F[6], r1_1=F[7], r2_0=F[12], r2_1=F[13], r2_2=F[14], r3_0=F[18], r3_1=F[19], r3_2=F[20], r3_3=F[21], r4_0=F[24], r4_1=F[25], r4_2=F[26], r4_3=F[27], r4_4=F[28], r5_0=F[30], r5_1=F[31], r5_2=F[32], r5_3=F[33], r5_4=F[34], r5_5=F[35];
      for(let s=0,b=0;s<sims;s++,b+=st){ const z0=Z[b], z1=Z[b+1], z2=Z[b+2], z3=Z[b+3], z4=Z[b+4], z5=Z[b+5];
        hits+=(d0*(0+r0_0*z0)>t0)&(d1*(0+r1_0*z0+r1_1*z1)>t1)&(d2*(0+r2_0*z0+r2_1*z1+r2_2*z2)>t2)&(d3*(0+r3_0*z0+r3_1*z1+r3_2*z2+r3_3*z3)>t3)&(d4*(0+r4_0*z0+r4_1*z1+r4_2*z2+r4_3*z3+r4_4*z4)>t4)&(d5*(0+r5_0*z0+r5_1*z1+r5_2*z2+r5_3*z3+r5_4*z4+r5_5*z5)>t5); } }
    else if(n===7){ const d0=dir[0], d1=dir[1], d2=dir[2], d3=dir[3], d4=dir[4], d5=dir[5], d6=dir[6], t0=thr[0], t1=thr[1], t2=thr[2], t3=thr[3], t4=thr[4], t5=thr[5], t6=thr[6], r0_0=F[0], r1_0=F[7], r1_1=F[8], r2_0=F[14], r2_1=F[15], r2_2=F[16], r3_0=F[21], r3_1=F[22], r3_2=F[23], r3_3=F[24], r4_0=F[28], r4_1=F[29], r4_2=F[30], r4_3=F[31], r4_4=F[32], r5_0=F[35], r5_1=F[36], r5_2=F[37], r5_3=F[38], r5_4=F[39], r5_5=F[40], r6_0=F[42], r6_1=F[43], r6_2=F[44], r6_3=F[45], r6_4=F[46], r6_5=F[47], r6_6=F[48];
      for(let s=0,b=0;s<sims;s++,b+=st){ const z0=Z[b], z1=Z[b+1], z2=Z[b+2], z3=Z[b+3], z4=Z[b+4], z5=Z[b+5], z6=Z[b+6];
        hits+=(d0*(0+r0_0*z0)>t0)&(d1*(0+r1_0*z0+r1_1*z1)>t1)&(d2*(0+r2_0*z0+r2_1*z1+r2_2*z2)>t2)&(d3*(0+r3_0*z0+r3_1*z1+r3_2*z2+r3_3*z3)>t3)&(d4*(0+r4_0*z0+r4_1*z1+r4_2*z2+r4_3*z3+r4_4*z4)>t4)&(d5*(0+r5_0*z0+r5_1*z1+r5_2*z2+r5_3*z3+r5_4*z4+r5_5*z5)>t5)&(d6*(0+r6_0*z0+r6_1*z1+r6_2*z2+r6_3*z3+r6_4*z4+r6_5*z5+r6_6*z6)>t6); } }
    else if(n===8){ const d0=dir[0], d1=dir[1], d2=dir[2], d3=dir[3], d4=dir[4], d5=dir[5], d6=dir[6], d7=dir[7], t0=thr[0], t1=thr[1], t2=thr[2], t3=thr[3], t4=thr[4], t5=thr[5], t6=thr[6], t7=thr[7], r0_0=F[0], r1_0=F[8], r1_1=F[9], r2_0=F[16], r2_1=F[17], r2_2=F[18], r3_0=F[24], r3_1=F[25], r3_2=F[26], r3_3=F[27], r4_0=F[32], r4_1=F[33], r4_2=F[34], r4_3=F[35], r4_4=F[36], r5_0=F[40], r5_1=F[41], r5_2=F[42], r5_3=F[43], r5_4=F[44], r5_5=F[45], r6_0=F[48], r6_1=F[49], r6_2=F[50], r6_3=F[51], r6_4=F[52], r6_5=F[53], r6_6=F[54], r7_0=F[56], r7_1=F[57], r7_2=F[58], r7_3=F[59], r7_4=F[60], r7_5=F[61], r7_6=F[62], r7_7=F[63];
      for(let s=0,b=0;s<sims;s++,b+=st){ const z0=Z[b], z1=Z[b+1], z2=Z[b+2], z3=Z[b+3], z4=Z[b+4], z5=Z[b+5], z6=Z[b+6], z7=Z[b+7];
        hits+=(d0*(0+r0_0*z0)>t0)&(d1*(0+r1_0*z0+r1_1*z1)>t1)&(d2*(0+r2_0*z0+r2_1*z1+r2_2*z2)>t2)&(d3*(0+r3_0*z0+r3_1*z1+r3_2*z2+r3_3*z3)>t3)&(d4*(0+r4_0*z0+r4_1*z1+r4_2*z2+r4_3*z3+r4_4*z4)>t4)&(d5*(0+r5_0*z0+r5_1*z1+r5_2*z2+r5_3*z3+r5_4*z4+r5_5*z5)>t5)&(d6*(0+r6_0*z0+r6_1*z1+r6_2*z2+r6_3*z3+r6_4*z4+r6_5*z5+r6_6*z6)>t6)&(d7*(0+r7_0*z0+r7_1*z1+r7_2*z2+r7_3*z3+r7_4*z4+r7_5*z5+r7_6*z6+r7_7*z7)>t7); } }
    else for(let s=0,b=0;s<sims;s++,b+=st){ let ok=true;
      for(let i=0,o=0;i<n&&ok;i++,o+=n){ let z=0; for(let k=0;k<=i;k++) z+=F[o+k]*Z[b+k]; if(dir[i]*z<=thr[i]) ok=false; }
      if(ok) hits++; }""",
     'parlayProb: 6 to 8 legs without a branch a leg')

# parlayProb: the comment
sub1('p2', r"""       (z is never NaN), so the same count to the bit, in about a third of the time. 6 legs or more as before */""",
     r"""       (z is never NaN), so the same count to the bit, in about a third of the time. 6 legs or more as before (app v145: 9 or
       more) */""",
     'parlayProb: the comment')

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched', ', '.join(str(p.name) for p in FILES.values()))
