"""app v129: no Game snapshot button on a game's page, and Suggested Parlays one section with one record.

The owner's calls of 22 October 2026, the day the Matchups tab went:

  "on second thought, i dont want that game snapshot buttons. please remove it."
  "get rid of button (incl backteest wk 3-6), just include the record if not already"
  "get rid of the Sunday slot record section -> all should be a part of 'Night Games'"

1. gameWinBtns draws the three buttons of app v124 again, Matchup, Mismatches and Team Stats, and no fourth: the whole
   Game snapshot opens from the matchup bubble's Open game snapshot alone (app v128 had added a Game snapshot button
   beside them). .gwin is three in a row again, with no two-by-two rule for a phone (three short words fit).
2. Suggested Parlays is one section, Night games, and one record. The Sunday slot's set is drawn in it after the night
   games' (it was a section of its own with its own heading and record since app v118), and the record at its head
   counts every unit of both of the suggestions record's maps, the prime-time games' and the Sunday slots', each unit
   and level once as before (SP_SEC's night reads both maps; the slot's own entry stays for any caller that asks for it
   by name, drawn nowhere). The record's weeks before it took the sets still count, from the backtest, as they always
   did: what goes is the chip that said so, "Incl. backtest, weeks 3–6", and its row. The slot's set, under the Night
   games heading now, wears a "Sunday slot" pill in its head as a night game wears its night's, so the set still says
   what it is; and once the season is over the section says so once, the night games' line, the slot drawing nothing.

APP_BUILD moves to app v129.
"""
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert "b('snap','Game snapshot')" in T['p3'], 'patch_night_record.py has already been applied (or app v128 is missing)'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v128 \\u00b7 2026-10-22';", "const APP_BUILD='app v129 \\u00b7 2026-10-22';", 'APP_BUILD')

# 1. three buttons again
sub1('p3', "${b('stats','Team Stats')}${b('snap','Game snapshot')}</div>`;", "${b('stats','Team Stats')}</div>`;", 'gameWinBtns: no Game snapshot button')
sub1('p3', """   season's team stats side by side on bars. The prop model's own page has no such window and draws none.
   (app v128) A fourth, Game snapshot, opens the whole snapshot over the page (the owner's call of 22 October 2026,
   when the Matchups tab went: "Button on Props"), through the same binding: the hub's window opens the whole of it
   for "snap" and one card alone for the other three. */""",
     """   season's team stats side by side on bars. The prop model's own page has no such window and draws none.
   (app v128 added a fourth, Game snapshot, and app v129 took it off again, the owner's call of 22 October 2026: the
   whole snapshot opens from the matchup bubble alone.) */""", 'gameWinBtns: its note')
sub1('p3', """     hub's (window.gameWindow), handed the button so the focus comes back to it; (app v128) its Game snapshot the
     whole window, the same way */""",
     """     hub's (window.gameWindow), handed the button so the focus comes back to it */""", "renderGame: the binding's note")
sub1('p1', """/* (app v124) a game's Matchup, Mismatches and Team Stats buttons, under its head, each 44px; (app v128) and its
   Game snapshot: four in a row, two by two at 680px and under */
.gwin{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px}
@media(max-width:680px){.gwin{grid-template-columns:repeat(2,minmax(0,1fr))}}""",
     """/* (app v124) a game's Matchup, Mismatches and Team Stats buttons, under its head, each 44px */
.gwin{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px}""", '.gwin: three buttons')

# 2. one section, one record
sub1('p3', """/* the two sections of Suggested Parlays (app v118, the owner's call of 19 October 2026: "do a separate section for
   night games and then the sunday slot of games"), each with its own map in the record, and the two kinds of level
   each unit has: the model's parlays (tiers) and the Elo picks (elo) */
const SP_SEC={night:{map:'prime',name:'Night games'},slot:{map:'slot',name:'Sunday slot'}};""",
     """/* the sections of Suggested Parlays and the maps of the record each counts, and the two kinds of level each unit
   has: the model's parlays (tiers) and the Elo picks (elo). From app v118 to v128 two sections, Night games (the record's
   prime map) and the Sunday slot (its slot map), each with its own record (the owner's call of 19 October 2026); since
   app v129 one, Night games, its sets the night games' and then the Sunday slot's, its record both maps (the owner's
   call of 22 October 2026: "get rid of the Sunday slot record section -> all should be a part of 'Night Games'").
   slot is kept for a caller that asks for the slot's map by name, and drawn nowhere */
const SP_SEC={night:{maps:['prime','slot'],name:'Night games'},slot:{maps:['slot'],name:'Sunday slot'}};""", 'SP_SEC: Night games reads both maps')
sub1('p3', """  const map=SP_SEC[sec].map, {field,pre}=SP_KIND[kind];""", """  const maps=SP_SEC[sec].maps, {field,pre}=SP_KIND[kind];""", 'spRecSum: its maps')
sub1('p3', """  for(const e of Object.values(L&&pbIsMap(L[map])?L[map]:{})) if(pbIsMap(e)&&Array.isArray(e[field])) mine.add(e.season+'|'+e.gid);
  const take=(src,bt)=>{ const E=src&&pbIsMap(src[map])?src[map]:{};
    for(const k of Object.keys(E).sort()){""",
     """  for(const map of maps) for(const e of Object.values(L&&pbIsMap(L[map])?L[map]:{})) if(pbIsMap(e)&&Array.isArray(e[field])) mine.add(e.season+'|'+e.gid);
  const take=(src,bt)=>{ for(const map of maps){ const E=src&&pbIsMap(src[map])?src[map]:{};
    for(const k of Object.keys(E).sort()){""", 'spRecSum: each map in turn')
