r"""app v123: a mixed parlay keeps its all-legs link, in its own colour, with the games' links as the fallback.

The owner, 20 October 2026, the day app v121 gave a same-game parlay mixed with legs of other games a link for each
game in place of the one link: "do you think maybe we can add a different color button for all legs parlays on top of
the individual ones? id like to still test those but have the inidividuals as a fallback plan". So the parlay card
(nflbets/build/card.html, not a props part) draws the all-legs link again on such a parlay, first, in ice where the
games' links are the hub's gold ("Open all 3 legs in DraftKings", theme.css's .pc-actions .btn.pc-dkall, both looks),
says it may not open and that the games' links are there for when it does not, and Share link sends it first with
the games' links after it. A parlay of one leg a game, or of one game, is as it was: one link.

The props part here is the builder's line about a mix (data-pb-multigame), which said DraftKings' betslip link does
not open that mix: it now says it may not, and that the card gives each game a link of its own beside one that tries
them on one slip. Nothing about which legs a suggestion takes, or when the line is drawn, moves.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'beside one that tries them on one slip' not in T['p3'], 'patch_dk_all.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v122 \\u00b7 2026-10-20';", "const APP_BUILD='app v123 \\u00b7 2026-10-20';", 'APP_BUILD')

sub1('p3', """These legs mix a same-game parlay with other games. DraftKings’ betslip link does not open that mix, so the parlay card gives each of the ${nG} games a link of its own.</p>`; } }""",
     """These legs mix a same-game parlay with other games. DraftKings’ betslip may not open that mix as one, so the parlay card gives each of the ${nG} games a link of its own beside one that tries them on one slip.</p>`; } }""",
     'builder multigame note')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v123, the all-legs link kept on a mixed parlay, the games\' links its fallback')
