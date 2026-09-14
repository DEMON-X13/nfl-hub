/* ============================================================
   WEEKS. Each week is one object. Add a week by appending here.
   Every team gets exactly three sections:
     summary   (recap: last game / week 1: matchup preview)   tone "n"
     strengths / weaknesses per team, shared matchup block per game
   ============================================================ */

const WEEK1 = {
  id:"wk1", label:"Week 1", type:"preview", status:"live", updated:"September 13, 2026",
  dates:"Wednesday, September 9 to Monday, September 14, 2026",
  headline:"All 32 teams open across four days",
  intro:"Click any game for the full breakdown: each team's matchup preview, positives, negatives, and keys to victory, with the stat comparison at the bottom.",
  ranksNote:"Ranks are the preseason consensus. Overall is the Sharp Football order, offense and defense are 2025 scoring ranks. They start moving once results accumulate.",
  games:[
  {
    away:"NE", home:"SEA", day:"Wed Sep 9", time:"8:20 PM ET", kick:"2026-09-10T00:20:00Z",
    tv:"NBC", venue:"Lumen Field, Seattle", awayScore:10, homeScore:13,
    line:"SEA -3.5, O/U 44.5", note:"Super Bowl LX rematch. Seattle won it again, 13-10.",
    preview:[
      "<strong>Played.</strong> Seattle won 13-10, a far tighter game than the 29-13 Super Bowl and one that every NFL.com picker got wrong on the score.",
      "<strong>The matchup that decided it:</strong> Seattle's front against a New England line that was shredded in February. The Patriots kept it close this time, which was OC Josh McDaniels' stated goal.",
      "<strong>What it confirmed:</strong> both defenses travel. Neither offense cleared 14 points in a game the market had at 44.5."
    ],
    keys:[
      "Seattle came in without the two things that carried the title run: Kenneth Walker III is a Chief and Zach Charbonnet is on PUP, leaving rookie Jadarian Price and George Holani to carry it.",
      "Seattle's secondary was rebuilt on the fly. Coby Bryant and Riq Woolen left in free agency, Ty Okada was out, and Nick Emmanwori was questionable coming off ankle surgery.",
      "A.J. Brown's Patriots debut came against exactly the coverage group that was supposed to be the weak point. Ten points says it did not break open."
    ]
  },
  {
    away:"SF", home:"LAR", day:"Thu Sep 10", time:"8:35 PM ET", kick:"2026-09-11T00:35:00Z",
    tv:"Netflix", venue:"Melbourne Cricket Ground, Australia", awayScore:27, homeScore:7,
    line:"LAR -3.5, O/U 48.5", note:"First NFL regular season game in Australia. 100,021 in attendance.",
    preview:[
      "<strong>Played.</strong> San Francisco 27, Los Angeles 7, in front of 100,021 at the MCG, the seventh-largest regular season crowd in NFL history.",
      "<strong>The winning factor was preparation, not talent.</strong> The 49ers flew in a week early to acclimate. The Rams landed 28 hours before kickoff. McVay said afterward that was not the reason, but every analyst has pointed at it.",
      "<strong>Key matchup:</strong> the Rams' new-look secondary against Purdy. He threw three touchdowns to three different receivers, and Renardo Green intercepted Stafford on a deep ball to Nacua."
    ],
    keys:[
      "Stafford completed 4 of 11 in the first half and did not finish the game. The reigning MVP was pulled with his side down 20.",
      "Mike Evans scored his first touchdown as a 49er, Deebo Samuel and Demarcus Robinson added the others. San Francisco ran for 174 yards, with rookie Kaelon Black taking 14 carries for 65.",
      "Purdy, Fred Warner, and Nick Bosa all played and earned Player of the Game honors. The health questions that hung over San Francisco all summer did not show up.",
      "Aaron Donald, who came out of retirement for this season, did not travel. Myles Garrett played after missing most of camp with knee swelling."
    ]
  },
  {
    away:"CHI", home:"CAR", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"FOX", venue:"Bank of America Stadium, Charlotte",
    line:"CHI -3, O/U 47.5", note:"NFL.com's panel split 3-2 for Chicago. Every projected score was within four points.",
    preview:[
      "<strong>Key matchup:</strong> Ben Johnson's offense against an Ejiro Evero defense that spent real money this offseason on Jaelan Phillips and Devin Lloyd. If Carolina disrupts Caleb Williams early, the home team has a path.",
      "<strong>Momentum:</strong> Chicago won 11 games and the division in Johnson's first year and beat Green Bay in January. Carolina won the South at 8-9 and has not solved scoring.",
      "<strong>Winning factor:</strong> Carolina's tackles. Both starters are out at least four games, and Nic Scourton, the team's co-sack leader last season, tore his ACL and is out for the year. The pass rush that was supposed to swing this is down a man.",
      "<strong>The split view:</strong> the panel that picked Carolina leaned on Chicago's defense allowing the fourth-most yards in the league in 2025 and living on takeaways, which rarely repeats."
    ],
    keys:[
      "Chicago's defense took the ball away at a high rate last season, and takeaway rate is the least stable thing a defense does year to year. Regression there is the single biggest threat to the Bears' record.",
      "Carolina is without both starting tackles and now Scourton. Bryce Young's pressure numbers are the stat to watch.",
      "Chicago has its own line problem: Drew Dalman retired and rookie Logan Jones snaps to Williams. Rome Odunze has not practiced with a leg injury.",
      "Tetairoa McMillan won Offensive Rookie of the Year and is the one Carolina piece nobody disputes."
    ]
  },
  {
    away:"TB", home:"CIN", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"FOX", venue:"Paycor Stadium, Cincinnati",
    line:"CIN -3.5, O/U 50.5", note:"Highest total on the board. Four of five NFL.com pickers took Cincinnati.",
    preview:[
      "<strong>Key matchup:</strong> Burrow, Chase, Higgins, and Chase Brown against a Tampa Bay secondary that is the thinnest part of its roster. This is the projected shootout of the week at 50.5.",
      "<strong>Momentum:</strong> both teams are trying to erase a collapse. Cincinnati went 6-11 with Burrow out nine games. Tampa Bay started 6-2 and lost seven of nine.",
      "<strong>Winning factor:</strong> whether Cincinnati's rebuilt defensive front, led by Dexter Lawrence, buys Burrow enough of a buffer. Analysts think it just barely does.",
      "<strong>Health check:</strong> Chase (knee) and Higgins (heel) both practiced Monday. Tampa Bay's Emeka Egbuka is back from turf toe and Jalen McMillan from a knee, both with growing pains expected."
    ],
    keys:[
      "Cincinnati has an early-season curse: they broke a three-year Week 1 losing streak in 2025, then lost Burrow to a toe injury the following game.",
      "Tampa Bay is figuring out the post-Mike Evans passing game in real time. Chris Godwin and Egbuka carry it now.",
      "Rueben Bain Jr., the 15th pick, was the most productive edge rusher in the draft class and fills Tampa's clearest need immediately.",
      "Cincinnati's offensive line is still the unresolved question, and it is why the Burrow injury risk never fully goes away."
    ]
  },
  {
    away:"NO", home:"DET", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"FOX", venue:"Ford Field, Detroit",
    line:"DET -6.5, O/U 49.5", note:"Unanimous. All five NFL.com pickers took Detroit, by an average of 12.",
    preview:[
      "<strong>Key matchup:</strong> Tyler Shough against a Detroit secondary missing both starting safeties. Brian Branch and Kerby Joseph opened on PUP and Terrion Arnold was traded to Seattle. That is the one path New Orleans has.",
      "<strong>Momentum:</strong> Detroit fell from 15 wins to 9-8 and Dan Campbell graded himself \"a freaking F.\" The Lions are the league's highest-scoring home team in three of the last four seasons.",
      "<strong>Winning factor:</strong> Detroit's offensive line against a New Orleans defensive front that analysts describe as underwhelming. If the line holds, the Lions score in bunches.",
      "<strong>New voice:</strong> OC Drew Petzing makes his Lions debut with Gibbs, St. Brown, and Williams to work with."
    ],
    keys:[
      "Shough took sacks at an 8.3 percent rate last season, and the Lions are 6.5-point favorites, which means New Orleans is likely playing from behind in obvious passing situations against Aidan Hutchinson.",
      "Alvin Kamara (knee) has not practiced and is expected out. Travis Etienne Jr., signed from Jacksonville, takes the workload.",
      "Rookie WR Jordyn Tyson, the eighth overall pick, is on IR with a hamstring for at least four games.",
      "Detroit's Isiah Pacheco, signed to replace David Montgomery, opened on IR with a back issue. Jacob Saylors and Sione Vaki back up Gibbs."
    ]
  },
  {
    away:"ATL", home:"PIT", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"FOX", venue:"Acrisure Stadium, Pittsburgh",
    line:"PIT -3.5, O/U 41.5", note:"Unanimous for Pittsburgh. Tua was ruled out Friday with an oblique.",
    preview:[
      "<strong>The story changed Friday.</strong> Tua Tagovailoa was ruled out with an oblique injury and <strong>Cooper Rush</strong> starts for Atlanta. Michael Penix Jr. is still working back from his knee.",
      "<strong>Key matchup:</strong> Falcons RT Jawaan Taylor against the Steelers edge trio of T.J. Watt, Alex Highsmith, and Nick Herbig. ESPN's Seth Walder predicted Taylor posts a pass block win rate under 75 percent against a 90 percent league average.",
      "<strong>Momentum:</strong> two new head coaches, both with something to prove. Kevin Stefanski was 6-7 against Pittsburgh as Browns coach. Mike McCarthy has Aaron Rodgers, who did not play a preseason snap.",
      "<strong>Winning factor:</strong> Atlanta's pass rush is gutted. Jalon Walker is injured and James Pearce Jr. is suspended, so Rodgers should have time against Pittman, Metcalf, and Freiermuth."
    ],
    keys:[
      "One of these teams has an identity and the other has none at quarterback. Atlanta is now on its third option in a week.",
      "Rodgers took zero preseason snaps. Rust is a genuine variable in a game with a 41.5 total.",
      "Bijan Robinson, Drake London, and second-team All-Pro Kyle Pitts are a real skill trio being handed to Cooper Rush.",
      "Pittsburgh's plus 10 point differential in a 10-win 2025 is the loudest regression signal in the league, and their SRS was 0.1, dead average."
    ]
  },
  {
    away:"BUF", home:"HOU", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"CBS", venue:"NRG Stadium, Houston",
    line:"BUF -1.5, O/U 44.5", note:"Four of five NFL.com pickers took Houston as the home underdog.",
    preview:[
      "<strong>The marquee matchup of the early window:</strong> preseason MVP favorite Josh Allen against what most outlets rank as the best defense in football.",
      "<strong>History is lopsided.</strong> Houston has won four of the last five meetings with Allen's Bills, each by a single possession. DeMeco Ryans held Allen to a career-low 30 percent completions in 2024 and a career-high eight sacks in 2025. Both wins came in Houston.",
      "<strong>Winning factor:</strong> Joe Brady is calling plays and running the team for the first time at any level, against Will Anderson Jr. and that front. Finding an offensive groove takes time.",
      "<strong>Buffalo's counter:</strong> the reigning rushing champion in James Cook, a real WR1 in D.J. Moore, and a cohesive offensive line. That is more than Allen had last time these met."
    ],
    keys:[
      "Houston allowed 295 points in 2025, second fewest in the AFC, with a DSRS of 7.2 that led the conference outright.",
      "Buffalo's secondary is the thinner half of the roster and C.J. Gardner-Johnson may not play. Terrel Bernard is also uncertain.",
      "Houston lost Jayden Higgins for the season and traded for Kayshon Boutte. Tank Dell and OT Braden Smith are both on IR for at least four games.",
      "Houston starts two rookies on the offensive line and just lost a tackle. C.J. Stroud has taken a lot of hits over three seasons."
    ]
  },
  {
    away:"BAL", home:"IND", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"CBS", venue:"Lucas Oil Stadium, Indianapolis",
    line:"BAL -3.5, O/U 47.5", note:"Four of five took Baltimore. Both teams are erasing a bad 2025.",
    preview:[
      "<strong>Key matchup:</strong> Jesse Minter's debut defense against the offense that dropped 38 on his Chargers in Week 7 last season, the most points Los Angeles allowed all year. Minter gets an immediate rematch with a better roster.",
      "<strong>Momentum:</strong> Indianapolis started 7-1 and held the AFC's top seed, then lost seven straight to close. Baltimore went 8-9 with Lamar Jackson hurt but still outscored opponents by 26.",
      "<strong>Winning factor:</strong> whether Jackson has his swagger back under new OC Declan Doyle, formerly Ben Johnson's apprentice, against a Colts defense that added little.",
      "<strong>The other variable:</strong> Daniel Jones is playing his first game since tearing his Achilles in December. Rust is expected."
    ],
    keys:[
      "Trey Hendrickson signed to fix a pass rush that was Baltimore's clearest 2025 failure. Jaire Alexander and Tre'Davious White rebuilt the corner room cheaply.",
      "Indianapolis scored 466 points last year, fourth most in the AFC, with an OSRS of 5.9. The collapse was about availability.",
      "Sauce Gardner, acquired for two first-round picks, is a true shutdown corner and changes what Indianapolis can call.",
      "Michael Pittman Jr. was traded to Pittsburgh. Alec Pierce (ankle) is expected to play after missing most of the offseason."
    ]
  },
  {
    away:"CLE", home:"JAX", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"CBS", venue:"EverBank Stadium, Jacksonville",
    line:"JAX -8.5, O/U 40.5", note:"Unanimous and the second-biggest spread of the week. Lowest total at 40.5.",
    preview:[
      "<strong>There is no obvious path to a Cleveland win.</strong> Deshaun Watson starts despite being outplayed by Shedeur Sanders in the preseason.",
      "<strong>Key matchup:</strong> a Browns receiver room depending on rookies KC Concepcion and Denzel Boston against a Jacksonville defense with playmakers at every level.",
      "<strong>Momentum:</strong> Jacksonville went from four wins to 13 and the division in Liam Coen's first year. Trevor Lawrence enters year two in a system that worked, with a loaded pass-catching group.",
      "<strong>Winning factor:</strong> Cleveland's defense is without Myles Garrett for the first time in a decade, and rookie DC Mike Rutenberg is calling it. Jared Verse came back in the trade."
    ],
    keys:[
      "Quinshon Judkins is coming off a serious season-ending injury, which thins Cleveland's best remaining unit.",
      "Cleveland scored 279 points in 2025, second fewest in the league, and spent heavily on the line with Zion Johnson and Spencer Fano to fix it.",
      "Jakobi Meyers, extended for three years and $60 million, is a captain. Brian Thomas Jr. is back.",
      "Jacksonville's bear case is turnover luck. A large share of the 13-win jump came from a takeaway rate that rarely repeats, which is why the win total dropped four games to 8.5.",
      "RB LeQuint Allen Jr. is unlikely to play, so Bhayshul Tuten takes the third-down role."
    ]
  },
  {
    away:"NYJ", home:"TEN", day:"Sun Sep 13", time:"1:00 PM ET", kick:"2026-09-13T17:00:00Z",
    tv:"CBS", venue:"Nissan Stadium, Nashville",
    line:"TEN -1.5, O/U 38.5", note:"Lowest total of the week. Unanimous for the Jets despite Tennessee being favored.",
    preview:[
      "<strong>Not a revenge game, but close.</strong> Robert Saleh's first game as Titans head coach comes against the Jets, where he was fired. Aaron Glenn is on the other sideline.",
      "<strong>Key matchup:</strong> ex-Jets Jermaine Johnson II and John Franklin-Myers, alongside Jeffery Simmons, against a Jets offensive line the panel calls sturdy and consistent.",
      "<strong>Momentum:</strong> two 3-14 teams. Neither has won a Week 1 game since 2021 except the Rodgers four-snap opener.",
      "<strong>Winning factor:</strong> Cam Ward's first unit struggled this preseason while Geno Smith and the Jets starters flourished in limited action. The panel went 5-0 on the road team."
    ],
    keys:[
      "Tennessee hired Robert Saleh and Brian Daboll and drafted Carnell Tate fourth overall, then signed Wan'Dale Robinson for four years and $78 million.",
      "Tennessee's cornerback spending was the most criticized part of any offseason. ESPN noted both Alontae Taylor and Cor'Dale Flott graded below average in pre-throw positioning last season.",
      "New York's weapons finally go two deep: Omar Cooper Jr. and Kenyon Sadiq joined a group that had nothing.",
      "The Jets traded Sauce Gardner for two first-round picks and drafted David Bailey second overall, the most talked-about rookie pass rusher of camp."
    ]
  },
  {
    away:"MIA", home:"LV", day:"Sun Sep 13", time:"4:25 PM ET", kick:"2026-09-13T20:25:00Z",
    tv:"FOX", venue:"Allegiant Stadium, Las Vegas",
    line:"LV -3.5, O/U 40.5", note:"Only the sixth game in 30 seasons with both head coaches making their NFL debuts.",
    preview:[
      "<strong>Two debut head coaches.</strong> Klint Kubiak and Jeff Hafley both coach their first NFL game. The home coach has won three of the previous five such meetings.",
      "<strong>Key matchup:</strong> Maxx Crosby against a Miami line protecting Malik Willis in his first season as a full-time starter. Las Vegas will make Willis beat them through the air, which is the hardest ask on this roster.",
      "<strong>Momentum:</strong> Las Vegas scored a league-low 14.2 points per game in 2025. Miami has $181.6 million in dead cap and 12 rookies, and Hafley has said outright that 2026 will not be defined by wins.",
      "<strong>Winning factor:</strong> Ashton Jeanty's ankle. He is expected to go. Brock Bowers had a meniscus trim Tuesday and is out a game or two, which removes Las Vegas's best receiving threat."
    ],
    keys:[
      "De'Von Achane carries Miami's offense. The receiver room is widely rated the weakest in the league, with rookies Caleb Douglas and Chris Bell being asked to grow up fast.",
      "Las Vegas spent $281.5 million on the first day of free agency, headlined by center Tyler Linderbaum, to fix why the offense could not score.",
      "Kirk Cousins starts with No. 1 overall pick Fernando Mendoza backing up. The phrase around the team is that Cousins has the reins for now.",
      "This is described by several outlets as Miami's best chance at a win all season, and most still have them losing by at least a touchdown."
    ]
  },
  {
    away:"WAS", home:"PHI", day:"Sun Sep 13", time:"4:25 PM ET", kick:"2026-09-13T20:25:00Z",
    tv:"FOX", venue:"Lincoln Financial Field, Philadelphia",
    line:"PHI -5.5, O/U 44.5", note:"Unanimous for Philadelphia. Nick Sirianni is 5-0 in Week 1.",
    preview:[
      "<strong>Key matchup:</strong> a Tunsil-less Washington offensive line against Vic Fangio's front, spearheaded by the Jalen Carter and Jordan Davis interior. Analysts are calling that a recipe for disaster.",
      "<strong>The containment plan:</strong> Philadelphia has two athletic linebackers in Zack Baun and Jihaad Campbell to track Jayden Daniels, and two first-team All-Pro corners in Quinyon Mitchell and Cooper DeJean to close his passing lanes.",
      "<strong>Momentum:</strong> these met in the January 2025 NFC title game and have gone opposite directions. Philadelphia repeated as NFC East champion. Washington fell to 5-12 and allowed the most yards in the league.",
      "<strong>Winning factor:</strong> whether Washington's aggressive defensive rebuild took. The consensus is that it is not a quick fix."
    ],
    keys:[
      "Laremy Tunsil tore a triceps on August 8 and is likely out a significant portion of the season. The line was already the unsolved problem.",
      "Philadelphia traded A.J. Brown to New England. DeVonta Smith is the No. 1 now, with rookie Makai Lemon, Eli Stowers, Dontayvion Wicks, and Hollywood Brown behind him.",
      "The Eagles' edge group has question marks, and Jonathan Greenard has been dealing with a pec injury.",
      "Daniels missed seven games in 2025 and Washington went 2-5 without him. His running style is central to the offense and to the injury risk."
    ]
  },
  {
    away:"ARI", home:"LAC", day:"Sun Sep 13", time:"4:25 PM ET", kick:"2026-09-13T20:25:00Z",
    tv:"CBS", venue:"SoFi Stadium, Inglewood",
    line:"LAC -9.5, O/U 47.5", note:"Biggest spread on the board. Unanimous, projected as the most lopsided result outside Jacksonville.",
    preview:[
      "<strong>Key matchup:</strong> rookie center Jake Slaughter, making his first career start, against Walter Nolen, Josh Sweat, and Arizona's pass rush. Tyler Biadasz is out for an extended stretch, so this is forced rather than chosen.",
      "<strong>Momentum:</strong> the Chargers won 11 games without both All-Pro tackles, and Joe Alt and Rashawn Slater are both back. Arizona won three games and lost its last nine.",
      "<strong>Winning factor:</strong> Justin Herbert in Mike McDaniel's offense. The summer glimpses were described as straight gas, and it is McDaniel's first game calling plays here.",
      "<strong>Arizona's shape:</strong> expect a big Chargers halftime lead that narrows late, with Jacoby Brissett, Trey McBride, and Michael Wilson playing well from behind, which is exactly what they did all last season."
    ],
    keys:[
      "Mike LaFleur coaches his first NFL game in the building where he spent three years as the Rams' coordinator. He is Arizona's sixth consecutive first-time head coach.",
      "Jeremiyah Love, the third overall pick, missed four weeks with an ankle injury and is listed behind Tyler Allgeier. He may be eased in.",
      "Rookie guard Chase Bisontis is out most or all of the season with an MCL injury, forcing Isaiah Adams into the lineup. Arizona's line ranked 26th last year.",
      "Los Angeles lost DC Jesse Minter to Baltimore. Chris O'Leary takes over and is expected to keep the same scheme."
    ]
  },
  {
    away:"GB", home:"MIN", day:"Sun Sep 13", time:"4:25 PM ET", kick:"2026-09-13T20:25:00Z",
    tv:"CBS", venue:"U.S. Bank Stadium, Minneapolis",
    line:"MIN -1.5, O/U 46.5", note:"Four of five took Minnesota. The closest line among divisional games.",
    preview:[
      "<strong>This is about what Green Bay lost, not what Minnesota gained.</strong> Micah Parsons is unavailable for four games and Josh Jacobs is on the commissioner exempt list.",
      "<strong>Key matchup:</strong> Brian Flores' defense against a Packers backfield of MarShawn Lloyd, Kaleb Johnson, and Chris Brooks, only one of whom has more than 100 career rushing yards. Flores should expect a heavy dose of Jordan Love's arm and can plan accordingly.",
      "<strong>The other debut:</strong> Kyler Murray under Kevin O'Connell, at the veteran minimum, in a full U.S. Bank Stadium. Sharp Football is explicitly higher on Minnesota with him starting than with J.J. McCarthy.",
      "<strong>Winning factor:</strong> whether Love can carry an offense with no run game against the conference's best-schemed defense."
    ],
    keys:[
      "Love has been the sixth most efficient quarterback in EPA per dropback over the last three seasons, which is the whole case for Green Bay's top-five ranking.",
      "Minnesota traded Jonathan Greenard and Harrison Phillips. The front will look very different, with rookies replacing starters.",
      "Minnesota scored only 344 points last year, third fewest among winning teams, with an OSRS of minus 3.4. Justin Jefferson raises the floor regardless.",
      "Green Bay blew a 21-3 halftime lead in the wild card round at Chicago and lost its final five regular season games before that."
    ]
  },
  {
    away:"DAL", home:"NYG", day:"Sun Sep 13", time:"8:20 PM ET", kick:"2026-09-14T00:20:00Z",
    tv:"NBC", venue:"MetLife Stadium, East Rutherford",
    line:"DAL -2.5, O/U 48.5", note:"128th meeting. Dallas has won 16 of the last 18 going back to 2017.",
    preview:[
      "<strong>Key matchup:</strong> two overhauled defenses. Dallas ranked dead last in scoring defense and 30th in yards in 2025 and rebuilt with Caleb Downs, Malachi Lawrence, Rashan Gary, and Quinnen Williams under new DC Christian Parker. The Giants added Arvell Reese to an already scary pass rush.",
      "<strong>Momentum:</strong> Dallas owns the rivalry, but the Giants won Week 18 last season and have changed nearly everything. John Harbaugh is in charge, Skattebo is healthy, Nabers may return, and Odell Beckham is back.",
      "<strong>Winning factor:</strong> Dallas's offensive line. Pro Bowl LG Tyler Smith needs thumb surgery and misses 4 to 6 weeks, throwing fourth-year pro TJ Bass into the fire against that Giants front.",
      "<strong>The honest read from the panel:</strong> nobody truly knows what the 2026 versions of these teams look like. One picker went with vibes and took the Giants."
    ],
    keys:[
      "Dallas scored 471 points at 27.7 per game in 2025, fifth most in football. The offense never needed fixing. A minus 40 differential with that many points means a competent defense swings several games.",
      "The Lamb and Pickens pairing is one of the best receiver duos in the league.",
      "Malik Nabers is coming off the torn ACL he suffered in Week 4 last season. Practice participation this week decides whether he plays.",
      "Sharp Football moved Dallas up four spots out of camp and calls them underrated at 12th."
    ]
  },
  {
    away:"DEN", home:"KC", day:"Mon Sep 14", time:"8:15 PM ET", kick:"2026-09-15T00:15:00Z",
    tv:"ESPN / ABC", venue:"Arrowhead Stadium, Kansas City",
    line:"KC -2.5, O/U 43.5", note:"Three of five took Denver as the road underdog. Mahomes' first game since the ACL tear.",
    preview:[
      "<strong>The question the whole week has been building to:</strong> is Patrick Mahomes all the way back? He tore his ACL and LCL in December, took every first team rep in camp, and sat out the preseason by design.",
      "<strong>Key matchup:</strong> Denver's defense, which allowed 311 points and returns essentially intact, against a Chiefs line that will not have Josh Simmons starting at tackle.",
      "<strong>Momentum:</strong> Denver won 14 games, eleven by one score, tying an NFL record. Kansas City won six, going 1-9 in one-score games with a positive point differential. Both numbers scream regression toward each other.",
      "<strong>Winning factor:</strong> turnovers and the fourth quarter. The consensus read is a low-scoring game where Mahomes knocks off rust, Denver stays close, and a late score decides it."
    ],
    keys:[
      "Jaylen Waddle, acquired for first, third, and fourth round picks, gives Bo Nix a separator on the outside for the first time.",
      "Kenneth Walker III, the Super Bowl LX MVP, signed with Kansas City to fix a run game that had been missing for seasons. Expect a run-heavy script early to ease Mahomes back.",
      "Kansas City traded Trent McDuffie and Joe Thuney, two of the best players at their positions, and rookies Mansoor Delane and Peter Woods replace them.",
      "Denver's eleven one-score wins is the loudest regression signal in the league. Their SRS was 3.5, which is a good team, not a 14-win team.",
      "OLB Jonathan Cooper was placed on the commissioner exempt list and is unavailable for Denver."
    ]
  }
  ],
  teams:{}
};

