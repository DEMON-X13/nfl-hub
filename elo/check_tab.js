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
 *     matchup chance (eloMatchupP, DraftKings' fair chance on a leg moved by the matchup's nudge: the Elo picks stood on it,
 *     and since app v142 nothing on the page reads it, kept on the page with this check) a chance on every line, the
 *     check's own where the stat's nudge has held up and none where it has not, on a fair chance of the check's own
 *     (legFairStand);
 *     market + form (eloAltP, eloAltZ), the old search's fast sums (eloSums) and, since app v142, the Elo picks' engine
 *     (eloPicks, eloUnit, eloCardOpt and the rest) nowhere on the page;
 *   - (29 October 2026) the Elo-adjusted averages (matchups.json's `avg` and `avg_fit`, elo/build.py's ELO-ADJUSTED
 *     AVERAGES): the nudge every Elo matchup chance stands on is a leg's Elo part in its spread (`z`), on a trusted leg
 *     alone, by the check's own reading (nudgeOwn, eloPOwn), never the projection's own chance of the line; no chance on a
 *     player the block does not cover, though the formula's players have him; each trusted leg's `z` its Elo part over its
 *     spread and its Elo part the projection less its no-Elo twin, to the file's rounding; a receiver's and a kicker's
 *     window a row a leg (his average, the table he faces with its Elo and rank, the three multipliers, the projection and
 *     its Elo part, faded where untrusted); and a file from before the block (the same files with it taken out) read as
 *     before;
 *   - the Elo lean a builder row wears (window.eloLeanNote, which the Elo picks' cards wore too until app v142), on made-up
 *     players and nudges of the check's own (F1, a copy of the matchups file with the fixture's players, fits and records
 *     in it), so it holds in any week: a tenth in the stat's own units, an anytime touchdown's a hundredth, signed but a
 *     figure shown as 0 unsigned ("Elo 0.0"), with the defence it is set against named and ranked after it where the file
 *     names it ("Elo +0.5 · vs CAR Pass D #23", titled with the table's whole name, its Elo and rank and the Elo part's
 *     split, "and inputs" where the leg reads THE INPUTS), none on a stat the matchup has not earned; and on a file from
 *     before the Elo-adjusted averages the lean alone ("Elo +2.1"), noteOwn's own reading;
 *   - (4 November 2026) the Mismatches on the averages' own Elo part (elo/build.py, THE MISMATCH SCORE), on a file
 *     carrying the score (the week's, else the week's with the score planted by the check's own reading): the rows the
 *     check's own list (mmOwnV2: a back's rushing yards, a receiver's or tight end's receiving yards where the file's lead
 *     names and trusts the leg, a shift above nothing, not kicked off, not out; ranked by the shift, the Elo part in yards,
 *     the id) in its order, each bubble's size ("+7 pts"), bar, lines ("vs LAC Pass Defense #32." and "58 rec yds
 *     projected (+6.1 from the matchup)."), title and tag (on a tagged row alone), Show more's thirty with a Pts column,
 *     and a game's page tagging exactly the tagged rows of its game (MISMATCH, the points, the row's title, no grade); on
 *     fixtures: a quarterback with a big z and a shift past every row never listed, three rows level on the shift ranked
 *     by the Elo part in yards then the id, a ruled-out player and a kicked-off game leaving, the file's out list, a
 *     listed row under the tag drawn untagged, the file's tag null drawing no tag anywhere, and a lead leg untrusted or
 *     missing from the lead dropping its rows; (the review of 4 November 2026) each bubble's score its size alone (a word
 *     beside it, in an element of its own, read) and a size that rounds to nothing drawn "0 pts", unsigned; and the old
 *     Mismatches below on a file from before the score (the week's, else the week's with the score taken out), so the
 *     page's fallback is held at any hour;
 *   - (app v142, the owner's call of 5 November 2026: "instead of having the ELO picks in suggested parlays, i suggest we
 *     scrap that. and then if a player has a big mismatch on the positive side, we give them a mismatch button to go next
 *     to their name in the normal suggested parlays") the Mismatch tag on Suggested Parlays' cards (spMmDecorate, which the
 *     tab runs after each draw of the tab, renderSp), on a stand-in unit of the check's own (window.spUnit and spShown, its
 *     model cards in #spPanel as pbTierCard draws them): by the check's own reading (wearC), a leg wears exactly one tag
 *     where it is a player's leg (never a moneyline, spread or game total, whose side is over too), his row of this week's
 *     Mismatches is tagged (on a file with the score its tag; on one from before it graded Solid or better), the row is in
 *     the leg's own game and the leg bets his way (his over or his anytime touchdown, never an under or more of his
 *     interceptions); the tag right after his name's button (the hub's glance-name) or his name, "Mismatch" with the
 *     points and the row's title and no grade on a file with the score, "<Grade> mismatch" with its grade, its edge and
 *     the old title on one from before; none where his name's button names another player, none on an empty level, drawn
 *     twice once, window.mmFavours the check's own side rule on every planted leg; and with the matchups still being read
 *     no tag and nothing thrown, the tag on the next draw once they answer; on a file with the score planted and on one
 *     with it taken out, so it holds at any hour;
 *   - (4 November 2026) THE INPUTS in a player's window (elo/build.py, the owner's "Merge the inputs"): where his position's
 *     legs read them (an in: term in avg_fit.legs), a column for each kind they read before Base, ×Vol, ×Game and ×Q, each
 *     cell the leg's in_x of that kind to a hundredth or a dash, Base titled with his inputs in it and Proj still "Base ×
 *     Def × Elo", and one line under the table of what the inputs read for him (avg[pid].in), only the parts his legs read,
 *     word for word ("Snap share 82% last game (usual 77%) · 29% of targets · implied 15.3 pts · spread +10"), by the check's
 *     own reading (inKindsC, inxC, inLineC); on every position's window on the files, on a fixture of its own planted twice
 *     (every part of the line, a spread either way and level, a wind read, a roof and no forecast, a missing value, a cell
 *     with no in_x, without the kind or null) and on the files with the inputs taken out (the window from before them);
 *   - the old Mismatches bubbles' words (18 October 2026, a file from before the score): what an edge ranks is the
 *     matchup formula's units by their players' Elo ("vs the LAC secondary and defensive line, 32nd by player Elo"),
 *     never "a pass defense ranked", which on the page is the ELO Ratings tab's Pass Defense table; clubs level on a unit
 *     (to the hundredth) share its rank, held on a copy with one club's secondary a floating-point hair above another's,
 *     and clubs level on the Elo a team table shows share its # (22 October 2026), held on a copy so ranked;
 *   - (November 2026, the owner's call "Switch to ELO tab tables") a player's window ranks his opponent's Pass Rush, Run
 *     Defense and Pass Defense, three pills where the defensive line, the linebackers and the secondary stood, as the ELO
 *     Ratings tab's own tables draw them (model.json's units, the check's own reading): on the real files, on a copy with
 *     two clubs level on the Elo shown in Pass Defense (both windows one rank), on a copy with Run Defense taken out and
 *     the opponent carried on Pass Rush with no Pass Defense row (a dash for each, the carried mark), and on a matchups
 *     file whose league table is emptied (the same pills). Since October 2026 the whole page's smoke
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

/* (29 October 2026) the Elo-adjusted averages (elo/build.py, ELO-ADJUSTED AVERAGES): a matchups file carrying them reads
   every Elo matchup off its `avg` block, the check's own reading: each expected starter's legs, the Elo part `elo` (in
   the stat's units) and `z` (in the stat's spread at the projection), a leg trusted only where `avg_fit.legs` says its
   Elo part held up; a file built before them carries the matchup formula's alone (players' stats [form, projection,
   nudge], fit's sd and record's past), which the page reads as before */
const avgOn = MU => !!(MU && MU.avg && typeof MU.avg === 'object' && MU.avg_fit && MU.avg_fit.legs && typeof MU.avg_fit.legs === 'object');
/* a player's projections, whichever the file carries */
const entryOwn = (MU, pid) => (avgOn(MU) ? MU.avg[pid] : MU && MU.players && MU.players[pid]) || null;
const projOwn = a => Array.isArray(a) ? a[1] : a && typeof a === 'object' ? a.proj : NaN;
/* the Elo part on a leg a builder row's Elo lean and the Elo matchup chance read: {n, the Elo part in the stat's units; z, in its spread; v, the entry;
   vs, the table he faces (the block's alone)}; null on an untrusted leg, or with no projection of his on it */
function nudgeOwn(MU, pid, st) {
  if (avgOn(MU)) { const v = MU.avg[pid], a = v && v.stats && v.stats[st], f = v && MU.avg_fit.legs[v.group + '|' + st];
    if (!a || !f || f.trusted !== true || !(a.sd > 0) || !isFinite(a.elo) || !isFinite(a.z)) return null;
    return { n: a.elo, z: a.z, v, vs: a.vs || null, dx: a.def_x, ex: a.elo_x, inp: !!(a.in_x && typeof a.in_x === 'object') }; }
  const pl = MU && MU.players && MU.players[pid], a = pl && pl.stats && pl.stats[st]; if (!a) return null;
  const r = MU.record && MU.record[pl.group + '|' + st], q = r && r.past; if (!(q && q.rmse_elo < q.rmse_form && q.right_top >= 0.53)) return null;
  const f = MU.fit && MU.fit[pl.group + '|' + st]; if (!f || !(f.sd > 0)) return null;
  return { n: a[2], z: a[2] / f.sd, v: pl, vs: null };
}
/* an Elo lean as a builder row says it (and an Elo pick did until app v142), the check's own reading (app v138, the review of 27 October 2026): a
   tenth in the stat's own units, an anytime touchdown's a hundredth, signed but a figure shown as 0 unsigned; since 29
   October 2026, where the file names the table he faces (the Elo-adjusted averages' vs), that table in a few words and its
   rank on the ELO tab after it ("Elo +0.5 · vs CAR Pass D #23"), titled with its whole name, its Elo and its rank; on a
   file from before, the lean alone as before. '' on a leg with no trusted Elo part. The title gives the Elo part's split
   (the review of 29 October 2026), his Elo given his average and the defence, the file's elo_x and def_x to a hundredth;
   on a leg reading THE INPUTS (an in_x on the stat) his Elo given his average and inputs (the review of 4 November 2026) */
const mulOwn = x => isFinite(x) ? (+x).toFixed(2) : '–';
const leanOwn = (v, stat) => { const sh = Math.abs(v).toFixed(stat === 'any_td' ? 2 : 1); return +sh === 0 ? sh : (v > 0 ? '+' : '−') + sh; };
const VS_NAME_OWN = { def: 'Overall Defense', run_def: 'Run Defense', pass_def: 'Pass Defense' }, VS_SHORT_OWN = { def: 'Overall D', run_def: 'Run D', pass_def: 'Pass D' };
const ordC = n => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const escC = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function noteOwn(MU, l) {
  const m = l && nudgeOwn(MU, l.pid, l.stat); if (!m) return '';
  const t = leanOwn(m.n, l.stat), q = m.vs;
  if (!q || !VS_SHORT_OWN[q.table] || q.rank == null || !m.v.opp) return `<small class="pe-lean" data-pe-lean="${m.n}" title="His Elo against the defenders he faces moves his projection ${t}">Elo ${t}</small>`;
  return `<small class="pe-lean" data-pe-lean="${m.n}" title="${escC(`His Elo for his average${m.inp ? ' and inputs' : ''} (×${mulOwn(m.ex)}) and the ${m.v.opp} ${VS_NAME_OWN[q.table]} (${q.elo}, ${ordC(q.rank)}, ×${mulOwn(m.dx)}) move his projection ${t}`)}">Elo ${t} <span class="pe-lean-vs">· ${escC(`vs ${m.v.opp} ${VS_SHORT_OWN[q.table]} #${q.rank}`)}</span></small>`;
}
/* (4 November 2026) THE INPUTS in a player's window, the check's own reading (elo/build.py's avg_in_split names the
   kinds; the page's muInKinds and muInLine are never read): a leg's input terms are the in: terms avg_fit.legs gives it;
   implied points, spread and wind are the game's kind, the Questionable tag its own, every other (snap share and shares)
   his volume; a position gets a column for each kind its legs read, ×Vol, ×Game, ×Q in that order, each cell the leg's
   in_x of that kind to a hundredth ('–' where it has none: no in_x, not that kind, or not a number), led by Typical, the
   twin at a typical starter's inputs (no_elo over the product of the leg's in_x that are numbers, as the window draws
   Base; '–' where it has none), so Typical × the multipliers is Base (the review of 4 November 2026); and under the
   table one line of what the inputs read for him (avg[pid].in), only the parts his position's legs read: "Snap share 82%
   last game (usual 77%)" (snap1 and snapL, either alone said so), "29% of targets", "65% of carries", "35% of air
   yards" (the long share, sh_*L), "implied 15.3 pts", "spread +10" (his club's spread as a line: minus when favoured, 0
   level), and on a leg reading the wind "wind 3 mph", "roof" (wind_src roof) or "no wind forecast"; whole percents,
   a value not a number leaving its part out */
const IN_KIND_C = t => t === 'in:imp' || t === 'in:spr' || t === 'in:wind' ? 'game' : t === 'in:q' ? 'q' : 'vol';
const IN_COL_C = { vol: '×Vol', game: '×Game', q: '×Q' };
const IN_TITLE_C = { vol: "His snap share and his share of his club's targets, carries or air yards, against a typical starter's: Typical × his inputs gives Base",
  game: "His club's implied points and spread (and the wind, on passing yards), against a typical starter's: Typical × his inputs gives Base",
  q: 'Listed Questionable, against not listed: Typical × his inputs gives Base' };
const TYP_TITLE_C = "His projection with no Elo terms at a typical starter's inputs";
const inTermsC = (MU, g) => { const out = [];
  for (const [k, f] of Object.entries((MU && MU.avg_fit && MU.avg_fit.legs) || {})) if (k.split('|')[0] === g && f && Array.isArray(f.terms))
    for (const t of f.terms) if (typeof t === 'string' && t.slice(0, 3) === 'in:' && !out.includes(t)) out.push(t);
  return out; };
const inKindsC = (MU, g) => ['vol', 'game', 'q'].filter(k => inTermsC(MU, g).some(t => IN_KIND_C(t) === k));
const isNumC = x => typeof x === 'number' && Number.isFinite(x);
const inxC = (a, k) => a && a.in_x && typeof a.in_x === 'object' && isNumC(a.in_x[k]) ? a.in_x[k].toFixed(2) : '–';
/* the twin at a typical starter's inputs, NaN where the leg has no multiplier that is a number */
const typC = a => { const v = a && a.in_x && typeof a.in_x === 'object' ? Object.values(a.in_x).filter(isNumC) : []; return v.length ? a.no_elo / v.reduce((x, y) => x * y, 1) : NaN; };
function inLineC(MU, v, g) {
  const I = v && v.in, T = inTermsC(MU, g), out = [], keys = [], pc = x => `${Math.round(100 * x)}%`;
  if (!I || typeof I !== 'object') return { text: '', keys };
  const put = (k, t) => { keys.push(k); out.push(t); };
  if ((T.includes('in:snap1r') || T.includes('in:snapL')) && (isNumC(I.snap1) || isNumC(I.snapL)))
    put('snap', isNumC(I.snap1) ? 'Snap share ' + pc(I.snap1) + ' last game' + (isNumC(I.snapL) ? ' (usual ' + pc(I.snapL) + ')' : '') : 'Snap share usual ' + pc(I.snapL));
  for (const [k, word] of [['tgt', 'targets'], ['car', 'carries'], ['ay', 'air yards']])
    if ((T.includes('in:shL_' + k) || T.includes('in:shr_' + k)) && isNumC(I['sh_' + k + 'L'])) put(k, pc(I['sh_' + k + 'L']) + ' of ' + word);
  if (T.includes('in:imp') && isNumC(I.implied)) put('implied', 'implied ' + I.implied.toFixed(1) + ' pts');
  if (T.includes('in:spr') && isNumC(I.spread)) { const m = Number(Math.abs(I.spread).toFixed(1)); put('spread', 'spread ' + (m === 0 ? '0' : (I.spread > 0 ? '−' : '+') + m)); }
  if (T.includes('in:wind')) put('wind', I.wind_src === 'roof' ? 'roof' : isNumC(I.wind) ? `wind ${Math.round(I.wind)} mph` : 'no wind forecast');
  return { text: out.join(' · '), keys };
}
/* the check's own fixture of the inputs: the input terms each leg reads on it (every other leg reading none, whatever the
   file's legs read), and two sets of planted inputs a position */
const IN_FIX_C = { 'WR|receptions': ['in:snap1r', 'in:snapL', 'in:shL_tgt', 'in:shr_tgt', 'in:imp', 'in:spr', 'in:q'], 'WR|receiving_yards': ['in:shL_tgt', 'in:shL_ay', 'in:imp', 'in:spr', 'in:q'],
  'RB|rushing_yards': ['in:snapL', 'in:shL_car', 'in:imp', 'in:spr'], 'QB|passing_yards': ['in:imp', 'in:spr', 'in:wind'], 'TE|receptions': ['in:snap1r', 'in:shL_tgt'], 'K|kick_pts': ['in:spr', 'in:wind'] };
const IN_FIX_X_C = { 'WR|receptions': { vol: 1.3103, game: 0.8999, q: 0.9348 }, 'WR|receiving_yards': { vol: 1.3519, game: 0.8542 }, 'RB|rushing_yards': { vol: 1.0813, game: 0.9439 },
  'QB|passing_yards': { game: null }, 'TE|receptions': { vol: 1.1211 }, 'K|kick_pts': { game: 1.115 } };
const IN_FIX_SETS_C = [
  { WR: { snap1: 0.82, snapL: 0.7737, sh_tgtL: 0.293, sh_tgtS: 0.2752, sh_carL: 0.0145, sh_carS: 0.0103, sh_ayL: 0.3504, sh_ayS: 0.3361, implied: 15.25, spread: -10.0, wind: 3.0, wind_src: 'nws' },
    RB: { snap1: null, snapL: 0.5049, sh_tgtL: 0.0553, sh_tgtS: 0.0625, sh_carL: 0.6454, sh_carS: 0.6451, sh_ayL: 0.0041, sh_ayS: 0.0039, implied: null, spread: 3.5, wind: 0.0, wind_src: 'roof' },
    QB: { snap1: 1.0, snapL: 0.99, sh_tgtL: 0.0, sh_tgtS: 0.0, sh_carL: 0.1378, sh_carS: 0.0944, sh_ayL: 0.0, sh_ayS: 0.0, implied: 24.46, spread: 0.0, wind: 12.6, wind_src: 'open-meteo' },
    K: { snap1: null, snapL: null, sh_tgtL: 0.0, sh_tgtS: 0.0, sh_carL: 0.0, sh_carS: 0.0, sh_ayL: 0.0, sh_ayS: 0.0, implied: 19.75, spread: -6.0, wind: null, wind_src: 'beyond the forecast' } },
  { WR: { snap1: 0.05, snapL: null, sh_tgtL: null, sh_tgtS: null, sh_carL: null, sh_carS: null, sh_ayL: 0.004, sh_ayS: null, implied: 31.0, spread: 12.5, wind: 21.0, wind_src: 'nws' },
    RB: { snap1: 0.61, snapL: 0.655, sh_tgtL: 0.1, sh_tgtS: 0.1, sh_carL: null, sh_carS: null, sh_ayL: 0.0, sh_ayS: 0.0, implied: 7.0, spread: null, wind: 3.0, wind_src: 'nws' },
    QB: { snap1: 1.0, snapL: 1.0, sh_tgtL: 0.0, sh_tgtS: 0.0, sh_carL: 0.2, sh_carS: 0.2, sh_ayL: 0.0, sh_ayS: 0.0, implied: null, spread: -2.5, wind: 0.0, wind_src: 'roof' },
    K: { snap1: null, snapL: null, sh_tgtL: 0.0, sh_tgtS: 0.0, sh_carL: 0.0, sh_carS: 0.0, sh_ayL: 0.0, sh_ayS: 0.0, implied: 22.0, spread: null, wind: 0.0, wind_src: 'nws' } } ];
/* a copy of a matchups file on the fixture: every leg's in: terms taken out, IN_FIX_C's put in, and the first ranked of
   each position planted as an expected starter on a made-up game with every leg of his position (in_x on IN_FIX_X_C's)
   and his inputs (none for the tight end); __fix names them */
function inFixC(MU, set) {
  const X = JSON.parse(JSON.stringify(MU)); X.out = {}; X.__fix = {};
  for (const [k, f] of Object.entries(X.avg_fit.legs)) if (f) { f.terms = (Array.isArray(f.terms) ? f.terms : ['one']).filter(t => !String(t).startsWith('in:')).concat(IN_FIX_C[k] || []); delete f.coef; }
  for (const v of Object.values(X.avg)) { delete v.in; for (const a of Object.values(v.stats || {})) delete a.in_x; }
  ['WR', 'RB', 'QB', 'TE', 'K'].forEach((g, gi) => { const r = P.groups[g] && (P.groups[g].top || [])[0]; if (!r) return; X.__fix[g] = r;
    const legs = Object.keys(X.avg_fit.legs).filter(k => k.split('|')[0] === g), tb = { QB: 'pass_def', RB: 'run_def', WR: 'pass_def', TE: 'pass_def', K: 'def' }[g];
    X.avg[r.id] = { group: g, game_id: `2099_99_FX${gi}_FY${gi}`, team: r.team || 'AAA', opp: 'FY' + gi, home: 1, slot: 1, games: 9, R: 1600, RS: 1550, defs: {}, own: {}, D: {},
      stats: Object.fromEntries(legs.map((k, j) => { const base = 10 + 7 * j, dx = 1.02 + j / 100, ex = 0.97 + j / 200, proj = base * dx * ex;
        const st = { avg: base + 1.5, proj, no_elo: base, elo: proj - base, sd: 4 + j, z: (proj - base) / (4 + j), def_x: dx, elo_x: ex, vs: { table: tb, elo: 1490 + j, rank: 7 + j } };
        if (IN_FIX_X_C[k]) st.in_x = IN_FIX_X_C[k];
        return [k.split('|')[1], st]; })) };
    if (set[g]) X.avg[r.id].in = set[g]; });
  return X;
}
/* a leg for every matchup line in a matchups file, over and under, at -110 and +150: what the checks price the files on,
   each on its player's club as the page's legs are; since 29 October 2026 the block's legs where the file carries it */
const linesOf = MU => { const legs = [];
  for (const [pid, pl] of Object.entries((avgOn(MU) ? MU.avg : MU && MU.players) || {})) for (const st of Object.keys(pl.stats || {})) {
    const proj = projOwn(pl.stats[st]), k = isFinite(proj) ? Math.floor(proj) + 0.5 : 0.5;
    for (const side of ['over', 'under']) for (const price of [-110, 150])
      legs.push({ key: `${pl.game_id}|${pid}|${st}`, gid: pl.game_id, pid, stat: st, grp: pl.group, team: pl.team, opp: pl.opp, k, side, price, src: 'real', name: pid, label: st }); }
  return legs; };
/* DraftKings' fair chance on a leg, the check's own stand-in for the props parts' legFair (the fair chance the Elo
   matchup chance is moved from, handed to eloMatchupP as the page hands it): a book price (src 'real') with the other
   side's price on the leg (oth) its share of the two with the margin out; one with no other side its implied chance over
   a margin of the check's own, 5.66% (the estimate's), est.; a price worked from DraftKings' line read on ESPN (src
   'dkline') the read's own fair chance (espn.fair), est.; none for any other (the model's own estimate). F1's fixture sets
   each leg's nudge from it */
function legFairStand(l) {
  if (!l || !(l.src === 'real' || l.src === 'dkline') || !isFinite(l.price) || !l.price) return null;
  const imp = x => x < 0 ? -x / (100 - x) : 100 / (100 + x);
  if (l.src === 'dkline') { const f = l.espn && l.espn.fair; return f > 0 && f < 1 ? { p: f, est: true } : null; }
  if (isFinite(l.oth) && l.oth) { const a = imp(l.price), b = imp(l.oth); return { p: a / (a + b), est: false }; }
  return { p: Math.max(0.001, Math.min(0.999, imp(l.price) / 1.0566)), est: true };
}
const erfC = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const PhiC = z => 0.5 * (1 + erfC(z / Math.SQRT2));
const invPhiC = p => { let lo = -9, hi = 9; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (PhiC(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
/* a leg's Elo chance worked out here: DraftKings' fair chance on it moved by the Elo part of his projection in the
   stat's spread (nudgeOwn's z: since 29 October 2026 the Elo-adjusted average's; on a file from before, the matchup
   formula's nudge over its typical miss) toward the side it favours, on a leg whose Elo part has held up; null where it
   has none, or with no fair chance. Never the projection's own chance of the line (the honesty rule of app v138) */
function eloPOwn(MU, l, fair) {
  const m = nudgeOwn(MU, l.pid, l.stat); if (!m || !(fair > 0 && fair < 1)) return null;
  return PhiC(invPhiC(fair) + (l.side === 'under' ? -1 : 1) * m.z);
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
  const games = [...new Set([...Object.values((MU && MU.players) || {}), ...Object.values((MU && MU.avg) || {})].map(v => v.game_id).filter(Boolean))].sort();
  w.__clock = { now: 0 };
  w.eval(`var S={sched:${JSON.stringify(games.map((id, i) => ({ id, w: week, k: 1000 * (i + 1) })))},inactive:{},ui:{},parlay:{},saved:[],stake:10};
    function gameStarted(g){ return window.__clock.now>=g.k; }
    function renderSlate(){}${opts && opts.sp ? '\n    function renderSp(){}' : ''}
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

/* ---- (4 November 2026) the Mismatches on the averages' own Elo part (elo/build.py, THE MISMATCH SCORE) ----
   The check's own reading of a matchups file carrying the score (avg_fit.mismatch and each lead block's mm): a back's,
   receiver's or tight end's lead leg alone (its own copy, MM_LEAD_C: a back's rushing yards, a receiver's or tight end's
   receiving yards, never a quarterback's or a kicker's), where the file's lead names that leg too and avg_fit.legs trusts
   it; listed with a shift above nothing, his game not kicked off by the stub's clock and he not out (the file's out, the
   page's inactive list); ranked by the shift, then the Elo part in yards, then the id; each row's words worked out here:
   its size ("+7 pts", the shift in whole points), the defence ("vs LAC Pass Defense #32", the block's vs), the projection
   and its Elo part ("58 rec yds projected (+6.1 from the matchup)."), the tag on a tagged row alone (the file's tag not
   null and the block's tag true) and the title, the whole of it ("Mismatch this week: the matchup moves his rec yds from
   52.0 to 58.1 (+6.1 rec yds): the LAC Pass Defense (1448, 32nd of 32) ×1.04 and his Elo for his average ×1.08. On an
   even line that is +7 pts on the over.", "The matchup moves ..." untagged, "and defenders" after the table where the
   leg's terms read the defenders' player Elo, the clubs counted in model.json's table) */
const MM_LEAD_C = { RB: 'rushing_yards', WR: 'receiving_yards', TE: 'receiving_yards' }, MM_LB_C = { rushing_yards: 'rush yds', receiving_yards: 'rec yds' };
const mmOnC = MU => avgOn(MU) && !!(MU.avg_fit.mismatch && typeof MU.avg_fit.mismatch === 'object' && MU.avg_fit.mismatch.lead && typeof MU.avg_fit.mismatch.lead === 'object');
const sgnC = x => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1);
/* a size in whole points, signed but a size of nothing unsigned ("0 pts"), as the page shows every figure of 0 */
const ptsC = shift => { const n = Math.round(100 * shift); return `${n > 0 ? '+' : ''}${n} pts`; };
function mmOwnV2(MU, Mm, o) {
  const F = MU.avg_fit.mismatch, rows = [];
  for (const [pid, v] of Object.entries(MU.avg || {})) {
    const m = v && v.mm; if (!m || typeof m !== 'object') continue;
    const st = MM_LEAD_C[v.group]; if (!st || m.stat !== st || F.lead[v.group] !== st) continue;
    const f = MU.avg_fit.legs[v.group + '|' + st], a = v.stats && v.stats[st];
    if (!f || f.trusted !== true || !a || !(m.shift > 0)) continue;
    if ((MU.out && MU.out[pid]) || (o.inactive && o.inactive[pid]) || o.kicked(v.game_id)) continue;
    const lb = MM_LB_C[st], pts = ptsC(m.shift), yds = `${sgnC(a.elo)} ${lb}`, q = a.vs && VS_NAME_OWN[a.vs.table] ? a.vs : null;
    const U = q && Mm.units && Mm.units[q.table], n = U && typeof U === 'object' ? Object.keys(U).length : null;
    const dfn = Array.isArray(f.terms) && f.terms.some(t => t === 'DL' || t === 'LB' || t === 'DB'), tag = F.tag != null && m.tag === true;
    const tb = q ? `${v.opp} ${VS_NAME_OWN[q.table]}` : String(v.opp);
    const title = `${tag ? 'Mismatch this week: the' : 'The'} matchup moves his ${lb} from ${(+a.no_elo).toFixed(1)} to ${(+a.proj).toFixed(1)} (${yds}): the ${tb}`
      + `${q ? ` (${q.elo}, ${ordC(q.rank)}${n ? ' of ' + n : ''})` : ''}${dfn ? ' and defenders' : ''} ×${mulOwn(a.def_x)} and his Elo for his average${a.in_x && typeof a.in_x === 'object' ? ' and inputs' : ''} ×${mulOwn(a.elo_x)}. On an even line that is ${pts} on the over.`;
    rows.push({ pid, gid: v.game_id, group: v.group, shift: +m.shift, elo: +a.elo, tag, pts, vs: q ? `vs ${tb} #${q.rank}` : `vs ${v.opp}`,
      proj: `${Math.round(a.proj)} ${lb}`, part: sgnC(a.elo), title, facing: q ? `${ordC(q.rank)}${n ? ' of ' + n : ''}${VS_NAME_OWN[q.table]}` : '–' }); }
  return rows.sort((x, y) => y.shift - x.shift || y.elo - x.elo || (x.pid < y.pid ? -1 : x.pid > y.pid ? 1 : 0));
}
/* the old score's words, its grades and its units' rank, none of which a score's row may say, in its text or a title */
const MM_OLD_C = /\bedges?\b|by player Elo|\b(?:Slight|Solid|Big|Huge)\b|standard deviation|\bSD\b/;
/* an element's text with every text node apart (the review of 4 November 2026: textContent runs neighbours together, so
   "+15 pts" beside a "Huge" of its own read "+15 ptsHuge", where no word starts), and every title under it */
const textApart = el => { const tw = el.ownerDocument.createTreeWalker(el, 4), a = []; for (let n = tw.nextNode(); n; n = tw.nextNode()) a.push(n.nodeValue); return a.join(' ').replace(/\s+/g, ' ').trim(); };
const allText = el => !el ? '' : [textApart(el), ...[el, ...el.querySelectorAll('[title]')].map(x => x.getAttribute && x.getAttribute('title') || '')].join(' | ');
/* a file with the score planted, the check's own (where the week's files are from before it): the lead legs its own copy
   trusts in the file, each lead block's shift Phi(z) - 0.5 of its own z to four places (erfC, above), the tag at 3.5
   points; and a file from before the score, the score taken out */
function plantMmC(MU) {
  if (!avgOn(MU)) return null;
  const C = JSON.parse(JSON.stringify(MU)), lead = {};
  for (const [g, st] of Object.entries(MM_LEAD_C)) { const f = C.avg_fit.legs[g + '|' + st]; if (f && f.trusted === true) lead[g] = st; }
  C.avg_fit.mismatch = { lead, tag: 0.035, chosen: 0.035, chosen_on: '2018-2021', record: {}, ladders: {} };
  for (const v of Object.values(C.avg)) { delete v.mm; const st = lead[v.group], a = st && v.stats && v.stats[st];
    if (a && isFinite(a.z)) { const sh = Math.round(0.5 * erfC(a.z / Math.SQRT2) * 1e4) / 1e4; v.mm = { stat: st, shift: sh, tag: sh >= 0.035 }; } }
  return C;
}
/* the old Mismatches' rows, the check's own reading of a file from before the score (tab_elo.html's old rule, between its
   OLD-MISMATCHES marks): each quarterback, back, receiver and tight end of the formula's players not out and not kicked
   off, his Elo's z at his position (league.norms, else among the week's) above nothing and the unit he faces' z among the
   league's defences (league.defs, else the week's) below it, the unit the secondary and the line for a quarterback, the
   secondary for a receiver or tight end, the line and the linebackers for a back; ranked by the first less the second */
function oldListC(MU, o) {
  const UN = { QB: ['DB', 'DL'], WR: ['DB'], TE: ['DB'], RB: ['DL', 'LB'] }, L = MU.league || {};
  const P = Object.entries(MU.players || {}).map(([pid, v]) => ({ pid, ...v })).filter(v => UN[v.group] && !(MU.out && MU.out[v.pid]) && !(o.inactive && o.inactive[v.pid]) && !o.kicked(v.game_id));
  const unit = (g, d) => UN[g].reduce((a, k) => a + d[k], 0) / UN[g].length;
  const zs = a => { const m = a.reduce((x, y) => x + y, 0) / a.length, sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1)) || 1; return x => (x - m) / sd; };
  const by = {}; for (const v of P) by[v.opp] = v.opp_def; if (L.defs) Object.assign(by, L.defs);
  const rows = [];
  for (const g of Object.keys(UN)) { const n = L.norms && L.norms[g], grp = P.filter(v => v.group === g);
    const pz = n ? x => (x - n[0]) / (n[1] || 1) : grp.length > 1 ? zs(grp.map(v => v.elo)) : null; if (!pz) continue;
    const dz = zs(Object.values(by).map(d => unit(g, d)));
    /* each unit's rank among the defences (by, the league's where the file carries them), level to the hundredth sharing one */
    const key = x => Math.round(x * 100), vals = Object.entries(by).map(([t, d]) => [t, unit(g, d)]);
    for (const v of grp) { const a = pz(v.elo), b = dz(unit(g, v.opp_def));
      if (a > 0 && b < 0) rows.push({ pid: v.pid, score: a - b, gid: v.game_id, group: g, opp: v.opp, defN: vals.length,
        defRank: by[v.opp] ? 1 + vals.filter(([, y]) => key(y) > key(unit(g, by[v.opp]))).length : null }); } }
  return rows.sort((x, y) => y.score - x.score);
}
/* (app v142) the old rows as Suggested Parlays' cards tag them, the check's own reading of the old words: tagged graded
   Solid or better (the edge to a tenth at 1 and up), the tag "<Grade> mismatch" with its grade and its edge to a tenth,
   its title the old Mismatches' own: "Big mismatch this week: edge 2.3, WR vs the LAC secondary, ranked 32nd of 32 on the
   matchup formula's player ratings" */
