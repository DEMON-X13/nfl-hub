"""app v135: the parlay sums several times faster, the same to the bit, and Suggested Parlays opened without a freeze.

The owner, 24 October 2026: "can you do a deep dive check on the performance of the site? I found that after a few changes
it takes a few seconds to load between tabs sometimes." Measured in Chromium on the hub as published that night (a fast
desktop, Saturday evening, the Sunday slot of 11 games up): every tab opened in under 35 ms but Suggested Parlays, whose
first opening held the page for 3.1 seconds inside the click (about 12 on a phone's slower processor), and 150 ms again on
each return. The profile: 2.75 s of it the Sunday slot, which since app v121 builds each of its games' own set (four
levels searched on that game's lines) and their Elo picks, and 2.0 s of the whole inside parlayProb, the builder's
parlay chance, called 1,186 times in that one opening.

1. parlayProb (part2.js) gives the same answer, every bit of it, in an eighth of the time. Every call drew its trials from
   one seeded stream (mulberry(20260908)), two uniforms to two normals (Box-Muller), ceil(n/2) pairs a trial, so trial s
   of an n-leg parlay always uses pairs s*q to s*q+q-1 of the same stream: the pairs are now worked once, kept in a
   Float64Array that grows as a call needs more (up to 1.5 million pairs, 24 MB, past which a call draws as before), and
   each call does only the trials' sums, in the same order, so each z, each hit and the count are the ones it had. And a
   call whose trials have been run already returns their count: the answer is a pure function of the number of trials,
   each leg's chance and side, and the correlations Cholesky reads (the lower triangle of the matrix legRho builds), which
   are the memo's key, so a kept answer can never be another parlay's or a stale one (a check that plants a correlation
   table builds a different matrix, so a different key). The memo holds 50,000 answers and starts again past them. The
   caches hang on the function itself (parlayProb.cache), so a check that compiles parlayProb from the parts' source on
   its own (elo/check_tab.js) carries them with it. Held out against the function as it was, in the page on 1,200 real
   parlays of this week's priced legs, 2 to 9 legs, both trial counts the page uses, 984 with correlated legs: every
   answer equal, 7.4 s down to 0.9 s.

2. The search's ids (part3.js), the same strings found cheaper: a leg's id (pbId, its key, side and line) is kept with the
   leg object (a WeakMap, checked against the three fields, so a leg whose line moved gets its id afresh), so the search's
   pair memo and its parlay ids are looked up on strings already hashed; and the beam (pbBeam) makes each candidate's id by
   putting the new leg's id in its place among the parent's, already sorted, where pbEval sorted them all again, and takes
   a parlay it has scored already from the memo by that id without building its leg list. Every id is the string it was,
   every score the number it was (pbEval still works each new parlay, with the same products in the same order), so the
   beam keeps the same parlays in the same order.

3. Suggested Parlays opened by the reader (a real click or key on its tab: e.isTrusted) is on the screen at once, with
   the record and one line, "Building the sets…", and its sets are built one game at a time, each in a task of its own
   (spOpenSoft): each live night game's set and Elo picks, and each game of a live Sunday slot (its own set and its Elo
   picks, as the slot draws them: spSet on the game, and eloUnit on the game alone, 'in this game', the very calls the
   slot's levels are taken from, so they are its cache), with the page free between them, and then drawn by renderSp from
   those caches, the same HTML the synchronous draw gives. A unit locked or under way builds nothing new (the record's set,
   as before). Leaving the tab stops the building (the rest is built when it opens again); anything else drawing the tab
   meanwhile (renderSp: a Refresh odds press, the half-minute look) draws it whole and ends the run. With nothing left to
   build, or a click no reader made (the checks' .click(), the address moved by routeTabs), the tab is drawn at once as
   before. window.spOpenSoft() runs it for the checks: a promise of true once drawn.

On that night's payload, in Chromium: the first opening went from 3.1 s held to the tab on the screen 61 ms after the
click (0.3 s at a phone's speed, a quarter of the desktop's processor), its sets built in steps of 0.22 s at most; the
synchronous draw a check's click makes, from 3.1 s to about 1.2 s; the HTML drawn the same to the byte either way.
"""
import io
FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'parlayProb.cache' not in T['p2'], 'patch_fast_tabs.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v134 \\u00b7 2026-10-24';", "const APP_BUILD='app v135 \\u00b7 2026-10-25';", 'APP_BUILD')

