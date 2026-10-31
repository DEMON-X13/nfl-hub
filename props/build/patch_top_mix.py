"""The Top 50 lines: the player lines are a mix of bet types, each type's likeliest first (app v141).

The diagnosis, on the payload of Saturday 31 October 2026 (week 8, the page booted at 16:30 UTC). Since app v138 every
player leg is stated and chosen at DraftKings' fair chance, and nearly every player leg is DraftKings' line read on ESPN,
priced by the estimate (`DK_EST`, `estPrice`) on a flat assumed margin a market. So every estimated player line has the
same expected return at its own fair chance, to a few ten-thousandths of a point: an anytime touchdown exactly
1/1.0566 - 1 = -5.356805% (its fair chance is worked back from its rounded price over `DK_EST.tdVig`), passing, rushing
and receiving yards -5.357143%, receptions -5.48% to -5.82% and passing touchdowns -5.43% to -5.74% (their assumed margins
are 5.99% and 5.90%). The Top 30's Player part ranked by expected return first (`pbEvKey`), then the chance, the lean and
`pbOrd`, so a 0.0003-point artefact of the estimate put all 20 anytime touchdowns (the only 20 that qualify, at a chance of
45-97%) ahead of every one of the 397 other player lines that did (138 receptions, 137 receiving yards, 71 rushing yards,
26 passing touchdowns, 25 passing yards): the owner saw nothing but touchdowns. The ranking said nothing true: the order
was the estimate's margins, not a judgement of the lines.

The owner's call of 31 October 2026, asked how those player lines should be chosen instead, "A mix of bet types": "The
best few of each type (anytime TD, rushing yards, receiving yards, receptions, passing yards, passing TDs), each type's
likeliest first. You always see every market." And then, the same day: "okay lets just build it. maybe expand to 50".

1. The Player part is filled round by round from each bet type's own list (`pbTypeRounds`). A type is the leg's stat
   (any_td, rushing_yards, receiving_yards, receptions, passing_yards, passing_tds; any other stat a qualifying player
   leg carries is a type of its own the same way), over and under alike. Each type's list is ordered likeliest first
   (`pbByChance`: the leg's chance, the pool copy's p, legChance, higher first to 1e-9; then the lean, pm less p, larger
   first; then `pbOrd`: exactly the chain the list used after the expected return). Round 1 takes each type's first,
   round 2 each type's second, and so on, a type that has run out simply skipped; the legs of a round are ordered
   likeliest first by the same chain, and the rounds follow one another. So where six types qualify, ranks 1 to 6 are
   one of each, and a type with more lines than the rest fills the later rounds alone. The part is that order cut at its
   length (`PB_TOP_PL`, or more where the game bets do not fill the list), so a round the cut falls in gives its
   likeliest legs first.

2. The list is the Top 50 (`PB_TOP_N` 50, 30 since app v116), the player lines up to 40 of it (`PB_TOP_PL` 40, 20 since
   app v138), the game bets filling the rest as before (10 where 40 player lines qualify, more where fewer do). Every
   word that reads the length reads `PB_TOP_N` (the heading, "Top 50 lines").

Unchanged: the pool (`pbLegs` on the ticks, every rule a suggested leg keeps), the Game bets part (moneylines and spreads,
then the totals, each by expected return as before), a hook's Value part (drawn only from a hook's rows, ranked as before,
first), each bet once, every row's columns and numbers, and the sort arrows (# puts this order back). The Suggested
Parlays sets, the Elo picks and the record are untouched: they never read the Top lines. No word is added to the page but
the Player lines list's accessible name, which said "by expected return on $1" and now says "a mix of bet types, each
type's likeliest first".
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v140 \\u00b7 2026-10-29';", "const APP_BUILD='app v141 \\u00b7 2026-10-31';")

# ---------------------------------------------------------------- the length, and the comments that say it
sub1('p3', "/* ---------- the Parlay Builder's Top lines (app v111; 50 since app v113, 30 since app v116) ----------",
     "/* ---------- the Parlay Builder's Top lines (app v111; 50 since app v113, 30 since app v116, 50 again since app v141) ----------")
sub1('p3', """   would fill it */
const PB_TOP_N=30, PB_TOP_PL=20;""", """   would fill it.
   (app v141, the owner's call of 31 October 2026: "The best few of each type (anytime TD, rushing yards, receiving yards,
   receptions, passing yards, passing TDs), each type's likeliest first. You always see every market", and "maybe expand to
   50") The Player lines are a mix of bet types (pbTypeRounds), no longer ranked by expected return: every estimated player
   line returns the same at its own fair chance to a few ten-thousandths of a point, the estimate's flat margins, and that
   artefact put all 20 qualifying anytime touchdowns ahead of the week's 397 other player lines. The Top 50: up to 40
   player lines, the game bets filling the rest */
