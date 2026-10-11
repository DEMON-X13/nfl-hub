"""app v92: a game's side and its total can share a suggested parlay.

The suggested parlays allowed one game bet a game, so a team to win (or to cover) and the same
game's total over or under could never both be on a tier. The owner picked three afternoon games
under Teams only and asked why the bigger levels could not fill: a book takes a win and the total
of one game together on one ticket, so three games are up to six legs, not three.

Now a game gives one side, to win or to cover (the two are still never together: they are the
same question asked twice, 0.75 to 0.95 related), and its total. pbFits lets a total join a parlay
that already has a side of its game and the other way round; pbMaxLegs counts a game's side and
its total apart. The two are priced as unrelated, which is what was measured (a cover moves with
the total 0.05, a win 0.01, on 2010-2025, legRho), so their chance is the plain product, and
parlayDec prices them together as a book prices a same-game ticket, with its cut. The totals are
still the last fill (pbTier, v91): a side with an edge comes first, a total only where the legs
with an edge cannot make the level. On the owner's three games this week (DEN @ LAC, DET @ ARI,
SF @ SEA, Teams only) the model backs one side, Seattle's cover, so the picks now make four legs
(that side and the three totals), enough for Aggressive; Extreme needs a fifth and says so.

The audit's M and the page smoke hold a tier to one side and one total a game (no longer one game
leg), and Teams only on one game to at most two legs, a side and its total. Every edit is made in
memory and asserted to match exactly once; nothing is written unless all of them land, and a second
run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
FILES = {k: p for k, p in (('p2', HERE / 'part2.js'), ('p3', HERE / 'part3.js'), ('audit', HERE / 'audit.js'),
                           ('smoke', ROOT / 'nflbets' / 'build' / 'smoke.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'one side and one total a game' not in T['p3'], 'patch_pb_side_total.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v91 \\u00b7 2026-10-11';", "const APP_BUILD='app v92 \\u00b7 2026-10-11';")
sub1('p3', """At most one team bet
   (to win or to cover) a game, one leg a player,""", """At most one side
   (to win or to cover) and one total a game, one leg a player,""")
sub1('p3', """/* a leg that can join: not a line already on it, not a second game leg on one game, and not a
   second leg on one player (two lines on one man, his catches and his yards, are nearly one bet) */
