"""app v86: the Parlay Builder builds suggested parlays from what the visitor ticks, and a
game total is a leg.

The owner asked for suggested parlays a visitor shapes: all bet types together (the best
parlay whatever it is made of), or teams only, or players only. The Suggested parlays window
answered only "any, player overs or player unders", on every game of the week, three tiers each
grown from the one before. It is replaced by a panel at the top of the Parlay Builder tab
(#pbPanel, over #parlayBody):

  * A mix -- All (the default), Teams only, Players only -- sets five boxes: Moneyline, Spread,
    Game total, Player overs, Player unders. A touchdown and a ladder rung are overs. A box
    ticked by hand shows the mix it now makes, or Custom. Under the boxes, the week's games
    still to kick off (away @ home, in the visitor's own time), all ticked to start, All and
    None. The choices live in S.ui.pb, the visitor's own state, cleaned on load (pbClean).
  * Four tiers, each found on its own rather than grown from the last (PB_TIERS): Safe, the
    likeliest 2-leg parlay; Medium, Aggressive and Extreme, the 3-, 4- and 5-leg parlay with
    the best expected return (the model's chance times the book's decimal price) that still
    lands at least 25%, 12% and 5% of the time. The floors were set so each tier can be built
    on an ordinary week (about 63%, 59% and 55% a leg); under All nothing forces or caps a kind,
    so a tier is teams, players or both as the numbers fall.
  * A leg qualifies as the window's did: a real book price, the model's chance 45-97% and 3
    points over the book's with its margin out, market + form agreeing on a player leg. Where
    those cannot fill a tier, the fewest legs the model still rates at or over the book fill it,
    each marked thin, with a line saying so; a leg under the book never. One game leg a game
    (a win, a cover or the total), one leg a player (two lines on one receiver are one bet
    twice), no line twice, so nothing on a tier contradicts anything else on it.
  * A tier that cannot be built says why ("Only 3 legs on your picks: tick more games or bet
    types") and never offers a smaller parlay in its place. With no game to come the panel
    says so instead of the tiers.
  * The price and chance are the builder's own: the winner is worked by parlayProb and
    parlayDec on the legs in the order the builder lists them, so Add to builder (exactly those
    legs into S.parlay, asking first if the builder holds others) shows the same numbers, and
    Finish hands the tier to the parlay card on the $10 it shows. The search could not afford
    the copula's Monte Carlo at every step, so it is a beam over a pairwise approximation (each
    correlated pair's joint chance worked exactly by a Plackett integral, ten Gauss-Legendre
    points), its finalists re-scored by parlayProb with fewer draws, and the best of those by
    the full sums. The tiers are cached on a signature of the choices and the data (PB_CACHE,
    outside S), and a game that kicks off while the page is open leaves the list and the tiers
    at the next draw or the half-minute look (pbWatch).

The window (#suggModal), its Any/overs/unders switch, its stake box and its engine
(buildSuggestions, SUGGEST_TIERS, SUGGEST_CACHE) are gone; a game page's own High/Medium/Low
and their side switch stay. On the Bets and Stats page the Elo picks are drawn in the panel's
last section (#pbElo) by tab_elo.html, which is not part of this patch.

The game total, over or under, is a leg from end to end (stat 'total', pid 'game', one key a
game so its two sides cannot share a parlay): on the Game bets card under each game, in the
builder, in the suggestions, settled over, under or push after the final and followed live
(an over is won, and an under lost, the moment the points pass the line). Its line is the
schedule's g.tot and its price g.tov/g.tou, the over and under odds the payload now carries
beside it (nflverse's games.csv over_odds/under_odds, free, or DraftKings' own where its total
is used); fetchGames reads them too. With no price on file the leg shows -110 marked est. and
no suggestion is built on it. Its chance is the model's own points for the two sides
(modelPoints) pulled halfway to the posted total, the final total spread about TOTAL_SD, 13.2
points: how far the 4,175 regular-season totals of 2010-2025 landed from the posted one,
measured once, never on 2026. On 2026's first 65 graded games that rule did worse than a coin
(its favoured side 25-40, Brier 0.265 against the book's 0.250); it is reported, not tuned.
A total moves with its own game's passing and scoring lines (TOTAL_RHO, normal-score
correlations of each stat's miss against the total's miss over 2019-2024's starters) and with
a win or cover bet on the same game not at all (0.05 and 0.01 measured, so 0).
"""
from pathlib import Path

HERE = Path(__file__).parent
P1, P2, P3 = HERE / 'part1.html', HERE / 'part2.js', HERE / 'part3.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# the panel's styles, after the suggestion styles a game page still uses
sub1(P1, """.sugg-tier .btn{margin-top:auto;align-self:stretch;text-align:center}
@media(max-width:900px){ .sugg-grid{grid-template-columns:1fr} }
/* the parlay card: what it pays sits under the legs behind a divider, then the actions behind another */
.pays{margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}
""",
""".sugg-tier .btn{margin-top:auto;align-self:stretch;text-align:center}
@media(max-width:900px){ .sugg-grid{grid-template-columns:1fr} }
/* the Parlay Builder's suggested parlays: what to build from, then four tiers */
.pb .pb-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 4px}
.pb .pb-hd h2{margin:0}
.pb-lead{margin:0 0 14px;font-size:13px}
.pb-ctl{display:flex;flex-direction:column;gap:12px;padding:14px;background:var(--panel-2);border:1px solid var(--line);border-radius:var(--r-md);margin:0 0 14px}
.pb-row{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap}
.pb-lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);min-width:84px}
.pb-seg{display:inline-flex;border:1px solid var(--line-2);border-radius:10px;overflow:hidden;background:var(--panel);box-shadow:var(--sh-xs);max-width:100%}
.pb-seg button{background:transparent;color:var(--ink-2);border:0;border-left:1px solid var(--line-2);padding:8px 14px;min-height:40px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.pb-seg button:first-child{border-left:0}
.pb-seg button.on{background:var(--ink);color:var(--panel)}
.pb-custom{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:999px;border:1px solid var(--gold);color:var(--ink-2)}
.pb-chips{display:flex;flex-wrap:wrap;gap:8px}
.pb-chip{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:7px 13px 7px 11px;border:1px solid var(--line-2);border-radius:999px;background:var(--panel);cursor:pointer;font-size:13px;font-weight:600;color:var(--ink-2);user-select:none;-webkit-user-select:none}
.pb-chip small{font-weight:500;color:var(--muted);font-size:11.5px}
.pb-chip.on{border-color:var(--pick);background:var(--pick-soft);color:var(--ink)}
.pb-chip input,.pb-g input{margin:0;flex:none}
.pb-games{border-top:1px solid var(--line);padding-top:10px}
.pb-games summary{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none;min-height:40px;font-size:13px}
.pb-games summary .pb-lbl{flex-basis:auto}
.pb-games summary b{white-space:nowrap}
.pb-games summary::-webkit-details-marker{display:none}
.pb-games summary::after{content:"";margin-left:auto;width:8px;height:8px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s var(--ease)}
.pb-games[open] summary::after{transform:rotate(-135deg)}
.pb-games[open] .pb-sum-hint{display:none}
.pb-sum-hint{color:var(--muted);font-size:12px}
.pb-gbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 10px;font-size:12px}
.pb .btn.small{padding:6px 14px;font-size:12.5px;min-height:34px}
.pb-glist{display:grid;grid-template-columns:repeat(auto-fill,minmax(172px,1fr));gap:8px}
.pb-g{display:flex;align-items:center;gap:9px;padding:7px 10px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--panel);cursor:pointer;min-height:46px;min-width:0}
.pb-g:not(.on){opacity:.55;border-style:dashed}
.pb-g b{display:block;font-family:var(--display);font-size:13.5px;font-weight:600;color:var(--ink);white-space:nowrap}
.pb-g small{display:block;font-size:11.5px;color:var(--muted);line-height:1.3}
.pb-note{margin:-4px 0 12px;font-size:12.5px;color:var(--ink-2)}
.pb-tiers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.pb-tier{background:var(--panel-2);border:1px solid var(--line);border-top:3px solid var(--line-2);border-radius:var(--r-md);padding:12px 13px;display:flex;flex-direction:column;gap:10px;min-width:0}
.pb-tier.safe,.pb-tier.elo2{border-top-color:var(--pick)} .pb-tier.med,.pb-tier.elo3{border-top-color:var(--gold)} .pb-tier.aggr,.pb-tier.elo4{border-top-color:var(--miss)} .pb-tier.xtrm{border-top-color:#7C4DFF}
.pb-th{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pb-tn{font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px}
.pb-rule{font-size:11px;color:var(--muted);flex-basis:100%}
.pb-nums{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.pb-nums div:last-child{grid-column:1/-1}
.pb-nums div{flex:1 1 0;background:var(--panel);border:1px solid var(--line);border-radius:var(--r-sm);padding:6px 8px}
.pb-nums b{display:block;font-family:var(--display);font-size:17px;font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink)}
.pb-nums span{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.card .pb-legs{list-style:none;margin:0;padding:0}
.card .pb-legs li{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 0;margin:0;border-top:1px solid var(--line);font-size:13px;line-height:1.35}
.pb-legs .nm{font-weight:600;min-width:0;overflow-wrap:anywhere}
.pb-legs .nm small{display:block;font-weight:400;color:var(--ink-2);font-size:11.5px}
.pb-legs .pr{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;text-align:right}
.pb-legs .pr em{display:block;font-style:normal;font-size:11px;font-weight:500;color:var(--muted)}
.pb-thinmark{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:0 6px;border-radius:999px;border:1px solid var(--gold);color:var(--ink-2);white-space:nowrap}
.pb-thin{margin:0;font-size:11.5px;color:var(--ink-2)}
.pb-why{margin:0;font-size:13px;color:var(--ink-2)}
.pb-tier.none{border-top-style:dashed}
.pb-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
.pb-acts .btn{flex:1 1 auto;text-align:center;min-height:40px}
.pb-foot{margin:12px 0 0;font-size:12px}
.pb-none{margin:6px 0 0;padding:18px;text-align:center;color:var(--ink-2);background:var(--panel-2);border:1.5px dashed var(--line-2);border-radius:var(--r-md)}
.pb-elo:not(:empty){margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
.pb-elo h3{margin:0 0 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pb-elo .pb-tiers{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:1100px){ .pb-tiers,.pb-elo .pb-tiers{grid-template-columns:repeat(2,minmax(0,1fr))} .pb-nums{display:flex;flex-wrap:wrap} }
@media(max-width:640px){ .card.pb{padding:16px 14px} .pb-tiers,.pb-elo .pb-tiers{grid-template-columns:minmax(0,1fr)} .pb-lbl{min-width:0;flex-basis:100%} .pb-ctl{padding:12px} .pb-glist{grid-template-columns:repeat(2,minmax(0,1fr))} .pb-seg{display:flex;width:100%} .pb-seg button{flex:1 1 auto;padding:8px 10px}
  .pb-chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%} .pb-chip{border-radius:12px;padding:7px 10px;line-height:1.25} .pb-chip small{display:block} .pb-chip span{min-width:0} }
/* the parlay card: what it pays sits under the legs behind a divider, then the actions behind another */
.pays{margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}
""")

