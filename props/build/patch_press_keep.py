r"""app v108: a Refresh odds read stays in this browser across a reload, until its game kicks off or the
job publishes newer prices for it.

The owner, 15 October 2026: "anytime i load the site all the odds disappear and i have to click the
button to grab them again. is there any way to make sure it stays on the site when i pulled them and
let me refresh as needed after". Until now (app v107) a press's read lived in the page's memory only and
a reload went back to the published prices. Now each press writes what it read, as the reader keeps it,
to this browser's own storage under a key of its own (ESPN_KEEP_KEY, 'props_press_v1'; never S, never
save(), the season inside the value), and a load puts it back before the page is first drawn, with no
request to ESPN. Game by game, each half on its own rule:

- DraftKings' game lines (the scoreboard's lines, ids and event) stand while the game lines the page
  publishes are the ones the read was taken over (espnGlSig, a hash of the published moneylines,
  spreads, total, their prices and source): a publish that moved any of them is newer and wins.
- DraftKings' player lines (the block ESPN_LIVE holds for the game) stand while the game's published
  player prices are the ones the read was taken over (espnPlSig: the paid pull's time for the game,
  PAY.dk's at, and every main line PAY.mkt carries for it): a pull since is newer and wins. A game whose
  player prices are never bought (Sunday's early games) keeps its read to kickoff.
- Neither stands once the game has kicked off or has a score, for a game the schedule does not have in
  that week, or from a value that is not what the page writes or is of another season (the key is then
  emptied). baked_at is never compared: the job rebakes several times a day with the same prices.

What is kept is what the page shows after every read of the load: a game's lines where a read's stand
(a read the page left off, older than the published lines, keeps none), every DraftKings id a read gave or
found with the time of that read, and the player lines' block; a time after the page's clock is not one
the page wrote, and that half is dropped. What gave way to a publish is said once on the status line ("your
earlier Refresh odds read gave way to prices published since"), for that page load. A press reads again
over what stands, as before, and every write is merged with what the browser holds game by game, the
later read winning (two tabs) and a half it lacks taken from the other, never bringing back what a load
set aside. A save of the visitor's own state that fails for room empties the
key first and tries again (espnKeepDrop), so a kept read never costs anyone their builder; the reads are
then held in memory only for the rest of that load.

The read is the visitor's, like their builder: it is never sent anywhere, and the published data still
wins over it on every load. Nothing else about a press changes: the precedence of the paid pull's price
while its line stands, the formula's estimate, the est. marks, what the levels and hands may take.

And one fix the review of the three Thursday parlays found: toggleLeg's paid main-line branch kept the k
it was given while it labelled and priced the leg at the paid line, so a leg given another number named
one line and looked its DraftKings id up under another; it now takes the paid line's number, as the
dkline branch takes the read's.

Every edit is made in memory and asserted to match exactly as often as expected; nothing is written
unless all of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}

BS = chr(92)   # the parts write non-ASCII as JS escapes; ~uXXXX here stands for one


def sub(k, old, new, n=1):
    old, new = old.replace('~u', BS + 'u'), new.replace('~u', BS + 'u')
    s = T[k]
    assert s.count(old) == n, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub('p2', r"const APP_BUILD='app v107 ~u00b7 2026-10-15';", r"const APP_BUILD='app v108 ~u00b7 2026-10-16';")

# save(): a kept read gives way to the visitor's own state when there is no room for both
sub('p2', """/* (app v107) a Refresh odds press puts DraftKings' game lines into S.sched in memory: espnSavable (part3.js)
   writes the published ones in their place, so nothing a press read is ever saved */
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{ const r=await store.set(typeof espnSavable==='function'?espnSavable(S):S);
  $('saveState').textContent = r==='saved'?'Autosaved':'Not saved: export a backup'; },300); }""",
    """/* (app v107) a Refresh odds press puts DraftKings' game lines into S.sched in memory: espnSavable (part3.js)
   writes the published ones in their place, so nothing a press read is ever saved with S. (app v108) The
   read is kept under its own key (espnKeepWrite); where S cannot be saved for room, that key is emptied
   and S saved again, so a kept read never costs the visitor their own state */
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{ const v=typeof espnSavable==='function'?espnSavable(S):S; let r=await store.set(v);
  if(r!=='saved'&&typeof espnKeepDrop==='function'&&espnKeepDrop()) r=await store.set(v);
  $('saveState').textContent = r==='saved'?'Autosaved':'Not saved: export a backup'; },300); }""")

# boot: the kept read put back before the first draw
sub('p3', """  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  { const bt=$('buildTag'); if(bt) bt.textContent=`${MODEL_BUILD} \\u00b7 ${APP_BUILD}`; }
  renderAll(); pbWatch(); pbRecLoad();""",
    """  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  /* (app v108) a Refresh odds read this browser kept, where it still stands: before the first draw, no request */
  try{ espnRestore(); }catch(e){ console.error(e); }
  { const bt=$('buildTag'); if(bt) bt.textContent=`${MODEL_BUILD} \\u00b7 ${APP_BUILD}`; }
  renderAll(); pbWatch(); pbRecLoad();""")

# the design note
sub('p3', """   What a press changes is held in memory only, outside S, so a reload returns to the published data (a
   leg it priced in the builder too, espnLegBack):""",
    """   What a press changes is held in memory, outside S, and (app v108) kept in this browser under a key of
   its own until it gives way (espnKeepWrite, espnRestore, below), so a reload puts it back where it still
   stands and returns to the published data where it does not (a leg it priced in the builder too,
   espnLegBack):""")

# espnApplyGame: a restore compares with the published DraftKings pull's time alone
sub('p3', """/* a game's lines from a read at time at, where it is newer than what the page has, and its DraftKings
   ids beside the paid pull's; true where anything moved */
