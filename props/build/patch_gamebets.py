"""app v29: game bets in the parlay builder.
  * Each game overlay starts with a Game bets card: for both teams, "to win"
    (moneyline) and "to cover" the posted spread, with our chance, an estimated
    price, and the book's price where games.csv carries one.
  * Chance model: home margin ~ Normal(mu, 13.5). mu is our rating margin pulled
    halfway to the posted spread when there is one. 13.5 is the long-run spread
    of NFL margins around the line. Both are stated assumptions, not fitted here.
  * Legs settle from the final score: to win pushes on a tie, to cover pushes
    on the number. Game legs are treated as unrelated to player legs (not
    measured); two game legs from the same game are strongly related.
  * games.csv moneylines and spread prices ride along (mla, mlh, spa, sph).
"""
from pathlib import Path

HERE = Path(__file__).parent


def edit(path, pairs):
    p = HERE / path
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:80])
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8", newline="\n")
    print("patched", path)


# ---------------- part2.js: maths, settlement, correlation, version ----------------
GAME_MATH = r"""/* ---------- game bets: a team to win, a team to cover ----------
   Home margin ~ Normal(mu, MARGIN_SD). mu is our rating-based margin pulled halfway to the
   posted spread when there is one (the market knows things our ratings do not). 13.5 points
   is the long-run spread of NFL margins around the line. Both are assumptions, not fitted here. */
const MARGIN_SD=13.5;
function gbErf(x){ const t=1/(1+0.3275911*Math.abs(x)); const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); return x<0?-y:y; }
function gbNorm(z){ return 0.5*(1+gbErf(z/Math.SQRT2)); }
function gameMu(g){ const m=modelMargin(g); return (g.sp!=null&&isFinite(g.sp))?(m+g.sp)/2:m; }
/* kind 'ml': chance the team wins. kind 'ats': chance it covers; line is the team's own
   spread as a book shows it (negative when favoured). null when no spread is posted. */
function gameBet(g,team,kind){
  const isHome=team===g.h; const mu=gameMu(g);
  if(kind==='ml'){ const pH=gbNorm(mu/MARGIN_SD); return {p:isHome?pH:1-pH,line:null,mu:isHome?mu:-mu}; }
  if(g.sp==null||!isFinite(g.sp)) return null;
  const pH=1-gbNorm((g.sp-mu)/MARGIN_SD);      /* home covers when its margin beats the spread */
  return {p:isHome?pH:1-pH,line:isHome?-g.sp:g.sp,mu:isHome?mu:-mu};
}
function isGameLeg(l){ return l&&(l.stat==='ml'||l.stat==='ats'); }
function settleGameLeg(l){
  const g=S.sched.find(x=>x.id===l.gid); if(!g||!hasScore(g)) return null;
  const margin=l.team===g.h?g.hs-g.as:g.as-g.hs;
  const v=l.stat==='ml'?margin:margin+l.k;   /* l.k is the team's spread line */
  return v>0?'win':(v<0?'loss':'push');
}

"""
edit("part2.js", [
    ("/* ---------- feature vector, must match the training order ---------- */",
     GAME_MATH + "/* ---------- feature vector, must match the training order ---------- */"),
    ("function settleLeg(l){\n  const a=actualFor(l.week,l.pid); if(!a) return null;",
     "function settleLeg(l){\n  if(isGameLeg(l)) return settleGameLeg(l);\n  const a=actualFor(l.week,l.pid); if(!a) return null;"),
    ("function legRho(a,b){\n  if(a.gid!==b.gid) return 0;",
     "function legRho(a,b){\n  if(a.gid!==b.gid) return 0;\n"
     "  /* game legs: unrelated to player legs (not measured); two from the same game are strongly related */\n"
     "  if(isGameLeg(a)||isGameLeg(b)){ if(!(isGameLeg(a)&&isGameLeg(b))) return 0; const same=a.team===b.team; return a.stat===b.stat?(same?0.95:-0.95):(same?0.75:-0.75); }"),
    ("const APP_BUILD='app v28 \\u00b7 2026-09-13';", "const APP_BUILD='app v29 \\u00b7 2026-09-14';"),
])