# the Parlay Builder tab: the panel over the builder; the Suggested parlays window goes
sub1(P1, """
<section id="tab-parlay" hidden>
  <div id="parlayBody"></div>
  <div id="suggModal" class="modal" hidden>
    <div class="modal-panel" role="dialog" aria-modal="true" aria-label="Suggested parlays">
      <div id="suggView"></div>
    </div>
  </div>
</section>

""",
"""
<section id="tab-parlay" hidden>
  <div id="pbPanel"></div>
  <div id="parlayBody"></div>
</section>

""")

# the version
sub1(P2, """   moves on every run of the job and a published change always reaches every device. */
let DATA_STAMP='baseline';
const APP_BUILD='app v85 \\u00b7 2026-10-10';
const GAMES_URL='https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';

""",
"""   moves on every run of the job and a published change always reaches every device. */
let DATA_STAMP='baseline';
const APP_BUILD='app v86 \\u00b7 2026-10-10';
const GAMES_URL='https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';

""")

# the game total: its chance, its price, its leg, and its settlement
sub1(P2, """  return {p:isHome?pH:1-pH,line:isHome?-g.sp:g.sp,mu:isHome?mu:-mu};
}
/* chance of k or more touchdowns from the any-time chance p, touchdowns treated as Poisson */
function tdPlus(p,k){ const lam=-Math.log(Math.max(1e-9,1-Math.min(p,1-1e-9))); let s=0,t=1; for(let i=0;i<k;i++){ s+=t; t*=lam/(i+1); } return Math.max(0,Math.min(1,1-Math.exp(-lam)*s)); }
function isGameLeg(l){ return l&&(l.stat==='ml'||l.stat==='ats'); }
function settleGameLeg(l){
  const g=S.sched.find(x=>x.id===l.gid); if(!g||!hasScore(g)) return null;
  const margin=l.team===g.h?g.hs-g.as:g.as-g.hs;
  const v=l.stat==='ml'?margin:margin+l.k;   /* l.k is the team's spread line */
""",
"""  return {p:isHome?pH:1-pH,line:isHome?-g.sp:g.sp,mu:isHome?mu:-mu};
}
/* ---------- the game total: over or under the posted points ----------
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
}
function totalBook(g,side){ const v=side==='under'?g.tou:g.tov; return (v!=null&&isFinite(v)&&v!==0)?v:null; }
/* the leg itself, as the builder and the suggestions carry it: one key a game, so its over and
   its under can never both be on a parlay */
function totalLeg(g,side){
  const b=totalBet(g,side); if(!b) return null;
  const book=totalBook(g,side);
  return {key:legKey(g.id,'game','total'),gid:g.id,pid:'game',stat:'total',k:b.line,side,main:true,p:b.p,
    price:book!=null?book:TOTAL_EST,src:book!=null?'real':'est',mu:b.mu,
    name:`${TEAM_NAMES[g.a]||g.a} at ${TEAM_NAMES[g.h]||g.h}`,pos:'Game',grp:'TEAM',team:g.a,opp:g.h,week:g.w,
    label:`${side==='under'?'Under':'Over'} ${b.line} points`};
}
/* chance of k or more touchdowns from the any-time chance p, touchdowns treated as Poisson */
function tdPlus(p,k){ const lam=-Math.log(Math.max(1e-9,1-Math.min(p,1-1e-9))); let s=0,t=1; for(let i=0;i<k;i++){ s+=t; t*=lam/(i+1); } return Math.max(0,Math.min(1,1-Math.exp(-lam)*s)); }
function isGameLeg(l){ return l&&(l.stat==='ml'||l.stat==='ats'||l.stat==='total'); }
function settleGameLeg(l){
  const g=S.sched.find(x=>x.id===l.gid); if(!g||!hasScore(g)) return null;
  /* a game total: the final's points against the line, on the side bet */
  if(l.stat==='total'){ const t=g.hs+g.as, k=+l.k; if(t===k) return 'push'; return (l.side==='under'?t<k:t>k)?'win':'loss'; }
  const margin=l.team===g.h?g.hs-g.as:g.as-g.hs;
  const v=l.stat==='ml'?margin:margin+l.k;   /* l.k is the team's spread line */
""")

# a total against the other legs of its game
sub1(P2, """
/* ---------- correlated parlays: gaussian copula over the shipped pair table ---------- */
function legRho(a,b){
  if(a.gid!==b.gid) return 0;
  /* game legs: unrelated to player legs (not measured); two from the same game are strongly related */
  if(isGameLeg(a)||isGameLeg(b)){ if(!(isGameLeg(a)&&isGameLeg(b))) return 0; const same=a.team===b.team; return a.stat===b.stat?(same?0.95:-0.95):(same?0.75:-0.75); }
""",
"""
/* ---------- correlated parlays: gaussian copula over the shipped pair table ---------- */
/* a game total against the player lines of its own game: how a stat's miss (his line against his
   last five games, weighted) moved with the total's miss (the final's points against the posted
   total), as normal-score correlations over 2019-2024's regular season, starters only, from
   raw/feat.pkl and games.csv. Passing touchdowns and yards ride with the total; a kicker's field
   goals a little against it. Below 0.03 is left out as nothing. */
const TOTAL_RHO={'QB:attempts':0.10,'QB:completions':0.16,'QB:passing_yards':0.29,'QB:passing_tds':0.44,'QB:rushing_yards':0.05,
  'RB:rushing_yards':0.06,'RB:receiving_yards':0.06,'RB:scrim_yards':0.08,'RB:any_td':0.17,
  'WR:receptions':0.12,'WR:receiving_yards':0.16,'WR:any_td':0.17,
  'TE:receptions':0.07,'TE:receiving_yards':0.12,'TE:any_td':0.12,
  'K:fg_att':-0.07,'K:kick_pts':0.14};
function legRho(a,b){
  if(a.gid!==b.gid) return 0;
  /* the total moves with its game's passing and scoring lines (TOTAL_RHO, the side of each leg
     is the leg's own); with a win or cover bet on the same game hardly at all (0.05 for a cover
     and 0.01 for a win, measured on 2010-2025), so not at all here */
  if(a.stat==='total'||b.stat==='total'){
    if(a.stat==='total'&&b.stat==='total') return 0.95;
    const o=a.stat==='total'?b:a; return isGameLeg(o)?0:(TOTAL_RHO[o.grp+':'+o.stat]||0); }
  /* game legs: unrelated to player legs (not measured); two from the same game are strongly related */
  if(isGameLeg(a)||isGameLeg(b)){ if(!(isGameLeg(a)&&isGameLeg(b))) return 0; const same=a.team===b.team; return a.stat===b.stat?(same?0.95:-0.95):(same?0.75:-0.75); }
""")

# a total followed live
sub1(P2, """  if(mine==null||theirs==null) return {val:null,k:+leg.k||0,need:null,state:'unknown'};
  const done=sc.state==='post';
  if(leg.stat==='ml'){ const up=mine-theirs;
    return {val:up,k:0,need:null,state:done?(up>0?'hit':(up===0?'push':'missed')):'live'}; }
""",
"""  if(mine==null||theirs==null) return {val:null,k:+leg.k||0,need:null,state:'unknown'};
  const done=sc.state==='post';
  /* a game total: points only go up, so an over is won the moment the total passes the line
     and an under lost; each otherwise waits for the final */
  if(leg.stat==='total'){ const t=sc.hs+sc.as, k=+leg.k||0, under=leg.side==='under';
    if(t>k) return {val:t,k,need:null,state:under?'missed':'hit'};
    return {val:t,k,need:under?null:+(k-t).toFixed(1),state:done?(t===k?'push':(under?'hit':'missed')):'live'}; }
  if(leg.stat==='ml'){ const up=mine-theirs;
    return {val:up,k:0,need:null,state:done?(up>0?'hit':(up===0?'push':'missed')):'live'}; }
""")

