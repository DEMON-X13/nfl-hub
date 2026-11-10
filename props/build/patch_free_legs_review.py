"""The follow-up of app v145's second review (app v146): a parlay's chance by game, one collation, a press that builds a
level a step, and one work budget a level.

The second review of app v145 (9 November 2026, before it merged) left eight items for a change of their own (CLAUDE.md
numbers them). Five designs prototyped and measured them, a critique composed them, and this script applies the four that
change the props parts (the review's items 5, 6, 7, 1 and 2), on app v145's part2.js and part3.js, in the order they were
composed and measured together; items 3 and 8 are the checks', and item 4 is accepted as it is (below). Every real level
is the same parlay as app v145's (What moved, below). Its sections:

0. APP_BUILD, app v146.

1. A parlay's chance by game (the review's item 5, the Day games knapsack). The Day games knapsack (pbFreeDp) scores each
game's option on its own (a single leg its chance, a same-game group its own seeded draw, pbExact on the group alone) and
multiplies the games, while parlayProb, the card's chance, drew every leg of the parlay together once any pair moved
(|r| >= 0.03), the other games' independent legs included, so the card's chance carried the draw's noise on those legs too
(about half a point between parlays of the same true chance), and the knapsack's dominance could drop the parlay whose draw
came out luckier (9 of 320 small made-up Day games levels, by 0.015 to 0.50 points, 8 of them the page's parlay as likely
or likelier at a million draws). No real Day games level has held a same-game group. Legs of different games never move
together (legRho is 0 across games, its first line), so the chance every leg lands is the product over games of the chance
each game's legs all land, and parlayProb now says so: where its legs span two games or more and a pair moves, each game's
legs (in the order given, which pbOrder's stable sort keeps the same whether the game's legs are sorted alone or among the
others) are worked by parlayProb on their own (the exact product where none of that game's pairs moves, else the seeded
draw over that game's legs alone, the very draw the knapsack's group option was), and the games' chances multiplied in the
order they first appear; indep and pairs stay the whole parlay's. A parlay of one game, and every parlay where no pair
moves, is exactly as before, so parlayDec (one game a call), every night set, every one-game level and every Day games
level of single legs are unchanged to the bit; only a parlay of legs of two games or more holding a moving pair moves (the
builder's, the all-games engine's, a Day games level holding a group). Not split inside a game: parlayDec's same-game price
draws a game's legs together. The record keeps its figures; of its 212 levels four (the backtest's week-6 Sunday slot,
built across games before app v121, drawn nowhere) would state -0.10 to +0.18 points otherwise if worked again. The
knapsack then measures a parlay exactly as its card does, so its dominance drops nothing the rule wants. The search's
docstring, which said parlayProb "decomposes by game" where it did not, says how it does now.

2. One collation (the review's item 6, pbOrder's localeCompare). pbOrder, the builder's order of a parlay's legs (the week,
then the name), decides which seeded normals each leg draws in parlayProb and which in parlayDec's same-game group, so a set
whose legs move together states another chance and another price when the order changes. It sorted the names with
localeCompare and no locale, so in the visitor's own collation: Czech sorts "Ch" after "H", Danish and Norwegian "Aa"
last, Lithuanian "y" between "i" and "j", Hungarian and Estonian their own letters. The record is worked in Node, whose
default under the runners' C.UTF-8 is en-US, so a visitor whose browser speaks one of those languages could be drawn
another live set than the record locks (on every game of weeks 7 to 9 still to kick off built as a one-game unit, with each
payload's Day games, 232 levels: 12 other parlays under cs, 7 under da and nb), and a locked level read back by spTierIn
under its own price (da, 2026_07_IND_MIN's Extreme, 16.0000 in the en build, read back at 15.0210 were it locked, "+1402"
under a "+1500+" pill; no level of the record's own units moved). parlayLegs (part2.js), the builder's
and the parlay card's own order, did the same. Every order a choice, a chance or a price stands on now sorts by one
collator, EN_COLL, Intl.Collator('en') (enCmp, beside SEASON in part2.js, the parts' first script): pbOrder and parlayLegs
on the name; pbOrd, pbRank, pbFreeRank and pbFreeWalk's candidates on their ids; and gamesIn and ingestStats' game ids on
their kickoff strings (digits, which every collation orders alike, pinned so no order of the parts reads the visitor's
language). 'en' is ICU's root collation, the very order Node's en-US gives, so no level the record holds or takes moves
(the 232 levels the same to the bit under C.UTF-8), and under cs, sk, da, nb, hu, lt and et the page draws and reads back
exactly those. One shared collator, never localeCompare(b, 'en'): Safari's JavaScriptCore and Firefox's SpiderMonkey cache
a collator for localeCompare only when it is given no locale, and make one on every call that names one, which in the
search's sorts would cost seconds on a phone. A code-point compare would not do: it moves "DJ" before "Dalton" and every
locked level read back with them. Display orders (the ELO tab's table sort, the snapshot's tie order of the Power
Ratings) state no money and are left in the visitor's language. The sorts a code-point compare already ordered
(pbFreeSeed's legs, the Day games' groups below) read no language and are left as they are.

3. The press's redraw (the review's item 7, a Refresh odds press). A press of Refresh odds ended in espnRedraw, which
emptied SP_CACHE whatever the read found and drew the page again in one task, so with Suggested Parlays on the screen
every shown set was built again there: 0.84 to 1.68 s in Node on the four saved payloads (the week's press, a game's, and
the parlay card's check after a level's Finish, which ends in the same redraw), four times that on a phone. Two changes.
(a) A press that changed nothing the sets stand on (espnRefresh's changed false, so ESPN_SEQ and every set's signature
unmoved: ESPN failed, or answered with nothing to apply) keeps every set it can (espnRedraw(true)); it drops only a set
whose words date the last read, a unit with no player line (its empty levels say "no player lines yet (read <time>)",
spNoPl, and a press that found none posted moves that time without moving ESPN_SEQ), and the Top 50's and the engine's
caches as before (their notes date the read too). The parlay card's held redraw passes it on where every read it held said
so (card.html, below). (b) With Suggested Parlays on the screen and a set to build, the redraw starts spOpenSoft first
(spSoftShown), so the tab shows the record and "Building the sets…" at once and builds a level a task, as opening the tab
does, and renderParlay's renderSp then takes the run's steps again (spSoftAgain) rather than building them; the run ends
drawn by renderSp on the very HTML a synchronous draw gives, the focus found again by spFocusOf and spFocusBack, the
Refresh odds button kept in focus by espnRedraw meanwhile (it is in the tab's head, which the run draws). The run's
promise is kept on it (SP_SOFT.done), for a caller, and a check, that waits for the tab drawn whole. A set is still
re-picked by a press until its lock and never after it (spWarmSteps builds no locked or under-way unit). A redraw with the
tab hidden is as before: a hidden tab builds nothing ("Built when this tab is open."). What is left of a redraw's own task
is every press's, whatever tab is shown (about 0.2 to 0.3 s in Node: the Props list, the Top 50 and the builder), and the
longest task of the run one level's step.

4. One work budget a level, and one on the Day games' group path (the review's items 2, the work bound, and 1, a Day games
slate of four games or fewer). Each call of pbFreeGame made fresh budgets (UNITS1 and NODES1 for its first walk, UNITS2
and NODES2 for its second), and pbFreeOne calls it once a pass (the no-total pass, then the totals' pass; the dormant
preferred list up to cap+1 more), so a level's passes did not share them, whatever pbFreeCost's comment said: on legal
60-leg pools a level of one game took 3.9 to 4.8 s in one task (60 legs at -375 and a total at +100: 12.5 million nodes
over its two passes, 4.3 s). And the Day games' same-game groups (pbFreeUnit, two games or more) were walked and worked in
full with no budget at all: 4.5 to 11.7 s a level in jsdom (the page's task 3.4 to 10.0 s) on week 9's Day games cut to
two to four games, real lines and filled, where the single legs across games cannot reach a level's price (no 2026 Sunday
has so few day games; Christmas 2022's had two).

A level's work is now counted, never timed: W (PB_W), in microseconds of jsdom on the box it was fitted on (a 4-CPU 2.1 GHz
Xeon), from what the search does, never from the machine: a walk's node 0.3, each leg a node's children are read from
0.07, a candidate kept 7.5, a parlay of n legs worked in full 4 n^2 and its draws (pbWorkEx: a same-game group of g legs
with a moving pair draws its price, 20,000 trials of g(g+1)/2 terms, and where it pays and a pair moves its chance, 40,000
trials of n(n+1)/2; 0.00025 a term, 0.003 in a row of 9 legs or more, worked by the generic loop), and a step of the
knapsack with groups 0.3. Fitted on app v145's own runs (264 real levels, 40 made-up one-game levels, 28 Day games
levels): a level over 400 ms runs 0.8 to 1.2 times its W, up to about 1.5 on small correlated groups worked cold. W reads
no memo of parlayProb (history, which would part the page from the record), so a level that reuses draws runs under its
W, and every choice that turns on it is the same on every machine and every run, as the walks' units and nodes are.

(a) A level of one game: PB_FREE.WORK, 1,500,000 (1.5 s of W), which every pass and walk of the level draws on (LV, made
by pbFreeOne and handed to each pbFreeGame as a seventh argument, which a caller that wraps pbFreeGame must hand on: one
that drops it gives each pass a fresh budget). The passes before the totals' pass leave RT (200,000) whether or not the
pool has a total, so a level with no total is the same parlay on the pool without its totals, as the audit holds (a first
prototype that reserved RT only where a total was in the pool failed that hold on the made-up lines' TB at CHI Extreme,
where the budget binds); the totals' pass gets what is left. A first walk leaves R2 (150,000) to its pass's second walk,
and a walk's candidates leave RW (100,000) for the parlays it works in full (pbFreeCands' res); pbTake and pbGive hand
each walk its share and charge the level (PB_LV_STAT.w, for the checks). The walks' own budgets in the old measure
(UNITS1, NODES1, UNITS2, NODES2, pbFreeCost) are exactly as they were, and on every real level they, not W, shape the
search. A set worked in full twice within a level (the second walk's of the first's, the seed) is worked once (LV.seen,
pbExact's result or false by id) and charged W once, its units as before, so the walks stop where they stopped; pbExact is
the same each time (its draws the one seeded stream), so no result moves. And the second walk also runs where the first
walk's candidates were cut before it worked any (c1.cut, which no real level meets), so a pool whose candidate walk spends
the budget still gets the greedy seed.

(b) The Day games' groups (pbFreeUnit, two games or more): PB_FREE.GWORK, 1,200,000 a level, every pass and try drawing
on it. GWALK (600,000) of it is the groups' walks (pbFreeCands' front mode, now with a budget, each game's walk leaving
GFLOOR, 10,000, to each game after it); the rest the groups worked in full, every game's candidates gathered and sorted
together best key first (pbEvKey, then the id) and each worked once (kept from try to try and pass to pass) while more
than GR (300,000) is left for the knapsack with groups and the card. Unbudgeted, the same groups reach the knapsack as
before (each game's options sorted by srt before it), so nothing moves where the budget does not bind. The knapsack with
groups runs at PB_FREE.WIN on what is left (pbFreeDp's new W, 0.3 a step, ending where it is spent, cut, with what it
found); its best is the same at any tolerance, so the last try's knapsack is the one worked on the card, and app v145's
second knapsack over the same options is run only where no group was added (the singles' at BORDER as before). The tries
also end where the knapsack was cut or a budget is spent. A knapsack cut by the budget has the singles' own complete
parlays put beside what it found, never an empty level where the singles had one; and where every pass ends with nothing
found (a slate of a few day games whose single legs cannot reach the price, its tries ending on the groups' walks before
the threshold comes down, and its totals' pass left no walk: the review of app v146, on two day games at 0.85 and 0.75
times their prices), the level is the greedy paying set across the games (pbFreeSeed, as the one-game path seeds its
second walk), the legs without the totals first, on what is left of the groups' work and charged to it, so no level that
fills moves; on the card the first complete parlay is always worked, more while the budget lasts, at most WIN_EVALS. The
card's walk goes in the rule's own order (pbFreeRank's on the knapsack's figures: the chance to 1e-9, the fewer legs,
the larger lean to 1e-9, the lower id by enCmp), where the knapsack's list was sorted by its chance as multiplied, whose
last bits move with the order the games are multiplied in: uncut, the best by pbFreeRank is the same in any order, but a
walk the groups' budget cuts could stop before the parlay the rule takes among parlays it ties (the audit's off-season
run, PROPS_AUDIT_NOW=2027-02-15T15:00:00Z on the committed payload, its made-up lines on week 18's Day games: Extreme
five legs tied at 5.2281%, the rule's parlay leaning 0.450 and the page's 0.428, which the audit's exact Day games hold
refused). The singles' knapsack is not budgeted (every real slate's path, at most about 0.4 s on sixteen games of filled
lines). Counters drawn nowhere: PB_LV_STAT.gw, the groups' W, and dp, the knapsack's steps with groups, and pk, the keys
the candidates' prune scans (pbFreeCands' prune, run only once another M have come in past what the last prune kept: a
count the checks can hold where they no longer read the clock, about 1.3 million on 24 tied legs' Extreme where a prune
on every push past twice M scans about 1.8 billion; the review of app v146).

The bound reached (jsdom on that box): a level of one game at most about 1.5 s on every made-up pool tried (app v145 up to
5.3 s), a level of the Day games at most about 1.5 s on the two- to four-game slates (app v145 4.5 to 11.7 s) and 0.92 s on
sixteen games of filled lines (1.40 s); the page's longest task, Suggested Parlays opened cold, 0.72 to 1.0 s on those
slates (4.5 to 10.0 s) and as before on the four saved payloads. The no-total pass's 1.3 s holds every real game taken
as a one-game unit, the largest at 89% of it (What moved, below): much smaller, and it would cut one, so the bound cannot
come down much further without moving a level.

Two comment fixes: pbFreeCost's units are a walk's own budget (UNITS1, UNITS2), never a level's passes' shared one; and
pbFreeSeed's comment said its chance over C at the cap, the second walk's bar, was one "below which no set's reading can
beat it", which C (measured, the 99th percentile of the chance in full over the reading, not a bound) does not give an
opposite-sign set (pbLvOpp) of 4 legs or more, whose chance in full can run to C2 over its reading (1.15 to 1.39, above C
at the cap, 1.14): the bar can let such a set go (accepted; the second walk is left as it is).

What moved, composed (the four sections together, against app v145; every timed run under one lock on a 4-CPU box). Every
live unit of the four saved payloads at their clocks (weeks 7 to 9) and every game of their live week still to kick off
taken as a one-game unit: 264 levels, every one the same parlay, the longest 0.75 to 0.85 s by the clock in both. What they
use of the budgets, none binding: the largest real night level's W 804 ms (week 8's CHI at SEA Extreme) of the no-total
pass's 1,300, the largest of any game taken as a one-game unit 1,152 (89%: week 9's HOU at LAC Extreme, a day game, whose
one-game search only the engine runs), and the real Day games' group path at most 198 ms of its 1,200 (week 7's Extreme);
the old measure is unchanged (at most 2,791 units and 1,244,752 nodes a level). Only units the groups' budget binds move:
week 9's Day games cut to two, three and four games (no 2026 Sunday has so few). There, against app v145's stated
figures, the real lines' Aggressives and Extremes lose 0.20 to 0.29 points of chance (slot2 Aggressive 9.6250% to
9.4239%, Extreme 4.7250% to 4.4322%; slot3 9.6550% to 9.4239% and 4.7250% to 4.4557%; slot4 Extreme 4.6925% to 4.4899%)
and the filled lines' 0.45 to 0.48 (one, slot2's filled Extreme, gains 0.13), part of which is section 1 taking out the
lucky joint draw app v145's figures stood on (0.16 to 0.18 points over the true chance); against section 1 alone the
budget costs 0.11 to 0.22 points (slot2 Aggressive 9.6250% and Extreme 4.6040% there; slot3 9.6450% and 4.6040%; slot4
Extreme 4.6040%), and the slates' longest level is 1.46 s against 11.7 s. The card's walk in the rule's order (section 4 (b)) moves none of
these: the 264 levels and the 28 slate levels are the same parlays with it as without it.

Left as they were, and written down (CLAUDE.md): the second walk (the review's item 4: 12 of weeks 7 to 9's 54 Extremes taken as one-game units
land 0.010 to 0.225 points under the parlay a search keeping eight times the candidates uncapped finds; the 1,500 kept,
PB_FREE.M, is the cause, and keeping more costs a night Extreme up to about 0.8 s); the two prunes' nits (DELTA's order
and the front mode's min(1, rOb), neither met at DraftKings' fair chance on realistic pools); pbWorkEx charging a draw over
every leg of a parlay of several games holding a moving group, where parlayProb now draws that game's legs alone (it
charges more than the work, never less); the half-minute look building a unit gone up at the 6:00 AM turn in its own task
(pbWatchTick); a card closed while the tab is still building giving the focus to the tab's button; and WIN and
WIN_EVALS. The selection's bias in price (nearly every level is chosen at its floor's edge, and at a million draws 41, 50 and 53 of
weeks 7 to 9's 54 Mediums, Aggressives and Extremes price under their floor, Extreme's median about 4% under) is the
owner's to call and is not changed here.

Outside this script, which edits only the parts: nflbets/build/card.html, a direct edit (holdRedraw's stub takes same and
owes it, and the one redraw drawn after is real(same), true only where every read it held said so), and
nflbets/build/build.js's refusals (outside comments in the parts and the card, no localeCompare in any spelling and no
collator but EN_COLL, made with or without new, read by brackets or destructured, nor Intl read by brackets; the press's
redraw wired; no clock read in the level search, from PB_FREE to pbFreeUnit; the level's work handed to every pbFreeGame;
the candidates' prune as app v144's review left it, its keys counted; the card's walk of the Day games' knapsack sorted into
the rule's order before it walks). patch_free_legs.py is left as it is: its docstring is app v145's history, its anchors app v144's.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k].name}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


# ---------------------------------------------------------------------------------------------------------------------
# 0. APP_BUILD
sub1('p2', r"""const APP_BUILD='app v145 \u00b7 2026-11-08';""",
     r"""const APP_BUILD='app v146 \u00b7 2026-11-10';""",
     'APP_BUILD')

# ---------------------------------------------------------------------------------------------------------------------
# 1. parlayProb by game
sub1('p2', """  if(!pairs.length) return {indep,corr:indep,pairs};
  /* (app v135)""", """  if(!pairs.length) return {indep,corr:indep,pairs};
  /* (app v146) legs of different games never move together (legRho 0), so the chance all land is the product over games of
     each game's own: each game's legs, in the order given, worked on their own (the exact product where none of that game's
     pairs moves, the seeded draw over that game's legs alone where one does), the games multiplied in the order they first
     appear. A parlay of one game is exactly as before (patch_free_legs_review.py) */
  const gids=[]; for(const l of legs) if(!gids.includes(l.gid)) gids.push(l.gid);
  if(gids.length>1){ let corr=1; for(const g of gids) corr*=parlayProb(legs.filter(l=>l.gid===g),sims).corr; return {indep,corr,pairs}; }
  /* (app v135)""", 'parlayProb by game')

sub1('p3', """   SGP_HOLD over their joint implied chance, never above multiplying). parlayProb is the exact product where no pair moves
   together and a seeded draw over every leg where one does. So it decomposes by game.""",
     """   SGP_HOLD over their joint implied chance, never above multiplying). parlayProb is the product over games of each game's
   own chance (app v146): the exact product of a game's legs where none of its pairs moves together, else a seeded draw over
   that game's legs alone. So both decompose by game, and a game's option (a single leg, or a same-game group worked by
   pbExact alone) has the very chance and price it carries on the card.""", 'the search docstring: by game')

# ---------------------------------------------------------------------------------------------------------------------
# 2. one collation: the collator, beside the season (part2.js is the first script of the parts)
sub1('p2', "const SEASON=2026, KEY='props_2026_v1';\n",
     "const SEASON=2026, KEY='props_2026_v1';\n"
     "/* (app v146) the one collation every order of a parlay's legs, chance or price stands on is sorted by (pbOrder and\n"
     "   parlayLegs on the name, the search's ids, the games' kickoffs): 'en', ICU's root order, the order the record gets in\n"
     "   Node (en-US), whatever language the visitor's browser speaks. One collator, shared: localeCompare(b,'en') makes one\n"
     "   on every call in Safari and Firefox */\n"
     "const EN_COLL=new Intl.Collator('en'), enCmp=(a,b)=>EN_COLL.compare(a,b);\n",
     'the collator')

