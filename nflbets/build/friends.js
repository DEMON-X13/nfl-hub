/* Friends' picks on the Pick'em Record (the owner's call, 15 October 2026): each friend's Weekly
 * Picks, week by week, the same on every device, read only.
 *
 * It is a file in the repository, picks/friends.json, which Claude keeps from the Weekly Picks files
 * the owner sends (node picks/tools/add.js <file>) and every device reads on every load, never from
 * a cache:
 *
 *   {how, season, updated, friends:[{name, weeks:{w6:{saved_at, tiebreaker, picks:{<game_id>:{pick, saved_at}}}}}]}
 *
 * The betting app's frames reach it as parent.FRIENDS (a srcdoc frame is this page's origin), and
 * record_viz.js grades and draws it on the Pick'em Record: rows in the week-by-week grid, dashed
 * lines on the chart, columns in the pick grid. Nothing here writes the file, or anything at all.
 *
 * Everything read is cleaned before anything draws it: a name is plain text of 1-40 characters, a
 * week a whole number 1-22, a game id an nflverse id, a pick a team code, and saved_at a time. A file
 * for another season than the betting app's, a file that does not load or is not JSON, shows no
 * friends (status says why) and throws nothing. Whether a pick counts (saved before its kickoff) and
 * how it grades are record_viz.js's, against the schedule and finals in the frame's own state.
 *
 * window.FRIENDS, for the frames:
 *   ready()      a promise: the file has been read, or could not be (a few seconds at most)
 *   get()        {friends:[{name, weeks:{N:{saved_at, tiebreaker, picks:{gid:{pick, saved_at}}}}}], season, status:{ok, err, at, other}}
 *   onChange(f)  f() when the file arrives after a frame has asked for it
 */
window.FRIENDS=(function(){
  /* the betting app's season: the build writes it over this default */
  const SEASON=/*SEASON*/2026;
  const URL='picks/friends.json', READY_MS=6000;
  const st={friends:[], at:null, other:null, ok:null, err:null};
  const listeners=[];
  const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const GID=/^\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/, TEAM=/^[A-Z]{2,3}$/;
  const when=s=>typeof s==='string'&&isFinite(Date.parse(s))?new Date(Date.parse(s)).toISOString():null;
  const name=n=>{ if(typeof n!=='string') return null; const t=n.trim().replace(/\s+/g,' '); return t&&t.length<=40&&!/[<>&"`]/.test(t)?t:null; };
  function cleanWeek(v){
    if(!isObj(v)||!isObj(v.picks)) return null;
    const picks={};
    for(const [gid,p] of Object.entries(v.picks)){
      if(!GID.test(gid)||!isObj(p)||!TEAM.test(p.pick||'')) continue;
      const at=when(p.saved_at); if(!at) continue;
      picks[gid]={pick:p.pick, saved_at:at}; }
    if(!Object.keys(picks).length) return null;
    const tb=isObj(v.tiebreaker)&&GID.test(v.tiebreaker.game_id||'')&&Number.isInteger(v.tiebreaker.total_points)&&v.tiebreaker.total_points>=0
      ?{game_id:v.tiebreaker.game_id,total_points:v.tiebreaker.total_points}:null;
    return {saved_at:when(v.saved_at), tiebreaker:tb, picks};
  }
  function clean(d){
    const out=[], seen=new Set();
    for(const f of Array.isArray(d.friends)?d.friends:[]){
      const n=isObj(f)&&name(f.name); if(!n||seen.has(n.toLowerCase())||!isObj(f.weeks)) continue;
      const weeks={};
      for(const [k,v] of Object.entries(f.weeks)){ const w=+String(k).replace(/^w/,''); if(!Number.isInteger(w)||w<1||w>22) continue;
        const c=cleanWeek(v); if(c) weeks[w]=c; }
      if(!Object.keys(weeks).length) continue;
      seen.add(n.toLowerCase()); out.push({name:n, weeks}); }
    return out;
  }
  let readP=null;
  function read(){
    if(!readP) readP=(async()=>{
      try{
        const r=await fetch(URL+'?t='+Date.now(),{cache:'no-store'});
        if(!r.ok) throw new Error('HTTP '+r.status);
        const d=await r.json();
        if(!isObj(d)) throw new Error("the file is not the friends' picks");
        const season=+d.season;
        st.other=season!==SEASON?(season||'none'):null;
        st.friends=st.other?[]:clean(d);
        st.at=when(d.updated); st.ok=true; st.err=null;
      }catch(e){ st.friends=[]; st.ok=false; st.err=String(e&&e.message||e); }
      for(const f of listeners){ try{ f(); }catch(e){} }
    })();
    return readP;
  }
  read();
  return {
    ready(){ return Promise.race([read(),new Promise(r=>setTimeout(r,READY_MS))]); },
    get(){ return {friends:JSON.parse(JSON.stringify(st.friends)), season:SEASON, status:{ok:st.ok, err:st.err, at:st.at, other:st.other}}; },
    onChange(f){ listeners.push(f); },
    season:SEASON };
})();