# the Game bets card: the result mark shared by the team rows and the total
sub1(P3, """  return bits.join(' &nbsp;\\u00b7&nbsp; ');
}
/* the Game bets card at the top of a game: both teams, to win and to cover */
function gameBetsCard(g,locked){
  const rows=[g.a,g.h].map(team=>{
    const ml=gameBet(g,team,'ml'), ats=gameBet(g,team,'ats'); const isHome=team===g.h;
""",
"""  return bits.join(' &nbsp;\\u00b7&nbsp; ');
}
/* the Game bets card at the top of a game: both teams, to win and to cover, and the game total */
function gameBetsCard(g,locked){
  const mark=r=>r==null?'<span class="res">–</span>':(r==='win'?'<span class="res win">✓</span>':(r==='loss'?'<span class="res loss">✗</span>':'<span class="res">push</span>'));
  const rows=[g.a,g.h].map(team=>{
    const ml=gameBet(g,team,'ml'), ats=gameBet(g,team,'ats'); const isHome=team===g.h;
""")

# (the mark moves up)
sub1(P3, """    const kML=legKey(g.id,'team:'+team,'ml'), kATS=legKey(g.id,'team:'+team,'ats');
    const onML=!!S.parlay[kML], onATS=!!S.parlay[kATS];
    const mark=r=>r==null?'<span class="res">–</span>':(r==='win'?'<span class="res win">✓</span>':(r==='loss'?'<span class="res loss">✗</span>':'<span class="res">push</span>'));
    const rML=locked?settleGameLeg({gid:g.id,team,stat:'ml',k:0}):null;
    const rATS=(locked&&ats)?settleGameLeg({gid:g.id,team,stat:'ats',k:ats.line}):null;
""",
"""    const kML=legKey(g.id,'team:'+team,'ml'), kATS=legKey(g.id,'team:'+team,'ats');
    const onML=!!S.parlay[kML], onATS=!!S.parlay[kATS];
    const rML=locked?settleGameLeg({gid:g.id,team,stat:'ml',k:0}):null;
    const rATS=(locked&&ats)?settleGameLeg({gid:g.id,team,stat:'ats',k:ats.line}):null;
""")

# the Game bets card: the game total, over and under
sub1(P3, """    return h+'</table></div>';
  }).join('');
  return `<div class="card gbets"><h2>Game bets</h2>
    <p class="muted" style="margin:0 0 10px">${locked?'How each side did against the money line and the spread.':'A team to win, or to cover the spread. Tick one and it joins the parlay like any player line.'} Chances come from our team ratings, pulled halfway to the posted line, with the final margin treated as spread about 13.5 points around that. A game leg is priced as unrelated to player legs, because that relationship has not been measured here.</p>
    ${lineSource(g)?`<p class="muted" style="margin:0 0 8px;font-size:12px">Lines: ${esc(lineSource(g))}.</p>`:''}${rows}${!gameBet(g,g.h,'ats')?'<p class="muted" style="margin:0">No spread posted yet, so only the money line is offered.</p>':''}</div>`;
}
/* the ladders are hidden unless turned on: without a real price they cannot be bet
""",
"""    return h+'</table></div>';
  }).join('');
  /* the game total, over or under: one leg a game, so ticking one side takes the other off. The
     book's price where the payload has one; -110 marked est. where it has none */
  let tot='';
  const tb=totalBet(g,'over');
  if(tb){ const kT=legKey(g.id,'game','total'), cur=S.parlay[kT];
    const trow=side=>{ const l=totalLeg(g,side), on=!!cur&&cur.side===side&&cur.k===l.k, [c,lbl]=confTier(l.p);
      const res=locked?settleGameLeg({gid:g.id,stat:'total',side,k:l.k}):null;
      return `<tr class="${on?'on':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">
        <td class="pick">${locked?mark(res):`<input type="checkbox" ${on?'checked':''} data-leg="${kT}" data-k="${l.k}" data-side="${side}" data-main="1" aria-label="Add ${side} ${l.k} points, ${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}">`}</td>
        <td class="thr">${side==='under'?'Under':'Over'} ${l.k}</td>
        <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${Math.max(2,l.p*100).toFixed(0)}%"></div></div></td>
        <td class="pct">${(l.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
        <td class="num est">${l.src==='real'?'':`${fmtML(TOTAL_EST)}<em>est.</em>`}</td>
        <td class="num book real">${l.src==='real'?fmtML(l.price):''}</td></tr>`; };
    tot=`<div class="statblk"><h4>Game total <em>our total ${tb.mu.toFixed(1)}</em><em class="mline">book line ${tb.line}</em></h4><table class="rungs">${trow('over')}${trow('under')}</table></div>`; }
  return `<div class="card gbets"><h2>Game bets</h2>
    <p class="muted" style="margin:0 0 10px">${locked?'How each side did against the money line, the spread and the total.':'A team to win, or to cover the spread, or the game total over or under. Tick one and it joins the parlay like any player line.'} Chances come from our team ratings, pulled halfway to the posted line, with the final margin treated as spread about 13.5 points around that; the total from our own points for each side, pulled halfway to the posted total, spread about 13.2 points. A win or cover leg is priced as unrelated to player legs, which has not been measured here; a total moves with its game's passing and scoring lines, measured on 2019 to 2024.</p>
    ${lineSource(g)?`<p class="muted" style="margin:0 0 8px;font-size:12px">Lines: ${esc(lineSource(g))}.</p>`:''}${rows}${tot}${!gameBet(g,g.h,'ats')?'<p class="muted" style="margin:0">No spread posted yet, so only the money line is offered.</p>':''}${tb&&totalBook(g,'over')==null?'<p class="muted" style="margin:6px 0 0;font-size:12px">No over or under price on file for this total yet: the -110 is an estimate, and no suggested parlay is built on it.</p>':''}</div>`;
}
/* the ladders are hidden unless turned on: without a real price they cannot be bet
""")

# the game page's side switch no longer refreshes a window
sub1(P3, """    e.stopPropagation();
    toggleLeg(cb.dataset.leg, +cb.dataset.k, g, cb.dataset.side||'over', cb.dataset.main==='1'); }));
  /* the same side switch as the Suggested parlays window, one setting for both */
  $('gameView').querySelectorAll('[data-gsugg-side]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.suggestSide=b.dataset.gsuggSide; save(); renderGame(); renderParlay(); if(suggestOpen()) fillSuggest(); }));
  /* a tier's Add all: every leg of that hand on the parlay, skipping any already there */
  $('gameView').querySelectorAll('[data-gtier-add]').forEach(b=>b.addEventListener('click',()=>{
""",
"""    e.stopPropagation();
    toggleLeg(cb.dataset.leg, +cb.dataset.k, g, cb.dataset.side||'over', cb.dataset.main==='1'); }));
  /* the game page's own side switch (the Parlay Builder's suggestions have their own boxes) */
  $('gameView').querySelectorAll('[data-gsugg-side]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.suggestSide=b.dataset.gsuggSide; save(); renderGame(); renderParlay(); }));
  /* a tier's Add all: every leg of that hand on the parlay, skipping any already there */
  $('gameView').querySelectorAll('[data-gtier-add]').forEach(b=>b.addEventListener('click',()=>{
""")

# Escape and a click outside no longer close a window that is gone
sub1(P3, """$('slateNow')?.addEventListener('click',()=>{ LIVE.slate=true; LIVE.err=null; slateStamp(); liveRefresh(); });
['trackMarket','trackKind'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change',renderTrack); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('gameModal').hidden) closeGame();
  else if(e.key==='Escape'&&suggestOpen()) closeSuggest(); });
$('gameModal').addEventListener('click',e=>{ if(e.target===$('gameModal')) closeGame(); });
$('suggModal').addEventListener('click',e=>{ if(e.target===$('suggModal')) closeSuggest(); });
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
""",
"""$('slateNow')?.addEventListener('click',()=>{ LIVE.slate=true; LIVE.err=null; slateStamp(); liveRefresh(); });
['trackMarket','trackKind'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change',renderTrack); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('gameModal').hidden) closeGame(); });
$('gameModal').addEventListener('click',e=>{ if(e.target===$('gameModal')) closeGame(); });
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
""")

# the panel's choices, kept in the visitor's own state
sub1(P3, """  }
  /* the view resets, but a toggle the reader set is theirs */
  S.ui={game:null,open:{},showAll:false,showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),suggestSide:['over','under'].includes(saved&&saved.ui&&saved.ui.suggestSide)?saved.ui.suggestSide:'any'};
  S.inactive=S.inactive||{}; S.depth=S.depth||{};
  S.odds=S.odds||{}; S.parlay=S.parlay||{}; if(S.stake==null) S.stake=20; S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{};
""",
"""  }
  /* the view resets, but a toggle the reader set is theirs */
  S.ui={game:null,open:{},showAll:false,showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),suggestSide:['over','under'].includes(saved&&saved.ui&&saved.ui.suggestSide)?saved.ui.suggestSide:'any',
    pb:pbClean(saved&&saved.ui&&saved.ui.pb)};
  S.inactive=S.inactive||{}; S.depth=S.depth||{};
  S.odds=S.odds||{}; S.parlay=S.parlay||{}; if(S.stake==null) S.stake=20; S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{};
""")