sub1('p2', ".sort((a,b)=>(a.week-b.week)||a.name.localeCompare(b.name));",
     ".sort((a,b)=>(a.week-b.week)||enCmp(a.name,b.name));",
     "parlayLegs' order")

sub1('p3', "function gamesIn(w){ return S.sched.filter(g=>+g.w===w).sort((a,b)=>((a.d||'')+(a.t||'')).localeCompare((b.d||'')+(b.t||''))); }",
     "function gamesIn(w){ return S.sched.filter(g=>+g.w===w).sort((a,b)=>enCmp((a.d||'')+(a.t||''),(b.d||'')+(b.t||''))); }",
     "gamesIn's order")

sub1('p3', "||((byGame[a].g.d||'')+(byGame[a].g.t||'')).localeCompare((byGame[b].g.d||'')+(byGame[b].g.t||'')));",
     "||enCmp((byGame[a].g.d||'')+(byGame[a].g.t||''),(byGame[b].g.d||'')+(byGame[b].g.t||'')));",
     "ingestStats' game order")

sub1('p3', "const pbOrd=(a,b)=>(a.key+'|'+a.side+'|'+a.k).localeCompare(b.key+'|'+b.side+'|'+b.k);",
     "const pbOrd=(a,b)=>enCmp(a.key+'|'+a.side+'|'+a.k,b.key+'|'+b.side+'|'+b.k);",
     'pbOrd')

