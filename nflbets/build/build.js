/* Build the X NFL Bets and Stats page (nflbets/).
 *
 *   node nflbets/build/build.js        (from the hub root)
 *   require('./build.js')              the same build in memory, {out, pv, hash}, written
 *                                      nowhere: the smoke compares it with the published page
 *
 *   nflbets/index.html   the prop model's page with the Pick'ems board in front of it.
 *
 * The page is the prop model assembled the way props/build/assemble.py assembles it -- part1,
 * the payload fetch, part2, part3 -- because the tabs it is growing are the prop model's own
 * tabs, and a copy of a tab that size would be a second prop model to keep in step. Its
 * sections all stay in the page, listeners and all; only the tab buttons say which are shown.
 * The Pick'ems tab is set in front of them: its own section, styles and one closure, every
 * name prefixed pk- so nothing of it collides with the app around it.
 *
 * The board draws the betting app's row, so the betting app's tag and confidence-band code is
 * lifted from it at build time, the way betting/tools/build.js lifts from part2: the same
 * code, not a copy that can drift. It is scoped inside the closure because the prop model has
 * its own TEAM_COLORS and tag().
 *
 * Nothing is baked in. The page fetches props/data/payload.json, betting/state.json,
 * liveparlays/parlays.json, liveparlays/xbets.json and elo/data/*.json when it opens, so it is
 * rebuilt when a source changes, never when the data does. Neither site is touched. This page
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
/* the X Parlays section is the section page's own source, set into the X Parlays tab: X's
   parlays (liveparlays/parlays.json, read only on every device) at the top of the tab and the
   Parlay Builder under them. No device keeps a list of its own: visitors come to see X's
   parlays, and the builder finishes a parlay as a card to download (card.html, below), saved
   nowhere. Its styles are scoped to its card and its script runs in a closure, since the page
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
for (const need of ['window.XBETS=', "URL='../liveparlays/xbets.json'", "{cache:'no-store'}", 'function cleanWeek(', "replace(/[<>]/g,'')", 'function tidy('])
  if (!XBETS_JS.includes(need)) throw new Error('nflbets/build/xbets.js no longer has ' + need);
/* nothing on the page writes anywhere but this browser: the two scripts send no request but the
   X Bet Log file's read */
for (const [name, src] of [['storage.js', STORAGE_JS], ['xbets.js', XBETS_JS]])
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
for (const need of ["'../elo/data/players.json'", "'../elo/data/model.json'", 'window.pkTag', 'window.pkTierBadge', 'window.pkTierDefs'])
  if (!ELO_JS.includes(need)) throw new Error('tab_elo.html no longer has ' + need);
for (const f of ['players.json', 'model.json']) if (!fs.existsSync(path.join(ROOT, 'elo', 'data', f)))
  throw new Error('elo/data/' + f + ' is missing: run python3 elo/build.py first');
