"""Every suggested parlay pays +100 or more (app v143).

The owner's call of 7 November 2026: "I am not really wanting to do safe bets that are like only 50 cent wins. id want to
at least double my bet, so 1$ bet wins 2$ for a profit of 1$."

What he saw. Suggested Parlays builds four levels for each unit (each Thursday, Sunday and Monday night game, and the
Sunday slot): Safe, Medium, Aggressive and Extreme (Extreme hidden on the tab since app v132, still taken and graded by the
record). Safe has had no floor of any kind: it is the likeliest 2-leg parlay of its game (pbBestReturn with floor 0,
ruled "the likeliest pair"), and since app v138 every leg is stated and chosen at DraftKings' fair chance, so the
likeliest pair is two short-priced legs together, a price well under even money. The suggestions record's Safe levels of
weeks 8 and 9 were priced at decimal 2.025, 2.18, 1.899, 1.49, 2.042, 1.537, 1.523 and 1.837, five of the last seven under
2.0; on the payload of 6 November 2026 Sunday night's TB at CHI Safe paid -120 (1.837) and the Sunday slot's -191 (1.523:
$1 returns $1.52). Medium, Aggressive and Extreme are the least costly parlay landing 25%, 12% or 5% at the fair chance,
else the likeliest of their size, and nothing held their price either: a 3-leg parlay landing 45% pays under +100 too.

The rule. Every level, every unit, pays +100 or more: its decimal price, parlayDec on its legs as the card states it (the
builder's own same-game price, est. where a leg is), is at least PB_MIN_DEC, 2, so $1 returns $2 or more. Safe is the
likeliest 2-leg parlay that pays +100 or more; Medium, Aggressive and Extreme keep their rule, the least costly that lands
25%, 12% or 5%, among the parlays that pay +100 or more, and their fallback, the likeliest of their size, is the likeliest
of those too. The price is held on the figures in full (pbExact's dec), never on the search's approximate price
(pbDecApprox), which is used only to keep candidates: at the beam's last step (pbBeam's new last argument, minD) a parlay
whose approximate price, times a slack for each game of it holding two legs or more (PB_MIN_SLACK, by how many: 1.05 for 2,
1.10 for 3, 1.20 for 4, 1.30 for 5), is under PB_MIN_DEC is not kept, before the width cut, so the beam keeps the best of
those that can still pay +100. Legs in different games multiply in both prices alike, so across games the slack is none;
within a game the approximate price is the pairwise reading, and measured on the payload of 6 November 2026 over its 14
games and about 23,000 same-game parlays the price in full is at most 1.023 times it on 2 legs, 1.058 on 3, 1.124 on 4 and
1.219 on 5, under each slack. (A single slack of 1.25 over every parlay, the first form of this change, let a narrow
search's width fill with parlays of other games paying 1.6 to 2.0 and empty a level of the all-games engine, whose
search keeps 12 a step, where a parlay paying +100 was had: the nflbets smoke's made-up lines.) Each finalist is then worked in full, its price
first (pbExact with minDec: under +100 it is false, never a finalist and not counted), and a search's finalists are the
first `final` (pbBestReturn) or `likely` (pbLikeliest) of its candidates, in its own order, that pay +100 or more; the
level is the best of those as before (the least costly that clears the floor, Safe's and a fallback's the likeliest). A
call of pbBeam without minD, and of pbExact without minDec, is exactly as before. The rule applies wherever PB_TIERS is
searched: each night game's set, each game of the Sunday slot (so the slot's best-of, spSlotBuild by spSlotBetter, picks
among levels that all pay +100), a level built again for a player ruled out (spRebuild, spSlotLevel) and the all-games
engine no page draws (getPbTiers, pbBuild). The game page's hands (gameTiers) are a search of their own, drawn nowhere
since app v124, and are left as they were.

Where no parlay of a level's size in the unit pays +100 or more the level is empty and says so in a few words (app v130):
"No 2 legs in this game pay +100 or more together." (spWhy), "No 2 legs of any one game of the Sunday slot pay +100 or
more together." (spWhySlot), and on the all-games engine "No 2 legs on your picks pay +100 or more together: tick more
games or bet types." (pbWhy). Never a parlay under +100.

The review of 7 November 2026, before this merged, changed three things, each found on made-up games of one game's legs
run through the page's own spLevel (real payloads had met none of them: every set of weeks 7 to 9 at eight clocks the
same before and after). (1) The beam had the price only at its last step, and its earlier steps cut to their width on the
score alone: a game of 30 lines at -1000 and 10 at -150 filled every width with pairs of the short lines, none of which
pays +100 with any third leg, and its Medium came out empty ("No 3 legs in this game pay +100 or more together.") though
two -150 lines with a -1000 one land 28.6% at +174; with 25 short lines it fell back to the likeliest 3 though that very
parlay clears the floor. Now a search whose finalists ran short of their number where the price set some aside (at the
beam's last step, or worked in full) is run again with a reserve by the price: at every step, besides its best by the
score, the same number of the partials it would not keep of the highest approximate price times its slack (pbBeam's new
last argument, res), the last step too, where a crowd of parlays paying +100 by the slack alone and not in full would
otherwise fill the finalists (Safe's beam keeps every pair and is never run again). A search the price did not starve
is exactly as before. (2) The game total filled only where the legs with a chance could not make a level's size at all,
so where they made it and none of it paid +100 the level was empty and said no two legs in the game paid +100, though the
total with one of them did (three lines at -400 to -450 and the total at -110: 41.4% at +102). Since a level of their
size shows a parlay wherever they make one, they find none only for the price, and then the game total may fill one place
(pbTotalsKMax: as many as they leave, one at most where they leave none), so a level is empty only where no parlay of its
size in the unit pays +100, totals and all; a total still never takes the place of a leg with a chance otherwise. (3) An
empty level's words claimed every parlay of its size was tried, which a search cannot know: they are said where
pbPaysAny shows it (every n of the unit's legs that go together, the totals as (2) lets them fill, the highest prices
first, a partial let go once its price times the best the places left can add falls short, since a parlay never pays more
than its legs multiplied, and a whole one worked in full where its approximate price times its slack reaches +100, the
rule the search keeps one by; within 60,000 parlays), and else "No 3 legs found in this game that pay +100 or more
together." (the slot's "No 3 legs found in any one game of the Sunday slot ...", the engine's "No 3 legs found on your
picks ..."), the slot's claim only where each of its games making that many on one slip says it of itself. Not changed,
and put to the owner: +100 is met on the page's own price, the builder's same-game sum (parlayDec: a same-game group at the
lower of its legs multiplied and SGP_HOLD, 0.896, over their joint chance, fitted on two tickets and off by about 5% either
way on them), as every price a card states is, so DraftKings' own slip can pay a little under +100 on a Safe at the
floor's edge (11 of the 14 games' Safes on the payload of 6 November priced 2.004 to 2.084); whether the title should say
it is the site's estimate of DraftKings' same-game price, or the floor sit a margin above 2, is his to call.

The words. A level chosen under the rule carries it (minDec: 2, the live level from pbExact, and the record's and this
browser's copy from spTierOut, read back by spTierIn), and its pill says it: Safe "likeliest pair · +100+", a fallback
"likeliest 3 legs · +100+", a floor level "least costly · 25%+" as before; the titles "The likeliest 2-leg parlay paying at
least +100: $1 returns $2 or more", "The likeliest 3-leg parlay paying at least +100: $1 returns $2 or more" and "Smallest
expected loss of the 3-leg parlays landing 25%+ by DraftKings’ fair chance and paying at least +100". A level read back from
a lock taken before this change carries no minDec and was chosen without the rule, so it draws its old words ("the
likeliest pair", "the likeliest 3 legs", its old titles), and one taken before app v138 still draws no pill (pbRuleKnown).
No paragraph is added to the page (app v130).

The record. suggest_ledger.js takes every level from the page's own spSet and spTierOut, so from its first run on this
page every level it takes carries minDec and pays +100 or more; an entry not yet locked is rewritten before its lock, as
any set that has changed is, and an entry locked or graded stays byte for byte. Its record pills mix Safe's history under
the old rule with the new, which the owner accepted.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v142 \\u00b7 2026-11-05';", "const APP_BUILD='app v143 \\u00b7 2026-11-07';")

# ---------------------------------------------------------------- the floor on a level's price
sub1('p3', "const PB_TIERS=[['safe','Safe',2,0],['med','Medium',3,0.25],['aggr','Aggressive',4,0.12],['xtrm','Extreme',5,0.05]];\n",
     """const PB_TIERS=[['safe','Safe',2,0],['med','Medium',3,0.25],['aggr','Aggressive',4,0.12],['xtrm','Extreme',5,0.05]];
