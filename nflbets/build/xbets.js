/* The X Bet Log: X's week-by-week bets, the same on every device, read only.
 *
 * It is a file in the repository, liveparlays/xbets.json, beside X's placed parlays, which Claude
 * edits from what the owner sends (the week, what was staked, what came back) and every device
 * reads on every load, never from a cache:
 *
 *   {how, season, updated, deposit, weeks:{w1:{staked, returned, note}, ...}}
 *
 * The betting app's frames reach it as parent.XBETS (a srcdoc frame is this page's origin):
 * betting/tools/build.js's hook lays the weeks and the deposit into the app's S.bets and S.bank,
 * keeps the frame read only, and leaves this browser's own Bet Log in the app's key exactly as it
 * was, never shown. Nothing here writes the file, or anything but this browser's storage.
 *
 * Everything read is cleaned before anything draws it: a week is a whole number 1-22, what was
 * staked and what came back are numbers of 0 or more, a note is plain text without angle brackets,
 * 140 characters at most, and the deposit is a number of 0 or more, or none. A file for another
 * season than the betting app's shows no weeks (status.other says which season it holds).
 *
 * Once the file has been read, what the retired shared store left of the X Bet Log in this browser
 * goes: its last copy of the log (xbets_cache_<season>), the mark that the browser's weeks had moved
 * in (xbets_joined_<season>), and a week that never reached the store (xbets_pending_<season>) when
 * the file has that week as it was written; a pending week the file does not have stays where it
 * is, unread. This browser's own log (the app's key) and the copy kept aside when the log was
 * shared (x_nfl_bets_preshare_<season>) stay.
 *
 * window.XBETS, for the frames:
 *   enabled()    true: the page has an X Bet Log
 *   ready()      a promise: the file has been read, or could not be (a few seconds at most)
 *   get()        {weeks:{N:{staked,returned,note}}, deposit, season, status:{applied, ok, err, at, other}}
 *   onChange(f)  f() when the file arrives after a frame has asked for it
 */
window.XBETS=(function(){
  /* the betting app's season: the build writes it over this default */
  const SEASON=/*SEASON*/2026;
  const URL='../liveparlays/xbets.json', READY_MS=6000;
  const CACHE='xbets_cache_'+SEASON, JOINED='xbets_joined_'+SEASON, PENDING='xbets_pending_'+SEASON;
  const st={weeks:{}, deposit:null, at:null, other:null, applied:false, ok:null, err:null};
  const listeners=[];
  const ls={
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
  const parse=s=>{ try{ return s?JSON.parse(s):null; }catch(e){ return null; } };
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);

  /* ---- cleaned on the way in ---- */
  const cents=x=>Math.round(x*100)/100;
  function cleanWeek(v){
    if(!isObj(v)) return null;
    const s=+v.staked, r=+v.returned;
    if(!isFinite(s)||s<0||!isFinite(r)||r<0) return null;
    return {staked:cents(s), returned:cents(r), note:String(v.note==null?'':v.note).replace(/[<>]/g,'').slice(0,140)};
  }
  /* {w3:{...}} as the file keeps it, {3:{...}} as the app keeps it, or an array by week: always {3:{...}} */
  function cleanWeeks(o){
    const out={};
    const put=(k,v)=>{ const n=+String(k).replace(/^w/,''); if(!Number.isInteger(n)||n<1||n>22) return; const c=cleanWeek(v); if(c) out[n]=c; };
    if(Array.isArray(o)) o.forEach((v,i)=>put(i,v));
    else if(isObj(o)) for(const k of Object.keys(o)) put(k,o[k]);
    return out;
  }
  const cleanDep=v=>v==null||v===''||!isFinite(+v)||+v<0?null:cents(+v);

  /* the retired store's leftovers, once the file is in: a week waiting to be written goes when the
     file has it as it was written (or a removed week the file does not have) */
  function tidy(){
    ls.del(CACHE); ls.del(JOINED);
    const p=parse(ls.get(PENDING)), ops=isObj(p)&&isObj(p.ops)?p.ops:null;
    if(!ops){ ls.del(PENDING); return; }
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const done=Object.entries(ops).every(([k,v])=>{ const m=k.match(/^weeks\/w(\d+)$/);
      if(m) return v==null?!st.weeks[+m[1]]:same(cleanWeek(v),st.weeks[+m[1]]||null);
      if(k==='bank/deposit') return cleanDep(v)===st.deposit;
      return false; });
    if(done) ls.del(PENDING);
  }

  let readP=null;
  function read(){
    if(!readP) readP=(async()=>{
      try{
        const r=await fetch(URL+'?t='+Date.now(),{cache:'no-store'});
        if(!r.ok) throw new Error('HTTP '+r.status);
        const d=await r.json();
        if(!isObj(d)) throw new Error('the file is not the X Bet Log');
        const season=+d.season;
        st.other=season&&season!==SEASON?season:null;
        st.weeks=st.other?{}:cleanWeeks(d.weeks);
        st.deposit=st.other?null:cleanDep(d.deposit);
        st.at=typeof d.updated==='string'?d.updated.replace(/[<>"`]/g,''):null;
        st.applied=true; st.ok=true; st.err=null;
        if(!st.other) tidy();
      }catch(e){ st.ok=false; st.err=String(e&&e.message||e); }
      for(const f of listeners){ try{ f(); }catch(e){} }
    })();
    return readP;
  }
  read();
  return {
    enabled:()=>true,
    ready(){ return Promise.race([read(),new Promise(r=>setTimeout(r,READY_MS))]); },
    get(){ return {weeks:JSON.parse(JSON.stringify(st.weeks)), deposit:st.deposit, season:SEASON,
      status:{applied:st.applied, ok:st.ok, err:st.err, at:st.at, other:st.other}}; },
    onChange(f){ listeners.push(f); },
    season:SEASON };
})();
