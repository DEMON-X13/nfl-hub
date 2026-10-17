r"""app v111: Suggest Parlays, a tab of each prime-time game's own parlays, locked 2 hours before kickoff, and the
Parlay Builder's Top 100 lines.

The owner, 16 October 2026: "in safe/med/aggro/ext parlay leg section get rid of the lock and do similar
tracking/grading as ELO tracking. Do a section for Thurs night, sun night, and monday night games ONLY. do
absolute best suggestions. each line item allow to add to parlay builder. call new section tab 'Suggest
Parleys'." And: "move top section with odds, build from, bet types, game checkboxes into new section tab called
'Parlay Builder'. add leg parlay section for live builder, in that section add refresh odds button and show top
100 line + profit ratio and allow each line item to be added to parley builder." Then, on the sets moving: "obviously
dont want the lines and options changing alot ... can we have the ability to refresh odds up until 2 hours before the
game before it locks?", and, of a locked leg's player ruled out: "Replace that level only".

So the Parlay Builder's four levels over every game, with their locks, New legs and Reset (app v95,
patch_pb_lock_turn.py), leave the page, and two things take their place.

Suggest Parlays (#suggest, its own section, tab-suggest, after Props). Each game of the week still to come that
kicks off on a Thursday, Sunday or Monday at or after 7:00 pm US Eastern (spPrime: Thursday, Sunday and Monday
night football, a Monday doubleheader's both games, Thanksgiving's and Christmas's night games; never a day game,
never a Saturday) gets its own Safe, Medium, Aggressive and Extreme, 2 to 5 legs from that game's lines alone, a
same-game parlay priced by the builder's own sums. The level rules are the panel's (Safe the likeliest pair; the
others the best expected return over 25%, 12% and 5% by the model, else the likeliest of their size), on every bet
type whatever the Parlay Builder's boxes say (SP_ALL), so the page and the record agree, and every rule a leg had
to pass still holds: DraftKings' id at its line where the payload carries ids (app v109), the 45-97% band, the
3-point edge, market + form, the far-off guard, V6's players who will not play, one side and one total a game,
one leg a player. One game's pool is small, so the search is run far wider than the panel's (SP_SEARCH: 60 legs a
list, a beam of 200 and 400, the best 4 and 10 by the real sums, against 40, 12 and 24, 3 and 8), at about a second
a priced game; the page builds a game's set only while the tab is on the screen, a hidden tab drawing only what is
already built, so a load of the hub pays nothing for a tab nobody opened. A game with too few
legs says so per level, and when its player prices, and DraftKings' ids with them, come (spWhy). A game that kicks
off leaves the tab, as a level's legs always have.

The lock. A set is live until 2 hours before its kickoff (spLockAt): built from the published prices and, in the
visitor's browser, any Refresh odds press, and the tab says when it locks. From the lock to kickoff the tab shows
the site's locked set: the game's entry in the suggestions record (props/data/suggest_ledger.json's `prime`, which
props/build/suggest_ledger.js writes on every run of the props job while the lock is to come and freezes from the
first run at or after it, so it holds the last publish before the lock), the same for every visitor and what the
record grades; a Refresh odds press no longer changes it. Where the record has no entry for the game (no run before
the lock, or no file), the page builds the set once, says it is not the site's locked set, and keeps it in the
browser (props_sp_lock_v1, outside S, a game's entry pruned once it kicks off) so a reload shows the same set. A
locked level holding a player the latest published report has Out or Doubtful, or the roster inactive, or the
page's own rules hold out (suggestable, V6's NOPLAY) is built again from the lines at hand, that level only, and
marked "Updated: <player> ruled out" with when: the record's own replacement where the job has made one (the
level's `updated`), else the page's, said to be the page's and kept in the browser beside the set (spUpdLine). The
page's line says the record grades the site's locked set, which the props job updates the same way only if it runs
again before kickoff: its runs start 2 to 9 hours late and replace a level only before kickoff, so the page's own
change is usually the browser's alone. A locked
level's chance and price are worked out again on its legs as kept by the builder's own sums (the kept figures are
rounded, and on $37.50 a cent off was what Add to builder then paid; its fair chance stays the one kept, so a press
moves nothing), and a locked leg's own Add puts that leg in as it was locked, never the line as it stands now. A set
that reaches its lock with the page open has the record read again, since the job may have written the game's entry
after the page loaded. Each set gives its kickoff in Eastern time, as its lock is said.

The record. At the top of the tab, a line a level like the ELO Ratings tab's record bar: won-lost and units on $1
from the record's `prime` entries' own grades (spRecSum: each season, game and level once, from the last entry that
holds it), and what is pending, starting with this change. The old all-games record (`entries`) stays in the file,
graded, and is drawn nowhere.

The Elo picks (#pbElo, their rules unchanged, still on the Parlay Builder tab's ticks) move to the foot of the new
tab.

The Parlay Builder (#parlay) keeps its controls as they were (Bet amount, Refresh odds, Build from, the bet types,
the games), and under them, where the levels were, the Top 100 lines: every leg on those ticks that qualifies as a
suggestion's leg does (pbLegs: the preferred and thin lists and, with Game total ticked, the totals, uncapped),
in two groups: every preferred leg and every total first, then every thin-edge leg (one that missed the 3-point
edge or market + form, which a level takes only as fill), each marked thin edge as a level marks its own, each
group ranked by its expected profit on $1 at the model's chance (chance times the decimal price, less 1), best
first, at most 100 in all, so the thin legs, which pay more for the model's chance, never crowd the top (getPbTop, cached on the levels' own signature, so it is rebuilt after a press and when a game kicks off).
Each row gives the leg, its price (est. where it is), the model's chance, the book's fair chance where there is one,
what $1 wins and what $1 is expected to make. Under it the builder has its own Refresh odds, the same read, the focus
kept on it.

Each leg in a set, in an Elo pick and on the list has its own Add (44px, named for the leg), which adds that one leg
to the builder by toggleLeg's own path, so the builder prices it as it always has, and reads Added (aria-pressed)
while it is in; a second press takes it off, as on a game's page. A set's Add to builder and Finish are kept
(data-sp-add, data-pc-finish="sp|<game id>:<level>").

The level engine (pbPool, pbTier and the searches, pbBuild, getPbTiers) is kept and only widened: pbAllows, pbLegs,
pbPool and the searches take the choices and the widths as arguments, defaulting to the panel's own, so a call as
before behaves exactly as before (the audit and the smoke still hold the engine through getPbTiers on many sets of
ticks, and suggest_ledger.js read it until this change). Every edit is made in memory and asserted to match exactly
once; nothing is written unless all of them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'function spSet(' not in T['p3'], 'patch_suggest_tab.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


def between(k, start, end, new):
    """replace from start (kept out) up to end (kept), each found exactly once"""
    s = T[k]
    assert s.count(start) == 1 and s.count(end) == 1, (k, s.count(start), s.count(end), start[:60], end[:60])
    i, j = s.index(start), s.index(end)
    assert i < j, (k, start[:60], end[:60])
    T[k] = s[:i] + new + s[j:]


sub1('p2', "const APP_BUILD='app v110 \\u00b7 2026-10-16';", "const APP_BUILD='app v111 \\u00b7 2026-10-16';")

# ---------------------------------------------------------------- part1: the tab, its section, the styles
sub1('p1', '''    <button role="tab" data-tab="slate" aria-selected="true">Games</button>
    <button role="tab" data-tab="parlay">Parlay Builder</button>''',
'''    <button role="tab" data-tab="slate" aria-selected="true">Games</button>
    <button role="tab" data-tab="suggest">Suggest Parlays</button>
    <button role="tab" data-tab="parlay">Parlay Builder</button>''')
sub1('p1', '''<section id="tab-parlay" hidden>
  <div id="pbPanel"></div>''', '''<section id="tab-suggest" hidden>
  <div id="spPanel"></div>
</section>

<section id="tab-parlay" hidden>
  <div id="pbPanel"></div>''')
between('p1', '.pb-rec{margin:16px 0 0;', '.pb-tiers{display:grid;', '')
between('p1', '.pb-legs .pb-lock+.nm{flex:1}', '.pb-legs .nm small{display:block;', '')
sub1('p1', '.pb-acts .btn{flex:1 1 auto;text-align:center;min-height:40px}',
     '.pb-acts .btn{flex:1 1 auto;text-align:center;min-height:44px}')
sub1('p1', '/* the parlay card: what it pays sits under the legs behind a divider, then the actions behind another */',
r'''/* app v111: Suggest Parlays (each Thursday, Sunday and Monday night game's own set, its lock and the record bar)
   and the Parlay Builder's Top 100 lines; each leg's own Add, 44px */
/* the Parlay Builder tab's own controls, at the top of it as they were, now 44px tall like every control on the
   tab: Build from, the games' All and None and their list's summary, and the Bet amount (its box's 1px border
   round a 42px input) */
.pb-seg button,.pb .pb-gbar .btn,.pb-games summary{min-height:44px}
.pb-amt input[type=number]{min-height:42px}
.sp-game{margin:18px 0 0;padding:14px 0 0;border-top:1px solid var(--line)}
.sp-hd{display:flex;align-items:baseline;gap:6px 10px;flex-wrap:wrap;margin:0 0 6px}
.sp-hd h3{margin:0;font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px;min-width:0;overflow-wrap:anywhere}
.sp-hd small{font-size:12px;color:var(--muted)}
.sp-lock{margin:0 0 12px;font-size:12.5px;line-height:1.5;color:var(--ink-2)}
.sp-lockmark{display:inline-block;margin-right:6px;padding:1px 8px;border:1px solid var(--gold);border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink);vertical-align:1px}
.sp-rec .bar{margin:8px 0 6px}
.sp-rec .bar .rec{white-space:normal;min-width:0;overflow-wrap:anywhere}
.sp-rec-line{margin:0 0 12px;font-size:12px;line-height:1.5}
.sp-odds{margin:0 0 4px}
.sp-upd{color:var(--ink)}
.pb-legs .nm{flex:1 1 auto}
.pb-legs .pr{flex:none}
.pb-legadd{flex:none;align-self:center;min-height:44px;min-width:44px;padding:0 10px;font-size:12.5px}
.pb-legadd.on{border-color:var(--pick);background:var(--pick-soft);color:var(--ink)}
.pb-top{list-style:none;margin:0;padding:0}
.pb-trow{display:grid;grid-template-columns:26px minmax(0,1fr) auto auto;grid-template-areas:"rk nm cs ad";align-items:center;gap:6px 12px;padding:8px 0;margin:0;border-top:1px solid var(--line);font-size:13px}
.pb-trk{grid-area:rk;text-align:right;font-size:12px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}
.pb-trow .nm{grid-area:nm;font-weight:600;min-width:0;overflow-wrap:anywhere}
.pb-trow .nm small{display:block;font-weight:400;color:var(--ink-2);font-size:11.5px}
.pb-trow .nm small.pb-tg{color:var(--muted)}
.pb-tcs{grid-area:cs;display:grid;grid-template-columns:repeat(5,minmax(64px,auto));gap:4px 10px}
.pb-tc{text-align:right;min-width:0}
.pb-tc b{display:block;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink)}
.pb-tc small{display:block;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.pb-tc .est{font-style:normal;font-size:10.5px;font-weight:500;color:var(--ink-2);margin-left:2px}
.pb-trow .pb-legadd{grid-area:ad}
.pb-trow[data-pb-grp="edge"]+.pb-trow[data-pb-grp="thin"]{border-top:2px solid var(--gold)}
@media(max-width:1100px){ .pb-trow{grid-template-columns:26px minmax(0,1fr) auto;grid-template-areas:"rk nm ad" ". cs cs"} .pb-tcs{justify-content:start} .pb-tc{text-align:left} }
@media(max-width:640px){ .pb-tcs{grid-template-columns:repeat(3,minmax(0,1fr));width:100%} }
/* the parlay card: what it pays sits under the legs behind a divider, then the actions behind another */''')

# ---------------------------------------------------------------- part3
P = 'p3'
sub1(P, '''   cache a price stands on is dropped (PB_CACHE, GAME_TIER_CACHE, PB_VIEW; ESPN_SEQ is in pbDataSig and
   gameSuggestSig) and the page is drawn again.''', '''   cache a price stands on is dropped (PB_CACHE, PB_TOP_CACHE, SP_CACHE, GAME_TIER_CACHE; ESPN_SEQ is in
   pbDataSig and gameSuggestSig) and the page is drawn again.''')
sub1(P, '''  const where=fk&&a.closest?(a.closest('#gameView')?'#gameView':(a.closest('#pbPanel')?'#pbPanel':(a.closest('#slateOdds')?'#slateOdds':null))):null;
  PB_CACHE=new Map(); GAME_TIER_CACHE={}; PB_VIEW={sig:null,key:null,t:{}};''',
'''  /* (app v111) the button pressed is found again wherever it was: a game's page, the Parlay Builder's
     controls or its builder, Suggest Parlays, the Props tab */
  const where=fk&&a.closest?(['#gameView','#pbPanel','#parlayBody','#spPanel','#slateOdds'].find(s=>a.closest(s))||null):null;
  PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={};''')

sub1(P, '''let PB_CACHE=new Map(), PB_SHOWN=null, PB_AMT_T=null;
''', '''let PB_CACHE=new Map(), PB_SHOWN=null, PB_AMT_T=null;
/* (app v111) the search's widths, as the panel has always run them: a caller may widen them (opt), as
   Suggest Parlays does for one game's pool (SP_SEARCH); a call without opt is exactly as before */
const PB_SEARCH={cap:PB_CAP,beam:PB_BEAM,wide:PB_WIDE,likely:PB_LIKELY,final:PB_FINAL};
const pbOpt=o=>o?{...PB_SEARCH,...o}:PB_SEARCH;
''')
sub1(P, '''/* a leg the reader's picks allow: its box ticked and its game ticked */
function pbAllows(l){ const u=pbUi(); return''', '''/* a leg the reader's picks allow: its box ticked and its game ticked (u: other choices, as Suggest
   Parlays' every bet type, SP_ALL; the reader's own by default) */
function pbAllows(l,u){ u=u||pbUi(); return''')
sub1(P, '''function pbCap(list){
  list=[...list].sort(pbOrd); if(list.length<=PB_CAP) return list;
  const by=f=>[...list].sort((a,b)=>(f(b)-f(a))||pbOrd(a,b)), keep=new Map();
  for(const c of [...by(c=>c.p).slice(0,PB_CAP/2),...by(c=>c.p*(mlToDec(c.price)||1)).slice(0,PB_CAP/2)])''',
'''function pbCap(list,cap){
  cap=cap||PB_CAP; list=[...list].sort(pbOrd); if(list.length<=cap) return list;
  const by=f=>[...list].sort((a,b)=>(f(b)-f(a))||pbOrd(a,b)), keep=new Map();
  for(const c of [...by(c=>c.p).slice(0,Math.ceil(cap/2)),...by(c=>c.p*(mlToDec(c.price)||1)).slice(0,Math.floor(cap/2))])''')
sub1(P, '''/* the legs on the reader's picks: preferred (the full bar) and thin (at or above the book, no more) */
function pbPool(games){
''', '''/* the legs on the reader's picks (u, the choices: the reader's own by default): preferred (the full bar)
   and thin (at or above the book, no more), uncapped (the Top 100 lines rank them all); pbPool caps them */
function pbLegs(games,u){
  u=u||pbUi();
''')
sub1(P, "if(!pbAllows(c)||!(c.src==='real'", "if(!pbAllows(c,u)||!(c.src==='real'")
sub1(P, "  if(pbUi().k.total) for(const g of games) for(const side of ['over','under']){", "  if(u.k.total) for(const g of games) for(const side of ['over','under']){")
sub1(P, "if(c&&pbAllows(c)&&c.src==='real'", "if(c&&pbAllows(c,u)&&c.src==='real'")
sub1(P, '  return {pref:pbCap(pref),thin:pbCap(thin),mkt:pbCap(mkt),plGames:plGames.size,',
     '  return {pref,thin,mkt,plGames:plGames.size,')
sub1(P, '''/* a leg that can join: not a line already on it,''', '''/* the legs a level is searched from: each list cut to the likeliest and best-paying (opt.cap, 40 for the
   panel), so the search stays quick */
function pbPool(games,u,opt){ const r=pbLegs(games,u), cap=pbOpt(opt).cap; return {...r,pref:pbCap(r.pref,cap),thin:pbCap(r.thin,cap),mkt:pbCap(r.mkt,cap)}; }
/* a leg that can join: not a line already on it,''')

# the searches: the visitor's locked legs (base) go, and the widths come from opt
between(P, 'function pbBeam(pools,floor,by,width,memo,base){', '/* why a tier is empty, in the reader\'s terms:', r'''function pbBeam(pools,floor,by,width,memo){
  let beam=[{legs:[],id:''}];
  for(let s=0;s<pools.length;s++){
    const next=new Map();
    for(const b of beam) for(const c of pools[s]){ if(!pbFits(b.legs,c)) continue;
      const e=pbEval([...b.legs,c],memo); if(next.has(e.id)||(floor&&e.pr<floor*0.9)) continue; next.set(e.id,e); }
    if(!next.size) return [];
    beam=[...next.values()].sort((a,b)=>(b[by]-a[by])||a.id.localeCompare(b.id)).slice(0,width);
  }
  return beam;
}
/* a finalist with the builder's own sums, on the legs in the builder's order */
function pbExact(legs){
  const L=pbOrder(legs.map(l=>({...l}))), pr=parlayProb(L);
  return {legs:L,corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price}))),thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length};
}
/* a level's best return: preferred legs alone first, then with k legs from the thin list, fewest
   first. The best few by the search's own score are worked exactly, and the best of those that
   clears the floor is the tier; null when none does. Safe, with no floor, is the likeliest pair.
   opt: the search's widths (pbOpt; the panel's own without it) */
function pbBestReturn([id,label,n,floor],pool,memo,kMax,opt){
  const o=pbOpt(opt), P=pool.pref, U=[...pool.pref,...pool.thin];
  /* kMax, when given, is the most fill legs a parlay may take (the totals' pass, pbTier) */
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    const fin=new Map();
    if(!floor) for(const e of pbBeam(pools,0,'pr',Infinity,memo)) fin.set(e.id,e);
    else for(const e of [...pbBeam(pools,floor,'ev',o.beam,memo),...pbBeam(pools,floor,'pr',o.beam,memo)]) fin.set(e.id,e);
    /* the finalists that clear the floor by the search's own score, best first, worked with the
       real sums on fewer draws; then the best in full, which is what the card shows and what the
       floor is held to */
    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort((a,b)=>((floor?b.ev-a.ev:b.pr-a.pr))||a.id.localeCompare(b.id)).slice(0,o.final)
      .map(e=>{ const L=pbOrder(e.legs), pr=parlayProb(L,6000).corr, d=parlayDec(L.map(l=>({leg:l,ml:l.price})),4000); return {e,sc:floor?pr*d:pr,ok:!floor||pr>=floor*0.97}; })
      .filter(x=>x.ok).sort((a,b)=>(b.sc-a.sc)||a.e.id.localeCompare(b.e.id));
    for(const x of top){ const r=pbExact(x.e.legs); if(!floor||r.corr>=floor) return r; }
  }
  return null;
}
/* the likeliest n-leg parlay on the picks, for a level none of whose parlays reaches its floor.
   Chosen as Safe is: preferred legs alone first, then with k thin legs, fewest first. At each k a
   beam by the search's own chance, twice as wide as the floor search's, and its best few (three for
   the panel) by that chance worked with the builder's own sums (parlayProb, on the legs in the
   builder's order), the highest of those the tier (the lower id on a tie, so the same picks always
   give the same parlay). Legs in different games are a plain product, so there the search's chance
   is the builder's and this is the likeliest parlay outright. null only when the picks do not make
   n legs at all */
function pbLikeliest(n,pool,memo,kMax,opt){
  const o=pbOpt(opt), P=pool.pref, U=[...pool.pref,...pool.thin];
  for(let k=0;k<=(kMax==null?n:kMax);k++){
    if(k&&!pool.thin.length) break;
    if(pbMaxLegs(P)<n-k||pbMaxLegs(U)<n) continue;
    const pools=Array.from({length:n},(_,s)=>s<n-k?P:U);
    let best=null;
    for(const e of pbBeam(pools,0,'pr',o.wide,memo).slice(0,o.likely)){
      const pr=parlayProb(pbOrder(e.legs)).corr;
      if(!best||pr>best.pr||(pr===best.pr&&e.id<best.e.id)) best={e,pr}; }
    if(best) return pbExact(best.e.legs);
  }
  return null;
}
/* one level: the best return over its floor, else (Medium, Aggressive, Extreme) the likeliest
   parlay of its size, marked likeliest so its card says which it is */
function pbTierOn(t,pool,memo,kMax,opt){
  const r=pbBestReturn(t,pool,memo,kMax,opt); if(r||!t[3]) return r;
  const x=pbLikeliest(t[2],pool,memo,kMax,opt); return x?{...x,likeliest:true}:null;
}
/* the legs with an edge first, exactly as before (preferred, then the fewest thin); only where
   they cannot make a parlay of the level's size at all are the totals added: every leg with an
   edge, preferred and thin alike, is then the base and the totals the only fill, exactly as many
   totals as those legs leave to fill (pbTotalsFill) and no more, by the same two searches, so a
   total never takes the place of a leg with an edge */
const pbTotalsFill=(n,pool)=>Math.max(0,n-pbMaxLegs([...pool.pref,...pool.thin]));
function pbTierOf(t,pool,memo,opt){
  const r=pbTierOn(t,{pref:pool.pref,thin:pool.thin},memo,undefined,opt); if(r||!(pool.mkt&&pool.mkt.length)) return r;
  return pbTierOn(t,{pref:[...pool.pref,...pool.thin],thin:pool.mkt},memo,pbTotalsFill(t[2],pool),opt);
}
/* a level with its fair chance (parlayFair on its legs, in the builder's order), worked once it is chosen */
const pbWithFair=r=>r&&r.legs?{...r,fair:parlayFair(r.legs)}:r;
function pbTier(t,pool,memo,opt){ return pbWithFair(pbTierOf(t,pool,memo,opt)); }
''')

# the locks and turns go; pbDataSig stays; the record is read for Suggest Parlays
between(P, "/* ---------- a level of the visitor's own: legs locked, the rest turned over ----------",
        '/* the tiers for the picks as they stand, from the cache when nothing they stand on has moved */', r'''/* what the tiers stand on beyond the picks: the data the job published and the page loaded */
function pbDataSig(){ return [PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig(),'e'+ESPN_SEQ].join('|'); }
/* ---------- the suggestions record (props/data/suggest_ledger.json) ----------
   The props job's record (props/build/suggest_ledger.js). Since app v111 the page reads its `prime` map: each
   Thursday, Sunday and Monday night game's set on Suggest Parlays, as the job last published it before the
   game's lock (2 hours before kickoff), frozen there and graded after the game as a book settles it. Keyed
   season|WW|kickoff|game id, each entry {season, week, gid, away, home, kickoff, lock, baked_at, taken_at,
   pool, tiers, grade, updates}; its tiers are the four levels in spTierOut's shape, a level the job built again
   for a player ruled out after the lock carrying `updated` {pid, name, reason, at}. Its `entries` map, the
   all-games panel's record from 12 October 2026, stays in the file, graded, and is drawn nowhere. Read beside
   the payload with no-store once a load, kept outside S so it is never saved; a file that is not there, or
   neither map an object, is no record (PB_REC null), and PB_REC_DONE says the read has answered either way,
   so a locked game waits for it before building a set of its own. */
let PB_REC=null, PB_REC_DONE=false;
const PB_REC_URL=DATA_URL.replace(/payload\.json$/,'suggest_ledger.json');
const pbIsMap=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
/* PB_REC_STATE: which side of its lock each set was on when the record was last read (spState), so a set that
   reaches its lock with the page open has the record read again (pbWatch): the job may have rewritten or first
   taken the game's entry since the page loaded, and the locked set is the one it published last. Until that read
   answers the tab shows the record as this load read it; a read again that fails, or is not a record, keeps it */
let PB_REC_STATE=null;
async function pbRecLoad(again){
  let L=null;
  try{ const r=await fetch(PB_REC_URL+'?t='+Date.now(),{cache:'no-store'}); if(r.ok) L=await r.json(); }catch(e){ L=null; }
  const ok=pbIsMap(L)&&(pbIsMap(L.entries)||pbIsMap(L.prime));
  if(ok||!again) PB_REC=ok?L:null;
  PB_REC_DONE=true;
  try{ PB_REC_STATE=spState(); }catch(e){}
  try{ renderSp(); }catch(e){ console.error(e); }
}
window.pbRecLoad=pbRecLoad;
/* the record a level: each season's game and level once, from the last entry that holds it (a kickoff the
   league moved makes a new key), from the entries' own grades: won or lost (a push, every leg a push or a
   void, the stake back, is counted apart; a parlay a push shortened counts at what it was graded to pay),
   the wins expected by the book's fair chance and by the model's (the chances the set showed), units on $1 */
function spRecSum(L){
  const out=PB_TIERS.map(([id,label])=>({id,label,graded:0,won:0,lost:0,push:0,fair:0,fairN:0,model:0,units:0}));
  let pending=0, games=0; const E=L&&pbIsMap(L.prime)?L.prime:{}, last=new Map();
  for(const k of Object.keys(E).sort()){ const e=E[k]; if(!e||!Array.isArray(e.tiers)) continue; games++;
    for(const t of e.tiers){ const g=e.grade&&e.grade[t&&t.id]; if(!g||!out.some(x=>t&&x.id===t.id)||!Array.isArray(t.legs)) continue;
      last.set([e.season,e.gid,t.id].join('|'),{t,g}); } }
  for(const {t,g} of last.values()){ const s=out.find(x=>x.id===t.id);
    if(g.result==='pending'){ pending++; continue; }
    if(g.result==='push'){ s.push++; continue; }
    if(g.result!=='won'&&g.result!=='lost') continue;
    s.graded++; if(g.result==='won') s.won++; else s.lost++;
    s.model+=isFinite(+t.p)?+t.p:0; if(t.fair!=null&&isFinite(+t.fair)){ s.fair+=+t.fair; s.fairN++; }
    s.units+=(g.result==='won'&&isFinite(+g.payout)?+g.payout:0)-1; }
  return {tiers:out,pending,games};
}
/* the record's line at the top of Suggest Parlays: a pill a level (won-lost, units on $1), then what is
   pending, as the ELO Ratings tab's record bar; no record, nothing (hidden) */
function spRecHtml(){
  if(!PB_REC) return '<div id="spRec" class="sp-rec" hidden></div>';
  const R=spRecSum(PB_REC), any=R.tiers.some(s=>s.graded||s.push);
  const un=v=>(v>0.0005?'+':v<-0.0005?'−':'')+Math.abs(v).toFixed(2), f1=v=>v.toFixed(1);
  const pills=any?R.tiers.map(s=>`<span class="rec" data-sp-rec="${s.id}" title="${esc(s.label)}: ${s.graded} graded, ${s.won} won${s.graded?`; wins expected ${s.fairN?f1(s.fair)+' by the book’s fair chance'+(s.fairN<s.graded?' (on the '+s.fairN+' with one)':'')+', ':''}${f1(s.model)} by the model`:''}${s.push?`; ${s.push} push${s.push===1?'':'es'}, the stake back`:''}">${esc(s.label)} <b>${s.won}–${s.lost}</b> ${s.graded||s.push?un(s.units)+' units':''}</span>`).join('')
    :'<span class="rec" data-sp-rec="none">No prime-time set graded yet</span>';
  return `<div id="spRec" class="sp-rec"><div class="bar">${pills}${R.pending?`<span class="rec" data-sp-rec="pending">Pending <b>${R.pending}</b></span>`:''}</div>
    <p class="muted sp-rec-line">The record starts with this change, 16 October 2026: each Thursday, Sunday and Monday night game’s four parlays as the site locked them, 2 hours before kickoff, graded as a book settles them (a push drops out, and so does a player who did not play; one who played with no stat line is graded on zero). Won–lost and units on $1 a parlay. Refresh odds never changes it.</p></div>`;
}
''')

sub1(P, '''function getPbTiers(){
  const u=pbUi(), games=pbGames();
  const sig=[currentWeek(),games.map(g=>g.id).join(','),u.off.filter(id=>games.some(g=>g.id===id)).sort().join(','),PB_KINDS.map(([k])=>u.k[k]?1:0).join(''),pbDataSig()].join('|');
  let r=PB_CACHE.get(sig);''', '''/* everything the panel's choices stand on: the week, the games to come, those unticked, the boxes, the data */
function pbSig(){ const u=pbUi(), games=pbGames();
  return [currentWeek(),games.map(g=>g.id).join(','),u.off.filter(id=>games.some(g=>g.id===id)).sort().join(','),PB_KINDS.map(([k])=>u.k[k]?1:0).join(''),pbDataSig()].join('|'); }
function getPbTiers(){
  const sig=pbSig();
  let r=PB_CACHE.get(sig);''')

sub1(P, '''function pbPays(){ const el=$('pbPanel'); if(el) el.querySelectorAll('[data-pb-pay]').forEach(x=>{ x.innerHTML=pbPayHtml(+x.dataset.pbPay); }); }''',
'''function pbPays(){ document.querySelectorAll('#pbPanel [data-pb-pay], #spPanel [data-pb-pay]').forEach(x=>{ x.innerHTML=pbPayHtml(+x.dataset.pbPay); }); }''')

between(P, '/* a turned level (v, the visitor\'s view of it) is chosen from the legs the card has not shown', 'function pbThinLine(legs,form){', r'''/* what a level was chosen by, as its card says it */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  return t.likeliest?`the likeliest ${n} legs`:t.floor?`best return that lands ${pct}%+ by the model`:'the likeliest pair';
}
''')

between(P, "/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard) */",
        '/* exactly these legs into the builder, in its own order, so it prices them as the tier did */', r'''/* (app v111) one leg's own Add: that leg alone into the builder, by toggleLeg's own path (the builder prices it
   as it always has), Added while it is in, a second press taking it off as on a game's page. One delegated
   listener answers it (pbLegClick), on the Parlay Builder's list and on Suggest Parlays alike */
function pbLegAddBtn(l){
  const on=suggestLegOn(l);
  return `<button type="button" class="btn quiet pb-legadd${on?' on':''}" data-pb-leg="${esc(l.key)}" data-k="${esc(l.k)}" data-side="${esc(l.side)}" data-main="${l.main?1:0}" aria-pressed="${on}" aria-label="${on?'Remove':'Add'} ${esc(l.name)}, ${esc(l.label)}, ${on?'from':'to'} the builder">${on?'Added':'Add'}</button>`;
}
/* a locked level the page or the job built again for a player ruled out after the lock */
function spUpdLine(u){
  const at=Date.parse(u.at);
  return `Updated: ${esc(u.name)} ${esc(u.reason||'ruled out')}${isFinite(at)?` (${spEt(at,true)})`:''}, so this level was built again from the lines at hand${u.by==='page'?'. This page made the change, from the latest published report, and keeps it in this browser; the record grades the site’s locked set, which the props job updates the same way only if it runs again before kickoff':''}.`;
}
/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard). o.fid: the
   id its Finish names (a Suggest Parlays level's game:level); o.what: the game, for the buttons' names;
   o.legAdd false: no Add on each leg */
function pbTierCard(t,o){
  o=o||{}; const card=!!window.PARLAY_CARD, chance=o.chance!=null?o.chance:t.corr, legAdd=o.legAdd!==false;
  const upd=t.updated?`<p class="pb-thin sp-upd" data-sp-upd="${esc(t.updated.pid)}">${spUpdLine(t.updated)}</p>`:'';
  if(t.why) return `<div class="pb-tier ${t.id} none"><div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.n} legs</span></div><p class="pb-why">${esc(t.why)}</p>${upd}</div>`;
  const form=formSig()!=='', fm={}, nE=t.legs.filter(l=>l.src==='dkline').length, nm=o.what?` the ${esc(t.label)} parlay for ${esc(o.what)}`:'';
  return `<div class="pb-tier ${t.id}" data-pb-tier="${t.id}">
    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.rule||(t.floor!=null?`<span class="pb-rule">${pbRuleOf(t)}</span>`:'')}</div>
    <div class="pb-nums">${pbChanceHtml(t.fair,chance,o)}<div><b>${fmtML(decToML(t.dec))}</b><span>${nE?'price, est.':'price'}</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>
    <ul class="pb-legs">${t.legs.map(l=>{ const ff=legFarOff(l,fm); return `<li><span class="nm">${o.badge?o.badge(l):''}${esc(l.name)}<small>${esc(l.label)}${l.market?' <i class="pb-thinmark">no edge</i>':(l.thin?' <i class="pb-thinmark">thin edge</i>':'')}</small>${ff?`<small class="faroff" data-pb-far>${farText(l.p,ff)}</small>`:''}</span><span class="pr">${fmtML(l.price)}${l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:''}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span>${legAdd?pbLegAddBtn(l):''}</li>`; }).join('')}</ul>
    ${t.thin?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt?`<p class="pb-thin">${pbMktLine(t.legs,o.mktWhy)}</p>`:''}${nE?`<p class="pb-thin pb-espnline">${pbEspnLine(t.legs)}</p>`:''}${upd}
    <div class="pb-acts"><button type="button" class="btn ${card?'quiet':'go'}" ${o.add||`data-pb-add="${t.id}"`}${nm?` aria-label="${pbInBuilder(t.legs)?'In the builder:':'Add'}${nm}${pbInBuilder(t.legs)?'':' to the builder'}"`:''}>${pbInBuilder(t.legs)?'In the builder':'Add to builder'}</button>${card?`<button type="button" class="btn go" data-pc-finish="${o.kind||'pb'}|${o.fid||t.id}"${nm?` aria-label="Finish${nm}"`:''}>Finish</button>`:''}</div></div>`;
}
window.pbTierCard=pbTierCard;
/* ---------- the Parlay Builder's Top 100 lines (app v111) ----------
   Every leg on the reader's ticks that qualifies as a suggestion's leg does (pbLegs: a real price, or a
   tested DraftKings line read by Refresh odds on a payload baked before ids; DraftKings' id at its line
   where the payload carries ids; the 45-97% band at or above the book's implied chance, preferred with the
   3-point edge and market + form, thin without; the far-off guard; V6, in pricedLegs; and, with Game total
   ticked, both sides of each ticked game's total at the book's own chance), in two groups: every preferred
   leg and every total first, then every thin-edge leg (one that missed the 3-point edge or market + form,
   which a level takes only as fill), each group ranked by what $1 on it is expected to make at the model's
   chance (chance times the decimal price, less the $1), best first, at most PB_TOP_N in all, so a thin edge
   never ranks over a line with an edge however much it pays. Each row keeps what $1 wins if it lands (the decimal price less 1) and the book's fair chance
   (legFair) where there is one. Cached on the levels' own signature (pbSig), so ticking back is instant,
   and a press (ESPN_SEQ is in pbDataSig, and espnRedraw drops the cache) or a kickoff rebuilds it. */
const PB_TOP_N=100;
let PB_TOP_CACHE=new Map();
function pbTopBuild(){
  const u=pbUi(), all=pbGames(), games=all.filter(g=>!u.off.includes(g.id)), kinds=PB_KINDS.map(([k])=>k).filter(k=>u.k[k]);
  const out={games:all.length,ticked:games.length,kinds:kinds.length,rows:[],pref:0,thin:0,mkt:0,far:0,farDk:0,noId:0,noIdPl:0,moved:0,movedPl:0,plNoId:0,noPlayerPrices:false,espnRead:false};
  if(!all.length||!kinds.length||!games.length) return out;
  const r=pbLegs(games,u), fm={};
  out.pref=r.pref.length; out.thin=r.thin.length; out.mkt=r.mkt.length; out.far=r.far; out.farDk=r.farDk||0;
  out.noId=r.noId||0; out.noIdPl=r.noIdPl||0; out.moved=r.moved||0; out.movedPl=r.movedPl||0; out.plNoId=r.plNoId||0;
  out.noPlayerPrices=!!(u.k.over||u.k.under)&&!r.plGames;
  out.espnRead=games.some(g=>ESPN_OUT[g.id]&&(ESPN_OUT[g.id].st==='ok'||ESPN_OUT[g.id].st==='none'));
  const rank=list=>list.map(l=>{ const dec=mlToDec(l.price); return dec>1?{...l,dec,win:dec-1,ev:l.p*dec-1,fc:legFair(l,fm)}:null; })
    .filter(Boolean).sort((a,b)=>(b.ev-a.ev)||pbOrd(a,b));
  out.rows=[...rank([...r.pref,...r.mkt]),...rank(r.thin)].slice(0,PB_TOP_N);
  return out;
}
function getPbTop(){
  const sig=pbSig();
  let r=PB_TOP_CACHE.get(sig);
  if(!r){ r={sig,...pbTopBuild()}; PB_TOP_CACHE.set(sig,r); if(PB_TOP_CACHE.size>24) PB_TOP_CACHE.delete(PB_TOP_CACHE.keys().next().value); }
  return r;
}
window.getPbTop=getPbTop;
/* why the list is empty, in the reader's terms */
function pbTopWhy(r,u){
  if(!r.kinds) return 'No bet types ticked: tick at least one above.';
  if(!r.ticked) return 'No games ticked: tick at least one above.';
  if((u.k.over||u.k.under)&&r.noPlayerPrices){ const np=r.plNoId?PB_NO_ID:(r.espnRead?pbNoPl():PB_NO_PL);
    return (u.k.ml||u.k.ats||u.k.total)?`No line on your picks qualifies yet, and ${np}`:np[0].toUpperCase()+np.slice(1); }
  return `No line on your picks qualifies yet${r.noId?' that DraftKings’ betslip can take':''}: tick more games or bet types.`;
}
const pbMoney1=v=>(v<-0.0005?'−':'+')+'$'+Math.abs(v).toFixed(2);
function pbTopRow(l,i){
  const g=(S.sched||[]).find(x=>x.id===l.gid), pc=v=>(v*100).toFixed(0)+'%';
  const est=l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:'';
  const mark=l.market?' <i class="pb-thinmark">no edge</i>':(l.thin?' <i class="pb-thinmark">thin edge</i>':'');
  return `<li class="pb-trow" data-pb-row="${i+1}" data-pb-grp="${l.thin?'thin':'edge'}"><span class="pb-trk">${i+1}</span>
    <span class="nm">${esc(l.name)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}</span>
    <span class="pb-tcs"><span class="pb-tc"><b>${fmtML(l.price)}${est}</b><small>price</small></span><span class="pb-tc"><b data-pb-model="${l.p}">${pc(l.p)}</b><small>model</small></span><span class="pb-tc"><b${l.fc?` data-pb-fair="${l.fc.p}"`:''}>${l.fc?pc(l.fc.p):'–'}</b><small>${l.fc?(l.fc.est?'fair, est.':'fair'):'no fair'}</small></span><span class="pb-tc"><b data-pb-win="${l.win}">${pbMoney1(l.win)}</b><small>wins on $1</small></span><span class="pb-tc"><b data-pb-ev="${l.ev}">${pbMoney1(l.ev)}</b><small>expected on $1</small></span></span>
    ${pbLegAddBtn(l)}</li>`;
}
function pbPanel(){
  const u=pbUi(), w=currentWeek(), games=pbGames(), mix=pbMix(u);
  const head=`<div class="pb-hd"><h2>Top 100 lines</h2><span class="pill">week ${w}</span></div>`;
  if(!games.length) return `<div class="card pb" id="pbCard">${head}
    <p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no game is left to build a parlay from.`:`Every week ${w} game has kicked off, so there is nothing left to build from. Week ${w+1} opens once they are final.`}</p></div>`;
  const r=getPbTop(), nOn=games.filter(g=>!u.off.includes(g.id)).length, open=u.gx!=null?u.gx:pbWide(), form=formSig()!=='';
  const seg=`<span class="pb-seg" role="group" aria-label="What to build from">${PB_MIXES.map(([k,l])=>`<button type="button" class="${mix===k?'on':''}" data-pb-mix="${k}" aria-pressed="${mix===k}">${l}</button>`).join('')}</span>`;
  const chips=PB_KINDS.map(([k,l,s])=>`<label class="pb-chip${u.k[k]?' on':''}"><input type="checkbox" data-pb-kind="${k}" ${u.k[k]?'checked':''}><span>${l}${s?` <small>${s}</small>`:''}</span></label>`).join('');
  const glist=games.map(g=>{ const on=!u.off.includes(g.id), d=fmtDate(g);
    return `<label class="pb-g${on?' on':''}"><input type="checkbox" data-pb-game="${g.id}" ${on?'checked':''} aria-label="${esc(g.a)} at ${esc(g.h)}, ${esc(d.day)} ${esc(d.t)}"><span><b>${esc(g.a)} @ ${esc(g.h)}</b><small>${esc(d.day)}${d.t?' · '+esc(d.t):''}</small></span></label>`; }).join('');
  const dkLegs=r.rows.filter(l=>l.src==='dkline'), espnW=espnOn(w);
  const notes=[];
  if(formSig()==='noform') notes.push('The Elo ratings are still loading: player lines join once they are in.');
  if(dkLegs.length) notes.push(`A player line marked est. is priced from DraftKings’ line read on ESPN by Refresh odds, where DraftKings’ own price is not on file or its line has moved since: ${esc(espnReadLine(dkLegs.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0]||null))} The line is DraftKings’, the price our estimate of DraftKings’ (${ESPN_ERR} on weeks it was not fitted on), and it counts here as a book price does.`);
  if(u.k.total) notes.push('Game totals have no edge: each is priced at the book’s own chance, so what $1 on it is expected to make is below nothing, and it ranks after every line with an edge and before every thin-edge line, marked no edge.');
  /* (app v109) player legs priced and none with a DraftKings id: the list has none of them, and why */
  const noIdNote=r.noPlayerPrices&&r.plNoId&&r.rows.length;
  if(noIdNote) notes.push(`No player line on your picks can go on DraftKings’ betslip yet, so the list below has no player lines: ${PB_NO_ID.replace(/^no player legs DraftKings’ betslip can take yet: /,'')}`);
  else if(r.noPlayerPrices&&r.rows.length) notes.push(r.espnRead?`No player lines are in yet for your picks, so the list below has none: ${pbNoPl().replace(/^no player lines yet: /,'')}`:'Player prices are not in yet for your picks, so the list below has no player lines: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).');
  if(r.far) notes.push(`${r.far} line${r.far===1?' is':'s are'} left out: the model rates ${r.far===1?'it':'each'} ${Math.round(FAR_OFF*100)} points or more above the book’s fair chance (DraftKings’ prices with the margin taken out${r.farDk?`, or for ${r.farDk===r.far?(r.far===1?'it, priced':'each, priced'):(r.farDk===1?'the one':'the '+r.farDk)} from DraftKings’ line read by Refresh odds and marked est., our estimate of it`:''}), and its edges that large have not held up this season. ${r.far===1?'It is':'They are'} still on the game pages, flagged far off the market.`);
  /* lines left out for want of a DraftKings id at their line, beyond what the note above says */
  const mvN=r.moved-(noIdNote?r.movedPl:0), noneN=r.noId-r.moved-(noIdNote?r.noIdPl-r.movedPl:0), nonePl=noIdNote?0:r.noIdPl-r.movedPl, mvTeam=r.moved-r.movedPl;
  if(noneN) notes.push(`${noneN} line${noneN===1?' is':'s are'} left out: the list takes only lines DraftKings’ betslip can take, by DraftKings’ own id at the line, and DraftKings has none for ${noneN===1?'it':'them'} yet${nonePl?`. A player’s line read by Refresh odds carries no id (ESPN gives none for it); DraftKings’ own player ids come with its prices, which are ${PB_PULLED}`:''}. ${noneN===1?'It is':'They are'} still on the game pages, where you can add ${noneN===1?'it':'them'} to the builder.`);
  if(mvN) notes.push(`${mvN} line${mvN===1?' is':'s are'} left out: DraftKings had ${mvN===1?'it':'them'} only at another number when its lines were last read, and the list takes only lines DraftKings’ betslip can take at their own number${mvTeam?'. Refresh odds reads DraftKings’ current spreads and totals, which the list can take':''}. Added to the builder from the game pages, ${mvN===1?'it goes':'each goes'} on DraftKings’ slip at DraftKings’ number.`);
  const list=r.rows.length?`<ol class="pb-top" aria-label="The ${r.rows.length} best lines on your picks, those with an edge first, each group by expected profit on $1">${r.rows.map(pbTopRow).join('')}</ol>`
    :`<p class="pb-none pb-top-none">${esc(pbTopWhy(r,u))}</p>`;
  return `<div class="card pb" id="pbCard">${head}
    <p class="muted pb-lead">Choose what to build from: the list below takes only the bet types and games ticked here, every line that qualifies as a suggested leg does: first the lines with an edge${u.k.total?' and the game totals':''}, then the lines with only a thin edge, marked thin edge, each group ranked by what $1 on it is expected to make at the model’s chance, best first, 100 lines at most. Add any of them to the builder below.</p>
    <div class="pb-ctl">
      <div class="pb-row pb-amt-row"><label class="pb-lbl" for="pbStake">Bet amount</label><span class="pb-amt"><span aria-hidden="true">$</span><input type="number" id="pbStake" inputmode="decimal" min="${STAKE_MIN}" max="${STAKE_MAX}" step="1" value="${stakeText(pbStake())}" autocomplete="off" aria-describedby="pbStakeHint"></span><span class="pb-amt-hint" id="pbStakeHint">The builder below uses this amount, and every parlay on Suggest Parlays pays on it.</span></div>
      <div class="pb-row pb-odds-row"><span class="pb-lbl">Odds</span>${espnCtl(null,'pb')}</div>
      <div class="pb-row"><span class="pb-lbl">Build from</span>${seg}</div>
      <div class="pb-row"><span class="pb-lbl">Bet types</span><div class="pb-chips">${chips}</div></div>
      <details class="pb-games"${open?' open':''}><summary><span class="pb-lbl">Games</span><b>${nOn===games.length?`All ${games.length}`:`${nOn} of ${games.length}`}</b><span class="pb-sum-hint">tap to choose</span></summary>
        <div class="pb-gbar"><button type="button" class="btn quiet small" data-pb-games="all">All</button><button type="button" class="btn quiet small" data-pb-games="none">None</button><span class="muted">Kickoffs in your time zone; a game leaves the list when it kicks off.</span></div>
        <div class="pb-glist">${glist}</div></details>
    </div>
    ${notes.map(t=>`<p class="pb-note">${t}</p>`).join('')}
    ${list}
    <p class="muted pb-foot">Every line has a real sportsbook price${espnW?' (or, marked est., DraftKings’ line read by Refresh odds at our estimate of its price, on main lines, touchdowns and yards ladders, the markets the estimate has been checked on)':''} and a model chance between 45% and 97%, at or above the chance that price implies: 3 points above it is an edge${form?' (on a player’s line, with market + form, the book’s chance moved by his Elo, 3 points above it too)':''}, less is a thin edge, and a game total, priced at the book’s own chance, has none and is marked no edge. The lines with an edge come first, then any game totals, then the thin-edge lines, marked thin edge (the ones a suggested parlay takes only where the lines with an edge cannot fill it), each group ranked by what $1 on it is expected to make, 100 lines at most in all. Wins on $1 is what $1 wins if the line lands; expected on $1 is the model’s chance times what $1 returns, less the $1, so it is only as good as the model’s chance, which has run higher than the book’s this season. Each line gives the book’s fair chance beside the model’s, DraftKings’ prices with the margin taken out (est. where it is priced on one side only), and a line the model rates ${Math.round(FAR_OFF*100)} points or more above it is left out.</p></div>`;
}
function renderPb(){
  const el=$('pbPanel'); if(!el||!S||!S.sched) return;
  el.innerHTML=pbPanel(); wirePb();
  PB_SHOWN=pbGames().map(g=>g.id).join();
  /* Suggest Parlays is drawn with it, so the ELO tab's wrap of renderPb (its Elo picks, in #pbElo at the
     tab's foot) still draws last */
  renderSp();
}
/* ---------- Suggest Parlays (#suggest, app v111): each prime-time game's own four parlays ----------
   A game of the week still to come that kicks off on a Thursday, Sunday or Monday at or after 7:00 pm US
   Eastern (spPrime; g.d and g.t are Eastern): Thursday, Sunday and Monday night football, both games of a
   Monday doubleheader, Thanksgiving's and Christmas's night games; never a day game and never a Saturday. Its
   set is the panel's four levels on that game's lines alone and every bet type (SP_ALL, whatever the Parlay
   Builder's boxes say, so the page and the record agree), searched wider than the panel (SP_SEARCH), every
   leg's rule kept (pbPool, pricedLegs). Live until 2 hours before kickoff (spLockAt), then the site's locked
   set from the record, or the page's own kept in the browser where the record has none (spShown). */
const SP_LOCK_H=2, SP_LOCK_MS=SP_LOCK_H*3600e3;
const SP_ALL={k:Object.fromEntries(PB_KINDS.map(([k])=>[k,true])),off:[],gx:null};
/* one game's lists are short (some 20 to 60 legs once its player prices are in), so a set is searched far
   harder than the panel's: every list to 60 legs, a beam of 200 by return and by chance and 400 for the
   likeliest (the panel's 12 and 24), its best 4 and 10 worked by the real sums (the panel's 3 and 8). The
   beam costs little; the real sums' draws are most of the second or so a priced game takes (week 5's Bills
   at Rams, 26 legs: 1.1 s in jsdom, 1.0 s at the panel's widths, the same four parlays). The props job pays
   it once a game a run; the page only while the tab is on the screen (renderSp) */
const SP_SEARCH={cap:60,beam:200,wide:400,likely:4,final:10};
const SP_NIGHT={4:'Thursday night',0:'Sunday night',1:'Monday night'};
let SP_CACHE=new Map(), SP_SHOWN=null;
function spDow(g){ return g&&g.d?new Date(g.d+'T12:00:00Z').getUTCDay():null; }
function spPrime(g){ const d=spDow(g); return d!=null&&SP_NIGHT[d]!=null&&typeof g.t==='string'&&/^\d\d:\d\d$/.test(g.t)&&g.t>='19:00'; }
/* the week's prime-time games still to kick off (and with no score), in kickoff order */
function spGames(){ return pbGames().filter(spPrime); }
function spLockAt(g){ const k=kickoff(g); return k?k.getTime()-SP_LOCK_MS:null; }
const spIso=ms=>new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');
/* a time in US Eastern, as the schedule is ("Sun 6:20 PM ET") */
function spEt(ms,day){ try{ return new Date(ms).toLocaleString('en-US',{timeZone:'America/New_York',...(day?{weekday:'short'}:{}),hour:'numeric',minute:'2-digit'})+' ET'; }catch(e){ return spIso(ms).slice(11,16)+' UTC'; } }
/* when a prime-time game's player prices (and DraftKings' ids with them) are pulled: Thursday's and
   Monday's on the day, Sunday night's on Saturday morning (props.yml's pulls) */
function spPulled(g){ const d=spDow(g); return d===4?'on Thursday, the day of the game':d===1?'on Monday, the day of the game':d===0?'on Saturday morning':PB_PULLED; }
/* why a level of one game has no parlay: the game does not make that many legs, and why */
function spWhy(n,pool,g){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]);
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in this game${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in this game`;
  if(!pool.plGames){
    const read=ESPN_OUT[g.id]&&(ESPN_OUT[g.id].st==='ok'||ESPN_OUT[g.id].st==='none');
    const np=pool.plNoId?`no player leg DraftKings’ betslip can take yet: a player’s line read by Refresh odds carries no DraftKings id, and DraftKings’ own come with its player prices, which for this game are pulled ${spPulled(g)}.`
      :read?`no player lines yet: DraftKings had posted none for it when Refresh odds last read it, and its own player prices are pulled ${spPulled(g)}.`
      :`no player prices yet: they are pulled ${spPulled(g)}.`;
    return `${what}, and ${np}`; }
  return `${what}: a parlay takes one leg a player, and one side and one total a game.`;
}
function spBuild(g){
  const pool=pbPool([g],SP_ALL,SP_SEARCH), memo=new Map();
  const tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; });
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0};
}
/* a game's live set, the same for the same data (the searches are seeded), from the cache when nothing it
   stands on has moved: the game's kickoff and pbDataSig (the publish, the Elo files, ESPN_SEQ) */
const spSig=g=>[g.id,g.d||'',g.t||'',pbDataSig()].join('|');
function spSet(gid){
  const g=(S.sched||[]).find(x=>x.id===gid); if(!g) return null;
  const sig=spSig(g);
  let r=SP_CACHE.get(sig);
  if(!r){ r={sig,...spBuild(g)}; SP_CACHE.set(sig,r); if(SP_CACHE.size>24) SP_CACHE.delete(SP_CACHE.keys().next().value); }
  return r;
}
/* one level of a game built again now, from the lines at hand (a locked level holding a player ruled out) */
function spRebuild(gid,id){
  const g=(S.sched||[]).find(x=>x.id===gid), t=PB_TIERS.find(s=>s[0]===id); if(!g||!t) return null;
  const pool=pbPool([g],SP_ALL,SP_SEARCH), r=pbTier(t,pool,new Map(),SP_SEARCH);
  return r?{id:t[0],label:t[1],n:t[2],floor:t[3],...r}:{id:t[0],label:t[1],n:t[2],floor:t[3],why:spWhy(t[2],pool,g)};
}
/* a player the page's own rules keep out of every suggestion (suggestable: Out or Doubtful on the latest
   report, inactive, held out until cleared, questionable): why, in a few words; null when he plays */
function spOutWhy(pid){
  if(suggestable(pid)) return null;
  if(S.inactive&&S.inactive[pid]) return inactiveWhy(S.inactive[pid]);
  const t=INJ[pid]; return t&&t.k==='q'?'listed questionable, so held out':(t&&t.k==='dnp'?'did not practise, so held out':'held out');
}
/* a level as the record and the browser keep it (the shape suggest_ledger.js writes), and back. A leg
   kept is {gid, week, pid, team, grp, stat, k, side, main, price, src, name, label, p, fair, fair_est, thin,
   market}; a level {id, label, n, floor, legs, p, fair, fair_est, dec, likeliest, thin, mkt} or {id, label,
   n, floor, why}, a level built again carrying `updated` */
const spR=(v,d)=>v==null||!isFinite(v)?null:Math.round(v*d)/d;
function spLegOut(l,memo){ const f=legFair(l,memo);
  return {gid:l.gid,week:l.week,pid:l.pid,team:l.team,grp:l.grp,stat:l.stat,k:l.k,side:l.side,main:!!l.main,price:l.price,src:l.src,name:l.name,label:l.label,
    p:spR(l.p,1e4),fair:f?spR(f.p,1e4):null,fair_est:!!(f&&f.est),thin:!!l.thin,market:!!l.market}; }
function spTierOut(t){ const memo={};
  if(!t||!t.legs) return {id:t.id,label:t.label,n:t.n,floor:t.floor,why:t.why};
  return {id:t.id,label:t.label,n:t.n,floor:t.floor,legs:t.legs.map(l=>spLegOut(l,memo)),p:spR(t.corr,1e4),fair:t.fair&&t.fair.p!=null?spR(t.fair.p,1e4):null,
    fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:t.thin||0,mkt:t.mkt||0,...(t.updated?{updated:t.updated}:{})}; }
function spLegIn(l,g){
  if(!l||typeof l!=='object'||l.gid!==g.id||typeof l.pid!=='string'||typeof l.stat!=='string') return null;
  const p=+l.p, price=+l.price; if(!(p>0&&p<1)||!isFinite(price)||price===0) return null;
  const tot=l.stat==='total', team=String(l.team||''), pl=S.players&&S.players[l.pid];
  return {key:legKey(l.gid,l.pid,l.stat),gid:l.gid,pid:l.pid,stat:l.stat,k:+l.k,side:l.side==='under'?'under':'over',main:!!l.main,p,price,src:typeof l.src==='string'?l.src:'real',
    mu:tot?g.tot:null,name:String(l.name||''),pos:l.grp==='TEAM'?'Game':((pl&&pl.pos)||String(l.grp||'')),grp:String(l.grp||''),team,opp:tot?g.h:(team===g.h?g.a:g.h),
    week:+l.week||+g.w,label:String(l.label||''),thin:!!l.thin,...(l.market?{market:true}:{})};
}
const SP_IN=new Map();
function spTierIn(t,g){
  const spec=t&&PB_TIERS.find(s=>s[0]===t.id); if(!spec) return null;
  const head={id:spec[0],label:spec[1],n:spec[2],floor:spec[3]};
  const U=t.updated&&typeof t.updated==='object'?{updated:{pid:String(t.updated.pid||''),name:String(t.updated.name||''),reason:String(t.updated.reason||''),at:String(t.updated.at||''),...(t.updated.by==='page'?{by:'page'}:{})}}:{};
  if(!Array.isArray(t.legs)) return {...head,why:typeof t.why==='string'&&t.why?t.why:'No parlay of this size in this game.',...U};
  const legs=t.legs.map(l=>spLegIn(l,g)); if(legs.length!==spec[2]||legs.some(l=>!l)) return null;
  if(!(+t.dec>1)||!(+t.p>0&&+t.p<=1)) return null;
  /* the chance and price worked out again on the legs as kept (each its own chance and price), by the builder's
     own sums (parlayProb, parlayDec), so a locked level states what Add to builder and Finish then pay: the kept
     figures are rounded (4 places a chance, 3 a price), which on $37.50 moved a payout a cent off the builder's.
     The fair chance is the one kept, the book's at the lock, so a press after it moves nothing of the set. The
     record grades on its own kept figures; this is only how the page draws them. Cached on the kept level and
     the data (pbDataSig), since a locked set is read back on every draw */
  const L=pbOrder(legs), ck=[JSON.stringify(t),g.id,pbDataSig()].join('|'), was=SP_IN.get(ck);
  const sum=was||(()=>{ const pr=parlayProb(L); return {corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price})))}; })();
  if(!was){ SP_IN.set(ck,sum); if(SP_IN.size>64) SP_IN.delete(SP_IN.keys().next().value); }
  return {...head,legs:L,corr:sum.corr,indep:sum.indep,dec:sum.dec,fair:t.fair!=null&&isFinite(+t.fair)?{p:+t.fair,est:!!t.fair_est}:null,likeliest:!!t.likeliest,
    thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length,...U};
}
/* the site's locked set for a game: its entry in the record's prime map, of this season and the game's
   kickoff as it stands, taken before the lock (the job writes none after it), the last such key */
function spLedgerOf(g){
  const P=PB_REC&&pbIsMap(PB_REC.prime)?PB_REC.prime:null; if(!P) return null;
  const lock=spLockAt(g), kick=spIso(kickoff(g).getTime()); let e=null;
  for(const k of Object.keys(P).sort()){ const x=P[k];
    if(!pbIsMap(x)||x.gid!==g.id||+x.season!==SEASON||x.kickoff!==kick||!Array.isArray(x.tiers)) continue;
    if(x.taken_at!=null&&!(Date.parse(x.taken_at)<lock)) continue;
    e=x; }
  return e;
}
/* what this browser keeps of a locked game (props_sp_lock_v1, outside S and never sent anywhere): the set the
   page built where the record had none (own), and the levels the page built again for a player ruled out
   (rep), per game, under the game's kickoff; a game that has kicked off, or is off the schedule, is pruned on
   every write. Held in memory too (SP_KEEP), so a browser that keeps nothing still shows one set a load */
const SP_KEEP_KEY='props_sp_lock_v1';
let SP_KEEP=null;
function spKeep(){
  if(SP_KEEP) return SP_KEEP;
  SP_KEEP={};
  try{ const v=JSON.parse(localStorage.getItem(SP_KEEP_KEY)||'null');
    if(v&&v.v===1&&+v.season===SEASON&&pbIsMap(v.games)) for(const [id,x] of Object.entries(v.games)) if(pbIsMap(x)&&typeof x.kickoff==='string') SP_KEEP[id]=x; }catch(e){}
  return SP_KEEP;
}
function spKeepSave(){
  const now=Date.now(), out={};
  for(const [id,x] of Object.entries(SP_KEEP||{})){ const g=(S.sched||[]).find(y=>y.id===id), k=g&&kickoff(g);
    if(k&&x.kickoff===spIso(k.getTime())&&now<k.getTime()) out[id]=x; else delete SP_KEEP[id]; }
  try{ if(!Object.keys(out).length) localStorage.removeItem(SP_KEEP_KEY); else localStorage.setItem(SP_KEEP_KEY,JSON.stringify({v:1,season:SEASON,games:out})); }catch(e){}
}
/* a game's set as the tab shows it: live before the lock; from it, the site's locked set (the record's), or,
   with none, the page's own built once and kept; a locked level holding a player ruled out since built again,
   that level only (the record's own replacement where the job made one, else the page's, kept) */
function spShown(g){
  const lock=spLockAt(g), now=Date.now();
  if(lock==null||now<lock){ const s=spSet(g.id); return {phase:'live',lock,tiers:s?s.tiers:[]}; }
  if(!PB_REC_DONE) return {phase:'loading',lock,tiers:null};
  const K=spKeep(), kick=spIso(kickoff(g).getTime()); let k=K[g.id]&&K[g.id].kickoff===kick?K[g.id]:null, dirty=false;
  const e=spLedgerOf(g); let tiers=null, own=false, at=null;
  if(e){ const T=PB_TIERS.map(([id])=>spTierIn(e.tiers.find(t=>t&&t.id===id),g));
    if(T.every(Boolean)){ tiers=T; at=e.taken_at||null; if(k&&k.own){ k={kickoff:kick,rep:{}}; K[g.id]=k; dirty=true; } } }
  if(!tiers&&k&&k.own&&Array.isArray(k.tiers)){ const T=PB_TIERS.map(([id])=>spTierIn(k.tiers.find(t=>t&&t.id===id),g));
    if(T.every(Boolean)){ tiers=T; own=true; at=k.at||null; } }
  if(!tiers){ const s=spSet(g.id), out=s.tiers.map(spTierOut);
    tiers=PB_TIERS.map(([id],i)=>spTierIn(out.find(t=>t.id===id),g)||s.tiers[i]);
    k={kickoff:kick,own:true,at:spIso(now),tiers:out,rep:{}}; K[g.id]=k; dirty=true; own=true; at=k.at; }
  const rep=k&&pbIsMap(k.rep)?k.rep:{};
  tiers=tiers.map((t,i)=>{
    let cur=t, upd=null; const r=rep[t.id];
    /* the page's own replacement, unless the record has made one for the same player */
    if(r&&pbIsMap(r.tier)){ const T=spTierIn(r.tier,g);
      if(T&&!(t.updated&&t.updated.pid===r.pid)){ cur=T; upd={pid:String(r.pid),name:String(r.name||''),reason:String(r.reason||''),at:String(r.at||''),by:'page'}; }
      else { delete rep[t.id]; dirty=true; } }
    const out=cur.legs&&cur.legs.find(l=>!isGameLeg(l)&&spOutWhy(l.pid));
    if(out){ const why=spOutWhy(out.pid), nt=spRebuild(g.id,t.id), at2=spIso(now);
      rep[t.id]={pid:out.pid,name:out.name,reason:why,at:at2,tier:spTierOut(nt)}; dirty=true;
      cur=spTierIn(rep[t.id].tier,g)||nt; upd={pid:out.pid,name:out.name,reason:why,at:at2,by:'page'}; }
    return upd?{...cur,updated:upd}:cur;
  });
  if(dirty){ if(!k){ k={kickoff:kick,rep:{}}; K[g.id]=k; } k.rep=rep; spKeepSave(); }
  return {phase:'locked',lock,tiers,own,at,ledger:!!e};
}
/* a level by the id its Finish names (game id:level), as the tab shows it; the card reads it */
function spTier(fid){
  const s=String(fid||''), i=s.lastIndexOf(':'); if(i<0) return null;
  const g=spGames().find(x=>x.id===s.slice(0,i)); if(!g) return null;
  const v=spShown(g), t=v.tiers&&v.tiers.find(x=>x&&x.id===s.slice(i+1));
  return t&&t.legs?{...t,game:`${g.a} at ${g.h}`}:null;
}
/* what the tab stands on beyond the data: the games to come and which side of its lock each is */
function spState(){ const now=Date.now(); return spGames().map(g=>g.id+(now<spLockAt(g)?':l':':k')).join(); }
/* a set's kickoff in US Eastern, as its lock is said, so the two read on one clock wherever the visitor is
   (fmtDate gives the visitor's own: on Pacific time a Sunday night game read "5:20 PM PDT" over "Locks Sun
   6:20 PM ET", a lock that looked later than its kickoff) */
function spKickEt(g){ const k=kickoff(g); if(!k) return fmtDate(g);
  try{ return {day:k.toLocaleDateString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'}),t:k.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET'}; }
  catch(e){ return fmtDate(g); } }
function spGameHtml(g,on){
  const d=spKickEt(g), lk=spLockAt(g);
  /* a hidden tab draws a live set only once it is built: the tab builds it when it is opened */
  if(!on&&lk!=null&&Date.now()<lk&&!SP_CACHE.has(spSig(g))) return `<div class="sp-game" role="group" data-sp-game="${esc(g.id)}" aria-labelledby="spg-${esc(g.id)}">
    <div class="sp-hd"><h3 id="spg-${esc(g.id)}">${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}</h3><span class="pill">${SP_NIGHT[spDow(g)]}</span><small>${esc(d.day)}${d.t?' · '+esc(d.t):''}</small></div><p class="sp-lock" data-sp-phase="wait">Built when this tab is open.</p></div>`;
  const v=spShown(g), what=`${g.a} at ${g.h}`, lockT=v.lock!=null?spEt(v.lock,true):'';
  const mark='<span class="sp-lockmark">Locked</span>', when=v.at&&isFinite(Date.parse(v.at))?` (${spEt(Date.parse(v.at),true)})`:'';
  const line=v.phase==='live'?`<p class="sp-lock" data-sp-phase="live">Locks ${lockT}, 2 hours before kickoff; Refresh odds updates it until then.</p>`
    :v.phase==='loading'?`<p class="sp-lock" data-sp-phase="loading">${mark} since ${lockT}: reading the site’s locked set…</p>`
    :v.own?`<p class="sp-lock" data-sp-phase="own">${mark} since ${lockT}, 2 hours before kickoff. The site’s locked set for this game was not published when this page loaded, so this is the set as this browser built it${when}: it is kept in this browser to kickoff, and it is not the set the record grades. Refresh odds no longer changes it.</p>`
    :`<p class="sp-lock" data-sp-phase="locked">${mark} since ${lockT}, 2 hours before kickoff: the site’s set, the same for everyone and the one the record grades, as the props job last published it before the lock${when}. Refresh odds no longer changes it.</p>`;
  const cards=v.tiers?`<div class="pb-tiers">${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,mktWhy:'this game’s legs with an edge do not make a parlay of this size'})).join('')}</div>`:'';
  return `<div class="sp-game" role="group" data-sp-game="${esc(g.id)}" aria-labelledby="spg-${esc(g.id)}">
    <div class="sp-hd"><h3 id="spg-${esc(g.id)}">${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}</h3><span class="pill">${SP_NIGHT[spDow(g)]}</span><small>${esc(d.day)}${d.t?' · '+esc(d.t):''}</small></div>${line}${cards}</div>`;
}
function spHeadHtml(){
  const w=currentWeek();
  return `<div class="pb-hd"><h2>Suggest Parlays</h2><span class="pill">week ${w}</span></div>${spRecHtml()}
    <p class="muted pb-lead">Each Thursday, Sunday and Monday night game of the week gets four parlays of its own, every leg from that game: Safe, Medium, Aggressive and Extreme, 2 to 5 legs priced together as a book prices a same-game parlay. A set is live until 2 hours before its kickoff, when it locks: from then to kickoff everyone sees the set the site locked, and that is the one the record above grades. Add a whole parlay to the builder, or one leg at a time.</p>
    <div class="pb-row pb-odds-row sp-odds"><span class="pb-lbl">Odds</span>${espnCtl(null,'sp')}</div>`;
}
function spSetsHtml(on){
  const w=currentWeek(), G=spGames();
  if(!G.length) return `<p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no Thursday, Sunday or Monday night game is left.`:`No Thursday, Sunday or Monday night game of week ${w} is still to kick off. Week ${w+1}’s sets come once its games are the week’s.`}</p>`;
  return G.map(g=>spGameHtml(g,on)).join('')
    +`<p class="muted pb-foot">Each set is built from its game’s lines alone, on every bet type, whatever the Parlay Builder’s boxes say. Every leg has a real sportsbook price${espnOn(w)?' (or, on a payload with no DraftKings ids, DraftKings’ line read by Refresh odds at our estimate of its price, marked est.)':''} and a model chance between 45% and 97%, at least 3 points above the chance that price implies (a player leg also needs market + form 3 points above it); where those cannot make a level, the fewest legs the model still rates at or above the book fill it, marked thin edge, and a game total, the book’s own chance, only after them, marked no edge. Safe is the likeliest pair; Medium, Aggressive and Extreme are the 3-, 4- and 5-leg parlays with the best expected return that the model says land at least ${PB_TIERS.slice(1).map(t=>Math.round(t[3]*100)+'%').join(', ').replace(/, ([^,]*)$/,' and $1')} of the time, or, where none of that size gets there, the likeliest of that size. One leg a player, and one side (to win or to cover) and one total; where the payload carries DraftKings’ ids every leg is one DraftKings’ betslip can take, and none is on a player the report or the roster has out. Each level leads with the book’s fair chance, DraftKings’ prices with the margin taken out, the model’s beside it, and a leg the model rates ${Math.round(FAR_OFF*100)} points or more above the book’s fair chance is left out.</p>`;
}
function renderSp(){
  const el=$('spPanel'); if(!el||!S||!S.sched) return;
  /* the frame once: the Elo picks (#pbElo, the ELO tab's) keep their place at the foot while the rest redraws */
  if(!$('spSets')) el.innerHTML='<div class="card pb sp" id="spCard"><div id="spHead"></div><div id="spSets"></div><div id="pbElo" class="pb-elo"></div></div>';
  const tab=$('tab-suggest'), on=!tab||!tab.hidden;
  $('spHead').innerHTML=spHeadHtml(); $('spSets').innerHTML=spSetsHtml(on);
  SP_SHOWN=spState();
}
/* the tab opened: its sets built and drawn (the prop model's tab switch has shown the section by the time
   the click reaches the document) */
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('#tabs button[data-tab="suggest"]'):null;
  if(b&&typeof S==='object'&&S&&S.sched) try{ renderSp(); }catch(err){ console.error(err); } });
Object.assign(window,{spPrime,spGames,spLockAt,spSet,spRebuild,spOutWhy,spTierOut,spShown,spTier,renderSp});
''')

sub1(P, "    for(const l of L){ const {key,thin,pe,ev,imp,...x}=l;", "    for(const l of L){ const {key,thin,pe,ev,imp,updated,fc,dec,win,...x}=l;")

between(P, 'function wirePb(){', '/* one tap swaps the amount you are betting in the builder;', r'''function wirePb(){
  const el=$('pbPanel'); if(!el) return;
  const redraw=sel=>{ renderPb(); const f=sel&&$('pbPanel').querySelector(sel); try{ if(f) f.focus({preventScroll:true}); }catch(e){} };
  /* the amount: every payout follows it as it is typed and the builder a moment later; leaving
     the box (or Enter) settles it, a bad entry going back to the amount as it was */
  const amt=el.querySelector('#pbStake');
  if(amt){
    amt.addEventListener('input',()=>{ const v=stakeRead(amt.value); if(v==null) return;
      S.stake=v; save(); pbPays(); clearTimeout(PB_AMT_T); PB_AMT_T=setTimeout(pbSyncBuilder,250); });
    amt.addEventListener('change',()=>{ const v=stakeRead(amt.value); if(v!=null) S.stake=v;
      S.stake=pbStake(); amt.value=stakeText(S.stake); save(); pbPays(); clearTimeout(PB_AMT_T); pbSyncBuilder(); });
  }
  el.querySelectorAll('[data-pb-mix]').forEach(b=>b.addEventListener('click',()=>{ const u=pbUi(), m=PB_MIXES.find(x=>x[0]===b.dataset.pbMix); if(!m) return;
    for(const [k] of PB_KINDS) u.k[k]=m[2].includes(k); save(); redraw(`[data-pb-mix="${m[0]}"]`); }));
  el.querySelectorAll('[data-pb-kind]').forEach(cb=>cb.addEventListener('change',()=>{ const u=pbUi(); u.k[cb.dataset.pbKind]=cb.checked; save(); redraw(`[data-pb-kind="${cb.dataset.pbKind}"]`); }));
  el.querySelectorAll('[data-pb-game]').forEach(cb=>cb.addEventListener('change',()=>{ const u=pbUi(), id=cb.dataset.pbGame;
    u.off=u.off.filter(x=>x!==id); if(!cb.checked) u.off.push(id); save(); redraw(`[data-pb-game="${id}"]`); }));
  el.querySelectorAll('[data-pb-games]').forEach(b=>b.addEventListener('click',()=>{ const u=pbUi(), ids=pbGames().map(g=>g.id);
    u.off=b.dataset.pbGames==='none'?ids:u.off.filter(x=>!ids.includes(x)); save(); redraw(`[data-pb-games="${b.dataset.pbGames}"]`); }));
  const det=el.querySelector('details.pb-games');
  if(det) det.addEventListener('toggle',()=>{ const u=pbUi(); if(u.gx!==det.open){ u.gx=det.open; save(); } });
}
/* what is on the screen was drawn before a game kicked off or a set locked: it is not what the list and
   the sets are now (the card's Finish asks it too) */
function pbStale(){ try{ return (PB_SHOWN!=null&&pbGames().map(g=>g.id).join()!==PB_SHOWN)||(SP_SHOWN!=null&&spState()!==SP_SHOWN); }catch(e){ return false; } }
window.pbStale=pbStale;
/* a game that kicks off while the page is open leaves the list and its set, and a set that reaches its
   lock turns to the locked one: the page looks every half minute, and redraws the builder (which drops a
   started leg), the list and the sets */
function pbWatch(){
  if(pbWatch.on) return;
  pbWatch.on=setInterval(pbWatchTick,30000);
}
/* one look (the audit and the smoke call it on clocks of their own): the record read again where a set has
   reached its lock since it was last read, and a redraw where what is shown is stale */
function pbWatchTick(){ try{ if(!S||!S.sched||document.visibilityState==='hidden') return;
  if(PB_REC_DONE&&PB_REC_STATE!=null&&!pbRecLoad.busy){ const was=PB_REC_STATE.split(',');
    if(spState().split(',').some(x=>x.endsWith(':k')&&was.includes(x.slice(0,-2)+':l'))){ pbRecLoad.busy=true; pbRecLoad(true).finally(()=>{ pbRecLoad.busy=false; }); } }
  if(pbStale()) renderParlay(); }catch(e){} }
window.pbWatchTick=pbWatchTick;
/* a leg's own Add (pbLegAddBtn), on the list or a set: that leg into the builder or out of it, the focus
   kept on the same button once both are drawn again; a redraw first where what is shown is stale */
function pbLegClick(b,box){
  if(pbStale()){ renderParlay(); return; }
  const all=[...document.querySelectorAll(box+' [data-pb-leg]')], i=all.indexOf(b);
  const key=b.dataset.pbLeg, kk=b.dataset.k, side=b.dataset.side, main=b.dataset.main==='1';
  const g=(S.sched||[]).find(x=>x.id===key.split('|')[0]);
  /* a locked set's leg is the leg as it was locked: its own line, which toggleLeg (reading the line as it stands
     now) would move wherever a rebake or a press has moved it since. So it goes in as shown, as the set's Add
     to builder puts it (pbPut), or comes off where it is in; a live set's and the list's go by toggleLeg */
  const gEl=box==='#spPanel'?b.closest('[data-sp-game]'):null, tEl=gEl&&b.closest('[data-pb-tier]');
  const sg=gEl&&g&&spGames().find(x=>x.id===gEl.dataset.spGame), lk=sg&&spLockAt(sg);
  const lt=sg&&tEl&&lk!=null&&Date.now()>=lk?spTier(`${sg.id}:${tEl.dataset.pbTier}`):null;
  const sl=lt&&lt.legs.find(l=>l.key===key&&String(l.k)===kk&&l.side===side&&!!l.main===main);
  if(sl){
    if(!gameStarted(sg)){ if(suggestLegOn(sl)) delete S.parlay[key];
      else { const {key:_k,thin,pe,ev,imp,updated,fc,dec,win,...x}=sl; S.parlay[key]=isGameLeg(x)?espnGlTag(x):x; }
      save(); renderGame(); renderParlay(); } }
  else toggleLeg(key,+kk,g,side,main);
  const now=[...document.querySelectorAll(box+' [data-pb-leg]')], same=x=>x.dataset.pbLeg===key&&x.dataset.k===kk&&x.dataset.side===side;
  const f=(now[i]&&same(now[i]))?now[i]:now.find(same);
  try{ if(f) f.focus({preventScroll:true}); }catch(e){}
}
/* a set's Add to builder: exactly its legs into the builder, the focus kept on the button */
function spAddClick(b){
  if(pbStale()){ renderParlay(); return; }
  const fid=b.dataset.spAdd, t=spTier(fid); if(!t) return;
  pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay for ${t.game}`);
  const f=document.querySelector(`#spPanel [data-sp-add="${fid}"]`); try{ if(f) f.focus({preventScroll:true}); }catch(e){}
}
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest?e.target:null; if(!t) return;
  const leg=t.closest('[data-pb-leg]'), add=leg?null:t.closest('[data-sp-add]');
  if(leg){ const box=['#pbPanel','#spPanel'].find(s=>leg.closest(s)); if(!box||leg.disabled) return; e.preventDefault(); pbLegClick(leg,box); return; }
  if(add&&add.closest('#spPanel')&&!add.disabled){ e.preventDefault(); spAddClick(add); }
});
''')

sub1(P, '''    el.innerHTML=droppedNote+`<div class="card"><h2>Parlay Builder</h2>
      <p class="muted" style="margin:0 0 10px">Open a game, click a player, and tick any line you like, or add a suggested parlay above. Each leg lands here and gets priced.</p></div>`+renderSaved()+renderBetParlays();''',
'''    el.innerHTML=droppedNote+`<div class="card"><h2>Parlay Builder</h2>${espnCtl(null,'builder')}
      <p class="muted" style="margin:0 0 10px">Open a game, click a player, and tick any line you like, or add a parlay from Suggest Parlays or a line from the Top 100 above. Each leg lands here and gets priced.</p></div>`+renderSaved()+renderBetParlays();''')
sub1(P, '''  let html=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">${legs.length}-leg parlay <span class="pill">building</span></h2>
''', '''  let html=droppedNote+`<div class="card"><h2 style="display:flex;align-items:center;gap:10px">${legs.length}-leg parlay <span class="pill">building</span></h2>${espnCtl(null,'builder')}
''')
sub1(P, '''  /* the suggested parlays over the builder: its own box, drawn with it, unless only the amount
     moved (o.keepPb: the panel redraws its payouts in place, and its buttons stay put) */''',
'''  /* the Top 100 lines over the builder, and Suggest Parlays, drawn with it, unless only the amount moved
     (o.keepPb: the payouts are redrawn in place, and the buttons stay put) */''')
sub1(P, '''/* ---------- the Parlay Builder's suggested parlays: built from what the reader ticks ----------''',
'''/* (app v111) The four levels below were the Parlay Builder's panel over every game until 16 October 2026.
   The owner's calls of that day moved them: the same engine now builds each Thursday, Sunday and Monday
   night game's own set on Suggest Parlays (spSet, below), and the Parlay Builder shows the Top 100 lines on
   the reader's ticks (getPbTop). getPbTiers still builds the all-games levels, which nothing on the page
   draws; the audit and the smoke hold the engine through it.
   ---------- the Parlay Builder's suggested parlays: built from what the reader ticks ----------''')

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patch_suggest_tab.py: app v111 written to part1.html, part2.js and part3.js')
