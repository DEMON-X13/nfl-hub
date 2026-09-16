/* ---------- small helpers ---------- */
function hex2rgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function lum(h){const [r,g,b]=hex2rgb(h).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*r+0.7152*g+0.0722*b;}
function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
function textOn(h){return ratio(h,'#FFFFFF')>=ratio(h,'#132238')?'#FFFFFF':'#132238';}
function darken(h,f){const [r,g,b]=hex2rgb(h);const c=v=>('0'+Math.round(v*f).toString(16)).slice(-2);return '#'+c(r)+c(g)+c(b);}
function tagBg(h){let c=h,i=0;while(Math.max(ratio(c,'#FFFFFF'),ratio(c,'#132238'))<4.5&&i<10){c=darken(c,0.92);i++;}return c;}
function teamCols(t){return TEAM_COLORS[t]||['#5A6673'];}
function chroma(h){const [r,g,b]=hex2rgb(h);return (Math.max(r,g,b)-Math.min(r,g,b))/255;}
function lightness(h){const [r,g,b]=hex2rgb(h);return (Math.max(r,g,b)+Math.min(r,g,b))/2/255;}
function vivid(h){return chroma(h)>=0.35&&lightness(h)>=0.15&&lightness(h)<=0.85;}
/* each team's own colour, falling back through its palette when the primary
   is too dark or too washed out to read as anything but navy */
