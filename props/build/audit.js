const {JSDOM}=require('jsdom'); const fs=require('fs'); const Papa=require('papaparse');
const errs=[]; let mem=null;
const dom=new JSDOM(fs.readFileSync('../app/prop_model_2026.html','utf8'),
 /* a real origin, so window.localStorage exists: the app reads the betting model's key and
    writes the live page's watchlist, and neither can be exercised on about:blank */
 {url:'https://demon-x13.github.io/nfl-hub/props/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.Papa=Papa;w.NO_BAKED=true;w.fetch=u=>String(u).indexOf('payload.json')>=0
   ? Promise.resolve({ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync('../data/payload.json','utf8'))})
   : Promise.reject(new Error('x'));   /* the payload is fetched now, not baked in */
  w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';
  w.storage={get:async()=>mem?{value:mem}:null,set:async(k,v)=>{mem=v;return true;}};
  w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window,d=w.document;
const fails=[]; let checks=0;
const chk=(ok,msg)=>{checks++; if(!ok) fails.push(msg);};
setTimeout(async()=>{
  const S=w.eval('S'); const F=n=>w.eval(n);
  const [gameCtx,rosterFor,statLines,project,pOver,fairLine,rungView,marketLine,marketMu,devigOver,bookImplied,bookPrice,probToAmerican,mlToDec,parlayProb,modelMargin,modelPoints,legRho,gameBet,settleLeg,gameMu,tdPlus]=
   ['gameCtx','rosterFor','statLines','project','pOver','fairLine','rungView','marketLine','marketMu','devigOver','bookImplied','bookPrice','probToAmerican','mlToDec','parlayProb','modelMargin','modelPoints','legRho','gameBet','settleLeg','gameMu','tdPlus'].map(F);
  const PAY=F('PAY');
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
  chk(dupes===0,`duplicate players on a page: ${dupes}`); chk(wrongTeam===0,`players on wrong team: ${wrongTeam}`); chk(capViol===0,`depth cap violations: ${capViol}`);
  console.log(`B. rosters: ${nPl} player-slots across the season, ${dupes} dupes, ${wrongTeam} wrong-team, ${capViol} over cap, ${gaps} flagged gaps`);

  /* ---- B2. next man up: a ruled-out QB1 hands the slot to the chart's QB2, not to an
     unranked player with enough projected usage. Any team with both on the chart will do. ---- */
  { const D=PAY.depth||{}; let tried=0,ok=0;
    for(const team of new Set(Object.values(D).map(d=>d[0]))){
      const q=id=>S.players[id]&&S.players[id].team===team&&(S.players[id].gp+S.players[id].base_gp)>=3;
      const one=Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===1&&q(id));
      const two=Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===2&&q(id));
      const g=S.sched.find(x=>x.a===team||x.h===team);
      if(!one||!two||!g) continue;
      tried++;
      S.inactive[one]=true;
      try{ const qb=rosterFor(g,false)[team].players.filter(x=>x.pl.grp==='QB');
        if(qb.length===1&&qb[0].pl.id===two) ok++;
        else chk(false,`${team}: with QB1 out the quarterback shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not the chart's QB2 ${S.players[two].n}`);
      } finally { delete S.inactive[one]; }
      if(tried>=6) break;
    }
    chk(tried>0,'no team on the depth chart has a QB1 and a QB2 to test next man up with');
    console.log(`B2. next man up: ${ok} of ${tried} teams hand a ruled-out QB1's slot to the chart's QB2`);
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
    const gopen=openUpcoming();
    const gcb=d.querySelector('[data-leg$="|ml"]'); chk(!!gcb,'no to-win checkbox in the game overlay');
    if(gcb){ gcb.checked=true; gcb.dispatchEvent(new w.Event('change')); const L=Object.values(S.parlay).find(l=>l.stat==='ml'); chk(!!L&&L.grp==='TEAM'&&L.p>0&&L.p<1&&L.label==='To win','to-win leg did not land in the parlay');
      chk(/To win/.test(d.getElementById('parlayBody').textContent),'to-win leg not shown in the parlay builder');
      gcb.checked=false; gcb.dispatchEvent(new w.Event('change')); chk(!Object.values(S.parlay).some(l=>l.stat==='ml'),'to-win leg did not come back out'); }
    d.getElementById('backBtn').click();
    console.log(`J. game bets: home win ${(hw.p*100).toFixed(0)}% at +3, cover ${(hc.p*100).toFixed(0)}%, settlement and toggling ok`); }

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

  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */
  const g0=openUpcoming();
  chk(!d.getElementById('gameModal').hidden&&!d.getElementById('slateView').hidden,'game overlay did not open over the list');
  chk(d.body.classList.contains('modal-open'),'page scroll not locked behind the overlay');
  [...d.querySelectorAll('.plrbtn')][0].click();
  const cb=d.querySelector('[data-leg]'); cb.checked=true; cb.dispatchEvent(new w.Event('change'));
  const legsBefore=Object.keys(S.parlay).length;
  const rows=Papa.parse(fs.readFileSync('../raw/fake_wk1.csv','utf8'),{header:true,skipEmptyLines:true}).data;
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
  chk(Object.keys(S.accuracy).length>=10,'accuracy not graded');
  for(const k in S.accuracy){ const a=S.accuracy[k]; chk(a.n>0&&isFinite(a.ae/a.n),`accuracy bad ${k}`); }
  chk(Object.keys(S.parlay).length===legsBefore,'parlay legs lost on upload');
  d.getElementById('backBtn').click();
  chk(d.getElementById('gameModal').hidden&&S.ui.game==null&&!d.body.classList.contains('modal-open'),'overlay did not close');
  chk(/\.modal\[hidden\]\s*\{\s*display\s*:\s*none/.test(raw),'stylesheet lacks the rule that lets the overlay actually hide');
  d.querySelector('[data-game="'+g0.id+'"]').click(); d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
  chk(d.getElementById('gameModal').hidden,'Escape did not close the overlay');
  const snap=JSON.stringify(S); const S2=JSON.parse(snap);
  chk(JSON.stringify(S2.parlay)===JSON.stringify(S.parlay)&&JSON.stringify(S2.processed)===JSON.stringify(S.processed),'backup round-trip changed state');
  console.log(`G. state flow: ingest ok, week stays on ${F('currentWeek')()} (schedule-driven), re-upload skipped, ${Object.keys(S.accuracy).length} stats graded, legs preserved, backup round-trips`);

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
    const priced=TR.filter(r=>r.ml!=null); chk(priced.length>0,'no priced lines in the track record (built-in main lines should carry prices)');
    chk(priced.every(r=>r.imp>0&&r.imp<1&&isFinite(F('mlToDec')(r.ml))),'priced line with a bad implied chance');
    chk(priced.every(r=>r.kind!=='main'||marketLine(1,r.pid,r.stat)),'main-line price without a market line');
    chk(!!d.getElementById('lineNote'),'line-freshness note element missing');
    F('renderTrack')(); const body=d.getElementById('trackBody');
    chk(body.textContent.includes('Against the book'),'book table did not render');
    chk(body&&body.querySelectorAll('table').length>=4,'track record tab did not render its tables');
    chk(d.getElementById('trackMarket').options.length>1,'market filter not populated');
    const kinds={}; for(const r of TR) kinds[r.kind]=(kinds[r.kind]||0)+1;
    console.log(`G3. track record: ${priced.length} priced; ${TR.length} graded lines (${Object.entries(kinds).map(([k,v])=>k+' '+v).join(', ')}), said ${(t.said*100).toFixed(1)}% happened ${(t.hit*100).toFixed(1)}%, ${stored} snapshots carry frozen rungs, ${faithful} rung chances all match the frozen projection`);
  }
  /* ---- M. suggested parlays ---- */
  { const SG=F('buildSuggestions')();
    const tiers=SG.tiers;
    chk(tiers.every((t,i)=>i===0||(t.legs.length>tiers[i-1].legs.length&&tiers[i-1].legs.every(l=>t.legs.some(x=>x.key===l.key&&x.k===l.k&&x.side===l.side)))),'suggested tiers must only add legs to the one before');
    chk(tiers.every((t,i)=>i===0||t.corr<=tiers[i-1].corr+0.02),'a bigger tier should not be more likely to land');
    chk(tiers.every(t=>t.legs.every(l=>l.src==='real'&&l.p-F('mlProb')(l.price)>=0.03)),'suggested legs must be real-priced edges');
    chk(tiers.every(t=>new Set(t.legs.map(l=>l.key)).size===t.legs.length),'one line per player and stat in a suggestion');
    chk(tiers.filter(t=>t.id!=='safe').every(t=>t.added>=1),'medium and aggressive each add at least one leg');
    chk(SG.candidates<4||tiers.length===3,'with four or more qualifying lines all three tiers should show');
    d.querySelector('#tabs button[data-tab="parlay"]').click();
    /* the suggestions are behind a button now: the builder heads the tab */
    chk(!d.getElementById('suggCard'),'the suggestions are still taking up the tab');
    chk(d.getElementById('suggModal').hidden,'the suggestions window opens by itself');
    chk(/Parlay Builder|-leg parlay/.test(d.getElementById('parlayBody').firstElementChild.querySelector('h2').textContent),
      'the builder is not the first section: '+d.getElementById('parlayBody').firstElementChild.outerHTML.slice(0,90));
    chk(!!d.getElementById('suggOpen'),'no button opens the suggestions');
    d.getElementById('suggOpen').click();
    chk(!d.getElementById('suggModal').hidden&&!!d.getElementById('suggCard'),'the suggestions window did not open');
    chk(!!d.querySelector('#suggView #suggCard')&&!d.querySelector('#parlayBody #suggCard'),'the suggestions are drawn outside the window');
    chk(!d.getElementById('suggToggle')&&!!d.getElementById('suggClose'),'the window minimises instead of closing');
    chk(!d.querySelector('#suggCard.min'),'the window opened minimised');
    if(tiers.length){ const before=(S.saved||[]).length; const sb=d.querySelector('#suggView [data-suggest-save]'); sb.click();
      chk((S.saved||[]).length===before+1&&S.saved[S.saved.length-1].suggested&&S.saved[S.saved.length-1].legs.length>=2,'add to saved parlays did not save the tier');
      chk(/suggestion/.test(d.getElementById('savedCard').textContent),'saved suggestion not labelled');
      chk(!d.getElementById('suggModal').hidden&&!!d.getElementById('suggCard'),'saving a tier closed the window');
      S.saved.pop(); F('save')(); F('renderParlay')(); }
    /* ---- M2. sending saved parlays to the live page ---- */
    { const keep=JSON.stringify(S.saved||[]);
      try{ w.localStorage.removeItem('live_parlays_v1'); }catch(e){}
      S.saved=[{id:'sendA',saved:'2026-09-13T00:00:00.000Z',week:1,stake:5,payout:20,price:300,
                legs:[{gid:'g1',stat:'passing_yards',k:200.5,side:'over',main:true,name:'A',team:'X',week:1}]},
               {id:'sendB',saved:'2026-09-13T00:00:00.000Z',week:1,stake:5,payout:20,price:300,
                legs:[{gid:'g2',stat:'rushing_yards',k:40.5,side:'over',main:true,name:'B',team:'Y',week:1}]}];
      F('save')(); F('renderParlay')();
      const btn=()=>d.getElementById('sendLive');
      chk(!!btn()&&/^Send to Live Parlays$/.test(btn().textContent.trim()),'the send button does not read plainly: '+(btn()&&btn().textContent));
      chk(/8B5CF6|6D28D9/i.test(btn().getAttribute('style')||''),'the send button is not purple: '+btn().getAttribute('style'));
      chk(!/font-size|padding/.test(btn().getAttribute('style')||''),'the send button overrides its size instead of matching the one beside it');
      /* beside Clear saved parlays in the footer bar, not in the heading */
      chk(btn().nextElementSibling&&btn().nextElementSibling.id==='savedClear','the send button is not to the left of Clear saved parlays');
      chk(!d.querySelector('#savedCard h2 #sendLive'),'the send button is still in the heading');
      { const a=d.querySelector('#savedCard h2 a[href="../liveparlays/"]');
        chk(!!a&&/Live tracking/.test(a.textContent),'the heading has no Live tracking link: '+(a&&a.textContent));
        chk(!/go|btn/.test(a.className)&&/8A5E05/i.test(a.getAttribute('style')||''),'the Live tracking link reads as a button');
        /* .grow is only flex:1 inside a .bar, and a heading is not one */
        const sp=d.querySelector('#savedCard h2 .grow');
        chk(!!sp&&/flex\s*:\s*1/.test(sp.getAttribute('style')||''),'nothing pushes the link to the right of the heading'); }
      btn().click();
      const read=()=>{ try{ return JSON.parse(w.localStorage.getItem('live_parlays_v1')||'{}'); }catch(e){ return {}; } };
      chk(read().sent&&read().sent['prop|sendA']&&read().sent['prop|sendB'],'sending did not write both ids: '+JSON.stringify(read()));
      chk(/^Send to Live Parlays$/.test(btn().textContent.trim())&&!btn().disabled,'the button should not change once everything is sent');
      chk((d.getElementById('savedCard').textContent.match(/sent/g)||[]).length>=2,'a sent parlay is not marked on its card');
      /* sending twice adds nothing, and the same legs under another id are the same parlay */
      chk(F('sendToLive')(S.saved)===0,'the same parlays were sent a second time');
      S.saved.push({id:'sendC',saved:'2026-09-13T00:00:00.000Z',week:1,stake:5,payout:20,price:300,
        legs:[{gid:'g1',stat:'passing_yards',k:200.5,side:'over',main:true,name:'A',team:'X',week:1}]});
      chk(F('sendToLive')(S.saved)===0,'the same legs under another id were sent as a new parlay');
      S.saved.pop();   /* the duplicate has served its purpose and is itself unsent */
      /* deleted on the live page, and offered again here: the only way back from a delete */
      { const st=read(); st.removed={'prop|sendA':1}; w.localStorage.setItem('live_parlays_v1',JSON.stringify(st));
        F('renderParlay')();
        chk(F('sendToLive')(S.saved)===1,'a parlay deleted on the live page is not offered again'); }
      /* the live page's own half of that key is never touched */
      { const st=read(); st.lines={'prop|sendA|0':77}; w.localStorage.setItem('live_parlays_v1',JSON.stringify(st));
        F('sendToLive')(S.saved);
        chk(read().lines&&read().lines['prop|sendA|0']===77,'sending trampled a corrected line');
        chk(w.localStorage.getItem(F('BET_KEY'))===null,'sending wrote to the betting model key'); }
      try{ w.localStorage.removeItem('live_parlays_v1'); }catch(e){}
      S.saved=JSON.parse(keep); F('save')(); F('renderParlay')();
      console.log('M2. send to live: both offered, sent once, marked, re-offered after a delete, the live page\'s own keys untouched');
    }
    d.getElementById('suggClose').click();
    chk(d.getElementById('suggModal').hidden,'Close did not shut the suggestions window');
    /* and it closes the way the game window does */
    d.getElementById('suggOpen').click();
    d.dispatchEvent(Object.assign(new w.Event('keydown'),{key:'Escape'}));
    chk(d.getElementById('suggModal').hidden,'Escape did not shut the suggestions window');
    d.getElementById('suggOpen').click();
    d.getElementById('suggModal').dispatchEvent(new w.Event('click'));
    chk(d.getElementById('suggModal').hidden,'a click on the background did not shut the window');
    d.getElementById('suggOpen').click(); chk(!d.getElementById('suggModal').hidden,'the window would not open a second time');
    d.getElementById('suggClose').click();
    console.log(`M. suggested parlays: ${SG.candidates} qualifying lines, tiers ${tiers.map(t=>t.label+' '+t.legs.length+' legs '+(t.corr*100).toFixed(0)+'%').join(', ')||'none'}`); }

  /* ---- P. the bet box on the suggested parlays ---- */
  { d.querySelector('#tabs button[data-tab="parlay"]').click();
    d.getElementById('suggOpen').click();          /* the bet box lives in the window now */
    const box=d.getElementById('suggStake');
    chk(!!box,'no bet box on the suggested parlays');
    if(box){
      const was=S.stake;
      chk(+box.value===+S.stake,'the bet box does not show the stake in use');
      box.value='55'; box.dispatchEvent(new w.Event('change'));
      chk(S.stake===55,'changing the bet box did not change the stake');
      const s=F('getSuggestions')();
      if(s.tiers.length){ const t=s.tiers[0];
        chk(d.getElementById('suggCard').textContent.replace(/\s+/g,' ').includes(`$${(55*t.dec).toFixed(2)}`),
          'the payout did not follow the bet box'); }
      chk(+d.getElementById('suggStake').value===55,'the bet box lost its value on re-render');
      /* the builder's own stake input is the same number */
      const pS=d.getElementById('pStake'); if(pS) chk(+pS.value===55,'the builder and the suggestions disagree on the stake');
      box.value=String(was); box.dispatchEvent(new w.Event('change'));
      chk(S.stake===was,'the stake did not go back');
    }
    console.log('P. bet box: drives the suggested payouts and shares the builder stake'); }

  /* ---- L. record chips beside the week dropdown ---- */
  { const main=F('trackRecord')().filter(r=>r.kind==='main'); const wkx=main.length?main[0].w:1;
    const ws=d.getElementById('weekSel'); const was=ws.value; ws.value=String(wkx); ws.dispatchEvent(new w.Event('change'));
    const want=rows=>`${rows.filter(r=>r.hit).length}\u2013${rows.filter(r=>!r.hit).length}`;
    chk(d.getElementById('weekRec').textContent===`Week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}`,'week record chip does not match graded main lines');
    chk(d.getElementById('seasonRec').textContent===`Season ${want(main)}`,'season record chip does not match graded main lines');
    ws.value=was; ws.dispatchEvent(new w.Event('change'));
    console.log(`L. record chips: week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}, season ${want(main)}`); }


  /* ---- S. the threshold ladder toggle ---- */
  { openUpcoming();
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
  { const s=F('getSuggestions')();
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

  /* ---- O. one suggested parlay on the game page ---- */
  { const g=openUpcoming(); const card=d.querySelector('.gsugg');
    chk(!!card,'the game page has no suggested parlay section');
    const s=F('gameSuggestion')(g);
    chk(s.legs.length===0||s.legs.length<=3,`a game suggestion ran to ${s.legs.length} legs`);
    chk(s.legs.every(l=>l.src==='real'),'a game suggestion used a line with no real price');
    chk(s.legs.every(l=>l.gid===g.id),'a game suggestion pulled in another game');
    chk(s.legs.filter(l=>l.grp==='TEAM').length<=1,'a game suggestion stacked two team bets');
    if(s.legs.length){
      chk(s.corr>0&&s.corr<1,'the game suggestion has a nonsense chance');
      chk([...card.querySelectorAll('.gsugg-legs li')].length===s.legs.length,'the card shows a different number of legs');
      chk(new RegExp(`${Math.round(s.corr*100)}% to land`).test(card.textContent.replace(/\s+/g,' ')),'the card does not show the chance');
    } else chk(/Nothing here clears the bar/.test(card.textContent),'an empty suggestion says nothing useful');
    /* the overlay re-renders whenever a player is expanded: that must not rebuild it */
    const before=F('gameSuggestion')(g); chk(before===s,'the game suggestion is not cached between renders');
    /* week 2 has no player prices until Saturday's pull, so price this game's rungs
       8 points worse than the model to exercise the populated path too */
    const keepOdds=JSON.parse(JSON.stringify(S.odds[g.id]||{}));
    const toML=p=>p<0.5?Math.round(100/p-100):-Math.round(100*p/(1-p));
    const rost=rosterFor(g,false); let put=0;
    for(const tm in rost) for(const x of rost[tm].players){
      if(x.gp<3) continue;
      for(const l of statLines(x)){ if(l.prob) continue;
        for(const r of l.rungs){ if(r.p<0.55||r.p>0.85||put>=12) continue;
          ((((S.odds[g.id]??={})[x.pl.id]??={})[l.stat]??={}))[String(r.k)]=toML(r.p-0.08); put++; } }
    }
    w.eval('GAME_SUGGEST_CACHE={}');
    const s2=F('gameSuggestion')(g);
    chk(put===0||s2.legs.length>=2,'priced lines are available and still no suggestion');
    chk(s2.legs.length<=3,`the suggestion ran to ${s2.legs.length} legs with prices available`);
    chk(s2.legs.every(l=>l.gid===g.id),'a priced suggestion pulled in another game');
    chk(s2.legs.every(l=>s2.legs.filter(x=>x.pid===l.pid).length<=2),'three legs landed on one player');
    chk(!s2.legs.length||(s2.corr>=0.30||s2.legs.length===2),'a suggestion above two legs fell under the Medium floor');
    chk(!s2.legs.length||(s2.dec>1&&isFinite(s2.dec)),'the suggested price is not a real payout');
    if(s2.legs.length){ d.querySelector('[data-game="'+g.id+'"]').click();
      const c2=d.querySelector('.gsugg');
      chk([...c2.querySelectorAll('.gsugg-legs li')].length===s2.legs.length,'the card and the suggestion disagree on legs');
      chk(new RegExp(`${Math.round(s2.corr*100)}% to land`).test(c2.textContent.replace(/\s+/g,' ')),'the card does not show the chance'); }
    /* the legs are clickable, and share the toggle the tables below use */
    if(s2.legs.length){
      const keepParlay=JSON.parse(JSON.stringify(S.parlay||{}));
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      const boxes=[...d.querySelectorAll('.gsugg-legs input[data-leg]')];
      chk(boxes.length===s2.legs.length,'the suggested legs are not all tickable');
      chk(boxes.every(b=>b.dataset.k!==undefined&&b.dataset.side),'a suggested leg is missing its threshold or side');
      chk(boxes.every(b=>!b.checked),'a suggested leg looks ticked with an empty parlay');
      boxes[0].click();
      chk(Object.keys(S.parlay).length===1,'ticking a suggested leg did not put it on the parlay');
      const first=s2.legs[0], put=S.parlay[first.key];
      chk(!!put&&put.k===first.k&&put.side===first.side,'the leg on the parlay is not the leg that was shown');
      chk(d.querySelector('.gsugg-legs input[data-leg]').checked,'the tick did not survive the re-render');
      chk(!!d.querySelector('.gsugg-pick.on'),'a ticked leg is not marked as on');
      d.querySelector('.gsugg-legs input[data-leg]').click();
      chk(Object.keys(S.parlay).length===0,'ticking a suggested leg again did not take it off');
      /* Add all, twice: the second press must not undo the first */
      d.querySelector('[data-suggest-all]').click();
      chk(Object.keys(S.parlay).length===s2.legs.length,'Add all did not add every leg');
      d.querySelector('[data-suggest-all]').click();
      chk(Object.keys(S.parlay).length===s2.legs.length,'Add all pressed twice toggled legs back off');
      chk(/On the parlay/.test(d.querySelector('[data-suggest-all]').textContent),'the button does not say the parlay is already on');
      /* Add all has just locked every leg; the plain shuffle is tested with none locked */
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      /* Shuffle: a different parlay of the same confidence, and the original still there */
      const sh=d.querySelector('[data-suggest-shuffle]');
      chk(!!sh,'no shuffle button on the game suggestion');
      chk(sh.disabled===!(s2.candidates>s2.legs.length),'the shuffle button is not disabled in step with the pool it has');
      const sig=ls=>ls.map(l=>l.key+'@'+l.k+l.side).sort().join(',');
      let shuffled=0;
      for(let i=0;i<4;i++){
        d.querySelector('[data-suggest-shuffle]').click();
        const a=F('gameAlternate')(g);
        chk(!!a,'shuffle left no answer at all');
        if(!a.val){ chk(a.miss&&/Nothing else in this game/.test(d.querySelector('.gsugg').textContent),'a shuffle that found nothing does not say so'); continue; }
        shuffled++;
        chk(a.val.legs.length>=2&&a.val.legs.length<=3,`a shuffled parlay ran to ${a.val.legs.length} legs`);
        chk(a.val.legs.every(l=>l.gid===g.id),'a shuffled parlay pulled in another game');
        chk(a.val.legs.every(l=>l.src==='real'),'a shuffled parlay used a line with no real price');
        chk(a.val.legs.filter(l=>l.grp==='TEAM').length<=1,'a shuffled parlay stacked two team bets');
        chk(a.val.legs.every(l=>a.val.legs.filter(x=>x.pid===l.pid).length<=2),'three shuffled legs landed on one player');
        chk(new Set(a.val.legs.map(l=>l.key)).size===a.val.legs.length,'a shuffled parlay repeated a line');
        chk(sig(a.val.legs)!==sig(s2.legs),'shuffle dealt the same parlay back');
        chk(Math.abs(a.val.corr-s2.corr)<=0.12,`a shuffled parlay is ${(Math.abs(a.val.corr-s2.corr)*100).toFixed(0)} points off the original's confidence`);
        chk(a.val.legs.length===2||a.val.corr>=0.30,'a shuffled parlay above two legs fell under the Medium floor');
        const card3=d.querySelector('.gsugg');
        chk([...card3.querySelectorAll('.gsugg-legs li')].length===a.val.legs.length,'the card and the shuffled parlay disagree on legs');
        chk(new RegExp(`${Math.round(a.val.corr*100)}% to land`).test(card3.textContent.replace(/\s+/g,' ')),'the card does not show the shuffled chance');
        chk(sig(F('gameSuggestion')(g).legs)===sig(s2.legs),'shuffling changed the model\'s own suggestion');
        /* opening the game again is the whole way back now, so it has to work every time */
        d.querySelector('[data-game="'+g.id+'"]').click();
        chk(!F('gameAlternate')(g),'reopening the game did not drop the shuffled parlay');
        chk([...d.querySelectorAll('.gsugg-legs li')].length===s2.legs.length,'reopening the game did not bring back the suggestion');
      }
      /* a thin pool has no second parlay at the same confidence to find, and the app
         says so rather than inventing one: demand an alternative only where there is
         plainly room for one, so a lean week cannot fail the audit and stop a publish */
      const pool=F('suggestCandidates')([g]).slice(0,18);
      const roomy=pool.length>=s2.legs.length+3&&new Set(pool.map(c=>c.pid)).size>=3;
      chk(!roomy||shuffled>0,`four shuffles found nothing in a pool of ${pool.length} lines over ${new Set(pool.map(c=>c.pid)).size} players`);
      console.log(`O2. shuffle: ${shuffled} of 4 dealt an alternative, pool ${pool.length} lines over ${new Set(pool.map(c=>c.pid)).size} players`);
      /* a ticked leg is locked: every shuffle has to keep it */
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      const lockBox=d.querySelector('.gsugg-legs input[data-leg]'), lockKey=lockBox.dataset.leg;
      lockBox.click();
      chk(Object.keys(S.parlay).length===1,'ticking a suggested leg did not lock it on the parlay');
      chk(!!d.querySelector('.gsugg-legs .lk'),'a locked leg is not marked locked');
      let keptAll=true, lockedAlts=0;
      for(let i=0;i<4;i++){
        const b=d.querySelector('[data-suggest-shuffle]'); if(!b||b.disabled) break;
        b.click();
        const a=F('gameAlternate')(g); if(!a||!a.val) continue;
        lockedAlts++;
        if(!a.val.legs.some(l=>l.key===lockKey)) keptAll=false;
        chk(a.val.legs.length===s2.legs.length,'a shuffle around a locked leg changed the parlay size');
      }
      chk(keptAll,'shuffle dropped a locked leg');
      if(lockedAlts) chk(!!d.querySelector('.gsugg-legs input[data-leg]:checked'),'the locked leg lost its tick after a shuffle');
      /* every leg locked leaves shuffle nothing to do, and it says so rather than pretending */
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      d.querySelector('[data-suggest-all]').click();
      chk(d.querySelector('[data-suggest-shuffle]').disabled,'shuffle is still live with every leg locked');
      chk(/Every leg is locked/.test(d.querySelector('.gsugg').textContent),'an all-locked card does not say why shuffle is dead');
      chk(F('shuffleSuggestion')(g)===null,'shuffle dealt a parlay with every leg locked');
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      /* leaving the game and opening it again starts back at the model's own pick */
      d.querySelector('[data-suggest-shuffle]').click();
      if(F('gameAlternate')(g)){
        d.getElementById('backBtn').click();
        d.querySelector('[data-game="'+g.id+'"]').click();
        chk(!F('gameAlternate')(g),'a shuffled parlay survived leaving the game');
        chk([...d.querySelectorAll('.gsugg-legs li')].length===s2.legs.length,'reopening the game did not show the original suggestion');
      }
      /* the alternative is held outside S, so nothing about it is ever saved */
      chk(!/"alt":true/.test(JSON.stringify(S)),'a shuffled parlay reached the saved state');
      S.parlay=keepParlay;
    }
    S.odds[g.id]=keepOdds; if(!Object.keys(keepOdds).length) delete S.odds[g.id];
    w.eval('GAME_SUGGEST_CACHE={}');
    /* the suggestion is the summary, the game bets table is the detail */
    { const cards=[...d.querySelectorAll('#gameView .card')];
      const iS=cards.findIndex(c=>c.classList.contains('gsugg')), iB=cards.findIndex(c=>c.classList.contains('gbets'));
      chk(iS>=0&&iB>=0&&iS<iB,'the suggested parlay is not above the game bets'); }
    console.log(`O. game suggestion: ${s.legs.length} leg(s) live, ${s2.legs.length} from ${put} priced rungs, capped at two legs a player`); }

  /* ---- N. the credit-pull panel, in place of the old price sheet ---- */
  { const box=d.getElementById('pricePull');
    chk(!!box,'the Weekly Update tab has no credit-pull panel');
    for(const id of ['oddsLegs','oddsTemplate','oddsUpload','oddsClear','oddsWeekSel','oddsFile','oddsStatus'])
      chk(d.getElementById(id)===null,`price sheet control still on the page: ${id}`);
    for(const id of ['fetchGames','statsLink','rosLink','injLink','dcLink','upAll','allFiles'])
      chk(d.getElementById(id)!==null,`free download/upload control went missing: ${id}`);
    const keep=PAY.price_pull;
    /* what this build actually carries: a recorded pull, with a time */
    chk(keep&&keep.at,'no credit pull recorded in the payload');
    F('renderPricePull')();
    chk(/Last credit pull/.test(box.textContent),'panel does not say when credits were last spent');
    chk(/\d{1,2}:\d\d/.test(box.textContent),'panel shows no time of day for the pull');
    for(const wk of Object.keys(PAY.prices||{}))
      chk(box.textContent.includes(`week ${wk}: ${PAY.prices[wk].length.toLocaleString()}`),`panel does not count week ${wk}'s prices`);
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
      chk(!!d.getElementById('slateNow')&&!!d.getElementById('slateEvery')&&!!d.getElementById('slateStamp'),
        'the Games tab has no scores control');
      chk(d.getElementById('slateEvery').value==='0','the Games tab should not poll until it is asked to');
      chk(LIVE.slate===false,'the Games tab starts with the scoreboard off');
      chk(d.getElementById('slateStamp').textContent==='scores off','the stamp does not say the scores are off');
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
      console.log(`T2. games tab scores: control present and off, ${wk==null?'no live game this week to drive':'score and clock on the card, one scoreboard call, no box scores'}`); }

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

    console.log(`\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
    fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
    errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
  })();
  return;
  console.log(`\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
  fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
  errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
},1800);