/* (app v143, the owner's call of 7 November 2026: "id want to at least double my bet, so 1$ bet wins 2$") every level pays
   +100 or more: its price in full (pbExact's dec, parlayDec on its legs, as its card states it) at least PB_MIN_DEC. The
   search's approximate price (pbDecApprox) only keeps candidates, times a slack for each game holding two legs or more of
   the parlay (PB_MIN_SLACK, by their count: across games the two prices are one product): the price in full is at most 1.02
   times the approximate one on a 2-leg same-game parlay, 1.06 on 3, 1.12 on 4 and 1.22 on 5, so none that pays +100 is
   dropped */
const PB_MIN_DEC=2, PB_MIN_SLACK=[1,1,1.05,1.1,1.2,1.3], PB_MIN_ML=fmtML(decToML(PB_MIN_DEC));
/* the slack of a parlay the beam scores, from its games' counts (pbGrow's g: game, count, price product, book product) */
const pbMinSlack=G=>{ let v=1; for(let i=0;i<G.length;i+=4){ const c=G[i+1]; if(c>1) v*=PB_MIN_SLACK[Math.min(c,PB_MIN_SLACK.length-1)]; } return v; };
""")

# ---------------------------------------------------------------- the beam: the price at its last step
sub1('p3', """   other by its indexes joined */
function pbBeam(pools,floor,by,width,memo){
  const x=pbCtx(memo), P=pools.map(pl=>pl.map(c=>pbCtxLeg(x,c))), kk=by==='ev'?'kev':'kpr', small=x.N<64&&pools.length<=5;
""", """   other by its indexes joined.
   (app v143) minD: at the last step a parlay whose approximate price, times its slack (pbMinSlack), is under it is not kept,
   before the width cut, so the width keeps the best of those that can pay the level's least price; a call without it is
   exactly as before */
function pbBeam(pools,floor,by,width,memo,minD){
  const x=pbCtx(memo), P=pools.map(pl=>pl.map(c=>pbCtxLeg(x,c))), kk=by==='ev'?'kev':'kpr', small=x.N<64&&pools.length<=5, last=pools.length-1;
""")
sub1('p3', """        if(floor&&E.pr<floor*0.9) continue;
        next.push(E); } }""", """        if(floor&&E.pr<floor*0.9) continue;
        if(minD&&s===last&&!(E.d*pbMinSlack(E.g)>=minD)) continue;
        next.push(E); } }""")

# ---------------------------------------------------------------- a finalist in full: the price first
sub1('p3', """/* a finalist with the builder's own sums, on the legs in the builder's order. (app v138) floor: null where its chance in
   full is under the floor, its price not worked (a finalist that misses the floor is never taken) */
