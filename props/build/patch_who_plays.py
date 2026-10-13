r"""app v80: the page decides who is playing from the roster, the whole injury report and the chart.

An audit of the hub found the Props tab doing what the Season Tracker did with Baker Mayfield.
De'Von Achane and Jadarian Price, both on injured reserve, were projected as starters (9 carries
for Achane on Miami's page), and 26 more players on a reserve list or released sat under the
backups, because the payload carried no roster status and the only code that read one ran from an
upload button nobody presses. Caleb Williams, out in weeks 3 and 4 and not practising in week 5,
was Chicago's quarterback in a suggested parlay; nothing on the page ever said Questionable. When
Mayfield was ruled out the game page said "Not shown: Baker Mayfield (QB1, not enough games
played)" and showed no quarterback at all, because his backup had two games and the cut wants
three. A practice-squad back with no snaps and no chart place started for Atlanta. A player's last
stat row set his team, so three players released or moved sat on their old clubs. And the prices
were matched by name before the replay created this season's rookies, so 536 real DraftKings
prices were dropped on every load.

What the page does now, all from the payload on every load (nothing here is saved with S):

* The roster's status (PAY.roster, written by weekly.py from nflverse's roster file). A player on a
  reserve list, released, retired or on no roster is ruled out for the season; a practice-squad
  player is a starter only when his team's chart has him or he played in one of the two weeks
  before, and a backup otherwise; and every player is put on the team the roster says, after the
  replay, so a trade moves him the day it is filed rather than the day he first plays.
* The whole injury report. Out and Doubtful are ruled out, as before. Questionable is shown, a Q
  beside the name, and left out of every suggested parlay (SUGGEST_QUESTIONABLE); Questionable
  with no practice is treated as out. A player who was out in his team's last game and has no
  game status yet is "status pending" and treated as out until a status clears him: when his
  team has filed nothing this week, or he did not practise. Did not practise, with no status yet,
  is shown and kept out of the suggestions; limited practice is shown. A team whose report has a
  game status on it has filed its final report, so a player it lists with none is cleared.
* Past weeks are replayed each on its own report (the payload carries every earlier week's Outs),
  before today's roster is applied: the record grades the page a reader saw that week, and
  Achane's three games stay graded.
* A ruled-out player is never "not enough games played": the reason is "ruled out" with what the
  report says. The charted player he leaves the slot to is shown as the starter however few games
  he has (marked thin history); if the page cannot show him either, the note names him.
* Prices are applied after the replay, by the player id weekly.py put on each row.
* The builder marks a leg whose player is out, pending, questionable or not practising, and says a
  book voids a leg on a player who does not play.
* A saved leg on a player who did not play settles void once his game's stats are in (it read
  pending for ever), and a parlay with a void or pushed leg pays on the rest at their own prices.

The audit's new section V checks each of these against the raw roster and injury files the job
downloads (see audit.js).

Every edit is made in memory and asserted to match exactly once; nothing is written unless all
of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


BS = chr(92)   # the parts write non-ASCII as JS escapes; ~uXXXX here stands for one


def sub1(k, old, new=''):
    old, new = old.replace('~u', BS + 'u'), new.replace('~u', BS + 'u')
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


# ---------------------------------------------------------------- part2: state, roster, settling
sub1('p2', r"const APP_BUILD='app v79 ~u00b7 2026-10-08';", r"const APP_BUILD='app v80 ~u00b7 2026-10-09';")

sub1('p2', "let S=null, saveTimer=null;\n", r"""let S=null, saveTimer=null;
/* who can play, from the payload on every load and never saved with S: the roster's status for
   each player (ACT; DEV the practice squad; RES a reserve list; CUT released ...) and this week's
   injury report beyond the ruled out (Questionable, not practising, limited) */
let RSTAT={}, INJ={};
""")

sub1('p2', r"""/* the players who will actually be on the field enough to matter.
   the depth chart decides the order when we have it, usage when we don't. */
