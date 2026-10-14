"""Week 5 narrative: take out the three ELO Ratings tab ranks it still quoted.

The October 9 clean-up (patch_week5_ranks.py) took out every Deep Dive and rank chip rank, but three
sentences quoted X NFL Bets' ELO Ratings tab under the name its unit tables had then, "Total Offense"
and "Total Defense": Minnesota's offense 27th (twice) and the Jets' defense 7th with Cleveland's offense
19th. The tables were renamed Overall Offense and Overall Defense, and their ranks move with every run
(on October 13, after last season was carried into them, Minnesota's offense was 29th and Cleveland's
32nd), so the sentences no longer matched the tab they named. The smoke test's check missed them
because it looked only for the new name; it now knows the old one and the tab's own name too
(RANK_QUOTE in tools/lib.js, the site-ranks case in tools/cases.js).

Each sentence keeps its outside numbers (the field goals, the yards a play and red zone rate, the points
and yards a play allowed) and drops the site's rank. Run once, from news/, on the Week 5 file as
committed in e498ccd:  python3 tools/patch_week5_totals.py
"""
from pathlib import Path

P = Path(__file__).resolve().parent.parent / "data" / "week5.js"
s = P.read_text(encoding="utf-8")


def sub1(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)


sub1("field goals and no touchdowns, and the site's ELO Ratings tab ranks Minnesota's Total Offense 27th; New Orleans lost",
     "field goals and no touchdowns; New Orleans lost")
sub1("score touchdowns on 50 percent of red zone trips, tied for 23rd, and the site's ELO Ratings tab ranks their Total Offense 27th.\"",
     "score touchdowns on 50 percent of red zone trips, tied for 23rd.\"")
sub1("and 5.0 yards a play, tied for 6th; the site's ELO Ratings tab ranks the Jets' Total Defense 7th and Cleveland's Total Offense 19th.\"",
     "and 5.0 yards a play, tied for 6th.\"")
P.write_text(s, encoding="utf-8")
print("week5.js: 3 site ranks taken out")
