/* Build the two betting pages from the one app file.
 *
 *   node betting/tools/build.js
 *
 *   betting/index.html   the public viewer: AI Picks, My Picks, Bank Roll, Power Ratings.
 *   betting/admin.html   every tab, on the same published season.
 *
 * Both pages load betting/state.json (written by update.js) as the season and keep
 * only this browser's own picks, bankroll, bets and self-loaded odds in local
 * storage, under one key shared by the two pages. Uploads on the admin page grade
 * for the session only; the job's published state wins on the next load.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'betting', 'app', 'x_nfl_betting_model.html');
const html = fs.readFileSync(APP, 'utf8');

const HOOK = `<script>
/* published mode: the season comes from state.json (written by the update job); this browser keeps only its own picks, bankroll, bets and odds */
(function(){
  const MINE='x_nfl_viewer_picks_2026';
  const loadMine=()=>{ try{ const v=JSON.parse(localStorage.getItem(MINE)||'{}'); return v.myPicks||v.bank||v.bets?v:{myPicks:v}; }catch(e){ return {}; } };
  window.PUBLISHED=true;
  window.storage={
    async get(key){
      const r=await fetch('state.json',{cache:'no-store'}); if(!r.ok) throw new Error('state.json '+r.status);
      const S=await r.json(); const mine=loadMine(); const picks=mine.myPicks||{};
      S.myPicks=picks; S.bets=mine.bets||{}; S.bank=mine.bank||{start:100,lastAmt:20,filter:'all',weeks:{}};
      S.odds=Object.assign({},S.odds||{},mine.odds||{});
      for(const [gid,p] of Object.entries(S.processed||{})){
        const m=picks[gid]||null; p.myPick=m;
        const winner=p.result>0?p.home:p.result<0?p.away:null;
        p.myCorrect=m?(winner?m===winner:null):null;
      }
      window.__published=S.published;
      return {value:JSON.stringify(S)};
    },
    async set(key,v){ try{ const S=JSON.parse(v);
      const own={}; for(const [gid,o] of Object.entries(S.odds||{})) if(o&&o.src!=='nflverse') own[gid]=o;
      localStorage.setItem(MINE,JSON.stringify({myPicks:S.myPicks||{},bank:S.bank||null,bets:S.bets||{},odds:own})); }catch(e){} return true; }
  };
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{ const el=document.getElementById('saveState'); if(el&&window.__published){ const d=new Date(window.__published); el.textContent='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); } },600);
  });
})();
</script>
`;

const TRIM = `<script>
/* viewer only: no Downloads, Upload, Records, Bet Log or Backup, and no odds fetch/upload card */
window.VIEWER=true;
document.addEventListener('DOMContentLoaded',()=>{
  for(const t of ['upload','record','bets','backup']){ const b=document.querySelector('#tabs button[data-tab="'+t+'"]'); if(b) b.remove(); }
  const ml=[...document.querySelectorAll('#tab-bank .card h2')].find(h=>h.textContent.trim()==='Moneylines'); if(ml&&ml.closest('.card')) ml.closest('.card').remove();
});
</script>
`;

const ADMIN = `<script>
/* admin only: a link straight to the job's Run workflow page, the manual refresh */
document.addEventListener('DOMContentLoaded',()=>{
  const st=document.getElementById('saveState'); if(!st) return;
  const a=document.createElement('a'); a.className='sub'; a.target='_blank'; a.rel='noopener';
  a.href='https://github.com/DEMON-X13/nfl-hub/actions/workflows/update.yml';
  a.title='Opens GitHub Actions. Press Run workflow to download the latest files, grade, and republish now.';
  a.textContent='Refresh site now \u2197'; a.style.marginLeft='14px'; a.style.whiteSpace='nowrap';
  st.insertAdjacentElement('afterend',a);
});
</script>
`;
const anchor = '<script>\nconst MODEL = ';
if (!html.includes(anchor)) throw new Error('could not find the main script start to inject the hook');
fs.writeFileSync(path.join(ROOT, 'betting', 'index.html'), html.replace(anchor, HOOK + TRIM + anchor));
fs.writeFileSync(path.join(ROOT, 'betting', 'admin.html'), html.replace(anchor, HOOK + ADMIN + anchor));
console.log('built betting/index.html (viewer) and betting/admin.html (all tabs, same published season) from', path.relative(ROOT, APP));
