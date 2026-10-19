#!/usr/bin/env python3
"""Player Elo: every player rated, by position, game by game, since 2012 -- a game model
built on nothing but those ratings, and a matchup formula for each player's next game.

    python3 elo/build.py              # downloads what it lacks into elo/cache/, writes elo/data/
    python3 elo/build.py --offline    # use the cache only
    python3 elo/build.py --now 2026-10-11T16:00Z    # as if at that time (tests of the calendar)
    python3 elo/check.py && node elo/check_tab.js   # the gate: the files against their sources

WHY ELO FOR A PLAYER. Elo is a rating that moves on results against an opponent whose
strength is also rated, so a good game against a good defence is worth more than the same
game against a bad one, and a rating settles at the level a player keeps proving. The
question is what a player's "result" is. Here it is how the player's box score for the
game compares with the position's typical game: the per-game score (below) is turned into a
z-score against the position's distribution from the season before, then squashed into a
result in [0, 1] -- an average game is a draw (0.5), a game one standard deviation better is
0.82, two better is 0.95. The opponent is the opposing team's UNIT for the facet the player
plays against (a QB, WR or TE faces the opponent's pass defence, a RB its rush defence, a
DB the opponent's pass offence, a DL or LB its run offence), a rating this script keeps for
every team and updates the same way from the other side. A kicker faces nobody: his
opponent is a fixed 1500, so his rating is his own consistency.

    expected  E = 1 / (1 + 10^((U - R) / 400))          R player, U opposing unit
    result    S = 1 / (1 + e^(-1.5 z))                    z clipped to +-3
    update    R += K * w * (S - E)                        K = 56 for the first 8 rated games, 32 after
              U -= 120 * mean over the unit's opponents that game of w * (S - E)

The opponent is what makes a result mean something: E is the result a player is expected to
get against that unit, so a big game against the league's worst pass defence is barely above
what was expected and moves him little, and a quiet game against the best one can still gain.
That only works if the units are rated as far apart as they really are. A unit's step is the
mean over the several players it faced, so it is a quiet signal, and at a K of 20 the units
never got near their level before the offseason pulled them back: the best and worst pass
defences stood about 40 points apart, and opponents hardly counted. At 120 they spread about
three times as wide (a standard deviation of 31 for pass defences, 43 for run defences), and
the record is no worse for it: walk-forward 2013-2025 62.8% and log loss 0.6397 at 20, 63.1%
and 0.6394 at 120, the matchups' errors unchanged.

w is the game's weight by involvement, so a backup with two carries barely moves and a
starter moves fully: volume over a per-position norm, capped at 1. A game a regular left
early is not rated at all: when a player's involvement falls below 35% of his median over
his last five rated games, and that median is a starter's, the game is skipped rather than
scored as a bad one -- a quarterback hurt after eight throws did not have a bad day, he had
a short one. Only one such game in a row is skipped: a second straight short game is rated,
because that is a smaller role, not an injury (Colston Loveland's first two games of 2026,
two and three targets after a season of eight or nine, were both skipped before this, and
his rating stood frozen at 2025's). Every season every rating is pulled a quarter of the way back to 1500, since
rosters, schemes and ages change.

A player's first rating is 1500, a quarterback's 1450 (QB_START) from 2013 on, and the game
model fills an expected quarterback with no rating yet the same way. 1500 is the average
starter's level, and a new quarterback is seldom that: on his first real start his result fell
0.124 short of what 1500 expected (S - E, 156 starts) and over his first eight 0.048 (956), so a
backup on a few snaps stood above any starter below the average (Curtis Painter, -0.75 EPA a play
on 17 dropbacks in 2013, at 1484 above Eli Manning's 1437). At 1450 the career rating puts the
club's quarterback above his backup at the season's end in 73.3% of the clear cases since 2013
(69.8% at 1500) and 84.2% of the 70%-of-snaps ones (81.7%), and the game model's walk-forward
2013-2025 goes from 0.6402 to 0.6387 in log loss (2114 and 2112 right of 3,333); next season's
EPA is ranked as before (0.470 against 0.471).

THE SCORES. For a QB the score is expected points added on the plays he touched (nflverse's
passing_epa + rushing_epa + receiving_epa), which already prices yards, downs, turnovers and
sacks against the situation. For a RB, WR or TE (PRODUCED) it is what he produced: yards from
scrimmage, 20 for each touchdown (10 for a back, TD_YARDS), less 25 for each fumble lost. These three were scored on EPA
too until October 2026, and it rated them backwards. The average carry loses expected points
(the league's backs ran at -0.05 to -0.09 EPA a carry every season), so the more a team trusted
a back with the ball the lower he scored: a club's lead back was rated above the back behind
him at the season's end in only 121 of 273 team-seasons since 2013 (44%), and in week 5 of 2026
Brian Robinson, a backup with 194 rushing yards and four touchdowns, stood 5th among backs and
Bijan Robinson, with 494 yards, 30th. Receivers were less wrong, a target being worth a little
on average, but the lead receiver stood above the next in only 74% of team-seasons and the lead
tight end in 67%. Scored on production the three are 92%, 87% and 89%, and the ratings read as
a measure of who is good: Walker, Gibbs, Bijan Robinson, Henry and Taylor lead the backs.
The record on the same data, walk-forward 2013-2025 on 3,333 games: 2101 right (63.0%) and a
log loss of 0.6392 on EPA, 2111 (63.3%) and 0.6398 on production, level within the noise; the
matchups' projections are better on every rushing and receiving yards line (rushing yards
33.792 to 33.694 against the form alone's 33.752, where EPA had made them worse; receiving
yards 35.440 to 35.398 for receivers and 26.965 to 26.882 for tight ends). Tried on the backs
and not kept: EPA over the league's average carry (the lead back on top in 54%), and half EPA,
half production (88%, 63.7% and 0.6393, but Brian Robinson still 16th). A back's touchdown
counts 10, not 20, since October 2026: at 20 it was worth four average carries, and the goal-line
carries a club hands out decided who stood where (David Montgomery 23rd in week 5 of 2026 on
2.65 yards a carry and three touchdowns, Brian Robinson a backup on four touchdowns from 47
opportunities). At 10 the season rating after week 5 ranks the rest of a back's season better (Spearman
0.539 to 0.551, +0.012 with a 90% interval of +0.006 to +0.018, 2013-2025), next season's
output a little better on every measure (within the noise), the lead back above the next as
often, and Montgomery is 34th; the game model's walk-forward is level (2112 right either way, log
loss 0.6383 at 20, 0.6387 at 10). A quarterback stays on
EPA: his volume is not a cost, and EPA prices his sacks and interceptions as production does
not. For a kicker it is points over what an
average kicker makes from each distance bucket. For a defender (DL, LB, DB) it is a weighted
sum of the events he made: sacks, tackles for loss, hits, forced and recovered fumbles,
interceptions, passes defended, touchdowns and tackles; a defensive lineman's QB hits count
double (DL_HIT_EXTRA): a hit is the pressure the box score records, and at one point against
a sack's four it counted for little. That ranks next season better: on 2013-2025, the career rating
against next season's score a game 0.604 to 0.612 and against sacks and hits per 100 snaps
0.606 to 0.625 (90% intervals of +0.005 to +0.011 and +0.015 to +0.022), the season rating
after week 5 against the rest of the season 0.454 to 0.475, with the game model level.
Offensive linemen and punters have no box-score signal worth rating and are left out.

THE GAME MODEL. For every game since 2012 each team's strength at each position group is the
depth-weighted mean of the pre-game ratings of the players expected to start (QB1; RB1 and
RB2; WR1-3; TE1; K; DL top four; LB top three; DB top five), a short bench filled at 1450.
Expected means what was known before kickoff: the team's depth chart for that week (nflverse
publishes the weekly charts through 2024 and daily snapshots from 2025, of which the last
one before the game is used) with anyone the week's injury report ruled Out or Doubtful
taken off it, and where a chart says nothing about a group, the players who took the field
for it in the team's last game. A fullback sorts after every running back (the daily charts
list him at rank 1 of his own slot, and he took the RB2 place from the real second back for
thirteen clubs: TreVeyon Henderson, Kaelon Black, Keaton Mitchell, RJ Harvey ...), and
players a chart puts level (four linebackers at rank 1 for three places) are taken by who has
been playing most, his median involvement over his last five games, then his id. Before that
fix the order among them was whatever an unstable sort left, which moved with the numpy
build: three rebuilds on the same data gave 63.1%, 62.7% and 62.6% walk-forward and 37, 38
or 39 graded wins in 2026, and JAX@DEN changed sides between published builds. Now the same
data gives the same numbers, whatever order the chart's rows come in. The home-minus-away
difference per group, in hundreds of Elo points, beside a home-field column (1 at the home
team's ground, 0 at a neutral site: London, Mexico City, Munich, a Super Bowl), feeds a
logistic regression for the home team winning with no other intercept, fitted on every
earlier season and tested on the next (walk-forward), and the coefficient of each group is
what the data says that position is worth in a matchup. (The home edge used to be a free
intercept that every game got, so a Wembley "home" team was 5-6 points too likely.) For the
season in progress the model is fitted on all completed seasons, graded on the games played
so far and asked about the next week's games from the latest depth charts, roster and injury
report (WHO PLAYS, below). The same walk-forward is also run on who actually played, for
comparison: that number is flattered by hindsight and is not the model's.

What those four changes (fullback, tie order, Doubtful, neutral sites) did to the record,
walk-forward 2013-2025 on 3,333 games, all on the same data: 2104 right (63.1%) and a log
loss of 0.6394 before, 2101 (63.0%) and 0.6392 after. Taken out one at a time: the neutral
site is worth 5 games; Doubtful costs 2 (log loss level); breaking ties on involvement rather
than on the id is worth 13; the fullback fix costs 10 (log loss 0.6385 with the fullback in
the RB2 slot). A fullback, rated near 1500 on a handful of touches, was a steadier number than
the real second back, but he is not the second back, and the matchups and the Elo picks need
the real one; the RB weight fell from 0.43 to 0.25 with him gone. All of it inside the 17
games the tie order alone used to move the record, so this is a correction, not a gain;
2026 so far, 37 of 65 before and 40 of 65 after on the same footing (each game on the model
fitted before it).

WHO PLAYS, for the coming games. The roster: nflverse's season roster carries each player
once, at the week of his latest entry, so a club's roster now is its rows at that club's own
latest week. A club on its bye has none for the bye week; reading only the league's latest
week called every player of a bye club a free agent (Mahomes, Kelce, Bryce Young and Chuba
Hubbard in week 5, the players map without a single Chief or Panther). Off the roster (a free
agent), on injured reserve or the PUP list, suspended or retired: not ranked and not in a
lineup. The injury report, for each club's next game: once the club files its game statuses,
Out and Doubtful are out, Questionable is listed with a Q unless he did not practise at the
last report, which counts him out. Before it files (Tuesday to Friday for a Sunday game), a
player Out or Doubtful at the club's previous report, or inactive for its last game after
being on that report, stays out until this week's report clears him: he practises (Full or
Limited), or the club files a practice report he is not on. Inactive is the roster's word: status
INA, or an active row carrying nflverse's inactive code (status_description_abbr I01, or I02 for an
emergency third quarterback), which is how the roster wrote Caleb Williams after week 5 of 2026
(ACT, I01): read as INA alone, he was expected to start week 6, while the props page, which reads
both, held him out. That window used to be read as
"nobody is out", and for four days a week the starters ruled out the week before were
expected to start (Caleb Williams as Chicago's QB in week 5, eleven such starters in week 4,
three of them quarterbacks). The page says how many clubs have filed.

THE POWER RATINGS. Each team rated on its results this season, not on its players, and every
game of the season judged again each time the table is built. Each final is one equation,
    R_home - R_away = clip(home margin, -C, C) - H * home          (home 0 at a neutral site)
weighted w = 0.5 ^ ((Wmax - week) / HALF), Wmax the latest week among the finals solved (the
playoffs are weeks 19-22, and count as the regular season does), and the ratings are the
weighted least-squares answer with every team pulled toward average as if it had also played
LAM games against average teams (a ridge):
    (X'WX + LAM I) R = X'W y        X: +1 for the home team, -1 for the away team
so R comes out centred on 0 (shown as 1500), in points of margin against an average team on a
neutral field. LAM 16, C 17, HALF 16 weeks, H 1.8397 (the 2012-2017 mean capped home margin,
measured, not tuned); a tie is a margin of 0. Each team's rating breaks down exactly, game by
game:
    R_t = sum(w * score) / (sum(w) + LAM)
    score = the team's capped margin, home field out, plus the opponent's rating now
so a game is worth what the opponent has turned out to be, not what it was rated when they met.
Why: until October 2026 the table was a margin Elo (every team at 0, and after each final
R_home += K * d, R_away -= K * d, d the capped margin less the one expected from the two
ratings at that moment), which judged a game once, on the opponent's rating that week, and
never again. The owner's case: Atlanta, rated low, beat Green Bay 35-14 at Lambeau in week 3,
Green Bay sank, and as Atlanta turned out better than its rating, Green Bay's loss kept
counting as a loss to a weak team; and the teams that beat the Chargers early kept their full
credit as the Chargers turned out among the worst. Now every game is re-scored: through week 5,
Green Bay's loss to Atlanta counts 1.6 points less against it (a game score of -20.20 then,
-18.57 now: Atlanta was -1.36 when they met, +0.27 now), and Arizona's win over the Chargers 2
points less (13.84 to 11.79: the Chargers now -2.05). With five games most teams sit within
about two points of average, so a re-judged opponent moves a game's score by a point or two
against margins of up to 17: a correction, not a reshuffle (rank correlation 0.988 with the
margin Elo's table through week 5; Atlanta is 2-3 with a point differential of -3, including a
3-34 home loss to Carolina, and stays mid-table). There is no preseason rating (the table is
this season's alone), so the Chargers were an average team, not a projected top one, when
Arizona beat them.
The chance against an average team on a neutral field is 1 / (1 + e^(-S * R)) with S 0.35941
log-odds a point (a game's home side adds H0 0.33195 to the log-odds; the table never needs
it). The players count too, at two tenths (PR_W, the owner's choice): the rating used is 0.8 of
R and 0.2 of each team's expected lineup on this season's player Elo (the game model's weights,
a log-odds against a team of 1500s, centred on the league, turned into points by 1 / S). Shown
as 1500 + 100 * R / 1.932 (1.932 points is the usual spread of R across the teams at the end of
a regular season, 2012-2025), so everyone starts at 1500 and the tiers spread as the season
does; after week 5 the shown spread is 61, against the margin Elo's 47, so the early table is
less bunched than it was.
The evidence, walk-forward (each game of weeks 2 on predicted by the table built on the finals
of the weeks before it, this season's alone): every constant chosen on 2012-2017 (1441 games)
and tested once on 2018-2025 (1999 games), log loss on the next game, the margin Elo with its
constants fitted the same way (K 1.7252, H 45.44, S 1.3954):
                          2012-2017            2018-2025
                          alone  blended       alone  blended    weeks 2-6   7 on (blended)
    margin Elo            0.6274  0.6248       0.6492  0.6454     0.6862    0.6273
    this table            0.6266  0.6243       0.6480  0.6447     0.6863    0.6263
On 2018-2025 that is -0.0012 alone (90% interval -0.0029 to +0.0005) and -0.0007 blended
(-0.0021 to +0.0006), Brier 0.2277 against 0.2281, -0.0010 blended cutting at each kickoff
instead of each week (Vegas: 0.6073). Without the recency weights (HALF infinite) it is 0.6272
on 2012-2017, and HALF is flat from 10 to 20 weeks. A margin Elo with its K re-tuned the same
way (2.0035) predicts as well (-0.0000 blended): the change is for the re-judging, not for
accuracy, and it costs none. The margin Elo's constants the build used until now (K 1.3461,
H 30.02, S 1.5771) were fitted on 2012-2025, so their 0.6426 blended on 2018-2025 is in-sample,
not a test; on 2026 through week 5 (62 games, a look, never tuned on) they and this table are
level, 0.6768 and 0.6769 blended (the margin Elo fitted on 2012-2017: 0.6818). Do not tune
these on the season in play.
Why not the lineups: rated walk-forward on 2018-2025 (weeks 2 on, parameters fitted on
2012-2017), the old table, each team's expected lineup on this season's player Elo, had a log
loss of 0.658 on the next game, and in weeks 2-6 0.696, no better than always taking the home
team; this one 0.648 and 0.688 (Vegas 0.607 and 0.630). Last season carried in as a hidden
prior fading game by game took another 0.011 off the margin Elo (0.03 early), but the table is
this season's alone, as asked. The ELO Model's game calls stay on the lineups and career
ratings, which predict better still. `teams` in model.json carries the rating (`elo`), its
chance against an average team (`p_avg`), the rating going into the team's last game (`before`:
the same solve on every final that kicked off before that game, its lineup part the team's
expected lineup now, not the one it took into that game, on the player ratings as they stood
before the week of its last game the player stats have rated; so it is not exactly what the
table showed then), the regular-season record the rating was built on (`record`, wins, losses,
ties) and the parts behind each shown number, which elo/check.py holds to games.csv with its own
code (`r` and `r_before`, the results part in points; `lg` and `lg_before`, the lineup part in
log-odds, centred on the league, none where a team has no lineup). The change since the last
game is that game, every re-scoring since and what the players' ratings did since, so a team
can move in a week it did not play, and any final moves every team. The Bets and Stats page's
Team Rankings tab is drawn from it.

OVERALL OFFENSE AND OVERALL DEFENSE (two pills in the ELO Ratings tab's position row). Each
team's offense and defense rated on this season's games, starting from a share of where it
finished last season (THE CARRY, below), as an Elo (the format the power ratings had until
October 2026), on nine key stats from nflverse's play-by-play, scrimmage plays
only (passes, sacks, scrambles and runs that have an EPA; kneels, spikes and two-point tries
left out):

    points          the offense's final score (games.csv)
    success rate    plays with a positive EPA, a share of plays
    EPA a play      expected points added a play
    giveaways       interceptions and lost fumbles, a drive (shown a game); fewer is better
    sack rate       sacks a dropback; fewer is better
    big plays       passes of 20 yards or more (not sacks or scrambles), runs and scrambles of 10
                    or more, a share of plays
    third down      third downs converted, a share of third downs
    red zone        drives that reached the 20 and ended in a touchdown, a share of those drives
    yards a play

A defense is rated on the same nine allowed: its takeaways and sacks are its opponents' giveaways
and sacks. Each stat of each team-game is put in standard deviations of a 2012-2017 team-game and
signed so that more is better for the offense (z), and each stat has its own Elo, offense against
defense: every unit starts the season at UNIT_CARRY (0.42) of its final rating last season, that
season rated from 0 (THE CARRY), and after each final

    e = O[off] - D[def] + H * home                 home +1, away -1, 0 at a neutral site
    O[off] += K * (z - e),  D[def] -= K * (z - e)

with K 0.08 and H the stat's own home field (UNIT_STATS: its mean, spread and home field, all
from 2012-2017). A stat a game does not have (a game with no red-zone trip) sits that game out.
Each side's rating is a weighted sum of its stats' ratings, which, the Elo being linear, is the
same as one Elo on the weighted game score:

    Overall Offense  = 35% points + 25% success rate + 15% EPA a play + 15% giveaways + 10% sack rate
    Overall Defense  = 50% points allowed + 30% big plays allowed + 10% takeaways + 10% sacks

The other stats (third down, red zone and yards a play; on offense big plays, on defense EPA and
success rate allowed) are shown with their league ranks and weigh nothing: once the weighted ones
are known, they told nothing more about the next game's points. Shown as 1500 + 100 * z across
every team with a rating (from the first day of a season all 32, since each starts carried), so
1500 is the average unit and 100 points a standard deviation, as the player rankings are; a
defense's number is higher the better it is. A team with no rated game yet this season is ranked
and shown on its carried rating, marked `carried`, never hidden. `before` is the unit's rating
going into its last game put on today's curve (for its first game, its carried start), so `change`
is its own movement and not the league's.

THE CARRY (13 October 2026; the owner asked whether the Season Tracker's Deep Dive or the Game
snapshot was the more accurate, and the snapshot's units, rated on this season alone with every
unit at 0, knew nothing in week 1 and little in weeks 2-4, where the Deep Dive, which blends in
four games of last season, beat them: 9.403 against 9.597). Each club's offense and defense on
every one of the nine stats now starts a season at UNIT_CARRY times its final rating the season
before (after its last game, playoffs in), instead of 0. It is the one-step form: last season
rated from 0 on its own games (unit_carry, through unit_elo, the same function), so a build needs
only last season's play-by-play, not the chain through every season before; the clubs are in
today's codes (OAK, SD and STL carry into LV, LAC and LA). UNIT_W, UNIT_K and the stats' home field
are held as they were, not refitted. UNIT_CARRY was chosen by elo/tools/units_fit.py, leaving one
season of 2013-2017 out at a time (the regular season's weeks 2 on, the points mapping fitted on
the other seasons of 2012-2017; 2012 has no season before it in the files): 0 to 1 by 0.1, then
0.32 to 0.48 by 0.02, 19 tries; 0.42 the lowest, 9.5307 against 9.5794 with no carry (the basin
is flat: 0.36 to 0.48 within 0.001). Tested once on 2018-2025, on elo/tools/deepdive_vs_units.py's
rows (the regular season's weeks 2 on, 3,998 team-games), the RMSE of an offense's points in its
next game: 9.424 with the carry against 9.501 without it (the league average 9.992, the Deep
Dive 9.599); weeks 2-4 9.325 against 9.597 (the Deep Dive 9.403); weeks 5-9 9.303 against 9.355;
weeks 10 on 9.525 against 9.545; week 1 9.492 against 9.848 (the Deep Dive still better there,
9.293); better in all 8 seasons; paired against no carry -1.461 a team-game (standard error
0.305, by game) overall and -5.150 (1.072) in weeks 2-4, and against the Deep Dive in weeks 2-4
-1.469 (0.964), ahead but not by two standard errors. Those are the one-step form's numbers; the
first test, with the full chain (each season's final itself carried from the one before), gave
9.422, 9.316 and 9.475 in week 1: a start's weight decays to about a quarter over a season, so
the two differ little. On units_fit.py's own rows (the playoffs in, UNIT_WF's footing) 9.431
against 9.508. Every player's rating already carried 0.75 of its distance from 1500 (CARRY); the
units carry their own share, set on their own test. The units feed no call: the game model, the
matchups and Team Rankings never read them, so the carry moves only these tables (Overall's two,
and since 16 October 2026 the position tables below) and the Game snapshot's Offense vs defense.

Why these weights (fitted before the carry, on every unit starting each season at 0, and held
since: the numbers in this paragraph are units_fit.py's as it ran before the carry, at git d3a5d2a;
it now prints the same comparisons on the carried ratings and, of the scores with nothing carried,
only the build's weights', 9.508, the `no_carry` below). elo/tools/units_fit.py rated every team-game
of 2012-2025 this way (on this script's own functions) and asked how well the two ratings going into a game predict the offense's
points in it, every parameter fitted on 2012-2017 and the error (RMSE) scored on 2018-2025, weeks
2 on: the league average with home field 9.979; each stat alone, points 9.543, EPA 9.564, yards a
play 9.596, success rate 9.682, third down 9.754, big plays 9.775, sack rate 9.840, red zone
9.896, giveaways 9.928; the old measure (two parts points and one part EPA, TOTAL OFFENSE AND
TOTAL DEFENSE until October 2026) 9.520; all nine with free weights 9.558, which overfits; all
nine equally 9.535; all nine with weights kept at zero or above 9.514, with shares of offense
points 37%, success rate 26%, giveaways 21%, EPA 11%, sacks 6% and defense points 56%, big plays
27%, takeaways 14%, sacks 4%, which the owner rounded to the weights above; and those weights
9.508, better than the old measure in 7 of 8 seasons but by 0.012, under one standard error
(0.25 on the squared error a team-game): built on the key stats and no less accurate, not a real
gain. Fitted on 2012-2021 and tested on 2022-2025 the same stats carry the weight (yards a play
takes a little), and the weights above score 9.311 against the old measure's 9.325. The old
measure is not kept as an input: points and EPA are in already, and it would count them twice.
(The research before the fit gave 9.504 for the same weights; its team-game table gave the
relocated clubs' home games of 2012-2019, OAK, SD and STL in games.csv against LV, LAC and LA in
the play-by-play, the away score and the away side. The fit reads the side off the play-by-play.)
With the carry the same weights score 9.431 there and the old measure, carried the same way, 9.441
(better in 5 of 8 seasons, by less than a standard error): UNIT_WF is that record, `no_carry` in it
the 9.508. The non-negative shares on the carried ratings move a little (offense points 39%,
success rate 26%, giveaways 21%, sacks 7%, EPA 7%; defense points 55%, big plays 26%, takeaways
16%, sacks 3%) and units_fit.py prints them as information only.

RUN DEFENSE, PASS DEFENSE AND PASS RUSH (16 October 2026, the owner's ask: "for ELO ratings, please
include a section for run defense, pass defense, and pass rush"; three more pills beside Overall
Offense and Overall Defense). Three tables of the 32 defenses, each made the way Overall's are: every
stat its own Elo of this season, offense against defense, opponents and home field counted, K 0.08,
every club starting at UNIT_CARRY of its final rating last season (rated from 0) on every stat, a final
the play-by-play lacks pending, shown as 1500 + 100 * z across the clubs with a rating, ranked, with each
stat's value, league rank and `adj`. The play-by-play's scrimmage plays as above; a run is a designed
run (nflverse's `rush`, which is never a scramble: a scramble is a dropback), a dropback any pass,
sack or scramble (`pass`: the dropbacks sack rate was already taken over), and a hit any dropback nflverse
flags `qb_hit`, or a sack (it flags a hit on 93-95% of sacks, and a sack is the hit that landed: 13-15%
of dropbacks a season). Five new stats, each with its mean, spread and home field from 2012-2017 as the
nine have (UNIT_STATS), and sack rate shared with Overall:

    Run Defense   = 55% EPA a run allowed + 45% run success rate allowed
    Pass Defense  = 100% EPA a dropback allowed (dropback success rate allowed shown, weighing nothing)
    Pass Rush     = 90% sack rate + 10% QB-hit rate

Each table is held to what it is for: the next game's measure of its facet, the offense's own number
in it, EPA a run for Run Defense, EPA a dropback for Pass Defense, sack rate for Pass Rush. That number
was regressed on both stats' ratings of the offense and the defense going into the game (plus home
field), every weight kept at zero or above, fitted on 2012-2017 weeks 2 on, the playoffs in (UNIT_WF's
footing), by elo/tools/def_units_fit.py: the defense's shares were 55.1% and 44.9% (run), 100% and 0%
(pass: once EPA a dropback is known, its success rate told nothing more, and the fit on 2012-2021 says
the same) and 89.4% and 10.6% (pass rush), rounded to fives for the weights above (the offense's shares,
25/75, 70/30 and 95/5, were kept as UNIT_TABLES' `opp` for the test alone until the offense tables
below published them). K, the carry and home field were held, not chosen again; the carry each table would
pick alone, leaving one season of 2013-2017 out at a time, is flat about 0.42 (run 0.8, pass 0.5, pass
rush 0.5, each within 0.0003 of 0.42's error) and is printed as information only. Tested once on
2018-2025 weeks 2 on (4,198 team-games), the RMSE of the next game's measure: Run Defense 0.2188 EPA a
run, against 0.2249 for the league average, 0.2198 for the same weights with nothing carried and 0.2216
for each club's raw numbers so far that season (the mean of its games before, nothing of its opponents
counted); Pass Defense 0.2968 EPA a dropback, against 0.3113, 0.2990 and 0.3012; Pass Rush 0.0455 of
sack rate, against 0.0470, 0.0457 and 0.0458. Each better than the raw numbers in all 8 seasons, by
1.2e-3, 2.6e-3 and 2.9e-5 on the squared error a team-game, 6.5, 5.0 and 3.5 standard errors (by game).
A game is noisy at this grain (a club runs 25 times), so the tables explain little of any one game, but
they order the defenses better than their raw numbers do. They feed no call, as Overall's do not: the
game model, the matchups (whose own pass and run defenses are the player Elo's units, FACET) and Team
Rankings never read them. The weights and the test are UNIT_TABLES' (`wf`), printed again by
def_units_fit.py with whether the build carries them.

RUN OFFENSE, PASS OFFENSE AND PASS PROTECTION (16 October 2026, the owner's call: "please add in
Offense vs defense their ELOs instead of the rankings when going through the position matchups", and,
asked what the offense's side should show, Elo on both sides, with offense ratings built the same way).
Three tables of the 32 offenses, the other side of the same three facets, each made exactly as the
defense tables are (the same stats, Elo, K, home field, carry, pending finals, curve, ranks and window;
each stat's Elo was already rated on both sides, offense against defense, so nothing new is rated, only
the offense's side of it weighed and shown):

    Run Offense      = 25% EPA a run + 75% run success rate
    Pass Offense     = 70% EPA a dropback + 30% dropback success rate
    Pass Protection  = 95% sack rate + 5% QB-hit rate (both taken: fewer is better)

The weights are the offense's shares of the same fit that gave the defense tables theirs (24.2% and
75.8%, 69.4% and 30.6%, 92.6% and 7.4%, rounded to fives), on 2012-2017 alone: one regression of each
facet's next-game measure on both sides' ratings at once, so the two tables of a facet are its two
halves and no new fit was made (`pair` names the other half). On 2012-2021 the same fit gives 30/70
for Run Offense, 74/26 for Pass Offense and 89/11 for Pass Protection, so the shares hold about where
they are; Run Offense's
leaning on success rate is the run game's steadiness counting for more than its EPA, whose big runs
come and go. The pair's test is the one above, which both halves carry. Each table was also tested once
on its own (`alone` in `wf`), on the same 2018-2025 weeks 2 on: the next game's measure forecast from
the one table and home field, nothing of the other side, against the same forecast from that side's
raw numbers so far that season. Run Offense 0.2207 EPA a run against 0.2227, better in all 8 seasons
(5.8 standard errors on the squared error a team-game, by game); Pass Offense 0.3009 EPA a dropback
against 0.3033, all 8 (3.3); Pass Protection 0.0457 of sack rate against 0.0459, 7 of 8 (2.7). The
defense tables, alone the same way: Run Defense 0.2227 against 0.2237, 7 of 8 (4.5); Pass Defense
0.3080 against 0.3094, 6 of 8 (3.3); Pass Rush 0.0469 against 0.0469, 5 of 8 (2.4: level at four
places, a sack is more the offense's than the defense's). So an offense says more about its own next
game than the defense it meets does, and each table orders its side better than its raw numbers, Pass
Rush only barely. They feed no call either. On the Game snapshot's position matchups they are set
against each other (the quarterback's own season Elo against Pass Defense, Pass Protection against Pass
Rush, Run Offense against Run Defense, Pass Offense against Pass Defense); the matchup's tag stays the
Deep Dive's own.

A final is rated only when the play-by-play has both offenses and its highest running score is
games.csv's final score; any other final (the play-by-play lags the score by a night, or has half
a game) is `pending`, also `sources.team_stats_pending`, counted nowhere and moving nobody until a
later run has it whole. `units` in model.json carries `stats` (each stat's key, label, side,
better and weight; `side` is the table it is shown in, `off`, `def`, `run_def`, `pass_def`,
`pass_rush`, `run_off`, `pass_off` or `pass_pro`), `weights` (percent, by table), `tables` (each
position table's `label`, `of`, the side of the ball it rates, `pair`, the table on the other side of
its facet, and its `walk_forward`), `params` (`carry`, UNIT_CARRY, and `carry_from`,
the season carried in, none for the first season in the files), `walk_forward`, `pending`, and for
every team in `off`, `def` and each position table its rating, `before`, `change`, `raw`, `rank`, `games`, `record` (the
regular season's, W-L-T), `start` (its carried rating on today's curve, where it began the season:
a line's first point; until October 2026 one `start` a side, a raw 0), `carried` (no rated game
yet, shown on that start), `line` (week and rating on today's curve after each game) and `stats`:
for each stat `v` (the season's value, none before a game; giveaways and takeaways a game), `rank`
(the league rank on that value among the teams that have played, ties sharing), `adj` (the rank of
the stat's own rating, the opponents counted, last season's carried share in it, among every team
with a rating), `r` (that rating) and,
for a weighted stat, `adds` (what it adds to the rating, in rating points). `ppg`, `ypg` and
`epa_play` stay, in `off` and `def` alone, for a page built before October 2026. Overall's stats
are UNIT_OVERALL's nine and its tables are exactly as they were before the position tables came
(a stat's Elo is its own, so a new one moves no other).

THE MATCHUPS. How much does a player's Elo, and the Elo of the defenders he faces, say about
his next game beyond what his recent games already say? For every QB, RB, WR and TE game
since 2016 in which the player was a regular (involvement at least 80% of the position's
norm), with at least three such games behind him, each stat the prop model prices is
regressed on:

    y = c0 + c1 home*f + c2 f + c3 f*(allowed - 1) + c4 f*p + c5 f*dl + c6 f*lb + c7 f*db

f is his recent average (exponentially weighted, half-life four games, previous seasons
included), allowed what the defence has given the position per game (half-life six) over the
league's, p his pre-game Elo and dl, lb, db the pre-game strengths of the opposing defensive
line, linebackers and secondary from the game model's expected lineups, all in hundreds of
points from 1500. The same fit without the last four terms is the form-only projection; the
difference is the Elo nudge. Seasons 2012-2015 only warm the ratings up; nothing is fitted on
them.

A receiver's catches, targets and yards also depend on where he stands in his own team's
pecking order: a WR1 averaging five catches keeps more of them than a WR3 who has averaged five
lately. So for those three stats a wide receiver's row carries f*WR1 and f*WR2 and a tight end's
f*TE1, his place among the expected starters at his position and himself, ranked on targets
going into the game (the same half-life four, every game he played). The rank is not Elo, so it
sits on the form side, in both fits, and the Elo nudge is not credited with it. Walk-forward
2017-2025 it took the typical miss on a wide receiver's yards from 35.594 to 35.445 (0.149, a
standard error of 0.040 over a bootstrap of players, better in 7 of 9 seasons), catches 2.143 to
2.137, targets 2.557 to 2.550; a tight end's yards 26.972 to 26.947, catches 1.955 to 1.951,
targets 2.239 to 2.234. It did nothing for touchdowns, which are left without it. Matching each
receiver to the corner most likely covering him (WR1 on the best expected corner by Elo, WR2 the
second, the slot the nickel) in place of the secondary's average was tried beside it and added
nothing once the rank was in: a defensive back's box score is a poor record of his coverage.
Nor did the opposing pass rush (sacks and QB hits per dropback, over the league) or the
receiver's own line's sacks allowed, for receivers or quarterbacks: what they say is already in
the defensive line's Elo and in what the defence has allowed.

The record is walk-forward: each season from 2017 projected by the fit on the seasons before it, graded on the typical miss with and without Elo and on how often the fifth of
games Elo moved most landed on the side it moved. Through 2025 the Elo part helps passing
yards, passing TDs and completions, running back carries, and receivers' and tight ends'
catches, targets, yards and touchdowns (their biggest nudges right 53-63% of the time); it
adds nothing to rushing yards, quarterback rushing, interceptions or running back receiving,
and the page fades those. The coming week's projections are for the expected starters, from
the latest ratings, the depth charts and the injury report, with the formula fitted on every
completed season.

THE RANKINGS are of this season alone. Beside the rating above, every player carries a second
one that starts the season at 1500 and moves only on this season's games, by the same
formula against the same units but with placement games, as Glicko and the ranked ladders of
games do it: a new rating is uncertain, so its K starts high and shrinks with every game,
K = max(32, 695 / (games + 4)): 174, 139, 116, 99, 87 ... 35 at game 17. 695 is one over the
slope of E at even odds (400 / (ln 10 x 0.25)), so to first order the rating after n games is
the plain mean of their results with a prior of three games at 1500: every game counts the same
(times its weight w). The schedule before October 2026, 32 + 128 x 0.6^games (160, 109, 78,
60, 49 ...), counted a season's first game about twice as much as a later one. On 2013-2025,
on the same games, equal weights rank next season's output better (Spearman, score a game:
backs 0.605 to 0.621, linemen 0.542 to 0.558, defensive backs 0.429 to 0.450; tight ends' yards
a target 0.152 to 0.166; each with a 90% interval above zero, and no position worse beyond
the noise), the rest of the season from week 5 better for backs (0.520 to 0.539), tight ends, receivers, linemen and
linebackers, and the starter above his backup more often everywhere but at running back (91.7%
to 90.9%). The kickers' week 5 (0.160 to 0.139) and the backs' yards a carry (0.165 to 0.158)
went the other way, both inside the noise. The season rating of a full-time defender now stands
further above a part-timer's with the same output a snap (the partial correlation with snap
share: linemen 0.28 to 0.32, linebackers 0.72 to 0.75, defensive backs 0.67 to 0.70); for the
linemen, whose snap share ranks next season's output a snap beyond this season's (0.17), that is
skill the box score misses, and the schedule puts no more weight on playing time itself (a
rating with every result set to 0.5, playing time alone, has a partial of 0.66 for linemen
under the old schedule and 0.63 under this one). The Power Ratings' blend is level (0.6462 to
0.6461 in log loss on 2018-2025), so its two tenths stand. Everyone
starts at 1500 with that uncertainty rather than at the bottom: a start at the bottom would
rank players by how many games they have had, not how well they played. The table ranks that one, and a player needs enough rated games
this season to be ranked -- games in a real role (at least half his position's normal
workload) in at least half of his club's rated games, so the table is not filled with players
a few snaps have left near 1500. A ranked player with fewer than three games in a real role
is marked provisional (`prov` on his row in the table, `prov_games` in players.json): in a
season's first weeks the bar is two games, and two games put Drew Lock 7th among the
quarterbacks and Za'Darius Smith 5th among the defensive linemen in week 5 of 2026. A bar of
three would empty the table in weeks 1 and 2, so it is a mark, not a bar. It was half the weeks in which anyone had played, so a lone
Thursday game raised the bar for all 32 clubs: from Friday to Monday the #1 tight end and four
top-15 quarterbacks fell out of the table with no note, and a club's bye counted against its
players. "Through week N" is the latest week whose games are all rated, with the week under
way beside it ("through week 4, and 1 of 15 week-5 games"); in the playoffs, the round. The
models -- the game model, the matchups and the page's market
+ form -- read the rating with every season behind it, which is what their records were
proven on: three games is too little to price from. players.json carries both for every
player the models may price: `elo` (career), `se` and `rank` (this season, where he has one).
A player the roster or the report keeps out is not in that map, so nothing prices him or
suggests his lines; his season so far (`s0`, `h`) is kept beside it in `past`, because the
Prop Record grades the weeks he did play on the rating he took into each (it graded them at
1500). The Move column is against where each stood before the latest week's games; in the
season's first week there is no week before, and nobody has moved.

THE LADDER. Player Elo at a position spreads far less than team Elo (a standard deviation of
20 to 60 points, where the shields' bands are 50 wide), so on the raw number nearly everyone
was Silver or Gold. What is shown is the season rating put on a bell curve within the
position: 1500 plus 100 points for every standard deviation above the position's ranked
players (the career and peak columns the same way, on the position's career pool). The shields then
split a position the way a ranked ladder splits its players (the tiers as betting/tools/tiers.js
sets them): HOF (2.5 sd up, a gem) well under 1%, Elite about 2%, Master 4%, Diamond 9%,
Platinum 15%, Gold and Silver 19% each, Bronze 15%, Iron 9% and the Wood League (1.5 sd down)
7%, the average player on the line between Silver and Gold. The order is untouched; only the scale
moves. The raw ratings stay in `raw` and `career_raw`, and the models never read the shown
ones.

THE CALLS AND THEIR RECORD. Each coming game's call (the pick and the home side's chance) is
written to a ledger, elo/data/calls.json, on every run until the game kicks off (a call made
within CALL_LEAD minutes of kickoff does not count as published before it); from kickoff the
entry is frozen, and the season's record (`graded` in model.json, which the Pick'em Record
counts) grades that call, the one a visitor saw. It used to regrade the whole season on every
run, on whatever formula and tie order the run had: 2026_03_SEA_WAS was published as WAS, then
graded as a SEA pick and a loss. A game never called before kickoff -- weeks 1-2 of 2026, which
came before the model was published, or a week the job did not run -- is called once on its
pre-game ratings the first time it is graded, frozen, and marked a backtest (`src`), and the
record counts the two apart. The calls published before the ledger began are in
elo/history/calls_<season>.json, recovered from model.json's git history by
elo/tools/seed_calls.py. A game under way, or final but not yet rated (its player stats lag
the score by a night), stays in `next` with its frozen call, so its pick does not vanish.

THE JOKER BASELINE (the owner's call of 19 October 2026: "the elo model has been underperforming
pretty significantly so I want to do a test. I want it to apply the ELO matchups to still predict
outcomes but I want it to use the model the Joker as a baseline to make its picks"). From that day a
call is not the game model's own chance but the Joker's, moved by the Elo matchup:
    log-odds(home wins) = log-odds(the Joker's chance, held within 1% and 99%) + BETA * m
The Joker's chance is the betting job's (betting/state.json's `joker`, every game it has called,
frozen there at kickoff) as it stands when this build runs. m is the game model's matchup alone:
over the position groups, its weight (`coef`) times the expected lineups' Elo gap, home minus away,
in hundreds, with home field left out, since the Joker's chance already carries the home edge and a
neutral site. BETA (JOKER_BASE, 0.2058: a typical game's matchup moves the Joker's log-odds about
0.17, some 4 points of chance) is elo/tools/joker_base_fit.py's, fitted once on 2021-2025, the
seasons both models were called walk-forward in research study 4 (models_compare,
results/after_team_codes): the Joker's chance held as it is, only how far the matchup moves it
fitted. Walk forward on 2022-2025, BETA fitted on the seasons before each: 707-377 (65.2%) and a log
loss of 0.6345, against the Joker alone 687-397 (63.4%, 0.6354) and the game model alone 698-386
(64.4%, 0.6343) on the same 1,084 games; the matchup turned the Joker's pick round in 46 of them
(4.2%) and was right in 33. Tried and not kept: the Joker's log-odds given a weight of their own,
711-373 and 0.6283, which is a mix of the two models, not the Joker as the baseline; a home-field
term beside m, 704-380. A game the Joker has not called (its step failed, or a new season's week 1
before the betting job has the schedule) is called by the game model alone, as before, with no
`base`. Each call keeps the game model's own chance beside it (`p_elo`), and the Joker's (`p_joker`)
where it stands on it, in `next` and in the ledger, so the test can be read both ways on the same
games; the record counts the calls on the Joker apart (`record.joker_base`, and the first week one
was published, `joker_base_from_week`). The game model itself is unchanged: it is still fitted,
graded walk-forward (`walk_forward`) and read by the power ratings; only the call stands on the
Joker. Never refit BETA on the season in play.
The season's games played before the first build on the Joker (JOKER_FROM) were re-picked on it (the owner's
call of the same day: "i just dont see any changes in the ELO model pickem record and i wanted you to change it
based on what it would have picked"): each such game the Joker has a call for, graded with a call on no base, is
called again once, after the game, on what was known before its kickoff (the Joker's call as frozen at kickoff, the
game model fitted before the season on the pre-game ratings and lineups, as any backtest is), marked a backtest,
with the call first made kept beside it in `was` (in the ledger and on the graded call), so the record grades the
re-pick and still says what was first picked (`record.repicked` and `repicked_was`): 62-29 where the first picks
went 52-39, 24 picks turned round, 17 of them right. A game that kicked off after JOKER_FROM is called on the Joker
before its kickoff and never re-picked.

THE SEASON comes from games.csv alone. The newest schedule nflverse has posted is the season
in play once its first game kicked off UNDER_WAY hours ago; before that (from the spring
release of a schedule to its opener) the page stays on the finished season, and the new one's
week 1 is called in the fortnight before it. The rankings follow once RANK_TEAMS clubs have a
rated game, so a Thursday opener does not leave a table of two teams. The playoffs are rated
as they come (WC, DIV, CON, SB after week 18); `phase` in the files is regular, postseason,
over or opening.

THE SOURCES. Every file a season under way needs -- its player stats, depth charts, injury
report, roster and play-by-play, every past season's stats, charts and reports, and the
play-by-play of the season before it and, while the rankings are still on the finished season
(before the new one is under way, and until RANK_TEAMS clubs have a rated game in it), of the
season before that (the units carry the one before theirs, THE CARRY; once the rankings move, the
season before last is not read) -- is required: a download that fails (after lib/netfetch.py's five tries; a 404 is not retried) stops the build
before anything is written, so the job commits nothing and the last good files stay live. A
failed injury or roster download used to publish IR and Out players as ranked starters, and a
failed team-stats download every offense and defense at 1500, on a green run. A download is
written whole or not at all. What each source gave is in `sources` in model.json, and the page
says when the player stats or the play-by-play lag a final or a club has not filed its statuses.
Every club is read in today's code (TEAM_NOW): games.csv, the depth charts and the injury reports
write a club as it was called that season (OAK before 2020, SD before 2017, STL before 2016), the
player stats, rosters and play-by-play as it is called now (LV, LAC, LA). Read as written, the
game model matched none of those clubs' players to their games before the moves: until 13 October
2026 the 263 such games of 2012-2019 were left out of its fit and walk-forward, and the matchup
formula read the clubs' home games as away games. The player ratings, which read the stats by game
id and opponent, were never affected. The fix moved the game model's weights (and with them the
coming calls and the lineup part of the power ratings, by two points at most), its walk-forward
record and the matchup formula's fit. The game ids stay as nflverse writes them.

Everything it writes goes to elo/data/, which the X NFL Bets and Stats page reads on load
(the fitted weights and the who-played walk-forward are kept for the record and the smoke
test; no page draws them), each file written whole once everything is built:
    elo/data/players.json   rankings by position, every rated player's rating and club, and
                            the season so far of each player kept out (`past`)
    elo/data/model.json     the fitted weights, the walk-forward record (pre-game lineups, and
                            who played), this season's graded calls (frozen at kickoff), the
                            coming week's calls, the teams' power ratings, the units, `sources`
    elo/data/matchups.json  the matchup formula per position and stat, its walk-forward record,
                            the coming week's projections for every expected starter, each
                            club's expected lineup and who is out of it and why
    elo/data/calls.json     the ledger of calls as published before kickoff (THE CALLS)
elo/check.py and elo/check_tab.js are the gate the job runs before it commits.
"""
import argparse, bisect, datetime, json, math, os, sys, zoneinfo
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'lib'))
import netfetch  # noqa: E402  (lib/netfetch.py: the download rule the NFL jobs share)
CACHE = os.path.join(HERE, 'cache')
PAST_LIST = os.path.join(CACHE, 'past.lst')   # the finished seasons' files load() read (the job's cache)
OUT = os.path.join(HERE, 'data')
HISTORY = os.path.join(HERE, 'history')
FIRST = 2012
# the formula's version: bumped with a deliberate change to the ratings, the lineups or the game
# model, so elo/check.py knows a reshuffled table is the change and not a fault
FORMULA = '2026-10-13'
# THE JOKER BASELINE: a call is the Joker's chance moved by the Elo matchup, by elo/tools/joker_base_fit.py
JOKER_BASE = {"beta": 0.2058, "fit": "2021-2025", "test": "2022-2025", "walk_forward": {"2022": {"games": 269, "beta": 0.2277, "right": 171, "logloss": 0.633, "joker": 166, "joker_logloss": 0.6332, "elo": 167, "elo_logloss": 0.6368}, "2023": {"games": 272, "beta": 0.1844, "right": 173, "logloss": 0.6702, "joker": 167, "joker_logloss": 0.6711, "elo": 166, "elo_logloss": 0.6537}, "2024": {"games": 272, "beta": 0.1667, "right": 190, "logloss": 0.6025, "joker": 185, "joker_logloss": 0.6124, "elo": 189, "elo_logloss": 0.5988}, "2025": {"games": 271, "beta": 0.2862, "right": 173, "logloss": 0.6323, "joker": 169, "joker_logloss": 0.6247, "elo": 176, "elo_logloss": 0.6481}}}
JOKER_STATE = os.path.join(os.path.dirname(HERE), 'betting', 'state.json')   # the betting job's published state: the Joker's calls
JOKER_CLIP = 0.01       # the Joker's chance is held within 1% and 99% before it is moved
CALL_KEEP = ('base', 'p_joker', 'p_elo', 'm')      # what a call keeps beside its pick and chance
# the first build that called on the Joker's baseline: a game of the season that kicked off before it is
# re-picked on it once, after the game, its first call kept in `was` (THE JOKER BASELINE)
JOKER_FROM = datetime.datetime(2026, 10, 19, 15, 20, tzinfo=datetime.timezone.utc)
# the clubs that moved, from the code of the day (games.csv, the depth charts, the injury
# reports) to today's (the player stats, rosters and play-by-play): THE SOURCES
TEAM_NOW = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'}
ET = zoneinfo.ZoneInfo('America/New_York')     # games.csv gives kickoffs in US Eastern; DST from the zone, never a date
UNDER_WAY = 36          # hours after a season's first kickoff by which nflverse has its player stats: from then on its files are required
CALL_LEAD = 15          # minutes: a call made closer to kickoff than this is not counted as published before it
PRESEASON_CALLS = 14    # days: a new season's week 1 is called this close to its first kickoff
RANK_TEAMS = 16         # a new season's rankings start once this many teams have a rated game
STATS_URL = 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{y}.csv'
ROSTER_URL = 'https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_{y}.csv'
INJ_URL = 'https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_{y}.csv'
DC_URL = 'https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_{y}.csv'
PBP_URL = 'https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{y}.csv.gz'
# the play-by-play columns the team units (Overall Offense and Overall Defense, and the position tables:
# Run Defense, Pass Defense, Pass Rush and their offense sides) are made of (read with usecols)
PBP_COLS = ['game_id', 'home_team', 'posteam', 'defteam', 'play_type', 'pass', 'rush', 'qb_kneel', 'qb_spike', 'two_point_attempt',
            'qb_scramble', 'epa', 'success', 'yards_gained', 'sack', 'qb_hit', 'interception', 'fumble_lost',
            'third_down_converted', 'third_down_failed', 'fixed_drive', 'fixed_drive_result', 'drive_inside20',
            'total_home_score', 'total_away_score']
