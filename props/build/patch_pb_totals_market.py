"""app v91: Game total ticked in the suggested parlays builds parlays from the totals.

The owner ticked Game total in the Parlay Builder's suggested parlays and nothing showed: every
level said "No legs on your picks". Since v88 a total is priced at the book's own chance (its
over and under prices with the margin taken out), which sits under the chance its price implies,
so it could never clear the panel's rule that no leg is rated below the book, and pricedLegs left
the totals out of the pool altogether. The panel said so in a line, but a box that can be ticked
and never does anything reads as broken.

A total still has no edge, and nothing here pretends otherwise. With Game total ticked the week's
totals (both sides of every ticked game's posted total, a real price on each, the chance 45-97%)
are now a third list beside the preferred and thin legs, the market legs (pbPool's mkt). A level
is first built exactly as before from the legs with an edge; only when those cannot make a parlay
of its size at all is it built again with the totals added as fill beside the thin legs, the
fewest first, by the same two searches (the best return over the floor, else the likeliest of the
size). So under All on an ordinary week the tiers are unchanged and no total appears; with Game
total alone, or a pick too thin to fill a level, the totals fill it. A total on a card is marked
no edge, and a line under the card says it is at the book's own chance, so it has no edge, and is
there because the picks do not make a parlay of that size with an edge. The panel's line with Game
total ticked now says the same, the footer says it, and the Game bets card no longer says a total
never makes a suggested parlay. pricedLegs is unchanged: the game pages' hands and the Elo picks
still never take a total. One team bet a game holds for totals as for the rest.

The audit's M follows: the market list is only totals, only with Game total ticked, at the market's
chance on a real price; a tier holds a total only when the same level built from the legs with an
edge alone is empty, every total in it is a market leg marked so and counted, never thin; the
likeliest checks count a total as fill; and with Game total alone on the made-up prices every level
is built, of totals only. smoke.js holds the same on the page.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
FILES = {k: p for k, p in (('p2', HERE / 'part2.js'), ('p3', HERE / 'part3.js'), ('audit', HERE / 'audit.js'),
                           ('smoke', ROOT / 'nflbets' / 'build' / 'smoke.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'function pbMktLine' not in T['p3'], 'patch_pb_totals_market.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


OLD_NOTE = 'Game totals are priced at the book’s own chance, so they never make a suggested parlay; add one by hand from a game’s Game bets card.'
NEW_NOTE = 'Game totals have no edge: each is priced at the book’s own chance, so a level takes one only where the legs with an edge on your picks cannot make a parlay of its size, and marks it no edge.'

sub1('p2', "const APP_BUILD='app v90 \\u00b7 2026-10-11';", "const APP_BUILD='app v91 \\u00b7 2026-10-11';")
sub1('p2', """A total is never in a
   suggested parlay: at the book's own chance it has no edge for one to find. */""",
"""At the book's own chance
   a total has no edge, so a suggested parlay takes one only as the last fill, where the legs with
   an edge cannot make a level, and marks it no edge (pbPool's market legs, pbTier). */""")

# the Game bets card's words
sub1('p3', "A total is never in a suggested parlay; tick it here to add it by hand.",
     "A suggested parlay takes a total only where the legs with an edge run out, and marks it no edge; tick it here to add one yourself.")
# pricedLegs' comment
sub1('p3', """A game total
   is not among them: priced at the book's own chance (totalBet), it has no edge for a suggestion
   to find, so it is a leg a visitor adds by hand from the Game bets card */""",
"""A game total
   is not among them: priced at the book's own chance (totalBet), it has no edge for a suggestion
   to find. The suggested parlays panel adds the totals itself, as its last fill (pbPool's market
   legs); the game pages' hands and the Elo picks never take one */""")
# the panel's header comment
sub1('p3', """leg the model rates below the book. A game total is never a candidate: it is priced at the
   book's own chance (totalBet), which sits under the chance its price implies whenever the book
   takes a margin, so it has no edge to offer, and pricedLegs leaves it out. At most one team bet""",
"""leg the model rates below the book, with one exception. A game total has no edge to offer: it is
   priced at the book's own chance (totalBet), which sits under the chance its price implies
   whenever the book takes a margin, so pricedLegs leaves it out and it is never preferred or thin.
   With Game total ticked the week's totals are a third list, the market legs (pool.mkt), taken only
   where the legs with an edge cannot make a parlay of a level's size at all, and marked no edge on
   the card (the owner ticked Game total alone and got nothing, October 2026). At most one team bet""")