function tagColor(t){
  if(TAG_OVERRIDE[t]) return TAG_OVERRIDE[t];
  const pal=teamCols(t);
  if(vivid(pal[0])) return pal[0];
  const alt=pal.slice(1).filter(vivid);
  return alt.length?alt.reduce((a,b)=>chroma(b)>chroma(a)?b:a):pal[0];
}
function tag(t,mini){const bg=tagBg(tagColor(t));
  return `<span class="ttag${mini?' mini':''}" style="background:${bg};color:${textOn(bg)};border-color:${darken(bg,.72)}">${t}</span>`;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function fmtDate(g){ if(!g.d) return {day:'',t:''};
  const dt=new Date(g.d+'T12:00:00');
  const day=dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  let t=''; if(g.t){ const [H,M]=g.t.split(':').map(Number);
    const h=((H+11)%12)+1, ap=H<12?'am':'pm'; t=`${h}:${String(M).padStart(2,'0')}${ap} ET`; }
  return {day,t}; }
function fmtML(ml){ return ml==null?'\u2013':(ml>0?'+'+ml:''+ml); }
function mlToDec(ml){ if(ml==null||!isFinite(ml)||ml===0) return null; return ml>0?ml/100+1:100/Math.abs(ml)+1; }
function decToML(d){ if(!isFinite(d)||d<=1) return null; return d>=2?Math.round((d-1)*100):-Math.round(100/(d-1)); }
function num(x,d){ return x==null||!isFinite(x)?'\u2013':(+x).toFixed(d); }
function log(msg,cls=''){ const el=$('log'); if(!el) return; const ph=el.querySelector('[data-placeholder]'); if(ph) ph.remove();
  const d=document.createElement('div'); if(cls)d.className=cls; d.textContent=msg; el.prepend(d); }
function setStatus(id,msg,cls){ const el=$(id); if(el){ el.textContent=msg; el.className=cls||'muted'; } }
function weeks(){ return [...new Set(S.sched.map(g=>+g.w))].sort((a,b)=>a-b); }
function currentWeek(){ return liveWeek(); }
function gamesIn(w){ return S.sched.filter(g=>+g.w===w).sort((a,b)=>((a.d||'')+(a.t||'')).localeCompare((b.d||'')+(b.t||''))); }

/* ---------- games list ---------- */
function renderWeekOptions(){
  const cur=$('weekSel').value?+$('weekSel').value:currentWeek();
  for(const id of ['weekSel']){
    const sel=$(id); if(!sel) continue;
    sel.innerHTML=weeks().map(w=>`<option value="${w}">Week ${w}</option>`).join('');
    sel.value=cur;
  }
}
/* scroll to the top only when the overlay is first opened; a re-render (expanding a player,
   changing a setting) keeps the reader where they were */
function openGameModal(){ const m=$('gameModal'); if(m.hidden){ m.hidden=false; document.body.classList.add('modal-open'); m.scrollTop=0; } }
function closeGameModal(){ const m=$('gameModal'); m.hidden=true; document.body.classList.remove('modal-open'); }
function closeGame(){ S.ui.game=null; save(); closeGameModal(); renderSlate(); }
/* W-L on the model's side of every book main line, frozen pre-game numbers */
function renderRecords(w){
  const wr=$('weekRec'), sr=$('seasonRec'); if(!wr||!sr) return;
  const main=trackRecord().filter(r=>r.kind==='main');
  const line=rows=>`${rows.filter(r=>r.hit).length}\u2013${rows.filter(r=>!r.hit).length}`;
  wr.innerHTML=`Week ${w} <b>${line(main.filter(r=>+r.w===+w))}</b>`;
  sr.innerHTML=`Season <b>${line(main)}</b>`;
}
function renderSlate(){
  if(S.ui.game){ const g=S.sched.find(x=>x.id===S.ui.game); if(!g||!weekOpen(+g.w)) S.ui.game=null; }
  if(!S.ui.game) closeGameModal();
  $('slateView').hidden=false;
  const w=+$('weekSel').value||currentWeek();
  renderRecords(w);
  const gs=gamesIn(w);
  const open=weekOpen(w), lw=liveWeek();
  /* expected points are the biggest input to every projection, so say so when the lines are stale */
  { const ln=$('lineNote');
    if(ln){ const soon=gs.some(g=>{ const k=kickoff(g); return k&&!gameFinal(g)&&k.getTime()-Date.now()<3*864e5; });
      const age=S.gamesFetched?(Date.now()-S.gamesFetched)/864e5:null; const stale=open&&soon&&(age==null||age>3);
      ln.hidden=!stale;
      ln.textContent=!stale?'':(age==null
        ?'Spreads and totals have not been pulled in this browser yet. Expected points are the biggest single input to every projection, so pull scores and lines on the Weekly Update tab before kickoff.'
        :`Spreads and totals were last pulled ${age.toFixed(0)} day${age>=1.5?'s':''} ago. Pull them again on the Weekly Update tab before kickoff; expected points are the biggest single input to every projection.`); } }
  if(!open){
    $('gamesList').innerHTML=`<div class="empty" style="text-align:left;padding:26px 30px">
      <b style="font-family:var(--display);font-size:22px;display:block;margin-bottom:8px">Week ${w} isn't open yet</b>
      <p class="muted" style="margin:0 0 8px">Projections use each player's most recent form, so a number built now, ${w-lw} week${w-lw===1?'':'s'} early, would be based on games that haven't happened. It would be worse than useless: it would look authoritative and be stale.</p>
      <p class="muted" style="margin:0">This opens once week ${lw} is complete. Fixtures below for reference.</p>
      <div style="margin-top:16px">${gs.map(g=>{const d=fmtDate(g);
        return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line)">
          <span class="muted" style="font-size:12px;width:170px">${d.day} ${d.t}</span>${tag(g.a)}<span class="muted">at</span>${tag(g.h)}</div>`;}).join('')}</div>
    </div>`;
    return;
  }
  const rows=gs.map(g=>{
    const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);
    const started=gameStarted(g), fin=gameFinal(g);
    return `<button class="game${fin?' final':(started?' locked':'')}" data-game="${g.id}">
      <div class="when"><b>${d.day}</b>${fin?'<span class="pill ok">FINAL</span>':(started?'<span class="pill warn">LIVE</span>':d.t)}</div>
      <div class="matchup">${tag(g.a)}<span class="at">at</span>${tag(g.h)}</div>
      <div class="lead">${gameHeadline(g).map(x=>{
        const st={pass:'passing_yards',rush:'rushing_yards',rec:'receiving_yards'}[x.k];
        const a=fin?actualFor(g.w,x.v.pl.id):null;
        const av=a?a[st]:null;
        const band=av==null?'':hitBand(av,x.v.mu);
        return `<div><span class="cat">${x.k}</span><span class="nm">${esc(shortName(x.v.pl.n))}</span><span class="v">${x.v.mu.toFixed(0)}<em>yds</em>${
          av!=null?`<span class="va ${band}">${num(av,0)}<em>yds</em></span>`:(fin?'<span class="va pend">\u2013</span>':'')}</span></div>`;}).join('')}</div>
      <div class="tot"><b>${ca.implied.toFixed(0)} \u2013 ${ch.implied.toFixed(0)}</b><small>${g.a} / ${g.h}</small>${hasScore(g)?`<small class="act">(actual ${g.as} \u2013 ${g.hs})</small>`:''}</div>
      <div class="totpts${ca.src==='model'?' assumed':''}"><b>${(ca.implied+ch.implied).toFixed(0)}</b><small>${ca.src==='market'?'points':'our model'}</small>${hasScore(g)?`<small class="act">(actual ${g.as+g.hs})</small>`:''}</div>
      <div class="winner">${(()=>{
        if(ca.implied===ch.implied&&!hasScore(g)) return '<span class="none">\u2013</span><small>even</small>';
        const pick=ca.implied>ch.implied?g.a:g.h, by=Math.abs(ca.implied-ch.implied).toFixed(0);
        if(!hasScore(g)) return tag(pick)+`<small>by ${by}</small>`;
        if(g.as===g.hs) return tag(pick)+`<small>by ${by}</small><small class="act">(tie)</small>`;
        const real=g.as>g.hs?g.a:g.h, right=real===pick;
        return tag(pick)+`<small>by ${by}</small><small class="act ${right?'right':'wrong'}">${right?'\u2713 ':'\u2717 '}${real} by ${Math.abs(g.as-g.hs)}</small>`;
      })()}</div>
      <div class="chev">\u203a</div></button>`;
  }).join('');
  const lastWk=Object.keys(S.processed).length;
  $('gamesList').innerHTML=rows||'<div class="empty">No games scheduled for this week.</div>';
  $('gamesList').querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.game=b.dataset.game; S.ui.open={}; save(); renderGame(); }));
  if(S.ui.game) renderGame();
}

/* ---------- one game ---------- */
function summaryOf(x,lines){
  const want=HEADLINE[x.pl.grp]||[];
  const bits=[];
  for(const s of want){
    const l=lines.find(y=>y.stat===s); if(!l||l.prob) continue;
    bits.push(`<b>${num(l.mu,l.mu<10?1:0)}</b> ${l.m.short||l.m.lbl.toLowerCase()}`);
    if(bits.length>=3) break;
  }
  return bits.join(' &nbsp;\u00b7&nbsp; ');
}
/* colour by what the number actually did, not by how near the projection it was.
   at or above the projection is a payout on the over; below it is graded by how far. */
function hitBand(actual,proj){
  if(actual==null||proj==null) return 'pend';
  const d=actual-proj;
  if(Math.abs(d)<1e-9) return 'exact';
  if(d>0) return 'over';
  return Math.abs(d)<=Math.max(1,proj*0.15)?'near':'far';
}
function actualSummary(x,lines,week){
  const a=actualFor(week,x.pl.id); if(!a) return '<span class="muted">did not play</span>';
  const snap=(S.projections&&S.projections[String(week)]&&S.projections[String(week)][x.pl.id])||{};
  lines=lines.map(l=>{ const s0=snap[l.stat]; return (s0&&!l.prob&&s0.mu!=null)?{...l,mu:s0.mu}:l; });
  const want=HEADLINE[x.pl.grp]||[]; const bits=[];
  for(const s of want){ const l=lines.find(y=>y.stat===s); if(!l||l.prob) continue;
    bits.push(`<b>${num(a[s],0)}</b> ${l.m.short||s} <span class="muted">(proj ${num(l.mu,l.mu<10?1:0)})</span>`); if(bits.length>=3) break; }
  return bits.join(' &nbsp;\u00b7&nbsp; ');
}
/* the Game bets card at the top of a game: both teams, to win and to cover */
function gameBetsCard(g,locked){
  const rows=[g.a,g.h].map(team=>{
    const ml=gameBet(g,team,'ml'), ats=gameBet(g,team,'ats'); const isHome=team===g.h;
    const bookML=isHome?g.mlh:g.mla, bookSP=isHome?g.sph:g.spa;
    const kML=legKey(g.id,'team:'+team,'ml'), kATS=legKey(g.id,'team:'+team,'ats');
    const onML=!!S.parlay[kML], onATS=!!S.parlay[kATS];
    const mark=r=>r==null?'<span class="res">–</span>':(r==='win'?'<span class="res win">✓</span>':(r==='loss'?'<span class="res loss">✗</span>':'<span class="res">push</span>'));
    const rML=locked?settleGameLeg({gid:g.id,team,stat:'ml',k:0}):null;
    const rATS=(locked&&ats)?settleGameLeg({gid:g.id,team,stat:'ats',k:ats.line}):null;
    const row=(kind,b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);
      return `<tr class="${on?'on':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">
        <td class="pick">${locked?mark(res):`<input type="checkbox" ${on?'checked':''} data-leg="${key}" data-k="${b.line==null?0:b.line}" data-side="over" aria-label="Add ${TEAM_NAMES[team]||team} ${label.toLowerCase()}">`}</td>
        <td class="thr">${label}</td>
        <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${Math.max(2,b.p*100).toFixed(0)}%"></div></div></td>
        <td class="pct">${(b.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
        <td class="num est">${fmtML(bookPrice(b.p))}<em>est.</em></td>
        <td class="num book real">${book!=null&&isFinite(book)?fmtML(book):''}</td></tr>`; };
    let h=`<div class="statblk"><h4>${tag(team)} ${TEAM_NAMES[team]||team} <em>our margin ${ml.mu>0?'+':''}${ml.mu.toFixed(1)}</em>${ats?`<em class="mline">book line ${ats.line>0?'+':''}${ats.line}</em>`:''}</h4><table class="rungs">`;
    h+=row('ml',ml,onML,kML,bookML,rML,'To win');
    if(ats) h+=row('ats',ats,onATS,kATS,bookSP,rATS,`To cover ${ats.line>0?'+':''}${ats.line}`);
    return h+'</table></div>';
  }).join('');
  return `<div class="card"><h2>Game bets</h2>
    <p class="muted" style="margin:0 0 10px">${locked?'How each side did against the money line and the spread.':'A team to win, or to cover the spread. Tick one and it joins the parlay like any player line.'} Chances come from our team ratings, pulled halfway to the posted line, with the final margin treated as spread about 13.5 points around that. A game leg is priced as unrelated to player legs, because that relationship has not been measured here.</p>
    ${rows}${!gameBet(g,g.h,'ats')?'<p class="muted" style="margin:0">No spread posted yet, so only the money line is offered.</p>':''}</div>`;
}
function renderGame(){
  const g=S.sched.find(x=>x.id===S.ui.game);
  if(!g){ S.ui.game=null; renderSlate(); return; }
  openGameModal();
  const showAll=!!S.ui.showAll;
  const roster=rosterFor(g,showAll);
  const locked=gameStarted(g), fin=gameFinal(g), haveStats=!!(S.actuals&&S.actuals[String(g.w)]);
  const d=fmtDate(g);
  const meta=PAY.mkt_meta&&PAY.mkt_meta[String(g.w)];
  let html=`<div class="bar">
    <button class="btn quiet" id="backBtn">\u2715 Close</button>
    <span class="grow"></span>
    <label class="muted">Book's cut <select id="marginSel">
      <option value="light" ${S.margin==='light'?'selected':''}>light</option>
      <option value="typical" ${S.margin==='typical'||!S.margin?'selected':''}>typical</option>
      <option value="heavy" ${S.margin==='heavy'?'selected':''}>heavy</option></select></label>
    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
  </div>`;
  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;
  if(locked) html+=`<div class="card" style="border-left:4px solid ${fin?'var(--pick)':'var(--gold)'}"><b>${hasScore(g)?`Final: ${g.a} ${g.as}, ${g.h} ${g.hs}.`:(fin?'Final.':'In progress.')}</b> <span class="muted">${haveStats?'Each player below shows what the model projected against what he actually did.':'Player stats land with the Tuesday upload; until then each player shows only what was projected.'}${hasScore(g)?'':' Pull in scores on the Weekly Update tab for the final score.'}</span></div>`;
  html+=`
  <div class="card">
    <h2 style="display:flex;align-items:center;gap:10px">${tag(g.a)} <span class="muted" style="font-family:var(--body);font-size:15px;font-weight:400">at</span> ${tag(g.h)}</h2>
    <p class="muted" style="margin:0">${d.day} ${d.t}${g.sp!=null?` \u00b7 ${g.sp>0?g.h+' favoured by '+g.sp:g.a+' favoured by '+Math.abs(g.sp)}`:` \u00b7 ${modelMargin(g)>0?g.h:g.a} favoured by ${Math.abs(modelMargin(g)).toFixed(1)} on our numbers`}${gameCtx(g,g.h).src==='market'?` \u00b7 ${g.tot} points expected between them`:` \u00b7 no betting line posted yet, so the game is built from our own team ratings (${(gameCtx(g,g.a).implied+gameCtx(g,g.h).implied).toFixed(0)} points expected)`}</p>
    <p class="muted" style="margin:8px 0 0">${locked?'Click any player to compare the projection with the result.':'Click any player. Each stat shows the chance of clearing each number, an estimate of what a sportsbook would charge, and the real line where one is posted. An arrow next to a real price means the model disagrees with it by 3 points or more: \u2191 the model likes that side, \u2193 it doesn\u2019t.'}</p>
  </div>`;
  html+=gameBetsCard(g,locked);
  html+=gameSuggestCard(g,locked);
  for(const team of [g.a,g.h]){
    const t=roster[team];
    html+=`<div class="teamhdr">${tag(team)} ${TEAM_NAMES[team]||team} <span class="pill">${locked?'played '+t.opp:'playing '+t.opp}</span></div>`;
    if(t.gaps&&t.gaps.length) html+=`<p class="muted" style="margin:-2px 0 8px">Not shown: ${t.gaps.map(x=>`<b>${esc(x.name)}</b> (${x.slot}, ${x.why})`).join(', ')}.</p>`;
    if(!t.players.length){ html+='<div class="empty">Nobody here has enough NFL history to project. Load a roster and depth chart on the Weekly Update tab.</div>'; continue; }
    for(const x of t.players){
      const lines=statLines(x);
      if(!lines.length) continue;
      const open=!!S.ui.open[x.pl.id];
      html+=`<button class="plrbtn" data-open="${x.pl.id}" aria-expanded="${open}">
        <div class="who">${esc(x.pl.n)}<span>${depthLabel(x.pl)||x.pl.pos}${x.starter?'':' \u00b7 backup'}${x.gp<3?' \u00b7 thin history':''}</span></div>
        <div class="sum">${locked?`<span class="finchip${fin?'':' live'}">${fin?'FINAL':'LIVE'}</span>`:''}${(locked&&haveStats)?actualSummary(x,lines,g.w):(locked?'<span class="muted">projected</span> '+summaryOf(x,lines):summaryOf(x,lines))}</div>
        <div class="arrow">${open?'\u2303':'\u2304'}</div></button>`;
      if(!open) continue;
      html+='<div class="plrbody">';
      if(locked){
        const a=haveStats?actualFor(g.w,x.pl.id):null;
        const snap=(S.projections&&S.projections[String(g.w)]&&S.projections[String(g.w)][x.pl.id])||{};
        for(const l of lines){ const s0=snap[l.stat]; if(!s0) continue; if(l.prob&&s0.p!=null) l.p=s0.p; if(!l.prob&&s0.mu!=null) l.mu=s0.mu; }
        html+=`<div class="tiles">`;
        for(const l of lines){
          const L=marketLine(g.w,x.pl.id,l.stat);
          if(l.prob){
            const av=a?a.any_td:null;
            const Ltd=marketLine(g.w,x.pl.id,'any_td');
            html+=`<div class="tile"><span class="tl">Touchdown</span>
              <b class="tv ${av==null?'pend':(av>=1?'over':'far')}">${av==null?'\u2013':(av>=1?'Yes':'No')}</b>
              <span class="tp">${(l.p*100).toFixed(0)}% chance</span>
              <span class="tb${Ltd?'':' none'}">${Ltd?fmtML(Ltd.over):'no book line'}</span></div>`;
            continue;
          }
          const av=a?a[l.stat]:null, proj=l.mu;
          const diff=av==null?null:av-proj;
          const band=hitBand(av,proj);
          const side=(L&&av!=null)?(av>L.line?'over':(av<L.line?'under':'push')):null;
          html+=`<div class="tile"><span class="tl">${l.m.lbl}</span>
            <b class="tv ${band}">${av==null?'\u2013':num(av,0)}</b>
            <span class="tp">proj ${num(proj,proj<10?1:0)}${diff==null?'':` \u00b7 <span class="td ${band}">${diff>0?'+':'\u2212'}${num(Math.abs(diff),Math.abs(diff)<10?1:0)}</span>`}</span>
            <span class="tb${L?'':' none'}">${L?`${L.line}${side?` <span class="side-res ${side}">${side}</span>`:''}`:'no book line'}</span></div>`;
        }
        html+=`</div>`;
        if(a) html+=`<div class="recaplegend"><span><i style="background:var(--pick)"></i>beat the projection</span>
          <span><i style="background:#5E35B1"></i>landed exactly on it</span>
          <span><i style="background:var(--gold)"></i>under, but close</span>
          <span><i style="background:var(--miss)"></i>well under</span></div>
          <p class="muted" style="margin:6px 0 0;font-size:11px">Green means it cleared the model's own number, which is not the same as clearing your sportsbook's line. The book line and which way it went are on each tile.</p>`;
        if(haveStats&&!a) html+='<p class="muted" style="margin:8px 0 0">No stat line for this player, so he most likely didn\u2019t play.</p>';
        html+='</div>'; continue;
      }
      for(const l of lines){
        if(l.prob){
          const [c,lbl]=confTier(l.p);
          const tk=legKey(g.id,x.pl.id,'any_td'), tcur=S.parlay[tk]; const ton=!!tcur&&(tcur.k||1)<2, ton2=!!tcur&&tcur.k===2;
          const tod=oddsFor(g.id,x.pl.id,'any_td',1);
          const p2=tdPlus(l.p,2), [c2,lbl2]=confTier(p2);
          const ta=(locked&&haveStats)?actualFor(g.w,x.pl.id):null;
          const tmark=hit=>hit==null?'<span class="res">\u2013</span>':(hit?'<span class="res win">\u2713</span>':'<span class="res loss">\u2717</span>');
          html+=`<div class="statblk"><h4>Touchdown</h4>
            <table class="rungs"><tr class="${ton?'on':''}">
            <td class="pick">${locked?tmark(ta?ta.any_td>=1:null):`<input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score a touchdown">`}</td>
            <td class="thr">Scores one</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${(l.p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(l.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
            <td class="num est">${fmtML(bookPrice(l.p))}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr>
            <tr class="${ton2?'on':''}">
            <td class="pick">${locked?tmark(ta&&ta.tds!=null?ta.tds>=2:null):`<input type="checkbox" ${ton2?'checked':''} data-leg="${tk}" data-k="2" data-side="over" aria-label="Add ${esc(x.pl.n)} to score two or more touchdowns">`}</td>
            <td class="thr">Scores two or more</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c2}" style="width:${Math.max(2,p2*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(p2*100).toFixed(0)}%</td><td><span class="conf ${c2}">${lbl2}</span></td>
            <td class="num est">${fmtML(bookPrice(p2))}<em>est.</em></td>
            <td class="num book real"></td></tr></table></div>`;
          continue;
        }
        const lk=legKey(g.id,x.pl.id,l.stat), cur=S.parlay[lk];
        const L=marketLine(g.w,x.pl.id,l.stat);
        const actV=(locked&&haveStats&&actualFor(g.w,x.pl.id))?actualFor(g.w,x.pl.id)[l.stat]:null;
        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${actV!=null?`<em class="actual">actual ${num(actV,0)}</em>`:''}${L?`<em class="mline">book line ${L.line}</em>`:''}</h4><table class="rungs">`;
        if(L){
          /* the real, bettable line, both sides */
          const pO=pOver(x.pl.grp,l.stat,l.mu,L.line), tO=devigOver(L.over,L.under);
          const onO=cur&&cur.main&&cur.side==='over', onU=cur&&cur.main&&cur.side==='under';
          const gapO=(pO-mlProb(L.over))*100, gapU=((1-pO)-mlProb(L.under))*100;
          const actM=(locked&&haveStats)?actualFor(g.w,x.pl.id):null; const av=actM?actM[l.stat]:null;
          const resO=av==null?null:(av>L.line?'win':'loss'), resU=av==null?null:(av<L.line?'win':'loss');
          const mark=r=>r==null?'<span class="res">\u2013</span>':(r==='win'?'<span class="res win">\u2713</span>':'<span class="res loss">\u2717</span>');
          html+=`<tr class="mainline ${onO?'on':''}${resO==='win'?' hit':(resO==='loss'?' miss':'')}">
            <td class="pick">${locked?mark(resO):`<input type="checkbox" ${onO?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="over" data-main="1" aria-label="Add over ${L.line}">`}</td>
            <td class="thr">Over ${L.line}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(pO)[0]}" style="width:${Math.max(2,pO*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(pO*100).toFixed(0)}%</td><td><span class="conf ${confTier(pO)[0]}">${confTier(pO)[1]}</span></td>
            <td class="num est"><span class="mkt">book ${(tO*100).toFixed(0)}%</span></td>
            <td class="num book real">${fmtML(L.over)}<em>${gapO>=3?'\u2191':(gapO<=-3?'\u2193':'')}</em></td></tr>
          <tr class="mainline ${onU?'on':''}${resU==='win'?' hit':(resU==='loss'?' miss':'')}">
            <td class="pick">${locked?mark(resU):`<input type="checkbox" ${onU?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="under" data-main="1" aria-label="Add under ${L.line}">`}</td>
            <td class="thr">Under ${L.line}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(1-pO)[0]}" style="width:${Math.max(2,(1-pO)*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${((1-pO)*100).toFixed(0)}%</td><td><span class="conf ${confTier(1-pO)[0]}">${confTier(1-pO)[1]}</span></td>
            <td class="num est"><span class="mkt">book ${((1-tO)*100).toFixed(0)}%</span></td>
            <td class="num book real">${fmtML(L.under)}<em>${gapU>=3?'\u2191':(gapU<=-3?'\u2193':'')}</em></td></tr>`;
        }
        for(const r of l.rungs){
          const [c,lbl]=confTier(r.p);
          const on=cur&&!cur.main&&cur.k===r.k;
          const od=oddsFor(g.id,x.pl.id,l.stat,r.k);
          const v=rungView(x.pl,l.stat,l.mu,r.k,g.w);
          const act=(locked&&haveStats)?actualFor(g.w,x.pl.id):null;
          const hit=act?(act[l.stat]>=r.k):null;
          html+=`<tr class="${on?'on':''}${hit===true?' hit':(hit===false?' miss':'')}">
            <td class="pick">${locked?(hit===true?'<span class="res win">\u2713</span>':(hit===false?'<span class="res loss">\u2717</span>':'<span class="res">\u2013</span>')):`<input type="checkbox" ${on?'checked':''} data-leg="${lk}" data-k="${r.k}" data-side="over"
              aria-label="Add ${esc(x.pl.n)} ${r.k} or more ${l.m.lbl.toLowerCase()} to the parlay">`}</td>
            <td class="thr">${r.k}+</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${Math.max(2,r.p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(r.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
            <td class="num est">${fmtML(v.est)}<em>est.</em></td>
            <td class="num book real">${od!=null?fmtML(od):''}</td></tr>`;
        }
        html+='</table></div>';
      }
      html+='</div>';
    }
  }
  /* keep the reader's place across the re-render. If a row was just tapped, pin that
     row to the same spot on screen (collapsing a player above it would otherwise shift it). */
  const modal=$('gameModal'); const keepY=modal.scrollTop;
  const pinned=renderGame.anchor&&$('gameView').querySelector('[data-open="'+renderGame.anchor+'"]');
  const pinTop=pinned?pinned.getBoundingClientRect().top:null;
  renderGame.anchor=null;
  $('gameView').innerHTML=html;
  modal.scrollTop=keepY;
  if(pinTop!=null){ const nb=$('gameView').querySelector('[data-open="'+pinned.dataset.open+'"]'); if(nb) modal.scrollTop+=nb.getBoundingClientRect().top-pinTop; }
  $('backBtn').addEventListener('click',closeGame);
  $('allCb').addEventListener('change',e=>{ S.ui.showAll=e.target.checked; save(); renderGame(); });
  $('marginSel').addEventListener('change',e=>{ S.margin=e.target.value; save(); renderGame(); renderParlay(); });
  $('gameView').querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.open;
    /* one player open at a time: opening a player closes whoever else was open */
    S.ui.open=S.ui.open[id]?{}:{[id]:true};
    renderGame.anchor=id;
    save(); renderGame(); }));
  $('gameView').querySelectorAll('[data-leg]').forEach(cb=>cb.addEventListener('change',e=>{
    e.stopPropagation();
    toggleLeg(cb.dataset.leg, +cb.dataset.k, g, cb.dataset.side||'over', cb.dataset.main==='1'); }));
}

