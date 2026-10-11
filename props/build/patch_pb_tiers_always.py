"""app v90: every level of the suggested parlays shows a parlay of its size, the Custom tag goes,
and the no-player-prices line says when the prices really come.

The owner ticked only Spread and got Safe and Extreme but nothing under Medium or Aggressive. The
week's spreads that cleared the bar were rated 56% to 62%, so the likeliest three of them together
landed about 21% and the likeliest four about 12%, short of the 25% and 12% floors, and the two
boxes said only that no parlay of their size reached them. He wants the highest available shown
anyway, with its chance and price and no note about the floor ("i would rather you just state the
percentage and give options for all the different legs").

  * Each level still aims for what it did: Medium, Aggressive and Extreme are the 3-, 4- and 5-leg
    parlays with the best expected return that land at least 25%, 12% and 5% of the time, searched
    exactly as before (pbBestReturn, the old pbTier: preferred legs alone first, then with the
    fewest thin legs, the best finalists worked by the builder's own sums). Only when no parlay of
    that size clears the floor at any count of thin legs does the level fall back, to the likeliest
    parlay of that size (pbLikeliest): chosen as Safe chooses the likeliest pair, preferred legs
    alone first and then the fewest thin legs, by a beam on the search's own chance (PB_WIDE wide,
    twice the floor search's), its best three (PB_LIKELY) worked with the builder's own parlayProb
    on the legs in the builder's order, the highest of those the tier. Legs in different games are a
    plain product, so on spreads and moneylines that is the likeliest parlay outright; legs that
    move together take one full sum each (about 12ms in Chromium), so a fallback on a full Sunday
    slate stays well under a tenth of a second.
    The leg rules are the same throughout: a real price, the 45-97% chance, never a leg the model
    rates below the book, one leg a player, one team bet a game, no line twice.
  * The fallback is marked on the tier (likeliest: true) for the audit and the smoke, and its card
    says what it is in the same words Safe's does: "the likeliest 3 legs" (4, 5) where a level that
    reached its floor keeps "best return that lands 25%+". Nothing else on the card changes and no
    note about the floor is added: its chance and price are shown as on every card.
  * A level is empty only when the picks do not make that many legs at all (one game ticked under
    Teams only, say), so pbWhy speaks only of too few legs or no player prices yet; its "lands N%
    of the time or more" reason could no longer be reached and is gone. The footer says in a few
    words that where no parlay of a level's size gets to its floor, it shows the likeliest of that
    size.
  * The Custom tag beside the mix switch goes (the span and its style). When the ticked boxes make
    none of the three mixes, no mix button is lit and the boxes say what is ticked; pbMix still
    answers 'custom' inside.
  * The price pulls changed on 11 October 2026 (PR #213): Thursday's game is priced on Thursday,
    Monday's on Monday, a Friday game's on Thursday, and Saturday's games and the whole Sunday slate
    on Saturday morning. "They are pulled within a day of each kickoff" was no longer true of a
    Sunday game, so the reason a tier gives with no player prices on file, and the panel's note
    under an empty pool, now say "they are pulled on game day or the day before, Sunday's games on
    Saturday morning." (The Elo picks' line in nflbets/build/tab_elo.html says the same.)

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


sub1('p2', "const APP_BUILD='app v89 \\u00b7 2026-10-11';", "const APP_BUILD='app v90 \\u00b7 2026-10-11';")

# ---------------------------------------------------------------- the Custom tag's look goes with it
sub1('p1', """.pb-custom{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:999px;border:1px solid var(--gold);color:var(--ink-2)}
""")

# ---------------------------------------------------------------- part3: what the panel is
sub1('p3', """   25%, 12% and 5% of the time: a floor that falls tier by tier, about 63%, 59% and 55% a leg on
   average, so a longer parlay asks a little less of each leg. Under All nothing forces or caps a
   kind: a tier holds whatever mix of team and player legs does best by those rules.""",
"""   25%, 12% and 5% of the time: a floor that falls tier by tier, about 63%, 59% and 55% a leg on
   average, so a longer parlay asks a little less of each leg. Where no parlay of a level's size
   on the reader's picks reaches its floor, the level shows the likeliest parlay of that size
   instead (pbLikeliest, the tier marked likeliest), so every level has a parlay whenever the
   picks make that many legs: the owner wants each level filled, with its chance and price, rather
   than an empty box (October 2026). Under All nothing forces or caps a
   kind: a tier holds whatever mix of team and player legs does best by those rules.""")
sub1('p3', """   and a rung of the same stat, are one key. A tier that cannot be built says why rather than show a smaller
   parlay. Its chance and price are the builder's own sums""",
"""   and a rung of the same stat, are one key. A tier is empty only when the picks do not make that
   many legs at all, and then it says why rather than show a smaller parlay. Its chance and price are the builder's own sums""")
sub1('p3', """const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40, PB_BEAM=12, PB_FINAL=8;""",
"""const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40, PB_BEAM=12, PB_WIDE=24, PB_LIKELY=3, PB_FINAL=8;""")
sub1('p3', """/* the mix the boxes make: one of the three, or none of them */""",
"""/* the mix the boxes make: one of the three, or 'custom' when they make none of them (no mix
   button is lit then, and nothing else is shown: the boxes say what is ticked) */""")

