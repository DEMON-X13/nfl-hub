"""app v98: every suggested parlay leads with the book's fair chance, and a leg the model rates far
above it leaves the suggestions.

The review of Sunday 11 October's parlays found the model over-confident against DraftKings every week
since week 2. On that Sunday's 389 main lines its Brier score was 0.258 against the book's 0.243; where
it rated a side 10 to 20 points above the book's fair chance (DraftKings' prices with the margin taken
out) that side landed 50% of the time where the model said 64%, and at 20 points and more 55% where it
said 77%, mostly unders. The Parlay Builder's suggested parlays are built from the model's biggest
edges, so they collected its mistakes: the 1pm Safe pair said 53% where its fair chance was about 24%.
The owner approved two changes ("okay go for it"), both labelling and selection, neither a refit: the
repo forbids tuning the model on the season in play.

1. Honest chances. A leg's fair chance (legFair) is DraftKings' own: where both sides of the same line
   have a real price (a player's main line over and under in PAY.mkt; a game's two moneylines, or its
   two spread prices on the leg's own number; the total's over and under on the posted total) it is
   that side's no-vig chance, its implied chance over the two summed, as devigOver works it. Where only
   one side is priced (a ladder rung, an anytime touchdown, a team line or total missing its other
   price, a main line the payload has moved since the leg was added) it is the price's implied chance
   over the week's typical overround on two-sided lines of its kind (fairVig: the median, over that
   week's two-sided lines, of the two implied chances summed; player main lines for a player's leg,
   the moneylines, spreads or totals for a game's), worked from the payload, never a fixed number, and
   marked est. wherever it is shown. A leg with no real price (the builder's est. and fair prices) has
   none. A parlay's fair chance (parlayFair) is the builder's own parlayProb on its legs with each leg's
   chance replaced by its fair chance, so legs in one game move together exactly as the model's
   chances do; where a leg has none the parlay shows the model's chance alone and says why.
   The panel's four levels and the Elo picks (pbTierCard) now lead with it, labelled fair chance, with
   "model says 53%" (the Elo picks: "Elo says") beside it; the levels are still chosen on the model's
   chances, the floors included, and a level over its floor is ruled "best return that lands 25%+ by
   the model" so the card says which number is which. The builder's summary leads with it, the model's
   chance beside it, and each leg row gives its own; a game page's High, Medium and Low hands lead with
   it where every leg has a book price. The parlay card (nflbets/build/card.html) does the same.

2. Legs far off the market leave the suggestions. A leg whose model chance on its side is FAR_OFF (15
   points) or more above its fair chance (legFarOff; only where a fair chance exists) is left out of
   the panel's preferred and thin lists (pbPool, which counts them, and the panel says how many and
   why) and of the game pages' hands (gameLegPool). It is kept, flagged "model 77% · market 55%: far off
   the market", on the game pages (the player lines, the touchdown, the rungs with a book price and the
   Game bets card's team lines), in the builder's rows and on an Elo pick, whose own selection (the Elo
   matchup chance) is left alone.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'function legFair(' not in T['p3'], 'patch_fair_chance.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v97 \u00b7 2026-10-12';", r"const APP_BUILD='app v98 \u00b7 2026-10-12';")

# ---- the styles: the fair chance and the far-off flag ----
sub1('p1', """.pb-nums span{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);white-space:nowrap}""",
     """.pb-nums span{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.pb-nums small{display:block;font-size:11px;font-weight:600;color:var(--ink-2);white-space:nowrap;margin-top:1px}
.faroff{color:#8A5E05}
small.faroff{display:block;font-size:11px;font-weight:600;margin-top:2px;white-space:normal}
p.faroff{margin:4px 0 0;font-size:11.5px;line-height:1.4}
.rungs tr.far td.thr{box-shadow:inset 3px 0 0 var(--gold)}
.legfair{display:block;font-size:11px;font-weight:500;color:var(--ink-2);white-space:nowrap;margin-top:2px}
.bigp small{display:block;font-size:12px;margin-top:5px;color:var(--ink-2)}
.bigp .hero small{color:#F0C565}
.fair-note{margin:8px 0 0;font-size:12px}""")
sub1('p1', """.gsugg-nums{font-size:13px;color:var(--ink-2);white-space:nowrap}""",
     """.gsugg-nums{font-size:13px;color:var(--ink-2)}""")

# ---- the fair chance, the far-off rule and the parlay's fair chance ----
sub1('p3', """function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }""",
     """function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
/* ---------- the book's fair chance, and legs far off it ----------
   The model's chances have run high against DraftKings' every week since week 2: on Sunday 11
   October's 389 main lines its Brier score was 0.258 against the book's 0.243, and where it rated a
   side 10 to 20 points above the book's fair chance that side landed 50% where it said 64% (20 points
   and more: 55% where it said 77%). So the suggested parlays and the parlay card lead with the book's
   fair chance, the model's own beside it, and a leg the model rates FAR_OFF (15 points) or more above
   it is left out of the suggestions (pbPool, gameLegPool) and flagged wherever it is shown. Labelling
   and selection only: nothing of the model is refitted on the season in play.

   A leg's fair chance (legFair) is DraftKings' own, its price with the margin taken out:
   - both sides of the same line priced (a player's main line over and under, PAY.mkt; a game's two
     moneylines, or its two spread prices on the leg's own number; the total's over and under on the
     posted total): that side's no-vig chance, its implied chance over the two summed (devigOver);
   - one side priced (a ladder rung, an anytime touchdown, a team line or a total whose other side has
     no price, a main line the payload has moved since the leg was added): its implied chance over the
     week's typical overround on two-sided lines of its kind (fairVig: the median, over that week's
     two-sided lines, of the two implied chances summed; player main lines for a player's leg, the
     moneylines, spreads or totals for a game's), worked from the payload on every call, never a fixed
     number; marked est. (est: true) wherever it is shown. With no two-sided line of its kind that
     week, every two-sided line of the week; with none at all, no fair chance;
   - no real price (the builder's est. and fair prices): no fair chance.
   A parlay's (parlayFair) is the builder's own parlayProb on its legs with each leg's chance replaced
   by its fair chance, so legs in one game move together exactly as the model's chances do; p is null
   where a leg has none, and the parlay then shows the model's chance alone, saying why. */
const FAR_OFF=0.15;
const fairPx=v=>v!=null&&isFinite(v)&&v!==0;
function fairMedian(a){ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; }
/* the week's typical overround on its two-sided lines, by kind, and over all of them */
function fairVig(week){
  const w=String(week), by={player:[],ml:[],ats:[],total:[]}, two=(a,b)=>mlProb(a)+mlProb(b);
  const M=PAY&&PAY.mkt&&PAY.mkt[w];
  if(M) for(const pid in M){ const P=M[pid]; if(P&&typeof P==='object') for(const st in P){ const L=P[st];
    if(L&&typeof L==='object'&&fairPx(L.over)&&fairPx(L.under)) by.player.push(two(L.over,L.under)); } }
  for(const g of (S&&S.sched)||[]){ if(String(g.w)!==w) continue;
    if(fairPx(g.mla)&&fairPx(g.mlh)) by.ml.push(two(g.mla,g.mlh));
    if(g.sp!=null&&isFinite(g.sp)&&fairPx(g.spa)&&fairPx(g.sph)) by.ats.push(two(g.spa,g.sph));
    if(g.tot!=null&&isFinite(g.tot)&&fairPx(g.tov)&&fairPx(g.tou)) by.total.push(two(g.tov,g.tou)); }
  const out={week:w,all:fairMedian([...by.player,...by.ml,...by.ats,...by.total])};
  for(const k in by) out[k]=fairMedian(by[k]);
  return out;
}
/* one leg's fair chance on its own side: {p, est}, or null with no real price. memo: an object kept
   for one pass, so each week's overround is worked once */
function legFair(l,memo){
  if(!l) return null;
  const pr=legPrice(l); if(!pr||pr.src!=='real'||!fairPx(pr.ml)) return null;
  const under=l.side==='under', g=((S&&S.sched)||[]).find(x=>x.id===l.gid)||null;
  const nv=(own,other)=>mlProb(own)/(mlProb(own)+mlProb(other));
  if(l.stat==='total'){
    if(g&&g.tot!=null&&+l.k===+g.tot&&fairPx(g.tov)&&fairPx(g.tou)) return {p:under?nv(g.tou,g.tov):nv(g.tov,g.tou),est:false};
  } else if(l.stat==='ml'||l.stat==='ats'){
    const team=l.team||String(l.pid||'').replace(/^team:/,'');
    if(g&&(team===g.h||team===g.a)){ const home=team===g.h;
      const own=l.stat==='ml'?(home?g.mlh:g.mla):(home?g.sph:g.spa), other=l.stat==='ml'?(home?g.mla:g.mlh):(home?g.spa:g.sph);
      const on=l.stat==='ml'||(g.sp!=null&&isFinite(g.sp)&&+l.k===(home?-g.sp:+g.sp));
      if(on&&fairPx(own)&&fairPx(other)) return {p:nv(own,other),est:false}; }
  } else if(l.main){
    const L=marketLine(l.week,l.pid,l.stat);
    if(L&&+L.line===+l.k&&fairPx(L.over)&&fairPx(L.under)) return {p:under?nv(L.under,L.over):nv(L.over,L.under),est:false};
  }
  const m=memo||{}, wk=String(l.week), V=m[wk]||(m[wk]=fairVig(l.week)), ov=V[isGameLeg(l)?l.stat:'player']||V.all;
  if(!(ov>0)) return null;
  return {p:Math.max(0.001,Math.min(0.999,mlProb(pr.ml)/ov)),est:true};
}
/* the leg's fair chance where the model rates its side FAR_OFF or more above it, else null */
function legFarOff(l,memo){ const f=legFair(l,memo); return f&&l.p!=null&&isFinite(l.p)&&l.p-f.p>=FAR_OFF-1e-9?f:null; }
function farText(p,f){ return `model ${Math.round(p*100)}% \\u00b7 market ${Math.round(f.p*100)}%${f.est?' est.':''}: far off the market`; }
/* a parlay's fair chance: {p, est, miss}; p null where a leg has no fair chance (miss of them) */
function parlayFair(legs,memo,sims){
  if(!Array.isArray(legs)||!legs.length) return null;
  const m=memo||{}, f=legs.map(l=>legFair(l,m)), miss=f.filter(x=>!x).length;
  if(miss) return {p:null,est:false,miss};
  const pr=parlayProb(legs.map((l,i)=>({...l,side:l.side||'over',p:f[i].p})),sims);
  return {p:pr.corr,est:f.some(x=>x.est),miss:0};
}""")

# ---- the panel's pool: a leg far off the market is left out, and counted ----
sub1('p3', """  const pref=[], thin=[], plGames=new Set();
  for(const c of pricedLegs(games)){
    if(!isGameLeg(c)) plGames.add(c.gid);
    if(!pbAllows(c)||c.src!=='real'||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;
    /* until the Elo files are in, no player leg qualifies at all, as before */
    if(c.grp!=='TEAM'&&formOut) continue;
    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});
  }""", """  const pref=[], thin=[], plGames=new Set(), fm={}; let far=0;
  for(const c of pricedLegs(games)){
    if(!isGameLeg(c)) plGames.add(c.gid);
    if(!pbAllows(c)||c.src!=='real'||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;
    /* until the Elo files are in, no player leg qualifies at all, as before */
    if(c.grp!=='TEAM'&&formOut) continue;
    /* the model FAR_OFF or more above the book's fair chance: left out, and counted for the panel */
    if(legFarOff(c,fm)){ far++; continue; }
    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});
  }""")
sub1('p3', """  return {pref:pbCap(pref),thin:pbCap(thin),mkt:pbCap(mkt),plGames:plGames.size};""",
     """  return {pref:pbCap(pref),thin:pbCap(thin),mkt:pbCap(mkt),plGames:plGames.size,far};""")

# ---- every level carries its fair chance ----
sub1('p3', """function pbTier(t,pool,memo,base){
  /* base: the visitor's locked legs""", """function pbTierOf(t,pool,memo,base){
  /* base: the visitor's locked legs""")
sub1('p3', """  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2]-B.length,pool),B);
}""", """  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2]-B.length,pool),B);
}
/* a level with its fair chance (parlayFair on its legs, in the builder's order), worked once it is chosen */
const pbWithFair=r=>r&&r.legs?{...r,fair:parlayFair(r.legs)}:r;
function pbTier(t,pool,memo,base){ return pbWithFair(pbTierOf(t,pool,memo,base)); }""")
sub1('p3', """  if(v.lock.length>=spec[2]){ v.tier={...head,...pbExact(v.lock.slice(0,spec[2])),allLocked:true,ctx:ctx()}; return; }""",
     """  if(v.lock.length>=spec[2]){ v.tier={...head,...pbWithFair(pbExact(v.lock.slice(0,spec[2]))),allLocked:true,ctx:ctx()}; return; }""")
sub1('p3', """  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,mkt:0,tiers:[],noPlayerPrices:false};""",
     """  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,mkt:0,far:0,tiers:[],noPlayerPrices:false};""")
sub1('p3', """  out.pref=pool.pref.length; out.thin=pool.thin.length; out.mkt=pool.mkt.length; out.noPlayerPrices=c.players&&!pool.plGames;""",
     """  out.pref=pool.pref.length; out.thin=pool.thin.length; out.mkt=pool.mkt.length; out.far=pool.far; out.noPlayerPrices=c.players&&!pool.plGames;""")
# the rule says whose chance the floor is on
sub1('p3', """  if(!t.turned||!v) return t.likeliest?`the likeliest ${n} legs`:t.floor?`best return that lands ${pct}%+`:'the likeliest pair';""",
     """  if(!t.turned||!v) return t.likeliest?`the likeliest ${n} legs`:t.floor?`best return that lands ${pct}%+ by the model`:'the likeliest pair';""")
sub1('p3', """  return t.likeliest||!t.floor?`the likeliest ${n===2?'pair':n+' legs'}${mod}`:`best return${mod} that lands ${pct}%+`;""",
     """  return t.likeliest||!t.floor?`the likeliest ${n===2?'pair':n+' legs'}${mod}`:`best return${mod} that lands ${pct}%+ by the model`;""")

# ---- a game page's hands: no leg far off the market, and the fair chance where every leg has one ----
sub1('p3', """  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.price>=GAME_LEG_MIN&&c.p>=0.40&&c.p<0.97&&sideAllows(c));""",
     """  const fm={};
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.price>=GAME_LEG_MIN&&c.p>=0.40&&c.p<0.97&&sideAllows(c)&&!legFarOff(c,fm));""")
sub1('p3', """  const done=legs=>{ const pr=parlayProb(legs,20000);
    return {legs,corr:pr.corr,dec:parlayDec(legs.map(l=>({leg:l,ml:l.price})))}; };""",
     """  const done=legs=>{ const pr=parlayProb(legs,20000);
    return {legs,corr:pr.corr,dec:parlayDec(legs.map(l=>({leg:l,ml:l.price}))),fair:parlayFair(legs,{},20000)}; };""")
sub1('p3', """      <div class="gsugg-nums"><b>${(t.corr*100).toFixed(0)}%</b> to land <span class="muted">·</span> <b>${fmtML(decToML(t.dec))}</b>${stake?` <span class="muted">pays $${(stake*t.dec).toFixed(2)}</span>`:''}</div>""",
     """      <div class="gsugg-nums">${t.fair&&t.fair.p!=null?`<b data-gsugg-fair="${t.fair.p}">${(t.fair.p*100).toFixed(0)}%</b> fair chance${t.fair.est?' (est.)':''} <span class="muted">·</span> model says <b>${(t.corr*100).toFixed(0)}%</b> to land`
        :`<b>${(t.corr*100).toFixed(0)}%</b> to land <span class="muted">(the model’s chance: no fair chance without every leg’s book price)</span>`} <span class="muted">·</span> <b>${fmtML(decToML(t.dec))}</b>${stake?` <span class="muted">pays $${(stake*t.dec).toFixed(2)}</span>`:''}</div>""")
sub1('p3', """Chances allow for how the legs move together, and the price is what a book pays for them together.</p>""",
     """Chances allow for how the legs move together, and the price is what a book pays for them together. Each hand leads with the book's fair chance (its prices with the margin taken out) where every leg has a book price, the model's own beside it, and leaves out a line the model rates ${Math.round(FAR_OFF*100)} points or more above the book's fair chance.</p>""")