# the half-minute look for a game that kicked off
sub1(P3, """  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  { const bt=$('buildTag'); if(bt) bt.textContent=`${MODEL_BUILD} \\u00b7 ${APP_BUILD}`; }
  renderAll();
  $('rebuildNote').hidden=!rebuilt;
  if(rebuilt){ $('rebuildNote').textContent=rebuilt; setTimeout(()=>log(rebuilt,'warn'),0); }
""",
"""  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  { const bt=$('buildTag'); if(bt) bt.textContent=`${MODEL_BUILD} \\u00b7 ${APP_BUILD}`; }
  renderAll(); pbWatch();
  $('rebuildNote').hidden=!rebuilt;
  if(rebuilt){ $('rebuildNote').textContent=rebuilt; setTimeout(()=>log(rebuilt,'warn'),0); }
""")

# a fresh games.csv brings the total's prices too
sub1(P3, """      const sp=parseFloat(row.spread_line), tot=parseFloat(row.total_line);
      g.sp=isFinite(sp)?sp:g.sp; g.tot=isFinite(tot)?tot:g.tot;
      for(const [f,c] of [['mla','away_moneyline'],['mlh','home_moneyline'],['spa','away_spread_odds'],['sph','home_spread_odds']]){ const v=parseFloat(row[c]); if(isFinite(v)) g[f]=v; }
      const hs=parseFloat(row.home_score), as_=parseFloat(row.away_score);
      if(isFinite(hs)&&isFinite(as_)){ g.hs=hs; g.as=as_; } upd++;
""",
"""      const sp=parseFloat(row.spread_line), tot=parseFloat(row.total_line);
      g.sp=isFinite(sp)?sp:g.sp; g.tot=isFinite(tot)?tot:g.tot;
      for(const [f,c] of [['mla','away_moneyline'],['mlh','home_moneyline'],['spa','away_spread_odds'],['sph','home_spread_odds'],['tov','over_odds'],['tou','under_odds']]){ const v=parseFloat(row[c]); if(isFinite(v)) g[f]=v; }
      const hs=parseFloat(row.home_score), as_=parseFloat(row.away_score);
      if(isFinite(hs)&&isFinite(as_)){ g.hs=hs; g.as=as_; } upd++;
""")

# a total into the builder
sub1(P3, """  const [gid,pid,stat]=key.split('|');
  const game=g||S.sched.find(x=>x.id===gid);
  if(stat==='ml'||stat==='ats'){
    if(!game) return; const team=pid.replace(/^team:/,''); const b=gameBet(game,team,stat); if(!b) return;
""",
"""  const [gid,pid,stat]=key.split('|');
  const game=g||S.sched.find(x=>x.id===gid);
  if(stat==='total'){
    if(!game) return; const l=totalLeg(game,side==='under'?'under':'over'); if(!l) return;
    const {key:_k,...leg}=l; S.parlay[key]=leg;
    save(); renderGame(); renderParlay(); return;
  }
  if(stat==='ml'||stat==='ats'){
    if(!game) return; const team=pid.replace(/^team:/,''); const b=gameBet(game,team,stat); if(!b) return;
""")

# the lines the suggestions use, totals with a real price added for the panel
sub1(P3, """  return Object.values(g).some(n=>n>1); };

/* ---------- suggested parlays: safe, medium, aggressive ----------
   One core parlay grown in three steps. Each tier has a floor on the chance that every leg
   lands and a leg cap; the next leg is always the one with the best expected return
   (chance x payout, real correlations) that keeps the parlay above the floor. */
const SUGGEST_TIERS=[['safe','Safe',0.50,3],['med','Medium',0.30,5],['aggr','Aggressive',0.15,8]];
let SUGGEST_CACHE=null;
/* every line this week with a real sportsbook price, game bets and players, unjudged */
function pricedLegs(games){
  const w=currentWeek(); const out=[];
  for(const g of (games||gamesIn(w))){
    if(gameStarted(g)) continue;
    for(const team of [g.a,g.h]){
      const isHome=team===g.h, opp=isHome?g.a:g.h;
""",
"""  return Object.values(g).some(n=>n>1); };

/* ---------- the lines the suggestions are built from ---------- */
/* every line this week with a real sportsbook price, game bets and players, unjudged. withTotals
   adds each game's total, over and under, where the book's price for it is on file: the Parlay
   Builder's suggestions use them; a game page's own suggestions and the Elo picks do not */
function pricedLegs(games,withTotals){
  const w=currentWeek(); const out=[];
  for(const g of (games||gamesIn(w))){
    if(gameStarted(g)) continue;
    if(withTotals) for(const side of ['over','under']){ const l=totalLeg(g,side); if(l&&l.src==='real') out.push(l); }
    for(const team of [g.a,g.h]){
      const isHome=team===g.h, opp=isHome?g.a:g.h;
""")

