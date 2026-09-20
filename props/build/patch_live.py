"""Live: where a saved parlay stands while the games are on (app v52).

The week's numbers reach the page from nflverse hours after the whistle. That is the right
source for grading and useless for watching, so a saved parlay sat on "pending" all Sunday
and then resolved overnight. ESPN publishes the box score while the game is being played,
free and without a key, so each leg can now show what its man has actually done: 31 of 54.5
rushing yards, 4 of 3.5 receptions, and which way the game is going on a team leg.

It spends nothing. ODDS_API_KEY buys prices from the-odds-api and is untouched here; ESPN's
public feeds cost no credits, and the page fetches them from the reader's own browser, so no
job runs and no quota moves.

Three things kept deliberately separate:

  * Nothing live is ever saved. LIVE sits outside S, like a shuffled parlay, because it is
    someone else's scoreboard rather than our state. Settlement still comes from nflverse on
    the next refresh, so a number seen here can never change what the Track Record grades.
  * A leg can be decided before the whistle. An over is safe the moment it clears; an under
    is gone the moment it busts. Both are shown as soon as they are true rather than waiting
    for the final.
  * The parsing is defensive. ESPN's payload is read by column label, never by position, and
    a player is matched on last name plus first initial within his own team, which survives
    "A.J." against "AJ" and "Marvin Harrison Jr." against "Marvin Harrison". When a fetch or
    a match fails the card says so in words instead of showing a blank, because the first
    thing anyone will want to know is which half broke.

Polling runs only while the Parlay Builder is open, a saved parlay is unsettled, and the tab
is visible: every 30 seconds, and never at all once every game involved is final.
"""
from pathlib import Path

