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
 * that tab.
 *
 * The Bet Log is X's there (the X Bet Log): the page also hands the frame window.XBETS, its
 * adapter for X's log, the file liveparlays/xbets.json (nflbets/build/xbets.js). With it, the
 * app's S.bets is X's weeks and S.bank.deposit X's deposit, on every device and read only: no
 * entry form, Remove, deposit box or backup card, and nothing a frame saves reaches the log. This
 * browser's own log and deposit stay in its key exactly as they were, never shown. Without it (the
 * app on its own) the Bet Log is this browser's own, as it always was.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'betting', 'app', 'x_nfl_betting_model.html');
/* the app with the behaviour patches the job runs it with too (patches.js: who starts at
   quarterback, neutral sites, the call frozen at kickoff, the season's phase), so the page and
   the job's grading agree */
const PATCHES = require('./patches.js');
let html = PATCHES(fs.readFileSync(APP, 'utf8'));
/* the season the app is built for (its freshState): the visitor's own store is keyed on it */
const { season: SEASON } = PATCHES.season(fs.readFileSync(APP, 'utf8'));
/* the visitor's own key: picks, bankroll, Bet Build, odds, and the Bet Log where no store holds X's */
const BET_KEY = 'x_nfl_viewer_picks_' + SEASON;

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
  const MINE='${BET_KEY}';
  const loadMine=()=>{ try{ const v=JSON.parse(localStorage.getItem(MINE)||'{}'); return v.myPicks||v.bank||v.bets?v:{myPicks:v}; }catch(e){ return {}; } };
  /* the X Bet Log, when the page around the frame hands one over (window.XBETS, the file
     liveparlays/xbets.json): S.bets is X's weeks and S.bank.deposit X's deposit, read only on every
     device; own is this browser's own deposit as it was when the frame loaded, which its key keeps */
  const XB={on:false, own:{deposit:null}};
  /* lay X's log over the state: the weeks, and X's deposit (none when the file has none) */
  function xbLay(S){
    const x=window.XBETS.get();
    S.bets=x.weeks; S.bank=S.bank||{lastAmt:20,filter:'all',build:[],mode:'straight'};
    S.bank.deposit=x.deposit!=null?x.deposit:null;
    document.documentElement.classList.add('xbets-ro');
  }
  /* X's log arrived after the frame had drawn (a slow read): the app's state, the global S, takes
     it and the Bet Log redraws */
  function xbChanged(){ try{ if(typeof S!=='object'||!S) return; xbLay(S); if(typeof renderBets==='function') renderBets(); }catch(e){} }
  window.PUBLISHED=true;
  window.storage={
    async get(key){
      const r=await fetch(window.STATE_URL||'state.json',{cache:'no-store'}); if(!r.ok) throw new Error('state.json '+r.status);
      const S=await r.json(); const mine=loadMine(); const picks=mine.myPicks||{};
      /* a game abroad that nflverse codes 'Home' is neutral on the page whatever the state says
         (patches.js neutralRow; the job writes it so too, and a state from before it is read right) */
      if(Array.isArray(S.schedule)&&typeof neutralRow==='function') S.schedule=S.schedule.map(neutralRow);
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
        const r2=await fetch('../elo/data/model.json?t='+Date.now(),{cache:'no-store'});
        if(r2.ok){ const M=await r2.json();
          for(const g of (M.graded||[])){ const e={pick:g.pick,correct:g.correct}; S.elo[g.game_id]=e; if(S.processed&&S.processed[g.game_id]) S.processed[g.game_id].elo=e; }
          /* the coming week's calls were made when the ratings were last built (every morning,
             before the games), so each is graded here the moment the season has its score:
             otherwise a Sunday's results wait for the next morning's re-rating to count */
          for(const g of ((M.next&&M.next.games)||[])){
            const p=S.processed&&S.processed[g.game_id];
            const winner=p&&p.result!=null?(p.result>0?p.home:p.result<0?p.away:null):null;
            const e={pick:g.pick,correct:winner?g.pick===winner:null};
            S.elo[g.game_id]=e; if(p&&e.correct!==null) p.elo=e; }
          window.__eloTeams=M.teams||null; window.__eloBuilt=M.built_at||null; }
      }catch(e){}
      window.__published=S.published;
      /* the X Bet Log: X's weeks in place of this browser's, and every change to them redrawn */
      if(window.XBETS&&typeof window.XBETS.ready==='function'){
        try{ await window.XBETS.ready(); }catch(e){}
        if(window.XBETS.enabled()){
          XB.on=true; XB.own={deposit:mine.bank&&mine.bank.deposit!=null?mine.bank.deposit:null};
          xbLay(S);
          window.XBETS.onChange(xbChanged);
        }
      }
      if(!XB.on) document.documentElement.classList.remove('xbets-ro');
      return {value:JSON.stringify(S)};
    },
    async set(key,v){ try{ const S=JSON.parse(v);
      const own={}; for(const [gid,o] of Object.entries(S.odds||{})) if(o&&o.src!=='nflverse') own[gid]=o;
      let bets=S.bets||{}, bank=S.bank||null;
      /* with X's log in the frame, this browser's own log and deposit stay in its key exactly as
         they were: what the frame shows is X's, and nothing a frame saves reaches X's file */
      if(XB.on){ bets=loadMine().bets||{}; bank=Object.assign({},bank||{},{deposit:XB.own.deposit}); }
      localStorage.setItem(MINE,JSON.stringify({myPicks:S.myPicks||{},bank,bets,odds:own,lastBackup:S.lastBackup||null,lastBackupHow:S.lastBackupHow||null}));
    }catch(e){} return true; }
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
    /* the Backup tab is on no page's bar: the card stands at the foot of the Bet Log, whose
       bets and bankroll are most of what it saves */
    const bets=document.getElementById('tab-bets'); if(bets){ card.id='backupCard'; bets.appendChild(card); }
    /* the model build line is for whoever ships the app, not for a visitor saving bets */
    card.querySelector('#buildNote')?.remove();
  });
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{ const el=document.getElementById('saveState'); if(el&&window.__published){ const d=new Date(window.__published); el.textContent='Updated '+d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); } },600);
  });
})();
</script>
`;

/* Finished games, read from ESPN in this browser: free, no odds-API credits, no job. A game
 * the scoreboard reports as over is settled on the published board, so Records counts it
 * before the job has graded it. Nothing is stored and nothing is graded on it for good: the
 * week is still settled by the job, from nflverse, on the next run.
 *
 * This is injected ahead of the app's own script, so everything it does happens on
 * DOMContentLoaded, by which time S, predict and the boards exist. */
const LIVE = `<style>
/* A wide table scrolls inside its card rather than stretching the page behind it: Power
   Ratings is eight columns and 672px, which on a 390px phone pushed everything else out
   with it. */
