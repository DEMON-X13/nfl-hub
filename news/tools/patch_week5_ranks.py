"""Week 5 narrative: take out every rank it quoted from the site's own Deep Dive and rank chip.

The Week 5 file was written on October 7 from the Deep Dive as it stood then. On October 8 the
Deep Dive's formula changed (PR #196: the receivers rated on what they gain, the line and the front
on the same numbers, pressure no longer counting a sack twice), and on October 9 the rank chip moved
to X NFL Bets' Team Rankings. By then 146 of the 192 unit ranks the narrative quoted had moved, so
nearly every overlay showed two ranks for the same unit: "the secondary ranks 26th in the site's
units" in Baltimore's Negatives over a Deep Dive row reading "Coverage 14th". The narrative also
repeated the three numbers the formula change removed (pressure as sacks plus QB hits per dropback,
interceptions plus passes defended per dropback, yards after the catch per catch), the 20-plus throw
share, and unattributed sack rates, EPA and yards a carry that were the Deep Dive's 2025-blended
numbers, not this season's.

So every "Nth in the tracker", "in the site's units", "site's unit grades / numbers" and "power
ratings / power rank" claim goes, with the removed metrics and the blended numbers. The bullets keep
what came from outside sources (nflverse, TeamRankings, ESPN, Sharp, the beat writers), and a bold
lead that stood on a site rank is rewritten on a sourced number or a fact already in the file (the
records are through Week 4, from data/results.js). The Deep Dive and the rank chip sit right beside
the text and update themselves; the smoke test now fails a live week that quotes them.

Two line fixes ride along: Baltimore and Atlanta's lead said 3.5, which was nflverse's Wednesday
line, not the posted ATL -3 (now "3 to 3.5", as the bullet's own detail says), and Washington's
posted line used ESPN's "WSH". One Miami and one Green Bay Positive stood on site numbers alone and
are dropped (five became four each). Lines in the bullets stay as written: the overlay now shows the
current line beside the one the week was posted with. Run once, from news/ on the Week 5 file as
committed in 25fbffe:  python3 tools/patch_week5_ranks.py
"""
from pathlib import Path

P = Path(__file__).resolve().parent.parent / "data" / "week5.js"
s = P.read_text(encoding="utf-8")


def sub1(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)


# ---- the week's intro and the game previews
sub1("where the defending champion Seahawks, 1st in the power ratings, are 2.5 point favorites over the 4-0 49ers, 2nd, likely without Nick Bosa; Monday night sends 3-1 Buffalo, 3rd, to the Rams",
     "where the defending champion Seahawks are 2.5 point favorites over the 4-0 49ers, likely without Nick Bosa; Monday night sends 3-1 Buffalo to the Rams")
sub1("the Dallas defense has yet to intercept a pass, per the Bucs' site, and gets an interception or pass defended on 7.9 percent of dropbacks, 32nd in the tracker.",
     "the Dallas defense has yet to intercept a pass, per the Bucs' site.")
sub1("about -148 on the moneyline, and the site's power ratings have the Bears 9th and the Packers 18th; CBS's",
     "about -148 on the moneyline; CBS's")
sub1("Houston, 16th in the power ratings after a 34-30 loss to Dallas, is a 6.5 to 7.5 point favorite at 32nd ranked Tennessee,",
     "Houston, fresh off a 34-30 loss to Dallas, is a 6.5 to 7.5 point favorite at Tennessee,")
sub1("The Texans get 3.5 sacks a game, tied 3rd, and pressure on 27.5 percent of dropbacks, 6th in the tracker, behind <strong>Will Anderson Jr.</strong> and <strong>Danielle Hunter</strong>; <strong>Ward</strong> ranks 32nd at minus 0.16 EPA per dropback, though his line allows only 1.5 sacks a game, tied 5th.",
     "The Texans get 3.5 sacks a game, tied 3rd, behind <strong>Will Anderson Jr.</strong> and <strong>Danielle Hunter</strong>; <strong>Ward</strong>'s offense scores 13.8 points a game, 31st, though his line allows only 1.5 sacks a game, tied 5th.")
sub1("in Sunday's return from a hamstring, against a Tennessee secondary 30th in the tracker that allows 0.20 EPA per dropback, 29th.",
     "in Sunday's return from a hamstring.")
sub1("The Dolphins' defensive backs rank 31st in the site's units, allowing 0.22 EPA a dropback, 30th, and <strong>Reese Taylor</strong> (quad) was ruled out Monday,",
     "The Dolphins' secondary lost <strong>Reese Taylor</strong> (quad), ruled out Monday,")
sub1("all pick Cincinnati, and the power ratings have it 15th to Miami's 30th.",
     "all pick Cincinnati.")
sub1("Las Vegas gets 3.0 sacks a game, tied 5th, and its front ranks 4th in the tracker with pressure on 28.1 percent of dropbacks, 5th; New England allows 2.5 sacks a game, tied 20th, and an 8.1 percent sack rate, 25th, with",
     "Las Vegas gets 3.0 sacks a game, tied 5th; New England allows 2.5 sacks a game, tied 20th, with")
sub1("the Joker takes Las Vegas at 50.5, and the power ratings have New England 6th at 1620 and Las Vegas 24th at 1422.",
     "and the Joker takes Las Vegas at 50.5.")
sub1("with <strong>Dallas Turner</strong> at 5.5, per nflverse, and pressures on 34.4 percent of dropbacks, 1st in the site's units; New Orleans",
     "with <strong>Dallas Turner</strong> at 5.5, per nflverse; New Orleans")
sub1("the ELO Model leans New Orleans at 50.3 percent, and the site's power ratings have the Vikings 5th and the Saints 28th.",
     "the ELO Model leans New Orleans at 50.3 percent.")
sub1("The Jets allow 3.0 sacks a game, tied for 25th, and a 10.1 percent sack rate, 31st in the tracker, with <strong>Dylan Parham</strong> (knee) listed out as of Tuesday; Cleveland gets",
     "The Jets allow 3.0 sacks a game, tied for 25th, with <strong>Dylan Parham</strong> (knee) listed out as of Tuesday; Cleveland gets")
sub1("and nflverse's moneyline is minus 130, though the site's power ratings rank them 31st to Cleveland's 21st;",
     "and nflverse's moneyline is minus 130, though they are 1-3 to Cleveland's 3-1;")
