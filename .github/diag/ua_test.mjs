const urls={
 scoreboard:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=2&dates=2026',
 teamstats:'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/teams/12/statistics',
 injuries:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries',
 news:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/12/news?limit=8',
 teamrankings:'https://www.teamrankings.com/nfl/stat/points-per-game?date=2026-09-15'};
const variants={
 'script UA (Chrome + Accept)':{ 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36','Accept':'application/json,text/html' },
 'no headers (node default)':{},
 'descriptive UA':{ 'User-Agent':'nfl-hub-season-tracker/1.0 (+https://github.com/DEMON-X13/nfl-hub)' },
};
for(const [vn,h] of Object.entries(variants)){
  const out=[]; for(const [n,u] of Object.entries(urls)){ try{ const r=await fetch(u,{headers:h}); out.push(n+' '+r.status); }catch(e){ out.push(n+' ERR'); } }
  console.log(vn.padEnd(30),out.join(' | '));
}
