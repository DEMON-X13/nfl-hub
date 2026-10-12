"""app v102: a quarterback's anytime touchdown, his own run or catch, is a leg like a back's.

The owner asked why there was no rushing touchdown for a quarterback. DraftKings prices one (its
anytime touchdown scorer, which for a quarterback is a touchdown he runs or catches in himself; a
touchdown pass he throws does not count), oddsfetch.py already pulled and paid for those prices, and
the payload placed them on the players; but MARKETS gave Anytime TD to backs, receivers and tight ends
only and GRP_STATS.QB had no any_td, so the page threw them away. Now it offers it: Anytime TD is open
to QB, any_td is the last of the quarterback's stats (so his game page shows it after his rushing
yards, with its "two or more" row priced by tdPlus as everyone's is), and it is projected, settled,
tracked, priced against the book and correlated as every other touchdown is. Settling needed nothing:
the stats' any_td, the live box score's and the suggestions record's have always counted rushing and
receiving touchdowns only, never a pass.

The numbers come from props/research/qb_td.py (its docstring has the method and every result), merged
into data/ by its --write, which adds only the quarterback's entries and asserts nothing else moved:
model.QB.any_td, a logistic regression on featVec's 15 numbers fitted on 2019-2024 as fit4.py fitted the
backs', receivers' and tight ends' (rows with two or more earlier games, an L2 penalty of 3; that method
gives their shipped coefficients back to within 0.018), on the rows the page serves: each club's starter
judged before the game (most pass attempts over his recent games), since the page offers the leg to the
depth chart's QB1 alone, and a fit on every row (backups' relief and kneel-downs in, which score 1-5%)
read the starters about 1.5 points low; prior.QB.any_td 0.1405, the 2019-2024 QB rate over every row,
which is only the shrinkage target of his career and last-season rates, as every group's prior is;
tdrate.QB, 606 rushing touchdowns on 12,899 carries (0.0470 a carry), so the cap every touchdown takes
(expected touches at the league's rate, x1.5) holds for a quarterback too, on his projected carries.
The rule set before 2025 was looked at: ship it if, as the page runs it (capped), it beats the league's
rate on 2025, held out, on log loss and Brier; applied unchanged to the starters, it does: 0.4018 and
0.1223 against the starter rate's 0.4307 and 0.1307, saying 15.4% where they scored 15.5% (the
player's own shrunk career rate, 0.4035 and 0.1217, about level), and the same in every season of a
2021-2025 walk-forward on the starters (said 15.5% over the five, scored 15.6%). The cap is the
league's rate, so it holds a quarterback who scores his own goal-line runs under what he does (Josh
Allen, said about 60%, capped to 40-43%); a per-player rate would be a change of its own, tested
walk-forward. Nothing was chosen on 2026.

Correlations: TOTAL_RHO gains 'QB:any_td' 0.09, measured as its other entries were (the starters'
misses against the total's, 2019-2024; the method gives all 17 back to within 0.014), and corr.json its
12 QB:any_td pairs of 0.03 or more (with his carries 0.23 and rushing yards 0.18, his passing touchdowns
-0.08: a touchdown he runs in is one he does not throw).

The wording: a quarterback's leg says what it is, "Scores a rushing or receiving TD (not a TD pass)"
(two or more: "Scores 2+ rushing or receiving TDs (not TD passes)"), in the builder, on the parlay card,
in its Share text and on the panel; his game page heads the block "Rushing or receiving TD" with "his
own run or catch; a TD pass does not count" beside it, and a played game's tile reads "Rush or rec TD".
A back's, receiver's or tight end's leg reads as before (tdLabel). A quarterback's Show stats gains his
rushing touchdowns.

Market + form (the Elo tab's second price) moves the book's chance by the player's rating, and a
quarterback's rating is a passer's: nothing measured says it moves his own touchdowns (they run a
little against his passing ones). formAgrees now hands the leg's stat to window.eloAltP, which gives a
quarterback's touchdown no second price, so the panel never prefers one on market + form; it can still
fill a level as a thin edge where the model rates it at or above the book.

MODEL_BUILD moves to 2026.2, since a new market is a model change: a browser's saved season is rebuilt
once with the quarterbacks' touchdown state, saying the model changed. Until the props job rebakes the
payload with the new entries, the page finds no model.QB.any_td and offers no quarterback touchdown.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'function tdLabel(' not in T['p2'], 'patch_qb_td.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v101 \u00b7 2026-10-12';", r"const APP_BUILD='app v102 \u00b7 2026-10-12';")
sub1('p2', "const MODEL_BUILD='2026.1 fit 2019-2025';", "const MODEL_BUILD='2026.2 fit 2019-2025';")

# ---- the market and the quarterback's stats ----
sub1('p2', " {k:'any_td',short:'touchdown',lbl:'Anytime TD',grps:['RB','WR','TE'],prob:true,",
     " {k:'any_td',short:'touchdown',lbl:'Anytime TD',grps:['QB','RB','WR','TE'],prob:true,")
sub1('p2', "const GRP_STATS={QB:['attempts','completions','passing_yards','passing_tds','passing_interceptions','carries','rushing_yards'],",
     "const GRP_STATS={QB:['attempts','completions','passing_yards','passing_tds','passing_interceptions','carries','rushing_yards','any_td'],")

# ---- the total moves with a quarterback's own touchdown a little ----
sub1('p2', """   raw/feat.pkl and games.csv. Passing touchdowns and yards ride with the total; a kicker's field
   goals a little against it. Below 0.03 is left out as nothing. */
