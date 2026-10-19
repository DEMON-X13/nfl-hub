r"""app v119: the Top 30 lines take only a line DraftKings' betslip can take by its id.

The owner, 19 October 2026: "for the parlay builder, why am i still seeing No DraftKings id at this line. i dont
want to include those in the parlay builder, only ones i can add via id". Since app v115 (patch_top50_moved.py) the
Top lines kept a player's line read by Refresh odds with no DraftKings id at its own number (ESPN carries no id for a
player's line), each with a quiet line under its game, "No DraftKings id at this line" or "Moved since DraftKings'
prices were pulled". That is reversed: the list is built as every other suggestion is (pbLegs with no read option),
so wherever the payload carries DraftKings' ids, a line qualifies only with one at its own number, and a line the
press found moved is counted with the others left out for want of an id in the notes, as before app v115. The read
option, its count (kept) and the row's line (pbTopSlip) are gone. On a payload baked before ids, the read's lines
are listed as they always were. Nothing else moves: the sets, the levels, a game page's hands and the Elo picks were
slip-only already.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function pbTopSlip(' in T['p3'], 'patch_top_id_only.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v118 \\u00b7 2026-10-19';", "const APP_BUILD='app v119 \\u00b7 2026-10-19';", 'APP_BUILD')

sub1('p3', """   and thin (at or above the book, no more), uncapped (the Top 30 lines rank them all); pbPool caps them.
   o.read (app v115, the Top lines alone): a player leg priced from DraftKings' line read by Refresh odds is
   kept with no DraftKings id at its own number (kept counts them), since a press finds most of a Sunday's lines
   moved since the Saturday pull and ESPN gives no id for a player's line; every level, set, hand and Elo pick
   is built without it, slip-only */
function pbLegs(games,u,o){
  u=u||pbUi(); const read=!!(o&&o.read);""",
     """   and thin (at or above the book, no more), uncapped (the Top 30 lines rank them all); pbPool caps them.
   (app v119: the Top lines' read option of app v115, which kept a line from a Refresh odds read with no
   DraftKings id, is gone, the owner's call: only lines DraftKings' betslip can take by id) */
function pbLegs(games,u){
  u=u||pbUi();""", 'pbLegs head')
sub1('p3', """  /* (app v115) with o.read, a leg from the read on a tested kind (pricedLegs gives no other) stands as one with an id */
  const readKept=c=>read&&c.src==='dkline'&&!isGameLeg(c)&&!!c.espn&&!!c.espn.tested&&!!c.espn.listed;
  const pref=[], thin=[], plGames=new Set(), plNoId=new Set(), fm={}; let far=0, farDk=0, noId=0, noIdPl=0, moved=0, movedPl=0, kept=0;
  for(const c of pricedLegs(games)){
    const id=hasId(c)||readKept(c);""",
     """  const pref=[], thin=[], plGames=new Set(), plNoId=new Set(), fm={}; let far=0, farDk=0, noId=0, noIdPl=0, moved=0, movedPl=0;
  for(const c of pricedLegs(games)){
    const id=hasId(c);""", 'pbLegs readKept')
sub1('p3', """    if(!hasId(c)) kept++;
""", "", 'pbLegs kept count')
sub1('p3', """movedPl,kept,plNoId:[...plNoId]""", """movedPl,plNoId:[...plNoId]""", 'pbLegs return')
sub1('p3', """   tested DraftKings line read by Refresh odds; DraftKings' id at its line where the payload carries ids,
   except (app v115, pbLegs' read option) a player's line from the read, which has none, marked by pbTopSlip;
   the 45-97% band""",
     """   tested DraftKings line read by Refresh odds on a payload baked before ids; DraftKings' id at its line
   where the payload carries ids, a line from the read included (app v119: from app v115 the list kept one
   with no id); the 45-97% band""", "the Top lines' comment")
sub1('p3', """movedPl:0,kept:0,plNoId:0,noPlayerPrices""", """movedPl:0,plNoId:0,noPlayerPrices""", 'pbTopBuild out')
sub1('p3', """  const r=pbLegs(games,u,{read:true}), fm={};""", """  const r=pbLegs(games,u), fm={};""", 'pbTopBuild read')
sub1('p3', """ out.movedPl=r.movedPl||0; out.kept=r.kept||0; out.plNoId""", """ out.movedPl=r.movedPl||0; out.plNoId""", 'pbTopBuild kept')
i = T['p3'].index("/* (app v115) a row whose leg is priced from DraftKings' line read by Refresh odds")
j = T['p3'].index("function pbTopRow(l,i){")
assert T['p3'].count("function pbTopSlip(") == 1 and i < j
T['p3'] = T['p3'][:i] + T['p3'][j:]
sub1('p3', """`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}${pbTopSlip(l)}</span>""",
     """`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}</span>""", 'pbTopRow line')
assert 'pbTopSlip' not in T['p3'] and 'readKept' not in T['p3']

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v119, the Top 30 lines take only a line with a DraftKings id')
