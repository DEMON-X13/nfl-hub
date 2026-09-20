/* Build the two betting pages from the one app file.
 *
 *   node betting/tools/build.js
 *
 *   betting/index.html   the public viewer: AI Picks, My Picks, Parlay Builder, Power Ratings, Backup.
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

/* The scoreboard mapping is lifted out of props/build/part2.js at build time rather than
 * copied, the way live/build/build.js lifts the same file. Both sites key games by the same
 * nflverse ids, so they have to agree on how ESPN's teams map onto them, and the prop
 * model's audit is what keeps testing it. Moving any of it fails this build rather than
 * quietly leaving the two sites disagreeing. */
const PART2 = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8');
const lift = (from, to, what) => {
  const a = PART2.indexOf(from), b = PART2.indexOf(to, a + 1);
  if (a < 0 || b < 0) throw new Error('the ' + what + ' is not where build.js expects it in part2.js');
  return PART2.slice(a, b).trimEnd();
};
const ESPN = [
  lift("const ESPN_SB='https", '/* a name both sources can agree on', 'scoreboard url and abbreviations'),
  lift('function espnNum(', '/* one player', 'number parser'),
  lift('/* a scoreboard payload down to', "/* ---------- the betting model's parlays", 'scoreboard mapper'),
].join('\n');
for (const need of ['const ESPN_SB', 'const espnAb', 'function espnNum', 'function espnGames'])
  if (!ESPN.includes(need)) throw new Error('the lifted ESPN block is missing ' + need);

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
      S.myPicks=picks; S.bets=mine.bets||{}; S.bank=mine.bank||{lastAmt:20,filter:'all',build:[],mode:'straight'};
      S.lastBackup=mine.lastBackup||null; S.lastBackupHow=mine.lastBackupHow||null;
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
      localStorage.setItem(MINE,JSON.stringify({myPicks:S.myPicks||{},bank:S.bank||null,bets:S.bets||{},odds:own,lastBackup:S.lastBackup||null,lastBackupHow:S.lastBackupHow||null})); }catch(e){} return true; }
  };
