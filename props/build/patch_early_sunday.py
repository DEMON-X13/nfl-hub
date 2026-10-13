r"""app v103: the page says Sunday's early games get no DraftKings player prices.

From 13 October 2026 the price pull never buys player prices for Sunday's early games, every Sunday
kickoff before 4pm Eastern: the 1pm window, London and the other morning games abroad (the owner's
call: "i rarely if ever do player props for that and usually like to do them for afternoon and night
games only"). oddsfetch.py's early_sunday() is the rule; about 9 of a week's games at 6 credits each,
so the odds API's free 500 credits a month now cover a five-week month with room over. Those games
keep their DraftKings moneylines, spreads and totals, which come in the slate's one game-lines call.

The page said a game's player prices "are pulled on game day or the day before, Sunday's games on
Saturday morning", which would now promise prices that never come for most of the Sunday slate. It
now says the afternoon and night games are pulled on Saturday morning and the early games never, in
the Parlay Builder's empty tiers (PB_NO_PL) and its two notes; the parlay card (nflbets/build/card.html)
and the audit and smoke strings say the same. Nothing else changes: an early game's player legs are
still shown at the model's own estimate, as any game without a book price always was.

Every edit is made in memory and asserted to match exactly as often as expected; nothing is written
unless all of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}

BS = chr(92)   # the parts write non-ASCII as JS escapes; ~uXXXX here stands for one


def sub(k, old, new, n=1):
    old, new = old.replace('~u', BS + 'u'), new.replace('~u', BS + 'u')
    s = T[k]
    assert s.count(old) == n, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub('p2', r"const APP_BUILD='app v102 ~u00b7 2026-10-12';", r"const APP_BUILD='app v103 ~u00b7 2026-10-13';")
sub('p3', "Sunday’s games on Saturday morning",
    "Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET)", n=3)
sub('p3', """   game on Thursday, Monday's on Monday, a Friday game's on Thursday, and Saturday's games and the
   whole Sunday slate on Saturday morning (on the site by about 7:50am Pacific). With player bets""",
    """   game on Thursday, Monday's on Monday, a Friday game's on Thursday, and Saturday's games and
   Sunday's afternoon and night games on Saturday morning (on the site by about 7:50am Pacific);
   Sunday's early games, before 4pm Eastern, never (oddsfetch.py's early_sunday). With player bets""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print("patched: app v103, Sunday's early games get no DraftKings player prices, and the page says so")
