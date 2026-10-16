r"""app v109: every suggested leg goes on DraftKings' betslip, and the builder says which of its own will not.

The owner, 16 October 2026: he built a parlay, pressed Finish parlay, and Open in DraftKings put only the
first leg on DraftKings' betslip. The link was right (DraftKings' web betslip reads every id in
?outcomes=<id>+<id>); the other legs had no DraftKings outcome id. An id comes only with a price the job
bought (oddsfetch.py reads it with each outcome, weekly.py's dk_ids bakes it into PAY.dk): Sunday's
afternoon and night games get their player ids on the Saturday morning pull, Sunday's early games never,
and a leg priced by Refresh odds from DraftKings' line on ESPN never has one, since ESPN carries no outcome
id for a player's line (a press does bring DraftKings' current game-line ids, PAY.dk dated by espnIdAt).
DraftKings' own odds feed answers neither other sites nor cloud runners, so there is no free source of
ids. His call: every leg on the slip, never "add by hand" where it can be helped, no credit spent, and the
prices may be best guesses.

So, one rule here, in the props parts:

- dkIdOf(l) is DraftKings' outcome id for a leg at its own line, from PAY.dk, by the keys and the rung rule
  the parlay card (nflbets/build/card.html, dkLeg) has always used: a moneyline exact; a spread
  team:<ABBR>|ats|<line>; the total game|total|<side>|<line>; the anytime touchdown <pid>|any_td for one
  touchdown only; a player's main line <pid>|<stat>|<side>|<line>; a rung k+ as Over k-0.5, else as the
  whole Over k-1 its price was read from. Null once the game has kicked off, or with no id. dkCarries(l)
  says whether the payload has ids for the leg's game: PAY.dk an object (a payload baked before ids lacks
  it; the PAY.dk a Refresh odds press makes on such a payload, to hold the game-line ids it read, is
  marked and does not count, so that payload suggests as before) with an entry for that game in its week.
  A game with no entry is taken as a payload without ids is: weekly.py bakes PAY.dk on every run, {} from
  Monday night's final until the next week's first pull (dk_ids keeps only games still to come), and
  judged on the payload as a whole that left every level, hand and Elo pick empty for three days.
  dkCarries() with no leg says only whether the payload has ids at all.
- Where dkCarries(l), a leg qualifies for the Parlay Builder's levels (pbPool: the preferred, thin and
  totals lists) and a game page's High, Medium and Low hands (gameLegPool) only with an id; the Elo picks
  (tab_elo.html) take the same filter. Every other rule (the band, the edge, market + form, the far-off
  guard) is as it was, and a payload baked before ids keeps the old behaviour. So after a Refresh odds
  press a player leg priced from ESPN's line no longer enters a suggestion (it has no id), and a team leg
  the press re-priced does (the press gave its current id). A player's game counts as priced only where one
  of his legs has an id, and the panel says in plain words how many legs it left out for want of one and
  why, apart: a leg DraftKings had only at another number (dkAtAnother: a spread at nflverse's number where
  DraftKings' is another, say; the parlay card would put it on at DraftKings' number, and Refresh odds
  reads DraftKings' current game lines, which the levels can take), and a leg DraftKings had none for at
  all (ESPN gives no id for a player's line; DraftKings' own come with its prices), with when those are
  pulled. A level left empty says it is short of legs DraftKings' betslip can take, and a game page's hand
  left empty for want of ids says so, and why: its player ids not pulled yet, or never, for Sunday's early
  games (dkEarlySunday, oddsfetch.py's early_sunday rule), rather than that the game has too few lines.
  The suggestions record (suggest_ledger.js) takes the panel from getPbTiers, so it follows.
- The builder says it first: where the hub page's parlay card is on the page (window.PARLAY_CARD, whose
  dkPlan is the card's own reading of each leg), a quiet line under a leg that will not go on the slip as
  built, "On DraftKings as Over 64.5 receiving yards" where the card converts it to DraftKings' number, or
  "Not on DraftKings' slip yet" with its reason in a few words. Nothing under a leg that goes on as built,
  and nothing on the prop model's own page, which has no card.

Every edit is made in memory and asserted to land exactly once; nothing is written unless all of them do.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:120])
    T[k] = s.replace(old, new)


MID = chr(92) + 'u00b7'   # the parts write the middle dot as a JS escape
sub1('p2', "const APP_BUILD='app v108 " + MID + " 2026-10-16';", "const APP_BUILD='app v109 " + MID + " 2026-10-16';")

# --- part1: the builder row's quiet line about DraftKings' slip ---
sub1('p1', """.legfair{display:block;font-size:11px;font-weight:500;color:var(--ink-2);white-space:nowrap;margin-top:2px}
""", """.legfair{display:block;font-size:11px;font-weight:500;color:var(--ink-2);white-space:nowrap;margin-top:2px}
.dkslip{display:block;font-size:11px;font-weight:500;color:var(--ink-2);white-space:normal;margin-top:2px}
""")

# --- part3: dkCarries and dkIdOf, ahead of the lines the suggestions are built from ---
sub1('p3', """/* ---------- the lines the suggestions are built from ---------- */
""", r"""/* ---------- DraftKings' id for a leg (app v109) ----------
   DraftKings' betslip takes a leg only by DraftKings' own outcome id, and an id names one outcome at one
   number. PAY.dk holds the ids the price pull read (weekly.py's dk_ids), and Refresh odds adds DraftKings'
   current game-line ids (espnIdAt dates them); a player's line read on ESPN carries none. dkIdOf is the
   id for a leg at its own line, by the keys and rung rule the parlay card reads (card.html, dkLeg): null
   once its game has kicked off, or where DraftKings has none. A suggestion takes only legs that have one,
   wherever the payload carries ids for the leg's game (dkCarries; one baked before them suggests as before). */
