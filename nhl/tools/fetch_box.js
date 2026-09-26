/* Pull box scores from ESPN into nhl/data/box_<season>.jsonl, one line per game: every skater's
   ice time, goals, assists, shots and plus-minus, every goalie's minutes, shots against and
   goals against. This is what the player model is built on.

    node nhl/tools/fetch_box.js               every final game not yet in the files: the history's
                                              last five seasons and this season's (from nhl/state.json)
    node nhl/tools/fetch_box.js 2022 2024     a range of seasons, each named by the year it ends

   One request per game (ESPN's game summary), four at a time with a pause, free. A game already in
   the file is never asked for again, so the daily run is last night's games only; the one-time
   backfill of five seasons is about seven thousand requests. Also pulls today's injury report
   into nhl/data/injuries.json. Exit 1 if ESPN could not be read at all. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./espn');
const DATA = path.join(__dirname, '..', 'data');
const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event=';
const INJ = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries';
const FROM_SEASON = 2022;                                     // five seasons of box scores before this one
const log = m => console.log(new Date().toISOString().slice(11, 19), m);
const secs = t => { const m = /^(\d+):(\d+)$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : 0; };

/* the games worth a box score: the history's, then this season's finals from the state */
function finals(from, to) {
  const H = JSON.parse(fs.readFileSync(path.join(DATA, 'history.json'), 'utf8'));
  const col = Object.fromEntries(H.cols.map((c, i) => [c, i]));
  const out = H.rows.filter(r => r[col.season] >= from && r[col.season] <= to).map(r => ({ id: r[col.id], season: r[col.season], type: r[col.type], date: r[col.date], home: r[col.home], away: r[col.away] }));
  const stateFile = path.join(__dirname, '..', 'state.json');
  if (fs.existsSync(stateFile)) {
    const S = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (S.season >= from && S.season <= to) for (const g of S.games) if (g.state === 'final' && g.hs !== null) out.push({ id: g.id, season: S.season, type: g.type, date: g.date, home: g.home, away: g.away });
  }
  return out;
}

/* one summary -> the line the file keeps. null when the box is empty (a game ESPN never scored) */
function boxOf(j, g) {
  const skaters = [], goalies = [];
  for (const t of (j.boxscore && j.boxscore.players) || []) {
    const code = E.codeOf(t.team); if (!code) continue;
    for (const s of t.statistics || []) {
      const L = s.labels || s.keys || []; const ix = k => L.indexOf(k);
      for (const a of s.athletes || []) {
        const st = a.stats || [], id = String(a.athlete.id), name = a.athlete.displayName;
        if (s.name === 'goalies') { const toi = secs(st[ix('TOI')]); if (toi) goalies.push({ id, name, team: code, toi, sa: +st[ix('SA')] || 0, ga: +st[ix('GA')] || 0 }); }
        else if (s.name === 'forwards' || s.name === 'defenses') {
          const toi = secs(st[ix('TOI')]); if (!toi) continue;
          skaters.push({ id, name, team: code, pos: (a.athlete.position && a.athlete.position.abbreviation) || (s.name === 'defenses' ? 'D' : 'F'), toi, g: +st[ix('G')] || 0, a: +st[ix('A')] || 0, sog: +st[ix('SOG')] || 0, pm: +st[ix('+/-')] || 0 });
        }
      }
    }
  }
  if (!skaters.length || !goalies.length) return null;
  return Object.assign({}, g, { skaters, goalies });
}

async function injuries() {
  const j = await E.getJSON(INJ);
  const out = { pulled: new Date().toISOString().slice(0, 16) + 'Z', teams: {} };
  for (const t of j.injuries || []) {
    const code = E.codeOf({ id: t.id }); if (!code) continue;
    out.teams[code] = (t.injuries || []).map(x => ({ id: String(x.athlete && x.athlete.id), name: x.athlete && x.athlete.displayName, pos: x.athlete && x.athlete.position && x.athlete.position.abbreviation, status: x.status, detail: (x.details && x.details.type) || null, returns: (x.details && x.details.returnDate) || null }));
  }
  fs.writeFileSync(path.join(DATA, 'injuries.json'), JSON.stringify(out));
  log(`injuries: ${Object.values(out.teams).reduce((a, l) => a + l.length, 0)} players on ${Object.keys(out.teams).length} clubs`);
}

async function main() {
  const from = +process.argv[2] || FROM_SEASON, to = +process.argv[3] || 9999;
  const wanted = finals(from, to);
  const bySeason = {}; for (const g of wanted) (bySeason[g.season] = bySeason[g.season] || []).push(g);
  let asked = 0, ok = 0, empty = 0;
  for (const season of Object.keys(bySeason).sort()) {
    const file = path.join(DATA, `box_${season}.jsonl`);
    const have = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
    const todo = bySeason[season].filter(g => !have.has(g.id));
    if (!todo.length) { log(`${season}: ${have.size} box scores, nothing new`); continue; }
    const lines = [];
    for (let i = 0; i < todo.length; i += 4) {
      const batch = await Promise.all(todo.slice(i, i + 4).map(async g => { asked++; try { const j = await E.getJSON(SUMMARY + g.id); ok++; return boxOf(j, g); } catch (e) { log(`${g.id} ${g.date}: ${e.message}`); return null; } }));
      for (const b of batch) { if (b) lines.push(JSON.stringify(b)); else empty++; }
      if (lines.length >= 200) { fs.appendFileSync(file, lines.join('\n') + '\n'); lines.length = 0; }
      await new Promise(r => setTimeout(r, 150));
    }
    if (lines.length) fs.appendFileSync(file, lines.join('\n') + '\n');
    log(`${season}: ${todo.length} games asked, file now ${fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length} box scores`);
  }
  if (asked && !ok) throw new Error('ESPN unreachable: no box score could be read');
  try { await injuries(); } catch (e) { log(`injuries: ${e.message}`); }
  log(`box scores: ${asked} asked, ${ok} read, ${empty} empty or failed`);
}
main().catch(e => { console.error(e); process.exit(1); });
