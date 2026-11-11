"""The Top 50's Game bets sort by their column headings too (app v147).

The owner's report of 11 November 2026, with a screenshot of the Parlay Builder on Teams only: "when i select the team
only button, the ability to organize by name/amount disappears". The heading row with its sort arrows (app v140,
`pbTsortHead`) was drawn over the Player lines alone, so with only team bets ticked (Teams only, or the Moneyline, Spread
and Game total boxes) the list had no headings and no way to sort.

1. Every part of the Top 50 (the Player lines, the Game bets, and a hook's Value picks where there are any) draws the
   heading row over its own list wherever it holds two lines or more, each part sorting on its own (`PB_TSORT` is a
   sort a part, `pbTs(sec)`, this page load's alone as before; sorting the Game bets leaves the Player lines' order
   alone and the other way round). The rule is app v139's: a press on a column sorts by it highest first, a second
   press turns it round, # puts the list's own order back, rows with nothing in the column last, each row keeping its
   rank. Each heading carries its part (`data-pb-sortsec`), and the heading row its part (`data-pb-sec`, its name "Sort
   the game bets"). The Game bets' heading names its rows Bet where the Player lines' say Player, and has no Projected
   button, since a team bet has no projection (its row shows a dash): an empty slot of the same width stands in its
   place so every heading stays over its column. A Value part, which can hold both kinds, keeps every column and names
   its rows Line.

2. So that the headings stand over the Game bets' columns as over the Player lines', every row of the Top 50 takes the
   Player lines' fixed grid (five columns of 92px and the Add column 76px on a wide screen; at 1100px and under the
   figures on a line of their own, at 640px and under three columns), where until now a game bet's row took its own
   width.

Nothing about which lines are listed, their order by rank, their numbers or their parts moves.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v146 \\u00b7 2026-11-10';", "const APP_BUILD='app v147 \\u00b7 2026-11-11';")

# ---------------------------------------------------------------- a sort a part
sub1('p3', """/* (app v139) the Player lines' sort, this page load's alone: a column and its way round (1 highest first, -1 lowest) */
let PB_TSORT={k:'rank',dir:1};""",
"""/* (app v139) the Player lines' sort, this page load's alone: a column and its way round (1 highest first, -1 lowest).
   (app v147) one a part of the list (player, game, value), each sorting on its own */