# ---------------- part3.js: leg toggle, pricing, the card, games.csv fields, help text ----------------
CARD = r"""/* the Game bets card at the top of a game: both teams, to win and to cover */
function gameBetsCard(g,locked){
  const rows=[g.a,g.h].map(team=>{
    const ml=gameBet(g,team,'ml'), ats=gameBet(g,team,'ats'); const isHome=team===g.h;
    const bookML=isHome?g.mlh:g.mla, bookSP=isHome?g.sph:g.spa;
    const kML=legKey(g.id,'team:'+team,'ml'), kATS=legKey(g.id,'team:'+team,'ats');
    const onML=!!S.parlay[kML], onATS=!!S.parlay[kATS];
    const mark=r=>r==null?'<span class="res">–</span>':(r==='win'?'<span class="res win">✓</span>':(r==='loss'?'<span class="res loss">✗</span>':'<span class="res">push</span>'));
    const rML=locked?settleGameLeg({gid:g.id,team,stat:'ml',k:0}):null;
    const rATS=(locked&&ats)?settleGameLeg({gid:g.id,team,stat:'ats',k:ats.line}):null;
    const row=(kind,b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);
      return `<tr class="${on?'on':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">
        <td class="pick">${locked?mark(res):`<input type="checkbox" ${on?'checked':''} data-leg="${key}" data-k="${b.line==null?0:b.line}" data-side="over" aria-label="Add ${TEAM_NAMES[team]||team} ${label.toLowerCase()}">`}</td>
        <td class="thr">${label}</td>
        <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${Math.max(2,b.p*100).toFixed(0)}%"></div></div></td>
        <td class="pct">${(b.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
        <td class="num est">${fmtML(bookPrice(b.p))}<em>est.</em></td>
        <td class="num book real">${book!=null&&isFinite(book)?fmtML(book):''}</td></tr>`; };
    let h=`<div class="statblk"><h4>${tag(team)} ${TEAM_NAMES[team]||team} <em>our margin ${ml.mu>0?'+':''}${ml.mu.toFixed(1)}</em>${ats?`<em class="mline">book line ${ats.line>0?'+':''}${ats.line}</em>`:''}</h4><table class="rungs">`;
    h+=row('ml',ml,onML,kML,bookML,rML,'To win');
    if(ats) h+=row('ats',ats,onATS,kATS,bookSP,rATS,`To cover ${ats.line>0?'+':''}${ats.line}`);
    return h+'</table></div>';
  }).join('');
  return `<div class="card"><h2>Game bets</h2>
    <p class="muted" style="margin:0 0 10px">${locked?'How each side did against the money line and the spread.':'A team to win, or to cover the spread. Tick one and it joins the parlay like any player line.'} Chances come from our team ratings, pulled halfway to the posted line, with the final margin treated as spread about 13.5 points around that. A game leg is priced as unrelated to player legs, because that relationship has not been measured here.</p>
    ${rows}${!gameBet(g,g.h,'ats')?'<p class="muted" style="margin:0">No spread posted yet, so only the money line is offered.</p>':''}</div>`;
}
function renderGame(){"""
edit("part3.js", [
    ("function renderGame(){", CARD),
    # place the card between the header card and the first team section
    ("  for(const team of [g.a,g.h]){\n    const t=roster[team];",
     "  html+=gameBetsCard(g,locked);\n  for(const team of [g.a,g.h]){\n    const t=roster[team];"),
    # toggleLeg: game legs branch (after the started-game guard and the toggle-off check)
    ("  const [gid,pid,stat]=key.split('|');\n  const game=g||S.sched.find(x=>x.id===gid);\n  const pl=S.players[pid]; if(!pl||!game) return;",
     "  const [gid,pid,stat]=key.split('|');\n  const game=g||S.sched.find(x=>x.id===gid);\n"
     "  if(stat==='ml'||stat==='ats'){\n"
     "    if(!game) return; const team=pid.replace(/^team:/,''); const b=gameBet(game,team,stat); if(!b) return;\n"
     "    const isHome=team===game.h, opp=isHome?game.a:game.h;\n"
     "    const book=stat==='ml'?(isHome?game.mlh:game.mla):(isHome?game.sph:game.spa);\n"
     "    const label=stat==='ml'?'To win':`To cover ${b.line>0?'+':''}${b.line}`;\n"
     "    S.parlay[key]={gid,pid,stat,k:b.line==null?0:b.line,side:'over',main:false,p:b.p,price:(book!=null&&isFinite(book))?book:bookPrice(b.p),src:(book!=null&&isFinite(book))?'real':'est',\n"
     "      mu:null,name:TEAM_NAMES[team]||team,pos:'Game',grp:'TEAM',team,opp,week:game.w,label};\n"
     "    save(); renderGame(); renderParlay(); return;\n"
     "  }\n"
     "  const pl=S.players[pid]; if(!pl||!game) return;"),
    ("function legPrice(l){\n  const book=l.main?null:oddsFor(l.gid,l.pid,l.stat,l.k);",
     "function legPrice(l){\n  if(isGameLeg(l)) return l.price!=null?{ml:l.price,src:l.src||'est'}:{ml:probToAmerican(l.p),src:'fair'};\n  const book=l.main?null:oddsFor(l.gid,l.pid,l.stat,l.k);"),
    # games.csv refresh carries the moneylines and spread prices
    ("      g.sp=isFinite(sp)?sp:g.sp; g.tot=isFinite(tot)?tot:g.tot;\n",
     "      g.sp=isFinite(sp)?sp:g.sp; g.tot=isFinite(tot)?tot:g.tot;\n"
     "      for(const [f,c] of [['mla','away_moneyline'],['mlh','home_moneyline'],['spa','away_spread_odds'],['sph','home_spread_odds']]){ const v=parseFloat(row[c]); if(isFinite(v)) g[f]=v; }\n"),
    ("        <li>Different stats for the same player are fine, and so are players from different games.</li>",
     "        <li>Different stats for the same player are fine, and so are players from different games.</li>\n"
     "        <li>Each game also offers <b>a team to win</b> and <b>a team to cover the spread</b>, at the top of the game. They go in like any other leg.</li>"),
])