/* ---------- weekly stats ingest ---------- */
function rowStats(r){
  const g=k=>{const v=parseFloat(r[k]); return isFinite(v)?v:0;};
  const o={attempts:g('attempts'),completions:g('completions'),passing_yards:g('passing_yards'),
    passing_tds:g('passing_tds'),passing_interceptions:g('passing_interceptions'),
    carries:g('carries'),rushing_yards:g('rushing_yards'),rushing_tds:g('rushing_tds'),
    receptions:g('receptions'),targets:g('targets'),receiving_yards:g('receiving_yards'),
    receiving_tds:g('receiving_tds'),fg_att:g('fg_att'),fg_made:g('fg_made'),pat_made:g('pat_made'),pat_att:g('pat_att')};
  o.scrim_yards=o.rushing_yards+o.receiving_yards;
  o.tds=o.rushing_tds+o.receiving_tds;   /* count, for the 2+ line */
  o.any_td=o.tds>=1?1:0;
  o.kick_pts=3*(g('fg_made_0_19')+g('fg_made_20_29')+g('fg_made_30_39'))+4*g('fg_made_40_49')+5*(g('fg_made_50_59')+g('fg_made_60_'))+o.pat_made;
  return o;
}
function posGrp(p){ const x=String(p||'').toUpperCase(); if(x==='FB'||x==='HB') return 'RB';
  return ['QB','RB','WR','TE','K'].includes(x)?x:null; }
