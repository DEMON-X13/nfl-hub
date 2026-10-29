"""The Top 30's player lines sort, wear their club, and say what a projection counts (app v139).

The owner's call of 29 October 2026: "in parlay builder, in the top player lines can you make the columns able to sort
for odds and model estimate. also can you do a little button icon for what team the players are on. also in projected,
can you add the qualifier so like recieving yards would be 17 then yards. or catches or touchdowns etc".

Three changes to the Parlay Builder's Top 30 lines, all display only (no line, chance, price or part moves):

1. A sort bar over the Player lines (`div.pb-tsort`, a group of buttons `data-pb-sort`: Rank, Price, Projected, Fair,
   Wins, Expected). A press sorts that part's rows by the column, highest first (Price by the decimal price, so the
   longest odds first); a second press on the same column turns it round, lowest first; Rank puts the list's own order
   back. A row keeps its rank number, so a sorted list still says where each line ranks. The choice is this page load's
   alone (`PB_TSORT`, outside `S`, never saved), the focus kept on the button pressed. Rank, the list's order, is the
   default, so every check of the list's order reads it as before. Rows with nothing in the column (a touchdown's
   projection) go last either way.

2. Each player line wears its club's tag before his name (`span.ttag.sl-mini.pb-tteam`, the club's own colours, as the
   Props list draws them), titled with the club's name. A game bet's row has none: its name is the team.

3. The projection says what it counts: "17 yds", "4.6 catches", "1.6 TDs" (`pbProjUnit`, by the stat; a stat with no
   unit there shows the number alone). An anytime touchdown, which showed a dash, shows the model's chance he scores,
   "42% to score" (`pbProjOf`: the pool copy's `pm`, the figure his game page heads the touchdown with), information only:
   every leg is still stated and chosen at DraftKings' fair chance (app v138). The number keeps its own `data-pb-proj`; the unit is a `span.pb-unit` inside the
   cell's figure.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v138 \\u00b7 2026-10-27';", "const APP_BUILD='app v139 \\u00b7 2026-10-29';")

# ---------------------------------------------------------------- the row: its club's tag, and the projection's unit
sub1('p3', """const pbMoney1=v=>(v<-0.0005?'−':'+')+'$'+Math.abs(v).toFixed(2);""",
"""const pbMoney1=v=>(v<-0.0005?'−':'+')+'$'+Math.abs(v).toFixed(2);
/* (app v139) what a projection counts, by its stat: "17 yds", "4.6 catches" */
const PB_PROJ_UNIT={passing_yards:'yds',rushing_yards:'yds',receiving_yards:'yds',scrim_yards:'yds',receptions:'catches',
  passing_tds:'TDs',attempts:'att',completions:'comp',passing_interceptions:'INTs',carries:'carries',targets:'targets',
  fg_made:'FGs',fg_att:'FG att',kick_pts:'pts',any_td:'to score'};
const pbProjUnit=stat=>PB_PROJ_UNIT[stat]||'';
/* (app v139) a row's projection: a player's mean on his stat, or on an anytime touchdown the model's chance he scores
   (pm, the pool copy's model chance: the figure his game page heads the touchdown with), shown as information only */