# ---- the tier card: the fair chance first, the model's (or the Elo's) beside it; a far-off leg flagged ----
sub1('p3', """    <div class="pb-nums"><div><b>${(chance*100).toFixed(0)}%</b><span>${o.chanceBy||'chance'}</span></div><div><b>${fmtML(decToML(t.dec))}</b><span>price</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>
    <ul class="pb-legs">${t.legs.map(l=>`<li>${lock(l)}<span class="nm">${o.badge?o.badge(l):''}${esc(l.name)}<small>${esc(l.label)}${l.market?' <i class="pb-thinmark">no edge</i>':(l.thin?' <i class="pb-thinmark">thin edge</i>':'')}</small></span><span class="pr">${fmtML(l.price)}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span></li>`).join('')}</ul>""",
     """    <div class="pb-nums">${pbChanceHtml(t.fair,chance,o)}<div><b>${fmtML(decToML(t.dec))}</b><span>price</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>
    <ul class="pb-legs">${t.legs.map(l=>{ const ff=legFarOff(l,fm); return `<li>${lock(l)}<span class="nm">${o.badge?o.badge(l):''}${esc(l.name)}<small>${esc(l.label)}${l.market?' <i class="pb-thinmark">no edge</i>':(l.thin?' <i class="pb-thinmark">thin edge</i>':'')}</small>${ff?`<small class="faroff" data-pb-far>${farText(l.p,ff)}</small>`:''}</span><span class="pr">${fmtML(l.price)}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span></li>`; }).join('')}</ul>""")
