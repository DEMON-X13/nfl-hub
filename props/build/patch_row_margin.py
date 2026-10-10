r"""app v82: the slate's game row says its margin from the scores it shows.

Each game row shows the two teams' expected points rounded to whole points ("22 - 20") and,
beside them, the pick and its margin. The margin was the unrounded difference, rounded on its
own (Math.abs(ca.implied-ch.implied).toFixed(0)), so a game the row shows as 22 - 20 could read
"MIN by 3": 22.4 against 19.6 rounds to 22 and 20, while their gap of 2.8 rounds to 3. The two
scores are now rounded once, at the top of the row, and the scores, the pick and its margin are
all read from that one rounding: "22 - 20" always reads "by 2", and the side picked is the one
with the bigger number on the row. A lean that rounds to a tie ("21 - 21") reads "even", as an
exact tie always did; once such a game has a score the row adds the real result beside "even",
with no tick or cross, since there was no side to grade.

The audit checks it on every rendered row of every open week (section A2).

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


sub1('p2', r"""const APP_BUILD='app v81 ~u00b7 2026-10-09';""", r"""const APP_BUILD='app v82 ~u00b7 2026-10-09';""")

# the two scores rounded once, where the row starts
sub1('p3', r"""  const card=g=>{
    const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);""", r"""  const card=g=>{
    const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);
    /* the scores as the row shows them, rounded once: the pick and its margin are read from these,
       so "22 - 20" never reads "by 3" */
    const sa=+ca.implied.toFixed(0), sh=+ch.implied.toFixed(0);""")

sub1('p3', r"""      <div class="tot"><b>${ca.implied.toFixed(0)} ~u2013 ${ch.implied.toFixed(0)}</b>""",
     r"""      <div class="tot"><b>${sa} ~u2013 ${sh}</b>""")

sub1('p3', r"""        if(ca.implied===ch.implied&&!hasScore(g)) return '<span class="none">~u2013</span><small>even</small>';
        const pick=ca.implied>ch.implied?g.a:g.h, by=Math.abs(ca.implied-ch.implied).toFixed(0);""",
     r"""        if(sa===sh){ const even='<span class="none">~u2013</span><small>even</small>';
          if(!hasScore(g)) return even;
          return even+`<small class="act">(${g.as===g.hs?'tie':`${g.as>g.hs?g.a:g.h} by ${Math.abs(g.as-g.hs)}`})</small>`; }
        const pick=sa>sh?g.a:g.h, by=Math.abs(sa-sh);""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched', ', '.join(str(p.name) for p in FILES.values()))
