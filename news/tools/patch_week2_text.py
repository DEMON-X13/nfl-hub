"""Week 2 headline and intro: the games, not the building. Owner's request, 2026-09-15.

Marquee games picked from the numbers: both teams' power rank (betting model Elo), the spread,
the total and division. Detroit at Buffalo (13 and 2, both 1-0, highest total 53.5),
Jacksonville at Denver (5 and 10, Denver by 2.5), Minnesota at Chicago (7 and 12, division,
both 1-0, Chicago by 5.5). Quarterback facts are the ones the Week 2 build already sourced.
"""
from pathlib import Path

P = Path(__file__).resolve().parent.parent / "data" / "week2.js"
s = P.read_text(encoding="utf-8")


def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:80])
    s = s.replace(old, new)


sub('"headline": "A new Buffalo stadium, and three teams changing quarterbacks"',
    '"headline": "Detroit at Buffalo leads a week of top 15 showdowns"')
sub('"intro": "Week 2 opens Thursday with the first regular season game in the new Highmark Stadium, Detroit at Buffalo, both teams 1-0 and the highest total on the board at 53.5. '
    'Three offenses arrive unsettled at quarterback: Kyler Murray is in concussion protocol in Minnesota, Sam Darnold is out for Seattle with a glute injury that could cost him four to six weeks, and Atlanta had not named a starter as of Monday. '
    'Three games pair 0-1 teams against each other, so by Monday night six clubs will have been sorted into 2-0 or 0-2."',
    '"intro": "Thursday night opens with Detroit at Buffalo, two 1-0 teams ranked 13th and 2nd in the power rankings, with the highest total on the board at 53.5. '
    'Sunday has two more games between top 15 teams: Jacksonville at Denver, 5th against 10th with Denver favored by only 2.5, and Minnesota at Chicago, a 1-0 division matchup with Chicago laying 5.5. '
    'Quarterback news hangs over several games, with Kyler Murray in concussion protocol for Minnesota, Sam Darnold out for Seattle at Arizona, and Atlanta without a named starter as of Monday."')
sub('"note": "The first regular season game in the new Highmark Stadium, and both teams arrive 1-0."',
    '"note": "Thursday night between two 1-0 teams, with the highest total on the board at 53.5."')
sub('"headline": "A new building, and a 96 yard drive to open the year"',
    '"headline": "A 96 yard drive to open the year, and Detroit on a short week"')
sub(',\n        "<strong>The building is new and full.</strong> Thursday is the first regular season game ever played in the new Highmark Stadium."\n',
    '\n')
P.write_text(s, encoding="utf-8", newline="\n")
print("week2.js text updated")
