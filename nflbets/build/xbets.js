/* The X Bet Log: the owner's week-by-week bets, one copy for every device.
 *
 * The Bet Log used to be whatever the browser in front of you had logged (the betting app keeps
 * it in its own key, x_nfl_viewer_picks_<season>, beside picks and the Bet Build). Now it is X's:
 * logged on any of X's devices, and the same on every device that opens the page, where it is
 * read only. It lives in the same store as X's parlays, in a document of its own beside theirs
 * (<the parent of sync.json's url>/xbets/<season>), never inside /nflhub: a write of the parlays
 * replaces that whole node.
 *
 *   {rev, at, weeks:{w1:{staked, returned, note}, ...}, bank:{deposit}}
 *
 * Weeks are keyed w1..w22 (Firebase hands numbered keys back as an array). A write is a PATCH of
 * the weeks that changed and nothing else -- {"weeks/w3": {...}, "weeks/w5": null, rev, at} --
 * so two of X's devices logging different weeks both keep theirs, a removed week stays removed,
 * and a frame that loaded the log before another one changed it writes nothing it did not change
 * (the betting app saves its whole state on any click, and a stale frame used to put back a week
 * it never saw logged). Writes go through the sync layer's write(), so they carry the owner's
 * token when the device is signed in, exactly as the parlays do.
 *
 * Everything read is cleaned before anything draws it: a week is a whole number 1-22, what was
 * staked and what came back are numbers of 0 or more, and a note is plain text, no angle
 * brackets, 140 characters at most. The store answers whoever writes to it until its rules are
 * locked, and a note drawn into every visitor's frame must not be able to carry a script.
 *
 * The deposit is X's own unless nflbets/sync.json says "shareDeposit": true: then it is in the
 * document and every visitor sees the balance; otherwise visitors see the weeks and the profit
 * against break even, the owner's devices keep the deposit in their own browser, and an owner's
 * device removes one left in the document.
 *
 * Moving in: the first time a browser of X's reads the log (once a season, xbets_joined_<season>),
 * the weeks its own Bet Log has and the shared one lacks are added; a week both have with
 * different numbers keeps the shared one and is listed as differing. The browser's own log is
 * copied to x_nfl_bets_preshare_<season> the moment the device is known to be the owner's, before
 * any frame of the betting app can load, and the app's key keeps the browser's own weeks until they
 * have joined and the log has been read (the hook in betting/tools/build.js writes them back as
 * they were), so a store that is slow, down or not yet open to the X Bet Log loses nothing.
 *
 * A week written while the store would not take it (out of reach, or refusing until the device is
 * signed in) waits, in memory and in the browser (xbets_pending_<season>): it is laid over the log
 * this device shows, and written the next time the store answers, on this visit or the next one.
 * A refusal holds only the X Bet Log's writes; the parlays' go on (and the reverse).
 *
 * window.XBETS, for the betting app's frames (betting/tools/build.js reads it as parent.XBETS):
 *   enabled()          a store is set up for it
 *   ready()            a promise: the role is known and the log has been read once (or tried)
 *   get()              {weeks:{N:{staked,returned,note}}, deposit, owner, share, status}
 *   write(base, next)  the owner's devices only: what differs between the two, written
 *   onChange(f)        f() whenever the log, the owner flag or the status changes
 */