# the old engine out, the panel's engine in
sub1(P3, """}
function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
/* the side switch in the Suggested parlays window: Any, or player overs only, or player
   unders only. A touchdown leg is an over; a game bet has no side and drops out. */
const SUGGEST_SIDES=[['any','Any'],['over','Player overs'],['under','Player unders']];
function suggestSide(){ const s=S.ui&&S.ui.suggestSide; return s==='over'||s==='under'?s:'any'; }
function sideAllows(c){ const s=suggestSide(); return s==='any'||(c.grp!=='TEAM'&&c.side===s); }
function suggestCandidates(games){
  const out=pricedLegs(games);
  const edge=c=>c.p-mlProb(c.price);
  /* Player overs has no minimum: the best overs on offer, ranked by how far the model and
     market + form together put each above the book, whether or not either clears it */
  if(suggestSide()==='over'){
    const both=c=>{ const a=typeof window.eloAltP==='function'?window.eloAltP(c.pid,c.side,c.price,c.src):null;
      return a==null?edge(c):(edge(c)+(a-mlProb(c.price)))/2; };
    return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&sideAllows(c)).sort((a,b)=>both(b)-both(a)).slice(0,40);
  }
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&edge(c)>=0.03&&formAgrees(c)&&sideAllows(c)).sort((a,b)=>edge(b)-edge(a)).slice(0,40);
}
function buildSuggestions(){
  const cands=suggestCandidates();
  /* what a book pays for these legs together: same-game legs priced as one, cross-game legs multiplied */
  const dec=(legs,sims)=>parlayDec(legs.map(l=>({leg:l,ml:l.price})),sims);
  const chance=(legs,sims)=>legs.length?parlayProb(legs,sims).corr:1;
  const tiers=[]; let cur=[];
  for(const [id,label,floor,cap] of SUGGEST_TIERS){
    const startLen=cur.length;
    /* every tier grows the one before: Safe starts from its two most likely legs, Medium and
       Aggressive each take at least one more leg (the best expected return), then keep adding
       while the parlay stays above the tier's floor */
    const must=id==='safe'?2:startLen+1;
    while(cur.length<cap){
      let best=null;
      for(const c of cands){
        if(cur.some(l=>l.key===c.key)) continue;
        if(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM'&&l.gid===c.gid)) continue;
        const next=[...cur,c], p=chance(next,3000);
        const forced=next.length<=must;
        if(!forced&&p<floor) continue;
        const score=(forced&&id==='safe')?p:p*dec(next,2000);
        if(!best||score>best.score) best={c,score};
      }
      if(!best) break;
      cur=[...cur,best.c];
    }
    if(cur.length<2||cur.length===startLen) continue;
    const pr=parlayProb(cur,40000);
    tiers.push({id,label,floor,legs:cur.map(l=>({...l})),corr:pr.corr,indep:pr.indep,dec:dec(cur),added:cur.length-startLen});
  }
  return {tiers,candidates:cands.length};
}
/* ---------- the game page's suggested parlays: High, Medium, Low ----------
""",
"""}
function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
/* the side switch on a game page's suggested parlays: Any, or player overs only, or player
   unders only. A touchdown leg is an over; a game bet has no side and drops out. */
const SUGGEST_SIDES=[['any','Any'],['over','Player overs'],['under','Player unders']];
function suggestSide(){ const s=S.ui&&S.ui.suggestSide; return s==='over'||s==='under'?s:'any'; }
function sideAllows(c){ const s=suggestSide(); return s==='any'||(c.grp!=='TEAM'&&c.side===s); }
/* ---------- the Parlay Builder's suggested parlays: built from what the reader ticks ----------
   A panel over the builder. The reader picks the bet types (a mix of all of them, team bets
   only or player bets only, or any of the five boxes by hand) and which of the week's games
   still to kick off, and four tiers are built from those alone, each on its own: Safe, the
   likeliest 2-leg parlay; Medium, Aggressive and Extreme, the 3-, 4- and 5-leg parlay with the
   best expected return (the chance all legs land times what it pays) that still lands at least
   25%, 12% and 5% of the time: a floor that falls tier by tier, about 63%, 59% and 55% a leg on
   average, so a longer parlay asks a little less of each leg. Under All nothing forces or caps a
   kind: a tier holds whatever mix of team and player legs does best by those rules.

   A leg qualifies as the old Suggested parlays window's did: a real sportsbook price, the
   model's chance between 45% and 97% and at least 3 points above the book's implied chance,
   and for a player leg market + form agreeing (formAgrees). When those cannot fill a tier, the
   fewest legs the model still rates at or above the book fill it, marked thin edge; never a
   leg the model rates below the book. At most one game leg (to win, to cover, the total) a
   game, one leg a player, and no line twice: a line's over and under, or a player's main line
   and a rung of the same stat, are one key. A tier that cannot be built says why rather than show a smaller
   parlay. Its chance and price are the builder's own sums (parlayProb, parlayDec, same-game
   legs priced together with the model's correlations), worked on the legs in the builder's
   order, so Add to builder shows the same numbers. Searched, not enumerated: a beam of the best
   partial parlays at each size, once by expected return and once by chance, so a floor a
   long-shot start cannot reach is still met. The choices are the reader's own, in S.ui.pb; the
   tiers are cached on everything they stand on (PB_CACHE), so ticking back is instant. */
const PB_KINDS=[['ml','Moneyline','straight up'],['ats','Spread','to cover'],['total','Game total','over/under'],['over','Player overs',''],['under','Player unders','']];
const PB_MIXES=[['all','All',['ml','ats','total','over','under']],['teams','Teams only',['ml','ats','total']],['players','Players only',['over','under']]];
const PB_TIERS=[['safe','Safe',2,0],['med','Medium',3,0.25],['aggr','Aggressive',4,0.12],['xtrm','Extreme',5,0.05]];
const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_STAKE=10, PB_CAP=40, PB_BEAM=12, PB_FINAL=8;
let PB_CACHE=new Map(), PB_SHOWN=null;
/* the reader's choices as saved, cleaned: every box on unless it was turned off, the games
   unticked (a game is ticked unless it is listed), and whether the games list is open */
function pbClean(v){
  const o=v&&typeof v==='object'?v:{}, k={};
  for(const [id] of PB_KINDS) k[id]=!(o.k&&o.k[id]===false);
  const off=Array.isArray(o.off)?o.off.filter(x=>typeof x==='string'&&/^[\\w-]{3,40}$/.test(x)).slice(-64):[];
  return {k,off,gx:typeof o.gx==='boolean'?o.gx:null};
}
function pbUi(){ if(!S.ui) S.ui={}; return (S.ui.pb=pbClean(S.ui.pb)); }
/* a leg's box: a game bet by what it is, a player leg by its side (a touchdown and a ladder rung are overs) */
function pbKind(l){ return l.stat==='ml'||l.stat==='ats'||l.stat==='total'?l.stat:(l.side==='under'?'under':'over'); }
/* the mix the boxes make: one of the three, or none of them */
function pbMix(u){ const on=PB_KINDS.map(([k])=>k).filter(k=>u.k[k]).join(); const m=PB_MIXES.find(x=>x[2].join()===on); return m?m[0]:'custom'; }
/* the week's games still to kick off (and with no score): the list the reader ticks from */
function pbGames(){ return gamesIn(currentWeek()).filter(g=>!gameStarted(g)&&!hasScore(g)); }
/* a leg the reader's picks allow: its box ticked and its game ticked */
function pbAllows(l){ const u=pbUi(); return !!u.k[pbKind(l)]&&!u.off.includes(l.gid); }
function pbPlayerSides(){ const u=pbUi(); return !!(u.k.over||u.k.under); }
const pbOrd=(a,b)=>(a.key+'|'+a.side+'|'+a.k).localeCompare(b.key+'|'+b.side+'|'+b.k);
/* the builder's order (parlayLegs): the week, then the name. The tier's numbers are worked on
   the legs in this order, so the builder, which works them the same way, shows the same */
const pbOrder=legs=>[...legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name)));
/* a long list is cut to the likeliest half and the best-paying half, so the search stays quick */
function pbCap(list){
  list=[...list].sort(pbOrd); if(list.length<=PB_CAP) return list;
  const by=f=>[...list].sort((a,b)=>(f(b)-f(a))||pbOrd(a,b)), keep=new Map();
  for(const c of [...by(c=>c.p).slice(0,PB_CAP/2),...by(c=>c.p*(mlToDec(c.price)||1)).slice(0,PB_CAP/2)]) keep.set(c.key+'|'+c.side+'|'+c.k,c);
  return [...keep.values()].sort(pbOrd);
}
/* the legs on the reader's picks: preferred (the full bar) and thin (at or above the book, no more) */
function pbPool(games){
  const edge=c=>c.p-mlProb(c.price), formOut=typeof window.eloLoaded==='function'&&!window.eloLoaded();
  const pref=[], thin=[];
  for(const c of pricedLegs(games,true)){
    if(!pbAllows(c)||c.src!=='real'||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;
    /* until the Elo files are in, no player leg qualifies at all, as before */
    if(c.grp!=='TEAM'&&formOut) continue;
    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});
  }
  return {pref:pbCap(pref),thin:pbCap(thin)};
}
/* a leg that can join: not a line already on it, not a second game leg on one game, and not a
   second leg on one player (two lines on one man, his catches and his yards, are nearly one bet) */
function pbFits(cur,c){
  if(cur.some(l=>l.key===c.key)) return false;
  if(isGameLeg(c)) return !cur.some(l=>isGameLeg(l)&&l.gid===c.gid);
  return !cur.some(l=>!isGameLeg(l)&&l.pid===c.pid);
}
/* the most legs a list can make together: one a player, one game leg a game */
function pbMaxLegs(list){ const pl=new Set(), games=new Set(); for(const l of list){ if(isGameLeg(l)) games.add(l.gid); else pl.add(l.pid); } return pl.size+games.size; }
/* The search scores thousands of partial parlays, too many for the builder's Monte Carlo sums,
   so it scores each on the legs' own chances times, for every pair that moves together, how
   much likelier the pair is than the two apart: the same gaussian copula and correlations as
   parlayProb, worked exactly for each pair (Plackett's integral, ten-point Gauss-Legendre).
   That is exact for two legs and close for more. Only the finalists are then worked with the
   real sums, and those are the numbers shown and the floors are held to. */
const PB_GLX=[-0.9739065285171717,-0.8650633666889845,-0.6794095682990244,-0.4333953941292472,-0.1488743389816312,0.1488743389816312,0.4333953941292472,0.6794095682990244,0.8650633666889845,0.9739065285171717];
const PB_GLW=[0.0666713443086881,0.1494513491505806,0.2190863625159820,0.2692667193099963,0.2955242247147529,0.2955242247147529,0.2692667193099963,0.2190863625159820,0.1494513491505806,0.0666713443086881];
/* P(X<h, Y<k) for two standard normals correlated r */
function bvnLower(h,k,r){
  const a=Math.asin(Math.max(-0.9999,Math.min(0.9999,r))); let s=0;
  for(let i=0;i<10;i++){ const t=a*(PB_GLX[i]+1)/2, c=Math.cos(t); s+=PB_GLW[i]*Math.exp(-(h*h-2*h*k*Math.sin(t)+k*k)/(2*c*c)); }
  return Math.max(0,gbNorm(h)*gbNorm(k)+s*a/(4*Math.PI));
}
const pbId=l=>l.key+'|'+l.side+'|'+l.k;
/* the chance every leg lands, each leg's chance from pf: the legs' own, times each moving pair's lift */
function pbJoint(legs,pf,memo){
  let p=1; for(const l of legs) p*=pf(l);
  for(let i=0;i<legs.length;i++) for(let j=i+1;j<legs.length;j++){
    const a=legs[i], b=legs[j], r=legRho(a,b); if(Math.abs(r)<0.03) continue;
    const key=pbId(a)+'~'+pbId(b)+'~'+(pf===mlP?'b':'m'); let lift=memo.get(key);
    if(lift==null){ const pa=pf(a), pb=pf(b), da=a.side==='under'?-1:1, db=b.side==='under'?-1:1;
      lift=bvnLower(-invNorm(1-pa),-invNorm(1-pb),da*db*r)/(pa*pb); memo.set(key,lift); }
    p*=lift; }
  return Math.max(0,Math.min(1,p));
}
const mlP=l=>mlProb(l.price), modelP=l=>l.p;
/* what a book pays, as parlayDec works it: legs in different games multiplied, a game's legs
   priced together from the book's own chances and cut by SGP_HOLD, never above multiplying */
function pbDecApprox(legs,memo){
  const by={}; for(const l of legs) (by[l.gid]=by[l.gid]||[]).push(l);
  let d=1;
  for(const gid in by){ const grp=by[gid], mult=grp.reduce((a,l)=>a*(mlToDec(l.price)||1),1);
    if(grp.length<2){ d*=mult; continue; }
    const pj=pbJoint(grp,mlP,memo); d*=(pj>0&&isFinite(pj))?Math.min(mult,(1/pj)*SGP_HOLD):mult; }
  return d;
}
function pbEval(legs,memo){
  const id=legs.map(pbId).sort().join(',');
  let e=memo.get(id); if(e) return e;
  const pr=pbJoint(legs,modelP,memo), d=pbDecApprox(legs,memo);
  e={legs,pr,d,ev:pr*d,id}; memo.set(id,e); return e;
}
/* the beam: every partial parlay one leg longer, the best `width` of them by `by` kept at each
   size; one well under the floor is dropped as soon as it is (another leg only lowers it) */
function pbBeam(pools,floor,by,width,memo){
  let beam=[{legs:[],id:''}];
  for(let s=0;s<pools.length;s++){
    const next=new Map();
    for(const b of beam) for(const c of pools[s]){ if(!pbFits(b.legs,c)) continue;
      const e=pbEval([...b.legs,c],memo); if(next.has(e.id)||(floor&&e.pr<floor*0.9)) continue; next.set(e.id,e); }
    if(!next.size) return [];
    beam=[...next.values()].sort((a,b)=>(b[by]-a[by])||a.id.localeCompare(b.id)).slice(0,width);
  }
  return beam;
}
/* a finalist with the builder's own sums, on the legs in the builder's order */
function pbExact(legs){
  const L=pbOrder(legs.map(l=>({...l}))), pr=parlayProb(L);
  return {legs:L,corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price}))),thin:L.filter(l=>l.thin).length};
}
/* one tier: preferred legs alone first, then with k legs from the thin list, fewest first. The
   best few by the search's own score are worked exactly, and the best of those that clears the
   floor is the tier */
function pbTier([id,label,n,floor],pool,memo){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=n;k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    const fin=new Map();
    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',PB_BEAM,memo),...pbBeam(pools,floor,'pr',PB_BEAM,memo)]) fin.set(e.id,e);
    /* the finalists that clear the floor by the search's own score, best first, worked with the
       real sums on fewer draws; then the best in full, which is what the card shows and what the
       floor is held to */
    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort((a,b)=>((floor?b.ev-a.ev:b.pr-a.pr))||a.id.localeCompare(b.id)).slice(0,PB_FINAL)
      .map(e=>{ const L=pbOrder(e.legs), pr=parlayProb(L,6000).corr, d=parlayDec(L.map(l=>({leg:l,ml:l.price})),4000); return {e,sc:floor?pr*d:pr,ok:!floor||pr>=floor*0.97}; })
      .filter(x=>x.ok).sort((a,b)=>(b.sc-a.sc)||a.e.id.localeCompare(b.e.id));
    for(const x of top){ const r=pbExact(x.e.legs); if(!floor||r.corr>=floor) return r; }
  }
  return null;
}
/* why a tier is empty, in the reader's terms */
function pbWhy(n,floor,pool){
  const m=pbMaxLegs([...pool.pref,...pool.thin]);
  if(m<n) return `${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks: tick more games or bet types.`;
  return floor?`No ${n}-leg parlay on your picks lands ${Math.round(floor*100)}% of the time or more: tick more games or bet types.`
    :`No ${n}-leg parlay on your picks: tick more games or bet types.`;
}
function pbBuild(){
  const u=pbUi(), all=pbGames(), games=all.filter(g=>!u.off.includes(g.id)), kinds=PB_KINDS.map(([k])=>k).filter(k=>u.k[k]);
  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,tiers:[],noTotalPrice:false};
  const empty=why=>PB_TIERS.map(([id,label,n,floor])=>({id,label,n,floor,why}));
  if(!all.length){ out.tiers=empty('No games left to build from.'); return out; }
  if(!kinds.length){ out.tiers=empty('No bet types ticked: tick at least one above.'); return out; }
  if(!games.length){ out.tiers=empty('No games ticked: tick at least one above.'); return out; }
  const pool=pbPool(games), memo=new Map();
  out.pref=pool.pref.length; out.thin=pool.thin.length;
  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,floor,pool)}; });
  out.noTotalPrice=!!u.k.total&&games.some(g=>g.tot!=null)&&!games.some(g=>totalBook(g,'over')!=null||totalBook(g,'under')!=null);
  return out;
}
/* the tiers for the picks as they stand, from the cache when nothing they stand on has moved */
function getPbTiers(){
  const u=pbUi(), games=pbGames();
  const sig=[currentWeek(),games.map(g=>g.id).join(','),u.off.filter(id=>games.some(g=>g.id===id)).sort().join(','),PB_KINDS.map(([k])=>u.k[k]?1:0).join(''),
    PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig()].join('|');
  let r=PB_CACHE.get(sig);
  if(!r){ r={sig,...pbBuild()}; PB_CACHE.set(sig,r); if(PB_CACHE.size>24) PB_CACHE.delete(PB_CACHE.keys().next().value); }
  return r;
}
/* ---------- the game page's suggested parlays: High, Medium, Low ----------
""")

