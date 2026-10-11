"""app v96: the lock and New legs, as the review of v95 found them.

The review of v95 (lock a leg, New legs) confirmed seven faults, each reproduced on the page.

A game kicking off reset every level the visitor had locked or turned: the turn was keyed on
getPbTiers' signature, which lists the games still to come, so the first kickoff of a Sunday threw
away every lock on the afternoon games. The turn is now keyed on the picks and the data alone
(pbViewKey: the week, the boxes, the games unticked and the data, not the games still to come); a
kickoff keeps it, drops the locks on the game that kicked off, and fills a level again around the
locks left where it showed a leg on that game or lost a lock (pbRefill, the same fill as New legs,
the legs already shown still left out). A level with no lock left that lost a leg is the panel's own.

The key is checked on every draw of the panel (pbViewSync, from pbPanel), not only when a card is
drawn: ticking None (every card empty, so none asked) and then All brought the old turn back.

With every leg locked, New legs searched nothing and showed the locked legs ruled as the level's
best return over its floor at a lower chance. New legs is now off with every leg locked ("unlock one
for new legs") and does nothing if pressed; a level of locked legs alone (a kickoff can make one) is
ruled "your 3 locked legs" (allLocked).

New legs brought back as new a leg the card had shown on another line: the same player's other
rung, the same team to cover after to win, the same game's total under after over. The legs the
card has shown are now remembered by who they are on (pbWho: the game and the player, the team, or
the total), and New legs leaves out every leg on them until it starts over.

A turned card kept the panel's own rule ("the likeliest pair", "best return that lands 25%+") over a
parlay chosen from what was left, often less likely or paying less, and its totals line said the
picks made no parlay from legs with an edge when they did, on the legs already shown. A turned card
now says what it is: "the likeliest pair left", "best return left beside your lock that lands 25%+"
("left" while the card has shown legs and not started over, "beside your lock" with one), and its
totals are there "because the legs with an edge your picks have left for this card do not make a
parlay of this size beside your lock", or because the visitor locked them. The panel's own levels
read exactly as before.

The audit's M6 now also holds the turns to who has been shown, the turned card's rule and totals
line, New legs off with every leg locked, a level of locked legs alone, None then All, and a
kickoff keeping a lock on a game still to come and dropping one on the game under way; the page
smoke checks the turned rule and None then All on the page. Every edit is made in memory and
asserted to match exactly once; nothing is written unless all of them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
FILES = {k: p for k, p in (('p2', HERE / 'part2.js'), ('p3', HERE / 'part3.js'), ('audit', HERE / 'audit.js'),
                           ('smoke', ROOT / 'nflbets' / 'build' / 'smoke.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'pbViewSync' not in T['p3'], 'patch_pb_lock_fixes.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v95 \u00b7 2026-10-11';", r"const APP_BUILD='app v96 \u00b7 2026-10-11';")

# ---- the view: keyed on the picks and the data, synced on every draw, kept across a kickoff ----
sub1('p3', r"""   Each level's card has a lock on every leg and a New legs button. New legs keeps the locked legs
   and fills the rest with the best the level's rules give from the legs that card has not shown
   since the picks last changed (pbTier with the locked legs as its base, the pool less every leg
   the card has shown); once none can, it starts over from the whole list, the locks kept, and the
   card says so (wrapped). The turn is the visitor's while the page is open: PB_VIEW, outside S and
   never saved, keyed on getPbTiers' signature so it is gone when the picks or the data move */
let PB_VIEW={sig:null,t:{}};
function pbViewOf(id){
  const r=getPbTiers(); if(PB_VIEW.sig!==r.sig) PB_VIEW={sig:r.sig,t:{}};
  return PB_VIEW.t[id]||(PB_VIEW.t[id]={lock:[],seen:[],tier:null,wrapped:false});
}""", r"""   Each level's card has a lock on every leg and a New legs button. New legs keeps the locked legs
   and fills the rest with the best the level's rules give from the players, teams and game totals
   that card has not shown since the picks last changed (pbTier with the locked legs as its base, the
   pool less every leg on one the card has shown, pbWho: another line or rung on a player, or a team
   to cover after to win, is not a new leg); once none can, it starts over from the whole list, the
   locks kept, and the card says so (wrapped). With every leg locked there is nothing to turn, and
   New legs is off. The turn is the visitor's while the page is open: PB_VIEW, outside S and never
   saved, keyed on the picks and the data (pbViewKey) and checked on every draw of the panel
   (pbViewSync), so it is gone when a box or the data move, even a box ticked off and on again. A
   game kicking off is not a change of picks: the locks on games still to come are kept, and a level
   that showed a leg on the game that kicked off, or lost a lock with it, is filled again around the
   locks left (pbRefill) */
