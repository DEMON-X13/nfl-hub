"""Week 5 narrative: the Rams' sacks allowed, without a rank that moves under it.

tools/patch_week5_ranks.py (October 9, 2026) swapped a Deep Dive number in the Rams' matchup bullet
for a TeamRankings one: "the Rams allow only 1.5 sacks a game, tied 5th". That was true through
Week 4, but stats2026.js is season to date and takes in each game as it is played: with Dallas's
Thursday game in it, Dallas went from 1.5 to 1.2 a game and the Rams' 1.5 reads tied 6th beside the
bullet. A league rank on a season-to-date stat is only true on the day it is written, and any other
team's game can move it, so the bullet keeps the number and its source and drops the place. Run
once, from news/, on the Week 5 file as committed after patch_week5_ranks.py:
  python3 tools/patch_week5_sacks.py
"""
from pathlib import Path

P = Path(__file__).resolve().parent.parent / "data" / "week5.js"
s = P.read_text(encoding="utf-8")


def sub1(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)


sub1("though the Rams allow only 1.5 sacks a game, tied 5th.",
     "though the Rams allow only 1.5 sacks a game, per TeamRankings.")

P.write_text(s, encoding="utf-8")
print("week5.js: the Rams' sacks allowed without a moving rank")
