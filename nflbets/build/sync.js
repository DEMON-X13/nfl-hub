/* X's parlays, one copy for every device, written by X alone.
 *
 * The parlay builder, the saved parlays, a line corrected in the X Parlays section and a
 * parlay deleted there used to live in the browser that made them and nowhere else, so a
 * parlay built on the phone was not on the laptop. This layer keeps the owner's in one shared
 * document instead: every device reads it when the page opens and re-reads it every few seconds
 * while the page is on screen, and the owner's devices write it on every change, so a change X
 * makes anywhere shows everywhere on the next look.
 *
 * Who writes. Only the owner's devices: every other device is a reader, which shows the
 * document under X Parlays with nothing to press, and keeps whatever its visitor builds in its
 * own browser (the prop model's own key, and the section's my_parlays_v1), apart from X's and
 * seen by nobody else. A device is the owner's in one of two ways, both read from
 * nflbets/sync.json on every load:
 *   - the owner link (ownerHash): the page opened once as #owner=<secret>. The secret is taken
 *     off the address at once, hashed (SHA-256), and on a match kept in this browser
 *     (nflowner_v1); changing ownerHash signs every device out. This stops visitors' pages from
 *     writing, not a person with the store's address and a command line: the store's rules are
 *     open.
 *   - Firebase sign-in (apiKey and owner, the owner's uid): email and password over Firebase's
 *     REST interface, no SDK. The session (nflsync_owner_v1) holds the refresh token, never the
 *     password; every write carries ?auth=<ID token>, renewed when it has under five minutes
 *     left and once more on a refusal. With the store's rules locked to the owner's uid, nobody
 *     else can write at all. A device whose sign-in has lapsed keeps everything it has and asks
 *     to be signed in again; what it changed meanwhile is written once it is.
 *
 * The document lives in a plain JSON store reached over HTTPS -- a Firebase Realtime
 * Database, which needs no SDK: GET <url>/doc.json reads it, PUT <url>.json replaces it.
 * Its address is not built into the page: it is read from nflbets/sync.json beside it on
 * every load, so pasting the address into that file is the whole setup and needs no rebuild.
 * With the address blank, or the file unreadable, the page runs as before, on this browser
 * only, and says so. The X Bet Log (xbets.js) keeps its own document beside this one, at
 * <the parent of url>/xbets, never inside it: a PUT here replaces this whole node.
 *
 * How it hooks in. The prop model saves through window.storage when the page defines one,
 * so this script, which runs before it, defines one: on the owner's device get() answers with
 * the browser's copy with the shared document's keys laid over it and set() keeps the browser's
 * copy and pushes the shared keys; on a reader's it is the browser's own storage, nothing more.
 * The X Parlays section's own key goes through window.LIVE_IO the same way, every key of it, on
 * the owner's device; on a reader's LIVE_IO answers with X's copy as read and refuses a write.
 * Only what X made is shared -- the builder, the saved parlays, the stake, the book price, the
 * margin, the corrected lines, the deletions, the builder legs the section kept at kickoff, and
 * the betting model's slips of each of X's devices (live.bet, by device). The season itself is
 * never in the document: it is read from the published data on every load.
 *
 * What is in the store is a string, not a tree: {rev, at, doc:{rev, at, revs, json:"..."}}, so
 * that no store's rules about key names or empty objects can change what comes back. The rev
 * is a random tag per write and revs the last fifty of them, the document's line of descent.
 * A poll reads only <url>/rev.json, a few bytes, and fetches the document when the tag has
 * moved; a push is skipped when the document would not change.
 *
 * Two of X's devices never write over each other. A write is a whole document, so a device that
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
 * The first time one of X's browsers takes the document it joins rather than yields. A browser
 * that has never shared may hold parlays the document does not, and replacing its list with the
 * document's would lose them, so on that first read the browser's saved parlays are added to the
 * document (by id; the document's own are kept as they are), its builder stands in for an empty
 * one, its corrected lines and deletions are kept where the document has none, and the result is
 * pushed. So the owner's first visit as the owner adopts the document as it stands and loses
 * nothing. The browser remembers, under its own key, the rev it last took or wrote, and beside it
 * (nflsync_base_v1) the document at that rev and the few before it, so its next visit merges
 * three ways too: what it changed since stays, and a parlay it lacks is one another device
 * deleted. A browser that remembers a rev but not the document wins nothing: the document wins
 * outright.
 *
 * Everything read from the store is cleaned before anything lays it into the page, and so is
 * every copy of it this browser kept (the remembered documents, a reader's last copy, the owner's
 * own copy of the shared keys): every string and every key loses < > " and `. Until the rules are
 * locked the store takes a write from anyone with its address, and the prop model and the X
 * Parlays section draw a leg's name, team, position and price into the owner's page, which holds
 * the owner link and the sign-in session; with those four characters gone a string can be neither
 * an element nor a way out of a quoted attribute, and nothing a parlay holds uses them.
 *
 * A reader's browser joins nothing. Until X alone wrote, every browser kept a mirror of the
 * shared document as its own; the first time a browser opens as a reader (xparlays_v1 marks it,
 * and it is cleared whenever the browser is the owner's, so a browser that stops being the
 * owner's is done again), the saved parlays and builder legs it took from the document -- the
 * remembered documents, and the one in the store -- leave its own list, its copy of the shared
 * key goes, and what is left is the visitor's own. Signing out of owner does the same. */
