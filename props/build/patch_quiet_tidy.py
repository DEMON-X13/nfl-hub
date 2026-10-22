"""app v130 (the tidy after the seven areas met): one wording for each state the props parts say in more than one place.

The owner's call of 22 October 2026:

  "in all sections get rid of all text wall descriptions. i dont want any descriptions anywhere. i want the site to
  speak for itself without a bunch of reading."

Seven areas took their descriptions off the page each on its own (patch_quiet_props.py, patch_quiet_builder.py and
patch_quiet_suggest.py here, in that order, and the hub's sources beside them), and the review of the merge found the
same state said three ways across three tabs: a page that speaks for itself says one thing one way. This applies after
the other three:

1. The season over on the Parlay Builder: "Regular season over.", as Suggested Parlays says it (the builder said
   "Season over."). The Props list's card keeps its bold "The 2026 regular season is over.", the one line it has.
2. The est. line under the builder's legs and the Top 30 lines (espnReadLine): "Price est. from DraftKings' line, read
   Tue 8:07 AM ET.", the words a Suggested Parlays card's line (pbEspnLine) already says, the builder keeping its
   " (30h ago)" before the full stop where a leg it holds was read more than a day before (a leg in the builder keeps
   the price it was added at). It said "est.: estimated from DraftKings' line, read ...".
3. No player lines: one phrase, "no player lines yet (read Tue 8:07 AM ET)" or, never read, "player lines not read yet"
   (noPlSay), which the Parlay Builder's reasons (pbNoPl: "No line qualifies yet: no player lines yet (read ...).", the
   list's note "No player lines yet (read ...).") and a set's (spNoPl: "Only 3 legs in this game: no player lines yet
   (read ...).") are both made of; the builder said "no player lines (read ...)", without "yet". An Elo level says it
   of its unit, "in this game" or "in the Sunday slot" both ways: "No player lines in this game yet (read ...)." and
   "No player lines in this game read yet." (it said "No player lines read yet.", dropping where). The status line's
   "· no player lines yet" was already the phrase.
4. "The site's Elo picks were not published in time." reads "Elo picks not published in time.", as the Sunday slot's
   line under way says "Not published in time."
5. The rules no element wears any more, taken out of part1.html's styles: .pb-lead (the Top 30 lines' and Suggested
   Parlays' leads), .pb-foot (their foots), .pb-amt-hint (the Bet amount's hint), .pb-sum-hint (the games list's
   "tap to choose") and .fair-note (the builder's fair-chance note). .pb-topsub stays: the Value picks' "No line on
   your picks is a Value pick right now." still wears it.

The parlay card's clash line (card.html) drops its parenthetical as the builder's did, the Game snapshot's "Not rated
yet: BUF 2" names its players, and the header's .tagline rule (theme.css) goes; those are the hub's own sources, edited
there. Nothing about which legs a level takes, its numbers, its lock or the record moves: the record takes an empty
level's new why on its next run before the lock, as it takes any set that has changed, and a locked entry keeps its
words. APP_BUILD stays app v130 (patch_quiet_props.py moved it).
"""
import io

