"""The game page's suggested legs become clickable.

They were read-only: you saw the parlay, then had to find each line again in the
tables below and tick it. Each leg is now a checkbox carrying the same data-leg,
data-k, data-side and data-main attributes the game bets and stat rungs use, so
the handler already bound over #gameView picks them up and toggleLeg does the rest
-- no new toggle path, and the tick below stays in step with the tick above.

An Add all button in the header does the whole parlay in one click, skipping any
leg already on so it never toggles one back off.
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


# ---- the legs, as checkboxes ----
sub1(J, """    <ul class="gsugg-legs">${s.legs.map(l=>`<li><span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span><span class="pr">${fmtML(l.price)}<em>${(l.p*100).toFixed(0)}%</em></span></li>`).join('')}</ul>
    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. Tick the lines yourself in the Parlay Builder to stake it.</p></div>`;""",
     """    <ul class="gsugg-legs">${s.legs.map(l=>{
      const cur=S.parlay[l.key], on=!!cur&&cur.k===l.k&&cur.side===l.side&&!!cur.main===!!l.main;
      return `<li><label class="gsugg-pick${on?' on':''}">
        <input type="checkbox" ${on?'checked':''} data-leg="${l.key}" data-k="${l.k}" data-side="${l.side}"${l.main?' data-main="1"':''} aria-label="Add ${esc(l.name)}, ${esc(l.label)}, to the parlay">
        <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span>
        <span class="pr">${fmtML(l.price)}<em>${(l.p*100).toFixed(0)}%</em></span></label></li>`;}).join('')}</ul>
    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. Tick a leg to put it on the parlay.</p></div>`;""")

# ---- Add all, in the header ----
sub1(J, """      <h2>Suggested parlay</h2><span class="conf med">Medium</span><span class="grow"></span>
      <span class="gsugg-nums">""",
     """      <h2>Suggested parlay</h2><span class="conf med">Medium</span><span class="grow"></span>
      <button class="btn quiet gsugg-all" data-suggest-all="${g.id}">${s.legs.every(l=>{const c=S.parlay[l.key];return !!c&&c.k===l.k&&c.side===l.side&&!!c.main===!!l.main;})?'On the parlay':'Add all'}</button>
      <span class="gsugg-nums">""")

sub1(J, """  $('gameView').querySelectorAll('[data-leg]').forEach(cb=>cb.addEventListener('change',e=>{
    e.stopPropagation();
    toggleLeg(cb.dataset.leg, +cb.dataset.k, g, cb.dataset.side||'over', cb.dataset.main==='1'); }));""",
     """  $('gameView').querySelectorAll('[data-leg]').forEach(cb=>cb.addEventListener('change',e=>{
    e.stopPropagation();
    toggleLeg(cb.dataset.leg, +cb.dataset.k, g, cb.dataset.side||'over', cb.dataset.main==='1'); }));
  /* the whole suggestion at once, skipping any leg already on so it cannot toggle one off */
  $('gameView').querySelector('[data-suggest-all]')?.addEventListener('click',()=>{
    for(const l of gameSuggestion(g).legs){
      const cur=S.parlay[l.key];
      if(cur&&cur.k===l.k&&cur.side===l.side&&!!cur.main===!!l.main) continue;
      toggleLeg(l.key,l.k,g,l.side,l.main);
    }
  });""")

# ---- style ----
sub1(H, ".gsugg-legs li{display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px}",
     """.gsugg-legs li{border-bottom:1px solid var(--line);font-size:14px}
.gsugg-pick{display:flex;align-items:baseline;gap:10px;padding:7px 6px;margin:0 -6px;cursor:pointer;border-radius:var(--r-sm)}
.gsugg-pick:hover{background:var(--panel)}
.gsugg-pick.on{background:var(--pick-soft)}
.gsugg-pick input{margin:0;flex:none;align-self:center;cursor:pointer}
.gsugg-all{padding:5px 11px;font-size:12px}""")

# ---- audit ----
sub1(A, "    S.odds[g.id]=keepOdds; if(!Object.keys(keepOdds).length) delete S.odds[g.id];",
     """    /* the legs are clickable, and share the toggle the tables below use */
    if(s2.legs.length){
      const keepParlay=JSON.parse(JSON.stringify(S.parlay||{}));
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      const boxes=[...d.querySelectorAll('.gsugg-legs input[data-leg]')];
      chk(boxes.length===s2.legs.length,'the suggested legs are not all tickable');
      chk(boxes.every(b=>b.dataset.k!==undefined&&b.dataset.side),'a suggested leg is missing its threshold or side');
      chk(boxes.every(b=>!b.checked),'a suggested leg looks ticked with an empty parlay');
      boxes[0].click();
      chk(Object.keys(S.parlay).length===1,'ticking a suggested leg did not put it on the parlay');
      const first=s2.legs[0], put=S.parlay[first.key];
      chk(!!put&&put.k===first.k&&put.side===first.side,'the leg on the parlay is not the leg that was shown');
      chk(d.querySelector('.gsugg-legs input[data-leg]').checked,'the tick did not survive the re-render');
      chk(!!d.querySelector('.gsugg-pick.on'),'a ticked leg is not marked as on');
      d.querySelector('.gsugg-legs input[data-leg]').click();
      chk(Object.keys(S.parlay).length===0,'ticking a suggested leg again did not take it off');
      /* Add all, twice: the second press must not undo the first */
      d.querySelector('[data-suggest-all]').click();
      chk(Object.keys(S.parlay).length===s2.legs.length,'Add all did not add every leg');
      d.querySelector('[data-suggest-all]').click();
      chk(Object.keys(S.parlay).length===s2.legs.length,'Add all pressed twice toggled legs back off');
      chk(/On the parlay/.test(d.querySelector('[data-suggest-all]').textContent),'the button does not say the parlay is already on');
      S.parlay=keepParlay;
    }
    S.odds[g.id]=keepOdds; if(!Object.keys(keepOdds).length) delete S.odds[g.id];""")

print('suggested legs are clickable, with Add all')