if (/(^|\n)(body|header|main|:root|\.card|\.bar|table)\{/.test(ELO_CSS)) throw new Error('a page-level rule in the Elo tab styles');

/* the betting app's colour table, tag() and the contrast maths behind it, and its confidence
   bands: cut where its walk-forward record changes, so a second copy here would drift off them */
const BET = [
  lift(betting, 'const TEAM_COLORS=', '\n', 'team colours'),
  lift(betting, 'function hex2rgb(', 'function predict(', 'tag colours and tag()'),
  lift(betting, 'function tier(', 'function statsFromRow', 'betting confidence bands'),
  /* the Elo tiers and their shields, so a player's rating wears the same badge a team's does */
  require(path.join(ROOT, 'betting', 'tools', 'tiers.js'))(lift(betting, 'const TIERS=', 'function tierLegend(', 'Elo tiers and shields'), 'the Bets and Stats page'),
].join('\n');
for (const need of ['function tag(', 'function tagColor(', 'const PROB_HI', 'function tier(', 'function eloTier(', 'function tierBadge(', 'const TIER_DEFS'])
  if (!BET.includes(need)) throw new Error('the lifted betting block is missing ' + need);
const BET_NS = `const BET=(()=>{\n${BET}\nreturn {tag,tagColor,tier,PROB_HI,PROB_LO,eloTier,tierBadge,TIER_DEFS};\n})();`;
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
for (const need of ['#lpCard .savedp{', '#lpCard .sp-leg{', '#lpCard .pbar{', '#lpCard .gm{', '#lpCard .lp-upd{'])
  if (!LIVE_SCOPED.includes(need)) throw new Error('the scoped live styles lost ' + need);
if (/(^|\n)(body|header|main|:root)\{/.test(LIVE_SCOPED)) throw new Error('a page-level live rule survived scoping');
const lsub = (from, to, what) => { LIVE_JS = sub1(LIVE_JS, from, to, 'the live script: ' + what); };
lsub("const DATA='parlays.json';", "const DATA='../liveparlays/parlays.json';", 'file path');
/* the section draws once the model is up (a leg's injury word and player ids are the model's) */
/* lp-, not live-: the prop model has a liveRefresh of its own, and a global by that name
   would replace it */
lsub("draw(); refresh();", "window.lpDraw=draw; window.lpRefresh=refresh; draw(); refresh();", 'boot');
for (const need of ['function readFile(', 'o.cleared===true', 'const updatedOf=', "{cache:'no-store'}", 'function espnWeek(', 'function drawList(', "getElementById('lpUpdated')"])
  if (!LIVE_JS.includes(need)) throw new Error('the live script no longer has ' + need + ', which the section relies on');
/* one list, X's, from the file, read only on every device: nothing of the section reads, draws or
   writes a browser's own parlays, and nothing on it changes X's */
for (const gone of ['MY_KEY', 'myCard', 'myApp', 'LISTS.', 'LIVE_IO', 'NFLSYNC', 'lpOwner', 'lpKeep', 'localStorage', 'data-rm', 'data-edit', 'data-stake-of', 'data-reset', "id=\"clear\"", 'propState', 'S.saved'])
  if (LIVE_JS.includes(gone) || LIVE_BAR.includes(gone)) throw new Error('the live section still has ' + gone + ': X Parlays is the file, read only, on every device');
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
/* the builder's save, which every device turns into Finish: the button, its rule, its label, and
   the suggestion tiers' save */
for (const need of ['const canSave=wks.length===1&&(realPrice||estPrice);', "id=\"pSave\" ${canSave?'':'disabled'}", 'Legs must all be from the same week to save', '>Save and lock this parlay</button>', "'Add to saved parlays'", 'data-suggest-save="${t.id}"'])
  if (!part3.includes(need)) throw new Error("the builder's save moved (" + need + "); the parlay card stands in for it on every device");
CARD_JS = sub1(CARD_JS, '/*QUOTE*/', QUOTE, "the card's QUOTE slot");
for (const need of ['window.PARLAY_CARD=', "const SITE='demon-x13.github.io/nfl-hub/nflbets';", 'function finishBuilder(', 'function finishTiers(', "$('pSave')", '[data-suggest-save],[data-elo-save]', 'c.toBlob(', "'image/png'", 'URL.createObjectURL(', 'navigator.share(', "nb.textContent='Finish parlay'"])
  if (!CARD_JS.includes(need)) throw new Error('nflbets/build/card.html no longer has ' + need);
/* Finish on every device: nothing in the card asks whose device it is */
for (const gone of ['lpOwner', 'NFLSYNC', 'visitor('])
  if (CARD_JS.includes(gone)) throw new Error('nflbets/build/card.html still has ' + gone + ': the builder finishes a parlay on every device');
for (const need of ['function parlayLegs', 'function parlayProb', 'function legPrice', 'function parlayDec', 'const sameGame', 'function probToAmerican', 'function mlToDec', 'function decToML', 'function kickoff', 'function save(', 'let SUGGEST_CACHE'])
  if (!(part2 + part3).includes(need)) throw new Error('the prop model no longer defines ' + need + ', which the parlay card uses');
{ const elo = rd('nflbets', 'build', 'tab_elo.html');
  if (!elo.includes('data-elo-save="${t.id}"') || !elo.includes('window.eloPicks=eloPicks;'))
    throw new Error("the Elo picks' save or window.eloPicks moved; the parlay card finishes an Elo pick on every device"); }
/* X Parlays: X's parlays from the file, at the top of the tab, read only; a quiet line under the
   heading says when the file last changed them */
const LIVE_SECTION = `<div class="card" id="lpCard">
    <h2>X Parlays</h2>
    ${LIVE_BAR}
    <div id="app"></div>
  </div>`;
const LIVE_SCRIPT = `<script>
/* the X Parlays section: liveparlays/build/page.html, in a closure. Names it shares with
   the prop model -- esc, num, fmtML -- are its own copies inside it. */
(function(){
${LIVE_JS}
})();
/* the Saved parlays card and the betting-slips card are drawn nowhere: X Parlays is X's, from the
   file, and a browser's own saved parlays are not drawn. The builder keeps its place under X's
   card, and after every redraw it gets Finish parlay where Save was (the parlay card). The section
   draws again once the prop model is up, for the injury word and player ids its legs read. */
renderSaved=function(){ return ''; };
renderBetParlays=function(){ return ''; };
{ const drawParlay=renderParlay;
  renderParlay=function(){ const r=drawParlay.apply(this,arguments);
    try{ if(window.PARLAY_CARD) window.PARLAY_CARD.finishBuilder(); }catch(e){}
    return r; }; }
document.addEventListener('app-ready',()=>{ if(window.lpDraw) window.lpDraw(); });
</script>`;

/* the prop model's page, re-headed */
let html = part1;
html = sub1(html, '<title>X NFL Prop Model</title>', '<title>X NFL Bets and Stats</title>', 'title');
html = sub1(html, '<h1>X NFL Prop Model</h1>', '<h1>X NFL Bets and Stats</h1>', 'heading');
html = sub1(html, '</style>\n</head>', '</style>\n<style>' + TAB_CSS + '</style>\n<style>' + ELO_CSS + '</style>\n<style>\n' + LIVE_SCOPED + '</style>\n<style>' + CARD_CSS + '</style>\n</head>', 'style block');
/* the tab bar: the prop model's tabs keep their sections and their ids, and get this page's
   names. One tab at a time: a section with no button here stays in the page, unshown. */
/* A betting tab is the betting app itself, one tab of it, in a frame: the app as
   betting/tools/build.js builds it is carried in this page as a string and set into the
   frame as its srcdoc when the tab is first opened, with the tab's name in front of it. No
   betting page exists on the site any more. A srcdoc frame is this page's own origin, so
   the app draws on the same browser store as ever (a bet logged there is logged here) and
   reads the season from ../betting/state.json. The frame takes the height of what it shows.
   Nothing is cached apart from this page: the frame's content is inside it. */
const { buildApp } = BETB;
/* the frame is handed the page's X Bet Log (window.XBETS, nflbets/build/xbets.js, which reads
   liveparlays/xbets.json): a srcdoc frame is this page's origin, so its parent is reachable. It is
   read only from its first paint (xbets-ro): no entry form, Remove, deposit box or backup card. */
const BET_APP = sub1(buildApp(), '<head>', "<head>\n<script>window.EMBED_TAB=null;window.STATE_URL='../betting/state.json';"
  + "window.XBETS=window.XBETS||(function(){try{return window.parent!==window&&window.parent.XBETS||null;}catch(e){return null;}})();"
  + "if(window.XBETS)document.documentElement.classList.add('xbets-ro');</script>", 'the head of the betting app');
for (const need of ['html.embed header,html.embed #tabs{display:none}', "classList.add('embed')", 'data-tab="record"', 'data-tab="ratings"', 'data-tab="bets"', 'id="betSave"', 'window.STATE_URL||', 'window.XBETS.get()', 'html.xbets-ro #backupCard', '<h2>X Bet Log</h2>'])
  if (!BET_APP.includes(need)) throw new Error('the built betting app has no ' + need + ', which the framed tabs rely on');
for (const gone of ['index.html', 'admin.html']) if (fs.existsSync(path.join(ROOT, 'betting', gone)))
  throw new Error('betting/' + gone + ' exists; the betting site has no pages, its app is inside this one');
/* the app as a script string: JSON is JavaScript, once a closing script tag and a comment
   opener inside it are broken so the HTML parser does not act on them */
const BET_INLINE = JSON.stringify(BET_APP).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
/* the prop model's Track Record (Prop Record) is off the bar: its section stays in the page,
   unshown, since the prop model draws into it on every render */
const TABS = [
  ['pickems', "Pick'ems"],
  ['slate', 'Props'],
  ['parlay', 'X Parlays'],
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
for (const [t] of TABS) if (t !== 'pickems' && t !== 'elo' && !t.match(/^(slate|parlay)$/) && html.includes(`id="tab-${t}"`))
  throw new Error(`the prop model already has a tab-${t} section; a framed tab cannot use that name`);
html = sub1(html, '<section id="tab-slate">', TAB_HTML + '\n\n' + FRAMES + '\n\n' + ELO_HTML + '\n\n<section id="tab-slate" hidden>', 'the Games section');
/* X Parlays at the top of its tab and the builder under it. The tab keeps its address, #parlay.
   The parlay card's window sits at the end of the page, outside every tab, over everything. */
html = sub1(html, '<section id="tab-parlay" hidden>\n  <div id="parlayBody"></div>', '<section id="tab-parlay" hidden>\n  ' + LIVE_SECTION + '\n  <div id="parlayBody"></div>', 'the Parlay Builder section');
html = sub1(html, '\n</main>', '\n' + CARD_HTML + '\n</main>', "the parlay card's window");
if (!html.endsWith('<script>\n')) throw new Error('part1.html no longer ends by opening the app script');
/* the storage layer runs first: the prop model reads its state through it at boot; the X Bet
   Log's adapter right after it */
html = html.slice(0, -'<script>\n'.length) + '<script>\n' + STORAGE_JS + '\n</script>\n<script>\n' + XBETS_JS + '\n</script>\n<script>\n';

/* the app, as assemble.py assembles it, one directory further from its payload */
const APP = "let PAY=null;\nconst DATA_URL='../props/data/payload.json';\n" + part2 + '\n' + part3;
/* the public prop page's header note: when the data was last built, not "Autosaved" */
const NOTE = `<script>
/* which build of this page you are looking at. Without it there is no way to tell a page
   the browser cached last week from the one the job published this morning. APP_BUILD moves
   only with the prop model's parts; PAGE_HASH is the first seven hex of the page's own
   SHA-256 (taken with this placeholder in it), so a change to any source -- the Pick'ems tab,
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

/* the Game snapshot (snapshot.html, every name gs-): the window an opened Pick'ems game opens, with
   everything the site has on that game. Its styles go in after the others and its script runs
   last, after the Player Elo tab's, whose files (window.eloFiles) and Mismatches it reads; the
   board hands it the season and its own calls (window.pkBoard) */
{ const snap = rd('nflbets', 'build', 'snapshot.html');
  const SNAP_CSS = (snap.match(/<style>([\s\S]*?)<\/style>/) || [])[1], SNAP_JS = (snap.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
  if (!SNAP_CSS || !SNAP_JS) throw new Error('nflbets/build/snapshot.html has no <style> or <script> block');
  if (/(^|\n)(body|header|main|:root|\.card|\.btn|\.modal|\.modal-panel|table|th|td)\{/.test(SNAP_CSS)) throw new Error('a page-level rule in the snapshot styles');
  for (const need of ['window.gameSnapshot=', 'window.pkBoard', 'window.eloFiles', 'window.eloMismatches', "'Escape'"])
    if (!SNAP_JS.includes(need)) throw new Error('nflbets/build/snapshot.html no longer has ' + need);
  for (const need of ['data-snap="${esc(g.game_id)}"', 'window.gameSnapshot(b.dataset.snap,b)', 'window.pkBoard={', 'ST.state=st;'])
    if (!js.includes(need)) throw new Error("the Pick'ems tab no longer opens the Game snapshot (" + need + ')');
  if (!ELO_JS.includes('window.eloFiles=()=>FILES;') || !ELO_JS.includes('window.eloMismatches=mismatches;')) throw new Error('the Player Elo tab no longer hands its files or its Mismatches to the Game snapshot');
  out = sub1(out, '</style>\n</head>', '</style>\n<style>' + SNAP_CSS + '</style>\n</head>', "the snapshot's styles");
  out = sub1(out, '</script>\n</body>\n</html>\n', '</script>\n<script>' + SNAP_JS + '</script>\n</body>\n</html>\n', "the snapshot's script"); }
/* the hash of the page with the slot still in it, then set into the slot: the smoke takes it
   out again and checks the page is what was hashed */
const HASH = crypto.createHash('sha256').update(out).digest('hex').slice(0, 7);
out = sub1(out, `const PAGE_HASH='${HASH_SLOT}';`, `const PAGE_HASH='${HASH}';`, 'the page hash');

/* the preview: the same page in the NBA Hub's look, beside the real one so every relative
   address still works. Only preview_theme.css (laid over everything, last) and the wordmark's
   markup differ, so the preview is the live page and nothing else. */
let pv;
{
  const THEME = fs.readFileSync(path.join(__dirname, 'preview_theme.css'), 'utf8');
  const once = (s, a, b, what) => { if (s.split(a).length !== 2) throw new Error('preview: ' + what + ' is not in the page once'); return s.replace(a, b); };
  pv = out;
  const head = pv.indexOf('</head>');
  if (head < 0 || head > pv.indexOf('<body')) throw new Error('preview: the page has no head of its own');
  const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
  pv = pv.slice(0, head) + FONTS + '\n<style id="previewTheme">\n' + THEME + '</style>\n'
    + '<script>window.PREVIEW_FRAME_HEAD=' + JSON.stringify(FONTS + '<style>' + THEME + '</style>').replace(/</g, '\\u003c') + ';</script>\n' + pv.slice(head);
  pv = once(pv, '<h1>X NFL Bets and Stats</h1>', '<h1>X NFL <em>Bets and Stats</em></h1>', 'the heading');
  pv = once(pv, '<span class="sub" id="buildTag"></span>', '<span class="sub" id="buildTag"></span><span class="pv-flag">Preview</span>', 'the build tag');
  pv = once(pv, '<title>X NFL Bets and Stats</title>', '<title>X NFL Bets and Stats (preview)</title>', 'the title');
}
module.exports = { out, pv, hash: HASH, HASH_SLOT, PROP_KEY, SEASON: +SEASON_KEY[1] };
if (require.main === module) {
  fs.writeFileSync(path.join(ROOT, 'nflbets', 'index.html'), out);
  fs.writeFileSync(path.join(ROOT, 'nflbets', 'preview.html'), pv);
  console.log(`nflbets/index.html written: ${(out.length / 1024).toFixed(1)} KB, build ${HASH} `
    + `(the prop model's page, ${BET.split('\n').length} lines lifted from the betting app for the board)`);
}
