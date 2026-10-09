/* One copy for every device.
 *
 * The parlay builder, the saved parlays, a line corrected in the Live Parlays section and a
 * parlay deleted there used to live in the browser that made them and nowhere else, so a
 * parlay built on the phone was not on the laptop. This layer keeps them in one shared
 * document instead: every device reads it when the page opens, writes it on every change,
 * and re-reads it every few seconds while the page is on screen, so a change made anywhere
 * shows everywhere on the next look.
 *
 * The document lives in a plain JSON store reached over HTTPS -- a Firebase Realtime
 * Database, which needs no SDK: GET <url>/doc.json reads it, PUT <url>.json replaces it.
 * Its address is not built into the page: it is read from nflbets/sync.json beside it on
 * every load, so pasting the address into that file is the whole setup and needs no rebuild.
 * With the address blank the page runs as before, on this browser only, and says so.
 *
 * How it hooks in. The prop model saves through window.storage when the page defines one,
 * so this script, which runs before it, defines one: get() answers with the browser's copy
 * with the shared document's keys laid over it, set() keeps the browser's copy and pushes
 * the shared keys. The Live Parlays section's own key goes through window.LIVE_IO the same
 * way, every key of it. Only what the visitor made is shared -- the builder, the saved
 * parlays, the stake, the book price, the margin, the corrected lines, the deletions and the
 * builder legs the section kept at kickoff. The season itself is never in the document: it is
 * read from the published data on every load.
 *
 * What is in the store is a string, not a tree: {rev, at, doc:{rev, at, revs, json:"..."}}, so
 * that no store's rules about key names or empty objects can change what comes back. The rev
 * is a random tag per write and revs the last fifty of them, the document's line of descent.
 * A poll reads only <url>/rev.json, a few bytes, and fetches the document when the tag has
 * moved; a push is skipped when the document would not change.
 *
 * Two devices never write over each other. A write is a whole document, so a device that
 * wrote what it had without looking would erase whatever another device saved since it last
 * read (a parlay saved on the laptop, gone the moment the phone changes its stake). So every
 * write looks first: it reads the rev, and when another device has written since, it fetches
 * that document and merges before writing. The merge is three-way, against the document both
 * sides started from: what only this device changed is kept, what only the other changed is
 * taken, a deletion on either side holds, and where both changed the same thing this device's
 * change wins. A poll merges the same way, so a phone that was edited offline and comes back
 * merges in what was saved elsewhere meanwhile instead of overwriting it. A page on its way out
 * looks too (its requests are sent keepalive); if it is gone before the write, the change waits
 * in the browser for its next visit. And since two devices can still look at the same moment and
 * both write, each device keeps the last few documents it has read or written, by rev: the base
 * of a merge is the newest of them in the store's line of descent (revs), so when a write of its
 * own was overwritten by one built beside it, or on something older, it merges against the
 * document both really started from and writes again, and nothing it saved is lost.
 *
 * Nothing is pushed until the shared document has been read and applied once: a device that
 * has not seen the document yet must not replace it with its own empty builder. If the store
 * cannot be read the page runs on the browser's copy, keeps retrying, and the stamp says so.
 *
 * The first time a browser takes the document it joins rather than yields. A browser that
 * has never shared -- one that saved parlays before the store had an address, or in a tab
 * open from before -- may hold parlays the document does not, and the document, seeded by
 * whichever device opened first, may hold none. Replacing the browser's list with the
 * document's would lose them, so on that first read the browser's saved parlays are added to
 * the document (by id; the document's own are kept as they are), its builder stands in for
 * an empty one, its corrected lines and deletions are kept where the document has none, and
 * the result is pushed. The browser remembers, under its own key, the rev it last took or
 * wrote, and beside it (nflsync_base_v1) the document at that rev and the few before it, so its
 * next visit merges three ways too: what it changed since stays, and a parlay it lacks is one
 * another device deleted. A browser that remembers a rev but not the document wins nothing: the
 * document wins outright. */
