r"""app v105: the Game bets card is back on each game's page on the Props tab.

The owner asked on 14 October 2026 for the game bets (to win and to cover for both sides, and the
game total over and under) to live on the Props tab instead of under each game on the Pick'ems
board. App v75 (patch_cleanup.py) had taken the card off the game page because the Pick'ems tab
opened it under every game; this puts it back where it stood before that, after the game's own
suggested parlays, and the Pick'ems tab stops drawing it (nflbets/build/tab_pickems.html: an opened
game there keeps its Game snapshot button and gains one that opens the game's page on the Props
tab). The card itself is unchanged: the same function, on the same schedule row, ticked through the
same toggleLeg, which redraws the game page, so a tick shows at once and a total's other side comes
off.

The audit's game-page check flips: a game page carries the Game bets card, after its suggested
parlays.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}

BS = chr(92)   # the parts write non-ASCII as JS escapes; ~uXXXX here stands for one


def sub1(k, old, new):
    old, new = old.replace('~u', BS + 'u'), new.replace('~u', BS + 'u')
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v104 ~u00b7 2026-10-13';", r"const APP_BUILD='app v105 ~u00b7 2026-10-14';")
sub1('p3', "/* the Game bets card at the top of a game: both teams, to win and to cover, and the game total */",
     "/* the Game bets card on a game's page, after its suggested parlays: both teams, to win and to cover,\n"
     "   and the game total (the owner's call, 14 October 2026: game bets live on the Props tab) */")
sub1('p3', "  html+=gameSuggestCard(g,locked);\n  if(!showRungs()",
     "  html+=gameSuggestCard(g,locked);\n  html+=gameBetsCard(g,locked);\n  if(!showRungs()")
sub1('audit', "    /* the game bets open under each game on the Pick'ems tab; a game page here is its players */\n"
     "    chk(!!d.querySelector('#gameView .gsugg')&&!d.querySelector('#gameView .gbets'),'the game page still carries the Game bets card');",
     "    /* the game bets are on the game's page (app v105), after its suggested parlays */\n"
     "    { const gs=d.querySelector('#gameView .gsugg'), gb=d.querySelector('#gameView .gbets');\n"
     "      chk(!!gs&&!!gb&&d.querySelectorAll('#gameView .gbets').length===1&&!!(gs.compareDocumentPosition(gb)&4),'the game page does not carry the Game bets card once, after its suggested parlays'); }")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: app v105, the Game bets card on the game page again')