# the depth chart's own labels to the rated groups: the weekly files name positions, the daily
# ones name slots. Returners, holders, punters, snappers and the offensive line are not rated.
SLOT = {'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'HB': 'RB', 'WR': 'WR', 'TE': 'TE', 'K': 'K', 'PK': 'K',
        'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'DL': 'DL', 'LDE': 'DL', 'RDE': 'DL', 'LDT': 'DL', 'RDT': 'DL',
        'LB': 'LB', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'SLB': 'LB', 'WLB': 'LB', 'LILB': 'LB', 'RILB': 'LB',
        'CB': 'DB', 'DB': 'DB', 'S': 'DB', 'FS': 'DB', 'SS': 'DB', 'SAF': 'DB', 'LCB': 'DB', 'RCB': 'DB', 'NB': 'DB'}
# what a roster status means for the rankings: only the active list is ranked. INA (inactive for
# the club's last game) is not a standing status: it is read with the injury report (availability)
STATUS = {'ACT': None, 'INA': None, 'RES': 'on injured reserve', 'PUP': 'on the PUP list', 'RET': 'retired', 'DEV': 'on the practice squad',
          'CUT': 'a free agent', 'EXE': 'on the exempt list', 'SUS': 'suspended', 'NON': 'on the non-football injury list'}
