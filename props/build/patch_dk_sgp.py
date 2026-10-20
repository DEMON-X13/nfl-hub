r"""app v121: every suggested parlay is one game's legs, and none holds a pair DraftKings will not take on one slip.

The owner, 19 October 2026, after reading how DraftKings builds a same-game parlay: "The book won't let you combine legs
that depend on each other. If your parlay already has a receiver anytime TD, a team total, or the game total, adding the
QB's passing TD over often gets blocked (or greyed out) because those outcomes move together", and "Some combos
contradict each other, like QB under 1.5 passing TDs alongside two of his receivers to score. The book rejects it
outright"; then: "i think also the legs need to be part of the same game parlay only, and anytime there's a mix it bombs
the hyperlink. also thinking about maybe adding links for each individual one may reduce the issues?". Of the 121
suggested parlays the record and its backtest held that day (weeks 3 to 6), 5 paired a quarterback's passing TDs with a
teammate's touchdown, every one an Elo pick (Prescott with CeeDee Lamb three times, Darnold's under with Jaxon
Smith-Njigba once); none paired them with the game total.

dkClash (dkClashWhy): two legs of one game DraftKings will not take on one slip, a quarterback's passing touchdowns
(over or under, a main line or a rung) with a teammate's anytime touchdown ('td'), or his passing touchdowns over with the
game's total ('total'). pbFits, the one rule every level's search asks of a leg joining a parlay (the all-games levels,
each night game's set, the Sunday slot's), refuses such a pair, and so do a game page's hands (gameTiers' fits); the Elo
picks' search (tab_elo.html) refuses it on its own side. Nothing else about which legs a level takes moves.

The Sunday slot (app v118) was one set of the four levels across its games, so a level could hold legs of three games,
which DraftKings' betslip link does not open. Now each of its levels is one game's: the slot builds each of its games'
own set exactly as a night game's is built (spSet on the game, SP_SEARCH), and each level is the best of those games'
(spSlotBuild, spSlotBetter): a parlay before none; one without a game total before one with one; one that meets its
floor before the likeliest of its size; the fewer thin legs; then the better expected return (chance times price) where
it met a floor, else the higher chance; then the earlier game of the slot. Within one game that is exactly the order a
set's own search keeps (pbTierOf: no totals while the legs with an edge make the size; pbBestReturn and pbLikeliest: the
fewest thin legs first). Its empty level says so of any one game (spWhySlot), its Elo picks are chosen the same way per
game (eloUnit's perGame), and each card names its game (pbTierCard's o.game, the slot's cards). A level built again for a
player ruled out after the lock is built the same way. The record takes them as it always has (spSet, spEloSet).

The builder says what DraftKings will refuse: a line under the legs where two of them are such a pair (data-pb-clash),
and, where the parlay card is on the page and the legs mix a same-game parlay (two or more legs of one game) with legs of
other games, that DraftKings' betslip link does not open that mix and the card gives each game a link of its own
(data-pb-multigame; the card is nflbets/build/card.html, which since this change does so, and lists every leg's own
link). A parlay of one leg a game still opens as one link, as it always has: the owner's word was for the mix.
"""
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function dkClashWhy(' not in T['p3'], 'patch_dk_sgp.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v120 \\u00b7 2026-10-19';", "const APP_BUILD='app v121 \\u00b7 2026-10-20';", 'APP_BUILD')

# ---------------------------------------------------------------- the rule
sub1('p3', """/* a leg that can join: not a line already on it, not a second side (to win or to cover) on one
   game, and not a second leg on one player (two lines on one man, his catches and his yards, are
   nearly one bet). A game's total is a bet of its own beside its side, as a book takes them on one
   ticket (the two are unrelated, legRho); its over and under are one key, so one total a game */
function pbFits(cur,c){
  if(cur.some(l=>l.key===c.key)) return false;""",
     """/* (app v121) two legs of one game DraftKings will not take on one slip (the owner, 19 October 2026: "If your parlay
   already has a receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets blocked",
   and "Some combos contradict each other, like QB under 1.5 passing TDs alongside two of his receivers to score"): a
   quarterback's passing touchdowns, over or under, a main line or a rung, with a teammate's anytime touchdown ('td'), or
   his passing touchdowns over with the game's total ('total'); null for any other pair. No suggestion takes such a pair
   (pbFits, gameTiers, the Elo picks' search), and the builder says so under its legs where it holds one */
const dkPassTd=l=>!!l&&!isGameLeg(l)&&l.stat==='passing_tds';
function dkClashWhy(a,b){
  if(!a||!b||a.gid!==b.gid) return null;
  const one=(q,o)=>!dkPassTd(q)?null:(!isGameLeg(o)&&o.stat==='any_td'&&o.team===q.team&&o.pid!==q.pid)?'td':(q.side!=='under'&&o.stat==='total'&&isGameLeg(o))?'total':null;
  return one(a,b)||one(b,a);
}
const dkClash=(a,b)=>!!dkClashWhy(a,b);
/* what a pair is, in the builder's words */
const DK_CLASH={td:'a quarterback’s passing TDs with a teammate’s touchdown',total:'a quarterback’s passing TDs over with the game total'};
/* every such pair in a list of legs, by their places in it: [i, j, kind], i before j */
function dkClashPairs(legs){ const out=[]; (legs||[]).forEach((a,i)=>legs.slice(i+1).forEach((b,k)=>{ const w=dkClashWhy(a,b); if(w) out.push([i,i+1+k,w]); })); return out; }
window.dkClashWhy=dkClashWhy; window.dkClash=dkClash; window.dkClashPairs=dkClashPairs; window.DK_CLASH=DK_CLASH;
/* a leg that can join: not a line already on it, not a second side (to win or to cover) on one
   game, and not a second leg on one player (two lines on one man, his catches and his yards, are
   nearly one bet). A game's total is a bet of its own beside its side, as a book takes them on one
   ticket (the two are unrelated, legRho); its over and under are one key, so one total a game.
   (app v121) Never a pair DraftKings will not take on one slip (dkClash) */
function pbFits(cur,c){
  if(cur.some(l=>l.key===c.key)) return false;
  if(cur.some(l=>dkClash(l,c))) return false;""", 'pbFits')

sub1('p3', """  const fits=(cur,c)=>!cur.some(l=>l.key===c.key)&&!(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM'))&&cur.filter(l=>l.pid===c.pid).length<2;""",
     """  const fits=(cur,c)=>!cur.some(l=>l.key===c.key)&&!(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM'))&&cur.filter(l=>l.pid===c.pid).length<2&&!cur.some(l=>dkClash(l,c));""",
     'gameTiers fits')

# ---------------------------------------------------------------- the Sunday slot, one game a level
sub1('p3', """function spBuild(g){
  const pool=pbPool(spGamesOf(g),SP_ALL,g.slot?SP_SLOT_SEARCH:SP_SEARCH), memo=new Map();
  const tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,g.slot?SP_SLOT_SEARCH:SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; });
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0};
}""",
     """function spBuild(g){
  if(g.slot) return spSlotBuild(g);
  const pool=pbPool([g],SP_ALL,SP_SEARCH), memo=new Map();
  const tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; });
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0,
    max:pbMaxLegs([...pool.pref,...pool.thin,...pool.mkt])};
}
/* (app v121) the Sunday slot, one game a level (the owner, 19 October 2026: "the legs need to be part of the same game
   parlay only, and anytime there's a mix it bombs the hyperlink"): each of its games' own set, built exactly as a night
   game's is (spSet on the game), and each level the best of theirs: a parlay before none; one without a game total
   before one with one; one that meets its floor before the likeliest of its size; the fewer thin legs; then the better
   expected return (chance times price) where it met a floor, else the higher chance (Safe's, and a likeliest one's); then
   the earlier game of the slot. Within one game that is the order its own search keeps (pbTierOf, pbBestReturn,
   pbLikeliest), so the slot's level is the best same-game parlay its games make by the set's own rule */
const spSlotKey=(r,floor)=>[r.mkt?1:0,floor&&r.likeliest?1:0,r.thin||0];
function spSlotBetter(a,b,floor){
  const ka=spSlotKey(a,floor), kb=spSlotKey(b,floor);
  for(let i=0;i<ka.length;i++) if(ka[i]!==kb[i]) return ka[i]<kb[i];
  const v=r=>floor&&!r.likeliest?r.corr*r.dec:r.corr; return v(a)>v(b);
}
function spSlotBuild(u){
  const per=u.games.map(x=>spSet(x.id)).filter(Boolean), sum=k=>per.reduce((a,s)=>a+(+s[k]||0),0);
  const tiers=PB_TIERS.map((t,ti)=>{ const [id,label,n,floor]=t; let best=null;
    for(const s of per){ const r=s.tiers[ti]; if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best=r; }
    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per)}; });
  return {gid:u.id,tiers,pref:sum('pref'),thin:sum('thin'),mkt:sum('mkt'),far:sum('far'),farDk:sum('farDk'),noId:sum('noId'),moved:sum('moved'),plGames:sum('plGames'),plNoId:sum('plNoId'),
    max:Math.max(0,...per.map(s=>s.max||0)),games:per.map(s=>s.gid)};
}
/* why a level of the Sunday slot is empty: none of its games makes that many legs (one game's legs a parlay), and why */
function spWhySlot(n,per){
  const m=Math.max(0,...per.map(s=>s.max||0)), noId=per.some(s=>s.noId), pl=per.some(s=>s.plGames), plNoId=per.some(s=>s.plNoId);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in any one game of the Sunday slot${noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in any one game of the Sunday slot`;
  if(!pl) return `${what}, and no player ${plNoId?'leg DraftKings’ betslip can take':'prices'} yet: the afternoon games’ are pulled on Saturday morning, and never the early games’ (before 4pm ET).`;
  return `${what}: a parlay takes one game’s legs, one leg a player, and one side and one total a game.`;
}""", 'spBuild')

sub1('p3', """  if(!r){ r={sig,...spBuild(g)}; SP_CACHE.set(sig,r); if(SP_CACHE.size>24) SP_CACHE.delete(SP_CACHE.keys().next().value); }""",
     """  if(!r){ r={sig,...spBuild(g)}; SP_CACHE.set(sig,r); if(SP_CACHE.size>48) SP_CACHE.delete(SP_CACHE.keys().next().value); }""",
     'SP_CACHE size (the slot keeps each of its games\' sets beside its own)')

sub1('p3', """  let r=null; try{ r=window.eloUnit(spGamesOf(u).map(g=>g.id),{where:u.slot?'in the Sunday slot':'in this game',...(o||{})})||null; }catch(e){ console.error(e); return null; }""",
     """  let r=null; try{ r=window.eloUnit(spGamesOf(u).map(g=>g.id),{where:u.slot?'in the Sunday slot':'in this game',perGame:!!u.slot,...(o||{})})||null; }catch(e){ console.error(e); return null; }""",
     'spEloSet perGame')

sub1('p3', """  const t=PB_TIERS.find(s=>s[0]===id); if(!t) return null;
  const pool=pbPool(spGamesOf(g),SP_ALL,g.slot?SP_SLOT_SEARCH:SP_SEARCH), r=pbTier(t,pool,new Map(),g.slot?SP_SLOT_SEARCH:SP_SEARCH);""",
     """  const t=PB_TIERS.find(s=>s[0]===id); if(!t) return null;
  /* (app v121) the Sunday slot's level is the best of its games' own, built the same way */
  if(g.slot) return spSlotBuild(g).tiers.find(x=>x.id===t[0])||null;
  const pool=pbPool(spGamesOf(g),SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH);""", 'spRebuild')

# ---------------------------------------------------------------- a slot card names its game
sub1('p3', """   way, its first games begun); o.noun: what its buttons call it (an Elo pick's, app v118: 'Elo pick'; else 'parlay') */
function pbTierCard(t,o){""",
     """   way, its first games begun); o.noun: what its buttons call it (an Elo pick's, app v118: 'Elo pick'; else 'parlay');
   o.game (app v121, the Sunday slot's cards): the game its legs are of, under its title */
function pbTierGame(gid){ const g=(S.sched||[]).find(x=>x.id===gid); if(!g) return '';
  const k=kickoff(g); return `<span class="pb-tgame" data-pb-tgame="${esc(gid)}">${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}${k?' · '+esc(spEt(k.getTime(),true)):''}</span>`; }
function pbTierCard(t,o){""", 'pbTierCard doc')
sub1('p3', """    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.rule||(t.floor!=null?`<span class="pb-rule">${pbRuleOf(t)}</span>`:'')}</div>""",
     """    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.game&&t.legs.length?pbTierGame(t.legs[0].gid):''}${o.rule||(t.floor!=null?`<span class="pb-rule">${pbRuleOf(t)}</span>`:'')}</div>""",
     'pbTierCard game')
sub1('p3', """${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,quiet:true,mktWhy:""",
     """${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,quiet:true,game:!!g.slot,mktWhy:""",
     'slot model cards name the game')
sub1('p3', """kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,noun:'Elo pick',quiet:true,...ro})).join('')}</div>`""",
     """kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,noun:'Elo pick',quiet:true,game:!!g.slot,...ro})).join('')}</div>`""",
     'slot Elo cards name the game')
sub1('p1', """.pb-rule{font-size:11px;color:var(--muted);flex-basis:100%}""",
     """.pb-rule{font-size:11px;color:var(--muted);flex-basis:100%}
.pb-tgame{font-size:12px;font-weight:600;color:var(--muted);flex-basis:100%}""", 'pb-tgame css')

# ---------------------------------------------------------------- the builder says what DraftKings refuses
sub1('p3', """  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">These legs are in different weeks (${wks.join(', ')}). A parlay has to settle together, so a sportsbook won't take this as one ticket.</p>`;""",
     """  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">These legs are in different weeks (${wks.join(', ')}). A parlay has to settle together, so a sportsbook won't take this as one ticket.</p>`;
  /* (app v121) a pair DraftKings will not take on one slip (dkClash), and a same-game parlay mixed with legs of other
     games, whose one betslip link DraftKings does not open: the parlay card gives each game its own (where it is on the
     page). One leg a game is a plain parlay, which opens as one link */
  { const cp=dkClashPairs(legs), nm=l=>`${esc(l.name)}, ${esc(l.label)}`;
    if(cp.length) html+=`<p class="delta down" style="margin:10px 0 0" data-pb-clash="${cp.length}">DraftKings may refuse ${cp.length===1?'this pair':'these pairs'} on one slip: ${cp.map(([i,j,k])=>`${nm(legs[i])}, with ${nm(legs[j])} (${DK_CLASH[k]})`).join('; ')}.</p>`;
    const byG={}; for(const l of legs) byG[l.gid]=(byG[l.gid]||0)+1;
    const nG=Object.keys(byG).length;
    if(nG>1&&Object.values(byG).some(c=>c>1)&&window.PARLAY_CARD) html+=`<p class="muted" style="margin:10px 0 0;font-size:12px" data-pb-multigame="${nG}">These legs mix a same-game parlay with other games. DraftKings’ betslip link does not open that mix, so the parlay card gives each of the ${nG} games a link of its own.</p>`; }""",
     'builder notes')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v121, suggested parlays one game each, with no pair DraftKings refuses')