sub1("<strong>Watt</strong> has 4.5 sacks, per nflverse, and Pittsburgh's secondary ends 18.1 percent of dropbacks with an interception or a pass defensed, 3rd in the site's units.",
     "<strong>Watt</strong> has 4.5 sacks, per nflverse.")
sub1("all take Pittsburgh, which is 14th in the site's power rank to Indianapolis's 19th.",
     "all take Pittsburgh.")
sub1("The Commanders run for 124 yards a game, 8th, per nflverse, behind a line 8th in the site's unit grades, and <strong>Jayden Daniels</strong> ran 12 times for 100 yards in his two games; New York allows 4.7 yards a carry, 25th, its front grades 32nd in the site's units, and it has 3 sacks",
     "The Commanders run for 124 yards a game, 8th, per nflverse, and <strong>Jayden Daniels</strong> ran 12 times for 100 yards in his two games; New York allows 4.7 yards a carry, 25th, and has 3 sacks")
sub1("for the league lead and its secondary gets a hand on 19.5 percent of dropbacks, 1st in the site's unit numbers, while Washington",
     "for the league lead, while Washington")
sub1("in nflverse's lines and rank 23rd in the site's power rank to Washington's 27th.",
     "in nflverse's lines and 3-1 straight up to Washington's 1-3.")
sub1("agree, and Denver is 8th in the site's power rank to the Chargers' 25th.",
     "agree.")
sub1("per nflverse, and ranks 3rd at 0.23 EPA a dropback in the site's unit numbers; Arizona allows 0.23 EPA a dropback there, 31st, 6.1 yards a play, 30th,",
     "per nflverse; Arizona allows 6.1 yards a play, 30th,")
sub1("all pick Detroit, and the site's power rank has the Lions 13th and the Cardinals 29th.",
     "all pick Detroit.")
sub1("take San Francisco. The site's power rank has Seattle 1st and San Francisco 2nd, the top two meeting.",
     "take San Francisco.")
sub1("in its lineup. The site's power ratings have the Ravens 11th and the Falcons 17th.",
     "in its lineup.")
sub1("the ELO Model 50.9, while the power ratings have Buffalo 3rd at 1667 and the Rams 7th at 1614.",
     "the ELO Model 50.9.")

# ---- the teams, alphabetically
sub1("give Arizona 18.3 to 31.1 percent, and the site's power rank has it 29th to Detroit's 13th.",
     "give Arizona 18.3 to 31.1 percent.")
sub1("<strong>The run defense is efficient.</strong> The front ranks 10th in the site's unit grades and 3rd in rush EPA allowed at minus 0.11 a carry; Detroit ran 15 times for 46 yards at Carolina,",
     "<strong>Detroit's run game stalled last week.</strong> The Lions ran 15 times for 46 yards at Carolina,")
sub1("averages 5.4 yards an attempt and ranks 22nd at minus 0.02 EPA a dropback in the site's unit numbers.",
     "averages 5.4 yards an attempt.")
sub1("<strong>Atlanta is a 3.5 point home favorite, its first time favored this season.</strong>",
     "<strong>Atlanta is a 3 to 3.5 point home favorite, its first time favored this season.</strong>")
sub1("at Green Bay, per ESPN and the AJC; the receivers are 1st in yards after the catch per catch in the site's units, against a Baltimore secondary 26th.",
     "at Green Bay, per ESPN and the AJC.")
sub1("<strong>London</strong> averages 18.5 a catch and the receivers lead the site's units in yards after the catch; Baltimore's secondary is 26th, and <strong>Marlon Humphrey</strong>",
     "<strong>London</strong> averages 18.5 a catch, per nflverse, and Baltimore's <strong>Marlon Humphrey</strong>")
sub1("<strong>Baltimore is a 3.5 point underdog, the first time it has not been favored this season.</strong>",
     "<strong>Baltimore is a 3 to 3.5 point underdog, the first time it has not been favored this season.</strong>")
sub1("Baltimore has 1.8 sacks a game, tied for 22nd, and pressures on 21.5 percent of dropbacks, 22nd in the site's units.",
     "Baltimore has 1.8 sacks a game, tied for 22nd.")
sub1("including 13 for 131 against Tennessee; the secondary ranks 26th in the site's units, allowing 0.09 EPA a dropback, 22nd.",
     "including 13 for 131 against Tennessee.")
sub1("all take the Rams, but the power ratings rank Buffalo 3rd and Los Angeles 7th.",
     "all take the Rams.")
sub1("<strong>Josh Allen</strong> is 4th in EPA a dropback at 0.22, and 13.3 percent of Buffalo's throws gain 20 yards, 1st; the Rams allow minus 0.09 EPA a dropback, 3rd, with <strong>Trent McDuffie</strong>, <strong>Quentin Lake</strong> and <strong>Kam Curl</strong> leading a secondary ranked 1st in the tracker.",
     "<strong>Josh Allen</strong> leads an offense scoring 31.8 points a game, 1st; the Rams allow 153.8 passing yards a game, 1st, per nflverse, with <strong>Trent McDuffie</strong>, <strong>Quentin Lake</strong> and <strong>Kam Curl</strong> in the secondary.")
sub1("and 5.5 plays of 20 or more yards a game, 1st, in the tracker's numbers; 13.3 percent of throws gain 20 yards, also 1st.",
     "and 5.5 plays of 20 or more yards a game, 1st, per TeamRankings and ESPN.")
sub1("Buffalo's 10 rushing touchdowns are the most, and the backfield ranks 1st in the tracker.",
     "Buffalo's 10 rushing touchdowns are the most.")
sub1("Buffalo gets 2.5 sacks a game, tied 8th, and pressures on 26.6 percent of dropbacks, 8th.",
     "Buffalo gets 2.5 sacks a game, tied 8th.")
sub1("<strong>The run defense ranks last.</strong> Plus 0.06 rush EPA allowed a carry, 32nd, with the front 25th in the tracker; <strong>Ed Oliver</strong>",
     "<strong>The run defense is thin up front.</strong> <strong>Ed Oliver</strong>")
sub1("CBS's <strong>Pete Prisco</strong> picks the Packers in an upset, while the site's power ratings put Chicago 9th and Green Bay 18th.",
     "CBS's <strong>Pete Prisco</strong> picks the Packers in an upset.")
