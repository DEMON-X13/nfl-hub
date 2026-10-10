"""A player released from a practice squad leaves the Props tab's backups.

nflverse's roster file keeps one row per player at the week of his latest roster entry. A player
the club released stops getting new rows, so his last one stays behind at an older week, still
marked ACT or DEV, as if he were on the club. With "Include backups" ticked, the Props tab listed
three such players (released practice-squad receivers and backs) as Raiders and Patriots backups,
with projections. The Elo build already reads the file this way.

applyRoster now takes the roster table's latest week. A row older than that, for a club that has
rows in that week, is a player on no roster, and he is taken off the board like one ("NONE"). A
club with no rows in the latest week is on its bye and keeps its rows as they are, so a bye week
never empties a club. The audit's reality check V1 now also fails a listed player, backups
included, whose raw roster row is older than the file's latest week while his club has rows in it.
app v83.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
P2 = HERE / 'part2.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(J, """  const w=currentWeek();
  for(const id in R){ const [team,st,,wk]=R[id]; RSTAT[id]=st;""",
     """  const w=currentWeek();
  /* the file keeps a released player's last row at an older week, still ACT or DEV: a row older
     than the latest week, for a club that has rows in it (a club on its bye has none), is a
     player on no roster */
  let LW=0; for(const id in R) LW=Math.max(LW,+R[id][3]||0);
  const filed=new Set(); for(const id in R) if(+R[id][3]===LW) filed.add(R[id][0]);
  for(const id in R){ const [team,st,,wk]=R[id]; RSTAT[id]=st;
    if((st==='ACT'||st==='DEV')&&LW&&+wk<LW&&filed.has(team)){ RSTAT[id]='NONE'; S.inactive[id]={week:'season',status:'NONE'}; season++; continue; }""")

sub1(P2, "const APP_BUILD='app v82 \\u00b7 2026-10-09';", "const APP_BUILD='app v83 \\u00b7 2026-10-10';")

sub1(A, """      { let listed=0; const bad=[], dev=[];
        for(const g of openG){ const r=F('rosterFor')(g,true);
          for(const t in r) for(const x of r[t].players){ listed++; const s=rstat(x.pl.id);
            if(s&&s.st!=='ACT'&&s.st!=='DEV'&&!(s.st==='INA'&&s.wk!==cw)) bad.push(`${g.id} ${x.pl.n} ${s.st}`);""",
    """      { let listed=0; const bad=[], dev=[];
        /* the raw file's latest week, and the clubs with rows in it: a row left behind at an older
           week by a club that has moved on is a released player */
        const LW=Math.max(0,...(rRoster||[]).map(r=>+r.week||0)), filed=new Set((rRoster||[]).filter(r=>+r.week===LW).map(r=>r.team));
        const stale=pid=>{ const r=rawRo[pid]; return !!r&&(r.status==='ACT'||r.status==='DEV')&&+r.week<LW&&filed.has(r.team); };
        for(const g of openG){ const r=F('rosterFor')(g,true);
          for(const t in r) for(const x of r[t].players){ listed++; const s=rstat(x.pl.id);
            if(s&&s.st!=='ACT'&&s.st!=='DEV'&&!(s.st==='INA'&&s.wk!==cw)) bad.push(`${g.id} ${x.pl.n} ${s.st}`);
            if(stale(x.pl.id)) bad.push(`${g.id} ${x.pl.n} released (roster row from week ${rawRo[x.pl.id].week})`);""")
print('ok')