# ---------------- payload.py: moneylines and spread prices in the baked schedule ----------------
edit("payload.py", [
    ("        'tot':None if pd.isna(r.total_line) else float(r.total_line)}",
     "        'tot':None if pd.isna(r.total_line) else float(r.total_line)}\n"
     "    for f,c in (('mla','away_moneyline'),('mlh','home_moneyline'),('spa','away_spread_odds'),('sph','home_spread_odds')):\n"
     "        if c in g26.columns and not pd.isna(getattr(r,c)): _g[f]=float(getattr(r,c))"),
])

# ---------------- audit.js: section J, game bets ----------------
edit("audit.js", [
    ("  const [gameCtx,rosterFor,statLines,project,pOver,fairLine,rungView,marketLine,marketMu,devigOver,bookImplied,bookPrice,probToAmerican,mlToDec,parlayProb,modelMargin,modelPoints,legRho]=\n"
     "   ['gameCtx','rosterFor','statLines','project','pOver','fairLine','rungView','marketLine','marketMu','devigOver','bookImplied','bookPrice','probToAmerican','mlToDec','parlayProb','modelMargin','modelPoints','legRho'].map(F);",
     "  const [gameCtx,rosterFor,statLines,project,pOver,fairLine,rungView,marketLine,marketMu,devigOver,bookImplied,bookPrice,probToAmerican,mlToDec,parlayProb,modelMargin,modelPoints,legRho,gameBet,settleLeg,gameMu]=\n"
     "   ['gameCtx','rosterFor','statLines','project','pOver','fairLine','rungView','marketLine','marketMu','devigOver','bookImplied','bookPrice','probToAmerican','mlToDec','parlayProb','modelMargin','modelPoints','legRho','gameBet','settleLeg','gameMu'].map(F);"),
    ("  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */",
     "  /* ---- J. game bets: to win, to cover ---- */\n"
     "  { const gj=S.sched.find(x=>x.sp!=null); const gx={...gj,sp:3,tot:44};\n"
     "    const hw=gameBet(gx,gx.h,'ml'), aw=gameBet(gx,gx.a,'ml'), hc=gameBet(gx,gx.h,'ats'), ac=gameBet(gx,gx.a,'ats');\n"
     "    chk(Math.abs(hw.p+aw.p-1)<1e-9,'to-win chances do not sum to 1');\n"
     "    chk(Math.abs(hc.p+ac.p-1)<1e-9,'to-cover chances do not sum to 1');\n"
     "    chk(hc.line===-3&&ac.line===3,`cover lines wrong (${hc.line}, ${ac.line})`);\n"
     "    chk(hw.p>0.02&&hw.p<0.98&&Math.abs(gameMu(gx)-(modelMargin(gx)+3)/2)<1e-9,'game mu is not halfway to the spread');\n"
     "    chk(gameBet({...gx,sp:null},gx.h,'ats')===null&&gameBet({...gx,sp:null},gx.h,'ml')!==null,'no spread should drop the cover leg only');\n"
     "    const better={...gx,sp:10}; chk(gameBet(better,better.h,'ml').p>hw.p,'a bigger home spread should raise the home win chance');\n"
     "    const fin={...gx,hs:27,as:20}; S.sched.push({...fin,id:'jtest'});\n"
     "    chk(settleLeg({gid:'jtest',team:fin.h,stat:'ml',k:0})==='win'&&settleLeg({gid:'jtest',team:fin.a,stat:'ml',k:0})==='loss','to-win settlement wrong');\n"
     "    chk(settleLeg({gid:'jtest',team:fin.h,stat:'ats',k:-3})==='win'&&settleLeg({gid:'jtest',team:fin.h,stat:'ats',k:-7})==='push'&&settleLeg({gid:'jtest',team:fin.a,stat:'ats',k:3})==='loss','to-cover settlement wrong');\n"
     "    S.sched.pop();\n"
     "    chk(legRho({gid:'g',stat:'ml',team:'SEA',grp:'TEAM'},{gid:'g',stat:'ml',team:'KC',grp:'TEAM'})<0&&legRho({gid:'g',stat:'ml',team:'SEA',grp:'TEAM'},{gid:'g',pid:'p',stat:'passing_yards',team:'SEA',grp:'QB'})===0,'game-leg correlations wrong');\n"
     "    const gopen=S.sched.find(x=>x.w===1&&!F('gameStarted')(x)); d.querySelector('[data-game=\"'+gopen.id+'\"]').click();\n"
     "    const gcb=d.querySelector('[data-leg$=\"|ml\"]'); chk(!!gcb,'no to-win checkbox in the game overlay');\n"
     "    if(gcb){ gcb.checked=true; gcb.dispatchEvent(new w.Event('change')); const L=Object.values(S.parlay).find(l=>l.stat==='ml'); chk(!!L&&L.grp==='TEAM'&&L.p>0&&L.p<1&&L.label==='To win','to-win leg did not land in the parlay');\n"
     "      chk(/To win/.test(d.getElementById('parlayBody').textContent),'to-win leg not shown in the parlay builder');\n"
     "      gcb.checked=false; gcb.dispatchEvent(new w.Event('change')); chk(!Object.values(S.parlay).some(l=>l.stat==='ml'),'to-win leg did not come back out'); }\n"
     "    d.getElementById('backBtn').click();\n"
     "    console.log(`J. game bets: home win ${(hw.p*100).toFixed(0)}% at +3, cover ${(hc.p*100).toFixed(0)}%, settlement and toggling ok`); }\n\n"
     "  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */"),
])
edit("part3.js", [
    ("    for(const k of ['d','t','sp','tot','hs','as']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }",
     "    for(const k of ['d','t','sp','tot','hs','as','mla','mlh','spa','sph']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }"),
])
print("done")
