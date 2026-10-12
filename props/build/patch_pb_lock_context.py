"""app v97: a turned card says how it was chosen, and a click in the half minute after a kickoff
redraws first.

The review of v96 found two faults, both low and both reproduced.

A turned card's rule and totals line were worked out from the locks as they stood when the card was
drawn, not from the ones the parlay was chosen beside. Lock every leg and the level was ruled "your 3
locked legs"; unlock one and it still said so with two locks pressed. Turn with a lock and then
unlock it, and the rule dropped "beside your lock" though the parlay was chosen to include that leg;
a locked total's line went from "you locked it" to "the legs with an edge ... do not make a parlay".
pbFill now records, on the level it fills, what it was chosen from (ctx: how many locks, whether from
the legs left, which legs were locked), and pbRuleOf and pbMktWhy read that, so a card says how its
parlay was chosen whatever is locked since. A level of locked legs alone reads "the 3 legs you locked"
("the pair you locked"), true after an unlock too. New legs is still off only while every leg shown is
locked now.

A game that kicks off while the page is open leaves the panel when pbWatch next looks, up to half a
minute later. A click in that window acted on a level the page had not drawn: New legs counted the
legs of a refilled parlay nobody saw as shown, a lock on a leg the refill dropped did nothing, and Add
to builder and Finish took the refilled parlay, not the one on the screen. A lock, New legs, Reset and
Add to builder now redraw the builder and the panel and do nothing else when a game has kicked off
since the panel was drawn (pbStale), and the parlay card's Finish (nflbets/build/card.html) does the
same for the suggested tiers and the Elo picks.

The audit's M6 now unlocks after a turn and after a level of locked legs alone and holds the rule to
what it was, and clicks New legs after a kickoff the page has not drawn and holds the panel to a
redraw with no turn. Every edit is made in memory and asserted to match exactly once; nothing is
written unless all of them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: p for k, p in (('p2', HERE / 'part2.js'), ('p3', HERE / 'part3.js'), ('audit', HERE / 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'pbStale' not in T['p3'], 'patch_pb_lock_context.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v96 \u00b7 2026-10-11';", r"const APP_BUILD='app v97 \u00b7 2026-10-12';")

# ---- what a filled level was chosen from, kept on it ----
sub1('p3', r"""  if(v.lock.length>=spec[2]){ v.tier={...head,...pbExact(v.lock.slice(0,spec[2])),allLocked:true}; return; }""",
     r"""  /* what the level is chosen from, kept on it (ctx) so its card says so whatever is locked later */
  const ctx=()=>({nL:v.lock.length,left:pbLeft(v),locked:v.lock.map(pbId)});
  if(v.lock.length>=spec[2]){ v.tier={...head,...pbExact(v.lock.slice(0,spec[2])),allLocked:true,ctx:ctx()}; return; }""")
sub1('p3', r"""  v.tier=x?{...head,...x}:{...head,why:base.why||(v.lock.length?'No parlay of this size fits beside the legs you locked: unlock one.':'No parlay of this size on your picks.')};""",
     r"""  v.tier=x?{...head,...x,ctx:ctx()}:{...head,why:base.why||(v.lock.length?'No parlay of this size fits beside the legs you locked: unlock one.':'No parlay of this size on your picks.')};""")
sub1('p3', r"""const pbBeside=v=>{ const nL=v.lock.length; return nL?` beside your lock${nL>1?'s':''}`:''; };
const pbLeft=v=>!v.wrapped&&v.seen.length>0;
function pbRuleOf(t,v){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  if(!t.turned||!v) return t.likeliest?`the likeliest ${n} legs`:t.floor?`best return that lands ${pct}%+`:'the likeliest pair';
  if(t.allLocked) return n===2?'your locked pair':`your ${n} locked legs`;
  const mod=(pbLeft(v)?' left':'')+pbBeside(v);
  return t.likeliest||!t.floor?`the likeliest ${n===2?'pair':n+' legs'}${mod}`:`best return${mod} that lands ${pct}%+`;
}
function pbMktWhy(t,v){
  if(!t.turned||!v) return '';
  if(!t.legs.some(l=>l.market&&!v.lock.some(x=>pbId(x)===pbId(l)))) return t.mkt===1?'you locked it':'you locked them';
  return `the legs with an edge ${pbLeft(v)?'your picks have left for this card':'on your picks'} do not make a parlay of this size${pbBeside(v)}`;
}""", r"""const pbBeside=nL=>nL?` beside your lock${nL>1?'s':''}`:'';
const pbLeft=v=>!v.wrapped&&v.seen.length>0;
/* what a turned level was chosen from: the ctx pbFill kept on it, else the view as it stands */
const pbCtx=(t,v)=>t.ctx||{nL:v.lock.length,left:pbLeft(v),locked:v.lock.map(pbId)};
function pbRuleOf(t,v){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  if(!t.turned||!v) return t.likeliest?`the likeliest ${n} legs`:t.floor?`best return that lands ${pct}%+`:'the likeliest pair';
  if(t.allLocked) return n===2?'the pair you locked':`the ${n} legs you locked`;
  const c=pbCtx(t,v), mod=(c.left?' left':'')+pbBeside(c.nL);
  return t.likeliest||!t.floor?`the likeliest ${n===2?'pair':n+' legs'}${mod}`:`best return${mod} that lands ${pct}%+`;
}
function pbMktWhy(t,v){
  if(!t.turned||!v) return '';
  const c=pbCtx(t,v);
  if(!t.legs.some(l=>l.market&&!c.locked.includes(pbId(l)))) return t.mkt===1?'you locked it':'you locked them';
  return `the legs with an edge ${c.left?'your picks have left for this card':'on your picks'} do not make a parlay of this size${pbBeside(c.nL)}`;
}""")

# ---- a click on a panel drawn before a kickoff redraws first ----
sub1('p3', r"""  el.querySelectorAll('[data-pb-add]').forEach(b=>b.addEventListener('click',()=>{
    const t=pbShownTier(b.dataset.pbAdd); if(t&&t.legs) pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay`); }));
  /* a lock, New legs and Reset redraw the panel and keep the focus where it was */
  el.querySelectorAll('[data-pb-lock]').forEach(b=>b.addEventListener('click',()=>{
    const s=b.dataset.pbLock, i=s.indexOf('|'); pbLockToggle(s.slice(0,i),s.slice(i+1)); redraw(`[data-pb-lock="${s}"]`); }));
  el.querySelectorAll('[data-pb-turn]').forEach(b=>b.addEventListener('click',()=>{
    pbTurn(b.dataset.pbTurn); redraw(`[data-pb-turn="${b.dataset.pbTurn}"]`); }));
  el.querySelectorAll('[data-pb-reset]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.pbReset; pbViewOf(id); delete PB_VIEW.t[id]; redraw(`[data-pb-turn="${id}"]`); }));""",
     r"""  /* a game kicked off since the panel was drawn (pbWatch looks every half minute): the click redraws
     the builder and the panel and does nothing else, so it never acts on a level nobody has seen */
  const drawn=fn=>e=>{ if(pbStale()){ renderParlay(); return; } fn(e); };
  el.querySelectorAll('[data-pb-add]').forEach(b=>b.addEventListener('click',drawn(()=>{
    const t=pbShownTier(b.dataset.pbAdd); if(t&&t.legs) pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay`); })));
  /* a lock, New legs and Reset redraw the panel and keep the focus where it was */
  el.querySelectorAll('[data-pb-lock]').forEach(b=>b.addEventListener('click',drawn(()=>{
    const s=b.dataset.pbLock, i=s.indexOf('|'); pbLockToggle(s.slice(0,i),s.slice(i+1)); redraw(`[data-pb-lock="${s}"]`); })));
  el.querySelectorAll('[data-pb-turn]').forEach(b=>b.addEventListener('click',drawn(()=>{
    pbTurn(b.dataset.pbTurn); redraw(`[data-pb-turn="${b.dataset.pbTurn}"]`); })));
  el.querySelectorAll('[data-pb-reset]').forEach(b=>b.addEventListener('click',drawn(()=>{
    const id=b.dataset.pbReset; pbViewOf(id); delete PB_VIEW.t[id]; redraw(`[data-pb-turn="${id}"]`); })));""")
sub1('p3', r"""/* a game that kicks off while the page is open leaves the list and every tier: the page looks
   every half minute, and redraws the builder (which drops a started leg) and the panel */""",
     r"""/* the panel on the screen was drawn before a game kicked off: what it shows is not what the tiers
   are now (the card's Finish asks it too) */
