"""app v88: a game total is priced at the market's own chance, and the model's points are shown
beside it, not used.

The owner asked for the points function behind the game totals to be made better. Until now a
total's chance was the prop model's own points for the two sides (modelPoints, its team volumes
and defences) pulled halfway to the posted total, the final total spread about TOTAL_SD, 13.2
points. A study (props/research/totals/, its README has the whole of it) built four dedicated
points formulas on 2012-2023 and tested each once, frozen, on 2024 to 2026 (635 games):

  * an opponent-adjusted scoring rating blended with the line, an efficiency model on nine
    play-by-play stats, a ridge model of the line's residual on twelve pre-game features, and the
    posted total nudged for wind. None beat the posted total: on 2024-2025, the primary period, no
    candidate's Brier or log loss interval lay below the market's, at 90% or at the 97.5% the
    preregistered rule asked for, and none of their picks made money with an interval clear of 0.
  * The rule the site used was measurably worse than the market: over 2024-2026, MAE +0.132 points
    [+0.037, +0.227], Brier +0.0042 [+0.0012, +0.0073], log loss +0.0085 [+0.0025, +0.0146], and
    its picks at a 3-point edge over the price went 66-81 for -20.33 units [-39.90, -1.10] (90%
    paired bootstrap intervals). On 2026's first 65 games alone its favoured side went 25-40.

So the judge's recommendation, which this patch carries out:

  * mu is the posted total (g.tot), and the chance of the over is the market's own: the over and
    under prices with the book's margin taken out, i(over) / (i(over) + i(under)) with i the
    chance a price implies (devigOver, as a player's main line already uses), and 50% where
    either price is missing (totalOver). Nothing of the model's enters the chance.
  * TOTAL_SD, 13.2, stays only to price a total on a number other than the posted one, as
    Normal(posted total, 13.2): totalBet takes that number as an optional third argument.
  * The total stays a leg a visitor ticks by hand on the Game bets card, at that chance and the
    book's price (-110 marked est. without one). It never makes a suggested parlay: a no-vig
    chance sits under the chance the price implies with its margin left in, so it fails the
    3-point bar and the thin-edge fill (never a leg under the book) on every real price, and
    pricedLegs no longer offers the totals to the panel at all, so a price with no margin (a data
    slip, +100 both ways) cannot slip one in as a thin leg either. With Game total ticked the
    panel says so in one line, so the box does not look broken: "Game totals are priced at the
    book's own chance, so they never make a suggested parlay; add one by hand from a game's Game
    bets card." The note that no total had a price on file goes (a price no longer decides it).
  * The model's own points are still worked out (modelTotal) and shown on the Game bets card as
    "model's points 43.8", a display labelled as such, kept out of the chance, the edge and the
    suggestions. The card's words say where the chance comes from.

Following from it, the panel's thin-edge line loses its words for a total (none can be in a
tier), pbBuild's noTotalPrice goes, a tier that cannot be built with no player prices on file
counts only Moneyline and Spread as team bets that might still fill it, the general "No line on
your picks..." note is not shown when Game total is the only box ticked, and the footer reads
"one team bet a game". Settlement, the live tracking, TOTAL_RHO and the leg's one key a game are
unchanged.

The audit's J2 holds a total's chance to the no-vig chance of its prices (and 50% without both)
on every game of the schedule, with the model's points moved and the payload's points model
taken out, checks the off-number price, and M holds that no tier ever holds a total, on the
week as it is and on made-up prices including one with no margin.

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


sub1('p2', "const APP_BUILD='app v87 \\u00b7 2026-10-10';", "const APP_BUILD='app v88 \\u00b7 2026-10-11';")

# ---------------------------------------------------------------- part2: the chance is the market's
sub1('p2', """/* ---------- the game total: over or under the posted points ----------
   The game's points ~ Normal(mu, TOTAL_SD), the way the margin is above. mu is the model's own
   points for the two sides (modelPoints: the team volumes and defences it tracks, the numbers the
   slate falls back on when no line is posted) pulled halfway to the posted total. TOTAL_SD is how
   far final totals have landed from the posted total: 13.2 points across the 4,175 regular-season
   games of 2010-2025 in nflverse's games.csv (13.3 for 2010-2018, 13.1 for 2019-2025), measured
   once and never on the season in play. The book's price for a side is the over or under odds
   the payload carries beside the total (nflverse's, or DraftKings' with its own number); with
   none on file the leg is shown at an estimated -110 and no suggestion is built on it. */