sub1('p2', """function parlayProb(legs,sims=40000){
  const n=legs.length; if(!n) return {indep:0,corr:0,pairs:[]};
  const indep=legs.reduce((s,l)=>s*l.p,1);
  const R=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:legRho(legs[i],legs[j])));
  const pairs=[];
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) if(Math.abs(R[i][j])>=0.03) pairs.push({i,j,rho:R[i][j]});
  if(!pairs.length) return {indep,corr:indep,pairs};
  let L=null, lam=0;
  while(!L&&lam<1){ const Rs=R.map((row,i)=>row.map((v,j)=>i===j?1:v*(1-lam))); L=cholesky(Rs); if(!L) lam+=0.1; }
  if(!L) return {indep,corr:indep,pairs};
  const dir=legs.map(l=>l.side==='under'?-1:1);
  const thr=legs.map(l=>invNorm(1-l.p));   /* leg hits when dir*z > thr */
  const rnd=mulberry(20260908); let hits=0;
  const g=new Array(n);
  for(let s=0;s<sims;s++){
    for(let i=0;i<n;i+=2){ const u1=rnd()||1e-12,u2=rnd(); const m=Math.sqrt(-2*Math.log(u1));
      g[i]=m*Math.cos(2*Math.PI*u2); if(i+1<n) g[i+1]=m*Math.sin(2*Math.PI*u2); }
    let ok=true;
    for(let i=0;i<n&&ok;i++){ let z=0; for(let k=0;k<=i;k++) z+=L[i][k]*g[k]; if(dir[i]*z<=thr[i]) ok=false; }
    if(ok) hits++;
  }
  return {indep,corr:hits/sims,pairs};
}""", """function parlayProb(legs,sims=40000){
  const n=legs.length; if(!n) return {indep:0,corr:0,pairs:[]};
  const indep=legs.reduce((s,l)=>s*l.p,1);
  const R=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:legRho(legs[i],legs[j])));
  const pairs=[];
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) if(Math.abs(R[i][j])>=0.03) pairs.push({i,j,rho:R[i][j]});
  if(!pairs.length) return {indep,corr:indep,pairs};
  /* (app v135) the trials' normals worked once and kept, and an answer worked once and kept, both on the function itself:
     every call draws from the one seeded stream, ceil(n/2) Box-Muller pairs a trial (trial s of n legs: pairs s*q to
     s*q+q-1), and the count is a pure function of the trials, each leg's chance and side and the correlations Cholesky
     reads, which are the memo's key; the same answer to the bit, in an eighth of the time (patch_fast_tabs.py) */
  const C=parlayProb.cache||(parlayProb.cache={z:null,have:0,rnd:null,memo:new Map()});
  const dir=legs.map(l=>l.side==='under'?-1:1);
  let key=sims+'|';
  for(let i=0;i<n;i++){ key+=legs[i].p+(dir[i]<0?'u':'o'); for(let j=0;j<i;j++) key+=','+R[i][j]; key+=';'; }
  const kept=C.memo.get(key);
  if(kept!==undefined) return {indep,corr:kept,pairs};
  let L=null, lam=0;
  while(!L&&lam<1){ const Rs=R.map((row,i)=>row.map((v,j)=>i===j?1:v*(1-lam))); L=cholesky(Rs); if(!L) lam+=0.1; }
  if(!L) return {indep,corr:indep,pairs};
  const thr=legs.map(l=>invNorm(1-l.p));   /* leg hits when dir*z > thr */
  const q=(n+1)>>1, need=sims*q;
  let hits=0;
  if(need<=1500000){
    if(C.have<need){
      const cap=Math.min(1500000,Math.max(need,2*C.have,3*sims)), z=new Float64Array(2*cap);
      if(C.z) z.set(C.z.subarray(0,2*C.have));
      const rnd=C.rnd||(C.rnd=mulberry(20260908));
      for(let k=C.have;k<cap;k++){ const u1=rnd()||1e-12,u2=rnd(); const m=Math.sqrt(-2*Math.log(u1));
        z[2*k]=m*Math.cos(2*Math.PI*u2); z[2*k+1]=m*Math.sin(2*Math.PI*u2); }
      C.z=z; C.have=cap;
    }
    const Z=C.z, F=new Float64Array(n*n);
    for(let i=0;i<n;i++) for(let k=0;k<=i;k++) F[i*n+k]=L[i][k];
    for(let s=0,b=0;s<sims;s++,b+=2*q){ let ok=true;
      for(let i=0,o=0;i<n&&ok;i++,o+=n){ let z=0; for(let k=0;k<=i;k++) z+=F[o+k]*Z[b+k]; if(dir[i]*z<=thr[i]) ok=false; }
      if(ok) hits++; }
  } else {
    const rnd=mulberry(20260908), g=new Array(n);
    for(let s=0;s<sims;s++){
      for(let i=0;i<n;i+=2){ const u1=rnd()||1e-12,u2=rnd(); const m=Math.sqrt(-2*Math.log(u1));
        g[i]=m*Math.cos(2*Math.PI*u2); if(i+1<n) g[i+1]=m*Math.sin(2*Math.PI*u2); }
      let ok=true;
      for(let i=0;i<n&&ok;i++){ let z=0; for(let k=0;k<=i;k++) z+=L[i][k]*g[k]; if(dir[i]*z<=thr[i]) ok=false; }
      if(ok) hits++;
    }
  }
  const corr=hits/sims;
  if(C.memo.size>=50000) C.memo.clear();
  C.memo.set(key,corr);
  return {indep,corr,pairs};
}""", 'parlayProb')

