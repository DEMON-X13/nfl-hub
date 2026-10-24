/* ---------- the matchup bubble ----------
   The owner, 17 October 2026: "in the parlay builder, when i click on a player or a team, bring up a bubble pop up
   where it shows their matchup for the day so i can see info at a glance."

   A leg's name on the Parlay Builder tab and on Suggested Parlays (the Top lines, the builder's rows, a set's
   level cards and the Elo picks' cards) is, on this page, a button the props parts draw (glanceName in part3.js,
   app v114): data-glance "p:<pid>" for a player's line, "t:<ABBR>" for a team's moneyline or spread, "g:<gid>" for
   a game total, the leg's game in data-glance-game and the leg itself kept by its signature (window.glanceLeg). The
   parts draw it only where this module is on the page (window.hubGlance), so the prop model's own page keeps plain
   names. One delegated click on a name (Enter and Space too: it is a button) opens a small window anchored to it:
   below the name, above it where there is no room below, kept inside the screen; a sheet across the foot of the
   screen at 640px and under, and wherever neither side of the name has 160px for it (a landscape phone). It is
   role="dialog" aria-modal="false", labelled by its heading; the focus moves into it and Tab stays inside while it
   is open; Escape, Close (44px), a click outside it or a click on another name close it, the focus going back to
   the name. It sits under the page's windows (z-index 45; the Game snapshot it opens closes it first).

   The same leg is often drawn in several places at once (a Top row and its builder row, one set's Safe to Extreme
   cards, a set's card and an Elo pick's), so the bubble keeps the place it was opened from (the builder, the Top lines,
   or a level card in its set or in the Elo picks: placeOf) and the leg's key, side and line, and when the page draws
   its rows again while it is open (a MutationObserver, connected only then) it is bound to that place's copy of the
   leg (marked open, placed again, drawn again where the copy's price moved), or closed, the focus on the leg's
   neighbour there, where that place no longer draws the leg. Placed again, it keeps where the reader had scrolled it.

   What it shows is a few lines, no paragraphs, every number read from what the page already has (nothing is
   fetched, nothing is saved): for a player his club and position, his status on the injury report as the page
   reads it, his season Elo with its shield, tier and rank at his position (players.json; prov. where provisional),
   the game (the opponent, home or away, the kickoff in ET), the defense he faces as the ELO Ratings tab's own table
   for his leg's side of the ball names and ranks it (model.json's units: a quarterback the opponent's Overall Defense, a
   back its Run Defense, a receiver or tight end its Pass Defense, as the Game snapshot's position matchups set them:
   window.eloGlance.unit), his mismatch's grade and edge where the Props tab's Mismatches have one (matchups.json,
   window.eloMismatches; no rank of its own), the stats where the Elo part of the matchup has held up (muTrusted)
   with his recent form and the matchup's projection, and the leg it was opened from: its line, the price its row
   shows, the model's chance, the book's fair chance (legFair), market + form (eloAltP) and the Elo matchup's chance
   (eloMatchupP), both on that price. For a team's or a game's leg, both clubs' records as Team Rankings counts
   them, the line the leg stands on (the prop model's own row, DraftKings' named so; state.json's closing line only for
   a game it has no row for), each club's Power Rating and rank, Overall Offense against Overall Defense
   each way, each model's pick (the Game snapshot's own readings, window.gsReadings), the leg's team marked "this
   leg" and, on a moneyline alone, each model picking that team to win ticked, the leg, and Open game snapshot.
   What a file has not given says so in its own line, and the rest draws. */
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ordinal=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:(n%10<4?n%10:0)]||'th');
const pc0=p=>(p*100).toFixed(0)+'%';
const dec=x=>Math.abs(x)>=10?x.toFixed(0):x.toFixed(1);
const N=(key,v)=>`<b data-glance-n="${esc(key)}">${esc(v)}</b>`;
const tg=t=>window.pkTag?window.pkTag(t,window.pkTagColor?window.pkTagColor(t):null,false,'mini'):`<b>${esc(t)}</b>`;
const shield=e=>e!=null&&window.pkTierBadge?window.pkTierBadge(e):'';
const tierName=e=>{ const t=e!=null&&window.pkEloTier?window.pkEloTier(e):null; return t?t[0]:''; };
const nick=t=>(typeof TEAM_NAMES==='object'&&TEAM_NAMES&&TEAM_NAMES[t])||t;
const fmtPx=v=>typeof fmtML==='function'?fmtML(v):(v>0?'+'+v:String(v));
const Sx=()=>(typeof S==='object'&&S)?S:null;
const propsRow=gid=>{ const s=Sx(); return s&&Array.isArray(s.sched)?s.sched.find(x=>x.id===gid)||null:null; };
const board=()=>window.pkBoard||null;
const boardRow=gid=>{ const P=board(); return P&&P.ST&&Array.isArray(P.ST.sched)?P.ST.sched.find(x=>x.game_id===gid)||null:null; };

/* the ELO Ratings tab's one read of its files, as the Game snapshot waits on it */
let FILES=null;
if(typeof window.eloFiles==='function') Promise.resolve(window.eloFiles()).then(f=>{ FILES=f||{}; if(cur) draw(); },
  e=>{ FILES={err:String(e&&e.message||e)}; if(cur) draw(); });

/* the kickoff in ET: the schedule's own date and time, which are US Eastern */
function kickEt(d,t){
  if(!d) return '';
  const day=new Date(d+'T12:00:00Z');
  const ds=isNaN(day)?d:day.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
  const m=/^(\d{1,2}):(\d{2})/.exec(t||''); if(!m) return ds;
  const h=+m[1]; return `${ds} · ${(h%12)||12}:${m[2]} ${h<12?'AM':'PM'} ET`;
}
/* the game the bubble is about: the season's row (state.json's schedule, through window.pkBoard) where it has one, else
   the prop model's own row in that shape, so a game the season does not carry still draws what it has */
