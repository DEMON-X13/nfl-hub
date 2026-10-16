r"""app v108: a Refresh odds read stays in this browser across a reload, until its game kicks off or the
job publishes newer prices for it.

The owner, 15 October 2026: "anytime i load the site all the odds disappear and i have to click the
button to grab them again. is there any way to make sure it stays on the site when i pulled them and
let me refresh as needed after". Until now (app v107) a press's read lived in the page's memory only and
a reload went back to the published prices. Now each press writes what it read, as the reader keeps it,
to this browser's own storage under a key of its own (ESPN_KEEP_KEY, 'props_press_v1'; never S, never
save(), the season inside the value), and a load puts it back before the page is first drawn, with no
request to ESPN. Game by game, each half on its own rule:

- DraftKings' game lines stand over the publish they were read over (espnGlSig, a hash of the game lines
  the page publishes: moneylines, spreads, total, their prices and source), or over a newer one where the
  read is later than that publish's own time for them (the DraftKings pull's, g.lat, where it carries
  DraftKings' lines; else the bake), each field by the time of the read that set it. So a publish newer
  than a read wins, and a read made after a publish, in a tab loaded before it, stands. The read times are
  the browser's clock and the publish's the job's: a browser clock far off moves the line between them,
  as it already did for a press (espnApplyGame compares the same two).
- DraftKings' player lines (the block ESPN_LIVE holds for the game) the same, over the game's published
  player prices (espnPlSig: the paid pull's time for the game, PAY.dk's at, and every main line PAY.mkt
  carries for it), their own time the paid pull's (else the bake). A game whose player prices are never
  bought (Sunday's early games) keeps its read to kickoff.
- Neither stands once the game has kicked off or has a score, for a game the schedule does not have in
  that week, or from a value that is not what the page writes or is of another season (the key is then
  emptied). baked_at alone never sets a read aside over the same lines: the job rebakes several times a
  day with the same prices.

What is kept is what the load's reads did: each game-line field a read set, with its value and the time
of that read, or dropped (a number read without its prices); every DraftKings id a read gave or found,
with the time of that read, and the event the page uses; and the player lines' block with what the last
read of them found. A reload replays that over the publish (espnKeepLines, espnKeepIds): over the publish
it was read over, exactly what the page showed; over a newer one, only the fields read after it, on their
numbers. A time after the page's clock is not one the page wrote, and that half is dropped; nor is a
player line off ESPN's half-point steps or past 1000. A read that found no player lines posted says so for
a day at most. A builder game leg added while a read is on its game keeps the price it was added at while its own
field stands among what the reads did, set or dropped (espnLegBack: its money line, spread or total
price), and goes to the publish's price on its number, or the estimate, where it does not (a reload over
a newer publish that put back only fields read after it). What gave way to a publish is said once on the status line ("your earlier Refresh odds read
gave way to prices published since"), for that page load. A press reads again over what stands, as
before, and every write is merged with what the browser holds half by half, each game's game lines and
its player half from whichever tab read them later (a read that found nothing never displacing one that
found lines, and the later block of the same publish kept), never bringing back what a load set aside; a tab open on an older publish carries another tab's read of a game it no longer offers as it
stands, and each load's restore prunes the copy on the publish it loads. A save of the visitor's own
state that fails for room empties the key first and tries again (espnKeepDrop), so a kept read never
costs anyone their builder; the reads are then held in memory only for the rest of that load.

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

# espnApplyGame keeps what each read did to the lines (ESPN_GL's d), which the keep writes and a reload replays
sub('p3', """    if(!ESPN_GL[g.id]) ESPN_GL[g.id]={orig:Object.fromEntries(ESPN_GL_KEYS.map(k=>[k,g[k]])),at:0};
    const set=(k,v)=>{ if(g[k]!==v){ g[k]=v; ch=true; } }, drop=k=>{ if(g[k]!==undefined){ delete g[k]; ch=true; } };""",
    """    if(!ESPN_GL[g.id]) ESPN_GL[g.id]={orig:Object.fromEntries(ESPN_GL_KEYS.map(k=>[k,g[k]])),at:0,d:{}};
    /* (app v108) d: each line field a read set, as [its value, the read's time], the value null where one dropped it */
    const D=ESPN_GL[g.id].d||(ESPN_GL[g.id].d={});
    const set=(k,v)=>{ if(k!=='ls'&&k!=='lat') D[k]=[v,at]; if(g[k]!==v){ g[k]=v; ch=true; } }, drop=k=>{ D[k]=[null,at]; if(g[k]!==undefined){ delete g[k]; ch=true; } };""")

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
   ESPN_KEEP_KEY holds {v:1, season, saved, games:{gid:{w, gl, pl, plsig, out}}}:
   gl  what the load's reads did to the game's lines: lines, each of the eight fields a read set, as
       [value, the time of that read], the value null where a read dropped it (ESPN_GL's d); at, the
       latest read the lines stand on; every
       DraftKings id a read gave or found with the time it was read (ids, idat; glat where a read set it);
       the event the page uses; and sig, espnGlSig then;
   pl  the player lines' block as ESPN_LIVE keeps it; plsig, espnPlSig then; out, what the last read of
       the player lines found ('ok' or 'none' only: a failure is the press's moment, not the read's).
   A load puts each half back where it still stands (espnRestore): over the publish it was read over, or
   over a newer one where the read is later than that publish's own time for the half (each game-line
   field by its own read's time). Times are the browser's clock against the job's: a browser clock far
   off moves the line between them, as it does for a press itself (espnApplyGame). ESPN_ASIDE says,
   for that load, what gave way; ESPN_KEEP_GONE ({gl, pl}: the times of the halves this load set aside)
   keeps a write from bringing one back from another tab's copy. A time after the page's clock is not one
   the page wrote: that half is dropped */
const ESPN_KEEP_KEY='props_press_v1';
let ESPN_KEPT={}, ESPN_ASIDE={}, ESPN_KEEP_GONE={}, ESPN_KEEP_OFF=false;
const ESPN_KEEP_GID=/^\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/, ESPN_KEEP_ID=/^[A-Za-z0-9#_.\-]{1,160}$/, ESPN_KEEP_PID=/^(?!__proto__$)[A-Za-z0-9_.:\-]{1,40}$/;
const ESPN_KEEP_IDKEY=/^(team:[A-Z]{2,3}\|(ml|ats\|-?\d+(\.\d+)?)|game\|total\|(over|under)\|\d+(\.\d+)?)$/;
const ESPN_KEEP_STATS=new Set([...Object.values(ESPN_MAIN),...Object.values(ESPN_MILE)]);
const ESPN_KEEP_LINES=['mla','mlh','sp','spa','sph','tot','tov','tou'], ESPN_KEEP_PRICE=new Set(['spa','sph','tov','tou']);
const espnOwn=(x,k)=>!!x&&Object.prototype.hasOwnProperty.call(x,k);
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
/* a player's line or rung as ESPN lists them: on a half point, under 1000 (a number past that would never be
   DraftKings' and would hold a game page's ladder up) */
const espnKeepLine=x=>espnKeepNum(x)&&x>0&&x<=1000&&Number.isInteger(x*2);
/* one game's kept entry as the page writes it, or null: everything else in it dropped */
function espnKeptGame(e){
  if(!e||typeof e!=='object'||Array.isArray(e)) return null;
  const w=String(e.w); if(!/^\d{1,2}$/.test(w)) return null;
  const o={w}, late=Date.now()+60e3, when=t=>espnKeepNum(t)&&t>0&&t<=late;
  const gl=e.gl;
  if(gl&&typeof gl==='object'&&when(gl.at)&&typeof gl.sig==='string'&&gl.lines&&typeof gl.lines==='object'){
    const lines={}, ids={}, idat={};
    for(const k of ESPN_KEEP_LINES){ const x=espnOwn(gl.lines,k)?gl.lines[k]:undefined;
      /* a read drops only a price (a number read without its prices): never a money line, spread or total */
      if(Array.isArray(x)&&x.length===2&&(x[0]===null?ESPN_KEEP_PRICE.has(k):espnKeepNum(x[0]))&&when(x[1])&&x[1]<=gl.at) lines[k]=[x[0],x[1]]; }
    if(gl.ids&&typeof gl.ids==='object') for(const k of Object.keys(gl.ids)) if(ESPN_KEEP_IDKEY.test(k)&&typeof gl.ids[k]==='string'&&ESPN_KEEP_ID.test(gl.ids[k])){
      ids[k]=gl.ids[k]; if(gl.idat&&typeof gl.idat==='object'&&when(gl.idat[k])) idat[k]=gl.idat[k]; }
    const event=typeof gl.event==='string'&&/^\d{1,15}$/.test(gl.event)?gl.event:null;
    const glat=typeof gl.glat==='string'&&when(Date.parse(gl.glat))?gl.glat:null;
    if(Object.keys(lines).length||Object.keys(ids).length||event) o.gl={at:gl.at,lines,ids,idat,glat,event,sig:gl.sig}; }
  const b=e.pl;
  if(b&&typeof b==='object'&&typeof b.at==='string'&&when(Date.parse(b.at))&&typeof e.plsig==='string'){
    const lines={}, rungs={}, td=[];
    if(b.lines&&typeof b.lines==='object') for(const pid of Object.keys(b.lines)){ const m=b.lines[pid]; if(!ESPN_KEEP_PID.test(pid)||!m||typeof m!=='object') continue;
      const s={}; for(const st of Object.keys(m)) if(ESPN_KEEP_STATS.has(st)&&espnKeepLine(m[st])) s[st]=m[st]; if(Object.keys(s).length) lines[pid]=s; }
    if(b.rungs&&typeof b.rungs==='object') for(const pid of Object.keys(b.rungs)){ const m=b.rungs[pid]; if(!ESPN_KEEP_PID.test(pid)||!m||typeof m!=='object') continue;
      const s={}; for(const st of Object.keys(m)) if(ESPN_KEEP_STATS.has(st)&&Array.isArray(m[st])){ const r=[...new Set(m[st].filter(espnKeepLine))].sort((x,y)=>x-y).slice(0,40); if(r.length) s[st]=r; }
      if(Object.keys(s).length) rungs[pid]=s; }
    if(Array.isArray(b.td)) for(const pid of b.td) if(typeof pid==='string'&&ESPN_KEEP_PID.test(pid)&&!td.includes(pid)) td.push(pid);
    o.pl={at:b.at,lines,rungs,td:td.sort()}; }
  if(typeof e.plsig==='string') o.plsig=e.plsig;
  const u=e.out;
  if(u&&typeof u==='object'&&(u.st==='ok'||u.st==='none')&&when(u.when)) o.out={st:u.st,why:typeof u.why==='string'?u.why.slice(0,200):'',sb:false,when:u.when};
  return o.gl||o.pl||(o.out&&o.out.st==='none'&&o.plsig)?o:null;
}
/* when each half was read: the game lines' read, and the player half's (its lines' read, or the last read
   of them that found none) */
const espnKeptGl=e=>e&&e.gl?e.gl.at:0;
const espnKeptPl=e=>e?Math.max(e.pl?Date.parse(e.pl.at)||0:0,e.out?e.out.when||0:0):0;
function espnKeptAt(e){ return Math.max(espnKeptGl(e),espnKeptPl(e)); }
function espnKeepParse(raw){
  let v=null; try{ v=JSON.parse(raw); }catch(e){ return null; }
  return v&&typeof v==='object'&&v.v===1&&v.season===SEASON&&v.games&&typeof v.games==='object'&&!Array.isArray(v.games)?v:null;
}
/* what stands, written over what the browser holds, half by half: each game's game lines from whichever
   side (this tab's, or the browser's copy another tab may have written) read them later (a half with
   nothing in it never wins), its player half with its plsig and what the read found the same (a later read
   that found no player lines keeping the lines the other read over the same publish, as one tab does). A
   game this tab has nothing of its own for, or one its schedule no longer offers, is the browser's copy
   carried as it stands (a tab open on an older publish never judges another tab's read by its own
   schedule: each load's restore prunes the copy on the publish it loads); a half this load set aside
   (ESPN_KEEP_GONE) is left out; an empty set empties the key. A write the browser refuses empties it too:
   the reads are then held in memory alone */
function espnKeepWrite(){
  if(ESPN_KEEP_OFF) return false;
  try{
    let cur=null; try{ cur=espnKeepParse(localStorage.getItem(ESPN_KEEP_KEY)); }catch(e){}
    const games={}, tg=x=>x&&x.gl&&(Object.keys(x.gl.lines).length||Object.keys(x.gl.ids).length)?x.gl.at:0;
    for(const gid of new Set([...Object.keys(ESPN_KEPT),...(cur?Object.keys(cur.games):[])])){
      if(!ESPN_KEEP_GID.test(gid)) continue;
      const gone=ESPN_KEEP_GONE[gid]||{}, g=((S&&S.sched)||[]).find(x=>x.id===gid), live=!!g&&!gameStarted(g)&&!hasScore(g);
      let c=cur&&espnOwn(cur.games,gid)?espnKeptGame(cur.games[gid]):null;
      const cG=c&&c.gl&&c.gl.at>(gone.gl||0)?c:null, cP=c&&(c.pl||c.out)&&espnKeptPl(c)>(gone.pl||0)?c:null;
      const mine=live&&ESPN_KEPT[gid]&&ESPN_KEPT[gid].w===String(g.w)?ESPN_KEPT[gid]:null;
      if(!mine){ if(!c) continue; const e={w:c.w}; if(cG) e.gl=c.gl; if(cP){ if(c.pl) e.pl=c.pl; if(c.out) e.out=c.out; }
        if(typeof c.plsig==='string') e.plsig=c.plsig; if(e.gl||e.pl||(e.out&&e.out.st==='none'&&e.plsig)) games[gid]=e; continue; }
      const w=String(g.w); if(c&&c.w!==w) c=null;
      const cG2=c?cG:null, cP2=c?cP:null;
      const e={w}, mG=mine&&mine.gl?mine:null, mP=mine&&(mine.pl||mine.out)?mine:null;
      const gs=cG2&&(!mG||tg(cG2)>tg(mG))?cG2:mG; if(gs) e.gl=gs.gl;
      const ps=cP2&&(!mP||espnKeptPl(cP2)>espnKeptPl(mP))?cP2:mP;
      if(ps){ if(typeof ps.plsig==='string') e.plsig=ps.plsig; if(ps.out) e.out=ps.out;
        /* the block: the later of the two sides' read over the same publish (a press that found none, or
           failed, keeps its tab's older block, which must not displace a newer one the other tab read) */
        const other=ps===mP?cP2:mP, bt=x=>x&&x.pl?Date.parse(x.pl.at)||0:0;
        const blk=other&&other.pl&&other.plsig===e.plsig&&bt(other)>bt(ps)?other:ps;
        if(blk.pl) e.pl=blk.pl; }
      else if(mine&&typeof mine.plsig==='string') e.plsig=mine.plsig;
      if(e.gl||e.pl||(e.out&&e.out.st==='none'&&e.plsig)) games[gid]=e; }
    if(!Object.keys(games).length){ localStorage.removeItem(ESPN_KEEP_KEY); return true; }
    localStorage.setItem(ESPN_KEEP_KEY,JSON.stringify({v:1,season:SEASON,saved:Date.now(),games}));
    return true;
  }catch(e){ try{ localStorage.removeItem(ESPN_KEEP_KEY); }catch(e2){} return false; }
}
/* a press's games and what it read for each (gls: the scoreboard's odds by game, with their time). The game
   half is what the load's reads did to the game's lines (ESPN_GL's d: a read the page left off, older than
   the published lines, did nothing) and every id a read gave or found, with the time it was read */
function espnKeepPut(w,games,gls){
  for(const g of games){
    const prev=ESPN_KEPT[g.id], e=prev&&prev.w===String(w)?{...prev}:{w:String(w)}, o=ESPN_OUT[g.id], r=gls[g.id];
    if(r){ const G=ESPN_GL[g.id], T=ESPN_IDAT[g.id]||{}, W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, D=(W&&W[g.id])||{};
      const ids={}, idat={}; for(const k of Object.keys(T)) if(typeof D[k]==='string'&&espnKeepNum(T[k])){ ids[k]=D[k]; idat[k]=T[k]; }
      e.gl={at:G?G.at:r.at,lines:G&&G.d?{...G.d}:{},ids,idat,glat:typeof D.glat==='string'?D.glat:null,event:typeof D.event==='string'?D.event:null,sig:espnGlSig(g)}; }
    const b=o&&o.st==='ok'?(ESPN_LIVE[String(w)]||{})[g.id]:null;
    if(b) e.pl=b;
    if(o&&(o.st==='ok'||o.st==='none')){ e.out={st:o.st,why:o.why||'',sb:false,when:o.when||0}; e.plsig=espnPlSig(g); }
    if(e.gl||e.pl||(e.out&&e.out.st==='none')){ if(typeof e.plsig!=='string') e.plsig=espnPlSig(g); ESPN_KEPT[g.id]=e; delete ESPN_ASIDE[g.id]; }
  }
  return espnKeepWrite();
}
/* no room for the visitor's own state: the kept read gives way, for the rest of this load */
function espnKeepDrop(){
  try{ if(localStorage.getItem(ESPN_KEEP_KEY)==null) return false; localStorage.removeItem(ESPN_KEEP_KEY); ESPN_KEEP_OFF=true; return true; }catch(e){ return false; }
}
/* a kept read's game lines put back as its reads left them, where the read is newer than the page's lines
   (since). Over the publish it was read over (same), literally: each field a read set, set, each it dropped
   (a number read without its prices), dropped, which is exactly what the page showed. Over a newer one,
   only the fields read after it (each by its own read's time, so an older read's field never outranks the
   newer publish), as a read would put them: a number with its prices, or without them keeping the page's
   prices only where the page has that same number */
function espnKeepLines(g,gl,since,same){
  const d={}; for(const k of ESPN_KEEP_LINES) if(espnOwn(gl.lines,k)&&(same||gl.lines[k][1]>since)) d[k]=gl.lines[k];
  const has=k=>espnOwn(d,k), on=Object.keys(d);
  if(!on.length||!(gl.at>(ESPN_GL[g.id]?ESPN_GL[g.id].at:since))) return false;
  if(!ESPN_GL[g.id]) ESPN_GL[g.id]={orig:Object.fromEntries(ESPN_GL_KEYS.map(k=>[k,g[k]])),at:0,d:{}};
  let t=0; const D=ESPN_GL[g.id].d||(ESPN_GL[g.id].d={}), put=(k,x)=>{ D[k]=x; if(x[1]>t) t=x[1]; if(x[0]===null){ if(g[k]!==undefined) delete g[k]; } else g[k]=x[0]; };
  if(same) for(const k of on) put(k,d[k]);
  else {
    for(const k of ['mla','mlh']) if(has(k)&&d[k][0]!==null) put(k,d[k]);
    for(const [n,a,b] of [['sp','spa','sph'],['tot','tov','tou']]){ if(!has(n)||d[n][0]===null) continue;
      const priced=has(a)&&has(b)&&d[a][0]!==null&&d[b][0]!==null;
      if(priced){ put(a,d[a]); put(b,d[b]); } else if(g[n]!==d[n][0]) for(const x of [a,b]) put(x,[null,d[n][1]]);
      put(n,d[n]); } }
  if(!t){ if(!ESPN_GL[g.id].at) delete ESPN_GL[g.id]; return false; }
  g.ls='dk'; g.lat=espnIso(t); ESPN_GL[g.id].at=Math.max(ESPN_GL[g.id].at,t); return true;
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
/* the kept read put back on a load, before the page is drawn and with no request. Each half stands over
   the publish it was read over, or over a newer one where the read is later than that publish's own time
   for it: the DraftKings pull's for game lines it carries (g.lat), else the bake; the paid pull's for the
   game's player prices (PAY.dk's at), else the bake. So a newer publish always wins, and a read made after
   it, in a tab loaded before it, stands. Neither half for a game kicked off, scored, in another week or not
   on this publish (pruned from the copy here). What gave way is noted (ESPN_ASIDE) and what stands
   written back. Nothing is touched with no schedule to stand on. The number of games put back */
function espnRestore(){
  let raw=null; try{ raw=localStorage.getItem(ESPN_KEEP_KEY); }catch(e){ return 0; }
  if(raw==null||!S||!Array.isArray(S.sched)||!S.sched.length) return 0;
  const v=espnKeepParse(raw);
  if(!v){ try{ localStorage.removeItem(ESPN_KEEP_KEY); }catch(e){} return 0; }
  let n=0; const bk=Date.parse((PAY&&PAY.baked_at)||'')||0;
  for(const gid of Object.keys(v.games)){
    if(!ESPN_KEEP_GID.test(gid)) continue;
    const e=espnKeptGame(v.games[gid]), g=S.sched.find(x=>x.id===gid); if(!e) continue;
    const at={gl:espnKeptGl(e),pl:espnKeptPl(e)};
    const gone=h=>{ const G=ESPN_KEEP_GONE[gid]||(ESPN_KEEP_GONE[gid]={}); G[h]=Math.max(G[h]||0,at[h]); };
    if(!g||String(g.w)!==e.w||gameStarted(g)||hasScore(g)){ gone('gl'); gone('pl'); continue; }
    const k={w:e.w}, aside=h=>{ (ESPN_ASIDE[gid]||(ESPN_ASIDE[gid]={}))[h]=at[h]; gone(h); };
    if(e.gl){ const sig=espnGlSig(g), same=e.gl.sig===sig, lat=g.ls==='dk'?Date.parse(g.lat||''):NaN, since=isFinite(lat)?lat:(same?0:bk);
      if(same||e.gl.at>since){ const on=espnKeepLines(g,e.gl,since,same); espnKeepIds(g,e.gl); k.gl={...e.gl,lines:on?{...ESPN_GL[g.id].d}:{},at:on?ESPN_GL[g.id].at:e.gl.at,sig}; }
      else aside('gl'); }
    const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[e.w]:null, pubP=Date.parse((W&&W[gid]&&W[gid].at)||'')||bk;
    const plSame=e.plsig===espnPlSig(g), plOk=t=>plSame||t>pubP;
    if(e.pl){ if(plOk(Date.parse(e.pl.at))){ (ESPN_LIVE[e.w]||(ESPN_LIVE[e.w]={}))[gid]=e.pl; k.pl=e.pl; } else aside('pl'); }
    /* what the read found goes back with the half it describes: 'ok' only with its player lines */
    /* a read that found none says so for a day at most: DraftKings posts a game's player lines in the week */
    if(e.out){ const fresh=e.out.st==='ok'?!!k.pl:Date.now()-e.out.when<DK_EST.staleHours*3600e3;
      if(plOk(e.out.when)&&fresh){ ESPN_OUT[gid]=e.out; k.out=e.out; }
      else if(!e.pl&&!plOk(e.out.when)) aside('pl');
      else gone('pl'); }
    if(!k.gl&&!k.pl&&!k.out) continue;
    if(k.pl||k.out) k.plsig=espnPlSig(g);
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

# espnLegBack: a game leg keeps its add-time price while its own field of the read stands
sub('p3', """  if(isGameLeg(l)){
    if(!l.gl||ESPN_GL[l.gid]) return null;
    const g=((S&&S.sched)||[]).find(x=>x.id===l.gid); if(!g) return null;""",
    """  if(isGameLeg(l)){
    if(!l.gl) return null;
    const g=((S&&S.sched)||[]).find(x=>x.id===l.gid); if(!g) return null;
    /* (app v108) its own price field among what the load's reads did (ESPN_GL's d), set or dropped, not
       merely a read of its game: a reload over a newer publish puts back only the fields read after it, and a
       leg whose field is the publish's again goes to the publish's price; within a load, and over the same
       publish, every field a read touched is in d, so a leg keeps the price it was added at, as before */
    { const G=ESPN_GL[l.gid], f=l.stat==='ml'?(l.team===g.h?'mlh':'mla'):(l.stat==='ats'?(l.team===g.h?'sph':'spa'):(l.side==='under'?'tou':'tov'));
      if(G&&(!G.d||Array.isArray(G.d[f]))) return null; }""")

# toggleLeg: a paid main line's leg takes that line's number
sub('p3', """    if(M.src==='real'){ const L=M.L, pO=pOver(pl.grp,stat,pr.mu,L.line);
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;""",
    """    if(M.src==='real'){ const L=M.L, pO=pOver(pl.grp,stat,pr.mu,L.line); k=L.line;
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: app v108, a Refresh odds read kept in this browser until its game kicks off or newer prices are published')