function pbExact(legs,floor){
  const L=pbOrder(legs.map(l=>({...l}))), pr=parlayProb(L);
  if(floor&&pr.corr<floor) return null;
  return {legs:L,corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price}))),thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length};
}""", """/* a finalist with the builder's own sums, on the legs in the builder's order. (app v138) floor: null where its chance in
   full is under the floor, its price not worked (a finalist that misses the floor is never taken). (app v143) minDec: its
   price in full worked first, false where it is under minDec (no finalist at all), and the level carries the rule it was
   chosen by (minDec) */
function pbExact(legs,floor,minDec){
  const L=pbOrder(legs.map(l=>({...l}))), D=()=>parlayDec(L.map(l=>({leg:l,ml:l.price}))), d0=minDec?D():null;
  if(minDec&&!(d0>=minDec)) return false;
  const pr=parlayProb(L);
  if(floor&&pr.corr<floor) return null;
  return {legs:L,corr:pr.corr,indep:pr.indep,dec:d0!=null?d0:D(),thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length,...(minDec?{minDec}:{})};
}""")

# ---------------------------------------------------------------- the best return over the floor, among parlays paying +100
sub1('p3', """   clears the floor is the tier; null when none does. Safe, with no floor, is the likeliest pair.
   opt: the search's widths (pbOpt; the panel's own without it) */""", """   clears the floor is the tier; null when none does. Safe, with no floor, is the likeliest pair.
   opt: the search's widths (pbOpt; the panel's own without it). (app v143) Every candidate pays +100 or more: the beams
   keep only those whose approximate price can (with its slack, pbMinSlack), and the finalists are the first o.final of
   them, in the search's own order, whose price in full is PB_MIN_DEC or more (one under it is set aside, not counted) */""")
