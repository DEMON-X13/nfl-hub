"""app v136: the props tab's week and season record grades DraftKings' lines again, from week 7 on.

The owner asked on 24 October 2026 for every number on the site checked, "since we have been doing a lot of changes". An
independent recompute of the records found the first tab's two pills, Week and Season (renderRecords: the model's side
of every sportsbook main line, graded from the numbers frozen before kickoff), stopped at week 6: Week 7 read 0-0 with
Thursday's Patriots at Bears final and its stats in, and the season stood at 1302-1203. Both read their lines from
marketLine, the paid pull's main lines (PAY.mkt), and no pull has run since 20 October 2026 (app v125: every price
DraftKings' line read from ESPN). The published read is the only DraftKings main line the site has now, and weekly.py's
apply_espn drops a game's read at its kickoff, so nothing froze it.

So the props job keeps it (weekly.py's espn_close): when a game kicks off, DraftKings' main lines as the last published
read had them before kickoff go into the payload's espn_close, {v:1, weeks:{w:{gid:{at, lines:{pid:{stat:line}}}}}},
frozen there and carried run to run within the season. Here closeLine(gid, pid, stat) reads one, and gradeGame (which
freezes what the page showed before the state moves on) and trackRecord's fallback for old snapshots grade the model's
side of it where the paid pull wrote no main line for the week: the paid line first, as before, so weeks 1 to 6 are as
they were to the row. A line kept from ESPN carries no price (it is never a book price), so its row has no ml or imp:
the hidden Track Record's "against the book" table and market + form, which take priced rows alone, leave it out, and
the pills, which count hits on the model's side, count it. The audit's G3b holds it on a planted game: the kept line
frozen into the snapshot, graded on the model's side with no price, a paid line winning over it, another game's kept
line never read, and the week's pill counting it."""
import io
FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function closeLine(' not in T['p2'], 'patch_espn_close.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v135 \\u00b7 2026-10-25';", "const APP_BUILD='app v136 \\u00b7 2026-10-25';", 'APP_BUILD')

sub1('p2', """function marketLine(week,pid,stat){
  const M=PAY.mkt&&PAY.mkt[String(week)]; if(!M||!M[pid]) return null;
  return M[pid][stat]||null;
}""", """function marketLine(week,pid,stat){
  const M=PAY.mkt&&PAY.mkt[String(week)]; if(!M||!M[pid]) return null;
  return M[pid][stat]||null;
}
/* DraftKings' main line for a player and stat as the props job's last published read of ESPN had it before his game
   kicked off (PAY.espn_close, weekly.py's espn_close), or null. The record grades the model's side of it where the
   paid pull wrote no main line (from week 7 on, app v136). The number alone: never a price */
function closeLine(gid,pid,stat){
  const C=PAY.espn_close, W=C&&C.v===1&&C.weeks; if(!W||!gid) return null;
  const wk=String(+String(gid).split('_')[1]), G=W[wk]&&W[wk][gid], L=G&&G.lines&&G.lines[pid], v=L&&L[stat];
  return typeof v==='number'&&isFinite(v)&&v>0?v:null;
}""", 'closeLine')

sub1('p2', """        if(!ml&&grp){ const L=marketLine(+w,pid,stat); if(L) ml=[L.line,pOver(grp,stat,sn.mu,L.line)]; }""",
     """        if(!ml&&grp){ const L=marketLine(+w,pid,stat), c=L?null:closeLine(gid,pid,stat);
          if(L) ml=[L.line,pOver(grp,stat,sn.mu,L.line)]; else if(c!=null) ml=[c,pOver(grp,stat,sn.mu,c)]; }""", 'trackRecord: the kept line')

sub1('p3', """      const L=marketLine(w,x.pl.id,l.stat); if(L) o.ml=[L.line,+pOver(x.pl.grp,l.stat,l.mu,L.line).toFixed(4)];""",
     """      /* the paid pull's main line, else DraftKings' line as the last published read had it before kickoff (app v136) */
      const L=marketLine(w,x.pl.id,l.stat), c=L?null:closeLine(g.id,x.pl.id,l.stat);
      if(L) o.ml=[L.line,+pOver(x.pl.grp,l.stat,l.mu,L.line).toFixed(4)];
      else if(c!=null) o.ml=[c,+pOver(x.pl.grp,l.stat,l.mu,c).toFixed(4)];""", 'gradeGame: the kept line')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v136, the props tab\'s record grades DraftKings\' lines kept at kickoff')