const AGAINST_C = { QB: 'secondary and defensive line', WR: 'secondary', TE: 'secondary', RB: 'defensive line and linebackers' };
const gradeC = s => { const x = Math.round(s * 10) / 10; return x >= 3 ? 'Huge' : x >= 2 ? 'Big' : x >= 1 ? 'Solid' : 'Slight'; };
const oldTagRowsC = (MU, o) => oldListC(MU, o).map(r => { const g = gradeC(r.score);
  return { ...r, tag: g !== 'Slight', grade: g, text: `${g} mismatch`, n: r.score.toFixed(1),
    title: `${g} mismatch this week: edge ${r.score.toFixed(1)}, ${r.group} vs the ${r.opp} ${AGAINST_C[r.group]}, ranked ${ordC(r.defRank)} of ${r.defN} on the matchup formula's player ratings` }; });
function stripMmC(MU) { const C = JSON.parse(JSON.stringify(MU)); if (C.avg_fit) delete C.avg_fit.mismatch; for (const v of Object.values(C.avg || {})) delete v.mm; return C; }
const kickedC = (w, gid) => { const g = w.eval('S.sched').find(x => x.id === gid); return !!g && w.__clock.now >= g.k; };
/* the page held to the check's own list: the rows in its order, the card's five bubbles, each bubble's size, bar, tag,
   lines and title, Show more's thirty and its head, and a game's page tagging exactly the tagged rows of its game (a
   stand-in game page of the check's own, its players' rows by name: MISMATCH after the name, the points on it, the row's
   title, no grade); returns the list */