sub1('p3', """/* the builder's order (parlayLegs): the week, then the name. The tier's numbers are worked on
   the legs in this order, so the builder, which works them the same way, shows the same */
const pbOrder=legs=>[...legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name)));""",
     """/* the builder's order (parlayLegs): the week, then the name. The tier's numbers are worked on
   the legs in this order, so the builder, which works them the same way, shows the same. (app v146) The name by EN_COLL,
   never the visitor's own collation, so a level states the chance and price the record does in every language */
const pbOrder=legs=>[...legs].sort((a,b)=>(a.week-b.week)||enCmp(String(a.name),String(b.name)));""",
     'pbOrder')

sub1('p3', "||(pbEvKey(b.ln||0)-pbEvKey(a.ln||0))||a.id.localeCompare(b.id);",
     "||(pbEvKey(b.ln||0)-pbEvKey(a.ln||0))||enCmp(a.id,b.id);",
     'pbRank')

sub1('p3', "const pbFreeRank=(a,b)=>(pbEvKey(b.pr)-pbEvKey(a.pr))||(a.n-b.n)||(pbEvKey(b.ln)-pbEvKey(a.ln))||a.id.localeCompare(b.id);",
     "const pbFreeRank=(a,b)=>(pbEvKey(b.pr)-pbEvKey(a.pr))||(a.n-b.n)||(pbEvKey(b.ln)-pbEvKey(a.ln))||enCmp(a.id,b.id);",
     'pbFreeRank')

