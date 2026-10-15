/* The Pick'em Record's two pictures, drawn over what the app's renderRecord() leaves:

   1. Wins against Vegas: each model's wins minus the Vegas favourite's wins on the same games,
      added up week by week, from zero before week 1. Vegas is the zero line, so above it is
      beating the betting favourite and below it is trailing it, and a line's height is games,
      not a percentage that swings on sixteen of them.
   2. Week by week: models down the side, weeks across, each cell that week's record shaded
      from red (under .500) through clear to green (over), the season in the last column.

   Colours follow the model, as everywhere else on the tab (Alpha Model green, Joker red, ELO Model
   orange); every line carries a label at its end beside the legend. Your own picks
   are not drawn: My Picks is retired, and so is the You column. (A dashed series with hollow
   dots is still supported, through dash:true.)
   Text is in the page's ink, never a line's colour. renderRecord() calls recordViz(rows) last;
   betting/tools/build.js puts this file in front of the app's own script.

   One thing the record says about itself, under the legend: a model the job could not rescore
   on its last run (S.modelStatus, written by betting/jobkit.py: its picks are the last good
   ones, and why). Every week of every model is drawn the same way, the owner's call. The Joker's
   2026 weeks 1-2 are its real calls (betting/joker/history/2026_w1_w2.json, the owner's call of 12
   October 2026, never the refit's in-sample ones): week 2 the calls published before kickoff, week 1
   a backtest by the model as it stood before the refit, which never saw 2026 (src on each call).
   Week 1 is counted like any other week, as the ELO Model's backtest weeks 1-2 are, so every model
   is measured on the same games.

   Friends (the owner's call, 15 October 2026: "going to track some friends picks over the course of
   the season"): each friend's Weekly Picks, from picks/friends.json, which the page reads and hands
   the frame as window.FRIENDS (nflbets/build/friends.js). rvFriends() grades them here, on the
   schedule and the finals in the frame's own state: a pick counts only if it was saved before its
   game's kickoff (the schedule's, US Eastern), and is graded on the same finals the models are (a
   game in S.processed with a result; a tie counts for nobody), pending until then. A friend's week
   counts only the games they picked. They are drawn apart from the models: dashed lines with hollow
   dots in a muted palette on the chart (from the week before their first, at zero), their own rows
   under a Friends heading in the week-by-week grid (a week with picks still to play shows them as
   pending), and a column each in the pick grid (betting/tools/build.js). With no FRIENDS, a file
   that did not load or held nothing, none of it is drawn. */
