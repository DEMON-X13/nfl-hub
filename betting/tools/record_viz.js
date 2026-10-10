/* The Pick'em Record's two pictures, drawn over what the app's renderRecord() leaves:

   1. Wins against Vegas: each model's wins minus the Vegas favourite's wins on the same games,
      added up week by week, from zero before week 1. Vegas is the zero line, so above it is
      beating the betting favourite and below it is trailing it, and a line's height is games,
      not a percentage that swings on sixteen of them.
   2. Week by week: models down the side, weeks across, each cell that week's record shaded
      from red (under .500) through clear to green (over), the season in the last column.

   Colours follow the model, as everywhere else on the tab (Alpha Model green, Challenger Model blue,
   Joker red, ELO Model orange, Broly Model purple, and Joker Jr, a test beside the Joker,
   dark red and dashed with hollow dots, dash:true); every line carries a label at its end beside the
   legend. Your own picks are not drawn: My Picks is retired, and so is the You column.
   Text is in the page's ink, never a line's colour. renderRecord() calls recordViz(rows) last;
   betting/tools/build.js puts this file in front of the app's own script.

   Two things the record says about itself, under the legend: a model the job could not rescore
   on its last run (S.modelStatus, written by betting/jobkit.py: its picks are the last good
   ones, and why), and the weeks of this season the Joker was fitted on after they were played
   (S.jokerFit, from betting/joker/model.json): those are marked in the grid and in its tooltip,
   and its record without them is given beside the one with them. Nothing is regraded.

   And one line about Joker Jr (betting/joker/long; S.jokerLongInfo, from its step): it
   is a test running beside the live Joker, and its picks on games before it went live were
   computed after the fact, from the data as it stood before each kickoff, by a model fitted only
   on 2010-2025; they count in its record like the rest. */
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
    {id:'chal',name:'Challenger Model',color:'#3B6FB6',all:true,ok:r=>r.h?flag(r.h.correct):null},
    {id:'joker',name:'The Joker',color:'#C0392B',all:true,ok:r=>r.joker?flag(r.joker.correct):null},
    {id:'jokerLong',name:'Joker Jr',color:'#8E1B10',all:true,dash:true,test:true,ok:r=>r.jokerLong?flag(r.jokerLong.correct):null},
    {id:'elo',name:'ELO Model',color:'#E8730A',all:true,ok:r=>r.elo?flag(r.elo.correct):null},
    {id:'broly',name:'Broly Model',color:'#7A3FB0',all:true,ok:r=>r.broly?flag(r.broly.correct):null}];
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
  /* the weeks the Joker was fitted on after they were played: its record there is a fit, not a call */
  const jf=S.jokerFit&&+S.jokerFit.season===+S.season&&Array.isArray(S.jokerFit.weeks)?S.jokerFit.weeks.map(Number):[];
  const fitted=(m,w)=>m.id==='joker'&&jf.includes(+w);
  const wkList=ws=>{ const a=[...ws].sort((x,y)=>x-y); return a.length>1&&a[a.length-1]-a[0]===a.length-1?a[0]+'-'+a[a.length-1]:a.join(', '); };
  const notes=[];
  { const jm=shown.find(m=>m.id==='joker'), inFit=rows.filter(r=>jf.includes(+r.week));
    if(jm&&inFit.length){
      const rest=rows.filter(r=>!jf.includes(+r.week)), t=tally(jm.ok,rest);
      let net=0; for(const r of rest){ const a=jm.ok(r), v=vOk(r); if(a===null||v===null) continue; net+=(a?1:0)-(v?1:0); }
      const ft=tally(jm.ok,inFit);
      jm.fitNote=`weeks ${wkList(jf)} fitted after the fact`;
      notes.push(`<b>The Joker</b> was refitted after week${jf.length>1?'s':''} ${wkList(jf)} ${jf.length>1?'were':'was'} played, with those games in its training, so its ${rec(ft)} there is a fit, not a prediction (marked in the grid). Its calls from week ${Math.max(...jf)+1} on, made before the games: <b>${rec(t)}</b>, ${sign(net)} vs Vegas.`); } }
  /* Joker Jr: a test beside the live Joker, and what its backfilled picks are */
  { const jl=shown.find(m=>m.id==='jokerLong'), info=S.jokerLongInfo||{}, wf=info.walk_forward||{};
    if(jl){ const done=rows.filter(r=>r.jokerLong&&r.jokerLong.backfill&&flag(r.jokerLong.correct)!==null);
      const bf=done.filter(r=>!r.jokerLong.late).length, missed=done.length-bf;
      const since=info.since?new Date(info.since):null, pct=x=>typeof x==='number'&&isFinite(x)?(100*x).toFixed(1)+'%':null;
      const day=since&&!isNaN(since)?since.toLocaleDateString(undefined,{month:'short',day:'numeric'}):null;
      notes.push(`<b>Joker Jr</b> is a test running beside the live Joker, not a replacement: the same formula and inputs, fitted on 2010-2025 instead of 2019-2025${pct(wf.long_fit)&&pct(wf.joker_recipe_2019_start)?`, which in walk-forward testing on 2021-2025 was right on ${pct(wf.long_fit)} of games to the 2019 fit’s ${pct(wf.joker_recipe_2019_start)}${pct(wf.vegas)?` (Vegas ${pct(wf.vegas)})`:''}`:''}.`
        +(bf?` Its ${bf} pick${bf>1?'s':''} on games before ${day?'it went live on '+esc(day):'it went live'} were computed after the fact from pre-game data (the files as they stood before each kickoff) by a model fitted only on 2010-2025, which never saw a 2026 game; they count in its record like the rest. From then on its picks are made before kickoff like every other model’s.`:'')
        +(missed?` ${missed} game${missed>1?'s':''} a run missed after that ${missed>1?'were':'was'} called the same way, from pre-game data, after kickoff.`:'')); } }
  /* a model the job could not rescore on its last run: its picks are the last good ones */
  { const names={joker:'The Joker',jokerLong:'Joker Jr',broly:'Broly Model'}, ms=S.modelStatus||{};
    for(const [k,v] of Object.entries(ms)){ if(!v) continue; const d=v.since?new Date(v.since):null;
      notes.push(`<b>${esc(names[k]||k)}</b> could not be rescored${d&&!isNaN(d)?' since '+esc(d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})):''}: ${esc(v.why||'an input was missing')}. Its picks are the last good ones and its record stands where it was.`); } }

  /* ---- 1. the chart ---- */
  /* drawn at the card's own width, so its text stays 11px on a phone instead of shrinking */
  const W=Math.max(340,Math.min(900,(card.clientWidth||760)-48)),H=W<520?230:250,padL=40,padR=W<520?112:128,padT=16,padB=30;
  const all=shown.flatMap(m=>m.pts.map(p=>p.net));
  let lo=Math.min(-3,...all), hi=Math.max(3,...all);
  const step=(hi-lo)<=8?1:(hi-lo)<=20?2:5; lo=Math.floor(lo/step)*step; hi=Math.ceil(hi/step)*step;
  const n=weeks.length;
  const X=i=>padL+i*(W-padL-padR)/Math.max(1,n);
  const Y=v=>padT+(H-padT-padB)*((hi-v)/(hi-lo));
  let svg='';
  for(let v=lo;v<=hi;v+=step) if(v!==0) svg+=`<line x1="${padL}" x2="${W-padR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#E6EAEF" stroke-width="1"/>`
    +`<text x="${padL-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" font-size="11" style="fill:var(--muted)">${sign(v)}</text>`;
  svg+=`<line x1="${padL}" x2="${W-padR}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke-width="1.5" style="stroke:var(--ink)"/>`
    +`<text x="${padL-8}" y="${(Y(0)+4).toFixed(1)}" text-anchor="end" font-size="11" font-weight="700" style="fill:var(--ink)">0</text>`
    +`<text x="${W-padR+10}" y="${(Y(0)+4).toFixed(1)}" font-size="11" font-weight="700" style="fill:var(--ink)">= Vegas</text>`;
  svg+=`<text x="${X(0)}" y="${H-9}" text-anchor="middle" font-size="11" style="fill:var(--muted)">Start</text>`
    +weeks.map((w,i)=>`<text x="${X(i+1).toFixed(1)}" y="${H-9}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${w>18?'P'+(w-18):'Wk '+w}</text>`).join('');
  svg+=`<line class="rv-cross" x1="0" x2="0" y1="${padT}" y2="${H-padB}" stroke-width="1" style="stroke:var(--line-2);display:none"/>`;
  for(const m of shown){
    const d=m.pts.map((p,i)=>X(i).toFixed(1)+','+Y(p.net).toFixed(1)).join(' ');
    svg+=`<polyline fill="none" stroke="${m.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${m.dash?' stroke-dasharray="5 4"':''} points="${d}"/>`;
    svg+=m.pts.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.net).toFixed(1)}" r="4" stroke-width="2" style="stroke:var(--panel)" fill="${m.dash?'var(--panel)':m.color}"/>`
      +(m.dash?`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.net).toFixed(1)}" r="3" fill="none" stroke="${m.color}" stroke-width="1.8"/>`:'')).join('');
  }
  /* end labels, nudged apart so they never sit on each other */
  const ends=shown.map(m=>({m,y:Y(m.net)})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<14) ends[i].y=ends[i-1].y+14;
  const over=ends.length?ends[ends.length-1].y-(H-padB):0; if(over>0) ends.forEach(e=>e.y-=over);
  for(const e of ends){ const x=X(n)+10;
    svg+=`<line x1="${x}" x2="${x+12}" y1="${e.y.toFixed(1)}" y2="${e.y.toFixed(1)}" stroke="${e.m.color}" stroke-width="2"${e.m.dash?' stroke-dasharray="3 2"':''}/>`
      +`<text x="${x+17}" y="${(e.y+4).toFixed(1)}" font-size="11" style="fill:var(--ink-2)"><tspan font-weight="700" style="fill:var(--ink)">${sign(e.m.net)}</tspan> ${esc(e.m.name)}</text>`; }
  /* hover: a band per week, a crosshair and the week's numbers */
  svg+=weeks.map((w,i)=>`<rect class="rv-hit" data-i="${i}" x="${(X(i+1)-(W-padL-padR)/Math.max(1,n)/2).toFixed(1)}" y="${padT}" width="${((W-padL-padR)/Math.max(1,n)).toFixed(1)}" height="${H-padT-padB}" fill="transparent"/>`).join('');
  const chart=`<div class="rv-wrap"><svg viewBox="0 0 ${W} ${H}" class="rv-chart" role="img" aria-label="Wins against Vegas by week">${svg}</svg><div class="rv-tip" hidden></div></div>`;
  const legend=shown.map(m=>`<span><i class="lgd" style="background:${m.dash?'repeating-linear-gradient(90deg,'+m.color+' 0 5px,transparent 5px 8px)':m.color}"></i>${esc(m.name)} <b>${rec(m.season)}</b> <span class="muted">${sign(m.net)} vs Vegas${m.fitNote?'*':''}</span></span>`).join('')
    +`<span><i class="lgd" style="background:var(--ink);height:2px"></i>Vegas <b>${rec(vegas.season)}</b> <span class="muted">the zero line</span></span>`;
  const h2=card.querySelector('h2'); if(h2) h2.textContent='Wins against Vegas';
  const intro=h2&&h2.nextElementSibling&&h2.nextElementSibling.tagName==='P'?h2.nextElementSibling:null;
  if(intro) intro.textContent='Each model’s wins minus the Vegas favourite’s on the same games, added up week by week. Above the line is beating Vegas, below is trailing it; one step is one game.';
  const lg=card.querySelector('.lgdrow'), toggle=lg&&lg.querySelector('.toggle');
  if(lg){ lg.innerHTML=legend; if(toggle) lg.appendChild(toggle); }
  card.querySelector('.rv-notes')?.remove();
  if(lg&&notes.length) lg.insertAdjacentHTML('afterend',`<div class="rv-notes muted" style="font-size:12px;margin:0 0 8px">${notes.map(n=>`<p style="margin:0 0 4px">${n}</p>`).join('')}</div>`);
  const old=card.querySelector('svg.wowchart'); if(old) old.outerHTML=chart;
  const wrap=card.querySelector('.rv-wrap'), tip=wrap&&wrap.querySelector('.rv-tip'), cross=wrap&&wrap.querySelector('.rv-cross');
  if(wrap) wrap.querySelectorAll('.rv-hit').forEach(h=>{
    const i=+h.dataset.i, x=X(i+1);
    const show=()=>{ cross.setAttribute('x1',x); cross.setAttribute('x2',x); cross.style.display='';
      tip.innerHTML=`<b>${wkName(weeks[i])}</b>`+shown.map(m=>`<div><i class="lgd" style="background:${m.color}"></i>${esc(m.name)} ${rec(m.byWeek[i])}${fitted(m,weeks[i])?' (fitted)':''}<span class="muted">&nbsp;· season ${sign(m.pts[i+1].net)} vs Vegas</span></div>`).join('')
        +`<div><i class="lgd" style="background:var(--ink);height:2px"></i>Vegas ${rec(vegas.byWeek[i])}</div>`;
      tip.hidden=false; const r=wrap.getBoundingClientRect(), px=x/W*r.width;
      tip.style.left=Math.min(Math.max(8,px+12),Math.max(8,r.width-tip.offsetWidth-8))+'px'; };
    h.addEventListener('mouseenter',show); h.addEventListener('click',show);
    h.addEventListener('mouseleave',()=>{ tip.hidden=true; cross.style.display='none'; }); });

  /* ---- 2. the week-by-week grid ---- */
  if(tab){
    const shade=t=>{ const g=t.w+t.l; if(!g) return ''; const p=t.w/g, a=Math.min(0.42,Math.abs(p-0.5)/0.3*0.42).toFixed(3);
      return p>0.5?`background:rgba(27,122,78,${a})`:(p<0.5?`background:rgba(192,57,43,${a})`:''); };
    const cell=(t,name,label,fit)=>{ const g=t.w+t.l; if(!g) return '<td class="rv-c rv-none">–</td>';
      if(fit) return `<td class="rv-c rv-fit" title="${esc(name)}, ${label}: ${t.w} of ${g}, fitted after the fact: these games were in its training"><b>${rec(t)}</b><small>fitted</small></td>`;
      return `<td class="rv-c" style="${shade(t)}" title="${esc(name)}, ${label}: ${t.w} of ${g} (${Math.round(100*t.w/g)}%)"><b>${rec(t)}</b><small>${Math.round(100*t.w/g)}%</small></td>`; };
    const gridRows=[...shown,{...vegas,color:null}].map(m=>`<tr><th class="rv-m"${m.test?' title="A test running beside the live Joker"':''}>${m.color?`<i class="lgd" style="background:${m.dash?'repeating-linear-gradient(90deg,'+m.color+' 0 5px,transparent 5px 8px)':m.color}"></i>`:'<i class="lgd" style="background:var(--ink);height:2px"></i>'}${esc(m.name)}</th>`
      +m.byWeek.map((t,i)=>cell(t,m.name,wkName(weeks[i]),fitted(m,weeks[i]))).join('')+cell(m.season,m.name,'season'+(m.fitNote?', '+m.fitNote:'')).replace('class="rv-c"','class="rv-c rv-season"')+'</tr>').join('');
    const games=weeks.map(w=>rows.filter(r=>+r.week===w).length);
    tab.innerHTML=`<div class="card"><h2>Week by week</h2><p class="muted" style="margin:0 0 10px">Each model’s record by week, shaded red under .500, clear at .500 and green above; the season is the last column.${jf.length&&shown.some(m=>m.fitNote)?` The Joker’s hatched cells (week${jf.length>1?'s':''} ${wkList(jf)}) are fitted after the fact, not called before the games.`:''}</p>
      <div class="rv-gridwrap"><table class="rv-grid"><thead><tr><th class="rv-m"></th>${weeks.map((w,i)=>`<th class="rv-c">${wkName(w)}<small>${games[i]} games</small></th>`).join('')}<th class="rv-c rv-season">Season</th></tr></thead>
      <tbody>${gridRows}</tbody></table></div></div>`;
  }
}