sub1('p3', "  E.sort((a,b)=>(pbEvKey(b.key)-pbEvKey(a.key))||(pbEvKey(b.ln)-pbEvKey(a.ln))||a.id.localeCompare(b.id));",
     "  E.sort((a,b)=>(pbEvKey(b.key)-pbEvKey(a.key))||(pbEvKey(b.ln)-pbEvKey(a.ln))||enCmp(a.id,b.id));",
     "pbFreeWalk's candidates")

# ---------------------------------------------------------------------------------------------------------------------
# 3. the press's redraw. espnRefresh: whether the press changed anything the sets stand on, handed to the redraw
sub1('p3', """    if(changed) ESPN_SEQ++;
    espnRedraw();
  }
  return true;
}""",
     """    if(changed) ESPN_SEQ++;
    /* (app v146) a press that changed nothing the sets stand on keeps the sets it can */
    espnRedraw(!changed);
  }
  return true;
}""",
     "espnRefresh's redraw")

# espnRedraw: the caches kept where nothing changed, and Suggested Parlays built a level a step
sub1('p3', """/* after a press: every cache a price stands on dropped, the page drawn again, the focus kept */
function espnRedraw(){
  const a=document.activeElement, fk=a&&a.dataset?a.dataset.espnRefresh:null;
  /* (app v111) the button pressed is found again wherever it was: a game's page, the Parlay Builder's
     controls or its builder, Suggested Parlays, the Props tab */
  const where=fk&&a.closest?(['#gameView','#pbPanel','#parlayBody','#spPanel','#slateOdds'].find(s=>a.closest(s))||null):null;
  PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={};
  try{ renderSlate(); }catch(e){ console.error(e); }""",
     """/* after a press: every cache a price stands on dropped, the page drawn again, the focus kept. (app v146) same: the press
   changed nothing the sets stand on (ESPN_SEQ unmoved, so every set's signature is as it was): the sets are kept but a
   unit's with no player line, whose empty levels date the last read (spNoPl), which a press finding none posted moves.
   And with Suggested Parlays on the screen, what it has to build again is built a level a step (spSoftShown) */
function espnRedraw(same){
  const a=document.activeElement, fk=a&&a.dataset?a.dataset.espnRefresh:null;
  /* (app v111) the button pressed is found again wherever it was: a game's page, the Parlay Builder's
     controls or its builder, Suggested Parlays, the Props tab */
  const where=fk&&a.closest?(['#gameView','#pbPanel','#parlayBody','#spPanel','#slateOdds'].find(s=>a.closest(s))||null):null;
  if(same===true){ for(const [k,r] of [...SP_CACHE]) if(!r||!r.plGames) SP_CACHE.delete(k); } else SP_CACHE=new Map();
  PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); GAME_TIER_CACHE={};
  try{ spSoftShown(); }catch(e){ console.error(e); }
  try{ renderSlate(); }catch(e){ console.error(e); }""",
     'espnRedraw')

# spSoftShown, beside spOpenSoft
sub1('p3', """/* the tab opened: its sets built and drawn (the prop model's tab switch has shown the section by the time
   the click reaches the document); by the reader's own click or key, without holding the page (spOpenSoft) */""",
     """/* (app v146) Suggested Parlays on the screen, drawn, with a set to build and no run of spOpenSoft going (a press dropped
   the caches the sets stood on, or the parlay card's check of DraftKings' lines did, under the card): a run started, so the
   draw that follows (renderParlay's renderSp) takes its steps again (spSoftAgain) rather than building every set in its
   own task; false where there is none to start (a hidden tab builds nothing, and a run going is taken again by renderSp) */
function spSoftShown(){
  const tab=$('tab-suggest'); if(SP_SOFT||!tab||tab.hidden||!$('spSets')||!$('spHead')) return false;
  return !!spOpenSoft();
}
window.spSoftShown=spSoftShown;
/* the tab opened: its sets built and drawn (the prop model's tab switch has shown the section by the time
   the click reaches the document); by the reader's own click or key, without holding the page (spOpenSoft) */""",
     'spSoftShown')

# a run's promise kept on the run, so a draw's caller (and a check) can wait for the tab drawn whole
sub1('p3', """  $('spSets').innerHTML=spSecHtml('all','')+'<p class="pb-none sp-building" data-sp-building role="status">Building the sets…</p>';
  spFocusBack(fk);
  return new Promise(done=>{""",
     """  $('spSets').innerHTML=spSecHtml('all','')+'<p class="pb-none sp-building" data-sp-building role="status">Building the sets…</p>';
  spFocusBack(fk);
  /* (app v146) the run's promise kept on it (SP_SOFT.done), for a redraw's caller that waits for the tab drawn whole */
  return run.done=new Promise(done=>{""",
     "spOpenSoft's promise on its run")

# ---------------------------------------------------------------------------------------------------------------------
# 4. one work budget a level, and one on the Day games' group path. The constants: the work measure, the level's and the
# groups' budgets
sub1('p3', """const PB_LV_STAT={ev:0,kept:0,runs:0,second:0,opp:0,groups:0,nodes:0,units:0};""",
     """const PB_LV_STAT={ev:0,kept:0,runs:0,second:0,opp:0,groups:0,nodes:0,units:0,w:0,gw:0,dp:0,pk:0};""",
     'PB_LV_STAT: the work counters')

