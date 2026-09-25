/* The Pick'em Record's two pictures, drawn over what the app's renderRecord() leaves:

   1. Wins against Vegas: each model's wins minus the Vegas favourite's wins on the same games,
      added up week by week, from zero before week 1. Vegas is the zero line, so above it is
      beating the betting favourite and below it is trailing it, and a line's height is games,
      not a percentage that swings on sixteen of them.
   2. Week by week: models down the side, weeks across, each cell that week's record shaded
      from red (under .500) through clear to green (over), the season in the last column.

   Colours follow the model, as everywhere else on the tab (Main green, Challenger blue, Joker
   red, Elo orange); every line carries a label at its end beside the legend. Your own picks
   are not drawn: My Picks is retired, and so is the You column. (A dashed series with hollow
   dots is still supported, through dash:true.)
   Text is in the page's ink, never a line's colour. renderRecord() calls recordViz(rows) last;
   betting/tools/build.js puts this file in front of the app's own script. */
function recordViz(rows){
  const card=document.querySelector('#modelChart .card'), tab=document.getElementById('recordTable');
  if(!card||!rows||!rows.length) return;
  const showAll=!!S.showAllModels;
  const winner=r=>r.result>0?r.home:r.away;
  const vPick=r=>r.line==null||r.line===0?null:(r.line>0?r.home:r.away);
  const vOk=r=>vPick(r)===null?null:vPick(r)===winner(r);
  const flag=v=>v===true||v===false?v:null;
  const MODELS=[
    {id:'main',name:'Main Model',color:'#1F6F4A',ok:r=>flag(r.correct)},
    {id:'chal',name:'Challenger',color:'#3B6FB6',all:true,ok:r=>r.h?flag(r.h.correct):null},
    {id:'joker',name:'The Joker',color:'#C0392B',all:true,ok:r=>r.joker?flag(r.joker.correct):null},
    {id:'elo',name:'Elo model',color:'#E8730A',all:true,ok:r=>r.elo?flag(r.elo.correct):null}];
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
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const sign=n=>n>0?'+'+n:(n<0?'−'+Math.abs(n):'0');
  const rec=t=>`${t.w}–${t.l}`;

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
  const legend=shown.map(m=>`<span><i class="lgd" style="background:${m.dash?'repeating-linear-gradient(90deg,'+m.color+' 0 5px,transparent 5px 8px)':m.color}"></i>${esc(m.name)} <b>${rec(m.season)}</b> <span class="muted">${sign(m.net)} vs Vegas</span></span>`).join('')
    +`<span><i class="lgd" style="background:var(--ink);height:2px"></i>Vegas <b>${rec(vegas.season)}</b> <span class="muted">the zero line</span></span>`;
  const h2=card.querySelector('h2'); if(h2) h2.textContent='Wins against Vegas';
  const intro=h2&&h2.nextElementSibling&&h2.nextElementSibling.tagName==='P'?h2.nextElementSibling:null;
  if(intro) intro.textContent='Each model’s wins minus the Vegas favourite’s on the same games, added up week by week. Above the line is beating Vegas, below is trailing it; one step is one game.';
  const lg=card.querySelector('.lgdrow'), toggle=lg&&lg.querySelector('.toggle');
  if(lg){ lg.innerHTML=legend; if(toggle) lg.appendChild(toggle); }
  const old=card.querySelector('svg.wowchart'); if(old) old.outerHTML=chart;
  const wrap=card.querySelector('.rv-wrap'), tip=wrap&&wrap.querySelector('.rv-tip'), cross=wrap&&wrap.querySelector('.rv-cross');
  if(wrap) wrap.querySelectorAll('.rv-hit').forEach(h=>{
    const i=+h.dataset.i, x=X(i+1);
    const show=()=>{ cross.setAttribute('x1',x); cross.setAttribute('x2',x); cross.style.display='';
      tip.innerHTML=`<b>${wkName(weeks[i])}</b>`+shown.map(m=>`<div><i class="lgd" style="background:${m.color}"></i>${esc(m.name)} ${rec(m.byWeek[i])}<span class="muted">&nbsp;· season ${sign(m.pts[i+1].net)} vs Vegas</span></div>`).join('')
        +`<div><i class="lgd" style="background:var(--ink);height:2px"></i>Vegas ${rec(vegas.byWeek[i])}</div>`;
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
    const gridRows=[...shown,{...vegas,color:null}].map(m=>`<tr><th class="rv-m">${m.color?`<i class="lgd" style="background:${m.color}"></i>`:'<i class="lgd" style="background:var(--ink);height:2px"></i>'}${esc(m.name)}</th>`
      +m.byWeek.map((t,i)=>cell(t,m.name,wkName(weeks[i]))).join('')+cell(m.season,m.name,'season').replace('class="rv-c"','class="rv-c rv-season"')+'</tr>').join('');
    const games=weeks.map(w=>rows.filter(r=>+r.week===w).length);
    tab.innerHTML=`<div class="card"><h2>Week by week</h2><p class="muted" style="margin:0 0 10px">Each model’s record by week, shaded red under .500, clear at .500 and green above; the season is the last column.</p>
      <div class="rv-gridwrap"><table class="rv-grid"><thead><tr><th class="rv-m"></th>${weeks.map((w,i)=>`<th class="rv-c">${wkName(w)}<small>${games[i]} games</small></th>`).join('')}<th class="rv-c rv-season">Season</th></tr></thead>
      <tbody>${gridRows}</tbody></table></div></div>`;
  }
}
