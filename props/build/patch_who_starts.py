r"""app v104: a backup with no history can start, and a player inactive after his club's last report stays out.

Two holes in who the page starts, both found on 13 October 2026 (the owner: "nfl job failed yet again
today"; the props audit had stopped on LA's QB1-out case, a QB2 the payload did not have).

A backup with no history. The payload carried only the players with a row last season (payload.py's
table from raw/feat.pkl) and those this season's stats add, so a quarterback with no game last season
or this (Stidham at Denver, Richardson at Indianapolis and others) was not on the page at all: with the
man above him ruled out the page started nobody and named him in a gap note. payload.py now also carries every player the depth
chart lists at a position the page projects, on a roster this season, with no numbers at all (gp and
cn 0, no stat arrays): 127 on 13 October 2026, 30 of them quarterbacks, and every club's QB2 on the
page where seven (Buffalo, Dallas, Denver, Indianapolis, the Chargers, the Jets, and the Rams' one
relief appearance below) started nobody with the man above them out. freshState gives him the empty
history of a player whose first game the page has just read (the e5, e3 and career sums at zero, last
season none), so a game of his this season counts exactly as a rookie's always has (most of the 127
have one: 28 are left with none once this season's games are read). With none, he has nothing to
project from: the model on its priors alone gives such a quarterback about 13 passes and 80 yards, a
number nobody should bet on. So noHistory(pl) (no game the model counts last season and none this
season: a veteran who did not play last season, Watson or Howell, or whose few snaps fell under
payload.py's bar, Stidham's one game or Richardson's two, is one too) gives him no lines (statLines),
no headline, a gap note that says he has no games the model counts rather than that he lacks enough
(never "no games", which Stidham and Richardson had), and,
through statLines, no price, no place in a suggested parlay, a game hand or the Elo picks. He is
shown in his place, in a starter's slot on the chart or one the chart moves him up to, marked thin
history as any player under three games is, with a line saying why there is nothing to bet on; the
next man down is not shown as the starter in his stead (a rookie quarterback named the starter before
his first game left his backup's numbers on the page as the starter's).

A charted starter with one or two games holds his slot too (the review of this change): the cut kept
a player under three games only when the chart moved him up, yet counted him in the chart's order, so
a QB1 with a game or two (a rookie named the starter) was dropped and his QB2, second in that order,
was cut as well: the club showed no quarterback. Any charted player within the position's depth is
now shown, marked thin history; pricedLegs still takes nobody under three games, and a game page's
hands take one only where the chart moved him up, as before (gameLegPool), so nothing new is
suggested.

The same holds for a charted player moved up whose few games give the model no workload at all
(Stetson Bennett, LA: one relief appearance, three passes, a projection of no passes as a starter).
rosterFor dropped anyone projected to no use before it looked at the chart, so with Stafford out the
page started nobody; a charted player the chart moves up is now kept however little the model
projects, and one projected to no use is shown the same way, with no lines (nothingToProject).

A player inactive after being on his club's last report. The page held a player out before his club
files its statuses only when that report had him Out or Doubtful. Caleb Williams was Questionable
(limited) on Chicago's week 5 report and then inactive for the game; the roster marks that (nflverse
writes ACT with the code I01 on his week 6 row; a club whose rows are still the game's week writes
INA), and the page started him for week 6 from Tuesday on. The Elo build's rule (WHO PLAYS) is now
the page's too: a player the roster has inactive for his club's last game (the payload's ina, from
weekly.py) who was on that game's report, in any status, stays out until this week's report clears
him (he practises, or the club files a report he is not on), exactly as an Out does: Pending, with
"ruled out until his status is filed (inactive last game, ...)". One the report never named (a
healthy scratch, an emergency third quarterback) is not held, and nor is one whose stat line says he
played. weekly.py now keeps every earlier report row of a player the roster has inactive, so the page
can see he was on it. A player on a reserve list, the PUP list or suspended is out on the roster's
word (applyRoster) as before.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, so a second run stops at the first.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}

BS = chr(92)   # the parts write non-ASCII as JS escapes; ~uXXXX here stands for one


def sub1(k, old, new):
    old, new = old.replace('~u', BS + 'u'), new.replace('~u', BS + 'u')
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v103 ~u00b7 2026-10-13';", r"const APP_BUILD='app v104 ~u00b7 2026-10-13';")

# --- a player with no history: an empty history, no lines, shown in his place ---
sub1('p2', """    for(const s of (GRP_STATS[p.g]||[])){
      const v=p[s]||[0,0,0,0];""",
"""    for(const s of (GRP_STATS[p.g]||[])){
      /* a charted player with no history (gp and cn 0): the empty sums of a player whose first
         game has just been read, so his first game counts as a rookie's does */
      if(!p.gp&&!p.cn){ o.e5[s]=[0,0]; o.e3[s]=[0,0]; o.car[s]=[0,0]; o.py[s]=null; continue; }
      const v=p[s]||[0,0,0,0];""")
sub1('p2', """function statLines(x){
""", """/* no game last season and none this season: a charted backup the payload carries so he can start,
   with nothing to project from. He gets no lines, so nothing prices or suggests him */
function noHistory(pl){ return !!pl&&!((pl.gp||0)+(pl.base_gp||0)); }
/* a player on a game's roster the model has nothing to project for: no history, or a charted player
   moved up whose games give no workload at all (use, rosterFor's, is 0) */
function nothingToProject(x){ return noHistory(x.pl)||(x.use!=null&&!(x.use>0)); }
function statLines(x){
  if(nothingToProject(x)) return [];
""")
sub1('p2', """    const list=playersFor(team).map(pl=>{
      const d=depthOf(pl);
      return {pl,team,opp,ctx,use:usage(pl,opp,ctx),gp:pl.gp+pl.base_gp,
        rank:(d&&d.team===team&&d.pos===pl.grp)?d.rank:null};
    }).filter(x=>x.use>0);
    /* where this team's ruled-out players stand on the chart */
    const outAt={}; for(const id in (D||{})){ const d=D[id]; if(d[0]===team&&S.inactive[id]) (outAt[d[1]]??=[]).push(d[2]); }""",
"""    /* where this team's ruled-out players stand on the chart */
    const outAt={}; for(const id in (D||{})){ const d=D[id]; if(d[0]===team&&S.inactive[id]) (outAt[d[1]]??=[]).push(d[2]); }
    /* a player projected to no use is left out, unless the chart moves him up: he then starts with
       no lines (nothingToProject) rather than leave the slot to nobody */
    const list=playersFor(team).map(pl=>{
      const d=depthOf(pl);
      return {pl,team,opp,ctx,use:usage(pl,opp,ctx),gp:pl.gp+pl.base_gp,
        rank:(d&&d.team===team&&d.pos===pl.grp)?d.rank:null};
    }).filter(x=>x.use>0||(x.rank!=null&&(outAt[x.pl.grp]||[]).some(r=>r<x.rank)));""")
sub1('p2', """      /* a charted player moved up because someone above him is ruled out starts now, however few
         games he has: the page shows him, marked thin history, rather than nobody at all */
      for(const x of pool) x.up=x.rank!=null&&(outAt[grp]||[]).some(r=>r<x.rank);
      const cut=pool.filter(x=>(x.gp>=3||x.up)&&devOk(x,+g.w)&&(x.eff!=null?x.eff<=DEPTH[grp]:x.use>=USE_FLOOR[grp]))""",
"""      /* a charted player moved up because someone above him is ruled out starts now, however few
         games he has: the page shows him, marked thin history, rather than nobody at all. One the
         model has nothing to project for holds his slot on the chart the same way, shown with no
         lines (nothingToProject), so the next man down is never shown as the starter in his stead; and
         so does one with a game or two: counted in the chart's order, he would otherwise be cut with
         his backup behind him (a QB1 with one game left the club no quarterback). Under three games
         he is marked thin history; pricedLegs takes nobody under three, and the game hands only one
         the chart moved up (gameLegPool), so nothing new is suggested */
      for(const x of pool) x.up=x.rank!=null&&(outAt[grp]||[]).some(r=>r<x.rank);
      const cut=pool.filter(x=>(x.gp>=3||x.rank!=null)&&devOk(x,+g.w)&&(x.eff!=null?x.eff<=DEPTH[grp]:x.use>=USE_FLOOR[grp]))""")
sub1('p2', "        why:off?inactiveWhy(off):(S.players[id]?'not enough games played':'no NFL history')});",
     "        why:off?inactiveWhy(off):(!S.players[id]?'no NFL history':(noHistory(S.players[id])?'no games the model counts, last season or this':'not enough games played'))});")
sub1('p2', "          why:'steps in for him; '+(S.players[next]?'not enough games played to project':'no NFL history to project')}); }",
     "          why:'steps in for him; '+(!S.players[next]?'no NFL history to project':(noHistory(S.players[next])?'no games the model counts, last season or this, to project':'not enough games played to project'))}); }")
sub1('p2', "      if(!grps.includes(x.pl.grp)) continue;", "      if(!grps.includes(x.pl.grp)||nothingToProject(x)) continue;")
sub1('p2', "  if(r.status==='Pending') return 'ruled out until his status is filed (out last game, '+(r.why||'no word yet')+')';",
     "  if(r.status==='Pending') return 'ruled out until his status is filed ('+(r.was||'out')+' last game, '+(r.why||'no word yet')+')';")
sub1('p3', """    for(const x of t.players){
      const lines=statLines(x);
      if(!lines.length) continue;""",
"""    for(const x of t.players){
      const lines=statLines(x);
      /* a charted player the model has nothing to project for: shown in his place, nothing to bet on */
      if(!lines.length&&nothingToProject(x)) html+=`<div class="plrbtn" data-nohist="${x.pl.id}" style="cursor:default">
        <div class="who">${esc(x.pl.n)}${(!locked&&+g.w===currentWeek())?injChip(x.pl.id):''}<span>${depthLabel(x.pl)||x.pl.pos}${x.starter?'':' ~u00b7 backup'}${x.gp<3?' ~u00b7 thin history':''}</span></div>
        <div class="sum"><span class="muted">${noHistory(x.pl)?'No games the model counts, last season or this one, so nothing to project: no lines until he plays this season':'Too little in his games so far to project a starter~u2019s workload: no lines'}</span></div><div></div></div>`;
      if(!lines.length) continue;""")

# --- a game page's hands: a player under three games only where the chart moved him up ---
sub1('p3', """  for(const team in roster) for(const x of roster[team].players){
    if(!suggestable(x.pl.id)) continue;
    for(const l of statLines(x)){""", """  for(const team in roster) for(const x of roster[team].players){
    /* a charted starter under three games is shown (thin history), but suggested on his estimate
       only where the chart moved him up, as before app v104 */
    if(!suggestable(x.pl.id)||(x.gp<3&&!x.up)) continue;
    for(const l of statLines(x)){""")

# --- inactive after being on his club's last report: held out like an Out until cleared ---
sub1('p3', """  const cur={}, filed={}, final={}, before={};
  for(const r of rows){""",
"""  const cur={}, filed={}, final={}, before={};
  /* who the roster has inactive for his club's last game (the payload's ina): on that game's report
     in any status, he is held out below as an Out is (the Elo build's WHO PLAYS rule) */
  const INA=new Set(replay?[]:((PAY&&PAY.ina)||[]));
  for(const r of rows){""")
sub1('p3', "    else if(wk<w&&(st==='Out'||st==='Doubtful')){ const b=(before[id]??={team:tm,weeks:{},last:0}); b.weeks[wk]=st; if(wk>b.last){ b.last=wk; b.team=tm; } }",
     "    else if(wk<w&&(st==='Out'||st==='Doubtful'||INA.has(id))){ const b=(before[id]??={team:tm,weeks:{},last:0}); b.weeks[wk]=(st==='Out'||st==='Doubtful')?st:(b.weeks[wk]||'Inactive'); if(wk>b.last){ b.last=wk; b.team=tm; } }")
sub1('p3', """  /* out in his team's last game and no status yet this week: treated as out until one clears him */
  if(!replay) for(const id in before){""",
"""  /* out in his team's last game, or inactive for it after being on its report, and no status yet
     this week: treated as out until one clears him */
  if(!replay) for(const id in before){""")
sub1('p3', """    if(!filed[tm]) rule(id,'Pending',{why:'no report yet this week'});
    else if(r&&practiceOf(r.practice_status)==='DNP') rule(id,'Pending',{why:'not practising',inj:String(r.injury||'').trim()});""",
"""    const was=b.weeks[pw]==='Inactive'?'inactive':'out';
    if(!filed[tm]) rule(id,'Pending',{why:'no report yet this week',was});
    else if(r&&practiceOf(r.practice_status)==='DNP') rule(id,'Pending',{why:'not practising',was,inj:String(r.injury||'').trim()});""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: app v104, a charted backup with nothing to project starts with no lines, and a player inactive after his club\'s last report stays out until cleared')
