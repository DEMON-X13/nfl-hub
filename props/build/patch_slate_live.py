"""Live scores on the Games tab, with the refresh control the live tracker has.

The app has read ESPN's public scoreboard since the live-tracking block went into
part2.js, but only the Saved parlays list ever asked it anything. The Games tab knew a
game had kicked off -- it put a LIVE pill where the kickoff time had been -- and then
said nothing at all about it until the next scheduled run folded nflverse's stats in,
hours later. So the one page you open during the games was the one page with no score
on it.

The same three controls the live tracker uses now sit in the Games bar: a Refresh
scores button, an interval that starts at off, and a stamp saying when the scores were
last read. Off by default, and polling only while the tab is in front, for the reason
it is off on the live page too -- an iPad should not sit hammering ESPN in a pocket.

A started game's card carries the score where the kickoff time was, the quarter and
clock beside it, and the live score next to the expected one so the model's number and
the real one read together. Nothing is written: LIVE has always sat outside S, because
a scoreboard belongs to ESPN and settlement still comes from nflverse on the next run.

Only the scoreboard is fetched for the slate -- one call for the whole week -- since a
game card shows a score and not a stat line. Box scores are still fetched for parlay
legs alone, which is what they are for.
"""
import io

def sub1(path, old, new):
    s = io.open(path, encoding='utf-8').read()
    n = s.count(old)
    assert n == 1, '%s: expected 1, found %d of %r' % (path, n, old[:70])
    io.open(path, 'w', encoding='utf-8').write(s.replace(old, new))

# ---------- the controls, in the Games bar
sub1('part1.html',
"""      <span class="rec" id="seasonRec" title="The model's side of every sportsbook main line this season, graded from the numbers frozen before kickoff"></span>
      <span class="grow"></span>
    </div>""",
"""      <span class="rec" id="seasonRec" title="The model's side of every sportsbook main line this season, graded from the numbers frozen before kickoff"></span>
      <span class="grow"></span>
      <span class="livestamp"><span class="livedot" id="slateDot"></span><span id="slateStamp">scores off</span></span>
      <label class="muted">Scores <select id="slateEvery">
        <option value="0" selected>off</option><option value="30">every 30s</option><option value="60">every 60s</option>
      </select></label>
      <button class="btn quiet" id="slateNow" title="Read the scoreboard from ESPN now. Free: no odds-API credits, no job.">Refresh scores</button>
    </div>""")

# ---------- a little styling for the stamp, beside the existing chips
sub1('part1.html',
""".finchip.live{background:#FCF1D6;color:#8A5E05;border-color:#E8D49A}""",
""".finchip.live{background:#FCF1D6;color:#8A5E05;border-color:#E8D49A}
.livestamp{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.livedot{width:8px;height:8px;border-radius:50%;background:var(--line-2);display:inline-block}
.livedot.on{background:var(--pick);box-shadow:0 0 8px rgba(27,122,78,.6)}
.livedot.bad{background:var(--miss)}
.when .sc{display:block;font-family:var(--display);font-weight:700;font-size:15px;letter-spacing:-.3px;font-variant-numeric:tabular-nums}
.when .cl{display:block;font-size:11px;color:#8A5E05;font-weight:600}
.tot .lv,.totpts .lv{display:block;font-size:11px;color:#8A5E05;font-weight:600;font-variant-numeric:tabular-nums}""")

# ---------- the slate asks for the scoreboard too
sub1('part3.js',
"""const liveWanted=()=>{                                   /* every game an unsettled parlay needs */""",
"""/* the week on screen, which is not always the live one: someone reading week 1 in
   October wants that week's scoreboard, and gets an empty one, which is correct */
const slateWeek=()=>+$('weekSel')?.value||currentWeek();
/* every game the Games tab wants a score for: started, not yet final */
const liveSlateWanted=()=>{
  const ids=new Set(); if(!LIVE.slate) return ids;
  for(const g of gamesIn(slateWeek())) if(gameStarted(g)&&!gameFinal(g)) ids.add(g.id);
  return ids;
};
const liveWanted=()=>{                                   /* every game an unsettled parlay needs */""")

sub1('part3.js',
"""let LIVE={at:0,games:{},box:{},err:null,busy:false,on:false};""",
"""let LIVE={at:0,games:{},box:{},err:null,busy:false,on:false,slate:false};""")

# ---------- refresh: the scoreboard covers both, box scores are for legs only
sub1('part3.js',
"""async function liveRefresh(){
  if(LIVE.busy) return; const want=liveWanted(); if(!want.size){ LIVE.on=false; return; }
  LIVE.busy=true;
  try{
    const sb=await liveGet(`${ESPN_SB}?seasontype=2&week=${currentWeek()}&dates=${SEASON}`);""",
"""async function liveRefresh(){
  if(LIVE.busy) return;
  const want=liveWanted(), slate=liveSlateWanted();
  if(!want.size&&!LIVE.slate){ LIVE.on=false; return; }
  LIVE.busy=true; slateDot(true);
  try{
    /* one scoreboard call covers the week, whoever asked for it. A game card wants a
       score and not a stat line, so the slate never costs a box score. */
    const wk=LIVE.slate?slateWeek():currentWeek();
    const sb=await liveGet(`${ESPN_SB}?seasontype=2&week=${wk}&dates=${SEASON}`);""")