# the pool: the totals as a list of their own
sub1('p3', """    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});
  }
  return {pref:pbCap(pref),thin:pbCap(thin),plGames:plGames.size};""",
"""    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});
  }
  /* the totals, with Game total ticked: both sides of each ticked game's posted total on a real
     price, at the market's own chance. No edge, so never preferred or thin: a list of their own,
     the last a level draws on (pbTier) */
  const mkt=[];
  if(pbUi().k.total) for(const g of games) for(const side of ['over','under']){
    const c=totalLeg(g,side);
    if(c&&pbAllows(c)&&c.src==='real'&&isFinite(c.price)&&c.price!==0&&c.p>=PB_PMIN&&c.p<PB_PMAX) mkt.push({...c,thin:false,market:true}); }
  return {pref:pbCap(pref),thin:pbCap(thin),mkt:pbCap(mkt),plGames:plGames.size};""")
# a finalist counts its totals
sub1('p3', "return {legs:L,corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price}))),thin:L.filter(l=>l.thin).length};",
     "return {legs:L,corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price}))),thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length};")
# a level: the legs with an edge first, then the totals as fill
sub1('p3', """function pbTier(t,pool,memo){
  const r=pbBestReturn(t,pool,memo); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo); return x?{...x,likeliest:true}:null;
}""", """function pbTierOn(t,pool,memo){
  const r=pbBestReturn(t,pool,memo); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo); return x?{...x,likeliest:true}:null;
}
/* the legs with an edge first, exactly as before (preferred, then the fewest thin); only where
   they cannot make a parlay of the level's size at all are the totals added, as fill beside the
   thin legs, the fewest first, by the same two searches */
function pbTier(t,pool,memo){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:pool.pref,thin:[...pool.thin,...pool.mkt]},memo);
}""")
sub1('p3', "  const m=pbMaxLegs([...pool.pref,...pool.thin]);\n  const what=",
     "  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);\n  const what=")
sub1('p3', "const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,tiers:[],noPlayerPrices:false};",
     "const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,mkt:0,tiers:[],noPlayerPrices:false};")
sub1('p3', "  out.pref=pool.pref.length; out.thin=pool.thin.length; out.noPlayerPrices=c.players&&!pool.plGames;",
     "  out.pref=pool.pref.length; out.thin=pool.thin.length; out.mkt=pool.mkt.length; out.noPlayerPrices=c.players&&!pool.plGames;")
# the card: a total marked no edge, and a line saying why it is there
sub1('p3', """   is thin for that or for market + form not agreeing, where the Elo tab is on the page (form). A
   game total is never in a tier */""", """   is thin for that or for market + form not agreeing, where the Elo tab is on the page (form). A
   game total is never thin: it has no edge at all, and pbMktLine speaks for it */""")
sub1('p3', """function pbThinLine(legs,form){""", """/* what a total on a tier is: the book's own chance, so no edge, there only because the picks do
   not make a parlay of the tier's size from legs with an edge */
function pbMktLine(legs){
  const n=legs.filter(l=>l.market).length, one=n===1;
  return `${one?'The game total is':n+' game totals are'} at the book’s own chance with its margin out, so ${one?'it has':'they have'} no edge: ${one?'it is':'they are'} here because your picks do not make a parlay of this size from legs with an edge.`;
}
function pbThinLine(legs,form){""")
sub1('p3', "${esc(l.label)}${l.thin?' <i class=\"pb-thinmark\">thin edge</i>':''}</small>",
     "${esc(l.label)}${l.market?' <i class=\"pb-thinmark\">no edge</i>':(l.thin?' <i class=\"pb-thinmark\">thin edge</i>':'')}</small>")
sub1('p3', "    ${t.thin?`<p class=\"pb-thin\">${pbThinLine(t.legs,form)}</p>`:''}\n",
     "    ${t.thin?`<p class=\"pb-thin\">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt?`<p class=\"pb-thin\">${pbMktLine(t.legs)}</p>`:''}\n")
sub1('p3', OLD_NOTE, NEW_NOTE)
sub1('p3', "One leg a player, one team bet a game; legs in one game are priced together, as a book prices them.",
     "One leg a player, one team bet a game; legs in one game are priced together, as a book prices them. A game total has no edge, being the book’s own chance, and fills a level only where those legs cannot.")