function rosterFor(g,showAll){
  const byTeam={};
  for(const [team,opp] of [[g.a,g.h],[g.h,g.a]]){""", r"""/* why a charted player is not on the page. Every reason a player is out starts "ruled out", so a
   reader is never told an injured starter merely lacks games */
const SEASON_WHY={RES:'on a reserve list',CUT:'released',RET:'retired',EXE:'exempt list',TRD:'traded',TRT:'traded',NONE:'on no roster'};
function inactiveWhy(r){
  if(!r||typeof r!=='object') return 'ruled out';
  if(r.week==='season') return 'ruled out ('+(SEASON_WHY[r.status]||'not on the active roster')+')';
  const inj=r.inj?', '+String(r.inj).toLowerCase():'';
  if(r.status==='Out') return 'ruled out'+inj;
  if(r.status==='Doubtful') return 'ruled out (doubtful'+inj+')';
  if(r.status==='Pending') return 'ruled out until his status is filed (out last game, '+(r.why||'no word yet')+')';
  return 'ruled out ('+String(r.status||'').toLowerCase()+inj+')';
}
/* a practice-squad player plays only when he is elevated: he is a starter when his team's chart
   has him or he played in one of the two weeks before this game, and a backup otherwise */
function devOk(x,w){
  if(RSTAT[x.pl.id]!=='DEV'||x.rank!=null) return true;
  return [w-1,w-2].some(k=>!!actualFor(k,x.pl.id));
}
/* the players who will actually be on the field enough to matter.
   the depth chart decides the order when we have it, usage when we don't. */
function rosterFor(g,showAll){
  const byTeam={};
  const D=(S.depth&&Object.keys(S.depth).length)?S.depth:PAY.depth;
  for(const [team,opp] of [[g.a,g.h],[g.h,g.a]]){""")

sub1('p2', r"""    }).filter(x=>x.use>0);
    const out=[];
    for(const grp of ['QB','RB','WR','TE','K']){""", r"""    }).filter(x=>x.use>0);
    /* where this team's ruled-out players stand on the chart */
    const outAt={}; for(const id in (D||{})){ const d=D[id]; if(d[0]===team&&S.inactive[id]) (outAt[d[1]]??=[]).push(d[2]); }
    const out=[];
    for(const grp of ['QB','RB','WR','TE','K']){""")

sub1('p2', r"""      let place=0; for(const x of pool) x.eff=x.rank!=null?++place:null;
      const cut=pool.filter(x=>x.gp>=3&&(x.eff!=null?x.eff<=DEPTH[grp]:x.use>=USE_FLOOR[grp]))
                    .slice(0,DEPTH[grp]);""", r"""      let place=0; for(const x of pool) x.eff=x.rank!=null?++place:null;
      /* a charted player moved up because someone above him is ruled out starts now, however few
         games he has: the page shows him, marked thin history, rather than nobody at all */
      for(const x of pool) x.up=x.rank!=null&&(outAt[grp]||[]).some(r=>r<x.rank);
      const cut=pool.filter(x=>(x.gp>=3||x.up)&&devOk(x,+g.w)&&(x.eff!=null?x.eff<=DEPTH[grp]:x.use>=USE_FLOOR[grp]))
                    .slice(0,DEPTH[grp]);""")

sub1('p2', r"""    const gaps=[];
    const D=(S.depth&&Object.keys(S.depth).length)?S.depth:PAY.depth;
    for(const id in D){
      const [t,pos,rank,nm]=D[id];
      if(t!==team||shown.has(id)) continue;
      const lead={QB:1,RB:2,WR:3,TE:1,K:1}[pos];
      if(lead&&rank<=lead) gaps.push({name:nm,slot:pos+rank,
        why:S.players[id]?'not enough games played':'no NFL history'});
    }""", r"""    const gaps=[];
    for(const id in (D||{})){
      const [t,pos,rank,nm]=D[id];
      if(t!==team||shown.has(id)) continue;
      const lead={QB:1,RB:2,WR:3,TE:1,K:1}[pos];
      if(!lead||rank>lead||gaps.some(x=>x.id===id)) continue;
      const off=S.inactive[id];
      gaps.push({id,name:nm,slot:pos+rank,out:!!off,
        why:off?inactiveWhy(off):(S.players[id]?'not enough games played':'no NFL history')});
      /* and the man who steps in, when the page cannot show him either */
      if(off){ const next=Object.keys(D).filter(j=>D[j][0]===team&&D[j][1]===pos&&D[j][2]>rank&&!S.inactive[j]).sort((a,b)=>D[a][2]-D[b][2])[0];
        if(next&&!shown.has(next)&&!gaps.some(x=>x.id===next)) gaps.push({id:next,name:D[next][3],slot:pos+D[next][2],out:false,
          why:'steps in for him; '+(S.players[next]?'not enough games played to project':'no NFL history to project')}); }
    }""")

sub1('p2', r"""  const a=actualFor(l.week,l.pid); if(!a) return null;
  const v=a[l.stat]; if(v==null) return null;""", r"""  const a=actualFor(l.week,l.pid);
  /* no stat line once his game's stats are in: he did not play, and a book voids the leg */
  if(!a) return (l.gid&&S.processedGames&&S.processedGames[l.gid])?'void':null;
  const v=a[l.stat]; if(v==null) return null;""")

sub1('p2', r"""  if(res.some(r=>r==='loss')) return {status:'lost',legs:res};
  if(res.every(r=>r==='push')) return {status:'void',legs:res};
  return {status:'won',legs:res};
}""", r"""  if(res.some(r=>r==='loss')) return {status:'lost',legs:res};
  if(res.every(r=>r==='push'||r==='void')) return {status:'void',legs:res};
  return {status:'won',legs:res};
}
/* what a settled parlay returns: a void or pushed leg comes out and the rest pay at their own
   prices, the way a book settles it, so the locked payout is divided by that leg's price */
