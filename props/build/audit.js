const {JSDOM}=require('jsdom'); const fs=require('fs'); const Papa=require('papaparse');
const errs=[]; let mem=null; const calls=[];
/* the payload the page boots on: the published one, or (PROPS_AUDIT_PAYLOAD) a copy baked elsewhere,
   to try a change to the model's data before the job has baked it */
const PAYLOAD_FILE=process.env.PROPS_AUDIT_PAYLOAD||'../data/payload.json';
if(process.env.PROPS_AUDIT_PAYLOAD) console.log('payload: '+PAYLOAD_FILE);
const dom=new JSDOM(fs.readFileSync('../app/prop_model_2026.html','utf8'),
 /* a real origin, so window.localStorage exists: the app reads the betting model's key and
    writes the live page's watchlist, and neither can be exercised on about:blank */
 {url:'https://demon-x13.github.io/nfl-hub/props/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.Papa=Papa;w.NO_BAKED=true;w.fetch=(u,o)=>(calls.push({url:String(u),cache:o&&o.cache||null}),String(u).indexOf('payload.json')>=0)
   ? Promise.resolve({ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(PAYLOAD_FILE,'utf8'))})
   : Promise.reject(new Error('x'));   /* the payload is fetched now, not baked in */
  w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';
  w.storage={get:async()=>mem?{value:mem}:null,set:async(k,v)=>{mem=v;return true;}};
  w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window,d=w.document;
const fails=[]; let checks=0;
const chk=(ok,msg)=>{checks++; if(!ok) fails.push(msg);};
/* BLOCKING AND WARNINGS. Every check is blocking (chk): a failure, like a runtime error, refuses the
   publish (weekly.py's audit_verdict reads the summary line as numbers). A check named here as a
   warning (W.<kind>) is counted beside the failures and never refuses: weekly.py publishes what it
   built and the job goes red after its commit, the warnings listed, as it does for a few unmatched
   price names. A check is a warning only when it is presentation on the week's own data and can be
   argued so: who is shown starting or listed, an ordering, which correctly priced parlay a level
   picks, the wording of a note, a rule went untested. Anything that could put a wrong number or
   wrong money on the page stays blocking: a price, line or leg on the wrong player or game, a
   chance, price, fair chance or payout that is not the builder's own sums, a leg under the book,
   far off it or kicked off, settlement and grading, the payload against its sources, the page not
   loading. A check run only on made-up data stays blocking too: only a change to the code can fail
   it, and a change to the code is run through the audit by hand before it lands. Seven of the ten
   NFL-job failures from 2 to 13 October 2026 were live data meeting a presentation case no check
   had seen (a game hand's High pair, LA's QB2, a tie, a top 25 of 24), each holding back the
   week's data until a fix landed. */
const warns=[];
const WARN={
  starters:'who is shown starting or listed on a game page, and what his gap note says: each player\'s lines and prices are his own wherever he is shown, and V6 blocks a suggested leg on anyone the report, the roster or the inactive rule has out, worked out from the sources themselves',
  order:'an ordering on the page, no number in it',
  compose:'which correctly priced parlay a suggestion level or a game page hand picks, or what its card says about how it was chosen: every leg on it is still held, blocking, to a real price, never under the book or far off it, not kicked off, one line once, its chance, fair chance, price and payout to the builder\'s own sums, and any chance or payout floor its card states to its own numbers',
  wording:'the wording of a note or a reason in the suggestions panel: no number in it',
  coverage:'the week gave a made-up case nothing to stand on, so a rule went untested this run: nothing shown is wrong',
  panel:'the credit-pull panel, the owner\'s note of what the odds API cost: no price, line or chance in it',
};
const W=Object.fromEntries(Object.keys(WARN).map(k=>[k,(ok,msg)=>{checks++; if(!ok) warns.push({m:msg,k});}]));
/* what a tier pays on the amount bet, worked here rather than by the page's own helpers: the
   figure to the cent with its thousands marked, over "$25 pays" ("$12.50 pays", "$1,250 pays"),
   on the card's own decimal price */
const money=v=>'$'+(+v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const amtTxt=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
const payOk=(el,stake,dec)=>!!el&&+el.dataset.pbPay===dec&&isFinite(stake*dec)
  &&(el.querySelector('b')||{}).textContent===money(stake*dec)&&(el.querySelector('span')||{}).textContent===amtTxt(stake)+' pays';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const S=w.eval('S'); const F=n=>w.eval(n);
  const [gameCtx,rosterFor,statLines,project,pOver,rungView,marketLine,marketMu,devigOver,bookImplied,probToAmerican,mlToDec,parlayProb,modelMargin,legRho,gameBet,settleLeg,gameMu,tdPlus]=
   ['gameCtx','rosterFor','statLines','project','pOver','rungView','marketLine','marketMu','devigOver','bookImplied','probToAmerican','mlToDec','parlayProb','modelMargin','legRho','gameBet','settleLeg','gameMu','tdPlus'].map(F);
  const PAY=F('PAY');
  /* the checks open games that have not kicked off; between the week's last kickoff and its
     final reaching the data (a Monday night) there are none, so the page's clock goes back to
     an hour before that kickoff rather than the audit depending on the hour it runs */
  if(!S.sched.some(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w))){
    const wk=F('currentWeek')(), ks=S.sched.filter(x=>+x.w===wk).map(x=>F('kickoff')(x)).filter(Boolean).map(k=>k.getTime());
    if(ks.length){ const off=Math.max(...ks)-3600e3-Date.now(), now0=w.Date.now.bind(w.Date); w.Date.now=()=>now0()+off; F('renderAll')();
      console.log(`clock: no game left to start, set back ${(-off/3600e3).toFixed(1)}h to before week ${wk}'s last kickoff`); } }
  /* open the first game that has not kicked off, in any open week (the audit must not depend on the date) */
  const openUpcoming=()=>{ const g=S.sched.filter(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w)).sort((a,b)=>(a.w-b.w)||((a.d+a.t).localeCompare(b.d+b.t)))[0];
    const ws=d.getElementById('weekSel'); if(ws.value!==String(g.w)){ ws.value=String(g.w); ws.dispatchEvent(new w.Event('change')); }
    d.querySelector('[data-game="'+g.id+'"]').click(); return g; };

  /* ---- A. every game, every week: context sane ---- */
  let nGames=0,nMkt=0,nModel=0;
  for(const g of S.sched){ nGames++;
    for(const t of [g.a,g.h]){ const c=gameCtx(g,t);
      chk(isFinite(c.implied)&&c.implied>=3&&c.implied<=45,`implied out of range ${g.id} ${t} ${c.implied}`);
      chk(isFinite(c.imp)&&Math.abs(c.imp)<=3,`imp z out of range ${g.id}`);
      if(c.src==='market') nMkt++; else nModel++;
    }
    const ca=gameCtx(g,g.a),ch=gameCtx(g,g.h);
    if(ca.src==='market'){ chk(Math.abs((ca.implied+ch.implied)-g.tot)<1e-6,`market total mismatch ${g.id}`);
      chk(Math.abs((ch.implied-ca.implied)-g.sp)<1e-6,`market spread mismatch ${g.id}`); }
    else { const m=modelMargin(g); chk(Math.abs((ch.implied-ca.implied)-m)<1e-6,`model margin not applied ${g.id}`); }
  }
  console.log(`A. game context: ${nGames} games, ${nMkt/2} priced by market, ${nModel/2} by our model`);

  /* ---- A2. the slate's rows: the margin beside the pick is the difference of the two scores the
     row shows, and the side picked is the one with the bigger number on the row; scores that show
     a tie read "even", with no pick. Every rendered row of every week (a week not open yet renders
     none; the current week always has some), then two lines set on the rounding itself ---- */
  { const ws=d.getElementById('weekSel'), keep=ws.value; let rows=0, evens=0;
    const show=wk=>{ ws.value=String(wk); ws.dispatchEvent(new w.Event('change')); };
    const read=b=>{ const sc=((b.querySelector('.tot b')||{}).textContent||'').trim(), m=sc.match(/^(\d+) \u2013 (\d+)$/), win=b.querySelector('.winner');
      const by=[...(win?win.querySelectorAll('small'):[])].map(x=>x.textContent.trim().match(/^by (\d+)$/)).find(Boolean);
      return {sc,ok:!!(m&&win),A:m?+m[1]:NaN,H:m?+m[2]:NaN,even:!!(win&&win.querySelector('.none')),by:by?+by[1]:null,pick:((win&&win.querySelector('.ttag'))||{}).textContent||null}; };
    const rowOk=(g,r)=>r.ok&&(r.even?(r.A===r.H&&r.by==null&&!r.pick):(r.A!==r.H&&r.by===Math.abs(r.A-r.H)&&r.pick===(r.A>r.H?g.a:g.h)));
    for(const o of [...ws.options]){ show(o.value);
      for(const b of d.querySelectorAll('#gamesList .game[data-game]')){ rows++;
        const g=S.sched.find(x=>x.id===b.dataset.game), r=read(b); if(r.even) evens++;
        chk(!!g&&rowOk(g,r),`slate row ${b.dataset.game}: "${r.sc}" beside ${r.even?'"even"':`"${r.pick} by ${r.by}"`}`); } }
    chk(rows>0,'the slate rendered no game rows in any week');
    /* 22.4 - 19.6 shows "22 - 20", whose margin is 2 though the unrounded gap rounds to 3; 21.3 -
       20.9 shows "21 - 21", which is even though one side leads */
    const g=S.sched.find(x=>F('weekOpen')(+x.w)), was={sp:g.sp,tot:g.tot};
    for(const [tot,sp,want] of [[42,-2.8,'22 \u2013 20|by 2'],[42.2,-0.4,'21 \u2013 21|even']]){
      g.tot=tot; g.sp=sp; show(g.w);
      const b=d.querySelector(`#gamesList [data-game="${g.id}"]`), r=b?read(b):{sc:'(no row)',ok:false};
      chk(!!b&&rowOk(g,r)&&`${r.sc}|${r.even?'even':'by '+r.by}`===want,`slate row on the rounding: lines ${tot}/${sp} show "${r.sc}" beside ${r.even?'"even"':`"${r.pick} by ${r.by}"`}, not ${want.replace('|',' beside ')}`); }
    g.sp=was.sp; g.tot=was.tot; show(keep);
    console.log(`A2. slate rows: ${rows} rows over ${ws.options.length} weeks (${evens} even), each margin the difference of the scores shown`); }

  /* ---- B. rosters: no duplicates, right teams, depth caps ---- */
  let nPl=0, dupes=0, wrongTeam=0, capViol=0, gaps=0;
  for(const g of S.sched){ const r=rosterFor(g,false);
    for(const team in r){ const seen=new Set(); const cnt={};
      for(const x of r[team].players){ nPl++;
        if(seen.has(x.pl.id)) dupes++; seen.add(x.pl.id);
        if(x.pl.team!==team) wrongTeam++;
        cnt[x.pl.grp]=(cnt[x.pl.grp]||0)+1; }
      const DEPTH={QB:1,RB:3,WR:4,TE:2,K:1};
      for(const gp in cnt) if(cnt[gp]>DEPTH[gp]) capViol++;
      gaps+=(r[team].gaps||[]).length; }
  }
  chk(dupes===0,`duplicate players on a page: ${dupes}`); chk(wrongTeam===0,`players on wrong team: ${wrongTeam}`); W.starters(capViol===0,`depth cap violations: ${capViol}`);
  console.log(`B. rosters: ${nPl} player-slots across the season, ${dupes} dupes, ${wrongTeam} wrong-team, ${capViol} over cap, ${gaps} flagged gaps`);

  /* ---- B2. next man up: a ruled-out QB1 hands the slot to the chart's QB2, not to an
     unranked player with enough projected usage. Any team with both on the chart will do: first
     one whose two have three games each; when none has (last season's table holds only a few
     weeks, as in a rollover tested before that season ends), one whose two are on its roster
     however few games the QB2 has, which the rule must hold for too ---- */
  { const D=PAY.depth||{}; let tried=0,ok=0,thin=false;
    for(const need of [3,0]){ if(tried) break; thin=need===0;
      for(const team of new Set(Object.values(D).map(d=>d[0]))){
        const q=id=>S.players[id]&&S.players[id].team===team&&(S.players[id].gp+S.players[id].base_gp)>=need;
        const one=Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===1&&q(id));
        const two=Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===2&&q(id));
        const g=S.sched.find(x=>x.a===team||x.h===team);
        if(!one||!two||!g) continue;
        tried++;
        S.inactive[one]=true;
        try{ const qb=rosterFor(g,false)[team].players.filter(x=>x.pl.grp==='QB');
          if(qb.length===1&&qb[0].pl.id===two) ok++;
          else W.starters(false,`${team}: with QB1 out the quarterback shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not the chart's QB2 ${S.players[two].n}`);
        } finally { delete S.inactive[one]; }
        if(tried>=6) break;
      } }
    W.coverage(tried>0,'no team on the depth chart has a QB1 and a QB2 on its roster to test next man up with');
    console.log(`B2. next man up: ${ok} of ${tried} teams hand a ruled-out QB1's slot to the chart's QB2${thin?' (QB2s with under three games: last season is short)':''}`);
  }

  /* ---- B3. the chart's players with no history (payload.py carries them, app v104): every player
     the chart lists at a position the page projects, on a roster, is on the page, every club's QB2
     among them (Stidham and Richardson were missing, and a club whose QB1 was out started nobody).
     One with no game at all has nothing to project from: no line, no price, no headline, no place in
     a suggestion or a game hand, and, with the man above him ruled out, he starts, shown with thin
     history and a line saying there is nothing to bet on; so does a charted player moved up whose
     games give the model no workload (nothingToProject). The rule is held on a real club's QB2 made
     history-less here, on a game still to come or, with none left (a Monday night, the season's end),
     any game of the season, so it runs whatever the week holds. A payload baked before (it has no
     ina, which came with them) is said and its data checks skipped ---- */
  { const D=PAY.depth||{}, R=PAY.roster||{}, baked='ina' in PAY, POS=new Set(['QB','RB','WR','TE','K']), noH=F('noHistory');
    const on=id=>!!R[id]&&['ACT','DEV','INA'].includes(R[id][1]);
    const miss=Object.keys(D).filter(id=>POS.has(D[id][1])&&on(id)&&!S.players[id]).map(id=>`${D[id][3]} (${D[id][0]} ${D[id][1]}${D[id][2]})`);
    const clubs=[...new Set(Object.values(D).map(d=>d[0]))];
    const two=t=>Object.keys(D).find(id=>D[id][0]===t&&D[id][1]==='QB'&&D[id][2]===2);
    const noQB2=clubs.filter(t=>two(t)&&on(two(t))&&!S.players[two(t)]).map(t=>`${t} ${D[two(t)][3]}`);
    const nh=Object.values(S.players).filter(p=>noH(p));
    if(baked){ W.starters(!miss.length,`${miss.length} players on the chart and a roster are not on the page: ${miss.slice(0,5).join(', ')}`);
      W.starters(!noQB2.length,`clubs whose chart's QB2 is not on the page: ${noQB2.join(', ')}`);
      chk(nh.every(p=>{ const e=(PAY.players||[]).find(q=>q.id===p.id); return e&&!e.gp&&!e.cn&&D[p.id]; }),'a player with no history on the page is not a charted player the payload carries with none'); }
    /* every one with no game, in every game still to come: listed, never priced */
    const cw=F('currentWeek')(), open=S.sched.filter(g=>+g.w===cw&&!F('gameStarted')(g)); let seen=0; const leak=[];
    for(const g of open){ const r=rosterFor(g,true), ids=new Set();
      for(const t in r) for(const x of r[t].players) if(F('nothingToProject')(x)){ seen++; ids.add(x.pl.id); if(statLines(x).length) leak.push(`${x.pl.n}: lines`); }
      if(!ids.size) continue;
      for(const l of [...F('pricedLegs')([g]),...F('gameLegPool')(g)]) if(ids.has(l.pid)) leak.push(`${l.name}: ${l.label}`);
      for(const h of F('gameHeadline')(g)) if(ids.has(h.v.pl.id)) leak.push(`${h.v.pl.n}: a headline`); }
    chk(!leak.length,`a player with nothing to project is projected or priced: ${leak.slice(0,4).join('; ')}`);
    /* the rule, on a real club's QB2 made history-less, with his QB1 ruled out */
    let ruled=null;
    const both=t=>{ const o=Object.keys(D).find(id=>D[id][0]===t&&D[id][1]==='QB'&&D[id][2]===1); return o&&S.players[o]&&S.players[o].team===t&&two(t)&&S.players[two(t)]&&!S.inactive[two(t)]; };
    const g=[...open,...S.sched].find(g=>[g.a,g.h].some(both));
    if(g){ const T=[g.a,g.h].find(both);
      const one=Object.keys(D).find(id=>D[id][0]===T&&D[id][1]==='QB'&&D[id][2]===1), P2=S.players[two(T)];
      const keep=JSON.stringify({e5:P2.e5,e3:P2.e3,car:P2.car,py:P2.py,gp:P2.gp,base_gp:P2.base_gp,team:P2.team}), keepI=S.inactive[one], keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open});
      try{ P2.gp=0; P2.base_gp=0; P2.team=T; for(const s in P2.e5){ P2.e5[s]=[0,0]; P2.e3[s]=[0,0]; P2.car[s]=[0,0]; P2.py[s]=null; }
        S.inactive[one]={week:cw,status:'Out',inj:'Thumb'}; w.eval('GAME_TIER_CACHE={}');
        const r=rosterFor(g,false)[T], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter), x=r.players.find(x=>x.pl.id===P2.id);
        W.starters(qb.length===1&&qb[0].pl.id===P2.id,`${T}: QB1 ruled out and a QB2 with no history: the starter shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not ${P2.n}`);
        W.starters(!r.gaps.some(gp=>gp.id===P2.id),`${T}: a QB2 with no history who starts is also in the gap note`);
        chk(!!x&&!statLines(x).length,'a QB2 with no history has lines');
        chk(![...F('pricedLegs')([g]),...F('gameLegPool')(g)].some(l=>l.pid===P2.id)&&!F('gameHeadline')(g).some(h=>h.v.pl.id===P2.id),'a QB2 with no history is priced, suggested or a headline');
        S.ui.game=g.id; S.ui.open={}; F('renderGame')();
        const row=d.querySelector(`#gameView [data-nohist="${P2.id}"]`);
        ruled=!!row&&/thin history/.test(row.textContent)&&/No games the model counts, last season or this one/.test(row.textContent)&&row.textContent.includes(P2.n)&&!d.querySelector(`#gameView [data-open="${P2.id}"]`);
        W.starters(ruled,`${T}: the game page does not show a QB2 with no history in his place, marked thin history, with no lines`);
      } finally { Object.assign(P2,JSON.parse(keep)); if(keepI) S.inactive[one]=keepI; else delete S.inactive[one]; w.eval('GAME_TIER_CACHE={}');
        const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; F('closeGameModal')(); }
      /* and a QB1 with no history, not ruled out (a rookie named the starter before his first game):
         he holds the slot with no lines, and his QB2 is not shown as the starter in his stead */
      const P1=S.players[one], keep1=JSON.stringify({e5:P1.e5,e3:P1.e3,car:P1.car,py:P1.py,gp:P1.gp,base_gp:P1.base_gp});
      if(!S.inactive[one]) try{ P1.gp=0; P1.base_gp=0; for(const s in P1.e5){ P1.e5[s]=[0,0]; P1.e3[s]=[0,0]; P1.car[s]=[0,0]; P1.py[s]=null; } w.eval('GAME_TIER_CACHE={}');
        const r=rosterFor(g,false)[T], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter);
        chk(qb.every(x=>x.pl.id!==one||!statLines(x).length),`${T}: a QB1 with no history has lines`);
        W.starters(qb.length===1&&qb[0].pl.id===one,`${T}: a QB1 with no history, not ruled out: the starter shown is ${qb.map(x=>x.pl.n+(statLines(x).length?' (with lines)':'')).join(', ')||'nobody'}, not ${P1.n} with no lines`);
      } finally { Object.assign(P1,JSON.parse(keep1)); w.eval('GAME_TIER_CACHE={}'); }
      /* and a QB1 with one game, not ruled out (a rookie after his first start): counted in the chart's
         order he holds the slot, marked thin history; he was cut with his QB2 behind him and the club
         showed no quarterback. Nothing suggests him under three games: no priced leg, no game hand */
      const k1=JSON.stringify({gp:P1.gp,base_gp:P1.base_gp});
      if(!S.inactive[one]) try{ P1.gp=1; P1.base_gp=0; w.eval('GAME_TIER_CACHE={}');
        const r=rosterFor(g,false)[T], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter);
        W.starters(qb.length===1&&qb[0].pl.id===one,`${T}: a QB1 with one game, not ruled out: the starter shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not ${P1.n}`);
        chk(![...F('pricedLegs')([g]),...F('gameLegPool')(g)].some(l=>l.pid===one),`${T}: a QB1 with one game is priced or in a game hand's pool`);
      } finally { Object.assign(P1,JSON.parse(k1)); w.eval('GAME_TIER_CACHE={}'); } }
    W.coverage(!!g,'no game of the season has a club with a QB1 and a QB2 on the page to test a QB2 with no history on');
    console.log(`B3. the chart's players with no history: ${baked?`${nh.length} on the page, ${miss.length} charted players missing, every club's QB2 there`:'a payload baked before them (no ina): not compared'}; ${seen} with nothing to project listed in this week's open games, none projected or priced; ${g?`${[g.a,g.h].join('/')}: a history-less QB2 starts when QB1 is ruled out, a history-less QB1 holds his slot, each with no lines, and a one-game QB1 holds his, suggested nowhere`:'no game to test the rule on'}`);
  }

  /* ---- C. projections & ladders: finite, monotone, in range ---- */
  let nLines=0,nRungs=0,nonMono=0,badP=0,badMu=0,badEst=0,capTD=0;
  const wk=[1,5,12,18];
  for(const g of S.sched.filter(x=>wk.includes(x.w))){ const r=rosterFor(g,false);
    for(const team in r) for(const x of r[team].players){
      for(const l of statLines(x)){ nLines++;
        if(l.prob){ chk(l.p>0&&l.p<1,`td prob out of range ${x.pl.n}`);
          const MM=PAY.model[x.pl.grp]; const R=PAY.tdrate[x.pl.grp];
          if(R){ const mc=MM.carries?Math.max(project(x.pl,'carries',x.opp,x.ctx).mu,0):0, mr=MM.receptions?Math.max(project(x.pl,'receptions',x.opp,x.ctx).mu,0):0;
            const cap=1-Math.exp(-(mc*R.rush+mr*R.rec)*PAY.tdmult); if(l.p>cap+1e-9) capTD++; }
          continue; }
        if(!(isFinite(l.mu)&&l.mu>=0)) badMu++;
        let prev=2;
        for(const rg of l.rungs){ nRungs++;
          if(!(rg.p>0&&rg.p<1)) badP++;
          if(rg.p>prev+1e-9) nonMono++; prev=rg.p;
          const v=rungView(x.pl,l.stat,l.mu,rg.k,g.w);
          if(!(isFinite(v.est)&&v.est!==0)) badEst++;
          if(!(v.pMkt>0&&v.pMkt<1)) badEst++;
        }
        chk(l.rungs.length<=7&&l.rungs.length>=1,`rung count ${l.rungs.length} ${x.pl.n} ${l.stat}`);
        for(let i=1;i<l.rungs.length;i++) chk(l.rungs[i].k>l.rungs[i-1].k,`rungs not ascending ${x.pl.n} ${l.stat}`);
      }
    }
  }
  chk(nonMono===0,`non-monotone ladders: ${nonMono}`); chk(badP===0,`rung probs out of range: ${badP}`);
  chk(badMu===0,`bad projections: ${badMu}`); chk(badEst===0,`bad estimated prices: ${badEst}`); chk(capTD===0,`TD cap exceeded: ${capTD}`);
  console.log(`C. ladders: ${nLines} stat blocks, ${nRungs} rungs over weeks ${wk.join('/')}; non-monotone ${nonMono}, out-of-range ${badP}, bad est ${badEst}, TD cap breaches ${capTD}`);

  /* ---- D. market anchoring converges and main line adds up ---- */
  let nAnch=0,anchOff=0,maxOff=0,sumOff=0,estNear=[],mismatchTeam=0;
  const wk1={}; for(const g of S.sched) if(g.w===1){wk1[g.h]=g;wk1[g.a]=g;}
  for(const pid in PAY.mkt['1']){ const pl=S.players[pid]; if(!pl) continue;
    const g=wk1[pl.team]; if(!g){ mismatchTeam++; continue; }
    const opp=g.h===pl.team?g.a:g.h, ctx=gameCtx(g,pl.team);
    for(const stat in PAY.mkt['1'][pid]){ const L=PAY.mkt['1'][pid][stat];
      const pr=project(pl,stat,opp,ctx); if(!pr||pr.mu==null) continue; nAnch++;
      const target=devigOver(L.over,L.under); const muM=marketMu(pl,stat,pr.mu,1);
      const got=pOver(pl.grp,stat,muM,L.line); const off=Math.abs(got-target);
      if(off>0.005) anchOff++; maxOff=Math.max(maxOff,off); sumOff+=off;
      const pO=pOver(pl.grp,stat,pr.mu,L.line); chk(Math.abs(pO+(1-pO)-1)<1e-12,'over+under != 1');
      /* the estimate at the rung nearest the real line should be priced near the real line */
      const v=rungView(pl,stat,pr.mu,Math.round(L.line),1);
      if(v.est!=null) estNear.push({stat,est:v.est,real:L.over,k:Math.round(L.line),line:L.line});
    }
  }
  chk(anchOff===0,`anchoring failed to converge on ${anchOff} lines (max off ${maxOff.toFixed(4)})`);
  chk(mismatchTeam===0,`market lines on players with no wk1 game: ${mismatchTeam}`);
  const nearErr=estNear.map(e=>Math.abs(Math.log(mlToDec(e.est))-Math.log(mlToDec(e.real))));
  const medErr=nearErr.sort((a,b)=>a-b)[Math.floor(nearErr.length/2)];
  console.log(`D. anchoring: ${nAnch} real lines, converged within 0.5% on ${nAnch-anchOff}, mean miss ${(sumOff/nAnch*100).toFixed(3)}pts; estimate at the rung nearest the real line is off by median ${(medErr*100).toFixed(1)}% in decimal odds`);
  const worst=estNear.map(e=>({...e,err:Math.abs(Math.log(mlToDec(e.est))-Math.log(mlToDec(e.real)))})).sort((a,b)=>b.err-a.err).slice(0,3);
  worst.forEach(e=>console.log(`     worst: ${e.stat} rung ${e.k}+ est ${e.est} vs real over ${e.line} at ${e.real}`));

  /* ---- E0. the file itself is well formed ---- */
  const raw=require('fs').readFileSync('../app/prop_model_2026.html','utf8');
  chk((raw.match(/<style>/g)||[]).length===(raw.match(/<\/style>/g)||[]).length,'unbalanced <style> tags');
  chk((raw.match(/<script/g)||[]).length===(raw.match(/<\/script>/g)||[]).length,'unbalanced <script> tags');
  const cssText=raw.slice(raw.indexOf('<style>'),raw.indexOf('</style>'));
  chk(!/border-(bottom|top)-radius/.test(cssText),'invalid border-radius shorthand in CSS');
  chk(!/[^-a-z](color|background|border-color)\s*:\s*;/.test(cssText),'empty CSS value');
  chk(d.styleSheets.length>0&&d.styleSheets[0].cssRules.length>50,`stylesheet failed to parse (${d.styleSheets.length?d.styleSheets[0].cssRules.length:0} rules)`);
  console.log(`E0. document: ${d.styleSheets[0]?d.styleSheets[0].cssRules.length:0} CSS rules parsed, tags balanced`);

  /* ---- E. price math ---- */
  for(const p of [0.05,0.2,0.5,0.8,0.95]){ const a=probToAmerican(p); const back=a>0?100/(a+100):Math.abs(a)/(Math.abs(a)+100);
    chk(Math.abs(back-p)<0.01,`price round-trip ${p}->${a}->${back}`); }
  let prevI=0; for(let p=0.01;p<1;p+=0.01){ const i=bookImplied(p); chk(i>=prevI-1e-12,`bookImplied not monotone at ${p}`); prevI=i; chk(i>=p*0.99,`book implied below fair at ${p}`); }
  chk(Math.abs(bookImplied(0.5)-0.5325)<0.003,`main-line hold wrong: ${bookImplied(0.5)}`);
  console.log(`E. price math: round trips and monotone cut ok; implied at 50% = ${(bookImplied(0.5)*100).toFixed(2)}% (real -114 is 53.27%)`);

  /* ---- F. parlay math ---- */
  const mk=(pid,team,grp,stat,p,side,gid)=>({gid:gid||'g',pid,team,grp,stat,p,side});
  const one=parlayProb([mk('a','SEA','QB','passing_yards',0.6,'over')]);
  chk(Math.abs(one.corr-0.6)<0.01&&Math.abs(one.indep-0.6)<1e-9,`1-leg parlay != leg prob (${one.corr})`);
  const two=parlayProb([mk('a','SEA','QB','passing_yards',0.5,'over'),mk('b','SEA','WR','receiving_yards',0.5,'over')]);
  chk(two.corr>two.indep,'positively correlated legs not above independent');
  const twoU=parlayProb([mk('a','SEA','QB','passing_yards',0.5,'over'),mk('b','SEA','WR','receiving_yards',0.5,'under')]);
  chk(twoU.corr<twoU.indep,'over/under of correlated pair not below independent');
  const cross=parlayProb([mk('a','SEA','QB','passing_yards',0.5,'over','g1'),mk('b','KC','WR','receiving_yards',0.5,'over','g2')]);
  chk(Math.abs(cross.corr-cross.indep)<1e-9,'cross-game legs should be independent');
  const self=parlayProb([mk('a','SEA','RB','carries',0.5,'over'),mk('a','SEA','RB','rushing_yards',0.5,'over')]);
  chk(self.corr>0.35,`same-player carries+yards should be strongly linked (${self.corr.toFixed(3)})`);
  chk(legRho(mk('a','SEA','QB','passing_yards',0.5,'over'),mk('b','SEA','WR','receiving_yards',0.5,'over'))===legRho(mk('b','SEA','WR','receiving_yards',0.5,'over'),mk('a','SEA','QB','passing_yards',0.5,'over')),'rho not symmetric');
  console.log(`F. parlays: 1-leg=${one.corr.toFixed(3)}, QB+WR over/over ${two.indep.toFixed(3)}->${two.corr.toFixed(3)}, over/under ${twoU.indep.toFixed(3)}->${twoU.corr.toFixed(3)}, cross-game equal, same-RB ${self.corr.toFixed(3)}`);

  /* ---- J. game bets: to win, to cover ---- */
  { const gj=S.sched.find(x=>x.sp!=null); const gx={...gj,sp:3,tot:44};
    const hw=gameBet(gx,gx.h,'ml'), aw=gameBet(gx,gx.a,'ml'), hc=gameBet(gx,gx.h,'ats'), ac=gameBet(gx,gx.a,'ats');
    chk(Math.abs(hw.p+aw.p-1)<1e-9,'to-win chances do not sum to 1');
    chk(Math.abs(hc.p+ac.p-1)<1e-9,'to-cover chances do not sum to 1');
    chk(hc.line===-3&&ac.line===3,`cover lines wrong (${hc.line}, ${ac.line})`);
    chk(hw.p>0.02&&hw.p<0.98&&Math.abs(gameMu(gx)-(modelMargin(gx)+3)/2)<1e-9,'game mu is not halfway to the spread');
    chk(gameBet({...gx,sp:null},gx.h,'ats')===null&&gameBet({...gx,sp:null},gx.h,'ml')!==null,'no spread should drop the cover leg only');
    const better={...gx,sp:10}; chk(gameBet(better,better.h,'ml').p>hw.p,'a bigger home spread should raise the home win chance');
    const fin={...gx,hs:27,as:20}; S.sched.push({...fin,id:'jtest'});
    chk(settleLeg({gid:'jtest',team:fin.h,stat:'ml',k:0})==='win'&&settleLeg({gid:'jtest',team:fin.a,stat:'ml',k:0})==='loss','to-win settlement wrong');
    chk(settleLeg({gid:'jtest',team:fin.h,stat:'ats',k:-3})==='win'&&settleLeg({gid:'jtest',team:fin.h,stat:'ats',k:-7})==='push'&&settleLeg({gid:'jtest',team:fin.a,stat:'ats',k:3})==='loss','to-cover settlement wrong');
    S.sched.pop();
    chk(legRho({gid:'g',stat:'ml',team:'SEA',grp:'TEAM'},{gid:'g',stat:'ml',team:'KC',grp:'TEAM'})<0&&legRho({gid:'g',stat:'ml',team:'SEA',grp:'TEAM'},{gid:'g',pid:'p',stat:'passing_yards',team:'SEA',grp:'QB'})===0,'game-leg correlations wrong');
    /* the card is drawn under each game on the Pick'ems tab of the Bets and Stats page, which
       sends a tick through toggleLeg: draw it and tick it the same way */
    const gopen=S.sched.find(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w));
    const gbox=d.createElement('div'); gbox.innerHTML=F('gameBetsCard')(gopen,false);
    const gcb=gbox.querySelector('[data-leg$="|ml"]'); chk(!!gcb,'no to-win checkbox on the Game bets card');
    const gtick=()=>F('toggleLeg')(gcb.dataset.leg,+gcb.dataset.k,gopen,gcb.dataset.side||'over',gcb.dataset.main==='1');
    if(gcb){ gtick(); const L=Object.values(S.parlay).find(l=>l.stat==='ml'); chk(!!L&&L.grp==='TEAM'&&L.p>0&&L.p<1&&L.label==='To win','to-win leg did not land in the parlay');
      chk(/To win/.test(d.getElementById('parlayBody').textContent),'to-win leg not shown in the parlay builder');
      gtick(); chk(!Object.values(S.parlay).some(l=>l.stat==='ml'),'to-win leg did not come back out'); }
    console.log(`J. game bets: home win ${(hw.p*100).toFixed(0)}% at +3, cover ${(hc.p*100).toFixed(0)}%, settlement and toggling ok`); }

  /* ---- J2. the game total: over or under the posted points, priced, settled and correlated.
     Its chance is the market's own (props/research/totals/: no points model beat the posted total
     on 2024-2026): the over is its over and under prices with the margin out, i(o)/(i(o)+i(u)),
     and 50% without both, on made-up prices and on every game of the schedule; the model's points
     never enter it, however they move or with the payload's points model gone; TOTAL_SD prices
     only a number other than the posted one, Normal(posted total, 13.2) ---- */
  { const tb=F('totalBet'), mT=F('modelTotal'), SD=w.eval('TOTAL_SD'), gbN=F('gbNorm');
    const imp=a=>a>0?100/(a+100):-a/(-a+100), has=v=>v!=null&&isFinite(v)&&v!==0;
    const noVig=g=>has(g.tov)&&has(g.tou)?imp(g.tov)/(imp(g.tov)+imp(g.tou)):0.5;
    const gj=S.sched.find(x=>x.tot!=null)||S.sched[0], gx={...gj,tot:44.5}; delete gx.tov; delete gx.tou;
    const o=tb(gx,'over'), u=tb(gx,'under');
    chk(Math.abs(o.p+u.p-1)<1e-12&&o.line===44.5&&u.line===44.5,'over and under chances do not sum to 1 on the posted total');
    const badNv=[];
    for(const pr of [{tov:-105,tou:-115},{tov:-110,tou:-110},{tov:120,tou:-140},{tov:-250,tou:200},{tov:100,tou:100},{tov:-130},{tou:-130},{},{tov:0,tou:-110}]){
      const g={...gx,...pr}, a=tb(g,'over'), b=tb(g,'under'), want=noVig(g);
      if(!(Math.abs(a.p-want)<1e-12&&Math.abs(b.p-(1-want))<1e-12&&a.mu===44.5&&a.line===44.5)) badNv.push(`${JSON.stringify(pr)} gives ${a.p.toFixed(4)}, not ${want.toFixed(4)}`); }
    let nTot=0, nPriced=0;
    for(const g of S.sched){ const a=tb(g,'over');
      if(g.tot==null||!isFinite(g.tot)){ if(a!==null) badNv.push(`${g.id} has no total and is priced`); continue; }
      nTot++; if(has(g.tov)&&has(g.tou)) nPriced++;
      if(!(Math.abs(a.p-noVig(g))<1e-12&&a.mu===g.tot&&a.line===g.tot)) badNv.push(`${g.id} gives ${a.p.toFixed(4)}, not ${noVig(g).toFixed(4)}`); }
    chk(!badNv.length,`a total's chance is not the no-vig chance of its over and under prices (50% without both): ${badNv.slice(0,4).join('; ')}`);
    chk(Math.abs(o.p-0.5)<1e-12&&Math.abs(tb({...gx,tov:-105,tou:-115},'over').p-(105/205)/((105/205)+(115/215)))<1e-12,'a total with no price is not an even 50%, or -105/-115 is not 48.9% over');
    /* the model's points never enter the chance (nor the leg's): moved three ways, then with the
       payload's points model taken away, not one total's chance moves, while the points shown do */
    { const tl0=F('totalLeg'), withTot=S.sched.filter(g=>g.tot!=null&&isFinite(g.tot));
      const snap=()=>withTot.map(g=>[tb(g,'over').p,tb(g,'under').p,tl0(g,'over').p,tl0(g,'under').p].join()), before=snap();
      w.__keepMP=w.eval('modelPoints'); const keepPts=PAY.pts, moved=[], shown=[];
      for(const fake of ['function(){ return 3; }','function(){ return 45; }','function(t,o,h){ return h?40:5; }',null]){
        if(fake) w.eval('modelPoints='+fake); else { w.eval('modelPoints=window.__keepMP'); PAY.pts=null; }
        const now=snap(); withTot.forEach((g,i)=>{ if(now[i]!==before[i]) moved.push(`${g.id} (${fake||'no points model'})`); });
        shown.push(mT(gx).toFixed(1)); }
      PAY.pts=keepPts; w.eval('modelPoints=window.__keepMP'); delete w.__keepMP;
      chk(!moved.length,`the model's points moved a total's chance: ${moved.slice(0,4).join('; ')}`);
      chk(shown[0]==='6.0'&&shown[1]==='90.0'&&shown[2]==='45.0','the model\'s points shown are not modelPoints for the two sides: '+shown.join(', ')); }
    /* another number than the posted one: Normal about the posted total, TOTAL_SD; the posted number itself at the market's chance */
    { const pg={...gx,tov:-130,tou:110};
      chk(SD===13.2&&Math.abs(tb(gx,'over',47.5).p-(1-gbN(3/13.2)))<1e-12&&Math.abs(tb(gx,'under',41.5).p-gbN(-3/13.2))<1e-12&&tb(gx,'over',47.5).line===47.5&&tb(gx,'over',47.5).mu===44.5
        &&Math.abs(tb(pg,'over',44.5).p-noVig(pg))<1e-12&&Math.abs(tb(pg,'over',null).p-noVig(pg))<1e-12,'a total on another number is not priced Normal(posted total, 13.2), or the posted number not at the market\'s chance');
      chk(tb(gx,'over',50.5).p<tb(gx,'over',47.5).p&&tb({...gx,tot:null},'over')===null,'a higher number should be harder to go over, and no total no leg'); }
    /* settlement on a made-up final: 27-20 is 47 points */
    S.sched.push({...gx,id:'ttest',hs:27,as:20});
    const st=(side,k)=>settleLeg({gid:'ttest',stat:'total',side,k,team:gx.a});
    chk(st('over',44.5)==='win'&&st('under',44.5)==='loss'&&st('over',47)==='push'&&st('under',47)==='push'&&st('over',47.5)==='loss'&&st('under',47.5)==='win','a game total settles wrong on a 47-point final');
    S.sched.pop();
    /* settlement is the final's points against the line and nothing else: every hook either side of three finals */
    { const bad=[];
      for(const [hs,as] of [[27,20],[10,7],[0,0],[41,38]]){ S.sched.push({...gx,id:'ttest',hs,as}); const t=hs+as;
        for(const k of [t-1.5,t-1,t-0.5,t,t+0.5,t+1,t+1.5]) for(const side of ['over','under']){
          const want=t===k?'push':((side==='under'?t<k:t>k)?'win':'loss'), got=settleLeg({gid:'ttest',stat:'total',side,k,team:gx.a});
          if(got!==want) bad.push(`${side} ${k} on ${hs}-${as}: ${got}, not ${want}`); }
        S.sched.pop(); }
      chk(!bad.length,`a game total settles other than on the final's points against its line: ${bad.slice(0,4).join('; ')}`); }
    /* live: points only go up */
    const lg=F('liveGameLeg'), sc=(hs,as,state)=>({home:gx.h,away:gx.a,hs,as,state});
    chk(lg({stat:'total',side:'over',k:44.5,team:gx.a},sc(30,20,'live')).state==='hit'&&lg({stat:'total',side:'under',k:44.5,team:gx.a},sc(30,20,'live')).state==='missed'
      &&lg({stat:'total',side:'under',k:44.5,team:gx.a},sc(10,7,'post')).state==='hit'&&lg({stat:'total',side:'over',k:44.5,team:gx.a},sc(10,7,'live')).state==='live','a game total tracks wrong live');
    /* the leg: the book's price where the payload has one, -110 marked est. where it has none */
    const tl=F('totalLeg'), withP={...gx,tov:-105,tou:-115}, noP={...gx}; delete noP.tov; delete noP.tou;
    chk(tl(withP,'over').price===-105&&tl(withP,'over').src==='real'&&tl(withP,'under').price===-115&&tl(noP,'over').price===-110&&tl(noP,'over').src==='est'
      &&tl(withP,'over').key===tl(withP,'under').key&&/^Over 44\.5 points$/.test(tl(withP,'over').label)&&tl(withP,'over').grp==='TEAM','the total leg\'s price, its source, its label or its one key is wrong');
    chk(Math.abs(tl(withP,'over').p-noVig(withP))<1e-12&&Math.abs(tl(withP,'under').p-(1-noVig(withP)))<1e-12&&tl(noP,'over').p===0.5&&tl(withP,'over').mu===44.5,'the total leg does not carry the market\'s chance and the posted total');
    chk(F('isGameLeg')(tl(withP,'over')),'a game total is not a game leg');
    /* correlated with its game's passing and scoring lines, not with a win or a cover, nothing across games */
    const T={gid:'g',pid:'game',stat:'total',side:'over',grp:'TEAM',team:'SEA'};
    chk(legRho(T,{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'})===w.eval('TOTAL_RHO')['QB:passing_tds']&&legRho({gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'},T)===legRho(T,{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'})
      &&legRho(T,{gid:'g',stat:'ml',team:'SEA',grp:'TEAM'})===0&&legRho(T,{gid:'h',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'})===0,'the total\'s correlations are wrong');
    { const a=parlayProb([{...T,p:0.5},{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA',p:0.5,side:'over'}]), b=parlayProb([{...T,side:'under',p:0.5},{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA',p:0.5,side:'over'}]);
      chk(a.corr>a.indep+0.02&&b.corr<b.indep-0.02,'an over with a quarterback\'s touchdowns is not likelier together, or an under not less likely'); }
    /* on the Game bets card: both sides, one leg, the price as the card says */
    const gopen=S.sched.find(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w)&&x.tot!=null);
    if(gopen){ const keepP=JSON.stringify(S.parlay||{}); S.parlay={};
      const box=d.createElement('div'); box.innerHTML=F('gameBetsCard')(gopen,false);
      const ov=box.querySelector('[data-leg$="|game|total"][data-side="over"]'), un=box.querySelector('[data-leg$="|game|total"][data-side="under"]');
      chk(!!ov&&!!un&&+ov.dataset.k===gopen.tot&&ov.dataset.main==='1','the Game bets card does not offer the total over and under');
      { const blk=[...box.querySelectorAll('.statblk')].find(b=>/^Game total/.test(b.querySelector('h4').textContent)), pc=blk?[...blk.querySelectorAll('.pct')].map(x=>x.textContent):[];
        const want=[(noVig(gopen)*100).toFixed(0)+'%',((1-noVig(gopen))*100).toFixed(0)+'%'];
        chk(!!blk&&pc.join()===want.join()&&blk.querySelector('h4').textContent.includes(`model's points ${mT(gopen).toFixed(1)}`)&&blk.querySelector('h4').textContent.includes(`book line ${gopen.tot}`)
          &&/The total's chance is the book's own/.test(box.textContent)&&!/pulled halfway to the posted total/.test(box.textContent),
          `the Game bets card does not show the total at the market's chance (${want.join('/')}) with the model's points as a display: ${blk?blk.textContent.replace(/\s+/g,' ').slice(0,120):'no total block'}`); }
      if(ov&&un){ const tick=cb=>F('toggleLeg')(cb.dataset.leg,+cb.dataset.k,gopen,cb.dataset.side,cb.dataset.main==='1');
        tick(ov); let L=S.parlay[ov.dataset.leg];
        chk(!!L&&L.stat==='total'&&L.side==='over'&&L.k===gopen.tot&&L.price===(gopen.tov!=null?gopen.tov:-110)&&L.src===(gopen.tov!=null?'real':'est')&&Math.abs(L.p-noVig(gopen))<1e-12,'ticking the over did not put the total on the parlay at its price and the market\'s chance');
        tick(un); L=S.parlay[ov.dataset.leg];
        chk(Object.keys(S.parlay).length===1&&L.side==='under','ticking the under did not take the over\'s place');
        chk(/Under [\d.]+ points/.test(d.getElementById('parlayBody').textContent),'the total is not shown in the builder');
        tick(un); chk(!S.parlay[ov.dataset.leg],'the total did not come back out'); }
      const locked=d.createElement('div'); locked.innerHTML=F('gameBetsCard')({...gopen,hs:24,as:20},true);
      chk(locked.querySelectorAll('.statblk').length===3&&!locked.querySelector('input[data-leg]'),'a kicked-off game\'s card does not mark the total with the two teams');
      S.parlay=JSON.parse(keepP); F('renderParlay')(); }
    console.log(`J2. game total: the market's chance on ${nTot} scheduled totals (${nPriced} with both prices, the rest 50%) and 9 made-up prices; the model's points (${mT(gx).toFixed(1)} on a sample game) moved 4 ways and never in it; another number at Normal(line, 13.2); settles over, under and push, live, priced, correlated, ticked one side at a time`); }

  /* ---- K. two or more touchdowns ---- */
  { const lam=-Math.log(0.5); chk(Math.abs(tdPlus(0.5,2)-(1-Math.exp(-lam)*(1+lam)))<1e-12&&Math.abs(tdPlus(0.5,1)-0.5)<1e-12,'tdPlus formula wrong');
    chk(tdPlus(0.6,2)<0.6&&tdPlus(0.6,3)<tdPlus(0.6,2)&&tdPlus(0.01,2)<0.001,'tdPlus not decreasing in k');
    const wk=Object.keys(S.actuals||{})[0]; const pid=wk?Object.keys(S.actuals[wk])[0]:null;
    if(pid){ const a=S.actuals[wk][pid]; const keep={...a}; a.tds=2; a.any_td=1;
      chk(settleLeg({week:+wk,pid,stat:'any_td',k:2})==='win'&&settleLeg({week:+wk,pid,stat:'any_td',k:3})==='loss'&&settleLeg({week:+wk,pid,stat:'any_td',k:1})==='win','2+ touchdown settlement wrong');
      delete a.tds; chk(settleLeg({week:+wk,pid,stat:'any_td',k:2})===null,'2+ on a yes/no-only stat line should stay pending'); Object.assign(a,keep); }
    const gk=openUpcoming();
    const rb=[...d.querySelectorAll('.plrbtn')].find(b=>/RB1|WR1/.test(b.textContent)); rb.click();
    const c2=d.querySelector('.plrbody [data-leg$="|any_td"][data-k="2"]'); chk(!!c2,'no 2+ touchdown checkbox');
    if(c2){ c2.checked=true; c2.dispatchEvent(new w.Event('change')); const L=Object.values(S.parlay).find(l=>l.stat==='any_td'); chk(!!L&&L.k===2&&/2\+ touchdowns/.test(L.label)&&L.p<0.5,'2+ leg did not land');
      const c1=d.querySelector('.plrbody [data-leg$="|any_td"][data-k="1"]'); c1.checked=true; c1.dispatchEvent(new w.Event('change')); const L1=Object.values(S.parlay).filter(l=>l.stat==='any_td'); chk(L1.length===1&&L1[0].k===1,'ticking 1+ should replace 2+, not add');
      c1.checked=false; c1.dispatchEvent(new w.Event('change')); }
    d.getElementById('backBtn').click();
    console.log(`K. touchdowns: P(2+|p=0.5)=${(tdPlus(0.5,2)*100).toFixed(1)}%, settlement and toggling ok`); }

  /* ---- K2. a quarterback's anytime touchdown: his own run or catch, never a pass (app v102) ----
     The market and his stats carry it; its wording says what it is and a back's is unchanged; it
     settles on his rushing and receiving touchdowns alone, from a stats row and from the live box
     score; it moves with the total and with his own carries as TOTAL_RHO and corr.json say; and
     market + form is asked with the leg's stat (none on a quarterback's touchdown). Where the payload
     carries his model (model.QB.any_td, baked from data/final_model.json), every quarterback on a game
     to come has the leg, its chance the logit on featVec capped by his projected carries at tdrate.QB
     (x tdmult), worked here on its own; one with a book price is a priced leg at that price; and his
     game page heads the block as his own run or catch, with boxes that put the leg on worded so. The
     audit boots with NO_BAKED, so S.odds is empty here: the open weeks' own prices are ingested for
     these checks (and S.odds put back after), and where none of them prices a quarterback who can be
     suggested, one is planted at +235, so the priced leg is always held, never passed on nothing. A
     payload baked before the model has none: those checks are skipped and said, never failed. */
  { const MK=F('MKT'), GS=F('GRP_STATS'), TR=F('TOTAL_RHO'), tdLabel=F('tdLabel'), rowStats=F('rowStats'), espnStats=F('espnStats'),
      featVec=F('featVec'), dot=F('dot'), oddsFor=F('oddsFor'), pricedLegs=F('pricedLegs'), suggestable=F('suggestable');
    chk(MK.any_td.grps.includes('QB')&&GS.QB.includes('any_td'),'the anytime touchdown is not offered to a quarterback');
    const q1=tdLabel('QB',1), q2=tdLabel('QB',2);
    chk(/rushing or receiving TD/.test(q1)&&/not a TD pass/.test(q1)&&/2\+ rushing or receiving TDs/.test(q2)&&/not TD passes/.test(q2),`a quarterback's touchdown is not worded as his own run or catch: "${q1}", "${q2}"`);
    chk(tdLabel('RB',1)==='Scores a touchdown'&&tdLabel('WR',2)==='Scores 2+ touchdowns'&&tdLabel('TE',1)==='Scores a touchdown','a back\'s, receiver\'s or tight end\'s touchdown wording changed');
    /* settling, from a stats row as the file has it */
    { const row={attempts:'31',completions:'22',passing_yards:'262',passing_tds:'3',passing_interceptions:'0',carries:'6',rushing_yards:'24',rushing_tds:'0',receptions:'0',targets:'0',receiving_yards:'0',receiving_tds:'0'};
      const wk='99', pid='__qb_td__', had=S.actuals[wk];
      const at=r=>{ S.actuals[wk]={[pid]:rowStats(r)}; return [1,2,3].map(k=>settleLeg({week:+wk,pid,stat:'any_td',k,side:'over',grp:'QB'})).join(','); };
      const pass3=at(row), run1=at({...row,passing_tds:'1',rushing_tds:'1'}), both=at({...row,passing_tds:'0',rushing_tds:'1',receiving_tds:'1'});
      if(had===undefined) delete S.actuals[wk]; else S.actuals[wk]=had;
      chk(pass3==='loss,loss,loss',`three touchdown passes and no run should lose a quarterback's touchdown and his 2+: ${pass3}`);
      chk(run1==='win,loss,loss',`a quarterback's rushing touchdown (and one pass) should win his touchdown and lose his 2+: ${run1}`);
      chk(both==='win,win,loss',`a quarterback's run and catch should win his touchdown and his 2+: ${both}`); }
    /* and live, from the box score */
    { const box=(ptd,rtd)=>({boxscore:{players:[{team:{abbreviation:'WSH'},statistics:[
        {name:'passing',labels:['C/ATT','YDS','AVG','TD','INT'],athletes:[{athlete:{displayName:'Jayden Daniels'},stats:['21/30','255','8.5',String(ptd),'0']}]},
        {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],athletes:[{athlete:{displayName:'Jayden Daniels'},stats:['7','48','6.9',String(rtd),'15']}]}]}]}});
      const e0=espnStats(box(3,0),'WAS','Jayden Daniels'), e1=espnStats(box(0,1),'WAS','Jayden Daniels');
      chk(e0&&e0.passing_tds===3&&e0.any_td===0&&e1&&e1.any_td===1,`live: a quarterback's touchdown passes counted, or his run not (${e0&&e0.any_td}, ${e1&&e1.any_td})`); }
    /* moving together: the total, his own lines, a parlay of them */
    const mq=(stat,pid)=>({gid:'gq',pid:pid||'q',team:'WAS',grp:'QB',stat,p:0.3,side:'over'}), tot={gid:'gq',pid:'game',team:'WAS',grp:'TEAM',stat:'total',p:0.5,side:'over'};
    chk(TR['QB:any_td']===0.09&&legRho(mq('any_td'),tot)===0.09&&legRho(tot,mq('any_td'))===0.09,'a quarterback\'s touchdown does not move with the total as TOTAL_RHO says');
    { const C=PAY.corr||{}, rc=C['self|QB:any_td|QB:carries'], rp=C['self|QB:any_td|QB:passing_tds'];
      if(rc==null) console.log('K2. corr.json in this payload has no quarterback touchdown pairs (baked before them): his legs move with nothing but the total');
      else { chk(rc>0&&legRho(mq('any_td'),mq('carries'))===rc&&legRho(mq('carries'),mq('any_td'))===rc,'a quarterback\'s touchdown and his carries are not correlated as corr.json says');
        chk(rp<0&&legRho(mq('passing_tds'),mq('any_td'))===rp,'a quarterback\'s touchdown and his touchdown passes are not correlated as corr.json says');
        const pp=parlayProb([{...mq('any_td'),p:0.3},{...mq('rushing_yards'),p:0.5}]); chk(pp.corr>pp.indep,'a quarterback\'s touchdown and his rushing yards on one parlay are not priced together'); } }
    /* market + form is asked with the stat */
    { let seen=null; const keepA=w.eloAltP, keepL=w.eloLoaded; w.eloAltP=(pid,side,price,src,stat)=>{ seen=stat; return null; }; w.eloLoaded=()=>true;
      const ok=F('formAgrees')({pid:'q',grp:'QB',stat:'any_td',side:'over',price:200,src:'real'});
      if(keepA===undefined) delete w.eloAltP; else w.eloAltP=keepA; if(keepL===undefined) delete w.eloLoaded; else w.eloLoaded=keepL;
      chk(seen==='any_td'&&ok===false,`formAgrees does not hand market + form the leg's stat (${seen})`); }
    const M=PAY.model.QB&&PAY.model.QB.any_td;
    if(!M) console.log('K2. quarterback touchdown: offered, worded, settled, correlated; this payload predates its model (no model.QB.any_td), so no quarterback has the leg yet and the projection checks are skipped until the props job rebakes');
    else {
      const R=PAY.tdrate.QB, MM=PAY.model.QB;
      chk(M.type==='logit'&&M.coef.length===15&&M.coef.every(isFinite),'model.QB.any_td is not a 15-number logit');
      chk(PAY.prior.QB&&PAY.prior.QB.any_td>0&&PAY.prior.QB.any_td<1,'prior.QB.any_td missing or not a chance');
      chk(!!R&&R.rush>0&&R.rush<0.2,'tdrate.QB missing: a quarterback\'s touchdown would go uncapped');
      const open=S.sched.filter(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w));
      const keepOdds=JSON.stringify(S.odds||{}); let planted=null, elig=0;
      for(const wk of new Set(open.map(g=>+g.w))) F('ingestOdds')((PAY.prices||{})[String(wk)]||[],wk);
      { const cand=[]; for(const g of open){ const r=rosterFor(g,false);
          for(const team in r) for(const x of r[team].players) if(x.pl.grp==='QB'&&x.gp>=3&&suggestable(x.pl.id)) cand.push({g,x}); }
        elig=cand.length;
        if(elig&&!cand.some(c=>oddsFor(c.g.id,c.x.pl.id,'any_td',1)!=null)){ const c=cand[0];
          ((S.odds[c.g.id]??={})[c.x.pl.id]??={}).any_td={'1':235}; planted=c.x.pl.n; } }
      const legs=pricedLegs(open);
      let nQ=0,nP=0,capped=0,mism=0,noLine=0,badLeg=0; const shown=[];
      for(const g of open){ const r=rosterFor(g,false);
        /* a quarterback the model has nothing to project for (no game last season or this, app v104)
           has no lines at all, this one included: B3 holds that */
        for(const team in r) for(const x of r[team].players){ if(x.pl.grp!=='QB'||F('nothingToProject')(x)) continue; nQ++;
          const l=statLines(x).find(s=>s.stat==='any_td'); if(!l){ noLine++; continue; }
          const p0=1/(1+Math.exp(-dot(M.coef,featVec(x.pl,'any_td',x.opp,x.ctx))));
          const mc=MM.carries?Math.max(dot(MM.carries.coef,featVec(x.pl,'carries',x.opp,x.ctx)),0):0, mr=MM.receptions?Math.max(dot(MM.receptions.coef,featVec(x.pl,'receptions',x.opp,x.ctx)),0):0;
          const cap=R?1-Math.exp(-(mc*R.rush+mr*R.rec)*(PAY.tdmult||1.5)):1, want=Math.min(p0,cap);
          if(cap<p0) capped++;
          if(!(Math.abs(l.p-want)<1e-12&&l.p>0&&l.p<1)) mism++;
          const od=oddsFor(g.id,x.pl.id,'any_td',1);
          if(od!=null&&x.gp>=3&&suggestable(x.pl.id)){ nP++; const L=legs.find(c=>c.pid===x.pl.id&&c.stat==='any_td');
            if(!(L&&L.price===od&&L.src==='real'&&L.p===l.p&&L.k===1&&L.side==='over'&&L.label===q1&&L.grp==='QB')) badLeg++;
            else if(shown.length<4) shown.push(`${x.pl.n} ${(l.p*100).toFixed(0)}% at ${od>0?'+':''}${od}`); } } }
      chk(nQ>0||!open.length,'no quarterback on a game to come');
      chk(noLine===0,`${noLine} quarterbacks on games to come with no touchdown line`);
      chk(mism===0,`${mism} quarterback touchdown chances are not the logit capped by his carries at tdrate.QB`);
      chk(badLeg===0,`${badLeg} quarterbacks with a book price on their touchdown have no priced leg at it, or one worded or priced otherwise`);
      chk(!elig||nP>=1,`${elig} quarterbacks on games to come could be suggested, and none of them with a book price on his touchdown was checked as a priced leg`);
      chk(legs.filter(c=>c.grp==='QB'&&c.stat==='any_td').length===nP,'a quarterback touchdown leg in pricedLegs for a quarterback with no price on it, or twice');
      { const o=JSON.parse(keepOdds); for(const k of Object.keys(S.odds)) delete S.odds[k]; Object.assign(S.odds,o); }
      /* his game page: the block, its wording, its boxes */
      let page='no game to come';
      if(open.length){ const gq=openUpcoming(), roster=rosterFor(gq,false);
        const qx=Object.values(roster).flatMap(t=>t.players).find(x=>x.pl.grp==='QB');
        const btn=qx&&d.querySelector(`.plrbtn[data-open="${qx.pl.id}"]`);
        if(btn){ btn.click();
          const key=gq.id+'|'+qx.pl.id+'|any_td', box=k=>d.querySelector(`.plrbody [data-leg="${key}"][data-k="${k}"]`);
          const blk=box(1)&&box(1).closest('.statblk'), h=blk&&blk.querySelector('h4');
          chk(!!h&&/^Rushing or receiving TD/.test(h.textContent.trim())&&/a TD pass does not count/.test((h.querySelector('em[data-qbtd]')||{}).textContent||''),`a quarterback's touchdown block is not headed as his own run or catch: "${h&&h.textContent.trim()}"`);
          chk(!!box(1)&&/rushing or receiving touchdown/.test(box(1).getAttribute('aria-label')||''),'a quarterback\'s touchdown box does not say what it adds');
          if(box(2)){ box(2).checked=true; box(2).dispatchEvent(new w.Event('change'));
            const L2=S.parlay[key]; chk(!!L2&&L2.k===2&&L2.label===q2&&L2.grp==='QB',`his 2+ box put on "${L2&&L2.label}"`);
            box(1).checked=true; box(1).dispatchEvent(new w.Event('change'));
            const L1=S.parlay[key]; chk(!!L1&&L1.k===1&&L1.label===q1,`his touchdown box put on "${L1&&L1.label}"`);
            box(1).checked=false; box(1).dispatchEvent(new w.Event('change')); chk(!S.parlay[key],'unticking his touchdown left it on'); }
          else chk(false,'no 2+ box on a quarterback\'s touchdown');
          page=`${qx.pl.n}'s game page heads it as his own run or catch and its boxes put on "${q1}"`; }
        else W.coverage(false,'no quarterback row on a game to come');
        d.getElementById('backBtn').click(); }
      console.log(`K2. quarterback touchdown: offered, worded, settled on his runs and catches only (a stats row and live), correlated; ${nQ} quarterbacks on games to come each with the leg, ${capped} held by his carries' cap, every chance the capped logit; ${nP} with a book price each a priced leg${planted?' (none on the open weeks\' prices, so one planted on '+planted+')':''}${shown.length?' ('+shown.join(', ')+')':''}; ${page}`); } }

  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */
  const g0=openUpcoming();
  chk(!d.getElementById('gameModal').hidden&&!d.getElementById('slateView').hidden,'game overlay did not open over the list');
  chk(d.body.classList.contains('modal-open'),'page scroll not locked behind the overlay');
  [...d.querySelectorAll('.plrbtn')][0].click();
  const cb=d.querySelector('[data-leg]'); cb.checked=true; cb.dispatchEvent(new w.Event('change'));
  const legsBefore=Object.keys(S.parlay).length;
  /* the fixture is a week 1 of real rows; it takes the page's season, so a rollover (SEASON bumped
     in part2.js) needs no new fixture: ingestStats reads only rows of SEASON */
  const rows=Papa.parse(fs.readFileSync('../raw/fake_wk1.csv','utf8'),{header:true,skipEmptyLines:true}).data
    .map(x=>Object.assign(x,{season:String(F('SEASON'))}));
  const before=JSON.parse(JSON.stringify(S.players[Object.keys(S.players)[0]].e5));
  const r=F('ingestStats')(rows); F('renderAll')();
  chk(r.done.length>0,'week 1 not ingested');
  chk(Object.keys(S.processedGames).length===r.done.length,'games not tracked individually');
  chk(F('currentWeek')()===F('liveWeek')(),'current week should track the schedule, not uploads');
  chk(F('weekOpen')(F('liveWeek')())&&!F('weekOpen')(F('liveWeek')()+1),'week gating wrong');
  const r2=F('ingestStats')(rows); chk(r2.done.length===0&&r2.skipped.length===r.done.length,'re-upload was not skipped per game');
  /* a later file adding more games from the same week must still be accepted */
  { const wk=r.done[0].w;
    const more=rows.filter(x=>{const g=S.sched.find(y=>+y.w===+x.week&&(y.h===x.team||y.a===x.team)); return g&&!S.processedGames[g.id];});
    const r3=F('ingestStats')(more);
    chk(more.length===0||r3.done.length>0,'a second upload for the same week was wrongly skipped'); }
  chk(Object.keys(S.parlay).length===legsBefore,'parlay legs lost on upload');
  d.getElementById('backBtn').click();
  chk(d.getElementById('gameModal').hidden&&S.ui.game==null&&!d.body.classList.contains('modal-open'),'overlay did not close');
  chk(/\.modal\[hidden\]\s*\{\s*display\s*:\s*none/.test(raw),'stylesheet lacks the rule that lets the overlay actually hide');
  d.querySelector('[data-game="'+g0.id+'"]').click(); d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
  chk(d.getElementById('gameModal').hidden,'Escape did not close the overlay');
  const snap=JSON.stringify(S); const S2=JSON.parse(snap);
  chk(JSON.stringify(S2.parlay)===JSON.stringify(S.parlay)&&JSON.stringify(S2.processed)===JSON.stringify(S.processed),'backup round-trip changed state');
  /* ---- G5. Show stats: a player's season week by week, under his row, without opening his props ---- */
  { openUpcoming(); const b=d.querySelector('#gameView [data-stats]'); chk(!!b,'no Show stats button beside a player');
    if(b){ const pid=b.dataset.stats; b.click();
      const box=d.querySelector('#gameView .wkstats'), wks=Object.keys(S.actuals||{}).filter(w=>F('actualFor')(w,pid));
      chk(!!box&&box.querySelectorAll('tbody tr').length===wks.length&&(wks.length===0||!!box.querySelector('tfoot')),'Show stats did not list one row per week he has stats for');
      chk(!S.ui.open[pid],'Show stats opened the props as well');
      const b2=d.querySelector(`#gameView [data-stats="${pid}"]`); chk(/Hide stats/.test(b2.textContent),'the button does not offer to hide the stats');
      b2.click(); chk(!d.querySelector('#gameView .wkstats'),'Hide stats did not close the table');
      console.log(`G5. show stats: ${wks.length} week(s) listed for ${pid}, the props stayed shut, hides again`); }
    d.getElementById('backBtn').click(); }

  /* ---- G6. two on one team with the same last name and initial each keep their own box score ---- */
  { const es=F('espnStats');
    const sum={boxscore:{players:[{team:{abbreviation:'ATL'},statistics:[
      {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],athletes:[
        {athlete:{displayName:'Bijan Robinson'},stats:['24','131','5.5','1','40']},
        {athlete:{displayName:'Brian Robinson Jr.'},stats:['6','22','3.7','0','9']}]}]}]}};
    const bij=es(sum,'ATL','Bijan Robinson'), bri=es(sum,'ATL','Brian Robinson');
    chk(bij&&bij.rushing_yards===131&&bij.carries===24&&bij.tds===1,'Bijan Robinson was handed someone else\'s rushing line: '+JSON.stringify(bij));
    chk(bri&&bri.rushing_yards===22&&bri.tds===0,'Brian Robinson was handed someone else\'s rushing line: '+JSON.stringify(bri));
    const aj=es({boxscore:{players:[{team:{abbreviation:'LAC'},statistics:[{name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],athletes:[{athlete:{displayName:'A.J. Brown'},stats:['5','70','14','0','30','8']}]}]}]}},'LAC','AJ Brown');
    chk(aj&&aj.receptions===5,'the initials fallback no longer matches "A.J." to "AJ"');
    console.log(`G6. box-score names: Bijan ${bij&&bij.rushing_yards} and Brian ${bri&&bri.rushing_yards} rushing yards kept apart, A.J./AJ still matched`); }

  console.log(`G. state flow: ingest ok, week stays on ${F('currentWeek')()} (schedule-driven), re-upload skipped, legs preserved, backup round-trips`);

  /* ---- G4. the list puts the games still to play first and the finals under a heading ---- */
  { const ws=d.getElementById('weekSel'), keep=ws.value, seen=[];
    for(const wk of ['1',String(F('currentWeek')())]){
      if(![...ws.options].some(o=>o.value===wk)) continue;
      ws.value=wk; F('renderSlate')();
      const kids=[...d.getElementById('gamesList').children].filter(n=>n.matches('.game,.slatesep'));
      const firstFinal=kids.findIndex(n=>n.matches('.game.final')), seps=kids.filter(n=>n.matches('.slatesep'));
      const lastTodo=kids.map(n=>n.matches('.game:not(.final)')).lastIndexOf(true);
      W.order(firstFinal<0||lastTodo<firstFinal,`week ${wk}: a game still to play sits below a final`);
      W.order(firstFinal<0?seps.length===0:(seps.length===1&&kids[firstFinal-1]===seps[0]),`week ${wk}: the Completed heading is missing, doubled or not right above the first final`);
      seen.push(`week ${wk} ${kids.filter(n=>n.matches('.game:not(.final)')).length} to play, ${kids.filter(n=>n.matches('.game.final')).length} final`); }
    ws.value=keep; F('renderSlate')();
    console.log(`G4. slate order: ${seen.join('; ')}`); }

  /* ---- G2. a played game's projections must not move once results land ---- */
  {
    const gp=S.sched.find(x=>x.w===1&&F('gameFinal')(x));
    if(gp){
      const H=S.headlines&&S.headlines['1']&&S.headlines['1'][gp.id];
      chk(!!H,'headline was not frozen for a finished game');
      if(H){ const live=F('gameHeadline')(gp);
        chk(JSON.stringify(live.map(x=>[x.k,x.v.pl.id,+x.v.mu.toFixed(4)]))===JSON.stringify(H.map(x=>[x.k,x.pid,+x.mu.toFixed(4)])),
          'headline drifted after results were loaded'); }
      const P=S.projections&&S.projections['1'];
      chk(P&&Object.keys(P).length>0,'projections were not frozen');
      const roster=rosterFor(gp,false); let drift=0,seen=0;
      for(const t in roster) for(const x of roster[t].players){
        const snap=P&&P[x.pl.id]; if(!snap) continue;
        for(const l of statLines(x)){ if(l.prob||snap[l.stat]==null||snap[l.stat].mu==null) continue;
          seen++; if(Math.abs(snap[l.stat].mu-l.mu)>1e-9) drift++; }
      }
      chk(seen>0,'no frozen projections to compare');
      console.log(`G2. frozen pre-game view: headline held, ${seen} stat projections stored, ${drift} differ from live (expected, live recomputes)`);
    }
  }

  /* ---- G3. track record: frozen chances score what was on screen ---- */
  {
    const TR=F('trackRecord')(), TS=F('trackSummary');
    chk(TR.length>0,'track record empty after grading');
    let badP=0,badHit=0,stored=0,faithful=0,off=0;
    for(const r of TR){ if(!(r.p>0&&r.p<1)) badP++; if(r.hit!==0&&r.hit!==1) badHit++; }
    chk(badP===0,`track record chances out of range: ${badP}`); chk(badHit===0,`track record hits not 0/1: ${badHit}`);
    const P1=S.projections['1']||{};
    for(const pid in P1) for(const stat in P1[pid]){ const sn=P1[pid][stat]; if(!sn||sn.mu==null) continue;
      chk(Array.isArray(sn.r)&&sn.r.length>=1,`rungs not frozen for ${pid} ${stat}`); stored++;
      const pl=S.players[pid]; if(!pl) continue;
      for(const [k,p] of sn.r){ faithful++; if(Math.abs(pOver(pl.grp,stat,sn.mu,k-0.5)-p)>6e-5) off++; }
      if(sn.ml){ const L=marketLine(1,pid,stat); chk(!!L&&L.line===sn.ml[0],`frozen main line differs from the market table ${pid} ${stat}`); }
    }
    chk(stored>0,'no frozen rungs found'); chk(off===0,`frozen rung chances disagree with the frozen projection: ${off} of ${faithful}`);
    const bands=[TR.filter(r=>r.p>=0.7),TR.filter(r=>r.p>=0.45&&r.p<0.7),TR.filter(r=>r.p<0.45)];
    chk(bands.reduce((a,b)=>a+b.length,0)===TR.length,'confidence bands do not partition the record');
    const t=TS(TR); chk(t.n===TR.length&&t.said>0&&t.said<1&&t.hit>=0&&t.hit<=1&&t.margin>0,'track summary malformed');
    /* a pre-v27 snapshot (projection only) must still score, from the same tables */
    const pid0=Object.keys(P1).find(p=>Object.values(P1[p]).some(x=>x.mu!=null));
    const keep=JSON.parse(JSON.stringify(P1[pid0]));
    for(const stat in P1[pid0]) if(P1[pid0][stat].mu!=null) P1[pid0][stat]={mu:P1[pid0][stat].mu};
    const TR2=F('trackRecord')(); P1[pid0]=keep;
    const a=TR.filter(r=>r.pid===pid0&&r.kind==='rung').map(r=>[r.stat,r.k,+r.p.toFixed(4),r.hit]).sort();
    const b=TR2.filter(r=>r.pid===pid0&&r.kind==='rung').map(r=>[r.stat,r.k,+r.p.toFixed(4),r.hit]).sort();
    chk(JSON.stringify(a)===JSON.stringify(b),'old-style snapshot scores differently from a frozen one');
    /* week 1 is graded on the fake file above; its main lines carry prices when the payload has
       any for week 1 (before the season's first pull it has none, and that is no failure) */
    const wk1Lines=Object.keys((w.eval('PAY').mkt||{})['1']||{}).length;
    const priced=TR.filter(r=>r.ml!=null); chk(!wk1Lines||priced.length>0,'no priced lines in the track record (built-in main lines should carry prices)');
    chk(priced.every(r=>r.imp>0&&r.imp<1&&isFinite(F('mlToDec')(r.ml))),'priced line with a bad implied chance');
    chk(priced.every(r=>r.kind!=='main'||marketLine(1,r.pid,r.stat)),'main-line price without a market line');
    chk(!!d.getElementById('lineNote'),'line-freshness note element missing');
    F('renderTrack')(); const body=d.getElementById('trackBody');
    chk(!priced.length||body.textContent.includes('Against the book'),'book table did not render');
    chk(body&&body.querySelectorAll('table').length>=(priced.length?4:3),'track record tab did not render its tables');
    chk(d.getElementById('trackMarket').options.length>1,'market filter not populated');
    const kinds={}; for(const r of TR) kinds[r.kind]=(kinds[r.kind]||0)+1;
    console.log(`G3. track record: ${priced.length} priced; ${TR.length} graded lines (${Object.entries(kinds).map(([k,v])=>k+' '+v).join(', ')}), said ${(t.said*100).toFixed(1)}% happened ${(t.hit*100).toFixed(1)}%, ${stored} snapshots carry frozen rungs, ${faithful} rung chances all match the frozen projection`);
  }
  /* ---- M. the Parlay Builder's suggested parlays: built from what the reader ticks ----
     Held to its rules whatever the week offers: every tier has exactly its legs or says why; every
     leg is of a ticked kind and game, has not kicked off, carries a real price and is never rated
     below the book; one leg a line, a player and (for a game bet) a game; a tier's chance and price
     are the builder's own sums; thin legs only where the preferred legs could not fill the tier;
     and a pick that leaves fewer legs than a tier needs gets the reason, not a smaller parlay; and
     a game total (priced at the book's own chance, it has no edge) is in a tier only as the last
     fill, a market leg marked so, where the same level from the legs with an edge is empty, with
     one line saying so whenever Game total is ticked. Run on the week as it is, and again on made-up
     lines (each starter's main line set off his own projection, a price on every total: -105/-115
     on half, +100/+100 with no margin and +110/+105 with less than none on the rest) so the player
     legs and the totals are always tried. */
  { const tab=d.getElementById('tab-parlay'), panel=d.getElementById('pbPanel');
    d.querySelector('#tabs button[data-tab="parlay"]').click();
    chk(!!panel&&tab.firstElementChild===panel&&panel.nextElementSibling===d.getElementById('parlayBody'),'the suggested parlays are not at the top of the Parlay Builder tab, over the builder');
    chk(!d.getElementById('suggModal')&&!d.getElementById('suggOpen')&&!d.getElementById('suggView')&&!/data-suggest-side|data-suggest-save|suggStake/.test(d.body.innerHTML),'the old Suggested parlays window or its switch is still in the page');
    if(!F('pbGames')().length){ chk(/no game is left|nothing left to build from/.test(panel.textContent),'with no game to come the panel does not say so'); console.log('M. suggested parlays: no game to come, and the panel says so'); }
    else {
    chk(!!d.getElementById('pbCard')&&d.querySelectorAll('#pbPanel [data-pb-mix]').length===3&&d.querySelectorAll('#pbPanel [data-pb-kind]').length===5,'the panel has no mix switch (All, Teams only, Players only) or not its five bet types');
    chk(!d.querySelector('#pbPanel [data-pc-finish]'),'Finish is offered on the prop model\'s own page, which has no parlay card');
    const U=()=>S.ui.pb, mlP=F('mlProb'), isG=F('isGameLeg'), pp=F('parlayProb'), pd=F('parlayDec');
    const SPEC=w.eval('PB_TIERS');
    const KINDS=['ml','ats','total','over','under'], kindOf=F('pbKind');
    const setKinds=ks=>{ for(const k of KINDS) U().k[k]=ks.includes(k); w.eval('PB_CACHE=new Map()'); };
    let built=0, said=0, legsSeen=0, thinSeen=0, corrTiers=0, likeliestSeen=0, likeliestWorked=0, combosWorked=0;
    /* "the likeliest" worked out in full. Where no two legs that could share a parlay move together
       (different games, or a game's side and its total), every parlay's chance is a plain product and
       parlayProb works it exactly, so every parlay of the tier's size with its count of thin legs
       is worked, and none may land likelier than the tier. That holds whatever the legs are priced
       at, so a fallback chosen by any other measure (the best return under the floor, say) fails
       it on the week's own picks, not only on made-up ones. Bounded, so a long list never stalls
       the audit (the week's spreads alone make a few hundred) */
    const fitsF=F('pbFits'), orderF=F('pbOrder'), rhoF=F('legRho'), LIKELY_CAP=250000;
    const noMovers=list=>{ for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++)
      if(fitsF([list[i]],list[j])&&Math.abs(rhoF(list[i],list[j]))>=0.03) return false; return true; };
    const likeliestOf=(list,n,thin,mk)=>{ let best=-1, legs=null, seen=0;
      const rec=(i0,cur,th)=>{ if(seen>LIKELY_CAP) return;
        if(cur.length===n){ if(th!==thin) return; seen++; const pr=F('parlayProb')(orderF(cur)).corr; if(pr>best){ best=pr; legs=cur.slice(); } return; }
        for(let i=i0;i<list.length;i++){ const c=list[i], th2=th+((mk?c.market:c.thin)?1:0); if(th2>thin||!fitsF(cur,c)) continue; cur.push(c); rec(i+1,cur,th2); cur.pop(); } };
      rec(0,[],0); return seen>LIKELY_CAP||!legs?null:{best,legs,seen}; };
    /* a level's best return over its floor, searched on its own (the search a level tries first),
       and what a card's rule says it is: Safe the likeliest pair, a level over its floor its best
       return, a level that fell back the likeliest parlay of its size */
    const bestRet=w.eval("typeof pbBestReturn==='function'?pbBestReturn:null");
    chk(!!bestRet,'the page has no search for a level\'s best return over its floor on its own (pbBestReturn)');
    const maxLegsOf=F('pbMaxLegs'), pbIdOf=l=>l.key+'|'+l.side+'|'+l.k;
    const ruleFor=t=>t.likeliest?`the likeliest ${t.n} legs`:t.floor?`best return that lands ${Math.round(t.floor*100)}%+ by the model`:'the likeliest pair';
    /* the reason a tier gives with no player price on file: when they really come (PR #213: the
       Sunday slate on Saturday morning, every other game on its day or the day before) */
    const NO_PL='No player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).', noPlLow=NO_PL[0].toLowerCase()+NO_PL.slice(1);
    /* a card's own words, beyond its legs: the rule beside its name says what the parlay is, and
       nothing else on it speaks of the floor (the owner wants the chance and the price, no note):
       no paragraph but the thin-edge line, and no word of a floor outside the rule and the legs */
    const cardWords=(c,t,lab)=>{ const rule=c.querySelector('.pb-rule'), rest=c.cloneNode(true);
      rest.querySelectorAll('.pb-legs,.pb-thin,.pb-rule').forEach(x=>x.remove());
      W.wording(!!rule&&rule.textContent===ruleFor(t),`${lab}: the ${t.id} card's rule reads "${rule?rule.textContent:''}", not "${ruleFor(t)}"`);
      /* whatever the rule's wording, a chance it states is a number on the page: blocking */
      { const m=rule&&/lands (\d+)%\+/.exec(rule.textContent);
        chk(!m||t.corr>=m[1]/100-1e-12,`${lab}: the ${t.id} card says it lands ${m&&m[1]}%+ by the model, and its chance is ${(t.corr*100).toFixed(1)}%`); }
      W.wording(![...c.querySelectorAll('p')].some(p=>!p.classList.contains('pb-thin'))&&!/floor|usual|below|short of|of the time|%\+(?!\d)/i.test(rest.textContent),
        `${lab}: the ${t.id} card carries a note beside its chance and price: "${rest.textContent.replace(/\s+/g,' ').trim().slice(0,160)}"`); };
    /* a card leads with its fair chance, labelled so (est. where it is), whose chance it was chosen on
       beside it ("model says 26%"); with no fair chance, that chance alone, saying why */
    const fairShown=(c,t,lab,by)=>{ const first=c.querySelector('.pb-nums')&&c.querySelector('.pb-nums').firstElementChild, q=s=>first&&first.querySelector(s);
      const b=q('b'), sp=q('span'), sm=q('small'), ch=by==='Elo'?t.p:t.corr, Fr=t.fair, pc=v=>(v*100).toFixed(0)+'%';
      if(Fr&&Fr.p!=null) chk(!!b&&b.textContent===pc(Fr.p)&&!!sp&&sp.textContent===(Fr.est?'fair chance, est.':'fair chance')&&!!sm&&sm.textContent===`${by} says ${pc(ch)}`,
        `${lab}: the ${t.id} card does not lead with its fair chance ${pc(Fr.p)}${Fr.est?' (est.)':''} beside "${by} says ${pc(ch)}": "${first?first.textContent:'no figures'}"`);
      else chk(!!b&&b.textContent===pc(ch)&&!!sm&&/^no fair chance: a leg has no book price$/.test(sm.textContent),`${lab}: the ${t.id} card has no fair chance and does not say why beside the model's: "${first?first.textContent:'no figures'}"`); };
    /* every rule a tier keeps, on the picks as they stand */
    const hold=(lab)=>{
      const r=F('getPbTiers')(), games=F('pbGames')(), u=U();
      chk(r.tiers.length===4&&r.tiers.map(t=>t.id+t.n).join()===SPEC.map(s=>s[0]+s[2]).join(),`${lab}: the tiers are not Safe, Medium, Aggressive and Extreme at 2, 3, 4 and 5 legs`);
      const pool=games.length&&KINDS.some(k=>u.k[k])&&games.some(g=>!u.off.includes(g.id))?F('pbPool')(games.filter(g=>!u.off.includes(g.id))):{pref:[],thin:[],mkt:[]};
      const mkt=pool.mkt||[], maxLegs=F('pbMaxLegs')([...pool.pref,...pool.thin,...mkt]);
      /* the market list: only totals, only with Game total ticked, each on a ticked game at the
         market's own chance (totalLeg's) on a real price, 45-97%, never thin */
      chk(mkt.every(c=>c.stat==='total'&&c.market===true&&c.thin===false&&c.src==='real'&&c.p>=0.45&&c.p<0.97&&!u.off.includes(c.gid)
        &&Math.abs(c.p-F('totalLeg')(S.sched.find(g=>g.id===c.gid),c.side).p)<1e-12)&&(!!u.k.total||!mkt.length),`${lab}: the market list holds something other than a ticked game's total at the market's chance, or holds one with Game total unticked`);
      /* the pool itself, whichever legs a tier happens to take: nothing under the book, no estimated
         price, nothing of a kind or game not ticked, a preferred leg only over the full bar */
      chk([...pool.pref,...pool.thin].every(c=>c.p>=mlP(c.price)&&c.src==='real'&&!!u.k[kindOf(c)]&&!u.off.includes(c.gid)),`${lab}: a leg under the book, on an estimated price, or of a kind or game not ticked is among the legs a tier may take`);
      chk(pool.pref.every(c=>c.p-mlP(c.price)>=0.03&&F('formAgrees')(c)),`${lab}: a preferred leg does not clear the 3-point bar and market + form`);
      /* a game total is priced at the book's own chance, so it is never among the legs a tier may take */
      chk([...pool.pref,...pool.thin].every(c=>c.stat!=='total'),`${lab}: a game total is among the legs a tier may take`);
      /* no player prices on file for the ticked games, with player bets ticked: the reason a tier
         is empty, said as such (and never "tick more" under Players only, where no tick helps) */
      const pooled=pool.plGames!=null, plOn=!!(u.k.over||u.k.under), tmOn=!!(u.k.ml||u.k.ats);
      const noPl=pooled&&plOn&&!F('pricedLegs')(games.filter(g=>!u.off.includes(g.id)),true).some(l=>!isG(l));
      W.wording(!pooled||!!r.noPlayerPrices===noPl,`${lab}: the tiers say there are${r.noPlayerPrices?'':' not'} no player prices on file, and that is not so`);
      for(const t of r.tiers){ const [,,n,floor]=SPEC.find(s=>s[0]===t.id);
        if(!t.legs){ said++;
          W.wording(typeof t.why==='string'&&t.why.length>10,`${lab}: the ${t.id} tier is empty and does not say why`);
          if(maxLegs<n) W.wording(/^(Only \d+ legs?|No legs|No games|No bet types|No player prices)/.test(t.why),`${lab}: ${maxLegs} legs on the picks and the ${n}-leg tier does not say there are too few: ${t.why}`);
          /* every level shows a parlay whenever the picks make that many legs: empty only when they do not */
          W.compose(maxLegs<n,`${lab}: the ${t.id} tier is empty though the picks make ${maxLegs} legs, enough for ${n}: ${t.why}`);
          W.wording(!/of the time or more|lands \d+%/.test(t.why),`${lab}: the empty ${t.id} tier speaks of its floor, which every level now falls back from: ${t.why}`);
          if(pooled) W.wording(/no player prices yet/i.test(t.why)===noPl&&(!noPl||tmOn||(t.why===NO_PL&&!/tick more/.test(t.why))),
            `${lab}: the empty ${t.id} tier ${noPl?'does not say plainly that no player prices are on file yet':'says no player prices are on file, and some are'}: ${t.why}`);
          continue; }
        built++; legsSeen+=t.legs.length;
        W.compose(t.legs.length===n,`${lab}: the ${t.id} tier has ${t.legs.length} legs, not ${n}`);
        /* a total only as the last fill: every total a market leg, counted, and only where the same
           level built from the legs with an edge alone is empty */
        chk(t.legs.every(l=>(l.stat==='total')===!!l.market)&&(t.mkt||0)===t.legs.filter(l=>l.market).length,`${lab}: the ${t.id} tier has a total that is not a market leg, or miscounts them`);
        if(t.mkt) W.compose(F('pbTier')(SPEC.find(s=>s[0]===t.id),{pref:pool.pref,thin:pool.thin,mkt:[]},new Map())===null,`${lab}: the ${t.id} tier took a game total where the legs with an edge make a parlay of its size`);
        chk(maxLegs>=n,`${lab}: a ${n}-leg ${t.id} tier from picks that only make ${maxLegs}`);
        for(const l of t.legs){ const g=S.sched.find(x=>x.id===l.gid);
          chk(!!u.k[kindOf(l)]&&!u.off.includes(l.gid)&&games.some(x=>x.id===l.gid),`${lab}: ${l.name} ${l.label} is of a kind or a game not ticked, or its game is not on the list`);
          chk(!!g&&!F('gameStarted')(g),`${lab}: ${l.name} ${l.label} is on a game that has kicked off`);
          chk(l.src==='real'&&isFinite(l.price)&&l.price!==0&&l.p>=0.45&&l.p<0.97,`${lab}: ${l.name} ${l.label} has no real price, or a chance out of 45-97%`);
          if(l.market) chk(l.stat==='total'&&l.thin===false,`${lab}: ${l.name} ${l.label} is a market leg that is not a total, or is marked thin`);
          else { chk(l.p>=mlP(l.price),`${lab}: ${l.name} ${l.label} is rated below the book (${(l.p*100).toFixed(1)}% against ${(mlP(l.price)*100).toFixed(1)}%)`);
            chk(l.thin===!(l.p-mlP(l.price)>=0.03&&F('formAgrees')(l)),`${lab}: ${l.name} ${l.label} is marked thin wrongly`); }
          if(l.thin) thinSeen++; }
        chk(new Set(t.legs.map(l=>l.key)).size===n,`${lab}: the ${t.id} tier has one line twice (or both sides of one)`);
        const gl=t.legs.filter(isG), pl=t.legs.filter(l=>!isG(l));
        const sides=gl.filter(l=>l.stat!=='total'), tots=gl.filter(l=>l.stat==='total');
        chk(new Set(sides.map(l=>l.gid)).size===sides.length&&new Set(tots.map(l=>l.gid)).size===tots.length,`${lab}: the ${t.id} tier has two sides, or two totals, on one game`);
        chk(new Set(pl.map(l=>l.pid)).size===pl.length,`${lab}: the ${t.id} tier has two legs on one player`);
        /* the card's numbers are the builder's own sums on the legs as the builder orders them */
        const order=t.legs.map(l=>l.key).join(), want=[...t.legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name))).map(l=>l.key).join();
        chk(order===want,`${lab}: the ${t.id} tier's legs are not in the builder's order`);
        chk(pp(t.legs).corr===t.corr&&pd(t.legs.map(l=>({leg:l,ml:l.price})))===t.dec,`${lab}: the ${t.id} tier's chance or price is not what parlayProb and parlayDec say`);
        /* its fair chance is the builder's own sum on its legs at their fair chances (est. where one
           is), and no leg on it is one the model rates FAR_OFF or more above its fair chance */
        { const fs=t.legs.map(l=>F('legFair')(l)), FAR=w.eval('FAR_OFF');
          chk(fs.every(Boolean)?(!!t.fair&&t.fair.p===pp(t.legs.map((l,i)=>({...l,p:fs[i].p}))).corr&&t.fair.est===fs.some(f=>f.est)):(!!t.fair&&t.fair.p===null&&t.fair.miss===fs.filter(f=>!f).length),
            `${lab}: the ${t.id} tier's fair chance ${t.fair?t.fair.p:'(none)'} is not parlayProb on its legs at their fair chances`);
          chk(t.legs.every((l,i)=>!fs[i]||l.p-fs[i].p<FAR-1e-9),`${lab}: the ${t.id} tier has a leg the model rates ${FAR*100} points or more above its fair chance: ${t.legs.filter((l,i)=>fs[i]&&l.p-fs[i].p>=FAR-1e-9).map(l=>l.name+' '+l.label).join(', ')}`); }
        /* blocking: a level not marked the likeliest says on its card that it lands its floor by the model */
        if(floor&&!t.likeliest) chk(t.corr>=floor,`${lab}: the ${t.id} tier lands ${(t.corr*100).toFixed(1)}%, under its ${floor*100}% floor, and is not marked the likeliest of its size, so its card says "lands ${Math.round(floor*100)}%+" of a parlay that does not`);
        W.compose(t.thin===t.legs.filter(l=>l.thin).length,`${lab}: the ${t.id} tier miscounts its thin legs`);
        /* a level falls back to the likeliest parlay of its size only when no parlay of that size
           clears its floor at any count of thin legs (its best-return search finds none), never
           Safe; it prefers the fewest thin legs, as Safe does: as many as the preferred legs leave */
        /* a level with a total was built on every leg with an edge as its base and the totals as fill */
        const from=t.mkt?{pref:[...pool.pref,...pool.thin],thin:mkt}:{pref:pool.pref,thin:pool.thin}, fill=t.mkt?t.mkt:t.thin, kTop=t.mkt?Math.max(0,n-maxLegsOf(from.pref)):undefined;
        /* every level with totals takes exactly as many as the legs with an edge leave to fill */
        if(t.mkt) W.compose(t.mkt===kTop,`${lab}: the ${t.id} tier takes ${t.mkt} totals where the legs with an edge leave ${kTop} to fill`);
        if(t.likeliest){ likeliestSeen++;
          W.compose(!!floor,`${lab}: Safe is marked as a fallback to the likeliest pair`);
          W.compose(!!bestRet&&bestRet(SPEC.find(s=>s[0]===t.id),from,new Map(),kTop)===null,`${lab}: the ${t.id} tier fell back to the likeliest ${n} legs though a ${n}-leg parlay clears its ${floor*100}% floor`);
          W.compose(fill===Math.max(0,n-maxLegsOf(from.pref)),`${lab}: the likeliest ${n} legs take ${fill} ${t.mkt?'totals':'thin legs'} where the ${t.mkt?'legs with an edge':'preferred legs'} leave ${Math.max(0,n-maxLegsOf(from.pref))} to fill`); }
        /* the likeliest pair, and a level's likeliest of its size, worked out in full where every
           parlay is a plain product: no parlay of its size with as many thin legs lands likelier */
        if(t.likeliest||!floor){ const all=[...from.pref,...from.thin];
          if(noMovers(all)){ const b=likeliestOf(all,n,fill,!!t.mkt);
            if(b){ likeliestWorked++; combosWorked+=b.seen;
              W.compose(t.corr>=b.best-1e-12,`${lab}: the ${t.id} tier, "${ruleFor(t)}", lands ${(t.corr*100).toFixed(2)}% (${t.legs.map(l=>l.name+' '+l.label).join(', ')}) where ${orderF(b.legs).map(l=>l.name+' '+l.label).join(', ')} land ${(b.best*100).toFixed(2)}% with as many thin legs (${b.seen} parlays of ${n} worked)`); } } }
        /* a level over its floor is the best-return search's own parlay, unchanged */
        else if(floor&&bestRet){ const b=bestRet(SPEC.find(s=>s[0]===t.id),from,new Map(),kTop);
          W.compose(!!b&&b.legs.map(pbIdOf).join()===t.legs.map(pbIdOf).join(),`${lab}: the ${t.id} tier is not its best return over its floor`); }
        /* thin legs only fill what the preferred could not */
        if(t.thin&&!t.likeliest) W.compose(!bestRet||bestRet(SPEC.find(s=>s[0]===t.id),{pref:pool.pref,thin:[]},new Map())===null,`${lab}: the ${t.id} tier took a thin leg the preferred legs did not need`);
        if(!floor&&pool.pref.length>=2){ /* Safe is the likeliest pair: the two likeliest preferred legs that fit together do not beat it */
          const s=[...pool.pref].sort((a,b)=>b.p-a.p), a=s[0], b=s.slice(1).find(x=>F('pbFits')([a],x));
          if(b&&!t.thin) W.compose(t.corr>=pp([a,b]).corr-0.01,`${lab}: Safe lands ${(t.corr*100).toFixed(1)}%, under the two likeliest legs together`); }
        /* the mixes: Teams only is game bets, Players only is players' lines */
        if(!u.k.over&&!u.k.under) chk(t.legs.every(isG),`${lab}: a player leg with neither player box ticked`);
        if(!u.k.ml&&!u.k.ats&&!u.k.total) chk(!t.legs.some(isG),`${lab}: a game bet with no team box ticked`); }
      /* the card on the page says the same, and with Game total ticked one line says what a total in a tier is */
      F('renderPb')();
      { const tx=d.getElementById('pbPanel').textContent.replace(/\s+/g,' '), nt=tx.includes('Game totals have no edge: each is priced at the book’s own chance, so a level takes one only where the legs with an edge on your picks cannot make a parlay of its size, and marks it no edge.');
        W.wording(nt===!!u.k.total,`${lab}: ${u.k.total?'Game total is ticked and the panel does not say a total has no edge and only fills':'Game total is not ticked and the panel still speaks of totals'}`);
        if(u.k.total&&!u.k.ml&&!u.k.ats&&!u.k.over&&!u.k.under) W.wording(!/No line on your picks has a real sportsbook price/.test(tx),`${lab}: with only Game total ticked the panel says no line has a price the model rates at or above the book`); }
      for(const t of r.tiers){ const c=d.querySelector(`#pbPanel .pb-tier.${t.id}`); if(!c){ chk(false,`${lab}: no card for the ${t.id} tier`); continue; }
        const tx=c.textContent.replace(/\s+/g,' ');
        /* a total on a card is marked no edge, and one line says what that is; nothing else is */
        if(t.legs) chk(c.querySelectorAll('.pb-legs li').length===t.legs.length&&t.legs.every((l,i)=>/no edge/.test(c.querySelectorAll('.pb-legs li')[i].textContent)===!!l.market)
          &&/because your picks do not make a parlay of this size from legs with an edge/.test(tx)===!!t.mkt,`${lab}: the ${t.id} card does not mark its totals no edge, or its line about them is ${t.mkt?'missing':'there with no total'}`);
        if(!t.legs) W.wording(tx.includes(t.why)&&!c.querySelector('[data-pb-add]'),`${lab}: the empty ${t.id} card does not give its reason, or offers Add to builder`);
        else { const stake=w.eval("typeof pbStake==='function'?pbStake():NaN"), pay=c.querySelector('[data-pb-pay]');
          chk(c.querySelectorAll('.pb-legs li').length===t.legs.length&&tx.includes(`${(t.corr*100).toFixed(0)}%`)&&tx.includes(F('fmtML')(F('decToML')(t.dec)))
            &&!!c.querySelector(`[data-pb-add="${t.id}"]`),`${lab}: the ${t.id} card does not show its legs, chance and price`);
          chk(stake===S.stake&&payOk(pay,stake,t.dec),`${lab}: the ${t.id} card does not pay the Bet amount (${amtTxt(stake)}) times its price ${t.dec}: "${pay?[...pay.children].map(x=>x.textContent).join(' '):'no payout'}"`);
          fairShown(c,t,lab,'model');
          cardWords(c,t,lab); } }
      return r; };
    const keepU=JSON.stringify(U());
    /* the week as it is, under each mix, then one game, then none, then no bet types */
    for(const [m,ks] of [['all',KINDS],['teams',['ml','ats','total']],['players',['over','under']]]){
      d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).click();
      chk(KINDS.every(k=>U().k[k]===ks.includes(k))&&d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).classList.contains('on')&&d.querySelectorAll('#pbPanel [data-pb-mix].on').length===1,`the ${m} mix did not set its boxes, or does not show as chosen`);
      chk([...d.querySelectorAll('#pbPanel [data-pb-kind]')].every(cb=>cb.checked===ks.includes(cb.dataset.pbKind)),`the ${m} mix's boxes are not ticked to match`);
      hold('this week, '+m); }
    /* the week's spreads alone, as the owner ticked them: a level whose floor no parlay of its size
       reaches is the likeliest of that size (hold holds it to the rule) */
    setKinds(['ats']); hold('this week, spreads only');
    /* and the week's moneylines alone, and Teams only on the first four games: each a pick where a
       level may fall back, and hold works every likeliest tier out in full against every parlay of
       its size (a game's side and its total are unrelated, so every parlay is a plain product) */
    setKinds(['ml']); hold('this week, moneylines only');
    { const g4=F('pbGames')(); setKinds(['ml','ats','total']); U().off=g4.slice(4).map(g=>g.id); w.eval('PB_CACHE=new Map()');
      hold('this week, teams only, the first four games'); U().off=[]; }
    setKinds(KINDS); F('renderPb')();
    /* a box changed by hand: the mix it makes, or no mix lit at all; there is no Custom tag (the
       boxes say what is ticked) */
    d.querySelector('#pbPanel [data-pb-mix="all"]').click();
    { const cb=d.querySelector('#pbPanel [data-pb-kind="total"]'); cb.checked=false; cb.dispatchEvent(new w.Event('change'));
      const P=d.getElementById('pbPanel');
      chk(U().k.total===false&&!P.querySelector('[data-pb-mix].on')&&!P.querySelector('[data-pb-mix][aria-pressed="true"]')&&[...P.querySelectorAll('[data-pb-kind]')].every(x=>x.checked===(x.dataset.pbKind!=='total')),'unticking a box under All leaves a mix lit, or the boxes do not show it');
      chk(!P.querySelector('.pb-custom')&&!/\bCustom\b/.test(P.textContent),'a box changed by hand still shows a Custom tag beside the mix switch');
      w.eval('store.set(S)'); chk(JSON.parse(mem).ui.pb.k.total===false,'the bet types are not kept in the browser\'s own state (S.ui.pb)');
      const c2=d.querySelector('#pbPanel [data-pb-kind="total"]'); c2.checked=true; c2.dispatchEvent(new w.Event('change'));
      chk(d.querySelector('#pbPanel [data-pb-mix="all"]').classList.contains('on'),'ticking the box back does not read as All again');
      for(const k of ['over','under']){ const c=d.querySelector(`#pbPanel [data-pb-kind="${k}"]`); c.checked=false; c.dispatchEvent(new w.Event('change')); }
      chk(d.querySelector('#pbPanel [data-pb-mix="teams"]').classList.contains('on'),'the boxes of Teams only, ticked by hand, do not read as Teams only'); }
    d.querySelector('#pbPanel [data-pb-mix="all"]').click();
    const games=F('pbGames')();
    chk(d.querySelectorAll('#pbPanel [data-pb-game]').length===games.length&&games.every(g=>!F('gameStarted')(g)),'the games list is not this week\'s games still to kick off');
    if(games.length){
      /* None, then one game */
      d.querySelector('#pbPanel [data-pb-games="none"]').click();
      chk(U().off.length>=games.length&&F('getPbTiers')().tiers.every(t=>!t.legs&&/No games ticked/.test(t.why)),'None did not untick every game, or the tiers did not say no game is ticked');
      d.querySelector('#pbPanel [data-pb-games="all"]').click();
      chk(games.every(g=>!U().off.includes(g.id)),'All did not tick every game back');
      const one=games[0];
      for(const g of games.slice(1)){ const c=d.querySelector(`#pbPanel [data-pb-game="${g.id}"]`); c.checked=false; c.dispatchEvent(new w.Event('change')); }
      chk(U().off.length===games.length-1&&!U().off.includes(one.id),'unticking the games one by one did not leave one ticked');
      hold('one game');
      /* Teams only on one game: a side and its total make two legs at most, so Safe is that pair or
         says why, and every bigger level says there are too few */
      d.querySelector('#pbPanel [data-pb-mix="teams"]').click();
      const r1=hold('one game, teams only');
      chk(r1.tiers.every(t=>t.n===2&&t.legs?t.legs.filter(l=>l.stat==='total').length===1&&t.legs.filter(l=>l.stat!=='total').length===1:(!t.legs&&/^(Only [12] legs?|No legs) on your picks: tick more games or bet types\.$/.test(t.why))),'one game\'s team bets did not make at most a side and its total, or a level too big for them did not say there are too few legs: '+r1.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
      d.querySelector('#pbPanel [data-pb-games="all"]').click(); d.querySelector('#pbPanel [data-pb-mix="all"]').click(); }
    setKinds([]); { const r0=F('getPbTiers')(); chk(r0.tiers.every(t=>!t.legs&&/No bet types ticked/.test(t.why)),'with no bet type ticked the tiers did not say so'); }
    setKinds(KINDS); F('renderPb')();
    /* ---- the same on made-up lines: every player leg kind and the totals in play ---- */
    { const cw=F('currentWeek')(), keepM=JSON.stringify(PAY.mkt[String(cw)]||null), keepT=S.sched.map(g=>[g.tov,g.tou]);
      const M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{}); let nL=0;
      games.forEach((g,gi)=>{ if(gi%2===0){ g.tov=-105; g.tou=-115; } else if(gi%4===1){ g.tov=100; g.tou=100; } else { g.tov=110; g.tou=105; }
        const ro=rosterFor(g,false);
        for(const tm in ro) ro[tm].players.forEach((x,i)=>{ if(!x.starter) return;
          for(const l of statLines(x)){ if(l.prob||!(l.mu>2)) continue;
            /* every other starter's line well under his projection (an over the model likes), the rest well over it (an under) */
            const ln=(i%2?Math.floor(l.mu*1.25):Math.floor(l.mu*0.8))+0.5;
            ((M[x.pl.id]??={})[l.stat])={line:ln,over:-112,under:-108,n:x.pl.n,g:g.id}; nL++; } }); });
      w.eval('PB_CACHE=new Map()');
      for(const [m,ks] of [['all',KINDS],['teams',['ml','ats','total']],['players',['over','under']],['overs',['over']],['unders',['under']],['totals',['total']]]){ setKinds(ks); hold('made-up lines, '+m); }
      /* one game, players only: every leg of a tier shares that game, so the tier's chance and
         price are worked by the copula's draws and hold() holds them to parlayProb and parlayDec
         on correlated legs (legs from different games are a plain product, the same on any
         number of draws, so the week's own tiers cannot tell a short cut). The game is the one
         with the most made-up player lines on file */
      if(games.length){
        const plLegs=g=>F('pricedLegs')([g],true).filter(l=>!isG(l)).length;
        const g1=[...games].sort((a,b)=>(plLegs(b)-plLegs(a))||String(a.id).localeCompare(String(b.id)))[0];
        U().off=games.filter(g=>g.id!==g1.id).map(g=>g.id); setKinds(['over','under']);
        const r1=hold(`made-up lines, one game (${g1.a} @ ${g1.h}), players only`);
        corrTiers=r1.tiers.filter(t=>t.legs&&pp(t.legs).pairs.length>0).length;
        /* a game with a dozen made-up lines on starters always has two that move together */
        W.coverage(plLegs(g1)<12||corrTiers>0,`one game's made-up player lines (${plLegs(g1)} of them) built no tier with legs that move together, so nothing holds a same-game tier to parlayProb`);
        U().off=[]; }
      setKinds(KINDS);
      const rA=F('getPbTiers')();
      W.coverage(!games.length||rA.tiers.some(t=>t.legs&&t.legs.some(l=>!isG(l))),'with made-up lines on every starter no tier has a player leg');
      /* M6. lock a leg and ask for new legs, on the made-up lines: the locked leg stays on every
         turn, the rest are legs the card has not shown until it starts over, every turn keeps the
         level's rules, the card draws it and Add to builder takes it; Reset and a changed box put
         the level back */
      { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();
        const T=rA.tiers.find(t=>t.legs&&t.n>=3), idOf=F('pbId'), mlPx=F('mlProb');
        const okTier=(x,lab)=>{ const gl=x.legs.filter(isG), sd=gl.filter(l=>l.stat!=='total'), tt=gl.filter(l=>l.stat==='total'), pl=x.legs.filter(l=>!isG(l)), u=U();
          const ord=[...x.legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name))).map(l=>l.key).join();
          chk(x.legs.length===x.n&&new Set(x.legs.map(l=>l.key)).size===x.n&&new Set(sd.map(l=>l.gid)).size===sd.length&&new Set(tt.map(l=>l.gid)).size===tt.length&&new Set(pl.map(l=>l.pid)).size===pl.length,`${lab}: not ${x.n} different lines, one side and one total a game and one leg a player`);
          chk(x.legs.every(l=>!!u.k[kindOf(l)]&&!u.off.includes(l.gid)&&games.some(g=>g.id===l.gid)&&l.src==='real'&&l.p>=0.45&&l.p<0.97&&(l.market?l.stat==='total':l.p>=mlPx(l.price))),`${lab}: a leg of a kind or game not ticked, on no real price, out of 45-97%, or under the book`);
          chk(x.legs.map(l=>l.key).join()===ord&&pp(x.legs).corr===x.corr&&pd(x.legs.map(l=>({leg:l,ml:l.price})))===x.dec&&x.thin===x.legs.filter(l=>l.thin).length&&(x.mkt||0)===x.legs.filter(l=>l.market).length,`${lab}: its chance, price or counts are not the builder's own sums on its legs`); };
        W.coverage(!!T,'with made-up lines on every starter no level of three legs or more was built');
        if(T){ const cardOf=()=>d.querySelector(`#pbPanel .pb-tier.${T.id}`), lid=idOf(T.legs[0]);
          chk(cardOf().querySelectorAll('[data-pb-lock]').length===T.legs.length&&!!cardOf().querySelector(`[data-pb-turn="${T.id}"]`)&&!cardOf().querySelector('[data-pb-reset]'),`the ${T.id} card has no lock on each leg or no New legs, or offers Reset before a turn`);
          chk(!d.querySelector('#pbElo [data-pb-lock], #pbElo [data-pb-turn]'),'the Elo picks carry locks or New legs');
          cardOf().querySelector(`[data-pb-lock="${T.id}|${lid}"]`).click();
          chk(cardOf().querySelector(`[data-pb-lock="${T.id}|${lid}"]`).getAttribute('aria-pressed')==='true'&&cardOf().querySelectorAll('[data-pb-lock][aria-pressed="true"]').length===1,'the lock did not take, or took more than the one leg');
          chk(JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(T.legs.map(idOf)),'a lock alone changed the legs');
          /* the card remembers who it has shown (a player, a team, a game's total), not the line */
          const whoOf=F('pbWho'), seen=new Set(T.legs.filter(l=>idOf(l)!==lid).map(whoOf)); let turns=0, wrapped=false;
          while(turns<8&&!wrapped){ cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click(); turns++;
            const x=F('pbShownTier')(T.id); wrapped=!!w.eval(`PB_VIEW.t['${T.id}'].wrapped`);
            if(!x.legs){ chk(/unlock one/.test(x.why)&&/unlock one/.test(cardOf().textContent),`turn ${turns}: an empty turn does not say to unlock a leg`); break; }
            okTier(x,`new legs, turn ${turns}`);
            chk(x.legs.some(l=>idOf(l)===lid)&&x.turned===true,`turn ${turns}: the locked leg is not on it`);
            const fresh=x.legs.filter(l=>idOf(l)!==lid);
            if(!wrapped) chk(fresh.every(l=>!seen.has(whoOf(l))),`turn ${turns}: a player, team or total the card had shown came back before the start-over, on this line or another: ${fresh.filter(l=>seen.has(whoOf(l))).map(l=>l.name+' '+l.label).join(', ')}`);
            else chk(/back to the first/.test(cardOf().textContent),`turn ${turns}: the start-over is not said on the card`);
            fresh.forEach(l=>seen.add(whoOf(l)));
            /* a turned card says what it is: chosen from the legs left (until it starts over) beside the lock */
            const rule=cardOf().querySelector('.pb-rule').textContent;
            chk(/ beside your lock$| beside your lock that lands \d+%\+ by the model$/.test(rule)&&(wrapped||/ left /.test(rule))&&(x.likeliest||!x.floor?/^the likeliest /.test(rule):/^best return /.test(rule)),`turn ${turns}: the turned card is ruled "${rule}", not the level's rule on the legs left beside the lock`);
            if(x.mkt) chk(!/because your picks do not make a parlay/.test(cardOf().textContent)&&/here because (the legs with an edge (your picks have left for this card|on your picks) do not make a parlay of this size beside your lock|you locked)/.test(cardOf().textContent),`turn ${turns}: the totals line on the turned card does not say why they are there`);
            const li=[...cardOf().querySelectorAll('.pb-legs li')];
            chk(li.length===x.n&&x.legs.every((l,i)=>li[i].textContent.includes(l.name)&&li[i].textContent.includes(l.label))&&cardOf().querySelector('[data-pb-pay]').dataset.pbPay===String(x.dec)
              &&!!cardOf().querySelector(`[data-pb-reset="${T.id}"]`),`turn ${turns}: the card does not draw the turned legs and their price, or has no Reset`); }
          chk(turns>=1,'New legs did nothing');
          /* Add to builder takes the legs on the card */
          const x=F('pbShownTier')(T.id), keepP=JSON.stringify(S.parlay||{}), keepB=S.bookPrice;
          if(x&&x.legs){ cardOf().querySelector(`[data-pb-add="${T.id}"]`).click();
            chk(Object.keys(S.parlay).length===x.n&&x.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side),'Add to builder after New legs did not take the legs on the card'); }
          S.parlay=JSON.parse(keepP); S.bookPrice=keepB; F('save')(); F('renderParlay')();
          /* Reset, then a changed box: the level is the panel's own again */
          if(cardOf().querySelector(`[data-pb-reset="${T.id}"]`)) cardOf().querySelector(`[data-pb-reset="${T.id}"]`).click();
          chk(JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(F('getPbTiers')().tiers.find(t=>t.id===T.id).legs.map(idOf))&&!cardOf().querySelector('[data-pb-lock][aria-pressed="true"]'),'Reset did not put the level back to the panel\'s own, or kept a lock');
          cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(F('pbShownTier')(T.id).legs[0])}"]`).click(); cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
          setKinds(KINDS.filter(k=>k!=='under')); F('renderPb')(); setKinds(KINDS); F('renderPb')();
          chk(!w.eval(`PB_VIEW.t['${T.id}']`)||(!w.eval(`PB_VIEW.t['${T.id}'].tier`)&&!w.eval(`PB_VIEW.t['${T.id}'].lock.length`)),'a changed box left a turned level or a lock behind');
          const bare=()=>{ const v=w.eval(`PB_VIEW.t['${T.id}']`); return !v||(!v.tier&&!v.lock.length); };
          /* None and then All is a change of picks too, though no card is drawn under None */
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();
            cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(F('pbShownTier')(T.id).legs[0])}"]`).click(); cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
            d.querySelector('#pbPanel [data-pb-games="none"]').click(); d.querySelector('#pbPanel [data-pb-games="all"]').click();
            chk(bare()&&JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(F('getPbTiers')().tiers.find(t=>t.id===T.id).legs.map(idOf)),'ticking None and then All brought a turned level or a lock back'); }
          /* every leg locked: New legs is off and does nothing; a level of locked legs alone (which a
             kickoff can leave) is ruled as the visitor's own, never as the level's search */
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')(); const T0=F('pbShownTier')(T.id), r0=cardOf().querySelector('.pb-rule').textContent;
            for(const l of T0.legs) cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(l)}"]`).click();
            const tb=cardOf().querySelector(`[data-pb-turn="${T.id}"]`);
            chk(tb.disabled&&/unlock one/.test(tb.title),'with every leg locked New legs is not off, or does not say to unlock one');
            F('pbTurn')(T.id); F('renderPb')();
            chk(JSON.stringify(F('pbShownTier')(T.id).legs.map(idOf))===JSON.stringify(T0.legs.map(idOf))&&cardOf().querySelector('.pb-rule').textContent===r0,'New legs with every leg locked changed the level or its rule');
            const v=F('pbViewOf')(T.id); F('pbFill')(T.id,v); F('renderPb')();
            const x=F('pbShownTier')(T.id), rule=cardOf().querySelector('.pb-rule').textContent;
            chk(!!x.allLocked&&JSON.stringify(x.legs.map(idOf).sort())===JSON.stringify(T0.legs.map(idOf).sort())&&/^the (pair|\d+ legs) you locked$/.test(rule)&&cardOf().querySelector(`[data-pb-turn="${T.id}"]`).disabled,`a level of locked legs alone is ruled "${rule}", or is not the locked legs, or offers New legs`);
            /* unlock one: the card still says how the parlay was chosen, and New legs is back */
            cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(x.legs[0])}"]`).click();
            chk(cardOf().querySelector('.pb-rule').textContent===rule&&!cardOf().querySelector(`[data-pb-turn="${T.id}"]`).disabled,`after an unlock the level of locked legs is ruled "${cardOf().querySelector('.pb-rule').textContent}", or New legs is still off`); }
          /* a turn beside a lock, then the lock undone: the rule is still the one the parlay was chosen by */
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')(); const L0=F('pbShownTier')(T.id).legs[0];
            cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(L0)}"]`).click(); cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
            const r1=cardOf().querySelector('.pb-rule').textContent;
            if(F('pbShownTier')(T.id).legs){ cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(L0)}"]`).click();
              chk(/ beside your lock/.test(r1)&&cardOf().querySelector('.pb-rule').textContent===r1,`a turn beside a lock is ruled "${r1}", and "${cardOf().querySelector('.pb-rule').textContent}" once the lock is undone`); } }
          /* a game kicking off is not a change of picks: the lock on a game still to come stays and the
             level is filled again around it, with no leg on the game under way; the lock on that one falls away */
          let kicked='no leg of the level on a later kickoff than another';
          { w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();
            const gs=F('pbGames')(), ko=g=>F('kickoff')(g).getTime(), T1=F('pbShownTier')(T.id), kOf=l=>ko(gs.find(g=>g.id===l.gid));
            const first=Math.min(...T1.legs.map(kOf)), Le=T1.legs.find(l=>kOf(l)===first), Ll=T1.legs.find(l=>kOf(l)>first);
            if(Le&&Ll){
              cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(Ll)}"]`).click(); cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(Le)}"]`).click();
              const now0=w.Date.now, off=first+60e3-now0.call(w.Date); w.Date.now=()=>now0.call(w.Date)+off; F('renderPb')();
              const on=new Set(F('pbGames')().map(g=>g.id)), v=w.eval(`PB_VIEW.t['${T.id}']`), x=F('pbShownTier')(T.id);
              chk(!!v&&v.lock.length===1&&idOf(v.lock[0])===idOf(Ll)&&!!x.legs&&x.legs.length===T1.legs.length&&x.legs.some(l=>idOf(l)===idOf(Ll))&&x.legs.every(l=>on.has(l.gid))
                &&cardOf().querySelector(`[data-pb-lock="${T.id}|${idOf(Ll)}"]`).getAttribute('aria-pressed')==='true'&&/ beside your lock/.test(cardOf().querySelector('.pb-rule').textContent),
                `a kickoff dropped the lock on a game still to come, kept the one on the game under way, or did not fill the level again around it: ${x.legs?x.legs.map(l=>l.name+' '+l.label).join(', '):x.why}`);
              if(x.legs) okTier(x,'filled again after a kickoff');
              w.Date.now=now0; F('renderPb')();
              /* New legs pressed in the half minute after a kickoff, before the page has redrawn: the
                 panel is redrawn without the game and nothing is turned */
              { const seen0=(w.eval(`PB_VIEW.t['${T.id}']`)||{seen:[]}).seen.length;
                w.Date.now=()=>now0.call(w.Date)+off; chk(!!w.eval('pbStale()'),'the panel drawn before a kickoff is not stale after it');
                cardOf().querySelector(`[data-pb-turn="${T.id}"]`).click();
                const on1=F('pbGames')().map(g=>g.id), v1=w.eval(`PB_VIEW.t['${T.id}']`)||{seen:[]};
                chk(v1.seen.length===seen0&&w.eval('PB_SHOWN')===on1.join()&&!w.eval('pbStale()')&&F('getPbTiers')().tiers.every(t=>!t.legs||F('pbShownTier')(t.id).legs.every(l=>on1.includes(l.gid))),
                  `New legs pressed on a panel drawn before a kickoff turned the level (${seen0} seen, now ${v1.seen.length}) or did not redraw it without the game`);
                w.Date.now=now0; F('renderPb')(); }
              kicked=`a kickoff kept the lock on ${Ll.name} and dropped the one on ${Le.name}, and a click before the redraw only redrew`; } }
          w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')();
          /* a small pick runs out and starts over: Teams only on three games, Safe turned until no
             unshown leg is left, every turn a valid pair */
          let nW=0, wr=false;
          { const g3=F('pbGames')(); setKinds(['ml','ats','total']); U().off=g3.slice(3).map(g=>g.id); w.eval('PB_CACHE=new Map(); PB_VIEW={sig:null,t:{}}'); F('renderPb')();
            if(F('getPbTiers')().tiers.find(t=>t.id==='safe'&&t.legs)){
              const sw=new Set(F('pbShownTier')('safe').legs.map(whoOf));
              while(nW<40&&!wr){ d.querySelector('#pbPanel [data-pb-turn="safe"]').click(); nW++; wr=!!w.eval("PB_VIEW.t['safe']&&PB_VIEW.t['safe'].wrapped");
                const x=F('pbShownTier')('safe'), c=d.querySelector('#pbPanel .pb-tier.safe'); if(!x||!x.legs) continue;
                okTier(x,`Safe on three games, turn ${nW}`);
                chk(c.querySelector('.pb-rule').textContent===(wr?'the likeliest pair':'the likeliest pair left'),`Safe on three games, turn ${nW}: ruled "${c.querySelector('.pb-rule').textContent}"`);
                if(!wr) chk(x.legs.every(l=>!sw.has(whoOf(l))),`Safe on three games, turn ${nW}: a team or total it had shown came back before the start-over`);
                if(x.mkt&&!wr) chk(/here because the legs with an edge your picks have left for this card do not make a parlay of this size\./.test(c.textContent),`Safe on three games, turn ${nW}: the totals line does not say the legs with an edge left do not make the pair`);
                x.legs.forEach(l=>sw.add(whoOf(l))); }
              chk(wr&&/back to the first/.test(d.querySelector('#pbPanel .pb-tier.safe').textContent),`Safe on three games never started over in ${nW} turns, or did not say so`); }
            U().off=[]; setKinds(KINDS); w.eval('PB_CACHE=new Map(); PB_VIEW={sig:null,t:{}}'); F('renderPb')(); }
          console.log(`M6. lock and new legs: ${turns} turns of the ${T.label} level, the locked leg on each, ${seen.size} players, teams and totals seen${wrapped?', then back to the first':''}; Safe on three games started over after ${nW} turns; ${kicked}`); }
        w.eval('PB_VIEW={sig:null,t:{}}'); F('renderPb')(); }
      chk(!F('pricedLegs')(games,true).some(l=>l.stat==='total')&&!F('pricedLegs')(games).some(l=>l.stat==='total'),'a game total is among the legs the game pages\' hands or the Elo picks are built from');
      /* only Game total ticked, every total priced (-105/-115, +100/+100 with no margin, +110/+105
         with less than none): every level a game makes legs for is built, of totals only, each a
         market leg; under All on the same prices the legs with an edge fill every level, so no total */
      { setKinds(['total']); const rT=F('getPbTiers')(), nT=new Set(F('pbPool')(games).mkt.map(l=>l.gid)).size;
        chk(rT.tiers.every(t=>t.n>nT?!t.legs:(!!t.legs&&t.legs.every(l=>l.stat==='total'&&l.market)&&t.mkt===t.n&&!t.thin)),
          'with only Game total ticked and every total priced, a level was not built of totals alone: '+rT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
        hold('made-up lines, Game total alone');
        setKinds(KINDS); const rAll=F('getPbTiers')();
        chk(rAll.tiers.every(t=>!t.legs||!t.mkt||F('pbTier')(SPEC.find(s=>s[0]===t.id),{...F('pbPool')(games),mkt:[]},new Map())===null),'under All a level took a total though the legs with an edge make it'); }
      /* a total never stands where a leg with an edge could (the second review's case): two thin
         moneylines on two games and three totals at -120, both moneylines and one total landing
         22%, under Medium's 25%, where one moneyline and two totals clear it. Medium and Aggressive
         keep both moneylines and take only the totals left to fill */
      { const wk=F('currentWeek')(), mk=(g,o)=>({gid:g,week:wk,k:0,main:true,src:'real',grp:'TEAM',pos:'Game',...o});
        const thinL=[mk('gA',{key:'gA|team:AAA|ml',pid:'team:AAA',stat:'ml',side:'over',team:'AAA',name:'AAA',label:'To win',p:0.93,price:-1000,thin:true}),
          mk('gB',{key:'gB|team:BBB|ml',pid:'team:BBB',stat:'ml',side:'over',team:'BBB',name:'BBB',label:'To win',p:0.46,price:130,thin:true})];
        const tots=['gA','gB','gC'].map(g=>mk(g,{key:g+'|game|total',pid:'game',stat:'total',side:'over',k:44.5,team:'X'+g,name:g+' total',label:'Over 44.5 points',p:0.5217,price:-120,thin:false,market:true}));
        for(const id of ['med','aggr']){ const s=SPEC.find(x=>x[0]===id), r=F('pbTier')(s,{pref:[],thin:thinL,mkt:tots},new Map());
          chk(!!r&&r.legs.filter(l=>l.stat==='ml').length===2&&r.mkt===s[2]-2,`a total took the place of a moneyline with an edge on the ${id} level: ${r?r.legs.map(l=>l.name+' '+l.label).join(', '):'none'}`); } }
      /* market + form gates the player legs once the Elo tab is on the page */
      w.eloLoaded=()=>false; w.eval('PB_CACHE=new Map()');
      chk(F('getPbTiers')().tiers.every(t=>!t.legs||t.legs.every(isG)),'before the Elo files load a player leg is suggested');
      w.eloLoaded=()=>true; w.eloAltP=()=>0.01; w.eval('PB_CACHE=new Map()');
      chk(F('pbPool')(games).pref.every(isG),'a player leg market + form rates under the book is not marked thin');
      hold('market + form against every player leg');
      delete w.eloAltP; delete w.eloLoaded; w.eval('PB_CACHE=new Map()');
      /* Add to builder: exactly the tier's legs, priced as the tier was */
      const t=F('getPbTiers')().tiers.filter(x=>x.legs).slice(-1)[0];
      if(t){ const keepP=JSON.stringify(S.parlay||{}), keepB=S.bookPrice, keepS=S.stake; S.parlay={'stale|p|x':{gid:'stale',pid:'p',stat:'x',k:1,side:'over',name:'Stale',week:cw,p:0.5,price:-110}}; F('renderParlay')();
        /* an amount of the visitor's own in the box: the tier pays on it, and Add to builder leaves it in the builder */
        const box=d.getElementById('pbStake');
        chk(!!box,'the suggested parlays have no Bet amount box');
        if(box){ box.value='37.5'; box.dispatchEvent(new w.Event('input')); box.dispatchEvent(new w.Event('change')); }
        chk(S.stake===37.5&&payOk(d.querySelector(`#pbPanel [data-pb-tier="${t.id}"] [data-pb-pay]`),37.5,t.dec),`the ${t.id} tier does not pay $37.50 times its price once $37.50 is typed in the Bet amount box`);
        d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`).click();
        const keys=Object.keys(S.parlay);
        chk(keys.length===t.legs.length&&t.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side&&!!S.parlay[l.key].main===!!l.main),'Add to builder did not put exactly the tier\'s legs in the builder');
        const body=d.getElementById('parlayBody').textContent.replace(/\s+/g,' '), pS=d.getElementById('pStake'), po=d.querySelector('#parlayBody .payout');
        chk(body.includes(`${t.legs.length}-leg parlay`)&&body.includes((t.corr*100).toFixed(1)+'%'),'the builder does not show the tier\'s chance after Add to builder');
        chk(S.stake===37.5&&!!pS&&pS.value==='37.50'&&!!po&&po.textContent==='$'+(37.5*t.dec).toFixed(2),`Add to builder did not carry the Bet amount: the builder is on ${pS?pS.value:'no stake'} and pays ${po?po.textContent:'nothing'}, the tier $${(37.5*t.dec).toFixed(2)} on $37.50`);
        chk(/In the builder/.test(d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`).textContent),'the tier does not say it is in the builder');
        S.parlay=JSON.parse(keepP); S.bookPrice=keepB; S.stake=keepS; F('save')(); F('renderParlay')(); }
      /* a game that kicks off leaves the list and every tier */
      if(games.length>1){ const g0=games[0], k0=F('kickoff')(g0).getTime(), off=k0+60e3-Date.now(), now0=w.Date.now;
        w.Date.now=()=>now0.call(w.Date)+off; F('renderParlay')();
        chk(!d.querySelector(`#pbPanel [data-pb-game="${g0.id}"]`)&&F('getPbTiers')().tiers.every(x=>!x.legs||x.legs.every(l=>l.gid!==g0.id)),'a game that has kicked off is still on the list or in a tier');
        w.Date.now=now0; F('renderParlay')();
        chk(!!d.querySelector(`#pbPanel [data-pb-game="${g0.id}"]`),'the game did not come back with the clock'); }
      if(keepM==='null') delete PAY.mkt[String(cw)]; else PAY.mkt[String(cw)]=JSON.parse(keepM);
      S.sched.forEach((g,i)=>{ g.tov=keepT[i][0]; g.tou=keepT[i][1]; if(g.tov==null) delete g.tov; if(g.tou==null) delete g.tou; });
      w.eval('PB_CACHE=new Map()');
      console.log(`M. suggested parlays: ${built} tiers built and ${said} that said why, ${legsSeen} legs, ${thinSeen} thin, ${corrTiers} of one game's tiers on legs that move together, over this week's ${games.length} games and ${nL} made-up player lines`); }
    /* the thin-edge line says, for each kind of leg it is on, what it lacked: a team bet has no
       market + form (a player leg's second price), so it never reads as wanting it (a game total
       is never thin: pbMktLine speaks for it) */
    { const C=F('pbTierCard'), base={gid:'gT',name:'Thin',label:'a leg',price:-110,p:0.53,week:F('currentWeek')(),thin:true,side:'over',k:0,main:false};
      const tm={...base,key:'gT|team:AAA|ml',pid:'team:AAA',stat:'ml',grp:'TEAM'}, pl={...base,key:'gT|p1|receiving_yards',pid:'p1',stat:'receiving_yards',grp:'WR'};
      const line=legs=>{ const x=d.createElement('div'); x.innerHTML=C({id:'safe',label:'Safe',n:legs.length,floor:0,legs,corr:0.3,dec:3,thin:legs.filter(l=>l.thin).length});
        const p=x.querySelector('.pb-thin'); return p?p.textContent.replace(/\s+/g,' '):''; };
      const MF=/market \+ form/;
      const cases=[];
      for(const form of [false,true]){
        if(form) w.eloLoaded=()=>true; else delete w.eloLoaded;
        cases.push([`form ${form?'on':'off'}, a team bet`,line([tm]),t=>/^One leg has a thin edge: .*but not 3 points above\.$/.test(t)&&!MF.test(t)]);
        cases.push([`form ${form?'on':'off'}, two team bets`,line([tm,{...tm,key:'gU|team:BBB|ats',gid:'gU',stat:'ats'}]),t=>/^2 legs have a thin edge: the model rates them .*but not 3 points above\.$/.test(t)&&!MF.test(t)]);
        cases.push([`form ${form?'on':'off'}, a player leg`,line([pl]),t=>form?/but not 3 points above with market \+ form agreeing\.$/.test(t):(/but not 3 points above\.$/.test(t)&&!MF.test(t))]);
        cases.push([`form ${form?'on':'off'}, a team bet and a player leg`,line([tm,pl]),t=>form?/the team bet not 3 points above, and the player leg not 3 points above with market \+ form agreeing\.$/.test(t):(/but not 3 points above\.$/.test(t)&&!MF.test(t))]);
        cases.push([`form ${form?'on':'off'}, a team bet and two player legs`,line([tm,pl,{...pl,key:'gT|p2|receptions',pid:'p2',stat:'receptions'}]),t=>form?/the team bet not 3 points above, and the player legs not 3 points above with market \+ form agreeing\.$/.test(t):!MF.test(t)]);
        cases.push([`form ${form?'on':'off'}, no thin leg`,line([{...tm,thin:false},{...pl,thin:false}]),t=>t==='']); }
      delete w.eloLoaded; w.eval('PB_CACHE=new Map()');
      for(const [lab,t,ok] of cases) chk(ok(t),`the thin-edge line, ${lab}, reads: "${t}"`);
      console.log(`M2. thin edge: the line under a tier named for each kind of leg, ${cases.length} cases (a team bet never wants market + form)`); }
    /* no player prices on file yet (before the week's pulls): Players only says so on every tier,
       and so does a mix with team bets where a tier cannot be filled; the note does not repeat it */
    if(games.length){ const cw=F('currentWeek')(), keepO=JSON.stringify(S.odds||{}), keepM=JSON.stringify(PAY.mkt[String(cw)]||null);
      for(const g of games){ if(S.odds) delete S.odds[g.id]; }
      delete PAY.mkt[String(cw)]; U().off=[];
      setKinds(['over','under']); const rP=hold('no player prices, players only'); F('renderPb')();
      const tx=d.getElementById('pbPanel').textContent.replace(/\s+/g,' ');
      chk(!F('pricedLegs')(games,true).some(l=>!isG(l))&&rP.noPlayerPrices&&rP.tiers.every(t=>!t.legs&&t.why===NO_PL),
        'with no player price on file, Players only does not say so on every tier: '+rP.tiers.map(t=>t.why).join(' / '));
      chk(!/tick more/.test(tx)&&!/No line on your picks has a real sportsbook price/.test(tx),'with no player price on file, Players only still says to tick more, or repeats it in the note');
      setKinds(KINDS); const rA=hold('no player prices, all');
      chk(rA.noPlayerPrices&&rA.tiers.every(t=>t.legs?t.legs.every(isG):t.why.endsWith(', and '+noPlLow)),'with no player price on file, All builds a player leg, or an empty tier does not say no player prices are on file: '+rA.tiers.map(t=>t.why||'built').join(' / '));
      /* a level built with no player price on file says nothing of the missing player legs, so the
         panel does, whenever one is built; and player bets with Game total build their levels from
         the totals, with that note */
      const PL_NOTE='Player prices are not in yet for your picks, so the tiers below are built without player legs: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
      F('renderPb')(); chk(d.getElementById('pbPanel').textContent.replace(/\s+/g,' ').includes(PL_NOTE)===rA.tiers.some(t=>t.legs),'with no player price on file and All ticked, the note that the tiers are built without player legs is missing, or shows with no tier built');
      /* a level needs two legs, so only where two or more games have a priced total (a one-game
         Monday has one, and builds nothing) */
      setKinds(['over','under','total']); const rPT=hold('no player prices, player bets and Game total'), nTot=new Set(F('pbPool')(games).mkt.map(l=>l.gid)).size; F('renderPb')();
      chk((nTot<2||rPT.tiers.some(t=>t.legs))&&rPT.tiers.every(t=>!t.legs||t.legs.every(l=>l.market))&&d.getElementById('pbPanel').textContent.replace(/\s+/g,' ').includes(PL_NOTE)===rPT.tiers.some(t=>t.legs),
        'with no player price on file, player bets and Game total do not build their levels from the totals with the note that player prices are not in yet: '+rPT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
      setKinds(KINDS);
      /* All on one game: its team bets make two legs at most (a side and its total), so only Safe
         can be built, and every bigger level says both why: too few legs, and no player prices yet */
      U().off=games.slice(1).map(g=>g.id); w.eval('PB_CACHE=new Map()'); const r1=hold('no player prices, all, one game');
      chk(r1.tiers.every(t=>t.n===2&&t.legs?t.legs.every(isG):(!t.legs&&/^(Only [12] legs?|No legs) on your picks, and /.test(t.why)&&t.why.endsWith(', and '+noPlLow))),
        'with no player price on file, All on one game does not give both reasons on every tier: '+r1.tiers.map(t=>t.why||'built').join(' / '));
      U().off=[];
      S.odds=JSON.parse(keepO); if(keepM==='null') delete PAY.mkt[String(cw)]; else PAY.mkt[String(cw)]=JSON.parse(keepM);
      w.eval('PB_CACHE=new Map()'); F('renderPb')();
      console.log(`M3. no player prices yet: Players only says so on all 4 tiers; All ${rA.tiers.filter(t=>t.legs).length} built on team bets, ${rA.tiers.filter(t=>!t.legs).length} saying why; All on one game gives both reasons on all 4`); }
    /* M4. every level shows a parlay of its size whenever the picks make that many legs. Held on
       made-up games standing in for the week's (pbGames and pricedLegs stood in for), so it holds
       on any day of the week, a lone Monday game included: ten games to come with only Spread
       ticked, as the owner had it. Eight have a preferred cover, priced so that the likeliest legs
       and the best-paying ones are not the same: four the model rates 57% to 58.5% at -115 (3.5 to
       5 points over the price) on the odd games, four it rates 46.5% to 48% at +140 (4.8 to 6.3
       points over) on the even ones, so a fallback chosen by the best return under the floor, or
       by the first games on the list, takes other legs than the likeliest. Two more are thin, 59%
       and 58.8% at -135 (under 2 points over), likelier than any preferred leg. Every game has a
       moneyline at 75% that must never show (Moneyline is not ticked), and one cover is under the
       book. So three legs land at most 20.3% and four 11.8% at any count of thin legs, short of
       Medium's 25% and Aggressive's 12%, and the four likeliest preferred with the best-paying
       +140 land 5.3%, over Extreme's 5%. Each tier is held to a brute force over every parlay of
       its size on the pool, worked with the builder's own sums (legs in different games: a plain
       product, exact): Safe the likeliest pair; Medium and Aggressive the likeliest of their size
       with the fewest thin legs (the three and four likeliest -115 covers, 19.5% and 11.1%, though
       thin legs would land likelier and the +140 covers would return more), marked likeliest and
       ruled "the likeliest N legs" with no note, no parlay of their size clearing the floor;
       Extreme its best return over 5%, as before. Then three games ticked (Aggressive and Extreme
       too few legs, the only empties), and two preferred with two thin (the likeliest take as few
       thin legs as fill them). */
    { const cw=F('currentWeek')(), keepU4=JSON.stringify(U());
      w.__m4Keep=w.eval('[pbGames, pricedLegs]');
      const G=Array.from({length:10},(_,i)=>({id:`2099_${String(cw).padStart(2,'0')}_A${i}_H${i}`,w:cw,a:'A'+i,h:'H'+i,d:`2099-01-0${1+(i%7)}`,t:'13:00'}));
      const leg=(g,team,stat,p,price)=>({key:`${g.id}|team:${team}|${stat}`,gid:g.id,pid:'team:'+team,stat,k:stat==='ml'?0:-3.5,side:'over',main:false,p,price,src:'real',mu:null,
        name:'Made-up '+team,pos:'Game',grp:'TEAM',team,opp:team===g.h?g.a:g.h,week:cw,label:stat==='ml'?'To win':'To cover -3.5'});
      /* each game's cover: the model's chance and the price (the even games pay more, the odd are likelier, the last two thin) */
      const COVER=[[0.48,140],[0.585,-115],[0.475,140],[0.58,-115],[0.47,140],[0.575,-115],[0.465,140],[0.57,-115],[0.59,-135],[0.588,-135]];
      w.__m4Games=G;
      w.__m4Legs=[...G.map((g,i)=>leg(g,g.h,'ats',COVER[i][0],COVER[i][1])),...G.map(g=>leg(g,g.a,'ml',0.75,-150)),leg(G[1],G[1].a,'ats',0.50,-150)];
      w.eval('pbGames=function(){ return window.__m4Games; }; pricedLegs=function(games){ return window.__m4Legs.filter(l=>(games||[]).some(g=>g.id===l.gid)).map(l=>({...l})); };');
      const fits=F('pbFits'), order=F('pbOrder');
      const combos=(list,n)=>{ const out=[], rec=(i0,cur)=>{ if(cur.length===n){ out.push(cur.slice()); return; }
        for(let i=i0;i<list.length;i++){ if(!fits(cur,list[i])) continue; cur.push(list[i]); rec(i+1,cur); cur.pop(); } }; rec(0,[]); return out; };
      /* every parlay of n legs on the pool, worked as the builder works it: the likeliest with the
         fewest thin legs, the likeliest of all, how many clear the floor, and the best return of
         those with the fewest thin legs (the floor search's own order) */
      const brute=(pool,n,floor)=>{ const all=combos([...pool.pref,...pool.thin],n).map(c=>{ const L=order(c), pr=pp(L).corr, dec=pd(L.map(l=>({leg:l,ml:l.price})));
          return {pr,ev:pr*dec,thin:L.filter(l=>l.thin).length}; });
        const k=Math.min(...all.map(c=>c.thin)), clear=all.filter(c=>c.pr>=floor), kc=Math.min(...clear.map(c=>c.thin));
        return {n:all.length,k,likeliest:Math.max(...all.filter(c=>c.thin===k).map(c=>c.pr)),best:Math.max(...all.map(c=>c.pr)),clear:clear.length,
          bestRet:clear.length?Math.max(...clear.filter(c=>c.thin===kc).map(c=>c.ev)):null}; };
      const seen=[];
      const run4=(lab,off,want)=>{ U().k={ml:false,ats:true,total:false,over:false,under:false}; U().off=off.map(i=>G[i].id); w.eval('PB_CACHE=new Map()');
        const r=F('getPbTiers')(), pool=F('pbPool')(G.filter(g=>!U().off.includes(g.id))), m=maxLegsOf([...pool.pref,...pool.thin]);
        chk(pool.pref.concat(pool.thin).every(l=>l.stat==='ats'&&l.p>=F('mlProb')(l.price)),`${lab}: a moneyline (not ticked) or a cover under the book is among the legs`);
        F('renderPb')(); const P=d.getElementById('pbPanel');
        for(const t of r.tiers){ const [,,n,floor]=SPEC.find(s=>s[0]===t.id), c=P.querySelector(`.pb-tier.${t.id}`), got=t.legs?(t.likeliest?'likeliest':floor?'floor':'pair'):'empty';
          chk(got===want[t.id],`${lab}: the ${t.id} tier is ${got}, not ${want[t.id]}${t.why?': '+t.why:''}`);
          if(!t.legs){ chk(m<n&&t.why===`Only ${m} legs on your picks: tick more games or bet types.`&&!!c&&c.textContent.includes(t.why),`${lab}: the ${t.id} tier is empty with ${m} legs on the picks for its ${n}: ${t.why}`); continue; }
          const b=brute(pool,n,floor), tol=1e-12; seen.push(`${t.id} ${(t.corr*100).toFixed(1)}%${t.likeliest?' (likeliest)':''}`);
          chk(t.legs.length===n&&t.legs.every(l=>l.stat==='ats'&&!U().off.includes(l.gid))&&pp(t.legs).corr===t.corr&&pd(t.legs.map(l=>({leg:l,ml:l.price})))===t.dec,
            `${lab}: the ${t.id} tier is not ${n} ticked covers at the builder's own chance and price`);
          if(!floor) chk(!t.likeliest&&t.thin===b.k&&t.corr>=b.likeliest-tol,`${lab}: Safe lands ${(t.corr*100).toFixed(2)}% with ${t.thin} thin, not the likeliest pair (${(b.likeliest*100).toFixed(2)}% with ${b.k} thin)`);
          else if(t.likeliest) chk(b.clear===0&&t.thin===b.k&&t.corr>=b.likeliest-tol,
            `${lab}: the ${t.id} tier fell back to ${(t.corr*100).toFixed(2)}% with ${t.thin} thin legs: ${b.clear} of ${b.n} ${n}-leg parlays clear ${floor*100}%, the likeliest with ${b.k} thin lands ${(b.likeliest*100).toFixed(2)}%`);
          else chk(t.corr>=floor&&t.corr*t.dec>=b.bestRet-tol,`${lab}: the ${t.id} tier is not the best return over ${floor*100}% (${(t.corr*t.dec).toFixed(4)} against ${b.bestRet})`);
          if(t.likeliest) chk(b.best<floor,`${lab}: a ${n}-leg parlay lands ${(b.best*100).toFixed(2)}%, over the ${t.id} floor, and the tier fell back`);
          chk(!!c&&c.querySelectorAll('.pb-legs li').length===n&&c.textContent.includes(`${(t.corr*100).toFixed(0)}%`)&&c.textContent.includes(F('fmtML')(F('decToML')(t.dec))),`${lab}: the ${t.id} card does not show its legs, chance and price`);
          if(c) cardWords(c,t,lab); }
        /* the same picks always give the same parlays */
        w.eval('PB_CACHE=new Map()'); const r2=F('getPbTiers')();
        chk(r2.tiers.map(t=>t.legs?t.legs.map(pbIdOf).join():t.why).join('~')===r.tiers.map(t=>t.legs?t.legs.map(pbIdOf).join():t.why).join('~'),`${lab}: the same picks built other parlays the second time`);
        return {r,P}; };
      const A=run4('ten made-up games, Spread only',[],{safe:'pair',med:'likeliest',aggr:'likeliest',xtrm:'floor'});
      chk(['med','aggr'].every(id=>{ const t=A.r.tiers.find(x=>x.id===id); return t&&t.legs&&!t.thin; }),'ten made-up games: the likeliest 3 or 4 legs took a thin leg the preferred legs did not need');
      /* the likeliest 3 and 4 are the -115 covers on the odd games; the made-up prices do what they
         are for: the best return of each size, under the floor, is the +140 covers instead, so a
         fallback chosen by return (or by the first games on the list) cannot pass for the likeliest */
      { const poolA=F('pbPool')(G), teams=c=>c.map(l=>l.team).sort().join();
        for(const [id,n,want] of [['med',3,'H1,H3,H5'],['aggr',4,'H1,H3,H5,H7']]){ const t=A.r.tiers.find(x=>x.id===id);
          chk(!!t&&!!t.legs&&teams(t.legs)===want&&Math.abs(t.corr-t.legs.reduce((a,l)=>a*l.p,1))<1e-12,`ten made-up games: ${id} is ${t&&t.legs?teams(t.legs):'empty'}, not the likeliest covers ${want}`);
          const byRet=combos(poolA.pref,n).map(c=>({c,ev:c.reduce((a,l)=>a*l.p*F('mlToDec')(l.price),1)})).sort((a,b)=>b.ev-a.ev)[0];
          chk(!!byRet&&teams(byRet.c)!==want,`ten made-up games: the best-paying ${n} covers are the likeliest too (${byRet?teams(byRet.c):'none'}), so the case cannot tell a fallback by return from the likeliest`); } }
      chk(/where none of that size gets there, the likeliest of that size/.test((A.P.querySelector('.pb-foot')||{}).textContent||''),'the panel\'s footer does not say a level with no parlay over its floor shows the likeliest of its size');
      run4('three made-up games, Spread only',[3,4,5,6,7,8,9],{safe:'pair',med:'likeliest',aggr:'empty',xtrm:'empty'});
      const C=run4('two preferred and two thin, Spread only',[2,3,4,5,6,7],{safe:'pair',med:'likeliest',aggr:'likeliest',xtrm:'empty'});
      chk(C.r.tiers.filter(t=>t.legs).map(t=>t.thin).join()==='0,1,2','two preferred and two thin: the likeliest take more thin legs than fill them: '+C.r.tiers.filter(t=>t.legs).map(t=>t.id+' '+t.thin).join(', '));
      w.eval('pbGames=window.__m4Keep[0]; pricedLegs=window.__m4Keep[1]; PB_CACHE=new Map();'); delete w.__m4Keep; delete w.__m4Games; delete w.__m4Legs;
      S.ui.pb=JSON.parse(keepU4); F('renderPb')();
      console.log(`M4. every level a parlay: ten made-up games, Spread only: ${seen.slice(0,4).join(', ')}; three games: Aggressive and Extreme empty for too few legs; two preferred and two thin: the likeliest take 1 and 2 thin legs; ${likeliestSeen} tiers of the week's own picks fell back to the likeliest; ${likeliestWorked} likeliest tiers (Safe's pair included) worked out in full against ${combosWorked} parlays of their size`); }
    /* with no game to come the panel says so and offers nothing: the regular season over, or every game of the week under way */
    { w.__pbKeep=w.eval('[pbGames, seasonOver]');
      w.eval('pbGames=function(){ return []; }; seasonOver=function(){ return true; }; renderParlay();');
      chk(/regular season is over: no game is left/.test(panel.textContent)&&!panel.querySelector('[data-pb-mix],.pb-tier,[data-pb-add]'),'with the season over the panel does not say so, or still offers something');
      w.eval('seasonOver=function(){ return false; }; renderParlay();');
      chk(/has kicked off, so there is nothing left to build from/.test(panel.textContent),'with every game of the week under way the panel does not say so');
      w.eval('pbGames=window.__pbKeep[0]; seasonOver=window.__pbKeep[1];'); delete w.__pbKeep; }
    S.ui.pb=JSON.parse(keepU); F('save')(); F('renderParlay')(); } }

  /* ---- M7. the book's fair chance, and legs far off it ----
     A leg's fair chance is DraftKings' own: where both sides of its line are priced (a player's main
     line, a game's two moneylines or spread prices on the leg's number, the total's over and under),
     that side's no-vig chance; where one side is, the price's implied chance over the week's median
     overround on two-sided lines of its kind (every kind where the week has none of its own), marked
     est.; with no real price, none. Worked here on its own from the payload and held, on made-up lines,
     to legFair; a parlay's is parlayProb on its legs at their fair chances (legs in one game moving
     together). Then, on made-up lines built so that some legs are FAR_OFF (15 points) or more above
     their fair chance and some are not: no such leg in the panel's pool, its count the panel's note,
     none on a level or a game page's hand, each flagged on the game page and in the builder, and the
     builder's summary leading with the fair chance. Holds on any week: a lean one, one game left, no
     player prices of its own (the made-up lines stand in for them). */
  { const cw=F('currentWeek')(), FAR=w.eval('FAR_OFF'), LF=F('legFair'), PF=F('parlayFair'), pp=F('parlayProb'), isG=F('isGameLeg'), toML=F('probToAmerican');
    const imp=a=>a>0?100/(a+100):-a/(-a+100), px=v=>v!=null&&isFinite(v)&&v!==0, nv=(a,b)=>imp(a)/(imp(a)+imp(b)), near=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<1e-12;
    const med=a=>{ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
    /* the week's typical overround on its two-sided lines, by kind and over all of them */
    const vig=wk=>{ const by={player:[],ml:[],ats:[],total:[]}, M=PAY.mkt[String(wk)]||{};
      for(const pid in M) for(const st in M[pid]){ const L=M[pid][st]; if(L&&px(L.over)&&px(L.under)) by.player.push(imp(L.over)+imp(L.under)); }
      for(const g of S.sched.filter(g=>String(g.w)===String(wk))){ if(px(g.mla)&&px(g.mlh)) by.ml.push(imp(g.mla)+imp(g.mlh));
        if(g.sp!=null&&isFinite(g.sp)&&px(g.spa)&&px(g.sph)) by.ats.push(imp(g.spa)+imp(g.sph));
        if(g.tot!=null&&isFinite(g.tot)&&px(g.tov)&&px(g.tou)) by.total.push(imp(g.tov)+imp(g.tou)); }
      const o={all:med([...by.player,...by.ml,...by.ats,...by.total])}; for(const k in by) o[k]=med(by[k]); return o; };
    /* a leg's fair chance by the rule, on the price the builder gives it (legPrice) */
    const fairOf=l=>{ const lp=F('legPrice')(l); if(!lp||lp.src!=='real'||!px(lp.ml)) return null;
      const g=S.sched.find(x=>x.id===l.gid), u=l.side==='under';
      if(l.stat==='total'){ if(g&&g.tot!=null&&+l.k===+g.tot&&px(g.tov)&&px(g.tou)) return {p:u?nv(g.tou,g.tov):nv(g.tov,g.tou),est:false}; }
      else if(l.stat==='ml'||l.stat==='ats'){ if(g&&(l.team===g.h||l.team===g.a)){ const h=l.team===g.h, own=l.stat==='ml'?(h?g.mlh:g.mla):(h?g.sph:g.spa), oth=l.stat==='ml'?(h?g.mla:g.mlh):(h?g.spa:g.sph);
        if((l.stat==='ml'||(g.sp!=null&&+l.k===(h?-g.sp:+g.sp)))&&px(own)&&px(oth)) return {p:nv(own,oth),est:false}; } }
      else if(l.main){ const x=((PAY.mkt[String(l.week)]||{})[l.pid]||{})[l.stat]; if(x&&+x.line===+l.k&&px(x.over)&&px(x.under)) return {p:u?nv(x.under,x.over):nv(x.over,x.under),est:false}; }
      const V=vig(l.week), ov=V[isG(l)?l.stat:'player']||V.all; return ov>0?{p:Math.max(0.001,Math.min(0.999,imp(lp.ml)/ov)),est:true}:null; };
    const gap=l=>{ const f=fairOf(l); return f?l.p-f.p:null; }, isFar=l=>{ const x=gap(l); return x!=null&&x>=FAR-1e-9; };
    const g0=S.sched.filter(g=>+g.w===cw).sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0];
    const keepM=JSON.stringify(PAY.mkt[String(cw)]||null), keepO=JSON.stringify(S.odds||{}), KF=['sp','tot','mla','mlh','spa','sph','tov','tou'], keepG=S.sched.map(g=>KF.map(k=>g[k]));
    const restore=()=>{ if(keepM==='null') delete PAY.mkt[String(cw)]; else PAY.mkt[String(cw)]=JSON.parse(keepM); S.odds=JSON.parse(keepO);
      S.sched.forEach((g,i)=>KF.forEach((k,j)=>{ if(keepG[i][j]===undefined) delete g[k]; else g[k]=keepG[i][j]; })); w.eval('PB_CACHE=new Map(); GAME_TIER_CACHE={}'); };
    let ruleCases=0;
    try{
      /* ---- the rule, one leg at a time, on made-up prices for a game of the week ---- */
      const M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{});
      M['audit-p1']={receptions:{line:4.5,over:-130,under:110,n:'Audit One',g:g0.id}};
      Object.assign(g0,{sp:3.5,tot:44.5,mla:150,mlh:-170,spa:-105,sph:-115,tov:-120,tou:100});
      ((S.odds[g0.id]??={})['audit-p1']={receptions:{'6':150},any_td:{'1':180}});
      const base={gid:g0.id,week:cw,src:'real',name:'Audit',pos:'WR',grp:'WR',team:g0.a,opp:g0.h,p:0.6};
      const pl=o=>({...base,pid:'audit-p1',stat:'receptions',key:g0.id+'|audit-p1|'+(o.stat||'receptions'),...o});
      const tm=(team,o)=>({...base,pid:'team:'+team,team,opp:team===g0.h?g0.a:g0.h,grp:'TEAM',pos:'Game',side:'over',main:false,...o});
      const one=(lab,l,want)=>{ ruleCases++; const got=LF(l), own=fairOf(l);
        chk(want===null?got===null&&own===null:(!!got&&!!own&&near(got.p,want.p)&&near(own.p,want.p)&&got.est===want.est&&own.est===want.est),
          `fair chance, ${lab}: the page says ${got?got.p+(got.est?' est.':''):'none'}, the rule ${want?want.p+(want.est?' est.':''):'none'}`); };
      const V=vig(cw);
      one('a main line\'s over, both sides priced',pl({k:4.5,main:true,side:'over',price:-130}),{p:nv(-130,110),est:false});
      one('a main line\'s under, both sides priced',pl({k:4.5,main:true,side:'under',price:110}),{p:nv(110,-130),est:false});
      chk(near(LF(pl({k:4.5,main:true,side:'over',price:-130})).p,F('devigOver')(-130,110))&&near(LF(pl({k:4.5,main:true,side:'over',price:-130})).p+LF(pl({k:4.5,main:true,side:'under',price:110})).p,1),'a main line\'s fair chances are not devigOver\'s, or its two sides do not make one');
      one('a main line the payload has moved',pl({k:5.5,main:true,side:'over',price:-130}),{p:imp(-130)/V.player,est:true});
      one('a ladder rung with a book price',pl({k:6,main:false,side:'over',price:150}),{p:imp(150)/V.player,est:true});
      one('an anytime touchdown with a book price',pl({stat:'any_td',k:1,main:false,side:'over',price:180}),{p:imp(180)/V.player,est:true});
      one('a rung on an estimated price',pl({k:7,main:false,side:'over',price:200,src:'est'}),null);
      one('the away side to win, both priced',tm(g0.a,{stat:'ml',k:0,price:150}),{p:nv(150,-170),est:false});
      one('the home side to win, both priced',tm(g0.h,{stat:'ml',k:0,price:-170}),{p:nv(-170,150),est:false});
      one('the home side to cover its own number',tm(g0.h,{stat:'ats',k:-3.5,price:-115}),{p:nv(-115,-105),est:false});
      one('the away side to cover another number',tm(g0.a,{stat:'ats',k:4.5,price:-125}),{p:imp(-125)/V.ats,est:true});
      one('the total\'s over, both priced',{...base,key:g0.id+'|game|total',pid:'game',stat:'total',k:44.5,side:'over',main:true,price:-120,grp:'TEAM'},{p:nv(-120,100),est:false});
      one('the total\'s under, both priced',{...base,key:g0.id+'|game|total',pid:'game',stat:'total',k:44.5,side:'under',main:true,price:100,grp:'TEAM'},{p:nv(100,-120),est:false});
      one('a team bet on an estimated price',tm(g0.a,{stat:'ml',k:0,price:150,src:'est'}),null);
      g0.mlh=null; one('the away side to win, its other side unpriced',tm(g0.a,{stat:'ml',k:0,price:150}),{p:imp(150)/vig(cw).ml,est:true}); g0.mlh=-170;
      /* no two-sided player line that week: the week's every two-sided line; none at all: no fair chance */
      { const keep=PAY.mkt[String(cw)]; delete PAY.mkt[String(cw)]; const Va=vig(cw);
        one('a rung in a week with no player main line',pl({k:6,main:false,side:'over',price:150}),Va.all>0?{p:imp(150)/Va.all,est:true}:null);
        PAY.mkt[String(cw)]=keep; }
      one('a rung in a week with no line at all',{...pl({k:6,main:false,side:'over',price:150}),gid:'2099_99_AAA_BBB',week:99},null);
      /* a parlay's fair chance: parlayProb on its legs at their fair chances, two legs of one team moving together */
      { const qb={...base,pid:'audit-qb',stat:'passing_yards',grp:'QB',pos:'QB',k:250.5,main:true,side:'over',price:-110,key:g0.id+'|audit-qb|passing_yards'};
        M['audit-qb']={passing_yards:{line:250.5,over:-110,under:-110,n:'Audit QB',g:g0.id}};
        const wr={...pl({k:4.5,main:true,side:'over',price:-130}),stat:'receiving_yards',key:g0.id+'|audit-p1|receiving_yards'};
        M['audit-p1'].receiving_yards={line:4.5,over:-130,under:110,n:'Audit One',g:g0.id};
        const legs=[qb,wr], f=PF(legs), byFair=pp(legs.map(l=>({...l,p:fairOf(l).p}))).corr;
        chk(!!f&&f.p===byFair&&f.est===false&&pp(legs).pairs.length>0,`a same-game parlay's fair chance ${f&&f.p} is not parlayProb on its legs at their fair chances (${byFair}), or its legs do not move together`);
        const f2=PF([qb,pl({k:6,main:false,side:'over',price:150})]);
        chk(!!f2&&f2.est===true&&f2.p!=null,'a parlay with a rung priced on one side is not marked est.');
        const f3=PF([qb,pl({k:7,main:false,side:'over',price:200,src:'est'})]);
        chk(!!f3&&f3.p===null&&f3.miss===1,'a parlay with a leg on an estimated price has a fair chance'); }
      restore();

      /* ---- far off the market: made-up lines on every starter of the week's games to come, one in
         three priced so the book's fair chance on the model's side is 25 points under the model's (far
         off), one in three 6 points under (an edge, not far), the rest at -112/-108 ---- */
      const games=F('pbGames')();
      if(!games.length) console.log('M7. fair chance: '+ruleCases+' cases of the rule; no game to come for the far-off checks');
      else {
        const MM=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{}); let j=0, nFar=0, nNear=0;
        for(const g of games){ const ro=rosterFor(g,false);
          for(const tm in ro) ro[tm].players.forEach(x=>{ if(!x.starter) return;
            for(const l of statLines(x)){ if(l.prob||!(l.mu>2)) continue;
              const ln=Math.floor(l.mu)+0.5, pO=pOver(x.pl.grp,l.stat,l.mu,ln), ov=pO>=0.5, ps=ov?pO:1-pO, kind=j++%3;
              let over=-112, under=-108;
              if(kind<2){ const fs=Math.max(0.05,Math.min(0.9,ps-(kind===0?0.25:0.06))), fo=ov?fs:1-fs; over=toML(fo*1.03); under=toML((1-fo)*1.03); }
              ((MM[x.pl.id]??={})[l.stat])={line:ln,over,under,n:x.pl.n,g:g.id}; } }); }
        const U=S.ui.pb, keepU=JSON.stringify(U), keepSide=S.ui.suggestSide;
        for(const k of ['ml','ats','total','over','under']) U.k[k]=true; U.off=[]; S.ui.suggestSide='any'; w.eval('PB_CACHE=new Map(); GAME_TIER_CACHE={}');
        /* the pool: no leg far off, and the count the panel gives is the legs left out for it alone */
        const pool=F('pbPool')(games), mlP=F('mlProb'), formOut=typeof w.eloLoaded==='function'&&!w.eloLoaded();
        const left=F('pricedLegs')(games).filter(c=>F('pbAllows')(c)&&c.src==='real'&&isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&c.p-mlP(c.price)>=0&&!(c.grp!=='TEAM'&&formOut)&&isFar(c));
        nFar=left.length; nNear=[...pool.pref,...pool.thin].filter(c=>!isG(c)).length;
        W.coverage(nFar>0&&nNear>0,`the made-up lines did not put both far-off legs (${nFar}) and player legs within ${FAR*100} points of the market (${nNear}) on the picks`);
        chk([...pool.pref,...pool.thin].every(c=>!isFar(c))&&pool.far===nFar,`the panel's pool holds a leg far off the market, or counts ${pool.far} left out where ${nFar} are`);
        const r=F('getPbTiers')();
        chk(r.far===nFar&&r.tiers.every(t=>!t.legs||t.legs.every(l=>!isFar(l))),'a level holds a leg far off the market, or the tiers do not carry the count');
        F('renderPb')();
        { const tx=d.getElementById('pbPanel').textContent.replace(/\s+/g,' ');
          chk(tx.includes(`${nFar} leg${nFar===1?' is':'s are'} left out: the model rates ${nFar===1?'it':'each'} 15 points or more above the book’s fair chance`)&&/still on the game pages, flagged far off the market/.test(tx),
            `the panel does not say how many legs it left out far off the market (${nFar}) and why: `+(tx.match(/\d+ legs? (is|are) left out[^.]*\./)||['nothing'])[0]); }
        /* every level's card leads with its fair chance (fairShown is held in hold too) */
        for(const t of r.tiers.filter(t=>t.legs)){ const c=d.querySelector(`#pbPanel .pb-tier.${t.id}`);
          chk(!!c&&c.querySelector('.pb-nums').firstElementChild.classList.contains('pb-chance')&&!c.querySelector('[data-pb-far]'),`the ${t.id} card does not lead with its chance, or flags a leg far off`);
          /* the chance's label and the model's figure wrap inside their box: four levels side by side just
             over 1100px leave it about 85px, and "FAIR CHANCE, EST." in 10px capitals is about 98 */
          chk(!!c&&['.pb-chance span','.pb-chance small'].every(q=>{ const el=c.querySelector(q); return !el||w.getComputedStyle(el).whiteSpace==='normal'; }),`the ${t.id} card's fair-chance label is held to one line, and can run out of its box`);
          chk(!!c&&(!t.floor||t.likeliest||c.querySelector('.pb-rule').textContent.endsWith(' by the model')),`the ${t.id} card does not say its floor is on the model's chance`); }
        /* a game page's hands: no leg far off, and each hand's fair chance parlayProb on its legs at theirs */
        let hands=0;
        for(const g of games.slice(0,3)){ const T=F('gameTiers')(g);
          chk(F('gameLegPool')(g).every(c=>!isFar(c)),`a game page's leg pool (${g.id}) holds a leg far off the market`);
          for(const id of ['high','med','low']){ const t=T[id]; if(!t) continue; hands++;
            const fs=t.legs.map(l=>LF(l));
            chk(t.legs.every(l=>!isFar(l)),`the ${id} hand of ${g.id} holds a leg far off the market`);
            chk(fs.every(Boolean)?(!!t.fair&&t.fair.p===pp(t.legs.map((l,i)=>({...l,p:fs[i].p})),20000).corr):(!!t.fair&&t.fair.p===null),`the ${id} hand of ${g.id}: its fair chance is not parlayProb on its legs at theirs`); } }
        /* flagged on the game page: a far-off main line of a starter, his game opened on him */
        const farL=F('pricedLegs')(games).filter(l=>l.main&&!isG(l)&&isFar(l)).sort((a,b)=>String(a.key+a.side).localeCompare(String(b.key+b.side)))[0];
        const nearL=[...pool.pref,...pool.thin].filter(l=>!isG(l)&&l.main).sort((a,b)=>String(a.key+a.side).localeCompare(String(b.key+b.side)))[0];
        let flagged='no far-off main line to open';
        if(farL){ const keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open,rungs:S.ui.showRungs});
          S.ui.showRungs=false; S.ui.game=farL.gid; S.ui.open={[farL.pid]:true}; F('renderGame')();
          const view=d.getElementById('gameView'), notes=[...view.querySelectorAll('p.faroff[data-far]')].map(p=>p.textContent.replace(/\s+/g,' '));
          const f=fairOf(farL), want=`${farL.side==='under'?'Under':'Over'} ${farL.k} model ${Math.round(farL.p*100)}% · market ${Math.round(f.p*100)}%: far off the market`;
          /* every far-off line of his shown (main lines both sides, the touchdown on a book price; the ladders are hidden) and no other */
          const his=F('pricedLegs')([S.sched.find(g=>g.id===farL.gid)]).filter(l=>l.pid===farL.pid&&(l.main||l.stat==='any_td')&&isFar(l));
          chk(notes.includes(want)&&notes.length===his.length&&view.querySelectorAll('tr.far').length===his.length,`the game page does not flag ${farL.name}'s far-off line as "${want}", or flags ${notes.length} where ${his.length} are far off: ${notes.join(' / ')}`);
          flagged=`${farL.name} ${farL.label} flagged on his game page`;
          const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; S.ui.showRungs=ku.rungs; F('closeGameModal')(); }
        /* the other far-off flags: a touchdown and a ladder rung on a book price (one-sided, so est.),
           planted 25 points under the model's chance on a starter of a game to come and drawn with the
           ladders shown; and the Game bets card's to win and to cover, priced so the book's fair chance on
           the model's side is 25 points under it, the other side's lines not flagged */
        const gF=games[0], roF=rosterFor(gF,false), pick=[];
        for(const tm in roF) roF[tm].players.forEach(x=>{ if(!x.starter) return; const ls=statLines(x), td=ls.find(l=>l.prob&&l.p>=0.2), ld=ls.find(l=>!l.prob&&l.rungs.some(r=>r.p>=0.3&&r.p<0.97));
          if(td&&ld) pick.push({x,td,ld,r:ld.rungs.find(r=>r.p>=0.3&&r.p<0.97)}); });
        const V=vig(cw), vp=V.player||V.all;
        if(pick.length&&vp>0){ const {x,td,ld,r}=pick.sort((a,b)=>String(a.x.pl.id).localeCompare(String(b.x.pl.id)))[0];
          const pTD=toML(Math.max(0.02,td.p-0.25)*vp), pR=toML(Math.max(0.02,r.p-0.25)*vp), O=((S.odds[gF.id]??={})[x.pl.id]??={});
          O.any_td={...(O.any_td||{}),'1':pTD}; O[ld.stat]={...(O[ld.stat]||{}),[String(r.k)]:pR};
          const legTD={gid:gF.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:td.p,price:pTD,src:'real',week:gF.w}, legR={gid:gF.id,pid:x.pl.id,stat:ld.stat,k:r.k,side:'over',main:false,p:r.p,price:pR,src:'real',week:gF.w};
          const fT=fairOf(legTD), fR=fairOf(legR);
          const keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open,rungs:S.ui.showRungs});
          S.ui.showRungs=true; S.ui.game=gF.id; S.ui.open={[x.pl.id]:true}; F('renderGame')();
          const view=d.getElementById('gameView'), notes=[...view.querySelectorAll('p.faroff[data-far]')].map(p=>p.textContent.replace(/\s+/g,' '));
          const wantT=`Scores one model ${Math.round(td.p*100)}% · market ${Math.round(fT.p*100)}% est.: far off the market`, wantR=`${r.k}+ model ${Math.round(r.p*100)}% · market ${Math.round(fR.p*100)}% est.: far off the market`;
          chk(!!fT&&!!fR&&fT.est&&fR.est&&isFar(legTD)&&isFar(legR)&&notes.includes(wantT)&&notes.includes(wantR)&&view.querySelectorAll('tr.far').length===notes.length&&view.querySelectorAll('tr.far').length>=2,
            `a far-off touchdown or ladder rung on a book price is not flagged on its game page ("${wantT}", "${wantR}"): ${notes.join(' / ')||'no flag'}`);
          const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; S.ui.showRungs=ku.rungs; F('closeGameModal')(); }
        else W.coverage(false,'no starter of a game to come has a touchdown and a ladder rung to plant far-off prices on');
        { const g=gF; if(g.sp==null||!isFinite(g.sp)) g.sp=3.5;
          const side=kind=>[g.a,g.h].map(t=>({t,b:gameBet(g,t,kind)})).sort((a,b)=>b.b.p-a.b.p)[0];
          const mlS=side('ml'), atS=side('ats'), fM=Math.max(0.05,mlS.b.p-0.25), fA=Math.max(0.05,atS.b.p-0.25), hM=mlS.t===g.h, hA=atS.t===g.h;
          const own=f=>toML(f*1.03), oth=f=>toML((1-f)*1.03);
          if(hM){ g.mlh=own(fM); g.mla=oth(fM); } else { g.mla=own(fM); g.mlh=oth(fM); }
          if(hA){ g.sph=own(fA); g.spa=oth(fA); } else { g.spa=own(fA); g.sph=oth(fA); }
          w.eval('GAME_TIER_CACHE={}');
          const box=d.createElement('div'); box.innerHTML=F('gameBetsCard')(g,false);
          const notes=[...box.querySelectorAll('p.faroff[data-far]')].map(p=>p.textContent.replace(/\s+/g,' '));
          const fm=nv(hM?g.mlh:g.mla,hM?g.mla:g.mlh), fa=nv(hA?g.sph:g.spa,hA?g.spa:g.sph), ln=atS.b.line;
          const want=[`To win model ${Math.round(mlS.b.p*100)}% · market ${Math.round(fm*100)}%: far off the market`,`To cover ${ln>0?'+':''}${ln} model ${Math.round(atS.b.p*100)}% · market ${Math.round(fa*100)}%: far off the market`];
          chk(want.every(x=>notes.includes(x))&&notes.length===2&&box.querySelectorAll('tr.far').length===2,
            `the Game bets card does not flag a far-off to win and to cover (and only those): ${notes.join(' / ')||'no flag'}`); }
        /* the game hands as each card draws them: one with a fair chance leads with it ("NN% fair chance",
           (est.) where a leg is priced on one side), "model says MM% to land" after it; one without says
           it has none. The week's own hands may all lack one (an estimated rung), so made-up hands are
           drawn too: two book-priced main lines in two games, the same with the planted rung, and with a
           leg on no book price */
        { const gt0=w.gameTiers, nb=x=>x.replace(/\s+/g,' ').trim();
          const card=(g,T)=>{ if(T) w.gameTiers=()=>T; try{ const b=d.createElement('div'); b.innerHTML=F('gameSuggestCard')(g,false); return b; } finally { w.gameTiers=gt0; } };
          const handOk=(box,id,t)=>{ const blk=[...box.querySelectorAll('.gsugg-tier')].find(b=>b.querySelector('.gsugg-tier-hd .conf.'+id)), nums=blk&&blk.querySelector('.gsugg-nums');
            if(!nums) return false; const tx=nb(nums.textContent), M=(t.corr*100).toFixed(0), b0=nums.querySelector('b');
            if(t.fair&&t.fair.p!=null){ const Fp=(t.fair.p*100).toFixed(0);
              return b0.textContent===Fp+'%'&&+b0.dataset.gsuggFair===t.fair.p&&tx.startsWith(`${Fp}% fair chance${t.fair.est?' (est.)':''} · model says ${M}% to land · `); }
            return tx.startsWith(`${M}% to land (the model’s chance: no fair chance without every leg’s book price) · `); };
          let shown=0;
          for(const g of games.slice(0,3)){ const T=F('gameTiers')(g), box=card(g,null);
            for(const id of ['high','med','low']) if(T[id]){ shown++; chk(handOk(box,id,T[id]),`the ${id} hand of ${g.id} does not lead with its fair chance, or say it has none: `+nb((([...box.querySelectorAll('.gsugg-tier')].find(b=>b.querySelector('.conf.'+id))||{}).textContent)||'')); } }
          chk(/lands at least 35% of the time by the model's chance/.test(nb(card(games[0],null).textContent)),'a game page\'s suggested parlays do not say their floors are on the model\'s chance');
          const mains=[...pool.pref,...pool.thin].filter(l=>l.main&&!isG(l)&&l.src==='real'&&fairOf(l)&&!fairOf(l).est).sort((a,b)=>String(a.key+a.side).localeCompare(String(b.key+b.side)));
          const two=mains.length?[mains[0],mains.find(l=>l.gid!==mains[0].gid)||mains.find(l=>l.pid!==mains[0].pid)].filter(Boolean):[];
          if(two.length===2){ const hand=legs=>({legs,corr:pp(legs).corr,dec:3,fair:PF(legs)});
            const rung=pick.length?{gid:gF.id,pid:pick[0].x.pl.id,stat:pick[0].ld.stat,k:pick[0].r.k,side:'over',main:false,p:pick[0].r.p,price:F('oddsFor')(gF.id,pick[0].x.pl.id,pick[0].ld.stat,pick[0].r.k),src:'real',week:gF.w,name:pick[0].x.pl.n,label:'rung',key:gF.id+'|'+pick[0].x.pl.id+'|'+pick[0].ld.stat}:null;
            const est={...two[1],key:two[1].key+'|est',k:+two[1].k+20,main:false,src:'est',price:400};
            const T={high:hand(two),med:rung&&rung.price!=null?hand([...two,rung]):null,low:hand([...two,est])};
            chk(T.high.fair&&T.high.fair.p!=null&&!T.high.fair.est&&(!T.med||(T.med.fair.p!=null&&T.med.fair.est))&&T.low.fair.p===null,'the made-up hands are not one with a fair chance, one estimated and one with none');
            const box=card(games[0],T);
            for(const id of ['high','med','low']) if(T[id]) chk(handOk(box,id,T[id]),`a made-up ${id} hand (${id==='high'?'book-priced main lines':id==='med'?'with a rung priced on one side':'with a leg on no book price'}) does not lead with its fair chance, or say it has none: `+nb(box.textContent).slice(0,300)); }
          else W.coverage(false,'the made-up lines gave no two book-priced main lines to build a hand of');
          flagged+=`; ${shown} game hands and made-up ones drawn with their fair chance; a far-off touchdown, ladder rung, to win and to cover flagged`; }
        /* the builder: the far-off leg flagged in its row, the near one not; the summary leads with the fair chance */
        if(farL&&nearL){ const keepP=JSON.stringify(S.parlay||{}), keepB=S.bookPrice, put=l=>{ const {key,thin,...x}=l; S.parlay[key]=x; };
          S.parlay={}; S.bookPrice=null; put(farL); if(nearL.key!==farL.key) put(nearL); F('renderParlay')();
          const legs=F('parlayLegs')(), fr=PF(legs), body=d.getElementById('parlayBody'), rows=[...body.querySelectorAll('tr.legrow')];
          const pr=pp(legs.map(l=>({...l,side:l.side||'over'}))).corr, hero=body.querySelector('.bigp .hero');
          chk(rows.length===legs.length&&legs.every((l,i)=>{ const ff=fairOf(l), fl=rows[i].querySelector('small.faroff'); return isFar(l)?!!fl&&fl.textContent===`model ${Math.round(l.p*100)}% · market ${Math.round(ff.p*100)}%${ff.est?' est.':''}: far off the market`:!fl; })
            &&legs.every((l,i)=>{ const lf=rows[i].querySelector('.legfair'), ff=fairOf(l); return !!lf&&lf.textContent===`fair ${(ff.p*100).toFixed(0)}%${ff.est?' est.':''}`; }),
            'the builder does not flag its far-off leg (and only it), or does not give each leg its fair chance: '+rows.map(r=>r.textContent.replace(/\s+/g,' ')).join(' / '));
          chk(!!fr&&fr.p!=null&&!!hero&&hero.querySelector('b').textContent===(fr.p*100).toFixed(1)+'%'&&hero.querySelector('span').textContent===`fair chance all ${legs.length} land${fr.est?', est.':''}`&&hero.querySelector('small').textContent===`model says ${(pr*100).toFixed(1)}%`,
            'the builder\'s summary does not lead with the fair chance, the model\'s beside it: '+(hero?hero.textContent:'no summary'));
          /* the confidence tile rates the fair chance, and says so: the far-off leg alone, its chance set in
             the builder where the model's tier and the fair chance's differ */
          { const tile=()=>d.querySelector('#parlayBody .bigp .box.tier'), ct=F('confTier'), f1=fairOf(farL).p, pm=f1<0.45?0.72:f1<0.7?0.85:0.3;
            const {key,thin,...one}=farL; S.parlay={[key]:{...one,p:pm}}; F('renderParlay')();
            const t1=tile(), [c1,l1]=ct(f1);
            chk(ct(pm)[0]!==c1&&!!t1&&t1.classList.contains(c1)&&t1.querySelector('b').textContent===l1&&t1.querySelector('span').textContent==='confidence all 1 land, on the fair chance',
              `the builder's confidence tile does not rate the fair chance (${(f1*100).toFixed(1)}%: ${l1}) where the model's ${(pm*100).toFixed(0)}% is ${ct(pm)[1]}: `+(t1?t1.textContent:'no tile')); }
          /* a leg on no book price: the model's chance alone, saying why */
          const est={gid:farL.gid,pid:farL.pid,stat:farL.stat,k:Math.max(1,Math.round(+farL.k)+3),side:'over',main:false,p:0.3,price:250,src:'est',mu:farL.mu,name:farL.name,pos:farL.pos,grp:farL.grp,team:farL.team,opp:farL.opp,week:farL.week,label:'est leg'};
          S.parlay={}; put(nearL); S.parlay[farL.gid+'|'+farL.pid+'|zz_est']={...est}; F('renderParlay')();
          const h2=d.querySelector('#parlayBody .bigp .hero');
          chk(!!h2&&/^model's chance all 2 land$/.test(h2.querySelector('span').textContent)&&h2.querySelector('small').textContent==="no fair chance: it needs every leg's book price"&&/one leg has none, so this is the model's chance alone/.test(d.getElementById('parlayBody').textContent),
            'with a leg on no book price the builder does not show the model\'s chance alone and say why: '+(h2?h2.textContent:'no summary'));
          { const t2=d.querySelector('#parlayBody .bigp .box.tier'), p2=pp(F('parlayLegs')().map(l=>({...l,side:l.side||'over'}))).corr, [c2,l2]=F('confTier')(p2);
            chk(!!t2&&t2.classList.contains(c2)&&t2.querySelector('b').textContent===l2&&t2.querySelector('span').textContent==='confidence all 2 land, on the model’s chance',
              'with no fair chance the builder\'s confidence tile does not rate the model\'s chance and say so: '+(t2?t2.textContent:'no tile')); }
          S.parlay=JSON.parse(keepP); S.bookPrice=keepB; F('save')(); F('renderParlay')(); }
        S.ui.pb=JSON.parse(keepU); S.ui.suggestSide=keepSide;
        console.log(`M7. fair chance: ${ruleCases} cases of the rule, and on made-up lines ${nFar} legs far off the market left out (${nNear} player legs kept), none on a level or on ${hands} game hands; ${flagged}; the builder flags it and leads with the fair chance`); }
    } finally { restore(); F('renderParlay')(); } }

  /* ---- P. the amount bet: the Bet amount box at the top of the suggested parlays and the
     builder's own stake are one amount, S.stake, kept with the visitor's state. Every tier pays
     that amount times its own decimal price, as it is typed and once it is settled; Add to builder
     leaves it in the builder; the builder's box and its one-tap amounts set the same number; a bad
     entry (blank, a word, 0, a minus) leaves the amount as it was and the box goes back to it; a
     saved amount that is not one reads as $20; nothing drawn from it is ever NaN. The tiers here
     are a fixed pair on this week's games still to come (getPbTiers stood in for), so this holds on
     any week, lean or not; the week's own tiers are held to the amount in M ---- */
  { d.querySelector('#tabs button[data-tab="parlay"]').click();
    const panel=d.getElementById('pbPanel'), was=S.stake, keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice;
    const read=w.eval('typeof stakeRead')==='function'?F('stakeRead'):null;
    chk(!!read,'the page has no reading of a typed amount (stakeRead)');
    chk(!d.getElementById('suggStake')&&!d.querySelector('#pbPanel [data-stake-chip]')&&d.querySelectorAll('#pbStake').length<=1,'the suggested parlays carry amount buttons of their own, or more than one Bet amount box');
    /* a typed amount, read on its own: dollars to the cent, $1 to $100,000, and no amount at all for anything that is not a positive number */
    if(read){ const cases=[['25',25],[' 40 ',40],['7.5',7.5],['12.346',12.35],['$1,250',1250],['0.4',1],['100001',100000],['1e3',1000],[60,60],
        ['',null],['  ',null],['abc',null],['-5',null],['0',null],['NaN',null],['Infinity',null],[NaN,null],[Infinity,null],[-3,null],[0,null],[null,null],[undefined,null],[true,null],[{},null]];
      for(const [v,want] of cases){ const got=read(v); chk(got===want,`a typed amount ${typeof v==='string'?JSON.stringify(v):String(v)} reads as ${got}, not ${want}`); } }
    const games=F('pbGames')();
    if(!games.length) chk(!d.getElementById('pbStake'),'with no game to come the panel still offers a Bet amount box');
    else {
      /* a fixed Safe tier, a money line on each of the first two games still to come (one if one
         is left), in the builder's order and at the builder's own price; a Medium on another
         price; and two that say why */
      const L=F('pbOrder')(games.slice(0,2).map((g,i)=>({key:`${g.id}|team:${g.h}|ml`,gid:g.id,pid:'team:'+g.h,stat:'ml',k:0,side:'over',main:false,p:0.6,price:i?105:-135,src:'real',mu:null,
        name:'Fixed '+g.h,pos:'Game',grp:'TEAM',team:g.h,opp:g.a,week:g.w,label:'To win',thin:false})));
      const dec=F('parlayDec')(L.map(l=>({leg:l,ml:l.price}))), why='Only 2 legs on your picks: tick more games or bet types.';
      w.__pbFix={sig:'audit-P',games:games.length,ticked:games.length,kinds:5,pref:L.length,thin:0,noPlayerPrices:false,tiers:[
        {id:'safe',label:'Safe',n:L.length,floor:0,legs:L,corr:0.4,indep:0.4,dec,thin:0},
        {id:'med',label:'Medium',n:3,floor:0.25,legs:L,corr:0.3,indep:0.3,dec:13.7,thin:0},
        {id:'aggr',label:'Aggressive',n:4,floor:0.12,why},{id:'xtrm',label:'Extreme',n:5,floor:0.05,why}]};
      w.__pbKeepP=w.eval('getPbTiers'); w.eval('getPbTiers=function(){ return window.__pbFix; }');
      S.parlay={}; S.bookPrice=null; S.stake=20; F('renderParlay')();
      const box=()=>d.getElementById('pbStake'), FIX=w.__pbFix.tiers.filter(t=>t.legs), txt=v=>v%1?v.toFixed(2):String(v);
      const type=(el,v,commit)=>{ el.value=v; el.dispatchEvent(new w.Event('input')); if(commit) el.dispatchEvent(new w.Event('change')); };
      const noNaN=()=>!/NaN|Infinity|undefined/.test(panel.textContent+d.getElementById('parlayBody').textContent);
      /* every tier on the panel pays this amount times its own price */
      const paysAll=s=>FIX.every(t=>payOk(d.querySelector(`#pbPanel [data-pb-tier="${t.id}"] [data-pb-pay]`),s,t.dec));
      const paysTxt=()=>[...panel.querySelectorAll('.pb-nums div:last-child')].map(x=>[...x.children].map(c=>c.textContent).join(' ')).join(' / ');
      const b0=box();
      chk(!!b0&&b0.type==='number'&&b0.getAttribute('inputmode')==='decimal'&&b0.min==='1'&&b0.step==='1'&&+b0.max===100000&&b0.value==='20',
        'the Bet amount box is not a dollar box (a number, the decimal keypad, $1 up in steps of $1) showing the amount: '+(b0?b0.outerHTML:'none'));
      chk(!!b0&&b0.closest('.pb-row')===panel.querySelector('.pb-ctl > .pb-row')&&((panel.querySelector('label[for="pbStake"]')||{}).textContent||'')==='Bet amount',
        'the Bet amount box is not the first of the panel\'s controls, labelled Bet amount');
      chk(paysAll(20),'on the $20 to start, a tier does not pay $20 times its price: '+paysTxt());
      if(b0){
        /* typed in the panel's box: each entry as it is typed, then settled */
        let cur=20;
        for(const [v,want] of [['25',25],['7.5',7.5],['0.4',1],['100001',100000],['',null],['-5',null],['0',null],['abc',null],['12.346',12.35],['30',30]]){
          const b=box(); type(b,v,false);
          const live=want==null?cur:want;
          chk(S.stake===live&&paysAll(live)&&noNaN(),`"${v}" typed in the Bet amount box: the amount is ${S.stake} and the tiers say ${paysTxt()}, not on ${amtTxt(live)}`);
          b.dispatchEvent(new w.Event('change')); cur=live;
          chk(S.stake===cur&&box().value===txt(cur)&&paysAll(cur)&&noNaN(),`"${v}" settled in the Bet amount box: the box shows "${box().value}", the amount is ${S.stake} and the tiers say ${paysTxt()}, not on ${amtTxt(cur)}`); }
        w.eval('store.set(S)'); chk(JSON.parse(mem).stake===30,'the Bet amount is not kept with the visitor\'s own state');
        /* Add to builder: the tier's legs, on the amount, paying what the tier said */
        d.querySelector('#pbPanel [data-pb-add="safe"]').click();
        const po=()=>d.querySelector('#parlayBody .payout'), pS=()=>d.getElementById('pStake');
        chk(Object.keys(S.parlay).length===L.length&&!!pS()&&pS().value==='30'&&!!po()&&po().textContent==='$'+(30*dec).toFixed(2),
          `Add to builder did not carry the Bet amount: the builder is on ${pS()?pS().value:'no stake'} and pays ${po()?po().textContent:'nothing'}, the tier ${money(30*dec)} on $30`);
        if(pS()&&po()){
          /* typed again with the tier in the builder: the tiers at once, the builder a moment later,
             and settling it leaves the panel (and an Add to builder or Finish about to be pressed) as it is */
          { const addNode=d.querySelector('#pbPanel [data-pb-add="safe"]'), b=box();
            type(b,'45.5',false);
            chk(paysAll(45.5)&&pS().value==='30','typed in the Bet amount box, the tiers did not follow at once, or the builder was redrawn under the pointer');
            await sleep(400);
            chk(pS().value==='45.50'&&po().textContent==='$'+(45.5*dec).toFixed(2),`a moment after typing $45.50, the builder is on ${pS().value} and pays ${po().textContent}, not $${(45.5*dec).toFixed(2)}`);
            b.dispatchEvent(new w.Event('change'));
            chk(d.querySelector('#pbPanel [data-pb-add="safe"]')===addNode&&box()===b&&b.value==='45.50'&&S.stake===45.5,'settling the amount redrew the panel, so an Add to builder or Finish pressed straight after typing would be lost'); }
          /* the builder's own box is the same amount: the panel follows it as it is typed, and on leaving it */
          { type(pS(),'60',false);
            chk(box().value==='60'&&paysAll(60),'typed in the builder\'s stake, the Bet amount box or the tiers did not follow');
            pS().dispatchEvent(new w.Event('change'));
            chk(S.stake===60&&box().value==='60'&&paysAll(60)&&po().textContent==='$'+(60*dec).toFixed(2),'the builder\'s stake, settled, is not the panel\'s amount');
            for(const v of ['','-1','0','abc']){ type(pS(),v,true);
              chk(S.stake===60&&pS().value==='60'&&box().value==='60'&&paysAll(60)&&noNaN(),`"${v}" in the builder's stake did not leave the amount at $60 everywhere: the amount ${S.stake}, the builder ${pS().value}, the box ${box().value}`); } }
          /* a saved amount that is not one reads as $20, and nothing reads NaN */
          for(const bad of ['abc',-4,0,NaN,null,'<b>',{}]){ S.stake=bad; F('renderParlay')();
            chk(w.eval('pbStake()')===20&&box().value==='20'&&paysAll(20)&&pS().value==='20'&&po().textContent==='$'+(20*dec).toFixed(2)&&noNaN(),`a saved amount ${typeof bad==='string'?JSON.stringify(bad):String(bad)} does not read as $20 everywhere: `+paysTxt()); } } }
      w.eval('getPbTiers=window.__pbKeepP'); delete w.__pbKeepP; delete w.__pbFix;
      S.parlay={}; S.stake=20; F('renderParlay')(); }
    /* the builder's one-tap amounts set the same amount, with a leg in the builder so What it pays is drawn */
    { openUpcoming();
      const tick=d.querySelector('#gameView input[data-leg]');
      chk(!!tick,'no leg to tick on the coming game');
      if(tick){ tick.click(); d.querySelector('#tabs button[data-tab="parlay"]').click();
        const chip5=d.querySelector('#parlayBody [data-stake-chip="5"]');
        chk(!!chip5,'no amount buttons beside the stake in What it pays');
        if(chip5){ chip5.click();
          chk(S.stake===5&&+d.getElementById('pStake').value===5,'tapping $5 in the builder did not set the stake');
          chk(!F('pbGames')().length||(!!d.getElementById('pbStake')&&d.getElementById('pbStake').value==='5'),'tapping $5 in the builder did not set the Bet amount box over the suggested parlays');
          chk(d.querySelector('#parlayBody [data-stake-chip="5"]').classList.contains('on')&&d.querySelectorAll('#parlayBody [data-stake-chip].on').length===1,'the builder does not show $5 pressed, and only $5');
          chk(/\$\d+\.\d\d/.test(d.querySelector('#parlayBody .payout').textContent)&&+d.querySelector('#parlayBody .payout').textContent.replace(/[^\d.]/g,'')>5,'the builder payout did not redraw from the $5 stake'); }
        /* a typed amount that is none of them presses none */
        const pS=d.getElementById('pStake'); pS.value='7'; pS.dispatchEvent(new w.Event('change'));
        chk(S.stake===7&&!d.querySelector('#parlayBody [data-stake-chip].on'),'a typed $7 left a chip pressed'); } }
    S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; S.stake=was; F('save')(); F('renderParlay')();
    chk(S.stake===was,'the stake did not go back after the amount checks');
    console.log(`P. the amount bet: one Bet amount box over the suggested parlays and the builder's stake, ${F('pbGames')().length?'every tier paying it times its price as typed and settled, carried by Add to builder, bad entries and saved amounts cleaned':'no game to come, so no box'}; the builder's one-tap amounts set it`); }

  /* ---- P2. the suggestions record at the panel's foot: props/data/suggest_ledger.json, beside the
     payload, read once a load with no-store and kept outside S; nothing drawn while there is no file
     (this audit's page has none) or a file that is not a ledger. On a made-up ledger, per level: the
     parlays graded won or lost (a push and a pending parlay counted apart, an entry still to come and
     a level with no parlay not at all), won, the wins expected by the fair chance (marked * where a
     graded parlay had none) and by the model's, and the units on $1 (a win a push shortened paying what
     it was graded, not the level's price), each worked out here; a parlay an earlier wave froze too,
     its legs in another order, counted once, from the last ---- */
  { d.querySelector('#tabs button[data-tab="parlay"]').click();
    const rec=()=>d.getElementById('pbRec'), txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
    const ask=calls.filter(c=>/suggest_ledger\.json/.test(c.url));
    chk(ask.length===1&&/^\.\.\/data\/suggest_ledger\.json\?t=\d+$/.test(ask[0].url)&&ask[0].cache==='no-store','the page did not ask for the suggestions record beside its payload, once, with no-store: '+JSON.stringify(ask));
    chk(!!rec()&&rec().hidden&&!txt(rec()),'with no record file the panel draws a record anyway: '+txt(rec()));
    const fetch0=w.fetch, load=async body=>{ w.fetch=()=>Promise.resolve(body===404?{ok:false,status:404,json:async()=>{throw new Error('404');}}:{ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body))});
      try{ await w.pbRecLoad(); } finally { w.fetch=fetch0; } F('renderPb')(); };
    /* each entry's levels on legs of their own (tag), as a week's panel's are */
    const T=(id,n,p,fair,dec,tag)=>({id,n,legs:Array.from({length:n},(_,i)=>({gid:'g'+tag+i,week:5,pid:'p'+tag+id+i,stat:'receptions',k:3.5,side:'over',main:true,price:-110,src:'real'})),p,fair,dec,label:{safe:'Safe',med:'Medium',aggr:'Aggressive',xtrm:'Extreme'}[id]});
    const G=(result,n,payout,legs)=>({result,legs:legs||Array.from({length:n},()=>result==='lost'?'loss':result==='push'?'void':result==='pending'?null:'win'),...(payout!=null?{payout}:{})});
    const early=T('safe',2,0.40,0.31,3.1,'a'); early.legs.reverse();
    const L={how:'made up',since:'2026-10-12',entries:{
      /* London: the 1pm entry's Safe parlay, frozen here too (its legs the other way round, an older price): one parlay, counted from 1pm */
      '2026|05|2026-10-11T13:30:00Z':{kickoff:'2026-10-11T13:30:00Z',tiers:[early],grade:{safe:G('won',2,3.1)}},
      '2026|05|2026-10-11T17:00:00Z':{kickoff:'2026-10-11T17:00:00Z',tiers:[T('safe',2,0.41,0.32,3.35,'a'),T('med',3,0.30,0.21,5.1,'a'),T('aggr',4,0.15,0.1,9,'a'),T('xtrm',5,0.07,0.05,20,'a')],
        grade:{safe:G('won',2,3.35),med:G('lost',3,0),aggr:G('push',4,1),xtrm:G('pending',5)}},
      /* the Medium won with a leg pushed: paid 3.7 on the two left, not its 6.2 */
      '2026|05|2026-10-11T20:25:00Z':{kickoff:'2026-10-11T20:25:00Z',tiers:[T('safe',2,0.52,0.44,2.6,'b'),T('med',3,0.28,null,6.2,'b'),T('aggr',4,0.13,0.09,12,'b'),T('xtrm',5,0.06,0.04,30,'b')],
        grade:{safe:G('lost',2,0),med:G('won',3,3.7,['win','push','win']),aggr:G('won',4,12),xtrm:G('lost',5,0)}},
      '2026|05|2026-10-12T00:20:00Z':{kickoff:'2026-10-12T00:20:00Z',tiers:[{id:'safe',n:2,why:'made up'},T('med',3,0.5,0.5,4,'c')],grade:{safe:G('won',2,9)}},
      '2026|06|2026-10-16T00:15:00Z':{kickoff:'2026-10-16T00:15:00Z',tiers:[T('safe',2,0.6,0.5,3,'d')]}}};
    const want={safe:['Safe','2','1','0.8','0.9','+1.35','up'],med:['Medium','2','1','0.2*','0.6','+1.70','up'],aggr:['Aggressive','1','1','0.1','0.1','+11.00','up'],xtrm:['Extreme','1','0','0.0','0.1','\u22121.00','down']};
    await load(L);
    const row=id=>d.querySelector(`#pbRec tr[data-pb-rec="${id}"]`), cells=id=>row(id)?[...row(id).children].map(c=>c.textContent.trim()):[];
    chk(!!rec()&&!rec().hidden&&/^Suggestions record/.test(txt(rec()))&&!!d.querySelector('#pbCard #pbRec'),'a made-up record is not drawn in the panel, headed Suggestions record');
    chk(/starts on 12 October 2026, Monday night’s Bills at Rams the first/.test(txt(rec()))&&/default choices \(All, every game still to come, \$20\)/.test(txt(rec()))&&/frozen at kickoff/.test(txt(rec())),'the record does not say it starts on 12 October 2026 with Bills at Rams, each entry the default panel frozen at kickoff: '+txt(rec()));
    chk([...d.querySelectorAll('#pbRec thead th')].map(c=>c.textContent).join('|')==='Level|Graded|Won|Expected, fair chance|Expected, model|Units on $1','the record\'s columns are not level, graded, won, expected by the fair chance and by the model, units on $1');
    for(const id of ['safe','med','aggr','xtrm']){ const c=cells(id), u=row(id)&&row(id).lastElementChild;
      chk(c.join('|')===want[id].slice(0,6).join('|')&&!!u&&u.classList.contains(want[id][6]),`the record's ${id} row reads ${c.join(' | ')}, not ${want[id].slice(0,6).join(' | ')}`); }
    chk(/1 parlay is waiting on its games or stats/.test(txt(rec()))&&/1 push \(every leg a push or a void, the stake back\) is counted apart/.test(txt(rec()))&&/\* Not every parlay graded had a fair chance/.test(txt(rec())),'the record does not count its pending parlay and its push apart, or mark the sum a missing fair chance left short: '+txt(rec()));
    w.eval('store.set(S)'); chk(!/Suggestions record|made up|suggest_ledger/.test(String(mem))&&!('rec' in S),'the record was saved with the visitor\'s state');
    await load({how:'made up',entries:{}});
    chk(!!rec()&&!rec().hidden&&/No suggested parlay has been graded yet/.test(txt(rec()))&&!d.querySelector('#pbRec table'),'a record with nothing graded does not say so: '+txt(rec()));
    for(const bad of [404,[],{how:'x'},{entries:[]},'junk']){ await load(bad);
      chk(!!rec()&&rec().hidden&&!txt(rec()),`a record file that is not one (${JSON.stringify(bad)}) drew something: `+txt(rec())); }
    console.log('P2. the suggestions record: asked for once with no-store, nothing drawn without a file; a made-up record drawn level by level, pending and pushes apart, an empty one says so, a junk one draws nothing'); }

  /* ---- L. record chips beside the week dropdown ---- */
  { const main=F('trackRecord')().filter(r=>r.kind==='main'); const wkx=main.length?main[0].w:1;
    const ws=d.getElementById('weekSel'); const was=ws.value; ws.value=String(wkx); ws.dispatchEvent(new w.Event('change'));
    const want=rows=>`${rows.filter(r=>r.hit).length}\u2013${rows.filter(r=>!r.hit).length}`;
    chk(d.getElementById('weekRec').textContent===`Week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}`,'week record chip does not match graded main lines');
    chk(d.getElementById('seasonRec').textContent===`Season ${want(main)}`,'season record chip does not match graded main lines');
    ws.value=was; ws.dispatchEvent(new w.Event('change'));
    console.log(`L. record chips: week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}, season ${want(main)}`); }


  /* ---- S. the threshold ladder toggle ---- */
  /* from an empty parlay: a threshold leg left on it by an earlier section (the game card's
     ladder legs tick like any other) would keep the hidden-ladder note up on its own */
  { const keepS=JSON.parse(JSON.stringify(S.parlay||{})); S.parlay={}; openUpcoming();
    [...d.querySelectorAll('.plrbtn')][0].click();        /* rungs only render for an open player */
    const box=d.getElementById('rungCb');
    chk(!!box&&box.checked===false,'no threshold ladder toggle, or it does not default to hidden');
    const rows=()=>d.querySelectorAll('#gameView tr.rung').length;
    chk(rows()===0,`ladder rows showed by default: ${rows()}`);
    box.checked=true; box.dispatchEvent(new w.Event('change'));
    chk(d.getElementById('rungCb').checked===true,'the toggle did not stay on');
    const shown=rows();
    chk(shown>0,'turning the ladders on showed no rows');
    /* a rung already on the parlay must stay visible, or a leg could count while hidden */
    let t=d.getElementById('rungCb');
    const rung=[...d.querySelectorAll('#gameView tr.rung')].find(tr=>tr.querySelector('input[data-leg]'));
    if(rung){ rung.querySelector('input[data-leg]').click();
      t=d.getElementById('rungCb'); t.checked=false; t.dispatchEvent(new w.Event('change'));
      chk(rows()===1,`a ticked rung was hidden: ${rows()} rows left`);
      const back=d.querySelector('#gameView tr.rung input[data-leg]');
      chk(!!back&&back.checked,'the surviving rung is not the ticked one');
      chk(/nothing counts out of sight/.test(d.getElementById('gameView').textContent),'a pinned rung is not explained');
      if(back) back.click();
      chk(!/nothing counts out of sight/.test(d.getElementById('gameView').textContent),'the note outstayed the pinned rung'); }
    S.parlay=keepS;
    /* the model still builds every rung: hiding is a display choice, not a data one */
    const g2=openUpcoming(); const roster=rosterFor(g2,false); let built=0;
    for(const tm in roster) for(const x of roster[tm].players) for(const l of statLines(x)) built+=(l.rungs||[]).length;
    chk(built>0,'statLines stopped building rungs when they were hidden');
    t=d.getElementById('rungCb'); t.checked=true; t.dispatchEvent(new w.Event('change'));
    [...d.querySelectorAll('.plrbtn')][0].click();   /* openUpcoming above collapsed every player */
    chk(rows()===shown,`turning the ladders back on restored ${rows()} of ${shown} rows`);
    t=d.getElementById('rungCb'); t.checked=false; t.dispatchEvent(new w.Event('change'));
    console.log(`S. ladder toggle: hidden by default, ${shown} rows when turned on, ${built} rungs built either way`); }

  /* ---- R. baked prices follow the build, and the tiers price like a book ---- */
  { const s={tiers:F('getPbTiers')().tiers.filter(t=>t.legs)};
    if(s.tiers.length){
      const pd=F('parlayDec');
      for(const t of s.tiers){
        const mult=t.legs.reduce((a,l)=>a*F('mlToDec')(l.price),1);
        chk(Math.abs(t.dec-pd(t.legs.map(l=>({leg:l,ml:l.price}))))<1e-6,`${t.label} tier's price is not what parlayDec says`);
        /* same-game legs are priced together and a book never pays above multiplying, so
           the tier lands at or below it: strictly below when the legs overlap, and equal
           when they pull against each other and parlayDec clamps. Section Q proves the
           strict case on known legs; here the point is that it never exceeds. */
        if(F('sameGame')(t.legs)) chk(t.dec<=mult+1e-9,`${t.label} tier priced above multiplying legs that share a game`);
        else chk(Math.abs(t.dec-mult)<1e-9,`${t.label} tier does not multiply legs from different games`);
      }
    }
    /* a browser holding last build's prices must take this build's */
    const wk=Object.keys(PAY.prices||{})[0];
    if(wk){
      const gid=F('gamesIn')(+wk).map(g=>g.id).find(id=>S.odds[id]&&Object.keys(S.odds[id]).length);
      if(gid){
        const pid=Object.keys(S.odds[gid])[0], st=Object.keys(S.odds[gid][pid])[0], k=Object.keys(S.odds[gid][pid][st])[0];
        const real=S.odds[gid][pid][st][k];
        S.odds[gid][pid][st][k]=real+1000; S.pricesFrom='some-older-build';
        const r=F('applyBaked')();
        chk(r.prices>0,'a new build did not reload prices over a browser that had old ones');
        chk(S.odds[gid][pid][st][k]===real,'the stale price survived the new build');
        const again=F('applyBaked')();
        chk(again.prices===0,'the same build reloaded prices a second time');
      }
    }
    console.log(`R. tiers priced like a book; baked prices follow the build`); }

  /* ---- Q. same-game parlays are priced together, not multiplied ---- */
  { const pd=F('parlayDec');
    /* two legs with known prices, so the check does not depend on what earlier
       sections left in S.odds */
    const L=[{leg:{gid:'g1',pid:'p1',stat:'receiving_yards',grp:'WR',k:25,side:'over',p:0.47},ml:250},
             {leg:{gid:'g1',pid:'p2',stat:'passing_yards',grp:'QB',k:220,side:'over',p:0.75},ml:-261}];
    const mult=L.reduce((a,x)=>a*F('mlToDec')(x.ml),1);
    const sgp=pd(L);
    chk(sgp>1,'a same-game parlay priced at or below the stake');
    chk(sgp<mult,`legs in one game were multiplied anyway: ${sgp.toFixed(3)} vs ${mult.toFixed(3)}`);
    /* the identical legs in two different games must multiply exactly */
    const apart=[L[0],{leg:{...L[1].leg,gid:'g2'},ml:L[1].ml}];
    chk(Math.abs(pd(apart)-mult)<1e-9,'legs in different games are not multiplied');
    /* one leg is its own price, whatever game it is in */
    chk(Math.abs(pd([L[0]])-F('mlToDec')(250))<1e-9,'a single leg is not its own price');
    /* a third leg in the same game must shorten it further, never lengthen past multiplying */
    const three=[...L,{leg:{gid:'g1',pid:'p3',stat:'rushing_yards',grp:'RB',k:60,side:'over',p:0.45},ml:-110}];
    const mult3=three.reduce((a,x)=>a*F('mlToDec')(x.ml),1);
    chk(pd(three)<mult3,'a third same-game leg was multiplied anyway');
    chk(pd(three)>sgp,'adding a leg did not increase the price');
    chk(F('sameGame')([{gid:'a'},{gid:'a'}])===true&&F('sameGame')([{gid:'a'},{gid:'b'}])===false,'sameGame does not spot a shared game');
    console.log(`Q. same-game pricing: 2 legs multiply to ${mult.toFixed(2)}, priced together ${sgp.toFixed(2)} (${(100*(1-sgp/mult)).toFixed(0)}% shorter)`); }

  /* ---- O. the game page's suggested parlays: High, Medium, Low ---- */
  { const g=openUpcoming(); let card=d.querySelector('.gsugg');
    chk(!!card,'the game page has no suggested parlay section');
    { const sw=[...card.querySelectorAll('[data-gsugg-side]')];
      chk(sw.length===3&&sw.filter(b=>b.classList.contains('on')).length===1,'the game card has no side switch, or not one side on');
      const was=S.ui.suggestSide;
      sw.find(b=>b.dataset.gsuggSide==='over').click();
      chk(S.ui.suggestSide==='over'&&d.querySelector('.gsugg [data-gsugg-side="over"]')?.classList.contains('on'),'the game card switch did not take or did not redraw');
      const To=F('gameTiers')(g);
      chk(['high','med','low'].every(id=>!To[id]||To[id].legs.every(l=>l.grp!=='TEAM'&&l.side==='over')),'with overs on, a game tier has a leg that is not a player over');
      d.querySelector('.gsugg [data-gsugg-side="any"]').click();
      chk(S.ui.suggestSide==='any','Any did not come back on the game card');
      S.ui.suggestSide=was; d.querySelector('[data-game="'+g.id+'"]').click(); }
    w.eval('GAME_TIER_CACHE={}');
    const T=F('gameTiers')(g), MIN=w.eval('GAME_LEG_MIN'), spec=w.eval('GAME_TIERS');
    /* always there while the game has lines, the right size, and to the rules */
    W.compose(T.pool>=4?spec.every(([id])=>!!T[id]):true,`a game with ${T.pool} lines left a tier empty`);
    /* the card states the floors (every leg 40%+ and no shorter than GAME_LEG_MIN; High +100 and 35%,
       Medium +250 and 20%, Low +500 and 10%, unless it says the lines cannot reach them): numbers on the
       page, so those are blocking; which hand is chosen, and its size, are warnings */
    for(const [id,,n,floor,minP] of spec){ const t=T[id]; if(!t) continue;
      chk(t.relaxed||t.corr>=minP-0.03,`the ${id} tier lands ${(t.corr*100).toFixed(0)}%, under its ${minP*100}% floor, without saying so`);
      chk(t.legs.every(l=>l.p>=0.40),`the ${id} tier has a leg under a 40% chance`);
      W.compose(t.legs.length===n,`the ${id} tier has ${t.legs.length} legs, not ${n}`);
      chk(t.legs.every(l=>l.gid===g.id)&&t.legs.filter(l=>l.grp==='TEAM').length<=1&&t.legs.every(l=>t.legs.filter(x=>x.pid===l.pid).length<=2)&&new Set(t.legs.map(l=>l.key)).size===n,`the ${id} tier breaks the leg rules`);
      chk(t.legs.every(l=>isFinite(l.price)&&l.price!==0),`the ${id} tier has a leg with no price`);
      chk(t.legs.every(l=>l.price>=MIN),`the ${id} tier has a leg shorter than ${MIN}`);
      chk(t.corr>0&&t.corr<1&&t.dec>1,`the ${id} tier has a nonsense chance or price`);
      chk(t.relaxed||t.dec>=1+floor/100-0.02,`the ${id} tier pays ${t.dec.toFixed(2)}, under its +${floor} floor, without saying so`); }
    /* each tier grows the one before */
    if(T.high&&T.med) W.compose(T.high.legs.every(l=>T.med.legs.some(x=>x.key===l.key&&x.k===l.k)),'Medium does not grow High');
    if(T.med&&T.low) W.compose(T.med.legs.every(l=>T.low.legs.some(x=>x.key===l.key&&x.k===l.k)),'Low does not grow Medium');
    /* the pool: book prices where they exist, the model's estimate on the rest, ladders included */
    { const pool=F('gameLegPool')(g);
      chk(pool.every(c=>c.gid===g.id&&c.price>=MIN&&(c.src==='real'||c.src==='est')),'the leg pool has a line from another game, too short a price or no source');
      W.compose(pool.some(c=>!c.main&&c.grp!=='TEAM'&&c.stat!=='any_td'),'the leg pool has no threshold ladders'); }
    /* the high pair is the best payout for its chance among its seeds, not a safe nothing */
    if(T.high){ const one=c=>c.p*F('mlToDec')(c.price), pool=F('gameLegPool')(g).sort((a,b)=>one(b)-one(a));
      const a=pool[0], b=pool.find(c=>c.key!==a.key&&!(c.grp==='TEAM'&&a.grp==='TEAM'));
      if(a&&b){ const pd=F('parlayDec')([{leg:a,ml:a.price},{leg:b,ml:b.price}]), pr=F('parlayProb')([a,b],20000).corr;
        const [,,,hf,hp]=spec[0];
        /* only a pair High could take: the tier's own payout and chance floors, with room for simulation noise */
        W.compose(pd<1+hf/100||pr<hp+0.03||T.high.corr*T.high.dec>=pr*pd-0.06,'the High pair returns less than the two best single legs together'); } }
    chk(F('gameTiers')(g)===T,'the tiers are not cached between renders');
    /* the card: three blocks, each with its chance, its legs and an Add all that works */
    d.querySelector('[data-game="'+g.id+'"]').click(); card=d.querySelector('.gsugg');
    const blocks=[...card.querySelectorAll('.gsugg-tier')];
    chk(blocks.length===3,'the card does not show High, Medium and Low');
    spec.forEach(([id,,n],i)=>{ const t=T[id]; if(!t) return;
      chk(blocks[i].querySelectorAll('.gsugg-legs li').length===n&&new RegExp(`${Math.round(t.corr*100)}% to land`).test(blocks[i].textContent.replace(/\s+/g,' ')),`the ${id} block does not show its ${n} legs and its chance`); });
    chk(!card.querySelector('[data-suggest-shuffle]'),'Shuffle is still on the card');
    if(T.med){ const keepP=JSON.parse(JSON.stringify(S.parlay||{})); S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      d.querySelector('[data-gtier-add="med"]').click();
      chk(T.med.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side),'Add all on Medium did not put its legs on the parlay');
      d.querySelector('[data-game="'+g.id+'"]').click();
      chk([...d.querySelectorAll('.gsugg-tier')][1].querySelectorAll('input[data-leg]:checked').length===3,'the Medium legs on the parlay are not ticked');
      S.parlay=keepP; F('save')(); d.querySelector('[data-game="'+g.id+'"]').click(); }
    /* the game bets are on the game's page (app v105), after its suggested parlays */
    { const gs=d.querySelector('#gameView .gsugg'), gb=d.querySelector('#gameView .gbets');
      chk(!!gs&&!!gb&&d.querySelectorAll('#gameView .gbets').length===1&&!!(gs.compareDocumentPosition(gb)&4),'the game page does not carry the Game bets card once, after its suggested parlays'); }
    /* the parlay card prints a leg's fields as text: markup planted in the shared store never becomes an element */
    if(T.med&&T.med.legs.length){ const keepP=JSON.parse(JSON.stringify(S.parlay||{})), keepB=S.bookPrice, bad='<img src=x data-planted=1>';
      const l0=T.med.legs[0]; S.parlay={}; S.parlay[l0.key]=Object.assign({},l0,{pos:bad,team:bad,opp:bad,week:bad});
      S.bookPrice='"><img src=x data-planted=1>';
      try{ F('renderParlay')(); const body=d.getElementById('parlayBody');
        chk(!!body&&!body.querySelector('[data-planted]')&&/<img src=x data-planted=1>/.test(body.textContent),'markup in a parlay leg or the book price became an element on the parlay card'); }
      finally{ S.parlay=keepP; S.bookPrice=keepB; F('renderParlay')(); } }
    console.log(`O. game tiers: ${spec.map(([id,,n])=>T[id]?`${id} ${n} legs ${(T[id].corr*100).toFixed(0)}% at ${(T[id].dec).toFixed(2)}${T[id].relaxed?' (under floor)':''}`:`${id} none`).join(', ')} from ${T.pool} lines`); }
  /* ---- N. the credit-pull panel, in place of the old price sheet ---- */
  { const box=d.getElementById('pricePull');
    chk(!!box,'the Weekly Update tab has no credit-pull panel');
    for(const id of ['oddsLegs','oddsTemplate','oddsUpload','oddsClear','oddsWeekSel','oddsFile','oddsStatus'])
      chk(d.getElementById(id)===null,`price sheet control still on the page: ${id}`);
    for(const id of ['fetchGames','statsLink','rosLink','injLink','dcLink','upAll','allFiles'])
      chk(d.getElementById(id)!==null,`free download/upload control went missing: ${id}`);
    const keep=PAY.price_pull;
    /* what this build actually carries: a recorded pull, with a time */
    W.panel(keep&&keep.at,'no credit pull recorded in the payload');
    F('renderPricePull')();
    W.panel(/Last credit pull/.test(box.textContent),'panel does not say when credits were last spent');
    W.panel(/\d{1,2}:\d\d/.test(box.textContent),'panel shows no time of day for the pull');
    for(const wk of Object.keys(PAY.prices||{}))
      W.panel(box.textContent.includes(`week ${wk}: ${PAY.prices[wk].length.toLocaleString()}`),`panel does not count week ${wk}'s prices`);
    /* no record at all: falls back to the date the main lines were priced */
    const meta=PAY.mkt_meta||{}; const lastW=Object.keys(meta).sort((a,b)=>b-a)[0];
    PAY.price_pull=null; F('renderPricePull')();
    if(lastW&&meta[lastW].asof) chk(box.textContent.includes(meta[lastW].asof),'fallback does not carry the priced-on date');
    chk(/date only/.test(box.textContent),'fallback does not say it has the date alone');
    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:389};
    F('renderPricePull')();
    chk(/for week 2\./.test(box.textContent),'panel ignores the recorded pull week');
    chk(!/date only/.test(box.textContent),'panel still claims it only has a date');
    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:389,credits_spent:112};
    F('renderPricePull')();
    chk(box.textContent.includes('112 credits spent'),'panel does not say what the pull cost');
    PAY.price_pull=keep;
    /* the balance, read free on every build */
    const kc=PAY.credits;
    PAY.credits={at:'2026-09-17T14:05',used:131,left:369}; F('renderPricePull')();
    chk(/369 credits left of 500 this month, 131 used/.test(box.textContent.replace(/\s+/g,' ')),'panel does not report the balance');
    chk(!/class="warn"/.test(box.innerHTML),'a comfortable balance should not be flagged');
    PAY.credits={at:'2026-09-17T14:05',used:451,left:49}; F('renderPricePull')();
    chk(/class="warn"/.test(box.innerHTML),'a balance under a fifth of the month is not flagged');
    PAY.credits={at:'2026-09-17T14:05',used:499,left:1}; F('renderPricePull')();
    chk(/1 credit left/.test(box.textContent),'credits left is not singular at one');
    PAY.credits=null; F('renderPricePull')();
    chk(!/credits left/.test(box.textContent),'panel invents a balance when none was read');
    PAY.credits=kc; F('renderPricePull')();
    const cb=d.getElementById('checkCredits');
    chk(!!cb&&/Check Credits/.test(cb.textContent),'no Check Credits button');
    chk(cb&&cb.classList.contains('danger'),'the Check Credits button is not the red one');
    chk(!!d.getElementById('creditsStatus'),'the Check Credits button has nowhere to report');
    console.log(`N. credit pull: ${keep&&keep.at} for week ${keep&&keep.week}, ${Object.keys(PAY.prices||{}).length} week(s) of prices counted, sheet controls gone`); }

  /* ---- H. week-2 projections still sane after update ---- */
  let bad2=0,n2=0;
  for(const g of S.sched.filter(x=>x.w===2)){ const rr=rosterFor(g,false);
    for(const team in rr) for(const x of rr[team].players) for(const l of statLines(x)){ n2++;
      if(!l.prob&&!(isFinite(l.mu)&&l.mu>=0)) bad2++; for(const rg of (l.rungs||[])) if(!(rg.p>0&&rg.p<1)) bad2++; } }
  chk(bad2===0,`post-update projections bad: ${bad2}`);
  console.log(`H. week 2 after update: ${n2} stat blocks, ${bad2} bad`);

  /* ---- I. built-in data: same path as an upload, replayable, user state survives a rebuild ---- */
  (async()=>{
    /* ---- N2. Check Credits reads the published balance ---- */
    { const box=d.getElementById('pricePull'), btn=d.getElementById('checkCredits'), st=d.getElementById('creditsStatus');
      const keep=PAY.credits, realFetch=w.fetch; let asked=null;
      w.fetch=u=>{ asked=u; return Promise.resolve({ok:true,status:200,json:async()=>({at:'2026-09-17T14:05',used:131,left:369})}); };
      btn.click(); await new Promise(r=>setTimeout(r,120));
      chk(/credits\.json\?t=\d+/.test(asked||''),'Check Credits does not cache-bust the published balance');
      chk(/369 credits left of 500 this month, 131 used/.test(box.textContent.replace(/\s+/g,' ')),'Check Credits did not update the panel');
      chk(!btn.disabled&&/Check Credits/.test(btn.textContent),'the button did not come back after a check');
      w.fetch=()=>Promise.resolve({ok:false,status:404});
      btn.click(); await new Promise(r=>setTimeout(r,120));
      chk(/HTTP 404/.test(st.textContent),'a failed check says nothing');
      chk(/369/.test(box.textContent),'a failed check wiped the balance already on the page');
      chk(!btn.disabled,'the button stayed disabled after a failed check');
      w.fetch=realFetch; PAY.credits=keep; F('renderPricePull')();
      console.log('N2. Check Credits: updates the panel, survives a 404'); }
    const applyBaked=F('applyBaked');
    w.eval('S=freshState(); NORM=null'); let SI=w.eval('S');   /* exactly the state boot has when it applies baked data */
    let b1; try{ b1=w.eval('applyBaked()'); }catch(e){ chk(false,'applyBaked threw on a fresh state: '+e.message); b1={sched:0,inj:0,prices:0,stats:[]}; }
    const b1again=b1; chk(!!b1again,'applyBaked returned nothing');
    const bakedWeeks=Object.keys(PAY.stats||{});
    if(bakedWeeks.length){
      const ids=[].concat(...bakedWeeks.map(wk=>[...new Set(PAY.stats[wk].map(r=>{const g=SI.sched.find(x=>+x.w===+r.week&&(x.h===r.team||x.a===r.team)); return g?g.id:null;}))])).filter(Boolean);
      chk(ids.every(id=>SI.processedGames[id]),'baked stats did not mark their games processed');
      chk(b1.stats.length===ids.length,`baked stats applied ${b1.stats.length} games, expected ${ids.length}`);
      chk(Object.keys(SI.projections).length>0,'baked stats did not freeze projections before applying');
      const b2=applyBaked(); chk(b2.stats.length===0,'baked stats re-applied on a second pass');
    }
    if(PAY.prices&&Object.keys(PAY.prices).length){
      chk(b1.prices>0,'baked prices loaded nothing');
      const anyGame=Object.keys(SI.odds).find(g=>Object.keys(SI.odds[g]).length); chk(!!anyGame,'baked prices not in S.odds');
      const b2=applyBaked(); chk(b2.prices===0,'baked prices reloaded over an existing week');
    }
    chk(b1.sched>=0&&SI.sched.every(g=>g.sp==null||isFinite(g.sp)),'baked schedule merge produced bad lines');
    /* a rebuild with a different data build keeps the user's parlays, stake and prices */
    mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:'old-build',parlay:{'g|p|s':{p:0.5}},saved:[{id:'sp1',saved:'2026-09-13T00:00:00.000Z',week:1,stake:20,payout:50,dec:2.5,ml:150,legs:[]}],stake:55,odds:{gX:{pX:{passing_yards:{'250':-110}}}}});
    await F('boot')(); SI=w.eval('S');
    chk(SI.dataBuild===F('DATA_BUILD'),'rebuild did not adopt the new data build');
    chk(SI.stake===55&&SI.parlay['g|p|s']&&SI.saved.length===1&&SI.odds.gX,'user state lost across a data rebuild');
    chk(Object.keys(SI.processedGames).length===0,'rebuild replayed data despite NO_BAKED');
    /* I3. the suggested parlays' choices are the reader's, kept in S.ui.pb across a reload; a
       damaged one reads as everything ticked */
    { const pb={k:{ml:true,ats:false,total:true,over:false,under:true},off:['2099_01_XX_YY'],gx:true};
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),stake:20,ui:{pb,suggestSide:'any'}});
      await F('boot')(); let SP=w.eval('S');
      chk(JSON.stringify(SP.ui.pb)===JSON.stringify(pb),'the suggested parlays\' choices did not survive a reload: '+JSON.stringify(SP.ui.pb));
      { const kb=d.querySelector('#pbPanel [data-pb-kind="ats"]');
        const P=d.getElementById('pbPanel');
        chk(!F('pbGames')().length||(!P.querySelector('[data-pb-mix].on')&&!P.querySelector('.pb-custom')&&!/\bCustom\b/.test(P.textContent)&&!!kb&&!kb.checked),'the panel did not draw the choices it was reloaded with (no mix lit, no Custom tag, Spread unticked)'); }
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),ui:{pb:{k:'bad',off:'<x>',gx:3}}});
      await F('boot')(); SP=w.eval('S');
      chk(Object.values(SP.ui.pb.k).every(v=>v===true)&&Array.isArray(SP.ui.pb.off)&&!SP.ui.pb.off.length&&SP.ui.pb.gx===null,'a damaged saved choice did not read as everything ticked');
      console.log('I3. suggested parlays: the bet types, the games and the open list come back after a reload; a damaged save reads as all ticked'); }
    /* I4. the amount bet comes back with the page, and a saved one that is not an amount (an old or
       hand-edited state, on the same bake or across a rebuild) reads as $20 in the state, the Bet
       amount box and the builder alike */
    { const box=()=>d.getElementById('pbStake'), cases=[[12.5,12.5],['abc',20],[-4,20],[0,20],[null,20],['<b>',20],[{},20],[250000,100000]];
      for(const [saved,want] of cases) for(const same of [true,false]){
        mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:same?F('DATA_BUILD'):'old-build',dataStamp:F('DATA_STAMP'),stake:saved,ui:{}});
        await F('boot')(); const SP=w.eval('S'); d.querySelector('#tabs button[data-tab="parlay"]').click(); w.eval('renderParlay()');
        const shown=box()?box().value:null, txt=want%1?want.toFixed(2):String(want);
        chk(SP.stake===want&&(!F('pbGames')().length||shown===txt)&&!/NaN|Infinity/.test(d.getElementById('pbPanel').textContent),
          `a saved amount ${JSON.stringify(saved)} ${same?'on the same bake':'across a rebuild'} came back as ${JSON.stringify(SP.stake)} (the box ${JSON.stringify(shown)}), not ${want}`); }
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),ui:{}}); await F('boot')();
      chk(w.eval('S').stake===20,'with no amount saved the page does not start on $20');
      console.log(`I4. the amount bet: kept across a reload; ${cases.length-2} saved values that are not an amount read as $20 and one over the most as $100,000, on the same bake and across a rebuild`); }
    /* I2. a new bake of the same model rebuilds the season and says nothing about it: the job
       publishes several times a week, and every one of those has to reach every device */
    { const stamp=F('DATA_STAMP');
      chk(!!stamp&&stamp!=='baseline','the payload carries no bake time to key freshness on');
      chk(stamp===(PAY.baked_at||F('DATA_BUILD')),'the freshness key is not the bake time');
      /* saved under the same model and rosters, but an older bake */
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:'2000-01-01T00:00',
        stake:41,parlay:{'g|p|s':{p:0.5}},processedGames:{'stale-game':true},actuals:{'1':{x:1}},
        projections:{'stale':1},processed:{'1':true}});
      await F('boot')(); let SN=w.eval('S');
      chk(SN.dataStamp===stamp,'a stale bake was not adopted');
      chk(!SN.processedGames['stale-game'],'a stale bake kept the browser\'s old graded games');
      chk(!SN.projections.stale,'a stale bake kept the browser\'s old projections');
      chk(SN.stake===41&&SN.parlay['g|p|s'],'a stale bake lost what the visitor made');
      chk(d.getElementById('rebuildNote').hidden,'a routine re-bake shouted about itself');
      /* the same bake is reused rather than rebuilt: the fast path still exists */
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:stamp,
        stake:42,processedGames:{'kept-game':true}});
      await F('boot')(); SN=w.eval('S');
      chk(SN.processedGames['kept-game']&&SN.stake===42,'an unchanged bake was rebuilt anyway');
      chk(d.getElementById('rebuildNote').hidden,'an unchanged bake showed a note');
    }
    console.log(`I. built-in data: ${bakedWeeks.length} week(s) of stats (${b1.stats.length} games), ${b1.prices} prices, ${b1.inj} inactives, ${b1.sched} schedule fields; replay is a no-op; parlays/stake/prices survive a rebuild`);
    /* ---- T. live tracking: every bit of it pure, so none of it needs a network ---- */
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
      chk(pen&&pen.any_td===0,'a quarterback\'s touchdown passes were counted as touchdowns he scored: '+(pen&&pen.any_td));
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
      chk(mp['2026_02_CAR_ATL'].kick===null,'a scoreboard with no date should leave the kickoff null, not NaN');
      { const SBD=JSON.parse(JSON.stringify(SB)); SBD.events[0].date='2026-09-20T17:00Z';
        const k=espnGames(SBD,[{id:'2026_02_CAR_ATL',h:'ATL',a:'CAR',w:2}])['2026_02_CAR_ATL'].kick;
        chk(k===Date.parse('2026-09-20T17:00Z'),'the kickoff time did not come through'); }
      chk(Object.keys(espnGames(SB,[{id:'x',h:'KC',a:'BUF',w:2}])).length===0,'an unrelated game was matched anyway');
      /* every code our schedule uses has to survive the map, or that team's games never
         appear on any of the three sites. The Rams did not: ESPN_AB turned our own LA into
         LAR, which matches nothing, so no Rams game was ever mapped. */
      { const espnAb=F('espnAb'), ours=new Set();
        for(const g2 of S.sched){ ours.add(g2.h); ours.add(g2.a); }
        const lost=[...ours].filter(t=>espnAb(t)!==t&&!ours.has(espnAb(t)));
        chk(lost.length===0,'the abbreviation map sends our own code somewhere we do not use: '+lost.join(', '));
        /* and the codes ESPN is known to differ on land on one of ours */
        for(const [from,to] of [['WSH','WAS'],['LAR','LA'],['JAC','JAX']])
          chk(ours.has(espnAb(from))&&espnAb(from)===to,
            'ESPN\u2019s '+from+' does not map onto a team we have (got '+espnAb(from)+')');
        /* a whole week must map, not most of it */
        const wk=S.sched.filter(g2=>+g2.w===2);
        const SBW={events:wk.map((g2,i)=>({id:'5'+i,competitions:[{status:{type:{state:'in',shortDetail:'Q1'}},
          competitors:[{homeAway:'home',team:{abbreviation:g2.h},score:'7'},
                       {homeAway:'away',team:{abbreviation:g2.a},score:'3'}]}]}))};
        chk(Object.keys(espnGames(SBW,wk)).length===wk.length,
          'only '+Object.keys(espnGames(SBW,wk)).length+' of '+wk.length+' games in a week mapped'); }
      /* the scoreboard is someone else's: it must never reach what we save */
      chk(!/"state":"(live|post|pre)"/.test(JSON.stringify(S.saved||[])),'live data reached a saved parlay');
      console.log('T. live tracking: box score, name matching, leg states and scoreboard mapping all parse'); }

    /* ---- T2. the Games tab reads the scoreboard when asked, and not before ---- */
    { const LIVE=F('LIVE');
      chk(!!d.getElementById('slateNow')&&!!d.getElementById('slateStamp'),'the Games tab has no Refresh scores button');
      chk(!d.getElementById('slateEvery')&&!d.getElementById('slateDot'),'the Games tab still has the timed scores picker');
      chk(LIVE.slate===false,'the Games tab starts with the scoreboard off');
      { const st0=d.getElementById('slateStamp').textContent;
        chk(st0===''||st0==='scores off','the stamp claims a scoreboard read before one was asked for: '+st0); }
      /* with it off, a started game reads exactly as it did before there was a scoreboard */
      const started=S.sched.filter(g=>F('gameStarted')(g)&&!F('gameFinal')(g));
      const wk=started.length?started[0].w:null;
      /* the fetch the page would make: serve a scoreboard for whichever week is on screen,
         and fail any box-score call, since the slate must never ask for one */
      let sbCalls=0, sumCalls=0;
      const realFetch=w.fetch;
      w.fetch=u=>{ const s2=String(u);
        if(s2.indexOf('/summary?')>=0){ sumCalls++; return Promise.reject(new Error('no box score for a slate')); }
        if(s2.indexOf('scoreboard')>=0){ sbCalls++;
          const shown=F('slateWeek')();
          /* the scoreboard says what is happening, which is not always what our schedule
             thinks: a game we call final by the clock is reported post, one still running
             is reported in, and the card must follow ESPN rather than the clock */
          return Promise.resolve({ok:true,status:200,json:async()=>({events:F('gamesIn')(shown).map((g,i)=>{
            const over=F('gameFinal')(g);
            return {id:'9'+i, date:'2026-09-20T17:00Z',
              competitions:[{status:{type:{state:over?'post':'in',shortDetail:over?'Final':'Q2 4:01'}},competitors:[
                {homeAway:'home',team:{abbreviation:g.h},score:'21'},
                {homeAway:'away',team:{abbreviation:g.a},score:'13'}]}]};})})});
        }
        return realFetch(u); };
      if(wk!=null){
        const ws=d.getElementById('weekSel');
        if(ws.value!==String(wk)){ ws.value=String(wk); ws.dispatchEvent(new w.Event('change')); }
        const shownWk=wk;
        const before=d.querySelector('[data-game="'+started[0].id+'"] .when').textContent;
        chk(/LIVE/.test(before),'a started game should read LIVE until the scoreboard is read: '+before);
        d.getElementById('slateNow').click();
        await new Promise(r=>setTimeout(r,120));
        const after=d.querySelector('[data-game="'+started[0].id+'"] .when').textContent;
        chk(/13.21/.test(after),'the score did not reach the card: '+after);
        chk(/Q2 4:01/.test(after),'the clock did not reach the card: '+after);
        chk(sbCalls===1,'the slate asked for the scoreboard '+sbCalls+' times, not once');
        chk(sumCalls===0,'the slate fetched '+sumCalls+' box score(s); a game card needs none');
        chk(/^scores \d/.test(d.getElementById('slateStamp').textContent),
          'the stamp does not say when the scores were read: '+d.getElementById('slateStamp').textContent);
        /* someone else's scoreboard must not reach what we save */
        chk(!/"clock"/.test(JSON.stringify(S)),'the scoreboard reached the saved state');
        /* a finished game is not a live one: ESPN carries the final score for hours before
           nflverse posts the stats that settle it, and it must not be labelled live */
        { const done=S.sched.filter(g2=>+g2.w===+shownWk&&F('gameFinal')(g2));
          for(const g2 of done){
            const card=d.querySelector('[data-game="'+g2.id+'"]'); if(!card) continue;
            chk(!/\bLIVE\b/.test(card.querySelector('.when').textContent),
              'a finished game still reads LIVE: '+g2.id);
            const lv=card.querySelector('.tot .lv');
            chk(!lv||/^final /.test(lv.textContent),
              'a finished game calls its score live: '+g2.id+' '+(lv&&lv.textContent)); } }
      }
      /* a week is graded a game at a time: one game's stats must never speak for another */
      { const wks=Object.keys(S.actuals||{});
        for(const wname of wks){
          const inWeek=F('gamesIn')(+wname);
          const graded=inWeek.filter(g2=>S.processedGames&&S.processedGames[g2.id]);
          chk(graded.length>0,'week '+wname+' has actuals but no game marked graded');
          if(graded.length<inWeek.length){
            /* the mixed case, which is every Sunday: opening an ungraded game must not
               show it as played */
            const nope=inWeek.find(g2=>!(S.processedGames&&S.processedGames[g2.id]));
            chk(!!nope,'expected an ungraded game in week '+wname);
          }
        }
        console.log(`S2. grading is per game: ${Object.keys(S.processedGames||{}).length} game(s) graded across ${wks.length} week(s) with actuals`); }

      /* ---- T3. a game in progress reads its box score on the button ---- */
      if(wk!=null){
        const live=S.sched.filter(g2=>+g2.w===+wk&&F('gameStarted')(g2)&&!F('gameFinal')(g2));
        const g3=live[0];
        if(g3){
          /* the box score ESPN would serve for this game: one real player off our own roster,
             so the name matching is exercised rather than stubbed around */
          const ros=F('rosterFor')(g3,false);
          const team=Object.keys(ros).find(t=>ros[t].players.length);
          const who=team&&ros[team].players[0];
          let boxCalls=0;
          w.fetch=u=>{ const s2=String(u);
            if(s2.indexOf('/summary?')>=0){ boxCalls++;
              /* every group, because the first man on the roster may be any position and the
                 row shows the headline stats for his: a passer must get a passing line */
              return Promise.resolve({ok:true,status:200,json:async()=>({boxscore:{players:[
                {team:{abbreviation:team},statistics:[
                  {name:'passing',labels:['C/ATT','YDS','AVG','TD','INT'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['18/27','241','8.9','2','1']}]},
                  {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['12','78','6.5','1','21']}]},
                  {name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['3','29','9.7','0','14','5']}]},
                  {name:'kicking',labels:['FG','PCT','LONG','XP','PTS'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['2/3','66.7','48','3/3','9']}]}]}]}})});
            }
            if(s2.indexOf('scoreboard')>=0){
              return Promise.resolve({ok:true,status:200,json:async()=>({events:[{id:'777',date:'2026-09-20T17:00Z',
                competitions:[{status:{type:{state:'in',shortDetail:'Q3 2:15'}},competitors:[
                  {homeAway:'home',team:{abbreviation:g3.h},score:'19'},
                  {homeAway:'away',team:{abbreviation:g3.a},score:'12'}]}]}]})});
            }
            return realFetch(u); };
          d.querySelector('[data-game="'+g3.id+'"]').click();
          chk(!!d.getElementById('gameStatsNow'),'a game in progress has no Refresh stats button');
          const before=d.querySelector('[data-open="'+who.pl.id+'"] .sum').textContent;
          chk(/projected/.test(before),'a player should read projected until the box score is read: '+before);
          d.getElementById('gameStatsNow').click();
          await new Promise(r=>setTimeout(r,150));
          const after=d.querySelector('[data-open="'+who.pl.id+'"] .sum').textContent;
          chk(/241|78|29|9/.test(after.replace(/proj[^)]*\)/g,'')),
            'no live number reached the row: '+after);
          chk(/proj/.test(after),'the live line dropped the projection it is read against: '+after);
          chk(!/projected$/.test(after.trim()),'the row still says only projected');
          chk(boxCalls===1,'the modal fetched '+boxCalls+' box scores for one game, not 1');
          chk(/12, /.test(d.querySelector('#gameView .card').textContent)
              ||/19/.test(d.querySelector('#gameView .card').textContent),
            'the live score did not reach the status card');
          /* and none of it settles anything */
          chk(!(S.actuals&&S.actuals[String(g3.w)]&&S.actuals[String(g3.w)][who.pl.id]),
            'a live box score was written into S.actuals');
          chk(!/"clock"/.test(JSON.stringify(S)),'the scoreboard reached the saved state');
          /* an ungraded game must not claim stats its week happens to hold for another game */
          chk(!/did not play/.test(d.getElementById('gameView').textContent),
            'a game still being played says a player did not play');
          d.getElementById('backBtn').click();
        }
        console.log('T3. game modal: '+(g3?'live box score on the button, one call, nothing settled':'no game in progress to drive'));
      }
      w.fetch=realFetch;
      console.log(`T2. games tab scores: button present, no timed picker, off, ${wk==null?'no live game this week to drive':'score and clock on the card, one scoreboard call, no box scores'}`); }

    /* ---- U. the betting model's parlays, read across from its key ---- */
    { const bp=F('bettingParlays');
      const blob=JSON.stringify({bank:{build:[
        {id:'b1',week:2,type:'parlay',stake:25,legs:[
          {game_id:'2026_02_CAR_ATL',away:'CAR',home:'ATL',pick:'ATL',ml:-150,conf:'MED'},
          {game_id:'2026_02_KC_BUF',away:'KC',home:'BUF',pick:'KC',ml:120,conf:'HIGH'}]},
        {id:'b2',week:2,type:'single',stake:10,legs:[{game_id:'2026_02_KC_BUF',away:'KC',home:'BUF',pick:'BUF',ml:-110}]},
        {id:'b3',week:2,type:'parlay',stake:5,legs:[{game_id:'2026_02_KC_BUF',away:'KC',home:'BUF',pick:'BUF',ml:-110}]},
        {id:'b4',week:2,type:'parlay',stake:5,legs:[{pick:'ATL'},{game_id:'2026_02_KC_BUF',pick:'BUF',ml:-110}]}]}});
      const got=bp(blob);
      chk(got.length===1&&got[0].id==='b1','the betting parlay reader did not pick out exactly the one good parlay');
      chk(got[0].legs.length===2&&got[0].legs[0].gid==='2026_02_CAR_ATL','a betting leg lost its game id');
      chk(got[0].legs.every(l=>l.stat==='ml'&&l.grp==='TEAM'&&l.label==='To win'),'a betting leg is not shaped like a team leg');
      chk(got[0].legs[0].team==='ATL'&&got[0].legs[1].team==='KC','the picked side came through wrong');
      chk(got[0].stake===25&&got[0].priced,'stake or pricing wrong on a betting parlay');
      chk(Math.abs(got[0].dec-(F('mlToDec')(-150)*F('mlToDec')(120)))<1e-9,'the parlay price is not the legs multiplied');
      chk(Math.abs(got[0].payout-25*got[0].dec)<1e-9,'the payout does not follow the price');
      /* a single, a one-leg "parlay" and a leg with no game are all skipped, not guessed at */
      chk(!got.some(p=>p.id==='b2'||p.id==='b3'),'a single or a one-leg parlay was treated as a parlay');
      chk(bp('not json')  .length===0&&bp('').length===0&&bp(null).length===0,'malformed storage was not survived');
      chk(bp(JSON.stringify({bank:{}})).length===0&&bp(JSON.stringify({bank:{build:'x'}})).length===0,'a missing or wrong-typed build was not survived');
      /* the live poll must ask for those games too */
      chk(/bettingParlays\(\)/.test(String(F('liveWanted'))),'the live poll does not cover betting parlays');
      /* and none of it may reach our own state */
      chk(!(S.saved||[]).some(p=>p.id==='b1'),'a betting parlay was copied into our saved parlays');
      console.log(`U. betting parlays: ${got.length} read from a fixture, singles and malformed entries skipped`); }

    /* ---- V. reality: the page a browser builds from this payload, checked against the files the
       job downloads into raw/ and against rules that hold in any week. None is about this week's
       particulars: a lean week, a bye, week 1, a week whose report is not filed yet or a game
       already played cannot fail one. The raw comparisons run when PROPS_AUDIT_RAW=1, which
       weekly.py sets once it has downloaded raw/ for the payload it just baked (they are the same
       moment, so the two must agree); by hand they are skipped, and the rest still run. ---- */
    try{ await (async()=>{
      const NEED=process.env.PROPS_AUDIT_RAW==='1', path=require('path'), SKILL=new Set(['QB','RB','WR','TE','K','FB','HB']);
      const PAY=w.eval('PAY');   /* the page's own: section I re-booted it, so the one read at the top is an older copy */
      const SEASON=F('SEASON'), skipped=[], notPosted=[];
      /* the two files nflverse has no copy of before the season: weekly.py lists one it found not
         posted yet (a 404, with none of it published this season) in PAY.not_posted, and then it
         is not compared; V0b checks the payload holds none of it and the page says so */
      const NP=new Set(PAY.not_posted||[]), KIND={[`pw_${SEASON}.csv`]:'stats',[`injuries_${SEASON}.csv`]:'injuries'};
      const raw=f=>{ if(!NEED){ skipped.push(f); return null; } const p=path.join(__dirname,'..','raw',f);
        if(KIND[f]&&NP.has(KIND[f])){ notPosted.push(f); chk(!fs.existsSync(p),`raw/${f} is in the payload's not_posted, yet the job downloaded it`); return null; }
        if(!fs.existsSync(p)){ chk(false,`raw/${f} is missing: the job downloads it before the audit runs`); return null; }
        return Papa.parse(fs.readFileSync(p,'utf8'),{header:true,skipEmptyLines:true}).data; };
      const dataCsv=f=>{ const p=path.join(__dirname,'..','data',f); return fs.existsSync(p)?Papa.parse(fs.readFileSync(p,'utf8'),{header:true,skipEmptyLines:true}).data:null; };
      const rRoster=raw(`roster_${SEASON}.csv`), rInj=raw(`injuries_${SEASON}.csv`), rStats=raw(`pw_${SEASON}.csv`), rGames=raw('games.csv');
      /* the page exactly as a browser builds it on a first visit */
      w.eval('S=freshState(); NORM=null; INJ={}; RSTAT={}; GAME_TIER_CACHE={}');
      w.eval('applyBaked()'); const SV=w.eval('S');
      /* a book's name against a player's, the rule build/names.py matches with, closest first: one of
         his printed names (his full name, his football name with his surname: 'exact'), his legal
         form (his first name with his surname: 'first', which the job takes only when no printed
         name in the game is the book's), or one of them with only a short first name (Cam for
         Cameron) or a nickname from build/nicknames.json, the job's own table (Drew for Andrew), or
         a two-word one with its words swapped (James Jordan for Jordan James). alias is another
         printed name, a list of them, or {names, legal} with his legal form apart */
      const nrm=s=>String(s||'').normalize('NFKD').replace(/[^ -~]/g,'').toLowerCase().replace(/[.'`-]/g,'').replace(/\s+/g,' ').trim().replace(/\s+(jr|sr|ii|iii|iv|v)$/,'').trim();
      const NICK={}; for(const [given,nicks] of Object.entries(require('./nicknames.json'))) if(!given.startsWith('_')) for(const n of nicks){ (NICK[given]??=new Set()).add(n); (NICK[n]??=new Set()).add(given); }
      const shortForm=(a,b)=>{ if(!a||!b) return false; const [lo,hi]=a.length<=b.length?[a,b]:[b,a]; let c=0; while(c<a.length&&c<b.length&&a[c]===b[c]) c++; return (lo.length>=3&&hi.startsWith(lo))||c>=4||!!(NICK[a]&&NICK[a].has(b)); };
      const nameRule=(book,full,alias)=>{ const b=nrm(book); if(!b) return null;
        const al=alias&&typeof alias==='object'&&!Array.isArray(alias)?alias:{names:[alias].flat()};
        const pr=[full,...(al.names||[])].filter(Boolean).map(nrm).filter(Boolean), lg=nrm(al.legal);
        if(pr.includes(b)) return 'exact'; if(lg&&b===lg) return 'first';
        const bp=b.split(' '); if(bp.length<2) return null; const sp=[...pr,lg].filter(Boolean).map(f=>f.split(' '));
        if(sp.some(pp=>pp.length>=2&&bp.slice(1).join(' ')===pp.slice(1).join(' ')&&shortForm(bp[0],pp[0]))) return 'short';
        return bp.length===2&&sp.some(pp=>pp.length===2&&pp[0]===bp[1]&&pp[1]===bp[0])?'swapped':null; };
      chk(nameRule('Cam Ward','Cameron Ward')&&nameRule('Kenny Gainwell','Kenneth Gainwell')&&nameRule('A.J. Brown','AJ Brown')==='exact'&&!nameRule('Jalon Daniels','Jayden Daniels')&&!nameRule('Jeremiyah Love','Jordan Love')&&!nameRule('Kevin Coleman Jr.','Keon Coleman')&&!nameRule('Brian Robinson Jr.','Bijan Robinson'),'the name rule lets a different player through, or stops a short name');
      chk(nameRule('Drew Ogletree','Andrew Ogletree')==='short'&&nameRule('Zonovan Knight','Bam Knight',{legal:'Zonovan Knight'})==='first'&&nameRule('Michael Thomas','Mike Thomas',{legal:'Michael Thomas'})==='first'&&nameRule('Mike Thomas','Michael Thomas')==='short'&&nameRule('James Jordan','Jordan James')==='swapped'&&!nameRule('Zonovan Knight','Bam Knight')&&!nameRule('Rick Henry','Derrick Henry')&&!nameRule('Ian Thomas','Brian Thomas')&&!nameRule('Drew Jordan','Andrew James')&&!nameRule('James Jordan Smith','Jordan James Smith')&&!nameRule('Andrew Ogletree','Drew Sample'),'the name rule\'s other names, nicknames or swapped names let a different player through, or stop his own');
      const R=PAY.roster||null, rawRo={}; for(const r of (rRoster||[])) if(r.gsis_id) rawRo[r.gsis_id]=r;
      /* his other names: the downloaded roster's where the job has it (the same rule as names.py's
         names_of), else the ones the payload's roster entry carries after the week (his football
         name with his surname, or null, then his legal form) */
      const fbName=r=>r.football_name&&r.football_name!==r.first_name?`${r.football_name} ${r.last_name}`:null;
      const who=pid=>{ const e=R&&R[pid], r=rawRo[pid], p=SV.players[pid];
        return {name:(e&&e[2])||(r&&r.full_name)||(p&&p.n)||'', alias:{names:r?[fbName(r)].filter(Boolean):(e&&e[4]?[e[4]]:[]),
                legal:r?(r.first_name&&r.last_name?`${r.first_name} ${r.last_name}`:null):((e&&e[5])||null)}}; };
      const rstat=pid=>{ const e=R&&R[pid]; if(e) return {st:e[1],wk:+e[3]}; const r=rawRo[pid]; return r?{st:r.status,wk:+r.week}:null; };
      const cw=F('currentWeek')(), openG=SV.sched.filter(g=>+g.w===cw&&!F('gameStarted')(g));
      const gOf=id=>SV.sched.find(g=>g.id===id), gamesInWeek=wk=>SV.sched.filter(g=>+g.w===+wk).map(g=>g.id);
      /* who will not play by the sources' own word, worked out here from the roster and the report and
         never from the page's reading of them: V1 adds the released and this week's inactive, V5 the
         held out after their club's last report, and V6 holds every suggested leg and candidate to it,
         blocking, while V1's, V4's and V5's checks of who the page lists are warnings */
      const NOPLAY=new Map();

      /* V0. one season, one week: the payload is for the page's SEASON and the schedule's week */
      { chk(PAY.season==null?!NEED:+PAY.season===SEASON,`the payload is for season ${PAY.season}, the page for ${SEASON}`);
        const unplayed=PAY.sched.filter(g=>!(g.hs!=null&&g.as!=null)).map(g=>+g.w);
        const wk=unplayed.length?Math.min(...unplayed):Math.max(...PAY.sched.map(g=>+g.w));
        if(PAY.week!=null) chk(+PAY.week===wk,`the payload was baked for week ${PAY.week}, its schedule says ${wk}`); else chk(!NEED,'the payload does not say which week it was baked for');
        if(PAY.season_over!=null) chk(!!PAY.season_over===!unplayed.length,'season_over does not match the schedule');
        if(rGames){ const gs=rGames.filter(r=>+r.season===SEASON&&r.game_type==='REG');
          chk(gs.length===PAY.sched.length&&gs.every(r=>!!gOf(r.game_id)),`the payload's schedule (${PAY.sched.length} games) is not games.csv's ${SEASON} regular season (${gs.length})`);
          const fin=gs.filter(r=>String(r.home_score).trim()!=='').length, pfin=PAY.sched.filter(g=>g.hs!=null).length;
          chk(pfin===fin,`the payload has ${pfin} final scores, the downloaded schedule ${fin}`); }
        console.log(`V0. season ${PAY.season} for a page built for ${SEASON}; week ${PAY.week} is the schedule's ${wk}${PAY.season_over?'; the season is over':''}`); }

      /* V0b. a file not posted yet: only the stats or the injury report (nflverse has neither
         before the season), the payload then holds none of it, and the slate says it is missing
         rather than show an empty report as a week with nobody hurt */
      { const np=[...NP];
        chk(np.every(k=>k==='stats'||k==='injuries'),`not_posted lists ${np.join(', ')}: only the stats and the injury report can be not posted yet`);
        if(NP.has('stats')) chk(!Object.values(PAY.stats||{}).some(r=>r&&r.length),'the stats are said to be not posted, yet the payload carries some');
        if(NP.has('injuries')) chk(!(PAY.injuries||[]).length,'the injury report is said to be not posted, yet the payload carries rows');
        const keep=PAY.not_posted, txt=()=>d.getElementById('gamesList').textContent, anyFinal=SV.sched.some(g=>F('gameFinal')(g));
        try{ PAY.not_posted=['injuries','stats']; F('renderSlate')();
          chk(/has not posted the \d{4} injury report yet/.test(txt()),'the slate does not say the injury report is not posted yet');
          chk(/has not posted this season's player stats yet/.test(txt())===anyFinal,'the slate says the stats are not posted when no game is final, or does not say it once one is');
          PAY.not_posted=[]; F('renderSlate')();
          chk(!/has not posted/.test(txt()),'the slate says a file is not posted when the payload lists none'); }
        finally{ PAY.not_posted=keep; F('renderSlate')(); }
        console.log(`V0b. not posted yet: ${np.length?np.join(' and ')+', none of it in the payload, and the slate says so':'nothing; the slate says so only when the payload lists a file'}`); }

      /* V1. who is listed: nobody on a reserve list, released, retired or inactive this week; a
         practice-squad player starts only with a chart place or a game in the two weeks before */
      { let listed=0; const bad=[], dev=[];
        /* the raw file's latest week, and the clubs with rows in it: a row left behind at an older
           week by a club that has moved on is a released player */
        const LW=Math.max(0,...(rRoster||[]).map(r=>+r.week||0)), filed=new Set((rRoster||[]).filter(r=>+r.week===LW).map(r=>r.team));
        const stale=pid=>{ const r=rawRo[pid]; return !!r&&(r.status==='ACT'||r.status==='DEV')&&+r.week<LW&&filed.has(r.team); };
        for(const g of openG){ const r=F('rosterFor')(g,true);
          for(const t in r) for(const x of r[t].players){ listed++; const s=rstat(x.pl.id);
            if(s&&s.st!=='ACT'&&s.st!=='DEV'&&!(s.st==='INA'&&s.wk!==cw)) bad.push(`${g.id} ${x.pl.n} ${s.st}`);
            if(stale(x.pl.id)) bad.push(`${g.id} ${x.pl.n} released (roster row from week ${rawRo[x.pl.id].week})`);
            if(x.starter&&s&&s.st==='DEV'&&x.rank==null&&![cw-1,cw-2].some(k=>F('actualFor')(k,x.pl.id))) dev.push(`${g.id} ${x.pl.n}`); } }
        W.starters(!bad.length,`players the roster has on a reserve list, released or inactive are on this week's pages: ${bad.length} (${bad.slice(0,5).join('; ')})`);
        /* for V6: released (a row left at an older week, in the download or the payload's table, by a
           club that has rows in the latest), inactive this week, and on no roster in a whole-league table */
        for(const pid in rawRo) if(stale(pid)) NOPLAY.set(pid,`released (roster row from week ${rawRo[pid].week})`);
        if(R){ const LWp=Math.max(0,...Object.values(R).map(e=>+(e&&e[3])||0)), filedP=new Set(Object.values(R).filter(e=>e&&+e[3]===LWp).map(e=>e[0]));
          for(const [id,e] of Object.entries(R)){ if(!e) continue;
            if((e[1]==='ACT'||e[1]==='DEV')&&LWp&&+e[3]<LWp&&filedP.has(e[0])) NOPLAY.set(id,`released (roster row from week ${e[3]})`);
            if(e[1]==='INA'&&+e[3]===cw) NOPLAY.set(id,'inactive this week'); }
          if(Object.keys(R).length>800) for(const id in SV.players) if(!R[id]) NOPLAY.set(id,'on no roster'); }
        W.starters(!dev.length,`practice-squad players with no chart place and no recent game start: ${dev.slice(0,5).join('; ')}`);
        if(rRoster){ let diff=0, n=0;
          for(const r of rRoster){ if(!r.gsis_id||!SKILL.has(String(r.position).toUpperCase())) continue; n++; const e=R&&R[r.gsis_id]; if(!e||e[0]!==r.team||e[1]!==r.status) diff++; }
          chk(diff===0,`${diff} of ${n} skill players' team or status in the payload differ from the downloaded roster`);
          /* the page rules a player out as "on no roster" when the payload's table lacks him, so it
             must hold everyone the page has who is on a roster, whatever position the roster gives */
          const lacks=Object.values(SV.players).filter(p=>rawRo[p.id]&&!(R&&R[p.id])).map(p=>`${p.n} (${rawRo[p.id].position})`);
          chk(!lacks.length,`${lacks.length} players on the page and on the downloaded roster are not in the payload's roster table, so they read "on no roster": ${lacks.slice(0,4).join(', ')}`); }
        /* the rule on any week: a starter put on a reserve list leaves the page, and the same man on
           the practice squad with no chart place and no recent game is no starter */
        const g0=openG[0]||SV.sched[SV.sched.length-1], t0=g0.h, st=F('rosterFor')(g0,false)[t0].players.find(x=>x.starter&&x.pl.grp!=='K');
        if(st){ const id=st.pl.id, fake=Object.assign({},PAY.roster||{});
          fake[id]=[t0,'RES',st.pl.n,cw]; F('applyRoster')(fake);
          const r1=F('rosterFor')(g0,false)[t0];
          chk(!F('rosterFor')(g0,true)[t0].players.some(x=>x.pl.id===id),`a starter put on a reserve list (${st.pl.n}) is still on his game's page`);
          const gap=r1.gaps.find(x=>x.id===id); chk(!gap||/^ruled out \(on a reserve list\)/.test(gap.why),`a starter on a reserve list reads "${gap&&gap.why}"`);
          fake[id]=[t0,'DEV',st.pl.n,cw]; F('applyRoster')(fake);
          const dep=PAY.depth&&PAY.depth[id], a1=SV.actuals[String(cw-1)]&&SV.actuals[String(cw-1)][id], a2=SV.actuals[String(cw-2)]&&SV.actuals[String(cw-2)][id];
          if(dep) delete PAY.depth[id]; if(a1) delete SV.actuals[String(cw-1)][id]; if(a2) delete SV.actuals[String(cw-2)][id];
          try{ chk(!F('rosterFor')(g0,false)[t0].players.some(x=>x.pl.id===id),`a practice-squad player with no chart place and no recent game (${st.pl.n}) starts`); }
          finally{ if(dep) PAY.depth[id]=dep; if(a1) SV.actuals[String(cw-1)][id]=a1; if(a2) SV.actuals[String(cw-2)][id]=a2; F('applyRoster')(PAY.roster); } }
        console.log(`V1. roster status: ${listed} listed on ${openG.length} games still to play, none on a reserve list or released; ${R?Object.keys(R).length:0} statuses${rRoster?', equal to the downloaded roster':''}; a reserve-list starter and an unelevated practice-squad player both leave the starters`); }

      /* V2. every main line on the page is the book's line for that player: its name is his, its
         game is his, and the book's own file agrees */
      { let n=0, named=0; const bad=[];
        for(const wk in (PAY.mkt||{})){ const lines=dataCsv(`wk${wk}_lines.csv`);
          for(const pid in PAY.mkt[wk]) for(const st in PAY.mkt[wk][pid]){ const L=PAY.mkt[wk][pid][st]; n++; const p=who(pid);
            if(L.n!=null||PAY.mkt_v>=2){ named++;
              const g=L.g?gOf(L.g):null, act=SV.actuals[wk]&&SV.actuals[wk][pid];
              const team=act?act.team:(+wk>=cw?((R&&R[pid]&&R[pid][0])||(SV.players[pid]&&SV.players[pid].team)):null);
              if(!L.n||!nameRule(L.n,p.name,p.alias)) bad.push(`wk${wk} ${p.name||pid} ${st} carries ${L.n||'no'} book name`);
              else if(L.g&&(!g||+g.w!==+wk||(team&&g.a!==team&&g.h!==team))) bad.push(`wk${wk} ${p.name} ${st}: ${L.g} is not his game`); }
            if(lines){ const rows=lines.filter(r=>r.stat===st&&+r.line===+L.line&&+r.over===+L.over&&+r.under===+L.under);
              if(rows.length&&!rows.some(r=>nameRule(r.player,p.name,p.alias))) bad.push(`wk${wk} ${p.name||pid} ${st} ${L.line} is ${[...new Set(rows.map(r=>r.player))].join('/')}'s line in wk${wk}_lines.csv`); } } }
        chk(!bad.length,`main lines on the wrong player: ${bad.length} (${bad.slice(0,4).join('; ')})`);
        chk(!NEED||PAY.mkt_v>=2,'the job baked main lines that do not carry the book\'s name and game');
        console.log(`V2. main lines: ${n} checked against the book's own files, ${named} carry the book's name and game, ${bad.length} on the wrong player`); }

      /* V3. prices: every row the job placed on a player reaches the page, under that player, and a
         row on a game still to play that no player took is reported, never dropped quietly */
      { let rows=0, expect=0, landed=0; const bad=[], foreign=[];
        const mk=F('marketKey');
        for(const wk in (PAY.prices||{})) for(const r of PAY.prices[wk]){ rows++; const g=gOf(r.game_id);
          if(!g||+g.w!==+wk) foreign.push(`wk${wk} ${r.player} (${r.game_id})`);
          if(r.pid){ const p=who(r.pid); if(!nameRule(r.player,p.name,p.alias)) bad.push(`${r.player} placed on ${p.name||r.pid}`);
            const o=parseFloat(r.odds), k=parseFloat(r.threshold), m=mk(r.market);
            if(g&&m&&isFinite(o)&&o!==0&&isFinite(k)){ expect++; const v=SV.odds[g.id]&&SV.odds[g.id][r.pid]&&SV.odds[g.id][r.pid][m]; if(v&&v[String(k)]!=null) landed++; } }
          else if(PAY.mkt_v>=2&&g&&!F('gameStarted')(g)&&!/(d\/st|defen[cs]e)$/i.test(String(r.player).trim())&&!(PAY.unmatched||[]).some(u=>u.startsWith(r.player+' (')))
            bad.push(`${r.player} (${r.game_id}) is on no player and not reported`); }
        chk(!bad.length,`price rows: ${bad.length} wrong or unreported (${bad.slice(0,4).join('; ')})`);
        chk(landed===expect,`${expect-landed} of ${expect} price rows placed on a player never reached the page`);
        chk(!foreign.length,`${foreign.length} price rows are for a game not in their week of this season's schedule (${foreign.slice(0,4).join('; ')}): last season's files at a rollover?`);
        /* the rule on any week: a row naming a game the week does not have (last season's game of
           the same week, at a rollover) is dropped, never matched by name onto this week's game */
        const g=openG[0]||SV.sched.find(x=>+x.w===cw), x=g&&Object.values(F('rosterFor')(g,true)).flatMap(t=>t.players).find(x=>x.pl.grp!=='K');
        if(x){ const other=g.id.replace(/^\d{4}/,String(SEASON-1)), wk=+g.w;
          try{ F('ingestOdds')([{game_id:other,player:x.pl.n,market:'receptions',threshold:'3',odds:'-150'},{game_id:other,player:x.pl.n,pid:x.pl.id,market:'receptions',threshold:'4',odds:'+150'}],wk);
            chk(!Object.keys(SV.odds).some(id=>gamesInWeek(wk).includes(id)&&SV.odds[id]&&SV.odds[id][x.pl.id]),`a price row for ${other} was put on this season's ${g.id}`); }
          finally{ F('ingestOdds')((PAY.prices||{})[String(wk)]||[],wk); } }
        console.log(`V3. prices: ${rows} rows, all of this season's games, ${expect} placed on a player and all ${landed} on the page; a row for another season's game is not shown`); }

      /* V4. a ruled-out player is never "not enough games played", and the man the chart moves up
         starts however few games he has */
      { let n=0; const bad=[];
        for(const g of SV.sched.filter(x=>+x.w===cw)){ const r=F('rosterFor')(g,false);
          for(const t in r) for(const gp of r[t].gaps){ n++; const off=gp.id&&SV.inactive[gp.id];
            if(off&&!/^ruled out/.test(gp.why)) bad.push(`${gp.name} (${gp.slot}): ${gp.why}`);
            if(!off&&/^ruled out/.test(gp.why)) bad.push(`${gp.name} is not out but reads "${gp.why}"`); } }
        W.starters(!bad.length,`gap notes that misstate why a player is not shown: ${bad.slice(0,4).join('; ')}`);
        const D=PAY.depth||{}; let tried=0, ok=0, noHist=0;
        for(const team of new Set(Object.values(D).map(d=>d[0]))){
          const q=rk=>Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===rk&&SV.players[id]&&SV.players[id].team===team&&!SV.inactive[id]);
          const one=q(1), two=q(2), g=SV.sched.find(x=>+x.w===cw&&(x.a===team||x.h===team))||SV.sched.find(x=>x.a===team||x.h===team);
          if(!one||!two||!g) continue;
          tried++; const P2=SV.players[two], keep=[P2.gp,P2.base_gp]; P2.gp=1; P2.base_gp=0;
          SV.inactive[one]={week:cw,status:'Out',inj:'Thumb'};
          try{ const r=F('rosterFor')(g,false)[team], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter), gap=r.gaps.find(x=>x.id===one);
            /* a QB2 whose games give the model no workload (Stetson Bennett, LA, week 6 of 2026: one
               relief appearance) used to leave the slot to nobody; since app v104 he starts, with no
               lines (nothingToProject) */
            const use2=F('usage')(P2,g.a===team?g.h:g.a,F('gameCtx')(g,team));
            if(qb.length===1&&qb[0].pl.id===two&&gap&&gap.why==='ruled out, thumb'&&(use2>0||!F('statLines')(qb[0]).length)){ ok++; if(!(use2>0)) noHist++; }
            else W.starters(false,`${team}: QB1 ruled out and a one-game QB2: the starter shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, and QB1 reads "${gap?gap.why:'nothing'}"`);
          } finally { P2.gp=keep[0]; P2.base_gp=keep[1]; delete SV.inactive[one]; }
          if(tried>=4) break; }
        W.coverage(tried>0,'no team on the chart has a QB1 and a QB2 to test the next man up with');
        console.log(`V4. ruled out: ${n} gap notes this week, each giving the real reason; ${ok} of ${tried} teams start a one-game QB2 when QB1 is ruled out${noHist?` (${noHist} of them a QB2 the model projects to no use, started with no lines)`:''}`); }

      /* V5. the injury report: the payload carries the downloaded one, its Outs leave the page, its
         Questionables wear a Q; and the rules, on a made-up report for a real team */
      { let msg='';
        if(rInj){ const isReg=r=>+r.season===SEASON&&String(r.game_type||r.season_type||'REG')==='REG';
          const cur=rInj.filter(r=>isReg(r)&&+r.week===+PAY.week), pc=(PAY.injuries||[]).filter(r=>+r.week===+PAY.week).length;
          chk(pc===cur.length,`the payload has ${pc} injury rows for week ${PAY.week}, the downloaded report ${cur.length}`);
          /* who the roster has inactive for his club's last game (status INA, or an active row with
             nflverse's inactive code I01 or I02): the payload's ina, and every earlier report row of
             theirs is carried beside the earlier Outs, so the page can tell one was on the report */
          const rIna=new Set((rRoster||[]).filter(r=>r.gsis_id&&SKILL.has(String(r.position).toUpperCase())&&(r.status==='INA'||String(r.status_description_abbr||'').startsWith('I'))).map(r=>r.gsis_id));
          if(rRoster){ const pIna=new Set(PAY.ina||[]);
            chk(pIna.size===rIna.size&&[...rIna].every(id=>pIna.has(id)),`the payload's ina (${pIna.size}) is not the downloaded roster's inactive (${rIna.size})`); }
          const past=rInj.filter(r=>isReg(r)&&+r.week<+PAY.week&&SKILL.has(String(r.position).toUpperCase())&&(['Out','Doubtful'].includes(r.report_status)||rIna.has(r.gsis_id))).length;
          const ppast=(PAY.injuries||[]).filter(r=>+r.week<+PAY.week).length;
          chk(ppast===past,`the payload has ${ppast} earlier Outs and rows of the inactive, the downloaded report ${past}`);
          const miss=[], listed=[];
          if(+PAY.week===cw){
            for(const r of cur){ const id=r.gsis_id, st=r.report_status; if(!SV.players[id]) continue;
              if((st==='Out'||st==='Doubtful')&&!SV.inactive[id]) miss.push(`${r.full_name} ${st}`);
              if(st==='Questionable'&&!SV.inactive[id]&&(F('injTag')(id)||{}).k!=='q') miss.push(`${r.full_name} Questionable without a Q`); }
            const out=new Set(cur.filter(r=>r.report_status==='Out'||r.report_status==='Doubtful').map(r=>r.gsis_id));
            for(const g of openG){ const ro=F('rosterFor')(g,true); for(const t in ro) for(const x of ro[t].players) if(out.has(x.pl.id)) listed.push(`${g.id} ${x.pl.n}`); } }
          W.starters(!miss.length,`the report is not on the page: ${miss.slice(0,5).join('; ')}`);
          W.starters(!listed.length,`players ruled out are on this week's pages: ${listed.slice(0,5).join('; ')}`);
          msg=`${pc} rows for week ${PAY.week} and ${ppast} earlier Outs and rows of the ${rIna.size} inactive, as downloaded; every Out off the page, every Questionable tagged; `; }
        /* inactive after being on his club's last report (the Elo build's WHO PLAYS rule, app v104),
           worked out here from the payload alone: on the report of his club's last game in any
           status, with no stat line in it, and his club with no game status filed this week, he is
           held out (pending) until he practises or the club files a report he is not on; and he is
           on no page this week. Caleb Williams, Chicago, week 6 of 2026, was the case */
        { const R=PAY.roster||{}, I=PAY.injuries||[], held=[], wrong=[];
          const lastWk=t=>{ let p=null; for(const g of SV.sched) if((g.a===t||g.h===t)&&+g.w<cw&&(p==null||+g.w>p)) p=+g.w; return p; };
          for(const id of (PAY.ina||[])){ const t=R[id]&&R[id][0]; if(!t||!SV.players[id]) continue; const pw=lastWk(t); if(pw==null) continue;
            const was=I.find(r=>r.gsis_id===id&&+r.week===pw&&r.team===t), mine=I.filter(r=>+r.week===cw&&r.team===t), row=mine.find(r=>r.gsis_id===id);
            if(!was||(SV.actuals[String(pw)]&&SV.actuals[String(pw)][id])) continue;
            if(mine.some(r=>String(r.report_status||'').trim())) continue;             /* his club's statuses are filed: the report rules */
            const out=!mine.length||(row&&/did not/i.test(String(row.practice_status||'')));
            const rec=SV.inactive[id];
            if(out){ held.push(id); NOPLAY.set(id,`inactive in week ${pw} after being on its report, not cleared`); if(!rec) wrong.push(`${SV.players[id].n} (${t}): inactive in week ${pw} after being on its report, and not held out`);
              else if(rec.status==='Pending'&&!['Out','Doubtful'].includes(was.report_status)&&!/\(inactive last game, /.test(F('inactiveWhy')(rec))) wrong.push(`${SV.players[id].n} reads "${F('inactiveWhy')(rec)}"`); }
            else if(rec&&rec.status==='Pending') wrong.push(`${SV.players[id].n} (${t}): cleared by this week's report, yet held out`); }
          const shown=[]; for(const g of openG){ const ro=F('rosterFor')(g,true); for(const t in ro) for(const x of ro[t].players) if(held.includes(x.pl.id)) shown.push(`${g.id} ${x.pl.n}`); }
          W.starters(!wrong.length,`the inactive rule: ${wrong.slice(0,4).join('; ')}`);
          W.starters(!shown.length,`players held out as inactive after their club's last report are on this week's pages: ${shown.slice(0,4).join('; ')}`);
          msg+=`${held.length} held out as inactive after their club's last report (${held.map(id=>SV.players[id].n).slice(0,4).join(', ')||'none this week'}); `; }
        /* the rules: out in his team's last game and no word yet is pending (treated as out); not on
           his team's report once it is filed, or with a final report that gives him no status, he is
           cleared; Questionable with no practice is out; Questionable wears a Q and, like a player who
           did not practise, stays out of the suggestions; limited practice is only a tag */
        const g2=SV.sched.find(g=>+g.w>=2&&F('prevTeamWeek')(g.h,+g.w)!=null);
        if(g2){ const T=g2.h, W=+g2.w, PW=F('prevTeamWeek')(T,W), row=(id,wk,st,pr)=>({season:SEASON,week:wk,gsis_id:id,team:T,report_status:st||'',practice_status:pr||'',injury:'Knee'});
          const ii=F('ingestInjuries'), inact=()=>w.eval('S').inactive, tag=id=>(w.eval('INJ')[id]||{}).k||null, sug=F('suggestable');
          /* V11-V15 the roster has inactive for the last game (ina): V11, V14 and V15 were on its report
             (Questionable), V12 was not (a healthy scratch), V13 was and has a stat line in it */
          const keepIna=PAY.ina; PAY.ina=[...(keepIna||[]),'V11','V12','V13','V14','V15'];
          const base=[row('V1',PW,'Out'),row('V2',PW,'Out'),row('V3',PW,'Out'),row('V8',PW,'Doubtful'),row('V10',PW,'Doubtful'),
            row('V11',PW,'Questionable','Limited Participation in Practice'),row('V13',PW,'Questionable'),row('V14',PW,'Questionable'),row('V15',PW,'Questionable')];
          const A=(SV.actuals[String(PW)]??={}); A.V8={team:T,receptions:2}; A.V13={team:T,receptions:1};   /* V8 was listed doubtful, and played; V13 too */
          try{ ii(base,W); }finally{ delete A.V8; delete A.V13; }
          chk(['V11','V14','V15'].every(id=>inact()[id]&&inact()[id].status==='Pending'&&/^ruled out until his status is filed \(inactive last game, /.test(F('inactiveWhy')(inact()[id]))),'inactive last game after being on its report, with no report yet, is not pending, or does not say inactive');
          chk(!inact().V12&&!inact().V13,'an inactive player the last report never named, or one with a stat line in that game, is held out');
          chk(['V1','V2','V3','V10'].every(id=>inact()[id]&&inact()[id].status==='Pending'),'out or doubtful last game with no report yet is not pending');
          chk(!inact().V8,'a player listed doubtful last game who has a stat line in it is held out as pending');
          chk(/^ruled out until his status is filed/.test(F('inactiveWhy')(inact().V1)),'a pending player does not read "ruled out until his status is filed"');
          /* filed, no game statuses yet (a Wednesday or Thursday report) */
          const filed=[...base,row('V2',W,'','Did Not Participate In Practice'),row('V3',W,'','Limited Participation in Practice'),
            row('V7',W,'','Did Not Participate In Practice'),row('V9',W,'','Full Participation in Practice'),
            row('V11',W,'','Limited Participation in Practice'),row('V14',W,'','Did Not Participate In Practice')];
          ii(filed,W);
          chk(!inact().V11&&!inact().V15&&inact().V14&&inact().V14.status==='Pending','inactive after the last report: practising, or off the filed report, does not clear him, or not practising does');
          chk(!inact().V1,'a player off his filed team report is still held out');
          chk(inact().V2&&inact().V2.status==='Pending','out last game and not practising is not pending');
          chk(!inact().V3&&tag('V3')==='lim'&&sug('V3'),'out last game and practising (limited) is held out, untagged or kept from the suggestions');
          chk(!inact().V7&&tag('V7')==='dnp'&&!sug('V7'),'did not practise with no status yet is not tagged, or is suggested');
          /* the final report: game statuses filed */
          const fin=[...filed,row('V4',W,'Questionable','Did Not Participate In Practice'),row('V5',W,'Questionable','Limited Participation in Practice'),row('V6',W,'Out','')];
          ii(fin,W);
          chk(inact().V4&&inact().V6,'Questionable with no practice, or Out, is not ruled out');
          chk(!inact().V5&&tag('V5')==='q'&&!sug('V5'),'Questionable is not tagged Q, or is suggested');
          chk(!inact().V2&&!tag('V7')&&sug('V7'),'a final report that gives a player no status does not clear him');
          chk(!inact().V14,'a final report that gives an inactive player no status does not clear him');
          ii([],W); chk(!Object.values(inact()).some(r=>r&&r.week!=='season'),'an empty report left someone ruled out for the week');
          /* a reserve list, the PUP list, a suspension: out on the roster's word, whatever the report */
          F('applyRoster')({...(PAY.roster||{}),V16:[T,'RES','V16',W],V17:[T,'PUP','V17',W],V18:[T,'SUS','V18',W]});
          ii(fin,W); chk(['V16','V17','V18'].every(id=>inact()[id]&&inact()[id].week==='season'&&/^ruled out/.test(F('inactiveWhy')(inact()[id]))),'a player on a reserve list, the PUP list or suspended is not held out after the report is read');
          PAY.ina=keepIna; if(keepIna===undefined) delete PAY.ina;
          ii(fin,W,true); chk(inact().V6&&!inact().V2&&!inact().V4,'a past week is not graded on its final report\'s game statuses alone');
          ii(PAY.injuries||[]); F('applyRoster')(PAY.roster); }
        console.log(`V5. injury report: ${msg}pending, cleared, Q, no-practice and limited, inactive after the last report and the roster's reserve, PUP and suspended lists each behave on a made-up report for ${g2?g2.h:'no team'}`); }

      /* V6. nobody out, pending, Questionable or missing practice is in a suggested parlay */
      { const legs=[]; let msgV6=''; for(const t of F('getPbTiers')().tiers) if(t.legs) legs.push(...t.legs);
        for(const g of openG){ const T=F('gameTiers')(g); for(const id of ['high','med','low']) if(T[id]) legs.push(...T[id].legs); }
        const pool=[...F('pricedLegs')(undefined,true),...openG.flatMap(g=>F('gameLegPool')(g))];
        const bad=[...new Set([...legs,...pool].filter(l=>l.grp!=='TEAM'&&!F('suggestable')(l.pid)).map(l=>l.name))];
        chk(!bad.length,`suggested legs on players who may not play: ${bad.slice(0,5).join(', ')}`);
        /* and on the sources' own word, not the page's reading of them: whatever the page shows
           (V1, V4 and V5's listing checks are warnings), no suggested leg or candidate is on a player
           this week's report has Out, Doubtful or Questionable, the roster has off its active list,
           released, inactive this week or on no roster, or the inactive rule holds out (NOPLAY, from
           V1 and V5's own working of the sources) */
        { const off=new Map(NOPLAY);
          for(const r of (PAY.injuries||[])) if(+r.week===cw&&['Out','Doubtful','Questionable'].includes(String(r.report_status||'').trim())) off.set(r.gsis_id,r.report_status);
          for(const [id,e] of Object.entries(PAY.roster||{})) if(e&&e[1]&&!['ACT','DEV','INA'].includes(e[1])) off.set(id,e[1]);
          const hit=[...new Set([...legs,...pool].filter(l=>l.grp!=='TEAM'&&off.has(l.pid)).map(l=>`${l.name} (${off.get(l.pid)})`))];
          chk(!hit.length,`suggested legs on players the report or the roster has out: ${hit.slice(0,5).join(', ')}`);
          msgV6=` and none on the ${off.size} the report, the roster or the inactive rule has out (${NOPLAY.size} of them released, inactive or held, worked out from the sources)`; }
        const g=openG.find(x=>F('gameLegPool')(x).some(l=>l.grp!=='TEAM'));
        if(g){ const pid=F('gameLegPool')(g).find(l=>l.grp!=='TEAM').pid, INJ=w.eval('INJ'), keep=INJ[pid];
          INJ[pid]={k:'q',t:'Q',title:'Questionable'}; w.eval('GAME_TIER_CACHE={}');
          chk(!F('gameLegPool')(g).some(l=>l.pid===pid)&&!F('pricedLegs')([g]).some(l=>l.pid===pid),'a Questionable player stayed in a game\'s suggestions');
          if(keep) INJ[pid]=keep; else delete INJ[pid]; w.eval('GAME_TIER_CACHE={}'); }
        console.log(`V6. suggestions: ${legs.length} suggested legs and ${pool.length} candidates, none on a player who may not play${msgV6}; a Questionable tag takes a player out of the pool`); }

      /* V7. every player is on the team the roster says, whatever team his last game was for */
      { const tbl=R||(rRoster?Object.fromEntries(Object.entries(rawRo).map(([k,r])=>[k,[r.team,r.status]])):null);
        if(tbl){ const off=Object.values(SV.players).filter(p=>tbl[p.id]&&tbl[p.id][0]&&tbl[p.id][0]!==p.team).map(p=>`${p.n} ${p.team}, roster ${tbl[p.id][0]}`);
          chk(!off.length,`players on the wrong team: ${off.slice(0,5).join('; ')}`); }
        console.log(`V7. teams: ${tbl?'every player on his roster team':'no roster table to check against'}`); }

      /* V8. kickoffs in US Eastern, by the rule for any year: the page's clock against Intl's */
      { const ny=(d,t)=>{ const guess=Date.parse(`${d}T${t}:00Z`);
          const pt=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
          return guess-(Date.UTC(+pt.year,+pt.month-1,+pt.day,+pt.hour,+pt.minute)-guess); };
        const ko=F('kickoff'); const bad=[];
        const tests=[...SV.sched.map(g=>[g.d,g.t||'13:00']),...['2026-10-31','2026-11-01','2027-01-03','2027-03-13','2027-03-14','2027-09-12','2027-11-06','2027-11-07','2028-11-04','2028-11-05'].map(d=>[d,'13:00'])];
        for(const [d,t] of tests){ const k=ko({d,t}); if(!k||k.getTime()!==ny(d,t)) bad.push(`${d} ${t}`); }
        chk(!bad.length,`kickoffs an hour out: ${bad.slice(0,5).join(', ')}`);
        console.log(`V8. kickoffs: ${tests.length} dates, this season's games and 2027-28's clock changes, all on US Eastern`); }

      /* V9. a player with no stat line once his game's stats are in, by who played (PAY.snaps, planted
         here): one who took a snap is graded on zero, as DraftKings graded Tory Horton's receptions
         over 1.5 in week 5 (an over and a rung lose, an under wins); one his club's snaps leave out is
         void; with no snap counts for his club, void if the week's report had him Out, else he waits.
         And a won parlay with a void leg pays on the rest at their own prices */
      { const g=SV.sched.find(x=>SV.processedGames[x.id]&&x.hs!=null&&x.hs!==x.as);
        if(g){ const wk=String(+g.w), keepS=PAY.snaps, keepI=PAY.injuries, st=F('settleLeg');
          try{
            PAY.snaps={...(keepS||{}),[wk]:{...((keepS||{})[wk]||{}),[g.id]:{[g.h]:['00-PLAYED-NO-LINE'],[g.a]:[]}}};
            const ran={week:+g.w,gid:g.id,pid:'00-PLAYED-NO-LINE',team:g.h,stat:'receptions',k:1.5,side:'over',main:true,price:-150};
            chk(!F('actualFor')(+g.w,ran.pid)&&F('tookPart')(ran)===true,'the planted player has a stat line, or the snap counts do not say he played');
            chk(st(ran)==='loss','a player who played with no stat line does not lose his receptions over 1.5 on zero');
            chk(st({...ran,side:'under',price:120})==='win','a player who played with no stat line does not win his under on zero');
            chk(st({...ran,main:false,k:1})==='loss'&&st({...ran,stat:'any_td',main:false,k:1})==='loss'&&st({...ran,stat:'receiving_yards',k:0,side:'over'})==='push','a player who played with no stat line is not graded on zero (a rung, his touchdown, a line of 0)');
            const leg={week:+g.w,gid:g.id,pid:'00-NOT-A-PLAYER',team:g.h,stat:'receptions',k:3,side:'over',main:false,price:-110};
            chk(st(leg)==='void','a player with no snap, his club\'s snaps in, is not void');
            chk(st({...leg,team:undefined})==='void','a leg with no club on a player neither club\'s snaps have is not void');
            chk(st({...leg,gid:'not-graded-yet'})===null,'a leg whose game has no stats yet should wait');
            /* his club's snap counts not in yet */
            PAY.snaps[wk][g.id]={[g.h]:[]};
            const unk={...leg,pid:'00-NO-WORD-YET',team:g.a};
            chk(st(unk)===null&&st({...unk,team:undefined})===null,'a player with no stat line and no snap counts for his club does not wait');
            PAY.injuries=[...(keepI||[]),{season:String(SEASON),week:wk,gsis_id:'00-NO-WORD-YET',team:g.a,report_status:'Doubtful',practice_status:'',injury:''}];
            chk(st(unk)===null,'a player Doubtful, no stat line and no snap counts for his club, does not wait');
            PAY.injuries=[...(keepI||[]),{season:String(SEASON),week:wk,gsis_id:'00-NO-WORD-YET',team:g.a,report_status:'Out',practice_status:'',injury:'Knee'}];
            chk(st(unk)==='void','a player Out on the week\'s report, no stat line and no snap counts for his club, is not void');
            chk(st({...unk,week:+g.w+1})===null,'another week\'s report decided this one');
            PAY.injuries=keepI; delete PAY.snaps[wk][g.id];
            chk(st(unk)===null,'a player with no stat line in a game with no snap counts at all does not wait');
            PAY.snaps[wk][g.id]={[g.h]:['00-PLAYED-NO-LINE'],[g.a]:[]};
            const win={week:+g.w,gid:g.id,team:g.hs>g.as?g.h:g.a,stat:'ml',k:0,price:-150};
            const p={stake:10,payout:10*F('mlToDec')(-110)*F('mlToDec')(-150),legs:[leg,win]}, s=F('settleParlay')(p);
            chk(s.status==='won'&&Math.abs(F('settledReturn')(p,s)-10*F('mlToDec')(-150))<1e-9,'a won parlay with a void leg does not pay the rest at their prices');
            const pv={stake:10,payout:19,legs:[leg]}; chk(F('settleParlay')(pv).status==='void'&&F('settledReturn')(pv)===10,'an all-void parlay does not return the stake');
            chk(F('settleParlay')({stake:10,payout:30,legs:[ran,win]}).status==='lost','a parlay with a leg on a player who played with no stat line is not lost on his over');
          } finally { PAY.snaps=keepS; if(keepS===undefined) delete PAY.snaps; PAY.injuries=keepI; } }
        console.log(`V9. no stat line: ${g?'graded on zero when he took a snap, void when his club\'s snaps leave him out, else void only if Out, waiting otherwise; a void leg drops out of a parlay':'no graded game to test on'}`); }

      /* V10. nothing the job downloaded is missing from what it published: every finished game's
         stats (or, by hand, every game final four days before the bake) */
      { const have=new Set(); for(const wk in (PAY.stats||{})) for(const r of PAY.stats[wk]) have.add(String(+wk)+'|'+r.team);
        let lost=[];
        if(NP.has('stats')){ /* not posted yet: V0b holds the payload to none, and weekly.py reports a stats file still missing two days after the first game */ }
        else if(rStats){ const fin=new Set(PAY.sched.filter(g=>g.hs!=null).map(g=>g.id)), l=new Set();
          for(const r of rStats){ if(+r.season!==SEASON||r.season_type!=='REG'||!fin.has(r.game_id)||!SKILL.has(String(r.position).toUpperCase())) continue;
            if(!have.has(String(+r.week)+'|'+r.team)) l.add(`${r.game_id} ${r.team}`); }
          lost=[...l]; }
        else { const bk=Date.parse(PAY.baked_at||'');
          lost=PAY.sched.filter(g=>{ const k=F('kickoff')(g); return g.hs!=null&&isFinite(bk)&&k&&bk-k.getTime()>4*864e5&&!have.has(g.w+'|'+g.a)&&!have.has(g.w+'|'+g.h); }).map(g=>g.id); }
        chk(!lost.length,`${lost.length} finished team-games have no stats in the payload (${lost.slice(0,4).join(', ')})`);
        console.log(`V10. completeness: ${have.size} team-games of stats, ${NP.has('stats')?'the stats file is not posted yet':'none missing '+(rStats?'against the downloaded file':'among games final four days before the bake')}`); }

      /* V11. the end of the regular season is said, not left on week 18 */
      { const keep=SV.sched.map(g=>[g.hs,g.as]); SV.sched.forEach(g=>{ if(g.hs==null){ g.hs=20; g.as=17; } });
        const ws=d.getElementById('weekSel'); F('renderSlate')();
        chk(F('seasonOver')()&&/regular season is over/.test(d.getElementById('gamesList').textContent),'a season with every game final does not say it is over');
        SV.sched.forEach((g,i)=>{ g.hs=keep[i][0]; g.as=keep[i][1]; }); F('renderSlate')();
        chk(F('seasonOver')()===/regular season is over/.test(d.getElementById('gamesList').textContent),'the season-over note shows mid-season');
        console.log(`V11. season over: said once every game is final${ws?'':''}`); }

      /* V12. a game's lines are DraftKings' only while the pull is under a day old, and say so */
      { let dk=0, nv=0; const stale=[], bad=[]; const bk=Date.parse(PAY.baked_at||'');
        for(const g of PAY.sched){ if(g.ls==='dk'){ dk++; if(g.lat){ const k=F('kickoff')(g), ref=Math.min(isFinite(bk)?bk:Date.now(),k?k.getTime():Infinity);
            if(ref-Date.parse(g.lat)>24*3600e3+60e3) stale.push(g.id); } }
          else if(g.ls==='nflverse') nv++;
          if(g.ls&&!F('lineSource')(g)) bad.push(g.id); }
        const priced=PAY.sched.some(g=>g.tov!=null);      /* a payload baked before the totals carried their prices has none */
        if(rGames) for(const r of rGames){ const g=gOf(r.game_id); if(!g||g.ls!=='nflverse') continue;
          const sp=parseFloat(r.spread_line), tot=parseFloat(r.total_line), ov=parseFloat(r.over_odds), un=parseFloat(r.under_odds);
          if((isFinite(sp)&&g.sp!==sp)||(isFinite(tot)&&g.tot!==tot)) bad.push(`${g.id} says nflverse but carries ${g.sp}/${g.tot}, games.csv ${sp}/${tot}`);
          if(priced&&((isFinite(ov)&&g.tov!==ov)||(isFinite(un)&&g.tou!==un))) bad.push(`${g.id}'s total is priced ${g.tov}/${g.tou}, games.csv ${ov}/${un}`); }
        chk(!stale.length,`DraftKings lines more than a day old are on the page: ${stale.slice(0,4).join(', ')}`);
        chk(!bad.length,`line sources wrong: ${bad.slice(0,4).join('; ')}`);
        console.log(`V12. line sources: DraftKings on ${dk} games, every pull under a day old at the bake (or at its kickoff, if sooner); nflverse on ${nv}`); }

      /* V13. depth charts carried forward from an older payload say how old they are */
      { const g=openG[0]||null, keep=PAY.depth_dt; let ok=null;
        if(g&&PAY.baked_at&&keep){ const txt=()=>d.getElementById('gameView').textContent;
          PAY.depth_dt=new Date(Date.parse(PAY.baked_at)-10*864e5).toISOString().slice(0,10); SV.ui.game=g.id; F('renderGame')(); const old=/Depth charts as of/.test(txt());
          PAY.depth_dt=keep; F('renderGame')(); const now=/Depth charts as of/.test(txt()); F('closeGame')();
          ok=old&&now===(Date.parse(PAY.baked_at)-Date.parse(keep+'T12:00:00Z')>3*864e5);
          chk(ok,'depth charts ten days old do not say so on the game page, or fresh ones do'); }
        console.log(`V13. depth charts: ${ok==null?'no game to show them on':'a chart carried forward says its date'}`); }

      /* V14. the tags a reader sees: a Q beside a Questionable player's name, and a leg in the
         builder on a player ruled out marked, with what a book does with it */
      { const g=openG[0]||null; let did=false;
        if(g){ const r=F('rosterFor')(g,false), x=Object.values(r).flatMap(t=>t.players).find(x=>x.starter&&x.pl.grp!=='K'&&!F('injTag')(x.pl.id));
          if(x){ const INJ=w.eval('INJ'), keepP=JSON.stringify(SV.parlay||{});
            INJ[x.pl.id]={k:'q',t:'Q',title:'Questionable'}; SV.ui.game=g.id; SV.ui.open={}; F('renderGame')();
            const row=d.querySelector(`#gameView .plrbtn[data-open="${x.pl.id}"] .inj`);
            chk(!!row&&row.textContent==='Q','a Questionable player has no Q beside his name on the game page');
            delete INJ[x.pl.id];
            SV.parlay={}; const l=F('statLines')(x).find(l=>!l.prob&&l.rungs.length);
            F('toggleLeg')(F('legKey')(g.id,x.pl.id,l.stat),l.rungs[0].k,g,'over',false);
            SV.inactive[x.pl.id]={week:cw,status:'Out',inj:'Ankle'}; F('renderParlay')();
            const body=d.getElementById('parlayBody');
            chk(/not expected to play/.test(body.textContent)&&!!body.querySelector('.legrow .inj.inj-out'),'a builder leg on a player ruled out is not marked');
            delete SV.inactive[x.pl.id]; SV.parlay=JSON.parse(keepP); F('closeGame')(); F('renderParlay')(); did=true; } }
        console.log(`V14. tags: ${did?'Q on the game page, ruled out in the builder with what a book does':'no game to show them on'}`); }

      /* V15. who played, as the job baked it: PAY.snaps (the players with no stat line who took a snap)
         and the rows of zeros (from_snaps) for those who took one in their role, held to each other and
         to the page, and with PROPS_AUDIT_RAW to the snap counts and stats it read */
      { const SN=PAY.snaps||{}, bad=[]; let nz=0, nl=0, settled=0;
        const gidOf=(wk,team)=>{ const g=SV.sched.find(x=>+x.w===+wk&&(x.h===team||x.a===team)); return g?g.id:null; };
        const listed=(wk,gid,team,pid)=>!!(SN[wk]&&SN[wk][gid]&&(SN[wk][gid][team]||[]).includes(pid));
        for(const wk in SN) for(const gid in SN[wk]){ const g=gOf(gid);
          if(!g||String(+g.w)!==String(+wk)) bad.push(`snaps for ${gid} under week ${wk}`);
          for(const team in SN[wk][gid]){ if(g&&team!==g.h&&team!==g.a) bad.push(`snaps for ${team} in ${gid}`); nl+=(SN[wk][gid][team]||[]).length;
            if(!(PAY.stats[wk]||[]).some(r=>r.team===team&&!r.from_snaps)) bad.push(`snaps for ${gid} ${team}, whose stats are not in`); } }
        for(const wk in (PAY.stats||{})){ const real=new Set(PAY.stats[wk].filter(r=>!r.from_snaps).map(r=>r.player_id));
          for(const r of PAY.stats[wk]){ if(!r.from_snaps) continue; nz++;
            const gid=gidOf(wk,r.team), cols=Object.keys(r).filter(k=>typeof r[k]==='number'&&!['season','week','from_snaps'].includes(k));
            if(!listed(wk,gid,r.team,r.player_id)) bad.push(`a row of zeros for ${r.player_id} (${gid} ${r.team}) who is not in that club's snaps`);
            if(cols.some(k=>r[k]!==0)) bad.push(`the row of zeros for ${r.player_id} in week ${wk} has a stat`);
            if(real.has(r.player_id)) bad.push(`${r.player_id} has a stat row and a row of zeros in week ${wk}`);
            if(!F('posGrp')(r.position)) bad.push(`a row of zeros for ${r.player_id} at ${r.position}, a position the page does not project`);
            const a=F('actualFor')(+wk,r.player_id);
            if(!a||a.receptions!==0||a.passing_yards!==0||a.kick_pts!==0) bad.push(`the page has no zero line for ${r.player_id} in week ${wk}`);
            else if(gid&&settled<40){ settled++; const l={week:+wk,gid,pid:r.player_id,team:r.team,stat:'receptions',k:0.5,side:'over',main:true,price:-110};
              if(F('settleLeg')(l)!=='loss'||F('settleLeg')({...l,side:'under'})!=='win') bad.push(`${r.player_id} in week ${wk}, on the field with no stat line, is not graded on zero`); } } }
        /* a listed player with no row of zeros (a snap on defence or special teams only) is graded on zero too */
        { let one=0; for(const wk in SN) for(const gid in SN[wk]) for(const team in SN[wk][gid]) for(const pid of SN[wk][gid][team]){
            if(one>=20||F('actualFor')(+wk,pid)) continue; one++;
            if(F('settleLeg')({week:+wk,gid,pid,team,stat:'receptions',k:0.5,side:'over',main:true,price:-110})!=='loss') bad.push(`${pid} (${gid}), in the snaps with no stat line, is not graded on zero`); } }
        let rawSaid='';
        if(NEED){ const sp=path.join(__dirname,'..','raw',`snap_counts_${SEASON}.csv`);
          if(!fs.existsSync(sp)) rawSaid='; raw/snap_counts not downloaded this run (it is never required), so not compared';
          else if(rStats&&rRoster){ const snapRows=Papa.parse(fs.readFileSync(sp,'utf8'),{header:true,skipEmptyLines:true}).data;
            const hasLine=new Set(rStats.filter(r=>+r.season===SEASON&&r.season_type==='REG').map(r=>r.game_id+'|'+r.player_id));
            const pfr={}; for(const r of rRoster) if(r.gsis_id&&r.pfr_id&&!pfr[r.pfr_id]) pfr[r.pfr_id]=r.gsis_id;
            const posOf=id=>String((rawRo[id]&&rawRo[id].position)||'').toUpperCase();
            const snapped=new Set(), names={}; let checked=0;
            for(const s of snapRows){ const n=v=>{ const x=parseFloat(v); return isFinite(x)?x:0; }, all=n(s.offense_snaps)+n(s.defense_snaps)+n(s.st_snaps), id=pfr[s.pfr_player_id];
              if(all>0){ snapped.add(s.game_id+'|'+s.team+'|'+(id||'')); (names[s.game_id+'|'+s.team]??=[]).push(s.player); }
              if(!id||!(n(s.offense_snaps)>0)||!SKILL.has(posOf(id))||posOf(id)==='K'||hasLine.has(s.game_id+'|'+id)) continue;
              const g=gOf(s.game_id); if(!g||!SN[String(+g.w)]||!SN[String(+g.w)][s.game_id]||!(s.team in SN[String(+g.w)][s.game_id])) continue;
              checked++;
              if(!listed(String(+g.w),s.game_id,s.team,id)) bad.push(`${s.player} (${s.game_id} ${s.team}) ran ${s.offense_snaps} offensive snaps with no stat line and is not in the snaps`);
              if(!(PAY.stats[String(+g.w)]||[]).some(r=>r.from_snaps&&r.player_id===id)) bad.push(`${s.player} (${s.game_id}) has no row of zeros`); }
            for(const wk in SN) for(const gid in SN[wk]) for(const team in SN[wk][gid]) for(const pid of SN[wk][gid][team]){
              if(hasLine.has(gid+'|'+pid)) bad.push(`${pid} is in the snaps of ${gid} with a stat line in raw/pw`);
              const me=who(pid);
              if(!snapped.has(gid+'|'+team+'|'+pid)&&!(names[gid+'|'+team]||[]).some(n=>nameRule(n,me.name,me.alias))) bad.push(`${pid} is in the snaps of ${gid} ${team} with no snap in raw/snap_counts`); }
            rawSaid=`; against raw/snap_counts, ${checked} players placed by PFR id with an offensive snap and no stat line all listed with their row of zeros`; } }
        chk(!bad.length,`who played: ${bad.length} wrong (${bad.slice(0,4).join('; ')})`);
        console.log(`V15. who played: ${Object.keys(SN).length?`${nl} players with no stat line took a snap, ${nz} rows of zeros, each graded on zero${rawSaid}`:'no snap counts in the payload yet (a payload baked before them): a player with no stat line waits unless Out'}`); }

      if(skipped.length) console.log(`V. raw files not compared (PROPS_AUDIT_RAW is not set; weekly.py sets it): ${skipped.join(', ')}`);
      if(notPosted.length) console.log(`V. raw files not compared because nflverse has not posted them yet: ${notPosted.join(', ')}`);
    })(); }catch(e){ chk(false,'section V threw: '+(e&&e.stack||e)); }

    console.log(`\n${checks} checks, ${fails.length} failures, ${warns.length} warnings, ${errs.length} runtime errors`);
    fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
    errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
    /* warnings never refuse the publish; weekly.py lists them and the job goes red after its commit */
    warns.slice(0,15).forEach(x=>console.log(`  WARN: ${x.m} [${x.k}]`));
    for(const k of [...new Set(warns.map(x=>x.k))]) console.log(`  (a ${k} warning: ${WARN[k]})`);
    /* the page's own timers (the suggested parlays look for a kickoff every half minute) end
       with its window, so node ends when the audit does */
    w.close();
  })();
},1800);
