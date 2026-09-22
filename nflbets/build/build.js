/* Build the X NFL Bets and Stats page (nflbets/).
 *
 *   node nflbets/build/build.js        (from the hub root)
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
 * lifted from it at build time, the way live/build and betting/tools lift from part2: the same
 * code, not a copy that can drift. It is scoped inside the closure because the prop model has
 * its own TEAM_COLORS and tag().
 *
 * Nothing is baked in. The page fetches props/data/payload.json and betting/state.json when it
 * opens, so it is rebuilt when a source changes, never when the data does. Neither site is
 * touched. This page reads what they publish.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const rd = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const part1 = rd('props', 'build', 'part1.html');
const part2 = rd('props', 'build', 'part2.js');
const part3 = rd('props', 'build', 'part3.js');
const betting = rd('betting', 'app', 'x_nfl_betting_model.html');
const tab = rd('nflbets', 'build', 'tab_pickems.html');
/* the Live Parlays section is the live page's own source, set into the Parlay Builders tab
   where the Saved parlays card was: a saved parlay is watched the moment it is saved, so the
   list of what is saved and the view of how it is doing are one card. Its styles are scoped
   to that card and its script runs in a closure, since the page around it defines most of
   the same names for itself. */
const livePage = rd('liveparlays', 'build', 'page.html');
/* the sync layer: one shared document for the builder, the saved parlays, the corrected
   lines and the deletions, read and written by every device. It runs before the prop
   model, which saves through the window.storage it defines; the section's key goes through
   window.LIVE_IO. Its address is read from nflbets/sync.json at run time, never built in. */
const SYNC_JS = rd('nflbets', 'build', 'sync.js');
for (const need of ['window.storage=', 'window.LIVE_IO=', "PROP_KEY='props_2026_v1'", "LIVE_KEY='live_parlays_v1'", "CONF='sync.json'"])
  if (!SYNC_JS.includes(need)) throw new Error('nflbets/build/sync.js no longer has ' + need);
if (!part2.includes("const SEASON=2026, KEY='props_2026_v1';")) throw new Error("the prop model's storage key moved; sync.js names it");
if (!part2.includes('if(window.storage){const r=await window.storage.get(KEY,false)')) throw new Error('the prop model no longer reads through window.storage, which the sync layer relies on');
if (!fs.existsSync(path.join(ROOT, 'nflbets', 'sync.json'))) throw new Error('nflbets/sync.json is missing: the page reads the store address from it');
JSON.parse(rd('nflbets', 'sync.json'));

/* every edit lands exactly once, or the build stops: a source that moved is a build to fix,
   not a page to ship half-edited */
const sub1 = (s, from, to, what) => {
  const n = from instanceof RegExp ? (s.match(new RegExp(from.source, from.flags.replace('g', '') + 'g')) || []).length : s.split(from).length - 1;
  if (n !== 1) throw new Error(`${what}: expected exactly one match, found ${n}`);
  return s.replace(from, () => to);
};
const lift = (src, from, to, what) => {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  if (a < 0 || b < 0) throw new Error(`the ${what} is not where nflbets/build expects it`);
  return src.slice(a, b).trimEnd();
};
const piece = (re, what) => { const m = tab.match(re); if (!m) throw new Error(`tab_pickems.html has no ${what}`); return m[1]; };
const TAB_CSS = piece(/<style>([\s\S]*?)<\/style>/, '<style> block');
const TAB_HTML = piece(/(<section id="tab-pickems">[\s\S]*?<\/section>)/, 'section');
const TAB_JS = piece(/<script>([\s\S]*?)<\/script>/, '<script> block');

/* the betting app's colour table, tag() and the contrast maths behind it, and its confidence
   bands: cut where its walk-forward record changes, so a second copy here would drift off them */
const BET = [
  lift(betting, 'const TEAM_COLORS=', '\n', 'team colours'),
  lift(betting, 'function hex2rgb(', 'function predict(', 'tag colours and tag()'),
  lift(betting, 'function tier(', 'function statsFromRow', 'betting confidence bands'),
].join('\n');
for (const need of ['function tag(', 'function tagColor(', 'const PROB_HI', 'function tier('])
  if (!BET.includes(need)) throw new Error('the lifted betting block is missing ' + need);