let PB_VIEW={sig:null,key:null,t:{}};
const pbWho=l=>l.gid+'|'+l.pid;
/* what the tiers stand on beyond the picks: the data the job published and the page loaded */
function pbDataSig(){ return [PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig()].join('|'); }
/* the picks and the data, without the games still to come, which a kickoff moves */
function pbViewKey(){ const u=pbUi(); return [currentWeek(),[...u.off].sort().join(','),PB_KINDS.map(([k])=>u.k[k]?1:0).join(''),pbDataSig()].join('|'); }
function pbViewSync(){
  const r=getPbTiers(), key=pbViewKey();
  if(PB_VIEW.key!==key) PB_VIEW={sig:r.sig,key,t:{}};
  else if(PB_VIEW.sig!==r.sig){ PB_VIEW.sig=r.sig; for(const id of Object.keys(PB_VIEW.t)) pbRefill(id,r); }
  return r;
}
function pbViewOf(id){
  pbViewSync();
  return PB_VIEW.t[id]||(PB_VIEW.t[id]={lock:[],seen:[],tier:null,wrapped:false});
}""")
sub1('p3', r"""function pbTurn(id){
  const r=getPbTiers(), base=r.tiers.find(x=>x.id===id), spec=PB_TIERS.find(s=>s[0]===id);
  if(!base||!spec) return;
  const v=pbViewOf(id), shown=v.tier||base; if(!shown.legs&&!v.lock.length) return;
  const u=pbUi(), games=pbGames().filter(g=>!u.off.includes(g.id)), pool=pbPool(games);
  /* a locked leg whose game has kicked off falls away */
  v.lock=v.lock.filter(l=>games.some(g=>g.id===l.gid));
  const locked=new Set(v.lock.map(pbId));
  for(const l of (shown.legs||[])) if(!locked.has(pbId(l))&&!v.seen.includes(pbId(l))) v.seen.push(pbId(l));
  const less=ex=>({pref:pool.pref.filter(c=>!ex.has(pbId(c))),thin:pool.thin.filter(c=>!ex.has(pbId(c))),mkt:(pool.mkt||[]).filter(c=>!ex.has(pbId(c)))});
  let x=pbTier(spec,less(new Set([...v.seen,...locked])),new Map(),v.lock);
  v.wrapped=false;
  /* nothing unshown is left: start over from the whole list, the locks kept */
  if(!x){ v.seen=[]; v.wrapped=true; x=pbTier(spec,less(locked),new Map(),v.lock); }
  const head={id:base.id,label:base.label,n:base.n,floor:base.floor,turned:true};
  v.tier=x?{...head,...x}:{...head,why:'No parlay of this size fits beside the legs you locked: unlock one.'};
}""", r"""function pbTurn(id){
  const r=getPbTiers(), base=r.tiers.find(x=>x.id===id), spec=PB_TIERS.find(s=>s[0]===id);
  if(!base||!spec) return;
  const v=pbViewOf(id), shown=v.tier||base; if(!shown.legs&&!v.lock.length) return;
  /* every leg locked: nothing to turn (the card's New legs is off) */
  if(shown.legs&&shown.legs.every(l=>v.lock.some(x=>pbId(x)===pbId(l)))) return;
  const locked=new Set(v.lock.map(pbId));
  for(const l of (shown.legs||[])) if(!locked.has(pbId(l))&&!v.seen.includes(pbWho(l))) v.seen.push(pbWho(l));
  pbFill(id,v);
}
/* the level filled around its locks from the picks as they stand: first from the players, teams
   and totals the card has not shown, then, where none of those can, from the whole list again
   (wrapped). With every leg locked the locks are the parlay (allLocked) and nothing is searched */