HERE = Path(__file__).parent
J2 = HERE / 'part2.js'
J3 = HERE / 'part3.js'
H = HERE / 'part1.html'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- 1. the pure half: parsing and leg state, testable with no network ----
sub1(J2, """/* ---------- track record: every frozen pre-game chance against what happened ----------""",
     """/* ---------- live tracking: ESPN's public feeds ----------
   Free, no key, no quota: this never touches the odds API. Everything here is pure -- it
   takes a payload and returns numbers -- so the audit can test it without a network. */
const ESPN_SB='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const ESPN_SUM='https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=';
const ESPN_AB={WSH:'WAS',LA:'LAR',JAC:'JAX'};          /* where ESPN's abbreviations differ */
const espnAb=a=>{const u=String(a||'').toUpperCase(); return ESPN_AB[u]||u;};
/* a name both sources can agree on: no case, accents, punctuation or suffix */
function normName(n){ return String(n||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
  .replace(/[.'\\u2019]/g,'').replace(/-/g,' ').replace(/\\b(jr|sr|ii|iii|iv)\\b/g,'').replace(/\\s+/g,' ').trim(); }
/* last name plus first initial. Inside one team that is unique in practice, and it survives
   "A.J." against "AJ" and "Marvin Harrison Jr." against "Marvin Harrison". */
function nameKey(n){ const p=normName(n).split(' ').filter(Boolean); if(!p.length) return '';
  return p[p.length-1]+'|'+p[0][0]; }
/* where each stat we bet on sits in ESPN's box score: the group, the column's label, and for
   the two columns that carry a pair ("C/ATT", "FG") which side of the slash. Read by label
   and never by position, so a column added upstream cannot silently shift the numbers. */
const ESPN_COL={
  completions:['passing','C/ATT',0], attempts:['passing','C/ATT',1],
  passing_yards:['passing','YDS'], passing_tds:['passing','TD'], passing_interceptions:['passing','INT'],
  carries:['rushing','CAR'], rushing_yards:['rushing','YDS'],
  receptions:['receiving','REC'], receiving_yards:['receiving','YDS'], targets:['receiving','TGTS'],
  fg_made:['kicking','FG',0], fg_att:['kicking','FG',1], kick_pts:['kicking','PTS']};
function espnNum(s){ if(s==null) return null; const v=parseFloat(String(s).replace(/,/g,'')); return isFinite(v)?v:null; }
/* one player's line out of a summary payload, keyed by our own stat names */
function espnStats(sum,team,who){
  const want=nameKey(who), tm=espnAb(team), out={}; let seen=false;
  for(const b of ((sum&&sum.boxscore&&sum.boxscore.players)||[])){
    if(espnAb(b.team&&b.team.abbreviation)!==tm) continue;
    for(const grp of (b.statistics||[])){
      const labels=(grp.labels||[]).map(x=>String(x).toUpperCase());
      for(const a of (grp.athletes||[])){
        const nm=(a.athlete&&(a.athlete.displayName||a.athlete.shortName))||'';
        if(nameKey(nm)!==want) continue;
        seen=true;
        for(const stat in ESPN_COL){
          const c=ESPN_COL[stat]; if(c[0]!==grp.name) continue;
          const i=labels.indexOf(c[1]); if(i<0) continue;
          let raw=(a.stats||[])[i];
          if(c[2]!=null) raw=String(raw==null?'':raw).split('/')[c[2]];
          const v=espnNum(raw); if(v!=null) out[stat]=v;
        }
        /* a touchdown he scored himself, which is what the board's "scores a touchdown" means */
        if(grp.name==='rushing'||grp.name==='receiving'){
          const i=labels.indexOf('TD');
          if(i>=0){ const v=espnNum((a.stats||[])[i]); if(v!=null) out.tds=(out.tds||0)+v; }
        }
      }
    }
  }
  if(!seen) return null;                                  /* not on the sheet: say so, don't guess zero */
  if(out.rushing_yards!=null||out.receiving_yards!=null)
    out.scrim_yards=(out.rushing_yards||0)+(out.receiving_yards||0);
  out.any_td=out.tds||0;
  return out;
}
/* where a player leg stands. state: pre | live | post */
function liveLeg(leg,val,state){
  const k=+leg.k, r={val,k,state:'pending',need:null};
  if(state==='pre') return r;
  if(val==null){ r.state='unknown'; return r; }
  const done=state==='post';
  if(leg.stat==='any_td'||!leg.main){                     /* "k or more" */
    if(val>=k) r.state='hit'; else { r.need=k-val; r.state=done?'missed':'live'; }
    return r;
  }
  if(leg.side==='under'){                                 /* gone the moment it busts */
    if(val>k) r.state='missed'; else { r.state=done?(val===k?'push':'hit'):'live'; r.need=+(k-val).toFixed(2); }
    return r;
  }
  if(val>k) r.state='hit'; else { r.need=+(k-val).toFixed(2); r.state=done?(val===k?'push':'missed'):'live'; }
  return r;
}
/* where a team leg stands, off the scoreboard alone. sc: {home,away,hs,as,state} */
function liveGameLeg(leg,sc){
  if(!sc||sc.state==='pre') return {val:null,k:+leg.k||0,need:null,state:'pending'};
  const isHome=leg.team===sc.home, mine=isHome?sc.hs:sc.as, theirs=isHome?sc.as:sc.hs;
  if(mine==null||theirs==null) return {val:null,k:+leg.k||0,need:null,state:'unknown'};
  const done=sc.state==='post';
  if(leg.stat==='ml'){ const up=mine-theirs;
    return {val:up,k:0,need:null,state:done?(up>0?'hit':(up===0?'push':'missed')):'live'}; }
  const m=mine-theirs+(+leg.k||0);                        /* the line is from this team's side */
  return {val:m,k:0,need:null,state:done?(m>0?'hit':(m===0?'push':'missed')):'live'};
}
/* a scoreboard payload down to the games we care about, keyed by our own game id */
function espnGames(sb,sched){
  const out={};
  for(const e of ((sb&&sb.events)||[])){
    const c=(e.competitions&&e.competitions[0])||{}, cs=c.competitors||[];
    const home=cs.find(x=>x.homeAway==='home'), away=cs.find(x=>x.homeAway==='away');
    if(!home||!away) continue;
    const h=espnAb(home.team&&home.team.abbreviation), a=espnAb(away.team&&away.team.abbreviation);
    const g=(sched||[]).find(x=>x.h===h&&x.a===a); if(!g) continue;
    const st=((c.status||e.status||{}).type)||{};
    out[g.id]={eid:String(e.id),home:h,away:a,hs:espnNum(home.score),as:espnNum(away.score),
      state:st.state==='post'?'post':(st.state==='in'?'live':'pre'),clock:String(st.shortDetail||st.detail||'')};
  }
  return out;
}

/* ---------- track record: every frozen pre-game chance against what happened ----------""")

