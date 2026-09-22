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
 * way. Only what the visitor made is shared -- the builder, the saved parlays, the stake,
 * the book price, the margin, the corrected lines and the deletions. The season itself is
 * never in the document: it is read from the published data on every load.
 *
 * What is in the store is a string, not a tree: {rev, at, doc:{rev, at, json:"..."}}, so that no
 * store's rules about key names or empty objects can change what comes back. The rev is a
 * random tag per write. A poll reads only <url>/rev.json, a few bytes, and fetches the
 * document when the tag has moved; a push is skipped when the document would not change.
 *
 * Nothing is pushed until the shared document has been read and applied once: a device
 * that has not seen the document yet must not replace it with its own empty builder. If the
 * store cannot be read the page runs on the browser's copy, keeps retrying, and the stamp
 * says so.
 *
 * The first time a browser takes the document it joins rather than yields. A browser that
 * has never shared -- one that saved parlays before the store had an address, or in a tab
 * open from before -- may hold parlays the document does not, and the document, seeded by
 * whichever device opened first, may hold none. Replacing the browser's list with the
 * document's would lose them, so on that first read the browser's saved parlays are added to
 * the document (by id; the document's own are kept as they are), its builder stands in for
 * an empty one, its corrected lines and deletions are kept where the document has none, and
 * the result is pushed. The browser remembers, under its own key, the rev it last took or
 * wrote, and from then on the document wins outright: a parlay it lacks is one another
 * device deleted. */
window.NFLSYNC=(function(){
  const CONF='sync.json', PROP_KEY='props_2026_v1', LIVE_KEY='live_parlays_v1', SEEN_KEY='nflsync_v1';
  const PROP_KEYS=['parlay','saved','stake','bookPrice','margin'];
  const POLL_MS=8000, PUSH_MS=400, BOOT_WAIT_MS=6000, GET_MS=12000, PUT_MS=20000;
  const st={url:null, conf:null, rev:null, doc:null, applied:false, live:false, ready:false, ok:null, err:null,
    at:null, checked:null, pending:false, pushing:false, dirty:false, joined:0, pulls:0, pushes:0};
  const listeners=[];
  const emit=()=>{ for(const f of listeners){ try{ f(state()); }catch(e){} }
    try{ document.dispatchEvent(new CustomEvent('nflsync',{detail:state()})); }catch(e){} };
  const state=()=>({url:st.url, conf:st.conf, rev:st.rev, applied:st.applied, live:st.live, ready:st.ready, ok:st.ok,
    err:st.err, at:st.at, checked:st.checked, pending:st.pending, pushing:st.pushing, joined:st.joined, pulls:st.pulls, pushes:st.pushes});
  const ls={
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } } };
  const parse=s=>{ try{ return s?JSON.parse(s):null; }catch(e){ return null; } };
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const newRev=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);

  /* the shared part of what the two models keep */
  function propPart(v){ const out={}; if(!isObj(v)) return out;
    for(const k of PROP_KEYS) if(v[k]!==undefined) out[k]=v[k]; return out; }
  function livePart(v){ if(!isObj(v)) v={};
    return {lines:isObj(v.lines)?v.lines:{}, removed:isObj(v.removed)?v.removed:{}}; }
  const sig=d=>JSON.stringify(d||{});
  /* always a copy: the document held here must not share an object with the model's state,
     or an edit to the state would edit the copy it is compared against and never push */
  const deep=d=>parse(sig(d));
  function localDoc(){
    const S_=typeof S==='object'&&S&&Array.isArray(S.saved)?S:parse(ls.get(PROP_KEY));
    return deep({prop:propPart(S_), live:livePart(parse(ls.get(LIVE_KEY)))}); }

  /* whether this browser has ever taken or written the shared document */
  const shared=()=>ls.get(SEEN_KEY)!=null;
  const remember=rev=>{ if(rev) ls.set(SEEN_KEY,String(rev)); };
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
    return {doc:deep({prop, live:{lines:Object.assign({},ll.lines,rl.lines), removed:Object.assign({},ll.removed,rl.removed)}}), added:extra.length};
  }

  /* the address: nflbets/sync.json, read fresh every load. Blank means this browser only. */
  async function readConf(){
    try{
      const r=await fetchT(CONF+'?t='+Date.now(),null,GET_MS);
      if(!r.ok) throw new Error('HTTP '+r.status);
      const c=await r.json(); st.conf=c;
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
  async function getJSON(path){
    const r=await fetchT(st.url+path+'?t='+Date.now(),null,GET_MS);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }

  /* read the whole document; null when the store is empty */
  async function pull(){
    if(!st.url) return null;
    const d=await getJSON('/doc.json');
    if(d==null) return null;
    const doc=parse(typeof d.json==='string'?d.json:null);
    if(!isObj(doc)) throw new Error('the shared document is not readable');
    return {rev:String(d.rev||''), at:d.at||null, doc:{prop:propPart(doc.prop), live:livePart(doc.live)}};
  }

  /* lay the document over the running page: the prop model's state in memory, the browser's
     copy of both keys, and every view that shows them */
  function apply(remote){
    st.rev=remote?remote.rev:null; st.at=remote?remote.at:null;
    /* an empty store has no document to compare against, so the first save seeds it */
    st.doc=remote?deep(remote.doc):null;
    if(remote&&!shared()){
      /* this browser's first document: what it alone holds joins, and the joined document is
         what the page takes and what gets pushed */
      const j=join(localDoc(),remote.doc);
      if(sig(j.doc)!==sig(remote.doc)){ st.doc=j.doc; st.dirty=true; st.joined+=j.added; remote=Object.assign({},remote,{doc:j.doc}); }
    }
    if(remote){
      const prop=deep(remote.doc.prop);
      ls.set(LIVE_KEY,JSON.stringify(Object.assign(livePart(parse(ls.get(LIVE_KEY))),remote.doc.live)));
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
    }
    st.applied=true; st.live=true; st.ok=true; st.err=null; st.checked=new Date().toISOString();
    /* the browser matches the store now, unless it has a join still to push */
    if(remote&&!st.dirty) remember(remote.rev);
    if(st.dirty) schedulePush();
    try{ document.dispatchEvent(new CustomEvent('nflsync-applied',{detail:state()})); }catch(e){}
    emit();
  }

  /* the poll: the rev first, the document only when it moved */
  /* a poll in flight is a time, not a flag: one that never comes back is forgotten after
     the requests inside it have all given up, so the next look is never blocked by it */
  let pollingSince=0;
  async function poll(){
    if(!st.url||(pollingSince&&Date.now()-pollingSince<GET_MS*2+1000)) return; pollingSince=Date.now();
    try{
      if(!st.applied){ apply(await pull()); st.pulls++; }
      else if(!st.pending&&!st.pushing){
        const rev=await getJSON('/rev.json'); st.pulls++;
        if((rev==null?'':String(rev))!==(st.rev||'')){
          const remote=await pull();
          if(!st.pending&&!st.pushing) apply(remote);
        }
        else { st.ok=true; st.err=null; st.checked=new Date().toISOString(); emit(); }
      }
    }catch(e){ st.ok=false; st.err=String(e&&e.message||e); emit(); }
    pollingSince=0;
  }

  /* the push: what this browser has, whole, under a fresh rev */
  let pushTimer=null;
  function schedulePush(){
    if(!st.url||!st.live) return;
    st.pending=true; clearTimeout(pushTimer); pushTimer=setTimeout(push,PUSH_MS); emit();
  }
  async function push(keepalive){
    clearTimeout(pushTimer);
    if(!st.url||!st.live){ st.pending=false; return false; }
    const doc=localDoc();
    if(!st.dirty&&st.doc&&sig(doc)===sig(st.doc)){ st.pending=false; emit(); return true; }
    const rev=newRev(), at=new Date().toISOString();
    st.pushing=true;
    try{
      const r=await fetchT(st.url+'.json?print=silent',{method:'PUT',keepalive:!!keepalive,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({rev,at,doc:{rev,at,json:JSON.stringify(doc)}})},PUT_MS);
      if(!r.ok) throw new Error('HTTP '+r.status);
      st.rev=rev; st.at=at; st.doc=doc; st.pushes++; st.ok=true; st.err=null; st.pending=false; st.dirty=false; st.checked=at; remember(rev);
    }catch(e){ st.ok=false; st.err=String(e&&e.message||e); st.pending=true; pushTimer=setTimeout(push,POLL_MS); }
    st.pushing=false; emit();
    return st.ok;
  }

  /* --- the hooks the two models save through --- */
  let booted=null;
  function boot(){
    if(booted) return booted;
    booted=(async()=>{
      await readConf();
      if(!st.url){ st.applied=true; st.live=false; st.ok=null; emit(); return; }
      try{ apply(await pull()); st.pulls++; }
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
      if(key!==PROP_KEY||!st.doc||!st.applied||!st.live) return raw==null?null:{value:raw};
      const v=parse(raw);
      if(!isObj(v)) return raw==null?null:{value:raw};
      Object.assign(v,deep(st.doc.prop));
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
    if(st.url&&st.applied&&st.doc) apply({rev:st.rev,at:st.at,doc:st.doc});
    /* an empty store takes what this browser already had, so a second device sees it */
    else if(st.url&&st.applied&&st.live) schedulePush();
    tick(); }); });

  return {state, boot, poll, push, onChange(f){ listeners.push(f); }, PROP_KEYS, POLL_MS};
})();