sub1('p3', """  const form=formSig()!=='', wrapped=o.ctl&&t.turned&&PB_VIEW.t[t.id]&&PB_VIEW.t[t.id].wrapped;""",
     """  const form=formSig()!=='', wrapped=o.ctl&&t.turned&&PB_VIEW.t[t.id]&&PB_VIEW.t[t.id].wrapped, fm={};""")
sub1('p3', """/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard) */""",
     """/* a level's chance as its card shows it: the book's fair chance, labelled so (est. where a leg is
   priced on one side only), with whose chance it was chosen on beside it ("model says 53%"; the Elo
   picks' "Elo says"); with no fair chance, that chance alone, saying why */
function pbChanceHtml(F,chance,o){
  const pc=v=>(v*100).toFixed(0)+'%', by=(o&&o.by)||'model';
  if(F&&F.p!=null) return `<div class="pb-chance"><b data-pb-fair="${F.p}">${pc(F.p)}</b><span${F.est?' title="Estimated: a leg is priced on one side only, so the week’s typical margin is taken out of its price"':''}>fair chance${F.est?', est.':''}</span><small class="pb-model" data-pb-model="${chance}">${esc(by)} says ${pc(chance)}</small></div>`;
  return `<div class="pb-chance"><b data-pb-model="${chance}">${pc(chance)}</b><span>${(o&&o.chanceBy)||'model’s chance'}</span><small class="pb-model">no fair chance: a leg has no book price</small></div>`;
}
/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard) */""")