FILES = {'p1': 'part1.html', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert "The site’s Elo picks were not published in time." in T['p3'], 'patch_quiet_tidy.py has already been applied'
assert 'Price est. from DraftKings’ line' in T['p3'] and 'no player lines yet (read ' in T['p3'], \
    'patch_quiet_tidy.py applies after patch_quiet_props.py, patch_quiet_builder.py and patch_quiet_suggest.py'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


# 1. the season over, one way on both tabs
sub1('p3', """    <p class="pb-none">${seasonOver()?'Season over.':`No week ${w} games left.`}</p></div>`;""",
     """    <p class="pb-none">${seasonOver()?'Regular season over.':`No week ${w} games left.`}</p></div>`;""", 'pbPanel: the season over')

# 2. the est. line, the builder's and the Top 30's in a set card's words
sub1('p3', """  return `est.: estimated from DraftKings’ line, read ${espnWhen(t)}`+(h>DK_EST.staleHours?` (${Math.round(h)}h ago)`:'')+'.';""",
     """  return `Price est. from DraftKings’ line, read ${espnWhen(t)}`+(h>DK_EST.staleHours?` (${Math.round(h)}h ago)`:'')+'.';""",
     'espnReadLine: the est. line')

# 3. no player lines: one phrase, which the builder's and a set's reasons are made of
sub1('p3', """/* (app v125) no player line on these games (ids; none: the week's games still to come): DraftKings had posted none
   when its lines were last read from ESPN (the published read or a press, espnLastRead), or they have not been read */
function pbNoPl(ids){ const at=espnLastRead(ids||pbGames().map(g=>g.id));
  return at?`no player lines (read ${espnWhen(at)}).`:'player lines not read yet.'; }""",
     """/* (app v130) the one phrase for no player lines, every such reason made of it: DraftKings had posted none when its
   lines were last read from ESPN at t (the published read or a press, espnLastRead), or they have not been read */
const noPlSay=t=>t?`no player lines yet (read ${espnWhen(t)})`:'player lines not read yet';
/* (app v125) no player line on these games (ids; none: the week's games still to come) */
function pbNoPl(ids){ return noPlSay(espnLastRead(ids||pbGames().map(g=>g.id)))+'.'; }""", 'pbNoPl')
sub1('p3', """function spNoPl(g){ const t=espnLastRead(spGamesOf(g).map(x=>x.id));
  return t?`no player lines yet (read ${espnWhen(t)}).`:'player lines not read yet.'; }""",
     """function spNoPl(g){ return noPlSay(espnLastRead(spGamesOf(g).map(x=>x.id)))+'.'; }""", 'spNoPl')
sub1('p3', """      const why=s.plNoId?`No player leg with a DraftKings id ${where}.`:t?`No player lines ${where} yet (read ${espnWhen(t)}).`:'No player lines read yet.';""",
     """      const why=s.plNoId?`No player leg with a DraftKings id ${where}.`:t?`No player lines ${where} yet (read ${espnWhen(t)}).`:`No player lines ${where} read yet.`;""",
     "spEloSet: an empty Elo level's why")

# 4. the Elo picks not published in time, as the slot's line says it
sub1('p3', """<p class="pb-why" data-sp-elo-none>The site’s Elo picks were not published in time.</p>""",
     """<p class="pb-why" data-sp-elo-none>Elo picks not published in time.</p>""", 'spGameHtml: the Elo picks not published')

# 5. the rules no element wears any more
for rule, what in (('.pb-lead{margin:0 0 14px;font-size:13px}\n', '.pb-lead'),
                   ('.pb-amt-hint{font-size:12px;color:var(--muted)}\n', '.pb-amt-hint'),
                   ('.pb-games[open] .pb-sum-hint{display:none}\n.pb-sum-hint{color:var(--muted);font-size:12px}\n', '.pb-sum-hint'),
                   ('.fair-note{margin:8px 0 0;font-size:12px}\n', '.fair-note'),
                   ('.pb-foot{margin:12px 0 0;font-size:12px}\n', '.pb-foot')):
    sub1('p1', rule, '', what)

for gone in ("'Season over.'", 'est.: estimated', 'no player lines (read', "'No player lines read yet.'",
             'The site’s Elo picks were not published'):
    assert gone not in T['p3'], gone
for gone in ('.pb-lead', '.pb-foot', 'pb-amt-hint', 'pb-sum-hint', 'fair-note'):
    assert gone not in T['p1'] and gone not in T['p3'], gone
assert T['p3'].count('noPlSay(') == 2 and '.pb-topsub{' in T['p1'] and 'pb-topsub' in T['p3']

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: one wording for each state said in more than one place, and the rules no element wears (app v130)')
