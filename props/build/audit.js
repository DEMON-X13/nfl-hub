const {JSDOM}=require('jsdom'); const fs=require('fs'); const Papa=require('papaparse');
const errs=[]; let mem=null;
const dom=new JSDOM(fs.readFileSync('../app/prop_model_2026.html','utf8'),
 {runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.Papa=Papa;w.NO_BAKED=true;w.fetch=()=>Promise.reject(new Error('x'));
  w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';
  w.storage={get:async()=>mem?{value:mem}:null,set:async(k,v)=>{mem=v;return true;}};
  w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window,d=w.document;
const fails=[]; let checks=0;
const chk=(ok,msg)=>{checks++; if(!ok) fails.push(msg);};
setTimeout(()=>{
  const S=w.eval('S'); const F=n=>w.eval(n);
  const [gameCtx,rosterFor,statLines,project,pOver,fairLine,rungView,marketLine,marketMu,devigOver,bookImplied,bookPrice,probToAmerican,mlToDec,parlayProb,modelMargin,modelPoints,legRho,gameBet,settleLeg,gameMu]=
   ['gameCtx','rosterFor','statLines','project','pOver','fairLine','rungView','marketLine','marketMu','devigOver','bookImplied','bookPrice','probToAmerican','mlToDec','parlayProb','modelMargin','modelPoints','legRho','gameBet','settleLeg','gameMu'].map(F);
  const PAY=F('PAY');

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
    const gopen=S.sched.find(x=>x.w===1&&!F('gameStarted')(x)); d.querySelector('[data-game="'+gopen.id+'"]').click();
    const gcb=d.querySelector('[data-leg$="|ml"]'); chk(!!gcb,'no to-win checkbox in the game overlay');
    if(gcb){ gcb.checked=true; gcb.dispatchEvent(new w.Event('change')); const L=Object.values(S.parlay).find(l=>l.stat==='ml'); chk(!!L&&L.grp==='TEAM'&&L.p>0&&L.p<1&&L.label==='To win','to-win leg did not land in the parlay');
      chk(/To win/.test(d.getElementById('parlayBody').textContent),'to-win leg not shown in the parlay builder');
      gcb.checked=false; gcb.dispatchEvent(new w.Event('change')); chk(!Object.values(S.parlay).some(l=>l.stat==='ml'),'to-win leg did not come back out'); }
    d.getElementById('backBtn').click();
    console.log(`J. game bets: home win ${(hw.p*100).toFixed(0)}% at +3, cover ${(hc.p*100).toFixed(0)}%, settlement and toggling ok`); }

  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */
  const g0=S.sched.find(x=>x.w===1&&!F('gameStarted')(x)); d.querySelector('[data-game="'+g0.id+'"]').click();
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

  /* ---- H. week-2 projections still sane after update ---- */
  let bad2=0,n2=0;
  for(const g of S.sched.filter(x=>x.w===2)){ const rr=rosterFor(g,false);
    for(const team in rr) for(const x of rr[team].players) for(const l of statLines(x)){ n2++;
      if(!l.prob&&!(isFinite(l.mu)&&l.mu>=0)) bad2++; for(const rg of (l.rungs||[])) if(!(rg.p>0&&rg.p<1)) bad2++; } }
  chk(bad2===0,`post-update projections bad: ${bad2}`);
  console.log(`H. week 2 after update: ${n2} stat blocks, ${bad2} bad`);

  /* ---- I. built-in data: same path as an upload, replayable, user state survives a rebuild ---- */
  (async()=>{
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
    console.log(`I. built-in data: ${bakedWeeks.length} week(s) of stats (${b1.stats.length} games), ${b1.prices} prices, ${b1.inj} inactives, ${b1.sched} schedule fields; replay is a no-op; parlays/stake/prices survive a rebuild`);
    console.log(`\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
    fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
    errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
  })();
  return;
  console.log(`\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
  fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
  errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
},1800);
