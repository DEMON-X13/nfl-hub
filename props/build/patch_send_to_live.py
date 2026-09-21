"""Saved parlays are sent to the live page, and the live page watches only what was sent.

The live page read every saved parlay out of this browser and showed it, so it filled up
with everything the prop model had ever locked and the only way to shape it was to delete
afterwards. It is a watchlist, so it is now built the other way round: a saved parlay
appears there once it has been sent, and the Saved parlays card has a green button that
sends the ones that are not on it yet.

The button counts rather than guesses. A parlay is on the live page when its id is in the
sent set and not in the deleted set beside it, so a parlay deleted over there is offered
again here, which is the only way back from a delete. Sending is idempotent twice over:
by id, and by the legs themselves, so the same parlay saved under two ids is sent once.

The card also carries a link to the live page, since sending somewhere you cannot then
open is only half the job.

Only the sent set is touched. The corrected lines and the deletions in that key belong to
the live page, and nothing here writes to the betting model's key at all. The writer sits
above the live-tracking banner because everything below it is lifted into the live page,
which may read its own key and must not carry a writer for anybody's.
"""
import io
p2='part2.js'
s=io.open(p2,encoding='utf-8').read()

# placed above the live-tracking banner on purpose: everything below it as far as the track
# record is lifted into the live page by liveparlays/build/build.js, and the live page must
# not carry a writer for a key it is only allowed to read its own half of
old="/* ---------- live tracking: ESPN's public feeds ----------"
new = """/* ---------- the live page's watchlist, written across ----------
   One origin serves both, so its key is writable here. Only the sent set is ours: the
   corrected lines and the deletions beside it are the live page's own and are read and
   written back untouched. */
const LIVE_PARLAY_KEY='live_parlays_v1';
function liveWatch(){
  let v=null; try{ v=JSON.parse(localStorage.getItem(LIVE_PARLAY_KEY)||'null'); }catch(e){}
  if(!v||typeof v!=='object') v={};
  return {...v,
    lines:(v.lines&&typeof v.lines==='object')?v.lines:{},
    removed:(v.removed&&typeof v.removed==='object')?v.removed:{},
    sent:(v.sent&&typeof v.sent==='object')?v.sent:{}};
}
const liveKeyOf=p=>'prop|'+p.id;
/* on the live page: sent, and not deleted over there since */
function liveHas(p,w){ w=w||liveWatch(); const k=liveKeyOf(p); return !!w.sent[k]&&!w.removed[k]; }
/* the same legs are the same parlay, whatever id it was saved under */
const liveLegPrint=p=>(p.legs||[]).map(l=>[l.gid,l.stat,l.k,l.side||'over'].join('|')).sort().join(' + ');
/* returns how many were sent, or -1 if this browser refused to store it */
function sendToLive(ps){
  const w=liveWatch(); let n=0;
  const already=new Set();
  for(const p of (S.saved||[])) if(liveHas(p,w)) already.add(liveLegPrint(p));
  for(const p of ps){
    if(!p||!p.id||!(p.legs||[]).length) continue;
    if(liveHas(p,w)) continue;
    const print=liveLegPrint(p); if(already.has(print)) continue;
    w.sent[liveKeyOf(p)]=1; delete w.removed[liveKeyOf(p)]; already.add(print); n++;
  }
  try{ localStorage.setItem(LIVE_PARLAY_KEY,JSON.stringify(w)); }catch(e){ return -1; }
  return n;
}

/* ---------- live tracking: ESPN's public feeds ----------"""
assert s.count(old)==1
s=s.replace(old,new)

old="const APP_BUILD='app v60 \\u00b7 2026-09-21';"
new="const APP_BUILD='app v61 \\u00b7 2026-09-21';"
assert s.count(old)==1
io.open(p2,'w',encoding='utf-8').write(s.replace(old,new))

p3='part3.js'
s=io.open(p3,encoding='utf-8').read()

# the green button, in the card's heading beside the count
old="""  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span>${lvBar}</h2>`;"""
new="""  /* which of these the live page is watching, so the button can count rather than guess */
  const watch=liveWatch(), onLive=list.filter(p=>liveHas(p,watch)).length, toSend=list.length-onLive;
  const sendBtn=!list.length?'':(toSend
    ? `<button class="btn go" id="sendLive" title="Put these on the live page, where they are followed while the games are on">Send ${toSend} to Live Parlays</button>`
    : `<button class="btn quiet" id="sendLive" disabled>All on Live Parlays</button>`)
    +(list.length?` <a class="muted" style="font-size:12px" href="../liveparlays/" target="_blank" rel="noopener">open \u2197</a>`:'');
  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span>${sendBtn}${lvBar}</h2>`;"""
assert s.count(old)==1
s=s.replace(old,new)

# and a mark on each one that is already there
old="""        <span class="muted" style="font-size:12px">week ${p.week} \\u00b7 saved ${p.saved.slice(0,10)}</span>"""
new="""        ${liveHas(p,watch)?'<span class="pill">sent</span>':''}
        <span class="muted" style="font-size:12px">week ${p.week} \\u00b7 saved ${p.saved.slice(0,10)}</span>"""
assert s.count(old)==1
s=s.replace(old,new)

old="""function wireSaved(){"""
new="""function wireSaved(){
  $('sendLive')?.addEventListener('click',()=>{
    const n=sendToLive(S.saved||[]);
    if(n<0) log('This browser would not let anything be stored, so nothing was sent.','err');
    else log(n?`${n} parlay${n===1?'':'s'} sent to the live page.`:'Those parlays are already on the live page.','ok');
    renderParlay(); });"""
assert s.count(old)==1
io.open(p3,'w',encoding='utf-8').write(s.replace(old,new))
print('send to live; app v61')
