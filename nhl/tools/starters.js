/* Tonight's announced starting goalies, into nhl/data/starters.json.

    node nhl/tools/starters.js

   DailyFaceoff's starting-goalies page carries its data as the JSON a Next.js page embeds
   (__NEXT_DATA__); each game there names both goalies with a status (Confirmed, Likely,
   Unconfirmed). The page answers GitHub's runners and not every network, so a failure to read it
   is logged and the file is left as it was: the player model then falls back to the goalie who
   played last, which players.js says on the page. Names are matched to the box scores' goalies
   by the player model, so this file carries names and the club, never ratings. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const OUT = path.join(__dirname, '..', 'data', 'starters.json');
const URL = 'https://www.dailyfaceoff.com/starting-goalies/';
const log = m => console.log(new Date().toISOString().slice(11, 19), m);
/* DailyFaceoff's club names to this site's codes */
const NAMES = { 'Anaheim Ducks': 'ANA', 'Boston Bruins': 'BOS', 'Buffalo Sabres': 'BUF', 'Calgary Flames': 'CGY', 'Carolina Hurricanes': 'CAR', 'Chicago Blackhawks': 'CHI', 'Colorado Avalanche': 'COL', 'Columbus Blue Jackets': 'CBJ', 'Dallas Stars': 'DAL', 'Detroit Red Wings': 'DET', 'Edmonton Oilers': 'EDM', 'Florida Panthers': 'FLA', 'Los Angeles Kings': 'LA', 'Minnesota Wild': 'MIN', 'Montreal Canadiens': 'MTL', 'Montréal Canadiens': 'MTL', 'Nashville Predators': 'NSH', 'New Jersey Devils': 'NJ', 'New York Islanders': 'NYI', 'New York Rangers': 'NYR', 'Ottawa Senators': 'OTT', 'Philadelphia Flyers': 'PHI', 'Pittsburgh Penguins': 'PIT', 'San Jose Sharks': 'SJ', 'Seattle Kraken': 'SEA', 'St. Louis Blues': 'STL', 'St Louis Blues': 'STL', 'Tampa Bay Lightning': 'TB', 'Toronto Maple Leafs': 'TOR', 'Utah Mammoth': 'UTAH', 'Utah Hockey Club': 'UTAH', 'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VGK', 'Washington Capitals': 'WSH', 'Winnipeg Jets': 'WPG' };
const codeOf = s => { if (!s) return null; if (E.TEAMS.includes(s)) return s; if (NAMES[s]) return NAMES[s]; const k = Object.keys(NAMES).find(n => n.toLowerCase().includes(String(s).toLowerCase()) || String(s).toLowerCase().includes(n.split(' ').pop().toLowerCase())); return k ? NAMES[k] : null; };

/* walk the page's JSON for anything that looks like a game with two goalies; the shape has moved
   before, so this reads by field names rather than a fixed path */
function harvest(node, found, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 14) return;
  if (Array.isArray(node)) { for (const x of node) harvest(x, found, depth + 1); return; }
  const keys = Object.keys(node);
  const teamKey = keys.find(k => /^(team|teamName|name|abbreviation|teamAbbrev)$/i.test(k));
  const goalieKey = keys.find(k => /goalie/i.test(k) && node[k] && typeof node[k] === 'object');
  const nameKey = keys.find(k => /^(goalieName|playerName|fullName|name)$/i.test(k) && typeof node[k] === 'string');
  const statusKey = keys.find(k => /^(status|newsStrength|confirmation|startingStatus)$/i.test(k) && typeof node[k] === 'string');
  if (goalieKey && teamKey) {
    const g = node[goalieKey]; const gname = g.name || g.fullName || g.playerName || (g.firstName && g.lastName ? `${g.firstName} ${g.lastName}` : null);
    const team = codeOf(typeof node[teamKey] === 'string' ? node[teamKey] : (node[teamKey].name || node[teamKey].abbreviation));
    if (gname && team) found.push({ team, name: gname, status: g.status || g.newsStrength || (statusKey ? node[statusKey] : null) || null });
  } else if (nameKey && statusKey && teamKey && /confirmed|likely|unconfirmed|expected/i.test(node[statusKey])) {
    const team = codeOf(typeof node[teamKey] === 'string' ? node[teamKey] : (node[teamKey].name || node[teamKey].abbreviation));
    if (team) found.push({ team, name: node[nameKey], status: node[statusKey] });
  }
  for (const k of keys) harvest(node[k], found, depth + 1);
}

async function main() {
  let html;
  try {
    const r = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'text/html' }, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status); html = await r.text();
  } catch (e) { log(`starters: DailyFaceoff did not answer (${e.message}); the file is left as it was`); return; }
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) { log('starters: no __NEXT_DATA__ on the page; the file is left as it was'); return; }
  const found = []; harvest(JSON.parse(m[1]), found);
  const teams = {};
  for (const f of found) if (!teams[f.team] || /confirmed/i.test(f.status || '')) teams[f.team] = { name: f.name, status: f.status };
  const out = { pulled: new Date().toISOString().slice(0, 16) + 'Z', source: 'DailyFaceoff', teams };
  fs.writeFileSync(OUT, JSON.stringify(out));
  log(`starters: ${Object.keys(teams).length} clubs named (${Object.values(teams).filter(t => /confirmed/i.test(t.status || '')).length} confirmed)`);
  if (!Object.keys(teams).length) { const keys = new Set(); (function walk(n, d) { if (!n || typeof n !== 'object' || d > 6) return; for (const k of Object.keys(n)) { keys.add(k); walk(n[k], d + 1); } })(JSON.parse(m[1]), 0); log('starters: the page shape has keys ' + [...keys].slice(0, 80).join(' ')); }
}
main().catch(e => { console.error(e); process.exit(1); });