# ---- 2. fetching and polling ----
sub1(J3, """function renderSaved(){""",
     """/* ---------- live: fetch, poll, and never persist ----------
   LIVE sits outside S on purpose. It is someone else's scoreboard, not our state: it must
   never be saved, and settlement still comes from nflverse on the next refresh. */
let LIVE={at:0,games:{},box:{},err:null,busy:false,on:false};
let LIVE_TIMER=null;
const liveWanted=()=>{                                   /* the games an unsettled saved parlay needs */
  const ids=new Set();
  for(const p of (S.saved||[])){ if(settleParlay(p).status!=='pending') continue;
    for(const l of p.legs) if(l.gid) ids.add(l.gid); }
  return ids;
};
async function liveGet(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}
async function liveRefresh(){
  if(LIVE.busy) return; const want=liveWanted(); if(!want.size){ LIVE.on=false; return; }
  LIVE.busy=true;
  try{
    const sb=await liveGet(`${ESPN_SB}?seasontype=2&week=${currentWeek()}&dates=${SEASON}`);
    LIVE.games=espnGames(sb,S.sched);
    const box={};
    for(const gid of want){ const g=LIVE.games[gid]; if(!g||g.state==='pre') continue;
      try{ box[gid]=await liveGet(ESPN_SUM+g.eid); }catch(e){ /* one game short is not a failure */ } }
    LIVE.box=box; LIVE.err=null; LIVE.at=Date.now();
  }catch(e){
    /* the likeliest cause by far is the browser refusing a cross-site read, which is worth
       saying plainly rather than leaving the card blank */
    LIVE.err=String(e&&e.message||e);
  }finally{ LIVE.busy=false; }
  if($('savedCard')) renderParlay();
}
function liveStop(){ if(LIVE_TIMER){ clearInterval(LIVE_TIMER); LIVE_TIMER=null; } }
function liveStart(){
  liveStop();
  if(!LIVE.on) return;
  /* only while the tab is in front: an iPad should not poll in someone's pocket */
  LIVE_TIMER=setInterval(()=>{ if(document.visibilityState==='visible') liveRefresh(); },30000);
  liveRefresh();
}
/* what to show against one leg of a saved parlay, live */
function liveFor(l){
  const g=LIVE.games[l.gid]; if(!g) return null;
  if(isGameLeg(l)) return {...liveGameLeg(l,g),game:g};
  if(g.state==='pre') return {val:null,k:+l.k,need:null,state:'pending',game:g};
  const sum=LIVE.box[l.gid]; if(!sum) return null;
  const st=espnStats(sum,l.team,l.name);
  if(st===null) return {val:null,k:+l.k,need:null,state:'unmatched',game:g};
  return {...liveLeg(l,st[l.stat]==null?null:st[l.stat],g.state),game:g};
}
function liveCell(l){
  const r=liveFor(l); if(!r) return '';
  const tone={hit:'win',missed:'lose',push:'',live:'',pending:'',unknown:'',unmatched:''}[r.state]||'';
  if(r.state==='pending') return `<span class="lv">${esc(r.game.clock||'not started')}</span>`;
  if(r.state==='unmatched') return `<span class="lv warnc">no box-score line yet</span>`;
  if(r.state==='unknown') return `<span class="lv warnc">not reported</span>`;
  if(isGameLeg(l)){
    const g=r.game, sc=`${g.away} ${g.as}\\u2013${g.hs} ${g.home}`;
    return `<span class="lv ${tone}">${esc(sc)}<em>${esc(g.clock)}</em></span>`;
  }
  const shown=`${num(r.val,r.val%1?1:0)} / ${r.k}`;
  const room=l.main&&l.side==='under';                    /* an under has room left, not distance to cover */
  const tail=r.state==='hit'?'hit':(r.state==='missed'?'missed':(r.state==='push'?'push':
    (r.need>0?`${num(r.need,r.need%1?1:0)} ${room?'to spare':'to go'}`:'live')));
  return `<span class="lv ${tone}">${esc(shown)}<em>${esc(tail)}</em></span>`;
}
function renderSaved(){""")

# ---- 3. the live column on each saved leg, and the switch ----
sub1(J3, """        return `<div class="sp-leg">${mark}
          <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span>
          <span class="rs">${a&&a[l.stat]!=null?`got ${num(a[l.stat],0)}`:'<span class="muted">pending</span>'}</span>
          <span class="rs">${(l.p*100).toFixed(0)}%</span></div>`;}).join('')}""",
     """        const lv=(LIVE.on&&s.status==='pending')?liveCell(l):'';
        return `<div class="sp-leg">${mark}
          <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span>
          <span class="rs">${a&&a[l.stat]!=null?`got ${num(a[l.stat],0)}`:(lv||'<span class="muted">pending</span>')}</span>
          <span class="rs">${(l.p*100).toFixed(0)}%</span></div>`;}).join('')}""")

