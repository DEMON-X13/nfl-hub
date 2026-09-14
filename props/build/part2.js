const TEAM_NAMES={ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",KC:"Chiefs",LA:"Rams",LAC:"Chargers",LV:"Raiders",MIA:"Dolphins",MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",TB:"Buccaneers",TEN:"Titans",WAS:"Commanders"};
const TEAM_COLORS={"ARI":["#97233F","#000000","#FFB612","#A5ACAF"],"ATL":["#A71930","#000000","#A5ACAF","#A30D2D"],"BAL":["#241773","#9E7C0C","#C60C30"],"BUF":["#00338D","#C60C30","#0C2E82","#D50A0A"],"CAR":["#0085CA","#000000","#BFC0BF"],"CHI":["#0B162A","#E64100"],"CIN":["#FB4F14","#000000","#D32F1E"],"CLE":["#FF3C00","#311D00","#A5ACAF","#D32F1E"],"DAL":["#002244","#B0B7BC","#ACC0C6","#A5ACAF"],"DEN":["#002244","#FB4F14","#00234C","#FF5200"],"DET":["#0076B6","#B0B7BC","#000000","#004E89"],"GB":["#203731","#FFB612","#1C2D25","#EEAD1E"],"HOU":["#03202F","#A71930","#00071C","#A30D2D"],"IND":["#002C5F","#A5ACAF","#013369","#9BA1A2"],"JAX":["#006778","#000000","#9F792C","#D7A22A"],"KC":["#E31837","#FFB612","#000000"],"LA":["#003594","#FFD100","#001532","#AF925D"],"LAC":["#007BC7","#FFC20E","#FFB612","#001532"],"LV":["#000000","#A5ACAF","#A6AEB0"],"MIA":["#008E97","#F58220","#005778"],"MIN":["#4F2683","#FFC62F","#E9BF9B","#000000"],"NE":["#002244","#C60C30","#B0B7BC","#001532"],"NO":["#D3BC8D","#000000","#9F8958"],"NYG":["#0B2265","#A71930","#A5ACAF","#012352"],"NYJ":["#125740","#000000","#FFFFFF"],"PHI":["#004C54","#A5ACAF","#ACC0C6","#000000"],"PIT":["#000000","#FFB612","#C60C30","#00539B"],"SEA":["#002244","#69BE28","#A5ACAF","#001532"],"SF":["#AA0000","#B3995D","#000000","#A5ACAF"],"TB":["#A71930","#322F2B","#000000","#FF7900"],"TEN":["#0C2340","#4B92DB","#C8102E"],"WAS":["#5A1414","#FFB612","#000000","#5B2B2F"]};
const TAG_OVERRIDE={GB:'#203731', WAS:'#5A1414', TEN:'#4B92DB'};
const SEASON=2026, KEY='props_2026_v1';
const MODEL_BUILD='2026.1 fit 2019-2025';
const DATA_BUILD=PAY.build||'baseline';
const APP_BUILD='app v28 \u00b7 2026-09-13';
const GAMES_URL='https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';

/* market catalogue */
const MARKETS=[
 {k:'passing_yards',short:'pass yards',lbl:'Passing yards',grps:['QB'],dec:1,alias:['pass_yds','passing yards','pass yards','py']},
 {k:'passing_tds',short:'pass TDs',lbl:'Passing TDs',grps:['QB'],dec:2,alias:['pass_tds','passing tds','pass td']},
 {k:'attempts',short:'pass attempts',lbl:'Pass attempts',grps:['QB'],dec:1,alias:['pass_att','pass attempts','attempts']},
 {k:'completions',short:'completions',lbl:'Completions',grps:['QB'],dec:1,alias:['comp','completions','pass_comp']},
 {k:'passing_interceptions',short:'interceptions',lbl:'Interceptions',grps:['QB'],dec:2,alias:['int','ints','interceptions']},
 {k:'rushing_yards',short:'rush yards',lbl:'Rushing yards',grps:['QB','RB'],dec:1,alias:['rush_yds','rushing yards','rush yards']},
 {k:'carries',short:'carries',lbl:'Carries',grps:['QB','RB'],dec:1,alias:['rush_att','carries','rush attempts']},
 {k:'receptions',short:'catches',lbl:'Receptions',grps:['RB','WR','TE'],dec:1,alias:['rec','receptions','catches']},
 {k:'receiving_yards',short:'rec yards',lbl:'Receiving yards',grps:['RB','WR','TE'],dec:1,alias:['rec_yds','receiving yards','rec yards']},
 {k:'targets',short:'targets',lbl:'Targets',grps:['WR','TE'],dec:1,alias:['targets','tgt']},
 {k:'scrim_yards',short:'rush + rec yards',lbl:'Rush + rec yards',grps:['RB'],dec:1,alias:['scrim_yds','scrimmage yards','rush+rec']},
 {k:'any_td',short:'touchdown',lbl:'Anytime TD',grps:['RB','WR','TE'],prob:true,alias:['anytime_td','atd','anytime touchdown','td']},
 {k:'fg_made',short:'field goals',lbl:'Field goals made',grps:['K'],dec:2,noedge:true,alias:['fg','fg_made','field goals']},
 {k:'fg_att',short:'FG attempts',lbl:'FG attempts',grps:['K'],dec:2,noedge:true,alias:['fg_att','fg attempts']},
 {k:'kick_pts',short:'kicking points',lbl:'Kicking points',grps:['K'],dec:1,noedge:true,alias:['kicking_points','kick_pts','kicker points']},
];
const MKT=Object.fromEntries(MARKETS.map(m=>[m.k,m]));
const VOLMAP={attempts:'t_pass_att',completions:'t_pass_att',passing_yards:'t_pass_yds',passing_tds:'t_tds',
 passing_interceptions:'t_pass_att',carries:'t_carries',rushing_yards:'t_rush_yds',receptions:'t_targets',
 targets:'t_targets',receiving_yards:'t_pass_yds',scrim_yards:'t_plays',any_td:'t_tds',
 fg_att:'t_fg_att',fg_made:'t_fg_att',kick_pts:'t_pat_att'};