window.NFLSYNC=(function(){
  /* the prop model's key: the build writes part2's own KEY over this default, so the season
     is named in one place */
  const CONF='sync.json', PROP_KEY=/*PROP_KEY*/'props_2026_v1', LIVE_KEY='live_parlays_v1', SEEN_KEY='nflsync_v1', BASE_KEY='nflsync_base_v1';
  const PROP_KEYS=['parlay','saved','stake','bookPrice','margin'];
  const POLL_MS=8000, PUSH_MS=400, BOOT_WAIT_MS=6000, GET_MS=12000, PUT_MS=20000, REVS=50, HIST=16, HIST_KEPT=4;
  /* rev, revs, at, doc: the store's document as this device last saw it, read or written.
     hist: the documents it has read or written lately, by rev, oldest first: the bases a merge
     can start from. view: what the page shows, the store's document with this device's own
     changes merged in. */
  const st={url:null, rev:null, revs:[], doc:null, hist:[], view:null, applied:false, live:false, ready:false, ok:null, err:null,
    at:null, checked:null, pending:false, pushing:false, joined:0, merged:0, recovered:0, pulls:0, pushes:0};
  const listeners=[];
  const emit=()=>{ for(const f of listeners){ try{ f(state()); }catch(e){} } };
  const state=()=>({url:st.url, rev:st.rev, applied:st.applied, live:st.live, ready:st.ready, ok:st.ok,
    err:st.err, at:st.at, checked:st.checked, pending:st.pending, pushing:st.pushing, joined:st.joined,
    merged:st.merged, recovered:st.recovered, pulls:st.pulls, pushes:st.pushes});
  const ls={
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } } };
  const parse=s=>{ try{ return s?JSON.parse(s):null; }catch(e){ return null; } };
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const newRev=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const union=(...a)=>[...new Set([].concat(...a))];

  /* the shared part of what the two models keep */
  function propPart(v){ const out={}; if(!isObj(v)) return out;
    for(const k of PROP_KEYS) if(v[k]!==undefined) out[k]=v[k]; return out; }
  /* the section's key, whole: lines and removed always there, anything else carried */
  function livePart(v){ if(!isObj(v)) v={};
    return Object.assign({},v,{lines:isObj(v.lines)?v.lines:{}, removed:isObj(v.removed)?v.removed:{}}); }
  const sig=d=>JSON.stringify(d||{});
  /* the same document whatever order its keys were written in */
  const canon=v=>JSON.stringify(v,(k,x)=>isObj(x)?Object.keys(x).sort().reduce((o,kk)=>(o[kk]=x[kk],o),{}):x);
  const same=(a,b)=>canon(a)===canon(b);
  /* always a copy: the document held here must not share an object with the model's state,
     or an edit to the state would edit the copy it is compared against and never push */
  const deep=d=>parse(sig(d));
  function localDoc(){
    const S_=typeof S==='object'&&S&&Array.isArray(S.saved)?S:parse(ls.get(PROP_KEY));
    return deep({prop:propPart(S_), live:livePart(parse(ls.get(LIVE_KEY)))}); }

  /* whether this browser has ever taken or written the shared document */
  const shared=()=>ls.get(SEEN_KEY)!=null;
  const remember=rev=>{ if(rev) ls.set(SEEN_KEY,String(rev)); };
  /* a document this device has read or written, kept by rev as a possible merge base */
  function know(rev,doc){ if(!rev||!doc) return; st.hist=st.hist.filter(h=>h.rev!==rev); st.hist.push({rev,doc:deep(doc)}); if(st.hist.length>HIST) st.hist.shift(); }
  /* the document at the remembered rev, and the few before it, so the next visit can merge
     three ways */
  function keepBase(){ if(st.rev&&st.doc) ls.set(BASE_KEY,JSON.stringify({rev:st.rev,revs:st.revs,doc:st.doc,hist:st.hist.slice(-HIST_KEPT)})); }
  function loadBase(){
    const seen=ls.get(SEEN_KEY), b=parse(ls.get(BASE_KEY));
    if(!seen||!isObj(b)||b.rev!==seen||!isObj(b.doc)) return;
    st.rev=b.rev; st.revs=Array.isArray(b.revs)?b.revs:[b.rev]; st.doc={prop:propPart(b.doc.prop), live:livePart(b.doc.live)};
    for(const h of (Array.isArray(b.hist)?b.hist:[])) if(h&&h.rev&&isObj(h.doc)) know(String(h.rev),{prop:propPart(h.doc.prop), live:livePart(h.doc.live)});
    know(st.rev,st.doc); }

  /* a browser's first read of a document another device seeded: what only this browser has
     joins the document. Returns the joined document and how many saved parlays it added. */
  function join(local,remote){
    const prop=Object.assign({},remote.prop), lp=local.prop||{};
    const id=p=>(p&&p.id)||sig(p);
    const have=new Set((prop.saved||[]).map(id));
    const extra=(Array.isArray(lp.saved)?lp.saved:[]).filter(p=>p&&!have.has(id(p)));
    if(extra.length) prop.saved=(prop.saved||[]).concat(extra);
    if(!Object.keys(prop.parlay||{}).length&&isObj(lp.parlay)&&Object.keys(lp.parlay).length) prop.parlay=lp.parlay;
    for(const k of ['stake','bookPrice','margin']) if(prop[k]===undefined&&lp[k]!==undefined) prop[k]=lp[k];
    const ll=livePart(local.live), rl=livePart(remote.live);
    return {doc:deep({prop, live:Object.assign({},ll,rl,{lines:Object.assign({},ll.lines,rl.lines), removed:Object.assign({},ll.removed,rl.removed)})}), added:extra.length};
  }

  /* ---- the three-way merge ----
     base is the document both sides started from, local what this page holds, remote what
     the store holds. One value: whoever changed it since base wins; if both did, a deletion
     holds, and otherwise this page's change wins, since it is the one just made. */
  function pick3(b,l,r){
    if(same(l,b)) return r;
    if(same(r,b)) return l;
    if(l===undefined||r===undefined) return undefined;
    return l;
  }
  /* a map (the builder's legs, the corrected lines, the deletions): key by key */
  function mergeKeys(b,l,r){
    b=isObj(b)?b:{}; l=isObj(l)?l:{}; r=isObj(r)?r:{};
    const out={};
    for(const k of union(Object.keys(r),Object.keys(l),Object.keys(b))){ const v=pick3(b[k],l[k],r[k]); if(v!==undefined) out[k]=v; }
    return out;
  }
  /* the saved parlays: by id, in the store's order with this page's new ones after */
  function mergeList(b,l,r){
    const id=p=>(p&&p.id!=null)?'id:'+p.id:'sig:'+canon(p);
    const map=a=>{ const m=new Map(); for(const p of (Array.isArray(a)?a:[])) m.set(id(p),p); return m; };
    const B=map(b), L=map(l), R=map(r), out=[];
    for(const k of union([...R.keys()],[...L.keys()])){ const v=pick3(B.get(k),L.get(k),R.get(k)); if(v!==undefined) out.push(v); }
    return out;
  }
  function merge3(base,local,remote){
    const bp=(base&&base.prop)||{}, lp=(local&&local.prop)||{}, rp=(remote&&remote.prop)||{};
    const prop={};
    for(const k of PROP_KEYS){
      const v=k==='saved'?mergeList(bp.saved,lp.saved,rp.saved):(k==='parlay'?mergeKeys(bp.parlay,lp.parlay,rp.parlay):pick3(bp[k],lp[k],rp[k]));
      if(v!==undefined) prop[k]=v; }
    const bl=livePart(base&&base.live), ll=livePart(local&&local.live), rl=livePart(remote&&remote.live), live={};
    for(const k of union(Object.keys(rl),Object.keys(ll),Object.keys(bl))){
      const objs=[bl[k],ll[k],rl[k]].every(x=>x===undefined||isObj(x));
      const v=objs?mergeKeys(bl[k],ll[k],rl[k]):pick3(bl[k],ll[k],rl[k]);
      if(v!==undefined) live[k]=v; }
    return deep({prop,live});
  }
  /* the document to merge against: the newest one this device knows that is in the store's
     line of descent -- the document both sides really started from */
  function baseFor(remote){
    /* the store moved on from what this device last saw: the usual case */
    if(remote.rev===st.rev||remote.revs.indexOf(st.rev)>=0) return st.doc;
    /* this device's last write is not in the store's line of descent: another device wrote
       beside it, or on something older, and overwrote it. The newest document of this device's
       that the store does descend from is where the two parted. */
    for(let i=remote.revs.length-1;i>=0;i--){ const h=st.hist.find(x=>x.rev===remote.revs[i]); if(h){ st.recovered++; return h.doc; } }
    /* too long ago to tell, or a page from before revs were kept: the last document seen */
    return st.doc;
  }
  /* what the page should show, given what the store holds now; records the store's document */
  function reconcile(remote){
    const local=localDoc();
    let view;
    if(!remote) view=local;                                    /* an empty store: this browser seeds it */
    else if(st.doc){ view=merge3(baseFor(remote),local,remote.doc); if(!same(view,remote.doc)&&!same(view,local)) st.merged++; }
    else if(!shared()){ const j=join(local,remote.doc); view=j.doc; st.joined+=j.added; }
    /* shared before, but the document it was at is not kept: the store wins outright, apart
       from section keys the store has never carried */
    else view=deep({prop:remote.doc.prop, live:Object.assign({},livePart(local.live),remote.doc.live)});
    if(remote){ st.rev=remote.rev; st.revs=remote.revs; st.at=remote.at; st.doc=deep(remote.doc); know(remote.rev,remote.doc); }
    else { st.rev=null; st.revs=[]; st.doc=null; }
    return view;
  }

  /* the address: nflbets/sync.json, read fresh every load. Blank means this browser only. */
  async function readConf(){
    try{
      const r=await fetchT(CONF+'?t='+Date.now(),null,GET_MS);
      if(!r.ok) throw new Error('HTTP '+r.status);
      const c=await r.json();
      let u=String((c&&c.url)||'').trim();
      if(u){ u=u.replace(/\.json$/,'').replace(/\/+$/,''); if(!/^https:\/\//.test(u)) throw new Error('the store address must start with https://'); }
      st.url=u||null;
    }catch(e){ st.url=null; st.err='sync.json: '+(e&&e.message||e); }
    return st.url;
  }
  const opts=o=>Object.assign({cache:'no-store'},o||{});
  /* every request gives up after a while: a phone that sleeps mid-request can leave a fetch
     that never settles, and a poll waiting on it would never look again */
  async function fetchT(url,o,ms){
    const ac=typeof AbortController==='function'?new AbortController():null;
    const t=ac?setTimeout(()=>ac.abort(),ms):null;
    try{ return await fetch(url,Object.assign(opts(o),ac?{signal:ac.signal}:{})); }
    catch(e){ throw (e&&e.name==='AbortError')?new Error('no answer in '+Math.round(ms/1000)+'s'):e; }
    finally{ if(t) clearTimeout(t); }
  }
  async function getJSON(path,keepalive){
    const r=await fetchT(st.url+path+'?t='+Date.now(),keepalive?{keepalive:true}:null,GET_MS);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  const revOf=v=>v==null?'':String(v);

  /* read the whole document; null when the store is empty */
  async function pull(keepalive){
    if(!st.url) return null;
    const d=await getJSON('/doc.json',keepalive);
    if(d==null) return null;
    const doc=parse(typeof d.json==='string'?d.json:null);
    if(!isObj(doc)) throw new Error('the shared document is not readable');
    const rev=String(d.rev||'');
    return {rev, at:d.at||null, revs:Array.isArray(d.revs)?d.revs.map(String):[rev], doc:{prop:propPart(doc.prop), live:livePart(doc.live)}};
  }

  /* lay a document over the running page: the prop model's state in memory, the browser's
     copy of both keys, and every view that shows them */
  function show(view){
    if(!view) return;
    st.view=deep(view);
    const prop=deep(view.prop);
    ls.set(LIVE_KEY,JSON.stringify(livePart(deep(view.live))));
    /* the prop model's state is touched only once the model is up: mid-boot it is half built */
    if(st.ready&&typeof S==='object'&&S&&Array.isArray(S.saved)){
      const before=sig(propPart(S));
      for(const k of PROP_KEYS) S[k]=prop[k]!==undefined?prop[k]:(k==='parlay'?{}:k==='saved'?[]:S[k]);
      S.parlay=isObj(S.parlay)?S.parlay:{}; S.saved=Array.isArray(S.saved)?S.saved:[];
      if(sig(propPart(S))!==before){
        try{ if(typeof save==='function') save(); }catch(e){}
        try{ if(typeof renderParlay==='function') renderParlay(); }catch(e){}
        try{ if(S.ui&&S.ui.game&&typeof renderGame==='function') renderGame(); }catch(e){}
      }
    } else {
      const v=parse(ls.get(PROP_KEY));
      if(isObj(v)){ Object.assign(v,prop); ls.set(PROP_KEY,JSON.stringify(v)); }
    }
    try{ if(st.ready&&window.lpDraw) window.lpDraw(); }catch(e){}
    try{ if(st.ready) document.dispatchEvent(new CustomEvent('nflsync-applied',{detail:state()})); }catch(e){}
  }
  /* a document read from the store: merged, shown, remembered, and pushed back when the
     merge kept something of this page's that the store does not have */
  function apply(remote){
    const view=reconcile(remote);
    show(view);
    st.applied=true; st.live=true; st.ok=true; st.err=null; st.checked=new Date().toISOString();
    if(remote){ remember(remote.rev); keepBase(); }
    if(!remote||!same(view,remote.doc)) schedulePush();
    try{ if(!st.ready) document.dispatchEvent(new CustomEvent('nflsync-applied',{detail:state()})); }catch(e){}
    emit();
  }

  /* the poll: the rev first, the document only when it moved. It runs with a push still to
     make, too: what this page changed is merged, not lost, and the push that follows writes
     the merge. Only a push in flight holds it back. */
  /* a poll in flight is a time, not a flag: one that never comes back is forgotten after
     the requests inside it have all given up, so the next look is never blocked by it */
  let pollingSince=0;
  async function poll(){
    if(!st.url||(pollingSince&&Date.now()-pollingSince<GET_MS*2+1000)) return; pollingSince=Date.now();
    try{
      if(!st.applied){ const remote=await pull(); st.pulls++; apply(remote); }
      else if(!st.pushing){
        const rev=await getJSON('/rev.json'); st.pulls++;
        if(revOf(rev)!==(st.rev||'')){
          /* a write of this page's that landed while the document was on its way is newer than
             it: the document is dropped, and the next look reads again */
          const was=st.rev, remote=await pull();
          if(!st.pushing&&st.rev===was) apply(remote);
        }
        else { st.ok=true; st.err=null; st.checked=new Date().toISOString(); emit(); }
      }
    }catch(e){ st.ok=false; st.err=String(e&&e.message||e); emit(); }
    pollingSince=0;
  }

  /* the push: what this browser has, whole, under a fresh rev -- once it has looked */
  let pushTimer=null;
  function schedulePush(){
    if(!st.url||!st.live) return;
    st.pending=true; clearTimeout(pushTimer); pushTimer=setTimeout(push,PUSH_MS); emit();
  }
  /* leaving: the page is going to the background or away. It still looks before writing --
     a blind write from a page that has not looked for a while is exactly what erases another
     device's parlays -- with every request sent keepalive so it can finish after the page is
     gone. If it does not get as far as the write, the change waits in the browser for its next
     visit, which merges it. */
  async function push(leaving){
    clearTimeout(pushTimer);
    if(!st.url||!st.live){ st.pending=false; emit(); return false; }
    /* one at a time, and nothing from a model still booting */
    if(st.pushing||(!st.ready&&!leaving)){ pushTimer=setTimeout(push,PUSH_MS); return false; }
    st.pushing=true;
    let ok=false;
    const keepalive=!!leaving;
    try{
      /* look before writing: a document another device wrote since this one last looked is
         merged in first */
      { const rev=await getJSON('/rev.json',keepalive); st.pulls++;
        if(revOf(rev)!==(st.rev||'')){ const remote=await pull(keepalive); st.pulls++;
          const view=reconcile(remote); show(view); if(remote){ remember(remote.rev); keepBase(); } } }
      const doc=localDoc();
      if(st.doc&&same(doc,st.doc)){ st.pending=false; st.ok=true; st.err=null; ok=true; }
      else {
        const rev=newRev(), at=new Date().toISOString(), revs=(st.revs||[]).concat([rev]).slice(-REVS);
        const r=await fetchT(st.url+'.json?print=silent',{method:'PUT',keepalive,
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({rev,at,doc:{rev,at,revs,json:JSON.stringify(doc)}})},PUT_MS);
        if(!r.ok) throw new Error('HTTP '+r.status);
        st.rev=rev; st.revs=revs; st.at=at; st.doc=doc; st.view=deep(doc); know(rev,doc); st.pushes++; st.ok=true; st.err=null; st.pending=false; st.checked=at;
        remember(rev); keepBase(); ok=true;
      }
    }catch(e){ st.ok=false; st.err=String(e&&e.message||e); st.pending=true; clearTimeout(pushTimer); pushTimer=setTimeout(push,POLL_MS); }
    st.pushing=false;
    /* something changed while the write was out: write again */
    if(ok&&st.doc&&!same(localDoc(),st.doc)) schedulePush();
    emit();
    return ok;
  }

  /* --- the hooks the two models save through --- */
  let booted=null;
  function boot(){
    if(booted) return booted;
    booted=(async()=>{
      await readConf();
      if(!st.url){ st.applied=true; st.live=false; st.ok=null; emit(); return; }
      loadBase();
      try{ const remote=await pull(); st.pulls++; apply(remote); }
      catch(e){ st.ok=false; st.err=String(e&&e.message||e); emit(); }
    })();
    return booted;
  }
  const settled=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);
  window.storage={
    /* the prop model's read at boot: the browser's copy with the shared keys laid over it.
       A store that will not answer holds the page for a few seconds at most. */
    async get(key){
      if(key===PROP_KEY) await settled(boot(),BOOT_WAIT_MS);
      const raw=ls.get(key);
      if(key!==PROP_KEY||!st.view||!st.applied||!st.live) return raw==null?null:{value:raw};
      const v=parse(raw);
      if(!isObj(v)) return raw==null?null:{value:raw};
      Object.assign(v,deep(st.view.prop));
      return {value:JSON.stringify(v)};
    },
    async set(key,value){
      if(!ls.set(key,String(value))) throw new Error('local storage refused the write');
      if(key===PROP_KEY) schedulePush();
    }
  };
  window.LIVE_IO={
    get(){ return ls.get(LIVE_KEY); },
    set(v){ const ok=ls.set(LIVE_KEY,String(v)); schedulePush(); return ok; }
  };

  /* while the page is on screen it looks every few seconds; the moment it comes back it
     looks at once; on the way out it sends what it has not sent yet */
  let timer=null;
  function tick(){ clearInterval(timer); timer=null;
    if(document.visibilityState==='hidden') return;
    poll(); timer=setInterval(poll,POLL_MS); }
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') tick(); else { clearInterval(timer); timer=null; if(st.pending) push(true); } });
  /* a phone brings a page back in more ways than one: out of its page cache, on focus, and
     when the network returns. Each one is a look, if the page is up. */
  for(const ev of ['pageshow','focus','online']) window.addEventListener(ev,()=>{ if(st.ready) tick(); });
  window.addEventListener('pagehide',()=>{ if(st.pending) push(true); });
  document.addEventListener('app-ready',()=>{ st.ready=true; boot().then(()=>{
    if(st.url&&st.applied&&st.live){
      if(st.view) show(st.view);
      /* an empty store takes what this browser already had, so a second device sees it */
      if(!st.doc||!same(localDoc(),st.doc)) schedulePush();
    }
    tick(); }); });

  return {state, poll, onChange(f){ listeners.push(f); }};
})();
