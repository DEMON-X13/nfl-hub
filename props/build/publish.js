/* Publish the prop model pages from the assembled app.
 *
 *   node props/build/publish.js      (from the hub root)
 *
 *   props/index.html   retired: a redirect to nflbets/, where the Games, Parlay Builder and
 *                      Track Record tabs live now, on the same parts and the same payload.
 *                      A tab in the hash carries across.
 *   props/admin.html   the full app, every tab, for a manual run or a backup.
 * Anything a visitor does (parlays, bets, settings) stays in their own browser.
 */
'use strict';
const REDIRECT = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>X NFL Bets and Stats</title>\n<!-- retired: this site is one tab of X NFL Bets and Stats now. The hash carries across, so a\n     bookmarked tab still lands on it. -->\n<meta http-equiv=\"refresh\" content=\"0; url=../nflbets/#slate\">\n<script>location.replace('../nflbets/'+(location.hash||'#slate'));</script>\n</head>\n<body><a href=\"../nflbets/#slate\">This page has moved to X NFL Bets and Stats.</a></body>\n</html>\n";
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'props', 'app', 'prop_model_2026.html');
const html = fs.readFileSync(APP, 'utf8');

const TRIM = `<script>
/* public page: no Weekly Update tab; the data is baked in */
window.VIEWER=true;
document.addEventListener('DOMContentLoaded',()=>{
  for(const t of ['week']){ const b=document.querySelector('#tabs button[data-tab="'+t+'"]'); if(b) b.remove(); }
  const bt=document.getElementById('buildTag'); if(bt) bt.remove();   /* the betting model's public header carries no build tag */
});
/* header note, as on the betting model: when the site's data was last built, not "Autosaved" */
(function(){
  const run=()=>{ const st=document.getElementById('saveState'); if(!st||typeof PAY==='undefined'||!PAY||!PAY.baked_at) return;
    const d=new Date(String(PAY.baked_at).length<=16?PAY.baked_at+'Z':PAY.baked_at); if(isNaN(d)) return;
    const txt='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const put=()=>{ if(st.textContent!==txt) st.textContent=txt; };
    put(); new MutationObserver(put).observe(st,{childList:true,characterData:true,subtree:true}); };
  /* the payload is fetched now, so PAY does not exist at DOMContentLoaded: wait for boot */
  document.addEventListener('app-ready',run); if(typeof PAY!=='undefined'&&PAY) run();
})();
</script>
`;
if (!html.includes('</body>')) throw new Error('no </body> in the app');

/* props/app/prop_model_2026.html fetches ../data/payload.json; props/index.html and
   props/admin.html sit one directory up, so for them it is data/payload.json. */
const APP_DATA = "const DATA_URL='../data/payload.json';";
const PUB_DATA = "const DATA_URL='data/payload.json';";
const rehome = s => {
  if (s.split(APP_DATA).length - 1 !== 1) throw new Error('the payload path is not in the app exactly once');
  return s.replace(APP_DATA, PUB_DATA);
};
void TRIM;   /* the public trim is not applied to anything now; kept for a revert */
fs.writeFileSync(path.join(ROOT, 'props', 'index.html'), REDIRECT);
const ADMIN = `<script>
/* header note, as on the betting model: when the site's data was last built, not "Autosaved" */
(function(){
  const run=()=>{ const st=document.getElementById('saveState'); if(!st||typeof PAY==='undefined'||!PAY||!PAY.baked_at) return;
    const d=new Date(String(PAY.baked_at).length<=16?PAY.baked_at+'Z':PAY.baked_at); if(isNaN(d)) return;
    const txt='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const put=()=>{ if(st.textContent!==txt) st.textContent=txt; };
    put(); new MutationObserver(put).observe(st,{childList:true,characterData:true,subtree:true}); };
  /* the payload is fetched now, so PAY does not exist at DOMContentLoaded: wait for boot */
  document.addEventListener('app-ready',run); if(typeof PAY!=='undefined'&&PAY) run();
})();
</script>
`;
fs.writeFileSync(path.join(ROOT, 'props', 'admin.html'), rehome(html).replace('</body>', ADMIN + '</body>'));
console.log('published props/index.html (a redirect to nflbets/) and props/admin.html (all tabs)');