async function holdV2(w, d, MU, lab) {
  const own = mmOwnV2(MU, M, { inactive: w.eval('S').inactive, kicked: gid => kickedC(w, gid) }), got = w.eloMismatches();
  chk(got.map(v => v.pid).join() === own.map(v => v.pid).join() && got.every(v => v.v2 === true),
    `${lab}: the Mismatches are not the check's own list of the score: ${got.slice(0, 6).map(v => v.pid + (v.v2 ? '' : ' (old)')).join(', ')} against ${own.slice(0, 6).map(v => v.pid).join(', ')} (${got.length} and ${own.length})`);
  w.renderSlate(); await wait(20);
  const card = d.getElementById('peMism');
  if (!own.length) { chk(!card, `${lab}: with no row of the score listed the Mismatches card still shows`); return own; }
  const bubbles = card ? [...card.querySelectorAll('.pe-mm-b')] : [], max = own[0].shift;
  chk(bubbles.length === Math.min(5, own.length) && bubbles.every((b, i) => b.dataset.mmPid === own[i].pid && b.dataset.mmGame === own[i].gid),
    `${lab}: the Mismatches card's bubbles are not the first five of the list: ${bubbles.map(b => b.dataset.mmPid).join(', ')}`);
  const bad = bubbles.map((b, i) => { const r = own[i], sc = b.querySelector('.pe-mm-score'), bar = sc && sc.querySelector('.pe-mm-bar i'), tg = [...b.querySelectorAll('.pe-mmtag')], e = [];
    if (txt(sc && sc.querySelector('b')) !== r.pts) e.push(`size "${txt(sc && sc.querySelector('b'))}", not "${r.pts}"`);
    /* the score is its size and nothing more (a grade word set beside the points, in an element of its own, is read) */
    if (txt(sc) !== r.pts) e.push(`score "${txt(sc)}", not its size "${r.pts}" alone`);
    if (!sc || sc.title !== r.title) e.push(`title "${sc ? sc.title : ''}", not "${r.title}"`);
    if (txt(b.querySelector('.pe-mm-sub')) !== `${r.vs}.${r.proj} projected (${r.part} from the matchup).`) e.push(`lines "${txt(b.querySelector('.pe-mm-sub'))}"`);
    if (!bar || bar.style.width !== `${Math.max(6, Math.round(100 * r.shift / max))}%`) e.push(`bar ${bar ? bar.style.width : 'none'}`);
    if (r.tag ? !(tg.length === 1 && txt(tg[0]) === 'Mismatch' && tg[0].title === r.title) : tg.length) e.push(`tag ${tg.map(txt).join('/') || 'none'} on a row ${r.tag ? '' : 'not '}tagged`);
    if (/\bpe-g[1-4]\b/.test(b.innerHTML)) e.push('a grade colour');
    return e.length ? `${r.pid}: ${e.join('; ')}` : ''; }).filter(Boolean);
  chk(!bad.length && !MM_OLD_C.test(allText(card)), `${lab}: a Mismatches bubble is not its row's own words: ${bad.slice(0, 3).join(' | ') || (allText(card).match(MM_OLD_C) || [''])[0]}`);
  if (own.length > 5) { const more = d.getElementById('peMmMore'); chk(!!more && txt(more) === `Show the top ${Math.min(30, own.length)}`, `${lab}: no "Show the top ${Math.min(30, own.length)}"`);
    if (more) { more.click(); await wait(20);
      const m = d.getElementById('peMmModal'), heads = m ? [...m.querySelectorAll('thead th')].map(txt) : [], trs = m ? [...m.querySelectorAll('tbody tr')] : [];
      const badR = trs.map((tr, i) => { const r = own[i], c = tr.children; if (!r) return `row ${i + 1} past the list`;
        const ok = tr.dataset.mmPid === r.pid && tr.title === r.title && txt(c[3]) === r.facing && txt(c[4]) === r.pts + (r.tag ? 'Mismatch' : '') && txt(c[5]) === `${r.proj}${r.part} from the matchup` && !/\bpe-g[1-4]\b/.test(tr.innerHTML);
        return ok ? '' : `${r.pid}: ${[...c].slice(3).map(txt).join(' / ')}`; }).filter(Boolean);
      chk(!!m && !m.hidden && heads.join('|') === '#|Player|Game|Facing|Pts|Projection' && trs.length === Math.min(30, own.length) && !badR.length && !MM_OLD_C.test(allText(m.querySelector('tbody'))),
        `${lab}: Show more is not the top ${Math.min(30, own.length)} of the list with a Pts column: ${heads.join('|')} ${badR.slice(0, 3).join(' | ')}`);
      if (d.getElementById('peMmClose')) d.getElementById('peMmClose').click(); await wait(10); } }
  /* a game's page: the first game of the list */
  { const gid = own[0].gid, view = d.getElementById('gameView') || d.body.appendChild(Object.assign(d.createElement('div'), { id: 'gameView' }));
    const pids = Object.entries(MU.avg).filter(([, v]) => v.game_id === gid).map(([pid]) => pid);
    view.innerHTML = pids.map(pid => `<button class="plrbtn" data-open="${escC(pid)}"><span class="who">${escC((P.players[pid] || {}).name || pid)}</span></button>`).join('');
    w.eval('S').ui.game = gid; d.dispatchEvent(new w.Event('app-ready')); await wait(10);
    const tagged = new Map(own.filter(r => r.gid === gid && r.tag).map(r => [r.pid, r]));
    const badT = [...view.querySelectorAll('button.plrbtn')].map(b => { const r = tagged.get(b.dataset.open), t = [...b.querySelectorAll('.pe-mmtag')];
      if (!r) return t.length ? `${b.dataset.open} tagged with no tagged row` : '';
      const name = t[0] && t[0].previousSibling;
      return t.length === 1 && txt(t[0]) === 'Mismatch' && t[0].dataset.peMmtag === String(Math.round(100 * own.find(x => x.pid === r.pid).shift)) && !t[0].hasAttribute('data-pe-mmgrade')
        && t[0].title === r.title && !!name && name.nodeType === 3 && name.textContent.trim() === ((P.players[r.pid] || {}).name || r.pid) ? '' : `${r.pid}: ${t.map(x => `${txt(x)} ${x.dataset.peMmtag} "${x.title}"`).join(', ') || 'no tag'}`; }).filter(Boolean);
    chk(!badT.length, `${lab}: a game's page does not tag exactly the tagged rows of its game, MISMATCH after the name with the points and the row's title: ${badT.slice(0, 3).join(' | ')}`);
    view.innerHTML = ''; w.eval('S').ui.game = null; }
  return own;
}
async function v2Mm(MU, lab) {
  { const { w, d } = page(MU); await wait(60);
    const own = await holdV2(w, d, MU, lab);
    if (!own.length) { notes.push(`${lab}: no row of the score listed this week: the fixtures stand on made-up shifts`); }
    notes.push(`the Mismatches on the score (${lab}): ${own.length} listed, ${own.filter(r => r.tag).length} tagged, the top ${own.slice(0, 3).map(r => `${r.pid} ${r.pts}`).join(', ')}`);
    /* a ruled-out player (the page's inactive list) leaves, and the first game's rows leave once it kicks off */
    if (own.length) { const S = w.eval('S'); S.inactive[own[0].pid] = { week: +MU.week, status: 'Out' };
      const o2 = await holdV2(w, d, MU, `${lab}, ${own[0].pid} ruled out on the page`);
      chk(!o2.some(r => r.pid === own[0].pid) && !w.eloMismatches().some(v => v.pid === own[0].pid), `${lab}: a player the page rules out is still on the Mismatches`);
      delete S.inactive[own[0].pid];
      const g0 = own[0].gid, k0 = (w.eval('S.sched').find(x => x.id === g0) || {}).k; w.__clock.now = k0;
      const o3 = await holdV2(w, d, MU, `${lab}, ${g0} kicked off`);
      chk(!o3.some(r => r.gid === g0) && !w.eloMismatches().some(v => v.game_id === g0), `${lab}: a game that has kicked off is still on the Mismatches`);
      w.__clock.now = 0; } }
  /* the fixtures, each a copy of the file planted so: rows of the check's own making where the week's are too few */
  const base = JSON.parse(JSON.stringify(MU));
  const elig = Object.entries(base.avg).filter(([, v]) => v && MM_LEAD_C[v.group] && base.avg_fit.mismatch.lead[v.group] === MM_LEAD_C[v.group] && v.stats && v.stats[MM_LEAD_C[v.group]] && v.stats[MM_LEAD_C[v.group]].vs).map(([pid]) => pid).sort();
  if (elig.length < 4) { notes.push(`${lab}: fewer than four backs, receivers and tight ends on a trusted lead leg: the score's fixtures are skipped`); return; }
  const plantRow = (C, pid, shift, tag, elo) => { const v = C.avg[pid], st = MM_LEAD_C[v.group]; v.mm = { stat: st, shift, tag }; if (elo != null) v.stats[st].elo = elo; };
  /* a quarterback with a big z on a leg the file trusts (his passing yards, trusted in this copy) and a shift past every
     row: never listed, whatever the file says (the file's lead has no quarterback) */
  { const C = JSON.parse(JSON.stringify(base)), qb = Object.keys(C.avg).find(pid => C.avg[pid].group === 'QB' && C.avg[pid].stats && C.avg[pid].stats.passing_yards);
    if (!qb) notes.push(`${lab}: no quarterback in the file: the quarterback fixture is skipped`);
    else { const a = C.avg[qb].stats.passing_yards; a.z = 1.6; a.elo = 1.6 * (a.sd || 60); C.avg_fit.legs['QB|passing_yards'].trusted = true; C.avg[qb].mm = { stat: 'passing_yards', shift: 0.4452, tag: true };
      const { w, d } = page(C); await wait(60); const o = await holdV2(w, d, C, `${lab}, a quarterback planted with a shift of 0.4452`);
      chk(!w.eloMismatches().some(v => v.group === 'QB') && !o.some(r => r.group === 'QB'), `${lab}: a quarterback is on the Mismatches`); } }
  /* three rows level on the shift, past every other: the Elo part in yards first, then the id (the smallest id given the
     smallest part, so an order on the id alone puts it first) */
  { const C = JSON.parse(JSON.stringify(base)), [a, b, c] = elig.slice(0, 3);
    plantRow(C, a, 0.6, true, 5); plantRow(C, b, 0.6, true, 9); plantRow(C, c, 0.6, true, 9);
    const { w, d } = page(C); await wait(60); const o = await holdV2(w, d, C, `${lab}, three rows level on the shift`);
    chk(o.slice(0, 3).map(r => r.pid).join() === [b, c, a].join() && w.eloMismatches().slice(0, 3).map(v => v.pid).join() === [b, c, a].join(),
      `${lab}: rows level on the shift are not ranked by the Elo part in yards, then the id: ${w.eloMismatches().slice(0, 3).map(v => v.pid).join(', ')}, not ${[b, c, a].join(', ')}`); }
  /* a row the file's out list holds, and a listed row under the tag (its title "The matchup ...", no tag) */
  { const C = JSON.parse(JSON.stringify(base)), [a, , , dd] = elig;
    plantRow(C, a, 0.3, true); plantRow(C, dd, 0.012, false); C.out = Object.assign({}, C.out, { [a]: 'out (knee) in week 8, not practising: counted out' });
    const { w, d } = page(C); await wait(60); const o = await holdV2(w, d, C, `${lab}, a row the file's out list holds and one listed under the tag`);
    const u = o.find(r => r.pid === dd);
    chk(!o.some(r => r.pid === a) && !w.eloMismatches().some(v => v.pid === a) && !!u && !u.tag && /^The matchup /.test(u.title) && w.eloMismatches().some(v => v.pid === dd && !v.tag),
      `${lab}: a player the build counts out is on the Mismatches, or a row under the tag is not listed untagged`); }
  /* the file's tag null (every block's tag left as it was): no row tagged anywhere, the rows as before */
  { const C = JSON.parse(JSON.stringify(base)); plantRow(C, elig[0], 0.4, true); C.avg_fit.mismatch.tag = null;
    const { w, d } = page(C); await wait(60); const o = await holdV2(w, d, C, `${lab}, the file's tag null`);
    const more = d.getElementById('peMmMore'); if (more) { more.click(); await wait(20); }
    chk(o.length > 0 && !o.some(r => r.tag) && !w.eloMismatches().some(v => v.tag) && !d.querySelector('#peMism .pe-mmtag, #peMmModal .pe-mmtag') && !/Mismatch this week/.test(allText(d.body)),
      `${lab}: with the file's tag null a row is still tagged: ${[...d.querySelectorAll('.pe-mmtag')].map(txt).join(', ')}`); }
  /* a lead leg the file does not trust (the tight end's, in this copy), and one its lead does not name: no row on it */
  for (const [how, cut] of [['untrusted', C => { C.avg_fit.legs['TE|receiving_yards'].trusted = false; }], ['not in the lead', C => { delete C.avg_fit.mismatch.lead.TE; }]]) {
    const C = JSON.parse(JSON.stringify(base)), te = Object.keys(C.avg).find(pid => C.avg[pid].group === 'TE' && C.avg[pid].stats && C.avg[pid].stats.receiving_yards);
    if (!te || !C.avg_fit.legs['TE|receiving_yards']) { notes.push(`${lab}: no tight end on receiving yards: the ${how} lead leg fixture is skipped`); continue; }
    plantRow(C, te, 0.5, true); cut(C);
    const { w, d } = page(C); await wait(60); const o = await holdV2(w, d, C, `${lab}, the tight end's lead leg ${how}`);
    chk(!o.some(r => r.group === 'TE') && !w.eloMismatches().some(v => v.group === 'TE'), `${lab}: a tight end is on the Mismatches with his lead leg ${how}`); }
  /* (the review of 4 November 2026) a size that rounds to nothing, drawn unsigned as the page shows every figure of 0: three
     rows alone in a copy (every other block's score taken out), one tagged, one under the tag and one of 0.4 points, each a
     bubble on the card, the last "0 pts" in its score and its title */
  { const C = JSON.parse(JSON.stringify(base)), [a, b, c] = elig; for (const v of Object.values(C.avg)) delete v.mm;
    for (const pid of [a, b, c]) if (C.out) delete C.out[pid];
    plantRow(C, a, 0.3, true); plantRow(C, b, 0.012, false); plantRow(C, c, 0.004, false);
    const { w, d } = page(C); await wait(60); const o = await holdV2(w, d, C, `${lab}, a row whose size rounds to nothing`);
    const z = o.find(r => r.pid === c), bz = d.querySelector(`#peMism .pe-mm-b[data-mm-pid="${c}"]`), sc = bz && bz.querySelector('.pe-mm-score');
    chk(o.length === 3 && !!z && z.pts === '0 pts' && / that is 0 pts on the over\.$/.test(z.title) && !!sc && txt(sc) === '0 pts' && sc.title === z.title && !/\+0 pts/.test(allText(d.getElementById('peMism'))),
      `${lab}: a row whose size rounds to nothing is not drawn "0 pts", unsigned: ${sc ? `"${txt(sc)}" ("${sc.title}")` : 'no bubble'}`); }
  /* (app v142) the Mismatch tag on Suggested Parlays' cards, on a file with the score: three rows of the check's own
     planting, a's tagged and b's listed under the tag in one game, c's tagged in another (spTagHeld, below) */
  { const C = JSON.parse(JSON.stringify(base)), [a, b, c] = elig, g0 = C.avg[a].game_id;
    const g1 = Object.values(C.avg).map(v => v.game_id).find(x => x && x !== g0);
    for (const pid of [a, b, c]) if (C.out) delete C.out[pid];
    plantRow(C, a, 0.3, true); plantRow(C, b, 0.02, false); plantRow(C, c, 0.25, true);
    C.avg[b].game_id = g0; if (g1) C.avg[c].game_id = g1;
    const rowsOf = w => mmOwnV2(C, M, { inactive: w.eval('S').inactive, kicked: gid => kickedC(w, gid) })
      .map(r => ({ ...r, text: 'Mismatch', n: String(Math.round(100 * r.shift)), grade: null }));
    await spTagHeld(C, `${lab}, Suggested Parlays' cards`, rowsOf, { a, b, c, g0, stat: MM_LEAD_C[C.avg[a].group], team: C.avg[a].team, name: pid => (P.players[pid] || {}).name || pid }); }
}
/* ---- (app v142) the Mismatch tag on Suggested Parlays' cards ----
   The owner's call of 5 November 2026: "instead of having the ELO picks in suggested parlays, i suggest we scrap that. and
   then if a player has a big mismatch on the positive side, we give them a mismatch button to go next to their name in
   the normal suggested parlays". The tab puts it on after each draw of Suggested Parlays (spMmDecorate, wrapping
   renderSp). The check's own reading (the page's mmFavours, mmByPlayer and spMmDecorate are never read): a leg wears
   exactly one tag, his first tagged row's, where it is a player's leg (never a moneyline, spread or game total, whose side
   is over too), the row is in the leg's own game and the leg bets his way (favoursC: his over, his anytime touchdown
   being side over, never an under on him nor more of his interceptions), right after his name: the hub's name button
   (glance-name) where it names him, his name's text where there is none, and none where the button names another
   player. Its words the row's (rows: the check's own list, each {pid, gid, tag, text, n, grade, title}): "Mismatch", the
   points and the row's title with no grade on a file with the score; "<Grade> mismatch", its grade and its edge on one
   from before */
