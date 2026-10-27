/* The ELO Ratings tab's own gate: nflbets/build/tab_elo.html run in jsdom on elo/data, with the
 * page around it stubbed (the schedule, the clock, the shields), so what the tab does with the
 * files is checked on the job's run, before anything is committed.
 *
 *   node elo/check_tab.js                  (from the hub root; jsdom is borrowed from props/build)
 *   node elo/check_tab.js --data DIR --tab FILE      (tests: another build's files or tab)
 *
 * Each check is the tab's behaviour on any week's files, never this week's names:
 *   - a game that has kicked off leaves the Mismatches (it was promoted as this week's edge
 *     for a game already played), and a player's window says so, "This game has kicked off." alone;
 *   - no description on the tab (22 October 2026, the owner's call: "i dont want any descriptions
 *     anywhere"): no lead under the rankings or a team table, no note under a window's stats, no lead in
 *     the Mismatches window; the curve's key "N ranked <label>" and "bell curve"; the rankings' opening
 *     note, the files' lag (sourceNote), the Mismatches card's title and its filing line and the player
 *     window's empty states each in their few words, word for word, on copies planted so;
 *   - a Mismatches bubble wears the same season shield as the player's ranking and badge
 *     (it wore the raw career rating's, so one card disagreed with itself);
 *   - a player the build counts out (out last week and not practising, say) is ruled out on
 *     the page, with the build's reason in his window ("Not expected to play: <reason>."), one the
 *     page's inactive list holds "Ruled out for week N." and one with no matchup "No matchup for week N.";
 *   - the rankings say how far the season has got as the build words it, a questionable
 *     player carries a Q, and the bar draws no ELO Model record or walk-forward pill (it split the
 *     record into calls made before kickoff and backtest until 22 October 2026, the owner's call),
 *     only its stamp;
 *   - every ranked player has a trend line, one game in too (week 1's column was blank);
 *   - a player kept out of the players map is priced by nothing, but the Prop Record still
 *     reads the rating he took into each week he played (it graded those weeks at 1500);
 *   - Overall Offense and Overall Defense are two pills in the position row, each opening a table
 *     of the 32 teams in the file's rank order, ratings never rising, each with a shield, every
 *     stat's value and league rank the file's; the column heads give the file's weights (summing to
 *     100, and a copy with other weights shows those, so the page cannot carry its own) and mark the
 *     stats that weigh nothing "shown only", with no lead, note or walk-forward text on the card; a
 *     column sorts best first and back, # keeping the overall rank; a team's window lists every stat,
 *     its line, and its coming opponent when the file calls one ("Next: week 8 vs KC, 5th of 32 in
 *     Overall Offense (1540, Gold)", no more);
 *     Close and Escape shut it; and a model.json from before the stats still draws the old columns;
 *   - Run Defense, Pass Defense and Pass Rush, and their offense sides Run Offense, Pass Offense and
 *     Pass Protection (16 October 2026, the owner's asks), the file's own position tables
 *     (`units.tables`, each with its side `of` and its `pair`, the other side of its facet on the same
 *     stats), are pills with those two in two rows that read as offense and defense: "Offense", then
 *     Overall Offense and the offense tables, and "Defense", then Overall Defense and the defense
 *     tables, each in the file's order and named as it names them; each table held to all of the
 *     above on its own stats, its window's coming opponent its pair's rank (Run Defense's opponent in
 *     Run Offense), and no text of its walk-forward tests (the file keeps them); a file with the defense
 *     tables and no pair (every build of 16 October 2026 before the offense tables) draws them as it
 *     did, its opponent's Overall Offense rank named; a file without the tables (every build before
 *     them) draws exactly the two pills;
 *   - each club's line starts at its own start from the file; a club with no game yet this season
 *     (a copy of the file with one made so) is ranked and shown on its carried rating, marked
 *     "carried from" the season the file names, on the curve, with its window saying "No game yet this
 *     season: carried from <season>."; a file from before the carry (one start a side, no carry)
 *     still draws, its lines from that start, with no carried mark;
 *   - the team table scrolls sideways inside its card at a desktop width, not only on a phone: it, or
 *     a box between it and the card, has overflow-x auto by a rule outside any media query (fifteen
 *     columns ran past the card at 1280 px and the whole page scrolled), and the team column can
 *     stick in that box: nothing between them clips, as the page's own rule clips every table. The
 *     page's stylesheet (props/build/part1.html) goes round the tab for this. jsdom lays nothing
 *     out and reads only the rules a desktop screen gets, so this is the style, not a measured width;
 *   - the money the files feed, on every matchup line in them (app v138, the owner's call of 27 October 2026: every leg
 *     at DraftKings' fair chance, and market + form, fitted on this season's games and showing no signal, gone): the Elo
 *     matchup chance (eloMatchupP, DraftKings' fair chance on a leg moved by the matchup's nudge) a chance on every line,
 *     the check's own where the stat's nudge has held up and none where it has not; and the Elo picks (eloPicks): the
 *     candidates the rule's, worked out here on a fair chance of the check's own (legFairStand, set into the page in the
 *     props parts' legFair's place): a rated player's line DraftKings prices, -200 to +300, DraftKings' fair chance on it
 *     30% or more and his Elo chance above it (the lean), his largest lean (the main line on a tie, then the lower id),
 *     ranked by lean, every one kept; and Suggested Parlays' four sizes, each the first n candidates that go together on
 *     one DraftKings slip (a greedy prefix: a candidate DraftKings will not take beside one already taken passed over,
 *     and since the review of 27 October 2026 one that moves against one already taken by more than -0.05, by the payload's
 *     pair table as the builder's sums read it, signed by the legs' sides, the check's own reading, rhoOwn, OPP_OWN and
 *     opposedOwn), floor 0 and
 *     never the likeliest, at the builder's own sums compiled here from the props parts' source (parlayProb on the Elo
 *     chances, parlayDec on the prices), its stated fair chance parlayFair's (parlayProb on DraftKings' fair chances),
 *     with no error thrown or logged; market + form (eloAltP, eloAltZ) and the old search's fast sums (eloSums) gone;
 *   - the Elo picks on made-up players, games, prices, nudges and correlations of the check's own, so it holds in any
 *     week: F1, the candidates' rule (a line two-sided with its margin out, one-sided over the check's margin, a price
 *     from DraftKings' line read on ESPN, the price band's end, a price past it either way, a fair chance under 30%, an
 *     Elo chance under the fair chance, one above the price's one-sided reading but under DraftKings' fair chance with
 *     both sides' margin out and one the other way round, a player's second line, a stat the matchup has not earned, a
 *     team bet, the model's own estimate, a player the ratings do not have and a nudge of 0), the levels, one holding two legs of one
 *     game priced together, the card's options (each leg's Elo lean, how a level was chosen), and the id rule by an
 *     entry's content; F2, the greedy prefix (a quarterback's passing TDs leaning furthest, his receivers' touchdowns
 *     passed over, so a level runs short and says so, and with no pair rule the same levels hold a pair), leans tied to
 *     the bit broken by the main line then the lower id, a player's two lines tied keeping his main line, the slot's
 *     summed lean and its tie to the earlier game, the levels' words where too few qualify and where too few go together,
 *     every candidate kept with no cap, and the props parts' DraftKings pair rule as loaded the check's own on every pair;
 *   - each unit's Elo picks (app v118, the owner's call of 19 October 2026: "I would like it to have ELO picks for the
 *     slot of Sunday games"): window.eloUnit, which Suggested Parlays draws in each night game and in the Sunday slot,
 *     on the files for each game of the matchups' week with lines and for that week's Sunday games before 7 pm Eastern
 *     (from the published payload's schedule), and on the check's own games (F1 and F2: a game alone and two as a slot):
 *     the candidates the rule's on those games' legs alone, every level the greedy prefix worked out here, an empty level
 *     handed over saying why "in this game", all of it the same with the Parlay Builder's ticks planted to nothing
 *     (eloPicks() too, over every game), and null until the ratings and the matchups are both in; the Sunday slot one game
 *     a level since app v121 (the owner, 19 October 2026: "the legs need to be part of the same game parlay only, and
 *     anytime there's a mix it bombs the hyperlink"): each of its games held alone, and each slot level one game's legs,
 *     the best of its games' own by the check's own copy of the slot's rule (since app v138 the larger lean summed over
 *     its legs, then the earlier game), an empty one saying so of "any one game of the Sunday slot";
 *   - the pairs DraftKings will not take on one slip (app v121, the owner, 19 October 2026: "If your parlay already has a
 *     receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets blocked"): the
 *     props parts' rule (dkClash) loaded beside the tab, as the hub has it, and the same as the check's own copy
 *     (clashOwn) on every pair of F2's legs and of game legs beside them; no Elo pick level, on the files, the check's
 *     fixtures, a unit or the slot, holding a quarterback's passing TDs with a teammate's touchdown; and a level with
 *     enough candidates but a shorter greedy prefix empty, saying what the walk found, "Strongest first, only 2 leans in
 *     this game go together on one DraftKings slip: this level takes 3." (F2: a quarterback's passing TDs and his receivers'
 *     touchdowns; until the check of 27 October 2026 it said "No 3 players in this game go together on DraftKings’ slip.",
 *     which the walk cannot know: it passes over a receiver beside his quarterback where three others may go together;
 *     from that check to its review the same day "... go on one DraftKings slip ...", which a walk passing over legs that
 *     move against each other, which DraftKings would take, makes untrue);
 *   - the legs that move against each other (the review of 27 October 2026: week 7's DAL at PHI Extreme held Tanner
 *     McKee's Under 192.5 passing yards with his receivers' overs, -44.8% at DraftKings' fair chance, the parlay's chance
 *     falling under the legs multiplied while parlayDec never pays more than multiplying): no Elo pick level, on the files,
 *     the check's fixtures, a unit or the slot, holding two legs whose correlation, as the builder's sums read it and
 *     turned by their sides, is below -0.05 (opposedOwn, OPP_OWN: the bar was nothing until the same day, which emptied
 *     week 7's KC at SEA's Medium, Aggressive and Extreme over pairs of -0.034 to -0.102); F2's L at M, a back's receiving
 *     yards over leaning furthest with a teammate's receptions over at -0.04 kept and the other club's tight end's yards
 *     over at -0.06 passed over, so the walk tells the bar from nothing and from no bar; F2's J at K, a quarterback's passing yards under leaning
 *     furthest with his receiver's and his tight end's yards over passed over beside it, so its Safe takes the other
 *     club's back and its Medium and Aggressive run short, saying so ("Strongest first, only 2 leans in this game go
 *     together on one DraftKings slip: this level takes 3."), where with neither rule its Safe is the quarterback and his
 *     receiver, no pair DraftKings refuses, so the fixture tells the walk from one without the rule;
 *   - the Mismatches bubbles' words (18 October 2026): what an edge ranks is the matchup formula's units
 *     by their players' Elo ("vs the LAC secondary and defensive line, 32nd by player Elo"), never "a
 *     pass defense ranked", which on the page is the ELO Ratings tab's Pass Defense table; clubs level on a unit (to
 *     the hundredth) share its rank, held on a copy with one club's secondary a floating-point hair above another's, and
 *     clubs level on the Elo a team table shows share its # (22 October 2026), held on a copy so ranked. Since October 2026 the whole page's smoke
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
/* a team table's rows (tr.pe-tmrow, in the order drawn) in the file's rank order, each # the file's rank: the first 1,
   each next one more than the rows above it (its place) or, sharing the rank above it, level with that club on the Elo
   shown (since 22 October 2026 elo/build.py ranks a table on the Elo it shows, clubs level on it sharing a rank, one more
   than the clubs above them; a file from before ranks every club once, which this holds too) */
const rankRowsOk = (R, T) => R.every((tr, i) => {
  const v = T[tr.dataset.team], p = i ? T[R[i - 1].dataset.team] : null;
  return !!v && txt(tr.querySelector('.pe-rank')) === String(v.rank)
    && (v.rank === i + 1 || (!!p && v.rank === p.rank && v.elo === p.elo && !!(v.games || v.carried) && !!(p.games || p.carried)));
});
/* the descriptions the tab drew until 22 October 2026 (the owner's call: "in all sections get rid of all text wall
   descriptions. i dont want any descriptions anywhere"), a phrase of each: the rankings' lead, each team table's lead,
   its note on the stats that weigh nothing and its walk-forward note, the team window's note under its stats and its
   carried note's tail, the player window's note under his stats and the tails of its empty states, the Mismatches
   card's tagline and its filing line's rule, the Mismatches window's lead, the curve key's scale, the source note's
   clauses and the Next line's tail. None may come back on the tab, wherever it is read */
const ELO_GONE = /ranked ladder rates|placement games|Click a player for|Career is the rating with|rated on this season's games|a standard deviation better|standard deviations?:|weighs? nothing|told nothing more|Fitted on|root mean square|a forecast of the|used only for that test|the best eight green|click a column|a team can stand above|on today's curve|moves from its first game|League rank is the season's|Adds is what each|Recent form is his|Faded rows|the projections cover|so there is no matchup to show|not an expected starter in this week|The projection below was made|leave it out|the best players against the weakest|in the games still to kick off|until a club files|starter can still change|The biggest edges this week|Facing<\/b> ranks|Facing ranks|Click a row|coloured by shield|1500 the average|not in nflverse's player stats|wait on nflverse's play-by-play|table to set against|so this is its overall rank|whose (?:offense|defense) is|take over from|has begun/;
const eloGone = el => { const m = ELO_GONE.exec(txt(el)); return m ? m[0] : ''; };
/* the stub's tier (page()'s pkEloTier, below), the name each Elo is given on these pages */
const stubTier = e => e >= 1700 ? 'Elite' : e >= 1600 ? 'Diamond' : e >= 1500 ? 'Gold' : 'Silver';
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
/* (app v121) with them the props parts' DraftKings pair rule (dkPassTd, dkClashWhy, dkClash: a quarterback's passing
   TDs with a teammate's anytime touchdown, or his passing TDs over with the game's total), which the tab's search reads
   as the page has it (epPrep's P.cl, where dkClash is a function), so the search the checks drive here applies it as the
   hub does; every level is held below to the check's own copy of the rule (clashOwn), never this one */
const SUMS_SRC = [[PART2, 'const clip='], [PART2, 'const TOTAL_RHO='], [PART2, 'function isGameLeg('], [PART2, 'function legRho('], [PART2, 'function invNorm('],
  [PART2, 'function cholesky('], [PART2, 'function mulberry('], [PART2, 'function parlayProb('], [PART2, 'function mlProb('], [PART3, 'function mlToDec('],
  [PART3, 'const SGP_HOLD='], [PART3, 'function parlayDec('], [PART3, 'const PB_TIERS='], [PART3, 'const pbOrder='],
  [PART3, 'const dkPassTd='], [PART3, 'function dkClashWhy('], [PART3, 'const dkClash=']].map(([s, h]) => srcOf(s, h)).join('\n');
const sumsOwn = corr => new Function('PAY', SUMS_SRC + '\nreturn {parlayProb,parlayDec,pbOrder,PB_TIERS,mlProb,mlToDec,legRho,CORR:PAY.corr};')({ corr: corr || {} });
/* (app v125) the page's id rule (part3.js: dkCarries, which reads a PAY.dk entry's content, and dkIdOf), set into a tab's
   page as the hub page has it beside the tab, for F1's read-made entry */
const DK_SRC = [[PART3, 'const DK_PRESS_MADE='], [PART3, 'function dkPressMade('], [PART3, 'function dkEntryCarries('], [PART3, 'function dkCarries('], [PART3, 'function dkIdOf(']]
  .map(([s, h]) => srcOf(s, h)).join('\n').replace(/^const /gm, 'var ');