sub1("<strong>The run defense is the soft spot.</strong> 27th in rush EPA allowed per carry and 31st in the tracker's run defense ranking; the front ranks 23rd, and the defense allows 5.9 yards a play, tied 27th.",
     "<strong>The defense gives up yards.</strong> 5.9 yards a play allowed, tied 27th.")
sub1("Miami's defensive backs rank 31st in the site's units, with passes picked or defensed on 10.3 percent of dropbacks, 30th; <strong>Burrow</strong> threw for 428 yards",
     "<strong>Burrow</strong> threw for 428 yards")
sub1("<strong>Working against them is the run defense.</strong> Cincinnati ranks 27th against the run in the site's units, and <strong>Ollie Gordon II</strong> ran 9 times for 100 yards and a touchdown at Minnesota, per ESPN's box, behind a Miami line averaging 4.5 yards a carry, 7th.",
     "<strong>Working against them is the run defense.</strong> <strong>Ollie Gordon II</strong> ran 9 times for 100 yards and a touchdown at Minnesota, per ESPN's box.")
sub1("<strong>The protection holds up.</strong> A 5.4 percent sack rate allowed, 9th, and <strong>Burrow</strong>'s 2.44 second release was the league's fastest through Week 3, per Sharp Football; Miami pressures on 19.7 percent of dropbacks, 24th.",
     "<strong>The protection holds up.</strong> <strong>Burrow</strong>'s 2.44 second release was the league's fastest through Week 3, per Sharp Football, and Miami has 1.0 sack a game, tied for 28th.")
sub1("if he plays, he faces a pass defense ranked 29th in the site's units.",
     "if he plays, he faces a Miami secondary without <strong>Reese Taylor</strong>.")
sub1("per NFL.com, SI and nflverse; the pass defense ranks 19th in the site's units.",
     "per NFL.com, SI and nflverse.")
sub1("The Jets allow 3.0 sacks a game, tied for 25th, and a 10.1 percent sack rate, 31st in the tracker; Cleveland's front ranks 8th with a 27.1 percent pressure rate, 7th, but <strong>Mason Graham</strong>",
     "The Jets allow 3.0 sacks a game, tied for 25th, and Cleveland gets 3.0 a game, tied for 5th, but <strong>Mason Graham</strong>")
sub1("has 17 catches and 3 touchdowns, and the receivers rank 5th in yards after the catch, 5.9, in the tracker.",
     "has 17 catches and 3 touchdowns.")
sub1("Cleveland ranks 6th in pass EPA allowed in the tracker and gets 3.0 sacks a game, tied for 5th.",
     "Cleveland gets 3.0 sacks a game, tied for 5th.")
sub1("including 17 for 53 against Pittsburgh; Cleveland ranks 28th at 3.8 a carry and 27th in rush EPA in the tracker.",
     "including 17 for 53 against Pittsburgh.")
sub1("for 20.3 points a game, 22nd; the quarterback unit ranks 28th in EPA per dropback in the tracker, and the 43 penalties",
     "for 20.3 points a game, 22nd, and the 43 penalties")
sub1("The Jets allow a 10.1 percent sack rate, 31st in the tracker, with <strong>Dylan Parham</strong> listed out;",
     "The Jets' line has <strong>Dylan Parham</strong> listed out;")
sub1("and the Jets' secondary ranks 29th in the tracker, 28th in pass EPA allowed, with <strong>Jarvis Brownlee Jr.</strong>",
     "and the Jets' secondary has <strong>Jarvis Brownlee Jr.</strong>")
sub1("per SI and Bucs Report, and the pass defense ranks 18th in EPA allowed per dropback in the tracker.",
     "per SI and Bucs Report.")
sub1("Dallas allows 1.5 sacks a game, tied 5th, and a 4.3 percent sack rate, 4th in the tracker; the All-Pro left guard",
     "Dallas allows 1.5 sacks a game, tied 5th; the All-Pro left guard")
sub1("<strong>The pass defense ranks last.</strong> 6.4 yards a play allowed, 32nd, and 0.34 EPA per dropback, 32nd in the tracker; Houston scored 30",
     "<strong>The defense ranks last in yards a play.</strong> 6.4 yards a play allowed, 32nd; Houston scored 30")
sub1("and no interceptions, per the Bucs' site; interceptions plus passes defended come on 7.9 percent of dropbacks, 32nd in the tracker.",
     "and no interceptions, per the Bucs' site.")
sub1("despite his 3 touchdowns; the backs average 4.2 a carry, 15th in the tracker, against a Tampa Bay front 2nd in rush EPA allowed.",
     "despite his 3 touchdowns, against a Tampa Bay run defense that holds runners to 3.2 a carry, per SI.")
sub1("<strong>Dak Prescott</strong>, 2nd at 0.24 EPA per dropback, behind a line",
     "<strong>Dak Prescott</strong>, behind a line")
sub1("<strong>Nik Bonitto</strong> with 5; the site's unit numbers have Denver 2nd in pressure per dropback at 30.4 percent.",
     "<strong>Nik Bonitto</strong> with 5.")
sub1("<strong>Riley Moss</strong> 1 each; the site's unit numbers rank the secondary 7th, against a <strong>Justin Herbert</strong>",
     "<strong>Riley Moss</strong> 1 each, against a <strong>Justin Herbert</strong>")
sub1("<strong>Denver has already played four top 10 teams.</strong> San Francisco 2nd, Jacksonville 4th, the Rams 7th and Kansas City 10th in the site's power rank, and beat Jacksonville 20-13 and the Rams 30-26; the Chargers lost at home to Arizona and Las Vegas, 29th and 24th.",
     "<strong>Denver has already played four winning or unbeaten teams.</strong> San Francisco, Jacksonville, the Rams and Kansas City were 13-3 between them through Week 4, and Denver beat Jacksonville 20-13 and the Rams 30-26; the Chargers lost at home to Arizona and Las Vegas.")
sub1("<strong>The decider is Goff against a pass defense ranked 31st.</strong> <strong>Jared Goff</strong> ranks 3rd in the site's unit numbers at 0.23 EPA a dropback and has 9 touchdowns and no interceptions, per nflverse; in the same numbers Arizona allows 0.23 EPA a dropback, 31st, and pressures 19.2 percent of dropbacks, 26th, which leaves time",
     "<strong>The decider is Goff against a pass defense that gives up yards.</strong> <strong>Jared Goff</strong> has 9 touchdowns and no interceptions, per nflverse, and Arizona allows 6.1 yards a play, 30th, and gets 2 sacks a game, tied 16th, which leaves time")