sub1('p3', "const pbId=l=>l.key+'|'+l.side+'|'+l.k;", """/* (app v135) a leg's id kept with the leg (checked against its key, side and line, so one whose line moved is worked
   afresh): the same string, hashed once for the search's maps */
const PB_IDS=new WeakMap();
const pbId=l=>{ const c=PB_IDS.get(l); if(c&&c[0]===l.key&&c[1]===l.side&&c[2]===l.k) return c[3];
  const s=l.key+'|'+l.side+'|'+l.k; PB_IDS.set(l,[l.key,l.side,l.k,s]); return s; };""", 'pbId kept')
sub1('p3', """function pbBeam(pools,floor,by,width,memo){
  let beam=[{legs:[],id:''}];
  for(let s=0;s<pools.length;s++){
    const next=new Map();
    for(const b of beam) for(const c of pools[s]){ if(!pbFits(b.legs,c)) continue;
      const e=pbEval([...b.legs,c],memo); if(next.has(e.id)||(floor&&e.pr<floor*0.9)) continue; next.set(e.id,e); }""", """function pbBeam(pools,floor,by,width,memo){
  let beam=[{legs:[],id:''}];
  for(let s=0;s<pools.length;s++){
    const next=new Map();
    for(const b of beam){
      /* (app v135) each candidate's id is the parent's ids, already sorted, with the new leg's put in its place (the string
         pbEval would make), and a parlay scored already is taken from the memo by it */
      const bi=b.ids||(b.ids=b.legs.map(pbId).sort());
      for(const c of pools[s]){ if(!pbFits(b.legs,c)) continue;
        const ci=pbId(c); let lo=0, hi=bi.length; while(lo<hi){ const m=(lo+hi)>>1; if(bi[m]<ci) lo=m+1; else hi=m; }
        const ids=bi.slice(0,lo); ids.push(ci); for(let t=lo;t<bi.length;t++) ids.push(bi[t]);
        const id=ids.join(','); if(next.has(id)) continue;
        let e=memo.get(id); if(!e||typeof e!=='object') e=pbEval([...b.legs,c],memo);
        if(next.has(e.id)||(floor&&e.pr<floor*0.9)) continue; if(!e.ids) e.ids=ids; next.set(e.id,e); } }""", 'pbBeam: ids')