# ---- the audit ----
sub1('audit', """     no tier ever holds a game total (priced at the book's own chance, it has no edge), with one
     line saying so whenever Game total is ticked.""", """     a game total (priced at the book's own chance, it has no edge) is in a tier only as the last
     fill, a market leg marked so, where the same level from the legs with an edge is empty, with
     one line saying so whenever Game total is ticked.""")
sub1('audit', """      const pool=games.length&&KINDS.some(k=>u.k[k])&&games.some(g=>!u.off.includes(g.id))?F('pbPool')(games.filter(g=>!u.off.includes(g.id))):{pref:[],thin:[]};
      const maxLegs=F('pbMaxLegs')([...pool.pref,...pool.thin]);""",
"""      const pool=games.length&&KINDS.some(k=>u.k[k])&&games.some(g=>!u.off.includes(g.id))?F('pbPool')(games.filter(g=>!u.off.includes(g.id))):{pref:[],thin:[],mkt:[]};
      const mkt=pool.mkt||[], maxLegs=F('pbMaxLegs')([...pool.pref,...pool.thin,...mkt]);
      /* the market list: only totals, only with Game total ticked, each on a ticked game at the
         market's own chance (totalLeg's) on a real price, 45-97%, never thin */
      chk(mkt.every(c=>c.stat==='total'&&c.market===true&&c.thin===false&&c.src==='real'&&c.p>=0.45&&c.p<0.97&&!u.off.includes(c.gid)
        &&Math.abs(c.p-F('totalLeg')(S.sched.find(g=>g.id===c.gid),c.side).p)<1e-12)&&(!!u.k.total||!mkt.length),`${lab}: the market list holds something other than a ticked game's total at the market's chance, or holds one with Game total unticked`);""")
sub1('audit', """        chk(!t.legs.some(l=>l.stat==='total'),`${lab}: the ${t.id} tier holds a game total (${t.legs.filter(l=>l.stat==='total').map(l=>l.label).join(', ')})`);""",
"""        /* a total only as the last fill: every total a market leg, counted, and only where the same
           level built from the legs with an edge alone is empty */
        chk(t.legs.every(l=>(l.stat==='total')===!!l.market)&&(t.mkt||0)===t.legs.filter(l=>l.market).length,`${lab}: the ${t.id} tier has a total that is not a market leg, or miscounts them`);
        if(t.mkt) chk(F('pbTier')(SPEC.find(s=>s[0]===t.id),{pref:pool.pref,thin:pool.thin,mkt:[]},new Map())===null,`${lab}: the ${t.id} tier took a game total where the legs with an edge make a parlay of its size`);""")
sub1('audit', """          chk(l.p>=mlP(l.price),`${lab}: ${l.name} ${l.label} is rated below the book (${(l.p*100).toFixed(1)}% against ${(mlP(l.price)*100).toFixed(1)}%)`);
          chk(l.thin===!(l.p-mlP(l.price)>=0.03&&F('formAgrees')(l)),`${lab}: ${l.name} ${l.label} is marked thin wrongly`);""",
"""          if(l.market) chk(l.stat==='total'&&l.thin===false,`${lab}: ${l.name} ${l.label} is a market leg that is not a total, or is marked thin`);
          else { chk(l.p>=mlP(l.price),`${lab}: ${l.name} ${l.label} is rated below the book (${(l.p*100).toFixed(1)}% against ${(mlP(l.price)*100).toFixed(1)}%)`);
            chk(l.thin===!(l.p-mlP(l.price)>=0.03&&F('formAgrees')(l)),`${lab}: ${l.name} ${l.label} is marked thin wrongly`); }""")