let PB_TSORT={};
const pbTs=sec=>PB_TSORT[sec]||(PB_TSORT[sec]={k:'rank',dir:1});""")
sub1('p3', """function pbTsorted(L){
  const c=PB_TSORT_COLS.find(x=>x[0]===PB_TSORT.k);
  if(!c||!c[2]) return L;
  const v=c[2], d=PB_TSORT.dir;""",
"""function pbTsorted(L,sec){
  const s=pbTs(sec), c=PB_TSORT_COLS.find(x=>x[0]===s.k);
  if(!c||!c[2]) return L;
  const v=c[2], d=s.dir;""")
sub1('p3', """function pbTsortHead(){
  const btn=(k,lbl)=>{ const on=PB_TSORT.k===k, rk=k==='rank';
    const ar=rk?'':on?(PB_TSORT.dir>0?'▼':'▲'):'⇅', way=on?(PB_TSORT.dir>0?'highest first':'lowest first'):'';
    const say=rk?'Sort by rank, the list’s own order':`Sort by ${lbl.toLowerCase()}${on?`, ${way}: press again for ${PB_TSORT.dir>0?'lowest':'highest'} first`:''}`;
    return `<button type="button" class="pb-th${on?' on':''}" data-pb-sort="${k}" aria-pressed="${on}" aria-label="${say}" title="${say}">${lbl}${ar?`<span class="pb-tharr" aria-hidden="true">${ar}</span>`:''}</button>`; };
  return `<div class="pb-thead" role="group" aria-label="Sort the player lines">${btn('rank','#')}<span class="pb-thnm">Player</span><span class="pb-thcs">${PB_TSORT_COLS.filter(([k])=>k!=='rank').map(([k,lbl])=>btn(k,lbl)).join('')}</span><span class="pb-thad" aria-hidden="true"></span></div>`;
}""",
"""function pbTsortHead(sec){
  /* (app v147) a part's own headings: the Game bets' name their rows Bet and have no Projected (a team bet has none),
     an empty slot of its width keeping every heading over its column */
  const s=pbTs(sec), gm=sec==='game';
  const btn=(k,lbl)=>{ if(gm&&k==='proj') return `<span class="pb-th pb-thx" aria-hidden="true"></span>`;
    const on=s.k===k, rk=k==='rank';
    const ar=rk?'':on?(s.dir>0?'▼':'▲'):'⇅', way=on?(s.dir>0?'highest first':'lowest first'):'';
    const say=rk?'Sort by rank, the list’s own order':`Sort by ${lbl.toLowerCase()}${on?`, ${way}: press again for ${s.dir>0?'lowest':'highest'} first`:''}`;
    return `<button type="button" class="pb-th${on?' on':''}" data-pb-sort="${k}" data-pb-sortsec="${sec}" aria-pressed="${on}" aria-label="${say}" title="${say}">${lbl}${ar?`<span class="pb-tharr" aria-hidden="true">${ar}</span>`:''}</button>`; };
  const what={player:'player lines',game:'game bets',value:'Value picks'}[sec]||'lines', nm=gm?'Bet':sec==='player'?'Player':'Line';
  return `<div class="pb-thead" data-pb-sec="${sec}" role="group" aria-label="Sort the ${what}">${btn('rank','#')}<span class="pb-thnm">${nm}</span><span class="pb-thcs">${PB_TSORT_COLS.filter(([k])=>k!=='rank').map(([k,lbl])=>btn(k,lbl)).join('')}</span><span class="pb-thad" aria-hidden="true"></span></div>`;
}""")
sub1('p3', """    if(id==='player') R=pbTsorted(R);
    return secHd(id,title,L.length)+(id==='player'&&L.length>1?pbTsortHead():'')+""",
"""    R=pbTsorted(R,id);
    return secHd(id,title,L.length)+(L.length>1?pbTsortHead(id):'')+""")
sub1('p3', """  el.querySelectorAll('[data-pb-sort]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.pbSort;
    PB_TSORT=k==='rank'?{k,dir:1}:PB_TSORT.k===k?{k,dir:-PB_TSORT.dir}:{k,dir:1};
    redraw(`[data-pb-sort="${k}"]`); }));""",
"""  el.querySelectorAll('[data-pb-sort]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.pbSort, sec=b.dataset.pbSortsec||'player', s=pbTs(sec);
    PB_TSORT[sec]=k==='rank'?{k,dir:1}:s.k===k?{k,dir:-s.dir}:{k,dir:1};
    redraw(`[data-pb-sortsec="${sec}"][data-pb-sort="${k}"]`); }));""")

# ---------------------------------------------------------------- every row of the Top 50 on the headings' grid
sub1('p1', """.pb-th.on .pb-tharr{opacity:1}
.pb-top[data-pb-sec="player"] .pb-trow{grid-template-columns:26px minmax(0,1fr) auto 76px}
.pb-top[data-pb-sec="player"] .pb-tcs{grid-template-columns:repeat(5,92px)}
.pb-top[data-pb-sec="player"] .pb-legadd{justify-self:end}""",
""".pb-th.on .pb-tharr{opacity:1}
.pb-thx{cursor:default}
.pb-top .pb-trow{grid-template-columns:26px minmax(0,1fr) auto 76px}
.pb-top .pb-tcs{grid-template-columns:repeat(5,92px)}
.pb-top .pb-legadd{justify-self:end}""")
sub1('p1', """  .pb-thead,.pb-top[data-pb-sec="player"] .pb-trow{grid-template-columns:26px minmax(0,1fr) auto;grid-template-areas:"rk nm ad" ". cs cs"}""",
"""  .pb-thead,.pb-top .pb-trow{grid-template-columns:26px minmax(0,1fr) auto;grid-template-areas:"rk nm ad" ". cs cs"}""")
sub1('p1', """@media(max-width:640px){ .pb-tcs,.pb-top[data-pb-sec="player"] .pb-tcs,.pb-thcs{grid-template-columns:repeat(3,minmax(0,1fr));width:100%} }""",
"""@media(max-width:640px){ .pb-tcs,.pb-top .pb-tcs,.pb-thcs{grid-template-columns:repeat(3,minmax(0,1fr));width:100%} }""")


for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