# the old window's drawing out, the panel's in
sub1(P3, """    <div class="gsugg-tiers g3">${GAME_TIERS.map(block).join('')}</div></div>`;
}
function getSuggestions(){
  const w=currentWeek(), started=gamesIn(w).filter(gameStarted).length;
  /* everything the candidates are filtered and priced on: a player needs three games played,
     which is the stats that have been counted, so those are part of it */
  const sig=[w,started,JSON.stringify(S.odds||{}).length,PAY.baked_at||'',S.sched.length,
    Object.keys(S.processedGames||{}).length,S.margin||'',formSig(),suggestSide()].join('|');
  if(!SUGGEST_CACHE||SUGGEST_CACHE.sig!==sig) SUGGEST_CACHE={sig,...buildSuggestions()};
  return SUGGEST_CACHE;
}
function suggestCard(){
  /* drawn in its own window, opened from the builder: always open, closed by its button */
  const w=currentWeek(), stake=Math.max(0,+S.stake||0);
  let body='';
  const s=getSuggestions();
  if(!s.tiers.length){
    body=`<p class="muted" style="margin:0">No ${suggestSide()==='any'?'':'player-'+suggestSide()+' '}suggestions for week ${w} yet. They use only lines with a real sportsbook price that the model rates above the book and that market + form, the book's chance moved by the player's Elo, also rates three points above it, ${s.candidates?`and only ${s.candidates} line${s.candidates===1?'':'s'} qualify so far`:'and none qualify yet'}. Player prices arrive with the Thursday and Saturday pulls.${suggestSide()==='any'?'':' Any switches the game bets and the other side back on.'}</p>`;
  } else {
    const tag={safe:'high',med:'med',aggr:'low'};
    body=`<p class="muted" style="margin:0 0 14px">${suggestSide()==='over'?`The best player overs on offer in week ${w}, with no minimum: every over with a real sportsbook price, ranked by how far the model and market + form, the book's chance moved by the player's Elo, together put it above the book. Some sit below the book's price, and the expected return on each parlay says so.`:`Built from week ${w} lines with a real sportsbook price that the model rates above the book and that market + form, the book's chance moved by the player's Elo, also rates three points above it${suggestSide()==='any'?'':`, player ${suggestSide()}s only`}.`} Safe is the most likely pair, kept at 50% or better when the lines allow it; Medium and Aggressive add legs to the same core for a bigger payout. Payouts are on a $${stake.toFixed(2)} bet, which you can change above.${s.tiers[s.tiers.length-1].legs.every(l=>l.grp==='TEAM')?' Only game bets qualify so far; player lines join when this week’s prices are pulled on Thursday and Saturday.':''}</p>
    <div class="sugg-grid">`+s.tiers.map((t,i)=>{
      const payout=stake*t.dec, ev=t.corr*t.dec-1, ml=decToML(t.dec);
      const saved=(S.saved||[]).some(p=>p.suggestSig===SUGGEST_CACHE.sig+'|'+t.id);
      return `<div class="sugg-tier ${t.id}">
        <div class="sugg-top"><span class="sugg-name">${t.label}</span><span class="conf ${tag[t.id]}">${t.legs.length} legs</span>${i?`<span class="muted sugg-add">+${t.added} leg${t.added===1?'':'s'}</span>`:''}</div>
        <div class="sugg-nums">
          <div><b>${(t.corr*100).toFixed(0)}%</b><span>chance all land</span></div>
          <div><b>${fmtML(ml)}</b><span>book price</span></div>
          <div><b class="payout">$${payout.toFixed(2)}</b><span>returns if it lands</span></div>
          <div><b class="${ev>=0?'delta up':'delta down'}">${ev>=0?'+':'−'}${Math.abs(ev*100).toFixed(0)}%</b><span>expected return</span></div>
        </div>
        <ul class="sugg-legs">${t.legs.map(l=>`<li><span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span><span class="pr">${fmtML(l.price)}<em>${(l.p*100).toFixed(0)}%</em></span></li>`).join('')}</ul>
        <button class="btn ${saved?'quiet':'go'}" data-suggest-save="${t.id}" ${saved?'disabled':''}>${saved?'Saved':'Add to saved parlays'}</button>
      </div>`; }).join('')+`</div>
    <p class="muted" style="margin:12px 0 0;font-size:12px">Chances allow for how the legs move together. They are the model's numbers, and its edges over book prices have not held up yet this season, so treat these as the model's view rather than a sure thing.</p>`;
  }
  return `<div class="card sugg" id="suggCard">
    <div class="sugg-hd"><h2>Suggested parlays</h2><span class="pill">week ${w}</span><span class="grow"></span>
      <span class="sugg-side" role="group" aria-label="Which legs to build from">${SUGGEST_SIDES.map(([k,l])=>`<button type="button" class="${suggestSide()===k?'on':''}" data-suggest-side="${k}" aria-pressed="${suggestSide()===k}">${l}</button>`).join('')}</span>
      <label class="muted sugg-stake">Bet $<input type="number" id="suggStake" value="${stake}" min="0" step="1" inputmode="decimal" aria-label="Amount to bet on a suggested parlay"></label>
      ${stakeChips()}
      <button class="btn quiet" id="suggClose">Close</button></div>
    ${body}</div>`;
}
/* the suggestions, in a window opened from the builder. Filling and wiring are separate
   from opening, so saving a tier can redraw what is on screen without scrolling it away. */
function fillSuggest(){ const v=$('suggView'); if(!v) return; v.innerHTML=suggestCard(); wireSuggest(); }
function openSuggest(){ const m=$('suggModal'); if(!m) return; fillSuggest();
  m.hidden=false; document.body.classList.add('modal-open'); m.scrollTop=0; }
function closeSuggest(){ const m=$('suggModal'); if(!m) return;
  m.hidden=true; document.body.classList.remove('modal-open'); }
const suggestOpen=()=>{ const m=$('suggModal'); return !!m&&!m.hidden; };
/* one tap swaps the amount you are betting. It is the one stake the builder and the
   suggestions both price with, so every payout on the tab follows it. */
const STAKE_CHIPS=[1,5,10,20,50,100];
function stakeChips(){ const s=Math.max(0,+S.stake||0);
""",
"""    <div class="gsugg-tiers g3">${GAME_TIERS.map(block).join('')}</div></div>`;
}
/* ---------- the panel, over the builder ---------- */
const pbMoney=v=>'$'+(+v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
/* the games list starts open on a wide screen and shut on a phone, until the reader says otherwise */
function pbWide(){ try{ return typeof window.matchMedia!=='function'||window.matchMedia('(min-width: 761px)').matches; }catch(e){ return true; } }
/* the builder holds exactly these legs */
const pbInBuilder=legs=>Object.keys(S.parlay||{}).length===legs.length&&legs.every(l=>suggestLegOn(l));
/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard) */
function pbTierCard(t,o){
  o=o||{}; const card=!!window.PARLAY_CARD, chance=o.chance!=null?o.chance:t.corr;
  if(t.why) return `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.n} legs</span></div><p class="pb-why">${esc(t.why)}</p></div>`;
  const form=formSig()!=='';
  return `<div class="pb-tier ${t.id}" data-pb-tier="${t.id}">
    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.rule||(t.floor!=null?`<span class="pb-rule">${t.floor?`best return that lands ${Math.round(t.floor*100)}%+`:'the likeliest pair'}</span>`:'')}</div>
    <div class="pb-nums"><div><b>${(chance*100).toFixed(0)}%</b><span>${o.chanceBy||'chance'}</span></div><div><b>${fmtML(decToML(t.dec))}</b><span>price</span></div><div><b>${pbMoney(PB_STAKE*t.dec)}</b><span>$${PB_STAKE} pays</span></div></div>
    <ul class="pb-legs">${t.legs.map(l=>`<li><span class="nm">${o.badge?o.badge(l):''}${esc(l.name)}<small>${esc(l.label)}${l.thin?' <i class="pb-thinmark">thin edge</i>':''}</small></span><span class="pr">${fmtML(l.price)}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span></li>`).join('')}</ul>
    ${t.thin?`<p class="pb-thin">${t.thin===1?'One leg has a thin edge: the model rates it':t.thin+' legs have a thin edge: the model rates them'} at or above the book's price, but not 3 points above${form?' with market + form agreeing':''}.</p>`:''}
    <div class="pb-acts"><button type="button" class="btn ${card?'quiet':'go'}" ${o.add||`data-pb-add="${t.id}"`}>${pbInBuilder(t.legs)?'In the builder':'Add to builder'}</button>${card?`<button type="button" class="btn go" data-pc-finish="${o.kind||'pb'}|${t.id}">Finish</button>`:''}</div></div>`;
}
window.pbTierCard=pbTierCard;
function pbPanel(){
  const u=pbUi(), w=currentWeek(), games=pbGames(), mix=pbMix(u);
  const head=`<div class="pb-hd"><h2>Suggested parlays</h2><span class="pill">week ${w}</span></div>`;
  if(!games.length) return `<div class="card pb" id="pbCard">${head}
    <p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no game is left to build a parlay from.`:`Every week ${w} game has kicked off, so there is nothing left to build from. Week ${w+1} opens once they are final.`}</p></div>`;
  const r=getPbTiers(), nOn=games.filter(g=>!u.off.includes(g.id)).length, open=u.gx!=null?u.gx:pbWide(), form=formSig()!=='';
  const seg=`<span class="pb-seg" role="group" aria-label="What to build from">${PB_MIXES.map(([k,l])=>`<button type="button" class="${mix===k?'on':''}" data-pb-mix="${k}" aria-pressed="${mix===k}">${l}</button>`).join('')}</span>${mix==='custom'?'<span class="pb-custom" title="Your own choice of bet types: none of the three mixes">Custom</span>':''}`;
  const chips=PB_KINDS.map(([k,l,s])=>`<label class="pb-chip${u.k[k]?' on':''}"><input type="checkbox" data-pb-kind="${k}" ${u.k[k]?'checked':''}><span>${l}${s?` <small>${s}</small>`:''}</span></label>`).join('');
  const glist=games.map(g=>{ const on=!u.off.includes(g.id), d=fmtDate(g);
    return `<label class="pb-g${on?' on':''}"><input type="checkbox" data-pb-game="${g.id}" ${on?'checked':''} aria-label="${esc(g.a)} at ${esc(g.h)}, ${esc(d.day)} ${esc(d.t)}"><span><b>${esc(g.a)} @ ${esc(g.h)}</b><small>${esc(d.day)}${d.t?' · '+esc(d.t):''}</small></span></label>`; }).join('');
  const notes=[];
  if(formSig()==='noform') notes.push('The Elo ratings are still loading: player legs join once they are in.');
  if(r.noTotalPrice) notes.push('No over or under price is on file for these games’ totals yet, so no total is in a tier.');
  if(r.kinds&&r.ticked&&!r.pref&&!r.thin) notes.push(`No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices arrive with the Thursday and Saturday pulls.`);
  return `<div class="card pb" id="pbCard">${head}
    <p class="muted pb-lead">Choose what to build from: every tier below uses only the bet types and games ticked here.</p>
    <div class="pb-ctl">
      <div class="pb-row"><span class="pb-lbl">Build from</span>${seg}</div>
      <div class="pb-row"><span class="pb-lbl">Bet types</span><div class="pb-chips">${chips}</div></div>
      <details class="pb-games"${open?' open':''}><summary><span class="pb-lbl">Games</span><b>${nOn===games.length?`All ${games.length}`:`${nOn} of ${games.length}`}</b><span class="pb-sum-hint">tap to choose</span></summary>
        <div class="pb-gbar"><button type="button" class="btn quiet small" data-pb-games="all">All</button><button type="button" class="btn quiet small" data-pb-games="none">None</button><span class="muted">Kickoffs in your time zone; a game leaves the list when it kicks off.</span></div>
        <div class="pb-glist">${glist}</div></details>
    </div>
    ${notes.map(t=>`<p class="pb-note">${t}</p>`).join('')}
    <div class="pb-tiers">${r.tiers.map(t=>pbTierCard(t)).join('')}</div>
    <p class="muted pb-foot">Every leg has a real sportsbook price and a model chance between 45% and 97%, at least 3 points above the book's${form?'; a player leg also needs market + form, the book’s chance moved by his Elo, 3 points above it':''}. Safe is the likeliest pair; Medium, Aggressive and Extreme are the 3-, 4- and 5-leg parlays with the best expected return that land at least ${PB_TIERS.slice(1).map(t=>Math.round(t[3]*100)+'%').join(', ').replace(/, ([^,]*)$/,' and $1')} of the time. One leg a player, one team bet or total a game; legs in one game are priced together, as a book prices them. These are the model's numbers, and its edges over book prices have not held up yet this season.</p>
    <div id="pbElo" class="pb-elo"></div></div>`;
}
function renderPb(){
  const el=$('pbPanel'); if(!el||!S||!S.sched) return;
  el.innerHTML=pbPanel(); wirePb();
  PB_SHOWN=pbGames().map(g=>g.id).join();
}
/* exactly these legs into the builder, in its own order, so it prices them as the tier did */
function pbPut(legs,what){
  const L=pbOrder(legs), have=Object.keys(S.parlay||{});
  if(!(have.length===L.length&&L.every(l=>suggestLegOn(l)))){
    if(have.length&&!confirm(`Replace the ${have.length} leg${have.length===1?'':'s'} in the builder with ${what}?`)) return false;
    S.parlay={};
    for(const l of L){ const {key,thin,pe,ev,imp,...x}=l; S.parlay[key||legKey(l.gid,l.pid,l.stat)]=x; }
    S.bookPrice=null; save(); renderParlay(); if(S.ui.game) renderGame();
  }
  const b=$('parlayBody'); try{ if(b&&typeof b.scrollIntoView==='function') b.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
  return true;
}
window.pbPut=pbPut;
function wirePb(){
  const el=$('pbPanel'); if(!el) return;
  const redraw=sel=>{ renderPb(); const f=sel&&$('pbPanel').querySelector(sel); try{ if(f) f.focus({preventScroll:true}); }catch(e){} };
  el.querySelectorAll('[data-pb-mix]').forEach(b=>b.addEventListener('click',()=>{ const u=pbUi(), m=PB_MIXES.find(x=>x[0]===b.dataset.pbMix); if(!m) return;
    for(const [k] of PB_KINDS) u.k[k]=m[2].includes(k); save(); redraw(`[data-pb-mix="${m[0]}"]`); }));
  el.querySelectorAll('[data-pb-kind]').forEach(cb=>cb.addEventListener('change',()=>{ const u=pbUi(); u.k[cb.dataset.pbKind]=cb.checked; save(); redraw(`[data-pb-kind="${cb.dataset.pbKind}"]`); }));
  el.querySelectorAll('[data-pb-game]').forEach(cb=>cb.addEventListener('change',()=>{ const u=pbUi(), id=cb.dataset.pbGame;
    u.off=u.off.filter(x=>x!==id); if(!cb.checked) u.off.push(id); save(); redraw(`[data-pb-game="${id}"]`); }));
  el.querySelectorAll('[data-pb-games]').forEach(b=>b.addEventListener('click',()=>{ const u=pbUi(), ids=pbGames().map(g=>g.id);
    u.off=b.dataset.pbGames==='none'?ids:u.off.filter(x=>!ids.includes(x)); save(); redraw(`[data-pb-games="${b.dataset.pbGames}"]`); }));
  const det=el.querySelector('details.pb-games');
  if(det) det.addEventListener('toggle',()=>{ const u=pbUi(); if(u.gx!==det.open){ u.gx=det.open; save(); } });
  el.querySelectorAll('[data-pb-add]').forEach(b=>b.addEventListener('click',()=>{
    const t=getPbTiers().tiers.find(x=>x.id===b.dataset.pbAdd&&x.legs); if(t) pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay`); }));
}
/* a game that kicks off while the page is open leaves the list and every tier: the page looks
   every half minute, and redraws the builder (which drops a started leg) and the panel */
function pbWatch(){
  if(pbWatch.on) return;
  pbWatch.on=setInterval(()=>{ try{ if(!S||!S.sched||document.visibilityState==='hidden') return;
    if(PB_SHOWN!=null&&pbGames().map(g=>g.id).join()!==PB_SHOWN) renderParlay(); }catch(e){} },30000);
}
/* one tap swaps the amount you are betting in the builder; the suggested parlays are always
   shown on $10 (PB_STAKE), so their tiers compare on one footing */
const STAKE_CHIPS=[1,5,10,20,50,100];
function stakeChips(){ const s=Math.max(0,+S.stake||0);
""")

