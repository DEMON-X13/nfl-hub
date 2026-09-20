/* Publish the prop model pages from the assembled app.
 *
 *   node props/build/publish.js      (from the hub root)
 *
 *   props/index.html   public: Games, Parlay Builder, Track Record, Backup.
 *                      The Weekly Update tab is removed; the week's data is baked in
 *                      by weekly.py, so visitors never upload. Backup stays: a
 *                      visitor's saved parlays live only in their own browser.
 *   props/admin.html   the full app, every tab.
 * Anything a visitor does (parlays, bets, settings) stays in their own browser.
 */
'use strict';
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
const pub = rehome(html).replace('</body>', TRIM + '</body>');
fs.writeFileSync(path.join(ROOT, 'props', 'index.html'), pub);
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
console.log('published props/index.html (public, 4 tabs) and props/admin.html (all tabs)');