const DEFMAP={attempts:'d_pass_att',completions:'d_pass_att',passing_yards:'d_pass_yds',passing_tds:'d_tds',
 passing_interceptions:'d_pass_att',carries:'d_carries',rushing_yards:'d_rush_yds',receptions:'d_pass_att',
 targets:'d_pass_att',receiving_yards:'d_pass_yds',scrim_yards:'d_rush_yds',any_td:'d_tds',
 fg_att:'d_pass_yds',fg_made:'d_pass_yds',kick_pts:'d_tds'};
const TCOLS=['t_pass_att','t_carries','t_plays','t_pass_yds','t_rush_yds','t_targets','t_tds','t_fg_att','t_pat_att'];
const DCOLS=['d_pass_yds','d_rush_yds','d_pass_att','d_carries','d_tds'];
const GRP_STATS={QB:['attempts','completions','passing_yards','passing_tds','passing_interceptions','carries','rushing_yards'],
 /* targets is projected (it drives usage and receptions) but is not offered as a bet */
 RB:['carries','rushing_yards','receptions','receiving_yards','scrim_yards','any_td'],
 WR:['receptions','receiving_yards','any_td'],
 TE:['receptions','receiving_yards','any_td'],
 K:['fg_att','fg_made','kick_pts']};
const A5=2/6, A3=2/4, A6=2/7, A8=2/9;   /* ewma alphas for spans 5,3,6,8 */

/* ---------- storage ---------- */
const store={
  async get(){ try{ if(window.storage){const r=await window.storage.get(KEY,false); return r?JSON.parse(r.value):null;} }catch(e){}
    try{ const v=localStorage.getItem(KEY); return v?JSON.parse(v):null; }catch(e){} return null; },
  async set(v){ const s=JSON.stringify(v);
    try{ if(window.storage){ await window.storage.set(KEY,s,false); return 'saved'; } }catch(e){}
    try{ localStorage.setItem(KEY,s); return 'saved'; }catch(e){} return 'memory only'; }
};
const $=id=>document.getElementById(id);
let S=null, saveTimer=null;
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{ const r=await store.set(S);
  $('saveState').textContent = r==='saved'?'Autosaved':'Not saved: export a backup'; },300); }

/* ---------- ewma accumulator (matches pandas adjust=True) ----------
   seeded so a converged baseline behaves like a long prior history */
function seedEwm(val,a){ const d=1/a; return [val*d,d]; }
function pushEwm(acc,x,a){ acc[0]=x+(1-a)*acc[0]; acc[1]=1+(1-a)*acc[1]; }
const ewm=acc=>acc[1]>0?acc[0]/acc[1]:0;

/* ---------- fresh state built from the embedded 2025 baseline ---------- */
function freshState(){
  const st={season:SEASON,build:MODEL_BUILD,dataBuild:DATA_BUILD,week:1,players:{},teams:{},defs:{},defg:{},
    sched:JSON.parse(JSON.stringify(PAY.sched)),processed:{},processedGames:{},
    accuracy:{},inactive:{},depth:{},odds:{},parlay:{},saved:[],actuals:{},projections:{},headlines:{},stake:20,bookPrice:null,margin:'typical',
    ui:{game:null,open:{},showAll:false}};
  for(const p of PAY.players){
    const o={id:p.id,n:p.n,pos:p.p,grp:p.g,team:p.t,gp:0,base_gp:p.gp,e5:{},e3:{},car:{},py:{}};
    for(const s of (GRP_STATS[p.g]||[])){
      const v=p[s]||[0,0,0,0];
      o.e5[s]=seedEwm(v[0],A5); o.e3[s]=seedEwm(v[1],A3);
      const cn=Math.max(p.cn||p.gp||1,1);
      o.car[s]=[v[2]*cn,cn];
      o.py[s]=v[3];
    }
    st.players[p.id]=o;
  }
  for(const t in PAY.toff){ st.teams[t]={}; for(const c of TCOLS) st.teams[t][c]=seedEwm(PAY.toff[t][c],A6); }
  for(const t in PAY.tdef){ st.defs[t]={}; for(const c of DCOLS) st.defs[t][c]=seedEwm(PAY.tdef[t][c],A8); }
  for(const t in PAY.tdefg){ st.defg[t]={};
    for(const g in PAY.tdefg[t]){ st.defg[t][g]={};
      for(const s in PAY.tdefg[t][g]) st.defg[t][g][s]=seedEwm(PAY.tdefg[t][g][s],A8); } }
  return st;
}

