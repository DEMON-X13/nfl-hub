"""Each game's pop-out always shows three parlays, 2, 3 and 4 legs, each the best payout for
its chance.

The owner wanted no limits on the game card, something always there: High two legs, Medium
three, Low four, built for the best payout ratio from the game's lines, threshold ladders
included, and never so safe that it pays almost nothing. The card's old Medium (a 30% floor,
the model's edge bar, Shuffle and locked legs) and the High and Low beside it are replaced.

The pool is every line in the game with a real sportsbook price (main lines both sides,
ladder rungs the book prices, touchdowns, the game's money line and spread), plus every
ladder rung and touchdown the model projects for a rostered player with the model's own
estimate of a book's price, marked est. on the card; the side switch still applies. No leg
shorter than -250 goes in: it would pay too little to earn its place. Each tier is chosen
for expected return, chance times the same-game price a book pays (the pair from the
twenty-four best single legs, then the best leg to add, one at a time), with Medium growing
High's pair and Low growing Medium, and each must pay at least a floor: +100 for High, +250
for Medium, +500 for Low, and land at least 35, 20 and 10 percent of the time, with every leg
at least a 40 percent chance: expected return alone chased long shots (the first try put
High at 18 percent and +3117). Where a thin game cannot reach a floor the best hand without it is
shown and the card says so, so the card is never empty while the game has lines. Rules as
before: one team bet, at most two legs on a player, priced as one same-game parlay. A leg
ticks onto the parlay as before; each tier has an Add all. Shuffle and its locks are gone,
since the hands are now chosen, not dealt. The audit's game-card section is rewritten to
these rules. app v74.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P2 = HERE / 'part2.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


def cut(p, start, end, new):
    """replace from start (inclusive) to end (exclusive), each found exactly once"""
    s = p.read_text(encoding='utf-8')
    assert s.count(start) == 1 and s.count(end) == 1, (p.name, start[:60], s.count(start), end[:60], s.count(end))
    i, j = s.index(start), s.index(end)
    assert i < j
    p.write_text(s[:i] + new + s[j:], encoding='utf-8', newline='\n')


NEW = r"""/* ---------- the game page's suggested parlays: High, Medium, Low ----------
   Always three hands, 2, 3 and 4 legs, each the best payout for its chance from this game's
   lines (see patch_game_tiers_value.py): real prices where the book has them, the model's
   estimate of a book's price on every other ladder rung and touchdown, no leg shorter than
   -250, each hand above its payout floor where the game allows. */