# ---------------------------------------------------------------- part3: a level's parlay, or the likeliest of its size
sub1('p3', """/* one tier: preferred legs alone first, then with k legs from the thin list, fewest first. The
   best few by the search's own score are worked exactly, and the best of those that clears the
   floor is the tier */
function pbTier([id,label,n,floor],pool,memo){""",
"""/* a level's best return: preferred legs alone first, then with k legs from the thin list, fewest
   first. The best few by the search's own score are worked exactly, and the best of those that
   clears the floor is the tier; null when none does. Safe, with no floor, is the likeliest pair */
function pbBestReturn([id,label,n,floor],pool,memo){""")
sub1('p3', """    for(const x of top){ const r=pbExact(x.e.legs); if(!floor||r.corr>=floor) return r; }
  }
  return null;
}""",
"""    for(const x of top){ const r=pbExact(x.e.legs); if(!floor||r.corr>=floor) return r; }
  }
  return null;
}
/* the likeliest n-leg parlay on the picks, for a level none of whose parlays reaches its floor.
   Chosen as Safe is: preferred legs alone first, then with k thin legs, fewest first. At each k a
   beam by the search's own chance, twice as wide as the floor search's, and its best three by that
   chance worked with the builder's own sums (parlayProb, on the legs in the builder's order), the
   highest of those the tier (the lower id on a tie, so the same picks always give the same
   parlay). Legs in different games are a plain product, so there the search's chance is the
   builder's and this is the likeliest parlay outright. null only when the picks do not make n
   legs at all */
function pbLikeliest(n,pool,memo){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=n;k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    let best=null;
    for(const e of pbBeam(pools,0,'pr',PB_WIDE,memo).slice(0,PB_LIKELY)){
      const pr=parlayProb(pbOrder(e.legs)).corr;
      if(!best||pr>best.pr||(pr===best.pr&&e.id<best.e.id)) best={e,pr}; }
    if(best) return pbExact(best.e.legs);
  }
  return null;
}
/* one level: the best return over its floor, else (Medium, Aggressive, Extreme) the likeliest
   parlay of its size, marked likeliest so its card says which it is */
function pbTier(t,pool,memo){
  const r=pbBestReturn(t,pool,memo); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo); return x?{...x,likeliest:true}:null;
}""")

# ---------------------------------------------------------------- part3: why a level is empty, and when the prices come
sub1('p3', """/* why a tier is empty, in the reader's terms. A player leg needs the book's price, and a game's
   player prices are pulled within a day of its kickoff (Thursday's game on Thursday, Sunday's on
   Saturday evening, Monday's on Monday): with player bets ticked and none of the ticked games
   priced yet, that is the reason, and the tier says so rather than ask for more ticks (under
   Players only no tick would help). c: which of the two kinds are ticked */
const PB_NO_PL='no player prices yet: they are pulled within a day of each kickoff.';
function pbWhy(n,floor,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`
    :floor?`No ${n}-leg parlay on your picks lands ${Math.round(floor*100)}% of the time or more`:`No ${n}-leg parlay on your picks`;""",
"""/* why a tier is empty, in the reader's terms: the picks do not make that many legs (one a player,
   one team bet a game), since every level shows a parlay whenever they do. A player leg needs the
   book's price, and a game's player prices are pulled on game day or the day before: Thursday's
   game on Thursday, Monday's on Monday, a Friday game's on Thursday, and Saturday's games and the
   whole Sunday slate on Saturday morning (on the site by about 7:50am Pacific). With player bets
   ticked and none of the ticked games priced yet, that is the reason, and the tier says so rather
   than ask for more ticks (under Players only no tick would help). c: which of the two kinds are ticked */
const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s games on Saturday morning.';
function pbWhy(n,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`:`No ${n}-leg parlay on your picks`;""")
sub1('p3', """return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,floor,pool,c)}; });""",
"""return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,pool,c)}; });""")

# ---------------------------------------------------------------- part3: the card's rule says which it is
sub1('p3', """${o.rule||(t.floor!=null?`<span class="pb-rule">${t.floor?`best return that lands ${Math.round(t.floor*100)}%+`:'the likeliest pair'}</span>`:'')}""",
"""${o.rule||(t.floor!=null?`<span class="pb-rule">${t.likeliest?`the likeliest ${t.legs.length} legs`:t.floor?`best return that lands ${Math.round(t.floor*100)}%+`:'the likeliest pair'}</span>`:'')}""")

# ---------------------------------------------------------------- part3: the panel: no Custom tag, the note and the footer
sub1('p3', """.join('')}</span>${mix==='custom'?'<span class="pb-custom" title="Your own choice of bet types: none of the three mixes">Custom</span>':''}`;""",
""".join('')}</span>`;""")
sub1('p3', """No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices are pulled within a day of each kickoff.`);""",
"""No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices are pulled on game day or the day before, Sunday’s games on Saturday morning.`);""")
sub1('p3', """with the best expected return that land at least ${PB_TIERS.slice(1).map(t=>Math.round(t[3]*100)+'%').join(', ').replace(/, ([^,]*)$/,' and $1')} of the time. One leg a player""",
"""with the best expected return that land at least ${PB_TIERS.slice(1).map(t=>Math.round(t[3]*100)+'%').join(', ').replace(/, ([^,]*)$/,' and $1')} of the time, or, where none of that size gets there, the likeliest of that size. One leg a player""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched part1.html, part2.js, part3.js: app v90')