const RV_FRIEND_COLORS=['#5B7FA6','#8B6A9F','#3F8A84','#A27A4E','#7C8A3A','#A3607E','#5F6C8E','#6E8F5C'];
/* the schedule's kickoff (US Eastern) as an instant, as picks/ and the Pick'ems board read it */
function rvKick(d,t){
  if(!d||!t) return null;
  const guess=new Date(d+'T'+t+':00Z');
  const inZone=z=>new Date(guess.toLocaleString('en-US',{timeZone:z}));
  const k=guess.getTime()+(inZone('UTC')-inZone('America/New_York'));
  return isFinite(k)?k:null;
}
/* each friend, graded: [{name, color, weeks:{N:[{gid, pick, ok, pending, r}]}, tb:{N:tiebreaker}}] */
function rvFriends(){
  let F=null; try{ F=window.FRIENDS&&typeof window.FRIENDS.get==='function'?window.FRIENDS.get():null; }catch(e){ F=null; }
  if(!F||!Array.isArray(F.friends)||typeof S!=='object'||!S||!Array.isArray(S.schedule)) return [];
  const sched={}; for(const g of S.schedule) sched[g.game_id]=g;
  const out=[];
  F.friends.forEach((f,i)=>{
    if(!f||typeof f.name!=='string'||!f.weeks||typeof f.weeks!=='object') return;
    const weeks={}, tb={};
    for(const [wk,W] of Object.entries(f.weeks)){
      const list=[];
      for(const [gid,p] of Object.entries((W&&W.picks)||{})){
        const g=sched[gid]; if(!g||+g.week!==+wk||!p) continue;
        if(p.pick!==g.home_team&&p.pick!==g.away_team) continue;
        const k=rvKick(g.gameday,g.gametime), t=Date.parse(p.saved_at);
        if(k==null||!(t<k)) continue;
        const r=(S.processed||{})[gid]||null, done=!!r&&r.result!=null;
        const ok=done&&r.result!==0?p.pick===(r.result>0?r.home:r.away):null;
        list.push({gid,pick:p.pick,ok,pending:!done,r,kick:k}); }
      if(list.length){ list.sort((a,b)=>a.kick-b.kick); weeks[+wk]=list; if(W.tiebreaker) tb[+wk]=W.tiebreaker; } }
    if(Object.keys(weeks).length) out.push({name:f.name,color:RV_FRIEND_COLORS[out.length%RV_FRIEND_COLORS.length],weeks,tb,friend:true,dash:true}); });
  return out;
}
function recordViz(rows){
  const card=document.querySelector('#modelChart .card'), tab=document.getElementById('recordTable');
  if(!card||!rows||!rows.length) return;
  const showAll=!!S.showAllModels;
  const winner=r=>r.result>0?r.home:r.away;
  const vPick=r=>r.line==null||r.line===0?null:(r.line>0?r.home:r.away);
  const vOk=r=>vPick(r)===null?null:vPick(r)===winner(r);
  const flag=v=>v===true||v===false?v:null;
  const MODELS=[
    {id:'main',name:'Alpha Model',color:'#1F6F4A',ok:r=>flag(r.correct)},
    {id:'joker',name:'The Joker',color:'#C0392B',all:true,ok:r=>r.joker?flag(r.joker.correct):null},
    {id:'elo',name:'ELO Model',color:'#E8730A',all:true,ok:r=>r.elo?flag(r.elo.correct):null}];
  const weeks=[...new Set(rows.map(r=>+r.week))].sort((a,b)=>a-b);
  const wkName=w=>w>18?'Playoffs '+(w-18):'Week '+w;
  const tally=(ok,rs)=>{ let w=0,l=0; for(const r of rs){ const v=ok(r); if(v===true) w++; else if(v===false) l++; } return {w,l}; };
  const vegas={id:'vegas',name:'Vegas',ok:vOk,season:tally(vOk,rows),byWeek:weeks.map(w=>tally(vOk,rows.filter(r=>+r.week===w)))};
  const shown=MODELS.filter(m=>(showAll||!m.all)).map(m=>{
    const season=tally(m.ok,rows), byWeek=weeks.map(w=>tally(m.ok,rows.filter(r=>+r.week===w)));
    /* against Vegas on the same games: both picked, the game decided */
    let net=0; const pts=[{w:0,net:0}];
    weeks.forEach(w=>{ for(const r of rows.filter(x=>+x.week===w)){ const a=m.ok(r), v=vOk(r); if(a===null||v===null) continue; net+=(a?1:0)-(v?1:0); } pts.push({w,net}); });
    return {...m,season,byWeek,pts,net};
  }).filter(m=>m.season.w+m.season.l>0);
  /* friends: graded on their own picks, against Vegas on the games they picked; a line from the
     week before their first week on the chart, at zero */
  const friends=rvFriends().map(f=>{
    const fw=Object.keys(f.weeks).map(Number), first=Math.min(...fw);
    const ftally=ps=>{ let w=0,l=0,p=0; for(const x of ps){ if(x.ok===true) w++; else if(x.ok===false) l++; else if(x.pending) p++; } return {w,l,p}; };
    const wkT=w=>ftally(f.weeks[w]||[]), season=ftally(fw.flatMap(w=>f.weeks[w]));
    const i0=weeks.filter(w=>w<first).length;
    let net=0; const pts=[{i:i0,net:0}];
    weeks.forEach((w,i)=>{ if(i<i0) return; for(const x of f.weeks[w]||[]){ if(x.ok===null) continue; const v=vOk(x.r); if(v===null) continue; net+=(x.ok?1:0)-(v?1:0); } pts.push({i:i+1,net}); });
    return {...f,wkT,season,pts,net,byWeek:weeks.map(wkT),first};
  });
  const fLines=friends.filter(f=>f.season.w+f.season.l>0&&f.pts.length>1);
  const series=shown.concat(fLines);
  /* ---- 0. the headline tiles are Vegas's: it is the baseline every model is measured against ---- */
  { const tiles=document.getElementById('recordStats');
    const games=Object.entries(S.processed||{}).filter(([,r])=>r.result!=null&&r.result!==0).map(([gid,r])=>{
      const o=(S.odds||{})[gid]; let ph=null;
      if(o&&isFinite(o.home)&&isFinite(o.away)&&o.home&&o.away){ const im=x=>x<0?-x/(-x+100):100/(x+100), h=im(+o.home), a=im(+o.away); ph=h/(h+a); }
      else if(r.line) ph=r.line>0?0.6:0.4;
      if(ph==null) return null;
      const pick=ph>=0.5?r.home:r.away;
      return {ok:pick===winner(r),conf:Math.max(ph,1-ph),err:r.line!=null?Math.abs(r.line-r.result):null}; }).filter(Boolean);
    if(tiles&&games.length&&typeof tier==='function'){
      const c=games.filter(g=>g.ok).length, band={high:[0,0],med:[0,0],low:[0,0],coin:[0,0]};
      games.forEach(g=>{ const t=tier(g.conf)[0]; if(band[t]){ band[t][1]++; if(g.ok) band[t][0]++; } });
      const errs=games.filter(g=>g.err!=null), mae=errs.length?errs.reduce((a,g)=>a+g.err,0)/errs.length:null;
      const b=(k,lab)=>`<div class="stat"><b>${band[k][1]?Math.round(100*band[k][0]/band[k][1])+'%':'\u2013'}</b><span>${lab}, ${band[k][0]}/${band[k][1]}</span></div>`;
      tiles.innerHTML=`<div class="stat"><b>${(100*c/games.length).toFixed(1)}%</b><span>Vegas straight-up, ${c} of ${games.length}</span></div>`
        +b('high','high confidence')+b('med','medium')+b('low','low')+b('coin','50/50')
        +(mae!=null?`<div class="stat"><b>${mae.toFixed(1)}</b><span>spread's avg miss, pts</span></div>`:''); } }
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const sign=n=>n>0?'+'+n:(n<0?'−'+Math.abs(n):'0');
  const rec=t=>`${t.w}–${t.l}`;
  const notes=[];
  /* a model the job could not rescore on its last run: its picks are the last good ones. Only the
     models the job scores (betting/jobkit.py run()): a status under any other key, one a retired
     model's step left in the state, is about no model on this record and is not drawn */
  { const names={joker:'The Joker'}, ms=S.modelStatus||{};
    for(const [k,v] of Object.entries(ms)){ if(!v||!names[k]) continue; const d=v.since?new Date(v.since):null;
      notes.push(`<b>${esc(names[k])}</b> could not be rescored${d&&!isNaN(d)?' since '+esc(d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})):''}: ${esc(v.why||'an input was missing')}. Its picks are the last good ones and its record stands where it was.`); } }

  /* ---- 1. the chart ---- */
  /* drawn at the card's own width, so its text stays 11px on a phone instead of shrinking */
  const W=Math.max(340,Math.min(900,(card.clientWidth||760)-48)),H=W<520?230:250,padL=40,padR=W<520?112:128,padT=16,padB=30;
  const all=series.flatMap(m=>m.pts.map(p=>p.net));
  let lo=Math.min(-3,...all), hi=Math.max(3,...all);
  const step=(hi-lo)<=8?1:(hi-lo)<=20?2:5; lo=Math.floor(lo/step)*step; hi=Math.ceil(hi/step)*step;
  const n=weeks.length;
  const X=i=>padL+i*(W-padL-padR)/Math.max(1,n);
  const Y=v=>padT+(H-padT-padB)*((hi-v)/(hi-lo));
  let svg='';
  for(let v=lo;v<=hi;v+=step) if(v!==0) svg+=`<line x1="${padL}" x2="${W-padR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#E6EAEF" stroke-width="1"/>`
    +`<text x="${padL-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" font-size="11" style="fill:var(--muted)">${sign(v)}</text>`;
  svg+=`<line x1="${padL}" x2="${W-padR}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke-width="1.5" style="stroke:var(--ink)"/>`
    +`<text x="${padL-8}" y="${(Y(0)+4).toFixed(1)}" text-anchor="end" font-size="11" font-weight="700" style="fill:var(--ink)">0</text>`;
  svg+=`<text x="${X(0)}" y="${H-9}" text-anchor="middle" font-size="11" style="fill:var(--muted)">Start</text>`
    +weeks.map((w,i)=>`<text x="${X(i+1).toFixed(1)}" y="${H-9}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${w>18?'P'+(w-18):'Wk '+w}</text>`).join('');
  svg+=`<line class="rv-cross" x1="0" x2="0" y1="${padT}" y2="${H-padB}" stroke-width="1" style="stroke:var(--line-2);display:none"/>`;
  const PX=(p,i)=>X(p.i!=null?p.i:i);
  for(const m of series){
    const d=m.pts.map((p,i)=>PX(p,i).toFixed(1)+','+Y(p.net).toFixed(1)).join(' ');
    svg+=`<polyline${m.friend?' class="rv-friend"':''} fill="none" stroke="${m.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${m.dash?' stroke-dasharray="5 4"':''} points="${d}"/>`;
    svg+=m.pts.map((p,i)=>`<circle cx="${PX(p,i).toFixed(1)}" cy="${Y(p.net).toFixed(1)}" r="4" stroke-width="2" style="stroke:var(--panel)" fill="${m.dash?'var(--panel)':m.color}"/>`
      +(m.dash?`<circle cx="${PX(p,i).toFixed(1)}" cy="${Y(p.net).toFixed(1)}" r="3" fill="none" stroke="${m.color}" stroke-width="1.8"/>`:'')).join('');
  }
  /* end labels, nudged apart so they never sit on each other */
  /* the zero line's own label, "= Vegas", is one of them */
  const ends=series.map(m=>({m,y:Y(m.net)})).concat({vegas:true,y:Y(0)}).sort((a,b)=>a.y-b.y||(a.vegas?-1:b.vegas?1:0));
  for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<14) ends[i].y=ends[i-1].y+14;
  const over=ends.length?ends[ends.length-1].y-(H-padB):0; if(over>0) ends.forEach(e=>e.y-=over);
  for(const e of ends){ const x=X(n)+10;
    if(e.vegas){ svg+=`<text x="${W-padR+10}" y="${(e.y+4).toFixed(1)}" font-size="11" font-weight="700" style="fill:var(--ink)">= Vegas</text>`; continue; }
    svg+=`<line x1="${x}" x2="${x+12}" y1="${e.y.toFixed(1)}" y2="${e.y.toFixed(1)}" stroke="${e.m.color}" stroke-width="2"${e.m.dash?' stroke-dasharray="3 2"':''}/>`
      +`<text x="${x+17}" y="${(e.y+4).toFixed(1)}" font-size="11" style="fill:var(--ink-2)"><tspan font-weight="700" style="fill:var(--ink)">${sign(e.m.net)}</tspan> ${esc(e.m.name)}</text>`; }
  /* hover: a band per week, a crosshair and the week's numbers */
  svg+=weeks.map((w,i)=>`<rect class="rv-hit" data-i="${i}" x="${(X(i+1)-(W-padL-padR)/Math.max(1,n)/2).toFixed(1)}" y="${padT}" width="${((W-padL-padR)/Math.max(1,n)).toFixed(1)}" height="${H-padT-padB}" fill="transparent"/>`).join('');
  const chart=`<div class="rv-wrap"><svg viewBox="0 0 ${W} ${H}" class="rv-chart" role="img" aria-label="Wins against Vegas by week">${svg}</svg><div class="rv-tip" hidden></div></div>`;
  const legend=shown.map(m=>`<span><i class="lgd" style="background:${m.dash?'repeating-linear-gradient(90deg,'+m.color+' 0 5px,transparent 5px 8px)':m.color}"></i>${esc(m.name)} <b>${rec(m.season)}</b> <span class="muted">${sign(m.net)} vs Vegas</span></span>`).join('')
    +`<span><i class="lgd" style="background:var(--ink);height:2px"></i>Vegas <b>${rec(vegas.season)}</b> <span class="muted">the zero line</span></span>`
  const fLegend=friends.length?`<span class="rv-flab">Friends</span>`+friends.map(f=>{ const s=f.season, d=s.w+s.l;
      return `<span class="rv-fr"><i class="lgd" style="background:repeating-linear-gradient(90deg,${f.color} 0 5px,transparent 5px 8px)"></i>${esc(f.name)} `
        +(d?`<b>${rec(s)}</b> <span class="muted">${sign(f.net)} vs Vegas${s.p?', '+s.p+' pending':''}</span>`:`<span class="muted rv-fp">${s.p} pending</span>`)+`</span>`; }).join(''):'';
  const h2=card.querySelector('h2'); if(h2) h2.textContent='Wins against Vegas';
  const intro=h2&&h2.nextElementSibling&&h2.nextElementSibling.tagName==='P'?h2.nextElementSibling:null;
  if(intro) intro.textContent='Each model’s wins minus the Vegas favourite’s on the same games, added up week by week. Above the line is beating Vegas, below is trailing it; one step is one game.'
    +(friends.length?' Friends are dashed, counted on the games they picked, from the week they joined.':'');
  const lg=card.querySelector('.lgdrow'), toggle=lg&&lg.querySelector('.toggle');
  if(lg){ lg.innerHTML=legend; if(toggle) lg.appendChild(toggle); }
  card.querySelector('.rv-notes')?.remove();
  card.querySelector('.rv-flg')?.remove();
  if(lg&&fLegend) lg.insertAdjacentHTML('afterend',`<div class="bar lgdrow rv-flg">${fLegend}</div>`);
  if(lg&&notes.length) lg.insertAdjacentHTML('afterend',`<div class="rv-notes muted" style="font-size:12px;margin:0 0 8px">${notes.map(n=>`<p style="margin:0 0 4px">${n}</p>`).join('')}</div>`);
  const old=card.querySelector('svg.wowchart'); if(old) old.outerHTML=chart;
  const wrap=card.querySelector('.rv-wrap'), tip=wrap&&wrap.querySelector('.rv-tip'), cross=wrap&&wrap.querySelector('.rv-cross');
  if(wrap) wrap.querySelectorAll('.rv-hit').forEach(h=>{
    const i=+h.dataset.i, x=X(i+1);
    const show=()=>{ cross.setAttribute('x1',x); cross.setAttribute('x2',x); cross.style.display='';
      tip.innerHTML=`<b>${wkName(weeks[i])}</b>`+shown.map(m=>`<div><i class="lgd" style="background:${m.color}"></i>${esc(m.name)} ${rec(m.byWeek[i])}<span class="muted">&nbsp;· season ${sign(m.pts[i+1].net)} vs Vegas</span></div>`).join('')
        +`<div><i class="lgd" style="background:var(--ink);height:2px"></i>Vegas ${rec(vegas.byWeek[i])}</div>`
        +fLines.map(f=>{ const p=f.pts.find(q=>q.i===i+1), t=f.byWeek[i]; if(!p||!(t.w+t.l)) return '';
          return `<div><i class="lgd" style="background:repeating-linear-gradient(90deg,${f.color} 0 5px,transparent 5px 8px)"></i>${esc(f.name)} ${rec(t)}<span class="muted">&nbsp;· season ${sign(p.net)} vs Vegas</span></div>`; }).join('');
      tip.hidden=false; const r=wrap.getBoundingClientRect(), px=x/W*r.width;
      tip.style.left=Math.min(Math.max(8,px+12),Math.max(8,r.width-tip.offsetWidth-8))+'px'; };
    h.addEventListener('mouseenter',show); h.addEventListener('click',show);
    h.addEventListener('mouseleave',()=>{ tip.hidden=true; cross.style.display='none'; }); });

  /* ---- 2. the week-by-week grid ---- */
  if(tab){
    const shade=t=>{ const g=t.w+t.l; if(!g) return ''; const p=t.w/g, a=Math.min(0.42,Math.abs(p-0.5)/0.3*0.42).toFixed(3);
      return p>0.5?`background:rgba(27,122,78,${a})`:(p<0.5?`background:rgba(192,57,43,${a})`:''); };
    const cell=(t,name,label)=>{ const g=t.w+t.l; if(!g) return '<td class="rv-c rv-none">–</td>';
      return `<td class="rv-c" style="${shade(t)}" title="${esc(name)}, ${label}: ${t.w} of ${g} (${Math.round(100*t.w/g)}%)"><b>${rec(t)}</b><small>${Math.round(100*t.w/g)}%</small></td>`; };
    /* the grid's weeks: every graded week, and every week a friend has picks in (pending or not) */
    const gw=[...new Set(weeks.concat(friends.flatMap(f=>Object.keys(f.weeks).map(Number))))].sort((a,b)=>a-b);
    const wkOf=(m,w)=>{ const i=weeks.indexOf(w); return i<0?{w:0,l:0}:m.byWeek[i]; };
    const gridRows=[...shown,{...vegas,color:null}].map(m=>`<tr><th class="rv-m">${m.color?`<i class="lgd" style="background:${m.color}"></i>`:'<i class="lgd" style="background:var(--ink);height:2px"></i>'}${esc(m.name)}</th>`
      +gw.map(w=>cell(wkOf(m,w),m.name,wkName(w))).join('')+cell(m.season,m.name,'season').replace('class="rv-c"','class="rv-c rv-season"')+'</tr>').join('');
    /* a friend's cell: the games decided, shaded as a model's, and any still to play said pending */
    const fcell=(t,name,label,tb,season)=>{ const g=t.w+t.l, cls='rv-c'+(season?' rv-season':'');
      const tbx=tb?`; tiebreaker ${tb.total_points} points`:'';
      if(!g&&!t.p) return `<td class="${cls} rv-none">–</td>`;
      if(!g) return `<td class="${cls} rv-pend" title="${esc(name)}, ${label}: ${t.p} pick${t.p===1?'':'s'}, none played yet${tbx}"><b>–</b><small>${t.p} pending</small></td>`;
      return `<td class="${cls}" style="${shade(t)}" title="${esc(name)}, ${label}: ${t.w} of ${g} (${Math.round(100*t.w/g)}%)${t.p?`, ${t.p} pending`:''}${tbx}"><b>${rec(t)}</b><small>${Math.round(100*t.w/g)}%${t.p?` · ${t.p} pending`:''}</small></td>`; };
    const friendRows=friends.length?`<tr class="rv-sep"><th class="rv-m">Friends</th><td colspan="${gw.length+1}"></td></tr>`+friends.map(f=>`<tr class="rv-friend"><th class="rv-m"><i class="lgd" style="background:repeating-linear-gradient(90deg,${f.color} 0 5px,transparent 5px 8px)"></i>${esc(f.name)}</th>`
      +gw.map(w=>fcell(f.wkT(w),f.name,wkName(w),f.tb[w],false)).join('')+fcell(f.season,f.name,'season',null,true)+'</tr>').join(''):'';
    const games=gw.map(w=>rows.filter(r=>+r.week===w).length);
    tab.innerHTML=`<div class="card"><h2>Week by week</h2><p class="muted" style="margin:0 0 10px">Each model’s record by week, shaded red under .500, clear at .500 and green above; the season is the last column.${friends.length?' Each friend’s counts only the games they picked; a game still to play is pending.':''}</p>
      <div class="rv-gridwrap"><table class="rv-grid"><thead><tr><th class="rv-m"></th>${gw.map((w,i)=>`<th class="rv-c">${wkName(w)}<small>${games[i]?games[i]+' game'+(games[i]===1?'':'s'):'to play'}</small></th>`).join('')}<th class="rv-c rv-season">Season</th></tr></thead>
      <tbody>${gridRows}${friendRows}</tbody></table></div></div>`;
  }
}