function settledReturn(p,s){
  s=s||settleParlay(p);
  if(s.status==='lost') return 0;
  if(s.status==='void') return p.stake;
  if(s.status!=='won') return null;
  let pay=p.payout;
  s.legs.forEach((r,i)=>{ if(r==='void'||r==='push'){ const d=mlToDec(p.legs[i]&&p.legs[i].price); if(d) pay/=d; } });
  return Math.max(p.stake,pay);
}""")

# ---------------------------------------------------------------- part3: the report, the roster, the order
sub1('p3', r"""function ingestInjuries(rows){
  const w=currentWeek(); let out=0;
  /* last week's Out is not this week's: drop every weekly record from another week.
     'season' records (IR, PUP, suspended) are not weekly and stay until the roster clears them. */
  for(const id of Object.keys(S.inactive)){ const r=S.inactive[id]; if(r&&r.week!=='season'&&r.week!==w) delete S.inactive[id]; }
  for(const r of rows){
    if(+r.season!==SEASON||+r.week!==w) continue;
    const id=r.gsis_id||r.player_id; if(!id) continue;
    const st=String(r.report_status||r.game_status||'').trim();
    if(st==='Out'||st==='Doubtful'){ S.inactive[id]={week:w,status:st}; out++; }
    else if(S.inactive[id]&&S.inactive[id].week===w) delete S.inactive[id];
  }
  return {out,week:w};
}""", r"""/* Questionable players stay on the page with a Q and out of every suggested parlay: about half
   of them have not played this season. true lets them into the suggestions. */
const SUGGEST_QUESTIONABLE=false;
function practiceOf(s){ s=String(s||''); return /did not/i.test(s)?'DNP':(/limited/i.test(s)?'Limited':(/full/i.test(s)?'Full':'')); }
/* the week a team played before this one, past its bye */
function prevTeamWeek(team,w){ let p=null; for(const g of S.sched) if((g.a===team||g.h===team)&&+g.w<w&&(p==null||+g.w>p)) p=+g.w; return p; }
/* one week's injury report into S.inactive (who is out) and INJ (who is listed and why).
   replay: a past week, graded on its final report, so only its game statuses count. */
