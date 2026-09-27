"""A suggested leg now needs market + form to agree with the model.

The Prop Record through week 3's Thursday game says the model's edge over the book is
not real: on the 496 book main lines it rated three or more points above DraftKings, it
said 66%, the book said 53% and 47% happened, a flat bet losing eleven cents on the
dollar. Every band of disagreement reads the same way. Yet the Suggested parlays, on the
week and on each game page, were still built from exactly those disagreements.

The Elo tab already carries a second price on every player leg the book has priced,
market + form: the book's chance moved by the player's rating on the side of the bet,
graded beside the model's on the Prop Record and about tying the book so far. A player
leg is now a candidate only where that price also clears the book's implied chance by
three points, the margin the model's own chance already has to clear, which stays. A
bare "above the book" was no bar at all: the fit shrinks a plus-money price toward even,
so every underdog leg cleared it by a hair; three points cuts this week's 293 candidates
to 49, led by the rated players on the side their rating favours. Team legs have no second price and keep the
old bar. Until the Elo files have loaded no player leg qualifies, and the loaded state
is part of both suggestion signatures, so the window rebuilds once they have. On the
prop model's own page, which has no Elo tab, nothing changes, and the audit proves the
gate with a stubbed second price. The copy on the empty and built suggestion cards says
the new bar. app v68.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P2 = HERE / 'part2.js'
A = HERE / 'audit.js'
E = HERE.parent.parent / 'nflbets' / 'build' / 'tab_elo.html'
SM = HERE.parent.parent / 'nflbets' / 'build' / 'smoke.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- the gate ----
sub1(J, """function suggestCandidates(games){
  const out=pricedLegs(games);
  const edge=c=>c.p-mlProb(c.price);
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&edge(c)>=0.03).sort((a,b)=>edge(b)-edge(a)).slice(0,40);
}""",
     """/* market + form is the Elo tab's second price on a player leg (window.eloAltP: the book's
   chance moved by the player's rating on the side of the bet). The model's own edge over
   the book has not held: through week 3 the main lines it rated three or more points above
   the book said 66%, the book said 53% and 47% happened. So a player leg is suggested only
   where market + form also clears the book's implied chance by the same three points. Team legs have no second price
   and keep the model's bar alone; the model's own page, without the Elo tab, suggests as it
   did. Until the Elo files have loaded no player leg qualifies, and the loaded state is in
   the suggestion signatures so the window rebuilds once they have. */
function formAgrees(c){
  if(typeof window.eloAltP!=='function'||c.grp==='TEAM') return true;
  if(typeof window.eloLoaded==='function'&&!window.eloLoaded()) return false;
  const a=window.eloAltP(c.pid,c.side,c.price,c.src);
  return a!=null&&a-mlProb(c.price)>=0.03;
}
function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
function suggestCandidates(games){
  const out=pricedLegs(games);
  const edge=c=>c.p-mlProb(c.price);
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&edge(c)>=0.03&&formAgrees(c)).sort((a,b)=>edge(b)-edge(a)).slice(0,40);
}""")

# ---- the signatures know whether the second price is there yet ----
sub1(J, "  return [g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||''].join('|');",
     "  return [g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||'',formSig()].join('|');")
sub1(J, "    Object.keys(S.processedGames||{}).length,S.margin||''].join('|');",
     "    Object.keys(S.processedGames||{}).length,S.margin||'',formSig()].join('|');")

# ---- the cards say the bar ----
sub1(J, "a suggestion needs two legs with a real sportsbook price that the model rates at least three points above that price${s.candidates===1?', and only one qualifies':''}.",
     "a suggestion needs two legs with a real sportsbook price that the model rates at least three points above that price, and that market + form (the book's chance moved by the player's Elo) also rates three points above it${s.candidates===1?', and only one qualifies':''}.")
sub1(J, "They use only lines with a real sportsbook price that the model rates above the book, ${s.candidates?",
     "They use only lines with a real sportsbook price that the model rates above the book and that market + form, the book's chance moved by the player's Elo, also rates three points above it, ${s.candidates?")
sub1(J, "Built from week ${w} lines with a real sportsbook price that the model rates above the book. Safe is",
     "Built from week ${w} lines with a real sportsbook price that the model rates above the book and that market + form, the book's chance moved by the player's Elo, also rates three points above it. Safe is")

# ---- the Elo tab says when its files are in ----
sub1(E, "window.eloAltP=altP;", "window.eloAltP=altP;\nwindow.eloLoaded=()=>!!D.players;")

# ---- version ----
sub1(P2, "const APP_BUILD='app v67 \\u00b7 2026-09-25';", "const APP_BUILD='app v68 \\u00b7 2026-09-27';")

# ---- the audit proves the gate with a stubbed second price ----
sub1(A, "    console.log(`M. suggested parlays: ${SG.candidates} qualifying lines, tiers",
     """    /* market + form gates the player legs when the Elo tab is on the page: a second price
       under the book empties them, one above it changes nothing, team legs are untouched */
    { const base=F('suggestCandidates')(); w.eloLoaded=()=>true;
      w.eloAltP=()=>0.01; const shut=F('suggestCandidates')();
      const teamBar=F('pricedLegs')().filter(c=>c.grp==='TEAM'&&isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&c.p-F('mlProb')(c.price)>=0.03).length;
      chk(shut.every(c=>c.grp==='TEAM')&&shut.length===Math.min(40,teamBar),'a second price under the book should leave only the team legs');
      w.eloAltP=()=>0.999; const open=F('suggestCandidates')();
      chk(open.length===base.length&&open.every((c,i)=>c.key===base[i].key&&c.side===base[i].side&&c.k===base[i].k),'a second price above the book should change nothing');
      w.eloLoaded=()=>false; chk(F('suggestCandidates')().every(c=>c.grp==='TEAM'),'before the Elo files load no player leg should qualify');
      chk(F('formSig')()==='noform'&&(w.eloLoaded=()=>true,F('formSig')()==='form'),'the suggestion signature does not follow the Elo files');
      delete w.eloAltP; delete w.eloLoaded; chk(F('formSig')()===''&&F('suggestCandidates')().length===base.length,'without the Elo tab the bar should be the model\\'s alone'); }
    console.log(`M. suggested parlays: ${SG.candidates} qualifying lines, tiers""")

# ---- the page's smoke: with the real ratings in, every suggested player leg clears market + form ----
sub1(SM, "    /* the Props game view: the same shield on a ranked player's row */",
     """    /* the suggestions: with the ratings in, a player leg is a candidate only where market + form beats the book */
    { chk(w.eval('window.eloLoaded()') === true, 'the Elo tab does not say its files are in');
      const cands = w.eval('suggestCandidates()'), mlProb = w.eval('mlProb'), altP = w.eval('window.eloAltP');
      chk(cands.filter(c => c.grp !== 'TEAM').every(c => altP(c.pid, c.side, c.price, c.src) - mlProb(c.price) >= 0.03), 'a suggested player leg does not clear market + form');
      chk(w.eval('getSuggestions().sig').endsWith('|form'), 'the week\\'s suggestion signature does not carry the Elo state: ' + w.eval('getSuggestions().sig')); }
    /* the Props game view: the same shield on a ranked player's row */""")
print('ok')