sub1("<strong>Alim McNeill</strong> at 3 each, per nflverse; pressure on 26.5 percent of dropbacks ranks 9th.",
     "<strong>Alim McNeill</strong> at 3 each, per nflverse.")
sub1("tied 4th, and a 5.5 percent sack rate allowed, 11th in the site's unit numbers; <strong>Goff</strong> was sacked once",
     "tied 4th; <strong>Goff</strong> was sacked once")
sub1("replaces <strong>Paris Johnson Jr.</strong> on a line ranked 18th in the site's unit grades;",
     "replaces <strong>Paris Johnson Jr.</strong> on Arizona's line;")
sub1("<strong>The run game against Chicago's run defense decides it.</strong> Green Bay's backs are 31st in rush EPA per carry and average 3.8 yards a carry, 29th; Chicago is 27th in rush EPA allowed and 31st in the tracker's run defense ranking. <strong>MarShawn Lloyd</strong>",
     "<strong>The run game against Chicago's run defense decides it.</strong> <strong>MarShawn Lloyd</strong>")
sub1("2.5 sacks a game, tied 8th, and pressure on 25.5 percent of dropbacks, 10th, against <strong>Tyson Bagent</strong>",
     "2.5 sacks a game, tied 8th, against <strong>Tyson Bagent</strong>")
sub1("<strong>The run game is 31st.</strong> 3.8 yards a carry, 29th, and minus 0.15 rush EPA per carry, 31st, in the tracker, and <strong>Josh Jacobs</strong> is still",
     "<strong>The run game is still without Josh Jacobs.</strong> <strong>Jacobs</strong> is still")
sub1("Chicago's run defense ranks 31st in the tracker, a chance for <strong>MarShawn Lloyd</strong> and <strong>Kaleb Johnson</strong> to lift a run game that is 31st in rush EPA;",
     "Chicago allows 5.9 yards a play, tied 27th, a chance for <strong>MarShawn Lloyd</strong> and <strong>Kaleb Johnson</strong> to lift the run game;")
sub1("and the total is 38.5; the power ratings have Houston 16th at an Elo of 1502 against Tennessee's 32nd at 1244, and the Texans are 0-4",
     "and the total is 38.5; the Texans are 0-4")
sub1("14 sacks, 3.5 a game, tied 3rd, and the front ranks 5th in the tracker with pressure on 27.5 percent of dropbacks, 6th; <strong>Will Anderson Jr.</strong> (4.5 sacks, per nflverse), <strong>Danielle Hunter</strong> and <strong>Sheldon Rankins</strong> (2 each) face a Tennessee line ranked 21st.",
     "14 sacks, 3.5 a game, tied 3rd; <strong>Will Anderson Jr.</strong> (4.5 sacks, per nflverse), <strong>Danielle Hunter</strong> and <strong>Sheldon Rankins</strong> (2 each) face the Tennessee line.")
sub1("<strong>The pass defense is better than the points say.</strong> It ranks 7th in the site's units and allows minus 0.01 EPA per dropback, 9th, with <strong>Derek Stingley Jr.</strong>, <strong>Kamari Lassiter</strong> and <strong>Jalen Pitre</strong>, against a Tennessee offense scoring 13.8 points a game, 31st, behind a quarterback unit ranked 32nd.",
     "<strong>The secondary gets a struggling offense.</strong> <strong>Derek Stingley Jr.</strong>, <strong>Kamari Lassiter</strong> and <strong>Jalen Pitre</strong> face a Tennessee offense scoring 13.8 points a game, 31st.")
sub1("the backs managed 46 yards on 16 carries Sunday; the backfield ranks 29th in the tracker at 3.7 yards a carry, 30th, against a Tennessee front ranked 9th.",
     "the backs managed 46 yards on 16 carries Sunday.")
sub1("3.0 sacks allowed a game, tied 25th, behind a line ranked 24th in the tracker with right tackle",
     "3.0 sacks allowed a game, tied 25th, with right tackle")
sub1("<strong>Throw early and often.</strong> Tennessee's secondary is 30th in the tracker and its front 9th, so lean on <strong>C.J. Stroud</strong>",
     "<strong>Throw early and often.</strong> Lean on <strong>C.J. Stroud</strong>")
sub1("<strong>Alex Highsmith</strong> 3, and Pittsburgh's secondary ranks 3rd in interceptions plus passes defensed per dropback at 18.1 percent in the site's units.",
     "<strong>Alex Highsmith</strong> 3.")
sub1("per AP and ESPN; Indianapolis is 1st in rush EPA a carry at 0.10 in the site's units, against a Pittsburgh run defense 19th in rush EPA allowed that just put",
     "per AP and ESPN, against a Pittsburgh run defense that just put")
sub1("2 sacks allowed a game, tied for 13th, and a 5.4 percent sack rate, 10th, for a line",
     "2 sacks allowed a game, tied for 13th, for a line")
sub1("Pittsburgh's front pressures 25.3 percent of dropbacks, 11th.",
     "Pittsburgh gets 2.5 sacks a game, tied for 8th.")
sub1("Pittsburgh hits 4.3 plays of 20 yards a game, 8th, and gains 6.3 yards after the catch, 3rd.",
     "Pittsburgh hits 4.3 plays of 20 yards a game, 8th.")
sub1("has 86 carries in four games and Indianapolis is 1st in rush EPA a carry in the site's units;",
     "has 86 carries in four games;")
sub1("per the USA Today Network and CBS, and the quarterback unit is 6th in EPA per dropback in the tracker;",
     "per the USA Today Network and CBS;")
sub1("Prisco leans on it in his pick; the run defense ranks 3rd in the tracker and Covers has Jacksonville",
     "Prisco leans on it in his pick, and Covers has Jacksonville")
sub1("<strong>The offensive line and big plays are middling.</strong> The line ranks 20th in the tracker with a 6.9 percent sack rate, 19th, and 4.1 yards a carry, 20th, and the offense has 3.3 explosive plays",
     "<strong>The big plays are middling.</strong> The offense has 3.3 explosive plays")