/* ---------- per team: last game, strengths, weaknesses ---------- */
const TM = (headline, last, strengths, weaknesses) => ({headline, last, strengths, weaknesses});

WEEK1.teams = {

SEA: TM("1-0 after a 13-10 defense of the title",
  ["Beat New England 13-10 at Lumen Field in the Wednesday opener. Neither offense reached 14 in a game the market had at 44.5.","Far closer than the 29-13 Super Bowl. All five NFL.com pickers had Seattle but every projected score was too high."],
  ["<strong>The defense is the identity and it held.</strong> Allowed 292 points in 2025, fewest in the league, and best SRS in football at 12.8. Mike Macdonald is widely rated a top-tier coach.",
   "<strong>Jaxon Smith-Njigba</strong> is the reigning Offensive Player of the Year off 119 catches and a league-leading 1,793 yards, and signed a record extension. The passing game returns intact.",
   "<strong>Who has to step up:</strong> the rebuilt secondary. With Coby Bryant and Riq Woolen gone and Ty Okada out, holding an A.J. Brown debut to a 10-point game is the answer they needed."],
  ["<strong>The backfield is a genuine unknown.</strong> Walker signed with Kansas City and Charbonnet is on PUP, so Jadarian Price and George Holani carry it.",
   "<strong>Losing OC Klint Kubiak</strong> is rated the most damaging departure of any offseason. The replacement is unproven and 13 points is not reassuring.",
   "<strong>Depth behind the starters</strong> is thinner than the title roster. Terrion Arnold, acquired from Detroit, is on the commissioner exempt list and unavailable."]),

NE: TM("0-1, but a far better showing than February",
  ["Lost 13-10 at Seattle. Held the champions to 13 in a game the Patriots were 3.5-point underdogs in.","OC Josh McDaniels promised the rematch would be different. Ten points is not a breakout, but the 29-13 blowout did not repeat."],
  ["<strong>The defense travels.</strong> Allowed 320 points in 2025, sixth fewest, and just held a Super Bowl offense to 13 on the road. Christian Gonzalez and Milton Williams anchor it.",
   "<strong>Drake Maye has a real No. 1 now</strong> in A.J. Brown, plus Romeo Doubs and the tight end room. First-round tackle Caleb Lomu was drafted to fix the protection Seattle exposed in February.",
   "<strong>Continuity</strong> on both coordinator staffs in year two under Mike Vrabel, which is an underrated September edge."],
  ["<strong>The offense did not convert the new weapons.</strong> Ten points is a small sample against a hard matchup, but it is the concern the market already had.",
   "<strong>Schedule regression is coming.</strong> 14-3 came against one of the softest slates, and 2026 projects sixth hardest. SRS of 5.5 says this was an 11-win team.",
   "<strong>Who has to step up:</strong> the backfield. Rookie TreVeyon Henderson has an ankle issue, leaving Rhamondre Stevenson and recent pickup Corey Kiner."]),

SF: TM("1-0 after dominating the Super Bowl favorite",
  ["Beat the Rams 27-7 in Melbourne in front of 100,021. Purdy threw three touchdowns, San Francisco ran for 174 yards.","Renardo Green intercepted Stafford and the defense held the reigning MVP to 4 of 11 in the first half. Purdy, Warner, and Bosa took Player of the Game honors."],
  ["<strong>The injury cloud cleared in one night.</strong> Purdy, Warner, Bosa, and Kittle all played and all played well after a 2025 that cost them 8 starts, a season, and a season respectively.",
   "<strong>Mike Evans was worth it.</strong> Five catches for 47 in the first half and a touchdown on the opening drive of the third. Deebo Samuel and Demarcus Robinson also scored.",
   "<strong>The run game has two answers.</strong> McCaffrey took 10 carries for 68 and rookie Kaelon Black added 14 for 65 in his debut, which is exactly the workload split Shanahan wants."],
  ["<strong>The skill group is old and fragile.</strong> Evans is 33 and dealt with several minor camp issues. Kittle's snaps are being managed. Ricky Pearsall is on season-ending IR.",
   "<strong>The draft class was widely criticized</strong> as a reach after repeated trade-downs, which matters for the depth behind an aging core.",
   "<strong>Two games against Seattle and the Rams remain,</strong> and the market still had them ninth in win total at 9.5 despite 12 wins last year."]),

LAR: TM("0-1 and the Super Bowl hype took a real hit",
  ["Lost 27-7 to San Francisco in Melbourne. Stafford went 4 of 11 in the first half and did not finish the game, pulled with the team down 20.","Kyren Williams scored the only touchdown. The defense that was rebuilt around Myles Garrett gave up 27 and 174 rushing yards."],
  ["<strong>The roster is still the most complete on paper.</strong> Stafford won MVP with 4,707 yards, the offense scored a league-high 518 points, and SRS of 12.5 was second in the league.",
   "<strong>The defensive line is rated the best position group in football</strong> after adding Myles Garrett, off a record 23 sacks, plus McDuffie and Watson at corner.",
   "<strong>Who has to step up:</strong> Puka Nacua. He is expected to play and was not placed on the exempt list. The offense needs its most productive target to look like it."],
  ["<strong>The travel call backfired.</strong> The Rams landed 28 hours before kickoff while San Francisco came a week early. McVay says that was not the reason, but every analyst disagrees.",
   "<strong>Almost no cheap depth.</strong> Five draft picks, fewest in the league. An injury run would be very hard to absorb, and Aaron Donald did not travel.",
   "<strong>Stafford is 38 and the roster is built to win now.</strong> There is no version of this season where an 0-1 start with a 20-point loss is comfortable."]),

CHI: TM("Opens at Carolina as a 3-point favorite", [],
  ["<strong>Ben Johnson's offense produced 441 points</strong> in year one and Caleb Williams improved visibly, approaching 4,000 yards. Year two in a system usually helps most.",
   "<strong>Safety Dillon Thieneman</strong> at 25 headlines a draft aimed squarely at the secondary, and Carolina opening without both tackles favors Chicago's front.",
   "<strong>They have already beaten Green Bay in January,</strong> which removes a psychological barrier this franchise carried for years."],
  ["<strong>The secondary is gutted before a snap.</strong> Coby Bryant is out four to six months, and Kyler Gordon and Dallis Flowers are on IR.",
   "<strong>The defense lived on takeaways</strong> while allowing the fourth-most yards in the league, which is the least repeatable thing a defense does. This is the central bear case.",
   "<strong>Who has to step up:</strong> rookie center Logan Jones after Dalman's retirement. Rome Odunze has not practiced with a leg injury."]),

CAR: TM("Hosts Chicago without both starting tackles", [],
  ["<strong>The defense got two real difference-makers</strong> in Jaelan Phillips and Devin Lloyd, joining a unit that already had a positive DSRS of 1.4 under Ejiro Evero.",
   "<strong>Tetairoa McMillan</strong> won Offensive Rookie of the Year and is a genuine No. 1 on a rookie contract. Darren Waller signed in August as a red zone option.",
   "<strong>They already won this division once</strong> with a modest roster, and Sharp Football rates them solidly mid-pack when judged apart from the doubts about Bryce Young."],
  ["<strong>Both starting tackles are out at least four games.</strong> Ikem Ekwonu is on reserve PUP and Taylor Moton on reserve NFI. That is severe for a quarterback who struggles under pressure.",
   "<strong>Nic Scourton, the team's co-sack leader last season, tore his ACL</strong> and is out for the year, removing the running mate Phillips was supposed to have.",
   "<strong>Only 311 points scored in 2025,</strong> fewest of any playoff team by a wide margin. Jonathan Brooks has been limited with soreness and Chuba Hubbard is questionable."]),

TB: TM("At Cincinnati in the projected shootout of the week", [],
  ["<strong>Baker Mayfield is healthy.</strong> He played through injury during the seven-of-nine collapse and is expected back at full strength.",
   "<strong>Rueben Bain Jr.</strong> at 15 was the most productive edge rusher in the draft class and fills the defense's clearest need immediately, with Josiah Trotter at 46 behind him.",
   "<strong>Most analysts have them as the best team in the NFC South,</strong> a division won with eight wins two years running."],
  ["<strong>Replacing Mike Evans is unsolved.</strong> Godwin and Egbuka carry it now, and both Egbuka (turf toe) and Jalen McMillan (knee) are working back from injury with growing pains expected.",
   "<strong>Second-half collapses have happened in consecutive seasons</strong> under this staff, which is now a pattern rather than an event.",
   "<strong>Who has to step up:</strong> the secondary. DSRS was negative and it is the thinnest part of the roster, facing the highest total on the board."]),

CIN: TM("Home opener with Burrow back and a funded defense", [],
  ["<strong>Burrow is healthy and the core is intact.</strong> Burrow, Chase, Higgins, and Chase Brown is as consistent a group as the league has. Both Chase (knee) and Higgins (heel) practiced Monday.",
   "<strong>The defensive rebuild finally got funded.</strong> Dexter Lawrence cost the No. 10 pick and Boye Mafe signed from Seattle.",
   "<strong>Third easiest projected schedule in the league,</strong> and the offense still scored 414 points in a season it barely had its quarterback."],
  ["<strong>The offensive line is the unresolved question</strong> and the reason the Burrow injury risk never goes away. He lost nine games in 2025 and a toe injury in Week 2 of the prior season.",
   "<strong>They allowed 492 points last year.</strong> One offseason of spending does not undo a bottom-tier back seven behind the new front.",
   "<strong>Analysts stayed low.</strong> Sharp has them 11th against a 10.5 win total, one of the widest gaps between market and analyst on the board."]),

NO: TM("At Detroit as a 6.5-point underdog", [],
  ["<strong>The Shough splits are striking.</strong> New Orleans went 5-4 in games Tyler Shough started and 1-7 in every other game. He is the unquestioned starter now.",
   "<strong>Second easiest projected schedule in the NFL,</strong> which is a real structural advantage in a weak division.",
   "<strong>Travis Etienne Jr.</strong> signed from Jacksonville and takes a heavy Week 1 workload with Kamara out. Devaughn Vele starts opposite Chris Olave."],
  ["<strong>Alvin Kamara (knee) has not practiced</strong> and is expected to be inactive, and rookie WR Jordyn Tyson, the eighth overall pick, is on IR for at least four games.",
   "<strong>Shough took sacks at an 8.3 percent rate last season.</strong> As 6.5-point underdogs they will be throwing from behind into Aidan Hutchinson.",
   "<strong>The defense has real question marks</strong> the front office largely did not address, and it opens against the NFC's second-highest-scoring offense. Only 306 points scored in 2025."]),

DET: TM("Home opener against the softest matchup on the schedule", [],
  ["<strong>Jahmyr Gibbs is an offensive player of the year candidate</strong> off 1,223 rushing yards, 77 catches, and 18 total touchdowns, and is the consensus top fantasy pick.",
   "<strong>Ford Field is the advantage.</strong> The league's highest-scoring home team in three of the last four seasons, including a 50-point home opener last year.",
   "<strong>Still scored 481 points in a 9-8 season,</strong> second most in the NFC, with a plus 68 differential that says the underlying team was better than the record."],
  ["<strong>The secondary is the biggest camp story in the league.</strong> Brian Branch and Kerby Joseph opened on PUP and Terrion Arnold was traded to Seattle. DSRS was already negative at minus 1.3.",
   "<strong>Who has to step up:</strong> the offensive line, which is the unit most often flagged as the ceiling on this offense, now under new OC Drew Petzing.",
   "<strong>Isiah Pacheco opened on IR</strong> with a back issue after being signed to replace David Montgomery. Jacob Saylors and Sione Vaki back up Gibbs."]),

ATL: TM("At Pittsburgh, now starting Cooper Rush", [],
  ["<strong>The skill trio is genuinely good.</strong> Bijan Robinson, Drake London, and second-team All-Pro Kyle Pitts underperformed their personnel under the previous staff.",
   "<strong>Kevin Stefanski is a two-time Coach of the Year</strong> and one of the more respected hires of the cycle, and he was 6-7 against Pittsburgh while in Cleveland.",
   "<strong>The division has been winnable with eight wins</strong> in each of the last two seasons, so a modest step forward is enough."],
  ["<strong>The quarterback room collapsed in a week.</strong> Tua is out with an oblique, Penix is still on his knee rehab, and Cooper Rush starts.",
   "<strong>The pass rush is gutted.</strong> Jalon Walker is injured and James Pearce Jr. is suspended, so Rodgers should have time. No first-round pick to reinforce with either.",
   "<strong>Who has to step up:</strong> RT Jawaan Taylor, who ESPN predicts will post a pass block win rate under 75 percent against Watt, Highsmith, and Herbig. League average is 90."]),

PIT: TM("Home opener with McCarthy and Rodgers reunited", [],
  ["<strong>The edge trio is the matchup advantage.</strong> T.J. Watt, Alex Highsmith, and Nick Herbig against a Falcons right tackle analysts expect to struggle badly.",
   "<strong>The receiver room was rebuilt around Rodgers</strong> with Michael Pittman Jr. by trade and rookie Germie Bernard, alongside DK Metcalf and Pat Freiermuth.",
   "<strong>First-round tackle Max Iheanachor</strong> addresses a line that has quietly capped this offense for years, and QB Drew Allar at 76 is the succession plan."],
  ["<strong>A plus 10 differential in a 10-win season</strong> is the clearest regression signal on the board, and an SRS of 0.1 is dead average. Analyst rank of 20 sits well below the public perception.",
   "<strong>Rodgers took zero preseason snaps.</strong> Rust is a live variable, and the physical and locker room risk at this stage of his career is obvious.",
   "<strong>Losing Mike Tomlin after 20 seasons</strong> removes the constant that kept this franchise from a losing record every single year."]),

BUF: TM("At Houston, where they have not won since 2006", [],
  ["<strong>The run game is elite.</strong> James Cook led the NFL with 1,621 rushing yards, and the offensive line is described as highly cohesive.",
   "<strong>D.J. Moore</strong> is the first real WR1 Josh Allen has had since 2023, and Allen is the preseason MVP front-runner.",
   "<strong>Joe Brady already ran this offense,</strong> so the coaching change is a front office reshuffle rather than a scheme reset. Buffalo has cleared its win total six straight years."],
  ["<strong>The matchup history is ugly.</strong> Houston has won four of the last five against Allen, both home wins featuring a career-low 30 percent completion game and eight sacks.",
   "<strong>Brady is running a team and calling plays for the first time at any level,</strong> and doing it against Will Anderson Jr. and the league's best defense.",
   "<strong>The secondary is the thinner half of the roster.</strong> C.J. Gardner-Johnson may not play and Terrel Bernard is uncertain."]),

HOU: TM("Hosting Buffalo with the league's best defense", [],
  ["<strong>The defense is the best in football by most rankings.</strong> 295 points allowed in 2025, second fewest in the AFC, with a DSRS of 7.2 that led the conference outright.",
   "<strong>DeMeco Ryans has Allen's number.</strong> Four wins in the last five meetings, all by one possession, both home wins featuring historically bad Allen games.",
   "<strong>The trenches finally got addressed.</strong> Four of the first six picks went to the line, headlined by guard Keylan Rutledge at 26, and David Montgomery arrived as a closing-game back."],
  ["<strong>The receiver room took two hits.</strong> Higgins tore his ACL for the season and Tank Dell is on IR. Kayshon Boutte starts opposite Nico Collins.",
   "<strong>OT Braden Smith is also on IR,</strong> which stresses a line already starting two rookies. Stroud has taken a lot of hits over three seasons.",
   "<strong>Who has to step up:</strong> C.J. Stroud, who needs to make amends for what analysts describe as a dreadful finish to last season."]),

BAL: TM("Minter's debut at Indianapolis", [],
  ["<strong>The bounce-back profile is textbook.</strong> 8-9 with a plus 26 differential and an MVP-caliber quarterback who missed four games. The market gave them the joint highest win total at 11.5.",
   "<strong>Trey Hendrickson</strong> fixes the pass rush that was the clearest 2025 failure, with Jaire Alexander and Tre'Davious White rebuilding the corner room cheaply.",
   "<strong>Minter gets an immediate rematch</strong> with the offense that dropped 38 on his Chargers in Week 7, the most points Los Angeles allowed all season."],
  ["<strong>Eighteen years of Harbaugh walked out the door,</strong> and OC Todd Monken left for the Browns head job. Declan Doyle is calling plays for the first time here.",
   "<strong>Who has to step up:</strong> Lamar Jackson, who did not perform to his usual standard in an injury-plagued 2025. Whether the swagger is back is the most-asked question around the league.",
   "<strong>The market has priced in the bounce-back completely.</strong> An 11.5 win total for a first-year head coach leaves no room for anything to go wrong."]),

IND: TM("Home opener with Daniel Jones back from an Achilles tear", [],
  ["<strong>The offense scored 466 points,</strong> fourth most in the AFC, with an OSRS of 5.9 that says the seven-game collapse was about availability rather than scheme.",
   "<strong>Sauce Gardner is a true shutdown corner</strong> and changes what the defense can call. He cost two first-round picks.",
   "<strong>A 7.5 win total</strong> leaves a healthy season plenty of room to clear, and they held the AFC's top seed as recently as Week 8 last year."],
  ["<strong>Everything rides on Jones,</strong> playing his first game since tearing his Achilles in December against a Minter defense motivated by their Week 7 meeting.",
   "<strong>The receiver room thinned out.</strong> Michael Pittman Jr. was traded to Pittsburgh and Alec Pierce (ankle) missed most of the offseason, leaving Josh Downs.",
   "<strong>The defense added little.</strong> DSRS was negative, the front seven still has holes, and nobody in the building has a clean slate after losing seven straight."]),

CLE: TM("At Jacksonville as an 8.5-point underdog", [],
  ["<strong>The line rebuild was the most defensible move any bad team made.</strong> Zion Johnson near $50 million and tackle Spencer Fano at No. 9.",
   "<strong>Jared Verse came back in the Garrett trade</strong> and joins 2025 Defensive Rookie of the Year Carson Schwesinger as the two pieces to build around.",
   "<strong>Easiest projected schedule in the NFL,</strong> which should keep more games competitive than the roster deserves."],
  ["<strong>There is no credible starting quarterback.</strong> Watson starts despite being outplayed by Shedeur Sanders in the preseason.",
   "<strong>Losing Myles Garrett and DC Jim Schwartz in one offseason</strong> strips the defense of its best player and its architect. Rookie DC Mike Rutenberg calls it now.",
   "<strong>Who has to step up:</strong> rookies KC Concepcion and Denzel Boston, who have to master an NFL learning curve immediately. Quinshon Judkins is back from a season-ending injury."]),

JAX: TM("Home opener as the second-biggest favorite of the week", [],
  ["<strong>Trevor Lawrence found his stride under Liam Coen</strong> and enters year two in the system with what the panel calls a loaded pass-catching group.",
   "<strong>Jakobi Meyers was extended</strong> for three years and $60 million and named a captain, with Brian Thomas Jr. back and Travis Hunter alongside them.",
   "<strong>The defense has playmakers at every level,</strong> and SRS of 8.7 was the best in the division and third in the conference."],
  ["<strong>Turnover luck is the central bear case.</strong> A large share of the 13-win jump came from a takeaway rate that rarely repeats, which is why the win total dropped four full games to 8.5.",
   "<strong>Two starters left with no obvious replacement.</strong> Travis Etienne Jr. went to New Orleans and Devin Lloyd to Carolina.",
   "<strong>Who has to step up:</strong> Bhayshul Tuten, inheriting the third-down role with LeQuint Allen Jr. unlikely to play."]),

NYJ: TM("At Tennessee, with Geno Smith debuting", [],
  ["<strong>The line is sturdy and the weapons finally go two deep,</strong> the best equipped this offense has been in years. The starters looked sharp in limited preseason work.",
   "<strong>David Bailey</strong>, the No. 2 overall pick, has been the most talked-about rookie pass rusher of camp, joining Minkah Fitzpatrick on a rebuilt defense.",
   "<strong>Sharp Football moved them up two spots</strong> out of camp on the strength of the defensive additions."],
  ["<strong>Depth is thin nearly everywhere.</strong> One injury at quarterback puts them right back where they were at 3-14.",
   "<strong>Trading Sauce Gardner</strong> returned two first-round picks but stripped the one elite player on the defense.",
   "<strong>Aaron Glenn is coaching for his job</strong> after a three-win first season, which tends to shorten the leash on developmental decisions."]),

TEN: TM("Home opener under Saleh and Daboll", [],
  ["<strong>Cam Ward finally has weapons.</strong> Carnell Tate went fourth overall and Wan'Dale Robinson signed for four years and $78 million, reuniting with Daboll.",
   "<strong>The front is stacked with motivation.</strong> Ex-Jets Jermaine Johnson II and John Franklin-Myers line up alongside Jeffery Simmons against their old team.",
   "<strong>The draft class was one of the most praised in the league.</strong> Keldric Faulk at 31 and Anthony Hill Jr. at 60 both project as immediate starters."],
  ["<strong>Ward's first unit struggled this preseason</strong> while the Jets starters looked sharp, and he is learning a new system with a new play caller in the building he struggled in.",
   "<strong>Cornerback spending was the most criticized of any offseason.</strong> ESPN graded both Alontae Taylor and Cor'Dale Flott below average last season.",
   "<strong>Still a bottom-five roster in most evaluations.</strong> Two good hires do not close a 194-point gap in one year, and four games against Houston and Jacksonville is a hard floor."]),

MIA: TM("At Las Vegas to open a full teardown", [],
  ["<strong>Jeff Hafley ran a top ten defense in Green Bay twice</strong> and now builds one to his own spec. The defensive additions were the better-regarded half of the offseason.",
   "<strong>De'Von Achane</strong> carries the offense and is in position for another heavy workload, behind first-round tackle Kadyn Proctor.",
   "<strong>Thirteen picks and a clean long-term cap sheet</strong> is exactly where a rebuild wants to be, with 2027 draft position the real prize."],
  ["<strong>The receiver room is widely rated the weakest in the league,</strong> which makes evaluating Malik Willis close to impossible in the season meant to answer that question.",
   "<strong>$181.6 million in dead cap</strong> left only $120 million for the rest of the roster, which is how you end up with 12 rookies.",
   "<strong>The coach has said outright</strong> that success in 2026 will not be defined by wins. Second hardest projected schedule in the league."]),

LV: TM("Hosting Miami in Kubiak's debut", [],
  ["<strong>The offense should clear a very low bar.</strong> Las Vegas scored a league-low 14.2 points per game in 2025, and Kirk Cousins is steady quarterbacking by comparison.",
   "<strong>Maxx Crosby is back</strong> and the defense will force Willis to beat them through the air, which is the hardest ask on Miami's roster.",
   "<strong>The line rebuild around Tyler Linderbaum</strong> was aggressive, and Fernando Mendoza at No. 1 overall does not have to be rushed with Cousins ahead of him."],
  ["<strong>Brock Bowers had a meniscus trim Tuesday</strong> and is out a game or two, which removes the best receiving threat on the roster.",
   "<strong>Ashton Jeanty's ankle</strong> is expected to hold, but rookie Mike Washington carved out a preseason role and could eat into the workload.",
   "<strong>The division is the strongest in football.</strong> Even a much better team can finish 5-11 here, and the win total dropped a full game to 5.5 during preseason."]),

DEN: TM("Monday night at Arrowhead", [],
  ["<strong>The defense returns essentially intact,</strong> allowing 311 points in 2025 with a DSRS of 3.5 and no reliance on expiring contracts.",
   "<strong>Jaylen Waddle</strong> cost first, third, and fourth round picks and gives Bo Nix a separator on the outside for the first time.",
   "<strong>They own the division right now,</strong> and last year's trends of outsized Denver success and Chiefs woes in one-score games favor them."],
  ["<strong>Eleven one-score wins tied an NFL record,</strong> the loudest regression signal in the league. SRS of 3.5 is a good team, not a 14-win team.",
   "<strong>Who has to step up:</strong> Bo Nix. Analysts remain unconvinced he is good enough to lead a Super Bowl team, and the run game is a question for a team that wins close.",
   "<strong>OLB Jonathan Cooper</strong> was placed on the commissioner exempt list and is unavailable."]),

KC: TM("Mahomes' first game since the ACL tear", [],
  ["<strong>A 1-9 mark in one-score games with a positive differential</strong> is close to pure variance. The market priced a full rebound at 10.5 wins.",
   "<strong>Kenneth Walker III</strong>, the Super Bowl LX MVP, fixes a run game that had been missing for seasons, and a run-heavy script early suits Mahomes' return.",
   "<strong>The defense was strong even in a six-win year.</strong> DSRS of 3.8 and only 328 points allowed, now with first-round rookies Mansoor Delane and Peter Woods."],
  ["<strong>Mahomes has not been cleared</strong> and took no preseason snaps. An ACL return at 31 is not guaranteed to look the same, least of all for a game built on escapability.",
   "<strong>Two of the best players at their positions are gone.</strong> Trent McDuffie and Joe Thuney were traded, and Josh Simmons is not expected to start at tackle.",
   "<strong>The sharpest critique this year</strong> is that the roster is no longer elite and Mahomes has been carrying it. This is the game that tests it."]),

PHI: TM("Home divisional opener in the post A.J. Brown era", [],
  ["<strong>The defense may be the best in the NFC.</strong> The Carter and Davis interior, two athletic linebackers in Baun and Campbell, and first-team All-Pro corners in Mitchell and DeJean.",
   "<strong>The bar for the offense is low.</strong> It scored only 379 points last year with Brown on the roster, so replacing him by committee does not require much.",
   "<strong>Nick Sirianni is 5-0 in Week 1</strong> and this is the NFC East's first repeat winner in 21 years."],
  ["<strong>Losing an alpha receiver rarely improves an offense.</strong> Hurts loses his most reliable contested-catch target, and new play caller Sean Mannion is an unknown.",
   "<strong>The edge group has question marks</strong> and Jonathan Greenard has been dealing with a pec injury.",
   "<strong>The late-season fade is a pattern.</strong> They started 8-2 and lost five of eight, which has now ended two consecutive seasons."]),

WAS: TM("At Philadelphia without their left tackle", [],
  ["<strong>Daniels healthy is the whole difference.</strong> The 2024 version of this core reached the NFC Championship Game. He missed seven games in 2025 and the team went 2-5 without him.",
   "<strong>Stefon Diggs</strong> gives the offense a real two-receiver structure alongside Terry McLaurin.",
   "<strong>LB Sonny Styles</strong> went seventh overall on a fully guaranteed deal and projects as an immediate three-down starter in an aggressively rebuilt defense."],
  ["<strong>Laremy Tunsil tore a triceps on August 8</strong> and is likely out a significant portion of the season, against exactly the front that punishes it most.",
   "<strong>The defense allowed the most yards in the league</strong> in 2025, and the consensus is that a rebuild this large is not a quick fix.",
   "<strong>Daniels' injury history is now two seasons long,</strong> and his running style is central both to the offense and to the risk."]),

DAL: TM("Sunday night at MetLife with a rebuilt defense", [],
  ["<strong>The largest defensive talent injection of any team.</strong> Downs at 11, Lawrence at 23, Rashan Gary and Quinnen Williams by trade, under new DC Christian Parker.",
   "<strong>The offense never needed fixing.</strong> 471 points at 27.7 per game, fifth most in football, with Lamb and Pickens as one of the best receiver duos in the league.",
   "<strong>They own this rivalry,</strong> winning 16 of the last 18 meetings going back to 2017. Sharp moved them up four spots out of camp."],
  ["<strong>Pro Bowl LG Tyler Smith needs thumb surgery</strong> and misses 4 to 6 weeks, throwing TJ Bass into the fire against one of the league's scariest pass rushes.",
   "<strong>They ranked dead last in scoring defense and 30th in yards</strong> in 2025. Rebuilding that in one offseason with two rookies starting is a lot to ask.",
   "<strong>Brian Schottenheimer is unproven</strong> and the 7-9-1 came against a soft schedule."]),

NYG: TM("Harbaugh's first game, in prime time", [],
  ["<strong>John Harbaugh is the most accomplished hire of the cycle</strong> and inherits a young roster rather than an old one, with Dart, Skattebo, and Nabers as the core.",
   "<strong>The pass rush is scary on paper</strong> and just added Arvell Reese at No. 5. Francis Mauigoa at 10 projects as an immediate starter.",
   "<strong>Almost everything changed.</strong> Skattebo is healthy, Nabers may return, and Odell Beckham is back. Thirteen wins over three seasons means the bar for improvement is very low."],
  ["<strong>Malik Nabers is coming off a torn ACL</strong> from Week 4 last season and practice participation this week decides whether he plays. Depth behind him is thin.",
   "<strong>Trading Dexter Lawrence left a hole</strong> and the defensive line remains the roster's weak spot.",
   "<strong>Jaxson Dart is unproven</strong> and Matt Nagy's record as a coordinator is mixed."]),

GB: TM("At Minnesota without Parsons or Jacobs", [],
  ["<strong>Jordan Love is the sixth most efficient quarterback</strong> in EPA per dropback over the last three seasons, which is the entire case for a top-five ranking.",
   "<strong>The 2025 team had a positive point differential</strong> and lost close games late, a profile that usually improves.",
   "<strong>The draft targeted the secondary</strong> that broke down in the playoff loss, with Brandon Cisse at 52 and Domani Jackson at 201."],
  ["<strong>Micah Parsons is unavailable for four games</strong> and Josh Jacobs is on the commissioner exempt list with no timeline.",
   "<strong>The backfield is MarShawn Lloyd, Kaleb Johnson, and Chris Brooks,</strong> only one of whom has more than 100 career rushing yards. Flores can plan for a heavy dose of Love's arm.",
   "<strong>They have cleared 9.5 wins twice in five seasons</strong> despite August rankings like this one, and an NFLPA report card showed the largest single-season ratings decline on record."]),

MIN: TM("Home opener with Kyler Murray starting", [],
  ["<strong>Brian Flores signed an extension</strong> and his defense allowed 333 points with a DSRS of 4.2, among the best in the conference. Green Bay arrives without Parsons or Jacobs.",
   "<strong>Murray at the veteran minimum</strong> is one of the best value signings of the offseason, and Sharp is explicitly higher on Minnesota with him starting than with McCarthy.",
   "<strong>Justin Jefferson remains the best receiver in football,</strong> which raises the floor of any quarterback situation."],
  ["<strong>The front will look very different.</strong> Jonathan Greenard and Harrison Phillips were both traded, with rookies including Caleb Banks at 18 replacing them.",
   "<strong>They scored only 344 points last year,</strong> third fewest among winning teams, with an OSRS of minus 3.4.",
   "<strong>Both Murray and McCarthy carry durability histories,</strong> and a competition settled this close to Week 1 is rarely a sign of confidence in either."]),

LAC: TM("Home opener with both All-Pro tackles back", [],
  ["<strong>Joe Alt and Rashawn Slater are both back,</strong> which is functionally a major free agency haul that cost nothing after an 11-win season without them.",
   "<strong>Mike McDaniel is calling plays.</strong> The summer glimpses of Herbert in his offense were described as straight gas, and Herbert is a common top-three MVP pick.",
   "<strong>Sharp Football has them fifth,</strong> well above a 9.5 win total, and calls the number soft. Added Odafe Oweh, Akheem Mesidor, Dalvin Tomlinson, and Charlie Kolar."],
  ["<strong>Center Tyler Biadasz is out for an extended stretch,</strong> so rookie Jake Slaughter makes his first career start in the middle of the line that was supposed to be the offseason's big fix.",
   "<strong>Slater had a knee flare-up in August</strong> that cost more than a week of practice. Health is the entire thesis for this season.",
   "<strong>A plus 28 differential in an 11-win season</strong> says they were closer to average than the record, and losing DC Jesse Minter is still a change."]),

ARI: TM("At the Chargers as the biggest underdog of the week", [],
  ["<strong>Mike LaFleur comes from the best offensive staff in football</strong> and knows the NFC West intimately from stints with both the Rams and 49ers.",
   "<strong>Jacoby Brissett steadied it late.</strong> 3,366 yards and 23 touchdowns over the final 12 games of 2025, with Trey McBride and Michael Wilson, who was extended in preseason.",
   "<strong>They play well from behind,</strong> which they did all last season and which the panel expects again here."],
  ["<strong>The defense allowed 488 points</strong> and was not meaningfully addressed. It remains the major problem and the main reason for the lowest win total in the league at 3.5.",
   "<strong>Rookie guard Chase Bisontis is out most or all of the season</strong> with an MCL injury, forcing Isaiah Adams into a line that ranked 26th last year.",
   "<strong>Jeremiyah Love, the third overall pick, missed four weeks</strong> with an ankle injury and is listed behind Tyler Allgeier. Fourth hardest projected schedule."])
};