sub1('p3', """SLEP:1.05,SLT:1.03,UNITS1:2000,NODES1:6000000,UNITS2:1000,NODES2:500000};""",
     """SLEP:1.05,SLT:1.03,UNITS1:2000,NODES1:6000000,UNITS2:1000,NODES2:500000,
  WORK:1500000,RT:200000,R2:150000,RW:100000,GWORK:1200000,GWALK:600000,GFLOOR:10000,GR:300000};
/* (v146) a level's work, deterministic and alike on every machine, in microseconds of jsdom on the box it was measured on
   (a 4-CPU 2.1 GHz Xeon): a walk's node NODE, each leg its children read KID, a candidate kept KEEP, a parlay of n legs worked in full EX n^2 and its draws
   (pbDraws: a same-game group of g legs with a pair moving draws its price, 20000 trials of g(g+1)/2 terms, and where it
   pays and any pair moves its chance, 40000 trials of n(n+1)/2) DRAW a term (DRAW9 in a row of 9 legs or more, worked by
   the generic loop), a step of the knapsack across games DP; a set worked again within a level costs nothing (its result
   kept). PB_FREE.WORK is a level's (every pass and walk of a level of one game: the passes before a totals' pass leave it
   RT, a first walk leaves its pass's second walk R2, a walk's candidates leave its parlays worked in full RW), GWORK the
   Day games' groups' (GWALK of it their walks, each game's leaving GFLOOR to each game after it; the rest the groups worked
   in full, best key first across the games, leaving GR to the knapsack with groups and the parlays it gives worked on the
   card) */
const PB_W={NODE:0.3,KID:0.07,KEEP:7.5,EX:4,DRAW:0.00025,DRAW9:0.003,DP:0.3};""",
     'PB_FREE: the budgets, and PB_W')

# pbFreeCost's comment (a walk's own budget) and the level's work beside it
sub1('p3', """/* (the review of app v145) a parlay worked in full, in units of a 5-leg price (about 0.4 ms in jsdom): its price's draws,
   and, where it pays, its chance's (about 1.3 times as dear), each dearer with its legs (the draws' rows), so a level's
   passes share PB_FREE.UNITS of them and its work is bounded alike on every machine */
const pbFreeCost=(n,paid)=>{ const u=Math.max(0.4,n*n/25); return paid?2.3*u:u; };""",
     """/* (the review of app v145) a parlay worked in full, in units of a 5-leg price (about 0.4 ms in jsdom): its price's draws,
   and, where it pays, its chance's (about 1.3 times as dear), each dearer with its legs (the draws' rows): a walk's own
   budget (UNITS1, UNITS2) */
const pbFreeCost=(n,paid)=>{ const u=Math.max(0.4,n*n/25); return paid?2.3*u:u; };
/* (v146) a parlay worked in full, in the level's work (PB_W): its n legs, whether it paid (its chance drawn), and its
   same-game groups' sizes where a pair of the group moves (cg: [g, ...]; one game's set: [n] where it moves, else []) */
function pbWorkEx(n,paid,cg){
  let d=0, d9=0; const add=(o,k)=>{ if(k>=9) d9+=o; else d+=o; };
  for(const g of cg) add(20000*g*(g+1)/2,g);
  if(paid&&cg.length) add(40000*n*(n+1)/2,n);
  return PB_W.EX*n*n+d*PB_W.DRAW+d9*PB_W.DRAW9;
}
/* whether a pair of these legs (one game's) moves, as parlayProb reads it */
const pbMoves=ls=>{ for(let i=0;i<ls.length;i++) for(let j=i+1;j<ls.length;j++) if(Math.abs(legRho(ls[i],ls[j]))>=0.03) return true; return false; };
/* a walk's budget (pbTake): its own (u units, n nodes, as before) and the level's work less a reserve (res) for what comes
   after it; pbGive charges the level what the walk spent (and PB_LV_STAT.w, for the checks); seen, the level's sets worked
   in full (by id: pbExact's result, or false), each worked and charged once */
const pbTake=(LV,u,n,res)=>{ const w=LV.w-(res||0); return {u,n,w,w0:w,seen:LV.seen}; };
const pbGive=(LV,b)=>{ const s=b.w0-b.w; LV.w-=s; b.w0=b.w; PB_LV_STAT.w+=s; };""",
     'pbFreeCost, pbWorkEx, pbMoves, pbTake and pbGive')

# pbFreeCands: nodes and children charged to B.w; a candidate's set marks whether a pair of it moves (cor)
sub1('p3', """function pbFreeCands(x,I,F,cap,M,mode,thr0,rOb,fl,k,B){""",
     """function pbFreeCands(x,I,F,cap,M,mode,thr0,rOb,fl,k,B,res){
  res=res||0;""",
     "pbFreeCands' reserve")
sub1('p3', """      if(B&&--B.n<0){ out.cut=true; return; }""",
     """      if(B&&(--B.n<0||(B.w-=PB_W.NODE)<res)){ out.cut=true; return; }""",
     "pbFreeCands: a node's work")
sub1('p3', """        if(key>=thr&&key>0){ ch[d]=j; keys.push(key); const S=new Array(n); for(let a=0;a<n;a++) S[a]=L[ch[a]]; sets.push(S);""",
     """        if(key>=thr&&key>0){ ch[d]=j; keys.push(key); const S=new Array(n); for(let a=0;a<n;a++) S[a]=L[ch[a]]; S.cor=cor; sets.push(S); if(B) B.w-=PB_W.KEEP;""",
     "pbFreeCands: a candidate kept")
sub1('p3', """        const pc=P[v]*a*SIGC[v]; if(pc>p1){ p3=p2; p2=p1; p1=pc; } else if(pc>p2){ p3=p2; p2=pc; } else if(pc>p3) p3=pc; c2++; }
      if(!c2) continue;""",
     """        const pc=P[v]*a*SIGC[v]; if(pc>p1){ p3=p2; p2=p1; p1=pc; } else if(pc>p2){ p3=p2; p2=pc; } else if(pc>p3) p3=pc; c2++; }
      if(B) B.w-=PB_W.KID*(cn-s-1);
      if(!c2) continue;""",
     "pbFreeCands: the children read")

# pbFreeWalk: each parlay worked charged to B.w; stops where it is spent
sub1('p3', """  const work=e=>{ const r=pbExact(e.s.map(c=>x.L[c]),0,F), u=pbFreeCost(e.s.length,!!r); B.u-=u; PB_LV_STAT.units+=u; if(!r) return;""",
     """  const work=e=>{ let r=B.seen?B.seen.get(e.id):undefined; const hit=r!==undefined; if(!hit){ r=pbExact(e.s.map(c=>x.L[c]),0,F); if(B.seen) B.seen.set(e.id,r||false); }
    const u=pbFreeCost(e.s.length,!!r); B.u-=u; PB_LV_STAT.units+=u; if(!hit) B.w-=pbWorkEx(e.s.length,!!r,e.s.cor?[e.s.length]:[]); if(!r) return;""",
     "pbFreeWalk: a parlay worked in full")
sub1('p3', """    if(ev>=cap||B.u<=0){ cut=true; break; } ev++; work(e); }""",
     """    if(ev>=cap||B.u<=0||B.w<=0){ cut=true; break; } ev++; work(e); }""",
     "pbFreeWalk: phase 1 stops where the work is spent")
sub1('p3', """if(ev2>=PB_FREE.E2||B.u<=0) break;""",
     """if(ev2>=PB_FREE.E2||B.u<=0||B.w<=0) break;""",
     "pbFreeWalk: phase 2 stops where the work is spent")