const pbProjOf=l=>isGameLeg(l)?null:l.stat==='any_td'?(l.pm!=null&&isFinite(l.pm)?+l.pm:null):(l.mu!=null&&isFinite(l.mu)?+l.mu:null);
/* (app v139) a player line's club, as the Props list draws it */
function pbTeamChip(l){
  if(isGameLeg(l)||!l.team) return '';
  const nm=esc(TEAM_NAMES[l.team]||l.team);
  return tag(esc(l.team)).replace('<span class="ttag"',`<span class="ttag sl-mini pb-tteam" title="${nm}" aria-label="${nm}"`);
}""")
sub1('p3', """    <span class="nm">${glanceName(l)}<small>${esc(l.label)}${mark}</small>""",
"""    <span class="nm">${pbTeamChip(l)}${glanceName(l)}<small>${esc(l.label)}${mark}</small>""")
sub1('p3', """<b${proj!=null?` data-pb-proj="${proj}"`:''}>${proj!=null?num(proj,proj<10?1:0):'–'}</b>""",
"""<b${proj!=null?` data-pb-proj="${proj}"`:''}>${proj!=null?(td?Math.round(proj*100)+'%':num(proj,proj<10?1:0))+(pbProjUnit(l.stat)?` <span class="pb-unit">${pbProjUnit(l.stat)}</span>`:''):'–'}</b>""")
sub1('p3', """  const mark=pbValMark(l), proj=!isGameLeg(l)&&l.mu!=null&&isFinite(l.mu)?l.mu:null;\n  return `<li class="pb-trow" data-pb-row""",
"""  const mark=pbValMark(l), td=l.stat==='any_td', proj=pbProjOf(l);\n  return `<li class="pb-trow" data-pb-row""")

# ---------------------------------------------------------------- the sort bar over the Player lines
sub1('p3', """function pbPanel(){
  const u=pbUi(), w=currentWeek(), games=pbGames(), mix=pbMix(u);""",
"""/* (app v139) the Player lines' sort, this page load's alone: a column and its way round (1 highest first, -1 lowest) */
let PB_TSORT={k:'rank',dir:1};
const PB_TSORT_COLS=[['rank','Rank',null],['price','Price',l=>l.dec],['proj','Projected',pbProjOf],
  ['fair','Fair',l=>l.fc?l.fc.p:null],['win','Wins',l=>l.win],['ev','Expected',l=>l.ev]];
function pbTsorted(L){
  const c=PB_TSORT_COLS.find(x=>x[0]===PB_TSORT.k);
  if(!c||!c[2]) return L;
  const v=c[2], d=PB_TSORT.dir;
  return [...L].sort((a,b)=>{ const x=v(a.l), y=v(b.l); if(x==null||y==null) return (x==null)-(y==null)||a.r-b.r; return d*(y-x)||a.r-b.r; });
}
function pbTsortBar(){
  return `<div class="pb-tsort" role="group" aria-label="Sort the player lines"><span class="pb-lbl">Sort</span>${PB_TSORT_COLS.map(([k,lbl])=>{ const on=PB_TSORT.k===k, ar=on&&k!=='rank'?(PB_TSORT.dir>0?' ▼':' ▲'):'';
    return `<button type="button" class="${on?'on':''}" data-pb-sort="${k}" aria-pressed="${on}"${on&&k!=='rank'?` title="${PB_TSORT.dir>0?'Highest first: press again for lowest first':'Lowest first: press again for highest first'}"`:''}>${lbl}${ar}</button>`; }).join('')}</div>`;
}
function pbPanel(){
  const u=pbUi(), w=currentWeek(), games=pbGames(), mix=pbMix(u);""")
sub1('p3', """  const part=(id,title,L,at,aria)=>L.length?secHd(id,title,L.length)+`<ol class="pb-top" data-pb-sec="${id}"${at?` start="${at+1}"`:''} aria-label="${aria}">${L.map((l,i)=>pbTopRow(l,at+i)).join('')}</ol>`:'';""",
"""  const part=(id,title,L,at,aria)=>{ if(!L.length) return ''; let R=L.map((l,i)=>({l,r:at+i}));
    if(id==='player') R=pbTsorted(R);
    return secHd(id,title,L.length)+(id==='player'&&L.length>1?pbTsortBar():'')+`<ol class="pb-top" data-pb-sec="${id}"${at?` start="${at+1}"`:''} aria-label="${aria}">${R.map(x=>pbTopRow(x.l,x.r)).join('')}</ol>`; };""")
sub1('p3', """  el.querySelectorAll('[data-pb-mix]').forEach(b=>b.addEventListener('click',()=>{""",
"""  el.querySelectorAll('[data-pb-sort]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.pbSort;
    PB_TSORT=k==='rank'?{k,dir:1}:PB_TSORT.k===k?{k,dir:-PB_TSORT.dir}:{k,dir:1};
    redraw(`[data-pb-sort="${k}"]`); }));
  el.querySelectorAll('[data-pb-mix]').forEach(b=>b.addEventListener('click',()=>{""")

# ---------------------------------------------------------------- styles
sub1('p1', """.pb-topsec{display:flex;align-items:center;gap:8px;margin:16px 0 2px;font-size:15px}""",
""".pb-topsec{display:flex;align-items:center;gap:8px;margin:16px 0 2px;font-size:15px}
.pb-tsort{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0 4px}
.pb-tsort button{background:var(--panel);color:var(--ink-2);border:1px solid var(--line-2);border-radius:999px;padding:6px 12px;min-height:44px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.pb-tsort button.on{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.pb-trow .nm .pb-tteam{margin-right:6px;vertical-align:1px}
.pb-tc .pb-unit{font-size:10.5px;font-weight:600;color:var(--ink-2);margin-left:1px}""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