sub1('part3.js',
"""  }finally{ LIVE.busy=false; }
  if($('savedCard')) renderParlay();
}""",
"""  }finally{ LIVE.busy=false; slateDot(false); }
  if($('savedCard')) renderParlay();
  if(LIVE.slate) renderSlate();
  slateStamp();
}
function slateDot(busy){ const d=$('slateDot'); if(d) d.classList.toggle('on',!!busy); }
function slateStamp(){
  const el=$('slateStamp'), d=$('slateDot'); if(!el) return;
  if(d) d.classList.toggle('bad',!!LIVE.err);
  el.textContent=!LIVE.slate?'scores off'
    :(LIVE.err?'scores not loading'
      :(LIVE.at?'scores '+new Date(LIVE.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'})
        :'reading\\u2026'));
}""")

# ---------- the card: the score where the kickoff time was
sub1('part3.js',
"""      <div class="when"><b>${d.day}</b>${fin?'<span class="pill ok">FINAL</span>':(started?'<span class="pill warn">LIVE</span>':d.t)}</div>""",
"""      <div class="when"><b>${d.day}</b>${fin?'<span class="pill ok">FINAL</span>':(started?liveWhen(g):d.t)}</div>""")

sub1('part3.js',
"""      <div class="tot"><b>${ca.implied.toFixed(0)} \\u2013 ${ch.implied.toFixed(0)}</b><small>${g.a} / ${g.h}</small>${hasScore(g)?`<small class="act">(actual ${g.as} \\u2013 ${g.hs})</small>`:''}</div>""",
"""      <div class="tot"><b>${ca.implied.toFixed(0)} \\u2013 ${ch.implied.toFixed(0)}</b><small>${g.a} / ${g.h}</small>${hasScore(g)?`<small class="act">(actual ${g.as} \\u2013 ${g.hs})</small>`:liveScoreLine(g)}</div>""")

# ---------- the two helpers the card calls
sub1('part3.js',
"""function liveStop(){ if(LIVE_TIMER){ clearInterval(LIVE_TIMER); LIVE_TIMER=null; } }""",
"""/* a started game's card: the score where the kickoff time was, with the clock under it.
   Falls back to the LIVE pill when the scoreboard has not been read yet, which is what
   the card said before there was a scoreboard to read. */
function liveWhen(g){
  const s=LIVE.slate?LIVE.games[g.id]:null;
  if(!s||s.as==null||s.hs==null) return '<span class="pill warn">LIVE</span>';
  return `<span class="sc">${esc(g.a)} ${num(s.as,0)}\\u2013${num(s.hs,0)} ${esc(g.h)}</span>`
    +(s.clock?`<span class="cl">${esc(s.clock)}</span>`:'');
}
/* the live score next to the expected one, so the model's number and the real one read
   together while the game is on */
function liveScoreLine(g){
  const s=LIVE.slate?LIVE.games[g.id]:null;
  if(!s||s.as==null||s.hs==null||s.state==='pre') return '';
  return `<small class="lv">live ${num(s.as,0)} \\u2013 ${num(s.hs,0)}</small>`;
}
function liveStop(){ if(LIVE_TIMER){ clearInterval(LIVE_TIMER); LIVE_TIMER=null; } }""")

# ---------- polling honours whichever interval the Games tab asked for
sub1('part3.js',
"""function liveStart(){
  liveStop();
  if(!LIVE.on) return;
  /* only while the tab is in front: an iPad should not poll in someone's pocket */
  LIVE_TIMER=setInterval(()=>{ if(document.visibilityState==='visible') liveRefresh(); },30000);
  liveRefresh();
}""",
"""function liveStart(){
  liveStop();
  if(!LIVE.on&&!LIVE.slate) return;
  /* only while the tab is in front: an iPad should not poll in someone's pocket */
  const every=(LIVE.slate&&+($('slateEvery')?.value||0))||(LIVE.on?30:0);
  if(every) LIVE_TIMER=setInterval(()=>{ if(document.visibilityState==='visible') liveRefresh(); },every*1000);
  liveRefresh();
}""")

# ---------- wiring, alongside the week selector
sub1('part3.js',
"""['trackMarket','trackKind'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change',renderTrack); });""",
"""/* the Games tab's own scores: off until asked, then read once or on an interval */
$('slateNow')?.addEventListener('click',()=>{ LIVE.slate=true; LIVE.err=null; slateStamp(); liveRefresh(); });
$('slateEvery')?.addEventListener('change',()=>{
  const every=+($('slateEvery').value||0);
  if(every){ LIVE.slate=true; LIVE.err=null; liveStart(); }
  else { liveStop(); if(LIVE.on) liveStart(); slateStamp(); }
});
['trackMarket','trackKind'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change',renderTrack); });""")

print('patched part1.html and part3.js')
