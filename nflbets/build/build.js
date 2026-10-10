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
 * liveparlays/parlays.json, elo/data/*.json and nflbets/sync.json when it opens, so it is
 * rebuilt when a source changes, never when the data does. Neither site is touched. This page
 * reads what they publish.
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
   parlays at the top of the tab and the Parlay Builder under them. There is no list of a
   visitor's own: visitors come to see X's parlays. On the owner's devices a parlay saved in the
   builder is X's and is watched in X's card the moment it is saved; on anyone else's the builder
   finishes a parlay as a card to download (card.html, below), saved nowhere. Its styles are
   scoped to its card and its script runs in a closure, since the page around it defines most
   of the same names for itself. */
const livePage = rd('liveparlays', 'build', 'page.html');
/* the parlay card: a visitor's finished parlay in a window, downloadable as an image. Its own
   styles, window and script, every name prefixed pc-; the builder's pricing is lifted into it
   from part3's renderParlay (its QUOTE slot), so the card prices a parlay exactly as the
   builder shows it, never with a copy that can drift */
const cardSrc = rd('nflbets', 'build', 'card.html');
/* the sync layer: one shared document for X's builder, saved parlays, corrected lines and
   deletions, read by every device and written by X's alone (the owner link, or Firebase sign-in).
   It runs before the prop model, which saves through the window.storage it defines; the
   section's key goes through window.LIVE_IO. Its address and who the owner is are read from
   nflbets/sync.json at run time, never built in. The X Bet Log's adapter (xbets.js) runs right
   after it and hands the betting app's frames X's log. */
/* the season and the prop model's storage key are part2's, one place: the sync layer and the
   X Parlays section are handed that key at build time, so a new season is a new key in
   part2.js and nowhere else */
const SEASON_KEY = part2.match(/const SEASON=(\d{4}), KEY='([^']+)';/);
if (!SEASON_KEY) throw new Error("the prop model's SEASON and storage KEY are not where nflbets/build expects them in part2.js");
const PROP_KEY = SEASON_KEY[2];
/* the betting app's own key and season (betting/tools/build.js reads them from the app): the sync
   layer publishes X's betting slips from that key, and the X Bet Log is that season's */
const BETB = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
if (!/^x_nfl_viewer_picks_\d{4}$/.test(BETB.BET_KEY)) throw new Error('betting/tools/build.js no longer exports the betting app\'s own key');
/* the prop model reads the betting slips from the same key (part2's BET_KEY): two names for one
   key would leave X Parlays without the slips the sync layer publishes */
{ const m = part2.match(/const BET_KEY='([^']+)';/);
  if (!m || m[1] !== BETB.BET_KEY) throw new Error(`part2.js reads the betting slips from ${m ? m[1] : 'no BET_KEY'}, the betting app keeps them under ${BETB.BET_KEY}: move part2's BET_KEY to the app's season with a props patch`); }
let SYNC_JS = sub1(rd('nflbets', 'build', 'sync.js'), /\/\*PROP_KEY\*\/'[^']*'/, '/*PROP_KEY*/' + JSON.stringify(PROP_KEY), "the sync layer's PROP_KEY");
SYNC_JS = sub1(SYNC_JS, /\/\*BET_KEY\*\/'[^']*'/, '/*BET_KEY*/' + JSON.stringify(BETB.BET_KEY), "the sync layer's BET_KEY");
/* who may write: the owner link's hash, Firebase's key and the owner's uid, read from sync.json at
   run time; the owner's token on every write; the role the section and the frames ask for */
for (const need of ['window.storage=', 'window.LIVE_IO=', "LIVE_KEY='live_parlays_v1'", "CONF='sync.json'", "s('ownerHash')", "s('apiKey')", "s('owner')",
  "'&auth='+encodeURIComponent(tok)", "await write(st.url,{method:'PUT'", "PUT_MS,'parlays');", 'role:()=>st.role', 'function clean(v,d)', "const BAD=/[<>\"`]/g;", 'doc:clean({prop:propPart(doc.prop), live:livePart(doc.live)})', "'SHA-256'", "history.replaceState(null,'',location.pathname+location.search+'#parlay')", 'migrateReader('])
  if (!SYNC_JS.includes(need)) throw new Error('nflbets/build/sync.js no longer has ' + need);