sub1('p3', "let SP_CACHE=new Map(), SP_SHOWN=null;", "let SP_CACHE=new Map(), SP_SHOWN=null, SP_SOFT=null;", 'SP_SOFT')

sub1('p3', """function renderSp(){
  const el=$('spPanel'); if(!el||!S||!S.sched) return;""", """function renderSp(){
  const el=$('spPanel'); if(!el||!S||!S.sched) return;
  SP_SOFT=null;   /* (app v135) drawn whole: a run of spOpenSoft still going has nothing left to do */""", 'renderSp: ends a soft run')

sub1('p3', """/* the tab opened: its sets built and drawn (the prop model's tab switch has shown the section by the time
   the click reaches the document) */
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('#tabs button[data-tab="suggest"]'):null;
  if(b&&typeof S==='object'&&S&&S.sched) try{ renderSp(); }catch(err){ console.error(err); } });""",
     """/* (app v135) what opening the tab has still to build, a step a game: each live unit's games (a night game, or each game
   of the Sunday slot), its own set (spSet, the cache the slot's levels are taken from) and its Elo picks on that game
   alone ('in this game', as eloUnit builds them for a night game and the slot builds them a game at a time), each only
   where it is not built yet; a unit locked or under way builds nothing new (the record's set) */
function spWarmSteps(){
  const steps=[], now=Date.now(), units=[...(spDayOff()?[]:[spSlotNext()].filter(u=>u&&u.up)),...spOn()];
  for(const u of units){
    const lock=spLockAt(u); if(lock!=null&&now>=lock) continue;
    for(const x of (u.slot?u.games:[u])){ const g=spUnit(x.id); if(!g) continue;
      if(!SP_CACHE.has(spSig(g))) steps.push(()=>spSet(g.id));
      if(spEloOn()){ let k=null; try{ k=window.eloUnit([g.id],{where:'in this game',kept:true}); }catch(e){ k=null; }
        if(k&&k.wait) steps.push(()=>window.eloUnit([g.id],{where:'in this game'})); } } }
  return steps;
}
/* (app v135) the tab opened without holding the page: drawn at once with the record and a line saying the sets are being
   built, then each step in a task of its own, the page free between them, and drawn whole from those caches (renderSp,
   the same HTML as drawing it at once). Leaving the tab stops it, and any other draw of the tab ends it. null where
   nothing is left to build (then the caller draws the tab at once); else a promise of true once drawn, false if stopped */
function spOpenSoft(){
  if(!$('spPanel')||!S||!S.sched) return null;
  const steps=spWarmSteps(); if(!steps.length) return null;
  if(!$('spSets')) renderSp();
  const run={steps}; SP_SOFT=run;
  $('spHead').innerHTML=spHeadHtml();
  $('spSets').innerHTML=spSecHtml('all','')+'<p class="pb-none sp-building" data-sp-building role="status">Building the sets…</p>';
  return new Promise(done=>{
    const next=()=>{
      if(SP_SOFT!==run){ done(false); return; }
      const tab=$('tab-suggest'); if(tab&&tab.hidden){ SP_SOFT=null; done(false); return; }
      const f=run.steps.shift();
      if(f){ try{ f(); }catch(err){ console.error(err); } setTimeout(next,0); return; }
      SP_SOFT=null; try{ renderSp(); }catch(err){ console.error(err); } done(true); };
    const first=()=>setTimeout(next,0);
    if(typeof requestAnimationFrame==='function') requestAnimationFrame(first); else first();
  });
}
/* the tab opened: its sets built and drawn (the prop model's tab switch has shown the section by the time
   the click reaches the document); by the reader's own click or key, without holding the page (spOpenSoft) */
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('#tabs button[data-tab="suggest"]'):null;
  if(b&&typeof S==='object'&&S&&S.sched) try{ if(!(e.isTrusted&&spOpenSoft())) renderSp(); }catch(err){ console.error(err); } });""", 'the tab opened')

sub1('p3', "Object.assign(window,{spDayOff,SP_SHOW,", "Object.assign(window,{spOpenSoft,spWarmSteps,spDayOff,SP_SHOW,", 'window: spOpenSoft')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v135, the parlay sums kept and Suggested Parlays opened without a freeze')