function gameView(gid){
  const b=boardRow(gid); if(b) return {g:b,board:true,a:b.away_team,h:b.home_team,week:+b.week,d:b.gameday,t:b.gametime};
  const r=propsRow(gid); if(!r) return null;
  return {g:{game_id:r.id,week:r.w,gameday:r.d,gametime:r.t,away_team:r.a,home_team:r.h,spread_line:r.sp,total_line:r.tot,game_type:'REG'},board:false,a:r.a,h:r.h,week:+r.w,d:r.d,t:r.t,row:r};
}
/* the leg the bubble was opened from, as its row drew it */
const legOf=sig=>sig&&typeof window.glanceLeg==='function'?window.glanceLeg(sig):null;

let cur=null, box=null;
/* where a name is drawn, worked out from the page when the bubble opens, so a redraw finds the same copy of it: the
   builder (#parlayBody), the Top lines (#pbPanel), or a level card (.pb-tier[data-pb-tier]) in its section, a
   set's and an Elo pick's under its unit ([data-sp-game], a night game or the Sunday slot, inside #spPanel; an Elo
   pick's level ids are elo-<level>, so a unit's eight cards are eight places); anywhere else the nearest element with
   an id. One leg is often drawn in several
   places at once (a Top row and its builder row, one set's Safe to Extreme cards, a set's card and an Elo pick's),
   but within one of these once: the builder holds one leg a stat, the list each bet once, a card one leg a player.
   A leg is known there by its key, side and line (its signature less the price, its source and the model's chance,
   which a Refresh odds press or a rung's book price can move while the leg stays) */
