"""Each game's Suggested parlay shows High, Medium and Low, not Medium alone.

The owner wanted the low, medium and high suggestions on a game page, as the week's window
has them. The card's own parlay stays as it was (Medium: the best value hand that keeps 30
percent, three legs at most, with Shuffle and the leg locks), and two more stand under it:

  High   the likeliest pair from the game's twelve likeliest candidate legs, kept only if it
         lands 50 percent of the time or better, and a third leg on top where one keeps it
         there (the best payout among those that do).
  Low    Medium with more legs, each the best payout that keeps the parlay at 15 percent or
         better, up to five legs: a bigger price on the same core.

Both use the same candidates as Medium (so the side switch and the bar apply alike), the same
rules (one team bet, no more than two legs on one player) and the same pricing, a same-game
parlay priced as one. Each has an Add all that puts its legs on the parlay, skipping any
already there. Built once per game and cached on the same signature as Medium. The audit
proves both on the game it prices. app v73.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P1 = HERE / 'part1.html'
P2 = HERE / 'part2.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- the two extra hands ----
sub1(J, "let GAME_SUGGEST_ALT={};", """/* High and Low beside the card's own Medium: the likeliest pair (plus a third where it keeps
   50%), and Medium grown by the best-paying legs down to 15% */
const GAME_TIER_HIGH=0.50, GAME_TIER_LOW=0.15, GAME_TIER_LOW_CAP=5;
let GAME_TIER_CACHE={};
function gameTiers(g){
  const sig=gameSuggestSig(g), hit=GAME_TIER_CACHE[g.id];
  if(hit&&hit.sig===sig) return hit.val;
  const mid=gameSuggestion(g), cands=suggestCandidates([g]);
  const fits=(cur,c)=>!cur.some(l=>l.key===c.key)&&!(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM'))&&cur.filter(l=>l.pid===c.pid).length<2;
  const priced=legs=>({legs,corr:parlayProb(legs,20000).corr,dec:parlayDec(legs.map(l=>({leg:l,ml:l.price})))});
  const pay=legs=>parlayDec(legs.map(l=>({leg:l,ml:l.price})),2000);
  let high=null, low=null;
  if(mid.legs.length){
    const top=[...cands].sort((a,b)=>b.p-a.p).slice(0,12);
    let best=null;
    for(let i=0;i<top.length;i++) for(let j=i+1;j<top.length;j++){
      if(!fits([top[i]],top[j])) continue;
      const pr=parlayProb([top[i],top[j]],3000).corr;
      if(pr>=GAME_TIER_HIGH&&(!best||pr>best.pr)) best={pr,legs:[top[i],top[j]]};
    }
    if(best){
      let add=null;
      for(const c of cands){ if(!fits(best.legs,c)) continue;
        const next=[...best.legs,c], pr=parlayProb(next,3000).corr; if(pr<GAME_TIER_HIGH) continue;
        const sc=pr*pay(next); if(!add||sc>add.sc) add={sc,next}; }
      let t=priced(add?add.next:best.legs);
      while(t.legs.length>2&&t.corr<GAME_TIER_HIGH) t=priced(t.legs.slice(0,-1));
      if(t.corr>=GAME_TIER_HIGH-0.02) high=t;
    }
    let cur=[...mid.legs];
    while(cur.length<GAME_TIER_LOW_CAP){
      let b=null;
      for(const c of cands){ if(!fits(cur,c)) continue;
        const next=[...cur,c], pr=parlayProb(next,3000).corr; if(pr<GAME_TIER_LOW) continue;
        const sc=pr*pay(next); if(!b||sc>b.sc) b={sc,c}; }
      if(!b) break; cur=[...cur,b.c];
    }
    if(cur.length>mid.legs.length){
      let t=priced(cur);
      while(t.legs.length>mid.legs.length+1&&t.corr<GAME_TIER_LOW) t=priced(t.legs.slice(0,-1));
      if(t.corr>=GAME_TIER_LOW-0.01) low=t;
    }
  }
  const val={high,low};
  GAME_TIER_CACHE[g.id]={sig,val};
  return val;
}
function gameTierBlock(id,label,chip,t,stake,none){
  if(!t) return `<div class="gsugg-tier"><div class="gsugg-tier-hd"><span class="conf ${id}">${label}</span><span class="muted">${chip}</span></div><p class="muted" style="margin:6px 0 0;font-size:12px">${none}</p></div>`;
  const ml=decToML(t.dec);
  return `<div class="gsugg-tier"><div class="gsugg-tier-hd"><span class="conf ${id}">${label}</span><span class="muted">${chip}</span><span class="grow"></span><button class="btn quiet gsugg-all" data-gtier-add="${id}">Add all</button></div>
    <div class="gsugg-nums"><b>${(t.corr*100).toFixed(0)}%</b> to land <span class="muted">\\u00b7</span> <b>${fmtML(ml)}</b>${stake?` <span class="muted">pays $${(stake*t.dec).toFixed(2)}</span>`:''} <span class="muted">\\u00b7 ${t.legs.length} legs</span></div>
    <ul class="gsugg-tl">${t.legs.map(l=>`<li><span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span><span class="pr">${fmtML(l.price)}<em>${(l.p*100).toFixed(0)}%</em></span></li>`).join('')}</ul></div>`;
}
function gameTiersHTML(g,stake){
  const T=gameTiers(g);
  return `<div class="gsugg-tiers">${gameTierBlock('high','High','most likely',T.high,stake,'No pair in this game lands 50% of the time.')}${gameTierBlock('low','Low','bigger payout',T.low,stake,'Nothing more to add that keeps it at 15% or better.')}</div>`;
}
let GAME_SUGGEST_ALT={};""")

sub1(J, """:' <b>Nothing else in this game comes out at the same confidence, so the model\\u2019s own pick stands.</b>'):''}</p></div>`;""",
     """:' <b>Nothing else in this game comes out at the same confidence, so the model\\u2019s own pick stands.</b>'):''}</p>${gameTiersHTML(g,stake)}</div>`;""")

# ---- Add all on a tier ----
sub1(J, """  /* the whole suggestion at once, skipping any leg already on so it cannot toggle one off */""",
     """  /* High or Low: every leg of that hand on the parlay, skipping any already there */
  $('gameView').querySelectorAll('[data-gtier-add]').forEach(b=>b.addEventListener('click',()=>{
    const t=gameTiers(g)[b.dataset.gtierAdd]; if(!t) return;
    for(const l of t.legs){
      const cur=S.parlay[l.key];
      if(cur&&cur.k===l.k&&cur.side===l.side&&!!cur.main===!!l.main) continue;
      toggleLeg(l.key,l.k,g,l.side,l.main);
    }
  }));
  /* the whole suggestion at once, skipping any leg already on so it cannot toggle one off */""")

# ---- styles ----
sub1(P1, ".gsugg-ft{margin:8px 0 0;font-size:12px}",
     """.gsugg-ft{margin:8px 0 0;font-size:12px}
