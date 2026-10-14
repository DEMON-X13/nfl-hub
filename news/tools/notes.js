/* The game notes: data/notes/<season>-w<week>.json, a one-sentence preview and a short news note for each
   game of a week, written each Wednesday by hand (HANDOFF.md) and read at runtime by X NFL Bets and Stats'
   Game snapshot, which shows them between the two teams and escapes every word. A game with no note shows
   an automatic line instead, so a file may leave games out.

     { "season": 2026, "week": 6, "written": "2026-10-14",
       "games": { "2026_06_SEA_DEN": { "preview": "... to get **Bo Nix** going.", "news": "...", "sources": ["ESPN", "Denver Post"] } } }

   Players in bold (the owner, 14 October 2026): every player named in a preview or news is written between
   two pairs of asterisks, **Pat Surtain II**, which the page draws in bold; players only, never a coach,
   coordinator, owner or executive. A pair is the page's own reading (BOLD below: 1 to 60 characters with no
   * inside, left to right); everything else stays plain text. Every rule but the markers' own reads the text
   without them (unmark): the lengths, the one sentence, its ending, the record, the betting words, the
   ranks and the dashes.

   The rules, each a failure or a warning (CLAUDE.md, "Checks block or warn"):
     failures  the shape: JSON that parses, season and week whole numbers and the file name's, written
               an ISO date or datetime, games an object keyed by the week's own nflverse game ids
               (betting/state.json's schedule, LA for the Rams), each with a preview string, news a string
               where given, sources an array of names where given.
     warnings  the wording: a preview one sentence of 40 to 200 characters ending in . ! or ?, with no
               record or score typed (the records are shown beside it, and a typed one goes stale); news
               at most 300 characters; in either, no betting words (a spread, in words or as a number:
               -3.5, -3½, or a whole one where a spread is written, "Indianapolis -7", "(-7)", "Line: IND
               -7", "at -3"; a favourite or underdog, the line, odds or a price like +150, a total,
               covering, a book's name, a bet or parlay: the notes are the games' story, the snapshot
               shows the market apart), none of the site's own ranks (tools/lib.js siteRankQuote: they
               move under a note that does not), no em dash or double dash; the bold: no markup but the
               pairs (an unpaired ** or a single *, a pair over 60 characters, a space just inside one,
               HTML, any other markdown), a name the site's files know as a player (players(): the
               Elo ratings' players, ranked or sidelined, and the Deep Dive's lineups) written outside a
               pair or only partly in one (the whole name, case-sensitive, longest first, so "Marvin
               Harrison Jr." is read before "Marvin Harrison"; a plain one straight after a role word
               (ROLE: owner, coach, coordinator, GM, general manager, president, executive, chairman,
               assistant, team doctor) is that person, not the player: "Bengals owner Mike Brown"), and
               a pair that is no player's: a head coach on the schedule (its away_coach and home_coach),
               a pair straight after a role word, and a team's city, nickname or code (TEAM_WORDS);
               sources short names, plain, no bold.
   The wording rules are warnings so the job never holds back the week's results, stats and Deep Dive over a
   note: the news smoke (tools/smoke.js) reports every note problem, failures included, as a warning. The
   Wednesday routine runs this --strict before it commits, so a note that breaks any rule is not committed.

     node tools/notes.js [--strict] [file...]      (from news/; default: every file in data/notes/)

   Exits 1 on any failure, and with --strict on any warning too. require('./notes').check(obj, { file,
   schedule, players, coaches }) gives { fails, warns } for one file: file its name, schedule { season,
   games: [{ game_id, week, away_coach, home_coach }] }; with no schedule, or one of another season, the keys
   are held to the id's form alone. players the names the player rule knows (checkFiles passes players());
   with none it is not run, so a check on made-up data names its own. coaches the names a pair may not hold,
   the schedule's coaches where not given. */
'use strict';
const fs = require('fs'), path = require('path');
const { siteRankQuote } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'data', 'notes');