sub1("<strong>Kwity Paye</strong> lead a front ranked 4th in the tracker, with 3.0 sacks a game, tied 5th; <strong>Maye</strong> has 7 interceptions, the league's most, behind a line ranked 23rd that allows an 8.1 percent sack rate, 25th.",
     "<strong>Kwity Paye</strong> lead a front with 3.0 sacks a game, tied 5th; <strong>Maye</strong> has 7 interceptions, the league's most, behind a line that allows 2.5 sacks a game, tied 20th.")
sub1("<strong>The run game ranks last.</strong> 3.3 yards a carry and minus 0.25 rush EPA a carry, both 32nd in the tracker; <strong>Ashton Jeanty</strong>",
     "<strong>The run game is stuck.</strong> <strong>Ashton Jeanty</strong>")
sub1("<strong>Sam Warren</strong>, and the line ranks 31st in the tracker.",
     "<strong>Sam Warren</strong>.")
sub1("per nflverse, and the site's unit numbers rank the front 3rd; Denver runs",
     "per nflverse; Denver runs")
sub1("26-14 to Arizona and 26-14 to Las Vegas, 29th and 24th in the site's power rank.",
     "26-14 to Arizona and 26-14 to Las Vegas.")
sub1("Los Angeles allows a sack on 3.6 percent of dropbacks, 3rd, and its line ranks 1st in the tracker; <strong>Rousseau</strong> leads the league with 6 sacks and 16 QB hits, per nflverse, and Buffalo pressures on 26.6 percent of dropbacks, 8th, against tackles",
     "<strong>Rousseau</strong> leads the league with 6 sacks and 16 QB hits, per nflverse, against tackles")
sub1("4.2 yards a play allowed, 2nd, and the secondary ranks 1st in the tracker with interceptions and passes defensed on 19.1 percent of dropbacks, 2nd.",
     "4.2 yards a play allowed, 2nd.")
sub1("A sack on 3.6 percent of dropbacks, 3rd, and 1.5 sacks a game allowed, tied 5th, with the line 1st in the tracker;",
     "1.5 sacks a game allowed, tied 5th;")
sub1("1.8 sacks a game, tied 22nd, and pressure on 23.1 percent of dropbacks, 15th; <strong>Byron Young</strong>",
     "1.8 sacks a game, tied 22nd; <strong>Byron Young</strong>")
sub1("in the 15-10 loss at Minnesota, per ESPN's box; Miami averages 4.5 a carry, 7th, and Cincinnati's run defense ranks 27th in the site's units.",
     "in the 15-10 loss at Minnesota, per ESPN's box.")
sub1("at Minnesota, per ESPN's box; Miami's line averages 4.5 yards a carry, 7th, and the backs rank 11th in the site's units.",
     "at Minnesota, per ESPN's box.")
sub1("per NFL.com and ESPN; the receivers rank 6th in the site's units with 6.0 yards after the catch, 4th.",
     "per NFL.com and ESPN.")
sub1("\n        \"<strong>The run defense holds up.</strong> Minus 0.08 EPA a carry allowed, 8th, and 12th against the run in the site's units, against a Cincinnati offense averaging 3.9 yards a carry, 27th.\",",
     "")
sub1("is day to day; the defensive backs rank 31st in the site's units, with passes picked or defensed on 10.3 percent of dropbacks, 30th.",
     "is day to day.")
sub1("1.0 sack a game, tied for 28th, and pressure on 19.7 percent of dropbacks, 24th, against a Cincinnati line allowing a 5.4 percent sack rate, 9th.",
     "1.0 sack a game, tied for 28th, against <strong>Joe Burrow</strong>, whose 2.44 second release was the league's fastest through Week 3, per Sharp Football.")
sub1("100 yards on 9 carries at Minnesota, against a Cincinnati run defense 27th in the site's units;",
     "100 yards on 9 carries at Minnesota;")
sub1("and <strong>Chris Bell</strong> play to a receiver group 4th in yards after the catch.",
     "and <strong>Chris Bell</strong> beat the rush.")
sub1("4.9 yards a play allowed, tied for 4th, with a pass defense 1st in EPA allowed per dropback in the site's units.",
     "4.9 yards a play allowed, tied for 4th.")
sub1("<strong>Brian Flores' pressure leads the league.</strong> 4.0 sacks a game, 1st, and pressure on 34.4 percent of dropbacks, 1st in the site's units;",
     "<strong>Brian Flores' rush leads the league in sacks.</strong> 4.0 sacks a game, 1st;")
sub1("; the line already ranks 32nd in the site's units with a 10.8 percent sack rate allowed, 32nd.",
     ".")
sub1("34.4 percent on third down, 25th; Minnesota's quarterbacks rank 31st in EPA a dropback, minus 0.14, in the site's units.",
     "34.4 percent on third down, 25th.")
sub1("New England allows 2.5, tied 20th, and its line ranks 23rd in the tracker with <strong>Ben Brown</strong>",
     "New England allows 2.5, tied 20th, with <strong>Ben Brown</strong>")
sub1("<strong>The passing game hits deep.</strong> 11.7 percent of throws gain 20 or more yards, 3rd in the tracker, and the receivers rank 10th; <strong>Romeo Doubs</strong> has 12 catches for 203 yards",
     "<strong>Romeo Doubs gives the passing game a deep threat.</strong> He has 12 catches for 203 yards, 16.9 a catch,")
sub1("per the Oct. 7 depth chart; the unit ranks 23rd in the tracker, and <strong>Morgan Moses</strong>",
     "per the Oct. 7 depth chart, and <strong>Morgan Moses</strong>")
sub1("The Raiders sack 3.0 times a game, tied 5th, and their front ranks 4th in the tracker;",
     "The Raiders sack 3.0 times a game, tied 5th;")
sub1("take Minnesota, and the site's power ratings have the Saints 28th to Minnesota's 5th.",
     "take Minnesota.")
sub1("and <strong>Kendre Miller</strong>; the backs average 3.6 yards a carry, 31st in the site's units.",
     "and <strong>Kendre Miller</strong>.")
sub1("per Schefter via ESPN and Audacy; the receivers rank 31st in the site's units with 4.0 yards after the catch, 31st.",
     "per Schefter via ESPN and Audacy.")
sub1("Minnesota averages 4.4 yards a play, 32nd, and its quarterbacks rank 31st in EPA a dropback in the site's units, with",
     "Minnesota averages 4.4 yards a play, 32nd, with")
sub1("0.8 a game, 32nd, and pressure on 17.1 percent of dropbacks, 29th in the site's unit numbers, against a Washington line",
     "0.8 a game, 32nd, against a Washington line")