const XBETS_JS = sub1(rd('nflbets', 'build', 'xbets.js'), /\/\*SEASON\*\/\d{4}/, '/*SEASON*/' + BETB.SEASON, "the X Bet Log's season");
for (const need of ['window.XBETS=', "SYNC.write(docUrl(),{method:'PATCH'", "},null,'xbets');", "conf().betsUrl+'/'+SEASON", 'function cleanWeek(', "replace(/[<>]/g,'')", "PENDING='xbets_pending_'+SEASON", 'function keepPre('])
  if (!XBETS_JS.includes(need)) throw new Error('nflbets/build/xbets.js no longer has ' + need);
const SYNC_CONF = JSON.parse(rd('nflbets', 'sync.json'));
if (SYNC_CONF.ownerHash && !/^[0-9a-f]{64}$/.test(SYNC_CONF.ownerHash)) throw new Error('nflbets/sync.json: ownerHash is not a SHA-256 in hex');
if (!!SYNC_CONF.apiKey !== !!SYNC_CONF.owner) throw new Error('nflbets/sync.json: Firebase sign-in needs both apiKey and owner (the uid), or neither');
if (!part2.includes('if(window.storage){const r=await window.storage.get(KEY,false)')) throw new Error('the prop model no longer reads through window.storage, which the sync layer relies on');
if (!fs.existsSync(path.join(ROOT, 'nflbets', 'sync.json'))) throw new Error('nflbets/sync.json is missing: the page reads the store address from it');

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
const LIVE_BAR = lpiece(/<main>\s*(<div class="bar">[\s\S]*?<\/div>)\s*<noscript>/, 'control bar');
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
for (const need of ['#lpCard .savedp{', '#lpCard .sp-leg{', '#lpCard .pbar{', '#lpCard .gm{', '#lpCard .hidebtn{'])
  if (!LIVE_SCOPED.includes(need)) throw new Error('the scoped live styles lost ' + need);