sub1(J3, """  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span></h2>`;""",
     """  const anyLive=list.some(p=>settleParlay(p).status==='pending');
  const lvBar=!anyLive?'':`<span class="grow"></span>
    <label class="muted sp-live"><input type="checkbox" id="liveCb" ${LIVE.on?'checked':''}> Live</label>
    ${LIVE.on?`<span class="muted" style="font-size:12px">${LIVE.err?'':(LIVE.at?'updated '+new Date(LIVE.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'}):'checking\\u2026')}</span>`:''}`;
  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span>${lvBar}</h2>`;
  if(LIVE.on&&LIVE.err) html+=`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05">Live scores are not loading: <b>${esc(LIVE.err)}</b>. The page reads ESPN's public scoreboard straight from your browser, and a browser will refuse that read if ESPN does not allow it from another site. Nothing else on this page is affected, and the parlay still settles from the week's own numbers.</p>`;""")

sub1(J3, """function wireSaved(){""",
     """function wireSaved(){
  $('liveCb')?.addEventListener('change',e=>{ LIVE.on=e.target.checked; LIVE.err=null;
    if(LIVE.on) liveStart(); else { liveStop(); renderParlay(); } });""")

# ---- 4. the live cell's look ----
sub1(H, """.savedp{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-md);padding:14px 16px;margin-bottom:10px;box-shadow:var(--sh-xs)}""",
     """.savedp{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-md);padding:14px 16px;margin-bottom:10px;box-shadow:var(--sh-xs)}
.sp-live{display:inline-flex;align-items:center;gap:5px;font-size:13px;white-space:nowrap}
.lv{font-family:var(--display);font-variant-numeric:tabular-nums;white-space:nowrap}
.lv em{font-style:normal;display:block;font-family:var(--body);font-size:11px;color:var(--ink-2)}
.lv.win{color:var(--pick);font-weight:700} .lv.lose{color:var(--miss);font-weight:700}
.lv.warnc{color:var(--gold);font-size:12px;font-family:var(--body)}""")

sub1(J2, "const APP_BUILD='app v51 \\u00b7 2026-09-20';", "const APP_BUILD='app v52 \\u00b7 2026-09-20';")