# the window's wiring out
sub1(P3, """function wireStakeChips(){
  document.querySelectorAll('[data-stake-chip]').forEach(b=>{ if(b.dataset.wired) return; b.dataset.wired='1';
    b.addEventListener('click',()=>{ S.stake=+b.dataset.stakeChip; save(); renderParlay(); if(suggestOpen()) fillSuggest(); }); });
}
function wireSuggest(){
  wireStakeChips();
  $('suggClose')?.addEventListener('click',closeSuggest);
  $('suggOpen')?.addEventListener('click',openSuggest);
  document.querySelectorAll('[data-suggest-side]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.suggestSide=b.dataset.suggestSide; save(); renderParlay(); if(suggestOpen()) fillSuggest(); }));
  /* the same stake the builder uses, so a payout here and a payout there agree */
  $('suggStake')?.addEventListener('change',e=>{ S.stake=Math.max(0,+e.target.value||0); save(); renderParlay(); if(suggestOpen()) fillSuggest(); });
  document.querySelectorAll('[data-suggest-save]').forEach(b=>b.addEventListener('click',()=>{
    const t=(SUGGEST_CACHE&&SUGGEST_CACHE.tiers||[]).find(x=>x.id===b.dataset.suggestSave); if(!t) return;
    const stake=Math.max(0,+S.stake||0);
    if(!confirm(`Save the ${t.label} ${t.legs.length}-leg parlay at ${fmtML(decToML(t.dec))} for $${stake.toFixed(2)}?\\n\\nIt goes to Saved parlays and settles like any other.`)) return;
    S.saved.push({id:'sp'+Date.now(),saved:new Date().toISOString(),week:t.legs[0].week,legs:t.legs.map(l=>({...l})),
      stake,price:decToML(t.dec),priceSrc:'real',pCorr:t.corr,pIndep:t.indep,payout:stake*t.dec,
      suggested:t.label,suggestSig:SUGGEST_CACHE.sig+'|'+t.id});
    save(); renderParlay(); if(suggestOpen()) fillSuggest(); }));
}
function renderParlay(){
""",
"""function wireStakeChips(){
  document.querySelectorAll('[data-stake-chip]').forEach(b=>{ if(b.dataset.wired) return; b.dataset.wired='1';
    b.addEventListener('click',()=>{ S.stake=+b.dataset.stakeChip; save(); renderParlay(); }); });
}
function renderParlay(){
""")