const BET_NS = `const BET=(()=>{\n${BET}\nreturn {tag,tagColor,tier,PROB_HI,PROB_LO};\n})();`;
const js = sub1(TAB_JS, '/*BETTING*/', BET_NS, 'the /*BETTING*/ slot');
for (const need of ['function gameBet', 'function confTier', 'function bookPrice', 'function fmtML', 'const TEAM_NAMES', 'function toggleLeg', 'function legKey', 'function gameStarted', 'function gameBetsCard', 'function settleGameLeg', 'function slateStamp', 'const ESPN_SB', 'function espnGames', 'const SEASON'])
  if (!(part2 + part3).includes(need)) throw new Error('the prop model no longer defines ' + need + ', which the board prices with');

/* ---- the Live Parlays section, out of liveparlays/build/page.html ---- */
const lpiece = (re, what) => { const m = livePage.match(re); if (!m) throw new Error(`liveparlays/build/page.html has no ${what}`); return m[1]; };
const LIVE_CSS = lpiece(/<style>([\s\S]*?)<\/style>/, '<style> block');
const LIVE_BAR = lpiece(/<main>\s*(<div class="bar">[\s\S]*?<\/div>)\s*<noscript>/, 'control bar');
let LIVE_JS = lpiece(/<script>([\s\S]*?)<\/script>/, '<script> block');
/* Scope every rule to the card. Page-level rules -- the page shell, the button and card
   bases the prop model already has -- are dropped; the rest keep their look inside the card
   and touch nothing outside it. Handles one level of @media. */
function scopeCss(css, scope) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const DROP = /^(\*|:root|html|body|html,body|header|header::after|main|footer|footer a|button,input,select|select|select:focus,button:focus-visible|\.brand.*|\.btn.*|\.card|\.card h2|\.bar|\.bar \.grow|\.muted|\.tokBox|\.tokRow|\.shareBox)$/;
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
        const kept = sel.split(',').map(x => x.trim()).filter(x => x && !DROP.test(x)).map(x => scope + ' ' + x);
        if (kept.length) out += kept.join(',') + '{' + body.trim() + '}\n';
      }
      pos = j;
    }
    return out;
  };
  return block(css);
}
const LIVE_SCOPED = scopeCss(LIVE_CSS, '#lpCard');
for (const need of ['#lpCard .savedp{', '#lpCard .sp-leg{', '#lpCard .pbar{', '#lpCard .gm{', '#lpCard .hidebtn{'])
  if (!LIVE_SCOPED.includes(need)) throw new Error('the scoped live styles lost ' + need);