const TOTAL_RHO={'QB:attempts':0.10,'QB:completions':0.16,'QB:passing_yards':0.29,'QB:passing_tds':0.44,'QB:rushing_yards':0.05,""",
     """   raw/feat.pkl and games.csv. Passing touchdowns and yards ride with the total; a kicker's field
   goals a little against it. Below 0.03 is left out as nothing. A quarterback's own touchdown (a run
   or a catch) was measured the same way in October 2026 (props/research/qb_td.py, which gives every
   entry here back to within 0.014). */
const TOTAL_RHO={'QB:attempts':0.10,'QB:completions':0.16,'QB:passing_yards':0.29,'QB:passing_tds':0.44,'QB:rushing_yards':0.05,'QB:any_td':0.09,""")

# ---- the wording, one place ----
sub1('p2', """function isGameLeg(l){ return l&&(l.stat==='ml'||l.stat==='ats'||l.stat==='total'); }""",
     """/* a touchdown leg's wording. A quarterback's anytime touchdown is one he scores himself, on a run or
   a catch, as DraftKings settles it: a touchdown pass he throws does not count, so his leg says so */
function tdLabel(grp,k){
  const kk=k>=2?k:1;
  if(grp==='QB') return kk>=2?`Scores ${kk}+ rushing or receiving TDs (not TD passes)`:'Scores a rushing or receiving TD (not a TD pass)';
  return kk>=2?`Scores ${kk}+ touchdowns`:'Scores a touchdown';
}
function isGameLeg(l){ return l&&(l.stat==='ml'||l.stat==='ats'||l.stat==='total'); }""")

sub1('p3', """  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=kk>=2?`Scores ${kk}+ touchdowns`:'Scores a touchdown'; price=bookPrice(p); k=kk; }""",
     """  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=tdLabel(pl.grp,kk); price=bookPrice(p); k=kk; }""")
sub1('p3', """          if(od!=null) out.push({...base,key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:od,mu:null,label:'Scores a touchdown'});""",
     """          if(od!=null) out.push({...base,key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:od,mu:null,label:tdLabel(x.pl.grp,1)});""")
sub1('p3', """        if(!have.has(key+'@1over')) out.push({...base,stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:bookPrice(l.p),mu:null,label:'Scores a touchdown'});""",
     """        if(!have.has(key+'@1over')) out.push({...base,stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:bookPrice(l.p),mu:null,label:tdLabel(x.pl.grp,1)});""")

# ---- the game page: the block's heading, its boxes, a played game's tile ----
sub1('p3', """            html+=`<div class="tile"><span class="tl">Touchdown</span>""",
     """            html+=`<div class="tile"><span class="tl">${x.pl.grp==='QB'?'Rush or rec TD':'Touchdown'}</span>""")
sub1('p3', """          const tf=tod!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:tod,src:'real',week:g.w}):null;
          html+=`<div class="statblk"><h4>Touchdown</h4>""",
     """          const tf=tod!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:tod,src:'real',week:g.w}):null;
          const qb=x.pl.grp==='QB', what=qb?'a rushing or receiving touchdown':'a touchdown', whats=qb?'two or more rushing or receiving touchdowns':'two or more touchdowns';
          html+=`<div class="statblk"><h4>${qb?'Rushing or receiving TD <em data-qbtd>his own run or catch; a TD pass does not count</em>':'Touchdown'}</h4>""")
sub1('p3', """aria-label="Add ${esc(x.pl.n)} to score a touchdown"></td>""", """aria-label="Add ${esc(x.pl.n)} to score ${what}"></td>""")
sub1('p3', """aria-label="Add ${esc(x.pl.n)} to score two or more touchdowns"></td>""", """aria-label="Add ${esc(x.pl.n)} to score ${whats}"></td>""")

# ---- Show stats: a quarterback's own rushing touchdowns ----
sub1('p3', """['INT','passing_interceptions'],['Rush yds','rushing_yards']],""",
     """['INT','passing_interceptions'],['Rush yds','rushing_yards'],['Rush TD','rushing_tds']],""")

# ---- market + form: the leg's stat goes with it, so a quarterback's touchdown gets no second price ----
sub1('p3', """  const a=window.eloAltP(c.pid,c.side,c.price,c.src);
  return a!=null&&a-mlProb(c.price)>=0.03;""",
     """  const a=window.eloAltP(c.pid,c.side,c.price,c.src,c.stat);   /* none on a quarterback's touchdown: his rating is a passer's */
  return a!=null&&a-mlProb(c.price)>=0.03;""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patch_qb_td: app v102 written to part2.js and part3.js')