@media(max-width:560px){
  #tab-record table,#tab-ratings table,#tab-bets table,.pickgrid table{
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
/* the X Bet Log inside the page: X's weeks, read only on every device, nothing to enter, remove,
   deposit or back up (the class is on from the frame's first paint inside the page) */
html.xbets-ro #tab-bets>.card:first-child .bar,html.xbets-ro #backupCard,html.xbets-ro .bv-dep,html.xbets-ro [data-betdel]{display:none}
.xb-status{display:block;margin-top:4px;font-size:12px;color:var(--ink-2)}
.xb-status.ok{color:var(--pick)} .xb-status.bad{color:#8A5E05}
.xb-status a{color:inherit}
</style>
<script>
(function(){
/* embedded -- window.EMBED_TAB set by the page around this one: no header, no tab bar, no
   background, and that tab shows */
if(window.EMBED_TAB) document.documentElement.classList.add('embed');
${ESPN}
const L={games:{},busy:false};
const el=id=>document.getElementById(id);
/* the week's games, in kickoff order */
const weekGames=w=>S.schedule.filter(g=>+g.week===w)
  .sort((a,b)=>(a.gameday+a.gametime).localeCompare(b.gameday+b.gametime));
const weekOf=id=>{ const s=el(id); const v=s&&+s.value; return isFinite(v)&&v?v:null; };
const seasonOf=w=>{ const g=weekGames(w)[0]; return g?+String(g.game_id).slice(0,4):new Date().getFullYear(); };
/* ESPN numbers the playoffs as their own season type: wild card week 1, divisional 2,
   conference 3, the Super Bowl 5 (4 is the Pro Bowl); nflverse runs them on as weeks 19-22 */
const espnWeek=w=>w>18?'seasontype=3&week='+(w===22?5:w-18):'seasontype=2&week='+w;
async function read(){
  if(L.busy) return;
  const weeks=[weekOf('weekSel')].filter(Boolean);
  if(!weeks.length) return;
  L.busy=true;
  try{
    const games={};
    for(const w of weeks){
      const r=await fetch(ESPN_SB+'?'+espnWeek(w)+'&dates='+seasonOf(w),{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      Object.assign(games,espnGames(await r.json(),
        weekGames(w).map(g=>({id:g.game_id,h:g.home_team,a:g.away_team}))));
    }
    L.games=games;
  }catch(e){}
  finally{ L.busy=false; }
  /* a finished game becomes a result; the boards are redrawn by the app so that records,
     ticks and crosses all follow from it */
  if(settleFinished()){
    /* Records too: it reads the same S.processed and was left showing the counts from
       before the games settled until you happened to switch tabs. */
    for(const n of ['renderPicks','renderRecord'])
      if(typeof window[n]==='function'){ try{ window[n](); }catch(e){} }
    tidyStats();
  }
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
    /* the call the job froze at kickoff when it has one (patches.js), else the board's own */
    const fz=typeof window.frozenCall==='function'?window.frozenCall(g):null;
    let pr=fz;
    if(!pr&&typeof window.predict==='function'){ try{ pr=window.predict(g,S.teams); }catch(e){} }
    if(!pr) continue;
    /* Every model that has a column has to be in the row, not just the main one. The grid
       reads done.h for the challenger and has no fallback behind it, so a settled row
       without it blanks the challenger's pick and drops the game from its record. The joker
       falls back to S.joker and survived; the challenger had nothing to fall back to. */
    let h=fz&&fz.h?fz.h:null;
    if(!h&&S.teamsH&&typeof window.predict==='function'){
      try{ h=window.predict(g,S.teamsH,(typeof MODEL_H!=='undefined'&&MODEL_H)?MODEL_H.pure:undefined); }catch(e){}
    }
    const jk=(S.joker&&S.joker[g.game_id])||null;
    /* the ELO Model and Broly too: graded here from the scoreboard like the rest, or the record
       compared them on fewer games than the others from the whistle until the job graded it */
    const ek=(S.elo&&S.elo[g.game_id])||null, bk=(S.broly&&S.broly[g.game_id])||null;
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
      elo:ek&&ek.pick?{pick:ek.pick,correct:winner?ek.pick===winner:null}:undefined,
      broly:bk&&bk.pick?{pick:bk.pick,pHome:bk.pHome,correct:winner?bk.pick===winner:null}:undefined,
      news:[],
      fromScoreboard:true};
    n++;
  }
  return n;
}

/* My Picks is gone: the tab, its section and the You column wherever the app still draws
   one. Nothing is deleted from storage -- the picks key is left exactly as it is, so
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
}
/* two paragraphs of method under Records and Power Ratings that nobody reads twice: the
   small-samples note under the record chart and the paragraph that explains the absences
   table. The app redraws them; this drops them. (The chart's own intro is rewritten by
   record_viz.js.) */
const DROP=[/^Early weeks bounce around on small samples/,/^Two absences carry a measured effect/];
function dropNotes(){
  document.querySelectorAll('#tab-record p.muted, #tab-ratings p.muted').forEach(p=>{
    const t=p.textContent.trim(); if(DROP.some(re=>re.test(t))) p.remove();
  });
}
function after(){ stripMine(); allModels(); tidyStats(); ratingsExtras(); dropNotes(); }
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

/* the frame opens on the tab the page around it names */
function routeTabs(){
  const tabs=document.getElementById('tabs'); if(!tabs) return;
  const go=name=>{ const b=tabs.querySelector('button[data-tab="'+name+'"]'); if(b) b.click(); };
  if(window.EMBED_TAB) go(window.EMBED_TAB);
}
/* the tabs are redrawn on every pick, week change and upload, which brings back what was
   stripped, so tidy up after whatever redrew them rather than chasing each caller */
function hook(name){
  const f=window[name]; if(typeof f!=='function') return;
  window[name]=function(){ const r=f.apply(this,arguments); setTimeout(after,0); return r; };
}
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(after,0);
  /* read once on load, so a finished game shows its result without being asked and does not
     vanish again on the next reload */
  setTimeout(read,300);
  for(const n of ['renderPicks','renderRecord','renderRatings','renderAdjust']) hook(n);
  stripMine();
  allModels();
  ratingsExtras();
  dropNotes();
  routeTabs();
});
})();
</script>
`;

/* the Pick'em Record's pictures (record_viz.js): wins against Vegas and the week-by-week grid,
   drawn over renderRecord()'s own, which calls recordViz(rows) last (patched below) */
const VIZ_JS = fs.readFileSync(path.join(__dirname, 'record_viz.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'ratings_viz.js'), 'utf8')
  + '\n' + fs.readFileSync(path.join(__dirname, 'bets_viz.js'), 'utf8');
if (/<\/script/i.test(VIZ_JS)) throw new Error('record_viz.js must not contain a closing script tag');
/* the scripts go in with String.replace, where $' $` $& and $$ are patterns, not text */
if (/\$['`&$]/.test(VIZ_JS)) throw new Error('a viz script contains a $ pattern that String.replace would expand; write the dollar sign as \\u0024');
const VIZ = `<style>
.bv-hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 6px}
.bv-hd h2{margin:0;flex:1}
.bv-wrap{position:relative}
.bv-chart{display:block;width:100%;height:auto;overflow:visible;font-variant-numeric:tabular-nums}
.bv-hit{cursor:crosshair}
.bv-tip{position:absolute;top:0;z-index:2;background:var(--panel);border:1px solid var(--line-2);border-radius:10px;padding:8px 10px;font-size:12px;line-height:1.5;color:var(--ink-2);box-shadow:0 8px 24px -10px rgba(15,27,45,.35);pointer-events:none;white-space:nowrap}
.bv-tip b{display:block;color:var(--ink)}
.bv-dep{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:4px 0 0;font-size:13px;color:var(--ink-2)}
.bv-dep input{width:100px;margin-left:4px}
.bv-dep .muted{font-size:12px}
.rv-wrap{position:relative;margin:4px 0 0}
.rv-chart{display:block;width:100%;height:auto;overflow:visible}
.rv-hit{cursor:crosshair}
.rv-tip{position:absolute;top:6px;z-index:2;background:var(--panel);border:1px solid var(--line-2);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--ink-2);box-shadow:0 8px 24px -10px rgba(15,27,45,.35);pointer-events:none;white-space:nowrap}
.rv-tip b{display:block;color:var(--ink);margin-bottom:4px}
.rv-tip div{display:flex;align-items:center;gap:2px;line-height:1.6}
.rv-gridwrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table.rv-grid{border-collapse:separate;border-spacing:3px;width:auto;min-width:100%}
table.rv-grid th,table.rv-grid td{border:0;padding:7px 10px;border-radius:8px}
table.rv-grid thead th{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);background:none;text-align:center;white-space:nowrap}
table.rv-grid thead th small{display:block;text-transform:none;letter-spacing:0;font-weight:400}
table.rv-grid th.rv-m{text-align:left;white-space:nowrap;font-size:13px;font-weight:600;text-transform:none;letter-spacing:0;color:var(--ink);background:var(--panel);position:sticky;left:0;z-index:1}
table.rv-grid td.rv-c{text-align:center;min-width:64px;font-variant-numeric:tabular-nums;color:var(--ink)}
table.rv-grid td.rv-c b{display:block;font-family:var(--display);font-size:14px}
table.rv-grid td.rv-c small{display:block;font-size:11px;color:var(--ink-2)}
table.rv-grid td.rv-none{color:var(--muted)}
table.rv-grid .rv-season{border-left:2px solid var(--line-2)}
table.rv-grid td.rv-fit{background:repeating-linear-gradient(135deg,var(--line-2) 0 2px,transparent 2px 7px)}
table.rv-grid td.rv-fit small{font-style:italic}
.rt-lag{margin-left:3px;color:var(--muted);font-weight:700;cursor:help}
.rt-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table.rt-v{width:100%}
#ratingsTable table.rt-v th,#ratingsTable table.rt-v td{width:auto}
/* the table is fixed-layout: the rank and the team get their widths, the rest share what is left */
#ratingsTable table.rt-v th:first-child,#ratingsTable table.rt-v td:first-child{width:46px;padding-right:2px;white-space:nowrap}
#ratingsTable table.rt-v th:nth-child(2),#ratingsTable table.rt-v td:nth-child(2){width:230px;padding-left:4px}
#ratingsTable table.rt-v{min-width:720px}
#ratingsTable table.rt-v th:nth-child(n+3),#ratingsTable table.rt-v td:nth-child(n+3){text-align:center}
table.rt-v td.rt-pct,table.rt-v td.rt-rec{font-variant-numeric:tabular-nums}
</style>
<script>
${VIZ_JS}
</script>
`;
const anchor = '<script>\nconst MODEL = ';
if (!html.includes(anchor)) throw new Error('could not find the main script start to inject the hook');

/* The Elo model in the pick grid. The app's pickGrid draws the Joker from
   processed[gid].joker or S.joker; the same lines are widened here, at build time, to draw
   the Elo model from processed[gid].elo or S.elo, which the hook above fills from
   elo/data/model.json. (The record's chart and week-by-week table are record_viz.js's, which
   draws the Elo model itself.) Each edit must land exactly once, so a change to the app that
   moves these lines stops the build rather than dropping the Elo model from the grid. The
   app file itself is not touched: it is the source shipped from nfl-model-lab. */
const patch = (from, to, what) => {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`the Elo model patch "${what}": expected exactly one match, found ${n}`);
  html = html.replace(from, () => to);
};
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
`  const elo=S.elo||{}, brl=S.broly||{};
  const cols=[['Alpha Model','#1F6F4A'],...(showAll?[['Challenger Model','#3B6FB6'],['The Joker','#C0392B'],['ELO Model','#E8730A'],['Broly Model','#7A3FB0'],['Vegas','#0F1B2D']]:[]),['You','#C98B0F']];`, 'the pick grid columns');