sub1('p3', """        last.set([e.season,e.gid,t.id].join('|'),{t,g,bt,w:+e.week}); } } };""",
     """        last.set([e.season,e.gid,t.id].join('|'),{t,g,bt,w:+e.week}); } } } };""", 'spRecSum: the loop closed')
sub1('p3', """/* a section's record at its head: a row for the model's parlays and one for the Elo picks, a pill a level (won-lost,
   units on $1) and what is pending, as the ELO Ratings tab's record bar; where some of it is the backtest, one chip
   saying which weeks (each pill's title saying how many of its own). No record and no backtest, nothing (hidden) */""",
     """/* a section's record at its head: a row for the model's parlays and one for the Elo picks, a pill a level (won-lost,
   units on $1) and what is pending, as the ELO Ratings tab's record bar, the backtest's weeks counted in it (each pill's
   title saying how many of its own; app v129 took off the chip that named the weeks). No record and no backtest,
   nothing (hidden) */""", 'spRecHtml: its note')
sub1('p3', """  const wk=new Set();
  const rows=Object.entries(SP_KIND).map(([kind,K])=>{ const R=spRecSum(PB_REC,sec,kind,PB_BT), any=R.tiers.some(s=>s.graded||s.push);
    R.btWeeks.forEach(w=>wk.add(w));
    const by""", """  const rows=Object.entries(SP_KIND).map(([kind,K])=>{ const R=spRecSum(PB_REC,sec,kind,PB_BT), any=R.tiers.some(s=>s.graded||s.push);
    const by""", 'spRecHtml: no weeks gathered for a chip')
old_bt = """  const W=[...wk].sort((a,b)=>a-b);
  const bt=W.length?`<span class="rec sp-recbt" data-sp-rec="${sec}:bt" title="${W.length>1?'Weeks':'Week'} ${W.join(', ')} ${W.length>1?'were':'was'} played before the record took this section: rebuilt by today’s rules on exactly what the site had published at each lock, and graded on the results.">Incl. backtest, week${W.length>1?'s':''} ${W.length>1&&W[W.length-1]-W[0]===W.length-1?W[0]+'–'+W[W.length-1]:W.join(', ')}</span>`:'';
  return `<div class="sp-rec" data-sp-recsec="${sec}">${rows}${bt?`<div class="bar sp-recbtbar">${bt}</div>`:''}</div>`;"""
sub1('p3', old_bt, """  return `<div class="sp-rec" data-sp-recsec="${sec}">${rows}</div>`;""", 'spRecHtml: no backtest chip')
sub1('p3', """function spSetsHtml(on){ return spSecHtml('night',spNightHtml(on))+spSecHtml('slot',spSlotHtml(on)); }""",
     """/* (app v129) one section, Night games: the night games' sets, then the Sunday slot's */
function spSetsHtml(on){ return spSecHtml('night',spNightHtml(on)+spSlotHtml(on)); }""", 'spSetsHtml: one section')

sub1('p1', ".sp-rec .bar.sp-recbtbar{margin-top:0}\n", '', 'the backtest chip row\'s rule')
sub1('p3', """<h4 id="spg-${esc(g.id)}">Week ${g.w}, ${g.games.length} game${g.games.length===1?'':'s'}</h4><small>""",
     """<h4 id="spg-${esc(g.id)}">Week ${g.w}, ${g.games.length} game${g.games.length===1?'':'s'}</h4><span class="pill">Sunday slot</span><small>""",
     'spHdHtml: the slot named in its head')
sub1('p3', """  if(!u) return `<p class="pb-none" data-sp-none="slot">${seasonOver()?`The ${SEASON} regular season is over: no Sunday slot is left.`:`No Sunday game of week ${currentWeek()} is still to kick off.`}</p>`;""",
     """  if(!u) return seasonOver()?'':`<p class="pb-none" data-sp-none="slot">No Sunday game of week ${currentWeek()} is still to kick off.</p>`;""",
     'spSlotHtml: the season over said once, by the night games')

for gone in ("b('snap'", 'sp-recbt', 'Incl. backtest', "spSecHtml('slot'", '.gwin{display:grid;grid-template-columns:repeat(4'):
    assert gone not in T['p3'] + T['p1'], gone

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v129, three buttons on a game page, Suggested Parlays one Night games section with one record and no backtest chip')