/* ---------- league normalisers, recomputed from live state ---------- */
let NORM=null;
function buildNorm(){
  const n={toff:{},tdef:{},oag:{}};
  for(const c of TCOLS){ let s=0,k=0; for(const t in S.teams){s+=ewm(S.teams[t][c]);k++;} n.toff[c]=k?s/k:1; }
  for(const c of DCOLS){ let s=0,k=0; for(const t in S.defs){s+=ewm(S.defs[t][c]);k++;} n.tdef[c]=k?s/k:1; }
  for(const g in GRP_STATS){ n.oag[g]={};
    for(const st of GRP_STATS[g]){ let s=0,k=0;
      for(const t in S.defg){ if(S.defg[t][g]&&S.defg[t][g][st]){ s+=ewm(S.defg[t][g][st]); k++; } }
      n.oag[g][st]=k?s/k:(PAY.norm.oag[g]?PAY.norm.oag[g][st]:1); } }
  NORM=n;
}
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
function relz(v,m,lo,hi){ return clip((v-m)/(Math.abs(m)+1e-6),lo,hi); }

/* ---------- game context ---------- */
/* how many points a team is expected to score, from the rolling numbers the app
   already tracks. Used only when no betting line has been posted. */
function modelPoints(team,opp,isHome){
  const P=PAY.pts; if(!P) return PAY.norm.implied_mean;
  const off=S.teams[team], def=S.defs[opp];
  let v=P.coef[0];
  P.feats.forEach((f,i)=>{
    const cur=f[0]==='t'?(off?ewm(off[f.replace('te_','')]):null):(def?ewm(def[f.replace('de_','')]):null);
    v+=P.coef[i+1]*(((cur==null?P.means[f]:cur))-P.means[f]);
  });
  v+=P.coef[P.feats.length+1]*(isHome?1:0);
  return clip(v,3,45);
}
/* the team model from the other project: predicted winning margin, home side */
function modelMargin(g){
  const G=PAY.grid; if(!G) return 0;
  const h=G.teams[g.h], a=G.teams[g.a]; if(!h||!a) return 0;
  const net=(h.off_epa-h.d_off_epa)-(a.off_epa-a.d_off_epa);
  const f={elo_diff:h.elo-a.elo, rest:0, neutral:0, net_epa:net};
  let m=G.intercept;
  G.feats.forEach((k,i)=>{ m+=G.coef[i]*(f[k]||0); });
  return m;
}
function gameCtx(g,team){
  const isHome=team===g.h;
  const sp=(g.sp==null||!isFinite(g.sp))?null:g.sp;
  const tot=(g.tot==null||!isFinite(g.tot))?null:g.tot;
  let implied, src;
  if(sp!=null&&tot!=null){
    const teamSpread=isHome?-sp:sp;
    implied=tot/2-teamSpread/2; src='market';
  } else {
    /* no line posted: build the game from our own numbers instead of assuming average */
    const total=modelPoints(g.a,g.h,false)+modelPoints(g.h,g.a,true);
    const margin=modelMargin(g);
    implied=(total+(isHome?margin:-margin))/2; src='model';
  }
  implied=clip(implied,3,45);
  const teamSpread=(sp!=null)?(isHome?-sp:sp)
    :(isHome?-modelMargin(g):modelMargin(g));
  return {home:isHome?1:0, sprd:clip(teamSpread/7,-3,3), implied, src,
    imp:clip((implied-PAY.norm.implied_mean)/(PAY.norm.implied_sd||1),-3,3), hasLine:sp!=null&&tot!=null};
}

/* ---------- feature vector, must match the training order ---------- */
function featVec(pl,stat,opp,ctx){
  const e5=ewm(pl.e5[stat]||[0,0]), e3=ewm(pl.e3[stat]||[0,0]);
  const prior=(PAY.prior[pl.grp]&&PAY.prior[pl.grp][stat]!=null)?PAY.prior[pl.grp][stat]:0;
  const KS=PAY.k||4;
  const c=pl.car[stat]||[0,0];
  const car=(c[0]+KS*prior)/((c[1]||0)+KS);
  const pyn=pl.base_gp||0, pym=(pl.py[stat]!=null)?pl.py[stat]:null;
  const py=((pym!=null?pym*pyn:0)+KS*prior)/(pyn+KS);
  const og=(S.defg[opp]&&S.defg[opp][pl.grp]&&S.defg[opp][pl.grp][stat])?ewm(S.defg[opp][pl.grp][stat]):NORM.oag[pl.grp][stat];
  const oaz=relz(og,NORM.oag[pl.grp][stat],-1,1);
  const vc=VOLMAP[stat], dc=DEFMAP[stat];
  const tv=S.teams[pl.team]?ewm(S.teams[pl.team][vc]):NORM.toff[vc];
  const tvol=relz(tv,NORM.toff[vc],-0.8,0.8);
  const dv=S.defs[opp]?ewm(S.defs[opp][dc]):NORM.tdef[dc];
  const ddef=relz(dv,NORM.tdef[dc],-0.6,0.6);
  const imp=ctx.imp, home=ctx.home, sprd=ctx.sprd, absp=Math.abs(sprd);
  return [1,e5,e3,car,py,oaz,tvol,ddef,imp,home,sprd,absp,e5*oaz,e5*imp,e5*tvol];
}
function dot(c,x){ let s=0; for(let i=0;i<c.length;i++) s+=c[i]*x[i]; return s; }

