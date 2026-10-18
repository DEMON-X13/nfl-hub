/* Build the NFL Hub page, the site's own front page (https://demon-x13.github.io/nfl-hub/), once X NFL
 * Bets and Stats at nflbets/.
 *
 *   node nflbets/build/build.js        (from the hub root)
 *   require('./build.js')              the same build in memory, {out, hash}, written
 *                                      nowhere: the smoke compares it with the published page
 *
 *   index.html           at the site's root (the owner's call of 17 October 2026: "can you make
 *                        .../nfl-hub/nflbets/ be .../nfl-hub/ and get rid of that page", the landing page
 *                        that listed this page, Weekly Picks and the other hubs): the prop model's page with
 *                        the Matchups board in front of it, its Suggested Parlays and Parlay Builder tabs, X
 *                        Parlays on a tab of its own, and the Game snapshot a tap on a game opens, which reads
 *                        the Season Tracker's games from the news job's files. nflbets/ stays the source
 *                        folder (build/); its index.html is a hand-written redirect to the root now, for old
 *                        bookmarks. Every file the page reads is named from the root (props/data/payload.json,
 *                        never ../props/...), and nothing in it names a parent folder, which from the root
 *                        would leave the site.
 *
 * The page is the prop model assembled the way props/build/assemble.py assembles it -- part1,
 * the payload fetch, part2, part3 -- because the tabs it is growing are the prop model's own
 * tabs, and a copy of a tab that size would be a second prop model to keep in step. Its
 * sections all stay in the page, listeners and all; only the tab buttons say which are shown.
 * The Matchups tab (Pick'ems until the owner's call of 16 October 2026; its section, file and
 * prefix keep that name) is set in front of them: its own section, styles and one closure, every
 * name prefixed pk- so nothing of it collides with the app around it.
 *
 * The board draws the betting app's row, so the betting app's tag and confidence-band code is
 * lifted from it at build time, the way betting/tools/build.js lifts from part2: the same
 * code, not a copy that can drift. It is scoped inside the closure because the prop model has
 * its own TEAM_COLORS and tag().
 *
 * Nothing is baked in. The page fetches props/data/payload.json, betting/state.json,
 * liveparlays/parlays.json, liveparlays/xbets.json and elo/data/*.json when it opens, and the news
 * job's news/data/units.json and the week's notes when a Game snapshot first opens (stats.json no
 * longer: the Stat breakdown went on 16 October 2026, the owner's call), so it is rebuilt when a source changes, never when the data does. Neither site is touched. This page
 * reads what they publish, and writes nothing anywhere but the visitor's own browser storage.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..');
const HASH_SLOT = '@@PAGE_HASH@@';
const rd = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
/* every edit lands exactly once, or the build stops: a source that moved is a build to fix,
   not a page to ship half-edited */
const sub1 = (s, from, to, what) => {
  const n = from instanceof RegExp ? (s.match(new RegExp(from.source, from.flags.replace('g', '') + 'g')) || []).length : s.split(from).length - 1;
  if (n !== 1) throw new Error(`${what}: expected exactly one match, found ${n}`);
  return s.replace(from, () => to);
};
const part1 = rd('props', 'build', 'part1.html');
const part2 = rd('props', 'build', 'part2.js');
const part3 = rd('props', 'build', 'part3.js');
const betting = rd('betting', 'app', 'x_nfl_betting_model.html');
const tab = rd('nflbets', 'build', 'tab_pickems.html');
/* the X Parlays section is the section page's own source, set into the X Parlays tab, a tab of
   its own (#xparlays): X's parlays (liveparlays/parlays.json, read only on every device) and
   nothing else. The Parlay Builder is its own tab (#parlay): its Top 100 lines over the builder; Suggest
   Parlays (#suggest) is the prop model's own tab of each prime-time game's parlays. No device keeps a list of its own: visitors come to see X's parlays,
   and the builder finishes a parlay as a card to download (card.html, below), saved nowhere.
   The section's styles are scoped to its card and its script runs in a closure, since the page
   around it defines most of the same names for itself. */
const livePage = rd('liveparlays', 'build', 'page.html');
/* the parlay card: a finished parlay in a window, downloadable as an image. Its own styles,
   window and script, every name prefixed pc-; the builder's pricing is lifted into it from
   part3's renderParlay (its QUOTE slot), so the card prices a parlay exactly as the builder
   shows it, never with a copy that can drift */
const cardSrc = rd('nflbets', 'build', 'card.html');
/* the browser's own storage (storage.js): the window.storage the prop model saves through, over
   this browser's localStorage and nothing else, and the leftovers of the retired shared store
   taken out once. It runs before the prop model. The X Bet Log's adapter (xbets.js) runs right
   after it and hands the betting app's frames X's log, read from liveparlays/xbets.json. */
/* the season and the prop model's storage key are part2's, one place: the storage layer is
   handed that key at build time, so a new season is a new key in part2.js and nowhere else */
const SEASON_KEY = part2.match(/const SEASON=(\d{4}), KEY='([^']+)';/);
if (!SEASON_KEY) throw new Error("the prop model's SEASON and storage KEY are not where nflbets/build expects them in part2.js");
const PROP_KEY = SEASON_KEY[2];
/* the betting app's own key and season (betting/tools/build.js reads them from the app): the X
   Bet Log is that season's */
const BETB = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
if (!/^x_nfl_viewer_picks_\d{4}$/.test(BETB.BET_KEY)) throw new Error('betting/tools/build.js no longer exports the betting app\'s own key');
/* the prop model reads the betting slips from the same key (part2's BET_KEY): two names for one
   key would read a key nothing writes */
{ const m = part2.match(/const BET_KEY='([^']+)';/);
  if (!m || m[1] !== BETB.BET_KEY) throw new Error(`part2.js reads the betting slips from ${m ? m[1] : 'no BET_KEY'}, the betting app keeps them under ${BETB.BET_KEY}: move part2's BET_KEY to the app's season with a props patch`); }
const STORAGE_JS = sub1(rd('nflbets', 'build', 'storage.js'), /\/\*PROP_KEY\*\/'[^']*'/, '/*PROP_KEY*/' + JSON.stringify(PROP_KEY), "the storage layer's PROP_KEY");
for (const need of ['window.storage=', 'function clean(v,d)', "const BAD=/[<>\"`]/g;", "ls.del('live_parlays_v1')", "'nflowner_v1'", "'xparlays_v1'"])
  if (!STORAGE_JS.includes(need)) throw new Error('nflbets/build/storage.js no longer has ' + need);
