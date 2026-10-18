r"""app v115: the Top 50 lines keep a player's line DraftKings moved after its prices were pulled.

The owner, Sunday 18 October 2026: "any idea why the player props are not showing up in the top 50 anymore? :/".
On a fresh load the Parlay Builder's Top 50 held 43 player lines of 50. A Refresh odds press reads DraftKings'
current player lines from ESPN, and by Sunday morning most of them have moved since the paid pull read them on
Saturday morning; a line the read has at another number is priced there by the formula (src 'dkline', est.), and
ESPN gives no DraftKings id for a player's line, so since app v109 ("Every suggested leg on DraftKings' slip") the
list left every such line out wherever the payload carries ids. Simulated on that morning's payload with every
priced main line moved by half a point, the list went from 50 rows with 43 player lines to 40 rows with 7 (ladder
rungs the pull priced), the note saying "56 lines are left out: DraftKings had them only at another number". The
press is kept in the browser (props_press_v1) until a newer publish, so a reload did not bring them back.

So the Top 50 lines (pbTopBuild, through pbLegs' new read option) keep a player leg priced from DraftKings' line read
by Refresh odds on a tested kind (pricedLegs gives no other: a main line over or under on passing, rushing or
receiving yards, receptions or passing touchdowns, the anytime touchdown, a yards rung DraftKings lists) even where
the payload carries DraftKings' ids and the leg has none at its own number. It qualifies by every other rule as
before (the 45-97% band at or above the price's implied chance, the 3-point edge and market + form for a Value pick,
the far-off guard on its estimated fair chance, V6 in pricedLegs, each bet once, the totals last) and ranks with the
rest. Everything that builds a parlay stays slip-only, unchanged: Suggested Parlays' sets, the all-games levels
(getPbTiers, pbPool), a game page's hands (gameLegPool) and the Elo picks take only a leg with DraftKings' id at its
own line. The notes do not grow: the count of lines "left out: DraftKings had them only at another number" now counts
only what is still left out (a line with a real price whose id is at another number, a spread or total at nflverse's
number), since the lines the list keeps never reach it, and a press that moves nothing changes nothing.

Such a row is marked: its price est. (as before) and one quiet line under its game (pbTopSlip, data-pb-slip) saying
why it has no id and what DraftKings' slip does with it, read from the parlay card's own plan for the leg
(card.html's dkPlan, as the builder's rows read it: dkSlipRows). A main line the pull read at another number is
"Moved since DraftKings' prices were pulled": the card puts it on the slip by the id the pull read at the old number
(dkNear: the page's main line for him, the pull's), so the line says "the slip link has the old line, 224.5", where
the card gives no id, "add it on DraftKings by hand". Any other (a touchdown, a rung or a main line the pull had no
price for) is "No DraftKings id at this line", with what the card does the same way ("the slip link has Over 224.5
passing yards instead" for a rung it converts to his main Over). On the prop model's own page, which has no card, the
line names the cause alone.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function pbTopSlip(' not in T['p3'], 'patch_top50_moved.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v114 \\u00b7 2026-10-17';", "const APP_BUILD='app v115 \\u00b7 2026-10-18';", 'APP_BUILD')

# ---------------------------------------------------------------- pbLegs: the read option
sub1('p3', """/* the legs on the reader's picks (u, the choices: the reader's own by default): preferred (the full bar)
   and thin (at or above the book, no more), uncapped (the Top 100 lines rank them all); pbPool caps them */
