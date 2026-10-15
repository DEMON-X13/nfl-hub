r"""app v107: DraftKings' lines read free from ESPN, priced by a best-guess formula and marked est.

The owner, 15 October 2026: "the prices arent really important tbh. if we can get free odd pulls
without the prices and have you come up with a formula that gives the closest of what your best guess
would be of that money price, that would be fine. point is to have a ballpark amount that we can make
educated guesses with. the prices move so much anyway moving up to the game that its almost not really
needed." And, of the placeholder work stopped the same day: "cant we stop placeholders since this kind
of overrides that". So no placeholder list: a leg the paid pull has no price for is priced, leg by
leg, from DraftKings' own line where ESPN carries it.

What the job gives the page. Every run of the props job reads DraftKings' player lines from ESPN's free
feed (props/build/espn_lines.py, no credit, no price: the line alone) and the bake carries them as
PAY.espn[week][gid] = {at, frozen, lines:{pid:{stat:line}}, rungs:{pid:{stat:[k...]}}, td:[pid]},
with PAY.espn_meta = {at, ok, games_read, games_carried, note}. A payload baked before has neither,
and then the page is exactly what it was.

The formula (part2.js, DK_EST and estPrice, from formula/synth/est_price.js). A main line's two sides
are each its fair chance times one plus DraftKings' margin: 50/50 on yards (-112 each way), a fitted
logit on receptions (his receiving-yards line and the model's own projections) and passing touchdowns
(his team's points and his passing-yards line), 50/50 on the other counts, a Poisson on the model's
projection for interceptions and field goals. A k+ rung is a power curve about the line on yards and a
Poisson set by the line on the counts, then a fitted hold; the anytime touchdown is a logit on the
model's chance, his yards lines and his team's points (as a backup where his club's lines are complete
and he is not a charted starter, else the model alone). Fitted on DraftKings' own prices only, never a
result; held out on weeks 4-5 it lands within half a point of DraftKings' price on every yards line,
and within 1.5 to 3 points on receptions, passing touchdowns, the anytime touchdown and the yards
rungs, where the model's own estimate was 5 to 8 points off. Two changes from est_price.js: a rung also
returns its fair chance (before the hold) for legFair, and every count ladder is the Poisson (the yards
curve would have priced a carries ladder far too flat); both touch untested ladders only.

Each leg's price, in order (part3.js): a real DraftKings price from the paid pull (src 'real',
unchanged); DraftKings' line from ESPN priced by the formula (src 'dkline'); else the model's estimate
as before (src 'est'). A read at or after its game's kickoff is never used. Every dkline price shows
est., with a title saying it is DraftKings' line from ESPN, when it was read, and that the price is our
estimate (and how close it has been, or that the market is untested); the game page, the panel and
the builder carry one line saying when the lines were read, and "last read Nh ago" once a day old. The
game pages now show a main line, over and under, for every player with one on ESPN; rungs and the
anytime touchdown take the formula's price where ESPN has the line.

Where legs are chosen (the owner's call, through the lead, 15 October 2026): a dkline leg of a tested
kind counts like a real price in the Parlay Builder's levels (the same band, edge, market + form and
far-off rules, the far-off rule on its estimated fair chance), a game page's hands and the Elo picks:
main lines on passing, rushing and receiving yards, receptions and passing touchdowns, the anytime
touchdown, and a yards rung DraftKings lists. Every other dkline leg is shown, est., and never chosen;
a model-only est. leg stays where it was (a game page's hands alone). A level, a hand or a card with a
dkline leg says its price is estimated. The suggestions record keeps the panel as shown, each leg with
its src, and says so at the panel's foot.

The panel's notes and empty-level reasons say what is true now that a game whose DraftKings prices are
not pulled can still have priced player legs: "no player prices yet" only where there is no player leg
at all, worded for the ESPN read once the job makes one.

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

# --- the style of an est. mark on a level's card, and the read line ---
sub1('p1', """.pb-thin{margin:0;font-size:11.5px;color:var(--ink-2)}
""", """.pb-thin{margin:0;font-size:11.5px;color:var(--ink-2)}
.pb-legs .pr .est{font-style:normal;font-size:10.5px;font-weight:500;color:var(--muted);margin-left:2px}
.espn-read{color:var(--ink-2)}
""")

# --- part2: the formula, beside bookPrice ---
sub1('p2', """/* ---------- kickoff lock ---------- */
""", r"""/* ---------- DraftKings' line read on ESPN, priced by a best guess (app v107) ----------
   The owner, 15 October 2026: "if we can get free odd pulls without the prices and have you come up
   with a formula that gives the closest of what your best guess would be of that money price, that
   would be fine." Every run of the props job reads DraftKings' player lines from ESPN's free feed
   (props/build/espn_lines.py: the line, never a price) and the bake carries them as PAY.espn; a player
   leg the paid pull has no price for is priced from DraftKings' own line by these formulas and marked
   est. A real DraftKings price always wins. Nothing in the model changes, and the formulas were fitted
   on DraftKings' own prices alone (2026 weeks 2-3, and its DET at BUF ladders of week 2), never on a
   game's result.

   On weeks they were not fitted on (4-5) the guess lands within half a point of DraftKings' real price
   on every yards line, and within about 1.5 to 3 points on receptions, passing touchdowns, the anytime
   touchdown and the yards ladder rungs, against 5 to 8 for the model's own estimate on the same legs.
   Completions, attempts, carries, rush + rec yards, interceptions, field goals, kicking points and the
   receptions and passing-TD rungs have no DraftKings price on file to test against: priced by reasoning
   alone, shown est. on the game pages, and never suggested (ESPN_TESTED in part3.js).

   DK_EST and the functions below are formula/synth/est_price.js, assembled from the three research
   parts, with three changes: a rung also returns its fair chance (before the hold, for legFair); a
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
  /* a read older than this many hours is said to be */
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

