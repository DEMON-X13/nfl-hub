"""app v100: what the review of v98 and v99 found on the page, put right.

App v98 led every suggestion with the book's fair chance and v99 added a record of the suggestions.
A review of both found four things on the page to put right; the rest it found was in the props job's
record script (suggest_ledger.js) and in the gates, changed beside this patch.

A game page's suggested hands still said "High pays at least +100 and lands at least 35% of the time",
while each hand now leads with a fair chance that is often well under that (a High hand reading 24%
fair, the model's 40% beside it): the floors are on the model's chance, as the panel's own rules
already say ("by the model"), and the paragraph now says so too.

The builder's confidence tile beside its summary still rated the model's chance with nothing saying
so: the London Safe pair read 38.8% fair with the model's 56.5% beside it, and the tile said Med. It
now rates the fair chance where the parlay has one, the model's where it has none, and says which.

The fair chance's label on a panel level ("FAIR CHANCE, EST.") was held to one line at 10px capitals
and ran a few pixels past its box on a wide screen just over the 1100px break, where four levels sit
side by side in narrow columns; the label and the model's figure under it now wrap inside the box.

The suggestions record at the panel's foot counted a parlay once for every wave that showed it: an
entry is the whole week's panel, so a Safe pair on 1pm games, unchanged since Thursday, was frozen into
the Thursday, London and 1pm entries and read as three wins. A level parlay (its legs, in any order) of
a season's week now counts once, from the last frozen entry that holds it, as the job's own summary
does; and the record's note says that a leg drops out only for a player who did not play, a player who
played with no stat line being graded on zero, as the job now grades him.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert "app v100 " not in T['p2'], 'patch_honest_review.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v99 \u00b7 2026-10-12';", r"const APP_BUILD='app v100 \u00b7 2026-10-12';")

# ---- a game page's hands: the floors are the model's chance ----
sub1('p3', "High pays at least +100 and lands at least 35% of the time, Medium +250 and 20%, Low +500 and 10%.",
     "High pays at least +100 and lands at least 35% of the time by the model's chance, Medium +250 and 20%, Low +500 and 10%.")

# ---- the builder's confidence tile: on the fair chance where there is one, and saying which ----
sub1('p3', """      <div class="box tier ${confTier(pr.corr)[0]}"><b>${confTier(pr.corr)[1]}</b><span>confidence all ${legs.length} land</span></div>""",
     """      ${(()=>{ const on=fair&&fair.p!=null, cp=on?fair.p:pr.corr, [c,l]=confTier(cp);
        return `<div class="box tier ${c}" data-conf="${cp}"><b>${l}</b><span>confidence all ${legs.length} land, on the ${on?'fair':'model\\u2019s'} chance</span></div>`; })()}""")

# ---- the fair chance's label wraps inside its box ----
sub1('p1', """.pb-nums small{display:block;font-size:11px;font-weight:600;color:var(--ink-2);white-space:nowrap;margin-top:1px}""",
     """.pb-nums small{display:block;font-size:11px;font-weight:600;color:var(--ink-2);white-space:nowrap;margin-top:1px}
.pb-nums .pb-chance span,.pb-nums .pb-chance small{white-space:normal;overflow-wrap:anywhere}""")

# ---- the record: one parlay, one count ----
sub1('p3', """   sums of the chances the panel showed; a parlay a push shortened counts on its full chance), and the
   units on $1 a parlay. */""",
     """   sums of the chances the panel showed; a parlay a push shortened counts on its full chance), and the
   units on $1 a parlay. A parlay counts once: an entry is the whole week's panel, so a level parlay
   unchanged across waves is frozen into each of them; the same legs (in any order) of the same level in
   a season's week (the entry's key, season|week|kickoff) are counted from the last entry that holds
   them, as the job's summary counts them. */""")
sub1('p3', """function pbRecSum(L){
  const out=PB_TIERS.map(([id,label])=>({id,label,graded:0,won:0,push:0,fair:0,fairN:0,model:0,units:0}));
  let pending=0, entries=0;
  for(const e of Object.values((L&&L.entries)||{})){ if(!e||!Array.isArray(e.tiers)) continue; entries++;
    for(const t of e.tiers){ const g=e.grade&&e.grade[t&&t.id], s=out.find(x=>t&&x.id===t.id); if(!g||!s||!Array.isArray(t.legs)) continue;
      if(g.result==='pending'){ pending++; continue; }
      if(g.result==='push'){ s.push++; continue; }
      if(g.result!=='won'&&g.result!=='lost') continue;
      s.graded++; if(g.result==='won') s.won++;
      s.model+=isFinite(+t.p)?+t.p:0; if(t.fair!=null&&isFinite(+t.fair)){ s.fair+=+t.fair; s.fairN++; }
      s.units+=(g.result==='won'&&isFinite(+g.payout)?+g.payout:0)-1; } }
  return {tiers:out,pending,entries};
}""",
     """function pbRecSum(L){
  const out=PB_TIERS.map(([id,label])=>({id,label,graded:0,won:0,push:0,fair:0,fairN:0,model:0,units:0}));
  let pending=0, entries=0; const E=(L&&L.entries)||{}, last=new Map();
  const lid=l=>l?[l.gid,l.pid,l.stat,l.side,l.k,l.main?1:0].join('|'):'';
  /* each level parlay of a season's week once, from the last frozen entry that holds it */
  for(const k of Object.keys(E).sort()){ const e=E[k]; if(!e||!Array.isArray(e.tiers)) continue; entries++;
    for(const t of e.tiers){ const g=e.grade&&e.grade[t&&t.id]; if(!g||!out.some(x=>t&&x.id===t.id)||!Array.isArray(t.legs)) continue;
      last.set([k.split('|').slice(0,2).join('|'),t.id,t.legs.map(lid).sort().join('+')].join('#'),{t,g}); } }
  for(const {t,g} of last.values()){ const s=out.find(x=>x.id===t.id);
    if(g.result==='pending'){ pending++; continue; }
    if(g.result==='push'){ s.push++; continue; }
    if(g.result!=='won'&&g.result!=='lost') continue;
    s.graded++; if(g.result==='won') s.won++;
    s.model+=isFinite(+t.p)?+t.p:0; if(t.fair!=null&&isFinite(+t.fair)){ s.fair+=+t.fair; s.fairN++; }
    s.units+=(g.result==='won'&&isFinite(+g.payout)?+g.payout:0)-1; }
  return {tiers:out,pending,entries};
}""")
sub1('p3', """    <p class="muted">It starts on 12 October 2026, Monday night’s Bills at Rams the first: each entry is this panel on its default choices (All, every game still to come, ${pbAmt(STAKE_DEFAULT)}) as the job last saw it before a wave of kickoffs, frozen at kickoff and graded as a book settles it (a push or a void leg drops out). Expected""",
     """    <p class="muted">It starts on 12 October 2026, Monday night’s Bills at Rams the first: each entry is this panel on its default choices (All, every game still to come, ${pbAmt(STAKE_DEFAULT)}) as the job last saw it before a wave of kickoffs, frozen at kickoff and graded as a book settles it (a push drops out, and so does a player who did not play; one who played with no stat line is graded on zero). A parlay the panel kept across waves counts once. Expected""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patch_honest_review.py: app v100 written')
