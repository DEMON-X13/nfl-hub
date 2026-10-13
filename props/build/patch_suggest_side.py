"""Suggested parlays can be player overs only, or player unders only.

A switch in the Suggested parlays window's header, Any / Player overs / Player unders,
kept in S.ui.suggestSide. With a side chosen, suggestCandidates keeps only player legs on
that side (a touchdown leg is an over), so the three tiers, each game page's Suggested
parlay and the Elo picks in the same window are all built from that side alone; team
legs drop out, because a game bet has no over or under. Any is the old behaviour. The
setting is part of both suggestion signatures, so changing it rebuilds; the empty cards
say which side they were looking for. The audit proves the filter and the switch; the
page's smoke proves the Elo picks follow it. app v69.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P1 = HERE / 'part1.html'
P2 = HERE / 'part2.js'
A = HERE / 'audit.js'
E = HERE.parent.parent / 'nflbets' / 'build' / 'tab_elo.html'
SM = HERE.parent.parent / 'nflbets' / 'build' / 'smoke.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- the setting ----
sub1(J, "suggestMin:!!(saved&&saved.ui&&saved.ui.suggestMin)};",
     "suggestMin:!!(saved&&saved.ui&&saved.ui.suggestMin),suggestSide:['over','under'].includes(saved&&saved.ui&&saved.ui.suggestSide)?saved.ui.suggestSide:'any'};")

# ---- the filter, shared by the week's tiers and each game's card ----
sub1(J, """function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
function suggestCandidates(games){
  const out=pricedLegs(games);
  const edge=c=>c.p-mlProb(c.price);
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&edge(c)>=0.03&&formAgrees(c)).sort((a,b)=>edge(b)-edge(a)).slice(0,40);
}""",
     """function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
/* the side switch in the Suggested parlays window: Any, or player overs only, or player
   unders only. A touchdown leg is an over; a game bet has no side and drops out. */
