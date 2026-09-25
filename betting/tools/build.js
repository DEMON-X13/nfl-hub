/* Build the betting app for the X NFL Bets and Stats page.
 *
 *   node betting/tools/build.js        checks the build and writes nothing
 *   require('./build.js').buildApp()   the built app, as a string, for nflbets/build/build.js
 *
 * The betting site has no pages of its own any more: betting/index.html and betting/admin.html
 * are gone, and the app lives inside nflbets/index.html, which sets it into the Pick'em
 * Record, Power Ratings and Bet Log tabs as the srcdoc of a frame. A srcdoc frame is the
 * page's own origin, so the app keeps this browser's picks, bankroll, bets and self-loaded
 * odds under the same local-storage key it always did, and its relative fetches resolve
 * against nflbets/, which is why the season is read from ../betting/state.json (written by
 * update.js). Uploads grade for the session only; the job's published state wins on the
 * next load.
 *
 * Inside the frame there is no address to carry a tab, so the page sets window.EMBED_TAB
 * before the app runs: it marks the document embedded (no header, no tab bar) and opens
 * that tab. The ?embed and #tab forms are still honoured, for a copy opened on its own.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'betting', 'app', 'x_nfl_betting_model.html');
let html = fs.readFileSync(APP, 'utf8');

/* The scoreboard mapping is lifted out of props/build/part2.js at build time rather than
 * copied, the way nflbets/build/build.js lifts the same file. Both sites key games by the same
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
      const r=await fetch(window.STATE_URL||'state.json',{cache:'no-store'}); if(!r.ok) throw new Error('state.json '+r.status);
      const S=await r.json(); const mine=loadMine(); const picks=mine.myPicks||{};
      S.myPicks=picks; S.bets=mine.bets||{}; S.bank=mine.bank||{lastAmt:20,filter:'all',build:[],mode:'straight'};
      S.lastBackup=mine.lastBackup||null; S.lastBackupHow=mine.lastBackupHow||null;
      S.odds=Object.assign({},S.odds||{},mine.odds||{});
      for(const [gid,p] of Object.entries(S.processed||{})){
        const m=picks[gid]||null; p.myPick=m;
        const winner=p.result>0?p.home:p.result<0?p.away:null;
        p.myCorrect=m?(winner?m===winner:null):null;
      }
      /* the Elo model's calls, from elo/data/model.json beside the season: graded ones onto the
         processed games, the coming week's onto S.elo, so Records can show it like the Joker */
      S.elo={};
      try{
        const r2=await fetch((window.ELO_URL||'../elo/data/model.json')+'?t='+Date.now(),{cache:'no-store'});
        if(r2.ok){ const M=await r2.json();
          for(const g of (M.graded||[])){ const e={pick:g.pick,pHome:g.p_home,correct:g.correct}; S.elo[g.game_id]=e; if(S.processed&&S.processed[g.game_id]) S.processed[g.game_id].elo=e; }
          for(const g of ((M.next&&M.next.games)||[])) S.elo[g.game_id]={pick:g.pick,pHome:g.p_home,correct:null};
          window.__eloRecord=M.walk_forward||null; }
      }catch(e){}
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
/* admin only: the job's Run workflow page. It used to sit in the header, where it read as
   the refresh button and was pressed as one -- it is not: it runs the weekly job, takes a
   minute and fails outright while games are being played. Refresh scores owns that corner
   now, and this lives with the rest of the housekeeping in Backup. */