# pbFreeSeed: the level's work and seen map, and its comment (the bar is no bound for an opposite-sign set)
sub1('p3', """/* (the review of app v145) a paying parlay to start the second walk from: the game's legs that fit taken greedily, those that
   give the most price for the chance they cost first (the log of the price over the log of the chance), each set worked in
   full (pbExact) once its legs multiplied reach F, till one pays (at most cap legs, from B's units); its chance over C at
   the cap is the second walk's bar, below which no set's reading can beat it (none where k fill legs are asked: the passes
   with a preferred list) */""",
     """/* (the review of app v145) a paying parlay to start the second walk from: the game's legs that fit taken greedily, those that
   give the most price for the chance they cost first (the log of the price over the log of the chance), each set worked in
   full (pbExact) once its legs multiplied reach F, till one pays (at most cap legs, from B's units and, app v146, the
   level's work, a set the level has worked already read from its seen map; none where k fill legs are asked: the passes
   with a preferred list). Its chance over C at the cap is the second walk's bar: a set whose reading's chance is under it
   is not kept. C is measured (the 99th percentile of the chance in full over the reading), not a bound, and an
   opposite-sign set (pbLvOpp) of 4 legs or more can run further over its reading than C at the cap (C2, 1.15 to 1.39,
   against 1.14), so the bar can let one go that is likelier than the parlay it stands on (the second review of app v145;
   accepted, app v146) */""",
     "pbFreeSeed's comment")
sub1('p3', """  for(const i of ord){ if(cur.length>=cap||B.u<=0) break; const l=x.L[i]; if(!pbFits(cur,l)) continue; cur.push(l); mult*=x.dec[i];
    if(cur.length>=2&&mult>=F*(1-1e-12)){ const r=pbExact(cur,0,F), u=pbFreeCost(cur.length,!!r); B.u-=u; PB_LV_STAT.units+=u; PB_LV_STAT.ev++; if(r) return r; } }""",
     """  for(const i of ord){ if(cur.length>=cap||B.u<=0||B.w<=0) break; const l=x.L[i]; if(!pbFits(cur,l)) continue; cur.push(l); mult*=x.dec[i];
    if(cur.length>=2&&mult>=F*(1-1e-12)){ const id=cur.map(pbId).sort().join(','); let r=B.seen?B.seen.get(id):undefined; const hit=r!==undefined; if(!hit){ r=pbExact(cur,0,F); if(B.seen) B.seen.set(id,r||false); }
      const u=pbFreeCost(cur.length,!!r); B.u-=u; PB_LV_STAT.units+=u; if(!hit) B.w-=pbWorkEx(cur.length,!!r,pbMoves(cur)?[cur.length]:[]); PB_LV_STAT.ev++; if(r) return r; } }""",
     'pbFreeSeed: the level\'s work')

# pbFreeGame: its walks draw on the level's work
sub1('p3', """/* one game, one pass: legs (fl, k: the fill legs and exactly how many) */
function pbFreeGame(x,legs,fl,k,F,cap){
  const I=legs.map(l=>pbCtxLeg(x,l)), B={u:PB_FREE.UNITS1,n:PB_FREE.NODES1};
  const c1=pbFreeCands(x,I,F,cap,PB_FREE.M,'level',0,1,fl,k,B), w1=pbFreeWalk(x,c1,F,0,B,null);
  if(w1.best&&!w1.cut&&!c1.cut) return w1.best.r;""",
     """/* one game, one pass: legs (fl, k: the fill legs and exactly how many). (app v146) LV: the level's work, which every pass of
   the level draws on (pbFreeOne makes it); a caller that wraps pbFreeGame hands it on, or each pass gets a fresh one */
function pbFreeGame(x,legs,fl,k,F,cap,LV){
  LV=LV||{w:PB_FREE.WORK,seen:new Map()};
  const I=legs.map(l=>pbCtxLeg(x,l)), B=pbTake(LV,PB_FREE.UNITS1,PB_FREE.NODES1,PB_FREE.R2);
  const c1=pbFreeCands(x,I,F,cap,PB_FREE.M,'level',0,1,fl,k,B,PB_FREE.RW), w1=pbFreeWalk(x,c1,F,0,B,null); pbGive(LV,B);
  if(w1.best&&!w1.cut&&!c1.cut) return w1.best.r;""",
     "pbFreeGame: the level's work")
sub1('p3', """  const B2={u:PB_FREE.UNITS2,n:PB_FREE.NODES2};
  if(w1.ev){ PB_LV_STAT.second++;""",
     """  const B2=pbTake(LV,PB_FREE.UNITS2,PB_FREE.NODES2);
  /* (v146) the second walk also where the first walk's candidates were cut before it worked any */
  if(w1.ev||c1.cut){ PB_LV_STAT.second++;""",
     "pbFreeGame: the second walk's budget")
sub1('p3', """    const c=pbFreeCands(x,I,F,cap,PB_FREE.M,'level1',b0?b0.pr/PB_FREE.C[cap]:0,1,fl,k,B2), w=pbFreeWalk(x,c,F,1,B2,b0); best=w.best; }
  if(w1.best) return best?best.r:null;
  B.u=Math.max(0,B.u)+Math.max(0,B2.u); B.n=Math.max(0,B.n)+Math.max(0,B2.n);
  if(c1.over) for(let M=PB_FREE.M*8;M<=PB_FREE.M*64&&B.u>0&&B.n>0;M*=8){ const c=pbFreeCands(x,I,F,cap,M,'level',0,1,fl,k,B), w=pbFreeWalk(x,c,F,0,B,best); if(w.best) best=w.best; if(w.mine||!c.over) break; }
  return best?best.r:null;
}""",
     """    const c=pbFreeCands(x,I,F,cap,PB_FREE.M,'level1',b0?b0.pr/PB_FREE.C[cap]:0,1,fl,k,B2,PB_FREE.RW), w=pbFreeWalk(x,c,F,1,B2,b0); best=w.best; }
  pbGive(LV,B2);
  if(w1.best) return best?best.r:null;
  const B3=pbTake(LV,Math.max(0,B.u)+Math.max(0,B2.u),Math.max(0,B.n)+Math.max(0,B2.n));
  if(c1.over) for(let M=PB_FREE.M*8;M<=PB_FREE.M*64&&B3.u>0&&B3.n>0&&B3.w>0;M*=8){ const c=pbFreeCands(x,I,F,cap,M,'level',0,1,fl,k,B3), w=pbFreeWalk(x,c,F,0,B3,best); if(w.best) best=w.best; if(w.mine||!c.over) break; }
  pbGive(LV,B3);
  return best?best.r:null;
}""",
     "pbFreeGame: the wider runs' budget")