/* a spread written as a whole number: only where a spread is written, after a team's name or code
   ("Indianapolis -7", "IND -7", "Jaguars -3"), "Line:" or "at" ("Colts at -3"), or alone in brackets
   ("Indianapolis (-7) hosts"), never a stat ("a -5 turnover margin", "Stroud (-2 yards)", "(-0.07 EPA)") or a
   score ("won 24-17"). A half point (-3.5, -3½) is one wherever it stands */
const TEAM_WORDS = ['Arizona', 'Atlanta', 'Baltimore', 'Buffalo', 'Carolina', 'Chicago', 'Cincinnati', 'Cleveland', 'Dallas', 'Denver',
  'Detroit', 'Green Bay', 'Houston', 'Indianapolis', 'Jacksonville', 'Kansas City', 'Las Vegas', 'Los Angeles', 'Miami', 'Minnesota',
  'New England', 'New Orleans', 'New York', 'Philadelphia', 'Philly', 'Pittsburgh', 'San Francisco', 'Seattle', 'Tampa Bay', 'Tennessee',
  'Washington', 'Cardinals', 'Falcons', 'Ravens', 'Bills', 'Panthers', 'Bears', 'Bengals', 'Browns', 'Cowboys', 'Broncos', 'Lions',
  'Packers', 'Texans', 'Colts', 'Jaguars', 'Jags', 'Chiefs', 'Raiders', 'Chargers', 'Rams', 'Dolphins', 'Vikings', 'Patriots', 'Pats',
  'Saints', 'Giants', 'Jets', 'Eagles', 'Steelers', '49ers', 'Niners', 'Seahawks', 'Buccaneers', 'Bucs', 'Titans', 'Commanders',
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'JAC', 'KC', 'LA', 'LAR',
  'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS', 'WSH'];
const STAT = '(?:%|(?:percent|yards?|yds|points?|pts|turnovers?|takeaways?|giveaways?|margin|differential|EPA|sacks?|plays?|a game|per game|in (?:the )?(?:turnover|point))\\b)';
const SPREAD_WHOLE = new RegExp(`(?:\\b(?:${TEAM_WORDS.join('|')})|\\b[Ll]ine:|\\b[Aa]t)\\s+[+−-]\\d{1,2}(?![\\d½]|[.,]\\d|\\s*${STAT})|\\(\\s*[+−-]\\d{1,2}\\s*\\)`);

/* the betting words: a note is the game's story, never its market. "Las Vegas" is a city, "on the line" and
   "the line of scrimmage" are football, and coverage is not covering */