const qv=v=>'"'+String(v).replace(/["\\]/g,'\\$&')+'"';
const legId=sig=>{ const p=String(sig||'').split('|'); return p.length>3?p.slice(0,-3).join('|'):p.join('|'); };
function placeOf(btn){
  const sec=btn.closest('#parlayBody,#pbPanel,[data-sp-game]')||btn.closest('[id]'); if(!sec) return null;
  const s=sec.id?`[id=${qv(sec.id)}]`:`[data-sp-game=${qv(sec.dataset.spGame)}]`, card=btn.closest('.pb-tier[data-pb-tier]');
  return card&&sec.contains(card)?`${s} .pb-tier[data-pb-tier=${qv(card.dataset.pbTier)}]`:s;
}
const namesIn=el=>el?[...el.querySelectorAll('[data-glance]')]:[];
const sameLeg=(b,c)=>b.dataset.glance===c.of&&(b.dataset.glanceGame||'')===c.gid&&legId(b.dataset.glanceLeg)===c.leg;
/* the open bubble's name: the one it was opened from while that is on the page, else, after a redraw, the same
   leg's copy in the same place (marked open, and the bubble's leg the copy's, so its numbers follow a new price) */
function anchor(){
  if(!cur) return null;
  if(cur.from&&cur.from.isConnected) return cur.from;
  const pl=cur.place?document.querySelector(cur.place):null, same=namesIn(pl).find(b=>sameLeg(b,cur))||null;
  if(same){ cur.from=same; same.setAttribute('aria-expanded','true');
    if(same.dataset.glanceLeg!==cur.sig){ cur.sig=same.dataset.glanceLeg||''; cur.stale=true; } }
  return same;
}

/* ---- the leg it was opened from ---- */
function legHtml(K){
  if(!K||!K.leg) return '';
  const l=K.leg, price=K.price, src=K.src, out=[];
  const est=src==='dkline'||src==='est'?' est.':src==='fair'?' fair':'';
  out.push(`<div><dt>Price</dt><dd>${N('price',price!=null&&isFinite(price)?fmtPx(price)+est:'–')}</dd></div>`);
  if(l.p!=null&&isFinite(l.p)) out.push(`<div><dt>Model</dt><dd>${N('model',pc0(l.p))}</dd></div>`);
  let f=null; try{ f=typeof legFair==='function'?legFair(l):null; }catch(e){ f=null; }
  out.push(`<div><dt>Fair</dt><dd>${f&&f.p!=null?N('fair',pc0(f.p)+(f.est?' est.':'')):'<span class="glance-q" data-glance-n="fair">none</span>'}</dd></div>`);
  if(!/^(t|g):/.test(cur.of)){
    let mf=null; try{ mf=typeof window.eloAltP==='function'?window.eloAltP(l.pid,l.side,price,src,l.stat):null; }catch(e){ mf=null; }
    if(mf!=null) out.push(`<div><dt>Market + form</dt><dd>${N('mf',Math.round(mf*100)+'%')}</dd></div>`);
    /* no Elo matchup for a player the page has ruled out: the bubble says above that he has none to show (the
       matchups file can be hours behind the report the page reads) */
    const ruled=typeof window.eloRuledOut==='function'&&window.eloRuledOut(l.pid);
    let mu=null; try{ mu=!ruled&&typeof window.eloMatchupP==='function'&&typeof mlProb==='function'&&price!=null&&isFinite(price)?window.eloMatchupP(l,mlProb(price)):null; }catch(e){ mu=null; }
    if(mu!=null) out.push(`<div><dt>Elo matchup</dt><dd>${N('mu',Math.round(mu*100)+'%')}</dd></div>`);
  }
  return `<div class="glance-leg" data-glance-legbox><p class="glance-lt"><span class="glance-k">This leg</span> ${N('label',l.label||'')}</p><dl class="glance-nums">${out.join('')}</dl></div>`;
}
function snapBtn(gid){
  return boardRow(gid)&&typeof window.gameSnapshot==='function'?`<div class="glance-acts"><button type="button" class="btn quiet glance-snap" data-glance-snap="${esc(gid)}">Open game snapshot</button></div>`:'';
}

/* ---- a player ---- */
function playerHtml(){
  const pid=cur.id, gid=cur.gid, K=legOf(cur.sig), L=K&&K.leg, G=gameView(gid), F=FILES;
  const Pl=F&&F.players, e=Pl&&Pl.players&&Pl.players[pid]||null, sp=Sx()&&Sx().players&&Sx().players[pid]||null, mu=F&&F.mu;
  /* his side of the ball is the leg's (a receiving line is an offense's, whatever position he is rated at: Travis
     Hunter, rated a defensive back, has receiving lines), so the defense he faces follows the leg; his Elo and rank
     stay the ratings file's, at the position he is rated at, which the rank line names */
  const name=(L&&L.name)||(e&&e.name)||(sp&&sp.n)||pid, grp=(L&&L.grp)||(sp&&sp.grp)||(e&&e.group)||'';
  const pos=(L&&L.pos)||(sp&&sp.pos)||grp, team=(L&&L.team)||(sp&&sp.team)||(e&&e.team)||'';
  const opp=G?(team===G.h?G.a:team===G.a?G.h:(L&&L.opp)||''):(L&&L.opp)||'', home=G?team===G.h:null;
  const lines=[];
  /* his status, as the page reads the report and the roster */
  let it=null; try{ it=typeof injTag==='function'?injTag(pid):null; }catch(e){ it=null; }
  const outWhy=window.eloGlance&&window.eloGlance.outWhy?window.eloGlance.outWhy(pid):null;
  const status=it?`<span class="inj inj-${esc(it.k)}" data-glance-n="inj">${esc(it.t)}</span> <span class="glance-why">${esc(it.title||'')}</span>`
    :outWhy?`<span class="inj inj-out" data-glance-n="inj">OUT</span> <span class="glance-why">${esc(outWhy)}</span>`:'';
  const sub=`<p class="glance-sub"><span data-glance-n="pos">${esc(pos)}</span>${team?` · <span data-glance-n="team">${esc(team)}</span>`:''}${status?` ${status}`:''}</p>`;
  /* his season Elo, its shield and tier, and his rank at his position */
  if(!F) lines.push(`<div><dt>Season Elo</dt><dd class="glance-q">Loading the ratings…</dd></div>`);
  else if(e&&e.se!=null){
    const grpX=Pl.groups&&Pl.groups[e.group], row=grpX&&(grpX.top||[]).find(x=>x.id===pid);
    lines.push(`<div><dt>Season Elo</dt><dd><span class="glance-sh">${shield(e.se)}</span>${N('se',e.se)} <span data-glance-n="tier">${esc(tierName(e.se))}</span></dd></div>`);
    if(e.rank) lines.push(`<div><dt>Rank</dt><dd>${N('rank','#'+e.rank)}${grpX&&grpX.active?` <span class="glance-q">of <span data-glance-n="of">${esc(grpX.active)}</span> ${esc(String(grpX.label||e.group).toLowerCase())}</span>`:''}${row&&row.prov?' <span class="glance-prov" data-glance-n="prov">prov.</span>':''}</dd></div>`);
  } else {
    const sd=Pl&&Pl.groups?Object.values(Pl.groups).flatMap(x=>x.sidelined||[]).find(x=>x.id===pid):null;
    lines.push(`<div><dt>Season Elo</dt><dd class="glance-q" data-glance-n="noelo">${sd?`not ranked: ${esc(sd.why)}`:F.err&&!Pl?'the ratings did not load':'no Elo rating this season'}</dd></div>`);
  }
  /* the game */
  if(G) lines.push(`<div><dt>Game</dt><dd>${home==null||!opp?'':`<span data-glance-n="ha">${home?'vs':'at'}</span> <span data-glance-n="opp">${tg(opp)}</span> · `}<span data-glance-n="kick">${esc(kickEt(G.d,G.t))}</span></dd></div>`);
  /* the defense he faces: the ELO Ratings tab's own table for his side of the ball (a quarterback the opponent's
     Overall Defense, a back its Run Defense, a receiver or tight end its Pass Defense, as the Game snapshot's position
     matchups set them), named as the tab names it and ranked as its table draws the club (eloGlance.unit); none for a
     kicker or where the tab has no such table */
  const GL=window.eloGlance||null;
  if(F&&G&&opp&&(team===G.h||team===G.a)){ let u=null; try{ u=GL&&GL.unit?GL.unit(grp,opp):null; }catch(e){ u=null; }
    if(u) lines.push(`<div data-glance-faces="${esc(u.key)}"><dt>Faces</dt><dd title="The ELO Ratings tab's ${esc(u.name)} table: ${esc(u.team)} ${esc(ordinal(u.rank))} of ${esc(u.n)}"><span data-glance-n="uclub">${tg(u.team)}</span> <span data-glance-n="unit">${esc(u.name)}</span> ranked ${N('urank',ordinal(u.rank))} <span class="glance-q">of <span data-glance-n="uof">${esc(u.n)}</span>${u.carried?` · <span data-glance-n="ucarry">carried from ${esc(u.from)}</span>`:''}</span></dd></div>`); }
  /* his Elo matchup this week, as the ELO Ratings tab and the Mismatches have it */
  let table='';
  const v=mu&&mu.players&&mu.players[pid]||null;
  const ruled=typeof window.eloRuledOut==='function'&&window.eloRuledOut(pid);
  if(!F) {}
  else if(!mu) lines.push(`<div><dt>Matchup</dt><dd class="glance-q" data-glance-n="nomu">the matchups did not load</dd></div>`);
  else if(!v||v.game_id!==gid) lines.push(`<div><dt>Matchup</dt><dd class="glance-q" data-glance-n="nomu">${v?`the matchups file has him in another game (week ${esc(mu.week)})`:`none in the matchups file for week ${esc(mu.week)}`}</dd></div>`);
  else if(ruled) lines.push(`<div><dt>Matchup</dt><dd class="glance-q" data-glance-n="nomu">not expected to play</dd></div>`);
  else {
    /* the Props tab's Mismatches: its grade and edge, on the matchup formula's player ratings of the units he faces
       (its title says which); no rank of its own, so the bubble never ranks one defense twice */
    let mm=null; try{ mm=typeof window.eloMismatches==='function'?(window.eloMismatches()||[]).find(x=>x.pid===pid&&x.game_id===gid):null; }catch(e){ mm=null; }
    if(mm&&GL&&GL.grade){ const ag=GL.against?GL.against(v.group):null;
      lines.push(`<div data-glance-mm><dt>Mismatch</dt><dd title="The Props tab's Mismatches: his Elo above his position's average plus how far the ${esc(v.opp)} ${esc(ag||'defense')} stand${ag&&/ and /.test(ag)?'':'s'} below the league's, on the matchup formula's player ratings, in standard deviations">${N('mm',GL.grade(mm.score)[0])} · edge ${N('gap',mm.score.toFixed(1))} <span class="glance-q">SD</span></dd></div>`); }
    const st=(mu.stats&&mu.stats[v.group]||Object.keys(v.stats||{})).filter(s=>v.stats&&v.stats[s]&&GL&&GL.trusted(v.group,s));
    table=st.length?`<table class="glance-t" aria-label="His trusted stats: recent form and the Elo matchup's projection"><thead><tr><th scope="col">Stat</th><th scope="col" class="glance-n">Form</th><th scope="col" class="glance-n">Projected</th></tr></thead><tbody>${st.map(s=>{ const a=v.stats[s];
        return `<tr data-glance-stat="${esc(s)}"${L&&L.stat===s?' class="glance-on"':''}><th scope="row">${esc((GL.labels&&GL.labels[s])||s)}</th><td class="glance-n" data-glance-n="form">${esc(dec(a[0]))}</td><td class="glance-n"><span aria-hidden="true">→ </span><b data-glance-n="proj">${esc(dec(a[1]))}</b></td></tr>`; }).join('')}</tbody></table>`
      :`<p class="glance-q glance-none" data-glance-n="notrust">No trusted stats.</p>`;
  }
  /* (app v134) his projection for this game and his season week by week (the props parts' playerCard), and a button to
     his row on the game's page */
  let card=''; try{ card=typeof window.playerCard==='function'?window.playerCard(pid,gid):''; }catch(e){ card=''; }
  const PB=board(), propBtn=PB&&typeof PB.openOnProps==='function'&&(!PB.canProps||PB.canProps(gid))?`<div class="glance-acts"><button type="button" class="btn glance-snap" data-glance-prop="${esc(gid)}" data-glance-pid="${esc(pid)}">Open prop leg</button></div>`:'';
  return {title:esc(name),body:`${sub}<dl class="glance-kv">${lines.join('')}</dl>${table}${legHtml(K)}${card}${propBtn}${snapBtn(gid)}`};
}

/* ---- a team, or a game ---- */
function teamHtml(){
  const gid=cur.gid, me=cur.of.startsWith('t:')?cur.id:null, K=legOf(cur.sig), G=gameView(gid), P=board(), F=FILES, R=window.gsReadings||null;
  /* the leg's team is marked "this leg" (it is a row's line, not a bet the visitor has made); a model's pick is ticked
     as going with it only on a moneyline, to win, where a model's winner is the leg's own question: a pick to win
     says nothing of a cover (Vegas's own favourite covers its line about half the time), and a total has no side */
  const stat=(K&&K.leg&&K.leg.stat)||String(cur.sig||'').split('|')[2]||'', toWin=!!me&&stat==='ml';
  if(!G) return {title:esc((K&&K.leg&&K.leg.name)||gid),body:`<p class="glance-q">This game is not on the schedule the page has.</p>${legHtml(K)}`};
  const a=G.a, h=G.h, g=G.g, M=F&&F.model;
  const title=`${esc(nick(a))} ${P&&P.neutral&&P.neutral(g)?'vs':'at'} ${esc(nick(h))}`;
  const sub=`<p class="glance-sub">${P&&P.weekName?esc(P.weekName(G.week)):'Week '+esc(G.week)} · <span data-glance-n="kick">${esc(kickEt(G.d,G.t))}</span></p>`;
  const col=t=>`<th scope="col" data-glance-team="${esc(t)}"${t===me?' class="glance-me"':''}>${tg(t)}${t===me?' <small class="glance-mine">this leg</small>':''}</th>`;
  const rows=[];
  /* records, as Team Rankings counts them */
  if(R&&P&&P.ST){ const rec=t=>{ const r=R.recordOf(P,M,t), x=r.reg; return x[0]+'-'+x[1]+(x[2]?'-'+x[2]:''); };
    rows.push(`<tr data-glance-row="rec"><th scope="row">Record</th><td>${N('rec:'+a,rec(a))}</td><td>${N('rec:'+h,rec(h))}</td></tr>`); }
  /* Power Ratings, ranked as Team Rankings ranks them */
  const T=R&&F?R.teamsOf(F,g):null;
  if(T) rows.push(`<tr data-glance-row="pr"><th scope="row">Power Rating</th>${[a,h].map(t=>`<td><span class="glance-sh">${shield(T.T[t].elo)}</span>${N('pr:'+t,T.T[t].elo)} <small class="glance-q">${N('prk:'+t,'#'+T.rank(t))}</small></td>`).join('')}</tr>`);
  const tbl=`<table class="glance-vs"><thead><tr><td></td>${col(a)}${col(h)}</tr></thead><tbody>${rows.join('')}</tbody></table>${!F?'<p class="glance-q">Loading the ratings…</p>':!T?'<p class="glance-q" data-glance-n="nopr">No Power Rating for these clubs.</p>':''}`;
  /* the line the leg stands on: the prop model's own row for the game (its spread, total and moneylines, the numbers
     the leg, the Top lines and the Game bets card are priced on: DraftKings' while its pull is under a day old or
     after a Refresh odds press, so named, else nflverse's posted line); state.json's closing lines only
     for a game the prop model has no row for. Until 18 October 2026 it was the board's wherever the board had the
     game, so a leg "To cover -4.5" at -118 sat under "BUF −5.5 · BUF −258 / LV +210" while the payload had BUF −4.5
     and BUF −230 / LV +190 */
  let line='';
  const pr=propsRow(gid);
  if(pr){ const parts=[], mm=v=>v!=null&&isFinite(v)&&v?(v>0?'+':'−')+Math.abs(Math.round(v)):null;
    if(pr.sp!=null&&isFinite(pr.sp)) parts.push(`<span data-glance-n="spread">${pr.sp>0?esc(h)+' −'+pr.sp:pr.sp<0?esc(a)+' −'+(-pr.sp):'Pick\'em'}</span>`);
    if(pr.tot!=null&&isFinite(pr.tot)) parts.push(`total <span data-glance-n="total">${esc(pr.tot)}</span>`);
    if(mm(pr.mla)||mm(pr.mlh)) parts.push(`<span data-glance-n="ml">${esc(a)} ${mm(pr.mla)||'–'} / ${esc(h)} ${mm(pr.mlh)||'–'}</span>`);
    let src=null; try{ src=typeof lineSource==='function'?lineSource(pr):null; }catch(e){ src=null; }
    line=parts.length?parts.join(' · ')+(pr.ls==='dk'?` <span class="glance-q"${src?` title="${esc(src)}"`:''}>(<span data-glance-n="lsrc">DraftKings</span>)</span>`:'')
      :'<span class="glance-q" data-glance-n="noline">no line posted yet</span>'; }
  else if(G.board&&R&&P){ const Lx=R.lineOf(P,g), parts=[];
    if(Lx.spTxt) parts.push(`<span data-glance-n="spread">${esc(Lx.spTxt)}</span>`);
    if(Lx.tot!=null) parts.push(`total <span data-glance-n="total">${esc(Lx.tot)}</span>`);
    if(Lx.mlA||Lx.mlH) parts.push(`<span data-glance-n="ml">${esc(a)} ${esc(Lx.mlA||'–')} / ${esc(h)} ${esc(Lx.mlH||'–')}</span>`);
    line=parts.length?parts.join(' · '):'<span class="glance-q" data-glance-n="noline">no line posted yet</span>'; }
  else line='<span class="glance-q" data-glance-n="noline">no line posted yet</span>';
  /* Overall Offense against Overall Defense, each way */
  let poss='';
  const X=R&&F?R.unitsOf(F):null;
  if(X&&X.on){ const U=X.U;
    const one=(o,d)=>{ const vo=U.off[o], vd=U.def[d]; if(!vo||!vd) return '';
      return `<li data-glance-poss="${esc(o)}-${esc(d)}">${esc(o)} offense ${N('oelo',vo.elo)} <small class="glance-q">${N('ork',ordinal(vo.rank))}</small> <span class="glance-q">vs</span> ${esc(d)} defense ${N('delo',vd.elo)} <small class="glance-q">${N('drk',ordinal(vd.rank))}</small></li>`; };
    const both=one(a,h)+one(h,a); if(both) poss=`<p class="glance-h4">Offense vs defense</p><ul class="glance-poss">${both}</ul>`; }
  /* every model's pick, the clicked team's side marked */
  let picks='';
  if(R&&P&&G.board){ const C=R.callsOf(P,g,F);
    const MOD=[['vegas','Vegas'],['alpha','Alpha Model'],['joker','The Joker'],['elo','ELO Model']];
    picks=`<p class="glance-h4">Picks</p><ul class="glance-picks">${MOD.map(([id,lab])=>{ const x=C[id];
      if(!x||(x.pick!==a&&x.pick!==h)) return `<li data-glance-model="${id}"><span>${lab}</span><span class="glance-q">no call</span></li>`;
      const p=R.chanceOf(x,g), mine=toWin&&x.pick===me;
      return `<li data-glance-model="${id}" data-pick="${esc(x.pick)}"${mine?' class="glance-with"':''}><span>${lab}</span><span>${tg(x.pick)} ${N('p:'+id,p!=null?Math.round(p*100)+'%':'–')}${mine?' <span class="glance-chk" aria-label="picks this leg to win" role="img">✓</span>':''}</span></li>`; }).join('')}</ul>`; }
  return {title,body:`${sub}${tbl}<p class="glance-line"><span class="glance-k">Line</span> ${line}</p>${poss}${picks}${legHtml(K)}${snapBtn(gid)}`};
}

/* ---- the window ---- */
function make(){
  if(box) return box;
  box=document.createElement('div'); box.id='glanceBox'; box.className='glance-pop'; box.hidden=true;
  box.setAttribute('role','dialog'); box.setAttribute('aria-modal','false'); box.setAttribute('aria-labelledby','glanceTitle'); box.tabIndex=-1;
  document.body.appendChild(box);
  box.addEventListener('click',e=>{
    const t=e.target&&e.target.closest?e.target:null; if(!t) return;
    if(t.closest('[data-glance-close]')){ close(true); return; }
    const pp=t.closest('[data-glance-prop]');
    if(pp){ const gid=pp.dataset.glanceProp, pid=pp.dataset.glancePid, P=board(); close(false); if(P&&typeof P.openOnProps==='function') P.openOnProps(gid,pid); return; }
    const sn=t.closest('[data-glance-snap]');
    if(sn){ const gid=sn.dataset.glanceSnap, from=anchor(); close(false); if(typeof window.gameSnapshot==='function') window.gameSnapshot(gid,from||undefined); }
  });
  box.addEventListener('keydown',e=>{
    if(e.key!=='Tab') return;
    const f=focusables(box);
    if(!f.length){ e.preventDefault(); return; }
    const first=f[0], last=f[f.length-1], at=document.activeElement;
    if(e.shiftKey&&(at===first||at===box||!box.contains(at))){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey&&(at===last||!box.contains(at))){ e.preventDefault(); first.focus(); }
  });
  return box;
}
const FOCUSABLE='button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
const focusables=el=>el?[...el.querySelectorAll(FOCUSABLE)].filter(x=>!x.disabled&&!x.closest('[hidden]')):[];
const sheet=()=>{ try{ return !!(window.matchMedia&&window.matchMedia('(max-width:640px)').matches); }catch(e){ return false; } };
/* the least room a side of the name must give the bubble, scrolling inside it, before it is drawn there */
const ROOM_MIN=160;
/* below the name, above it where there is no room below, inside the screen; a sheet across the foot of the screen
   at 640px and under, and wherever neither side of the name has ROOM_MIN for it (a landscape phone, about 330px
   tall or less), since a bubble held to its floor there would cover the name and run off the screen. Where the
   reader has scrolled the bubble, the scroll is kept: measuring its whole height clears its max-height, and the
   browser takes the scroll back to the top on that measure (any redraw on the page, or a resize, placed it again) */
function place(){
  if(!box||box.hidden) return;
  const scrolled=box.scrollTop||0;
  let sh=sheet();
  if(!sh){
    /* the name's own block (the name and its line under it), so the bubble never covers what the leg is */
    const a=anchor(), at=a&&(a.closest('.nm,td.plr')||a); let r=null; try{ r=at?at.getBoundingClientRect():null; }catch(e){ r=null; }
    if(!r){ box.classList.remove('glance-sheet'); if(scrolled) box.scrollTop=scrolled; return; }
    const de=document.documentElement, vw=de.clientWidth||window.innerWidth||0, vh=window.innerHeight||de.clientHeight||0, pad=8, gap=6;
    box.classList.remove('glance-sheet'); box.style.maxHeight='';   /* its whole height as a bubble, border and all (border-box), before the room is chosen */
    const bw=box.offsetWidth||0, bh=box.offsetHeight||0, below=vh-r.bottom-gap-pad, above=r.top-gap-pad;
    const down=bh<=below||below>=above, room=down?below:above, fits=bh<=room;
    if(!fits&&room<ROOM_MIN) sh=true;
    else {
      const top=down?r.bottom+gap:r.top-gap-Math.min(bh,room), left=Math.max(pad,Math.min(r.left,vw-bw-pad));
      box.style.maxHeight=Math.round(room)+'px';
      box.style.left=Math.round(left+(window.scrollX||0))+'px'; box.style.top=Math.round(Math.max(pad,top)+(window.scrollY||0))+'px';
    }
  }
  box.classList.toggle('glance-sheet',sh);
  if(sh){ box.style.left=''; box.style.top=''; box.style.maxHeight=''; }
  if(scrolled) box.scrollTop=scrolled;
}
function draw(){
  if(!cur||!box) return;
  const at=document.activeElement, inBox=box.contains(at), key=inBox&&at!==box?['glanceClose','glanceSnap'].find(k=>at.dataset&&at.dataset[k]!=null):null;
  let v; try{ v=cur.of.startsWith('p:')?playerHtml():teamHtml(); }catch(e){ v={title:'Matchup',body:`<p class="glance-q">This could not be drawn: ${esc(e&&e.message||e)}.</p>`}; }
  box.dataset.glanceOf=cur.of; box.dataset.glanceGame=cur.gid;
  box.innerHTML=`<div class="glance-hd"><h3 class="glance-title" id="glanceTitle">${v.title}</h3><button type="button" class="btn quiet glance-x" data-glance-close>Close</button></div><div class="glance-body">${v.body}</div>`;
  if(key){ const nx=box.querySelector(`[data-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}]`); try{ (nx||box).focus({preventScroll:true}); }catch(e){} }
  else if(inBox){ try{ box.focus({preventScroll:true}); }catch(e){} }
  place();
}
function open(btn){
  const of=btn.dataset.glance||'', i=of.indexOf(':'); if(i<1) return;
  if(cur) close(false);
  const sig=btn.dataset.glanceLeg||'', place=placeOf(btn), tab=btn.closest('[id^="tab-"]');
  cur={of,kind:of.slice(0,i),id:of.slice(i+1),gid:btn.dataset.glanceGame||'',sig,leg:legId(sig),from:btn,place,tab:tab?tab.id:null,
    at:Math.max(0,namesIn(place&&document.querySelector(place)).indexOf(btn))};
  make(); box.hidden=false; btn.setAttribute('aria-expanded','true');
  draw();
  try{ box.focus({preventScroll:true}); }catch(e){}
  watch(true);
}
function close(restore){
  if(!cur) return;
  watch(false);
  const a=anchor(), had=!!box&&box.contains(document.activeElement); cur=null;
  if(box){ box.hidden=true; box.innerHTML=''; }
  for(const b of document.querySelectorAll('[data-glance][aria-expanded]')) b.removeAttribute('aria-expanded');
  if(restore&&a){ try{ a.focus({preventScroll:true}); }catch(e){} }
  /* closed with the focus inside it by something that takes no focus of its own (the tab changed by the address:
     a hash change or Back clicks the tab's button for the reader): once that click has done its work (the tab
     switched), the focus goes to its name where that is still on the screen, else to the chosen tab's button, never
     lost to the page's body */
  else if(had) setTimeout(()=>{ const at=document.activeElement;
    if(at&&at!==document.body&&at.isConnected&&!at.closest('[hidden]')) return;
    const to=a&&a.isConnected&&!a.closest('[hidden]')?a:document.querySelector('#tabs button[aria-selected="true"]');
    if(to) try{ to.focus({preventScroll:true}); }catch(e){} },0);
}
/* the page draws its rows again while a bubble is open (the half-minute look at a kickoff or a lock, a Refresh
   odds press finishing, a level built again, the builder's own redraw): one MutationObserver on the page, connected
   only while a bubble is open, so the bubble follows whatever draws them, the props parts' renderParlay, renderPb and
   renderSp and the Elo picks' own alike, without glance.js wrapping any of them. After each redraw the bubble is
   bound again to its leg's copy in the place it was opened from (anchor), drawn again where the copy's numbers moved,
   placed again (a row above may have gone) and its name marked open; where that place no longer draws the leg (it
   left the builder, its game kicked off, its set moved on), the bubble closes (gone) */
let MO=null;
function watch(on){
  if(typeof MutationObserver!=='function') return;
  if(!MO) MO=new MutationObserver(recs=>{ if(!cur||!box||recs.every(r=>box.contains(r.target))) return; sync(); });
  if(on) MO.observe(document.body,{childList:true,subtree:true});
  else { MO.takeRecords(); MO.disconnect(); }
}
function sync(){
  if(!cur||!box||box.hidden) return;
  const a=anchor(); if(!a){ gone(); return; }
  const pl=cur.place&&document.querySelector(cur.place), i=namesIn(pl).indexOf(a); if(i>=0) cur.at=i;
  if(cur.stale){ cur.stale=false; draw(); } else place();
}
/* the leg is gone from where its bubble was opened: the bubble closes and the focus, where it was in the bubble (or
   lost with the old row), goes to the leg's neighbour in that place (the name now at its place in the list, else the
   last), else the place's first control, else the first control of the tab it was on, never to the page's body */
function gone(){
  const c=cur, at=document.activeElement, mine=!at||at===document.body||(!!box&&box.contains(at))||(!!c.from&&at===c.from)||!at.isConnected;
  close(false);
  if(!mine) return;
  const pl=c.place&&document.querySelector(c.place), names=namesIn(pl).filter(b=>!b.disabled&&!b.closest('[hidden]'));
  const to=names[Math.min(c.at,names.length-1)]||focusables(pl)[0]||focusables(c.tab&&document.getElementById(c.tab))[0]||null;
  if(to) try{ to.focus({preventScroll:true}); }catch(e){}
}
/* a click outside the bubble closes it, before anything else answers it; a name opens its own (or, the open
   one's, closes it); the focus goes back to the name unless the click was on something that takes it */
document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest?e.target:null; if(!t) return;
  const nm=t.closest('[data-glance]');
  if(cur&&box&&!box.contains(t)){
    if(nm&&nm===anchor()){ close(false); return; }
    close(!nm&&!t.closest('button,a[href],input,select,textarea,label,[tabindex]'));
  }
  if(nm) open(nm);
},true);
document.addEventListener('keydown',e=>{
  if(!cur||e.key!=='Escape') return;
  if(document.querySelector('.modal:not([hidden])')) return;
  e.preventDefault(); e.stopPropagation(); close(true);
},true);
window.addEventListener('resize',()=>place());

