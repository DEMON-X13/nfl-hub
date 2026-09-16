"""A Check Credits button, and a log that stops lying on the second visit.

The log's placeholder said "Nothing uploaded yet. Projections are running off how
everyone finished 2025." It was only ever meant for a first visit with no data. On
a return visit the built-in data is already in the browser, so nothing new gets
applied, nothing gets logged, and the placeholder sat there claiming the page had
no 2026 data at all while the projections were plainly using it. The log now says
what is actually loaded.

Check Credits re-reads the balance the last build published, cache-busted, so the
figure updates without reopening the page. It cannot call the odds API directly:
admin.html is served publicly by GitHub Pages, and the key would have to be in it.
"""
from pathlib import Path

HERE = Path(__file__).parent
H = HERE / 'part1.html'
J = HERE / 'part3.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ------------------------------------------------------------------ part1.html
sub1(H, '    <div id="pricePull" class="log" style="margin-top:0"></div>',
      '    <div id="pricePull" class="log" style="margin-top:0"></div>\n'
      '    <div class="bar" style="margin:10px 0 0">\n'
      '      <button class="btn danger" id="checkCredits">Check Credits</button>\n'
      '      <span class="muted" id="creditsStatus">Re-reads the balance the last build published. Costs nothing.</span>\n'
      '    </div>')

# -------------------------------------------------------------------- part3.js
# 1. the log tells the truth on a return visit
sub1(J, """  if(baked&&(baked.stats.length||baked.prices||baked.inj)){
    const parts=[]; if(baked.stats.length) parts.push(`${baked.stats.length} game${baked.stats.length===1?'':'s'} of stats graded and applied`);
    if(baked.prices) parts.push(`${baked.prices} prices loaded`); if(baked.inj) parts.push(`${baked.inj} players ruled out`);
    setTimeout(()=>log(`Built into this file (${PAY.baked_at?String(PAY.baked_at).slice(0,16).replace('T',' '):'weekly build'}): ${parts.join(', ')}. Nothing to upload.`,'ok'),0); }""",
      """  if(baked&&(baked.stats.length||baked.prices||baked.inj)){
    const parts=[]; if(baked.stats.length) parts.push(`${baked.stats.length} game${baked.stats.length===1?'':'s'} of stats graded and applied`);
    if(baked.prices) parts.push(`${baked.prices} prices loaded`); if(baked.inj) parts.push(`${baked.inj} players ruled out`);
    setTimeout(()=>log(`Built into this file (${PAY.baked_at?String(PAY.baked_at).slice(0,16).replace('T',' '):'weekly build'}): ${parts.join(', ')}. Nothing to upload.`,'ok'),0); }
  else {
    /* a return visit: the built-in data is already here, so nothing new was applied and
       nothing was logged. Say what is loaded rather than leave the first-visit placeholder,
       which claimed there was no 2026 data at all. */
    const wk=Object.keys(S.processed).length;
    const priced=Object.values(S.odds).filter(o=>o&&Object.keys(o).length).length;
    const bits=[];
    if(wk) bits.push(`${wk} week${wk===1?'':'s'} of ${SEASON} stats`);
    if(priced) bits.push(`prices for ${priced} game${priced===1?'':'s'}`);
    setTimeout(()=>log(bits.length
      ?`Already loaded in this browser: ${bits.join(' and ')}, from the build of ${PAY.baked_at?String(PAY.baked_at).slice(0,16).replace('T',' '):'the weekly job'}. Nothing to upload.`
      :`No ${SEASON} data yet. Projections are running off how everyone finished ${SEASON-1}.`,'ok'),0); }""")

# 2. the button
sub1(J, "$('weekSel').addEventListener('change',()=>{S.ui.game=null;renderSlate();});",
      """/* the balance the last build published. It is exact except while a pull is running:
   credits only move when a build spends them, and every build republishes this file.
   The page cannot ask the odds API itself, because admin.html is public and the key
   would have to be in it. */
const CREDITS_URL='https://demon-x13.github.io/nfl-hub/props/data/credits.json';
$('checkCredits').addEventListener('click',async()=>{
  const b=$('checkCredits'); b.disabled=true; const was=b.textContent; b.textContent='Checking\\u2026';
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
$('weekSel').addEventListener('change',()=>{S.ui.game=null;renderSlate();});""")

# --------------------------------------------------------------------- audit.js
sub1(A, "    console.log(`N. credit pull:",
      """    const cb=d.getElementById('checkCredits');
    chk(!!cb&&/Check Credits/.test(cb.textContent),'no Check Credits button');
    chk(cb&&cb.classList.contains('danger'),'the Check Credits button is not the red one');
    chk(!!d.getElementById('creditsStatus'),'the Check Credits button has nowhere to report');
    console.log(`N. credit pull:""")

print('Check Credits button added, log fixed on a return visit')
