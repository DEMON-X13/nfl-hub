"""The week-wide tiers price same-game legs properly, and baked prices reach a
browser that already has some.

Two things the screenshot showed. The Medium tier read +868 and $9.68 on three
Detroit at Buffalo legs: buildSuggestions still multiplied leg prices, so the
tiers were scored and shown on a payout no book pays. They now use parlayDec, the
same pricing the builder and the game page use, so same-game legs price together
and cross-game legs multiply.

Knox stood at +250 when DraftKings has +223. applyBaked skipped any week that
already had prices in the browser, a rule written to protect uploaded sheets. The
upload path is gone, and the rule meant a refreshed pull never reached a returning
browser. Worse, Saturday's pull adds fourteen games to a week that already holds
Thursday's, and every one of them would have been skipped. Baked prices are now
versioned by the build that carried them: a new build reloads them, the same build
is still a no-op, and nothing the user could type is at stake because there is no
longer anywhere to type it.

parlayDec takes a sims argument, because scoring loops call it hundreds of times
and 20,000 draws per call was fine for a display and far too slow for a search.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- parlayDec: a sims argument, cheap in a search, full for a display ----
sub1(J, """function parlayDec(priced){
  const byGame={};""",
     """function parlayDec(priced,sims){
  const byGame={};""")
sub1(J, "    const pj=parlayProb(grp.map(x=>({...x.leg,p:mlProb(x.ml)})),20000).corr;",
     "    const pj=parlayProb(grp.map(x=>({...x.leg,p:mlProb(x.ml)})),sims||20000).corr;")

# ---- the week-wide tiers score and show the real payout ----
sub1(J, """  const cands=suggestCandidates();
  const dec=legs=>legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1);""",
     """  const cands=suggestCandidates();
  /* what a book pays for these legs together: same-game legs priced as one, cross-game legs multiplied */
  const dec=(legs,sims)=>parlayDec(legs.map(l=>({leg:l,ml:l.price})),sims);""")
sub1(J, "        const score=(forced&&id==='safe')?p:p*dec(next);",
     "        const score=(forced&&id==='safe')?p:p*dec(next,2000);")
# gameSuggestion's search was calling the display-grade version per candidate
sub1(J, "      const score=p*parlayDec(next.map(l=>({leg:l,ml:l.price})));",
     "      const score=p*parlayDec(next.map(l=>({leg:l,ml:l.price})),2000);")

# ---- baked prices are versioned by the build that carried them ----
sub1(J, """  for(const w of Object.keys(PAY.prices||{}).sort((a,b)=>a-b)){
    const gids=gamesIn(+w).map(g=>g.id);
    if(gids.some(id=>S.odds[id]&&Object.keys(S.odds[id]).length)) continue;
    done.prices+=ingestOdds(PAY.prices[w],+w,true).n; }""",
     """  /* prices are reloaded whenever the build that carried them changes, and left alone
     when it has not. There is no upload path any more, so nothing the user typed is at
     stake; a week that already holds Thursday's game must still take Saturday's. */
  const pricesFrom=PAY.baked_at||PAY.build||'';
  if(S.pricesFrom!==pricesFrom){
    for(const w of Object.keys(PAY.prices||{}).sort((a,b)=>a-b)) done.prices+=ingestOdds(PAY.prices[w],+w,true).n;
    if(Object.keys(PAY.prices||{}).length) S.pricesFrom=pricesFrom; }""")

# ---- audit: the reload rule, and the tiers' price ----
sub1(A, "  /* ---- Q. same-game parlays are priced together, not multiplied ---- */",
     """  /* ---- R. baked prices follow the build, and the tiers price like a book ---- */
  { const s=F('getSuggestions')();
    if(s.tiers.length){
      const pd=F('parlayDec');
      for(const t of s.tiers){
        const mult=t.legs.reduce((a,l)=>a*F('mlToDec')(l.price),1);
        chk(Math.abs(t.dec-pd(t.legs.map(l=>({leg:l,ml:l.price}))))<1e-6,`${t.label} tier's price is not what parlayDec says`);
        if(F('sameGame')(t.legs)) chk(t.dec<mult-1e-9,`${t.label} tier multiplies legs that share a game`);
        else chk(Math.abs(t.dec-mult)<1e-9,`${t.label} tier does not multiply legs from different games`);
      }
    }
    /* a browser holding last build's prices must take this build's */
    const wk=Object.keys(PAY.prices||{})[0];
    if(wk){
      const gid=gamesIn(+wk).map(g=>g.id).find(id=>S.odds[id]&&Object.keys(S.odds[id]).length);
      if(gid){
        const pid=Object.keys(S.odds[gid])[0], st=Object.keys(S.odds[gid][pid])[0], k=Object.keys(S.odds[gid][pid][st])[0];
        const real=S.odds[gid][pid][st][k];
        S.odds[gid][pid][st][k]=real+1000; S.pricesFrom='some-older-build';
        const r=F('applyBaked')();
        chk(r.prices>0,'a new build did not reload prices over a browser that had old ones');
        chk(S.odds[gid][pid][st][k]===real,'the stale price survived the new build');
        const again=F('applyBaked')();
        chk(again.prices===0,'the same build reloaded prices a second time');
      }
    }
    console.log(`R. tiers priced like a book; baked prices follow the build`); }

  /* ---- Q. same-game parlays are priced together, not multiplied ---- */""")

print('tiers use parlayDec; baked prices versioned by build')
