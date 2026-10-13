"""app v78: two players with the same last name and first initial on one team no longer share a box score.

The live box score is read from ESPN by name, and the match was last name plus first initial
("robinson|b"), which survives "A.J." against "AJ" and a dropped "Jr.". Atlanta carries two:
Bijan Robinson and Brian Robinson. Both matched, the later row in each group overwrote the
earlier, and the touchdowns of both were added together, so on Monday night a Bijan leg showed
Brian's rushing yards. espnStats() now matches on the whole name first, cleaned the same way,
and falls back to last name plus initial only when no one on that team carries the whole name.

The audit feeds espnStats a box score with both Robinsons and checks each gets his own line.

It also stops depending on the hour it runs. It exercises games that have not kicked off, and
between a week's last kickoff and its final reaching the data (Monday night) there are none:
openUpcoming() and the Game bets check found nothing and the audit threw, which fails the props
job for any run in that window. When no game in an open week is still to start, the page's
Date.now is set back to an hour before the current week's last kickoff, and the app redrawn.

Every edit is made in memory and asserted to match exactly once; nothing is written unless
all of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v77 \\u00b7 2026-10-05';", "const APP_BUILD='app v78 \\u00b7 2026-10-06';")
sub1('p2', """function espnStats(sum,team,who){
  const want=nameKey(who), tm=espnAb(team), out={}; let seen=false;
  for(const b of ((sum&&sum.boxscore&&sum.boxscore.players)||[])){
    if(espnAb(b.team&&b.team.abbreviation)!==tm) continue;
    for(const grp of (b.statistics||[])){
      const labels=(grp.labels||[]).map(x=>String(x).toUpperCase());
      for(const a of (grp.athletes||[])){
        const nm=(a.athlete&&(a.athlete.displayName||a.athlete.shortName))||'';
        if(nameKey(nm)!==want) continue;""", """function espnStats(sum,team,who){
  const tm=espnAb(team), out={}; let seen=false;
  const sides=((sum&&sum.boxscore&&sum.boxscore.players)||[]).filter(b=>espnAb(b.team&&b.team.abbreviation)===tm);
  const nmOf=a=>(a.athlete&&(a.athlete.displayName||a.athlete.shortName))||'';
  /* the whole name first: two on one team can share a last name and an initial (Bijan and
     Brian Robinson), and matching on that alone hands one of them the other's numbers. Last
     name plus initial only when nobody on the team carries the whole name. */
  const full=normName(who);
  const whole=sides.some(b=>(b.statistics||[]).some(g=>(g.athletes||[]).some(a=>normName(nmOf(a))===full)));
  const want=whole?full:nameKey(who), keyOf=whole?normName:nameKey;
  for(const b of sides){
    for(const grp of (b.statistics||[])){
      const labels=(grp.labels||[]).map(x=>String(x).toUpperCase());
      for(const a of (grp.athletes||[])){
        const nm=nmOf(a);
        if(keyOf(nm)!==want) continue;""")

sub1('audit', """  const PAY=F('PAY');
""", """  const PAY=F('PAY');
  /* the checks open games that have not kicked off; between the week's last kickoff and its
     final reaching the data (a Monday night) there are none, so the page's clock goes back to
     an hour before that kickoff rather than the audit depending on the hour it runs */
  if(!S.sched.some(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w))){
    const wk=F('currentWeek')(), ks=S.sched.filter(x=>+x.w===wk).map(x=>F('kickoff')(x)).filter(Boolean).map(k=>k.getTime());
    if(ks.length){ const off=Math.max(...ks)-3600e3-Date.now(), now0=w.Date.now.bind(w.Date); w.Date.now=()=>now0()+off; F('renderAll')();
      console.log(`clock: no game left to start, set back ${(-off/3600e3).toFixed(1)}h to before week ${wk}'s last kickoff`); } }
""")
sub1('audit', """  console.log(`G. state flow: ingest ok, week stays on""", """  /* ---- G6. two on one team with the same last name and initial each keep their own box score ---- */
  { const es=F('espnStats');
    const sum={boxscore:{players:[{team:{abbreviation:'ATL'},statistics:[
      {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],athletes:[
        {athlete:{displayName:'Bijan Robinson'},stats:['24','131','5.5','1','40']},
        {athlete:{displayName:'Brian Robinson Jr.'},stats:['6','22','3.7','0','9']}]}]}]}};
    const bij=es(sum,'ATL','Bijan Robinson'), bri=es(sum,'ATL','Brian Robinson');
    chk(bij&&bij.rushing_yards===131&&bij.carries===24&&bij.tds===1,'Bijan Robinson was handed someone else\\'s rushing line: '+JSON.stringify(bij));
    chk(bri&&bri.rushing_yards===22&&bri.tds===0,'Brian Robinson was handed someone else\\'s rushing line: '+JSON.stringify(bri));
    const aj=es({boxscore:{players:[{team:{abbreviation:'LAC'},statistics:[{name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],athletes:[{athlete:{displayName:'A.J. Brown'},stats:['5','70','14','0','30','8']}]}]}]}},'LAC','AJ Brown');
    chk(aj&&aj.receptions===5,'the initials fallback no longer matches "A.J." to "AJ"');
    console.log(`G6. box-score names: Bijan ${bij&&bij.rushing_yards} and Brian ${bri&&bri.rushing_yards} rushing yards kept apart, A.J./AJ still matched`); }

  console.log(`G. state flow: ingest ok, week stays on""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('app v78: box-score names matched in full first, so Bijan and Brian Robinson keep their own lines')
