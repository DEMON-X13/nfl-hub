r"""app v114: a player's, a team's or a game's name on a leg opens the hub's matchup bubble.

The owner, 17 October 2026: "in the parlay builder, when i click on a player or a team, bring up a bubble pop up
where it shows their matchup for the day so i can see info at a glance."

Where a leg's name is drawn on the Parlay Builder tab and on Suggested Parlays -- a row of the Top 50 lines
(pbTopRow), a leg of the builder (renderParlay) and a leg on a level's card (pbTierCard: a Suggested Parlays set's
levels and the Elo picks') -- the name is, on the hub's page, a button the matchup bubble answers: data-glance
"p:<pid>" for a player's line, "t:<ABBR>" for a team's moneyline or spread, "g:<gid>" for a game total, with the
leg's game in data-glance-game, the leg itself in data-glance-leg (its signature: the key, side, line, the price
the row shows and its source, and the model's chance), aria-haspopup="dialog" and a name that says what it opens
("Bo Nix: his matchup", "Bills: the team's matchup", "Bills at Rams: the game's matchup"). The bubble is the
hub's own (nflbets/build/glance.js, window.hubGlance): the parts only ask whether it is on the page when they draw
a name, so the prop model's own page, which the audit boots, draws the name as plain text exactly as before, and
nothing else on any row moves. The button looks like the name: no chrome, a dotted underline to show it opens
something, its tap target 44px tall from padding the negative margin takes back out of the line (glance.js's
styles).

Each leg a name is drawn for is kept as the row drew it (GLANCE_LEGS: outside S, never saved, keyed by its
signature, the last 600), so the bubble shows that leg's line, price, the model's chance, the book's fair chance
and market + form as the row has them (window.glanceLeg). The builder's row hands its own price (legPrice), as it
shows it; every other row shows the leg's own.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function glanceName(' not in T['p3'], 'patch_glance.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v113 \\u00b7 2026-10-17';", "const APP_BUILD='app v114 \\u00b7 2026-10-17';", 'APP_BUILD')

# ---------------------------------------------------------------- the name, as a button where the bubble is on the page
sub1('p3', """/* a locked level the page or the job built again for a player ruled out after the lock */
function spUpdLine(u){""",
     """/* (app v114) a leg's player, team or game, as the hub's matchup bubble opens it (the owner's "when i click on a
   player or a team, bring up a bubble pop up where it shows their matchup for the day"): on the hub's page
   (window.hubGlance, nflbets/build/glance.js) a button the bubble answers, data-glance p:<pid>, t:<ABBR> (a
   moneyline or spread) or g:<gid> (a game total), the leg's game and its signature beside it; on the prop model's
   own page the name as plain text, as before. The leg is kept as the row drew it (shown: the price the row shows,
   where it is not the leg's own), outside S and never saved, so the bubble shows the row's own numbers */
const GLANCE_LEGS=new Map();
function glanceName(l,shown){
  const nm=esc(l.name);
  if(typeof window.hubGlance!=='function') return nm;
  const kind=l.stat==='total'?'g':isGameLeg(l)?'t':'p';
  const id=kind==='g'?l.gid:kind==='t'?(l.team||String(l.pid||'').replace(/^team:/,'')):l.pid;
  const price=shown&&shown.ml!=null?shown.ml:l.price, src=shown&&shown.src?shown.src:l.src;
  const sig=[l.key,l.side,l.k,price,src,l.p!=null&&isFinite(l.p)?(+l.p).toFixed(4):''].join('|');
  GLANCE_LEGS.delete(sig); GLANCE_LEGS.set(sig,{leg:l,price,src});
  if(GLANCE_LEGS.size>600) GLANCE_LEGS.delete(GLANCE_LEGS.keys().next().value);
  const what=kind==='p'?'his matchup':kind==='t'?'the team’s matchup':'the game’s matchup';
  return `<button type="button" class="glance-name" data-glance="${kind}:${esc(id)}" data-glance-game="${esc(l.gid)}" data-glance-leg="${esc(sig)}" aria-haspopup="dialog" aria-label="${nm}: ${what}">${nm}</button>`;
}
window.glanceLeg=sig=>GLANCE_LEGS.get(String(sig))||null;
/* a locked level the page or the job built again for a player ruled out after the lock */
function spUpdLine(u){""", 'glanceName')
sub1('p3', """    <ul class="pb-legs">${t.legs.map(l=>{ const ff=legFarOff(l,fm); return `<li><span class="nm">${o.badge?o.badge(l):''}${esc(l.name)}<small>""",
     """    <ul class="pb-legs">${t.legs.map(l=>{ const ff=legFarOff(l,fm); return `<li><span class="nm">${o.badge?o.badge(l):''}${glanceName(l)}<small>""",
     "a level card's names")
sub1('p3', """    <span class="nm">${esc(l.name)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">""",
     """    <span class="nm">${glanceName(l)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">""",
     "the Top 50 rows' names")
sub1('p3', """    html+=`<tr class="legrow"><td class="plr">${esc(l.name)}${l.grp==='TEAM'?'':injChip(l.pid)}<small>""",
     """    html+=`<tr class="legrow"><td class="plr">${glanceName(l,prices[i])}${l.grp==='TEAM'?'':injChip(l.pid)}<small>""",
     "the builder's names")
for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print("patched: app v114, a leg's name opens the hub's matchup bubble")