window.NFLSYNC=(function(){
  /* the prop model's key and the betting model's: the build writes part2's own KEY and the
     betting app's season over these defaults, so each is named in one place */
  const CONF='sync.json', PROP_KEY=/*PROP_KEY*/'props_2026_v1', BET_KEY=/*BET_KEY*/'x_nfl_viewer_picks_2026', LIVE_KEY='live_parlays_v1', SEEN_KEY='nflsync_v1', BASE_KEY='nflsync_base_v1';
  /* the owner: the owner link's secret, the Firebase session, this device's id for its betting
     slips. A reader: the mark that its mirror was stripped, the last copy of X's parlays it saw
     (shown, marked, only while the store cannot be reached), and the section's key for its own */
  const OWNER_KEY='nflowner_v1', SESSION_KEY='nflsync_owner_v1', DEVICE_KEY='nflsync_device_v1', READER_KEY='xparlays_v1', CACHE_KEY='xparlays_cache_v1', MY_KEY='my_parlays_v1';
  const IDT='https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', STS='https://securetoken.googleapis.com/v1/token';
  const PROP_KEYS=['parlay','saved','stake','bookPrice','margin'];
  const POLL_MS=8000, PUSH_MS=400, BOOT_WAIT_MS=6000, GET_MS=12000, PUT_MS=20000, REVS=50, HIST=16, HIST_KEPT=4, RENEW_MS=5*60*1000;
  /* rev, revs, at, doc: the store's document as this device last saw it, read or written.
     hist: the documents it has read or written lately, by rev, oldest first: the bases a merge
     can start from. view: what the page shows, the store's document with this device's own
     changes merged in. xdoc: a reader's copy of X's document, in memory. blocks: why the owner's
     writes to each document are held ('signin', or 'refused' by a store this page cannot sign in
     to), the parlays' and the X Bet Log's apart: the store's rules can refuse one path and take
     the other, and a refusal of one must never hold the other. */
  const st={url:null, betsUrl:null, conf:{}, enforced:false, role:null, roleKnown:false, rev:null, revs:[], doc:null, hist:[], view:null,
    applied:false, live:false, ready:false, propRead:false, ok:null, err:null, at:null, checked:null, pending:false, pushing:false,
    blocks:{parlays:null, xbets:null}, joined:0, merged:0, recovered:0, pulls:0, pushes:0, xdoc:null, cached:null, ownerMsg:null, stripped:0, device:null, slipSig:null};
  const listeners=[];
  const emit=()=>{ for(const f of listeners){ try{ f(state()); }catch(e){} } };
  const state=()=>({url:st.url, role:st.role, enforced:st.enforced, signedIn:signedIn(), email:signedIn()?session().email||null:null,
    shareDeposit:!!st.conf.shareDeposit, rev:st.rev, applied:st.applied, live:st.live, ready:st.ready, ok:st.ok,
    err:st.err, at:st.at, checked:st.checked, pending:st.pending, pushing:st.pushing, blocked:st.blocks.parlays, blocks:Object.assign({},st.blocks), cached:st.cached,
    ownerMsg:st.ownerMsg, joined:st.joined, merged:st.merged, recovered:st.recovered, pulls:st.pulls, pushes:st.pushes, stripped:st.stripped});
  const ls={
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
  const parse=s=>{ try{ return s?JSON.parse(s):null; }catch(e){ return null; } };
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const newRev=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const union=(...a)=>[...new Set([].concat(...a))];
  const redraw=()=>{ try{ if(window.lpDraw) window.lpDraw(); }catch(e){} };

  /* the owner link: #owner=<secret>. Taken off the address at once, before any other script
     reads it and before the browser files it in its history; checked against ownerHash once
     sync.json is read */
  let LINK=null;
  try{ const m=String(location.hash||'').match(/^#(?:.*&)?owner=([^&]*)/);
    if(m){ try{ LINK=decodeURIComponent(m[1]||''); }catch(e){ LINK=m[1]||''; }
      try{ history.replaceState(null,'',location.pathname+location.search+'#parlay'); }catch(e){ location.hash='parlay'; } } }catch(e){}
  async function sha256(s){
    const c=window.crypto&&window.crypto.subtle;
    if(!c||typeof TextEncoder!=='function') throw new Error('this browser cannot check an owner link');
    const b=await c.digest('SHA-256',new TextEncoder().encode(String(s)));
    return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
  }
  function session(){ const v=parse(ls.get(SESSION_KEY)); return isObj(v)&&v.uid&&v.refreshToken?v:null; }
  function signedIn(){ const s=session(); return !!(st.enforced&&s&&s.uid===st.conf.owner); }
  function device(){ if(!st.device){ st.device=ls.get(DEVICE_KEY); if(!st.device){ st.device='d'+newRev(); ls.set(DEVICE_KEY,st.device); } } return st.device; }

  /* a document, or any part of one, cleaned: a copy whose strings and keys have lost < > " and `
     (no element, no way out of a quoted attribute), whose numbers are finite, and which nests no
     deeper than a parlay does (a betting slip's leg is six levels down) */
  const BAD=/[<>"`]/g;
  function clean(v,d){
    d=d|0;
    if(typeof v==='string') return v.replace(BAD,'');
    if(typeof v==='number') return isFinite(v)?v:null;
    if(v==null||typeof v==='boolean') return v;
    if(d>=12||typeof v!=='object') return null;
    if(Array.isArray(v)) return v.map(x=>clean(x,d+1));
    const o={};
    for(const k of Object.keys(v)){ const kk=k.replace(BAD,''); if(kk!=='__proto__') o[kk]=clean(v[k],d+1); }
    return o;
  }
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
  /* the betting model's parlay slips on this device (its Bet Build), as the section reads them */
  function mySlips(){
    const v=parse(ls.get(BET_KEY)), b=v&&v.bank&&Array.isArray(v.bank.build)?v.bank.build:[];
    return b.filter(x=>x&&x.type==='parlay'&&Array.isArray(x.legs)).map(x=>({id:String(x.id||''),week:+x.week||null,type:'parlay',stake:+x.stake||0,
      legs:x.legs.filter(l=>l&&l.game_id&&l.pick).map(l=>({game_id:String(l.game_id),away:String(l.away||''),home:String(l.home||''),pick:String(l.pick),
        ml:l.ml==null||!isFinite(+l.ml)?null:+l.ml}))})).filter(x=>x.legs.length>=2);
  }
  function localDoc(){
    const S_=typeof S==='object'&&S&&Array.isArray(S.saved)?S:parse(ls.get(PROP_KEY));
    const live=livePart(parse(ls.get(LIVE_KEY)));
    /* the owner's betting slips, this device's under its own id beside the other devices' */
    if(st.role==='owner'){ const bet=Object.assign({},isObj(live.bet)?live.bet:{}), mine=mySlips(), id=device();
      if(mine.length) bet[id]=mine; else delete bet[id];
      if(Object.keys(bet).length) live.bet=bet; else delete live.bet; }
    return clean({prop:propPart(S_), live}); }

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
    st.rev=b.rev; st.revs=Array.isArray(b.revs)?b.revs.map(String):[b.rev]; st.doc=clean({prop:propPart(b.doc.prop), live:livePart(b.doc.live)});
    for(const h of (Array.isArray(b.hist)?b.hist:[])) if(h&&h.rev&&isObj(h.doc)) know(String(h.rev),clean({prop:propPart(h.doc.prop), live:livePart(h.doc.live)}));
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

  /* ---- a reader's browser: what it took from the shared document goes, once ---- */
  /* the parlays and builder legs it took from these documents leave its own copy; its copy of
     the shared key goes, apart from lines corrected on a parlay that stays, which move to the
     visitor's own key. A browser that never mirrored the document keeps all of it as its own. */
  function stripMirror(docs,mirrored){
    const ids=new Set(), legs=new Set();
    for(const d of docs){ const p=(d&&d.prop)||{};
      for(const x of (Array.isArray(p.saved)?p.saved:[])) if(x&&x.id!=null) ids.add(String(x.id));
      for(const k of Object.keys(isObj(p.parlay)?p.parlay:{})) legs.add(k); }
    let n=0;
    const v=parse(ls.get(PROP_KEY));
    if(isObj(v)){
      if(Array.isArray(v.saved)){ const b=v.saved.length; v.saved=v.saved.filter(x=>!(x&&x.id!=null&&ids.has(String(x.id)))); n+=b-v.saved.length; }
      if(isObj(v.parlay)) for(const k of Object.keys(v.parlay)) if(legs.has(k)){ delete v.parlay[k]; n++; }
      ls.set(PROP_KEY,JSON.stringify(v)); }
    const lv=parse(ls.get(LIVE_KEY));
    if(isObj(lv)){ const my=parse(ls.get(MY_KEY)), out=isObj(my)?my:{};
      for(const k of ['lines','removed','kept']) out[k]=isObj(out[k])?out[k]:{};
      if(!mirrored){ for(const k of ['lines','removed','kept']) if(isObj(lv[k])) for(const [kk,x] of Object.entries(lv[k])) if(out[k][kk]===undefined) out[k][kk]=x; }
      else if(isObj(lv.lines)&&isObj(v)){ const keep=(Array.isArray(v.saved)?v.saved:[]).map(x=>'prop|'+x.id+'|');
        for(const [k,x] of Object.entries(lv.lines)) if(keep.some(p=>k.startsWith(p))&&out.lines[k]===undefined) out.lines[k]=x; }
      ls.set(MY_KEY,JSON.stringify(out)); }
    for(const k of [LIVE_KEY,SEEN_KEY,BASE_KEY]) ls.del(k);
    return {ids,legs,n};
  }
  /* the same, on the prop model's state in memory, once it is up */
  function stripLive(ids,legs){
    const go=()=>{ if(typeof S!=='object'||!S||!Array.isArray(S.saved)) return;
      const n=S.saved.length+Object.keys(isObj(S.parlay)?S.parlay:{}).length;
      S.saved=S.saved.filter(x=>!(x&&x.id!=null&&ids.has(String(x.id))));
      if(isObj(S.parlay)) for(const k of Object.keys(S.parlay)) if(legs.has(k)) delete S.parlay[k];
      if(S.saved.length+Object.keys(isObj(S.parlay)?S.parlay:{}).length!==n){
        try{ if(typeof save==='function') save(); }catch(e){} try{ if(typeof renderParlay==='function') renderParlay(); }catch(e){} } };
    if(st.ready) go(); else if(st.propRead) document.addEventListener('app-ready',go,{once:true});
  }
  /* once a browser (xparlays_v1); current is the store's document when it has been read */
  function migrateReader(current){
    if(ls.get(READER_KEY)!=null) return;
    const mirrored=shared(), docs=[];
    if(mirrored){
      const b=parse(ls.get(BASE_KEY));
      if(isObj(b)){ if(isObj(b.doc)) docs.push(b.doc); for(const h of (Array.isArray(b.hist)?b.hist:[])) if(h&&isObj(h.doc)) docs.push(h.doc); }
      if(current) docs.push(current);
      /* nothing known of the document it mirrored yet: wait for the store */
      if(!docs.length) return;
    }
    const r=stripMirror(docs,mirrored); stripLive(r.ids,r.legs); st.stripped+=r.n;
    ls.set(READER_KEY,JSON.stringify({at:new Date().toISOString(),dropped:r.n}));
  }
  /* a reader's copy of X's document, in memory, and the copy last seen for when the store is out of reach */
  function takeX(remote){
    st.xdoc=remote?{prop:propPart(remote.doc.prop), live:livePart(remote.doc.live)}:{prop:{}, live:livePart({})};
    st.rev=remote?remote.rev:null; st.at=remote?remote.at:null;
    st.applied=true; st.ok=true; st.err=null; st.cached=null; st.checked=new Date().toISOString();
    ls.set(CACHE_KEY,JSON.stringify({rev:st.rev, at:st.at, seen:st.checked, doc:st.xdoc}));
    redraw();
  }
  function loadCache(){
    if(st.xdoc) return;
    const c=parse(ls.get(CACHE_KEY));
    if(isObj(c)&&isObj(c.doc)){ st.xdoc=clean({prop:propPart(c.doc.prop), live:livePart(c.doc.live)}); st.at=c.at||null; st.cached=c.seen||c.at||'earlier'; redraw(); }
  }

  /* the address: nflbets/sync.json, read fresh every load. Blank means this browser only. */
  async function readConf(){
    try{
      const r=await fetchT(CONF+'?t='+Date.now(),null,GET_MS);
      if(!r.ok) throw new Error('HTTP '+r.status);
      const c=await r.json(), s=k=>String((c&&c[k])||'').trim();
      let u=s('url');
      if(u){ u=u.replace(/\.json$/,'').replace(/\/+$/,''); if(!/^https:\/\//.test(u)) throw new Error('the store address must start with https://'); }
      st.url=u||null;
      st.conf={ownerHash:s('ownerHash').toLowerCase(), apiKey:s('apiKey'), owner:s('owner'), shareDeposit:!!(c&&c.shareDeposit===true)};
      st.enforced=!!(st.conf.apiKey&&st.conf.owner);
      /* the X Bet Log's document: beside this one under the same parent, never inside it */
      const m=st.url&&st.url.match(/^(https:\/\/[^\/]+(?:\/[^\/]+)*)\/[^\/]+$/);
      st.betsUrl=m&&m[1]+'/xbets'!==st.url?m[1]+'/xbets':null;
    }catch(e){ st.url=null; st.betsUrl=null; st.err='sync.json: '+(e&&e.message||e); }
    return st.url;
  }
  /* whose device this is: the owner's by the owner link or by sign-in, everyone else's a reader */
  async function settleRole(){
    const c=st.conf; let soft=false;
    if(c.ownerHash){
      const secret=LINK!=null?LINK:ls.get(OWNER_KEY);
      if(secret){ try{ soft=(await sha256(secret))===c.ownerHash; }catch(e){ st.ownerMsg=String(e&&e.message||e); } }
      if(LINK!=null){ if(soft) ls.set(OWNER_KEY,LINK); else if(!st.ownerMsg) st.ownerMsg='that owner link does not match this site'; }
    } else if(LINK!=null) st.ownerMsg='this site has no owner link set up';
    LINK=null;
    st.role=soft||signedIn()?'owner':'reader';
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

  /* ---- the owner's token ---- */
  /* the ID token, renewed with the refresh token when it has under five minutes left (or when
     forced, after a refusal). A sign-in service that turns the refresh token down (revoked, the
     password changed, the account disabled) means signing in again: null, and the writes wait. */
  async function idToken(force){
    const s=session(); if(!s) return null;
    if(!force&&s.idToken&&+s.exp-Date.now()>RENEW_MS) return s.idToken;
    const r=await fetchT(STS+'?key='+encodeURIComponent(st.conf.apiKey),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(s.refreshToken)},GET_MS);
    let j=null; try{ j=await r.json(); }catch(e){}
    if(!r.ok||!j||!j.id_token){ if(r.status>=400&&r.status<500) return null; throw new Error('the sign-in service answered HTTP '+r.status); }
    Object.assign(s,{idToken:j.id_token, refreshToken:j.refresh_token||s.refreshToken, exp:Date.now()+(+j.expires_in||3600)*1000});
    ls.set(SESSION_KEY,JSON.stringify(s));
    return s.idToken;
  }
  /* a write to the store (the parlays' PUT, the X Bet Log's PATCH): with the owner's token on it
     when this device is signed in, renewed and tried once more on a refusal. A refusal that
     stands holds the owner's writes to that document (doc: 'parlays' or 'xbets') until the device
     is signed in again; the other document's writes go on. Nothing is lost, the change waits in
     the browser. */
  async function write(url,init,ms,doc){
    const which=doc==='xbets'?'xbets':'parlays';
    const go=tok=>fetchT(url+'.json?print=silent'+(tok?'&auth='+encodeURIComponent(tok):''),Object.assign({headers:{'Content-Type':'application/json'}},init),ms||PUT_MS);
    const refused=why=>{ st.blocks[which]=why; const e=new Error(why==='signin'?'sign in to publish':'the store refused the write'); e.auth=true; emit(); return e; };
    const signed=signedIn();
    let tok=signed?await idToken(false):null;
    if(signed&&!tok) throw refused('signin');
    let r=await go(tok);
    if((r.status===401||r.status===403)&&signed){ tok=await idToken(true); if(!tok) throw refused('signin'); r=await go(tok); }
    if(r.status===401||r.status===403) throw refused(st.enforced?'signin':'refused');
    if(!r.ok) throw new Error('HTTP '+r.status);
    if(st.blocks[which]){ st.blocks[which]=null; emit(); }
    return r;
  }

  /* read the whole document; null when the store is empty */
  async function pull(keepalive){
    if(!st.url) return null;
    const d=await getJSON('/doc.json',keepalive);
    if(d==null) return null;
    const doc=parse(typeof d.json==='string'?d.json:null);
    if(!isObj(doc)) throw new Error('the shared document is not readable');
    const rev=String(d.rev||'');
    /* cleaned on the way in, before anything merges it, keeps it or draws it */
    return {rev, at:typeof d.at==='string'?d.at.replace(BAD,''):null, revs:Array.isArray(d.revs)?d.revs.map(String):[rev], doc:clean({prop:propPart(doc.prop), live:livePart(doc.live)})};
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
    if(st.ready) redraw();
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
     the merge. Only a push in flight holds it back. A reader's poll takes X's document as it
     is, in memory. */
  /* a poll in flight is a time, not a flag: one that never comes back is forgotten after
     the requests inside it have all given up, so the next look is never blocked by it */
  let pollingSince=0;
  async function poll(){
    if(!st.url||!st.roleKnown||(pollingSince&&Date.now()-pollingSince<GET_MS*2+1000)) return; pollingSince=Date.now();
    try{
      if(st.role!=='owner'){
        const rev=await getJSON('/rev.json'); st.pulls++;
        if(revOf(rev)!==(st.rev||'')||!st.xdoc||st.cached){ const remote=await pull(); st.pulls++; takeX(remote); migrateReader(remote?remote.doc:null); }
        else { st.ok=true; st.err=null; st.checked=new Date().toISOString(); }
        emit();
      }
      else if(!st.applied){ const remote=await pull(); st.pulls++; apply(remote); }
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
    }catch(e){ st.ok=false; st.err=String(e&&e.message||e); if(st.role!=='owner') loadCache(); emit(); }
    pollingSince=0;
    slipCheck();
  }
  /* the owner's betting slips change in the betting tabs' frames: a change is pushed and drawn */
  function slipCheck(){
    if(st.role!=='owner'||!st.url) return;
    const sg=sig(mySlips()), first=st.slipSig===null;
    if(sg===st.slipSig) return;
    st.slipSig=sg;
    if(!first){ schedulePush(); redraw(); }
  }

  /* the push: what this browser has, whole, under a fresh rev -- once it has looked; the
     owner's devices only */
  let pushTimer=null;
  function schedulePush(){
    if(!st.url||!st.live||st.role!=='owner') return;
    st.pending=true; clearTimeout(pushTimer); pushTimer=setTimeout(push,PUSH_MS); emit();
  }
  /* leaving: the page is going to the background or away. It still looks before writing --
     a blind write from a page that has not looked for a while is exactly what erases another
     device's parlays -- with every request sent keepalive so it can finish after the page is
     gone. If it does not get as far as the write, the change waits in the browser for its next
     visit, which merges it. */
  async function push(leaving){
    clearTimeout(pushTimer);
    if(!st.url||!st.live||st.role!=='owner'){ st.pending=false; emit(); return false; }
    /* a write the store refused waits for a sign-in: trying again would be refused again */
    if(st.blocks.parlays){ st.pending=true; emit(); return false; }
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
        await write(st.url,{method:'PUT',keepalive,body:JSON.stringify({rev,at,doc:{rev,at,revs,json:JSON.stringify(doc)}})},PUT_MS,'parlays');
        st.rev=rev; st.revs=revs; st.at=at; st.doc=doc; st.view=deep(doc); know(rev,doc); st.pushes++; st.ok=true; st.err=null; st.pending=false; st.checked=at;
        remember(rev); keepBase(); ok=true;
      }
    }catch(e){ st.ok=false; st.err=String(e&&e.message||e); st.pending=true; clearTimeout(pushTimer); if(!(e&&e.auth)) pushTimer=setTimeout(push,POLL_MS); }
    st.pushing=false;
    /* something changed while the write was out: write again */
    if(ok&&st.doc&&!same(localDoc(),st.doc)) schedulePush();
    emit();
    return ok;
  }

  /* --- the hooks the two models save through --- */
  let booted=null, roleRes=null;
  const roleKnown=new Promise(r=>{ roleRes=r; });
  function boot(){
    if(booted) return booted;
    booted=(async()=>{
      await readConf();
      if(!st.url){ st.applied=true; st.live=false; st.ok=null; st.roleKnown=true; roleRes(); emit(); redraw(); return; }
      await settleRole(); st.roleKnown=true;
      if(st.role==='owner'){
        ls.del(READER_KEY); loadBase(); roleRes(); emit(); redraw();
        try{ const remote=await pull(); st.pulls++; apply(remote); }
        catch(e){ st.ok=false; st.err=String(e&&e.message||e); emit(); }
      } else {
        migrateReader(null); roleRes(); emit(); redraw();
        try{ const remote=await pull(); st.pulls++; takeX(remote); migrateReader(remote?remote.doc:null); }
        catch(e){ st.ok=false; st.err=String(e&&e.message||e); loadCache(); }
        emit();
      }
    })();
    return booted;
  }
  const settled=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);
  window.storage={
    /* the prop model's read at boot: on the owner's device the browser's copy with the shared
       keys laid over it, on anyone else's the browser's own. A store that will not answer holds
       the page for a few seconds at most. */
    async get(key){
      if(key===PROP_KEY){ await settled(boot(),BOOT_WAIT_MS); st.propRead=true; }
      const raw=ls.get(key);
      if(key!==PROP_KEY) return raw==null?null:{value:raw};
      const v=parse(raw);
      if(!isObj(v)) return raw==null?null:{value:raw};
      /* the shared keys as this browser kept them, cleaned (a copy taken from the store before it
         was cleaned on the way in), and on the owner's device the shared document's over them */
      Object.assign(v,clean(propPart(v)));
      if(st.role==='owner'&&st.view&&st.applied&&st.live) Object.assign(v,clean(st.view.prop));
      return {value:JSON.stringify(v)};
    },
    async set(key,value){
      if(!ls.set(key,String(value))) throw new Error('local storage refused the write');
      if(key===PROP_KEY) schedulePush();
    }
  };
  window.LIVE_IO={
    /* the owner's device: its copy of the shared key, written through to the store. Anyone
       else's: X's, as last read, which a reader cannot write */
    get(){ if(st.role==='owner'&&st.url){ const raw=ls.get(LIVE_KEY), v=parse(raw); return isObj(v)?JSON.stringify(clean(v)):raw; }
      return st.xdoc?JSON.stringify(st.xdoc.live):null; },
    set(v){ if(st.role!=='owner'||!st.url) return false; const ok=ls.set(LIVE_KEY,String(v)); schedulePush(); return ok; },
    writable(){ return st.role==='owner'&&!!st.url; }
  };
  /* X's parlays as this device has them: the owner's own state, or a reader's copy of the store's */
  function x(){
    if(st.role==='owner'&&st.url){ const d=localDoc(); return {prop:d.prop, live:d.live, at:st.at, own:true}; }
    return st.xdoc?{prop:deep(st.xdoc.prop), live:deep(st.xdoc.live), at:st.at, cached:st.cached}:null;
  }
  const reload=()=>{ try{ location.reload(); }catch(e){} };
  /* Firebase sign-in, email and password: the owner's uid only. A reader that signs in is
     reloaded as the owner's device; an owner's device whose sign-in lapsed writes what waited. */
  async function signIn(email,password){
    if(!st.enforced) throw new Error('sign-in is not set up: nflbets/sync.json needs apiKey and owner');
    const r=await fetchT(IDT+'?key='+encodeURIComponent(st.conf.apiKey),{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:String(email||'').trim(),password:String(password||''),returnSecureToken:true})},GET_MS);
    let j=null; try{ j=await r.json(); }catch(e){}
    if(!r.ok||!j||!j.idToken){ const code=String((j&&j.error&&j.error.message)||('HTTP '+r.status));
      throw new Error(/INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(code)?'wrong email or password':(/TOO_MANY/.test(code)?'too many tries: wait a while':code)); }
    if(String(j.localId)!==st.conf.owner) throw new Error('that account is not the owner of this site');
    ls.set(SESSION_KEY,JSON.stringify({uid:String(j.localId),email:j.email||String(email||''),refreshToken:j.refreshToken,idToken:j.idToken,exp:Date.now()+(+j.expiresIn||3600)*1000}));
    if(st.role==='owner'){ st.blocks={parlays:null, xbets:null}; emit(); schedulePush(); try{ if(window.XBETS&&window.XBETS.flush) window.XBETS.flush(); }catch(e){} return 'owner'; }
    reload(); return 'reload';
  }
  /* this browser stops being the owner's: what it has not written is written first, then its
     copy of X's parlays is taken out of its own, as on any reader's first visit, and it reloads */
  async function signOut(){
    if(st.role==='owner'&&st.pending&&!st.blocks.parlays){ try{ await push(); }catch(e){} }
    /* and the X Bet Log's weeks still to write, for as long as a look takes at most */
    try{ if(st.role==='owner'&&window.XBETS&&window.XBETS.flush) await settled(window.XBETS.flush(),GET_MS); }catch(e){}
    const docs=[st.doc,st.view].concat(st.hist.map(h=>h.doc)).filter(Boolean);
    ls.del(OWNER_KEY); ls.del(SESSION_KEY);
    const r=stripMirror(docs,true);
    st.role='reader'; st.live=false; st.pending=false; clearTimeout(pushTimer);
    stripLive(r.ids,r.legs);
    ls.set(READER_KEY,JSON.stringify({at:new Date().toISOString(),dropped:r.n,signedOut:true}));
    emit(); reload();
  }

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
  /* the betting tabs are frames of this page's origin: a slip saved in one is a storage event here */
  window.addEventListener('storage',e=>{ if(e&&e.key===BET_KEY) slipCheck(); });
  document.addEventListener('app-ready',()=>{ st.ready=true; boot().then(()=>{
    if(st.role==='owner'&&st.url&&st.applied&&st.live){
      if(st.view) show(st.view);
      slipCheck();
      /* an empty store takes what this browser already had, so a second device sees it */
      if(!st.doc||!same(localDoc(),st.doc)) schedulePush();
    }
    redraw();
    tick(); }); });

  return {state, poll, onChange(f){ listeners.push(f); }, role:()=>st.role, x, device,
    /* for the X Bet Log (xbets.js): the settings, when the role is known, the authorised write */
    conf:()=>({url:st.url, betsUrl:st.betsUrl, shareDeposit:!!st.conf.shareDeposit, enforced:st.enforced}),
    ready(){ boot(); return roleKnown; }, write, fetchT, signIn, signOut, betKey:BET_KEY};
})();
