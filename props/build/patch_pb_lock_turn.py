"""app v95: lock a leg you like on a suggested parlay, and ask for new legs around it.

The owner wants to turn over a suggested parlay's legs and keep the ones he likes. Each level's
card in the Parlay Builder's suggested parlays now has a lock on every leg and a New legs button.
New legs keeps the locked legs and fills the rest of the level with the best the level's own rules
give from the legs that card has not shown since the picks last changed: the same search (the best
return over the floor, else the likeliest of the size; preferred legs, then the fewest thin, the
totals last), the same rules (one leg a player, a game's one side and its total, no line twice), now
started from the locked legs (pbBeam, pbBestReturn, pbLikeliest and pbTierOn take them as `base`;
pbTier filters the pool to what fits them). With nothing locked and nothing turned the levels are
exactly what they were. Once no unshown leg can fill the level, New legs starts over from the whole
list, the locks kept, and the card says so; if the locked legs leave no parlay of the size at all,
the card says to unlock one. Reset puts the level back to the panel's own.

The turn is the visitor's while the page is open: kept outside S in PB_VIEW (never saved), keyed on
getPbTiers' signature, so it is gone when the picks or the data move, and a locked leg whose game
kicks off falls away. Add to builder and Finish take the legs on the card (pbShownTier, which the
parlay card's Finish reads too), and the payouts follow the Bet amount as before. The Elo picks'
cards, drawn by the same pbTierCard, carry no locks.

The audit's M6 locks a leg on a 3-leg-or-larger level on the made-up lines, turns it over until it
starts over, and holds every turn to the level's rules (its size, the fits, the kinds and games
ticked, the prices, the chance and price the builder's own sums), the locked leg on every turn, no
leg shown twice before the start-over, the card drawing what is shown, Add to builder taking it, and
the turn gone when a box changes. Every edit is made in memory and asserted to match exactly once;
nothing is written unless all of them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
FILES = {k: p for k, p in (('p1', HERE / 'part1.html'), ('p2', HERE / 'part2.js'), ('p3', HERE / 'part3.js'),
                           ('audit', HERE / 'audit.js'), ('card', ROOT / 'nflbets' / 'build' / 'card.html'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'function pbShownTier' not in T['p3'], 'patch_pb_lock_turn.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v94 \\u00b7 2026-10-11';", "const APP_BUILD='app v95 \\u00b7 2026-10-11';")

# ---- the search starts from the locked legs ----
sub1('p3', """function pbBeam(pools,floor,by,width,memo){
  let beam=[{legs:[],id:''}];""", """function pbBeam(pools,floor,by,width,memo,base){
  /* base: legs every parlay keeps (the visitor's locked legs), the pools filling the rest */
  let beam=[{legs:base?base.slice():[],id:''}];""")
sub1('p3', """function pbBestReturn([id,label,n,floor],pool,memo,kMax){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  /* kMax, when given, is the most fill legs a parlay may take (the totals' pass, pbTier) */
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    const fin=new Map();
    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',PB_BEAM,memo),...pbBeam(pools,floor,'pr',PB_BEAM,memo)]) fin.set(e.id,e);""",
"""function pbBestReturn([id,label,n,floor],pool,memo,kMax,base){
  /* base: the locked legs, kept in every parlay; the pools fill the m legs left */
  const B=base||[], m=n-B.length, P=pool.pref, U=[...pool.pref,...pool.thin];
  /* kMax, when given, is the most fill legs a parlay may take (the totals' pass, pbTier) */
  for(let k=0;k<=(kMax==null?m:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<m-k||pbMaxLegs(U)<m) continue;
    const pools=Array.from({length:m},(_,s)=>s<m-k?P:U);
    const fin=new Map();
    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo,B)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',PB_BEAM,memo,B),...pbBeam(pools,floor,'pr',PB_BEAM,memo,B)]) fin.set(e.id,e);""")
sub1('p3', """function pbLikeliest(n,pool,memo,kMax){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    let best=null;
    for(const e of pbBeam(pools,0,'pr',PB_WIDE,memo).slice(0,PB_LIKELY)){""",
"""function pbLikeliest(n,pool,memo,kMax,base){
  const B=base||[], m=n-B.length, P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=(kMax==null?m:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<m-k||pbMaxLegs(U)<m) continue;
    const pools=Array.from({length:m},(_,s)=>s<m-k?P:U);
    let best=null;
    for(const e of pbBeam(pools,0,'pr',PB_WIDE,memo,B).slice(0,PB_LIKELY)){""")
sub1('p3', """function pbTierOn(t,pool,memo,kMax){
  const r=pbBestReturn(t,pool,memo,kMax); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo,kMax); return x?{...x,likeliest:true}:null;
}""", """function pbTierOn(t,pool,memo,kMax,base){
  const r=pbBestReturn(t,pool,memo,kMax,base); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo,kMax,base); return x?{...x,likeliest:true}:null;
}""")
sub1('p3', """function pbTier(t,pool,memo){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2],pool));
}""", """function pbTier(t,pool,memo,base){
  /* base: the visitor's locked legs (pbTurn): every list is cut to the legs that fit beside them,
     and the searches fill the rest; with none the levels are exactly the panel's own */
  const B=base||[];
  if(B.length) pool={pref:pool.pref.filter(c=>pbFits(B,c)),thin:pool.thin.filter(c=>pbFits(B,c)),mkt:(pool.mkt||[]).filter(c=>pbFits(B,c))};
  if(B.length>=t[2]) return B.length===t[2]?pbExact(B):null;
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo,undefined,B); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2]-B.length,pool),B);
}""")

# ---- the visitor's turn of a level ----
sub1('p3', """/* the tiers for the picks as they stand, from the cache when nothing they stand on has moved */
function getPbTiers(){""", """/* ---------- a level of the visitor's own: legs locked, the rest turned over ----------
   Each level's card has a lock on every leg and a New legs button. New legs keeps the locked legs
   and fills the rest with the best the level's rules give from the legs that card has not shown
   since the picks last changed (pbTier with the locked legs as its base, the pool less every leg
   the card has shown); once none can, it starts over from the whole list, the locks kept, and the
   card says so (wrapped). The turn is the visitor's while the page is open: PB_VIEW, outside S and
   never saved, keyed on getPbTiers' signature so it is gone when the picks or the data move */
let PB_VIEW={sig:null,t:{}};
function pbViewOf(id){
  const r=getPbTiers(); if(PB_VIEW.sig!==r.sig) PB_VIEW={sig:r.sig,t:{}};
  return PB_VIEW.t[id]||(PB_VIEW.t[id]={lock:[],seen:[],tier:null,wrapped:false});
}
/* a level as its card shows it: the visitor's turn of it, else the panel's own */
function pbShownTier(id){
  const t=getPbTiers().tiers.find(x=>x.id===id); if(!t) return null;
  const v=pbViewOf(id); return v.tier||t;
}
window.pbShownTier=pbShownTier;
const pbLocked=(id,l)=>{ const v=PB_VIEW.t[id]; return !!v&&v.lock.some(x=>pbId(x)===pbId(l)); };
function pbLockToggle(id,lid){
  const t=pbShownTier(id); if(!t||!t.legs) return;
  const v=pbViewOf(id), l=t.legs.find(x=>pbId(x)===lid); if(!l) return;
  v.lock=v.lock.some(x=>pbId(x)===lid)?v.lock.filter(x=>pbId(x)!==lid):[...v.lock,l];
}
function pbTurn(id){
  const r=getPbTiers(), base=r.tiers.find(x=>x.id===id), spec=PB_TIERS.find(s=>s[0]===id);
  if(!base||!spec) return;
  const v=pbViewOf(id), shown=v.tier||base; if(!shown.legs&&!v.lock.length) return;
  const u=pbUi(), games=pbGames().filter(g=>!u.off.includes(g.id)), pool=pbPool(games);
  /* a locked leg whose game has kicked off falls away */
  v.lock=v.lock.filter(l=>games.some(g=>g.id===l.gid));
  const locked=new Set(v.lock.map(pbId));
  for(const l of (shown.legs||[])) if(!locked.has(pbId(l))&&!v.seen.includes(pbId(l))) v.seen.push(pbId(l));
  const less=ex=>({pref:pool.pref.filter(c=>!ex.has(pbId(c))),thin:pool.thin.filter(c=>!ex.has(pbId(c))),mkt:(pool.mkt||[]).filter(c=>!ex.has(pbId(c)))});
  let x=pbTier(spec,less(new Set([...v.seen,...locked])),new Map(),v.lock);
  v.wrapped=false;
  /* nothing unshown is left: start over from the whole list, the locks kept */
  if(!x){ v.seen=[]; v.wrapped=true; x=pbTier(spec,less(locked),new Map(),v.lock); }
  const head={id:base.id,label:base.label,n:base.n,floor:base.floor,turned:true};
  v.tier=x?{...head,...x}:{...head,why:'No parlay of this size fits beside the legs you locked: unlock one.'};
}
/* the tiers for the picks as they stand, from the cache when nothing they stand on has moved */
function getPbTiers(){""")

# ---- the card: a lock on each leg, New legs and Reset ----
sub1('p3', """  o=o||{}; const card=!!window.PARLAY_CARD, chance=o.chance!=null?o.chance:t.corr;
  if(t.why) return `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.n} legs</span></div><p class="pb-why">${esc(t.why)}</p></div>`;
  const form=formSig()!=='';
  return `<div class="pb-tier ${t.id}" data-pb-tier="${t.id}">
    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.rule||""",
"""  o=o||{}; const card=!!window.PARLAY_CARD, chance=o.chance!=null?o.chance:t.corr;
  /* the panel's own levels (o.ctl) carry New legs, and Reset once turned; the Elo picks do not */
  const turn=o.ctl?`<span class="pb-turnbar"><button type="button" class="btn quiet small pb-turn" data-pb-turn="${t.id}" title="New legs for this level, keeping the ones you locked">\\u21bb New legs</button>${t.turned?`<button type="button" class="btn quiet small" data-pb-reset="${t.id}" title="Back to the panel's own ${esc(t.label)} parlay">Reset</button>`:''}</span>`:'';
  if(t.why) return `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.n} legs</span>${t.turned?turn:''}</div><p class="pb-why">${esc(t.why)}</p></div>`;
  const form=formSig()!=='', wrapped=o.ctl&&t.turned&&PB_VIEW.t[t.id]&&PB_VIEW.t[t.id].wrapped;
  const lock=l=>{ if(!o.ctl) return ''; const on=pbLocked(t.id,l);
    return `<button type="button" class="pb-lock${on?' on':''}" data-pb-lock="${t.id}|${esc(pbId(l))}" aria-pressed="${on}" aria-label="${on?'Unlock':'Lock'} ${esc(l.name)}, ${esc(l.label)}" title="${on?'Locked: kept when you ask for new legs':'Lock to keep this leg when you ask for new legs'}">${on?'\\ud83d\\udd12':'\\ud83d\\udd13'}</button>`; };
  return `<div class="pb-tier ${t.id}" data-pb-tier="${t.id}">
    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${turn}${o.rule||""")
sub1('p3', """    <ul class="pb-legs">${t.legs.map(l=>`<li><span class="nm">${o.badge?o.badge(l):''}""",
     """    <ul class="pb-legs">${t.legs.map(l=>`<li>${lock(l)}<span class="nm">${o.badge?o.badge(l):''}""")
sub1('p3', """    ${t.thin?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt?`<p class="pb-thin">${pbMktLine(t.legs)}</p>`:''}
    <div class="pb-acts">""", """    ${t.thin?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt?`<p class="pb-thin">${pbMktLine(t.legs)}</p>`:''}${wrapped?`<p class="pb-thin pb-wrap">Every other leg on your picks has had its turn here: back to the first.</p>`:''}
    <div class="pb-acts">""")
sub1('p3', """    <div class="pb-tiers">${r.tiers.map(t=>pbTierCard(t)).join('')}</div>""",
     """    <div class="pb-tiers">${r.tiers.map(t=>pbTierCard(t.why?t:pbShownTier(t.id),{ctl:!t.why})).join('')}</div>""")
sub1('p3', """  el.querySelectorAll('[data-pb-add]').forEach(b=>b.addEventListener('click',()=>{
    const t=getPbTiers().tiers.find(x=>x.id===b.dataset.pbAdd&&x.legs); if(t) pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay`); }));""",
"""  el.querySelectorAll('[data-pb-add]').forEach(b=>b.addEventListener('click',()=>{
    const t=pbShownTier(b.dataset.pbAdd); if(t&&t.legs) pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay`); }));
  /* a lock, New legs and Reset redraw the panel and keep the focus where it was */
  el.querySelectorAll('[data-pb-lock]').forEach(b=>b.addEventListener('click',()=>{
    const s=b.dataset.pbLock, i=s.indexOf('|'); pbLockToggle(s.slice(0,i),s.slice(i+1)); redraw(`[data-pb-lock="${s}"]`); }));
  el.querySelectorAll('[data-pb-turn]').forEach(b=>b.addEventListener('click',()=>{
    pbTurn(b.dataset.pbTurn); redraw(`[data-pb-turn="${b.dataset.pbTurn}"]`); }));
  el.querySelectorAll('[data-pb-reset]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.pbReset; pbViewOf(id); delete PB_VIEW.t[id]; redraw(`[data-pb-turn="${id}"]`); }));""")

# ---- the look ----
sub1('p1', ".pb-legs .nm{font-weight:600;min-width:0;overflow-wrap:anywhere}",
     """.pb-legs .nm{font-weight:600;min-width:0;overflow-wrap:anywhere}
.pb-legs .pb-lock+.nm{flex:1}
.pb-lock{flex:none;align-self:center;width:34px;height:34px;margin:-4px 2px -4px -2px;padding:0;border:1px solid var(--line-2);border-radius:999px;background:var(--panel);font-size:14px;line-height:1;cursor:pointer;opacity:.75}
.pb-lock.on{opacity:1;border-color:var(--gold);background:var(--gold-soft,#FCF1D6)}
.pb-lock:focus-visible{outline:2px solid var(--ink-2);outline-offset:1px}
.pb-turnbar{display:inline-flex;gap:6px;margin-left:auto}""")

# ---- Finish takes the legs on the card ----
sub1('card', """      :kind==='pb'&&typeof getPbTiers==='function'?getPbTiers().tiers.find(x=>x.id===id&&Array.isArray(x.legs)):null; }catch(e){ t=null; }""",
"""      :kind==='pb'?(typeof window.pbShownTier==='function'?window.pbShownTier(id)
        :(typeof getPbTiers==='function'?getPbTiers().tiers.find(x=>x.id===id):null)):null;
      if(t&&!Array.isArray(t.legs)) t=null; }catch(e){ t=null; }""")

# ---- the audit: M6 ----
sub1('audit', """      chk(!games.length||rA.tiers.some(t=>t.legs&&t.legs.some(l=>!isG(l))),'with made-up lines on every starter no tier has a player leg');""",
"""      chk(!games.length||rA.tiers.some(t=>t.legs&&t.legs.some(l=>!isG(l))),'with made-up lines on every starter no tier has a player leg');
      /* M6. lock a leg and ask for new legs, on the made-up lines: the locked leg stays on every
         turn, the rest are legs the card has not shown until it starts over, every turn keeps the
         level's rules, the card draws it and Add to builder takes it; Reset and a changed box put
         the level back */
      { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();
        const T=rA.tiers.find(t=>t.legs&&t.n>=3), idOf=F('pbId'), mlPx=F('mlProb');
        const okTier=(x,lab)=>{ const gl=x.legs.filter(isG), sd=gl.filter(l=>l.stat!=='total'), tt=gl.filter(l=>l.stat==='total'), pl=x.legs.filter(l=>!isG(l)), u=U();
          const ord=[...x.legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name))).map(l=>l.key).join();
          chk(x.legs.length===x.n&&new Set(x.legs.map(l=>l.key)).size===x.n&&new Set(sd.map(l=>l.gid)).size===sd.length&&new Set(tt.map(l=>l.gid)).size===tt.length&&new Set(pl.map(l=>l.pid)).size===pl.length,`${lab}: not ${x.n} different lines, one side and one total a game and one leg a player`);
          chk(x.legs.every(l=>!!u.k[kindOf(l)]&&!u.off.includes(l.gid)&&games.some(g=>g.id===l.gid)&&l.src==='real'&&l.p>=0.45&&l.p<0.97&&(l.market?l.stat==='total':l.p>=mlPx(l.price))),`${lab}: a leg of a kind or game not ticked, on no real price, out of 45-97%, or under the book`);
          chk(x.legs.map(l=>l.key).join()===ord&&pp(x.legs).corr===x.corr&&pd(x.legs.map(l=>({leg:l,ml:l.price})))===x.dec&&x.thin===x.legs.filter(l=>l.thin).length&&(x.mkt||0)===x.legs.filter(l=>l.market).length,`${lab}: its chance, price or counts are not the builder's own sums on its legs`); };
        chk(!!T,'with made-up lines on every starter no level of three legs or more was built');
        if(T){ const cardOf=()=>d.querySelector(`#pbPanel .pb-tier.${T.id}`), lid=idOf(T.legs[0]);
          chk(cardOf().querySelectorAll('[data-pb-lock]').length===T.legs.length&&!!cardOf().querySelector(`[data-pb-turn="${T.id}"]`)&&!cardOf().querySelector('[data-pb-reset]'),`the ${T.id} card has no lock on each leg or no New legs, or offers Reset before a turn`);
          chk(!d.querySelector('#pbElo [data-pb-lock], #pbElo [data-pb-turn]'),'the Elo picks carry locks or New legs');
          cardOf().querySelector(`[data-pb-lock="${T.id}|${lid}"]`).click();
          chk(cardOf().querySelector(`[data-pb-lock="${T.id}|${lid}"]`).getAttribute('aria-pressed')==='true'&&cardOf().querySelectorAll('[data-pb-lock][aria-pressed="true"]').length===1,'the lock did not take, or took more than the one leg');
          chk(JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(T.legs.map(idOf)),'a lock alone changed the legs');
          const seen=new Set(T.legs.filter(l=>idOf(l)!==lid).map(idOf)); let turns=0, wrapped=false;
          while(turns<8&&!wrapped){ cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click(); turns++;
            const x=F('pbShownTier')(T.id); wrapped=!!w.eval(`PB_VIEW.t['${T.id}'].wrapped`);
            if(!x.legs){ chk(/unlock one/.test(x.why)&&/unlock one/.test(cardOf().textContent),`turn ${turns}: an empty turn does not say to unlock a leg`); break; }
            okTier(x,`new legs, turn ${turns}`);
            chk(x.legs.some(l=>idOf(l)===lid)&&x.turned===true,`turn ${turns}: the locked leg is not on it`);
            const fresh=x.legs.filter(l=>idOf(l)!==lid);
            if(!wrapped) chk(fresh.every(l=>!seen.has(idOf(l))),`turn ${turns}: a leg the card had shown came back before the start-over: ${fresh.filter(l=>seen.has(idOf(l))).map(l=>l.name+' '+l.label).join(', ')}`);
            else chk(/back to the first/.test(cardOf().textContent),`turn ${turns}: the start-over is not said on the card`);
            fresh.forEach(l=>seen.add(idOf(l)));
            const li=[...cardOf().querySelectorAll('.pb-legs li')];
            chk(li.length===x.n&&x.legs.every((l,i)=>li[i].textContent.includes(l.name)&&li[i].textContent.includes(l.label))&&cardOf().querySelector('[data-pb-pay]').dataset.pbPay===String(x.dec)
              &&!!cardOf().querySelector(`[data-pb-reset="${T.id}"]`),`turn ${turns}: the card does not draw the turned legs and their price, or has no Reset`); }
          chk(turns>=1,'New legs did nothing');
          /* Add to builder takes the legs on the card */
          const x=F('pbShownTier')(T.id), keepP=JSON.stringify(S.parlay||{}), keepB=S.bookPrice;
          if(x&&x.legs){ cardOf().querySelector(`[data-pb-add="${T.id}"]`).click();
            chk(Object.keys(S.parlay).length===x.n&&x.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side),'Add to builder after New legs did not take the legs on the card'); }
          S.parlay=JSON.parse(keepP); S.bookPrice=keepB; F('save')(); F('renderParlay')();
          /* Reset, then a changed box: the level is the panel's own again */
          if(cardOf().querySelector(`[data-pb-reset="${T.id}"]`)) cardOf().querySelector(`[data-pb-reset="${T.id}"]`).click();
          chk(JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(F('getPbTiers')().tiers.find(t=>t.id===T.id).legs.map(idOf))&&!cardOf().querySelector('[data-pb-lock][aria-pressed="true"]'),'Reset did not put the level back to the panel\\'s own, or kept a lock');
          cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(F('pbShownTier')(T.id).legs[0])}"]`).click(); cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
          setKinds(KINDS.filter(k=>k!=='under')); F('renderPb')(); setKinds(KINDS); F('renderPb')();
          chk(!w.eval(`PB_VIEW.t['${T.id}']`)||(!w.eval(`PB_VIEW.t['${T.id}'].tier`)&&!w.eval(`PB_VIEW.t['${T.id}'].lock.length`)),'a changed box left a turned level or a lock behind');
          /* a small pick runs out and starts over: Teams only on three games, Safe turned until no
             unshown leg is left, every turn a valid pair */
          let nW=0, wr=false;
          { const g3=F('pbGames')(); setKinds(['ml','ats','total']); U().off=g3.slice(3).map(g=>g.id); w.eval('PB_CACHE=new Map(); PB_VIEW={sig:null,t:{}}'); F('renderPb')();
            if(F('getPbTiers')().tiers.find(t=>t.id==='safe'&&t.legs)){
              while(nW<40&&!wr){ d.querySelector('#pbPanel [data-pb-turn="safe"]').click(); nW++; wr=!!w.eval("PB_VIEW.t['safe']&&PB_VIEW.t['safe'].wrapped");
                const x=F('pbShownTier')('safe'); if(x&&x.legs) okTier(x,`Safe on three games, turn ${nW}`); }
              chk(wr&&/back to the first/.test(d.querySelector('#pbPanel .pb-tier.safe').textContent),`Safe on three games never started over in ${nW} turns, or did not say so`); }
            U().off=[]; setKinds(KINDS); w.eval('PB_CACHE=new Map(); PB_VIEW={sig:null,t:{}}'); F('renderPb')(); }
          console.log(`M6. lock and new legs: ${turns} turns of the ${T.label} level, the locked leg on each, ${seen.size} legs seen${wrapped?', then back to the first':''}; Safe on three games started over after ${nW} turns`); }
        w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')(); }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v95, lock a leg and New legs on the suggested parlays; audit M6')