# a status a player keeps after his club's later rosters stop listing him (anything else: he left it)
STANDING = {'RES', 'PUP', 'RET', 'SUS', 'EXE', 'NON'}
# the injury report's game statuses that keep a player out of the expected lineup (Doubtful players
# rarely play: the page has always read them as out, and the lineups now do too)
OUT_STATUS = ('Out', 'Doubtful')
GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'

GROUP = {'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'WR': 'WR', 'TE': 'TE', 'K': 'K',
         'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'DL': 'DL',
         'LB': 'LB', 'OLB': 'LB', 'ILB': 'LB', 'MLB': 'LB',
         'CB': 'DB', 'DB': 'DB', 'S': 'DB', 'SAF': 'DB', 'FS': 'DB', 'SS': 'DB'}
GROUPS = ['QB', 'RB', 'WR', 'TE', 'K', 'DL', 'LB', 'DB']
LABEL = {'QB': 'Quarterbacks', 'RB': 'Running backs', 'WR': 'Wide receivers', 'TE': 'Tight ends',
         'K': 'Kickers', 'DL': 'Defensive line', 'LB': 'Linebackers', 'DB': 'Defensive backs'}
# the opposing unit each group plays against: (side the unit belongs to, facet)
FACET = {'QB': 'pass_d', 'WR': 'pass_d', 'TE': 'pass_d', 'RB': 'rush_d', 'DB': 'pass_o', 'DL': 'run_o', 'LB': 'run_o', 'K': None}
# the depth a team fields at each group, and how much each slot counts in the game model
DEPTH = {'QB': [1.0], 'RB': [1.0, 0.5], 'WR': [1.0, 0.7, 0.45], 'TE': [1.0], 'K': [1.0],
         'DL': [1.0, 0.8, 0.6, 0.4], 'LB': [1.0, 0.7, 0.4], 'DB': [1.0, 0.8, 0.6, 0.5, 0.4]}
# the groups scored on what they produced (yards, touchdowns, fumbles lost) rather than on EPA (THE SCORES)
PRODUCED = ['RB', 'WR', 'TE']
# a game's weight is involvement over this norm, capped at one
VOLUME ={'QB': 25, 'RB': 12, 'WR': 6, 'TE': 4, 'K': 3, 'DL': 5, 'LB': 5, 'DB': 5}
K_NEW, K_SET, K_UNIT, SETTLED = 56.0, 32.0, 120.0, 8
# the season rating's placement: K = max(K_SET, K_PLACE_SUM / (games + K_PLACE_N)), so the
# first games move it hard (174, 139, 116, 99, 87 ...) and every game ends up counting the same:
# K_PLACE_SUM is one over the slope of E at even odds, 400 / (ln 10 * 0.25), which makes the
# rating (to first order) the mean of its games' results with a prior of K_PLACE_N - 1 games at
# 1500; the shown rating puts each position on a bell curve, 100 points a standard deviation
# from 1500 (see THE RANKINGS)
K_PLACE_SUM, K_PLACE_N, SHOW_SD = 695.0, 4, 100.0
REPLACEMENT = 1450.0
PROV_GAMES = 3      # a ranked player with fewer real-role games than this is marked provisional (prov)
QB_START = 1450.0   # a quarterback's first career rating (from the second season on): a new one is seldom an average starter
TD_YARDS = {'RB': 10.0}    # a touchdown, in yards of production (PRODUCED); 20 where not named
DL_HIT_EXTRA = 1.0  # a defensive lineman's QB hit counts double: this on top of every defender's one
LEFT_EARLY = 0.35   # involvement under this share of a regular's recent median: the game is not rated
CARRY = 0.75      # share of the distance from 1500 a rating keeps across an offseason
# an average kicker's make rate by distance, for points over expectation
FG_RATE = {'0_19': 0.99, '20_29': 0.97, '30_39': 0.90, '40_49': 0.78, '50_59': 0.63, '60_': 0.35}
PAT_RATE = 0.95


class Missing(Exception):
    """a source file that could not be had"""


def fetch(url, dest, offline):
    """the file at url, cached at dest. The download is lib/netfetch.py's (the rule every NFL job
    shares): written whole or not at all, a transient failure (a 5xx, 429, timeout, reset, or an empty
    or HTML body) tried again on waits of 5, 15, 30 and 60 seconds under one retry budget for the run,
    since nflverse's release host drops the odd request (three 500s in a row on depth_charts_2019.csv
    refused the run of 13 October 2026), and a 404 answered at once."""
    if os.path.exists(dest):
        return dest
    if offline:
        raise Missing(f'offline and {os.path.basename(dest)} is not cached')
    print(f'  downloading {os.path.basename(dest)}', flush=True)
    try:
        return netfetch.download(url, dest)
    except netfetch.FetchError as e:
        raise Missing(str(e)) from e


def kickoff(gameday, gametime):
    """a game's kickoff in UTC: games.csv gives the day and the time in US Eastern, and the zone
    knows when the clocks change"""
    t = gametime if isinstance(gametime, str) and ':' in gametime else '13:00'
    local = datetime.datetime.strptime(f'{gameday} {t[:5]}', '%Y-%m-%d %H:%M').replace(tzinfo=ET)
    return local.astimezone(datetime.timezone.utc)


def under_way(games, season, now):
    """a season is under way once its first game kicked off UNDER_WAY hours ago: from then on
    nflverse has its files, and a failure to download one is a fault, not the calendar"""
    g = games[games.season == season]
    if not len(g):
        return False
    first = min(kickoff(d, t) for d, t in zip(g.gameday, g.gametime))
    return now >= first + datetime.timedelta(hours=UNDER_WAY)