function ingestStats(rows){
  const byGame={};
  for(const r of rows){
    if(+r.season!==SEASON) continue;
    if(r.season_type&&r.season_type!=='REG') continue;
    const w=+r.week; if(!isFinite(w)) continue;
    const grp=posGrp(r.position); if(!grp) continue;
    const g=S.sched.find(x=>+x.w===w&&(x.h===r.team||x.a===r.team));
    if(!g) continue;
    (byGame[g.id]??={g,recs:[]}).recs.push({id:r.player_id,name:r.player_display_name||r.player_name,grp,pos:r.position,
      team:r.team,opp:r.opponent_team,st:rowStats(r)});
  }
  const done=[],skipped=[];
  const ids=Object.keys(byGame).sort((a,b)=>(byGame[a].g.w-byGame[b].g.w)||((byGame[a].g.d||'')+(byGame[a].g.t||'')).localeCompare((byGame[b].g.d||'')+(byGame[b].g.t||'')));
  for(const id of ids){
    if(S.processedGames[id]){ skipped.push(id); continue; }
    const {g,recs}=byGame[id];
    const A=(S.actuals[String(g.w)]??={});
    for(const r of recs) A[r.id]={...r.st,team:r.team,opp:r.opp};
    gradeGame(g,recs); applyGame(g,recs);
    S.processedGames[id]=true; done.push(g);
  }
  /* a week counts as done only once every one of its games is in */
  for(const w of weeks()){ if(gamesIn(w).every(g=>S.processedGames[g.id])) S.processed[w]=true; }
  return {done,skipped,games:ids.length};
}
/* score the projections the app was showing, before the state moves on */
function gradeGame(g,recs){
  buildNorm();
  const w=g.w;
  const actual={}; for(const r of recs) actual[r.id]=r;
  const P=((S.projections??={})[String(w)]??={});
  const H=((S.headlines??={})[String(w)]??={});
  /* keep the headline exactly as it read before kickoff, players and all */
  H[g.id]=gameHeadline(g).map(x=>({k:x.k,pid:x.v.pl.id,n:x.v.pl.n,team:x.v.team,mu:x.v.mu}));
  const roster=rosterFor(g,true);
  for(const team in roster) for(const x of roster[team].players){
    const snap=(P[x.pl.id]??={});
    for(const l of statLines(x)){
      if(l.prob){ snap[l.stat]={p:l.p}; continue; }
      /* keep the chances shown, not just the projection, so the track record scores what was on screen */
      const o={mu:l.mu,r:l.rungs.map(r=>[r.k,+r.p.toFixed(4)])};
      const L=marketLine(w,x.pl.id,l.stat); if(L) o.ml=[L.line,+pOver(x.pl.grp,l.stat,l.mu,L.line).toFixed(4)];
      snap[l.stat]=o;
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
}
function applyGame(g,recs){
  const teamAgg={},defAgg={},defgAgg={};
  for(const r of recs){
    const t=(teamAgg[r.team]??={t_pass_att:0,t_carries:0,t_plays:0,t_pass_yds:0,t_rush_yds:0,t_targets:0,t_tds:0,t_fg_att:0,t_pat_att:0});
    t.t_pass_att+=r.st.attempts; t.t_carries+=r.st.carries; t.t_pass_yds+=r.st.passing_yards;
    t.t_rush_yds+=r.st.rushing_yards; t.t_targets+=r.st.targets;
    t.t_tds+=r.st.passing_tds+r.st.rushing_tds; t.t_fg_att+=r.st.fg_att; t.t_pat_att+=r.st.pat_att;
    const dd=(defAgg[r.opp]??={d_pass_yds:0,d_rush_yds:0,d_pass_att:0,d_carries:0,d_tds:0});
    dd.d_pass_yds+=r.st.passing_yards; dd.d_rush_yds+=r.st.rushing_yards;
    dd.d_pass_att+=r.st.attempts; dd.d_carries+=r.st.carries; dd.d_tds+=r.st.rushing_tds;
    const dg=((defgAgg[r.opp]??={})[r.grp]??={});
    for(const s of (GRP_STATS[r.grp]||[])) dg[s]=(dg[s]||0)+(r.st[s]||0);
  }
  for(const t in teamAgg){ teamAgg[t].t_plays=teamAgg[t].t_pass_att+teamAgg[t].t_carries;
    const cur=(S.teams[t]??=Object.fromEntries(TCOLS.map(c=>[c,[0,0]])));
    for(const c of TCOLS) pushEwm(cur[c],teamAgg[t][c],A6); }
  for(const t in defAgg){ const cur=(S.defs[t]??=Object.fromEntries(DCOLS.map(c=>[c,[0,0]])));
    for(const c of DCOLS) pushEwm(cur[c],defAgg[t][c],A8); }
  for(const t in defgAgg){ const T=(S.defg[t]??={});
    for(const gg in defgAgg[t]){ const G=(T[gg]??={});
      for(const s of (GRP_STATS[gg]||[])){ G[s]??=[0,0]; pushEwm(G[s],defgAgg[t][gg][s]||0,A8); } } }
  for(const r of recs){
    let p=S.players[r.id];
    if(!p){ p=S.players[r.id]={id:r.id,n:r.name,pos:r.pos,grp:r.grp,team:r.team,gp:0,base_gp:0,cn:0,e5:{},e3:{},car:{},py:{}};
      for(const s of (GRP_STATS[r.grp]||[])){ p.e5[s]=[0,0]; p.e3[s]=[0,0]; p.car[s]=[0,0]; p.py[s]=null; } }
    p.team=r.team; p.gp++;
    for(const s of (GRP_STATS[p.grp]||[])){
      p.e5[s]??=[0,0]; p.e3[s]??=[0,0]; p.car[s]??=[0,0];
      const v=r.st[s]||0;
      pushEwm(p.e5[s],v,A5); pushEwm(p.e3[s],v,A3);
      p.car[s][0]+=v; p.car[s][1]+=1;
    }
  }
  buildNorm();
}
function ingestDepth(rows){
  const best={}; let dt='';
  for(const r of rows){
    const pos=String(r.pos_abb||'').toUpperCase()==='PK'?'K':String(r.pos_abb||'').toUpperCase();
    if(!['QB','RB','WR','TE','K'].includes(pos)) continue;
    const id=r.gsis_id; if(!id) continue;
    const d=String(r.dt||''); if(d>dt) dt=d;
    const rank=parseInt(r.pos_rank,10); if(!isFinite(rank)) continue;
    const cur=best[id];
    if(!cur||d>cur.d||(d===cur.d&&rank<cur.rank)) best[id]={d,team:r.team,pos,rank,nm:r.player_name};
  }
  S.depth={};
  for(const id in best){ const b=best[id];
    if(b.d===dt||!dt) S.depth[id]=[b.team,b.pos,b.rank,b.nm]; }
  return {n:Object.keys(S.depth).length,dt:dt.slice(0,10)};
}
function ingestRoster(rows){
  let moved=0,added=0,dropped=0;
  const teams=new Set(rows.map(r=>r.team).filter(Boolean));
  const full=rows.length>1200&&teams.size>=30;   /* only prune from a whole-league file */
  const onRoster=new Set();
  if(full) for(const r of rows){
    const id=r.gsis_id||r.player_id;
    if(id&&['ACT','DEV'].includes(String(r.status||'').toUpperCase())) onRoster.add(id);
  }
  for(const r of rows){
    const id=r.gsis_id||r.player_id; if(!id) continue;
    const grp=posGrp(r.position); if(!grp) continue;
    const team=r.team||r.recent_team; if(!team) continue;
    const st=String(r.status||'').toUpperCase();
    if(S.players[id]){ if(S.players[id].team!==team){S.players[id].team=team;moved++;} }
    else if(st==='ACT'||st===''){
      const p={id,n:r.full_name||r.player_name||id,pos:r.position,grp,team,gp:0,base_gp:0,cn:0,e5:{},e3:{},car:{},py:{}};
      for(const s of (GRP_STATS[grp]||[])){p.e5[s]=[0,0];p.e3[s]=[0,0];p.car[s]=[0,0];p.py[s]=null;}
      S.players[id]=p; added++;
    }
    if(['RES','CUT','EXE','NON','PUP','IR'].includes(st)) S.inactive[id]={week:'season',status:st};
    else if(S.inactive[id]&&S.inactive[id].week==='season') delete S.inactive[id];
  }
  if(full){ for(const id of Object.keys(S.players)){
    if(!onRoster.has(id)){ delete S.players[id]; delete S.inactive[id]; dropped++; } } }
  return {moved,added,dropped,full};
}
function ingestInjuries(rows){
  const w=currentWeek(); let out=0;
  for(const r of rows){
    if(+r.season!==SEASON||+r.week!==w) continue;
    const id=r.gsis_id||r.player_id; if(!id) continue;
    const st=String(r.report_status||r.game_status||'').trim();
    if(st==='Out'||st==='Doubtful'){ S.inactive[id]={week:w,status:st}; out++; }
    else if(S.inactive[id]&&S.inactive[id].week===w) delete S.inactive[id];
  }
  return {out,week:w};
}

/* ---------- how it works ---------- */
function renderModel(){
  $('modelValidation').innerHTML=`<h3>Tested on a season it never saw</h3>
    <p class="muted" style="margin:0 0 10px">Built on 2019 through 2024, then run against all of 2025. Average miss is how far the projection landed from the real number, in that stat's own units. "Recent form" is a five-game weighted average of the same player, which is what anyone can work out for free, and is the honest thing to beat.</p>
    <table><thead><tr><th>Stat</th><th class="num">Average miss</th><th class="num">Recent form alone</th><th class="num">Season average</th></tr></thead><tbody>
    ${VALIDATION.map(v=>`<tr><td>${v[0]}</td><td class="num"><b>${v[1]}</b></td><td class="num muted">${v[2]}</td><td class="num muted">${v[3]}</td></tr>`).join('')}
    </tbody></table>
    <h3>Are the percentages honest?</h3>
    <p class="muted" style="margin:0 0 10px">This is what decides whether a rating means anything. Across 146,000 test thresholds in 2025, here is what the model said against what happened.</p>
    <table><thead><tr><th>When it said</th><th class="num">It happened</th><th class="num">Off by</th></tr></thead><tbody>
    ${CALIB.map(c=>`<tr><td>${c[0]}</td><td class="num">${c[1]}</td><td class="num">${c[2]>0?'+':''}${c[2]} pts</td></tr>`).join('')}
    </tbody></table>
    <p class="muted" style="margin:8px 0 0">Everything lands within about three points, and it leans very slightly optimistic. So treat a 55% as somewhere in the low fifties, and don't read much into the difference between 48% and 52%.</p>
    <h3>Does it hold up year to year?</h3>
    <p class="muted" style="margin:0 0 10px">A model can look good on one season by luck. So it was rebuilt from scratch five times, each version only allowed to see the seasons before the one it was tested on. No version ever saw its own test year. Numbers are how much closer it landed than a five-game rolling average of the same player.</p>
    <table><thead><tr><th>Stat</th><th class="num">2021</th><th class="num">2022</th><th class="num">2023</th><th class="num">2024</th><th class="num">2025</th><th class="num">Average</th></tr></thead><tbody>
    ${WALK.map(r=>`<tr><td>${r[0]}</td>${r.slice(1,6).map(v=>`<td class="num ${parseFloat(v)<0?'delta down':''}">${v}%</td>`).join('')}<td class="num"><b>${r[6]}%</b></td></tr>`).join('')}
    </tbody></table>
    <p class="muted" style="margin:8px 0 0">Two things to take from this. It beats a rolling average in 37 of 40 season-by-season tests, so it is doing something real and repeatable rather than fitting one year. But the size of the gain is honest: big for quarterback passing volume, small for running back and receiver counting stats, where a player's own recent average is already close to the best anyone can do.</p>
    <h3>And the percentages, year by year</h3>
    <table><thead><tr><th>Season tested</th><th class="num">Said 25%, happened</th><th class="num">Said 50%, happened</th><th class="num">Said 75%, happened</th></tr></thead><tbody>
    ${SEASONCAL.map(r=>`<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td></tr>`).join('')}
    </tbody></table>
    <p class="muted" style="margin:8px 0 0">Same story every season: reliable to about two points, with a consistent small lean toward optimism. That lean is stable enough to just keep in mind rather than correct for.</p>`;
  const acc=S.accuracy||{}, keys=Object.keys(acc).filter(k=>acc[k].n>0);
  $('modelSeason').innerHTML=keys.length?`<h3>How it's doing this season</h3>
    <p class="muted" style="margin:0 0 10px">Every projection the app showed in 2026, checked against what happened. This fills in on its own each time you upload a week.</p>
    <table><thead><tr><th>Stat</th><th class="num">Graded</th><th class="num">Average miss</th><th class="num">Recent form alone</th><th class="num">Better by</th></tr></thead><tbody>`+
    keys.sort((a,b)=>acc[b].n-acc[a].n).map(k=>{const e=acc[k],m=e.ae/e.n,b=e.base/e.n,i=b>0?100*(b-m)/b:0;
      return `<tr><td>${MKT[k]?MKT[k].lbl:k}</td><td class="num">${e.n}</td><td class="num">${m.toFixed(2)}</td><td class="num muted">${b.toFixed(2)}</td><td class="num ${i>=0?'delta up':'delta down'}">${i>=0?'+':''}${i.toFixed(1)}%</td></tr>`;
    }).join('')+'</tbody></table>':'';
}

/* ---------- track record tab ---------- */
function trackTable(title,groups,note){
  /* groups: [[label, rows], ...] */
  let html=`<h3>${title}</h3>`+(note?`<p class="muted" style="margin:0 0 8px">${note}</p>`:'');
  html+=`<table><thead><tr><th>${title.includes('week')?'Week':(title.includes('market')?'Market':'')}</th><th class="num">Lines</th><th class="num">Model said</th><th class="num">Happened</th><th class="num">Difference</th><th class="num">Noise margin</th><th>Read</th></tr></thead><tbody>`;
  for(const [lbl,rows] of groups){
    const t=trackSummary(rows); if(!t.n) continue;
    const thin=t.n<30;
    let read, cls='muted';
    if(thin) read='too few to read';
    else if(t.diff>=-t.margin&&t.diff<=t.margin){ read='held up'; cls='delta up'; }
    else if(t.diff>t.margin){ read=`beat its number by ${(t.diff*100).toFixed(0)}`; cls='delta up'; }
    else { read=`short by ${(-t.diff*100).toFixed(0)}`; cls='delta down'; }
    html+=`<tr class="${thin?'muted':''}"><td>${lbl}</td><td class="num">${t.n}</td><td class="num">${(t.said*100).toFixed(1)}%</td><td class="num"><b>${(t.hit*100).toFixed(1)}%</b></td>
      <td class="num ${t.diff>=0?'delta up':'delta down'}">${t.diff>=0?'+':'\u2212'}${(Math.abs(t.diff)*100).toFixed(1)}</td><td class="num muted">\u00b1${(t.margin*100).toFixed(1)}</td><td class="${cls}">${read}</td></tr>`;
  }
  return html+'</tbody></table>';
}
function trackBookTable(groups){
  let html=`<h3>Against the book</h3><p class="muted" style="margin:0 0 8px">Lines that carried a real price: the main lines built in for the week, plus any sheet you uploaded. The book's chance includes its cut, so the model has to clear that too. Return is a flat $100 on every line at the price shown.</p>`;
  html+=`<table><thead><tr><th></th><th class="num">Lines</th><th class="num">Model said</th><th class="num">Book implied</th><th class="num">Happened</th><th class="num">Return per $100</th><th>Read</th></tr></thead><tbody>`;
  for(const [lbl,rows] of groups){
    const n=rows.length; if(!n) continue;
    const said=rows.reduce((a,r)=>a+r.p,0)/n, imp=rows.reduce((a,r)=>a+r.imp,0)/n, hit=rows.reduce((a,r)=>a+r.hit,0)/n;
    const ret=rows.reduce((a,r)=>a+(r.hit?(mlToDec(r.ml)-1)*100:-100),0)/n;
    const thin=n<30; const read=thin?'too few to read':(ret>=0?'in profit':'losing');
    html+=`<tr class="${thin?'muted':''}"><td>${lbl}</td><td class="num">${n}</td><td class="num">${(said*100).toFixed(1)}%</td><td class="num">${(imp*100).toFixed(1)}%</td><td class="num"><b>${(hit*100).toFixed(1)}%</b></td>
      <td class="num ${ret>=0?'delta up':'delta down'}">${ret>=0?'+':'&minus;'}$${Math.abs(ret).toFixed(0)}</td><td class="${thin?'muted':(ret>=0?'delta up':'delta down')}">${read}</td></tr>`;
  }
  return html+'</tbody></table>';
}
function renderTrack(){
  const body=$('trackBody'); if(!body) return;
  const ms=$('trackMarket');
  if(ms&&ms.options.length<=1) for(const m of MARKETS){ const o=document.createElement('option'); o.value=m.k; o.textContent=m.lbl; ms.appendChild(o); }
  const mk=ms?ms.value:'all', kind=$('trackKind')?$('trackKind').value:'all';
  let rows=trackRecord();
  const total=rows.length;
  if(mk!=='all') rows=rows.filter(r=>r.stat===mk);
  if(kind!=='all') rows=rows.filter(r=>r.kind===kind);
  if(!total){ body.innerHTML='<p class="muted">Nothing graded yet. Once a week\u2019s player stats are uploaded, every projection from that week is scored here.</p>'; return; }
  if(!rows.length){ body.innerHTML='<p class="muted">Nothing graded for that combination yet.</p>'; return; }
  const all=trackSummary(rows);
  const bands=[['High (70% and up)',rows.filter(r=>r.p>=0.70)],['Med (45% to 70%)',rows.filter(r=>r.p>=0.45&&r.p<0.70)],['Low (under 45%)',rows.filter(r=>r.p<0.45)]];
  const hi=trackSummary(bands[0][1]);
  let html=`<div class="bigp">
    <div class="box hero"><b>${(all.hit*100).toFixed(1)}%</b><span>happened, across ${all.n} lines that said ${(all.said*100).toFixed(1)}% on average</span></div>
    <div class="box"><b class="${all.diff>=0?'delta up':'delta down'}">${all.diff>=0?'+':'\u2212'}${(Math.abs(all.diff)*100).toFixed(1)}</b><span>points versus what was said, noise margin \u00b1${(all.margin*100).toFixed(1)}</span></div>
    <div class="box"><b>${hi.n?(hi.hit*100).toFixed(1)+'%':'\u2013'}</b><span>${hi.n?`happened on the ${hi.n} High-confidence lines, which said ${(hi.said*100).toFixed(1)}%`:'no High-confidence lines graded yet'}</span></div>
    <div class="box"><b>${(Math.sqrt(rows.reduce((a,r)=>a+(r.p-r.hit)**2,0)/rows.length)).toFixed(3)}</b><span>Brier score. Lower is better, 0.500 is a coin flip on every line</span></div>
  </div>`;
  html+=trackTable('By confidence band',bands,'The bands are the labels on the game pages. A band has held up when what happened sits inside the noise margin of what was said. Short means the model has been over-confident there so far; treat that band a notch lower until it recovers.');
  const bk=[]; for(let b=0;b<100;b+=10){ const r=rows.filter(x=>x.p*100>=b&&x.p*100<b+10); if(r.length) bk.push([`${b}\u2013${b+10}%`,r]); }
  html+=trackTable('By what the model said',bk,'Ten-point buckets. Lines in grey have too few results to read; a difference is only worth acting on when it is outside the noise margin and shows up more than one week running.');
  const wk=[...new Set(rows.map(r=>r.w))].sort((a,b)=>a-b).map(w=>[`Week ${w}`,rows.filter(r=>r.w===w)]);
  html+=trackTable('By week',wk,'How the season is going week to week.');
  const stats=[...new Set(rows.map(r=>r.stat))].map(st=>[MKT[st]?MKT[st].lbl:st,rows.filter(r=>r.stat===st)]).sort((a,b)=>b[1].length-a[1].length);
  html+=trackTable('By market',stats,'');
  const priced=rows.filter(r=>r.ml!=null&&r.imp!=null);
  if(priced.length){
    const edge=r=>r.p-r.imp;
    html+=trackBookTable([['All priced lines',priced],
      ['Model saw value (its chance at least 3 points above the book)',priced.filter(r=>edge(r)>=0.03)],
      ['Model saw a small edge (0 to 3 points)',priced.filter(r=>edge(r)>=0&&edge(r)<0.03)],
      ['Model saw no value',priced.filter(r=>edge(r)<0)],
      ['High confidence, priced',priced.filter(r=>r.p>=0.70)],['Med confidence, priced',priced.filter(r=>r.p>=0.45&&r.p<0.70)],['Low confidence, priced',priced.filter(r=>r.p<0.45)]]);
  }
  /* the user's own locked parlays */
  const legs=[]; for(const sp of (S.saved||[])) for(const l of sp.legs){ const res=settleLeg(l); if(res==='win'||res==='loss') legs.push({p:l.p,hit:res==='win'?1:0,w:l.week}); }
  if(legs.length){
    const lb=[['High (70% and up)',legs.filter(r=>r.p>=0.70)],['Med (45% to 70%)',legs.filter(r=>r.p>=0.45&&r.p<0.70)],['Low (under 45%)',legs.filter(r=>r.p<0.45)],['All your legs',legs]];
    html+=trackTable('Your locked parlays, leg by leg',lb,`${legs.length} settled leg${legs.length===1?'':'s'} across your saved parlays, scored at the chance the model gave each one when you locked it.`);
  }
  html+='<p class="muted" style="margin:10px 0 0;font-size:12px">A book main line is scored on whichever side the model favoured, the side you would have bet. A player with no stat line for the week is skipped, the same way a leg on him would be void. Pushes on a book line are skipped.</p>';
  body.innerHTML=html;
}
/* ---------- wiring ---------- */
/* when credits were last spent, and on what. PAY.price_pull is written by the
   build that actually pulled; older builds only recorded the date on the main lines. */
function renderPricePull(){
  const el=$('pricePull'); if(!el) return;
  const pp=PAY.price_pull, meta=PAY.mkt_meta||{}, all=PAY.prices||{};
  const weeks=Object.keys(all).sort((a,b)=>a-b);
  const counts=weeks.length?weeks.map(w=>`week ${w}: ${all[w].length.toLocaleString()} price${all[w].length===1?'':'s'}`).join(', '):'no prices in this build';
  const fmt=t=>{ const d=new Date(/Z|[+-]\d\d:?\d\d$/.test(t)?t:t+'Z');
    return isFinite(d)?d.toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):t; };
  let head, sub;
  if(pp&&pp.at){
    head=`Last credit pull: <b>${fmt(pp.at)}</b>, for week ${pp.week}`
        +(pp.credits_spent!=null?`, ${pp.credits_spent} credit${pp.credits_spent===1?'':'s'} spent`:'')+'.';
    sub=counts;
  } else {
    const w=Object.keys(meta).sort((a,b)=>b-a)[0];
    head=(w&&meta[w].asof)?`Last credit pull: <b>${meta[w].asof}</b>, for week ${w}.`:'No credit pull recorded in this build.';
    sub=counts+' \u00b7 this build recorded the date only; later builds record the time and the credits left';
  }
  /* the balance is read on every build from an endpoint that costs nothing */
  const c=PAY.credits; let bal='';
  if(c&&c.left!=null){
    const total=c.used!=null?c.used+c.left:null;
    const low=total?c.left/total<0.2:false;
    bal=`<div${low?' class="warn"':''}><b>${c.left.toLocaleString()}</b> credit${c.left===1?'':'s'} left`
       +(total?` of ${total.toLocaleString()} this month`:'')
       +(c.used!=null?`, ${c.used.toLocaleString()} used`:'')
       +(c.at?` <span class="muted">\u00b7 checked ${fmt(c.at)}</span>`:'')+'</div>';
  }
  el.innerHTML=`<div>${head}</div><div class="muted">${sub}</div>${bal}`;
}
function renderAll(){ buildNorm(); renderWeekOptions(); renderSlate(); renderParlay(); renderModel(); renderTrack(); renderPricePull();
  $('buildNote').textContent=`Model ${MODEL_BUILD}. ${APP_BUILD}. ${Object.keys(S.processed).length} week${Object.keys(S.processed).length===1?'':'s'} of ${SEASON} loaded.`; }
['trackMarket','trackKind'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change',renderTrack); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('gameModal').hidden) closeGame(); });
$('gameModal').addEventListener('click',e=>{ if(e.target===$('gameModal')) closeGame(); });
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
  document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='tab-'+b.dataset.tab); }));
