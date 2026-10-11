"""app v89: a Bet amount box over the suggested parlays, one amount with the builder's stake.

The owner asked to enter his own amount on the suggested parlays. Each tier showed what "$10
PAYS" and nothing else: PB_STAKE, a fixed $10, so the tiers compared on one footing, while the
builder below kept an amount of its own (S.stake, $20 to start, with its box and its one-tap
amounts). A tier added to the builder or finished as a card went on to show a figure the panel
had never shown.

Now there is one amount:

  * A Bet amount box at the top of the panel's controls (#pbStake, over Build from): dollars, a
    number box with the decimal keypad on a phone (inputmode decimal), $1 to $100,000 in steps of
    $1, cents kept. It is S.stake, the builder's own stake, so it is set once: the builder's box
    and its amount buttons set the same number, and either box shows what the other was given.
  * Every tier pays on it, the panel's four and the Elo picks below them alike (both are drawn by
    pbTierCard): "$25 pays" over 25 times the tier's own decimal price, never anything else. As
    the amount is typed the payouts are redrawn in place (pbPays, each card's data-pb-pay holding
    its price), so the box keeps its focus and caret, and the builder's figures follow a quarter
    of a second later. Leaving the box (or Enter) settles it: the box shows the amount cleaned,
    and the builder is redrawn only if it is on another amount, without redrawing the panel
    (renderParlay({keepPb:true})), so an Add to builder or Finish pressed straight after typing
    is not lost to a redraw under the pointer.
  * Add to builder leaves the tier in the builder on that amount, which is the builder's own, so
    the builder pays what the tier said. Finish (the Bets and Stats page's parlay card, which
    reads pbStake() where it read PB_STAKE) opens the card on it.
  * A typed amount is read as dollars: a $ sign and thousands commas are allowed, it is kept to
    the cent and held between $1 and $100,000 (stakeRead). Anything that is not a positive number
    (blank, a word, 0, a minus, Infinity) is no amount at all: the amount stays what it was and
    the box goes back to it, so nothing drawn from it is ever NaN. The builder's own box follows
    the same rule (it took 0 before, and +"abc"||0 made a $0 stake of anything it could not read).
  * It is kept as the builder's stake always was, with the visitor's own state (save()), and a
    saved amount that is not one (an old or hand-edited state, a backup imported) reads as the
    usual $20 (pbStake) on load. The default stays $20, so a first visit's tiers now say what $20
    pays rather than $10.

The game page's own High/Medium/Low suggestions already showed what the builder's stake pays;
they read it through pbStake() too.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, so a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v88 \\u00b7 2026-10-11';", "const APP_BUILD='app v89 \\u00b7 2026-10-11';")

# ---------------------------------------------------------------- the box's look: the panel's own controls
sub1('p1', """.pb-lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);min-width:84px}
""",
""".pb-lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);min-width:84px}
/* the Bet amount box: a $ and the number in one control, framed like the mix switch beside it.
   16px so a phone does not zoom in on it */
.pb-amt{display:inline-flex;align-items:center;min-height:40px;padding:0 2px 0 12px;border:1px solid var(--line-2);border-radius:10px;background:var(--panel);box-shadow:var(--sh-xs);transition:border-color .15s var(--ease),box-shadow .15s var(--ease)}
.pb-amt:hover{border-color:#B9C4D2}
.pb-amt:focus-within{border-color:var(--ink);box-shadow:var(--ring)}
.pb-amt>span{font-family:var(--display);font-size:16px;font-weight:700;color:var(--ink-2)}
.pb-amt input[type=number]{width:120px;border:0;border-radius:0 8px 8px 0;background:transparent;box-shadow:none;padding:8px 8px 8px 3px;font-family:var(--display);font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink)}
.pb-amt input[type=number]:focus{box-shadow:none;outline:none}
.pb-amt-hint{font-size:12px;color:var(--muted)}
""")

# ---------------------------------------------------------------- part3: the amount, one number
sub1('p3', """const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_STAKE=10, PB_CAP=40, PB_BEAM=12, PB_FINAL=8;
let PB_CACHE=new Map(), PB_SHOWN=null;
""",
"""const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40, PB_BEAM=12, PB_FINAL=8;
let PB_CACHE=new Map(), PB_SHOWN=null, PB_AMT_T=null;
/* ---------- the amount bet: one number, S.stake, set from either box ----------
   The Bet amount box over the suggested parlays and the builder's own stake are one amount: what
   every tier pays is worked on it, Add to builder leaves it in the builder, and Finish opens the
   parlay card on it. It is saved with the rest of the visitor's state, as the builder's stake
   always was. A typed amount is read as dollars (a $ sign and thousands commas allowed), kept to
   the cent and held between $1 and $100,000; anything that is not a positive number (blank, a
   word, 0, a minus) is no amount at all and the amount stays what it was, so nothing drawn from
   it is ever NaN. A saved amount that is not one (an old or hand-edited state) reads as $20. */