/* a press on a payload baked before ids makes PAY.dk to hold the game-line ids it read (dkPressMade):
   that payload still carries no ids of the pull's, so it suggests as before */
const DK_PRESS_MADE=new WeakSet();
function dkPressMade(o){ DK_PRESS_MADE.add(o); return o; }
/* the payload carries ids (no l), and for the game of leg l ({week, gid} will do): its week has an entry
   for that game. A game with none is taken as a payload baked before ids is: weekly.py bakes PAY.dk on
   every run, {} from Monday night's final to the next week's first pull, and a level, hand or Elo pick
   must not go empty for three days for want of ids no pull has read yet */
function dkCarries(l){
  if(!(typeof PAY==='object'&&!!PAY&&!!PAY.dk&&typeof PAY.dk==='object'&&!DK_PRESS_MADE.has(PAY.dk))) return false;
  if(!l) return true;
  const W=PAY.dk[String(l.week)], D=W&&typeof W==='object'?W[l.gid]:null;
  return !!D&&typeof D==='object';
}
function dkIdOf(l){
  if(!l||!dkCarries(l)) return null;
  const g=(S.sched||[]).find(x=>x.id===l.gid); if(g&&gameStarted(g)) return null;
  const W=PAY.dk[String(l.week)], D=W&&W[l.gid]; if(!D||typeof D!=='object') return null;
  const pt=x=>String(+x); let keys;
  if(l.stat==='ml') keys=[l.pid+'|ml'];
  else if(l.stat==='ats') keys=[l.pid+'|ats|'+pt(l.k)];
  else if(l.stat==='total') keys=['game|total|'+l.side+'|'+pt(l.k)];
  else if(l.stat==='any_td') keys=(+l.k||1)===1?[l.pid+'|any_td']:[];
  else if(l.main) keys=[[l.pid,l.stat,l.side,pt(l.k)].join('|')];
  /* a rung, k or more: DraftKings' Over k-0.5, else the whole Over k-1 its price was read from */
  else keys=[+l.k-0.5,+l.k-1].map(p=>[l.pid,l.stat,'over',pt(p)].join('|'));
  for(const k of keys){ const v=D[k]; if(typeof v==='string'&&v) return v; }
  return null;
}
/* DraftKings has the same bet, with no id at the leg's own line, at another number: a spread the same
   team's, a total the same side, a player's main line the same player, stat and side, a rung his Over on
   the stat, 2+ touchdowns his anytime touchdown (the parlay card puts such a leg on the slip at DraftKings'
   number: card.html, dkLeg). A moneyline and the anytime touchdown have no number. For the panel's note */
