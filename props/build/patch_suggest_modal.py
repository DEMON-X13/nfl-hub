# -*- coding: utf-8 -*-
"""Suggested parlays move into a window, and the builder card says what it is.

The suggestions card sat above the builder and was the first thing on the tab whether or
not anyone wanted it: three tiers, their legs and their payouts, before the parlay you
came to build. It is the same card, opened from a button on the builder now, so the tab
starts with the thing the tab is for.

The empty builder was headed "Nothing picked yet", which named the state rather than the
section. It is Parlay Builder, and the count of legs still replaces it once there are
any.

The send button matches the red one beside it rather than sitting a size below it, and it
is purple: green read as a second Save, and this one sends somewhere rather than saving
anything.
"""
import io

p1='part1.html'
s=io.open(p1,encoding='utf-8').read()
old="""<section id="tab-parlay" hidden>
  <div id="parlayBody"></div>
</section>"""
new="""<section id="tab-parlay" hidden>
  <div id="parlayBody"></div>
  <div id="suggModal" class="modal" hidden>
    <div class="modal-panel" role="dialog" aria-modal="true" aria-label="Suggested parlays">
      <div id="suggView"></div>
    </div>
  </div>
</section>"""
assert s.count(old)==1
io.open(p1,'w',encoding='utf-8').write(s.replace(old,new))

p3='part3.js'
s=io.open(p3,encoding='utf-8').read()
def sub1(old,new,what):
    global s
    assert s.count(old)==1, what+': found '+str(s.count(old))
    s=s.replace(old,new)

# the card is always open in the window, and closes rather than minimises
sub1("""function suggestCard(){
  const open=!(S.ui&&S.ui.suggestMin);""",
"""function suggestCard(inModal){
  /* in the window it is always open: the window is the reveal, so minimising inside it
     would leave a box with a button in it and nothing else */
  const open=inModal?true:!(S.ui&&S.ui.suggestMin);""",'suggestCard signature')

sub1("""      <button class="btn quiet" id="suggToggle" aria-expanded="${open}">${open?'Minimize':'Show'}</button></div>""",
"""      ${inModal?`<button class="btn quiet" id="suggClose">Close</button>`
        :`<button class="btn quiet" id="suggToggle" aria-expanded="${open}">${open?'Minimize':'Show'}</button>`}</div>""",'suggest header button')

# the window itself
sub1("""function wireSuggest(){""",
"""/* the suggestions, in a window opened from the builder. Filling and wiring are separate
   from opening, so saving a tier can redraw what is on screen without scrolling it away. */
function fillSuggest(){ const v=$('suggView'); if(!v) return; v.innerHTML=suggestCard(true); wireSuggest(); }
function openSuggest(){ const m=$('suggModal'); if(!m) return; fillSuggest();
  m.hidden=false; document.body.classList.add('modal-open'); m.scrollTop=0; }
function closeSuggest(){ const m=$('suggModal'); if(!m) return;
  m.hidden=true; document.body.classList.remove('modal-open'); }
const suggestOpen=()=>{ const m=$('suggModal'); return !!m&&!m.hidden; };
function wireSuggest(){
  $('suggClose')?.addEventListener('click',closeSuggest);""",'wireSuggest head')

# a redraw from inside the window keeps the window on screen and current
sub1("""  $('suggToggle')?.addEventListener('click',()=>{ S.ui.suggestMin=!S.ui.suggestMin; save(); renderParlay(); });""",
"""  $('suggToggle')?.addEventListener('click',()=>{ S.ui.suggestMin=!S.ui.suggestMin; save(); renderParlay(); });
  $('suggOpen')?.addEventListener('click',openSuggest);""",'suggOpen wiring')
sub1("""  $('suggStake')?.addEventListener('change',e=>{ S.stake=Math.max(0,+e.target.value||0); save(); renderParlay(); });""",
"""  $('suggStake')?.addEventListener('change',e=>{ S.stake=Math.max(0,+e.target.value||0); save(); renderParlay(); if(suggestOpen()) fillSuggest(); });""",'suggStake wiring')
sub1("""    save(); renderParlay(); }));
}""","""    save(); renderParlay(); if(suggestOpen()) fillSuggest(); }));
}""",'suggest save wiring')

# the builder heads the tab now, with the button that opens the window
BTN = """<button class="btn quiet" id="suggOpen" title="The model's own parlays for this week, in a window">Suggested parlays</button>"""
sub1("""    el.innerHTML=suggestCard()+droppedNote+`<div class="card"><h2>Nothing picked yet</h2>""",
"""    el.innerHTML=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">Parlay Builder<span class="grow" style="flex:1"></span>"""+BTN+"""</h2>""",'empty builder heading')
sub1("""  let html=suggestCard()+droppedNote+`<div class="card"><h2>${legs.length}-leg parlay <span class="pill">building</span></h2>""",
"""  let html=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">${legs.length}-leg parlay <span class="pill">building</span><span class="grow" style="flex:1"></span>"""+BTN+"""</h2>""",'builder heading')

# closes the way the game window closes: Escape, or a click on the dimmed background
sub1("""document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('gameModal').hidden) closeGame(); });""",
"""document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('gameModal').hidden) closeGame();
  else if(e.key==='Escape'&&suggestOpen()) closeSuggest(); });""",'escape closes the window')
sub1("""$('gameModal').addEventListener('click',e=>{ if(e.target===$('gameModal')) closeGame(); });""",
"""$('gameModal').addEventListener('click',e=>{ if(e.target===$('gameModal')) closeGame(); });
$('suggModal').addEventListener('click',e=>{ if(e.target===$('suggModal')) closeSuggest(); });""",'background closes the window')

# the send button: the size of the red one beside it, and purple rather than green
sub1("""    <button class="btn go" id="sendLive" style="padding:6px 12px;font-size:13px" title=\"""",
"""    <button class="btn" id="sendLive" style="background:linear-gradient(180deg,#8B5CF6,#6D28D9)" title=\"""",'send button')
io.open(p3,'w',encoding='utf-8').write(s)

p2='part2.js'
s=io.open(p2,encoding='utf-8').read()
old="const APP_BUILD='app v62 \\u00b7 2026-09-21';"
new="const APP_BUILD='app v63 \\u00b7 2026-09-21';"
assert s.count(old)==1
io.open(p2,'w',encoding='utf-8').write(s.replace(old,new))
print('suggestions in a window, Parlay Builder heading, purple send; app v63')