function parseCSV(file){ return new Promise(res=>Papa.parse(file,{header:true,skipEmptyLines:true,complete:r=>res(r.data)})); }

async function boot(){
  const saved=await store.get();
  S=freshState();
  let rebuilt=null;
  if(saved&&saved.build===MODEL_BUILD&&saved.dataBuild===DATA_BUILD){ S={...S,...saved}; }
  else if(saved){
    rebuilt=(saved.dataBuild&&saved.dataBuild!==DATA_BUILD)||!saved.dataBuild
      ? 'Rosters and depth charts in this build are newer than what was saved in this browser, so the season was rebuilt from the current one. Your parlays, stake and any prices you uploaded were kept; weeks built into this file were replayed.'
      : 'The model changed, so the season was rebuilt from the current baseline. Your parlays, stake and any prices you uploaded were kept; weeks built into this file were replayed.';
    /* the season's data is built in and replays below; keep what only you could have made */
    for(const k of ['parlay','saved','odds','stake','bookPrice','margin','gamesFetched']) if(saved[k]!=null) S[k]=saved[k];
  }
  S.ui={game:null,open:{},showAll:false};
  S.accuracy=S.accuracy||{}; S.inactive=S.inactive||{}; S.depth=S.depth||{};
  S.odds=S.odds||{}; S.parlay=S.parlay||{}; if(S.stake==null) S.stake=20; S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{}; S.headlines=S.headlines||{};
  let baked=null;
  if(!window.NO_BAKED){ try{ baked=applyBaked(); }catch(e){ console.error('built-in data failed to apply',e); setTimeout(()=>log('Built-in data could not be applied: '+(e&&e.message||e)+'. The upload buttons still work.','err'),0); } }
  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  $('buildTag').textContent=`${MODEL_BUILD} \u00b7 ${APP_BUILD}`;
  renderAll();
  if(rebuilt){ $('rebuildNote').hidden=false; $('rebuildNote').textContent=rebuilt; setTimeout(()=>log(rebuilt,'warn'),0); }
  if(baked&&(baked.stats.length||baked.prices||baked.inj)){
    const parts=[]; if(baked.stats.length) parts.push(`${baked.stats.length} game${baked.stats.length===1?'':'s'} of stats graded and applied`);
    if(baked.prices) parts.push(`${baked.prices} prices loaded`); if(baked.inj) parts.push(`${baked.inj} players ruled out`);
    setTimeout(()=>log(`Built into this file (${PAY.baked_at?String(PAY.baked_at).slice(0,16).replace('T',' '):'weekly build'}): ${parts.join(', ')}. Nothing to upload.`,'ok'),0); }
  else {
    /* a return visit: the built-in data is already here, so nothing new was applied and
       nothing was logged. Say what is loaded rather than leave the first-visit placeholder,
       which claimed there was no 2026 data at all. */
    /* games, not weeks: S.processed only counts a week once every game in it is final */
    const gm=Object.keys(S.processedGames||{}).length;
    const priced=Object.values(S.odds).filter(o=>o&&Object.keys(o).length).length;
    const bits=[];
    if(gm) bits.push(`${gm} game${gm===1?'':'s'} of ${SEASON} stats`);
    if(priced) bits.push(`prices for ${priced} game${priced===1?'':'s'}`);
    setTimeout(()=>log(bits.length
      ?`Already loaded in this browser: ${bits.join(' and ')}, from the build of ${PAY.baked_at?String(PAY.baked_at).slice(0,16).replace('T',' '):'the weekly job'}. Nothing to upload.`
      :`No ${SEASON} data yet. Projections are running off how everyone finished ${SEASON-1}.`,'ok'),0); }
}
/* the balance the last build published. It is exact except while a pull is running:
   credits only move when a build spends them, and every build republishes this file.
   The page cannot ask the odds API itself, because admin.html is public and the key
   would have to be in it. */