sub1("for most, per nflverse, and a hand on 19.5 percent of dropbacks, 1st in the site's unit numbers; <strong>Jevon Holland</strong>",
     "for most, per nflverse; <strong>Jevon Holland</strong>")
sub1("0.8 a game, 32nd, and the front is 32nd in the site's unit grades; <strong>Brian Burns</strong>",
     "0.8 a game, 32nd; <strong>Brian Burns</strong>")
sub1("25th, per nflverse, and last in the site's run defense grade; Arizona ran",
     "25th, per nflverse; Arizona ran")
sub1("tied 27th; the line allows an 8.6 percent sack rate, 28th in the site's unit numbers, Arizona sacked",
     "tied 27th; Arizona sacked")
sub1("tied 4th, and lead the league in hands on the ball in the site's unit numbers;",
     "tied 4th, with 6 interceptions, tied for the league lead;")
sub1("the Joker takes Cleveland, and the site's power ratings rank the Jets 31st to Cleveland's 21st.",
     "the Joker takes Cleveland.")
sub1("3.0 sacks allowed a game, tied for 25th, and a 10.1 percent sack rate, 31st in the tracker, with",
     "3.0 sacks allowed a game, tied for 25th, with")
sub1("is listed out as of Tuesday, and the front ranks 30th in pressure rate, 16.6 percent, in the tracker.",
     "is listed out as of Tuesday.")
sub1("averages 3.6 a carry, and the Jets rank 30th in rush EPA in the tracker.",
     "averages 3.6 a carry.")
sub1("per the Sun-Times and WGN; the unit ranks 29th in the tracker.",
     "per the Sun-Times and WGN.")
sub1("per ESPN's feed; the Jets rank 30th on the line in the tracker, with 4.0 yards a carry, 25th.",
     "per ESPN's feed, behind a line that allows 3.0 sacks a game, tied for 25th.")
sub1("Cleveland pressures 27.1 percent of dropbacks, 7th in the tracker;",
     "Cleveland gets 3.0 sacks a game, tied for 5th;")
sub1("tied for 28th; Cleveland ranks 17th in rush EPA allowed in the tracker, so early carries",
     "tied for 28th, so early carries")
sub1("as of Tuesday, against a Jaguars run defense 3rd and secondary 4th in the tracker.",
     "as of Tuesday, against a Jaguars defense allowing 13.3 points a game, 2nd.")
sub1("<strong>The pass defense is sound.</strong> The secondary ranks 9th in the tracker and 8th in pass EPA allowed, and Philadelphia gives up",
     "<strong>The defense is sound.</strong> Philadelphia gives up")
sub1("The line already allows 3 sacks a game, tied 25th, and an 8 percent sack rate, 24th in the tracker.",
     "The line already allows 3 sacks a game, tied 25th.")
sub1("on Sunday, per ESPN; the receiving unit ranks 30th in the tracker, with 3.9 yards after the catch, 32nd.",
     "on Sunday, per ESPN.")
sub1("1 sack a game, tied 28th, an 18.4 percent pressure rate, 28th in the tracker, and minus 0.8",
     "1 sack a game, tied 28th, and minus 0.8")
sub1("3 fumbles lost on sacks, while Pittsburgh is 3rd at 18.1 percent of dropbacks ending in an interception or pass defensed in the site's units.",
     "3 fumbles lost on sacks.")
sub1("per nflverse's schedule; Pittsburgh is 14th in the site's power rank, Indianapolis 19th.",
     "per nflverse's schedule.")
sub1("per nflverse; the secondary is 3rd in interceptions plus passes defensed per dropback at 18.1 percent in the site's units, against a quarterback",
     "per nflverse, against a quarterback")
sub1("off a run defense 19th in rush EPA allowed in the site's units.",
     "off the run defense.")
sub1("has 6 rushing touchdowns and Indianapolis is 1st in rush EPA a carry in the site's units;",
     "has 6 rushing touchdowns;")
sub1("with 11 sacks, 7th, and pressure on 28.5 percent of dropbacks, 4th, in the site's unit numbers;",
     "with 11 sacks, 7th;")
sub1("per nflverse; the site's unit numbers have him 1st at 0.33 EPA a dropback. He went",
     "per nflverse. He went")
sub1("Denver's rush, 2nd in pressure rate in the site's unit numbers, did not get him",
     "Denver's rush, with 30 quarterback hits, per nflverse, did not get him")
sub1("none against Denver, and a 15.1 percent pressure rate, 32nd, in the site's unit numbers;",
     "none against Denver;")
sub1("take San Francisco, and the site's power rank has Seattle 1st, one spot ahead.",
     "take San Francisco.")
sub1("2.8 a game, 7th, per TeamRankings, and pressure on 28.5 percent of dropbacks, 4th, in the site's unit numbers;",
     "2.8 a game, 7th, per TeamRankings;")
sub1("31st, per TeamRankings, and minus 0.12 rush EPA a carry, 29th, in the site's unit numbers;",
     "31st, per TeamRankings;")
sub1("<strong>The front stops the run.</strong> Minus 0.15 rush EPA allowed a carry, 1st, in the site's unit numbers, and 3.6 yards a carry, 7th, per nflverse,",
     "<strong>The front stops the run.</strong> 3.6 yards a carry allowed, 7th, per nflverse,")
sub1("San Francisco pressures 15.1 percent of dropbacks, 32nd, in the site's unit numbers, and loses",
     "San Francisco has 1.5 sacks a game, tied for 26th, per TeamRankings, and loses")
sub1("Dallas allows 6.4 yards a play, 32nd, and 0.34 EPA per dropback, 32nd in the tracker, and Houston scored",
     "Dallas allows 6.4 yards a play, 32nd, and Houston scored")
sub1("per SI; the front is 2nd in rush EPA allowed in the tracker, with <strong>Vita Vea</strong>",
     "per SI, with <strong>Vita Vea</strong>")
sub1("<strong>Bucky Irving gets a soft run defense.</strong> 16 carries for 61 yards Sunday, and the backs rank 8th in rush EPA per carry in the tracker; Dallas is 26th in rush EPA allowed and its run defense ranks 28th.",
     "<strong>Bucky Irving carries the load.</strong> 16 carries for 61 yards Sunday.")
sub1("31st, per Sharp, and 19.0 percent, 27th, in the tracker; 1.5 sacks a game",
     "31st, per Sharp; 1.5 sacks a game")
