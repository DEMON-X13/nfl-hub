"""The Top 30's player lines sort by arrows on their column headings, and a touchdown projects touchdowns (app v140).

The owner's call of 29 October 2026, on app v139: "sorry this is not what i want. I want little arrows on the columns to
sort instead of those sort buttons. and instead of "50% to score" for a josh jacobs touchdown, i want like their projected
touchdowns that theyre going to have, so it can be like 0.8 or whatever."

1. The sort bar (`div.pb-tsort`, a row of pill buttons) is gone. Over the Player lines is a heading row instead
   (`div.pb-thead`, laid out on the rows' own grid): # over the ranks, Player over the names, and Price, Projected, Fair,
   Wins and Expected over their columns, each a button (`data-pb-sort`) with a small arrow: a faint up-and-down arrow on
   a column not sorted, a down arrow while it sorts highest first, an up arrow lowest first. A press on a column sorts by
   it highest first, a second press turns it round; # puts the list's own order back. The rule is app v139's
   (`PB_TSORT`, this page load's alone; rows with nothing in the column last; each row keeps its rank). So that a heading
   stands over its column on every row, the five columns are a fixed width (92px) and the Add column 76px on a wide
   screen; at 1100px and under the headings sit on one line where the rows' figures sit, # beside them and no Player
   heading, and at 640px and under in
   the same three columns.

2. An anytime touchdown's projection is the touchdowns the model expects him to score, not the chance he scores one:
   the model's chance (`pm`) read as a Poisson count, -ln(1 - p), the very reading the page prices two or more
   touchdowns on (`tdPlus` in part2.js), so a 50% chance projects 0.69 TDs and a 60% chance 0.92. Shown to two places
   with its unit, "0.69 TDs", and sorted with the rest.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v139 \\u00b7 2026-10-29';", "const APP_BUILD='app v140 \\u00b7 2026-10-29';")

# ---------------------------------------------------------------- a touchdown projects touchdowns
sub1('p3', "fg_made:'FGs',fg_att:'FG att',kick_pts:'pts',any_td:'to score'};", "fg_made:'FGs',fg_att:'FG att',kick_pts:'pts',any_td:'TDs'};")
sub1('p3', """/* (app v139) a row's projection: a player's mean on his stat, or on an anytime touchdown the model's chance he scores
   (pm, the pool copy's model chance: the figure his game page heads the touchdown with), shown as information only */
const pbProjOf=l=>isGameLeg(l)?null:l.stat==='any_td'?(l.pm!=null&&isFinite(l.pm)?+l.pm:null):(l.mu!=null&&isFinite(l.mu)?+l.mu:null);""",
"""/* (app v139) a row's projection: a player's mean on his stat. (app v140) On an anytime touchdown the touchdowns the
   model expects him to score: its chance (pm, the pool copy's model chance) read as a Poisson count, -ln(1-p), as tdPlus
   prices two or more on; information only */
const pbProjOf=l=>isGameLeg(l)?null:l.stat==='any_td'?(l.pm!=null&&isFinite(l.pm)&&l.pm>0&&l.pm<1?-Math.log(1-l.pm):null):(l.mu!=null&&isFinite(l.mu)?+l.mu:null);""")
sub1('p3', "${proj!=null?(td?Math.round(proj*100)+'%':num(proj,proj<10?1:0))", "${proj!=null?num(proj,td?2:proj<10?1:0)")

# ---------------------------------------------------------------- arrows on the column headings
sub1('p3', """function pbTsortBar(){
  return `<div class="pb-tsort" role="group" aria-label="Sort the player lines"><span class="pb-lbl">Sort</span>${PB_TSORT_COLS.map(([k,lbl])=>{ const on=PB_TSORT.k===k, ar=on&&k!=='rank'?(PB_TSORT.dir>0?' ▼':' ▲'):'';
    return `<button type="button" class="${on?'on':''}" data-pb-sort="${k}" aria-pressed="${on}"${on&&k!=='rank'?` title="${PB_TSORT.dir>0?'Highest first: press again for lowest first':'Lowest first: press again for highest first'}"`:''}>${lbl}${ar}</button>`; }).join('')}</div>`;
}""",
"""/* (app v140) the Player lines' column headings, on the rows' own grid, each column's a button with its arrow: faint both
   ways while another column sorts, down while it sorts highest first, up lowest first; # the list's own order */
