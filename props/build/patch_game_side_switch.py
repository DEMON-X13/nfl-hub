"""The overs / unders switch is on each game page's Suggested parlay too.

The switch (Any / Player overs / Player unders) lived only in the Parlay Builder's Suggested
parlays window, and the owner looked for it on a game page, where the card follows the same
setting but gave no way to change it. The card now carries the same switch under its header,
empty or not; it sets S.ui.suggestSide, so the window, every game card and the Elo picks
move together, and it redraws the game page and the builder. Its buttons use their own
attribute (data-gsugg-side) so the window's wiring, which scans the whole document, never
binds them twice. The empty card says "the side set above" rather than pointing at the
window. The audit clicks it on the game it opens. app v71.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P1 = HERE / 'part1.html'
P2 = HERE / 'part2.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(J, """  const alt=gameAlternate(g), s=shownSuggestion(g);
  if(!s.legs.length) return `<div class="card gsugg"><div class="gsugg-hd"><h2>Suggested parlay</h2></div>
    <p class="muted" style="margin:0">Nothing here clears the bar yet${suggestSide()==='any'?'':' among player '+suggestSide()+'s, the side set in Suggested parlays'}:""",
     """  const alt=gameAlternate(g), s=shownSuggestion(g);
  const side=`<div class="gsugg-side"><span class="sugg-side" role="group" aria-label="Which legs to build from">${SUGGEST_SIDES.map(([k,l])=>`<button type="button" class="${suggestSide()===k?'on':''}" data-gsugg-side="${k}" aria-pressed="${suggestSide()===k}">${l}</button>`).join('')}</span></div>`;
  if(!s.legs.length) return `<div class="card gsugg"><div class="gsugg-hd"><h2>Suggested parlay</h2></div>${side}
    <p class="muted" style="margin:0">Nothing here clears the bar yet${suggestSide()==='any'?'':' among player '+suggestSide()+'s, the side set above'}:""")

sub1(J, """      <span class="gsugg-nums"><b>${(s.corr*100).toFixed(0)}%</b> to land <span class="muted">\\u00b7</span> <b>${fmtML(ml)}</b>${stake?` <span class="muted">pays $${(stake*s.dec).toFixed(2)}</span>`:''}</span>
    </div>""",
     """      <span class="gsugg-nums"><b>${(s.corr*100).toFixed(0)}%</b> to land <span class="muted">\\u00b7</span> <b>${fmtML(ml)}</b>${stake?` <span class="muted">pays $${(stake*s.dec).toFixed(2)}</span>`:''}</span>
    </div>${side}""")

sub1(J, """  /* a different parlay of the same confidence, kept in memory only */
  $('gameView').querySelector('[data-suggest-shuffle]')""",
     """  /* the same side switch as the Suggested parlays window, one setting for both */
  $('gameView').querySelectorAll('[data-gsugg-side]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.suggestSide=b.dataset.gsuggSide; save(); renderGame(); renderParlay(); if(suggestOpen()) fillSuggest(); }));
  /* a different parlay of the same confidence, kept in memory only */
  $('gameView').querySelector('[data-suggest-shuffle]')""")

sub1(P1, ".gsugg .gsugg-hd h2{margin:0}",
     ".gsugg .gsugg-hd h2{margin:0}\n.gsugg .gsugg-side{margin:0 0 12px}")

sub1(P2, "const APP_BUILD='app v70 \\u00b7 2026-09-28';", "const APP_BUILD='app v71 \\u00b7 2026-09-28';")

sub1(A, """  /* ---- O. one suggested parlay on the game page ---- */
  { const g=openUpcoming(); const card=d.querySelector('.gsugg');
    chk(!!card,'the game page has no suggested parlay section');""",
     """  /* ---- O. one suggested parlay on the game page ---- */
  { const g=openUpcoming(); let card=d.querySelector('.gsugg');
    chk(!!card,'the game page has no suggested parlay section');
    { const sw=[...card.querySelectorAll('[data-gsugg-side]')];
      chk(sw.length===3&&sw.filter(b=>b.classList.contains('on')).length===1,'the game card has no side switch, or not one side on');
      const was=S.ui.suggestSide;
      sw.find(b=>b.dataset.gsuggSide==='over').click();
      chk(S.ui.suggestSide==='over'&&d.querySelector('.gsugg [data-gsugg-side="over"]')?.classList.contains('on'),'the game card switch did not take or did not redraw');
      chk(F('gameSuggestion')(g).legs.every(l=>l.grp!=='TEAM'&&l.side==='over'),'with overs on, the game card still has a leg that is not a player over');
      d.querySelector('.gsugg [data-gsugg-side="any"]').click();
      chk(S.ui.suggestSide==='any','Any did not come back on the game card');
      S.ui.suggestSide=was; }
    card=d.querySelector('.gsugg');""")
