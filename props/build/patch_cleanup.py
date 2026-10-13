"""app v75: the dead weight a cleanup sweep found, and the strips the Bets and Stats build made.

Nothing a visitor to the Bets and Stats page sees changes, apart from two sentences that
pointed at things no longer on it. What goes:

  * fairLine() and mlToProb() and the odds-helpers header over it. Nothing called either:
    mlProb is the helper in use, and fairLine was kept only because the audit named it.
  * The Suggested parlays card's minimise mode. Since the card moved into a window it is
    always open and always has a Close button, so the inModal switch, the ' min' class, the
    Minimize button and its listener, S.ui.suggestMin and the .sugg.min rule were all for a
    card that no longer exists. suggestCard() takes no argument now.
  * gameHeadline()'s frozen branch: frozen was the constant false. A finished game already
    returns its kept headline from S.headlines, so the live projection is the only path.
  * renderGame()'s locked leftovers. The locked view ends with continue, so the betting rows
    after it only ever run unlocked, yet they still carried result marks, hit and miss row
    classes and an "actual" chip for a locked game. The rows are now just their inputs. The
    .res and tr.hit/tr.miss styles stay: the Game bets card still draws them.
  * S.accuracy: built by gradeGame() with a second pass over every graded player, and read by
    nothing since #accTable and How It Works were retired. gradeGame() now only freezes what
    was on screen, so it no longer needs the stat rows. A browser that saved the key keeps a
    dead one until its next rebuild, which is harmless.
  * Fields written and never read: the fresh state's season and week (boot compares only the
    builds and the data stamp), gameCtx()'s hasLine, project()'s count, parlayProb()'s
    shrunk, the game tiers' mult, ingestOdds()'s quiet flag and its unmatched-name and
    unmatched-market sets, and the kind argument of the Game bets card's row().
  * CSS that matches no markup: .ttag.mini (and tag()'s mini flag, which nothing passed),
    .gamehead .r, .side and .edge and their variants, .two in the narrow layout, four retired
    tables in the 760px scroll list, .gsugg-alt, .gsugg-legs .lk, .gsugg-ft, the .gsugg-tl
    list, the 700px .gsugg-tiers rule (the g3 rule always won), .statblk h4 em.actual and
    the .livedot dot.
  * Comments about code that is gone: an orphan "every play the model would bet" over
    nothing, the shuffled parlay on closeGame (Shuffle is retired), admin.html in the credits
    note, "price sheet" over the row matcher, and "a sheet you uploaded" in the track record.

Three things nflbets/build/build.js used to strip from the parts at build time are now gone
at the source, so the audited page is the shipped one: the Props tab's timed scores picker
and its dot (the stamp is the bare span the build wrote; Refresh scores stays), the how-to
list under an empty Parlay Builder, and the Game bets card in a game's page (the card
itself stays: the Pick'ems tab opens it under every game). build.js loses its strips. The
audit follows: T2 checks the picker is gone and the stamp claims nothing before a read, J
ticks a to-win leg the way the Pick'ems tab does (the card's checkbox through toggleLeg),
O checks the game page carries no Game bets card, G no longer counts S.accuracy, and the
helper list drops fairLine, bookPrice and modelPoints, which it never used.

Two sentences sent readers to the Track Record, which has no tab on the Bets and Stats page:
the suggestions' footnote loses "(see Track Record)", and a game in progress now says the
season's stats are what settle a leg.

Every edit is made in memory and asserted to match exactly once; nothing is written unless
all of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


def cut(k, start, end, new=''):
    """replace from start (found once) up to the first end after it (exclusive)"""
    s = T[k]
    assert s.count(start) == 1, (k, s.count(start), start[:60])
    i = s.index(start); j = s.index(end, i)
    T[k] = s[:i] + new + s[j:]
    return s[i:j]


# ================= part2 =================
sub1('p2', "const st={season:SEASON,build:MODEL_BUILD,dataBuild:DATA_BUILD,dataStamp:DATA_STAMP,week:1,players:{},",
           "const st={build:MODEL_BUILD,dataBuild:DATA_BUILD,dataStamp:DATA_STAMP,players:{},")
sub1('p2', "    accuracy:{},inactive:{},depth:{},odds:{},", "    inactive:{},depth:{},odds:{},")
sub1('p2', "imp:clip((implied-PAY.norm.implied_mean)/(PAY.norm.implied_sd||1),-3,3), hasLine:sp!=null&&tot!=null};",
           "imp:clip((implied-PAY.norm.implied_mean)/(PAY.norm.implied_sd||1),-3,3)};")
sub1('p2', "  return {mu:Math.max(dot(m.coef,x),0), count:!!m.count};", "  return {mu:Math.max(dot(m.coef,x),0)};")
sub1('p2', r"""function fairLine(grp,stat,mu){
  /* the line where the blended chance of going over is 50% */
  let lo=mu*0.2, hi=mu*3+1;
  for(let i=0;i<40;i++){ const mid=(lo+hi)/2; if(pOver(grp,stat,mu,mid)>0.5) lo=mid; else hi=mid; }
  return (lo+hi)/2;
}

