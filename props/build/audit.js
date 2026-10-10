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
  chk(dupes===0,`duplicate players on a page: ${dupes}`); chk(wrongTeam===0,`players on wrong team: ${wrongTeam}`); chk(capViol===0,`depth cap violations: ${capViol}`);
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
          else chk(false,`${team}: with QB1 out the quarterback shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not the chart's QB2 ${S.players[two].n}`);
        } finally { delete S.inactive[one]; }
        if(tried>=6) break;
      } }
    chk(tried>0,'no team on the depth chart has a QB1 and a QB2 on its roster to test next man up with');
    console.log(`B2. next man up: ${ok} of ${tried} teams hand a ruled-out QB1's slot to the chart's QB2${thin?' (QB2s with under three games: last season is short)':''}`);
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

  /* ---- J2. the game total: over or under the posted points, priced, settled and correlated ---- */
  { const tb=F('totalBet'), mT=F('modelTotal'), SD=w.eval('TOTAL_SD');
    const gj=S.sched.find(x=>x.tot!=null)||S.sched[0], gx={...gj,tot:44.5};
    const o=tb(gx,'over'), u=tb(gx,'under');
    chk(Math.abs(o.p+u.p-1)<1e-12&&o.line===44.5&&u.line===44.5,'over and under chances do not sum to 1 on the posted total');
    chk(Math.abs(o.mu-(mT(gx)+44.5)/2)<1e-9&&Math.abs(o.p-(1-F('gbNorm')((44.5-o.mu)/SD)))<1e-12&&SD===13.2,'the total is not the model\'s points pulled halfway to the posted total, spread 13.2');
    chk(tb({...gx,tot:50.5},'over').p<o.p&&tb({...gx,tot:null},'over')===null,'a higher total should be harder to go over, and no total no leg');
    /* settlement on a made-up final: 27-20 is 47 points */
    S.sched.push({...gx,id:'ttest',hs:27,as:20});
    const st=(side,k)=>settleLeg({gid:'ttest',stat:'total',side,k,team:gx.a});
    chk(st('over',44.5)==='win'&&st('under',44.5)==='loss'&&st('over',47)==='push'&&st('under',47)==='push'&&st('over',47.5)==='loss'&&st('under',47.5)==='win','a game total settles wrong on a 47-point final');
    S.sched.pop();
    /* live: points only go up */
    const lg=F('liveGameLeg'), sc=(hs,as,state)=>({home:gx.h,away:gx.a,hs,as,state});
    chk(lg({stat:'total',side:'over',k:44.5,team:gx.a},sc(30,20,'live')).state==='hit'&&lg({stat:'total',side:'under',k:44.5,team:gx.a},sc(30,20,'live')).state==='missed'
      &&lg({stat:'total',side:'under',k:44.5,team:gx.a},sc(10,7,'post')).state==='hit'&&lg({stat:'total',side:'over',k:44.5,team:gx.a},sc(10,7,'live')).state==='live','a game total tracks wrong live');
    /* the leg: the book's price where the payload has one, -110 marked est. where it has none */
    const tl=F('totalLeg'), withP={...gx,tov:-105,tou:-115}, noP={...gx}; delete noP.tov; delete noP.tou;
    chk(tl(withP,'over').price===-105&&tl(withP,'over').src==='real'&&tl(withP,'under').price===-115&&tl(noP,'over').price===-110&&tl(noP,'over').src==='est'
      &&tl(withP,'over').key===tl(withP,'under').key&&/^Over 44\.5 points$/.test(tl(withP,'over').label)&&tl(withP,'over').grp==='TEAM','the total leg\'s price, its source, its label or its one key is wrong');
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
      if(ov&&un){ const tick=cb=>F('toggleLeg')(cb.dataset.leg,+cb.dataset.k,gopen,cb.dataset.side,cb.dataset.main==='1');
        tick(ov); let L=S.parlay[ov.dataset.leg];
        chk(!!L&&L.stat==='total'&&L.side==='over'&&L.k===gopen.tot&&L.price===(gopen.tov!=null?gopen.tov:-110)&&L.src===(gopen.tov!=null?'real':'est'),'ticking the over did not put the total on the parlay at its price');
        tick(un); L=S.parlay[ov.dataset.leg];
        chk(Object.keys(S.parlay).length===1&&L.side==='under','ticking the under did not take the over\'s place');
        chk(/Under [\d.]+ points/.test(d.getElementById('parlayBody').textContent),'the total is not shown in the builder');
        tick(un); chk(!S.parlay[ov.dataset.leg],'the total did not come back out'); }
      const locked=d.createElement('div'); locked.innerHTML=F('gameBetsCard')({...gopen,hs:24,as:20},true);
      chk(locked.querySelectorAll('.statblk').length===3&&!locked.querySelector('input[data-leg]'),'a kicked-off game\'s card does not mark the total with the two teams');
      S.parlay=JSON.parse(keepP); F('renderParlay')(); }
    console.log(`J2. game total: over ${(o.p*100).toFixed(1)}% at 44.5 (model ${mT(gx).toFixed(1)}), settles over, under and push, live, priced, correlated, ticked one side at a time`); }

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
      chk(firstFinal<0||lastTodo<firstFinal,`week ${wk}: a game still to play sits below a final`);
      chk(firstFinal<0?seps.length===0:(seps.length===1&&kids[firstFinal-1]===seps[0]),`week ${wk}: the Completed heading is missing, doubled or not right above the first final`);
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
     and a pick that leaves fewer legs than a tier needs gets the reason, not a smaller parlay. Run
     on the week as it is, and again on made-up lines (each starter's main line set off his own
     projection, a price on half the totals) so the player legs and the totals are always tried. */
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
    let built=0, said=0, legsSeen=0, thinSeen=0, corrTiers=0;
    /* every rule a tier keeps, on the picks as they stand */
    const hold=(lab)=>{
      const r=F('getPbTiers')(), games=F('pbGames')(), u=U();
      chk(r.tiers.length===4&&r.tiers.map(t=>t.id+t.n).join()===SPEC.map(s=>s[0]+s[2]).join(),`${lab}: the tiers are not Safe, Medium, Aggressive and Extreme at 2, 3, 4 and 5 legs`);
      const pool=games.length&&KINDS.some(k=>u.k[k])&&games.some(g=>!u.off.includes(g.id))?F('pbPool')(games.filter(g=>!u.off.includes(g.id))):{pref:[],thin:[]};
      const maxLegs=F('pbMaxLegs')([...pool.pref,...pool.thin]);
      /* the pool itself, whichever legs a tier happens to take: nothing under the book, no estimated
         price, nothing of a kind or game not ticked, a preferred leg only over the full bar */
      chk([...pool.pref,...pool.thin].every(c=>c.p>=mlP(c.price)&&c.src==='real'&&!!u.k[kindOf(c)]&&!u.off.includes(c.gid)),`${lab}: a leg under the book, on an estimated price, or of a kind or game not ticked is among the legs a tier may take`);
      chk(pool.pref.every(c=>c.p-mlP(c.price)>=0.03&&F('formAgrees')(c)),`${lab}: a preferred leg does not clear the 3-point bar and market + form`);
      for(const t of r.tiers){ const [,,n,floor]=SPEC.find(s=>s[0]===t.id);
        if(!t.legs){ said++;
          chk(typeof t.why==='string'&&t.why.length>10,`${lab}: the ${t.id} tier is empty and does not say why`);
          if(maxLegs<n) chk(/^(Only \d+ legs?|No legs|No games|No bet types)/.test(t.why),`${lab}: ${maxLegs} legs on the picks and the ${n}-leg tier does not say there are too few: ${t.why}`);
          continue; }
        built++; legsSeen+=t.legs.length;
        chk(t.legs.length===n,`${lab}: the ${t.id} tier has ${t.legs.length} legs, not ${n}`);
        chk(maxLegs>=n,`${lab}: a ${n}-leg ${t.id} tier from picks that only make ${maxLegs}`);
        for(const l of t.legs){ const g=S.sched.find(x=>x.id===l.gid);
          chk(!!u.k[kindOf(l)]&&!u.off.includes(l.gid)&&games.some(x=>x.id===l.gid),`${lab}: ${l.name} ${l.label} is of a kind or a game not ticked, or its game is not on the list`);
          chk(!!g&&!F('gameStarted')(g),`${lab}: ${l.name} ${l.label} is on a game that has kicked off`);
          chk(l.src==='real'&&isFinite(l.price)&&l.price!==0&&l.p>=0.45&&l.p<0.97,`${lab}: ${l.name} ${l.label} has no real price, or a chance out of 45-97%`);
          chk(l.p>=mlP(l.price),`${lab}: ${l.name} ${l.label} is rated below the book (${(l.p*100).toFixed(1)}% against ${(mlP(l.price)*100).toFixed(1)}%)`);
          chk(l.thin===!(l.p-mlP(l.price)>=0.03&&F('formAgrees')(l)),`${lab}: ${l.name} ${l.label} is marked thin wrongly`);
          if(l.thin) thinSeen++; }
        chk(new Set(t.legs.map(l=>l.key)).size===n,`${lab}: the ${t.id} tier has one line twice (or both sides of one)`);
        const gl=t.legs.filter(isG), pl=t.legs.filter(l=>!isG(l));
        chk(new Set(gl.map(l=>l.gid)).size===gl.length,`${lab}: the ${t.id} tier has two game bets on one game`);
        chk(new Set(pl.map(l=>l.pid)).size===pl.length,`${lab}: the ${t.id} tier has two legs on one player`);
        /* the card's numbers are the builder's own sums on the legs as the builder orders them */
        const order=t.legs.map(l=>l.key).join(), want=[...t.legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name))).map(l=>l.key).join();
        chk(order===want,`${lab}: the ${t.id} tier's legs are not in the builder's order`);
        chk(pp(t.legs).corr===t.corr&&pd(t.legs.map(l=>({leg:l,ml:l.price})))===t.dec,`${lab}: the ${t.id} tier's chance or price is not what parlayProb and parlayDec say`);
        if(floor) chk(t.corr>=floor,`${lab}: the ${t.id} tier lands ${(t.corr*100).toFixed(1)}%, under its ${floor*100}% floor`);
        chk(t.thin===t.legs.filter(l=>l.thin).length,`${lab}: the ${t.id} tier miscounts its thin legs`);
        /* thin legs only fill what the preferred could not */
        if(t.thin) chk(F('pbTier')(SPEC.find(s=>s[0]===t.id),{pref:pool.pref,thin:[]},new Map())===null,`${lab}: the ${t.id} tier took a thin leg the preferred legs did not need`);
        if(!floor&&pool.pref.length>=2){ /* Safe is the likeliest pair: the two likeliest preferred legs that fit together do not beat it */
          const s=[...pool.pref].sort((a,b)=>b.p-a.p), a=s[0], b=s.slice(1).find(x=>F('pbFits')([a],x));
          if(b&&!t.thin) chk(t.corr>=pp([a,b]).corr-0.01,`${lab}: Safe lands ${(t.corr*100).toFixed(1)}%, under the two likeliest legs together`); }
        /* the mixes: Teams only is game bets, Players only is players' lines */
        if(!u.k.over&&!u.k.under) chk(t.legs.every(isG),`${lab}: a player leg with neither player box ticked`);
        if(!u.k.ml&&!u.k.ats&&!u.k.total) chk(!t.legs.some(isG),`${lab}: a game bet with no team box ticked`); }
      /* the card on the page says the same */
      F('renderPb')();
      for(const t of r.tiers){ const c=d.querySelector(`#pbPanel .pb-tier.${t.id}`); if(!c){ chk(false,`${lab}: no card for the ${t.id} tier`); continue; }
        const tx=c.textContent.replace(/\s+/g,' ');
        if(!t.legs) chk(tx.includes(t.why)&&!c.querySelector('[data-pb-add]'),`${lab}: the empty ${t.id} card does not give its reason, or offers Add to builder`);
        else chk(c.querySelectorAll('.pb-legs li').length===t.legs.length&&tx.includes(`${(t.corr*100).toFixed(0)}%`)&&tx.includes(F('fmtML')(F('decToML')(t.dec)))
          &&tx.includes((10*t.dec).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}))&&!!c.querySelector(`[data-pb-add="${t.id}"]`),`${lab}: the ${t.id} card does not show its legs, chance, price and what $10 pays`); }
      return r; };
    const keepU=JSON.stringify(U());
    /* the week as it is, under each mix, then one game, then none, then no bet types */
    for(const [m,ks] of [['all',KINDS],['teams',['ml','ats','total']],['players',['over','under']]]){
      d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).click();
      chk(KINDS.every(k=>U().k[k]===ks.includes(k))&&d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).classList.contains('on')&&d.querySelectorAll('#pbPanel [data-pb-mix].on').length===1,`the ${m} mix did not set its boxes, or does not show as chosen`);
      chk([...d.querySelectorAll('#pbPanel [data-pb-kind]')].every(cb=>cb.checked===ks.includes(cb.dataset.pbKind)),`the ${m} mix's boxes are not ticked to match`);
      hold('this week, '+m); }
    /* a box changed by hand: the mix it makes, or Custom */
    d.querySelector('#pbPanel [data-pb-mix="all"]').click();
    { const cb=d.querySelector('#pbPanel [data-pb-kind="total"]'); cb.checked=false; cb.dispatchEvent(new w.Event('change'));
      chk(U().k.total===false&&!d.querySelector('#pbPanel [data-pb-mix].on')&&/Custom/.test(d.getElementById('pbPanel').textContent),'unticking a box under All does not read as Custom');
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
      /* Teams only on one game: one game bet a game makes one leg, so every tier says there are too few */
      d.querySelector('#pbPanel [data-pb-mix="teams"]').click();
      const r1=hold('one game, teams only');
      chk(r1.tiers.every(t=>!t.legs&&/^(Only 1 leg|No legs) on your picks: tick more games or bet types\.$/.test(t.why)),'one game\'s team bets did not leave every tier saying there are too few legs: '+r1.tiers.map(t=>t.why).join(' / '));
      d.querySelector('#pbPanel [data-pb-games="all"]').click(); d.querySelector('#pbPanel [data-pb-mix="all"]').click(); }
    setKinds([]); { const r0=F('getPbTiers')(); chk(r0.tiers.every(t=>!t.legs&&/No bet types ticked/.test(t.why)),'with no bet type ticked the tiers did not say so'); }
    setKinds(KINDS); F('renderPb')();
    /* ---- the same on made-up lines: every player leg kind and the totals in play ---- */
    { const cw=F('currentWeek')(), keepM=JSON.stringify(PAY.mkt[String(cw)]||null), keepT=S.sched.map(g=>[g.tov,g.tou]);
      const M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{}); let nL=0;
      games.forEach((g,gi)=>{ if(gi%2===0){ g.tov=-105; g.tou=-115; }
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
        chk(plLegs(g1)<12||corrTiers>0,`one game's made-up player lines (${plLegs(g1)} of them) built no tier with legs that move together, so nothing holds a same-game tier to parlayProb`);
        U().off=[]; }
      setKinds(KINDS);
      const rA=F('getPbTiers')();
      chk(!games.length||rA.tiers.some(t=>t.legs&&t.legs.some(l=>!isG(l))),'with made-up lines on every starter no tier has a player leg');
      chk(!games.length||F('pricedLegs')(games,true).some(l=>l.stat==='total')&&!F('pricedLegs')(games).some(l=>l.stat==='total'),'the totals with a price are not among the legs the suggestions use, or leak into the game pages\' and the Elo picks\'');
      /* market + form gates the player legs once the Elo tab is on the page */
      w.eloLoaded=()=>false; w.eval('PB_CACHE=new Map()');
      chk(F('getPbTiers')().tiers.every(t=>!t.legs||t.legs.every(isG)),'before the Elo files load a player leg is suggested');
      w.eloLoaded=()=>true; w.eloAltP=()=>0.01; w.eval('PB_CACHE=new Map()');
      chk(F('pbPool')(games).pref.every(isG),'a player leg market + form rates under the book is not marked thin');
      hold('market + form against every player leg');
      delete w.eloAltP; delete w.eloLoaded; w.eval('PB_CACHE=new Map()');
      /* Add to builder: exactly the tier's legs, priced as the tier was */
      const t=F('getPbTiers')().tiers.filter(x=>x.legs).slice(-1)[0];
      if(t){ const keepP=JSON.stringify(S.parlay||{}), keepB=S.bookPrice; S.parlay={'stale|p|x':{gid:'stale',pid:'p',stat:'x',k:1,side:'over',name:'Stale',week:cw,p:0.5,price:-110}}; F('renderParlay')();
        d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`).click();
        const keys=Object.keys(S.parlay);
        chk(keys.length===t.legs.length&&t.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side&&!!S.parlay[l.key].main===!!l.main),'Add to builder did not put exactly the tier\'s legs in the builder');
        const body=d.getElementById('parlayBody').textContent.replace(/\s+/g,' ');
        chk(body.includes(`${t.legs.length}-leg parlay`)&&body.includes((t.corr*100).toFixed(1)+'%')&&body.includes('$'+(S.stake*t.dec).toFixed(2)),'the builder does not show the tier\'s chance and payout after Add to builder');
        chk(/In the builder/.test(d.querySelector(`#pbPanel [data-pb-add="${t.id}"]`).textContent),'the tier does not say it is in the builder');
        S.parlay=JSON.parse(keepP); S.bookPrice=keepB; F('save')(); F('renderParlay')(); }
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
    /* with no game to come the panel says so and offers nothing: the regular season over, or every game of the week under way */
    { w.__pbKeep=w.eval('[pbGames, seasonOver]');
      w.eval('pbGames=function(){ return []; }; seasonOver=function(){ return true; }; renderParlay();');
      chk(/regular season is over: no game is left/.test(panel.textContent)&&!panel.querySelector('[data-pb-mix],.pb-tier,[data-pb-add]'),'with the season over the panel does not say so, or still offers something');
      w.eval('seasonOver=function(){ return false; }; renderParlay();');
      chk(/has kicked off, so there is nothing left to build from/.test(panel.textContent),'with every game of the week under way the panel does not say so');
      w.eval('pbGames=window.__pbKeep[0]; seasonOver=window.__pbKeep[1];'); delete w.__pbKeep; }
    S.ui.pb=JSON.parse(keepU); F('save')(); F('renderParlay')(); } }

  /* ---- P. the amount buttons in the builder; the suggested parlays are always on $10 ---- */
  { d.querySelector('#tabs button[data-tab="parlay"]').click();
    chk(!d.getElementById('suggStake')&&!d.querySelector('#pbPanel [data-stake-chip]'),'the suggested parlays carry a bet box or amount buttons of their own: they are shown on $10');
    { const was=S.stake;
      /* and in the builder, with a leg in it so What it pays is drawn */
      const keep=JSON.stringify(S.parlay||{}); S.parlay={};
      openUpcoming();
      const tick=d.querySelector('#gameView input[data-leg]');
      chk(!!tick,'no leg to tick on the coming game');
      if(tick){ tick.click(); d.querySelector('#tabs button[data-tab="parlay"]').click();
        const chip5=d.querySelector('#parlayBody [data-stake-chip="5"]');
        chk(!!chip5,'no amount buttons beside the stake in What it pays');
        if(chip5){ chip5.click();
          chk(S.stake===5&&+d.getElementById('pStake').value===5,'tapping $5 in the builder did not set the stake');
          chk(d.querySelector('#parlayBody [data-stake-chip="5"]').classList.contains('on')&&d.querySelectorAll('#parlayBody [data-stake-chip].on').length===1,'the builder does not show $5 pressed, and only $5');
          chk(/\$\d+\.\d\d/.test(d.querySelector('#parlayBody .payout').textContent)&&+d.querySelector('#parlayBody .payout').textContent.replace(/[^\d.]/g,'')>5,'the builder payout did not redraw from the $5 stake'); }
        /* a typed amount that is none of them presses none */
        const pS=d.getElementById('pStake'); pS.value='7'; pS.dispatchEvent(new w.Event('change'));
        chk(S.stake===7&&!d.querySelector('#parlayBody [data-stake-chip].on'),'a typed $7 left a chip pressed');
        S.parlay=JSON.parse(keep); }
      S.stake=was; F('save')(); F('renderParlay')();
      chk(S.stake===was,'the stake did not go back after the amount buttons');
    }
    console.log('P. amount buttons: the builder\'s stake in one tap; the suggested parlays stay on $10'); }

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
    chk(T.pool>=4?spec.every(([id])=>!!T[id]):true,`a game with ${T.pool} lines left a tier empty`);
    for(const [id,,n,floor,minP] of spec){ const t=T[id]; if(!t) continue;
      chk(t.relaxed||t.corr>=minP-0.03,`the ${id} tier lands ${(t.corr*100).toFixed(0)}%, under its ${minP*100}% floor, without saying so`);
      chk(t.legs.every(l=>l.p>=0.40),`the ${id} tier has a leg under a 40% chance`);
      chk(t.legs.length===n,`the ${id} tier has ${t.legs.length} legs, not ${n}`);
      chk(t.legs.every(l=>l.gid===g.id)&&t.legs.filter(l=>l.grp==='TEAM').length<=1&&t.legs.every(l=>t.legs.filter(x=>x.pid===l.pid).length<=2)&&new Set(t.legs.map(l=>l.key)).size===n,`the ${id} tier breaks the leg rules`);
      chk(t.legs.every(l=>l.price>=MIN&&isFinite(l.price)),`the ${id} tier has a leg shorter than ${MIN}`);
      chk(t.corr>0&&t.corr<1&&t.dec>1,`the ${id} tier has a nonsense chance or price`);
      chk(t.relaxed||t.dec>=1+floor/100-0.02,`the ${id} tier pays ${t.dec.toFixed(2)}, under its +${floor} floor, without saying so`); }
    /* each tier grows the one before */
    if(T.high&&T.med) chk(T.high.legs.every(l=>T.med.legs.some(x=>x.key===l.key&&x.k===l.k)),'Medium does not grow High');
    if(T.med&&T.low) chk(T.med.legs.every(l=>T.low.legs.some(x=>x.key===l.key&&x.k===l.k)),'Low does not grow Medium');
    /* the pool: book prices where they exist, the model's estimate on the rest, ladders included */
    { const pool=F('gameLegPool')(g);
      chk(pool.every(c=>c.gid===g.id&&c.price>=MIN&&(c.src==='real'||c.src==='est')),'the leg pool has a line from another game, too short a price or no source');
      chk(pool.some(c=>!c.main&&c.grp!=='TEAM'&&c.stat!=='any_td'),'the leg pool has no threshold ladders'); }
    /* the high pair is the best payout for its chance among its seeds, not a safe nothing */
    if(T.high){ const one=c=>c.p*F('mlToDec')(c.price), pool=F('gameLegPool')(g).sort((a,b)=>one(b)-one(a));
      const a=pool[0], b=pool.find(c=>c.key!==a.key&&!(c.grp==='TEAM'&&a.grp==='TEAM'));
      if(a&&b){ const pd=F('parlayDec')([{leg:a,ml:a.price},{leg:b,ml:b.price}]), pr=F('parlayProb')([a,b],20000).corr;
        const [,,,hf,hp]=spec[0];
        /* only a pair High could take: the tier's own payout and chance floors, with room for simulation noise */
        chk(pd<1+hf/100||pr<hp+0.03||T.high.corr*T.high.dec>=pr*pd-0.06,'the High pair returns less than the two best single legs together'); } }
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
    /* the game bets open under each game on the Pick'ems tab; a game page here is its players */
    chk(!!d.querySelector('#gameView .gsugg')&&!d.querySelector('#gameView .gbets'),'the game page still carries the Game bets card');
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
    /* I3. the suggested parlays' choices are the reader's, kept in S.ui.pb across a reload; a
       damaged one reads as everything ticked */
    { const pb={k:{ml:true,ats:false,total:true,over:false,under:true},off:['2099_01_XX_YY'],gx:true};
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),stake:20,ui:{pb,suggestSide:'any'}});
      await F('boot')(); let SP=w.eval('S');
      chk(JSON.stringify(SP.ui.pb)===JSON.stringify(pb),'the suggested parlays\' choices did not survive a reload: '+JSON.stringify(SP.ui.pb));
      { const kb=d.querySelector('#pbPanel [data-pb-kind="ats"]');
        chk(!F('pbGames')().length||(/Custom/.test(d.getElementById('pbPanel').textContent)&&!!kb&&!kb.checked),'the panel did not draw the choices it was reloaded with'); }
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),ui:{pb:{k:'bad',off:'<x>',gx:3}}});
      await F('boot')(); SP=w.eval('S');
      chk(Object.values(SP.ui.pb.k).every(v=>v===true)&&Array.isArray(SP.ui.pb.off)&&!SP.ui.pb.off.length&&SP.ui.pb.gx===null,'a damaged saved choice did not read as everything ticked');
      console.log('I3. suggested parlays: the bet types, the games and the open list come back after a reload; a damaged save reads as all ticked'); }
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
      /* a book's name against a player's, the rule build/names.py matches with: the same name, his
         football name with his surname, or only a short first name (Cam for Cameron) */
      const nrm=s=>String(s||'').normalize('NFKD').replace(/[^ -~]/g,'').toLowerCase().replace(/[.'`-]/g,'').replace(/\s+/g,' ').trim().replace(/\s+(jr|sr|ii|iii|iv|v)$/,'').trim();
      const shortForm=(a,b)=>{ if(!a||!b) return false; const [lo,hi]=a.length<=b.length?[a,b]:[b,a]; let c=0; while(c<a.length&&c<b.length&&a[c]===b[c]) c++; return (lo.length>=3&&hi.startsWith(lo))||c>=4; };
      const nameRule=(book,full,alias)=>{ const b=nrm(book), f=nrm(full), al=alias?nrm(alias):null; if(!b) return null; if(b===f||(al&&b===al)) return 'exact';
        const bp=b.split(' '), pp=f.split(' '); if(bp.length<2||pp.length<2||bp.slice(1).join(' ')!==pp.slice(1).join(' ')) return null; return shortForm(bp[0],pp[0])?'short':null; };
      chk(nameRule('Cam Ward','Cameron Ward')&&nameRule('Kenny Gainwell','Kenneth Gainwell')&&nameRule('A.J. Brown','AJ Brown')==='exact'&&!nameRule('Jalon Daniels','Jayden Daniels')&&!nameRule('Jeremiyah Love','Jordan Love')&&!nameRule('Kevin Coleman Jr.','Keon Coleman')&&!nameRule('Brian Robinson Jr.','Bijan Robinson'),'the name rule lets a different player through, or stops a short name');
      const R=PAY.roster||null, rawRo={}; for(const r of (rRoster||[])) if(r.gsis_id) rawRo[r.gsis_id]=r;
      const who=pid=>{ const e=R&&R[pid], r=rawRo[pid], p=SV.players[pid];
        return {name:(e&&e[2])||(r&&r.full_name)||(p&&p.n)||'', alias:(e&&e[4])||(r&&r.football_name&&r.football_name!==r.first_name?`${r.football_name} ${r.last_name}`:null)}; };
      const rstat=pid=>{ const e=R&&R[pid]; if(e) return {st:e[1],wk:+e[3]}; const r=rawRo[pid]; return r?{st:r.status,wk:+r.week}:null; };
      const cw=F('currentWeek')(), openG=SV.sched.filter(g=>+g.w===cw&&!F('gameStarted')(g));
      const gOf=id=>SV.sched.find(g=>g.id===id), gamesInWeek=wk=>SV.sched.filter(g=>+g.w===+wk).map(g=>g.id);

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
        chk(!bad.length,`players the roster has on a reserve list, released or inactive are on this week's pages: ${bad.length} (${bad.slice(0,5).join('; ')})`);
        chk(!dev.length,`practice-squad players with no chart place and no recent game start: ${dev.slice(0,5).join('; ')}`);
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
        chk(!bad.length,`gap notes that misstate why a player is not shown: ${bad.slice(0,4).join('; ')}`);
        const D=PAY.depth||{}; let tried=0, ok=0;
        for(const team of new Set(Object.values(D).map(d=>d[0]))){
          const q=rk=>Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===rk&&SV.players[id]&&SV.players[id].team===team&&!SV.inactive[id]);
          const one=q(1), two=q(2), g=SV.sched.find(x=>+x.w===cw&&(x.a===team||x.h===team))||SV.sched.find(x=>x.a===team||x.h===team);
          if(!one||!two||!g) continue;
          tried++; const P2=SV.players[two], keep=[P2.gp,P2.base_gp]; P2.gp=1; P2.base_gp=0;
          SV.inactive[one]={week:cw,status:'Out',inj:'Thumb'};
          try{ const r=F('rosterFor')(g,false)[team], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter), gap=r.gaps.find(x=>x.id===one);
            if(qb.length===1&&qb[0].pl.id===two&&gap&&gap.why==='ruled out, thumb') ok++;
            else chk(false,`${team}: QB1 ruled out and a one-game QB2: the starter shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, and QB1 reads "${gap?gap.why:'nothing'}"`);
          } finally { P2.gp=keep[0]; P2.base_gp=keep[1]; delete SV.inactive[one]; }
          if(tried>=4) break; }
        chk(tried>0,'no team on the chart has a QB1 and a QB2 to test the next man up with');
        console.log(`V4. ruled out: ${n} gap notes this week, each giving the real reason; ${ok} of ${tried} teams start a one-game QB2 when QB1 is ruled out`); }

      /* V5. the injury report: the payload carries the downloaded one, its Outs leave the page, its
         Questionables wear a Q; and the rules, on a made-up report for a real team */
      { let msg='';
        if(rInj){ const isReg=r=>+r.season===SEASON&&String(r.game_type||r.season_type||'REG')==='REG';
          const cur=rInj.filter(r=>isReg(r)&&+r.week===+PAY.week), pc=(PAY.injuries||[]).filter(r=>+r.week===+PAY.week).length;
          chk(pc===cur.length,`the payload has ${pc} injury rows for week ${PAY.week}, the downloaded report ${cur.length}`);
          const past=rInj.filter(r=>isReg(r)&&+r.week<+PAY.week&&['Out','Doubtful'].includes(r.report_status)&&SKILL.has(String(r.position).toUpperCase())).length;
          const ppast=(PAY.injuries||[]).filter(r=>+r.week<+PAY.week).length;
          chk(ppast===past,`the payload has ${ppast} earlier Outs, the downloaded report ${past}`);
          const miss=[], listed=[];
          if(+PAY.week===cw){
            for(const r of cur){ const id=r.gsis_id, st=r.report_status; if(!SV.players[id]) continue;
              if((st==='Out'||st==='Doubtful')&&!SV.inactive[id]) miss.push(`${r.full_name} ${st}`);
              if(st==='Questionable'&&!SV.inactive[id]&&(F('injTag')(id)||{}).k!=='q') miss.push(`${r.full_name} Questionable without a Q`); }
            const out=new Set(cur.filter(r=>r.report_status==='Out'||r.report_status==='Doubtful').map(r=>r.gsis_id));
            for(const g of openG){ const ro=F('rosterFor')(g,true); for(const t in ro) for(const x of ro[t].players) if(out.has(x.pl.id)) listed.push(`${g.id} ${x.pl.n}`); } }
          chk(!miss.length,`the report is not on the page: ${miss.slice(0,5).join('; ')}`);
          chk(!listed.length,`players ruled out are on this week's pages: ${listed.slice(0,5).join('; ')}`);
          msg=`${pc} rows for week ${PAY.week} and ${ppast} earlier Outs, as downloaded; every Out off the page, every Questionable tagged; `; }
        /* the rules: out in his team's last game and no word yet is pending (treated as out); not on
           his team's report once it is filed, or with a final report that gives him no status, he is
           cleared; Questionable with no practice is out; Questionable wears a Q and, like a player who
           did not practise, stays out of the suggestions; limited practice is only a tag */
        const g2=SV.sched.find(g=>+g.w>=2&&F('prevTeamWeek')(g.h,+g.w)!=null);
        if(g2){ const T=g2.h, W=+g2.w, PW=F('prevTeamWeek')(T,W), row=(id,wk,st,pr)=>({season:SEASON,week:wk,gsis_id:id,team:T,report_status:st||'',practice_status:pr||'',injury:'Knee'});
          const ii=F('ingestInjuries'), inact=()=>w.eval('S').inactive, tag=id=>(w.eval('INJ')[id]||{}).k||null, sug=F('suggestable');
          const base=[row('V1',PW,'Out'),row('V2',PW,'Out'),row('V3',PW,'Out'),row('V8',PW,'Doubtful'),row('V10',PW,'Doubtful')];
          const A=(SV.actuals[String(PW)]??={}); A.V8={team:T,receptions:2};   /* V8 was listed doubtful, and played */
          try{ ii(base,W); }finally{ delete A.V8; }
          chk(['V1','V2','V3','V10'].every(id=>inact()[id]&&inact()[id].status==='Pending'),'out or doubtful last game with no report yet is not pending');
          chk(!inact().V8,'a player listed doubtful last game who has a stat line in it is held out as pending');
          chk(/^ruled out until his status is filed/.test(F('inactiveWhy')(inact().V1)),'a pending player does not read "ruled out until his status is filed"');
          /* filed, no game statuses yet (a Wednesday or Thursday report) */
          const filed=[...base,row('V2',W,'','Did Not Participate In Practice'),row('V3',W,'','Limited Participation in Practice'),
            row('V7',W,'','Did Not Participate In Practice'),row('V9',W,'','Full Participation in Practice')];
          ii(filed,W);
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
          ii([],W); chk(!Object.values(inact()).some(r=>r&&r.week!=='season'),'an empty report left someone ruled out for the week');
          ii(fin,W,true); chk(inact().V6&&!inact().V2&&!inact().V4,'a past week is not graded on its final report\'s game statuses alone');
          ii(PAY.injuries||[]); F('applyRoster')(PAY.roster); }
        console.log(`V5. injury report: ${msg}pending, cleared, Q, no-practice and limited each behave on a made-up report for ${g2?g2.h:'no team'}`); }

      /* V6. nobody out, pending, Questionable or missing practice is in a suggested parlay */
      { const legs=[]; for(const t of F('getPbTiers')().tiers) if(t.legs) legs.push(...t.legs);
        for(const g of openG){ const T=F('gameTiers')(g); for(const id of ['high','med','low']) if(T[id]) legs.push(...T[id].legs); }
        const pool=[...F('pricedLegs')(undefined,true),...openG.flatMap(g=>F('gameLegPool')(g))];
        const bad=[...new Set([...legs,...pool].filter(l=>l.grp!=='TEAM'&&!F('suggestable')(l.pid)).map(l=>l.name))];
        chk(!bad.length,`suggested legs on players who may not play: ${bad.slice(0,5).join(', ')}`);
        const g=openG.find(x=>F('gameLegPool')(x).some(l=>l.grp!=='TEAM'));
        if(g){ const pid=F('gameLegPool')(g).find(l=>l.grp!=='TEAM').pid, INJ=w.eval('INJ'), keep=INJ[pid];
          INJ[pid]={k:'q',t:'Q',title:'Questionable'}; w.eval('GAME_TIER_CACHE={}');
          chk(!F('gameLegPool')(g).some(l=>l.pid===pid)&&!F('pricedLegs')([g]).some(l=>l.pid===pid),'a Questionable player stayed in a game\'s suggestions');
          if(keep) INJ[pid]=keep; else delete INJ[pid]; w.eval('GAME_TIER_CACHE={}'); }
        console.log(`V6. suggestions: ${legs.length} suggested legs and ${pool.length} candidates, none on a player who may not play; a Questionable tag takes a player out of the pool`); }

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

      /* V9. a leg on a player who did not play is void once his game's stats are in, and a won
         parlay with a void leg pays on the rest at their own prices */
      { const g=SV.sched.find(x=>SV.processedGames[x.id]&&x.hs!=null&&x.hs!==x.as);
        if(g){ const leg={week:+g.w,gid:g.id,pid:'00-NOT-A-PLAYER',team:g.h,stat:'receptions',k:3,side:'over',main:false,price:-110};
          const win={week:+g.w,gid:g.id,team:g.hs>g.as?g.h:g.a,stat:'ml',k:0,price:-150};
          chk(F('settleLeg')(leg)==='void','a leg on a player with no stat line in a graded game is not void');
          chk(F('settleLeg')({...leg,gid:'not-graded-yet'})===null,'a leg whose game has no stats yet should wait');
          const p={stake:10,payout:10*F('mlToDec')(-110)*F('mlToDec')(-150),legs:[leg,win]}, s=F('settleParlay')(p);
          chk(s.status==='won'&&Math.abs(F('settledReturn')(p,s)-10*F('mlToDec')(-150))<1e-9,'a won parlay with a void leg does not pay the rest at their prices');
          const pv={stake:10,payout:19,legs:[leg]}; chk(F('settleParlay')(pv).status==='void'&&F('settledReturn')(pv)===10,'an all-void parlay does not return the stake'); }
        console.log(`V9. void legs: ${g?'settle void, and the rest of the parlay pays at its own prices':'no graded game to test on'}`); }

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
        console.log(`V12. line sources: DraftKings on ${dk} games, every pull within a day of its kickoff; nflverse on ${nv}`); }

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

      if(skipped.length) console.log(`V. raw files not compared (PROPS_AUDIT_RAW is not set; weekly.py sets it): ${skipped.join(', ')}`);
      if(notPosted.length) console.log(`V. raw files not compared because nflverse has not posted them yet: ${notPosted.join(', ')}`);
    })(); }catch(e){ chk(false,'section V threw: '+(e&&e.stack||e)); }

    console.log(`\n${checks} checks, ${fails.length} failures, ${errs.length} runtime errors`);
    fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
    errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
    /* the page's own timers (the suggested parlays look for a kickoff every half minute) end
       with its window, so node ends when the audit does */
    w.close();
  })();
},1800);