# ---- 5. audit: the parsing is tested against a fixture, never against a network ----
sub1(A, """    console.log(`\\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
    fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
    errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
  })();""",
     """    /* ---- T. live tracking: every bit of it pure, so none of it needs a network ---- */
    { const nameKey=F('nameKey'), espnStats=F('espnStats'), liveLeg=F('liveLeg'),
            liveGameLeg=F('liveGameLeg'), espnGames=F('espnGames');
      chk(nameKey('A.J. Brown')===nameKey('AJ Brown'),'A.J. and AJ do not match');
      chk(nameKey('Marvin Harrison Jr.')===nameKey('Marvin Harrison'),'a suffix breaks the match');
      chk(nameKey('Amon-Ra St. Brown')===nameKey('Amon-Ra St Brown'),'punctuation breaks the match');
      chk(nameKey('Josh Allen')!==nameKey('Keenan Allen'),'two Allens collide');
      const SUM={boxscore:{players:[
        {team:{abbreviation:'ATL'},statistics:[
          {name:'passing',labels:['C/ATT','YDS','AVG','TD','INT'],athletes:[{athlete:{displayName:'Michael Penix Jr.'},stats:['18/27','241','8.9','2','1']}]},
          {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],athletes:[{athlete:{displayName:'Bijan Robinson'},stats:['17','86','5.1','1','22']}]},
          {name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],athletes:[{athlete:{displayName:'Bijan Robinson'},stats:['4','31','7.8','0','12','5']}]}]},
        {team:{abbreviation:'WSH'},statistics:[
          {name:'kicking',labels:['FG','PCT','LONG','XP','PTS'],athletes:[{athlete:{displayName:'Matt Gay'},stats:['2/3','66.7','48','3/3','9']}]}]}]}};
      const bij=espnStats(SUM,'ATL','Bijan Robinson');
      chk(bij&&bij.carries===17&&bij.rushing_yards===86,'the rushing line was misread');
      chk(bij&&bij.receptions===4&&bij.receiving_yards===31&&bij.targets===5,'the receiving line was misread');
      chk(bij&&bij.scrim_yards===117,'scrimmage yards were not added up');
      chk(bij&&bij.any_td===1,'a touchdown was not counted');
      const pen=espnStats(SUM,'ATL','Michael Penix');
      chk(pen&&pen.completions===18&&pen.attempts===27,'C/ATT was not split');
      chk(pen&&pen.passing_yards===241&&pen.passing_tds===2&&pen.passing_interceptions===1,'the passing line was misread');
      const gay=espnStats(SUM,'WAS','Matt Gay');     /* our WAS against ESPN's WSH */
      chk(gay&&gay.fg_made===2&&gay.fg_att===3&&gay.kick_pts===9,'the kicking line was misread, or the team alias missed');
      chk(espnStats(SUM,'ATL','Nobody Here')===null,'a player with no line should read null, never zeroes');
      const SHUF=JSON.parse(JSON.stringify(SUM)), grp=SHUF.boxscore.players[0].statistics[1];
      grp.labels=['YDS','CAR','TD','AVG','LONG']; grp.athletes[0].stats=['86','17','1','5.1','22'];
      chk(espnStats(SHUF,'ATL','Bijan Robinson').rushing_yards===86,'the box score is read by position rather than by label');
      const over={k:43.5,side:'over',main:true,stat:'receiving_yards'},
            under={k:54.5,side:'under',main:true,stat:'rushing_yards'},
            rung={k:3,side:'over',main:false,stat:'receptions'};
      chk(liveLeg(over,50,'live').state==='hit','an over that has cleared is not called early');
      chk(liveLeg(over,20,'live').state==='live'&&liveLeg(over,20,'live').need===23.5,'an over in progress miscounts what is left');
      chk(liveLeg(over,20,'post').state==='missed','an over that never cleared is not a miss at the final');
      chk(liveLeg(under,60,'live').state==='missed','a busted under is not called the moment it busts');
      chk(liveLeg(under,30,'live').state==='live','a live under is decided too soon');
      chk(liveLeg(under,30,'post').state==='hit','an under that held is not a hit');
      chk(liveLeg(rung,3,'live').state==='hit','a rung needs k or more, not more than k');
      chk(liveLeg(rung,2,'live').need===1,'a rung miscounts what is left');
      chk(liveLeg(over,null,'live').state==='unknown','a missing number is not flagged unknown');
      chk(liveLeg(over,5,'pre').state==='pending','a game that has not started is not pending');
      const sc={home:'ATL',away:'CAR',hs:20,as:17,state:'live'}, fin={...sc,state:'post'};
      chk(liveGameLeg({stat:'ml',team:'ATL',k:0},sc).state==='live','a team leg is decided before the final');
      chk(liveGameLeg({stat:'ml',team:'ATL',k:0},fin).state==='hit','the winner is not called at the final');
      chk(liveGameLeg({stat:'ml',team:'CAR',k:0},fin).state==='missed','the loser is not called at the final');
      chk(liveGameLeg({stat:'ats',team:'CAR',k:6.5},fin).state==='hit','a cover from the dog side is misread');
      chk(liveGameLeg({stat:'ats',team:'ATL',k:-6.5},fin).state==='missed','a failed cover from the favourite side is misread');
      chk(liveGameLeg({stat:'ml',team:'ATL',k:0},{...sc,state:'pre'}).state==='pending','a game that has not kicked off is not pending');
      const SB={events:[{id:'401',competitions:[{status:{type:{state:'in',shortDetail:'Q3 7:12'}},competitors:[
        {homeAway:'home',team:{abbreviation:'ATL'},score:'20'},{homeAway:'away',team:{abbreviation:'CAR'},score:'17'}]}]}]};
      const mp=espnGames(SB,[{id:'2026_02_CAR_ATL',h:'ATL',a:'CAR',w:2}]);
      chk(!!mp['2026_02_CAR_ATL'],'the scoreboard did not map onto our schedule');
      chk(mp['2026_02_CAR_ATL'].hs===20&&mp['2026_02_CAR_ATL'].as===17,'the score came through wrong');
      chk(mp['2026_02_CAR_ATL'].state==='live'&&mp['2026_02_CAR_ATL'].eid==='401','the state or the event id is wrong');
      chk(Object.keys(espnGames(SB,[{id:'x',h:'KC',a:'BUF',w:2}])).length===0,'an unrelated game was matched anyway');
      /* the scoreboard is someone else's: it must never reach what we save */
      chk(!/"state":"(live|post|pre)"/.test(JSON.stringify(S.saved||[])),'live data reached a saved parlay');
      console.log('T. live tracking: box score, name matching, leg states and scoreboard mapping all parse'); }

    console.log(`\\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
    fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
    errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
  })();""")

print('live tracking on saved parlays, off ESPN, no credits; app v52')