const GAME_LEG_MIN=-250;
const GAME_NOT_OFFERED=new Set(['fg_att']);   /* a stat the model rates that books do not post as a prop */
const GAME_TIERS=[['high','High',2,100,0.35],['med','Medium',3,250,0.20],['low','Low',4,500,0.10]];  /* id, label, legs, least it pays, least chance */
let GAME_TIER_CACHE={};
function gameSuggestSig(g){
  return [g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||'',suggestSide()].join('|');
}
/* every line in the game worth a place: priced by the book, or by the model's estimate */
function gameLegPool(g){
  const out=pricedLegs([g]);
  const have=new Set(out.map(l=>l.key+'@'+l.k+l.side+(l.main?'m':'')));
  const roster=rosterFor(g,false);
  for(const team in roster) for(const x of roster[team].players){
    for(const l of statLines(x)){
      if(GAME_NOT_OFFERED.has(l.stat)) continue;
      const base={gid:g.id,pid:x.pl.id,stat:l.stat,name:x.pl.n,pos:x.pl.pos,grp:x.pl.grp,team,opp:x.opp,week:g.w,src:'est'};
      if(l.prob){ const key=legKey(g.id,x.pl.id,'any_td');
        if(!have.has(key+'@1over')) out.push({...base,stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:bookPrice(l.p),mu:null,label:'Scores a touchdown'});
        continue; }
      const key=legKey(g.id,x.pl.id,l.stat);
      for(const r of l.rungs){ if(have.has(key+'@'+r.k+'over')) continue;
        out.push({...base,key,k:r.k,side:'over',main:false,p:r.p,price:rungView(x.pl,l.stat,l.mu,r.k,g.w).est,mu:l.mu,label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }
    }
  }
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.price>=GAME_LEG_MIN&&c.p>=0.40&&c.p<0.97&&sideAllows(c));
}
function gameTiers(g){
  const sig=gameSuggestSig(g), hit=GAME_TIER_CACHE[g.id];
  if(hit&&hit.sig===sig) return hit.val;
  const pool=gameLegPool(g);
  const fits=(cur,c)=>!cur.some(l=>l.key===c.key)&&!(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM'))&&cur.filter(l=>l.pid===c.pid).length<2;
  const pay=legs=>parlayDec(legs.map(l=>({leg:l,ml:l.price})),1500);
  const ev=legs=>{ const pr=parlayProb(legs,2500).corr, d=pay(legs); return {pr,d,ev:pr*d}; };
  /* the best hand of n legs grown from start, paying at least floorDec where it can */
  const grow=(start,n,floorDec,minP)=>{
    let cur=start;
    while(cur.length<n){
      let b=null;
      for(const c of pool){ if(!fits(cur,c)) continue;
        const next=[...cur,c], e=ev(next);
        if(next.length===n&&(e.d<floorDec||e.pr<minP)) continue;
        if(!b||e.ev>b.ev) b={ev:e.ev,legs:next}; }
      if(!b) return null;
      cur=b.legs;
    }
    return cur;
  };
  const one=c=>c.p*(mlToDec(c.price)||1);
  const top=[...pool].sort((a,b)=>one(b)-one(a)).slice(0,24);
  const bestPair=(floorDec,minP)=>{ let best=null;
    for(let i=0;i<top.length;i++) for(let j=i+1;j<top.length;j++){
      if(!fits([top[i]],top[j])) continue;
      const e=ev([top[i],top[j]]); if(e.d<floorDec||e.pr<minP) continue;
      if(!best||e.ev>best.ev) best={ev:e.ev,legs:[top[i],top[j]]}; }
    return best&&best.legs; };
  const done=legs=>{ const pr=parlayProb(legs,20000);
    return {legs,corr:pr.corr,dec:parlayDec(legs.map(l=>({leg:l,ml:l.price}))),mult:legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1)}; };
  const val={pool:pool.length}; let prev=null;
  for(const [id,,n,floor,minP] of GAME_TIERS){
    const f=1+floor/100;
    let legs=prev?grow(prev,n,f,minP):bestPair(f,minP), relaxed=false;
    if(!legs){ legs=prev?grow(prev,n,1,0):bestPair(1,0); relaxed=!!legs; }
    if(!legs&&prev){ legs=grow([],n,1,0); relaxed=!!legs; }
    val[id]=legs?{...done(legs),relaxed,floor}:null;
    if(legs) prev=legs;
  }
  GAME_TIER_CACHE[g.id]={sig,val};
  return val;
}
/* on the parlay means this exact line, threshold and side are ticked */
const suggestLegOn=l=>{ const c=S.parlay[l.key]; return !!c&&c.k===l.k&&c.side===l.side&&!!c.main===!!l.main; };
function gameSuggestCard(g,locked){
  if(locked) return '';
  const side=`<div class="gsugg-side"><span class="sugg-side" role="group" aria-label="Which legs to build from">${SUGGEST_SIDES.map(([k,l])=>`<button type="button" class="${suggestSide()===k?'on':''}" data-gsugg-side="${k}" aria-pressed="${suggestSide()===k}">${l}</button>`).join('')}</span></div>`;
  const T=gameTiers(g), stake=Math.max(0,+S.stake||0);
  const block=([id,label,n,floor])=>{ const t=T[id];
    if(!t) return `<div class="gsugg-tier"><div class="gsugg-tier-hd"><span class="conf ${id}">${label}</span><span class="muted">${n} legs</span></div><p class="muted" style="margin:6px 0 0;font-size:12px">This game does not have ${n} lines to build from yet.</p></div>`;
    return `<div class="gsugg-tier"><div class="gsugg-tier-hd"><span class="conf ${id}">${label}</span><span class="muted">${n} legs</span><span class="grow"></span><button class="btn quiet gsugg-all" data-gtier-add="${id}">Add all</button></div>
      <div class="gsugg-nums"><b>${(t.corr*100).toFixed(0)}%</b> to land <span class="muted">·</span> <b>${fmtML(decToML(t.dec))}</b>${stake?` <span class="muted">pays $${(stake*t.dec).toFixed(2)}</span>`:''}</div>
      ${t.relaxed?`<p class="muted" style="margin:4px 0 0;font-size:11.5px">This game's lines cannot reach +${floor} at this chance yet; this is the best they allow.</p>`:''}
      <ul class="gsugg-legs">${t.legs.map(l=>{ const on=suggestLegOn(l);
        return `<li><label class="gsugg-pick${on?' on':''}"><input type="checkbox" ${on?'checked':''} data-leg="${l.key}" data-k="${l.k}" data-side="${l.side}"${l.main?' data-main="1"':''} aria-label="${on?'Take':'Put'} ${esc(l.name)}, ${esc(l.label)}, ${on?'off':'on'} the parlay">
          <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span><span class="pr">${fmtML(l.price)}${l.src==='real'?'':'<i class="est"> est.</i>'}<em>${(l.p*100).toFixed(0)}%</em></span></label></li>`; }).join('')}</ul></div>`; };
  return `<div class="card gsugg"><div class="gsugg-hd"><h2>Suggested parlays</h2></div>${side}
    <p class="muted" style="margin:0 0 10px;font-size:12.5px">The best payout for the chance in this game, at 2, 3 and 4 legs: main lines and threshold ladders, with the book's price where it has one and an estimate (est.) where it does not. Every leg at least a 40% chance and no shorter than ${fmtML(GAME_LEG_MIN)}; High pays at least +100 and lands at least 35% of the time, Medium +250 and 20%, Low +500 and 10%. Chances allow for how the legs move together, and the price is what a book pays for them together.</p>
    <div class="gsugg-tiers g3">${GAME_TIERS.map(block).join('')}</div></div>`;
}
"""

cut(J, "/* the same engine as the week-wide tiers, narrowed to one game and one tier.", "function getSuggestions(){", NEW)

cut(J, "  /* a different parlay of the same confidence, kept in memory only */", "\n/* ---------- weekly stats ingest ---------- */",
    """  /* a tier's Add all: every leg of that hand on the parlay, skipping any already there */
  $('gameView').querySelectorAll('[data-gtier-add]').forEach(b=>b.addEventListener('click',()=>{
    const t=gameTiers(g)[b.dataset.gtierAdd]; if(!t) return;
    for(const l of t.legs){
      const cur=S.parlay[l.key];
      if(cur&&cur.k===l.k&&cur.side===l.side&&!!cur.main===!!l.main) continue;
      toggleLeg(l.key,l.k,g,l.side,l.main);
    }
  }));
}
""")

sub1(J, "S.ui.game=b.dataset.game; S.ui.open={}; forgetGameAlternates(); save(); renderGame(); }));",
     "S.ui.game=b.dataset.game; S.ui.open={}; save(); renderGame(); }));")

P1 = HERE / 'part1.html'
sub1(P1, ".gsugg-tiers{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}",
     ".gsugg-tiers{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}\n.gsugg-tiers.g3{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:4px}\n.gsugg-legs .pr .est{font-style:normal;font-size:10.5px;color:var(--muted);margin-left:2px}\n@media(max-width:980px){.gsugg-tiers.g3{grid-template-columns:1fr}}")

sub1(P2, "const APP_BUILD='app v73 \\u00b7 2026-10-01';", "const APP_BUILD='app v74 \\u00b7 2026-10-01';")

AUDIT = r"""  /* ---- O. the game page's suggested parlays: High, Medium, Low ---- */
  { const g=openUpcoming(); let card=d.querySelector('.gsugg');
    chk(!!card,'the game page has no suggested parlay section');
    { const sw=[...card.querySelectorAll('[data-gsugg-side]')];
      chk(sw.length===3&&sw.filter(b=>b.classList.contains('on')).length===1,'the game card has no side switch, or not one side on');
      const was=S.ui.suggestSide;
      sw.find(b=>b.dataset.gsuggSide==='over').click();
      chk(S.ui.suggestSide==='over'&&d.querySelector('.gsugg [data-gsugg-side="over"]')?.classList.contains('on'),'the game card switch did not take or did not redraw');
      const To=F('gameTiers')(g);
      chk(['high','med','low'].every(id=>!To[id]||To[id].legs.every(l=>l.grp!=='TEAM'&&l.side==='over')),'with overs on, a game tier has a leg that is not a player over');
      d.querySelector('.gsugg [data-gsugg-side="any"]').click();
      chk(S.ui.suggestSide==='any','Any did not come back on the game card');
      S.ui.suggestSide=was; d.querySelector('[data-game="'+g.id+'"]').click(); }
    w.eval('GAME_TIER_CACHE={}');
    const T=F('gameTiers')(g), MIN=w.eval('GAME_LEG_MIN'), spec=w.eval('GAME_TIERS');
    /* always there while the game has lines, the right size, and to the rules */
    chk(T.pool>=4?spec.every(([id])=>!!T[id]):true,`a game with ${T.pool} lines left a tier empty`);
    for(const [id,,n,floor,minP] of spec){ const t=T[id]; if(!t) continue;
      chk(t.relaxed||t.corr>=minP-0.03,`the ${id} tier lands ${(t.corr*100).toFixed(0)}%, under its ${minP*100}% floor, without saying so`);
      chk(t.legs.every(l=>l.p>=0.40),`the ${id} tier has a leg under a 40% chance`);
      chk(t.legs.length===n,`the ${id} tier has ${t.legs.length} legs, not ${n}`);
      chk(t.legs.every(l=>l.gid===g.id)&&t.legs.filter(l=>l.grp==='TEAM').length<=1&&t.legs.every(l=>t.legs.filter(x=>x.pid===l.pid).length<=2)&&new Set(t.legs.map(l=>l.key)).size===n,`the ${id} tier breaks the leg rules`);
      chk(t.legs.every(l=>l.price>=MIN&&isFinite(l.price)),`the ${id} tier has a leg shorter than ${MIN}`);
      chk(t.corr>0&&t.corr<1&&t.dec>1,`the ${id} tier has a nonsense chance or price`);
      chk(t.relaxed||t.dec>=1+floor/100-0.02,`the ${id} tier pays ${t.dec.toFixed(2)}, under its +${floor} floor, without saying so`); }
    /* each tier grows the one before */
    if(T.high&&T.med) chk(T.high.legs.every(l=>T.med.legs.some(x=>x.key===l.key&&x.k===l.k)),'Medium does not grow High');
    if(T.med&&T.low) chk(T.med.legs.every(l=>T.low.legs.some(x=>x.key===l.key&&x.k===l.k)),'Low does not grow Medium');
    /* the pool: book prices where they exist, the model's estimate on the rest, ladders included */
    { const pool=F('gameLegPool')(g);
      chk(pool.every(c=>c.gid===g.id&&c.price>=MIN&&(c.src==='real'||c.src==='est')),'the leg pool has a line from another game, too short a price or no source');
      chk(pool.some(c=>!c.main&&c.grp!=='TEAM'&&c.stat!=='any_td'),'the leg pool has no threshold ladders'); }
    /* the high pair is the best payout for its chance among its seeds, not a safe nothing */
    if(T.high){ const one=c=>c.p*F('mlToDec')(c.price), pool=F('gameLegPool')(g).sort((a,b)=>one(b)-one(a));
      const a=pool[0], b=pool.find(c=>c.key!==a.key&&!(c.grp==='TEAM'&&a.grp==='TEAM'));
      if(a&&b){ const pd=F('parlayDec')([{leg:a,ml:a.price},{leg:b,ml:b.price}]), pr=F('parlayProb')([a,b],20000).corr;
        chk(pd<2||T.high.corr*T.high.dec>=pr*pd-0.06,'the High pair returns less than the two best single legs together'); } }
    chk(F('gameTiers')(g)===T,'the tiers are not cached between renders');
    /* the card: three blocks, each with its chance, its legs and an Add all that works */
    d.querySelector('[data-game="'+g.id+'"]').click(); card=d.querySelector('.gsugg');
    const blocks=[...card.querySelectorAll('.gsugg-tier')];
    chk(blocks.length===3,'the card does not show High, Medium and Low');
    spec.forEach(([id,,n],i)=>{ const t=T[id]; if(!t) return;
      chk(blocks[i].querySelectorAll('.gsugg-legs li').length===n&&new RegExp(`${Math.round(t.corr*100)}% to land`).test(blocks[i].textContent.replace(/\s+/g,' ')),`the ${id} block does not show its ${n} legs and its chance`); });
    chk(!card.querySelector('[data-suggest-shuffle]'),'Shuffle is still on the card');
    if(T.med){ const keepP=JSON.parse(JSON.stringify(S.parlay||{})); S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      d.querySelector('[data-gtier-add="med"]').click();
      chk(T.med.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side),'Add all on Medium did not put its legs on the parlay');
      d.querySelector('[data-game="'+g.id+'"]').click();
      chk([...d.querySelectorAll('.gsugg-tier')][1].querySelectorAll('input[data-leg]:checked').length===3,'the Medium legs on the parlay are not ticked');
      S.parlay=keepP; F('save')(); d.querySelector('[data-game="'+g.id+'"]').click(); }
    /* the suggestion is the summary, the game bets table is the detail */
    { const cards=[...d.querySelectorAll('#gameView .card')];
      const iS=cards.findIndex(c=>c.classList.contains('gsugg')), iB=cards.findIndex(c=>c.classList.contains('gbets'));
      chk(iS>=0&&iB>=0&&iS<iB,'the suggested parlays are not above the game bets'); }
    console.log(`O. game tiers: ${spec.map(([id,,n])=>T[id]?`${id} ${n} legs ${(T[id].corr*100).toFixed(0)}% at ${(T[id].dec).toFixed(2)}${T[id].relaxed?' (under floor)':''}`:`${id} none`).join(', ')} from ${T.pool} lines`); }
"""
cut(A, "  /* ---- O. one suggested parlay on the game page ---- */", "  /* ---- N. the credit-pull panel, in place of the old price sheet ---- */", AUDIT)

sub1(J, "function closeGame(){ S.ui.game=null; forgetGameAlternates(); save(); closeGameModal(); renderSlate(); }",
     "function closeGame(){ S.ui.game=null; save(); closeGameModal(); renderSlate(); }")

sub1(A, """  /* ---- S. the threshold ladder toggle ---- */
  { openUpcoming();""", """  /* ---- S. the threshold ladder toggle ---- */
  /* from an empty parlay: a threshold leg left on it by an earlier section (the game card's
     ladder legs tick like any other) would keep the hidden-ladder note up on its own */
  { const keepS=JSON.parse(JSON.stringify(S.parlay||{})); S.parlay={}; openUpcoming();""")
sub1(A, """      chk(!/nothing counts out of sight/.test(d.getElementById('gameView').textContent),'the note outstayed the pinned rung'); }""",
     """      chk(!/nothing counts out of sight/.test(d.getElementById('gameView').textContent),'the note outstayed the pinned rung'); }
    S.parlay=keepS;""")