# ---- the panel: how many legs were left out and why; the footer says which number is which ----
sub1('p3', """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(""",
     """  if(r.far) notes.push(`${r.far} leg${r.far===1?' is':'s are'} left out: the model rates ${r.far===1?'it':'each'} ${Math.round(FAR_OFF*100)} points or more above the book’s fair chance (DraftKings’ prices with the margin taken out), and its edges that large have not held up this season. ${r.far===1?'It is':'They are'} still on the game pages, flagged far off the market.`);
  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.far&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(""")
sub1('p3', """ A game total has no edge, being the book’s own chance, and fills a level only where those legs cannot. These are the model's numbers, and its edges over book prices have not held up yet this season.</p>""",
     """ A game total has no edge, being the book’s own chance, and fills a level only where those legs cannot. Each level leads with the book’s fair chance, DraftKings’ prices with the margin taken out (est. where a leg is priced on one side only), with the model’s own beside it: the levels are chosen on the model’s chances, the floors included, and those have run higher than the book’s this season, so a leg the model rates ${Math.round(FAR_OFF*100)} points or more above the book’s fair chance is left out.</p>""")
sub1('p3', """Safe is the likeliest pair; Medium, Aggressive and Extreme are the 3-, 4- and 5-leg parlays with the best expected return that land at least""",
     """Safe is the likeliest pair; Medium, Aggressive and Extreme are the 3-, 4- and 5-leg parlays with the best expected return that the model says land at least""")

