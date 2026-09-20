"""Shuffle: another parlay for the same game, at the same confidence (app v48).

A game page opens on one suggested parlay, the model's best answer for that game.
Shuffle deals a different one from the same pool: the same candidate lines, the same
Medium floor, but grown with a random hand instead of the greedy one, and the last leg
chosen to land the parlay within a few points of the original's chance. It is an
alternative, not a replacement -- it lives in memory only, so leaving the game and
opening it again brings back the model's own pick, and an Original button does the same
without leaving. Nothing about it is saved: a shuffle a visitor liked has to be ticked
onto the parlay like any other suggestion.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
H = HERE / 'part1.html'
A = HERE / 'audit.js'
P2 = HERE / 'part2.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- 1. the cache key becomes a function, so the alternative can expire with it ----
sub1(J, """function gameSuggestion(g){
  const sig=[g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||''].join('|');
  const hit=GAME_SUGGEST_CACHE[g.id];""",
     """function gameSuggestSig(g){
  return [g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||''].join('|');
}
function gameSuggestion(g){
  const sig=gameSuggestSig(g);
  const hit=GAME_SUGGEST_CACHE[g.id];""")

# ---- 2. the shuffle itself, and the memory it lives in ----
sub1(J, """function gameSuggestCard(g,locked){
  if(locked) return '';
  const s=gameSuggestion(g);""",
     """/* ---------- Shuffle: another parlay for the same game ----------
   The card opens on gameSuggestion(), the model's own answer. Shuffle deals a different
   hand from the same candidate pool: legs are taken at random from the best few at each
   step instead of the single best, and the last leg is the one that lands the parlay
   nearest the original's chance, so an alternative is a different bet of the same
   confidence rather than a longer or safer one. Alternatives are held here and nowhere
   else: they are not in S, so they are never saved, and leaving the game forgets them. */
const GAME_SHUFFLE_BAND=0.06,    /* close enough to the original's chance to stop looking */
      GAME_SHUFFLE_LIMIT=0.12,   /* further than this is a different bet, not an alternative */
      GAME_SHUFFLE_TRIES=10, GAME_SHUFFLE_POOL=18, GAME_SHUFFLE_TOP=4;
let GAME_SUGGEST_ALT={};         /* gid -> {sig,val,miss} */
let GAME_SHUFFLE_N=0;
function forgetGameAlternates(){ GAME_SUGGEST_ALT={}; }
/* an alternative is priced off the lines it was built from: if those move, it goes */
function gameAlternate(g){ const a=GAME_SUGGEST_ALT[g.id];
  if(!a) return null;
  if(a.sig!==gameSuggestSig(g)){ delete GAME_SUGGEST_ALT[g.id]; return null; }
  return a; }
function shownSuggestion(g){ const a=gameAlternate(g); return (a&&a.val)||gameSuggestion(g); }
const legSig=legs=>legs.map(l=>`${l.key}@${l.k}${l.side}${l.main?'m':''}`).sort().join(',');
function shuffleSuggestion(g){
  const base=gameSuggestion(g);
  if(base.legs.length<2) return null;
  const pool=suggestCandidates([g]).slice(0,GAME_SHUFFLE_POOL);
  if(pool.length<=base.legs.length) return null;                 /* nothing left to swap in */
  const want=base.legs.length, rnd=mulberry((Date.now()+(GAME_SHUFFLE_N++)*7919)|0);
  const seen=[legSig(base.legs)];
  const cur=gameAlternate(g); if(cur&&cur.val) seen.push(legSig(cur.val.legs));
  const fits=(legs,c)=>!legs.some(l=>l.key===c.key)
    &&!(c.grp==='TEAM'&&legs.some(l=>l.grp==='TEAM'))            /* one team bet per game */
    &&legs.filter(l=>l.pid===c.pid).length<2;                    /* at most two legs on one man */
  let best=null;
  for(let t=0;t<GAME_SHUFFLE_TRIES&&(!best||best.gap>GAME_SHUFFLE_BAND);t++){
    let legs=[];
    while(legs.length<want){
      const last=legs.length+1===want, ok=[];
      for(const c of pool){
        if(!fits(legs,c)) continue;
        const next=[...legs,c], p=parlayProb(next,1500).corr;
        if(next.length>=2&&p<GAME_SUGGEST_FLOOR) continue;
        /* on the way up, the best expected return; on the last leg, the one that keeps
           the parlay closest to the chance the original quoted */
        ok.push({c,rank:last?-Math.abs(p-base.corr):p*parlayDec(next.map(l=>({leg:l,ml:l.price})),1500)});
      }
      if(!ok.length) break;
      ok.sort((a,b)=>b.rank-a.rank);
      const take=ok.slice(0,Math.min(ok.length,last?3:GAME_SHUFFLE_TOP));
      legs=[...legs,take[Math.floor(rnd()*take.length)].c];
    }
    if(legs.length<2||seen.includes(legSig(legs))) continue;
    const corr=parlayProb(legs,20000).corr, gap=Math.abs(corr-base.corr);
    if(!best||gap<best.gap) best={legs,corr,gap};
  }
  if(!best||best.gap>GAME_SHUFFLE_LIMIT) return null;
  return {legs:best.legs,candidates:base.candidates,corr:best.corr,alt:true,
    dec:parlayDec(best.legs.map(l=>({leg:l,ml:l.price}))),
    mult:best.legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1)};
}
function gameSuggestCard(g,locked){
  if(locked) return '';
  const alt=gameAlternate(g), s=shownSuggestion(g);""")

# ---- 3. the card: Shuffle beside Add all, and a way back to the model's own pick ----
sub1(J, """  const stake=Math.max(0,+S.stake||0), ml=decToML(s.dec);
  return `<div class="card gsugg"><div class="gsugg-hd">
      <h2>Suggested parlay</h2><span class="conf med">Medium</span><span class="grow"></span>
      <button class="btn quiet gsugg-all" data-suggest-all="${g.id}">""",
     """  const stake=Math.max(0,+S.stake||0), ml=decToML(s.dec);
  return `<div class="card gsugg"><div class="gsugg-hd">
      <h2>Suggested parlay</h2><span class="conf med">Medium</span>${s.alt?'<span class="pill">shuffled</span>':''}<span class="grow"></span>
      ${s.alt?`<button class="btn quiet gsugg-orig" data-suggest-orig="${g.id}">Original</button>`:''}
      <button class="btn quiet gsugg-alt" data-suggest-shuffle="${g.id}"${s.candidates>s.legs.length?'':' disabled'} aria-label="Shuffle another parlay of the same confidence for this game">\\u21bb Shuffle</button>
      <button class="btn quiet gsugg-all" data-suggest-all="${g.id}">""")

sub1(J, """    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. These legs share a game, so the price is what a book pays for them together${s.mult&&s.mult>s.dec*1.02?`, not the ${fmtML(decToML(s.mult))} multiplying them would suggest`:''}. Tick a leg to put it on the parlay.</p></div>`;""",
     """    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. These legs share a game, so the price is what a book pays for them together${s.mult&&s.mult>s.dec*1.02?`, not the ${fmtML(decToML(s.mult))} multiplying them would suggest`:''}. Tick a leg to put it on the parlay.${s.alt?' Shuffle deals a different set of legs at about the same chance; the model\\u2019s own pick comes back with Original, or by leaving the game and opening it again.':''}${alt&&alt.miss?' <b>Nothing else in this game comes out at the same confidence, so the model\\u2019s own pick stands.</b>':''}</p></div>`;""")

# ---- 4. wiring: the buttons, and the alternative dying with the game ----
sub1(J, """  /* the whole suggestion at once, skipping any leg already on so it cannot toggle one off */
  $('gameView').querySelector('[data-suggest-all]')?.addEventListener('click',()=>{
    for(const l of gameSuggestion(g).legs){""",
     """  /* a different parlay of the same confidence, kept in memory only */
  $('gameView').querySelector('[data-suggest-shuffle]')?.addEventListener('click',()=>{
    const alt=shuffleSuggestion(g);
    GAME_SUGGEST_ALT[g.id]={sig:gameSuggestSig(g),val:alt,miss:!alt};
    renderGame(); });
  $('gameView').querySelector('[data-suggest-orig]')?.addEventListener('click',()=>{
    delete GAME_SUGGEST_ALT[g.id]; renderGame(); });
  /* the whole suggestion at once, skipping any leg already on so it cannot toggle one off */
  $('gameView').querySelector('[data-suggest-all]')?.addEventListener('click',()=>{
    for(const l of shownSuggestion(g).legs){""")

sub1(J, """function closeGame(){ S.ui.game=null; save(); closeGameModal(); renderSlate(); }""",
     """/* a shuffled parlay belongs to this visit to the game: opening the game again, from here
   or from the list, starts back at the model's own suggestion */
function closeGame(){ S.ui.game=null; forgetGameAlternates(); save(); closeGameModal(); renderSlate(); }""")

sub1(J, """    S.ui.game=b.dataset.game; S.ui.open={}; save(); renderGame(); }));""",
     """    S.ui.game=b.dataset.game; S.ui.open={}; forgetGameAlternates(); save(); renderGame(); }));""")

# ---- 5. the two new buttons wear the Add all button's size ----
sub1(H, """.gsugg-all{padding:5px 11px;font-size:12px}""",
     """.gsugg-all,.gsugg-alt,.gsugg-orig{padding:5px 11px;font-size:12px}""")

sub1(P2, "const APP_BUILD='app v47 \\u00b7 2026-09-19';", "const APP_BUILD='app v48 \\u00b7 2026-09-20';")

# ---- 6. audit ----
sub1(A, """      chk(/On the parlay/.test(d.querySelector('[data-suggest-all]').textContent),'the button does not say the parlay is already on');
      S.parlay=keepParlay;""",
     """      chk(/On the parlay/.test(d.querySelector('[data-suggest-all]').textContent),'the button does not say the parlay is already on');
      /* Shuffle: a different parlay of the same confidence, and the original still there */
      const sh=d.querySelector('[data-suggest-shuffle]');
      chk(!!sh,'no shuffle button on the game suggestion');
      chk(!sh.disabled,'shuffle is disabled with a pool of candidates available');
      const sig=ls=>ls.map(l=>l.key+'@'+l.k+l.side).sort().join(',');
      let shuffled=0;
      for(let i=0;i<4;i++){
        d.querySelector('[data-suggest-shuffle]').click();
        const a=F('gameAlternate')(g);
        chk(!!a,'shuffle left no answer at all');
        if(!a.val){ chk(a.miss&&/Nothing else in this game/.test(d.querySelector('.gsugg').textContent),'a shuffle that found nothing does not say so'); continue; }
        shuffled++;
        chk(a.val.legs.length>=2&&a.val.legs.length<=3,`a shuffled parlay ran to ${a.val.legs.length} legs`);
        chk(a.val.legs.every(l=>l.gid===g.id),'a shuffled parlay pulled in another game');
        chk(a.val.legs.every(l=>l.src==='real'),'a shuffled parlay used a line with no real price');
        chk(a.val.legs.filter(l=>l.grp==='TEAM').length<=1,'a shuffled parlay stacked two team bets');
        chk(a.val.legs.every(l=>a.val.legs.filter(x=>x.pid===l.pid).length<=2),'three shuffled legs landed on one player');
        chk(new Set(a.val.legs.map(l=>l.key)).size===a.val.legs.length,'a shuffled parlay repeated a line');
        chk(sig(a.val.legs)!==sig(s2.legs),'shuffle dealt the same parlay back');
        chk(Math.abs(a.val.corr-s2.corr)<=0.12,`a shuffled parlay is ${(Math.abs(a.val.corr-s2.corr)*100).toFixed(0)} points off the original's confidence`);
        chk(a.val.legs.length===2||a.val.corr>=0.30,'a shuffled parlay above two legs fell under the Medium floor');
        const card3=d.querySelector('.gsugg');
        chk([...card3.querySelectorAll('.gsugg-legs li')].length===a.val.legs.length,'the card and the shuffled parlay disagree on legs');
        chk(new RegExp(`${Math.round(a.val.corr*100)}% to land`).test(card3.textContent.replace(/\\s+/g,' ')),'the card does not show the shuffled chance');
        chk(sig(F('gameSuggestion')(g).legs)===sig(s2.legs),'shuffling changed the model\\'s own suggestion');
        /* Original puts the model's own pick back without leaving the game */
        d.querySelector('[data-suggest-orig]').click();
        chk(!F('gameAlternate')(g),'Original did not drop the shuffled parlay');
        chk([...d.querySelectorAll('.gsugg-legs li')].length===s2.legs.length,'Original did not bring back the suggestion');
      }
      chk(shuffled>0,'four shuffles produced no alternative at all');
      /* leaving the game and opening it again starts back at the model's own pick */
      d.querySelector('[data-suggest-shuffle]').click();
      if(F('gameAlternate')(g)){
        d.getElementById('backBtn').click();
        d.querySelector('[data-game="'+g.id+'"]').click();
        chk(!F('gameAlternate')(g),'a shuffled parlay survived leaving the game');
        chk([...d.querySelectorAll('.gsugg-legs li')].length===s2.legs.length,'reopening the game did not show the original suggestion');
      }
      /* the alternative is held outside S, so nothing about it is ever saved */
      chk(!/"alt":true/.test(JSON.stringify(S)),'a shuffled parlay reached the saved state');
      S.parlay=keepParlay;""")

print('Shuffle button on the game suggestion; alternatives forgotten on leaving the game; app v48')
