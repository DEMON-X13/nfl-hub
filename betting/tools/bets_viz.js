/* The Bet Log, as the owner reads it: what is in the account now, not a chart. The app's
   renderBets() draws a running-profit chart and a table; the build renames it and puts this
   in its place, so renderBets() draws the app's own and then betsViz() redraws both boxes.

   The balance is what was deposited plus every logged week's net. The deposit is the
   visitor's own number, kept with the bankroll settings in the browser (S.bank.deposit),
   never published. Until one is entered the card shows the net alone and asks for it.
   Net and winning weeks stay as figures; the chart and the total-staked figure are gone.
   The table's running column becomes the balance after each week. */
function betsViz(){
  const chart=document.getElementById('betChart'), table=document.getElementById('betTable');
  if(!chart||!table) return;
  const rows=Object.keys(S.bets||{}).map(Number).sort((a,b)=>a-b).map(w=>({w,...S.bets[w]}));
  const dep=S.bank&&isFinite(+S.bank.deposit)&&S.bank.deposit!==''&&S.bank.deposit!=null?+S.bank.deposit:null;
  /* the dollar sign as an escape: the build splices this file in with a string replace, where
     a dollar followed by a quote or another dollar means something else */
  const USD='\u0024';
  const money=v=>(v<0?'-':'')+USD+Math.abs(v).toFixed(2);
  const signed=v=>(v>=0?'+':'-')+USD+Math.abs(v).toFixed(2);
  const net=rows.reduce((s,r)=>s+(r.returned-r.staked),0);
  const won=rows.filter(r=>r.returned>r.staked).length;
  const bal=dep==null?null:dep+net;
  chart.innerHTML=`<div class="card bv-card"><h2>Balance</h2>
    <div class="bv-top">
      <div class="bv-bal"><b>${bal==null?'–':money(bal)}</b><span>${dep==null?'enter what you deposited to see your balance':`in the account: ${money(dep)} deposited, ${signed(net)} from betting`}</span></div>
      <label class="bv-dep">Deposited ${USD}<input type="number" id="betDeposit" step="0.01" min="0" placeholder="0.00" value="${dep==null?'':dep}"></label>
      <button class="btn quiet" id="betDepositSave">Save</button>
    </div>
    <div class="stat-strip" style="margin:14px 0 0">
      <div class="stat"><b class="${net>=0?'delta up':'delta down'}">${signed(net)}</b><span>net across ${rows.length} week${rows.length===1?'':'s'}</span></div>
      <div class="stat"><b>${won} of ${rows.length}</b><span>winning weeks</span></div>
    </div></div>`;
  let run=dep==null?0:dep;
  table.innerHTML=rows.length?'<div class="card"><h2>Week by week</h2><table><thead><tr><th>Week</th><th class="num">Staked</th><th class="num">Returned</th><th class="num">Net</th><th class="num">'+(dep==null?'Running':'Balance')+'</th><th>Note</th><th></th></tr></thead><tbody>'
    +rows.map(r=>{ const n=r.returned-r.staked; run+=n;
      return `<tr><td>Week ${r.w}</td><td class="num">${money(r.staked)}</td><td class="num">${money(r.returned)}</td>`
        +`<td class="num ${n>=0?'delta up':'delta down'}">${signed(n)}</td><td class="num">${dep==null?signed(run):money(run)}</td>`
        +`<td class="muted">${String(r.note||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</td><td><button class="btn quiet" data-betdel="${r.w}">Remove</button></td></tr>`; }).join('')
    +'</tbody></table></div>':'';
  table.querySelectorAll('button[data-betdel]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm(`Remove the week ${b.dataset.betdel} bet entry?`)) return;
    delete S.bets[b.dataset.betdel]; save(); renderRecord(); }));
  document.getElementById('betDepositSave').addEventListener('click',()=>{
    const v=document.getElementById('betDeposit').value.trim();
    if(v!==''&&(!isFinite(+v)||+v<0)){ alert('Enter what you deposited, or leave it empty.'); return; }
    S.bank=Object.assign({},S.bank||{},{deposit:v===''?null:+(+v).toFixed(2)}); save(); renderRecord(); });
}
