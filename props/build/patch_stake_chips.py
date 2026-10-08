"""app v79: one tap swaps the amount you are betting.

The builder had a stake box and nothing else, set to $20 for a new visitor, while the owner's
tickets are a dollar or five. Changing it meant clearing the box and typing, and on a phone the
number only took when the box lost focus. Beside the box in What it pays, and beside the Bet box
in the Suggested parlays window, there is now a row of amounts, $1 $5 $10 $20 $50 $100: a tap
sets the stake, and every payout on the tab is redrawn from it, the builder's and the
suggestions' alike, because both price with the one S.stake. The amount in use is shown pressed;
a typed amount that is none of them leaves all six unpressed. The box stays for anything else.

A saved parlay keeps the stake it was saved with. Changing that one is the Live Parlays
section's job, where the saved parlays are shown (liveparlays/build/page.html).

The audit taps $5 in the builder and checks the stake, both boxes and the payout follow, taps
$1 in the window and checks the same there, and puts the stake back.

Every edit is made in memory and asserted to match exactly once; nothing is written unless
all of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v78 \\u00b7 2026-10-06';", "const APP_BUILD='app v79 \\u00b7 2026-10-08';")

# the row of amounts wears the same segmented look as the side switch beside it
sub1('p1', ".sugg-side{display:inline-flex;", ".sugg-side,.stake-chips{display:inline-flex;")
sub1('p1', ".sugg-side button{background:var(--panel);", ".sugg-side button,.stake-chips button{background:var(--panel);")
sub1('p1', ".sugg-side button:first-child{border-left:0}", ".sugg-side button:first-child,.stake-chips button:first-child{border-left:0}")
sub1('p1', ".sugg-side button.on{background:linear-gradient(180deg,#1A2B45,#0F1B2D);color:#fff}",
     ".sugg-side button.on,.stake-chips button.on{background:linear-gradient(180deg,#1A2B45,#0F1B2D);color:#fff}\n"
     ".stake-chips button{font-variant-numeric:tabular-nums;padding:7px 10px}")

# the builder: the amounts sit right after the stake box
sub1('p3', """      <label>Your stake $<input type="number" id="pStake" min="0" step="1" value="${stake}" style="width:110px"></label>
""", """      <label>Your stake $<input type="number" id="pStake" min="0" step="1" value="${stake}" style="width:110px"></label>
      ${stakeChips()}
""")
# the suggestions window: after its Bet box
sub1('p3', """      <label class="muted sugg-stake">Bet $<input type="number" id="suggStake" value="${stake}" min="0" step="1" inputmode="decimal" aria-label="Amount to bet on a suggested parlay"></label>
""", """      <label class="muted sugg-stake">Bet $<input type="number" id="suggStake" value="${stake}" min="0" step="1" inputmode="decimal" aria-label="Amount to bet on a suggested parlay"></label>
      ${stakeChips()}
""")
# the helper and its wiring, beside the window's own wiring. wireSuggest runs after every
# draw of the builder and of the window, so a button is wired once, the first time it is seen.
sub1('p3', """function wireSuggest(){
  $('suggClose')?.addEventListener('click',closeSuggest);""", """/* one tap swaps the amount you are betting. It is the one stake the builder and the
   suggestions both price with, so every payout on the tab follows it. */
const STAKE_CHIPS=[1,5,10,20,50,100];
function stakeChips(){ const s=Math.max(0,+S.stake||0);
  return `<span class="stake-chips" role="group" aria-label="Amount to bet">${STAKE_CHIPS.map(v=>`<button type="button" class="${s===v?'on':''}" data-stake-chip="${v}" aria-pressed="${s===v}">$${v}</button>`).join('')}</span>`; }
function wireStakeChips(){
  document.querySelectorAll('[data-stake-chip]').forEach(b=>{ if(b.dataset.wired) return; b.dataset.wired='1';
    b.addEventListener('click',()=>{ S.stake=+b.dataset.stakeChip; save(); renderParlay(); if(suggestOpen()) fillSuggest(); }); });
}
function wireSuggest(){
  wireStakeChips();
  $('suggClose')?.addEventListener('click',closeSuggest);""")

# the audit: tap the amounts in both places
sub1('audit', """      box.value=String(was); box.dispatchEvent(new w.Event('change'));
      chk(S.stake===was,'the stake did not go back');
    }
    console.log('P. bet box: drives the suggested payouts and shares the builder stake'); }""",
"""      box.value=String(was); box.dispatchEvent(new w.Event('change'));
      chk(S.stake===was,'the stake did not go back');
      /* one tap on an amount in the window: the stake, the box and the pressed chip follow */
      const chip1=d.querySelector('#suggView [data-stake-chip="1"]');
      chk(!!chip1,'no amount buttons in the suggested parlays window');
      if(chip1){ chip1.click();
        chk(S.stake===1&&+d.getElementById('suggStake').value===1,'tapping $1 in the window did not set the stake');
        const on=[...d.querySelectorAll('#suggView [data-stake-chip].on')];
        chk(on.length===1&&on[0].dataset.stakeChip==='1','the window does not show $1 pressed, and only $1');
        const s1=F('getSuggestions')();
        if(s1.tiers.length) chk(d.getElementById('suggCard').textContent.replace(/\\s+/g,' ').includes(`$${(1*s1.tiers[0].dec).toFixed(2)}`),'the payout did not follow the $1 tap'); }
      d.getElementById('suggClose').click();
      /* and in the builder, with a leg in it so What it pays is drawn */
      const keep=JSON.stringify(S.parlay||{}); S.parlay={};
      openUpcoming();
      const tick=d.querySelector('#gameView input[data-leg]');
      chk(!!tick,'no leg to tick on the coming game');
      if(tick){ tick.click(); d.querySelector('#tabs button[data-tab="parlay"]').click();
        const chip5=d.querySelector('#parlayBody [data-stake-chip="5"]');
        chk(!!chip5,'no amount buttons beside the stake in What it pays');
        if(chip5){ chip5.click();
          chk(S.stake===5&&+d.getElementById('pStake').value===5,'tapping $5 in the builder did not set the stake');
          chk(d.querySelector('#parlayBody [data-stake-chip="5"]').classList.contains('on')&&d.querySelectorAll('#parlayBody [data-stake-chip].on').length===1,'the builder does not show $5 pressed, and only $5');
          chk(/\\$\\d+\\.\\d\\d/.test(d.querySelector('#parlayBody .payout').textContent)&&+d.querySelector('#parlayBody .payout').textContent.replace(/[^\\d.]/g,'')>5,'the builder payout did not redraw from the $5 stake'); }
        /* a typed amount that is none of them presses none */
        const pS=d.getElementById('pStake'); pS.value='7'; pS.dispatchEvent(new w.Event('change'));
        chk(S.stake===7&&!d.querySelector('#parlayBody [data-stake-chip].on'),'a typed $7 left a chip pressed');
        S.parlay=JSON.parse(keep); }
      S.stake=was; F('save')(); F('renderParlay')();
      chk(S.stake===was,'the stake did not go back after the amount buttons');
    }
    console.log('P. bet box: drives the suggested payouts and shares the builder stake; the amount buttons set it in one tap'); }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v79, stake chips in the builder and the suggestions window, audit P extended')
