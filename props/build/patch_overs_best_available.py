"""Player overs shows the best overs on offer, with no minimum.

The owner turned the Suggested parlays switch to Player overs and saw nothing all week: no
over cleared the bar every suggestion has to (the model three points above the book's
price, and market + form, the book's chance moved by the player's Elo, three points above
it too). He asked for no minimum in that mode, just the best available. With Player overs on,
suggestCandidates now keeps every player over with a real price and a chance from 45 to 97
percent, ranked by how far the model and market + form together put it above the book (the
two edges averaged where market + form has a price, the model's alone where it has none), so
the week's tiers, each game page's card and the shuffle all build from the best overs there
are. Some sit below the book; the expected return on each tier says so, and the window and
the game card say this mode has no minimum. Any and Player unders keep the bar. app v72.
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


sub1(J, """function suggestCandidates(games){
  const out=pricedLegs(games);
  const edge=c=>c.p-mlProb(c.price);
  return out""", """function suggestCandidates(games){
  const out=pricedLegs(games);
  const edge=c=>c.p-mlProb(c.price);
  /* Player overs has no minimum: the best overs on offer, ranked by how far the model and
     market + form together put each above the book, whether or not either clears it */
  if(suggestSide()==='over'){
    const both=c=>{ const a=typeof window.eloAltP==='function'?window.eloAltP(c.pid,c.side,c.price,c.src):null;
      return a==null?edge(c):(edge(c)+(a-mlProb(c.price)))/2; };
    return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&sideAllows(c)).sort((a,b)=>both(b)-both(a)).slice(0,40);
  }
  return out""")

# the window says what this mode is
sub1(J, """      body=`<p class="muted" style="margin:0 0 14px">Built from week ${w} lines with a real sportsbook price that the model rates above the book and that market + form, the book's chance moved by the player's Elo, also rates three points above it${suggestSide()==='any'?'':`, player ${suggestSide()}s only`}.""",
     """      body=`<p class="muted" style="margin:0 0 14px">${suggestSide()==='over'?`The best player overs on offer in week ${w}, with no minimum: every over with a real sportsbook price, ranked by how far the model and market + form, the book's chance moved by the player's Elo, together put it above the book. Some sit below the book's price, and the expected return on each parlay says so.`:`Built from week ${w} lines with a real sportsbook price that the model rates above the book and that market + form, the book's chance moved by the player's Elo, also rates three points above it${suggestSide()==='any'?'':`, player ${suggestSide()}s only`}.`}""")

# and the game card's footer
sub1(J, """    <p class="muted gsugg-ft">Chance that every leg lands, correlations included.""",
     """    <p class="muted gsugg-ft">${suggestSide()==='over'?'Player overs, best available: no minimum, so a leg can sit below the book\\u2019s price. ':''}Chance that every leg lands, correlations included.""")

sub1(P2, "const APP_BUILD='app v71 \\u00b7 2026-09-28';", "const APP_BUILD='app v72 \\u00b7 2026-10-01';")

# the audit: overs are every eligible player over, best first, no edge bar; unders keep the bar
sub1(A, """      setSide('over'); const ov=F('suggestCandidates')(); chk(ov.every(c=>c.grp!=='TEAM'&&c.side==='over')&&ov.length===Math.min(40,F('pricedLegs')().filter(c=>c.grp!=='TEAM'&&c.side==='over'&&isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&c.p-F('mlProb')(c.price)>=0.03).length),'player overs should be the player over legs and nothing else');""",
     """      setSide('over'); const ov=F('suggestCandidates')();
      const allOv=F('pricedLegs')().filter(c=>c.grp!=='TEAM'&&c.side==='over'&&isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97);
      chk(ov.every(c=>c.grp!=='TEAM'&&c.side==='over')&&ov.length===Math.min(40,allOv.length),'player overs should be every priced player over, with no minimum, and nothing else');
      { const im=F('mlProb'), sc=c=>{ const a=w.eloAltP?w.eloAltP(c.pid,c.side,c.price,c.src):null; return a==null?c.p-im(c.price):((c.p-im(c.price))+(a-im(c.price)))/2; };
        chk(ov.every((c,i)=>i===0||sc(ov[i-1])>=sc(c)-1e-12),'player overs are not ranked best first'); }""")
sub1(A, """      setSide('under'); const un=F('suggestCandidates')(); chk(un.every(c=>c.grp!=='TEAM'&&c.side==='under'),'player unders let something else through');""",
     """      setSide('under'); const un=F('suggestCandidates')(); chk(un.every(c=>c.grp!=='TEAM'&&c.side==='under'&&c.p-F('mlProb')(c.price)>=0.03),'player unders let something else through, or dropped the bar');""")