sub1('p3', """    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',o.beam,memo),...pbBeam(pools,floor,'pr',o.beam,memo)]) fin.set(e.id,e);""",
     """    const minD=PB_MIN_DEC;
    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo,minD)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',o.beam,memo,minD),...pbBeam(pools,floor,'pr',o.beam,memo,minD)]) fin.set(e.id,e);""")
sub1('p3', """    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort(pbRank(floor?'ev':'pr')).slice(0,o.final);
    let best=null;
    for(const e of top){ const r=pbExact(e.legs,floor); if(!r) continue;""",
     """    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort(pbRank(floor?'ev':'pr'));
    let best=null, kept=0;
    for(const e of top){ if(kept>=o.final) break;
      const r=pbExact(e.legs,floor,PB_MIN_DEC); if(r===false) continue; kept++; if(!r) continue;""")

# ---------------------------------------------------------------- the likeliest of its size, among parlays paying +100
sub1('p3', """   is the builder's and this is the likeliest parlay outright. null only when the picks do not make
   n legs at all */""", """   is the builder's and this is the likeliest parlay outright. null only when the picks do not make
   n legs at all. (app v143) Among the parlays paying +100 or more alone, as pbBestReturn's: the beam keeps those whose
   approximate price can, and its best few are the first o.likely whose price in full does (null where none does) */""")
sub1('p3', """    let best=null;
    for(const e of pbBeam(pools,0,'pr',o.wide,memo).slice(0,o.likely)){
      const pr=parlayProb(pbOrder(e.legs)).corr;
      /* (app v138) the highest to 1e-9, a tie to the larger lean, then the lower id */
      if(!best||pbRank('pr')({pr,ln:e.ln,id:e.id},{pr:best.pr,ln:best.e.ln,id:best.e.id})<0) best={e,pr}; }
    if(best) return pbExact(best.e.legs);""", """    let best=null, kept=0;
    for(const e of pbBeam(pools,0,'pr',o.wide,memo,PB_MIN_DEC)){ if(kept>=o.likely) break;
      const r=pbExact(e.legs,0,PB_MIN_DEC); if(!r) continue; kept++;
      const pr=r.corr;
      /* (app v138) the highest to 1e-9, a tie to the larger lean, then the lower id */
      if(!best||pbRank('pr')({pr,ln:e.ln,id:e.id},{pr:best.pr,ln:best.e.ln,id:best.e.id})<0) best={e,pr,r}; }
    if(best) return best.r;""")

# ---------------------------------------------------------------- an empty level: no parlay of its size pays +100
sub1('p3', """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;
  if(c&&c.players&&!pool.plGames){""", """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs on your picks pay ${PB_MIN_ML} or more together: tick more games or bet types.`;
  if(c&&c.players&&!pool.plGames){""")