# ---- the builder: the fair chance first in its summary, and on each leg; a far-off leg flagged ----
sub1('p3', """  const pr=parlayProb(legs.map(l=>({...l,side:l.side||'over'})));
  const prices=legs.map(legPrice);""", """  const pr=parlayProb(legs.map(l=>({...l,side:l.side||'over'})));
  const fair=parlayFair(legs);
  const prices=legs.map(legPrice);""")
sub1('p3', """  legs.forEach((l,i)=>{
    const [c,lbl]=confTier(l.p);
    html+=`<tr class="legrow"><td class="plr">${esc(l.name)}${l.grp==='TEAM'?'':injChip(l.pid)}<small>${esc(l.pos)} \\u00b7 ${esc(l.team)} v ${esc(l.opp)} \\u00b7 wk ${esc(l.week)}</small></td>
      <td><b>${esc(l.label)}</b></td>
      <td class="num">${l.mu==null?'\\u2013':num(l.mu,l.mu<10?1:0)}</td>
      <td class="num">${(l.p*100).toFixed(0)}% <span class="conf ${c}" style="margin-left:6px">${lbl}</span></td>""",
     """  const fm={};
  legs.forEach((l,i)=>{
    const [c,lbl]=confTier(l.p), f=legFair(l,fm), far=!!f&&l.p-f.p>=FAR_OFF-1e-9;
    html+=`<tr class="legrow"><td class="plr">${esc(l.name)}${l.grp==='TEAM'?'':injChip(l.pid)}<small>${esc(l.pos)} \\u00b7 ${esc(l.team)} v ${esc(l.opp)} \\u00b7 wk ${esc(l.week)}</small></td>
      <td><b>${esc(l.label)}</b>${far?`<small class="faroff" data-far>${farText(l.p,f)}</small>`:''}</td>
      <td class="num">${l.mu==null?'\\u2013':num(l.mu,l.mu<10?1:0)}</td>
      <td class="num">${(l.p*100).toFixed(0)}% <span class="conf ${c}" style="margin-left:6px">${lbl}</span>${f?`<small class="legfair" data-legfair="${f.p}" title="The book's fair chance on this leg: its price with the margin taken out${f.est?', estimated with the week\\u2019s typical margin since only this side is priced':''}">fair ${(f.p*100).toFixed(0)}%${f.est?' est.':''}</small>`:''}</td>""")
