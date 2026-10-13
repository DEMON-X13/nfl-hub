r"""app v81: the edges of a season. Before nflverse posts a file, at a rollover, and after a
player listed Doubtful turned out to play.

Before the season's first game nflverse has no stats file for it, and until the week-1 report
is filed no injury file either. weekly.py used to call a 404 on either "expected" before the
first kickoff and then the audit refused the run for the missing file, so once SEASON was
bumped nothing published until both were posted, and the run after the opener refused for the
stats until nflverse processed the first games. The job now judges by what it has published:
a 404 on a file none of this season's data has come from yet is a file not posted yet, and
the payload says so (`not_posted`). The slate now says so too, rather than show an empty
report as a week with nobody hurt: "nflverse has not posted the 2026 injury report yet". The
stats note appears once a game is final, when their absence means ungraded games.

The files the book's prices live in are named by week alone, so at a rollover last season's
prices_wk5.csv sits where this season's week 5 goes. The job now bakes only this season's
games and moves last season's files to data/archive/; the page adds its own guard: a price row
that names a game the week does not have is dropped, never matched by name onto a game of this
week. Only a row with no game at all is matched by name.

A player out or doubtful in his team's last game is held out until this week's report clears
him. The rule counted a Doubtful who then played as "out in his last game"; a player with a
stat line in that game is no longer pending.

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


sub1('p2', r"""const APP_BUILD='app v80 ~u00b7 2026-10-09';""", r"""const APP_BUILD='app v81 ~u00b7 2026-10-09';""")

# the slate says which of this season's nflverse files are not posted yet
sub1('p3', r"""  const rows=over+todo.map(card).join('')""", r"""  const rows=over+notPostedNote()+todo.map(card).join('')""")
sub1('p3', r"""function practiceOf(s){""", r"""/* the nflverse files the job found not posted yet (PAY.not_posted): before the season, or the
   stats until the first games are processed. An empty report is then said to be missing, not
   shown as a week with nobody hurt */
function notPostedNote(){
  const np=new Set((PAY&&PAY.not_posted)||[]), say=[];
  if(np.has('injuries')) say.push(`nflverse has not posted the ${SEASON} injury report yet, so no player is marked out, doubtful or questionable.`);
  if(np.has('stats')&&S.sched.some(g=>gameFinal(g))) say.push(`nflverse has not posted this season's player stats yet, so the finished games are not graded and every projection stands on last season.`);
  return say.length?`<div class="card notposted" style="border-left:4px solid var(--gold);margin-bottom:12px">${say.map(t=>`<div class="muted">${t}</div>`).join('')}</div>`:'';
}
function practiceOf(s){""")

# a price row is matched by name only when it names no game: another week's or another
# season's game is dropped, never re-homed onto this week's game of a player with that name
sub1('p3', r"""    const gid=(row.game_id||'').trim();
    let hit=null;
    if(row.pid&&gids.has(gid)) hit={gid,pid:row.pid};
    else { const cands=names()[normName(row.player)]||[];
      hit=gids.has(gid)?cands.find(c=>c.gid===gid):null;
      if(!hit&&cands.length===1) hit=cands[0]; }""", r"""    const gid=(row.game_id||'').trim();
    if(gid&&!gids.has(gid)) continue;   /* a game this week does not have: last season's file at a rollover */
    let hit=null;
    if(row.pid&&gid) hit={gid,pid:row.pid};
    else { const cands=names()[normName(row.player)]||[];
      hit=gid?cands.find(c=>c.gid===gid):null;
      if(!hit&&!gid&&cands.length===1) hit=cands[0]; }""")

# out or doubtful last game, but he played: not pending
sub1('p3', r"""    if(pw==null||!b.weeks[pw]||S.inactive[id]) continue;""", r"""    if(pw==null||!b.weeks[pw]||S.inactive[id]) continue;
    if(actualFor(pw,id)) continue;                  /* listed, but his stat line says he played */""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched', ', '.join(str(p.name) for p in FILES.values()))