const XBETS_JS = sub1(rd('nflbets', 'build', 'xbets.js'), /\/\*SEASON\*\/\d{4}/, '/*SEASON*/' + BETB.SEASON, "the X Bet Log's season");
for (const need of ['window.XBETS=', "URL='liveparlays/xbets.json'", "{cache:'no-store'}", 'function cleanWeek(', "replace(/[<>]/g,'')", 'function tidy('])
  if (!XBETS_JS.includes(need)) throw new Error('nflbets/build/xbets.js no longer has ' + need);
/* friends' picks on the Pick'em Record (friends.js, the owner's call of 15 October 2026): read from
   picks/friends.json, which Claude keeps with picks/tools/add.js, and handed to the betting frames as
   parent.FRIENDS, read only. A missing file draws no friends; nothing is baked in. */
const FRIENDS_JS = sub1(rd('nflbets', 'build', 'friends.js'), /\/\*SEASON\*\/\d{4}/, '/*SEASON*/' + BETB.SEASON, "the friends' picks' season");
for (const need of ['window.FRIENDS=', "URL='picks/friends.json'", "{cache:'no-store'}", 'function clean('])
  if (!FRIENDS_JS.includes(need)) throw new Error('nflbets/build/friends.js no longer has ' + need);
/* nothing on the page writes anywhere but this browser: the two scripts send no request but the
   X Bet Log file's read */
for (const [name, src] of [['storage.js', STORAGE_JS], ['xbets.js', XBETS_JS], ['friends.js', FRIENDS_JS]])
  for (const gone of ["method:'PUT'", "method:'PATCH'", "method:'POST'", 'keepalive', 'write('])
    if (src.includes(gone)) throw new Error(`nflbets/build/${name} has ${gone}: nothing on the page writes anywhere but this browser's storage`);
if (!part2.includes('if(window.storage){const r=await window.storage.get(KEY,false)')) throw new Error('the prop model no longer reads through window.storage, which the storage layer relies on');
for (const gone of ['sync.json', path.join('build', 'sync.js'), path.join('build', 'stress_sync.js')])
  if (fs.existsSync(path.join(ROOT, 'nflbets', gone))) throw new Error('nflbets/' + gone + ' is back: the shared store is retired, X\'s parlays and the X Bet Log are files in liveparlays/');
if (!fs.existsSync(path.join(ROOT, 'liveparlays', 'xbets.json'))) throw new Error('liveparlays/xbets.json is missing: the X Bet Log reads it');

const lift = (src, from, to, what) => {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  if (a < 0 || b < 0) throw new Error(`the ${what} is not where nflbets/build expects it`);
  return src.slice(a, b).trimEnd();
};
const piece = (re, what) => { const m = tab.match(re); if (!m) throw new Error(`tab_pickems.html has no ${what}`); return m[1]; };
const TAB_CSS = piece(/<style>([\s\S]*?)<\/style>/, '<style> block');
const TAB_HTML = piece(/(<section id="tab-pickems">[\s\S]*?<\/section>)/, 'section');
const TAB_JS = piece(/<script>([\s\S]*?)<\/script>/, '<script> block');
/* the Player Elo tab: the same shape, prefixed pe-, reading elo/data/ on load */
const eloTab = rd('nflbets', 'build', 'tab_elo.html');
const epiece = (re, what) => { const m = eloTab.match(re); if (!m) throw new Error(`tab_elo.html has no ${what}`); return m[1]; };
const ELO_CSS = epiece(/<style>([\s\S]*?)<\/style>/, '<style> block');
const ELO_HTML = epiece(/(<section id="tab-elo" hidden>[\s\S]*?<\/section>)/, 'section');
const ELO_JS = epiece(/<script>([\s\S]*?)<\/script>/, '<script> block');
for (const need of ['<tr class="legrow"><td class="plr">', 'data-drop="${l.key}"'])
  if (!part3.includes(need)) throw new Error('the builder leg markup moved (' + need + '); the Elo badge on each leg relies on it');
for (const need of ["'elo/data/players.json'", "'elo/data/model.json'", 'window.pkTag', 'window.pkTierBadge', 'window.pkTierDefs'])
  if (!ELO_JS.includes(need)) throw new Error('tab_elo.html no longer has ' + need);
for (const f of ['players.json', 'model.json']) if (!fs.existsSync(path.join(ROOT, 'elo', 'data', f)))
  throw new Error('elo/data/' + f + ' is missing: run python3 elo/build.py first');
