"""app v33: Suggested parlays at the top of the Parlay Builder.

  * Three tiers built on one core: Safe is the two most likely qualifying legs, plus more while
    the chance all legs land stays at 50% or better. Medium adds at least one leg and keeps
    adding down to 30%; Aggressive adds at least one more and keeps adding down to 15%.
  * Candidates: this week's games that have not kicked off, lines with a real sportsbook price
    (book main lines both sides, priced rungs, anytime touchdown, and game bets from the
    schedule's moneylines and spread prices), where the model's chance beats the book's own
    implied chance by 3 points or more and sits between 45% and 97%. Estimated prices are not
    used: they come from the model itself, so they can never show an edge.
  * Each leg added is the one that gives the highest expected return (chance x payout) while
    the parlay stays above the tier's floor, with the legs' real correlations. One game bet
    per game.
  * The section minimizes (remembered per browser). Each tier can be added to Saved parlays
    at the builder's stake.
"""
from pathlib import Path

HERE = Path(__file__).parent


def edit(path, pairs):
    p = HERE / path
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:80])
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8", newline="\n")
    print("patched", path)


ENGINE = r"""/* ---------- suggested parlays: safe, medium, aggressive ----------
   One core parlay grown in three steps. Each tier has a floor on the chance that every leg
   lands and a leg cap; the next leg is always the one with the best expected return
   (chance x payout, real correlations) that keeps the parlay above the floor. */
const SUGGEST_TIERS=[['safe','Safe',0.50,3],['med','Medium',0.30,5],['aggr','Aggressive',0.15,8]];
let SUGGEST_CACHE=null;
function suggestCandidates(){
  const w=currentWeek(); const out=[];
  for(const g of gamesIn(w)){
    if(gameStarted(g)) continue;
    for(const team of [g.a,g.h]){
      const isHome=team===g.h, opp=isHome?g.a:g.h;
      for(const kind of ['ml','ats']){
        const b=gameBet(g,team,kind); if(!b) continue;
        const book=kind==='ml'?(isHome?g.mlh:g.mla):(isHome?g.sph:g.spa);
        if(book==null||!isFinite(book)) continue;
        out.push({key:legKey(g.id,'team:'+team,kind),gid:g.id,pid:'team:'+team,stat:kind,k:b.line==null?0:b.line,side:'over',main:false,
          p:b.p,price:book,src:'real',mu:null,name:TEAM_NAMES[team]||team,pos:'Game',grp:'TEAM',team,opp,week:g.w,
          label:kind==='ml'?'To win':`To cover ${b.line>0?'+':''}${b.line}`});
      }
    }
    const roster=rosterFor(g,false);
    for(const team in roster) for(const x of roster[team].players){
      if(x.gp<3) continue;
      for(const l of statLines(x)){
        const base={gid:g.id,pid:x.pl.id,stat:l.stat,name:x.pl.n,pos:x.pl.pos,grp:x.pl.grp,team,opp:x.opp,week:g.w,src:'real'};
        if(l.prob){ const od=oddsFor(g.id,x.pl.id,'any_td',1);
          if(od!=null) out.push({...base,key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:od,mu:null,label:'Scores a touchdown'});
          continue; }
        const L=marketLine(g.w,x.pl.id,l.stat);
        if(L){ const pO=pOver(x.pl.grp,l.stat,l.mu,L.line), lbl=l.m.lbl.toLowerCase();
          if(L.over!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'over',main:true,p:pO,price:L.over,mu:l.mu,label:`Over ${L.line} ${lbl}`});
          if(L.under!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'under',main:true,p:1-pO,price:L.under,mu:l.mu,label:`Under ${L.line} ${lbl}`}); }
        for(const r of l.rungs){ const od=oddsFor(g.id,x.pl.id,l.stat,r.k); if(od==null) continue;
          out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:r.k,side:'over',main:false,p:r.p,price:od,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }
      }
    }
  }
  const edge=c=>c.p-mlProb(c.price);
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&edge(c)>=0.03).sort((a,b)=>edge(b)-edge(a)).slice(0,40);
}
function buildSuggestions(){
  const cands=suggestCandidates();
  const dec=legs=>legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1);
  const chance=(legs,sims)=>legs.length?parlayProb(legs,sims).corr:1;
  const tiers=[]; let cur=[];
  for(const [id,label,floor,cap] of SUGGEST_TIERS){
    const startLen=cur.length;
    /* every tier grows the one before: Safe starts from its two most likely legs, Medium and
       Aggressive each take at least one more leg (the best expected return), then keep adding
       while the parlay stays above the tier's floor */
    const must=id==='safe'?2:startLen+1;
    while(cur.length<cap){
      let best=null;
      for(const c of cands){
        if(cur.some(l=>l.key===c.key)) continue;
        if(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM'&&l.gid===c.gid)) continue;
        const next=[...cur,c], p=chance(next,3000);
        const forced=next.length<=must;
        if(!forced&&p<floor) continue;
        const score=(forced&&id==='safe')?p:p*dec(next);
        if(!best||score>best.score) best={c,score};
      }
      if(!best) break;
      cur=[...cur,best.c];
    }
    if(cur.length<2||cur.length===startLen) continue;
    const pr=parlayProb(cur,40000);
    tiers.push({id,label,floor,legs:cur.map(l=>({...l})),corr:pr.corr,indep:pr.indep,dec:dec(cur),added:cur.length-startLen});
  }
  return {tiers,candidates:cands.length};
}
function getSuggestions(){
  const w=currentWeek(), started=gamesIn(w).filter(gameStarted).length;
  const sig=[w,started,JSON.stringify(S.odds||{}).length,PAY.baked_at||'',S.sched.length].join('|');
  if(!SUGGEST_CACHE||SUGGEST_CACHE.sig!==sig) SUGGEST_CACHE={sig,...buildSuggestions()};
  return SUGGEST_CACHE;
}
function suggestCard(){
  const open=!(S.ui&&S.ui.suggestMin);
  const w=currentWeek(), stake=Math.max(0,+S.stake||0);
  let body='';
  if(open){
    const s=getSuggestions();
    if(!s.tiers.length){
      body=`<p class="muted" style="margin:0">No suggestions for week ${w} yet. They use only lines with a real sportsbook price that the model rates above the book, ${s.candidates?`and only ${s.candidates} line${s.candidates===1?'':'s'} qualify so far`:'and none qualify yet'}. Player prices arrive with the Thursday and Saturday pulls.</p>`;
    } else {
      const tag={safe:'high',med:'med',aggr:'low'};
      body=`<p class="muted" style="margin:0 0 14px">Built from week ${w} lines with a real sportsbook price that the model rates above the book. Safe is the most likely pair, kept at 50% or better when the lines allow it; Medium and Aggressive add legs to the same core for a bigger payout. Payouts use your builder stake of $${stake.toFixed(2)}.${s.tiers[s.tiers.length-1].legs.every(l=>l.grp==='TEAM')?' Only game bets qualify so far; player lines join when this week’s prices are pulled on Thursday and Saturday.':''}</p>
      <div class="sugg-grid">`+s.tiers.map((t,i)=>{
        const payout=stake*t.dec, ev=t.corr*t.dec-1, ml=decToML(t.dec);
        const saved=(S.saved||[]).some(p=>p.suggestSig===SUGGEST_CACHE.sig+'|'+t.id);
        return `<div class="sugg-tier ${t.id}">
          <div class="sugg-top"><span class="sugg-name">${t.label}</span><span class="conf ${tag[t.id]}">${t.legs.length} legs</span>${i?`<span class="muted sugg-add">+${t.added} leg${t.added===1?'':'s'}</span>`:''}</div>
          <div class="sugg-nums">
            <div><b>${(t.corr*100).toFixed(0)}%</b><span>chance all land</span></div>
            <div><b>${fmtML(ml)}</b><span>book price</span></div>
            <div><b class="payout">$${payout.toFixed(2)}</b><span>returns if it lands</span></div>
            <div><b class="${ev>=0?'delta up':'delta down'}">${ev>=0?'+':'−'}${Math.abs(ev*100).toFixed(0)}%</b><span>expected return</span></div>
          </div>
          <ul class="sugg-legs">${t.legs.map(l=>`<li><span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span><span class="pr">${fmtML(l.price)}<em>${(l.p*100).toFixed(0)}%</em></span></li>`).join('')}</ul>
          <button class="btn ${saved?'quiet':'go'}" data-suggest-save="${t.id}" ${saved?'disabled':''}>${saved?'Saved':'Add to saved parlays'}</button>
        </div>`; }).join('')+`</div>
      <p class="muted" style="margin:12px 0 0;font-size:12px">Chances allow for how the legs move together. They are the model's numbers, and its edges over book prices have not held up yet this season (see Track Record), so treat these as the model's view rather than a sure thing.</p>`;
    }
  }
  return `<div class="card sugg${open?'':' min'}" id="suggCard">
    <div class="sugg-hd"><h2>Suggested parlays</h2><span class="pill">week ${w}</span><span class="grow"></span>
      <button class="btn quiet" id="suggToggle" aria-expanded="${open}">${open?'Minimize':'Show'}</button></div>
    ${body}</div>`;
}
function wireSuggest(){
  $('suggToggle')?.addEventListener('click',()=>{ S.ui.suggestMin=!S.ui.suggestMin; save(); renderParlay(); });
  document.querySelectorAll('[data-suggest-save]').forEach(b=>b.addEventListener('click',()=>{
    const t=(SUGGEST_CACHE&&SUGGEST_CACHE.tiers||[]).find(x=>x.id===b.dataset.suggestSave); if(!t) return;
    const stake=Math.max(0,+S.stake||0);
    if(!confirm(`Save the ${t.label} ${t.legs.length}-leg parlay at ${fmtML(decToML(t.dec))} for $${stake.toFixed(2)}?\n\nIt goes to Saved parlays and settles like any other.`)) return;
    S.saved.push({id:'sp'+Date.now(),saved:new Date().toISOString(),week:t.legs[0].week,legs:t.legs.map(l=>({...l})),
      stake,price:decToML(t.dec),priceSrc:'real',pCorr:t.corr,pIndep:t.indep,payout:stake*t.dec,
      suggested:t.label,suggestSig:SUGGEST_CACHE.sig+'|'+t.id});
    save(); renderParlay(); }));
}
function renderParlay(){"""

