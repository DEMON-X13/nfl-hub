"""The betting model's parlays track live here too (app v53).

Both sites are served from one origin, so the betting model's storage key is readable from
this page. Its Bet Build parlays are moneyline legs on whole games, which means they need
only the scoreboard -- no box score, no name matching, the sturdiest half of the live
machinery. A parlay built over there now shows up under Saved parlays with the same live
column: who is winning, by how much, and which legs have already landed.

Read only, and read defensively. This page never writes to the betting model's key, storage
access is wrapped because a browser can refuse it outright, and anything malformed is
skipped rather than guessed at. The two apps agree on nflverse game ids
("2026_01_NE_SEA"), so a leg maps onto our schedule with no translation.

Only parlays with a game still to finish are listed, because this card exists to be watched;
the betting model remains the place where its own bets are settled and recorded. Nothing
here is copied into our state -- it is read on each render and thrown away.

The limit worth knowing is the browser's, not ours: localStorage does not travel between
devices, so this finds the parlays saved in the browser it is running in. Moving them is
what the Backup tab on each site is for.
"""
from pathlib import Path

HERE = Path(__file__).parent
J2 = HERE / 'part2.js'
J3 = HERE / 'part3.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- 1. the reader ----
sub1(J2, """/* ---------- track record: every frozen pre-game chance against what happened ----------""",
     """/* ---------- the betting model's parlays, read across ----------
   One origin serves both sites, so its key is readable here. Read only and defensively:
   this page never writes to it, storage can be refused outright, and a malformed entry is
   skipped rather than guessed at. Both apps use nflverse game ids, so nothing is translated. */
const BET_KEY='x_nfl_viewer_picks_2026';
function bettingParlays(raw){
  if(raw===undefined){ try{ raw=localStorage.getItem(BET_KEY); }catch(e){ return []; } }
  if(!raw) return [];
  let v=null; try{ v=JSON.parse(raw); }catch(e){ return []; }
  const build=v&&v.bank&&v.bank.build;
  if(!Array.isArray(build)) return [];
  const out=[];
  for(const b of build){
    if(!b||b.type!=='parlay'||!Array.isArray(b.legs)) continue;
    const legs=[];
    for(const l of b.legs){
      if(!l||!l.game_id||!l.pick) continue;
      const ml=(l.ml==null||!isFinite(+l.ml))?null:+l.ml;
      legs.push({gid:String(l.game_id),team:String(l.pick),stat:'ml',k:0,side:'over',main:false,grp:'TEAM',
        name:TEAM_NAMES[l.pick]||String(l.pick),label:'To win',price:ml,week:+b.week||null});
    }
    if(legs.length<2) continue;                       /* two legs or it is not a parlay */
    const dec=legs.reduce((a,l)=>a*(l.price==null?1:(mlToDec(l.price)||1)),1);
    const stake=Math.max(0,+b.stake||0);
    out.push({id:String(b.id||''),week:+b.week||null,stake,legs,dec,
      priced:legs.every(l=>l.price!=null),payout:stake*dec});
  }
  return out;
}

/* ---------- track record: every frozen pre-game chance against what happened ----------""")

# ---- 2. the card ----
sub1(J3, """function wireSaved(){""",
     """/* the betting model's parlays, shown only while one of their games is still to finish:
   this card is for watching, and that site stays the place they are settled and recorded */
function renderBetParlays(){
  const all=bettingParlays();
  const live=all.filter(p=>p.legs.some(l=>{ const g=S.sched.find(x=>x.id===l.gid); return g&&!gameFinal(g); }));
  if(!live.length) return '';
  let html=`<div class="card" id="betParlays"><h2 style="display:flex;align-items:center;gap:10px">From the betting model <span class="pill">${live.length}</span>
    <span class="grow"></span><label class="muted sp-live"><input type="checkbox" id="liveCbB" ${LIVE.on?'checked':''}> Live</label></h2>
    <p class="muted" style="margin:0 0 12px;font-size:12px">Bet Build parlays saved in the betting model on this browser, every leg a team to win. They are settled and recorded over there; this only shows where they stand. <a href="../betting/">Open the betting model</a></p>`;
  for(const p of live){
    html+=`<div class="savedp" style="border-left:4px solid var(--gold)">
      <div class="sp-head"><span class="sp-title">${p.legs.length}-leg parlay</span>
        <span class="pill warn">live</span>
        <span class="muted" style="font-size:12px">${p.week?`week ${p.week}`:''}</span><span class="grow"></span></div>
      <div class="sp-money">
        <div><b>$${p.stake.toFixed(2)}</b><span>staked</span></div>
        <div><b>${p.priced?fmtML(decToML(p.dec)):'\\u2013'}</b><span>price</span></div>
        <div><b>${p.priced?'$'+p.payout.toFixed(2):'\\u2013'}</b><span>pays if it lands</span></div>
      </div>
      ${p.legs.map(l=>{ const lv=LIVE.on?liveCell(l):'';
        return `<div class="sp-leg"><span class="res">\\u25cb</span>
          <span class="nm">${esc(l.name)}<small>${esc(l.label)}${l.price!=null?' \\u00b7 '+fmtML(l.price):''}</small></span>
          <span class="rs">${lv||'<span class="muted">pending</span>'}</span>
          <span class="rs"></span></div>`;}).join('')}
    </div>`;
  }
  return html+'</div>';
}
function wireSaved(){
  $('liveCbB')?.addEventListener('change',e=>{ LIVE.on=e.target.checked; LIVE.err=null;
    if(LIVE.on) liveStart(); else { liveStop(); renderParlay(); } });""")

# ---- 3. the betting parlays join the games the live poll asks for ----
sub1(J3, """const liveWanted=()=>{                                   /* the games an unsettled saved parlay needs */
  const ids=new Set();
  for(const p of (S.saved||[])){ if(settleParlay(p).status!=='pending') continue;
    for(const l of p.legs) if(l.gid) ids.add(l.gid); }
  return ids;
};""",
     """const liveWanted=()=>{                                   /* every game an unsettled parlay needs */
  const ids=new Set();
  for(const p of (S.saved||[])){ if(settleParlay(p).status!=='pending') continue;
    for(const l of p.legs) if(l.gid) ids.add(l.gid); }
  for(const p of bettingParlays()) for(const l of p.legs){
    const g=S.sched.find(x=>x.id===l.gid); if(g&&!gameFinal(g)) ids.add(l.gid); }
  return ids;
};""")

# ---- 4. show it under Saved parlays, both ways into the tab ----
sub1(J3, """      </ul></div>`+renderSaved();""", """      </ul></div>`+renderSaved()+renderBetParlays();""")
sub1(J3, """  html+=renderSaved();""", """  html+=renderSaved()+renderBetParlays();""")

sub1(J2, "const APP_BUILD='app v52 \\u00b7 2026-09-20';", "const APP_BUILD='app v53 \\u00b7 2026-09-20';")

# ---- 5. audit: the reader, against fixtures ----
sub1(A, """      console.log('T. live tracking: box score, name matching, leg states and scoreboard mapping all parse'); }""",
     """      console.log('T. live tracking: box score, name matching, leg states and scoreboard mapping all parse'); }

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
      chk(/bettingParlays\\(\\)/.test(String(F('liveWanted'))),'the live poll does not cover betting parlays');
      /* and none of it may reach our own state */
      chk(!(S.saved||[]).some(p=>p.id==='b1'),'a betting parlay was copied into our saved parlays');
      console.log(`U. betting parlays: ${got.length} read from a fixture, singles and malformed entries skipped`); }""")

print("the betting model's parlays show and track live in the prop model; app v53")