def load(offline, now):
    """every source, as {name: frame}, with what was had and what was not in `sources`. A file
    the season under way needs, or any past season's, that cannot be had stops the build before
    anything is written (SystemExit 1, so the job commits nothing and the last good files stay
    live): an injury report or a roster that failed to download would otherwise publish the
    injured as starters and the released as ranked, on a green run."""
    dest = os.path.join(CACHE, 'games.csv')
    if not offline and os.path.exists(dest):
        os.remove(dest)                          # scores land every week: never trust a cached schedule
    try:
        games = pd.read_csv(fetch(GAMES_URL, dest, offline), low_memory=False)
    except Missing as e:
        raise SystemExit(f'elo: the schedule could not be had ({e}); nothing written, the published files stay')
    games = games[games.season >= FIRST].copy()
    sched = int(games.season.max())              # the newest schedule nflverse has posted
    live = under_way(games, sched, now)
    sources, missing, past = {}, [], []
    if os.path.exists(PAST_LIST):
        os.remove(PAST_LIST)                     # written again below only when every source was had

    def read(name, url, y, required, fresh, ext='csv', usecols=None):
        dest = os.path.join(CACHE, f'{name}_{y}.{ext}')
        # the season in progress changes every day: never trust its cached copy
        if fresh and not offline and os.path.exists(dest):
            os.remove(dest)
        try:
            # usecols names every column read, so a column nflverse renames fails here, loudly
            try:
                d = pd.read_csv(fetch(url.format(y=y), dest, offline), low_memory=False, usecols=usecols)
            except (pd.errors.ParserError, pd.errors.EmptyDataError, ValueError, OSError, EOFError) as e:
                # a finished season's copy the job's cache restored and that will not read is fetched
                # once more, so one bad copy cannot refuse every run after it
                if offline or fresh or not os.path.exists(dest):
                    raise
                print(f'  the cached {os.path.basename(dest)} did not read ({str(e)[:120]}): fetching it again', flush=True)
                os.remove(dest)
                d = pd.read_csv(fetch(url.format(y=y), dest, offline), low_memory=False, usecols=usecols)
            if not len(d):
                raise Missing(f'{name}_{y}.{ext} has no rows')
        except (Missing, pd.errors.ParserError, pd.errors.EmptyDataError, ValueError, OSError) as e:
            if required:
                missing.append(f'{name} {y} ({e})')
            else:
                print(f'  no {name} file for {y} yet ({e})')
            if y == sched or y == sched - 1:
                sources[f'{name}_{y}'] = {'ok': False, 'required': required, 'error': str(e)[:200]}
            return None
        if y >= sched - 1:
            sources[f'{name}_{y}'] = {'ok': True, 'rows': int(len(d))}
        if not fresh:
            past.append(os.path.basename(dest))
        return d

    frames, charts, injuries, sched_stats = [], {}, {}, None
    for y in range(FIRST, sched + 1):
        # a past season's files are all required; the newest schedule's only once it is under way
        req = y < sched or live
        d = read('stats_player_week', STATS_URL, y, req, y == sched)
        if d is not None:
            frames.append(d)
            if y == sched:
                sched_stats = d
        # who was expected to play: every season's depth charts and injury reports
        for name, url, store in (('depth_charts', DC_URL, charts), ('injuries', INJ_URL, injuries)):
            d = read(name, url, y, req, y == sched)
            if d is not None:
                store[y] = d
    # who can play now: the newest schedule's roster (before it is under way, last season's
    # stands in); and the season's play-by-play, for Overall Offense and Overall Defense
    roster = read('roster', ROSTER_URL, sched, live, True)
    if roster is None and not live:
        roster = read('roster', ROSTER_URL, sched - 1, False, True)
    # (the season before too, once the new one is under way: Overall Offense and Overall Defense
    # follow the rankings, which stay on the finished season until most clubs have played)
    pbp = {sched - 1: read('play_by_play', PBP_URL, sched - 1, True, not live, 'csv.gz', PBP_COLS)}
    if live:
        pbp[sched] = read('play_by_play', PBP_URL, sched, True, True, 'csv.gz', PBP_COLS)
    # and the season before that, finished, which they carry into the rankings' season whenever
    # that is the finished one (before the new season is under way, and until RANK_TEAMS clubs
    # have a rated game in it, by main()'s own rule, ranked_clubs): required then, and not read
    # at all once the rankings are on the season in play, which carries from sched - 1 alone;
    # none before FIRST, whose season starts from 0
    if sched - 2 >= FIRST and (not live or sched_stats is None or ranked_clubs(sched_stats) < RANK_TEAMS):
        pbp[sched - 2] = read('play_by_play', PBP_URL, sched - 2, True, False, 'csv.gz', PBP_COLS)
    if missing:
        raise SystemExit('elo: required sources could not be had, so nothing is written and the published '
                         'files stay:\n  ' + '\n  '.join(missing))
    # the finished seasons' files, which never change: the job keeps exactly these between runs
    # (actions/cache in elo.yml), so a run asks nflverse for the season in play, games.csv and the
    # roster alone. A file read fresh (the season in play, the roster, games.csv) is never listed.
    with open(PAST_LIST, 'w') as f:
        f.write(''.join(n + '\n' for n in sorted(past)))
    stats = pd.concat(frames, ignore_index=True)
    stats = stats[stats.position.isin(GROUP)].copy()
    stats['group'] = stats.position.map(GROUP)
    stats = stats[stats.game_id.notna()]
    # every club in today's code (THE SOURCES): the schedule, the depth charts and the injury
    # reports write the code of the day, the player stats, rosters and play-by-play today's
    now_code = lambda s: s.replace(TEAM_NOW)
    games['home_team'], games['away_team'] = now_code(games.home_team), now_code(games.away_team)
    for d in list(charts.values()) + list(injuries.values()):
        for c in ('club_code', 'team'):
            if c in d.columns:
                d[c] = now_code(d[c])
    return games, stats, roster, charts, injuries, pbp, sources


# THE POWER RATINGS (see the docstring): every constant chosen on 2012-2017 and never refitted. The
# ridge's pull toward average in games (PR_LAM), the margin cap (PR_C), the recency half-life in weeks
# (PR_HALF), the home field in points (PR_H, the 2012-2017 mean capped home margin, measured, not
# tuned), the log-odds a point (PR_S), the home field in a game's log-odds (PR_H0: the table never
# uses it, a game priced off the table would), the usual spread of R across the teams at the end of a
# regular season (PR_SPREAD, 2012-2025, which only sets how a rating is drawn) and the lineups' share
# (PR_W, the owner's choice)
PR_LAM, PR_C, PR_HALF, PR_H = 16.0, 17.0, 16.0, 1.8397
PR_S, PR_H0, PR_SPREAD, PR_W = 0.35941, 0.33195, 1.932, 0.2


# OVERALL OFFENSE AND OVERALL DEFENSE (see the docstring). Each stat, as a team-game value from the
# offense's side: its labels for each side, +1 where more is better for an offense, how the game's
# value and the season's are made from the play-by-play's sums (numerator, denominator: None is
# one), the mean and spread of a team-game on 2012-2017, the home field in standard deviations,
# and how the page prints it. Every number from elo/tools/units_fit.py, never refitted on the
# season in progress.
UNIT_STATS = {
    'pts':   {'off': 'Points a game', 'def': 'Points allowed a game', 'off_short': 'Pts/g', 'def_short': 'Pts allowed/g',
              'sign': 1, 'game': ('pts', None), 'season': ('pts', 'g'), 'mu': 22.7288, 'sd': 10.1297, 'home': 0.129, 'fmt': 'f1'},
    'sr':    {'off': 'Success rate', 'def': 'Success rate allowed', 'off_short': 'Success', 'def_short': 'Success allowed',
              'sign': 1, 'game': ('succ', 'plays'), 'season': ('succ', 'plays'), 'mu': 0.4235, 'sd': 0.073, 'home': 0.021, 'fmt': 'pct'},
    'epa':   {'off': 'EPA a play', 'def': 'EPA a play allowed', 'off_short': 'EPA/play', 'def_short': 'EPA/play allowed',
              'sign': 1, 'game': ('epa', 'plays'), 'season': ('epa', 'plays'), 'mu': -0.0114, 'sd': 0.1973, 'home': 0.002, 'fmt': 'epa'},
    'tor':   {'off': 'Giveaways a game', 'def': 'Takeaways a game', 'off_short': 'Giveaways/g', 'def_short': 'Takeaways/g',
              'sign': -1, 'game': ('to', 'drives'), 'season': ('to', 'g'), 'mu': 0.12, 'sd': 0.1035, 'home': 0.018, 'fmt': 'f2'},
    'skr':   {'off': 'Sack rate', 'def': 'Sack rate', 'off_short': 'Sack rate', 'def_short': 'Sack rate',
              'sign': -1, 'game': ('sacks', 'db'), 'season': ('sacks', 'db'), 'mu': 0.0608, 'sd': 0.0444, 'home': 0.031, 'fmt': 'pct'},
    'xr':    {'off': 'Big-play rate', 'def': 'Big-play rate allowed', 'off_short': 'Big plays', 'def_short': 'Big plays allowed',
              'sign': 1, 'game': ('expl', 'plays'), 'season': ('expl', 'plays'), 'mu': 0.0965, 'sd': 0.0403, 'home': 0.081, 'fmt': 'pct'},
    'third': {'off': 'Third-down rate', 'def': 'Third-down rate allowed', 'off_short': '3rd down', 'def_short': '3rd down allowed',
              'sign': 1, 'game': ('third_c', 'third_n'), 'season': ('third_c', 'third_n'), 'mu': 0.387, 'sd': 0.1423, 'home': 0.085, 'fmt': 'pct'},
    'rz':    {'off': 'Red-zone touchdown rate', 'def': 'Red-zone touchdown rate allowed', 'off_short': 'Red zone', 'def_short': 'Red zone allowed',
              'sign': 1, 'game': ('rz_td', 'rz_trips'), 'season': ('rz_td', 'rz_trips'), 'mu': 0.5494, 'sd': 0.3181, 'home': 0.017, 'fmt': 'pct'},
    'ypp':   {'off': 'Yards a play', 'def': 'Yards a play allowed', 'off_short': 'Yds/play', 'def_short': 'Yds/play allowed',
              'sign': 1, 'game': ('yds', 'plays'), 'season': ('yds', 'plays'), 'mu': 5.5014, 'sd': 1.1479, 'home': 0.099, 'fmt': 'f2'},
    # the position tables' (RUN DEFENSE, PASS DEFENSE AND PASS RUSH and their offense sides; skr above is Pass Rush's
    # and Pass Protection's too)
    'repa':  {'off': 'EPA a run', 'def': 'EPA a run allowed', 'off_short': 'EPA/run', 'def_short': 'EPA/run allowed',
              'sign': 1, 'game': ('run_epa', 'runs'), 'season': ('run_epa', 'runs'), 'mu': -0.1044, 'sd': 0.2179, 'home': -0.025, 'fmt': 'epa'},
    'rsr':   {'off': 'Run success rate', 'def': 'Run success rate allowed', 'off_short': 'Run success', 'def_short': 'Run success allowed',
              'sign': 1, 'game': ('run_succ', 'runs'), 'season': ('run_succ', 'runs'), 'mu': 0.3736, 'sd': 0.1133, 'home': -0.025, 'fmt': 'pct'},
    'pepa':  {'off': 'EPA a dropback', 'def': 'EPA a dropback allowed', 'off_short': 'EPA/dropback', 'def_short': 'EPA/dropback allowed',
              'sign': 1, 'game': ('db_epa', 'db'), 'season': ('db_epa', 'db'), 'mu': 0.0527, 'sd': 0.3003, 'home': 0.021, 'fmt': 'epa'},
    'psr':   {'off': 'Dropback success rate', 'def': 'Dropback success rate allowed', 'off_short': 'Pass success', 'def_short': 'Pass success allowed',
              'sign': 1, 'game': ('db_succ', 'db'), 'season': ('db_succ', 'db'), 'mu': 0.4539, 'sd': 0.0935, 'home': 0.062, 'fmt': 'pct'},
    'hit':   {'off': 'QB-hit rate', 'def': 'QB-hit rate', 'off_short': 'QB hits', 'def_short': 'QB hits',
              'sign': -1, 'game': ('hits', 'db'), 'season': ('hits', 'db'), 'mu': 0.1373, 'sd': 0.0673, 'home': 0.072, 'fmt': 'pct'},
}
# the stats Overall Offense and Overall Defense are made of and show (the rest of UNIT_STATS are the
# position tables'), in their order
UNIT_OVERALL = ['pts', 'sr', 'epa', 'tor', 'skr', 'xr', 'third', 'rz', 'ypp']
# each side's game score: percent shares of the stats' standard deviations (the owner's, rounded
# from the fit; the rest weigh nothing and are shown with their ranks)
UNIT_W = {'off': {'pts': 35, 'sr': 25, 'epa': 15, 'tor': 15, 'skr': 10},
          'def': {'pts': 50, 'xr': 30, 'tor': 10, 'skr': 10}}
UNIT_K = 0.08          # the step per final, in standard deviations of the stat
# the share of last season's final rating (each stat, each side, playoffs in) every club starts a
# season with: last season rated from 0 on its own games, times this (units_fit.py chose it by
# leaving one season out at a time on 2013-2017; tested once on 2018-2025)
UNIT_CARRY = 0.42
# RUN DEFENSE, PASS DEFENSE AND PASS RUSH and RUN OFFENSE, PASS OFFENSE AND PASS PROTECTION (see the
# docstring): six more tables, a defense's and an offense's side of three facets, each a weighted sum of
# two stats' ratings on the same Elo (K, home field and the carry as above). One fit of each facet's
# next-game measure on both sides' ratings, elo/tools/def_units_fit.py's on 2012-2017, gives both weights:
# the defense's shares rounded to fives are the defense table's, the offense's the offense table's
# (`pair` names the other side of the facet). `wf` is the test, once, on 2018-2025: the RMSE of the next
# game's measure (the offense's own EPA a run, EPA a dropback or sack rate in it) from the pair together
# against the league average, the same weights with nothing carried, and each club's raw numbers so far
# that season (`raw`, `se` the paired standard error of the squared error a team-game against it, by
# game, `seasons_better` against it), which both tables of a pair carry; and each table alone, from its
# own side's rating and nothing of the other, against that side's raw numbers alone (`alone`,
# `alone_raw`, `alone_se`, `alone_better`). The defenses come first, then the offenses, so the order
# Overall's two and the defense tables had in the file is kept
UNIT_TABLES = {
    'run_def': {'label': 'Run Defense', 'side': 'def', 'w': {'repa': 55, 'rsr': 45}, 'pair': 'run_off',
                'wf': {'target': 'repa', 'measure': 'EPA a run', 'rmse': 0.2188, 'raw': 0.2216, 'no_carry': 0.2198, 'league': 0.2249,
                       'se': 0.000185, 'seasons_better': 8, 'seasons': 8, 'fit': '2012-2017', 'test': '2018-2025', 'carry': 0.42,
                       'alone': 0.2227, 'alone_raw': 0.2237, 'alone_se': 9.9e-05, 'alone_better': 7}},
    'pass_def': {'label': 'Pass Defense', 'side': 'def', 'w': {'pepa': 100, 'psr': 0}, 'pair': 'pass_off',
                 'wf': {'target': 'pepa', 'measure': 'EPA a dropback', 'rmse': 0.2968, 'raw': 0.3012, 'no_carry': 0.299, 'league': 0.3113,
                        'se': 0.000516, 'seasons_better': 8, 'seasons': 8, 'fit': '2012-2017', 'test': '2018-2025', 'carry': 0.42,
                        'alone': 0.308, 'alone_raw': 0.3094, 'alone_se': 0.000254, 'alone_better': 6}},
    'pass_rush': {'label': 'Pass Rush', 'side': 'def', 'w': {'skr': 90, 'hit': 10}, 'pair': 'pass_pro',
                  'wf': {'target': 'skr', 'measure': 'sack rate', 'rmse': 0.0455, 'raw': 0.0458, 'no_carry': 0.0457, 'league': 0.047,
                         'se': 8.28e-06, 'seasons_better': 8, 'seasons': 8, 'fit': '2012-2017', 'test': '2018-2025', 'carry': 0.42,
                         'alone': 0.0469, 'alone_raw': 0.0469, 'alone_se': 2.36e-06, 'alone_better': 5}},
    'run_off': {'label': 'Run Offense', 'side': 'off', 'w': {'repa': 25, 'rsr': 75}, 'pair': 'run_def',
                'wf': {'target': 'repa', 'measure': 'EPA a run', 'rmse': 0.2188, 'raw': 0.2216, 'no_carry': 0.2198, 'league': 0.2249,
                       'se': 0.000185, 'seasons_better': 8, 'seasons': 8, 'fit': '2012-2017', 'test': '2018-2025', 'carry': 0.42,
                       'alone': 0.2207, 'alone_raw': 0.2227, 'alone_se': 0.000149, 'alone_better': 8}},
    'pass_off': {'label': 'Pass Offense', 'side': 'off', 'w': {'pepa': 70, 'psr': 30}, 'pair': 'pass_def',
                 'wf': {'target': 'pepa', 'measure': 'EPA a dropback', 'rmse': 0.2968, 'raw': 0.3012, 'no_carry': 0.299, 'league': 0.3113,
                        'se': 0.000516, 'seasons_better': 8, 'seasons': 8, 'fit': '2012-2017', 'test': '2018-2025', 'carry': 0.42,
                        'alone': 0.3009, 'alone_raw': 0.3033, 'alone_se': 0.000436, 'alone_better': 8}},
    'pass_pro': {'label': 'Pass Protection', 'side': 'off', 'w': {'skr': 95, 'hit': 5}, 'pair': 'pass_rush',
                 'wf': {'target': 'skr', 'measure': 'sack rate', 'rmse': 0.0455, 'raw': 0.0458, 'no_carry': 0.0457, 'league': 0.047,
                        'se': 8.28e-06, 'seasons_better': 8, 'seasons': 8, 'fit': '2012-2017', 'test': '2018-2025', 'carry': 0.42,
                        'alone': 0.0457, 'alone_raw': 0.0459, 'alone_se': 8.08e-06, 'alone_better': 7}},
}
# the walk-forward record (units_fit.py): RMSE of the offense's points in its next game, 2018-2025 weeks 2 on,
# with the carry (rmse; the old measure carried the same way, previous) and without it (no_carry)
UNIT_WF = {'rmse': 9.431, 'previous': 9.441, 'league': 9.979, 'se': 0.249, 'seasons_better': 5, 'seasons': 8, 'fit': '2012-2017', 'test': '2018-2025', 'carry': 0.42, 'no_carry': 9.508}
# the sums a team-game's stats are made of (pts, from games.csv, joins them in unit_ratings)
UNIT_SUMS = ['plays', 'epa', 'succ', 'yds', 'expl', 'to', 'sacks', 'db', 'third_c', 'third_n', 'drives', 'rz_trips', 'rz_td',
             'runs', 'run_epa', 'run_succ', 'db_epa', 'db_succ', 'hits']
UNIT_ROUND = {'f1': 1, 'f2': 2, 'epa': 3, 'pct': 3}


def unit_tables():
    """every team table model.json's units carry, in the order the page shows them: {name: (side,
    weights, the stats it shows)}. Overall Offense and Overall Defense show the nine; each position
    table its own two (a stat its fit weighs at 0 is shown with its rank, as Overall's are)."""
    return {'off': ('off', UNIT_W['off'], UNIT_OVERALL), 'def': ('def', UNIT_W['def'], UNIT_OVERALL),
            **{n: (v['side'], v['w'], list(v['w'])) for n, v in UNIT_TABLES.items()}}


def pbp_team_games(pbp):
    """nflverse play-by-play as one row per team-game from the offense's side (game_id, posteam,
    defteam, `side` home or away, and UNIT_SUMS) over scrimmage plays only: passes, sacks, scrambles and runs that have
    an EPA, with kneels, spikes and two-point tries left out. A big play is a completed or
    incomplete pass (not a sack or a scramble) of 20 yards or more, or a run or scramble of 10 or
    more; a giveaway an interception or a lost fumble; a drive any drive with a scrimmage play,
    a red-zone trip one that reached the 20 and a red-zone touchdown one of those that ended in a
    touchdown. Also each game's final score as the play-by-play has it, {game_id: (home, away)},
    the highest running score on any play, so a game the file has only half of reads short. The
    side is read off the play-by-play's own home team, since its abbreviations are today's (LV,
    LAC, LA) where games.csv keeps the old ones (OAK, SD, STL) for those seasons."""
    p = pbp[pbp.posteam.notna() & pbp.defteam.notna()].copy()
    for c in ('pass', 'rush', 'qb_kneel', 'qb_spike', 'two_point_attempt', 'qb_scramble', 'success', 'yards_gained', 'sack',
              'qb_hit', 'interception', 'fumble_lost', 'third_down_converted', 'third_down_failed', 'drive_inside20'):
        p[c] = pd.to_numeric(p[c], errors='coerce').fillna(0.0)
    p['epa'] = pd.to_numeric(p.epa, errors='coerce')
    s = p[((p['pass'] == 1) | (p.rush == 1)) & p.play_type.isin(['pass', 'run']) & (p.qb_kneel == 0)
          & (p.qb_spike == 0) & (p.two_point_attempt == 0) & p.epa.notna()].copy()
    s['expl'] = (((s['pass'] == 1) & (s.sack == 0) & (s.qb_scramble == 0) & (s.yards_gained >= 20))
                 | (((s.rush == 1) | (s.qb_scramble == 1)) & (s.yards_gained >= 10))).astype(float)
    s['to'] = s.interception + s.fumble_lost
    s['db'] = (s['pass'] == 1).astype(float)
    # Run Defense, Pass Defense and Pass Rush: a designed run (rush, never a scramble, which nflverse
    # counts a dropback) and its EPA and success; a dropback's EPA and success; a hit on a dropback,
    # every sack counted one (nflverse flags a hit on 93-95% of sacks, and a sack is the hit that landed)
    s['runs'] = s.rush
    s['run_epa'] = s.epa * s.rush
    s['run_succ'] = s.success * s.rush
    s['db_epa'] = s.epa * s.db
    s['db_succ'] = s.success * s.db
    s['hits'] = (((s.qb_hit == 1) | (s.sack == 1)) & (s.db == 1)).astype(float)
    s['side'] = np.where(s.posteam == s.home_team, 'home', 'away')
    g = s.groupby(['game_id', 'posteam', 'defteam', 'side'])
    tg = pd.DataFrame({'plays': g.size(), 'epa': g.epa.sum(), 'succ': g.success.sum(), 'yds': g.yards_gained.sum(),
                       'expl': g.expl.sum(), 'to': g['to'].sum(), 'sacks': g.sack.sum(), 'db': g.db.sum(),
                       'third_c': g.third_down_converted.sum(),
                       'third_n': g.third_down_converted.sum() + g.third_down_failed.sum(),
                       'runs': g.runs.sum(), 'run_epa': g.run_epa.sum(), 'run_succ': g.run_succ.sum(),
                       'db_epa': g.db_epa.sum(), 'db_succ': g.db_succ.sum(), 'hits': g.hits.sum()}).reset_index()
    dr = (s.groupby(['game_id', 'posteam', 'fixed_drive'])
          .agg(rz=('drive_inside20', 'max'), res=('fixed_drive_result', 'last')).reset_index())
    dr['rz_td'] = ((dr.rz == 1) & (dr.res == 'Touchdown')).astype(float)
    dd = dr.groupby(['game_id', 'posteam']).agg(drives=('rz', 'size'), rz_trips=('rz', 'sum'), rz_td=('rz_td', 'sum')).reset_index()
    tg = tg.merge(dd, on=['game_id', 'posteam'], how='left').fillna({'drives': 0.0, 'rz_trips': 0.0, 'rz_td': 0.0})
    for c in UNIT_SUMS:
        tg[c] = tg[c].astype(float)
    sc = pbp.assign(h=pd.to_numeric(pbp.total_home_score, errors='coerce'), a=pd.to_numeric(pbp.total_away_score, errors='coerce'))
    sc = sc.groupby('game_id').agg(h=('h', 'max'), a=('a', 'max'))
    score = {gid: (float(h), float(a)) for gid, h, a in zip(sc.index, sc.h, sc.a) if pd.notna(h) and pd.notna(a)}
    return tg, score