# the builder draws the panel over it; no Suggested parlays button
sub1(P3, """  for(const [k,l] of Object.entries(S.parlay||{})){ const g=S.sched.find(x=>x.id===l.gid); if(g&&gameStarted(g)){ delete S.parlay[k]; dropped++; } }
  if(dropped) save();
  const legs=parlayLegs();
  const el=$('parlayBody');
  const droppedNote=dropped?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05">${dropped} leg${dropped===1?' was':'s were'} removed because that game has already kicked off. Saved and locked parlays keep theirs.</p>`:'';
  if(!legs.length){
    el.innerHTML=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">Parlay Builder<span class="grow" style="flex:1"></span><button class="btn quiet" id="suggOpen" title="The model's own parlays for this week, in a window">Suggested parlays</button></h2>
      <p class="muted" style="margin:0 0 10px">Open a game, click a player, and tick any line you like. Each one lands here and gets priced.</p></div>`+renderSaved()+renderBetParlays();
    wireSaved(); wireSuggest();
    return;
  }
""",
"""  for(const [k,l] of Object.entries(S.parlay||{})){ const g=S.sched.find(x=>x.id===l.gid); if(g&&gameStarted(g)){ delete S.parlay[k]; dropped++; } }
  if(dropped) save();
  /* the suggested parlays over the builder: its own box, drawn with it */
  renderPb();
  const legs=parlayLegs();
  const el=$('parlayBody');
  const droppedNote=dropped?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05">${dropped} leg${dropped===1?' was':'s were'} removed because that game has already kicked off. Saved and locked parlays keep theirs.</p>`:'';
  if(!legs.length){
    el.innerHTML=droppedNote+`<div class="card"><h2>Parlay Builder</h2>
      <p class="muted" style="margin:0 0 10px">Open a game, click a player, and tick any line you like, or add a suggested parlay above. Each leg lands here and gets priced.</p></div>`+renderSaved()+renderBetParlays();
    wireSaved(); wireStakeChips();
    return;
  }
""")

# (no Suggested parlays button on a building parlay either)
sub1(P3, """  const payout=stake*useDec, profit=payout-stake;

  let html=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">${legs.length}-leg parlay <span class="pill">building</span><span class="grow" style="flex:1"></span><button class="btn quiet" id="suggOpen" title="The model's own parlays for this week, in a window">Suggested parlays</button></h2>
    <p class="muted" style="margin:0 0 12px">Every leg has to land. The chance below is worked out with the legs' real relationship to each other, not by multiplying them together.</p>
    <table><thead><tr><th>Player</th><th>The bet</th><th class="num">Projected</th><th class="num">Chance</th><th class="num">Price</th><th></th></tr></thead><tbody>`;
""",
"""  const payout=stake*useDec, profit=payout-stake;

  let html=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">${legs.length}-leg parlay <span class="pill">building</span></h2>
    <p class="muted" style="margin:0 0 12px">Every leg has to land. The chance below is worked out with the legs' real relationship to each other, not by multiplying them together.</p>
    <table><thead><tr><th>Player</th><th>The bet</th><th class="num">Projected</th><th class="num">Chance</th><th class="num">Price</th><th></th></tr></thead><tbody>`;
""")

# (the stake chips are all that is left to wire)
sub1(P3, """  $('pClear').addEventListener('click',()=>{ if(!confirm('Remove every leg from the builder?')) return;
    S.parlay={}; save(); renderParlay(); if(S.ui.game) renderGame(); });
  wireSaved(); wireSuggest();
}
/* ---------- live: fetch, poll, and never persist ----------
""",
"""  $('pClear').addEventListener('click',()=>{ if(!confirm('Remove every leg from the builder?')) return;
    S.parlay={}; save(); renderParlay(); if(S.ui.game) renderGame(); });
  wireSaved(); wireStakeChips();
}
/* ---------- live: fetch, poll, and never persist ----------
""")

# the baked schedule brings the total's prices
sub1(P3, """  const byId=Object.fromEntries(S.sched.map(g=>[g.id,g]));
  for(const p of PAY.sched){ const g=byId[p.id]; if(!g) continue;
    for(const k of ['d','t','sp','tot','hs','as','mla','mlh','spa','sph']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }
  /* the build pulled lines when it ran, so the freshness note counts from then */
  if(PAY.baked_at){ const t=Date.parse(PAY.baked_at); if(isFinite(t)&&!(S.gamesFetched>t)) S.gamesFetched=t; }
""",
"""  const byId=Object.fromEntries(S.sched.map(g=>[g.id,g]));
  for(const p of PAY.sched){ const g=byId[p.id]; if(!g) continue;
    for(const k of ['d','t','sp','tot','hs','as','mla','mlh','spa','sph','tov','tou']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }
  /* the build pulled lines when it ran, so the freshness note counts from then */
  if(PAY.baked_at){ const t=Date.parse(PAY.baked_at); if(isFinite(t)&&!(S.gamesFetched>t)) S.gamesFetched=t; }
""")
print('patched part1.html, part2.js, part3.js')
