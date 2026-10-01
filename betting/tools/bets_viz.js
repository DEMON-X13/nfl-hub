/* The Bet Log, drawn the way a brokerage draws an account: the app's renderBets() fills its
   chart and table, and the build wraps it so betsViz() redraws both boxes after it.

   Two views, a switch between them (kept with the bankroll settings, S.bank.betView):
   - Balance: the account week by week, from what was deposited (a labelled reference line)
     through the end of each logged week; the area between is shaded green where the account
     is above the deposit and red where it is below, and the latest balance is labelled at the
     line's end. Without a deposit the line is the running profit and the reference is $0.
   - Weekly P&L: one column a week from a $0 line, up green, down red, each labelled with its
     signed amount, so the sign never rests on colour alone; a week with no bets says so.
   Every logged week from the first to the last is on the axis, so a week off reads as flat.
   Hovering a week shows what was staked, what came back and the balance after it.

   Under the chart: the balance, the net, the return on money staked and the winning weeks.
   The deposit is the visitor's own number, entered here and kept in the browser
   (S.bank.deposit), never published. The table keeps the running total and, with a deposit,
   the balance after each week. */
function betsViz(){
  const chart=document.getElementById('betChart'), table=document.getElementById('betTable');
  if(!chart||!table) return;
  const logged=Object.keys(S.bets||{}).map(Number).sort((a,b)=>a-b).map(w=>({w,...S.bets[w]}));
  const dep=S.bank&&S.bank.deposit!=null&&S.bank.deposit!==''&&isFinite(+S.bank.deposit)?+S.bank.deposit:null;
  const view=S.bank&&S.bank.betView==='pnl'?'pnl':'balance';
  /* the dollar sign as an escape: the build splices this file in with a string replace, where
     a dollar followed by a quote or another dollar means something else */
  const USD='\u0024', MINUS='\u2212';
  const money=v=>(v<0?MINUS:'')+USD+Math.abs(v).toFixed(2);
  const signed=v=>(v>=0?'+':MINUS)+USD+Math.abs(v).toFixed(2);
  const short=v=>{ const a=Math.abs(v); return (v<0?MINUS:'')+USD+(a>=100||Number.isInteger(a)?Math.round(a):a.toFixed(a<10?2:1)); };
  const esc=t=>String(t||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  const depForm=`<div class="bv-dep"><label>Deposited ${USD}<input type="number" id="betDeposit" step="0.01" min="0" placeholder="0.00" value="${dep==null?'':dep}"></label>
      <button class="btn quiet" id="betDepositSave">Save</button><span class="muted">what you put in the account, for the balance; kept in this browser only</span></div>`;
  const wireDeposit=()=>document.getElementById('betDepositSave').addEventListener('click',()=>{
    const v=document.getElementById('betDeposit').value.trim();
    if(v!==''&&(!isFinite(+v)||+v<0)){ alert('Enter what you deposited, or leave it empty.'); return; }
    S.bank=Object.assign({},S.bank||{},{deposit:v===''?null:+(+v).toFixed(2)}); save(); renderRecord(); });
  if(!logged.length){
    chart.innerHTML=`<div class="card"><h2>Bankroll</h2><p class="muted" style="margin:0 0 8px">Log a week above and your balance shows here.</p>${depForm}</div>`;
    table.innerHTML=''; wireDeposit(); return;
  }
  /* every week from the first logged to the last, a week off at zero */
  const byW=Object.fromEntries(logged.map(r=>[r.w,r]));
  const weeks=[]; for(let w=logged[0].w;w<=logged[logged.length-1].w;w++){ const r=byW[w];
    weeks.push({w,bet:!!r,staked:r?r.staked:0,returned:r?r.returned:0,net:r?r.returned-r.staked:0}); }
  const base=dep==null?0:dep;
  let run=0; for(const k of weeks){ run+=k.net; k.run=run; k.bal=base+run; }
  const net=run, staked=logged.reduce((s,r)=>s+r.staked,0), won=logged.filter(r=>r.returned>r.staked).length;

  /* ---- geometry: drawn at the width it has, so text stays its real size on a phone; one
     value axis with clean ticks ---- */
  const W=Math.round(Math.max(320,Math.min(760,chart.clientWidth?chart.clientWidth-36:760))), narrow=W<520;
  const H=narrow?220:240,pl=narrow?48:58,pr=narrow?60:70,pt=22,pb=30;
  const ticks=(lo,hi)=>{ if(hi-lo<1e-9){ lo-=1; hi+=1; }
    const raw=(hi-lo)/4, p=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/p;
    const st=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p, a=Math.floor(lo/st)*st, b=Math.ceil(hi/st)*st, out=[];
    for(let v=a;v<=b+st/2;v+=st) out.push(+v.toFixed(6)); return out; };
  const grid=(T,Y)=>T.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`
    +`<text x="${pl-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)">${short(v)}</text>`).join('');
  let svg='', cols=[];
  if(view==='balance'){
    const pts=[{lab:'Start',v:base,k:null},...weeks.map(k=>({lab:'Wk '+k.w,v:k.bal,k}))];
    const T=ticks(Math.min(...pts.map(p=>p.v)),Math.max(...pts.map(p=>p.v))), lo=T[0], hi=T[T.length-1];
    const X=i=>pl+i*(W-pl-pr)/(pts.length-1), Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
    const line=pts.map((p,i)=>X(i).toFixed(1)+','+Y(p.v).toFixed(1)).join(' ');
    const yb=Y(base).toFixed(1), area=`${X(0).toFixed(1)},${yb} ${line} ${X(pts.length-1).toFixed(1)},${yb}`;
    const end=pts[pts.length-1], up=end.v>=base;
    svg=grid(T,Y)
      +`<clipPath id="bvUp"><rect x="0" y="0" width="${W}" height="${yb}"/></clipPath><clipPath id="bvDn"><rect x="0" y="${yb}" width="${W}" height="${H}"/></clipPath>`
      +`<polygon points="${area}" fill="#1F6F4A" fill-opacity=".12" clip-path="url(#bvUp)"/><polygon points="${area}" fill="#B23A32" fill-opacity=".12" clip-path="url(#bvDn)"/>`
      +`<line class="bv-ref" x1="${pl}" x2="${W-pr}" y1="${yb}" y2="${yb}" stroke="var(--ink-2)" stroke-width="1.5"/>`
      +`<text x="${pl+4}" y="${(+yb-6).toFixed(1)}" font-size="11" font-weight="700" fill="var(--ink-2)">${dep==null?'Break even, '+USD+'0':'Deposited '+money(dep)}</text>`
      +`<polyline points="${line}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
      +pts.map((p,i)=>i?`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4.5" fill="${p.k.net>0?'#1F6F4A':p.k.net<0?'#B23A32':'var(--muted)'}" stroke="var(--panel)" stroke-width="2"/>`:'').join('')
      +`<text class="bv-end" x="${(X(pts.length-1)+10).toFixed(1)}" y="${(Y(end.v)+4).toFixed(1)}" font-size="13" font-weight="700" fill="var(--ink)">${money(end.v)}</text>`
      +pts.map((p,i)=>{ const every=Math.ceil(pts.length/(narrow?6:12)); return i%every&&i!==pts.length-1?'':`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="${i===0?'start':i===pts.length-1?'end':'middle'}" font-size="11" fill="var(--muted)">${p.lab}</text>`; }).join('');
    cols=pts.map((p,i)=>({x:X(i),k:p.k,i}));
  } else {
    const T=ticks(Math.min(0,...weeks.map(k=>k.net)),Math.max(0,...weeks.map(k=>k.net))), lo=T[0], hi=T[T.length-1];
    const band=(W-pl-pr)/weeks.length, bw=Math.min(24,band*0.5), X=i=>pl+band*(i+.5), Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb), y0=Y(0);
    const bar=(x,v)=>{ const y=Y(v), h=Math.abs(y-y0), r=Math.min(4,h), l=x-bw/2, rr=x+bw/2;
      if(h<.5) return '';
      return v>0?`<path d="M${l},${y0} V${y+r} Q${l},${y} ${l+r},${y} H${rr-r} Q${rr},${y} ${rr},${y+r} V${y0} Z" fill="#1F6F4A"/>`
                :`<path d="M${l},${y0} V${y-r} Q${l},${y} ${l+r},${y} H${rr-r} Q${rr},${y} ${rr},${y-r} V${y0} Z" fill="#B23A32"/>`; };
    svg=grid(T,Y)
      +weeks.map((k,i)=>bar(X(i),k.net)
        +(k.bet?`<text x="${X(i).toFixed(1)}" y="${(k.net>=0?Y(k.net)-7:Y(k.net)+15).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${signed(k.net)}</text>`
               :`<text x="${X(i).toFixed(1)}" y="${(y0-7).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--muted)">no bets</text>`)
        +(i%Math.ceil(weeks.length/(narrow?6:12))&&i!==weeks.length-1?'':`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--muted)">Wk ${k.w}</text>`)).join('')
      +`<line class="bv-ref" x1="${pl}" x2="${W-pr}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="var(--ink-2)" stroke-width="1.5"/>`;
    cols=weeks.map((k,i)=>({x:X(i),k,i}));
  }
  const hitW=(W-pl-pr)/Math.max(1,cols.length-(view==='balance'?1:0));
  const hits=cols.map(c=>`<rect class="bv-hit" data-i="${c.i}" x="${(c.x-hitW/2).toFixed(1)}" y="${pt}" width="${hitW.toFixed(1)}" height="${H-pt-pb}" fill="transparent"/>`).join('');
  chart.innerHTML=`<div class="card"><div class="bv-hd"><h2>Bankroll</h2><span class="seg" role="group" aria-label="Chart">`
    +`<button type="button" data-bv="balance" class="${view==='balance'?'on':''}" aria-pressed="${view==='balance'}">Balance</button>`
    +`<button type="button" data-bv="pnl" class="${view==='pnl'?'on':''}" aria-pressed="${view==='pnl'}">Weekly P&amp;L</button></span></div>
    <p class="muted" style="margin:0 0 8px">${view==='balance'?(dep==null?'Your running profit, week by week, against break even. Enter what you deposited below to see the account balance instead.':'Your account balance at the end of each week, against what you deposited: green while you are above it, red while you are below.'):'What each week made or lost.'}</p>
    <div class="bv-wrap"><svg class="bv-chart bv-${view}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${view==='balance'?'Account balance by week':'Profit and loss by week'}">${svg}${hits}</svg><div class="bv-tip" hidden></div></div>
    <div class="stat-strip" style="margin-top:12px">
      <div class="stat bv-balance"><b>${dep==null?'–':money(dep+net)}</b><span>${dep==null?'balance: enter your deposit below':'balance, '+money(dep)+' deposited'}</span></div>
      <div class="stat"><b class="${net>=0?'delta up':'delta down'}">${signed(net)}</b><span>net across ${logged.length} week${logged.length===1?'':'s'} bet</span></div>
      <div class="stat"><b>${staked?((net>=0?'+':MINUS)+Math.abs(net/staked*100).toFixed(1)):'0.0'}%</b><span>return on ${money(staked)} staked</span></div>
      <div class="stat"><b>${won} of ${logged.length}</b><span>winning weeks</span></div>
    </div>
    ${depForm}</div>`;
  /* hover: the week under the pointer, its money and the balance after it */
  const wrap=chart.querySelector('.bv-wrap'), tip=chart.querySelector('.bv-tip'), svgEl=chart.querySelector('svg');
  chart.querySelectorAll('.bv-hit').forEach(h=>{
    const show=()=>{ const c=cols[+h.dataset.i], k=c.k;
      tip.innerHTML=!k?`<b>Start</b>${dep==null?'Break even':'Deposited '+money(dep)}`
        :`<b>Week ${k.w}</b>${k.bet?`Staked ${money(k.staked)}, back ${money(k.returned)}<br>Week ${signed(k.net)}`:'No bets'}<br>${dep==null?'Running '+signed(k.run):'Balance '+money(k.bal)}`;
      const r=svgEl.getBoundingClientRect(), x=c.x/W*r.width;
      tip.hidden=false; tip.style.left=Math.max(0,Math.min(r.width-tip.offsetWidth,x-tip.offsetWidth/2))+'px'; };
    h.addEventListener('mouseenter',show); h.addEventListener('focus',show); h.addEventListener('click',show);
    h.addEventListener('mouseleave',()=>{ tip.hidden=true; }); });
  chart.querySelectorAll('[data-bv]').forEach(b=>b.addEventListener('click',()=>{
    S.bank=Object.assign({},S.bank||{},{betView:b.dataset.bv}); save(); renderRecord(); }));
  wireDeposit();
  /* a width change that crosses into another size redraws it, once a resize settles */
  if(!window.__bvResize){ window.__bvResize=true; let t=null, lastW=W;
    window.addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(()=>{ const c=document.getElementById('betChart');
      if(c&&c.querySelector('svg.bv-chart')&&Math.abs((c.clientWidth-36)-lastW)>40){ lastW=c.clientWidth-36; betsViz(); } },200); }); }
  /* the table: the app's columns, with the balance after each week once there is a deposit */
  let r2=0;
  table.innerHTML='<div class="card"><h2>Bet log</h2><table><thead><tr><th>Week</th><th class="num">Staked</th><th class="num">Returned</th><th class="num">Net</th><th class="num">Running</th>'+(dep==null?'':'<th class="num">Balance</th>')+'<th>Note</th><th></th></tr></thead><tbody>'
    +logged.map(r=>{ const n=r.returned-r.staked; r2+=n;
      return `<tr><td>Week ${r.w}</td><td class="num">${money(r.staked)}</td><td class="num">${money(r.returned)}</td>`
        +`<td class="num ${n>=0?'delta up':'delta down'}">${signed(n)}</td><td class="num">${signed(r2)}</td>`
        +(dep==null?'':`<td class="num">${money(dep+r2)}</td>`)
        +`<td class="muted">${esc(r.note)}</td><td><button class="btn quiet" data-betdel="${r.w}">Remove</button></td></tr>`; }).join('')
    +'</tbody></table></div>';
  table.querySelectorAll('button[data-betdel]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm(`Remove the week ${b.dataset.betdel} bet entry?`)) return;
    delete S.bets[b.dataset.betdel]; save(); renderRecord(); }));
}