sub1('p3', """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  if(!pool.plGames) return""", """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs in ${where} pay ${PB_MIN_ML} or more together.`;
  if(!pool.plGames) return""")
sub1('p3', """  if(!pl) return `${what}: ${plNoId?'no player leg with a DraftKings id.':spNoPl(u)}`;
  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  if(m>=n&&f<n)""", """  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  /* (app v143) a game of the slot makes n legs on one slip: none of them pays +100 or more */
  if(m>=n&&f>=n) return `No ${n} legs of any one game of the Sunday slot pay ${PB_MIN_ML} or more together.`;
  if(!pl) return `${what}: ${plNoId?'no player leg with a DraftKings id.':spNoPl(u)}`;
  if(m>=n&&f<n)""")

# ---------------------------------------------------------------- the rule as the card states it
sub1('p3', """function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  return t.likeliest?`the likeliest ${n} legs`:t.floor?`least costly · ${pct}%+`:'the likeliest pair';
}
function pbRuleTitle(t){ return !t.likeliest&&t.floor?`Smallest expected loss of the ${t.legs.length}-leg parlays landing ${Math.round(t.floor*100)}%+ by DraftKings’ fair chance`:''; }""",
     """/* (app v143) a level chosen among the parlays paying +100 or more (t.minDec, carried by the record since) says so; one
   read back from a lock taken before it was chosen without the rule and says what did choose it */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100), mp=t.minDec?` · ${PB_MIN_ML}+`:'';
  return t.likeliest?`${mp?'':'the '}likeliest ${n} legs${mp}`:t.floor?`least costly · ${pct}%+`:(mp?`likeliest pair${mp}`:'the likeliest pair');
}
function pbRuleTitle(t){ const n=t.legs.length, pay=t.minDec?`paying at least ${PB_MIN_ML}`:'';
  if(!t.likeliest&&t.floor) return `Smallest expected loss of the ${n}-leg parlays landing ${Math.round(t.floor*100)}%+ by DraftKings’ fair chance${pay?' and '+pay:''}`;
  return pay?`The likeliest ${n}-leg parlay ${pay}: $1 returns $${PB_MIN_DEC} or more`:''; }""")

# ---------------------------------------------------------------- the record's copy of a level: the rule kept
sub1('p3', """fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:t.thin||0,mkt:t.mkt||0,...(t.updated?{updated:t.updated}:{}),chance:'fair'}; }""",
     """fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:t.thin||0,mkt:t.mkt||0,...(t.updated?{updated:t.updated}:{}),chance:'fair',...(t.minDec?{minDec:t.minDec}:{})}; }""")
sub1('p3', """  const C=t.chance==='fair'?{chance:'fair'}:{};""", """  const C=t.chance==='fair'?{chance:'fair'}:{};
  /* (app v143) the price rule it was chosen by, where it was (minDec), so its pill says it; a level taken before has none */
  if(+t.minDec>1) C.minDec=+t.minDec;""")