window.XBETS=(function(){
  const SEASON=/*SEASON*/2026;
  const MINE='x_nfl_viewer_picks_'+SEASON, PRE='x_nfl_bets_preshare_'+SEASON, JOINED='xbets_joined_'+SEASON, CACHE='xbets_cache_'+SEASON, PENDING='xbets_pending_'+SEASON;
  const POLL_MS=8000, GET_MS=12000, READY_MS=6000;
  const SYNC=window.NFLSYNC;
  const st={weeks:{}, deposit:null, rev:null, at:null, applied:false, ok:null, err:null, cached:null, pending:{}, flushing:null, readP:null, cleaned:false, joined:null, denied:false};
  const listeners=[];
  const emit=()=>{ for(const f of listeners){ try{ f(); }catch(e){} } };
  const ls={
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
  const parse=s=>{ try{ return s?JSON.parse(s):null; }catch(e){ return null; } };
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const conf=()=>SYNC?SYNC.conf():{url:null, betsUrl:null, shareDeposit:false};
  const enabled=()=>!!(conf().url&&conf().betsUrl);
  const isOwner=()=>!!SYNC&&SYNC.role()==='owner'&&enabled();
  const docUrl=()=>conf().betsUrl+'/'+SEASON;
  /* why the X Bet Log's writes are held on this device, if they are ('signin' or 'refused'): its
     own, apart from the parlays' */
  const blockedX=()=>{ if(!SYNC) return null; const s=SYNC.state(); return (s.blocks&&s.blocks.xbets)||null; };
  const settled=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);

  /* ---- cleaned on the way in and on the way out ---- */
  const cents=x=>Math.round(x*100)/100;
  function cleanWeek(v){
    if(!isObj(v)) return null;
    const s=+v.staked, r=+v.returned;
    if(!isFinite(s)||s<0||!isFinite(r)||r<0) return null;
    return {staked:cents(s), returned:cents(r), note:String(v.note==null?'':v.note).replace(/[<>]/g,'').slice(0,140)};
  }
  /* {w3:{...}} as stored, {3:{...}} as the app keeps it, or an array by week: always {3:{...}} */
  function cleanWeeks(o){
    const out={};
    const put=(k,v)=>{ const n=+String(k).replace(/^w/,''); if(!Number.isInteger(n)||n<1||n>22) return; const c=cleanWeek(v); if(c) out[n]=c; };
    if(Array.isArray(o)) o.forEach((v,i)=>put(i,v));
    else if(isObj(o)) for(const k of Object.keys(o)) put(k,o[k]);
    return out;
  }
  const cleanDep=v=>v==null||v===''||!isFinite(+v)||+v<0?null:cents(+v);
  const sameW=(a,b)=>JSON.stringify(a||null)===JSON.stringify(b||null);

  /* what the store holds, with this device's writes still on their way laid over it */
  let raw={weeks:{}, deposit:null};
  function applyOps(ops){
    for(const [p,v] of Object.entries(ops)){
      const m=p.match(/^weeks\/w(\d+)$/);
      if(m){ if(v==null) delete st.weeks[+m[1]]; else st.weeks[+m[1]]=cleanWeek(v); }
      else if(p==='bank/deposit') st.deposit=cleanDep(v);
      else if(p==='bank'&&v==null) st.deposit=null;
    }
  }
  function compose(){ st.weeks=Object.assign({},raw.weeks); st.deposit=raw.deposit; applyOps(st.pending); }
  /* the writes still to make, kept in the browser too: a tab closed before the store took them
     leaves them for the next visit, which lays them over the log and writes them */
  function keepPending(){ if(Object.keys(st.pending).length) ls.set(PENDING,JSON.stringify({at:new Date().toISOString(), ops:st.pending})); else ls.del(PENDING); }
  function loadPending(){
    const v=parse(ls.get(PENDING)), ops=isObj(v)&&isObj(v.ops)?v.ops:{}, out={};
    for(const [p,x] of Object.entries(ops)){
      const m=p.match(/^weeks\/w(\d+)$/);
      if(m){ const n=+m[1]; if(n<1||n>22) continue; if(x==null) out[p]=null; else { const c=cleanWeek(x); if(c) out[p]=c; } }
      else if(p==='bank/deposit') out[p]=cleanDep(x);
      else if(p==='bank'&&x==null) out[p]=null;
    }
    return out;
  }
  /* the owner's browser's own log, copied aside once a season the moment the device is known to
     be the owner's: before any frame can load, so whatever later happens to the app's key, the log
     this browser had before it shared is kept */
  function keepPre(){
    if(!isOwner()||ls.get(PRE)!=null||ls.get(JOINED)!=null) return;
    const mine=parse(ls.get(MINE))||{};
    ls.set(PRE,JSON.stringify({at:new Date().toISOString(), bets:isObj(mine.bets)?mine.bets:{}, deposit:cleanDep(mine.bank&&mine.bank.deposit)}));
  }

  async function getJSON(path){
    const r=await SYNC.fetchT(docUrl()+path+'?t='+Date.now(),null,GET_MS);
    if(!r.ok){ const e=new Error('HTTP '+r.status); e.status=r.status; throw e; }
    return r.json();
  }
  /* a read that failed: the store out of reach, or its rules not letting this page read the log */
  function readFailed(e){ st.ok=false; st.err=String(e&&e.message||e); st.denied=!!e&&(e.status===401||e.status===403); loadCache(); }
  async function read(){
    const d=await getJSON('.json');
    raw={weeks:cleanWeeks(d&&d.weeks), deposit:cleanDep(d&&d.bank&&d.bank.deposit)};
    const before=JSON.stringify([st.weeks,st.deposit,st.at,st.ok,st.cached]);
    st.rev=d&&d.rev?String(d.rev):null; st.at=d&&d.at||null;
    compose(); st.applied=true; st.ok=true; st.err=null; st.cached=null; st.denied=false;
    ls.set(CACHE,JSON.stringify({weeks:raw.weeks, deposit:conf().shareDeposit?raw.deposit:null, at:st.at, seen:new Date().toISOString()}));
    if(JSON.stringify([st.weeks,st.deposit,st.at,st.ok,st.cached])!==before) emit();
    if(isOwner()){
      /* a deposit left in the document after shareDeposit was turned off comes out of it */
      if(!conf().shareDeposit&&raw.deposit!=null&&!st.cleaned){ st.cleaned=true; patch({bank:null}); }
      migrate();
      /* what this device logged and could not write before (on this visit, or one before it) goes now */
      if(Object.keys(st.pending).length) flush();
    }
  }
  function loadCache(){
    if(st.applied||st.cached) return;
    const c=parse(ls.get(CACHE));
    if(isObj(c)){ raw={weeks:cleanWeeks(c.weeks), deposit:conf().shareDeposit?cleanDep(c.deposit):null}; st.at=c.at||null; st.cached=c.seen||'earlier'; compose(); }
  }
  /* the rev first, the whole log only when it moved; a write still to make is tried again */
  let pollingSince=0;
  async function poll(){
    if(!enabled()||(pollingSince&&Date.now()-pollingSince<GET_MS*2+1000)) return; pollingSince=Date.now();
    try{
      if(!st.applied) await read();
      else { const rev=await getJSON('/rev.json'); if(String(rev==null?'':rev)!==String(st.rev||'')) await read();
        else if(st.ok!==true){ st.ok=true; st.err=null; emit(); } }
    }catch(e){ const was=st.ok; readFailed(e); if(was!==false) emit(); }
    pollingSince=0;
    if(Object.keys(st.pending).length) flush();
  }
  let timer=null;
  function start(){
    if(timer||!enabled()) return;
    timer=setInterval(()=>{ if(document.visibilityState!=='hidden'&&(listeners.length||Object.keys(st.pending).length)) poll(); },POLL_MS);
  }
  function firstRead(){
    if(!st.readP) st.readP=(async()=>{ start(); try{ await read(); }catch(e){ readFailed(e); emit(); } })();
    return st.readP;
  }
  let readyP=null;
  function ready(){
    if(!readyP) readyP=(SYNC?SYNC.ready():Promise.resolve()).then(()=>enabled()?settled(firstRead(),READY_MS):null);
    return readyP;
  }

  /* ---- the owner's writes ---- */
  function patch(ops){ Object.assign(st.pending,ops); keepPending(); applyOps(ops); emit(); return flush(); }
  /* one write at a time: a second waits for the first, then sends what is still pending. A
     write that fails leaves its weeks pending, tried again on the next look. */
  function flush(){
    /* a write the store refused waits for a sign-in (the sync layer flushes again after one) */
    if(!isOwner()||blockedX()) return Promise.resolve(false);
    if(st.flushing) return st.flushing.then(()=>flush());
    if(!Object.keys(st.pending).length) return Promise.resolve(true);
    const p=send().then(ok=>{ st.flushing=null; return ok&&Object.keys(st.pending).length?flush():ok; });
    st.flushing=p; return p;
  }
  async function send(){
    const sent=Object.assign({},st.pending), keys=Object.keys(sent);
    const rev=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8), at=new Date().toISOString();
    let ok=false;
    try{
      await SYNC.write(docUrl(),{method:'PATCH',body:JSON.stringify(Object.assign({},sent,{rev,at}))},null,'xbets');
      /* what landed is the store's now; a key changed again while this was out stays to send */
      for(const k of keys){ if(JSON.stringify(st.pending[k])===JSON.stringify(sent[k])) delete st.pending[k]; const m=k.match(/^weeks\/w(\d+)$/);
        if(m){ if(sent[k]==null) delete raw.weeks[+m[1]]; else raw.weeks[+m[1]]=cleanWeek(sent[k]); }
        else if(k==='bank/deposit') raw.deposit=cleanDep(sent[k]); else if(k==='bank') raw.deposit=null; }
      keepPending();
      st.rev=rev; st.at=at; st.ok=true; st.err=null; ok=true;
    }catch(e){ st.ok=false; st.err=String(e&&e.message||e); }
    compose(); emit();
    return ok;
  }
  /* once a season on each of X's browsers: its own weeks join the shared log */
  let migrating=false;
  async function migrate(){
    if(migrating||!isOwner()||!st.applied||ls.get(JOINED)!=null) return;
    migrating=true;
    try{
      keepPre();
      const mine=parse(ls.get(MINE))||{}, own=cleanWeeks(mine.bets), dep=cleanDep(mine.bank&&mine.bank.deposit);
      const ops={}, added=[], differ=[];
      for(const w of Object.keys(own).map(Number).sort((a,b)=>a-b)){
        if(!raw.weeks[w]){ ops['weeks/w'+w]=own[w]; added.push(w); }
        else if(!sameW(raw.weeks[w],own[w])) differ.push(w); }
      if(conf().shareDeposit&&raw.deposit==null&&dep!=null) ops['bank/deposit']=dep;
      if(Object.keys(ops).length&&!(await patch(ops))) return;
      ls.set(JOINED,JSON.stringify({at:new Date().toISOString(), added, differ}));
      st.joined={added, differ};
    } finally { migrating=false; }
  }
  function write(base,next){
    if(!isOwner()||!st.applied) return false;
    const b=cleanWeeks(base&&base.bets), n=cleanWeeks(next&&next.bets), ops={};
    for(const w of new Set(Object.keys(b).concat(Object.keys(n)))) if(!sameW(b[w],n[w])) ops['weeks/w'+w]=n[w]||null;
    if(conf().shareDeposit&&cleanDep(base&&base.deposit)!==cleanDep(next&&next.deposit)) ops['bank/deposit']=cleanDep(next&&next.deposit);
    if(Object.keys(ops).length) patch(ops);
    return true;
  }
  function get(){
    const s=SYNC?SYNC.state():{};
    return {weeks:JSON.parse(JSON.stringify(st.weeks)), deposit:conf().shareDeposit?st.deposit:null, owner:isOwner(), share:!!conf().shareDeposit,
      status:{applied:st.applied, ok:st.ok, at:st.at, err:st.err, cached:st.cached, pending:Object.keys(st.pending).length>0,
        blocked:blockedX(), denied:st.denied, enforced:!!s.enforced, signedIn:!!s.signedIn, email:s.email||null,
        /* whether this browser's own weeks have joined X's log: this visit, or one before it */
        joined:st.joined||parse(ls.get(JOINED))}};
  }
  /* the owner's devices, on every load: the browser's own log copied aside (once), what waited from
     an earlier visit laid over the log, and the log read, to move their own weeks in and write what
     waited. This runs before any frame can ask for the log. */
  if(SYNC) SYNC.ready().then(()=>{ if(!isOwner()) return;
    keepPre();
    const waiting=loadPending();
    if(Object.keys(waiting).length){ st.pending=Object.assign(waiting,st.pending); compose(); }
    ready(); });
  /* the frames redraw when the device's standing changes (signed in, signed out, refused), not
     on every look the sync layer takes */
  let standing='';
  if(SYNC) SYNC.onChange(s=>{ const now=[s.role,s.blocks&&s.blocks.xbets,s.signedIn].join('|'); if(now!==standing){ standing=now; if(listeners.length) emit(); } });
  return {enabled, ready, get, write, flush, poll, onChange(f){ listeners.push(f); ready(); },
    signOut(){ return SYNC&&SYNC.signOut(); }, season:SEASON};
})();
