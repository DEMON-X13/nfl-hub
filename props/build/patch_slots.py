r"""app v118: Suggested Parlays in two sections, Night games and the Sunday slot, each with its own record and its own
Elo picks; the record's weeks before it took them replayed from what the site had published.

The owner, Monday 19 October 2026: "i noticed that the elo picks section in the suggest parlays tab does not have a
record anymore and did not have any picks yesterday. any reason why? I would like it to have ELO picks for the slot of
Sunday games. also i noticed there is only records for this week, can we retroactively look back and find what we would
have suggested and count it to the record?", and then "if you can also backfill the records for the suggested parlays as
well. but maybe for that one do a separate section for night games and then the sunday slot of games".

Why the Elo picks were empty. They were one set over the week's games still to come, built from the games and player
sides ticked on the Parlay Builder tab (pbAllows), at the foot of Suggested Parlays. With the priced Sunday games unticked
there, no player qualified on the reader's picks, all day. And they never had a record: the sentence app v113 took off
their lead was the matchup nudge's record, not the picks'.

The tab is now two sections, each headed by its own record:

  Night games: each Thursday, Sunday and Monday night game, one night at a time, as before (spOn).
  Sunday slot: every Sunday game of the week kicking off before 7:00 pm Eastern (the 1pm and 4pm windows and a game
  abroad that morning), one set of the four levels across them (spSlotUnit, id <season>_<WW>_SUN), built as a night
  game's set is from the slot's lines, set out from 6:00 AM Eastern the morning after the night game before its Sunday
  (Friday's, after Thursday night's: spOpenAt, the night rule's own), locked 2 hours before its first kickoff, and shown
  to its last kickoff: from the first, under way, as it locked, with no Add or Finish (nothing of the page's own is
  built once it is under way, and no level built again for a player ruled out then).

Each unit, a night game or the slot, carries its model parlays and its Elo picks: the ELO tab's four levels on that
unit's games alone, whatever the Parlay Builder's ticks say (window.eloUnit), locked, kept in the browser, rebuilt for a
player ruled out after the lock and recorded with the model's, a level's id elo-<level> beside the model's in the same
entry. A unit's Add to builder and Finish name it (data-sp-add, data-pc-finish "sp|<unit>:<level>"), so the Elo picks'
own buttons (data-pb-elo-add, "elo|elo-<level>") and #pbElo are gone.

The record (spRecSum, spRecHtml): a section, a row for the model's parlays and one for the Elo picks, a pill a level,
from the props job's record (suggest_ledger.json: its prime map for the nights, a new slot map for the Sunday slot,
each entry's elo levels beside its tiers) and, for a unit it holds no levels of that kind for, from the backtest
(suggest_backtest.json, written once by suggest_backtest.js: every night game and Sunday slot of weeks 3 to 6 rebuilt
by today's rules on the files of the last commit before its lock, graded on the results, each entry marked src
'backtest'), with one chip saying which weeks the backtest gives and each pill's title how many of its own.
"""
import hashlib
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function spSlotUnit(' not in T['p3'], 'patch_slots.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


def block(k, start, end, sha, new, what):
    """the text from start to end (each exactly once), exactly as this patch was written against (its sha256), replaced"""
    t = T[k]
    assert t.count(start) == 1 and t.count(end) == 1, f'{what}: its first or last line is not there exactly once'
    i = t.index(start); j = t.index(end, i) + len(end)
    got = hashlib.sha256(t[i:j].encode('utf-8')).hexdigest()
    assert got == sha, f'{what}: the old text is not the one this patch was written against ({got[:16]})'
    T[k] = t[:i] + new + t[j:]


sub1('p2', "const APP_BUILD='app v117 \\u00b7 2026-10-18';", "const APP_BUILD='app v118 \\u00b7 2026-10-19';", 'APP_BUILD')

# the new record code (replacing the old, whose sha256 is RECORD_SHA)
RECORD_SHA = 'a9ce01cf3ced614c59234da0c7cfb7b21c4c7b2394726c4ff629d059930f5277'
RECORD = r"""/* ---------- the suggestions record (props/data/suggest_ledger.json, and its backtest beside it) ----------
   The props job's record (props/build/suggest_ledger.js). Since app v111 the page reads its `prime` map: each
   Thursday, Sunday and Monday night game's set on Suggested Parlays, as the job last published it before the
   game's lock (2 hours before kickoff), frozen there and graded after the game as a book settles it. Keyed
   season|WW|kickoff|game id, each entry {season, week, gid, away, home, kickoff, lock, baked_at, taken_at,
   pool, tiers, elo, grade, updates}; its tiers are the four levels in spTierOut's shape, a level the job built again
   for a player ruled out after the lock carrying `updated` {pid, name, reason, at}. Since app v118 an entry carries
   the unit's Elo picks too (`elo`, the four levels elo-safe to elo-xtrm, graded beside the model's in `grade`), and
   the `slot` map holds the Sunday slot's (spSlotUnit: every Sunday game before 7 pm Eastern, one set), keyed
   season|WW|first kickoff|<season>_<WW>_SUN, with its `games`. Its `entries` map, the all-games panel's record from
   12 October 2026, stays in the file, graded, and is drawn nowhere.
   suggest_backtest.json (app v118, the owner's call of 19 October 2026: "can we retroactively look back and find what
   we would have suggested and count it to the record?") is the same two maps for the weeks before the record took
   them, written once by props/build/suggest_backtest.js: every night game and Sunday slot of weeks 3 to 6 rebuilt by
   today's rules on exactly what the site had published at its lock (the files of the last commit before it), graded
   on the results, each entry marked src 'backtest' with the commit it was built from. The record counts a unit's
   level from the job's entry where there is one and from the backtest where there is not, and says how many it took
   from the backtest. Both read beside the payload with no-store once a load, kept outside S so they are never saved;
   a file that is not there, or with none of its maps an object, is no record (PB_REC, PB_BT null), and PB_REC_DONE
   says the read has answered either way, so a locked game waits for it before building a set of its own. */
let PB_REC=null, PB_REC_DONE=false, PB_BT=null;
const PB_REC_URL=DATA_URL.replace(/payload\.json$/,'suggest_ledger.json');
const PB_BT_URL=DATA_URL.replace(/payload\.json$/,'suggest_backtest.json');
const pbIsMap=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
/* PB_REC_STATE: which side of its lock each set was on when the record was last read (spState), so a set that
   reaches its lock with the page open has the record read again (pbWatch): the job may have rewritten or first
   taken the game's entry since the page loaded, and the locked set is the one it published last. Until that read
   answers the tab shows the record as this load read it; a read again that fails, or is not a record, keeps it.
   The backtest never changes once written, so it is read once a load */
let PB_REC_STATE=null;
async function pbRecLoad(again){
  const get=async u=>{ try{ const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'}); return r.ok?await r.json():null; }catch(e){ return null; } };
  const [L,B]=await Promise.all([get(PB_REC_URL),again?Promise.resolve(undefined):get(PB_BT_URL)]);
  const ok=pbIsMap(L)&&(pbIsMap(L.entries)||pbIsMap(L.prime)||pbIsMap(L.slot));
  if(ok||!again) PB_REC=ok?L:null;
  if(B!==undefined) PB_BT=pbIsMap(B)&&(pbIsMap(B.prime)||pbIsMap(B.slot))?B:null;
  PB_REC_DONE=true;
  /* a read that answers once the page has gone (a check that closed its window) draws nothing */
  if(typeof document==='undefined'||!document) return;
  try{ PB_REC_STATE=spState(); }catch(e){}
  try{ renderSp(); }catch(e){ console.error(e); }
}
window.pbRecLoad=pbRecLoad;
/* the two sections of Suggested Parlays (app v118, the owner's call of 19 October 2026: "do a separate section for
   night games and then the sunday slot of games"), each with its own map in the record, and the two kinds of level
   each unit has: the model's parlays (tiers) and the Elo picks (elo) */
const SP_SEC={night:{map:'prime',name:'Night games'},slot:{map:'slot',name:'Sunday slot'}};
const SP_KIND={model:{field:'tiers',pre:'',name:'Model parlays'},elo:{field:'elo',pre:'elo-',name:'Elo picks'}};
/* the record of one section's one kind, a level at a time: each season's unit and level once, the job's entry where
   it holds one (the last key that does: a kickoff the league moved makes a new key), else the backtest's, from the
   entries' own grades: won or lost (a push, every leg a push or a void, the stake back, is counted apart; a parlay a
   push shortened counts at what it was graded to pay), the wins expected by the book's fair chance and by the
   level's own chance (the model's, or the Elo's for an Elo pick: the chances the set showed), units on $1, and how
   many of them came from the backtest (bt) and from which weeks (L the record, B the backtest). A unit the job's record
   holds levels of this kind for is the record's whole (its levels as it took them, a level with no parlay or not yet
   graded included): the backtest counts only for a unit the record has none of, as week 6's Sunday night game's Elo
   picks, which the record took before app v118 gave it any */
function spRecSum(L,sec,kind,B){
  sec=SP_SEC[sec]?sec:'night'; kind=SP_KIND[kind]?kind:'model';
  const map=SP_SEC[sec].map, {field,pre}=SP_KIND[kind];
  const out=PB_TIERS.map(([id,label])=>({id:pre+id,label,graded:0,won:0,lost:0,push:0,fair:0,fairN:0,model:0,units:0,bt:0}));
  let pending=0; const last=new Map(), units=new Set(), wk=new Set(), mine=new Set();
  for(const e of Object.values(L&&pbIsMap(L[map])?L[map]:{})) if(pbIsMap(e)&&Array.isArray(e[field])) mine.add(e.season+'|'+e.gid);
  const take=(src,bt)=>{ const E=src&&pbIsMap(src[map])?src[map]:{};
    for(const k of Object.keys(E).sort()){ const e=E[k]; if(!pbIsMap(e)||!Array.isArray(e[field])||(bt&&mine.has(e.season+'|'+e.gid))) continue;
      for(const t of e[field]){ const g=e.grade&&e.grade[t&&t.id]; if(!g||!out.some(x=>t&&x.id===t.id)||!Array.isArray(t.legs)) continue;
        last.set([e.season,e.gid,t.id].join('|'),{t,g,bt,w:+e.week}); } } };
  /* the backtest first (a unit the record holds left out) and the job's record over it */
  take(B,true); take(L,false);
  for(const [id,{t,g,bt,w}] of last){ const s=out.find(x=>x.id===t.id); units.add(id.split('|').slice(0,2).join('|'));
    if(g.result==='pending'){ pending++; continue; }
    if(g.result!=='won'&&g.result!=='lost'&&g.result!=='push') continue;
    if(bt){ s.bt++; if(w) wk.add(w); }
    if(g.result==='push'){ s.push++; continue; }
    s.graded++; if(g.result==='won') s.won++; else s.lost++;
    s.model+=isFinite(+t.p)?+t.p:0; if(t.fair!=null&&isFinite(+t.fair)){ s.fair+=+t.fair; s.fairN++; }
    s.units+=(g.result==='won'&&isFinite(+g.payout)?+g.payout:0)-1; }
  return {tiers:out,pending,games:units.size,btWeeks:[...wk].sort((a,b)=>a-b)};
}
/* a section's record at its head: a row for the model's parlays and one for the Elo picks, a pill a level (won-lost,
   units on $1) and what is pending, as the ELO Ratings tab's record bar; where some of it is the backtest, one chip
   saying which weeks (each pill's title saying how many of its own). No record and no backtest, nothing (hidden) */
function spRecHtml(sec){
  if(!PB_REC&&!PB_BT) return `<div class="sp-rec" data-sp-recsec="${sec}" hidden></div>`;
  const un=v=>(v>0.0005?'+':v<-0.0005?'−':'')+Math.abs(v).toFixed(2), f1=v=>v.toFixed(1);
  const wk=new Set();
  const rows=Object.entries(SP_KIND).map(([kind,K])=>{ const R=spRecSum(PB_REC,sec,kind,PB_BT), any=R.tiers.some(s=>s.graded||s.push);
    R.btWeeks.forEach(w=>wk.add(w));
    const by=kind==='elo'?'the Elo chance':'the model';
    const pills=any?R.tiers.map(s=>`<span class="rec" data-sp-rec="${sec}:${s.id}" title="${esc(K.name)}, ${esc(s.label)}: ${s.graded} graded, ${s.won} won${s.graded?`; wins expected ${s.fairN?f1(s.fair)+' by the book’s fair chance'+(s.fairN<s.graded?' (on the '+s.fairN+' with one)':'')+', ':''}${f1(s.model)} by ${by}`:''}${s.push?`; ${s.push} push${s.push===1?'':'es'}, the stake back`:''}${s.bt?`; ${s.bt} of them from the backtest`:''}">${esc(s.label)} <b>${s.won}–${s.lost}</b> ${s.graded||s.push?un(s.units)+' units':''}</span>`).join('')
      :`<span class="rec" data-sp-rec="${sec}:${kind}:none">None graded yet</span>`;
    return `<div class="bar" data-sp-reckind="${kind}"><span class="sp-reck">${esc(K.name)}</span>${pills}${R.pending?`<span class="rec" data-sp-rec="${sec}:${kind}:pending">Pending <b>${R.pending}</b></span>`:''}</div>`; }).join('');
  const W=[...wk].sort((a,b)=>a-b);
  const bt=W.length?`<span class="rec sp-recbt" data-sp-rec="${sec}:bt" title="${W.length>1?'Weeks':'Week'} ${W.join(', ')} ${W.length>1?'were':'was'} played before the record took this section: rebuilt by today’s rules on exactly what the site had published at each lock, and graded on the results.">Incl. backtest, week${W.length>1?'s':''} ${W.length>1&&W[W.length-1]-W[0]===W.length-1?W[0]+'–'+W[W.length-1]:W.join(', ')}</span>`:'';
  return `<div class="sp-rec" data-sp-recsec="${sec}">${rows}${bt?`<div class="bar sp-recbtbar">${bt}</div>`:''}</div>`;
}
"""

# the new sets code (replacing the old, whose sha256 is SETS_SHA)
SETS_SHA = '1a929d57bb21f6bb95672de0b6d2617959f7bb5b3100758ec48871d5636e0bed'
SETS = r"""/* ---------- Suggested Parlays (#suggest, app v111): each prime-time game's own four parlays ----------
   A game of the week still to come that kicks off on a Thursday, Sunday or Monday at or after 7:00 pm US
   Eastern (spPrime; g.d and g.t are Eastern): Thursday, Sunday and Monday night football, both games of a
   Monday doubleheader, Thanksgiving's and Christmas's night games; never a day game and never a Saturday. Its
   set is the panel's four levels on that game's lines alone and every bet type (SP_ALL, whatever the Parlay
   Builder's boxes say, so the page and the record agree), searched wider than the panel (SP_SEARCH), every
   leg's rule kept (pbPool, pricedLegs). Live until 2 hours before kickoff (spLockAt), then the site's locked
   set from the record, or the page's own kept in the browser where the record has none (spShown).
   (app v118, the owner's calls of 19 October 2026: "I would like it to have ELO picks for the slot of Sunday games",
   and "do a separate section for night games and then the sunday slot of games".) The tab is two sections, Night
   games and the Sunday slot, each with its own record. The Sunday slot (spSlotUnit) is every Sunday game of a week
   that kicks off before 7:00 pm Eastern (the 1pm and 4pm windows, and a game abroad that morning), one set of the four
   levels across them, built as a night game's is from the slot's lines (SP_SLOT_SEARCH), locked 2 hours before its
   first kickoff and set out from 6:00 AM Eastern on the morning after the night game before it (Friday's, after
   Thursday night's), to its last kickoff: from its first kickoff its set is shown as it locked, under way, with no
   Add or Finish (its first games have started). A night game or the slot is a unit: a schedule game, or the slot's
   own object (id <season>_<WW>_SUN, d and t its first kickoff's, games). Every unit carries the Elo picks too, the
   ELO tab's four levels on that unit's games alone (window.eloUnit; until app v118 one set over the games and player
   sides ticked on the Parlay Builder tab, at the tab's foot, which a reader with the priced games unticked saw empty
   all of Sunday 18 October 2026), locked, kept, replaced and recorded with the model's. */
const SP_LOCK_H=2, SP_LOCK_MS=SP_LOCK_H*3600e3;
const SP_ALL={k:Object.fromEntries(PB_KINDS.map(([k])=>[k,true])),off:[],gx:null};
/* one game's lists are short (some 20 to 60 legs once its player prices are in), so a set is searched far
   harder than the panel's: every list to 60 legs, a beam of 200 by return and by chance and 400 for the
   likeliest (the panel's 12 and 24), its best 4 and 10 worked by the real sums (the panel's 3 and 8). The
   beam costs little; the real sums' draws are most of the second or so a priced game takes (week 5's Bills
   at Rams, 26 legs: 1.1 s in jsdom, 1.0 s at the panel's widths, the same four parlays). The props job pays
   it once a game a run; the page only while the tab is on the screen (renderSp) */
const SP_SEARCH={cap:60,beam:200,wide:400,likely:4,final:10};
/* the Sunday slot's lists run to some 200 legs across its eleven to thirteen games, cut to 60 each as a game's are,
   and searched as a game's are */
const SP_SLOT_SEARCH=SP_SEARCH;
const SP_NIGHT={4:'Thursday night',0:'Sunday night',1:'Monday night'};
let SP_CACHE=new Map(), SP_SHOWN=null;
function spDow(g){ return g&&g.d?new Date(g.d+'T12:00:00Z').getUTCDay():null; }
function spPrime(g){ const d=spDow(g); return d!=null&&SP_NIGHT[d]!=null&&typeof g.t==='string'&&/^\d\d:\d\d$/.test(g.t)&&g.t>='19:00'; }
/* the week's prime-time games still to kick off (and with no score), in kickoff order */
function spGames(){ return pbGames().filter(spPrime); }
/* (app v118) a week's Sunday slot: its Sunday games kicking off before 7:00 pm Eastern, in kickoff order (the
   schedule's on a tie); null where it has none */
const spSlotId=w=>`${SEASON}_${String(w).padStart(2,'0')}_SUN`;
function spSlotGames(w){ return (S.sched||[]).filter(g=>+g.w===+w&&spDow(g)===0&&typeof g.t==='string'&&/^\d\d:\d\d$/.test(g.t)&&g.t<'19:00'&&kickoff(g))
  .map((g,i)=>({g,i})).sort((a,b)=>(kickoff(a.g)-kickoff(b.g))||(a.i-b.i)).map(x=>x.g); }
function spSlotUnit(w){ const G=spSlotGames(w); if(!G.length) return null; const f=G[0];
  return {id:spSlotId(w),slot:true,w:+f.w,d:f.d,t:f.t,games:G,last:Math.max(...G.map(g=>kickoff(g).getTime()))}; }
/* a unit by its id: the Sunday slot's (of this season), or a game of the schedule; the games it stands on */
function spUnit(id){ id=String(id||''); const m=/^(\d{4})_(\d\d)_SUN$/.exec(id); if(m) return +m[1]===SEASON?spSlotUnit(+m[2]):null;
  return (S.sched||[]).find(g=>g.id===id)||null; }
const spGamesOf=u=>u?(u.slot?u.games:[u]):[];
const spUnitName=u=>u.slot?`week ${u.w}’s Sunday slot`:`${u.a} at ${u.h}`;
function spLockAt(g){ const k=kickoff(g); return k?k.getTime()-SP_LOCK_MS:null; }
const spIso=ms=>new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');
/* a time in US Eastern, as the schedule is ("Sun 6:20 PM ET") */
function spEt(ms,day){ try{ return new Date(ms).toLocaleString('en-US',{timeZone:'America/New_York',...(day?{weekday:'short'}:{}),hour:'numeric',minute:'2-digit'})+' ET'; }catch(e){ return spIso(ms).slice(11,16)+' UTC'; } }
/* when a prime-time game's player prices (and DraftKings' ids with them) are pulled: Thursday's and
   Monday's on the day, Sunday night's on Saturday morning (props.yml's pulls) */
function spPulled(g){ const d=spDow(g); return d===4?'on Thursday, the day of the game':d===1?'on Monday, the day of the game':d===0?'on Saturday morning':PB_PULLED; }
/* why a level of one unit has no parlay: the unit does not make that many legs, and why */
function spWhy(n,pool,g){
  const m=pbMaxLegs([...pool.pref,...pool.thin,...(pool.mkt||[])]), where=g.slot?'the Sunday slot':'this game';
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in ${where}${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in ${where}`;
  if(!pool.plGames){
    if(g.slot) return `${what}, and no player ${pool.plNoId?'leg DraftKings’ betslip can take':'prices'} yet: the afternoon games’ are pulled on Saturday morning, and never the early games’ (before 4pm ET).`;
    const read=ESPN_OUT[g.id]&&(ESPN_OUT[g.id].st==='ok'||ESPN_OUT[g.id].st==='none');
    const np=pool.plNoId?`no player leg DraftKings’ betslip can take yet: a player’s line read by Refresh odds carries no DraftKings id, and DraftKings’ own come with its player prices, which for this game are pulled ${spPulled(g)}.`
      :read?`no player lines yet: DraftKings had posted none for it when Refresh odds last read it, and its own player prices are pulled ${spPulled(g)}.`
      :`no player prices yet: they are pulled ${spPulled(g)}.`;
    return `${what}, and ${np}`; }
  return `${what}: a parlay takes one leg a player, and one side and one total a game.`;
}
function spBuild(g){
  const pool=pbPool(spGamesOf(g),SP_ALL,g.slot?SP_SLOT_SEARCH:SP_SEARCH), memo=new Map();
  const tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,g.slot?SP_SLOT_SEARCH:SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; });
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0};
}
/* a unit's live set, the same for the same data (the searches are seeded), from the cache when nothing it
   stands on has moved: its games' kickoffs and pbDataSig (the publish, the Elo files, ESPN_SEQ) */
const spSig=g=>[g.id,...spGamesOf(g).map(x=>x.id+'@'+(x.d||'')+'T'+(x.t||'')),pbDataSig()].join('|');
function spSet(gid){
  const g=spUnit(gid); if(!g) return null;
  const sig=spSig(g);
  let r=SP_CACHE.get(sig);
  if(!r){ r={sig,...spBuild(g)}; SP_CACHE.set(sig,r); if(SP_CACHE.size>24) SP_CACHE.delete(SP_CACHE.keys().next().value); }
  return r;
}
/* (app v118) a unit's Elo picks as they stand: the ELO tab's four levels on its games alone (window.eloUnit, cached
   there on its candidates), each id elo-<level>; null where the ELO tab is not on the page or its files are not in
   yet; {wait:true} with o.kept where they are not built yet (a hidden tab builds nothing) */
const spEloOn=()=>typeof window.eloUnit==='function';
function spEloSet(gid,o){ const u=spUnit(gid); if(!u||!spEloOn()) return null;
  let r=null; try{ r=window.eloUnit(spGamesOf(u).map(g=>g.id),{where:u.slot?'in the Sunday slot':'in this game',...(o||{})})||null; }catch(e){ console.error(e); return null; }
  /* an empty level where the unit has no player prices yet (a pick is a player's line) says when they come, as the
     model's levels do */
  if(r&&!r.error&&Array.isArray(r.tiers)&&r.tiers.some(t=>!t.legs)){ const s=spSet(gid);
    if(s&&!s.plGames){ const when=u.slot?'the afternoon games’ are pulled on Saturday morning, and never the early games’ (before 4pm ET)':`they are pulled ${spPulled(u)}`;
      r={...r,tiers:r.tiers.map(t=>t.legs?t:{...t,why:`No player ${s.plNoId?'leg DraftKings’ betslip can take':'prices'} ${u.slot?'in the Sunday slot':'in this game'} yet: ${when}.`})}; } }
  return r; }
/* one level of a unit built again now, from the lines at hand (a locked level holding a player ruled out): a model
   level or an Elo pick's */
function spRebuild(gid,id){
  const g=spUnit(gid); if(!g) return null;
  if(/^elo-/.test(String(id))){ const e=spEloSet(gid); return e&&Array.isArray(e.tiers)?e.tiers.find(t=>t.id===id)||null:null; }
  const t=PB_TIERS.find(s=>s[0]===id); if(!t) return null;
  const pool=pbPool(spGamesOf(g),SP_ALL,g.slot?SP_SLOT_SEARCH:SP_SEARCH), r=pbTier(t,pool,new Map(),g.slot?SP_SLOT_SEARCH:SP_SEARCH);
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
   n, floor, why}, a level built again carrying `updated`. An Elo pick's (id elo-<level>) keeps each leg's Elo chance
   (pe) beside the model's, its thin and market null (it is chosen on the Elo matchup, never marked a Value pick), and
   its p is the Elo chance all land */
const spR=(v,d)=>v==null||!isFinite(v)?null:Math.round(v*d)/d;
const spIsElo=t=>!!t&&/^elo-/.test(String(t.id||''));
function spLegOut(l,memo,elo){ const f=legFair(l,memo);
  return {gid:l.gid,week:l.week,pid:l.pid,team:l.team,grp:l.grp,stat:l.stat,k:l.k,side:l.side,main:!!l.main,price:l.price,src:l.src,name:l.name,label:l.label,
    p:spR(l.p,1e4),...(elo?{pe:spR(l.pe,1e4)}:{}),fair:f?spR(f.p,1e4):null,fair_est:!!(f&&f.est),thin:elo?null:!!l.thin,market:elo?null:!!l.market}; }
function spTierOut(t){ const memo={}, elo=spIsElo(t);
  if(!t||!t.legs||!t.legs.length) return {id:t.id,label:t.label,n:t.n,floor:t.floor,why:t.why};
  return {id:t.id,label:t.label,n:t.n,floor:t.floor,legs:t.legs.map(l=>spLegOut(l,memo,elo)),p:spR(elo?t.p:t.corr,1e4),fair:t.fair&&t.fair.p!=null?spR(t.fair.p,1e4):null,
    fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:elo?0:(t.thin||0),mkt:elo?0:(t.mkt||0),...(t.updated?{updated:t.updated}:{})}; }
function spLegIn(l,g){
  const G=spGamesOf(g), lg=l&&typeof l==='object'?G.find(x=>x.id===l.gid):null;
  if(!lg||typeof l.pid!=='string'||typeof l.stat!=='string') return null;
  const p=+l.p, price=+l.price; if(!(p>0&&p<1)||!isFinite(price)||price===0) return null;
  const elo=l.pe!=null, pe=+l.pe; if(elo&&!(pe>0&&pe<1)) return null;
  const tot=l.stat==='total', team=String(l.team||''), pl=S.players&&S.players[l.pid];
  return {key:legKey(l.gid,l.pid,l.stat),gid:l.gid,pid:l.pid,stat:l.stat,k:+l.k,side:l.side==='under'?'under':'over',main:!!l.main,p,price,src:typeof l.src==='string'?l.src:'real',
    mu:tot?lg.tot:null,name:String(l.name||''),pos:l.grp==='TEAM'?'Game':((pl&&pl.pos)||String(l.grp||'')),grp:String(l.grp||''),team,opp:tot?lg.h:(team===lg.h?lg.a:lg.h),
    week:+l.week||+lg.w,label:String(l.label||''),...(elo?{pe}:{thin:!!l.thin,...(l.market?{market:true}:{})})};
}
const SP_IN=new Map();
function spTierIn(t,g){
  const elo=spIsElo(t), spec=t&&PB_TIERS.find(s=>(elo?'elo-':'')+s[0]===t.id); if(!spec) return null;
  const head={id:t.id,label:spec[1],n:spec[2],floor:elo?(isFinite(+t.floor)?+t.floor:spec[3]):spec[3]};
  const U=t.updated&&typeof t.updated==='object'?{updated:{pid:String(t.updated.pid||''),name:String(t.updated.name||''),reason:String(t.updated.reason||''),at:String(t.updated.at||''),...(t.updated.by==='page'?{by:'page'}:{})}}:{};
  if(!Array.isArray(t.legs)) return {...head,why:typeof t.why==='string'&&t.why?t.why:`No parlay of this size in ${g.slot?'the Sunday slot':'this game'}.`,...U};
  const legs=t.legs.map(l=>spLegIn(l,g)); if(legs.length!==spec[2]||legs.some(l=>!l)||(elo&&legs.some(l=>l.pe==null))) return null;
  if(!(+t.dec>1)||!(+t.p>0&&+t.p<=1)) return null;
  /* the chance and price worked out again on the legs as kept (each its own chance and price), by the builder's
     own sums (parlayProb, parlayDec), so a locked level states what Add to builder and Finish then pay: the kept
     figures are rounded (4 places a chance, 3 a price), which on $37.50 moved a payout a cent off the builder's.
     The fair chance is the one kept, the book's at the lock, so a press after it moves nothing of the set. The
     record grades on its own kept figures; this is only how the page draws them. An Elo pick's chance is worked on
     its legs' Elo chances, as the ELO tab works it. Cached on the kept level and the data (pbDataSig), since a
     locked set is read back on every draw */
  const L=pbOrder(legs), ck=[JSON.stringify(t),g.id,pbDataSig()].join('|'), was=SP_IN.get(ck);
  const sum=was||(()=>{ const pr=parlayProb(elo?L.map(l=>({...l,p:l.pe})):L); return {corr:pr.corr,indep:pr.indep,dec:parlayDec(L.map(l=>({leg:l,ml:l.price})))}; })();
  if(!was){ SP_IN.set(ck,sum); if(SP_IN.size>64) SP_IN.delete(SP_IN.keys().next().value); }
  const fair=t.fair!=null&&isFinite(+t.fair)?{p:+t.fair,est:!!t.fair_est}:null;
  if(elo) return {...head,legs:L,p:sum.corr,dec:sum.dec,fair,...(t.likeliest?{likeliest:true}:{}),...U};
  return {...head,legs:L,corr:sum.corr,indep:sum.indep,dec:sum.dec,fair,likeliest:!!t.likeliest,
    thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length,...U};
}
/* the site's locked set for a unit: its entry in the record (the prime map for a night game, the slot map for the
   Sunday slot), of this season and the unit's kickoff as it stands, taken before the lock (the job writes none
   after it), the last such key */
function spLedgerOf(g){
  const P=PB_REC&&pbIsMap(PB_REC[g.slot?'slot':'prime'])?PB_REC[g.slot?'slot':'prime']:null; if(!P) return null;
  const lock=spLockAt(g), kick=spIso(kickoff(g).getTime()); let e=null;
  for(const k of Object.keys(P).sort()){ const x=P[k];
    if(!pbIsMap(x)||x.gid!==g.id||+x.season!==SEASON||x.kickoff!==kick||!Array.isArray(x.tiers)) continue;
    if(x.taken_at!=null&&!(Date.parse(x.taken_at)<lock)) continue;
    e=x; }
  return e;
}
/* what this browser keeps of a locked unit (props_sp_lock_v1, outside S and never sent anywhere): the set the
   page built where the record had none (own), its Elo picks where the record has none of them (elo, eloOwn), and the
   levels the page built again for a player ruled out (rep), per unit, under the unit's kickoff; a unit that has
   kicked off (the slot: its last game), or is off the schedule, is pruned on every write. Held in memory too
   (SP_KEEP), so a browser that keeps nothing still shows one set a load */
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
  for(const [id,x] of Object.entries(SP_KEEP||{})){ const g=spUnit(id), k=g&&kickoff(g), end=g&&g.slot?g.last:(k&&k.getTime());
    if(k&&x.kickoff===spIso(k.getTime())&&now<end) out[id]=x; else delete SP_KEEP[id]; }
  try{ if(!Object.keys(out).length) localStorage.removeItem(SP_KEEP_KEY); else localStorage.setItem(SP_KEEP_KEY,JSON.stringify({v:1,season:SEASON,games:out})); }catch(e){}
}
/* a unit's set as the tab shows it: live before the lock; from it, the site's locked set (the record's), or,
   with none, the page's own built once and kept; a locked level holding a player ruled out since built again,
   that level only (the record's own replacement where the job made one, else the page's, kept). The same for its
   Elo picks (elo), the record's where its entry holds them, else the page's own kept beside the set (eloOwn); under:
   the Sunday slot once its first game has kicked off (shown as it locked, nothing to add). Nothing is built of the
   page's own once the slot is under way (its games begun, a set built then would be of the games left, never locked:
   none, eloNone say the site's was not published), nor before the Elo files are in (a set built without the ratings has
   no player legs, market + form deciding them: the tab says it is loading until they are), and no level is built again
   for a player ruled out once it is under way, as the record replaces none after the first kickoff */
function spShown(g){
  const lock=spLockAt(g), now=Date.now(), eon=spEloOn();
  const under=!!g.slot&&now>=kickoff(g).getTime(), eloPend=eon&&window.eloUnit([],{})==null;
  if(lock==null||now<lock){ const s=spSet(g.id), e=eon?spEloSet(g.id):null; return {phase:'live',lock,tiers:s?s.tiers:[],elo:e&&Array.isArray(e.tiers)?e.tiers:null,eloErr:e&&e.error||null}; }
  if(!PB_REC_DONE) return {phase:'loading',lock,tiers:null,elo:null};
  const K=spKeep(), kick=spIso(kickoff(g).getTime()); let k=K[g.id]&&K[g.id].kickoff===kick?K[g.id]:null, dirty=false;
  const e=spLedgerOf(g); let tiers=null, own=false, at=null, elo=null, eloOwn=false;
  if(e){ const T=PB_TIERS.map(([id])=>spTierIn(e.tiers.find(t=>t&&t.id===id),g));
    if(T.every(Boolean)){ tiers=T; at=e.taken_at||null; if(k&&k.own){ k={kickoff:kick,rep:{},...(k.eloOwn?{elo:k.elo,eloOwn:true,eloAt:k.eloAt}:{})}; K[g.id]=k; dirty=true; } } }
  if(!tiers&&k&&k.own&&Array.isArray(k.tiers)){ const T=PB_TIERS.map(([id])=>spTierIn(k.tiers.find(t=>t&&t.id===id),g));
    if(T.every(Boolean)){ tiers=T; own=true; at=k.at||null; } }
  if(!tiers&&under) return {phase:'locked',lock,tiers:null,elo:null,none:true,under};
  if(!tiers&&eloPend) return {phase:'loading',lock,tiers:null,elo:null};
  if(!tiers){ const s=spSet(g.id), out=s.tiers.map(spTierOut);
    tiers=PB_TIERS.map(([id],i)=>spTierIn(out.find(t=>t.id===id),g)||s.tiers[i]);
    k={kickoff:kick,own:true,at:spIso(now),tiers:out,rep:{},...(k&&k.eloOwn?{elo:k.elo,eloOwn:true,eloAt:k.eloAt}:{})}; K[g.id]=k; dirty=true; own=true; at=k.at; }
  /* the Elo picks: the record's, else the page's own kept, else built once now and kept (only where the ELO tab
     can build them: its files in) */
  const eIn=list=>{ if(!Array.isArray(list)) return null; const T=PB_TIERS.map(([id])=>spTierIn(list.find(t=>t&&t.id==='elo-'+id),g)); return T.every(Boolean)?T:null; };
  if(e&&Array.isArray(e.elo)){ elo=eIn(e.elo); if(elo&&k&&k.eloOwn){ delete k.elo; delete k.eloOwn; delete k.eloAt; dirty=true; } }
  if(!elo&&k&&k.eloOwn){ elo=eIn(k.elo); if(elo) eloOwn=true; }
  let eloErr=null;
  if(!elo&&eon&&!under&&!eloPend){ const s=spEloSet(g.id); if(s&&s.error) eloErr=s.error; if(s&&Array.isArray(s.tiers)){ const out=s.tiers.map(spTierOut);
    elo=eIn(out)||s.tiers; eloOwn=true; if(!k){ k={kickoff:kick,rep:{}}; K[g.id]=k; } k.elo=out; k.eloOwn=true; k.eloAt=spIso(now); dirty=true; } }
  const rep=k&&pbIsMap(k.rep)?k.rep:{};
  const swap=list=>list.map(t=>{
    let cur=t, upd=null; const r=rep[t.id];
    /* the page's own replacement, unless the record has made one for the same player */
    if(r&&pbIsMap(r.tier)){ const T=spTierIn(r.tier,g);
      if(T&&!(t.updated&&t.updated.pid===r.pid)){ cur=T; upd={pid:String(r.pid),name:String(r.name||''),reason:String(r.reason||''),at:String(r.at||''),by:'page'}; }
      else { delete rep[t.id]; dirty=true; } }
    const out=!under&&cur.legs&&cur.legs.find(l=>!isGameLeg(l)&&spOutWhy(l.pid));
    if(out){ const why=spOutWhy(out.pid), nt=spRebuild(g.id,t.id);
      if(nt){ const at2=spIso(now);
        rep[t.id]={pid:out.pid,name:out.name,reason:why,at:at2,tier:spTierOut(nt)}; dirty=true;
        cur=spTierIn(rep[t.id].tier,g)||nt; upd={pid:out.pid,name:out.name,reason:why,at:at2,by:'page'}; } }
    return upd?{...cur,updated:upd}:cur;
  });
  tiers=swap(tiers); if(elo) elo=swap(elo);
  if(dirty){ if(!k){ k={kickoff:kick,rep:{}}; K[g.id]=k; } k.rep=rep; spKeepSave(); }
  return {phase:'locked',lock,tiers,elo,own,at,ledger:!!e,eloOwn,eloErr:elo?null:eloErr,eloNone:!!eon&&!elo&&!eloErr&&under,under};
}
/* (app v112) one night at a time (the owner's call of 17 October 2026: "just show the next night game dont stack the
   monday night game until monday morning"). The tab shows the games of the next prime-time night still to
   kick off (spGames' first Eastern date: both games of a Monday doubleheader), and only from SP_OPEN_H, 6:00 AM
   Eastern, on the morning after the prime-time night before it on the schedule (any week, played or not; none
   before it, at once): Sunday night's set from Friday morning, Monday night's from Monday morning, Thursday's
   from Tuesday morning. Until then the tab says which game is next and when its set goes up. The record is
   untouched: the props job takes, locks and grades every prime-time game's set (spGames, spSet), shown or not.
   (app v118) The Sunday slot goes up by the same rule, on the morning after the night before its Sunday (Friday's) */
const SP_OPEN_H=6;
/* when a set for Eastern date D goes up: 6:00 AM Eastern on the day after the latest prime-time night before D on
   the schedule (null, at once, where there is none) */
function spOpenAt(D){
  const prev=(S.sched||[]).filter(g=>spPrime(g)&&g.d<D).map(g=>g.d).sort().pop()||null;
  let open=null;
  if(prev){ const n=new Date(prev+'T12:00:00Z'); n.setUTCDate(n.getUTCDate()+1); const day=n.toISOString().slice(0,10);
    const t=new Date(`${day}T${String(SP_OPEN_H).padStart(2,'0')}:00:00${easternOffset(day)}`).getTime(); open=isFinite(t)?t:null; }
  return {open,prev};
}
function spNight(){
  const G=spGames(); if(!G.length) return {games:[],open:null,prev:null,up:false};
  const D=G[0].d, games=G.filter(g=>g.d===D), {open,prev}=spOpenAt(D);
  return {games,open,prev,up:open==null||Date.now()>=open};
}
/* the games the tab sets out now */
function spOn(){ const n=spNight(); return n.up?n.games:[]; }
/* (app v118) the Sunday slot the tab is on: the current week's, else the next week's, whose last game is still to
   kick off, with when it goes up (spOpenAt on its Sunday) and whether it is up; null with none */
function spSlotNext(){
  const w0=currentWeek();
  for(const w of [w0,w0+1]){ const u=spSlotUnit(w); if(!u||!u.games.some(g=>!gameStarted(g)&&!hasScore(g))) continue;
    const {open,prev}=spOpenAt(u.d); return {...u,open,prev,up:open==null||Date.now()>=open}; }
  return null;
}
/* the units the tab sets out now: the night's games, then the Sunday slot once it is up */
function spOnAll(){ const s=spSlotNext(); return [...spOn(),...(s&&s.up?[s]:[])]; }
/* a level by the id its Finish names (unit id:level), as the tab shows it; the card reads it. Only a unit on the
   screen, and not the Sunday slot under way: a set the tab does not show yet, or whose games have begun, is not
   finished from it. An Elo pick's (elo-<level>) carries elo */
function spTier(fid){
  const s=String(fid||''), i=s.lastIndexOf(':'); if(i<0) return null;
  const g=spOnAll().find(x=>x.id===s.slice(0,i)); if(!g) return null;
  const v=spShown(g); if(v.under) return null;
  const lv=s.slice(i+1), t=[...(v.tiers||[]),...(v.elo||[])].find(x=>x&&x.id===lv);
  return t&&t.legs&&t.legs.length?{...t,game:g.slot?`the Sunday slot`:`${g.a} at ${g.h}`,...(spIsElo(t)?{elo:true}:{})}:null;
}
/* what the tab stands on beyond the data: the games to come and which side of its lock each is, and the games it
   sets out (app v112: the morning's turn to the next night redraws an open page); the Sunday slot's side of its
   opening, its lock and its first kickoff (app v118) */
function spState(){ const now=Date.now(), s=spSlotNext();
  return spGames().map(g=>g.id+(now<spLockAt(g)?':l':':k')).concat('on='+spOn().map(g=>g.id).join('+'),
    's='+(s?s.id+(!s.up?':w':now<spLockAt(s)?':l':now<kickoff(s).getTime()?':k':':u'):'')).join(); }
/* a set's kickoff in US Eastern, as its lock is said, so the two read on one clock wherever the visitor is
   (fmtDate gives the visitor's own: on Pacific time a Sunday night game read "5:20 PM PDT" over "Locks Sun
   6:20 PM ET", a lock that looked later than its kickoff) */
function spKickEt(g){ const k=kickoff(g); if(!k) return fmtDate(g);
  try{ return {day:k.toLocaleDateString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'}),t:k.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET'}; }
  catch(e){ return fmtDate(g); } }
/* a unit's head: a night game's teams, its night and kickoff; the Sunday slot's week, games and window */
function spHdHtml(g){
  const d=spKickEt(g);
  if(!g.slot) return `<div class="sp-hd"><h4 id="spg-${esc(g.id)}">${esc(TEAM_NAMES[g.a]||g.a)} at ${esc(TEAM_NAMES[g.h]||g.h)}</h4><span class="pill">${SP_NIGHT[spDow(g)]}</span><small>${esc(d.day)}${d.t?' · '+esc(d.t):''}</small></div>`;
  const e=spKickEt({d:g.games[g.games.length-1].d,t:g.games[g.games.length-1].t});
  return `<div class="sp-hd"><h4 id="spg-${esc(g.id)}">Week ${g.w}, ${g.games.length} game${g.games.length===1?'':'s'}</h4><small>${esc(d.day)}${d.t?' · '+esc(d.t)+(e.t&&e.t!==d.t?' to '+esc(e.t):''):''}</small></div>`;
}
function spGameHtml(g,on){
  const lk=spLockAt(g), live=lk!=null&&Date.now()<lk, eon=spEloOn();
  const open=`<div class="sp-game${g.slot?' sp-slot':''}" role="group" data-sp-game="${esc(g.id)}" aria-labelledby="spg-${esc(g.id)}">${spHdHtml(g)}`;
  /* a hidden tab draws a live set only once it is built: the tab builds it when it is opened */
  if(!on&&live&&(!SP_CACHE.has(spSig(g))||(eon&&(spEloSet(g.id,{kept:true})||{}).wait))) return `${open}<p class="sp-lock" data-sp-phase="wait">Built when this tab is open.</p></div>`;
  const v=spShown(g), what=g.slot?'the Sunday slot':`${g.a} at ${g.h}`, lockT=v.lock!=null?spEt(v.lock,true):'';
  /* (app v113) one short line each: the owner's "get rid of all the long paragraph description stuff" */
  const mark='<span class="sp-lockmark">Locked</span>', before=g.slot?'2 hours before the first kickoff':'2 hours before kickoff';
  const line=v.phase==='live'?`<p class="sp-lock" data-sp-phase="live">Locks ${lockT}, ${before}.</p>`
    :v.phase==='loading'?`<p class="sp-lock" data-sp-phase="loading">${mark} since ${lockT}. Loading the site’s set…</p>`
    :v.under?`<p class="sp-lock" data-sp-phase="under">${mark} since ${lockT}. Under way since ${spEt(kickoff(g).getTime(),true)}.${v.none?' The site’s set was not published in time.':v.own?' This browser’s own set: the site’s was not published in time, so the record does not grade it.':''}</p>`
    :v.own?`<p class="sp-lock" data-sp-phase="own">${mark} since ${lockT}. This browser’s own set: the site’s was not published in time, so the record does not grade it.</p>`
    :`<p class="sp-lock" data-sp-phase="locked">${mark} since ${lockT}.</p>`;
  /* under way, the levels are shown as they locked, with nothing to add or finish */
  const ro=v.under?{acts:false,legAdd:false}:{};
  const cards=v.tiers?`<h5 class="sp-sub" data-sp-kind="model">Model parlays</h5><div class="pb-tiers" data-sp-kind="model">${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,quiet:true,mktWhy:g.slot?'the slot’s other legs do not make a parlay of this size':'this game’s other legs do not make a parlay of this size',...ro})).join('')}</div>`:'';
  /* the Elo picks, where the ELO tab is on the page: its cards' own options (eloCardOpt: the Elo chance, each
     player's shield), the set's buttons */
  const eloCards=!eon||!v.tiers?'':`<h5 class="sp-sub" data-sp-kind="elo">Elo picks</h5>${v.eloErr?`<p class="pb-why" data-sp-elo-err>${esc(v.eloErr)}</p>`:v.eloNone?`<p class="pb-why" data-sp-elo-none>The site’s Elo picks were not published in time.</p>`:v.elo?`${v.eloOwn&&v.phase==='locked'&&!v.own?`<p class="sp-lock" data-sp-phase="eloown">This browser’s own Elo picks: the site’s were not published in time, so the record does not grade them.</p>`:''}<div class="pb-tiers" data-sp-kind="elo">${v.elo.map(t=>pbTierCard(t,{...(typeof window.eloCardOpt==='function'?window.eloCardOpt(t):{}),kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,noun:'Elo pick',quiet:true,...ro})).join('')}</div>`
    :`<p class="pb-why" data-sp-elo-wait>Loading the Elo ratings…</p>`}`;
  return `${open}${line}${cards}${eloCards}</div>`;
}
function spHeadHtml(){
  const w=currentWeek();
  return `<div class="pb-hd"><h2>Suggested Parlays</h2><span class="pill">week ${w}</span></div>
    <div class="pb-row pb-odds-row sp-odds"><span class="pb-lbl">Odds</span>${espnCtl(null,'sp')}</div>`;
}
/* a section: its heading, its record, then its sets or why there are none */
const spSecHtml=(sec,body)=>`<section class="sp-sec" data-sp-sec="${sec}" aria-labelledby="spsec-${sec}"><h3 class="sp-sech" id="spsec-${sec}">${SP_SEC[sec].name}</h3>${spRecHtml(sec)}${body}</section>`;
function spNightHtml(on){
  const w=currentWeek(), G=spGames();
  if(!G.length) return `<p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no Thursday, Sunday or Monday night game is left.`:`No Thursday, Sunday or Monday night game of week ${w} is still to kick off. Week ${w+1}’s sets come once its games are the week’s.`}</p>`;
  /* (app v112) the next night alone, once its morning has come (spOn: the one place the tab asks which games it
     sets out); until then, which game is next and when its set goes up */
  const On=spOn(), nm=x=>`${TEAM_NAMES[x.a]||x.a} at ${TEAM_NAMES[x.h]||x.h}`;
  let wait='';
  if(!On.length){ const N=spNight(), two=N.games.length>1, pn=N.prev?SP_NIGHT[new Date(N.prev+'T12:00:00Z').getUTCDay()]:null;
    const pg=N.prev?(S.sched||[]).filter(x=>spPrime(x)&&x.d===N.prev).length:0;
    wait=`<p class="pb-none sp-wait" data-sp-wait="${N.open!=null?spIso(N.open):''}" data-sp-next="${esc(N.games.map(x=>x.id).join(' '))}">Next up: ${SP_NIGHT[spDow(N.games[0])]}, ${esc(N.games.map(nm).join(' and '))}.${N.open!=null?` ${two?'Their sets go':'Its set goes'} up ${spEt(N.open,true)}, the morning after ${pn||'the night game before it'}’s ${pg>1?'games':'game'}.`:''}</p>`; }
  return On.length?On.map(g=>spGameHtml(g,on)).join(''):wait;
}
/* (app v118) the Sunday slot: its set from its morning to its last kickoff; until then, when it goes up */
function spSlotHtml(on){
  const u=spSlotNext();
  if(!u) return `<p class="pb-none" data-sp-none="slot">${seasonOver()?`The ${SEASON} regular season is over: no Sunday slot is left.`:`No Sunday game of week ${currentWeek()} is still to kick off.`}</p>`;
  if(!u.up){ const pn=u.prev?SP_NIGHT[new Date(u.prev+'T12:00:00Z').getUTCDay()]:null, pg=u.prev?(S.sched||[]).filter(x=>spPrime(x)&&x.d===u.prev).length:0;
    return `<p class="pb-none sp-wait" data-sp-wait="${u.open!=null?spIso(u.open):''}" data-sp-next="${esc(u.id)}">Next up: week ${u.w}’s Sunday slot, ${u.games.length} game${u.games.length===1?'':'s'}. Its sets go up ${spEt(u.open,true)}, the morning after ${pn||'the night game before it'}’s ${pg>1?'games':'game'}.</p>`; }
  return spGameHtml(u,on);
}
function spSetsHtml(on){ return spSecHtml('night',spNightHtml(on))+spSecHtml('slot',spSlotHtml(on)); }
function renderSp(){
  const el=$('spPanel'); if(!el||!S||!S.sched) return;
  /* the frame once (app v118: the Elo picks are in each unit now, no longer a section of their own at the foot) */
  if(!$('spSets')) el.innerHTML='<div class="card pb sp" id="spCard"><div id="spHead"></div><div id="spSets"></div></div>';
  const tab=$('tab-suggest'), on=!tab||!tab.hidden;
  $('spHead').innerHTML=spHeadHtml(); $('spSets').innerHTML=spSetsHtml(on);
  SP_SHOWN=spState();
}
/* the tab opened: its sets built and drawn (the prop model's tab switch has shown the section by the time
   the click reaches the document) */
if(typeof document!=='undefined') document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('#tabs button[data-tab="suggest"]'):null;
  if(b&&typeof S==='object'&&S&&S.sched) try{ renderSp(); }catch(err){ console.error(err); } });
Object.assign(window,{spPrime,spGames,spNight,spOn,spOnAll,spOpenAt,spSlotUnit,spSlotNext,spUnit,spLockAt,spSet,spEloSet,spRebuild,spOutWhy,spTierOut,spShown,spTier,renderSp});
"""

# ---------------------------------------------------------------- the record: two sections, two kinds, the backtest
block('p3', '/* ---------- the suggestions record (props/data/suggest_ledger.json) ----------', '</div>\n</div>`;\n}\n',
      RECORD_SHA, RECORD, 'the record')

# ---------------------------------------------------------------- the sets: units, the Sunday slot, the Elo picks
block('p3', "/* ---------- Suggested Parlays (#suggest, app v111): each prime-time game's own four parlays ----------",
      'Object.assign(window,{spPrime,spGames,spNight,spOn,spLockAt,spSet,spRebuild,spOutWhy,spTierOut,spShown,spTier,renderSp});\n',
      SETS_SHA, SETS, 'the sets')

# ---------------------------------------------------------------- a level card with nothing to add (the slot under way)
sub1('p3', """   o.legAdd false: no Add on each leg; o.quiet: no line saying why a leg is not a Value pick or why a total is there
   (a Suggested Parlays set's, app v113) */""", """   o.legAdd false: no Add on each leg; o.quiet: no line saying why a leg is not a Value pick or why a total is there
   (a Suggested Parlays set's, app v113); o.acts false: no Add to builder or Finish (app v118: the Sunday slot under
   way, its first games begun); o.noun: what its buttons call it (an Elo pick's, app v118: 'Elo pick'; else 'parlay') */""", 'pbTierCard: its note')
sub1('p3', """nm=o.what?` the ${esc(t.label)} parlay for ${esc(o.what)}`:'';""", """nm=o.what?` the ${esc(t.label)} ${esc(o.noun||'parlay')} for ${esc(o.what)}`:'';""", 'pbTierCard: its buttons named')
sub1('p3', """  pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay for ${t.game}`);""", """  pbPut(t.legs,t.elo?`the ${t.label} Elo pick for ${t.game}`:`the ${t.label} ${t.legs.length}-leg parlay for ${t.game}`);""", 'spAddClick: an Elo pick named')
sub1('p3', """    <div class="pb-acts"><button type="button" class="btn ${card?'quiet':'go'}" ${o.add||`data-pb-add="${t.id}"`}""",
     """    ${o.acts===false?'':`<div class="pb-acts"><button type="button" class="btn ${card?'quiet':'go'}" ${o.add||`data-pb-add="${t.id}"`}""", 'pbTierCard: no actions (open)')
sub1('p3', """>Finish</button>`:''}</div></div>`;
}
window.pbTierCard=pbTierCard;""", """>Finish</button>`:''}</div>`}</div>`;
}
window.pbTierCard=pbTierCard;""", 'pbTierCard: no actions (close)')

# ---------------------------------------------------------------- a leg's own Add on a locked set, the Sunday slot's too
sub1('p3', """  const sg=gEl&&g&&spGames().find(x=>x.id===gEl.dataset.spGame), lk=sg&&spLockAt(sg);""",
     """  /* (app v118) any unit the tab sets out, a night game or the Sunday slot (spOnAll; spGames alone missed the slot, so
     a locked slot leg's Add put in the line as it stands now) */
  const sg=gEl&&g&&spOnAll().find(x=>x.id===gEl.dataset.spGame), lk=sg&&spLockAt(sg);""", 'pbLegClick: the unit')
sub1('p3', """    if(!gameStarted(sg)){ if(suggestLegOn(sl)) delete S.parlay[key];""",
     """    if(!gameStarted(g)){ if(suggestLegOn(sl)) delete S.parlay[key];""", 'pbLegClick: the leg\'s own game')

# ---------------------------------------------------------------- the record read again at any unit's lock
sub1('p3', """function pbWatchTick(){ try{ if(!S||!S.sched||document.visibilityState==='hidden') return;
  if(PB_REC_DONE&&PB_REC_STATE!=null&&!pbRecLoad.busy){ const was=PB_REC_STATE.split(',');
    if(spState().split(',').some(x=>x.endsWith(':k')&&was.includes(x.slice(0,-2)+':l'))){ pbRecLoad.busy=true; pbRecLoad(true).finally(()=>{ pbRecLoad.busy=false; }); } }""",
     """/* (app v118) each unit's side of its lock in spState: l before it, k from it, u under way (the Sunday slot from its
   first kickoff), w not up yet (the slot before its morning). The record is read again where a unit is now at or past
   its lock (k, u) and was not when it was last read, or was not there at all: a slot read while it waited (w) or seen
   again only once under way (a tab left hidden through its lock), and a game that came on while the page was open, as
   well as a night game reaching its lock (l to k, the only turn until app v118) */
const spSides=s=>{ const o={}; for(const x of String(s||'').split(',')){ const m=/^(?:s=)?(.+):([lkuw])$/.exec(x); if(m) o[m[1]]=m[2]; } return o; };
function pbWatchTick(){ try{ if(!S||!S.sched||document.visibilityState==='hidden') return;
  if(PB_REC_DONE&&PB_REC_STATE!=null&&!pbRecLoad.busy){ const was=spSides(PB_REC_STATE), cur=spSides(spState()), past=c=>c==='k'||c==='u';
    if(Object.keys(cur).some(id=>past(cur[id])&&!past(was[id]))){ pbRecLoad.busy=true; pbRecLoad(true).finally(()=>{ pbRecLoad.busy=false; }); } }""", 'pbWatchTick: any unit at its lock')

# ---------------------------------------------------------------- styles
sub1('p1', """.sp-hd h3{margin:0;font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px;min-width:0;overflow-wrap:anywhere}""",
     """.sp-hd h3,.sp-hd h4{margin:0;font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px;min-width:0;overflow-wrap:anywhere}
/* app v118: two sections, Night games and the Sunday slot, each headed by its record (a row for the model's parlays and
   one for the Elo picks); each unit's model parlays, then its Elo picks */
.sp-sec{margin:20px 0 0;padding:16px 0 0;border-top:2px solid var(--line-2)}
.sp-sech{margin:0;font-family:var(--display);font-size:19px;font-weight:800;letter-spacing:-.3px}
.sp-sub{margin:14px 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.sp-rec .bar.sp-recbtbar{margin-top:0}
.sp-reck{flex:0 0 auto;min-width:112px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
@media(max-width:640px){ .sp-reck{flex-basis:100%;min-width:0} }""", 'styles')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patch_slots.py: applied (app v118)')