/* its styles, every one prefixed glance-, on the hub's tokens (theme.css: the dark :root and the light
   html[data-theme="light"] alike), so it reads the same in both looks */
const css=document.createElement('style'); css.id='glanceCss';
css.textContent=`
.glance-name{-webkit-appearance:none;appearance:none;position:relative;z-index:1;display:inline-block;box-sizing:border-box;min-height:44px;max-width:100%;margin:-14px 0;padding:14px 0;border:0;border-radius:4px;background:none;font:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;text-align:inherit;vertical-align:baseline;cursor:pointer;overflow-wrap:anywhere;text-decoration:underline dotted;text-decoration-thickness:1px;text-underline-offset:3px;box-shadow:none}
.glance-name:hover{text-decoration-style:solid}
.glance-name:focus{outline:none}
.glance-name:focus-visible::after{content:"";position:absolute;left:-4px;right:-4px;top:50%;height:calc(1.35em + 6px);transform:translateY(-50%);border:2px solid var(--ink);border-radius:6px;pointer-events:none}
.glance-pop{position:absolute;z-index:45;box-sizing:border-box;width:360px;max-width:calc(100vw - 16px);overflow:auto;overscroll-behavior:contain;background:var(--panel);color:var(--ink);border:1px solid var(--line-2);border-radius:14px;box-shadow:0 18px 44px -14px rgba(0,0,0,.6),0 2px 8px rgba(0,0,0,.3);padding:6px 14px 14px;font-family:var(--body);font-size:13px;line-height:1.45;text-align:left}
.glance-pop[hidden]{display:none}
.glance-pop:focus{outline:none}
.glance-pop.glance-sheet{position:fixed;left:0;right:0;bottom:0;top:auto;width:auto;max-width:none;max-height:min(78vh,640px);border-radius:18px 18px 0 0;border-bottom:0;padding:6px 16px calc(16px + env(safe-area-inset-bottom,0px))}
.glance-hd{display:flex;align-items:center;gap:10px;margin:0 -4px 0 0}
.glance-title{flex:1 1 auto;min-width:0;margin:0;font:700 16px/1.3 var(--body);color:var(--ink);overflow-wrap:anywhere}
.glance-x{flex:none;min-height:44px;min-width:44px;padding:0 12px;font-size:13px}
.glance-sub{margin:0 0 8px;color:var(--ink-2);font-size:12.5px}
.glance-sub .inj{margin-left:4px}
.glance-why{color:var(--ink-2)}
.glance-q{color:var(--ink-2);font-weight:500}
.glance-kv{margin:0 0 8px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px}
.glance-kv>div{display:contents}
.glance-kv dt{color:var(--ink-2);font-size:12px;font-weight:600;white-space:nowrap}
.glance-kv dd{margin:0;color:var(--ink);min-width:0;overflow-wrap:anywhere}
.glance-kv dd b,.glance-vs b,.glance-poss b,.glance-picks b,.glance-nums b,.glance-lt b{color:var(--ink);font-weight:700}
.glance-sh{display:inline-flex;vertical-align:-4px;margin-right:4px}
.glance-sh .tierbadge{width:16px;height:18px}
.glance-prov{color:var(--ink-2);font-size:11.5px;font-weight:600}
.glance-pop table.glance-t,.glance-pop table.glance-vs{width:100%;border-collapse:collapse;border:0;border-radius:0;background:none;box-shadow:none;overflow:visible;margin:0 0 8px;font-size:12.5px}
.glance-pop .glance-t th,.glance-pop .glance-t td,.glance-pop .glance-vs th,.glance-pop .glance-vs td{padding:4px 6px;background:none;border:0;border-top:1px solid var(--line);text-align:left;vertical-align:middle;font-size:12.5px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink);white-space:normal}
.glance-pop .glance-t thead th,.glance-pop .glance-vs thead th,.glance-pop .glance-vs thead td{border-top:0;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.glance-pop .glance-t th[scope=row],.glance-pop .glance-vs th[scope=row]{color:var(--ink-2);font-weight:600}
.glance-pop .glance-t .glance-n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.glance-pop .glance-t tr.glance-on th,.glance-pop .glance-t tr.glance-on td{background:var(--gold-soft)}
.glance-pop .glance-vs thead th{text-transform:none;letter-spacing:0}
.glance-pop .glance-vs th.glance-me{box-shadow:inset 0 -2px 0 var(--gold)}
.glance-mine{display:block;font-size:10.5px;font-weight:700;color:var(--ink);letter-spacing:.02em}
.glance-line{margin:0 0 8px;color:var(--ink)}
.glance-k{display:inline-block;margin-right:6px;color:var(--ink-2);font-size:12px;font-weight:600}
.glance-h4{margin:8px 0 4px;color:var(--ink-2);font-size:12px;font-weight:700}
.glance-poss,.glance-picks{list-style:none;margin:0 0 8px;padding:0}
.glance-poss li{padding:3px 0;color:var(--ink)}
.glance-picks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px}
.glance-picks li{display:flex;justify-content:space-between;align-items:center;gap:6px;min-width:0;padding:4px 0;border-top:1px solid var(--line);color:var(--ink)}
.glance-picks li>span:first-child{min-width:0;overflow-wrap:anywhere}
.glance-picks li>span:last-child{flex:none;white-space:nowrap}
.glance-picks li.glance-with{font-weight:700}
.glance-chk{color:var(--ink);font-weight:800}
.glance-none{margin:0 0 8px}
.glance-leg{margin:4px 0 0;padding:8px 10px;border-radius:10px;background:var(--panel-2);border:1px solid var(--line)}
.glance-lt{margin:0 0 4px;color:var(--ink)}
.glance-nums{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0}
.glance-nums>div{display:flex;gap:5px;align-items:baseline}
.glance-nums dt{color:var(--ink-2);font-size:12px;font-weight:600}
.glance-nums dd{margin:0;color:var(--ink);font-variant-numeric:tabular-nums}
.glance-acts{margin:10px 0 0}
.glance-snap{width:100%;min-height:44px;font-size:13px}
.glance-pop:has(.pcard){width:460px}
.glance-pop .glance-acts+.glance-acts{margin-top:6px}
html[data-theme="light"] .glance-pop{box-shadow:0 18px 40px -16px rgba(30,34,48,.38),0 2px 8px rgba(30,34,48,.14)}
`;
(document.head||document.documentElement).appendChild(css);

/* the parts ask for this before they draw a name as a button (glanceName in part3.js) */
window.hubGlance=function(btn){ if(btn&&btn.dataset&&btn.dataset.glance) open(btn); };
window.hubGlanceClose=()=>close(true);
window.hubGlanceState=()=>cur?{of:cur.of,gid:cur.gid,sig:cur.sig}:null;
})();