const CREDITS_URL='https://demon-x13.github.io/nfl-hub/props/data/credits.json';
$('checkCredits').addEventListener('click',async()=>{
  const b=$('checkCredits'); b.disabled=true; const was=b.textContent; b.textContent='Checking\u2026';
  try{
    const r=await fetch(CREDITS_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const c=await r.json();
    if(!c||c.left==null) throw new Error('that file carries no balance');
    const same=PAY.credits&&PAY.credits.left===c.left&&PAY.credits.at===c.at;
    PAY.credits=c; renderPricePull();
    setStatus('creditsStatus',same?'Unchanged since this page was built.':'Updated from the published balance.','ok');
  }catch(e){
    setStatus('creditsStatus','Could not read the published balance ('+e.message+'). The figure above is the one built into this file.','err');
  }
  b.textContent=was; b.disabled=false;
});
$('weekSel').addEventListener('change',()=>{S.ui.game=null;renderSlate();});
$('fetchGames').addEventListener('click',async()=>{
  const b=$('fetchGames'); b.disabled=true; const was=b.textContent; b.textContent='Fetching\u2026';
  try{
    const r=await fetch(GAMES_URL,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const rows=Papa.parse(await r.text(),{header:true,skipEmptyLines:true}).data;
    const byId=Object.fromEntries(S.sched.map(g=>[g.id,g])); let upd=0;
    for(const row of rows){
      if(+row.season!==SEASON||row.game_type!=='REG') continue;
      const g=byId[row.game_id]; if(!g) continue;
      g.d=row.gameday||g.d; g.t=row.gametime||g.t;
      const sp=parseFloat(row.spread_line), tot=parseFloat(row.total_line);
      g.sp=isFinite(sp)?sp:g.sp; g.tot=isFinite(tot)?tot:g.tot;
      for(const [f,c] of [['mla','away_moneyline'],['mlh','home_moneyline'],['spa','away_spread_odds'],['sph','home_spread_odds']]){ const v=parseFloat(row[c]); if(isFinite(v)) g[f]=v; }
      const hs=parseFloat(row.home_score), as_=parseFloat(row.away_score);
      if(isFinite(hs)&&isFinite(as_)){ g.hs=hs; g.as=as_; } upd++;
    }
    S.gamesFetched=Date.now(); save(); renderSlate();
    setStatus('gamesStatus',`Refreshed ${upd} games. Kickoffs, spreads and totals feed the projections.`,'ok');
  }catch(err){ setStatus('gamesStatus','Could not reach the schedule file: '+err.message+'. Try again in a moment.','err'); }
  b.textContent=was; b.disabled=false;
});
$('upAll').addEventListener('click',()=>$('allFiles').click());
$('allFiles').addEventListener('change',async e=>{
  const files=[...e.target.files]; e.target.value=''; if(!files.length) return;
  for(const f of files){
    const rows=await parseCSV(f);
    if(!rows.length){ log(`${f.name}: empty file.`,'err'); continue; }
    const c=rows[0];
    if('pos_rank' in c&&'pos_abb' in c){ const r=ingestDepth(rows);
      log(`${f.name}: depth chart read, ${r.n} starters and backups ranked (${r.dt}).`,'ok'); }
    else if('report_status' in c||'game_status' in c){ const r=ingestInjuries(rows);
      log(`${f.name}: injury report read, ${r.out} player${r.out===1?'':'s'} ruled out for week ${r.week}.`,'ok'); }
    else if('player_id' in c && 'week' in c && 'attempts' in c){
      const r=ingestStats(rows);
      if(r.done.length){
        const names=r.done.map(g=>`${g.a} at ${g.h}`);
        log(`${f.name}: ${r.done.length} game${r.done.length===1?'':'s'} counted \u2014 ${names.join(', ')}. Projections updated.`,'ok');
        if(r.skipped.length) log(`${r.skipped.length} game${r.skipped.length===1?'':'s'} in that file were already counted and were skipped.`,'warn');
      } else if(r.games) log(`${f.name}: nothing new, all ${r.games} game${r.games===1?'':'s'} in it were already counted.`,'warn');
      else log(`${f.name}: no 2026 regular-season rows found.`,'warn'); }
    else if('gsis_id' in c||('player_id' in c&&'position' in c)){ const r=ingestRoster(rows);
      log(`${f.name}: roster read, ${r.moved} team change${r.moved===1?'':'s'}, ${r.added} added${r.full?`, ${r.dropped} no longer rostered and removed`:', partial file so nobody was removed'}.`,'ok'); }
    else log(`${f.name}: not a file this app knows how to read.`,'err');
  }
  save(); renderAll();
});
$('exportBtn').addEventListener('click',()=>downloadText(`prop_model_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(S)));
$('importBtn').addEventListener('click',()=>{
  if(!confirm('Import a backup?\n\nIt replaces everything currently here. This cannot be undone.')) return;
  $('importInput').click(); });
$('importInput').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
  const rd=new FileReader(); rd.onload=()=>{ try{ S=JSON.parse(rd.result);
    S.ui={game:null,open:{},showAll:false}; S.accuracy=S.accuracy||{}; S.inactive=S.inactive||{}; S.depth=S.depth||{};
    S.odds=S.odds||{}; S.parlay=S.parlay||{}; if(S.stake==null) S.stake=20; S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{}; S.processedGames=S.processedGames||{};
    save(); renderAll(); alert('Backup restored.'); }catch(err){ alert('That file could not be read: '+err.message); } };
  rd.readAsText(f); });
$('resetBtn').addEventListener('click',()=>{
  const n=Object.keys(S.processed).length;
  if(!confirm(`Reset to preseason?\n\nThis clears ${n} uploaded week${n===1?'':'s'} and rebuilds every projection from the 2025 baseline. Export a backup first if you are unsure.`)) return;
  S=freshState(); S.ui={game:null,open:{},showAll:false}; save(); renderAll(); });

boot();

/* ---------- parlay builder ---------- */
function toggleLeg(key,k,g,side,main){
  const cur=S.parlay[key];
  { const gid=key.split('|')[0]; const gg=g||S.sched.find(x=>x.id===gid); if(gg&&gameStarted(gg)) return; }
  if(cur&&cur.k===k&&cur.side===side&&!!cur.main===!!main){ delete S.parlay[key]; save(); renderGame(); renderParlay(); return; }
  const [gid,pid,stat]=key.split('|');
  const game=g||S.sched.find(x=>x.id===gid);
  if(stat==='ml'||stat==='ats'){
    if(!game) return; const team=pid.replace(/^team:/,''); const b=gameBet(game,team,stat); if(!b) return;
    const isHome=team===game.h, opp=isHome?game.a:game.h;
    const book=stat==='ml'?(isHome?game.mlh:game.mla):(isHome?game.sph:game.spa);
    const label=stat==='ml'?'To win':`To cover ${b.line>0?'+':''}${b.line}`;
    S.parlay[key]={gid,pid,stat,k:b.line==null?0:b.line,side:'over',main:false,p:b.p,price:(book!=null&&isFinite(book))?book:bookPrice(b.p),src:(book!=null&&isFinite(book))?'real':'est',
      mu:null,name:TEAM_NAMES[team]||team,pos:'Game',grp:'TEAM',team,opp,week:game.w,label};
    save(); renderGame(); renderParlay(); return;
  }
  const pl=S.players[pid]; if(!pl||!game) return;
  const team=pl.team, opp=(game.h===team)?game.a:game.h;
  const ctx=gameCtx(game,team);
  const pr=project(pl,stat,opp,ctx); if(!pr) return;
  const m=MKT[stat];
  let p,label,price=null,src='est';
  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=kk>=2?`Scores ${kk}+ touchdowns`:'Scores a touchdown'; price=bookPrice(p); k=kk; }
  else if(main){
    const L=marketLine(game.w,pid,stat); if(!L) return;
    const pO=pOver(pl.grp,stat,pr.mu,L.line);
    p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;
    price=side==='under'?L.under:L.over; src='real';
  } else {
    p=pOver(pl.grp,stat,pr.mu,k-0.5); label=`${k}+ ${m.lbl.toLowerCase()}`;
    const real=oddsFor(gid,pid,stat,k);
    if(real!=null){ price=real; src='real'; } else price=rungView(pl,stat,pr.mu,k,game.w).est;
  }
  /* one pick per player and stat: writing to the same key replaces whatever was there */
  S.parlay[key]={gid,pid,stat,k,side,main:!!main,p,price,src,mu:m.prob?null:pr.mu,name:pl.n,pos:pl.pos,grp:pl.grp,
    team,opp,week:game.w,label};
  save(); renderGame(); renderParlay();
}
function legPrice(l){
  if(isGameLeg(l)) return l.price!=null?{ml:l.price,src:l.src||'est'}:{ml:probToAmerican(l.p),src:'fair'};
  const book=l.main?null:oddsFor(l.gid,l.pid,l.stat,l.k);
  if(book!=null) return {ml:book,src:'real'};
  if(l.price!=null) return {ml:l.price,src:l.src||'est'};
  return {ml:probToAmerican(l.p),src:'fair'};
}
/* ---------- suggested parlays: safe, medium, aggressive ----------
   One core parlay grown in three steps. Each tier has a floor on the chance that every leg
   lands and a leg cap; the next leg is always the one with the best expected return
   (chance x payout, real correlations) that keeps the parlay above the floor. */
const SUGGEST_TIERS=[['safe','Safe',0.50,3],['med','Medium',0.30,5],['aggr','Aggressive',0.15,8]];
let SUGGEST_CACHE=null;
function suggestCandidates(games){
  const w=currentWeek(); const out=[];
  for(const g of (games||gamesIn(w))){
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
/* the same engine as the week-wide tiers, narrowed to one game and one tier.
   Three legs at most: this sits on the game page and must stay short. */
const GAME_SUGGEST_FLOOR=0.30, GAME_SUGGEST_CAP=3;
let GAME_SUGGEST_CACHE={};
function gameSuggestion(g){
  const sig=[g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}).length,PAY.baked_at||'',S.margin||''].join('|');
  const hit=GAME_SUGGEST_CACHE[g.id];
  if(hit&&hit.sig===sig) return hit.val;
  const cands=suggestCandidates([g]);
  const dec=legs=>legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1);
  let cur=[];
  while(cur.length<GAME_SUGGEST_CAP){
    let best=null;
    for(const c of cands){
      if(cur.some(l=>l.key===c.key)) continue;
      if(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM')) continue;   /* one team bet per game */
      /* two legs on one man is a deliberate correlated stack, which this model prices
         properly; three is a single bet on his afternoon wearing a parlay's clothes */
      if(cur.filter(l=>l.pid===c.pid).length>=2) continue;
      const next=[...cur,c], p=parlayProb(next,3000).corr;
      const forced=next.length<2;                                  /* a parlay needs two legs */
      if(!forced&&p<GAME_SUGGEST_FLOOR) continue;
      const score=p*dec(next);
      if(!best||score>best.score) best={c,score};
    }
    if(!best) break;
    cur=[...cur,best.c];
  }
  const val=cur.length<2?{legs:[],candidates:cands.length}
    :{legs:cur,candidates:cands.length,corr:parlayProb(cur,20000).corr,dec:dec(cur)};
  GAME_SUGGEST_CACHE[g.id]={sig,val};
  return val;
}
function gameSuggestCard(g,locked){
  if(locked) return '';
  const s=gameSuggestion(g);
  if(!s.legs.length) return `<div class="card gsugg"><div class="gsugg-hd"><h2>Suggested parlay</h2></div>
    <p class="muted" style="margin:0">Nothing here clears the bar yet: a suggestion needs two legs with a real sportsbook price that the model rates at least three points above that price${s.candidates===1?', and only one qualifies':''}. Player prices arrive with the Thursday and Saturday pulls.</p></div>`;
  const stake=Math.max(0,+S.stake||0), ml=decToML(s.dec);
  return `<div class="card gsugg"><div class="gsugg-hd">
      <h2>Suggested parlay</h2><span class="conf med">Medium</span><span class="grow"></span>
      <span class="gsugg-nums"><b>${(s.corr*100).toFixed(0)}%</b> to land <span class="muted">\u00b7</span> <b>${fmtML(ml)}</b>${stake?` <span class="muted">pays $${(stake*s.dec).toFixed(2)}</span>`:''}</span>
    </div>
    <ul class="gsugg-legs">${s.legs.map(l=>`<li><span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span><span class="pr">${fmtML(l.price)}<em>${(l.p*100).toFixed(0)}%</em></span></li>`).join('')}</ul>
    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. Tick the lines yourself in the Parlay Builder to stake it.</p></div>`;
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
function renderParlay(){
  /* a leg from a game that has kicked off can't be bet, so it leaves the working parlay */
  let dropped=0;
  for(const [k,l] of Object.entries(S.parlay||{})){ const g=S.sched.find(x=>x.id===l.gid); if(g&&gameStarted(g)){ delete S.parlay[k]; dropped++; } }
  if(dropped) save();
  const legs=parlayLegs();
  const el=$('parlayBody');
  const droppedNote=dropped?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05">${dropped} leg${dropped===1?' was':'s were'} removed because that game has already kicked off. Saved and locked parlays keep theirs.</p>`:'';
  if(!legs.length){
    el.innerHTML=suggestCard()+droppedNote+`<div class="card"><h2>Nothing picked yet</h2>
      <p class="muted" style="margin:0 0 10px">Open a game, click a player, and tick any line you like. Each one lands here and gets priced.</p>
      <ul style="margin:0">
        <li>You can pick <b>one line per stat per player</b>. Ticking 30+ pass attempts after 20+ replaces it rather than adding both, because a player can't be over two different numbers as separate bets.</li>
        <li>Different stats for the same player are fine, and so are players from different games.</li>
        <li>Each game also offers <b>a team to win</b> and <b>a team to cover the spread</b>, at the top of the game. They go in like any other leg.</li>
        <li>Prices come from the sheet you upload on the Weekly Update tab. Anything you haven't priced is shown at the model's own fair odds instead.</li>
      </ul></div>`+renderSaved();
    wireSaved(); wireSuggest();
    return;
  }
  const wks=[...new Set(legs.map(l=>l.week))];
  const pr=parlayProb(legs.map(l=>({...l,side:l.side||'over'})));
  const prices=legs.map(legPrice);
  const allBook=prices.every(p=>p.src==='real');
  const bookDec=prices.reduce((a,p)=>a*(mlToDec(p.ml)||1),1);
  const fairML=probToAmerican(pr.corr);
  const indepML=probToAmerican(pr.indep);
  const stake=Math.max(0,+S.stake||0);
  const override=S.bookPrice!=null&&isFinite(S.bookPrice)?mlToDec(S.bookPrice):null;
  /* only call it "your price" when it really is one: a price you typed, or every
     leg priced from your book. Otherwise we are just multiplying our own fair
     odds, which carry no bookmaker margin and would flatter the return. */
  const realPrice=override!=null||allBook;
  const estPrice=!realPrice&&prices.every(p=>p.src!=='fair');
  const useDec=override||((allBook||estPrice)?bookDec:mlToDec(fairML));
  const payout=stake*useDec, profit=payout-stake;
  const ev=(realPrice||estPrice)?stake*(pr.corr*useDec-1):null;

  let html=suggestCard()+droppedNote+`<div class="card"><h2>${legs.length}-leg parlay <span class="pill">building</span></h2>
    <p class="muted" style="margin:0 0 12px">Every leg has to land. The chance below is worked out with the legs' real relationship to each other, not by multiplying them together.</p>
    <table><thead><tr><th>Player</th><th>The bet</th><th class="num">Projected</th><th class="num">Chance</th><th class="num">Price</th><th></th></tr></thead><tbody>`;
  legs.forEach((l,i)=>{
    const [c,lbl]=confTier(l.p);
    html+=`<tr class="legrow"><td class="plr">${esc(l.name)}<small>${l.pos} \u00b7 ${l.team} v ${l.opp} \u00b7 wk ${l.week}</small></td>
      <td><b>${esc(l.label)}</b></td>
      <td class="num">${l.mu==null?'\u2013':num(l.mu,l.mu<10?1:0)}</td>
      <td class="num">${(l.p*100).toFixed(0)}% <span class="conf ${c}" style="margin-left:6px">${lbl}</span></td>
      <td class="num">${fmtML(prices[i].ml)} <span class="muted" style="font-size:11px">${prices[i].src==='real'?'real':(prices[i].src==='est'?'est.':'fair')}</span></td>
      <td><button class="btn quiet" data-drop="${l.key}">Remove</button></td></tr>`;
  });
  html+=`</tbody></table>`;
  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">These legs are in different weeks (${wks.join(', ')}). A parlay has to settle together, so a sportsbook won't take this as one ticket.</p>`;
  /* what it pays, inside the same card, then the two actions as buttons only */
  html+=`<div class="pays"><h3>What it pays</h3>
    <div class="bar">
      <label>Your stake $<input type="number" id="pStake" min="0" step="1" value="${stake}" style="width:110px"></label>
      <label>Your book's parlay price <input type="number" id="pBook" step="5" placeholder="${allBook?(decToML(bookDec)||''):'e.g. +250'}" value="${S.bookPrice!=null?S.bookPrice:''}" style="width:110px"></label>
      <span class="muted">${allBook?'Blank multiplies your real leg prices.':'Blank multiplies the estimated leg prices, which include a typical bookmaker cut.'}</span>
    </div>
    <div class="bigp">
      <div class="box hero"><b>${(pr.corr*100).toFixed(1)}%</b><span>chance all ${legs.length} land</span></div>
      <div class="box"><b>${fmtML(fairML)}</b><span>fair price for that chance</span></div>
      <div class="box"><b class="payout">$${payout.toFixed(2)}</b><span>${(realPrice||estPrice)?`returned if it lands, $${profit.toFixed(2)} profit`:`if you got the fair price, $${profit.toFixed(2)} profit`}</span></div>
      <div class="box tier ${confTier(pr.corr)[0]}"><b>${confTier(pr.corr)[1]}</b><span>confidence all ${legs.length} land</span></div>
    </div>`;
  const canSave=wks.length===1&&(realPrice||estPrice);
  html+=`<div class="actions"><button class="btn go" id="pSave" ${canSave?'':'disabled'} title="${canSave?'Locks the legs, stake and price as they are now and moves it to Saved':(wks.length>1?'Legs must all be from the same week to save':'Set a price first')}">Save and lock this parlay</button><button class="btn quiet" id="pClear">Clear ALL</button></div></div>`;
  html+=`</div>`;

  /* the pairs table goes below the save bar and the saved parlays */
  let pairsHtml='';
  if(pr.pairs.length){
    pairsHtml+=`<div class="card"><h2>Legs that move together</h2>
      <table><thead><tr><th>Pair</th><th class="num">Strength</th><th>What it means</th></tr></thead><tbody>`+
      pr.pairs.sort((a,b)=>Math.abs(b.rho)-Math.abs(a.rho)).map(x=>{
        const A=legs[x.i],B=legs[x.j];
        return `<tr><td>${esc(A.name)} ${esc(A.label)}<br>${esc(B.name)} ${esc(B.label)}</td>
          <td class="num">${x.rho>0?'+':''}${x.rho.toFixed(2)}</td>
          <td class="${x.rho>0?'delta up':'delta down'}">${x.rho>0?'tend to happen in the same game':'tend to happen at each other\u2019s expense'}</td></tr>`;
      }).join('')+`</tbody></table>
      <p class="muted" style="margin:10px 0 0">Measured across 2019 to 2024. A quarterback throwing for a lot and his receiver catching a lot is the same afternoon described twice, which is why stacking them is worth more than a book's multiplied price suggests.</p></div>`;
  }
  html+=renderSaved();
  html+=pairsHtml;
  el.innerHTML=html;
  $('pSave')?.addEventListener('click',()=>{
    if(!confirm(`Save and lock this ${legs.length}-leg parlay at ${fmtML(decToML(useDec))} for $${stake.toFixed(2)}?\n\nOnce locked it can't be edited, only cleared.`)) return;
    S.saved.push({id:'sp'+Date.now(),saved:new Date().toISOString(),week:wks[0],legs:legs.map(l=>({...l})),
      stake,price:decToML(useDec),priceSrc:override!=null?'typed':(allBook?'real':'est'),pCorr:pr.corr,pIndep:pr.indep,payout});
    S.parlay={}; S.bookPrice=null; save(); renderParlay(); if(S.ui.game) renderGame(); });
  $('pStake').addEventListener('change',e=>{ S.stake=Math.max(0,+e.target.value||0); save(); renderParlay(); });
  $('pBook').addEventListener('change',e=>{ const v=parseFloat(e.target.value);
    S.bookPrice=isFinite(v)&&v!==0?v:null; save(); renderParlay(); });
  el.querySelectorAll('[data-drop]').forEach(b=>b.addEventListener('click',()=>{
    delete S.parlay[b.dataset.drop]; save(); renderParlay(); if(S.ui.game) renderGame(); }));
  $('pClear').addEventListener('click',()=>{ if(!confirm('Remove every leg from the builder?')) return;
    S.parlay={}; save(); renderParlay(); if(S.ui.game) renderGame(); });
  wireSaved(); wireSuggest();
}
function renderSaved(){
  const list=(S.saved||[]).slice().reverse();
  const settled=list.map(p=>settleParlay(p));
  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span></h2>`;
  if(!list.length){ html+=`<p class="muted" style="margin:0">Nothing saved. Build a parlay above and press Save and lock; only locked parlays appear here.</p></div>`; return html; }
  const won=settled.filter(s=>s.status==='won').length, lost=settled.filter(s=>s.status==='lost').length, pend=settled.filter(s=>s.status==='pending').length;
  const staked=list.reduce((s,p)=>s+p.stake,0);
  const back=list.reduce((s,p,i)=>s+(settled[i].status==='won'?p.payout:(settled[i].status==='void'?p.stake:0)),0);
  const atRisk=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?p.stake:0),0);
  const couldWin=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?p.payout-p.stake:0),0);
  const net=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?0:(settled[i].status==='won'?p.payout-p.stake:(settled[i].status==='void'?0:-p.stake))),0);
  html+=`<div class="sp-money" style="margin-bottom:14px">
    <div><b>${won}\u2013${lost}${pend?`, ${pend} live`:''}</b><span>record</span></div>
    <div><b>$${staked.toFixed(2)}</b><span>total staked</span></div>
    <div><b>$${back.toFixed(2)}</b><span>paid back</span></div>
    <div class="${net>=0?'win':'lose'}"><b>${net>=0?'+':'\u2212'}$${Math.abs(net).toFixed(2)}</b><span>net, settled</span></div>
    ${atRisk?`<div><b>$${atRisk.toFixed(2)}</b><span>still live</span></div><div class="win"><b>+$${couldWin.toFixed(2)}</b><span>if they all land</span></div>`:''}
  </div>`;
  list.forEach((p,i)=>{
    const s=settled[i];
    const tone=s.status==='won'?'var(--pick)':(s.status==='lost'?'var(--miss)':(s.status==='void'?'var(--muted)':'var(--gold)'));
    const profit=p.payout-p.stake;
    const result=s.status==='won'?`+$${profit.toFixed(2)}`:(s.status==='lost'?`\u2212$${p.stake.toFixed(2)}`:(s.status==='void'?'$0.00':`$${p.payout.toFixed(2)} to come`));
    html+=`<div class="savedp" style="border-left:4px solid ${tone}">
      <div class="sp-head">
        <span class="sp-title">${p.legs.length}-leg parlay</span>${p.suggested?`<span class="pill">${p.suggested} suggestion</span>`:''}
        <span class="pill ${s.status==='won'?'ok':(s.status==='lost'?'bad':(s.status==='pending'?'warn':''))}">${s.status==='pending'?'live':s.status}</span>
        <span class="muted" style="font-size:12px">week ${p.week} \u00b7 saved ${p.saved.slice(0,10)}</span>
        <span class="grow"></span>
        <button class="btn quiet" data-sp="${p.id}">Remove</button>
      </div>
      <div class="sp-money">
        <div><b>$${p.stake.toFixed(2)}</b><span>you staked</span></div>
        <div><b>${fmtML(p.price)}</b><span>price \u00b7 ${p.priceSrc}</span></div>
        <div><b>$${p.payout.toFixed(2)}</b><span>pays if it lands</span></div>
        <div class="win"><b>+$${profit.toFixed(2)}</b><span>profit if it lands</span></div>
        <div><b>${(p.pCorr*100).toFixed(0)}%</b><span>chance</span></div>
        <div class="${s.status==='won'?'win':(s.status==='lost'?'lose':'')}"><b>${result}</b><span>${s.status==='pending'?'still running':'result'}</span></div>
      </div>
      ${p.legs.map((l,k)=>{ const r=s.legs[k]; const a=actualFor(l.week,l.pid);
        const mark=r==null?'<span class="res">\u25cb</span>':(r==='win'?'<span class="res win">\u2713</span>':(r==='push'?'<span class="res">P</span>':'<span class="res loss">\u2717</span>'));
        return `<div class="sp-leg">${mark}
          <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span>
          <span class="rs">${a&&a[l.stat]!=null?`got ${num(a[l.stat],0)}`:'<span class="muted">pending</span>'}</span>
          <span class="rs">${(l.p*100).toFixed(0)}%</span></div>`;}).join('')}
    </div>`;
  });
  html+=`<div class="bar" style="margin:12px 0 0"><span class="grow"></span><button class="btn danger" id="savedClear">Clear saved parlays</button></div></div>`;
  return html;
}
function wireSaved(){
  document.querySelectorAll('[data-sp]').forEach(b=>b.addEventListener('click',()=>{
    S.saved=(S.saved||[]).filter(p=>p.id!==b.dataset.sp); save(); renderParlay(); }));
  $('savedClear')?.addEventListener('click',()=>{
    const n=(S.saved||[]).length;
    if(!confirm(`Delete all ${n} saved parlay${n===1?'':'s'}?\n\nThis can't be undone.`)) return;
    S.saved=[]; save(); renderParlay(); });
}

/* ---------- price sheet ---------- */
function marketKey(s){
  const norm=x=>String(x||'').toLowerCase().replace(/[_\s]+/g,' ').trim();
  const t=norm(s);
  for(const m of MARKETS){ if(norm(m.k)===t||norm(m.lbl)===t||norm(m.short||'')===t) return m.k; }
  return null;
}
function normName(s){ return String(s||'').toLowerCase().replace(/[.'`\u2019-]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)$/,'').replace(/\s+/g,' ').trim(); }
function downloadText(name,text){
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  a.href=url; a.download=name; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); },1500);
}
function ingestOdds(rows,week,quiet){
  const w=week||currentWeek();
  const gs=gamesIn(w), gids=new Set(gs.map(g=>g.id));
  const byName={};
  for(const g of gs){ const r=rosterFor(g,true);
    for(const team in r) for(const x of r[team].players) (byName[normName(x.pl.n)]??=[]).push({gid:g.id,pid:x.pl.id}); }
  for(const gid of gids) delete S.odds[gid];
  let n=0; const missName=new Set(), missMkt=new Set();
  for(const row of rows){
    const ml=parseFloat(row.odds); if(!isFinite(ml)||ml===0) continue;
    const mk=marketKey(row.market); if(!mk){ if(row.market) missMkt.add(row.market); continue; }
    const k=parseFloat(row.threshold); if(!isFinite(k)) continue;
    const cands=byName[normName(row.player)]||[];
    let hit=gids.has((row.game_id||'').trim())?cands.find(c=>c.gid===row.game_id.trim()):null;
    if(!hit&&cands.length===1) hit=cands[0];
    if(!hit){ if(row.player) missName.add(row.player); continue; }
    ((((S.odds[hit.gid]??={})[hit.pid]??={})[mk]??={}))[String(k)]=ml;
    n++;
  }
  /* no interactive upload any more: the only caller is applyBaked */
  return {n,week:w,missName:missName.size};
}
/* ---------- data baked into the page by build/weekly.py ----------
   Scores and lines, injuries, prices and player stats all arrive inside the payload and go
   through the same ingest functions the upload buttons use, so a game is graded before its
   stats are folded in and applying it twice is a no-op. Prices for a week already in this
   browser are left alone, so a rebuild never overwrites what is on the page. */
function applyBaked(){
  const done={sched:0,inj:0,prices:0,stats:[]};
  buildNorm();   /* price matching projects every player, which needs the league averages ready */
  const byId=Object.fromEntries(S.sched.map(g=>[g.id,g]));
  for(const p of PAY.sched){ const g=byId[p.id]; if(!g) continue;
    for(const k of ['d','t','sp','tot','hs','as','mla','mlh','spa','sph']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }
  /* the build pulled lines when it ran, so the freshness note counts from then */
  if(PAY.baked_at){ const t=Date.parse(PAY.baked_at); if(isFinite(t)&&!(S.gamesFetched>t)) S.gamesFetched=t; }
  if(PAY.injuries&&PAY.injuries.length) done.inj=ingestInjuries(PAY.injuries).out;
  for(const w of Object.keys(PAY.prices||{}).sort((a,b)=>a-b)){
    const gids=gamesIn(+w).map(g=>g.id);
    if(gids.some(id=>S.odds[id]&&Object.keys(S.odds[id]).length)) continue;
    done.prices+=ingestOdds(PAY.prices[w],+w,true).n; }
  for(const w of Object.keys(PAY.stats||{}).sort((a,b)=>a-b)){
    const r=ingestStats(PAY.stats[w]); done.stats.push(...r.done.map(g=>g.id)); }
  return done;
}
