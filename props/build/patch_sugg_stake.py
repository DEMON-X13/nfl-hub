"""Suggested parlay goes above the game bets, and the suggestions get a bet box.

On a game page the suggestion is the summary and the game bets table is the detail,
so the summary should come first.

In the Parlay Builder, the suggested payouts were already worked out from the
builder's stake, but there was nowhere to set it unless you had already ticked a
leg: with an empty builder the page shows "Nothing picked yet" and no stake input,
so the payouts sat on the default $20 with no way to change them. The Suggested
parlays header now carries its own bet box, bound to the same stake the builder
uses, so the two can never disagree.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
H = HERE / 'part1.html'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- 1. suggestion first, game bets under it ----
sub1(J, "  html+=gameBetsCard(g,locked);\n  html+=gameSuggestCard(g,locked);",
     "  html+=gameSuggestCard(g,locked);\n  html+=gameBetsCard(g,locked);")
# a class to hang the ordering check on
sub1(J, '  return `<div class="card"><h2>Game bets</h2>', '  return `<div class="card gbets"><h2>Game bets</h2>')

# ---- 2. a bet box on the Suggested parlays header ----
sub1(J, """  return `<div class="card sugg${open?'':' min'}" id="suggCard">
    <div class="sugg-hd"><h2>Suggested parlays</h2><span class="pill">week ${w}</span><span class="grow"></span>
      <button class="btn quiet" id="suggToggle" aria-expanded="${open}">${open?'Minimize':'Show'}</button></div>""",
     """  return `<div class="card sugg${open?'':' min'}" id="suggCard">
    <div class="sugg-hd"><h2>Suggested parlays</h2><span class="pill">week ${w}</span><span class="grow"></span>
      ${open?`<label class="muted sugg-stake">Bet $<input type="number" id="suggStake" value="${stake}" min="0" step="1" inputmode="decimal" aria-label="Amount to bet on a suggested parlay"></label>`:''}
      <button class="btn quiet" id="suggToggle" aria-expanded="${open}">${open?'Minimize':'Show'}</button></div>""")

sub1(J, "  $('suggToggle')?.addEventListener('click',()=>{ S.ui.suggestMin=!S.ui.suggestMin; save(); renderParlay(); });",
     """  $('suggToggle')?.addEventListener('click',()=>{ S.ui.suggestMin=!S.ui.suggestMin; save(); renderParlay(); });
  /* the same stake the builder uses, so a payout here and a payout there agree */
  $('suggStake')?.addEventListener('change',e=>{ S.stake=Math.max(0,+e.target.value||0); save(); renderParlay(); });""")

# the copy pointed at a box that was not always on the page
sub1(J, "Payouts use your builder stake of $${stake.toFixed(2)}.",
     "Payouts are on a $${stake.toFixed(2)} bet, which you can change above.")

# ---- 3. style ----
sub1(H, ".gsugg .gsugg-hd{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}",
     """.sugg-stake{display:inline-flex;align-items:center;gap:4px;font-size:13px;white-space:nowrap}
.sugg-stake input{width:76px;padding:6px 8px;font-family:var(--display);font-variant-numeric:tabular-nums}
.gsugg .gsugg-hd{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}""")

# ---- 4. audit ----
sub1(A, "    console.log(`O. game suggestion:",
     """    /* the suggestion is the summary, the game bets table is the detail */
    { const cards=[...d.querySelectorAll('#gameBody .card')];
      const iS=cards.findIndex(c=>c.classList.contains('gsugg')), iB=cards.findIndex(c=>c.classList.contains('gbets'));
      chk(iS>=0&&iB>=0&&iS<iB,'the suggested parlay is not above the game bets'); }
    console.log(`O. game suggestion:""")

sub1(A, "  /* ---- L. record chips beside the week dropdown ---- */",
     """  /* ---- P. the bet box on the suggested parlays ---- */
  { d.querySelector('#tabs button[data-tab="parlay"]').click();
    const box=d.getElementById('suggStake');
    chk(!!box,'no bet box on the suggested parlays');
    if(box){
      const was=S.stake;
      chk(+box.value===+S.stake,'the bet box does not show the stake in use');
      box.value='55'; box.dispatchEvent(new w.Event('change'));
      chk(S.stake===55,'changing the bet box did not change the stake');
      const s=F('getSuggestions')();
      if(s.tiers.length){ const t=s.tiers[0];
        chk(d.getElementById('suggCard').textContent.replace(/\\s+/g,' ').includes(`$${(55*t.dec).toFixed(2)}`),
          'the payout did not follow the bet box'); }
      chk(+d.getElementById('suggStake').value===55,'the bet box lost its value on re-render');
      /* the builder's own stake input is the same number */
      const pS=d.getElementById('pStake'); if(pS) chk(+pS.value===55,'the builder and the suggestions disagree on the stake');
      box.value=String(was); box.dispatchEvent(new w.Event('change'));
      chk(S.stake===was,'the stake did not go back');
    }
    console.log('P. bet box: drives the suggested payouts and shares the builder stake'); }

  /* ---- L. record chips beside the week dropdown ---- */""")

print('suggestion moved above the game bets; bet box added to the suggestions')