const GAME_C = new Set(['ml', 'ats', 'total']);
const favoursC = l => !!l && !GAME_C.has(l.stat) && l.side === 'over' && l.stat !== 'passing_interceptions';
const wearC = (rows, l) => { if (!favoursC(l) || (l.btn && l.btn !== l.pid)) return null;
  const r = rows.find(x => x.pid === l.pid && x.tag) || null; return r && String(r.gid) === String(l.gid) ? r : null; };
/* the stand-in unit: window.spUnit and spShown stood in (a live unit, its levels the fixture's), its model cards in
   #spPanel as pbTierCard draws them (each leg's name, or the hub's name button, then its label in a small, then its price),
   an empty level beside them */
function spStand(w, d, tiers, name) {
  w.spUnit = id => (id === 'U1' ? { id, slot: false } : null); w.spShown = () => ({ phase: 'live', lock: null, tiers });
  const panel = d.getElementById('spPanel') || d.body.appendChild(Object.assign(d.createElement('div'), { id: 'spPanel' }));
  const li = l => `<li><span class="nm">${l.btn ? `<button type="button" class="glance-name" data-glance="p:${escC(l.btn)}" data-glance-game="${escC(l.gid)}">${escC(name(l))}</button>` : escC(name(l))}<small>${escC(l.label)}</small></span><span class="pr">+100</span></li>`;
  panel.innerHTML = `<div id="spSets"><section class="sp-sec" data-sp-sec="night"><h3 class="sp-sech">Night games</h3><div class="sp-game" data-sp-game="U1"><div class="sp-hd"><b>Fixture game</b></div><p class="sp-lock" data-sp-phase="live">Locks Thu 6:15 PM ET.</p><div class="pb-tiers" data-sp-kind="model">${tiers.map(t => Array.isArray(t.legs)
    ? `<div class="pb-tier ${t.id}" data-pb-tier="${t.id}"><div class="pb-th"><span class="pb-tn">${t.label}</span></div><ul class="pb-legs">${t.legs.map(li).join('')}</ul></div>`
    : `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${t.label}</span></div><p class="pb-why">${escC(t.why)}</p></div>`).join('')}</div></div></section></div>`;
  return panel;
}
/* the stand-in's legs held to wearC: every leg's tags, the tag's place, words and style, and the side rule
   (window.mmFavours, the check's own on every leg); returns the problems */
function tagsOff(w, panel, tiers, rows) {
  const legs = tiers.filter(t => Array.isArray(t.legs)).flatMap(t => t.legs), lis = [...panel.querySelectorAll('.pb-tiers[data-sp-kind="model"] .pb-legs > li')], bad = [];
  if (lis.length !== legs.length) bad.push(`${lis.length} legs drawn for ${legs.length}`);
  lis.forEach((li, i) => { const l = legs[i], r = wearC(rows, l), t = [...li.querySelectorAll('.pe-mmtag')], nm = li.querySelector('.nm'), what = `${l.pid} ${l.side} ${l.stat}${l.btn ? ` (name button p:${l.btn})` : ''}`;
    if (!r) { if (t.length) bad.push(`${what} wears "${txt(t[0])}"`); return; }
    const name = l.btn ? nm && nm.querySelector(':scope > button.glance-name') : nm && [...nm.childNodes].find(x => x.nodeType === 3 && x.textContent.trim());
    const ws = t[0] ? (w.getComputedStyle(t[0]).getPropertyValue('white-space') || '').trim() : '';
    if (!(t.length === 1 && !!name && t[0].previousSibling === name && txt(t[0]) === r.text && t[0].dataset.peMmtag === r.n && (r.grade ? t[0].dataset.peMmgrade === r.grade : !t[0].hasAttribute('data-pe-mmgrade'))
      && t[0].title === r.title && ws === 'nowrap'))
      bad.push(`${what}: ${t.map(x => `"${txt(x)}" ${x.dataset.peMmtag}${x.dataset.peMmgrade ? ' ' + x.dataset.peMmgrade : ''} "${x.title}" after ${x.previousSibling ? (x.previousSibling.nodeType === 3 ? 'text' : x.previousSibling.tagName) : 'nothing'}, white-space ${ws}`).join(', ') || 'no tag'}, not "${r.text}" ${r.n} after his name`); });
  const side = legs.filter(l => { let v; try { v = typeof w.mmFavours === 'function' ? !!w.mmFavours(l) : 'none'; } catch (err) { v = 'threw'; } return v !== favoursC(l); });
  if (side.length) bad.push(`window.mmFavours is not the side rule on ${side.map(l => `${l.pid} ${l.side} ${l.stat}`).join(', ')}`);
  return bad;
}
/* on a file C with three rows the fixture planted (o.a's tagged and o.b's listed untagged in game o.g0, o.c's tagged in
   another game; rowsOf(w), the check's own list on the page's clock and inactive list): a unit of four levels, Safe a's
   over and b's over, Medium a's under, c's over in a's game and a's anytime touchdown, Aggressive more of a's
   interceptions, his club's moneyline, the game's total, a's over named by a name button of his own and his receptions
   named by b's button, Extreme empty; drawn twice, one tag a leg; then with the matchups still being read (held) no tag
   and nothing thrown or logged, and the tab's own redraw once they answer (the hub's boot draws the Parlay Builder again,
   renderPb, standing for it here) carrying exactly the tags, drawn once more still once */
