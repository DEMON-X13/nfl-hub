"""A toggle for the threshold ladders.

The pull no longer buys ladder prices, so every rung now carries the model's own
estimate. The rungs are still the model's main output and 90% of what the Track
Record grades, so they stay on the page, but a game with fifteen players and a
ladder each is a lot to scroll past when the main lines are what carry a real
price. The checkbox sits beside "Include backups" and remembers itself, on by
default so nothing disappears on anyone without them asking.

It hides rows only. statLines still builds every rung, the Track Record still
freezes and grades them, and a rung already ticked onto a parlay stays ticked.
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


# ---- the control, next to Include backups ----
sub1(J, """    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
  </div>`;""",
     """    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
    <label class="muted"><input type="checkbox" id="rungCb" ${showRungs()?'checked':''}> Threshold ladders</label>
  </div>`;""")

sub1(J, "  $('gameView').querySelectorAll('[data-leg]').forEach(cb=>cb.addEventListener('change',e=>{",
     """  $('rungCb')?.addEventListener('change',e=>{ S.ui.hideRungs=!e.target.checked; save(); renderGame(); });
  $('gameView').querySelectorAll('[data-leg]').forEach(cb=>cb.addEventListener('change',e=>{""")

# ---- the helper, and the rows it governs ----
sub1(J, "function renderGame(){",
     """/* the ladders are shown unless turned off. A rung already on the parlay stays visible
   whatever the setting, so a leg can never be hidden while it is still counting. */
function showRungs(){ return !(S.ui&&S.ui.hideRungs); }
function renderGame(){""")

sub1(J, """        for(const r of l.rungs){
          const [c,lbl]=confTier(r.p);
          const on=cur&&!cur.main&&cur.k===r.k;""",
     """        for(const r of l.rungs){
          const [c,lbl]=confTier(r.p);
          const on=cur&&!cur.main&&cur.k===r.k;
          if(!showRungs()&&!on) continue;""")

# ---- a note where the ladder used to be, so it is not a silent gap ----
sub1(J, """  html+=gameSuggestCard(g,locked);
  html+=gameBetsCard(g,locked);""",
     """  html+=gameSuggestCard(g,locked);
  html+=gameBetsCard(g,locked);
  if(!showRungs()) html+=`<p class="muted" style="margin:-4px 0 12px;font-size:12px">Threshold ladders are hidden. Tick <b>Threshold ladders</b> above to see the chance of clearing each number. Anything already on your parlay stays visible.</p>`;""")

# ---- audit ----
sub1(A, "  /* ---- R. baked prices follow the build, and the tiers price like a book ---- */",
     """  /* ---- S. the threshold ladder toggle ---- */
  { const g=openUpcoming();
    const box=d.getElementById('rungCb');
    chk(!!box,'no threshold ladder toggle on the game page');
    const rows=()=>[...d.querySelectorAll('#gameView .thr')].length;
    chk(box.checked,'the ladders do not default to shown');
    const shown=rows();
    chk(shown>0,'no ladder rows with the toggle on');
    box.checked=false; box.dispatchEvent(new w.Event('change'));
    chk(d.getElementById('rungCb').checked===false,'the toggle did not stay off');
    chk(rows()===0,`ladder rows survived the toggle: ${rows()}`);
    chk(/Threshold ladders are hidden/.test(d.getElementById('gameView').textContent),'hiding the ladders says nothing');
    /* a rung already on the parlay must stay visible, or a leg could count while hidden */
    d.getElementById('rungCb').checked=true; d.getElementById('rungCb').dispatchEvent(new w.Event('change'));
    const rung=[...d.querySelectorAll('#gameView tr')].find(tr=>tr.querySelector('.thr')&&tr.querySelector('input[data-leg]'));
    if(rung){ const cb2=rung.querySelector('input[data-leg]'); cb2.click();
      d.getElementById('rungCb').checked=false; d.getElementById('rungCb').dispatchEvent(new w.Event('change'));
      chk(rows()===1,`a ticked rung was hidden: ${rows()} rows left`);
      const back=[...d.querySelectorAll('#gameView tr')].find(tr=>tr.querySelector('.thr'));
      chk(!!back&&back.querySelector('input[data-leg]').checked,'the surviving rung is not the ticked one');
      back.querySelector('input[data-leg]').click(); }
    /* the model still builds every rung: hiding is a display choice, not a data one */
    const roster=rosterFor(g,false); let built=0;
    for(const tm in roster) for(const x of roster[tm].players) for(const l of statLines(x)) built+=(l.rungs||[]).length;
    chk(built>0,'statLines stopped building rungs when they were hidden');
    d.getElementById('rungCb').checked=true; d.getElementById('rungCb').dispatchEvent(new w.Event('change'));
    chk(rows()===shown,'turning the ladders back on did not restore every row');
    console.log(`S. ladder toggle: ${shown} rows shown, 0 hidden, ${built} rungs still built either way`); }

  /* ---- R. baked prices follow the build, and the tiers price like a book ---- */""")

print('threshold ladder toggle added')
