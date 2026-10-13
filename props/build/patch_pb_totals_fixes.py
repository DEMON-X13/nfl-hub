"""app v93: what the review of the totals fill found.

Four things from the adversarial review of v91 and v92, each reproduced before it was fixed.

A level that needed the totals let them push out thin-edge legs. The fill pass put the totals
beside the thin legs and took the fewest of the two together, so a level could hold more no-edge
totals than it needed while a leg with an edge (a thin one) sat unused. Now the fill pass takes
every leg with an edge, preferred and thin alike, as its base, and the totals as the only fill, the
fewest totals first (pbTier); thin legs are still counted and marked as before.

With player bets ticked and no player prices in yet (Sunday's slate is priced Saturday morning),
the levels that used to be empty with "No player prices yet" now fill from the totals, and nothing
said the player legs were missing for want of a price, not of an edge. The panel now says so in a
note whenever player bets are ticked, none of their prices are in and a level is built.

The audit's Game-total-alone check counted every game left rather than the games with a priced
total, so a slate with a game lacking a posted total would fail it; it counts the totals the pool
holds. The page smoke never ticked Game total alone, so it passed with the owner's bug put back; it
now does, on the made-up prices, and holds every level the totals make legs for to totals only,
each marked no edge, with the card's line. The audit's and the smoke's likeliest checks follow the
new fill (the fewest totals over the legs with an edge), and M3 holds the new note.

CLAUDE.md and docs/ARCHITECTURE.md said a total is never in a tier and quoted the old line; they now
say what the panel does. Every edit is made in memory and asserted to match exactly once; nothing is
written unless all of them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
FILES = {k: p for k, p in (('p2', HERE / 'part2.js'), ('p3', HERE / 'part3.js'), ('audit', HERE / 'audit.js'),
                           ('smoke', ROOT / 'nflbets' / 'build' / 'smoke.js'), ('claude', ROOT / 'CLAUDE.md'),
                           ('arch', ROOT / 'docs' / 'ARCHITECTURE.md'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'Player prices are not in yet for your picks' not in T['p3'], 'patch_pb_totals_fixes.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


NOTE = 'Player prices are not in yet for your picks, so the tiers below are built without player legs: they are pulled on game day or the day before, Sunday’s games on Saturday morning.'

sub1('p2', "const APP_BUILD='app v92 \\u00b7 2026-10-11';", "const APP_BUILD='app v93 \\u00b7 2026-10-11';")
sub1('p3', """/* the legs with an edge first, exactly as before (preferred, then the fewest thin); only where
   they cannot make a parlay of the level's size at all are the totals added, as fill beside the
   thin legs, the fewest first, by the same two searches */
function pbTier(t,pool,memo){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:pool.pref,thin:[...pool.thin,...pool.mkt]},memo);
}""", """/* the legs with an edge first, exactly as before (preferred, then the fewest thin); only where
   they cannot make a parlay of the level's size at all are the totals added: every leg with an
   edge, preferred and thin alike, is then the base and the totals the only fill, the fewest totals
   first, by the same two searches, so a total never takes the place of a leg with an edge */