function ingestInjuries(rows,week,replay){
  const w=week||currentWeek(); let out=0;
  /* the report rebuilds every weekly record: last week's Out is not this week's. 'season'
     records (a reserve list, a release) are the roster's and stay. */
  for(const id of Object.keys(S.inactive)){ const r=S.inactive[id]; if(!r||r.week!=='season') delete S.inactive[id]; }
  if(!replay) INJ={};
  const cur={}, filed={}, final={}, before={};
  for(const r of rows){
    if(+r.season!==SEASON) continue;
    const id=r.gsis_id||r.player_id; if(!id) continue;
    const wk=+r.week, st=String(r.report_status||r.game_status||'').trim(), tm=r.team||'';
    if(wk===w){ cur[id]=r; if(tm){ filed[tm]=true; if(st) final[tm]=true; } }
    else if(wk<w&&(st==='Out'||st==='Doubtful')){ const b=(before[id]??={team:tm,weeks:{},last:0}); b.weeks[wk]=st; if(wk>b.last){ b.last=wk; b.team=tm; } }
  }
  const rule=(id,status,extra)=>{ S.inactive[id]={week:w,status,...extra}; out++; };
  for(const id in cur){
    const r=cur[id], st=String(r.report_status||r.game_status||'').trim(), pr=practiceOf(r.practice_status), inj=String(r.injury||'').trim();
    if(st==='Out'||st==='Doubtful'){ rule(id,st,{inj}); continue; }
    if(replay) continue;
    if(st==='Questionable'&&pr==='DNP'){ rule(id,'Questionable, no practice',{inj}); continue; }
    if(st==='Questionable'){ INJ[id]={k:'q',t:'Q',title:'Questionable'+(inj?' ('+inj.toLowerCase()+')':'')+(pr?'; '+pr.toLowerCase()+' in practice':'')}; continue; }
    if(final[r.team]) continue;                      /* his team's final report gives him no status: cleared */
    if(pr==='DNP') INJ[id]={k:'dnp',t:'DNP',title:'Did not practise'+(inj?' ('+inj.toLowerCase()+')':'')+'; no game status yet'};
    else if(pr==='Limited') INJ[id]={k:'lim',t:'LP',title:'Limited in practice'+(inj?' ('+inj.toLowerCase()+')':'')+'; no game status yet'};
  }
  /* out in his team's last game and no status yet this week: treated as out until one clears him */
  if(!replay) for(const id in before){
    const b=before[id], tm=(cur[id]&&cur[id].team)||b.team, pw=prevTeamWeek(tm,w);
    if(pw==null||!b.weeks[pw]||S.inactive[id]) continue;
    const r=cur[id], st=r?String(r.report_status||r.game_status||'').trim():'';
    if(st||final[tm]) continue;
    if(!filed[tm]) rule(id,'Pending',{why:'no report yet this week'});
    else if(r&&practiceOf(r.practice_status)==='DNP') rule(id,'Pending',{why:'not practising',inj:String(r.injury||'').trim()});
  }
  return {out,week:w};
}
/* the roster's word on every player: status, and the team he is on today. INA is a game-day
   inactive and holds only for the week the roster row is for; the reserve lists, a release, a
   retirement and the like hold until the roster says otherwise. */
function applyRoster(R){
  RSTAT={}; let season=0, moved=0;
  for(const id of Object.keys(S.inactive)) if(S.inactive[id]&&S.inactive[id].week==='season') delete S.inactive[id];
  if(!R||typeof R!=='object') return {season,moved};
  const w=currentWeek();
  for(const id in R){ const [team,st,,wk]=R[id]; RSTAT[id]=st;
    const p=S.players[id]; if(p&&team&&p.team!==team){ p.team=team; moved++; }
    if(st==='INA'){ if(+wk===w&&!S.inactive[id]) S.inactive[id]={week:w,status:'Inactive'}; continue; }
    if(st!=='ACT'&&st!=='DEV'){ S.inactive[id]={week:'season',status:st}; season++; } }
  /* a whole-league table: a player on no roster at all is on no team's page either */
  if(Object.keys(R).length>800) for(const id in S.players) if(!R[id]){ S.inactive[id]={week:'season',status:'NONE'}; season++; }
  return {season,moved};
}
/* the tag beside a name: ruled out, pending, Q, did not practise, limited. null when there is none */
function injTag(pid){
  const r=S.inactive&&S.inactive[pid];
  if(r){ if(r.week==='season') return {k:'out',t:{RES:'IR',CUT:'CUT'}[r.status]||'OUT',title:inactiveWhy(r)};
    return {k:r.status==='Pending'?'pend':'out',t:r.status==='Pending'?'PENDING':(r.status==='Doubtful'?'D':'OUT'),title:inactiveWhy(r)}; }
  return INJ[pid]||null;
}
function injChip(pid){ const t=injTag(pid); return t?`<span class="inj inj-${t.k}" title="${esc(t.title)}">${t.t}</span>`:''; }
/* a player the suggestions can build on: not out, not pending, not Questionable (unless the
   switch above says so), not missing practice with no status yet */