# the likeliest and best-return checks run on the pool the level was built from
sub1('audit', """        if(t.likeliest){ likeliestSeen++;
          chk(!!floor,`${lab}: Safe is marked as a fallback to the likeliest pair`);
          chk(!!bestRet&&bestRet(SPEC.find(s=>s[0]===t.id),pool,new Map())===null,`${lab}: the ${t.id} tier fell back to the likeliest ${n} legs though a ${n}-leg parlay clears its ${floor*100}% floor`);
          chk(t.thin===Math.max(0,n-maxLegsOf(pool.pref)),`${lab}: the likeliest ${n} legs take ${t.thin} thin legs where the preferred legs leave ${Math.max(0,n-maxLegsOf(pool.pref))} to fill`); }""",
"""        const from=t.mkt?{pref:pool.pref,thin:[...pool.thin,...mkt]}:{pref:pool.pref,thin:pool.thin}, fill=t.thin+(t.mkt||0);
        if(t.likeliest){ likeliestSeen++;
          chk(!!floor,`${lab}: Safe is marked as a fallback to the likeliest pair`);
          chk(!!bestRet&&bestRet(SPEC.find(s=>s[0]===t.id),from,new Map())===null,`${lab}: the ${t.id} tier fell back to the likeliest ${n} legs though a ${n}-leg parlay clears its ${floor*100}% floor`);
          chk(fill===Math.max(0,n-maxLegsOf(pool.pref)),`${lab}: the likeliest ${n} legs take ${fill} thin legs and totals where the preferred legs leave ${Math.max(0,n-maxLegsOf(pool.pref))} to fill`); }""")
sub1('audit', """        if(t.likeliest||!floor){ const all=[...pool.pref,...pool.thin];
          if(noMovers(all)){ const b=likeliestOf(all,n,t.thin);""",
"""        if(t.likeliest||!floor){ const all=[...from.pref,...from.thin];
          if(noMovers(all)){ const b=likeliestOf(all,n,fill);""")
sub1('audit', """        else if(floor&&bestRet){ const b=bestRet(SPEC.find(s=>s[0]===t.id),pool,new Map());""",
"""        else if(floor&&bestRet){ const b=bestRet(SPEC.find(s=>s[0]===t.id),from,new Map());""")
# likeliestOf counts a total as fill, as the search does
sub1('audit', "for(let i=i0;i<list.length;i++){ const c=list[i], th2=th+(c.thin?1:0); if(th2>thin||!fitsF(cur,c)) continue; cur.push(c); rec(i+1,cur,th2); cur.pop(); } };",
     "for(let i=i0;i<list.length;i++){ const c=list[i], th2=th+(c.thin||c.market?1:0); if(th2>thin||!fitsF(cur,c)) continue; cur.push(c); rec(i+1,cur,th2); cur.pop(); } };")
sub1('audit', """      /* the card on the page says the same, and with Game total ticked one line says why no total is in a tier */
      F('renderPb')();
      { const tx=d.getElementById('pbPanel').textContent.replace(/\\s+/g,' '), nt=tx.includes('""" + OLD_NOTE + """');
        chk(nt===!!u.k.total,`${lab}: ${u.k.total?'Game total is ticked and the panel does not say totals never make a suggested parlay':'Game total is not ticked and the panel still says totals never make one'}`);""",
"""      /* the card on the page says the same, and with Game total ticked one line says what a total in a tier is */
      F('renderPb')();
      { const tx=d.getElementById('pbPanel').textContent.replace(/\\s+/g,' '), nt=tx.includes('""" + NEW_NOTE + """');
        chk(nt===!!u.k.total,`${lab}: ${u.k.total?'Game total is ticked and the panel does not say a total has no edge and only fills':'Game total is not ticked and the panel still speaks of totals'}`);""")
sub1('audit', """        const tx=c.textContent.replace(/\\s+/g,' ');
        if(!t.legs) chk(tx.includes(t.why)""", """        const tx=c.textContent.replace(/\\s+/g,' ');
        /* a total on a card is marked no edge, and one line says what that is; nothing else is */
        if(t.legs) chk(c.querySelectorAll('.pb-legs li').length===t.legs.length&&t.legs.every((l,i)=>/no edge/.test(c.querySelectorAll('.pb-legs li')[i].textContent)===!!l.market)
          &&/because your picks do not make a parlay of this size from legs with an edge/.test(tx)===!!t.mkt,`${lab}: the ${t.id} card does not mark its totals no edge, or its line about them is ${t.mkt?'missing':'there with no total'}`);
        if(!t.legs) chk(tx.includes(t.why)""")
