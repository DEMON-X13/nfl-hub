"""app v87: the suggested parlays say what a thin edge is for each kind of leg, and say when the
reason a tier is empty is that no player prices are on file yet.

Two things the v86 panel (patch_parlay_panel.py) said that were not quite so:

  * The line under a tier with a thin leg read "the model rates it at or above the book's price,
    but not 3 points above with market + form agreeing" whatever the leg was. Market + form is a
    player leg's second price (the book's chance moved by his Elo); a moneyline, a spread or a
    total has none, so a thin team leg is thin only for missing the 3-point bar. The line is now
    worded per kind (pbThinLine): a team bet or a total "not 3 points above", a player leg "not 3
    points above with market + form agreeing" (where the Elo tab is on the page; without it, as
    on the prop model's own page, the bar alone), and a tier with both names each.
  * With Players only before the week's player prices are pulled, every tier said "No legs on
    your picks: tick more games or bet types", though no tick could help: there was nothing
    priced to build from. pbPool now counts the ticked games with any player price on file
    (plGames, before any rule is applied), and when player bets are ticked and that count is 0
    the tier says so instead: "No player prices yet: they are pulled within a day of each
    kickoff." (Players only) or the usual reason followed by ", and no player prices yet: ..."
    (a mix with team bets, which may still fill a tier). The note over the tiers no longer
    repeats it. The pulls are named by when they land rather than by weekday: Thursday's game is
    priced on Thursday, Sunday's on Saturday evening and Monday's on Monday (props.yml), so
    "the Thursday and Saturday pulls" was wrong for Monday night.

The bar itself is said as the code applies it: a leg's model chance at least 3 points above
mlProb(price), the chance the book's own price implies with its margin left in (stricter than
the margin-out chance), in the comment over the engine and in the panel's footer.

Nothing in the engine's rules, the floors or the bet types All includes changes. The audit's
section M checks the thin line per kind on every tier it builds, and blanks the week's player
prices to check the new reason under Players only and under All.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all
of them land, so a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v86 \\u00b7 2026-10-10';", "const APP_BUILD='app v87 \\u00b7 2026-10-10';")

# the bar, as the code applies it
sub1('p3', """   A leg qualifies as the old Suggested parlays window's did: a real sportsbook price, the
   model's chance between 45% and 97% and at least 3 points above the book's implied chance,
   and for a player leg market + form agreeing (formAgrees).""",
"""   A leg qualifies as the old Suggested parlays window's did: a real sportsbook price, the
   model's chance between 45% and 97% and at least 3 points above the chance the price itself
   implies (mlProb, the book's margin left in, so stricter than its margin-out chance), and for
   a player leg market + form agreeing (formAgrees).""")

# the pool counts the ticked games with any player price on file, before any rule
sub1('p3', """  const pref=[], thin=[];
  for(const c of pricedLegs(games,true)){
    if(!pbAllows(c)||""",
"""  const pref=[], thin=[], plGames=new Set();
  for(const c of pricedLegs(games,true)){
    if(!isGameLeg(c)) plGames.add(c.gid);
    if(!pbAllows(c)||""")
sub1('p3', """  return {pref:pbCap(pref),thin:pbCap(thin)};
}""",
"""  return {pref:pbCap(pref),thin:pbCap(thin),plGames:plGames.size};
}""")

# why a tier is empty: no player prices yet is said as such
sub1('p3', """/* why a tier is empty, in the reader's terms */
function pbWhy(n,floor,pool){
  const m=pbMaxLegs([...pool.pref,...pool.thin]);
  if(m<n) return `${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks: tick more games or bet types.`;
  return floor?`No ${n}-leg parlay on your picks lands ${Math.round(floor*100)}% of the time or more: tick more games or bet types.`
    :`No ${n}-leg parlay on your picks: tick more games or bet types.`;
}""",
"""/* why a tier is empty, in the reader's terms. A player leg needs the book's price, and a game's
   player prices are pulled within a day of its kickoff (Thursday's game on Thursday, Sunday's on
   Saturday evening, Monday's on Monday): with player bets ticked and none of the ticked games
   priced yet, that is the reason, and the tier says so rather than ask for more ticks (under
   Players only no tick would help). c: which of the two kinds are ticked */
const PB_NO_PL='no player prices yet: they are pulled within a day of each kickoff.';
function pbWhy(n,floor,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`
    :floor?`No ${n}-leg parlay on your picks lands ${Math.round(floor*100)}% of the time or more`:`No ${n}-leg parlay on your picks`;
  if(c&&c.players&&!pool.plGames) return c.teams?`${what}, and ${PB_NO_PL}`:PB_NO_PL[0].toUpperCase()+PB_NO_PL.slice(1);
  return `${what}: tick more games or bet types.`;
}""")
sub1('p3', """  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,tiers:[],noTotalPrice:false};""",
"""  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,tiers:[],noTotalPrice:false,noPlayerPrices:false};""")
sub1('p3', """  const pool=pbPool(games), memo=new Map();
  out.pref=pool.pref.length; out.thin=pool.thin.length;
  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,floor,pool)}; });""",
"""  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats||u.k.total)};
  out.pref=pool.pref.length; out.thin=pool.thin.length; out.noPlayerPrices=c.players&&!pool.plGames;
  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,floor,pool,c)}; });""")

# the thin-edge line, worded for the legs it is on
sub1('p3', """/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard) */
function pbTierCard(t,o){""",
"""/* what a thin edge means for the legs it is on. A team bet or a total has no market + form (that
   is a player leg's second price, from his Elo), so it is thin only for missing the 3-point bar;
   a player leg is thin for that or for market + form not agreeing, where the Elo tab is on the
   page (form) */
function pbThinLine(legs,form){
  const th=legs.filter(l=>l.thin), n=th.length, gl=th.filter(isGameLeg), p=n-gl.length;
  const tot=gl.filter(l=>l.stat==='total').length, tm=gl.length-tot, s=k=>k===1?'':'s';
  const bar='not 3 points above', both='not 3 points above with market + form agreeing';
  const games=tm&&tot?`the team bet${s(tm)} and the total${s(tot)}`:tot?`the total${s(tot)}`:`the team bet${s(tm)}`;
  const tail=!form||!p?bar:!gl.length?both:`${games} ${bar}, and the player leg${s(p)} ${both}`;
  return `${n===1?'One leg has a thin edge: the model rates it':n+' legs have a thin edge: the model rates them'} at or above the book's price, but ${tail}.`;
}
/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard) */
function pbTierCard(t,o){""")
sub1('p3', """    ${t.thin?`<p class="pb-thin">${t.thin===1?'One leg has a thin edge: the model rates it':t.thin+' legs have a thin edge: the model rates them'} at or above the book's price, but not 3 points above${form?' with market + form agreeing':''}.</p>`:''}""",
"""    ${t.thin?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}""")

# the note over the tiers: not again when the tiers already say there are no player prices
sub1('p3', """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin) notes.push(`No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices arrive with the Thursday and Saturday pulls.`);""",
"""  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.noPlayerPrices) notes.push(`No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices are pulled within a day of each kickoff.`);""")

# the footer says the bar as the code applies it
sub1('p3', """    <p class="muted pb-foot">Every leg has a real sportsbook price and a model chance between 45% and 97%, at least 3 points above the book's${form?""",
"""    <p class="muted pb-foot">Every leg has a real sportsbook price and a model chance between 45% and 97%, at least 3 points above the chance that price implies${form?""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched part2.js, part3.js: app v87')