# pbFreeOne: one level's work for every pass; a reserve for the totals' pass
sub1('p3', """function pbFreeOne(pool,F,memo,cap){
  const x=pbCtx(memo), P=pool.pref, base=[...P,...pool.thin];
  if(P.length){ const fl=base.map((l,i)=>i>=P.length);
    for(let k=0;k<=cap&&k<=pool.thin.length;k++){ const r=pbFreeGame(x,base,fl,k,F,cap); if(r) return r; } }
  else { const r=pbFreeGame(x,base,null,null,F,cap); if(r) return r; }
  const mk=pool.mkt||[], nT=new Set(mk.map(l=>l.gid)).size; if(!nT) return null;
  const all=[...base,...mk], fl=all.map((l,i)=>i>=base.length);
  for(let k=1;k<=nT;k++){ const r=pbFreeGame(x,all,fl,k,F,cap); if(r) return r; }
  return null;
}""",
     """function pbFreeOne(pool,F,memo,cap){
  const x=pbCtx(memo), P=pool.pref, base=[...P,...pool.thin], mk=pool.mkt||[], nT=new Set(mk.map(l=>l.gid)).size;
  /* (v146) the level's work, every pass drawing on it: those before the totals' pass leave it RT, whether or not the pool has
     a total, so a level with no total is the same parlay on the pool without its totals (the audit holds it so) */
  const LV={w:PB_FREE.WORK,seen:new Map()}, LV0={w:LV.w-PB_FREE.RT,seen:LV.seen}, w00=LV0.w;
  let r=null;
  if(P.length){ const fl=base.map((l,i)=>i>=P.length);
    for(let k=0;k<=cap&&k<=pool.thin.length&&!r;k++) r=pbFreeGame(x,base,fl,k,F,cap,LV0); }
  else r=pbFreeGame(x,base,null,null,F,cap,LV0);
  LV.w-=w00-LV0.w;
  if(r) return r; if(!nT) return null;
  const all=[...base,...mk], fl=all.map((l,i)=>i>=base.length);
  for(let k=1;k<=nT;k++){ const r=pbFreeGame(x,all,fl,k,F,cap,LV); if(r) return r; }
  return null;
}""",
     "pbFreeOne: the level's work")

# pbFreeDp: a budget its steps draw on
sub1('p3', """/* the knapsack across games: G, a game's options each {c, d, n, ln, legs, t (its fill count)}; k: exactly how many fill legs
   (none, null); tol: how far under the best a complete parlay is returned */
function pbFreeDp(G0,F,cap,tol,k){""",
     """/* the knapsack across games: G, a game's options each {c, d, n, ln, legs, t (its fill count)}; k: exactly how many fill legs
   (none, null); tol: how far under the best a complete parlay is returned; W: (v146) a budget its steps draw on (PB_W.DP a
   partial taken with an option), the knapsack ending where it is spent (cut) with what it found (none: where every option
   is a single leg) */
function pbFreeDp(G0,F,cap,tol,k,W){""",
     "pbFreeDp's budget")
sub1('p3', """  for(let i=0;i<m;i++){ const nx=Pp.slice();
    for(const p of Pp) for(const o of G[i]){ const n=p.n+o.n; if(n>cap) continue; const tt=p.t+(o.t||0); if(k!=null&&tt>k) continue;""",
     """  let cut=false;
  for(let i=0;i<m&&!cut;i++){ const nx=Pp.slice();
    stage: for(const p of Pp) for(const o of G[i]){ if(W){ PB_LV_STAT.dp++; if((W.w-=PB_W.DP)<0){ cut=true; break stage; } } const n=p.n+o.n; if(n>cap) continue; const tt=p.t+(o.t||0); if(k!=null&&tt>k) continue;""",
     "pbFreeDp: a step's work")
sub1('p3', """  done=done.filter(q=>q.kc>=low); done.sort((a,b)=>(b.c-a.c)||(a.n-b.n)||(b.ln-a.ln)); return {best,done};""",
     """  done=done.filter(q=>q.kc>=low); done.sort((a,b)=>(b.c-a.c)||(a.n-b.n)||(b.ln-a.ln)); return {best,done,cut};""",
     'pbFreeDp: cut')

# pbFreeUnit: the groups' work
sub1('p3', """  const FMg=Math.max(PB_FREE.FM,Math.floor(PB_FREE.FMT/pools.length));
  const pass=(withTot,fillOf,k)=>{""",
     """  const FMg=Math.max(PB_FREE.FM,Math.floor(PB_FREE.FMT/pools.length));
  /* (v146) the groups' work (GWORK), every pass and try of the level drawing on it: their walks GWALK of it (GV, each game's
     leaving GFLOOR to each game after it), then the groups worked in full, the games' together best key first, each once
     (kept from try to try: pbExact the same each time), leaving GR to the knapsack with groups and the parlays it gives
     worked on the card (the first always) */
  const GV={w:PB_FREE.GWALK}, GB={w:PB_FREE.GWORK-PB_FREE.GWALK}, seen=new Map();
  const pass=(withTot,fillOf,k)=>{""",
     "pbFreeUnit: the groups' work")
sub1('p3', """    let r0=pbFreeDp(singles,F,cap,0,k), opts=singles; const cb=r0.best;""",
     """    const rS=pbFreeDp(singles,F,cap,0,k); let r0=rS, opts=singles; const cb=rS.best;""",
     "pbFreeUnit: the singles' knapsack kept")
sub1('p3', """      pools.forEach((p,gi)=>{ const legs=legsOf(p); if(legs.length<2) return; const I=legs.map(l=>pbCtxLeg(x,l));
        const cnd=pbFreeCands(x,I,F,cap,FMg,'front',thr/PB_FREE.FRONT,rOb,null,null);
        for(const s of cnd.set){ const ls=s.map(c=>x.L[c]), ex=pbExact(ls,0,0); if(!ex) continue;
          const c=ex.corr, d=ex.dec, key=d>=F?c:c*rOb*d/F; if(key<thr) continue;
          o2[gi].push({c,d,n:ls.length,ln:ls.reduce((a,l)=>a+pbLean(l),0),legs:ls,grp:1,t:fillN(ls),id:ls.map(pbId).sort().join(',')}); added++; } });
      const r=added?pbFreeDp(o2.map(srt),F,cap,0,k):r0;
      if(r.best>=thr||tries>=PB_FREE.TRIES){ r0=r; opts=o2.map(srt); break; }
      thr=r.best>0?r.best:thr/4; }
    PB_LV_STAT.groups+=added;
    const r1=pbFreeDp(opts,F,cap,added?PB_FREE.WIN:PB_FREE.BORDER,k);
    let best=null, ev=0;
    for(const q of r1.done){ if(ev>=PB_FREE.WIN_EVALS) break; const legs=q.o.flatMap(o=>o.legs);
      if(!legs.every((l,i)=>pbFits(legs.slice(0,i),l))) continue;
      ev++; const ex=pbExact(legs,0,F); if(!ex) continue;""",
     """      const live=pools.map((p,gi)=>gi).filter(gi=>legsOf(pools[gi]).length>=2), E=[];
      live.forEach((gi,j)=>{ const legs=legsOf(pools[gi]), I=legs.map(l=>pbCtxLeg(x,l));
        const Bw=pbTake(GV,Infinity,Infinity,(live.length-j-1)*PB_FREE.GFLOOR), cnd=pbFreeCands(x,I,F,cap,FMg,'front',thr/PB_FREE.FRONT,rOb,null,null,Bw); pbGive(GV,Bw);
        cnd.set.forEach((s,i)=>{ const ls=s.map(c=>x.L[c]); E.push({gi,ls,cor:!!s.cor,key:cnd.key[i],id:ls.map(pbId).sort().join(',')}); }); });
      E.sort((a,b)=>(pbEvKey(b.key)-pbEvKey(a.key))||(a.id<b.id?-1:a.id>b.id?1:0));
      for(const e of E){ const ls=e.ls; let ex=seen.get(e.id);
        if(ex===undefined){ if(GB.w<=PB_FREE.GR) continue; ex=pbExact(ls,0,0)||null; GB.w-=pbWorkEx(ls.length,true,e.cor?[ls.length]:[]); seen.set(e.id,ex); }
        if(!ex) continue;
        const c=ex.corr, d=ex.dec, key=d>=F?c:c*rOb*d/F; if(key<thr) continue;
        o2[e.gi].push({c,d,n:ls.length,ln:ls.reduce((a,l)=>a+pbLean(l),0),legs:ls,grp:1,cor:e.cor,t:fillN(ls),id:e.id}); added++; }
      /* (v146) the knapsack with groups keeps the parlays within WIN of its best (its best the same at any tol), so the last
         try's is the one worked on the card */
      const r=added?pbFreeDp(o2.map(srt),F,cap,PB_FREE.WIN,k,GB):r0;
      if(r.best>=thr||tries>=PB_FREE.TRIES||r.cut||GB.w<=PB_FREE.GR||GV.w<=0){ r0=r; opts=o2.map(srt); break; }
      thr=r.best>0?r.best:thr/4; }
    PB_LV_STAT.groups+=added;
    const r1=added?r0:pbFreeDp(opts,F,cap,PB_FREE.BORDER,k);
    /* a knapsack cut by the budget: the singles' own complete parlays beside what it found */
    let done=r1.done; if(r1.cut){ const sk=new Set(done.map(q=>q.o.map(o=>o.id).join('|'))); done=done.concat(rS.done.filter(q=>!sk.has(q.o.map(o=>o.id).join('|')))).sort((a,b)=>(b.c-a.c)||(a.n-b.n)||(b.ln-a.ln)); }
    let best=null, ev=0;
    for(const q of done){ if(ev>=PB_FREE.WIN_EVALS||(added&&best&&GB.w<=0)) break; const legs=q.o.flatMap(o=>o.legs);
      if(!legs.every((l,i)=>pbFits(legs.slice(0,i),l))) continue;
      ev++; const ex=pbExact(legs,0,F); if(added) GB.w-=pbWorkEx(legs.length,!!ex,q.o.filter(o=>o.cor).map(o=>o.n)); if(!ex) continue;""",
     "pbFreeUnit: the groups worked within the budget")