if (/(^|\n)(body|header|main|:root)\{/.test(LIVE_SCOPED)) throw new Error('a page-level live rule survived scoping');
const lsub = (from, to, what) => { LIVE_JS = sub1(LIVE_JS, from, to, 'the live script: ' + what); };
lsub("const DATA='parlays.json';", "const DATA='../liveparlays/parlays.json';", 'file path');
LIVE_JS = sub1(LIVE_JS, /\/\*PROP_KEY\*\/'[^']*'/, '/*PROP_KEY*/' + JSON.stringify(PROP_KEY), "the live script: the prop model's key");
/* the section redraws whenever the prop model redraws its builder, and once the model is up */
/* lp-, not live-: the prop model has a liveRefresh of its own, and a global by that name
   would replace it */
lsub("draw(); refresh();", "window.lpDraw=draw; window.lpRefresh=refresh; draw(); refresh();", 'boot');
for (const need of ['function propState', "typeof S==='object'&&S&&Array.isArray(S.saved)", 'function removeParlay', 'S.saved=S.saved.filter', 'function restoreAll', 'window.LIVE_IO', 'const editable=()=>ownerHere();', 'function writeStore(L,st){ if(!editable(L)) return false;', 'window.lpKeep=', 'window.lpOwner=ownerHere;', "if(!ownerHere()||typeof S!=='object'", 'function espnWeek(', 'function drawList(L)'])
  if (!LIVE_JS.includes(need)) throw new Error('the live script no longer has ' + need + ', which the section relies on');
/* one list: X's. Nothing of the section reads, draws or writes a visitor's own list any more */
for (const gone of ["MY_KEY", 'myCard', 'myApp', 'LISTS.my'])
  if (LIVE_JS.includes(gone)) throw new Error('the live script still has ' + gone + ': a visitor has no list of their own');
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
/* the builder's save, which a visitor's device turns into Finish: the button, its rule, its label,
   and the suggestion tiers' save */
for (const need of ['const canSave=wks.length===1&&(realPrice||estPrice);', "id=\"pSave\" ${canSave?'':'disabled'}", 'Legs must all be from the same week to save', '>Save and lock this parlay</button>', "'Add to saved parlays'", 'data-suggest-save="${t.id}"'])
  if (!part3.includes(need)) throw new Error("the builder's save moved (" + need + "); the parlay card stands in for it on a visitor's device");
CARD_JS = sub1(CARD_JS, '/*QUOTE*/', QUOTE, "the card's QUOTE slot");
for (const need of ['window.PARLAY_CARD=', "const SITE='demon-x13.github.io/nfl-hub/nflbets';", 'function finishBuilder(', 'function finishTiers(', "$('pSave')", '[data-suggest-save],[data-elo-save]', 'c.toBlob(', "'image/png'", 'URL.createObjectURL(', 'navigator.share(', 'window.lpOwner'])
  if (!CARD_JS.includes(need)) throw new Error('nflbets/build/card.html no longer has ' + need);
for (const need of ['function parlayLegs', 'function parlayProb', 'function legPrice', 'function parlayDec', 'const sameGame', 'function probToAmerican', 'function mlToDec', 'function decToML', 'function kickoff', 'function save(', 'let SUGGEST_CACHE'])
  if (!(part2 + part3).includes(need)) throw new Error('the prop model no longer defines ' + need + ', which the parlay card uses');
{ const elo = rd('nflbets', 'build', 'tab_elo.html');
  if (!elo.includes('data-elo-save="${t.id}"') || !elo.includes('window.eloPicks=eloPicks;'))
    throw new Error("the Elo picks' save or window.eloPicks moved; the parlay card finishes an Elo pick on a visitor's device"); }
/* X Parlays: the owner's parlays, at the top of the tab, with the owner's mark and controls and
   the Firebase sign-in box (shown only when sync.json sets it up) */
const LIVE_SECTION = `<div class="card" id="lpCard">
    <h2 style="display:flex;align-items:center;gap:10px">X Parlays<span class="grow" style="flex:1"></span><span class="xp-own" id="xpOwner" hidden>owner</span><button type="button" class="xp-link" id="xpSignIn" hidden>Owner sign-in</button><button type="button" class="xp-link" id="xpSignOut" hidden>sign out of owner</button></h2>
    <p class="muted xp-sub" id="xpSub"></p>
    <form class="xp-signin" id="xpSignInBox" hidden autocomplete="on">
      <input type="email" id="xpEmail" autocomplete="username" placeholder="email" required>
      <input type="password" id="xpPass" autocomplete="current-password" placeholder="password" required>
      <button class="btn" type="submit" id="xpSignInGo">Sign in</button><button class="btn quiet" type="button" id="xpSignInCancel">Cancel</button>
      <span class="muted" id="xpSignInMsg"></span>
    </form>
    ${LIVE_BAR}
    <div id="app"></div>
  </div>`;
const LIVE_SCRIPT = `<script>
/* the X Parlays section: liveparlays/build/page.html, in a closure. Names it shares with
   the prop model -- esc, num, fmtML -- are its own copies inside it. */
(function(){
${LIVE_JS}
})();
/* the Saved parlays card and the betting-slips card it also covered are drawn by the section
   now, as X's, and on a visitor's device not at all; the builder keeps its place above it and the
   section follows every redraw. Before each redraw the owner's device keeps a copy of a builder
   about to lose a leg to a kickoff (lpKeep), so a parlay bet and never locked is still watched
   once its first game starts. After it, a visitor's builder gets Finish parlay where Save was
   (the parlay card). */
renderSaved=function(){ return ''; };
renderBetParlays=function(){ return ''; };
{ const drawParlay=renderParlay;
  renderParlay=function(){ try{ if(window.lpKeep) window.lpKeep(); }catch(e){}
    const r=drawParlay.apply(this,arguments);
    try{ if(window.PARLAY_CARD) window.PARLAY_CARD.finishBuilder(); }catch(e){}
    if(window.lpDraw) window.lpDraw(); return r; }; }
document.addEventListener('app-ready',()=>{ if(window.lpDraw) window.lpDraw(); });
/* the sync stamp, in the X Parlays card (the parlays are what it syncs; the header keeps only
   when the site's data was updated, and the owner's mark). On a reader's device: X's parlays
   and when X last changed them, or that the store cannot be reached and the copy shown is the
   last one seen. On the owner's: synced and when, saving, failed and retrying, or held until
   the device is signed in again. With no store: this browser only. When this page last checked
   is in its tooltip. The owner's mark, sign-out and (with Firebase set up) sign-in follow it. */
(function(){
  const el=document.getElementById('syncStamp'); if(!el||!window.NFLSYNC) return;
  const $=id=>document.getElementById(id);
  const when=iso=>{ const d=new Date(iso); return isNaN(d)?'':d.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}); };
  const clock=iso=>{ const d=new Date(iso); return isNaN(d)?'':d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'}); };
  /* changed: when the shared document last moved, on any device. checked: when this page
     last heard from the store, so a page that has stopped looking can be told from one
     with nothing new to show. */
  const put=s=>{ let t, cls='';
    const owner=s.role==='owner'&&!!s.url;
    if(!s.url){ t=s.err&&!/HTTP 404/.test(s.err)?'Not synced: '+s.err:'Not synced \u2014 this browser only'; cls='off'; }
    else if(!owner){
      if(s.ok===false){ t=s.cached?'Not synced \u2014 X\u2019s parlays as this browser last saw them, '+when(s.cached):'Not synced \u2014 X\u2019s parlays could not be reached; retrying'; cls='bad'; }
      else if(!s.applied){ t='Connecting\u2026'; }
      else { t='X\u2019s parlays'+(s.at?' \u00b7 updated '+when(s.at):''); cls='ok'; }
    }
    else if(s.blocked){ t=s.blocked==='signin'?'Not published \u2014 sign in to publish your changes':'Not published \u2014 the store refused the change'; cls='bad'; }
    else if(s.ok===false){ t='Sync failed \u2014 retrying'; cls='bad'; }
    else if(s.pending){ t='Saving\u2026'; cls='ok'; }
    else if(!s.applied){ t='Connecting\u2026'; }
    else { t=(s.signedIn?'Signed in \u00b7 ':'')+'Synced'+(s.at?' \u00b7 last change '+when(s.at):''); cls='ok'; }
    el.textContent=t; el.dataset.state=cls;
    el.title=(!s.url?'nflbets/sync.json has no store address, so X Parlays shows only the placed parlays in the repository'
      :(owner?'What you change here is what every device shows':'X\u2019s parlays, the same on every device')+(s.checked?'; this page last checked at '+clock(s.checked):''))
      +(s.ok===false&&s.err?' ('+s.err+')':'')+(s.ownerMsg?' ('+s.ownerMsg+')':'');
    /* the owner's mark and controls */
    const mark=$('ownerMark'), pill=$('xpOwner'), out=$('xpSignOut'), inn=$('xpSignIn'), sub=$('xpSub');
    if(mark) mark.hidden=!owner;
    if(pill) pill.hidden=!owner;
    if(out){ out.hidden=!owner; out.textContent=s.signedIn?'sign out':'sign out of owner'; }
    /* sign-in, offered when either document's writes wait for it (the X Bet Log's note sends the owner here) */
    const lapsed=s.blocked==='signin'||!!(s.blocks&&s.blocks.xbets==='signin');
    if(inn){ inn.hidden=!(s.url&&s.enforced&&(!owner||!s.signedIn||lapsed)); inn.textContent=owner?'sign in':'Owner sign-in'; }
    if(sub) sub.textContent=!s.url?'X\u2019s placed parlays, from the repository.'
      :(owner?'Yours, as every visitor sees them: what you change here changes for everyone.'
        :'What X placed, saved and is building, followed live: the same on every device, read only.')
      +(s.ownerMsg&&!owner?' ('+s.ownerMsg+')':'');
  };
  NFLSYNC.onChange(put); put(NFLSYNC.state());
  const box=$('xpSignInBox'), msg=$('xpSignInMsg');
  const open=v=>{ if(!box) return; box.hidden=!v; if(msg) msg.textContent=''; if(v){ const e=$('xpEmail'); if(e) e.focus(); } };
  if($('xpSignIn')) $('xpSignIn').addEventListener('click',()=>open(box.hidden));
  if($('xpSignInCancel')) $('xpSignInCancel').addEventListener('click',()=>open(false));
  if(box) box.addEventListener('submit',async e=>{ e.preventDefault();
    const pw=$('xpPass'); msg.textContent='Signing in\u2026';
    try{ await NFLSYNC.signIn($('xpEmail').value,pw.value); pw.value=''; msg.textContent='Signed in'; box.hidden=true; }
    catch(err){ pw.value=''; msg.textContent=String(err&&err.message||err); } });
  if($('xpSignOut')) $('xpSignOut').addEventListener('click',()=>{
    if(confirm('Sign this device out of owner? It stops publishing: X Parlays and the X Bet Log become read only here, and the parlays it holds that are X\u2019s stay under X Parlays.')) NFLSYNC.signOut(); });
})();
</script>`;

/* the prop model's page, re-headed */
let html = part1;
html = sub1(html, '<title>X NFL Prop Model</title>', '<title>X NFL Bets and Stats</title>', 'title');
html = sub1(html, '<h1>X NFL Prop Model</h1>', '<h1>X NFL Bets and Stats</h1>', 'heading');
html = sub1(html, '</style>\n</head>', '</style>\n<style>#syncStamp{margin-left:10px;font-size:12px} #syncStamp[data-state="ok"]{color:var(--pick)} #syncStamp[data-state="bad"]{color:#8A5E05} #syncStamp[data-state="off"]{color:var(--muted)}\n'
  + '.xp-own,.xp-mark{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:var(--gold-soft,#FBEFD3);color:#8A5E05;font-family:var(--body)}\n'
  + '.xp-link{background:none;border:0;padding:0;font:inherit;font-size:13px;font-weight:500;color:var(--ink-2);text-decoration:underline;cursor:pointer;font-family:var(--body)}\n'
  + '.xp-sub{margin:0 0 10px;font-size:13px} .xp-signin{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px} .xp-signin input{padding:7px 10px;border:1px solid var(--line-2);border-radius:9px;min-width:0;flex:1 1 160px}'
  + '</style>\n</head>', 'the sync stamp style');
/* the owner's mark in the header, on every tab: this browser writes what every device shows */
html = sub1(html, '<span class="sub" id="buildTag"></span>', '<span class="sub" id="buildTag"></span><span class="xp-mark" id="ownerMark" hidden title="This browser is the owner\'s: what you change in X Parlays and the X Bet Log is what every device shows">owner</span>', 'the owner\'s mark');
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
/* the frame is handed the page's X Bet Log (window.XBETS, nflbets/build/xbets.js): a srcdoc frame
   is this page's origin, so its parent is reachable. It starts read only (xbets-ro) and the app's
   hook lifts that on the owner's devices, so a visitor never sees the entry form flash up. */
const BET_APP = sub1(buildApp(), '<head>', "<head>\n<script>window.EMBED_TAB=null;window.STATE_URL='../betting/state.json';"
  + "window.XBETS=window.XBETS||(function(){try{return window.parent!==window&&window.parent.XBETS||null;}catch(e){return null;}})();"
  + "if(window.XBETS)document.documentElement.classList.add('xbets-ro');</script>", 'the head of the betting app');
for (const need of ['html.embed header,html.embed #tabs{display:none}', "classList.add('embed')", 'data-tab="record"', 'data-tab="ratings"', 'data-tab="bets"', 'id="betSave"', 'window.STATE_URL||', 'window.XBETS.write(', 'html.xbets-ro #backupCard', '<h2>X Bet Log</h2>'])
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
/* the sync layer runs first: the prop model reads its state through it at boot; the X Bet Log's
   adapter right after it */
html = html.slice(0, -'<script>\n'.length) + '<script>\n' + SYNC_JS + '\n</script>\n<script>\n' + XBETS_JS + '\n</script>\n<script>\n';

/* the app, as assemble.py assembles it, one directory further from its payload */
const APP = "let PAY=null;\nconst DATA_URL='../props/data/payload.json';\n" + part2 + '\n' + part3;
/* the public prop page's header note: when the data was last built, not "Autosaved" */
const NOTE = `<script>
/* which build of this page you are looking at. Without it there is no way to tell a page
   the browser cached last week from the one the job published this morning. APP_BUILD moves
   only with the prop model's parts; PAGE_HASH is the first seven hex of the page's own
   SHA-256 (taken with this placeholder in it), so a change to any source -- the Pick'ems tab,
   the X Parlays section, the parlay card, the sync layer, the X Bet Log, the betting app -- shows
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