function espnApplyGame(g,odds,at){
  if(!odds) return false; let ch=false;
  const L=odds.lines, prev=ESPN_GL[g.id]?ESPN_GL[g.id].at:(Date.parse(g.lat||'')||Date.parse((PAY&&PAY.baked_at)||'')||0);""",
    """/* a game's lines from a read at time at, where it is newer than what the page has, and its DraftKings
   ids beside the paid pull's; true where anything moved. since (app v108, a kept read put back) stands
   in for the published lines' time: the DraftKings pull's own, never baked_at, which moves on every bake */
function espnApplyGame(g,odds,at,since){
  if(!odds) return false; let ch=false;
  const L=odds.lines, prev=ESPN_GL[g.id]?ESPN_GL[g.id].at:(since!=null?since:(Date.parse(g.lat||'')||Date.parse((PAY&&PAY.baked_at)||'')||0));""")

# the press: each game's scoreboard odds kept for the write, the write before the press is done
sub('p3', """        if(espnApplyGame(g,espnOdds(ev,g),sbAt)) changed=true;
        reads.push({g,ev,ko,eid:String(ev.id||'')}); }""",
    """        const od=espnOdds(ev,g); if(espnApplyGame(g,od,sbAt)) changed=true; if(od) gls[g.id]={at:sbAt,od};
        reads.push({g,ev,ko,eid:String(ev.id||'')}); }""")
sub('p3', """  ESPN_RUN={busy:true,gid:gid||null,week:w,total:games.length,done:0,requests:0,clock:false};
  espnPaint();
  const out={}; let changed=false;""",
    """  ESPN_RUN={busy:true,gid:gid||null,week:w,total:games.length,done:0,requests:0,clock:false};
  espnPaint();
  const out={}, gls={}; let changed=false;""")
sub('p3', """    const now=Date.now(); for(const id in out) ESPN_OUT[id]={...out[id],block:undefined,when:now};
    ESPN_RUN={...ESPN_RUN,busy:false,done:ESPN_RUN.total};""",
    """    const now=Date.now(); for(const id in out) ESPN_OUT[id]={...out[id],block:undefined,when:now};
    /* (app v108) kept in this browser before the press is done */
    try{ espnKeepPut(w,games,gls); }catch(e){ console.error(e); }
    ESPN_RUN={...ESPN_RUN,busy:false,done:ESPN_RUN.total};""")

# the keeping itself, after espnSavable
sub('p3', """/* any read for a week's games (or this week's), and the latest read time (ms) */
function espnOn(week){""",
    r"""/* ---------- (app v108) the read kept in this browser ----------
   ESPN_KEEP_KEY holds {v:1, season, saved, games:{gid:{w, gl, pl, plsig, out}}}: gl the game's lines as
   the page shows them after every read of the load (lines, only where a read's stand; at, the read they
   stand on), every DraftKings id a read gave or found with the time it was read (ids, idat; glat where a
   read set it) and the event, and sig, espnGlSig then; pl the player lines' block as ESPN_LIVE keeps it,
   plsig espnPlSig then, out what the read found ('ok' or 'none' only: a failure is the press's moment,
   not the read's). A time after the page's clock is not one the page wrote: that half is dropped. A load puts each half back while what
   it was read over is still what the page publishes (espnRestore); ESPN_ASIDE says, for that load, what
   gave way; ESPN_KEEP_GONE keeps a write from bringing it back from another tab's copy */
const ESPN_KEEP_KEY='props_press_v1';
let ESPN_KEPT={}, ESPN_ASIDE={}, ESPN_KEEP_GONE={}, ESPN_KEEP_OFF=false;
const ESPN_KEEP_ID=/^[A-Za-z0-9#_.\-]{1,160}$/, ESPN_KEEP_PID=/^(?!__proto__$)[A-Za-z0-9_.:\-]{1,40}$/;
const ESPN_KEEP_IDKEY=/^(team:[A-Z]{2,3}\|(ml|ats\|-?\d+(\.\d+)?)|game\|total\|(over|under)\|\d+(\.\d+)?)$/;
const ESPN_KEEP_STATS=new Set([...Object.values(ESPN_MAIN),...Object.values(ESPN_MILE)]);
function espnHash(s){ let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return h.toString(16); }
/* the game lines the page publishes for g (a press's own are kept aside in ESPN_GL) */
function espnGlSig(g){ const o=ESPN_GL[g.id]?ESPN_GL[g.id].orig:g; return espnHash(ESPN_GL_KEYS.map(k=>o[k]==null?'':String(o[k])).join('|')); }
/* g's published player prices: the paid pull's time for it and every main line the payload carries for it */
function espnPlSig(g){
  const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, D=W&&W[g.id], M=PAY&&PAY.mkt&&typeof PAY.mkt==='object'?PAY.mkt[String(g.w)]:null, rows=[];
  if(M&&typeof M==='object') for(const pid of Object.keys(M).sort()){ const r=M[pid]; if(r&&typeof r==='object') for(const st of Object.keys(r).sort()){ const L=r[st]; if(L&&L.g===g.id) rows.push([pid,st,L.line,L.over,L.under].join(',')); } }
  return espnHash(String(D&&D.at||'')+'|'+rows.join(';'));
}
const espnKeepNum=x=>typeof x==='number'&&isFinite(x);
/* one game's kept entry as the page writes it, or null: everything else in it dropped */
function espnKeptGame(e){
  if(!e||typeof e!=='object'||Array.isArray(e)) return null;
  const w=String(e.w); if(!/^\d{1,2}$/.test(w)) return null;
  const o={w}, late=Date.now()+60e3, when=t=>espnKeepNum(t)&&t>0&&t<=late;
  const gl=e.gl;
  if(gl&&typeof gl==='object'&&when(gl.at)&&typeof gl.sig==='string'&&gl.lines&&typeof gl.lines==='object'){
    const lines={}, ids={}, idat={};
    for(const k of ['mla','mlh','sp','spa','sph','tot','tov','tou']) if(espnKeepNum(gl.lines[k])) lines[k]=gl.lines[k];
    if(gl.ids&&typeof gl.ids==='object') for(const k of Object.keys(gl.ids)) if(ESPN_KEEP_IDKEY.test(k)&&typeof gl.ids[k]==='string'&&ESPN_KEEP_ID.test(gl.ids[k])){
      ids[k]=gl.ids[k]; if(gl.idat&&typeof gl.idat==='object'&&when(gl.idat[k])) idat[k]=gl.idat[k]; }
    const event=typeof gl.event==='string'&&/^\d{1,15}$/.test(gl.event)?gl.event:null;
    const glat=typeof gl.glat==='string'&&when(Date.parse(gl.glat))?gl.glat:null;
    if(Object.keys(lines).length||Object.keys(ids).length||event) o.gl={at:gl.at,lines,ids,idat,glat,event,sig:gl.sig}; }
  const b=e.pl;
  if(b&&typeof b==='object'&&typeof b.at==='string'&&when(Date.parse(b.at))&&typeof e.plsig==='string'){
    const lines={}, rungs={}, td=[];
    if(b.lines&&typeof b.lines==='object') for(const pid of Object.keys(b.lines)){ const m=b.lines[pid]; if(!ESPN_KEEP_PID.test(pid)||!m||typeof m!=='object') continue;
      const s={}; for(const st of Object.keys(m)) if(ESPN_KEEP_STATS.has(st)&&espnKeepNum(m[st])&&m[st]>0) s[st]=m[st]; if(Object.keys(s).length) lines[pid]=s; }
    if(b.rungs&&typeof b.rungs==='object') for(const pid of Object.keys(b.rungs)){ const m=b.rungs[pid]; if(!ESPN_KEEP_PID.test(pid)||!m||typeof m!=='object') continue;
      const s={}; for(const st of Object.keys(m)) if(ESPN_KEEP_STATS.has(st)&&Array.isArray(m[st])){ const r=[...new Set(m[st].filter(v=>espnKeepNum(v)&&v>0))].sort((x,y)=>x-y); if(r.length) s[st]=r; }
      if(Object.keys(s).length) rungs[pid]=s; }
    if(Array.isArray(b.td)) for(const pid of b.td) if(typeof pid==='string'&&ESPN_KEEP_PID.test(pid)&&!td.includes(pid)) td.push(pid);
    o.pl={at:b.at,lines,rungs,td:td.sort()}; o.plsig=e.plsig; }
  else if(typeof e.plsig==='string') o.plsig=e.plsig;
  const u=e.out;
  if(u&&typeof u==='object'&&(u.st==='ok'||u.st==='none')) o.out={st:u.st,why:typeof u.why==='string'?u.why.slice(0,200):'',sb:false,when:espnKeepNum(u.when)?u.when:0};
  return o.gl||o.pl?o:null;
}
/* when an entry was read: its later half */
function espnKeptAt(e){ return Math.max(e&&e.gl?e.gl.at:0,e&&e.pl?(Date.parse(e.pl.at)||0):0); }
function espnKeepParse(raw){
  let v=null; try{ v=JSON.parse(raw); }catch(e){ return null; }
  return v&&typeof v==='object'&&v.v===1&&v.season===SEASON&&v.games&&typeof v.games==='object'&&!Array.isArray(v.games)?v:null;
}
/* what stands, written over what the browser holds, game by game: the later read wins, a game this load
   set aside or that has kicked off is left out; an empty set empties the key. A write the browser refuses
   empties it too: the reads are held in memory alone */
function espnKeepWrite(){
  if(ESPN_KEEP_OFF) return false;
  try{
    let cur=null; try{ cur=espnKeepParse(localStorage.getItem(ESPN_KEEP_KEY)); }catch(e){}
    const on=gid=>{ const g=((S&&S.sched)||[]).find(x=>x.id===gid); return !!g&&!gameStarted(g)&&!hasScore(g); }, games={}, theirs={};
    /* where one side's entry wins, a half it lacks is taken from the other (a press in one tab that read a
       game's lines and not its player lines never erases the player lines another tab read) */
    const fill=(to,from)=>{ if(!from||from.w!==to.w) return to; const r={...to};
      if(!r.gl&&from.gl) r.gl=from.gl;
      if(!r.pl&&from.pl){ r.pl=from.pl; r.plsig=from.plsig; if(from.out) r.out=from.out; else delete r.out; }
      return r; };
    if(cur) for(const gid of Object.keys(cur.games)){ const c=espnKeptGame(cur.games[gid]); if(!c||!on(gid)) continue;
      const mine=ESPN_KEPT[gid], t=espnKeptAt(c);
      if(t<=(ESPN_KEEP_GONE[gid]||0)) continue;
      theirs[gid]=c;
      if(t>(mine?espnKeptAt(mine):0)) games[gid]=fill(c,mine); }
    for(const gid of Object.keys(ESPN_KEPT)) if(!games[gid]&&on(gid)) games[gid]=fill(ESPN_KEPT[gid],theirs[gid]);
    if(!Object.keys(games).length){ localStorage.removeItem(ESPN_KEEP_KEY); return true; }
    localStorage.setItem(ESPN_KEEP_KEY,JSON.stringify({v:1,season:SEASON,saved:Date.now(),games}));
    return true;
  }catch(e){ try{ localStorage.removeItem(ESPN_KEEP_KEY); }catch(e2){} return false; }
}
/* a press's games and what it read for each (gls: the scoreboard's odds by game, with their time) */
function espnKeepPut(w,games,gls){
  for(const g of games){
    const prev=ESPN_KEPT[g.id], e=prev&&prev.w===String(w)?{...prev}:{w:String(w)}, o=ESPN_OUT[g.id], r=gls[g.id];
    /* the game's lines as the page shows them after every read of this load, only where a read's stand
       (ESPN_GL: a read the page left off, its lines older than the published ones, keeps none), and every
       id a read gave or found, with the time it was read: what a reload must put back */
    if(r){ const G=ESPN_GL[g.id], T=ESPN_IDAT[g.id]||{}, W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, D=(W&&W[g.id])||{};
      const lines={}; if(G) for(const k of ['mla','mlh','sp','spa','sph','tot','tov','tou']) if(espnKeepNum(g[k])) lines[k]=g[k];
      const ids={}, idat={}; for(const k of Object.keys(T)) if(typeof D[k]==='string'&&espnKeepNum(T[k])){ ids[k]=D[k]; idat[k]=T[k]; }
      e.gl={at:G?G.at:r.at,lines,ids,idat,glat:typeof D.glat==='string'?D.glat:null,event:r.od.event||(prev&&prev.gl&&prev.gl.event)||null,sig:espnGlSig(g)}; }
    const b=o&&o.st==='ok'?(ESPN_LIVE[String(w)]||{})[g.id]:null;
    e.plsig=espnPlSig(g);
    if(b) e.pl=b;
    if(o&&(o.st==='ok'||o.st==='none')) e.out={st:o.st,why:o.why||'',sb:false,when:o.when||0};
    if(e.gl||e.pl){ ESPN_KEPT[g.id]=e; delete ESPN_ASIDE[g.id]; }
  }
  return espnKeepWrite();
}
/* no room for the visitor's own state: the kept read gives way, for the rest of this load */
function espnKeepDrop(){
  try{ if(localStorage.getItem(ESPN_KEEP_KEY)==null) return false; localStorage.removeItem(ESPN_KEEP_KEY); ESPN_KEEP_OFF=true; return true; }catch(e){ return false; }
}
/* a kept read's DraftKings ids and event put back as its reads put them: beside the paid pull's, never
   replacing one, each dated by the read that gave or found it */
function espnKeepIds(g,gl){
  if(!gl.event&&!Object.keys(gl.ids).length) return;
  const D=PAY.dk&&typeof PAY.dk==='object'?PAY.dk:(PAY.dk={}), W=D[String(g.w)]||(D[String(g.w)]={}), E=W[g.id]||(W[g.id]={}), T=ESPN_IDAT[g.id]||(ESPN_IDAT[g.id]={});
  if(gl.event&&!E.event) E.event=gl.event;
  for(const k of Object.keys(gl.ids)){ if(E[k]==null) E[k]=gl.ids[k]; if(E[k]===gl.ids[k]) T[k]=gl.idat[k]||gl.at; }
  if(Object.keys(T).length&&!isFinite(Date.parse(E.glat))) E.glat=gl.glat||espnIso(Math.min(...Object.values(T)));
}
/* the kept read put back on a load, before the page is drawn and with no request: each game's game lines
   while its published game lines are the ones they were read over, its player lines while its published
   player prices are, neither once it has kicked off; the rest set aside (ESPN_ASIDE), and what stands
   written back. Nothing is touched with no schedule to stand on. The number of games put back */
function espnRestore(){
  let raw=null; try{ raw=localStorage.getItem(ESPN_KEEP_KEY); }catch(e){ return 0; }
  if(raw==null||!S||!Array.isArray(S.sched)||!S.sched.length) return 0;
  const v=espnKeepParse(raw);
  if(!v){ try{ localStorage.removeItem(ESPN_KEEP_KEY); }catch(e){} return 0; }
  let n=0;
  for(const gid of Object.keys(v.games)){
    const e=espnKeptGame(v.games[gid]), g=S.sched.find(x=>x.id===gid), t=e?espnKeptAt(e):0;
    const gone=()=>{ ESPN_KEEP_GONE[gid]=Math.max(ESPN_KEEP_GONE[gid]||0,t); };
    if(!e||!g||String(g.w)!==e.w||gameStarted(g)||hasScore(g)){ gone(); continue; }
    const k={w:e.w}, aside=(h,at)=>{ (ESPN_ASIDE[gid]||(ESPN_ASIDE[gid]={}))[h]=at; gone(); };
    if(e.gl){ if(e.gl.sig===espnGlSig(g)){ const lat=g.ls==='dk'?Date.parse(g.lat||''):NaN;
        espnApplyGame(g,{lines:e.gl.lines,ids:{},event:null},e.gl.at,isFinite(lat)?lat:0); espnKeepIds(g,e.gl); k.gl=e.gl; }
      else aside('gl',e.gl.at); }
    const plOk=e.plsig===espnPlSig(g);
    if(e.pl){ if(plOk){ (ESPN_LIVE[e.w]||(ESPN_LIVE[e.w]={}))[gid]=e.pl; k.pl=e.pl; } else aside('pl',Date.parse(e.pl.at)); }
    if(!k.gl&&!k.pl) continue;
    if(plOk){ k.plsig=e.plsig; if(e.out){ ESPN_OUT[gid]=e.out; k.out=e.out; } }
    ESPN_KEPT[gid]=k; n++;
  }
  espnKeepWrite();
  if(n) ESPN_SEQ++;
  return n;
}
/* any read for a week's games (or this week's), and the latest read time (ms) */
function espnOn(week){""")

# the status line: what gave way to a publish, said for that load
sub('p3', """  const when=PAY&&PAY.baked_at?' '+espnWhen(PAY.baked_at):'', pub=`Prices as published${when}`;
  if(!ids.some(id=>ESPN_OUT[id])&&!read.length&&!lined.length) return pub+'.';""",
    """  const when=PAY&&PAY.baked_at?' '+espnWhen(PAY.baked_at):'', pub=`Prices as published${when}`;
  /* (app v108) a read this browser kept that gave way wholly, on this load, to prices published since */
  const gave=ids.filter(id=>ESPN_ASIDE[id]&&!live[id]&&!ESPN_GL[id]).length, gaveS=gave?(gid?'your earlier Refresh odds read gave way to prices published since'
    :`your earlier Refresh odds read of ${gave} game${gave===1?'':'s'} gave way to prices published since`):'';
  if(!ids.some(id=>ESPN_OUT[id])&&!read.length&&!lined.length) return pub+(gaveS?'; '+gaveS:'')+'.';""")
sub('p3', """  if(of&&(read.length||lined.length)) parts.push('press Refresh odds here for the rest');""",
    """  if(gaveS) parts.push(gaveS);
  if(of&&(read.length||lined.length)) parts.push('press Refresh odds here for the rest');""")

# the button's title says it is kept
sub('p3', """title="Read DraftKings’ current lines for ${what} from ESPN now: free, in this browser, only when pressed. The game lines come with DraftKings’ own prices; a player’s price is our estimate from his line.">""",
    """title="Read DraftKings’ current lines for ${what} from ESPN now: free, in this browser, only when pressed, and kept in this browser until the game kicks off or newer prices are published. The game lines come with DraftKings’ own prices; a player’s price is our estimate from his line.">""")

# two comments that said the press's state is never kept
sub('p3', "/* the press's state: never in S, never saved */",
    "/* the press's state: never in S; kept under its own key until it gives way (app v108, below) */")
sub('p3', "   has one, else the model's estimate. So a reload returns the builder to the published prices too */",
    "   has one, else the model's estimate. So a reload that sets a read aside returns the builder to the published prices too */")

# toggleLeg: a paid main line's leg takes that line's number
sub('p3', """    if(M.src==='real'){ const L=M.L, pO=pOver(pl.grp,stat,pr.mu,L.line);
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;""",
    """    if(M.src==='real'){ const L=M.L, pO=pOver(pl.grp,stat,pr.mu,L.line); k=L.line;
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: app v108, a Refresh odds read kept in this browser until its game kicks off or newer prices are published')
