r"""app v107: a Refresh odds button that reads DraftKings' lines from ESPN in the browser, on a press,
and prices each player leg from its line by a best-guess formula, marked est.

The owner, 15 October 2026, in order: "the prices arent really important tbh. if we can get free odd
pulls without the prices and have you come up with a formula that gives the closest of what your best
guess would be of that money price, that would be fine. point is to have a ballpark amount that we can
make educated guesses with." Then, of the placeholder work stopped the same day: "cant we stop
placeholders since this kind of overrides that". Then: "i think it would be nice somewhere to have a
refresh odds button that will pull the live lines on demand. would rather it be on demand rather than
like a constant job". So no scheduled read and no placeholder list: the props job never reads ESPN (it
bakes only PAY.espn_ids, each player's ESPN athlete id from the roster it already downloads), and the
page reads DraftKings' lines from ESPN's free feed only when a visitor presses Refresh odds.

The button (part3.js, espnRefresh) is in the Parlay Builder's controls and over the Props tab's game list
(both read every game of the week still to come) and on a game's page (that game alone: its week's
scoreboard and its player lines, two or three requests). One status line beside each, aria-live: the
published prices before a press, the read's progress during one, and after it when DraftKings' lines were
read, how many games had none posted yet and how many ESPN did not answer for (their prices stand). A
press while a read runs does nothing; nothing is fetched for it on load or on a timer.

What a press reads, and what it changes, in memory only (ESPN_LIVE, ESPN_GL, ESPN_OUT, outside S: a reload
returns to the published data; save() writes the published game lines, espnSavable):
  * the week's scoreboard: DraftKings' moneylines, spread and total with their prices (real prices) for
    each game still to come, matched to a game by the unordered pair of its clubs (never home and away),
    applied to the game where the read is newer than the published lines (g.mla ... g.tou, ls 'dk',
    lat); and DraftKings' event and game-line outcome ids from its bet links into PAY.dk beside the paid
    pull's (never replacing one), so the parlay card opens team legs and the game on DraftKings;
  * each game's player lines (propBets, provider 100, every page to its pageCount at limit 1000, with a
    cache-buster): main lines (twins kept once), milestones (k+) and the anytime touchdown list, each
    athlete placed by PAY.espn_ids, else by name within the game's two clubs (normName, nameKey), else
    left out; a game read only before its kickoff, and a read its kickoff passes during thrown away; a
    404 (no lines posted yet), a junk answer or a failure leaving the game as it was. A game's read is
    dated by the browser's clock: Date is not a CORS-safelisted header, so the page cannot read ESPN's.
Then every cache a price stands on is dropped (PB_CACHE, GAME_TIER_CACHE, PB_VIEW; ESPN_SEQ is in
pbDataSig and gameSuggestSig) and the page is drawn again, the focus kept on the button pressed.

The formula (part2.js, DK_EST and estPrice). A main line's two sides are each its fair chance times one
plus DraftKings' margin: 50/50 on yards (-112 each way), a fitted logit on receptions (his receiving-yards
line and the model's own projections) and passing touchdowns (his team's points and his passing-yards
line), 50/50 on the other counts, a Poisson on the model's projection for interceptions and field goals.
A k+ rung is a power curve about the line on yards and a Poisson set by the line on the counts, then a
fitted hold; the anytime touchdown is a logit on the model's chance, his yards lines and his team's points
(as a backup where his club's lines are complete and he is not a charted starter, else the model alone).
Fitted on DraftKings' own prices only, never a result; held out on weeks 4-5 it lands within half a point
of DraftKings' price on every yards line, and within 1.5 to 3 points on receptions, passing touchdowns,
the anytime touchdown and the yards rungs, where the model's own estimate was 5 to 8 points off.

Each player leg's price after a press (part3.js, mainOf, espnPrice, plEst): a paid-pull real price stays
where its line is still DraftKings' current line (the read has the same number, or none for him); where
the read's line differs (DraftKings moved it since the pull) the read's line wins, priced by the formula
(src 'dkline', est.); with no paid price, the read's line priced by the formula, est.; with no line at
all, the model's estimate as before (src 'est'). A ladder rung or a touchdown the pull priced stays real.
Game lines: the read's, real, when newer.

Where legs are chosen: a dkline leg of a tested kind counts like a real price in the Parlay Builder's
levels (the same band, edge, market + form and far-off rules, the far-off rule on its estimated fair
chance), a game page's hands and the Elo picks: main lines over and under on passing, rushing and
receiving yards, receptions and passing touchdowns, the anytime touchdown, and a yards rung DraftKings
lists. Every other dkline leg is shown, est., and never chosen; a model-only est. leg stays where it was
(a game page's hands alone). Every dkline price shows est. with a title saying it is DraftKings' line
from ESPN, when it was read, and that the price is our estimate (and how close it has been, or that the
market is untested); a level, a hand or a builder with one says its price is estimated. The suggestions
record is the job's, on the published prices: no press, so no dkline leg (suggest_ledger.js unchanged),
and its note says so.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of them
land, so a second run stops at the first.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:120])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v106 \u00b7 2026-10-14';", r"const APP_BUILD='app v107 \u00b7 2026-10-15';")

# --- part1: the button's row over the Props tab's game list, and the styles ---
sub1('p1', """.pb-thin{margin:0;font-size:11.5px;color:var(--ink-2)}
""", """.pb-thin{margin:0;font-size:11.5px;color:var(--ink-2)}
.pb-legs .pr .est{font-style:normal;font-size:10.5px;font-weight:500;color:var(--muted);margin-left:2px}
.espn-read{color:var(--ink-2)}
.espn-ctl{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;margin:0 0 12px}
.pb-row .espn-ctl{margin:0;flex:1 1 auto;min-width:0}
.espn-btn{min-height:44px;white-space:nowrap}
.espn-st{font-size:12px;color:var(--ink-2);flex:1 1 220px;min-width:0;overflow-wrap:anywhere}
.mline .was{font-weight:400;color:var(--muted)}
""")
sub1('p1', """    <p id="lineNote" class="muted" style="margin:-6px 0 12px;font-size:12px" hidden></p>
""", """    <p id="lineNote" class="muted" style="margin:-6px 0 12px;font-size:12px" hidden></p>
    <div id="slateOdds" hidden></div>
