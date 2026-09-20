"""A ticked leg is locked: Shuffle keeps it and changes the rest (app v50).

Shuffle dealt all three legs again every time, which made it a re-roll rather than a
way to build something. Now a leg you tick is locked, and Shuffle deals the others
around it: lock one and the other two change, lock two and only the third does. The
tick that was already there does the work, so there is no second thing to click, and
"on the parlay" and "locked" are deliberately the same state -- a leg you have taken is
a leg you want kept.

The header's Shuffle button goes dead once every leg is locked, because there is
nothing left for it to change, and the footer says which it is: nothing locked, some
locked, or all of them. A shuffle that comes back empty with legs locked says the locks
are what boxed it in rather than blaming the week's prices.

The candidate pool, the floor, the per-player and team caps and the confidence band are
all untouched: locked legs are simply the starting hand the search grows from, so an
alternative built around them clears the same bars as one dealt from nothing.
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


# ---- 1. one definition of "this leg is on the parlay", used by all three readers ----
sub1(J, """function shownSuggestion(g){ const a=gameAlternate(g); return (a&&a.val)||gameSuggestion(g); }""",
     """function shownSuggestion(g){ const a=gameAlternate(g); return (a&&a.val)||gameSuggestion(g); }
/* on the parlay means this exact line, threshold and side are ticked -- and on a
   suggestion that also means locked: Shuffle deals the other legs around it */
