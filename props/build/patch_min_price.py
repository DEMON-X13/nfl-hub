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
games or bet types." (pbWhy); each is said wherever the unit makes a parlay of that many legs on one slip (pbMaxFit), the
one reason a level can then be empty. Never a parlay under +100. The totals keep their rule: a game total is the last fill
only where the game's other legs cannot make a parlay of the level's size, never a way round the price.

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

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