function suggestable(pid){
  if(S.inactive&&S.inactive[pid]) return false;
  const t=INJ[pid]; if(!t) return true;
  return t.k==='lim'||(t.k==='q'&&SUGGEST_QUESTIONABLE);
}""")

sub1('p3', r"""  if(PAY.injuries&&PAY.injuries.length) done.inj=ingestInjuries(PAY.injuries).out;
  /* prices are reloaded whenever the build that carried them changes, and left alone
     when it has not. There is no upload path any more, so nothing the user typed is at
     stake; a week that already holds Thursday's game must still take Saturday's. */
  const pricesFrom=PAY.baked_at||PAY.build||'';
  if(S.pricesFrom!==pricesFrom){
    for(const w of Object.keys(PAY.prices||{}).sort((a,b)=>a-b)) done.prices+=ingestOdds(PAY.prices[w],+w).n;
    if(Object.keys(PAY.prices||{}).length) S.pricesFrom=pricesFrom; }
  for(const w of Object.keys(PAY.stats||{}).sort((a,b)=>a-b)){
    const r=ingestStats(PAY.stats[w]); done.stats.push(...r.done.map(g=>g.id)); }
  return done;
}""", r"""  /* the season replays week by week, each week graded on its own injury report, the one that
     stood at its kickoffs, and before today's roster: the record scores the page a reader saw
     that week, not the week rebuilt from today's news */
  const inj=PAY.injuries||[];
  RSTAT={}; INJ={};
  for(const id of Object.keys(S.inactive)) if(S.inactive[id]&&S.inactive[id].week==='season') delete S.inactive[id];
  for(const w of Object.keys(PAY.stats||{}).sort((a,b)=>a-b)){
    if(gamesIn(+w).some(g=>!S.processedGames[g.id])) ingestInjuries(inj,+w,true);
    const r=ingestStats(PAY.stats[w]); done.stats.push(...r.done.map(g=>g.id)); }
  /* then today's: this week's report, and the roster's statuses and teams */
  done.inj=ingestInjuries(inj).out;
  done.roster=applyRoster(PAY.roster);
  /* prices last, by the player id the job put on each row, so a rookie whose first stats were
     just replayed has his prices too. They are reloaded whenever the build that carried them
     changes, and left alone when it has not; a week that already holds Thursday's game must
     still take Saturday's. */
  const pricesFrom=PAY.baked_at||PAY.build||'';
  if(S.pricesFrom!==pricesFrom){
    for(const w of Object.keys(PAY.prices||{}).sort((a,b)=>a-b)) done.prices+=ingestOdds(PAY.prices[w],+w).n;
    if(Object.keys(PAY.prices||{}).length) S.pricesFrom=pricesFrom; }
  return done;
}""")

sub1('p3', r"""  const gs=gamesIn(w), gids=new Set(gs.map(g=>g.id));
  const byName={};
  for(const g of gs){ const r=rosterFor(g,true);
    for(const team in r) for(const x of r[team].players) (byName[normName(x.pl.n)]??=[]).push({gid:g.id,pid:x.pl.id}); }
  for(const gid of gids) delete S.odds[gid];
  let n=0;
  for(const row of rows){
    const ml=parseFloat(row.odds); if(!isFinite(ml)||ml===0) continue;
    const mk=marketKey(row.market); if(!mk) continue;
    const k=parseFloat(row.threshold); if(!isFinite(k)) continue;
    const cands=byName[normName(row.player)]||[];
    let hit=gids.has((row.game_id||'').trim())?cands.find(c=>c.gid===row.game_id.trim()):null;
    if(!hit&&cands.length===1) hit=cands[0];
    if(!hit) continue;""", r"""  const gs=gamesIn(w), gids=new Set(gs.map(g=>g.id));
  /* rows from a payload that names the player by id need no names; older ones are matched
     by name among the week's rosters, built only when such a row turns up */
  let byName=null;
  const names=()=>{ if(byName) return byName; byName={};
    for(const g of gs){ const r=rosterFor(g,true);
      for(const team in r) for(const x of r[team].players) (byName[normName(x.pl.n)]??=[]).push({gid:g.id,pid:x.pl.id}); }
    return byName; };
  for(const gid of gids) delete S.odds[gid];
  let n=0;
  for(const row of rows){
    const ml=parseFloat(row.odds); if(!isFinite(ml)||ml===0) continue;
    const mk=marketKey(row.market); if(!mk) continue;
    const k=parseFloat(row.threshold); if(!isFinite(k)) continue;
    const gid=(row.game_id||'').trim();
    let hit=null;
    if(row.pid&&gids.has(gid)) hit={gid,pid:row.pid};
    else { const cands=names()[normName(row.player)]||[];
      hit=gids.has(gid)?cands.find(c=>c.gid===gid):null;
      if(!hit&&cands.length===1) hit=cands[0]; }
    if(!hit) continue;""")

# the suggestions: never a player who is out, pending, Questionable or missing practice
sub1('p3', r"""    const roster=rosterFor(g,false);
    for(const team in roster) for(const x of roster[team].players){
      if(x.gp<3) continue;""", r"""    const roster=rosterFor(g,false);
    for(const team in roster) for(const x of roster[team].players){
      if(x.gp<3||!suggestable(x.pl.id)) continue;""")
sub1('p3', r"""  const roster=rosterFor(g,false);
  for(const team in roster) for(const x of roster[team].players){
    for(const l of statLines(x)){
      if(GAME_NOT_OFFERED.has(l.stat)) continue;""", r"""  const roster=rosterFor(g,false);
  for(const team in roster) for(const x of roster[team].players){
    if(!suggestable(x.pl.id)) continue;
    for(const l of statLines(x)){
      if(GAME_NOT_OFFERED.has(l.stat)) continue;""")

# the tag beside a name on a game still to be played this week, and in the builder
sub1('p3', r"""        <div class="who">${esc(x.pl.n)}<span>""", r"""        <div class="who">${esc(x.pl.n)}${(!locked&&+g.w===currentWeek())?injChip(x.pl.id):''}<span>""")
sub1('p3', r"""    html+=`<tr class="legrow"><td class="plr">${esc(l.name)}<small>""", r"""    html+=`<tr class="legrow"><td class="plr">${esc(l.name)}${l.grp==='TEAM'?'':injChip(l.pid)}<small>""")
sub1('p3', r"""  html+=`</tbody></table>`;
  if(wks.length>1)""", r"""  html+=`</tbody></table>`;
  { const out=legs.filter(l=>l.grp!=='TEAM'&&S.inactive&&S.inactive[l.pid]);
    if(out.length) html+=`<p class="delta down" style="margin:10px 0 0">${out.map(l=>esc(l.name)).join(', ')} ${out.length===1?'is':'are'} not expected to play (${out.map(l=>inactiveWhy(S.inactive[l.pid])).join('; ')}). A book voids a leg on a player who does not play and pays the rest at their own prices; take ${out.length===1?'it':'them'} off to see what the rest pay.</p>`; }
  if(wks.length>1)""")

# saved parlays: a void leg, and what a parlay with one pays
sub1('p3', r"""  const back=list.reduce((s,p,i)=>s+(settled[i].status==='won'?p.payout:(settled[i].status==='void'?p.stake:0)),0);""",
     r"""  const back=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?0:settledReturn(p,settled[i])),0);""")
sub1('p3', r"""  const net=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?0:(settled[i].status==='won'?p.payout-p.stake:(settled[i].status==='void'?0:-p.stake))),0);""",
     r"""  const net=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?0:settledReturn(p,settled[i])-p.stake),0);""")
sub1('p3', r"""    const result=s.status==='won'?`+$${profit.toFixed(2)}`:""", r"""    const result=s.status==='won'?`+$${(settledReturn(p,s)-p.stake).toFixed(2)}`:""")
sub1('p3', r"""        const mark=r==null?'<span class="res">~u25cb</span>':(r==='win'?'<span class="res win">~u2713</span>':(r==='push'?'<span class="res">P</span>':'<span class="res loss">~u2717</span>'));""",
     r"""        const mark=r==null?'<span class="res">~u25cb</span>':(r==='win'?'<span class="res win">~u2713</span>':(r==='push'?'<span class="res">P</span>':(r==='void'?'<span class="res" title="did not play: the leg is void">V</span>':'<span class="res loss">~u2717</span>')));""")

# ---------------------------------------------------------------- part1: the tag's look
sub1('p1', ".plrbtn .who .stbtn:hover{", r""".inj{display:inline-block;margin-left:6px;padding:0 5px;border-radius:4px;font-family:var(--body);font-size:10.5px;font-weight:700;letter-spacing:.03em;line-height:16px;vertical-align:2px;background:var(--gold-soft);color:#8A5E05;white-space:nowrap}
.plrbtn .who .inj{margin-left:8px;font-size:10.5px;font-weight:700;color:#8A5E05}
.inj.inj-out,.inj.inj-pend,.plrbtn .who .inj.inj-out,.plrbtn .who .inj.inj-pend{background:var(--miss-soft);color:var(--miss)}
.inj.inj-lim,.plrbtn .who .inj.inj-lim{background:#E9EEF4;color:var(--ink-2)}
.plrbtn .who .stbtn:hover{""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: app v80, who plays from the roster, the whole injury report and the chart; void legs')
