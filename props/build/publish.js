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
});
</script>
`;
if (!html.includes('</body>')) throw new Error('no </body> in the app');
fs.writeFileSync(path.join(ROOT, 'props', 'index.html'), html.replace('</body>', TRIM + '</body>'));
fs.writeFileSync(path.join(ROOT, 'props', 'admin.html'), html);
console.log('published props/index.html (public, 4 tabs) and props/admin.html (all tabs)');