const PB_TOP_N=50, PB_TOP_PL=40;
/* (app v141) likeliest first: the chance (the pool copy's p, legChance) to 1e-9, then the lean, then pbOrd: the chain the
   list read after the expected return */
const pbByChance=(a,b)=>(pbEvKey(b.p)-pbEvKey(a.p))||(pbEvKey(pbLean(b))-pbEvKey(pbLean(a)))||pbOrd(a,b);
/* (app v141) the player lines round by round from each bet type's own list, a type the leg's stat (over and under alike),
   each list likeliest first: round 1 each type's first, round 2 each type's second, a type that has run out skipped, the
   legs of a round likeliest first, the rounds one after another; the part is this order cut at its length */
function pbTypeRounds(list){
  const by=new Map();
  for(const l of [...list].sort(pbByChance)){ if(!by.has(l.stat)) by.set(l.stat,[]); by.get(l.stat).push(l); }
  const L=[...by.values()], out=[];
  for(let i=0;L.some(x=>i<x.length);i++) out.push(...L.filter(x=>i<x.length).map(x=>x[i]).sort(pbByChance));
  return out;
}""")

# ---------------------------------------------------------------- the player part a mix of bet types
sub1('p3', """  const rank=list=>list.map(l=>{ const dec=mlToDec(l.price); return dec>1?{...l,dec,win:dec-1,ev:l.p*dec-1,fc:legFairStated(l,fm)}:null; })
    .filter(Boolean).sort((a,b)=>(pbEvKey(b.ev)-pbEvKey(a.ev))||(pbEvKey(b.p)-pbEvKey(a.p))||(pbEvKey(pbLean(b))-pbEvKey(pbLean(a)))||pbOrd(a,b));""",
     """  const priced=list=>list.map(l=>{ const dec=mlToDec(l.price); return dec>1?{...l,dec,win:dec-1,ev:l.p*dec-1,fc:legFairStated(l,fm)}:null; }).filter(Boolean);
  const rank=list=>priced(list).sort((a,b)=>(pbEvKey(b.ev)-pbEvKey(a.ev))||pbByChance(a,b));""")
sub1('p3', """  /* (app v138) a hook's Value picks, then the player lines (up to PB_TOP_PL, more where the game bets do not fill the
     rest), then the game bets to PB_TOP_N: moneylines and spreads, then the totals */
  const V=rank(P1), Pl=rank(P2.filter(l=>!isGameLeg(l))), Gm=[...rank(P2.filter(isGameLeg)),...rank(P3)];""",
     """  /* (app v138) a hook's Value picks, then the player lines (up to PB_TOP_PL, more where the game bets do not fill the
     rest), then the game bets to PB_TOP_N: moneylines and spreads, then the totals. (app v141) The player lines a mix of
     bet types, each type's likeliest first (pbTypeRounds); the Value picks and the game bets by expected return as before */
  const V=rank(P1), Pl=pbTypeRounds(priced(P2.filter(l=>!isGameLeg(l)))), Gm=[...rank(P2.filter(isGameLeg)),...rank(P3)];""")
sub1('p3', "+part('player','Player lines',Pl,nV,`${nV?'Then ':'The '}${Pl.length} player line${s(Pl.length)} on your picks, by expected return on $1`)",
     "+part('player','Player lines',Pl,nV,`${nV?'Then ':'The '}${Pl.length} player line${s(Pl.length)} on your picks, a mix of bet types, each type’s likeliest first`)")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