function pbFill(id,v){
  const r=getPbTiers(), base=r.tiers.find(x=>x.id===id), spec=PB_TIERS.find(s=>s[0]===id);
  const head={id:base.id,label:base.label,n:base.n,floor:base.floor,turned:true};
  const u=pbUi(), games=pbGames().filter(g=>!u.off.includes(g.id)), pool=pbPool(games);
  /* a locked leg whose game has kicked off falls away */
  v.lock=v.lock.filter(l=>games.some(g=>g.id===l.gid));
  v.wrapped=false;
  if(v.lock.length>=spec[2]){ v.tier={...head,...pbExact(v.lock.slice(0,spec[2])),allLocked:true}; return; }
  const locked=new Set(v.lock.map(pbId));
  const less=who=>{ const ok=c=>!locked.has(pbId(c))&&!who.has(pbWho(c)); return {pref:pool.pref.filter(ok),thin:pool.thin.filter(ok),mkt:(pool.mkt||[]).filter(ok)}; };
  let x=pbTier(spec,less(new Set(v.seen)),new Map(),v.lock);
  /* nothing unshown is left: start over from the whole list, the locks kept */
  if(!x&&v.seen.length){ v.seen=[]; v.wrapped=true; x=pbTier(spec,less(new Set()),new Map(),v.lock); }
  v.tier=x?{...head,...x}:{...head,why:base.why||(v.lock.length?'No parlay of this size fits beside the legs you locked: unlock one.':'No parlay of this size on your picks.')};
}
/* a game kicked off (the tiers moved, the picks did not): the locks on it fall away, and a level
   that showed a leg on it or lost a lock is filled again around the locks left, the legs it has
   shown still left out; one with no lock left is the panel's own again */
function pbRefill(id,r){
  const v=PB_VIEW.t[id], base=r.tiers.find(x=>x.id===id);
  if(!v||!base){ delete PB_VIEW.t[id]; return; }
  const u=pbUi(), on=new Set(pbGames().filter(g=>!u.off.includes(g.id)).map(g=>g.id)), live=l=>on.has(l.gid);
  const n0=v.lock.length; v.lock=v.lock.filter(live);
  const holds=v.tier?!!v.tier.legs&&v.tier.legs.every(live):v.lock.every(l=>(base.legs||[]).some(x=>pbId(x)===pbId(l)));
  if(v.lock.length===n0&&holds) return;
  if(!v.lock.length){ delete PB_VIEW.t[id]; return; }
  pbFill(id,v);
}""")
sub1('p3', r"""  const sig=[currentWeek(),games.map(g=>g.id).join(','),u.off.filter(id=>games.some(g=>g.id===id)).sort().join(','),PB_KINDS.map(([k])=>u.k[k]?1:0).join(''),
    PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig()].join('|');""",
     r"""  const sig=[currentWeek(),games.map(g=>g.id).join(','),u.off.filter(id=>games.some(g=>g.id===id)).sort().join(','),PB_KINDS.map(([k])=>u.k[k]?1:0).join(''),pbDataSig()].join('|');""")

# ---- the card: what a turned level is, and why its totals are there ----
sub1('p3', r"""function pbMktLine(legs){
  const n=legs.filter(l=>l.market).length, one=n===1;
  return `${one?'The game total is':n+' game totals are'} at the book’s own chance with its margin out, so ${one?'it has':'they have'} no edge: ${one?'it is':'they are'} here because your picks do not make a parlay of this size from legs with an edge.`;
}""", r"""function pbMktLine(legs,why){
  const n=legs.filter(l=>l.market).length, one=n===1;
  return `${one?'The game total is':n+' game totals are'} at the book’s own chance with its margin out, so ${one?'it has':'they have'} no edge: ${one?'it is':'they are'} here because ${why||'your picks do not make a parlay of this size from legs with an edge'}.`;
}
/* a turned level (v, the visitor's view of it) is chosen from the legs the card has not shown
   (left, until it starts over) beside the visitor's locks, so it says so: in its rule, and in why
   its totals are there (or that the visitor locked them). The panel's own levels read as before */