edit("part3.js", [
    ("function renderParlay(){", ENGINE),
    ("    el.innerHTML=droppedNote+`<div class=\"card\"><h2>Nothing picked yet</h2>",
     "    el.innerHTML=suggestCard()+droppedNote+`<div class=\"card\"><h2>Nothing picked yet</h2>"),
    ("      </ul></div>`+renderSaved();\n    wireSaved();\n    return;",
     "      </ul></div>`+renderSaved();\n    wireSaved(); wireSuggest();\n    return;"),
    ("  let html=droppedNote+`<div class=\"card\"><h2>${legs.length}-leg parlay <span class=\"pill\">building</span></h2>",
     "  let html=suggestCard()+droppedNote+`<div class=\"card\"><h2>${legs.length}-leg parlay <span class=\"pill\">building</span></h2>"),
    ("    S.parlay={}; save(); renderParlay(); if(S.ui.game) renderGame(); });\n  wireSaved();\n}",
     "    S.parlay={}; save(); renderParlay(); if(S.ui.game) renderGame(); });\n  wireSaved(); wireSuggest();\n}"),
    ("        <span class=\"sp-title\">${p.legs.length}-leg parlay</span>",
     "        <span class=\"sp-title\">${p.legs.length}-leg parlay</span>${p.suggested?`<span class=\"pill\">${p.suggested} suggestion</span>`:''}"),
])