/* ---------- odds helpers ---------- */
function mlToProb(ml){ if(ml==null||!isFinite(ml)||ml===0) return null; return ml>0?100/(ml+100):Math.abs(ml)/(Math.abs(ml)+100); }

""", "\n")
sub1('p2', """  return {indep,corr:hits/sims,pairs,shrunk:lam>0};
}

/* every play the model would actually bet, strongest first */

""", """  return {indep,corr:hits/sims,pairs};
}

""")
sub1('p2', r"""  const snap=null, frozen=false;
  const pick=(grps,stat)=>{
    let best=null;
    for(const team in roster) for(const x of roster[team].players){
      if(!grps.includes(x.pl.grp)) continue;
      let mu;
      if(frozen){ const s0=snap[x.pl.id]&&snap[x.pl.id][stat]; if(!s0||s0.mu==null) continue; mu=s0.mu; }
      else { const r=project(x.pl,stat,x.opp,x.ctx); if(!r||r.mu==null||!isFinite(r.mu)) continue; mu=r.mu; }
""", r"""  const pick=(grps,stat)=>{
    let best=null;
    for(const team in roster) for(const x of roster[team].players){
      if(!grps.includes(x.pl.grp)) continue;
      const r=project(x.pl,stat,x.opp,x.ctx); if(!r||r.mu==null||!isFinite(r.mu)) continue;
      const mu=r.mu;
""")
sub1('p2', "   Where a price exists (a sheet you uploaded, or the built-in main-line price) it rides along as",
           "   Where a price exists (a rung price the job pulled, or the book's main-line price) it rides along as")
sub1('p2', r"const APP_BUILD='app v74 \u00b7 2026-10-01';", r"const APP_BUILD='app v75 \u00b7 2026-10-03';")

# ================= part3 =================
# comments about code that is gone
sub1('p3', """/* a shuffled parlay belongs to this visit to the game: opening the game again, from here
   or from the list, starts back at the model's own suggestion */
function closeGame(){""", "function closeGame(){")
sub1('p3', """   The page cannot ask the odds API itself, because admin.html is public and the key
   would have to be in it. */""", """   The page cannot ask the odds API itself, because the page is public and the key
   would have to be in it. */""")
sub1('p3', "/* ---------- price sheet ---------- */\nfunction marketKey(s){",
           "/* ---------- price rows: market and player names to keys, and a file to save ---------- */\nfunction marketKey(s){")
sub1('p3', "function tag(t,mini){const bg=tagBg(tagColor(t));\n  return `<span class=\"ttag${mini?' mini':''}\" style=",
           "function tag(t){const bg=tagBg(tagColor(t));\n  return `<span class=\"ttag\" style=")

# the Game bets card: its row() never read its kind, and a game page no longer carries it
sub1('p3', "    const row=(kind,b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);",
           "    const row=(b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);")
sub1('p3', "    h+=row('ml',ml,onML,kML,bookML,rML,'To win');", "    h+=row(ml,onML,kML,bookML,rML,'To win');")
sub1('p3', "    if(ats) h+=row('ats',ats,onATS,kATS,bookSP,rATS,", "    if(ats) h+=row(ats,onATS,kATS,bookSP,rATS,")
sub1('p3', "  html+=gameBetsCard(g,locked);\n")

# a game in progress: the Track Record has no tab to send anyone to
sub1('p3', r"These are not the settled numbers: the season\u2019s stats arrive with the next update and the Track Record still grades those.'",
           r"These are not the settled numbers: the season\u2019s stats arrive with the next update, and those are what settle a leg.'")

# renderGame's betting rows only run unlocked: their locked branches go
sub1('p3', r"""          const p2=tdPlus(l.p,2), [c2,lbl2]=confTier(p2);
          const ta=(locked&&haveStats)?actualFor(g.w,x.pl.id):null;
          const tmark=hit=>hit==null?'<span class="res">\u2013</span>':(hit?'<span class="res win">\u2713</span>':'<span class="res loss">\u2717</span>');
""", """          const p2=tdPlus(l.p,2), [c2,lbl2]=confTier(p2);
""")
sub1('p3', """            <td class="pick">${locked?tmark(ta?ta.any_td>=1:null):`<input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score a touchdown">`}</td>""",
           """            <td class="pick"><input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score a touchdown"></td>""")
sub1('p3', """            <td class="pick">${locked?tmark(ta&&ta.tds!=null?ta.tds>=2:null):`<input type="checkbox" ${ton2?'checked':''} data-leg="${tk}" data-k="2" data-side="over" aria-label="Add ${esc(x.pl.n)} to score two or more touchdowns">`}</td>""",
           """            <td class="pick"><input type="checkbox" ${ton2?'checked':''} data-leg="${tk}" data-k="2" data-side="over" aria-label="Add ${esc(x.pl.n)} to score two or more touchdowns"></td>""")
sub1('p3', """        const actV=(locked&&haveStats&&actualFor(g.w,x.pl.id))?actualFor(g.w,x.pl.id)[l.stat]:null;
        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${actV!=null?`<em class="actual">actual ${num(actV,0)}</em>`:''}${L?`<em class="mline">book line ${L.line}</em>`:''}</h4><table class="rungs">`;""",
           """        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${L?`<em class="mline">book line ${L.line}</em>`:''}</h4><table class="rungs">`;""")
sub1('p3', r"""          const gapO=(pO-mlProb(L.over))*100, gapU=((1-pO)-mlProb(L.under))*100;
          const actM=(locked&&haveStats)?actualFor(g.w,x.pl.id):null; const av=actM?actM[l.stat]:null;
          const resO=av==null?null:(av>L.line?'win':'loss'), resU=av==null?null:(av<L.line?'win':'loss');
          const mark=r=>r==null?'<span class="res">\u2013</span>':(r==='win'?'<span class="res win">\u2713</span>':'<span class="res loss">\u2717</span>');
          html+=`<tr class="mainline ${onO?'on':''}${resO==='win'?' hit':(resO==='loss'?' miss':'')}">
            <td class="pick">${locked?mark(resO):`<input type="checkbox" ${onO?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="over" data-main="1" aria-label="Add over ${L.line}">`}</td>""",
           """          const gapO=(pO-mlProb(L.over))*100, gapU=((1-pO)-mlProb(L.under))*100;
          html+=`<tr class="mainline ${onO?'on':''}">
            <td class="pick"><input type="checkbox" ${onO?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="over" data-main="1" aria-label="Add over ${L.line}"></td>""")
sub1('p3', """          <tr class="mainline ${onU?'on':''}${resU==='win'?' hit':(resU==='loss'?' miss':'')}">
            <td class="pick">${locked?mark(resU):`<input type="checkbox" ${onU?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="under" data-main="1" aria-label="Add under ${L.line}">`}</td>""",
           """          <tr class="mainline ${onU?'on':''}">
            <td class="pick"><input type="checkbox" ${onU?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="under" data-main="1" aria-label="Add under ${L.line}"></td>""")
sub1('p3', r"""          const v=rungView(x.pl,l.stat,l.mu,r.k,g.w);
          const act=(locked&&haveStats)?actualFor(g.w,x.pl.id):null;
          const hit=act?(act[l.stat]>=r.k):null;
          html+=`<tr class="rung ${on?'on':''}${hit===true?' hit':(hit===false?' miss':'')}">
            <td class="pick">${locked?(hit===true?'<span class="res win">\u2713</span>':(hit===false?'<span class="res loss">\u2717</span>':'<span class="res">\u2013</span>')):`<input type="checkbox" ${on?'checked':''} data-leg="${lk}" data-k="${r.k}" data-side="over"
              aria-label="Add ${esc(x.pl.n)} ${r.k} or more ${l.m.lbl.toLowerCase()} to the parlay">`}</td>""",
           """          const v=rungView(x.pl,l.stat,l.mu,r.k,g.w);
          html+=`<tr class="rung ${on?'on':''}">
            <td class="pick"><input type="checkbox" ${on?'checked':''} data-leg="${lk}" data-k="${r.k}" data-side="over"
              aria-label="Add ${esc(x.pl.n)} ${r.k} or more ${l.m.lbl.toLowerCase()} to the parlay"></td>""")

# S.accuracy: built, never shown
sub1('p3', """/* score the projections the app was showing, before the state moves on */
function gradeGame(g,recs){
  buildNorm();
  const w=g.w;
  const actual={}; for(const r of recs) actual[r.id]=r;
""", """/* freeze the projections the app was showing, before the state moves on */
function gradeGame(g){
  buildNorm();
  const w=g.w;
""")
sub1('p3', """      snap[l.stat]=o;
    }
    const a=actual[x.pl.id]; if(!a) continue;
    for(const l of statLines(x)){
      if(l.prob) continue;
      const av=a.st[l.stat]; if(av==null) continue;
      const e=(S.accuracy[l.stat]??={n:0,ae:0,base:0});
      e.n++; e.ae+=Math.abs(l.mu-av);
      e.base+=Math.abs(ewm(x.pl.e5[l.stat]||[0,0])-av);
    }
  }
}""", """      snap[l.stat]=o;
    }
  }
}""")
sub1('p3', "    gradeGame(g,recs); applyGame(g,recs);", "    gradeGame(g); applyGame(g,recs);")
sub1('p3', "\n  S.accuracy=S.accuracy||{}; S.inactive=S.inactive||{}; S.depth=S.depth||{};\n",
           "\n  S.inactive=S.inactive||{}; S.depth=S.depth||{};\n")
sub1('p3', "    S.ui={game:null,open:{},showAll:false}; S.accuracy=S.accuracy||{}; S.inactive=S.inactive||{};",
           "    S.ui={game:null,open:{},showAll:false}; S.inactive=S.inactive||{};")

# the Suggested parlays card is only ever drawn in its window
sub1('p3', "showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),suggestMin:!!(saved&&saved.ui&&saved.ui.suggestMin),suggestSide:",
           "showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),suggestSide:")
sub1('p3', " have not held up yet this season (see Track Record), so treat these", " have not held up yet this season, so treat these")
START = """function suggestCard(inModal){
  /* in the window it is always open: the window is the reveal, so minimising inside it
     would leave a box with a button in it and nothing else */
  const open=inModal?true:!(S.ui&&S.ui.suggestMin);
  const w=currentWeek(), stake=Math.max(0,+S.stake||0);
  let body='';
  if(open){
"""
END = """
  }
  return `<div class="card sugg${open?'':' min'}" id="suggCard">"""
s = T['p3']
assert s.count(START) == 1 and s.count(END) == 1
i = s.index(START); j = s.index(END)
inner = s[i + len(START):j].split('\n')
assert inner and all(not l or l.startswith('  ') for l in inner), 'the open branch is not indented as expected'
T['p3'] = (s[:i] + """function suggestCard(){
  /* drawn in its own window, opened from the builder: always open, closed by its button */
  const w=currentWeek(), stake=Math.max(0,+S.stake||0);
  let body='';
""" + '\n'.join(l[2:] for l in inner) + """
  return `<div class="card sugg" id="suggCard">""" + s[j + len(END):])
sub1('p3', """      ${open?`<span class="sugg-side" role="group" aria-label="Which legs to build from">""",
           """      <span class="sugg-side" role="group" aria-label="Which legs to build from">""")
sub1('p3', """aria-label="Amount to bet on a suggested parlay"></label>`:''}
      ${inModal?`<button class="btn quiet" id="suggClose">Close</button>`
        :`<button class="btn quiet" id="suggToggle" aria-expanded="${open}">${open?'Minimize':'Show'}</button>`}</div>""",
           """aria-label="Amount to bet on a suggested parlay"></label>
      <button class="btn quiet" id="suggClose">Close</button></div>""")
sub1('p3', "v.innerHTML=suggestCard(true);", "v.innerHTML=suggestCard();")
sub1('p3', "  $('suggToggle')?.addEventListener('click',()=>{ S.ui.suggestMin=!S.ui.suggestMin; save(); renderParlay(); });\n")

# the empty builder's how-to list: the Bets and Stats build cut it, so it goes at the source
gone = cut('p3', """
      <ul style="margin:0">
        <li>You can pick <b>one line per stat per player</b>.""", "</div>`+renderSaved()+renderBetParlays();")
assert gone.rstrip().endswith('</ul>') and gone.count('</ul>') == 1, gone[-80:]

# the scores picker and its dot: Refresh scores reads the scoreboard, nothing polls on a timer
sub1('p3', """/* the Games tab's own scores: off until asked, then read once or on an interval */
$('slateNow')?.addEventListener('click',()=>{ LIVE.slate=true; LIVE.err=null; slateStamp(); liveRefresh(); });
$('slateEvery')?.addEventListener('change',()=>{
  const every=+($('slateEvery').value||0);
  if(every){ LIVE.slate=true; LIVE.err=null; liveStart(); }
  else { liveStop(); if(LIVE.on) liveStart(); slateStamp(); }
});
""", """/* the Games tab's own scores: off until asked, then read on the button */
$('slateNow')?.addEventListener('click',()=>{ LIVE.slate=true; LIVE.err=null; slateStamp(); liveRefresh(); });
""")
sub1('p3', "  LIVE.busy=true; slateDot(true);", "  LIVE.busy=true;")
sub1('p3', "  }finally{ LIVE.busy=false; slateDot(false); }", "  }finally{ LIVE.busy=false; }")
sub1('p3', """function slateDot(busy){ const d=$('slateDot'); if(d) d.classList.toggle('on',!!busy); }
function slateStamp(){
  const el=$('slateStamp'), d=$('slateDot'); if(!el) return;
  if(d) d.classList.toggle('bad',!!LIVE.err);
""", """function slateStamp(){
  const el=$('slateStamp'); if(!el) return;
""")
sub1('p3', "  const every=(LIVE.slate&&+($('slateEvery')?.value||0))||(LIVE.on?30:0);", "  const every=LIVE.on?30:0;")

# fields nothing reads
sub1('p3', "    return {legs,corr:pr.corr,dec:parlayDec(legs.map(l=>({leg:l,ml:l.price}))),mult:legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1)}; };",
           "    return {legs,corr:pr.corr,dec:parlayDec(legs.map(l=>({leg:l,ml:l.price})))}; };")
sub1('p3', "function ingestOdds(rows,week,quiet){", "function ingestOdds(rows,week){")
sub1('p3', "  let n=0; const missName=new Set(), missMkt=new Set();", "  let n=0;")
sub1('p3', "    const mk=marketKey(row.market); if(!mk){ if(row.market) missMkt.add(row.market); continue; }",
           "    const mk=marketKey(row.market); if(!mk) continue;")
sub1('p3', "    if(!hit){ if(row.player) missName.add(row.player); continue; }", "    if(!hit) continue;")
sub1('p3', "  return {n,week:w,missName:missName.size};", "  return {n};")
sub1('p3', "ingestOdds(PAY.prices[w],+w,true).n", "ingestOdds(PAY.prices[w],+w).n")

# ================= part1 =================
sub1('p1', """      <span class="livestamp"><span class="livedot" id="slateDot"></span><span id="slateStamp">scores off</span></span>
      <label class="muted">Scores <select id="slateEvery">
        <option value="0" selected>off</option><option value="30">every 30s</option><option value="60">every 60s</option>
      </select></label>
""", """      <span class="livestamp" id="slateStamp"></span>
""")
for rule in [
    ".ttag.mini{font-size:12px;padding:4px 5px;min-width:40px;vertical-align:-1px}\n",
    ".side{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;padding:3px 8px;border-radius:999px;background:#E3E8EE;color:var(--ink-2)}\n",
    ".side.over{background:var(--pick-soft);color:var(--pick)}\n",
    ".side.under{background:#E7EDF6;color:var(--away)}\n",
    ".side.pass{background:#EEF1F4;color:var(--muted)}\n",
    ".edge{font-variant-numeric:tabular-nums;font-weight:600}\n",
    ".edge.good{color:var(--pick)} .edge.bad{color:var(--miss)} .edge.flat{color:var(--ink-2);font-weight:400}\n",
    "  .two{grid-template-columns:1fr}\n",
    ".livedot{width:8px;height:8px;border-radius:50%;background:var(--line-2);display:inline-block}\n",
    ".livedot.on{background:var(--pick);box-shadow:0 0 8px rgba(27,122,78,.6)}\n",
    ".livedot.bad{background:var(--miss)}\n",
    ".sugg.min .sugg-hd{margin-bottom:0}\n",
    ".gsugg-legs .lk{flex:none;align-self:center;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pick);white-space:nowrap}\n",
    ".gsugg-ft{margin:8px 0 0;font-size:12px}\n",
    ".gsugg-tl{list-style:none;margin:8px 0 0;padding:0;border-top:1px solid var(--line)}\n",
    ".gsugg-tl li{display:flex;align-items:baseline;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px}\n",
    ".gsugg-tl .nm{flex:1;min-width:0}\n",
    ".gsugg-tl .nm small{display:block;color:var(--ink-2);font-size:11.5px}\n",
    ".gsugg-tl .pr{font-family:var(--display);font-variant-numeric:tabular-nums;white-space:nowrap}\n",
    ".gsugg-tl .pr em{font-style:normal;color:var(--ink-2);font-size:11.5px;margin-left:6px}\n",
    "@media(max-width:700px){.gsugg-tiers{grid-template-columns:1fr}}\n",
    ".statblk h4 em.actual{color:var(--ink);font-weight:700;background:#E9EEF4;padding:2px 8px;border-radius:999px}\n",
]:
    sub1('p1', rule)
sub1('p1', ".gamehead .c{text-align:center} .gamehead .r{text-align:right}\n", ".gamehead .c{text-align:center}\n")
sub1('p1', "#parlayBody table,#accTable table,#modelValidation table,#modelSeason table,#marketList table,#trackBody table{",
           "#parlayBody table,#trackBody table{")
sub1('p1', ".gsugg-all,.gsugg-alt{", ".gsugg-all{")

# ================= audit.js =================
sub1('audit', """  const [gameCtx,rosterFor,statLines,project,pOver,fairLine,rungView,marketLine,marketMu,devigOver,bookImplied,bookPrice,probToAmerican,mlToDec,parlayProb,modelMargin,modelPoints,legRho,gameBet,settleLeg,gameMu,tdPlus]=
   ['gameCtx','rosterFor','statLines','project','pOver','fairLine','rungView','marketLine','marketMu','devigOver','bookImplied','bookPrice','probToAmerican','mlToDec','parlayProb','modelMargin','modelPoints','legRho','gameBet','settleLeg','gameMu','tdPlus'].map(F);""",
              """  const [gameCtx,rosterFor,statLines,project,pOver,rungView,marketLine,marketMu,devigOver,bookImplied,probToAmerican,mlToDec,parlayProb,modelMargin,legRho,gameBet,settleLeg,gameMu,tdPlus]=
   ['gameCtx','rosterFor','statLines','project','pOver','rungView','marketLine','marketMu','devigOver','bookImplied','probToAmerican','mlToDec','parlayProb','modelMargin','legRho','gameBet','settleLeg','gameMu','tdPlus'].map(F);""")
# J: the Game bets card lives on the Pick'ems tab, which ticks a leg through toggleLeg
sub1('audit', """    const gopen=openUpcoming();
    const gcb=d.querySelector('[data-leg$="|ml"]'); chk(!!gcb,'no to-win checkbox in the game overlay');
    if(gcb){ gcb.checked=true; gcb.dispatchEvent(new w.Event('change')); const L=Object.values(S.parlay).find(l=>l.stat==='ml'); chk(!!L&&L.grp==='TEAM'&&L.p>0&&L.p<1&&L.label==='To win','to-win leg did not land in the parlay');
      chk(/To win/.test(d.getElementById('parlayBody').textContent),'to-win leg not shown in the parlay builder');
      gcb.checked=false; gcb.dispatchEvent(new w.Event('change')); chk(!Object.values(S.parlay).some(l=>l.stat==='ml'),'to-win leg did not come back out'); }
    d.getElementById('backBtn').click();
""", """    /* the card is drawn under each game on the Pick'ems tab of the Bets and Stats page, which
       sends a tick through toggleLeg: draw it and tick it the same way */
    const gopen=S.sched.find(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w));
    const gbox=d.createElement('div'); gbox.innerHTML=F('gameBetsCard')(gopen,false);
    const gcb=gbox.querySelector('[data-leg$="|ml"]'); chk(!!gcb,'no to-win checkbox on the Game bets card');
    const gtick=()=>F('toggleLeg')(gcb.dataset.leg,+gcb.dataset.k,gopen,gcb.dataset.side||'over',gcb.dataset.main==='1');
    if(gcb){ gtick(); const L=Object.values(S.parlay).find(l=>l.stat==='ml'); chk(!!L&&L.grp==='TEAM'&&L.p>0&&L.p<1&&L.label==='To win','to-win leg did not land in the parlay');
      chk(/To win/.test(d.getElementById('parlayBody').textContent),'to-win leg not shown in the parlay builder');
      gtick(); chk(!Object.values(S.parlay).some(l=>l.stat==='ml'),'to-win leg did not come back out'); }
""")
# G: S.accuracy is gone
sub1('audit', """  chk(Object.keys(S.accuracy).length>=10,'accuracy not graded');
  for(const k in S.accuracy){ const a=S.accuracy[k]; chk(a.n>0&&isFinite(a.ae/a.n),`accuracy bad ${k}`); }
""")
sub1('audit', "re-upload skipped, ${Object.keys(S.accuracy).length} stats graded, legs preserved,", "re-upload skipped, legs preserved,")
# O: a game page is its players; the game bets are on the Pick'ems tab
sub1('audit', """    /* the suggestion is the summary, the game bets table is the detail */
    { const cards=[...d.querySelectorAll('#gameView .card')];
      const iS=cards.findIndex(c=>c.classList.contains('gsugg')), iB=cards.findIndex(c=>c.classList.contains('gbets'));
      chk(iS>=0&&iB>=0&&iS<iB,'the suggested parlays are not above the game bets'); }
""", """    /* the game bets open under each game on the Pick'ems tab; a game page here is its players */
    chk(!!d.querySelector('#gameView .gsugg')&&!d.querySelector('#gameView .gbets'),'the game page still carries the Game bets card');
""")
# T2: a button, no timed picker
sub1('audit', """      chk(!!d.getElementById('slateNow')&&!!d.getElementById('slateEvery')&&!!d.getElementById('slateStamp'),
        'the Games tab has no scores control');
      chk(d.getElementById('slateEvery').value==='0','the Games tab should not poll until it is asked to');
      chk(LIVE.slate===false,'the Games tab starts with the scoreboard off');
      chk(d.getElementById('slateStamp').textContent==='scores off','the stamp does not say the scores are off');
""", """      chk(!!d.getElementById('slateNow')&&!!d.getElementById('slateStamp'),'the Games tab has no Refresh scores button');
      chk(!d.getElementById('slateEvery')&&!d.getElementById('slateDot'),'the Games tab still has the timed scores picker');
      chk(LIVE.slate===false,'the Games tab starts with the scoreboard off');
      { const st0=d.getElementById('slateStamp').textContent;
        chk(st0===''||st0==='scores off','the stamp claims a scoreboard read before one was asked for: '+st0); }
""")
sub1('audit', "console.log(`T2. games tab scores: control present and off,", "console.log(`T2. games tab scores: button present, no timed picker, off,")
# the summary line printed after a return: unreachable
sub1('audit', """  })();
  return;
  console.log(`\\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
  fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
  errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
},1800);""", """  })();
},1800);""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('app v75: dead helpers, minimise mode, locked leftovers, S.accuracy, unread fields, dead CSS and stale comments gone; the nflbets strips made at source')