# ---------------------------------------------------------------- the review of app v143
# (1) a search the price starved runs again with a reserve by the price (pbBeam's res, pbBestReturn, pbLikeliest); (2) where
# the legs with a chance make a level's size and none of it pays +100, the game total may fill one place (pbTotalsKMax); (3)
# an empty level says no n legs pay +100 together only where pbPaysAny shows it, else that none was found
sub1('p3', """const pbMinSlack=G=>{ let v=1; for(let i=0;i<G.length;i+=4){ const c=G[i+1]; if(c>1) v*=PB_MIN_SLACK[Math.min(c,PB_MIN_SLACK.length-1)]; } return v; };
const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40, PB_BEAM=12, PB_WIDE=24, PB_LIKELY=3, PB_FINAL=8;""", """const pbMinSlack=G=>{ let v=1; for(let i=0;i<G.length;i+=4){ const c=G[i+1]; if(c>1) v*=PB_MIN_SLACK[Math.min(c,PB_MIN_SLACK.length-1)]; } return v; };
/* (the review of app v143) whether some n of these legs that go together on one slip (pbFits) pay PB_MIN_DEC or more in
   full (parlayDec, the card's price), at most kMax of them a game total (l.market): true, false, or null where telling
   would take more than PB_PAYS_CAP parlays. A parlay never pays more than its legs multiplied, so the legs are tried
   highest price first and a partial whose price times the best the places left can add falls short is let go, with every
   one after it; a whole one is worked in full only where its approximate price (pbDecApprox) times its slack reaches the
   floor, the rule the search keeps a candidate by (at most PB_PAYS_FULL of them, the price in full being the dear part).
   An empty level says no n legs pay +100 together only where this is false, and else that none was found */
const PB_PAYS_CAP=60000, PB_PAYS_FULL=3000;
function pbPaysAny(list,n,kMax,cap){
  const L=list.map(l=>({l,d:mlToDec(l.price)||1})).sort((a,b)=>b.d-a.d), m=L.length, memo=new Map(), lim=cap||PB_PAYS_CAP;
  if(m<n) return false;
  let seen=0, full=0, hit=false, over=false;
  const slack=cur=>{ const c={}; for(const l of cur) c[l.gid]=(c[l.gid]||0)+1; let v=1; for(const k in c) if(c[k]>1) v*=PB_MIN_SLACK[Math.min(c[k],PB_MIN_SLACK.length-1)]; return v; };
  const rec=(i0,cur,prod,fill)=>{ const need=n-cur.length;
    if(!need){ if(++seen>lim){ over=true; return; }
      if(!(pbDecApprox(cur,memo)*slack(cur)>=PB_MIN_DEC)) return;
      if(++full>PB_PAYS_FULL){ over=true; return; }
      if(parlayDec(pbOrder(cur.map(l=>({...l}))).map(l=>({leg:l,ml:l.price})))>=PB_MIN_DEC) hit=true; return; }
    for(let i=i0;i<=m-need&&!hit&&!over;i++){
      let b=prod; for(let j=i;j<i+need;j++) b*=L[j].d;
      if(b<PB_MIN_DEC) break;
      const c=L[i].l, f2=fill+(c.market?1:0); if(kMax!=null&&f2>kMax) continue;
      if(!pbFits(cur,c)) continue;
      cur.push(c); rec(i+1,cur,prod*L[i].d,f2); cur.pop(); } };
  rec(0,[],1,0); return hit?true:over?null:false;
}
const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40, PB_BEAM=12, PB_WIDE=24, PB_LIKELY=3, PB_FINAL=8;""")
sub1('p3', """   before the width cut, so the width keeps the best of those that can pay the level's least price; a call without it is
   exactly as before */
function pbBeam(pools,floor,by,width,memo,minD){
  const x=pbCtx(memo), P=pools.map(pl=>pl.map(c=>pbCtxLeg(x,c))), kk=by==='ev'?'kev':'kpr', small=x.N<64&&pools.length<=5, last=pools.length-1;
  const cmp=(a,b)=>(b[kk]-a[kk])||(b.kln-a.kln)||pbEntry(x,a).id.localeCompare(pbEntry(x,b).id);
  let beam=[x.root];
  for(let s=0;s<pools.length;s++){""", """   before the width cut, so the width keeps the best of those that can pay the level's least price; a call without it is
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
  for(let s=0;s<pools.length;s++){""")
sub1('p3', """        if(floor&&E.pr<floor*0.9) continue;
        if(minD&&s===last&&!(E.d*pbMinSlack(E.g)>=minD)) continue;
        next.push(E); } }
    if(!next.length) return [];
    let keep=next;""", """        if(floor&&E.pr<floor*0.9) continue;
        if(minD&&s===last&&!(E.d*pbMinSlack(E.g)>=minD)){ cut++; continue; }
        next.push(E); } }
    if(!next.length) return done([]);
    let keep=next;""")