const STAKE_MIN=1, STAKE_MAX=100000, STAKE_DEFAULT=20;
function stakeRead(v){
  const n=typeof v==='number'?v:(typeof v==='string'&&v.trim()?Number(v.replace(/[\\s$,]/g,'')):NaN);
  return isFinite(n)&&n>0?Math.min(STAKE_MAX,Math.max(STAKE_MIN,Math.round(n*100)/100)):null;
}
function pbStake(){ const v=stakeRead(typeof S==='object'&&S?S.stake:null); return v==null?STAKE_DEFAULT:v; }
/* the amount as a box shows it (20, 12.50) and as a label ($20, $12.50, $1,250) */
const stakeText=v=>v%1?v.toFixed(2):String(v);
const pbAmt=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
""")

# the state as loaded, and as imported from a backup: a stake that is not one reads as $20
sub1('p3', """  S.odds=S.odds||{}; S.parlay=S.parlay||{}; if(S.stake==null) S.stake=20; S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{};
  let baked=null;""",
"""  S.odds=S.odds||{}; S.parlay=S.parlay||{}; S.stake=pbStake(); S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{};
  let baked=null;""")
sub1('p3', """    S.odds=S.odds||{}; S.parlay=S.parlay||{}; if(S.stake==null) S.stake=20; S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{}; S.processedGames=S.processedGames||{};""",
"""    S.odds=S.odds||{}; S.parlay=S.parlay||{}; S.stake=pbStake(); S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{}; S.processedGames=S.processedGames||{};""")

# a game page's own suggestions show what the same amount pays
sub1('p3', """  const T=gameTiers(g), stake=Math.max(0,+S.stake||0);""", """  const T=gameTiers(g), stake=pbStake();""")

# ---------------------------------------------------------------- part3: the tiers pay on it
sub1('p3', """const pbMoney=v=>'$'+(+v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
""",
"""const pbMoney=v=>'$'+(+v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
/* a tier's payout on the amount in the box: what it pays, and on what */
function pbPayHtml(dec){ const s=pbStake(); return `<b>${pbMoney(s*dec)}</b><span>${pbAmt(s)} pays</span>`; }
/* the payouts redrawn in place as the amount is typed, the panel's tiers and the Elo picks alike
   (each card's data-pb-pay is its decimal price), so the box keeps its focus and its caret */
function pbPays(){ const el=$('pbPanel'); if(el) el.querySelectorAll('[data-pb-pay]').forEach(x=>{ x.innerHTML=pbPayHtml(+x.dataset.pbPay); }); }
/* the builder's own figures on the amount, redrawn only when they show another one; the panel is
   left as it is, so an Add to builder or Finish pressed straight after typing still lands */
function pbSyncBuilder(){ const ps=$('pStake'); if(ps&&stakeRead(ps.value)!==pbStake()) renderParlay({keepPb:true}); }
""")
sub1('p3', """<div><b>${pbMoney(PB_STAKE*t.dec)}</b><span>$${PB_STAKE} pays</span></div></div>""",
"""<div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>""")

# the box, at the top of the panel's controls
sub1('p3', """    <div class="pb-ctl">
      <div class="pb-row"><span class="pb-lbl">Build from</span>${seg}</div>""",
"""    <div class="pb-ctl">
      <div class="pb-row pb-amt-row"><label class="pb-lbl" for="pbStake">Bet amount</label><span class="pb-amt"><span aria-hidden="true">$</span><input type="number" id="pbStake" inputmode="decimal" min="${STAKE_MIN}" max="${STAKE_MAX}" step="1" value="${stakeText(pbStake())}" autocomplete="off" aria-describedby="pbStakeHint"></span><span class="pb-amt-hint" id="pbStakeHint">Every tier pays on this amount, and the builder below uses it too.</span></div>
      <div class="pb-row"><span class="pb-lbl">Build from</span>${seg}</div>""")

# its wiring: the payouts as it is typed, the builder a moment later, cleaned on leaving the box
sub1('p3', """  const redraw=sel=>{ renderPb(); const f=sel&&$('pbPanel').querySelector(sel); try{ if(f) f.focus({preventScroll:true}); }catch(e){} };
""",
"""  const redraw=sel=>{ renderPb(); const f=sel&&$('pbPanel').querySelector(sel); try{ if(f) f.focus({preventScroll:true}); }catch(e){} };
  /* the amount: every payout follows it as it is typed and the builder a moment later; leaving
     the box (or Enter) settles it, a bad entry going back to the amount as it was */
  const amt=el.querySelector('#pbStake');
  if(amt){
    amt.addEventListener('input',()=>{ const v=stakeRead(amt.value); if(v==null) return;
      S.stake=v; save(); pbPays(); clearTimeout(PB_AMT_T); PB_AMT_T=setTimeout(pbSyncBuilder,250); });
    amt.addEventListener('change',()=>{ const v=stakeRead(amt.value); if(v!=null) S.stake=v;
      S.stake=pbStake(); amt.value=stakeText(S.stake); save(); pbPays(); clearTimeout(PB_AMT_T); pbSyncBuilder(); });
  }
""")

# ---------------------------------------------------------------- part3: the builder's stake is the same amount
sub1('p3', """/* one tap swaps the amount you are betting in the builder; the suggested parlays are always
   shown on $10 (PB_STAKE), so their tiers compare on one footing */
const STAKE_CHIPS=[1,5,10,20,50,100];
function stakeChips(){ const s=Math.max(0,+S.stake||0);""",
"""/* one tap swaps the amount you are betting in the builder; it is the one amount (S.stake), so the
   panel's Bet amount box and every tier's payout follow it */
const STAKE_CHIPS=[1,5,10,20,50,100];
function stakeChips(){ const s=pbStake();""")
sub1('p3', """function renderParlay(){
  /* a leg from a game that has kicked off can't be bet, so it leaves the working parlay */""",
"""function renderParlay(o){
  /* a leg from a game that has kicked off can't be bet, so it leaves the working parlay */""")
sub1('p3', """  /* the suggested parlays over the builder: its own box, drawn with it */
  renderPb();""",
"""  /* the suggested parlays over the builder: its own box, drawn with it, unless only the amount
     moved (o.keepPb: the panel redraws its payouts in place, and its buttons stay put) */
  if(!(o&&o.keepPb)) renderPb();""")
sub1('p3', """  const fairML=probToAmerican(pr.corr);
  const stake=Math.max(0,+S.stake||0);""",
"""  const fairML=probToAmerican(pr.corr);
  const stake=pbStake();""")
sub1('p3', """<label>Your stake $<input type="number" id="pStake" min="0" step="1" value="${stake}" style="width:110px"></label>""",
"""<label>Your stake $<input type="number" id="pStake" inputmode="decimal" min="${STAKE_MIN}" max="${STAKE_MAX}" step="1" value="${stakeText(stake)}" style="width:110px"></label>""")
sub1('p3', """  $('pStake').addEventListener('change',e=>{ S.stake=Math.max(0,+e.target.value||0); save(); renderParlay(); });""",
"""  /* the builder's stake is the panel's amount: as it is typed the panel's box and payouts follow,
     and the builder on leaving the box; a bad entry leaves the amount as it was */
  $('pStake').addEventListener('input',e=>{ const v=stakeRead(e.target.value); if(v==null) return;
    S.stake=v; save(); const b=$('pbStake'); if(b) b.value=stakeText(v); pbPays(); });
  $('pStake').addEventListener('change',e=>{ const v=stakeRead(e.target.value); if(v!=null) S.stake=v; S.stake=pbStake(); save(); renderParlay(); });""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched part1.html, part2.js, part3.js: app v89')