if (/(^|\n)(body|header|main|:root|\.card|\.bar|table)\{/.test(ELO_CSS)) throw new Error('a page-level rule in the Elo tab styles');
/* the Season Tracker tab is gone (14 October 2026, the owner's call): its games are in each Game
   snapshot (snapshot.html, below), read from the news job's files, and its old address, #tracker,
   lands on the Matchups board, as #matchups (tab_pickems.html's routeTabs) */
if (fs.existsSync(path.join(ROOT, 'nflbets', 'build', 'tab_tracker.html')))
  throw new Error('nflbets/build/tab_tracker.html is back: the Season Tracker tab is retired, its games are in the Game snapshot');

/* the betting app's colour table, tag() and the contrast maths behind it, and its confidence
   bands: cut where its walk-forward record changes, so a second copy here would drift off them */
const BET = [
  lift(betting, 'const TEAM_COLORS=', '\n', 'team colours'),
  lift(betting, 'function hex2rgb(', 'function predict(', 'tag colours and tag()'),
  lift(betting, 'function tier(', 'function statsFromRow', 'betting confidence bands'),
  /* the Elo tiers and their shields, so a player's rating wears the same badge a team's does */
  require(path.join(ROOT, 'betting', 'tools', 'tiers.js'))(lift(betting, 'const TIERS=', 'function tierLegend(', 'Elo tiers and shields'), 'the Bets and Stats page'),
].join('\n');
for (const need of ['function tag(', 'function tagColor(', 'function tagBg(', 'function textOn(', 'function teamCols(', 'const PROB_HI', 'function tier(', 'function eloTier(', 'function tierBadge(', 'const TIER_DEFS'])
  if (!BET.includes(need)) throw new Error('the lifted betting block is missing ' + need);
const BET_NS = `const BET=(()=>{\n${BET}\nreturn {tag,tagColor,tagBg,textOn,teamCols,hex2rgb,tier,PROB_HI,PROB_LO,eloTier,tierBadge,TIER_DEFS};\n})();`;
const js = sub1(sub1(TAB_JS, '/*BETTING*/', BET_NS, 'the /*BETTING*/ slot'),
  "const tag=(...a)=>BET.tag(...a).replace(/class=\"([^\"]*)\"/,(m,c)=>'class=\"'+c.split(' ').map(x=>'pk-'+x).join(' ')+'\"');",
  "const tag=(...a)=>BET.tag(...a).replace(/class=\"([^\"]*)\"/,(m,c)=>'class=\"'+c.split(' ').map(x=>'pk-'+x).join(' ')+'\"');\n/* the Player Elo tab draws team tags and tier shields with these */\nwindow.pkTag=tag; window.pkTagColor=BET.tagColor; window.pkTierBadge=BET.tierBadge; window.pkEloTier=BET.eloTier; window.pkTierDefs=BET.TIER_DEFS;",
  'the tag helper, which the Elo tab shares');
for (const need of ['function gameBet', 'function confTier', 'function bookPrice', 'function fmtML', 'const TEAM_NAMES', 'function toggleLeg', 'function legKey', 'function gameStarted', 'function gameBetsCard', 'function settleGameLeg', 'function slateStamp', 'const ESPN_SB', 'function espnGames', 'const SEASON'])
  if (!(part2 + part3).includes(need)) throw new Error('the prop model no longer defines ' + need + ', which the board prices with');

/* ---- the X Parlays section, out of liveparlays/build/page.html ---- */
const lpiece = (re, what) => { const m = livePage.match(re); if (!m) throw new Error(`liveparlays/build/page.html has no ${what}`); return m[1]; };
const LIVE_CSS = lpiece(/<style>([\s\S]*?)<\/style>/, '<style> block');
const LIVE_BAR = lpiece(/<main>\s*(<p class="lp-upd" id="lpUpdated"><\/p>\s*<div class="bar">[\s\S]*?<\/div>)\s*<noscript>/, 'updated line and control bar');
let LIVE_JS = lpiece(/<script>([\s\S]*?)<\/script>/, '<script> block');
/* Clear this parlay?, the window the X on each card opens: inside the card, so its styles are
   scoped with the rest */
const LIVE_ASK = lpiece(/\n\s*(<div class="lp-dlg" id="lpAsk" hidden>[\s\S]*?<\/div><!-- \/lpAsk -->)\n/, 'Clear this parlay? window');
/* Scope every rule to the section's cards. Page-level rules -- the page shell, the button and card
   bases the prop model already has -- are dropped; the rest keep their look inside the cards
   and touch nothing outside them. Handles one level of @media. */
function scopeCss(css, scopes) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const DROP = /^(\*|:root|html|body|header|header::after|main|footer|footer a|select|\.brand.*|\.btn.*|\.card|\.card h2|\.bar|\.bar \.grow|\.muted)$/;
  const block = str => {
    let out = '', pos = 0;
    for (;;) {
      const open = str.indexOf('{', pos); if (open < 0) break;
      const sel = str.slice(pos, open).trim();
      let depth = 1, j = open + 1;
      while (j < str.length && depth) { if (str[j] === '{') depth++; else if (str[j] === '}') depth--; j++; }
      const body = str.slice(open + 1, j - 1);
      if (sel.startsWith('@media')) out += sel + '{' + block(body) + '}\n';
      else {
        const kept = sel.split(',').map(x => x.trim()).filter(x => x && !DROP.test(x)).flatMap(x => scopes.map(sc => sc + ' ' + x));
        if (kept.length) out += kept.join(',') + '{' + body.trim() + '}\n';
      }
      pos = j;
    }
    return out;
  };
  return block(css);
}
const LIVE_SCOPED = scopeCss(LIVE_CSS, ['#lpCard']);
for (const need of ['#lpCard .savedp{', '#lpCard .sp-leg{', '#lpCard .pbar{', '#lpCard .gm{', '#lpCard .lp-upd{', '#lpCard .lp-x{', '#lpCard .lp-dlg{', '#lpCard .lp-dlg-panel{', '#lpCard .lp-here{'])
  if (!LIVE_SCOPED.includes(need)) throw new Error('the scoped live styles lost ' + need);