patch(`    const picks=[pr?pr.pick:null,...(showAll?[prH?prH.pick:null,jk?jk.pick:null,vg]:[]),S.myPicks[g.game_id]||null];`,
`    const ek=(done&&done.elo)||elo[g.game_id]||null, bk=(done&&done.broly)||brl[g.game_id]||null;
    const picks=[pr?pr.pick:null,...(showAll?[prH?prH.pick:null,jk?jk.pick:null,ek?ek.pick:null,bk?bk.pick:null,vg]:[]),S.myPicks[g.game_id]||null];`, 'the pick grid picks');
patch(`  el.innerHTML='<div class="card"><h2>Week by week</h2>'+html+'</tbody></table></div>';
  renderBets();`,
`  el.innerHTML='<div class="card"><h2>Week by week</h2>'+html+'</tbody></table></div>';
  recordViz(rows);
  renderBets();`, 'the record pictures, drawn over the app\'s own');
patch(`
}
function renderAdjust(){`, `
  ratingsViz();
}
function renderAdjust(){`, 'Power Ratings, the ELO Model\'s');
/* Import on a published page: the file's ratings and results are old by the time it is
   read, and the job's are current, so only the visitor's own entries come from it (picks,
   bets, the bankroll and Bet Build, odds they loaded themselves); the season stays the
   published one. The confirm says so. */
