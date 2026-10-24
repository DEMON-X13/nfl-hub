/* ---------- small helpers ---------- */
function hex2rgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function lum(h){const [r,g,b]=hex2rgb(h).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*r+0.7152*g+0.0722*b;}
function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
function textOn(h){return ratio(h,'#FFFFFF')>=ratio(h,'#132238')?'#FFFFFF':'#132238';}
function darken(h,f){const [r,g,b]=hex2rgb(h);const c=v=>('0'+Math.round(v*f).toString(16)).slice(-2);return '#'+c(r)+c(g)+c(b);}
function tagBg(h){let c=h,i=0;while(Math.max(ratio(c,'#FFFFFF'),ratio(c,'#132238'))<4.5&&i<10){c=darken(c,0.92);i++;}return c;}
function teamCols(t){return TEAM_COLORS[t]||['#5A6673'];}
function chroma(h){const [r,g,b]=hex2rgb(h);return (Math.max(r,g,b)-Math.min(r,g,b))/255;}
function lightness(h){const [r,g,b]=hex2rgb(h);return (Math.max(r,g,b)+Math.min(r,g,b))/2/255;}
function vivid(h){return chroma(h)>=0.35&&lightness(h)>=0.15&&lightness(h)<=0.85;}
/* each team's own colour, falling back through its palette when the primary
   is too dark or too washed out to read as anything but navy */
function tagColor(t){
  if(TAG_OVERRIDE[t]) return TAG_OVERRIDE[t];
  const pal=teamCols(t);
  if(vivid(pal[0])) return pal[0];
  const alt=pal.slice(1).filter(vivid);
  return alt.length?alt.reduce((a,b)=>chroma(b)>chroma(a)?b:a):pal[0];
}
/* a green check by the side that won a finished game; nothing for a tie or a game still on */
function winMark(g,t){ if(!gameFinal(g)||!hasScore(g)||g.as===g.hs) return ''; return (g.as>g.hs?g.a:g.h)===t?'<span class="wck" title="Won" aria-label="won">\u2713</span>':''; }
function tag(t){const bg=tagBg(tagColor(t));
  return `<span class="ttag" style="background:${bg};color:${textOn(bg)};border-color:${darken(bg,.72)}">${t}</span>`;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* the schedule's times are US Eastern; they are shown in the viewer's own zone */
function fmtDate(g){ if(!g.d) return {day:'',t:''};
  const k=g.t?kickoff(g):null, dt=k||new Date(g.d+'T12:00:00');
  const day=dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  const t=k?k.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'';
  return {day,t}; }
function fmtML(ml){ return ml==null?'\u2013':(ml>0?'+'+ml:''+ml); }
function mlToDec(ml){ if(ml==null||!isFinite(ml)||ml===0) return null; return ml>0?ml/100+1:100/Math.abs(ml)+1; }
function decToML(d){ if(!isFinite(d)||d<=1) return null; return d>=2?Math.round((d-1)*100):-Math.round(100/(d-1)); }
function num(x,d){ return x==null||!isFinite(x)?'\u2013':(+x).toFixed(d); }
function log(msg,cls=''){ const el=$('log'); if(!el) return; const ph=el.querySelector('[data-placeholder]'); if(ph) ph.remove();
  const d=document.createElement('div'); if(cls)d.className=cls; d.textContent=msg; el.prepend(d); }
function setStatus(id,msg,cls){ const el=$(id); if(el){ el.textContent=msg; el.className=cls||'muted'; } }
function weeks(){ return [...new Set(S.sched.map(g=>+g.w))].sort((a,b)=>a-b); }
function currentWeek(){ return liveWeek(); }
function gamesIn(w){ return S.sched.filter(g=>+g.w===w).sort((a,b)=>((a.d||'')+(a.t||'')).localeCompare((b.d||'')+(b.t||''))); }

/* ---------- games list ---------- */
function renderWeekOptions(){
  const cur=$('weekSel').value?+$('weekSel').value:currentWeek();
  for(const id of ['weekSel']){
    const sel=$(id); if(!sel) continue;
    sel.innerHTML=weeks().map(w=>`<option value="${w}">Week ${w}</option>`).join('');
    sel.value=cur;
  }
}
/* scroll to the top only when the overlay is first opened; a re-render (expanding a player,
   changing a setting) keeps the reader where they were */
function openGameModal(){ const m=$('gameModal'); if(m.hidden){ m.hidden=false; document.body.classList.add('modal-open'); m.scrollTop=0; } }
/* (app v128) the scroll lock goes only where no other window is still open: renderSlate closes the game's page on every
   redraw with none chosen, and took it from a window open over another part of the page */
function closeGameModal(){ const m=$('gameModal'); m.hidden=true;
  if(!document.querySelector('.modal:not([hidden]),.lp-dlg:not([hidden])')) document.body.classList.remove('modal-open'); }
function closeGame(){ S.ui.game=null; save(); closeGameModal(); renderSlate(); }
/* (app v126) the game's page is the Props tab's own window, on the screen only while that tab is: leaving the tab
   (another tab's button, or on the hub the address moved by Back or a link, which routeTabs turns into a click on
   the tab's button) closes it as its Back button does, so no page hidden with its tab holds body's modal-open (the
   tab the address went to could not scroll) or answers Escape. A page not open is left alone, so a switch before
   the payload is in saves nothing. A focus the switch left on what it took off the screen (the game's page, a
   window or a row of the old tab) goes to the chosen tab's button, never the page's body; a browser keeps
   activeElement on a newly hidden element until its next rendering update, so the click sees it, whichever
   hashchange listener ran first. A focus on anything still shown stays, and with nothing focused (a load) none is
   made */
function gameShown(){ const m=$('gameModal'); return !!m&&!m.hidden&&!m.closest('[hidden]'); }
function tabLeft(b){
  const a=document.activeElement, gone=x=>!x.isConnected||!!x.closest('[hidden]');
  if(b.dataset.tab!=='slate'&&!$('gameModal').hidden) closeGame();
  /* read before the close: its redraw replaces the slate's rows, and a focused row removed leaves the body */
  const f=document.activeElement, at=f&&f!==document.body?f:a;
  if(a&&a!==document.body&&gone(at)) try{ b.focus({preventScroll:true}); }catch(e){}
}
/* W-L on the model's side of every book main line, frozen pre-game numbers */
function renderRecords(w){
  const wr=$('weekRec'), sr=$('seasonRec'); if(!wr||!sr) return;
  const main=trackRecord().filter(r=>r.kind==='main');
  const line=rows=>`${rows.filter(r=>r.hit).length}\u2013${rows.filter(r=>!r.hit).length}`;
  wr.innerHTML=`Week ${w} <b>${line(main.filter(r=>+r.w===+w))}</b>`;
  sr.innerHTML=`Season <b>${line(main)}</b>`;
}
/* ---------- the games list's rows and a game's head (app v122) ----------
   The owner's call of 20 October 2026, with the list's row, the board's row and a game's page in three
   screenshots: the list's rows look like the Matchups board's, and what they showed until then goes to the
   head of each game's page. */

/* the call the list draws on a game, the board's rule on this page's own lines (the ones a game's page prices
   from, a Refresh odds press included): the home side's chance from the two moneylines with the book's margin
   taken out, else from the spread, a margin spread MARGIN_SD about it; with no line posted at all, the model's
   own chance (gameBet; src 'model'). null for a pick'em spread with no moneylines, which the board leaves
   without a call too. pick is the side at 50% or more, the home side on an even split, as on the board */
function slateCall(g){
  const ml=x=>x!=null&&isFinite(x)&&+x!==0, imp=x=>x<0?-x/(-x+100):100/(x+100);
  let pH=null, src='market';
  if(ml(g.mla)&&ml(g.mlh)){ const h=imp(+g.mlh), a=imp(+g.mla); pH=h/(h+a); }
  else if(g.sp!=null&&isFinite(g.sp)){ if(+g.sp!==0) pH=gbNorm(+g.sp/MARGIN_SD); }
  else { pH=gameBet(g,g.h,'ml').p; src='model'; }
  if(pH==null||!isFinite(pH)) return null;
  return {pH,pick:pH>=0.5?g.h:g.a,conf:Math.max(pH,1-pH),src};
}
/* the Matchups board's confidence band on the favourite's chance */
function slateTier(c){ const r=Math.round(c*100)/100; return r>=0.75?['high','HIGH']:r>=0.60?['med','MED']:r>=0.55?['low','LOW']:['coin','50/50']; }
/* the win-probability bar's two colours, the board's rule (probCols in nflbets/build/hub.html) on this page's own
   tag colours: each side its tag's colour with its percentage in textOn's ink; where the two would read as one
   colour (two reds), the home side the first of its own colours that does not, else a slate */
function slateCols(a,h){
  const hsl=c=>{ const [r,g,b]=hex2rgb(c).map(v=>v/255), mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
    const hh=!d?0:mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4; return [hh*60,d,(mx+mn)/2]; };
  const near=(x,y)=>{ const [h1,c1,l1]=hsl(x), [h2,c2,l2]=hsl(y), dh=Math.min(Math.abs(h1-h2),360-Math.abs(h1-h2));
    return c1<.15||c2<.15 ? c1<.15&&c2<.15&&Math.abs(l1-l2)<.15 : dh<28&&Math.abs(l1-l2)<.18; };
  const ca=tagBg(tagColor(a));
  let ch=tagBg(tagColor(h));
  if(near(ca,ch)) ch=teamCols(h).map(tagBg).find(c=>!near(ca,c))||'#475068';
  return [{bg:ca,ink:textOn(ca)},{bg:ch,ink:textOn(ch)}];
}
/* a game at a neutral site: the betting job's schedule says so where the hub's page has it (window.pkBoard, the
   page's glue: it marks most of them Neutral); without it, a 9:30am Eastern kickoff, which is one played abroad */
function slateNeutral(g){
  try{ const B=window.pkBoard; if(B&&B.ST&&Array.isArray(B.ST.sched)&&typeof B.neutral==='function'){
    const r=B.ST.sched.find(x=>x.game_id===g.id); if(r) return !!B.neutral(r); } }catch(e){}
  return g.t==='09:30';
}
/* where a game stands: the payload's final score, else what the scoreboard said when Refresh scores last
   read it (LIVE); null before kickoff or with nothing read */
function slateOutcome(g){
  if(hasScore(g)) return {final:true,live:false,as:+g.as,hs:+g.hs,clock:''};
  const s=LIVE.slate?LIVE.games[g.id]:null;
  if(s&&s.as!=null&&s.hs!=null&&isFinite(s.as)&&isFinite(s.hs)&&s.state!=='pre')
    return {final:s.state==='post',live:s.state!=='post',as:+s.as,hs:+s.hs,clock:s.clock||''};
  return null;
}
/* the final-score cell: 0 : 0 to come; LIVE once kicked off with no scoreboard read, Final with none four hours
   on; on now, the side leading and the clock, in the pick's colour by whether it leads; played, the side that
   won and whether the pick hit */
function slateResult(g,c){
  const o=slateOutcome(g);
  if(!o){
    if(gameFinal(g)) return '<b class="sl-sc sl-pend">Final</b>';
    if(gameStarted(g)) return '<b class="sl-sc sl-pend">LIVE</b>';
    return '<b class="sl-sc sl-pend">0 : 0</b>';
  }
  const win=o.as>o.hs?g.a:(o.hs>o.as?g.h:null), score=`${num(o.as,0)}–${num(o.hs,0)}`;
  if(o.live){ const cls=!c||!win?'tie':(c.pick===win?'ok':'bad');
    return `<span class="sl-mwin sl-${cls}">${win?esc(win)+' leading '+score:'Tied '+score}</span><span class="sl-sub">${esc(o.clock)}</span>`; }
  const hit=c&&win?c.pick===win:null;
  return `<span class="sl-mwin sl-${hit==null?'tie':(hit?'ok':'bad')}">${win?esc(win)+' won '+score:'Tie '+score}</span><span class="sl-sub">${hit==null?'':(hit?'Pick hit':'Pick missed')}</span>`;
}
/* the score prediction: the score the game's projections stand on (gameCtx: the posted spread split around the
   posted total, or the model's own points with no line), each side rounded once, so the margin under it is the
   difference of the two numbers shown; "even" where they are level */
function slatePred(g){
  const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), sa=+ca.implied.toFixed(0), sh=+ch.implied.toFixed(0);
  const lead=sa>sh?g.a:g.h;
  const by=sa===sh?'<span class="sl-pby">even</span>'
    :`<span class="sl-pby">${tag(lead).replace('class="ttag"','class="ttag sl-mini"')} by ${Math.abs(sa-sh)}</span>`;
  return `<span class="sl-plab">Predicted</span><span class="sl-psc" title="${esc(g.a)} ${sa}, ${esc(g.h)} ${sh}: ${ca.src==='market'?`the posted spread split around the posted total of ${g.tot}`:'our model, no line posted yet'}">${sa}–${sh}</span>${by}${ca.src==='model'?'<span class="sl-sub">no line yet, our model</span>':''}`;
}
/* (app v122) a game's head on its page: what the list's row showed of the game until this version, each figure
   under the list's own heading for it: the kickoff (or the live score and clock, or FINAL), the matchup, the three
   biggest projections (each against what the player did once the game's stats are in), the score the game's
   projections stand on, its total and the pick it makes, every number worked as the row worked it */
function gameHeadCard(g){
  const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);
  /* the scores as the head shows them, rounded once: the pick and its margin are read from these,
     so "22 - 20" never reads "by 3" */
  const sa=+ca.implied.toFixed(0), sh=+ch.implied.toFixed(0);
  const started=gameStarted(g), fin=gameFinal(g);
  const lab=t=>`<span class="gh-lab">${t}</span>`;
  const lead=gameHeadline(g).map(x=>{
    const st={pass:'passing_yards',rush:'rushing_yards',rec:'receiving_yards'}[x.k];
    const a=fin?actualFor(g.w,x.v.pl.id):null;
    const av=a?a[st]:null;
    const band=av==null?'':hitBand(av,x.v.mu);
    return `<div><span class="cat">${x.k}</span><span class="nm">${esc(shortName(x.v.pl.n))}</span><span class="v">${x.v.mu.toFixed(0)}<em>yds</em>${
      av!=null?`<span class="va ${band}">${num(av,0)}<em>yds</em></span>`:(fin?'<span class="va pend">–</span>':'')}</span></div>`;}).join('');
  const pick=(()=>{
    if(sa===sh){ const even='<span class="none">–</span><small>even</small>';
      if(!hasScore(g)) return even;
      return even+`<small class="act">(${g.as===g.hs?'tie':`${g.as>g.hs?g.a:g.h} by ${Math.abs(g.as-g.hs)}`})</small>`; }
    const p=sa>sh?g.a:g.h, by=Math.abs(sa-sh);
    if(!hasScore(g)) return tag(p)+`<small>by ${by}</small>`+(ca.src==='model'?'<small class="muted">no line yet, our model</small>':'');
    if(g.as===g.hs) return tag(p)+`<small>by ${by}</small><small class="act">(tie)</small>`;
    const real=g.as>g.hs?g.a:g.h, right=real===p;
    return tag(p)+`<small>by ${by}</small><small class="act ${right?'right':'wrong'}">${right?'✓ ':'✗ '}${real} by ${Math.abs(g.as-g.hs)}</small>`;
  })();
  return `<div class="card ghead" data-ghead="${esc(g.id)}"><div class="gh-grid">
    <div class="gh-when">${lab('Kickoff')}<div class="when"><b>${d.day}</b>${fin?'<span class="pill ok">FINAL</span>'+liveWhen(g,true):(started?liveWhen(g):d.t)}</div></div>
    <div class="gh-match">${lab('Matchup')}<h2>${tag(g.a)}${winMark(g,g.a)} <span class="at">at</span> ${tag(g.h)}${winMark(g,g.h)}</h2></div>
    <div class="gh-lead">${lab('Biggest projections')}<div class="lead">${lead||'<span class="muted">No projections for this game yet</span>'}</div></div>
    <div class="tot">${lab('Expected score')}<b>${sa} – ${sh}</b><small>${g.a} / ${g.h}</small>${hasScore(g)?`<small class="act">(actual ${g.as} – ${g.hs})</small>`:liveScoreLine(g)}</div>
    <div class="totpts${ca.src==='model'?' assumed':''}">${lab('Total pt')}<b>${(ca.implied+ch.implied).toFixed(0)}</b><small>${ca.src==='market'?'points':'our model'}</small>${hasScore(g)?`<small class="act">(actual ${g.as+g.hs})</small>`:''}</div>
    <div class="winner">${lab('Vegas pick')}${pick}</div>
  </div></div>`;
}
function renderSlate(){
  if(S.ui.game){ const g=S.sched.find(x=>x.id===S.ui.game); if(!g||!weekOpen(+g.w)) S.ui.game=null; }
  if(!S.ui.game) closeGameModal();
  $('slateView').hidden=false;
  const w=+$('weekSel').value||currentWeek();
  renderRecords(w);
  const gs=gamesIn(w);
  const open=weekOpen(w), lw=liveWeek();
  /* expected points are the biggest input to every projection, so say so when the lines are stale (app v130: the
     state alone) */
  { const ln=$('lineNote');
    if(ln){ const soon=gs.some(g=>{ const k=kickoff(g); return k&&!gameFinal(g)&&k.getTime()-Date.now()<3*864e5; });
      const age=S.gamesFetched?(Date.now()-S.gamesFetched)/864e5:null; const stale=open&&soon&&(age==null||age>3);
      ln.hidden=!stale;
      ln.textContent=!stale?'':(age==null?'Lines not pulled yet.'
        :`Lines last pulled ${age.toFixed(0)} day${age>=1.5?'s':''} ago.`); } }
  /* Refresh odds over the game list (app v107): every game of the week still to come */
  { const so=$('slateOdds'); if(so){ const on=open&&w===currentWeek()&&pbGames().length>0; so.hidden=!on; so.innerHTML=on?espnCtl(null,'slate'):''; } }
  if(!open){
    $('gamesList').innerHTML=`<div class="empty" style="text-align:left;padding:26px 30px">
      <b style="font-family:var(--display);font-size:22px;display:block;margin-bottom:8px">Week ${w} isn't open yet</b>
      <p class="muted" style="margin:0">Opens once week ${lw} is complete.</p>
      <div style="margin-top:16px">${gs.map(g=>{const d=fmtDate(g);
        return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line)">
          <span class="muted" style="font-size:12px;width:170px">${d.day} ${d.t}</span>${tag(g.a)}<span class="muted">at</span>${tag(g.h)}</div>`;}).join('')}</div>
    </div>`;
    return;
  }
  /* (app v122) the Matchups board's row: the date, the matchup, the win probability, the confidence band, the
     score prediction and the final score; what the row showed until then is at the head of the game's page */
  const card=g=>{
    const c=slateCall(g), d=fmtDate(g), o=slateOutcome(g), fin=gameFinal(g), started=gameStarted(g);
    const pa=c?Math.round((1-c.pH)*100):50, ph=100-pa, pc=slateCols(g.a,g.h), [tc,tl]=c?slateTier(c.conf):['',''];
    const pick=c?c.pick:null, neu=slateNeutral(g);
    const win=o&&o.final&&o.as!==o.hs?(o.as>o.hs?g.a:g.h):null, hit=win&&c?c.pick===win:null;
    const mk=t=>win===t&&hit!=null?`<span class="sl-res ${hit?'sl-ok':'sl-bad'}" title="${hit?'Pick hit':'Pick missed'}">${hit?'✓':'✗'}</span>`:'';
    const tg=t=>pick===t?tag(t).replace('class="ttag"','class="ttag sl-win"'):tag(t);
    return `<button type="button" class="game${fin?' final':(started?' locked':'')}" data-game="${g.id}">
      <div class="when"><b>${d.day}</b>${d.t}</div>
      <div class="matchup"><span class="sl-tw sl-away">${tg(g.a)}${mk(g.a)}</span>${neu?'<span class="at neutral" title="Neutral site">vs</span>':'<span class="at">at</span>'}<span class="sl-tw sl-home">${tg(g.h)}${mk(g.h)}</span></div>
      <div class="sl-probrow" aria-label="${esc(g.a)} ${pa}%, ${esc(g.h)} ${ph}%">
        <span class="sl-tlab${pick===g.a?' sl-win':''}">${esc(g.a)}</span>
        <div class="sl-prob"><div class="sl-a" style="width:${pa}%;background:${pc[0].bg};color:${pc[0].ink}"><span class="${pick===g.a?'sl-w':''}">${pa>=14?pa+'%':''}</span></div><div class="sl-h" style="width:${ph}%;background:${pc[1].bg};color:${pc[1].ink}"><span class="${pick===g.h?'sl-w':''}">${ph>=14?ph+'%':''}</span></div></div>
        <span class="sl-tlab${pick===g.h?' sl-win':''}">${esc(g.h)}</span>
      </div>
      <div class="sl-conf">${c?`<span class="sl-tier sl-${tc}">${tl} ${Math.round(c.conf*100)}%</span>`:'<span class="sl-tier">no call yet</span>'}</div>
      <div class="sl-pred">${slatePred(g)}</div>
      <div class="sl-result">${slateResult(g,c)}</div>
    </button>`;
  };
  /* the games still to play, live ones too, first in kickoff order; the finals under a heading */
  const todo=gs.filter(g=>!gameFinal(g)), done=gs.filter(g=>gameFinal(g));
  const over=seasonOver()?`<div class="card" style="border-left:4px solid var(--gold);margin-bottom:12px"><b>The ${SEASON} regular season is over.</b></div>`:'';
  const rows=over+notPostedNote()+todo.map(card).join('')+(done.length?`<div class="slatesep">Completed</div>`+done.map(card).join(''):'');
  $('gamesList').innerHTML=rows||'<div class="empty">No games scheduled for this week.</div>';
  $('gamesList').querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.game=b.dataset.game; S.ui.open={}; save(); renderGame(); }));
  if(S.ui.game) renderGame();
}

/* ---------- a player's season, week by week (the Show stats button) ---------- */
const WEEK_COLS={
  QB:[['C/Att',a=>`${a.completions}/${a.attempts}`,null],['Pass yds','passing_yards'],['Pass TD','passing_tds'],['INT','passing_interceptions'],['Rush yds','rushing_yards'],['Rush TD','rushing_tds']],
  RB:[['Car','carries'],['Rush yds','rushing_yards'],['Rec','receptions'],['Rec yds','receiving_yards'],['TD','tds']],
  WR:[['Tgt','targets'],['Rec','receptions'],['Rec yds','receiving_yards'],['TD','tds']],
  TE:[['Tgt','targets'],['Rec','receptions'],['Rec yds','receiving_yards'],['TD','tds']],
  K:[['FG',a=>`${a.fg_made}/${a.fg_att}`,null],['XP','pat_made'],['Pts','kick_pts']]};
function weekStats(pl){
  const cols=WEEK_COLS[pl.grp]||WEEK_COLS.WR;
  const wks=Object.keys(S.actuals||{}).map(Number).filter(w=>actualFor(w,pl.id)).sort((a,b)=>a-b);
  if(!wks.length) return '<div class="wkstats"><p class="muted" style="margin:0">No games with stats this season yet.</p></div>';
  const cell=(a,c)=>typeof c[1]==='function'?c[1](a):num(a[c[1]]||0,0);
  const rows=wks.map(w=>{ const a=actualFor(w,pl.id);
    return `<tr><td>Wk ${w}</td><td>${a.opp?tag(a.opp):''}</td>${cols.map(c=>`<td class="num">${cell(a,c)}</td>`).join('')}</tr>`; }).join('');
  /* the average a game, for the columns that are a single number */
  const avg=cols.map(c=>{ if(typeof c[1]==='function') return '<td class="num muted">\u2013</td>';
    const s=wks.reduce((t,w)=>t+(actualFor(w,pl.id)[c[1]]||0),0)/wks.length;
    return `<td class="num"><b>${num(s,s<10?1:0)}</b></td>`; }).join('');
  return `<div class="wkstats"><table><thead><tr><th>Week</th><th>Opp</th>${cols.map(c=>`<th class="num">${c[0]}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td colspan="2">Per game (${wks.length})</td>${avg}</tr></tfoot></table></div>`;
}

/* ---------- one game ---------- */
function summaryOf(x,lines){
  const want=HEADLINE[x.pl.grp]||[];
  const bits=[];
  for(const s of want){
    const l=lines.find(y=>y.stat===s); if(!l||l.prob) continue;
    bits.push(`<b>${num(l.mu,l.mu<10?1:0)}</b> ${l.m.short||l.m.lbl.toLowerCase()}`);
    if(bits.length>=3) break;
  }
  return bits.join(' &nbsp;\u00b7&nbsp; ');
}
/* colour by what the number actually did, not by how near the projection it was.
   at or above the projection is a payout on the over; below it is graded by how far. */
function hitBand(actual,proj){
  if(actual==null||proj==null) return 'pend';
  const d=actual-proj;
  if(Math.abs(d)<1e-9) return 'exact';
  if(d>0) return 'over';
  return Math.abs(d)<=Math.max(1,proj*0.15)?'near':'far';
}
/* a player with no stat line in a game whose stats are in, by the snap counts (tookPart) */
function noLineText(g,pl,long){
  const t=tookPart({gid:g.id,week:g.w,pid:pl.id,team:pl.team});
  if(!long) return t===true?'played, no stat line':(t===false?'did not play':'no stat line; snap counts not in yet');
  return t===true?'Played, no stat line: graded on zero.'
    :(t===false?'Did not play: legs void.':'No stat line; snap counts not in yet.');
}
function actualSummary(x,lines,week,src,g){
  /* src is a live box-score block when nflverse has not posted yet; the shape is the same,
     which is the whole reason espnStats was written to match */
  const a=src||actualFor(week,x.pl.id);
  if(!a) return src===null?'<span class="muted">nothing on the sheet yet</span>':`<span class="muted">${g?noLineText(g,x.pl):'did not play'}</span>`;
  const snap=(S.projections&&S.projections[String(week)]&&S.projections[String(week)][x.pl.id])||{};
  lines=lines.map(l=>{ const s0=snap[l.stat]; return (s0&&!l.prob&&s0.mu!=null)?{...l,mu:s0.mu}:l; });
  const want=HEADLINE[x.pl.grp]||[]; const bits=[];
  for(const s of want){ const l=lines.find(y=>y.stat===s); if(!l||l.prob) continue;
    bits.push(`<b>${num(a[s],0)}</b> ${l.m.short||s} <span class="muted">(proj ${num(l.mu,l.mu<10?1:0)})</span>`); if(bits.length>=3) break; }
  return bits.join(' &nbsp;\u00b7&nbsp; ');
}
/* the Game bets card on a game's page, after its suggested parlays: both teams, to win and to cover,
   and the game total (the owner's call, 14 October 2026: game bets live on the Props tab) */
function gameBetsCard(g,locked){
  const mark=r=>r==null?'<span class="res">–</span>':(r==='win'?'<span class="res win">✓</span>':(r==='loss'?'<span class="res loss">✗</span>':'<span class="res">push</span>'));
  const rows=[g.a,g.h].map(team=>{
    const ml=gameBet(g,team,'ml'), ats=gameBet(g,team,'ats'); const isHome=team===g.h;
    const bookML=isHome?g.mlh:g.mla, bookSP=isHome?g.sph:g.spa;
    const kML=legKey(g.id,'team:'+team,'ml'), kATS=legKey(g.id,'team:'+team,'ats');
    const onML=!!S.parlay[kML], onATS=!!S.parlay[kATS];
    const rML=locked?settleGameLeg({gid:g.id,team,stat:'ml',k:0}):null;
    const rATS=(locked&&ats)?settleGameLeg({gid:g.id,team,stat:'ats',k:ats.line}):null;
    const far=[];
    const row=(b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);
      const ff=!locked&&book!=null&&isFinite(book)?legFarOff({gid:g.id,pid:'team:'+team,team,stat:key.split('|')[2],k:b.line==null?0:b.line,side:'over',main:false,p:b.p,price:book,src:'real',week:g.w}):null;
      if(ff) far.push(`<p class="faroff" data-far><b>${label}</b> ${farText(b.p,ff)}</p>`);
      return `<tr class="${on?'on':''}${ff?' far':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">
        <td class="pick">${locked?mark(res):`<input type="checkbox" ${on?'checked':''} data-leg="${key}" data-k="${b.line==null?0:b.line}" data-side="over" aria-label="Add ${TEAM_NAMES[team]||team} ${label.toLowerCase()}">`}</td>
        <td class="thr">${label}</td>
        <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${Math.max(2,b.p*100).toFixed(0)}%"></div></div></td>
        <td class="pct">${(b.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
        <td class="num est">${fmtML(bookPrice(b.p))}<em>est.</em></td>
        <td class="num book real">${book!=null&&isFinite(book)?fmtML(book):''}</td></tr>`; };
    let h=`<div class="statblk"><h4>${tag(team)} ${TEAM_NAMES[team]||team} <em>our margin ${ml.mu>0?'+':''}${ml.mu.toFixed(1)}</em>${ats?`<em class="mline">book line ${ats.line>0?'+':''}${ats.line}</em>`:''}</h4><table class="rungs">`;
    h+=row(ml,onML,kML,bookML,rML,'To win');
    if(ats) h+=row(ats,onATS,kATS,bookSP,rATS,`To cover ${ats.line>0?'+':''}${ats.line}`);
    return h+'</table>'+far.join('')+'</div>';
  }).join('');
  /* the game total, over or under: one leg a game, so ticking one side takes the other off. The
     book's price where the payload has one; -110 marked est. where it has none */
  let tot='';
  const tb=totalBet(g,'over');
  if(tb){ const kT=legKey(g.id,'game','total'), cur=S.parlay[kT];
    const trow=side=>{ const l=totalLeg(g,side), on=!!cur&&cur.side===side&&cur.k===l.k, [c,lbl]=confTier(l.p);
      const res=locked?settleGameLeg({gid:g.id,stat:'total',side,k:l.k}):null;
      return `<tr class="${on?'on':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">
        <td class="pick">${locked?mark(res):`<input type="checkbox" ${on?'checked':''} data-leg="${kT}" data-k="${l.k}" data-side="${side}" data-main="1" aria-label="Add ${side} ${l.k} points, ${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}">`}</td>
        <td class="thr">${side==='under'?'Under':'Over'} ${l.k}</td>
        <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${Math.max(2,l.p*100).toFixed(0)}%"></div></div></td>
        <td class="pct">${(l.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
        <td class="num est">${l.src==='real'?'':`${fmtML(TOTAL_EST)}<em>est.</em>`}</td>
        <td class="num book real">${l.src==='real'?fmtML(l.price):''}</td></tr>`; };
    tot=`<div class="statblk"><h4>Game total <em class="mpts" title="The model's own points for the two sides: shown, not used in the chance">model's points ${modelTotal(g).toFixed(1)}</em><em class="mline">book line ${tb.line}</em></h4><table class="rungs">${trow('over')}${trow('under')}</table></div>`; }
  return `<div class="card gbets"><h2>Game bets</h2>
    ${lineSource(g)?`<p class="muted" style="margin:0 0 8px;font-size:12px">Lines: ${esc(lineSource(g))}.</p>`:''}${rows}${tot}${!gameBet(g,g.h,'ats')?'<p class="muted" style="margin:0">No spread posted yet.</p>':''}${tb&&(totalBook(g,'over')==null||totalBook(g,'under')==null)?'<p class="muted" style="margin:6px 0 0;font-size:12px">No total price yet: 50%, \u2212110 est.</p>':''}</div>`;
}
/* (app v127) a game's page offers no ladder bet (isLadder): no box to show the ladders, no rung row and no 2+
   touchdowns row. The model still builds every stat's rungs (statLines), and the Track Record still grades them. */
function renderGame(){
  const g=S.sched.find(x=>x.id===S.ui.game);
  if(!g){ S.ui.game=null; renderSlate(); return; }
  openGameModal();
  const showAll=!!S.ui.showAll;
  const roster=rosterFor(g,showAll);
  const locked=gameStarted(g), fin=gameFinal(g);
  /* this game's stats, not its week's: one graded game used to make the whole week claim
     stats it did not have, and every other game in it said "did not play" */
  const haveStats=!!(S.processedGames&&S.processedGames[g.id]&&S.actuals&&S.actuals[String(g.w)]);
  const d=fmtDate(g);
  let html=`<div class="bar">
    <button class="btn quiet" id="backBtn">\u2715 Close</button>
    <span class="grow"></span>
    <label class="muted">Book's cut <select id="marginSel">
      <option value="light" ${S.margin==='light'?'selected':''}>light</option>
      <option value="typical" ${S.margin==='typical'||!S.margin?'selected':''}>typical</option>
      <option value="heavy" ${S.margin==='heavy'?'selected':''}>heavy</option></select></label>
    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
  </div>`;
  /* Refresh odds for this game alone (app v107): its week's scoreboard and its player lines */
  if(!locked&&!hasScore(g)) html+=espnCtl(g.id,'game');
  { const dd=PAY.depth_dt?Date.parse(PAY.depth_dt+'T12:00:00Z'):NaN, bk=PAY.baked_at?Date.parse(PAY.baked_at):NaN;
    if(!locked&&isFinite(dd)&&isFinite(bk)&&bk-dd>3*864e5) html+=`<p class="muted" style="margin:-6px 0 12px;font-size:12px;color:#8A5E05">Depth charts as of ${esc(PAY.depth_dt)} (may be out of date).</p>`; }
  /* a live score and stats, when the scoreboard has been read for this game */
  const lg=LIVE.games[g.id], lbox=!!LIVE.box[g.id];
  const liveOn=!haveStats&&lbox;
  if(locked) html+=`<div class="card" style="border-left:4px solid ${fin?'var(--pick)':'var(--gold)'}">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <b>${hasScore(g)?`Final: ${g.a} ${g.as}, ${g.h} ${g.hs}.`
        :(lg&&lg.as!=null?`${g.a} ${num(lg.as,0)}, ${g.h} ${num(lg.hs,0)}${lg.clock?' \u00b7 '+esc(lg.clock):''}.`
          :(fin?'Final.':'In progress.'))}</b>
      <span class="grow"></span>
      ${LIVE.at?`<span class="muted" style="font-size:12px">${LIVE.err?'stats not loading':'read '+new Date(LIVE.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'})}</span>`:''}
      <button class="btn quiet small" id="gameStatsNow" title="Read the score and the box score for this game from ESPN. Free: no odds-API credits, no job.">Refresh stats</button>
    </div>
    ${haveStats?'':`<span class="muted">${liveOn?'Live from the scoreboard, not settled.':'Stats not in yet.'}</span>`}</div>`;
  html+=gameHeadCard(g);
  html+=gameWinBtns(g);
  html+=gameBetsCard(g,locked);
  for(const team of [g.a,g.h]){
    const t=roster[team];
    html+=`<div class="teamhdr">${tag(team)} ${TEAM_NAMES[team]||team} <span class="pill">${fin?'played '+t.opp:'playing '+t.opp}</span></div>`;
    if(t.gaps&&t.gaps.length) html+=`<p class="muted" style="margin:-2px 0 8px">Not shown: ${t.gaps.map(x=>`<b>${esc(x.name)}</b> (${x.slot}, ${x.why})`).join(', ')}.</p>`;
    if(!t.players.length){ html+='<div class="empty">No players to project.</div>'; continue; }
    for(const x of t.players){
      const lines=statLines(x);
      /* a charted player the model has nothing to project for: shown in his place, nothing to bet on */
      if(!lines.length&&nothingToProject(x)) html+=`<div class="plrbtn" data-nohist="${x.pl.id}" style="cursor:default">
        <div class="who">${esc(x.pl.n)}${(!locked&&+g.w===currentWeek())?injChip(x.pl.id):''}<span>${depthLabel(x.pl)||x.pl.pos}${x.starter?'':' \u00b7 backup'}${x.gp<3?' \u00b7 thin history':''}</span></div>
        <div class="sum"><span class="muted">${noHistory(x.pl)?'No lines: no games to project from':'No lines yet'}</span></div><div></div></div>`;
      if(!lines.length) continue;
      const open=!!S.ui.open[x.pl.id], stOpen=!!(S.ui.stats&&S.ui.stats[x.pl.id]);
      html+=`<button class="plrbtn" data-open="${x.pl.id}" aria-expanded="${open}">
        <div class="who">${esc(x.pl.n)}${(!locked&&+g.w===currentWeek())?injChip(x.pl.id):''}<span>${depthLabel(x.pl)||x.pl.pos}${x.starter?'':' \u00b7 backup'}${x.gp<3?' \u00b7 thin history':''}</span><span class="stbtn${stOpen?' on':''}" role="button" tabindex="0" data-stats="${x.pl.id}" aria-pressed="${stOpen}">${stOpen?'Hide stats':'Show stats'}</span></div>
        <div class="sum">${locked?`<span class="finchip${fin?'':' live'}">${fin?'FINAL':'LIVE'}</span>`:''}${
          (locked&&haveStats)?actualSummary(x,lines,g.w,undefined,g)
          :(locked&&liveOn?actualSummary(x,lines,g.w,liveStatsFor(g.id,team,x.pl.n))
          :(locked?'<span class="muted">projected</span> '+summaryOf(x,lines):summaryOf(x,lines)))}</div>
        <div class="arrow">${open?'\u2303':'\u2304'}</div></button>`;
      if(stOpen) html+=weekStats(x.pl);
      if(!open) continue;
      html+='<div class="plrbody">';
      if(locked){
        const a=haveStats?actualFor(g.w,x.pl.id):null;
        const snap=(S.projections&&S.projections[String(g.w)]&&S.projections[String(g.w)][x.pl.id])||{};
        for(const l of lines){ const s0=snap[l.stat]; if(!s0) continue; if(l.prob&&s0.p!=null) l.p=s0.p; if(!l.prob&&s0.mu!=null) l.mu=s0.mu; }
        html+=`<div class="tiles">`;
        for(const l of lines){
          const L=marketLine(g.w,x.pl.id,l.stat);
          if(l.prob){
            const av=a?a.any_td:null;
            const Ltd=marketLine(g.w,x.pl.id,'any_td');
            html+=`<div class="tile"><span class="tl">${x.pl.grp==='QB'?'Rush or rec TD':'Touchdown'}</span>
              <b class="tv ${av==null?'pend':(av>=1?'over':'far')}">${av==null?'\u2013':(av>=1?'Yes':'No')}</b>
              <span class="tp">${(l.p*100).toFixed(0)}% chance</span>
              <span class="tb${Ltd?'':' none'}">${Ltd?fmtML(Ltd.over):'no book line'}</span></div>`;
            continue;
          }
          const av=a?a[l.stat]:null, proj=l.mu;
          const diff=av==null?null:av-proj;
          const band=hitBand(av,proj);
          const side=(L&&av!=null)?(av>L.line?'over':(av<L.line?'under':'push')):null;
          html+=`<div class="tile"><span class="tl">${l.m.lbl}</span>
            <b class="tv ${band}">${av==null?'\u2013':num(av,0)}</b>
            <span class="tp">proj ${num(proj,proj<10?1:0)}${diff==null?'':` \u00b7 <span class="td ${band}">${diff>0?'+':'\u2212'}${num(Math.abs(diff),Math.abs(diff)<10?1:0)}</span>`}</span>
            <span class="tb${L?'':' none'}">${L?`${L.line}${side?` <span class="side-res ${side}">${side}</span>`:''}`:'no book line'}</span></div>`;
        }
        html+=`</div>`;
        if(a) html+=`<div class="recaplegend"><span><i style="background:var(--pick)"></i>beat the projection</span>
          <span><i style="background:#5E35B1"></i>landed exactly on it</span>
          <span><i style="background:var(--gold)"></i>under, but close</span>
          <span><i style="background:var(--miss)"></i>well under</span></div>`;
        if(haveStats&&!a) html+=`<p class="muted" style="margin:8px 0 0">${noLineText(g,x.pl,true)}</p>`;
        html+='</div>'; continue;
      }
      for(const l of lines){
        if(l.prob){
          const [c,lbl]=confTier(l.p);
          const tk=legKey(g.id,x.pl.id,'any_td'), tcur=S.parlay[tk]; const ton=!!tcur&&(tcur.k||1)<2;
          const tod=oddsFor(g.id,x.pl.id,'any_td',1);
          const te=plEst(x,g,l,'td',1);
          const tf=tod!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:tod,src:'real',week:g.w})
            :(te.src==='dkline'?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:te.price,src:'dkline',espn:espnOf(te),week:g.w}):null);
          const qb=x.pl.grp==='QB', what=qb?'a rushing or receiving touchdown':'a touchdown';
          html+=`<div class="statblk"><h4>${qb?'Rushing or receiving TD <em data-qbtd>not a TD pass</em>':'Touchdown'}</h4>
            <table class="rungs"><tr class="${ton?'on':''}${tf?' far':''}">
            <td class="pick"><input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score ${what}"></td>
            <td class="thr">Scores one</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${(l.p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(l.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
            <td class="num est"${estAttr(te)}>${fmtML(te.price)}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr></table>${tf?`<p class="faroff" data-far><b>Scores one</b> ${farText(l.p,tf)}</p>`:''}</div>`;
          continue;
        }
        const lk=legKey(g.id,x.pl.id,l.stat), cur=S.parlay[lk], far=[];
        /* the main line by the page's precedence (mainOf): the paid pull's, or DraftKings' line from a
           Refresh odds read where it has moved or the pull has none, both sides at the formula's price */
        const M=mainOf(x,g,l.stat), L=M&&M.src==='real'?M.L:null, dO=M&&M.src==='dkline'?M.dO:null, dU=dO?M.dU:null;
        html+=`<div class="statblk"><h4>${l.m.lbl} <em>projected ${num(l.mu,l.mu<10?1:0)}</em>${L?`<em class="mline">book line ${L.line}</em>`:(dO?`<em class="mline"${estAttr(dO)}>DraftKings line ${dO.line}${M.was!=null?` <span class="was">(was ${M.was})</span>`:''}</em>`:'')}</h4>${L||(dO&&dU)?'<table class="rungs">':'<p class="muted noline" data-noline>No DraftKings line yet.</p>'}`;
        if(L){
          /* the real, bettable line, both sides */
          const pO=pOver(x.pl.grp,l.stat,l.mu,L.line), tO=devigOver(L.over,L.under);
          const onO=cur&&cur.main&&cur.side==='over', onU=cur&&cur.main&&cur.side==='under';
          const gapO=(pO-mlProb(L.over))*100, gapU=((1-pO)-mlProb(L.under))*100;
          const mf=side=>legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:L.line,side,main:true,p:side==='under'?1-pO:pO,price:side==='under'?L.under:L.over,src:'real',week:g.w});
          const fO=mf('over'), fU=mf('under');
          if(fO) far.push(`<p class="faroff" data-far><b>Over ${L.line}</b> ${farText(pO,fO)}</p>`);
          if(fU) far.push(`<p class="faroff" data-far><b>Under ${L.line}</b> ${farText(1-pO,fU)}</p>`);
          html+=`<tr class="mainline ${onO?'on':''}${fO?' far':''}">
            <td class="pick"><input type="checkbox" ${onO?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="over" data-main="1" aria-label="Add over ${L.line}"></td>
            <td class="thr">Over ${L.line}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(pO)[0]}" style="width:${Math.max(2,pO*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(pO*100).toFixed(0)}%</td><td><span class="conf ${confTier(pO)[0]}">${confTier(pO)[1]}</span></td>
            <td class="num est"><span class="mkt">book ${(tO*100).toFixed(0)}%</span></td>
            <td class="num book real">${fmtML(L.over)}<em>${gapO>=3?'\u2191':(gapO<=-3?'\u2193':'')}</em></td></tr>
          <tr class="mainline ${onU?'on':''}${fU?' far':''}">
            <td class="pick"><input type="checkbox" ${onU?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="under" data-main="1" aria-label="Add under ${L.line}"></td>
            <td class="thr">Under ${L.line}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(1-pO)[0]}" style="width:${Math.max(2,(1-pO)*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${((1-pO)*100).toFixed(0)}%</td><td><span class="conf ${confTier(1-pO)[0]}">${confTier(1-pO)[1]}</span></td>
            <td class="num est"><span class="mkt">book ${((1-tO)*100).toFixed(0)}%</span></td>
            <td class="num book real">${fmtML(L.under)}<em>${gapU>=3?'\u2191':(gapU<=-3?'\u2193':'')}</em></td></tr>`;
        } else if(dO&&dU){
          const E=dO.line, pO=pOver(x.pl.grp,l.stat,l.mu,E);
          const onO=cur&&cur.main&&cur.side==='over'&&cur.k===E, onU=cur&&cur.main&&cur.side==='under'&&cur.k===E;
          const mf=(side,d)=>legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:E,side,main:true,p:side==='under'?1-pO:pO,price:d.price,src:'dkline',espn:espnOf(d),week:g.w});
          /* flagged far off DraftKings' line only on a market the estimate has been checked on */
          const fO=dO.tested?mf('over',dO):null, fU=dU.tested?mf('under',dU):null;
          if(fO) far.push(`<p class="faroff" data-far><b>Over ${E}</b> ${farText(pO,fO)}</p>`);
          if(fU) far.push(`<p class="faroff" data-far><b>Under ${E}</b> ${farText(1-pO,fU)}</p>`);
          const row=(side,d,p,on,f)=>`<tr class="mainline est-line ${on?'on':''}${f?' far':''}">
            <td class="pick"><input type="checkbox" ${on?'checked':''} data-leg="${lk}" data-k="${E}" data-side="${side}" data-main="1" aria-label="Add ${side} ${E}"></td>
            <td class="thr">${side==='under'?'Under':'Over'} ${E}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(p)[0]}" style="width:${Math.max(2,p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(p*100).toFixed(0)}%</td><td><span class="conf ${confTier(p)[0]}">${confTier(p)[1]}</span></td>
            <td class="num est"${estAttr(d)}>${fmtML(d.price)}<em>est.</em></td>
            <td class="num book real"></td></tr>`;
          html+=row('over',dO,pO,onO,fO)+row('under',dU,1-pO,onU,fU);
        }
        html+=(L||(dO&&dU)?'</table>':'')+far.join('')+'</div>';
      }
      html+='</div>';
    }
  }
  /* keep the reader's place across the re-render. If a row was just tapped, pin that
     row to the same spot on screen (collapsing a player above it would otherwise shift it). */
  const modal=$('gameModal'); const keepY=modal.scrollTop;
  const pinned=renderGame.anchor&&$('gameView').querySelector('[data-open="'+renderGame.anchor+'"]');
  const pinTop=pinned?pinned.getBoundingClientRect().top:null;
  renderGame.anchor=null;
  $('gameView').innerHTML=html;
  modal.scrollTop=keepY;
  if(pinTop!=null){ const nb=$('gameView').querySelector('[data-open="'+pinned.dataset.open+'"]'); if(nb) modal.scrollTop+=nb.getBoundingClientRect().top-pinTop; }
  $('backBtn').addEventListener('click',closeGame);
  $('gameStatsNow')?.addEventListener('click',()=>refreshGameStats(g));
  $('allCb').addEventListener('change',e=>{ S.ui.showAll=e.target.checked; save(); renderGame(); });
  $('marginSel').addEventListener('change',e=>{ S.margin=e.target.value; save(); renderGame(); renderParlay(); });
  $('gameView').querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',e=>{
    const st=e.target.closest&&e.target.closest('[data-stats]');
    if(st){ const sid=st.dataset.stats, U=(S.ui.stats??={});
      if(U[sid]) delete U[sid]; else U[sid]=true;
      renderGame.anchor=sid; save(); renderGame(); return; }
    const id=b.dataset.open;
    /* one player open at a time: opening a player closes whoever else was open */
    S.ui.open=S.ui.open[id]?{}:{[id]:true};
    renderGame.anchor=id;
    save(); renderGame(); }));
  $('gameView').querySelectorAll('[data-leg]').forEach(cb=>cb.addEventListener('change',e=>{
    e.stopPropagation();
    toggleLeg(cb.dataset.leg, +cb.dataset.k, g, cb.dataset.side||'over', cb.dataset.main==='1'); }));
  /* (app v124) the game's Matchup, Mismatches and Team Stats: each its own little window over the page, the
     hub's (window.gameWindow), handed the button so the focus comes back to it */
  $('gameView').querySelectorAll('[data-gp-pop]').forEach(b=>b.addEventListener('click',()=>{
    if(typeof window.gameWindow==='function') window.gameWindow(b.dataset.gpPop,g.id,b); }));
}

/* ---------- weekly stats ingest ---------- */
function rowStats(r){
  const g=k=>{const v=parseFloat(r[k]); return isFinite(v)?v:0;};
  const o={attempts:g('attempts'),completions:g('completions'),passing_yards:g('passing_yards'),
    passing_tds:g('passing_tds'),passing_interceptions:g('passing_interceptions'),
    carries:g('carries'),rushing_yards:g('rushing_yards'),rushing_tds:g('rushing_tds'),
    receptions:g('receptions'),targets:g('targets'),receiving_yards:g('receiving_yards'),
    receiving_tds:g('receiving_tds'),fg_att:g('fg_att'),fg_made:g('fg_made'),pat_made:g('pat_made'),pat_att:g('pat_att')};
  o.scrim_yards=o.rushing_yards+o.receiving_yards;
  o.tds=o.rushing_tds+o.receiving_tds;   /* count, for the 2+ line */
  o.any_td=o.tds>=1?1:0;
  o.kick_pts=3*(g('fg_made_0_19')+g('fg_made_20_29')+g('fg_made_30_39'))+4*g('fg_made_40_49')+5*(g('fg_made_50_59')+g('fg_made_60_'))+o.pat_made;
  return o;
}
function posGrp(p){ const x=String(p||'').toUpperCase(); if(x==='FB'||x==='HB') return 'RB';
  return ['QB','RB','WR','TE','K'].includes(x)?x:null; }
function ingestStats(rows){
  const byGame={};
  for(const r of rows){
    if(+r.season!==SEASON) continue;
    if(r.season_type&&r.season_type!=='REG') continue;
    const w=+r.week; if(!isFinite(w)) continue;
    const grp=posGrp(r.position); if(!grp) continue;
    const g=S.sched.find(x=>+x.w===w&&(x.h===r.team||x.a===r.team));
    if(!g) continue;
    (byGame[g.id]??={g,recs:[]}).recs.push({id:r.player_id,name:r.player_display_name||r.player_name,grp,pos:r.position,
      team:r.team,opp:r.opponent_team,st:rowStats(r)});
  }
  const done=[],skipped=[];
  const ids=Object.keys(byGame).sort((a,b)=>(byGame[a].g.w-byGame[b].g.w)||((byGame[a].g.d||'')+(byGame[a].g.t||'')).localeCompare((byGame[b].g.d||'')+(byGame[b].g.t||'')));
  for(const id of ids){
    if(S.processedGames[id]){ skipped.push(id); continue; }
    const {g,recs}=byGame[id];
    const A=(S.actuals[String(g.w)]??={});
    for(const r of recs) A[r.id]={...r.st,team:r.team,opp:r.opp};
    gradeGame(g); applyGame(g,recs);
    S.processedGames[id]=true; done.push(g);
  }
  /* a week counts as done only once every one of its games is in */
  for(const w of weeks()){ if(gamesIn(w).every(g=>S.processedGames[g.id])) S.processed[w]=true; }
  return {done,skipped,games:ids.length};
}
/* freeze the projections the app was showing, before the state moves on */
function gradeGame(g){
  buildNorm();
  const w=g.w;
  const P=((S.projections??={})[String(w)]??={});
  const H=((S.headlines??={})[String(w)]??={});
  /* keep the headline exactly as it read before kickoff, players and all */
  H[g.id]=gameHeadline(g).map(x=>({k:x.k,pid:x.v.pl.id,n:x.v.pl.n,team:x.v.team,mu:x.v.mu}));
  const roster=rosterFor(g,true);
  for(const team in roster) for(const x of roster[team].players){
    const snap=(P[x.pl.id]??={});
    for(const l of statLines(x)){
      if(l.prob){ snap[l.stat]={p:l.p}; continue; }
      /* keep the chances shown, not just the projection, so the track record scores what was on screen */
      const o={mu:l.mu,r:l.rungs.map(r=>[r.k,+r.p.toFixed(4)])};
      const L=marketLine(w,x.pl.id,l.stat); if(L) o.ml=[L.line,+pOver(x.pl.grp,l.stat,l.mu,L.line).toFixed(4)];
      snap[l.stat]=o;
    }
  }
}
function applyGame(g,recs){
  const teamAgg={},defAgg={},defgAgg={};
  for(const r of recs){
    const t=(teamAgg[r.team]??={t_pass_att:0,t_carries:0,t_plays:0,t_pass_yds:0,t_rush_yds:0,t_targets:0,t_tds:0,t_fg_att:0,t_pat_att:0});
    t.t_pass_att+=r.st.attempts; t.t_carries+=r.st.carries; t.t_pass_yds+=r.st.passing_yards;
    t.t_rush_yds+=r.st.rushing_yards; t.t_targets+=r.st.targets;
    t.t_tds+=r.st.passing_tds+r.st.rushing_tds; t.t_fg_att+=r.st.fg_att; t.t_pat_att+=r.st.pat_att;
    const dd=(defAgg[r.opp]??={d_pass_yds:0,d_rush_yds:0,d_pass_att:0,d_carries:0,d_tds:0});
    dd.d_pass_yds+=r.st.passing_yards; dd.d_rush_yds+=r.st.rushing_yards;
    dd.d_pass_att+=r.st.attempts; dd.d_carries+=r.st.carries; dd.d_tds+=r.st.rushing_tds;
    const dg=((defgAgg[r.opp]??={})[r.grp]??={});
    for(const s of (GRP_STATS[r.grp]||[])) dg[s]=(dg[s]||0)+(r.st[s]||0);
  }
  for(const t in teamAgg){ teamAgg[t].t_plays=teamAgg[t].t_pass_att+teamAgg[t].t_carries;
    const cur=(S.teams[t]??=Object.fromEntries(TCOLS.map(c=>[c,[0,0]])));
    for(const c of TCOLS) pushEwm(cur[c],teamAgg[t][c],A6); }
  for(const t in defAgg){ const cur=(S.defs[t]??=Object.fromEntries(DCOLS.map(c=>[c,[0,0]])));
    for(const c of DCOLS) pushEwm(cur[c],defAgg[t][c],A8); }
  for(const t in defgAgg){ const T=(S.defg[t]??={});
    for(const gg in defgAgg[t]){ const G=(T[gg]??={});
      for(const s of (GRP_STATS[gg]||[])){ G[s]??=[0,0]; pushEwm(G[s],defgAgg[t][gg][s]||0,A8); } } }
  for(const r of recs){
    let p=S.players[r.id];
    if(!p){ p=S.players[r.id]={id:r.id,n:r.name,pos:r.pos,grp:r.grp,team:r.team,gp:0,base_gp:0,cn:0,e5:{},e3:{},car:{},py:{}};
      for(const s of (GRP_STATS[r.grp]||[])){ p.e5[s]=[0,0]; p.e3[s]=[0,0]; p.car[s]=[0,0]; p.py[s]=null; } }
    p.team=r.team; p.gp++;
    for(const s of (GRP_STATS[p.grp]||[])){
      p.e5[s]??=[0,0]; p.e3[s]??=[0,0]; p.car[s]??=[0,0];
      const v=r.st[s]||0;
      pushEwm(p.e5[s],v,A5); pushEwm(p.e3[s],v,A3);
      p.car[s][0]+=v; p.car[s][1]+=1;
    }
  }
  buildNorm();
}
function ingestDepth(rows){
  const best={}; let dt='';
  for(const r of rows){
    const pos=String(r.pos_abb||'').toUpperCase()==='PK'?'K':String(r.pos_abb||'').toUpperCase();
    if(!['QB','RB','WR','TE','K'].includes(pos)) continue;
    const id=r.gsis_id; if(!id) continue;
    const d=String(r.dt||''); if(d>dt) dt=d;
    const rank=parseInt(r.pos_rank,10); if(!isFinite(rank)) continue;
    const cur=best[id];
    if(!cur||d>cur.d||(d===cur.d&&rank<cur.rank)) best[id]={d,team:r.team,pos,rank,nm:r.player_name};
  }
  S.depth={};
  for(const id in best){ const b=best[id];
    if(b.d===dt||!dt) S.depth[id]=[b.team,b.pos,b.rank,b.nm]; }
  return {n:Object.keys(S.depth).length,dt:dt.slice(0,10)};
}
function ingestRoster(rows){
  let moved=0,added=0,dropped=0;
  const teams=new Set(rows.map(r=>r.team).filter(Boolean));
  const full=rows.length>1200&&teams.size>=30;   /* only prune from a whole-league file */
  const onRoster=new Set();
  if(full) for(const r of rows){
    const id=r.gsis_id||r.player_id;
    if(id&&['ACT','DEV'].includes(String(r.status||'').toUpperCase())) onRoster.add(id);
  }
  for(const r of rows){
    const id=r.gsis_id||r.player_id; if(!id) continue;
    const grp=posGrp(r.position); if(!grp) continue;
    const team=r.team||r.recent_team; if(!team) continue;
    const st=String(r.status||'').toUpperCase();
    if(S.players[id]){ if(S.players[id].team!==team){S.players[id].team=team;moved++;} }
    else if(st==='ACT'||st===''){
      const p={id,n:r.full_name||r.player_name||id,pos:r.position,grp,team,gp:0,base_gp:0,cn:0,e5:{},e3:{},car:{},py:{}};
      for(const s of (GRP_STATS[grp]||[])){p.e5[s]=[0,0];p.e3[s]=[0,0];p.car[s]=[0,0];p.py[s]=null;}
      S.players[id]=p; added++;
    }
    if(['RES','CUT','EXE','NON','PUP','IR'].includes(st)) S.inactive[id]={week:'season',status:st};
    else if(S.inactive[id]&&S.inactive[id].week==='season') delete S.inactive[id];
  }
  if(full){ for(const id of Object.keys(S.players)){
    if(!onRoster.has(id)){ delete S.players[id]; delete S.inactive[id]; dropped++; } } }
  return {moved,added,dropped,full};
}
/* Questionable players stay on the page with a Q and out of every suggested parlay: about half
   of them have not played this season. true lets them into the suggestions. */
const SUGGEST_QUESTIONABLE=false;
/* the nflverse files the job found not posted yet (PAY.not_posted): before the season, or the
   stats until the first games are processed. An empty report is then said to be missing, not
   shown as a week with nobody hurt */
function notPostedNote(){
  const np=new Set((PAY&&PAY.not_posted)||[]), say=[];
  if(np.has('injuries')) say.push('No injury report posted yet.');
  if(np.has('stats')&&S.sched.some(g=>gameFinal(g))) say.push('No player stats posted yet.');
  return say.length?`<div class="card notposted" style="border-left:4px solid var(--gold);margin-bottom:12px">${say.map(t=>`<div class="muted">${t}</div>`).join('')}</div>`:'';
}
function practiceOf(s){ s=String(s||''); return /did not/i.test(s)?'DNP':(/limited/i.test(s)?'Limited':(/full/i.test(s)?'Full':'')); }
/* the week a team played before this one, past its bye */
function prevTeamWeek(team,w){ let p=null; for(const g of S.sched) if((g.a===team||g.h===team)&&+g.w<w&&(p==null||+g.w>p)) p=+g.w; return p; }
/* one week's injury report into S.inactive (who is out) and INJ (who is listed and why).
   replay: a past week, graded on its final report, so only its game statuses count. */
function ingestInjuries(rows,week,replay){
  const w=week||currentWeek(); let out=0;
  /* the report rebuilds every weekly record: last week's Out is not this week's. 'season'
     records (a reserve list, a release) are the roster's and stay. */
  for(const id of Object.keys(S.inactive)){ const r=S.inactive[id]; if(!r||r.week!=='season') delete S.inactive[id]; }
  if(!replay) INJ={};
  const cur={}, filed={}, final={}, before={};
  /* who the roster has inactive for his club's last game (the payload's ina): on that game's report
     in any status, he is held out below as an Out is (the Elo build's WHO PLAYS rule) */
  const INA=new Set(replay?[]:((PAY&&PAY.ina)||[]));
  for(const r of rows){
    if(+r.season!==SEASON) continue;
    const id=r.gsis_id||r.player_id; if(!id) continue;
    const wk=+r.week, st=String(r.report_status||r.game_status||'').trim(), tm=r.team||'';
    if(wk===w){ cur[id]=r; if(tm){ filed[tm]=true; if(st) final[tm]=true; } }
    else if(wk<w&&(st==='Out'||st==='Doubtful'||INA.has(id))){ const b=(before[id]??={team:tm,weeks:{},last:0}); b.weeks[wk]=(st==='Out'||st==='Doubtful')?st:(b.weeks[wk]||'Inactive'); if(wk>b.last){ b.last=wk; b.team=tm; } }
  }
  const rule=(id,status,extra)=>{ S.inactive[id]={week:w,status,...extra}; out++; };
  for(const id in cur){
    const r=cur[id], st=String(r.report_status||r.game_status||'').trim(), pr=practiceOf(r.practice_status), inj=String(r.injury||'').trim();
    if(st==='Out'||st==='Doubtful'){ rule(id,st,{inj}); continue; }
    if(replay) continue;
    /* (app v120) Questionable is listed with a Q whether or not he practised: the club's game-time call */
    if(st==='Questionable'){ INJ[id]={k:'q',t:'Q',title:'Questionable'+(inj?' ('+inj.toLowerCase()+')':'')+(pr?'; '+pr.toLowerCase()+' in practice':'')}; continue; }
    if(final[r.team]) continue;                      /* his team's final report gives him no status: cleared */
    if(pr==='DNP') INJ[id]={k:'dnp',t:'DNP',title:'Did not practise'+(inj?' ('+inj.toLowerCase()+')':'')+'; no game status yet'};
    else if(pr==='Limited') INJ[id]={k:'lim',t:'LP',title:'Limited in practice'+(inj?' ('+inj.toLowerCase()+')':'')+'; no game status yet'};
  }
  /* out in his team's last game, or inactive for it after being on its report, and no status yet
     this week: treated as out until one clears him */
  if(!replay) for(const id in before){
    const b=before[id], tm=(cur[id]&&cur[id].team)||b.team, pw=prevTeamWeek(tm,w);
    if(pw==null||!b.weeks[pw]||S.inactive[id]) continue;
    if(actualFor(pw,id)) continue;                  /* listed, but his stat line says he played */
    const r=cur[id], st=r?String(r.report_status||r.game_status||'').trim():'';
    if(st||final[tm]) continue;
    const was=b.weeks[pw]==='Inactive'?'inactive':'out';
    if(!filed[tm]) rule(id,'Pending',{why:'no report yet this week',was});
    else if(r&&practiceOf(r.practice_status)==='DNP') rule(id,'Pending',{why:'not practising',was,inj:String(r.injury||'').trim()});
  }
  return {out,week:w};
}
/* the roster's word on every player: status, and the team he is on today. INA is a game-day
   inactive and holds only for the week the roster row is for; the reserve lists, a release, a
   retirement and the like hold until the roster says otherwise. */
function applyRoster(R){
  RSTAT={}; let season=0, moved=0;
  for(const id of Object.keys(S.inactive)) if(S.inactive[id]&&S.inactive[id].week==='season') delete S.inactive[id];
  if(!R||typeof R!=='object') return {season,moved};
  const w=currentWeek();
  /* the file keeps a released player's last row at an older week, still ACT or DEV: a row older
     than the latest week, for a club that has rows in it (a club on its bye has none), is a
     player on no roster */
  let LW=0; for(const id in R) LW=Math.max(LW,+R[id][3]||0);
  const filed=new Set(); for(const id in R) if(+R[id][3]===LW) filed.add(R[id][0]);
  for(const id in R){ const [team,st,,wk]=R[id]; RSTAT[id]=st;
    if((st==='ACT'||st==='DEV')&&LW&&+wk<LW&&filed.has(team)){ RSTAT[id]='NONE'; S.inactive[id]={week:'season',status:'NONE'}; season++; continue; }
    const p=S.players[id]; if(p&&team&&p.team!==team){ p.team=team; moved++; }
    if(st==='INA'){ if(+wk===w&&!S.inactive[id]) S.inactive[id]={week:w,status:'Inactive'}; continue; }
    if(st!=='ACT'&&st!=='DEV'){ S.inactive[id]={week:'season',status:st}; season++; } }
  /* a whole-league table: a player on no roster at all is on no team's page either */
  if(Object.keys(R).length>800) for(const id in S.players) if(!R[id]){ S.inactive[id]={week:'season',status:'NONE'}; season++; }
  return {season,moved};
}
/* the tag beside a name: ruled out, pending, Q, did not practise, limited. null when there is none */
function injTag(pid){
  const r=S.inactive&&S.inactive[pid];
  if(r){ if(r.week==='season') return {k:'out',t:{RES:'IR',CUT:'CUT'}[r.status]||'OUT',title:inactiveWhy(r)};
    return {k:r.status==='Pending'?'pend':'out',t:r.status==='Pending'?'PENDING':(r.status==='Doubtful'?'D':'OUT'),title:inactiveWhy(r)}; }
  return INJ[pid]||null;
}
function injChip(pid){ const t=injTag(pid); return t?`<span class="inj inj-${t.k}" title="${esc(t.title)}">${t.t}</span>`:''; }
/* a player the suggestions can build on: not out, not pending, not Questionable (unless the
   switch above says so), not missing practice with no status yet */
function suggestable(pid){
  if(S.inactive&&S.inactive[pid]) return false;
  const t=INJ[pid]; if(!t) return true;
  return t.k==='lim'||(t.k==='q'&&SUGGEST_QUESTIONABLE);
}

/* ---------- track record tab ---------- */
function trackTable(title,groups,note){
  /* groups: [[label, rows], ...] */
  let html=`<h3>${title}</h3>`+(note?`<p class="muted" style="margin:0 0 8px">${note}</p>`:'');
  html+=`<table><thead><tr><th>${title.includes('week')?'Week':(title.includes('market')?'Market':'')}</th><th class="num">Lines</th><th class="num">Model said</th><th class="num">Happened</th><th class="num">Difference</th><th class="num">Noise margin</th><th>Read</th></tr></thead><tbody>`;
  for(const [lbl,rows] of groups){
    const t=trackSummary(rows); if(!t.n) continue;
    const thin=t.n<30;
    let read, cls='muted';
    if(thin) read='too few to read';
    else if(t.diff>=-t.margin&&t.diff<=t.margin){ read='held up'; cls='delta up'; }
    else if(t.diff>t.margin){ read=`beat its number by ${(t.diff*100).toFixed(0)}`; cls='delta up'; }
    else { read=`short by ${(-t.diff*100).toFixed(0)}`; cls='delta down'; }
    html+=`<tr class="${thin?'muted':''}"><td>${lbl}</td><td class="num">${t.n}</td><td class="num">${(t.said*100).toFixed(1)}%</td><td class="num"><b>${(t.hit*100).toFixed(1)}%</b></td>
      <td class="num ${t.diff>=0?'delta up':'delta down'}">${t.diff>=0?'+':'\u2212'}${(Math.abs(t.diff)*100).toFixed(1)}</td><td class="num muted">\u00b1${(t.margin*100).toFixed(1)}</td><td class="${cls}">${read}</td></tr>`;
  }
  return html+'</tbody></table>';
}
function trackBookTable(groups){
  let html=`<h3>Against the book</h3><p class="muted" style="margin:0 0 8px">Lines that carried a real price: the main lines built in for the week. The book's chance includes its cut, so the model has to clear that too. Return is a flat $100 on every line at the price shown.</p>`;
  html+=`<table><thead><tr><th></th><th class="num">Lines</th><th class="num">Model said</th><th class="num">Book implied</th><th class="num">Happened</th><th class="num">Return per $100</th><th>Read</th></tr></thead><tbody>`;
  for(const [lbl,rows] of groups){
    const n=rows.length; if(!n) continue;
    const said=rows.reduce((a,r)=>a+r.p,0)/n, imp=rows.reduce((a,r)=>a+r.imp,0)/n, hit=rows.reduce((a,r)=>a+r.hit,0)/n;
    const ret=rows.reduce((a,r)=>a+(r.hit?(mlToDec(r.ml)-1)*100:-100),0)/n;
    const thin=n<30; const read=thin?'too few to read':(ret>=0?'in profit':'losing');
    html+=`<tr class="${thin?'muted':''}"><td>${lbl}</td><td class="num">${n}</td><td class="num">${(said*100).toFixed(1)}%</td><td class="num">${(imp*100).toFixed(1)}%</td><td class="num"><b>${(hit*100).toFixed(1)}%</b></td>
      <td class="num ${ret>=0?'delta up':'delta down'}">${ret>=0?'+':'&minus;'}$${Math.abs(ret).toFixed(0)}</td><td class="${thin?'muted':(ret>=0?'delta up':'delta down')}">${read}</td></tr>`;
  }
  return html+'</tbody></table>';
}
function renderTrack(){
  const body=$('trackBody'); if(!body) return;
  const ms=$('trackMarket');
  if(ms&&ms.options.length<=1) for(const m of MARKETS){ const o=document.createElement('option'); o.value=m.k; o.textContent=m.lbl; ms.appendChild(o); }
  const mk=ms?ms.value:'all', kind=$('trackKind')?$('trackKind').value:'all';
  let rows=trackRecord();
  const total=rows.length;
  if(mk!=='all') rows=rows.filter(r=>r.stat===mk);
  if(kind!=='all') rows=rows.filter(r=>r.kind===kind);
  if(!total){ body.innerHTML='<p class="muted">Nothing graded yet. Once a week\u2019s player stats are in, every projection from that week is scored here.</p>'; return; }
  if(!rows.length){ body.innerHTML='<p class="muted">Nothing graded for that combination yet.</p>'; return; }
  const all=trackSummary(rows);
  const bands=[['High (70% and up)',rows.filter(r=>r.p>=0.70)],['Med (45% to 70%)',rows.filter(r=>r.p>=0.45&&r.p<0.70)],['Low (under 45%)',rows.filter(r=>r.p<0.45)]];
  const hi=trackSummary(bands[0][1]);
  let html=`<div class="bigp">
    <div class="box hero"><b>${(all.hit*100).toFixed(1)}%</b><span>happened, across ${all.n} lines that said ${(all.said*100).toFixed(1)}% on average</span></div>
    <div class="box"><b class="${all.diff>=0?'delta up':'delta down'}">${all.diff>=0?'+':'\u2212'}${(Math.abs(all.diff)*100).toFixed(1)}</b><span>points versus what was said, noise margin \u00b1${(all.margin*100).toFixed(1)}</span></div>
    <div class="box"><b>${hi.n?(hi.hit*100).toFixed(1)+'%':'\u2013'}</b><span>${hi.n?`happened on the ${hi.n} High-confidence lines, which said ${(hi.said*100).toFixed(1)}%`:'no High-confidence lines graded yet'}</span></div>
    <div class="box"><b>${(Math.sqrt(rows.reduce((a,r)=>a+(r.p-r.hit)**2,0)/rows.length)).toFixed(3)}</b><span>Brier score. Lower is better, 0.500 is a coin flip on every line</span></div>
  </div>`;
  html+=trackTable('By confidence band',bands,'The bands are the labels on the game pages. A band has held up when what happened sits inside the noise margin of what was said. Short means the model has been over-confident there so far; treat that band a notch lower until it recovers.');
  const bk=[]; for(let b=0;b<100;b+=10){ const r=rows.filter(x=>x.p*100>=b&&x.p*100<b+10); if(r.length) bk.push([`${b}\u2013${b+10}%`,r]); }
  html+=trackTable('By what the model said',bk,'Ten-point buckets. Lines in grey have too few results to read; a difference is only worth acting on when it is outside the noise margin and shows up more than one week running.');
  const wk=[...new Set(rows.map(r=>r.w))].sort((a,b)=>a-b).map(w=>[`Week ${w}`,rows.filter(r=>r.w===w)]);
  html+=trackTable('By week',wk,'How the season is going week to week.');
  const stats=[...new Set(rows.map(r=>r.stat))].map(st=>[MKT[st]?MKT[st].lbl:st,rows.filter(r=>r.stat===st)]).sort((a,b)=>b[1].length-a[1].length);
  html+=trackTable('By market',stats,'');
  const priced=rows.filter(r=>r.ml!=null&&r.imp!=null);
  if(priced.length){
    const edge=r=>r.p-r.imp;
    html+=trackBookTable([['All priced lines',priced],
      ['Model saw value (its chance at least 3 points above the book)',priced.filter(r=>edge(r)>=0.03)],
      ['Model saw a small edge (0 to 3 points)',priced.filter(r=>edge(r)>=0&&edge(r)<0.03)],
      ['Model saw no value',priced.filter(r=>edge(r)<0)],
      ['High confidence, priced',priced.filter(r=>r.p>=0.70)],['Med confidence, priced',priced.filter(r=>r.p>=0.45&&r.p<0.70)],['Low confidence, priced',priced.filter(r=>r.p<0.45)]]);
  }
  /* the user's own locked parlays */
  const legs=[]; for(const sp of (S.saved||[])) for(const l of sp.legs){ const res=settleLeg(l); if(res==='win'||res==='loss') legs.push({p:l.p,hit:res==='win'?1:0,w:l.week}); }
  if(legs.length){
    const lb=[['High (70% and up)',legs.filter(r=>r.p>=0.70)],['Med (45% to 70%)',legs.filter(r=>r.p>=0.45&&r.p<0.70)],['Low (under 45%)',legs.filter(r=>r.p<0.45)],['All your legs',legs]];
    html+=trackTable('Your locked parlays, leg by leg',lb,`${legs.length} settled leg${legs.length===1?'':'s'} across your saved parlays, scored at the chance the model gave each one when you locked it.`);
  }
  html+='<p class="muted" style="margin:10px 0 0;font-size:12px">A book main line is scored on whichever side the model favoured, the side you would have bet. A player with no stat line for the week is skipped, the same way a leg on him would be void. Pushes on a book line are skipped.</p>';
  body.innerHTML=html;
}
/* ---------- wiring ---------- */
/* when credits were last spent, and on what. PAY.price_pull is written by the
   build that actually pulled; older builds only recorded the date on the main lines. */
function renderPricePull(){
  const el=$('pricePull'); if(!el) return;
  const pp=PAY.price_pull, meta=PAY.mkt_meta||{}, all=PAY.prices||{};
  const weeks=Object.keys(all).sort((a,b)=>a-b);
  const counts=weeks.length?weeks.map(w=>`week ${w}: ${all[w].length.toLocaleString()} price${all[w].length===1?'':'s'}`).join(', '):'no prices in this build';
  const fmt=t=>{ const d=new Date(/Z|[+-]\d\d:?\d\d$/.test(t)?t:t+'Z');
    return isFinite(d)?d.toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):t; };
  let head, sub;
  if(pp&&pp.at){
    head=`Last credit pull: <b>${fmt(pp.at)}</b>, for week ${pp.week}`
        +(pp.credits_spent!=null?`, ${pp.credits_spent} credit${pp.credits_spent===1?'':'s'} spent`:'')+'.';
    sub=counts;
  } else {
    const w=Object.keys(meta).sort((a,b)=>b-a)[0];
    head=(w&&meta[w].asof)?`Last credit pull: <b>${meta[w].asof}</b>, for week ${w}.`:'No credit pull recorded in this build.';
    sub=counts+' \u00b7 this build recorded the date only; later builds record the time and the credits left';
  }
  /* the balance is read on every build from an endpoint that costs nothing */
  const c=PAY.credits; let bal='';
  if(c&&c.left!=null){
    const total=c.used!=null?c.used+c.left:null;
    const low=total?c.left/total<0.2:false;
    bal=`<div${low?' class="warn"':''}><b>${c.left.toLocaleString()}</b> credit${c.left===1?'':'s'} left`
       +(total?` of ${total.toLocaleString()} this month`:'')
       +(c.used!=null?`, ${c.used.toLocaleString()} used`:'')
       +(c.at?` <span class="muted">\u00b7 checked ${fmt(c.at)}</span>`:'')+'</div>';
  }
  el.innerHTML=`<div>${head}</div><div class="muted">${sub}</div>${bal}`;
}
function renderAll(){ buildNorm(); renderWeekOptions(); renderSlate(); renderParlay(); renderTrack(); renderPricePull(); renderBackupState();
  $('buildNote').textContent=`Model ${MODEL_BUILD}. ${APP_BUILD}. ${Object.keys(S.processed).length} week${Object.keys(S.processed).length===1?'':'s'} of ${SEASON} loaded.`; }
/* the Games tab's own scores: off until asked, then read on the button */
$('slateNow')?.addEventListener('click',()=>{ LIVE.slate=true; LIVE.err=null; slateStamp(); liveRefresh(); });
['trackMarket','trackKind'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change',renderTrack); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&gameShown()) closeGame(); });
$('gameModal').addEventListener('click',e=>{ if(e.target===$('gameModal')) closeGame(); });
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
  document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='tab-'+b.dataset.tab);
  tabLeft(b); }));
function parseCSV(file){ return new Promise(res=>Papa.parse(file,{header:true,skipEmptyLines:true,complete:r=>res(r.data)})); }

/* The payload is fetched, not baked in. The page and the data are separate files so a
   data refresh does not rewrite the page, and a browser holding the page never holds
   stale numbers with it: this is asked for with no-store every single load. */
async function loadPayload(){
  const r=await fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store'});
  if(!r.ok) throw new Error(DATA_URL+' returned HTTP '+r.status);
  const p=await r.json();
  if(!p||!Array.isArray(p.sched)||!Array.isArray(p.players)) throw new Error(DATA_URL+' is not a payload');
  return p;
}
function payloadFailed(e){
  const m=document.createElement('div');
  m.style.cssText='margin:18px;padding:16px 18px;border-radius:12px;background:#FAE1DE;color:#7A241A;line-height:1.6;font:15px/1.6 system-ui,sans-serif';
  m.innerHTML='<b>The season data could not be loaded</b> ('+esc(e&&e.message||e)+'). Reload to try again.';
  const main=document.querySelector('main')||document.body;
  main.insertBefore(m,main.firstChild);
}
async function boot(){
  try{ PAY=await loadPayload(); }catch(e){ console.error(e); payloadFailed(e); return; }
  DATA_BUILD=PAY.build||'baseline';
  DATA_STAMP=PAY.baked_at||DATA_BUILD;
  const saved=await store.get();
  S=freshState();
  let rebuilt=null;
  if(saved&&saved.build===MODEL_BUILD&&saved.dataBuild===DATA_BUILD&&saved.dataStamp===DATA_STAMP){ S={...S,...saved}; }
  else if(saved){
    /* a fresh bake on its own rebuilds the season without a word: the job publishes several
       times a week and a banner on each would bury the one that matters */
    rebuilt=(saved.build===MODEL_BUILD&&saved.dataBuild===DATA_BUILD)?null
      :(saved.dataBuild&&saved.dataBuild!==DATA_BUILD)||!saved.dataBuild
      ? 'Rosters updated: season rebuilt, your builder kept.'
      : 'Model updated: season rebuilt, your builder kept.';
    /* the season's data is built in and replays below; keep what only you could have made */
    for(const k of ['parlay','saved','odds','stake','bookPrice','margin','gamesFetched','lastBackup']) if(saved[k]!=null) S[k]=saved[k];
  }
  /* the view resets, but a toggle the reader set is theirs */
  S.ui={game:null,open:{},showAll:false,
    pb:pbClean(saved&&saved.ui&&saved.ui.pb)};
  S.inactive=S.inactive||{}; S.depth=S.depth||{};
  S.odds=S.odds||{}; S.parlay=S.parlay||{}; S.stake=pbStake(); S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{};
  let baked=null;
  if(!window.NO_BAKED){ try{ baked=applyBaked(); }catch(e){ console.error('built-in data failed to apply',e); setTimeout(()=>log('Built-in data could not be applied: '+(e&&e.message||e)+'. The upload buttons still work.','err'),0); } }
  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  /* (app v127) a ladder bet kept in the builder from before leaves it, said on the builder (pbDropLadders) */
  if(pbDropLadders()) save();
  /* (app v125) the props job's read of DraftKings' lines on ESPN, published with the payload: outside NO_BAKED, so
     the audit sees what a visitor sees, and before the kept read, which it may outrank */
  try{ espnPublished(); }catch(e){ console.error(e); }
  /* (app v108) a Refresh odds read this browser kept, where it still stands: before the first draw, no request */
  try{ espnRestore(); }catch(e){ console.error(e); }
  { const bt=$('buildTag'); if(bt) bt.textContent=`${MODEL_BUILD} \u00b7 ${APP_BUILD}`; }
  renderAll(); pbWatch(); pbRecLoad();
  $('rebuildNote').hidden=!rebuilt;
  if(rebuilt){ $('rebuildNote').textContent=rebuilt; setTimeout(()=>log(rebuilt,'warn'),0); }
  if(baked&&(baked.stats.length||baked.prices||baked.inj)){
    const parts=[]; if(baked.stats.length) parts.push(`${baked.stats.length} game${baked.stats.length===1?'':'s'} of stats graded and applied`);
    if(baked.prices) parts.push(`${baked.prices} prices loaded`); if(baked.inj) parts.push(`${baked.inj} players ruled out`);
    setTimeout(()=>log(`Built into this file (${PAY.baked_at?String(PAY.baked_at).slice(0,16).replace('T',' '):'weekly build'}): ${parts.join(', ')}. Nothing to upload.`,'ok'),0); }
  else {
    /* a return visit: the built-in data is already here, so nothing new was applied and
       nothing was logged. Say what is loaded rather than leave the first-visit placeholder,
       which claimed there was no 2026 data at all. */
    /* games, not weeks: S.processed only counts a week once every game in it is final */
    const gm=Object.keys(S.processedGames||{}).length;
    const priced=Object.values(S.odds).filter(o=>o&&Object.keys(o).length).length;
    const bits=[];
    if(gm) bits.push(`${gm} game${gm===1?'':'s'} of ${SEASON} stats`);
    if(priced) bits.push(`prices for ${priced} game${priced===1?'':'s'}`);
    setTimeout(()=>log(bits.length
      ?`Already loaded in this browser: ${bits.join(' and ')}, from the build of ${PAY.baked_at?String(PAY.baked_at).slice(0,16).replace('T',' '):'the weekly job'}. Nothing to upload.`
      :`No ${SEASON} data yet. Projections are running off how everyone finished ${SEASON-1}.`,'ok'),0); }
}
/* the balance the last build published (the hidden Weekly Update tab's credit panel; since app v125 no build buys
   prices, so it stands as the last paid pull left it). The public page never asks the odds API itself: only the
   admin's browser does, through the hub's HUB_ADMIN, which alone holds the key */
const CREDITS_URL='https://demon-x13.github.io/nfl-hub/props/data/credits.json';
$('checkCredits').addEventListener('click',async()=>{
  const b=$('checkCredits'); b.disabled=true; const was=b.textContent; b.textContent='Checking\u2026';
  try{
    const r=await fetch(CREDITS_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const c=await r.json();
    if(!c||c.left==null) throw new Error('that file carries no balance');
    const same=PAY.credits&&PAY.credits.left===c.left&&PAY.credits.at===c.at;
    PAY.credits=c; renderPricePull();
    setStatus('creditsStatus',same?'Unchanged since this page was built.':'Updated from the published balance.','ok');
  }catch(e){
    setStatus('creditsStatus','Could not read the published balance ('+e.message+'). The figure above is the one built into this file.','err');
  }
  b.textContent=was; b.disabled=false;
});
$('weekSel').addEventListener('change',()=>{S.ui.game=null;renderSlate();});
$('fetchGames').addEventListener('click',async()=>{
  const b=$('fetchGames'); b.disabled=true; const was=b.textContent; b.textContent='Fetching\u2026';
  try{
    const r=await fetch(GAMES_URL,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const rows=Papa.parse(await r.text(),{header:true,skipEmptyLines:true}).data;
    const byId=Object.fromEntries(S.sched.map(g=>[g.id,g])); let upd=0;
    for(const row of rows){
      if(+row.season!==SEASON||row.game_type!=='REG') continue;
      const g=byId[row.game_id]; if(!g) continue;
      g.d=row.gameday||g.d; g.t=row.gametime||g.t;
      const sp=parseFloat(row.spread_line), tot=parseFloat(row.total_line);
      g.sp=isFinite(sp)?sp:g.sp; g.tot=isFinite(tot)?tot:g.tot;
      for(const [f,c] of [['mla','away_moneyline'],['mlh','home_moneyline'],['spa','away_spread_odds'],['sph','home_spread_odds'],['tov','over_odds'],['tou','under_odds']]){ const v=parseFloat(row[c]); if(isFinite(v)) g[f]=v; }
      const hs=parseFloat(row.home_score), as_=parseFloat(row.away_score);
      if(isFinite(hs)&&isFinite(as_)){ g.hs=hs; g.as=as_; } upd++;
    }
    S.gamesFetched=Date.now(); save(); renderSlate();
    setStatus('gamesStatus',`Refreshed ${upd} games. Kickoffs, spreads and totals feed the projections.`,'ok');
  }catch(err){ setStatus('gamesStatus','Could not reach the schedule file: '+err.message+'. Try again in a moment.','err'); }
  b.textContent=was; b.disabled=false;
});
$('upAll').addEventListener('click',()=>$('allFiles').click());
$('allFiles').addEventListener('change',async e=>{
  const files=[...e.target.files]; e.target.value=''; if(!files.length) return;
  for(const f of files){
    const rows=await parseCSV(f);
    if(!rows.length){ log(`${f.name}: empty file.`,'err'); continue; }
    const c=rows[0];
    if('pos_rank' in c&&'pos_abb' in c){ const r=ingestDepth(rows);
      log(`${f.name}: depth chart read, ${r.n} starters and backups ranked (${r.dt}).`,'ok'); }
    else if('report_status' in c||'game_status' in c){ const r=ingestInjuries(rows);
      log(`${f.name}: injury report read, ${r.out} player${r.out===1?'':'s'} ruled out for week ${r.week}.`,'ok'); }
    else if('player_id' in c && 'week' in c && 'attempts' in c){
      const r=ingestStats(rows);
      if(r.done.length){
        const names=r.done.map(g=>`${g.a} at ${g.h}`);
        log(`${f.name}: ${r.done.length} game${r.done.length===1?'':'s'} counted \u2014 ${names.join(', ')}. Projections updated.`,'ok');
        if(r.skipped.length) log(`${r.skipped.length} game${r.skipped.length===1?'':'s'} in that file were already counted and were skipped.`,'warn');
      } else if(r.games) log(`${f.name}: nothing new, all ${r.games} game${r.games===1?'':'s'} in it were already counted.`,'warn');
      else log(`${f.name}: no ${SEASON} regular-season rows found.`,'warn'); }
    else if('gsis_id' in c||('player_id' in c&&'position' in c)){ const r=ingestRoster(rows);
      log(`${f.name}: roster read, ${r.moved} team change${r.moved===1?'':'s'}, ${r.added} added${r.full?`, ${r.dropped} no longer rostered and removed`:', partial file so nobody was removed'}.`,'ok'); }
    else log(`${f.name}: not a file this app knows how to read.`,'err');
  }
  save(); renderAll();
});
$('exportBtn').addEventListener('click',()=>{ S.lastBackup=Date.now(); downloadText(`prop_model_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(S)); save(); renderBackupState(); });
/* how old the last backup is; red once it passes a week, or when there is something to lose and no backup */
function renderBackupState(){
  const el=$('backupState'); if(!el) return;
  const mine=(S.saved||[]).length+Object.keys(S.parlay||{}).length;
  if(!S.lastBackup){ el.className=mine?'err':'muted';
    el.innerHTML=mine?'<b>No backup saved yet.</b> Your saved parlays live only in this browser.':'No backup saved yet. Nothing to lose until you save a parlay.'; return; }
  const age=(Date.now()-S.lastBackup)/86400000, d=Math.floor(age);
  el.className=age>7?'err':'ok';
  el.innerHTML=`Last backup <b>${d===0?'today':d===1?'yesterday':d+' days ago'}</b>.`+(age>7?' That is getting old, save a fresh one.':'');
}
$('importBtn').addEventListener('click',()=>{
  if(!confirm('Import a backup?\n\nIt replaces everything currently here. This cannot be undone.')) return;
  $('importInput').click(); });
$('importInput').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
  const rd=new FileReader(); rd.onload=()=>{ try{ S=JSON.parse(rd.result);
    S.ui={game:null,open:{},showAll:false}; S.inactive=S.inactive||{}; S.depth=S.depth||{};
    S.odds=S.odds||{}; S.parlay=S.parlay||{}; S.stake=pbStake(); S.saved=S.saved||[]; S.actuals=S.actuals||{}; S.projections=S.projections||{}; S.headlines=S.headlines||{}; S.processedGames=S.processedGames||{};
    pbDropLadders(); save(); renderAll(); alert('Backup restored.'); }catch(err){ alert('That file could not be read: '+err.message); } };
  rd.readAsText(f); });

/* the links to this season's nflverse files, from SEASON rather than a year written into them */
for(const [id,file] of [['statsLink',`stats_player/stats_player_week_${SEASON}.csv`],['rosLink',`rosters/roster_${SEASON}.csv`],
  ['injLink',`injuries/injuries_${SEASON}.csv`],['dcLink',`depth_charts/depth_charts_${SEASON}.csv`]]){
  const a=$(id); if(a) a.href='https://github.com/nflverse/nflverse-data/releases/download/'+file; }
boot().then(()=>document.dispatchEvent(new Event('app-ready')));

/* ---------- parlay builder ---------- */
function toggleLeg(key,k,g,side,main){
  const cur=S.parlay[key];
  { const gid=key.split('|')[0]; const gg=g||S.sched.find(x=>x.id===gid); if(gg&&gameStarted(gg)) return; }
  if(cur&&cur.k===k&&cur.side===side&&!!cur.main===!!main){ delete S.parlay[key]; save(); renderGame(); renderParlay(); return; }
  const [gid,pid,stat]=key.split('|');
  if(NO_BET.has(stat)) return;   /* (app v113) never a leg DraftKings does not offer */
  if(isLadder({stat,k,main:!!main})) return;   /* (app v127) never a ladder bet: a rung k+ or 2+ touchdowns */
  const game=g||S.sched.find(x=>x.id===gid);
  if(stat==='total'){
    if(!game) return; const l=totalLeg(game,side==='under'?'under':'over'); if(!l) return;
    const {key:_k,...leg}=l; S.parlay[key]=espnGlTag(leg);
    save(); renderGame(); renderParlay(); return;
  }
  if(stat==='ml'||stat==='ats'){
    if(!game) return; const team=pid.replace(/^team:/,''); const b=gameBet(game,team,stat); if(!b) return;
    const isHome=team===game.h, opp=isHome?game.a:game.h;
    const book=stat==='ml'?(isHome?game.mlh:game.mla):(isHome?game.sph:game.spa);
    const label=stat==='ml'?'To win':`To cover ${b.line>0?'+':''}${b.line}`;
    S.parlay[key]={gid,pid,stat,k:b.line==null?0:b.line,side:'over',main:false,p:b.p,price:(book!=null&&isFinite(book))?book:bookPrice(b.p),src:(book!=null&&isFinite(book))?'real':'est',
      mu:null,name:TEAM_NAMES[team]||team,pos:'Game',grp:'TEAM',team,opp,week:game.w,label};
    espnGlTag(S.parlay[key]);
    save(); renderGame(); renderParlay(); return;
  }
  const pl=S.players[pid]; if(!pl||!game) return;
  const team=pl.team, opp=(game.h===team)?game.a:game.h;
  const ctx=gameCtx(game,team);
  const pr=project(pl,stat,opp,ctx); if(!pr) return;
  const m=MKT[stat];
  /* each leg's price by the page's order: DraftKings' own while its line stands, else its line from a
     Refresh odds read priced by the formula (dkline), else the model's estimate; a dkline leg carries
     its fair chance and read time */
  const x={pl,team,opp,ctx};
  let p,label,price=null,src='est',dk=null;
  if(m.prob){ p=pr.p; label=tdLabel(pl.grp,1); price=bookPrice(p); k=1;
    if(oddsFor(gid,pid,'any_td',1)==null){ const d=espnPrice(x,game,'any_td','td',1); if(d){ price=d.price; src='dkline'; dk=d; } } }
  else if(main){
    const M=mainOf(x,game,stat); if(!M) return;
    if(M.src==='real'){ const L=M.L, pO=pOver(pl.grp,stat,pr.mu,L.line); k=L.line;
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${L.line} ${m.lbl.toLowerCase()}`;
      price=side==='under'?L.under:L.over; src='real'; }
    else { const d=side==='under'?M.dU:M.dO, pO=pOver(pl.grp,stat,pr.mu,d.line); k=d.line;
      p=side==='under'?1-pO:pO; label=`${side==='under'?'Under':'Over'} ${d.line} ${m.lbl.toLowerCase()}`;
      price=d.price; src='dkline'; dk=d; }
  }
  /* one pick per player and stat: writing to the same key replaces whatever was there */
  S.parlay[key]={gid,pid,stat,k,side,main:!!main,p,price,src,mu:m.prob?null:pr.mu,name:pl.n,pos:pl.pos,grp:pl.grp,
    team,opp,week:game.w,label,...(dk?{espn:espnOf(dk)}:{})};
  save(); renderGame(); renderParlay();
}
function legPrice(l){
  /* (app v125) a leg the parlay card's Pull from DraftKings priced (parlayLegs' copy, never S.parlay): DraftKings' own */
  if(l&&l.pulled&&isFinite(+l.pulled.ml)&&+l.pulled.ml!==0) return {ml:+l.pulled.ml,src:'real',pulled:true};
  /* (app v125) a leg of a locked set (spLegIn's kept) is at its locked price through any later publish or press, so the
     builder pays what the locked card says */
  if(l&&l.kept&&l.price!=null&&isFinite(l.price)&&l.price!==0) return {ml:l.price,src:l.src||'est'};
  /* (app v107) a leg a Refresh odds press priced goes back to the page's own price once that press no
     longer stands (espnLegBack): after a reload the builder is on the published prices too */
  if(isGameLeg(l)){ const b=espnLegBack(l); if(b) return b; return l.price!=null?{ml:l.price,src:l.src||'est'}:{ml:probToAmerican(l.p),src:'fair'}; }
  const book=l.main?null:oddsFor(l.gid,l.pid,l.stat,l.k);
  if(book!=null) return {ml:book,src:'real'};
  { const b=espnLegBack(l); if(b) return b; }
  if(l.price!=null) return {ml:l.price,src:l.src||'est'};
  return {ml:probToAmerican(l.p),src:'fair'};
}
/* ---------- what a book pays for a parlay ----------
   Legs in different games multiply: that is exactly what a book does. Legs in one
   game do not, because they overlap. The chance they all land is higher than the
   product, so the fair price is shorter, and the book holds more on a same-game
   ticket than on singles. So each game's legs are priced together from the
   market's own implied chances joined by our correlations, then cut by SGP_HOLD.

   SGP_HOLD is fitted to two real DraftKings tickets on Detroit at Buffalo
   (2026-09-17), using DraftKings' own leg prices rather than a best-of-market
   price, since the pull now reads one book. Correlating those leg prices gave 7.33
   and 5.36 where DraftKings offered 6.25 and 5.05, implying cuts of 0.852 and
   0.942; 0.896 is the geometric mean. That leaves +5.1% and -4.9% on the two.
   Two tickets is a thin sample and this wants refitting as more are collected. */
const SGP_HOLD=0.896;
function parlayDec(priced,sims){
  const byGame={};
  for(const x of priced) (byGame[x.leg.gid]=byGame[x.leg.gid]||[]).push(x);
  let dec=1;
  for(const gid in byGame){
    const grp=byGame[gid];
    const mult=grp.reduce((a,x)=>a*(mlToDec(x.ml)||1),1);
    if(grp.length<2){ dec*=mult; continue; }
    const pj=parlayProb(grp.map(x=>({...x.leg,p:mlProb(x.ml)})),sims||20000).corr;
    dec*=(pj>0&&isFinite(pj))?Math.min(mult,(1/pj)*SGP_HOLD):mult;   /* never pay more than multiplying */
  }
  return dec;
}
const sameGame=legs=>{ const g={}; for(const l of legs) g[l.gid]=(g[l.gid]||0)+1;
  return Object.values(g).some(n=>n>1); };

/* ---------- Refresh odds: DraftKings' lines read from ESPN in this browser, on a press (app v107) ----------
   The owner, 15 October 2026: "i think it would be nice somewhere to have a refresh odds button that will
   pull the live lines on demand. would rather it be on demand rather than like a constant job". A Refresh
   odds button (espnCtl: the Parlay Builder's controls and the Props tab's game list read every game of the
   week still to come; a game's page reads that game alone) reads DraftKings' lines from ESPN's free feed in
   the visitor's own browser when it is pressed, and never otherwise: nothing is fetched for it on load or
   on a timer. Since app v125 the props job reads ESPN too, on every run, with this very reader (espnReadWeek,
   in jsdom), and publishes what it read in the payload (PAY.espn and the schedule's game lines; espnPublished,
   below, installs it at boot), so every visitor starts from DraftKings' lines and a press reads them again,
   newer. Both ESPN hosts answer a plain GET with access-control-allow-origin: *, and the page sends no
   header of its own, so there is no preflight.

   A press reads, for each game still to come:
   - the week's scoreboard (ESPN_SB; ESPN's postseason weeks are seasontype 3): each event's clubs, kickoff
     and DraftKings' (provider 100) moneylines, spread and total with their prices, which are DraftKings'
     own, and its bet links, which carry DraftKings' event id and the game lines' outcome ids. An event is
     matched to a game by the unordered pair of its clubs within the week (espnAb: ESPN's WSH, LAR and JAC
     are WAS, LA and JAX), never by home and away, which ESPN can write either way at a neutral site;
   - each game's player lines (ESPN_CORE propBets of provider 100), every page to its pageCount at
     limit=1000 (a larger limit silently becomes 25 a page), with a cache-buster (without one ESPN's cache
     serves a copy up to about 15 minutes old). An item carries a type id, the athlete and the line, and no
     price and no side: a main line comes as two identical items, its Over and Under (kept once; two
     different lines for one player and stat are both dropped), a milestone as k meaning k+, the anytime
     touchdown with no line (ESPN_MAIN, ESPN_MILE, ESPN_ANY_TD); every other market is ignored. A 404 is
     DraftKings having posted no player lines for the game yet ("No propBets found");
   - an athlete is placed by PAY.espn_ids, else by name within the game's two clubs (his ESPN athlete
     record, or each club's roster where a game has more than ESPN_NAME_EACH to place; the page's own name
     rule, every exact name then the looser key, one match only, on a player no ESPN id in PAY.espn_ids
     names and no other athlete of the read claims), else left out. A player the page does not project is
     carried and inert.
   ESPN_POOL requests at a time, each given ESPN_TIMEOUT_MS. A game is read only while its kickoff (the
   earlier of the schedule's and ESPN's) is to come, and a read that ends at or after it is thrown away: the
   feed carries in-play values from kickoff. A failure, a body that is not the JSON asked for or a 404
   leaves the game as it was. A read is dated by its last answer's Date header where the browser lets the
   page read one, else by the browser's clock: Date is not a CORS-safelisted response header and ESPN
   exposes only content-length and location, so in a browser it is the clock. ESPN's lastUpdated is never
   read: it is labelled Z but has run three hours ahead of UTC.

   What a press changes is held in memory, outside S, and (app v108) kept in this browser under a key of
   its own until it gives way (espnKeepWrite, espnRestore, below), so a reload puts it back where it still
   stands and returns to the published data where it does not (a leg it priced in the builder too,
   espnLegBack):
   ESPN_LIVE[week][gid] = {at, lines:{pid:{stat:L}}, rungs:{pid:{stat:[k,...]}}, td:[pid]}, priced by the
   formula (part2.js estPrice) and marked est.; the game's lines (g.mla, mlh, sp, spa, sph, tot, tov, tou,
   ls 'dk', lat) where the read is newer than the published ones, with the published ones kept in ESPN_GL
   for save() (espnSavable); DraftKings' event and game-line ids into PAY.dk for the game beside any the
   paid pull has, never replacing one, each dated by this read (ESPN_IDAT, espnIdAt: the parlay card reads
   it; glat stays the pull's); and each game's outcome (ESPN_OUT) for the status lines. Then every
   cache a price stands on is dropped (PB_CACHE, PB_TOP_CACHE, SP_CACHE, GAME_TIER_CACHE; ESPN_SEQ is in
   pbDataSig and gameSuggestSig) and the page is drawn again.

   Each player leg's price after a press: a real price from the paid pull where its line is still
   DraftKings' current line (the read has the same number, or none for him: a read with no line for a
   player is no evidence the line is gone); where the read's line differs (DraftKings moved it since the
   pull), or the pull has none, the read's line priced by the formula (src 'dkline', est.); with no line at
   all the model's estimate as before (src 'est'). A rung or a touchdown the pull priced keeps its real
   price. Where the page chooses legs (the Parlay Builder's levels, a game page's hands, the Elo picks) a
   dkline leg of a tested kind counts as a book price does, by the same rules: a main line, over or under,
   on passing, rushing or receiving yards, receptions or passing touchdowns; the anytime touchdown; and a
   yards ladder rung DraftKings lists, anchored on its line. Every other dkline leg (completions,
   attempts, carries, rush + rec yards, interceptions, field goals, kicking points, the receptions and
   passing-TD ladders, and a rung DraftKings does not list) is priced and shown, est., on the game pages and
   never suggested; a model-only est. leg stays where it was, in a game page's hands alone. A dkline leg's
   fair chance is the formula's own (legFair), est. */
const ESPN_CORE='https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const ESPN_TEAM='https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/';
const ESPN_DK='100', ESPN_LIMIT=1000, ESPN_MAX_PAGES=5, ESPN_POOL=4, ESPN_TIMEOUT_MS=15000, ESPN_NAME_EACH=6;
const ESPN_MAIN={8:'passing_yards',9:'completions',10:'passing_tds',11:'carries',12:'rushing_yards',13:'receiving_yards',14:'receptions',
  15:'passing_interceptions',16:'attempts',20:'scrim_yards',22:'kick_pts',24:'fg_made'};
const ESPN_MILE={194:'passing_yards',207:'completions',198:'passing_tds',201:'carries',196:'rushing_yards',195:'receiving_yards',202:'receptions',
  199:'passing_interceptions',200:'attempts',197:'scrim_yards',203:'kick_pts',205:'fg_made'};
const ESPN_ANY_TD='31';
const ESPN_GL_KEYS=['mla','mlh','sp','spa','sph','tot','tov','tou','ls','lat'];
const ESPN_TESTED={main:new Set(['passing_yards','rushing_yards','receiving_yards','receptions','passing_tds']),rung:new Set(['passing_yards','rushing_yards','receiving_yards'])};
/* the press's state: never in S; kept under its own key until it gives way (app v108, below) */
let ESPN_LIVE={}, ESPN_GL={}, ESPN_OUT={}, ESPN_NAMES={}, ESPN_IDAT={}, ESPN_SEQ=0;
/* (app v125) the published read (espnPublished): ESPN_PUB[w][gid] = {at, st, when, block, gl:{at, ids, event}}
   (block the very object it put in ESPN_LIVE, so a pressed block is told from it by identity); ESPN_PUB_IDS[gid][key]
   = {id, at}, the game-line ids it merged into PAY.dk, dated by its read; ESPN_PUB_ADDED what it added to PAY.dk
   (so a game no longer published takes them back out); ESPN_PUB_DK the table it merged into */
let ESPN_PUB={}, ESPN_PUB_IDS={}, ESPN_PUB_ADDED={}, ESPN_PUB_DK=null;
let ESPN_RUN={busy:false,gid:null,week:null,total:0,done:0,requests:0,clock:false};
const espnWeekQ=w=>+w<=18?`seasontype=2&week=${+w}`:`seasontype=3&week=${+w>=22?5:+w-18}`;
const espnIso=t=>new Date(t).toISOString();
/* one request: the page's own fetch, no-store and no header of its own, given ESPN_TIMEOUT_MS.
   {status: 200 with body | the HTTP status | 0 not reached | -1 not JSON, at: the Date header, or null} */
async function espnFetch(url){
  ESPN_RUN.requests++;
  const ac=typeof AbortController==='function'?new AbortController():null;
  const tm=ac?setTimeout(()=>{ try{ ac.abort(); }catch(e){} },ESPN_TIMEOUT_MS):null;
  try{
    const r=await fetch(url,ac?{cache:'no-store',signal:ac.signal}:{cache:'no-store'});
    /* Date is not a CORS-safelisted response header, and ESPN exposes only content-length and location:
       in a browser this is null and the read is dated by the browser's clock */
    let at=null; try{ const h=r&&r.headers&&typeof r.headers.get==='function'?r.headers.get('date'):null, t=h?Date.parse(h):NaN; if(isFinite(t)) at=t; }catch(e){}
    if(!r||!r.ok) return {status:(r&&r.status)||0,at,why:'HTTP '+((r&&r.status)||0)};
    let body; try{ body=await r.json(); }catch(e){ return {status:-1,at,why:'an answer that is not JSON'}; }
    return {status:200,body,at};
  }catch(e){ return {status:0,at:null,why:String(e&&e.message||e)}; }
  finally{ if(tm) clearTimeout(tm); }
}
async function espnPool(tasks,n){ let i=0;
  const one=async()=>{ while(i<tasks.length){ const k=i++; try{ await tasks[k](); }catch(e){ console.error(e); } } };
  await Promise.all(Array.from({length:Math.max(1,Math.min(n,tasks.length))},one)); }
/* '+120', '-142', 'EVEN' -> 120, -142, 100; '+2.5', 'o40.5', 'PK' -> 2.5, 40.5, 0 */
function espnAmerican(s){ if(typeof s==='number') return isFinite(s)&&Math.abs(s)>=100?Math.round(s):null;
  const t=String(s==null?'':s).trim().toUpperCase(); if(t==='EVEN'||t==='EV') return 100;
  return /^[+-]?\d+$/.test(t)&&Math.abs(+t)>=100?+t:null; }
function espnLineNum(s){ if(typeof s==='number') return isFinite(s)?s:null;
  const t=String(s==null?'':s).trim().toLowerCase().replace(/^[ou]/,''); if(t==='pk'||t==='pick'||t==='even') return 0;
  return /^[+-]?\d+(\.\d+)?$/.test(t)?+t:null; }
/* a bet link's DraftKings event id and outcome id */
function espnLink(c){ try{ const href=String(c&&c.link&&c.link.href||''); if(!href) return {};
  const u=new URL(href), v=new URL(u.searchParams.get('preurl')||href), m=/\/event\/(\d+)/.exec(v.pathname), oc=(v.searchParams.get('outcomes')||'').trim();
  return {event:m?m[1]:null,outcome:oc||null}; }catch(e){ return {}; } }
/* an event's two clubs in our codes, with ESPN's own team id and code: {home:{ab,id,esp}, away:{...}}, or null */
function espnClubs(ev){ try{ const o={};
  for(const x of ev.competitions[0].competitors) o[x.homeAway]={ab:espnAb(x.team.abbreviation),id:String(x.team.id||''),esp:String(x.team.abbreviation||'').toLowerCase()};
  return o.home&&o.away&&o.home.ab&&o.away.ab?o:null; }catch(e){ return null; } }
/* DraftKings' game lines on a scoreboard event, by club and in the payload's terms: {lines:{mla, mlh, sp
   (the schedule's spread_line: positive when its home club is favoured), spa, sph, tot, tov, tou}, ids
   keyed as PAY.dk is ('team:SEA|ml', 'team:DEN|ats|2.5', 'game|total|over|40.5'), event}, or null where
   the event names other clubs or carries no DraftKings odds */
function espnOdds(ev,g){
  const cl=espnClubs(ev); if(!cl||[cl.home.ab,cl.away.ab].sort().join('|')!==[g.a,g.h].sort().join('|')) return null;
  let o=null; try{ o=(ev.competitions[0].odds||[]).find(x=>x&&x.provider&&String(x.provider.id)===ESPN_DK)||null; }catch(e){}
  if(!o) return null;
  const at=(...p)=>{ let x=o; for(const k of p) x=x&&typeof x==='object'?x[k]:null; return x&&typeof x==='object'?x:{}; };
  const lines={}, ids={}, evs=new Set(), link=c=>{ const r=espnLink(c); if(r.event) evs.add(r.event); return r.outcome||null; };
  for(const s of ['home','away']){ const team=cl[s].ab, away=team===g.a;
    let c=at('moneyline',s,'close'), p=espnAmerican(c.odds);
    if(p!=null){ lines[away?'mla':'mlh']=p; const id=link(c); if(id) ids[`team:${team}|ml`]=id; }
    c=at('pointSpread',s,'close'); const L=espnLineNum(c.line); p=espnAmerican(c.odds);
    if(L!=null){ lines.sp=away?L:(L===0?0:-L); if(p!=null) lines[away?'spa':'sph']=p; const id=link(c); if(id) ids[`team:${team}|ats|${String(L)}`]=id; } }
  for(const s of ['over','under']){ const c=at('total',s,'close'), L=espnLineNum(c.line), p=espnAmerican(c.odds);
    if(L!=null){ lines.tot=L; if(p!=null) lines[s==='over'?'tov':'tou']=p; const id=link(c); if(id) ids[`game|total|${s}|${String(L)}`]=id; } }
  link(o);
  return Object.keys(lines).length||evs.size?{lines,ids,event:evs.size===1?[...evs][0]:null}:null;
}
/* a game's lines from a read at time at, where it is newer than what the page has, and its DraftKings
   ids beside the paid pull's; true where anything moved. since (app v108, a kept read put back) stands
   in for the published lines' time: the DraftKings pull's own, never baked_at, which moves on every bake.
   fresh (app v125, a press reading now: espnRefresh, the parlay card's check) applies over lines the props job
   read from ESPN and published (lsr 'espn') whatever their lat says: that is ESPN's clock, the press's the
   browser's, and the smoke and PROPS_AUDIT_NOW move the page's clock back, so a time comparison could swallow a
   press. A paid line (ls 'dk' with no lsr) and a kept read's replay are still judged by time. The ids go into an
   entry of the game's that a read makes: it holds only event, glat and game lines' ids, so it never makes its game
   carry the pull's ids (dkCarries, by content) */
function espnApplyGame(g,odds,at,since,fresh){
  if(!odds) return false; let ch=false;
  const L=odds.lines, prev=ESPN_GL[g.id]?ESPN_GL[g.id].at:(since!=null?since:(fresh&&g.lsr==='espn'&&g.ls==='dk'?-Infinity:(Date.parse(g.lat||'')||Date.parse((PAY&&PAY.baked_at)||'')||0)));
  if(Object.keys(L).length&&at>prev){
    if(!ESPN_GL[g.id]) ESPN_GL[g.id]={orig:Object.fromEntries(ESPN_GL_KEYS.map(k=>[k,g[k]])),at:0,d:{}};
    /* (app v108) d: each line field a read set, as [its value, the read's time], the value null where one dropped it */
    const D=ESPN_GL[g.id].d||(ESPN_GL[g.id].d={});
    const set=(k,v)=>{ if(k!=='ls'&&k!=='lat') D[k]=[v,at]; if(g[k]!==v){ g[k]=v; ch=true; } }, drop=k=>{ D[k]=[null,at]; if(g[k]!==undefined){ delete g[k]; ch=true; } };
    if(L.mla!=null) set('mla',L.mla); if(L.mlh!=null) set('mlh',L.mlh);
    /* a price goes with its number: a number read without its prices drops the old ones, unless unmoved */
    if(L.sp!=null){ const same=g.sp===L.sp; set('sp',L.sp); if(L.spa!=null&&L.sph!=null){ set('spa',L.spa); set('sph',L.sph); } else if(!same){ drop('spa'); drop('sph'); } }
    if(L.tot!=null){ const same=g.tot===L.tot; set('tot',L.tot); if(L.tov!=null&&L.tou!=null){ set('tov',L.tov); set('tou',L.tou); } else if(!same){ drop('tov'); drop('tou'); } }
    set('ls','dk'); set('lat',espnIso(at)); ESPN_GL[g.id].at=at;
  }
  if(odds.event||Object.keys(odds.ids).length){
    const D=PAY.dk&&typeof PAY.dk==='object'?PAY.dk:(PAY.dk=dkPressMade({})), W=D[String(g.w)]||(D[String(g.w)]={}), E=W[g.id]||(W[g.id]={});
    if(odds.event&&!E.event){ E.event=odds.event; ch=true; }
    /* each id the read gave, or found as the pull had it, is dated by this read (ESPN_IDAT, which the
       parlay card reads); glat stays the paid pull's, dating the ids the read did not see (a spread at
       a number DraftKings has since moved off), and is set only where the game has none */
    const T=ESPN_IDAT[g.id]||(ESPN_IDAT[g.id]={});
    for(const k in odds.ids){ if(E[k]==null){ E[k]=odds.ids[k]; ch=true; } if(E[k]===odds.ids[k]) T[k]=at; }
    if(Object.keys(T).length&&!isFinite(Date.parse(E.glat))){ E.glat=espnIso(at); ch=true; }
  }
  return ch;
}
/* when a press last read a game's DraftKings id (a team's line or the total), or null; (app v125) else when the
   props job's published read did, while PAY.dk still holds that very id for the key */
function espnIdAt(gid,key){ const t=ESPN_IDAT[gid]&&ESPN_IDAT[gid][key]; if(isFinite(t)&&t>0) return t;
  const P=ESPN_PUB_IDS[gid]&&ESPN_PUB_IDS[gid][key]; if(!P) return null;
  try{ const g=((S&&S.sched)||[]).find(x=>x.id===gid), W=g&&PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, E=W&&W[gid];
    return E&&E[key]===P.id&&isFinite(P.at)&&P.at>0?P.at:null; }catch(e){ return null; } }
/* one event's items: {per:{aid:{lines:{stat:L}, rungs:{stat:[k...]}, td}}, counts} */
function espnParseItems(items){
  const per={}, c={items:0,main:0,rungs:0,td:0,ignored:0,clash:0}, clash=new Set();
  for(const it of Array.isArray(items)?items:[]){ c.items++;
    const tid=String(it&&it.type&&it.type.id!=null?it.type.id:''), m=/\/athletes\/(\d+)/.exec(String(it&&it.athlete&&it.athlete.$ref||'')), aid=m&&m[1];
    const kind=ESPN_MAIN[tid]?'main':(ESPN_MILE[tid]?'rung':(tid===ESPN_ANY_TD?'td':null)), st=ESPN_MAIN[tid]||ESPN_MILE[tid];
    if(!kind||!aid){ c.ignored++; continue; }
    const a=per[aid]||(per[aid]={lines:{},rungs:{},td:false});
    if(kind==='td'){ a.td=true; continue; }
    const v=it.current&&it.current.target?it.current.target.value:null, L=typeof v==='number'?v:parseFloat(v);
    if(!(isFinite(L)&&L>0)){ c.ignored++; continue; }
    if(kind==='rung'){ const r=a.rungs[st]||(a.rungs[st]=[]); if(!r.includes(L)) r.push(L); continue; }
    if(a.lines[st]!=null&&a.lines[st]!==L) clash.add(aid+'|'+st);
    a.lines[st]=L;
  }
  for(const k of clash){ const i=k.indexOf('|'); delete per[k.slice(0,i)].lines[k.slice(i+1)]; }
  c.clash=clash.size;
  for(const aid in per){ const a=per[aid]; for(const st in a.rungs) a.rungs[st].sort((x,y)=>x-y);
    c.main+=Object.keys(a.lines).length; c.rungs+=Object.values(a.rungs).reduce((s,r)=>s+r.length,0); c.td+=a.td?1:0; }
  return {per,counts:c};
}
/* every page of one event's player lines: {st:'ok', items, at} | {st:'none'} | {st:'failed', why} */
async function espnProps(eid){
  let items=[], pages=1, at=null;
  for(let p=1;p<=pages;p++){
    const r=await espnFetch(`${ESPN_CORE}/events/${eid}/competitions/${eid}/odds/${ESPN_DK}/propBets?lang=en&region=us&limit=${ESPN_LIMIT}&page=${p}&_=${Date.now()}`);
    /* (app v125) dated by its answer (the Date header where it can be read, else the page's clock), for the job */
    if(r.status===404&&p===1) return {st:'none',why:'DraftKings has posted no player lines for it yet',at:r.at!=null?r.at:Date.now()};
    if(r.status!==200) return {st:'failed',why:r.why||('HTTP '+r.status)};
    const d=r.body;
    if(!d||typeof d!=='object'||!Array.isArray(d.items)||typeof d.pageCount!=='number') return {st:'failed',why:'an answer with no items and pageCount'};
    if(p===1){ pages=d.pageCount;
      if(d.pageSize!=null&&d.pageSize!==ESPN_LIMIT) return {st:'failed',why:`pages of ${d.pageSize}, not ${ESPN_LIMIT}: the limit rule has changed`};
      if(pages>ESPN_MAX_PAGES) return {st:'failed',why:`${pages} pages: the limit rule has changed`}; }
    if(p<pages&&d.items.length!==ESPN_LIMIT) return {st:'failed',why:`page ${p} of ${pages} has ${d.items.length} items, not ${ESPN_LIMIT}`};
    items=items.concat(d.items); at=r.at;
  }
  return {st:'ok',items,at};
}
function espnRosterNames(body){ try{ for(const grp of (body&&body.athletes)||[]) for(const a of (grp&&grp.items)||[grp])
  if(a&&a.id&&(a.fullName||a.displayName)) ESPN_NAMES[String(a.id)]=String(a.fullName||a.displayName).trim(); }catch(e){} }
/* each athlete of a game's read on a player: by PAY.espn_ids, else by name within the game's two clubs.
   A name lands only on a player no ESPN id names (neither one in this read nor any other the map has:
   ARI's Mack Wilson Sr. shares surname and initial with Michael Wilson, whose own id the map holds) and
   no other athlete of the read claims: every exact name first (normName), then the looser one (nameKey),
   a player two athletes claim going to neither */
async function espnPlace(per,g,ev){
  /* (app v125) how each was placed (how, not enumerable: 'id', 'name' an exact name, 'nameKey' the looser one), which
     the props job's read records and its audit holds (V-ESPN) */
  const ids=PAY&&PAY.espn_ids&&typeof PAY.espn_ids==='object'?PAY.espn_ids:{}, placed={}, left=[], how={};
  Object.defineProperty(placed,'how',{value:how});
  for(const aid of Object.keys(per)){ const pid=ids[aid]; if(typeof pid==='string'&&pid){ placed[aid]=pid; how[aid]='id'; } else left.push(aid); }
  if(!left.length) return placed;
  const need=left.filter(a=>ESPN_NAMES[a]==null);
  if(need.length>ESPN_NAME_EACH){ const cl=espnClubs(ev);
    for(const s of ['away','home']) if(cl&&(cl[s].id||cl[s].esp)){ const r=await espnFetch(`${ESPN_TEAM}${encodeURIComponent(cl[s].id||cl[s].esp)}/roster`); if(r.status===200) espnRosterNames(r.body); } }
  else for(const aid of need){ const r=await espnFetch(`${ESPN_CORE}/seasons/${SEASON}/athletes/${aid}?lang=en&region=us`);
    if(r.status===200&&r.body){ const n=String(r.body.fullName||r.body.displayName||'').trim(); if(n) ESPN_NAMES[aid]=n; } }
  const taken=new Set([...Object.values(ids).filter(v=>typeof v==='string'&&v),...Object.values(placed)]);
  const pool=Object.values(S.players||{}).filter(p=>p&&(p.team===g.a||p.team===g.h)&&!taken.has(p.id));
  const gone=new Set();
  for(const rule of [normName,nameKey]){ const claims={};
    for(const aid of left){ const nm=ESPN_NAMES[aid]; if(!nm||placed[aid]||gone.has(aid)) continue;
      const k=rule(nm); if(!k) continue; const hit=pool.filter(p=>!taken.has(p.id)&&rule(p.n)===k);
      /* one match only: a name two players share places no one */
      if(hit.length===1) (claims[hit[0].id]||(claims[hit[0].id]=[])).push(aid);
      else if(hit.length>1) gone.add(aid); }
    /* a player two athletes claim goes to neither, and to no one after */
    for(const pid in claims){ taken.add(pid); if(claims[pid].length===1){ placed[claims[pid][0]]=pid; how[claims[pid][0]]=rule===normName?'name':'nameKey'; } else for(const aid of claims[pid]) gone.add(aid); } }
  return placed;
}
/* the read of one game as the page keeps it: {at, lines, rungs, td}, one ESPN athlete a player: the one
   PAY.espn_ids names him by, else the first by number */
function espnBlock(per,placed,at){
  const b={at:espnIso(at),lines:{},rungs:{},td:[]}, seen=new Set(), ids=PAY&&PAY.espn_ids&&typeof PAY.espn_ids==='object'?PAY.espn_ids:{};
  const byId=aid=>ids[aid]===placed[aid]?0:1;
  for(const aid of Object.keys(placed).sort((x,y)=>byId(x)-byId(y)||x-y)){ const pid=placed[aid], a=per[aid]; if(seen.has(pid)||!a) continue; seen.add(pid);
    if(Object.keys(a.lines).length) b.lines[pid]={...a.lines};
    if(Object.keys(a.rungs).length) b.rungs[pid]=JSON.parse(JSON.stringify(a.rungs));
    if(a.td) b.td.push(pid); }
  b.td.sort(); return b;
}
/* one game: its player lines, placed, unless its kickoff came first */
async function espnReadGame(r){
  const pr=await espnProps(r.eid);
  /* (app v125) a 'none' answered at or after the kickoff (its 404 dated there, or the page's clock past it) is no read
     before it: the game kicked off while it was being read, as an 'ok' that late is. The props job publishes nothing
     of a game's read dated at or after its kickoff, and its audit (V-ESPN) holds every 'none' it read published */
  if(pr.st==='none'&&Math.max(pr.at!=null?pr.at:Date.now(),Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  if(pr.st!=='ok') return pr;
  const t=()=>{ const at=pr.at!=null?pr.at:Date.now(); if(pr.at==null) ESPN_RUN.clock=true; return at; };
  if(Math.max(t(),Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  const {per,counts}=espnParseItems(pr.items), placed=await espnPlace(per,r.g,r.ev), at=t();
  if(Math.max(at,Date.now())>=r.ko) return {st:'kicked',why:'kicked off while it was being read'};
  const res={st:'ok',at,block:espnBlock(per,placed,at),counts:{...counts,athletes:Object.keys(per).length,placed:Object.keys(placed).length}};
  /* (app v125) each player of the block: the ESPN athlete whose lines it carries (espnBlock's own choice), ESPN's name
     for him and how he was placed; not enumerable, so nothing a press keeps carries it (espnReadWeek returns it) */
  Object.defineProperty(res,'placed',{value:espnWho(per,placed)});
  return res;
}
/* (app v125) who each player of a game's block is: {pid: {aid, name, how}}, in espnBlock's order (the athlete
   PAY.espn_ids names him by, else the first by number) */
function espnWho(per,placed){
  const ids=PAY&&PAY.espn_ids&&typeof PAY.espn_ids==='object'?PAY.espn_ids:{}, how=placed&&placed.how||{}, who={};
  const byId=aid=>ids[aid]===placed[aid]?0:1;
  for(const aid of Object.keys(placed).sort((x,y)=>byId(x)-byId(y)||x-y)){ const pid=placed[aid]; if(who[pid]||!per[aid]) continue;
    who[pid]={aid,name:typeof ESPN_NAMES[aid]==='string'?ESPN_NAMES[aid]:null,how:how[aid]||'id'}; }
  return who;
}
/* (app v125) the reader alone, for the press and for the props job (which calls it in jsdom, window.espnReadWeek):
   week w's scoreboard and the player lines of each of games (schedule rows of week w, still to come), read and
   placed, and nothing applied. Returns {sbAt: the scoreboard's time or null, out: {gid: {st 'ok'|'none'|'failed'|
   'kicked', why?, sb?: the scoreboard failed it, at?: the read's time (ok and none), block?, counts?}}, gl: {gid: {at,
   od: espnOdds's {lines, ids, event}}} in the scoreboard's order, pl: {gid: {at, block, counts, placed: {pid: {aid,
   name, how 'id'|'name'|'nameKey'}}}} for each 'ok'}.
   It touches nothing of the page's but ESPN_RUN's counters (requests, clock) and the ESPN_NAMES lookup cache: no
   ESPN_LIVE, ESPN_GL, ESPN_OUT, ESPN_IDAT, PAY, storage or redraw. onStep(done, total) where a game is done. Never
   throws: a failure is each game's 'failed' */
async function espnReadWeek(w,games,onStep){
  games=Array.isArray(games)?games:[];
  const out={}, gl={}, pl={}; let sbAt=null, done=0;
  const step=()=>{ try{ if(typeof onStep==='function') onStep(done,games.length); }catch(e){} };
  try{
    const sb=await espnFetch(`${ESPN_SB}?dates=${SEASON}&${espnWeekQ(w)}&_=${Date.now()}`);
    const evs=sb.status===200&&sb.body&&Array.isArray(sb.body.events)?sb.body.events:null;
    if(!evs){ for(const g of games) out[g.id]={st:'failed',sb:true,why:sb.why||'a scoreboard with no events'}; }
    else {
      sbAt=sb.at!=null?sb.at:Date.now(); if(sb.at==null) ESPN_RUN.clock=true;
      const byPair={}; for(const g of games) byPair[[g.a,g.h].sort().join('|')]=g;
      const reads=[];
      for(const ev of evs){ const cl=espnClubs(ev), g=cl&&byPair[[cl.home.ab,cl.away.ab].sort().join('|')];
        if(!g||reads.some(r=>r.g===g)||out[g.id]) continue;
        const k=kickoff(g), e=Date.parse(ev&&ev.date), ko=Math.min(k?k.getTime():Infinity,isFinite(e)?e:Infinity);
        if(Math.max(sbAt,Date.now())>=ko){ out[g.id]={st:'kicked',why:'kicked off before it was read'}; continue; }
        const od=espnOdds(ev,g); if(od) gl[g.id]={at:sbAt,od};
        reads.push({g,ev,ko,eid:String(ev.id||'')}); }
      for(const g of games) if(!out[g.id]&&!reads.some(r=>r.g===g)) out[g.id]={st:'failed',sb:true,why:'not on ESPN’s scoreboard'};
      done=games.length-reads.length; step();
      await espnPool(reads.map(r=>async()=>{
        let res; try{ res=/^\d+$/.test(r.eid)?await espnReadGame(r):{st:'failed',why:'no ESPN event id'}; }catch(e){ res={st:'failed',why:String(e&&e.message||e)}; }
        out[r.g.id]=res;
        if(res.st==='ok') pl[r.g.id]={at:res.at,block:res.block,counts:res.counts,placed:res.placed||{}};
        done++; step(); }),ESPN_POOL);
    }
  }catch(e){ console.error(e); for(const g of games) if(!out[g.id]) out[g.id]={st:'failed',sb:!gl[g.id],why:String(e&&e.message||e)}; }
  return {sbAt,out,gl,pl};
}
/* the press: gid, that game alone; none, every game of the week still to come. false where it does
   nothing (a read already running, or no game to read). (app v125) The read is espnReadWeek's; the press applies
   it: each game's lines (a fresh read, so over the published read's whatever its time says), in the scoreboard's
   order, then each block into ESPN_LIVE */
async function espnRefresh(gid){
  if(ESPN_RUN.busy||!S||!S.sched) return false;
  const one=gid?S.sched.find(x=>x.id===gid):null; if(gid&&!one) return false;
  const w=one?+one.w:currentWeek(), games=(one?[one]:gamesIn(w)).filter(g=>!gameStarted(g)&&!hasScore(g));
  if(!games.length){ espnPaint(); return false; }
  ESPN_RUN={busy:true,gid:gid||null,week:w,total:games.length,done:0,requests:0,clock:false};
  espnPaint();
  const out={}, gls={}; let changed=false;
  try{
    const r=await espnReadWeek(w,games,d=>{ ESPN_RUN.done=d; espnPaint(); });
    Object.assign(out,r.out);
    for(const id of Object.keys(r.gl)){ const g=games.find(x=>x.id===id); if(!g) continue;
      if(espnApplyGame(g,r.gl[id].od,r.gl[id].at,undefined,true)) changed=true; gls[id]=r.gl[id]; }
    for(const id of Object.keys(r.pl)){ (ESPN_LIVE[String(w)]||(ESPN_LIVE[String(w)]={}))[id]=r.pl[id].block; changed=true; }
  }catch(e){ console.error(e); for(const g of games) if(!out[g.id]) out[g.id]={st:'failed',sb:!ESPN_GL[g.id],why:String(e&&e.message||e)}; }
  finally{
    /* what each game's read found, as a press always kept it (a 'none' without the time the job reads) */
    const now=Date.now(); for(const id in out){ const o={...out[id],block:undefined,when:now}; if(o.st==='none') delete o.at; ESPN_OUT[id]=o; }
    /* (app v108) kept in this browser before the press is done */
    try{ espnKeepPut(w,games,gls); }catch(e){ console.error(e); }
    ESPN_RUN={...ESPN_RUN,busy:false,done:ESPN_RUN.total};
    if(changed) ESPN_SEQ++;
    espnRedraw();
  }
  return true;
}
/* S as save() writes it: the published game lines in place of any a press read */
function espnSavable(st){
  if(!st||!Array.isArray(st.sched)||!Object.keys(ESPN_GL).length) return st;
  return {...st,sched:st.sched.map(g=>{ const o=ESPN_GL[g&&g.id]; if(!o) return g; const c={...g};
    for(const k of ESPN_GL_KEYS){ if(o.orig[k]===undefined) delete c[k]; else c[k]=o.orig[k]; } return c; })};
}
/* ---------- (app v108) the read kept in this browser ----------
   ESPN_KEEP_KEY holds {v:1, season, saved, games:{gid:{w, gl, pl, plsig, out}}}:
   gl  what the load's reads did to the game's lines: lines, each of the eight fields a read set, as
       [value, the time of that read], the value null where a read dropped it (ESPN_GL's d); at, the
       latest read the lines stand on; every
       DraftKings id a read gave or found with the time it was read (ids, idat; glat where a read set it);
       the event the page uses; and sig, espnGlSig then;
   pl  the player lines' block as ESPN_LIVE keeps it; plsig, espnPlSig then; out, what the last read of
       the player lines found ('ok' or 'none' only: a failure is the press's moment, not the read's).
   A load puts each half back where it still stands (espnRestore): over the publish it was read over, or
   over a newer one where the read is later than that publish's own time for the half (each game-line
   field by its own read's time). Times are the browser's clock against the job's: a browser clock far
   off moves the line between them, as it does for a press itself (espnApplyGame). ESPN_ASIDE says,
   for that load, what gave way; ESPN_KEEP_GONE ({gl, pl}: the times of the halves this load set aside)
   keeps a write from bringing one back from another tab's copy. A time after the page's clock is not one
   the page wrote: that half is dropped */
const ESPN_KEEP_KEY='props_press_v1';
let ESPN_KEPT={}, ESPN_ASIDE={}, ESPN_KEEP_GONE={}, ESPN_KEEP_OFF=false;
const ESPN_KEEP_GID=/^\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/, ESPN_KEEP_ID=/^[A-Za-z0-9#_.\-]{1,160}$/, ESPN_KEEP_PID=/^(?!__proto__$)[A-Za-z0-9_.:\-]{1,40}$/;
const ESPN_KEEP_IDKEY=/^(team:[A-Z]{2,3}\|(ml|ats\|-?\d+(\.\d+)?)|game\|total\|(over|under)\|\d+(\.\d+)?)$/;
const ESPN_KEEP_STATS=new Set([...Object.values(ESPN_MAIN),...Object.values(ESPN_MILE)]);
const ESPN_KEEP_LINES=['mla','mlh','sp','spa','sph','tot','tov','tou'], ESPN_KEEP_PRICE=new Set(['spa','sph','tov','tou']);
const espnOwn=(x,k)=>!!x&&Object.prototype.hasOwnProperty.call(x,k);
function espnHash(s){ let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return h.toString(16); }
/* the game lines the page publishes for g (a press's own are kept aside in ESPN_GL) */
function espnGlSig(g){ const o=ESPN_GL[g.id]?ESPN_GL[g.id].orig:g; return espnHash(ESPN_GL_KEYS.map(k=>o[k]==null?'':String(o[k])).join('|')); }
/* g's published player prices: the paid pull's time for it and every main line the payload carries for it, and
   (app v125) the published read of its player lines, where the payload carries one for the game in its week (its
   pl.at, out.st and out.at: every new read of the job moves them). With none, the string is exactly app v120's */
function espnPlSig(g){
  const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, D=W&&W[g.id], M=PAY&&PAY.mkt&&typeof PAY.mkt==='object'?PAY.mkt[String(g.w)]:null, rows=[];
  if(M&&typeof M==='object') for(const pid of Object.keys(M).sort()){ const r=M[pid]; if(r&&typeof r==='object') for(const st of Object.keys(r).sort()){ const L=r[st]; if(L&&L.g===g.id) rows.push([pid,st,L.line,L.over,L.under].join(',')); } }
  const E=PAY&&PAY.espn&&typeof PAY.espn==='object'&&PAY.espn.v===1&&PAY.espn.games&&typeof PAY.espn.games==='object'?PAY.espn.games:null;
  const P=E&&espnOwn(E,g.id)&&E[g.id]&&typeof E[g.id]==='object'?E[g.id]:null;
  const pub=P&&String(P.w)===String(g.w)?'|espn:'+String(P.pl&&P.pl.at||'')+':'+String(P.out&&P.out.st||'')+':'+String(P.out&&P.out.at||''):'';
  return espnHash(String(D&&D.at||'')+'|'+rows.join(';')+pub);
}
const espnKeepNum=x=>typeof x==='number'&&isFinite(x);
/* a player's line or rung as ESPN lists them: on a half point, under 1000 (a number past that would never be
   DraftKings' and would hold a game page's ladder up) */
const espnKeepLine=x=>espnKeepNum(x)&&x>0&&x<=1000&&Number.isInteger(x*2);
/* one game's kept entry as the page writes it, or null: everything else in it dropped. (app v125) opt.published:
   the props job's read (espnPublished), on the same rules but for the 'late' guard: its times are ESPN's clock,
   and a browser running slow would otherwise drop the whole published read */
function espnKeptGame(e,opt){
  if(!e||typeof e!=='object'||Array.isArray(e)) return null;
  const w=String(e.w); if(!/^\d{1,2}$/.test(w)) return null;
  const o={w}, late=opt&&opt.published?Infinity:Date.now()+60e3, when=t=>espnKeepNum(t)&&t>0&&t<=late;
  const gl=e.gl;
  if(gl&&typeof gl==='object'&&when(gl.at)&&typeof gl.sig==='string'&&gl.lines&&typeof gl.lines==='object'){
    const lines={}, ids={}, idat={};
    for(const k of ESPN_KEEP_LINES){ const x=espnOwn(gl.lines,k)?gl.lines[k]:undefined;
      /* a read drops only a price (a number read without its prices): never a money line, spread or total */
      if(Array.isArray(x)&&x.length===2&&(x[0]===null?ESPN_KEEP_PRICE.has(k):espnKeepNum(x[0]))&&when(x[1])&&x[1]<=gl.at) lines[k]=[x[0],x[1]]; }
    if(gl.ids&&typeof gl.ids==='object') for(const k of Object.keys(gl.ids)) if(ESPN_KEEP_IDKEY.test(k)&&typeof gl.ids[k]==='string'&&ESPN_KEEP_ID.test(gl.ids[k])){
      ids[k]=gl.ids[k]; if(gl.idat&&typeof gl.idat==='object'&&when(gl.idat[k])) idat[k]=gl.idat[k]; }
    const event=typeof gl.event==='string'&&/^\d{1,15}$/.test(gl.event)?gl.event:null;
    const glat=typeof gl.glat==='string'&&when(Date.parse(gl.glat))?gl.glat:null;
    if(Object.keys(lines).length||Object.keys(ids).length||event) o.gl={at:gl.at,lines,ids,idat,glat,event,sig:gl.sig}; }
  const b=e.pl;
  if(b&&typeof b==='object'&&typeof b.at==='string'&&when(Date.parse(b.at))&&typeof e.plsig==='string'){
    const lines={}, rungs={}, td=[];
    if(b.lines&&typeof b.lines==='object') for(const pid of Object.keys(b.lines)){ const m=b.lines[pid]; if(!ESPN_KEEP_PID.test(pid)||!m||typeof m!=='object') continue;
      const s={}; for(const st of Object.keys(m)) if(ESPN_KEEP_STATS.has(st)&&espnKeepLine(m[st])) s[st]=m[st]; if(Object.keys(s).length) lines[pid]=s; }
    if(b.rungs&&typeof b.rungs==='object') for(const pid of Object.keys(b.rungs)){ const m=b.rungs[pid]; if(!ESPN_KEEP_PID.test(pid)||!m||typeof m!=='object') continue;
      const s={}; for(const st of Object.keys(m)) if(ESPN_KEEP_STATS.has(st)&&Array.isArray(m[st])){ const r=[...new Set(m[st].filter(espnKeepLine))].sort((x,y)=>x-y).slice(0,40); if(r.length) s[st]=r; }
      if(Object.keys(s).length) rungs[pid]=s; }
    if(Array.isArray(b.td)) for(const pid of b.td) if(typeof pid==='string'&&ESPN_KEEP_PID.test(pid)&&!td.includes(pid)) td.push(pid);
    o.pl={at:b.at,lines,rungs,td:td.sort()}; }
  if(typeof e.plsig==='string') o.plsig=e.plsig;
  const u=e.out;
  if(u&&typeof u==='object'&&(u.st==='ok'||u.st==='none')&&when(u.when)) o.out={st:u.st,why:typeof u.why==='string'?u.why.slice(0,200):'',sb:false,when:u.when};
  return o.gl||o.pl||(o.out&&o.out.st==='none'&&o.plsig)?o:null;
}
/* when each half was read: the game lines' read, and the player half's (its lines' read, or the last read
   of them that found none) */
const espnKeptGl=e=>e&&e.gl?e.gl.at:0;
const espnKeptPl=e=>e?Math.max(e.pl?Date.parse(e.pl.at)||0:0,e.out?e.out.when||0:0):0;
function espnKeptAt(e){ return Math.max(espnKeptGl(e),espnKeptPl(e)); }
function espnKeepParse(raw){
  let v=null; try{ v=JSON.parse(raw); }catch(e){ return null; }
  return v&&typeof v==='object'&&v.v===1&&v.season===SEASON&&v.games&&typeof v.games==='object'&&!Array.isArray(v.games)?v:null;
}
/* what stands, written over what the browser holds, half by half: each game's game lines from whichever
   side (this tab's, or the browser's copy another tab may have written) read them later (a half with
   nothing in it never wins), its player half with its plsig and what the read found the same (a later read
   that found no player lines keeping the lines the other read over the same publish, as one tab does). A
   game this tab has nothing of its own for, or one its schedule no longer offers, is the browser's copy
   carried as it stands (a tab open on an older publish never judges another tab's read by its own
   schedule: each load's restore prunes the copy on the publish it loads); a half this load set aside
   (ESPN_KEEP_GONE) is left out; an empty set empties the key. A write the browser refuses empties it too:
   the reads are then held in memory alone */
function espnKeepWrite(){
  if(ESPN_KEEP_OFF) return false;
  try{
    let cur=null; try{ cur=espnKeepParse(localStorage.getItem(ESPN_KEEP_KEY)); }catch(e){}
    const games={}, tg=x=>x&&x.gl&&(Object.keys(x.gl.lines).length||Object.keys(x.gl.ids).length)?x.gl.at:0;
    for(const gid of new Set([...Object.keys(ESPN_KEPT),...(cur?Object.keys(cur.games):[])])){
      if(!ESPN_KEEP_GID.test(gid)) continue;
      const gone=ESPN_KEEP_GONE[gid]||{}, g=((S&&S.sched)||[]).find(x=>x.id===gid), live=!!g&&!gameStarted(g)&&!hasScore(g);
      let c=cur&&espnOwn(cur.games,gid)?espnKeptGame(cur.games[gid]):null;
      const cG=c&&c.gl&&c.gl.at>(gone.gl||0)?c:null, cP=c&&(c.pl||c.out)&&espnKeptPl(c)>(gone.pl||0)?c:null;
      const mine=live&&ESPN_KEPT[gid]&&ESPN_KEPT[gid].w===String(g.w)?ESPN_KEPT[gid]:null;
      if(!mine){ if(!c) continue; const e={w:c.w}; if(cG) e.gl=c.gl; if(cP){ if(c.pl) e.pl=c.pl; if(c.out) e.out=c.out; }
        if(typeof c.plsig==='string') e.plsig=c.plsig; if(e.gl||e.pl||(e.out&&e.out.st==='none'&&e.plsig)) games[gid]=e; continue; }
      const w=String(g.w); if(c&&c.w!==w) c=null;
      const cG2=c?cG:null, cP2=c?cP:null;
      const e={w}, mG=mine&&mine.gl?mine:null, mP=mine&&(mine.pl||mine.out)?mine:null;
      const gs=cG2&&(!mG||tg(cG2)>tg(mG))?cG2:mG; if(gs) e.gl=gs.gl;
      const ps=cP2&&(!mP||espnKeptPl(cP2)>espnKeptPl(mP))?cP2:mP;
      if(ps){ if(typeof ps.plsig==='string') e.plsig=ps.plsig; if(ps.out) e.out=ps.out;
        /* the block: the later of the two sides' read over the same publish (a press that found none, or
           failed, keeps its tab's older block, which must not displace a newer one the other tab read) */
        const other=ps===mP?cP2:mP, bt=x=>x&&x.pl?Date.parse(x.pl.at)||0:0;
        const blk=other&&other.pl&&other.plsig===e.plsig&&bt(other)>bt(ps)?other:ps;
        if(blk.pl) e.pl=blk.pl; }
      else if(mine&&typeof mine.plsig==='string') e.plsig=mine.plsig;
      if(e.gl||e.pl||(e.out&&e.out.st==='none'&&e.plsig)) games[gid]=e; }
    if(!Object.keys(games).length){ localStorage.removeItem(ESPN_KEEP_KEY); return true; }
    localStorage.setItem(ESPN_KEEP_KEY,JSON.stringify({v:1,season:SEASON,saved:Date.now(),games}));
    return true;
  }catch(e){ try{ localStorage.removeItem(ESPN_KEEP_KEY); }catch(e2){} return false; }
}
/* a press's games and what it read for each (gls: the scoreboard's odds by game, with their time). The game
   half is what the load's reads did to the game's lines (ESPN_GL's d: a read the page left off, older than
   the published lines, did nothing) and every id a read gave or found, with the time it was read */
function espnKeepPut(w,games,gls){
  for(const g of games){
    const prev=ESPN_KEPT[g.id], e=prev&&prev.w===String(w)?{...prev}:{w:String(w)}, o=ESPN_OUT[g.id], r=gls[g.id];
    if(r){ const G=ESPN_GL[g.id], T=ESPN_IDAT[g.id]||{}, W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[String(g.w)]:null, D=(W&&W[g.id])||{};
      const ids={}, idat={}; for(const k of Object.keys(T)) if(typeof D[k]==='string'&&espnKeepNum(T[k])){ ids[k]=D[k]; idat[k]=T[k]; }
      e.gl={at:G?G.at:r.at,lines:G&&G.d?{...G.d}:{},ids,idat,glat:typeof D.glat==='string'?D.glat:null,event:typeof D.event==='string'?D.event:null,sig:espnGlSig(g)}; }
    const b=o&&o.st==='ok'?(ESPN_LIVE[String(w)]||{})[g.id]:null;
    if(b) e.pl=b;
    if(o&&(o.st==='ok'||o.st==='none')){ e.out={st:o.st,why:o.why||'',sb:false,when:o.when||0}; e.plsig=espnPlSig(g); }
    if(e.gl||e.pl||(e.out&&e.out.st==='none')){ if(typeof e.plsig!=='string') e.plsig=espnPlSig(g); ESPN_KEPT[g.id]=e; delete ESPN_ASIDE[g.id]; }
  }
  return espnKeepWrite();
}
/* no room for the visitor's own state: the kept read gives way, for the rest of this load */
function espnKeepDrop(){
  try{ if(localStorage.getItem(ESPN_KEEP_KEY)==null) return false; localStorage.removeItem(ESPN_KEEP_KEY); ESPN_KEEP_OFF=true; return true; }catch(e){ return false; }
}
/* a kept read's game lines put back as its reads left them, where the read is newer than the page's lines
   (since). Over the publish it was read over (same), literally: each field a read set, set, each it dropped
   (a number read without its prices), dropped, which is exactly what the page showed. Over a newer one,
   only the fields read after it (each by its own read's time, so an older read's field never outranks the
   newer publish), as a read would put them: a number with its prices, or without them keeping the page's
   prices only where the page has that same number */
function espnKeepLines(g,gl,since,same){
  const d={}; for(const k of ESPN_KEEP_LINES) if(espnOwn(gl.lines,k)&&(same||gl.lines[k][1]>since)) d[k]=gl.lines[k];
  const has=k=>espnOwn(d,k), on=Object.keys(d);
  if(!on.length||!(gl.at>(ESPN_GL[g.id]?ESPN_GL[g.id].at:since))) return false;
  if(!ESPN_GL[g.id]) ESPN_GL[g.id]={orig:Object.fromEntries(ESPN_GL_KEYS.map(k=>[k,g[k]])),at:0,d:{}};
  let t=0; const D=ESPN_GL[g.id].d||(ESPN_GL[g.id].d={}), put=(k,x)=>{ D[k]=x; if(x[1]>t) t=x[1]; if(x[0]===null){ if(g[k]!==undefined) delete g[k]; } else g[k]=x[0]; };
  if(same) for(const k of on) put(k,d[k]);
  else {
    for(const k of ['mla','mlh']) if(has(k)&&d[k][0]!==null) put(k,d[k]);
    for(const [n,a,b] of [['sp','spa','sph'],['tot','tov','tou']]){ if(!has(n)||d[n][0]===null) continue;
      const priced=has(a)&&has(b)&&d[a][0]!==null&&d[b][0]!==null;
      if(priced){ put(a,d[a]); put(b,d[b]); } else if(g[n]!==d[n][0]) for(const x of [a,b]) put(x,[null,d[n][1]]);
      put(n,d[n]); } }
  if(!t){ if(!ESPN_GL[g.id].at) delete ESPN_GL[g.id]; return false; }
  g.ls='dk'; g.lat=espnIso(t); ESPN_GL[g.id].at=Math.max(ESPN_GL[g.id].at,t); return true;
}
/* a kept read's DraftKings ids and event put back as its reads put them: beside the paid pull's, never
   replacing one, each dated by the read that gave or found it */
function espnKeepIds(g,gl){
  if(!gl.event&&!Object.keys(gl.ids).length) return;
  const D=PAY.dk&&typeof PAY.dk==='object'?PAY.dk:(PAY.dk=dkPressMade({})), W=D[String(g.w)]||(D[String(g.w)]={}), E=W[g.id]||(W[g.id]={}), T=ESPN_IDAT[g.id]||(ESPN_IDAT[g.id]={});
  if(gl.event&&!E.event) E.event=gl.event;
  for(const k of Object.keys(gl.ids)){ if(E[k]==null) E[k]=gl.ids[k]; if(E[k]===gl.ids[k]) T[k]=gl.idat[k]||gl.at; }
  if(Object.keys(T).length&&!isFinite(Date.parse(E.glat))) E.glat=gl.glat||espnIso(Math.min(...Object.values(T)));
}
/* the kept read put back on a load, before the page is drawn and with no request. Each half stands over
   the publish it was read over, or over a newer one where the read is later than that publish's own time
   for it: the DraftKings lines it carries (g.lat: the props job's read of ESPN since app v125, or a paid pull's),
   else the bake; for the game's player prices the later of the published read's (app v125: its pl.at or out.at)
   and the paid pull's (PAY.dk's at), else the bake. So a newer publish always wins, and a read made after it, in a
   tab loaded before it, stands. Neither half for a game kicked off, scored, in another week or not
   on this publish (pruned from the copy here). What gave way is noted (ESPN_ASIDE) and what stands
   written back. Nothing is touched with no schedule to stand on. The number of games put back */
function espnRestore(){
  let raw=null; try{ raw=localStorage.getItem(ESPN_KEEP_KEY); }catch(e){ return 0; }
  if(raw==null||!S||!Array.isArray(S.sched)||!S.sched.length) return 0;
  const v=espnKeepParse(raw);
  if(!v){ try{ localStorage.removeItem(ESPN_KEEP_KEY); }catch(e){} return 0; }
  let n=0; const bk=Date.parse((PAY&&PAY.baked_at)||'')||0;
  for(const gid of Object.keys(v.games)){
    if(!ESPN_KEEP_GID.test(gid)) continue;
    const e=espnKeptGame(v.games[gid]), g=S.sched.find(x=>x.id===gid); if(!e) continue;
    const at={gl:espnKeptGl(e),pl:espnKeptPl(e)};
    const gone=h=>{ const G=ESPN_KEEP_GONE[gid]||(ESPN_KEEP_GONE[gid]={}); G[h]=Math.max(G[h]||0,at[h]); };
    if(!g||String(g.w)!==e.w||gameStarted(g)||hasScore(g)){ gone('gl'); gone('pl'); continue; }
    const k={w:e.w}, aside=h=>{ (ESPN_ASIDE[gid]||(ESPN_ASIDE[gid]={}))[h]=at[h]; gone(h); };
    if(e.gl){ const sig=espnGlSig(g), same=e.gl.sig===sig, lat=g.ls==='dk'?Date.parse(g.lat||''):NaN, since=isFinite(lat)?lat:(same?0:bk);
      if(same||e.gl.at>since){ const on=espnKeepLines(g,e.gl,since,same); espnKeepIds(g,e.gl); k.gl={...e.gl,lines:on?{...ESPN_GL[g.id].d}:{},at:on?ESPN_GL[g.id].at:e.gl.at,sig}; }
      else aside('gl'); }
    /* (app v125) the publish's own time for the player half: the later of the published read's (where it read the
       game's player lines) and the paid pull's, so a newer publish of either kind sets an older read aside */
    const W=PAY&&PAY.dk&&typeof PAY.dk==='object'?PAY.dk[e.w]:null, Pb=espnPubOf(gid,e.w), pbT=Pb?Math.max(Pb.at||0,Pb.st?Pb.when||0:0):0;
    const pubP=Math.max(pbT,Date.parse((W&&W[gid]&&W[gid].at)||'')||0)||bk;
    const plSame=e.plsig===espnPlSig(g), plOk=t=>plSame||t>pubP;
    if(e.pl){ if(plOk(Date.parse(e.pl.at))){ (ESPN_LIVE[e.w]||(ESPN_LIVE[e.w]={}))[gid]=e.pl; k.pl=e.pl; } else aside('pl'); }
    /* what the read found goes back with the half it describes: 'ok' only with its player lines */
    /* a read that found none says so for a day at most: DraftKings posts a game's player lines in the week */
    if(e.out){ const fresh=e.out.st==='ok'?!!k.pl:Date.now()-e.out.when<DK_EST.staleHours*3600e3;
      if(plOk(e.out.when)&&fresh){ ESPN_OUT[gid]=e.out; k.out=e.out; }
      else if(!e.pl&&!plOk(e.out.when)) aside('pl');
      else gone('pl'); }
    if(!k.gl&&!k.pl&&!k.out) continue;
    if(k.pl||k.out) k.plsig=espnPlSig(g);
    ESPN_KEPT[gid]=k; n++;
  }
  espnKeepWrite();
  if(n) ESPN_SEQ++;
  return n;
}
/* ---------- (app v125) the published read: the props job's own read of ESPN, installed at boot ----------
   PAY.espn = {v:1, read_at, games:{gid:{w, gl:{at, lines, ids, event}, pl:{at, lines, rungs, td}, out:{st, at}}}},
   written by the props job (weekly.py's apply_espn, from props/build/espn_read.js, which runs espnReadWeek in jsdom),
   with each game's lines already in PAY.sched (ls 'dk', lat, lsr 'espn'). For each game still to come of its week,
   every time before its kickoff: the player block, cleaned by the kept read's rules with no 'late' guard, into
   ESPN_LIVE (unless a press or a kept read put a block of its own there: never replaced), recorded in ESPN_PUB; the
   game-line ids and event into PAY.dk beside any there, never replacing one, in an entry that never carries the
   pull's ids (dkCarries reads the content), dated in ESPN_PUB_IDS. Nothing into ESPN_GL, ESPN_OUT, ESPN_IDAT, the
   kept read, storage or S. Idempotent, and called again by the checks after they change PAY.espn: a block it put
   in before and no longer publishes comes out, with the ids it added; a table a check put in place of PAY.dk is
   the check's own (the ids go only into the table it first merged into). A payload with no read, or one not of
   this shape, installs nothing and throws nothing. The number of games installed */
function espnPubOf(gid,w){ const W=ESPN_PUB[String(w)]; return W&&espnOwn(W,gid)?W[gid]:null; }
/* a block a press or a kept read put in ESPN_LIVE, as against the published one */
function espnPressed(gid,w){ const b=(ESPN_LIVE[String(w)]||{})[gid], P=espnPubOf(gid,w); return !!b&&!(P&&P.block===b); }
/* a game's player lines read (a press, a kept read, or the published read found 'ok' or 'none'); a published
   read of its game lines alone is no player read */
function espnWasRead(gid,w){ const o=ESPN_OUT[gid]; if(o&&(o.st==='ok'||o.st==='none')) return true;
  const g=w==null?((S&&S.sched)||[]).find(x=>x.id===gid):null, P=espnPubOf(gid,w!=null?w:(g?g.w:currentWeek()));
  return !!P&&(P.st==='ok'||P.st==='none'); }
/* the latest player read of any of these games (ms), or null */
function espnLastRead(ids,w){ let t=0;
  for(const id of ids||[]){ const o=ESPN_OUT[id]; if(o&&(o.st==='ok'||o.st==='none')&&isFinite(o.when)&&o.when>t) t=o.when;
    const g=w==null?((S&&S.sched)||[]).find(x=>x.id===id):null, P=espnPubOf(id,w!=null?w:(g?g.w:currentWeek()));
    if(P&&(P.st==='ok'||P.st==='none')&&isFinite(P.when)&&P.when>t) t=P.when; }
  return t||null; }
function espnPublished(){
  const E=PAY&&typeof PAY==='object'?PAY.espn:null;
  const games=E&&typeof E==='object'&&!Array.isArray(E)&&E.v===1&&E.games&&typeof E.games==='object'&&!Array.isArray(E.games)?E.games:{};
  const old=ESPN_PUB, oldAdded=ESPN_PUB_ADDED; let n=0, ch=false;
  ESPN_PUB={}; ESPN_PUB_IDS={}; ESPN_PUB_ADDED={};
  const sched=S&&Array.isArray(S.sched)?S.sched:[];
  /* the table the read's ids go into: the one it first merged into, or (the first time) the payload's own */
  if(!ESPN_PUB_DK&&Object.keys(games).length){ if(!(PAY.dk&&typeof PAY.dk==='object')) PAY.dk=dkPressMade({}); ESPN_PUB_DK=PAY.dk; }
  const ourDk=!!ESPN_PUB_DK&&PAY.dk===ESPN_PUB_DK;
  for(const gid of Object.keys(games)){
    if(!ESPN_KEEP_GID.test(gid)) continue;
    const e=games[gid]; if(!e||typeof e!=='object'||Array.isArray(e)) continue;
    const g=sched.find(x=>x.id===gid); if(!g||String(g.w)!==String(e.w)||gameStarted(g)||hasScore(g)) continue;
    const k=kickoff(g), ko=k?k.getTime():NaN; if(!isFinite(ko)) continue;
    const w=String(g.w), T=x=>{ const t=typeof x==='string'?Date.parse(x):NaN; return isFinite(t)&&t>0&&t<ko?t:null; };
    let block=null, at=null;
    if(e.pl&&typeof e.pl==='object'){ const c=espnKeptGame({w,pl:e.pl,plsig:''},{published:true}), t=c&&c.pl?T(c.pl.at):null; if(t!=null){ block=c.pl; at=t; } }
    const u=e.out&&typeof e.out==='object'?e.out:null, ut=u?T(u.at):null, st=u&&(u.st==='ok'||u.st==='none')&&ut!=null?u.st:null;
    let gl=null;
    if(e.gl&&typeof e.gl==='object'){ const t=T(e.gl.at);
      if(t!=null){ const ids={}; if(e.gl.ids&&typeof e.gl.ids==='object') for(const key of Object.keys(e.gl.ids)) if(ESPN_KEEP_IDKEY.test(key)&&typeof e.gl.ids[key]==='string'&&ESPN_KEEP_ID.test(e.gl.ids[key])) ids[key]=e.gl.ids[key];
        gl={at:t,ids,event:typeof e.gl.event==='string'&&/^\d{1,15}$/.test(e.gl.event)?e.gl.event:null}; } }
    if(!block&&!st&&!gl) continue;
    /* the same block as before is the same object, so a second call moves nothing */
    const was=old[w]&&espnOwn(old[w],gid)?old[w][gid]:null;
    if(block&&was&&was.block&&JSON.stringify(was.block)===JSON.stringify(block)) block=was.block;
    (ESPN_PUB[w]||(ESPN_PUB[w]={}))[gid]={at,st,when:st?ut:null,block,gl};
    /* the block ESPN_LIVE holds is the one published before where it is that object or a copy of it (a check that keeps
       and puts back the page's state copies it); a press's or a kept read's carries its own read's time, so never is */
    const L=ESPN_LIVE[w]||(ESPN_LIVE[w]={}), cur=espnOwn(L,gid)?L[gid]:null, wasPub=c=>!!c&&!!was&&!!was.block&&(c===was.block||JSON.stringify(c)===JSON.stringify(was.block));
    if(block){ if(!cur||wasPub(cur)){ if(cur!==block){ L[gid]=block; ch=true; } } }
    else if(wasPub(cur)){ delete L[gid]; ch=true; }
    if(gl&&ourDk&&(gl.event||Object.keys(gl.ids).length)){
      const D=PAY.dk, WW=D[w]&&typeof D[w]==='object'?D[w]:(D[w]={}), made=!espnOwn(WW,gid), Ent=made?(WW[gid]=dkPressMade({})):WW[gid];
      const A=ESPN_PUB_ADDED[gid]={w,keys:[],event:false,glat:false,made:made||!!(oldAdded[gid]&&oldAdded[gid].made)}, I=ESPN_PUB_IDS[gid]={};
      const oa=oldAdded[gid]||{keys:[]};
      if(gl.event&&!Ent.event){ Ent.event=gl.event; A.event=true; ch=true; } else if(gl.event&&Ent.event===gl.event&&oa.event) A.event=true;
      for(const key of Object.keys(gl.ids)){ if(Ent[key]==null){ Ent[key]=gl.ids[key]; A.keys.push(key); ch=true; } else if(Ent[key]===gl.ids[key]&&oa.keys.includes(key)) A.keys.push(key);
        if(Ent[key]===gl.ids[key]) I[key]={id:gl.ids[key],at:gl.at}; }
      if(Object.keys(I).length&&!isFinite(Date.parse(Ent.glat))){ Ent.glat=espnIso(gl.at); A.glat=true; ch=true; } else if(oa.glat) A.glat=true; }
    n++;
  }
  /* blocks and ids published before and no longer: taken back out where nothing else has put its own in their place */
  for(const w of Object.keys(old)) for(const gid of Object.keys(old[w])){
    if(ESPN_PUB[w]&&espnOwn(ESPN_PUB[w],gid)) continue;
    const was=old[w][gid], L=ESPN_LIVE[w], c=L&&espnOwn(L,gid)?L[gid]:null;
    if(was&&was.block&&c&&(c===was.block||JSON.stringify(c)===JSON.stringify(was.block))){ delete L[gid]; ch=true; } }
  if(ourDk) for(const gid of Object.keys(oldAdded)){
    if(ESPN_PUB_ADDED[gid]) continue;
    const A=oldAdded[gid], WW=PAY.dk[A.w], Ent=WW&&WW[gid], P=old[A.w]&&old[A.w][gid], G=P&&P.gl; if(!Ent||!G) continue;
    const pressed=ESPN_IDAT[gid]||{};
    for(const key of A.keys) if(Ent[key]===G.ids[key]&&!pressed[key]){ delete Ent[key]; ch=true; }
    if(A.event&&Ent.event===G.event&&!Object.keys(pressed).length){ delete Ent.event; ch=true; }
    if(A.glat&&!Object.keys(Ent).some(key=>/^(team:|game\|)/.test(key))){ delete Ent.glat; ch=true; }
    if(A.made&&!Object.keys(Ent).length){ delete WW[gid]; ch=true; } }
  if(ch) ESPN_SEQ++;
  return n;
}
window.espnPublished=espnPublished;
window.espnReadWeek=espnReadWeek;
/* any read for a week's games (or this week's), and the latest read time (ms) */
function espnOn(week){ const W=ESPN_LIVE[String(week==null?currentWeek():week)]; return !!W&&Object.keys(W).length>0; }
function espnAny(){ return Object.values(ESPN_LIVE).some(W=>W&&Object.keys(W).length>0); }
function espnLatest(week){ let t=0; for(const [w,W] of Object.entries(ESPN_LIVE)) if(week==null||String(week)===w) for(const e of Object.values(W||{})){ const a=Date.parse(e&&e.at); if(a>t) t=a; } return t||null; }
/* a game's read, or null: none, not the shape the reader writes, or read at or after its kickoff */
function espnGame(gid,week){
  try{
    const W=ESPN_LIVE[String(week)], e=W&&W[gid];
    if(!e||typeof e!=='object'||!e.lines||typeof e.lines!=='object'||Array.isArray(e.lines)) return null;
    const g=((S&&S.sched)||[]).find(x=>x.id===gid), k=g&&kickoff(g), at=Date.parse(e.at);
    if(!k||!isFinite(at)||at>=k.getTime()) return null;
    return e;
  }catch(err){ return null; }
}
/* when a read was, as the page says it: "Thu 11:08 PM ET", or the time alone within half a day */
function espnWhen(at){ const t=typeof at==='number'?at:Date.parse(at); if(!isFinite(t)) return 'at a time not recorded';
  return new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit'})+' ET'; }
function espnClock(t){ if(!isFinite(t)||!t) return 'at a time not recorded'; if(Math.abs(Date.now()-t)>12*3600e3) return espnWhen(t);
  return new Date(t).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET'; }
/* the status line beside a button: the published prices before a press, the read's progress during
   one, and after it what it read (gid, that game's; none, the week's games still to come) */
function espnStatus(gid){
  const R=ESPN_RUN;
  if(R.busy) return `Reading DraftKings’ lines from ESPN… ${R.done} of ${R.total} game${R.total===1?'':'s'}`;
  const g1=gid&&S&&S.sched?S.sched.find(x=>x.id===gid):null, w=String(g1?g1.w:currentWeek()), ids=gid?[gid]:pbGames().map(g=>g.id);
  /* (app v125) read and asked count a press's blocks (and a kept read's), never the published read's */
  const live=ESPN_LIVE[w]||{}, read=ids.filter(id=>espnPressed(id,w)), lined=ids.filter(id=>ESPN_GL[id]);
  /* the published prices: the props job's read of DraftKings' lines on ESPN where the payload carries one for these
     games, the latest read of their player lines (a block's time, or what the read found: 'ok' or 'none'), and the games
     it found no player lines posted for (and none shown); else the publish. A read of a game's lines alone dates
     nothing here: no player price is estimated from it, and a week whose every player read failed while the scoreboard
     answered reads as the publish */
  const pubs=ids.map(id=>espnPubOf(id,w)).filter(Boolean), tPub=Math.max(0,...pubs.map(P=>Math.max(P.at||0,P.when||0)));
  const pubNone=ids.filter(id=>{ const P=espnPubOf(id,w); return !!P&&P.st==='none'&&!live[id]; }).length;
  const when=PAY&&PAY.baked_at?' '+espnWhen(PAY.baked_at):'';
  /* (app v130) each part its state alone, joined by " · " (the owner's call of 22 October 2026: "i dont want any
     descriptions anywhere"); a full stop at the end, never a second one after "est." */
  const pub=pubs.length&&tPub?`DraftKings via ESPN, ${espnWhen(tPub)} · player prices est.`
    +(pubNone?(gid?' · no player lines yet':` · ${pubNone} game${pubNone===1?'':'s'} with no player lines yet`):'')
    :`Prices as published${when}`, fin=s=>/\.$/.test(s)?s:s+'.';
  /* (app v108) a read this browser kept that gave way wholly, on this load, to prices published since */
  const gave=ids.filter(id=>ESPN_ASIDE[id]&&!espnPressed(id,w)&&!ESPN_GL[id]).length, gaveS=gave?(gid?'newer prices published since your read'
    :`newer prices published since your read of ${gave} game${gave===1?'':'s'}`):'';
  if(!ids.some(id=>ESPN_OUT[id])&&!read.length&&!lined.length) return fin(pub+(gaveS?' · '+gaveS:''));
  const t=Math.max(0,...read.map(id=>Date.parse(live[id].at)),...lined.map(id=>ESPN_GL[id].at));
  /* games of the week no press has asked about (a game's page reads that game alone) */
  const asked=ids.filter(id=>ESPN_OUT[id]||espnPressed(id,w)||ESPN_GL[id]), nm=id=>{ const g=S.sched.find(x=>x.id===id); return g?`${g.a} at ${g.h}`:id; };
  const of=!gid&&asked.length<ids.length?` for ${asked.length} of ${ids.length} games${asked.length<=3?' ('+asked.map(nm).join(', ')+')':''}`:'';
  const parts=[read.length?`DraftKings via ESPN${of}, read ${espnClock(t)} · player prices est.`
    :(lined.length?`DraftKings game lines via ESPN${of}, read ${espnClock(t)}`:pub)];
  /* a game whose scoreboard answered had its game lines read: what failed after was its player lines */
  const out=id=>ESPN_OUT[id]||{}, none=ids.filter(id=>!live[id]&&out(id).st==='none').length;
  const failP=ids.filter(id=>out(id).st==='failed'&&!out(id).sb), failS=ids.filter(id=>out(id).st==='failed'&&out(id).sb);
  if(none) parts.push(gid?'no player lines yet':`${none} game${none===1?'':'s'} with no player lines yet`);
  if(failP.length){ const n=failP.length; parts.push(gid?'couldn’t read player lines':`couldn’t read player lines for ${n} game${n===1?'':'s'}`); }
  if(failS.length){ const n=failS.length; parts.push(gid?'couldn’t reach ESPN':`couldn’t reach ESPN for ${n} game${n===1?'':'s'}`); }
  if(gaveS) parts.push(gaveS);
  const s=fin(parts.join(' · ')); return s[0].toUpperCase()+s.slice(1);
}
/* the status lines and buttons on the screen, in place (a read in progress redraws nothing else) */
function espnPaint(){ try{
  document.querySelectorAll('[data-espn-status]').forEach(el=>{ const k=el.dataset.espnStatus; el.textContent=espnStatus(k==='week'?null:k); });
  document.querySelectorAll('[data-espn-refresh]').forEach(b=>b.setAttribute('aria-busy',ESPN_RUN.busy?'true':'false'));
}catch(e){} }
/* the button and its status line: gid a game's page, none the week; where says which, for its id */
function espnCtl(gid,where){
  const k=gid||'week', id='espnSt-'+where, what=gid?'this game':'every game of the week still to come';
  return `<div class="espn-ctl" data-espn-ctl="${esc(k)}"><button type="button" class="btn quiet espn-btn" data-espn-refresh="${esc(k)}" aria-describedby="${id}" aria-busy="${ESPN_RUN.busy?'true':'false'}" title="Read DraftKings’ current lines for ${what} from ESPN now: free, in this browser, only when pressed, and kept in this browser until the game kicks off or newer prices are published. The game lines come with DraftKings’ own prices; a player’s price is our estimate from his line.">Refresh odds</button><span class="espn-st" id="${id}" data-espn-status="${esc(k)}" role="status" aria-live="polite">${esc(espnStatus(gid))}</span></div>`;
}
/* after a press: every cache a price stands on dropped, the page drawn again, the focus kept */
function espnRedraw(){
  const a=document.activeElement, fk=a&&a.dataset?a.dataset.espnRefresh:null;
  /* (app v111) the button pressed is found again wherever it was: a game's page, the Parlay Builder's
     controls or its builder, Suggested Parlays, the Props tab */
  const where=fk&&a.closest?(['#gameView','#pbPanel','#parlayBody','#spPanel','#slateOdds'].find(s=>a.closest(s))||null):null;
  PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={};
  try{ renderSlate(); }catch(e){ console.error(e); }
  try{ renderParlay(); }catch(e){ console.error(e); }
  espnPaint();
  if(where){ const b=document.querySelector(`${where} [data-espn-refresh="${fk}"]`); try{ if(b) b.focus({preventScroll:true}); }catch(e){} }
}
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('[data-espn-refresh]'):null; if(!b) return;
  e.preventDefault(); const k=b.dataset.espnRefresh; espnRefresh(k==='week'?null:k); });
const espnLineOf=(e,pid,stat)=>{ const v=e&&e.lines&&e.lines[pid]&&e.lines[pid][stat]; return typeof v==='number'&&isFinite(v)&&v>0?v:null; };
const espnListed=(e,pid,stat,k)=>{ const r=e&&e.rungs&&e.rungs[pid]&&e.rungs[pid][stat]; return Array.isArray(r)&&r.some(v=>+v===+k); };
const espnOffersTd=(e,pid)=>!!e&&Array.isArray(e.td)&&e.td.includes(pid);
function espnTeamOf(pid){ const p=S.players&&S.players[pid]; if(p&&p.team) return p.team; const r=PAY.roster&&PAY.roster[pid]; return (r&&r[0])||null; }
/* a club's lines are complete: the read within 36 hours of kickoff, with 4 receiving lines for the club
   (on a Wednesday night ESPN had about 60% of the receivers it carries by kickoff, and "no line" read
   as "a backup" then would price a WR3 at +1000 where DraftKings has him at +400) */
function espnComplete(e,g,team){
  const k=kickoff(g), at=Date.parse(e.at);
  if(!k||!isFinite(at)||k.getTime()-at>DK_EST.complete.hours*3600e3) return false;
  let n=0; for(const pid in e.lines) if(espnTeamOf(pid)===team&&espnLineOf(e,pid,'receiving_yards')!=null) n++;
  return n>=DK_EST.complete.rec;
}
/* a charted starter (QB1, RB1, WR1-2, TE1): with no yards line he is a line not posted, not a backup */
function espnStarter(pl,team){ const d=depthOf(pl), top={QB:1,RB:1,WR:2,TE:1}[pl.grp]; return !!(d&&top&&d.team===team&&d.pos===pl.grp&&d.rank<=top); }
/* the formula's price for one leg of a player (x: rosterFor's {pl, team, opp, ctx}) in game g from
   DraftKings' line read on ESPN: {price, fair, src:'dkline', tested, listed, line, at, how, mainOver},
   or null where the read has no line for it. kind 'main' (side over or under), 'rung' (k+), 'td'. Its
   inputs are the page's own: the model's raw projections (never marketMu or the market's scale), the
   game's implied points (gameCtx) and the depth chart */
function espnPrice(x,g,stat,kind,k,side){
  if(!x||!x.pl||!g) return null;
  const e=espnGame(g.id,g.w); if(!e) return null;
  const pid=x.pl.id, grp=x.pl.grp, T=x.ctx&&isFinite(x.ctx.implied)?x.ctx.implied:null;
  const mu=s=>{ try{ const r=project(x.pl,s,x.opp,x.ctx); return r&&r.mu!=null&&isFinite(r.mu)?r.mu:null; }catch(err){ return null; } };
  if(kind==='td'){
    if(stat!=='any_td'||(+k||1)!==1||!espnOffersTd(e,pid)) return null;
    let p=null; try{ const r=project(x.pl,'any_td',x.opp,x.ctx); p=r?r.p:null; }catch(err){}
    const r=estPrice({kind:'td',p,grp,rushLine:espnLineOf(e,pid,'rushing_yards'),recLine:espnLineOf(e,pid,'receiving_yards'),teamImplied:T,gameLined:espnComplete(e,g,x.team),starter:espnStarter(x.pl,x.team)});
    if(!r||!fairPx(r.price)) return null;
    const ov=fairVig(g.w).player||DK_EST.tdVig;
    return {price:r.price,fair:Math.max(0.001,Math.min(0.999,mlProb(r.price)/ov)),src:'dkline',tested:true,listed:true,line:null,at:e.at,how:r.how,mainOver:false};
  }
  const L=espnLineOf(e,pid,stat); if(L==null) return null;
  const leg={kind,stat,line:L,k,side,grp,recYdsLine:espnLineOf(e,pid,'receiving_yards'),passYdsLine:espnLineOf(e,pid,'passing_yards'),teamImplied:T};
  if(stat==='receptions'){ leg.muRec=mu('receptions'); leg.muRecYds=mu('receiving_yards'); }
  if(stat==='passing_interceptions'||stat==='fg_made') leg.mu=mu(stat);
  if(kind==='rung'){ const M=marketLine(g.w,pid,stat); if(M&&+M.line===L&&fairPx(M.over)&&fairPx(M.under)){ leg.mainFair=devigOver(M.over,M.under);
    /* (app v117) on a count, the rung that is the main Over itself (k-0.5 on the line), where the other rungs stand
       on the paid pull's price at this line: that price, DraftKings' own for the same bet, so the ladder has one
       anchor and never climbs (Jordan Love's passing TDs, 18 October 2026: 2+ at 34.6% on the formula's main
       price, 3+ at 35.5% on the pull's) */
    if(!DK_YARDS.has(stat)&&Math.abs(+k-0.5-L)<1e-9) return {price:M.over,fair:leg.mainFair,src:'dkline',tested:ESPN_TESTED.main.has(stat),listed:true,line:L,at:e.at,how:'the main line, DraftKings’ own price',mainOver:true}; } }
  const r=estPrice(leg); if(!r||!fairPx(r.price)) return null;
  const mainOver=kind==='rung'&&Math.abs(+k-0.5-L)<1e-9;
  return {price:r.price,fair:r.fair,src:'dkline',tested:(kind==='main'||mainOver?ESPN_TESTED.main:ESPN_TESTED.rung).has(stat),
    listed:kind==='main'||mainOver||espnListed(e,pid,stat,k),line:L,at:e.at,how:r.how,mainOver};
}
/* what a dkline leg carries with it: its fair chance (legFair), when its line was read, and whether
   it is of a tested kind and DraftKings lists it */
const espnOf=d=>({fair:d.fair,at:d.at,tested:!!d.tested,listed:!!d.listed,line:d.line});
/* a player's main line by the precedence above: the paid pull's (real) while it is still DraftKings'
   line, that is while the read has the same number or none for him; the read's where it differs or the
   pull has none, both sides at the formula's price (dkline, with was: the pull's number it replaces) */
function mainOf(x,g,stat){
  const L=marketLine(g.w,x.pl.id,stat), e=espnGame(g.id,g.w), E=e?espnLineOf(e,x.pl.id,stat):null;
  if(L&&(E==null||+L.line===E)) return {src:'real',L,line:L.line};
  const dO=E!=null?espnPrice(x,g,stat,'main',null,'over'):null, dU=dO?espnPrice(x,g,stat,'main',null,'under'):null;
  if(dO&&dU) return {src:'dkline',dO,dU,line:dO.line,was:L?L.line:null};
  return L?{src:'real',L,line:L.line}:null;
}
/* a player leg's est. price where DraftKings' own is not on file: its line from a read priced by the
   formula (src 'dkline'), else the model's estimate as before (src 'est': a rung at rungView's, the
   anytime touchdown at bookPrice on the model's chance). l: statLines' line; kind 'rung' or 'td' */
function plEst(x,g,l,kind,k){
  const d=espnPrice(x,g,l.stat,kind,k,'over'); if(d) return d;
  if(kind==='td') return {price:bookPrice(+k>=2?tdPlus(l.p,+k):l.p),src:'est'};
  return {price:rungView(x.pl,l.stat,l.mu,k,g.w).est,src:'est'};
}
/* a game leg put in the builder while a press's lines are on its game carries that read's time (gl) */
function espnGlTag(leg){ if(!leg) return leg; const o=ESPN_GL[leg.gid]; if(o) leg.gl=o.at; else delete leg.gl; return leg; }
/* a builder leg a press priced, once that press no longer stands, is priced as the page prices it
   without the press: null while the press stands (the price it was added at, as every leg keeps).
   A game leg (gl) whose game no press has read since the page loaded (a reload) goes to the game's line
   as published at its own number, else the model's estimate; a player's leg priced from a read (dkline)
   whose read is gone, or no longer has its line, to DraftKings' own price on that line where the pull
   has one, else the model's estimate. So a reload that sets a read aside returns the builder to the published prices too */
function espnLegBack(l){
  if(!l) return null;
  const ok=v=>v!=null&&isFinite(v)&&v!==0;
  if(isGameLeg(l)){
    if(!l.gl) return null;
    const g=((S&&S.sched)||[]).find(x=>x.id===l.gid); if(!g) return null;
    /* (app v108) its own price field among what the load's reads did (ESPN_GL's d), set or dropped, not
       merely a read of its game: a reload over a newer publish puts back only the fields read after it, and a
       leg whose field is the publish's again goes to the publish's price; within a load, and over the same
       publish, every field a read touched is in d, so a leg keeps the price it was added at, as before */
    { const G=ESPN_GL[l.gid], f=l.stat==='ml'?(l.team===g.h?'mlh':'mla'):(l.stat==='ats'?(l.team===g.h?'sph':'spa'):(l.side==='under'?'tou':'tov'));
      if(G&&(!G.d||Array.isArray(G.d[f]))) return null; }
    let px=null;
    if(l.stat==='ml') px=l.team===g.h?g.mlh:g.mla;
    else if(l.stat==='ats'){ if((l.team===g.h?-g.sp:g.sp)===+l.k) px=l.team===g.h?g.sph:g.spa; }
    else if(g.tot===+l.k) px=l.side==='under'?g.tou:g.tov;
    if(ok(px)) return {ml:px,src:'real'};
    return {ml:l.stat==='total'?TOTAL_EST:bookPrice(l.p),src:'est'};
  }
  if(l.src!=='dkline') return null;
  const e=espnGame(l.gid,l.week);
  if(e&&(l.stat==='any_td'?espnOffersTd(e,l.pid):espnLineOf(e,l.pid,l.stat)===+(l.main?l.k:(l.espn&&l.espn.line)))) return null;
  if(l.main){ const M=marketLine(l.week,l.pid,l.stat); if(M&&+M.line===+l.k){ const px=l.side==='under'?M.under:M.over; if(ok(px)) return {ml:px,src:'real'}; } }
  else { const od=oddsFor(l.gid,l.pid,l.stat,l.stat==='any_td'?1:l.k); if(ok(od)) return {ml:od,src:'real'}; }
  if(l.stat==='any_td') return {ml:bookPrice(l.p),src:'est'};
  const pl=S.players&&S.players[l.pid];
  if(pl&&typeof l.mu==='number'&&isFinite(l.mu)){ const v=rungView(pl,l.stat,l.mu,l.main?+l.k+0.5:+l.k,l.week); return {ml:l.main&&l.side==='under'?bookPrice(1-v.pMkt):v.est,src:'est'}; }
  return {ml:probToAmerican(l.p),src:'fair'};
}
const ESPN_ERR='typically within 0.5 points on yards, 2-3 on receptions, passing TDs and touchdowns';
/* the title an est. price carries: what it is priced from */
function estTitle(o){
  if(!o) return '';
  if(o.src==='dkline'){
    /* (app v125) a locked leg keeps no read time */
    const rd=o.at?`, read ${espnWhen(o.at)}`:'';
    if(!o.listed) return `Not on DraftKings: it lists no such rung. Priced from DraftKings’ line from ESPN${rd}; the price is our estimate`;
    return `DraftKings’ line from ESPN${rd}; the price is our estimate (${o.tested?ESPN_ERR:'untested on this market: no DraftKings price on file to check it against'})`; }
  return 'no DraftKings line yet: the model’s estimate';
}
/* an est. price's cell or mark says its basis once a press has read anything (with none the page is as
   it was) */
const estAttr=o=>o&&(o.src==='dkline'||espnAny())?` title="${esc(estTitle(o))}" data-est="${o.src}"`:'';
/* one line where a price from a read is shown: when DraftKings' lines were read, and whether that is a
   day old (a leg in the builder is kept by the browser with the price it was added at) */
function espnReadLine(at){
  const t=at!=null?(typeof at==='number'?at:Date.parse(at)):espnLatest(); if(!isFinite(t)||!t) return '';
  const h=(Date.now()-t)/3600e3;
  return `Price est. from DraftKings’ line, read ${espnWhen(t)}`+(h>DK_EST.staleHours?` (${Math.round(h)}h ago)`:'')+'.';
}

/* ---------- DraftKings' id for a leg (app v109) ----------
   DraftKings' betslip takes a leg only by DraftKings' own outcome id, and an id names one outcome at one
   number. PAY.dk holds the ids a paid price pull read (weekly.py's dk_ids; since app v125 no job buys prices, so
   none), and a read of ESPN (the props job's published read, a press, the parlay card's check) adds DraftKings'
   current game-line ids (espnIdAt dates them); a player's line read on ESPN carries none. dkIdOf is the
   id for a leg at its own line, by the keys and rung rule the parlay card reads (card.html, dkLeg): null
   once its game has kicked off, or where DraftKings has none. A suggestion takes only legs that have one,
   wherever the payload carries ids for the leg's game (dkCarries; one baked before them suggests as before). */
/* a press on a payload baked before ids makes PAY.dk to hold the game-line ids it read (dkPressMade):
   that payload still carries no ids of the pull's, so it suggests as before */
const DK_PRESS_MADE=new WeakSet();
function dkPressMade(o){ DK_PRESS_MADE.add(o); return o; }
/* (app v125) a game's entry carries the pull's ids only where it has the paid pull's time (at) or a player's key
   (the parlay card's dkHasPlayer rule): an entry a read made (the published read, a press, the card's check) holds
   only event, glat and the game lines' ids, so it never does, and a JSON copy of the table keeps the rule */
function dkEntryCarries(D){ return !!D&&typeof D==='object'&&((D.at!=null&&D.at!=='')||Object.keys(D).some(k=>!/^(team:|game\|)/.test(k)&&!['event','at','glat'].includes(k))); }
/* the payload carries ids (no l), and for the game of leg l ({week, gid} will do): its week has an entry
   for that game that carries the pull's ids (dkEntryCarries). A game with none is taken as a payload baked
   before ids is: weekly.py bakes PAY.dk {} on every run since app v125 (no job buys prices), and a press over
   it (until app v125, which wrote an entry that counted) emptied every level, hand and Elo pick of its game */
function dkCarries(l){
  if(!(typeof PAY==='object'&&!!PAY&&!!PAY.dk&&typeof PAY.dk==='object'&&!DK_PRESS_MADE.has(PAY.dk))) return false;
  if(!l) return true;
  const W=PAY.dk[String(l.week)], D=W&&typeof W==='object'?W[l.gid]:null;
  return dkEntryCarries(D);
}
function dkIdOf(l){
  if(!l||!dkCarries(l)) return null;
  const g=(S.sched||[]).find(x=>x.id===l.gid); if(g&&gameStarted(g)) return null;
  const W=PAY.dk[String(l.week)], D=W&&W[l.gid]; if(!D||typeof D!=='object') return null;
  const pt=x=>String(+x); let keys;
  if(l.stat==='ml') keys=[l.pid+'|ml'];
  else if(l.stat==='ats') keys=[l.pid+'|ats|'+pt(l.k)];
  else if(l.stat==='total') keys=['game|total|'+l.side+'|'+pt(l.k)];
  else if(l.stat==='any_td') keys=(+l.k||1)===1?[l.pid+'|any_td']:[];
  else if(l.main) keys=[[l.pid,l.stat,l.side,pt(l.k)].join('|')];
  /* a rung, k or more: DraftKings' Over k-0.5, else the whole Over k-1 its price was read from */
  else keys=[+l.k-0.5,+l.k-1].map(p=>[l.pid,l.stat,'over',pt(p)].join('|'));
  for(const k of keys){ const v=D[k]; if(typeof v==='string'&&v) return v; }
  return null;
}
/* DraftKings has the same bet, with no id at the leg's own line, at another number: a spread the same
   team's, a total the same side, a player's main line the same player, stat and side, a rung his Over on
   the stat, 2+ touchdowns his anytime touchdown (the parlay card puts such a leg on the slip at DraftKings'
   number: card.html, dkLeg). A moneyline and the anytime touchdown have no number. For the panel's note */
function dkAtAnother(l){
  if(!l||!dkCarries(l)) return false;
  const g=(S.sched||[]).find(x=>x.id===l.gid); if(g&&gameStarted(g)) return false;
  const D=PAY.dk[String(l.week)][l.gid];
  if(l.stat==='ml') return false;
  if(l.stat==='any_td') return (+l.k||1)>=2&&typeof D[l.pid+'|any_td']==='string'&&!!D[l.pid+'|any_td'];
  const near=l.stat==='ats'?l.pid+'|ats|':l.stat==='total'?'game|total|'+l.side+'|':[l.pid,l.stat,l.main?l.side:'over',''].join('|');
  return Object.keys(D).some(k=>k.startsWith(near)&&k.length>near.length&&isFinite(+k.slice(near.length))&&typeof D[k]==='string'&&!!D[k]);
}
/* a Sunday kickoff before 4pm Eastern (g.d and g.t are Eastern): oddsfetch.py's early_sunday(), whose
   games were never bought player prices. Dormant since app v125 (no job buys prices; nothing calls it) */
function dkEarlySunday(g){ return !!g&&!!g.d&&new Date(g.d+'T12:00:00Z').getUTCDay()===0&&(g.t||'13:00')<'16:00'; }
/* ---------- the lines the suggestions are built from ---------- */
/* every line this week with a real sportsbook price, team bets and players, unjudged, and (app v107)
   every player leg of a tested kind priced from DraftKings' line read on ESPN (the props job's published read,
   or a press) where no paid price is on file for it or its line has moved since (src 'dkline': a main line on passing, rushing or receiving
   yards, receptions or passing touchdowns, or the anytime touchdown). (app v127) No ladder bet: no rung k+, whatever
   prices it, and never 2+ touchdowns (isLadder), so no suggestion built from these takes one. Team
   bets are at the game's lines, a read's where one is newer. A game total is not among them: priced at the book's own chance (totalBet), it has no edge for a suggestion
   to find. The suggested parlays panel adds the totals itself, as its last fill (pbPool's market
   legs); the game pages' hands and the Elo picks never take one */
function pricedLegs(games){
  const w=currentWeek(); const out=[];
  for(const g of (games||gamesIn(w))){
    if(gameStarted(g)) continue;
    for(const team of [g.a,g.h]){
      const isHome=team===g.h, opp=isHome?g.a:g.h;
      for(const kind of ['ml','ats']){
        const b=gameBet(g,team,kind); if(!b) continue;
        const book=kind==='ml'?(isHome?g.mlh:g.mla):(isHome?g.sph:g.spa);
        if(book==null||!isFinite(book)) continue;
        out.push({key:legKey(g.id,'team:'+team,kind),gid:g.id,pid:'team:'+team,stat:kind,k:b.line==null?0:b.line,side:'over',main:false,
          p:b.p,price:book,src:'real',mu:null,name:TEAM_NAMES[team]||team,pos:'Game',grp:'TEAM',team,opp,week:g.w,
          label:kind==='ml'?'To win':`To cover ${b.line>0?'+':''}${b.line}`});
      }
    }
    const roster=rosterFor(g,false);
    for(const team in roster) for(const x of roster[team].players){
      if(x.gp<3||!suggestable(x.pl.id)) continue;
      for(const l of statLines(x)){
        const base={gid:g.id,pid:x.pl.id,stat:l.stat,name:x.pl.n,pos:x.pl.pos,grp:x.pl.grp,team,opp:x.opp,week:g.w,src:'real'};
        if(l.prob){ const od=oddsFor(g.id,x.pl.id,'any_td',1);
          if(od!=null) out.push({...base,key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:od,mu:null,label:tdLabel(x.pl.grp,1)});
          else { const d=espnPrice(x,g,'any_td','td',1);
            if(d&&d.tested) out.push({...base,src:'dkline',espn:espnOf(d),key:legKey(g.id,x.pl.id,'any_td'),k:1,side:'over',main:false,p:l.p,price:d.price,mu:null,label:tdLabel(x.pl.grp,1)}); }
          continue; }
        const M=mainOf(x,g,l.stat);
        if(M&&M.src==='real'){ const L=M.L, pO=pOver(x.pl.grp,l.stat,l.mu,L.line), lbl=l.m.lbl.toLowerCase();
          if(L.over!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'over',main:true,p:pO,price:L.over,mu:l.mu,label:`Over ${L.line} ${lbl}`});
          if(L.under!=null) out.push({...base,key:legKey(g.id,x.pl.id,l.stat),k:L.line,side:'under',main:true,p:1-pO,price:L.under,mu:l.mu,label:`Under ${L.line} ${lbl}`}); }
        else if(M&&ESPN_TESTED.main.has(l.stat)){ const dO=M.dO, dU=M.dU, pO=pOver(x.pl.grp,l.stat,l.mu,dO.line), lbl=l.m.lbl.toLowerCase();
          out.push({...base,src:'dkline',espn:espnOf(dO),key:legKey(g.id,x.pl.id,l.stat),k:dO.line,side:'over',main:true,p:pO,price:dO.price,mu:l.mu,label:`Over ${dO.line} ${lbl}`});
          out.push({...base,src:'dkline',espn:espnOf(dU),key:legKey(g.id,x.pl.id,l.stat),k:dU.line,side:'under',main:true,p:1-pO,price:dU.price,mu:l.mu,label:`Under ${dU.line} ${lbl}`}); }
      }
    }
  }
  return out;
}
/* market + form is the Elo tab's second price on a player leg (window.eloAltP: the book's
   chance moved by the player's rating on the side of the bet). The model's own edge over
   the book has not held: through week 3 the main lines it rated three or more points above
   the book said 66%, the book said 53% and 47% happened. So a player leg is suggested only
   where market + form also clears the book's implied chance by the same three points. Team legs have no second price
   and keep the model's bar alone; the model's own page, without the Elo tab, suggests as it
   did. Until the Elo files have loaded no player leg qualifies, and the loaded state is in
   the suggestion signatures so the window rebuilds once they have. */
function formAgrees(c){
  if(typeof window.eloAltP!=='function'||c.grp==='TEAM') return true;
  if(typeof window.eloLoaded==='function'&&!window.eloLoaded()) return false;
  const a=window.eloAltP(c.pid,c.side,c.price,c.src,c.stat);   /* none on a quarterback's touchdown: his rating is a passer's */
  return a!=null&&a-mlProb(c.price)>=0.03;
}
function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
/* ---------- the book's fair chance, and legs far off it ----------
   The model's chances have run high against DraftKings' every week since week 2: on Sunday 11
   October's 389 main lines its Brier score was 0.258 against the book's 0.243, and where it rated a
   side 10 to 20 points above the book's fair chance that side landed 50% where it said 64% (20 points
   and more: 55% where it said 77%). So the suggested parlays and the parlay card lead with the book's
   fair chance, the model's own beside it, and a leg the model rates FAR_OFF (15 points) or more above
   it is left out of the suggestions (pbPool, gameLegPool) and flagged wherever it is shown. Labelling
   and selection only: nothing of the model is refitted on the season in play.

   A leg's fair chance (legFair) is DraftKings' own, its price with the margin taken out:
   - both sides of the same line priced (a player's main line over and under, PAY.mkt; a game's two
     moneylines, or its two spread prices on the leg's own number; the total's over and under on the
     posted total): that side's no-vig chance, its implied chance over the two summed (devigOver);
   - one side priced (a ladder rung, an anytime touchdown, a team line or a total whose other side has
     no price, a main line the payload has moved since the leg was added): its implied chance over the
     week's typical overround on two-sided lines of its kind (fairVig: the median, over that week's
     two-sided lines, of the two implied chances summed; player main lines for a player's leg, the
     moneylines, spreads or totals for a game's), worked from the payload on every call, never a fixed
     number; marked est. (est: true) wherever it is shown. With no two-sided line of its kind that
     week, every two-sided line of the week; with none at all, no fair chance;
   - no real price (the builder's est. and fair prices): no fair chance.
   A parlay's (parlayFair) is the builder's own parlayProb on its legs with each leg's chance replaced
   by its fair chance, so legs in one game move together exactly as the model's chances do; p is null
   where a leg has none, and the parlay then shows the model's chance alone, saying why. */
const FAR_OFF=0.15;
const fairPx=v=>v!=null&&isFinite(v)&&v!==0;
function fairMedian(a){ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; }
/* the week's typical overround on its two-sided lines, by kind, and over all of them */
function fairVig(week){
  const w=String(week), by={player:[],ml:[],ats:[],total:[]}, two=(a,b)=>mlProb(a)+mlProb(b);
  const M=PAY&&PAY.mkt&&PAY.mkt[w];
  if(M) for(const pid in M){ const P=M[pid]; if(P&&typeof P==='object') for(const st in P){ const L=P[st];
    if(L&&typeof L==='object'&&fairPx(L.over)&&fairPx(L.under)) by.player.push(two(L.over,L.under)); } }
  for(const g of (S&&S.sched)||[]){ if(String(g.w)!==w) continue;
    if(fairPx(g.mla)&&fairPx(g.mlh)) by.ml.push(two(g.mla,g.mlh));
    if(g.sp!=null&&isFinite(g.sp)&&fairPx(g.spa)&&fairPx(g.sph)) by.ats.push(two(g.spa,g.sph));
    if(g.tot!=null&&isFinite(g.tot)&&fairPx(g.tov)&&fairPx(g.tou)) by.total.push(two(g.tov,g.tou)); }
  const out={week:w,all:fairMedian([...by.player,...by.ml,...by.ats,...by.total])};
  for(const k in by) out[k]=fairMedian(by[k]);
  return out;
}
/* one leg's fair chance on its own side: {p, est}, or null with no real price. memo: an object kept
   for one pass, so each week's overround is worked once */
function legFair(l,memo){
  if(!l) return null;
  /* (app v125) a pulled leg's fair chance is the pull's; a locked leg's the one kept at the lock */
  if(l.pulled&&l.pulled.fair&&isFinite(l.pulled.fair.p)&&l.pulled.fair.p>0&&l.pulled.fair.p<1) return {p:+l.pulled.fair.p,est:!!l.pulled.fair.est};
  if(l.kept&&typeof l.kept==='object') return l.kept.fair!=null&&isFinite(l.kept.fair)&&l.kept.fair>0&&l.kept.fair<1?{p:+l.kept.fair,est:!!l.kept.est}:null;
  const pr=legPrice(l);
  /* priced from DraftKings' line read by Refresh odds (app v107): the formula's own fair chance, est. (a
     main line's side its fair chance, a rung's before the hold; the anytime touchdown's its price over
     the week's typical player overround, or 1.0566 with none) */
  if(pr&&pr.src==='dkline'&&fairPx(pr.ml)){
    if(l.stat==='any_td'){ const m=memo||{}, wk=String(l.week), V=m[wk]||(m[wk]=fairVig(l.week)), ov=V.player||DK_EST.tdVig;
      return {p:Math.max(0.001,Math.min(0.999,mlProb(pr.ml)/ov)),est:true}; }
    const f=l.espn&&l.espn.fair; return f>0&&f<1?{p:f,est:true}:null; }
  if(!pr||pr.src!=='real'||!fairPx(pr.ml)) return null;
  const under=l.side==='under', g=((S&&S.sched)||[]).find(x=>x.id===l.gid)||null;
  const nv=(own,other)=>mlProb(own)/(mlProb(own)+mlProb(other));
  if(l.stat==='total'){
    if(g&&g.tot!=null&&+l.k===+g.tot&&fairPx(g.tov)&&fairPx(g.tou)) return {p:under?nv(g.tou,g.tov):nv(g.tov,g.tou),est:false};
  } else if(l.stat==='ml'||l.stat==='ats'){
    const team=l.team||String(l.pid||'').replace(/^team:/,'');
    if(g&&(team===g.h||team===g.a)){ const home=team===g.h;
      const own=l.stat==='ml'?(home?g.mlh:g.mla):(home?g.sph:g.spa), other=l.stat==='ml'?(home?g.mla:g.mlh):(home?g.spa:g.sph);
      const on=l.stat==='ml'||(g.sp!=null&&isFinite(g.sp)&&+l.k===(home?-g.sp:+g.sp));
      if(on&&fairPx(own)&&fairPx(other)) return {p:nv(own,other),est:false}; }
  } else if(l.main){
    const L=marketLine(l.week,l.pid,l.stat);
    if(L&&+L.line===+l.k&&fairPx(L.over)&&fairPx(L.under)) return {p:under?nv(L.under,L.over):nv(L.over,L.under),est:false};
  }
  const m=memo||{}, wk=String(l.week), V=m[wk]||(m[wk]=fairVig(l.week)), ov=V[isGameLeg(l)?l.stat:'player']||V.all;
  if(!(ov>0)) return null;
  return {p:Math.max(0.001,Math.min(0.999,mlProb(pr.ml)/ov)),est:true};
}
/* the leg's fair chance where the model rates its side FAR_OFF or more above it, else null */
function legFarOff(l,memo){ const f=legFair(l,memo); return f&&l.p!=null&&isFinite(l.p)&&l.p-f.p>=FAR_OFF-1e-9?f:null; }
function farText(p,f){ return `model ${Math.round(p*100)}% \u00b7 market ${Math.round(f.p*100)}%${f.est?' est.':''}: far off the market`; }
/* a parlay's fair chance: {p, est, miss}; p null where a leg has no fair chance (miss of them) */
function parlayFair(legs,memo,sims){
  if(!Array.isArray(legs)||!legs.length) return null;
  const m=memo||{}, f=legs.map(l=>legFair(l,m)), miss=f.filter(x=>!x).length;
  if(miss) return {p:null,est:false,miss};
  const pr=parlayProb(legs.map((l,i)=>({...l,side:l.side||'over',p:f[i].p})),sims);
  return {p:pr.corr,est:f.some(x=>x.est),miss:0,dk:legs.some(l=>l&&l.src==='dkline'&&legPrice(l).src==='dkline')};
}
/* (app v111) The four levels below were the Parlay Builder's panel over every game until 16 October 2026.
   The owner's calls of that day moved them: the same engine now builds each Thursday, Sunday and Monday
   night game's own set on Suggested Parlays (spSet, below), and the Parlay Builder shows the Top 100 lines on
   the reader's ticks (getPbTop). getPbTiers still builds the all-games levels, which nothing on the page
   draws; the audit and the smoke hold the engine through it.
   ---------- the Parlay Builder's suggested parlays: built from what the reader ticks ----------
   A panel over the builder. The reader picks the bet types (a mix of all of them, team bets
   only or player bets only, or any of the five boxes by hand) and which of the week's games
   still to kick off, and four tiers are built from those alone, each on its own: Safe, the
   likeliest 2-leg parlay; Medium, Aggressive and Extreme, the 3-, 4- and 5-leg parlay with the
   best expected return (the chance all legs land times what it pays) that still lands at least
   25%, 12% and 5% of the time: a floor that falls tier by tier, about 63%, 59% and 55% a leg on
   average, so a longer parlay asks a little less of each leg. Where no parlay of a level's size
   on the reader's picks reaches its floor, the level shows the likeliest parlay of that size
   instead (pbLikeliest, the tier marked likeliest), so every level has a parlay whenever the
   picks make that many legs: the owner wants each level filled, with its chance and price, rather
   than an empty box (October 2026). Under All nothing forces or caps a
   kind: a tier holds whatever mix of team and player legs does best by those rules.

   A leg qualifies as the old Suggested parlays window's did: a real sportsbook price, the
   model's chance between 45% and 97% and at least 3 points above the chance the price itself
   implies (mlProb, the book's margin left in, so stricter than its margin-out chance), and for
   a player leg market + form agreeing (formAgrees). When those cannot fill a tier, the
   fewest legs the model still rates at or above the book fill it, thin (and never marked Value: app v112); never a
   leg the model rates below the book, with one exception. A game total has no edge to offer: it is
   priced at the book's own chance (totalBet), which sits under the chance its price implies
   whenever the book takes a margin, so pricedLegs leaves it out and it is never preferred or thin.
   With Game total ticked the week's totals are a third list, the market legs (pool.mkt), taken only
   where the legs with an edge cannot make a parlay of a level's size at all, and said so under the
   level on the card (the owner ticked Game total alone and got nothing, October 2026). At most one side
   (to win or to cover) and one total a game, one leg a player, and no line twice: a line's over and under, or a player's main line
   and a rung of the same stat, are one key. A tier is empty only when the picks do not make that
   many legs at all, and then it says why rather than show a smaller parlay. Its chance and price are the builder's own sums (parlayProb, parlayDec, same-game
   legs priced together with the model's correlations), worked on the legs in the builder's
   order, so Add to builder shows the same numbers. Searched, not enumerated: a beam of the best
   partial parlays at each size, once by expected return and once by chance, so a floor a
   long-shot start cannot reach is still met. The choices are the reader's own, in S.ui.pb; the
   tiers are cached on everything they stand on (PB_CACHE), so ticking back is instant. */
const PB_KINDS=[['ml','Moneyline'],['ats','Spread'],['total','Game total'],['over','Player overs'],['under','Player unders']];
const PB_MIXES=[['all','All',['ml','ats','total','over','under']],['teams','Teams only',['ml','ats','total']],['players','Players only',['over','under']]];
const PB_TIERS=[['safe','Safe',2,0],['med','Medium',3,0.25],['aggr','Aggressive',4,0.12],['xtrm','Extreme',5,0.05]];
const PB_EDGE=0.03, PB_PMIN=0.45, PB_PMAX=0.97, PB_CAP=40, PB_BEAM=12, PB_WIDE=24, PB_LIKELY=3, PB_FINAL=8;
let PB_CACHE=new Map(), PB_SHOWN=null, PB_AMT_T=null;
/* (app v111) the search's widths, as the panel has always run them: a caller may widen them (opt), as
   Suggested Parlays does for one game's pool (SP_SEARCH); a call without opt is exactly as before */
const PB_SEARCH={cap:PB_CAP,beam:PB_BEAM,wide:PB_WIDE,likely:PB_LIKELY,final:PB_FINAL};
const pbOpt=o=>o?{...PB_SEARCH,...o}:PB_SEARCH;
/* ---------- the amount bet: one number, S.stake, set from either box ----------
   The Bet amount box over the suggested parlays and the builder's own stake are one amount: what
   every tier pays is worked on it, Add to builder leaves it in the builder, and Finish opens the
   parlay card on it. It is saved with the rest of the visitor's state, as the builder's stake
   always was. A typed amount is read as dollars (a $ sign and thousands commas allowed), kept to
   the cent and held between $1 and $100,000; anything that is not a positive number (blank, a
   word, 0, a minus) is no amount at all and the amount stays what it was, so nothing drawn from
   it is ever NaN. A saved amount that is not one (an old or hand-edited state) reads as $20. */
const STAKE_MIN=1, STAKE_MAX=100000, STAKE_DEFAULT=20;
function stakeRead(v){
  const n=typeof v==='number'?v:(typeof v==='string'&&v.trim()?Number(v.replace(/[\s$,]/g,'')):NaN);
  return isFinite(n)&&n>0?Math.min(STAKE_MAX,Math.max(STAKE_MIN,Math.round(n*100)/100)):null;
}
function pbStake(){ const v=stakeRead(typeof S==='object'&&S?S.stake:null); return v==null?STAKE_DEFAULT:v; }
/* the amount as a box shows it (20, 12.50) and as a label ($20, $12.50, $1,250) */
const stakeText=v=>v%1?v.toFixed(2):String(v);
const pbAmt=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
/* the reader's choices as saved, cleaned: every box on unless it was turned off, the games
   unticked (a game is ticked unless it is listed), and whether the games list is open */
function pbClean(v){
  const o=v&&typeof v==='object'?v:{}, k={};
  for(const [id] of PB_KINDS) k[id]=!(o.k&&o.k[id]===false);
  const off=Array.isArray(o.off)?o.off.filter(x=>typeof x==='string'&&/^[\w-]{3,40}$/.test(x)).slice(-64):[];
  return {k,off,gx:typeof o.gx==='boolean'?o.gx:null};
}
function pbUi(){ if(!S.ui) S.ui={}; return (S.ui.pb=pbClean(S.ui.pb)); }
/* a leg's box: a game bet by what it is, a player leg by its side (a touchdown and a ladder rung are overs) */
function pbKind(l){ return l.stat==='ml'||l.stat==='ats'||l.stat==='total'?l.stat:(l.side==='under'?'under':'over'); }
/* the mix the boxes make: one of the three, or 'custom' when they make none of them (no mix
   button is lit then, and nothing else is shown: the boxes say what is ticked) */
function pbMix(u){ const on=PB_KINDS.map(([k])=>k).filter(k=>u.k[k]).join(); const m=PB_MIXES.find(x=>x[2].join()===on); return m?m[0]:'custom'; }
/* the week's games still to kick off (and with no score): the list the reader ticks from */
function pbGames(){ return gamesIn(currentWeek()).filter(g=>!gameStarted(g)&&!hasScore(g)); }
/* a leg the reader's picks allow: its box ticked and its game ticked (u: other choices, as Suggest
   Parlays' every bet type, SP_ALL; the reader's own by default) */
function pbAllows(l,u){ u=u||pbUi(); return !!u.k[pbKind(l)]&&!u.off.includes(l.gid); }
function pbPlayerSides(){ const u=pbUi(); return !!(u.k.over||u.k.under); }
const pbOrd=(a,b)=>(a.key+'|'+a.side+'|'+a.k).localeCompare(b.key+'|'+b.side+'|'+b.k);
/* the builder's order (parlayLegs): the week, then the name. The tier's numbers are worked on
   the legs in this order, so the builder, which works them the same way, shows the same */
const pbOrder=legs=>[...legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name)));
/* a long list is cut to the likeliest half and the best-paying half, so the search stays quick */
function pbCap(list,cap){
  cap=cap||PB_CAP; list=[...list].sort(pbOrd); if(list.length<=cap) return list;
  const by=f=>[...list].sort((a,b)=>(f(b)-f(a))||pbOrd(a,b)), keep=new Map();
  for(const c of [...by(c=>c.p).slice(0,Math.ceil(cap/2)),...by(c=>c.p*(mlToDec(c.price)||1)).slice(0,Math.floor(cap/2))]) keep.set(c.key+'|'+c.side+'|'+c.k,c);
  return [...keep.values()].sort(pbOrd);
}
/* the legs on the reader's picks (u, the choices: the reader's own by default): preferred (the full bar)
   and thin (at or above the book, no more), uncapped (the Top 30 lines rank them all); pbPool caps them.
   (app v119: the Top lines' read option of app v115, which kept a line from a Refresh odds read with no
   DraftKings id, is gone, the owner's call: only lines DraftKings' betslip can take by id) */
function pbLegs(games,u){
  u=u||pbUi();
  const edge=c=>c.p-mlProb(c.price), formOut=typeof window.eloLoaded==='function'&&!window.eloLoaded();
  /* (app v109) where the payload carries DraftKings' ids, a leg qualifies only with one at its own line,
     so every leg a level suggests goes on DraftKings' betslip. A game counts as having player prices only
     where one of its player legs has an id (plNoId: games whose player legs have none), and the legs that
     would have qualified but for the id are counted for the panel's note (noId, noIdPl the players'; moved,
     movedPl those DraftKings had at another number). A game the payload has no ids for is as before */
  const hasId=c=>!dkCarries(c)||!!dkIdOf(c);
  const pref=[], thin=[], plGames=new Set(), plNoId=new Set(), fm={}; let far=0, farDk=0, noId=0, noIdPl=0, moved=0, movedPl=0;
  for(const c of pricedLegs(games)){
    const id=hasId(c);
    if(!isGameLeg(c)) (id?plGames:plNoId).add(c.gid);
    if(!pbAllows(c,u)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;
    /* until the Elo files are in, no player leg qualifies at all, as before */
    if(c.grp!=='TEAM'&&formOut) continue;
    /* the model FAR_OFF or more above the book's fair chance: left out, and counted for the panel */
    if(legFarOff(c,fm)){ far++; if(c.src==='dkline') farDk++; continue; }
    /* no DraftKings id at its line: it cannot go on the slip, so it is not suggested (a leg far off
       the market is counted as that, above, as before) */
    if(!id){ const pl=!isGameLeg(c); noId++; if(pl) noIdPl++; if(dkAtAnother(c)){ moved++; if(pl) movedPl++; } continue; }
    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});
  }
  /* the totals, with Game total ticked: both sides of each ticked game's posted total on a real
     price, at the market's own chance. No edge, so never preferred or thin: a list of their own,
     the last a level draws on (pbTier) */
  const mkt=[];
  if(u.k.total) for(const g of games) for(const side of ['over','under']){
    const c=totalLeg(g,side);
    if(c&&pbAllows(c,u)&&c.src==='real'&&isFinite(c.price)&&c.price!==0&&c.p>=PB_PMIN&&c.p<PB_PMAX){
      /* a total with no DraftKings id at its number is counted for the note too */
      if(hasId(c)) mkt.push({...c,thin:false,market:true}); else { noId++; if(dkAtAnother(c)) moved++; } } }
  return {pref,thin,mkt,plGames:plGames.size,far,farDk,noId,noIdPl,moved,movedPl,plNoId:[...plNoId].filter(id=>!plGames.has(id)).length};
}
/* the legs a level is searched from: each list cut to the likeliest and best-paying (opt.cap, 40 for the
   panel), so the search stays quick */
function pbPool(games,u,opt){ const r=pbLegs(games,u), cap=pbOpt(opt).cap; return {...r,pref:pbCap(r.pref,cap),thin:pbCap(r.thin,cap),mkt:pbCap(r.mkt,cap)}; }
/* (app v121) two legs of one game DraftKings will not take on one slip (the owner, 19 October 2026: "If your parlay
   already has a receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets blocked",
   and "Some combos contradict each other, like QB under 1.5 passing TDs alongside two of his receivers to score"): a
   quarterback's passing touchdowns, over or under, a main line or a rung, with a teammate's anytime touchdown ('td'), or
   his passing touchdowns over with the game's total ('total'); null for any other pair. No suggestion takes such a pair
   (pbFits, gameTiers, the Elo picks' search), and the builder says so under its legs where it holds one */
const dkPassTd=l=>!!l&&!isGameLeg(l)&&l.stat==='passing_tds';
function dkClashWhy(a,b){
  if(!a||!b||a.gid!==b.gid) return null;
  const one=(q,o)=>!dkPassTd(q)?null:(!isGameLeg(o)&&o.stat==='any_td'&&o.team===q.team&&o.pid!==q.pid)?'td':(q.side!=='under'&&o.stat==='total'&&isGameLeg(o))?'total':null;
  return one(a,b)||one(b,a);
}
const dkClash=(a,b)=>!!dkClashWhy(a,b);
/* what a pair is, in the builder's words */
const DK_CLASH={td:'a quarterback’s passing TDs with a teammate’s touchdown',total:'a quarterback’s passing TDs over with the game total'};
/* every such pair in a list of legs, by their places in it: [i, j, kind], i before j */
function dkClashPairs(legs){ const out=[]; (legs||[]).forEach((a,i)=>legs.slice(i+1).forEach((b,k)=>{ const w=dkClashWhy(a,b); if(w) out.push([i,i+1+k,w]); })); return out; }
window.dkClashWhy=dkClashWhy; window.dkClash=dkClash; window.dkClashPairs=dkClashPairs; window.DK_CLASH=DK_CLASH;
/* a leg that can join: not a line already on it, not a second side (to win or to cover) on one
   game, and not a second leg on one player (two lines on one man, his catches and his yards, are
   nearly one bet). A game's total is a bet of its own beside its side, as a book takes them on one
   ticket (the two are unrelated, legRho); its over and under are one key, so one total a game.
   (app v121) Never a pair DraftKings will not take on one slip (dkClash) */
function pbFits(cur,c){
  if(cur.some(l=>l.key===c.key)) return false;
  if(cur.some(l=>dkClash(l,c))) return false;
  if(isGameLeg(c)) return !cur.some(l=>isGameLeg(l)&&l.gid===c.gid&&(l.stat==='total')===(c.stat==='total'));
  return !cur.some(l=>!isGameLeg(l)&&l.pid===c.pid);
}
/* the most legs a list can make together: one a player, one side and one total a game */
function pbMaxLegs(list){ const pl=new Set(), games=new Set(); for(const l of list){ if(isGameLeg(l)) games.add(l.gid+(l.stat==='total'?'|total':'|side')); else pl.add(l.pid); } return pl.size+games.size; }
/* (app v121) the most legs one parlay can take of a list: one leg a player, one side and one total a game, and no pair
   DraftKings refuses (dkClash). Only a player every one of whose legs is his passing touchdowns clashes whatever he is
   given (a quarterback with another line takes that), against a teammate every one of whose legs is his anytime
   touchdown and, where none of his is an under, the game's total; so a game takes its players, its side and its total
   less the most of those clashes that can be had apart (a bipartite matching) */
function pbMaxFit(list){
  const byG=new Map(); let n=0;
  for(const l of list||[]){ if(!byG.has(l.gid)) byG.set(l.gid,[]); byG.get(l.gid).push(l); }
  for(const L of byG.values()){
    const pl=new Map(); let side=0, tot=0;
    for(const l of L){ if(isGameLeg(l)){ if(l.stat==='total') tot=1; else side=1; } else { if(!pl.has(l.pid)) pl.set(l.pid,[]); pl.get(l.pid).push(l); } }
    const P=[...pl.values()], Q=P.filter(ls=>ls.every(dkPassTd)), O=P.filter(ls=>ls.every(l=>l.stat==='any_td'));
    const adj=Q.map(ls=>[...O.filter(o=>o[0].team===ls[0].team&&o[0].pid!==ls[0].pid).map(o=>o[0].pid),...(tot&&!ls.some(l=>l.side==='under')?['#total']:[])]);
    const mate=new Map(), aug=(i,seen)=>{ for(const r of adj[i]){ if(seen.has(r)) continue; seen.add(r); if(!mate.has(r)||aug(mate.get(r),seen)){ mate.set(r,i); return true; } } return false; };
    let M=0; adj.forEach((_,i)=>{ if(aug(i,new Set())) M++; });
    n+=P.length+side+tot-M;
  }
  return n;
}
/* The search scores thousands of partial parlays, too many for the builder's Monte Carlo sums,
   so it scores each on the legs' own chances times, for every pair that moves together, how
   much likelier the pair is than the two apart: the same gaussian copula and correlations as
   parlayProb, worked exactly for each pair (Plackett's integral, ten-point Gauss-Legendre).
   That is exact for two legs and close for more. Only the finalists are then worked with the
   real sums, and those are the numbers shown and the floors are held to. */
const PB_GLX=[-0.9739065285171717,-0.8650633666889845,-0.6794095682990244,-0.4333953941292472,-0.1488743389816312,0.1488743389816312,0.4333953941292472,0.6794095682990244,0.8650633666889845,0.9739065285171717];
const PB_GLW=[0.0666713443086881,0.1494513491505806,0.2190863625159820,0.2692667193099963,0.2955242247147529,0.2955242247147529,0.2692667193099963,0.2190863625159820,0.1494513491505806,0.0666713443086881];
/* P(X<h, Y<k) for two standard normals correlated r */
function bvnLower(h,k,r){
  const a=Math.asin(Math.max(-0.9999,Math.min(0.9999,r))); let s=0;
  for(let i=0;i<10;i++){ const t=a*(PB_GLX[i]+1)/2, c=Math.cos(t); s+=PB_GLW[i]*Math.exp(-(h*h-2*h*k*Math.sin(t)+k*k)/(2*c*c)); }
  return Math.max(0,gbNorm(h)*gbNorm(k)+s*a/(4*Math.PI));
}
const pbId=l=>l.key+'|'+l.side+'|'+l.k;
/* the chance every leg lands, each leg's chance from pf: the legs' own, times each moving pair's lift */
function pbJoint(legs,pf,memo){
  let p=1; for(const l of legs) p*=pf(l);
  for(let i=0;i<legs.length;i++) for(let j=i+1;j<legs.length;j++){
    const a=legs[i], b=legs[j], r=legRho(a,b); if(Math.abs(r)<0.03) continue;
    const key=pbId(a)+'~'+pbId(b)+'~'+(pf===mlP?'b':'m'); let lift=memo.get(key);
    if(lift==null){ const pa=pf(a), pb=pf(b), da=a.side==='under'?-1:1, db=b.side==='under'?-1:1;
      lift=bvnLower(-invNorm(1-pa),-invNorm(1-pb),da*db*r)/(pa*pb); memo.set(key,lift); }
    p*=lift; }
  return Math.max(0,Math.min(1,p));
}
const mlP=l=>mlProb(l.price), modelP=l=>l.p;
/* what a book pays, as parlayDec works it: legs in different games multiplied, a game's legs
   priced together from the book's own chances and cut by SGP_HOLD, never above multiplying */
function pbDecApprox(legs,memo){
  const by={}; for(const l of legs) (by[l.gid]=by[l.gid]||[]).push(l);
  let d=1;
  for(const gid in by){ const grp=by[gid], mult=grp.reduce((a,l)=>a*(mlToDec(l.price)||1),1);
    if(grp.length<2){ d*=mult; continue; }
    const pj=pbJoint(grp,mlP,memo); d*=(pj>0&&isFinite(pj))?Math.min(mult,(1/pj)*SGP_HOLD):mult; }
  return d;
}
function pbEval(legs,memo){
  const id=legs.map(pbId).sort().join(',');
  let e=memo.get(id); if(e) return e;
  const pr=pbJoint(legs,modelP,memo), d=pbDecApprox(legs,memo);
  e={legs,pr,d,ev:pr*d,id}; memo.set(id,e); return e;
}
/* the beam: every partial parlay one leg longer, the best `width` of them by `by` kept at each
   size; one well under the floor is dropped as soon as it is (another leg only lowers it) */
function pbBeam(pools,floor,by,width,memo){
  let beam=[{legs:[],id:''}];
  for(let s=0;s<pools.length;s++){
    const next=new Map();
    for(const b of beam) for(const c of pools[s]){ if(!pbFits(b.legs,c)) continue;
      const e=pbEval([...b.legs,c],memo); if(next.has(e.id)||(floor&&e.pr<floor*0.9)) continue; next.set(e.id,e); }
    if(!next.size) return [];
    beam=[...next.values()].sort((a,b)=>(b[by]-a[by])||a.id.localeCompare(b.id)).slice(0,width);
  }
  return beam;
}
/* a finalist with the builder's own sums, on the legs in the builder's order */
function pbExact(legs){
  const L=pbOrder(legs.map(l=>({...l}))), pr=parlayProb(L);
  return {legs:L,corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price}))),thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length};
}
/* a level's best return: preferred legs alone first, then with k legs from the thin list, fewest
   first. The best few by the search's own score are worked exactly, and the best of those that
   clears the floor is the tier; null when none does. Safe, with no floor, is the likeliest pair.
   opt: the search's widths (pbOpt; the panel's own without it) */
function pbBestReturn([id,label,n,floor],pool,memo,kMax,opt){
  const o=pbOpt(opt), P=pool.pref, U=[...pool.pref,...pool.thin];
  /* kMax, when given, is the most fill legs a parlay may take (the totals' pass, pbTier) */
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    const fin=new Map();
    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',o.beam,memo),...pbBeam(pools,floor,'pr',o.beam,memo)]) fin.set(e.id,e);
    /* the finalists that clear the floor by the search's own score, best first, worked with the
       real sums on fewer draws; then the best in full, which is what the card shows and what the
       floor is held to */
    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort((a,b)=>((floor?b.ev-a.ev:b.pr-a.pr))||a.id.localeCompare(b.id)).slice(0,o.final)
      .map(e=>{ const L=pbOrder(e.legs), pr=parlayProb(L,6000).corr, d=parlayDec(L.map(l=>({leg:l,ml:l.price})),4000); return {e,sc:floor?pr*d:pr,ok:!floor||pr>=floor*0.97}; })
      .filter(x=>x.ok).sort((a,b)=>(b.sc-a.sc)||a.e.id.localeCompare(b.e.id));
    for(const x of top){ const r=pbExact(x.e.legs); if(!floor||r.corr>=floor) return r; }
  }
  return null;
}
/* the likeliest n-leg parlay on the picks, for a level none of whose parlays reaches its floor.
   Chosen as Safe is: preferred legs alone first, then with k thin legs, fewest first. At each k a
   beam by the search's own chance, twice as wide as the floor search's, and its best few (three for
   the panel) by that chance worked with the builder's own sums (parlayProb, on the legs in the
   builder's order), the highest of those the tier (the lower id on a tie, so the same picks always
   give the same parlay). Legs in different games are a plain product, so there the search's chance
   is the builder's and this is the likeliest parlay outright. null only when the picks do not make
   n legs at all */
function pbLikeliest(n,pool,memo,kMax,opt){
  const o=pbOpt(opt), P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    let best=null;
    for(const e of pbBeam(pools,0,'pr',o.wide,memo).slice(0,o.likely)){
      const pr=parlayProb(pbOrder(e.legs)).corr;
      if(!best||pr>best.pr||(pr===best.pr&&e.id<best.e.id)) best={e,pr}; }
    if(best) return pbExact(best.e.legs);
  }
  return null;
}
/* one level: the best return over its floor, else (Medium, Aggressive, Extreme) the likeliest
   parlay of its size, marked likeliest so its card says which it is */
function pbTierOn(t,pool,memo,kMax,opt){
  const r=pbBestReturn(t,pool,memo,kMax,opt); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo,kMax,opt); return x?{...x,likeliest:true}:null;
}
/* the legs with an edge first, exactly as before (preferred, then the fewest thin); only where
   they cannot make a parlay of the level's size at all are the totals added: every leg with an
   edge, preferred and thin alike, is then the base and the totals the only fill, exactly as many
   totals as those legs leave to fill (pbTotalsFill) and no more, by the same two searches, so a
   total never takes the place of a leg with an edge. (app v121) Those legs are counted as one parlay can take them, with
   no pair DraftKings refuses (pbMaxFit): a quarterback's passing TDs and his teammate's touchdown are one leg's room,
   not two, so a total fills where they cannot both go */
const pbTotalsFill=(n,pool)=>Math.max(0,n-pbMaxFit([...pool.pref,...pool.thin]));
function pbTierOf(t,pool,memo,opt){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo,undefined,opt); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2],pool),opt);
}
/* a level with its fair chance (parlayFair on its legs, in the builder's order), worked once it is chosen */
const pbWithFair=r=>r&&r.legs?{...r,fair:parlayFair(r.legs)}:r;
function pbTier(t,pool,memo,opt){ return pbWithFair(pbTierOf(t,pool,memo,opt)); }
/* why a tier is empty, in the reader's terms: the picks do not make that many legs (one a player,
   one side and one total a game), since every level shows a parlay whenever they do. A player leg needs
   DraftKings' line, read from ESPN (since app v125 by the props job on every run, and by a press), priced by
   our estimate. With player bets ticked and no player line on the ticked games, that is the reason, and the
   tier says so rather than ask for more ticks (under Players only no tick would help). c: which of the two kinds
   are ticked, and the ticked games' ids */
/* (app v109, dormant since app v125: a payload whose bake wrote paid ids) player legs priced on the ticked games,
   and none with a DraftKings id */
const PB_NO_ID='no player lines with a DraftKings id.';
/* (app v130) the one phrase for no player lines, every such reason made of it: DraftKings had posted none when its
   lines were last read from ESPN at t (the published read or a press, espnLastRead), or they have not been read */
const noPlSay=t=>t?`no player lines yet (read ${espnWhen(t)})`:'player lines not read yet';
/* (app v125) no player line on these games (ids; none: the week's games still to come) */
function pbNoPl(ids){ return noPlSay(espnLastRead(ids||pbGames().map(g=>g.id)))+'.'; }
function pbWhy(n,pool,c){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);
  /* (app v109) short of legs only for want of DraftKings' ids: said so */
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;
  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:pbNoPl(c.ids); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }
  return `${what}: tick more games or bet types.`;
}
function pbBuild(){
  const u=pbUi(), all=pbGames(), games=all.filter(g=>!u.off.includes(g.id)), kinds=PB_KINDS.map(([k])=>k).filter(k=>u.k[k]);
  const out={games:all.length,ticked:games.length,kinds:kinds.length,pref:0,thin:0,mkt:0,far:0,tiers:[],noPlayerPrices:false};
  const empty=why=>PB_TIERS.map(([id,label,n,floor])=>({id,label,n,floor,why}));
  if(!all.length){ out.tiers=empty('No games left to build from.'); return out; }
  if(!kinds.length){ out.tiers=empty('No bet types ticked: tick at least one above.'); return out; }
  if(!games.length){ out.tiers=empty('No games ticked: tick at least one above.'); return out; }
  const pool=pbPool(games), memo=new Map(), c={players:!!(u.k.over||u.k.under),teams:!!(u.k.ml||u.k.ats),
    espn:games.some(g=>espnWasRead(g.id,g.w)),ids:games.map(g=>g.id)};
  out.espnRead=c.espn;
  out.pref=pool.pref.length; out.thin=pool.thin.length; out.mkt=pool.mkt.length; out.far=pool.far; out.farDk=pool.farDk||0; out.noPlayerPrices=c.players&&!pool.plGames;
  out.noId=pool.noId||0; out.noIdPl=pool.noIdPl||0; out.moved=pool.moved||0; out.movedPl=pool.movedPl||0; out.plNoId=pool.plNoId||0;
  out.tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:pbWhy(n,pool,c)}; });
  return out;
}
/* what the tiers stand on beyond the picks: the data the job published and the page loaded */
function pbDataSig(){ return [PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig(),'e'+ESPN_SEQ].join('|'); }
/* ---------- the suggestions record (props/data/suggest_ledger.json, and its backtest beside it) ----------
   The props job's record (props/build/suggest_ledger.js). Since app v111 the page reads its `prime` map: each
   Thursday, Sunday and Monday night game's set on Suggested Parlays, as the job last published it before the
   game's lock (2 hours before kickoff), frozen there and graded after the game as a book settles it. Keyed
   season|WW|kickoff|game id, each entry {season, week, gid, away, home, kickoff, lock, baked_at, taken_at,
   pool, tiers, elo, grade, updates}; its tiers are the four levels in spTierOut's shape, a level the job built again
   for a player ruled out after the lock carrying `updated` {pid, name, reason, at}. Since app v118 an entry carries
   the unit's Elo picks too (`elo`, the four levels elo-safe to elo-xtrm, graded beside the model's in `grade`), and
   the `slot` map holds the Sunday slot's (spSlotUnit: every Sunday game before 7 pm Eastern, one set), keyed
   season|WW|first kickoff|<season>_<WW>_SUN, with its `games`. Its `entries` map, the all-games panel's record from
   12 October 2026, stays in the file, graded, and is drawn nowhere.
   suggest_backtest.json (app v118, the owner's call of 19 October 2026: "can we retroactively look back and find what
   we would have suggested and count it to the record?") is the same two maps for the weeks before the record took
   them, written once by props/build/suggest_backtest.js: every night game and Sunday slot of weeks 3 to 6 rebuilt by
   today's rules on exactly what the site had published at its lock (the files of the last commit before it), graded
   on the results, each entry marked src 'backtest' with the commit it was built from. The record counts a unit's
   level from the job's entry where there is one and from the backtest where there is not, and says how many it took
   from the backtest. Both read beside the payload with no-store once a load, kept outside S so they are never saved;
   a file that is not there, or with none of its maps an object, is no record (PB_REC, PB_BT null), and PB_REC_DONE
   says the read has answered either way, so a locked game waits for it before building a set of its own. */
let PB_REC=null, PB_REC_DONE=false, PB_BT=null;
const PB_REC_URL=DATA_URL.replace(/payload\.json$/,'suggest_ledger.json');
const PB_BT_URL=DATA_URL.replace(/payload\.json$/,'suggest_backtest.json');
const pbIsMap=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
/* PB_REC_STATE: which side of its lock each set was on when the record was last read (spState), so a set that
   reaches its lock with the page open has the record read again (pbWatch): the job may have rewritten or first
   taken the game's entry since the page loaded, and the locked set is the one it published last. Until that read
   answers the tab shows the record as this load read it; a read again that fails, or is not a record, keeps it.
   The backtest never changes once written, so it is read once a load */
let PB_REC_STATE=null;
async function pbRecLoad(again){
  const get=async u=>{ try{ const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'}); return r.ok?await r.json():null; }catch(e){ return null; } };
  const [L,B]=await Promise.all([get(PB_REC_URL),again?Promise.resolve(undefined):get(PB_BT_URL)]);
  const ok=pbIsMap(L)&&(pbIsMap(L.entries)||pbIsMap(L.prime)||pbIsMap(L.slot));
  if(ok||!again) PB_REC=ok?L:null;
  if(B!==undefined) PB_BT=pbIsMap(B)&&(pbIsMap(B.prime)||pbIsMap(B.slot))?B:null;
  PB_REC_DONE=true;
  /* a read that answers once the page has gone (a check that closed its window) draws nothing */
  if(typeof document==='undefined'||!document) return;
  try{ PB_REC_STATE=spState(); }catch(e){}
  try{ renderSp(); }catch(e){ console.error(e); }
}
window.pbRecLoad=pbRecLoad;
/* the sections of Suggested Parlays and the maps of the record each counts, and the two kinds of level each unit
   has: the model's parlays (tiers) and the Elo picks (elo). From app v118 to v128 two sections, Night games (the record's
   prime map) and the Sunday slot (its slot map), each with its own record (the owner's call of 19 October 2026); since
   app v129 one, Night games, its sets the night games' and then the Sunday slot's, its record both maps (the owner's
   call of 22 October 2026: "get rid of the Sunday slot record section -> all should be a part of 'Night Games'").
   slot is kept for a caller that asks for the slot's map by name, and drawn nowhere */
/* (app v131) two sections again: Night games on the prime map, Day games (the Sunday slot) on the slot map */
const SP_SEC={night:{maps:['prime'],name:'Night games'},slot:{maps:['slot'],name:'Day games'},all:{maps:['prime','slot'],name:'Record'}};
/* (app v132) the levels the tab draws and counts: Extreme off the tab (the job still takes and grades it) */
const SP_SHOW=['safe','med','aggr'];
/* (app v132) Day games off on a Sunday from 4pm Eastern */
function spDayOff(now){ const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date(now==null?Date.now():now)).map(x=>[x.type,x.value]));
  return p.weekday==='Sun'&&+p.hour>=16; }
const SP_KIND={model:{field:'tiers',pre:'',name:'Model parlays'},elo:{field:'elo',pre:'elo-',name:'Elo picks'}};
/* the record of one section's one kind, a level at a time: each season's unit and level once, the job's entry where
   it holds one (the last key that does: a kickoff the league moved makes a new key), else the backtest's, from the
   entries' own grades: won or lost (a push, every leg a push or a void, the stake back, is counted apart; a parlay a
   push shortened counts at what it was graded to pay), the wins expected by the book's fair chance and by the
   level's own chance (the model's, or the Elo's for an Elo pick: the chances the set showed), units on $1, and how
   many of them came from the backtest (bt) and from which weeks (L the record, B the backtest). A unit the job's record
   holds levels of this kind for is the record's whole (its levels as it took them, a level with no parlay or not yet
   graded included): the backtest counts only for a unit the record has none of, as week 6's Sunday night game's Elo
   picks, which the record took before app v118 gave it any */
function spRecSum(L,sec,kind,B){
  sec=SP_SEC[sec]?sec:'all'; kind=SP_KIND[kind]?kind:'model';
  const maps=SP_SEC[sec].maps, {field,pre}=SP_KIND[kind];
  const out=PB_TIERS.filter(([id])=>SP_SHOW.includes(id)).map(([id,label])=>({id:pre+id,label,graded:0,won:0,lost:0,push:0,fair:0,fairN:0,model:0,units:0,bt:0}));
  let pending=0; const last=new Map(), units=new Set(), wk=new Set(), mine=new Set();
  for(const map of maps) for(const e of Object.values(L&&pbIsMap(L[map])?L[map]:{})) if(pbIsMap(e)&&Array.isArray(e[field])) mine.add(e.season+'|'+e.gid);
  const take=(src,bt)=>{ for(const map of maps){ const E=src&&pbIsMap(src[map])?src[map]:{};
    for(const k of Object.keys(E).sort()){ const e=E[k]; if(!pbIsMap(e)||!Array.isArray(e[field])||(bt&&mine.has(e.season+'|'+e.gid))) continue;
      for(const t of e[field]){ const g=e.grade&&e.grade[t&&t.id]; if(!g||!out.some(x=>t&&x.id===t.id)||!Array.isArray(t.legs)) continue;
        last.set([e.season,e.gid,t.id].join('|'),{t,g,bt,w:+e.week}); } } } };
  /* the backtest first (a unit the record holds left out) and the job's record over it */
  take(B,true); take(L,false);
  for(const [id,{t,g,bt,w}] of last){ const s=out.find(x=>x.id===t.id); units.add(id.split('|').slice(0,2).join('|'));
    if(g.result==='pending'){ pending++; continue; }
    if(g.result!=='won'&&g.result!=='lost'&&g.result!=='push') continue;
    if(bt){ s.bt++; if(w) wk.add(w); }
    if(g.result==='push'){ s.push++; continue; }
    s.graded++; if(g.result==='won') s.won++; else s.lost++;
    s.model+=isFinite(+t.p)?+t.p:0; if(t.fair!=null&&isFinite(+t.fair)){ s.fair+=+t.fair; s.fairN++; }
    s.units+=(g.result==='won'&&isFinite(+g.payout)?+g.payout:0)-1; }
  return {tiers:out,pending,games:units.size,btWeeks:[...wk].sort((a,b)=>a-b)};
}
/* a section's record at its head: a row for the model's parlays and one for the Elo picks, a pill a level (won-lost,
   units on $1) and what is pending, as the ELO Ratings tab's record bar, the backtest's weeks counted in it (each pill's
   title saying how many of its own; app v129 took off the chip that named the weeks). No record and no backtest,
   nothing (hidden) */
function spRecHtml(sec){
  if(!PB_REC&&!PB_BT) return `<div class="sp-rec" data-sp-recsec="${sec}" hidden></div>`;
  const un=v=>(v>0.0005?'+':v<-0.0005?'−':'')+Math.abs(v).toFixed(2), f1=v=>v.toFixed(1);
  const rows=Object.entries(SP_KIND).map(([kind,K])=>{ const R=spRecSum(PB_REC,sec,kind,PB_BT), any=R.tiers.some(s=>s.graded||s.push);
    const by=kind==='elo'?'the Elo chance':'the model';
    const pills=any?R.tiers.map(s=>`<span class="rec" data-sp-rec="${sec}:${s.id}" title="${esc(K.name)}, ${esc(s.label)}: ${s.graded} graded, ${s.won} won${s.graded?`; wins expected ${s.fairN?f1(s.fair)+' by the book’s fair chance'+(s.fairN<s.graded?' (on the '+s.fairN+' with one)':'')+', ':''}${f1(s.model)} by ${by}`:''}${s.push?`; ${s.push} push${s.push===1?'':'es'}, the stake back`:''}${s.bt?`; ${s.bt} of them from the backtest`:''}">${esc(s.label)} <b>${s.won}–${s.lost}</b> ${s.graded||s.push?un(s.units)+' units':''}</span>`).join('')
      :`<span class="rec" data-sp-rec="${sec}:${kind}:none">None graded yet</span>`;
    return `<div class="bar" data-sp-reckind="${kind}"><span class="sp-reck">${esc(K.name)}</span>${pills}${R.pending?`<span class="rec" data-sp-rec="${sec}:${kind}:pending">Pending <b>${R.pending}</b></span>`:''}</div>`; }).join('');
  return `<div class="sp-rec" data-sp-recsec="${sec}">${rows}</div>`;
}
/* the tiers for the picks as they stand, from the cache when nothing they stand on has moved */
/* everything the panel's choices stand on: the week, the games to come, those unticked, the boxes, the data */
function pbSig(){ const u=pbUi(), games=pbGames();
  return [currentWeek(),games.map(g=>g.id).join(','),u.off.filter(id=>games.some(g=>g.id===id)).sort().join(','),PB_KINDS.map(([k])=>u.k[k]?1:0).join(''),pbDataSig()].join('|'); }
function getPbTiers(){
  const sig=pbSig();
  let r=PB_CACHE.get(sig);
  if(!r){ r={sig,...pbBuild()}; PB_CACHE.set(sig,r); if(PB_CACHE.size>24) PB_CACHE.delete(PB_CACHE.keys().next().value); }
  return r;
}
/* ---------- the game page's suggested parlays: High, Medium, Low ----------
   Always three hands, 2, 3 and 4 legs, each the best payout for its chance from this game's
   lines (see patch_game_tiers_value.py): real prices where the book has them, the model's
   estimate of a book's price on every other touchdown (app v127: no ladder rung), no leg shorter than
   -250, each hand above its payout floor where the game allows. (app v124) Drawn nowhere since
   20 October 2026, when the game page's card went (gameWinBtns, below): kept, as the all-games
   levels are, since the audit and the smoke still hold it. */
const GAME_LEG_MIN=-250;
const GAME_NOT_OFFERED=new Set(['fg_att']);   /* a stat the model rates that books do not post as a prop */
const GAME_TIERS=[['high','High',2,100,0.35],['med','Medium',3,250,0.20],['low','Low',4,500,0.10]];  /* id, label, legs, least it pays, least chance */
let GAME_TIER_CACHE={};
function gameSuggestSig(g){
  return [g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||'','e'+ESPN_SEQ].join('|');
}
/* every line in the game worth a place: priced by the book, or by the model's estimate */
function gameLegPool(g,all){
  const out=pricedLegs([g]);
  const have=new Set(out.map(l=>l.key+'@'+l.k+l.side+(l.main?'m':'')));
  const roster=rosterFor(g,false);
  for(const team in roster) for(const x of roster[team].players){
    /* a charted starter under three games is shown (thin history), but suggested on his estimate
       only where the chart moved him up, as before app v104 */
    if(!suggestable(x.pl.id)||(x.gp<3&&!x.up)) continue;
    for(const l of statLines(x)){
      if(GAME_NOT_OFFERED.has(l.stat)) continue;
      const base={gid:g.id,pid:x.pl.id,stat:l.stat,name:x.pl.n,pos:x.pl.pos,grp:x.pl.grp,team,opp:x.opp,week:g.w,src:'est'};
      /* a leg with no real price: DraftKings' line from a Refresh odds read where there is one (a tested
         kind DraftKings lists counts as a book price; any other is shown on the page and never
         suggested), else the model's estimate as before */
      if(l.prob){ const key=legKey(g.id,x.pl.id,'any_td');
        if(!have.has(key+'@1over')){ const d=oddsFor(g.id,x.pl.id,'any_td',1)==null?espnPrice(x,g,'any_td','td',1):null;
          if(d){ if(d.tested&&d.listed) out.push({...base,src:'dkline',espn:espnOf(d),stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:d.price,mu:null,label:tdLabel(x.pl.grp,1)}); }
          else out.push({...base,stat:'any_td',key,k:1,side:'over',main:false,p:l.p,price:bookPrice(l.p),mu:null,label:tdLabel(x.pl.grp,1)}); }
        continue; }
    }
  }
  /* (app v109) where the payload carries DraftKings' ids for the game, only a leg DraftKings' betslip can
     take (all: every leg as before, to count those the ids left out) */
  const fm={}, dkOn=!all&&dkCarries({week:g.w,gid:g.id});
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.price>=GAME_LEG_MIN&&c.p>=0.40&&c.p<0.97&&!legFarOff(c,fm)&&(!dkOn||!!dkIdOf(c)));
}
function gameTiers(g){
  const sig=gameSuggestSig(g), hit=GAME_TIER_CACHE[g.id];
  if(hit&&hit.sig===sig) return hit.val;
  const pool=gameLegPool(g);
  const fits=(cur,c)=>!cur.some(l=>l.key===c.key)&&!(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM'))&&cur.filter(l=>l.pid===c.pid).length<2&&!cur.some(l=>dkClash(l,c));
  const pay=legs=>parlayDec(legs.map(l=>({leg:l,ml:l.price})),1500);
  const ev=legs=>{ const pr=parlayProb(legs,2500).corr, d=pay(legs); return {pr,d,ev:pr*d}; };
  /* the best hand of n legs grown from start, paying at least floorDec where it can */
  const grow=(start,n,floorDec,minP)=>{
    let cur=start;
    while(cur.length<n){
      let b=null;
      for(const c of pool){ if(!fits(cur,c)) continue;
        const next=[...cur,c], e=ev(next);
        if(next.length===n&&(e.d<floorDec||e.pr<minP)) continue;
        if(!b||e.ev>b.ev) b={ev:e.ev,legs:next}; }
      if(!b) return null;
      cur=b.legs;
    }
    return cur;
  };
  const one=c=>c.p*(mlToDec(c.price)||1);
  const top=[...pool].sort((a,b)=>one(b)-one(a)).slice(0,24);
  const bestPair=(floorDec,minP)=>{ let best=null;
    for(let i=0;i<top.length;i++) for(let j=i+1;j<top.length;j++){
      if(!fits([top[i]],top[j])) continue;
      const e=ev([top[i],top[j]]); if(e.d<floorDec||e.pr<minP) continue;
      if(!best||e.ev>best.ev) best={ev:e.ev,legs:[top[i],top[j]]}; }
    return best&&best.legs; };
  const done=legs=>{ const pr=parlayProb(legs,20000);
    return {legs,corr:pr.corr,dec:parlayDec(legs.map(l=>({leg:l,ml:l.price}))),fair:parlayFair(legs,{},20000)}; };
  const val={pool:pool.length}; let prev=null;
  for(const [id,,n,floor,minP] of GAME_TIERS){
    const f=1+floor/100;
    let legs=prev?grow(prev,n,f,minP):bestPair(f,minP), relaxed=false;
    if(!legs){ legs=prev?grow(prev,n,1,0):bestPair(1,0); relaxed=!!legs; }
    if(!legs&&prev){ legs=grow([],n,1,0); relaxed=!!legs; }
    val[id]=legs?{...done(legs),relaxed,floor}:null;
    if(legs) prev=legs;
  }
  /* (app v109) the legs DraftKings' ids left out, counted where a hand came out empty */
  val.noId=GAME_TIERS.some(([id])=>!val[id])&&dkCarries({week:g.w,gid:g.id})?gameLegPool(g,true).length-pool.length:0;
  GAME_TIER_CACHE[g.id]={sig,val};
  return val;
}
/* on the parlay means this exact line, threshold and side are ticked */
const suggestLegOn=l=>{ const c=S.parlay[l.key]; return !!c&&c.k===l.k&&c.side===l.side&&!!c.main===!!l.main; };
/* (app v124) A game's page has no suggested parlays since 20 October 2026 (the owner's call: "get rid of the
   suggested parlays section from there. instead I want you to add three different buttons: Matchup, Mismatches,
   and Team Stats ... I want each button to pop up in its own little window"). Where the hub's window is on the
   page (window.gameWindow, the Game snapshot's), three buttons under the game's head each open one card in it,
   over the page: Matchup, the snapshot's Offense vs defense; Mismatches, the game's Mismatches; Team Stats, the
   season's team stats side by side on bars. The prop model's own page has no such window and draws none.
   (app v128 added a fourth, Game snapshot, and app v129 took it off again, the owner's call of 22 October 2026: the
   whole snapshot opens from the matchup bubble alone.) */
function gameWinBtns(g){
  if(typeof window.gameWindow!=='function') return '';
  const b=(k,l)=>`<button type="button" class="btn quiet gwin-btn" data-gp-pop="${k}" data-gp-game="${esc(g.id)}" aria-haspopup="dialog">${l}</button>`;
  return `<div class="gwin" role="group" aria-label="More on this game">${b('units','Matchup')}${b('mism','Mismatches')}${b('stats','Team Stats')}</div>`;
}
/* ---------- the panel, over the builder ---------- */
const pbMoney=v=>'$'+(+v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
/* a tier's payout on the amount in the box: what it pays, and on what */
function pbPayHtml(dec){ const s=pbStake(); return `<b>${pbMoney(s*dec)}</b><span>${pbAmt(s)} pays</span>`; }
/* the payouts redrawn in place as the amount is typed, the panel's tiers and the Elo picks alike
   (each card's data-pb-pay is its decimal price), so the box keeps its focus and its caret */
function pbPays(){ document.querySelectorAll('#pbPanel [data-pb-pay], #spPanel [data-pb-pay]').forEach(x=>{ x.innerHTML=pbPayHtml(+x.dataset.pbPay); }); }
/* the builder's own figures on the amount, redrawn only when they show another one; the panel is
   left as it is, so an Add to builder or Finish pressed straight after typing still lands */
function pbSyncBuilder(){ const ps=$('pStake'); if(ps&&stakeRead(ps.value)!==pbStake()) renderParlay({keepPb:true}); }
/* the games list starts open on a wide screen and shut on a phone, until the reader says otherwise */
function pbWide(){ try{ return typeof window.matchMedia!=='function'||window.matchMedia('(min-width: 761px)').matches; }catch(e){ return true; } }
/* the builder holds exactly these legs */
const pbInBuilder=legs=>Object.keys(S.parlay||{}).length===legs.length&&legs.every(l=>suggestLegOn(l));
/* (app v130) no card says why a leg is not a Value pick or why the game total is there (pbThinLine and pbMktLine went,
   the owner's call of 22 October 2026: "i dont want any descriptions anywhere"): the Value mark says which legs are */
/* (app v112) a Value pick: a leg with the 3-point edge, and market + form agreeing on a player's line, which pbPool
   puts on its preferred list with thin false (a thin one true; a total is market). It wears the one mark a leg
   has (thin edge and no edge went, the owner's call of 17 October 2026: "reverse tags"). An Elo pick's legs come
   from pricedLegs, which says neither, so none is marked: they are chosen on the Elo matchup, not the edge */
const pbIsValue=l=>!!l&&l.thin===false&&!l.market;
const pbValMark=l=>pbIsValue(l)?' <i class="pb-valmark">Value</i>':'';
window.pbIsValue=pbIsValue;
/* what a leg priced from DraftKings' line read on ESPN is, on a level's card or an Elo pick's: a price that is an
   estimate, in a few words (app v130), each such leg wearing its est. mark too; dated by the oldest read */
function pbEspnLine(legs){
  const at=legs.filter(l=>l.src==='dkline').map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0];
  return `Price est. from DraftKings’ line${at?', read '+espnWhen(at):''}.`;
}
/* what a level was chosen by, as its card says it */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  return t.likeliest?`the likeliest ${n} legs`:t.floor?`${pct}%+ by the model`:'the likeliest pair';
}
/* a level's chance as its card shows it: the book's fair chance, labelled so (est. where a leg is
   priced on one side only), with whose chance it was chosen on beside it ("model says 53%"; the Elo
   picks' "Elo says"); with no fair chance, that chance alone, saying why */
function pbChanceHtml(F,chance,o){
  const pc=v=>(v*100).toFixed(0)+'%', by=(o&&o.by)||'model';
  if(F&&F.p!=null) return `<div class="pb-chance"><b data-pb-fair="${F.p}">${pc(F.p)}</b><span${F.est?(F.dk?' title="Estimated: a leg is priced from DraftKings’ line read on ESPN by our estimate, and its fair chance with it"':' title="Estimated: a leg is priced on one side only, so the week’s typical margin is taken out of its price"'):''}>fair chance${F.est?', est.':''}</span><small class="pb-model" data-pb-model="${chance}">${esc(by)} says ${pc(chance)}</small></div>`;
  return `<div class="pb-chance"><b data-pb-model="${chance}">${pc(chance)}</b><span>${(o&&o.chanceBy)||'model’s chance'}</span><small class="pb-model">no fair chance</small></div>`;
}
/* (app v111) one leg's own Add: that leg alone into the builder, by toggleLeg's own path (the builder prices it
   as it always has), Added while it is in, a second press taking it off as on a game's page. One delegated
   listener answers it (pbLegClick), on the Parlay Builder's list and on Suggested Parlays alike */
function pbLegAddBtn(l){
  const on=suggestLegOn(l);
  return `<button type="button" class="btn quiet pb-legadd${on?' on':''}" data-pb-leg="${esc(l.key)}" data-k="${esc(l.k)}" data-side="${esc(l.side)}" data-main="${l.main?1:0}" aria-pressed="${on}" aria-label="${on?'Remove':'Add'} ${esc(l.name)}, ${esc(l.label)}, ${on?'from':'to'} the builder">${on?'Added':'Add'}</button>`;
}
/* (app v114) a leg's player, team or game, as the hub's matchup bubble opens it (the owner's "when i click on a
   player or a team, bring up a bubble pop up where it shows their matchup for the day"): on the hub's page
   (window.hubGlance, nflbets/build/glance.js) a button the bubble answers, data-glance p:<pid>, t:<ABBR> (a
   moneyline or spread) or g:<gid> (a game total), the leg's game and its signature beside it; on the prop model's
   own page the name as plain text, as before. The leg is kept as the row drew it (shown: the price the row shows,
   where it is not the leg's own), outside S and never saved, so the bubble shows the row's own numbers */
const GLANCE_LEGS=new Map();
function glanceName(l,shown){
  const nm=esc(l.name);
  if(typeof window.hubGlance!=='function') return nm;
  const kind=l.stat==='total'?'g':isGameLeg(l)?'t':'p';
  const id=kind==='g'?l.gid:kind==='t'?(l.team||String(l.pid||'').replace(/^team:/,'')):l.pid;
  const price=shown&&shown.ml!=null?shown.ml:l.price, src=shown&&shown.src?shown.src:l.src;
  const sig=[l.key,l.side,l.k,price,src,l.p!=null&&isFinite(l.p)?(+l.p).toFixed(4):''].join('|');
  GLANCE_LEGS.delete(sig); GLANCE_LEGS.set(sig,{leg:l,price,src});
  if(GLANCE_LEGS.size>600) GLANCE_LEGS.delete(GLANCE_LEGS.keys().next().value);
  const what=kind==='p'?'his matchup':kind==='t'?'the team’s matchup':'the game’s matchup';
  return `<button type="button" class="glance-name" data-glance="${kind}:${esc(id)}" data-glance-game="${esc(l.gid)}" data-glance-leg="${esc(sig)}" aria-haspopup="dialog" aria-label="${nm}: ${what}">${nm}</button>`;
}
window.glanceLeg=sig=>GLANCE_LEGS.get(String(sig))||null;
/* a locked level the page or the job built again for a player ruled out after the lock */
function spUpdLine(u){
  const at=Date.parse(u.at);
  return `Updated${u.by==='page'?' in this browser':''}: ${esc(u.name)} ${esc(u.reason||'ruled out')}${isFinite(at)?` (${spEt(at,true)})`:''}.`;
}
/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard). o.fid: the
   id its Finish names (a Suggested Parlays level's game:level); o.what: the game, for the buttons' names;
   o.legAdd false: no Add on each leg (o.quiet, a card with no line saying why a leg is not a Value pick or why a total
   is there, went in app v130: every card is so); o.acts false: no Add to builder or Finish (app v118: the Sunday slot under
   way, its first games begun); o.noun: what its buttons call it (an Elo pick's, app v118: 'Elo pick'; else 'parlay');
   o.game (app v121, the Sunday slot's cards): the game its legs are of, under its title */
function pbTierGame(gid){ const g=(S.sched||[]).find(x=>x.id===gid); if(!g) return '';
  const k=kickoff(g); return `<span class="pb-tgame" data-pb-tgame="${esc(gid)}">${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}${k?' · '+esc(spEt(k.getTime(),true)):''}</span>`; }
function pbTierCard(t,o){
  o=o||{}; const card=!!window.PARLAY_CARD, chance=o.chance!=null?o.chance:t.corr, legAdd=o.legAdd!==false;
  const upd=t.updated?`<p class="pb-thin sp-upd" data-sp-upd="${esc(t.updated.pid)}">${spUpdLine(t.updated)}</p>`:'';
  if(t.why) return `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.n} legs</span></div><p class="pb-why">${esc(t.why)}</p>${upd}</div>`;
  const fm={}, nE=t.legs.filter(l=>l.src==='dkline').length, nm=o.what?` the ${esc(t.label)} ${esc(o.noun||'parlay')} for ${esc(o.what)}`:'';
  return `<div class="pb-tier ${t.id}" data-pb-tier="${t.id}">
    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.game&&t.legs.length?pbTierGame(t.legs[0].gid):''}${o.rule||(t.floor!=null?`<span class="pb-rule">${pbRuleOf(t)}</span>`:'')}</div>
    <div class="pb-nums">${pbChanceHtml(t.fair,chance,o)}<div><b>${fmtML(decToML(t.dec))}</b><span>${nE?'price, est.':'price'}</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>
    <ul class="pb-legs">${t.legs.map(l=>{ const ff=legFarOff(l,fm); return `<li><span class="nm">${o.badge?o.badge(l):''}${glanceName(l)}<small>${esc(l.label)}${pbValMark(l)}</small>${ff?`<small class="faroff" data-pb-far>${farText(l.p,ff)}</small>`:''}</span><span class="pr">${fmtML(l.price)}${l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:''}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span>${legAdd?pbLegAddBtn(l):''}</li>`; }).join('')}</ul>
    ${nE?`<p class="pb-thin pb-espnline">${pbEspnLine(t.legs)}</p>`:''}${upd}
    ${o.acts===false?'':`<div class="pb-acts"><button type="button" class="btn ${card?'quiet':'go'}" ${o.add||`data-pb-add="${t.id}"`}${nm?` aria-label="${pbInBuilder(t.legs)?'In the builder:':'Add'}${nm}${pbInBuilder(t.legs)?'':' to the builder'}"`:''}>${pbInBuilder(t.legs)?'In the builder':'Add to builder'}</button>${card?`<button type="button" class="btn go" data-pc-finish="${o.kind||'pb'}|${o.fid||t.id}"${nm?` aria-label="Finish${nm}"`:''}>Finish</button>`:''}</div>`}</div>`;
}
window.pbTierCard=pbTierCard;
/* ---------- the Parlay Builder's Top lines (app v111; 50 since app v113, 30 since app v116) ----------
   Every leg on the reader's ticks that qualifies as a suggestion's leg does (pbLegs: a real price, or a
   tested DraftKings line read by Refresh odds on a payload baked before ids; DraftKings' id at its line
   where the payload carries ids, a line from the read included (app v119: from app v115 the list kept one
   with no id); the 45-97% band at or above the book's implied chance, preferred with the
   3-point edge and market + form, thin without; the far-off guard; V6, in pricedLegs; and, with Game total
   ticked, both sides of each ticked game's total at the book's own chance), in two parts: every preferred
   leg first, the Value picks (pbIsValue), then the other lines, every thin-edge leg (one that missed the
   3-point edge or market + form, which a level takes only as fill) and every total, each part ranked by what
   $1 on it is expected to make at the model's chance (chance times the decimal price, less the $1), best
   first, the totals after every thin-edge leg, at most PB_TOP_N in all, so a thin edge never ranks over a Value
   pick however much it pays, and a total, the book's own chance and never a Value pick, comes last (app v112:
   until then the totals ended the first part; a total priced on one side only is put at 50%, so at plus money
   its expected return is not below a thin leg's, and the order is set, not left to the sort). Each bet is
   listed once (app v112): a ladder rung k+ is the same bet as the player's main Over (k-0.5) on a half-point
   line, priced from it, so where that main line is on the list the rung is not (dormant since app v127, when
   pricedLegs stopped making rungs: the checks hold it on made-up lines). Each row keeps what $1 wins if it lands (the decimal price less 1) and the book's fair chance
   (legFair) where there is one. Cached on the levels' own signature (pbSig), so ticking back is instant,
   and a press (ESPN_SEQ is in pbDataSig, and espnRedraw drops the cache) or a kickoff rebuilds it. */
const PB_TOP_N=30;
let PB_TOP_CACHE=new Map();
function pbTopBuild(){
  const u=pbUi(), all=pbGames(), games=all.filter(g=>!u.off.includes(g.id)), kinds=PB_KINDS.map(([k])=>k).filter(k=>u.k[k]);
  const out={games:all.length,ticked:games.length,kinds:kinds.length,rows:[],pref:0,thin:0,mkt:0,far:0,farDk:0,noId:0,noIdPl:0,moved:0,movedPl:0,plNoId:0,noPlayerPrices:false,espnRead:false};
  if(!all.length||!kinds.length||!games.length) return out;
  const r=pbLegs(games,u), fm={};
  out.pref=r.pref.length; out.thin=r.thin.length; out.mkt=r.mkt.length; out.far=r.far; out.farDk=r.farDk||0;
  out.noId=r.noId||0; out.noIdPl=r.noIdPl||0; out.moved=r.moved||0; out.movedPl=r.movedPl||0; out.plNoId=r.plNoId||0;
  out.noPlayerPrices=!!(u.k.over||u.k.under)&&!r.plGames;
  out.espnRead=games.some(g=>espnWasRead(g.id,g.w));
  const rank=list=>list.map(l=>{ const dec=mlToDec(l.price); return dec>1?{...l,dec,win:dec-1,ev:l.p*dec-1,fc:legFair(l,fm)}:null; })
    .filter(Boolean).sort((a,b)=>(b.ev-a.ev)||pbOrd(a,b));
  /* (app v112) each bet once: a ladder rung k+ lands exactly when the player's main Over (k-0.5) on a half-point
     line does and is priced from it, so where that main line is on the list (either part) the rung is not, and its
     slot goes to the next line; the main line is kept, its fair chance the two-sided one (the owner, 17 October
     2026: "why there are several instances of this where it's only a half yard difference? i find it hard to
     believe that draft kings would let me bet both on the same parlay": week 6's list held seven such pairs, Patrick
     Mahomes's Over 224.5 and 225+ passing yards ranked 1 and 2 at -113 each). A level never took both (one leg a
     player) and the builder holds one leg a stat (legKey), so it was the list alone */
  const rungOf=l=>!isGameLeg(l)&&!l.main&&l.side==='over', mainOver=new Set([...r.pref,...r.thin]
    .filter(l=>!isGameLeg(l)&&l.main&&l.side==='over'&&Math.abs(l.k%1)===0.5).map(l=>`${l.gid}|${l.pid}|${l.stat}|${l.k+0.5}`));
  const once=list=>list.filter(l=>!(rungOf(l)&&mainOver.has(`${l.gid}|${l.pid}|${l.stat}|${l.k}`)));
  const P1=once(r.pref), P2=once(r.thin), P3=once(r.mkt); out.same=r.pref.length+r.thin.length+r.mkt.length-P1.length-P2.length-P3.length;
  /* the Value picks, then the other lines: the thin-edge lines, then the totals, each by expected return */
  out.rows=[...rank(P1),...rank(P2),...rank(P3)].slice(0,PB_TOP_N);
  return out;
}
function getPbTop(){
  const sig=pbSig();
  let r=PB_TOP_CACHE.get(sig);
  if(!r){ r={sig,...pbTopBuild()}; PB_TOP_CACHE.set(sig,r); if(PB_TOP_CACHE.size>24) PB_TOP_CACHE.delete(PB_TOP_CACHE.keys().next().value); }
  return r;
}
window.getPbTop=getPbTop;
/* why the list is empty, in the reader's terms */
function pbTopWhy(r,u){
  if(!r.kinds) return 'No bet types ticked: tick at least one above.';
  if(!r.ticked) return 'No games ticked: tick at least one above.';
  if((u.k.over||u.k.under)&&r.noPlayerPrices){ const np=r.plNoId?PB_NO_ID:pbNoPl(pbGames().filter(g=>!u.off.includes(g.id)).map(g=>g.id));
    return (u.k.ml||u.k.ats||u.k.total)?`No line qualifies yet: ${np}`:np[0].toUpperCase()+np.slice(1); }
  return `No line on your picks qualifies yet${r.noId?' that DraftKings’ betslip can take':''}: tick more games or bet types.`;
}
const pbMoney1=v=>(v<-0.0005?'−':'+')+'$'+Math.abs(v).toFixed(2);
function pbTopRow(l,i){
  const g=(S.sched||[]).find(x=>x.id===l.gid), pc=v=>(v*100).toFixed(0)+'%';
  const est=l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:'';
  const mark=pbValMark(l);
  return `<li class="pb-trow" data-pb-row="${i+1}" data-pb-grp="${pbIsValue(l)?'value':'other'}"><span class="pb-trk">${i+1}</span>
    <span class="nm">${glanceName(l)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}</span>
    <span class="pb-tcs"><span class="pb-tc"><b>${fmtML(l.price)}${est}</b><small>price</small></span><span class="pb-tc"><b data-pb-model="${l.p}">${pc(l.p)}</b><small>model</small></span><span class="pb-tc"><b${l.fc?` data-pb-fair="${l.fc.p}"`:''}>${l.fc?pc(l.fc.p):'–'}</b><small>${l.fc?(l.fc.est?'fair, est.':'fair'):'no fair'}</small></span><span class="pb-tc"><b data-pb-win="${l.win}">${pbMoney1(l.win)}</b><small>wins on $1</small></span><span class="pb-tc"><b data-pb-ev="${l.ev}">${pbMoney1(l.ev)}</b><small>expected on $1</small></span></span>
    ${pbLegAddBtn(l)}</li>`;
}
function pbPanel(){
  const u=pbUi(), w=currentWeek(), games=pbGames(), mix=pbMix(u);
  const head=`<div class="pb-hd"><h2>Top ${PB_TOP_N} lines</h2><span class="pill">week ${w}</span></div>`;
  if(!games.length) return `<div class="card pb" id="pbCard">${head}
    <p class="pb-none">${seasonOver()?'Regular season over.':`No week ${w} games left.`}</p></div>`;
  const r=getPbTop(), nOn=games.filter(g=>!u.off.includes(g.id)).length, open=u.gx!=null?u.gx:pbWide();
  const seg=`<span class="pb-seg" role="group" aria-label="What to build from">${PB_MIXES.map(([k,l])=>`<button type="button" class="${mix===k?'on':''}" data-pb-mix="${k}" aria-pressed="${mix===k}">${l}</button>`).join('')}</span>`;
  const chips=PB_KINDS.map(([k,l])=>`<label class="pb-chip${u.k[k]?' on':''}"><input type="checkbox" data-pb-kind="${k}" ${u.k[k]?'checked':''}><span>${l}</span></label>`).join('');
  const glist=games.map(g=>{ const on=!u.off.includes(g.id), d=fmtDate(g);
    return `<label class="pb-g${on?' on':''}"><input type="checkbox" data-pb-game="${g.id}" ${on?'checked':''} aria-label="${esc(g.a)} at ${esc(g.h)}, ${esc(d.day)} ${esc(d.t)}"><span><b>${esc(g.a)} @ ${esc(g.h)}</b><small>${esc(d.day)}${d.t?' · '+esc(d.t):''}</small></span></label>`; }).join('');
  const dkLegs=r.rows.filter(l=>l.src==='dkline');
  const notes=[];
  if(formSig()==='noform') notes.push('Loading Elo ratings…');
  if(dkLegs.length) notes.push(esc(espnReadLine(dkLegs.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null)));
  /* (app v109) player legs priced and none with a DraftKings id: the list has none of them, and why */
  const noIdNote=r.noPlayerPrices&&r.plNoId&&r.rows.length;
  const cap1=s=>s[0].toUpperCase()+s.slice(1);
  if(noIdNote) notes.push(cap1(PB_NO_ID));
  else if(r.noPlayerPrices&&r.rows.length) notes.push(cap1(pbNoPl(games.filter(g=>!u.off.includes(g.id)).map(g=>g.id))));
  if(r.far) notes.push(`${r.far} line${r.far===1?'':'s'} left out: far off the market.`);
  /* lines left out for want of a DraftKings id at their line, beyond what the note above says */
  const mvN=r.moved-(noIdNote?r.movedPl:0), noneN=r.noId-r.moved-(noIdNote?r.noIdPl-r.movedPl:0);
  if(noneN) notes.push(`${noneN} line${noneN===1?'':'s'} left out: no DraftKings id.`);
  if(mvN) notes.push(`${mvN} line${mvN===1?'':'s'} left out: DraftKings has ${mvN===1?'it':'them'} at another number.`);
  /* (app v112) two parts, each under its heading: the Value picks (the rows' prefix: the first part is the
     preferred lines alone), then the other lines, their ranks running on (the second list's start) */
  const nV=r.rows.filter(pbIsValue).length, V=r.rows.slice(0,nV), O=r.rows.slice(nV);
  const secHd=(id,title,n)=>`<h3 class="pb-topsec" data-pb-sec="${id}">${title}${n?` <span class="pill">${n}</span>`:''}</h3>`;
  const list=r.rows.length?secHd('value','Value picks',nV)
      +(nV?`<ol class="pb-top" data-pb-sec="value" aria-label="The ${nV} Value pick${nV===1?'':'s'} on your picks, by expected profit on $1">${V.map((l,i)=>pbTopRow(l,i)).join('')}</ol>`
        :`<p class="muted pb-topsub" data-pb-novalue>No line on your picks is a Value pick right now.</p>`)
      +(O.length?secHd('other','Other lines',O.length)+`<ol class="pb-top" data-pb-sec="other"${nV?` start="${nV+1}"`:''} aria-label="${nV?'Then ':''}${O.length} other line${O.length===1?'':'s'} on your picks, by expected profit on $1">${O.map((l,i)=>pbTopRow(l,nV+i)).join('')}</ol>`:'')
    :`<p class="pb-none pb-top-none">${esc(pbTopWhy(r,u))}</p>`;
  return `<div class="card pb" id="pbCard">${head}
    <div class="pb-ctl">
      <div class="pb-row pb-amt-row"><label class="pb-lbl" for="pbStake">Bet amount</label><span class="pb-amt"><span aria-hidden="true">$</span><input type="number" id="pbStake" inputmode="decimal" min="${STAKE_MIN}" max="${STAKE_MAX}" step="1" value="${stakeText(pbStake())}" autocomplete="off"></span></div>
      <div class="pb-row pb-odds-row"><span class="pb-lbl">Odds</span>${espnCtl(null,'pb')}</div>
      <div class="pb-row"><span class="pb-lbl">Build from</span>${seg}</div>
      <div class="pb-row"><span class="pb-lbl">Bet types</span><div class="pb-chips">${chips}</div></div>
      <details class="pb-games"${open?' open':''}><summary><span class="pb-lbl">Games</span><b>${nOn===games.length?`All ${games.length}`:`${nOn} of ${games.length}`}</b></summary>
        <div class="pb-gbar"><button type="button" class="btn quiet small" data-pb-games="all">All</button><button type="button" class="btn quiet small" data-pb-games="none">None</button></div>
        <div class="pb-glist">${glist}</div></details>
    </div>
    ${notes.map(t=>`<p class="pb-note">${t}</p>`).join('')}
    ${list}</div>`;
}
function renderPb(){
  const el=$('pbPanel'); if(!el||!S||!S.sched) return;
  el.innerHTML=pbPanel(); wirePb();
  PB_SHOWN=pbGames().map(g=>g.id).join();
  /* Suggested Parlays is drawn with it, so the ELO tab's wrap of renderPb (its Elo picks, in #pbElo at the
     tab's foot) still draws last */
  renderSp();
}
/* ---------- Suggested Parlays (#suggest, app v111): each prime-time game's own four parlays ----------
   A game of the week still to come that kicks off on a Thursday, Sunday or Monday at or after 7:00 pm US
   Eastern (spPrime; g.d and g.t are Eastern): Thursday, Sunday and Monday night football, both games of a
   Monday doubleheader, Thanksgiving's and Christmas's night games; never a day game and never a Saturday. Its
   set is the panel's four levels on that game's lines alone and every bet type (SP_ALL, whatever the Parlay
   Builder's boxes say, so the page and the record agree), searched wider than the panel (SP_SEARCH), every
   leg's rule kept (pbPool, pricedLegs). Live until 2 hours before kickoff (spLockAt), then the site's locked
   set from the record, or the page's own kept in the browser where the record has none (spShown).
   (app v118, the owner's calls of 19 October 2026: "I would like it to have ELO picks for the slot of Sunday games",
   and "do a separate section for night games and then the sunday slot of games".) The tab is two sections, Night
   games and the Sunday slot, each with its own record. The Sunday slot (spSlotUnit) is every Sunday game of a week
   that kicks off before 7:00 pm Eastern (the 1pm and 4pm windows, and a game abroad that morning), one set of the four
   levels over them (since app v121 each level one game's legs, the best of its games' own sets: spSlotBuild), locked 2 hours before its
   first kickoff and set out from 6:00 AM Eastern on the morning after the night game before it (Friday's, after
   Thursday night's), to its last kickoff: from its first kickoff its set is shown as it locked, under way, with no
   Add or Finish (its first games have started). A night game or the slot is a unit: a schedule game, or the slot's
   own object (id <season>_<WW>_SUN, d and t its first kickoff's, games). Every unit carries the Elo picks too, the
   ELO tab's four levels on that unit's games alone (window.eloUnit; until app v118 one set over the games and player
   sides ticked on the Parlay Builder tab, at the tab's foot, which a reader with the priced games unticked saw empty
   all of Sunday 18 October 2026), locked, kept, replaced and recorded with the model's. */
const SP_LOCK_H=2, SP_LOCK_MS=SP_LOCK_H*3600e3;
const SP_ALL={k:Object.fromEntries(PB_KINDS.map(([k])=>[k,true])),off:[],gx:null};
/* one game's lists are short (some 20 to 60 legs once its player prices are in), so a set is searched far
   harder than the panel's: every list to 60 legs, a beam of 200 by return and by chance and 400 for the
   likeliest (the panel's 12 and 24), its best 4 and 10 worked by the real sums (the panel's 3 and 8). The
   beam costs little; the real sums' draws are most of the second or so a priced game takes (week 5's Bills
   at Rams, 26 legs: 1.1 s in jsdom, 1.0 s at the panel's widths, the same four parlays). The props job pays
   it once a game a run; the page only while the tab is on the screen (renderSp) */
const SP_SEARCH={cap:60,beam:200,wide:400,likely:4,final:10};
/* (app v121) the Sunday slot has no search of its own: each of its games' sets is built as a night game's is (spSet),
   and each of its levels is the best of theirs (spSlotBuild) */
const SP_NIGHT={4:'Thursday night',0:'Sunday night',1:'Monday night'};
let SP_CACHE=new Map(), SP_SHOWN=null;
function spDow(g){ return g&&g.d?new Date(g.d+'T12:00:00Z').getUTCDay():null; }
function spPrime(g){ const d=spDow(g); return d!=null&&SP_NIGHT[d]!=null&&typeof g.t==='string'&&/^\d\d:\d\d$/.test(g.t)&&g.t>='19:00'; }
/* the week's prime-time games still to kick off (and with no score), in kickoff order */
function spGames(){ return pbGames().filter(spPrime); }
/* (app v118) a week's Sunday slot: its Sunday games kicking off before 7:00 pm Eastern, in kickoff order (the
   schedule's on a tie); null where it has none */
const spSlotId=w=>`${SEASON}_${String(w).padStart(2,'0')}_SUN`;
function spSlotGames(w){ return (S.sched||[]).filter(g=>+g.w===+w&&spDow(g)===0&&typeof g.t==='string'&&/^\d\d:\d\d$/.test(g.t)&&g.t<'19:00'&&kickoff(g))
  .map((g,i)=>({g,i})).sort((a,b)=>(kickoff(a.g)-kickoff(b.g))||(a.i-b.i)).map(x=>x.g); }
function spSlotUnit(w){ const G=spSlotGames(w); if(!G.length) return null; const f=G[0];
  return {id:spSlotId(w),slot:true,w:+f.w,d:f.d,t:f.t,games:G,last:Math.max(...G.map(g=>kickoff(g).getTime()))}; }
/* a unit by its id: the Sunday slot's (of this season), or a game of the schedule; the games it stands on */
function spUnit(id){ id=String(id||''); const m=/^(\d{4})_(\d\d)_SUN$/.exec(id); if(m) return +m[1]===SEASON?spSlotUnit(+m[2]):null;
  return (S.sched||[]).find(g=>g.id===id)||null; }
const spGamesOf=u=>u?(u.slot?u.games:[u]):[];
const spUnitName=u=>u.slot?`week ${u.w}’s Sunday slot`:`${u.a} at ${u.h}`;
function spLockAt(g){ const k=kickoff(g); return k?k.getTime()-SP_LOCK_MS:null; }
const spIso=ms=>new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');
/* a time in US Eastern, as the schedule is ("Sun 6:20 PM ET") */
function spEt(ms,day){ try{ return new Date(ms).toLocaleString('en-US',{timeZone:'America/New_York',...(day?{weekday:'short'}:{}),hour:'numeric',minute:'2-digit'})+' ET'; }catch(e){ return spIso(ms).slice(11,16)+' UTC'; } }
/* (app v125) why a unit has no player line: DraftKings had posted none when its lines were last read from ESPN (the
   published read or a press), or they have not been read; on a payload whose bake wrote paid ids (dormant), none
   with an id */
function spNoPl(g){ return noPlSay(espnLastRead(spGamesOf(g).map(x=>x.id)))+'.'; }
/* why a level of one unit has no parlay: the unit does not make that many legs, and why */
function spWhy(n,pool,g){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]), where=g.slot?'the Sunday slot':'this game';
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  if(!pool.plGames) return `${what}: ${pool.plNoId?'no player leg with a DraftKings id.':spNoPl(g)}`;
  /* (app v121) legs enough in number, but not on one slip */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])<n) return `No ${n} of this game’s legs go together on DraftKings’ slip.`;
  return `${what}.`;
}
function spBuild(g){
  if(g.slot) return spSlotBuild(g);
  const pool=pbPool([g],SP_ALL,SP_SEARCH), memo=new Map();
  const tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; });
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0,
    max:pbMaxLegs([...pool.pref,...pool.thin,...pool.mkt]),fit:pbMaxFit([...pool.pref,...pool.thin,...pool.mkt])};
}
/* (app v121) the Sunday slot, one game a level (the owner, 19 October 2026: "the legs need to be part of the same game
   parlay only, and anytime there's a mix it bombs the hyperlink"): each of its games' own set, built exactly as a night
   game's is (spSet on the game), and each level the best of theirs: a parlay before none; one without a game total
   before one with one; one that meets its floor before the likeliest of its size; the fewer thin legs; then the better
   expected return (chance times price) where it met a floor, else the higher chance (Safe's, and a likeliest one's); then
   the earlier game of the slot. Within one game that is the order its own search keeps (pbTierOf, pbBestReturn,
   pbLikeliest), so the slot's level is the best same-game parlay its games make by the set's own rule */
const spSlotKey=(r,floor)=>[r.mkt?1:0,floor&&r.likeliest?1:0,r.thin||0];
function spSlotBetter(a,b,floor){
  const ka=spSlotKey(a,floor), kb=spSlotKey(b,floor);
  for(let i=0;i<ka.length;i++) if(ka[i]!==kb[i]) return ka[i]<kb[i];
  const v=r=>floor&&!r.likeliest?r.corr*r.dec:r.corr; return v(a)>v(b);
}
function spSlotBuild(u){
  const per=u.games.map(x=>spSet(x.id)).filter(Boolean), sum=k=>per.reduce((a,s)=>a+(+s[k]||0),0);
  const tiers=PB_TIERS.map((t,ti)=>{ const [id,label,n,floor]=t; let best=null;
    for(const s of per){ const r=s.tiers[ti]; if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best=r; }
    return best?{...best}:{id,label,n,floor,why:spWhySlot(n,per,u)}; });
  return {gid:u.id,tiers,pref:sum('pref'),thin:sum('thin'),mkt:sum('mkt'),far:sum('far'),farDk:sum('farDk'),noId:sum('noId'),moved:sum('moved'),plGames:sum('plGames'),plNoId:sum('plNoId'),
    max:Math.max(0,...per.map(s=>s.max||0)),fit:Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit)),games:per.map(s=>s.gid)};
}
/* one level of the Sunday slot built again now (spRebuild): each game's level from its lines as they stand, never the
   cache, the best of them by the slot's rule */
function spSlotLevel(u,t){
  const [id,label,n,floor]=t, per=[]; let best=null;
  for(const x of u.games){ const gx=spUnit(x.id); if(!gx) continue;
    const pool=pbPool([gx],SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH), all=[...pool.pref,...pool.thin,...pool.mkt];
    per.push({noId:pool.noId||0,plGames:pool.plGames,plNoId:pool.plNoId||0,max:pbMaxLegs(all),fit:pbMaxFit(all)});
    if(r&&r.legs&&r.legs.length&&(!best||spSlotBetter(r,best,floor))) best={id,label,n,floor,...r}; }
  return best||{id,label,n,floor,why:spWhySlot(n,per,u)};
}
/* why a level of the Sunday slot is empty: none of its games makes that many legs (one game's legs a parlay), and why */
function spWhySlot(n,per,u){
  const m=Math.max(0,...per.map(s=>s.max||0)), noId=per.some(s=>s.noId), pl=per.some(s=>s.plGames), plNoId=per.some(s=>s.plNoId);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in any one game of the Sunday slot${noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in any one game of the Sunday slot`;
  if(!pl) return `${what}: ${plNoId?'no player leg with a DraftKings id.':spNoPl(u)}`;
  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  if(m>=n&&f<n) return `No ${n} legs of any one game of the Sunday slot go together on DraftKings’ slip.`;
  return `${what}.`;
}
/* a unit's live set, the same for the same data (the searches are seeded), from the cache when nothing it
   stands on has moved: its games' kickoffs and pbDataSig (the publish, the Elo files, ESPN_SEQ) */
const spSig=g=>[g.id,...spGamesOf(g).map(x=>x.id+'@'+(x.d||'')+'T'+(x.t||'')),pbDataSig()].join('|');
function spSet(gid){
  const g=spUnit(gid); if(!g) return null;
  const sig=spSig(g);
  let r=SP_CACHE.get(sig);
  if(!r){ r={sig,...spBuild(g)}; SP_CACHE.set(sig,r); if(SP_CACHE.size>48) SP_CACHE.delete(SP_CACHE.keys().next().value); }
  return r;
}
/* (app v118) a unit's Elo picks as they stand: the ELO tab's four levels on its games alone (window.eloUnit, cached
   there on its candidates), each id elo-<level>; null where the ELO tab is not on the page or its files are not in
   yet; {wait:true} with o.kept where they are not built yet (a hidden tab builds nothing) */
const spEloOn=()=>typeof window.eloUnit==='function';
function spEloSet(gid,o){ const u=spUnit(gid); if(!u||!spEloOn()) return null;
  let r=null; try{ r=window.eloUnit(spGamesOf(u).map(g=>g.id),{where:u.slot?'in the Sunday slot':'in this game',perGame:!!u.slot,...(o||{})})||null; }catch(e){ console.error(e); return null; }
  /* an empty level where the unit has no player prices yet (a pick is a player's line) says when they come, as the
     model's levels do */
  if(r&&!r.error&&Array.isArray(r.tiers)&&r.tiers.some(t=>!t.legs)){ const s=spSet(gid);
    if(s&&!s.plGames){ const where=u.slot?'in the Sunday slot':'in this game', t=espnLastRead(spGamesOf(u).map(x=>x.id));
      const why=s.plNoId?`No player leg with a DraftKings id ${where}.`:t?`No player lines ${where} yet (read ${espnWhen(t)}).`:`No player lines ${where} read yet.`;
      r={...r,tiers:r.tiers.map(x=>x.legs?x:{...x,why})}; } }
  return r; }
/* one level of a unit built again now, from the lines at hand (a locked level holding a player ruled out): a model
   level or an Elo pick's */
function spRebuild(gid,id){
  const g=spUnit(gid); if(!g) return null;
  if(/^elo-/.test(String(id))){ const e=spEloSet(gid); return e&&Array.isArray(e.tiers)?e.tiers.find(t=>t.id===id)||null:null; }
  const t=PB_TIERS.find(s=>s[0]===id); if(!t) return null;
  /* (app v121) the Sunday slot's level is the best of its games' own, built the same way */
  if(g.slot) return spSlotLevel(g,t);
  const pool=pbPool(spGamesOf(g),SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH);
  return r?{id:t[0],label:t[1],n:t[2],floor:t[3],...r}:{id:t[0],label:t[1],n:t[2],floor:t[3],why:spWhy(t[2],pool,g)};
}
/* a player the page's own rules keep out of every suggestion (suggestable: Out or Doubtful on the latest
   report, inactive, held out until cleared, questionable): why, in a few words; null when he plays */
function spOutWhy(pid){
  if(suggestable(pid)) return null;
  if(S.inactive&&S.inactive[pid]) return inactiveWhy(S.inactive[pid]);
  const t=INJ[pid]; return t&&t.k==='q'?'listed questionable, so held out':(t&&t.k==='dnp'?'did not practise, so held out':'held out');
}
/* a level as the record and the browser keep it (the shape suggest_ledger.js writes), and back. A leg
   kept is {gid, week, pid, team, grp, stat, k, side, main, price, src, name, label, p, fair, fair_est, thin,
   market}; a level {id, label, n, floor, legs, p, fair, fair_est, dec, likeliest, thin, mkt} or {id, label,
   n, floor, why}, a level built again carrying `updated`. An Elo pick's (id elo-<level>) keeps each leg's Elo chance
   (pe) beside the model's, its thin and market null (it is chosen on the Elo matchup, never marked a Value pick), and
   its p is the Elo chance all land */
const spR=(v,d)=>v==null||!isFinite(v)?null:Math.round(v*d)/d;
const spIsElo=t=>!!t&&/^elo-/.test(String(t.id||''));
function spLegOut(l,memo,elo){ const f=legFair(l,memo);
  return {gid:l.gid,week:l.week,pid:l.pid,team:l.team,grp:l.grp,stat:l.stat,k:l.k,side:l.side,main:!!l.main,price:l.price,src:l.src,name:l.name,label:l.label,
    p:spR(l.p,1e4),...(elo?{pe:spR(l.pe,1e4)}:{}),fair:f?spR(f.p,1e4):null,fair_est:!!(f&&f.est),thin:elo?null:!!l.thin,market:elo?null:!!l.market}; }
function spTierOut(t){ const memo={}, elo=spIsElo(t);
  if(!t||!t.legs||!t.legs.length) return {id:t.id,label:t.label,n:t.n,floor:t.floor,why:t.why};
  return {id:t.id,label:t.label,n:t.n,floor:t.floor,legs:t.legs.map(l=>spLegOut(l,memo,elo)),p:spR(elo?t.p:t.corr,1e4),fair:t.fair&&t.fair.p!=null?spR(t.fair.p,1e4):null,
    fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:elo?0:(t.thin||0),mkt:elo?0:(t.mkt||0),...(t.updated?{updated:t.updated}:{})}; }
function spLegIn(l,g){
  const G=spGamesOf(g), lg=l&&typeof l==='object'?G.find(x=>x.id===l.gid):null;
  if(!lg||typeof l.pid!=='string'||typeof l.stat!=='string') return null;
  const p=+l.p, price=+l.price; if(!(p>0&&p<1)||!isFinite(price)||price===0) return null;
  const elo=l.pe!=null, pe=+l.pe; if(elo&&!(pe>0&&pe<1)) return null;
  const tot=l.stat==='total', team=String(l.team||''), pl=S.players&&S.players[l.pid];
  /* (app v125) kept: the leg is at its locked price and fair chance through any later publish or press (legPrice,
     legFair), so Add to builder pays what the locked card says; the record's own shape is untouched */
  const kf=l.fair!=null&&isFinite(+l.fair)&&+l.fair>0&&+l.fair<1?+l.fair:null;
  return {key:legKey(l.gid,l.pid,l.stat),gid:l.gid,pid:l.pid,stat:l.stat,k:+l.k,side:l.side==='under'?'under':'over',main:!!l.main,p,price,src:typeof l.src==='string'?l.src:'real',
    kept:{fair:kf,est:!!l.fair_est},
    mu:tot?lg.tot:null,name:String(l.name||''),pos:l.grp==='TEAM'?'Game':((pl&&pl.pos)||String(l.grp||'')),grp:String(l.grp||''),team,opp:tot?lg.h:(team===lg.h?lg.a:lg.h),
    week:+l.week||+lg.w,label:String(l.label||''),...(elo?{pe}:{thin:!!l.thin,...(l.market?{market:true}:{})})};
}
const SP_IN=new Map();
function spTierIn(t,g){
  const elo=spIsElo(t), spec=t&&PB_TIERS.find(s=>(elo?'elo-':'')+s[0]===t.id); if(!spec) return null;
  const head={id:t.id,label:spec[1],n:spec[2],floor:elo?(isFinite(+t.floor)?+t.floor:spec[3]):spec[3]};
  const U=t.updated&&typeof t.updated==='object'?{updated:{pid:String(t.updated.pid||''),name:String(t.updated.name||''),reason:String(t.updated.reason||''),at:String(t.updated.at||''),...(t.updated.by==='page'?{by:'page'}:{})}}:{};
  if(!Array.isArray(t.legs)) return {...head,why:typeof t.why==='string'&&t.why?t.why:`No parlay of this size in ${g.slot?'the Sunday slot':'this game'}.`,...U};
  const legs=t.legs.map(l=>spLegIn(l,g)); if(legs.length!==spec[2]||legs.some(l=>!l)||(elo&&legs.some(l=>l.pe==null))) return null;
  if(!(+t.dec>1)||!(+t.p>0&&+t.p<=1)) return null;
  /* the chance and price worked out again on the legs as kept (each its own chance and price), by the builder's
     own sums (parlayProb, parlayDec), so a locked level states what Add to builder and Finish then pay: the kept
     figures are rounded (4 places a chance, 3 a price), which on $37.50 moved a payout a cent off the builder's.
     The fair chance is the one kept, the book's at the lock, so a press after it moves nothing of the set. The
     record grades on its own kept figures; this is only how the page draws them. An Elo pick's chance is worked on
     its legs' Elo chances, as the ELO tab works it. Cached on the kept level and the data (pbDataSig), since a
     locked set is read back on every draw */
  const L=pbOrder(legs), ck=[JSON.stringify(t),g.id,pbDataSig()].join('|'), was=SP_IN.get(ck);
  const sum=was||(()=>{ const pr=parlayProb(elo?L.map(l=>({...l,p:l.pe})):L); return {corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price})))}; })();
  if(!was){ SP_IN.set(ck,sum); if(SP_IN.size>64) SP_IN.delete(SP_IN.keys().next().value); }
  const fair=t.fair!=null&&isFinite(+t.fair)?{p:+t.fair,est:!!t.fair_est}:null;
  if(elo) return {...head,legs:L,p:sum.corr,dec:sum.dec,fair,...(t.likeliest?{likeliest:true}:{}),...U};
  return {...head,legs:L,corr:sum.corr,indep:sum.indep,dec:sum.dec,fair,likeliest:!!t.likeliest,
    thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length,...U};
}
/* the site's locked set for a unit: its entry in the record (the prime map for a night game, the slot map for the
   Sunday slot), of this season and the unit's kickoff as it stands, taken before the lock (the job writes none
   after it), the last such key */
function spLedgerOf(g){
  const P=PB_REC&&pbIsMap(PB_REC[g.slot?'slot':'prime'])?PB_REC[g.slot?'slot':'prime']:null; if(!P) return null;
  const lock=spLockAt(g), kick=spIso(kickoff(g).getTime()); let e=null;
  for(const k of Object.keys(P).sort()){ const x=P[k];
    if(!pbIsMap(x)||x.gid!==g.id||+x.season!==SEASON||x.kickoff!==kick||!Array.isArray(x.tiers)) continue;
    if(x.taken_at!=null&&!(Date.parse(x.taken_at)<lock)) continue;
    e=x; }
  return e;
}
/* what this browser keeps of a locked unit (props_sp_lock_v1, outside S and never sent anywhere): the set the
   page built where the record had none (own), its Elo picks where the record has none of them (elo, eloOwn), and the
   levels the page built again for a player ruled out (rep), per unit, under the unit's kickoff; a unit that has
   kicked off (the slot: its last game), or is off the schedule, is pruned on every write. Held in memory too
   (SP_KEEP), so a browser that keeps nothing still shows one set a load */
const SP_KEEP_KEY='props_sp_lock_v1';
let SP_KEEP=null;
function spKeep(){
  if(SP_KEEP) return SP_KEEP;
  SP_KEEP={};
  try{ const v=JSON.parse(localStorage.getItem(SP_KEEP_KEY)||'null');
    if(v&&v.v===1&&+v.season===SEASON&&pbIsMap(v.games)) for(const [id,x] of Object.entries(v.games)) if(pbIsMap(x)&&typeof x.kickoff==='string') SP_KEEP[id]=x; }catch(e){}
  return SP_KEEP;
}
function spKeepSave(){
  const now=Date.now(), out={};
  for(const [id,x] of Object.entries(SP_KEEP||{})){ const g=spUnit(id), k=g&&kickoff(g), end=g&&g.slot?g.last:(k&&k.getTime());
    if(k&&x.kickoff===spIso(k.getTime())&&now<end) out[id]=x; else delete SP_KEEP[id]; }
  try{ if(!Object.keys(out).length) localStorage.removeItem(SP_KEEP_KEY); else localStorage.setItem(SP_KEEP_KEY,JSON.stringify({v:1,season:SEASON,games:out})); }catch(e){}
}
/* a unit's set as the tab shows it: live before the lock; from it, the site's locked set (the record's), or,
   with none, the page's own built once and kept; a locked level holding a player ruled out since built again,
   that level only (the record's own replacement where the job made one, else the page's, kept). The same for its
   Elo picks (elo), the record's where its entry holds them, else the page's own kept beside the set (eloOwn); under:
   the Sunday slot once its first game has kicked off (shown as it locked, nothing to add). Nothing is built of the
   page's own once the slot is under way (its games begun, a set built then would be of the games left, never locked:
   none, eloNone say the site's was not published), nor before the Elo files are in (a set built without the ratings has
   no player legs, market + form deciding them: the tab says it is loading until they are), and no level is built again
   for a player ruled out once it is under way, as the record replaces none after the first kickoff */
function spShown(g){
  const lock=spLockAt(g), now=Date.now(), eon=spEloOn();
  const under=!!g.slot&&now>=kickoff(g).getTime(), eloPend=eon&&window.eloUnit([],{})==null;
  if(lock==null||now<lock){ const s=spSet(g.id), e=eon?spEloSet(g.id):null; return {phase:'live',lock,tiers:s?s.tiers:[],elo:e&&Array.isArray(e.tiers)?e.tiers:null,eloErr:e&&e.error||null}; }
  if(!PB_REC_DONE) return {phase:'loading',lock,tiers:null,elo:null};
  const K=spKeep(), kick=spIso(kickoff(g).getTime()); let k=K[g.id]&&K[g.id].kickoff===kick?K[g.id]:null, dirty=false;
  const e=spLedgerOf(g); let tiers=null, own=false, at=null, elo=null, eloOwn=false;
  if(e){ const T=PB_TIERS.map(([id])=>spTierIn(e.tiers.find(t=>t&&t.id===id),g));
    if(T.every(Boolean)){ tiers=T; at=e.taken_at||null; if(k&&k.own){ k={kickoff:kick,rep:{},...(k.eloOwn?{elo:k.elo,eloOwn:true,eloAt:k.eloAt}:{})}; K[g.id]=k; dirty=true; } } }
  if(!tiers&&k&&k.own&&Array.isArray(k.tiers)){ const T=PB_TIERS.map(([id])=>spTierIn(k.tiers.find(t=>t&&t.id===id),g));
    if(T.every(Boolean)){ tiers=T; own=true; at=k.at||null; } }
  if(!tiers&&under) return {phase:'locked',lock,tiers:null,elo:null,none:true,under};
  if(!tiers&&eloPend) return {phase:'loading',lock,tiers:null,elo:null};
  if(!tiers){ const s=spSet(g.id), out=s.tiers.map(spTierOut);
    tiers=PB_TIERS.map(([id],i)=>spTierIn(out.find(t=>t.id===id),g)||s.tiers[i]);
    k={kickoff:kick,own:true,at:spIso(now),tiers:out,rep:{},...(k&&k.eloOwn?{elo:k.elo,eloOwn:true,eloAt:k.eloAt}:{})}; K[g.id]=k; dirty=true; own=true; at=k.at; }
  /* the Elo picks: the record's, else the page's own kept, else built once now and kept (only where the ELO tab
     can build them: its files in) */
  const eIn=list=>{ if(!Array.isArray(list)) return null; const T=PB_TIERS.map(([id])=>spTierIn(list.find(t=>t&&t.id==='elo-'+id),g)); return T.every(Boolean)?T:null; };
  if(e&&Array.isArray(e.elo)){ elo=eIn(e.elo); if(elo&&k&&k.eloOwn){ delete k.elo; delete k.eloOwn; delete k.eloAt; dirty=true; } }
  if(!elo&&k&&k.eloOwn){ elo=eIn(k.elo); if(elo) eloOwn=true; }
  let eloErr=null;
  if(!elo&&eon&&!under&&!eloPend){ const s=spEloSet(g.id); if(s&&s.error) eloErr=s.error; if(s&&Array.isArray(s.tiers)){ const out=s.tiers.map(spTierOut);
    elo=eIn(out)||s.tiers; eloOwn=true; if(!k){ k={kickoff:kick,rep:{}}; K[g.id]=k; } k.elo=out; k.eloOwn=true; k.eloAt=spIso(now); dirty=true; } }
  const rep=k&&pbIsMap(k.rep)?k.rep:{};
  const swap=list=>list.map(t=>{
    let cur=t, upd=null; const r=rep[t.id];
    /* the page's own replacement, unless the record has made one for the same player */
    if(r&&pbIsMap(r.tier)){ const T=spTierIn(r.tier,g);
      if(T&&!(t.updated&&t.updated.pid===r.pid)){ cur=T; upd={pid:String(r.pid),name:String(r.name||''),reason:String(r.reason||''),at:String(r.at||''),by:'page'}; }
      else { delete rep[t.id]; dirty=true; } }
    const out=!under&&cur.legs&&cur.legs.find(l=>!isGameLeg(l)&&spOutWhy(l.pid));
    if(out){ const why=spOutWhy(out.pid), nt=spRebuild(g.id,t.id);
      if(nt){ const at2=spIso(now);
        rep[t.id]={pid:out.pid,name:out.name,reason:why,at:at2,tier:spTierOut(nt)}; dirty=true;
        cur=spTierIn(rep[t.id].tier,g)||nt; upd={pid:out.pid,name:out.name,reason:why,at:at2,by:'page'}; } }
    return upd?{...cur,updated:upd}:cur;
  });
  tiers=swap(tiers); if(elo) elo=swap(elo);
  if(dirty){ if(!k){ k={kickoff:kick,rep:{}}; K[g.id]=k; } k.rep=rep; spKeepSave(); }
  return {phase:'locked',lock,tiers,elo,own,at,ledger:!!e,eloOwn,eloErr:elo?null:eloErr,eloNone:!!eon&&!elo&&!eloErr&&under,under};
}
/* (app v112) one night at a time (the owner's call of 17 October 2026: "just show the next night game dont stack the
   monday night game until monday morning"). The tab shows the games of the next prime-time night still to
   kick off (spGames' first Eastern date: both games of a Monday doubleheader), and only from SP_OPEN_H, 6:00 AM
   Eastern, on the morning after the prime-time night before it on the schedule (any week, played or not; none
   before it, at once): Sunday night's set from Friday morning, Monday night's from Monday morning, Thursday's
   from Tuesday morning. Until then the tab says which game is next and when its set goes up. The record is
   untouched: the props job takes, locks and grades every prime-time game's set (spGames, spSet), shown or not.
   (app v118) The Sunday slot goes up by the same rule, on the morning after the night before its Sunday (Friday's) */
const SP_OPEN_H=6;
/* when a set for Eastern date D goes up: 6:00 AM Eastern on the day after the latest prime-time night before D on
   the schedule (null, at once, where there is none) */
function spOpenAt(D){
  const prev=(S.sched||[]).filter(g=>spPrime(g)&&g.d<D).map(g=>g.d).sort().pop()||null;
  let open=null;
  if(prev){ const n=new Date(prev+'T12:00:00Z'); n.setUTCDate(n.getUTCDate()+1); const day=n.toISOString().slice(0,10);
    const t=new Date(`${day}T${String(SP_OPEN_H).padStart(2,'0')}:00:00${easternOffset(day)}`).getTime(); open=isFinite(t)?t:null; }
  return {open,prev};
}
function spNight(){
  const G=spGames(); if(!G.length) return {games:[],open:null,prev:null,up:false};
  const D=G[0].d, games=G.filter(g=>g.d===D), {open,prev}=spOpenAt(D);
  return {games,open,prev,up:open==null||Date.now()>=open};
}
/* the games the tab sets out now */
function spOn(){ const n=spNight(); return n.up?n.games:[]; }
/* (app v118) the Sunday slot the tab is on: the current week's, else the next week's, whose last game is still to
   kick off, with when it goes up (spOpenAt on its Sunday) and whether it is up; null with none */
function spSlotNext(){
  const w0=currentWeek();
  for(const w of [w0,w0+1]){ const u=spSlotUnit(w); if(!u||!u.games.some(g=>!gameStarted(g)&&!hasScore(g))) continue;
    const {open,prev}=spOpenAt(u.d); return {...u,open,prev,up:open==null||Date.now()>=open}; }
  return null;
}
/* the units the tab sets out now: the night's games, then the Sunday slot once it is up */
function spOnAll(){ const s=spSlotNext(); return [...spOn(),...(s&&s.up?[s]:[])]; }
/* a level by the id its Finish names (unit id:level), as the tab shows it; the card reads it. Only a unit on the
   screen, and not the Sunday slot under way: a set the tab does not show yet, or whose games have begun, is not
   finished from it. An Elo pick's (elo-<level>) carries elo */
function spTier(fid){
  const s=String(fid||''), i=s.lastIndexOf(':'); if(i<0) return null;
  const g=spOnAll().find(x=>x.id===s.slice(0,i)); if(!g) return null;
  const v=spShown(g); if(v.under) return null;
  const lv=s.slice(i+1), t=[...(v.tiers||[]),...(v.elo||[])].find(x=>x&&x.id===lv);
  return t&&t.legs&&t.legs.length?{...t,game:g.slot?`the Sunday slot`:`${g.a} at ${g.h}`,...(spIsElo(t)?{elo:true}:{})}:null;
}
/* what the tab stands on beyond the data: the games to come and which side of its lock each is, and the games it
   sets out (app v112: the morning's turn to the next night redraws an open page); the Sunday slot's side of its
   opening, its lock and its first kickoff (app v118) */
function spState(){ const now=Date.now(), s=spSlotNext();
  return spGames().map(g=>g.id+(now<spLockAt(g)?':l':':k')).concat('on='+spOn().map(g=>g.id).join('+'),
    's='+(s?s.id+(!s.up?':w':now<spLockAt(s)?':l':now<kickoff(s).getTime()?':k':':u'):'')).join(); }
/* a set's kickoff in US Eastern, as its lock is said, so the two read on one clock wherever the visitor is
   (fmtDate gives the visitor's own: on Pacific time a Sunday night game read "5:20 PM PDT" over "Locks Sun
   6:20 PM ET", a lock that looked later than its kickoff) */
function spKickEt(g){ const k=kickoff(g); if(!k) return fmtDate(g);
  try{ return {day:k.toLocaleDateString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'}),t:k.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET'}; }
  catch(e){ return fmtDate(g); } }
/* a unit's head: a night game's teams, its night and kickoff; the Sunday slot's week, games and window */
function spHdHtml(g){
  const d=spKickEt(g);
  if(!g.slot) return `<div class="sp-hd"><h4 id="spg-${esc(g.id)}">${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}</h4><span class="pill">${SP_NIGHT[spDow(g)]}</span><small>${esc(d.day)}${d.t?' · '+esc(d.t):''}</small></div>`;
  const e=spKickEt({d:g.games[g.games.length-1].d,t:g.games[g.games.length-1].t});
  return `<div class="sp-hd"><h4 id="spg-${esc(g.id)}">Week ${g.w}, ${g.games.length} game${g.games.length===1?'':'s'}</h4><span class="pill">Sunday slot</span><small>${esc(d.day)}${d.t?' · '+esc(d.t)+(e.t&&e.t!==d.t?' to '+esc(e.t):''):''}</small></div>`;
}
function spGameHtml(g,on){
  const lk=spLockAt(g), live=lk!=null&&Date.now()<lk, eon=spEloOn();
  const open=`<div class="sp-game${g.slot?' sp-slot':''}" role="group" data-sp-game="${esc(g.id)}" aria-labelledby="spg-${esc(g.id)}">${spHdHtml(g)}`;
  /* a hidden tab draws a live set only once it is built: the tab builds it when it is opened */
  if(!on&&live&&(!SP_CACHE.has(spSig(g))||(eon&&(spEloSet(g.id,{kept:true})||{}).wait))) return `${open}<p class="sp-lock" data-sp-phase="wait">Built when this tab is open.</p></div>`;
  const v=spShown(g), what=g.slot?'the Sunday slot':`${g.a} at ${g.h}`, lockT=v.lock!=null?spEt(v.lock,true):'';
  /* (app v113) one short line each: the owner's "get rid of all the long paragraph description stuff" */
  /* (app v130) and its state alone: when it locks, whose set it is (the owner's call of 22 October 2026) */
  const mark='<span class="sp-lockmark">Locked</span>';
  const line=v.phase==='live'?`<p class="sp-lock" data-sp-phase="live">Locks ${lockT}.</p>`
    :v.phase==='loading'?`<p class="sp-lock" data-sp-phase="loading">${mark} since ${lockT}. Loading the site’s set…</p>`
    :v.under?`<p class="sp-lock" data-sp-phase="under">${mark} since ${lockT}. Under way since ${spEt(kickoff(g).getTime(),true)}.${v.none?' Not published in time.':v.own?' This browser’s own set (not graded).':''}</p>`
    :v.own?`<p class="sp-lock" data-sp-phase="own">${mark} since ${lockT}. This browser’s own set (not graded).</p>`
    :`<p class="sp-lock" data-sp-phase="locked">${mark} since ${lockT}.</p>`;
  /* under way, the levels are shown as they locked, with nothing to add or finish */
  const ro=v.under?{acts:false,legAdd:false}:{};
  const cards=v.tiers?`<h5 class="sp-sub" data-sp-kind="model">Model parlays</h5><div class="pb-tiers" data-sp-kind="model">${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,game:!!g.slot,...ro})).join('')}</div>`:'';
  /* the Elo picks, where the ELO tab is on the page: its cards' own options (eloCardOpt: the Elo chance, each
     player's shield), the set's buttons */
  const eloCards=!eon||!v.tiers?'':`<h5 class="sp-sub" data-sp-kind="elo">Elo picks</h5>${v.eloErr?`<p class="pb-why" data-sp-elo-err>${esc(v.eloErr)}</p>`:v.eloNone?`<p class="pb-why" data-sp-elo-none>Elo picks not published in time.</p>`:v.elo?`${v.eloOwn&&v.phase==='locked'&&!v.own?`<p class="sp-lock" data-sp-phase="eloown">This browser’s own Elo picks (not graded).</p>`:''}<div class="pb-tiers" data-sp-kind="elo">${v.elo.map(t=>pbTierCard(t,{...(typeof window.eloCardOpt==='function'?window.eloCardOpt(t):{}),kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,noun:'Elo pick',game:!!g.slot,...ro})).join('')}</div>`
    :`<p class="pb-why" data-sp-elo-wait>Loading the Elo ratings…</p>`}`;
  return `${open}${line}${cards}${eloCards}</div>`;
}
function spHeadHtml(){
  const w=currentWeek();
  return `<div class="pb-hd"><h2>Suggested Parlays</h2><span class="pill">week ${w}</span></div>
    <div class="pb-row pb-odds-row sp-odds"><span class="pb-lbl">Odds</span>${espnCtl(null,'sp')}</div>`;
}
/* a section: its heading, its record, then its sets or why there are none */
/* (app v133) a plain section, no fold */
const spSecHtml=(sec,body)=>`<section class="sp-sec" data-sp-sec="${sec}" aria-labelledby="spsec-${sec}"><h3 class="sp-sech" id="spsec-${sec}">${SP_SEC[sec].name}</h3>${sec==='all'?spRecHtml(sec):''}${body}</section>`;
function spNightHtml(on){
  const w=currentWeek(), G=spGames();
  if(!G.length) return `<p class="pb-none">${seasonOver()?'Regular season over.':`No night game left in week ${w}.`}</p>`;
  /* (app v112) the next night alone, once its morning has come (spOn: the one place the tab asks which games it
     sets out); until then, which game is next and when its set goes up */
  const On=spOn(), nm=x=>`${TEAM_NAMES[x.a]||x.a} at ${TEAM_NAMES[x.h]||x.h}`;
  let wait='';
  if(!On.length){ const N=spNight(), two=N.games.length>1;
    wait=`<p class="pb-none sp-wait" data-sp-wait="${N.open!=null?spIso(N.open):''}" data-sp-next="${esc(N.games.map(x=>x.id).join(' '))}">Next up: ${SP_NIGHT[spDow(N.games[0])]}, ${esc(N.games.map(nm).join(' and '))}.${N.open!=null?` ${two?'Sets go':'Set goes'} up ${spEt(N.open,true)}.`:''}</p>`; }
  return On.length?On.map(g=>spGameHtml(g,on)).join(''):wait;
}
/* (app v118) the Sunday slot: its set from its morning to its last kickoff; until then, when it goes up */
function spSlotHtml(on){
  const u=spSlotNext();
  if(!u) return `<p class="pb-none" data-sp-none="slot">${seasonOver()?'Regular season over.':`No Sunday game left in week ${currentWeek()}.`}</p>`;
  if(!u.up) return `<p class="pb-none sp-wait" data-sp-wait="${u.open!=null?spIso(u.open):''}" data-sp-next="${esc(u.id)}">Next up: week ${u.w}’s Sunday slot, ${u.games.length} game${u.games.length===1?'':'s'}. Sets go up ${spEt(u.open,true)}.</p>`;
  return spGameHtml(u,on);
}
/* (app v129) one section, Night games: the night games' sets, then the Sunday slot's */
function spSetsHtml(on){ return spSecHtml('all','')+(spDayOff()?'':spSecHtml('slot',spSlotHtml(on)))+spSecHtml('night',spNightHtml(on)); }
function renderSp(){
  const el=$('spPanel'); if(!el||!S||!S.sched) return;
  /* the frame once (app v118: the Elo picks are in each unit now, no longer a section of their own at the foot) */
  if(!$('spSets')) el.innerHTML='<div class="card pb sp" id="spCard"><div id="spHead"></div><div id="spSets"></div></div>';
  const tab=$('tab-suggest'), on=!tab||!tab.hidden;
  $('spHead').innerHTML=spHeadHtml(); $('spSets').innerHTML=spSetsHtml(on);
  SP_SHOWN=spState();
}
/* the tab opened: its sets built and drawn (the prop model's tab switch has shown the section by the time
   the click reaches the document) */
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('#tabs button[data-tab="suggest"]'):null;
  if(b&&typeof S==='object'&&S&&S.sched) try{ renderSp(); }catch(err){ console.error(err); } });
Object.assign(window,{spDayOff,SP_SHOW,spPrime,spGames,spNight,spOn,spOnAll,spOpenAt,spSlotUnit,spSlotNext,spUnit,spLockAt,spSet,spEloSet,spRebuild,spOutWhy,spTierOut,spShown,spTier,renderSp});
/* exactly these legs into the builder, in its own order, so it prices them as the tier did */
function pbPut(legs,what){
  const L=pbOrder(legs), have=Object.keys(S.parlay||{});
  if(!(have.length===L.length&&L.every(l=>suggestLegOn(l)))){
    if(have.length&&!confirm(`Replace the ${have.length} leg${have.length===1?'':'s'} in the builder with ${what}?`)) return false;
    S.parlay={};
    for(const l of L){ const {key,thin,pe,ev,imp,updated,fc,dec,win,...x}=l; S.parlay[key||legKey(l.gid,l.pid,l.stat)]=isGameLeg(x)?espnGlTag(x):x; }
    S.bookPrice=null; save(); renderParlay(); if(S.ui.game) renderGame();
  }
  const b=$('parlayBody'); try{ if(b&&typeof b.scrollIntoView==='function') b.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
  return true;
}
window.pbPut=pbPut;
function wirePb(){
  const el=$('pbPanel'); if(!el) return;
  const redraw=sel=>{ renderPb(); const f=sel&&$('pbPanel').querySelector(sel); try{ if(f) f.focus({preventScroll:true}); }catch(e){} };
  /* the amount: every payout follows it as it is typed and the builder a moment later; leaving
     the box (or Enter) settles it, a bad entry going back to the amount as it was */
  const amt=el.querySelector('#pbStake');
  if(amt){
    amt.addEventListener('input',()=>{ const v=stakeRead(amt.value); if(v==null) return;
      S.stake=v; save(); pbPays(); clearTimeout(PB_AMT_T); PB_AMT_T=setTimeout(pbSyncBuilder,250); });
    amt.addEventListener('change',()=>{ const v=stakeRead(amt.value); if(v!=null) S.stake=v;
      S.stake=pbStake(); amt.value=stakeText(S.stake); save(); pbPays(); clearTimeout(PB_AMT_T); pbSyncBuilder(); });
  }
  el.querySelectorAll('[data-pb-mix]').forEach(b=>b.addEventListener('click',()=>{ const u=pbUi(), m=PB_MIXES.find(x=>x[0]===b.dataset.pbMix); if(!m) return;
    for(const [k] of PB_KINDS) u.k[k]=m[2].includes(k); save(); redraw(`[data-pb-mix="${m[0]}"]`); }));
  el.querySelectorAll('[data-pb-kind]').forEach(cb=>cb.addEventListener('change',()=>{ const u=pbUi(); u.k[cb.dataset.pbKind]=cb.checked; save(); redraw(`[data-pb-kind="${cb.dataset.pbKind}"]`); }));
  el.querySelectorAll('[data-pb-game]').forEach(cb=>cb.addEventListener('change',()=>{ const u=pbUi(), id=cb.dataset.pbGame;
    u.off=u.off.filter(x=>x!==id); if(!cb.checked) u.off.push(id); save(); redraw(`[data-pb-game="${id}"]`); }));
  el.querySelectorAll('[data-pb-games]').forEach(b=>b.addEventListener('click',()=>{ const u=pbUi(), ids=pbGames().map(g=>g.id);
    u.off=b.dataset.pbGames==='none'?ids:u.off.filter(x=>!ids.includes(x)); save(); redraw(`[data-pb-games="${b.dataset.pbGames}"]`); }));
  const det=el.querySelector('details.pb-games');
  if(det) det.addEventListener('toggle',()=>{ const u=pbUi(); if(u.gx!==det.open){ u.gx=det.open; save(); } });
}
/* what is on the screen was drawn before a game kicked off or a set locked: it is not what the list and
   the sets are now (the card's Finish asks it too) */
function pbStale(){ try{ return (PB_SHOWN!=null&&pbGames().map(g=>g.id).join()!==PB_SHOWN)||(SP_SHOWN!=null&&spState()!==SP_SHOWN); }catch(e){ return false; } }
window.pbStale=pbStale;
/* a game that kicks off while the page is open leaves the list and its set, and a set that reaches its
   lock turns to the locked one: the page looks every half minute, and redraws the builder (which drops a
   started leg), the list and the sets */
function pbWatch(){
  if(pbWatch.on) return;
  pbWatch.on=setInterval(pbWatchTick,30000);
}
/* one look (the audit and the smoke call it on clocks of their own): the record read again where a set has
   reached its lock since it was last read, and a redraw where what is shown is stale */
/* (app v118) each unit's side of its lock in spState: l before it, k from it, u under way (the Sunday slot from its
   first kickoff), w not up yet (the slot before its morning). The record is read again where a unit is now at or past
   its lock (k, u) and was not when it was last read, or was not there at all: a slot read while it waited (w) or seen
   again only once under way (a tab left hidden through its lock), and a game that came on while the page was open, as
   well as a night game reaching its lock (l to k, the only turn until app v118) */
const spSides=s=>{ const o={}; for(const x of String(s||'').split(',')){ const m=/^(?:s=)?(.+):([lkuw])$/.exec(x); if(m) o[m[1]]=m[2]; } return o; };
function pbWatchTick(){ try{ if(!S||!S.sched||document.visibilityState==='hidden') return;
  if(PB_REC_DONE&&PB_REC_STATE!=null&&!pbRecLoad.busy){ const was=spSides(PB_REC_STATE), cur=spSides(spState()), past=c=>c==='k'||c==='u';
    if(Object.keys(cur).some(id=>past(cur[id])&&!past(was[id]))){ pbRecLoad.busy=true; pbRecLoad(true).finally(()=>{ pbRecLoad.busy=false; }); } }
  if(pbStale()) renderParlay(); }catch(e){} }
window.pbWatchTick=pbWatchTick;
/* a leg's own Add (pbLegAddBtn), on the list or a set: that leg into the builder or out of it, the focus
   kept on the same button once both are drawn again; a redraw first where what is shown is stale */
function pbLegClick(b,box){
  if(pbStale()){ renderParlay(); return; }
  const all=[...document.querySelectorAll(box+' [data-pb-leg]')], i=all.indexOf(b);
  const key=b.dataset.pbLeg, kk=b.dataset.k, side=b.dataset.side, main=b.dataset.main==='1';
  const g=(S.sched||[]).find(x=>x.id===key.split('|')[0]);
  /* (app v116) where the button was on the screen: the builder is over the list, so the redraw below moves it */
  let top0=null; try{ top0=b.getBoundingClientRect().top; }catch(e){}
  /* a locked set's leg is the leg as it was locked: its own line, which toggleLeg (reading the line as it stands
     now) would move wherever a rebake or a press has moved it since. So it goes in as shown, as the set's Add
     to builder puts it (pbPut), or comes off where it is in; a live set's and the list's go by toggleLeg */
  const gEl=box==='#spPanel'?b.closest('[data-sp-game]'):null, tEl=gEl&&b.closest('[data-pb-tier]');
  /* (app v118) any unit the tab sets out, a night game or the Sunday slot (spOnAll; spGames alone missed the slot, so
     a locked slot leg's Add put in the line as it stands now) */
  const sg=gEl&&g&&spOnAll().find(x=>x.id===gEl.dataset.spGame), lk=sg&&spLockAt(sg);
  const lt=sg&&tEl&&lk!=null&&Date.now()>=lk?spTier(`${sg.id}:${tEl.dataset.pbTier}`):null;
  const sl=lt&&lt.legs.find(l=>l.key===key&&String(l.k)===kk&&l.side===side&&!!l.main===main);
  if(sl){
    if(!gameStarted(g)){ if(suggestLegOn(sl)) delete S.parlay[key];
      else { const {key:_k,thin,pe,ev,imp,updated,fc,dec,win,...x}=sl; S.parlay[key]=isGameLeg(x)?espnGlTag(x):x; }
      save(); renderGame(); renderParlay(); } }
  else toggleLeg(key,+kk,g,side,main);
  const now=[...document.querySelectorAll(box+' [data-pb-leg]')], same=x=>x.dataset.pbLeg===key&&x.dataset.k===kk&&x.dataset.side===side;
  const f=(now[i]&&same(now[i]))?now[i]:now.find(same);
  /* at once, not by the page's smooth scrolling (html{scroll-behavior:smooth}), so the row never slides */
  try{ if(f&&top0!=null&&typeof window.scrollBy==='function'){ const dy=f.getBoundingClientRect().top-top0;
    if(isFinite(dy)&&Math.abs(dy)>=1){ const de=document.documentElement, sb=de.style.scrollBehavior; de.style.scrollBehavior='auto'; window.scrollBy(0,dy); de.style.scrollBehavior=sb; } } }catch(e){}
  try{ if(f) f.focus({preventScroll:true}); }catch(e){}
}
/* a set's Add to builder: exactly its legs into the builder, the focus kept on the button */
function spAddClick(b){
  if(pbStale()){ renderParlay(); return; }
  const fid=b.dataset.spAdd, t=spTier(fid); if(!t) return;
  pbPut(t.legs,t.elo?`the ${t.label} Elo pick for ${t.game}`:`the ${t.label} ${t.legs.length}-leg parlay for ${t.game}`);
  const f=document.querySelector(`#spPanel [data-sp-add="${fid}"]`); try{ if(f) f.focus({preventScroll:true}); }catch(e){}
}
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest?e.target:null; if(!t) return;
  const leg=t.closest('[data-pb-leg]'), add=leg?null:t.closest('[data-sp-add]');
  if(leg){ const box=['#pbPanel','#spPanel'].find(s=>leg.closest(s)); if(!box||leg.disabled) return; e.preventDefault(); pbLegClick(leg,box); return; }
  if(add&&add.closest('#spPanel')&&!add.disabled){ e.preventDefault(); spAddClick(add); }
});
/* one tap swaps the amount you are betting in the builder; it is the one amount (S.stake), so the
   panel's Bet amount box and every tier's payout follow it */
const STAKE_CHIPS=[1,5,10,20,50,100];
function stakeChips(){ const s=pbStake();
  return `<span class="stake-chips" role="group" aria-label="Amount to bet">${STAKE_CHIPS.map(v=>`<button type="button" class="${s===v?'on':''}" data-stake-chip="${v}" aria-pressed="${s===v}">$${v}</button>`).join('')}</span>`; }
function wireStakeChips(){
  document.querySelectorAll('[data-stake-chip]').forEach(b=>{ if(b.dataset.wired) return; b.dataset.wired='1';
    b.addEventListener('click',()=>{ S.stake=+b.dataset.stakeChip; save(); renderParlay(); }); });
}
/* the card's plan for the builder's legs, each read as the card reads it (fromBuilder: its price's source
   decides whether it carries a book price); null without the card */
function dkSlipPlan(legs,prices){
  const C=window.PARLAY_CARD; if(!C||typeof C.dkPlan!=='function') return null;
  try{ return C.dkPlan(legs.map((l,i)=>Object.assign({},l,l.src==='dkline'&&prices[i].src!=='dkline'?{src:prices[i].src}:{},
      {card:{tag:prices[i].src==='real'?'book':(prices[i].src==='fair'?'fair':'est.')}})))||null; }catch(e){ return null; }
}
function dkSlipRows(legs,prices){ const p=dkSlipPlan(legs,prices); return p&&Array.isArray(p.each)?p.each:null; }
function dkSlipLine(x,i){
  if(!x) return '';
  if(x.id&&x.swap) return `<small class="dkslip" data-dkslip="${i+1}">On DraftKings as ${esc(x.swap)}</small>`;
  if(x.id) return '';
  return `<small class="dkslip" data-dkslip="${i+1}">Not on DraftKings’ slip: ${esc(x.brief||x.why||'')}</small>`;
}
/* (app v127) no ladder bets (isLadder): one kept in the builder from before, by the browser's saved state or a backup
   imported, is taken out as the page loads it, and the builder says so in one line until it next changes (PB_NOLADDER:
   how many, and the builder's legs then). A leg of a Suggested Parlays set locked before the change (spLegIn's kept)
   stays: the record grades that set as it locked, and Add to builder pays what its card says */
let PB_NOLADDER=null;
function pbLegSig(){ return Object.keys(S.parlay||{}).sort().join(','); }
function pbDropLadders(){
  let n=0;
  for(const [k,l] of Object.entries(S.parlay||{})) if(isLadder(l)&&!l.kept){ delete S.parlay[k]; n++; }
  if(n) PB_NOLADDER={n,sig:pbLegSig()};
  return n;
}
function renderParlay(o){
  /* the line lives until the visitor changes the builder: this draw's own drops below (a game kicked off, FG attempts)
     do not end it, so a builder saved with a ladder beside a leg of a game played since says both */
  const noteOn=!!PB_NOLADDER&&PB_NOLADDER.sig===pbLegSig();
  /* a leg from a game that has kicked off can't be bet, so it leaves the working parlay */
  let dropped=0, notDk=0;
  for(const [k,l] of Object.entries(S.parlay||{})){ const g=S.sched.find(x=>x.id===l.gid); if(g&&gameStarted(g)){ delete S.parlay[k]; dropped++; } }
  /* (app v113) an FG attempts leg kept from before: the one bet the page offered until app v113 that DraftKings
     does not (targets, the other stat in NO_BET, was never a leg) */
  for(const [k,l] of Object.entries(S.parlay||{})) if(l&&l.stat==='fg_att'){ delete S.parlay[k]; notDk++; }
  if(dropped||notDk) save();
  if(noteOn) PB_NOLADDER.sig=pbLegSig(); else PB_NOLADDER=null;
  const noLadder=PB_NOLADDER?PB_NOLADDER.n:0;
  /* the Top lines under the builder (app v116: the builder first on the tab), and Suggested Parlays, drawn with it, unless only the amount moved
     (o.keepPb: the payouts are redrawn in place, and the buttons stay put) */
  if(!(o&&o.keepPb)) renderPb();
  const legs=parlayLegs();
  const el=$('parlayBody');
  const droppedNote=(noLadder?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05" data-pb-noladder="${noLadder}">${noLadder} ladder leg${noLadder===1?'':'s'} removed.</p>`:'')+(notDk?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05" data-pb-notdk="${notDk}">${notDk} leg${notDk===1?'':'s'} removed: DraftKings has no FG attempts.</p>`:'')+(dropped?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05">${dropped} leg${dropped===1?'':'s'} removed: ${dropped===1?'its game':'their games'} kicked off.</p>`:'');
  if(!legs.length){
    el.innerHTML=droppedNote+`<div class="card"><h2>Parlay Builder</h2>${espnCtl(null,'builder')}
      <p class="muted" style="margin:0 0 10px">No legs yet.</p></div>`+renderSaved()+renderBetParlays();
    wireSaved(); wireStakeChips();
    return;
  }
  const wks=[...new Set(legs.map(l=>l.week))];
  const pr=parlayProb(legs.map(l=>({...l,side:l.side||'over'})));
  const fair=parlayFair(legs);
  const prices=legs.map(legPrice);
  const allBook=prices.every(p=>p.src==='real');
  const multDec=prices.reduce((a,p)=>a*(mlToDec(p.ml)||1),1);
  const bookDec=parlayDec(legs.map((l,i)=>({leg:l,ml:prices[i].ml})));
  const sg=sameGame(legs);
  const fairML=probToAmerican(pr.corr);
  const stake=pbStake();
  const override=S.bookPrice!=null&&isFinite(S.bookPrice)?mlToDec(S.bookPrice):null;
  /* only call it "your price" when it really is one: a price you typed, or every
     leg priced from your book. Otherwise we are just multiplying our own fair
     odds, which carry no bookmaker margin and would flatter the return. */
  const realPrice=override!=null||allBook;
  const estPrice=!realPrice&&prices.every(p=>p.src!=='fair');
  const useDec=override||((allBook||estPrice)?bookDec:mlToDec(fairML));
  const payout=stake*useDec, profit=payout-stake;

  let html=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">${legs.length}-leg parlay <span class="pill">building</span></h2>${espnCtl(null,'builder')}
    <table><thead><tr><th>Player</th><th>The bet</th><th class="num">Projected</th><th class="num">Chance</th><th class="num">Price</th><th></th></tr></thead><tbody>`;
  /* (app v109) the parlay card's own reading of each leg for DraftKings' betslip (window.PARLAY_CARD's
     dkPlan, on the hub page only), so the builder says before Finish which leg goes on at DraftKings'
     number and which cannot go on yet. Nothing where a leg goes on as built, nor without the card */
  const fm={}, plan=dkSlipPlan(legs,prices), slip=plan&&Array.isArray(plan.each)?plan.each:null;
  legs.forEach((l,i)=>{
    const [c,lbl]=confTier(l.p), f=legFair(l,fm), far=!!f&&l.p-f.p>=FAR_OFF-1e-9;
    html+=`<tr class="legrow"><td class="plr">${glanceName(l,prices[i])}${l.grp==='TEAM'?'':injChip(l.pid)}<small>${esc(l.pos)} \u00b7 ${esc(l.team)} v ${esc(l.opp)} \u00b7 wk ${esc(l.week)}</small></td>
      <td><b>${esc(l.label)}</b>${far?`<small class="faroff" data-far>${farText(l.p,f)}</small>`:''}${dkSlipLine(slip&&slip[i],i)}</td>
      <td class="num">${l.mu==null?'\u2013':num(l.mu,l.mu<10?1:0)}</td>
      <td class="num">${(l.p*100).toFixed(0)}% <span class="conf ${c}" style="margin-left:6px">${lbl}</span>${f?`<small class="legfair" data-legfair="${f.p}" title="The book's fair chance on this leg: its price with the margin taken out${f.est?', estimated with the week\u2019s typical margin since only this side is priced':''}">fair ${(f.p*100).toFixed(0)}%${f.est?' est.':''}</small>`:''}</td>
      <td class="num">${fmtML(prices[i].ml)} <span class="muted" style="font-size:11px"${prices[i].src==='dkline'?estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true}):''}>${prices[i].src==='real'?'real':(prices[i].src==='est'||prices[i].src==='dkline'?'est.':'fair')}</span></td>
      <td><button class="btn quiet" data-drop="${l.key}">Remove</button></td></tr>`;
  });
  html+=`</tbody></table>`;
  { const out=legs.filter(l=>l.grp!=='TEAM'&&S.inactive&&S.inactive[l.pid]);
    if(out.length) html+=`<p class="delta down" style="margin:10px 0 0">${out.map(l=>esc(l.name)).join(', ')} ${out.length===1?'is':'are'} not expected to play (${out.map(l=>inactiveWhy(S.inactive[l.pid])).join('; ')}).</p>`; }
  if(prices.some(p=>p.src==='dkline')) html+=`<p class="muted espn-read" style="margin:10px 0 0;font-size:12px" data-espn-read>${esc(espnReadLine(legs.filter((l,i)=>prices[i].src==='dkline').map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null))}</p>`;
  if(wks.length>1) html+=`<p class="delta down" style="margin:10px 0 0">Legs in different weeks (${wks.join(', ')}): not one ticket.</p>`;
  /* (app v121) a pair DraftKings will not take on one slip (dkClash), and a same-game parlay mixed with legs of other
     games, whose one betslip link DraftKings does not open: the parlay card gives each game its own (where it is on the
     page), read off the card's own plan, which counts the legs that go on the slip alone, and only where the card can
     be finished (the legs of one week). One leg a game is a plain parlay, which opens as one link */
  { const cp=dkClashPairs(legs), nm=l=>`${esc(l.name)}, ${esc(l.label)}`;
    if(cp.length) html+=`<p class="delta down" style="margin:10px 0 0" data-pb-clash="${cp.length}">DraftKings may refuse ${cp.length===1?'this pair':'these pairs'} on one slip: ${cp.map(([i,j])=>`${nm(legs[i])}, with ${nm(legs[j])}`).join('; ')}.</p>`;
    if(plan&&plan.multi&&Array.isArray(plan.games)&&wks.length===1){ const nG=plan.games.length;
      html+=`<p class="muted" style="margin:10px 0 0;font-size:12px" data-pb-multigame="${nG}">Mixed same-game parlay: DraftKings may not open it as one slip.</p>`; } }
  /* what it pays, inside the same card, then the two actions as buttons only */
  html+=`<div class="pays"><h3>What it pays</h3>
    <div class="bar">
      <label>Your stake $<input type="number" id="pStake" inputmode="decimal" min="${STAKE_MIN}" max="${STAKE_MAX}" step="1" value="${stakeText(stake)}" style="width:110px"></label>
      ${stakeChips()}
      <label>Your book's parlay price <input type="number" id="pBook" step="5" placeholder="${allBook?(decToML(bookDec)||''):'e.g. +250'}" value="${S.bookPrice!=null?esc(S.bookPrice):''}" style="width:110px"></label>
    </div>
    <div class="bigp">
      ${fair&&fair.p!=null?`<div class="box hero"><b data-fair="${fair.p}">${(fair.p*100).toFixed(1)}%</b><span>fair chance all ${legs.length} land${fair.est?', est.':''}</span><small data-model="${pr.corr}">model says ${(pr.corr*100).toFixed(1)}%</small></div>`
        :`<div class="box hero"><b data-model="${pr.corr}">${(pr.corr*100).toFixed(1)}%</b><span>model's chance all ${legs.length} land</span><small>no fair chance</small></div>`}
      <div class="box"><b>${fmtML(fairML)}</b><span>fair price for the model's chance</span></div>
      <div class="box"><b class="payout">$${payout.toFixed(2)}</b><span>${(realPrice||estPrice)?`returned if it lands, $${profit.toFixed(2)} profit`:`if you got the fair price, $${profit.toFixed(2)} profit`}</span></div>
      ${(()=>{ const on=fair&&fair.p!=null, cp=on?fair.p:pr.corr, [c,l]=confTier(cp);
        return `<div class="box tier ${c}" data-conf="${cp}"><b>${l}</b><span>confidence all ${legs.length} land, on the ${on?'fair':'model\u2019s'} chance</span></div>`; })()}
    </div>`;
  const canSave=wks.length===1&&(realPrice||estPrice);
  html+=`<div class="actions"><button class="btn go" id="pSave" ${canSave?'':'disabled'} title="${canSave?'Locks the legs, stake and price as they are now and moves it to Saved':(wks.length>1?'Legs must all be from the same week to save':'Set a price first')}">Save and lock this parlay</button><button class="btn quiet" id="pClear">Clear ALL</button></div></div>`;
  html+=`</div>`;

  /* the pairs table goes below the save bar and the saved parlays */
  let pairsHtml='';
  if(pr.pairs.length){
    pairsHtml+=`<div class="card"><h2>Legs that move together</h2>
      <table><thead><tr><th>Pair</th><th class="num">Strength</th></tr></thead><tbody>`+
      pr.pairs.sort((a,b)=>Math.abs(b.rho)-Math.abs(a.rho)).map(x=>{
        const A=legs[x.i],B=legs[x.j];
        return `<tr><td>${esc(A.name)} ${esc(A.label)}<br>${esc(B.name)} ${esc(B.label)}</td>
          <td class="num">${x.rho>0?'+':''}${x.rho.toFixed(2)}</td></tr>`;
      }).join('')+`</tbody></table></div>`;
  }
  html+=renderSaved()+renderBetParlays();
  html+=pairsHtml;
  el.innerHTML=html;
  $('pSave')?.addEventListener('click',()=>{
    if(!confirm(`Save and lock this ${legs.length}-leg parlay at ${fmtML(decToML(useDec))} for $${stake.toFixed(2)}?\n\nOnce locked it can't be edited, only cleared.`)) return;
    S.saved.push({id:'sp'+Date.now(),saved:new Date().toISOString(),week:wks[0],legs:legs.map(l=>({...l})),
      stake,price:decToML(useDec),priceSrc:override!=null?'typed':(allBook?'real':'est'),pCorr:pr.corr,pIndep:pr.indep,payout});
    S.parlay={}; S.bookPrice=null; save(); renderParlay(); if(S.ui.game) renderGame(); });
  /* the builder's stake is the panel's amount: as it is typed the panel's box and payouts follow,
     and the builder on leaving the box; a bad entry leaves the amount as it was */
  $('pStake').addEventListener('input',e=>{ const v=stakeRead(e.target.value); if(v==null) return;
    S.stake=v; save(); const b=$('pbStake'); if(b) b.value=stakeText(v); pbPays(); });
  $('pStake').addEventListener('change',e=>{ const v=stakeRead(e.target.value); if(v!=null) S.stake=v; S.stake=pbStake(); save(); renderParlay(); });
  $('pBook').addEventListener('change',e=>{ const v=parseFloat(e.target.value);
    S.bookPrice=isFinite(v)&&v!==0?v:null; save(); renderParlay(); });
  el.querySelectorAll('[data-drop]').forEach(b=>b.addEventListener('click',()=>{
    delete S.parlay[b.dataset.drop]; save(); renderParlay(); if(S.ui.game) renderGame(); }));
  $('pClear').addEventListener('click',()=>{ if(!confirm('Remove every leg from the builder?')) return;
    S.parlay={}; save(); renderParlay(); if(S.ui.game) renderGame(); });
  wireSaved(); wireStakeChips();
}
/* ---------- live: fetch, poll, and never persist ----------
   LIVE sits outside S on purpose. It is someone else's scoreboard, not our state: it must
   never be saved, and settlement still comes from nflverse on the next refresh. */
let LIVE={at:0,games:{},box:{},err:null,busy:false,on:false,slate:false};
let LIVE_TIMER=null;
/* the week on screen, which is not always the live one: someone reading week 1 in
   October wants that week's scoreboard, and gets an empty one, which is correct */
const slateWeek=()=>+$('weekSel')?.value||currentWeek();
/* every game the Games tab wants a score for: started, not yet final */
const liveSlateWanted=()=>{
  const ids=new Set(); if(!LIVE.slate) return ids;
  for(const g of gamesIn(slateWeek())) if(gameStarted(g)&&!gameFinal(g)) ids.add(g.id);
  return ids;
};
const liveWanted=()=>{                                   /* every game an unsettled parlay needs */
  const ids=new Set();
  for(const p of (S.saved||[])){ if(settleParlay(p).status!=='pending') continue;
    for(const l of p.legs) if(l.gid) ids.add(l.gid); }
  for(const p of bettingParlays()) for(const l of p.legs){
    const g=S.sched.find(x=>x.id===l.gid); if(g&&!gameFinal(g)) ids.add(l.gid); }
  return ids;
};
async function liveGet(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}
async function liveRefresh(){
  if(LIVE.busy) return;
  const want=liveWanted(), slate=liveSlateWanted();
  if(!want.size&&!LIVE.slate){ LIVE.on=false; return; }
  LIVE.busy=true;
  try{
    /* one scoreboard call covers the week, whoever asked for it. A game card wants a
       score and not a stat line, so the slate never costs a box score. */
    const wk=LIVE.slate?slateWeek():currentWeek();
    const sb=await liveGet(`${ESPN_SB}?seasontype=2&week=${wk}&dates=${SEASON}`);
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
  if(LIVE.slate) renderSlate();
  slateStamp();
}
function slateStamp(){
  const el=$('slateStamp'); if(!el) return;
  el.textContent=!LIVE.slate?'scores off'
    :(LIVE.err?'scores not loading'
      :(LIVE.at?'scores '+new Date(LIVE.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'})
        :'reading\u2026'));
}
/* a started game's card: the score where the kickoff time was, with the clock under it.
   Falls back to the LIVE pill when the scoreboard has not been read yet, which is what
   the card said before there was a scoreboard to read. */
function liveWhen(g,done){
  const s=LIVE.slate?LIVE.games[g.id]:null;
  if(!s||s.as==null||s.hs==null) return done?'':'<span class="pill warn">LIVE</span>';
  /* a game already carrying its real result says it once, in the FINAL pill and the actual
     score below; there is nothing for the scoreboard to add */
  if(done&&hasScore(g)) return '';
  return `<span class="sc">${esc(g.a)} ${num(s.as,0)}\u2013${num(s.hs,0)} ${esc(g.h)}</span>`
    +(s.clock&&!done?`<span class="cl">${esc(s.clock)}</span>`:'');
}
/* the live score next to the expected one, so the model's number and the real one read
   together while the game is on */
function liveScoreLine(g){
  const s=LIVE.slate?LIVE.games[g.id]:null;
  if(!s||s.as==null||s.hs==null||s.state==='pre') return '';
  return `<small class="lv">${s.state==='post'?'final':'live'} ${num(s.as,0)} \u2013 ${num(s.hs,0)}</small>`;
}
function liveStop(){ if(LIVE_TIMER){ clearInterval(LIVE_TIMER); LIVE_TIMER=null; } }
function liveStart(){
  liveStop();
  if(!LIVE.on&&!LIVE.slate) return;
  /* only while the tab is in front: an iPad should not poll in someone's pocket */
  const every=LIVE.on?30:0;
  if(every) LIVE_TIMER=setInterval(()=>{ if(document.visibilityState==='visible') liveRefresh(); },every*1000);
  liveRefresh();
}
/* one player's live line, out of the box score for the game on screen. null means the
   sheet has him but with nothing on it yet; undefined means there is no sheet to read. */
function liveStatsFor(gid,team,name){
  const sum=LIVE.box[gid]; if(!sum) return undefined;
  return espnStats(sum,team,name);
}
/* the scoreboard and one box score, for the game being looked at and nothing else */
async function refreshGameStats(g){
  if(LIVE.busy) return;
  LIVE.busy=true; LIVE.err=null; gameStatsBtn('reading\u2026');
  try{
    const sb=await liveGet(`${ESPN_SB}?seasontype=2&week=${g.w}&dates=${SEASON}`);
    LIVE.games=Object.assign({},LIVE.games,espnGames(sb,S.sched));
    const s=LIVE.games[g.id];
    if(s&&s.state!=='pre'){
      const box=await liveGet(ESPN_SUM+s.eid);
      LIVE.box=Object.assign({},LIVE.box,{[g.id]:box});
    }
    LIVE.at=Date.now();
  }catch(e){ LIVE.err=String(e&&e.message||e); }
  finally{ LIVE.busy=false; }
  if(S.ui.game===g.id) renderGame();
}
function gameStatsBtn(txt){ const b=$('gameStatsNow'); if(b) b.textContent=txt; }

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
    const g=r.game, sc=`${g.away} ${g.as}\u2013${g.hs} ${g.home}`;
    return `<span class="lv ${tone}">${esc(sc)}<em>${esc(g.clock)}</em></span>`;
  }
  const shown=`${num(r.val,r.val%1?1:0)} / ${r.k}`;
  const room=l.main&&l.side==='under';                    /* an under has room left, not distance to cover */
  const tail=r.state==='hit'?'hit':(r.state==='missed'?'missed':(r.state==='push'?'push':
    (r.need>0?`${num(r.need,r.need%1?1:0)} ${room?'to spare':'to go'}`:'live')));
  return `<span class="lv ${tone}">${esc(shown)}<em>${esc(tail)}</em></span>`;
}
function renderSaved(){
  const list=(S.saved||[]).slice().reverse();
  const settled=list.map(p=>settleParlay(p));
  const anyLive=list.some(p=>settleParlay(p).status==='pending');
  const lvBar=!anyLive?'':`<label class="muted sp-live"><input type="checkbox" id="liveCb" ${LIVE.on?'checked':''}> Live</label>
    ${LIVE.on?`<span class="muted" style="font-size:12px">${LIVE.err?'':(LIVE.at?'updated '+new Date(LIVE.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'}):'checking\u2026')}</span>`:''}`;
  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span><span class="grow" style="flex:1"></span>${lvBar}</h2>`;
  if(LIVE.on&&LIVE.err) html+=`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05">Live scores are not loading: <b>${esc(LIVE.err)}</b>. The page reads ESPN's public scoreboard straight from your browser, and a browser will refuse that read if ESPN does not allow it from another site. Nothing else on this page is affected, and the parlay still settles from the week's own numbers.</p>`;
  if(!list.length){ html+=`<p class="muted" style="margin:0">Nothing saved. Build a parlay above and press Save and lock; only locked parlays appear here.</p></div>`; return html; }
  const won=settled.filter(s=>s.status==='won').length, lost=settled.filter(s=>s.status==='lost').length, pend=settled.filter(s=>s.status==='pending').length;
  const staked=list.reduce((s,p)=>s+p.stake,0);
  const back=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?0:settledReturn(p,settled[i])),0);
  const atRisk=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?p.stake:0),0);
  const couldWin=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?p.payout-p.stake:0),0);
  const net=list.reduce((s,p,i)=>s+(settled[i].status==='pending'?0:settledReturn(p,settled[i])-p.stake),0);
  html+=`<div class="sp-money" style="margin-bottom:14px">
    <div><b>${won}\u2013${lost}${pend?`, ${pend} live`:''}</b><span>record</span></div>
    <div><b>$${staked.toFixed(2)}</b><span>total staked</span></div>
    <div><b>$${back.toFixed(2)}</b><span>paid back</span></div>
    <div class="${net>=0?'win':'lose'}"><b>${net>=0?'+':'\u2212'}$${Math.abs(net).toFixed(2)}</b><span>net, settled</span></div>
    ${atRisk?`<div><b>$${atRisk.toFixed(2)}</b><span>still live</span></div><div class="win"><b>+$${couldWin.toFixed(2)}</b><span>if they all land</span></div>`:''}
  </div>`;
  list.forEach((p,i)=>{
    const s=settled[i];
    const tone=s.status==='won'?'var(--pick)':(s.status==='lost'?'var(--miss)':(s.status==='void'?'var(--muted)':'var(--gold)'));
    const profit=p.payout-p.stake;
    const result=s.status==='won'?`+$${(settledReturn(p,s)-p.stake).toFixed(2)}`:(s.status==='lost'?`\u2212$${p.stake.toFixed(2)}`:(s.status==='void'?'$0.00':`$${p.payout.toFixed(2)} to come`));
    html+=`<div class="savedp" style="border-left:4px solid ${tone}">
      <div class="sp-head">
        <span class="sp-title">${p.legs.length}-leg parlay</span>${p.suggested?`<span class="pill">${p.suggested} suggestion</span>`:''}
        <span class="pill ${s.status==='won'?'ok':(s.status==='lost'?'bad':(s.status==='pending'?'warn':''))}">${s.status==='pending'?'live':s.status}</span>
        <span class="muted" style="font-size:12px">week ${p.week} \u00b7 saved ${p.saved.slice(0,10)}</span>
        <span class="grow"></span>
        <button class="btn quiet" data-sp="${p.id}">Remove</button>
      </div>
      <div class="sp-money">
        <div><b>$${p.stake.toFixed(2)}</b><span>you staked</span></div>
        <div><b>${fmtML(p.price)}</b><span>price \u00b7 ${p.priceSrc}</span></div>
        <div><b>$${p.payout.toFixed(2)}</b><span>pays if it lands</span></div>
        <div class="win"><b>+$${profit.toFixed(2)}</b><span>profit if it lands</span></div>
        <div><b>${(p.pCorr*100).toFixed(0)}%</b><span>chance</span></div>
        <div class="${s.status==='won'?'win':(s.status==='lost'?'lose':'')}"><b>${result}</b><span>${s.status==='pending'?'still running':'result'}</span></div>
      </div>
      ${p.legs.map((l,k)=>{ const r=s.legs[k]; const a=actualFor(l.week,l.pid);
        const mark=r==null?'<span class="res">\u25cb</span>':(r==='win'?'<span class="res win">\u2713</span>':(r==='push'?'<span class="res">P</span>':(r==='void'?'<span class="res" title="did not play: the leg is void">V</span>':'<span class="res loss">\u2717</span>')));
        const lv=(LIVE.on&&s.status==='pending')?liveCell(l):'';
        return `<div class="sp-leg">${mark}
          <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span>
          <span class="rs">${a&&a[l.stat]!=null?`got ${num(a[l.stat],0)}`:(lv||'<span class="muted">pending</span>')}</span>
          <span class="rs">${(l.p*100).toFixed(0)}%</span></div>`;}).join('')}
    </div>`;
  });
  html+=`<div class="bar" style="margin:12px 0 0"><span class="grow"></span>
    <button class="btn danger" id="savedClear">Clear saved parlays</button></div></div>`;
  return html;
}
/* the betting model's parlays, shown only while one of their games is still to finish:
   this card is for watching, and that site stays the place they are settled and recorded */
function renderBetParlays(){
  const all=bettingParlays();
  const live=all.filter(p=>p.legs.some(l=>{ const g=S.sched.find(x=>x.id===l.gid); return g&&!gameFinal(g); }));
  if(!live.length) return '';
  let html=`<div class="card" id="betParlays"><h2 style="display:flex;align-items:center;gap:10px">From the betting model <span class="pill">${live.length}</span>
    <span class="grow"></span><label class="muted sp-live"><input type="checkbox" id="liveCbB" ${LIVE.on?'checked':''}> Live</label></h2>
    <p class="muted" style="margin:0 0 12px;font-size:12px">Bet Build parlays saved in the betting model on this browser, every leg a team to win. They are settled and recorded over there; this only shows where they stand. <a href="../betting/">Open the betting model</a></p>`;
  for(const p of live){
    html+=`<div class="savedp" style="border-left:4px solid var(--gold)">
      <div class="sp-head"><span class="sp-title">${p.legs.length}-leg parlay</span>
        <span class="pill warn">live</span>
        <span class="muted" style="font-size:12px">${p.week?`week ${p.week}`:''}</span><span class="grow"></span></div>
      <div class="sp-money">
        <div><b>$${p.stake.toFixed(2)}</b><span>staked</span></div>
        <div><b>${p.priced?fmtML(decToML(p.dec)):'\u2013'}</b><span>price</span></div>
        <div><b>${p.priced?'$'+p.payout.toFixed(2):'\u2013'}</b><span>pays if it lands</span></div>
      </div>
      ${p.legs.map(l=>{ const lv=LIVE.on?liveCell(l):'';
        return `<div class="sp-leg"><span class="res">\u25cb</span>
          <span class="nm">${esc(l.name)}<small>${esc(l.label)}${l.price!=null?' \u00b7 '+fmtML(l.price):''}</small></span>
          <span class="rs">${lv||'<span class="muted">pending</span>'}</span>
          <span class="rs"></span></div>`;}).join('')}
    </div>`;
  }
  return html+'</div>';
}
function wireSaved(){
  $('liveCbB')?.addEventListener('change',e=>{ LIVE.on=e.target.checked; LIVE.err=null;
    if(LIVE.on) liveStart(); else { liveStop(); renderParlay(); } });
  $('liveCb')?.addEventListener('change',e=>{ LIVE.on=e.target.checked; LIVE.err=null;
    if(LIVE.on) liveStart(); else { liveStop(); renderParlay(); } });
  document.querySelectorAll('[data-sp]').forEach(b=>b.addEventListener('click',()=>{
    S.saved=(S.saved||[]).filter(p=>p.id!==b.dataset.sp); save(); renderParlay(); }));
  $('savedClear')?.addEventListener('click',()=>{
    const n=(S.saved||[]).length;
    if(!confirm(`Delete all ${n} saved parlay${n===1?'':'s'}?\n\nThis can't be undone.`)) return;
    S.saved=[]; save(); renderParlay(); });
}

/* ---------- price rows: market and player names to keys, and a file to save ---------- */
function marketKey(s){
  const norm=x=>String(x||'').toLowerCase().replace(/[_\s]+/g,' ').trim();
  const t=norm(s);
  for(const m of MARKETS){ if(norm(m.k)===t||norm(m.lbl)===t||norm(m.short||'')===t) return m.k; }
  return null;
}
function normName(s){ return String(s||'').toLowerCase().replace(/[.'`\u2019-]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)$/,'').replace(/\s+/g,' ').trim(); }
function downloadText(name,text){
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  a.href=url; a.download=name; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); },1500);
}
function ingestOdds(rows,week){
  const w=week||currentWeek();
  const gs=gamesIn(w), gids=new Set(gs.map(g=>g.id));
  /* rows from a payload that names the player by id need no names; older ones are matched
     by name among the week's rosters, built only when such a row turns up */
  let byName=null;
  const names=()=>{ if(byName) return byName; byName={};
    for(const g of gs){ const r=rosterFor(g,true);
      for(const team in r) for(const x of r[team].players) (byName[normName(x.pl.n)]??=[]).push({gid:g.id,pid:x.pl.id}); }
    return byName; };
  for(const gid of gids) delete S.odds[gid];
  let n=0;
  for(const row of rows){
    const ml=parseFloat(row.odds); if(!isFinite(ml)||ml===0) continue;
    const mk=marketKey(row.market); if(!mk) continue;
    const k=parseFloat(row.threshold); if(!isFinite(k)) continue;
    const gid=(row.game_id||'').trim();
    if(gid&&!gids.has(gid)) continue;   /* a game this week does not have: last season's file at a rollover */
    let hit=null;
    if(row.pid&&gid) hit={gid,pid:row.pid};
    else { const cands=names()[normName(row.player)]||[];
      hit=gid?cands.find(c=>c.gid===gid):null;
      if(!hit&&!gid&&cands.length===1) hit=cands[0]; }
    if(!hit) continue;
    ((((S.odds[hit.gid]??={})[hit.pid]??={})[mk]??={}))[String(k)]=ml;
    n++;
  }
  /* no interactive upload any more: the only caller is applyBaked */
  return {n};
}
/* ---------- data baked into the page by build/weekly.py ----------
   Scores and lines, injuries, prices and player stats all arrive inside the payload and go
   through the same ingest functions the upload buttons use, so a game is graded before its
   stats are folded in and applying it twice is a no-op. Prices for a week already in this
   browser are left alone, so a rebuild never overwrites what is on the page. */
function applyBaked(){
  const done={sched:0,inj:0,prices:0,stats:[]};
  buildNorm();   /* price matching projects every player, which needs the league averages ready */
  const byId=Object.fromEntries(S.sched.map(g=>[g.id,g]));
  for(const p of PAY.sched){ const g=byId[p.id]; if(!g) continue;
    for(const k of ['d','t','sp','tot','hs','as','mla','mlh','spa','sph','tov','tou']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }
  /* the build pulled lines when it ran, so the freshness note counts from then */
  if(PAY.baked_at){ const t=Date.parse(PAY.baked_at); if(isFinite(t)&&!(S.gamesFetched>t)) S.gamesFetched=t; }
  /* the season replays week by week, each week graded on its own injury report, the one that
     stood at its kickoffs, and before today's roster: the record scores the page a reader saw
     that week, not the week rebuilt from today's news */
  const inj=PAY.injuries||[];
  RSTAT={}; INJ={};
  for(const id of Object.keys(S.inactive)) if(S.inactive[id]&&S.inactive[id].week==='season') delete S.inactive[id];
  for(const w of Object.keys(PAY.stats||{}).sort((a,b)=>a-b)){
    if(gamesIn(+w).some(g=>!S.processedGames[g.id])) ingestInjuries(inj,+w,true);
    const r=ingestStats(PAY.stats[w]); done.stats.push(...r.done.map(g=>g.id)); }
  /* then today's: this week's report, and the roster's statuses and teams */
  done.inj=ingestInjuries(inj).out;
  done.roster=applyRoster(PAY.roster);
  /* prices last, by the player id the job put on each row, so a rookie whose first stats were
     just replayed has his prices too. They are reloaded whenever the build that carried them
     changes, and left alone when it has not; a week that already holds Thursday's game must
     still take Saturday's. */
  const pricesFrom=PAY.baked_at||PAY.build||'';
  if(S.pricesFrom!==pricesFrom){
    for(const w of Object.keys(PAY.prices||{}).sort((a,b)=>a-b)) done.prices+=ingestOdds(PAY.prices[w],+w).n;
    if(Object.keys(PAY.prices||{}).length) S.pricesFrom=pricesFrom; }
  return done;
}