function project(pl,stat,opp,ctx){
  const m=PAY.model[pl.grp] && PAY.model[pl.grp][stat];
  if(!m) return null;
  const x=featVec(pl,stat,opp,ctx);
  if(m.type==='logit'){
    let p=1/(1+Math.exp(-dot(m.coef,x)));
    /* a player can't score more often than his touches allow: bound by expected
       touches at league td-per-touch rates, with headroom for goal-line roles */
    const R=PAY.tdrate&&PAY.tdrate[pl.grp];
    if(R){
      const MM=PAY.model[pl.grp];
      const mc=MM.carries?Math.max(dot(MM.carries.coef,featVec(pl,'carries',opp,ctx)),0):0;
      const mr=MM.receptions?Math.max(dot(MM.receptions.coef,featVec(pl,'receptions',opp,ctx)),0):0;
      const lam=mc*R.rush+mr*R.rec;
      p=Math.min(p,1-Math.exp(-lam*(PAY.tdmult||1.5)));
    }
    return {p};
  }
  return {mu:Math.max(dot(m.coef,x),0), count:!!m.count};
}

/* ---------- projection to probability, via the stored outcome shape ---------- */
function distFor(grp,stat,mu){
  const D=PAY.dist[grp]&&PAY.dist[grp][stat]; if(!D) return null;
  let t=0; for(const ed of D.edges) if(mu>ed) t++;
  return D.q[t];
}
function cdfRatio(q,r){
  const QS=PAY.qs;
  if(r<=q[0]) return 0;
  if(r>=q[q.length-1]) return 1;
  let i=0; while(i<q.length-2 && q[i+1]<r) i++;
  const span=(q[i+1]-q[i])||1e-9;
  return QS[i]+((r-q[i])/span)*(QS[i+1]-QS[i]);
}
/* blend across tier boundaries so the chance moves smoothly as a projection changes,
   instead of jumping when mu crosses from one quartile's table to the next */
function cdfBlend(grp,stat,mu,r){
  const D=PAY.dist[grp]&&PAY.dist[grp][stat]; if(!D) return null;
  const E=D.edges; let t=0; for(const ed of E) if(mu>ed) t++;
  let F=cdfRatio(D.q[t],r);
  const BAND=0.18;
  for(let i=0;i<E.length;i++){ const ed=E[i]; const rel=(mu-ed)/ed;
    if(Math.abs(rel)<BAND){ const other=mu>ed?i:i+1; if(other===t||!D.q[other]) continue;
      const wt=0.5*(1-Math.abs(rel)/BAND);            /* 0.5 at the edge, 0 at the band's end */
      F=(1-wt)*F+wt*cdfRatio(D.q[other],r); } }
  return F;
}
function pOver(grp,stat,mu,line){
  const F=cdfBlend(grp,stat,mu,line/Math.max(mu,0.05)); if(F==null) return null;
  return clip(1-F,0.001,0.999);
}
function fairLine(grp,stat,mu){
  /* the line where the blended chance of going over is 50% */
  let lo=mu*0.2, hi=mu*3+1;
  for(let i=0;i<40;i++){ const mid=(lo+hi)/2; if(pOver(grp,stat,mu,mid)>0.5) lo=mid; else hi=mid; }
  return (lo+hi)/2;
}

/* ---------- odds helpers ---------- */
function mlToProb(ml){ if(ml==null||!isFinite(ml)||ml===0) return null; return ml>0?100/(ml+100):Math.abs(ml)/(Math.abs(ml)+100); }
function mlToDec(ml){ if(ml==null||!isFinite(ml)||ml===0) return null; return ml>0?ml/100+1:100/Math.abs(ml)+1; }
function fmtML(ml){ return ml==null?'\u2013':(ml>0?'+'+ml:''+ml); }
function devig(o,u){
  const po=mlToProb(o), pu=mlToProb(u);
  if(po==null&&pu==null) return null;
  if(po==null) return {over:1-pu,under:pu,vig:false};
  if(pu==null) return {over:po,under:1-po,vig:false};
  const t=po+pu; return {over:po/t,under:pu/t,vig:true,hold:t-1};
}
function kelly(p,ml,frac){ const d=mlToDec(ml); if(!d) return 0; const b=d-1;
  const f=(p*b-(1-p))/b; return Math.max(0,f)*frac; }

/* ---------- build every playable line for one game ---------- */
function playersFor(team){
  return Object.values(S.players).filter(p=>p.team===team && !S.inactive[p.id]);
}
function propsForGame(g){
  const out=[];
  for(const [team,opp] of [[g.a,g.h],[g.h,g.a]]){
    const ctx=gameCtx(g,team);
    for(const pl of playersFor(team)){
      const gp=pl.gp+pl.base_gp;
      const row={pl,team,opp,ctx,thin:gp<3,lines:[]};
      for(const stat of (GRP_STATS[pl.grp]||[])){
        const m=MKT[stat]; if(!m) continue;
        const pr=project(pl,stat,opp,ctx); if(!pr) continue;
        const o=(S.odds[g.id]&&S.odds[g.id][pl.id]&&S.odds[g.id][pl.id][stat])||null;
        /* "worth it by" is measured against the price you actually pay, vig included:
           the break-even is the raw implied probability of that side's odds. */
        if(m.prob){
          if(pr.p==null) continue;
          const need=o?mlToProb(o.over):null;
          const edge=(need!=null)?(pr.p-need)*100:null;
          row.lines.push({stat,m,p:pr.p,mu:pr.p,line:null,odds:o,need,edge,
            side:edge==null?null:'over',pSide:pr.p,priceUsed:o?o.over:null});
        } else {
          if(pr.mu==null||!isFinite(pr.mu)) continue;
          const fl=fairLine(pl.grp,stat,pr.mu);
          const line=o&&o.line!=null?o.line:null;
          const p=line!=null?pOver(pl.grp,stat,pr.mu,line):null;
          let edge=null,side=null,need=null,pSide=null,priceUsed=null;
          if(p!=null&&o){
            const io=mlToProb(o.over), iu=mlToProb(o.under);
            const eo=io!=null?(p-io)*100:null, eu=iu!=null?((1-p)-iu)*100:null;
            if(eo!=null&&(eu==null||eo>=eu)){edge=eo;side='over';need=io;pSide=p;priceUsed=o.over;}
            else if(eu!=null){edge=eu;side='under';need=iu;pSide=1-p;priceUsed=o.under;}
          }
          row.lines.push({stat,m,mu:pr.mu,fl,line,p,odds:o,need,edge,side,pSide,priceUsed,count:pr.count});
        }
      }
      if(row.lines.length) out.push(row);
    }
  }
  return out;
}
function edgeThreshold(){ return +(S.ui.edge||3); }
function countEdges(g){
  let n=0,best=0;
  for(const r of propsForGame(g)){
    if(r.thin) continue;
    for(const l of r.lines){
      if(l.m.noedge||l.edge==null) continue;
      if(l.edge>=edgeThreshold()){ n++; if(l.edge>best) best=l.edge; }
    }
  }
  return {n,best};
}