CSS = """
/* suggested parlays */
.sugg-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.sugg-hd h2{margin:0}
.sugg-hd .pill{white-space:nowrap}
.sugg.min .sugg-hd{margin-bottom:0}
.sugg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.sugg-tier{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--r-md);padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}
.sugg-tier.safe{border-top:3px solid var(--pick)} .sugg-tier.med{border-top:3px solid var(--gold)} .sugg-tier.aggr{border-top:3px solid var(--miss)}
.sugg-top{display:flex;align-items:center;gap:8px}
.sugg-name{font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px}
.sugg-add{font-size:11px;margin-left:auto}
.sugg-tier .conf::before{display:none}
.sugg-tier.aggr .conf{background:var(--miss-soft);color:var(--miss)}
.sugg-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sugg-nums div{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-sm);padding:7px 9px}
.sugg-nums b{display:block;font-family:var(--display);font-size:18px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.sugg-nums b.payout{font-size:18px}
.sugg-nums span{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.sugg-legs{list-style:none;margin:0;padding:0}
.sugg-legs li{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:13px}
.sugg-legs .nm{font-weight:600;min-width:0}
.sugg-legs .nm small{display:block;font-weight:400;color:var(--ink-2);font-size:11.5px}
.sugg-legs .pr{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;text-align:right}
.sugg-legs .pr em{display:block;font-style:normal;font-size:11px;font-weight:500;color:var(--muted)}
.sugg-tier .btn{margin-top:auto;align-self:stretch;text-align:center}
@media(max-width:900px){ .sugg-grid{grid-template-columns:1fr} }
"""
edit("part1.html", [
    ("/* the parlay card: what it pays sits under the legs behind a divider, then the actions behind another */",
     CSS.strip() + "\n/* the parlay card: what it pays sits under the legs behind a divider, then the actions behind another */"),
])