function pbFits(cur,c){
  if(cur.some(l=>l.key===c.key)) return false;
  if(isGameLeg(c)) return !cur.some(l=>isGameLeg(l)&&l.gid===c.gid);""",
"""/* a leg that can join: not a line already on it, not a second side (to win or to cover) on one
   game, and not a second leg on one player (two lines on one man, his catches and his yards, are
   nearly one bet). A game's total is a bet of its own beside its side, as a book takes them on one
   ticket (the two are unrelated, legRho); its over and under are one key, so one total a game */
function pbFits(cur,c){
  if(cur.some(l=>l.key===c.key)) return false;
  if(isGameLeg(c)) return !cur.some(l=>isGameLeg(l)&&l.gid===c.gid&&(l.stat==='total')===(c.stat==='total'));""")
sub1('p3', """/* the most legs a list can make together: one a player, one game leg a game */
function pbMaxLegs(list){ const pl=new Set(), games=new Set(); for(const l of list){ if(isGameLeg(l)) games.add(l.gid); else pl.add(l.pid); } return pl.size+games.size; }""",
"""/* the most legs a list can make together: one a player, one side and one total a game */
function pbMaxLegs(list){ const pl=new Set(), games=new Set(); for(const l of list){ if(isGameLeg(l)) games.add(l.gid+(l.stat==='total'?'|total':'|side')); else pl.add(l.pid); } return pl.size+games.size; }""")
sub1('p3', """(one a player,
   one team bet a game), since every level""", """(one a player,
   one side and one total a game), since every level""")
sub1('p3', "One leg a player, one team bet a game; legs in one game are priced together, as a book prices them.",
     "One leg a player; a game gives one side, to win or to cover, and its total; legs in one game are priced together, as a book prices them.")

# ---- the audit ----
sub1('audit', """       (different games, or one team bet a game), every parlay's chance is a plain product and""",
     """       (different games, or a game's side and its total), every parlay's chance is a plain product and""")
sub1('audit', """        chk(new Set(gl.map(l=>l.gid)).size===gl.length,`${lab}: the ${t.id} tier has two game bets on one game`);""",
"""        const sides=gl.filter(l=>l.stat!=='total'), tots=gl.filter(l=>l.stat==='total');
        chk(new Set(sides.map(l=>l.gid)).size===sides.length&&new Set(tots.map(l=>l.gid)).size===tots.length,`${lab}: the ${t.id} tier has two sides, or two totals, on one game`);""")
sub1('audit', """       its size (one team bet a game, so every parlay is a plain product) */""",
     """       its size (a game's side and its total are unrelated, so every parlay is a plain product) */""")
sub1('audit', """      /* Teams only on one game: one game bet a game makes one leg, so every tier says there are too few */
      d.querySelector('#pbPanel [data-pb-mix="teams"]').click();
      const r1=hold('one game, teams only');
      chk(r1.tiers.every(t=>!t.legs&&/^(Only 1 leg|No legs) on your picks: tick more games or bet types\\.$/.test(t.why)),'one game\\'s team bets did not leave every tier saying there are too few legs: '+r1.tiers.map(t=>t.why).join(' / '));""",
"""      /* Teams only on one game: a side and its total make two legs at most, so Safe is that pair or
         says why, and every bigger level says there are too few */
      d.querySelector('#pbPanel [data-pb-mix="teams"]').click();
      const r1=hold('one game, teams only');
      chk(r1.tiers.every(t=>t.n===2&&t.legs?t.legs.filter(l=>l.stat==='total').length===1&&t.legs.filter(l=>l.stat!=='total').length===1:(!t.legs&&/^(Only [12] legs?|No legs) on your picks: tick more games or bet types\\.$/.test(t.why))),'one game\\'s team bets did not make at most a side and its total, or a level too big for them did not say there are too few legs: '+r1.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));""")
sub1('audit', """      /* All on one game: its team bets make one leg (one game bet a game), so no tier can be built,
         and each says both why: too few legs, and no player prices yet */
      U().off=games.slice(1).map(g=>g.id); w.eval('PB_CACHE=new Map()'); const r1=hold('no player prices, all, one game');
      chk(r1.tiers.every(t=>!t.legs&&/^(Only 1 leg|No legs) on your picks, and /.test(t.why)&&t.why.endsWith(', and '+noPlLow)),""",
"""      /* All on one game: its team bets make two legs at most (a side and its total), so only Safe
         can be built, and every bigger level says both why: too few legs, and no player prices yet */
      U().off=games.slice(1).map(g=>g.id); w.eval('PB_CACHE=new Map()'); const r1=hold('no player prices, all, one game');
      chk(r1.tiers.every(t=>t.n===2&&t.legs?t.legs.every(isG):(!t.legs&&/^(Only [12] legs?|No legs) on your picks, and /.test(t.why)&&t.why.endsWith(', and '+noPlLow))),""")

# ---- the page smoke ----
sub1('smoke', """     (different games, or one team bet a game), every parlay's chance is a plain product, so every""",
     """     (different games, or a game's side and its total), every parlay's chance is a plain product, so every""")
sub1('smoke', """    /* the legs the picks make, and the most a parlay can take of them (one a player, one team bet a game) */""",
     """    /* the legs the picks make, and the most a parlay can take of them (one a player, one side and one total a game) */""")
sub1('smoke', """        chk(new Set(t.legs.filter(isG).map(l => l.gid)).size === t.legs.filter(isG).length && new Set(t.legs.filter(l => !isG(l)).map(l => l.pid)).size === t.legs.filter(l => !isG(l)).length,
          `${lab}: the ${t.id} tier has two game bets on one game, or two legs on one player`);""",
"""        { const sd = t.legs.filter(l => isG(l) && l.stat !== 'total'), tt = t.legs.filter(l => l.stat === 'total'), pl = t.legs.filter(l => !isG(l));
          chk(new Set(sd.map(l => l.gid)).size === sd.length && new Set(tt.map(l => l.gid)).size === tt.length && new Set(pl.map(l => l.pid)).size === pl.length,
            `${lab}: the ${t.id} tier has two sides or two totals on one game, or two legs on one player`); }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v92, a game gives one side and its total; audit M and smoke follow')