const pbBeside=v=>{ const nL=v.lock.length; return nL?` beside your lock${nL>1?'s':''}`:''; };
const pbLeft=v=>!v.wrapped&&v.seen.length>0;
function pbRuleOf(t,v){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  if(!t.turned||!v) return t.likeliest?`the likeliest ${n} legs`:t.floor?`best return that lands ${pct}%+`:'the likeliest pair';
  if(t.allLocked) return n===2?'your locked pair':`your ${n} locked legs`;
  const mod=(pbLeft(v)?' left':'')+pbBeside(v);
  return t.likeliest||!t.floor?`the likeliest ${n===2?'pair':n+' legs'}${mod}`:`best return${mod} that lands ${pct}%+`;
}
function pbMktWhy(t,v){
  if(!t.turned||!v) return '';
  if(!t.legs.some(l=>l.market&&!v.lock.some(x=>pbId(x)===pbId(l)))) return t.mkt===1?'you locked it':'you locked them';
  return `the legs with an edge ${pbLeft(v)?'your picks have left for this card':'on your picks'} do not make a parlay of this size${pbBeside(v)}`;
}""")
sub1('p3', r"""  const turn=o.ctl?`<span class="pb-turnbar"><button type="button" class="btn quiet small pb-turn" data-pb-turn="${t.id}" title="New legs for this level, keeping the ones you locked">\u21bb New legs</button>""",
     r"""  const v=o.ctl?PB_VIEW.t[t.id]:null, allL=!!(v&&t.legs&&t.legs.every(l=>pbLocked(t.id,l)));
  const turn=o.ctl?`<span class="pb-turnbar"><button type="button" class="btn quiet small pb-turn" data-pb-turn="${t.id}" ${allL?'disabled title="Every leg is locked: unlock one for new legs"':'title="New legs for this level, keeping the ones you locked"'}>\u21bb New legs</button>""")
sub1('p3', r"""${o.rule||(t.floor!=null?`<span class="pb-rule">${t.likeliest?`the likeliest ${t.legs.length} legs`:t.floor?`best return that lands ${Math.round(t.floor*100)}%+`:'the likeliest pair'}</span>`:'')}</div>""",
     r"""${o.rule||(t.floor!=null?`<span class="pb-rule">${pbRuleOf(t,v)}</span>`:'')}</div>""")
sub1('p3', r"""${t.mkt?`<p class="pb-thin">${pbMktLine(t.legs)}</p>`:''}""",
     r"""${t.mkt?`<p class="pb-thin">${pbMktLine(t.legs,pbMktWhy(t,v))}</p>`:''}""")
sub1('p3', r"""  const r=getPbTiers(), nOn=games.filter(g=>!u.off.includes(g.id)).length,""",
     r"""  const r=pbViewSync(), nOn=games.filter(g=>!u.off.includes(g.id)).length,""")

# ---- the audit's M6 ----
sub1('audit', r"""          const seen=new Set(T.legs.filter(l=>idOf(l)!==lid).map(idOf)); let turns=0, wrapped=false;""",
     r"""          /* the card remembers who it has shown (a player, a team, a game's total), not the line */
          const whoOf=F('pbWho'), seen=new Set(T.legs.filter(l=>idOf(l)!==lid).map(whoOf)); let turns=0, wrapped=false;""")
sub1('audit', r"""            if(!wrapped) chk(fresh.every(l=>!seen.has(idOf(l))),`turn ${turns}: a leg the card had shown came back before the start-over: ${fresh.filter(l=>seen.has(idOf(l))).map(l=>l.name+' '+l.label).join(', ')}`);
            else chk(/back to the first/.test(cardOf().textContent),`turn ${turns}: the start-over is not said on the card`);
            fresh.forEach(l=>seen.add(idOf(l)));""",
     r"""            if(!wrapped) chk(fresh.every(l=>!seen.has(whoOf(l))),`turn ${turns}: a player, team or total the card had shown came back before the start-over, on this line or another: ${fresh.filter(l=>seen.has(whoOf(l))).map(l=>l.name+' '+l.label).join(', ')}`);
            else chk(/back to the first/.test(cardOf().textContent),`turn ${turns}: the start-over is not said on the card`);
            fresh.forEach(l=>seen.add(whoOf(l)));
            /* a turned card says what it is: chosen from the legs left (until it starts over) beside the lock */
            const rule=cardOf().querySelector('.pb-rule').textContent;
            chk(/ beside your lock$| beside your lock that lands/.test(rule)&&(wrapped||/ left /.test(rule))&&(x.likeliest||!x.floor?/^the likeliest /.test(rule):/^best return /.test(rule)),`turn ${turns}: the turned card is ruled "${rule}", not the level's rule on the legs left beside the lock`);
            if(x.mkt) chk(!/because your picks do not make a parlay/.test(cardOf().textContent)&&/here because (the legs with an edge (your picks have left for this card|on your picks) do not make a parlay of this size beside your lock|you locked)/.test(cardOf().textContent),`turn ${turns}: the totals line on the turned card does not say why they are there`);""")
sub1('audit', r"""          chk(!w.eval(`PB_VIEW.t['${T.id}']`)||(!w.eval(`PB_VIEW.t['${T.id}'].tier`)&&!w.eval(`PB_VIEW.t['${T.id}'].lock.length`)),'a changed box left a turned level or a lock behind');""",
     r"""          chk(!w.eval(`PB_VIEW.t['${T.id}']`)||(!w.eval(`PB_VIEW.t['${T.id}'].tier`)&&!w.eval(`PB_VIEW.t['${T.id}'].lock.length`)),'a changed box left a turned level or a lock behind');
          const bare=()=>{ const v=w.eval(`PB_VIEW.t['${T.id}']`); return !v||(!v.tier&&!v.lock.length); };
          /* None and then All is a change of picks too, though no card is drawn under None */
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();
            cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(F('pbShownTier')(T.id).legs[0])}"]`).click(); cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
            d.querySelector('#pbPanel [data-pb-games="none"]').click(); d.querySelector('#pbPanel [data-pb-games="all"]').click();
            chk(bare()&&JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(F('getPbTiers')().tiers.find(t=>t.id===T.id).legs.map(idOf)),'ticking None and then All brought a turned level or a lock back'); }
          /* every leg locked: New legs is off and does nothing; a level of locked legs alone (which a
             kickoff can leave) is ruled as the visitor's own, never as the level's search */
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')(); const T0=F('pbShownTier')(T.id), r0=cardOf().querySelector('.pb-rule').textContent;
            for(const l of T0.legs) cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(l)}"]`).click();
            const tb=cardOf().querySelector(`[data-pb-turn="${T.id}"]`);
            chk(tb.disabled&&/unlock one/.test(tb.title),'with every leg locked New legs is not off, or does not say to unlock one');
            F('pbTurn')(T.id); F('renderPb')();
            chk(JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(T0.legs.map(idOf))&&cardOf().querySelector('.pb-rule').textContent===r0,'New legs with every leg locked changed the level or its rule');
            const v=F('pbViewOf')(T.id); F('pbFill')(T.id,v); F('renderPb')();
            const x=F('pbShownTier')(T.id), rule=cardOf().querySelector('.pb-rule').textContent;
            chk(!!x.allLocked&&JSON.stringify(x.legs.map(idOf).sort())===JSON.stringify(T0.legs.map(idOf).sort())&&/^your (locked pair|\d+ locked legs)$/.test(rule)&&cardOf().querySelector(`[data-pb-turn="${T.id}"]`).disabled,`a level of locked legs alone is ruled "${rule}", or is not the locked legs, or offers New legs`); }
          /* a game kicking off is not a change of picks: the lock on a game still to come stays and the
             level is filled again around it, with no leg on the game under way; the lock on that one falls away */
          let kicked='no leg of the level on a later kickoff than another';
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();
            const gs=F('pbGames')(), ko=g=>F('kickoff')(g).getTime(), T1=F('pbShownTier')(T.id), kOf=l=>ko(gs.find(g=>g.id===l.gid));
            const first=Math.min(...T1.legs.map(kOf)), Le=T1.legs.find(l=>kOf(l)===first), Ll=T1.legs.find(l=>kOf(l)>first);
            if(Le&&Ll){
              cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(Ll)}"]`).click(); cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(Le)}"]`).click();
              const now0=w.Date.now, off=first+60e3-now0.call(w.Date); w.Date.now=()=>now0.call(w.Date)+off; F('renderPb')();
              const on=new Set(F('pbGames')().map(g=>g.id)), v=w.eval(`PB_VIEW.t['${T.id}']`), x=F('pbShownTier')(T.id);
              chk(!!v&&v.lock.length===1&&idOf(v.lock[0])===idOf(Ll)&&!!x.legs&&x.legs.length===T1.legs.length&&x.legs.some(l=>idOf(l)===idOf(Ll))&&x.legs.every(l=>on.has(l.gid))
                &&cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(Ll)}"]`).getAttribute('aria-pressed')==='true'&&/ beside your lock/.test(cardOf().querySelector('.pb-rule').textContent),
                `a kickoff dropped the lock on a game still to come, kept the one on the game under way, or did not fill the level again around it: ${x.legs?x.legs.map(l=>l.name+' '+l.label).join(', '):x.why}`);
              if(x.legs) okTier(x,'filled again after a kickoff');
              w.Date.now=now0; F('renderPb')();
              kicked=`a kickoff kept the lock on ${Ll.name} and dropped the one on ${Le.name}`; } }
          w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();""")
sub1('audit', r"""              while(nW<40&&!wr){ d.querySelector('#pbPanel [data-pb-turn="safe"]').click(); nW++; wr=!!w.eval("PB_VIEW.t['safe']&&PB_VIEW.t['safe'].wrapped");
                const x=F('pbShownTier')('safe'); if(x&&x.legs) okTier(x,`Safe on three games, turn ${nW}`); }""",
     r"""              const sw=new Set(F('pbShownTier')('safe').legs.map(whoOf));
              while(nW<40&&!wr){ d.querySelector('#pbPanel [data-pb-turn="safe"]').click(); nW++; wr=!!w.eval("PB_VIEW.t['safe']&&PB_VIEW.t['safe'].wrapped");
                const x=F('pbShownTier')('safe'), c=d.querySelector('#pbPanel .pb-tier.safe'); if(!x||!x.legs) continue;
                okTier(x,`Safe on three games, turn ${nW}`);
                chk(c.querySelector('.pb-rule').textContent===(wr?'the likeliest pair':'the likeliest pair left'),`Safe on three games, turn ${nW}: ruled "${c.querySelector('.pb-rule').textContent}"`);
                if(!wr) chk(x.legs.every(l=>!sw.has(whoOf(l))),`Safe on three games, turn ${nW}: a team or total it had shown came back before the start-over`);
                if(x.mkt&&!wr) chk(/here because the legs with an edge your picks have left for this card do not make a parlay of this size\./.test(c.textContent),`Safe on three games, turn ${nW}: the totals line does not say the legs with an edge left do not make the pair`);
                x.legs.forEach(l=>sw.add(whoOf(l))); }""")
sub1('audit', r"""          console.log(`M6. lock and new legs: ${turns} turns of the ${T.label} level, the locked leg on each, ${seen.size} legs seen${wrapped?', then back to the first':''}; Safe on three games started over after ${nW} turns`); }""",
     r"""          console.log(`M6. lock and new legs: ${turns} turns of the ${T.label} level, the locked leg on each, ${seen.size} players, teams and totals seen${wrapped?', then back to the first':''}; Safe on three games started over after ${nW} turns; ${kicked}`); }""")

# ---- the page smoke ----
sub1('smoke', r"""          chk(!!x && !!x.legs && x.legs.some(l => idOf(l) === lid) && x.legs.map(idOf).join() !== T.legs.map(idOf).join() && x.legs.every(l => txt(cardOf()).includes(l.name)),
            'New legs on the page did not keep the locked leg, turn the rest, or draw them');""",
     r"""          chk(!!x && !!x.legs && x.legs.some(l => idOf(l) === lid) && x.legs.map(idOf).join() !== T.legs.map(idOf).join() && x.legs.every(l => txt(cardOf()).includes(l.name)),
            'New legs on the page did not keep the locked leg, turn the rest, or draw them');
          /* the turned card says it is chosen from the legs left beside the lock */
          const rule = txt(cardOf().querySelector('.pb-rule'));
          chk(/ left .*beside your lock/.test(rule), `the turned card is ruled "${rule}", not on the legs left beside the lock`);""")
sub1('smoke', r"""          w.eval('PB_VIEW={sig:null,t:{}}; renderParlay()'); await wait(20); } }""",
     r"""          /* None and then All is a change of picks: the turn and the lock are gone */
          d.querySelector('#pbPanel [data-pb-games="none"]').click(); await wait(20); d.querySelector('#pbPanel [data-pb-games="all"]').click(); await wait(20);
          chk(!cardOf().querySelector('[data-pb-lock][aria-pressed="true"]') && !cardOf().querySelector('[data-pb-reset]'), 'ticking None and then All on the page brought a lock or a turn back');
          w.eval('PB_VIEW={sig:null,t:{}}; renderParlay()'); await wait(20); } }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v96, the lock and New legs as the review found them; audit M6 and the page smoke')
