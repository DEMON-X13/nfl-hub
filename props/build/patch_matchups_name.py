r"""app v110: the board the Game bets card points to is the Matchups tab.

The owner, 16 October 2026: "change the name Pickems to matchups". The hub's first tab, the board of
the week's games that opens each game's Game snapshot, is named Matchups on the page now
(nflbets/build/build.js's TABS; its section and button keep the id pickems, which the tab switch in
part3.js reads, and its old address, #pickems, lands on it as #matchups). The prop model names that
board in one place a visitor reads: the Game bets card's "Lines:" note on a game's page, where the game's
lines are nflverse's posted line rather than DraftKings' pull (lineSource). It reads "as on the Matchups
tab" now, and the comment over it names the board the same way. Nothing else moves: no number, no rule,
no check reads those words (the audit holds only that lineSource answers).

The version is v110, not v109: another change in flight on 16 October 2026 takes v109.
"""
import io

def sub1(s, old, new, what):
    assert s.count(old) == 1, f'{what}: expected the old text exactly once, found {s.count(old)}'
    return s.replace(old, new)

p = 'part2.js'
s = io.open(p, encoding='utf-8').read()
s = sub1(s, """/* where a game's lines came from: DraftKings' pull while it is under a day old, nflverse's
   posted line (the Pick'ems board's) after that. null for a payload that does not say. */""",
    """/* where a game's lines came from: DraftKings' pull while it is under a day old, nflverse's
   posted line (the Matchups tab's, the board Pick'ems was until 16 October 2026) after that. null
   for a payload that does not say. */""", 'the comment over lineSource')
s = sub1(s, """  return "nflverse's posted line, as on the Pick'ems board";""",
    """  return "nflverse's posted line, as on the Matchups tab";""", "lineSource's nflverse wording")
s = sub1(s, "const APP_BUILD='app v109 \\u00b7 2026-10-16';", "const APP_BUILD='app v110 \\u00b7 2026-10-16';", 'APP_BUILD')
io.open(p, 'w', encoding='utf-8').write(s)
print('patched: app v110, the Game bets card names the Matchups tab')