def unit_value(st, sums, pts=None):
    """a stat's value from its sums: the game's (st['game']) or the season's (st['season']), None
    where it has no denominator (a game with no red-zone trip has no red-zone rate)"""
    num, den = st
    x = pts if num == 'pts' else sums[num]
    if den is None:
        return float(x)
    d = sums[den]
    return float(x) / d if d else None


def unit_elo(season_games, tg, score, start=None):
    """The Elo behind Overall Offense and Overall Defense for one season, unrounded: season_games
    is games.csv cut to the season, tg and score the season's play-by-play through
    pbp_team_games, start each club's ratings going into the season ({team: {'off': {stat: r},
    'def': {stat: r}}}, from unit_carry; a club without one, and every club when start is None,
    starts at 0). A final is rated only when the play-by-play has both offenses and ends on
    games.csv's score; any other final is `pending`, counted nowhere and moving nobody, until a
    later run has the whole game. Returns the ratings after the last rated final R[side][stat][team],
    the starts S (the same shape), the season's sums, each club's (week, rating) after each game in
    each table (unit_tables(): Overall's two and the position tables), the regular-season records, the pending finals and the clubs."""
    g = season_games[season_games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB'])].copy()
    g['kick'] = g.gameday.astype(str) + ' ' + g.gametime.fillna('00:00').astype(str)
    g = g.sort_values(['kick', 'game_id'], kind='mergesort')
    teams = sorted(set(g.home_team) | set(g.away_team))
    keys = list(UNIT_STATS)
    rows = {(r['game_id'], r['side']): r for r in tg.to_dict('records')} if tg is not None and len(tg) else {}
    start = start or {}
    S = {side: {k: {t: float(((start.get(t) or {}).get(side) or {}).get(k, 0.0)) for t in teams} for k in keys} for side in ('off', 'def')}
    R = {side: {k: dict(S[side][k]) for k in keys} for side in ('off', 'def')}
    acc = {side: {t: dict.fromkeys(UNIT_SUMS + ['pts', 'g'], 0.0) for t in teams} for side in ('off', 'def')}
    tabs = unit_tables()
    hist = {n: {t: [] for t in teams} for n in tabs}       # (week, the table's raw) after each game, each table
    record = {t: [0, 0, 0] for t in teams}
    overall = lambda n, t: sum(w / 100 * R[tabs[n][0]][k][t] for k, w in tabs[n][1].items())
    pending = []
    for r in g[g.home_score.notna() & g.away_score.notna()].itertuples(index=False):
        hs, as_ = float(r.home_score), float(r.away_score)
        if r.game_type == 'REG':
            record[r.home_team][0 if hs > as_ else 1 if hs < as_ else 2] += 1
            record[r.away_team][1 if hs > as_ else 0 if hs < as_ else 2] += 1
        a, b = rows.get((r.game_id, 'home')), rows.get((r.game_id, 'away'))
        if a is None or b is None or score.get(r.game_id) != (hs, as_):
            pending.append(r.game_id)
            continue
        h = 0.0 if r.location == 'Neutral' else 1.0
        steps = []
        for off, dfn, pts, home, sums in ((r.home_team, r.away_team, hs, h, a), (r.away_team, r.home_team, as_, -h, b)):
            for k in keys:
                st = UNIT_STATS[k]
                v = unit_value(st['game'], sums, pts)
                if v is None:                       # no red-zone trip, say: the stat sits this game out
                    continue
                z = st['sign'] * (v - st['mu']) / st['sd']
                steps.append((k, off, dfn, UNIT_K * (z - (R['off'][k][off] - R['def'][k][dfn] + st['home'] * home))))
            for side, t in (('off', off), ('def', dfn)):
                for c in UNIT_SUMS:
                    acc[side][t][c] += sums[c]
                acc[side][t]['pts'] += pts
                acc[side][t]['g'] += 1
        for k, off, dfn, d in steps:            # both sides from their pre-game ratings
            R['off'][k][off] += d
            R['def'][k][dfn] -= d
        for t in (r.home_team, r.away_team):
            for n in tabs:
                hist[n][t].append((int(r.week), overall(n, t)))
    return R, S, acc, hist, record, pending, teams


def unit_carry(last_games, tg, score, c=UNIT_CARRY):
    """Each club's start for the season after last_games (see OVERALL OFFENSE AND OVERALL DEFENSE):
    last season rated from 0 on its own games (unit_elo with no start, so only that season's
    play-by-play is read), and c times every club's final rating on every stat, each side, the
    playoffs in: {team: {'off': {stat: r}, 'def': {stat: r}}}, for the clubs with a rated final in
    it. The clubs are games.csv's as given, which load() has put in today's codes."""
    R, _, acc, _, _, _, teams = unit_elo(last_games, tg, score)
    return {t: {side: {k: c * R[side][k][t] for k in UNIT_STATS} for side in ('off', 'def')}
            for t in teams if acc['off'][t]['g']}


def unit_ratings(season_games, tg, score, start=None):
    """Overall Offense and Overall Defense for one season (see OVERALL OFFENSE AND OVERALL
    DEFENSE), as model.json carries them: unit_elo's ratings on the bell curve, ranked, with
    each stat's value and ranks. start is unit_carry's (None: every club from 0, as before the
    carry, which a season with no season before it in the files keeps)."""
    R, S, acc, hist, record, pending, teams = unit_elo(season_games, tg, score, start)
    tabs = unit_tables()
    start = start or {}
    played = [t for t in teams if acc['off'][t]['g']]
    # every club with a rating is on the curve and ranked: the ones that have played and, carried
    # from last season, the ones that have not yet (`carried`), so week 1 is not one flat 1500
    rated = [t for t in teams if acc['off'][t]['g'] or t in start]

    def table_out(name):
        side, W, keys = tabs[name]
        overall = lambda t, X=R: sum(w / 100 * X[side][k][t] for k, w in W.items())
        raw = {t: overall(t) for t in teams}
        v = np.array([raw[t] for t in rated]) if rated else np.zeros(1)
        mu, sd = float(v.mean()), float(v.std())
        show = lambda x: round(1500 + 100 * (x - mu) / sd) if sd > 1e-9 else 1500
        order = sorted(rated, key=lambda t: (-raw[t], t)) + sorted(t for t in teams if t not in rated)
        means = {k: (float(np.mean([R[side][k][t] for t in rated])) if rated else 0.0) for k in keys}
        out = {}
        for t in teams:
            h = hist[name][t]
            s0 = overall(t, S)
            now = show(raw[t])
            then = show(h[-2][1] if len(h) > 1 else s0) if h else None
            a = acc[side][t]
            out[t] = {'elo': now, 'before': then, 'change': None if then is None else now - then,
                      'raw': round(raw[t], 6), 'rank': order.index(t) + 1, 'games': int(a['g']), 'record': record[t],
                      'start': show(s0), 'carried': bool(t in start and not a['g']),
                      'line': [[wk, show(x)] for wk, x in h], 'stats': {}}
            for k in keys:
                x = unit_value(UNIT_STATS[k]['season'], a, a['pts']) if a['g'] else None
                e = {'v': None if x is None else round(x, UNIT_ROUND[UNIT_STATS[k]['fmt']]), 'r': round(R[side][k][t], 6)}
                if W.get(k):
                    e['adds'] = round(100 * W[k] / 100 * (R[side][k][t] - means[k]) / sd, 1) if sd > 1e-9 else 0.0
                out[t]['stats'][k] = e
            if name not in ('off', 'def'):
                continue
            # the old page's three columns, kept while a page built before this one is live
            k = max(a['g'], 1)
            out[t].update(ppg=round(a['pts'] / k, 1), ypg=round(a['yds'] / k, 1),
                          epa_play=round(a['epa'] / a['plays'], 3) if a['plays'] else None)
        # each stat's league rank on the value shown (ties share), among the clubs that have played,
        # and on its own rating, the opponents counted (adj), among every club with a rating; better
        # is higher for an offense's stat where more helps it, and the other way for a defense's
        for k in keys:
            better = 'high' if (UNIT_STATS[k]['sign'] > 0) == (side == 'off') else 'low'
            vals = {t: out[t]['stats'][k]['v'] for t in played if out[t]['stats'][k]['v'] is not None}
            for t in teams:
                e, x = out[t]['stats'][k], vals.get(t)
                e['rank'] = None if x is None else 1 + sum(1 for y in vals.values() if (y > x if better == 'high' else y < x))
                e['adj'] = (1 + sum(1 for u in rated if R[side][k][u] > R[side][k][t])) if t in rated else None
        return out

    # each table's stats, its own in its own order (the weighted first); an entry's `side` is the
    # table's name, which for Overall's two is its side of the ball, and `better` is read on the side
    # the table rates (a defense table's as Overall Defense's, an offense table's as Overall Offense's)
    stats = []
    for name, (side, W, keys) in tabs.items():
        for k in sorted(keys, key=lambda k: (-W.get(k, 0), keys.index(k))):
            st = UNIT_STATS[k]
            stats.append({'key': k, 'side': name, 'label': st[side], 'short': st[side + '_short'], 'fmt': st['fmt'],
                          'better': 'high' if (st['sign'] > 0) == (side == 'off') else 'low', 'weight': W.get(k, 0)})
    # each club's `start` is where it began the season on today's curve (its line's first point):
    # its carried rating, or a raw 0 for a club with nothing carried
    return {**{name: table_out(name) for name in tabs}, 'pending': pending, 'stats': stats,
            'weights': {name: dict(W) for name, (_, W, _) in tabs.items()},
            'tables': {n: {'label': v['label'], 'of': v['side'], 'pair': v['pair'], 'walk_forward': dict(v['wf'])} for n, v in UNIT_TABLES.items()},
            'measure': 'an Elo on each key stat, offense against defense; each table a weighted sum of them (weights in percent)',
            'params': {'K': UNIT_K, 'stats': {k: [UNIT_STATS[k]['mu'], UNIT_STATS[k]['sd'], UNIT_STATS[k]['home']] for k in UNIT_STATS},
                       'carry': UNIT_CARRY, 'carry_from': None,
                       'shown': '1500 + 100 * z across every team with a rating: the ones that have played, and the ones '
                                'carried from last season that have not yet'},
            'walk_forward': dict(UNIT_WF)}


def power_ratings(season_games, lineup=None, lineup_before=None):
    """The teams' power ratings: every final of this season solved together, each worth its capped
    margin, home field out, against what the opponent has turned out to be, recent weeks a little
    more and every team pulled toward average (a weighted ridge), with the lineups' player Elo
    blended in at PR_W, in log-odds (see THE POWER RATINGS)."""
    g = season_games[season_games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB'])].copy()
    g['kick'] = g.gameday.astype(str) + ' ' + g.gametime.fillna('00:00').astype(str)
    g = g.sort_values(['kick', 'game_id'], kind='mergesort')
    teams = sorted(set(g.home_team) | set(g.away_team))
    ix = {t: i for i, t in enumerate(teams)}
    fin = g[g.home_score.notna() & g.away_score.notna()]

    def solve(sub):
        # (X'WX + LAM I) R = X'W y: X +1 for the home team and -1 for the away team, so R is centred;
        # y the capped home margin less the home field (none at a neutral site); w halves every
        # PR_HALF weeks back from the latest week solved (the playoffs are weeks 19-22)
        if sub.empty:
            return np.zeros(len(teams))
        wk = sub.week.to_numpy(float)
        w = 0.5 ** ((wk.max() - wk) / PR_HALF)
        X = np.zeros((len(sub), len(teams)))
        rows = np.arange(len(sub))
        X[rows, [ix[t] for t in sub.home_team]] = 1.0
        X[rows, [ix[t] for t in sub.away_team]] = -1.0
        home = (sub.location != 'Neutral').to_numpy(float)
        y = np.clip((sub.home_score - sub.away_score).to_numpy(float), -PR_C, PR_C) - PR_H * home
        return np.linalg.solve(X.T @ (X * w[:, None]) + PR_LAM * np.eye(len(teams)), X.T @ (w * y))

    R = solve(fin)
    rec, last_kick = {t: [0, 0, 0] for t in teams}, {}
    for r in fin.itertuples(index=False):
        last_kick[r.home_team] = last_kick[r.away_team] = r.kick
        if r.game_type == 'REG':
            m = r.home_score - r.away_score
            rec[r.home_team][0 if m > 0 else 1 if m < 0 else 2] += 1
            rec[r.away_team][1 if m > 0 else 0 if m < 0 else 2] += 1
    # before: the same solve on every final that kicked off before the team's last game, the results
    # part the table had going into it (its lineup part is lineup_before: today's lineup on the
    # ratings of then); the change since is that game, every re-scoring since and the players' ratings
    at = {k: solve(fin[fin.kick < k]) for k in set(last_kick.values())}
    before = {t: float(at[k][ix[t]]) for t, k in last_kick.items()}
    mix = lambda r, lg: (1 - PR_W) * r + PR_W * lg / PR_S if lg is not None else r   # a log-odds in points
    now = {t: mix(float(R[ix[t]]), (lineup or {}).get(t)) for t in teams}
    then = {t: mix(before[t], (lineup_before or {}).get(t)) for t in before}
    show = lambda v: round(1500 + 100 * v / PR_SPREAD)
    rnd = lambda v, n: None if v is None else round(float(v), n)
    # the parts beside what is shown, so elo/check.py can hold the table to games.csv: the results
    # part in points (`r`, and `r_before` going into the last game) and the lineup part in log-odds
    # (`lg`, `lg_before`; none where a team has no lineup)
    return {t: {'elo': show(now[t]), 'before': show(then[t]) if t in then else None,
                'p_avg': round(1 / (1 + math.exp(-PR_S * now[t])), 4), 'record': rec[t],
                'r': rnd(R[ix[t]], 4), 'lg': rnd((lineup or {}).get(t), 5),
                'r_before': rnd(before.get(t), 4), 'lg_before': rnd((lineup_before or {}).get(t), 5) if t in then else None}
            for t in teams}


def _ranked(rows):
    """a chart's rows, (group, pid, key), as {group: [(pid, key), ...]}: each player once, at his
    best key, in key order. The key is (fullback, depth): a fullback sorts after every running
    back, since the RB slots are the ball carriers and a fullback listed first at his own slot
    would otherwise take the RB2 place from the real second back. Ties at the same key are left
    for expected() to break on who has been playing, so file or sort order never decides."""
    out = {}
    for g, pid, key in rows:
        cur = out.setdefault(g, {})
        if pid not in cur or key < cur[pid]:
            cur[pid] = key
    return {g: sorted(v.items(), key=lambda pk: (pk[1], pk[0])) for g, v in out.items()}


def build_lineups(charts, injuries):
    """the depth charts as {(season, week, team): {group: [(pid, key), ...]}} for the weekly
    files, {team: [(date, {group: [...]}), ...]} for the daily snapshots, and the week's Outs
    (the final report's Out and Doubtful) as {(season, week): set(pid)}"""
    weekly, daily, outs = {}, {}, {}
    num = lambda s: pd.to_numeric(s, errors='coerce').fillna(9).astype(int)
    for y, d in charts.items():
        if 'depth_team' in d.columns:            # 2012-2024: one chart per team per week
            d = d[d.gsis_id.notna() & d.week.notna()]
            d = d.assign(group=d.position.map(SLOT), fb=(d.position == 'FB').astype(int), depth=num(d.depth_team))
            d = d[d.group.notna() & (d.formation != 'Special Teams') | (d.group == 'K')]
            for (wk, team), grp in d.groupby(['week', 'club_code']):
                weekly[(int(y), int(wk), team)] = _ranked(zip(grp.group, grp.gsis_id, zip(grp.fb, grp.depth)))
        else:                                    # 2025 on: snapshots by date, several a week
            d = d[d.gsis_id.notna()]
            d = d.assign(group=d.pos_abb.map(SLOT), day=d.dt.str[:10], fb=(d.pos_abb == 'FB').astype(int), depth=num(d.pos_rank))
            d = d[d.group.notna()]
            for team, tg in d.groupby('team'):
                lst = daily.setdefault(team, [])
                for day, sg in tg.groupby('day'):
                    latest = sg[sg.dt == sg.dt.max()]
                    lst.append((day, _ranked(zip(latest.group, latest.gsis_id, zip(latest.fb, latest.depth)))))
                lst.sort(key=lambda dc: dc[0])
    for y, d in injuries.items():
        d = d[d.gsis_id.notna() & d.week.notna() & d.report_status.isin(OUT_STATUS)]
        for wk, pid in zip(d.week, d.gsis_id):
            outs.setdefault((int(y), int(wk)), set()).add(pid)
    return weekly, daily, outs


def chart_for(weekly, daily, season, week, team, gameday):
    """the team's chart as known before that game, or None"""
    c = weekly.get((season, week, team))
    if c is not None:
        return c
    best = None
    for day, out in daily.get(team, []):
        if day <= str(gameday):
            best = out
        else:
            break
    return best


def _practised(s):
    return isinstance(s, str) and ('Full' in s or 'Limited' in s)


def availability(roster, inj, next_week):
    """Who can play each club's next game. Returns ({pid: reason he cannot, or None}, {pid: club},
    {pid: questionable note}, {club: report summary}).

    The roster: nflverse's season roster carries each player once, at the week of his latest
    entry, so a club's current roster is its rows at that club's own latest week. A club on its
    bye has no rows for the bye week, and its latest is the week before: reading only the
    league's latest week called every player of a bye club a free agent (Mahomes, Kelce, Bryce
    Young in week 5). A player whose row is older than his club's latest has left it: a free
    agent, unless his status is one he keeps (injured reserve, retired and so on). A player on no
    roster at all is a free agent too (why_out).

    The injury report, for each club's next game (next_week): once the club has filed its game
    statuses for that week, Out and Doubtful are out, and Questionable is listed (a Q tag) unless
    he did not practise at the last report, which counts him out. Before the statuses are filed
    (Tuesday to Friday for a Sunday game), a player Out or Doubtful at the club's previous report,
    or inactive for its last game after being on that report, stays out until this week's report
    clears him: he practises (Full or Limited), or the club files a report he is not on. Each
    week's Outs used to be read only from that week's final report, so for four days a week
    the starters ruled out the week before, still not practising, were expected to start
    (Caleb Williams in week 5, eleven of them in week 4)."""
    out, team, q, report = {}, {}, {}, {}
    inactive = set()
    if roster is not None and len(roster):
        r = roster[roster.gsis_id.map(lambda v: isinstance(v, str))]
        wk = pd.to_numeric(r.week, errors='coerce') if 'week' in r else pd.Series(np.nan, index=r.index)
        latest = wk.groupby(r.team).max()
        for row, w in zip(r.itertuples(index=False), wk):
            pid, st = row.gsis_id, str(row.status)
            team[pid] = row.team
            if not np.isnan(w) and w < latest.get(row.team, w):
                out[pid] = STATUS[st] if st in STANDING else 'a free agent'
            else:
                out[pid] = STATUS.get(st, 'not on the active list')
                # inactive for the last game: INA, or an active row with the inactive code I01/I02
                # (WHO PLAYS; the props payload's `ina` reads the same two)
                if st == 'INA' or str(getattr(row, 'status_description_abbr', '') or '').startswith('I'):
                    inactive.add(pid)
    if inj is None or not len(inj):
        return out, team, q, report
    inj = inj[inj.gsis_id.map(lambda v: isinstance(v, str)) & inj.week.notna()]
    what = lambda row: (f' ({row.report_primary_injury.lower()})' if isinstance(row.report_primary_injury, str) and row.report_primary_injury else '')
    for t, w in sorted(next_week.items()):
        mine = inj[inj.team == t]
        cur = mine[mine.week == w]
        filed = bool(cur.report_status.notna().any())
        before = mine[mine.week < w]
        reasons = {}
        if filed:
            for row in cur.itertuples(index=False):
                s = row.report_status
                if s == 'Out':
                    reasons[row.gsis_id] = f'out{what(row)}, week {w}'
                elif s == 'Doubtful':
                    reasons[row.gsis_id] = f'doubtful{what(row)}, week {w}: counted out'
                elif s == 'Questionable':
                    if isinstance(row.practice_status, str) and 'Did Not' in row.practice_status:
                        reasons[row.gsis_id] = f'questionable{what(row)}, week {w}, and did not practise at the last report: counted out'
                    else:
                        q[row.gsis_id] = f'questionable{what(row)}, week {w}'
        elif len(before):
            pw = int(before.week.max())
            prev = before[before.week == pw]
            was = {}
            for row in prev.itertuples(index=False):
                if row.report_status in OUT_STATUS:
                    was[row.gsis_id] = f'{row.report_status.lower()}{what(row)} in week {pw}'
                elif row.gsis_id in inactive and team.get(row.gsis_id) == t:
                    was[row.gsis_id] = f'inactive{what(row)} for week {pw}'
            now = {row.gsis_id: row for row in cur.itertuples(index=False)}
            for pid, why in was.items():
                row = now.get(pid)
                if row is not None:
                    if not _practised(row.practice_status):
                        reasons[pid] = f'{why}, not practising for week {w}: counted out'
                elif not len(cur):
                    reasons[pid] = f"{why}; week {w}'s report is not filed yet: counted out"
        report[t] = {'week': int(w), 'statuses_filed': filed, 'practice_rows': int(len(cur)), 'counted_out': len(reasons)}
        for pid, why in reasons.items():
            if not out.get(pid):
                out[pid] = why
            team.setdefault(pid, t)
    return out, team, q, report


def ranked_clubs(d):
    """the clubs with a rated game in one season's player stats, by main()'s filter (a rated
    position, a game id, something on the sheet): the rankings move to a season once RANK_TEAMS
    clubs have one, and load() reads the play-by-play of the season before last only until then"""
    d = d[d.position.isin(GROUP) & d.game_id.notna()].copy()
    d['group'] = d.position.map(GROUP)
    return int(d[(scores(d)[1] > 0).values].team.nunique())


def scores(d):
    """the per-game score and involvement for every row, by group"""
    n = lambda c: pd.to_numeric(d[c], errors='coerce').fillna(0.0) if c in d else pd.Series(0.0, index=d.index)
    epa = n('passing_epa') + n('rushing_epa') + n('receiving_epa')
    fg = sum(n(f'fg_made_{b}') * (1 - p) for b, p in FG_RATE.items()) * 3 - sum(n(f'fg_missed_{b}') * p for b, p in FG_RATE.items()) * 3
    fg += n('pat_made') * (1 - PAT_RATE) - n('pat_missed') * PAT_RATE
    defense = (4 * n('def_sacks') + 2 * n('def_tackles_for_loss') + n('def_qb_hits') + 3 * n('def_fumbles_forced')
               + 3 * n('fumble_recovery_opp') + 5 * n('def_interceptions') + 1.5 * n('def_pass_defended') + 6 * n('def_tds')
               + 0.6 * n('def_tackles_solo') + 0.3 * n('def_tackle_assists'))
    g = d.group
    score = pd.Series(0.0, index=d.index)
    vol = pd.Series(0.0, index=d.index)
    off = g.isin(['QB', 'RB', 'WR', 'TE'])
    score[off] = epa[off]
    # a back or a receiver is scored on what he produced, not on EPA, which rates volume as a cost (THE SCORES)
    td = g.map(TD_YARDS).fillna(20.0)
    made = (n('rushing_yards') + n('receiving_yards') + td * (n('rushing_tds') + n('receiving_tds'))
            - 25 * (n('rushing_fumbles_lost') + n('receiving_fumbles_lost')))
    score[g.isin(PRODUCED)] = made[g.isin(PRODUCED)]
    score[g == 'K'] = fg[g == 'K']
    dl = g.isin(['DL', 'LB', 'DB'])
    score[dl] = defense[dl]
    score[g == 'DL'] += DL_HIT_EXTRA * n('def_qb_hits')[g == 'DL']
    vol[g == 'QB'] = (n('attempts') + n('carries') + n('sacks_suffered'))[g == 'QB']
    vol[g == 'RB'] = (n('carries') + n('targets'))[g == 'RB']
    vol[g.isin(['WR', 'TE'])] = (n('targets') + n('carries'))[g.isin(['WR', 'TE'])]
    vol[g == 'K'] = (n('fg_att') + n('pat_att'))[g == 'K']
    vol[dl] = (n('def_tackles_solo') + n('def_tackle_assists') + n('def_pass_defended') + n('def_sacks') + n('def_qb_hits'))[dl]
    return score, vol


def week_order(games):
    """every game in the order it is played: (season, ordinal week) with the playoffs after week 18"""
    order = {'REG': 0, 'WC': 100, 'DIV': 101, 'CON': 102, 'SB': 103}
    g = games.copy()
    g['ord'] = np.where(g.game_type == 'REG', g.week, g.game_type.map(order))
    return g


def logistic_fit(X, y, l2=0.5, iters=60):
    """logistic regression by Newton's method with a little ridge, no library needed. There is
    no free intercept: the first column is home field (1 at the home team's ground, 0 at a
    neutral site), left unpenalised, so a game in London or Mexico City carries no home edge."""
    w = np.zeros(X.shape[1])
    R = np.eye(X.shape[1]) * l2
    R[0, 0] = 0
    for _ in range(iters):
        p = 1 / (1 + np.exp(-X @ w))
        grad = X.T @ (p - y) + R @ w
        H = (X.T * (p * (1 - p))) @ X + R
        step = np.linalg.solve(H, grad)
        w -= step
        if np.abs(step).max() < 1e-8:
            break
    return w


def predict(w, X):
    return 1 / (1 + np.exp(-(X @ w)))


# ---- matchups: a player's next game from his recent form, his Elo and the defenders he faces ----
MU_STATS = {'QB': ['passing_yards', 'passing_tds', 'attempts', 'completions', 'passing_interceptions', 'rushing_yards', 'carries'],
            'RB': ['rushing_yards', 'carries', 'receptions', 'receiving_yards', 'scrim_yards', 'any_td'],
            'WR': ['receptions', 'receiving_yards', 'targets', 'any_td'],
            'TE': ['receptions', 'receiving_yards', 'targets', 'any_td']}
MU_COLS = ['completions', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions', 'carries', 'rushing_yards',
           'rushing_tds', 'receptions', 'targets', 'receiving_yards', 'receiving_tds']
MU_FIRST = 2016          # the seasons before this are the ratings' warm-up, not fitted on
MU_FORM_HL, MU_ALLOWED_HL, MU_MIN_GAMES = 4, 6, 3
MU_DEF = ['DL', 'LB', 'DB']
# a receiver's place among his team's expected receivers, on targets going into the game:
# the wide receivers' WR1 and WR2 (a WR3 or lower is the base), the tight ends' TE1
MU_RANK = {'WR': 2, 'TE': 1}
MU_RANK_STATS = {'receptions', 'receiving_yards', 'targets'}      # the volume it decides; not the touchdowns


def mu_design(b, home, allowed, pz, dz, elo=True, rk=None):
    """the regression's columns: the recent average, home, what the defence has allowed, the
    receiver's place in his team's pecking order (rk, one column per rank, WR and TE only), and
    (with elo) the player's rating and the opposing defenders' ratings, each scaling the average"""
    cols = [np.ones(len(b)), home * b, b, b * (allowed - 1)]
    if rk is not None:
        cols += [b * rk[:, i] for i in range(rk.shape[1])]
    if elo:
        cols += [b * pz] + [b * dz[:, i] for i in range(dz.shape[1])]
    return np.column_stack(cols)


def matchups(log, game_feat, coming, last, lineups=None):
    """fit, check and apply the matchup formula (see the docstring's MATCHUPS); lineups is each
    game's expected lineup by team, {(game_id, team): [(pid, group)]}"""
    d = pd.DataFrame(log)
    if d.empty:
        return None
    d['scrim_yards'] = d.rushing_yards + d.receiving_yards
    d['any_td'] = d.rushing_tds + d.receiving_tds
    d = d.sort_values(['season', 'ord']).reset_index(drop=True)
    # every player's targets going into each game: the average (half-life four games, every game
    # he played) after each of his games, looked up by the last one before the game in question
    d['tgt_after'] = d.groupby('pid').targets.transform(lambda v: v.ewm(halflife=MU_FORM_HL).mean())
    tgt = {}
    for pid, key, v in zip(d.pid, d.season * 1000 + d.ord, d.tgt_after):
        h = tgt.setdefault(pid, ([], []))
        h[0].append(int(key))
        h[1].append(float(v))
    def before(pid, key):
        h = tgt.get(pid)
        i = (bisect.bisect_left(h[0], key) if key is not None else len(h[0])) if h else 0
        return h[1][i - 1] if i else 0.0
    def rank(pid, mates, key, k):
        """his place among the group's expected starters and himself, as k indicator columns"""
        mine = before(pid, key)
        r = sum(1 for q in set(mates) if q != pid and before(q, key) > mine)
        return [1.0 if r == i else 0.0 for i in range(k)]
    opp = {}
    for f in game_feat:
        opp[(f['game_id'], f['home'])] = f['sa']
        opp[(f['game_id'], f['away'])] = f['sh']
    out = {'stats': MU_STATS, 'fit': {}, 'record': {}, 'players': {}}
    for g, stats in MU_STATS.items():
        x = d[(d.group == g) & (d.vol >= 0.8 * VOLUME[g])].copy()          # the games he was a regular in
        if x.empty:
            continue
        x['n'] = x.groupby('pid').cumcount()
        for st in stats:
            x['b_' + st] = x.groupby('pid')[st].transform(lambda v: v.shift(1).ewm(halflife=MU_FORM_HL, min_periods=1).mean())
        allowed = {}
        for st in stats:
            a = x.groupby(['season', 'ord', 'opp'])[st].mean().reset_index().sort_values(['season', 'ord'])
            a['a'] = a.groupby('opp')[st].transform(lambda v: v.shift(1).ewm(halflife=MU_ALLOWED_HL, min_periods=1).mean())
            x = x.merge(a[['season', 'ord', 'opp', 'a']].rename(columns={'a': 'a_' + st}), on=['season', 'ord', 'opp'], how='left')
            # what each defence has allowed through its latest game, for the coming week
            allowed[st] = a.groupby('opp')[st].apply(lambda v: v.ewm(halflife=MU_ALLOWED_HL).mean().iloc[-1]).to_dict()
        for u in MU_DEF:
            x['o' + u] = [((opp.get((gid, t)) or {}).get(u, np.nan) - 1500) / 100 for gid, t in zip(x.game_id, x.team)]
        x['pz'] = (x.R - 1500) / 100
        nr = MU_RANK.get(g, 0)
        rk_cols = [f'rk{i}' for i in range(nr)]
        if nr:
            ranks = [rank(pid, [p for p, gg in (lineups or {}).get((gid, t), []) if gg == g], s * 1000 + o, nr)
                     for pid, gid, t, s, o in zip(x.pid, x.game_id, x.team, x.season, x.ord)]
            x[rk_cols] = np.array(ranks)
        fit_rows = x[(x.season >= MU_FIRST) & (x.n >= MU_MIN_GAMES) & x.oDB.notna()]
        latest = x.groupby('pid').tail(1).set_index('pid')
        for st in stats:
            y = fit_rows[st].values
            mean = float(np.nanmean(y))
            args = lambda r: (r['b_' + st].values, r.home.values, r['a_' + st].fillna(mean).values / mean, r.pz.values, r[['o' + u for u in MU_DEF]].values)
            rk = fit_rows[rk_cols].values if nr and st in MU_RANK_STATS else None
            X1, X0 = mu_design(*args(fit_rows), rk=rk), mu_design(*args(fit_rows), elo=False, rk=rk)
            ok = ~np.isnan(X1).any(1)
            seas = fit_rows.season.values
            # walk-forward: every season called by the formula fitted on the seasons before it
            p0, p1 = np.full(len(y), np.nan), np.full(len(y), np.nan)
            for sn in sorted(set(seas)):
                if sn == MU_FIRST:
                    continue
                tr, te = ok & (seas < sn), ok & (seas == sn)
                if te.any():
                    p0[te] = X0[te] @ np.linalg.lstsq(X0[tr], y[tr], rcond=None)[0]
                    p1[te] = X1[te] @ np.linalg.lstsq(X1[tr], y[tr], rcond=None)[0]
            rec = {}
            for label, m in (('past', ~np.isnan(p1) & (seas < last)), ('this', ~np.isnan(p1) & (seas == last))):
                if m.sum() < 30:
                    continue
                nud, res = p1[m] - p0[m], y[m] - p0[m]
                top = np.abs(nud) >= np.percentile(np.abs(nud), 80)
                rec[label] = {'games': int(m.sum()),
                              'rmse_form': round(float(np.sqrt(np.mean(res ** 2))), 3),
                              'rmse_elo': round(float(np.sqrt(np.mean((y[m] - p1[m]) ** 2))), 3),
                              'right': round(float(np.mean(np.sign(nud) == np.sign(res))), 4),
                              'right_top': round(float(np.mean(np.sign(nud[top]) == np.sign(res[top]))), 4)}
            out['record'][f'{g}|{st}'] = rec
            # the formula for the coming week: fitted on every completed season
            done = ok & (seas < last)
            w1 = np.linalg.lstsq(X1[done], y[done], rcond=None)[0]
            w0 = np.linalg.lstsq(X0[done], y[done], rcond=None)[0]
            sd = float(np.sqrt(np.mean((y[done] - X1[done] @ w1) ** 2)))
            out['fit'][f'{g}|{st}'] = {'coef': [round(float(v), 5) for v in w1], 'sd': round(sd, 3)}
            # the coming week's regulars: the expected lineup, each against the defenders he will face
            for c in coming:
                for pid, gg in c['parts']:
                    if gg != g or pid not in latest.index:
                        continue
                    L = latest.loc[pid]
                    if L.n + 1 < MU_MIN_GAMES:
                        continue
                    b = float(x[x.pid == pid][st].ewm(halflife=MU_FORM_HL).mean().iloc[-1])
                    a = allowed[st].get(c['opp'], mean) / mean
                    dz = np.array([[(c['opp_strength'][u] - 1500) / 100 for u in MU_DEF]])
                    pz = (c['rating'][pid] - 1500) / 100
                    arr = lambda v: np.array([v])
                    rk = np.array([rank(pid, [p for p, gg in c['parts'] if gg == g], None, nr)]) if nr and st in MU_RANK_STATS else None
                    e1 = float((mu_design(arr(b), arr(c["home"]), arr(a), arr(pz), dz, rk=rk) @ w1)[0])
                    e0 = float((mu_design(arr(b), arr(c["home"]), arr(a), arr(pz), dz, elo=False, rk=rk) @ w0)[0])
                    pl = out['players'].setdefault(pid, {'group': g, 'game_id': c['game_id'], 'team': c['team'], 'opp': c['opp'],
                                                         'home': c['home'], 'elo': round(c['rating'][pid]),
                                                         'opp_def': {u: round(c['opp_strength'][u]) for u in MU_DEF}, 'stats': {}})
                    pl['stats'][st] = [round(b, 2), round(max(e1, 0.0), 2), round(e1 - e0, 2)]
    return out


ROUND = {19: 'the Wild Card round', 20: 'the Divisional round', 21: 'the Conference championships', 22: 'the Super Bowl'}
ROUND_TYPE = {'WC': 19, 'DIV': 20, 'CON': 21, 'SB': 22}


def read_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def joker_calls(path=None):
    """the Joker's chance for the home side of every game it has called, from the betting job's
    published state ({game_id: pHome}); {} when there is no state or no call (THE JOKER BASELINE)"""
    out = {}
    for gid, c in ((read_json(path or JOKER_STATE) or {}).get('joker') or {}).items():
        p = c.get('pHome') if isinstance(c, dict) else None
        if isinstance(p, (int, float)) and not isinstance(p, bool) and 0 < p < 1:
            out[gid] = float(p)
    return out


def matchup_logit(w, x):
    """the game model's matchup alone: its weights times the lineups' Elo gaps, home field left out"""
    return float(np.dot(w[1:], x))


def on_joker(p_joker, m, beta=None):
    """THE JOKER BASELINE: the Joker's chance for the home side, moved by the Elo matchup m"""
    pj = min(1 - JOKER_CLIP, max(JOKER_CLIP, float(p_joker)))
    return 1 / (1 + math.exp(-(math.log(pj / (1 - pj)) + (JOKER_BASE['beta'] if beta is None else beta) * m)))


def make_call(w, hf, x, p_joker):
    """a game's call: the game model's own chance (p_elo), the matchup (m) and, where the Joker has
    called the game, its chance moved by the matchup (THE JOKER BASELINE); else the game model's"""
    m = matchup_logit(w, x)
    p_elo = float(predict(w, np.array([[hf] + list(x)]))[0])
    p = on_joker(p_joker, m) if p_joker is not None else p_elo
    c = {'p_home': round(p, 4), 'p_elo': round(p_elo, 4), 'm': round(m, 4)}
    if p_joker is not None:
        c.update(base='joker', p_joker=round(float(p_joker), 4))
    return c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true')
    ap.add_argument('--now', help='build as if at this UTC time (ISO); for tests of the calendar')
    a = ap.parse_args()
    now = (datetime.datetime.fromisoformat(a.now.replace('Z', '+00:00')) if a.now
           else datetime.datetime.now(datetime.timezone.utc))
    if now.tzinfo is None:
        now = now.replace(tzinfo=datetime.timezone.utc)
    print('loading')
    games, stats, roster, charts, injuries, pbp, sources = load(a.offline, now)
    games = week_order(games)
    games['kick'] = [kickoff(d, t) for d, t in zip(games.gameday, games.gametime)]
    weekly, daily, outs = build_lineups(charts, injuries)
    print(f'  depth charts: {len(weekly)} weekly team-charts, {sum(len(v) for v in daily.values())} daily snapshots; {sum(len(v) for v in outs.values())} players ruled out across {len(outs)} weeks')
    # THE SEASON, from games.csv alone. sched is the newest schedule nflverse has posted; the
    # season in play (last) is it once under way, else the one before (from the spring release
    # of a new schedule to its opener, the page stays on the finished season, and the new one's
    # week 1 is called in the fortnight before it). The rankings (rank_season) follow once most
    # of the league has a rated game, so a Thursday opener does not leave a table of two teams.
    sched = int(games.season.max())
    last = sched if under_way(games, sched, now) else sched - 1
    stats['score'], stats['vol'] = scores(stats)
    stats['w'] = np.minimum(1.0, stats.vol / stats.group.map(VOLUME))
    # kickers and defenders with nothing on the sheet did not really play
    stats = stats[stats.vol > 0].copy()
    seasons = sorted(stats.season.unique())
    rank_season = last if ranked_clubs(stats[stats.season == last]) >= RANK_TEAMS else last - 1
    # the games still to come: no score, and kickoff far enough off that a call made now is
    # published before it (a game under way is not called again: its call is the one frozen)
    lead = now + datetime.timedelta(minutes=CALL_LEAD)
    upcoming = games[(games.season >= last) & games.home_score.isna() & (games.kick > lead)]
    next_week = {}           # each club's next game week, for the injury report
    for r in upcoming.sort_values(['season', 'ord', 'kick'], kind='mergesort').itertuples(index=False):
        for t in (r.home_team, r.away_team):
            next_week.setdefault(t, int(r.week))
    inj = injuries.get(int(upcoming.season.min())) if len(upcoming) else None
    out_now, team_now, q_now, report = availability(roster, inj, next_week)
    on_roster = roster is not None and len(roster) > 0
    gone_now = {pid for pid, why in out_now.items() if why}

    # the position's typical game, from the season before (its own for the first)
    norm = {}
    for s in seasons:
        ref = stats[stats.season == (s - 1 if s > seasons[0] else s)]
        for g in GROUPS:
            v = ref[ref.group == g]
            v = v[v.w >= 0.5].score          # regulars define the typical game
            norm[(s, g)] = (float(v.mean()), float(v.std()) if len(v) > 1 and v.std() > 0 else 1.0)

    # ratings
    R = {}                 # player_id -> rating
    N = {}                 # player_id -> rated games
    U = {}                 # (team, facet) -> unit rating
    info = {}              # player_id -> {name, pos, group, team, headshot}
    hist = {}              # player_id -> {season: [[ord, rating], ...]}
    recent = {}            # player_id -> involvement in his last five rated games
    skipped = 0            # games a regular left early, not rated
    season_start = {}      # (season, player) -> rating at the start of the season
    peak = {}              # player -> (rating, season)
    game_feat = []         # per game: features from pre-game ratings
    # the season in play and the rankings' season alone (the same one but for a new season's
    # first days): rating, rated games, [[ord, rating], ...], rated games in a real role
    # (weight at least 0.5), each {season: {pid: ...}}
    RSd = {s: {} for s in {last, rank_season}}
    NSd = {s: {} for s in RSd}
    HSd = {s: {} for s in RSd}
    NQd = {s: {} for s in RSd}
    short_prev = {}        # player -> his last game was a short one, skipped
    played = {}            # (season, team) -> last game's participants by group [(pid, group)]
    ord_weeks = games[['season', 'ord']].drop_duplicates().sort_values(['season', 'ord'])
    by_game = {gid: d for gid, d in stats.groupby('game_id')}
    unit = lambda t, f: U.get((t, f), 1500.0)

    def strength(pids_groups):
        out = {}
        for g in GROUPS:
            rs = sorted((R.get(p, QB_START if g == 'QB' else 1500.0) for p, gg in pids_groups if gg == g), reverse=True)
            wts = DEPTH[g]
            rs = (rs + [REPLACEMENT] * len(wts))[:len(wts)]
            out[g] = sum(r * w for r, w in zip(rs, wts)) / sum(wts)
        return out

    def involvement(pid):
        rv = recent.get(pid)
        return float(np.median(rv)) if rv else 0.0

    def expected(season, week, team, gameday, fallback, also_out=()):
        """the players expected to start for the team, by group: the chart's order with the
        week's Outs removed, as many as the group fields; last game's players where the chart
        is silent on a group. Players the chart puts level (four linebackers at rank 1 for three
        places, say) are taken by who has been playing most (median involvement over his last
        five games, then the id): an order that sorting or the file decided made the walk-forward
        record and the season's calls move with the library version. Returns [(pid, group)] and
        whether a chart was found."""
        chart = chart_for(weekly, daily, int(season), int(week), team, gameday)
        gone = outs.get((int(season), int(week)), set()) | set(also_out)
        parts = []
        for g in GROUPS:
            cands = sorted(((p, k) for p, k in (chart or {}).get(g, []) if p not in gone),
                           key=lambda pk: (pk[1], -involvement(pk[0]), pk[0]))
            picked = [p for p, _ in cands][:len(DEPTH[g])]
            if not picked:
                picked = [p for p, gg in (fallback or []) if gg == g and p not in gone]
            parts += [(p, g) for p in picked]
        return parts, chart is not None

    mu_log = []             # every offensive player-game: pre-game rating, opponent, box score
    mu_lineups = {}         # (game_id, team) -> the expected lineup, for the receivers' pecking order
    cur_season = None
    for season, ordw in ord_weeks.itertuples(index=False):
        if season != cur_season:
            # the offseason: everyone comes back a quarter of the way to 1500
            if cur_season is not None:
                for p in R:
                    R[p] = 1500 + CARRY * (R[p] - 1500)
                for k in U:
                    U[k] = 1500 + CARRY * (U[k] - 1500)
            cur_season = season
            for p in R:
                season_start[(season, p)] = R[p]
        week_games = games[(games.season == season) & (games.ord == ordw)]
        # 1. features for every game of the week from pre-game ratings and the pre-game lineups;
        #    the same from who took part, kept beside them for the comparison
        for row in week_games.itertuples(index=False):
            d = by_game.get(row.game_id)
            if d is None:
                continue
            parts = {row.home_team: [], row.away_team: []}
            for pid, team, g in zip(d.player_id, d.team, d.group):
                if team in parts:
                    parts[team].append((pid, g))
            if not parts[row.home_team] or not parts[row.away_team]:
                continue
            eh, ch = expected(season, row.week, row.home_team, row.gameday, played.get((int(season), row.home_team)))
            ea, ca = expected(season, row.week, row.away_team, row.gameday, played.get((int(season), row.away_team)))
            sh, sa = strength(eh), strength(ea)
            ph, pa = strength(parts[row.home_team]), strength(parts[row.away_team])
            mu_lineups[(row.game_id, row.home_team)], mu_lineups[(row.game_id, row.away_team)] = eh, ea
            game_feat.append({'game_id': row.game_id, 'season': int(season), 'ord': int(ordw), 'week': int(row.week),
                              'home': row.home_team, 'away': row.away_team, 'charted': bool(ch and ca),
                              'hf': 0.0 if row.location == 'Neutral' else 1.0,
                              'result': None if pd.isna(row.home_score) else float(row.home_score) - float(row.away_score),
                              'x': {g: (sh[g] - sa[g]) / 100 for g in GROUPS}, 'sh': sh, 'sa': sa,
                              'x_played': {g: (ph[g] - pa[g]) / 100 for g in GROUPS}})
            for t in (row.home_team, row.away_team):
                played[(int(season), t)] = parts[t]
        # 2. the week's results move the ratings
        for row in week_games.itertuples(index=False):
            d = by_game.get(row.game_id)
            if d is None or pd.isna(row.home_score):
                continue
            unit_delta = {}
            for r in d.itertuples(index=False):
                pid, g = r.player_id, r.group
                if pid not in R:
                    R[pid], N[pid] = (QB_START if g == 'QB' and season > FIRST else 1500.0), 0
                    season_start[(season, pid)] = R[pid]
                info[pid] = {'name': r.player_display_name, 'pos': r.position, 'group': g, 'team': r.team}
                # a regular who left early: his involvement collapsed against his own recent
                # norm, so the game says nothing about how good he is and is not rated
                rv = recent.setdefault(pid, [])
                if g in MU_STATS:
                    mu_log.append({'season': int(season), 'ord': int(ordw), 'game_id': row.game_id, 'pid': pid, 'group': g,
                                   'team': r.team, 'opp': r.opponent_team, 'home': int(r.team == row.home_team), 'R': R[pid],
                                   'vol': float(r.vol), **{c: (0.0 if pd.isna(getattr(r, c, 0)) else float(getattr(r, c, 0))) for c in MU_COLS}})
                if (len(rv) >= 3 and np.median(rv) >= 0.8 * VOLUME[g] and r.vol < LEFT_EARLY * np.median(rv)
                        and not short_prev.get(pid)):
                    skipped += 1
                    short_prev[pid] = True
                    rv.append(r.vol)
                    del rv[:-5]
                    continue
                short_prev[pid] = False
                rv.append(r.vol)
                del rv[:-5]
                mu, sd = norm[(season, g)]
                z = max(-3.0, min(3.0, (r.score - mu) / sd))
                S = 1 / (1 + math.exp(-1.5 * z))
                f = FACET[g]
                Uv = unit(r.opponent_team, f) if f else 1500.0
                E = 1 / (1 + 10 ** ((Uv - R[pid]) / 400))
                K = K_NEW if N[pid] < SETTLED else K_SET
                R[pid] += K * r.w * (S - E)
                N[pid] += 1
                if int(season) in RSd:
                    # the same game played again on a rating that knows only this season
                    RS, NS, NQ, HS = RSd[int(season)], NSd[int(season)], NQd[int(season)], HSd[int(season)]
                    rs = RS.get(pid, 1500.0)
                    Es = 1 / (1 + 10 ** ((Uv - rs) / 400))
                    RS[pid] = rs + max(K_SET, K_PLACE_SUM / (NS.get(pid, 0) + K_PLACE_N)) * r.w * (S - Es)
                    NS[pid] = NS.get(pid, 0) + 1
                    NQ[pid] = NQ.get(pid, 0) + (1 if r.w >= 0.5 else 0)
                    HS.setdefault(pid, []).append([int(ordw), round(RS[pid], 1)])
                if f:
                    unit_delta.setdefault((r.opponent_team, f), []).append(r.w * (S - E))
                hist.setdefault(pid, {}).setdefault(int(season), []).append([int(ordw), round(R[pid], 1)])
                if pid not in peak or R[pid] > peak[pid][0]:
                    peak[pid] = (R[pid], int(season))
            for key, ds in unit_delta.items():
                U[key] = unit(*key) - K_UNIT * (sum(ds) / len(ds))

    print(f'  {len(R)} players rated over {len(seasons)} seasons, {len(game_feat)} games featured; {skipped} player-games a regular left early, not rated')
    # every game's features, for experiments beside this script (the cache is gitignored)
    with open(os.path.join(CACHE, 'features.json'), 'w') as f:
        json.dump(game_feat, f, separators=(',', ':'))

    # ---- the game model ----
    feats = [gf for gf in game_feat if gf['result'] is not None and gf['result'] != 0]
    print(f'  {sum(1 for r in feats if r["charted"])} of {len(feats)} decided games had both depth charts')
    # home field is a column of its own (0 at a neutral site), not a free intercept
    X = lambda rows, key='x': np.array([[r['hf']] + [r[key][g] for g in GROUPS] for r in rows])
    Y = lambda rows: np.array([1.0 if r['result'] > 0 else 0.0 for r in rows])
    def walk_forward(key):
        walk = {}
        for s in seasons[1:]:
            train = [r for r in feats if r['season'] < s]
            test = [r for r in feats if r['season'] == s]
            if not test:
                continue
            w = logistic_fit(X(train, key), Y(train))
            p = predict(w, X(test, key))
            y = Y(test)
            acc = float(((p > 0.5) == (y > 0.5)).mean())
            ll = float(-np.mean(y * np.log(np.clip(p, 1e-9, 1)) + (1 - y) * np.log(np.clip(1 - p, 1e-9, 1))))
            walk[int(s)] = {'games': len(test), 'accuracy': round(acc, 4), 'logloss': round(ll, 4)}
        return walk
    walk = walk_forward('x')
    walk_played = walk_forward('x_played')
    fits = {}
    def fit_before(s):
        """the game model fitted on every season before s"""
        if s not in fits:
            rows = [r for r in feats if r['season'] < s]
            fits[s] = logistic_fit(X(rows), Y(rows))
        return fits[s]
    # the coming games: the earliest week still to kick off (in the spring, the new season's week 1)
    next_ord, call_season = None, last
    if len(upcoming):
        first = upcoming.sort_values(['season', 'ord', 'kick'], kind='mergesort').iloc[0]
        call_season, next_ord = int(first.season), int(first.ord)
        if call_season > last and first.kick - now > datetime.timedelta(days=PRESEASON_CALLS):
            next_ord = None      # a schedule months away: no calls yet
    w_all = fit_before(call_season)
    coef = {'home': round(float(w_all[0]), 4), **{g: round(float(w_all[i + 1]), 4) for i, g in enumerate(GROUPS)}}

    # THE CALLS AND THEIR RECORD. Every call published before its kickoff goes into a ledger,
    # elo/data/calls.json (the published history up to the ledger's start is in elo/history/),
    # and the last one before kickoff is frozen there: the record grades that call, the one a
    # visitor saw, never one recomputed after the game on a formula or a tie order that has
    # moved since (2026_03_SEA_WAS was shown as WAS, then graded as a SEA pick and a loss).
    # A game never called before kickoff (weeks 1-2 of 2026, which came before the model was
    # published, or a week the job did not run) is called once after it, on pre-game ratings,
    # frozen and marked a backtest, and the record counts the two apart.
    ledger = {}
    for s in sorted({last, call_season}):
        ledger.update((read_json(os.path.join(HISTORY, f'calls_{s}.json')) or {}).get('calls', {}))
    ledger.update((read_json(os.path.join(OUT, 'calls.json')) or {}).get('calls', {}))
    # the model.json now live is itself a record of what was published: a call in its `next`
    # made before its game's kickoff is one a visitor saw, and the newest such call is the one
    # the record grades (this also carries over a run whose ledger was not committed, and the
    # calls the job made before the ledger existed)
    live_model = read_json(os.path.join(OUT, 'model.json')) or {}
    if live_model.get('built_at'):
        made = datetime.datetime.fromisoformat(live_model['built_at'])
        kick_of = dict(zip(games.game_id, games.kick))
        for c in (live_model.get('next') or {}).get('games', []):
            k = kick_of.get(c.get('game_id'))
            if c.get('frozen') or k is None or made + datetime.timedelta(minutes=CALL_LEAD) > k:
                continue
            cur = ledger.get(c['game_id'])
            if cur is None or (cur.get('at') or '') < live_model['built_at']:
                ledger[c['game_id']] = {'pick': c['pick'], 'p_home': c['p_home'], 'at': live_model['built_at'], 'src': 'published',
                                        **{k: c[k] for k in CALL_KEEP if k in c}}
    stamp = now.isoformat(timespec='minutes')
    w_grade = fit_before(last)
    # THE JOKER BASELINE: the Joker's chance for every game it has called (betting/state.json)
    joker = joker_calls()
    kick_at = dict(zip(games.game_id, games.kick))
    graded = []
    for r in game_feat:
        if r['season'] != last or r['result'] is None:
            continue
        c = ledger.get(r['game_id'])
        x = [r['x'][g] for g in GROUPS]
        if c is None:
            c = make_call(w_grade, r['hf'], x, joker.get(r['game_id']))
            c = ledger[r['game_id']] = {'pick': r['home'] if c['p_home'] >= 0.5 else r['away'], 'p_home': c['p_home'], 'at': stamp,
                                        'src': 'backtest', **{k: c[k] for k in CALL_KEEP if k in c}}
        elif not c.get('base') and r['game_id'] in joker and kick_at.get(r['game_id']) is not None and kick_at[r['game_id']] < JOKER_FROM:
            # the owner's call of 19 October 2026: the season's games played before the Joker's baseline are re-picked
            # on it, after the game, on what was known before kickoff (the Joker's call as frozen at kickoff, the
            # pre-game ratings and lineups), as a backtest; the call first made is kept beside it in `was`
            n = make_call(w_grade, r['hf'], x, joker[r['game_id']])
            c = ledger[r['game_id']] = {'pick': r['home'] if n['p_home'] >= 0.5 else r['away'], 'p_home': n['p_home'], 'at': stamp,
                                        'src': 'backtest', **{k: n[k] for k in CALL_KEEP if k in n},
                                        'was': {k: c[k] for k in ('pick', 'p_home', 'at', 'src') if k in c}}
        winner = r['home'] if r['result'] > 0 else r['away'] if r['result'] < 0 else None
        graded.append({'game_id': r['game_id'], 'p_home': c['p_home'], 'pick': c['pick'],
                       'correct': None if winner is None else c['pick'] == winner, 'src': c['src'],
                       **({'base': c['base']} if c.get('base') else {}),
                       **({'was': {'pick': c['was']['pick'], 'src': c['was'].get('src'),
                                   'correct': None if winner is None else c['was']['pick'] == winner}} if c.get('was') else {})})
    graded_ids = {g['game_id'] for g in graded}
    # a game under way, or final but not yet rated (its player stats lag the score by a night),
    # keeps its frozen call in `next`, so its pick does not vanish between kickoff and the
    # morning it is graded
    held = games[(games.season >= last) & (games.kick <= lead) & (games.kick > now - datetime.timedelta(days=10))
                 & ~games.game_id.isin(graded_ids)].sort_values(['kick', 'game_id'], kind='mergesort')
    calls = [{'game_id': gid, 'p_home': ledger[gid]['p_home'], 'pick': ledger[gid]['pick'], 'frozen': True,
              **{k: ledger[gid][k] for k in CALL_KEEP if k in ledger[gid]}}
             for gid in held.game_id if gid in ledger]
    shown = []      # the console's line per call: the teams and the quarterbacks expected to start
    coming = []
    fallback = lambda t: played.get((call_season, t)) or played.get((last, t))
    if next_ord is not None:
        week_rows = upcoming[(upcoming.season == call_season) & (upcoming.ord == next_ord)]
        for row in week_rows.sort_values(['kick', 'game_id'], kind='mergesort').itertuples(index=False):
            # this week's lineups also drop anyone the roster or the injury report keeps out
            # (availability), which a depth chart can lag behind
            eh, _ = expected(call_season, row.week, row.home_team, row.gameday, fallback(row.home_team), gone_now)
            ea, _ = expected(call_season, row.week, row.away_team, row.gameday, fallback(row.away_team), gone_now)
            if not eh or not ea:
                continue
            sh, sa = strength(eh), strength(ea)
            for team, other, parts, st_opp, home in ((row.home_team, row.away_team, eh, sa, 1), (row.away_team, row.home_team, ea, sh, 0)):
                coming.append({'game_id': row.game_id, 'team': team, 'opp': other, 'home': home, 'parts': parts,
                               'opp_strength': st_opp, 'rating': {pid: R.get(pid, REPLACEMENT) for pid, _ in parts}})
            hf = 0.0 if row.location == 'Neutral' else 1.0
            # the call: the Joker's chance moved by the Elo matchup, else the game model's own (THE JOKER BASELINE)
            c = make_call(w_all, hf, [(sh[g] - sa[g]) / 100 for g in GROUPS], joker.get(row.game_id))
            p = c['p_home']
            qb = lambda parts: next((info[pid]['name'] for pid, g in parts if g == 'QB' and pid in info), None)
            pick = row.home_team if p >= 0.5 else row.away_team
            calls.append({'game_id': row.game_id, 'p_home': p, 'pick': pick, **{k: c[k] for k in CALL_KEEP if k in c}})
            ledger[row.game_id] = {'pick': pick, 'p_home': p, 'at': stamp, 'src': 'published', **{k: c[k] for k in CALL_KEEP if k in c}}
            base = (f"on the Joker {c['p_joker']:.0%} home, Elo alone {c['p_elo']:.0%}" if c.get('base')
                    else f'Elo alone: the Joker has no call')
            shown.append(f"{row.away_team}@{row.home_team} {pick} {max(p, 1 - p):.0%} [{base}] ({qb(ea)} v {qb(eh)})")
    next_week_no = int(upcoming[(upcoming.season == call_season) & (upcoming.ord == next_ord)].week.min()) if next_ord is not None else None
    # ---- each team on its own: the power ratings (see THE POWER RATINGS) ----
    # the lineup part: each team's expected lineup for the coming week (a team on its bye or
    # already played this week: who took the field last game, minus anyone the roster or the
    # injury report keeps out) scored on this season's player ratings (RS) by the game model's
    # weights, a log-odds against a team of 1500s centred on the league; before is the same
    # lineup on the ratings it had going into the team's last game
    RS, HS = RSd[last], HSd[last]
    w_logit = lambda st: sum(coef[g] * (st[g] - 1500) / 100 for g in GROUPS)
    def rs_at(pid, before_ord=None):
        if before_ord is None:
            return RS.get(pid, 1500.0)
        prior = [v for o, v in HS.get(pid, []) if o < before_ord]
        return prior[-1] if prior else 1500.0
    def season_strength(parts, before_ord=None):
        out = {}
        for g in GROUPS:
            rs = sorted((rs_at(p, before_ord) for p, gg in parts if gg == g), reverse=True)
            wts = DEPTH[g]
            rs = (rs + [1500.0] * len(wts))[:len(wts)]
            out[g] = sum(r * w for r, w in zip(rs, wts)) / sum(wts)
        return out
    lineup = {c['team']: c['parts'] for c in coming if c['game_id'].startswith(f'{last}_')}
    for t in sorted(set(games[games.season == last].home_team) | set(games[games.season == last].away_team)):
        if t not in lineup and played.get((last, t)):
            lineup[t] = [(pid, g) for pid, g in played[(last, t)] if pid not in gone_now]
    last_game = {}
    for r in game_feat:
        if r['season'] == last and r['result'] is not None:
            for t in (r['home'], r['away']):
                last_game[t] = max(last_game.get(t, 0), r['ord'])
    now_st = {t: season_strength(parts) for t, parts in lineup.items()}
    before_st = {t: season_strength(lineup[t], last_game[t]) for t in lineup if t in last_game}
    def centred(st):
        lg = {t: w_logit(v) for t, v in st.items()}
        mean = sum(lg.values()) / len(lg) if lg else 0
        return {t: v - mean for t, v in lg.items()}
    team_rows = power_ratings(games[games.season == last], centred(now_st), centred(before_st))
    n_ok = sum(1 for g in graded if g['correct'] is True)
    n_gr = sum(1 for g in graded if g['correct'] is not None)
    record = {'season': last}
    for src in ('published', 'backtest'):
        gs = [g for g in graded if g['src'] == src and g['correct'] is not None]
        record[src] = [sum(1 for g in gs if g['correct']), sum(1 for g in gs if not g['correct'])]
    wk_of = dict(zip(games.game_id, games.week))
    pub_weeks = sorted({int(wk_of[g['game_id']]) for g in graded if g['src'] == 'published' and g['game_id'] in wk_of})
    record['published_from_week'] = pub_weeks[0] if pub_weeks else None
    # the calls made on the Joker's baseline, counted apart (THE JOKER BASELINE), from the first week
    # one was published (graded or still to come)
    jb = [g for g in graded if g['src'] == 'published' and g.get('base') == 'joker' and g['correct'] is not None]
    record['joker_base'] = [sum(1 for g in jb if g['correct']), sum(1 for g in jb if not g['correct'])]
    jb_weeks = sorted({int(wk_of[gid]) for gid, e in ledger.items() if e.get('base') == 'joker' and e.get('src') == 'published'
                       and gid.startswith(f'{last}_') and gid in wk_of})
    record['joker_base_from_week'] = jb_weeks[0] if jb_weeks else None
    # the games re-picked on the Joker's baseline after they were played, and the same games as first picked
    rd = [g for g in graded if g.get('was') and g['correct'] is not None]
    record['repicked'] = [sum(1 for g in rd if g['correct']), sum(1 for g in rd if not g['correct'])]
    record['repicked_was'] = [sum(1 for g in rd if g['was']['correct']), sum(1 for g in rd if not g['was']['correct'])]
    # the season's place in the calendar, for the page: the regular season, the playoffs, or over
    sg = games[games.season == last]
    reg_left = bool((sg.game_type == 'REG').any() and sg[sg.game_type == 'REG'].home_score.isna().any())
    sb_final = bool(((sg.game_type == 'SB') & sg.home_score.notna()).any())
    if rank_season < last:
        phase = 'opening'
    elif reg_left:
        phase = 'regular'
    elif sb_final or last < sched:
        phase = 'over'
    else:
        phase = 'postseason'
    # Overall Offense and Overall Defense sit in the ELO Ratings tab's position row and follow
    # the rankings' season (the finished one until most clubs have played the new one's week 1)
    season_pbp = pbp.get(rank_season)
    tg, final_score = pbp_team_games(season_pbp) if season_pbp is not None else (None, {})
    # each club starts the season carried from the one before (UNIT_CARRY of its final rating),
    # rated from 0 on that season's own play-by-play; the first season in the files has none
    prev_pbp = pbp.get(rank_season - 1) if rank_season - 1 >= FIRST else None
    if rank_season - 1 >= FIRST and prev_pbp is None:
        raise SystemExit(f'elo: the {rank_season - 1} play-by-play, which Overall Offense and Overall Defense carry into '
                         f'{rank_season}, was not read; nothing written, the published files stay')
    carry = unit_carry(games[games.season == rank_season - 1], *pbp_team_games(prev_pbp)) if prev_pbp is not None else None
    units = unit_ratings(games[games.season == rank_season], tg, final_score, carry)
    units['season'] = rank_season
    units['params']['carry_from'] = rank_season - 1 if carry is not None else None
    # what each source gave: the page says when one is behind, and elo/check.py reads it
    final_ids = set(games[(games.season == last) & games.home_score.notna()].game_id)
    rated_ids = {r['game_id'] for r in game_feat if r['season'] == last and r['result'] is not None}
    sources['player_stats_pending'] = sorted(final_ids - rated_ids)
    sources['team_stats_pending'] = list(units.get('pending', []))
    sources['injury_report'] = report
    model = {
        'built_at': stamp, 'formula': FORMULA,
        'season': last, 'phase': phase, 'groups': GROUPS, 'coef': coef,
        'walk_forward': walk, 'walk_forward_who_played': walk_played, 'record': record,
        'graded': graded, 'next': {'week': next_week_no, 'season': call_season, 'games': calls},
        'joker_base': {**JOKER_BASE, 'joker_calls_read': len(joker)},
        'teams': team_rows,
        'units': units,
        'sources': sources,
    }

    # ---- the rankings ----
    # The table ranks this season alone: every player starts the season at 1500 and only his
    # games this season move him (RS), so a place is earned this year and a player with no
    # rated game this season is not ranked. The models (the game model, the matchups, market +
    # form) keep the rating with every season behind it (R), which is what their records were
    # proven on; the players map carries both, `elo` the career one they read.
    RS, NS, NQ, HS = RSd[rank_season], NSd[rank_season], NQd[rank_season], HSd[rank_season]
    active_cut = last - 1          # career ratings: rated in this season or the last
    latest_season = {pid: max(h) for pid, h in hist.items()}
    rated_games = [r for r in game_feat if r['season'] == rank_season and r['result'] is not None]
    last_ord = max((r['ord'] for r in rated_games), default=None)
    players = {}
    kept_out = set()       # players the map would carry but for being out now (see `past` below)
    groups_out = {}
    def why_out(pid):
        if pid in out_now:
            return out_now[pid]
        return 'a free agent' if on_roster else None
    def before_last(pid):
        """his season rating before the latest week's games, for the movement column"""
        v = 1500.0
        for o, r in HS.get(pid, []):
            if last_ord is not None and o < last_ord:
                v = r
        return v
    # enough of a season to rank: games in a real role in at least half of his club's rated
    # games. It was half the weeks in which anyone had played, so one Thursday game raised the
    # bar for all 32 clubs and the #1 tight end and four top-15 quarterbacks vanished from the
    # table from Friday to Monday, with no note; a club on its bye is not held to a game it did
    # not have either.
    team_games = {}
    for r in rated_games:
        for t in (r['home'], r['away']):
            team_games[t] = team_games.get(t, 0) + 1
    need_of = lambda t: max(1, math.ceil(team_games.get(t, 0) / 2))
    club = lambda pid: team_now.get(pid) or info[pid]['team']
    for g in GROUPS:
        rated = [pid for pid in RS if info[pid]['group'] == g and NQ.get(pid, 0) >= need_of(club(pid))]
        rated.sort(key=lambda p: (-RS[p], p))
        # the rankings are of players who can play: the injured, the retired and the unsigned
        # are listed under the table instead, where they would have stood
        sidelined = []
        pool = []
        for pid in rated:
            w = why_out(pid)
            if w:
                if len(pool) < 25:
                    sidelined.append({'id': pid, 'name': info[pid]['name'], 'team': team_now.get(pid, info[pid]['team']),
                                      'raw': RS[pid], 'would_rank': len(pool) + 1, 'why': w})
            else:
                pool.append(pid)
        career = [pid for pid in R if info[pid]['group'] == g and latest_season[pid] >= active_cut and N[pid] >= 3 and not why_out(pid)]
        for pid in set(rated) | set(career):
            if pid in team_now:
                info[pid]['team'] = team_now[pid]
        # the movement column: against where each stood before the latest week's games
        prev = {pid: before_last(pid) for pid in pool}
        prev_rank = {pid: i + 1 for i, pid in enumerate(sorted(pool, key=lambda p: (-prev[p], p)))}
        # the season's first week has no week before it: everyone stood at 1500, and the order
        # among equals was the players' ids, so week 1 showed "up 25" beside a quarterback who
        # had moved from nowhere. Nobody has moved yet.
        if not any(o < last_ord for p in pool for o, _ in HS.get(p, []) if last_ord is not None):
            prev_rank = {pid: i + 1 for i, pid in enumerate(pool)}
        rank = {pid: i + 1 for i, pid in enumerate(pool)}
        # the ladder: each rating shown on the position's bell curve (THE LADDER)
        def curve(vals):
            vals = list(vals)
            m = float(np.mean(vals)) if vals else 1500.0
            sd = float(np.std(vals)) if len(vals) > 1 else 0.0
            return lambda v: round(1500 + SHOW_SD * (v - m) / sd) if sd > 0 else round(v)
        show = curve(RS[p] for p in pool)
        show_career = curve(R[p] for p in career if p in R)
        rows = []
        for pid in pool:
            row = {'id': pid, 'name': info[pid]['name'], 'pos': info[pid]['pos'], 'team': info[pid]['team'],
                   'elo': show(RS[pid]), 'raw': round(RS[pid]), 'rank': rank[pid], 'start_rank': prev_rank[pid],
                   'games': NS[pid], 'career': show_career(R[pid]), 'career_raw': round(R[pid]), 'peak': show_career(peak[pid][0]), 'peak_season': peak[pid][1],
                   'this_season': [[o, round(r, 1)] for o, r in HS.get(pid, [])]}
            if pid in q_now:
                row['q'] = q_now[pid]        # questionable: listed, with a Q
            row['prov'] = NQ.get(pid, 0) < PROV_GAMES   # ranked on fewer than three real-role games
            rows.append(row)
        for x in sidelined:
            x['elo'] = show(x.pop('raw'))
        groups_out[g] = {'label': LABEL[g], 'active': len(pool), 'curve': [show(RS[p]) for p in pool],
                         'min_games': min((need_of(t) for t in team_games), default=1), 'top': rows[:25], 'sidelined': sidelined}
        # the players map: every player the models may price, on his career rating (elo, with s0
        # and h the season in play so far, so a rating can be read as it stood before any week:
        # the Prop Record grades on those), his club, and his place in the rankings where he has
        # one (se, rank)
        for pid in sorted(set(career) | set(pool)):
            if pid not in R:
                continue
            h = hist[pid]
            players[pid] = {'name': info[pid]['name'], 'group': g, 'team': info[pid]['team'], 'elo': round(R[pid]),
                            's0': round(season_start.get((last, pid), 1500.0)), 'h': [[o, round(r)] for o, r in h.get(last, [])],
                            'se': show(RS[pid]) if pid in rank else None, 'rank': rank.get(pid)}
        kept_out.update(p for p in set(rated) | {p for p in R if info[p]['group'] == g and latest_season[p] >= active_cut and N[p] >= 3}
                        if why_out(p))
    # a player the roster or the report keeps out (or one who has left his club) is not in the
    # players map, so nothing on the page prices him or suggests his lines; but the Prop Record
    # grades the lines he had before, each week on the rating he took into it, and with no
    # rating it graded them at 1500. So his season so far (s0 and h, as in the map) is kept here.
    past = {pid: {'s0': round(season_start.get((last, pid), 1500.0)), 'h': [[o, round(r)] for o, r in hist[pid][last]]}
            for pid in sorted(kept_out) if pid in R and pid not in players and hist.get(pid, {}).get(last)}

    def through(season):
        """how far the season's rating has got: the latest week whose games are all rated (or
        abandoned), the week under way beside it (a Thursday game alone does not make week 5
        played), the playoff round, or final"""
        sgm = games[games.season == season]
        rated = {r['game_id'] for r in game_feat if r['season'] == season and r['result'] is not None}
        gone_by = now - datetime.timedelta(days=3)
        complete = lambda rows: all(gid in rated or (pd.isna(hs) and k < gone_by) for gid, hs, k in zip(rows.game_id, rows.home_score, rows.kick))
        reg, post = sgm[sgm.game_type == 'REG'], sgm[sgm.game_type != 'REG']
        weeks = sorted(int(w) for w in reg.week.unique())
        done = [w for w in weeks if complete(reg[reg.week == w])]
        tw = max(done, default=0)
        if season < last or bool(((sgm.game_type == 'SB') & sgm.game_id.isin(rated)).any()):
            return tw, 'final', None
        rnd = post.game_type.map(ROUND_TYPE)
        if post.game_id.isin(rated).any():
            done_r = [r for r in sorted(set(rnd.dropna().astype(int))) if complete(post[rnd == r])]
            label = 'through ' + (ROUND[max(done_r)] if done_r else 'the regular season')
            return tw, label, None
        partial = None
        nxt = [w for w in weeks if w > tw and reg[reg.week == w].game_id.isin(rated).any()]
        if nxt:
            wr = reg[reg.week == nxt[0]]
            partial = {'week': nxt[0], 'played': int(wr.game_id.isin(rated).sum()), 'games': int(len(wr))}
        if partial and not tw:      # week 1 under way: there is no "week 0" to be through
            label = f"{partial['played']} of {partial['games']} week-{partial['week']} games"
        else:
            label = f'through week {tw}' + (f", and {partial['played']} of {partial['games']} week-{partial['week']} games" if partial else '')
        return tw, label, partial
    tw, tlabel, partial = through(rank_season)
    out = {
        'built_at': model['built_at'], 'formula': FORMULA, 'season': rank_season, 'season_in_play': last, 'phase': phase,
        'through_week': tw, 'through': tlabel, 'partial': partial,
        'rule': 'a real role (half the position\'s normal workload) in at least half of his club\'s rated games',
        'prov_games': PROV_GAMES,
        'groups': groups_out, 'players': players, 'past': past,
    }
    mu = matchups(mu_log, game_feat, coming, call_season, mu_lineups)
    if mu:
        cols = lambda g, st: (['1', 'home x form', 'form', 'form x allowed']
                              + [f'form x {g}{i + 1}' for i in range(MU_RANK.get(g, 0) if st in MU_RANK_STATS else 0)]
                              + ['form x player Elo'] + [f'form x opposing {u} Elo' for u in MU_DEF])
        # the whole league beside the coming games, so the page's Mismatches measure a starter
        # and the unit he faces against every team, not just the games still to play this week
        # (on a Monday that is two teams, and the weaker of two defences read as "ranked 2nd"):
        # every team on the same rule, its expected starters for its next game (that game's
        # depth chart minus whoever the roster or the injury report keeps out, as the coming
        # games are), or for a team with none left its last game's; each team's defensive units
        # on them, and each position's starters (the DEPTH best of every lineup by career
        # rating) as a mean and a spread
        league, lineups = {}, {}
        for t in sorted(set(games[games.season == last].home_team) | set(games[games.season == last].away_team)):
            nxt = upcoming[(upcoming.home_team == t) | (upcoming.away_team == t)].sort_values(['season', 'ord', 'kick'], kind='mergesort')
            if len(nxt):
                r0 = nxt.iloc[0]
                league[t], _ = expected(int(r0.season), r0.week, t, r0.gameday, fallback(t), gone_now)
                lineups[t] = {'game_id': r0.game_id, 'week': int(r0.week), 'players': [p for p, _ in league[t]]}
            else:
                gone = [k for k in mu_lineups if k[1] == t and k[0].startswith(f'{last}_')]
                if gone:
                    league[t] = mu_lineups[max(gone)]
        league = {t: parts for t, parts in league.items() if parts}
        tops = {g: [r for parts in league.values()
                    for r in sorted((R.get(p, REPLACEMENT) for p, gg in parts if gg == g), reverse=True)[:len(DEPTH[g])]]
                for g in MU_STATS}
        mu['league'] = {'defs': {t: {u: round(v, 1) for u, v in strength(parts).items() if u in MU_DEF}   # a tenth: whole points tie a third of the league
                                 for t, parts in sorted(league.items())},
                        'norms': {g: [round(float(np.mean(v)), 1), round(float(np.std(v, ddof=1)), 1)]
                                  for g, v in tops.items() if len(v) > 1}}
        # each club's expected lineup for its next game, and who the roster or the report keeps
        # out of it (or lists as questionable), so the page can say why a player has no matchup
        # and elo/check.py can hold the lineups against the injury report
        mu['lineups'] = lineups
        priced = lambda pid: pid in R and N.get(pid, 0) >= 3 and latest_season.get(pid, 0) >= active_cut
        mu['out'] = {pid: why for pid, why in sorted(out_now.items()) if why and priced(pid)}
        mu['q'] = {pid: why for pid, why in sorted(q_now.items()) if priced(pid)}
        mu['reports'] = report
        mu.update({'built_at': model['built_at'], 'season': call_season, 'week': model['next']['week'],
                   'columns': {f'{g}|{st}': cols(g, st) for g, sts in MU_STATS.items() for st in sts}})
        for k in ('QB|passing_yards', 'WR|receiving_yards', 'RB|rushing_yards', 'TE|receiving_yards'):
            r = mu['record'].get(k, {}).get('past')
            if r:
                print(f"  matchups {k}: {r['games']} games, rmse {r['rmse_form']} -> {r['rmse_elo']}, biggest nudges right {r['right_top']:.3f}")
    # every file is written once everything is built, each whole: a build that stops halfway
    # leaves the last good set in place
    keep = {gid: c for gid, c in ledger.items() if int(gid[:4]) >= last - 1}
    files = {'players.json': out, 'model.json': model,
             'calls.json': {'built_at': model['built_at'], 'season': last,
                            'about': 'each game\'s ELO Model call as last published before its kickoff (src published), or, for a game '
                                     'never called before it, as first called after it (src backtest); written by elo/build.py, '
                                     'never edited: the record grades these. From 19 October 2026 a call with base joker is the '
                                     'Joker\'s chance (p_joker) moved by the Elo matchup (m), and p_elo is the game model\'s own',
                            'calls': dict(sorted(keep.items()))}}
    if mu:
        files['matchups.json'] = mu
    os.makedirs(OUT, exist_ok=True)
    for name, body in files.items():
        with open(os.path.join(OUT, name + '.part'), 'w') as f:
            json.dump(body, f, separators=(',', ':'))
    for name in files:
        os.replace(os.path.join(OUT, name + '.part'), os.path.join(OUT, name))
    print(f'  wrote elo/data/players.json ({os.path.getsize(os.path.join(OUT, "players.json")) // 1024} KB), model.json, calls.json'
          + (', matchups.json' if mu else ''))
    print(f'  season {last} ({phase}); rankings {rank_season} {tlabel}')
    for g in GROUPS:
        print(f'  {LABEL[g]}: ' + ', '.join(f"{r['name']} {r['elo']}" for r in groups_out[g]['top'][:5]))
    print('  walk-forward, pre-game lineups: ' + ', '.join(f"{s}: {w['accuracy']:.3f} ({w['games']})" for s, w in walk.items()))
    print('  walk-forward, who played (hindsight): ' + ', '.join(f"{s}: {w['accuracy']:.3f}" for s, w in walk_played.items()))
    if shown:
        print('  ' + '; '.join(shown[:6]))
    print(f"  weights: {coef}")
    if n_gr:
        print(f"  {last}: {n_ok}/{n_gr} graded (published before kickoff {record['published'][0]}-{record['published'][1]}, "
              f"backtest {record['backtest'][0]}-{record['backtest'][1]}); next week {model['next']['week']}: {len(calls)} calls")



if __name__ == '__main__':
    main()