sub1('p3', """    beam=keep.length>width?keep.slice(0,width):keep;
  }
  return beam.map(E=>pbEntry(x,E));
}""", """    beam=keep.length>width?keep.slice(0,width):keep;
    if(res&&next.length>beam.length){ const inB=new Set(beam), R=[];
      for(const E of next) if(!inB.has(E)) R.push([E.d*pbMinSlack(E.g),E]);
      R.sort((a,b)=>(b[0]-a[0])||cmp(a[1],b[1]));
      for(let i=0;i<R.length&&i<res;i++) beam.push(R[i][1]); }
  }
  return done(beam);
}""")
sub1('p3', """   keep only those whose approximate price can (with its slack, pbMinSlack), and the finalists are the first o.final of
   them, in the search's own order, whose price in full is PB_MIN_DEC or more (one under it is set aside, not counted) */
function pbBestReturn([id,label,n,floor],pool,memo,kMax,opt){""", """   keep only those whose approximate price can (with its slack, pbMinSlack), and the finalists are the first o.final of
   them, in the search's own order, whose price in full is PB_MIN_DEC or more (one under it is set aside, not counted).
   (The review of app v143) Where the price set some aside and the finalists ran short of o.final, the earlier steps' cuts,
   made on the score alone, may have let go of the parlays that pay it (a game of many short legs): the beams are run again
   keeping at each step besides their best by the score their o.beam best by the price (pbBeam's res), and that is the
   search. Safe's beam keeps every pair and is never run again */
function pbBestReturn([id,label,n,floor],pool,memo,kMax,opt){""")
sub1('p3', """    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    const fin=new Map();
    const minD=PB_MIN_DEC;
    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo,minD)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',o.beam,memo,minD),...pbBeam(pools,floor,'pr',o.beam,memo,minD)]) fin.set(e.id,e);
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
      const r=pbExact(e.legs,floor,PB_MIN_DEC); if(r===false) continue; kept++; if(!r) continue;
      const x={v:floor?r.corr*r.dec:r.corr,ln:e.ln,id:e.id}; if(!best||pbRank('v')(x,best.x)<0) best={x,r}; }
    if(best) return best.r;
  }""", """    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
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
  }""")
sub1('p3', """   n legs at all. (app v143) Among the parlays paying +100 or more alone, as pbBestReturn's: the beam keeps those whose
   approximate price can, and its best few are the first o.likely whose price in full does (null where none does) */
function pbLikeliest(n,pool,memo,kMax,opt){""", """   n legs at all. (app v143) Among the parlays paying +100 or more alone, as pbBestReturn's: the beam keeps those whose
   approximate price can, and its best few are the first o.likely whose price in full does (null where none does); (the
   review of app v143) where the price set some aside and those ran short of o.likely, the beam again with its o.wide best
   by the price kept at each step beside its best by the chance (pbBeam's res), as pbBestReturn's */
function pbLikeliest(n,pool,memo,kMax,opt){""")
sub1('p3', """    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    let best=null, kept=0;
    for(const e of pbBeam(pools,0,'pr',o.wide,memo,PB_MIN_DEC)){ if(kept>=o.likely) break;
      const r=pbExact(e.legs,0,PB_MIN_DEC); if(!r) continue; kept++;
      const pr=r.corr;
      /* (app v138) the highest to 1e-9, a tie to the larger lean, then the lower id */
      if(!best||pbRank('pr')({pr,ln:e.ln,id:e.id},{pr:best.pr,ln:best.e.ln,id:best.e.id})<0) best={e,pr,r}; }
    if(best) return best.r;
  }""", """    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
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
  }""")
sub1('p3', """   no pair DraftKings refuses (pbMaxFit): a quarterback's passing TDs and his teammate's touchdown are one leg's room,
   not two, so a total fills where they cannot both go */
const pbTotalsFill=(n,pool)=>Math.max(0,n-pbMaxFit([...pool.pref,...pool.thin]));
function pbTierOf(t,pool,memo,opt){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo,undefined,opt); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2],pool),opt);
}""", """   no pair DraftKings refuses (pbMaxFit): a quarterback's passing TDs and his teammate's touchdown are one leg's room,
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
}""")
sub1('p3', """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs on your picks pay ${PB_MIN_ML} or more together: tick more games or bet types.`;
  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:pbNoPl(c.ids); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""", """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool))===false?`on your picks pay ${PB_MIN_ML}`:`found on your picks that pay ${PB_MIN_ML}`} or more together: tick more games or bet types.`;
  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:pbNoPl(c.ids); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""")
