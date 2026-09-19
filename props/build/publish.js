/* Publish the prop model pages from the assembled app.
 *
 *   node props/build/publish.js      (from the hub root)
 *
 *   props/index.html   public: Games, Parlay Builder, Track Record, How It Works.
 *                      The Weekly Update and Backup tabs are removed; the week's
 *                      data is baked in by weekly.py, so visitors never upload.
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
/* public page: no Weekly Update or Backup tab; the data is baked in */
window.VIEWER=true;
document.addEventListener('DOMContentLoaded',()=>{
  for(const t of ['week','backup']){ const b=document.querySelector('#tabs button[data-tab="'+t+'"]'); if(b) b.remove(); }
  const bt=document.getElementById('buildTag'); if(bt) bt.remove();   /* the betting model's public header carries no build tag */
});
/* header note, as on the betting model: when the site's data was last built, not "Autosaved" */
(function(){
  const run=()=>{ const st=document.getElementById('saveState'); if(!st||typeof PAY==='undefined'||!PAY.baked_at) return;
    const d=new Date(String(PAY.baked_at).length<=16?PAY.baked_at+'Z':PAY.baked_at); if(isNaN(d)) return;
    const txt='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const put=()=>{ if(st.textContent!==txt) st.textContent=txt; };
    put(); new MutationObserver(put).observe(st,{childList:true,characterData:true,subtree:true}); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
</script>
`;
if (!html.includes('</body>')) throw new Error('no </body> in the app');
// wording on the public page: the data is pulled by the job, not uploaded by the reader
const PUBLIC_TEXT = [
  ["Prices come from the sheet you upload on the Weekly Update tab. Anything you haven't priced is shown at the model's own fair odds instead.",
   "Prices are pulled from the odds market twice a week. Anything without a market price is shown at the model's own fair odds instead."],
  ["pull scores and lines on the Weekly Update tab before kickoff.", "lines are refreshed twice a week."],
  ["Pull them again on the Weekly Update tab before kickoff; expected points are the biggest single input to every projection.",
   "They are refreshed twice a week; expected points are the biggest single input to every projection."],
  ["Load a roster and depth chart on the Weekly Update tab.", "Rosters and depth charts are refreshed twice a week."],
  [" Pull in scores on the Weekly Update tab for the final score.", " The final score appears after the next refresh."],
];
let pub = html.replace('</body>', TRIM + '</body>');
for (const [from, to] of PUBLIC_TEXT) { if (!pub.includes(from)) throw new Error('public text not found: ' + from.slice(0, 40)); pub = pub.split(from).join(to); }
fs.writeFileSync(path.join(ROOT, 'props', 'index.html'), pub);
const ADMIN = `<script>
/* header note, as on the betting model: when the site's data was last built, not "Autosaved" */
(function(){
  const run=()=>{ const st=document.getElementById('saveState'); if(!st||typeof PAY==='undefined'||!PAY.baked_at) return;
    const d=new Date(String(PAY.baked_at).length<=16?PAY.baked_at+'Z':PAY.baked_at); if(isNaN(d)) return;
    const txt='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const put=()=>{ if(st.textContent!==txt) st.textContent=txt; };
    put(); new MutationObserver(put).observe(st,{childList:true,characterData:true,subtree:true}); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
</script>
`;
fs.writeFileSync(path.join(ROOT, 'props', 'admin.html'), html.replace('</body>', ADMIN + '</body>'));
console.log('published props/index.html (public, 4 tabs) and props/admin.html (all tabs)');