const suggestLegOn=l=>{ const c=S.parlay[l.key]; return !!c&&c.k===l.k&&c.side===l.side&&!!c.main===!!l.main; };""")

# ---- 2. the search grows from the locked legs instead of from nothing ----
sub1(J, """function shuffleSuggestion(g){
  const base=gameSuggestion(g);
  if(base.legs.length<2) return null;
  const pool=suggestCandidates([g]).slice(0,GAME_SHUFFLE_POOL);
  if(pool.length<=base.legs.length) return null;                 /* nothing left to swap in */
  const want=base.legs.length, rnd=mulberry((Date.now()+(GAME_SHUFFLE_N++)*7919)|0);""",
     """function shuffleSuggestion(g){
  const base=gameSuggestion(g);
  if(base.legs.length<2) return null;
  const want=base.legs.length;
  /* a ticked leg is locked: it is the hand this deal starts from, so everything below
     grows around it and the floor and caps still have to hold for the whole parlay */
  const locked=shownSuggestion(g).legs.filter(suggestLegOn).slice(0,want);
  if(locked.length>=want) return null;                           /* nothing left to change */
  const pool=suggestCandidates([g]).slice(0,GAME_SHUFFLE_POOL);
  if(pool.length<=want) return null;                             /* nothing left to swap in */
  const rnd=mulberry((Date.now()+(GAME_SHUFFLE_N++)*7919)|0);""")

sub1(J, """  for(let t=0;t<GAME_SHUFFLE_TRIES&&(!best||best.gap>GAME_SHUFFLE_BAND);t++){
    let legs=[];""",
     """  for(let t=0;t<GAME_SHUFFLE_TRIES&&(!best||best.gap>GAME_SHUFFLE_BAND);t++){
    let legs=[...locked];""")

# ---- 3. the card: a locked leg says so, Shuffle dies when they all are ----
sub1(J, """  const stake=Math.max(0,+S.stake||0), ml=decToML(s.dec);""",
     """  const stake=Math.max(0,+S.stake||0), ml=decToML(s.dec);
  const nLock=s.legs.filter(suggestLegOn).length, free=s.legs.length-nLock;""")

sub1(J, """      <button class="btn quiet gsugg-alt" data-suggest-shuffle="${g.id}"${s.candidates>s.legs.length?'':' disabled'} aria-label="Shuffle another parlay of the same confidence for this game">\\u21bb Shuffle</button>""",
     """      <button class="btn quiet gsugg-alt" data-suggest-shuffle="${g.id}"${s.candidates>s.legs.length&&free?'':' disabled'} aria-label="Shuffle the legs that are not locked, keeping the same confidence">\\u21bb Shuffle</button>""")

sub1(J, """      const cur=S.parlay[l.key], on=!!cur&&cur.k===l.k&&cur.side===l.side&&!!cur.main===!!l.main;
      return `<li><label class="gsugg-pick${on?' on':''}">
        <input type="checkbox" ${on?'checked':''} data-leg="${l.key}" data-k="${l.k}" data-side="${l.side}"${l.main?' data-main="1"':''} aria-label="Add ${esc(l.name)}, ${esc(l.label)}, to the parlay">
        <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span>""",
     """      const on=suggestLegOn(l);
      return `<li><label class="gsugg-pick${on?' on':''}">
        <input type="checkbox" ${on?'checked':''} data-leg="${l.key}" data-k="${l.k}" data-side="${l.side}"${l.main?' data-main="1"':''} aria-label="${on?'Unlock':'Lock'} ${esc(l.name)}, ${esc(l.label)}, and ${on?'take it off':'put it on'} the parlay">
        <span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span>${on?'<span class="lk">locked</span>':''}""")

sub1(J, """      <button class="btn quiet gsugg-all" data-suggest-all="${g.id}">${s.legs.every(l=>{const c=S.parlay[l.key];return !!c&&c.k===l.k&&c.side===l.side&&!!c.main===!!l.main;})?'On the parlay':'Add all'}</button>""",
     """      <button class="btn quiet gsugg-all" data-suggest-all="${g.id}">${free?'Add all':'On the parlay'}</button>""")

# ---- 4. the footer says what the locks are doing ----
sub1(J, """Tick a leg to put it on the parlay.${s.alt?' Shuffle deals a different set of legs at about the same chance; the model\\u2019s own pick comes back with Original, or by leaving the game and opening it again.':''}${alt&&alt.miss?' <b>Nothing else in this game comes out at the same confidence, so the model\\u2019s own pick stands.</b>':''}""",
     """Tick a leg to put it on the parlay and lock it there.${nLock===0?' Shuffle changes all three; lock the ones you want and it deals the rest around them.':(free?` <b>${nLock} locked</b>, so Shuffle changes the other ${free}.`:' <b>Every leg is locked</b>, so Shuffle has nothing left to change \\u2014 untick one to free it.')}${s.alt?' The model\\u2019s own pick comes back with Original, or by leaving the game and opening it again.':''}${alt&&alt.miss?(nLock?' <b>Nothing else clears the same confidence around those locked legs \\u2014 untick one to give Shuffle more room.</b>':' <b>Nothing else in this game comes out at the same confidence, so the model\\u2019s own pick stands.</b>'):''}""")

# ---- 5. the locked tag ----
sub1(H, """.gsugg-legs .nm small{display:block;color:var(--ink-2);font-size:12px}""",
     """.gsugg-legs .nm small{display:block;color:var(--ink-2);font-size:12px}
.gsugg-legs .lk{flex:none;align-self:center;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pick);white-space:nowrap}""")

sub1(P2, "const APP_BUILD='app v49 \\u00b7 2026-09-20';", "const APP_BUILD='app v50 \\u00b7 2026-09-20';")

# ---- 6. audit ----
# Add all has just ticked every leg, which now locks every leg: clear it, or the plain
# shuffle below would be testing the all-locked case by accident.
sub1(A, """      /* Shuffle: a different parlay of the same confidence, and the original still there */
      const sh=d.querySelector('[data-suggest-shuffle]');""",
     """      /* Add all has just locked every leg; the plain shuffle is tested with none locked */
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      /* Shuffle: a different parlay of the same confidence, and the original still there */
      const sh=d.querySelector('[data-suggest-shuffle]');""")

sub1(A, """      /* leaving the game and opening it again starts back at the model's own pick */""",
     """      /* a ticked leg is locked: every shuffle has to keep it */
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      const lockBox=d.querySelector('.gsugg-legs input[data-leg]'), lockKey=lockBox.dataset.leg;
      lockBox.click();
      chk(Object.keys(S.parlay).length===1,'ticking a suggested leg did not lock it on the parlay');
      chk(!!d.querySelector('.gsugg-legs .lk'),'a locked leg is not marked locked');
      let keptAll=true, lockedAlts=0;
      for(let i=0;i<4;i++){
        const b=d.querySelector('[data-suggest-shuffle]'); if(!b||b.disabled) break;
        b.click();
        const a=F('gameAlternate')(g); if(!a||!a.val) continue;
        lockedAlts++;
        if(!a.val.legs.some(l=>l.key===lockKey)) keptAll=false;
        chk(a.val.legs.length===s2.legs.length,'a shuffle around a locked leg changed the parlay size');
      }
      chk(keptAll,'shuffle dropped a locked leg');
      if(lockedAlts) chk(!!d.querySelector('.gsugg-legs input[data-leg]:checked'),'the locked leg lost its tick after a shuffle');
      /* every leg locked leaves shuffle nothing to do, and it says so rather than pretending */
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      d.querySelector('[data-suggest-all]').click();
      chk(d.querySelector('[data-suggest-shuffle]').disabled,'shuffle is still live with every leg locked');
      chk(/Every leg is locked/.test(d.querySelector('.gsugg').textContent),'an all-locked card does not say why shuffle is dead');
      chk(F('shuffleSuggestion')(g)===null,'shuffle dealt a parlay with every leg locked');
      S.parlay={}; d.querySelector('[data-game="'+g.id+'"]').click();
      /* leaving the game and opening it again starts back at the model's own pick */""")

print('a ticked leg is locked; shuffle deals the rest around it; app v50')
