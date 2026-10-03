/* Power Ratings, the ELO based model's: every team rated by the Elo game model in elo/build.py,
   its expected lineup for the coming week, on this season's player ratings alone, scored
   against a team of 1500s and shown on a bell curve across the teams (1500 the average, 100
   points a standard deviation) (`teams` in elo/data/model.json, which the published-mode hook reads
   into window.__eloTeams). The order is that model's, so the tier shields follow it. The change
   and the rank arrows are against the same lineup on its ratings going into the team's last game; the chance is
   against an average team on a neutral field. The EPA a play each way is Model A's, from the
   season. renderRatings() calls ratingsViz() last; betting/tools/build.js puts this file in
   front of the app's script. */
function ratingsViz(){
  const el=document.getElementById('ratingsTable'); if(!el||!S.teams) return;
  const T=window.__eloTeams;
  if(!T||!Object.keys(T).length){ el.innerHTML='<h2>Power ratings <span class="pill">ELO based</span></h2><p class="muted">The ELO based model\'s ratings did not load. Refresh the page to try again.</p>'; return; }
  const rows=Object.entries(T).map(([t,v])=>({t,...v})).sort((a,b)=>b.elo-a.elo);
  const prior=rows.filter(x=>x.before!=null).sort((a,b)=>b.before-a.before), rankBefore=Object.fromEntries(prior.map((x,i)=>[x.t,i+1]));
  const mv=(t,i)=>{ if(!rankBefore[t]) return ''; const d=rankBefore[t]-(i+1);
    if(d===0) return '<span class="rankmv flat" title="No change since its last game">·</span>';
    return `<span class="rankmv ${d>0?'up':'down'}" title="${d>0?'Up':'Down'} ${Math.abs(d)} since its last game"><i>${d>0?'▲':'▼'}</i>${Math.abs(d)}</span>`; };
  const eloMv=x=>{ if(x.before==null) return ''; const d=x.elo-x.before;
    if(d===0) return '<span class="elomv flat" title="No change since its last game">·</span>';
    return `<span class="elomv ${d>0?'up':'down'}" title="${d>0?'Gained':'Lost'} ${Math.abs(d)} Elo since its last game">${d>0?'+':'−'}${Math.abs(d)}</span>`; };
  const epa=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(3);
  const row=(x,i)=>{ const m=S.teams[x.t];
    const e=m?`<td class="num">${epa(stateVal(m,'off_epa','off_epa'))}</td><td class="num">${epa(stateVal(m,'d_off_epa','off_epa'))}</td>`:'<td></td><td></td>';
    return `<tr><td class="muted">${i+1}</td><td style="white-space:nowrap">${tag(x.t,tagColor(x.t),true,'mini')} <span class="muted">${TEAM_NAMES[x.t]||''}</span>${mv(x.t,i)}</td><td class="num" style="white-space:nowrap"><span class="elocell">${tierBadge(x.elo)}<b>${x.elo}</b></span></td><td class="movecell">${eloMv(x)}</td><td class="num rt-pct">${Math.round(x.p_avg*100)}%</td>${e}</tr>`; };
  el.innerHTML=TIER_DEFS+`<h2>Power ratings <span class="pill">ELO based</span></h2>
    <p class="muted" style="margin:0 0 10px">The ELO based model's rating of each team: its expected lineup for the coming week, every starter's player Elo from this season alone (everyone started the season at 1500, nothing carried over) weighted by what the model says each position is worth, on a bell curve across the 32 teams: 1500 is an average team and every 100 points a standard deviation better, so most teams are Silver or Gold and only the best reach the top shields. The change and the arrows are since the team's last game. Vs average is its chance against an average team on a neutral field.</p>
    <div class="rt-wrap"><table class="rt-v"><thead><tr><th>#</th><th>Team</th><th class="num">Elo</th><th class="num">Elo change</th><th class="num">Vs average</th><th class="num">Off EPA/play</th><th class="num">Def EPA/play</th></tr></thead><tbody>`
    +rows.map(row).join('')+'</tbody></table></div>';
}