/* both pages: the season is rebuilt by the GitHub job, so Backup covers only what lives in this
     browser. Rebuild and Reset belonged to uploading weeks by hand and go. */
  document.addEventListener('DOMContentLoaded',()=>{
    for(const id of ['rebuildBtn','resetBtn']) document.getElementById(id)?.remove();
    const bs=document.getElementById('backupState'), card=bs&&bs.closest('.card'); if(!card) return;
    const h=card.querySelector('h2'); if(h) h.textContent='Backup';
    let n=bs.nextElementSibling; while(n){ const nx=n.nextElementSibling; n.remove(); n=nx; }
    bs.insertAdjacentHTML('afterend','<ul style="margin:12px 0 0">'
      +'<li><b>Save backup now</b> writes a file with <b>your picks, Bet Log, bankroll and Bet Build</b>. Those live only in this browser: clearing site data or switching computers loses them, and nothing backs them up automatically any more.</li>'
      +'<li><b>Import backup</b> restores one of those files, or moves your picks and bets to another computer.</li>'
      +'<li>Ratings, results and odds are not your data to lose: the GitHub job rebuilds them and the site reloads them every time.</li></ul>'
      +'<p class="muted" style="margin:10px 0 0">The note above turns red once your last backup is more than a week old. Backups land in your Downloads folder.</p>');
  });
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{ const el=document.getElementById('saveState'); if(el&&window.__published){ const d=new Date(window.__published); el.textContent='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); } },600);
  });
})();
</script>
`;

const TRIM = `<script>
/* viewer only: no Downloads, Upload, Records or Bet Log, and no odds fetch/upload card; Backup stays, since a visitor's picks and bets live only in their browser */
window.VIEWER=true;
document.addEventListener('DOMContentLoaded',()=>{
  for(const t of ['upload','record','bets']){ const b=document.querySelector('#tabs button[data-tab="'+t+'"]'); if(b) b.remove(); }
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
  a.title='Opens GitHub Actions and runs the update job: it downloads nflverse files, grades the week and republishes the site. It does not fetch live scores, and it fails while games are still being played, because the stats are not posted yet. For scores during a game, use Refresh scores.';
  a.textContent='Run update job on GitHub \u2197'; a.style.marginLeft='14px'; a.style.whiteSpace='nowrap';
  st.insertAdjacentElement('afterend',a);
});
</script>
`;
/* Live scores, read from ESPN in this browser: free, no odds-API credits, no job. It fills
 * the "0 : 0" the board shows for a game with no result yet and colours it by whether that
 * row's pick is currently ahead. Nothing is stored and nothing is graded on it: the week is
 * still settled by the job, from nflverse, on the next run.
 *
 * This is injected ahead of the app's own script, so everything it does happens on
 * DOMContentLoaded, by which time S, predict and the two boards exist. */
const LIVE = `<style>
.lvwrap{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:inherit;opacity:.85;font-variant-numeric:tabular-nums}
header .lvwrap,header label.muted{color:#B9C5D4}
header #lvEvery{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:5px 8px}
header #lvNow{background:#D39A1F;color:#0F1B2D;border:0;font-weight:700}
.lvdot{width:8px;height:8px;border-radius:50%;background:#D5DCE6;display:inline-block}
.lvdot.on{background:#1B7A4E;box-shadow:0 0 8px rgba(27,122,78,.6)}
.lvdot.bad{background:#C0392B}
b.sc.lv{font-variant-numeric:tabular-nums}
b.sc.lv em{font-style:normal;display:block;font-size:11px;font-weight:600;color:#8A5E05}
b.sc.lv.ok{color:#1B7A4E} b.sc.lv.bad{color:#C0392B} b.sc.lv.tie{color:#8A5E05}
</style>
<script>
(function(){
${ESPN}
const L={games:{},at:0,err:null,busy:false,every:0,timer:null,on:false};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const el=id=>document.getElementById(id);
/* the same sort both boards render in, so a row and a game line up by position */
const weekGames=w=>S.schedule.filter(g=>+g.week===w)
  .sort((a,b)=>(a.gameday+a.gametime).localeCompare(b.gameday+b.gametime));
const weekOf=id=>{ const s=el(id); const v=s&&+s.value; return isFinite(v)&&v?v:null; };
const seasonOf=w=>{ const g=weekGames(w)[0]; return g?+String(g.game_id).slice(0,4):new Date().getFullYear(); };
async function read(){
  if(L.busy) return;
  const weeks=[...new Set([weekOf('weekSel'),weekOf('myWeekSel')].filter(Boolean))];
  if(!weeks.length) return;
  L.busy=true; L.err=null; stamp();
  try{
    const games={};
    for(const w of weeks){
      const r=await fetch(ESPN_SB+'?seasontype=2&week='+w+'&dates='+seasonOf(w),{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      Object.assign(games,espnGames(await r.json(),
        weekGames(w).map(g=>({id:g.game_id,h:g.home_team,a:g.away_team}))));
    }
    L.games=games; L.at=Date.now(); L.on=true;
  }catch(e){ L.err=String(e&&e.message||e); }
  finally{ L.busy=false; }
  paintAll(); stamp();
}
function stamp(){
  const s=el('lvStamp'), d=el('lvDot'); if(!s) return;
  if(d){ d.classList.toggle('on',L.busy); d.classList.toggle('bad',!!L.err); }
  s.textContent=L.err?'scores not loading':(L.busy?'reading\u2026':(L.at
    ?'scores '+new Date(L.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'})
    :'scores off'));
}
/* fill the placeholder score on any row whose game has no result yet */
function paint(rootId,w){
  const root=el(rootId); if(!root||!w) return;
  const gs=weekGames(w), rows=[...root.querySelectorAll('.game')];
  if(!rows.length||rows.length!==gs.length) return;   /* a future week or an empty board: leave it */
  rows.forEach((row,i)=>{
    const g=gs[i]; if(!g||g.result!=null) return;
    const s=L.games[g.game_id]; if(!s||s.state==='pre'||s.hs==null||s.as==null) return;
    const cell=row.querySelector('b.sc'); if(!cell) return;
    const done=S.processed&&S.processed[g.game_id];
    let pick=done?done.pick:null;
    if(!pick&&typeof window.predict==='function'){ try{ pick=window.predict(g,S.teams).pick; }catch(e){} }
    const m=pick?(pick===g.home_team?s.hs-s.as:s.as-s.hs):null;
    const tone=m==null?'':(m>0?'ok':(m<0?'bad':'tie'));
    cell.className='sc lv '+tone;
    cell.innerHTML=esc(g.away_team)+' '+s.as+'\u2013'+s.hs+' '+esc(g.home_team)
      +(s.clock?'<em>'+esc(s.clock)+'</em>':'');
  });
}
function paintAll(){ paint('gamesList',weekOf('weekSel')); paint('myGames',weekOf('myWeekSel')); }
function arm(){
  if(L.timer){ clearInterval(L.timer); L.timer=null; }
  if(L.every) L.timer=setInterval(()=>{ if(document.visibilityState==='visible') read(); },L.every*1000);
}
/* both boards are redrawn on every pick, week change and upload, which wipes what we
   painted, so repaint after whatever redrew them rather than chasing each caller */
function hook(name){
  const f=window[name]; if(typeof f!=='function') return;
  window[name]=function(){ const r=f.apply(this,arguments); if(L.on) setTimeout(paintAll,0); return r; };
}
document.addEventListener('DOMContentLoaded',()=>{
  /* in the header, beside the Updated stamp: this is the first thing looked at during a
     game, and the week bar put it a screen and a half down a phone */
  const host=el('saveState')&&el('saveState').parentElement;
  const sel=el('weekSel'), bar=host||(sel&&sel.closest('.bar')); if(!bar) return;
  const wrap=document.createElement('span');
  wrap.style.cssText='display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap'
    +(host?';margin:8px 0 0;width:100%;justify-content:flex-end':';margin-left:auto');
  wrap.innerHTML='<span class="lvwrap"><span class="lvdot" id="lvDot"></span><span id="lvStamp">scores off</span></span>'
    +'<label class="muted">Scores <select id="lvEvery">'
    +'<option value="0" selected>off</option><option value="30">every 30s</option><option value="60">every 60s</option>'
    +'</select></label>'
    +'<button class="btn" id="lvNow" title="Read the scoreboard from ESPN now. Free: no odds-API credits, no job.">Refresh scores</button>';
  bar.appendChild(wrap);
  el('lvNow').addEventListener('click',read);
  el('lvEvery').addEventListener('change',e=>{ L.every=+e.target.value||0; arm(); if(L.every) read(); });
  for(const n of ['renderPicks','renderMine']) hook(n);
});
})();
</script>
`;

const anchor = '<script>\nconst MODEL = ';
if (!html.includes(anchor)) throw new Error('could not find the main script start to inject the hook');
fs.writeFileSync(path.join(ROOT, 'betting', 'index.html'), html.replace(anchor, HOOK + TRIM + LIVE + anchor));
fs.writeFileSync(path.join(ROOT, 'betting', 'admin.html'), html.replace(anchor, HOOK + ADMIN + LIVE + anchor));
console.log('built betting/index.html (viewer) and betting/admin.html (all tabs, same published season) from', path.relative(ROOT, APP));