sub1('p3', """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs in ${where} pay ${PB_MIN_ML} or more together.`;
  if(!pool.plGames) return `${what}: ${pool.plNoId?'no player leg with a DraftKings id.':spNoPl(g)}`;""", """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  /* (app v143) legs enough, on one slip: none of n pays +100 or more; (the review of app v143) said so where pbPaysAny shows
     it (the totals filling as pbTierOf lets them), else that none was found */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])>=n) return `No ${n} legs ${pbPaysAny([...pool.pref,...pool.thin,...(pool.mkt||[])],n,pbTotalsKMax(n,pool))===false?`in ${where} pay ${PB_MIN_ML}`:`found in ${where} that pay ${PB_MIN_ML}`} or more together.`;
  if(!pool.plGames) return `${what}: ${pool.plNoId?'no player leg with a DraftKings id.':spNoPl(g)}`;""")
sub1('p3', """    for(const s of per){ const r=s.tiers[ti]; if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best=r; }
    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per,u)}; });
  return {gid:u.id,tiers,pref:sum('pref'),thin:sum('thin'),mkt:sum('mkt'),far:sum('far'),farDk:sum('farDk'),noId:sum('noId'),moved:sum('moved'),plGames:sum('plGames'),plNoId:sum('plNoId'),""", """    for(const s of per){ const r=s.tiers[ti]; if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best=r; }
    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per.map(s=>({...s,why:s.tiers[ti]&&s.tiers[ti].why})),u)}; });
  return {gid:u.id,tiers,pref:sum('pref'),thin:sum('thin'),mkt:sum('mkt'),far:sum('far'),farDk:sum('farDk'),noId:sum('noId'),moved:sum('moved'),plGames:sum('plGames'),plNoId:sum('plNoId'),""")
sub1('p3', """    const pool=pbPool([gx],SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH), all=[...pool.pref,...pool.thin,...pool.mkt];
    per.push({noId:pool.noId||0,plGames:pool.plGames,plNoId:pool.plNoId||0,max:pbMaxLegs(all),fit:pbMaxFit(all)});
    if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best={id,label,n,floor,...r}; }""", """    const pool=pbPool([gx],SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH), all=[...pool.pref,...pool.thin,...pool.mkt];
    per.push({noId:pool.noId||0,plGames:pool.plGames,plNoId:pool.plNoId||0,max:pbMaxLegs(all),fit:pbMaxFit(all),why:r?null:spWhy(n,pool,gx)});
    if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best={id,label,n,floor,...r}; }""")
sub1('p3', """  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  /* (app v143) a game of the slot makes n legs on one slip: none of them pays +100 or more */
  if(m>=n&&f>=n) return `No ${n} legs of any one game of the Sunday slot pay ${PB_MIN_ML} or more together.`;
  if(!pl) return `${what}: ${plNoId?'no player leg with a DraftKings id.':spNoPl(u)}`;""", """  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  /* (app v143) a game of the slot makes n legs on one slip: none of them pays +100 or more; (the review of app v143) said so
     where each such game's own level says so of itself (shown by pbPaysAny), else that none was found */
  if(m>=n&&f>=n){ const own=`No ${n} legs in this game pay ${PB_MIN_ML} or more together.`, shown=per.every(s=>(s.fit==null?(s.max||0):s.fit)<n||s.why===own);
    return `No ${n} legs ${shown?`of any one game of the Sunday slot pay ${PB_MIN_ML}`:`found in any one game of the Sunday slot that pay ${PB_MIN_ML}`} or more together.`; }
  if(!pl) return `${what}: ${plNoId?'no player leg with a DraftKings id.':spNoPl(u)}`;""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
