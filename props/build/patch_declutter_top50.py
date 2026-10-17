r"""app v113: Suggested Parlays without the long paragraphs, the Top 50 lines, and only the bets DraftKings offers.

The owner, 17 October 2026: "in suggest parlays, get rid of all the long paragraph description stuff. we
dont need to clutter the page.", "in parlay builder only do top 50 now instead of 100.", and "there are
certain bets in the props that are not part of draft kings like for FG attempts. i only want to show legs
that draft kings does."

Suggested Parlays keeps what a visitor acts on and drops what explains it. Gone: the lead paragraph under
the heading, the foot under the sets, the record's sentence under its pills (each pill's title still gives
the expected wins and pushes), and, on a set's level cards, the lines saying why a leg is not a Value pick
or why the game's total is there (pbTierCard's o.quiet; the Value tag says it; the retired all-games
panel, drawn nowhere, keeps them). The lock lines are one short line each ("Locks Sun 6:20 PM ET, 2
hours before kickoff."; "Locked since Sun 6:20 PM ET."; the page's own set and the record still loading
said in a few words), and a level built again for a player ruled out after the lock says so in one line
("Updated: Bo Nix ruled out (Sun 5:30 PM ET); this level was built again.", "... in this browser" where
the page made it). Kept: the record's pills, the wait line, the empty level's reason, the est. line
(a price that is an estimate is money), Refresh odds and its status line.

The Parlay Builder lists the Top 50 lines (PB_TOP_N 50, the heading and every word that gave the count).

FG attempts are not a DraftKings market. The page knows which markets DraftKings posts from its own
reader of DraftKings' player lines on ESPN (ESPN_MAIN, ESPN_MILE and the anytime touchdown: passing yards,
completions, attempts, passing touchdowns, interceptions, carries, rushing yards, receptions, receiving
yards, rush + rec yards, kicking points, field goals made), and of the stats it offers as bets only FG
attempts is not among them (targets was never offered: NO_BET). So FG attempts joins targets in NO_BET:
still projected, since it carries a kicker's field goals made and kicking points, and never drawn as a
line on a game's page or offered to the builder, a set, a hand, the Top 50 or the Elo picks; an FG
attempts leg a visitor's builder kept from before leaves it with a line saying why, and toggleLeg never
adds one.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'const PB_TOP_N=50;' not in T['p3'], 'patch_declutter_top50.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v112 \\u00b7 2026-10-17';", "const APP_BUILD='app v113 \\u00b7 2026-10-17';", 'APP_BUILD')
sub1('p2', """/* projected but not offered as a bet: targets still drives usage ranking and receptions */
const NO_BET=new Set(['targets']);""",
     """/* projected but not offered as a bet: targets still drives usage ranking and receptions, and FG attempts a
   kicker's field goals made and kicking points; DraftKings posts neither (app v113: the owner's "i only want to
   show legs that draft kings does"; the markets DraftKings posts are the reader's ESPN_MAIN and ESPN_MILE) */