patch(`The file you pick will REPLACE everything currently in the app: ratings, results, your picks, bankroll history and odds. This cannot be undone. Export a backup first if you are unsure.`,
`The file you pick REPLACES your picks, Bet Log, bankroll and Bet Build in this browser. Ratings and results stay the published ones. Save a backup first if you are unsure.`, 'the import warning');
patch(`S=s; save(); buildCheck(); renderAll(); log('State imported.','ok');`,
`if(window.PUBLISHED){ S.myPicks=s.myPicks||{}; S.bets=s.bets||{}; if(s.bank) S.bank=s.bank; S.lastBackup=s.lastBackup||null; S.lastBackupHow=s.lastBackupHow||null;
      const own={}; for(const [gid,o] of Object.entries(s.odds||{})) if(o&&o.src!=='nflverse') own[gid]=o; S.odds=Object.assign({},S.odds||{},own); }
    else S=s;
    save(); buildCheck(); renderAll(); renderBackupState(); log('Backup imported.','ok');`, 'the import, the visitor\'s entries only');
/* the Bet Log is X's (the X Bet Log): its heading, and a note bets_viz.js fills with what the log
   is and when it last changed */
patch(`    <h2>Bet log</h2>
    <p class="muted" style="margin:0 0 10px">One line per week.`, `    <h2>X Bet Log</h2>
    <p class="muted" id="xbNote" style="margin:0 0 10px">One line per week.`, 'the X Bet Log heading');