""")

# --- part2: save() writes the published game lines, never a press's ---
sub1('p2', """function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{ const r=await store.set(S);""",
     """/* (app v107) a Refresh odds press puts DraftKings' game lines into S.sched in memory: espnSavable (part3.js)
   writes the published ones in their place, so nothing a press read is ever saved */
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{ const r=await store.set(typeof espnSavable==='function'?espnSavable(S):S);""")

# --- part2: the formula, beside bookPrice ---
sub1('p2', """/* ---------- kickoff lock ---------- */
""", r"""/* ---------- DraftKings' line read on ESPN, priced by a best guess (app v107) ----------
   The owner, 15 October 2026: "if we can get free odd pulls without the prices and have you come up
   with a formula that gives the closest of what your best guess would be of that money price, that
   would be fine." A Refresh odds press reads DraftKings' player lines from ESPN's free feed in the
   visitor's browser (part3.js espnRefresh: the line, never a price); a player leg the paid pull has no
   price for, or whose line DraftKings has moved since the pull, is priced from DraftKings' line by these
   formulas and marked est. A real DraftKings price on DraftKings' current line always wins. Nothing in
   the model changes, and the formulas were fitted
   on DraftKings' own prices alone (2026 weeks 2-3, and its DET at BUF ladders of week 2), never on a
   game's result.

   On weeks they were not fitted on (4-5) the guess lands within half a point of DraftKings' real price
   on every yards line, and within about 1.5 to 3 points on receptions, passing touchdowns, the anytime
   touchdown and the yards ladder rungs, against 5 to 8 for the model's own estimate on the same legs.
   Completions, attempts, carries, rush + rec yards, interceptions, field goals, kicking points and the
   receptions and passing-TD rungs have no DraftKings price on file to test against: priced by reasoning
   alone, shown est. on the game pages, and never suggested (ESPN_TESTED in part3.js).

   DK_EST and the functions below are the research's est_price.js (October 2026, on DraftKings' own
   prices: the held-out table is in props/README.md, "Refresh odds"), with three changes: a rung also returns its fair chance (before the hold, for legFair); a
   ladder of any count (not receptions and passing touchdowns alone) is the Poisson set by the main
   line, where the yards curve would price a carries ladder far too flat; and a ladder is priced only
   on a market whose main line the formula prices. All three touch untested ladders only. The audit
   holds every price to its own copy of these constants (props/build/espn_rule.js). */
const DK_EST={
  /* DraftKings' margin, each side's fair chance times (1 + m): weeks 2-3, per stat */
  margin:{yards:0.0566,receptions:0.0599,passing_tds:0.0590,count:0.0599},
  /* the fair chance is held inside the range DraftKings itself priced (it moves a line rather than go past it) */
  clamp:{receptions:[1/3,2/3],passing_tds:[0.31,0.69],count:[0.31,0.69]},
  /* a 0.5 line is the lowest DraftKings can post, so its over is never the underdog */
  floor05:0.55,
  /* logit(fair over) = b0 + b1*ln(recYdsLine) + b2*ln(muRec) + b3*ln(muRecYds) + b4*ln(line+0.5) + b5*TE + b6*RB */
  rec:[-0.8043,0.9832,0.5807,-0.3849,-1.5382,0.1087,0.3277],
  /* no projection: b0 + b1*ln(recYdsLine) + b2*ln(line+0.5) + b3*TE + b4*RB; no yards line: b0 + b1*ln(muRec) + ... */
  recNoModel:[-1.6857,0.9139,-1.2604,0.1956,0.5013],
  recNoYds:[-0.0014,0.3610,-0.3505,-0.0211,0.0289],
  /* logit(fair over) = b0 + b1*teamImplied + b2*passYdsLine/100 + b3*line + b4*(line is 0.5); no yards line: b0 + b1*T + b2*line */
  ptd:[-2.1748,0.08940,0.6796,-1.0848,0.4490],
  ptdNoYds:[-0.8108,0.11039,-1.2846],
  /* weeks 2-3's median fair chance by line, when nothing else is known */
  recByLine:{0.5:0.650,1.5:0.476,2.5:0.501,3.5:0.480,4.5:0.485,default:0.488},
  ptdByLine:{0.5:0.627,1.5:0.432,2.5:0.356,default:0.464},
  /* a k+ rung: yards on a power curve about DraftKings' line (lam, sig), the counts a Poisson set by it;
     the price's hold on the logit, and the shortest and longest price DraftKings posts */
  rung:{lam:0.565,sig:3.50,hold:0.129,shortest:-1000,longest:2000},
  /* the anytime touchdown: lined (a, b, yd by position, pts), no line as a backup (a0, b0), the model alone (a1, b1) */
  td:{a:-3.5915,b:0.2459,yd:{QB:0.8897,RB:0.8807,WR:0.7962,TE:0.8213},pts:0.8324,a0:-1.1839,b0:0.7768,a1:0.5961,b1:1.4369},
  /* a one-sided price's overround where the week has no two-sided real line (weeks 2-5's median) */
  tdVig:1.0566,
  /* a club's lines are complete once the read is within 36 hours of kickoff with 4 receiving lines for it */
  complete:{hours:36,rec:4},
  /* a leg in the builder priced from a read older than this many hours says so */
  staleHours:24
};
const DK_YARDS=new Set(['passing_yards','rushing_yards','receiving_yards','scrim_yards']);
/* a main line's over and under, from DraftKings' line and the page's own inputs: {over, under, fair, how} */
function dkGuessPrice(o){
  const C=DK_EST, ln=Math.log, ok=v=>v!=null&&isFinite(v);
  const sig=z=>1/(1+Math.exp(-z));
  const toAm=q=>q>=0.5?-Math.round(100*q/(1-q)):Math.round(100*(1-q)/q);
  const out=(p,m,how)=>({over:toAm(p*(1+m)),under:toAm((1-p)*(1+m)),fair:p,how});
  const L=+o.line, s=o.stat;
  const hold=(p,[lo,hi])=>Math.min(hi,Math.max(L===0.5?Math.max(lo,C.floor05):lo,p));
  if(!ok(L)) return null;
  /* yards lines sit at DraftKings' own median: 50/50, -112 each way */
  if(DK_YARDS.has(s)) return out(0.5,C.margin.yards,'yards: 50/50');
  /* the other volume counts near their median (untested on DraftKings), at the count margin */
  if(s==='completions'||s==='attempts'||s==='carries'||s==='kick_pts') return out(0.5,C.margin.count,s==='kick_pts'?'untested: 50/50':'count: 50/50');
  if(s==='receptions'){
    const te=o.grp==='TE'?1:0, rb=o.grp==='RB'?1:0, Y=o.recYdsLine;
    const haveY=ok(Y)&&Y>0, haveM=ok(o.muRec)&&o.muRec>0&&ok(o.muRecYds)&&o.muRecYds>0;
    let z, how;
    if(haveY&&haveM){ const b=C.rec; z=b[0]+b[1]*ln(Y)+b[2]*ln(o.muRec)+b[3]*ln(o.muRecYds)+b[4]*ln(L+0.5)+b[5]*te+b[6]*rb; how='receptions: yards line + model'; }
    else if(haveY){ const b=C.recNoModel; z=b[0]+b[1]*ln(Y)+b[2]*ln(L+0.5)+b[3]*te+b[4]*rb; how='receptions: yards line only'; }
    else if(ok(o.muRec)&&o.muRec>0){ const b=C.recNoYds; z=b[0]+b[1]*ln(o.muRec)+b[2]*ln(L+0.5)+b[3]*te+b[4]*rb; how='receptions: model only'; }
    else return out(C.recByLine[L]??C.recByLine.default,C.margin.receptions,'receptions: line only');
    return out(hold(sig(z),C.clamp.receptions),C.margin.receptions,how);
  }
  if(s==='passing_tds'){
    if(ok(o.teamImplied)&&ok(o.passYdsLine)){ const b=C.ptd;
      return out(hold(sig(b[0]+b[1]*o.teamImplied+b[2]*o.passYdsLine/100+b[3]*L+b[4]*(L===0.5?1:0)),C.clamp.passing_tds),C.margin.passing_tds,'passing TDs: implied + yards line'); }
    if(ok(o.teamImplied)){ const b=C.ptdNoYds;
      return out(hold(sig(b[0]+b[1]*o.teamImplied+b[2]*L),C.clamp.passing_tds),C.margin.passing_tds,'passing TDs: implied only'); }
    return out(C.ptdByLine[L]??C.ptdByLine.default,C.margin.passing_tds,'passing TDs: line only');
  }
  /* no DraftKings price on file for these: a Poisson on the model's projection, held to the count range. UNTESTED */
  if(s==='passing_interceptions'||s==='fg_made'){
    if(!(ok(o.mu)&&o.mu>0)) return out(0.5,C.margin.count,'untested: 50/50');
    let t=Math.exp(-o.mu), cdf=0; for(let i=0;i<=Math.floor(L);i++){ cdf+=t; t*=o.mu/(i+1); }
    return out(hold(1-cdf,C.clamp.count),C.margin.count,'untested: Poisson on the projection');
  }
  return null;
}
/* a k+ rung's fair chance from DraftKings' line: on yards a power curve about the line, anchored at
   fair (50/50 on yards); stat 'receptions' (every count) a Poisson whose chance of the line's over is fair */
function rungFairGuess(stat,line,k,fair){
  const R=DK_EST.rung, f0=(fair>0&&fair<1)?fair:0.5;
  const Phi=z=>{                       /* standard normal cdf, Abramowitz-Stegun 7.1.26 (|err| < 1.5e-7) */
    const x=Math.abs(z)/Math.SQRT2, t=1/(1+0.3275911*x);
    const e=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
    return z>=0?0.5*(1+e):0.5*(1-e);
  };
  const PhiInv=p=>{                    /* by bisection: only used when fair is not 0.5 */
    if(p===0.5) return 0; let lo=-8, hi=8;
    for(let i=0;i<60;i++){ const m=(lo+hi)/2; if(Phi(m)<p) lo=m; else hi=m; }
    return (lo+hi)/2;
  };
  let p;
  if(stat==='receptions'){
    const sf=(m,n)=>{ let s=0, t=Math.exp(-m); for(let i=0;i<n;i++){ s+=t; t*=m/(i+1); } return Math.max(1e-9,1-s); };
    const n0=Math.floor(line)+1; let lo=0.01, hi=40;
    for(let i=0;i<80;i++){ const m=(lo+hi)/2; if(sf(m,n0)<f0) lo=m; else hi=m; }
    p=sf((lo+hi)/2,Math.ceil(k-1e-9));
  } else {
    const t=v=>Math.pow(Math.max(v,0),R.lam);
    p=1-Phi((t(k-0.5)-t(line))/R.sig+PhiInv(1-f0));
  }
  return Math.min(Math.max(p,1e-6),1-1e-6);
}
/* a rung's price from its fair chance: the hold on the logit, capped to what DraftKings posts */
function rungPriceOf(p){
  const R=DK_EST.rung, q=1/(1+Math.exp(-(Math.log(p/(1-p))+R.hold)));
  const am=q>=0.5?-Math.round(100*q/(1-q)):Math.round(100*(1-q)/q);
  return am<0?Math.max(am,R.shortest):Math.min(am,R.longest);
}
function rungPriceGuess(stat,line,k,fair){ return rungPriceOf(rungFairGuess(stat,line,k,fair)); }
/* the anytime touchdown: the touches that score his touchdown (a QB's runs, a back's runs and catches,
   a receiver's or tight end's catches) where DraftKings lines them; else, his club's lines complete
   and he no charted starter, DraftKings treats him as a backup; else the model alone */
function guessTdPrice({p,grp,rushLine=null,recLine=null,teamImplied=null,gameLined=true,starter=false}){
  if(!(p>0&&p<1)) return null;
  const C=DK_EST.td, logit=x=>Math.log(x/(1-x)), ok=v=>v!=null&&isFinite(v);
  const parts=grp==='QB'?[rushLine]:grp==='RB'?[rushLine,recLine]:[recLine];
  const have=parts.filter(ok);
  let z;
  if(have.length&&C.yd[grp]!=null){
    const yards=Math.max(0.5,have.reduce((s,v)=>s+v,0));
    const pts=Math.min(40,Math.max(10,ok(teamImplied)?teamImplied:22));
    z=C.a+C.b*logit(p)+C.yd[grp]*Math.log(yards)+C.pts*Math.log(pts/22);
  } else if(gameLined&&!starter){
    z=C.a0+C.b0*logit(p);
  } else {
    z=C.a1+C.b1*logit(p);
  }
  const q=Math.min(1000/1100,Math.max(100/2100,1/(1+Math.exp(-z))));
  return q>=0.5?-Math.round(100*q/(1-q)):Math.round(100*(1-q)/q);
}
/* one entry point. leg.kind: 'main' (side 'over'|'under'), 'rung' (k), 'td'. Returns {price, fair, how}
   or null; fair is the side's own chance before the margin (a rung's before the hold; none for the
   touchdown, whose fair chance legFair takes from its price). The k = line + 0.5 rung is the main
   line's over, so it is priced as the main line (-112 on yards), never as a rung. leg.mainFair, where
   the paid pull has the main line at this number, anchors a count ladder on DraftKings' own fair chance */
function estPrice(leg){
  if(!leg) return null;
  if(leg.kind==='td'){ const price=guessTdPrice(leg); return price==null?null:{price,fair:null,how:'anytime TD'}; }
  const main=dkGuessPrice(leg);
  if(leg.kind==='main') return main&&{price:leg.side==='under'?main.under:main.over,fair:leg.side==='under'?1-main.fair:main.fair,how:main.how};
  if(leg.kind==='rung'){
    /* a ladder only on a market the formula prices (DraftKings posts no field goal attempts) */
    if(!main||!(leg.line>0)||!(leg.k>0)) return null;
    if(Math.abs(leg.k-0.5-leg.line)<1e-9) return main&&{price:main.over,fair:main.fair,how:main.how+' (the main line)'};
    const yards=DK_YARDS.has(leg.stat);
    const f=yards?0.5:((leg.mainFair>0&&leg.mainFair<1)?leg.mainFair:(main?main.fair:0.5));
    const p=rungFairGuess(yards?leg.stat:'receptions',leg.line,leg.k,f);
    return {price:rungPriceOf(p),fair:p,how:'rung from the main line'};
  }
  return null;
}

/* ---------- kickoff lock ---------- */
""")


# --- part3: Refresh odds, the reader and the ESPN helpers, before the lines the suggestions are built from ---
sub1('p3', """/* ---------- the lines the suggestions are built from ---------- */
""", r"""/* ---------- Refresh odds: DraftKings' lines read from ESPN in this browser, on a press (app v107) ----------
   The owner, 15 October 2026: "i think it would be nice somewhere to have a refresh odds button that will
   pull the live lines on demand. would rather it be on demand rather than like a constant job". A Refresh
   odds button (espnCtl: the Parlay Builder's controls and the Props tab's game list read every game of the
   week still to come; a game's page reads that game alone) reads DraftKings' lines from ESPN's free feed in
   the visitor's own browser when it is pressed, and never otherwise: nothing is fetched for it on load or
   on a timer, and the props job never reads ESPN (it bakes PAY.espn_ids, each player's ESPN athlete id, from
   the roster it downloads anyway). Both ESPN hosts answer a plain GET with access-control-allow-origin: *,
   and the page sends no header of its own, so there is no preflight.

   A press reads, for each game still to come:
   - the week's scoreboard (ESPN_SB; ESPN's postseason weeks are seasontype 3): each event's clubs, kickoff
     and DraftKings' (provider 100) moneylines, spread and total with their prices, which are DraftKings'
     own, and its bet links, which carry DraftKings' event id and the game lines' outcome ids. An event is
     matched to a game by the unordered pair of its clubs within the week (espnAb: ESPN's WSH, LAR and JAC
     are WAS, LA and JAX), never by home and away, which ESPN can write either way at a neutral site;
   - each game's player lines (ESPN_CORE propBets of provider 100), every page to its pageCount at
     limit=1000 (a larger limit silently becomes 25 a page), with a cache-buster (without one ESPN's cache
     serves a copy up to about 15 minutes old). An item carries a type id, the athlete and the line, and no
     price and no side: a main line comes as two identical items, its Over and Under (kept once; two
     different lines for one player and stat are both dropped), a milestone as k meaning k+, the anytime
     touchdown with no line (ESPN_MAIN, ESPN_MILE, ESPN_ANY_TD); every other market is ignored. A 404 is
     DraftKings having posted no player lines for the game yet ("No propBets found");
   - an athlete is placed by PAY.espn_ids, else by name within the game's two clubs (his ESPN athlete
     record, or each club's roster where a game has more than ESPN_NAME_EACH to place; the page's own name
     rule, normName then nameKey, one match only), else left out. A player the page does not project is
     carried and inert.
   ESPN_POOL requests at a time, each given ESPN_TIMEOUT_MS. A game is read only while its kickoff (the
   earlier of the schedule's and ESPN's) is to come, and a read that ends at or after it is thrown away: the
   feed carries in-play values from kickoff. A failure, a body that is not the JSON asked for or a 404
   leaves the game as it was. A read is dated by its last answer's Date header where the browser lets the
   page read one, else by the browser's clock: Date is not a CORS-safelisted response header and ESPN
   exposes only content-length and location, so in a browser it is the clock. ESPN's lastUpdated is never
   read: it is labelled Z but has run three hours ahead of UTC.

   What a press changes is held in memory only, outside S, so a reload returns to the published data:
   ESPN_LIVE[week][gid] = {at, lines:{pid:{stat:L}}, rungs:{pid:{stat:[k,...]}}, td:[pid]}, priced by the
   formula (part2.js estPrice) and marked est.; the game's lines (g.mla, mlh, sp, spa, sph, tot, tov, tou,
   ls 'dk', lat) where the read is newer than the published ones, with the published ones kept in ESPN_GL
   for save() (espnSavable); DraftKings' event and game-line ids into PAY.dk for the game beside any the
   paid pull has, never replacing one; and each game's outcome (ESPN_OUT) for the status lines. Then every
   cache a price stands on is dropped (PB_CACHE, GAME_TIER_CACHE, PB_VIEW; ESPN_SEQ is in pbDataSig and
   gameSuggestSig) and the page is drawn again.

   Each player leg's price after a press: a real price from the paid pull where its line is still
   DraftKings' current line (the read has the same number, or none for him: a read with no line for a
   player is no evidence the line is gone); where the read's line differs (DraftKings moved it since the
   pull), or the pull has none, the read's line priced by the formula (src 'dkline', est.); with no line at
   all the model's estimate as before (src 'est'). A rung or a touchdown the pull priced keeps its real
   price. Where the page chooses legs (the Parlay Builder's levels, a game page's hands, the Elo picks) a
   dkline leg of a tested kind counts as a book price does, by the same rules: a main line, over or under,
   on passing, rushing or receiving yards, receptions or passing touchdowns; the anytime touchdown; and a
   yards ladder rung DraftKings lists, anchored on its line. Every other dkline leg (completions,
   attempts, carries, rush + rec yards, interceptions, field goals, kicking points, the receptions and
   passing-TD ladders, and a rung DraftKings does not list) is priced and shown, est., on the game pages and
   never suggested; a model-only est. leg stays where it was, in a game page's hands alone. A dkline leg's
   fair chance is the formula's own (legFair), est. */
const ESPN_CORE='https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const ESPN_TEAM='https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/';
const ESPN_DK='100', ESPN_LIMIT=1000, ESPN_MAX_PAGES=5, ESPN_POOL=4, ESPN_TIMEOUT_MS=15000, ESPN_NAME_EACH=6;
const ESPN_MAIN={8:'passing_yards',9:'completions',10:'passing_tds',11:'carries',12:'rushing_yards',13:'receiving_yards',14:'receptions',
  15:'passing_interceptions',16:'attempts',20:'scrim_yards',22:'kick_pts',24:'fg_made'};
const ESPN_MILE={194:'passing_yards',207:'completions',198:'passing_tds',201:'carries',196:'rushing_yards',195:'receiving_yards',202:'receptions',
  199:'passing_interceptions',200:'attempts',197:'scrim_yards',203:'kick_pts',205:'fg_made'};
const ESPN_ANY_TD='31';
const ESPN_GL_KEYS=['mla','mlh','sp','spa','sph','tot','tov','tou','ls','lat'];
const ESPN_TESTED={main:new Set(['passing_yards','rushing_yards','receiving_yards','receptions','passing_tds']),rung:new Set(['passing_yards','rushing_yards','receiving_yards'])};
/* the press's state: never in S, never saved */
let ESPN_LIVE={}, ESPN_GL={}, ESPN_OUT={}, ESPN_NAMES={}, ESPN_SEQ=0;
let ESPN_RUN={busy:false,gid:null,week:null,total:0,done:0,requests:0,clock:false};
const espnWeekQ=w=>+w<=18?`seasontype=2&week=${+w}`:`seasontype=3&week=${+w>=22?5:+w-18}`;
const espnIso=t=>new Date(t).toISOString();
/* one request: the page's own fetch, no-store and no header of its own, given ESPN_TIMEOUT_MS.
   {status: 200 with body | the HTTP status | 0 not reached | -1 not JSON, at: the Date header, or null} */
async function espnFetch(url){
  ESPN_RUN.requests++;
  const ac=typeof AbortController==='function'?new AbortController():null;
  const tm=ac?setTimeout(()=>{ try{ ac.abort(); }catch(e){} },ESPN_TIMEOUT_MS):null;
  try{
    const r=await fetch(url,ac?{cache:'no-store',signal:ac.signal}:{cache:'no-store'});
    /* Date is not a CORS-safelisted response header, and ESPN exposes only content-length and location:
       in a browser this is null and the read is dated by the browser's clock */
    let at=null; try{ const h=r&&r.headers&&typeof r.headers.get==='function'?r.headers.get('date'):null, t=h?Date.parse(h):NaN; if(isFinite(t)) at=t; }catch(e){}
    if(!r||!r.ok) return {status:(r&&r.status)||0,at,why:'HTTP '+((r&&r.status)||0)};
    let body; try{ body=await r.json(); }catch(e){ return {status:-1,at,why:'an answer that is not JSON'}; }
    return {status:200,body,at};
  }catch(e){ return {status:0,at:null,why:String(e&&e.message||e)}; }
  finally{ if(tm) clearTimeout(tm); }
}
async function espnPool(tasks,n){ let i=0;
  const one=async()=>{ while(i<tasks.length){ const k=i++; try{ await tasks[k](); }catch(e){ console.error(e); } } };
  await Promise.all(Array.from({length:Math.max(1,Math.min(n,tasks.length))},one)); }
/* '+120', '-142', 'EVEN' -> 120, -142, 100; '+2.5', 'o40.5', 'PK' -> 2.5, 40.5, 0 */
function espnAmerican(s){ if(typeof s==='number') return isFinite(s)&&Math.abs(s)>=100?Math.round(s):null;
  const t=String(s==null?'':s).trim().toUpperCase(); if(t==='EVEN'||t==='EV') return 100;
  return /^[+-]?\d+$/.test(t)&&Math.abs(+t)>=100?+t:null; }
function espnLineNum(s){ if(typeof s==='number') return isFinite(s)?s:null;
  const t=String(s==null?'':s).trim().toLowerCase().replace(/^[ou]/,''); if(t==='pk'||t==='pick'||t==='even') return 0;
  return /^[+-]?\d+(\.\d+)?$/.test(t)?+t:null; }
/* a bet link's DraftKings event id and outcome id */
function espnLink(c){ try{ const href=String(c&&c.link&&c.link.href||''); if(!href) return {};
  const u=new URL(href), v=new URL(u.searchParams.get('preurl')||href), m=/\/event\/(\d+)/.exec(v.pathname), oc=(v.searchParams.get('outcomes')||'').trim();
  return {event:m?m[1]:null,outcome:oc||null}; }catch(e){ return {}; } }
/* an event's two clubs in our codes, with ESPN's own team id and code: {home:{ab,id,esp}, away:{...}}, or null */
function espnClubs(ev){ try{ const o={};
  for(const x of ev.competitions[0].competitors) o[x.homeAway]={ab:espnAb(x.team.abbreviation),id:String(x.team.id||''),esp:String(x.team.abbreviation||'').toLowerCase()};
  return o.home&&o.away&&o.home.ab&&o.away.ab?o:null; }catch(e){ return null; } }
/* DraftKings' game lines on a scoreboard event, by club and in the payload's terms: {lines:{mla, mlh, sp
   (the schedule's spread_line: positive when its home club is favoured), spa, sph, tot, tov, tou}, ids
   keyed as PAY.dk is ('team:SEA|ml', 'team:DEN|ats|2.5', 'game|total|over|40.5'), event}, or null where
   the event names other clubs or carries no DraftKings odds */
function espnOdds(ev,g){
  const cl=espnClubs(ev); if(!cl||[cl.home.ab,cl.away.ab].sort().join('|')!==[g.a,g.h].sort().join('|')) return null;
  let o=null; try{ o=(ev.competitions[0].odds||[]).find(x=>x&&x.provider&&String(x.provider.id)===ESPN_DK)||null; }catch(e){}
  if(!o) return null;
  const at=(...p)=>{ let x=o; for(const k of p) x=x&&typeof x==='object'?x[k]:null; return x&&typeof x==='object'?x:{}; };
  const lines={}, ids={}, evs=new Set(), link=c=>{ const r=espnLink(c); if(r.event) evs.add(r.event); return r.outcome||null; };
  for(const s of ['home','away']){ const team=cl[s].ab, away=team===g.a;
    let c=at('moneyline',s,'close'), p=espnAmerican(c.odds);
    if(p!=null){ lines[away?'mla':'mlh']=p; const id=link(c); if(id) ids[`team:${team}|ml`]=id; }
    c=at('pointSpread',s,'close'); const L=espnLineNum(c.line); p=espnAmerican(c.odds);
    if(L!=null){ lines.sp=away?L:(L===0?0:-L); if(p!=null) lines[away?'spa':'sph']=p; const id=link(c); if(id) ids[`team:${team}|ats|${String(L)}`]=id; } }
  for(const s of ['over','under']){ const c=at('total',s,'close'), L=espnLineNum(c.line), p=espnAmerican(c.odds);
    if(L!=null){ lines.tot=L; if(p!=null) lines[s==='over'?'tov':'tou']=p; const id=link(c); if(id) ids[`game|total|${s}|${String(L)}`]=id; } }
  link(o);
  return Object.keys(lines).length||evs.size?{lines,ids,event:evs.size===1?[...evs][0]:null}:null;
}
/* a game's lines from a read at time at, where it is newer than what the page has, and its DraftKings
   ids beside the paid pull's; true where anything moved */
function espnApplyGame(g,odds,at){
  if(!odds) return false; let ch=false;
  const L=odds.lines, prev=ESPN_GL[g.id]?ESPN_GL[g.id].at:(Date.parse(g.lat||'')||Date.parse((PAY&&PAY.baked_at)||'')||0);
  if(Object.keys(L).length&&at>prev){
    if(!ESPN_GL[g.id]) ESPN_GL[g.id]={orig:Object.fromEntries(ESPN_GL_KEYS.map(k=>[k,g[k]])),at:0};
    const set=(k,v)=>{ if(g[k]!==v){ g[k]=v; ch=true; } }, drop=k=>{ if(g[k]!==undefined){ delete g[k]; ch=true; } };
    if(L.mla!=null) set('mla',L.mla); if(L.mlh!=null) set('mlh',L.mlh);
    /* a price goes with its number: a number read without its prices drops the old ones, unless unmoved */
    if(L.sp!=null){ const same=g.sp===L.sp; set('sp',L.sp); if(L.spa!=null&&L.sph!=null){ set('spa',L.spa); set('sph',L.sph); } else if(!same){ drop('spa'); drop('sph'); } }
    if(L.tot!=null){ const same=g.tot===L.tot; set('tot',L.tot); if(L.tov!=null&&L.tou!=null){ set('tov',L.tov); set('tou',L.tou); } else if(!same){ drop('tov'); drop('tou'); } }
    set('ls','dk'); set('lat',espnIso(at)); ESPN_GL[g.id].at=at;
  }
  if(odds.event||Object.keys(odds.ids).length){
    const D=PAY.dk&&typeof PAY.dk==='object'?PAY.dk:(PAY.dk={}), W=D[String(g.w)]||(D[String(g.w)]={}), E=W[g.id]||(W[g.id]={});
    if(odds.event&&!E.event){ E.event=odds.event; ch=true; }
    let seen=false; for(const k in odds.ids){ if(E[k]==null){ E[k]=odds.ids[k]; seen=true; ch=true; } else if(E[k]===odds.ids[k]) seen=true; }
    if(seen&&!(Date.parse(E.glat)>=at)){ E.glat=espnIso(at); ch=true; }
  }
  return ch;
}
/* one event's items: {per:{aid:{lines:{stat:L}, rungs:{stat:[k...]}, td}}, counts} */
function espnParseItems(items){
  const per={}, c={items:0,main:0,rungs:0,td:0,ignored:0,clash:0}, clash=new Set();
  for(const it of Array.isArray(items)?items:[]){ c.items++;
    const tid=String(it&&it.type&&it.type.id!=null?it.type.id:''), m=/\/athletes\/(\d+)/.exec(String(it&&it.athlete&&it.athlete.$ref||'')), aid=m&&m[1];
    const kind=ESPN_MAIN[tid]?'main':(ESPN_MILE[tid]?'rung':(tid===ESPN_ANY_TD?'td':null)), st=ESPN_MAIN[tid]||ESPN_MILE[tid];
    if(!kind||!aid){ c.ignored++; continue; }
    const a=per[aid]||(per[aid]={lines:{},rungs:{},td:false});
    if(kind==='td'){ a.td=true; continue; }
    const v=it.current&&it.current.target?it.current.target.value:null, L=typeof v==='number'?v:parseFloat(v);
    if(!(isFinite(L)&&L>0)){ c.ignored++; continue; }
    if(kind==='rung'){ const r=a.rungs[st]||(a.rungs[st]=[]); if(!r.includes(L)) r.push(L); continue; }
    if(a.lines[st]!=null&&a.lines[st]!==L) clash.add(aid+'|'+st);
    a.lines[st]=L;
  }
  for(const k of clash){ const i=k.indexOf('|'); delete per[k.slice(0,i)].lines[k.slice(i+1)]; }
  c.clash=clash.size;
  for(const aid in per){ const a=per[aid]; for(const st in a.rungs) a.rungs[st].sort((x,y)=>x-y);
    c.main+=Object.keys(a.lines).length; c.rungs+=Object.values(a.rungs).reduce((s,r)=>s+r.length,0); c.td+=a.td?1:0; }
  return {per,counts:c};
}
/* every page of one event's player lines: {st:'ok', items, at} | {st:'none'} | {st:'failed', why} */
async function espnProps(eid){
  let items=[], pages=1, at=null;
  for(let p=1;p<=pages;p++){
    const r=await espnFetch(`${ESPN_CORE}/events/${eid}/competitions/${eid}/odds/${ESPN_DK}/propBets?lang=en&region=us&limit=${ESPN_LIMIT}&page=${p}&_=${Date.now()}`);
    if(r.status===404&&p===1) return {st:'none',why:'DraftKings has posted no player lines for it yet'};
    if(r.status!==200) return {st:'failed',why:r.why||('HTTP '+r.status)};
    const d=r.body;
    if(!d||typeof d!=='object'||!Array.isArray(d.items)||typeof d.pageCount!=='number') return {st:'failed',why:'an answer with no items and pageCount'};
    if(p===1){ pages=d.pageCount;
      if(d.pageSize!=null&&d.pageSize!==ESPN_LIMIT) return {st:'failed',why:`pages of ${d.pageSize}, not ${ESPN_LIMIT}: the limit rule has changed`};
      if(pages>ESPN_MAX_PAGES) return {st:'failed',why:`${pages} pages: the limit rule has changed`}; }
    if(p<pages&&d.items.length!==ESPN_LIMIT) return {st:'failed',why:`page ${p} of ${pages} has ${d.items.length} items, not ${ESPN_LIMIT}`};
    items=items.concat(d.items); at=r.at;
  }
  return {st:'ok',items,at};
}
/* a name on a player of the game's two clubs, by the page's own name rule: one match, or none */
function espnByName(nm,pool){
  const n=normName(nm); let hit=pool.filter(p=>normName(p.n)===n);
  if(hit.length) return hit.length===1?hit[0].id:null;
  const k=nameKey(nm); hit=pool.filter(p=>nameKey(p.n)===k);
  return hit.length===1?hit[0].id:null;
}
function espnRosterNames(body){ try{ for(const grp of (body&&body.athletes)||[]) for(const a of (grp&&grp.items)||[grp])
  if(a&&a.id&&(a.fullName||a.displayName)) ESPN_NAMES[String(a.id)]=String(a.fullName||a.displayName).trim(); }catch(e){} }
/* each athlete of a game's read on a player: by PAY.espn_ids, else by name within the game's two clubs */
async function espnPlace(per,g,ev){
  const ids=PAY&&PAY.espn_ids&&typeof PAY.espn_ids==='object'?PAY.espn_ids:{}, placed={}, left=[];
  for(const aid of Object.keys(per)){ const pid=ids[aid]; if(typeof pid==='string'&&pid) placed[aid]=pid; else left.push(aid); }
  if(!left.length) return placed;
  const need=left.filter(a=>ESPN_NAMES[a]==null);
  if(need.length>ESPN_NAME_EACH){ const cl=espnClubs(ev);
    for(const s of ['away','home']) if(cl&&(cl[s].id||cl[s].esp)){ const r=await espnFetch(`${ESPN_TEAM}${encodeURIComponent(cl[s].id||cl[s].esp)}/roster`); if(r.status===200) espnRosterNames(r.body); } }
  else for(const aid of need){ const r=await espnFetch(`${ESPN_CORE}/seasons/${SEASON}/athletes/${aid}?lang=en&region=us`);
    if(r.status===200&&r.body){ const n=String(r.body.fullName||r.body.displayName||'').trim(); if(n) ESPN_NAMES[aid]=n; } }
  const pool=Object.values(S.players||{}).filter(p=>p&&(p.team===g.a||p.team===g.h));
  for(const aid of left){ const nm=ESPN_NAMES[aid]; if(!nm) continue; const pid=espnByName(nm,pool); if(pid) placed[aid]=pid; }
  return placed;
}
/* the read of one game as the page keeps it: {at, lines, rungs, td}, one ESPN id a player (the first) */
function espnBlock(per,placed,at){
  const b={at:espnIso(at),lines:{},rungs:{},td:[]}, seen=new Set();
  for(const aid of Object.keys(placed).sort((x,y)=>x-y)){ const pid=placed[aid], a=per[aid]; if(seen.has(pid)||!a) continue; seen.add(pid);
    if(Object.keys(a.lines).length) b.lines[pid]={...a.lines};
    if(Object.keys(a.rungs).length) b.rungs[pid]=JSON.parse(JSON.stringify(a.rungs));
    if(a.td) b.td.push(pid); }
  b.td.sort(); return b;
}
/* one game: its player lines, placed, unless its kickoff came first */
async function espnReadGame(r){
  const pr=await espnProps(r.eid);
  if(pr.st!=='ok') return pr;
  const t=()=>{ const at=pr.at!=null?pr.at:Date.now(); if(pr.at==null) ESPN_RUN.clock=true; return at; };
  if(Math.max(t(),Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  const {per,counts}=espnParseItems(pr.items), placed=await espnPlace(per,r.g,r.ev), at=t();
  if(Math.max(at,Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  return {st:'ok',at,block:espnBlock(per,placed,at),counts:{...counts,athletes:Object.keys(per).length,placed:Object.keys(placed).length}};
}
/* the press: gid, that game alone; none, every game of the week still to come. false where it does
   nothing (a read already running, or no game to read) */
async function espnRefresh(gid){
  if(ESPN_RUN.busy||!S||!S.sched) return false;
  const one=gid?S.sched.find(x=>x.id===gid):null; if(gid&&!one) return false;
  const w=one?+one.w:currentWeek(), games=(one?[one]:gamesIn(w)).filter(g=>!gameStarted(g)&&!hasScore(g));
  if(!games.length){ espnPaint(); return false; }
  ESPN_RUN={busy:true,gid:gid||null,week:w,total:games.length,done:0,requests:0,clock:false};
  espnPaint();
  const out={}; let changed=false;
  try{
    const sb=await espnFetch(`${ESPN_SB}?dates=${SEASON}&${espnWeekQ(w)}&_=${Date.now()}`);
    const evs=sb.status===200&&sb.body&&Array.isArray(sb.body.events)?sb.body.events:null;
    if(!evs){ for(const g of games) out[g.id]={st:'failed',why:sb.why||'a scoreboard with no events'}; }
    else {
      const sbAt=sb.at!=null?sb.at:Date.now(); if(sb.at==null) ESPN_RUN.clock=true;
      const byPair={}; for(const g of games) byPair[[g.a,g.h].sort().join('|')]=g;
      const reads=[];
      for(const ev of evs){ const cl=espnClubs(ev), g=cl&&byPair[[cl.home.ab,cl.away.ab].sort().join('|')];
        if(!g||reads.some(r=>r.g===g)||out[g.id]) continue;
        const k=kickoff(g), e=Date.parse(ev&&ev.date), ko=Math.min(k?k.getTime():Infinity,isFinite(e)?e:Infinity);
        if(Math.max(sbAt,Date.now())>=ko){ out[g.id]={st:'kicked',why:'kicked off before it was read'}; continue; }
        if(espnApplyGame(g,espnOdds(ev,g),sbAt)) changed=true;
        reads.push({g,ev,ko,eid:String(ev.id||'')}); }
      for(const g of games) if(!out[g.id]&&!reads.some(r=>r.g===g)) out[g.id]={st:'failed',why:'not on ESPN’s scoreboard'};
      ESPN_RUN.done=games.length-reads.length; espnPaint();
      await espnPool(reads.map(r=>async()=>{
        let res; try{ res=/^\d+$/.test(r.eid)?await espnReadGame(r):{st:'failed',why:'no ESPN event id'}; }catch(e){ res={st:'failed',why:String(e&&e.message||e)}; }
        out[r.g.id]=res;
        if(res.st==='ok'){ (ESPN_LIVE[String(w)]||(ESPN_LIVE[String(w)]={}))[r.g.id]=res.block; changed=true; }
        ESPN_RUN.done++; espnPaint(); }),ESPN_POOL);
    }
  }catch(e){ console.error(e); for(const g of games) if(!out[g.id]) out[g.id]={st:'failed',why:String(e&&e.message||e)}; }
  finally{
    const now=Date.now(); for(const id in out) ESPN_OUT[id]={...out[id],block:undefined,when:now};
    ESPN_RUN={...ESPN_RUN,busy:false,done:ESPN_RUN.total};
    if(changed) ESPN_SEQ++;
    espnRedraw();
  }
  return true;
}
/* S as save() writes it: the published game lines in place of any a press read */
function espnSavable(st){
  if(!st||!Array.isArray(st.sched)||!Object.keys(ESPN_GL).length) return st;
  return {...st,sched:st.sched.map(g=>{ const o=ESPN_GL[g&&g.id]; if(!o) return g; const c={...g};
    for(const k of ESPN_GL_KEYS){ if(o.orig[k]===undefined) delete c[k]; else c[k]=o.orig[k]; } return c; })};
}
/* any read for a week's games (or this week's), and the latest read time (ms) */
function espnOn(week){ const W=ESPN_LIVE[String(week==null?currentWeek():week)]; return !!W&&Object.keys(W).length>0; }
function espnAny(){ return Object.values(ESPN_LIVE).some(W=>W&&Object.keys(W).length>0); }
function espnLatest(week){ let t=0; for(const [w,W] of Object.entries(ESPN_LIVE)) if(week==null||String(week)===w) for(const e of Object.values(W||{})){ const a=Date.parse(e&&e.at); if(a>t) t=a; } return t||null; }
/* a game's read, or null: none, not the shape the reader writes, or read at or after its kickoff */
function espnGame(gid,week){
  try{
    const W=ESPN_LIVE[String(week)], e=W&&W[gid];
    if(!e||typeof e!=='object'||!e.lines||typeof e.lines!=='object'||Array.isArray(e.lines)) return null;
    const g=((S&&S.sched)||[]).find(x=>x.id===gid), k=g&&kickoff(g), at=Date.parse(e.at);
    if(!k||!isFinite(at)||at>=k.getTime()) return null;
    return e;
  }catch(err){ return null; }
}
/* when a read was, as the page says it: "Thu 11:08 PM ET", or the time alone within half a day */
function espnWhen(at){ const t=typeof at==='number'?at:Date.parse(at); if(!isFinite(t)) return 'at a time not recorded';
  return new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit'})+' ET'; }
function espnClock(t){ if(!isFinite(t)||!t) return 'at a time not recorded'; if(Math.abs(Date.now()-t)>12*3600e3) return espnWhen(t);
  return new Date(t).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET'; }
/* the status line beside a button: the published prices before a press, the read's progress during
   one, and after it what it read (gid, that game's; none, the week's games still to come) */
function espnStatus(gid){
  const R=ESPN_RUN;
  if(R.busy) return `Reading DraftKings’ lines from ESPN… ${R.done} of ${R.total} game${R.total===1?'':'s'}`;
  const g1=gid&&S&&S.sched?S.sched.find(x=>x.id===gid):null, w=String(g1?g1.w:currentWeek()), ids=gid?[gid]:pbGames().map(g=>g.id);
  const live=ESPN_LIVE[w]||{}, read=ids.filter(id=>live[id]), lined=ids.filter(id=>ESPN_GL[id]);
  const pub=`Prices as published${PAY&&PAY.baked_at?' '+espnWhen(PAY.baked_at):''}`;
  if(!ids.some(id=>ESPN_OUT[id])&&!read.length&&!lined.length) return pub+'.';
  const t=Math.max(0,...read.map(id=>Date.parse(live[id].at)),...lined.map(id=>ESPN_GL[id].at));
  const parts=[read.length?`DraftKings’ lines from ESPN, read ${espnClock(t)}: player prices estimated from the line`:(lined.length?`DraftKings’ game lines from ESPN, read ${espnClock(t)}`:pub)];
  const none=ids.filter(id=>!live[id]&&ESPN_OUT[id]&&ESPN_OUT[id].st==='none').length, fail=ids.filter(id=>ESPN_OUT[id]&&ESPN_OUT[id].st==='failed');
  if(none) parts.push(gid?'DraftKings has posted no player lines for it yet':`${none} game${none===1?' has':'s have'} no lines posted yet`);
  if(fail.length){ const n=fail.length, old=fail.filter(id=>live[id]).length;
    parts.push(gid?`couldn’t reach ESPN: ${old?'the lines read before stand':'the published prices stand'}`
      :`couldn’t reach ESPN for ${n} game${n===1?'':'s'}: ${n===1?'its':'their'} ${old===n?'last read stands':(old?'last read or published prices stand':'published prices stand')}`); }
  const s=parts.join('; ')+'.'; return s[0].toUpperCase()+s.slice(1);
}
/* the status lines and buttons on the screen, in place (a read in progress redraws nothing else) */
function espnPaint(){ try{
  document.querySelectorAll('[data-espn-status]').forEach(el=>{ const k=el.dataset.espnStatus; el.textContent=espnStatus(k==='week'?null:k); });
  document.querySelectorAll('[data-espn-refresh]').forEach(b=>b.setAttribute('aria-busy',ESPN_RUN.busy?'true':'false'));
}catch(e){} }
/* the button and its status line: gid a game's page, none the week; where says which, for its id */
function espnCtl(gid,where){
  const k=gid||'week', id='espnSt-'+where, what=gid?'this game':'every game of the week still to come';
  return `<div class="espn-ctl" data-espn-ctl="${esc(k)}"><button type="button" class="btn quiet espn-btn" data-espn-refresh="${esc(k)}" aria-describedby="${id}" aria-busy="${ESPN_RUN.busy?'true':'false'}" title="Read DraftKings’ current lines for ${what} from ESPN now: free, in this browser, only when pressed. The game lines come with DraftKings’ own prices; a player’s price is our estimate from his line.">Refresh odds</button><span class="espn-st" id="${id}" data-espn-status="${esc(k)}" role="status" aria-live="polite">${esc(espnStatus(gid))}</span></div>`;
}
/* after a press: every cache a price stands on dropped, the page drawn again, the focus kept */
function espnRedraw(){
  const a=document.activeElement, fk=a&&a.dataset?a.dataset.espnRefresh:null;
  const where=fk&&a.closest?(a.closest('#gameView')?'#gameView':(a.closest('#pbPanel')?'#pbPanel':(a.closest('#slateOdds')?'#slateOdds':null))):null;
  PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_VIEW={sig:null,key:null,t:{}};
  try{ renderSlate(); }catch(e){ console.error(e); }
  try{ renderParlay(); }catch(e){ console.error(e); }
  espnPaint();
  if(where){ const b=document.querySelector(`${where} [data-espn-refresh="${fk}"]`); try{ if(b) b.focus({preventScroll:true}); }catch(e){} }
}
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('[data-espn-refresh]'):null; if(!b) return;
  e.preventDefault(); const k=b.dataset.espnRefresh; espnRefresh(k==='week'?null:k); });
const espnLineOf=(e,pid,stat)=>{ const v=e&&e.lines&&e.lines[pid]&&e.lines[pid][stat]; return typeof v==='number'&&isFinite(v)&&v>0?v:null; };
const espnListed=(e,pid,stat,k)=>{ const r=e&&e.rungs&&e.rungs[pid]&&e.rungs[pid][stat]; return Array.isArray(r)&&r.some(v=>+v===+k); };
const espnOffersTd=(e,pid)=>!!e&&Array.isArray(e.td)&&e.td.includes(pid);
function espnTeamOf(pid){ const p=S.players&&S.players[pid]; if(p&&p.team) return p.team; const r=PAY.roster&&PAY.roster[pid]; return (r&&r[0])||null; }
/* a club's lines are complete: the read within 36 hours of kickoff, with 4 receiving lines for the club
   (on a Wednesday night ESPN had about 60% of the receivers it carries by kickoff, and "no line" read
   as "a backup" then would price a WR3 at +1000 where DraftKings has him at +400) */
function espnComplete(e,g,team){
  const k=kickoff(g), at=Date.parse(e.at);
  if(!k||!isFinite(at)||k.getTime()-at>DK_EST.complete.hours*3600e3) return false;
  let n=0; for(const pid in e.lines) if(espnTeamOf(pid)===team&&espnLineOf(e,pid,'receiving_yards')!=null) n++;
  return n>=DK_EST.complete.rec;
}
/* a charted starter (QB1, RB1, WR1-2, TE1): with no yards line he is a line not posted, not a backup */
function espnStarter(pl,team){ const d=depthOf(pl), top={QB:1,RB:1,WR:2,TE:1}[pl.grp]; return !!(d&&top&&d.team===team&&d.pos===pl.grp&&d.rank<=top); }
/* the formula's price for one leg of a player (x: rosterFor's {pl, team, opp, ctx}) in game g from
   DraftKings' line read on ESPN: {price, fair, src:'dkline', tested, listed, line, at, how, mainOver},
   or null where the read has no line for it. kind 'main' (side over or under), 'rung' (k+), 'td'. Its
   inputs are the page's own: the model's raw projections (never marketMu or the market's scale), the
   game's implied points (gameCtx) and the depth chart */
function espnPrice(x,g,stat,kind,k,side){
  if(!x||!x.pl||!g) return null;
  const e=espnGame(g.id,g.w); if(!e) return null;
  const pid=x.pl.id, grp=x.pl.grp, T=x.ctx&&isFinite(x.ctx.implied)?x.ctx.implied:null;
  const mu=s=>{ try{ const r=project(x.pl,s,x.opp,x.ctx); return r&&r.mu!=null&&isFinite(r.mu)?r.mu:null; }catch(err){ return null; } };
  if(kind==='td'){
    if(stat!=='any_td'||(+k||1)!==1||!espnOffersTd(e,pid)) return null;
    let p=null; try{ const r=project(x.pl,'any_td',x.opp,x.ctx); p=r?r.p:null; }catch(err){}
    const r=estPrice({kind:'td',p,grp,rushLine:espnLineOf(e,pid,'rushing_yards'),recLine:espnLineOf(e,pid,'receiving_yards'),teamImplied:T,gameLined:espnComplete(e,g,x.team),starter:espnStarter(x.pl,x.team)});
    if(!r||!fairPx(r.price)) return null;
    const ov=fairVig(g.w).player||DK_EST.tdVig;
    return {price:r.price,fair:Math.max(0.001,Math.min(0.999,mlProb(r.price)/ov)),src:'dkline',tested:true,listed:true,line:null,at:e.at,how:r.how,mainOver:false};
  }
  const L=espnLineOf(e,pid,stat); if(L==null) return null;
  const leg={kind,stat,line:L,k,side,grp,recYdsLine:espnLineOf(e,pid,'receiving_yards'),passYdsLine:espnLineOf(e,pid,'passing_yards'),teamImplied:T};
  if(stat==='receptions'){ leg.muRec=mu('receptions'); leg.muRecYds=mu('receiving_yards'); }
  if(stat==='passing_interceptions'||stat==='fg_made') leg.mu=mu(stat);
  if(kind==='rung'){ const M=marketLine(g.w,pid,stat); if(M&&+M.line===L&&fairPx(M.over)&&fairPx(M.under)) leg.mainFair=devigOver(M.over,M.under); }
  const r=estPrice(leg); if(!r||!fairPx(r.price)) return null;
  const mainOver=kind==='rung'&&Math.abs(+k-0.5-L)<1e-9;
  return {price:r.price,fair:r.fair,src:'dkline',tested:(kind==='main'||mainOver?ESPN_TESTED.main:ESPN_TESTED.rung).has(stat),
    listed:kind==='main'||mainOver||espnListed(e,pid,stat,k),line:L,at:e.at,how:r.how,mainOver};
}
/* what a dkline leg carries with it: its fair chance (legFair), when its line was read, and whether
   it is of a tested kind and DraftKings lists it */
const espnOf=d=>({fair:d.fair,at:d.at,tested:!!d.tested,listed:!!d.listed,line:d.line});
/* a player's main line by the precedence above: the paid pull's (real) while it is still DraftKings'
   line, that is while the read has the same number or none for him; the read's where it differs or the
   pull has none, both sides at the formula's price (dkline, with was: the pull's number it replaces) */
function mainOf(x,g,stat){
  const L=marketLine(g.w,x.pl.id,stat), e=espnGame(g.id,g.w), E=e?espnLineOf(e,x.pl.id,stat):null;
  if(L&&(E==null||+L.line===E)) return {src:'real',L,line:L.line};
  const dO=E!=null?espnPrice(x,g,stat,'main',null,'over'):null, dU=dO?espnPrice(x,g,stat,'main',null,'under'):null;
  if(dO&&dU) return {src:'dkline',dO,dU,line:dO.line,was:L?L.line:null};
  return L?{src:'real',L,line:L.line}:null;
}
/* a player leg's est. price where DraftKings' own is not on file: its line from a read priced by the
   formula (src 'dkline'), else the model's estimate as before (src 'est': a rung at rungView's, the
   anytime touchdown at bookPrice on the model's chance). l: statLines' line; kind 'rung' or 'td' */
function plEst(x,g,l,kind,k){
  const d=espnPrice(x,g,l.stat,kind,k,'over'); if(d) return d;
  if(kind==='td') return {price:bookPrice(+k>=2?tdPlus(l.p,+k):l.p),src:'est'};
  return {price:rungView(x.pl,l.stat,l.mu,k,g.w).est,src:'est'};
}
const ESPN_ERR='typically within 0.5 points on yards, 2-3 on receptions, passing TDs, touchdowns and rungs';
/* the title an est. price carries: what it is priced from */
function estTitle(o){
  if(!o) return '';
  if(o.src==='dkline'){
    if(!o.listed) return `Not on DraftKings: it lists no such rung. Priced from DraftKings’ line from ESPN, read ${espnWhen(o.at)}; the price is our estimate`;
    return `DraftKings’ line from ESPN, read ${espnWhen(o.at)}; the price is our estimate (${o.tested?ESPN_ERR:'untested on this market: no DraftKings price on file to check it against'})`; }
  return 'no DraftKings line yet: the model’s estimate';
}
/* an est. price's cell or mark says its basis once a press has read anything (with none the page is as
   it was) */
const estAttr=o=>o&&(o.src==='dkline'||espnAny())?` title="${esc(estTitle(o))}" data-est="${o.src}"`:'';
/* one line where a price from a read is shown: when DraftKings' lines were read, and whether that is a
   day old (a leg in the builder is kept by the browser with the price it was added at) */
function espnReadLine(at){
  const t=at!=null?(typeof at==='number'?at:Date.parse(at)):espnLatest(); if(!isFinite(t)||!t) return '';
  const h=(Date.now()-t)/3600e3;
  return `DraftKings’ lines as read ${espnWhen(t)}; prices estimated`+(h>DK_EST.staleHours?` (read ${Math.round(h)}h ago: press Refresh odds for today’s)`:'')+'.';
}

/* ---------- the lines the suggestions are built from ---------- */
""")

# --- the Props tab: Refresh odds over the game list, on the week whose games are still to come ---
sub1('p3', """        :`Spreads and totals were last pulled ${age.toFixed(0)} day${age>=1.5?'s':''} ago. They are refreshed twice a week; expected points are the biggest single input to every projection.`); } }
""", """        :`Spreads and totals were last pulled ${age.toFixed(0)} day${age>=1.5?'s':''} ago. They are refreshed twice a week; expected points are the biggest single input to every projection.`); } }
  /* Refresh odds over the game list (app v107): every game of the week still to come */
  { const so=$('slateOdds'); if(so){ const on=open&&w===currentWeek()&&pbGames().length>0; so.hidden=!on; so.innerHTML=on?espnCtl(null,'slate'):''; } }