sub1('audit', """      chk(!F('pricedLegs')(games,true).some(l=>l.stat==='total')&&!F('pricedLegs')(games).some(l=>l.stat==='total'),'a game total is among the legs the suggestions, the game pages\\' or the Elo picks are built from');
      /* only Game total ticked: every total priced (-105/-115, +100/+100 with no margin, +110/+105 with less than none), and still no tier */
      { setKinds(['total']); const rT=F('getPbTiers')();
        chk(rT.tiers.every(t=>!t.legs&&/^No legs on your picks: tick more games or bet types\\.$/.test(t.why)),'with only Game total ticked and every total priced, a tier was built or did not say there are no legs: '+rT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
        setKinds(KINDS); }""",
"""      chk(!F('pricedLegs')(games,true).some(l=>l.stat==='total')&&!F('pricedLegs')(games).some(l=>l.stat==='total'),'a game total is among the legs the game pages\\' hands or the Elo picks are built from');
      /* only Game total ticked, every total priced (-105/-115, +100/+100 with no margin, +110/+105
         with less than none): every level a game makes legs for is built, of totals only, each a
         market leg; under All on the same prices the legs with an edge fill every level, so no total */
      { setKinds(['total']); const rT=F('getPbTiers')();
        chk(rT.tiers.every(t=>t.n>games.length?!t.legs:(!!t.legs&&t.legs.every(l=>l.stat==='total'&&l.market)&&t.mkt===t.n&&!t.thin)),
          'with only Game total ticked and every total priced, a level was not built of totals alone: '+rT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
        hold('made-up lines, Game total alone');
        setKinds(KINDS); const rAll=F('getPbTiers')();
        chk(rAll.tiers.every(t=>!t.legs||!t.mkt||F('pbTier')(SPEC.find(s=>s[0]===t.id),{...F('pbPool')(games),mkt:[]},new Map())===null),'under All a level took a total though the legs with an edge make it'); }""")

# ---- the page smoke ----
sub1('smoke', """      if (!on.length || !KINDS.some(k => u.k[k])) return 0; const p = w.eval('pbPool')(on); return w.eval('pbMaxLegs')([...p.pref, ...p.thin]); };""",
"""      if (!on.length || !KINDS.some(k => u.k[k])) return 0; const p = w.eval('pbPool')(on); return w.eval('pbMaxLegs')([...p.pref, ...p.thin, ...(p.mkt || [])]); };""")
sub1('smoke', """        chk(t.legs.every(l => l.src === 'real' && l.p >= mlProb(l.price) && l.p >= 0.45 && l.p < 0.97), `${lab}: the ${t.id} tier has a leg with no real price or rated below the book`);
        chk(!t.legs.some(l => l.stat === 'total'), `${lab}: the ${t.id} tier holds a game total, which is priced at the book's own chance`);""",
"""        chk(t.legs.every(l => l.src === 'real' && (l.market || l.p >= mlProb(l.price)) && l.p >= 0.45 && l.p < 0.97), `${lab}: the ${t.id} tier has a leg with no real price or rated below the book`);
        /* a total only as a market leg, marked no edge, and only where the legs with an edge cannot make the level */
        chk(t.legs.every(l => (l.stat === 'total') === !!l.market) && (t.mkt || 0) === t.legs.filter(l => l.market).length
          && (!t.mkt || w.eval('pbTier')(w.eval('PB_TIERS').find(s => s[0] === t.id), { pref: pool.pref, thin: pool.thin, mkt: [] }, new Map()) === null),
          `${lab}: the ${t.id} tier holds a total that is not a market leg, or took one where the legs with an edge make the level`);""")
sub1('smoke', """        if (t.likeliest || !t.floor) provedLikeliest(lab, t, [...pool.pref, ...pool.thin]);""",
"""        if ((t.likeliest || !t.floor) && !t.mkt) provedLikeliest(lab, t, [...pool.pref, ...pool.thin]);""")
sub1('smoke', """      /* with Game total ticked, one line says why no total is ever in a tier (and only then) */
      chk(txt(panel).includes('""" + OLD_NOTE + """') === !!u.k.total,
        `${lab}: ${u.k.total ? 'Game total is ticked and the panel does not say totals never make a suggested parlay' : 'Game total is not ticked and the panel still says totals never make one'}`);""",
"""      /* with Game total ticked, one line says what a total in a tier is (and only then) */
      chk(txt(panel).includes('""" + NEW_NOTE + """') === !!u.k.total,
        `${lab}: ${u.k.total ? 'Game total is ticked and the panel does not say a total has no edge and only fills' : 'Game total is not ticked and the panel still speaks of totals'}`);""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v91, the totals fill a level where the legs with an edge cannot, marked no edge; audit M and smoke follow')