if (/(^|\n)(body|header|main|:root)\{/.test(LIVE_SCOPED)) throw new Error('a page-level live rule survived scoping');
const lsub = (from, to, what) => { LIVE_JS = sub1(LIVE_JS, from, to, 'the live script: ' + what); };
/* the shared block is the prop model's own part2, which this page already carries */
lsub('/*SHARED*/', '', 'shared slot');
lsub("const DATA='parlays.json';", "const DATA='../liveparlays/parlays.json';", 'file path');
lsub("document.documentElement.dataset.build=PAGE_BUILD;", '', 'build stamp');
/* the section redraws whenever the prop model redraws its builder, and once the model is up */
/* lp-, not live-: the prop model has a liveRefresh of its own, and a global by that name
   would replace it */
lsub("draw(); refresh();", "window.lpDraw=draw; window.lpRefresh=refresh; draw(); refresh();", 'boot');
for (const need of ['function propState', "typeof S==='object'&&S&&Array.isArray(S.saved)", 'function removeParlay', 'S.saved=S.saved.filter', 'function restoreAll', 'window.LIVE_IO', 'LIVE_IO.get()', 'LIVE_IO.set('])
  if (!LIVE_JS.includes(need)) throw new Error('the live script no longer has ' + need + ', which the section relies on');
const LIVE_SECTION = `<div class="card" id="lpCard">
    <h2 style="display:flex;align-items:center;gap:10px">Live Parlays<span class="grow" style="flex:1"></span></h2>
    ${LIVE_BAR}
    <div id="app"></div>
  </div>`;
const LIVE_SCRIPT = `<script>
/* the Live Parlays section: liveparlays/build/page.html, in a closure. Names it shares with
   the prop model -- esc, num, fmtML, the team names -- are its own copies inside it. */
(function(){
${LIVE_JS}
})();
/* the Saved parlays card and the betting-slips card it also covered are drawn by the section
   now; the builder keeps its place above it and the section follows every redraw */
renderSaved=function(){ return ''; };
renderBetParlays=function(){ return ''; };
{ const drawParlay=renderParlay;
  renderParlay=function(){ const r=drawParlay.apply(this,arguments); if(window.lpDraw) window.lpDraw(); return r; }; }
document.addEventListener('app-ready',()=>{ if(window.lpDraw) window.lpDraw(); });
/* the sync stamp in the header: synced and when the document last changed, saving, failed
   and retrying, or not set up */
(function(){
  const el=document.getElementById('syncStamp'); if(!el||!window.NFLSYNC) return;
  const when=iso=>{ const d=new Date(iso); return isNaN(d)?'':d.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}); };
  const put=s=>{ let t, cls='';
    if(!s.url){ t=s.err&&!/HTTP 404/.test(s.err)?'Not synced: '+s.err:'Not synced \u2014 this browser only'; cls='off'; }
    else if(s.ok===false){ t='Sync failed: '+s.err+' \u2014 retrying'; cls='bad'; }
    else if(s.pending){ t='Saving\u2026'; cls='ok'; }
    else if(!s.applied){ t='Connecting\u2026'; }
    else { t='Synced'+(s.at?' \u00b7 '+when(s.at):''); cls='ok'; }
    el.textContent=t; el.dataset.state=cls; el.title=s.url?'Every device reads and writes the same parlays, through '+s.url:'nflbets/sync.json has no store address, so parlays stay in this browser'; };
  NFLSYNC.onChange(put); put(NFLSYNC.state());
})();
</script>`;

/* the prop model's page, re-headed */
let html = part1;
html = sub1(html, '<title>X NFL Prop Model</title>', '<title>X NFL Bets and Stats</title>', 'title');
html = sub1(html, '<h1>X NFL Prop Model</h1>', '<h1>X NFL Bets and Stats</h1>', 'heading');
/* the sync stamp, beside the data stamp */
html = sub1(html, '<span class="sub grow" id="saveState" style="margin-left:auto"></span>',
  '<span class="sub grow" id="saveState" style="margin-left:auto"></span>\n    <span class="sub" id="syncStamp" title="Whether this page shares its parlays with your other devices"></span>', 'the save stamp');
html = sub1(html, '</style>\n</head>', '</style>\n<style>#syncStamp[data-state="ok"]{color:var(--pick)} #syncStamp[data-state="bad"]{color:#8A5E05} #syncStamp[data-state="off"]{color:var(--muted)}</style>\n</head>', 'the sync stamp style');
/* the Props tab's timed score refresh goes: the button stays, the "scores off" stamp and
   the every-30s picker do not. Their code is null-safe on both. */
html = sub1(html, '<span class="livestamp"><span class="livedot" id="slateDot"></span><span id="slateStamp">scores off</span></span>\n',
  '<span class="livestamp" id="slateStamp"></span>\n', 'the scores stamp');
html = sub1(html, `<label class="muted">Scores <select id="slateEvery">
        <option value="0" selected>off</option><option value="30">every 30s</option><option value="60">every 60s</option>
      </select></label>\n`, '', 'the scores picker');
html = sub1(html, '</style>\n</head>', '</style>\n<style>' + TAB_CSS + '</style>\n<style>\n' + LIVE_SCOPED + '</style>\n</head>', 'style block');
/* the tab bar: the prop model's tabs keep their sections and their ids, and get this page's
   names. One tab at a time: a section with no button here is in the page but not yet shown. */
/* A betting tab is the betting site's own page, framed: betting/admin.html opened on that
   tab with ?embed, which hides its header and tab bar. The frame is the exact tab, drawn by
   the betting app itself on the same browser store, so a bet logged there is logged here.
   It loads when its tab is first opened and takes the height of what it shows. */
const TABS = [
  ['pickems', "Pick'ems"],
  ['slate', 'Props'],
  ['parlay', 'Parlay Builders'],
  ['ratings', 'Power Ratings', '../betting/admin.html?embed=1#ratings'],
  ['record', "Pick'em Record", '../betting/admin.html?embed=1#record'],
  ['track', 'Prop Record'],
  ['bets', 'Bet Log', '../betting/admin.html?embed=1#bets'],
];
for (const [, , src] of TABS) if (src && !fs.existsSync(path.join(__dirname, '..', src.replace(/[?#].*$/, ''))))
  throw new Error('a framed tab points at a page that is not there: ' + src);
if (!betting.includes('html.embed') && !rd('betting', 'admin.html').includes('html.embed header'))
  throw new Error('betting/admin.html has no embed mode, so a framed tab would show its header and tab bar');
const NAV = `<nav role="tablist" id="tabs">\n` + TABS.map(([t, label], i) =>
  `    <button role="tab" data-tab="${t}"${i === 0 ? ' aria-selected="true"' : ''}>${label}</button>`).join('\n') + '\n  </nav>';
const FRAMES = TABS.filter(t => t[2]).map(([t, label, src]) =>
  `<section id="tab-${t}" hidden><iframe class="pk-frame" data-src="${src}" title="${label}"></iframe></section>`).join('\n\n');
const navFrom = html.indexOf('<nav role="tablist" id="tabs">'), navTo = html.indexOf('</nav>', navFrom);
if (navFrom < 0 || navTo < 0) throw new Error('the tab bar is not where nflbets/build expects it in part1.html');
html = html.slice(0, navFrom) + NAV + html.slice(navTo + '</nav>'.length);
for (const [t] of TABS) if (t !== 'pickems' && !t.match(/^(slate|parlay|track)$/) && html.includes(`id="tab-${t}"`))
  throw new Error(`the prop model already has a tab-${t} section; a framed tab cannot use that name`);
html = sub1(html, '<section id="tab-slate">', TAB_HTML + '\n\n' + FRAMES + '\n\n<section id="tab-slate" hidden>', 'the Games section');
/* the Live Parlays section, under the builder, where the Saved parlays card was */
html = sub1(html, '<section id="tab-parlay" hidden>\n  <div id="parlayBody"></div>', '<section id="tab-parlay" hidden>\n  <div id="parlayBody"></div>\n  ' + LIVE_SECTION, 'the Parlay Builder section');
if (!html.endsWith('<script>\n')) throw new Error('part1.html no longer ends by opening the app script');
/* the sync layer runs first: the prop model reads its state through it at boot */
html = html.slice(0, -'<script>\n'.length) + '<script>\n' + SYNC_JS + '\n</script>\n<script>\n';

/* the app, as assemble.py assembles it, one directory further from its payload. One thing
   is left out of a game on this page: the Game bets card, since the same bets open under
   every game on the Pick'ems tab, from the same function. A game here is its players. */
const APP = "let PAY=null;\nconst DATA_URL='../props/data/payload.json';\n" + part2 + '\n'
  + sub1(sub1(part3, '  html+=gameBetsCard(g,locked);\n', '', 'the Game bets card in the game view'),
      /      <ul style="margin:0">\n        <li>You can pick <b>one line per stat per player<\/b>[\s\S]*?<\/ul>/, '', 'the how-to list under Nothing picked yet');
/* the public prop page's header note: when the data was last built, not "Autosaved" */
const NOTE = `<script>
window.VIEWER=true;
/* which build of this page you are looking at. Without it there is no way to tell a page
   the browser cached last week from the one the job published this morning. */
document.addEventListener('app-ready',()=>{ const bt=document.getElementById('buildTag');
  if(bt&&typeof APP_BUILD!=='undefined') bt.textContent=APP_BUILD; });
(function(){
  const run=()=>{ const st=document.getElementById('saveState'); if(!st||typeof PAY==='undefined'||!PAY||!PAY.baked_at) return;
    const d=new Date(String(PAY.baked_at).length<=16?PAY.baked_at+'Z':PAY.baked_at); if(isNaN(d)) return;
    const txt='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const put=()=>{ if(st.textContent!==txt) st.textContent=txt; };
    put(); new MutationObserver(put).observe(st,{childList:true,characterData:true,subtree:true}); };
  document.addEventListener('app-ready',run); if(typeof PAY!=='undefined'&&PAY) run();
})();
</script>`;
const out = html + APP + '\n</script>\n' + NOTE + '\n' + LIVE_SCRIPT + '\n<script>' + js + '</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(ROOT, 'nflbets', 'index.html'), out);
console.log(`nflbets/index.html written: ${(out.length / 1024).toFixed(1)} KB `
  + `(the prop model's page, ${BET.split('\n').length} lines lifted from the betting app for the board)`);