/* ---------- per-team matchup preview: the game from that team's angle ---------- */
const MU = {
SEA:["<strong>Beat New England 13-10</strong> at Lumen Field in the Wednesday opener, a far tighter game than the 29-13 Super Bowl.","The matchup they had to win was their front against a Patriots line they shredded in February. They did, but only just.","Neither offense reached 14 in a game the market set at 44.5. The defense carried it, which is the identity."],
NE:["<strong>Lost 13-10 at Seattle</strong> as 3.5-point underdogs, holding the champions to 13 on the road.","OC Josh McDaniels promised the rematch would be different. It was, though 10 points is not a breakout for the new-look offense.","A.J. Brown's debut came against a rebuilt Seattle secondary that was supposed to be the soft spot. It did not break open."],
SF:["<strong>Beat the Rams 27-7</strong> in Melbourne in front of 100,021, the seventh-largest regular season crowd in NFL history.","The winning factor was preparation. They flew in a week early to acclimate while the Rams landed 28 hours before kickoff.","Purdy threw three touchdowns to three receivers, Renardo Green picked off Stafford, and they ran for 174 yards."],
LAR:["<strong>Lost 27-7 to San Francisco</strong> in Melbourne, the Super Bowl favorite losing by 20 in the opener.","Stafford went 4 of 11 in the first half and did not finish the game, pulled while down 20. Kyren Williams scored the only touchdown.","The travel call is the story. McVay says arriving 28 hours out was not the reason, but nearly every analyst disagrees."],
CHI:["<strong>At Carolina as a 3-point favorite.</strong> The NFL.com panel split 3-2 for Chicago with every projected score inside four points.","The matchup that decides it: Ben Johnson's offense against an Evero defense that spent big on Jaelan Phillips and Devin Lloyd.","The edge is Carolina's tackles. Both starters are out and co-sack leader Nic Scourton tore his ACL, so the pass rush is down a man."],
CAR:["<strong>Home against Chicago,</strong> a 3-point underdog in a game two of five NFL.com pickers took them to win outright.","The path is disruption. If Evero's rebuilt front never lets Caleb Williams settle, this swings home.","The counter-argument is Chicago's defense allowed the fourth-most yards in the league and lived on takeaways, which rarely repeats."],
TB:["<strong>At Cincinnati</strong> in the projected shootout of the week, a 50.5 total and the highest on the board.","The matchup is Tampa's thin secondary against Burrow, Chase, Higgins, and Chase Brown. That is the hardest draw available.","One of five NFL.com pickers took Tampa. The case is that Rueben Bain gives the pass rush a real answer immediately."],
CIN:["<strong>Home against Tampa Bay,</strong> favored by 3.5 with four of five pickers on Cincinnati.","Burrow's first regular season game since the injury that cost him nine starts, behind a line that is still the unresolved question.","The winning factor is whether the rebuilt front around Dexter Lawrence buys enough of a buffer. Analysts think it just barely does."],
NO:["<strong>At Detroit as a 6.5-point underdog.</strong> All five NFL.com pickers took the Lions by an average of 12.","The one path: Tyler Shough against a Detroit secondary missing both starting safeties, with Terrion Arnold traded away.","Working against it, Shough took sacks at an 8.3 percent rate last season and will be throwing from behind into Aidan Hutchinson."],
DET:["<strong>Home against New Orleans,</strong> the softest matchup on the early schedule and a unanimous panel pick.","Ford Field is the edge. Detroit has been the league's highest-scoring home team in three of the last four seasons.","The winning factor is the offensive line against a New Orleans front analysts describe as underwhelming. New OC Drew Petzing debuts."],
ATL:["<strong>At Pittsburgh, now starting Cooper Rush</strong> after Tua Tagovailoa was ruled out Friday with an oblique.","The matchup to survive: RT Jawaan Taylor against Watt, Highsmith, and Herbig. ESPN predicts Taylor grades under a 75 percent pass block win rate against a 90 percent average.","Unanimous against them. Stefanski was 6-7 versus Pittsburgh in Cleveland, which is the most encouraging number available."],
PIT:["<strong>Home against Atlanta,</strong> favored by 3.5 with all five NFL.com pickers on Pittsburgh.","McCarthy and Rodgers reunite in Rodgers' first game, and he took zero preseason snaps. Rust is the live variable.","The edge is stark: Atlanta's pass rush is missing Jalon Walker to injury and James Pearce Jr. to suspension, so Rodgers should have time."],
BUF:["<strong>At Houston,</strong> a 1.5-point favorite in a game four of five pickers took the home underdog.","The history is ugly. Houston has won four of the last five against Allen's Bills, holding him to a career-low 30 percent completions in 2024 and eight sacks in 2025, both in Houston.","Joe Brady runs a team and calls plays for the first time at any level, against Will Anderson Jr. and the best defense in football."],
HOU:["<strong>Home against Buffalo</strong> as a 1.5-point underdog that most of the NFL.com panel picked to win anyway.","The matchup is the whole game: the league's best defense against the preseason MVP favorite. DeMeco Ryans has owned this before.","Their counter to Cook and D.J. Moore is a front that produced a DSRS of 7.2, best in the conference outright."],
BAL:["<strong>At Indianapolis,</strong> favored by 3.5 in Jesse Minter's head coaching debut.","Minter gets an immediate rematch with the offense that hung 38 on his Chargers in Week 7, the most Los Angeles allowed all season.","The question the league is asking: does Lamar Jackson have his swagger back under new OC Declan Doyle after an injury-plagued 2025?"],
IND:["<strong>Home against Baltimore</strong> as a 3.5-point underdog, with one of five pickers taking the Colts.","Daniel Jones plays his first game since tearing his Achilles in December. Rust is expected and priced in.","The edge is Sauce Gardner against a Ravens receiving group, and a Baltimore staff installing a brand new offense."],
CLE:["<strong>At Jacksonville as an 8.5-point underdog,</strong> the second-biggest spread of the week and a unanimous panel pick against.","There is no obvious path. Deshaun Watson starts despite being outplayed by Shedeur Sanders in the preseason.","The receiver room depends on rookies KC Concepcion and Denzel Boston against a defense with playmakers at every level."],
JAX:["<strong>Home against Cleveland,</strong> favored by 8.5 with the lowest total on the board at 40.5.","Trevor Lawrence enters year two in Coen's system with a loaded pass-catching group against a Browns defense without Myles Garrett.","The only real risk is the one that follows them all season: a 13-win jump built partly on takeaway luck that rarely repeats."],
NYJ:["<strong>At Tennessee as a 1.5-point underdog,</strong> and every NFL.com picker took the Jets anyway.","Geno Smith and the starters flourished in limited preseason action while Cam Ward's first unit struggled. That is the case.","The trap is the Titans front: ex-Jets Jermaine Johnson II and John Franklin-Myers alongside Jeffery Simmons, all motivated."],
TEN:["<strong>Home against the Jets,</strong> favored by 1.5 in the lowest-total game of the week at 38.5.","Robert Saleh's first game as a head coach comes against the team that fired him, with Aaron Glenn on the other sideline.","Neither of these teams has won a Week 1 game since 2021 outside the Rodgers four-snap opener. A win here is rare and worth a lot."],
MIA:["<strong>At Las Vegas,</strong> a 3.5-point underdog in one of only six games in 30 seasons with both head coaches making their NFL debut.","Several outlets call this Miami's best chance at a win all season, and most still have them losing by at least a touchdown.","The matchup to survive is Maxx Crosby against a line protecting Malik Willis in his first year as a full-time starter."],
LV:["<strong>Home against Miami,</strong> favored by 3.5, and the home coach has won three of the previous five debut-versus-debut meetings.","The plan is simple: make Willis beat them through the air, which is the hardest ask on Miami's roster.","Working against it, Brock Bowers had a meniscus trim Tuesday and is out a game or two, removing the best receiving threat on the roster."],
WAS:["<strong>At Philadelphia as a 5.5-point underdog,</strong> a unanimous panel pick against and Sirianni is 5-0 in Week 1.","The matchup is brutal: a Tunsil-less line against the Carter and Davis interior, which analysts call a recipe for disaster.","Philadelphia also has the personnel to contain Daniels specifically, with Baun and Campbell to track him and two All-Pro corners to close lanes."],
PHI:["<strong>Home divisional opener,</strong> favored by 5.5 with all five NFL.com pickers on Philadelphia.","The first game of the post A.J. Brown era, with DeVonta Smith as the No. 1 and a new play caller in Sean Mannion.","The edge is the front against a Washington line that lost Laremy Tunsil to a torn triceps on August 8."],
ARI:["<strong>At the Chargers as a 9.5-point underdog,</strong> the biggest spread on the board and projected as the most lopsided result outside Jacksonville.","Mike LaFleur's first game as a head coach comes in the building where he spent three years as the Rams' coordinator.","The realistic shape: a big Chargers halftime lead that narrows as Brissett, McBride, and Wilson play well from behind, which they did all last season."],
LAC:["<strong>Home against Arizona,</strong> favored by 9.5 and unanimously picked in what should be the cleanest win of the week.","Joe Alt and Rashawn Slater are both back, and this is Mike McDaniel's first game calling plays here.","The one soft spot: rookie center Jake Slaughter makes his first career start against Walter Nolen and Josh Sweat, with Biadasz out."],
GB:["<strong>At Minnesota as a 1.5-point underdog,</strong> the closest line among divisional games.","This is about what Green Bay lost. Micah Parsons is out four games and Josh Jacobs is on the commissioner exempt list.","A backfield of Lloyd, Kaleb Johnson, and Chris Brooks means Flores can plan for a heavy dose of Love's arm and scheme accordingly."],
MIN:["<strong>Home against Green Bay,</strong> favored by 1.5 with four of five pickers on Minnesota.","Kyler Murray's debut under Kevin O'Connell in a full U.S. Bank Stadium. Sharp is explicitly higher on Minnesota with him starting.","The edge is Flores against a Packers run game with one back who has more than 100 career rushing yards."],
DAL:["<strong>At the Giants on Sunday night,</strong> favored by 2.5 in the 128th meeting of a rivalry Dallas has won 16 of the last 18 times since 2017.","Two overhauled defenses. Dallas rebuilt from dead last in scoring defense with Downs, Lawrence, Gary, and Williams under new DC Christian Parker.","The complication arrived this week: Pro Bowl LG Tyler Smith needs thumb surgery and misses 4 to 6 weeks against a scary Giants front."],
NYG:["<strong>Home on Sunday night as a 2.5-point underdog,</strong> with one of five pickers calling it Big Blue's Super Bowl.","Harbaugh's first game. Skattebo is healthy, Nabers may return, Beckham is back, and Arvell Reese joins an already scary pass rush.","The opening: Dallas lost LG Tyler Smith to thumb surgery, throwing TJ Bass into the fire against that rush."],
DEN:["<strong>At Kansas City on Monday night,</strong> a 2.5-point underdog that three of five NFL.com pickers took to win outright.","The whole week points here: is Mahomes all the way back? He has not formally been cleared and took no preseason snaps.","The matchup is Denver's intact defense, 311 points allowed last year, against a Chiefs line that will not have Josh Simmons at tackle."],
KC:["<strong>Home on Monday night,</strong> favored by 2.5 in Mahomes' first game since tearing his ACL and LCL in December.","Expect a run-heavy script early behind Kenneth Walker III to ease him back in, in a game with a 43.5 total.","The regression argument cuts both ways. Denver won eleven one-score games last year and Kansas City lost nine, and both numbers should move toward the middle."]
};