sub1('p3', """      <div class="box hero"><b>${(pr.corr*100).toFixed(1)}%</b><span>chance all ${legs.length} land</span></div>
      <div class="box"><b>${fmtML(fairML)}</b><span>fair price for that chance</span></div>""",
     """      ${fair&&fair.p!=null?`<div class="box hero"><b data-fair="${fair.p}">${(fair.p*100).toFixed(1)}%</b><span>fair chance all ${legs.length} land${fair.est?', est.':''}</span><small data-model="${pr.corr}">model says ${(pr.corr*100).toFixed(1)}%</small></div>`
        :`<div class="box hero"><b data-model="${pr.corr}">${(pr.corr*100).toFixed(1)}%</b><span>model's chance all ${legs.length} land</span><small>no fair chance: it needs every leg's book price</small></div>`}
      <div class="box"><b>${fmtML(fairML)}</b><span>fair price for the model's chance</span></div>""")
sub1('p3', """    ${sg&&override==null?`<p class="muted" style="margin:10px 0 0;font-size:12px">Legs here share a game""",
     """    <p class="muted fair-note">${fair&&fair.p!=null?`The fair chance is the book's: DraftKings' prices with the margin taken out${fair.est?' (estimated, since a leg is priced on one side only: the week\\u2019s typical margin is taken out of its price)':''}, the legs moving together as the model's do. The model's own chance has run higher than the book's this season.`
      :`The fair chance needs a book price on every leg; ${fair&&fair.miss===1?'one leg has':(fair?fair.miss:0)+' legs have'} none, so this is the model's chance alone.`}</p>
    ${sg&&override==null?`<p class="muted" style="margin:10px 0 0;font-size:12px">Legs here share a game""")

