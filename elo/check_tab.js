/* The ELO Ratings tab's own gate: nflbets/build/tab_elo.html run in jsdom on elo/data, with the
 * page around it stubbed (the schedule, the clock, the shields), so what the tab does with the
 * files is checked on the job's run, before anything is committed.
 *
 *   node elo/check_tab.js                  (from the hub root; jsdom is borrowed from props/build)
 *   node elo/check_tab.js --data DIR --tab FILE      (tests: another build's files or tab)
 *
 * Each check is the tab's behaviour on any week's files, never this week's names:
 *   - a game that has kicked off leaves the Mismatches (it was promoted as this week's edge
 *     for a game already played), and a player's window says so;
 *   - a Mismatches bubble wears the same season shield as the player's ranking and badge
 *     (it wore the raw career rating's, so one card disagreed with itself);
 *   - a player the build counts out (out last week and not practising, say) is ruled out on
 *     the page, with the build's reason in his window;
 *   - the rankings say how far the season has got as the build words it, a questionable
 *     player carries a Q, and the bar splits the ELO Model's record into calls made before
 *     kickoff and backtest;
 *   - every ranked player has a trend line, one game in too (week 1's column was blank);
 *   - a player kept out of the players map is priced by nothing, but the Prop Record still
 *     reads the rating he took into each week he played (it graded those weeks at 1500);
 *   - Overall Offense and Overall Defense are two pills in the position row, each opening a table
 *     of the 32 teams in the file's rank order, ratings never rising, each with a shield, every
 *     stat's value and league rank the file's; the text gives the file's weights (summing to 100,
 *     and a copy with other weights shows those, so the page cannot carry its own) and names the
 *     stats that weigh nothing; a column sorts best first and back, # keeping the overall rank; a
 *     team's window lists every stat, its line, and its coming opponent when the file calls one;
 *     Close and Escape shut it; and a model.json from before the stats still draws the old columns;
 *   - Run Defense, Pass Defense and Pass Rush, and their offense sides Run Offense, Pass Offense and
 *     Pass Protection (16 October 2026, the owner's asks), the file's own position tables
 *     (`units.tables`, each with its side `of` and its `pair`, the other side of its facet on the same
 *     stats), are pills with those two in two rows that read as offense and defense: "Offense", then
 *     Overall Offense and the offense tables, and "Defense", then Overall Defense and the defense
 *     tables, each in the file's order and named as it names them; each table held to all of the
 *     above on its own stats, its window's coming opponent its pair's rank (Run Defense's opponent in
 *     Run Offense), and its text giving the pair's walk-forward test and its own alone from the file,
 *     never that a rating alone was scored where the file has no such test; a file with the defense
 *     tables and no pair (every build of 16 October 2026 before the offense tables) draws them as it
 *     did, its opponent's Overall Offense rank said so; a file without the tables (every build before
 *     them) draws exactly the two pills;
 *   - each club's line starts at its own start from the file; a club with no game yet this season
 *     (a copy of the file with one made so) is ranked and shown on its carried rating, marked
 *     "carried from" the season the file names, on the curve, with its window saying so, and the
 *     text gives the carried share; a file from before the carry (one start a side, no carry)
 *     still draws, its lines from that start, with no carried mark and no carry in the text;
 *   - the team table scrolls sideways inside its card at a desktop width, not only on a phone: it, or
 *     a box between it and the card, has overflow-x auto by a rule outside any media query (fifteen
 *     columns ran past the card at 1280 px and the whole page scrolled), and the team column can
 *     stick in that box: nothing between them clips, as the page's own rule clips every table. The
 *     page's stylesheet (props/build/part1.html) goes round the tab for this. jsdom lays nothing
 *     out and reads only the rules a desktop screen gets, so this is the style, not a measured width;
 *   - the money the files feed, on every rated player and every matchup line in them: market + form
 *     (eloAltP, which decides whether a player leg qualifies for the Parlay Builder's suggestions),
 *     the Elo matchup chance (eloMatchupP) and the Elo picks (eloPicks: the candidates the rule's,
 *     worked out here, ranked on value, what the levels are searched from the 30 best by value and
 *     the 10 likeliest by the Elo chance, each once (18 October 2026); Suggested Parlays' four levels,
 *     each at the builder's own sums, parlayProb on the Elo chances and parlayDec, compiled here from
 *     the props parts' own source, its floor held, a level marked the likeliest only under its floor,
 *     and none worse than the best parlay of its size whose legs are all in different games; and the
 *     tab's fast sums, the search's, parlayProb's and parlayDec's to the bit on the levels and 240
 *     parlays of the candidates, many with legs of one game), on made-up book prices, with no error
 *     thrown or logged;
 *   - the Elo picks' four levels (17 October 2026) on made-up players, games, prices, nudges and
 *     correlations of the check's own, so it holds in any week: the candidates the rule's, a -115 main
 *     line of the better value leading a +150 touchdown (never plus money first), every line the rule
 *     refuses refused; every level Suggested Parlays' rule on the Elo chance worked out in full over
 *     every parlay of its size by the builder's own sums (the best return over the floor, Safe's the
 *     Elo picks' own 35% since 18 October 2026, else the likeliest, marked so), legs of one game taken
 *     and priced together, and a
 *     level with too few candidates empty, saying why;
 *   - the search's quality (18 October 2026, after a review found the levels several percent short of
 *     the best on a one-game slate, and both gates passing with the search cut to one parlay): on two
 *     sets of made-up candidates where the first search went wrong, every level the rule worked out in
 *     full by the builder's own sums, and the tab's fast sums those sums to the bit on every parlay:
 *     F3, ten legs of one game that move together (the stress harness's seed 303, its 22nd set), whose
 *     quick reading misorders parlays so that the first search marked Aggressive "the likeliest 4 legs"
 *     at 12.03%, over its 12% floor, and with one parlay worked picked a worse one; F4, six legs of one
 *     game that move together strongly, which the quick reading overrates, and three games of one leg
 *     each, where the likeliest four legs are one of each game, a parlay the first search reached only
 *     as its best parlay of legs all in different games; and F6, the search's pruning and bounds near the
 *     floors, on twenty seeded one-game slates of 9 to 12 legs whose chances cluster where each level's
 *     floor falls, every level held to every parlay of its size worked out in full (a review planted two
 *     slips, a partial parlay pruned at the floor itself and the price-first pass reading the quick
 *     chance as its most, which passed every other check);
 *   - each unit's Elo picks (app v118, the owner's call of 19 October 2026: "I would like it to have ELO picks for the
 *     slot of Sunday games"): window.eloUnit, which Suggested Parlays draws in each night game and in the Sunday slot,
 *     on the files for each game of the matchups' week with lines and for that week's Sunday games before 7 pm Eastern
 *     together (from the published payload's schedule), and on the check's own games (F1 and F2: a game alone and two
 *     as a slot): the candidates the rule's on those games' legs alone, every level the rule worked out in full by the
 *     builder's own sums (or held as the week's are, past a size), an empty level handed over saying why "in this game"
 *     or "in the Sunday slot", all of it the same with the Parlay Builder's ticks planted to nothing (eloPicks() too,
 *     over every game), and null until the ratings and the matchups are both in;
 *   - the Mismatches bubbles' words (18 October 2026): what an edge ranks is the matchup formula's units
 *     by their players' Elo ("vs the LAC secondary and defensive line, 32nd by player Elo"), never "a
 *     pass defense ranked", which on the page is the ELO Ratings tab's Pass Defense table. Since October 2026 the whole page's smoke
 *     (nflbets/build/smoke.js) runs after the Elo job's commit, so this is the gate on the files
 *     reaching the code that touches a chance or a price.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const DATA = arg('--data') || path.join(ROOT, 'elo', 'data');
const TAB = fs.readFileSync(arg('--tab') || path.join(ROOT, 'nflbets', 'build', 'tab_elo.html'), 'utf8');
const { JSDOM, VirtualConsole } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const P = read('players.json'), M = read('model.json');
const MU0 = fs.existsSync(path.join(DATA, 'matchups.json')) ? read('matchups.json') : null;

const fails = []; let checks = 0; const notes = [];
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const wait = ms => new Promise(r => setTimeout(r, ms));
/* the tab's own word on whether a game has kicked off (a tab without it says no game ever has) */
const on = (w, gid) => typeof w.eloGameOn === 'function' ? w.eloGameOn(gid) : false;
/* the page's stylesheet, round the tab as on the site: a page-wide rule counts (every table is
   clipped there, for its rounded corners) */
const P1 = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part1.html'), 'utf8');
const PAGE_CSS = P1.includes('<style>') ? P1.slice(P1.indexOf('<style>'), P1.indexOf('</style>') + 8) : '';
/* an element's overflow both ways (jsdom keeps the shorthand apart from the longhands) */
const ov = (w, el) => { const c = w.getComputedStyle(el), o = c.getPropertyValue('overflow').trim().split(/\s+/).filter(Boolean);
  return [c.getPropertyValue('overflow-x') || o[0] || 'visible', c.getPropertyValue('overflow-y') || o[1] || o[0] || 'visible']; };
/* the box the team table scrolls in at a desktop width: the table itself or one between it and its
   card (the card scrolling would take its heading and text with it) */
const scroller = (w, card) => { const t = card && card.querySelector('table.pe-tt');
  for (let el = t; el && el !== card; el = el.parentElement) if (/^(auto|scroll)$/.test(ov(w, el)[0])) return el;
  return null; };
/* the team column sticks in that box only when nothing between them is a box of its own: any
   overflow but visible makes one, and a clipped table never scrolls, so the column never moves */
const sticks = (w, card) => { const sc = scroller(w, card), td = card && card.querySelector('tbody td.pe-tm');
  if (!sc || !td || w.getComputedStyle(td).getPropertyValue('position') !== 'sticky') return false;
  for (let el = td.parentElement; el && el !== sc; el = el.parentElement) if (ov(w, el).some(v => !/^(visible|clip)$/.test(v))) return false;
  return true; };

/* ---- the builder's own sums, from the props parts' own source ----
   The Elo picks' levels are priced as the builder prices a parlay: parlayProb (props/build/part2.js) on the
   legs at their Elo chances and parlayDec (part3.js) on their prices, a game's legs together. Those, and what
   they stand on, are read from the parts' source by name and compiled twice: into the tab's page (as the hub
   page has them) and here, on their own, with a correlation table of the check's (sumsOwn), so every number
   the check holds a level to is worked out apart from the page. Suggested Parlays' levels (PB_TIERS) and the
   builder's order (pbOrder) come with them. */
const PART2 = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8'), PART3 = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part3.js'), 'utf8');
function srcOf(src, head) {
  const i = src.indexOf(head); if (i < 0) throw new Error('the props parts no longer have ' + head);
  if (/^function /.test(head)) { let j = src.indexOf('{', i), depth = 0;
    for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1); } }
  else { let depth = 0; for (let j = i; j < src.length; j++) { const c = src[j]; if ('{[('.includes(c)) depth++; else if ('}])'.includes(c)) depth--; else if (c === ';' && depth === 0) return src.slice(i, j + 1); } }
  throw new Error('could not read ' + head + ' from the props parts');
}
const SUMS_SRC = [[PART2, 'const clip='], [PART2, 'const TOTAL_RHO='], [PART2, 'function isGameLeg('], [PART2, 'function legRho('], [PART2, 'function invNorm('],
  [PART2, 'function cholesky('], [PART2, 'function mulberry('], [PART2, 'function parlayProb('], [PART2, 'function mlProb('], [PART3, 'function mlToDec('],
  [PART3, 'const SGP_HOLD='], [PART3, 'function parlayDec('], [PART3, 'const PB_TIERS='], [PART3, 'const pbOrder=']].map(([s, h]) => srcOf(s, h)).join('\n');
