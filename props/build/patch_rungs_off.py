"""Threshold ladders default to hidden.

They no longer carry a real price, so a game page was showing thirty-odd rows per
player that cannot be bet and cannot be picked by a suggestion. The model still
builds every rung and the Track Record still grades them -- that is 90% of the
accuracy evidence and none of it depends on the rows being on screen. The checkbox
beside Include backups turns them back on whenever you want the percentages.

The explanatory note goes from always-when-hidden to only-when-it-matters: it now
appears solely if a rung is pinned visible because it is on your parlay, which is
the one case where the page would otherwise look inconsistent.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(J, """/* the ladders are shown unless turned off. A rung already on the parlay stays visible
   whatever the setting, so a leg can never be hidden while it is still counting. */
function showRungs(){ return !(S.ui&&S.ui.hideRungs); }""",
     """/* the ladders are hidden unless turned on: without a real price they cannot be bet
   or picked by a suggestion, and they run to thirty rows a player. The model still
   builds every rung and the Track Record still grades them. A rung already on the
   parlay stays visible whatever the setting, so a leg can never count while hidden. */
function showRungs(){ return !!(S.ui&&S.ui.showRungs); }""")

sub1(J, "  $('rungCb')?.addEventListener('change',e=>{ S.ui.hideRungs=!e.target.checked; save(); renderGame(); });",
     "  $('rungCb')?.addEventListener('change',e=>{ S.ui.showRungs=e.target.checked; save(); renderGame(); });")

# the note only earns its place when a rung is pinned visible by the parlay
sub1(J, """  if(!showRungs()) html+=`<p class="muted" style="margin:-4px 0 12px;font-size:12px">Threshold ladders are hidden. Tick <b>Threshold ladders</b> above to see the chance of clearing each number. Anything already on your parlay stays visible.</p>`;""",
     """  if(!showRungs()&&Object.values(S.parlay||{}).some(l=>l.gid===g.id&&!l.main&&l.stat!=='ml'&&l.stat!=='ats'&&l.stat!=='any_td'))
    html+=`<p class="muted" style="margin:-4px 0 12px;font-size:12px">A threshold leg on your parlay is shown below even though the ladders are hidden, so nothing counts out of sight.</p>`;""")

# ---- audit: the default flipped ----
sub1(A, """    const box=d.getElementById('rungCb');
    chk(!!box&&box.checked,'no threshold ladder toggle, or it does not default to shown');
    const rows=()=>d.querySelectorAll('#gameView tr.rung').length;
    const shown=rows();
    chk(shown>0,'no ladder rows with the toggle on');
    box.checked=false; box.dispatchEvent(new w.Event('change'));
    chk(d.getElementById('rungCb').checked===false,'the toggle did not stay off');
    chk(rows()===0,`ladder rows survived the toggle: ${rows()}`);
    chk(/Threshold ladders are hidden/.test(d.getElementById('gameView').textContent),'hiding the ladders says nothing');""",
     """    const box=d.getElementById('rungCb');
    chk(!!box&&box.checked===false,'no threshold ladder toggle, or it does not default to hidden');
    const rows=()=>d.querySelectorAll('#gameView tr.rung').length;
    chk(rows()===0,`ladder rows showed by default: ${rows()}`);
    box.checked=true; box.dispatchEvent(new w.Event('change'));
    [...d.querySelectorAll('.plrbtn')][0].click();
    chk(d.getElementById('rungCb').checked===true,'the toggle did not stay on');
    const shown=rows();
    chk(shown>0,'turning the ladders on showed no rows');""")

sub1(A, """    /* a rung already on the parlay must stay visible, or a leg could count while hidden */
    let t=d.getElementById('rungCb'); t.checked=true; t.dispatchEvent(new w.Event('change'));
    [...d.querySelectorAll('.plrbtn')][0].click();
    const rung=[...d.querySelectorAll('#gameView tr.rung')].find(tr=>tr.querySelector('input[data-leg]'));""",
     """    /* a rung already on the parlay must stay visible, or a leg could count while hidden */
    let t=d.getElementById('rungCb');
    const rung=[...d.querySelectorAll('#gameView tr.rung')].find(tr=>tr.querySelector('input[data-leg]'));""")

sub1(A, """      chk(rows()===1,`a ticked rung was hidden: ${rows()} rows left`);
      const back=d.querySelector('#gameView tr.rung input[data-leg]');
      chk(!!back&&back.checked,'the surviving rung is not the ticked one');
      if(back) back.click(); }""",
     """      chk(rows()===1,`a ticked rung was hidden: ${rows()} rows left`);
      const back=d.querySelector('#gameView tr.rung input[data-leg]');
      chk(!!back&&back.checked,'the surviving rung is not the ticked one');
      chk(/nothing counts out of sight/.test(d.getElementById('gameView').textContent),'a pinned rung is not explained');
      if(back) back.click();
      chk(!/nothing counts out of sight/.test(d.getElementById('gameView').textContent),'the note outstayed the pinned rung'); }""")

sub1(A, """    t=d.getElementById('rungCb'); t.checked=true; t.dispatchEvent(new w.Event('change'));
    [...d.querySelectorAll('.plrbtn')][0].click();
    chk(rows()===shown,`turning the ladders back on restored ${rows()} of ${shown} rows`);
    console.log(`S. ladder toggle: ${shown} rows for an open player, 0 when off, ${built} rungs still built either way`); }""",
     """    t=d.getElementById('rungCb'); t.checked=true; t.dispatchEvent(new w.Event('change'));
    [...d.querySelectorAll('.plrbtn')][0].click();
    chk(rows()===shown,`turning the ladders back on restored ${rows()} of ${shown} rows`);
    t=d.getElementById('rungCb'); t.checked=false; t.dispatchEvent(new w.Event('change'));
    console.log(`S. ladder toggle: hidden by default, ${shown} rows when turned on, ${built} rungs built either way`); }""")

print('threshold ladders now hidden by default')