# ---- the game pages: a line far off the market is flagged where it is shown ----
sub1('p3', """    const row=(b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);
      return `<tr class="${on?'on':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">""",
     """    const far=[];
    const row=(b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);
      const ff=!locked&&book!=null&&isFinite(book)?legFarOff({gid:g.id,pid:'team:'+team,team,stat:key.split('|')[2],k:b.line==null?0:b.line,side:'over',main:false,p:b.p,price:book,src:'real',week:g.w}):null;
      if(ff) far.push(`<p class="faroff" data-far><b>${label}</b> ${farText(b.p,ff)}</p>`);
      return `<tr class="${on?'on':''}${ff?' far':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">""")
sub1('p3', """    return h+'</table></div>';""", """    return h+'</table>'+far.join('')+'</div>';""")
sub1('p3', """          const p2=tdPlus(l.p,2), [c2,lbl2]=confTier(p2);
          html+=`<div class="statblk"><h4>Touchdown</h4>
            <table class="rungs"><tr class="${ton?'on':''}">""",
     """          const p2=tdPlus(l.p,2), [c2,lbl2]=confTier(p2);
          const tf=tod!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:tod,src:'real',week:g.w}):null;
          html+=`<div class="statblk"><h4>Touchdown</h4>
            <table class="rungs"><tr class="${ton?'on':''}${tf?' far':''}">""")
sub1('p3', """            <td class="num book real"></td></tr></table></div>`;""",
     """            <td class="num book real"></td></tr></table>${tf?`<p class="faroff" data-far><b>Scores one</b> ${farText(l.p,tf)}</p>`:''}</div>`;""")
sub1('p3', """        const lk=legKey(g.id,x.pl.id,l.stat), cur=S.parlay[lk];""",
     """        const lk=legKey(g.id,x.pl.id,l.stat), cur=S.parlay[lk], far=[];""")
sub1('p3', """          const gapO=(pO-mlProb(L.over))*100, gapU=((1-pO)-mlProb(L.under))*100;
          html+=`<tr class="mainline ${onO?'on':''}">""",
     """          const gapO=(pO-mlProb(L.over))*100, gapU=((1-pO)-mlProb(L.under))*100;
          const mf=side=>legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:L.line,side,main:true,p:side==='under'?1-pO:pO,price:side==='under'?L.under:L.over,src:'real',week:g.w});
          const fO=mf('over'), fU=mf('under');
          if(fO) far.push(`<p class="faroff" data-far><b>Over ${L.line}</b> ${farText(pO,fO)}</p>`);
          if(fU) far.push(`<p class="faroff" data-far><b>Under ${L.line}</b> ${farText(1-pO,fU)}</p>`);
          html+=`<tr class="mainline ${onO?'on':''}${fO?' far':''}">""")
sub1('p3', """          <tr class="mainline ${onU?'on':''}">""", """          <tr class="mainline ${onU?'on':''}${fU?' far':''}">""")
sub1('p3', """          const od=oddsFor(g.id,x.pl.id,l.stat,r.k);
          const v=rungView(x.pl,l.stat,l.mu,r.k,g.w);
          html+=`<tr class="rung ${on?'on':''}">""",
     """          const od=oddsFor(g.id,x.pl.id,l.stat,r.k);
          const v=rungView(x.pl,l.stat,l.mu,r.k,g.w);
          const rf=od!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:r.k,side:'over',main:false,p:r.p,price:od,src:'real',week:g.w}):null;
          if(rf) far.push(`<p class="faroff" data-far><b>${r.k}+</b> ${farText(r.p,rf)}</p>`);
          html+=`<tr class="rung ${on?'on':''}${rf?' far':''}">""")
sub1('p3', """        html+='</table></div>';""", """        html+='</table>'+far.join('')+'</div>';""")
sub1('p3', """An arrow next to a real price means the model disagrees with it by 3 points or more: \\u2191 the model likes that side, \\u2193 it doesn\\u2019t.""",
     """An arrow next to a real price means the model disagrees with it by 3 points or more: \\u2191 the model likes that side, \\u2193 it doesn\\u2019t. A line the model rates '+Math.round(FAR_OFF*100)+' points or more above the book\\u2019s fair chance (its prices with the margin taken out) is marked far off the market and left out of the suggested parlays.""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patch_fair_chance: app v98 written to part1.html, part2.js and part3.js')