sub1("per Sharp, and ranks 28th against the run in the tracker; designed runs",
     "per Sharp; designed runs")
sub1("0-4 and 32nd in the power ratings, coming off Ward's and Tate's best day",
     "0-4, and coming off Ward's and Tate's best day")
sub1("<strong>The secondary works against them.</strong> It ranks 30th in the tracker and allows 0.20 EPA per dropback, 29th, against <strong>C.J. Stroud</strong>",
     "<strong>The secondary works against them.</strong> It faces <strong>C.J. Stroud</strong>")
sub1("Tennessee's front ranks 9th in the tracker and allows minus 0.06 rush EPA a carry, 13th, with <strong>Jeffery Simmons</strong> inside; Houston's line ranks 24th and allows",
     "<strong>Jeffery Simmons</strong> leads it inside, and Houston's line allows")
sub1("2.8 plays of 20 or more yards a game, tied 22nd, and 7.4 percent of throws gain 20 or more, 29th in the tracker, where the receivers rank 24th.",
     "2.8 plays of 20 or more yards a game, tied 22nd.")
sub1("behind him; the line ranks 21st in the tracker.",
     "behind him.")
sub1("Houston's run defense ranks 4th in the site's units, but it played Week 4",
     "Houston's run defense played Week 4")
sub1("all pick the Commanders, who sit 27th in the site's power rank to New York's 23rd.",
     "all pick the Commanders.")
sub1("<strong>The decider is the run game against the site's lowest-graded front.</strong> Washington runs for 124 yards a game, 8th, per nflverse, behind a line 8th in the site's unit grades; New York's front ranks 32nd in those grades, allows 4.7 a carry, 25th,",
     "<strong>The decider is the run game against a Giants front that has struggled.</strong> Washington runs for 124 yards a game, 8th, per nflverse; New York allows 4.7 a carry, 25th, per nflverse,")
sub1("tied 2nd, per TeamRankings, and a 5.3 percent sack rate, 8th in the site's unit numbers; the Giants",
     "tied 2nd, per TeamRankings; the Giants")
sub1("Washington beat Seattle, now 1st in the site's power rank, 33-31 as an 8.5 point underdog",
     "Washington beat defending champion Seattle 33-31 as an 8.5 point underdog")
sub1("<strong>Get after Winston.</strong> The Giants allow an 8.6 percent sack rate, 28th in the site's unit numbers, and Arizona sacked him 4 times;",
     "<strong>Get after Winston.</strong> Arizona sacked him 4 times;")

# ---- the Deep Dive's own numbers quoted without saying so: unit ranks, EPA a dropback or carry,
#      sack rates, the 20-plus throw share and the interception-or-breakup share (2025-blended)
sub1("The Bears' line ranks 2nd and their backs average 4.9 yards a carry, 4th; Green Bay is 23rd in rush EPA allowed and lost <strong>Edgerrin Cooper</strong>",
     "Green Bay lost <strong>Edgerrin Cooper</strong>")
sub1("Cincinnati gets 3.5 sacks a game, tied for 3rd, against a Miami line allowing an 8.5 percent sack rate, 26th; Miami gets 1.0 a game, tied for 28th, against a Cincinnati line allowing 5.4 percent, 9th.",
     "Cincinnati gets 3.5 sacks a game, tied for 3rd, and Miami 1.0, tied for 28th.")
sub1("29.3 points a game allowed, 29th, 6.1 yards a play allowed, 30th, and 0.23 EPA a dropback allowed, 31st;",
     "29.3 points a game allowed, 29th, and 6.1 yards a play allowed, 30th;")
sub1("372.2 yards, 27th, per nflverse, and its run defense ranks 32nd in rush EPA allowed.",
     "372.2 yards, 27th, per nflverse.")
sub1("he ran for another score Sunday, per ESPN's feed, and is 4th in EPA a dropback at 0.22.",
     "he ran for another score Sunday, per ESPN's feed.")
sub1("per ESPN's feed and nflverse; Buffalo is 32nd in rush EPA allowed, and holding the Rams",
     "per ESPN's feed and nflverse; holding the Rams")
sub1("Buffalo allows a sack on 7.3 percent of dropbacks, 22nd, and <strong>Byron Young</strong>",
     "<strong>Byron Young</strong>")
sub1("The line ranks 2nd and the backs average 4.9 a carry, 4th; Green Bay is 23rd in rush EPA allowed per carry and lost <strong>Cooper</strong> (Achilles) for the season, per Packers.com and Rapoport.",
     "Green Bay lost <strong>Cooper</strong> (Achilles) for the season, per Packers.com and Rapoport, and <strong>D'Andre Swift</strong> ran 15 times for 58 yards Sunday, per ESPN.")
sub1("<strong>The line protects and opens holes.</strong> It ranks 2nd, with a 4.5 percent sack rate allowed, 5th, and 1.8 sacks a game, tied 10th fewest; the backs average 4.9 a carry, 4th, and <strong>D'Andre Swift</strong>",
     "<strong>The line protects.</strong> 1.8 sacks allowed a game, tied 10th fewest, and <strong>D'Andre Swift</strong>")
sub1(" behind a line ranked 2nd, against a Green Bay defense 23rd in rush EPA allowed;",
     ", against linebackers without him;")
sub1("per nflverse, and Miami allows an 8.5 percent sack rate, 26th.",
     "per nflverse, and <strong>Malik Willis</strong> has taken 11 sacks in four games.")
sub1("<strong>The run game does not move.</strong> 3.9 yards a carry, 27th, and <strong>Chase Brown</strong>",
     "<strong>The run game does not move.</strong> <strong>Chase Brown</strong>")
sub1("Miami allows 0.22 EPA a dropback, 30th, and is without <strong>Taylor</strong> (quad);",
     "Miami is without <strong>Taylor</strong> (quad);")
sub1("per ESPN's box; Cincinnati allows minus 0.01 EPA a carry, 24th, so",
     "per ESPN's box, so")
sub1("per ESPN's box and nflverse, and ranks 26th at minus 0.07 EPA a dropback;",
     "per ESPN's box and nflverse;")
sub1("is also listed out, and the line ranks 29th with an 8.5 percent sack rate allowed, 27th.",
     "is also listed out.")
sub1("per Bucs Nation, and ranks 2nd at 0.24 EPA per dropback.",
     "per Bucs Nation.")