/* a note is drawn as text: a note in X's log is drawn in every visitor's frame */
patch(`+\`<td class="muted">\${r.note||''}</td>`, `+\`<td class="muted">\${String(r.note||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]))}</td>`, 'the Bet Log note, escaped');
/* the Bet Log: the app draws its chart and table, then betsViz() (bets_viz.js) redraws them
   as a bankroll chart (balance or weekly P&L) with the balance among the figures */
patch(`function renderBets(){`, `function renderBets(){ renderBetsApp(); betsViz(); }
function renderBetsApp(){`, 'the Bet Log balance');
/* the Elo tiers: Challenger renamed Elite, and HOF above it from 1750, worn as a gem (tiers.js) */
html = require('./tiers.js')(html, 'the built app');
/* the built app: every tab, on the published season, reading it from where the page around
   it says (window.STATE_URL) and opening on the tab it names (window.EMBED_TAB). Both are
   set by a script the page puts in before this one; on its own the app reads state.json
   beside it and opens on its first tab. */
/* the main model's name as the page shows it: Alpha Model (the Elo game model is written as ELO
   based wherever the build draws it). Only the words a reader sees change, at build time;
   the app source is not edited. */
const RENAME = [[/Main Model/g, 'Alpha Model'], [/\bthe main model\b/g, 'Alpha Model'], [/\bmain model\b/g, 'Alpha Model']];
function buildApp() {
  let out = html.replace(anchor, HOOK + LIVE + VIZ + anchor);
  for (const [re, to] of RENAME) out = out.replace(re, to);
  for (const need of ['function betsViz(', 'renderBetsApp(); betsViz();', 'window.XBETS.get()', 'if(XB.on){ bets=loadMine().bets||{};', 'html.xbets-ro #backupCard', 'id="xbNote"', 'function recordViz(', 'recordViz(rows);', 'function ratingsViz(', 'ratingsViz();', 'window.STATE_URL', 'window.EMBED_TAB', 'html.embed header,html.embed #tabs{display:none}', 'const MODEL = '])
    if (!out.includes(need)) throw new Error('the built betting app is missing ' + need);
  /* X's log is read only in every frame: nothing in the app writes it or signs anyone in or out */
  for (const gone of ['XBETS.write', 'XBETS.signOut', 'xbSignOut', 'xbBackup', 'Owner on this device'])
    if (out.includes(gone)) throw new Error('the built betting app still has ' + gone + ': the X Bet Log is a file, read only on every device');
  return out;
}
module.exports = { buildApp, SEASON, BET_KEY };
if (require.main === module) {
  const out = buildApp();
  console.log(`betting app builds: ${(out.length / 1024).toFixed(1)} KB from ${path.relative(ROOT, APP)}; nothing written, nflbets/build/build.js sets it into the page`);
}
