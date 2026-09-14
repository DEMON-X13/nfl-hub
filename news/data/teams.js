const TEAMS = [
/* ============================ AFC EAST ============================ */
{
  ab:"NE", name:"New England Patriots", conf:"AFC", div:"AFC East", color:"#002244",
  rec:"14-3", pf:490, pa:320, pd:170, srs:5.5, to:3, wt:10.5, rank:10,
  sub:"Mike Vrabel, year two. Lost Super Bowl LX.",
  facts:[
    "Went 14-3 and reached the Super Bowl in Mike Vrabel's first season, losing to Seattle. It was the joint best record in the league alongside Denver and Seattle.",
    "That run came against one of the softest schedules in the NFL. The 2026 slate is projected sixth hardest, and the SRS of 5.5 sits well below their raw record.",
    "Traded for <strong>A.J. Brown</strong>, giving Drake Maye a genuine outside No. 1 for the first time. Also signed <strong>Romeo Doubs</strong>.",
    "Very active draft. Traded up to No. 28 for Utah tackle <strong>Caleb Lomu</strong>, then took edge <strong>Gabe Jacas</strong> in round two and TE Eli Raridon in round three.",
    "Defensive additions in free agency were quieter but real. Kyle Dugger was moved on to Pittsburgh."
  ],
  up:[
    "Maye now has a true target hierarchy. Brown plus Doubs plus the tight end room is a different tier of weaponry than 2025's group, and Maye is a consensus top five MVP pick.",
    "The offensive line was addressed in the first round rather than patched, which is how contenders usually protect a young franchise passer.",
    "Vrabel's staff has already shown it can win close games and travel well. Continuity on both coordinator staffs is an underrated edge in September.",
    "The AFC East got worse around them. Miami is rebuilding and the Jets are still climbing out."
  ],
  down:[
    "Schedule regression is the single loudest argument. A 14-win team facing a top ten schedule almost always slides, and the market has them at 10.5.",
    "Point differential and SRS both suggest they were closer to an 11-win team than a 14-win team even last year.",
    "Brown arrives with a history of friction when the offense stops feeding him. If the passing game stalls, that becomes a storyline fast.",
    "Super Bowl losers historically carry a hangover, and the roster still has thin spots in the secondary."
  ]
},
{
  ab:"BUF", name:"Buffalo Bills", conf:"AFC", div:"AFC East", color:"#00338D",
  rec:"12-5", pf:481, pa:365, pd:116, srs:4.5, to:1, wt:10.5, rank:2,
  sub:"Joe Brady promoted to head coach. Josh Allen still the engine.",
  facts:[
    "Fired <strong>Sean McDermott</strong> two days after a divisional round overtime loss at Denver, then promoted offensive coordinator <strong>Joe Brady</strong> to head coach.",
    "Lost the AFC East for the first time since 2019 and went 12-5. Fourth divisional round exit in five years.",
    "Traded for <strong>D.J. Moore</strong> from Chicago and signed edge <strong>Bradley Chubb</strong>. James Cook led the NFL in rushing with 1,621 yards.",
    "Traded down repeatedly out of the first round, ending with a deep haul: edge <strong>T.J. Parker</strong> at 35, CB <strong>Davison Igbinosun</strong> at 62, plus five picks in rounds four and five.",
    "Have cleared their posted win total of 10.5 in each of the last six seasons."
  ],
  up:[
    "The receiver room is finally addressed. Buffalo had not had a 900-yard pass catcher since 2023, and Moore gives Allen a real separator.",
    "Brady already runs the offense Allen is comfortable in, so the coaching change is a front office reshuffle more than a scheme reset.",
    "The Day 2 defensive haul plus Chubb fills the exact holes that free agency exposed. Analysts who expected a defensive drop-off have largely moved off it.",
    "Allen remains the most common MVP pick in the league and the run game behind Cook is elite."
  ],
  down:[
    "First-time head coach, first time hiring a staff, first time managing a locker room with championship-or-bust expectations. That is a lot of firsts.",
    "The McDermott exit was public and messy. Culture questions linger until the team wins something in January.",
    "Moore's receiving yardage has declined two years running, so this is a bet on fit rather than on production.",
    "Safety C.J. Gardner-Johnson strained a calf in early August and is now dealing with a second injury. GM Brandon Beane has said he may not be available for Week 1. Linebacker Terrel Bernard is also uncertain with an undisclosed injury."
  ]
},
{
  ab:"NYJ", name:"New York Jets", conf:"AFC", div:"AFC East", color:"#125740",
  rec:"3-14", pf:300, pa:503, pd:-203, srs:-12.5, to:-19, wt:5.5, rank:25,
  sub:"Aaron Glenn survives a 3-win year. Geno Smith arrives.",
  facts:[
    "Year one under <strong>Aaron Glenn</strong> produced three wins and the league's worst point differential outside Las Vegas. Ownership kept him anyway.",
    "Signed <strong>Geno Smith</strong> from Las Vegas and traded for safety <strong>Minkah Fitzpatrick</strong>, then handed him a three year, $40 million extension.",
    "Had already dealt <strong>Sauce Gardner</strong> to Indianapolis mid-2025 for two first-round picks and <strong>Quinnen Williams</strong> to Dallas, which is why they held three first-rounders in April.",
    "Drafted edge <strong>David Bailey</strong> at No. 2, TE <strong>Kenyon Sadiq</strong> at 16, and WR <strong>Omar Cooper Jr.</strong> at 30, plus CB D'Angelo Ponds and QB Cade Klubnik on Day 3.",
    "Also added kicker Younghoe Koo and rebuilt much of the defensive front seven through free agency."
  ],
  up:[
    "This is a genuinely better football team than the one that won three games. Sharp Football moved them up two spots coming out of camp on the strength of the defensive additions.",
    "Bailey has been the most talked about rookie pass rusher of camp, and pairing him with Fitzpatrick gives the defense two real building blocks.",
    "Smith is a functional NFL starter with a competent floor, which is a large upgrade over what the Jets ran out last year.",
    "Cooper and Sadiq give the offense two young pass catchers who can grow with the roster rather than rent it."
  ],
  down:[
    "The roster is still short on proven depth almost everywhere, and one injury at quarterback puts them right back where they were.",
    "Trading Gardner returned draft capital but stripped the one truly elite player on the defense.",
    "Glenn is coaching for his job in year two, which tends to shorten the leash on developmental decisions.",
    "Even most optimistic projections top out around seven wins. The ceiling here is respectability, not contention."
  ]
},
{
  ab:"MIA", name:"Miami Dolphins", conf:"AFC", div:"AFC East", color:"#008E97",
  rec:"7-10", pf:347, pa:424, pd:-77, srs:-6.3, to:-4, wt:4.5, rank:32,
  sub:"Jeff Hafley inherits a teardown. Malik Willis under center.",
  facts:[
    "Fired <strong>Mike McDaniel</strong> and hired former Packers defensive coordinator <strong>Jeff Hafley</strong>, with new GM Jon-Eric Sullivan.",
    "Sold aggressively. <strong>Tua Tagovailoa</strong> left for Atlanta, <strong>Jaylen Waddle</strong> was traded to Denver, <strong>Minkah Fitzpatrick</strong> went to the Jets, and <strong>Tyreek Hill</strong> and <strong>Bradley Chubb</strong> were released.",
    "Signed <strong>Malik Willis</strong> to start. Jaelan Phillips had already been dealt to Carolina in November.",
    "Held a league-high 13 draft picks. Took tackle <strong>Kadyn Proctor</strong> at 12, CB Chris Johnson at 27, LB Jacob Rodriguez at 43, and receivers Caleb Douglas and Chris Bell on Day 2.",
    "Ranked last or near-last in most preseason power rankings and carry the joint lowest win total at 4.5."
  ],
  up:[
    "The defensive additions are legitimately well regarded. Hafley ran a top ten unit in Green Bay twice and now gets to build one to his own spec.",
    "Thirteen picks plus a clean cap sheet is exactly the position a rebuild wants to be in. The 2027 draft position should be excellent.",
    "Proctor at left tackle is a decade-long fixture if he hits, and the interior line no longer looks like a liability.",
    "Rookies Douglas and Bell could make the second half of the season more watchable than the first if either develops."
  ],
  down:[
    "The receiver room is the most criticized in the league. Evaluating Willis behind it is close to impossible, which undercuts the point of the season.",
    "Too many holes to fix in one offseason, and the schedule is projected among the two hardest in the NFL.",
    "No clear franchise quarterback and no obvious path to one except through a bad record.",
    "Any veteran still on the roster becomes a trade candidate by October, which usually makes the record worse before it gets better."
  ]
},
/* ============================ AFC NORTH ============================ */
{
  ab:"BAL", name:"Baltimore Ravens", conf:"AFC", div:"AFC North", color:"#241773",
  rec:"8-9", pf:424, pa:398, pd:26, srs:1.1, to:-3, wt:11.5, rank:8,
  sub:"John Harbaugh out after 18 years. Jesse Minter in.",
  facts:[
    "Went 8-9 with <strong>Lamar Jackson</strong> missing four games and playing hurt through much of the rest. Parted with <strong>John Harbaugh</strong> after 18 seasons.",
    "Hired <strong>Jesse Minter</strong>, previously the Chargers' defensive coordinator, as head coach. Also lost OC Todd Monken to the Browns head job.",
    "Signed <strong>Trey Hendrickson</strong> in free agency after a Maxx Crosby trade collapsed. Added CB <strong>Jaire Alexander</strong> and CB Tre'Davious White in low-cost deals.",
    "Drafted guard <strong>Vega Ioane</strong> at 14 and edge Zion Young at 45, then loaded up on skill depth later.",
    "Carry the joint highest posted win total in the league at 11.5 despite finishing under .500."
  ],
  up:[
    "This is the classic bounce-back profile: a healthy MVP-caliber quarterback, positive point differential in a losing season, and a roster that improved on paper.",
    "Hendrickson plus a healthy <strong>Nnamdi Madubuike</strong> gives the front the pass rush it lacked, which was the defense's clearest 2025 failure.",
    "The AFC North turned over three of four head coaches, so Baltimore's roster continuity is a relative advantage.",
    "Minter is well regarded and inherits a roster that many analysts still rate as the deepest in the AFC."
  ],
  down:[
    "Eighteen years of institutional stability walked out the door. First-year head coaches rarely inherit an 11.5-win expectation.",
    "Losing Monken matters. Baltimore's offensive identity was built around his marriage of the run game and Jackson's arm.",
    "Jackson's durability is now a live question rather than a footnote, and there is no scenario where a backup keeps this win total alive.",
    "The market has priced in the bounce-back completely. There is very little value left in the number if anything goes wrong."
  ]
},
{
  ab:"PIT", name:"Pittsburgh Steelers", conf:"AFC", div:"AFC North", color:"#FFB612",
  rec:"10-7", pf:397, pa:387, pd:10, srs:0.1, to:12, wt:8.5, rank:20,
  sub:"Mike Tomlin era over. McCarthy and Rodgers reunited.",
  facts:[
    "Won the AFC North at 10-7. <strong>Mike Tomlin</strong> is gone after 20 seasons without a losing year, replaced by <strong>Mike McCarthy</strong>.",
    "McCarthy and <strong>Aaron Rodgers</strong> reunite from their Green Bay years. Rodgers is the Week 1 starter.",
    "Rebuilt the receiver room around him: traded for <strong>Michael Pittman Jr.</strong> from Indianapolis and drafted <strong>Germie Bernard</strong> in round two.",
    "Also added safety Kyle Dugger from New England and drafted tackle <strong>Max Iheanachor</strong> at 21 and QB <strong>Drew Allar</strong> at 76.",
    "Point differential of plus 10 was the thinnest of any 2025 division winner."
  ],
  up:[
    "The defense should still be good, and if <strong>T.J. Watt</strong> returns to form it has a top-five ceiling.",
    "The front office did not stand still at receiver. Pittman is a real possession target and Bernard adds a downfield element Rodgers can use.",
    "Two offensive linemen taken high addresses a group that has quietly been the offense's ceiling for years.",
    "Allar in round three means the succession plan exists, which lowers the cost of a Rodgers-shaped disaster."
  ],
  down:[
    "A plus 10 differential in a 10-win season is the textbook signature of a team about to regress. SRS had them at almost exactly average.",
    "McCarthy's most recent Dallas tenure ended without a deep January run, and this is an older roster than the one he left.",
    "Rodgers at this stage of his career carries obvious physical and locker room risk, and the offense has no proven answer behind him early.",
    "Losing Tomlin removes the one constant that reliably kept this franchise above water in bad years."
  ]
},
{
  ab:"CIN", name:"Cincinnati Bengals", conf:"AFC", div:"AFC North", color:"#FB4F14",
  rec:"6-11", pf:414, pa:492, pd:-78, srs:-5.1, to:-3, wt:10.5, rank:11,
  sub:"Burrow healthy, defense finally funded.",
  facts:[
    "Went 6-11 with <strong>Joe Burrow</strong> missing nine games and one of the worst defenses in the NFL. Zac Taylor and Duke Tobin were both retained.",
    "Traded a first-round pick (No. 10) to the Giants for DT <strong>Dexter Lawrence II</strong> and signed edge <strong>Boye Mafe</strong> away from Seattle.",
    "The only AFC North team that did not change head coaches this winter.",
    "Drafted edge <strong>Cashius Howell</strong> at 41 and CB <strong>Tacario Davis</strong> at 72, doubling down on the defensive rebuild.",
    "Face the third easiest projected schedule in the league."
  ],
  up:[
    "Burrow healthy plus an easy schedule is the cleanest bounce-back setup in the AFC. The offense scored 414 points in a season it barely had its quarterback.",
    "Lawrence and Mafe are the first genuinely expensive defensive additions this front office has made in years, and both fill premium positions.",
    "Even a middling defense turns this into a playoff team given what the offense produced without Burrow.",
    "The receiver duo remains among the most productive in football when the quarterback is upright."
  ],
  down:[
    "The offensive line is still the unresolved question, and Burrow's availability is the entire thesis.",
    "One offseason of spending does not undo a bottom-tier defensive roster. The back seven remains thin behind the new front.",
    "Analysts who have been consistently low on Cincinnati remain low. Sharp Football has them 11th while the market prices them at 10.5 wins.",
    "A minus 78 point differential is a long way to climb even with the schedule help."
  ]
},
{
  ab:"CLE", name:"Cleveland Browns", conf:"AFC", div:"AFC North", color:"#FF3C00",
  rec:"5-12", pf:279, pa:379, pd:-100, srs:-7.4, to:-7, wt:5.5, rank:31,
  sub:"Todd Monken takes over. Myles Garrett is gone.",
  facts:[
    "Scored the second fewest points in the league. Fired <strong>Kevin Stefanski</strong> and hired former Ravens OC <strong>Todd Monken</strong>, who also lost DC Jim Schwartz in the process.",
    "Traded reigning Defensive Player of the Year <strong>Myles Garrett</strong> to the Rams for edge <strong>Jared Verse</strong> and picks, a full commitment to a longer timeline.",
    "Spent heavily on the offensive line: guard <strong>Zion Johnson</strong> for close to $50 million over three years, plus first-rounder <strong>Spencer Fano</strong> at No. 9 after trading down from 6.",
    "Also drafted WR <strong>KC Concepcion</strong> at 24, WR Denzel Boston at 39, and QB <strong>Taylen Green</strong> in round six.",
    "Enter the season with a four-way quarterback competition between Deshaun Watson, Shedeur Sanders, Dillon Gabriel, and Green."
  ],
  up:[
    "The offensive line rebuild is the single most defensible thing any bad team did this offseason, and it directly addresses why the offense was unwatchable.",
    "The Garrett trade returned real value for a player on the wrong side of the team's competitive window.",
    "The 2025 rookie class was strong, headlined by Defensive Rookie of the Year <strong>Carson Schwesinger</strong>, and Judkins and Sampson give the run game two young backs.",
    "They face the easiest projected schedule in the NFL, which should keep games competitive."
  ],
  down:[
    "There is no credible starting quarterback on the roster. Analysts are near-unanimous that Watson cannot be the 2026 plan.",
    "Losing Garrett strips the defense of the one player who could win a game alone. Schwartz's departure compounds it.",
    "Monken has never been an NFL head coach and inherited a staff he had to build from scratch.",
    "Even with the softest schedule in football, most projections have them fighting Miami and Arizona for the worst record."
  ]
},
/* ============================ AFC SOUTH ============================ */
{
  ab:"JAX", name:"Jacksonville Jaguars", conf:"AFC", div:"AFC South", color:"#006778",
  rec:"13-4", pf:474, pa:336, pd:138, srs:8.7, to:13, wt:8.5, rank:16,
  sub:"Liam Coen's 13-win debut. Now the regression question.",
  facts:[
    "Went from four wins in 2024 to 13 wins and the AFC South title in <strong>Liam Coen</strong>'s first year. Lost at home in the wild card round to Buffalo.",
    "Lost <strong>Travis Etienne Jr.</strong> (to New Orleans) and <strong>Devin Lloyd</strong> (to Carolina) in free agency, the two most notable departures on either side of the ball.",
    "<strong>Jakobi Meyers</strong>, acquired from Las Vegas at the 2025 deadline and extended for three years and $60 million, was named a permanent captain. He joins Brian Thomas Jr., Parker Washington, and Travis Hunter in the receiver room.",
    "Swapped corners with Cleveland, sending <strong>Greg Newsome II</strong> out and bringing <strong>Tyson Campbell</strong> back in.",
    "Drafted TE Nate Boerkircher at 56, DT Albert Regis at 81, and guard Emmanuel Pregnon at 88 after trading their first-rounder in the 2025 Travis Hunter deal.",
    "Their win total dropped a full four games from their 2025 result, one of the biggest gaps on the board."
  ],
  up:[
    "Coen's offensive system produced immediate, dramatic improvement and the core of that unit is intact.",
    "The roster resisted a panic overhaul. Continuity in year two of a system is usually worth something real.",
    "SRS of 8.7 was the best in the AFC South and third best in the conference, so this was not purely a mirage.",
    "Trevor Lawrence finally has a full offseason in a scheme that worked, and the receiver group around Hunter is settled."
  ],
  down:[
    "Turnover luck is the central bear case. A large share of the 2025 jump came from a takeaway rate that rarely repeats.",
    "Losing Etienne and Lloyd thins two positions where they had no obvious internal replacement.",
    "Houston is coming for the division and looks like the more complete roster on paper.",
    "Second-year coaching bumps are common, and the market moved them from 13 wins down to an 8.5 line for a reason."
  ]
},
{
  ab:"HOU", name:"Houston Texans", conf:"AFC", div:"AFC South", color:"#A71930",
  rec:"12-5", pf:404, pa:295, pd:109, srs:8.6, to:17, wt:9.5, rank:7,
  sub:"Started 0-3, then won 12 of 14.",
  facts:[
    "Started 0-3, then won 12 of their final 14 including a nine game closing streak, before losing to New England in the divisional round.",
    "Third straight season of at least 10 wins. The defense allowed 295 points, second fewest in the AFC.",
    "Rebuilt the interior offensive line through the draft: guard <strong>Keylan Rutledge</strong> at 26, DT Kayden McDonald at 36, TE Marlin Klein at 59, guard Febechi Nwaiwu at 106.",
    "Traded for RB <strong>David Montgomery</strong> from Detroit and added WR John Metchie III.",
    "<strong>Jayden Higgins</strong> tore his ACL and is out for the season. Houston traded for WR Kayshon Boutte in response. Tank Dell and tackle Braden Smith both opened on injured reserve for at least four games."
  ],
  up:[
    "The defense is the most complete unit in the division and among the best in the conference. DSRS of 7.2 led the AFC comfortably.",
    "Four of the first six picks went to the trenches, which is exactly the criticism this roster has faced for two years.",
    "Montgomery gives them a short-yardage and closing-game back they have lacked, which matters for a team that wins low-scoring games.",
    "They have shown they can win without their best offensive version. A 0-3 start followed by 12 of 14 is real resilience."
  ],
  down:[
    "The Higgins injury is a genuine blow. Tank Dell is still working back from a 2024 knee injury and the depth behind Collins is unproven.",
    "The offensive line is improved on paper but starts two rookies. C.J. Stroud has taken a lot of hits over three seasons.",
    "Analysts keep circling back to the same question: is Stroud a top-tier quarterback or a good one on a great defense?",
    "Jacksonville still owns the division and Houston has to prove it can beat them twice."
  ]
},
{
  ab:"IND", name:"Indianapolis Colts", conf:"AFC", div:"AFC South", color:"#002C5F",
  rec:"8-9", pf:466, pa:412, pd:54, srs:5.0, to:-2, wt:7.5, rank:21,
  sub:"7-1 start, then eight losses in nine.",
  facts:[
    "Started 7-1 and held the AFC's No. 1 seed after Week 8, then lost eight of their last nine including a seven game closing streak.",
    "Kept both <strong>Shane Steichen</strong> and GM <strong>Chris Ballard</strong> despite the collapse.",
    "<strong>Daniel Jones</strong> signed a two-year, $88 million extension and is expected back as the starter after the injury that triggered the slide.",
    "Traded <strong>Michael Pittman Jr.</strong> to Pittsburgh, meaning <strong>Alec Pierce</strong> steps into the No. 1 receiver role. They had traded two first-rounders for CB <strong>Sauce Gardner</strong> in November.",
    "Draft leaned defense: LB CJ Allen at 53, S A.J. Haulcy at 78, LB Bryce Boettcher at 135."
  ],
  up:[
    "The offense scored 466 points, fourth most in the AFC. When healthy it is a legitimately dangerous unit.",
    "Gardner is a true No. 1 corner and the kind of piece that changes what a defense can call.",
    "OSRS of 5.9 says the collapse was largely about who was on the field rather than how they played when whole.",
    "The 7.5 win total gives a healthy season plenty of room to clear."
  ],
  down:[
    "The entire projection rides on Jones playing like he did in the first half of 2025 while coming back from a major injury.",
    "Trading Pittman leaves a receiver room with a significant injury question and no proven second option.",
    "The defense still has holes despite the Gardner investment, and DSRS was negative.",
    "Keeping the coach and GM after a seven game losing streak means nobody in the building is coaching with a clean slate."
  ]
},
{
  ab:"TEN", name:"Tennessee Titans", conf:"AFC", div:"AFC South", color:"#4B92DB",
  rec:"3-14", pf:284, pa:478, pd:-194, srs:-8.0, to:-5, wt:6.5, rank:27,
  sub:"Robert Saleh and Brian Daboll arrive for Cam Ward's year two.",
  facts:[
    "Three wins in <strong>Cam Ward</strong>'s rookie year. Hired <strong>Robert Saleh</strong> as head coach and <strong>Brian Daboll</strong> as offensive coordinator.",
    "Drafted WR <strong>Carnell Tate</strong> fourth overall, the surprise of the top five, then traded back into round one for edge <strong>Keldric Faulk</strong> at 31.",
    "Also took LB <strong>Anthony Hill Jr.</strong> at 60 and RB Nicholas Singleton at 165 after an aggressive series of trades with Buffalo.",
    "Signed DL <strong>John Franklin-Myers</strong> to a large deal and slot receiver <strong>Wan'Dale Robinson</strong> for four years and $78 million, reuniting him with Daboll.",
    "Analysts were widely positive on the draft class and widely skeptical of the cornerback spending."
  ],
  up:[
    "Ward finally has a downfield threat. Tate and Robinson give him a genuine No. 1 and a chain-mover, which he simply did not have.",
    "Daboll has a track record of building an offense around a young quarterback, and Saleh has a track record of fixing defenses fast.",
    "The draft class was one of the most praised in the league. Faulk and Hill are both projected as immediate starters.",
    "There is nowhere to go but up from minus 194 points, and their 2025 strength of schedule was the hardest in the league."
  ],
  down:[
    "This is still a bottom five roster in most evaluations. Two good hires do not close a 194-point gap in one year.",
    "Cornerback spending is the most criticized part of the offseason. Analysts think they paid market rate for below-market play.",
    "Ward is unproven and now has to learn a new system with a new play caller in the same building he struggled in.",
    "The AFC South has two 12-win-plus teams at the top. Four divisional games against Houston and Jacksonville is a hard floor."
  ]
},
/* ============================ AFC WEST ============================ */
{
  ab:"DEN", name:"Denver Broncos", conf:"AFC", div:"AFC West", color:"#FB4F14",
  rec:"14-3", pf:401, pa:311, pd:90, srs:3.5, to:-3, wt:9.5, rank:6,
  sub:"14 wins, 11 of them by one score.",
  facts:[
    "Tied for the league's best record at 14-3 and reached the AFC Championship Game. Won 11 games by one possession, tying an NFL record.",
    "Traded for <strong>Jaylen Waddle</strong>, sending first, third, and fourth round picks to Miami.",
    "Re-signed most of their own free agents including leading rusher J.K. Dobbins, and added depth through five late picks. OLB <strong>Jonathan Cooper</strong> was placed on the commissioner exempt list before the season.",
    "Did not hold a first-round pick. Best selections were DT Tyler Onyedim at 66 and RB Jonah Coleman at 108.",
    "The win total sits at 9.5, a four and a half win markdown from the 2025 result and the largest drop on the board."
  ],
  up:[
    "The roster has very few holes. Sean Payton's defense allowed 311 points and the offense now adds a legitimate No. 1 receiver.",
    "Waddle is a scheme fit and gives Bo Nix a separator on the outside for the first time.",
    "The defense's DSRS was 3.5, and it is largely intact. This is not a unit built on one contract year.",
    "Payton has won a Super Bowl and Denver's home field remains one of the harder places to play in the AFC."
  ],
  down:[
    "Eleven one-score wins is the loudest regression signal in the league. That rate does not repeat, and SRS of 3.5 tells the real story.",
    "The lingering question at the position that decides everything: analysts are still not convinced Nix is good enough to lead a Super Bowl team.",
    "The run game is a question mark, which matters for a team that wins close and needs to close games out.",
    "The AFC West may be the hardest division in football. Kansas City is healthy again and the Chargers have their tackles back."
  ]
},
{
  ab:"LAC", name:"Los Angeles Chargers", conf:"AFC", div:"AFC West", color:"#0080C6",
  rec:"11-6", pf:368, pa:340, pd:28, srs:0.8, to:2, wt:9.5, rank:5,
  sub:"Both All-Pro tackles back. Mike McDaniel calling plays.",
  facts:[
    "Won 11 games despite losing All-Pro tackles <strong>Joe Alt</strong> and <strong>Rashawn Slater</strong> for most of the year. Both are expected back.",
    "Hired <strong>Mike McDaniel</strong> as offensive coordinator after he withdrew from the Browns head coaching search.",
    "Lost DC Jesse Minter to the Ravens head job. Traded for edge <strong>Odafe Oweh</strong> and drafted OLB <strong>Akheem Mesidor</strong> at 22 and center <strong>Jake Slaughter</strong> at 63.",
    "Traded down twice on Day 2 and came away with eight picks in rounds four through six.",
    "Their win total went down despite the tackle returns and the McDaniel hire, which several analysts flagged as odd."
  ],
  up:[
    "Getting two All-Pro tackles back is functionally a major free agency haul that cost nothing.",
    "McDaniel is one of the most inventive play designers in the league and now works with Justin Herbert, who is a common top-three MVP pick.",
    "The defense is talented and Jim Harbaugh's teams have consistently outperformed their roster ranking.",
    "Sharp Football has them fifth, well above their posted number, calling the win total soft."
  ],
  down:[
    "Health is the whole thesis. Center <strong>Tyler Biadasz</strong> is expected out for an extended stretch, so rookie Jake Slaughter starts, and Slater had a knee flare-up in August before being cleared.",
    "Losing Minter as coordinator is a real change even with Chris O'Leary keeping the scheme, and center Tyler Biadasz is expected out for a long stretch.",
    "A plus 28 differential in an 11-win season is a warning that they were closer to average than the record suggested.",
    "There is a long institutional history of this franchise finding a way to disappoint expectations that look exactly like these."
  ]
},
{
  ab:"KC", name:"Kansas City Chiefs", conf:"AFC", div:"AFC West", color:"#E31837",
  rec:"6-11", pf:362, pa:328, pd:34, srs:1.9, to:-1, wt:10.5, rank:14,
  sub:"Six wins, 1-9 in one-score games, Mahomes back from an ACL.",
  facts:[
    "Six wins, their fewest since 2012, driven by a 1-9 record in one-score games. Missed the playoffs for the first time since 2014.",
    "<strong>Patrick Mahomes</strong> tore his ACL and missed the final three games. He is expected to start Week 1.",
    "Signed Super Bowl MVP <strong>Kenneth Walker III</strong> from Seattle to fix the run game.",
    "Traded up to No. 6 for CB <strong>Mansoor Delane</strong>, then took DT <strong>Peter Woods</strong> at 29 and edge R Mason Thomas at 40. Also drafted QB Garrett Nussmeier at 249.",
    "Traded CB <strong>Trent McDuffie</strong> to the Rams and guard <strong>Joe Thuney</strong> to Chicago, reshaping both lines."
  ],
  up:[
    "A 1-9 record in one-score games is close to pure variance. Positive point differential in a six-win season screams bounce-back.",
    "Mahomes healthy plus Walker in the backfield gives the offense a dimension it has been missing for several seasons.",
    "Delane and Woods are premium-position first-rounders on a defense that already had a strong DSRS of 3.8.",
    "The market has them at 10.5 wins, which reflects near-total confidence that 2025 was an aberration."
  ],
  down:[
    "The most pointed analyst critique this year is that the roster simply is not elite anymore, and that Mahomes has been carrying it.",
    "Trading McDuffie and Thuney removed two of the best players at their positions. The rookies replacing them are rookies.",
    "A quarterback returning from a torn ACL at 31 is not a guaranteed return to form, particularly for a player whose game increasingly depends on escapability.",
    "They now play in the toughest division in football and no longer have the benefit of the doubt in it."
  ]
},
{
  ab:"LV", name:"Las Vegas Raiders", conf:"AFC", div:"AFC West", color:"#6E7679",
  rec:"3-14", pf:241, pa:432, pd:-191, srs:-10.5, to:-7, wt:5.5, rank:29,
  sub:"Pete Carroll one-and-done. Fernando Mendoza is the future.",
  facts:[
    "Worst record in football at 3-14 and the fewest points scored in the league. Fired <strong>Pete Carroll</strong> after one season.",
    "Hired <strong>Klint Kubiak</strong>, Seattle's Super Bowl-winning offensive coordinator, as head coach, with Rob Leonard as defensive coordinator.",
    "Used the No. 1 overall pick on Heisman winner <strong>Fernando Mendoza</strong>. <strong>Kirk Cousins</strong> starts Week 1 as the bridge.",
    "Spent $281.5 million on the first day of free agency alone, headlined by center <strong>Tyler Linderbaum</strong>. Traded away <strong>Geno Smith</strong> to the Jets.",
    "Their win total was the only line on the board to move in the final three weeks of preseason, dropping a full win to 5.5."
  ],
  up:[
    "Mendoza is the most highly regarded quarterback prospect in several drafts, and having Cousins bridge means he does not have to be rushed.",
    "The offensive line rebuild around Linderbaum was aggressive and directly addresses why the offense scored 241 points.",
    "Kubiak just called plays for a Super Bowl winner and brings a system with a proven track record of elevating average personnel.",
    "Ashton Jeanty and Maxx Crosby are both legitimate building blocks who were wasted on a three-win roster."
  ],
  down:[
    "They play in the strongest division in football. Even a much better team could still finish 5-11 on strength of schedule alone.",
    "First-time head coach, rookie quarterback in waiting, and a locker room that was openly frustrated by how last season ended.",
    "The free agency spending was broad rather than targeted, and analysts questioned whether it bought enough real talent.",
    "The line moving down a full win during preseason suggests the market saw something it did not like."
  ]
},
/* ============================ NFC EAST ============================ */
{
  ab:"PHI", name:"Philadelphia Eagles", conf:"NFC", div:"NFC East", color:"#004C54",
  rec:"11-6", pf:379, pa:325, pd:54, srs:2.8, to:6, wt:10.5, rank:9,
  sub:"8-2 start, then five losses in eight. A.J. Brown is gone.",
  facts:[
    "Won the NFC East at 11-6 but started 8-2 and lost five of their last eight, then fell to San Francisco in the wild card round.",
    "Traded <strong>A.J. Brown</strong> to New England. <strong>DeVonta Smith</strong> is now the No. 1, with <strong>Makai Lemon</strong> (20th), TE <strong>Eli Stowers</strong> (54th), <strong>Dontayvion Wicks</strong> by trade, and free agent Hollywood Brown behind him.",
    "Big defensive additions: signed CB <strong>Riq Woolen</strong> away from Seattle and traded for edge <strong>Jonathan Greenard</strong> from Minnesota.",
    "New offensive coordinator <strong>Sean Mannion</strong> takes over the play calling.",
    "Have cleared this 10.5 win total in each of the last four seasons."
  ],
  up:[
    "The defense may be the best in the NFC after adding Greenard and Woolen to a unit that already had the conference's third best DSRS.",
    "The bar for the offense is low. It scored only 379 points last year, so replacing Brown by committee does not require much.",
    "Lemon was the Biletnikoff winner and Stowers the Mackey winner. That is not a bad pair of consolation prizes.",
    "Roster continuity in the front seven and the offensive line remains among the best in football."
  ],
  down:[
    "Losing your alpha receiver rarely improves an offense, however expected the split was. Hurts loses his most reliable contested-catch target.",
    "A new play caller in Mannion is an unknown, and the second-half collapse happened with a more talented skill group than this one.",
    "The late-season fade is now a pattern rather than an event, and it has ended two consecutive seasons.",
    "Dallas has rebuilt its defense and the division is no longer a walk."
  ]
},
{
  ab:"DAL", name:"Dallas Cowboys", conf:"NFC", div:"NFC East", color:"#003594",
  rec:"7-9-1", pf:471, pa:511, pd:-40, srs:-4.1, to:-9, wt:9.5, rank:12,
  sub:"Elite offense, historically bad defense, now rebuilt.",
  facts:[
    "Went 7-9-1 with the fifth highest scoring offense in football at 27.7 points per game and one of its worst defenses. DSRS was minus 8.7.",
    "Rebuilt the defense aggressively: traded for edge <strong>Rashan Gary</strong>, drafted safety <strong>Caleb Downs</strong> at 11 after trading up, and added edge <strong>Malachi Lawrence</strong> at 23.",
    "Had already traded for DT <strong>Quinnen Williams</strong> in November, sending a 2027 first-rounder to the Jets.",
    "Moved on from DTs <strong>Osa Odighizuwa</strong> (49ers) and <strong>Solomon Thomas</strong> (Titans), plus LB Logan Wilson.",
    "Face an easier schedule than in 2025 and their win total climbed two games above last year's result."
  ],
  up:[
    "The single biggest talent injection on defense of any team this offseason. Downs was the Thorpe winner and Gary is a proven double-digit sack player.",
    "The Lamb and Pickens receiver pairing is one of the best duos in the league, and the offense never needed fixing.",
    "Sharp Football moved them up four spots out of camp and describes them as underrated. Their 12th-place analyst rank sits well ahead of public perception.",
    "A minus 40 differential with 471 points scored means the offense only needed a competent defense to swing several games."
  ],
  down:[
    "Rebuilding a defense that bad in one offseason is a lot to ask, and two of the key pieces are rookies.",
    "Brian Schottenheimer is still unproven as a head coach and the tie plus nine losses came against a soft schedule.",
    "The interior defensive line got worse in raw terms even as the edges and secondary improved.",
    "Philadelphia is still the class of the division and Dallas has to prove it can win a game where it does not score 30."
  ]
},
{
  ab:"WAS", name:"Washington Commanders", conf:"NFC", div:"NFC East", color:"#5A1414",
  rec:"5-12", pf:356, pa:451, pd:-95, srs:-5.7, to:-13, wt:7.5, rank:23,
  sub:"From NFC title game to five wins in one year.",
  facts:[
    "Fell from 12 wins and an NFC Championship Game appearance in 2024 to 5-12. <strong>Jayden Daniels</strong> missed seven games and the team went 2-5 without him.",
    "Drafted LB <strong>Sonny Styles</strong> seventh overall on a fully guaranteed four year, $37.2 million deal, plus WR Antonio Williams at 71.",
    "Signed WR <strong>Stefon Diggs</strong> to give Daniels a veteran target.",
    "New defensive coordinator <strong>Daronte Jones</strong> takes over the unit.",
    "<strong>Laremy Tunsil</strong>, acquired for a package of picks in 2025, is expected to miss most of the season."
  ],
  up:[
    "Daniels healthy is the whole difference. The 2024 version of this team went to a conference championship with much the same core.",
    "Diggs plus Terry McLaurin gives the offense a real two-receiver structure, and reporting on the planned offensive scheme has been positive.",
    "Styles was one of four Ohio State defenders taken in the top eleven and projects as an immediate three-down linebacker.",
    "The 7.5 win total is only two and a half above a season in which their quarterback missed 40 percent of the games."
  ],
  down:[
    "The offensive line is the problem nobody has solved. Losing Tunsil for most of the year undercuts everything else the offense wants to do.",
    "Daniels' injury history is now two seasons long, and his running style is central to how the offense functions.",
    "A minus 95 point differential is a lot of ground, and the defense finished with a negative DSRS even before the coordinator change.",
    "Both Philadelphia and Dallas look stronger, which makes the division path narrow."
  ]
},
{
  ab:"NYG", name:"New York Giants", conf:"NFC", div:"NFC East", color:"#0B2265",
  rec:"4-13", pf:381, pa:439, pd:-58, srs:-3.6, to:-2, wt:7.5, rank:24,
  sub:"John Harbaugh takes over a young core.",
  facts:[
    "Went 4-13. <strong>Brian Daboll</strong> was fired in November at 2-8 with Mike Kafka finishing 2-5 as interim.",
    "Hired <strong>John Harbaugh</strong> as head coach, with <strong>Matt Nagy</strong> as offensive coordinator and <strong>Dennard Wilson</strong> as defensive coordinator.",
    "Traded <strong>Dexter Lawrence</strong> to Cincinnati for the No. 10 pick, then used two first-rounders on LB <strong>Arvell Reese</strong> at 5 and guard <strong>Francis Mauigoa</strong> at 10.",
    "Also added CB Colton Hood at 37 and WR Malachi Fields at 74. Added DL Jordan Phillips.",
    "Young core is set: <strong>Jaxson Dart</strong> at quarterback, <strong>Cam Skattebo</strong> at running back, <strong>Malik Nabers</strong> at receiver."
  ],
  up:[
    "Harbaugh is the most accomplished head coaching hire of the cycle by a wide margin, and he inherits a genuinely young roster rather than an old one.",
    "The draft class was widely praised. Reese and Mauigoa both project as immediate starters at premium positions.",
    "Thirteen wins over three seasons means the bar for visible improvement is very low, and the arrow points up.",
    "Dart, Skattebo, and Nabers give the offense three cost-controlled pieces to build around."
  ],
  down:[
    "Nabers is coming off a torn ACL and was non-committal about Week 1. The receiver depth behind him is thin.",
    "Trading Lawrence left a real hole. The defensive line was rebuilt but analysts still flag it as the roster's weak spot.",
    "Dart has 2025 starts under his belt but is unproven, and Nagy's play calling record as a coordinator is mixed.",
    "This is still a bottom-ten roster in a division with two playoff-caliber teams."
  ]
},
/* ============================ NFC NORTH ============================ */
{
  ab:"CHI", name:"Chicago Bears", conf:"NFC", div:"NFC North", color:"#C83803",
  rec:"11-6", pf:441, pa:415, pd:26, srs:0.5, to:22, wt:9.5, rank:17,
  sub:"Ben Johnson wins the North. Now the hardest schedule in football.",
  facts:[
    "Won 11 games and the NFC North in <strong>Ben Johnson</strong>'s first season, then beat Green Bay in the wild card round after trailing 21-3 at half.",
    "Face the NFL's toughest projected schedule in 2026.",
    "Center <strong>Drew Dalman</strong> retired unexpectedly. They drafted Rimington winner <strong>Logan Jones</strong> at 57 as the replacement and had traded for <strong>Joe Thuney</strong> the year before.",
    "Traded <strong>D.J. Moore</strong> to Buffalo. Drafted safety <strong>Dillon Thieneman</strong> at 25, TE Sam Roush at 69, WR Zavion Thomas at 89, CB Malik Muhammad at 124.",
    "Safety <strong>Coby Bryant</strong>, signed away from Seattle for three years and $40 million, had knee surgery on August 7 and is out four to six months. CB Kyler Gordon (calf) is also on injured reserve. The team signed veteran Xavier Woods to fill in."
  ],
  up:[
    "Johnson's offense produced 441 points in year one and Caleb Williams improved visibly across the season. Year two in a system usually helps most.",
    "The defensive additions in free agency were sound and the front seven is deeper than it was.",
    "They have already beaten Green Bay in January, which removes a psychological barrier this franchise carried for years.",
    "The skill group is young and Johnson has a track record of scheming production out of committee receiver rooms."
  ],
  down:[
    "The hardest schedule in the league is the main reason their number sits below their 2025 win total.",
    "Several key defensive departures plus the Bryant injury leaves the secondary thinner than it looks on paper.",
    "Dalman's retirement means a rookie center is snapping to a quarterback still working on his internal clock.",
    "A plus 26 differential in an 11-win season and an SRS of 0.5 both say this was closer to a nine-win team."
  ]
},
{
  ab:"GB", name:"Green Bay Packers", conf:"NFC", div:"NFC North", color:"#203731",
  rec:"9-7-1", pf:391, pa:360, pd:31, srs:1.0, to:1, wt:9.5, rank:4,
  sub:"Micah Parsons on the roster, Josh Jacobs on the exempt list.",
  facts:[
    "Went 9-7-1 and lost their final five, then blew a 21-3 halftime lead in the wild card round at Chicago. Second straight one-and-done.",
    "Have <strong>Micah Parsons</strong>, acquired from Dallas in August 2025 for Kenny Clark and two first-round picks. He is unavailable for the opening four games.",
    "<strong>Josh Jacobs</strong> is on the commissioner exempt list with no timeline. MarShawn Lloyd is the lead back in the interim.",
    "Lost WR <strong>Dontayvion Wicks</strong> by trade to Philadelphia and DC Jeff Hafley to the Miami head job.",
    "Draft was defense-heavy: CB <strong>Brandon Cisse</strong> at 52, DT Chris McClellan at 77, edge Dani Dennis-Sutton at 120, CB Domani Jackson at 201."
  ],
  up:[
    "Love has been the sixth most efficient quarterback in EPA per dropback over the last three seasons. Sharp Football's case for ranking them fourth is that this is a top-tier passer on an otherwise complete roster.",
    "Parsons is a first-team All-Pro and a defense-altering player whenever he is back on the field.",
    "The 2025 team was a positive point differential team that lost close games late. That profile usually improves.",
    "The defensive draft class addresses the secondary, which was the unit that broke down in the playoff loss."
  ],
  down:[
    "Missing Parsons for four games and Jacobs entirely is a serious start-of-season handicap, and the schedule is projected third hardest.",
    "They have cleared 9.5 wins only twice in the last five seasons despite consistently being ranked highly in August.",
    "An NFLPA report card showed the largest single-season ratings decline on record, dropping from 7th to 21st. Internal culture is a live question.",
    "Two straight wild card exits, one of them a historic collapse, is a pattern this staff has not answered."
  ]
},
{
  ab:"MIN", name:"Minnesota Vikings", conf:"NFC", div:"NFC North", color:"#4F2683",
  rec:"9-8", pf:344, pa:333, pd:11, srs:0.7, to:-9, wt:8.5, rank:19,
  sub:"Kyler Murray arrives to compete with J.J. McCarthy.",
  facts:[
    "Went 9-8 after letting Sam Darnold walk, and finished by winning their final five games.",
    "Signed <strong>Kyler Murray</strong> to a veteran minimum contract to compete with <strong>J.J. McCarthy</strong> for the starting job. Murray was released by Arizona.",
    "Traded edge <strong>Jonathan Greenard</strong> to Philadelphia and DT Harrison Phillips to the Jets, significantly reshaping the front.",
    "<strong>Brian Flores</strong> signed an extension as defensive coordinator in January.",
    "Drafted DE <strong>Caleb Banks</strong> at 18, LB Jake Golday at 51, DT Domonique Orange at 82, plus two extra third-rounders."
  ],
  up:[
    "Flores' defense allowed just 333 points and his DSRS of 4.2 was among the best in the conference. That system has survived personnel turnover before.",
    "Murray at the minimum is one of the best value signings of the offseason. Sharp Football is explicitly higher on Minnesota with him starting.",
    "Winning the last five games of 2025 suggests the roster figured something out late, and much of it returns.",
    "Justin Jefferson remains the best receiver in football, which raises the floor of any quarterback situation."
  ],
  down:[
    "The defense will look very different. Losing Greenard and Phillips takes two starters out of the front and the draft picks replacing them are rookies.",
    "A quarterback competition this close to Week 1 is rarely a sign of confidence in either option.",
    "The offense scored only 344 points, third fewest among winning teams, and OSRS was minus 3.4.",
    "Both Murray and McCarthy have significant durability histories, and the backup situation is unsettled."
  ]
},
{
  ab:"DET", name:"Detroit Lions", conf:"NFC", div:"NFC North", color:"#0076B6",
  rec:"9-8", pf:481, pa:413, pd:68, srs:3.9, to:4, wt:10.5, rank:15,
  sub:"15 wins to 9-8, and now the secondary is a problem.",
  facts:[
    "Fell from 15 wins in 2024 to 9-8 and missed the playoffs, finishing last in the NFC North.",
    "That last-place finish earns them the sixth easiest projected schedule in 2026, which is the main reason their win total sits at 10.5.",
    "Still scored 481 points, second most in the NFC. <strong>Jahmyr Gibbs</strong> put up 1,223 rushing yards, 77 catches, and 18 total touchdowns.",
    "Traded RB <strong>David Montgomery</strong> to Houston and signed <strong>Isiah Pacheco</strong>, who then opened the season on injured reserve with a back issue. Drafted tackle <strong>Blake Miller</strong> at 17 and edge Derrick Moore at 44.",
    "<strong>Terrion Arnold</strong> was traded to Seattle and both starting safeties, <strong>Brian Branch</strong> and <strong>Kerby Joseph</strong>, opened the year on the PUP list."
  ],
  up:[
    "The offense remains one of the two or three most productive in the NFC, and Gibbs is a genuine offensive player of the year candidate.",
    "The easiest realistic path back to the division: the schedule is soft and Chicago and Green Bay both have their own problems.",
    "A plus 68 point differential in a 9-8 season means the underlying team was better than the record.",
    "Miller at 17 addresses the offensive line, which was the unit most affected by 2025's injuries."
  ],
  down:[
    "The secondary is the biggest camp story in the league right now. Losing Arnold and having both safeties on PUP is why Sharp Football dropped them four spots.",
    "DSRS was already negative at minus 1.3 before any of that happened.",
    "The 2024 to 2025 fall was not just injuries. Coordinator turnover has cost them on both sides of the ball.",
    "A 10.5 win total on a team with a broken secondary is the kind of number analysts point at as too high."
  ]
},
/* ============================ NFC SOUTH ============================ */
{
  ab:"TB", name:"Tampa Bay Buccaneers", conf:"NFC", div:"NFC South", color:"#D50A0A",
  rec:"8-9", pf:380, pa:411, pd:-31, srs:-1.1, to:7, wt:8.5, rank:18,
  sub:"6-2 start, then seven losses in nine.",
  facts:[
    "Started 6-2, then lost seven of their last nine and missed the playoffs at 8-9.",
    "<strong>Baker Mayfield</strong> played through injury for much of the collapse and is expected back healthy.",
    "Lost <strong>Mike Evans</strong> to San Francisco in free agency, ending a franchise era.",
    "Drafted Ted Hendricks winner <strong>Rueben Bain Jr.</strong> at 15 and LB <strong>Josiah Trotter</strong> at 46, then added WRs Ted Hurst and Bauer Sharp later.",
    "Vegas has them projected for essentially the same season, with a win total of 8.5."
  ],
  up:[
    "A healthy Mayfield is a meaningfully better quarterback than the one who finished 2025, and the offensive core largely returns.",
    "Bain was the most productive edge rusher in the draft class and fills the defense's clearest need immediately.",
    "Most analysts have them as the best team in the NFC South, which is a division that has been won with eight wins two years running.",
    "The negative differential was concentrated in the losing streak. The first half of the season showed a functional playoff team."
  ],
  down:[
    "Replacing Evans is not a solved problem. The receiver room is now young and unproven behind Godwin.",
    "Second-half collapses have now happened in consecutive seasons under this staff.",
    "The defense's DSRS was negative and the secondary is the thinnest part of the roster.",
    "Being the best team in the NFC South still probably means a wild card exit. The ceiling question is the one nobody can answer."
  ]
},
{
  ab:"CAR", name:"Carolina Panthers", conf:"NFC", div:"NFC South", color:"#0085CA",
  rec:"8-9", pf:311, pa:380, pd:-69, srs:-3.6, to:-2, wt:7.5, rank:22,
  sub:"Won the division at 8-9. Both tackles start on the shelf.",
  facts:[
    "Won the NFC South at 8-9, their first playoff appearance since 2017, then lost a wild card shootout to the Rams.",
    "Upgraded the defense significantly: traded for edge <strong>Jaelan Phillips</strong> from Miami and signed LB <strong>Devin Lloyd</strong> away from Jacksonville.",
    "Drafted tackle <strong>Monroe Freeling</strong> at 19 and traded up for DT <strong>Lee Hunter</strong> at 49, then added WR Chris Brazzell II at 83. Signed tackle Rasheed Walker in free agency and TE <strong>Darren Waller</strong> to a one-year deal in August.",
    "<strong>Tetairoa McMillan</strong> won Offensive Rookie of the Year in 2025.",
    "Both starting tackles are unavailable for at least the first four games. <strong>Ikem Ekwonu</strong> is on reserve PUP with a knee and <strong>Taylor Moton</strong> on reserve NFI."
  ],
  up:[
    "Phillips and Lloyd are two genuine difference-makers on a defense that already had a positive DSRS of 1.4.",
    "Sharp Football's read is that the roster deserves to be treated separately from the doubts about Bryce Young, and that it is solidly mid-pack.",
    "McMillan is a legitimate No. 1 receiver on a rookie contract, and Brazzell adds depth behind him.",
    "They have already won this division once with a modest roster, and the NFC South remains the weakest in football."
  ],
  down:[
    "Losing both starting tackles for a month is a severe pass protection problem for a quarterback who struggles under pressure.",
    "The offense scored only 311 points, fewest of any 2025 playoff team by a wide margin.",
    "Bryce Young remains the central unresolved question, and nothing this offseason changed the evaluation.",
    "One outlet has them ranked 32nd, which shows how wide the disagreement is on this roster."
  ]
},
{
  ab:"ATL", name:"Atlanta Falcons", conf:"NFC", div:"NFC South", color:"#A71930",
  rec:"8-9", pf:353, pa:401, pd:-48, srs:-2.8, to:5, wt:6.5, rank:28,
  sub:"Kevin Stefanski arrives. The quarterback picture is a mess.",
  facts:[
    "Went 8-9 and closed the season on a four game winning streak. Fired <strong>Raheem Morris</strong> and hired <strong>Kevin Stefanski</strong>, with Tommy Rees as offensive coordinator.",
    "Signed <strong>Tua Tagovailoa</strong> in free agency. <strong>Michael Penix Jr.</strong> is recovering from a knee injury and the starter for Week 1 has not been named.",
    "Drafted CB <strong>Avieon Terrell</strong> at 48, whose brother A.J. is already on the roster, and WR <strong>Zachariah Branch</strong> at 79.",
    "Have no first-round pick as a result of the 2025 trade up with the Rams for James Pearce Jr.",
    "Playmakers are in place: <strong>Bijan Robinson</strong>, <strong>Drake London</strong>, and <strong>Kyle Pitts</strong>, who made second-team All-Pro."
  ],
  up:[
    "Stefanski is a two-time Coach of the Year and one of the more respected hires of the cycle. He inherits far more offensive talent than he had in Cleveland.",
    "Bijan Robinson, London, and Pitts is a genuinely good skill trio. The offense underperformed its personnel under the previous staff.",
    "The division has been winnable with eight wins in each of the last two seasons, so a modest step forward is enough.",
    "Closing 2025 on a four-game winning streak suggests the roster is not as bad as the record."
  ],
  down:[
    "The quarterback situation is the worst kind: two options, neither clearly better, and no resolution days before kickoff.",
    "Sharp Football's assessment is blunt, noting Tua apparently lost a competition to a player who could not practice.",
    "No first-round pick means no immediate reinforcement, and the defense finished with a negative DSRS.",
    "Their win total dropped despite the strong finish, which reflects how little the market trusts the quarterback room."
  ]
},
{
  ab:"NO", name:"New Orleans Saints", conf:"NFC", div:"NFC South", color:"#B8A06A",
  rec:"6-11", pf:306, pa:383, pd:-77, srs:-4.9, to:-4, wt:7.5, rank:26,
  sub:"Tyler Shough gets the job and the second easiest schedule.",
  facts:[
    "Won six games, but went 5-4 in games <strong>Tyler Shough</strong> started and 1-7 in every other game.",
    "Shough enters 2026 as the unquestioned starter under second-year head coach <strong>Kellen Moore</strong>.",
    "Face the second easiest projected schedule in the NFL.",
    "Drafted WR <strong>Jordyn Tyson</strong> eighth overall and DT <strong>Christen Miller</strong> at 42, plus TE Oscar Delp at 73 and WR Barion Brown at 190. Signed RB <strong>Travis Etienne Jr.</strong> away from Jacksonville.",
    "Tyson is on injured reserve with a hamstring to start the year and will miss at least four games."
  ],
  up:[
    "The Shough splits are striking. A full season of the quarterback who went 5-4 is a very different team from the one that went 6-11.",
    "The second easiest schedule in football is a real structural advantage in a weak division.",
    "The offseason was clearly built around supporting Shough, and analysts generally liked the approach.",
    "Moore is in year two of a deliberate youth movement, so the arrow points up even in a mediocre season."
  ],
  down:[
    "The defense has significant question marks and the front office largely did not address them.",
    "Losing Tyson for the first month removes the rookie who was supposed to open up the passing game.",
    "Only 306 points scored, third fewest in the NFC, and OSRS of minus 5.5 was among the worst in football.",
    "The nine-start sample on Shough is small enough that the split could be noise rather than signal."
  ]
},
/* ============================ NFC WEST ============================ */
{
  ab:"LAR", name:"Los Angeles Rams", conf:"NFC", div:"NFC West", color:"#E5A100",
  rec:"12-5", pf:518, pa:346, pd:172, srs:12.5, to:11, wt:11.5, rank:1,
  sub:"Added Myles Garrett to a roster that had no holes.",
  facts:[
    "Won 12 games and lost the NFC Championship Game. Scored a league-high 518 points. <strong>Matthew Stafford</strong> won AP MVP with 4,707 passing yards.",
    "Traded for reigning Defensive Player of the Year <strong>Myles Garrett</strong> and for CB <strong>Trent McDuffie</strong>, addressing the secondary that was their only real weakness.",
    "Also added CB Tre'Davious White and LB Ernest Jones-adjacent depth. Hired Bubba Ventrone as special teams coordinator.",
    "Held the fewest draft picks in the league at five. Took QB <strong>Ty Simpson</strong> at 13 and TE Max Klare at 61. Simpson has been named QB3.",
    "Entered the season as Super Bowl favorites at +550 and carry the joint highest win total at 11.5."
  ],
  up:[
    "This is the most complete roster in football on paper. An MVP quarterback, the league's best receiver production in Puka Nacua, and now the best defensive player alive.",
    "SRS of 12.5 was second in the league and their losses to Seattle came down to a handful of plays.",
    "The Garrett and McDuffie trades turned the one weak unit into a strength. Their defensive line is widely rated the best position group in the NFL.",
    "Sean McVay's staff has continuity and Stafford is coming off the best statistical season of his career."
  ],
  down:[
    "Garrett missed most of camp with knee swelling and did not practice Tuesday, though McVay says he will be ready for Week 1. <strong>Aaron Donald</strong> came out of retirement to rejoin the team but will not play or travel for the opener.",
    "<strong>Puka Nacua</strong> remains under league review for an offseason civil suit, but he was not placed on the exempt list and the latest reporting says he may avoid discipline this season entirely.",
    "Five draft picks means almost no cheap depth. An injury run would be difficult to absorb.",
    "Stafford is 38 and the roster is built to win now. There is no version of this season where a slow start is acceptable."
  ]
},
{
  ab:"SEA", name:"Seattle Seahawks", conf:"NFC", div:"NFC West", color:"#69BE28",
  rec:"14-3", pf:483, pa:292, pd:191, srs:12.8, to:-3, wt:10.5, rank:3,
  sub:"Defending champions, minus several contributors.",
  facts:[
    "Won Super Bowl LX over New England for the franchise's second title, after a 14-3 season with the league's best SRS at 12.8 and its fewest points allowed at 292.",
    "<strong>Jaxon Smith-Njigba</strong> won Offensive Player of the Year with a franchise-record 119 catches and a league-leading 1,793 receiving yards.",
    "Lost offensive coordinator <strong>Klint Kubiak</strong> to the Raiders head coaching job, which analysts rate as the most damaging departure.",
    "Player losses include Super Bowl MVP <strong>Kenneth Walker III</strong> to Kansas City, edge <strong>Boye Mafe</strong> to Cincinnati, and DBs <strong>Coby Bryant</strong> and <strong>Riq Woolen</strong>. Acquired CB <strong>Terrion Arnold</strong> from Detroit, who is now on the commissioner exempt list.",
    "Drafted RB <strong>Jadarian Price</strong> at 32 and S Bud Clark at 64, and traded for WR Rashid Shaheed. <strong>Zach Charbonnet</strong> is unavailable for the first four games."
  ],
  up:[
    "<strong>Mike Macdonald</strong> is regarded as one of the best coaches in football and the defense was historically good, allowing the fewest points in the league.",
    "Smith-Njigba is the reigning Offensive Player of the Year and the passing game returns essentially intact.",
    "Roster attrition is normal for champions, and the top of the depth chart is still elite on both sides.",
    "They have already beaten the Rams twice in one season, which is the specific test the NFC West will come down to."
  ],
  down:[
    "The roster is objectively less talented than the one that won the title. Analysts are near-unanimous on that point.",
    "Losing Kubiak removes the architect of the offense that just won a Super Bowl, and the replacement is unproven.",
    "The backfield is a genuine unknown. Walker is gone, Charbonnet is out for a month, and a rookie is the lead back.",
    "Champions face the hardest version of everyone's schedule. Their win total dropped three and a half games from last year's result."
  ]
},
{
  ab:"SF", name:"San Francisco 49ers", conf:"NFC", div:"NFC West", color:"#AA0000",
  rec:"12-5", pf:437, pa:371, pd:66, srs:6.0, to:-6, wt:9.5, rank:13,
  sub:"12 wins through an injury crisis. Now an aging skill group.",
  facts:[
    "Won 12 games despite <strong>Brock Purdy</strong> missing eight, and season-ending injuries to <strong>Fred Warner</strong> and <strong>Nick Bosa</strong>. George Kittle and Talanoa Hufanga also missed significant time.",
    "Beat Philadelphia in the wild card round on a late touchdown.",
    "Signed <strong>Mike Evans</strong> in free agency and traded for DT <strong>Osa Odighizuwa</strong> from Dallas.",
    "Traded down repeatedly in the draft. Took WR <strong>De'Zhaun Stribling</strong> at 33, edge Romello Height at 70, RB Kaelon Black at 90, and six more picks in rounds four and five.",
    "<strong>Ricky Pearsall</strong> is out for the season after knee surgery. Kittle's availability is being managed."
  ],
  up:[
    "Twelve wins through that injury list is a remarkable coaching performance. Kyle Shanahan's system continues to hold up under replacement personnel.",
    "Getting Warner, Bosa, and Purdy back at once is the biggest health-driven upgrade any contender has available.",
    "Evans plus Odighizuwa fills the two most obvious holes with proven veterans.",
    "SRS of 6.0 was fourth best in the NFC even with all the missed time, so the underlying team was strong."
  ],
  down:[
    "The draft class was widely criticized as a reach, and the trade-downs produced quantity rather than quality.",
    "The skill group is aging and injury-prone. Evans is 33, Kittle is being managed, and Pearsall is gone for the year.",
    "Their win total dropped despite outperforming expectations, which reflects how much the market attributes 2025 to variance.",
    "They play in a division with the two best teams in the conference and have to face both twice."
  ]
},
{
  ab:"ARI", name:"Arizona Cardinals", conf:"NFC", div:"NFC West", color:"#97233F",
  rec:"3-14", pf:355, pa:488, pd:-133, srs:-4.4, to:-2, wt:3.5, rank:30,
  sub:"Mike LaFleur takes over. Kyler Murray is gone.",
  facts:[
    "Won three games and lost their final nine. Released <strong>Kyler Murray</strong>, who signed with Minnesota.",
    "Hired <strong>Mike LaFleur</strong>, the Rams' offensive coordinator and Matt LaFleur's brother, as head coach. He is the franchise's sixth consecutive first-time head coach.",
    "Drafted RB <strong>Jeremiyah Love</strong> third overall, the highest-drafted running back since Saquon Barkley, then QB <strong>Carson Beck</strong> at 65 and guard Chase Bisontis at 34.",
    "Extended WR <strong>Michael Wilson</strong> during the preseason.",
    "Carry the lowest win total in the league at 3.5 and face the fourth hardest projected schedule."
  ],
  up:[
    "LaFleur comes from the best offensive staff in football and knows the NFC West intimately from stints with both the Rams and 49ers.",
    "Love is an explosive, three-down back who should immediately raise the offense's floor.",
    "Sharp Football's read is that the roster is better than Miami's and the quarterback situation is better than Cleveland's. Some of the low ranking is division, not talent.",
    "Beck at 65 gives them a developmental option without spending premium capital, and the 2027 draft position should be strong."
  ],
  down:[
    "The defense remains the major problem and was not meaningfully addressed. They allowed 488 points last year.",
    "They play in the toughest division in the NFC with the Super Bowl champion and the Super Bowl favorite in it.",
    "<strong>Jacoby Brissett</strong> is the starter after a 3,366-yard, 23-touchdown run over the final 12 games of 2025, but that is a ceiling question rather than an answer. Rookie guard Chase Bisontis is out most or all of the year with an MCL injury.",
    "The fourth hardest schedule combined with a bottom-three roster is why they are the consensus pick for the worst record in football."
  ]
}
];