/* ---------- correlated parlays: gaussian copula over the shipped pair table ---------- */
function legRho(a,b){
  if(a.gid!==b.gid) return 0;
  const ka=a.grp+':'+a.stat, kb=b.grp+':'+b.stat;
  const rel=a.pid===b.pid?'self':(a.team===b.team?'team':'opp');
  const [k1,k2]=ka<kb?[ka,kb]:[kb,ka];
  return (PAY.corr&&PAY.corr[rel+'|'+k1+'|'+k2])||0;
}
function invNorm(p){ /* Acklam */
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  p=clip(p,1e-9,1-1e-9); const pl=0.02425;
  let q,r;
  if(p<pl){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if(p>1-pl){ q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  q=p-0.5; r=q*q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
function cholesky(R){
  const n=R.length, L=Array.from({length:n},()=>new Array(n).fill(0));
  for(let i=0;i<n;i++) for(let j=0;j<=i;j++){
    let s=R[i][j]; for(let k=0;k<j;k++) s-=L[i][k]*L[j][k];
    if(i===j){ if(s<=1e-9) return null; L[i][i]=Math.sqrt(s); } else L[i][j]=s/L[j][j];
  }
  return L;
}
function mulberry(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
/* legs: [{p, side:'over'|'under', gid,pid,team,grp,stat}] */
function parlayProb(legs,sims=40000){
  const n=legs.length; if(!n) return {indep:0,corr:0,pairs:[]};
  const indep=legs.reduce((s,l)=>s*l.p,1);
  const R=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:legRho(legs[i],legs[j])));
  const pairs=[];
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) if(Math.abs(R[i][j])>=0.03) pairs.push({i,j,rho:R[i][j]});
  if(!pairs.length) return {indep,corr:indep,pairs};
  let L=null, lam=0;
  while(!L&&lam<1){ const Rs=R.map((row,i)=>row.map((v,j)=>i===j?1:v*(1-lam))); L=cholesky(Rs); if(!L) lam+=0.1; }
  if(!L) return {indep,corr:indep,pairs};
  const dir=legs.map(l=>l.side==='under'?-1:1);
  const thr=legs.map(l=>invNorm(1-l.p));   /* leg hits when dir*z > thr */
  const rnd=mulberry(20260908); let hits=0;
  const g=new Array(n);
  for(let s=0;s<sims;s++){
    for(let i=0;i<n;i+=2){ const u1=rnd()||1e-12,u2=rnd(); const m=Math.sqrt(-2*Math.log(u1));
      g[i]=m*Math.cos(2*Math.PI*u2); if(i+1<n) g[i+1]=m*Math.sin(2*Math.PI*u2); }
    let ok=true;
    for(let i=0;i<n&&ok;i++){ let z=0; for(let k=0;k<=i;k++) z+=L[i][k]*g[k]; if(dir[i]*z<=thr[i]) ok=false; }
    if(ok) hits++;
  }
  return {indep,corr:hits/sims,pairs,shrunk:lam>0};
}
function probToML(p){ if(p<=0||p>=1) return null; return p>=0.5?-Math.round(100*p/(1-p)):Math.round(100*(1-p)/p); }

/* every play the model would actually bet, strongest first */
function picksForGame(g){
  const out=[];
  for(const r of propsForGame(g)){
    if(r.thin) continue;
    for(const l of r.lines){
      if(l.m.noedge||l.edge==null||l.side==null) continue;
      if(l.edge<edgeThreshold()) continue;
      out.push({row:r,l});
    }
  }
  return out.sort((a,b)=>b.l.edge-a.l.edge);
}
function betPhrase(l){
  if(l.m.prob) return 'To score a touchdown';
  const verb=l.side==='over'?'More than':'Fewer than';
  return `${verb} ${l.line} ${l.m.lbl.toLowerCase()}`;
}

/* ---------- threshold ladders: "10+, 20+, 30+" style ---------- */
const LADDER={
  attempts:[15,20,25,30,35,40],
  completions:[10,15,20,25,30],
  passing_yards:[150,200,225,250,275,300,325,350],
  passing_tds:[1,2,3,4],
  passing_interceptions:[1,2],
  carries:{QB:[3,5,8,10,12],RB:[5,10,12,15,18,20,25]},
  rushing_yards:{QB:[10,20,30,40,50],RB:[25,40,50,60,75,90,100,125]},
  receptions:[2,3,4,5,6,7,8,10],
  targets:[2,4,6,8,10,12],
  receiving_yards:[20,25,40,50,60,75,90,100,125],
  scrim_yards:[40,50,75,90,100,125,150],
  fg_made:[1,2,3],
  fg_att:[1,2,3,4],
  kick_pts:[4,6,8,10,12]
};
function ladderFor(stat,grp){
  const L=LADDER[stat]; if(!L) return null;
  return Array.isArray(L)?L:(L[grp]||null);
}
function confTier(p){
  if(p>=0.70) return ['high','High'];
  if(p>=0.45) return ['med','Med'];
  return ['low','Low'];
}
/* rungs worth showing: drop the near-certain and near-impossible, keep a readable window */
function rungs(grp,stat,mu){
  const L=ladderFor(stat,grp); if(!L) return [];
  const all=L.map(k=>({k,p:pOver(grp,stat,mu,k-0.5)})).filter(x=>x.p!=null);
  let keep=all.filter(x=>x.p>0.04&&x.p<0.97);
  if(keep.length<3){
    const sorted=all.slice().sort((a,b)=>Math.abs(a.p-0.5)-Math.abs(b.p-0.5));
    keep=sorted.slice(0,Math.min(3,all.length)).sort((a,b)=>a.k-b.k);
  }
  return keep.slice(0,7);
}
/* how much this player is actually used, for ranking the depth chart */
function usage(pl,opp,ctx){
  const v=s=>{ const r=project(pl,s,opp,ctx); return r&&r.mu!=null?r.mu:0; };
  if(pl.grp==='QB') return v('attempts');
  if(pl.grp==='RB') return v('carries')+v('receptions');
  if(pl.grp==='K')  return v('fg_att');
  return v('targets');
}
const DEPTH={QB:1,RB:3,WR:4,TE:2,K:1};
const USE_FLOOR={QB:8,RB:2.5,WR:1.5,TE:1.2,K:0.5};
function depthOf(pl){
  const d=(S.depth&&S.depth[pl.id])||(PAY.depth&&PAY.depth[pl.id]);
  if(!d) return null;
  return {team:d[0],pos:d[1],rank:d[2]};
}
function depthLabel(pl){ const d=depthOf(pl); return d&&d.pos===pl.grp?d.pos+d.rank:null; }
/* the players who will actually be on the field enough to matter.
   the depth chart decides the order when we have it, usage when we don't. */
function rosterFor(g,showAll){
  const byTeam={};
  for(const [team,opp] of [[g.a,g.h],[g.h,g.a]]){
    const ctx=gameCtx(g,team);
    const list=playersFor(team).map(pl=>{
      const d=depthOf(pl);
      return {pl,team,opp,ctx,use:usage(pl,opp,ctx),gp:pl.gp+pl.base_gp,
        rank:(d&&d.team===team&&d.pos===pl.grp)?d.rank:null};
    }).filter(x=>x.use>0);
    const out=[];
    for(const grp of ['QB','RB','WR','TE','K']){
      const pool=list.filter(x=>x.pl.grp===grp).sort((a,b)=>{
        if(a.rank!=null&&b.rank!=null) return a.rank-b.rank;
        if(a.rank!=null) return -1;
        if(b.rank!=null) return 1;
        return b.use-a.use;
      });
      const cut=pool.filter(x=>x.gp>=3&&(x.rank!=null?x.rank<=DEPTH[grp]:x.use>=USE_FLOOR[grp]))
                    .slice(0,DEPTH[grp]);
      for(const x of (showAll?pool:cut)) out.push({...x,starter:cut.includes(x)});
    }
    /* depth-chart starters we simply cannot project, so the gap is visible */
    const shown=new Set(out.map(x=>x.pl.id));
    const gaps=[];
    const D=(S.depth&&Object.keys(S.depth).length)?S.depth:PAY.depth;
    for(const id in D){
      const [t,pos,rank,nm]=D[id];
      if(t!==team||shown.has(id)) continue;
      const lead={QB:1,RB:2,WR:3,TE:1,K:1}[pos];
      if(lead&&rank<=lead) gaps.push({name:nm,slot:pos+rank,
        why:S.players[id]?'not enough games played':'no NFL history'});
    }
    byTeam[team]={opp,players:out,gaps};
  }
  return byTeam;
}
function statLines(x){
  const out=[];
  for(const stat of (GRP_STATS[x.pl.grp]||[])){
    const m=MKT[stat]; if(!m) continue;
    const pr=project(x.pl,stat,x.opp,x.ctx); if(!pr) continue;
    if(m.prob){ out.push({stat,m,prob:true,p:pr.p}); continue; }
    if(pr.mu==null||!isFinite(pr.mu)) continue;
    const rs=rungs(x.pl.grp,stat,pr.mu);
    if(!rs.length) continue;
    out.push({stat,m,mu:pr.mu,rungs:rs});
  }
  return out;
}
const HEADLINE={QB:['passing_yards','passing_tds','attempts'],RB:['rushing_yards','carries','receptions'],
  WR:['receiving_yards','receptions'],TE:['receiving_yards','receptions'],K:['kick_pts','fg_made']};

/* the three biggest projections in a game, one per category, for the games list */
function gameHeadline(g){
  const roster=rosterFor(g,false);
  /* on a played game use the projection as it stood before kickoff, not one
     recomputed from results that now include this very game */
  const kept=(S.headlines&&S.headlines[String(g.w)]&&S.headlines[String(g.w)][g.id])||null;
  if(gameFinal(g)&&kept) return kept.map(x=>({k:x.k,v:{mu:x.mu,pl:S.players[x.pid]||{id:x.pid,n:x.n},team:x.team}}));
  const snap=null, frozen=false;
  const pick=(grps,stat)=>{
    let best=null;
    for(const team in roster) for(const x of roster[team].players){
      if(!grps.includes(x.pl.grp)) continue;
      let mu;
      if(frozen){ const s0=snap[x.pl.id]&&snap[x.pl.id][stat]; if(!s0||s0.mu==null) continue; mu=s0.mu; }
      else { const r=project(x.pl,stat,x.opp,x.ctx); if(!r||r.mu==null||!isFinite(r.mu)) continue; mu=r.mu; }
      if(!best||mu>best.mu) best={mu,pl:x.pl,team};
    }
    return best;
  };
  return [
    {k:'pass',v:pick(['QB'],'passing_yards')},
    {k:'rush',v:pick(['RB','QB'],'rushing_yards')},
    {k:'rec', v:pick(['WR','TE','RB'],'receiving_yards')},
  ].filter(x=>x.v);
}
function shortName(n){
  const p=String(n).split(' ');
  return p.length<2?n:p[0][0]+'. '+p.slice(1).join(' ');
}

/* ---------- odds the user has loaded, keyed by game/player/stat/threshold ---------- */
function oddsFor(gid,pid,stat,k){
  const o=S.odds&&S.odds[gid]&&S.odds[gid][pid]&&S.odds[gid][pid][stat];
  if(!o) return null;
  const v=o[String(k)];
  return (v==null||!isFinite(v))?null:v;
}
function probToAmerican(p){
  if(!(p>0&&p<1)) return null;
  return p>=0.5?-Math.round(100*p/(1-p)):Math.round(100*(1-p)/p);
}
function legKey(gid,pid,stat){ return gid+'|'+pid+'|'+stat; }
function parlayLegs(){
  return Object.entries(S.parlay||{}).map(([key,l])=>({key,...l}))
    .sort((a,b)=>(a.week-b.week)||a.name.localeCompare(b.name));
}

/* ---------- the market: real main lines baked in per week ---------- */
function marketLine(week,pid,stat){
  const M=PAY.mkt&&PAY.mkt[String(week)]; if(!M||!M[pid]) return null;
  return M[pid][stat]||null;
}
function mlProb(ml){ return ml>0?100/(ml+100):Math.abs(ml)/(Math.abs(ml)+100); }
function devigOver(over,under){
  const a=mlProb(over), b=mlProb(under); return a/(a+b);
}
/* where the market would put this player's number.
   with a real line: shift the projection until the model agrees with the
   market at that line. without one: the average gap measured against the
   market in the latest week we have lines for. */
function marketMu(pl,stat,mu,week){
  const L=marketLine(week,pl.id,stat);
  if(L&&!MKT[stat].prob){
    const target=devigOver(L.over,L.under);
    const f=m=>pOver(pl.grp,stat,m,L.line);
    /* wide bracket: the market can see a role change the model hasn't caught up to */
    let lo=Math.max(mu*0.1,0.05), hi=Math.max(mu*8,1);
    for(let i=0;i<50;i++){ const mid=(lo+hi)/2; if(f(mid)<target) lo=mid; else hi=mid; }
    let best=(lo+hi)/2, bestErr=Math.abs(f(best)-target);
    /* count stats step rather than slide, so bisection can stall on a plateau or a
       tier edge: finish with a fine sweep and keep whichever value lands closest */
    if(bestErr>0.005){
      const a=Math.log(Math.max(mu*0.1,0.05)), b=Math.log(Math.max(mu*8,1));
      for(let i=0;i<=600;i++){ const m=Math.exp(a+(b-a)*i/600); const err=Math.abs(f(m)-target);
        if(err<bestErr){ bestErr=err; best=m; } }
    }
    return best;
  }
  const s=(PAY.mkt_scale&&PAY.mkt_scale[stat])||1;
  return mu*s;
}
/* the bookmaker's cut on a single side, larger on longshots. anchored to the
   -114/-114 seen on real main lines; the tail shape is an assumption. */
function bookImplied(p){
  const lvl={light:0.6,typical:1.0,heavy:1.5}[S.margin||'typical']||1;
  const base=0.065, tail=0.5*Math.max(0,0.5-p), fav=0.13*Math.max(0,p-0.5);
  const f=1+lvl*(base+tail-fav);
  return Math.min(0.985,Math.max(0.015,p*f));
}
function bookPrice(pMarket){ return probToAmerican(bookImplied(pMarket)); }
/* the full picture for one rung: what we think, what the book would charge */
function rungView(pl,stat,mu,k,week){
  const pModel=pOver(pl.grp,stat,mu,k-0.5);
  const muM=marketMu(pl,stat,mu,week);
  const pMkt=pOver(pl.grp,stat,muM,k-0.5);
  return {pModel,pMkt,est:bookPrice(pMkt)};
}

/* ---------- kickoff lock ---------- */
function kickoff(g){
  if(!g.d) return null;
  const t=g.t||'13:00';
  /* schedule times are US Eastern; clocks go back on the first Sunday of November */
  const off=(g.d>='2026-11-01')?'-05:00':'-04:00';
  const dt=new Date(`${g.d}T${t}:00${off}`);
  return isNaN(dt)?null:dt;
}
function gameStarted(g){ const k=kickoff(g); return !!k&&Date.now()>=k.getTime(); }
function hasScore(g){ return g.hs!=null&&g.as!=null&&isFinite(g.hs)&&isFinite(g.as); }
/* final once a score is in, or once four hours have passed since kickoff */
function gameFinal(g){ if(hasScore(g)) return true; const k=kickoff(g); return !!k&&Date.now()>=k.getTime()+4*3600*1000; }
function actualFor(week,pid){ return (S.actuals&&S.actuals[String(week)]&&S.actuals[String(week)][pid])||null; }
/* did a leg land? null while the stats for that week haven't been loaded */
function settleLeg(l){
  const a=actualFor(l.week,l.pid); if(!a) return null;
  const v=a[l.stat]; if(v==null) return null;
  if(l.stat==='any_td') return v>=1?'win':'loss';
  if(l.main){ if(v===l.k) return 'push'; return (l.side==='under'?v<l.k:v>l.k)?'win':'loss'; }
  return v>=l.k?'win':'loss';
}
/* ---------- track record: every frozen pre-game chance against what happened ----------
   Reads only S.projections (frozen at grade time) and S.actuals. Snapshots written before
   v27 hold just the projection; their rungs are rebuilt from it with the same static tables,
   which gives the identical pre-game chance. A player with no stat line is skipped, as a
   leg would be. A book main line is scored on the side the model favoured; a push is skipped.
   Where a price exists (a sheet you uploaded, or the built-in main-line price) it rides along as
   ml (American) and imp (the book's implied chance, cut included). */
function trackRecord(){
  const out=[]; const P=S.projections||{};
  const gidOf=(w,team)=>{ const g=S.sched.find(x=>+x.w===+w&&(x.h===team||x.a===team)); return g?g.id:null; };
  const priced=(r,ml)=>{ if(ml!=null&&isFinite(ml)&&ml!==0){ r.ml=ml; r.imp=mlProb(ml); } return r; };
  for(const w in P){
    const A=S.actuals&&S.actuals[w]; if(!A) continue;
    for(const pid in P[w]){
      const a=A[pid]; if(!a) continue;
      const pl=S.players[pid]; const grp=pl?pl.grp:null;
      const gid=gidOf(w,a.team);
      for(const stat in P[w][pid]){
        const sn=P[w][pid][stat]; if(!sn) continue;
        const v=a[stat]; if(v==null||!isFinite(v)) continue;
        if(sn.p!=null){ out.push(priced({w:+w,pid,stat,kind:'td',k:1,p:sn.p,hit:v>=1?1:0},gid?oddsFor(gid,pid,'any_td',1):null)); continue; }
        if(sn.mu==null||!isFinite(sn.mu)) continue;
        let r=sn.r; if(!r&&grp) r=rungs(grp,stat,sn.mu).map(x=>[x.k,x.p]);
        for(const [k,p] of (r||[])) if(p>0&&p<1) out.push(priced({w:+w,pid,stat,kind:'rung',k,p,hit:v>=k?1:0},gid?oddsFor(gid,pid,stat,k):null));
        let ml=sn.ml;
        if(!ml&&grp){ const L=marketLine(+w,pid,stat); if(L) ml=[L.line,pOver(grp,stat,sn.mu,L.line)]; }
        /* a book line is scored on the side the model favoured, the one you would have bet */
        if(ml&&ml[1]>0&&ml[1]<1&&v!==ml[0]){
          const over=ml[1]>=0.5; const L=marketLine(+w,pid,stat);
          out.push(priced({w:+w,pid,stat,kind:'main',k:ml[0],side:over?'over':'under',p:over?ml[1]:1-ml[1],hit:(over?v>ml[0]:v<ml[0])?1:0},L?(over?L.over:L.under):null));
        }
      }
    }
  }
  return out;
}
/* summarise a set of graded lines: how many, what was said on average, what happened,
   and the noise margin (two standard errors) that a hit rate of that size carries */
function trackSummary(rows){
  const n=rows.length; if(!n) return {n:0,said:null,hit:null,diff:null,margin:null};
  const said=rows.reduce((a,r)=>a+r.p,0)/n, hit=rows.reduce((a,r)=>a+r.hit,0)/n;
  return {n,said,hit,diff:hit-said,margin:2*Math.sqrt(Math.max(said*(1-said),0.01)/n)};
}
function settleParlay(p){
  const res=p.legs.map(settleLeg);
  if(res.some(r=>r===null)) return {status:'pending',legs:res};
  if(res.some(r=>r==='loss')) return {status:'lost',legs:res};
  if(res.every(r=>r==='push')) return {status:'void',legs:res};
  return {status:'won',legs:res};
}

/* the week the season is actually on: the earliest one still having games played.
   uploading stats no longer pushes this forward on its own. */
function liveWeek(){
  const ws=[...new Set(PAY.sched.map(g=>+g.w))].sort((a,b)=>a-b);
  for(const w of ws){ if(S.sched.some(g=>+g.w===w&&!gameFinal(g))) return w; }
  return ws[ws.length-1];
}
function weekOpen(w){ return w<=liveWeek(); }