document.addEventListener('DOMContentLoaded',()=>{
  const bs=document.getElementById('backupState'); if(!bs) return;
  const ul=bs.parentElement.querySelector('ul'); if(!ul) return;
  const li=document.createElement('li');
  li.innerHTML='<b>Rebuild the site</b> \u2014 <a href="https://github.com/DEMON-X13/nfl-hub/actions/workflows/update.yml" target="_blank" rel="noopener">run the update job on GitHub \u2197</a>. '
    +'It downloads the nflverse files, grades the week and republishes. It does not fetch live scores, and it fails while games are still being played because the stats are not posted yet \u2014 for scores during a game use <b>Refresh scores</b> in the header.';
  ul.appendChild(li);
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
.mwin.tie,.mres.tie{color:#8A5E05}
.pickdot.lockd{opacity:.45;cursor:not-allowed}
/* A wide table scrolls inside its card rather than stretching the page behind it: Power
   Ratings is eight columns and 672px, which on a 390px phone pushed everything else out
   with it. */
@media(max-width:560px){
  #tab-record table,#tab-ratings table,#tab-upload table,#tab-bets table,.pickgrid table{
    display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;white-space:nowrap;max-width:100%}
  #tab-record table th,#tab-record table td,
  #tab-ratings table th,#tab-ratings table td{padding:7px 9px}
}
/* embedded: one tab of this page shown inside another page (the X NFL Bets and Stats page frames the
   Records, Power Ratings and Bet Log tabs), which has a header and a tab bar of its own */
#ratingsTable table{width:100%}
html.embed header,html.embed #tabs{display:none}
html.embed body{background:none;min-height:0}
html.embed main{padding:4px 0 16px;max-width:none}
</style>
<script>
(function(){
/* embedded -- window.EMBED_TAB set by the page around this one, or ?embed on the address:
   no header, no tab bar, no background; EMBED_TAB or the hash says which tab shows */
if(window.EMBED_TAB||/[?&]embed(=|&|$)/.test(location.search)) document.documentElement.classList.add('embed');
${ESPN}
const L={games:{},at:0,err:null,busy:false,on:false};
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
  /* a finished game becomes a result; the boards are redrawn by the app so that records,
     ticks and crosses all follow from it */
  if(settleFinished()){
    /* Records too: it reads the same S.processed and was left showing the counts from
       before the games settled until you happened to switch tabs. */
    for(const n of ['renderPicks','renderMine','renderRecord'])
      if(typeof window[n]==='function'){ try{ window[n](); }catch(e){} }
    tidyStats();
  }
  paintAll(); stamp();
}
function stamp(){
  const s=el('lvStamp'), d=el('lvDot'); if(!s) return;
  if(d){ d.classList.toggle('on',L.busy); d.classList.toggle('bad',!!L.err); }
  s.textContent=L.err?'scores not loading':(L.busy?'reading\u2026':(L.at
    ?'scores '+new Date(L.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'})
    :'scores not read yet'));
}
/* fill the placeholder score on any row whose game has no result yet */
function paint(rootId,w){
  const root=el(rootId); if(!root||!w) return;
  const gs=weekGames(w), rows=[...root.querySelectorAll('.game')];
  if(!rows.length||rows.length!==gs.length) return;   /* a future week or an empty board: leave it */
  rows.forEach((row,i)=>{
    const g=gs[i]; if(!g||g.result!=null) return;
    const s=L.games[g.game_id]; if(!s||s.state==='pre'||s.hs==null||s.as==null) return;
    /* the same two spans the app writes for a finished game, in the same box, so a game
       being played and one that is over read identically rather than in two type sizes */
    const box=row.querySelector('.result'); if(!box) return;
    box.innerHTML='<span class="mwin '+tone(g,s)+'">'+line(g,s)+'</span>'
      +(s.clock?'<span class="muted">'+esc(s.clock)+'</span>':'');
  });
}
/* Kickoff, from the schedule's Eastern times, the same way the prop model works it out.
   The clocks go back on the first Sunday of November, which is close enough to the first
   of the month for a kickoff time. */
function kickoff(g){
  if(!g.gameday) return null;
  const yr=g.gameday.slice(0,4);
  const off=(g.gameday>=yr+'-11-01')?'-05:00':'-04:00';
  const d=new Date(g.gameday+'T'+(g.gametime||'13:00')+':00'+off);
  return isNaN(d)?null:d.getTime();
}
/* a game that has started, by the scoreboard if it has been read and by the clock otherwise */
function started(g){
  const s=L.games[g.game_id];
  if(s&&s.state&&s.state!=='pre') return true;
  const k=kickoff(g);
  return !!k&&Date.now()>=k;
}
/* A pick cannot be made or changed once the game has kicked off. The app already refuses
   once a game is graded, but grading happens when the job next runs and nflverse has
   posted -- hours after the whistle, and not at all until the next morning for a Sunday
   night game. In that gap every game played today was still editable, which is not a pick,
   it is a result being written down afterwards. */
function lockPlayed(){
  const root=el('myGames'); if(!root) return;
  const by={}; for(const g of S.schedule) by[g.game_id]=g;
  let n=0;
  root.querySelectorAll('button[data-my]').forEach(b=>{
    if(b.disabled) return;                       /* graded: the app locked it already */
    const g=by[b.dataset.my]; if(!g||!started(g)) return;
    b.disabled=true; b.classList.add('lockd'); n++;
    b.title=b.getAttribute('aria-checked')==='true'
      ? 'Locked: this game has kicked off. Your pick stands.'
      : 'Locked: this game has kicked off, so it can no longer be picked.';
  });
  return n;
}

/* A finished game does not need the weekly job to say who won.
 *
 * The job's grading writes two different kinds of thing. Ratings need nflverse's stats,
 * which is why it waits. Whether a pick hit needs only the final score, and the scoreboard
 * has that at the whistle. So a game ESPN reports as over is settled here, from the score,
 * in exactly the shape the job writes -- which means the records, the ticks and crosses,
 * "Pick hit", the My Picks marks and the lock all come out of the app's own code rather
 * than a second implementation of it.
 *
 * None of it is persisted. In published mode this browser keeps only picks, bets, bankroll
 * and self-loaded odds; S.processed and S.schedule are rebuilt from state.json on every
 * load. So this is a view of a finished game that the job has not reached yet, and the
 * moment it does, its version is what loads and nothing here is consulted again.
 *
 * The pick it settles against is the one the board is already showing for that game:
 * an ungraded row renders predict(g, S.teams), and ratings do not move until the job
 * ingests results, so the pick cannot drift between being shown and being settled. */
function settleFinished(){
  let n=0;
  for(const g of S.schedule){
    if(g.result!=null||S.processed[g.game_id]) continue;     /* already settled or graded */
    const s=L.games[g.game_id];
    if(!s||s.state!=='post'||s.hs==null||s.as==null) continue;
    let pr=null;
    if(typeof window.predict==='function'){ try{ pr=window.predict(g,S.teams); }catch(e){} }
    if(!pr) continue;
    /* Every model that has a column has to be in the row, not just the main one. The grid
       reads done.h for the challenger and has no fallback behind it, so a settled row
       without it blanks the challenger's pick and drops the game from its record. The joker
       falls back to S.joker and survived; the challenger had nothing to fall back to. */
    let h=null;
    if(S.teamsH&&typeof window.predict==='function'){
      try{ h=window.predict(g,S.teamsH,(typeof MODEL_H!=='undefined'&&MODEL_H)?MODEL_H.pure:undefined); }catch(e){}
    }
    const jk=(S.joker&&S.joker[g.game_id])||null;
    const result=s.hs-s.as;                                  /* home margin, as the job writes it */
    const winner=result>0?g.home_team:(result<0?g.away_team:null);
    const myPick=(S.myPicks&&S.myPicks[g.game_id])||null;
    g.away_score=s.as; g.home_score=s.hs; g.result=result;
    S.processed[g.game_id]={week:+g.week,home:g.home_team,away:g.away_team,
      pick:pr.pick,conf:pr.conf,margin:pr.margin,pHome:pr.pHome,blended:!!pr.blended,
      result,correct:winner?pr.pick===winner:null,line:g.spread_line,
      myPick,myCorrect:myPick?(winner?myPick===winner:null):null,
      h:h?{pick:h.pick,conf:h.conf,margin:h.margin,pHome:h.pHome,
           correct:winner?h.pick===winner:null}:undefined,
      joker:jk?{pick:jk.pick,pHome:jk.pHome,
                correct:winner?jk.pick===winner:null}:undefined,
      news:[],
      fromScoreboard:true};
    n++;
  }
  return n;
}
/* the graded rows read "BUF won 31-41"; a game still being played reads the same way, with
   the side that is ahead and leading instead of won, so the two say the same kind of thing */
function line(g,s){
  const lead=s.hs>s.as?g.home_team:(s.as>s.hs?g.away_team:null);
  return lead?esc(lead)+' leading '+s.as+'\u2013'+s.hs
            :'Tied '+s.as+'\u2013'+s.hs;
}
/* green while the row's pick is ahead, red while it is behind, yellow level */
function tone(g,s){
  const done=S.processed&&S.processed[g.game_id];
  let pick=done?done.pick:null;
  if(!pick&&typeof window.predict==='function'){ try{ pick=window.predict(g,S.teams).pick; }catch(e){} }
  if(!pick) return '';
  const m=pick===g.home_team?s.hs-s.as:s.as-s.hs;
  return m>0?'ok':(m<0?'bad':'tie');
}
/* My Picks draws a card per game with the result in its header, not a board row */
function paintMine(w){
  const root=el('myGames'); if(!root||!w) return;
  const gs=weekGames(w), cards=[...root.querySelectorAll('.mycard')];
  if(!cards.length||cards.length!==gs.length) return;
  cards.forEach((card,i)=>{
    const g=gs[i]; if(!g||g.result!=null) return;
    const s=L.games[g.game_id]; if(!s||s.state==='pre'||s.hs==null||s.as==null) return;
    const head=card.querySelector('.myhead'); if(!head) return;
    /* My Picks puts the result in the card's header, separated by a middle dot: the same
       span the app uses for a final, with the clock as another of the header's own bits */
    let sp=head.querySelector('.mres.lv');
    if(!sp){ head.appendChild(document.createTextNode(' \u00b7 '));
      sp=document.createElement('span'); sp.className='mres lv'; head.appendChild(sp);
      head.appendChild(document.createTextNode('')); }
    sp.className='mres lv '+tone(g,s);
    sp.textContent=line(g,s).replace(/&amp;/g,'&');
    sp.nextSibling.textContent=s.clock?' \u00b7 '+s.clock:'';
  });
}
function paintAll(){ paint('gamesList',weekOf('weekSel')); paintMine(weekOf('myWeekSel')); }

/* My Picks is gone: the tab, the column in both tables, the line on the chart and its
   legend. Nothing is deleted from storage -- the picks key is left exactly as it is, so
   turning this back on is one build away and loses nothing. */
function stripCol(table,label){
  if(!table) return;
  const ths=[...table.querySelectorAll('thead th')];
  const i=ths.findIndex(th=>th.textContent.trim()===label);
  if(i<0) return;
  ths[i].remove();
  table.querySelectorAll('tbody tr, tfoot tr').forEach(tr=>{ const c=tr.children[i]; if(c) c.remove(); });
}
function stripMine(){
  const tab=document.querySelector('#tabs button[data-tab="mine"]'); if(tab) tab.remove();
  const sec=document.getElementById('tab-mine');
  if(sec){
    sec.remove();
    /* renderMine reaches straight for myWeekSel, and renderAll calls it on every refresh:
       with the section gone that throws and takes the rest of the render down with it. So
       it stops being a function that draws a tab and becomes one that does nothing. */
    window.renderMine=function(){};
    if(typeof window.renderMyRecords==='function') window.renderMyRecords=function(){};
  }
  document.querySelectorAll('.pickgrid table, #tab-record table').forEach(t=>stripCol(t,'You'));
  /* the chart's own line and its legend entry, both drawn in the picks colour. A legend
     item is a span wrapping a colour swatch, the name and the count, so it is the swatch's
     colour that identifies it rather than the text, which is spread across children. */
  document.querySelectorAll('.lgdrow > span').forEach(sp=>{
    const sw=sp.querySelector('i.lgd');
    const col=sw?(sw.getAttribute('style')||''):'';
    if(/#C98B0F/i.test(col)||/^You\b/.test(sp.textContent.trim())) sp.remove(); });
  document.querySelectorAll('#modelChart [stroke="#C98B0F"], #modelChart [fill="#C98B0F"]')
    .forEach(n=>n.remove());
}
/* after anything redraws a board: the lock does not wait for a score to be read, since it
   is a rule about the clock rather than about the scoreboard */
/* three paragraphs of method under Records and Power Ratings that nobody reads twice: the
   note under the accuracy chart, the small-samples note under the week-by-week table, and
   the paragraph that explains the absences table. The app redraws them; this drops them. */
const DROP=[/^Early weeks bounce around on small samples/,/^Running season accuracy after each week/,/^Two absences carry a measured effect/];
function dropNotes(){
  document.querySelectorAll('#tab-record p.muted, #tab-ratings p.muted').forEach(p=>{
    const t=p.textContent.trim(); if(DROP.some(re=>re.test(t))) p.remove();
  });
}
function after(){ lockPlayed(); stripMine(); allModels(); tidyStats(); ratingsExtras(); dropNotes(); if(L.on) paintAll(); }
/* Records shows every model, always. The toggle defaulted to off, so the challenger, the
   joker and Vegas were hidden behind a checkbox on the one tab that exists to compare them. */
function allModels(){
  if(S.showAllModels!==true){
    S.showAllModels=true;
    if(typeof window.renderRecord==='function'){ try{ window.renderRecord(); }catch(e){} }
  }
  document.querySelectorAll('#tab-record label').forEach(l=>{
    if(/show all models/i.test(l.textContent)) l.remove(); });
}
/* an empty band renders as "-%", which reads like a number that failed to load rather than
   a band nothing has landed in yet */
function tidyStats(){
  document.querySelectorAll('#recordStats .stat b').forEach(b=>{
    if(b.textContent.trim()==='\u2013%') b.textContent='\u2013';
  });
}
/* Power Ratings: the Impact absences table sits under the ratings, where the ratings it
   moves are, rather than on Data Upload, which the job has made a page nobody opens. The
   app renders it into #injSuggest on every redraw, so the element itself moves, once, into a
   card of its own here; the card hides when there is nothing in it. The note under the
   ratings about where the rank tags are measured from goes, and so does the key to the
   tier shields; the shields stay. */
function ratingsExtras(){
  const tab=el('tab-ratings'), inj=el('injSuggest'); if(!tab) return;
  if(inj&&!tab.contains(inj)){
    const card=document.createElement('div'); card.className='card'; card.id='injCard';
    inj.style.marginTop='0'; card.appendChild(inj); tab.appendChild(card);
  }
  const card=el('injCard'); if(card) card.hidden=!inj||!inj.textContent.trim();
  document.querySelectorAll('#ratingsTable p.muted').forEach(p=>{
    if(/^Rank tags and the Elo change column/.test(p.textContent.trim())) p.remove();
  });
  /* the tier shields stay beside the numbers; the key that spelled them out -- Challenger
     1700+, Master 1650+ and so on -- goes */
  document.querySelectorAll('#ratingsTable .tierlegend').forEach(n=>n.remove());
  /* the table sat bare at its own width over a full-width card, and the two read as two
     things: it goes in a card of the same width, and fills it */
  const rt=el('ratingsTable');
  if(rt&&!(rt.parentElement&&rt.parentElement.classList.contains('card'))){
    const card=document.createElement('div'); card.className='card'; card.id='ratingsCard';
    rt.parentElement.insertBefore(card,rt); card.appendChild(rt);
  }
}

/* The tab you are on goes in the address, so a refresh, a bookmark or the back button all
   land where you were instead of dropping you on AI Picks. replaceState rather than a hash
   assignment, so setting it does not fire hashchange and bounce back into the same tab. */
function routeTabs(){
  const tabs=document.getElementById('tabs'); if(!tabs) return;
  const go=name=>{ const b=tabs.querySelector('button[data-tab="'+name+'"]'); if(b){ b.click(); return true; } return false; };
  /* a srcdoc frame has no address of its own to write to, and the browser refuses the write */
  const replace=u=>{ try{ history.replaceState(null,'',u); }catch(e){} };
  tabs.querySelectorAll('button[data-tab]').forEach(b=>b.addEventListener('click',()=>{
    const h='#'+b.dataset.tab;
    if(location.hash!==h) replace(h);
  }));
  const want=window.EMBED_TAB||decodeURIComponent((location.hash||'').slice(1));
  if(want&&!go(want)&&!window.EMBED_TAB) replace(location.pathname+location.search);
  window.addEventListener('hashchange',()=>{
    const n=decodeURIComponent((location.hash||'').slice(1)); if(n) go(n);
  });
}
/* both boards are redrawn on every pick, week change and upload, which wipes what we
   painted, so repaint after whatever redrew them rather than chasing each caller */
function hook(name){
  const f=window[name]; if(typeof f!=='function') return;
  window[name]=function(){ const r=f.apply(this,arguments); setTimeout(after,0); return r; };
}
document.addEventListener('DOMContentLoaded',()=>{
  /* in the header, beside the Updated stamp: this is the first thing looked at during a
     game, and the week bar put it a screen and a half down a phone */
  const host=el('saveState')&&el('saveState').parentElement;
  const sel=el('weekSel'), bar=host||(sel&&sel.closest('.bar')); if(!bar) return;
  const wrap=document.createElement('span');
  wrap.style.cssText='display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap'
    +(host?';margin:8px 0 0;width:100%;justify-content:flex-end':';margin-left:auto');
  wrap.innerHTML='<span class="lvwrap"><span class="lvdot" id="lvDot"></span><span id="lvStamp">scores not read yet</span></span>'
    +'<button class="btn" id="lvNow" title="Read the scoreboard from ESPN now. Free: no odds-API credits, no job.">Refresh scores</button>';
  bar.appendChild(wrap);
  el('lvNow').addEventListener('click',read);
  setTimeout(after,0);                            /* lock what has kicked off on first load */
  /* read once on load, so a finished game shows its result without being asked and does not
     vanish again on the next reload */
  setTimeout(read,300);
  for(const n of ['renderPicks','renderMine','renderRecord','renderRatings','renderAdjust']) hook(n);
  stripMine();
  allModels();
  ratingsExtras();
  dropNotes();
  routeTabs();
});
})();
</script>
`;

const anchor = '<script>\nconst MODEL = ';
if (!html.includes(anchor)) throw new Error('could not find the main script start to inject the hook');

/* The Elo model on Records. The app's renderRecord and pickGrid draw the Joker from
   processed[gid].joker; the same lines are widened here, at build time, to draw the Elo
   model from processed[gid].elo, which the hook above fills from elo/data/model.json. Each
   edit must land exactly once, so a change to the app that moves these lines stops the
   build rather than dropping the Elo model from the chart. The app file itself is not
   touched: it is the source shipped from nfl-model-lab. */
const patch = (from, to, what) => {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`the Elo model patch "${what}": expected exactly one match, found ${n}`);
  html = html.replace(from, () => to);
};
patch(`  const jDis=jRows.filter(r=>r.joker.pick!==r.pick); const jDisA=jDis.filter(r=>r.correct).length, jDisJ=jDis.filter(r=>r.joker.correct).length;`,
`  const jDis=jRows.filter(r=>r.joker.pick!==r.pick); const jDisA=jDis.filter(r=>r.correct).length, jDisJ=jDis.filter(r=>r.joker.correct).length;
  /* the Elo model: every player rated by position, the roster scored from those ratings; published as processed[gid].elo from elo/data/model.json */
  const eRows=rows.filter(r=>r.elo&&r.elo.correct!==null&&r.elo.correct!==undefined); let eRun=0,eRunN=0; const ePts=[];
  wks.forEach(w=>{ const wr=eRows.filter(r=>+r.week===w); const wc=wr.filter(r=>r.elo.correct).length; eRun+=wc; eRunN+=wr.length;
    ePts.push({x:w, y:eRunN?100*eRun/eRunN:null, tip:wr.length?\`Week \${w} Elo model: \${wc} of \${wr.length} that week, \${(100*eRun/eRunN).toFixed(1)}% season to date\`:\`Week \${w}: no Elo model record\`}); });`,
  'the Elo model series');
patch(`      \${showAll?lgd('#C0392B','The Joker',jRun,jRunN):''}
      \${showAll?lgd('#0F1B2D','Vegas',vRun,vRunN):''}`,
`      \${showAll?lgd('#C0392B','The Joker',jRun,jRunN):''}
      \${showAll?lgd('#E8730A','Elo model',eRun,eRunN):''}
      \${showAll?lgd('#0F1B2D','Vegas',vRun,vRunN):''}`, 'the legend');
patch(`...(showAll&&jRunN?[{pts:jPts,color:'#C0392B'}]:[]),...(showAll&&vRunN?[{pts:vPts,color:'#0F1B2D'}]:[])]})}`,
`...(showAll&&jRunN?[{pts:jPts,color:'#C0392B'}]:[]),...(showAll&&eRunN?[{pts:ePts,color:'#E8730A'}]:[]),...(showAll&&vRunN?[{pts:vPts,color:'#0F1B2D'}]:[])]})}`, 'the chart lines');
patch(`\${showAll&&jRunN?'<th class="num">The Joker</th>':''}\${showAll&&vRunN?'<th class="num">Vegas</th>':''}<th class="num">You</th></tr></thead><tbody>\`;`,
`\${showAll&&jRunN?'<th class="num">The Joker</th>':''}\${showAll&&eRunN?'<th class="num">Elo model</th>':''}\${showAll&&vRunN?'<th class="num">Vegas</th>':''}<th class="num">You</th></tr></thead><tbody>\`;`, 'the table head');
patch(`    const vw=wr.filter(r=>vPick(r)!==null); const vc=vw.filter(r=>vPick(r)===(r.result>0?r.home:r.away)).length; const vCell=vw.length?\`\${Math.round(100*vc/vw.length)}%\`:'<span class="muted">–</span>';`,
`    const vw=wr.filter(r=>vPick(r)!==null); const vc=vw.filter(r=>vPick(r)===(r.result>0?r.home:r.away)).length; const vCell=vw.length?\`\${Math.round(100*vc/vw.length)}%\`:'<span class="muted">–</span>';
    const ew=wr.filter(r=>r.elo&&r.elo.correct!=null); const ec=ew.filter(r=>r.elo.correct).length; const eCell=ew.length?\`\${Math.round(100*ec/ew.length)}%\`:'<span class="muted">–</span>';`, 'the table row counts');
patch(`\${showAll&&jRunN?\`<td class="num">\${jCell}</td>\`:''}\${showAll&&vRunN?\`<td class="num">\${vCell}</td>\`:''}<td class="num \${cls}">\${meCell}</td></tr>\`; }`,
`\${showAll&&jRunN?\`<td class="num">\${jCell}</td>\`:''}\${showAll&&eRunN?\`<td class="num">\${eCell}</td>\`:''}\${showAll&&vRunN?\`<td class="num">\${vCell}</td>\`:''}<td class="num \${cls}">\${meCell}</td></tr>\`; }`, 'the table row');
/* one week of picks behind a picker that opens on this week (the app's currentWeekDefault:
   the first week with a game not yet played, so a graded Thursday game does not move it on)
   and offers only the weeks reached: the app's picker offered every scheduled week, where the main model and the
   challenger show a call from today's ratings but the Joker and the Elo model, run for the
   coming week only, have none, and a reader took the blanks for models that had stopped. */
patch(`      \${S.picksOpen?\`<label class="muted">Week <select id="picksWeek">\${[...new Set(S.schedule.map(g=>+g.week))].sort((a,b)=>a-b).map(w=>\`<option value="\${w}" \${w===pickWeek?'selected':''}>\${w>18?'Playoffs '+(w-18):'Week '+w}</option>\`).join('')}</select></label>\`:''}</div>
    \${S.picksOpen?pickGrid(pickWeek,showAll):''}`,
`      \${S.picksOpen?(()=>{ const cur=currentWeekDefault(); const pw=S.picksWeek&&+S.picksWeek<=cur?+S.picksWeek:cur;
        return \`<label class="muted">Week <select id="picksWeek">\${[...new Set(S.schedule.map(g=>+g.week))].filter(w=>w<=cur).sort((a,b)=>b-a).map(w=>\`<option value="\${w}" \${w===pw?'selected':''}>\${w>18?'Playoffs '+(w-18):'Week '+w}\${w===cur?' (this week)':''}</option>\`).join('')}</select></label>\`; })():''}</div>
    \${S.picksOpen?(()=>{ const cur=currentWeekDefault(); const pw=S.picksWeek&&+S.picksWeek<=cur?+S.picksWeek:cur; return pickGrid(pw,showAll); })():''}`,
  'the pick grid, this week by default, earlier weeks by the picker');
patch(`  const cols=[['Main Model','#1F6F4A'],...(showAll?[['Challenger','#3B6FB6'],['The Joker','#C0392B'],['Vegas','#0F1B2D']]:[]),['You','#C98B0F']];`,
`  const elo=S.elo||{};
  const cols=[['Main Model','#1F6F4A'],...(showAll?[['Challenger','#3B6FB6'],['The Joker','#C0392B'],['Elo model','#E8730A'],['Vegas','#0F1B2D']]:[]),['You','#C98B0F']];`, 'the pick grid columns');
patch(`    const picks=[pr?pr.pick:null,...(showAll?[prH?prH.pick:null,jk?jk.pick:null,vg]:[]),S.myPicks[g.game_id]||null];`,
`    const ek=(done&&done.elo)||elo[g.game_id]||null;
    const picks=[pr?pr.pick:null,...(showAll?[prH?prH.pick:null,jk?jk.pick:null,ek?ek.pick:null,vg]:[]),S.myPicks[g.game_id]||null];`, 'the pick grid picks');
/* the viewer trim is kept for a revert; nothing uses it */
void TRIM;
/* the built app: every tab, on the published season, reading it from where the page around
   it says (window.STATE_URL) and opening on the tab it names (window.EMBED_TAB). Both are
   set by a script the page puts in before this one; on its own the app reads state.json
   beside it and routes by hash. */
function buildApp() {
  const out = html.replace(anchor, HOOK + ADMIN + LIVE + anchor);
  for (const need of ['window.STATE_URL', 'window.EMBED_TAB', 'html.embed header,html.embed #tabs{display:none}', 'const MODEL = '])
    if (!out.includes(need)) throw new Error('the built betting app is missing ' + need);
  return out;
}
module.exports = { buildApp };
if (require.main === module) {
  const out = buildApp();
  console.log(`betting app builds: ${(out.length / 1024).toFixed(1)} KB from ${path.relative(ROOT, APP)}; nothing written, nflbets/build/build.js sets it into the page`);
}