if (/(^|\n)(body|header|main|:root)\{/.test(LIVE_SCOPED)) throw new Error('a page-level live rule survived scoping');
const lsub = (from, to, what) => { LIVE_JS = sub1(LIVE_JS, from, to, 'the live script: ' + what); };
lsub("const DATA='parlays.json';", "const DATA='liveparlays/parlays.json';", 'file path');
/* the section draws once the model is up (a leg's injury word and player ids are the model's) */
/* lp-, not live-: the prop model has a liveRefresh of its own, and a global by that name
   would replace it */
lsub("draw(); refresh();", "window.lpDraw=draw; window.lpRefresh=refresh; draw(); refresh();", 'boot');
for (const need of ['function readFile(', 'o.cleared===true', 'const updatedOf=', "{cache:'no-store'}", 'function espnWeek(', 'function drawList(', "getElementById('lpUpdated')",
  "const HERE_KEY='lp_cleared_here_v1';", 'data-lp-clear=', 'aria-label="Clear this parlay"', 'function ask(', 'function askClose(', 'function showAgain(', 'id="lpShowAll"'])
  if (!LIVE_JS.includes(need)) throw new Error('the live script no longer has ' + need + ', which the section relies on');
for (const need of ['role="alertdialog"', 'aria-modal="true"', 'id="lpAskNo"', 'id="lpAskYes"', 'Clear this parlay?'])
  if (!LIVE_ASK.includes(need)) throw new Error('the Clear this parlay? window no longer has ' + need);
/* one list, X's, from the file, read only on every device: nothing of the section reads, draws or
   writes a browser's own parlays, and nothing on it changes X's */
for (const gone of ['MY_KEY', 'myCard', 'myApp', 'LISTS.', 'LIVE_IO', 'NFLSYNC', 'lpOwner', 'lpKeep', 'data-rm', 'data-edit', 'data-stake-of', 'data-reset', "id=\"clear\"", 'propState', 'S.saved', 'sessionStorage', 'indexedDB'])
  if (LIVE_JS.includes(gone) || LIVE_BAR.includes(gone) || LIVE_ASK.includes(gone)) throw new Error('the live section still has ' + gone + ': X Parlays is the file, read only, on every device');
/* the one thing the section keeps is the visitor's own: the parlays this device has cleared, under
   a key of its own (never a retired one, which storage.js takes out) and no other. Every use of the
   browser's storage is that key's, the section sends nothing (no write, no other address), and the
   storage layer never removes the key. */
{ const uses = [...LIVE_JS.matchAll(/localStorage\s*\.\s*(\w+)\s*\(([^,)]*)/g)];
  if (!uses.length || uses.some(m => !['getItem', 'setItem', 'removeItem'].includes(m[1]) || m[2].trim() !== 'HERE_KEY') || (LIVE_JS.match(/localStorage/g) || []).length !== uses.length)
    throw new Error("the live section uses this browser's storage for something other than its own list of cleared parlays (HERE_KEY)");
  for (const gone of ["method:'PUT'", "method:'PATCH'", "method:'POST'", "method:'DELETE'", 'keepalive', 'sendBeacon', 'XMLHttpRequest'])
    if (LIVE_JS.includes(gone)) throw new Error('the live section has ' + gone + ': it sends nothing anywhere');
  if (/['"]lp_cleared_here_v1['"]/.test(STORAGE_JS)) throw new Error('nflbets/build/storage.js names lp_cleared_here_v1: the cleared list is the visitor\'s own, which the storage layer never touches'); }
/* the card: its styles (nothing page-level), its window, and its script with the builder's
   pricing set into it */
const cpiece = (re, what) => { const m = cardSrc.match(re); if (!m) throw new Error(`card.html has no ${what}`); return m[1]; };
const CARD_CSS = cpiece(/<style>([\s\S]*?)<\/style>/, '<style> block');
const CARD_HTML = cpiece(/(<div id="pcModal" class="modal" hidden>[\s\S]*?\n<\/div>)\n<script>/, 'window');
let CARD_JS = cpiece(/<script>([\s\S]*?)<\/script>/, '<script> block');
if (/(^|\n)(body|header|main|:root|\.card|\.btn|\.modal|\.modal-panel|table)\{/.test(CARD_CSS)) throw new Error('a page-level rule in the card styles');
/* the builder's own numbers: renderParlay's pricing, from the legs to what it pays */
const QUOTE_FROM = '  const wks=[...new Set(legs.map(l=>l.week))];';
if (part3.split(QUOTE_FROM).length !== 2) throw new Error("the builder's pricing is not in part3.js once");
const QUOTE = lift(part3, QUOTE_FROM, '\n\n  let html=droppedNote+', "builder's pricing in renderParlay");
for (const need of ['const pr=parlayProb(', 'const prices=legs.map(legPrice);', 'const bookDec=', 'const fairML=', 'const stake=', 'const override=', 'const realPrice=', 'const estPrice=', 'const useDec=', 'const payout=stake*useDec, profit=payout-stake;'])
  if (!QUOTE.includes(need)) throw new Error("the builder's pricing lifted from part3.js has no " + need);
/* the builder's save, which every device turns into Finish: the button, its rule, its label; and
   each suggested tier's Add to builder and Finish, which the card answers */
for (const need of ['const canSave=wks.length===1&&(realPrice||estPrice);', "id=\"pSave\" ${canSave?'':'disabled'}", 'Legs must all be from the same week to save', '>Save and lock this parlay</button>', 'data-sp-add="${g.id}:${t.id}"', "data-pc-finish=\"${o.kind||'pb'}|${o.fid||t.id}\"", 'function spTier(', 'function pbStake(', 'id="pbStake"', 'data-pb-pay="${t.dec}"'])
  if (!part3.includes(need)) throw new Error("the builder's save or Suggested Parlays' buttons moved (" + need + "); the parlay card stands in for them on every device");
CARD_JS = sub1(CARD_JS, '/*QUOTE*/', QUOTE, "the card's QUOTE slot");
for (const need of ['window.PARLAY_CARD=', "const SITE='demon-x13.github.io/nfl-hub';", 'function finishBuilder(', 'function finishFrom(', "$('pSave')", "closest('[data-pc-finish]')", "window.spTier(", 'stake:pbStake()', 'c.toBlob(', "'image/png'", 'URL.createObjectURL(', 'navigator.share(', "nb.textContent='Finish parlay'", 'PAY.dk', 'function dkPlan(', 'function shareLink('])
  if (!CARD_JS.includes(need)) throw new Error('nflbets/build/card.html no longer has ' + need);
/* Finish on every device: nothing in the card asks whose device it is */
for (const gone of ['lpOwner', 'NFLSYNC', 'visitor('])
  if (CARD_JS.includes(gone)) throw new Error('nflbets/build/card.html still has ' + gone + ': the builder finishes a parlay on every device');
for (const need of ['function parlayLegs', 'function parlayProb', 'function legPrice', 'function parlayDec', 'const sameGame', 'function probToAmerican', 'function mlToDec', 'function decToML', 'function kickoff', 'function save(', 'function spTier(', 'function gameStarted', 'function marketLine'])
  if (!(part2 + part3).includes(need)) throw new Error('the prop model no longer defines ' + need + ', which the parlay card uses');
/* the Elo picks' four levels (17 October 2026): Suggested Parlays' own (PB_TIERS, which the tab reads from the
   page), each named elo-<level> (elo-safe, elo-med, elo-aggr, elo-xtrm), its Finish "elo|elo-<level>", which
   the card finds by that id in window.eloPicks() */
{ const elo = rd('nflbets', 'build', 'tab_elo.html');
  if (!elo.includes("kind:'elo'") || !elo.includes('window.eloPicks=eloPicks;') || !elo.includes("getElementById('pbElo')")
    || !elo.includes("id:'elo-'+id") || !elo.includes("typeof PB_TIERS!=='undefined'&&Array.isArray(PB_TIERS)?PB_TIERS:null") || !elo.includes('add:`data-pb-elo-add="${t.id}"`'))
    throw new Error("the Elo picks' levels, their ids, their place on Suggested Parlays or window.eloPicks moved; the parlay card finishes an Elo pick on every device");
  if (!part3.includes('const PB_TIERS=['))
    throw new Error("Suggested Parlays' levels (PB_TIERS) moved; the Elo picks are built on them");
  if (!CARD_JS.includes("kind==='elo'?((typeof window.eloPicks==='function'&&window.eloPicks())||{tiers:[]}).tiers.find(x=>x.id===id)"))
    throw new Error("the parlay card no longer finds an Elo pick's level by its id in window.eloPicks()"); }
/* X Parlays: X's parlays from the file, the whole of its tab, read only; a quiet line under the
   heading says when the file last changed them */
const LIVE_SECTION = `<div class="card" id="lpCard">
    <h2>X Parlays</h2>
    ${LIVE_BAR}
    <div id="app"></div>
    ${LIVE_ASK}
  </div>`;
const LIVE_SCRIPT = `<script>
/* the X Parlays section: liveparlays/build/page.html, in a closure. Names it shares with
   the prop model -- esc, num, fmtML -- are its own copies inside it. */
(function(){
${LIVE_JS}
})();
/* the Saved parlays card and the betting-slips card are drawn nowhere: X Parlays is X's, from the
   file, on its own tab, and a browser's own saved parlays are not drawn. The builder, on the
   Parlay Builder tab, gets Finish parlay where Save was (the parlay card) after every redraw. The
   section draws again once the prop model is up, for the injury word and player ids its legs read. */
renderSaved=function(){ return ''; };
renderBetParlays=function(){ return ''; };
{ const drawParlay=renderParlay;
  renderParlay=function(){ const r=drawParlay.apply(this,arguments);
    try{ if(window.PARLAY_CARD) window.PARLAY_CARD.finishBuilder(); }catch(e){}
    return r; }; }
document.addEventListener('app-ready',()=>{ if(window.lpDraw) window.lpDraw(); });
</script>`;

/* the prop model's page, re-headed as NFL Hub, the way the NBA Hub and the NHL Hub are headed: the
   wordmark and a tagline on the left, when the data was built and which build it is on the right */
let html = part1;
html = sub1(html, '<title>X NFL Prop Model</title>', '<title>NFL Hub</title>', 'title');
/* the light/dark switch (theme.js, the owner's call of 17 October 2026) heads the stamp, laid over the
   header's top right corner by theme.css: a 44px button named Light mode, aria-pressed while the light
   look is on, its glyph the look a press gives (a sun while dark, a moon while light) */
const THEME_TOGGLE = '<button type="button" class="hub-theme" data-theme-toggle aria-label="Light mode" aria-pressed="false" title="Switch to light mode">'
  + '<svg class="ht-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.5" fill="currentColor"/>'
  + '<path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>'
  + '<svg class="ht-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg></button>';
html = sub1(html, '<h1>X NFL Prop Model</h1>\n    <span class="sub" id="buildTag"></span>\n    <span class="sub grow" id="saveState" style="margin-left:auto"></span>',
  '<div><h1>NFL <em>Hub</em></h1><p class="tagline">Every game called by three models against Vegas, player props priced against DraftKings, '
  + 'a parlay builder and X\'s own bets, frozen at kickoff and graded in public.</p></div>\n'
  + '    <div class="hub-stamp">' + THEME_TOGGLE + '<span class="sub grow" id="saveState"></span><span class="sub" id="buildTag"></span></div>', 'heading');
html = sub1(html, '</style>\n</head>', '</style>\n<style>' + TAB_CSS + '</style>\n<style>' + ELO_CSS + '</style>\n<style>\n' + LIVE_SCOPED + '</style>\n<style>' + CARD_CSS + '</style>\n</head>', 'style block');
/* the tab bar: the prop model's tabs keep their sections and their ids, and get this page's
   names. One tab at a time: a section with no button here stays in the page, unshown. */
/* A betting tab is the betting app itself, one tab of it, in a frame: the app as
   betting/tools/build.js builds it is carried in this page as a string and set into the
   frame as its srcdoc when the tab is first opened, with the tab's name in front of it. No
   betting page exists on the site any more. A srcdoc frame is this page's own origin, so
   the app draws on the same browser store as ever (a bet logged there is logged here) and
   reads the season from betting/state.json and the Elo model from elo/data/model.json, both named
   from the site's root, where this page is (window.STATE_URL and window.ELO_URL: a srcdoc frame
   resolves an address against this page's). The frame takes the height of what it shows.
   Nothing is cached apart from this page: the frame's content is inside it. */
const { buildApp } = BETB;
/* the frame is handed the page's X Bet Log (window.XBETS, nflbets/build/xbets.js, which reads
   liveparlays/xbets.json): a srcdoc frame is this page's origin, so its parent is reachable. It is
   read only from its first paint (xbets-ro): no entry form, Remove, deposit box or backup card. */
const BET_APP = sub1(buildApp(), '<head>', "<head>\n<script>window.EMBED_TAB=null;window.STATE_URL='betting/state.json';window.ELO_URL='elo/data/model.json';"
  + "window.XBETS=window.XBETS||(function(){try{return window.parent!==window&&window.parent.XBETS||null;}catch(e){return null;}})();"
  + "if(window.XBETS)document.documentElement.classList.add('xbets-ro');"
  + "window.FRIENDS=window.FRIENDS||(function(){try{return window.parent!==window&&window.parent.FRIENDS||null;}catch(e){return null;}})();</script>", 'the head of the betting app');
for (const need of ['html.embed header,html.embed #tabs{display:none}', "classList.add('embed')", "fetch((window.ELO_URL||'../elo/data/model.json')+'?t='", 'data-tab="record"', 'data-tab="ratings"', 'data-tab="bets"', 'id="betSave"', 'window.STATE_URL||', 'window.XBETS.get()', 'html.xbets-ro #backupCard', '<h2>X Bet Log</h2>'])
  if (!BET_APP.includes(need)) throw new Error('the built betting app has no ' + need + ', which the framed tabs rely on');
for (const gone of ['index.html', 'admin.html']) if (fs.existsSync(path.join(ROOT, 'betting', gone)))
  throw new Error('betting/' + gone + ' exists; the betting site has no pages, its app is inside this one');
/* the app as a script string: JSON is JavaScript, once a closing script tag and a comment
   opener inside it are broken so the HTML parser does not act on them */
const BET_INLINE = JSON.stringify(BET_APP).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
/* the prop model's Track Record (Prop Record) is off the bar: its section stays in the page,
   unshown, since the prop model draws into it on every render */
const TABS = [
  ['pickems', 'Matchups'],
  ['slate', 'Props'],
  ['suggest', 'Suggested Parlays'],
  ['parlay', 'Parlay Builder'],
  ['xparlays', 'X Parlays'],
  ['ratings', 'Team Rankings', 'ratings'],
  ['elo', 'ELO Ratings'],
  ['record', "Pick'em Record", 'record'],
  ['bets', 'X Bet Log', 'bets'],
];
const NAV = `<nav role="tablist" id="tabs">\n` + TABS.map(([t, label], i) =>
  `    <button role="tab" data-tab="${t}"${i === 0 ? ' aria-selected="true"' : ''}>${label}</button>`).join('\n') + '\n  </nav>';
const FRAMES = TABS.filter(t => t[2]).map(([t, label, embed]) =>
  `<section id="tab-${t}" hidden><iframe class="pk-frame" data-embed="${embed}" title="${label}"></iframe></section>`).join('\n\n');
const navFrom = html.indexOf('<nav role="tablist" id="tabs">'), navTo = html.indexOf('</nav>', navFrom);
if (navFrom < 0 || navTo < 0) throw new Error('the tab bar is not where nflbets/build expects it in part1.html');
html = html.slice(0, navFrom) + NAV + html.slice(navTo + '</nav>'.length);
for (const [t] of TABS) if (t !== 'pickems' && t !== 'elo' && !t.match(/^(slate|suggest|parlay)$/) && html.includes(`id="tab-${t}"`))
  throw new Error(`the prop model already has a tab-${t} section; a framed tab cannot use that name`);
html = sub1(html, '<section id="tab-slate">', TAB_HTML + '\n\n' + FRAMES + '\n\n' + ELO_HTML + '\n\n<section id="tab-slate" hidden>', 'the Games section');
/* the Parlay Builder keeps the prop model's own section and its address, #parlay: the Top 100 lines and
   the choices they are built from over the builder (app v111; Suggested Parlays, #suggest, is the prop model's
   own section before it, each prime-time game's parlays and the Elo picks). X Parlays is a section of its own after it, #xparlays. The
   parlay card's window sits at the end of the page, outside every tab, over everything. */
html = sub1(html, '<section id="tab-parlay" hidden>\n  <div id="pbPanel"></div>\n  <div id="parlayBody"></div>\n</section>',
  '<section id="tab-parlay" hidden>\n  <div id="pbPanel"></div>\n  <div id="parlayBody"></div>\n</section>\n\n<section id="tab-xparlays" hidden>\n  ' + LIVE_SECTION + '\n</section>', 'the Parlay Builder section');
html = sub1(html, '\n</main>', '\n' + CARD_HTML + '\n</main>', "the parlay card's window");
if (!html.endsWith('<script>\n')) throw new Error('part1.html no longer ends by opening the app script');
/* the storage layer runs first: the prop model reads its state through it at boot; the X Bet
   Log's adapter right after it */
html = html.slice(0, -'<script>\n'.length) + '<script>\n' + STORAGE_JS + '\n</script>\n<script>\n' + XBETS_JS + '\n</script>\n<script>\n' + FRIENDS_JS + '\n</script>\n<script>\n';

/* the app, as assemble.py assembles it, its payload named from the site's root, where the page is. The
   builder's card of the betting model's own Bet Build parlays (renderBetParlays) ends on a link to
   ../betting/, the betting model's page, gone since its app went into this page; from the root it would
   leave the site, so the page drops it (the card says where they are settled without it) */
const APP = "let PAY=null;\nconst DATA_URL='props/data/payload.json';\n" + part2 + '\n'
  + sub1(part3, ' <a href="../betting/">Open the betting model</a></p>', '</p>', "the betting model's parlays' link to its retired page");
/* the public prop page's header note: when the data was last built, not "Autosaved" */
const NOTE = `<script>
/* which build of this page you are looking at. Without it there is no way to tell a page
   the browser cached last week from the one the job published this morning. APP_BUILD moves
   only with the prop model's parts; PAGE_HASH is the first seven hex of the page's own
   SHA-256 (taken with this placeholder in it), so a change to any source -- the Matchups tab,
   the X Parlays section, the parlay card, the storage layer, the X Bet Log, the betting app -- shows
   as a new tag. */
const PAGE_HASH='${HASH_SLOT}';
document.addEventListener('app-ready',()=>{ const bt=document.getElementById('buildTag');
  if(bt&&typeof APP_BUILD!=='undefined') bt.textContent=APP_BUILD+' \\u00b7 '+PAGE_HASH; });
(function(){
  const run=()=>{ const st=document.getElementById('saveState'); if(!st||typeof PAY==='undefined'||!PAY||!PAY.baked_at) return;
    const d=new Date(String(PAY.baked_at).length<=16?PAY.baked_at+'Z':PAY.baked_at); if(isNaN(d)) return;
    const txt='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const put=()=>{ if(st.textContent!==txt) st.textContent=txt; };
    put(); new MutationObserver(put).observe(st,{childList:true,characterData:true,subtree:true}); };
  document.addEventListener('app-ready',run); if(typeof PAY!=='undefined'&&PAY) run();
})();
</script>`;
let out = html + APP + '\n</script>\n' + NOTE + '\n' + LIVE_SCRIPT + '\n<script>' + CARD_JS + '</script>\n<script>\n/* the betting app, for the framed tabs; see frames() */\nconst BET_APP=' + BET_INLINE + ';\n</script>\n<script>' + js + '</script>\n<script>' + ELO_JS + '</script>\n</body>\n</html>\n';
/* no owner and no shared store: the retired Firebase layer (its database, sign-in and token
   services, the owner link, the shared key, the sync stamp) is nowhere in the page */
for (const gone of ['firebaseio', 'identitytoolkit', 'securetoken', 'ownerHash', 'NFLSYNC', 'LIVE_IO', 'sync.json', 'sign out of owner', 'Not synced', 'ownerMark', 'syncStamp', 'xpSignIn'])
  if (out.includes(gone)) throw new Error('the built page still has ' + gone + ': the shared store and the owner are retired');

/* the Game snapshot (snapshot.html, every name gs-): the window a tap on a Matchups game opens, with
   everything the site has on that game. Its styles go in after the others and its script runs
   last, after the Player Elo tab's, whose files (window.eloFiles) and Mismatches it reads; the
   board hands it the season, its own calls and the way to the game on the Props tab
   (window.pkBoard). The Deep Dive's rows and tags are deepdive.js's, a module of its own the news
   job requires too (news/tools/smoke.js holds them to the data there), set in as its own script just
   before the snapshot's: window.gsDeepDive. The news files it draws them from are fetched by the
   window, never read here */
{ const snap = rd('nflbets', 'build', 'snapshot.html');
  const SNAP_CSS = (snap.match(/<style>([\s\S]*?)<\/style>/) || [])[1], SNAP_JS = (snap.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
  if (!SNAP_CSS || !SNAP_JS) throw new Error('nflbets/build/snapshot.html has no <style> or <script> block');
  if (/(^|\n)(body|header|main|:root|\.card|\.btn|\.modal|\.modal-panel|table|th|td)\{/.test(SNAP_CSS)) throw new Error('a page-level rule in the snapshot styles');
  /* the Deep Dive's classes (dd, dtag) are not prefixed gs-: their rules stay inside the window */
  for (const rule of SNAP_CSS.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{/g) || [])
    if (/(^|[\s,>+~])\.(dd|dtag)/.test(rule) && rule.split(',').some(sel => /\.(dd|dtag)/.test(sel) && !/#gsModal\b/.test(sel)))
      throw new Error('a Deep Dive rule in the snapshot styles is not scoped to #gsModal: ' + rule.trim());
  for (const need of ['window.gameSnapshot=', 'window.pkBoard', 'window.eloFiles', 'window.eloMismatches', "'Escape'", 'window.gsDeepDive',
    "'news/data/units.json'", '`news/data/notes/${season}-w${week}.json`', "fetch(url,{cache:'no-store'})", 'data-gs-props=', 'P.openOnProps(id)', 'P.canProps(g.game_id)'])
    if (!SNAP_JS.includes(need)) throw new Error('nflbets/build/snapshot.html no longer has ' + need);
  /* the Stat breakdown went on 16 October 2026 (the owner's call: "get rid of stat breakdown section"), and
     with it the window's read of the news job's stats.json */
  for (const gone of ["news/data/stats.json'", 'statsFile', 'gsStats', 'statSplit'])
    if (SNAP_JS.includes(gone)) throw new Error('nflbets/build/snapshot.html draws the Stat breakdown again, or reads its file (' + gone + ')');
  for (const need of ['window.gameSnapshot(card.dataset.game,card)', 'tabindex="0" aria-haspopup="dialog"', 'window.pkBoard={', 'canProps,openOnProps};', 'ST.state=st;', "history.replaceState(null,'','#matchups')"])
    if (!js.includes(need)) throw new Error("the Matchups tab no longer opens the Game snapshot from a game's row, hands it the way to the Props tab, or lands #tracker and #pickems on the board as #matchups (" + need + ')');
  for (const gone of ['data-snap=', 'pk-gbody', 'aria-expanded'])
    if (js.includes(gone)) throw new Error("the Matchups tab still opens a game's row on buttons (" + gone + '): a tap on a game opens its Game snapshot');
  /* the board's foot says what a game's snapshot holds, so it must not name the card that went (16 October 2026) */
  if (/stat breakdown/i.test(js)) throw new Error("the Matchups tab still says a game's Game snapshot has a stat breakdown, which went on 16 October 2026");
  if (!ELO_JS.includes('window.eloFiles=()=>FILES;') || !ELO_JS.includes('window.eloMismatches=mismatches;')) throw new Error('the Player Elo tab no longer hands its files or its Mismatches to the Game snapshot');
  const DD_JS = rd('nflbets', 'build', 'deepdive.js');
  for (const need of ['root.gsDeepDive = API', 'function possession(', 'function headTag(', 'function applies(', 'function basis(', 'module.exports = API'])
    if (!DD_JS.includes(need)) throw new Error('nflbets/build/deepdive.js no longer has ' + need);
  if (/<\/script|<!--/i.test(DD_JS)) throw new Error('nflbets/build/deepdive.js has a closing script tag or a comment opener, which would end its script in the page');
  out = sub1(out, '</style>\n</head>', '</style>\n<style>' + SNAP_CSS + '</style>\n</head>', "the snapshot's styles");
  out = sub1(out, '</script>\n</body>\n</html>\n', '</script>\n<script>\n' + DD_JS + '</script>\n<script>' + SNAP_JS + '</script>\n</body>\n</html>\n', "the Deep Dive's and the snapshot's scripts");
  if (out.split('root.gsDeepDive = API').length !== 2) throw new Error('the Deep Dive is not in the page exactly once'); }
/* the matchup bubble (glance.js, every name glance-; the owner's call of 17 October 2026: "in the parlay builder, when
   i click on a player or a team, bring up a bubble pop up where it shows their matchup for the day so i can see info at
   a glance"): a leg's name on the Parlay Builder tab and on Suggested Parlays opens it. Its script runs last, after the
   Game snapshot's, whose readings (window.gsReadings) and window (window.gameSnapshot) it uses beside the ELO Ratings
   tab's (window.eloGlance, eloFiles, eloMismatches). The props parts draw a name as its button only where it is on the
   page (window.hubGlance), so the prop model's own page keeps plain names. It reads what the page has: it fetches
   nothing and keeps nothing */
{ const GL = rd('nflbets', 'build', 'glance.js');
  if (/<\/script|<!--/i.test(GL)) throw new Error('nflbets/build/glance.js has a closing script tag or a comment opener, which would end its script in the page');
  for (const need of ['window.hubGlance=', "setAttribute('role','dialog')", "setAttribute('aria-modal','false')", "setAttribute('aria-labelledby','glanceTitle')", "'Escape'",
    'window.gsReadings', 'window.eloGlance', 'window.gameSnapshot(', 'window.glanceLeg', "matchMedia('(max-width:640px)')"])
    if (!GL.includes(need)) throw new Error('nflbets/build/glance.js no longer has ' + need);
  for (const gone of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'localStorage', 'sessionStorage', 'indexedDB', 'window.storage', 'save('])
    if (GL.includes(gone)) throw new Error('nflbets/build/glance.js has ' + gone + ': the bubble reads what the page already has and keeps nothing');
  if (!/\nwindow\.gsReadings=\{recordOf,lineOf,callsOf,chanceOf,teamsOf,unitsOf\};\n/.test(rd('nflbets', 'build', 'snapshot.html'))) throw new Error('the Game snapshot no longer hands the matchup bubble its readings (window.gsReadings)');
  if (!ELO_JS.includes('window.eloGlance={trusted:muTrusted,labels:MU_LBL,unit:unitFaced,grade:mmGrade,outWhy};')) throw new Error('the Player Elo tab no longer hands the matchup bubble its readings (window.eloGlance)');
  for (const need of ['function glanceName(', "typeof window.hubGlance!=='function'", '${glanceName(l)}<small>', '${glanceName(l,prices[i])}'])
    if (!part3.includes(need)) throw new Error("the props parts no longer draw a leg's name as the matchup bubble's button (" + need + ')');
  out = sub1(out, '</script>\n</body>\n</html>\n', '</script>\n<script>\n' + GL + '</script>\n</body>\n</html>\n', "the matchup bubble's script");
  if (out.split('window.hubGlance=function').length !== 2) throw new Error('the matchup bubble is not in the page exactly once'); }
if (out.includes('id="tab-tracker"') || /nt-frame|data-tab="tracker"/.test(out)) throw new Error('the page still carries the Season Tracker tab');
/* the hub look (theme.css, the NBA Hub's and the NHL Hub's colours and type with the NFL's gold): laid
   over every other style, last, so it wins by order, with the hubs' two fonts, and handed to the
   framed betting tabs (window.THEME_FRAME_HEAD, set in front of each frame's own </head> by frames()
   in tab_pickems.html) */
{ const THEME = rd('nflbets', 'build', 'theme.css');
  if (/<\/style|<\/script|<!--/i.test(THEME)) throw new Error('nflbets/build/theme.css has a closing tag or a comment opener, which would end its block in the page');
  /* the light look (the owner's call of 17 October 2026): dark stays the look and the default, and
     html[data-theme="light"] is a palette of its own in the same file, so the page and every framed tab
     carry both. theme.js, in the head before anything is drawn, puts a light visitor's choice on the
     page before its first paint, and answers the switch in the header. Its one stored thing is the
     visitor's own choice under nflhub_theme_v1. */
  for (const need of ['html[data-theme="light"]{', '--gold-ink:', 'color-scheme:light', '.hub-theme{', 'html[data-theme="light"] .hub-theme .ht-moon{display:block}'])
    if (!THEME.includes(need)) throw new Error('nflbets/build/theme.css no longer has ' + need + ', which the light look relies on');
  if (/prefers-color-scheme/.test(THEME)) throw new Error("nflbets/build/theme.css follows the system's colour scheme: dark is every visitor's default, light only by the switch");
  const THEME_JS = rd('nflbets', 'build', 'theme.js');
  if (/<\/script|<!--/i.test(THEME_JS)) throw new Error('nflbets/build/theme.js has a closing script tag or a comment opener, which would end its script in the page');
  for (const need of ["KEY='nflhub_theme_v1'", "root.setAttribute('data-theme','light')", "closest('[data-theme-toggle]')", 'window.hubTheme=', "localStorage.getItem(KEY)==='light'"])
    if (!THEME_JS.includes(need)) throw new Error('nflbets/build/theme.js no longer has ' + need);
  { const uses = [...THEME_JS.matchAll(/localStorage\s*\.\s*(\w+)\s*\(([^,)]*)/g)];
    if (!uses.length || uses.some(m => !['getItem', 'setItem'].includes(m[1]) || m[2].trim() !== 'KEY') || (THEME_JS.match(/localStorage/g) || []).length !== uses.length)
      throw new Error("nflbets/build/theme.js uses this browser's storage for something other than the visitor's own light or dark choice (KEY)"); }
  for (const gone of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'window.storage', 'S.ui'])
    if (THEME_JS.includes(gone)) throw new Error('nflbets/build/theme.js has ' + gone + ': the look is kept in this browser alone, under its own key');
  out = sub1(out, '<title>NFL Hub</title>\n', '<title>NFL Hub</title>\n<script>\n' + THEME_JS + '</script>\n', "the light/dark script in the page's head");
  if (!out.includes('data-theme-toggle aria-label="Light mode" aria-pressed="false"')) throw new Error('the header has no light/dark switch');
  const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
  /* the hubs' fonts in place of the prop model's own, which nothing on the page draws in any more */
  out = sub1(out, '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' + FONTS, 'the fonts');
  const head = out.indexOf('</head>');
  if (head < 0 || head > out.indexOf('<body')) throw new Error('the page has no head of its own');
  out = out.slice(0, head) + '<style id="hubTheme">\n' + THEME + '</style>\n'
    + '<script>window.THEME_FRAME_HEAD=' + JSON.stringify(FONTS + '<style>' + THEME + '</style>').replace(/</g, '\\u003c') + ';</script>\n' + out.slice(head); }
/* the page is the site's root: nothing in it names a parent folder, which from there would leave the
   site (demon-x13.github.io/nfl-hub/../x is demon-x13.github.io/x). The one exception is the betting
   app's own fallback for its Elo model when it runs on its own, from betting/: in the page its frames
   are handed window.ELO_URL (above), so the fallback is never read */
{ const rest = out.split("window.ELO_URL||'../elo/data/model.json'");
  if (rest.length !== 2) throw new Error("the betting app does not read its Elo model from window.ELO_URL, once, with ../elo/data/model.json only as its own fallback");
  const all = rest.join(''), at = all.indexOf('../');
  if (at >= 0) throw new Error("the page names a parent folder, which from the site's root leaves the site: " + all.slice(Math.max(0, at - 60), at + 40)); }
/* the hash of the page with the slot still in it, then set into the slot: the smoke takes it
   out again and checks the page is what was hashed */
const HASH = crypto.createHash('sha256').update(out).digest('hex').slice(0, 7);
out = sub1(out, `const PAGE_HASH='${HASH_SLOT}';`, `const PAGE_HASH='${HASH}';`, 'the page hash');

module.exports = { out, hash: HASH, HASH_SLOT, PROP_KEY, SEASON: +SEASON_KEY[1] };
if (require.main === module) {
  fs.writeFileSync(path.join(ROOT, 'index.html'), out);
  console.log(`index.html (the site's root) written: ${(out.length / 1024).toFixed(1)} KB, build ${HASH} `
    + `(the prop model's page, ${BET.split('\n').length} lines lifted from the betting app for the board)`);
}