function pbTsortHead(){
  const btn=(k,lbl)=>{ const on=PB_TSORT.k===k, rk=k==='rank';
    const ar=rk?'':on?(PB_TSORT.dir>0?'▼':'▲'):'⇅', way=on?(PB_TSORT.dir>0?'highest first':'lowest first'):'';
    const say=rk?'Sort by rank, the list’s own order':`Sort by ${lbl.toLowerCase()}${on?`, ${way}: press again for ${PB_TSORT.dir>0?'lowest':'highest'} first`:''}`;
    return `<button type="button" class="pb-th${on?' on':''}" data-pb-sort="${k}" aria-pressed="${on}" aria-label="${say}" title="${say}">${lbl}${ar?`<span class="pb-tharr" aria-hidden="true">${ar}</span>`:''}</button>`; };
  return `<div class="pb-thead" role="group" aria-label="Sort the player lines">${btn('rank','#')}<span class="pb-thnm">Player</span><span class="pb-thcs">${PB_TSORT_COLS.filter(([k])=>k!=='rank').map(([k,lbl])=>btn(k,lbl)).join('')}</span><span class="pb-thad" aria-hidden="true"></span></div>`;
}""")
sub1('p3', "(id==='player'&&L.length>1?pbTsortBar():'')", "(id==='player'&&L.length>1?pbTsortHead():'')")

# ---------------------------------------------------------------- styles
sub1('p1', """.pb-tsort{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0 4px}
.pb-tsort button{background:var(--panel);color:var(--ink-2);border:1px solid var(--line-2);border-radius:999px;padding:6px 12px;min-height:44px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.pb-tsort button.on{background:var(--ink);color:var(--panel);border-color:var(--ink)}
""", """.pb-thead{display:grid;grid-template-columns:26px minmax(0,1fr) auto 76px;grid-template-areas:"rk nm cs ad";align-items:end;gap:0 12px;margin-top:4px}
.pb-thead>.pb-th{grid-area:rk;justify-content:flex-end}
.pb-thnm{grid-area:nm;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding-bottom:14px}
.pb-thcs{grid-area:cs;display:grid;grid-template-columns:repeat(5,92px);gap:0 10px}
.pb-thad{grid-area:ad}
.pb-th{display:flex;align-items:center;justify-content:flex-end;gap:3px;min-height:44px;min-width:0;padding:0;background:none;border:0;font:inherit;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);cursor:pointer;white-space:nowrap}
.pb-th:hover,.pb-th.on{color:var(--ink)}
.pb-tharr{font-size:9px;letter-spacing:0;opacity:.55}
.pb-th.on .pb-tharr{opacity:1}
.pb-top[data-pb-sec="player"] .pb-trow{grid-template-columns:26px minmax(0,1fr) auto 76px}
.pb-top[data-pb-sec="player"] .pb-tcs{grid-template-columns:repeat(5,92px)}
.pb-top[data-pb-sec="player"] .pb-legadd{justify-self:end}
""")
sub1('p1', """@media(max-width:1100px){ .pb-trow{grid-template-columns:26px minmax(0,1fr) auto;grid-template-areas:"rk nm ad" ". cs cs"} .pb-tcs{justify-content:start} .pb-tc{text-align:left} }
@media(max-width:640px){ .pb-tcs{grid-template-columns:repeat(3,minmax(0,1fr));width:100%} }""",
"""@media(max-width:1100px){ .pb-trow{grid-template-columns:26px minmax(0,1fr) auto;grid-template-areas:"rk nm ad" ". cs cs"} .pb-tcs{justify-content:start} .pb-tc{text-align:left}
  .pb-thead,.pb-top[data-pb-sec="player"] .pb-trow{grid-template-columns:26px minmax(0,1fr) auto;grid-template-areas:"rk nm ad" ". cs cs"} .pb-thcs{justify-content:start} .pb-thcs .pb-th{justify-content:flex-start}
  .pb-thead{grid-template-areas:"rk cs cs";align-items:start} .pb-thnm{display:none} }
@media(max-width:640px){ .pb-tcs,.pb-top[data-pb-sec="player"] .pb-tcs,.pb-thcs{grid-template-columns:repeat(3,minmax(0,1fr));width:100%} }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