const NO_BET=new Set(['targets','fg_att']);""", 'NO_BET')

# ---------------------------------------------------------------- Top 50
sub1('p3', "const PB_TOP_N=100;", "const PB_TOP_N=50;", 'PB_TOP_N')
sub1('p3', "  const head=`<div class=\"pb-hd\"><h2>Top 100 lines</h2>",
     "  const head=`<div class=\"pb-hd\"><h2>Top ${PB_TOP_N} lines</h2>", 'the heading')
sub1('p3', "so the totals come last among the other lines, and on a long list the 100 lines can end before them.');",
     "so the totals come last among the other lines, and on a long list the '+PB_TOP_N+' lines can end before them.');", 'the totals note')
sub1('p3', "each part ranked by what $1 on it is expected to make at the model’s chance, best first, 100 lines at most.",
     "each part ranked by what $1 on it is expected to make at the model’s chance, best first, ${PB_TOP_N} lines at most.", 'the lead')
sub1('p3', "any game totals last, 100 lines at most in all.", "any game totals last, ${PB_TOP_N} lines at most in all.", 'the foot')
sub1('p3', "or add a parlay from Suggested Parlays or a line from the Top 100 above.", "or add a parlay from Suggested Parlays or a line from the Top ${PB_TOP_N} above.", "the builder's empty line")

# ---------------------------------------------------------------- Suggested Parlays: the short version
sub1('p3', """    <p class="muted sp-rec-line">The record starts with this change, 16 October 2026: each Thursday, Sunday and Monday night game’s four parlays as the site locked them, 2 hours before kickoff, graded as a book settles them (a push drops out, and so does a player who did not play; one who played with no stat line is graded on zero). Won–lost and units on $1 a parlay. Refresh odds never changes it.</p></div>`;""",
     """</div>`;""", "the record's sentence")
sub1('p3', """  return `Updated: ${esc(u.name)} ${esc(u.reason||'ruled out')}${isFinite(at)?` (${spEt(at,true)})`:''}, so this level was built again from the lines at hand${u.by==='page'?'. This page made the change, from the latest published report, and keeps it in this browser; the record grades the site’s locked set, which the props job updates the same way only if it runs again before kickoff':''}.`;""",
     """  return `Updated${u.by==='page'?' in this browser':''}: ${esc(u.name)} ${esc(u.reason||'ruled out')}${isFinite(at)?` (${spEt(at,true)})`:''}; this level was built again.`;""",
     'spUpdLine')
sub1('p3', """    ${t.thin?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt?""",
     """    ${t.thin&&!o.quiet?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt&&!o.quiet?""", "pbTierCard's quiet")
sub1('p3', """   o.legAdd false: no Add on each leg */""",
     """   o.legAdd false: no Add on each leg; o.quiet: no line saying why a leg is not a Value pick or why a total is there
   (a Suggested Parlays set's, app v113) */""", "pbTierCard's comment")
sub1('p3', """  const mark='<span class="sp-lockmark">Locked</span>', when=v.at&&isFinite(Date.parse(v.at))?` (${spEt(Date.parse(v.at),true)})`:'';
  const line=v.phase==='live'?`<p class="sp-lock" data-sp-phase="live">Locks ${lockT}, 2 hours before kickoff; Refresh odds updates it until then.</p>`
    :v.phase==='loading'?`<p class="sp-lock" data-sp-phase="loading">${mark} since ${lockT}: reading the site’s locked set…</p>`
    :v.own?`<p class="sp-lock" data-sp-phase="own">${mark} since ${lockT}, 2 hours before kickoff. The site’s locked set for this game was not published when this page loaded, so this is the set as this browser built it${when}: it is kept in this browser to kickoff, and it is not the set the record grades. Refresh odds no longer changes it.</p>`
    :`<p class="sp-lock" data-sp-phase="locked">${mark} since ${lockT}, 2 hours before kickoff: the site’s set, the same for everyone and the one the record grades, as the props job last published it before the lock${when}. Refresh odds no longer changes it.</p>`;
  const cards=v.tiers?`<div class="pb-tiers">${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,mktWhy:'this game’s other legs do not make a parlay of this size'})).join('')}</div>`:'';""",
     """  /* (app v113) one short line each: the owner's "get rid of all the long paragraph description stuff" */
  const mark='<span class="sp-lockmark">Locked</span>';
  const line=v.phase==='live'?`<p class="sp-lock" data-sp-phase="live">Locks ${lockT}, 2 hours before kickoff.</p>`
    :v.phase==='loading'?`<p class="sp-lock" data-sp-phase="loading">${mark} since ${lockT}. Loading the site’s set…</p>`
    :v.own?`<p class="sp-lock" data-sp-phase="own">${mark} since ${lockT}. This browser’s own set: the site’s was not published in time, so the record does not grade it.</p>`
    :`<p class="sp-lock" data-sp-phase="locked">${mark} since ${lockT}.</p>`;
  const cards=v.tiers?`<div class="pb-tiers">${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,quiet:true,mktWhy:'this game’s other legs do not make a parlay of this size'})).join('')}</div>`:'';""",
     'the lock lines and quiet cards')
sub1('p3', """    <p class="muted pb-lead">The next Thursday, Sunday or Monday night game gets four parlays of its own, every leg from that game: Safe, Medium, Aggressive and Extreme, 2 to 5 legs priced together as a book prices a same-game parlay. One night is shown at a time: the next night’s set goes up at 6:00 AM ET the morning after the night game before it. A set is live until 2 hours before its kickoff, when it locks: from then to kickoff everyone sees the set the site locked, and that is the one the record above grades. A leg marked Value is one of the model’s best: it rates it at least 3 points above the chance its price implies${formSig()!==''?', and on a player’s line market + form (the book’s chance moved by his Elo rating) agrees':''}. Add a whole parlay to the builder, or one leg at a time.</p>
""", "", 'the tab lead')
T3 = T['p3']
i = T3.index("  return (On.length?On.map(g=>spGameHtml(g,on)).join(''):wait)\n    +`<p class=\"muted pb-foot\">")
j = T3.index("</p>`;\n}", i)
old = T3[i:j + len("</p>`;\n}")]
assert T3.count(old) == 1
T['p3'] = T3.replace(old, "  return On.length?On.map(g=>spGameHtml(g,on)).join(''):wait;\n}")

# ---------------------------------------------------------------- a builder leg DraftKings does not offer
# A visitor's builder is kept in the browser (S.parlay), so an FG attempts leg added before app v113 would stay,
# priced, until its game kicked off: it leaves the builder as a started game's leg does, saying so, and toggleLeg
# never adds one (the page draws no box for it; this holds any other path too).
sub1('p3', """  let dropped=0;
  for(const [k,l] of Object.entries(S.parlay||{})){ const g=S.sched.find(x=>x.id===l.gid); if(g&&gameStarted(g)){ delete S.parlay[k]; dropped++; } }
  if(dropped) save();""",
     """  let dropped=0, notDk=0;
  for(const [k,l] of Object.entries(S.parlay||{})){ const g=S.sched.find(x=>x.id===l.gid); if(g&&gameStarted(g)){ delete S.parlay[k]; dropped++; } }
  /* (app v113) an FG attempts leg kept from before: the one bet the page offered until app v113 that DraftKings
     does not (targets, the other stat in NO_BET, was never a leg) */
  for(const [k,l] of Object.entries(S.parlay||{})) if(l&&l.stat==='fg_att'){ delete S.parlay[k]; notDk++; }
  if(dropped||notDk) save();""", "the builder's drop step")
sub1('p3', """  const droppedNote=dropped?`""", """  const droppedNote=(notDk?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05" data-pb-notdk="${notDk}">${notDk} leg${notDk===1?' was':'s were'} removed: DraftKings does not offer FG attempts.</p>`:'')+(dropped?`""", "the builder's note")
sub1('p3', "Saved and locked parlays keep theirs.</p>`:'';", "Saved and locked parlays keep theirs.</p>`:'');", "the builder's note, closed")
sub1('p3', """  const [gid,pid,stat]=key.split('|');
  const game=g||S.sched.find(x=>x.id===gid);""", """  const [gid,pid,stat]=key.split('|');
  if(NO_BET.has(stat)) return;   /* (app v113) never a leg DraftKings does not offer */
  const game=g||S.sched.find(x=>x.id===gid);""", 'toggleLeg refuses NO_BET')
sub1('p3', "/* ---------- the Parlay Builder's Top 100 lines (app v111) ----------", "/* ---------- the Parlay Builder's Top lines (app v111; 50 since app v113) ----------", "the Top lines' comment")
for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v113, Suggested Parlays without the long paragraphs, the Top 50 lines, and DraftKings markets only')
