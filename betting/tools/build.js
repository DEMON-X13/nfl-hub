/* Build the two betting pages from the one app file.
 *
 *   node betting/tools/build.js
 *
 *   betting/index.html   the public viewer: AI Picks, My Picks, Power Ratings.
 *                        Loads betting/state.json (published by update.js) and
 *                        keeps only the visitor's own picks in their browser.
 *   betting/admin.html   the full app, unchanged (Downloads, Upload, Record & Bets,
 *                        Bank Roll, Backup). Its state lives in the browser as before.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'betting', 'app', 'x_nfl_betting_model.html');
const html = fs.readFileSync(APP, 'utf8');

const VIEWER = `<script>
/* viewer mode: the published season comes from state.json; only this visitor's picks are kept locally */
(function(){
  const PICKS='x_nfl_viewer_picks_2026';
  const loadPicks=()=>{ try{ return JSON.parse(localStorage.getItem(PICKS)||'{}'); }catch(e){ return {}; } };
  window.VIEWER=true;
  window.storage={
    async get(key){
      const r=await fetch('state.json',{cache:'no-store'}); if(!r.ok) throw new Error('state.json '+r.status);
      const S=await r.json(); const picks=loadPicks();
      S.myPicks=picks; S.bets={}; S.bank={start:100,lastAmt:20,filter:'all',weeks:{}}; S.odds={};
      for(const [gid,p] of Object.entries(S.processed||{})){
        const mine=picks[gid]||null; p.myPick=mine;
        const winner=p.result>0?p.home:p.result<0?p.away:null;
        p.myCorrect=mine?(winner?mine===winner:null):null;
      }
      window.__published=S.published;
      return {value:JSON.stringify(S)};
    },
    async set(key,v){ try{ const S=JSON.parse(v); localStorage.setItem(PICKS,JSON.stringify(S.myPicks||{})); }catch(e){} return true; }
  };
  document.addEventListener('DOMContentLoaded',()=>{
    for(const t of ['upload','record','bank','backup']){ const b=document.querySelector('#tabs button[data-tab="'+t+'"]'); if(b) b.remove(); }
    const bar=document.querySelector('#tabs'); if(bar&&window.__published){ /* stamp added after boot below */ }
    setTimeout(()=>{ const el=document.getElementById('saveState'); if(el&&window.__published){ const d=new Date(window.__published); el.textContent='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); } },600);
  });
})();
</script>
`;

const viewer = html.replace('<script>\nconst MODEL = ', VIEWER + '<script>\nconst MODEL = ');
if (viewer === html) throw new Error('could not find the main script start to inject the viewer block');
fs.writeFileSync(path.join(ROOT, 'betting', 'index.html'), viewer);
fs.writeFileSync(path.join(ROOT, 'betting', 'admin.html'), html);
console.log('built betting/index.html (viewer) and betting/admin.html (full app) from', path.relative(ROOT, APP));