sub1("tied for the most, per nflverse; the secondary ranks 27th at 0.15 EPA allowed a dropback.",
     "tied for the most, per nflverse.")
sub1("<strong>Throw early at the 31st ranked pass defense.</strong> Arizona allows 0.23 EPA a dropback and 11 touchdown passes, tied for most;",
     "<strong>Throw early at a pass defense that gives up touchdowns.</strong> Arizona has allowed 11 touchdown passes, tied for most;")
sub1("in the 17-14 win; he ranks 10th in EPA per dropback at 0.11.",
     "in the 17-14 win.")
sub1("<strong>The receivers stretch the field.</strong> The group ranks 9th, with 9.9 percent of throws gaining 20 or more yards, 10th; <strong>Christian Watson</strong>",
     "<strong>The receivers can stretch the field.</strong> <strong>Christian Watson</strong>")
sub1(",\n        \"<strong>Love stays upright.</strong> A 5.2 percent sack rate allowed, 7th, even with <strong>Aaron Banks</strong> (toe) and <strong>Jacob Monk</strong> (quad) out in Week 4; Chicago's front ranks 23rd.\"",
     "")
sub1("Chicago's line ranks 2nd and its backs average 4.9 a carry, 4th; Green Bay is 23rd in rush EPA allowed, and the linebackers have to cover for <strong>Edgerrin Cooper</strong>.",
     "The linebackers have to cover for <strong>Edgerrin Cooper</strong> against <strong>D'Andre Swift</strong>, who ran 15 times for 58 yards Sunday, per ESPN.")
sub1("without <strong>Micah Parsons</strong> against a line allowing a 4.5 percent sack rate, 5th.",
     "without <strong>Micah Parsons</strong> against a line allowing 1.8 sacks a game, tied 10th fewest.")
sub1("<strong>Stroud against the 30th ranked secondary decides it.</strong> <strong>C.J. Stroud</strong> has 1,141 yards, 5 touchdowns and no interceptions on 151 attempts, and Houston gains 20 or more yards on 10.5 percent of throws, 7th; Tennessee allows 0.20 EPA per dropback, 29th, and intercepts or breaks up 10.5 percent of dropbacks, 29th.",
     "<strong>Stroud against the Tennessee secondary decides it.</strong> <strong>C.J. Stroud</strong> has 1,141 yards, 5 touchdowns and no interceptions on 151 attempts, and threw for 347 yards Sunday.")
sub1("32nd; <strong>Daniel Jones</strong> ranks 25th at minus 0.05 EPA a dropback, and <strong>Jaylon Carlies</strong>",
     "32nd, and <strong>Jaylon Carlies</strong>")
sub1("averages 5.0 a carry to <strong>Ashton Jeanty</strong>'s 3.4, against a New England front 25th in rush EPA allowed.",
     "averages 5.0 a carry to <strong>Ashton Jeanty</strong>'s 3.4.")
sub1("Buffalo is 32nd in rush EPA allowed with <strong>Ed Oliver</strong> (knee) hurt;",
     "Buffalo's run defense has <strong>Ed Oliver</strong> (knee) hurt;")
sub1("Miami allows an 8.5 percent sack rate, 26th, against a Cincinnati rush with 3.5 sacks a game, tied for 3rd;",
     "Miami faces a Cincinnati rush with 3.5 sacks a game, tied for 3rd;")
sub1("no game above 13 points; <strong>Malik Willis</strong> ranks 26th at minus 0.07 EPA a dropback.",
     "no game above 13 points.")
sub1("tied 10th; the secondary ranks 7th in pass EPA allowed at minus 0.04 a dropback, and Pittsburgh",
     "tied 10th, and Pittsburgh")
sub1("<strong>Aaron Rodgers</strong>'s 7 touchdown passes, and the receivers rank 8th as a unit.",
     "<strong>Aaron Rodgers</strong>'s 7 touchdown passes.")
sub1("<strong>Aaron Rodgers</strong> ranks 24th at minus 0.04 EPA a dropback and threw 2 interceptions",
     "<strong>Aaron Rodgers</strong> threw 2 interceptions")
sub1("on a line allowing a 5.4 percent sack rate, 10th, and finish the strip.",
     "on a line allowing 2 sacks a game, tied for 13th, and finish the strip.")
sub1("<strong>Danielle Hunter</strong>, and <strong>Ward</strong> ranks 32nd at minus 0.16 EPA per dropback.",
     "<strong>Danielle Hunter</strong>.")
sub1("<strong>The secondary ranks 30th.</strong> 0.20 EPA allowed per dropback, 29th, and an interception or breakup on 10.5 percent of dropbacks, 29th; <strong>Cor'Dale Flott</strong>, <strong>Alontae Taylor</strong>, <strong>Amani Hooker</strong> and <strong>Kevin Winston Jr.</strong> face a passer with no interceptions in 151 throws.",
     "<strong>The secondary faces a passer who has not thrown an interception.</strong> <strong>Cor'Dale Flott</strong>, <strong>Alontae Taylor</strong>, <strong>Amani Hooker</strong> and <strong>Kevin Winston Jr.</strong> face <strong>C.J. Stroud</strong>, with no interceptions in 151 throws.")
sub1("is out for the season; the receivers rank 29th in the unit grades and Washington converts",
     "is out for the season, and Washington converts")
sub1("tied 4th, with a hand on 16.4 percent of dropbacks, 7th; <strong>Budda Baker</strong>",
     "tied 4th; <strong>Budda Baker</strong>")
sub1("but Arizona gets a hand on 16.4 percent of dropbacks, 7th, and picked off",
     "but Arizona picked off")
sub1("with Cousins and Bowers carrying a run game ranked last",
     "with Cousins and Bowers carrying a stalled run game")
sub1("though the Rams allow a sack on only 3.6 percent of dropbacks, 3rd.",
     "though the Rams allow only 1.5 sacks a game, tied 5th.")
sub1("against a front pressuring 22.3 percent of dropbacks, 19th, without <strong>Arden Key</strong>;",
     "against a front without <strong>Arden Key</strong>;")

# ---- the posted line, written the tracker's way
sub1('"line": "WSH -3, O/U 43.5",', '"line": "WAS -3, O/U 43.5",')

P.write_text(s, encoding="utf-8", newline="\n")
print("week5.js: site ranks, removed metrics and blended numbers taken out of the narrative")
