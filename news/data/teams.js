/* The 32 teams: abbreviation, name, colour, and the preseason power rank the page falls back to
   before data/ranks2026.js has one. news/tools/pull-week.js reads the names from this file. */
const TEAMS = [
/* AFC East */
{ ab:"NE", name:"New England Patriots", color:"#002244", rank:10 },
{ ab:"BUF", name:"Buffalo Bills", color:"#00338D", rank:2 },
{ ab:"NYJ", name:"New York Jets", color:"#125740", rank:25 },
{ ab:"MIA", name:"Miami Dolphins", color:"#008E97", rank:32 },
/* AFC North */
{ ab:"BAL", name:"Baltimore Ravens", color:"#241773", rank:8 },
{ ab:"PIT", name:"Pittsburgh Steelers", color:"#FFB612", rank:20 },
{ ab:"CIN", name:"Cincinnati Bengals", color:"#FB4F14", rank:11 },
{ ab:"CLE", name:"Cleveland Browns", color:"#FF3C00", rank:31 },
/* AFC South */
{ ab:"JAX", name:"Jacksonville Jaguars", color:"#006778", rank:16 },
{ ab:"HOU", name:"Houston Texans", color:"#A71930", rank:7 },
{ ab:"IND", name:"Indianapolis Colts", color:"#002C5F", rank:21 },
{ ab:"TEN", name:"Tennessee Titans", color:"#4B92DB", rank:27 },
/* AFC West */
{ ab:"DEN", name:"Denver Broncos", color:"#FB4F14", rank:6 },
{ ab:"LAC", name:"Los Angeles Chargers", color:"#0080C6", rank:5 },
{ ab:"KC", name:"Kansas City Chiefs", color:"#E31837", rank:14 },
{ ab:"LV", name:"Las Vegas Raiders", color:"#6E7679", rank:29 },
/* NFC East */
{ ab:"PHI", name:"Philadelphia Eagles", color:"#004C54", rank:9 },
{ ab:"DAL", name:"Dallas Cowboys", color:"#003594", rank:12 },
{ ab:"WAS", name:"Washington Commanders", color:"#5A1414", rank:23 },
{ ab:"NYG", name:"New York Giants", color:"#0B2265", rank:24 },
/* NFC North */
{ ab:"CHI", name:"Chicago Bears", color:"#C83803", rank:17 },
{ ab:"GB", name:"Green Bay Packers", color:"#203731", rank:4 },
{ ab:"MIN", name:"Minnesota Vikings", color:"#4F2683", rank:19 },
{ ab:"DET", name:"Detroit Lions", color:"#0076B6", rank:15 },
/* NFC South */
{ ab:"TB", name:"Tampa Bay Buccaneers", color:"#D50A0A", rank:18 },
{ ab:"CAR", name:"Carolina Panthers", color:"#0085CA", rank:22 },
{ ab:"ATL", name:"Atlanta Falcons", color:"#A71930", rank:28 },
{ ab:"NO", name:"New Orleans Saints", color:"#B8A06A", rank:26 },
/* NFC West */
{ ab:"LAR", name:"Los Angeles Rams", color:"#E5A100", rank:1 },
{ ab:"SEA", name:"Seattle Seahawks", color:"#69BE28", rank:3 },
{ ab:"SF", name:"San Francisco 49ers", color:"#AA0000", rank:13 },
{ ab:"ARI", name:"Arizona Cardinals", color:"#97233F", rank:30 },
];