const TOTAL_SD=13.2, TOTAL_EST=-110;
function modelTotal(g){ return modelPoints(g.a,g.h,false)+modelPoints(g.h,g.a,true); }
function totalMu(g){ const m=modelTotal(g); return (g.tot!=null&&isFinite(g.tot))?(m+g.tot)/2:m; }
/* side 'over' or 'under': the chance that side lands, on the posted total. null with no total posted */
function totalBet(g,side){
  if(g.tot==null||!isFinite(g.tot)) return null;
  const mu=totalMu(g), pO=1-gbNorm((g.tot-mu)/TOTAL_SD);
  return {p:side==='under'?1-pO:pO,line:g.tot,mu,model:modelTotal(g)};
}""",
"""/* ---------- the game total: over or under the posted points ----------
   The chance is the market's own: mu is the posted total, and the over's chance is its over and
   under prices with the book's margin taken out (devigOver), an even 50% where either price is
   missing. Nothing of the model's goes into it. props/research/totals/ built four dedicated
   points formulas on 2012-2023 and tested each once, frozen, on 2024 to 2026: none beat the
   posted total, and the rule used before (the model's own points, modelPoints for each side,
   pulled halfway to the posted total) was measurably worse than it over those 635 games (MAE
   +0.13 points, 90% interval +0.04 to +0.23; Brier +0.0042, +0.0012 to +0.0073; its 3-point-edge
   picks 66-81, -20.3 units). The model's points (modelTotal) are shown beside the total on the
   Game bets card as the model's points, a display only, kept out of the chance, the edge and
   the suggestions. TOTAL_SD is how far final totals have landed from the posted total: 13.2
   points across the 4,175 regular-season games of 2010-2025 in nflverse's games.csv, measured
   once and never on the season in play. It prices a total on a number other than the posted
   one, Normal(posted total, 13.2), and nothing else. The book's price for a side is the over or
   under odds the payload carries beside the total (nflverse's, or DraftKings' with its own
   number); with none on file the leg is shown at an estimated -110. A total is never in a
   suggested parlay: at the book's own chance it has no edge for one to find. */
const TOTAL_SD=13.2, TOTAL_EST=-110;
function modelTotal(g){ return modelPoints(g.a,g.h,false)+modelPoints(g.h,g.a,true); }
/* the market's chance of the over on the posted total: both prices with the margin out, else 50% */
function totalOver(g){ const o=totalBook(g,'over'), u=totalBook(g,'under'); return (o!=null&&u!=null)?devigOver(o,u):0.5; }
/* side 'over' or 'under': the chance that side lands on the posted total, or on k where k is
   another number (Normal about the posted total, TOTAL_SD). null with no total posted */
function totalBet(g,side,k){
  if(g.tot==null||!isFinite(g.tot)) return null;
  const line=(k==null||!isFinite(k))?g.tot:+k;
  const pO=line===g.tot?totalOver(g):1-gbNorm((line-g.tot)/TOTAL_SD);
  return {p:side==='under'?1-pO:pO,line,mu:g.tot};
}""")

# ---------------------------------------------------------------- part3: the Game bets card
sub1('p3', """    tot=`<div class="statblk"><h4>Game total <em>our total ${tb.mu.toFixed(1)}</em><em class="mline">book line ${tb.line}</em></h4><table class="rungs">${trow('over')}${trow('under')}</table></div>`; }""",
"""    tot=`<div class="statblk"><h4>Game total <em class="mpts" title="The model's own points for the two sides: shown, not used in the chance">model's points ${modelTotal(g).toFixed(1)}</em><em class="mline">book line ${tb.line}</em></h4><table class="rungs">${trow('over')}${trow('under')}</table></div>`; }""")
sub1('p3', """with the final margin treated as spread about 13.5 points around that; the total from our own points for each side, pulled halfway to the posted total, spread about 13.2 points. A win or cover leg""",
"""with the final margin treated as spread about 13.5 points around that. The total's chance is the book's own, its over and under prices with the margin taken out (an even 50% with no price on file): tested on 2024 to 2026, no points model of ours beat the posted total, so the model's points are shown beside it and not used. A total is never in a suggested parlay; tick it here to add it by hand. A win or cover leg""")
sub1('p3', """${tb&&totalBook(g,'over')==null?'<p class="muted" style="margin:6px 0 0;font-size:12px">No over or under price on file for this total yet: the -110 is an estimate, and no suggested parlay is built on it.</p>':''}""",
"""${tb&&(totalBook(g,'over')==null||totalBook(g,'under')==null)?'<p class="muted" style="margin:6px 0 0;font-size:12px">No over and under price on file for this total yet: the chance is an even 50%, and where a price is missing the -110 is an estimate.</p>':''}""")

