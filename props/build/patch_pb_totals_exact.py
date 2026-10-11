"""app v94: a level takes exactly as many totals as the legs with an edge leave to fill, and the
audit holds on a one-game Monday.

The second review of the totals fill found two faults, both reproduced.

v93 made every leg with an edge the base of the fill pass and the totals its fill, but the two
searches still widened the fill a step at a time: where no parlay with the fewest totals cleared a
level's floor, pbBestReturn went on to one more total, and a total took the place of a leg with an
edge before the likeliest fallback was ever tried (on made-up legs, Medium came out as one moneyline
and two totals with the other moneyline unused). The fill pass now fixes the count: exactly
n - pbMaxLegs(legs with an edge) totals, the most the edge legs leave and no more, for the best
return over the floor and for the likeliest fallback alike (both searches take an optional top for
their count of fill legs, kMax; the edge pass is unchanged). So a total never stands where a leg with
an edge could, and the card's line ("your picks do not make a parlay of this size from legs with an
edge") is true of every level that shows one.

v93's M3 check for player bets with Game total and no player prices required a level whenever any
total was priced. With one game left in the week (Sunday night after the late kickoffs, all of
Monday, the Super Bowl) that game's one total cannot make a pair, so no level can be built and the
check failed, and weekly.py would have refused every props run in that window. It now asks for a
built level only when two or more games have a priced total. The audit's M, and the page smoke, now
hold every level with totals, not only the likeliest, to exactly that count of totals, and hold the
best-return checks to the same top.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
FILES = {k: p for k, p in (('p2', HERE / 'part2.js'), ('p3', HERE / 'part3.js'), ('audit', HERE / 'audit.js'),
                           ('smoke', ROOT / 'nflbets' / 'build' / 'smoke.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'kMax' not in T['p3'], 'patch_pb_totals_exact.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v93 \\u00b7 2026-10-11';", "const APP_BUILD='app v94 \\u00b7 2026-10-11';")
sub1('p3', """function pbBestReturn([id,label,n,floor],pool,memo){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=n;k++){""", """function pbBestReturn([id,label,n,floor],pool,memo,kMax){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  /* kMax, when given, is the most fill legs a parlay may take (the totals' pass, pbTier) */
  for(let k=0;k<=(kMax==null?n:kMax);k++){""")
sub1('p3', """function pbLikeliest(n,pool,memo){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=n;k++){""", """function pbLikeliest(n,pool,memo,kMax){
  const P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=(kMax==null?n:kMax);k++){""")
sub1('p3', """function pbTierOn(t,pool,memo){
  const r=pbBestReturn(t,pool,memo); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo); return x?{...x,likeliest:true}:null;
}""", """function pbTierOn(t,pool,memo,kMax){
  const r=pbBestReturn(t,pool,memo,kMax); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo,kMax); return x?{...x,likeliest:true}:null;
}""")
sub1('p3', """   edge, preferred and thin alike, is then the base and the totals the only fill, the fewest totals
   first, by the same two searches, so a total never takes the place of a leg with an edge */
function pbTier(t,pool,memo){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo);
}""", """   edge, preferred and thin alike, is then the base and the totals the only fill, exactly as many
   totals as those legs leave to fill (pbTotalsFill) and no more, by the same two searches, so a
   total never takes the place of a leg with an edge */
const pbTotalsFill=(n,pool)=>Math.max(0,n-pbMaxLegs([...pool.pref,...pool.thin]));
function pbTier(t,pool,memo){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2],pool));
}""")

# ---- the audit ----
sub1('audit', """        const from=t.mkt?{pref:[...pool.pref,...pool.thin],thin:mkt}:{pref:pool.pref,thin:pool.thin}, fill=t.mkt?t.mkt:t.thin;""",
"""        const from=t.mkt?{pref:[...pool.pref,...pool.thin],thin:mkt}:{pref:pool.pref,thin:pool.thin}, fill=t.mkt?t.mkt:t.thin, kTop=t.mkt?Math.max(0,n-maxLegsOf(from.pref)):undefined;
        /* every level with totals takes exactly as many as the legs with an edge leave to fill */
        if(t.mkt) chk(t.mkt===kTop,`${lab}: the ${t.id} tier takes ${t.mkt} totals where the legs with an edge leave ${kTop} to fill`);""")
sub1('audit', "chk(!!bestRet&&bestRet(SPEC.find(s=>s[0]===t.id),from,new Map())===null,",
     "chk(!!bestRet&&bestRet(SPEC.find(s=>s[0]===t.id),from,new Map(),kTop)===null,")
sub1('audit', "        else if(floor&&bestRet){ const b=bestRet(SPEC.find(s=>s[0]===t.id),from,new Map());",
     "        else if(floor&&bestRet){ const b=bestRet(SPEC.find(s=>s[0]===t.id),from,new Map(),kTop);")
sub1('audit', """      setKinds(['over','under','total']); const rPT=hold('no player prices, player bets and Game total'), mkPT=F('pbPool')(games).mkt.length; F('renderPb')();
      chk((!mkPT||rPT.tiers.some(t=>t.legs))""",
"""      /* a level needs two legs, so only where two or more games have a priced total (a one-game
         Monday has one, and builds nothing) */
      setKinds(['over','under','total']); const rPT=hold('no player prices, player bets and Game total'), nTot=new Set(F('pbPool')(games).mkt.map(l=>l.gid)).size; F('renderPb')();
      chk((nTot<2||rPT.tiers.some(t=>t.legs))""")

sub1('audit', """chk(rAll.tiers.every(t=>!t.legs||!t.mkt||F('pbTier')(SPEC.find(s=>s[0]===t.id),{...F('pbPool')(games),mkt:[]},new Map())===null),'under All a level took a total though the legs with an edge make it'); }""",
"""chk(rAll.tiers.every(t=>!t.legs||!t.mkt||F('pbTier')(SPEC.find(s=>s[0]===t.id),{...F('pbPool')(games),mkt:[]},new Map())===null),'under All a level took a total though the legs with an edge make it'); }
      /* a total never stands where a leg with an edge could (the second review's case): two thin
         moneylines on two games and three totals at -120, both moneylines and one total landing
         22%, under Medium's 25%, where one moneyline and two totals clear it. Medium and Aggressive
         keep both moneylines and take only the totals left to fill */
      { const wk=F('currentWeek')(), mk=(g,o)=>({gid:g,week:wk,k:0,main:true,src:'real',grp:'TEAM',pos:'Game',...o});
        const thinL=[mk('gA',{key:'gA|team:AAA|ml',pid:'team:AAA',stat:'ml',side:'over',team:'AAA',name:'AAA',label:'To win',p:0.93,price:-1000,thin:true}),
          mk('gB',{key:'gB|team:BBB|ml',pid:'team:BBB',stat:'ml',side:'over',team:'BBB',name:'BBB',label:'To win',p:0.46,price:130,thin:true})];
        const tots=['gA','gB','gC'].map(g=>mk(g,{key:g+'|game|total',pid:'game',stat:'total',side:'over',k:44.5,team:'X'+g,name:g+' total',label:'Over 44.5 points',p:0.5217,price:-120,thin:false,market:true}));
        for(const id of ['med','aggr']){ const s=SPEC.find(x=>x[0]===id), r=F('pbTier')(s,{pref:[],thin:thinL,mkt:tots},new Map());
          chk(!!r&&r.legs.filter(l=>l.stat==='ml').length===2&&r.mkt===s[2]-2,`a total took the place of a moneyline with an edge on the ${id} level: ${r?r.legs.map(l=>l.name+' '+l.label).join(', '):'none'}`); } }""")

# ---- the page smoke ----
sub1('smoke', """        /* a likeliest level with totals takes the fewest: every leg with an edge first */
        if (t.mkt && t.likeliest) chk(""", """        /* a level with totals takes exactly as many as the legs with an edge leave to fill */
        if (t.mkt) chk(""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: v94, exactly the totals the edge legs leave to fill; M3 holds on a one-game Monday')