function pbStale(){ try{ return PB_SHOWN!=null&&pbGames().map(g=>g.id).join()!==PB_SHOWN; }catch(e){ return false; } }
window.pbStale=pbStale;
/* a game that kicks off while the page is open leaves the list and every tier: the page looks
   every half minute, and redraws the builder (which drops a started leg) and the panel */""")

# ---- the audit's M6 ----
sub1('audit', r"""&&/^your (locked pair|\d+ locked legs)$/.test(rule)&&cardOf().querySelector(`[data-pb-turn="${T.id}"]`).disabled,`a level of locked legs alone is ruled "${rule}", or is not the locked legs, or offers New legs`); }""",
     r"""&&/^the (pair|\d+ legs) you locked$/.test(rule)&&cardOf().querySelector(`[data-pb-turn="${T.id}"]`).disabled,`a level of locked legs alone is ruled "${rule}", or is not the locked legs, or offers New legs`);
            /* unlock one: the card still says how the parlay was chosen, and New legs is back */
            cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(x.legs[0])}"]`).click();
            chk(cardOf().querySelector('.pb-rule').textContent===rule&&!cardOf().querySelector(`[data-pb-turn="${T.id}"]`).disabled,`after an unlock the level of locked legs is ruled "${cardOf().querySelector('.pb-rule').textContent}", or New legs is still off`); }
          /* a turn beside a lock, then the lock undone: the rule is still the one the parlay was chosen by */
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')(); const L0=F('pbShownTier')(T.id).legs[0];
            cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(L0)}"]`).click(); cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
            const r1=cardOf().querySelector('.pb-rule').textContent;
            if(F('pbShownTier')(T.id).legs){ cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(L0)}"]`).click();
              chk(/ beside your lock/.test(r1)&&cardOf().querySelector('.pb-rule').textContent===r1,`a turn beside a lock is ruled "${r1}", and "${cardOf().querySelector('.pb-rule').textContent}" once the lock is undone`); } }""")
sub1('audit', r"""              w.Date.now=now0; F('renderPb')();
              kicked=`a kickoff kept the lock on ${Ll.name} and dropped the one on ${Le.name}`; } }""",
     r"""              w.Date.now=now0; F('renderPb')();
              /* New legs pressed in the half minute after a kickoff, before the page has redrawn: the
                 panel is redrawn without the game and nothing is turned */
              { const seen0=(w.eval(`PB_VIEW.t['${T.id}']`)||{seen:[]}).seen.length;
                w.Date.now=()=>now0.call(w.Date)+off; chk(!!w.eval('pbStale()'),'the panel drawn before a kickoff is not stale after it');
                cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
                const on1=F('pbGames')().map(g=>g.id), v1=w.eval(`PB_VIEW.t['${T.id}']`)||{seen:[]};
                chk(v1.seen.length===seen0&&w.eval('PB_SHOWN')===on1.join()&&!w.eval('pbStale()')&&F('getPbTiers')().tiers.every(t=>!t.legs||F('pbShownTier')(t.id).legs.every(l=>on1.includes(l.gid))),
                  `New legs pressed on a panel drawn before a kickoff turned the level (${seen0} seen, now ${v1.seen.length}) or did not redraw it without the game`);
                w.Date.now=now0; F('renderPb')(); }
              kicked=`a kickoff kept the lock on ${Ll.name} and dropped the one on ${Le.name}, and a click before the redraw only redrew`; } }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v97, a turned card says how it was chosen; a click after a kickoff redraws first; audit M6')