function pbLegs(games,u){
  u=u||pbUi();""",
     """/* the legs on the reader's picks (u, the choices: the reader's own by default): preferred (the full bar)
   and thin (at or above the book, no more), uncapped (the Top 50 lines rank them all); pbPool caps them.
   o.read (app v115, the Top 50 lines alone): a player leg priced from DraftKings' line read by Refresh odds is
   kept with no DraftKings id at its own number (kept counts them), since a press finds most of a Sunday's lines
   moved since the Saturday pull and ESPN gives no id for a player's line; every level, set, hand and Elo pick
   is built without it, slip-only */
function pbLegs(games,u,o){
  u=u||pbUi(); const read=!!(o&&o.read);""", 'pbLegs head')
sub1('p3', """  const hasId=c=>!dkCarries(c)||!!dkIdOf(c);
  const pref=[], thin=[], plGames=new Set(), plNoId=new Set(), fm={}; let far=0, farDk=0, noId=0, noIdPl=0, moved=0, movedPl=0;
  for(const c of pricedLegs(games)){
    const id=hasId(c);""",
     """  const hasId=c=>!dkCarries(c)||!!dkIdOf(c);
  /* (app v115) with o.read, a leg from the read on a tested kind (pricedLegs gives no other) stands as one with an id */
  const readKept=c=>read&&c.src==='dkline'&&!isGameLeg(c)&&!!c.espn&&!!c.espn.tested&&!!c.espn.listed;
  const pref=[], thin=[], plGames=new Set(), plNoId=new Set(), fm={}; let far=0, farDk=0, noId=0, noIdPl=0, moved=0, movedPl=0, kept=0;
  for(const c of pricedLegs(games)){
    const id=hasId(c)||readKept(c);""", 'pbLegs readKept')
sub1('p3', """    if(!id){ const pl=!isGameLeg(c); noId++; if(pl) noIdPl++; if(dkAtAnother(c)){ moved++; if(pl) movedPl++; } continue; }
    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});""",
     """    if(!id){ const pl=!isGameLeg(c); noId++; if(pl) noIdPl++; if(dkAtAnother(c)){ moved++; if(pl) movedPl++; } continue; }
    if(!hasId(c)) kept++;
    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});""", 'pbLegs kept count')
sub1('p3', """  return {pref,thin,mkt,plGames:plGames.size,far,farDk,noId,noIdPl,moved,movedPl,plNoId:[...plNoId].filter(id=>!plGames.has(id)).length};""",
     """  return {pref,thin,mkt,plGames:plGames.size,far,farDk,noId,noIdPl,moved,movedPl,kept,plNoId:[...plNoId].filter(id=>!plGames.has(id)).length};""", 'pbLegs return')

# ---------------------------------------------------------------- the Top 50 lines
sub1('p3', """   Every leg on the reader's ticks that qualifies as a suggestion's leg does (pbLegs: a real price, or a
   tested DraftKings line read by Refresh odds on a payload baked before ids; DraftKings' id at its line
   where the payload carries ids; the 45-97% band""",
     """   Every leg on the reader's ticks that qualifies as a suggestion's leg does (pbLegs: a real price, or a
   tested DraftKings line read by Refresh odds; DraftKings' id at its line where the payload carries ids,
   except (app v115, pbLegs' read option) a player's line from the read, which has none, marked by pbTopSlip;
   the 45-97% band""", "the Top lines' comment")
sub1('p3', """  const out={games:all.length,ticked:games.length,kinds:kinds.length,rows:[],pref:0,thin:0,mkt:0,far:0,farDk:0,noId:0,noIdPl:0,moved:0,movedPl:0,plNoId:0,noPlayerPrices:false,espnRead:false};
  if(!all.length||!kinds.length||!games.length) return out;
  const r=pbLegs(games,u), fm={};""",
     """  const out={games:all.length,ticked:games.length,kinds:kinds.length,rows:[],pref:0,thin:0,mkt:0,far:0,farDk:0,noId:0,noIdPl:0,moved:0,movedPl:0,kept:0,plNoId:0,noPlayerPrices:false,espnRead:false};
  if(!all.length||!kinds.length||!games.length) return out;
  const r=pbLegs(games,u,{read:true}), fm={};""", 'pbTopBuild read')
sub1('p3', """  out.noId=r.noId||0; out.noIdPl=r.noIdPl||0; out.moved=r.moved||0; out.movedPl=r.movedPl||0; out.plNoId=r.plNoId||0;""",
     """  out.noId=r.noId||0; out.noIdPl=r.noIdPl||0; out.moved=r.moved||0; out.movedPl=r.movedPl||0; out.kept=r.kept||0; out.plNoId=r.plNoId||0;""", 'pbTopBuild kept')
sub1('p3', """const pbMoney1=v=>(v<-0.0005?'−':'+')+'$'+Math.abs(v).toFixed(2);
function pbTopRow(l,i){""",
     """const pbMoney1=v=>(v<-0.0005?'−':'+')+'$'+Math.abs(v).toFixed(2);
/* (app v115) a row whose leg is priced from DraftKings' line read by Refresh odds and has no DraftKings id at its
   own number, where the payload carries ids: one quiet line saying why and what DraftKings' slip does with it, read
   from the parlay card's own plan for the leg (dkSlipRows, as the builder's rows read it). A main line the pull read
   at another number has moved since DraftKings' prices were pulled, and the card puts on the slip the id the pull
   read at the old number; any other leg (a touchdown, a rung, a main line the pull had no price for) has no id at
   its line. Without the card (the prop model's own page) the cause alone */
function pbTopSlip(l){
  if(!l||l.src!=='dkline'||isGameLeg(l)||!dkCarries(l)||dkIdOf(l)) return '';
  const M=l.main?marketLine(l.week,l.pid,l.stat):null, moved=!!M&&isFinite(+M.line)&&+M.line!==+l.k;
  const x=(dkSlipRows([l],[{ml:l.price,src:'dkline'}])||[])[0];
  const tail=!x?'':!x.id?': add it on DraftKings by hand':moved&&x.now!=null&&+x.now===+M.line?`: the slip link has the old line, ${+x.now}`:`: the slip link has ${x.swap||'it'} instead`;
  return `<small class="pb-tslip" data-pb-slip="${moved?'moved':'none'}">${esc((moved?'Moved since DraftKings’ prices were pulled':'No DraftKings id at this line')+tail)}</small>`;
}
function pbTopRow(l,i){""", 'pbTopSlip')
sub1('p3', """    <span class="nm">${glanceName(l)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}</span>""",
     """    <span class="nm">${glanceName(l)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}${pbTopSlip(l)}</span>""", 'pbTopRow line')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v115, the Top 50 lines keep a player line DraftKings moved after its prices were pulled')