async function spTagHeld(C, lab, rowsOf, o) {
  const { a, b, c, g0, stat, team } = o, leg = (pid, st, side, x) => ({ pid, gid: g0, stat: st, side, label: `${side} ${st}`, ...(x || {}) });
  const tiers = [
    { id: 'safe', label: 'Safe', legs: [leg(a, stat, 'over'), leg(b, stat, 'over')] },
    { id: 'med', label: 'Medium', legs: [leg(a, stat, 'under'), leg(c, stat, 'over'), leg(a, 'any_td', 'over')] },
    { id: 'aggr', label: 'Aggressive', legs: [leg(a, 'passing_interceptions', 'over'), leg('team:' + team, 'ml', 'over', { name: team }), leg('game', 'total', 'over', { name: 'Total' }),
      leg(a, stat, 'over', { btn: a }), leg(a, 'receptions', 'over', { btn: b })] },
    { id: 'xtrm', label: 'Extreme', why: 'Only 4 legs in this game.' }];
  const name = l => l.name || o.name(l.pid);
  { const errors = [], { w, d } = page(C, { sp: true, errors }); await wait(60);
    const rows = rowsOf(w), panel = spStand(w, d, tiers, name);
    const cases = [!!wearC(rows, tiers[0].legs[0]), rows.some(r => r.pid === b && !r.tag) && !rows.some(r => r.pid === b && r.tag), rows.some(r => r.pid === c && r.tag && String(r.gid) !== String(g0))];
    let thrown = ''; try { w.renderSp(); w.renderSp(); } catch (err) { thrown = err.message; }
    /* three legs wear it: a's over, a's touchdown and a's over under his own name button */
    const bad = tagsOff(w, panel, tiers, rows), n = panel.querySelectorAll('.pe-mmtag').length, want = tiers.flatMap(t => t.legs || []).filter(l => wearC(rows, l)).length;
    chk(!thrown && cases.every(Boolean) && !bad.length && n === want && want === 3 && !errors.length,
      `${lab}: a leg does not wear its player's Mismatch tag exactly where his row is tagged, in his own game and on a leg that bets his way, after his name, once: ${thrown ? 'threw ' + thrown : bad.join(' | ') || (cases.every(Boolean) ? `${n} tags, the rule's ${want}, the fixture's 3` : 'the fixture lacks a case: ' + cases.join(', '))}${errors.length ? '; errors: ' + errors.slice(0, 2).join('; ') : ''}`);
    notes.push(`${lab}: ${n} tags on ${tiers.reduce((x, t) => x + (t.legs ? t.legs.length : 0), 0)} legs`); }
  { let release = null; const hold = new Promise(r => { release = r; }), errors = [], { w, d } = page(C, { sp: true, errors, hold: { 'matchups.json': hold } });
    w.renderPb = () => w.renderSp();
    const panel = spStand(w, d, tiers, name); await wait(60);
    let thrown = ''; try { w.renderSp(); } catch (err) { thrown = err.message; }
    const before = panel.querySelectorAll('.pe-mmtag').length, rated = typeof w.eloLoaded === 'function' && w.eloLoaded() === true;
    release(); await wait(60);
    const rows = rowsOf(w), bad = tagsOff(w, panel, tiers, rows);
    try { w.renderSp(); } catch (err) { thrown = thrown || err.message; }
    const again = tagsOff(w, panel, tiers, rows);
    chk(!thrown && rated && before === 0 && !bad.length && !again.length && !errors.length,
      `${lab}, the matchups still being read: ${thrown ? 'threw ' + thrown : !rated ? 'the ratings were not in' : before ? `${before} tags drawn before the matchups answered` : (bad.length ? 'once they answered: ' + bad.join(' | ') : again.length ? 'drawn once more: ' + again.join(' | ') : '')}${errors.length ? '; errors: ' + errors.slice(0, 2).join('; ') : ''}`); }
}
/* the same on a file from before the score (the old Mismatches' rows, graded): a tagged row's player (a), one listed and
   graded Slight (b) moved into a's game, and another tagged row (c) in another game (moved there if it is in a's) */