Object.keys(WEEK1.teams).forEach(ab => { WEEK1.teams[ab].matchup = MU[ab] || []; });

/* ---------- per-team keys to victory: what this team has to do in this game ---------- */
const KV = {
SEA:["<strong>Win with the front again.</strong> Seattle's pass rush against a New England line it shredded in February was the matchup that decided it, and it did, barely.",
     "<strong>Survive the backfield gap.</strong> With Kenneth Walker III in Kansas City and Zach Charbonnet on PUP, Jadarian Price and George Holani had to carry it, and 13 points was the cost.",
     "<strong>Hold the rebuilt secondary together.</strong> Coby Bryant and Riq Woolen gone, Ty Okada out, Nick Emmanwori questionable, and A.J. Brown's debut still did not break it open."],
NE: ["<strong>Keep it close up front,</strong> which was OC Josh McDaniels' stated goal after the 29-13 Super Bowl. The line held well enough for a 13-10 game.",
     "<strong>Get A.J. Brown loose</strong> against a Seattle secondary that lost Coby Bryant and Riq Woolen. Ten points says the debut did not break open.",
     "<strong>Let the defense travel.</strong> Holding the champions to 13 on the road was the part that worked."],
SF: ["<strong>Arrive early.</strong> The 49ers flew in a week ahead to acclimate while the Rams landed 28 hours before kickoff, and every analyst pointed at it.",
     "<strong>Spread it around.</strong> Purdy threw three touchdowns to three receivers, Mike Evans, Deebo Samuel, and Demarcus Robinson, and the run game added 174 yards with rookie Kaelon Black taking 14 carries for 65.",
     "<strong>Stay healthy.</strong> Purdy, Fred Warner, and Nick Bosa all played and earned Player of the Game honors after a summer of health questions."],
LAR:["<strong>Get Stafford going early.</strong> He completed 4 of 11 in the first half and was pulled down 20, with Renardo Green picking off a deep ball to Nacua.",
     "<strong>Win up front without Aaron Donald,</strong> who did not travel. Myles Garrett played after missing most of camp with knee swelling.",
     "<strong>Handle the trip.</strong> Landing 28 hours before kickoff is the story of the game, whatever McVay says."],
CHI:["<strong>Protect Caleb Williams early.</strong> Drew Dalman retired, rookie Logan Jones snaps to Williams, and Carolina spent big on Jaelan Phillips and Devin Lloyd to disrupt.",
     "<strong>Attack Carolina's tackles.</strong> Both starters are out at least four games and Nic Scourton tore his ACL, so the edges are the soft spot.",
     "<strong>Do not live on takeaways.</strong> Chicago's defense allowed the fourth-most yards in the league in 2025, and takeaway rate is the least stable thing a defense does."],
CAR:["<strong>Disrupt Caleb Williams before he settles.</strong> Evero's rebuilt front is the whole path, and it is down a man with Scourton out for the year.",
     "<strong>Keep Bryce Young clean with backup tackles.</strong> His pressure numbers are the stat to watch.",
     "<strong>Feed Tetairoa McMillan,</strong> the Offensive Rookie of the Year and the one Carolina piece nobody disputes."],
TB: ["<strong>Hold up in the secondary</strong> against Burrow, Chase, Higgins, and Chase Brown. It is the thinnest part of the roster in the projected shootout of the week at 50.5.",
     "<strong>Get Rueben Bain Jr. home.</strong> The 15th pick was the most productive edge rusher in the draft class and faces a Cincinnati line that is still the unresolved question.",
     "<strong>Make the post-Mike Evans passing game work now.</strong> Chris Godwin and Emeka Egbuka carry it, with Egbuka back from turf toe and Jalen McMillan from a knee."],
CIN:["<strong>Buy Burrow a buffer.</strong> The rebuilt front around Dexter Lawrence has to hold, because the offensive line is the unresolved question and the injury risk never goes away.",
     "<strong>Turn the mismatch into points.</strong> Chase and Higgins both practiced Monday, and Tampa Bay's secondary is its thinnest unit.",
     "<strong>Break the early-season pattern.</strong> Cincinnati ended a three-year Week 1 losing streak in 2025, then lost Burrow the following game."],
NO: ["<strong>Throw at the missing safeties.</strong> Brian Branch and Kerby Joseph opened on PUP and Terrion Arnold was traded, so Tyler Shough has one path.",
     "<strong>Stay out of obvious passing downs.</strong> Shough took sacks at an 8.3 percent rate last season, and a 6.5-point underdog playing from behind is what Aidan Hutchinson wants.",
     "<strong>Lean on Travis Etienne Jr.</strong> Alvin Kamara has not practiced and is expected out, and rookie WR Jordyn Tyson is on IR for at least four games."],
DET:["<strong>Win up front.</strong> Detroit's offensive line against an underwhelming New Orleans front is the winning factor, and if it holds the Lions score in bunches.",
     "<strong>Use Ford Field.</strong> Detroit has been the league's highest-scoring home team in three of the last four seasons.",
     "<strong>Cover for the backfield depth.</strong> Isiah Pacheco opened on IR, so Jacob Saylors and Sione Vaki back up Gibbs in OC Drew Petzing's debut."],
ATL:["<strong>Keep Cooper Rush upright.</strong> RT Jawaan Taylor against T.J. Watt, Alex Highsmith, and Nick Herbig is the matchup ESPN projects Taylor loses badly.",
     "<strong>Hand the skill trio the game.</strong> Bijan Robinson, Drake London, and Kyle Pitts are the real thing regardless of who is throwing.",
     "<strong>Pressure Rodgers without Jalon Walker and James Pearce Jr.,</strong> which is the hard part. Stefanski was 6-7 against Pittsburgh in Cleveland."],
PIT:["<strong>Get Rodgers through the rust.</strong> Zero preseason snaps in a game with a 41.5 total means the first quarter matters.",
     "<strong>Let Watt, Highsmith, and Herbig live in Atlanta's backfield</strong> against Jawaan Taylor.",
     "<strong>Prove the differential wrong.</strong> A plus 10 point differential and a 0.1 SRS in a 10-win season is the loudest regression signal in the league."],
BUF:["<strong>Break the Houston pattern.</strong> Ryans held Allen to a career-low 30 percent completions in 2024 and a career-high eight sacks in 2025, both in Houston.",
     "<strong>Lean on James Cook and D.J. Moore.</strong> The reigning rushing champion and a real WR1 are more than Allen had last time these met.",
     "<strong>Survive Joe Brady's first call sheet</strong> against Will Anderson Jr. and the best defense in football. Finding a groove takes time."],
HOU:["<strong>Be the best defense in football again.</strong> 295 points allowed in 2025, second fewest in the AFC, with a DSRS of 7.2 that led the conference.",
     "<strong>Protect C.J. Stroud</strong> with two rookie linemen and Braden Smith on IR. He has taken a lot of hits over three seasons.",
     "<strong>Find targets without Jayden Higgins and Tank Dell.</strong> Kayshon Boutte was traded for to fill the gap, and Buffalo's secondary is its thinner half."],
BAL:["<strong>Show the new offense works.</strong> Lamar Jackson under Declan Doyle, Ben Johnson's former apprentice, against a Colts defense that added little.",
     "<strong>Make Trey Hendrickson matter.</strong> He signed to fix the pass rush that was Baltimore's clearest 2025 failure, against a rusty Daniel Jones.",
     "<strong>Win Minter's rematch.</strong> Indianapolis hung 38 on his Chargers last October, the most Los Angeles allowed all season."],
IND:["<strong>Ease Daniel Jones back.</strong> First game since the December Achilles tear, and rust is priced in.",
     "<strong>Let Sauce Gardner change the call sheet</strong> against a Ravens receiver group installing a brand new offense.",
     "<strong>Score like 2025.</strong> 466 points, fourth most in the AFC, with Alec Pierce expected to play and Michael Pittman Jr. gone to Pittsburgh."],
CLE:["<strong>Give Deshaun Watson a clean pocket</strong> behind Zion Johnson and Spencer Fano. Cleveland scored 279 points last year, second fewest in the league.",
     "<strong>Grow up fast at receiver.</strong> Rookies KC Concepcion and Denzel Boston face a Jacksonville defense with playmakers at every level.",
     "<strong>Rush without Myles Garrett</strong> for the first time in a decade. Jared Verse leads it under rookie DC Mike Rutenberg, with Quinshon Judkins' injury thinning the best remaining unit."],
JAX:["<strong>Keep Trevor Lawrence in rhythm</strong> in year two of Coen's system, with Jakobi Meyers and Brian Thomas Jr. back.",
     "<strong>Win without turnover luck.</strong> A large share of the 13-win jump came from a takeaway rate that rarely repeats, which is why the win total fell to 8.5.",
     "<strong>Cover the backfield gap.</strong> LeQuint Allen Jr. is unlikely to play, so Bhayshul Tuten takes the third-down role."],
NYJ:["<strong>Let the line hold.</strong> The panel calls it sturdy and consistent, and it faces ex-Jets Jermaine Johnson II and John Franklin-Myers alongside Jeffery Simmons.",
     "<strong>Use the new depth.</strong> Omar Cooper Jr. and Kenyon Sadiq joined a receiver group that had nothing.",
     "<strong>Turn David Bailey loose.</strong> The second overall pick was the most talked-about rookie pass rusher of camp, against Cam Ward's struggling first unit."],
TEN:["<strong>Give Cam Ward a clean start.</strong> His first unit struggled in preseason while Geno Smith flourished.",
     "<strong>Make the cornerback spending look smart.</strong> Alontae Taylor and Cor'Dale Flott both graded below average in pre-throw positioning last season.",
     "<strong>Get Carnell Tate and Wan'Dale Robinson involved</strong> in Saleh's first game against the team that fired him."],
MIA:["<strong>Ride De'Von Achane.</strong> The receiver room is rated the weakest in the league, so the offense runs through him.",
     "<strong>Keep Maxx Crosby off Malik Willis.</strong> The line protecting Willis in his first year as a full-time starter is the matchup Las Vegas will attack.",
     "<strong>Take the chance.</strong> Several outlets call this Miami's best shot at a win all season."],
LV: ["<strong>Make Willis beat you through the air,</strong> the hardest ask on Miami's roster.",
     "<strong>Score without Brock Bowers,</strong> out a game or two after a meniscus trim, with Ashton Jeanty's ankle expected to hold up.",
     "<strong>Show the $281.5 million bought an offense.</strong> Tyler Linderbaum anchors a line built to fix 14.2 points per game, with Kirk Cousins holding the reins for now."],
WAS:["<strong>Survive without Laremy Tunsil</strong> against the Jalen Carter and Jordan Davis interior. Analysts call it a recipe for disaster.",
     "<strong>Keep Jayden Daniels healthy and moving.</strong> Washington went 2-5 without him in 2025, and Baun and Campbell are built to track him.",
     "<strong>Prove the defensive rebuild took.</strong> Washington allowed the most yards in the league last year."],
PHI:["<strong>Win inside.</strong> Carter and Davis against a Tunsil-less line is the cleanest edge on the board.",
     "<strong>Contain Daniels.</strong> Two athletic linebackers to track him and two All-Pro corners to close his lanes.",
     "<strong>Make DeVonta Smith the No. 1.</strong> First game post A.J. Brown, with rookie Makai Lemon and Hollywood Brown behind him and Jonathan Greenard nursing a pec."],
ARI:["<strong>Get to rookie center Jake Slaughter.</strong> Walter Nolen and Josh Sweat against a first career start is the one edge Arizona has.",
     "<strong>Protect Brissett with Isaiah Adams in</strong> for Chase Bisontis on a line that ranked 26th last year.",
     "<strong>Play from behind well, again.</strong> Brissett, McBride, and Wilson did it all last season, and the projected shape is a Chargers lead that narrows late."],
LAC:["<strong>Hold up at center.</strong> Slaughter's first start with Biadasz out is the soft spot, with Joe Alt and Rashawn Slater back around him.",
     "<strong>Let Herbert run McDaniel's offense.</strong> The summer glimpses were described as straight gas, and this is McDaniel's first game calling plays here.",
     "<strong>Do not let it get close.</strong> Arizona plays well from behind, and the projected script is a big halftime lead that narrows."],
GB: ["<strong>Let Jordan Love carry it.</strong> Sixth most efficient quarterback by EPA per dropback over three seasons, with no run game to lean on.",
     "<strong>Get something from MarShawn Lloyd, Kaleb Johnson, and Chris Brooks,</strong> only one of whom has more than 100 career rushing yards, with Josh Jacobs on the exempt list.",
     "<strong>Rush without Micah Parsons</strong> for four games against a Kyler Murray debut."],
MIN:["<strong>Let Flores plan for the pass.</strong> With Green Bay's backfield gutted, expect a heavy dose of Love's arm and scheme for it.",
     "<strong>Get Kyler Murray comfortable fast.</strong> Sharp Football is explicitly higher on Minnesota with him starting.",
     "<strong>Score more than 2025.</strong> 344 points and an OSRS of minus 3.4, with Justin Jefferson raising the floor."],
DAL:["<strong>Protect the quarterback without Tyler Smith.</strong> TJ Bass steps in against a Giants front that added Arvell Reese.",
     "<strong>Let Lamb and Pickens win it.</strong> The offense scored 471 points last year and never needed fixing.",
     "<strong>Show the defense is real.</strong> Dead last in scoring defense in 2025, rebuilt with Downs, Lawrence, Gary, and Williams under Christian Parker."],
NYG:["<strong>Attack TJ Bass.</strong> Tyler Smith's thumb surgery opens a lane for a pass rush that was already scary before Reese.",
     "<strong>Get Skattebo and the returning pieces going.</strong> Nabers' practice week decides whether he plays, and Beckham is back.",
     "<strong>Win Harbaugh's first game.</strong> The Giants took Week 18 from Dallas and have changed nearly everything since."],
DEN:["<strong>Make Mahomes prove it.</strong> He has not been formally cleared and took no preseason snaps, and Denver's intact defense allowed 311 points last year.",
     "<strong>Give Bo Nix his separator.</strong> Jaylen Waddle was acquired for first, third, and fourth round picks to be exactly that.",
     "<strong>Win another one-score game.</strong> Eleven of them last year tied an NFL record, and the SRS of 3.5 says the margin is thin."],
KC: ["<strong>Ease Mahomes in.</strong> A run-heavy script early behind Kenneth Walker III suits an ACL return and a 43.5 total.",
     "<strong>Protect without Josh Simmons at tackle and Joe Thuney traded,</strong> against a Denver defense that returns essentially intact.",
     "<strong>Flip the one-score luck.</strong> 1-9 in one-score games with a positive differential is close to pure variance."]
};