/* the same into a tab's page, with its PAY's correlation table; and (app v138) the check's own fair chance in the props
   parts' legFair's place (legFairStand, below), the stated rule on it in legFairStated's (the review of 27 October 2026:
   a total on one price at its own 50%; an Elo pick holds none), legPrice standing for the price a leg is shown at (its
   own), and the parts' own parlayFair on them, which the Elo picks state a level's fair chance by (tab_elo.html's epFair) */
const PFAIR_SRC = srcOf(PART3, 'function parlayFair(');
const sumsInto = (w, corr) => { w.eval(`var PAY={corr:${JSON.stringify(corr || {})}};\n${SUMS_SRC.replace(/^const /gm, 'var ')}
function legFair(l,memo){ return (${legFairStand.toString()})(l); }
function legFairStated(l,memo){ const f=legFair(l,memo); return l&&l.stat==='total'&&(!f||f.est)?(l.p>0&&l.p<1?{p:+l.p,est:true}:f):f; }
function legPrice(l){ return {src:l.src,ml:l.price}; }
${PFAIR_SRC}`); };   /* a top-level const in eval'd code is the eval's own: var makes it the page's */
/* the published payload's correlation table, the one the page prices same-game legs with */
const CORR = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8')).corr || {}; } catch (e) { return {}; } })();
/* (app v118) and its schedule, whose dates and kickoffs (Eastern) say which of a week's games are its Sunday slot */
const SCHED = (() => { try { const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8')).sched; return Array.isArray(s) ? s : []; } catch (e) { return []; } })();
/* a leg for every matchup line in a matchups file, over and under, at -110 and +150: what the checks price the files on,
   each on its player's club as the page's legs are (since app v121 the pair rule reads it: a teammate's touchdown) */
const linesOf = MU => { const legs = [];
  for (const [pid, pl] of Object.entries((MU && MU.players) || {})) for (const st of Object.keys(pl.stats || {})) {
    const proj = (pl.stats[st] || [])[1], k = isFinite(proj) ? Math.floor(proj) + 0.5 : 0.5;
    for (const side of ['over', 'under']) for (const price of [-110, 150])
      legs.push({ key: `${pl.game_id}|${pid}|${st}`, gid: pl.game_id, pid, stat: st, grp: pl.group, team: pl.team, opp: pl.opp, k, side, price, src: 'real', name: pid, label: st }); }
  return legs; };
/* the page's pricedLegs stood in by a list of legs, answering for the games it is asked about as the props parts' does */
const PRICED_BY = name => `function pricedLegs(games){ const G=games?new Set(games.map(g=>g.id)):null; return window.${name}.filter(l=>!G||G.has(l.gid)).map(l=>Object.assign({},l)); }`;
/* (app v138) the Elo picks' rule, the check's own copy (tab_elo.html, EP and eloCands; the owner's call of 27 October 2026:
   every leg at DraftKings' fair chance): a rated player's line DraftKings prices (a book price, or one worked from its
   line read on ESPN), never a team bet, priced -200 to +300, DraftKings' fair chance on it (legFairStand) 30% or more,
   and its Elo chance, that fair chance moved by his matchup's nudge in the stat's typical miss toward the side it
   favours, on a stat the matchup has earned, above that fair chance: its lean, the Elo chance less the fair chance, above
   nothing. One leg a player, his largest lean (the main line on a tie, then the lower id); the candidates ranked by lean,
   largest first, every one kept. Until app v138 the Elo chance stood on the book's implied chance over a fixed 4.5%
   margin, a candidate's expected return at it had to be above nothing, and the levels were searched from the 30 best by
   value and the 10 likeliest */
const EPC = { lo: -200, hi: 300, min: 0.30 };
/* a lean this near nothing is none: only a nudge of 0 gives one (the files write a nudge to the hundredth, and a nudge of
   0.01 leans 1e-4 or more on every stat's typical miss), and its lean is then the page's normal curves' own rounding
   (ncdf and nq, which together err by up to 2.1e-7 either way), so such a leg leans nowhere and is no candidate */
const LEAN_EPS = 1e-6;
/* DraftKings' fair chance on a leg, the check's own stand-in for the props parts' legFair, which the Elo picks read: a
   book price (src 'real') with the other side's price on the leg (oth) its share of the two with the margin out; one
   with no other side its implied chance over a margin of the check's own, 5.66% (the estimate's), est.; a price worked
   from DraftKings' line read on ESPN (src 'dkline') the read's own fair chance (espn.fair), est.; none for any other
   (the model's own estimate). Set into each tab's page as legFair (sumsInto) and read here, so a page that took its fair
   chance from anywhere else (the price's implied chance over the old 4.5% margin, or one side alone) is told apart */
function legFairStand(l) {
  if (!l || !(l.src === 'real' || l.src === 'dkline') || !isFinite(l.price) || !l.price) return null;
  const imp = x => x < 0 ? -x / (100 - x) : 100 / (100 + x);
  if (l.src === 'dkline') { const f = l.espn && l.espn.fair; return f > 0 && f < 1 ? { p: f, est: true } : null; }
  if (isFinite(l.oth) && l.oth) { const a = imp(l.price), b = imp(l.oth); return { p: a / (a + b), est: false }; }
  return { p: Math.max(0.001, Math.min(0.999, imp(l.price) / 1.0566)), est: true };
}
/* a parlay's fair chance as the props parts' parlayFair works it, on the check's own fair chances: parlayProb (the
   check's own compile, sums) on the legs as given, each at its fair chance; p null where a leg has none */
function fairOwn(legs, sums) {
  const f = legs.map(legFairStand), miss = f.filter(x => !x).length;
  if (miss) return { p: null, est: false, miss };
  return { p: sums.parlayProb(legs.map((l, i) => ({ ...l, side: l.side || 'over', p: f[i].p }))).corr, est: f.some(x => x.est), miss: 0 };
}
/* (app v121) the pairs DraftKings will not take on one slip, the check's own copy of the props parts' rule (dkClashWhy;
   the owner, 19 October 2026: "If your parlay already has a receiver anytime TD, a team total, or the game total, adding
   the QB's passing TD over often gets blocked", and "Some combos contradict each other, like QB under 1.5 passing TDs
   alongside two of his receivers to score. The book rejects it outright."): two legs of one game, one a player's passing
   touchdowns (over or under, a main line or a rung) and the other a teammate's anytime touchdown, 'td'; or his passing
   touchdowns over with the game's total, 'total'; none for any other pair. No level may hold such a pair. The Elo picks'
   candidates are player legs, so only 'td' meets them; 'total' is here so the copy is the whole rule */
const GAME_STAT = new Set(['ml', 'ats', 'total']);
const passTdOwn = l => !!l && !GAME_STAT.has(l.stat) && l.stat === 'passing_tds';
function clashOwn(a, b) {
  if (!a || !b || a.gid !== b.gid) return null;
  const one = (q, o) => !passTdOwn(q) ? null : (!GAME_STAT.has(o.stat) && o.stat === 'any_td' && o.team === q.team && o.pid !== q.pid) ? 'td' : (q.side !== 'under' && o.stat === 'total') ? 'total' : null;
  return one(a, b) || one(b, a);
}
const clashIn = legs => legs.some((a, i) => legs.some((b, j) => j > i && clashOwn(a, b)));
/* (the review of 27 October 2026) two legs that move against each other, the check's own reading of the correlation the
   builder's sums read for the pair (the props parts' legRho, which the tab's walk calls): for two players' lines of one
   game the shipped pair table's entry under rel|grp:stat|grp:stat (rel 'self' for one player, 'team' for one club, 'opp'
   across, the two keys in order), 0 across games or where the table has none; each leg's side turning it (an under -1,
   as parlayProb turns it); opposed where that is below OPP_OWN, -0.05, the check's own copy of the tab's EP.opp (two even
   legs at -0.05 lose about 3% of their chance all land against independence; the McKee case below is about -0.10 and
   under; until the same day the bar was nothing, and week 7's KC at SEA lost three levels to pairs of -0.034 to -0.102).
   The Elo picks' candidates are players' lines, never a
   team bet or a total, so the table is all that meets them. No level may hold such a pair: week 7's DAL at PHI Extreme
   took Tanner McKee's Under 192.5 passing yards with his receivers' overs, -44.8% at DraftKings' fair chance */
function rhoOwn(a, b, corr) {
  if (!a || !b || a.gid !== b.gid) return 0;
  const x = a.grp + ':' + a.stat, y = b.grp + ':' + b.stat, rel = a.pid === b.pid ? 'self' : a.team === b.team ? 'team' : 'opp';
  const v = (corr || {})[rel + '|' + (x < y ? x + '|' + y : y + '|' + x)]; return typeof v === 'number' && isFinite(v) ? v : 0;
}
const OPP_OWN = -0.05;
const opposedOwn = (a, b, corr) => (a.side === 'under' ? -1 : 1) * (b.side === 'under' ? -1 : 1) * rhoOwn(a, b, corr) < OPP_OWN;
const opposedIn = (legs, corr) => legs.some((a, i) => legs.some((b, j) => j > i && opposedOwn(a, b, corr)));
/* the greedy prefix, the check's own: walking the candidates C in the lean order, one DraftKings will not take beside one
   already taken (clashOwn) or that moves against one already taken (opposedOwn, on the table corr) passed over; o.free
   takes them all, as the page did before app v121 */
function takeOwn(C, corr, o) {
  const free = !!(o && o.free), take = [];
  for (const l of C) { if (!free && take.some(t => clashOwn(t, l) || opposedOwn(t, l, corr))) continue; take.push(l); }
  return take;
}
/* the words an empty Elo pick level says (eloPicks and eloUnit, app v138): fewer players qualify than it takes (N, every
   candidate), or that many do and the greedy prefix of leans that go together on one DraftKings slip (none refused
   beside another, none moving against another) is shorter, k long (the most of any game's, for the slot); where: the
   unit's own place ("in this game", "on your picks", "in any one game of the Sunday slot"). App v130 took the clause
   spelling out DraftKings' rule off it, and the review of 27 October 2026 put "together" in it, so the words stay true
   of a walk that passes over legs moving against each other, which DraftKings would take */
const whyOwn = (n, N, where, k) => N >= n ? `Strongest first, only ${k} lean${k === 1 ? '' : 's'} ${where} go${k === 1 ? 'es' : ''} together on one DraftKings slip: this level takes ${n}.`
  : `Only ${N} player${N === 1 ? '' : 's'} ${where} qualif${N === 1 ? 'ies' : 'y'}: this level takes ${n}.`;
const erfC = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const PhiC = z => 0.5 * (1 + erfC(z / Math.SQRT2));
const invPhiC = p => { let lo = -9, hi = 9; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (PhiC(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
const idC = l => l.key + '|' + l.side + '|' + l.k, cmpC = (a, b) => a < b ? -1 : a > b ? 1 : 0;
/* a leg's Elo chance worked out here: DraftKings' fair chance on it moved by the matchup's nudge in the stat's typical
   miss toward the side it favours, on a stat the matchup has earned; null where it has none, or with no fair chance */
function eloPOwn(MU, l, fair) {
  const pl = MU && MU.players && MU.players[l.pid], a = pl && pl.stats && pl.stats[l.stat]; if (!a) return null;
  const r = MU.record && MU.record[pl.group + '|' + l.stat], q = r && r.past; if (!(q && q.rmse_elo < q.rmse_form && q.right_top >= 0.53)) return null;
  const f = MU.fit && MU.fit[pl.group + '|' + l.stat]; if (!f || !(f.sd > 0) || !(fair > 0 && fair < 1)) return null;
  return PhiC(invPhiC(fair) + (l.side === 'under' ? -1 : 1) * a[2] / f.sd);
}
/* the candidates by that rule from a list of legs: {all, edge}: all, every player's best by a lean clear of nothing,
   ranked; edge, the legs whose lean is within LEAN_EPS of nothing (a nudge of 0), none of which may be a candidate */
function candsOwn(legs, MU, players) {
  const c = [], e = [];
  for (const l of legs) {
    if (l.grp === 'TEAM' || !(l.src === 'real' || l.src === 'dkline') || !isFinite(l.price) || l.price < EPC.lo || l.price > EPC.hi) continue;
    if (!players[l.pid]) continue;
    const f = legFairStand(l); if (!f || !(f.p >= EPC.min && f.p < 1)) continue;
    const pe = eloPOwn(MU, l, f.p); if (pe == null) continue;
    const lean = pe - f.p, x = { ...l, pe, pf: f.p, lean };
    if (lean > LEAN_EPS) c.push(x); else if (lean > -LEAN_EPS) e.push(x);
  }
  c.sort((a, b) => (b.lean - a.lean) || ((b.main ? 1 : 0) - (a.main ? 1 : 0)) || cmpC(idC(a), idC(b)));
  const all = [], seen = new Set(); for (const l of c) if (!seen.has(l.pid)) { seen.add(l.pid); all.push(l); }
  return { all, edge: e };
}
/* the page's candidates C held to the rule's (own): exactly the rule's, in its order, none of them a leg with no lean (a
   nudge of 0, own.edge); one a player; each carrying its Elo chance (the check's to 1e-6), DraftKings' fair chance on it
   (pf, the stand-in's exactly) and its lean (pe less pf, above nothing), on the given games. Returns the problem, or '' */
function candsOff(C, own, gids) {
  if (!Array.isArray(C)) return 'no candidates';
  const E = new Set(own.edge.map(idC)), z = C.filter(l => E.has(idC(l)));
  const say = L => L.map(l => `${l.pid} ${l.stat} ${l.side} ${l.price}`).join(', ') || 'none';
  if (z.length) return `a leg whose matchup leans nowhere (a nudge of 0: its lean ${z.map(l => l.lean).join(', ')} is the normal curves' rounding) is a candidate: ${say(z)}`;
  if (C.map(idC).join() !== own.all.map(idC).join()) return `${say(C)}; the rule ${say(own.all)}`;
  if (new Set(C.map(l => l.pid)).size !== C.length) return 'two legs of one player: ' + say(C);
  const by = new Map(own.all.map(l => [idC(l), l]));
  const bad = C.filter(l => { const o = by.get(idC(l));
    return !o || !(Math.abs(l.pe - o.pe) < 1e-6) || l.pf !== o.pf || l.lean !== l.pe - l.pf || !(l.lean > 0) || (gids && !gids.includes(l.gid)); });
  return bad.length ? 'not the rule\'s figures: ' + bad.slice(0, 3).map(l => `${l.pid} ${l.stat} pe ${l.pe} pf ${l.pf} lean ${l.lean}`).join('; ') : '';
}
/* the four levels the rule gives on the page's candidates C (in its order, so every figure is the parts' own sums on the
   page's Elo chances to the bit): the greedy prefix that goes together on one DraftKings slip (takeOwn, on the table the
   sums were compiled on: a candidate clashOwn refuses, or one opposedOwn finds moving against one already taken, passed
   over; o.free takes them all, as the page did before app v121), each of Suggested
   Parlays' sizes (PB_TIERS, read from the parts) the first n of it in the builder's order, its Elo chance all land
   (parlayProb on pe), its price (parlayDec), its fair chance (fairOwn, the parts' parlayFair worked here), floor 0, never
   the likeliest; an empty level {none, why} */
function levelsOwn(C, sums, where, o) {
  const take = takeOwn(C, sums.CORR, o);
  return sums.PB_TIERS.map(([id, label, n]) => {
    if (take.length < n) return { id: 'elo-' + id, label, n, floor: 0, none: true, take: take.length, why: whyOwn(n, C.length, where, take.length) };
    const legs = sums.pbOrder(take.slice(0, n));
    return { id: 'elo-' + id, label, n, floor: 0, legs, p: sums.parlayProb(legs.map(l => ({ ...l, p: l.pe }))).corr,
      dec: sums.parlayDec(legs.map(l => ({ leg: l, ml: l.price }))), fair: fairOwn(legs, sums), likeliest: false };
  });
}
/* a level the page hands over (eloPicks's, or eloUnit's with o.unit: an empty one exactly {id, label, n, floor, why})
   held to the rule's (f). Returns the problem, or '' */
function levelOff(t, f, o) {
  if (!t) return 'missing';
  const has = Array.isArray(t.legs) && t.legs.length > 0, say = L => L.map(l => l.pid + ' ' + l.stat).join(', ');
  if (t.id !== f.id || t.label !== f.label || t.n !== f.n || t.floor !== 0) return `not ${f.id} (${f.label}, ${f.n} legs, floor 0): ${t.id} ${t.label} ${t.n} ${t.floor}`;
  if (f.none) { const keys = Object.keys(t).sort().join();
    return !has && t.why === f.why && (o && o.unit ? keys === 'floor,id,label,n,why' : Array.isArray(t.legs)) ? '' : `not empty saying "${f.why}": ${JSON.stringify(has ? t.legs.map(idC) : t)}`; }
  if (!has) return `empty ("${t.why}") where the rule takes ${say(f.legs)}`;
  if (t.legs.map(idC).join() !== f.legs.map(idC).join()) return `holds ${say(t.legs)}, the rule ${say(f.legs)}`;
  if (clashIn(t.legs)) return `holds a pair DraftKings will not take on one slip: ${t.legs.map(l => l.pid + ' ' + l.stat + ' ' + l.team).join(', ')}`;
  if (o && o.corr && opposedIn(t.legs, o.corr)) return `holds two legs that move against each other: ${t.legs.map(l => l.pid + ' ' + l.side + ' ' + l.stat + ' ' + l.team).join(', ')}`;
  if (t.p !== f.p || t.dec !== f.dec || t.likeliest !== false) return `not at the builder's own sums: ${t.p} at ${t.dec}${t.likeliest ? ' (likeliest)' : ''}, the sums ${f.p} at ${f.dec}`;
  if (!t.fair || t.fair.p !== f.fair.p || !!t.fair.est !== f.fair.est) return `states a fair chance other than parlayFair's: ${JSON.stringify(t.fair)}, the sums ${JSON.stringify(f.fair)}`;
  return '';
}

/* ---- (app v118) each unit's Elo picks: window.eloUnit ----
   Suggested Parlays draws each unit's own Elo picks, a night game's or the Sunday slot's (a week's Sunday games before
   7 pm Eastern), from window.eloUnit(the unit's game ids, {where, perGame}): the ELO tab's four levels on those games'
   legs alone, whatever the Parlay Builder's ticks say (the owner's call of 19 October 2026: until then the picks were one
   set over the games and player sides ticked on the Parlay Builder tab, and a reader with the priced games unticked saw
   them empty all of Sunday 18 October 2026). unitHeld holds a page to it on a list of legs (the page's pricedLegs stood in
   by them, as the checks above stand it in) and units ({lab, gids, where, perGame}): the candidates the rule's on the
   unit's games' legs alone (candsOwn, candsOff), every one of those games; Suggested Parlays' four sizes, each the greedy
   prefix worked out here (levelsOwn), at the builder's own sums, its fair chance parlayFair's, no level holding a pair
   DraftKings will not take on one slip (app v121, clashOwn); an empty level handed over with no legs, exactly {id, label,
   n, floor, why}, saying why in the unit's own words ("Only 2 players in this game qualify: this level takes 3.", or with
   enough of them and a shorter greedy prefix "Strongest first, only 2 leans in this game go together on one DraftKings slip: this
   level takes 3."); eloUnit's
   levels eloPicks' own on the same games; and then all of it again with the Parlay Builder's ticks planted to nothing (no
   game, no bet type, no player side: pbAllows and pbPlayerSides refusing everything, S.ui.pb unticked), put back after on
   every path.
   The Sunday slot of more than one game (perGame, as Suggested Parlays asks for it since app v121; the owner, 19 October
   2026: "the legs need to be part of the same game parlay only, and anytime there's a mix it bombs the hyperlink"): each
   of its games held alone as a night game's ("in this game"), and each of the slot's levels one game's legs, the best of
   its games' own levels by the check's own copy of the slot's rule (slotBetterOwn); a level no game fills empty, saying
   so of "any one game of the Sunday slot" by the most players who qualify in one game; its candidates the count over its
   games. Returns how many levels it held with legs, how many empty, and how many slot levels it held to its games' own
   (full, empty, slot) */
/* (app v138) the Sunday slot's rule among its games' own levels, the check's own copy: the larger lean summed over a
   level's legs (each one's Elo chance less DraftKings' fair chance on it), strictly, so a tie keeps the earlier game.
   Until app v138 it was the floor met before the likeliest, then the better return over the floor, else the higher Elo
   chance */
const leanSum = t => t.legs.reduce((a, l) => a + l.lean, 0);
const slotBetterOwn = (a, b) => leanSum(a) > leanSum(b);
function unitHeld(nm, w, legs, MU, players, corr, units) {
  const sums = sumsOwn(corr);
  let full = 0, empty = 0, slot = 0;
  /* one unit as eloUnit hands it over, held; its four levels as the rule gives them, and how many players qualify, for
     the slot's check, or null where it does not build */
  const one = (u, tag) => {
    const lab = `${nm}, ${u.lab}${tag}`, own = candsOwn(legs.filter(l => u.gids.includes(l.gid)), MU, players);
    let r, rp; try { r = w.eloUnit(u.gids, { where: u.where, ...(u.perGame ? { perGame: true } : {}) }); rp = w.eloPicks({ games: u.gids, where: u.where }); } catch (err) { r = 'threw ' + err.message; }
    if (!r || typeof r !== 'object' || !Array.isArray(r.tiers) || !rp || !Array.isArray(rp.cands) || !Array.isArray(rp.tiers)) {
      chk(false, `${lab}: window.eloUnit does not build the unit's Elo picks: ${typeof r === 'string' ? r : JSON.stringify(r)}`); return null; }
    const C = rp.cands, off = candsOff(C, own, u.gids);
    chk(!off && r.candidates === C.length && rp.candidates === C.length,
      `${lab}: the Elo picks' candidates are not the rule's on the unit's games' legs alone (${r.candidates} counted, ${C.length} handed over): ${off}`);
    const want = levelsOwn(C, sums, u.where);
    chk(r.tiers.length === want.length && rp.tiers.length === want.length && r.tiers.every((t, i) => !!t && (t.legs || []).map(idC).join() === (rp.tiers[i].legs || []).map(idC).join()),
      `${lab}: window.eloUnit does not hand over eloPicks' own four levels on the unit's games: ${r.tiers.map(t => t && t.id).join(', ')}`);
    want.forEach((f, i) => { const bad = levelOff(r.tiers[i], f, { unit: true, corr });
      chk(!bad, `${lab}: the ${f.label} Elo pick is not the first ${f.n} of the unit's candidates that go together on one DraftKings slip: ${bad}`);
      if (!tag) { if (f.none) empty++; else full++; } });
    const K = takeOwn(C, corr).length;
    return { levels: want, N: C.length, K };
  };
  /* (app v121) the Sunday slot, one game a level */
  const slotOne = (u, tag) => {
    const lab = `${nm}, ${u.lab}${tag}`;
    let r; try { r = w.eloUnit(u.gids, { where: u.where, perGame: true }); } catch (err) { r = 'threw ' + err.message; }
    if (!r || typeof r !== 'object' || !Array.isArray(r.tiers)) { chk(false, `${lab}: window.eloUnit does not build the slot's Elo picks one game a level: ${typeof r === 'string' ? r : JSON.stringify(r)}`); return; }
    const per = u.gids.map(g => one({ lab: `${u.lab}, ${g} alone`, gids: [g], where: 'in this game' }, tag));
    if (per.some(x => !x)) return;
    const LT = sums.PB_TIERS, most = Math.max(0, ...per.map(x => x.N)), took = Math.max(0, ...per.map(x => x.K)), sum = per.reduce((a, x) => a + x.N, 0), where = 'in any one game of ' + u.where.replace(/^in /, '');
    chk(r.candidates === sum && r.tiers.length === LT.length, `${lab}: window.eloUnit does not hand over the slot's four levels with its games' candidates counted (${sum}): ${r.candidates}; ${r.tiers.map(t => t && t.id).join(', ')}`);
    LT.forEach(([id, label, n], i) => {
      let best = null, bi = -1; per.forEach((x, gi) => { const L = x.levels[i]; if (!L.none && (!best || slotBetterOwn(L, best))) { best = L; bi = gi; } });
      if (!best) { const bad = levelOff(r.tiers[i], { id: 'elo-' + id, label, n, floor: 0, none: true, why: whyOwn(n, most, where, took) }, { unit: true }); if (!tag) empty++;
        chk(!bad, `${lab}: the ${label} Elo pick, which no game of the slot fills, is not handed over empty saying why: ${bad}`); return; }
      if (!tag) slot++;
      const t = r.tiers[i], bad = levelOff(t, best, { unit: true, corr });
      chk(!bad && new Set(t.legs.map(l => l.gid)).size === 1,
        `${lab}: the ${label} Elo pick is not the best of its games' own ${label} by the slot's rule (the larger lean summed over its legs, then the earlier game), ${u.gids[bi]}'s: ${bad || 'legs of more than one game'}`); });
  };
  const each = tag => { for (const u of units) { if (u.perGame && u.gids.length > 1) slotOne(u, tag); else one(u, tag); } };
  each('');
  /* the Parlay Builder's ticks planted to nothing, and put back */
  const had = { pbAllows: Object.prototype.hasOwnProperty.call(w, 'pbAllows') ? w.pbAllows : undefined, pbPlayerSides: Object.prototype.hasOwnProperty.call(w, 'pbPlayerSides') ? w.pbPlayerSides : undefined },
    ui = JSON.stringify(w.eval('S.ui.pb === undefined ? null : S.ui.pb'));
  try {
    w.pbAllows = () => false; w.pbPlayerSides = () => false;
    w.eval(`S.ui.pb={k:{ml:false,ats:false,total:false,over:false,under:false},off:${JSON.stringify([...new Set(legs.map(l => l.gid))])},open:false};`);
    each(' (the Parlay Builder\'s ticks planted to nothing)');
  } finally {
    for (const k of Object.keys(had)) { if (had[k] === undefined) delete w[k]; else w[k] = had[k]; }
    w.eval(ui === 'null' ? 'delete S.ui.pb;' : `S.ui.pb=${ui};`); }
  return { full, empty, slot };
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
    /* the bar (22 October 2026, the owner's call: "in elo ratings get rid of the visual buttons"): the ELO Model's record
       pill (#peCallRec, "ELO Model 2026: 62–29 re-picked on the Joker ...") and the walk-forward pill on the Joker's
       baseline (#peWalkRec, "On the Joker: 2022–2025 65% walk-forward") are gone, whatever the file's record and
       joker_base hold; the bar keeps its stamp, when the build rated, alone */
    const barGone = (d, lab) => {
      const bar = d.querySelector('#tab-elo > .bar'), stamp = d.getElementById('peStamp'), when = new Date(M.built_at);
      const wantStamp = isNaN(when) ? '' : 'rated ' + when.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      chk(!d.getElementById('peWalkRec') && !d.getElementById('peCallRec') && !!bar && !bar.querySelector('.rec')
        && !/walk-forward|re-picked|picked on the Joker|on Elo alone|backtest|ELO Model \d{4}:/.test(txt(d.getElementById('tab-elo').querySelector('.bar'))),
        `${lab}: the ELO tab's bar still draws the ELO Model's record or its walk-forward on the Joker: ` + (bar ? txt(bar) : 'no bar'));
      chk(!!stamp && stamp.closest('.bar') === bar && txt(stamp) === wantStamp && !!wantStamp,
        `${lab}: the ELO tab's bar does not keep its stamp, "${wantStamp}": "${txt(stamp)}"`);
    };
    barGone(d, 'the real files');
    /* no lead under the rankings (22 October 2026, the owner's call): the card is its title, the position row, the
       curve, the table and its notes of who is not ranked; the curve's key "N ranked <position>" and "bell curve" */
    { const card = [...d.querySelectorAll('#peBody .card')].find(c => /^Rankings/.test(txt(c.querySelector('h2')))), g0 = Object.keys(P.groups)[0], grp = P.groups[g0];
      const key = card && card.querySelector('.pe-cv-key'), want = [`${(grp.curve || []).length} ranked ${grp.label.toLowerCase()}`, 'bell curve'];
      chk(!!card && !card.querySelector('.pe-sub') && !eloGone(card), 'the rankings still carry a description: ' + (card ? (eloGone(card) || txt(card.querySelector('.pe-sub')).slice(0, 120)) : 'no card'));
      chk(!(grp.curve && grp.curve.length >= 5) || (!!key && [...key.children].map(txt).join('|') === want.join('|')),
        `the rankings curve's key is not "${want.join('" and "')}": ` + (key ? [...key.children].map(txt).join(' | ') : 'no key')); }
    void w; }
  /* the opening of a season (a copy with phase 'opening' and the next season in play) says so in a few words, and the
     files' lag (the player stats and the play-by-play waiting on finals, the week's statuses not all filed: a copy of
     model.json planted so) is the state alone, "2 finals not rated yet. Team tables: 1 final not rated yet. Week W
     statuses filed: 1 of 2 clubs." */
  { const P2 = JSON.parse(JSON.stringify(P)), M2 = JSON.parse(JSON.stringify(M)), wk = MU0 && MU0.week != null ? MU0.week : 1;
    P2.phase = 'opening'; P2.season_in_play = +P2.season + 1;
    M2.sources = Object.assign({}, M2.sources, { player_stats_pending: ['g1', 'g2'], team_stats_pending: ['g3'],
      injury_report: { AAA: { week: wk, statuses_filed: true }, BBB: { week: wk, statuses_filed: false } } });
    const { d } = page(MU0 || { week: wk, players: {} }, { P: P2, M: M2 }); await wait(60);
    const notes2 = [...d.querySelectorAll('#peBody .card .pe-note')].map(txt), want = `2 finals not rated yet. Team tables: 1 final not rated yet. Week ${wk} statuses filed: 1 of 2 clubs.`;
    chk(notes2.includes(`${P2.season_in_play} rankings start after week 1.`), 'the rankings do not open the next season in a few words: ' + notes2.join(' | '));
    chk(notes2.includes(want), `the files' lag is not said as the state alone ("${want}"): ` + notes2.join(' | '));
    M2.sources.player_stats_pending = ['g1']; M2.sources.team_stats_pending = ['g3', 'g4']; M2.sources.injury_report.BBB.statuses_filed = true;
    const { d: d1 } = page(MU0 || { week: wk, players: {} }, { P: P2, M: M2 }); await wait(60);
    const notes1 = [...d1.querySelectorAll('#peBody .card .pe-note')].map(txt);
    chk(notes1.includes('1 final not rated yet. Team tables: 2 finals not rated yet.') && !notes1.some(x => /statuses filed/.test(x)),
      'the files\' lag, one final waiting on the player stats, two on the play-by-play and every status filed, is not said so: ' + notes1.join(' | ')); }
  /* the same bar on copies of the record with calls on the Joker graded, re-picked games and the Joker baseline's
     walk-forward: still nothing of them drawn */
  { const had = JSON.stringify(M.record || {}), hadJB = JSON.stringify(M.joker_base || null);
    const barGone = (d, lab) => {
      const bar = d.querySelector('#tab-elo > .bar');
      chk(!d.getElementById('peWalkRec') && !d.getElementById('peCallRec') && !!bar && !bar.querySelector('.rec') && !!d.getElementById('peStamp')
        && !/walk-forward|re-picked|picked on the Joker|on Elo alone|backtest|ELO Model \d{4}:/.test(txt(bar)),
        `${lab}: the ELO tab's bar draws the ELO Model's record or its walk-forward, or lost its stamp: ` + (bar ? txt(bar) : 'no bar'));
    };
    M.record = Object.assign({}, M.record, { published: [40, 30], joker_base: [5, 2], joker_base_from_week: 7, backtest: [20, 13], repicked: [0, 0], repicked_was: [0, 0] });
    M.joker_base = Object.assign({}, M.joker_base || {}, { walk_forward: { 2022: { games: 270, right: 176, joker: 171, elo: 174 }, 2023: { games: 271, right: 177, joker: 172, elo: 175 } } });
    { const { d } = page(MU0); await wait(60); barGone(d, 'a record with calls on the Joker graded'); }
    M.record = Object.assign({}, M.record, { published: [4, 1], joker_base: [4, 1], joker_base_from_week: 7, backtest: [62, 32], repicked: [60, 31], repicked_was: [50, 41] });
    { const { d } = page(MU0); await wait(60); barGone(d, 'a record with games re-picked on the Joker'); }
    M.record = JSON.parse(had); M.joker_base = JSON.parse(hadJB); if (M.joker_base === null) delete M.joker_base; }
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
     at 1500; and he is still priced by nothing (no Elo picks) */
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
      /* while clubs have not filed their game statuses, the card says how many have, the count alone, and its title is
         the week alone (22 October 2026, the owner's call: no descriptions): on the files, then on a copy of the
         matchups with two clubs' reports, one filed */
      const rep = Object.values(MU0.reports || {}).filter(r => r.week === +MU0.week);
      const unfiled = rep.filter(r => !r.statuses_filed).length;
      chk(!unfiled || txt(d.getElementById('peMism')).includes(`Statuses filed: ${rep.length - unfiled} of ${rep.length} clubs.`),
        'the Mismatches card does not say the game statuses are not all filed');
      chk(txt(d.querySelector('#peMism h2 small')) === `week ${MU0.week}` && !eloGone(d.getElementById('peMism')),
        `the Mismatches card's title is not "week ${MU0.week}" alone, or the card explains: "${txt(d.querySelector('#peMism h2 small'))}" ${eloGone(d.getElementById('peMism'))}`);
      { const MUf = JSON.parse(JSON.stringify(MU0)); MUf.reports = { AAA: { week: +MU0.week, statuses_filed: true }, BBB: { week: +MU0.week, statuses_filed: false } };
        const { w: wf, d: df } = page(MUf); await wait(60); wf.renderSlate(); await wait(20);
        const line = [...df.querySelectorAll('#peMism > p.pe-mm-sub')].map(txt);
        chk(line.join('|') === 'Statuses filed: 1 of 2 clubs.' && !eloGone(df.getElementById('peMism')),
          'with one of two clubs filed, the Mismatches card does not say "Statuses filed: 1 of 2 clubs." alone: ' + line.join(' | ')); }
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
          const key = x => Math.round(avg(x) * 100);
          const want = `vs the ${v.opp} ${AG[v.group]}, ${ord(1 + Object.keys(defs).filter(t => key(defs[t]) > key(defs[v.opp])).length)} by player Elo.`, sub = txt(b.querySelector('.pe-mm-sub'));
          return sub.startsWith(want) ? '' : `${b.dataset.mmPid}: "${sub.slice(0, 90)}", not "${want}"`; }).filter(Boolean);
        const old = /\b(?:pass|run) defense ranked\b|\bvs an? (?:pass|run) defense\b/.exec(txt(d.getElementById('peMism')));
        chk(!bad.length && !old, 'a Mismatches bubble does not word its rank as the matchup formula\'s units, or says a pass or run defense ranked: ' + (bad.slice(0, 2).join(' | ') || (old && old[0]))); }
      /* clubs level on a unit share its rank (22 October 2026, the owner's call: "make clubs tied on a defense unit share
         the same rank in the mismatches, player window, and game snapshot"), level read to the hundredth (the file writes
         a unit to the tenth, and a mix of two averages them): on a copy of the file with another club's secondary set a
         floating-point hair above the first receiver's or tight end's opponent's, the page gives that opponent this
         check's own rank to the hundredth, where an exact reading would put the other club above it; and a receiver or
         tight end facing the other club, where there is one, the same rank */
      { const v0 = before.filter(x => x.group === 'WR' || x.group === 'TE').sort((x, y) => x.zd - y.zd)[0], defs0 = MU0.league && MU0.league.defs;
        if (!v0 || !defs0 || !defs0[v0.opp]) notes.push('no receiver or tight end on the Mismatches against a club of the league table: the tied-unit case is skipped');
        else {
          const MU7 = JSON.parse(JSON.stringify(MU0)), D7 = MU7.league.defs, X = v0.opp, Y = Object.keys(D7).find(t => t !== X && Math.abs(D7[t].DB - D7[X].DB) > 0.05);
          D7[Y].DB = D7[X].DB + 1e-9; for (const p of Object.values(MU7.players)) if (p.opp === Y && p.opp_def) p.opp_def.DB = D7[Y].DB;
          const { w: w7 } = page(MU7); await wait(60);
          const L7 = w7.eloMismatches(), v7 = L7.find(x => x.pid === v0.pid), y7 = L7.find(x => x.opp === Y && (x.group === 'WR' || x.group === 'TE'));
          const key = t => Math.round(D7[t].DB * 100), want = 1 + Object.keys(D7).filter(t => key(t) > key(X)).length, exact = 1 + Object.keys(D7).filter(t => D7[t].DB > D7[X].DB).length;
          chk(exact === want + 1 && !!v7 && v7.defRank === want && (!y7 || y7.defRank === want),
            `with ${Y}'s secondary a hair above ${X}'s (level to the hundredth), the Mismatches rank ${X}'s ${v7 ? v7.defRank : 'not at all'}${y7 ? ` and ${Y}'s ${y7.defRank}` : ''}, not both ${want} (an exact reading: ${exact})`); } }
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
          chk(txt(d.querySelector('#pePlView .pe-begun')) === 'This game has kicked off.' && !d.querySelector('#pePlView .pe-note') && !eloGone(d.getElementById('pePlView')),
            `${r.name}'s window does not say "This game has kicked off." alone, or explains its stats: ${txt(d.querySelector('#pePlView .pe-begun'))} ${eloGone(d.getElementById('pePlView'))}`);
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
    /* two more of the ten receivers shown: one the page's own inactive list rules out, one taken out of this copy of
       the matchups (no matchup this week) */
    const ten = P.groups.WR.top.slice(0, 10).filter(r => r.id !== top.id && MU.players && MU.players[r.id] && !(MU.out || {})[r.id]);
    const inact = ten[0], gone = ten[1];
    if (gone) delete MU.players[gone.id];
    const { w, d } = page(MU); await wait(60);
    chk(w.eloRuledOut(top.id) === true, 'a player the build counts out is not ruled out on the page');
    chk(!w.eloMismatches().some(v => v.pid === top.id), 'a player the build counts out is still on the Mismatches');
    [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'WR').click(); await wait(20);
    const row = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(tr => tr.dataset.pePl === top.id);
    if (row) { row.click(); await wait(20);
      chk(txt(d.querySelector('#pePlView .pe-sub')) === `Not expected to play: ${MU.out[top.id]}.`, 'his window does not give the build\'s reason, in a few words: ' + txt(d.getElementById('pePlView')).slice(0, 160));
      d.getElementById('pePlClose').click(); await wait(10); }
    const say = async (r, want, what) => { const tr = r && [...d.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === r.id);
      if (!tr) { notes.push(`no receiver shown to check the window's "${what}" line on`); return; }
      tr.click(); await wait(20);
      chk(txt(d.querySelector('#pePlView .pe-sub')) === want && !eloGone(d.getElementById('pePlView')), `${r.name}'s window does not say "${want}" alone: ` + txt(d.getElementById('pePlView')).slice(0, 200));
      d.getElementById('pePlClose').click(); await wait(10); };
    if (inact) { w.eval('S').inactive[inact.id] = { week: +MU.week, status: 'Out' }; await say(inact, `Ruled out for week ${MU.week}.`, 'ruled out'); delete w.eval('S').inactive[inact.id]; }
    await say(gone, `No matchup for week ${MU.week}.`, 'no matchup');
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
      chk(rankRowsOk(R, T), `${name} is not in the file's rank order, each # the file's rank (a rank shared only by clubs level on the Elo shown): ` + R.slice(0, 8).map(tr => tr.dataset.team + ' ' + txt(tr.querySelector('.pe-rank'))).join(', '));
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
      /* the column heads give every weighted stat its share, the shares summing to 100, and mark the stats that weigh
         nothing "shown only"; the card says nothing of how it is rated: no lead (#peTeamsWhy), no note on the stats
         that weigh nothing (#peTeamsZero) and no walk-forward note (#peTeamsWf), Overall's or a position table's, whose
         tests the file keeps (22 October 2026, the owner's call: "i dont want any descriptions anywhere") */
      const weighted = stats.filter(s => s.weight), zero = stats.filter(s => !s.weight);
      const headOf = s => txt(card.querySelector(`thead th[data-sort="${s.key}"] small`));
      const shares = weighted.map(s => parseInt(headOf(s), 10));
      chk(weighted.length > 0 && weighted.every(s => headOf(s) === `${s.weight}%`) && shares.reduce((a, b) => a + b, 0) === 100,
        `${name}'s column heads do not give the file's weights summing to 100: ${weighted.map(s => s.key + ' ' + headOf(s)).join(', ')}`);
      chk(zero.every(s => headOf(s) === 'shown only'), `${name}'s column heads do not mark the stats that weigh nothing "shown only": ${zero.map(s => s.key + ' ' + headOf(s)).join(', ')}`);
      chk(!card.querySelector('#peTeamsWhy, #peTeamsZero, #peTeamsWf, .pe-sub') && !eloGone(card),
        `${name} still says how it is rated: ` + (eloGone(card) || txt(card.querySelector('#peTeamsWhy, #peTeamsZero, #peTeamsWf, .pe-sub')).slice(0, 160)));
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
      chk(rankRowsOk(R, T), `# does not put ${name} back in rank order`);
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
        const nt = txt(d.getElementById('peTmNext')), wantN = `Next: week ${+p[1]} ${p[3] === t ? 'vs' : 'at'} ${opp}, ${nth(other.rank)} of 32 in ${label(ok)} (${other.elo}, ${stubTier(other.elo)})`;
        chk(!!d.getElementById('peTmNext') && nt === wantN,
          `${t}'s window does not give its coming opponent ${opp} and its rank in ${label(ok)}, and no more ("${wantN}"): ${nt}`);
        chk(!/no (offense|defense) table/.test(nt), `${t}'s window in ${name} says the site has no table to set against it: ${nt}`); }
      else chk(!d.getElementById('peTmNext'), `${t}'s window names an opponent the file does not call`);
      chk(!view.querySelector('.pe-note') && !eloGone(view), `${t}'s window in ${name} explains its stats: ` + (eloGone(view) || txt(view.querySelector('.pe-note')).slice(0, 160)));
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
        /* no text names the share (22 October 2026: the lead went), the row's mark says it */
        chk(!card.querySelector('#peTeamsWhy, .pe-sub') && !eloGone(card), `the ${side} card still explains the carry: ` + (eloGone(card) || txt(card.querySelector('#peTeamsWhy, .pe-sub')).slice(0, 220)));
        if (tr) { tr.click(); await wait(20);
          const view = d5.getElementById('peTmView');
          chk(txt(d5.getElementById('peTmCarried')) === `No game yet this season: carried from ${from}.`
            && txt(view.querySelector('.pe-pl-tiles')).includes(`carried from ${from}`), `${t5}'s window does not say "No game yet this season: carried from ${from}." alone: ${txt(d5.getElementById('peTmCarried'))}`);
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
    /* clubs level on the Elo a table shows share its rank (22 October 2026, the owner's call: elo/build.py ranks a table on
       the Elo it shows, where DEN and NE, both 1616 on Overall Defense, had read 5th and 4th by a raw rating no page
       shows): on a copy with each table's 3rd club made level with its 2nd on the shown Elo and every rated club ranked
       again by this check's own reading of the rule (1 and the rated clubs above it), each table draws the two side by
       side under one #, the next club one place on per club above it, and each one's window the shared #; a file
       ranked so the page draws as it is (the real file, ranked either way, is held above) */
    { const M8 = JSON.parse(JSON.stringify(M)), tied = {};
      for (const side of TABS) { const T8 = M8.units[side], rated = Object.keys(T8).filter(t => T8[t].games || T8[t].carried);
        const byR = rated.slice().sort((a, b) => T8[a].rank - T8[b].rank); if (byR.length < 4) continue;
        T8[byR[2]].elo = T8[byR[1]].elo;
        for (const t of rated) T8[t].rank = 1 + rated.filter(u => T8[u].elo > T8[t].elo).length;
        tied[side] = [byR[1], byR[2]]; }
      const { d: d8 } = page(MU0, { M: M8 }); await wait(60);
      /* the rows ranked r are one unbroken run holding both: a third club already level with them (two level at the top
         before the plant) shares the #, and the page orders a shared rank by the file's key, so the pair need not touch */
      const runOf = (R8, T8, r, ia, ib) => { const at = R8.map((tr, i) => T8[tr.dataset.team].rank === r ? i : -1).filter(i => i >= 0);
        return at.length >= 2 && at[at.length - 1] - at[0] === at.length - 1 && at.includes(ia) && at.includes(ib); };
      for (const side of Object.keys(tied)) {
        const T8 = M8.units[side], [a, b] = tied[side], r = T8[a].rank, card = await open(d8, side), R8 = card ? [...card.querySelectorAll('tbody tr.pe-tmrow')] : [];
        const ia = R8.findIndex(tr => tr.dataset.team === a), ib = R8.findIndex(tr => tr.dataset.team === b), after = R8.find(tr => T8[tr.dataset.team].rank > r);
        chk(T8[b].rank === r && R8.length === 32 && rankRowsOk(R8, T8) && runOf(R8, T8, r, ia, ib) && [ia, ib].every(i => i >= 0 && txt(R8[i].querySelector('.pe-rank')) === String(r))
          && !!after && txt(after.querySelector('.pe-rank')) === String(1 + Object.keys(T8).filter(t => (T8[t].games || T8[t].carried) && T8[t].elo > T8[after.dataset.team].elo).length),
          `${label(side)}, with ${a} and ${b} level at ${T8[a].elo}, does not draw them in one run of the rows ranked #${r}, and the next club one place on per club above it: ` + R8.slice(0, 6).map(tr => tr.dataset.team + ' #' + txt(tr.querySelector('.pe-rank'))).join(', '));
        for (const t of [a, b]) { const tr = R8.find(x => x.dataset.team === t); if (!tr) continue; tr.click(); await wait(20);
          const tiles = [...d8.querySelectorAll('#peTmView .pe-pl-tiles div')].map(txt);
          chk(tiles.some(x => x.startsWith('Rank') && x.includes(`#${r}`)), `${t}'s window in ${label(side)}, level with ${t === a ? b : a}, does not give the shared #${r}: ${tiles.join(' | ')}`);
          d8.getElementById('peTmClose').click(); await wait(10); } }
      chk(Object.keys(tied).length === TABS.length, `the tie copy found no four rated clubs in ${TABS.filter(k => !tied[k]).join(', ')}`); }
    /* a file from before the carry: one start a side, no carry: still draws, its lines from that start */
    { const M4 = JSON.parse(JSON.stringify(M));
      delete M4.units.params.carry; delete M4.units.params.carry_from; M4.units.start = { off: 1487, def: 1509 };
      for (const side of TABS) for (const v of Object.values(M4.units[side])) { delete v.start; delete v.carried; }
      const { d: d4 } = page(MU0, { M: M4 }); await wait(60);
      const card = await open(d4, 'def');
      chk(!!card && !card.querySelector('.pe-carry') && !card.querySelector('#peTeamsWhy, .pe-sub') && !eloGone(card), 'a file from before the carry does not draw as one, with no carried mark and nothing said of how it is rated: ' + (card ? eloGone(card) : 'no card'));
      const tr = card && card.querySelector('tbody tr.pe-tmrow');
      if (tr) { tr.click(); await wait(20);
        chk(txt(d4.querySelector('#peTmView .pe-tline circle title')) === 'Season start: 1509', 'a file from before the carry does not start a line at its side\'s start'); }
      const pc = POS.length && await open(d4, POS[0]);
      chk(!POS.length || (!!pc && !pc.querySelector('.pe-carry') && !pc.querySelector('#peTeamsWhy, .pe-sub') && !eloGone(pc)),
        'a position table on a file without the carry does not draw as one: ' + (pc ? eloGone(pc) : 'no card')); }
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
      const c8 = await open(d8, defT[0]);
      chk(!!c8 && c8.querySelectorAll('tbody tr.pe-tmrow').length === 32 && !c8.querySelector('#peTeamsWhy, #peTeamsZero, #peTeamsWf, .pe-sub') && !eloGone(c8),
        `a file with the defense tables and no pair does not draw them as it did, with nothing said of how they are rated: ${c8 ? eloGone(c8) : 'no card'}`);
      const N = M.next || {}, g8 = +N.season === +U0.season && (N.games || [])[0], r8 = c8 && c8.querySelector('tbody tr.pe-tmrow');
      if (g8 && r8) { const t8 = String(g8.game_id).split('_')[2];
        const tr8 = [...c8.querySelectorAll('tbody tr.pe-tmrow')].find(x => x.dataset.team === t8);
        if (tr8) { tr8.click(); await wait(20);
          const p8 = String(g8.game_id).split('_'), o8 = M8.units.off[p8[3]], nt = txt(d8.getElementById('peTmNext'));
          const want8 = o8 ? `Next: week ${+p8[1]} at ${p8[3]}, ${nth(o8.rank)} of 32 in Overall Offense (${o8.elo}, ${stubTier(o8.elo)})` : null;
          chk(!!want8 && nt === want8, `a file with no pair does not give the opponent's Overall Offense rank, and no more ("${want8}"): ${nt}`);
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
      const card = await open(d2, 'off'), headOf = s => txt(card && card.querySelector(`thead th[data-sort="${s.key}"] small`));
      chk(!!card && ws.every(s => headOf(s) === (s.weight ? `${s.weight}%` : 'shown only')), 'the page does not read the weights from the file: ' + ws.map(s => s.key + ' ' + headOf(s)).join(', ')); }
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

  /* ---- the money the files feed (app v138): the Elo matchup chance and the Elo picks, on every matchup line in the
     files, at made-up book prices, DraftKings' fair chance on each the check's own (legFairStand, set into the page in the
     props parts' legFair's place) ---- */
  { const errors = [], { w } = page(MU0, { errors }); await wait(60);
    sumsInto(w, CORR);   /* mlProb, mlToDec, the builder's sums and parlayFair, the props parts' own, as the page has them */
    /* (app v121) and the props parts' DraftKings pair rule, which the tab's greedy prefix reads where it is a function:
       without it the picks would take a quarterback's passing TDs with a teammate's touchdown, as they did until app v121 */
    chk(typeof w.dkClash === 'function' && typeof w.dkClashWhy === 'function' && typeof w.dkPassTd === 'function',
      `the props parts' DraftKings pair rule (dkPassTd, dkClashWhy, dkClash) is not loaded into the tab's page: the Elo picks would take pairs DraftKings refuses on one slip (${typeof w.dkClash}, ${typeof w.dkClashWhy}, ${typeof w.dkPassTd})`);
    /* market + form is gone (the owner's call of 27 October 2026: fitted on this season's games, its rating term -0.04
       +/- 0.06 out of sample against the 0.30 it used), and with it the old search's fast sums */
    { const left = ['eloAltP', 'eloAltZ', 'eloSums'].filter(k => typeof w[k] !== 'undefined');
      chk(!left.length, `market + form, or the Elo picks' old search, is still on the page: ${left.join(', ')}`); }
    const ok01 = v => typeof v === 'number' && isFinite(v) && v > 0 && v < 1;
    /* a leg for every matchup line in the file, over and under, at -110 and +150, on its player's club */
    const legs = linesOf(MU0);
    /* the Elo matchup chance on every line: DraftKings' fair chance on it moved by the nudge, a chance, the check's own to
       1e-6, and none on a stat whose nudge has not held up */
    let mu = 0; const badMu = [];
    for (const l of legs) { const f = legFairStand(l), want = f ? eloPOwn(MU0, l, f.p) : null; let v; try { v = w.eloMatchupP(l, f ? f.p : NaN); } catch (err) { v = 'threw ' + err.message; }
      if (want === null && v === null) continue; mu++;
      if (!ok01(v) || want === null || !(Math.abs(v - want) < 1e-6)) badMu.push(`${l.pid} ${l.stat} ${l.side} ${l.price}: ${v}, the rule ${want}`); }
    chk(!badMu.length, `the Elo matchup chance is not DraftKings' fair chance moved by the matchup's nudge on ${badMu.length} of ${mu} matchup lines (${badMu.slice(0, 4).join('; ')})`);
    w.__legs = legs; w.eval(PRICED_BY('__legs'));
    let r; try { r = w.eloPicks(); } catch (err) { r = 'threw ' + err.message; }
    chk(!!r && typeof r === 'object' && Array.isArray(r.tiers), `the Elo picks do not build on the files: ${typeof r === 'string' ? r : JSON.stringify(r)}`);
    /* the candidates: the rule's (worked out here on the files' own matchups, candsOwn), every player's largest lean,
       ranked by lean, every one kept; the levels: Suggested Parlays' four sizes, each the greedy prefix DraftKings takes on
       one slip, priced by the builder's own sums worked out here (sumsOwn), its fair chance parlayFair's */
    const sums = sumsOwn(CORR), own = candsOwn(legs, MU0, P.players || {});
    if (r && Array.isArray(r.tiers)) {
      const C = r.cands || [], off = candsOff(C, own);
      chk(!off && r.candidates === C.length,
        `the Elo picks' candidates on the files are not the rule's (a rated player's line, -200 to +300, DraftKings' fair chance 30% or more and his Elo chance above it, his largest lean, ranked by lean, every one kept): ${r.candidates} counted, ${C.length} handed over; ${off}`);
      const want = levelsOwn(C, sums, 'on your picks');
      chk(r.tiers.length === want.length, `the Elo picks are not Suggested Parlays' four sizes: ${r.tiers.map(t => t && t.id).join(', ')}`);
      want.forEach((f, i) => { const bad = levelOff(r.tiers[i], f, { corr: CORR });
        chk(!bad, `the ${f.label} Elo pick on the files is not the first ${f.n} of the candidates that go together on one DraftKings slip: ${bad}`); });
      notes.push(`the Elo picks' candidates on the files: ${C.length}${own.edge.length ? `, beside ${own.edge.length} line${own.edge.length === 1 ? '' : 's'} with a nudge of 0 (no lean, no candidate)` : ''}`); }
    /* (app v118) window.eloPicks() with no games is every game the page prices, whatever the Parlay Builder's ticks say:
       the same levels with the ticks planted to nothing (until app v118 it took only the games and player sides ticked) */
    if (r && Array.isArray(r.tiers)) {
      const sig = x => x && Array.isArray(x.tiers) ? x.tiers.map(t => t.id + ':' + (t.legs || []).map(idC).join('+') + ':' + t.p + ':' + t.dec).join(' | ') : String(x);
      w.pbAllows = () => false; w.pbPlayerSides = () => false; w.eval('S.ui.pb={k:{ml:false,ats:false,total:false,over:false,under:false},off:S.sched.map(g=>g.id),open:false};');
      let r2; try { r2 = w.eloPicks(); } catch (err) { r2 = 'threw ' + err.message; } finally { delete w.pbAllows; delete w.pbPlayerSides; w.eval('delete S.ui.pb;'); }
      chk(sig(r2) === sig(r), `window.eloPicks() moves with the Parlay Builder's ticks planted to nothing: ${sig(r2).slice(0, 200)} for ${sig(r).slice(0, 200)}`); }
    /* (app v118) each unit's Elo picks on the files (unitHeld): each game of the matchups' week with priced legs, alone,
       "in this game", and that week's Sunday games before 7 pm Eastern, "in the Sunday slot", one game a level since app
       v121 (perGame, as Suggested Parlays asks for it; which games those are worked out here from the published payload's
       schedule: the matchups' season and week, a Sunday, a kickoff before 19:00, both Eastern as the schedule writes them;
       the games of it already played have no lines, so the slot can hand over four empty levels, each saying why) */
    { const gids = [...new Set(legs.map(l => l.gid))].sort(), wk = MU0 && MU0.week;
      const slot = SCHED.filter(g => +g.w === +wk && (!MU0 || !MU0.season || String(g.id).startsWith(MU0.season + '_')) && /^\d{4}-\d\d-\d\d$/.test(g.d || '')
        && new Date(g.d + 'T12:00:00Z').getUTCDay() === 0 && /^\d\d:\d\d$/.test(g.t || '') && g.t < '19:00').map(g => g.id);
      const units = [...gids.map(g => ({ lab: `the files' ${g} alone`, gids: [g], where: 'in this game' })), ...(slot.length ? [{ lab: `the files' week ${wk} Sunday slot (${slot.length} games)`, gids: slot, where: 'in the Sunday slot', perGame: true }] : [])];
      if (!units.length) notes.push('no game in the matchups\' week has lines and the schedule has no Sunday slot for it: the units\' Elo picks are held on the check\'s own games alone');
      else { const nf = unitHeld('the files', w, legs, MU0, P.players || {}, CORR, units);
        notes.push(`each unit's Elo picks on the files: ${gids.length} game${gids.length === 1 ? '' : 's'} alone${slot.length ? ` and week ${wk}'s Sunday slot of ${slot.length} (${slot.filter(g => gids.includes(g)).length} with lines)` : ', no Sunday slot on the schedule'}, ${nf.full} levels with legs, ${nf.empty} empty, ${nf.slot} slot levels held to their games' own`); } }
    chk(!errors.length, `the tab threw or logged an error on the files: ${errors.slice(0, 3).join('; ')}`);
    notes.push(`money paths: the Elo matchup chance on ${mu} of ${legs.length} lines, the Elo picks' ${r && r.tiers ? r.tiers.filter(t => t.legs.length).length : 0} levels from ${r && r.cands ? r.cands.length : 0} candidates`); }

  /* ---- (app v118) window.eloUnit hands over nothing until the ratings and the matchups are both in ----
     Suggested Parlays waits on the Elo files while eloUnit gives null, and draws each unit's picks once it gives levels
     (a pick stands on both: the player's rating and his matchup). So: null before any file has answered; null with the
     ratings in (the tab's own word for it, eloLoaded: its players file read) and the matchups still being read (held
     here); the four levels once the matchups answer */
  { let release = null; const hold = new Promise(res => { release = res; }), errors = [], { w } = page(MU0, { errors, hold: { 'matchups.json': hold } });
    sumsInto(w, CORR); w.__legs = linesOf(MU0); w.eval(PRICED_BY('__legs'));
    const gids = [...new Set(w.__legs.map(l => l.gid))].slice(0, 1), at = () => { try { return w.eloUnit(gids, { where: 'in this game' }); } catch (err) { return 'threw ' + err.message; } };
    const r0 = at(); await wait(60);
    const rated = typeof w.eloLoaded === 'function' && w.eloLoaded() === true, r1 = at();
    release(); await wait(60);
    const r2 = at();
    chk(r0 === null && rated && r1 === null && !!r2 && typeof r2 === 'object' && Array.isArray(r2.tiers) && r2.tiers.map(t => t.id).join() === 'elo-safe,elo-med,elo-aggr,elo-xtrm',
      `window.eloUnit does not give null until the ratings and the matchups are both in, and the four levels once they are: before any file ${JSON.stringify(r0)}, with the ratings in (eloLoaded ${rated}) and the matchups held ${JSON.stringify(r1)}, once they answer ${typeof r2 === 'string' ? r2 : JSON.stringify(r2 && r2.tiers && r2.tiers.map(t => t.id))}`);
    chk(!errors.length, `the tab threw or logged an error while its files were still being read: ${errors.slice(0, 3).join('; ')}`); }

  /* ---- the Elo picks on made-up lines of the check's own (app v138, the owner's call of 27 October 2026: every leg at
     DraftKings' fair chance; the picks are the players whose Elo matchup leans furthest their way, that go together on one
     DraftKings slip) ----
     Made-up players in made-up games, each priced at a made-up book price, DraftKings' fair chance on each the check's own
     (legFairStand: a two-sided line its share with the margin out, a one-sided one over 5.66%, DraftKings' line read on
     ESPN its read's), his Elo chance set by a made-up matchup nudge (a copy of the matchups file with the fixture's
     players, fits and records in it), and a correlation table of the check's own for the same-game pairs, so it holds in
     any week and the off-season.
     F1, the candidates' rule, on ten candidates in three games and as many lines that are none: the largest lean first
     (a quarterback's two-sided passing yards, his second line of a smaller lean passed over), a price from DraftKings'
     line read on ESPN one, the price band's end (-200) one; a price past +300 or under -200, a fair chance under 30%, an
     Elo chance under the fair chance, a stat the matchup has not earned, a team bet, the model's own estimate, a player
     the ratings do not have and a nudge of 0 (his matchup leaning nowhere, though the page's normal curves round its Elo
     chance 2e-7 above the fair chance) none of them; and, where both sides are on file, the fair chance with both sides' margin out
     deciding it: an Elo chance above the price's one-sided reading but under that fair chance no candidate, and one under
     the one-sided reading but above it one. Every level the greedy prefix worked out here (the first n candidates that go
     together: no pair DraftKings refuses among them, and three passed over for moving against one taken before them,
     the back's rushing yards beside the other club's receptions, -0.10 in the fixture's table, the tight end's touchdown
     beside the other club's quarterback's passing TDs under, 0.12 turned by the under, and the back's rushing yards beside
     his quarterback's passing yards, -0.11), one with two legs of one game that move together at the builder's sums and
     not the legs multiplied; the card's options (each player's shield, each leg's Elo lean "Elo +2.1", the rule "strongest Elo leans"
     and no chance); the id rule by an entry's content; game A alone and games B and C as a Sunday slot.
     F2, the levels: R at S, a quarterback's passing TDs over leaning furthest, two of his receivers' touchdowns second and
     fourth (passed over: DraftKings takes no quarterback's passing TDs with a teammate's touchdown) and his back third, so
     Safe and Medium skip the receivers and Aggressive and Extreme are short, "Strongest first, only 3 leans in this game
     go together on one DraftKings slip: this level takes 4." (though four others go together: the words say what the walk found,
     never that no four do); with no pair rule its Safe is the quarterback and his first receiver, so the fixture tells the
     greedy prefix from a page with none; T at U, a quarterback's passing TDs under, his receiver's touchdown and the other
     club's back, its Medium "Strongest first, only 2 leans in this game go together on one DraftKings slip: this level takes 3." and
     Aggressive "Only 3 players in
     this game qualify: this level takes 4."; V at W, four legs at one fair chance and one Elo chance, so their leans tie to
     the bit: three main lines by id and a touchdown after them (by id alone it would come third), and one player's
     touchdown at the same lean as his main line, his main line kept; X at Y, V at W's mirror. The Sunday slot of V at W
     and R at S takes R at S's Safe (the larger summed lean, though V at W is listed first) and V at W's Medium and
     Aggressive, its Extreme "Strongest first, only 4 leans in any one game of the Sunday slot go together on one DraftKings slip:
     this level takes 5."; of T at U
     and V at W, its Extreme "Only 4 players in any one game of the Sunday slot qualify: this level takes 5."; of V at W
     and X at Y, whose summed leans tie to the bit, the earlier game's every level, each way round; J at K (the review of
     27 October 2026), a quarterback's passing yards under leaning furthest, his receiver's and his tight end's yards over
     passed over beside it (each moving against it), so its Safe is the quarterback and the other club's back and its
     Medium and Aggressive run short, saying so, where with neither rule its Safe would be the quarterback and his
     receiver, which DraftKings takes; L at M, the bar from both sides, a back's receiving yards over leaning furthest,
     his teammate's receptions over at -0.04 kept and the other club's tight end's yards over at -0.06 passed over (Safe the
     back and the receiver, Medium the quarterback too, Aggressive short, Extreme too few); the props parts' legRho as
     loaded the check's own reading of the table on every pair of F2's players' legs; eloPicks() over all six; every unit by unitHeld; the props parts' DraftKings pair rule as loaded the check's own on every pair of R at
     S's legs and of made-up legs beside them; and thirty-five candidates in as many games, every one kept (until app v138
     the levels were searched from the 30 best by value and the 10 likeliest), Extreme the five largest leans. */
  { const SD = 10;
    const build = rows => {
      const MUf = JSON.parse(JSON.stringify(MU0 || { week: 6, players: {}, fit: {}, record: {} }));
      MUf.players = MUf.players || {}; MUf.fit = MUf.fit || {}; MUf.record = MUf.record || {};
      const Pf = JSON.parse(JSON.stringify(P)); Pf.players = Pf.players || {};
      const legs = [];
      for (const [pid, grp, team, opp, gid, stat, side, k, price, want, x = {}] of rows) {
        const l = { key: `${gid}|${pid}|${stat}`, gid, pid, stat, grp, k, side, main: stat !== 'any_td' && grp !== 'TEAM', p: 0.5, price, src: x.src || 'real',
          ...(x.oth != null ? { oth: x.oth } : {}), ...(x.espn ? { espn: x.espn } : {}),
          name: 'Fixture ' + pid.slice(3).toUpperCase(), team, opp, week: 6, label: side + ' ' + k + ' ' + stat, mu: k, why: x.why || null };
        legs.push(l);
        if (grp === 'TEAM') continue;
        MUf.fit[grp + '|' + stat] = { sd: SD };
        MUf.record[grp + '|' + stat] = { past: x.untrusted ? { rmse_elo: 2, rmse_form: 1, right_top: 0.4 } : { rmse_elo: 1, rmse_form: 2, right_top: 0.6 } };
        /* the nudge that moves DraftKings' fair chance on the leg to the Elo chance wanted */
        const f = legFairStand(l), fair = f ? f.p : 0.5, nudge = x.zero ? 0 : (side === 'under' ? -1 : 1) * SD * (invPhiC(want) - invPhiC(fair));
        const v = MUf.players[pid] || (MUf.players[pid] = { group: grp, game_id: gid, team, opp, home: gid.endsWith(team), elo: 1600, opp_def: { DL: 1500, LB: 1500, DB: 1500 }, stats: {} });
        v.stats[stat] = [k, k, nudge];
        if (!x.unrated) Pf.players[pid] = { name: 'Fixture ' + pid.slice(3).toUpperCase(), group: grp, team, elo: 1600, se: 1600, rank: 3 }; }
      return { MUf, Pf, legs: legs.map(({ why, ...l }) => l), whys: legs.filter(l => l.why) };
    };
    const say = L => (L || []).map(l => l.pid + ' ' + l.stat).join(', ') || 'none';
    const lvOf = (u, id) => u && Array.isArray(u.tiers) ? u.tiers.find(t => t.id === id) || null : null;
    const pids = t => t && Array.isArray(t.legs) ? t.legs.map(l => l.pid).sort().join('+') : 'none';

    /* ---- F1: the candidates' rule ---- */
    { const GA = '2026_06_FXA_FXB', GB = '2026_06_FXC_FXD', GC = '2026_06_FXE_FXF';
      /* pid, group, team, opp, game, stat, side, line, price, the Elo chance wanted (the nudge is set to give it) */
      const ROWS1 = [
        ['fx-qa', 'QB', 'FXA', 'FXB', GA, 'passing_yards', 'over', 249.5, -115, 0.60, { oth: -105 }],
        ['fx-qc', 'QB', 'FXF', 'FXE', GC, 'passing_tds', 'under', 1.5, -140, 0.62],
        ['fx-wb', 'WR', 'FXD', 'FXC', GB, 'receptions', 'over', 4.5, -130, 0.60],
        ['fx-wa', 'WR', 'FXA', 'FXB', GA, 'receiving_yards', 'over', 69.5, -110, 0.56],
        ['fx-ta', 'TE', 'FXB', 'FXA', GA, 'any_td', 'over', 1, 150, 0.43],
        ['fx-rb', 'RB', 'FXC', 'FXD', GB, 'rushing_yards', 'over', 59.5, -120, 0.57, { oth: 100 }],
        ['fx-wc', 'WR', 'FXE', 'FXF', GC, 'receiving_yards', 'under', 52.5, 105, 0.50, { src: 'dkline', espn: { fair: 0.46, at: '2026-10-15T03:08Z', tested: true, listed: true } }],
        ['fx-tc', 'TE', 'FXE', 'FXF', GC, 'any_td', 'over', 1, 180, 0.37],
        ['fx-rd', 'RB', 'FXA', 'FXB', GA, 'rushing_yards', 'over', 44.5, -200, 0.66],
        ['fx-rh', 'RB', 'FXF', 'FXE', GC, 'rushing_yards', 'over', 64.5, -110, 0.49, { oth: -130 }],
        /* none of these is a candidate */
        ['fx-qa', 'QB', 'FXA', 'FXB', GA, 'passing_tds', 'over', 1.5, -150, 0.60, { why: 'his second line, of a smaller lean' }],
        ['fx-wd', 'WR', 'FXD', 'FXC', GB, 'receiving_yards', 'over', 99.5, 310, 0.45, { src: 'dkline', espn: { fair: 0.35, at: '2026-10-15T03:08Z', tested: true, listed: true }, why: 'a price past +300' }],
        ['fx-rf', 'RB', 'FXD', 'FXC', GB, 'rushing_yards', 'over', 39.5, -210, 0.72, { why: 'a price under -200' }],
        ['fx-rc', 'RB', 'FXE', 'FXF', GC, 'scrim_yards', 'over', 79.5, 250, 0.33, { why: 'DraftKings\' fair chance under 30%' }],
        ['fx-te', 'TE', 'FXF', 'FXE', GC, 'receiving_yards', 'over', 39.5, -150, 0.52, { why: 'an Elo chance under the fair chance' }],
        ['fx-rg', 'RB', 'FXB', 'FXA', GA, 'rushing_yards', 'over', 54.5, -110, 0.497, { oth: -110, why: 'an Elo chance above the price\'s one-sided reading but under DraftKings\' fair chance with both sides\' margin out' }],
        ['fx-wa', 'WR', 'FXA', 'FXB', GA, 'targets', 'over', 6.5, 120, 0.70, { why: 'a stat the matchup has not earned', untrusted: true }],
        ['fx-wb', 'WR', 'FXD', 'FXC', GB, 'receiving_yards', 'over', 49.5, 100, 0.70, { why: 'the model\'s own estimate', src: 'est' }],
        ['fx-xx', 'WR', 'FXB', 'FXA', GA, 'receiving_yards', 'over', 59.5, 100, 0.70, { why: 'a player the ratings do not have', unrated: true }],
        ['team:FXA', 'TEAM', 'FXA', 'FXB', GA, 'ml', 'over', 0, -110, 0.70, { why: 'a team bet' }],
        /* a nudge of exactly 0 on a stat the matchup has earned, at a fair chance (-120 on one side, 51.6%) where the page's
           normal curves round its Elo chance up by 2e-7: it leans nowhere */
        ['fx-z0', 'RB', 'FXC', 'FXD', GB, 'receptions', 'over', 2.5, -120, null, { why: 'a nudge of 0: his matchup leans nowhere', zero: true }]];
      /* the same-game pairs that move together, by the builder's keys (rel|grp:stat|grp:stat) */
      const CORR_FX = { 'team|QB:passing_yards|WR:receiving_yards': 0.45, 'opp|QB:passing_yards|TE:any_td': 0.08, 'opp|TE:any_td|WR:receiving_yards': 0.05,
        'opp|RB:rushing_yards|WR:receptions': -0.10, 'team|TE:any_td|WR:receiving_yards': -0.06, 'opp|QB:passing_tds|TE:any_td': 0.12, 'opp|QB:passing_tds|WR:receiving_yards': 0.10,
        'team|QB:passing_yards|RB:rushing_yards': -0.11 };
      const { MUf, Pf, legs, whys } = build(ROWS1), errors = [], { w } = page(MUf, { errors, P: Pf }); await wait(60);
      sumsInto(w, CORR_FX); w.__fx = legs; w.eval(PRICED_BY('__fx'));
      const sums = sumsOwn(CORR_FX), own = candsOwn(legs, MUf, Pf.players), by = (pid, stat) => legs.find(l => l.pid === pid && l.stat === stat);
      let r; try { r = w.eloPicks(); } catch (err) { r = 'threw ' + err.message; }
      if (!r || !Array.isArray(r.tiers) || !Array.isArray(r.cands)) chk(false, `F1: the Elo picks do not build on the check's own lines: ${typeof r === 'string' ? r : JSON.stringify(r)}`);
      else {
        const C = r.cands, off = candsOff(C, own), has = (pid, stat) => C.some(l => l.pid === pid && l.stat === stat);
        chk(!off && r.candidates === C.length && C.length === 10 && own.edge.length === 1,
          `F1: the Elo picks' candidates are not the rule's (DraftKings' fair chance 30% or more, the Elo chance above it, -200 to +300, his largest lean, ranked by lean): ${off || say(C)} (${r.candidates} counted)`);
        chk(!C.some(l => whys.some(x => idC(x) === idC(l))), 'F1: a line that is no candidate is one: ' + C.filter(l => whys.some(x => idC(x) === idC(l))).map(l => whys.find(x => idC(x) === idC(l)).why).join('; '));
        chk(!!C[0] && C[0].pid === 'fx-qa' && C[0].stat === 'passing_yards' && has('fx-rd', 'rushing_yards') && C.some(l => l.src === 'dkline'),
          `F1: the largest lean (fx-qa's two-sided passing yards) does not lead, or the price band's end (-200) or a price from DraftKings' line read on ESPN is not a candidate: ${say(C)}`);
        chk(has('fx-rh', 'rushing_yards') && !has('fx-rg', 'rushing_yards'),
          `F1: where both sides are on file, the lean is not against DraftKings' fair chance with both sides' margin out (an Elo chance above that fair chance and under the one side's reading a candidate, and one the other way round none): ${say(C)}`);
        /* the levels: the first n candidates that go together on one DraftKings slip */
        const want = levelsOwn(C, sums, 'on your picks');
        want.forEach((f, i) => { const bad = levelOff(r.tiers[i], f, { corr: CORR_FX });
          chk(!bad, `F1: the ${f.label} Elo pick is not the first ${f.n} of the candidates that go together on one DraftKings slip: ${bad}`); });
        chk(r.tiers.length === 4 && r.tiers.every(t => t.legs.length === t.n), 'F1: an Elo pick level is empty with ten candidates and no pair DraftKings refuses');
        /* legs of one game, priced together: some level holds two legs of one game that move together, at the builder's
           sums and not at the legs multiplied */
        const sg = r.tiers.filter(t => t.legs.length && t.legs.some((a, i) => t.legs.some((b, j) => j > i && a.gid === b.gid && Math.abs(sums.legRho(a, b)) >= 0.03)));
        chk(sg.length > 0 && sg.every(t => Math.abs(t.dec - t.legs.reduce((a, l) => a * sums.mlToDec(l.price), 1)) > 1e-3 && Math.abs(t.p - t.legs.reduce((a, l) => a * l.pe, 1)) > 1e-3),
          `F1: no Elo pick takes two legs of one game that move together, or one is priced as its legs multiplied: ${r.tiers.map(t => t.id + ' ' + t.legs.map(l => l.gid.slice(-3)).join('/') + ' ' + t.p + ' ' + t.dec).join('; ')}`);
        /* the card's options (app v138): each player's shield, each leg's Elo lean (the nudge his matchup gives his
           projection, in the stat's own units, where it has held up), how the level was chosen; no chance of any kind */
        { let o = null, o0 = null; try { o = w.eloCardOpt(r.tiers[0]); o0 = w.eloCardOpt({ legs: [] }); } catch (err) { o = { err: err.message }; }
          /* the nudge as the note says it (the check's own reading): a tenth in the stat's units, a touchdown's a hundredth,
             signed but a figure shown as 0 unsigned (the review of 27 October 2026: "Elo +0.0" and "Elo −0.0" said nothing) */
          const leanOwn = (v, stat) => { const sh = Math.abs(v).toFixed(stat === 'any_td' ? 2 : 1); return +sh === 0 ? sh : (v > 0 ? '+' : '−') + sh; };
          const noteOwn = (v, stat) => `<small class="pe-lean" data-pe-lean="${v}" title="His Elo against the defenders he faces moves his projection ${leanOwn(v, stat)}">Elo ${leanOwn(v, stat)}</small>`;
          { const nTd = MUf.players['fx-ta'].stats.any_td[2], tdN = o && typeof o.legNote === 'function' ? o.legNote(by('fx-ta', 'any_td')) : null, z0 = o && typeof o.legNote === 'function' ? o.legNote(by('fx-z0', 'receptions')) : null;
            chk(tdN === noteOwn(nTd, 'any_td') && /Elo [+−]\d\.\d\d</.test(tdN || '') && z0 === noteOwn(0, 'receptions') && /Elo 0\.0</.test(z0 || ''),
              `F1: an Elo lean is not said to its unit's precision, a figure shown as 0 unsigned: the touchdown's ${tdN} (want ${noteOwn(nTd, 'any_td')}), a nudge of 0 ${z0}`); }
          const nud = MUf.players['fx-qa'].stats.passing_yards[2], sg1 = leanOwn(nud, 'passing_yards');
          const wantNote = `<small class="pe-lean" data-pe-lean="${nud}" title="His Elo against the defenders he faces moves his projection ${sg1}">Elo ${sg1}</small>`;
          const note = o && typeof o.legNote === 'function' ? o.legNote(by('fx-qa', 'passing_yards')) : null, none = o && typeof o.legNote === 'function' ? o.legNote(by('fx-wa', 'targets')) : null;
          chk(!!o && Object.keys(o).sort().join() === 'badge,legNote,rule' && typeof o.badge === 'function' && note === wantNote && none === ''
            && o.rule === '<span class="pb-rule" title="The players whose Elo matchup leans furthest their way, that go together on one DraftKings slip">strongest Elo leans</span>'
            && !!o0 && Object.keys(o0).sort().join() === 'badge,legNote',
            `F1: the Elo picks' card options are not each player's shield, each leg's Elo lean ("${wantNote}", none on a stat the matchup has not earned) and the rule "strongest Elo leans" (none on an empty level), with no chance: ${JSON.stringify(o && Object.keys(o))}, ${note}, ${JSON.stringify(none)}, ${o && o.rule}`); }
        /* (app v125) the id rule by content, as the hub page carries it beside the tab: a game whose PAY.dk entry a read of
           ESPN made (its event, glat and game lines' ids: the props job's published read, a press, the parlay card's check)
           carries no ids of the pull's, so its candidate priced from DraftKings' line stays, as on a JSON copy of that
           table; one whose entry carries the pull's (its at) drops it, having no id (so the case can tell) */
        { w.eval(DK_SRC); const at = '2026-10-15T03:08:00.000Z', base = C.map(idC).join(), wc = C.find(l => l.src === 'dkline');
          const candsWith = dk => { w.eval(`PAY.dk=${JSON.stringify(dk)}`); let x = null; try { x = w.eloPicks(); } catch (e) {} return ((x && x.cands) || []).map(idC).join(); };
          const readMade = { '6': { [GC]: { event: '9916', glat: at, 'team:FXE|ml': '0RM1', 'team:FXF|ats|-3.5': '0RM2', 'game|total|over|44.5': '0RM3' } } };
          const withRead = candsWith(readMade), withCopy = candsWith(JSON.parse(JSON.stringify(readMade)));
          const carried = candsWith({ '6': { [GC]: { at, glat: at, 'team:FXE|ml': '0PD1' } } });
          w.eval('delete PAY.dk');
          chk(!!wc && wc.gid === GC && withRead === base && withCopy === base && typeof w.eval('dkCarries') === 'function' && !w.eval(`dkCarries({week:6,gid:${JSON.stringify(GC)}})`),
            `F1: a candidate priced from DraftKings' line on a game whose PAY.dk entry a read made (or a JSON copy of it) is dropped: ${withRead || 'none'} against ${base}`);
          chk(!!wc && carried !== base && !carried.split(',').includes(idC(wc)), 'F1: a game whose PAY.dk entry carries the pull\'s ids keeps a candidate with no id at its line, so the read-made case cannot tell');
          notes.push('the id rule by content: a candidate from DraftKings\' line on a game whose PAY.dk entry a read made stays, and leaves where the entry carries the pull\'s ids'); }
        notes.push(`the Elo picks on F1's ${C.length} candidates: ${r.tiers.map(t => `${t.label} ${t.legs.map(l => l.pid.slice(3)).join('+')} fair ${(t.fair.p * 100).toFixed(1)}% at ${t.dec.toFixed(2)}`).join('; ')}`); }
      /* game A alone, "in this game", and games B and C together as a Sunday slot, one game a level: game A has four of the
         ten candidates, its back's rushing yards passed over beside his quarterback's passing yards, so its Aggressive is
         empty saying three go together and its Extreme saying four qualify; B two, which move against each other, so none
         of its levels fills, and C four, its tight end's touchdown passed over beside the other club's quarterback's
         passing TDs under, so the slot's Safe and Medium are C's, its Aggressive "Strongest first, only 3 leans in any one
         game of the Sunday slot go together on one DraftKings slip" and its Extreme "Only 4 players in any one game of the
         Sunday slot qualify" (since the review of 27 October 2026; until then B's pair went together and the slot's Safe
         was the larger summed lean of B's and C's) */
      const nf = unitHeld('F1', w, legs, MUf, Pf.players, CORR_FX, [{ lab: 'game A alone', gids: [GA], where: 'in this game' }, { lab: 'games B and C as a Sunday slot', gids: [GB, GC], where: 'in the Sunday slot', perGame: true }]);
      const nA = candsOwn(legs.filter(l => l.gid === GA), MUf, Pf.players).all.length;
      chk(nf.full > 0 && nf.empty > 0 && nf.slot > 0 && nA > 0 && nA < own.all.length, `F1: the units' check met ${nf.full} levels with legs, ${nf.empty} empty and ${nf.slot} slot levels held to their games' own, and game A has ${nA} of ${own.all.length} candidates: it holds less than it says`);
      notes.push(`each unit's Elo picks on F1: game A alone (${nA} candidates) and games B and C as a Sunday slot, ${nf.full} levels with legs, ${nf.empty} empty, ${nf.slot} slot levels held to their games' own`);
      chk(!errors.length, `F1: the tab threw or logged an error on the check's own lines: ${errors.slice(0, 3).join('; ')}`); }

    /* ---- F2: the greedy prefix, the pairs DraftKings refuses, ties and the slot ---- */
    { const G7 = '2026_06_FXR_FXS', G7B = '2026_06_FXT_FXU', G7C = '2026_06_FXV_FXW', G7D = '2026_06_FXX_FXY', G7E = '2026_06_FXJ_FXK', G7F = '2026_06_FXL_FXM';
      const ROWS2 = [
        ['fx-q7', 'QB', 'FXR', 'FXS', G7, 'passing_tds', 'over', 1.5, 120, 0.56],
        ['fx-w7', 'WR', 'FXR', 'FXS', G7, 'any_td', 'over', 1, 150, 0.49],
        ['fx-r7', 'RB', 'FXR', 'FXS', G7, 'rushing_yards', 'over', 59.5, -115, 0.60],
        ['fx-w8', 'WR', 'FXR', 'FXS', G7, 'any_td', 'over', 1, 170, 0.43],
        ['fx-q8', 'QB', 'FXS', 'FXR', G7, 'passing_yards', 'over', 229.5, -110, 0.52],
        ['fx-qt', 'QB', 'FXT', 'FXU', G7B, 'passing_tds', 'under', 1.5, -120, 0.60],
        ['fx-wt', 'WR', 'FXT', 'FXU', G7B, 'any_td', 'over', 1, 140, 0.47],
        ['fx-ru', 'RB', 'FXU', 'FXT', G7B, 'rushing_yards', 'over', 54.5, -110, 0.56],
        ['fx-av', 'WR', 'FXV', 'FXW', G7C, 'receiving_yards', 'over', 64.5, -110, 0.58],
        ['fx-qv', 'QB', 'FXV', 'FXW', G7C, 'passing_yards', 'over', 239.5, -110, 0.58],
        ['fx-tv', 'TE', 'FXW', 'FXV', G7C, 'any_td', 'over', 1, -110, 0.58],
        ['fx-ww', 'WR', 'FXW', 'FXV', G7C, 'receptions', 'over', 4.5, -110, 0.58],
        ['fx-ww', 'WR', 'FXW', 'FXV', G7C, 'any_td', 'over', 1, -110, 0.58, { why: 'his touchdown, level with his main line' }],
        ['fx-ax', 'WR', 'FXX', 'FXY', G7D, 'receiving_yards', 'over', 64.5, -110, 0.58],
        ['fx-qx', 'QB', 'FXX', 'FXY', G7D, 'passing_yards', 'over', 239.5, -110, 0.58],
        ['fx-tx', 'TE', 'FXY', 'FXX', G7D, 'any_td', 'over', 1, -110, 0.58],
        ['fx-wy', 'WR', 'FXY', 'FXX', G7D, 'receptions', 'over', 4.5, -110, 0.58],
        /* (the review of 27 October 2026) J at K: a quarterback's passing yards under leaning furthest, his receiver's and
           his tight end's yards over second and fourth (each moving against it), the other club's back third */
        ['fx-qj', 'QB', 'FXJ', 'FXK', G7E, 'passing_yards', 'under', 192.5, -110, 0.60],
        ['fx-wj', 'WR', 'FXJ', 'FXK', G7E, 'receiving_yards', 'over', 38.5, -110, 0.57],
        ['fx-rk', 'RB', 'FXK', 'FXJ', G7E, 'rushing_yards', 'over', 59.5, -110, 0.56],
        ['fx-tj', 'TE', 'FXJ', 'FXK', G7E, 'receiving_yards', 'over', 44.5, -110, 0.55],
        /* L at M: a back's receiving yards over leaning furthest; his teammate's receptions over second, at -0.04 with it (kept:
           above the bar); the other club's tight end's receiving yards over third, at -0.06 with the back (passed over); the
           other club's quarterback's passing TDs fourth, with neither */
        ['fx-ll', 'RB', 'FXL', 'FXM', G7F, 'receiving_yards', 'over', 24.5, -110, 0.60],
        ['fx-wl', 'WR', 'FXL', 'FXM', G7F, 'receptions', 'over', 4.5, -110, 0.58],
        ['fx-tm', 'TE', 'FXM', 'FXL', G7F, 'receiving_yards', 'over', 39.5, -110, 0.56],
        ['fx-qm', 'QB', 'FXM', 'FXL', G7F, 'passing_tds', 'over', 1.5, -110, 0.54]];
      const CORR_F2 = { 'team|QB:passing_tds|WR:any_td': 0.323, 'team|QB:passing_tds|RB:rushing_yards': 0.03, 'opp|QB:passing_tds|TE:any_td': 0.031, 'opp|QB:passing_tds|QB:passing_yards': 0.148,
        'opp|QB:passing_tds|WR:receiving_yards': 0.07, 'team|WR:any_td|WR:any_td': -0.032, 'opp|TE:any_td|WR:receiving_yards': 0.039, 'team|QB:passing_yards|WR:receiving_yards': 0.353,
        'opp|QB:passing_yards|WR:any_td': 0.099, 'opp|QB:passing_yards|TE:any_td': 0.038, 'opp|QB:passing_tds|RB:rushing_yards': -0.047, 'opp|QB:passing_yards|WR:receptions': 0.036,
        'opp|RB:rushing_yards|WR:receiving_yards': -0.037, 'team|TE:any_td|WR:receiving_yards': 0.03, 'opp|TE:any_td|WR:receptions': 0.032,
        'team|QB:passing_yards|TE:receiving_yards': 0.229, 'team|RB:receiving_yards|WR:receptions': -0.04, 'opp|RB:receiving_yards|TE:receiving_yards': -0.06 };
      const { MUf, Pf, legs, whys } = build(ROWS2), errors = [], { w } = page(MUf, { errors, P: Pf }); await wait(60);
      sumsInto(w, CORR_F2); w.__fx = legs; w.eval(PRICED_BY('__fx'));
      const sums = sumsOwn(CORR_F2), by = pid => legs.find(l => l.pid === pid);
      const unit = (g, o) => { try { return w.eloUnit(g, o); } catch (err) { return { error: 'threw ' + err.message }; } };
      /* the rule as the page has it loaded, against the check's own, on every ordered pair */
      { const q = by('fx-q7'), wt = by('fx-wt');
        const more = [{ ...q, k: 2.5, main: false, label: 'over 2.5 passing_tds' }, { ...q, side: 'under', label: 'under 1.5 passing_tds' },
          { ...q, key: `${G7}|fx-q7|any_td`, stat: 'any_td', k: 1, main: false, label: 'any_td' },
          ...['over', 'under'].map(side => ({ key: `${G7}|total`, gid: G7, pid: 'game:' + G7, grp: 'TEAM', stat: 'total', side, k: 47.5, price: -110, name: 'R at S', label: side + ' 47.5', week: 6 })),
          { key: `${G7}|team:FXR|ml`, gid: G7, pid: 'team:FXR', grp: 'TEAM', team: 'FXR', opp: 'FXS', stat: 'ml', side: 'over', k: 0, price: -150, name: 'FXR', label: 'to win', week: 6 }, wt];
        const L = [...legs.filter(l => l.gid === G7), ...more], bad = [], met = new Set(); let n = 0;
        for (const a of L) for (const b of L) { if (a === b) continue; n++; const want = clashOwn(a, b); let got; try { got = w.dkClashWhy(a, b); } catch (err) { got = 'threw ' + err.message; }
          met.add(String(want)); if (got !== want) bad.push(`${a.pid} ${a.stat} ${a.side} with ${b.pid} ${b.stat} ${b.side}: ${got}, the rule ${want}`); }
        chk(!bad.length && ['td', 'total', 'null'].every(k => met.has(k)) && typeof w.dkClash === 'function' && L.every(a => L.every(b => a === b || w.dkClash(a, b) === !!clashOwn(a, b))),
          `F2: the props parts' DraftKings pair rule, as loaded beside the tab, is not the rule (a quarterback's passing TDs with a teammate's anytime touchdown, or his passing TDs over with the game's total), on ${bad.length} of ${n} pairs (kinds met: ${[...met].join(', ')}): ${bad.slice(0, 3).join('; ')}`); }
      /* leans tied to the bit: the main lines first, by id, then the touchdown; and a player's two lines tied, his main line */
      { const r = w.eloPicks({ games: [G7C], where: 'in this game' }), C = r && Array.isArray(r.cands) ? r.cands : [];
        chk(C.map(l => l.pid + ' ' + l.stat).join(', ') === 'fx-av receiving_yards, fx-qv passing_yards, fx-ww receptions, fx-tv any_td' && C.length === 4 && C.every(l => l.lean === C[0].lean),
          `F2: four legs whose leans tie to the bit are not ranked the main lines first by id, then the touchdown, with a player's main line kept over his touchdown at the same lean: ${C.map(l => l.pid + ' ' + l.stat + ' ' + l.lean).join(', ')}`);
        chk(!C.some(l => whys.some(x => idC(x) === idC(l))), 'F2: a player\'s touchdown, level with his main line, is taken in its place'); }
      /* the fixture means what it says: with no pair rule, R at S's Safe is its quarterback's passing TDs and his first
         receiver's touchdown, a pair DraftKings refuses (so the greedy prefix's skipping is what the levels below meet) */
      { const r = w.eloPicks({ games: [G7], where: 'in this game' }), C = r && Array.isArray(r.cands) ? r.cands : [], free = levelsOwn(C, sums, 'in this game', { free: true });
        chk(!free[0].none && clashIn(free[0].legs) && pids(free[0]) === 'fx-q7+fx-w7' && C.map(l => l.pid).join() === 'fx-q7,fx-w7,fx-r7,fx-w8,fx-q8',
          `F2: R at S's candidates are not its quarterback's passing TDs, his receiver's touchdown, his back, his other receiver's touchdown and the other quarterback by lean, or with no pair rule its Safe holds no pair, so the fixture no longer tells the greedy prefix from a page with none: ${say(C)}; with no rule ${pids(free[0])}`); }
      /* (the review of 27 October 2026) the legs that move against each other. The props parts' legRho, as loaded beside
         the tab (the correlation parlayProb's Cholesky rows read, which the tab's walk calls), the check's own reading of
         the table on every ordered pair of F2's legs, so the walk and the check stand on one correlation */
      { const PL = legs.filter(l => l.grp !== 'TEAM'), bad = []; let n = 0, neg = 0;
        for (const a of PL) for (const b of PL) { if (a === b) continue; n++; let got; try { got = w.legRho(a, b); } catch (err) { got = 'threw ' + err.message; }
          const want = rhoOwn(a, b, CORR_F2); if (opposedOwn(a, b, CORR_F2)) neg++; if (got !== want) bad.push(`${a.pid} ${a.stat} with ${b.pid} ${b.stat}: ${got}, the table ${want}`); }
        chk(!bad.length && neg > 0, `F2: the props parts' legRho, as loaded beside the tab, is not the pair table read by the check on ${bad.length} of ${n} pairs (${neg} opposed): ${bad.slice(0, 3).join('; ')}`); }
      /* J at K: its quarterback's passing yards under leans furthest, his receiver's yards over second and his tight end's
         fourth, each moving against it (the table's team pairs 0.353 and 0.229, turned by the under) and passed over, and
         the other club's back third, moving with neither; with neither rule its Safe is the quarterback and his receiver,
         a pair DraftKings takes, so only the walk's passing over legs that move against each other tells the levels below
         from a page without it; and the same pair the other way round, V at W's quarterback's passing yards over with his
         receiver's over, moves together and stays together in its Safe */
      { const r = w.eloPicks({ games: [G7E], where: 'in this game' }), C = r && Array.isArray(r.cands) ? r.cands : [], free = levelsOwn(C, sums, 'in this game', { free: true });
        chk(C.map(l => l.pid).join() === 'fx-qj,fx-wj,fx-rk,fx-tj' && !free[0].none && pids(free[0]) === 'fx-qj+fx-wj' && !clashIn(free[0].legs)
          && opposedOwn(C[0], C[1], CORR_F2) && opposedOwn(C[0], C[3], CORR_F2) && !opposedOwn(C[0], C[2], CORR_F2) && !opposedOwn(by('fx-qv'), by('fx-av'), CORR_F2),
          `F2: J at K's candidates are not its quarterback's passing yards under, his receiver's yards over, the other club's back and his tight end's yards over by lean, the first moving against the second and the fourth and not the third (and V at W's passing yards over with its receiver's over together), or with neither rule its Safe is not the quarterback and his receiver, no pair DraftKings refuses, so the fixture no longer tells the walk from one without the rule: ${say(C)}; with neither rule ${pids(free[0])}`);
        const jk = unit([G7E], { where: 'in this game' });
        chk(pids(lvOf(jk, 'elo-safe')) === 'fx-qj+fx-rk' && (lvOf(jk, 'elo-med') || {}).why === 'Strongest first, only 2 leans in this game go together on one DraftKings slip: this level takes 3.'
          && (lvOf(jk, 'elo-aggr') || {}).why === 'Strongest first, only 2 leans in this game go together on one DraftKings slip: this level takes 4.'
          && (lvOf(jk, 'elo-xtrm') || {}).why === 'Only 4 players in this game qualify: this level takes 5.',
          `F2: J at K's levels do not pass over the receiver's and the tight end's yards over beside the quarterback's passing yards under (Safe the quarterback and the other club's back, Medium and Aggressive "Strongest first, only 2 leans in this game go together on one DraftKings slip: this level takes 3 (4).", Extreme "Only 4 players in this game qualify: this level takes 5."): ${jk && jk.tiers ? jk.tiers.map(t => t.id + ' ' + (t.legs ? pids(t) : t.why)).join('; ') : JSON.stringify(jk)}`); }
      /* L at M: the bar, -0.05, from both sides. The back's receiving yards over leans furthest; his teammate's receptions
         over, at -0.04 with it, is kept (above the bar); the other club's tight end's yards over, at -0.06 with the back, is
         passed over; the quarterback's passing TDs moves with neither. So Safe is the back and the receiver, Medium the
         quarterback too, Aggressive runs short (3 go together) and Extreme too few. At a bar of nothing (the rule until
         the review of 27 October 2026) the receiver would go too and Safe be the back and the quarterback; with no bar the
         tight end would stay and Medium be the back, the receiver and the tight end */
      { const r = w.eloPicks({ games: [G7F], where: 'in this game' }), C = r && Array.isArray(r.cands) ? r.cands : [], lm = unit([G7F], { where: 'in this game' });
        chk(C.map(l => l.pid).join() === 'fx-ll,fx-wl,fx-tm,fx-qm' && !opposedOwn(C[0], C[1], CORR_F2) && rhoOwn(C[0], C[1], CORR_F2) === -0.04 && opposedOwn(C[0], C[2], CORR_F2) && rhoOwn(C[0], C[2], CORR_F2) === -0.06
          && !opposedOwn(C[1], C[2], CORR_F2) && C.slice(0, 3).every(l => !opposedOwn(l, C[3], CORR_F2)) && !clashIn(C),
          `F2: L at M's candidates are not the back's receiving yards, the receiver's receptions, the tight end's yards and the quarterback's passing TDs by lean, the first two at -0.04 and the first and third at -0.06, no other pair moving against another: ${say(C)}`);
        chk(pids(lvOf(lm, 'elo-safe')) === 'fx-ll+fx-wl' && pids(lvOf(lm, 'elo-med')) === 'fx-ll+fx-qm+fx-wl'
          && (lvOf(lm, 'elo-aggr') || {}).why === 'Strongest first, only 3 leans in this game go together on one DraftKings slip: this level takes 4.'
          && (lvOf(lm, 'elo-xtrm') || {}).why === 'Only 4 players in this game qualify: this level takes 5.',
          `F2: L at M's levels do not keep the receiver at -0.04 and pass over the tight end at -0.06 beside the back (Safe the back and the receiver, Medium the quarterback too, Aggressive "Strongest first, only 3 leans in this game go together on one DraftKings slip: this level takes 4.", Extreme "Only 4 players in this game qualify: this level takes 5."): ${lm && lm.tiers ? lm.tiers.map(t => t.id + ' ' + (t.legs ? pids(t) : t.why)).join('; ') : JSON.stringify(lm)}`); }
      /* the words and the branches, as the owner reads them */
      { const rs = unit([G7], { where: 'in this game' }), tu = unit([G7B], { where: 'in this game' }), vw = unit([G7C], { where: 'in this game' });
        chk(pids(lvOf(rs, 'elo-safe')) === 'fx-q7+fx-r7' && pids(lvOf(rs, 'elo-med')) === 'fx-q7+fx-q8+fx-r7'
          && (lvOf(rs, 'elo-aggr') || {}).why === 'Strongest first, only 3 leans in this game go together on one DraftKings slip: this level takes 4.' && (lvOf(rs, 'elo-xtrm') || {}).why === 'Strongest first, only 3 leans in this game go together on one DraftKings slip: this level takes 5.',
          `F2: R at S's levels do not pass over his receivers' touchdowns (Safe his passing TDs and his back, Medium the other quarterback too, Aggressive and Extreme "Strongest first, only 3 leans in this game go together on one DraftKings slip: this level takes 4 (5)."): ${rs && rs.tiers ? rs.tiers.map(t => t.id + ' ' + (t.legs ? pids(t) : t.why)).join('; ') : JSON.stringify(rs)}`);
        chk(pids(lvOf(tu, 'elo-safe')) === 'fx-qt+fx-ru' && (lvOf(tu, 'elo-med') || {}).why === 'Strongest first, only 2 leans in this game go together on one DraftKings slip: this level takes 3.'
          && (lvOf(tu, 'elo-aggr') || {}).why === 'Only 3 players in this game qualify: this level takes 4.',
          `F2: T at U's levels are not its quarterback's passing TDs under and the other club's back, then "Strongest first, only 2 leans in this game go together on one DraftKings slip: this level takes 3." and "Only 3 players in this game qualify: this level takes 4.": ${tu && tu.tiers ? tu.tiers.map(t => t.id + ' ' + (t.legs ? pids(t) : t.why)).join('; ') : JSON.stringify(tu)}`);
        chk((lvOf(vw, 'elo-xtrm') || {}).why === 'Only 4 players in this game qualify: this level takes 5.' && pids(lvOf(vw, 'elo-safe')) === 'fx-av+fx-qv',
          `F2: V at W's Safe is not its first two main lines by id, or its Extreme does not say "Only 4 players in this game qualify: this level takes 5.": ${vw && vw.tiers ? vw.tiers.map(t => t.id + ' ' + (t.legs ? pids(t) : t.why)).join('; ') : JSON.stringify(vw)}`);
        const s1 = unit([G7C, G7], { where: 'in the Sunday slot', perGame: true });
        chk(pids(lvOf(s1, 'elo-safe')) === 'fx-q7+fx-r7' && ['elo-med', 'elo-aggr'].every(id => { const t = lvOf(s1, id); return !!t && Array.isArray(t.legs) && t.legs.every(l => l.gid === G7C); })
          && (lvOf(s1, 'elo-xtrm') || {}).why === 'Strongest first, only 4 leans in any one game of the Sunday slot go together on one DraftKings slip: this level takes 5.',
          `F2: the Sunday slot of V at W and R at S does not take R at S's Safe (the larger summed lean, though V at W is listed first) and V at W's Medium and Aggressive, its Extreme "Strongest first, only 4 leans in any one game of the Sunday slot go together on one DraftKings slip: this level takes 5.": ${s1 && s1.tiers ? s1.tiers.map(t => t.id + ' ' + (t.legs ? pids(t) : t.why)).join('; ') : JSON.stringify(s1)}`);
        const s2 = unit([G7B, G7C], { where: 'in the Sunday slot', perGame: true });
        chk((lvOf(s2, 'elo-xtrm') || {}).why === 'Only 4 players in any one game of the Sunday slot qualify: this level takes 5.',
          `F2: the Sunday slot of T at U and V at W does not say its Extreme is empty of any one game, "Only 4 players in any one game of the Sunday slot qualify: this level takes 5.": ${JSON.stringify(lvOf(s2, 'elo-xtrm'))}`);
        const tie = [[G7C, G7D], [G7D, G7C]].map(g => unit(g, { where: 'in the Sunday slot', perGame: true })), xy = unit([G7D], { where: 'in this game' });
        const sumOf = t => t && Array.isArray(t.legs) ? t.legs.reduce((a, l) => a + l.lean, 0) : NaN;
        chk(tie.every((u, i) => !!u && Array.isArray(u.tiers) && u.tiers.slice(0, 3).every(t => Array.isArray(t.legs) && t.legs.every(l => l.gid === [G7C, G7D][i])))
          && ['elo-safe', 'elo-med', 'elo-aggr'].every(id => sumOf(lvOf(vw, id)) === sumOf(lvOf(xy, id))),
          `F2: two games whose levels' summed leans tie to the bit do not give the Sunday slot the earlier game's, each way round: ${tie.map(u => u && u.tiers ? u.tiers.map(t => t.legs ? t.legs.map(l => l.gid.slice(-3)).join('/') : '-').join(' ') : 'none').join(' | ')}`); }
      /* each game alone and the Sunday slots, by unitHeld (the ticks planted to nothing too) */
      const nf = unitHeld('F2', w, legs, MUf, Pf.players, CORR_F2, [
        { lab: 'R at S alone', gids: [G7], where: 'in this game' }, { lab: 'T at U alone', gids: [G7B], where: 'in this game' }, { lab: 'V at W alone', gids: [G7C], where: 'in this game' },
        { lab: 'J at K alone', gids: [G7E], where: 'in this game' }, { lab: 'the Sunday slot of J at K and R at S', gids: [G7E, G7], where: 'in the Sunday slot', perGame: true },
        { lab: 'L at M alone', gids: [G7F], where: 'in this game' },
        { lab: 'the Sunday slot of V at W and R at S', gids: [G7C, G7], where: 'in the Sunday slot', perGame: true },
        { lab: 'the Sunday slot of T at U and V at W', gids: [G7B, G7C], where: 'in the Sunday slot', perGame: true },
        { lab: 'the Sunday slot of V at W and X at Y', gids: [G7C, G7D], where: 'in the Sunday slot', perGame: true },
        { lab: 'the Sunday slot of X at Y and V at W', gids: [G7D, G7C], where: 'in the Sunday slot', perGame: true }]);
      chk(nf.full > 0 && nf.empty > 0 && nf.slot > 0, `F2: the units' check met ${nf.full} levels with legs, ${nf.empty} empty and ${nf.slot} slot levels held to their games' own: it holds less than it says`);
      /* eloPicks() over all six games: the candidates the rule's across them, each level the greedy prefix */
      { let r; try { r = w.eloPicks(); } catch (err) { r = 'threw ' + err.message; }
        if (!r || !Array.isArray(r.tiers) || !Array.isArray(r.cands)) chk(false, `F2: the Elo picks do not build over every game: ${typeof r === 'string' ? r : JSON.stringify(r)}`);
        else { const own = candsOwn(legs, MUf, Pf.players), off = candsOff(r.cands, own), want = levelsOwn(r.cands, sums, 'on your picks');
          chk(!off && r.candidates === r.cands.length, `F2: the Elo picks' candidates over every game are not the rule's: ${off}`);
          want.forEach((f, i) => { const bad = levelOff(r.tiers[i], f, { corr: CORR_F2 }); chk(!bad, `F2: the ${f.label} Elo pick over every game is not the first ${f.n} of the candidates that go together on one DraftKings slip: ${bad}`); });
          notes.push(`the Elo picks on F2's ${r.cands.length} candidates in six games: ${r.tiers.map(t => `${t.label} ${t.legs.length ? t.legs.map(l => l.pid.slice(3)).join('+') : 'empty'}`).join('; ')}; ${nf.full} levels with legs on units, ${nf.empty} empty, ${nf.slot} slot levels held to their games' own`); } }
      chk(!errors.length, `F2: the tab threw or logged an error on the check's own lines: ${errors.slice(0, 3).join('; ')}`); }

    /* ---- F2, every candidate kept: thirty-five in as many games, at leans a little apart ---- */
    { const ROWS3 = [...Array(35)].map((_, i) => ['fx-n' + String(i).padStart(2, '0'), 'WR', 'FN' + i, 'FO' + i, `2026_06_FN${i}_FO${i}`, 'receiving_yards', 'over', 49.5, -110, 0.52 + i * 0.002]);
      const { MUf, Pf, legs } = build(ROWS3), errors = [], { w } = page(MUf, { errors, P: Pf }); await wait(60);
      sumsInto(w, {}); w.__fx = legs; w.eval(PRICED_BY('__fx'));
      let r; try { r = w.eloPicks(); } catch (err) { r = 'threw ' + err.message; }
      const own = candsOwn(legs, MUf, Pf.players), C = r && Array.isArray(r.cands) ? r.cands : [], off = candsOff(C, own), want = levelsOwn(C, sumsOwn({}), 'on your picks');
      const xt = r && Array.isArray(r.tiers) ? r.tiers.find(t => t.id === 'elo-xtrm') : null;
      chk(!off && C.length === 35 && r.candidates === 35 && !!xt && pids(xt) === 'fx-n30+fx-n31+fx-n32+fx-n33+fx-n34' && want.every((f, i) => !levelOff(r.tiers[i], f)),
        `F2: thirty-five candidates are not every one kept, ranked by lean, with Extreme the five largest leans: ${C.length} handed over of ${r && r.candidates}; ${off}; Extreme ${pids(xt)}`);
      chk(!errors.length, `F2: the tab threw or logged an error on thirty-five candidates: ${errors.slice(0, 3).join('; ')}`); }
  }

  console.log(`elo tab check: ${checks} checks, ${fails.length} failures`);
  for (const n of notes) console.log('  note: ' + n);
  for (const f of fails) console.log('  FAIL: ' + f);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