function pbTier(t,pool,memo){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo);
}""")
sub1('p3', """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under))""",
     """  /* player bets ticked, none of their prices in, and a level built all the same (from team bets
     or totals): the levels say nothing of the missing player legs, so the panel does */
  if(r.noPlayerPrices&&r.tiers.some(t=>t.legs)) notes.push('""" + NOTE + """');
  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under))""")

# ---- the audit ----
sub1('audit', "    const likeliestOf=(list,n,thin)=>{ let best=-1, legs=null, seen=0;",
     "    const likeliestOf=(list,n,thin,mk)=>{ let best=-1, legs=null, seen=0;")
sub1('audit', "const c=list[i], th2=th+(c.thin||c.market?1:0);",
     "const c=list[i], th2=th+((mk?c.market:c.thin)?1:0);")
sub1('audit', """        const from=t.mkt?{pref:pool.pref,thin:[...pool.thin,...mkt]}:{pref:pool.pref,thin:pool.thin}, fill=t.thin+(t.mkt||0);""",
     """        /* a level with a total was built on every leg with an edge as its base and the totals as fill */
        const from=t.mkt?{pref:[...pool.pref,...pool.thin],thin:mkt}:{pref:pool.pref,thin:pool.thin}, fill=t.mkt?t.mkt:t.thin;""")
sub1('audit', """          chk(fill===Math.max(0,n-maxLegsOf(pool.pref)),`${lab}: the likeliest ${n} legs take ${fill} thin legs and totals where the preferred legs leave ${Math.max(0,n-maxLegsOf(pool.pref))} to fill`); }""",
     """          chk(fill===Math.max(0,n-maxLegsOf(from.pref)),`${lab}: the likeliest ${n} legs take ${fill} ${t.mkt?'totals':'thin legs'} where the ${t.mkt?'legs with an edge':'preferred legs'} leave ${Math.max(0,n-maxLegsOf(from.pref))} to fill`); }""")
sub1('audit', "          if(noMovers(all)){ const b=likeliestOf(all,n,fill);",
     "          if(noMovers(all)){ const b=likeliestOf(all,n,fill,!!t.mkt);")
sub1('audit', """      { setKinds(['total']); const rT=F('getPbTiers')();
        chk(rT.tiers.every(t=>t.n>games.length?!t.legs:""", """      { setKinds(['total']); const rT=F('getPbTiers')(), nT=new Set(F('pbPool')(games).mkt.map(l=>l.gid)).size;
        chk(rT.tiers.every(t=>t.n>nT?!t.legs:""")
sub1('audit', """       market + form (a player leg's second price), so it never reads as wanting it (a game total
       is never in a tier) */""", """       market + form (a player leg's second price), so it never reads as wanting it (a game total
       is never thin: pbMktLine speaks for it) */""")
sub1('audit', """      setKinds(KINDS); const rA=hold('no player prices, all');
      chk(rA.noPlayerPrices&&rA.tiers.every(t=>t.legs?t.legs.every(isG):t.why.endsWith(', and '+noPlLow)),'with no player price on file, All builds a player leg, or an empty tier does not say no player prices are on file: '+rA.tiers.map(t=>t.why||'built').join(' / '));""",
"""      setKinds(KINDS); const rA=hold('no player prices, all');
      chk(rA.noPlayerPrices&&rA.tiers.every(t=>t.legs?t.legs.every(isG):t.why.endsWith(', and '+noPlLow)),'with no player price on file, All builds a player leg, or an empty tier does not say no player prices are on file: '+rA.tiers.map(t=>t.why||'built').join(' / '));
      /* a level built with no player price on file says nothing of the missing player legs, so the
         panel does, whenever one is built; and player bets with Game total build their levels from
         the totals, with that note */
      const PL_NOTE='""" + NOTE + """';
      F('renderPb')(); chk(d.getElementById('pbPanel').textContent.replace(/\\s+/g,' ').includes(PL_NOTE)===rA.tiers.some(t=>t.legs),'with no player price on file and All ticked, the note that the tiers are built without player legs is missing, or shows with no tier built');
      setKinds(['over','under','total']); const rPT=hold('no player prices, player bets and Game total'), mkPT=F('pbPool')(games).mkt.length; F('renderPb')();
      chk((!mkPT||rPT.tiers.some(t=>t.legs))&&rPT.tiers.every(t=>!t.legs||t.legs.every(l=>l.market))&&d.getElementById('pbPanel').textContent.replace(/\\s+/g,' ').includes(PL_NOTE)===rPT.tiers.some(t=>t.legs),
        'with no player price on file, player bets and Game total do not build their levels from the totals with the note that player prices are not in yet: '+rPT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
      setKinds(KINDS);""")

# ---- the page smoke ----
sub1('smoke', """        if ((t.likeliest || !t.floor) && !t.mkt) provedLikeliest(lab, t, [...pool.pref, ...pool.thin]);""",
"""        if ((t.likeliest || !t.floor) && !t.mkt) provedLikeliest(lab, t, [...pool.pref, ...pool.thin]);
        /* a likeliest level with totals takes the fewest: every leg with an edge first */
        if (t.mkt && t.likeliest) chk(t.mkt === Math.max(0, t.n - w.eval('pbMaxLegs')([...pool.pref, ...pool.thin])), `${lab}: the ${t.id} tier takes ${t.mkt} totals where the legs with an edge leave fewer to fill`);""")
sub1('smoke', """      const built = hold('made-up lines');
      chk(built >= 2, 'with a made-up line on every starter, fewer than two tiers were built');""",
"""      const built = hold('made-up lines');
      chk(built >= 2, 'with a made-up line on every starter, fewer than two tiers were built');
      /* Game total alone, as the owner ticked it: every level the priced totals make legs for is
         built of totals only, each marked no edge, and its card says why they are there */
      { const keepK = JSON.stringify(U().k); for (const k of KINDS) U().k[k] = k === 'total'; w.eval('PB_CACHE=new Map(); renderParlay()'); await wait(40);
        const nT = new Set(w.eval('pbPool(pbGames())').mkt.map(l => l.gid)).size, rT = w.eval('getPbTiers()');
        hold('made-up lines, Game total alone');
        chk((nT >= 2 || games.length < 3) && rT.tiers.every(x => x.n > nT ? !x.legs : (!!x.legs && x.legs.every(l => l.market && l.stat === 'total') && x.mkt === x.n)),
          `with only Game total ticked, a level the totals make legs for was not built of totals alone (${nT} totals priced): ` + rT.tiers.map(x => x.why || x.legs.map(l => l.label).join('+')).join(' / '));
        for (const x of rT.tiers.filter(x => x.legs)) { const c = d.querySelector(`#pbPanel .pb-tier.${x.id}`);
          chk(!!c && [...c.querySelectorAll('.pb-legs li')].every(li => /no edge/i.test(txt(li))) && /because your picks do not make a parlay of this size from legs with an edge/.test(txt(c)),
            `the ${x.id} card does not mark its totals no edge or say why they are there`); }
        Object.assign(U().k, JSON.parse(keepK)); w.eval('PB_CACHE=new Map(); renderParlay()'); await wait(40); }""")

# ---- the docs ----
sub1('claude', """A no-vig chance sits under the chance its price implies, so a total
could never clear the panel's bar, and `pricedLegs` leaves the totals out altogether; with Game total
ticked the panel says so in one line. The audit's J2 holds the chance to the no-vig chance of the
prices on every game and with the model's points moved, and M holds that no tier ever holds a total.""",
"""A no-vig chance sits under the chance its price implies, so a total
never clears the panel's bar and `pricedLegs` leaves the totals out; with Game total ticked the
suggested parlays take them only as the last fill, marked no edge (app v91-v93, below). The audit's J2
holds the chance to the no-vig chance of the prices on every game and with the model's points moved,
and M holds a total in a tier to that.""")
sub1('claude', """A game total is never in a tier: it is priced at the
book's own chance, so it has no edge to offer, and the Game total box only brings up the line saying
so ("Game totals are priced at the book's own chance, so they never make a suggested parlay; add one
by hand from a game's Game bets card."). One team bet a game, one leg a player, no line twice.""",
"""A game total has no edge (it is the book's own
chance), so it is never preferred or thin: with Game total ticked the week's totals are a third list,
the market legs (`pool.mkt`), taken only where the legs with an edge cannot make a level of its size,
those legs then the base and the totals the only fill, the fewest first (`pbTier`); each is marked no
edge on its card with a line saying why (`pbMktLine`). With player bets ticked and none of their prices
in yet, a note says the levels are built without player legs. A game gives one side (to win or to
cover) and its total, which a book takes on one ticket and which are unrelated (`legRho`); one leg a
player, no line twice.""")
sub1('arch', """A game total is never a candidate: it is priced at the book's own chance (see
**game bets** below), which sits under the chance its price implies, so `pricedLegs()` leaves the
totals out, and the Game total box only brings up a line saying they never make a suggested parlay
and are added by hand from a game's Game bets card. One team bet a game, one leg a player, no line
twice.""", """A game total has no edge: it is priced at the book's own chance (see **game
bets** below), which sits under the chance its price implies, so `pricedLegs()` leaves the totals out
and a total is never preferred or thin. With Game total ticked `pbPool` adds the week's totals as a
third list, the market legs (`pool.mkt`: both sides of each ticked game's posted total on a real
price, 45-97%), and `pbTier` uses them only where the legs with an edge cannot make a level of its
size, with every leg with an edge as the base and the totals the only fill, the fewest first; a
total is marked no edge on its card with a line saying why (`pbMktLine`). With player bets ticked and
none of their prices in, a note says the levels are built without player legs. A game gives one
side (to win or to cover) and its total (`pbFits`, `pbMaxLegs`; unrelated, `legRho`), one leg a
player, no line twice.""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v93, totals the only fill over every leg with an edge; the no-player-prices note; tests and docs follow')
