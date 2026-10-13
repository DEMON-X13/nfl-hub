"""app v76: the Props tab lists the games still to play first and the finished ones last.

The owner had to scroll past every final to reach the evening's games. The game list on the
Props tab now shows the week's games that have not finished, live ones included, in kickoff
order at the top, then a "Completed" heading and the finals under it, also in kickoff order.
Nothing about a card changes; only where it sits. The Pick'ems board, which is the Bets and
Stats page's own section, does the same in nflbets/build/tab_pickems.html.

The audit renders week 1, whose games are all final, and the current week, and checks the
invariant on both: no unfinished game below a final, and the heading present exactly when a
final is, right above the first one.

Every edit is made in memory and asserted to match exactly once; nothing is written unless
all of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v75 \\u00b7 2026-10-03';", "const APP_BUILD='app v76 \\u00b7 2026-10-05';")

sub1('p3', """  const rows=gs.map(g=>{
    const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);""", """  const card=g=>{
    const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);""")
sub1('p3', """      <div class="chev">\\u203a</div></button>`;
  }).join('');
  $('gamesList').innerHTML=rows||""", """      <div class="chev">\\u203a</div></button>`;
  };
  /* the games still to play, live ones too, first in kickoff order; the finals under a heading */
  const todo=gs.filter(g=>!gameFinal(g)), done=gs.filter(g=>gameFinal(g));
  const rows=todo.map(card).join('')+(done.length?`<div class="slatesep">Completed</div>`+done.map(card).join(''):'');
  $('gamesList').innerHTML=rows||""")

sub1('p1', """.game.final .pill.ok{background:#E1EBF7;color:#1E3D66}""", """.game.final .pill.ok{background:#E1EBF7;color:#1E3D66}
.slatesep{font-family:var(--display);font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:22px 4px 10px;padding-top:12px;border-top:1px solid var(--line)}""")

sub1('audit', """  console.log(`G. state flow: ingest ok, week stays on ${F('currentWeek')()} (schedule-driven), re-upload skipped, legs preserved, backup round-trips`);""", """  console.log(`G. state flow: ingest ok, week stays on ${F('currentWeek')()} (schedule-driven), re-upload skipped, legs preserved, backup round-trips`);

  /* ---- G4. the list puts the games still to play first and the finals under a heading ---- */
  { const ws=d.getElementById('weekSel'), keep=ws.value, seen=[];
    for(const wk of ['1',String(F('currentWeek')())]){
      if(![...ws.options].some(o=>o.value===wk)) continue;
      ws.value=wk; F('renderSlate')();
      const kids=[...d.getElementById('gamesList').children].filter(n=>n.matches('.game,.slatesep'));
      const firstFinal=kids.findIndex(n=>n.matches('.game.final')), seps=kids.filter(n=>n.matches('.slatesep'));
      const lastTodo=kids.map(n=>n.matches('.game:not(.final)')).lastIndexOf(true);
      chk(firstFinal<0||lastTodo<firstFinal,`week ${wk}: a game still to play sits below a final`);
      chk(firstFinal<0?seps.length===0:(seps.length===1&&kids[firstFinal-1]===seps[0]),`week ${wk}: the Completed heading is missing, doubled or not right above the first final`);
      seen.push(`week ${wk} ${kids.filter(n=>n.matches('.game:not(.final)')).length} to play, ${kids.filter(n=>n.matches('.game.final')).length} final`); }
    ws.value=keep; F('renderSlate')();
    console.log(`G4. slate order: ${seen.join('; ')}`); }""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('app v76: games still to play first, the finals under a Completed heading')
