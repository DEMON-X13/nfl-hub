r"""app v124: DraftKings' lines read from ESPN for every visitor, published by the props job itself.

The owner, 20 October 2026: the props job stops buying prices from the odds API on a schedule. Every visitor
sees DraftKings' lines read from ESPN (the game lines with DraftKings' own prices, a player's line priced by
our estimate of DraftKings' price, src 'dkline', marked est.), and the props job reads ESPN itself on every
run and publishes what it read in the payload. The suggestions take those estimated legs again, as they did
on a payload baked before DraftKings' ids (before app v109), and the record is graded on the estimated prices.

The published read (the job's, PAY.espn and the schedule's game lines)
-------------------------------------------------------------------------
The job reads with the page's own reader: espnReadWeek(w, games, onStep), split out of espnRefresh, which
reads ESPN and returns what it read without applying any of it ({sbAt, out, gl, pl}: each game's outcome, its
scoreboard odds and its placed player lines; a 'none' carries the time it was answered, and one answered at or
after the game's kickoff is 'kicked', as an 'ok' that late is, since the job publishes nothing of a game's read
dated at or after its kickoff: the review of 21 October 2026). It touches nothing of
the page's but ESPN_RUN's counters and the ESPN_NAMES lookup cache. espnRefresh, the press, keeps its behaviour
on top of it: the game lines applied (now after the player reads rather than before: nothing in a player read
stands on them), the blocks into ESPN_LIVE, ESPN_OUT, the kept read, the redraw.

The job writes the game lines into PAY.sched as a press applies them (ls 'dk', lat the read's time with
seconds, and lsr 'espn', which only lineSource reads: "DraftKings', read from ESPN <time>") and the rest into
PAY.espn = {v:1, read_at, games:{gid:{w, gl:{at, lines, ids, event}, pl:{at, lines, rungs, td}, out:{st,
at}}}}. espnPublished(), called at boot outside NO_BAKED (so the audit sees what a visitor sees) and before
espnRestore, installs it: each game still to come of its week, every time before its kickoff, its player block
cleaned by the kept read's own rules (espnKeptGame with {published:true}: no 'late' guard, since the job's times
are ESPN's clock and a slow browser would otherwise drop the whole read) into ESPN_LIVE, recorded in ESPN_PUB;
its game-line ids and event into PAY.dk beside any there, never replacing one (ESPN_PUB_IDS dates them for the
parlay card, espnIdAt). ESPN_GL, ESPN_OUT, ESPN_IDAT, the kept read and S are never written by it, so every
"a press happened" signal keeps its meaning. It is idempotent and the checks call it again (window.espnPublished):
a block a press or a kept read put in its place is never replaced, one no longer published is taken out with
the ids it added, and a table a check put in place of PAY.dk is the check's own (the read's ids go only into the
table it first merged into).

Precedence, half by half. Game lines: a kept read stands over the publish it was read over (espnGlSig hashes
lat, which every read moves), else only its fields read after the published read's lat. A FRESH press
(espnRefresh, the parlay card's check) applies over the published read's lines (lsr 'espn') whatever lat says,
since the smoke and PROPS_AUDIT_NOW move the page's clock back and a slow browser must not swallow a press; the
time comparison stays for a by-hand paid line (ls 'dk' with no lsr) and for kept-read replays. Player lines:
espnPlSig adds the published read's identity (its pl.at, out.st and out.at), and a kept player half stands over
the publish it was read over, else only where it is newer than the published read (espnRestore's pubP: the
published pl.at or out.at, else the paid pull's at, else the bake).

Was it read: espnWasRead(gid, w) is true where a press found ok or none, or the published out is ok or none (a
published gl alone is no player read); espnLastRead(ids) the latest such read. espnPressed(gid, w) tells a
pressed block from the published one. The status line, before a press: "DraftKings' lines as the site read them
from ESPN <time>: player prices estimated from the line" (with "; N games had no player lines posted when the
site read ESPN"), <time> the latest read of their player lines alone (a block's, or an 'ok' or 'none'; a read of
the game lines alone is no player read, and with nothing else the line is the publish's: the review of 21 October
2026), "Prices as published <time>" where the payload carries no read.

The id rule, by content
-----------------------
A PAY.dk game entry carries the pull's ids only where it has the paid pull's time (at) or a player's key (the
parlay card's dkHasPlayer rule): an entry a read makes (a press, the card's check, the published read) holds only
event, glat and team: and game| keys, so it never does. dkCarries reads that rule (and keeps DK_PRESS_MADE for a
whole table a press made). The rule survives a JSON copy, so the checks apply the same rule to the live table.
It also fixes a live bug: a press over the bake's dk:{} wrote an entry for its game, which then "carried ids",
and every player leg of that game left every level, hand and Elo pick. The id rule stays in the code, dormant,
for a payload whose bake wrote paid ids.

Other changes
-------------
- The pull hooks, inert without the parlay card: parlayLegs puts on each fresh copy what window.dkPulledFor(leg)
  returns (l.pulled), legPrice prices a pulled leg at its pulled price ('real'), legFair takes its pulled fair
  chance. S.parlay never holds pulled.
- A locked leg (spLegIn, a set read back from the record or this browser) carries kept:{fair, est} and is priced at
  its locked price and fair chance through any later publish (legPrice, legFair), so Add to builder pays what the
  locked card says, a rung and a main line whose line a later read moved included.
- Wording: no paid-pull timing anywhere (PB_NO_PL, PB_PULLED and spPulled are gone; pbNoPl, spWhy and spEloSet
  say when DraftKings' lines were last read from ESPN, or that they have not been yet); the dormant id-rule
  sentences drop the pull; estTitle on a locked leg with no read time; dkSlipLine "Not on DraftKings' slip:".
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function espnReadWeek(' not in T['p3'], 'patch_espn_only.py has already been applied'
assert "const APP_BUILD='app v123 \\u00b7 2026-10-20';" in T['p2'], 'expected app v123'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


# ---------------------------------------------------------------- part2
sub1('p2', "const APP_BUILD='app v123 \\u00b7 2026-10-20';", "const APP_BUILD='app v124 \\u00b7 2026-10-20';", 'APP_BUILD')

sub1('p2', """function parlayLegs(){
  return Object.entries(S.parlay||{}).map(([key,l])=>({key,...l}))
    .sort((a,b)=>(a.week-b.week)||a.name.localeCompare(b.name));
}""", """function parlayLegs(){
  return Object.entries(S.parlay||{}).map(([key,l])=>{ const x={key,...l}; delete x.pulled;
    /* (app v124) the parlay card's Pull from DraftKings (window.dkPulledFor, on the admin's device alone): what it
       pulled for this leg, put on this fresh copy only, never on S.parlay; inert without the card */
    if(typeof window!=='undefined'&&typeof window.dkPulledFor==='function'){ try{ const P=window.dkPulledFor(x); if(P) x.pulled=P; }catch(e){} }
    return x; })
    .sort((a,b)=>(a.week-b.week)||a.name.localeCompare(b.name));
}""", 'parlayLegs: the pull hook')

sub1('p2', """  if(g.ls==='dk'){ let gl=null; try{ gl=typeof ESPN_GL==='object'&&ESPN_GL?ESPN_GL[g.id]:null; }catch(e){}
    if(gl&&gl.at) return 'DraftKings’, read from ESPN by Refresh odds '+espnWhen(gl.at);
    const t=g.lat?new Date(g.lat):null;""", """  if(g.ls==='dk'){ let gl=null; try{ gl=typeof ESPN_GL==='object'&&ESPN_GL?ESPN_GL[g.id]:null; }catch(e){}
    if(gl&&gl.at) return 'DraftKings’, read from ESPN by Refresh odds '+espnWhen(gl.at);
    /* (app v124) the props job's own read of ESPN, published with the payload */
    if(g.lsr==='espn') return 'DraftKings’, read from ESPN '+espnWhen(g.lat);
    const t=g.lat?new Date(g.lat):null;""", 'lineSource: the published read')

# ---------------------------------------------------------------- part3: the header and the press's state
sub1('p3', """   week still to come; a game's page reads that game alone) reads DraftKings' lines from ESPN's free feed in
   the visitor's own browser when it is pressed, and never otherwise: nothing is fetched for it on load or
   on a timer, and the props job never reads ESPN (it bakes PAY.espn_ids, each player's ESPN athlete id, from
   the roster it downloads anyway). Both ESPN hosts answer a plain GET with access-control-allow-origin: *,
   and the page sends no header of its own, so there is no preflight.""", """   week still to come; a game's page reads that game alone) reads DraftKings' lines from ESPN's free feed in
   the visitor's own browser when it is pressed, and never otherwise: nothing is fetched for it on load or
   on a timer. Since app v124 the props job reads ESPN too, on every run, with this very reader (espnReadWeek,
   in jsdom), and publishes what it read in the payload (PAY.espn and the schedule's game lines; espnPublished,
   below, installs it at boot), so every visitor starts from DraftKings' lines and a press reads them again,
   newer. Both ESPN hosts answer a plain GET with access-control-allow-origin: *, and the page sends no
   header of its own, so there is no preflight.""", 'header: the job reads ESPN')

sub1('p3', """let ESPN_LIVE={}, ESPN_GL={}, ESPN_OUT={}, ESPN_NAMES={}, ESPN_IDAT={}, ESPN_SEQ=0;
""", """let ESPN_LIVE={}, ESPN_GL={}, ESPN_OUT={}, ESPN_NAMES={}, ESPN_IDAT={}, ESPN_SEQ=0;
/* (app v124) the published read (espnPublished): ESPN_PUB[w][gid] = {at, st, when, block, gl:{at, ids, event}}
   (block the very object it put in ESPN_LIVE, so a pressed block is told from it by identity); ESPN_PUB_IDS[gid][key]
   = {id, at}, the game-line ids it merged into PAY.dk, dated by its read; ESPN_PUB_ADDED what it added to PAY.dk
   (so a game no longer published takes them back out); ESPN_PUB_DK the table it merged into */
let ESPN_PUB={}, ESPN_PUB_IDS={}, ESPN_PUB_ADDED={}, ESPN_PUB_DK=null;
""", 'the published read state')

sub1('p3', """    if(r.status===404&&p===1) return {st:'none',why:'DraftKings has posted no player lines for it yet'};""",
     """    /* (app v124) dated by its answer (the Date header where it can be read, else the page's clock), for the job */
    if(r.status===404&&p===1) return {st:'none',why:'DraftKings has posted no player lines for it yet',at:r.at!=null?r.at:Date.now()};""",
     'espnProps: a none is dated')

sub1('p3', """/* a game's lines from a read at time at, where it is newer than what the page has, and its DraftKings
   ids beside the paid pull's; true where anything moved. since (app v108, a kept read put back) stands
   in for the published lines' time: the DraftKings pull's own, never baked_at, which moves on every bake */
function espnApplyGame(g,odds,at,since){
  if(!odds) return false; let ch=false;
  const L=odds.lines, prev=ESPN_GL[g.id]?ESPN_GL[g.id].at:(since!=null?since:(Date.parse(g.lat||'')||Date.parse((PAY&&PAY.baked_at)||'')||0));""",
     """/* a game's lines from a read at time at, where it is newer than what the page has, and its DraftKings
   ids beside the paid pull's; true where anything moved. since (app v108, a kept read put back) stands
   in for the published lines' time: the DraftKings pull's own, never baked_at, which moves on every bake.
   fresh (app v124, a press reading now: espnRefresh, the parlay card's check) applies over lines the props job
   read from ESPN and published (lsr 'espn') whatever their lat says: that is ESPN's clock, the press's the
   browser's, and the smoke and PROPS_AUDIT_NOW move the page's clock back, so a time comparison could swallow a
   press. A paid line (ls 'dk' with no lsr) and a kept read's replay are still judged by time. The ids go into an
   entry of the game's that a read makes: it holds only event, glat and game lines' ids, so it never makes its game
   carry the pull's ids (dkCarries, by content) */
function espnApplyGame(g,odds,at,since,fresh){
  if(!odds) return false; let ch=false;
  const L=odds.lines, prev=ESPN_GL[g.id]?ESPN_GL[g.id].at:(since!=null?since:(fresh&&g.lsr==='espn'&&g.ls==='dk'?-Infinity:(Date.parse(g.lat||'')||Date.parse((PAY&&PAY.baked_at)||'')||0)));""",
     'espnApplyGame: a fresh press over the published read')

sub1('p3', """/* when a press last read a game's DraftKings id (a team's line or the total), or null */
function espnIdAt(gid,key){ const t=ESPN_IDAT[gid]&&ESPN_IDAT[gid][key]; return isFinite(t)&&t>0?t:null; }""",
     """/* when a press last read a game's DraftKings id (a team's line or the total), or null; (app v124) else when the
   props job's published read did, while PAY.dk still holds that very id for the key */
function espnIdAt(gid,key){ const t=ESPN_IDAT[gid]&&ESPN_IDAT[gid][key]; if(isFinite(t)&&t>0) return t;
  const P=ESPN_PUB_IDS[gid]&&ESPN_PUB_IDS[gid][key]; if(!P) return null;
  try{ const g=((S&&S.sched)||[]).find(x=>x.id===gid), W=g&&PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, E=W&&W[gid];
    return E&&E[key]===P.id&&isFinite(P.at)&&P.at>0?P.at:null; }catch(e){ return null; } }""", 'espnIdAt: published ids')

# ---------------------------------------------------------------- a 'none' that came at or after the kickoff
sub1('p3', """  const pr=await espnProps(r.eid);
  if(pr.st!=='ok') return pr;""", """  const pr=await espnProps(r.eid);
  /* (app v124) a 'none' answered at or after the kickoff (its 404 dated there, or the page's clock past it) is no read
     before it: the game kicked off while it was being read, as an 'ok' that late is. The props job publishes nothing
     of a game's read dated at or after its kickoff, and its audit (V-ESPN) holds every 'none' it read published */
  if(pr.st==='none'&&Math.max(pr.at!=null?pr.at:Date.now(),Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  if(pr.st!=='ok') return pr;""", 'espnReadGame: a none at or after kickoff')

# ---------------------------------------------------------------- who an athlete was placed on, and how (for the job)
sub1('p3', """async function espnPlace(per,g,ev){
  const ids=PAY&&PAY.espn_ids&&typeof PAY.espn_ids==='object'?PAY.espn_ids:{}, placed={}, left=[];
  for(const aid of Object.keys(per)){ const pid=ids[aid]; if(typeof pid==='string'&&pid) placed[aid]=pid; else left.push(aid); }
  if(!left.length) return placed;""", """async function espnPlace(per,g,ev){
  /* (app v124) how each was placed (how, not enumerable: 'id', 'name' an exact name, 'nameKey' the looser one), which
     the props job's read records and its audit holds (V-ESPN) */
  const ids=PAY&&PAY.espn_ids&&typeof PAY.espn_ids==='object'?PAY.espn_ids:{}, placed={}, left=[], how={};
  Object.defineProperty(placed,'how',{value:how});
  for(const aid of Object.keys(per)){ const pid=ids[aid]; if(typeof pid==='string'&&pid){ placed[aid]=pid; how[aid]='id'; } else left.push(aid); }
  if(!left.length) return placed;""", 'espnPlace: how')
sub1('p3', """    for(const pid in claims){ taken.add(pid); if(claims[pid].length===1) placed[claims[pid][0]]=pid; else for(const aid of claims[pid]) gone.add(aid); } }
  return placed;
}""", """    for(const pid in claims){ taken.add(pid); if(claims[pid].length===1){ placed[claims[pid][0]]=pid; how[claims[pid][0]]=rule===normName?'name':'nameKey'; } else for(const aid of claims[pid]) gone.add(aid); } }
  return placed;
}""", 'espnPlace: how by name')
sub1('p3', """  const {per,counts}=espnParseItems(pr.items), placed=await espnPlace(per,r.g,r.ev), at=t();
  if(Math.max(at,Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  return {st:'ok',at,block:espnBlock(per,placed,at),counts:{...counts,athletes:Object.keys(per).length,placed:Object.keys(placed).length}};
}""", """  const {per,counts}=espnParseItems(pr.items), placed=await espnPlace(per,r.g,r.ev), at=t();
  if(Math.max(at,Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  const res={st:'ok',at,block:espnBlock(per,placed,at),counts:{...counts,athletes:Object.keys(per).length,placed:Object.keys(placed).length}};
  /* (app v124) each player of the block: the ESPN athlete whose lines it carries (espnBlock's own choice), ESPN's name
     for him and how he was placed; not enumerable, so nothing a press keeps carries it (espnReadWeek returns it) */
  Object.defineProperty(res,'placed',{value:espnWho(per,placed)});
  return res;
}
/* (app v124) who each player of a game's block is: {pid: {aid, name, how}}, in espnBlock's order (the athlete
   PAY.espn_ids names him by, else the first by number) */
function espnWho(per,placed){
  const ids=PAY&&PAY.espn_ids&&typeof PAY.espn_ids==='object'?PAY.espn_ids:{}, how=placed&&placed.how||{}, who={};
  const byId=aid=>ids[aid]===placed[aid]?0:1;
  for(const aid of Object.keys(placed).sort((x,y)=>byId(x)-byId(y)||x-y)){ const pid=placed[aid]; if(who[pid]||!per[aid]) continue;
    who[pid]={aid,name:typeof ESPN_NAMES[aid]==='string'?ESPN_NAMES[aid]:null,how:how[aid]||'id'}; }
  return who;
}""", 'espnReadGame: who was placed')

# ---------------------------------------------------------------- the reader split out of the press
sub1('p3', """/* the press: gid, that game alone; none, every game of the week still to come. false where it does
   nothing (a read already running, or no game to read) */
async function espnRefresh(gid){
  if(ESPN_RUN.busy||!S||!S.sched) return false;
  const one=gid?S.sched.find(x=>x.id===gid):null; if(gid&&!one) return false;
  const w=one?+one.w:currentWeek(), games=(one?[one]:gamesIn(w)).filter(g=>!gameStarted(g)&&!hasScore(g));
  if(!games.length){ espnPaint(); return false; }
  ESPN_RUN={busy:true,gid:gid||null,week:w,total:games.length,done:0,requests:0,clock:false};
  espnPaint();
  const out={}, gls={}; let changed=false;
  try{
    const sb=await espnFetch(`${ESPN_SB}?dates=${SEASON}&${espnWeekQ(w)}&_=${Date.now()}`);
    const evs=sb.status===200&&sb.body&&Array.isArray(sb.body.events)?sb.body.events:null;
    if(!evs){ for(const g of games) out[g.id]={st:'failed',sb:true,why:sb.why||'a scoreboard with no events'}; }
    else {
      const sbAt=sb.at!=null?sb.at:Date.now(); if(sb.at==null) ESPN_RUN.clock=true;
      const byPair={}; for(const g of games) byPair[[g.a,g.h].sort().join('|')]=g;
      const reads=[];
      for(const ev of evs){ const cl=espnClubs(ev), g=cl&&byPair[[cl.home.ab,cl.away.ab].sort().join('|')];
        if(!g||reads.some(r=>r.g===g)||out[g.id]) continue;
        const k=kickoff(g), e=Date.parse(ev&&ev.date), ko=Math.min(k?k.getTime():Infinity,isFinite(e)?e:Infinity);
        if(Math.max(sbAt,Date.now())>=ko){ out[g.id]={st:'kicked',why:'kicked off before it was read'}; continue; }
        const od=espnOdds(ev,g); if(espnApplyGame(g,od,sbAt)) changed=true; if(od) gls[g.id]={at:sbAt,od};
        reads.push({g,ev,ko,eid:String(ev.id||'')}); }
      for(const g of games) if(!out[g.id]&&!reads.some(r=>r.g===g)) out[g.id]={st:'failed',sb:true,why:'not on ESPN’s scoreboard'};
      ESPN_RUN.done=games.length-reads.length; espnPaint();
      await espnPool(reads.map(r=>async()=>{
        let res; try{ res=/^\\d+$/.test(r.eid)?await espnReadGame(r):{st:'failed',why:'no ESPN event id'}; }catch(e){ res={st:'failed',why:String(e&&e.message||e)}; }
        out[r.g.id]=res;
        if(res.st==='ok'){ (ESPN_LIVE[String(w)]||(ESPN_LIVE[String(w)]={}))[r.g.id]=res.block; changed=true; }
        ESPN_RUN.done++; espnPaint(); }),ESPN_POOL);
    }
  }catch(e){ console.error(e); for(const g of games) if(!out[g.id]) out[g.id]={st:'failed',sb:!ESPN_GL[g.id],why:String(e&&e.message||e)}; }
  finally{
    const now=Date.now(); for(const id in out) ESPN_OUT[id]={...out[id],block:undefined,when:now};""",
     """/* (app v124) the reader alone, for the press and for the props job (which calls it in jsdom, window.espnReadWeek):
   week w's scoreboard and the player lines of each of games (schedule rows of week w, still to come), read and
   placed, and nothing applied. Returns {sbAt: the scoreboard's time or null, out: {gid: {st 'ok'|'none'|'failed'|
   'kicked', why?, sb?: the scoreboard failed it, at?: the read's time (ok and none), block?, counts?}}, gl: {gid: {at,
   od: espnOdds's {lines, ids, event}}} in the scoreboard's order, pl: {gid: {at, block, counts, placed: {pid: {aid,
   name, how 'id'|'name'|'nameKey'}}}} for each 'ok'}.
   It touches nothing of the page's but ESPN_RUN's counters (requests, clock) and the ESPN_NAMES lookup cache: no
   ESPN_LIVE, ESPN_GL, ESPN_OUT, ESPN_IDAT, PAY, storage or redraw. onStep(done, total) where a game is done. Never
   throws: a failure is each game's 'failed' */
async function espnReadWeek(w,games,onStep){
  games=Array.isArray(games)?games:[];
  const out={}, gl={}, pl={}; let sbAt=null, done=0;
  const step=()=>{ try{ if(typeof onStep==='function') onStep(done,games.length); }catch(e){} };
  try{
    const sb=await espnFetch(`${ESPN_SB}?dates=${SEASON}&${espnWeekQ(w)}&_=${Date.now()}`);
    const evs=sb.status===200&&sb.body&&Array.isArray(sb.body.events)?sb.body.events:null;
    if(!evs){ for(const g of games) out[g.id]={st:'failed',sb:true,why:sb.why||'a scoreboard with no events'}; }
    else {
      sbAt=sb.at!=null?sb.at:Date.now(); if(sb.at==null) ESPN_RUN.clock=true;
      const byPair={}; for(const g of games) byPair[[g.a,g.h].sort().join('|')]=g;
      const reads=[];
      for(const ev of evs){ const cl=espnClubs(ev), g=cl&&byPair[[cl.home.ab,cl.away.ab].sort().join('|')];
        if(!g||reads.some(r=>r.g===g)||out[g.id]) continue;
        const k=kickoff(g), e=Date.parse(ev&&ev.date), ko=Math.min(k?k.getTime():Infinity,isFinite(e)?e:Infinity);
        if(Math.max(sbAt,Date.now())>=ko){ out[g.id]={st:'kicked',why:'kicked off before it was read'}; continue; }
        const od=espnOdds(ev,g); if(od) gl[g.id]={at:sbAt,od};
        reads.push({g,ev,ko,eid:String(ev.id||'')}); }
      for(const g of games) if(!out[g.id]&&!reads.some(r=>r.g===g)) out[g.id]={st:'failed',sb:true,why:'not on ESPN’s scoreboard'};
      done=games.length-reads.length; step();
      await espnPool(reads.map(r=>async()=>{
        let res; try{ res=/^\\d+$/.test(r.eid)?await espnReadGame(r):{st:'failed',why:'no ESPN event id'}; }catch(e){ res={st:'failed',why:String(e&&e.message||e)}; }
        out[r.g.id]=res;
        if(res.st==='ok') pl[r.g.id]={at:res.at,block:res.block,counts:res.counts,placed:res.placed||{}};
        done++; step(); }),ESPN_POOL);
    }
  }catch(e){ console.error(e); for(const g of games) if(!out[g.id]) out[g.id]={st:'failed',sb:!gl[g.id],why:String(e&&e.message||e)}; }
  return {sbAt,out,gl,pl};
}
/* the press: gid, that game alone; none, every game of the week still to come. false where it does
   nothing (a read already running, or no game to read). (app v124) The read is espnReadWeek's; the press applies
   it: each game's lines (a fresh read, so over the published read's whatever its time says), in the scoreboard's
   order, then each block into ESPN_LIVE */
async function espnRefresh(gid){
  if(ESPN_RUN.busy||!S||!S.sched) return false;
  const one=gid?S.sched.find(x=>x.id===gid):null; if(gid&&!one) return false;
  const w=one?+one.w:currentWeek(), games=(one?[one]:gamesIn(w)).filter(g=>!gameStarted(g)&&!hasScore(g));
  if(!games.length){ espnPaint(); return false; }
  ESPN_RUN={busy:true,gid:gid||null,week:w,total:games.length,done:0,requests:0,clock:false};
  espnPaint();
  const out={}, gls={}; let changed=false;
  try{
    const r=await espnReadWeek(w,games,d=>{ ESPN_RUN.done=d; espnPaint(); });
    Object.assign(out,r.out);
    for(const id of Object.keys(r.gl)){ const g=games.find(x=>x.id===id); if(!g) continue;
      if(espnApplyGame(g,r.gl[id].od,r.gl[id].at,undefined,true)) changed=true; gls[id]=r.gl[id]; }
    for(const id of Object.keys(r.pl)){ (ESPN_LIVE[String(w)]||(ESPN_LIVE[String(w)]={}))[id]=r.pl[id].block; changed=true; }
  }catch(e){ console.error(e); for(const g of games) if(!out[g.id]) out[g.id]={st:'failed',sb:!ESPN_GL[g.id],why:String(e&&e.message||e)}; }
  finally{
    /* what each game's read found, as a press always kept it (a 'none' without the time the job reads) */
    const now=Date.now(); for(const id in out){ const o={...out[id],block:undefined,when:now}; if(o.st==='none') delete o.at; ESPN_OUT[id]=o; }""",
     'espnReadWeek split out of espnRefresh')

# ---------------------------------------------------------------- the sigs, the kept read and the restore
sub1('p3', """/* g's published player prices: the paid pull's time for it and every main line the payload carries for it */
function espnPlSig(g){
  const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, D=W&&W[g.id], M=PAY&&PAY.mkt&&typeof PAY.mkt==='object'?PAY.mkt[String(g.w)]:null, rows=[];
  if(M&&typeof M==='object') for(const pid of Object.keys(M).sort()){ const r=M[pid]; if(r&&typeof r==='object') for(const st of Object.keys(r).sort()){ const L=r[st]; if(L&&L.g===g.id) rows.push([pid,st,L.line,L.over,L.under].join(',')); } }
  return espnHash(String(D&&D.at||'')+'|'+rows.join(';'));
}""", """/* g's published player prices: the paid pull's time for it and every main line the payload carries for it, and
   (app v124) the published read of its player lines, where the payload carries one for the game in its week (its
   pl.at, out.st and out.at: every new read of the job moves them). With none, the string is exactly app v120's */
function espnPlSig(g){
  const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, D=W&&W[g.id], M=PAY&&PAY.mkt&&typeof PAY.mkt==='object'?PAY.mkt[String(g.w)]:null, rows=[];
  if(M&&typeof M==='object') for(const pid of Object.keys(M).sort()){ const r=M[pid]; if(r&&typeof r==='object') for(const st of Object.keys(r).sort()){ const L=r[st]; if(L&&L.g===g.id) rows.push([pid,st,L.line,L.over,L.under].join(',')); } }
  const E=PAY&&PAY.espn&&typeof PAY.espn==='object'&&PAY.espn.v===1&&PAY.espn.games&&typeof PAY.espn.games==='object'?PAY.espn.games:null;
  const P=E&&espnOwn(E,g.id)&&E[g.id]&&typeof E[g.id]==='object'?E[g.id]:null;
  const pub=P&&String(P.w)===String(g.w)?'|espn:'+String(P.pl&&P.pl.at||'')+':'+String(P.out&&P.out.st||'')+':'+String(P.out&&P.out.at||''):'';
  return espnHash(String(D&&D.at||'')+'|'+rows.join(';')+pub);
}""", 'espnPlSig: the published read')

sub1('p3', """/* one game's kept entry as the page writes it, or null: everything else in it dropped */
function espnKeptGame(e){
  if(!e||typeof e!=='object'||Array.isArray(e)) return null;
  const w=String(e.w); if(!/^\\d{1,2}$/.test(w)) return null;
  const o={w}, late=Date.now()+60e3, when=t=>espnKeepNum(t)&&t>0&&t<=late;""",
     """/* one game's kept entry as the page writes it, or null: everything else in it dropped. (app v124) opt.published:
   the props job's read (espnPublished), on the same rules but for the 'late' guard: its times are ESPN's clock,
   and a browser running slow would otherwise drop the whole published read */
function espnKeptGame(e,opt){
  if(!e||typeof e!=='object'||Array.isArray(e)) return null;
  const w=String(e.w); if(!/^\\d{1,2}$/.test(w)) return null;
  const o={w}, late=opt&&opt.published?Infinity:Date.now()+60e3, when=t=>espnKeepNum(t)&&t>0&&t<=late;""",
     'espnKeptGame: the published option')

sub1('p3', """   for it: the DraftKings pull's for game lines it carries (g.lat), else the bake; the paid pull's for the
   game's player prices (PAY.dk's at), else the bake. So a newer publish always wins, and a read made after
   it, in a tab loaded before it, stands.""", """   for it: the DraftKings lines it carries (g.lat: the props job's read of ESPN since app v124, or a paid pull's),
   else the bake; for the game's player prices the later of the published read's (app v124: its pl.at or out.at)
   and the paid pull's (PAY.dk's at), else the bake. So a newer publish always wins, and a read made after it, in a
   tab loaded before it, stands.""", 'espnRestore: comment')

sub1('p3', """    const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[e.w]:null, pubP=Date.parse((W&&W[gid]&&W[gid].at)||'')||bk;""",
     """    /* (app v124) the publish's own time for the player half: the later of the published read's (where it read the
       game's player lines) and the paid pull's, so a newer publish of either kind sets an older read aside */
    const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[e.w]:null, Pb=espnPubOf(gid,e.w), pbT=Pb?Math.max(Pb.at||0,Pb.st?Pb.when||0:0):0;
    const pubP=Math.max(pbT,Date.parse((W&&W[gid]&&W[gid].at)||'')||0)||bk;""", 'espnRestore: pubP')

sub1('p3', """/* any read for a week's games (or this week's), and the latest read time (ms) */
function espnOn(week){""", """/* ---------- (app v124) the published read: the props job's own read of ESPN, installed at boot ----------
   PAY.espn = {v:1, read_at, games:{gid:{w, gl:{at, lines, ids, event}, pl:{at, lines, rungs, td}, out:{st, at}}}},
   written by the props job (weekly.py's apply_espn, from props/build/espn_read.js, which runs espnReadWeek in jsdom),
   with each game's lines already in PAY.sched (ls 'dk', lat, lsr 'espn'). For each game still to come of its week,
   every time before its kickoff: the player block, cleaned by the kept read's rules with no 'late' guard, into
   ESPN_LIVE (unless a press or a kept read put a block of its own there: never replaced), recorded in ESPN_PUB; the
   game-line ids and event into PAY.dk beside any there, never replacing one, in an entry that never carries the
   pull's ids (dkCarries reads the content), dated in ESPN_PUB_IDS. Nothing into ESPN_GL, ESPN_OUT, ESPN_IDAT, the
   kept read, storage or S. Idempotent, and called again by the checks after they change PAY.espn: a block it put
   in before and no longer publishes comes out, with the ids it added; a table a check put in place of PAY.dk is
   the check's own (the ids go only into the table it first merged into). A payload with no read, or one not of
   this shape, installs nothing and throws nothing. The number of games installed */
function espnPubOf(gid,w){ const W=ESPN_PUB[String(w)]; return W&&espnOwn(W,gid)?W[gid]:null; }
/* a block a press or a kept read put in ESPN_LIVE, as against the published one */
function espnPressed(gid,w){ const b=(ESPN_LIVE[String(w)]||{})[gid], P=espnPubOf(gid,w); return !!b&&!(P&&P.block===b); }
/* a game's player lines read (a press, a kept read, or the published read found 'ok' or 'none'); a published
   read of its game lines alone is no player read */
function espnWasRead(gid,w){ const o=ESPN_OUT[gid]; if(o&&(o.st==='ok'||o.st==='none')) return true;
  const g=w==null?((S&&S.sched)||[]).find(x=>x.id===gid):null, P=espnPubOf(gid,w!=null?w:(g?g.w:currentWeek()));
  return !!P&&(P.st==='ok'||P.st==='none'); }
/* the latest player read of any of these games (ms), or null */
function espnLastRead(ids,w){ let t=0;
  for(const id of ids||[]){ const o=ESPN_OUT[id]; if(o&&(o.st==='ok'||o.st==='none')&&isFinite(o.when)&&o.when>t) t=o.when;
    const g=w==null?((S&&S.sched)||[]).find(x=>x.id===id):null, P=espnPubOf(id,w!=null?w:(g?g.w:currentWeek()));
    if(P&&(P.st==='ok'||P.st==='none')&&isFinite(P.when)&&P.when>t) t=P.when; }
  return t||null; }
function espnPublished(){
  const E=PAY&&typeof PAY==='object'?PAY.espn:null;
  const games=E&&typeof E==='object'&&!Array.isArray(E)&&E.v===1&&E.games&&typeof E.games==='object'&&!Array.isArray(E.games)?E.games:{};
  const old=ESPN_PUB, oldAdded=ESPN_PUB_ADDED; let n=0, ch=false;
  ESPN_PUB={}; ESPN_PUB_IDS={}; ESPN_PUB_ADDED={};
  const sched=S&&Array.isArray(S.sched)?S.sched:[];
  /* the table the read's ids go into: the one it first merged into, or (the first time) the payload's own */
  if(!ESPN_PUB_DK&&Object.keys(games).length){ if(!(PAY.dk&&typeof PAY.dk==='object')) PAY.dk=dkPressMade({}); ESPN_PUB_DK=PAY.dk; }
  const ourDk=!!ESPN_PUB_DK&&PAY.dk===ESPN_PUB_DK;
  for(const gid of Object.keys(games)){
    if(!ESPN_KEEP_GID.test(gid)) continue;
    const e=games[gid]; if(!e||typeof e!=='object'||Array.isArray(e)) continue;
    const g=sched.find(x=>x.id===gid); if(!g||String(g.w)!==String(e.w)||gameStarted(g)||hasScore(g)) continue;
    const k=kickoff(g), ko=k?k.getTime():NaN; if(!isFinite(ko)) continue;
    const w=String(g.w), T=x=>{ const t=typeof x==='string'?Date.parse(x):NaN; return isFinite(t)&&t>0&&t<ko?t:null; };
    let block=null, at=null;
    if(e.pl&&typeof e.pl==='object'){ const c=espnKeptGame({w,pl:e.pl,plsig:''},{published:true}), t=c&&c.pl?T(c.pl.at):null; if(t!=null){ block=c.pl; at=t; } }
    const u=e.out&&typeof e.out==='object'?e.out:null, ut=u?T(u.at):null, st=u&&(u.st==='ok'||u.st==='none')&&ut!=null?u.st:null;
    let gl=null;
    if(e.gl&&typeof e.gl==='object'){ const t=T(e.gl.at);
      if(t!=null){ const ids={}; if(e.gl.ids&&typeof e.gl.ids==='object') for(const key of Object.keys(e.gl.ids)) if(ESPN_KEEP_IDKEY.test(key)&&typeof e.gl.ids[key]==='string'&&ESPN_KEEP_ID.test(e.gl.ids[key])) ids[key]=e.gl.ids[key];
        gl={at:t,ids,event:typeof e.gl.event==='string'&&/^\\d{1,15}$/.test(e.gl.event)?e.gl.event:null}; } }
    if(!block&&!st&&!gl) continue;
    /* the same block as before is the same object, so a second call moves nothing */
    const was=old[w]&&espnOwn(old[w],gid)?old[w][gid]:null;
    if(block&&was&&was.block&&JSON.stringify(was.block)===JSON.stringify(block)) block=was.block;
    (ESPN_PUB[w]||(ESPN_PUB[w]={}))[gid]={at,st,when:st?ut:null,block,gl};
    /* the block ESPN_LIVE holds is the one published before where it is that object or a copy of it (a check that keeps
       and puts back the page's state copies it); a press's or a kept read's carries its own read's time, so never is */
    const L=ESPN_LIVE[w]||(ESPN_LIVE[w]={}), cur=espnOwn(L,gid)?L[gid]:null, wasPub=c=>!!c&&!!was&&!!was.block&&(c===was.block||JSON.stringify(c)===JSON.stringify(was.block));
    if(block){ if(!cur||wasPub(cur)){ if(cur!==block){ L[gid]=block; ch=true; } } }
    else if(wasPub(cur)){ delete L[gid]; ch=true; }
    if(gl&&ourDk&&(gl.event||Object.keys(gl.ids).length)){
      const D=PAY.dk, WW=D[w]&&typeof D[w]==='object'?D[w]:(D[w]={}), made=!espnOwn(WW,gid), Ent=made?(WW[gid]=dkPressMade({})):WW[gid];
      const A=ESPN_PUB_ADDED[gid]={w,keys:[],event:false,glat:false,made:made||!!(oldAdded[gid]&&oldAdded[gid].made)}, I=ESPN_PUB_IDS[gid]={};
      const oa=oldAdded[gid]||{keys:[]};
      if(gl.event&&!Ent.event){ Ent.event=gl.event; A.event=true; ch=true; } else if(gl.event&&Ent.event===gl.event&&oa.event) A.event=true;
      for(const key of Object.keys(gl.ids)){ if(Ent[key]==null){ Ent[key]=gl.ids[key]; A.keys.push(key); ch=true; } else if(Ent[key]===gl.ids[key]&&oa.keys.includes(key)) A.keys.push(key);
        if(Ent[key]===gl.ids[key]) I[key]={id:gl.ids[key],at:gl.at}; }
      if(Object.keys(I).length&&!isFinite(Date.parse(Ent.glat))){ Ent.glat=espnIso(gl.at); A.glat=true; ch=true; } else if(oa.glat) A.glat=true; }
    n++;
  }
  /* blocks and ids published before and no longer: taken back out where nothing else has put its own in their place */
  for(const w of Object.keys(old)) for(const gid of Object.keys(old[w])){
    if(ESPN_PUB[w]&&espnOwn(ESPN_PUB[w],gid)) continue;
    const was=old[w][gid], L=ESPN_LIVE[w], c=L&&espnOwn(L,gid)?L[gid]:null;
    if(was&&was.block&&c&&(c===was.block||JSON.stringify(c)===JSON.stringify(was.block))){ delete L[gid]; ch=true; } }
  if(ourDk) for(const gid of Object.keys(oldAdded)){
    if(ESPN_PUB_ADDED[gid]) continue;
    const A=oldAdded[gid], WW=PAY.dk[A.w], Ent=WW&&WW[gid], P=old[A.w]&&old[A.w][gid], G=P&&P.gl; if(!Ent||!G) continue;
    const pressed=ESPN_IDAT[gid]||{};
    for(const key of A.keys) if(Ent[key]===G.ids[key]&&!pressed[key]){ delete Ent[key]; ch=true; }
    if(A.event&&Ent.event===G.event&&!Object.keys(pressed).length){ delete Ent.event; ch=true; }
    if(A.glat&&!Object.keys(Ent).some(key=>/^(team:|game\\|)/.test(key))){ delete Ent.glat; ch=true; }
    if(A.made&&!Object.keys(Ent).length){ delete WW[gid]; ch=true; } }
  if(ch) ESPN_SEQ++;
  return n;
}
window.espnPublished=espnPublished;
window.espnReadWeek=espnReadWeek;
/* any read for a week's games (or this week's), and the latest read time (ms) */
function espnOn(week){""", 'espnPublished and its helpers')

# ---------------------------------------------------------------- the status line
sub1('p3', """  const live=ESPN_LIVE[w]||{}, read=ids.filter(id=>live[id]), lined=ids.filter(id=>ESPN_GL[id]);
  const when=PAY&&PAY.baked_at?' '+espnWhen(PAY.baked_at):'', pub=`Prices as published${when}`;
  /* (app v108) a read this browser kept that gave way wholly, on this load, to prices published since */
  const gave=ids.filter(id=>ESPN_ASIDE[id]&&!live[id]&&!ESPN_GL[id]).length, gaveS=gave?(gid?'your earlier Refresh odds read gave way to prices published since'""",
     """  /* (app v124) read and asked count a press's blocks (and a kept read's), never the published read's */
  const live=ESPN_LIVE[w]||{}, read=ids.filter(id=>espnPressed(id,w)), lined=ids.filter(id=>ESPN_GL[id]);
  /* the published prices: the props job's read of DraftKings' lines on ESPN where the payload carries one for these
     games, the latest read of their player lines (a block's time, or what the read found: 'ok' or 'none'), and the games
     it found no player lines posted for (and none shown); else the publish. A read of a game's lines alone dates
     nothing here: no player price is estimated from it, and a week whose every player read failed while the scoreboard
     answered reads as the publish */
  const pubs=ids.map(id=>espnPubOf(id,w)).filter(Boolean), tPub=Math.max(0,...pubs.map(P=>Math.max(P.at||0,P.when||0)));
  const pubNone=ids.filter(id=>{ const P=espnPubOf(id,w); return !!P&&P.st==='none'&&!live[id]; }).length;
  const when=PAY&&PAY.baked_at?' '+espnWhen(PAY.baked_at):'';
  const pub=pubs.length&&tPub?`DraftKings’ lines as the site read them from ESPN ${espnWhen(tPub)}: player prices estimated from the line`
    +(pubNone?(gid?'; DraftKings had posted no player lines for it when the site read ESPN':`; ${pubNone} game${pubNone===1?'':'s'} had no player lines posted when the site read ESPN`):'')
    :`Prices as published${when}`;
  /* (app v108) a read this browser kept that gave way wholly, on this load, to prices published since */
  const gave=ids.filter(id=>ESPN_ASIDE[id]&&!espnPressed(id,w)&&!ESPN_GL[id]).length, gaveS=gave?(gid?'your earlier Refresh odds read gave way to prices published since'""",
     'espnStatus: the published read')
sub1('p3', """  const asked=ids.filter(id=>ESPN_OUT[id]||live[id]||ESPN_GL[id]), nm=id=>{""",
     """  const asked=ids.filter(id=>ESPN_OUT[id]||espnPressed(id,w)||ESPN_GL[id]), nm=id=>{""", 'espnStatus: asked')
sub1('p3', """  if(failP.length){ const n=failP.length, old=failP.filter(id=>live[id]).length;""",
     """  if(failP.length){ const n=failP.length, old=failP.filter(id=>espnPressed(id,w)).length;""", 'espnStatus: failP')
sub1('p3', """  if(failS.length){ const n=failS.length, old=failS.filter(id=>live[id]||ESPN_GL[id]).length;""",
     """  if(failS.length){ const n=failS.length, old=failS.filter(id=>espnPressed(id,w)||ESPN_GL[id]).length;""", 'espnStatus: failS')

# ---------------------------------------------------------------- prices: the pull hooks and the locked legs
sub1('p3', """function legPrice(l){
  /* (app v107) a leg a Refresh odds press priced goes back to the page's own price once that press no
     longer stands (espnLegBack): after a reload the builder is on the published prices too */
  if(isGameLeg(l)){""", """function legPrice(l){
  /* (app v124) a leg the parlay card's Pull from DraftKings priced (parlayLegs' copy, never S.parlay): DraftKings' own */
  if(l&&l.pulled&&isFinite(+l.pulled.ml)&&+l.pulled.ml!==0) return {ml:+l.pulled.ml,src:'real',pulled:true};
  /* (app v124) a leg of a locked set (spLegIn's kept) is at its locked price through any later publish or press, so the
     builder pays what the locked card says */
  if(l&&l.kept&&l.price!=null&&isFinite(l.price)&&l.price!==0) return {ml:l.price,src:l.src||'est'};
  /* (app v107) a leg a Refresh odds press priced goes back to the page's own price once that press no
     longer stands (espnLegBack): after a reload the builder is on the published prices too */
  if(isGameLeg(l)){""", 'legPrice: pulled and kept')

sub1('p3', """function legFair(l,memo){
  if(!l) return null;
  const pr=legPrice(l);""", """function legFair(l,memo){
  if(!l) return null;
  /* (app v124) a pulled leg's fair chance is the pull's; a locked leg's the one kept at the lock */
  if(l.pulled&&l.pulled.fair&&isFinite(l.pulled.fair.p)&&l.pulled.fair.p>0&&l.pulled.fair.p<1) return {p:+l.pulled.fair.p,est:!!l.pulled.fair.est};
  if(l.kept&&typeof l.kept==='object') return l.kept.fair!=null&&isFinite(l.kept.fair)&&l.kept.fair>0&&l.kept.fair<1?{p:+l.kept.fair,est:!!l.kept.est}:null;
  const pr=legPrice(l);""", 'legFair: pulled and kept')

sub1('p3', """  if(o.src==='dkline'){
    if(!o.listed) return `Not on DraftKings: it lists no such rung. Priced from DraftKings’ line from ESPN, read ${espnWhen(o.at)}; the price is our estimate`;
    return `DraftKings’ line from ESPN, read ${espnWhen(o.at)}; the price is our estimate (${o.tested?ESPN_ERR:'untested on this market: no DraftKings price on file to check it against'})`; }""",
     """  if(o.src==='dkline'){
    /* (app v124) a locked leg keeps no read time */
    const rd=o.at?`, read ${espnWhen(o.at)}`:'';
    if(!o.listed) return `Not on DraftKings: it lists no such rung. Priced from DraftKings’ line from ESPN${rd}; the price is our estimate`;
    return `DraftKings’ line from ESPN${rd}; the price is our estimate (${o.tested?ESPN_ERR:'untested on this market: no DraftKings price on file to check it against'})`; }""",
     'estTitle: no read time')

# ---------------------------------------------------------------- the id rule, by content
sub1('p3', """   DraftKings' betslip takes a leg only by DraftKings' own outcome id, and an id names one outcome at one
   number. PAY.dk holds the ids the price pull read (weekly.py's dk_ids), and Refresh odds adds DraftKings'
   current game-line ids (espnIdAt dates them); a player's line read on ESPN carries none.""",
     """   DraftKings' betslip takes a leg only by DraftKings' own outcome id, and an id names one outcome at one
   number. PAY.dk holds the ids a paid price pull read (weekly.py's dk_ids; since app v124 no job buys prices, so
   none), and a read of ESPN (the props job's published read, a press, the parlay card's check) adds DraftKings'
   current game-line ids (espnIdAt dates them); a player's line read on ESPN carries none.""", 'dk id rule: comment')
sub1('p3', """/* a press on a payload baked before ids makes PAY.dk to hold the game-line ids it read (dkPressMade):
   that payload still carries no ids of the pull's, so it suggests as before */
const DK_PRESS_MADE=new WeakSet();
function dkPressMade(o){ DK_PRESS_MADE.add(o); return o; }
/* the payload carries ids (no l), and for the game of leg l ({week, gid} will do): its week has an entry
   for that game. A game with none is taken as a payload baked before ids is: weekly.py bakes PAY.dk on
   every run, {} from Monday night's final to the next week's first pull, and a level, hand or Elo pick
   must not go empty for three days for want of ids no pull has read yet */
function dkCarries(l){
  if(!(typeof PAY==='object'&&!!PAY&&!!PAY.dk&&typeof PAY.dk==='object'&&!DK_PRESS_MADE.has(PAY.dk))) return false;
  if(!l) return true;
  const W=PAY.dk[String(l.week)], D=W&&typeof W==='object'?W[l.gid]:null;
  return !!D&&typeof D==='object';
}""", """/* a press on a payload baked before ids makes PAY.dk to hold the game-line ids it read (dkPressMade):
   that payload still carries no ids of the pull's, so it suggests as before */
const DK_PRESS_MADE=new WeakSet();
function dkPressMade(o){ DK_PRESS_MADE.add(o); return o; }
/* (app v124) a game's entry carries the pull's ids only where it has the paid pull's time (at) or a player's key
   (the parlay card's dkHasPlayer rule): an entry a read made (the published read, a press, the card's check) holds
   only event, glat and the game lines' ids, so it never does, and a JSON copy of the table keeps the rule */
function dkEntryCarries(D){ return !!D&&typeof D==='object'&&((D.at!=null&&D.at!=='')||Object.keys(D).some(k=>!/^(team:|game\\|)/.test(k)&&!['event','at','glat'].includes(k))); }
/* the payload carries ids (no l), and for the game of leg l ({week, gid} will do): its week has an entry
   for that game that carries the pull's ids (dkEntryCarries). A game with none is taken as a payload baked
   before ids is: weekly.py bakes PAY.dk {} on every run since app v124 (no job buys prices), and a press over
   it (until app v124, which wrote an entry that counted) emptied every level, hand and Elo pick of its game */
function dkCarries(l){
  if(!(typeof PAY==='object'&&!!PAY&&!!PAY.dk&&typeof PAY.dk==='object'&&!DK_PRESS_MADE.has(PAY.dk))) return false;
  if(!l) return true;
  const W=PAY.dk[String(l.week)], D=W&&typeof W==='object'?W[l.gid]:null;
  return dkEntryCarries(D);
}""", 'dkCarries: by content')
sub1('p3', """/* a Sunday kickoff before 4pm Eastern (g.d and g.t are Eastern): oddsfetch.py's early_sunday(), whose
   games are never bought player prices, so never given DraftKings' player ids */""",
     """/* a Sunday kickoff before 4pm Eastern (g.d and g.t are Eastern): oddsfetch.py's early_sunday(), whose
   games were never bought player prices. Dormant since app v124 (no job buys prices; nothing calls it) */""",
     'dkEarlySunday: dormant')
sub1('p3', """/* every line this week with a real sportsbook price, team bets and players, unjudged, and (app v107)
   every player leg of a tested kind priced from DraftKings' line read by Refresh odds where the pull has
   no price for it or its line has moved since""", """/* every line this week with a real sportsbook price, team bets and players, unjudged, and (app v107)
   every player leg of a tested kind priced from DraftKings' line read on ESPN (the props job's published read,
   or a press) where no paid price is on file for it or its line has moved since""", 'pricedLegs: comment')

# ---------------------------------------------------------------- the empty reasons
sub1('p3', """/* why a tier is empty, in the reader's terms: the picks do not make that many legs (one a player,
   one side and one total a game), since every level shows a parlay whenever they do. A player leg needs the
   book's price, and a game's player prices are pulled on game day or the day before: Thursday's
   game on Thursday, Monday's on Monday, a Friday game's on Thursday, and Saturday's games and
   Sunday's afternoon and night games on Saturday morning (on the site by about 7:50am Pacific);
   Sunday's early games, before 4pm Eastern, never (oddsfetch.py's early_sunday). With player bets
   ticked and none of the ticked games priced yet, that is the reason, and the tier says so rather
   than ask for more ticks (under Players only no tick would help). c: which of the two kinds are ticked */
const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
/* (app v109) player legs priced on the ticked games, and none with a DraftKings id: a line read by Refresh
   odds carries none, and DraftKings' own come only with the prices the pull buys */
const PB_PULLED='pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET)';
const PB_NO_ID='no player legs DraftKings’ betslip can take yet: a player’s line read by Refresh odds carries no DraftKings id (ESPN gives none for it), and DraftKings’ own ids come with its prices, which are '+PB_PULLED+'.';
/* (app v107) once Refresh odds has read the ticked games, a game with no player leg is one DraftKings had
   posted no player lines for: a line read is priced here by estimate, so the reason is the lines */
function pbNoPl(){ const at=espnLatest(currentWeek());
  return `no player lines yet: DraftKings had posted none for these games when Refresh odds last read them from ESPN${at?` (${espnWhen(at)})`:''}; DraftKings’ own prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`; }""",
     """/* why a tier is empty, in the reader's terms: the picks do not make that many legs (one a player,
   one side and one total a game), since every level shows a parlay whenever they do. A player leg needs
   DraftKings' line, read from ESPN (since app v124 by the props job on every run, and by a press), priced by
   our estimate. With player bets ticked and no player line on the ticked games, that is the reason, and the
   tier says so rather than ask for more ticks (under Players only no tick would help). c: which of the two kinds
   are ticked, and the ticked games' ids */
/* (app v109, dormant since app v124: a payload whose bake wrote paid ids) player legs priced on the ticked games,
   and none with a DraftKings id */
const PB_NO_ID='no player legs DraftKings’ betslip can take: a player’s line read from ESPN carries no DraftKings id.';
/* (app v124) no player line on these games (ids; none: the week's games still to come): DraftKings had posted none
   when its lines were last read from ESPN (the published read or a press, espnLastRead), or they have not been read */
function pbNoPl(ids){ const at=espnLastRead(ids||pbGames().map(g=>g.id));
  return at?`no player lines yet: DraftKings had posted none for these games when its lines were last read from ESPN (${espnWhen(at)}). Press Refresh odds to read them now.`
    :'no player lines yet: DraftKings’ lines for these games have not been read from ESPN yet. Press Refresh odds to read them now.'; }""",
     'PB_NO_PL, PB_PULLED, PB_NO_ID, pbNoPl')
sub1('p3', """  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:(c.espn?pbNoPl():PB_NO_PL); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""",
     """  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:pbNoPl(c.ids); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""",
     'pbWhy')
sub1('p3', """  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats),
    espn:games.some(g=>ESPN_OUT[g.id]&&(ESPN_OUT[g.id].st==='ok'||ESPN_OUT[g.id].st==='none'))};""",
     """  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats),
    espn:games.some(g=>espnWasRead(g.id,g.w)),ids:games.map(g=>g.id)};""", 'pbBuild: was it read')

sub1('p3', """/* (app v109) why a hand is empty where DraftKings' ids left legs out: a hand takes only legs DraftKings'
   betslip can take, and a game's player ids come with its player prices, which are not pulled yet, or
   never for Sunday's early games; with them in, its other lines DraftKings had no id for */
function gameNoIdWhy(g,n){
  const D=((PAY.dk||{})[String(g.w)]||{})[g.id]||{}, pl=!!D.at||Object.keys(D).some(k=>!/^(team:|game\\|)/.test(k)&&!['event','at','glat'].includes(k));
  const head=`Only legs DraftKings’ betslip can take are suggested here, and this game does not have enough of them for ${n} legs`;
  if(pl) return `${head}: DraftKings had no id for its other lines when its prices were read.`;
  if(dkEarlySunday(g)) return `${head}: DraftKings’ player ids come with its player prices, which are never pulled for Sunday’s early games (before 4pm ET).`;
  return `${head} yet: DraftKings’ player ids come with its player prices, which are ${PB_PULLED}.`;
}""", """/* (app v109, dormant since app v124: only a payload whose bake wrote paid ids) why a hand is empty where
   DraftKings' ids left legs out: a hand takes only legs DraftKings' betslip can take, and a player's line read from
   ESPN carries no id */
function gameNoIdWhy(g,n){
  return `Only legs DraftKings’ betslip can take are suggested here, and this game does not have enough of them for ${n} legs: a player’s line read from ESPN carries no DraftKings id.`;
}""", 'gameNoIdWhy')

sub1('p3', """  out.espnRead=games.some(g=>ESPN_OUT[g.id]&&(ESPN_OUT[g.id].st==='ok'||ESPN_OUT[g.id].st==='none'));""",
     """  out.espnRead=games.some(g=>espnWasRead(g.id,g.w));""", 'pbTopBuild: was it read')
sub1('p3', """  if((u.k.over||u.k.under)&&r.noPlayerPrices){ const np=r.plNoId?PB_NO_ID:(r.espnRead?pbNoPl():PB_NO_PL);""",
     """  if((u.k.over||u.k.under)&&r.noPlayerPrices){ const np=r.plNoId?PB_NO_ID:pbNoPl(pbGames().filter(g=>!u.off.includes(g.id)).map(g=>g.id));""",
     'pbTopWhy')

sub1('p3', """  const dkLegs=r.rows.filter(l=>l.src==='dkline'), espnW=espnOn(w);""", """  const dkLegs=r.rows.filter(l=>l.src==='dkline');""", 'pbPanel: espnW')
sub1('p3', """  if(dkLegs.length) notes.push(`A player line marked est. is priced from DraftKings’ line read on ESPN by Refresh odds, where DraftKings’ own price is not on file or its line has moved since: ${esc(""",
     """  if(dkLegs.length) notes.push(`A player line marked est. is priced from DraftKings’ line read on ESPN: ${esc(""", 'pbPanel: the est. note')
sub1('p3', """  if(noIdNote) notes.push(`No player line on your picks can go on DraftKings’ betslip yet, so the list below has no player lines: ${PB_NO_ID.replace(/^no player legs DraftKings’ betslip can take yet: /,'')}`);
  else if(r.noPlayerPrices&&r.rows.length) notes.push(r.espnRead?`No player lines are in yet for your picks, so the list below has none: ${pbNoPl().replace(/^no player lines yet: /,'')}`:'Player prices are not in yet for your picks, so the list below has no player lines: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).');
  if(r.far) notes.push(`${r.far} line${r.far===1?' is':'s are'} left out: the model rates ${r.far===1?'it':'each'} ${Math.round(FAR_OFF*100)} points or more above the book’s fair chance (DraftKings’ prices with the margin taken out${r.farDk?`, or for ${r.farDk===r.far?(r.far===1?'it, priced':'each, priced'):(r.farDk===1?'the one':'the '+r.farDk)} from DraftKings’ line read by Refresh odds and marked est., our estimate of it`:''}), and its edges that large have not held up this season. ${r.far===1?'It is':'They are'} still on the game pages, flagged far off the market.`);""",
     """  if(noIdNote) notes.push(`No player line on your picks can go on DraftKings’ betslip yet, so the list below has no player lines: ${PB_NO_ID.replace(/^no player legs DraftKings’ betslip can take: /,'')}`);
  else if(r.noPlayerPrices&&r.rows.length) notes.push(`No player lines are in yet for your picks, so the list below has none: ${pbNoPl(games.filter(g=>!u.off.includes(g.id)).map(g=>g.id)).replace(/^no player lines yet: /,'')}`);
  if(r.far) notes.push(`${r.far} line${r.far===1?' is':'s are'} left out: the model rates ${r.far===1?'it':'each'} ${Math.round(FAR_OFF*100)} points or more above the book’s fair chance (DraftKings’ prices with the margin taken out${r.farDk?', or, for a line marked est., our estimate of them from DraftKings’ line read on ESPN':''}), and its edges that large have not held up this season. ${r.far===1?'It is':'They are'} still on the game pages, flagged far off the market.`);""",
     'pbPanel: no player lines and far off')
sub1('p3', """  if(noneN) notes.push(`${noneN} line${noneN===1?' is':'s are'} left out: the list takes only lines DraftKings’ betslip can take, by DraftKings’ own id at the line, and DraftKings has none for ${noneN===1?'it':'them'} yet${nonePl?`. A player’s line read by Refresh odds carries no id (ESPN gives none for it); DraftKings’ own player ids come with its prices, which are ${PB_PULLED}`:''}. ${noneN===1?'It is':'They are'} still on the game pages, where you can add ${noneN===1?'it':'them'} to the builder.`);""",
     """  if(noneN) notes.push(`${noneN} line${noneN===1?' is':'s are'} left out: the list takes only lines DraftKings’ betslip can take, by DraftKings’ own id at the line, and DraftKings has none for ${noneN===1?'it':'them'}${nonePl?'. A player’s line read from ESPN carries no id':''}. ${noneN===1?'It is':'They are'} still on the game pages, where you can add ${noneN===1?'it':'them'} to the builder.`);""",
     'pbPanel: noneN')
sub1('p3', """    <p class="muted pb-foot">Every line has a real sportsbook price${espnW?' (or, marked est., DraftKings’ line read by Refresh odds at our estimate of its price, on main lines, touchdowns and yards ladders, the markets the estimate has been checked on)':''} and a model chance between 45% and 97%,""",
     """    <p class="muted pb-foot">Every line has DraftKings’ own price or, marked est., DraftKings’ line read from ESPN at our estimate of its price (on main lines, touchdowns and yards ladders, the markets the estimate has been checked on), and a model chance between 45% and 97%,""",
     'pbPanel: the foot')

sub1('p3', """/* when a prime-time game's player prices (and DraftKings' ids with them) are pulled: Thursday's and
   Monday's on the day, Sunday night's on Saturday morning (props.yml's pulls) */
function spPulled(g){ const d=spDow(g); return d===4?'on Thursday, the day of the game':d===1?'on Monday, the day of the game':d===0?'on Saturday morning':PB_PULLED; }
/* why a level of one unit has no parlay: the unit does not make that many legs, and why */
function spWhy(n,pool,g){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]), where=g.slot?'the Sunday slot':'this game';
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  if(!pool.plGames){
    if(g.slot) return `${what}, and no player ${pool.plNoId?'leg DraftKings’ betslip can take':'prices'} yet: the afternoon games’ are pulled on Saturday morning, and never the early games’ (before 4pm ET).`;
    const read=ESPN_OUT[g.id]&&(ESPN_OUT[g.id].st==='ok'||ESPN_OUT[g.id].st==='none');
    const np=pool.plNoId?`no player leg DraftKings’ betslip can take yet: a player’s line read by Refresh odds carries no DraftKings id, and DraftKings’ own come with its player prices, which for this game are pulled ${spPulled(g)}.`
      :read?`no player lines yet: DraftKings had posted none for it when Refresh odds last read it, and its own player prices are pulled ${spPulled(g)}.`
      :`no player prices yet: they are pulled ${spPulled(g)}.`;
    return `${what}, and ${np}`; }""", """/* (app v124) why a unit has no player line: DraftKings had posted none when its lines were last read from ESPN (the
   published read or a press), or they have not been read; on a payload whose bake wrote paid ids (dormant), none
   with an id */
function spNoPl(g){ const t=espnLastRead(spGamesOf(g).map(x=>x.id));
  if(g.slot) return t?`no player lines yet: DraftKings had posted none for its games when their lines were last read from ESPN (${espnWhen(t)}).`
    :'no player lines yet: DraftKings’ lines for its games have not been read from ESPN yet.';
  return t?`no player lines yet: DraftKings had posted none for it when its lines were last read from ESPN (${espnWhen(t)}).`
    :'no player lines yet: its DraftKings lines have not been read from ESPN yet.'; }
/* why a level of one unit has no parlay: the unit does not make that many legs, and why */
function spWhy(n,pool,g){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]), where=g.slot?'the Sunday slot':'this game';
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  if(!pool.plGames) return `${what}, and ${pool.plNoId?'no player leg DraftKings’ betslip can take: a player’s line read from ESPN carries no DraftKings id.':spNoPl(g)}`;""",
     'spPulled, spWhy')
sub1('p3', """    if(s&&!s.plGames){ const when=u.slot?'the afternoon games’ are pulled on Saturday morning, and never the early games’ (before 4pm ET)':`they are pulled ${spPulled(u)}`;
      r={...r,tiers:r.tiers.map(t=>t.legs?t:{...t,why:`No player ${s.plNoId?'leg DraftKings’ betslip can take':'prices'} ${u.slot?'in the Sunday slot':'in this game'} yet: ${when}.`})}; } }""",
     """    if(s&&!s.plGames){ const where=u.slot?'in the Sunday slot':'in this game', t=espnLastRead(spGamesOf(u).map(x=>x.id));
      const why=s.plNoId?`No player leg DraftKings’ betslip can take ${where}: a player’s line read from ESPN carries no DraftKings id.`
        :`No player lines ${where} yet: `+(t?`DraftKings had posted none${u.slot?' for its games':''} when ${u.slot?'their':'its'} lines were last read from ESPN (${espnWhen(t)}).`
          :(u.slot?'DraftKings’ lines for its games have not been read from ESPN yet.':'its DraftKings lines have not been read from ESPN yet.'));
      r={...r,tiers:r.tiers.map(x=>x.legs?x:{...x,why})}; } }""", 'spEloSet: no player lines')

sub1('p3', """  const tot=l.stat==='total', team=String(l.team||''), pl=S.players&&S.players[l.pid];
  return {key:legKey(l.gid,l.pid,l.stat),gid:l.gid,pid:l.pid,stat:l.stat,k:+l.k,side:l.side==='under'?'under':'over',main:!!l.main,p,price,src:typeof l.src==='string'?l.src:'real',""",
     """  const tot=l.stat==='total', team=String(l.team||''), pl=S.players&&S.players[l.pid];
  /* (app v124) kept: the leg is at its locked price and fair chance through any later publish or press (legPrice,
     legFair), so Add to builder pays what the locked card says; the record's own shape is untouched */
  const kf=l.fair!=null&&isFinite(+l.fair)&&+l.fair>0&&+l.fair<1?+l.fair:null;
  return {key:legKey(l.gid,l.pid,l.stat),gid:l.gid,pid:l.pid,stat:l.stat,k:+l.k,side:l.side==='under'?'under':'over',main:!!l.main,p,price,src:typeof l.src==='string'?l.src:'real',
    kept:{fair:kf,est:!!l.fair_est},""", 'spLegIn: kept')

sub1('p3', """  return `<small class="dkslip" data-dkslip="${i+1}">Not on DraftKings’ slip yet: ${esc(x.brief||x.why||'')}</small>`;""",
     """  return `<small class="dkslip" data-dkslip="${i+1}">Not on DraftKings’ slip: ${esc(x.brief||x.why||'')}</small>`;""", 'dkSlipLine')

# ---------------------------------------------------------------- boot
sub1('p3', """  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  /* (app v108) a Refresh odds read this browser kept, where it still stands: before the first draw, no request */
  try{ espnRestore(); }catch(e){ console.error(e); }""", """  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  /* (app v124) the props job's read of DraftKings' lines on ESPN, published with the payload: outside NO_BAKED, so
     the audit sees what a visitor sees, and before the kept read, which it may outrank */
  try{ espnPublished(); }catch(e){ console.error(e); }
  /* (app v108) a Refresh odds read this browser kept, where it still stands: before the first draw, no request */
  try{ espnRestore(); }catch(e){ console.error(e); }""", 'boot: the published read')
sub1('p3', """/* the balance the last build published. It is exact except while a pull is running:
   credits only move when a build spends them, and every build republishes this file.
   The page cannot ask the odds API itself, because the page is public and the key
   would have to be in it. */""", """/* the balance the last build published (the hidden Weekly Update tab's credit panel; since app v124 no build buys
   prices, so it stands as the last paid pull left it). The public page never asks the odds API itself: only the
   admin's browser does, through the hub's HUB_ADMIN, which alone holds the key */""", 'credits comment')

# main's app v121 (#304): the Sunday slot's levels one game a parlay, and their reason (spWhySlot) on the read too
sub1('p3', """function spWhySlot(n,per){""", """function spWhySlot(n,per,u){""", 'spWhySlot: the unit')
sub1('p3', """  if(!pl) return `${what}, and no player ${plNoId?'leg DraftKings’ betslip can take':'prices'} yet: the afternoon games’ are pulled on Saturday morning, and never the early games’ (before 4pm ET).`;""",
     """  if(!pl) return `${what}, and ${plNoId?'no player leg DraftKings’ betslip can take: a player’s line read from ESPN carries no DraftKings id.':spNoPl(u)}`;""", 'spWhySlot: on the read')
sub1('p3', """    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per)}; });""", """    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per,u)}; });""", 'spWhySlot: the build passes the unit')
sub1('p3', """  return best||{id,label,n,floor,why:spWhySlot(n,per)};""", """  return best||{id,label,n,floor,why:spWhySlot(n,per,u)};""", 'spWhySlot: the rebuild passes the unit')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v124, the published ESPN read, the id rule by content, the pull hooks, the locked legs, the wording')