# --- part3: the ESPN helpers, before the lines the suggestions are built from ---
sub1('p3', """/* ---------- the lines the suggestions are built from ---------- */
""", r"""/* ---------- DraftKings' lines read on ESPN (app v107) ----------
   PAY.espn[week][gid] is what the props job read from ESPN's free feed before the game's kickoff:
   {at (when), frozen, lines:{pid:{stat:line}}, rungs:{pid:{stat:[k,...]}} (the k+ milestones DraftKings
   lists), td:[pid] (the players DraftKings offers an anytime touchdown)}. A player leg's price, in
   order: a real DraftKings price from the paid pull (src 'real', unchanged); DraftKings' line from ESPN
   priced by the formula in part2.js (src 'dkline', est.); else the model's own estimate as before (src
   'est', est.). A read at or after its game's kickoff is never used (the feed carries in-play values
   from then), and a game that has kicked off offers nothing anyway.

   Where the page chooses legs (the Parlay Builder's levels, a game page's hands, the Elo picks) a dkline
   leg of a tested kind counts as a book price does, by the same rules (the owner's call, 15 October
   2026): a main line, over or under, on passing, rushing or receiving yards, receptions or passing
   touchdowns; the anytime touchdown; and a yards ladder rung DraftKings lists, anchored on its line.
   Every other dkline leg (completions, attempts, carries, rush + rec yards, interceptions, field goals,
   kicking points, the receptions and passing-TD ladders, and a rung DraftKings does not list) is priced
   and shown, est., on the game pages and never suggested; a model-only est. leg stays where it was, in
   a game page's hands alone. A dkline leg's fair chance is the formula's own (legFair), est. */
const ESPN_TESTED={main:new Set(['passing_yards','rushing_yards','receiving_yards','receptions','passing_tds']),rung:new Set(['passing_yards','rushing_yards','receiving_yards'])};
/* any ESPN read for a week's games */
function espnOn(week){ try{ const W=PAY&&PAY.espn&&PAY.espn[String(week==null?currentWeek():week)]; return !!W&&typeof W==='object'&&Object.keys(W).length>0; }catch(e){ return false; } }
/* a game's read, or null: none, not the shape the job writes, or read at or after its kickoff */
function espnGame(gid,week){
  try{
    const W=PAY&&PAY.espn&&PAY.espn[String(week)], e=W&&W[gid];
    if(!e||typeof e!=='object'||!e.lines||typeof e.lines!=='object'||Array.isArray(e.lines)) return null;
    const g=((S&&S.sched)||[]).find(x=>x.id===gid), k=g&&kickoff(g), at=Date.parse(e.at);
    if(!k||!isFinite(at)||at>=k.getTime()) return null;
    return e;
  }catch(err){ return null; }
}
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
   or null where ESPN has no line for it. kind 'main' (side over or under), 'rung' (k+), 'td'. Its
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
/* a player leg's est. price where DraftKings' own is not on file: its line from ESPN priced by the
   formula (src 'dkline'), else the model's estimate as before (src 'est': a rung at rungView's, the
   anytime touchdown at bookPrice on the model's chance). l: statLines' line; kind 'rung' or 'td' */
function plEst(x,g,l,kind,k){
  const d=espnPrice(x,g,l.stat,kind,k,'over'); if(d) return d;
  if(kind==='td') return {price:bookPrice(+k>=2?tdPlus(l.p,+k):l.p),src:'est'};
  return {price:rungView(x.pl,l.stat,l.mu,k,g.w).est,src:'est'};
}
/* when an ESPN read was, as the page says it: "Thu 11:08 PM ET" */
function espnWhen(at){ const t=Date.parse(at); if(!isFinite(t)) return 'at a time not recorded';
  return new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit'})+' ET'; }
const ESPN_ERR='typically within 0.5 points on yards, 2-3 on receptions, passing TDs, touchdowns and rungs';
/* the title an est. price carries: what it is priced from */
function estTitle(o){
  if(!o) return '';
  if(o.src==='dkline'){
    if(!o.listed) return `Not on DraftKings: it lists no such rung. Priced from DraftKings’ line from ESPN, read ${espnWhen(o.at)}; the price is our estimate`;
    return `DraftKings’ line from ESPN, read ${espnWhen(o.at)}; the price is our estimate (${o.tested?ESPN_ERR:'untested on this market: no DraftKings price on file to check it against'})`; }
  return 'no DraftKings line yet: the model’s estimate';
}
/* an est. price's cell or mark says its basis once the job reads ESPN at all (a payload baked before
   carries no espn, and the page is as it was) */
const estAttr=o=>o&&(o.src==='dkline'||(PAY&&PAY.espn))?` title="${esc(estTitle(o))}" data-est="${o.src}"`:'';
/* one line wherever est. prices from ESPN are shown: when DraftKings' lines were read (a game's own
   read, else the run's last good one), whether that is a day old, and whether the latest read failed */
function espnReadLine(at){
  const M=PAY&&PAY.espn_meta, a=at||(M&&M.at), t=Date.parse(a);
  if(!isFinite(t)) return '';
  const h=(Date.now()-t)/3600e3;
  return `DraftKings’ lines as read ${espnWhen(a)}; prices estimated`+(h>DK_EST.staleHours?` (last read ${Math.round(h)}h ago)`:'')+(M&&M.ok===false?': the latest read did not work, so these are from the last one that did':'')+'.';
}
/* the payload's own evidence that the paid pull read DraftKings' player prices for a game: a main line
   in PAY.mkt with its game, a price row, or its DraftKings ids read (PAY.dk's at, or a player's id;
   ESPN's read adds only the game's own ids) */
function plPricedGame(gid,week){
  try{
    const w=String(week), M=PAY&&PAY.mkt&&PAY.mkt[w], R=PAY&&PAY.prices&&PAY.prices[w], D=PAY&&PAY.dk&&PAY.dk[w]&&PAY.dk[w][gid];
    if(M&&typeof M==='object'&&Object.values(M).some(s=>s&&typeof s==='object'&&Object.values(s).some(x=>x&&x.g===gid))) return true;
    if(Array.isArray(R)&&R.some(r=>r&&r.game_id===gid)) return true;
    return !!D&&typeof D==='object'&&(!!D.at||Object.keys(D).some(k=>!/^(team:|game\|)/.test(k)&&!['event','at','glat'].includes(k)));
  }catch(e){ return false; }
}
window.plPricedGame=plPricedGame;

/* ---------- the lines the suggestions are built from ---------- */
""")

