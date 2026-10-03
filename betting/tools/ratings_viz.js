/* Power Ratings, Vegas's: every team in points better or worse than an average team on a
   neutral field, read out of this season's point spreads. Each game's spread is taken as
   home field plus the home side's rating minus the away side's (no home field at a neutral
   site), and the ratings are the ones that fit every line through the current week best,
   the latest week counting most (each week back 0.8 of the one after), gently pulled to zero
   (ridge 0.1) so a team with few lines is not pushed to an extreme. Through week 3 of 2026 they
   reproduce the lines to within 0.9 points on average (1.3 at ridge 0.5, which squashed them). Movement is against the
   same fit a week earlier. Beside each rating stand Model A's numbers for the team, which used to
   be a table of their own behind a switch: its Elo with the tier shield, the Elo change since
   the last graded week, and the EPA a play each way. renderRatings() calls ratingsViz() last;
   betting/tools/build.js puts this file in front of the app's script. */
function vegasRatings(throughWeek){
  const games=(S.schedule||[]).filter(g=>+g.week<=throughWeek&&g.spread_line!=null&&isFinite(g.spread_line)&&g.game_type!=='PRE');
  const teams=[...new Set((S.schedule||[]).flatMap(g=>[g.home_team,g.away_team]))].sort();
  const n=teams.length, idx=Object.fromEntries(teams.map((t,i)=>[t,i])), P=n+1;      /* the ratings, then home field */
  const A=Array.from({length:P},()=>new Array(P).fill(0)), b=new Array(P).fill(0);
  for(const g of games){
    const x=new Array(P).fill(0), w=Math.pow(0.8,throughWeek-(+g.week));
    x[idx[g.home_team]]+=1; x[idx[g.away_team]]-=1; x[n]=g.location==='Home'?1:0;
    for(let i=0;i<P;i++){ if(!x[i]) continue; b[i]+=w*x[i]*g.spread_line; for(let j=0;j<P;j++) if(x[j]) A[i][j]+=w*x[i]*x[j]; }
  }
  for(let i=0;i<n;i++) A[i][i]+=0.1;
  A[n][n]+=1e-6;
  /* Gaussian elimination with partial pivoting */
  const M=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<P;c++){
    let p=c; for(let r=c+1;r<P;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c])) p=r;
    [M[c],M[p]]=[M[p],M[c]]; const d=M[c][c]||1e-12;
    for(let r=0;r<P;r++){ if(r===c) continue; const f=M[r][c]/d; if(!f) continue; for(let k=c;k<=P;k++) M[r][k]-=f*M[c][k]; }
  }
  const sol=M.map((r,i)=>r[P]/(r[i]||1e-12));
  const mean=sol.slice(0,n).reduce((a,v)=>a+v,0)/n;
  const R=Object.fromEntries(teams.map((t,i)=>[t,sol[i]]));
  const miss=games.length?games.reduce((a,g)=>a+Math.abs(g.spread_line-((g.location==='Home'?sol[n]:0)+R[g.home_team]-R[g.away_team])),0)/games.length:0;
  return {games:games.length,hfa:sol[n],miss,teams:teams.map((t,i)=>({t,r:sol[i]-mean})).sort((a,b2)=>b2.r-a.r)};
}
function ratingsViz(){
  const el=document.getElementById('ratingsTable'); if(!el||!S.schedule) return;
  const weeks=[...new Set(S.schedule.map(g=>+g.week))].sort((a,b)=>a-b);
  const cur=typeof currentWeekDefault==='function'?currentWeekDefault():weeks[weeks.length-1];
  const now=vegasRatings(cur), before=cur>weeks[0]?vegasRatings(cur-1):null;
  const rankBefore=before?Object.fromEntries(before.teams.map((x,i)=>[x.t,i+1])):null;
  const mv=(t,i)=>{ if(!rankBefore||!rankBefore[t]) return ''; const d=rankBefore[t]-(i+1);
    if(d===0) return '<span class="rankmv flat" title="No change since week '+(cur-1)+'’s lines">·</span>';
    return `<span class="rankmv ${d>0?'up':'down'}" title="${d>0?'Up':'Down'} ${Math.abs(d)} since week ${cur-1}’s lines"><i>${d>0?'▲':'▼'}</i>${Math.abs(d)}</span>`; };
  const pts=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(1);
  /* Model A's Elo, moved against the board at the last graded week as the app measures it */
  const since=S.prevRanks?(S.prevRanksWeek?'end of week '+S.prevRanksWeek:'preseason'):'preseason';
  const pe=S.prevElo||Object.fromEntries(Object.keys(MODEL.teams).map(k=>[k,MODEL.teams[k].elo]));
  const eloMv=(t,e)=>{ const was=pe[t]; if(was==null) return ''; const d=Math.round(e)-Math.round(was);
    if(d===0) return '<span class="elomv flat" title="No change since '+since+'">·</span>';
    return `<span class="elomv ${d>0?'up':'down'}" title="${d>0?'Gained':'Lost'} ${Math.abs(d)} Elo since ${since}">${d>0?'+':'−'}${Math.abs(d)}</span>`; };
  const epa=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(3);
  const row=(x,i)=>{ const m=S.teams[x.t];
    const a=m?`<td class="num" style="white-space:nowrap"><span class="elocell">${tierBadge(m.elo)}<b>${Math.round(m.elo)}</b></span></td><td class="movecell">${eloMv(x.t,m.elo)}</td><td class="num">${epa(stateVal(m,'off_epa','off_epa'))}</td><td class="num">${epa(stateVal(m,'d_off_epa','off_epa'))}</td>`:'<td class="muted">–</td><td></td><td></td><td></td>';
    return `<tr><td class="muted">${i+1}</td><td style="white-space:nowrap">${tag(x.t,tagColor(x.t),true,'mini')} <span class="muted">${TEAM_NAMES[x.t]||''}</span>${mv(x.t,i)}</td><td class="num rt-pts">${pts(x.r)}</td>${a}</tr>`; };
  el.innerHTML=TIER_DEFS+`<h2>Power ratings <span class="pill">Vegas</span></h2>
    <p class="muted" style="margin:0 0 10px">Points better or worse than an average team on a neutral field, read out of this season's point spreads through week ${cur} (${now.games} lines, the latest counting most). Home field is worth ${now.hfa.toFixed(1)} points in them. Beside each, the team's Elo with its tier shield, its Elo change since the ${since}, and its EPA a play on offence and allowed on defence.</p>
    <div class="rt-wrap"><table class="rt-v"><thead><tr><th>#</th><th>Team</th><th class="num">Rating</th><th class="num">Elo</th><th class="num">Elo change</th><th class="num">Off EPA/play</th><th class="num">Def EPA/play</th></tr></thead><tbody>`
    +now.teams.map(row).join('')+'</tbody></table></div>';
}