# the card's walk in the rule's order, so a walk the groups' budget cuts keeps the rule's first
sub1('p3', """    let best=null, ev=0;
    for(const q of done){ if(ev>=PB_FREE.WIN_EVALS||(added&&best&&GB.w<=0)) break;""",
     """    /* (v146) the card's walk in the rule's order (pbFreeRank's on the knapsack's figures: the chance to 1e-9, the fewer
       legs, the larger lean to 1e-9, the lower id by enCmp), so a walk the groups' budget or WIN_EVALS cuts keeps the
       rule's first */
    { const qid=q=>q.id||(q.id=q.o.flatMap(o=>o.legs).map(pbId).sort().join(',')); done=done.slice().sort((a,b)=>(b.kc-a.kc)||(a.n-b.n)||(b.kl-a.kl)||enCmp(qid(a),qid(b))); }
    let best=null, ev=0;
    for(const q of done){ if(ev>=PB_FREE.WIN_EVALS||(added&&best&&GB.w<=0)) break;""",
     "pbFreeUnit: the card's walk in the rule's order")
# the group work counted, a pass at a time (the checks read PB_LV_STAT.gw and dp)
sub1('p3', """    const legsOf=p=>[...p.pref,...p.thin,...(withTot?p.mkt||[]:[])], fillN=ls=>fillOf?ls.reduce((a,l)=>a+fillOf(l),0):0;""",
     """    const legsOf=p=>[...p.pref,...p.thin,...(withTot?p.mkt||[]:[])], fillN=ls=>fillOf?ls.reduce((a,l)=>a+fillOf(l),0):0, g0=GB.w+GV.w;""",
     "pbFreeUnit: the groups' work at a pass's start")
sub1('p3', """    PB_LV_STAT.ev+=ev; PB_LV_STAT.runs++;
    return best?best.r:null; };""",
     """    PB_LV_STAT.ev+=ev; PB_LV_STAT.runs++; PB_LV_STAT.gw+=g0-GB.w-GV.w;
    return best?best.r:null; };""",
     "pbFreeUnit: the groups' work counted")
# the prune's scanned keys counted (PB_LV_STAT.pk, drawn nowhere), for the checks: a prune run on every push past twice M
# (quadratic on ties: about 1.8 billion keys and 56 s on 24 tied legs' Extreme, where the page scans about 1.3 million) shows
# on the count, the clock unread
sub1('p3', """  const prune=()=>{ const kth=""",
     """  const prune=()=>{ PB_LV_STAT.pk+=keys.length; const kth=""",
     "pbFreeCands' prune: its keys counted")
# the groups' budget spent with nothing found: the greedy paying set across the games
sub1('p3', """  for(let k=1;k<=nT;k++){ const r=pass(true,l=>l.market?1:0,k); if(r) return r; }
  return null;
}""",
     """  for(let k=1;k<=nT;k++){ const r=pass(true,l=>l.market?1:0,k); if(r) return r; }
  /* (the review of app v146) every pass ended with nothing found (a slate of a few day games whose single legs cannot reach
     the price, its tries ending on the groups' walks before the threshold comes down): the greedy paying set across the
     games (pbFreeSeed, as the one-game path seeds its second walk), the legs without the totals first, on what is left of
     the groups' work and charged to it; none where no greedy set pays (a preferred list's passes take none) */
  if(!pools.some(p=>p.pref.length)){ const seen2=new Map();
    for(const wt of nT?[false,true]:[false]){ const I=pools.flatMap(p=>[...p.thin,...(wt?p.mkt||[]:[])]).map(l=>pbCtxLeg(x,l)), B={u:PB_FREE.UNITS2,n:PB_FREE.NODES2,w:GB.w,seen:seen2}, w0=B.w;
      const sd=pbFreeSeed(x,I,F,cap,null,null,B); GB.w=B.w; PB_LV_STAT.gw+=w0-B.w; if(sd) return sd; } }
  return null;
}""",
     "pbFreeUnit: the greedy paying set where every pass found none")

# the search's docstring: the budgets named, and where their measurements are
sub1('p3', """   The complete parlays within PB_FREE.WIN of the best (BORDER with no group) are worked on the card, at most WIN_EVALS, every
   pair held to pbFits, the likeliest that pays by pbFreeRank.""",
     """   The complete parlays within PB_FREE.WIN of the best (BORDER with no group) are worked on the card, at most WIN_EVALS, every
   pair held to pbFits, the likeliest that pays by pbFreeRank. (app v146) The groups' walks, the groups worked in full and
   the knapsack with groups draw on one work budget a level (PB_FREE.GWORK), and every pass and walk of a level of one game
   on another (PB_FREE.WORK), each counted in PB_W, never timed.""",
     'the search docstring: the budgets')
sub1('p3', """   How close it comes to an independent enumeration of every parlay, and how fast, is in patch_free_legs.py's docstring.""",
     """   How close it comes to an independent enumeration of every parlay, and how fast, is in patch_free_legs.py's docstring
   (app v146's budgets, and what they cost, in patch_free_legs_review.py's).""",
     'the search docstring: where the measurements are')

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched', ', '.join(str(p.name) for p in FILES.values()))
