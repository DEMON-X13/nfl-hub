r"""app v80 (with patch_who_plays.py): the season and its clock from one place, an end to the
season, and where each game's lines came from.

Kickoff times are US Eastern and the page turned them into instants with a literal,
`g.d>='2026-11-01'?'-05:00':'-04:00'`. Right for 2026; but a string compare against that date
puts every 2027 game, September included, on standard time, so a pick would lock an hour late
all next autumn if only SEASON were bumped. The offset is now worked out for each game's own
year: daylight time from the second Sunday of March to the first Sunday of November.

The season is SEASON in part2.js and nothing else: weekly.py, payload.py and mktbuild.py read it
from that line (build/season.py), the payload carries it, the audit checks the two agree, and
the page's links to this season's nflverse files are written from it at boot.

After week 18 the page sat on week 18 with nothing to say. Once every regular-season game is
final it now says the season is over and that this model covers the regular season only:
playoff games are neither projected nor priced (weekly.py stops pulling prices then too).

The Props tab's lines were DraftKings' from the last pull, whatever its age, while the Pick'ems
board shows nflverse's, which moves every day: Thursday's +1.5 for the Browns against the
board's 2.5 on Saturday. weekly.py now keeps DraftKings' line only while it is under a day old
(the moneyline, spread and total together) and nflverse's otherwise, and puts the source and the
time of the pull on each game (ls, lat); the game page and the Game bets card say which. When the
depth charts could not be downloaded the last ones are carried forward, and the game page now
says how old they are.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all
of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
BS = chr(92)   # the parts write non-ASCII as JS escapes; ~uXXXX here stands for one


def sub1(k, old, new=''):
    old, new = old.replace('~u', BS + 'u'), new.replace('~u', BS + 'u')
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"""function kickoff(g){
  if(!g.d) return null;
  const t=g.t||'13:00';
  /* schedule times are US Eastern; clocks go back on the first Sunday of November */
  const off=(g.d>='2026-11-01')?'-05:00':'-04:00';
  const dt=new Date(`${g.d}T${t}:00${off}`);
  return isNaN(dt)?null:dt;
}""", r"""/* schedule times are US Eastern: daylight time from the second Sunday of March to the first
   Sunday of November (the change is at 2am, when no game is played), for the date's own year */
function easternOffset(d){
  const y=+String(d).slice(0,4), m=+String(d).slice(5,7), day=+String(d).slice(8,10);
  const sunday=(mon,nth)=>{ const first=new Date(Date.UTC(y,mon-1,1)).getUTCDay(); return 1+(7-first)%7+7*(nth-1); };
  const dst=(m>3&&m<11)||(m===3&&day>=sunday(3,2))||(m===11&&day<sunday(11,1));
  return dst?'-04:00':'-05:00';
}
function kickoff(g){
  if(!g.d) return null;
  const t=g.t||'13:00';
  const dt=new Date(`${g.d}T${t}:00${easternOffset(g.d)}`);
  return isNaN(dt)?null:dt;
}""")

sub1('p2', r"""function weekOpen(w){ return w<=liveWeek(); }""", r"""function weekOpen(w){ return w<=liveWeek(); }
/* every regular-season game final: the model covers the regular season, and says so */
function seasonOver(){ return !!(S&&S.sched&&S.sched.length)&&S.sched.every(g=>gameFinal(g)); }
/* where a game's lines came from: DraftKings' pull while it is under a day old, nflverse's
   posted line (the Pick'ems board's) after that. null for a payload that does not say. */
function lineSource(g){
  if(!g||!g.ls) return null;
  if(g.ls==='dk'){ const t=g.lat?new Date(g.lat):null;
    return 'DraftKings'+(t&&isFinite(t)?', pulled '+t.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):''); }
  return "nflverse's posted line, as on the Pick'ems board";
}""")

# the season over
sub1('p3', r"""  const todo=gs.filter(g=>!gameFinal(g)), done=gs.filter(g=>gameFinal(g));
  const rows=todo.map(card).join('')+(done.length?`<div class="slatesep">Completed</div>`+done.map(card).join(''):'');""",
     r"""  const todo=gs.filter(g=>!gameFinal(g)), done=gs.filter(g=>gameFinal(g));
  const over=seasonOver()?`<div class="card" style="border-left:4px solid var(--gold);margin-bottom:12px"><b>The ${SEASON} regular season is over.</b> <span class="muted">This model covers the regular season only: playoff games are not projected or priced, and no prices are pulled until next season. Every week stays here to look back on.</span></div>`:'';
  const rows=over+todo.map(card).join('')+(done.length?`<div class="slatesep">Completed</div>`+done.map(card).join(''):'');""")

# where the lines came from, and how old the depth charts are
sub1('p3', r"""  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;""",
     r"""  if(meta&&!locked) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px">Book lines for this week are ${meta.src}, as of ${meta.asof}. Lines move; check the number before you bet.</p>`;
  { const dd=PAY.depth_dt?Date.parse(PAY.depth_dt+'T12:00:00Z'):NaN, bk=PAY.baked_at?Date.parse(PAY.baked_at):NaN;
    if(!locked&&isFinite(dd)&&isFinite(bk)&&bk-dd>3*864e5) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px;color:#8A5E05">Depth charts as of ${esc(PAY.depth_dt)}: the latest ones could not be downloaded, so who starts may be out of date.</p>`; }""")
sub1('p3', r"""favoured by ${Math.abs(modelMargin(g)).toFixed(1)} on our numbers`}""",
     r"""favoured by ${Math.abs(modelMargin(g)).toFixed(1)} on our numbers`}${lineSource(g)?` ~u00b7 lines: ${esc(lineSource(g))}`:''}""")
sub1('p3', r"""    ${rows}${!gameBet(g,g.h,'ats')?""", r"""    ${lineSource(g)?`<p class="muted" style="margin:0 0 8px;font-size:12px">Lines: ${esc(lineSource(g))}.</p>`:''}${rows}${!gameBet(g,g.h,'ats')?""")

# this season's files, from the one constant
sub1('p3', r"""      else log(`${f.name}: no 2026 regular-season rows found.`,'warn'); }""",
     r"""      else log(`${f.name}: no ${SEASON} regular-season rows found.`,'warn'); }""")
sub1('p3', r"""boot().then(()=>document.dispatchEvent(new Event('app-ready')));""", r"""/* the links to this season's nflverse files, from SEASON rather than a year written into them */
for(const [id,file] of [['statsLink',`stats_player/stats_player_week_${SEASON}.csv`],['rosLink',`rosters/roster_${SEASON}.csv`],
  ['injLink',`injuries/injuries_${SEASON}.csv`],['dcLink',`depth_charts/depth_charts_${SEASON}.csv`]]){
  const a=$(id); if(a) a.href='https://github.com/nflverse/nflverse-data/releases/download/'+file; }
boot().then(()=>document.dispatchEvent(new Event('app-ready')));""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: kickoff offset by rule, the season from SEASON, season over, line source, depth age')