function dkAtAnother(l){
  if(!l||!dkCarries(l)) return false;
  const g=(S.sched||[]).find(x=>x.id===l.gid); if(g&&gameStarted(g)) return false;
  const D=PAY.dk[String(l.week)][l.gid];
  if(l.stat==='ml') return false;
  if(l.stat==='any_td') return (+l.k||1)>=2&&typeof D[l.pid+'|any_td']==='string'&&!!D[l.pid+'|any_td'];
  const near=l.stat==='ats'?l.pid+'|ats|':l.stat==='total'?'game|total|'+l.side+'|':[l.pid,l.stat,l.main?l.side:'over',''].join('|');
  return Object.keys(D).some(k=>k.startsWith(near)&&k.length>near.length&&isFinite(+k.slice(near.length))&&typeof D[k]==='string'&&!!D[k]);
}
/* a Sunday kickoff before 4pm Eastern (g.d and g.t are Eastern): oddsfetch.py's early_sunday(), whose
   games are never bought player prices, so never given DraftKings' player ids */
function dkEarlySunday(g){ return !!g&&!!g.d&&new Date(g.d+'T12:00:00Z').getUTCDay()===0&&(g.t||'13:00')<'16:00'; }
/* ---------- the lines the suggestions are built from ---------- */
""")

# --- a press that makes PAY.dk on a payload baked before ids marks it so (dkCarries reads the mark) ---
OLD_MADE = "PAY.dk&&typeof PAY.dk==='object'?PAY.dk:(PAY.dk={})"
assert T['p3'].count(OLD_MADE) == 2, T['p3'].count(OLD_MADE)
T['p3'] = T['p3'].replace(OLD_MADE, "PAY.dk&&typeof PAY.dk==='object'?PAY.dk:(PAY.dk=dkPressMade({}))")

# --- pbPool: only legs with an id, where the payload carries ids; the rest counted for the note ---
sub1('p3', """function pbPool(games){
  const edge=c=>c.p-mlProb(c.price), formOut=typeof window.eloLoaded==='function'&&!window.eloLoaded();
  const pref=[], thin=[], plGames=new Set(), fm={}; let far=0, farDk=0;
  for(const c of pricedLegs(games)){
    if(!isGameLeg(c)) plGames.add(c.gid);
    if(!pbAllows(c)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;
    /* until the Elo files are in, no player leg qualifies at all, as before */
    if(c.grp!=='TEAM'&&formOut) continue;
""", """function pbPool(games){
  const edge=c=>c.p-mlProb(c.price), formOut=typeof window.eloLoaded==='function'&&!window.eloLoaded();
  /* (app v109) where the payload carries DraftKings' ids, a leg qualifies only with one at its own line,
     so every leg a level suggests goes on DraftKings' betslip. A game counts as having player prices only
     where one of its player legs has an id (plNoId: games whose player legs have none), and the legs that
     would have qualified but for the id are counted for the panel's note (noId, noIdPl the players'; moved,
     movedPl those DraftKings had at another number). A game the payload has no ids for is as before */
  const hasId=c=>!dkCarries(c)||!!dkIdOf(c);
  const pref=[], thin=[], plGames=new Set(), plNoId=new Set(), fm={}; let far=0, farDk=0, noId=0, noIdPl=0, moved=0, movedPl=0;
  for(const c of pricedLegs(games)){
    const id=hasId(c);
    if(!isGameLeg(c)) (id?plGames:plNoId).add(c.gid);
    if(!pbAllows(c)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;
    /* until the Elo files are in, no player leg qualifies at all, as before */
    if(c.grp!=='TEAM'&&formOut) continue;
""")
sub1('p3', """    if(legFarOff(c,fm)){ far++; if(c.src==='dkline') farDk++; continue; }
""", """    if(legFarOff(c,fm)){ far++; if(c.src==='dkline') farDk++; continue; }
    /* no DraftKings id at its line: it cannot go on the slip, so it is not suggested (a leg far off
       the market is counted as that, above, as before) */
    if(!id){ const pl=!isGameLeg(c); noId++; if(pl) noIdPl++; if(dkAtAnother(c)){ moved++; if(pl) movedPl++; } continue; }
""")
sub1('p3', """    if(c&&pbAllows(c)&&c.src==='real'&&isFinite(c.price)&&c.price!==0&&c.p>=PB_PMIN&&c.p<PB_PMAX) mkt.push({...c,thin:false,market:true}); }
  return {pref:pbCap(pref),thin:pbCap(thin),mkt:pbCap(mkt),plGames:plGames.size,far,farDk};""",
    """    if(c&&pbAllows(c)&&c.src==='real'&&isFinite(c.price)&&c.price!==0&&c.p>=PB_PMIN&&c.p<PB_PMAX){
      /* a total with no DraftKings id at its number is counted for the note too */
      if(hasId(c)) mkt.push({...c,thin:false,market:true}); else { noId++; if(dkAtAnother(c)) moved++; } } }
  return {pref:pbCap(pref),thin:pbCap(thin),mkt:pbCap(mkt),plGames:plGames.size,far,farDk,noId,noIdPl,moved,movedPl,plNoId:[...plNoId].filter(id=>!plGames.has(id)).length};""")

# --- why a tier is empty: player legs priced and none of them with an id ---
sub1('p3', """const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
""", r"""const PB_NO_PL='no player prices yet: they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET).';
/* (app v109) player legs priced on the ticked games, and none with a DraftKings id: a line read by Refresh
   odds carries none, and DraftKings' own come only with the prices the pull buys */
const PB_PULLED='pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET)';
const PB_NO_ID='no player legs DraftKings’ betslip can take yet: a player’s line read by Refresh odds carries no DraftKings id (ESPN gives none for it), and DraftKings’ own ids come with its prices, which are '+PB_PULLED+'.';
""")
sub1('p3', """  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks`:`No ${n}-leg parlay on your picks`;""",
    """  /* (app v109) short of legs only for want of DraftKings' ids: said so */
  const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} on your picks${pool.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay on your picks`;""")
sub1('p3', """  if(c&&c.players&&!pool.plGames){ const np=c.espn?pbNoPl():PB_NO_PL; return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""",
    """  if(c&&c.players&&!pool.plGames){ const np=pool.plNoId?PB_NO_ID:(c.espn?pbNoPl():PB_NO_PL); return c.teams?`${what}, and ${np}`:np[0].toUpperCase()+np.slice(1); }""")
sub1('p3', """  out.pref=pool.pref.length; out.thin=pool.thin.length; out.mkt=pool.mkt.length; out.far=pool.far; out.farDk=pool.farDk||0; out.noPlayerPrices=c.players&&!pool.plGames;""",
    """  out.pref=pool.pref.length; out.thin=pool.thin.length; out.mkt=pool.mkt.length; out.far=pool.far; out.farDk=pool.farDk||0; out.noPlayerPrices=c.players&&!pool.plGames;
  out.noId=pool.noId||0; out.noIdPl=pool.noIdPl||0; out.moved=pool.moved||0; out.movedPl=pool.movedPl||0; out.plNoId=pool.plNoId||0;""")

# --- the panel's notes ---
sub1('p3', """  if(r.noPlayerPrices&&r.tiers.some(t=>t.legs)) notes.push(r.espnRead?""",
    """  /* (app v109) player legs priced and none with a DraftKings id: the levels are built without them, and why */
  const noIdNote=r.noPlayerPrices&&r.plNoId&&r.tiers.some(t=>t.legs);
  if(noIdNote) notes.push(`No player leg on your picks can go on DraftKings’ betslip yet, so the tiers below are built without player legs: ${PB_NO_ID.replace(/^no player legs DraftKings’ betslip can take yet: /,'')}`);
  else if(r.noPlayerPrices&&r.tiers.some(t=>t.legs)) notes.push(r.espnRead?""")
sub1('p3', """  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.far&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(espnW?""",
    """  /* legs left out for want of a DraftKings id at their line, beyond what the note above says (which covers
     every player leg): those DraftKings had at another number (the parlay card would put them on at its
     number), and those it had none for, each said apart */
  const mvN=r.moved-(noIdNote?r.movedPl:0), noneN=r.noId-r.moved-(noIdNote?r.noIdPl-r.movedPl:0), nonePl=noIdNote?0:r.noIdPl-r.movedPl, mvTeam=r.moved-r.movedPl;
  if(noneN) notes.push(`${noneN} leg${noneN===1?' is':'s are'} left out: a suggested parlay takes only legs DraftKings’ betslip can take, by DraftKings’ own id at the leg’s line, and DraftKings has none for ${noneN===1?'it':'them'} yet${nonePl?`. A player’s line read by Refresh odds carries no id (ESPN gives none for it); DraftKings’ own player ids come with its prices, which are ${PB_PULLED}`:''}. ${noneN===1?'It is':'They are'} still on the game pages, where you can add ${noneN===1?'it':'them'} to the builder.`);
  if(mvN) notes.push(`${mvN} leg${mvN===1?' is':'s are'} left out: DraftKings had ${mvN===1?'it':'them'} only at another number when its lines were last read, and a suggested parlay takes only legs DraftKings’ betslip can take at their own line${mvTeam?'. Refresh odds reads DraftKings’ current spreads and totals, which the levels can take':''}. Added to the builder from the game pages, ${mvN===1?'it goes':'each goes'} on DraftKings’ slip at DraftKings’ number.`);
  if(r.kinds&&r.ticked&&!r.pref&&!r.thin&&!r.far&&!r.noId&&!r.noPlayerPrices&&(u.k.ml||u.k.ats||u.k.over||u.k.under)) notes.push(espnW?""")

# --- a game page's hands: only legs with an id, where the payload carries ids ---
sub1('p3', """function gameLegPool(g){
""", """function gameLegPool(g,all){
""")
sub1('p3', """  const fm={};
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.price>=GAME_LEG_MIN&&c.p>=0.40&&c.p<0.97&&sideAllows(c)&&!legFarOff(c,fm));""",
    """  /* (app v109) where the payload carries DraftKings' ids for the game, only a leg DraftKings' betslip can
     take (all: every leg as before, to count those the ids left out) */
  const fm={}, dkOn=!all&&dkCarries({week:g.w,gid:g.id});
  return out.filter(c=>isFinite(c.price)&&c.price!==0&&c.price>=GAME_LEG_MIN&&c.p>=0.40&&c.p<0.97&&sideAllows(c)&&!legFarOff(c,fm)&&(!dkOn||!!dkIdOf(c)));""")

# --- a game page's hand left empty for want of DraftKings' ids says so, and why ---
sub1('p3', """    val[id]=legs?{...done(legs),relaxed,floor}:null;
    if(legs) prev=legs;
  }
""", """    val[id]=legs?{...done(legs),relaxed,floor}:null;
    if(legs) prev=legs;
  }
  /* (app v109) the legs DraftKings' ids left out, counted where a hand came out empty */
  val.noId=GAME_TIERS.some(([id])=>!val[id])&&dkCarries({week:g.w,gid:g.id})?gameLegPool(g,true).length-pool.length:0;
""")
sub1('p3', """/* on the parlay means this exact line, threshold and side are ticked */
""", r"""/* (app v109) why a hand is empty where DraftKings' ids left legs out: a hand takes only legs DraftKings'
   betslip can take, and a game's player ids come with its player prices, which are not pulled yet, or
   never for Sunday's early games; with them in, its other lines DraftKings had no id for */
function gameNoIdWhy(g,n){
  const D=((PAY.dk||{})[String(g.w)]||{})[g.id]||{}, pl=!!D.at||Object.keys(D).some(k=>!/^(team:|game\|)/.test(k)&&!['event','at','glat'].includes(k));
  const head=`Only legs DraftKings’ betslip can take are suggested here, and this game does not have enough of them for ${n} legs`;
  if(pl) return `${head}: DraftKings had no id for its other lines when its prices were read.`;
  if(dkEarlySunday(g)) return `${head}: DraftKings’ player ids come with its player prices, which are never pulled for Sunday’s early games (before 4pm ET).`;
  return `${head} yet: DraftKings’ player ids come with its player prices, which are ${PB_PULLED}.`;
}
/* on the parlay means this exact line, threshold and side are ticked */
""")
sub1('p3', """<p class="muted" style="margin:6px 0 0;font-size:12px">This game does not have ${n} lines to build from yet.</p>""",
    """<p class="muted" style="margin:6px 0 0;font-size:12px"${T.noId?' data-gsugg-noid':''}>${T.noId?esc(gameNoIdWhy(g,n)):`This game does not have ${n} lines to build from yet.`}</p>""")

# --- the builder: what DraftKings' slip will take of each leg, where the parlay card is on the page ---
sub1('p3', """  const fm={};
  legs.forEach((l,i)=>{
    const [c,lbl]=confTier(l.p), f=legFair(l,fm), far=!!f&&l.p-f.p>=FAR_OFF-1e-9;""",
    """  /* (app v109) the parlay card's own reading of each leg for DraftKings' betslip (window.PARLAY_CARD's
     dkPlan, on the hub page only), so the builder says before Finish which leg goes on at DraftKings'
     number and which cannot go on yet. Nothing where a leg goes on as built, nor without the card */
  const fm={}, slip=dkSlipRows(legs,prices);
  legs.forEach((l,i)=>{
    const [c,lbl]=confTier(l.p), f=legFair(l,fm), far=!!f&&l.p-f.p>=FAR_OFF-1e-9;""")
sub1('p3', """      <td><b>${esc(l.label)}</b>${far?`<small class="faroff" data-far>${farText(l.p,f)}</small>`:''}</td>""",
    """      <td><b>${esc(l.label)}</b>${far?`<small class="faroff" data-far>${farText(l.p,f)}</small>`:''}${dkSlipLine(slip&&slip[i],i)}</td>""")
sub1('p3', """function renderParlay(o){
""", r"""/* the card's plan for the builder's legs, each read as the card reads it (fromBuilder: its price's source
   decides whether it carries a book price); null without the card */
function dkSlipRows(legs,prices){
  const C=window.PARLAY_CARD; if(!C||typeof C.dkPlan!=='function') return null;
  try{ const p=C.dkPlan(legs.map((l,i)=>Object.assign({},l,l.src==='dkline'&&prices[i].src!=='dkline'?{src:prices[i].src}:{},
      {card:{tag:prices[i].src==='real'?'book':(prices[i].src==='fair'?'fair':'est.')}})));
    return p&&Array.isArray(p.each)?p.each:null; }catch(e){ return null; }
}
function dkSlipLine(x,i){
  if(!x) return '';
  if(x.id&&x.swap) return `<small class="dkslip" data-dkslip="${i+1}">On DraftKings as ${esc(x.swap)}</small>`;
  if(x.id) return '';
  return `<small class="dkslip" data-dkslip="${i+1}">Not on DraftKings’ slip yet: ${esc(x.brief||x.why||'')}</small>`;
}
function renderParlay(o){
""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print("patched: app v109, suggestions only from legs DraftKings' betslip can take, and the builder says which of its own will not go on as built")