const BETTING = [
  [/\bspreads?\b/i, 'spread'], [/\bfavou?r(?:ite|ites|ed)\b/i, 'favourite'], [/\bunderdogs?\b/i, 'underdog'],
  [/\bmoney ?lines?\b/i, 'moneyline'], [/\bodds\b/i, 'odds'], [/\bover\/under\b|\bO\/U\b|\b(?:take|took|taking|hit|hits|cash|cashed) the (?:over|under)\b/i, 'over/under'],
  [/\b(?:the|point|game) totals?\b/i, 'the total'], [/\bcover(?:s|ed|ing)?\b/i, 'cover'], [/\bATS\b/, 'ATS'],
  [/(?<!\bLas )\bVegas\b/i, 'Vegas'], [/\bsports ?books?\b/i, 'sportsbook'], [/\bDraft ?Kings\b/i, 'DraftKings'], [/\bFan ?Duel\b/i, 'FanDuel'],
  [/\bbet(?:s|ting|tor|tors)?\b/i, 'bet'], [/\bwager(?:s|ed|ing)?\b/i, 'wager'], [/\bparlays?\b/i, 'parlay'],
  [/(?<!\bon )\bthe line\b(?! of scrimmage)/i, 'the line'], [/\bjuice\b/i, 'juice'], [/\bvig(?:orish)?\b/i, 'vig'],
  [/(?:^|[\s(])[+−-]\d{3,4}\b/, 'a price like +150'], [/(?:^|[\s(])[+−-]\d{1,2}(?:\.5\b|½)/, 'a spread like -3.5'],
  [SPREAD_WHOLE, 'a spread like Indianapolis -7'],
];
const RECORD = /\b\d{1,2}[-–]\d{1,2}(?:[-–]\d{1,2})?\b/;
const NAME = /^(\d{4})-w(\d{1,2})\.json$/;
const ISO = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const FIELDS = new Set(['season', 'week', 'written', 'games']), GAME_FIELDS = new Set(['preview', 'news', 'sources']);
/* an abbreviation or an initial before a full stop does not end a sentence ("C.J. Stroud", "Jr.", "vs.") */
const ABBR = new Set(['jr', 'sr', 'st', 'mr', 'mrs', 'dr', 'vs', 'no', 'mt', 'ft', 'lt', 'gen', 'sgt', 'jan', 'feb', 'aug', 'sept', 'oct', 'nov', 'dec']);
function sentences(t) {
  let n = 1;
  for (const m of t.matchAll(/([A-Za-z.]*)([.!?])["'”’)]?\s+(?=["'“‘(]?[A-Z0-9])/g)) {
    const word = m[1].replace(/\.$/, '');
    if (m[2] === '.' && (/^(?:[A-Za-z]\.)*[A-Za-z]$/.test(word) || ABBR.has(word.toLowerCase()))) continue;
    n++;
  }
  return n;
}

/* a player's name in bold, **Pat Surtain II**: the page's own reading of a pair (nflbets/build/snapshot.html
   escapes the text, then draws each pair bold), 1 to 60 characters with no * inside, taken left to right */
const BOLD = /\*\*([^*]{1,60})\*\*/g;
/* the text as the page shows it, without the markers: { text, bold: [[start, end)] in text, pairs: the
   inner texts }. With bold false (the sources) nothing is a pair */
function unmark(raw, bold = true) {
  if (!bold) return { text: raw, bold: [], pairs: [] };
  let text = '', last = 0; const spans = [], pairs = [];
  for (const m of raw.matchAll(BOLD)) {
    text += raw.slice(last, m.index);
    spans.push([text.length, text.length + m[1].length]); pairs.push(m[1]);
    text += m[1]; last = m.index + m[0].length;
  }
  return { text: text + raw.slice(last), bold: spans, pairs };
}
/* any markdown but the pairs: a backtick, a [link](...), __ or _emphasis_, ~~, a # heading or > quote */
const MARKDOWN = /`|\[[^\]]*\]\([^)]*\)|__|~~|(?:^|\s)_[^_\s][^_]*_(?=$|[\s.,;:!?])|^\s*(?:#{1,6}|>)\s/;
/* a name stops at a letter, a digit or a hyphen: "Jaxon Smith" is not read inside "Jaxon Smith-Njigba" */
const NAME_EDGE = /[\p{L}\p{N}-]/u;
/* a role no player holds, read on the text just before a name: the name straight after it is that person's
   ("Bengals owner Mike Brown said", though a Mike Brown plays for New England), so it is never asked to be
   bold, and a pair there is a coach or another non-player in bold. "coach" takes "head coach" in */
const ROLE = /\b(?:owner|coach|coordinator|GM|general manager|president|executive|chairman|assistant|team doctor)\s+$/i;
/* a pair that is a team: a city, a nickname or a code, or a run of them ("Denver Broncos"), "the" before */
const TEAM_PAIR = new RegExp(`^(?:[Tt]he\\s+)?(?:${TEAM_WORDS.join('|')})(?:\\s+(?:${TEAM_WORDS.join('|')}))*$`);

/* the players named in u.text who are not wholly in a pair, in the text's order: [{ name, at, part }], part
   when some of the name is. names are matched whole and case-sensitive, longest first, and a name read once
   claims its place, so "Marvin Harrison Jr." is never read again as "Marvin Harrison". A name wholly plain
   straight after a role word (ROLE) is that person's and not listed */
function unbolded(u, names) {
  const t = u.text, claimed = [], out = [];
  for (const n of names) {
    for (let i = t.indexOf(n); i !== -1; i = t.indexOf(n, i + 1)) {
      const j = i + n.length;
      if (NAME_EDGE.test(t[i - 1] || '') || NAME_EDGE.test(t[j] || '')) continue;
      if (claimed.some(([a, b]) => i < b && j > a)) continue;
      claimed.push([i, j]);
      if (u.bold.some(([a, b]) => a <= i && j <= b)) continue;
      const part = u.bold.some(([a, b]) => i < b && j > a);
      if (!part && ROLE.test(t.slice(0, i))) continue;
      out.push({ name: n, at: i, part });
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

/* the wording rules all three texts share, read on u, the text without its markers (unmark); raw is the text
   as written. names the players the bold rule knows (none: not run), coaches the names a pair may not hold */
function wording(raw, u, at, warn, { names = null, coaches = null, bold = true } = {}) {
  const t = u.text;
  for (const [rx, what] of BETTING) { const m = rx.exec(t); if (m) warn(`${at}: betting language (${what}: "${m[0].trim()}")`); }
  const q = siteRankQuote(t); if (q) warn(`${at}: quotes the site's own ranks ("${q.trim()}")`);
  if (/—/.test(t)) warn(`${at}: an em dash`);
  if (/--/.test(t)) warn(`${at}: a double dash`);
  if (/<\/?[a-z!][^>]*>|&[a-z]+;|&#\d+;/i.test(t) || MARKDOWN.test(t)) warn(`${at}: markup (plain text but for a player's name in bold, **Bo Nix**: the page shows the rest as typed)`);
  if (/\*/.test(t)) {
    const long = bold && /\*\*[^*]{61,}\*\*/.exec(raw);
    warn(!bold ? `${at}: an asterisk (a source is a plain name, never bold)`
      : long ? `${at}: an unpaired ** or a bold pair over 60 characters ("${long[0].slice(0, 30)}...")`
      : `${at}: an unpaired ** or a single * (a player's name in bold is **Bo Nix**, two asterisks each side)`);
  }
  const sp = u.pairs.find(p => p !== p.trim()); if (sp != null) warn(`${at}: a space just inside a bold pair ("**${sp}**")`);
  let c = null;
  if (coaches && coaches.size) { c = u.pairs.find(p => coaches.has(p.trim())); if (c != null) warn(`${at}: a coach in bold ("${c.trim()}"; bold players only)`); }
  /* a pair that is no player's, read without the schedule's coaches (a week can find them stale): one straight
     after a role word, unless the schedule's coaches have already named it, and a team */
  const rk = u.pairs.findIndex((p, k) => p !== c && ROLE.test(t.slice(0, u.bold[k][0])));
  if (rk >= 0) warn(`${at}: a coach or other non-player in bold ("${u.pairs[rk].trim()}", straight after "${ROLE.exec(t.slice(0, u.bold[rk][0]))[0].trim()}"; bold players only)`);
  const tm = u.pairs.find(p => TEAM_PAIR.test(p.trim()));
  if (tm != null) warn(`${at}: a team in bold ("${tm.trim()}"; bold players only)`);
  if (names && names.length) {
    const miss = unbolded(u, names), whole = [...new Set(miss.filter(x => !x.part).map(x => x.name))], part = [...new Set(miss.filter(x => x.part).map(x => x.name))];
    /* only the name matched: the same name can be an owner's or a coach's, so the warning says so */
    if (whole.length) warn(`${at}: ${whole.length > 1 ? 'names the site knows as players' : 'a name the site knows as a player'}, not in bold (${whole.map(n => `"${n}"`).join(', ')}: if ${whole.length > 1 ? 'these are the players' : 'this is the player'}, write **${whole[0]}**)`);
    if (part.length) warn(`${at}: a player only partly in bold (${part.map(n => `"${n}"`).join(', ')}: the whole name goes inside the pair)`);
  }
  if (raw !== raw.trim()) warn(`${at}: space at an end`);
}

function check(obj, opts = {}) {
  const fails = [], warns = [], fail = m => fails.push(m), warn = m => warns.push(m);
  const file = opts.file ? path.basename(opts.file) : null, named = file && NAME.exec(file);
  if (file && !named) fail(`${file}: the name is not <season>-w<week>.json`);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { fail('not a JSON object'); return { fails, warns }; }
  for (const k of Object.keys(obj)) if (!FIELDS.has(k)) warn(`an unknown field "${k}" (the page reads season, week, written and games)`);
  const season = obj.season, week = obj.week;
  if (!Number.isInteger(season) || season < 2000) fail(`season ${JSON.stringify(season)} is not a season`);
  if (!Number.isInteger(week) || week < 1 || week > 22) fail(`week ${JSON.stringify(week)} is not a week`);
  if (named && (+named[1] !== season || +named[2] !== week)) fail(`season ${season} week ${week} in a file named ${file}`);
  if (typeof obj.written !== 'string' || !ISO.test(obj.written) || !isFinite(Date.parse(obj.written))) fail(`written ${JSON.stringify(obj.written)} is not an ISO date or datetime`);
  const G = obj.games;
  if (!G || typeof G !== 'object' || Array.isArray(G)) { fail('games is not an object keyed by game id'); return { fails, warns }; }
  /* the week's games: betting/state.json's schedule when it is of this season, else the id's own form */
  const S = opts.schedule;
  const ids = S && +S.season === season && Array.isArray(S.games) ? new Set(S.games.filter(g => +g.week === week).map(g => g.game_id)) : null;
  if (ids && !ids.size) fail(`betting/state.json's schedule has no week ${week} game`);
  /* the id's own form, made only from a season and a week that are whole numbers: they are the writer's own
     text, and one like "2026(" makes no pattern. Without them no key can be a game of the week */
  const form = Number.isInteger(season) && Number.isInteger(week) ? new RegExp(`^${season}_${String(week).padStart(2, '0')}_[A-Z]{2,3}_[A-Z]{2,3}$`) : null;
  /* the bold rule's names: the players given (whole names, longest first) and the coaches given, else the
     schedule's head coaches */
  const names = nameList(opts.players);
  const coaches = new Set(opts.coaches ? [...opts.coaches] : S && Array.isArray(S.games) ? S.games.flatMap(g => [g && g.away_coach, g && g.home_coach]) : []);
  coaches.forEach(c => { if (typeof c !== 'string' || !c.trim()) coaches.delete(c); });
  const rules = { names, coaches };
  for (const [id, g] of Object.entries(G)) {
    if (ids ? !ids.has(id) : !form) fail(`${id}: not a game of ${JSON.stringify(season)} week ${JSON.stringify(week)}${ids ? " in betting/state.json's schedule" : ' (the season and week are not numbers)'}`);
    else if (!ids && !form.test(id)) fail(`${id}: not a game of ${season} week ${week}`);
    if (!g || typeof g !== 'object' || Array.isArray(g)) { fail(`${id}: not an object`); continue; }
    for (const k of Object.keys(g)) if (!GAME_FIELDS.has(k)) warn(`${id}: an unknown field "${k}" (the page reads preview, news and sources)`);
    if (typeof g.preview !== 'string' || !g.preview.trim()) fail(`${id}: no preview`);
    else {
      const u = unmark(g.preview), t = u.text.trim(), n = t.length, k = sentences(t);
      if (n < 40 || n > 200) warn(`${id} preview: ${n} characters (40 to 200${u.pairs.length ? ', without the bold markers' : ''})`);
      if (!/[.!?]["'”’)]?$/.test(t)) warn(`${id} preview: does not end in . ! or ?`);
      if (k > 1) warn(`${id} preview: ${k} sentences (one)`);
      const r = RECORD.exec(t); if (r) warn(`${id} preview: a record or score typed ("${r[0]}"; the records are shown beside it)`);
      wording(g.preview, u, `${id} preview`, warn, rules);
    }
    if (g.news != null) {
      if (typeof g.news !== 'string') fail(`${id}: news is not text`);
      else if (g.news) {
        const u = unmark(g.news), n = u.text.length;
        if (n > 300) warn(`${id} news: ${n} characters (at most 300${u.pairs.length ? ', without the bold markers' : ''})`);
        wording(g.news, u, `${id} news`, warn, rules);
      }
    }
    if (g.sources != null) {
      if (!Array.isArray(g.sources) || g.sources.some(x => typeof x !== 'string' || !x.trim())) fail(`${id}: sources is not a list of names`);
      else for (const x of g.sources) { if (x.length > 40) warn(`${id} sources: "${x.slice(0, 50)}" is not a short name`); wording(x, unmark(x, false), `${id} sources`, warn, { bold: false }); }
    }
  }
  return { fails, warns };
}

/* names as the bold rule reads them: strings of two words or more (a whole name), each once, longest first */
function nameList(names) {
  if (!names || typeof names[Symbol.iterator] !== 'function' || typeof names === 'string') return [];
  const out = [...new Set([...names].filter(n => typeof n === 'string' && /\S\s+\S/.test(n.trim())).map(n => n.trim()))];
  return out.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
}

/* the names the site's files know as players: ../elo/data/players.json (players[].name, and every group's
   sidelined[].name: a ranked player out of the rankings, on injured reserve or out this week, is kept out of
   players, and past carries no name) and data/units.json's lineups (every who, out and next name the Deep Dive
   lists). Each file read on its own; [] when neither reads */
function players(files = [path.join(ROOT, '..', 'elo', 'data', 'players.json'), path.join(ROOT, 'data', 'units.json')]) {
  const names = new Set(), vals = x => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);
  const walk = x => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (!x || typeof x !== 'object') return;
    if (typeof x.n === 'string' && (x.id != null || x.pos != null)) names.add(x.n);
    Object.values(x).forEach(walk);
  };
  for (const file of files) {
    let o; try { o = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { continue; }
    if (!o || typeof o !== 'object') continue;
    for (const p of vals(o.players)) { if (p && typeof p.name === 'string') names.add(p.name); }
    for (const g of vals(o.groups)) for (const s of vals(g && g.sidelined)) { if (s && typeof s.name === 'string') names.add(s.name); }
    if (o.units) walk(o.units);
  }
  return nameList(names);
}

/* betting/state.json's schedule, the games a file's keys must be */
function schedule(file = path.join(ROOT, '..', 'betting', 'state.json')) {
  try { const s = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(s.schedule) ? { season: s.season, games: s.schedule } : null; }
  catch (e) { return null; }
}
/* every notes file, or the ones named: [{ file, fails, warns, games, of }] */
function checkFiles(files, sched = schedule(), names = players()) {
  if (!files) files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().map(f => path.join(DIR, f)) : [];
  return files.map(file => {
    let obj;
    try { obj = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { return { file, fails: [`does not read as JSON (${e.message})`], warns: [], games: 0, of: null }; }
    const r = check(obj, { file, schedule: sched, players: names });
    const of = sched && obj && +sched.season === obj.season ? sched.games.filter(g => +g.week === obj.week).length : null;
    return { file, ...r, games: obj && obj.games && typeof obj.games === 'object' ? Object.keys(obj.games).length : 0, of };
  });
}

module.exports = { check, checkFiles, schedule, players, unmark, sentences, BETTING, DIR };

if (require.main === module) {
  const args = process.argv.slice(2), strict = args.includes('--strict');
  const named = args.filter(a => a !== '--strict').map(a => path.resolve(a));
  const sched = schedule();
  if (!sched) console.log("note: ../betting/state.json has no schedule here, so each game id is held to its form alone");
  const names = players();
  if (!names.length) console.log("note: neither ../elo/data/players.json nor data/units.json reads here, so no player is held to the bold rule");
  const R = checkFiles(named.length ? named : null, sched, names);
  if (!R.length) { console.log(`no notes files in ${path.relative(process.cwd(), DIR) || DIR}`); process.exit(0); }
  let bad = 0;
  for (const r of R) {
    const rel = path.relative(process.cwd(), r.file) || r.file;
    console.log(`${r.fails.length ? 'FAIL' : r.warns.length ? (strict ? 'FAIL' : 'WARN') : 'ok  '} ${rel}: ${r.games}${r.of != null ? ` of ${r.of}` : ''} games, ${r.fails.length} failure(s), ${r.warns.length} warning(s)`);
    for (const m of r.fails) console.log('  FAIL ' + m);
    for (const m of r.warns) console.log(`  ${strict ? 'FAIL' : 'WARN'} ${m}`);
    if (r.fails.length || (strict && r.warns.length)) bad++;
  }
  console.log(bad ? `\n${bad} file(s) ${strict ? 'break the rules (--strict: warnings count)' : 'fail'}` : `\nall notes pass${strict ? ' (strict)' : ''}`);
  process.exit(bad ? 1 : 0);
}