# --- the game page: the read line ---
sub1('p3', """  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;
""", """  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;
  { const eg=!locked&&espnGame(g.id,g.w);
    if(eg) html+=`<p class="muted espn-read" style="margin:-6px 0 12px;font-size:12px" data-espn-read>${esc(espnReadLine(eg.at))} A price marked est. beside DraftKings’ line is our estimate of DraftKings’ own; a real DraftKings price replaces it once the price pull reads one.</p>`; }
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

# --- the game page: a main line from ESPN, over and under at est. ---
sub1('p3', """        const L=marketLine(g.w,x.pl.id,l.stat);
        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${L?`<em class="mline">book line ${L.line}</em>`:''}</h4><table class="rungs">`;""",
     """        const L=marketLine(g.w,x.pl.id,l.stat);
        /* no real main line: DraftKings' line from ESPN, both sides at the formula's price */
        const dO=L?null:espnPrice(x,g,l.stat,'main',null,'over'), dU=dO?espnPrice(x,g,l.stat,'main',null,'under'):null;
        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${L?`<em class="mline">book line ${L.line}</em>`:(dO&&dU?`<em class="mline"${estAttr(dO)}>DraftKings line ${dO.line}</em>`:'')}</h4><table class="rungs">`;""")
sub1('p3', """            <td class="num book real">${fmtML(L.under)}<em>${gapU>=3?'\\u2191':(gapU<=-3?'\\u2193':'')}</em></td></tr>`;
        }""", """            <td class="num book real">${fmtML(L.under)}<em>${gapU>=3?'\\u2191':(gapU<=-3?'\\u2193':'')}</em></td></tr>`;
        } else if(dO&&dU){
          const E=dO.line, pO=pOver(x.pl.grp,l.stat,l.mu,E);
          const onO=cur&&cur.main&&cur.side==='over', onU=cur&&cur.main&&cur.side==='under';
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
  /* each leg's price by the page's order: DraftKings' own, else its line from ESPN priced by the
     formula (dkline), else the model's estimate; a dkline leg carries its fair chance and read time */
  const x={pl,team,opp,ctx};
  let p,label,price=null,src='est',dk=null;
  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=tdLabel(pl.grp,kk); price=bookPrice(p); k=kk;
    if(kk===1){ const d=espnPrice(x,game,'any_td','td',1); if(d){ price=d.price; src='dkline'; dk=d; } } }
  else if(main){
    const L=marketLine(game.w,pid,stat);
    if(L){ const pO=pOver(pl.grp,stat,pr.mu,L.line);
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;
      price=side==='under'?L.under:L.over; src='real'; }
    else { const d=espnPrice(x,game,stat,'main',null,side==='under'?'under':'over'); if(!d) return;
      const pO=pOver(pl.grp,stat,pr.mu,d.line); k=d.line;
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
   every player leg of a tested kind priced from DraftKings' line read on ESPN where the pull has no
   price for it (src 'dkline': a main line on passing, rushing or receiving yards, receptions or passing
   touchdowns, the anytime touchdown, a yards rung DraftKings lists). A game total is not among them:""")
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
        const L=marketLine(g.w,x.pl.id,l.stat);
        if(L){ const pO=pOver(x.pl.grp,l.stat,l.mu,L.line), lbl=l.m.lbl.toLowerCase();
          if(L.over!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'over',main:true,p:pO,price:L.over,mu:l.mu,label:`Over ${L.line} ${lbl}`});
          if(L.under!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'under',main:true,p:1-pO,price:L.under,mu:l.mu,label:`Under ${L.line} ${lbl}`}); }
        else if(ESPN_TESTED.main.has(l.stat)){ const dO=espnPrice(x,g,l.stat,'main',null,'over'), dU=dO&&espnPrice(x,g,l.stat,'main',null,'under');
          if(dO&&dU){ const pO=pOver(x.pl.grp,l.stat,l.mu,dO.line), lbl=l.m.lbl.toLowerCase();
            out.push({...base,src:'dkline',espn:espnOf(dO),key:legKey(g.id,x.pl.id,l.stat),k:dO.line,side:'over',main:true,p:pO,price:dO.price,mu:l.mu,label:`Over ${dO.line} ${lbl}`});
            out.push({...base,src:'dkline',espn:espnOf(dU),key:legKey(g.id,x.pl.id,l.stat),k:dU.line,side:'under',main:true,p:1-pO,price:dU.price,mu:l.mu,label:`Under ${dU.line} ${lbl}`}); } }
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
  /* priced from DraftKings' line read on ESPN (app v107): the formula's own fair chance, est. (a main
     line's side its fair chance, a rung's before the hold; the anytime touchdown's its price over the
     week's typical player overround, or 1.0566 with none) */
  if(pr&&pr.src==='dkline'&&fairPx(pr.ml)){
    if(l.stat==='any_td'){ const m=memo||{}, wk=String(l.week), V=m[wk]||(m[wk]=fairVig(l.week)), ov=V.player||DK_EST.tdVig;
      return {p:Math.max(0.001,Math.min(0.999,mlProb(pr.ml)/ov)),est:true}; }
    const f=l.espn&&l.espn.fair; return f>0&&f<1?{p:f,est:true}:null; }
  if(!pr||pr.src!=='real'||!fairPx(pr.ml)) return null;""")

# --- the panel's pool: a tested dkline leg counts as a book price ---
sub1('p3', """    if(!pbAllows(c)||c.src!=='real'||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;""",
     """    if(!pbAllows(c)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;""")

# --- why a level is empty, and the notes, with ESPN's read in mind ---
sub1('p3', """const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
function pbWhy(n,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`:`No ${n}-leg parlay on your picks`;
  if(c&&c.players&&!pool.plGames) return c.teams?`${what}, and ${PB_NO_PL}`:PB_NO_PL[0].toUpperCase()+PB_NO_PL.slice(1);""",
     """const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
/* once the job reads DraftKings' lines from ESPN (app v107), a game with none has no player leg because
   DraftKings had posted none at the last read: lines read on ESPN are priced here by estimate, so the
   reason is the lines, not the price pull */
function pbNoPl(){ const M=PAY&&PAY.espn_meta; if(!M||!M.at) return PB_NO_PL;
  return `no player lines yet: DraftKings had posted none for these games when its lines were last read from ESPN (${espnWhen(M.at)}), and they are read again on every run of the job; DraftKings’ own prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`; }
function pbWhy(n,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`:`No ${n}-leg parlay on your picks`;
  if(c&&c.players&&!pool.plGames){ const np=pbNoPl(); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""")

# --- a level's card: est. on a dkline leg's price, the level's price est., and one line on why ---
sub1('p3', """/* a turned level (v, the visitor's view of it) is chosen from the legs the card has not shown""",
     """/* what a leg priced from DraftKings' line read on ESPN is, on a level's card or an Elo pick's */
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

# --- the panel's notes and its foot ---
sub1('p3', """  const notes=[];
  if(formSig()==='noform') notes.push('The Elo ratings are still loading: player legs join once they are in.');""",
     """  /* the levels as their cards show them (a level the visitor turned, else the panel's own) */
  const shown=r.tiers.map(t=>t.why?t:pbShownTier(t.id)), dkOn=shown.some(t=>t&&t.legs&&t.legs.some(l=>l.src==='dkline')), espnW=espnOn(w);
  const notes=[];
  if(formSig()==='noform') notes.push('The Elo ratings are still loading: player legs join once they are in.');
  if(dkOn) notes.push(`A player leg marked est. is priced from DraftKings’ line read on ESPN, where DraftKings’ own price is not on file: ${esc(espnReadLine())} The line is DraftKings’, the price our estimate of DraftKings’ (${ESPN_ERR} on weeks it was not fitted on), and it counts here as a book price does.`);""")
sub1('p3', """  if(r.noPlayerPrices&&r.tiers.some(t=>t.legs)) notes.push('Player prices are not in yet for your picks, so the tiers below are built without player legs: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).');""",
     """  if(r.noPlayerPrices&&r.tiers.some(t=>t.legs)) notes.push(PAY&&PAY.espn_meta&&PAY.espn_meta.at?`No player lines are in yet for your picks, so the tiers below are built without player legs: ${pbNoPl().replace(/^no player lines yet: /,'')}`:'Player prices are not in yet for your picks, so the tiers below are built without player legs: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).');""")
sub1('p3', """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.far&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(`No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`);""",
     """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.far&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(espnW?`No line on your picks has a price the model rates at or above the book yet, DraftKings’ lines read on ESPN included. DraftKings’ own prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`
    :`No line on your picks has a real sportsbook price the model rates at or above the book yet. Player prices are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).`);""")
sub1('p3', """    <div class="pb-tiers">${r.tiers.map(t=>pbTierCard(t.why?t:pbShownTier(t.id),{ctl:!t.why})).join('')}</div>
    <p class="muted pb-foot">Every leg has a real sportsbook price and a model chance between 45% and 97%,""",
     """    <div class="pb-tiers">${r.tiers.map((t,i)=>pbTierCard(shown[i],{ctl:!t.why})).join('')}</div>
    <p class="muted pb-foot">Every leg has a real sportsbook price${espnW?' (or, marked est., DraftKings’ line read on ESPN at our estimate of its price, on main lines, touchdowns and yards ladders, the markets the estimate has been checked on)':''} and a model chance between 45% and 97%,""")

# --- the suggestions record says a leg priced from ESPN's read carries an estimated price ---
sub1('p3', """as the job last saw it before a wave of kickoffs, frozen at kickoff and graded as a book settles it (a push drops out, and so does a player who did not play; one who played with no stat line is graded on zero).""",
     """as the job last saw it before a wave of kickoffs, frozen at kickoff and graded as a book settles it (a push drops out, and so does a player who did not play; one who played with no stat line is graded on zero). From 15 October 2026 a leg priced from DraftKings’ line read on ESPN carries an estimated price, and is graded on the price shown.""")

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
     """      /* a leg with no real price: DraftKings' line from ESPN where there is one (a tested kind DraftKings
         lists counts as a book price; any other is shown on the page and never suggested), else the
         model's estimate as before */
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

# --- the builder: est. on a dkline leg, and the read line ---
sub1('p3', """      <td class="num">${fmtML(prices[i].ml)} <span class="muted" style="font-size:11px">${prices[i].src==='real'?'real':(prices[i].src==='est'?'est.':'fair')}</span></td>""",
     """      <td class="num">${fmtML(prices[i].ml)} <span class="muted" style="font-size:11px"${prices[i].src==='dkline'?estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true}):''}>${prices[i].src==='real'?'real':(prices[i].src==='est'||prices[i].src==='dkline'?'est.':'fair')}</span></td>""")
sub1('p3', """  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">These legs are in different weeks""",
     """  if(prices.some(p=>p.src==='dkline')) html+=`<p class="muted espn-read" style="margin:10px 0 0;font-size:12px" data-espn-read>${esc(espnReadLine())} A leg marked est. is priced from DraftKings’ line read on ESPN: the line is DraftKings’, the price and its fair chance our estimate.</p>`;
  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">These legs are in different weeks""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print("patched: app v107, DraftKings' lines read on ESPN priced by the formula, est., a tested kind counted like a book price")