# ---------------------------------------------------------------- part3: the suggestions take no total
sub1('p3', """/* every line this week with a real sportsbook price, game bets and players, unjudged. withTotals
   adds each game's total, over and under, where the book's price for it is on file: the Parlay
   Builder's suggestions use them; a game page's own suggestions and the Elo picks do not */
function pricedLegs(games,withTotals){
  const w=currentWeek(); const out=[];
  for(const g of (games||gamesIn(w))){
    if(gameStarted(g)) continue;
    if(withTotals) for(const side of ['over','under']){ const l=totalLeg(g,side); if(l&&l.src==='real') out.push(l); }
""",
"""/* every line this week with a real sportsbook price, team bets and players, unjudged. A game total
   is not among them: priced at the book's own chance (totalBet), it has no edge for a suggestion
   to find, so it is a leg a visitor adds by hand from the Game bets card */
function pricedLegs(games){
  const w=currentWeek(); const out=[];
  for(const g of (games||gamesIn(w))){
    if(gameStarted(g)) continue;
""")
sub1('p3', """  for(const c of pricedLegs(games,true)){""", """  for(const c of pricedLegs(games)){""")
sub1('p3', """   leg the model rates below the book. At most one game leg (to win, to cover, the total) a
   game, one leg a player, and no line twice:""",
"""   leg the model rates below the book. A game total is never a candidate: it is priced at the
   book's own chance (totalBet), which sits under the chance its price implies whenever the book
   takes a margin, so it has no edge to offer, and pricedLegs leaves it out. At most one team bet
   (to win or to cover) a game, one leg a player, and no line twice:""")
sub1('p3', """  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,tiers:[],noTotalPrice:false,noPlayerPrices:false};""",
"""  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,tiers:[],noPlayerPrices:false};""")
sub1('p3', """  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats||u.k.total)};""",
"""  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats)};""")
sub1('p3', """  out.noTotalPrice=!!u.k.total&&games.some(g=>g.tot!=null)&&!games.some(g=>totalBook(g,'over')!=null||totalBook(g,'under')!=null);
""")

# the thin-edge line: no total can be in a tier, so a thin game leg is a team bet
sub1('p3', """/* what a thin edge means for the legs it is on. A team bet or a total has no market + form (that
   is a player leg's second price, from his Elo), so it is thin only for missing the 3-point bar;
   a player leg is thin for that or for market + form not agreeing, where the Elo tab is on the
   page (form) */
function pbThinLine(legs,form){
  const th=legs.filter(l=>l.thin), n=th.length, gl=th.filter(isGameLeg), p=n-gl.length;
  const tot=gl.filter(l=>l.stat==='total').length, tm=gl.length-tot, s=k=>k===1?'':'s';
  const bar='not 3 points above', both='not 3 points above with market + form agreeing';
  const games=tm&&tot?`the team bet${s(tm)} and the total${s(tot)}`:tot?`the total${s(tot)}`:`the team bet${s(tm)}`;
  const tail=!form||!p?bar:!gl.length?both:`${games} ${bar}, and the player leg${s(p)} ${both}`;""",
"""/* what a thin edge means for the legs it is on. A team bet has no market + form (that is a player
   leg's second price, from his Elo), so it is thin only for missing the 3-point bar; a player leg
   is thin for that or for market + form not agreeing, where the Elo tab is on the page (form). A
   game total is never in a tier */
function pbThinLine(legs,form){
  const th=legs.filter(l=>l.thin), n=th.length, tm=th.filter(isGameLeg).length, p=n-tm, s=k=>k===1?'':'s';
  const bar='not 3 points above', both='not 3 points above with market + form agreeing';
  const tail=!form||!p?bar:!tm?both:`the team bet${s(tm)} ${bar}, and the player leg${s(p)} ${both}`;""")

# the panel: one line when Game total is ticked, in place of the old no-price note
sub1('p3', """  if(r.noTotalPrice) notes.push('No over or under price is on file for these games’ totals yet, so no total is in a tier.');
  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.noPlayerPrices) notes.push(""",
"""  if(u.k.total) notes.push('Game totals are priced at the book’s own chance, so they never make a suggested parlay; add one by hand from a game’s Game bets card.');
  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(""")
sub1('p3', """One leg a player, one team bet or total a game; legs in one game are priced together""",
"""One leg a player, one team bet a game; legs in one game are priced together""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched part2.js, part3.js: app v88')