async function oldSpTag(MUo, lab) {
  if (!MUo || !MUo.players || !Object.keys(MUo.players).length) { notes.push(`${lab}: no projections: the old tag on Suggested Parlays' cards is not held`); return; }
  const ctx = { inactive: {}, kicked: () => false }, rows0 = oldTagRowsC(MUo, ctx), tg = rows0.filter(r => r.tag), sl = rows0.filter(r => !r.tag);
  if (tg.length < 2 || !sl.length) { notes.push(`${lab}: ${tg.length} old rows graded Solid or better and ${sl.length} Slight: the old tag on Suggested Parlays' cards is not held`); return; }
  const C = JSON.parse(JSON.stringify(MUo)), A = tg[0], B = sl[0], Cc = tg.find(r => r.pid !== A.pid && String(r.gid) !== String(A.gid)) || tg.find(r => r.pid !== A.pid);
  const g1 = [...new Set(Object.values(C.players).map(v => v.game_id))].find(x => x && String(x) !== String(A.gid));
  C.players[B.pid].game_id = A.gid; if (String(Cc.gid) === String(A.gid) && g1) C.players[Cc.pid].game_id = g1;
  const LEAD = { QB: 'passing_yards', RB: 'rushing_yards', WR: 'receiving_yards', TE: 'receiving_yards' };
  const rowsOf = w => oldTagRowsC(C, { inactive: w.eval('S').inactive, kicked: gid => kickedC(w, gid) });
  await spTagHeld(C, `${lab}, Suggested Parlays' cards`, rowsOf, { a: A.pid, b: B.pid, c: Cc.pid, g0: A.gid, stat: LEAD[A.group], team: C.players[A.pid].team, name: pid => (P.players[pid] || {}).name || pid });
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
     at 1500; and he is still priced by nothing */
  { const past = Object.entries(P.past || {}).find(([, v]) => (v.h || []).length);
    if (!past) notes.push('nobody kept out of the players map has a game this season: the past-ratings check is skipped');
    else { const [pid, v] = past, { w } = page(MU0); await wait(60);
      chk(w.eloOf(pid) === null, `${pid} is out but the page would price him`);
      chk(w.eloPre(pid, v.h[0][0]) === v.s0 && w.eloPre(pid, v.h[0][0] + 1) === v.h[0][1],
        `the Prop Record would not grade ${pid}'s past weeks on the rating he took into them: ${w.eloPre(pid, v.h[0][0] + 1)} for ${v.h[0][1]}`); } }

  /* ---- Mismatches ----
     (4 November 2026) On a matchups file carrying the score (avg_fit.mismatch: THE MISMATCH SCORE in elo/build.py) the
     Mismatches are its rows, held by holdV2 and the fixtures of v2Mm above; on a file from before it the old ones, held
     here as they were (kicked-off games leave, the bubbles wear the season shield, their words the matchup formula's
     units). Whatever the week's files are, both are held: the score on the files where they carry it, else on them with
     the score planted by the check's own reading (plantMmC); the old Mismatches on the files where they are from before
     it, else on them with the score taken out (stripMmC), so the page's fallback is held at any hour */
  async function oldMm(MUo, lab) {
  if (!MUo || !MUo.players || !Object.keys(MUo.players).length) notes.push('no projections in this week\'s file: the Mismatches checks are skipped');
  else {
    const { w, d, games } = page(MUo); await wait(60);
    const before = w.eloMismatches();
    /* the rows the check's own reading of the old rule lists, in its order (a fallback that drew none, or other rows, fails here) */
    { const own = oldListC(MUo, { inactive: w.eval('S').inactive, kicked: gid => kickedC(w, gid) });
      chk(before.map(v => v.pid).join() === own.map(v => v.pid).join() && before.every(v => !v.v2 && Math.abs(v.score - own.find(x => x.pid === v.pid).score) < 1e-9),
        `${lab}: the old Mismatches are not the check's own reading of the old rule: ${before.slice(0, 5).map(v => v.pid + (v.v2 ? ' (score)' : '')).join(', ')} against ${own.slice(0, 5).map(v => v.pid).join(', ')} (${before.length} and ${own.length})`); }
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
      const rep = Object.values(MUo.reports || {}).filter(r => r.week === +MUo.week);
      const unfiled = rep.filter(r => !r.statuses_filed).length;
      chk(!unfiled || txt(d.getElementById('peMism')).includes(`Statuses filed: ${rep.length - unfiled} of ${rep.length} clubs.`),
        'the Mismatches card does not say the game statuses are not all filed');
      chk(txt(d.querySelector('#peMism h2 small')) === `week ${MUo.week}` && !eloGone(d.getElementById('peMism')),
        `the Mismatches card's title is not "week ${MUo.week}" alone, or the card explains: "${txt(d.querySelector('#peMism h2 small'))}" ${eloGone(d.getElementById('peMism'))}`);
      { const MUf = JSON.parse(JSON.stringify(MUo)); MUf.reports = { AAA: { week: +MUo.week, statuses_filed: true }, BBB: { week: +MUo.week, statuses_filed: false } };
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
        const defs = {}; for (const v of Object.values(MUo.players)) if (v.opp_def) defs[v.opp] = v.opp_def; Object.assign(defs, (MUo.league && MUo.league.defs) || {});
        const bad = bubbles.map(b => { const v = MUo.players[b.dataset.mmPid], u = v && UN[v.group], avg = x => u.reduce((a, k) => a + x[k], 0) / u.length;
          if (!u || !defs[v.opp]) return `${b.dataset.mmPid}: no unit to rank`;
          const key = x => Math.round(avg(x) * 100);
          const want = `vs the ${v.opp} ${AG[v.group]}, ${ord(1 + Object.keys(defs).filter(t => key(defs[t]) > key(defs[v.opp])).length)} by player Elo.`, sub = txt(b.querySelector('.pe-mm-sub'));
          return sub.startsWith(want) ? '' : `${b.dataset.mmPid}: "${sub.slice(0, 90)}", not "${want}"`; }).filter(Boolean);
        const old = /\b(?:pass|run) defense ranked\b|\bvs an? (?:pass|run) defense\b/.exec(txt(d.getElementById('peMism')));
        chk(!bad.length && !old, 'a Mismatches bubble does not word its rank as the matchup formula\'s units, or says a pass or run defense ranked: ' + (bad.slice(0, 2).join(' | ') || (old && old[0]))); }
      /* (the review of 29 October 2026) each row's projection is his lead stat's as a builder row's Elo lean reads it (the
         Elo-adjusted average where the file carries it, else the formula's), and its Elo part ("+3.3 from the matchup")
         only on a trusted leg, as everywhere else on the page (nudgeOwn: a QB's passing yards untrusted on the
         averages); each bubble says exactly that */
      { const LEAD = { QB: 'passing_yards', RB: 'rushing_yards', WR: 'receiving_yards', TE: 'receiving_yards' }, LB = { passing_yards: 'pass yds', rushing_yards: 'rush yds', receiving_yards: 'rec yds' };
        const want = v => { const st = LEAD[v.group], e = entryOwn(MUo, v.pid), p = e && e.stats ? projOwn(e.stats[st]) : NaN, m = isFinite(p) ? nudgeOwn(MUo, v.pid, st) : null;
          return { proj: isFinite(p) ? p : null, nudge: m && isFinite(m.n) ? m.n : null, say: isFinite(p) ? `${Math.round(p)} ${LB[st]} projected${m && m.n ? ` (${m.n >= 0 ? '+' : '−'}${Math.abs(m.n).toFixed(1)} from the matchup)` : ''}.` : '' }; };
        const badR = before.map(v => { const x = want(v); return (v.proj === x.proj && v.nudge === x.nudge) ? '' : `${v.pid} ${v.group}: ${v.proj} (${v.nudge}), the rule ${x.proj} (${x.nudge})`; }).filter(Boolean);
        const badB = bubbles.map(b => { const v = before.find(x => x.pid === b.dataset.mmPid && x.game_id === b.dataset.mmGame), sub = txt(b.querySelector('.pe-mm-sub'));
          if (!v) return `${b.dataset.mmPid}: no row`; const x = want(v); return (x.say ? sub.endsWith(x.say) : !/projected/.test(sub)) ? '' : `${v.pid}: "${sub}", want it to end "${x.say}"`; }).filter(Boolean);
        const untr = before.filter(v => { const x = want(v); return x.proj !== null && x.nudge === null; }).length;
        chk(!badR.length && !badB.length, `the Mismatches' projection is not the lead stat's a builder row's Elo lean reads, with its Elo part on a trusted leg alone: ${badR.slice(0, 2).join('; ')}${badB.length ? ' | ' + badB.slice(0, 2).join('; ') : ''}`);
        notes.push(`the Mismatches: ${before.length} rows, ${untr} with no Elo part shown (untrusted)`); }
      /* clubs level on a unit share its rank (22 October 2026, the owner's call: "make clubs tied on a defense unit share
         the same rank in the mismatches, player window, and game snapshot"), level read to the hundredth (the file writes
         a unit to the tenth, and a mix of two averages them): on a copy of the file with another club's secondary set a
         floating-point hair above the first receiver's or tight end's opponent's, the page gives that opponent this
         check's own rank to the hundredth, where an exact reading would put the other club above it; and a receiver or
         tight end facing the other club, where there is one, the same rank */
      { const v0 = before.filter(x => x.group === 'WR' || x.group === 'TE').sort((x, y) => x.zd - y.zd)[0], defs0 = MUo.league && MUo.league.defs;
        if (!v0 || !defs0 || !defs0[v0.opp]) notes.push('no receiver or tight end on the Mismatches against a club of the league table: the tied-unit case is skipped');
        else {
          const MU7 = JSON.parse(JSON.stringify(MUo)), D7 = MU7.league.defs, X = v0.opp, Y = Object.keys(D7).find(t => t !== X && Math.abs(D7[t].DB - D7[X].DB) > 0.05);
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
      /* (his projections in that game, the Elo-adjusted averages' where the file carries them) */
      const grp = ['QB', 'RB', 'WR', 'TE'].find(g => P.groups[g].top.some(r => (entryOwn(MUo, r.id) || {}).game_id === g0));
      if (grp) {
        const r = P.groups[grp].top.find(x => (entryOwn(MUo, x.id) || {}).game_id === g0);
        [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === grp).click(); await wait(20);
        const more = d.getElementById('peMore'); if (r.rank > 10 && more) { more.click(); await wait(20); }
        const tr = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === r.id);
        if (tr) { tr.click(); await wait(20);
          chk(txt(d.querySelector('#pePlView .pe-begun')) === 'This game has kicked off.' && !d.querySelector('#pePlView .pe-note') && !eloGone(d.getElementById('pePlView')),
            `${r.name}'s window does not say "This game has kicked off." alone, or explains its stats: ${txt(d.querySelector('#pePlView .pe-begun'))} ${eloGone(d.getElementById('pePlView'))}`);
          const cl = d.getElementById('pePlClose'); if (cl) { cl.click(); await wait(10); } }
      } else notes.push('no ranked player in the first game with a mismatch: the window\'s kicked-off note is not checked');
      /* every game over: no card at all */
      w.__clock.now = 1e12; w.renderSlate(); await wait(20);
      chk(!w.eloMismatches().length && !d.getElementById('peMism'), 'with every game kicked off the Mismatches card still shows');
    }
  }

  }
  { const on2 = !!MU0 && mmOnC(MU0), MUold = on2 ? stripMmC(MU0) : MU0, MUv2 = on2 ? MU0 : plantMmC(MU0);
    await oldMm(MUold, on2 ? 'a file from before the score' : 'the real files');
    await oldSpTag(MUold, on2 ? 'a file from before the score' : 'the real files');
    if (on2) notes.push('the old Mismatches held on the files with the score taken out (a file from before it)');
    if (MUv2) await v2Mm(MUv2, on2 ? 'the real files' : 'the files with the score planted');
    else notes.push('no Elo-adjusted averages in this week\'s file: the Mismatches on the score are not held'); }

  /* ---- a player the build counts out is ruled out on the page, with the reason ---- */
  if (MU0) {
    const MU = JSON.parse(JSON.stringify(MU0));
    /* the top-ranked receiver with a projection is made "out last week, not practising" in a copy */
    const top = P.groups.WR.top.find(r => entryOwn(MU, r.id)) || P.groups.WR.top[0];
    MU.out = Object.assign({}, MU.out, { [top.id]: 'out (hamstring) in week 4, not practising for week 5: counted out' });
    /* two more of the ten receivers shown: one the page's own inactive list rules out, one taken out of this copy of
       the matchups (no matchup this week) */
    const ten = P.groups.WR.top.slice(0, 10).filter(r => r.id !== top.id && entryOwn(MU, r.id) && !(MU.out || {})[r.id]);
    const inact = ten[0], gone = ten[1];
    /* (no projection of his in either map: the Elo-adjusted averages' and the matchup formula's) */
    if (gone) { if (MU.players) delete MU.players[gone.id]; if (MU.avg) delete MU.avg[gone.id]; }
    const { w, d } = page(MU); await wait(60);
    chk(w.eloRuledOut(top.id) === true, 'a player the build counts out is not ruled out on the page');
    chk(!w.eloMismatches().some(v => v.pid === top.id), 'a player the build counts out is still on the Mismatches');
    [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'WR').click(); await wait(20);
    const row = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(tr => tr.dataset.pePl === top.id);
    if (row) { row.click(); await wait(20);
      chk(txt(d.querySelector('#pePlView .pe-sub')) === `Not expected to play: ${MU.out[top.id]}.`, 'his window does not give the build\'s reason, in a few words: ' + txt(d.getElementById('pePlView')).slice(0, 160));
      { const cl = d.getElementById('pePlClose'); if (cl) { cl.click(); await wait(10); } } }
    const say = async (r, want, what) => { const tr = r && [...d.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === r.id);
      if (!tr) { notes.push(`no receiver shown to check the window's "${what}" line on`); return; }
      tr.click(); await wait(20);
      chk(txt(d.querySelector('#pePlView .pe-sub')) === want && !eloGone(d.getElementById('pePlView')), `${r.name}'s window does not say "${want}" alone: ` + txt(d.getElementById('pePlView')).slice(0, 200));
      { const cl = d.getElementById('pePlClose'); if (cl) { cl.click(); await wait(10); } } };
    if (inact) { w.eval('S').inactive[inact.id] = { week: +MU.week, status: 'Out' }; await say(inact, `Ruled out for week ${MU.week}.`, 'ruled out'); delete w.eval('S').inactive[inact.id]; }
    await say(gone, `No matchup for week ${MU.week}.`, 'no matchup');
  }

  /* ---- (29 October 2026) a player's window: the Elo-adjusted average's breakdown ----
     On a file carrying the block, a receiver's window (the first of the ten shown with a projection in it, not ruled out)
     and a kicker's (the kickers have legs since the block) draw a row a leg of the position, in the file's order: the
     stat, his average, his projection with no Elo terms (Base), the table he faces in a few words with its Elo and rank
     ("Pass D 1448 (#23)"), the Elo part's split (the defence's multiplier and his Elo's, given his average: since the
     review of 29 October 2026, Base times the two being the projection), the projection and its Elo part, faded where
     the leg is not trusted, each figure the
     check's own reading of the file (his average and projection a tenth, or whole from 10, a touchdown's a hundredth; a
     multiplier a hundredth; the Elo part as the leans say it); and on the same files with the block taken out (a file from
     before it) the receiver's window the matchup formula's recent form, nudge and projection as before.
     (4 November 2026) THE INPUTS (elo/build.py, the owner's "Merge the inputs"): where the position's legs read them (an
     in: term in avg_fit.legs), a column for each kind they read, before Base, in the order ×Vol, ×Game, ×Q (inKindsC, the
     check's own reading of which term is which kind), each cell the leg's in_x of that kind to a hundredth or a dash where
     it has none, led by Typical, the twin at a typical starter's inputs (no_elo over the leg's multipliers, typC; since
     the review of 4 November 2026, when in_x moved onto the twin's own coefficients, so Typical × the multipliers is
     Base), Base titled "Typical × his inputs", ×Elo his Elo given his average and his inputs, and Proj still "Base × Def ×
     Elo" (the twin reads the same inputs, so the projection is still Base times the two: the file's arithmetic is held
     below, `split`); and under the table one
     line of what the inputs read for him (avg[pid].in), only the parts his position's legs read, word for word on the
     check's own reading (inLineC). Held on every position's window on the files as they stand, on a fixture of the
     check's own (every part of the line and every way a cell is a dash, planted on a copy at any hour and in the
     off-season, twice), and on the files with the inputs taken out (the window as before the inputs, no line) */
  if (avgOn(MU0)) {
    const numOwn = (x, st) => st === 'any_td' ? x.toFixed(2) : Math.abs(x) >= 10 ? x.toFixed(0) : x.toFixed(1);
    const LBL = { passing_yards: 'Pass yds', passing_tds: 'Pass TD', attempts: 'Att', completions: 'Comp', passing_interceptions: 'INT',
      rushing_yards: 'Rush yds', carries: 'Carries', receptions: 'Rec', receiving_yards: 'Rec yds', scrim_yards: 'Rush+rec', any_td: 'TDs', fg_made: 'FG made', kick_pts: 'Kick pts' };
    /* the window of one player on one boot, held to the file it was booted on: [] or what is wrong */
    const winBad = async (MU, w, d, g, r) => {
      const legsOf = gg => Object.keys(MU.avg_fit.legs).filter(k => k.split('|')[0] === gg).map(k => k.split('|')[1]);
      [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === g).click(); await wait(20);
      const tr = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === r.id); if (!tr) return [`${r.name} is not drawn in the ${g} rankings to open`];
      tr.click(); await wait(20);
      const v = MU.avg[r.id], view = d.getElementById('pePlView'), ths = [...view.querySelectorAll('thead th')], head = ths.map(txt).join('|'), rows = [...view.querySelectorAll('tbody tr')], want = legsOf(g).filter(st => v.stats[st]), bad = [];
      const kinds = inKindsC(MU, g), HEAD = ['Stat', 'Avg', ...(kinds.length ? ['Typical', ...kinds.map(k => IN_COL_C[k])] : []), 'Base', 'Vs', '×Def', '×Elo', 'Proj', 'Elo'].join('|');
      if (head !== HEAD) bad.push(`its columns are ${head}, not ${HEAD}`);
      else { const ti = k => (ths[HEAD.split('|').indexOf(k)] || { getAttribute: () => null }).getAttribute('title');
        const wantT = { Base: kinds.length ? 'His projection with no Elo terms: Typical × his inputs' : 'His projection with no Elo terms', Proj: 'Base × Def × Elo', Elo: 'The Elo part: Proj less Base',
          '×Elo': kinds.length ? 'His Elo, given his average and his inputs' : 'His Elo, given his average', ...(kinds.length ? { Typical: TYP_TITLE_C } : {}) };
        for (const [k, t] of Object.entries(wantT)) if (ti(k) !== t) bad.push(`its ${k} column is titled "${ti(k)}", not "${t}"`);
        for (const k of kinds) if (ti(IN_COL_C[k]) !== IN_TITLE_C[k]) bad.push(`its ${IN_COL_C[k]} column is titled "${ti(IN_COL_C[k])}", not "${IN_TITLE_C[k]}"`); }
      if (rows.map(x => x.dataset.peStat).join() !== want.join()) bad.push(`its rows are ${rows.map(x => x.dataset.peStat).join()}, not ${want.join()}`);
      else rows.forEach((x, i) => { const st = want[i], a = v.stats[st], q = a.vs, f = MU.avg_fit.legs[g + '|' + st], c = [...x.querySelectorAll('td')].map(txt);
        const exp = [LBL[st] || st, numOwn(a.avg, st), ...(kinds.length ? [isNumC(typC(a)) ? numOwn(typC(a), st) : '–', ...kinds.map(k => inxC(a, k))] : []), numOwn(a.no_elo, st), q && VS_SHORT_OWN[q.table] ? `${VS_SHORT_OWN[q.table]} ${q.elo} (#${q.rank})` : '–', mulOwn(a.def_x), mulOwn(a.elo_x), numOwn(a.proj, st), leanOwn(a.elo, st)];
        if (c.join('|') !== exp.join('|') || x.classList.contains('pe-weak') === !!(f && f.trusted === true)) bad.push(`${st}: ${c.join(' | ')}${x.classList.contains('pe-weak') ? ' (faded)' : ''}, not ${exp.join(' | ')}${f && f.trusted === true ? '' : ' (faded)'}`); });
      const line = inLineC(MU, v, g), el = view.querySelectorAll('[data-pe-in]:not(span)'), got = el.length === 1 ? txt(el[0]) : null;
      if (line.text ? (el.length !== 1 || got !== line.text || [...el[0].querySelectorAll('span[data-pe-in]')].map(x => x.dataset.peIn).join() !== line.keys.join()) : el.length)
        bad.push(`its inputs' line is ${el.length > 1 ? el.length + ' lines' : JSON.stringify(got)}${el.length === 1 ? ` (${[...el[0].querySelectorAll('span[data-pe-in]')].map(x => x.dataset.peIn).join()})` : ''}, not ${JSON.stringify(line.text || null)} (${line.keys.join()})`);
      else if (line.text && el[0].previousElementSibling !== view.querySelector('table.pe-t')) bad.push('its inputs\' line is not under the table');
      if (!txt(view.querySelector('h3')).includes(v.opp)) bad.push(`it does not name his opponent, ${v.opp}`);
      if (eloGone(view)) bad.push(eloGone(view));
      { const cl = d.getElementById('pePlClose'); if (cl) { cl.click(); await wait(10); } }
      return bad; };
    const pickOn = (MU, w, g) => P.groups[g] && (P.groups[g].top || []).slice(0, 10).find(x => MU.avg[x.id] && !w.eloRuledOut(x.id) && !on(w, MU.avg[x.id].game_id));
    /* the files as they stand: every position's window that has a player to open */
    { const { w, d } = page(MU0); await wait(60); let n = 0;
      for (const [g, lab] of [['WR', 'receiver'], ['K', 'kicker'], ['RB', 'back'], ['QB', 'quarterback'], ['TE', 'tight end']]) {
        if (!Object.keys(MU0.avg_fit.legs).some(k => k.split('|')[0] === g)) continue;
        const r = pickOn(MU0, w, g); if (!r) { notes.push(`no ${lab} shown with an Elo-adjusted average this week: his window's breakdown is not checked`); continue; }
        const bad = await winBad(MU0, w, d, g, r); n++;
        chk(!bad.length, `${r.name}'s window does not draw the Elo-adjusted average's breakdown, a row a leg${inKindsC(MU0, g).length ? ' with his inputs' : ''}: ${bad.slice(0, 3).join('; ')}`); }
      notes.push(`a player's window on the files: ${n} positions held, ${['WR', 'RB', 'QB', 'TE', 'K'].filter(g => inKindsC(MU0, g).length).length ? 'the inputs read on ' + ['WR', 'RB', 'QB', 'TE', 'K'].filter(g => inKindsC(MU0, g).length).map(g => g + ' ' + inKindsC(MU0, g).join('+')).join(', ') : 'no position reading the inputs'}`); }
    /* the check's own fixture: a copy whose legs read the inputs IN_FIX_C says (and nothing else), a planted starter of
       each position (the first ranked) on a made-up game the stub's clock has not reached, with his legs' in_x and his
       inputs planted, twice: every part of the line, a spread either way and level, a wind read, under a roof and with no
       forecast, a snap share with no last appearance, a part whose value is missing, a tight end with no inputs at all
       (the columns, no line), a cell with no in_x, one without the kind and one whose value is null (each a dash) */
    for (const [bi, IN_SET] of IN_FIX_SETS_C.entries()) {
      const MUi = inFixC(MU0, IN_SET), { w, d } = page(MUi); await wait(60); let n = 0;
      for (const g of ['WR', 'RB', 'QB', 'TE', 'K']) { const r = MUi.__fix[g]; if (!r) { chk(false, `the inputs' fixture has no ranked ${g} to plant`); continue; }
        const bad = await winBad(MUi, w, d, g, r); n++;
        chk(!bad.length, `on the inputs' fixture (boot ${bi + 1}), ${r.name}'s window (${g}) does not draw his inputs as planted: ${bad.slice(0, 3).join('; ')}`); }
      const lines = Object.values(MUi.__fix).map(r => inLineC(MUi, MUi.avg[r.id], MUi.avg[r.id].group).text).filter(Boolean);
      notes.push(`the inputs' fixture, boot ${bi + 1}: ${n} windows; lines ${lines.map(x => JSON.stringify(x)).join(', ')}`); }
    /* the files with the inputs taken out (every in: term, in_x and in): the window as before the inputs, no line */
    { const MUo = JSON.parse(JSON.stringify(MU0));
      for (const f of Object.values(MUo.avg_fit.legs)) if (f && Array.isArray(f.terms)) { const keep = f.terms.map((t, i) => !String(t).startsWith('in:')); f.terms = f.terms.filter((t, i) => keep[i]); if (Array.isArray(f.coef)) f.coef = f.coef.filter((c, i) => keep[i]); delete f.inputs; delete f.in_mean; }
      delete MUo.avg_fit.inputs;
      for (const v of Object.values(MUo.avg)) { delete v.in; for (const a of Object.values(v.stats || {})) delete a.in_x; }
      const { w, d } = page(MUo); await wait(60);
      for (const g of ['WR', 'K']) { const r = pickOn(MUo, w, g); if (!r) { notes.push(`no ${g} shown on the files with the inputs taken out: the window from before them is not checked`); continue; }
        const bad = await winBad(MUo, w, d, g, r), view = d.getElementById('pePlView');
        chk(!bad.length && inKindsC(MUo, g).length === 0, `on the files with the inputs taken out, ${r.name}'s window (${g}) is not the window from before them: ${bad.slice(0, 3).join('; ')}`); } }
    { const MUo = JSON.parse(JSON.stringify(MU0)); delete MUo.avg; delete MUo.avg_ref; delete MUo.avg_fit;
      const { w: wo, d: dO } = page(MUo); await wait(60);
      [...dO.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'WR').click(); await wait(20);
      const r = P.groups.WR.top.slice(0, 10).find(x => MUo.players[x.id] && !wo.eloRuledOut(x.id) && !on(wo, MUo.players[x.id].game_id)), tr = r && [...dO.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === r.id);
      if (!tr) notes.push('no receiver shown with a matchup on the files with the block taken out: the old window is not checked');
      else { tr.click(); await wait(20);
        const view = dO.getElementById('pePlView'), head = [...view.querySelectorAll('thead th')].map(txt).join('|'), n = view.querySelectorAll('tbody tr').length, wantN = MUo.stats.WR.filter(st => MUo.players[r.id].stats[st]).length;
        chk(head === 'Stat|Recent form|Elo matchup|Projection' && n === wantN && !view.querySelector('[data-pe-in]'), `on a file from before the Elo-adjusted averages, ${r.name}'s window is not the matchup formula's as before: ${head}, ${n} rows of ${wantN}`);
        { const cl = dO.getElementById('pePlClose'); if (cl) { cl.click(); await wait(10); } } } } }

  /* ---- (November 2026, the owner's call "Switch to ELO tab tables") a player's window ranks his opponent's defence on the
     ELO Ratings tab's own tables: three pills, Pass Rush, Run Defense and Pass Defense in that order (where the defensive
     line, the linebackers and the secondary stood, ranked on the matchup formula's units by their defenders' player Elo,
     matchups.json's league.defs, until then), each this check's own reading of model.json's units: the table's name as the
     file names it, the club's Elo and its rank as the table draws it (the file's rank) out of the clubs it lists, "carried
     from <season>" after it where the club is marked carried, a title naming the club, the table, its Elo and rank; a dash
     before a team has a rating, on a file without the table or with no row for the club. On the real files (the first
     receiver of the ten shown with a matchup, not ruled out), then on copies: two clubs made level on the Elo shown in Pass
     Defense, his opponent and another that a second receiver is made to face, the table ranked again by its rule (one more
     than the rated clubs above), both windows giving the one rank; and Run Defense taken out of the file whole, with his
     opponent's Pass Rush marked carried and its Pass Defense row taken out, a dash for both and the carried mark ---- */
  if (MU0) {
    const DEF_C = [['pass_rush', 'Pass Rush'], ['run_def', 'Run Defense'], ['pass_def', 'Pass Defense']];
    const ordC = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');
    const rowC = (Mo, k, t) => { const U = Mo && Mo.units; if (!U || !U.off || !U.def || !Object.values(U.off).some(v => v.games || v.carried)) return null;
      const T = U[k], meta = U.tables && U.tables[k]; if (!T || typeof T !== 'object' || !meta || !meta.label) return null;
      const v = T[t]; if (!v || v.rank == null) return null; const pr = U.params || {}, from = pr.carry && pr.carry_from != null ? pr.carry_from : null;
      return { name: String(meta.label), elo: v.elo, rank: v.rank, n: Object.keys(T).length, carried: !!v.carried && from != null, from }; };
    const wantC = (Mo, opp) => DEF_C.map(([k, nm]) => { const r = rowC(Mo, k, opp), meta = Mo && Mo.units && Mo.units.tables && Mo.units.tables[k];
      return r ? [k, `${r.name}: ${r.elo} · ${ordC(r.rank)} of ${r.n}${r.carried ? ` carried from ${r.from}` : ''}`, `${r.elo} · ${ordC(r.rank)} of ${r.n}`, `${opp} ${r.name} on the ELO Ratings tab: Elo ${r.elo}, ${ordC(r.rank)} of ${r.n}${r.carried ? `, carried from ${r.from}` : ''}`]
        : [k, `${meta && meta.label ? String(meta.label) : nm}: –`, '–', null]; });
    /* the table ranked again by its rule: one more than the rated clubs (a game, or carried) above on the Elo shown; a
       club with no rating after every rated one */
    const rerank = T => { const rated = Object.values(T).filter(v => v.games || v.carried); let u = rated.length;
      for (const [, v] of Object.entries(T).sort(([a], [b]) => a.localeCompare(b))) v.rank = (v.games || v.carried) ? 1 + rated.filter(x => x.elo > v.elo).length : ++u; };
    const shown = (MUx, w) => P.groups.WR.top.slice(0, 10).filter(x => entryOwn(MUx, x.id) && !w.eloRuledOut(x.id));
    const hold = async (Mo, MUx, ids, lab) => { const errors = [], { w, d } = page(MUx, { M: Mo, errors }); await wait(60); const out = {};
      [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'WR').click(); await wait(20);
      for (const id of ids) { const tr = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === id), opp = (entryOwn(MUx, id) || {}).opp;
        if (!tr) { chk(false, `${lab}: ${id} is not drawn in the rankings to open`); continue; }
        tr.click(); await wait(20);
        const sp = [...d.querySelectorAll('#pePlView .pe-pl-def > span')], want = wantC(Mo, opp), bad = [];
        if (sp.length !== 3) bad.push(`${sp.length} pills`);
        else sp.forEach((el, i) => { const [k, t, b, ti] = want[i]; if (el.dataset.peDef !== k || txt(el) !== t || txt(el.querySelector('b')) !== b || el.getAttribute('title') !== ti)
          bad.push(`pill ${i + 1} (${el.dataset.peDef}) "${txt(el)}"${el.getAttribute('title') ? ` titled "${el.getAttribute('title')}"` : ''}, not ${k} "${t}"${ti ? ` titled "${ti}"` : ' untitled'}`); });
        chk(!bad.length && !d.querySelector('#pePlView .pe-pl-def [data-pe-def]:not(span)'), `${lab}: ${P.players[id] ? P.players[id].name : id}'s window does not rank ${opp}'s Pass Rush, Run Defense and Pass Defense as the ELO Ratings tab's tables draw them: ${bad.slice(0, 3).join('; ')}`);
        out[id] = { opp, got: sp.map(txt) };
        const cl = d.getElementById('pePlClose'); if (cl) { cl.click(); await wait(10); } }
      chk(!errors.length, `${lab}: the page threw drawing a player's window: ${errors.slice(0, 2).join('; ')}`);
      return out; };
    const { w: w0 } = page(MU0); await wait(60); const two = shown(MU0, w0);
    if (!two.length) notes.push('no receiver shown with a matchup this week: the window\'s defence tables are not checked');
    else if (!rowC(M, 'pass_def', entryOwn(MU0, two[0].id).opp)) {
      /* before a team has a rating, a file without the position tables or no Pass Defense row for his opponent: the real
         files' window alone, each pill as this check reads it (a dash where it finds no row), with no copy to plant on */
      await hold(M, MU0, [two[0].id], 'the real files');
      notes.push('no team rating yet, or no Pass Defense row for the first receiver\'s opponent: the window\'s defence tables held on the real files alone (no level or carried copy)');
    } else {
      const r1 = two[0], X = entryOwn(MU0, r1.id).opp;
      await hold(M, MU0, [r1.id], 'the real files');
      /* two clubs level on Pass Defense: X and Y (the rated club, by a game or carried, ranked furthest from X), a second
         receiver made to face Y */
      const ML = JSON.parse(JSON.stringify(M)), TL = ML.units.pass_def, Y = Object.keys(TL).filter(t => t !== X && (TL[t].games || TL[t].carried)).sort((a, b) => Math.abs(TL[b].rank - TL[X].rank) - Math.abs(TL[a].rank - TL[X].rank) || a.localeCompare(b))[0];
      const MUL = JSON.parse(JSON.stringify(MU0)), r2 = P.groups.WR.top.slice(0, 10).find(x => x.id !== r1.id && entryOwn(MUL, x.id) && !w0.eloRuledOut(x.id));
      if (!Y || !r2) chk(false, `the window's defence tables: the level copy has nothing to stand on (${Y || 'no other rated club on Pass Defense'}, ${r2 ? r2.id : 'no second receiver'})`);
      else { TL[Y].elo = TL[X].elo; rerank(TL);
        const e2 = entryOwn(MUL, r2.id); e2.opp = Y; if (MUL.players && MUL.players[r2.id]) MUL.players[r2.id].opp = Y;
        const above = Object.values(TL).filter(v => (v.games || v.carried) && v.elo > TL[X].elo).length;
        const o = await hold(ML, MUL, [r1.id, r2.id], `${X} and ${Y} level on Pass Defense`);
        chk(TL[X].rank === TL[Y].rank && TL[X].rank === above + 1 && o[r1.id] && o[r2.id] && o[r1.id].got[2] === o[r2.id].got[2] && o[r1.id].got[2].includes(`${ordC(above + 1)} of`),
          `with ${X} and ${Y} level on Pass Defense at ${TL[X].elo}, the two windows read ${o[r1.id] ? o[r1.id].got[2] : '?'} and ${o[r2.id] ? o[r2.id].got[2] : '?'}, not the one rank ${ordC(above + 1)}`); }
      /* Run Defense taken out whole; X carried on Pass Rush and with no Pass Defense row */
      const MX = JSON.parse(JSON.stringify(M)); delete MX.units.run_def; if (MX.units.tables) delete MX.units.tables.run_def;
      if (!MX.units.pass_rush || !MX.units.pass_rush[X]) chk(false, `the window's defence tables: the carried copy has nothing to stand on (no Pass Rush row for ${X})`);
      else {
        Object.assign(MX.units.pass_rush[X], { games: 0, carried: true }); delete MX.units.pass_def[X];
        if (!MX.units.params || MX.units.params.carry == null || MX.units.params.carry_from == null) MX.units.params = Object.assign({}, MX.units.params, { carry: 0.42, carry_from: (+MX.units.season || 2026) - 1 });
        const o = await hold(MX, MU0, [r1.id], 'Run Defense taken out');
        const g = o[r1.id] ? o[r1.id].got : [], nPR = Object.keys(MX.units.pass_rush).length;
        chk(g[1] === 'Run Defense: –' && g[2] === 'Pass Defense: –' && / carried from \d{4}$/.test(g[0] || '') && (g[0] || '').includes(` of ${nPR} carried from `),
          `with Run Defense taken out and ${X} carried on Pass Rush with no Pass Defense row, the window reads ${g.join(' | ')}`); }
      /* and no league.defs read: the same window on a matchups file whose league table is emptied and every block's units
         moved draws the same three pills */
      const MUz = JSON.parse(JSON.stringify(MU0)); if (MUz.league) MUz.league.defs = {}; for (const v of Object.values(MUz.players || {})) if (v.opp_def) v.opp_def = { DL: 1, LB: 1, DB: 1 };
      await hold(M, MUz, [r1.id], 'the matchup formula\'s units emptied');
      notes.push(`the window's defence tables held on the real files (${r1.id} facing ${X}), ${X} and ${Y} level on Pass Defense, and Run Defense taken out`);
    }
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

  /* ---- the money the files feed (app v138): the Elo matchup chance on every matchup line in the files, at made-up
     book prices, DraftKings' fair chance on each the check's own (legFairStand, handed to eloMatchupP as the page hands
     it) ---- */
  { const errors = [], { w } = page(MU0, { errors }); await wait(60);
    /* market + form is gone (the owner's call of 27 October 2026: fitted on this season's games, its rating term -0.04
       +/- 0.06 out of sample against the 0.30 it used), and with it the old search's fast sums; and since app v142 (the
       owner's call of 5 November 2026: "instead of having the ELO picks in suggested parlays, i suggest we scrap that")
       the Elo picks, which Suggested Parlays drew in each unit, and their engine: none of it on the page, while what the
       other surfaces read stays (the Elo matchup chance, the Elo lean's words, the Mismatches' side rule) */
    { const left = ['eloAltP', 'eloAltZ', 'eloSums', 'eloPicks', 'eloUnit', 'eloUnitPerGame', 'eloCardOpt', 'eloCardsHeld', 'eloCands', 'eloCandsOf',
        'eloDecorate', 'eloMmFor', 'epTake', 'epOpposed', 'epFitWhy', 'epLean', 'epSlotBetter', 'epMm', 'epMmFor', 'epMmTag', 'epFair', 'epRuleOf', 'spEloSet'].filter(k => typeof w[k] !== 'undefined');
      chk(!left.length, `market + form, the Elo picks' old search, or the Elo picks themselves, still on the page: ${left.join(', ')}`);
      const kept = ['eloMatchupP', 'eloLeanNote', 'mmFavours', 'eloMismatches', 'eloGlance', 'eloFiles', 'eloLoaded'].filter(k => typeof w[k] !== 'function' && typeof w[k] !== 'object');
      chk(!kept.length, `the tab no longer hands over what the other surfaces and these checks read: ${kept.join(', ')}`); }
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
    /* (29 October 2026) on a file carrying the Elo-adjusted averages, the matchup formula's projections lean nothing: every
       line on a player the block does not cover (in the formula's players alone) has no Elo matchup chance; and each
       trusted leg's z, the Elo chance's move, is its Elo part (the projection less the same leg with no Elo terms) over
       its spread, to the file's rounding, so the move is the Elo part alone and never the projection's own chance */
    if (avgOn(MU0)) {
      const only = Object.fromEntries(Object.entries(MU0.players || {}).filter(([pid]) => !MU0.avg[pid])), extra = linesOf({ players: only }), leak = [];
      for (const l of extra) { const f = legFairStand(l); let v; try { v = w.eloMatchupP(l, f ? f.p : NaN); } catch (err) { v = 'threw ' + err.message; } if (v !== null) leak.push(`${l.pid} ${l.stat} ${l.side}: ${v}`); }
      chk(!leak.length, `the Elo matchup chance stands on the matchup formula's projections on a file carrying the Elo-adjusted averages, ${leak.length} of ${extra.length} lines on players the block does not cover: ${leak.slice(0, 3).join('; ')}`);
      const zBad = [];
      for (const [pid, v] of Object.entries(MU0.avg)) for (const [st, a] of Object.entries(v.stats || {})) { const f = MU0.avg_fit.legs[v.group + '|' + st]; if (!f || f.trusted !== true) continue;
        if (!(a.sd > 0) || !(Math.abs(a.z - a.elo / a.sd) <= 5e-4 + 1e-3 * Math.abs(a.z)) || !(Math.abs(a.elo - (a.proj - a.no_elo)) <= 2e-4 * Math.max(1, Math.abs(a.proj)))) zBad.push(`${pid} ${st}: elo ${a.elo}, proj ${a.proj}, no_elo ${a.no_elo}, sd ${a.sd}, z ${a.z}`); }
      chk(!zBad.length, `a trusted leg's z is not its Elo part (the projection less its no-Elo twin) over its spread: ${zBad.slice(0, 3).join('; ')}`);
      /* (the review of 29 October 2026) the Elo part's split the window and the note show agrees with it on every leg: the
         twin times the defence's and his Elo's multipliers is the projection, so the two together point the part's way
         (the split against a 1500 player it replaced pointed the other way on 128 trusted legs of week 8) */
      const split = [];
      for (const [pid, v] of Object.entries(MU0.avg)) for (const [st, a] of Object.entries(v.stats || {})) {
        if (!(Math.abs(a.no_elo * a.def_x * a.elo_x - a.proj) <= 1e-3 * Math.max(1, a.proj)) || (Math.abs(a.elo) > 2e-3 * Math.max(1, a.proj) && !((a.def_x * a.elo_x - 1) * a.elo > 0)) || 'player_x' in a || 'level_x' in a)
          split.push(`${pid} ${st}: base ${a.no_elo} x${a.def_x} x${a.elo_x}, proj ${a.proj}, Elo ${a.elo}`); }
      chk(!split.length, `the Elo part's split (the defence's multiplier and his Elo's) does not make the projection from its twin, or points away from the Elo part: ${split.slice(0, 3).join('; ')} (${split.length})`);
      notes.push(`the Elo-adjusted averages: ${Object.keys(MU0.avg).length} expected starters, the Elo matchup chance on their trusted legs alone, none on the formula's ${extra.length} lines of the ${Object.keys(only).length} players the block does not cover`);
      /* and the same files with the block taken out, as a file built before it: the page reads the formula's nudges as before */
      const MUo = JSON.parse(JSON.stringify(MU0)); delete MUo.avg; delete MUo.avg_ref; delete MUo.avg_fit;
      const errs = [], { w: wo } = page(MUo, { errors: errs }); await wait(60);
      let n = 0, nWant = 0; const badO = [];
      for (const l of linesOf(MUo)) { const f = legFairStand(l), want = f ? eloPOwn(MUo, l, f.p) : null; let v; try { v = wo.eloMatchupP(l, f ? f.p : NaN); } catch (err) { v = 'threw ' + err.message; }
        if (want !== null) nWant++;
        if (want === null && v === null) continue; n++; if (!ok01(v) || want === null || !(Math.abs(v - want) < 1e-6)) badO.push(`${l.pid} ${l.stat} ${l.side}: ${v}, the rule ${want}`); }
      /* (the review of 29 October 2026) with no game to come the build writes no player (the off-season, every morning from
         the Super Bowl to a fortnight before week 1): no line on a trusted formula leg to price, said, never a failure */
      if (!nWant) notes.push('the files with the Elo-adjusted averages taken out carry no line on a trusted matchup formula leg (no game to come): the old reading is held on no line');
      chk((n > 0 || !nWant) && !badO.length && !errs.length, `on the files with the Elo-adjusted averages taken out (a file built before them), the Elo matchup chance is not the matchup formula's nudge as before on ${badO.length} of ${n} lines: ${badO.slice(0, 3).join('; ')}${errs.length ? '; errors: ' + errs.slice(0, 2).join('; ') : ''}`); }
    chk(!errors.length, `the tab threw or logged an error on the files: ${errors.slice(0, 3).join('; ')}`);
    notes.push(`money paths: the Elo matchup chance on ${mu} of ${legs.length} lines`); }

  /* ---- F1: the Elo lean a builder row wears (window.eloLeanNote; the Elo picks' cards wore it too until app v142, the
     owner's call of 5 November 2026), on made-up lines of the check's own ----
     Made-up players in made-up games, each priced at a made-up book price, DraftKings' fair chance on each the check's own
     (legFairStand: a two-sided line its share with the margin out, a one-sided one over 5.66%), each leg's nudge set in a
     copy of the matchups file with the fixture's players, fits and records in it to move that fair chance to an Elo chance
     wanted, so it holds in any week and the off-season: a quarterback's two-sided passing yards (a receiver's lean, "Elo
     +x.x · vs FXB Pass D #23", titled with the table's whole name, its Elo and rank and the Elo part's split), a tight
     end's anytime touchdown reading THE INPUTS (to a hundredth, "· vs FXA Overall D #21", "and inputs" in its title), a
     back's receptions on a nudge of 0 ("Elo 0.0", unsigned) and a receiver's targets on a stat the matchup has not earned
     (none); then the same lines on a file from before the Elo-adjusted averages (the matchup formula's maps), the lean
     alone ("Elo +2.1"), as before. noteOwn is the check's own reading */
  { const SD = 10;
    /* each fixture leg's nudge set in the Elo-adjusted averages' block (avg: the Elo part elo and its z in the leg's
       spread, SD, the leg trusted in avg_fit.legs, the table he faces by its stat as the build sets them), or with o.old
       in the matchup formula's (players' stats, fit's sd, record's past), as a file built before the block carries them,
       which the page must read as before */
    const VS_FX = st => st === 'rushing_yards' || st === 'carries' ? { table: 'run_def', elo: 1421, rank: 23 } : st === 'any_td' ? { table: 'def', elo: 1451, rank: 21 } : { table: 'pass_def', elo: 1448, rank: 23 };
    const build = (rows, o) => {
      const old = !!(o && o.old);
      const MUf = JSON.parse(JSON.stringify(MU0 || { week: 6, players: {}, fit: {}, record: {} }));
      MUf.players = MUf.players || {}; MUf.fit = MUf.fit || {}; MUf.record = MUf.record || {};
      if (old) { delete MUf.avg; delete MUf.avg_ref; delete MUf.avg_fit; }
      else { MUf.avg = MUf.avg || {}; MUf.avg_fit = MUf.avg_fit || {}; MUf.avg_fit.legs = MUf.avg_fit.legs || {}; }
      const Pf = JSON.parse(JSON.stringify(P)); Pf.players = Pf.players || {};
      const legs = [];
      for (const [pid, grp, team, opp, gid, stat, side, k, price, want, x = {}] of rows) {
        const l = { key: `${gid}|${pid}|${stat}`, gid, pid, stat, grp, k, side, main: stat !== 'any_td', p: 0.5, price, src: 'real',
          ...(x.oth != null ? { oth: x.oth } : {}), name: 'Fixture ' + pid.slice(3).toUpperCase(), team, opp, week: 6, label: side + ' ' + k + ' ' + stat, mu: k };
        legs.push(l);
        /* the nudge that moves DraftKings' fair chance on the leg to the Elo chance wanted */
        const f = legFairStand(l), fair = f ? f.p : 0.5, nudge = x.zero ? 0 : (side === 'under' ? -1 : 1) * SD * (invPhiC(want) - invPhiC(fair));
        if (old) {
          MUf.fit[grp + '|' + stat] = { sd: SD };
          MUf.record[grp + '|' + stat] = { past: x.untrusted ? { rmse_elo: 2, rmse_form: 1, right_top: 0.4 } : { rmse_elo: 1, rmse_form: 2, right_top: 0.6 } };
          const v = MUf.players[pid] || (MUf.players[pid] = { group: grp, game_id: gid, team, opp, home: gid.endsWith(team), elo: 1600, opp_def: { DL: 1500, LB: 1500, DB: 1500 }, stats: {} });
          v.stats[stat] = [k, k, nudge];
        } else {
          MUf.avg_fit.legs[grp + '|' + stat] = { trusted: !x.untrusted };
          const v = MUf.avg[pid] || (MUf.avg[pid] = { group: grp, game_id: gid, team, opp, home: gid.endsWith(team) ? 1 : 0, stats: {} });
          v.stats[stat] = { avg: k, proj: k, no_elo: k - nudge, elo: nudge, sd: SD, z: nudge / SD, def_x: 1, elo_x: k / (k - nudge), vs: VS_FX(stat), ...(x.inx ? { in_x: x.inx } : {}) };
        }
        Pf.players[pid] = { name: 'Fixture ' + pid.slice(3).toUpperCase(), group: grp, team, elo: 1600, se: 1600, rank: 3 }; }
      return { MUf, Pf, legs };
    };
    const GA = '2026_06_FXA_FXB', GB = '2026_06_FXC_FXD';
    /* pid, group, team, opp, game, stat, side, line, price, the Elo chance wanted (the nudge is set to give it) */
    const ROWS1 = [
      ['fx-qa', 'QB', 'FXA', 'FXB', GA, 'passing_yards', 'over', 249.5, -115, 0.60, { oth: -105 }],
      ['fx-ta', 'TE', 'FXB', 'FXA', GA, 'any_td', 'over', 1, 150, 0.43, { inx: { vol: 1.12 } }],   // a leg reading THE INPUTS: its lean's title says so
      ['fx-wa', 'WR', 'FXA', 'FXB', GA, 'targets', 'over', 6.5, 120, 0.70, { untrusted: true }],     // a stat the matchup has not earned: no lean
      ['fx-z0', 'RB', 'FXC', 'FXD', GB, 'receptions', 'over', 2.5, -120, null, { zero: true }]];   // a nudge of 0: "Elo 0.0"
    const { MUf, Pf, legs } = build(ROWS1), errors = [], { w } = page(MUf, { errors, P: Pf }); await wait(60);
    const by = (pid, stat) => legs.find(l => l.pid === pid && l.stat === stat);
    const note = l => { try { return typeof w.eloLeanNote === 'function' ? w.eloLeanNote(l) : null; } catch (err) { return 'threw ' + err.message; } };
    /* the nudge as the note says it (the check's own reading): a tenth in the stat's units, a touchdown's a hundredth,
       signed but a figure shown as 0 unsigned (the review of 27 October 2026: "Elo +0.0" and "Elo −0.0" said nothing);
       (29 October 2026) with the defence he faces named and ranked after it where the file names it */
    const tdN = note(by('fx-ta', 'any_td')), z0 = note(by('fx-z0', 'receptions'));
    chk(tdN === noteOwn(MUf, by('fx-ta', 'any_td')) && /Elo [+−]\d\.\d\d <span class="pe-lean-vs">· vs FXA Overall D #21<\/span>/.test(tdN || '') && /title="His Elo for his average and inputs \(×/.test(tdN || '')
      && z0 === noteOwn(MUf, by('fx-z0', 'receptions')) && /Elo 0\.0 <span class="pe-lean-vs">· vs FXD Pass D #23</.test(z0 || '') && /title="His Elo for his average \(×/.test(z0 || ''),
      `F1: an Elo lean is not said to its unit's precision, a figure shown as 0 unsigned, with the defence it is set against: the touchdown's ${tdN} (want ${noteOwn(MUf, by('fx-ta', 'any_td'))}, a nudge of ${nudgeOwn(MUf, 'fx-ta', 'any_td').n}), a nudge of 0 ${z0}`);
    const wantNote = noteOwn(MUf, by('fx-qa', 'passing_yards')), qaN = note(by('fx-qa', 'passing_yards')), none = note(by('fx-wa', 'targets'));
    chk(qaN === wantNote && /^<small class="pe-lean" data-pe-lean="[^"]+" title="His Elo for his average \(×\d\.\d\d\) and the FXB Pass Defense \(1448, 23rd, ×1\.00\) move his projection \+\d+\.\d">Elo \+\d+\.\d <span class="pe-lean-vs">· vs FXB Pass D #23<\/span><\/small>$/.test(qaN || '') && none === '',
      `F1: a leg's Elo lean is not "${wantNote}", or a stat the matchup has not earned leans: ${qaN}, ${JSON.stringify(none)}`);
    chk(!errors.length, `F1: the tab threw or logged an error on the check's own lines: ${errors.slice(0, 3).join('; ')}`);
    /* (29 October 2026) the same lines on a matchups file from before the Elo-adjusted averages (the nudges in the matchup
       formula's players, fit and record, no avg block): each lean said alone ("Elo +2.1", no defence after it) */
    { const B0 = build(ROWS1, { old: true }), errs0 = [], { w: w0 } = page(B0.MUf, { errors: errs0, P: B0.Pf }); await wait(60);
      const qa = B0.legs.find(l => l.pid === 'fx-qa' && l.stat === 'passing_yards');
      let n0 = null; try { n0 = typeof w0.eloLeanNote === 'function' ? w0.eloLeanNote(qa) : null; } catch (err) { n0 = 'threw ' + err.message; }
      chk(!avgOn(B0.MUf) && !!n0 && n0 === noteOwn(B0.MUf, qa) && /^<small class="pe-lean" data-pe-lean="[^"]+" title="His Elo against the defenders he faces moves his projection \+\d+\.\d">Elo \+\d+\.\d<\/small>$/.test(n0),
        `F1, on a file from before the Elo-adjusted averages: an Elo lean is not said alone, as before: ${n0} (want ${noteOwn(B0.MUf, qa)})`);
      chk(!errs0.length, `F1, on a file from before the Elo-adjusted averages: the tab threw or logged an error: ${errs0.slice(0, 3).join('; ')}`); }
    notes.push(`the Elo lean's words on F1: ${[qaN, tdN, z0].map(x => String(x || '').replace(/<[^>]+>/g, '').trim()).join(' | ')}`); }

  console.log(`elo tab check: ${checks} checks, ${fails.length} failures`);
  for (const n of notes) console.log('  note: ' + n);
  for (const f of fails) console.log('  FAIL: ' + f);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