.gsugg-tiers{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.gsugg-tier{border:1px solid var(--line);border-radius:var(--r-md);padding:10px 12px;min-width:0}
.gsugg-tier-hd{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:12px;flex-wrap:wrap}
.gsugg-tier-hd .grow{flex:1}
.gsugg-tl{list-style:none;margin:8px 0 0;padding:0;border-top:1px solid var(--line)}
.gsugg-tl li{display:flex;align-items:baseline;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px}
.gsugg-tl .nm{flex:1;min-width:0}
.gsugg-tl .nm small{display:block;color:var(--ink-2);font-size:11.5px}
.gsugg-tl .pr{font-family:var(--display);font-variant-numeric:tabular-nums;white-space:nowrap}
.gsugg-tl .pr em{font-style:normal;color:var(--ink-2);font-size:11.5px;margin-left:6px}
@media(max-width:700px){.gsugg-tiers{grid-template-columns:1fr}}""")

sub1(P2, "const APP_BUILD='app v72 \\u00b7 2026-10-01';", "const APP_BUILD='app v73 \\u00b7 2026-10-01';")

# ---- audit: High and Low on the priced game ----
sub1(A, """    if(s2.legs.length){ d.querySelector('[data-game="'+g.id+'"]').click();
      const c2=d.querySelector('.gsugg');""",
     """    /* High and Low beside it: High lands at least half the time on two or three legs, Low is
       Medium with more legs at 15% or better, both from this game alone, priced as one */
    if(s2.legs.length){ w.eval('GAME_TIER_CACHE={}'); const T=F('gameTiers')(g);
      const rules=t=>t.legs.every(l=>l.gid===g.id)&&t.legs.filter(l=>l.grp==='TEAM').length<=1&&t.legs.every(l=>t.legs.filter(x=>x.pid===l.pid).length<=2)&&new Set(t.legs.map(l=>l.key)).size===t.legs.length&&t.dec>1;
      if(T.high) chk(T.high.legs.length>=2&&T.high.legs.length<=3&&T.high.corr>=0.48&&rules(T.high),'the High hand breaks its rules: '+T.high.legs.length+' legs at '+T.high.corr);
      if(T.low) chk(T.low.legs.length>s2.legs.length&&T.low.legs.length<=5&&s2.legs.every(l=>T.low.legs.some(x=>x.key===l.key))&&T.low.corr>=0.14&&T.low.dec>s2.dec&&rules(T.low),'the Low hand is not Medium grown to a bigger price');
      chk(F('gameTiers')(g)===T,'the High and Low hands are not cached between renders');
      d.querySelector('[data-game="'+g.id+'"]').click();
      chk(d.querySelectorAll('.gsugg .gsugg-tier').length===2,'the card does not show High and Low beside Medium');
      if(T.high){ const keepP=JSON.parse(JSON.stringify(S.parlay||{})); S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
        d.querySelector('[data-gtier-add="high"]').click();
        chk(T.high.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side),'Add all on High did not put its legs on the parlay');
        S.parlay=keepP; F('save')(); } }
    if(s2.legs.length){ d.querySelector('[data-game="'+g.id+'"]').click();
      const c2=d.querySelector('.gsugg');""")