edit("part2.js", [
    ("const APP_BUILD='app v32 \\u00b7 2026-09-15';", "const APP_BUILD='app v33 \\u00b7 2026-09-15';"),
])

edit("audit.js", [
    ("  /* ---- L. record chips beside the week dropdown ---- */",
     "  /* ---- M. suggested parlays ---- */\n"
     "  { const SG=F('buildSuggestions')();\n"
     "    const tiers=SG.tiers;\n"
     "    chk(tiers.every((t,i)=>i===0||(t.legs.length>tiers[i-1].legs.length&&tiers[i-1].legs.every(l=>t.legs.some(x=>x.key===l.key&&x.k===l.k&&x.side===l.side)))),'suggested tiers must only add legs to the one before');\n"
     "    chk(tiers.every((t,i)=>i===0||t.corr<=tiers[i-1].corr+0.02),'a bigger tier should not be more likely to land');\n"
     "    chk(tiers.every(t=>t.legs.every(l=>l.src==='real'&&l.p-F('mlProb')(l.price)>=0.03)),'suggested legs must be real-priced edges');\n"
     "    chk(tiers.every(t=>new Set(t.legs.map(l=>l.key)).size===t.legs.length),'one line per player and stat in a suggestion');\n"
     "    chk(tiers.filter(t=>t.id!=='safe').every(t=>t.added>=1),'medium and aggressive each add at least one leg');\n"
     "    chk(SG.candidates<4||tiers.length===3,'with four or more qualifying lines all three tiers should show');\n"
     "    d.querySelector('#tabs button[data-tab=\"parlay\"]').click();\n"
     "    chk(!!d.getElementById('suggCard'),'suggested parlays card missing from the builder');\n"
     "    chk(d.getElementById('parlayBody').firstElementChild.id==='suggCard','suggested parlays should be the first section');\n"
     "    if(tiers.length){ const before=(S.saved||[]).length; const sb=d.querySelector('[data-suggest-save]'); sb.click();\n"
     "      chk((S.saved||[]).length===before+1&&S.saved[S.saved.length-1].suggested&&S.saved[S.saved.length-1].legs.length>=2,'add to saved parlays did not save the tier');\n"
     "      chk(/suggestion/.test(d.getElementById('savedCard').textContent),'saved suggestion not labelled');\n"
     "      S.saved.pop(); F('save')(); F('renderParlay')(); }\n"
     "    d.getElementById('suggToggle').click(); chk(!d.querySelector('.sugg-grid')&&/Show/.test(d.getElementById('suggToggle').textContent),'minimize did not hide the suggestions');\n"
     "    d.getElementById('suggToggle').click(); chk(/Minimize/.test(d.getElementById('suggToggle').textContent),'show did not bring them back');\n"
     "    console.log(`M. suggested parlays: ${SG.candidates} qualifying lines, tiers ${tiers.map(t=>t.label+' '+t.legs.length+' legs '+(t.corr*100).toFixed(0)+'%').join(', ')||'none'}`); }\n\n"
     "  /* ---- L. record chips beside the week dropdown ---- */"),
])
print("done")