const SUGGEST_SIDES=[['any','Any'],['over','Player overs'],['under','Player unders']];
function suggestSide(){ const s=S.ui&&S.ui.suggestSide; return s==='over'||s==='under'?s:'any'; }
function sideAllows(c){ const s=suggestSide(); return s==='any'||(c.grp!=='TEAM'&&c.side===s); }
function suggestCandidates(games){
  const out=pricedLegs(games);
  const edge=c=>c.p-mlProb(c.price);
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&edge(c)>=0.03&&formAgrees(c)&&sideAllows(c)).sort((a,b)=>edge(b)-edge(a)).slice(0,40);
}""")
sub1(J, "g.mlh,g.mla,PAY.baked_at||'',S.margin||'',formSig()].join('|');",
     "g.mlh,g.mla,PAY.baked_at||'',S.margin||'',formSig(),suggestSide()].join('|');")
sub1(J, "    Object.keys(S.processedGames||{}).length,S.margin||'',formSig()].join('|');",
     "    Object.keys(S.processedGames||{}).length,S.margin||'',formSig(),suggestSide()].join('|');")

# ---- the switch in the window's header, and the empty cards saying the side ----
sub1(J, """      ${open?`<label class="muted sugg-stake">Bet $<input type="number" id="suggStake" value="${stake}" min="0" step="1" inputmode="decimal" aria-label="Amount to bet on a suggested parlay"></label>`:''}""",
     """      ${open?`<span class="sugg-side" role="group" aria-label="Which legs to build from">${SUGGEST_SIDES.map(([k,l])=>`<button type="button" class="${suggestSide()===k?'on':''}" data-suggest-side="${k}" aria-pressed="${suggestSide()===k}">${l}</button>`).join('')}</span>
      <label class="muted sugg-stake">Bet $<input type="number" id="suggStake" value="${stake}" min="0" step="1" inputmode="decimal" aria-label="Amount to bet on a suggested parlay"></label>`:''}""")
sub1(J, "  $('suggOpen')?.addEventListener('click',openSuggest);",
     """  $('suggOpen')?.addEventListener('click',openSuggest);
  document.querySelectorAll('[data-suggest-side]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.suggestSide=b.dataset.suggestSide; save(); renderParlay(); if(suggestOpen()) fillSuggest(); }));""")
sub1(J, "      body=`<p class=\"muted\" style=\"margin:0\">No suggestions for week ${w} yet. They use only lines",
     "      body=`<p class=\"muted\" style=\"margin:0\">No ${suggestSide()==='any'?'':'player-'+suggestSide()+' '}suggestions for week ${w} yet. They use only lines")
sub1(J, "Player prices arrive with the Thursday and Saturday pulls.</p>`;\n    } else {",
     "Player prices arrive with the Thursday and Saturday pulls.${suggestSide()==='any'?'':' Any switches the game bets and the other side back on.'}</p>`;\n    } else {")
sub1(J, "also rates three points above it. Safe is",
     "also rates three points above it${suggestSide()==='any'?'':`, player ${suggestSide()}s only`}. Safe is")
sub1(J, "    <p class=\"muted\" style=\"margin:0\">Nothing here clears the bar yet: a suggestion needs two legs",
     "    <p class=\"muted\" style=\"margin:0\">Nothing here clears the bar yet${suggestSide()==='any'?'':' among player '+suggestSide()+'s, the side set in Suggested parlays'}: a suggestion needs two legs")

# ---- the switch's look ----
sub1(P1, ".sugg-stake{display:inline-flex;align-items:center;gap:4px;font-size:13px;white-space:nowrap}",
     """.sugg-side{display:inline-flex;border:1px solid var(--line-2);border-radius:10px;overflow:hidden;box-shadow:var(--sh-xs)}
.sugg-side button{background:var(--panel);color:var(--muted);border:0;border-left:1px solid var(--line-2);padding:7px 11px;font:inherit;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap}
.sugg-side button:first-child{border-left:0}
.sugg-side button.on{background:linear-gradient(180deg,#1A2B45,#0F1B2D);color:#fff}
.sugg-stake{display:inline-flex;align-items:center;gap:4px;font-size:13px;white-space:nowrap}""")

# ---- the Elo picks in the same window follow the switch ----
sub1(E, "    if(l.grp==='TEAM'||l.src!=='real'||!isFinite(l.price)||l.price<EP.lo||l.price>EP.hi) continue;",
     """    if(l.grp==='TEAM'||l.src!=='real'||!isFinite(l.price)||l.price<EP.lo||l.price>EP.hi) continue;
    if(typeof sideAllows==='function'&&!sideAllows(l)) continue;   /* the window's side switch */""")

# ---- version ----
sub1(P2, "const APP_BUILD='app v68 \\u00b7 2026-09-27';", "const APP_BUILD='app v69 \\u00b7 2026-09-28';")

# ---- the audit proves the filter and the switch ----
sub1(A, "    console.log(`M. suggested parlays: ${SG.candidates} qualifying lines, tiers",
     """    /* the side switch: overs keep only player overs, unders only player unders, Any everything */
    { const any=F('suggestCandidates')(); const setSide=s=>{ S.ui.suggestSide=s; };
      setSide('over'); const ov=F('suggestCandidates')(); chk(ov.every(c=>c.grp!=='TEAM'&&c.side==='over')&&ov.length===Math.min(40,F('pricedLegs')().filter(c=>c.grp!=='TEAM'&&c.side==='over'&&isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&c.p-F('mlProb')(c.price)>=0.03).length),'player overs should be the player over legs and nothing else');
      setSide('under'); const un=F('suggestCandidates')(); chk(un.every(c=>c.grp!=='TEAM'&&c.side==='under'),'player unders let something else through');
      chk(F('getSuggestions')().sig.endsWith('|under')&&F('getSuggestions')().tiers.every(t=>t.legs.every(l=>l.side==='under'&&l.grp!=='TEAM')),'the tiers do not follow the side switch');
      setSide('bogus'); chk(F('suggestSide')()==='any'&&F('suggestCandidates')().length===any.length,'an unknown side should read as Any');
      d.getElementById('suggOpen').click();
      const sw=[...d.querySelectorAll('#suggView [data-suggest-side]')]; chk(sw.length===3&&sw.filter(b=>b.classList.contains('on')).length===1&&sw.find(b=>b.classList.contains('on')).dataset.suggestSide==='any','the side switch is not in the window with Any on');
      sw.find(b=>b.dataset.suggestSide==='under').click();
      chk(S.ui.suggestSide==='under'&&d.querySelector('#suggView [data-suggest-side="under"]').classList.contains('on')&&/player-under suggestions|player unders only/.test(d.getElementById('suggView').textContent),'clicking a side did not take or did not redraw the window');
      d.querySelector('#suggView [data-suggest-side="any"]').click(); chk(S.ui.suggestSide==='any','Any did not come back');
      d.getElementById('suggClose').click(); }
    console.log(`M. suggested parlays: ${SG.candidates} qualifying lines, tiers""")

# ---- the page's smoke: the Elo picks in the window follow the switch ----
sub1(SM, "    /* the suggestions: with the ratings in, a player leg is a candidate only where market + form beats the book */",
     """    /* the window's side switch reaches the Elo picks too */
    { const S = w.eval('S'); S.ui.suggestSide = 'under'; const r = w.eloPicks();
      chk(!r || r.tiers.every(t => t.legs.every(l => l.side === 'under')), 'the Elo picks ignore the side switch');
      S.ui.suggestSide = 'any'; }
    /* the suggestions: with the ratings in, a player leg is a candidate only where market + form beats the book */""")
print('ok')