const sumsOwn = corr => new Function('PAY', SUMS_SRC + '\nreturn {parlayProb,parlayDec,pbOrder,PB_TIERS,mlProb,mlToDec,legRho};')({ corr: corr || {} });
/* the same into a tab's page, with its PAY's correlation table */
const sumsInto = (w, corr) => { w.eval(`var PAY={corr:${JSON.stringify(corr || {})}};\n${SUMS_SRC.replace(/^const /gm, 'var ')}`); };   /* a top-level const in eval'd code is the eval's own: var makes it the page's */
/* the published payload's correlation table, the one the page prices same-game legs with */
const CORR = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8')).corr || {}; } catch (e) { return {}; } })();
/* (app v118) and its schedule, whose dates and kickoffs (Eastern) say which of a week's games are its Sunday slot */
const SCHED = (() => { try { const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8')).sched; return Array.isArray(s) ? s : []; } catch (e) { return []; } })();
/* a leg for every matchup line in a matchups file, over and under, at -110 and +150: what the checks price the files on */
const linesOf = MU => { const legs = [];
  for (const [pid, pl] of Object.entries((MU && MU.players) || {})) for (const st of Object.keys(pl.stats || {})) {
    const proj = (pl.stats[st] || [])[1], k = isFinite(proj) ? Math.floor(proj) + 0.5 : 0.5;
    for (const side of ['over', 'under']) for (const price of [-110, 150])
      legs.push({ key: `${pl.game_id}|${pid}|${st}`, gid: pl.game_id, pid, stat: st, grp: pl.group, k, side, price, src: 'real', name: pid, label: st }); }
  return legs; };
/* the page's pricedLegs stood in by a list of legs, answering for the games it is asked about as the props parts' does */
const PRICED_BY = name => `function pricedLegs(games){ const G=games?new Set(games.map(g=>g.id)):null; return window.${name}.filter(l=>!G||G.has(l.gid)).map(l=>Object.assign({},l)); }`;
/* F6's correlation table, the check's own: the published payload's pairs of two players of one game among the stats
   its slates draw, as they stood on 18 October 2026 (so only a code change can fail it) */
const CORR_F6 = {
  'team|QB:passing_yards|RB:rushing_yards': -0.11, 'team|QB:passing_yards|RB:receptions': 0.118, 'team|QB:passing_yards|WR:receptions': 0.305, 'team|QB:passing_yards|WR:receiving_yards': 0.353,
  'team|QB:passing_yards|WR:any_td': 0.163, 'team|QB:passing_yards|TE:receiving_yards': 0.229, 'team|QB:passing_yards|TE:any_td': 0.095, 'team|QB:passing_tds|RB:rushing_yards': 0.03,
  'team|QB:passing_tds|RB:scrim_yards': 0.056, 'team|QB:passing_tds|WR:receptions': 0.116, 'team|QB:passing_tds|WR:receiving_yards': 0.167, 'team|QB:passing_tds|WR:any_td': 0.323,
  'team|QB:passing_tds|TE:receiving_yards': 0.1, 'team|QB:passing_tds|TE:any_td': 0.246, 'team|QB:completions|RB:rushing_yards': -0.148, 'team|QB:completions|RB:scrim_yards': -0.033,
  'team|QB:completions|RB:receptions': 0.261, 'team|QB:completions|WR:receptions': 0.335, 'team|QB:completions|WR:receiving_yards': 0.233, 'team|QB:completions|WR:any_td': 0.088,
  'team|QB:completions|TE:receiving_yards': 0.194, 'team|QB:completions|TE:any_td': 0.066, 'team|RB:rushing_yards|RB:scrim_yards': -0.04, 'team|RB:receptions|RB:rushing_yards': -0.099,
  'team|RB:rushing_yards|WR:receptions': -0.054, 'team|RB:rushing_yards|WR:receiving_yards': -0.037, 'team|RB:scrim_yards|RB:scrim_yards': -0.034, 'team|RB:receptions|RB:scrim_yards': -0.083,
  'team|RB:scrim_yards|WR:receptions': -0.046, 'team|RB:scrim_yards|WR:receiving_yards': -0.039, 'team|RB:receptions|WR:receptions': 0.04, 'team|WR:receiving_yards|WR:receiving_yards': -0.038,
  'team|TE:any_td|WR:receiving_yards': 0.03, 'team|WR:any_td|WR:any_td': -0.032, 'team|TE:receiving_yards|WR:any_td': 0.034, 'team|TE:receiving_yards|TE:receiving_yards': -0.032,
  'opp|QB:passing_yards|QB:passing_yards': 0.094, 'opp|QB:passing_tds|QB:passing_yards': 0.148, 'opp|QB:completions|QB:passing_yards': 0.04, 'opp|QB:passing_yards|WR:receptions': 0.036,
  'opp|QB:passing_yards|WR:receiving_yards': 0.064, 'opp|QB:passing_yards|WR:any_td': 0.099, 'opp|QB:passing_yards|TE:any_td': 0.038, 'opp|QB:passing_tds|QB:passing_tds': 0.085,
  'opp|QB:completions|QB:passing_tds': 0.154, 'opp|QB:passing_tds|RB:rushing_yards': -0.047, 'opp|QB:passing_tds|RB:receptions': 0.038, 'opp|QB:passing_tds|WR:receptions': 0.076,
  'opp|QB:passing_tds|WR:receiving_yards': 0.07, 'opp|QB:passing_tds|WR:any_td': 0.059, 'opp|QB:passing_tds|TE:receiving_yards': 0.058, 'opp|QB:passing_tds|TE:any_td': 0.031,
  'opp|QB:completions|QB:completions': -0.037, 'opp|QB:completions|RB:scrim_yards': -0.033, 'opp|QB:completions|RB:receptions': -0.043, 'opp|QB:completions|WR:any_td': 0.113,
  'opp|QB:completions|TE:any_td': 0.035, 'opp|RB:rushing_yards|RB:rushing_yards': -0.102, 'opp|RB:rushing_yards|RB:scrim_yards': -0.102, 'opp|RB:scrim_yards|RB:scrim_yards': -0.097,
  'opp|RB:receptions|RB:receptions': -0.032, 'opp|RB:receptions|TE:receiving_yards': -0.03, 'opp|WR:any_td|WR:receptions': 0.051, 'opp|TE:any_td|WR:receptions': 0.032,
  'opp|WR:receiving_yards|WR:receiving_yards': 0.035, 'opp|WR:any_td|WR:receiving_yards': 0.05, 'opp|TE:any_td|WR:receiving_yards': 0.039, 'opp|TE:receiving_yards|WR:any_td': 0.034 };
/* the Elo picks' rule, the check's own copy (tab_elo.html, EP and eloCands): a rated player, a trusted stat, a
   real price (or one from DraftKings' line read by Refresh odds) from -200 to +300, the Elo chance 30% or more and
   its expected return above 0, one leg a player (his best by value, the main line on a tie, then the lower id),
   ranked on value; what the levels are searched from, the 30 best by value and the 10 likeliest by the Elo chance
   (the better value, then the lower id, on a tie), each once, ranked on value (until 18 October 2026 the 30 best
   by value alone, so a heavy favourite of thin value was cut before the likeliest pair could see him); never plus
   money first (until 17 October 2026 the picks were the first of a list sorted plus money first, so an anytime
   touchdown filled them) */
const EPC = { lo: -200, hi: 300, floor: 0.30, vig: 1.045, cap: 30, capP: 10, safe: 0.35 };
/* the Elo picks' levels, the check's own copy: Suggested Parlays' (PB_TIERS), Safe given the Elo picks' own floor,
   35%, so it is the best value over it like the others (the owner's call of 18 October 2026, "yeah safe picked on
   value too"; until then Safe was the likeliest pair) */
const tiersOwn = LV => LV.map(t => t[3] ? t : [t[0], t[1], t[2], EPC.safe]);
const erfC = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const PhiC = z => 0.5 * (1 + erfC(z / Math.SQRT2));
const invPhiC = p => { let lo = -9, hi = 9; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (PhiC(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
const idC = l => l.key + '|' + l.side + '|' + l.k, cmpC = (a, b) => a < b ? -1 : a > b ? 1 : 0;
/* a leg's Elo chance worked out here: the book's chance, its 4.5% margin out, moved by the matchup's nudge in
   the stat's typical miss toward the side it favours, on a stat the matchup has earned; null where it has none */
function eloPOwn(MU, l, imp) {
  const pl = MU && MU.players && MU.players[l.pid], a = pl && pl.stats && pl.stats[l.stat]; if (!a) return null;
  const r = MU.record && MU.record[pl.group + '|' + l.stat], q = r && r.past; if (!(q && q.rmse_elo < q.rmse_form && q.right_top >= 0.53)) return null;
  const f = MU.fit && MU.fit[pl.group + '|' + l.stat]; if (!f || !(f.sd > 0)) return null;
  const fair = Math.min(0.99, Math.max(0.01, imp / EPC.vig));
  return PhiC(invPhiC(fair) + (l.side === 'under' ? -1 : 1) * a[2] / f.sd);
}
/* the candidates by that rule from a list of legs: {all, kept} (every player's best, ranked; what the levels are
   searched from) */
function candsOwn(legs, MU, players, sums) {
  const c = [];
  for (const l of legs) {
    if (l.grp === 'TEAM' || !(l.src === 'real' || l.src === 'dkline') || !isFinite(l.price) || l.price < EPC.lo || l.price > EPC.hi) continue;
    if (!players[l.pid]) continue;
    const imp = sums.mlProb(l.price), dec = sums.mlToDec(l.price); if (!(imp > 0 && imp < 1) || !(dec > 1)) continue;
    const pe = eloPOwn(MU, l, imp); if (pe == null) continue;
    const ev = pe * dec - 1; if (pe >= EPC.floor && ev > 0) c.push({ ...l, pe, ev });
  }
  c.sort((a, b) => (b.ev - a.ev) || ((b.main ? 1 : 0) - (a.main ? 1 : 0)) || cmpC(idC(a), idC(b)));
  const all = [], seen = new Set(); for (const l of c) if (!seen.has(l.pid)) { seen.add(l.pid); all.push(l); }
  const likely = [...all].sort((a, b) => (b.pe - a.pe) || (b.ev - a.ev) || cmpC(idC(a), idC(b))).slice(0, EPC.capP), keep = new Set([...all.slice(0, EPC.cap), ...likely]);
  return { all, kept: all.filter(l => keep.has(l)), byValue: all.slice(0, EPC.cap), likely };
}
/* every parlay of each level's size from the candidates, worked in full with the builder's own sums (sums: the
   check's own copy), and each level chosen as Suggested Parlays chooses on the Elo chance, on the Elo picks' floors
   (tiersOwn: Safe's 35% too): the best expected return (chance times price) over the floor, else the likeliest of
   its size (likeliest); a tie to the lower ids. legs: the page's candidates (their Elo chances, so the sums
   are the page's to the bit) */
function levelsOwn(cands, sums) {
  const out = [], memo = new Map();
  const subsets = (n, start, cur, f) => { if (cur.length === n) { f(cur); return; } for (let i = start; i <= cands.length - (n - cur.length); i++) subsets(n, i + 1, cur.concat(i), f); };
  const sumOf = ids => { const k = ids.join(','); let e = memo.get(k); if (e) return e;
    const L = sums.pbOrder(ids.map(i => cands[i])); e = { legs: L, p: sums.parlayProb(L.map(l => ({ ...l, p: l.pe }))).corr, dec: sums.parlayDec(L.map(l => ({ leg: l, ml: l.price }))), id: L.map(idC).sort().join(',') }; memo.set(k, e); return e; };
  for (const [id, label, n, floor] of tiersOwn(sums.PB_TIERS)) {
    if (cands.length < n) { out.push({ id: 'elo-' + id, label, n, floor, none: true }); continue; }
    let best = null, likely = null;
    subsets(n, 0, [], ids => { const e = sumOf(ids);
      if (!likely || e.p > likely.p || (e.p === likely.p && e.id < likely.id)) likely = e;
      if (floor && e.p >= floor) { const s = e.p * e.dec; if (!best || s > best.s || (s === best.s && e.id < best.e.id)) best = { e, s }; } });
    const r = floor ? (best ? best.e : likely) : likely;
    out.push({ id: 'elo-' + id, label, n, floor, legs: r.legs, p: r.p, dec: r.dec, likeliest: !!floor && !best });
  }
  out.sums = [...memo.values()];   /* every parlay worked, its legs in the builder's order and its sums */
  return out;
}
/* the tab's fast sums (window.eloSums, the search's own) on parlays of the page's candidates C, held to the props
   parts' sums worked here (each {legs, p, dec}): the problems, at most a few */
function fastOff(w, C, worked) {
  const bad = []; let got;
  try { got = w.eloSums(C, worked.map(e => e.legs)); } catch (err) { return ['threw ' + err.message]; }
  worked.forEach((e, i) => { const g = got[i]; if (!g || g.p !== e.p || g.dec !== e.dec) bad.push(`${e.legs.map(l => l.pid).join('+')}: ${g ? g.p + ' at ' + g.dec : 'none'}, the sums ${e.p} at ${e.dec}`); });
  return bad;
}

/* ---- (app v118) each unit's Elo picks: window.eloUnit ----
   Suggested Parlays draws each unit's own Elo picks, a night game's or the Sunday slot's (a week's Sunday games before
   7 pm Eastern, together), from window.eloUnit(the unit's game ids, {where}): the ELO tab's four levels on those games'
   legs alone, whatever the Parlay Builder's ticks say (the owner's call of 19 October 2026: until then the picks were one
   set over the games and player sides ticked on the Parlay Builder tab, and a reader with the priced games unticked saw
   them empty all of Sunday 18 October 2026). unitHeld holds a page to it on a list of legs (the page's pricedLegs stood in
   by them, as the checks above stand it in) and units ({lab, gids, where}): the candidates the rule's on the unit's
   games' legs alone (candsOwn), every one of those games; Suggested Parlays' four levels on the Elo picks' floors, each
   the rule worked out in full by the builder's own sums over every parlay of its size (levelsOwn) where the candidates
   make at most UNIT_FULL parlays, else held as the week's levels are above (its legs the candidates', one a player, in
   the builder's order, at the builder's own sums, over its floor or the likeliest only under it, and never worse than the
   best parlay of its size whose legs are all in different games); an empty level handed over with no legs, exactly
   {id, label, n, floor, why}, saying why in the unit's own words ("Only 2 players in this game qualify: this level takes
   3.", "... in the Sunday slot ...") by the count of players who qualify; eloUnit's levels eloPicks' own on the same
   games; and then all of it again with the Parlay Builder's ticks planted to nothing (no game, no bet type, no player
   side: pbAllows and pbPlayerSides refusing everything, S.ui.pb unticked), put back after on every path. Returns how many
   levels it held worked out in full and how many empty (full, empty) */
const UNIT_FULL = 2500;
const binom = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r); };
function unitHeld(nm, w, legs, MU, players, corr, units) {
  const sums = sumsOwn(corr), ok01 = v => typeof v === 'number' && isFinite(v) && v > 0 && v < 1, memo = new Map();
  let full = 0, empty = 0;
  const one = (u, tag) => {
    const lab = `${nm}, ${u.lab}${tag}`, uLegs = legs.filter(l => u.gids.includes(l.gid)), own = candsOwn(uLegs, MU, players, sums);
    let r, rp; try { r = w.eloUnit(u.gids, { where: u.where }); rp = w.eloPicks({ games: u.gids, where: u.where }); } catch (err) { r = 'threw ' + err.message; }
    if (!r || typeof r !== 'object' || !Array.isArray(r.tiers) || !rp || !Array.isArray(rp.cands) || !Array.isArray(rp.tiers)) {
      chk(false, `${lab}: window.eloUnit does not build the unit's Elo picks on the files: ${typeof r === 'string' ? r : JSON.stringify(r)}`); return; }
    const C = rp.cands, N = own.all.length;
    chk(r.candidates === N && C.map(idC).join() === own.kept.map(idC).join() && C.every((l, i) => Math.abs(l.pe - own.kept[i].pe) < 1e-6) && C.every(l => u.gids.includes(l.gid)),
      `${lab}: the Elo picks' candidates are not the rule's on the unit's games' legs alone: ${C.map(l => l.pid + ' ' + l.stat + ' ' + l.gid.slice(-7)).join(', ') || 'none'} of ${r.candidates}; the rule ${own.kept.map(l => l.pid + ' ' + l.stat + ' ' + l.gid.slice(-7)).join(', ') || 'none'} of ${N}`);
    const LT = tiersOwn(sums.PB_TIERS);
    chk(r.tiers.length === LT.length && r.tiers.every((t, i) => t && t.id === 'elo-' + LT[i][0] && t.label === LT[i][1] && t.n === LT[i][2] && t.floor === LT[i][3])
      && rp.tiers.length === r.tiers.length && r.tiers.every((t, i) => (t.legs ? t.legs : []).map(idC).join() === (rp.tiers[i].legs || []).map(idC).join()),
      `${lab}: window.eloUnit does not hand over Suggested Parlays' four levels on the Elo picks' floors, eloPicks' own on the unit's games: ${r.tiers.map(t => t && t.id + ' ' + t.n + ' ' + t.floor).join(', ')}`);
    const key = u.gids.join() + '|' + C.map(idC).join(), size = LT.reduce((a, t) => a + binom(C.length, t[2]), 0);
    if (!memo.has(key)) memo.set(key, size <= UNIT_FULL ? levelsOwn(C, sums) : null);
    const want = memo.get(key); if (want && !tag) full += want.filter(t => !t.none).length;
    for (const t of r.tiers) {
      if (!t) continue;
      if (C.length < t.n) { const why = `Only ${N} player${N === 1 ? '' : 's'} ${u.where} qualif${N === 1 ? 'ies' : 'y'}: this level takes ${t.n}.`; if (!tag) empty++;
        chk(Object.keys(t).sort().join() === 'floor,id,label,n,why' && t.why === why, `${lab}: the ${t.label} Elo pick, with ${C.length} candidates, is not handed over empty saying why ${u.where} ("${why}"): ${JSON.stringify(t)}`); continue; }
      if (want) { const f = want.find(x => x.id === t.id);
        chk(!!f && Array.isArray(t.legs) && t.legs.map(idC).join() === f.legs.map(idC).join() && t.p === f.p && t.dec === f.dec && !!t.likeliest === f.likeliest,
          `${lab}: the ${t.label} Elo pick is not Suggested Parlays' rule on the Elo chance worked out in full on the unit's candidates: it holds ${Array.isArray(t.legs) ? t.legs.map(l => l.pid).join(', ') + ' at ' + t.p + ', ' + t.dec + (t.likeliest ? ' (likeliest)' : '') : JSON.stringify(t)}, the rule ${f ? f.legs.map(l => l.pid).join(', ') + ' at ' + f.p + ', ' + f.dec + (f.likeliest ? ' (likeliest)' : '') : 'none'}`);
        continue; }
      const L = Array.isArray(t.legs) ? sums.pbOrder(t.legs) : [], p = L.length ? sums.parlayProb(L.map(l => ({ ...l, p: l.pe }))).corr : NaN, dec = L.length ? sums.parlayDec(L.map(l => ({ leg: l, ml: l.price }))) : NaN;
      chk(L.length === t.n && t.legs.every((l, i) => idC(l) === idC(L[i])) && t.legs.every(l => C.some(c => idC(c) === idC(l))) && new Set(t.legs.map(l => l.pid)).size === t.n
        && ok01(t.p) && t.p === p && t.dec === dec && (!t.floor || t.likeliest || t.p >= t.floor) && (!t.likeliest || (t.floor > 0 && t.p < t.floor)),
        `${lab}: the ${t.label} Elo pick is not ${t.n} of the unit's candidates, one a player, in the builder's order, at the builder's own sums on their Elo chances and prices, over its floor: ${t.p} at ${t.dec}, the sums ${p} at ${dec}`);
      let best = null; const go = (s0, cur) => { if (cur.length === t.n) { if (new Set(cur.map(l => l.gid)).size !== t.n) return; const pp = cur.reduce((a, l) => a * l.pe, 1), dd = cur.reduce((a, l) => a * sums.mlToDec(l.price), 1);
          if (t.floor && pp < t.floor) return; const sc = t.floor ? pp * dd : pp; if (!best || sc > best.sc) best = { sc, cur }; return; }
        for (let i = s0; i <= C.length - (t.n - cur.length); i++) go(i + 1, cur.concat(C[i])); };
      go(0, []);
      chk(!best || (t.floor && t.likeliest ? false : (t.floor ? t.p * t.dec : t.p) >= best.sc * (1 - 1e-9)),
        `${lab}: the ${t.label} Elo pick is worse than ${best && best.cur.map(l => l.pid + ' ' + l.stat).join(', ')}, legs all in different games`); }
  };
  for (const u of units) one(u, '');
  /* the Parlay Builder's ticks planted to nothing, and put back */
  const had = { pbAllows: Object.prototype.hasOwnProperty.call(w, 'pbAllows') ? w.pbAllows : undefined, pbPlayerSides: Object.prototype.hasOwnProperty.call(w, 'pbPlayerSides') ? w.pbPlayerSides : undefined },
    ui = JSON.stringify(w.eval('S.ui.pb === undefined ? null : S.ui.pb'));
  try {
    w.pbAllows = () => false; w.pbPlayerSides = () => false;
    w.eval(`S.ui.pb={k:{ml:false,ats:false,total:false,over:false,under:false},off:${JSON.stringify([...new Set(legs.map(l => l.gid))])},open:false};`);
    for (const u of units) one(u, ' (the Parlay Builder\'s ticks planted to nothing)');
  } finally {
    for (const k of Object.keys(had)) { if (had[k] === undefined) delete w[k]; else w[k] = had[k]; }
    w.eval(ui === 'null' ? 'delete S.ui.pb;' : `S.ui.pb=${ui};`); }
  return { full, empty };
}

/* the page around the tab: the week's schedule with kickoffs on a clock the test moves */
function page(MU, opts) {
  const style = TAB.slice(TAB.indexOf('<style>'), TAB.indexOf('</style>') + 8);
  const section = TAB.slice(TAB.indexOf('<section id="tab-elo"'), TAB.indexOf('</section>') + 10);
  const script = TAB.slice(TAB.indexOf('<script>') + 8, TAB.lastIndexOf('</script>'));
  const week = MU && MU.week != null ? MU.week : 1;
  const dom = new JSDOM(`<!doctype html><html><head>${PAGE_CSS}${style}</head><body>
    <section id="tab-slate"><div id="slateView"><div class="bar"></div></div><select id="weekSel"><option value="${week}" selected>${week}</option></select></section>
    ${section}</body></html>`, Object.assign({ runScripts: 'outside-only', pretendToBeVisual: true }, opts && opts.errors ? { virtualConsole: (() => {
      const vc = new VirtualConsole(); vc.on('jsdomError', e => opts.errors.push(String(e && (e.detail && e.detail.message || e.message) || e)));
      vc.on('error', (...a) => opts.errors.push(a.map(String).join(' '))); return vc; })() } : {}));
  const w = dom.window;
  const games = [...new Set(Object.values((MU && MU.players) || {}).map(v => v.game_id))].sort();
  w.__clock = { now: 0 };
  w.eval(`var S={sched:${JSON.stringify(games.map((id, i) => ({ id, w: week, k: 1000 * (i + 1) })))},inactive:{},ui:{},parlay:{},saved:[],stake:10};
    function gameStarted(g){ return window.__clock.now>=g.k; }
    function renderSlate(){}
    window.pkTierBadge=e=>'<svg class="tierbadge" data-elo="'+e+'"></svg>';
    window.pkEloTier=e=>[e>=1700?'Elite':e>=1600?'Diamond':e>=1500?'Gold':'Silver','', '#999'];
    window.pkTag=t=>'<span class="pk-ttag">'+t+'</span>';
    window.pkTierDefs='<svg><defs><linearGradient id="tg-x"></linearGradient></defs></svg>';`);
  const files = { 'players.json': (opts && opts.P) || P, 'model.json': (opts && opts.M) || M, 'matchups.json': MU };
  /* opts.hold: a file's answer held until its promise settles (a file still being read) */
  w.fetch = u => { const f = Object.keys(files).find(k => String(u).includes('elo/data/' + k)), h = opts && opts.hold && f ? opts.hold[f] : null;
    const answer = () => f && files[f] ? { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(files[f])) } : { ok: false, status: 404 };
    return h ? h.then(answer) : Promise.resolve(answer()); };
  w.eval(script);
  return { w, d: w.document, games };
}

(async () => {
  /* ---- the rankings card and the bar ---- */
  { const { w, d } = page(MU0); await wait(60);
    const pill = txt(d.querySelector('#peBody .card h2 .pill'));
    const want = `${P.season} ${P.through ? P.through : 'through week ' + P.through_week}`;
    chk(pill === want, `the rankings pill says "${pill}", the build says "${want}"`);
    if (P.through_week) chk(!/through week/.test(pill) || new RegExp('through week ' + P.through_week + '\\b').test(pill), 'the pill claims a week the build has not finished');
    const rec = M.record || {};
    /* the record on calls made before kickoff, the ones on the Joker's baseline apart from the Elo-alone
       ones before them (elo/build.py, THE JOKER BASELINE), each worked out here from the record */
    const barWant = r => {
      const pub = r.published || [0, 0], jb = r.joker_base, jf = r.joker_base_from_week, rp = r.repicked, rw = r.repicked_was;
      const out = [], onJ = !!(jb && jf != null), re = !!(rp && rw && rp[0] + rp[1] > 0);
      if (re) out.push(`${rp[0]}–${rp[1]} re-picked on the Joker after the games (${rw[0]}–${rw[1]} as first picked)`);
      if (onJ) out.push(jb[0] + jb[1] ? `${jb[0]}–${jb[1]} picked on the Joker before kickoff (from week ${jf})` : `on the Joker before kickoff from week ${jf}, none graded yet`);
      const eloPub = onJ ? [pub[0] - jb[0], pub[1] - jb[1]] : pub;
      if (eloPub[0] + eloPub[1] > 0) out.push(`${eloPub[0]}–${eloPub[1]} ${onJ ? 'on Elo alone' : 'called before kickoff'}`);
      return out;
    };
    const bar = txt(d.getElementById('peCallRec'));
    for (const want of barWant(rec))
      chk(bar.includes(want), `the bar does not give the ELO Model's record on calls made before kickoff ("${want}"): ` + bar);
    /* the walk-forward on the Joker's baseline, summed here from the file's own seasons */
    const JB = M.joker_base;
    if (JB && JB.walk_forward) {
      const ss = Object.keys(JB.walk_forward).sort(), sum = k => ss.reduce((a, s) => a + JB.walk_forward[s][k], 0);
      const wr = d.getElementById('peWalkRec'), want = `On the Joker: ${ss[0]}–${ss[ss.length - 1]} ${Math.round(sum('right') / sum('games') * 100)}% walk-forward`;
      chk(txt(wr) === want && wr.title.includes(`${sum('joker')} (`) && wr.title.includes(`${sum('elo')} (`),
        `the bar's walk-forward is not the Joker baseline's ("${want}"): ` + txt(wr) + ' / ' + wr.title);
    }
    void w; }
  /* the same bar on a copy of the record with calls on the Joker graded: the two parts and the backtest */
  { const had = JSON.stringify(M.record || {});
    M.record = Object.assign({}, M.record, { published: [40, 30], joker_base: [5, 2], joker_base_from_week: 7, backtest: [20, 13], repicked: [0, 0], repicked_was: [0, 0] });
    { const { d } = page(MU0); await wait(60);
      const bar = txt(d.getElementById('peCallRec'));
      chk(bar === `ELO Model ${M.record.season}: 5–2 picked on the Joker before kickoff (from week 7), 35–28 on Elo alone, 20–13 backtest`,
        'the bar does not split a record with calls on the Joker graded: ' + bar); }
    /* every game before the baseline re-picked on it: 60-31 re-picked (50-41 as first), 3 backtests that were not re-picks */
    M.record = Object.assign({}, M.record, { published: [4, 1], joker_base: [4, 1], joker_base_from_week: 7, backtest: [62, 32], repicked: [60, 31], repicked_was: [50, 41] });
    { const { d } = page(MU0); await wait(60);
      const cr = d.getElementById('peCallRec'), bar = txt(cr);
      chk(bar === `ELO Model ${M.record.season}: 60–31 re-picked on the Joker after the games (50–41 as first picked), 4–1 picked on the Joker before kickoff (from week 7), 2–1 backtest`
        && /re-picked the same way after they were played/.test(cr.title) && /they went 50–41/.test(cr.title),
        'the bar does not give the re-picked games apart, with their first picks: ' + bar + ' / ' + cr.title); }
    M.record = JSON.parse(had); }
  /* a questionable player stays ranked, with a Q (checked with the top quarterback made
     questionable in this copy of the file only) */
  { const had = P.groups.QB.top[0].q; P.groups.QB.top[0].q = 'questionable (ankle), week 9';
    const { d } = page(MU0); await wait(60);
    const row = d.querySelector('#peBody tbody tr'), q = row && row.querySelector('.pe-q');
    chk(!!q && txt(q) === 'Q' && /questionable/.test(q.title), 'a questionable player has no Q in the rankings');
    if (had === undefined) delete P.groups.QB.top[0].q; else P.groups.QB.top[0].q = had; }
  /* a player ranked on fewer than prov_games real-role games wears prov., and nobody else does:
     the file's own rows, then the top quarterback marked in this copy of the file only */
  { const { d } = page(MU0); await wait(60);
    const rows = [...d.querySelectorAll('#peBody tbody tr.pe-plrow')], top = P.groups[Object.keys(P.groups)[0]].top;
    chk(rows.length > 0 && rows.every((tr, i) => !!tr.querySelector('.pe-prov') === !!(top[i] && top[i].prov)),
      'the prov. mark is not exactly on the rows the build marks provisional');
    const had = P.groups.QB.top[0].prov; P.groups.QB.top[0].prov = true;
    const p2 = page(MU0); await wait(60);
    const m = p2.d.querySelector('#peBody tbody tr .pe-prov');
    chk(!!m && txt(m) === 'prov.' && /fewer than \d+ games/.test(m.title), 'a provisional player has no prov. mark in the rankings');
    if (had === undefined) delete P.groups.QB.top[0].prov; else P.groups.QB.top[0].prov = had; }
  /* market + form reads a rating on the scale its rule was fitted on (ALT in tab_elo.html): across
     each position the spread of z is the fitted spread over the 40-point step, whatever the
     ratings' own spread is now (production scoring had widened it 2.4 times at running back) */
  { const { w } = page(MU0); await wait(60);
    for (const g of ['QB', 'RB', 'WR', 'TE']) {
      const v = Object.values(P.players || {}).filter(e => e.group === g && isFinite(e.elo)).map(e => w.eloAltZ(e.elo, g));
      const m = v.reduce((a, x) => a + x, 0) / v.length, sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length);
      const want = { QB: 34.1, RB: 21.3, WR: 27.6, TE: 27.0 }[g] / 40;
      chk(v.length >= 10 && Math.abs(sd - want) < 0.005, `market + form reads ${g} ratings ${(sd / want).toFixed(2)} times as far from 1500 as its rule was fitted to`); } }
  /* every ranked player has a trend line, one game in too (in week 1 the whole column was
     blank: a line needs two points, and the season's start is the first); checked with the
     top quarterback cut to his first game in this copy of the file only */
  { const top = P.groups.QB.top[0], had = top.this_season;
    top.this_season = had.slice(0, 1);
    const { d } = page(MU0); await wait(60);
    const rows = [...d.querySelectorAll('#peBody .card tbody tr.pe-plrow')];
    chk(rows.length > 0 && rows.every(tr => tr.querySelector('svg.pe-spark')), 'a ranked player has no trend line: ' + rows.filter(tr => !tr.querySelector('svg.pe-spark')).map(tr => txt(tr).slice(0, 30)).join('; '));
    top.this_season = had; }
  /* a player kept out of the players map (out, or gone from his club) keeps his season so far
     for the Prop Record: the weeks he played are graded on the rating he took into each, not
     at 1500; and he is still priced by nothing (no market + form, no Elo picks) */
  { const past = Object.entries(P.past || {}).find(([, v]) => (v.h || []).length);
    if (!past) notes.push('nobody kept out of the players map has a game this season: the past-ratings check is skipped');
    else { const [pid, v] = past, { w } = page(MU0); await wait(60);
      chk(w.eloOf(pid) === null, `${pid} is out but the page would price him`);
      chk(w.eloPre(pid, v.h[0][0]) === v.s0 && w.eloPre(pid, v.h[0][0] + 1) === v.h[0][1],
        `the Prop Record would not grade ${pid}'s past weeks on the rating he took into them: ${w.eloPre(pid, v.h[0][0] + 1)} for ${v.h[0][1]}`); } }

  /* ---- Mismatches: kicked-off games leave, and the bubbles wear the season shield ---- */
  if (!MU0 || !MU0.players || !Object.keys(MU0.players).length) notes.push('no projections in this week\'s file: the Mismatches checks are skipped');
  else {
    const { w, d, games } = page(MU0); await wait(60);
    const before = w.eloMismatches();
    if (!before.length) notes.push('no mismatches this week: the Mismatches checks are skipped');
    else {
      chk(before.every(v => !on(w, v.game_id)), 'before any kickoff, a game is taken as started');
      /* the bubbles: the season shield, the one the ranking and the badge wear, or none */
      w.renderSlate(); await wait(20);
      const bubbles = [...d.querySelectorAll('#peMism .pe-mm-b')];
      chk(bubbles.length === Math.min(5, before.length), 'the Mismatches card did not draw its bubbles');
      /* while clubs have not filed their game statuses, the card says the starters can change */
      const rep = Object.values(MU0.reports || {}).filter(r => r.week === +MU0.week);
      const unfiled = rep.filter(r => !r.statuses_filed).length;
      chk(!unfiled || new RegExp(`filed for ${rep.length - unfiled} of ${rep.length} clubs`).test(txt(d.getElementById('peMism'))),
        'the Mismatches card does not say the game statuses are not all filed');
      for (const b of bubbles) {
        const pid = b.dataset.mmPid, e = P.players[pid], sh = b.querySelector('.pe-mm-sh svg.tierbadge');
        const want = e && e.se != null ? String(e.se) : null;
        chk(want === null ? !sh : (!!sh && sh.getAttribute('data-elo') === want),
          `a Mismatches bubble wears ${sh ? sh.getAttribute('data-elo') : 'no shield'} for ${e ? e.name : pid}, whose season shield is ${want}`);
      }
      /* each bubble words what its edge ranks as what it is, the matchup formula's units by their players' Elo (this
         check's own reading of matchups.json's league table), never "a pass defense ranked" or "a run defense ranked",
         which on the page are the ELO Ratings tab's tables alone (18 October 2026) */
      { const UN = { QB: ['DB', 'DL'], WR: ['DB'], TE: ['DB'], RB: ['DL', 'LB'] }, AG = { QB: 'secondary and defensive line', WR: 'secondary', TE: 'secondary', RB: 'defensive line and linebackers' };
        const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
        const defs = {}; for (const v of Object.values(MU0.players)) if (v.opp_def) defs[v.opp] = v.opp_def; Object.assign(defs, (MU0.league && MU0.league.defs) || {});
        const bad = bubbles.map(b => { const v = MU0.players[b.dataset.mmPid], u = v && UN[v.group], avg = x => u.reduce((a, k) => a + x[k], 0) / u.length;
          if (!u || !defs[v.opp]) return `${b.dataset.mmPid}: no unit to rank`;
          const want = `vs the ${v.opp} ${AG[v.group]}, ${ord(1 + Object.keys(defs).filter(t => avg(defs[t]) > avg(defs[v.opp])).length)} by player Elo.`, sub = txt(b.querySelector('.pe-mm-sub'));
          return sub.startsWith(want) ? '' : `${b.dataset.mmPid}: "${sub.slice(0, 90)}", not "${want}"`; }).filter(Boolean);
        const old = /\b(?:pass|run) defense ranked\b|\bvs an? (?:pass|run) defense\b/.exec(txt(d.getElementById('peMism')));
        chk(!bad.length && !old, 'a Mismatches bubble does not word its rank as the matchup formula\'s units, or says a pass or run defense ranked: ' + (bad.slice(0, 2).join(' | ') || (old && old[0]))); }
      /* the earliest game with a mismatch kicks off */
      const g0 = before[0].game_id, k0 = (w.eval('S.sched').find(x => x.id === g0) || {}).k;
      w.__clock.now = k0;
      const after = w.eloMismatches();
      chk(on(w, g0) === true, 'the tab does not see the game has kicked off');
      chk(!after.some(v => v.game_id === g0), `a game that has kicked off (${g0}) is still on the Mismatches`);
      chk(after.length > 0 || before.every(v => on(w, v.game_id)), 'the Mismatches lost games that have not kicked off');
      w.renderSlate(); await wait(20);
      chk(![...d.querySelectorAll('#peMism .pe-mm-b')].some(b => b.dataset.mmGame === g0), 'a kicked-off game is still a Mismatches bubble');
      /* a ranked player in that game: his window says the game has kicked off */
      const grp = ['QB', 'RB', 'WR', 'TE'].find(g => P.groups[g].top.some(r => (MU0.players[r.id] || {}).game_id === g0));
      if (grp) {
        const r = P.groups[grp].top.find(x => (MU0.players[x.id] || {}).game_id === g0);
        [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === grp).click(); await wait(20);
        const more = d.getElementById('peMore'); if (r.rank > 10 && more) { more.click(); await wait(20); }
        const tr = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === r.id);
        if (tr) { tr.click(); await wait(20);
          chk(/has kicked off/.test(txt(d.getElementById('pePlView'))), `${r.name}'s window does not say his game has kicked off`);
          d.getElementById('pePlClose').click(); await wait(10); }
      } else notes.push('no ranked player in the first game with a mismatch: the window\'s kicked-off note is not checked');
      /* every game over: no card at all */
      w.__clock.now = 1e12; w.renderSlate(); await wait(20);
      chk(!w.eloMismatches().length && !d.getElementById('peMism'), 'with every game kicked off the Mismatches card still shows');
    }
  }

  /* ---- a player the build counts out is ruled out on the page, with the reason ---- */
  if (MU0) {
    const MU = JSON.parse(JSON.stringify(MU0));
    /* the top-ranked receiver with a projection is made "out last week, not practising" in a copy */
    const top = P.groups.WR.top.find(r => MU.players && MU.players[r.id]) || P.groups.WR.top[0];
    MU.out = Object.assign({}, MU.out, { [top.id]: 'out (hamstring) in week 4, not practising for week 5: counted out' });
    const { w, d } = page(MU); await wait(60);
    chk(w.eloRuledOut(top.id) === true, 'a player the build counts out is not ruled out on the page');
    chk(!w.eloMismatches().some(v => v.pid === top.id), 'a player the build counts out is still on the Mismatches');
    [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'WR').click(); await wait(20);
    const row = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(tr => tr.dataset.pePl === top.id);
    if (row) { row.click(); await wait(20);
      chk(/not practising/.test(txt(d.getElementById('pePlView'))), 'his window does not give the build\'s reason: ' + txt(d.getElementById('pePlView')).slice(0, 160)); }
  }

  /* ---- Overall Offense and Overall Defense: the two pills, the table, the sort, the window ---- */
  const U0 = M.units;
  if (!U0 || !U0.off || !Object.values(U0.off).some(v => v.games || v.carried)) notes.push('no team has a rating: the Overall Offense checks are skipped');
  else if (!U0.stats) chk(false, 'model.json\'s units carry no stats: an old build wrote them');
  else {
    /* the gate's own printing of a value and a rank, so the page's cannot vouch for itself */
    const show = (v, f) => v == null ? '–' : f === 'pct' ? (v * 100).toFixed(1) + '%' : f === 'epa' ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3) : f === 'f2' ? v.toFixed(2) : v.toFixed(1);
    const nth = n => n == null ? '' : n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
    const pill = (d, side) => [...d.querySelectorAll('#peBody .pe-pos button[data-unit]')].find(b => b.dataset.unit === side);
    const open = async (d, side) => { const b = pill(d, side); if (!b) return null; b.click(); await wait(20); return d.getElementById('peUnits'); };
    const { w, d } = page(MU0); await wait(60);
    const row = d.querySelector('#peBody .pe-pos');
    /* the tables: Overall's two, then each of the file's position tables (Run Defense, Pass Defense
       and Pass Rush, Run Offense, Pass Offense and Pass Protection), named as the file names them, each
       a pair with the table on the other side of its facet, on the same stats */
    const POS = Object.keys(U0.tables || {}), TABS = ['off', 'def', ...POS];
    const label = k => k === 'off' ? 'Overall Offense' : k === 'def' ? 'Overall Defense' : U0.tables[k].label;
    const sideOf = k => k === 'off' || k === 'def' ? k : U0.tables[k].of;
    const statsOf = k => U0.stats.filter(s => s.side === k).map(s => s.key).sort().join();
    chk(POS.length === 6 && POS.filter(k => sideOf(k) === 'def').length === 3 && POS.filter(k => sideOf(k) === 'off').length === 3
      && POS.every(k => U0[k] && U0.tables[U0.tables[k].pair] && U0.tables[U0.tables[k].pair].pair === k && sideOf(U0.tables[k].pair) !== sideOf(k) && statsOf(k) === statsOf(U0.tables[k].pair)),
      `the file does not carry the six position tables, three a side, each paired with the other side of its facet on the same stats: ${POS.map(k => k + '/' + (U0.tables[k] || {}).pair).join()}`);
    /* the pills read as offense and defense: a row headed Offense with Overall Offense and the offense
       tables, then one headed Defense with Overall Defense and the defense tables */
    const ROWS = ['off', 'def'].map(sd => [sd, ...POS.filter(k => sideOf(k) === sd)]);
    const units = row && row.querySelector('.pe-units'), seq = units ? [...units.children].map(e => e.matches('button[data-unit]') ? label(e.dataset.unit) : '[' + txt(e) + ']') : [];
    chk(!!units && seq.join('|') === ['[Offense]', ...ROWS[0].map(label), '[Defense]', ...ROWS[1].map(label)].join('|')
      && [...units.querySelectorAll('.pe-ulab')].every(e => e.getAttribute('aria-hidden') === 'true'),
      'the position row does not carry the team pills as an Offense row (Overall Offense and the offense tables) and a Defense row (Overall Defense and the defense tables): ' + seq.join('|'));
    chk(!!row && [...row.querySelectorAll('button[data-unit]')].length === TABS.length && [...row.querySelectorAll('button[data-unit]')].every(b => b.getAttribute('role') === 'tab'),
      'the position row does not carry every team table as a tab');
    for (const side of TABS) {
      const card = await open(d, side), T = U0[side], teams = Object.keys(T), stats = U0.stats.filter(s => s.side === side);
      const name = label(side);
      chk(!!card && txt(card.querySelector('h2')).startsWith(name), `the ${name} pill does not open its table`);
      if (!card) continue;
      chk(d.querySelectorAll('#peBody .card').length === 1 && !d.querySelector('#peBody tr.pe-plrow'), `${name} should take the player table's place, not sit beside it`);
      chk((card.querySelector('.pe-pos [aria-selected="true"]') || {}).dataset?.unit === side, `the ${name} pill is not shown selected`);
      chk(!!scroller(w, card), `${name}'s table has no sideways scroller at a desktop width: its columns run past the card and the page scrolls`);
      chk(sticks(w, card), `${name}'s team column cannot stick while the table scrolls: it is not sticky, or a box between it and the scroller clips`);
      const rows = () => [...card.ownerDocument.querySelectorAll('#peUnits tbody tr.pe-tmrow')];
      let R = rows();
      chk(R.length === teams.length && R.length === 32, `${name} has ${R.length} rows for ${teams.length} teams`);
      chk(R.every((tr, i) => T[tr.dataset.team] && T[tr.dataset.team].rank === i + 1 && txt(tr.querySelector('.pe-rank')) === String(i + 1)),
        `${name} is not in the file's rank order`);
      const elos = R.filter(tr => T[tr.dataset.team].games || T[tr.dataset.team].carried).map(tr => +txt(tr.querySelector('.pe-elo')));
      chk(elos.every((e, i) => !i || e <= elos[i - 1]), `${name}'s ratings rise down the table`);
      chk(R.every(tr => +txt(tr.querySelector('.pe-elo')) === T[tr.dataset.team].elo && tr.querySelector('.pe-shield svg.tierbadge')),
        `a ${name} rating is not the file's, or has no shield`);
      /* the columns are the file's stats in its order, and every value and rank on screen is the file's */
      const cols = [...card.querySelectorAll('thead th[data-sort]')].map(th => th.dataset.sort).filter(k => stats.some(s => s.key === k));
      chk(cols.join() === stats.map(s => s.key).join(), `${name}'s stat columns are not the file's stats: ${cols.join()}`);
      const bad = [];
      for (const tr of R) for (const s of stats) {
        const e = T[tr.dataset.team].stats[s.key], td = tr.querySelector(`td[data-stat="${s.key}"]`);
        const got = td ? [txt(td.querySelector('.pe-sv')), txt(td.querySelector('.pe-ord'))] : null;
        if (!got || got[0] !== show(e && e.v, s.fmt) || got[1] !== nth(e && e.rank)) bad.push(`${tr.dataset.team} ${s.key} ${got} for ${show(e && e.v, s.fmt)} ${nth(e && e.rank)}`);
      }
      chk(!bad.length, `${name} shows values or ranks that are not the file's: ${bad.slice(0, 3).join('; ')}`);
      /* the text names every weighted stat with its share, the shares sum to 100, and the stats
         that weigh nothing are named as such */
      const why = txt(card.querySelector('#peTeamsWhy')), weighted = stats.filter(s => s.weight);
      const shares = (why.match(/(\d+)%/g) || []).map(x => parseInt(x, 10));
      const said = s => why.toLowerCase().includes(`${s.label.toLowerCase()} ${s.weight}%`);
      chk(weighted.every(said) && shares.join() === weighted.map(s => s.weight).join()
        && shares.reduce((a, b) => a + b, 0) === 100, `${name}'s text does not give the file's weights summing to 100: ${shares.join(', ')}`);
      const zero = stats.filter(s => !s.weight), zt = txt(card.querySelector('#peTeamsZero'));
      chk(!zero.length || (zero.every(s => zt.includes(s.label)) && /weighs? nothing/.test(zt)), `${name} does not say which stats weigh nothing, and why`);
      /* a position table's own test, from the file: the measure it is for, its miss beside the raw numbers' */
      if (POS.includes(side)) { const tw = U0.tables[side].walk_forward || {}, wt = txt(card.querySelector('#peTeamsWf'));
        const f = x => (+x).toFixed(x < 0.1 ? 4 : 3);
        /* the pair's test was a forecast from this rating with the other side's own ratings on the same
           stats (its pair, named), the raw baseline both teams' raw numbers (def_units_fit.py); and the
           table's own, from this rating alone against its side's raw numbers alone: the note says each
           so, never that a rating alone was scored beyond the file's `alone` */
        const dfnT = sideOf(side) === 'def', pl = U0.tables[U0.tables[side].pair].label;
        const pairSaid = dfnT ? `a forecast of the ${tw.measure} an offense had in its next game against the team, from this rating with the offense's own ratings on the same stats (its ${pl}), missed by ${f(tw.rmse)}`
          : `a forecast of the ${tw.measure} the team had in its next game, from this rating with the defense's own ratings on the same stats (its ${pl}), missed by ${f(tw.rmse)}`;
        const level = f(tw.alone) === f(tw.alone_raw);
        chk(!!tw.rmse && wt.includes(pairSaid)
          && wt.includes(`same forecast from both teams' raw numbers`) && !/this rating missed/.test(wt)
          && wt.includes(`missed by ${f(tw.raw)}`) && wt.includes(`${tw.fit}`) && wt.includes(`${tw.test}`)
          && wt.includes(`, in ${tw.seasons_better} of ${tw.seasons} seasons`)
          && wt.includes(`On its own, from this rating and nothing of the ${dfnT ? 'offense' : 'defense'} it met, the forecast missed by ${f(tw.alone)}, and from the team's own raw numbers so far alone by ${f(tw.alone_raw)}`)
          && wt.includes(level ? `level with them at this precision (ahead in ${tw.alone_better} of ${tw.seasons} seasons).` : `better than their raw numbers do, in ${tw.alone_better} of ${tw.seasons} seasons.`)
          && !/used only for that test/.test(wt),
          `${name}'s text does not give its walk-forward tests from the file: ${wt.slice(0, 420)}`);
        chk(!/points and EPA|Overall/.test(txt(card.querySelector('#peTeamsZero'))), `${name}'s note borrows Overall's test`);
        /* which way is better, in the table's own words: "less allowed" only with a stat the defense
           allows, "more made" only with one it makes (Pass Rush's both), never Overall's "taken" */
        const lo = stats.some(s => s.better === 'low'), hi = stats.some(s => s.better === 'high');
        const way = dfnT ? (lo && hi ? 'less allowed, more made by the defense' : hi ? 'more made by the defense' : 'less allowed')
          : (lo && hi ? 'more gained, fewer taken' : hi ? 'more gained' : 'fewer taken');
        chk(why.includes(`what was expected against the ${dfnT ? 'offense' : 'defense'} it faced`), `${name}'s text has its teams facing the wrong side of the ball: ${why.slice(0, 400)}`);
        chk(why.includes(`a standard deviation better (${way})`) && !/more taken/.test(why), `${name}'s text does not say which way is better in its own stats' words (${way}): ${why.slice(-330)}`); }
      /* the old measure's walk-forward on the carried file is the old measure carried the same way,
         which the site never ran: the text says so */
      chk(POS.includes(side) || !zero.length || (U0.walk_forward || {}).no_carry == null || /old rating on points and EPA alone, carried the same way, by/.test(zt),
        `${name}'s walk-forward note gives the old rating's carried score as if it were the old rating's own: ${zt.slice(0, 260)}`);
      /* a stat's header sorts by it, best first, then the other way; # keeps the overall rank */
      const k = stats[1].key, th = () => card.ownerDocument.querySelector(`#peUnits thead th[data-sort="${k}"]`);
      th().click(); await wait(20);
      R = rows();
      const rk = tr => { const e = T[tr.dataset.team].stats[k]; return e && e.rank != null ? e.rank : 1e9; };
      chk(R.length === 32 && R.every((tr, i) => !i || rk(tr) >= rk(R[i - 1])) && R.every(tr => txt(tr.querySelector('.pe-rank')) === String(T[tr.dataset.team].rank)),
        `sorting ${name} by ${k} is not best first, or # lost the overall rank`);
      th().click(); await wait(20);
      R = rows();
      chk(R.every((tr, i) => !i || rk(tr) <= rk(R[i - 1])), `a second click on ${k} does not turn the order round`);
      card.ownerDocument.querySelector('#peUnits thead th[data-sort="rank"]').click(); await wait(20);
      R = rows();
      chk(R.every((tr, i) => T[tr.dataset.team].rank === i + 1), `# does not put ${name} back in rank order`);
      /* a team's window: every stat, both ranks, and the coming opponent when the file calls its game */
      const t = R[0].dataset.team; R[0].click(); await wait(20);
      const m = d.getElementById('peTmModal'), view = d.getElementById('peTmView');
      chk(!!m && !m.hidden && txt(view).includes(String(T[t].elo)) && view.querySelectorAll('.pe-pl-tiles div').length === 4, `a click on ${t} does not open its window`);
      chk([...view.querySelectorAll('tbody tr[data-stat]')].map(r => r.dataset.stat).join() === stats.map(s => s.key).join(), `${t}'s window does not list every stat`);
      /* the value column's heading: a position table's in its stats' own words (Allowed, Made or Value),
         so Pass Rush's own sacks are never "Allowed"; Overall's as it always was */
      { const head = txt(view.querySelectorAll('table.pe-t thead th')[1]);
        const want = sideOf(side) === 'off' ? 'Value' : !POS.includes(side) || stats.every(s => s.better === 'low') ? 'Allowed' : stats.every(s => s.better === 'high') ? 'Made' : 'Value';
        chk(head === want, `${t}'s window heads its values "${head}" in ${name}, not "${want}"`); }
      chk(view.querySelector('.pe-tline svg') && view.querySelectorAll('.pe-tline circle').length === T[t].line.length + 1, `${t}'s window has no line game by game`);
      { const want = T[t].start != null ? T[t].start : (U0.start || {})[side];
        chk(txt(view.querySelector('.pe-tline circle title')) === `Season start: ${want}`, `${t}'s line does not start at its own start from the file (${want}): ${txt(view.querySelector('.pe-tline circle title'))}`); }
      const N = M.next || {}, g = +N.season === +U0.season ? (N.games || []).find(x => { const p = String(x.game_id).split('_'); return p[2] === t || p[3] === t; }) : null;
      /* the coming opponent on the other side: the other Overall, or a position table's pair */
      if (g) { const p = g.game_id.split('_'), opp = p[3] === t ? p[2] : p[3], ok = POS.includes(side) ? U0.tables[side].pair : side === 'off' ? 'def' : 'off', other = U0[ok][opp];
        const nt = txt(d.getElementById('peTmNext'));
        chk(!!d.getElementById('peTmNext') && nt.includes(opp) && nt.includes(`${nth(other.rank)} of 32 in ${label(ok)} (${other.elo},`),
          `${t}'s window does not give its coming opponent ${opp} and its rank in ${label(ok)}: ${nt}`);
        chk(!/no (offense|defense) table/.test(nt), `${t}'s window in ${name} says the site has no table to set against it: ${nt}`); }
      else chk(!d.getElementById('peTmNext'), `${t}'s window names an opponent the file does not call`);
      d.getElementById('peTmClose').click(); await wait(10);
      chk(m.hidden, 'Close does not shut a team\'s window');
      rows()[1].click(); await wait(20);
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(10);
      chk(m.hidden, 'Escape does not shut a team\'s window');
    }
    /* back to a position: the player table returns */
    [...d.querySelectorAll('#peBody .pe-pos button[data-pos]')].find(b => b.dataset.pos === 'QB').click(); await wait(20);
    chk(!d.getElementById('peUnits') && d.querySelectorAll('#peBody tr.pe-plrow').length > 0 && d.querySelectorAll('#peBody .card').length === 1,
      'a position pill does not bring the player table back, alone (the teams are a pill away, not a card under it)');

    /* the carry: a club with no game yet this season (made so in this copy) is ranked and shown on
       its carried rating, marked, on the curve, and its window says so; the text names the share */
    { const C = (U0.params || {}).carry, from = (U0.params || {}).carry_from;
      chk(C === 0.42 && from === +U0.season - 1, `the file does not name the carry and the season carried in: ${C}, ${from}`);
      const M5 = JSON.parse(JSON.stringify(M)), t5 = Object.keys(M5.units.off).sort()[0];
      for (const side of TABS) { const v = M5.units[side][t5];
        Object.assign(v, { games: 0, line: [], before: null, change: null, carried: true, record: [0, 0, 0], start: v.elo });
        for (const e of Object.values(v.stats)) { e.v = null; e.rank = null; } }
      const { d: d5 } = page(MU0, { M: M5 }); await wait(60);
      for (const side of TABS) {
        const card = await open(d5, side), v = M5.units[side][t5];
        if (!card) { chk(false, `the ${side} pill is not on the page`); continue; }
        const tr = card && [...card.querySelectorAll('tbody tr.pe-tmrow')].find(x => x.dataset.team === t5);
        chk(!!tr && txt(tr.querySelector('.pe-elo')) === String(v.elo) && txt(tr.querySelector('.pe-rank')) === String(v.rank) && !tr.classList.contains('pe-np')
          && txt(tr.querySelector('.pe-carry')) === `carried from ${from}`, `${t5}, yet to play, is not shown on its carried rating with its rank and marked carried from ${from}: ${tr ? txt(tr) : 'no row'}`);
        chk(/ranked/.test(txt(card.querySelector('.pe-curve'))) && txt(card.querySelector('.pe-curve')).includes(`${Object.values(M5.units[side]).filter(x => x.games || x.carried).length} ranked`),
          `the ${side} curve does not count the club carried from last season`);
        const why = txt(card.querySelector('#peTeamsWhy'));
        chk(why.includes(`each starting from ${C} of its final rating in ${from}`) && why.includes(`marked carried from ${from}`) && !/everyone started at 1500/.test(why),
          `the ${side} text does not say each team starts from ${C} of ${from}: ${why.slice(0, 220)}`);
        /* the player rankings carry nothing in: the text never likens the carry to them */
        chk(!/the way the player rankings are/.test(why) && /As in the player rankings, after each game/.test(why),
          `the ${side} text likens the carried start to the player rankings, which start every season at 1500: ${why.slice(0, 220)}`);
        if (tr) { tr.click(); await wait(20);
          const view = d5.getElementById('peTmView');
          chk(/No game yet this season/.test(txt(d5.getElementById('peTmCarried'))) && txt(d5.getElementById('peTmCarried')).includes(`carried from ${from}`)
            && txt(view.querySelector('.pe-pl-tiles')).includes(`carried from ${from}`), `${t5}'s window does not say its rating is carried from ${from}`);
          d5.getElementById('peTmClose').click(); await wait(10); }
      }
      /* the real file: a club with a game has no carried mark */
      { const card = await open(d5, 'off'), marked = [...card.querySelectorAll('tbody tr.pe-tmrow')].filter(x => x.querySelector('.pe-carry')).map(x => x.dataset.team);
        chk(marked.join() === Object.keys(M5.units.off).filter(k => M5.units.off[k].carried).sort((a, b) => M5.units.off[a].rank - M5.units.off[b].rank).join(),
          `the clubs marked carried are not the file's: ${marked.join()}`); } }
    /* the day the carry is for: every club carried and none played yet (made so in this copy): both
       pills still open their tables, all 32 clubs ranked on their carried ratings, marked, on the
       curve. (A pill shown only once a club has a rated game would drop the teams on that day.) */
    { const C = (U0.params || {}).carry, from = (U0.params || {}).carry_from;
      const M6 = JSON.parse(JSON.stringify(M));
      for (const side of TABS) for (const v of Object.values(M6.units[side])) {
        Object.assign(v, { games: 0, line: [], before: null, change: null, carried: true, record: [0, 0, 0], start: v.elo });
        for (const e of Object.values(v.stats)) { e.v = null; e.rank = null; } }
      const { d: d6 } = page(MU0, { M: M6 }); await wait(60);
      chk(TABS.every(k => !!pill(d6, k)), 'with every club carried and none played, a team table\'s pill is gone');
      for (const side of TABS) {
        const card = await open(d6, side), R6 = card ? [...card.querySelectorAll('tbody tr.pe-tmrow')] : [];
        chk(R6.length === 32 && R6.every(tr => txt(tr.querySelector('.pe-carry')) === `carried from ${from}`
          && txt(tr.querySelector('.pe-elo')) === String(M6.units[side][tr.dataset.team].elo)),
          `with every club carried, the ${side} table does not draw all 32 on their carried ratings, marked carried from ${from}: ${R6.length} rows`);
        chk(!!card && txt(card.querySelector('.pe-curve')).includes('32 ranked'), `with every club carried, the ${side} curve does not count all 32`);
      } }
    /* a file from before the carry: one start a side, no carry: still draws, its lines from that start */
    { const M4 = JSON.parse(JSON.stringify(M));
      delete M4.units.params.carry; delete M4.units.params.carry_from; M4.units.start = { off: 1487, def: 1509 };
      for (const side of TABS) for (const v of Object.values(M4.units[side])) { delete v.start; delete v.carried; }
      const { d: d4 } = page(MU0, { M: M4 }); await wait(60);
      const card = await open(d4, 'def'), why = txt(card && card.querySelector('#peTeamsWhy'));
      chk(!!card && /the way the player rankings are: everyone started at 1500/.test(why) && !card.querySelector('.pe-carry'), 'a file from before the carry does not draw as one: ' + why.slice(0, 160));
      const tr = card && card.querySelector('tbody tr.pe-tmrow');
      if (tr) { tr.click(); await wait(20);
        chk(txt(d4.querySelector('#peTmView .pe-tline circle title')) === 'Season start: 1509', 'a file from before the carry does not start a line at its side\'s start'); }
      const pc = POS.length && await open(d4, POS[0]), pw = txt(pc && pc.querySelector('#peTeamsWhy'));
      chk(!POS.length || (!!pc && /the way the player rankings are: everyone started at 1500/.test(pw) && !pc.querySelector('.pe-carry')),
        'a position table on a file without the carry does not draw as one: ' + pw.slice(0, 160)); }
    /* a file with the defense tables and no pair or test alone (every build of 16 October 2026 before
       the offense tables): the defense tables draw as they did, their note saying the offense's side
       was used only for the test and never that a rating alone was scored, a window's opponent given
       its Overall Offense rank, said so; the Offense row Overall Offense alone */
    { const M8 = JSON.parse(JSON.stringify(M)), offT = POS.filter(k => sideOf(k) === 'off'), defT = POS.filter(k => sideOf(k) === 'def');
      for (const k of offT) { delete M8.units[k]; delete M8.units.weights[k]; delete M8.units.tables[k]; }
      M8.units.stats = M8.units.stats.filter(s => !offT.includes(s.side));
      for (const k of defT) { const tw = M8.units.tables[k]; delete tw.pair; for (const a of ['alone', 'alone_raw', 'alone_se', 'alone_better']) delete tw.walk_forward[a]; }
      const { d: d8 } = page(MU0, { M: M8 }); await wait(60);
      const u8 = d8.querySelector('#peBody .pe-pos .pe-units'), s8 = u8 ? [...u8.children].map(e => e.matches('button[data-unit]') ? e.dataset.unit : '[' + txt(e) + ']').join('|') : '';
      chk(s8 === ['[Offense]', 'off', '[Defense]', 'def', ...defT].join('|'), 'a file with the defense tables alone does not draw Overall Offense alone in the Offense row and the defense tables in the Defense row: ' + s8);
      const c8 = await open(d8, defT[0]), w8 = txt(c8 && c8.querySelector('#peTeamsWf')), tw = M8.units.tables[defT[0]].walk_forward;
      chk(!!c8 && w8.includes(`from this rating with the offense's own ratings on the same stats, missed by ${(+tw.rmse).toFixed(tw.rmse < 0.1 ? 4 : 3)}`)
        && /used only for that test and are not shown/.test(w8) && !/On its own/.test(w8) && !/this rating missed/.test(w8),
        `a file with the defense tables and no pair does not give their test as it did: ${w8.slice(0, 400)}`);
      const N = M.next || {}, g8 = +N.season === +U0.season && (N.games || [])[0], r8 = c8 && c8.querySelector('tbody tr.pe-tmrow');
      if (g8 && r8) { const t8 = String(g8.game_id).split('_')[2];
        const tr8 = [...c8.querySelectorAll('tbody tr.pe-tmrow')].find(x => x.dataset.team === t8);
        if (tr8) { tr8.click(); await wait(20);
          const nt = txt(d8.getElementById('peTmNext'));
          chk(nt.includes('in Overall Offense') && nt.includes(`no offense table to set against ${label(defT[0])}`), `a file with no pair does not give the opponent's Overall Offense rank, said so: ${nt}`);
          d8.getElementById('peTmClose').click(); await wait(10); } } }
    /* a file without the position tables (every build before 16 October 2026): exactly the two pills,
       each table as before */
    { const M7 = JSON.parse(JSON.stringify(M));
      for (const k of POS) { delete M7.units[k]; delete M7.units.weights[k]; }
      delete M7.units.tables; M7.units.stats = M7.units.stats.filter(s => s.side === 'off' || s.side === 'def');
      const { d: d7 } = page(MU0, { M: M7 }); await wait(60);
      const r7 = d7.querySelector('#peBody .pe-pos');
      chk(!!r7 && [...r7.querySelectorAll('button[data-unit]')].map(txt).join('|') === 'Overall Offense|Overall Defense',
        'a file without the position tables does not draw exactly the Overall Offense and Overall Defense pills');
      const c7 = await open(d7, 'def');
      chk(!!c7 && txt(c7.querySelector('h2')).startsWith('Overall Defense') && c7.querySelectorAll('tbody tr.pe-tmrow').length === 32,
        'a file without the position tables does not open Overall Defense'); }
    /* the weights are the file's, not the page's: a copy with other weights shows those */
    { const M2 = JSON.parse(JSON.stringify(M)), wts = [40, 30, 20, 5, 5];
      const ws = M2.units.stats.filter(s => s.side === 'off' && s.weight);
      ws.forEach((s, i) => { s.weight = wts[i] != null ? wts[i] : 0; M2.units.weights.off[s.key] = s.weight; });
      const { d: d2 } = page(MU0, { M: M2 }); await wait(60);
      const card = await open(d2, 'off'), why = txt(card && card.querySelector('#peTeamsWhy'));
      chk(ws.every(s => why.toLowerCase().includes(`${s.label.toLowerCase()} ${s.weight}%`)), 'the page does not read the weights from the file: ' + why.slice(0, 200)); }
    /* a model.json from before the stats (the page and the data ship apart) still draws, on the old columns */
    { const M3 = JSON.parse(JSON.stringify(M));
      delete M3.units.stats; delete M3.units.weights; delete M3.units.tables;
      for (const k of POS) delete M3.units[k];
      for (const side of ['off', 'def']) for (const v of Object.values(M3.units[side])) delete v.stats;
      const { w: w3, d: d3 } = page(MU0, { M: M3 }); await wait(60);
      const card = await open(d3, 'off'), heads = card ? [...card.querySelectorAll('thead th')].map(txt).join('|') : '';
      const first = card && card.querySelector('tbody tr.pe-tmrow'), v = first && M3.units.off[first.dataset.team];
      chk(!!card && /Pts\/g/.test(heads) && /Yds\/g/.test(heads) && /EPA\/play/.test(heads) && v && txt(first).includes(String(v.ppg)),
        'an old-shaped model.json does not draw the old columns: ' + heads);
      chk(!!scroller(w3, card) && sticks(w3, card), 'the old columns\' table has no sideways scroller at a desktop width, or its team column cannot stick in it'); }
  }

  /* ---- the money the files feed: market + form, the Elo matchup chance and the Elo picks, on every
     rated player and every matchup line in the files, at made-up book prices (the props parts'
     mlProb and mlToDec, stubbed here as the page has them) ---- */
  { const errors = [], { w } = page(MU0, { errors }); await wait(60);
    sumsInto(w, CORR);   /* mlProb, mlToDec and the builder's sums, the props parts' own, as the page has them */
    const ok01 = v => typeof v === 'number' && isFinite(v) && v > 0 && v < 1;
    let alt = 0; const badAlt = [];
    for (const [pid, e] of Object.entries(P.players || {})) {
      if (!e || !['QB', 'RB', 'WR', 'TE'].includes(e.group)) continue;
      for (const side of ['over', 'under']) for (const price of [-110, 150]) {
        let v; try { v = w.eloAltP(pid, side, price, 'real', e.group === 'QB' ? 'passing_yards' : 'receptions'); } catch (err) { v = 'threw ' + err.message; }
        alt++; if (!ok01(v)) badAlt.push(`${e.name || pid} ${side} ${price}: ${v}`); } }
    chk(alt > 0 && !badAlt.length, `market + form is not a chance on ${badAlt.length} of ${alt} player legs (${badAlt.slice(0, 4).join('; ')}): the Parlay Builder decides which player legs qualify on it`);
    /* a price the prop model works from DraftKings' line read on ESPN by Refresh odds (src 'dkline', app
       v107) is read as a book price: the same chance as a real one at that price, and none on the model's
       own estimate (the nflbets smoke holds the panel to market + form worked on src 'real') */
    { const badDk = []; let nDk = 0;
      for (const [pid, e] of Object.entries(P.players || {})) {
        if (!e || !['RB', 'WR', 'TE'].includes(e.group)) continue;
        for (const side of ['over', 'under']) { const r = w.eloAltP(pid, side, -115, 'real', 'receptions'), k = w.eloAltP(pid, side, -115, 'dkline', 'receptions'), x = w.eloAltP(pid, side, -115, 'est', 'receptions');
          nDk++; if (r !== k || x !== null) badDk.push(`${e.name || pid} ${side}: real ${r}, dkline ${k}, est ${x}`); }
        if (nDk >= 400) break; }
      chk(nDk > 0 && !badDk.length, `market + form does not read a price from DraftKings' line as a book price (or reads the model's estimate) on ${badDk.length} of ${nDk} legs: ${badDk.slice(0, 3).join('; ')}`); }
    /* a leg for every matchup line in the file, over and under, at -110 and +150 */
    const legs = [];
    for (const [pid, pl] of Object.entries((MU0 && MU0.players) || {})) for (const st of Object.keys(pl.stats || {})) {
      const proj = (pl.stats[st] || [])[1], k = isFinite(proj) ? Math.floor(proj) + 0.5 : 0.5;
      for (const side of ['over', 'under']) for (const price of [-110, 150])
        legs.push({ key: `${pl.game_id}|${pid}|${st}`, gid: pl.game_id, pid, stat: st, grp: pl.group, k, side, price, src: 'real', name: pid, label: st }); }
    let mu = 0; const badMu = [];
    for (const l of legs) { let v; try { v = w.eloMatchupP(l, w.mlProb(l.price)); } catch (err) { v = 'threw ' + err.message; }
      if (v === null) continue; mu++; if (!ok01(v)) badMu.push(`${l.pid} ${l.stat} ${l.side} ${l.price}: ${v}`); }
    chk(!badMu.length, `the Elo matchup chance is not a chance on ${badMu.length} of ${mu} matchup lines (${badMu.slice(0, 4).join('; ')})`);
    w.__legs = legs; w.eval('function pricedLegs(){ return window.__legs; }');
    let r; try { r = w.eloPicks(); } catch (err) { r = 'threw ' + err.message; }
    chk(!!r && typeof r === 'object' && Array.isArray(r.tiers), `the Elo picks do not build on the files: ${typeof r === 'string' ? r : JSON.stringify(r)}`);
    /* the candidates: the rule's (worked out here on the files' own matchups, candsOwn), every player's best, ranked on
       value, the best 30 kept; the levels: Suggested Parlays' four, each priced by the builder's own sums worked out
       here (sumsOwn), its floor held, and never worse than the best parlay of its size whose legs are all in
       different games, worked out here in full (a plain product, so its sums are cheap on any week) */
    const sums = sumsOwn(CORR), own = candsOwn(legs, MU0, (P.players) || {}, sums);
    if (r && Array.isArray(r.tiers)) {
      const C = r.cands || [], ownPe = new Map(own.all.map(l => [idC(l), l.pe]));
      const badC = C.filter(l => !(l.grp !== 'TEAM' && (l.src === 'real' || l.src === 'dkline') && l.price >= EPC.lo && l.price <= EPC.hi && ok01(l.pe) && l.pe >= EPC.floor
        && Math.abs(l.ev - (l.pe * sums.mlToDec(l.price) - 1)) < 1e-12 && l.ev > 0 && ownPe.has(idC(l)) && Math.abs(ownPe.get(idC(l)) - l.pe) < 1e-6));
      chk(C.length === own.kept.length && C.map(idC).join() === own.kept.map(idC).join() && r.candidates === own.all.length && !badC.length && new Set(C.map(l => l.pid)).size === C.length && C.every((l, i) => !i || C[i - 1].ev >= l.ev),
        `the Elo picks' candidates on the files are not the rule's (a rated player's best leg by value, ranked on value; searched from the ${EPC.cap} best by value and the ${EPC.capP} likeliest by the Elo chance, each once): ${C.length} kept of ${r.candidates}, the rule ${own.kept.length} of ${own.all.length}; ${badC.slice(0, 3).map(l => l.pid + ' ' + l.stat + ' ' + l.side + ' ' + l.price + ' ' + l.pe).join('; ')}`);
      /* the union is what is searched: where some of the likeliest are not among the best by value, they are there */
      notes.push(`the Elo picks' candidates on the files: ${C.length} searched of ${own.all.length}, ${own.likely.filter(l => !own.byValue.includes(l)).length} of the ${EPC.capP} likeliest from past the ${EPC.cap} best by value`);
      { const LT = tiersOwn(sums.PB_TIERS);
        chk(r.tiers.length === LT.length && r.tiers.every((t, i) => t.id === 'elo-' + LT[i][0] && t.label === LT[i][1] && t.n === LT[i][2] && t.floor === LT[i][3]),
          'the Elo picks are not Suggested Parlays\' four levels (PB_TIERS) on their own floors (Safe 35%), each elo-<level>: ' + r.tiers.map(t => t.id + ' ' + t.n + ' ' + t.floor).join(', ')); }
      const sub = (n, f) => { const go = (s0, cur) => { if (cur.length === n) { f(cur); return; } for (let i = s0; i <= C.length - (n - cur.length); i++) go(i + 1, cur.concat(C[i])); }; go(0, []); };
      for (const t of r.tiers) {
        if (C.length < t.n) { chk(!t.legs.length && /^Only \d+ players? on your picks qualif(y|ies): this level takes \d\.$/.test(t.why || ''), `the ${t.id} Elo pick is not empty with its reason where only ${C.length} players qualify: ${JSON.stringify(t)}`); continue; }
        const L = sums.pbOrder(t.legs), p = L.length ? sums.parlayProb(L.map(l => ({ ...l, p: l.pe }))).corr : NaN, dec = L.length ? sums.parlayDec(L.map(l => ({ leg: l, ml: l.price }))) : NaN;
        chk(t.legs.length === t.n && t.legs.every((l, i) => l === L[i] || idC(l) === idC(L[i])) && t.legs.every(l => C.some(c => idC(c) === idC(l))) && new Set(t.legs.map(l => l.pid)).size === t.n
          && ok01(t.p) && t.p === p && t.dec === dec && (!t.floor || t.likeliest || t.p >= t.floor) && (!t.likeliest || t.floor > 0),
          `the ${t.id} Elo pick is not ${t.n} of the candidates, one a player, in the builder's order, at the builder's own sums on their Elo chances and prices, over its floor: ${t.p} at ${t.dec}, the sums ${p} at ${dec}`);
        /* "the likeliest N legs" only under the floor: a parlay at or over it is the floor's pick */
        chk(!t.likeliest || (t.floor > 0 && t.p < t.floor), `the ${t.id} Elo pick is marked the likeliest ${t.n} legs at ${t.p}, at or over its ${t.floor} floor`);
        /* the best parlay of its size with every leg in a different game: no level is worse */
        let best = null;
        sub(t.n, ls => { if (new Set(ls.map(l => l.gid)).size !== t.n) return; const pp = ls.reduce((a, l) => a * l.pe, 1), dd = ls.reduce((a, l) => a * sums.mlToDec(l.price), 1);
          if (t.floor && pp < t.floor) return; const sc = t.floor ? pp * dd : pp; if (!best || sc > best.sc) best = { sc, ls }; });
        chk(!best || (t.floor && t.likeliest ? false : (t.floor ? t.p * t.dec : t.p) >= best.sc * (1 - 1e-9)),
          `the ${t.id} Elo pick (${t.likeliest ? 'the likeliest' : t.floor ? 'best return ' + (t.p * t.dec).toFixed(4) : 'chance ' + t.p.toFixed(4)}) is worse than ${best && best.ls.map(l => l.pid + ' ' + l.stat).join(', ')}, legs all in different games (${best && best.sc.toFixed(4)})`); }
      /* the search's fast sums, parlayProb's and parlayDec's to the bit: on the levels and on 240 parlays of the
         candidates, two to five legs, most with two or three of one game (a fixed draw of its own) */
      { let seed = 20261018; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
        const byG = {}; for (const l of C) (byG[l.gid] = byG[l.gid] || []).push(l); const multi = Object.values(byG).filter(g => g.length > 1);
        const sets = r.tiers.filter(t => t.legs.length).map(t => t.legs);
        for (let q = 0; q < 240 && C.length >= 5; q++) { const n = 2 + (q % 4), pick = new Set();
          if (multi.length && q % 5) { const g = multi[Math.floor(rnd() * multi.length)]; for (let j = 0; j < Math.min(g.length, 2 + (q % 2)) && pick.size < n; j++) pick.add(g[Math.floor(rnd() * g.length)]); }
          while (pick.size < n) pick.add(C[Math.floor(rnd() * C.length)]);
          sets.push([...pick]); }
        const worked = sets.map(ls => { const O = sums.pbOrder(ls); return { legs: O, p: sums.parlayProb(O.map(l => ({ ...l, p: l.pe }))).corr, dec: sums.parlayDec(O.map(l => ({ leg: l, ml: l.price }))) }; });
        const bad = fastOff(w, C, worked);
        chk(!bad.length, `the Elo picks' fast sums are not parlayProb's and parlayDec's to the bit on ${bad.length} of ${worked.length} parlays of the files' candidates: ${bad.slice(0, 3).join('; ')}`); } }
    /* (app v118) window.eloPicks() with no games is every game the page prices, whatever the Parlay Builder's ticks say:
       the same levels with the ticks planted to nothing (until app v118 it took only the games and player sides ticked) */
    if (r && Array.isArray(r.tiers)) {
      const sig = x => x && Array.isArray(x.tiers) ? x.tiers.map(t => t.id + ':' + (t.legs || []).map(idC).join('+') + ':' + t.p + ':' + t.dec).join(' | ') : String(x);
      w.pbAllows = () => false; w.pbPlayerSides = () => false; w.eval('S.ui.pb={k:{ml:false,ats:false,total:false,over:false,under:false},off:S.sched.map(g=>g.id),open:false};');
      let r2; try { r2 = w.eloPicks(); } catch (err) { r2 = 'threw ' + err.message; } finally { delete w.pbAllows; delete w.pbPlayerSides; w.eval('delete S.ui.pb;'); }
      chk(sig(r2) === sig(r), `window.eloPicks() moves with the Parlay Builder's ticks planted to nothing: ${sig(r2).slice(0, 200)} for ${sig(r).slice(0, 200)}`); }
    /* (app v118) each unit's Elo picks on the files (unitHeld): each game of the matchups' week with priced legs, alone,
       "in this game", and that week's Sunday games before 7 pm Eastern together, "in the Sunday slot" (which games those
       are worked out here from the published payload's schedule: the matchups' season and week, a Sunday, a kickoff
       before 19:00, both Eastern as the schedule writes them; the games of it already played have no lines, so the slot
       can hand over four empty levels, each saying why) */
    { w.eval(PRICED_BY('__legs'));
      const gids = [...new Set(legs.map(l => l.gid))].sort(), wk = MU0 && MU0.week;
      const slot = SCHED.filter(g => +g.w === +wk && (!MU0 || !MU0.season || String(g.id).startsWith(MU0.season + '_')) && /^\d{4}-\d\d-\d\d$/.test(g.d || '')
        && new Date(g.d + 'T12:00:00Z').getUTCDay() === 0 && /^\d\d:\d\d$/.test(g.t || '') && g.t < '19:00').map(g => g.id);
      const units = [...gids.map(g => ({ lab: `the files' ${g} alone`, gids: [g], where: 'in this game' })), ...(slot.length ? [{ lab: `the files' week ${wk} Sunday slot (${slot.length} games)`, gids: slot, where: 'in the Sunday slot' }] : [])];
      if (!units.length) notes.push('no game in the matchups\' week has lines and the schedule has no Sunday slot for it: the units\' Elo picks are held on the check\'s own games alone');
      else { const nf = unitHeld('the files', w, legs, MU0, P.players || {}, CORR, units);
        notes.push(`each unit's Elo picks on the files: ${gids.length} game${gids.length === 1 ? '' : 's'} alone${slot.length ? ` and week ${wk}'s Sunday slot of ${slot.length} (${slot.filter(g => gids.includes(g)).length} with lines)` : ', no Sunday slot on the schedule'}, ${nf.full} levels worked out in full, ${nf.empty} empty`); } }
    chk(!errors.length, `the tab threw or logged an error on the files: ${errors.slice(0, 3).join('; ')}`);
    notes.push(`money paths: market + form on ${alt} player legs, the Elo matchup chance on ${mu} of ${legs.length} lines, the Elo picks' ${r && r.tiers ? r.tiers.filter(t => t.legs.length).length : 0} levels from ${r && r.cands ? r.cands.length : 0} of ${r && r.candidates || 0} candidates`); }

  /* ---- (app v118) window.eloUnit hands over nothing until the ratings and the matchups are both in ----
     Suggested Parlays says it is loading the Elo ratings while eloUnit gives null, and draws each unit's picks once it
     gives levels (a pick stands on both: the player's rating and his matchup). So: null before any file has answered;
     null with the ratings and the model in (market + form prices a player) and the matchups still being read (held
     here); the four levels once the matchups answer */
  { let release = null; const hold = new Promise(res => { release = res; }), errors = [], { w } = page(MU0, { errors, hold: { 'matchups.json': hold } });
    sumsInto(w, CORR); w.__legs = linesOf(MU0); w.eval(PRICED_BY('__legs'));
    const gids = [...new Set(w.__legs.map(l => l.gid))].slice(0, 1), at = () => { try { return w.eloUnit(gids, { where: 'in this game' }); } catch (err) { return 'threw ' + err.message; } };
    const pid = Object.keys(P.players || {}).find(k => ['QB', 'RB', 'WR', 'TE'].includes((P.players[k] || {}).group));
    const r0 = at(); await wait(60);
    /* the ratings in is the tab's own word for it (eloLoaded: its players file read), not a market + form price, which the
       page works out with no Elo at all */
    const rated = typeof w.eloLoaded === 'function' && w.eloLoaded() === true ? (pid ? w.eloAltP(pid, 'over', -110, 'real', 'receptions') : 0) : 'not loaded', r1 = at();
    release(); await wait(60);
    const r2 = at();
    chk(r0 === null && typeof rated === 'number' && r1 === null && !!r2 && typeof r2 === 'object' && Array.isArray(r2.tiers) && r2.tiers.map(t => t.id).join() === 'elo-safe,elo-med,elo-aggr,elo-xtrm',
      `window.eloUnit does not give null until the ratings and the matchups are both in, and the four levels once they are: before any file ${JSON.stringify(r0)}, with the ratings in (market + form ${rated}) and the matchups held ${JSON.stringify(r1)}, once they answer ${typeof r2 === 'string' ? r2 : JSON.stringify(r2 && r2.tiers && r2.tiers.map(t => t.id))}`);
    chk(!errors.length, `the tab threw or logged an error while its files were still being read: ${errors.slice(0, 3).join('; ')}`); }

  /* ---- the Elo picks' four levels on made-up lines of the check's own (17 October 2026, the owner's call: "for
     the ELO picks suggestions, can we also add an aggressive and extreme versions. is it touchdowns only or did it
     just so happen to show that? would want to see the best lines:value ratio for ELO mismatches etc") ----
     Made-up players in three made-up games, each priced at a made-up book price, his Elo chance set by a made-up
     matchup nudge (a copy of the matchups file with the fixture's players, fits and records in it), and a
     correlation table of the check's own for the same-game pairs, so it holds in any week and the off-season:
     - the candidates are the rule's, ranked on value: a -115 main line whose value beats a +150 anytime touchdown's
       leads (plus money first, the rule until that day, put the touchdown first, and every pick was touchdowns);
       a player's second line, a price past +300, a chance under 30%, a return at or under 0, a stat the matchup has
       not earned, a team bet, the model's own estimate and a player the ratings do not have are none of them, and
       a price from DraftKings' line read by Refresh odds is one;
     - every level is Suggested Parlays' rule worked out here in full (levelsOwn: every parlay of its size from the
       candidates, by the builder's own sums), its legs, chance and price exactly those, the likeliest marked so;
     - legs from one game are taken and priced together: a level with two legs of one game that move together is
       at parlayProb's and parlayDec's figures, never the legs multiplied;
     - with four candidates, Extreme is empty and says why, and the levels no parlay of whose size reaches the
       floor are the likeliest of their size. */
  { const GA = '2026_06_FXA_FXB', GB = '2026_06_FXC_FXD', GC = '2026_06_FXE_FXF', SD = 10;
    /* pid, group, team, opp, game, stat, side, line, price, the Elo chance wanted (the nudge is set to give it) */
    const ROWS1 = [
      ['fx-qa', 'QB', 'FXA', 'FXB', GA, 'passing_yards', 'over', 249.5, -115, 0.62],
      ['fx-wa', 'WR', 'FXA', 'FXB', GA, 'receiving_yards', 'over', 69.5, -110, 0.60],
      ['fx-ta', 'TE', 'FXB', 'FXA', GA, 'any_td', 'over', 1, 150, 0.44],
      ['fx-rb', 'RB', 'FXC', 'FXD', GB, 'rushing_yards', 'over', 59.5, -120, 0.62],
      ['fx-wb', 'WR', 'FXD', 'FXC', GB, 'receptions', 'over', 4.5, -130, 0.64],
      ['fx-tc', 'TE', 'FXE', 'FXF', GC, 'any_td', 'over', 1, 180, 0.38],
      ['fx-qc', 'QB', 'FXF', 'FXE', GC, 'passing_tds', 'under', 1.5, -140, 0.66],
      ['fx-wc', 'WR', 'FXE', 'FXF', GC, 'receiving_yards', 'under', 52.5, 105, 0.52, { src: 'dkline', espn: { fair: 0.46, at: '2026-10-15T03:08Z', tested: true, listed: true } }],
      /* none of these is a candidate */
      ['fx-qa', 'QB', 'FXA', 'FXB', GA, 'passing_tds', 'over', 1.5, -150, 0.63, { why: 'his second line, of lower value' }],
      ['fx-wd', 'WR', 'FXD', 'FXC', GB, 'receiving_yards', 'over', 89.5, 350, 0.40, { why: 'a price past +300' }],
      ['fx-rc', 'RB', 'FXE', 'FXF', GC, 'rushing_yards', 'over', 79.5, 250, 0.29, { why: 'a chance under 30%' }],
      ['fx-te', 'TE', 'FXF', 'FXE', GC, 'receiving_yards', 'over', 39.5, -200, 0.64, { why: 'a return under 0' }],
      ['fx-wa', 'WR', 'FXA', 'FXB', GA, 'targets', 'over', 6.5, 120, 0.70, { why: 'a stat the matchup has not earned', untrusted: true }],
      ['fx-wb', 'WR', 'FXD', 'FXC', GB, 'receiving_yards', 'over', 49.5, 100, 0.70, { why: 'the model\'s own estimate', src: 'est' }],
      ['fx-xx', 'WR', 'FXB', 'FXA', GA, 'receiving_yards', 'over', 59.5, 100, 0.70, { why: 'a player the ratings do not have', unrated: true }]];
    /* four candidates whose chances no parlay of three or more brings to its floor */
    const ROWS2 = [
      ['fx-qa', 'QB', 'FXA', 'FXB', GA, 'passing_yards', 'over', 249.5, 120, 0.50],
      ['fx-wa', 'WR', 'FXA', 'FXB', GA, 'receiving_yards', 'over', 69.5, 130, 0.47],
      ['fx-rb', 'RB', 'FXC', 'FXD', GB, 'rushing_yards', 'over', 59.5, 110, 0.52],
      ['fx-tc', 'TE', 'FXE', 'FXF', GC, 'any_td', 'over', 1, 140, 0.45]];
    /* the same-game pairs that move together, by the builder's keys (rel|grp:stat|grp:stat) */
    const CORR_FX = { 'team|QB:passing_yards|WR:receiving_yards': 0.45, 'opp|QB:passing_yards|TE:any_td': 0.08, 'opp|TE:any_td|WR:receiving_yards': 0.05,
      'opp|RB:rushing_yards|WR:receptions': -0.10, 'team|TE:any_td|WR:receiving_yards': -0.06, 'opp|QB:passing_tds|TE:any_td': 0.12, 'opp|QB:passing_tds|WR:receiving_yards': 0.10 };
    /* F3 (18 October 2026): ten legs of one game that move together, the stress harness's seed 303 and its 22nd set
       (props/build's own correlations for these pairs, copied here so the fixture is the check's), where the
       quick reading misorders parlays: the first search marked Aggressive "the likeliest 4 legs" at 12.03%, over its
       12% floor, and with one parlay worked (fin 1, tol 1) picked one of 11.95%; the Elo chances as the harness had
       them, to six places */
    const G3 = '2026_06_FXG_FXH';
    const ROWS3 = [
      ['fx-p009', 'WR', 'FXH', 'FXG', G3, 'receptions', 'over', 1.5, 117, 0.529182], ['fx-p002', 'WR', 'FXH', 'FXG', G3, 'any_td', 'over', 1.5, 108, 0.54943],
      ['fx-p008', 'QB', 'FXG', 'FXH', G3, 'completions', 'under', 1.5, 191, 0.391457], ['fx-p007', 'WR', 'FXG', 'FXH', G3, 'receptions', 'under', 1.5, 232, 0.340325],
      ['fx-p004', 'RB', 'FXH', 'FXG', G3, 'rushing_yards', 'over', 1.5, -157, 0.66656], ['fx-p000', 'TE', 'FXG', 'FXH', G3, 'any_td', 'over', 1.5, -126, 0.604264],
      ['fx-p006', 'TE', 'FXG', 'FXH', G3, 'any_td', 'over', 1.5, -101, 0.539813], ['fx-p005', 'QB', 'FXG', 'FXH', G3, 'passing_tds', 'over', 1.5, 220, 0.331885],
      ['fx-p001', 'RB', 'FXG', 'FXH', G3, 'scrim_yards', 'over', 1.5, -114, 0.541961], ['fx-p003', 'QB', 'FXH', 'FXG', G3, 'passing_yards', 'over', 1.5, 160, 0.387538]];
    const CORR_F3 = { 'team|RB:rushing_yards|WR:receptions': -0.054, 'opp|TE:any_td|WR:receptions': 0.032, 'opp|QB:passing_tds|WR:receptions': 0.076, 'team|QB:passing_yards|WR:receptions': 0.305,
      'opp|QB:completions|WR:any_td': 0.113, 'opp|WR:any_td|WR:receptions': 0.051, 'opp|QB:passing_tds|WR:any_td': 0.059, 'team|QB:passing_yards|WR:any_td': 0.163, 'team|QB:completions|WR:receptions': 0.335,
      'team|QB:completions|TE:any_td': 0.066, 'team|QB:completions|RB:scrim_yards': -0.033, 'opp|QB:completions|QB:passing_yards': 0.04, 'team|QB:passing_tds|WR:receptions': 0.116,
      'team|RB:scrim_yards|WR:receptions': -0.046, 'opp|QB:passing_yards|WR:receptions': 0.036, 'opp|QB:passing_tds|RB:rushing_yards': -0.047, 'opp|RB:rushing_yards|RB:scrim_yards': -0.102,
      'team|QB:passing_yards|RB:rushing_yards': -0.11, 'team|QB:passing_tds|TE:any_td': 0.246, 'opp|QB:passing_yards|TE:any_td': 0.038, 'team|QB:passing_tds|RB:scrim_yards': 0.056,
      'opp|QB:passing_tds|QB:passing_yards': 0.148 };
    /* F4: six receivers of one club whose yards move together strongly (0.4 a pair), each 31% at +230, which the quick
       reading overrates when several are taken, and three backs of three other games, each 65% at -170: the likeliest
       four legs (no four reach 12%) are one receiver and the three backs, all in different games, which the first
       search reached only as its best parlay of legs all in different games */
    const G4 = ['2026_06_FXJ_FXK', '2026_06_FXL_FXM', '2026_06_FXN_FXO', '2026_06_FXP_FXQ'];
    const ROWS4 = [...[0, 1, 2, 3, 4, 5].map(i => ['fx-a' + i, 'WR', 'FXJ', 'FXK', G4[0], 'receiving_yards', 'over', 1.5, 230, 0.31]),
      ...[1, 2, 3].map(i => ['fx-b' + (i - 1), 'RB', G4[i].slice(8, 11), G4[i].slice(12), G4[i], 'rushing_yards', 'over', 1.5, -170, 0.65])];
    const CORR_F4 = { 'team|WR:receiving_yards|WR:receiving_yards': 0.4 };
    /* F5: thirty legs at +150 and four heavy favourites at -190 of thinner value, each in a game of its own: the levels
       are searched from the 30 best by value and the 10 likeliest, so the favourites are there, and Safe, the best
       value over 35%, is two of them, since only the favourites' pairs reach it (until 18 October 2026 the 30 best by
       value alone cut all four) */
    const ROWS5 = [...[...Array(30)].map((_, i) => ['fx-v' + String(i).padStart(2, '0'), 'WR', 'FV' + String.fromCharCode(65 + (i % 26)) + Math.floor(i / 26), 'FW' + i, `2026_06_FV${i}_FW${i}`, 'receiving_yards', 'over', 49.5, 150, 0.45 + i * 0.0005]),
      ...[0, 1, 2, 3].map(i => ['fx-f' + i, 'RB', 'FF' + i, 'FG' + i, `2026_06_FF${i}_FG${i}`, 'rushing_yards', 'over', 59.5, -190, 0.72 - i * 0.01])];
    const sums = sumsOwn(CORR_FX);
    const build = rows => {
      const MUf = JSON.parse(JSON.stringify(MU0 || { week: 6, players: {}, fit: {}, record: {} }));
      MUf.players = MUf.players || {}; MUf.fit = MUf.fit || {}; MUf.record = MUf.record || {};
      const Pf = JSON.parse(JSON.stringify(P)); Pf.players = Pf.players || {};
      const legs = [];
      for (const [pid, grp, team, opp, gid, stat, side, k, price, want, x = {}] of rows) {
        MUf.fit[grp + '|' + stat] = { sd: SD };
        MUf.record[grp + '|' + stat] = { past: x.untrusted ? { rmse_elo: 2, rmse_form: 1, right_top: 0.4 } : { rmse_elo: 1, rmse_form: 2, right_top: 0.6 } };
        const fair = Math.min(0.99, Math.max(0.01, sums.mlProb(price) / EPC.vig)), nudge = (side === 'under' ? -1 : 1) * SD * (invPhiC(want) - invPhiC(fair));
        const v = MUf.players[pid] || (MUf.players[pid] = { group: grp, game_id: gid, team, opp, home: gid.endsWith(team), elo: 1600, opp_def: { DL: 1500, LB: 1500, DB: 1500 }, stats: {} });
        v.stats[stat] = [k, k, nudge];
        if (!x.unrated) Pf.players[pid] = { name: 'Fixture ' + pid.slice(3).toUpperCase(), group: grp, team, elo: 1600, se: 1600, rank: 3 };
        legs.push({ key: `${gid}|${pid}|${stat}`, gid, pid, stat, grp, k, side, main: stat !== 'any_td', p: 0.5, price, src: x.src || 'real', ...(x.espn ? { espn: x.espn } : {}),
          name: 'Fixture ' + pid.slice(3).toUpperCase(), team, opp, week: 6, label: side + ' ' + k + ' ' + stat, mu: k, why: x.why || null }); }
      return { MUf, Pf, legs: legs.map(({ why, ...l }) => l), whys: legs.filter(l => l.why) };
    };
    for (const [nm, rows, corr] of [['F1', ROWS1, CORR_FX], ['F2', ROWS2, CORR_FX], ['F3', ROWS3, CORR_F3], ['F4', ROWS4, CORR_F4], ['F5', ROWS5, {}]]) {
      const { MUf, Pf, legs, whys } = build(rows), errors = [], { w } = page(MUf, { errors, P: Pf }); await wait(60);
      sumsInto(w, corr);
      const sums = sumsOwn(corr);
      w.__fx = legs; w.eval('function pricedLegs(){ return window.__fx.map(l=>Object.assign({},l)); }');
      let r; try { r = w.eloPicks(); } catch (err) { r = 'threw ' + err.message; }
      if (!r || !Array.isArray(r.tiers)) { chk(false, `${nm}: the Elo picks do not build on the check's own lines: ${typeof r === 'string' ? r : JSON.stringify(r)}`); continue; }
      const own = candsOwn(legs, MUf, Pf.players, sums), C = r.cands || [];
      chk(C.map(idC).join() === own.kept.map(idC).join() && C.every((l, i) => Math.abs(l.pe - own.kept[i].pe) < 1e-6) && r.candidates === own.all.length,
        `${nm}: the Elo picks' candidates are not the rule's, ranked on value: ${C.map(l => l.pid + ' ' + l.stat + ' ' + l.price).join(', ')}; the rule ${own.kept.map(l => l.pid + ' ' + l.stat + ' ' + l.price).join(', ')}`);
      chk(!C.some(l => whys.some(x => idC(x) === idC(l))), `${nm}: a line that is no candidate is one: ` + C.filter(l => whys.some(x => idC(x) === idC(l))).map(l => whys.find(x => idC(x) === idC(l)).why).join('; '));
      if (nm === 'F5') {
        /* all 34 searched, the four favourites among them, and Safe two of them: the best value over 35%, worked out here
           over every pair (the likeliest pair where none reaches it) */
        let likely = null, best = null; for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) { const O = sums.pbOrder([C[i], C[j]]), p = sums.parlayProb(O.map(l => ({ ...l, p: l.pe }))).corr,
            d = sums.parlayDec(O.map(l => ({ leg: l, ml: l.price }))), k = O.map(idC).sort().join(',');
          if (!likely || p > likely.p || (p === likely.p && k < likely.k)) likely = { O, p, k };
          if (p >= EPC.safe && (!best || p * d > best.v || (p * d === best.v && k < best.k))) best = { O, p, k, v: p * d }; }
        const want5 = best || likely, safe = r.tiers.find(t => t.id === 'elo-safe');
        chk(C.length === 34 && ['fx-f0', 'fx-f1', 'fx-f2', 'fx-f3'].every(pid => C.some(l => l.pid === pid)) && !!best && !!safe && safe.legs.map(idC).sort().join(',') === want5.k && safe.p === want5.p
          && !safe.likeliest && safe.legs.every(l => /^fx-f/.test(l.pid)),
          `F5: the Elo picks are not searched from the 30 best by value and the 10 likeliest, or Safe is not the best value over 35%: ${C.length} searched; Safe ${safe ? safe.legs.map(l => l.pid).join('+') + ' at ' + safe.p : 'none'}, the rule's ${want5.O.map(l => l.pid).join('+')} at ${want5.p}`);
        notes.push(`the Elo picks on 34 candidates, four heavy favourites of thin value among them: ${C.length} searched, Safe ${safe ? safe.legs.map(l => l.pid.slice(3)).join('+') : 'none'}`);
        chk(!errors.length, `${nm}: the tab threw or logged an error on the check's own lines: ${errors.slice(0, 3).join('; ')}`); continue; }
      const want = levelsOwn(C, sums);
      /* the search's fast sums are the props parts' to the bit on every parlay worked out here */
      { const bad = fastOff(w, C, want.sums);
        chk(!bad.length, `${nm}: the Elo picks' fast sums are not parlayProb's and parlayDec's to the bit on ${bad.length} of ${want.sums.length} parlays: ${bad.slice(0, 3).join('; ')}`); }
      for (const t of want) { const g = r.tiers.find(x => x.id === t.id);
        if (t.none) { chk(!!g && !g.legs.length && g.why === `Only ${C.length} players on your picks qualify: this level takes ${t.n}.`, `${nm}: the ${t.label} Elo pick is not empty, saying why, with ${C.length} candidates: ${JSON.stringify(g && (g.why || g.legs.map(idC)))}`); continue; }
        chk(!!g && g.legs.map(idC).join() === t.legs.map(idC).join() && g.p === t.p && g.dec === t.dec && !!g.likeliest === t.likeliest,
          `${nm}: the ${t.label} Elo pick is not Suggested Parlays' rule on the Elo chance worked out in full (${t.likeliest ? 'the likeliest ' + t.n + ' legs' : t.floor ? 'best return over ' + t.floor : 'the likeliest pair'}): it holds ${g ? g.legs.map(l => l.pid).join(', ') + ' at ' + g.p + ', ' + g.dec + (g.likeliest ? ' (likeliest)' : '') : 'nothing'}, the rule ${t.legs.map(l => l.pid).join(', ')} at ${t.p}, ${t.dec}`); }
      if (nm === 'F1') {
        /* the -115 main line leads, ahead of the +150 touchdown: on value, never plus money first */
        const td = C.find(l => l.pid === 'fx-ta');
        chk(!!C[0] && C[0].pid === 'fx-qa' && C[0].price === -115 && C[0].main && !!td && C[0].ev > td.ev && C.indexOf(td) > 0,
          `F1: the -115 main line of the better value does not lead the Elo picks' candidates, ahead of the +150 touchdown: ${C.map(l => l.pid + ' ' + l.price + ' ' + l.ev.toFixed(3)).join(', ')}`);
        chk(C.some(l => l.src === 'dkline'), 'F1: a price from DraftKings\' line read by Refresh odds is not a candidate, on a payload with no DraftKings ids');
        /* legs of one game, priced together: some level holds two legs of one game that move together, at the
           builder's sums and not at the legs multiplied */
        const sg = r.tiers.filter(t => t.legs.length && t.legs.some((a, i) => t.legs.some((b, j) => j > i && a.gid === b.gid && Math.abs(sums.legRho(a, b)) >= 0.03)));
        chk(sg.length > 0 && sg.every(t => Math.abs(t.dec - t.legs.reduce((a, l) => a * sums.mlToDec(l.price), 1)) > 1e-3 && Math.abs(t.p - t.legs.reduce((a, l) => a * l.pe, 1)) > 1e-3),
          `F1: no Elo pick takes two legs of one game that move together, or one is priced as its legs multiplied: ${r.tiers.map(t => t.id + ' ' + t.legs.map(l => l.gid.slice(-3)).join('/') + ' ' + t.p + ' ' + t.dec).join('; ')}`);
        chk(r.tiers.every(t => t.legs.length === t.n), 'F1: an Elo pick level is empty with eight candidates');
        notes.push(`the Elo picks on the check's own lines: ${r.tiers.map(t => `${t.label} ${t.legs.map(l => l.pid.slice(3)).join('+')} ${(t.p * 100).toFixed(1)}% at ${t.dec.toFixed(2)}${t.likeliest ? ' (likeliest)' : ''}`).join('; ')}`); }
      else if (nm === 'F2') {
        chk(r.tiers.filter(t => t.likeliest).length >= 2 && r.tiers.every(t => !t.likeliest || (t.floor && t.p < t.floor)),
          `F2: the levels no parlay of whose size reaches the floor are not the likeliest of their size, marked so: ${r.tiers.map(t => t.id + (t.likeliest ? ' likeliest' : '') + ' ' + t.p).join(', ')}`);
        notes.push(`the Elo picks on four candidates: ${r.tiers.map(t => t.legs.length ? `${t.label} ${t.legs.length}${t.likeliest ? ' (likeliest)' : ''}` : `${t.label} empty`).join('; ')}`); }
      else {
        /* every level here is held above to the rule worked out in full; and none is marked the likeliest at or over its floor */
        chk(r.tiers.every(t => !t.likeliest || (t.floor && t.p < t.floor)), `${nm}: a level is marked the likeliest at or over its floor: ${r.tiers.map(t => t.id + (t.likeliest ? ' likeliest' : '') + ' ' + t.p).join(', ')}`);
        notes.push(`the Elo picks on ${nm}'s ${C.length} candidates (${want.sums.length} parlays worked in full): ${r.tiers.map(t => `${t.label} ${(t.p * 100).toFixed(2)}%${t.likeliest ? ' (likeliest)' : ''} in ${new Set(t.legs.map(l => l.gid)).size} game${new Set(t.legs.map(l => l.gid)).size > 1 ? 's' : ''}`).join('; ')}`); }
      /* (app v118) each unit's Elo picks on the check's own games (unitHeld), so it holds in any week: game A alone, "in
         this game", and games B and C together as a Sunday slot, "in the Sunday slot" (eloUnit takes the unit's games as
         Suggested Parlays hands them over). F1's game A has three of its eight candidates, so its Aggressive and Extreme are
         empty, saying why, and B and C five; F2's two and two, so every level past Safe is; the check fails unless it met
         both a level worked out in full and an empty one, and a unit whose candidates are not the whole week's */
      if (nm === 'F1' || nm === 'F2') { w.eval(PRICED_BY('__fx'));
        const nf = unitHeld(nm, w, legs, MUf, Pf.players, corr, [{ lab: 'game A alone', gids: [GA], where: 'in this game' }, { lab: 'games B and C as a Sunday slot', gids: [GB, GC], where: 'in the Sunday slot' }]);
        const nA = candsOwn(legs.filter(l => l.gid === GA), MUf, Pf.players, sums).all.length;
        chk(nf.full > 0 && nf.empty > 0 && nA > 0 && nA < own.all.length, `${nm}: the units' check met ${nf.full} levels worked out in full and ${nf.empty} empty, and game A has ${nA} of ${own.all.length} candidates: it holds less than it says`);
        notes.push(`each unit's Elo picks on ${nm}: game A alone (${nA} candidates) and games B and C as a Sunday slot, ${nf.full} levels worked out in full, ${nf.empty} empty`); }
      chk(!errors.length, `${nm}: the tab threw or logged an error on the check's own lines: ${errors.slice(0, 3).join('; ')}`); }
  }

  /* ---- F6 (18 October 2026): the search's pruning and its bounds, on seeded one-game slates of the check's own ----
     A review planted two plausible slips in the search, a partial parlay pruned at the floor itself rather than at the
     least quick chance whose most reaches it, and the price-first pass reading a parlay's quick chance as its most, and
     both gates passed while levels came up to 29% short of the best (F3 to F5 catch a search that is broken outright,
     not one a little off near a floor). So: twenty one-game slates of 9 to 12 made-up candidates, four in five on one
     club, each leg's Elo chance clustered about where its level's floor falls (0.592 a leg for Safe's 35%, the Elo
     picks' own since 18 October 2026, 0.63 for Medium's 25%, 0.589 for
     Aggressive's 12%, 0.549 for Extreme's 5%) at +100 to +140, on a correlation table of the check's own (the
     published payload's pairs among the stats drawn, as of October 2026), and every level the search picks (the tab's
     own code, compiled here on its own, so it is quick) held to every parlay of its size worked out in full by the
     tab's fast sums, which the checks above hold to the props parts' sums to the bit (the parts' own where they give
     none). Planted, the two slips fail it 4 and 3 times. */
  { const a0 = TAB.indexOf('const EP={'), b0 = TAB.indexOf("/* a parlay's fair chance (parlayFair,");
    let F = null; try { F = new Function('PAY', 'window', SUMS_SRC + '\n' + TAB.slice(a0, b0) + '\nreturn {PB_TIERS,mlToDec,epPrep,epLevel,epSums,epExact};')({ corr: CORR_F6 }, {}); } catch (err) { F = 'threw ' + err.message; }
    if (a0 < 0 || b0 < a0 || !F || typeof F === 'string') chk(false, `F6: the tab's search could not be read on its own (EP to parlayFair): ${typeof F === 'string' ? F : 'not found'}`);
    else {
      let s = 20261018; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      const STATS = { QB: ['passing_yards', 'passing_tds', 'completions'], RB: ['rushing_yards', 'scrim_yards', 'receptions'], WR: ['receptions', 'receiving_yards', 'any_td'], TE: ['receiving_yards', 'any_td'] };
      const GRPS = ['QB', 'RB', 'WR', 'WR', 'WR', 'TE'], gid = '2026_06_FSA_FSB';
      const slate = (si, near) => { const N = 9 + (si % 4), C = []; let n = 0;
        while (C.length < N) { const home = rnd() < 0.2, grp = GRPS[Math.floor(rnd() * GRPS.length)], stat = STATS[grp][Math.floor(rnd() * STATS[grp].length)];
          const pe = near + (rnd() - 0.5) * 0.03, ml = 100 + Math.round(rnd() * 40), side = stat === 'any_td' || rnd() < 0.75 ? 'over' : 'under';
          if (!(pe * F.mlToDec(ml) > 1)) continue; n++;
          C.push({ key: `${gid}|fs-${si}-${n}|${stat}`, gid, pid: `fs-${si}-${n}`, name: 'S' + n, grp, team: home ? 'FSB' : 'FSA', opp: home ? 'FSA' : 'FSB', stat, k: 1.5, side, main: true, price: ml, src: 'real', p: 0.5, pe, ev: pe * F.mlToDec(ml) - 1, week: 6 }); }
        return C.sort((x, y) => (y.ev - x.ev) || cmpC(idC(x), idC(y))); };
      const full = P => { const out = {}, memo = new Map(), C = P.C;
        const sumOf = ids => { const k = ids.join(','); let e = memo.get(k); if (e) return e; const legs = ids.map(i => C[i]), f = F.epSums(P, ids), x = f || F.epExact(legs);
          e = { p: x.p, dec: x.dec, id: legs.map(idC).sort().join(',') }; memo.set(k, e); return e; };
        for (const [id, , n, floor] of tiersOwn(F.PB_TIERS)) { let best = null, likely = null; const idx = [];
          const go = (st, d) => { if (d === n) { const e = sumOf(idx.slice()); if (!likely || e.p > likely.p || (e.p === likely.p && e.id < likely.id)) likely = e;
              if (floor && e.p >= floor) { const v = e.p * e.dec; if (!best || v > best.v || (v === best.v && e.id < best.e.id)) best = { e, v }; } return; }
            for (let i = st; i <= C.length - (n - d); i++) { idx[d] = i; go(i + 1, d + 1); } };
          go(0, 0); out[id] = floor ? (best ? { ...best.e, likeliest: false } : { ...likely, likeliest: true }) : { ...likely, likeliest: false }; }
        return out; };
      const bad = []; let sets = 0, levels = 0, near = 0;
      for (const [floor, at] of [[0.35, 0.592], [0.25, 0.63], [0.12, 0.589], [0.05, 0.549]]) for (let i = 0; i < 5; i++) {
        const C = slate(sets++, at), P = F.epPrep(C), want = full(P), memo = new Map();
        for (const t of tiersOwn(F.PB_TIERS)) { const [id, label, , fl] = t, w = want[id]; let r = null; try { r = F.epLevel(P, t, memo); } catch (err) { r = { err: err.message }; }
          levels++; if (fl && Math.abs(w.p - fl) < 0.004) near++;
          const got = r && r.legs ? r.legs.map(idC).sort().join(',') : null;
          if (got !== w.id || !!(r && r.likeliest) !== w.likeliest) bad.push(`slate ${sets - 1} (${C.length} legs, ${floor * 100}%) ${label}: ${r && r.legs ? `${(r.p * 100).toFixed(2)}% at ${r.dec.toFixed(2)}${r.likeliest ? ' (likeliest)' : ''}` : r && r.err ? 'threw ' + r.err : 'none'}, the best ${(w.p * 100).toFixed(2)}% at ${w.dec.toFixed(2)}${w.likeliest ? ' (likeliest)' : ''}`); } }
      chk(!bad.length, `F6: on ${bad.length} of ${levels} levels of the check's seeded one-game slates, the search does not pick the best its rule allows, every parlay of its size worked out in full: ${bad.slice(0, 3).join('; ')}`);
      notes.push(`the Elo picks' search on ${sets} seeded one-game slates of 9 to 12 legs near the floors: ${levels - bad.length} of ${levels} levels the full enumeration's, ${near} of them within 0.4 points of a floor`); } }

  console.log(`elo tab check: ${checks} checks, ${fails.length} failures`);
  for (const n of notes) console.log('  note: ' + n);
  for (const f of fails) console.log('  FAIL: ' + f);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