""")

# --- the game page: Refresh odds for this game ---
sub1('p3', """  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;
""", """  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;
  /* Refresh odds for this game alone (app v107): its week's scoreboard and its player lines */
  if(!locked&&!hasScore(g)) html+=espnCtl(g.id,'game');
""")

# --- the game page: the anytime touchdown at its est. price ---
sub1('p3', """          const tf=tod!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:tod,src:'real',week:g.w}):null;""",
     """          const te=plEst(x,g,l,'td',1);
          const tf=tod!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:tod,src:'real',week:g.w})
            :(te.src==='dkline'?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:te.price,src:'dkline',espn:espnOf(te),week:g.w}):null);""")
sub1('p3', """            <td class="num est">${fmtML(bookPrice(l.p))}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr>""",
     """            <td class="num est"${estAttr(te)}>${fmtML(te.price)}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr>""")

# --- the game page: the main line by its precedence, a read's over and under at est. ---
sub1('p3', """        const L=marketLine(g.w,x.pl.id,l.stat);
        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${L?`<em class="mline">book line ${L.line}</em>`:''}</h4><table class="rungs">`;""",
     """        /* the main line by the page's precedence (mainOf): the paid pull's, or DraftKings' line from a
           Refresh odds read where it has moved or the pull has none, both sides at the formula's price */
        const M=mainOf(x,g,l.stat), L=M&&M.src==='real'?M.L:null, dO=M&&M.src==='dkline'?M.dO:null, dU=dO?M.dU:null;
        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${L?`<em class="mline">book line ${L.line}</em>`:(dO?`<em class="mline"${estAttr(dO)}>DraftKings line ${dO.line}${M.was!=null?` <span class="was">(was ${M.was})</span>`:''}</em>`:'')}</h4><table class="rungs">`;""")
sub1('p3', """            <td class="num book real">${fmtML(L.under)}<em>${gapU>=3?'\\u2191':(gapU<=-3?'\\u2193':'')}</em></td></tr>`;
        }""", """            <td class="num book real">${fmtML(L.under)}<em>${gapU>=3?'\\u2191':(gapU<=-3?'\\u2193':'')}</em></td></tr>`;
        } else if(dO&&dU){
          const E=dO.line, pO=pOver(x.pl.grp,l.stat,l.mu,E);
          const onO=cur&&cur.main&&cur.side==='over'&&cur.k===E, onU=cur&&cur.main&&cur.side==='under'&&cur.k===E;
          const mf=(side,d)=>legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:E,side,main:true,p:side==='under'?1-pO:pO,price:d.price,src:'dkline',espn:espnOf(d),week:g.w});
          /* flagged far off DraftKings' line only on a market the estimate has been checked on */
          const fO=dO.tested?mf('over',dO):null, fU=dU.tested?mf('under',dU):null;
          if(fO) far.push(`<p class="faroff" data-far><b>Over ${E}</b> ${farText(pO,fO)}</p>`);
          if(fU) far.push(`<p class="faroff" data-far><b>Under ${E}</b> ${farText(1-pO,fU)}</p>`);
          const row=(side,d,p,on,f)=>`<tr class="mainline est-line ${on?'on':''}${f?' far':''}">
            <td class="pick"><input type="checkbox" ${on?'checked':''} data-leg="${lk}" data-k="${E}" data-side="${side}" data-main="1" aria-label="Add ${side} ${E}"></td>
            <td class="thr">${side==='under'?'Under':'Over'} ${E}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(p)[0]}" style="width:${Math.max(2,p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(p*100).toFixed(0)}%</td><td><span class="conf ${confTier(p)[0]}">${confTier(p)[1]}</span></td>
            <td class="num est"${estAttr(d)}>${fmtML(d.price)}<em>est.</em></td>
            <td class="num book real"></td></tr>`;
          html+=row('over',dO,pO,onO,fO)+row('under',dU,1-pO,onU,fU);
        }""")

# --- the game page: a rung at its est. price, flagged far off on DraftKings' line too ---
sub1('p3', """          const v=rungView(x.pl,l.stat,l.mu,r.k,g.w);
          const rf=od!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:r.k,side:'over',main:false,p:r.p,price:od,src:'real',week:g.w}):null;""",
     """          const v=plEst(x,g,l,'rung',r.k);
          const rf=od!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:r.k,side:'over',main:false,p:r.p,price:od,src:'real',week:g.w})
            :(v.src==='dkline'&&v.listed&&v.tested?legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:r.k,side:'over',main:false,p:r.p,price:v.price,src:'dkline',espn:espnOf(v),week:g.w}):null);""")
sub1('p3', """            <td class="num est">${fmtML(v.est)}<em>est.</em></td>
            <td class="num book real">${od!=null?fmtML(od):''}</td></tr>`;""",
     """            <td class="num est"${estAttr(v)}>${fmtML(v.price)}<em>est.</em></td>
            <td class="num book real">${od!=null?fmtML(od):''}</td></tr>`;""")

# --- the builder: a leg ticked on a game page takes the same price ---
sub1('p3', """  const m=MKT[stat];
  let p,label,price=null,src='est';
  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=tdLabel(pl.grp,kk); price=bookPrice(p); k=kk; }
  else if(main){
    const L=marketLine(game.w,pid,stat); if(!L) return;
    const pO=pOver(pl.grp,stat,pr.mu,L.line);
    p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;
    price=side==='under'?L.under:L.over; src='real';
  } else {
    p=pOver(pl.grp,stat,pr.mu,k-0.5); label=`${k}+ ${m.lbl.toLowerCase()}`;
    const real=oddsFor(gid,pid,stat,k);
    if(real!=null){ price=real; src='real'; } else price=rungView(pl,stat,pr.mu,k,game.w).est;
  }
  /* one pick per player and stat: writing to the same key replaces whatever was there */
  S.parlay[key]={gid,pid,stat,k,side,main:!!main,p,price,src,mu:m.prob?null:pr.mu,name:pl.n,pos:pl.pos,grp:pl.grp,
    team,opp,week:game.w,label};""",
     """  const m=MKT[stat];
  /* each leg's price by the page's order: DraftKings' own while its line stands, else its line from a
     Refresh odds read priced by the formula (dkline), else the model's estimate; a dkline leg carries
     its fair chance and read time */
  const x={pl,team,opp,ctx};
  let p,label,price=null,src='est',dk=null;
  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=tdLabel(pl.grp,kk); price=bookPrice(p); k=kk;
    if(kk===1&&oddsFor(gid,pid,'any_td',1)==null){ const d=espnPrice(x,game,'any_td','td',1); if(d){ price=d.price; src='dkline'; dk=d; } } }
  else if(main){
    const M=mainOf(x,game,stat); if(!M) return;
    if(M.src==='real'){ const L=M.L, pO=pOver(pl.grp,stat,pr.mu,L.line);
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;
      price=side==='under'?L.under:L.over; src='real'; }
    else { const d=side==='under'?M.dU:M.dO, pO=pOver(pl.grp,stat,pr.mu,d.line); k=d.line;
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${d.line} ${m.lbl.toLowerCase()}`;
      price=d.price; src='dkline'; dk=d; }
  } else {
    p=pOver(pl.grp,stat,pr.mu,k-0.5); label=`${k}+ ${m.lbl.toLowerCase()}`;
    const real=oddsFor(gid,pid,stat,k);
    if(real!=null){ price=real; src='real'; }
    else { const v=plEst(x,game,{stat,mu:pr.mu,p:pr.p},'rung',k); price=v.price; src=v.src; if(v.src==='dkline') dk=v; }
  }
  /* one pick per player and stat: writing to the same key replaces whatever was there */
  S.parlay[key]={gid,pid,stat,k,side,main:!!main,p,price,src,mu:m.prob?null:pr.mu,name:pl.n,pos:pl.pos,grp:pl.grp,
    team,opp,week:game.w,label,...(dk?{espn:espnOf(dk)}:{})};""")

# --- the lines the suggestions are built from: a tested dkline leg beside the real ones ---
sub1('p3', """/* every line this week with a real sportsbook price, team bets and players, unjudged. A game total
   is not among them:""", """/* every line this week with a real sportsbook price, team bets and players, unjudged, and (app v107)
   every player leg of a tested kind priced from DraftKings' line read by Refresh odds where the pull has
   no price for it or its line has moved since (src 'dkline': a main line on passing, rushing or receiving
   yards, receptions or passing touchdowns, the anytime touchdown, a yards rung DraftKings lists). Team
   bets are at the game's lines, a read's where one is newer. A game total is not among them:""")
sub1('p3', """        if(l.prob){ const od=oddsFor(g.id,x.pl.id,'any_td',1);
          if(od!=null) out.push({...base,key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:od,mu:null,label:tdLabel(x.pl.grp,1)});
          continue; }
        const L=marketLine(g.w,x.pl.id,l.stat);
        if(L){ const pO=pOver(x.pl.grp,l.stat,l.mu,L.line), lbl=l.m.lbl.toLowerCase();
          if(L.over!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'over',main:true,p:pO,price:L.over,mu:l.mu,label:`Over ${L.line} ${lbl}`});
          if(L.under!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'under',main:true,p:1-pO,price:L.under,mu:l.mu,label:`Under ${L.line} ${lbl}`}); }
        for(const r of l.rungs){ const od=oddsFor(g.id,x.pl.id,l.stat,r.k); if(od==null) continue;
          out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:r.k,side:'over',main:false,p:r.p,price:od,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }""",
     """        if(l.prob){ const od=oddsFor(g.id,x.pl.id,'any_td',1);
          if(od!=null) out.push({...base,key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:od,mu:null,label:tdLabel(x.pl.grp,1)});
          else { const d=espnPrice(x,g,'any_td','td',1);
            if(d&&d.tested) out.push({...base,src:'dkline',espn:espnOf(d),key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:d.price,mu:null,label:tdLabel(x.pl.grp,1)}); }
          continue; }
        const M=mainOf(x,g,l.stat);
        if(M&&M.src==='real'){ const L=M.L, pO=pOver(x.pl.grp,l.stat,l.mu,L.line), lbl=l.m.lbl.toLowerCase();
          if(L.over!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'over',main:true,p:pO,price:L.over,mu:l.mu,label:`Over ${L.line} ${lbl}`});
          if(L.under!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'under',main:true,p:1-pO,price:L.under,mu:l.mu,label:`Under ${L.line} ${lbl}`}); }
        else if(M&&ESPN_TESTED.main.has(l.stat)){ const dO=M.dO, dU=M.dU, pO=pOver(x.pl.grp,l.stat,l.mu,dO.line), lbl=l.m.lbl.toLowerCase();
          out.push({...base,src:'dkline',espn:espnOf(dO),key:legKey(g.id,x.pl.id,l.stat),k:dO.line,side:'over',main:true,p:pO,price:dO.price,mu:l.mu,label:`Over ${dO.line} ${lbl}`});
          out.push({...base,src:'dkline',espn:espnOf(dU),key:legKey(g.id,x.pl.id,l.stat),k:dU.line,side:'under',main:true,p:1-pO,price:dU.price,mu:l.mu,label:`Under ${dU.line} ${lbl}`}); }
        for(const r of l.rungs){ const od=oddsFor(g.id,x.pl.id,l.stat,r.k);
          if(od!=null){ out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:r.k,side:'over',main:false,p:r.p,price:od,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); continue; }
          /* the rung at the main line's own number is that line's over, offered as the main line */
          const d=ESPN_TESTED.rung.has(l.stat)?espnPrice(x,g,l.stat,'rung',r.k,'over'):null;
          if(d&&d.tested&&d.listed&&!d.mainOver) out.push({...base,src:'dkline',espn:espnOf(d),key:legKey(g.id,x.pl.id,l.stat),k:r.k,side:'over',main:false,p:r.p,price:d.price,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }""")

# --- a dkline leg's fair chance: the formula's own, est. ---
sub1('p3', """function legFair(l,memo){
  if(!l) return null;
  const pr=legPrice(l); if(!pr||pr.src!=='real'||!fairPx(pr.ml)) return null;""",
     """function legFair(l,memo){
  if(!l) return null;
  const pr=legPrice(l);
  /* priced from DraftKings' line read by Refresh odds (app v107): the formula's own fair chance, est. (a
     main line's side its fair chance, a rung's before the hold; the anytime touchdown's its price over
     the week's typical player overround, or 1.0566 with none) */
  if(pr&&pr.src==='dkline'&&fairPx(pr.ml)){
    if(l.stat==='any_td'){ const m=memo||{}, wk=String(l.week), V=m[wk]||(m[wk]=fairVig(l.week)), ov=V.player||DK_EST.tdVig;
      return {p:Math.max(0.001,Math.min(0.999,mlProb(pr.ml)/ov)),est:true}; }
    const f=l.espn&&l.espn.fair; return f>0&&f<1?{p:f,est:true}:null; }
  if(!pr||pr.src!=='real'||!fairPx(pr.ml)) return null;""")

# --- the panel's pool: a tested dkline leg counts as a book price ---
sub1('p3', """    if(!pbAllows(c)||c.src!=='real'||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;""",
     """    if(!pbAllows(c)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;""")

# --- why a level is empty, once a press has read the ticked games ---
sub1('p3', """const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
function pbWhy(n,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`:`No ${n}-leg parlay on your picks`;
  if(c&&c.players&&!pool.plGames) return c.teams?`${what}, and ${PB_NO_PL}`:PB_NO_PL[0].toUpperCase()+PB_NO_PL.slice(1);""",
     """const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
/* (app v107) once Refresh odds has read the ticked games, a game with no player leg is one DraftKings had
   posted no player lines for: a line read is priced here by estimate, so the reason is the lines */
function pbNoPl(){ const at=espnLatest(currentWeek());
  return `no player lines yet: DraftKings had posted none for these games when Refresh odds last read them from ESPN${at?` (${espnWhen(at)})`:''}; DraftKings’ own prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`; }
function pbWhy(n,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`:`No ${n}-leg parlay on your picks`;
  if(c&&c.players&&!pool.plGames){ const np=c.espn?pbNoPl():PB_NO_PL; return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""")
sub1('p3', """  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats)};""",
     """  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats),
    espn:games.some(g=>ESPN_OUT[g.id]&&(ESPN_OUT[g.id].st==='ok'||ESPN_OUT[g.id].st==='none'))};
  out.espnRead=c.espn;""")

# --- what the tiers stand on: a press is a change of data ---
sub1('p3', """function pbDataSig(){ return [PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig()].join('|'); }""",
     """function pbDataSig(){ return [PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig(),'e'+ESPN_SEQ].join('|'); }""")
sub1('p3', """  return [g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||'',suggestSide()].join('|');""",
     """  return [g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||'',suggestSide(),'e'+ESPN_SEQ].join('|');""")

# --- a level's card: est. on a dkline leg's price, the level's price est., and one line on why ---
sub1('p3', """/* a turned level (v, the visitor's view of it) is chosen from the legs the card has not shown""",
     """/* what a leg priced from DraftKings' line read by Refresh odds is, on a level's card or an Elo pick's */
function pbEspnLine(legs){
  const e=legs.filter(l=>l.src==='dkline'), n=e.length, at=e.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0];
  return `${n===1?'One leg is':n+' legs are'} priced from DraftKings’ line read on ESPN${at?' ('+espnWhen(at)+')':''}: the line is DraftKings’ own, the price our estimate of DraftKings’, so the price and payout are estimates. Check ${n===1?'it':'them'} on DraftKings before you bet.`;
}
/* a turned level (v, the visitor's view of it) is chosen from the legs the card has not shown""")
sub1('p3', """  const form=formSig()!=='', wrapped=o.ctl&&t.turned&&PB_VIEW.t[t.id]&&PB_VIEW.t[t.id].wrapped, fm={};""",
     """  const form=formSig()!=='', wrapped=o.ctl&&t.turned&&PB_VIEW.t[t.id]&&PB_VIEW.t[t.id].wrapped, fm={}, nE=t.legs.filter(l=>l.src==='dkline').length;""")
sub1('p3', """    <div class="pb-nums">${pbChanceHtml(t.fair,chance,o)}<div><b>${fmtML(decToML(t.dec))}</b><span>price</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>""",
     """    <div class="pb-nums">${pbChanceHtml(t.fair,chance,o)}<div><b>${fmtML(decToML(t.dec))}</b><span>${nE?'price, est.':'price'}</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>""")
sub1('p3', """</small>${ff?`<small class="faroff" data-pb-far>${farText(l.p,ff)}</small>`:''}</span><span class="pr">${fmtML(l.price)}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span></li>`; }).join('')}</ul>
    ${t.thin?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt?`<p class="pb-thin">${pbMktLine(t.legs,pbMktWhy(t,v))}</p>`:''}""",
     """</small>${ff?`<small class="faroff" data-pb-far>${farText(l.p,ff)}</small>`:''}</span><span class="pr">${fmtML(l.price)}${l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:''}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span></li>`; }).join('')}</ul>
    ${t.thin?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt?`<p class="pb-thin">${pbMktLine(t.legs,pbMktWhy(t,v))}</p>`:''}${nE?`<p class="pb-thin pb-espnline">${pbEspnLine(t.legs)}</p>`:''}""")

# --- the panel: the button among its controls, its notes and its foot ---
sub1('p3', """      <div class="pb-row"><span class="pb-lbl">Build from</span>${seg}</div>""",
     """      <div class="pb-row pb-odds-row"><span class="pb-lbl">Odds</span>${espnCtl(null,'pb')}</div>
      <div class="pb-row"><span class="pb-lbl">Build from</span>${seg}</div>""")
sub1('p3', """  const notes=[];
  if(formSig()==='noform') notes.push('The Elo ratings are still loading: player legs join once they are in.');""",
     """  /* the levels as their cards show them (a level the visitor turned, else the panel's own) */
  const shown=r.tiers.map(t=>t.why?t:pbShownTier(t.id)), dkLegs=[].concat(...shown.map(t=>t&&t.legs?t.legs.filter(l=>l.src==='dkline'):[])), espnW=espnOn(w);
  const notes=[];
  if(formSig()==='noform') notes.push('The Elo ratings are still loading: player legs join once they are in.');
  if(dkLegs.length) notes.push(`A player leg marked est. is priced from DraftKings’ line read on ESPN by Refresh odds, where DraftKings’ own price is not on file or its line has moved since: ${esc(espnReadLine(dkLegs.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null))} The line is DraftKings’, the price our estimate of DraftKings’ (${ESPN_ERR} on weeks it was not fitted on), and it counts here as a book price does.`);""")
sub1('p3', """  if(r.noPlayerPrices&&r.tiers.some(t=>t.legs)) notes.push('Player prices are not in yet for your picks, so the tiers below are built without player legs: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).');""",
     """  if(r.noPlayerPrices&&r.tiers.some(t=>t.legs)) notes.push(r.espnRead?`No player lines are in yet for your picks, so the tiers below are built without player legs: ${pbNoPl().replace(/^no player lines yet: /,'')}`:'Player prices are not in yet for your picks, so the tiers below are built without player legs: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).');""")
sub1('p3', """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.far&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(`No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`);""",
     """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.far&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(espnW?`No line on your picks has a price the model rates at or above the book yet, DraftKings’ lines read by Refresh odds included. DraftKings’ own prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`
    :`No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`);""")
sub1('p3', """    <div class="pb-tiers">${r.tiers.map(t=>pbTierCard(t.why?t:pbShownTier(t.id),{ctl:!t.why})).join('')}</div>
    <p class="muted pb-foot">Every leg has a real sportsbook price and a model chance between 45% and 97%,""",
     """    <div class="pb-tiers">${r.tiers.map((t,i)=>pbTierCard(shown[i],{ctl:!t.why})).join('')}</div>
    <p class="muted pb-foot">Every leg has a real sportsbook price${espnW?' (or, marked est., DraftKings’ line read by Refresh odds at our estimate of its price, on main lines, touchdowns and yards ladders, the markets the estimate has been checked on)':''} and a model chance between 45% and 97%,""")

# --- the suggestions record is the job's, on the published prices ---
sub1('p3', """as the job last saw it before a wave of kickoffs, frozen at kickoff and graded as a book settles it (a push drops out, and so does a player who did not play; one who played with no stat line is graded on zero).""",
     """as the job last saw it before a wave of kickoffs, frozen at kickoff and graded as a book settles it (a push drops out, and so does a player who did not play; one who played with no stat line is graded on zero). It is the panel on the published prices: Refresh odds changes the panel on your screen, never this record.""")

# --- a game page's hands: a dkline leg's mark says what it is, and the hand says its price is estimated ---
sub1('p3', """:`<b>${(t.corr*100).toFixed(0)}%</b> to land <span class="muted">(the model’s chance: no fair chance without every leg’s book price)</span>`} <span class="muted">·</span> <b>${fmtML(decToML(t.dec))}</b>${stake?` <span class="muted">pays $${(stake*t.dec).toFixed(2)}</span>`:''}</div>""",
     """:`<b>${(t.corr*100).toFixed(0)}%</b> to land <span class="muted">(the model’s chance: no fair chance without every leg’s book price)</span>`} <span class="muted">·</span> <b>${fmtML(decToML(t.dec))}</b>${t.legs.some(l=>l.src==='dkline')?' <span class="muted" data-gsugg-est>estimated price</span>':''}${stake?` <span class="muted">pays $${(stake*t.dec).toFixed(2)}</span>`:''}</div>""")
sub1('p3', """<span class="pr">${fmtML(l.price)}${l.src==='real'?'':'<i class="est"> est.</i>'}<em>${(l.p*100).toFixed(0)}%</em></span></label></li>`; }).join('')}</ul></div>`; };""",
     """<span class="pr">${fmtML(l.price)}${l.src==='real'?'':`<i class="est"${l.src==='dkline'?estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true}):''}> est.</i>`}<em>${(l.p*100).toFixed(0)}%</em></span></label></li>`; }).join('')}</ul></div>`; };""")

# --- a game page's hands: a tested dkline leg as a book price, never an untested one ---
sub1('p3', """      if(l.prob){ const key=legKey(g.id,x.pl.id,'any_td');
        if(!have.has(key+'@1over')) out.push({...base,stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:bookPrice(l.p),mu:null,label:tdLabel(x.pl.grp,1)});
        continue; }
      const key=legKey(g.id,x.pl.id,l.stat);
      for(const r of l.rungs){ if(have.has(key+'@'+r.k+'over')) continue;
        out.push({...base,key,k:r.k,side:'over',main:false,p:r.p,price:rungView(x.pl,l.stat,l.mu,r.k,g.w).est,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }""",
     """      /* a leg with no real price: DraftKings' line from a Refresh odds read where there is one (a tested
         kind DraftKings lists counts as a book price; any other is shown on the page and never
         suggested), else the model's estimate as before */
      if(l.prob){ const key=legKey(g.id,x.pl.id,'any_td');
        if(!have.has(key+'@1over')){ const d=oddsFor(g.id,x.pl.id,'any_td',1)==null?espnPrice(x,g,'any_td','td',1):null;
          if(d){ if(d.tested&&d.listed) out.push({...base,src:'dkline',espn:espnOf(d),stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:d.price,mu:null,label:tdLabel(x.pl.grp,1)}); }
          else out.push({...base,stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:bookPrice(l.p),mu:null,label:tdLabel(x.pl.grp,1)}); }
        continue; }
      const key=legKey(g.id,x.pl.id,l.stat);
      for(const r of l.rungs){ if(have.has(key+'@'+r.k+'over')) continue;
        const d=oddsFor(g.id,x.pl.id,l.stat,r.k)==null?espnPrice(x,g,l.stat,'rung',r.k,'over'):null;
        if(d){ if(d.tested&&d.listed&&!d.mainOver) out.push({...base,src:'dkline',espn:espnOf(d),key,k:r.k,side:'over',main:false,p:r.p,price:d.price,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); continue; }
        out.push({...base,key,k:r.k,side:'over',main:false,p:r.p,price:rungView(x.pl,l.stat,l.mu,r.k,g.w).est,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }""")

# --- the builder: est. on a dkline leg, and when its line was read ---
sub1('p3', """      <td class="num">${fmtML(prices[i].ml)} <span class="muted" style="font-size:11px">${prices[i].src==='real'?'real':(prices[i].src==='est'?'est.':'fair')}</span></td>""",
     """      <td class="num">${fmtML(prices[i].ml)} <span class="muted" style="font-size:11px"${prices[i].src==='dkline'?estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true}):''}>${prices[i].src==='real'?'real':(prices[i].src==='est'||prices[i].src==='dkline'?'est.':'fair')}</span></td>""")
sub1('p3', """  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">These legs are in different weeks""",
     """  if(prices.some(p=>p.src==='dkline')) html+=`<p class="muted espn-read" style="margin:10px 0 0;font-size:12px" data-espn-read>${esc(espnReadLine(legs.filter((l,i)=>prices[i].src==='dkline').map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null))} A leg marked est. is priced from DraftKings’ line read on ESPN: the line is DraftKings’, the price and its fair chance our estimate.</p>`;
  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">These legs are in different weeks""")

# --- an estimated fair chance says what it is estimated from: one side's price, or DraftKings' line ---
sub1('p3', """  return {p:pr.corr,est:f.some(x=>x.est),miss:0};""",
     """  return {p:pr.corr,est:f.some(x=>x.est),miss:0,dk:legs.some(l=>l&&l.src==='dkline')};""")
sub1('p3', """<span${F.est?' title="Estimated: a leg is priced on one side only, so the week’s typical margin is taken out of its price"':''}>""",
     """<span${F.est?(F.dk?' title="Estimated: a leg is priced from DraftKings’ line read on ESPN by our estimate, and its fair chance with it"':' title="Estimated: a leg is priced on one side only, so the week’s typical margin is taken out of its price"'):''}>""")
sub1('p3', """${fair.est?' (estimated, since a leg is priced on one side only: the week\\u2019s typical margin is taken out of its price)':''}""",
     """${fair.est?(fair.dk?' (estimated: a leg is priced from DraftKings\\u2019 line read on ESPN by our estimate, and its fair chance with it)':' (estimated, since a leg is priced on one side only: the week\\u2019s typical margin is taken out of its price)'):''}""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print("patched: app v107, Refresh odds reads DraftKings' lines from ESPN on a press, priced by the formula and marked est.")
