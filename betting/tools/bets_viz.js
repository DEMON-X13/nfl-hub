/* The Bet Log, as the owner reads it. The app's renderBets() draws a running-profit chart, a
   row of figures and a table; the build wraps it so betsViz() redraws both boxes after it:

   - the same chart, the running profit week by week above and below a zero line the build
     makes solid and labelled (the app drew it faint and dashed);
   - the figures under it lead with the balance: what was deposited plus every logged week's
     net. The deposit is the visitor's own number, entered on the card and kept with the
     bankroll settings in the browser (S.bank.deposit), never published; without one the
     balance figure asks for it. Then the app's own: net, total staked, return on money
     staked, winning weeks;
   - the table as the app had it, with the balance after each week beside the running total
     once a deposit is entered. */
function betsViz(){
  const chart=document.getElementById('betChart'), table=document.getElementById('betTable');
  if(!chart||!table) return;
  const rows=Object.keys(S.bets||{}).map(Number).sort((a,b)=>a-b).map(w=>({w,...S.bets[w]}));
  const dep=S.bank&&S.bank.deposit!=null&&S.bank.deposit!==''&&isFinite(+S.bank.deposit)?+S.bank.deposit:null;
  /* the dollar sign as an escape: the build splices this file in with a string replace, where
     a dollar followed by a quote or another dollar means something else */
  const USD='\u0024';
  const money=v=>(v<0?'-':'')+USD+Math.abs(v).toFixed(2);
  const signed=v=>(v>=0?'+':'-')+USD+Math.abs(v).toFixed(2);
  const depForm=`<div class="bv-dep"><label>Deposited ${USD}<input type="number" id="betDeposit" step="0.01" min="0" placeholder="0.00" value="${dep==null?'':dep}"></label>
      <button class="btn quiet" id="betDepositSave">Save</button><span class="muted">what you put in the account, for the balance; kept in this browser only</span></div>`;
  if(!rows.length){
    chart.innerHTML=`<div class="card"><h2>Betting, running total</h2>${depForm}</div>`; table.innerHTML='';
  } else {
    let run=0; const pts=rows.map(r=>{ run+=r.returned-r.staked;
      return {x:r.w,y:run,tip:`Week ${r.w}: staked ${money(r.staked)}, back ${money(r.returned)}, running ${signed(run)}${dep==null?'':', balance '+money(dep+run)}`}; });
    const staked=rows.reduce((s,r)=>s+r.staked,0), back=rows.reduce((s,r)=>s+r.returned,0), net=back-staked;
    chart.innerHTML=`<div class="card"><h2>Betting, running total</h2>
      <p class="muted" style="margin:0 0 8px">Cumulative profit or loss across the weeks you have logged. Above the line you are up, below it you are down.</p>
      ${lineChart(pts,{money:true,zero:true,color:net>=0?'#1F6F4A':'#B23A32',label:'running betting profit'})}
      <div class="stat-strip" style="margin-top:10px">
        <div class="stat bv-balance"><b>${dep==null?'–':money(dep+net)}</b><span>${dep==null?'balance: enter your deposit below':'balance, '+money(dep)+' deposited'}</span></div>
        <div class="stat"><b class="${net>=0?'delta up':'delta down'}">${signed(net)}</b><span>net across ${rows.length} week${rows.length===1?'':'s'}</span></div>
        <div class="stat"><b>${money(staked)}</b><span>total staked</span></div>
        <div class="stat"><b>${staked?((net/staked)*100).toFixed(1):'0.0'}%</b><span>return on money staked</span></div>
        <div class="stat"><b>${rows.filter(r=>r.returned>r.staked).length} of ${rows.length}</b><span>winning weeks</span></div>
      </div>
      ${depForm}</div>`;
    table.innerHTML='<div class="card"><h2>Bet log</h2><table><thead><tr><th>Week</th><th class="num">Staked</th><th class="num">Returned</th><th class="num">Net</th><th class="num">Running</th>'+(dep==null?'':'<th class="num">Balance</th>')+'<th>Note</th><th></th></tr></thead><tbody>'
      +rows.map((r,i)=>{ const n=r.returned-r.staked;
        return `<tr><td>Week ${r.w}</td><td class="num">${money(r.staked)}</td><td class="num">${money(r.returned)}</td>`
          +`<td class="num ${n>=0?'delta up':'delta down'}">${signed(n)}</td><td class="num">${signed(pts[i].y)}</td>`
          +(dep==null?'':`<td class="num">${money(dep+pts[i].y)}</td>`)
          +`<td class="muted">${String(r.note||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</td><td><button class="btn quiet" data-betdel="${r.w}">Remove</button></td></tr>`; }).join('')
      +'</tbody></table></div>';
    table.querySelectorAll('button[data-betdel]').forEach(b=>b.addEventListener('click',()=>{
      if(!confirm(`Remove the week ${b.dataset.betdel} bet entry?`)) return;
      delete S.bets[b.dataset.betdel]; save(); renderRecord(); }));
  }
  document.getElementById('betDepositSave').addEventListener('click',()=>{
    const v=document.getElementById('betDeposit').value.trim();
    if(v!==''&&(!isFinite(+v)||+v<0)){ alert('Enter what you deposited, or leave it empty.'); return; }
    S.bank=Object.assign({},S.bank||{},{deposit:v===''?null:+(+v).toFixed(2)}); save(); renderRecord(); });
}