Object.keys(WEEK1.teams).forEach(ab => { WEEK1.teams[ab].keys = KV[ab] || []; });


WEEK1.next = {
  label:"Week 2", dates:"Thursday, September 17 to Monday, September 21",
  games:[
    {away:"DET",home:"BUF",day:"Thu Sep 17",time:"8:15 PM ET",kick:"2026-09-18T00:15:00Z",tv:"Prime Video",venue:"Highmark Stadium, Orchard Park"},
    {away:"CAR",home:"ATL",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"FOX",venue:"Mercedes-Benz Stadium, Atlanta"},
    {away:"NO",home:"BAL",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"CBS",venue:"M&T Bank Stadium, Baltimore"},
    {away:"MIN",home:"CHI",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"FOX",venue:"Soldier Field, Chicago"},
    {away:"CIN",home:"HOU",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"CBS",venue:"NRG Stadium, Houston"},
    {away:"PIT",home:"NE",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"CBS",venue:"Gillette Stadium, Foxborough"},
    {away:"GB",home:"NYJ",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"FOX",venue:"MetLife Stadium, East Rutherford"},
    {away:"CLE",home:"TB",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"CBS",venue:"Raymond James Stadium, Tampa"},
    {away:"PHI",home:"TEN",day:"Sun Sep 20",time:"1:00 PM ET",kick:"2026-09-20T17:00:00Z",tv:"FOX",venue:"Nissan Stadium, Nashville"},
    {away:"JAX",home:"DEN",day:"Sun Sep 20",time:"4:05 PM ET",kick:"2026-09-20T20:05:00Z",tv:"CBS",venue:"Empower Field at Mile High, Denver"},
    {away:"LV",home:"LAC",day:"Sun Sep 20",time:"4:05 PM ET",kick:"2026-09-20T20:05:00Z",tv:"CBS",venue:"SoFi Stadium, Inglewood"},
    {away:"SEA",home:"ARI",day:"Sun Sep 20",time:"4:25 PM ET",kick:"2026-09-20T20:25:00Z",tv:"FOX",venue:"State Farm Stadium, Glendale"},
    {away:"WAS",home:"DAL",day:"Sun Sep 20",time:"4:25 PM ET",kick:"2026-09-20T20:25:00Z",tv:"FOX",venue:"AT&T Stadium, Arlington"},
    {away:"MIA",home:"SF",day:"Sun Sep 20",time:"4:25 PM ET",kick:"2026-09-20T20:25:00Z",tv:"FOX",venue:"Levi's Stadium, Santa Clara"},
    {away:"IND",home:"KC",day:"Sun Sep 20",time:"8:20 PM ET",kick:"2026-09-21T00:20:00Z",tv:"NBC",venue:"Arrowhead Stadium, Kansas City"},
    {away:"NYG",home:"LAR",day:"Mon Sep 21",time:"8:15 PM ET",kick:"2026-09-22T00:15:00Z",tv:"ESPN",venue:"SoFi Stadium, Inglewood"}
  ]
};
