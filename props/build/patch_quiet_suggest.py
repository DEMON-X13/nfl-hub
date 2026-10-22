"""app v130 (Suggested Parlays and the Refresh odds status line): no descriptions, each line its state alone.

The owner's call of 22 October 2026:

  "in all sections get rid of all text wall descriptions. i dont want any descriptions anywhere. i want the site to
  speak for itself without a bunch of reading."

Suggested Parlays had kept, after app v113 took its lead, foot and record sentence away, a sentence on almost every line
it still drew: the lock line said why it locks when it does, a level the page built again said it was built again, a
set the record had none for said why the record would not grade it, the wait line said which night's game its morning
follows, an empty level said what a parlay takes after saying why it was empty, and every card with a leg priced from
DraftKings' line read on ESPN (nearly every card since app v125) carried a two-sentence warning. The Refresh odds
status line, drawn beside each of its five buttons, was a sentence too. Each is now its state alone, the names, numbers
and times it carries kept; what went is each clause that explains.

1. The status line (espnStatus): "DraftKings via ESPN, Tue 8:07 AM ET · player prices est." before a press, "· 3 games
   with no player lines yet" after it where the read found none posted (a game's page: "· no player lines yet");
   after a press "DraftKings via ESPN, read 8:07 PM ET · player prices est.", "DraftKings via ESPN for 1 of 14 games
   (NE at CHI), read ..." where it read some of the week's games, "DraftKings game lines via ESPN, read ..." where it
   read the game lines alone; a read set aside "newer prices published since your read" ("... of 2 games" on the
   week's line); "couldn't read player lines for 2 games" and "couldn't reach ESPN for 2 games", with no clause on
   whose prices stand; the parts joined by " · ". "Prices as published Tue 8:07 AM ET." stays. Gone: "press Refresh odds
   here for the rest" (the button is beside the line, and "for 1 of 14 games" says the read was partial).
2. A set's lines (spGameHtml): "Locks Sun 6:20 PM ET." (no ", 2 hours before kickoff"); "Locked since X. This browser's
   own set (not graded)."; the Sunday slot under way "Locked since X. Under way since Y." and " Not published in time."
   or " This browser's own set (not graded)."; "This browser's own Elo picks (not graded)." The loading lines, the
   locked line and "The site's Elo picks were not published in time." stay.
3. No set to show (spNightHtml, spSlotHtml): "Regular season over.", "No night game left in week 7.", "No Sunday game
   left in week 7."; the wait lines "Next up: Monday night, Commanders at 49ers. Set goes up Mon 6:00 AM ET." ("Sets go
   up" for two games) and "Next up: week 8's Sunday slot, 11 games. Sets go up Fri 6:00 AM ET.", with no ", the morning
   after ...".
4. A level's card (pbTierCard): "Updated: Bo Nix ruled out (Sun 5:30 PM ET)." (no "; this level was built again"); the
   est. line "Price est. from DraftKings' line, read Tue 8:07 AM ET." (a money warning in a few words: each leg still
   wears its est. mark, and the price its "price, est."); "no fair chance" alone; the rule beside its legs pill
   "25%+ by the model" (the floor is a number the card states, and blocking checks hold the legs to it; "best return that
   lands" went), the likeliest forms as they were. Every card is quiet now: pbThinLine and pbMktLine, the lines saying
   why a leg is not a Value pick or why the game total is there, are gone with o.quiet and o.mktWhy (no visitor saw
   them since app v113: every set's and Elo pick's card was drawn quiet, and the all-games panel is drawn nowhere).
5. An empty level's why (spWhy, spWhySlot, spNoPl, spEloSet): the reason before the colon alone, "No 4-leg parlay in
   this game.", "Only 3 legs in this game.", "No 4 of this game's legs go together on DraftKings' slip.", the slot's
   "... in any one game of the Sunday slot"; with no player lines "Only 3 legs in this game: no player lines yet (read
   Tue 8:07 AM ET)." or ": player lines not read yet."; the Elo picks' "No player lines in this game yet (read Tue 8:07
   AM ET)." or "No player lines read yet."; the dormant id rule's "no player leg with a DraftKings id". DK_CLASH_WHY,
   DraftKings' rule spelled out after the colon, is gone.

The Elo picks' own words (tab_elo.html: eloPicks', eloUnitPerGame's and eloUnit's whys, epRuleOf) are edited there.
Nothing about which legs a level takes, its numbers, its lock or the record moves; the record takes each empty level's
new why on its next run before the lock, as it takes any set that has changed, and a locked entry keeps its words.
"""
import io

FILES = {'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'this level was built again.' in T['p3'], 'patch_quiet_suggest.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


# 1. the status line
sub1('p3', """  const pub=pubs.length&&tPub?`DraftKings’ lines as the site read them from ESPN ${espnWhen(tPub)}: player prices estimated from the line`
    +(pubNone?(gid?'; DraftKings had posted no player lines for it when the site read ESPN':`; ${pubNone} game${pubNone===1?'':'s'} had no player lines posted when the site read ESPN`):'')
    :`Prices as published${when}`;
  /* (app v108) a read this browser kept that gave way wholly, on this load, to prices published since */
  const gave=ids.filter(id=>ESPN_ASIDE[id]&&!espnPressed(id,w)&&!ESPN_GL[id]).length, gaveS=gave?(gid?'your earlier Refresh odds read gave way to prices published since'
    :`your earlier Refresh odds read of ${gave} game${gave===1?'':'s'} gave way to prices published since`):'';
  if(!ids.some(id=>ESPN_OUT[id])&&!read.length&&!lined.length) return pub+(gaveS?'; '+gaveS:'')+'.';""",
     """  /* (app v130) each part its state alone, joined by " · " (the owner's call of 22 October 2026: "i dont want any
     descriptions anywhere"); a full stop at the end, never a second one after "est." */
  const pub=pubs.length&&tPub?`DraftKings via ESPN, ${espnWhen(tPub)} · player prices est.`
    +(pubNone?(gid?' · no player lines yet':` · ${pubNone} game${pubNone===1?'':'s'} with no player lines yet`):'')
    :`Prices as published${when}`, fin=s=>/\\.$/.test(s)?s:s+'.';
  /* (app v108) a read this browser kept that gave way wholly, on this load, to prices published since */
  const gave=ids.filter(id=>ESPN_ASIDE[id]&&!espnPressed(id,w)&&!ESPN_GL[id]).length, gaveS=gave?(gid?'newer prices published since your read'
    :`newer prices published since your read of ${gave} game${gave===1?'':'s'}`):'';
  if(!ids.some(id=>ESPN_OUT[id])&&!read.length&&!lined.length) return fin(pub+(gaveS?' · '+gaveS:''));""", 'espnStatus: the published line')
sub1('p3', """  const parts=[read.length?`DraftKings’ lines from ESPN${of}, read ${espnClock(t)}: player prices estimated from the line`
    :(lined.length?`DraftKings’ game lines from ESPN${of}, read ${espnClock(t)}`:pub)];""",
     """  const parts=[read.length?`DraftKings via ESPN${of}, read ${espnClock(t)} · player prices est.`
    :(lined.length?`DraftKings game lines via ESPN${of}, read ${espnClock(t)}`:pub)];""", 'espnStatus: after a press')
sub1('p3', """  if(none) parts.push(gid?'DraftKings has posted no player lines for it yet':`${none} game${none===1?' has':'s have'} no player lines posted yet`);
  if(failP.length){ const n=failP.length, old=failP.filter(id=>espnPressed(id,w)).length;
    parts.push(gid?`couldn’t read DraftKings’ player lines: ${old?'the player lines read before stand':'the published player prices stand'}`
      :`couldn’t read DraftKings’ player lines for ${n} game${n===1?'':'s'}: ${n===1?'its':'their'} ${old===n?'player lines read before stand':(old?'player lines read before or published player prices stand':'published player prices stand')}`); }
  if(failS.length){ const n=failS.length, old=failS.filter(id=>espnPressed(id,w)||ESPN_GL[id]).length;
    parts.push(gid?`couldn’t reach ESPN: ${old?'the lines read before stand':'the published prices stand'}`
      :`couldn’t reach ESPN for ${n} game${n===1?'':'s'}: ${n===1?'its':'their'} ${old===n?'lines read before stand':(old?'lines read before or published prices stand':'published prices stand')}`); }
  if(gaveS) parts.push(gaveS);
  if(of&&(read.length||lined.length)) parts.push('press Refresh odds here for the rest');
  const s=parts.join('; ')+'.'; return s[0].toUpperCase()+s.slice(1);""",
     """  if(none) parts.push(gid?'no player lines yet':`${none} game${none===1?'':'s'} with no player lines yet`);
  if(failP.length){ const n=failP.length; parts.push(gid?'couldn’t read player lines':`couldn’t read player lines for ${n} game${n===1?'':'s'}`); }
  if(failS.length){ const n=failS.length; parts.push(gid?'couldn’t reach ESPN':`couldn’t reach ESPN for ${n} game${n===1?'':'s'}`); }
  if(gaveS) parts.push(gaveS);
  const s=fin(parts.join(' · ')); return s[0].toUpperCase()+s.slice(1);""", 'espnStatus: what the press found')

# 2. a set's lines
sub1('p3', """  const mark='<span class="sp-lockmark">Locked</span>', before=g.slot?'2 hours before the first kickoff':'2 hours before kickoff';
  const line=v.phase==='live'?`<p class="sp-lock" data-sp-phase="live">Locks ${lockT}, ${before}.</p>`
    :v.phase==='loading'?`<p class="sp-lock" data-sp-phase="loading">${mark} since ${lockT}. Loading the site’s set…</p>`
    :v.under?`<p class="sp-lock" data-sp-phase="under">${mark} since ${lockT}. Under way since ${spEt(kickoff(g).getTime(),true)}.${v.none?' The site’s set was not published in time.':v.own?' This browser’s own set: the site’s was not published in time, so the record does not grade it.':''}</p>`
    :v.own?`<p class="sp-lock" data-sp-phase="own">${mark} since ${lockT}. This browser’s own set: the site’s was not published in time, so the record does not grade it.</p>`""",
     """  /* (app v130) and its state alone: when it locks, whose set it is (the owner's call of 22 October 2026) */
  const mark='<span class="sp-lockmark">Locked</span>';
  const line=v.phase==='live'?`<p class="sp-lock" data-sp-phase="live">Locks ${lockT}.</p>`
    :v.phase==='loading'?`<p class="sp-lock" data-sp-phase="loading">${mark} since ${lockT}. Loading the site’s set…</p>`
    :v.under?`<p class="sp-lock" data-sp-phase="under">${mark} since ${lockT}. Under way since ${spEt(kickoff(g).getTime(),true)}.${v.none?' Not published in time.':v.own?' This browser’s own set (not graded).':''}</p>`
    :v.own?`<p class="sp-lock" data-sp-phase="own">${mark} since ${lockT}. This browser’s own set (not graded).</p>`""", 'spGameHtml: the lock lines')
sub1('p3', """${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,quiet:true,game:!!g.slot,mktWhy:'this game’s other legs do not make a parlay of this size',...ro})).join('')}""",
     """${v.tiers.map(t=>pbTierCard(t,{kind:'sp',fid:`${g.id}:${t.id}`,add:`data-sp-add="${g.id}:${t.id}"`,what,game:!!g.slot,...ro})).join('')}""", 'spGameHtml: the model cards')
sub1('p3', """<p class="sp-lock" data-sp-phase="eloown">This browser’s own Elo picks: the site’s were not published in time, so the record does not grade them.</p>""",
     """<p class="sp-lock" data-sp-phase="eloown">This browser’s own Elo picks (not graded).</p>""", "spGameHtml: this browser's own Elo picks")
sub1('p3', """add:`data-sp-add="${g.id}:${t.id}"`,what,noun:'Elo pick',quiet:true,game:!!g.slot,...ro})""",
     """add:`data-sp-add="${g.id}:${t.id}"`,what,noun:'Elo pick',game:!!g.slot,...ro})""", 'spGameHtml: the Elo pick cards')

# 3. no set to show, and the wait lines
sub1('p3', """  if(!G.length) return `<p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no Thursday, Sunday or Monday night game is left.`:`No Thursday, Sunday or Monday night game of week ${w} is still to kick off. Week ${w+1}’s sets come once its games are the week’s.`}</p>`;""",
     """  if(!G.length) return `<p class="pb-none">${seasonOver()?'Regular season over.':`No night game left in week ${w}.`}</p>`;""", 'spNightHtml: no night game')
sub1('p3', """  if(!On.length){ const N=spNight(), two=N.games.length>1, pn=N.prev?SP_NIGHT[new Date(N.prev+'T12:00:00Z').getUTCDay()]:null;
    const pg=N.prev?(S.sched||[]).filter(x=>spPrime(x)&&x.d===N.prev).length:0;
    wait=`<p class="pb-none sp-wait" data-sp-wait="${N.open!=null?spIso(N.open):''}" data-sp-next="${esc(N.games.map(x=>x.id).join(' '))}">Next up: ${SP_NIGHT[spDow(N.games[0])]}, ${esc(N.games.map(nm).join(' and '))}.${N.open!=null?` ${two?'Their sets go':'Its set goes'} up ${spEt(N.open,true)}, the morning after ${pn||'the night game before it'}’s ${pg>1?'games':'game'}.`:''}</p>`; }""",
     """  if(!On.length){ const N=spNight(), two=N.games.length>1;
    wait=`<p class="pb-none sp-wait" data-sp-wait="${N.open!=null?spIso(N.open):''}" data-sp-next="${esc(N.games.map(x=>x.id).join(' '))}">Next up: ${SP_NIGHT[spDow(N.games[0])]}, ${esc(N.games.map(nm).join(' and '))}.${N.open!=null?` ${two?'Sets go':'Set goes'} up ${spEt(N.open,true)}.`:''}</p>`; }""", 'spNightHtml: the wait line')
sub1('p3', """  if(!u) return seasonOver()?'':`<p class="pb-none" data-sp-none="slot">No Sunday game of week ${currentWeek()} is still to kick off.</p>`;
  if(!u.up){ const pn=u.prev?SP_NIGHT[new Date(u.prev+'T12:00:00Z').getUTCDay()]:null, pg=u.prev?(S.sched||[]).filter(x=>spPrime(x)&&x.d===u.prev).length:0;
    return `<p class="pb-none sp-wait" data-sp-wait="${u.open!=null?spIso(u.open):''}" data-sp-next="${esc(u.id)}">Next up: week ${u.w}’s Sunday slot, ${u.games.length} game${u.games.length===1?'':'s'}. Its sets go up ${spEt(u.open,true)}, the morning after ${pn||'the night game before it'}’s ${pg>1?'games':'game'}.</p>`; }""",
     """  if(!u) return seasonOver()?'':`<p class="pb-none" data-sp-none="slot">No Sunday game left in week ${currentWeek()}.</p>`;
  if(!u.up) return `<p class="pb-none sp-wait" data-sp-wait="${u.open!=null?spIso(u.open):''}" data-sp-next="${esc(u.id)}">Next up: week ${u.w}’s Sunday slot, ${u.games.length} game${u.games.length===1?'':'s'}. Sets go up ${spEt(u.open,true)}.</p>`;""", 'spSlotHtml: none, and the wait line')

# 4. a level's card
sub1('p3', """  return `Updated${u.by==='page'?' in this browser':''}: ${esc(u.name)} ${esc(u.reason||'ruled out')}${isFinite(at)?` (${spEt(at,true)})`:''}; this level was built again.`;""",
     """  return `Updated${u.by==='page'?' in this browser':''}: ${esc(u.name)} ${esc(u.reason||'ruled out')}${isFinite(at)?` (${spEt(at,true)})`:''}.`;""", 'spUpdLine')
sub1('p3', """/* what a leg priced from DraftKings' line read by Refresh odds is, on a level's card or an Elo pick's */
function pbEspnLine(legs){
  const e=legs.filter(l=>l.src==='dkline'), n=e.length, at=e.map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0];
  return `${n===1?'One leg is':n+' legs are'} priced from DraftKings’ line read on ESPN${at?' ('+espnWhen(at)+')':''}: the line is DraftKings’ own, the price our estimate of DraftKings’, so the price and payout are estimates. Check ${n===1?'it':'them'} on DraftKings before you bet.`;
}""",
     """/* what a leg priced from DraftKings' line read on ESPN is, on a level's card or an Elo pick's: a price that is an
   estimate, in a few words (app v130), each such leg wearing its est. mark too; dated by the oldest read */
function pbEspnLine(legs){
  const at=legs.filter(l=>l.src==='dkline').map(l=>l.espn&&l.espn.at).filter(Boolean).sort()[0];
  return `Price est. from DraftKings’ line${at?', read '+espnWhen(at):''}.`;
}""", 'pbEspnLine')
sub1('p3', """  return t.likeliest?`the likeliest ${n} legs`:t.floor?`best return that lands ${pct}%+ by the model`:'the likeliest pair';""",
     """  return t.likeliest?`the likeliest ${n} legs`:t.floor?`${pct}%+ by the model`:'the likeliest pair';""", 'pbRuleOf')
sub1('p3', """<small class="pb-model">no fair chance: a leg has no book price</small>""", """<small class="pb-model">no fair chance</small>""", 'pbChanceHtml: no fair chance')
sub1('p3', """/* what a thin edge means for the legs it is on. A team bet has no market + form (that is a player
   leg's second price, from his Elo), so it is thin only for missing the 3-point bar; a player leg
   is thin for that or for market + form not agreeing, where the Elo tab is on the page (form). A
   game total is never thin: it has no edge at all, and pbMktLine speaks for it */
/* what a total on a tier is: the book's own chance, so never a Value pick, there only because the picks' other legs
   do not make a parlay of the tier's size */
function pbMktLine(legs,why){
  const n=legs.filter(l=>l.market).length, one=n===1;
  return `${one?'The game total is':n+' game totals are'} at the book’s own chance with its margin out, so ${one?'it is not a Value pick':'they are not Value picks'}: ${one?'it is':'they are'} here because ${why||'your picks’ other legs do not make a parlay of this size'}.`;
}
""",
     """/* (app v130) no card says why a leg is not a Value pick or why the game total is there (pbThinLine and pbMktLine went,
   the owner's call of 22 October 2026: "i dont want any descriptions anywhere"): the Value mark says which legs are */
""", 'pbMktLine gone')
sub1('p3', """function pbThinLine(legs,form){
  const th=legs.filter(l=>l.thin), n=th.length, tm=th.filter(isGameLeg).length, p=n-tm, s=k=>k===1?'':'s';
  const bar='not 3 points above', both='not 3 points above with market + form agreeing';
  const tail=!form||!p?bar:!tm?both:`the team bet${s(tm)} ${bar}, and the player leg${s(p)} ${both}`;
  return `${n===1?'One leg is not a Value pick: the model rates it':n+' legs are not Value picks: the model rates them'} at or above the book's price, but ${tail}.`;
}
""", '', 'pbThinLine gone')
sub1('p3', """   o.legAdd false: no Add on each leg; o.quiet: no line saying why a leg is not a Value pick or why a total is there
   (a Suggested Parlays set's, app v113); o.acts false:""",
     """   o.legAdd false: no Add on each leg (o.quiet, a card with no line saying why a leg is not a Value pick or why a total
   is there, went in app v130: every card is so); o.acts false:""", "pbTierCard: its note")
sub1('p3', """  const form=formSig()!=='', fm={}, nE=t.legs.filter(l=>l.src==='dkline').length,""",
     """  const fm={}, nE=t.legs.filter(l=>l.src==='dkline').length,""", 'pbTierCard: no form for a thin line')
sub1('p3', """    ${t.thin&&!o.quiet?`<p class="pb-thin">${pbThinLine(t.legs,form)}</p>`:''}${t.mkt&&!o.quiet?`<p class="pb-thin">${pbMktLine(t.legs,o.mktWhy)}</p>`:''}${nE?`<p class="pb-thin pb-espnline">${pbEspnLine(t.legs)}</p>`:''}${upd}""",
     """    ${nE?`<p class="pb-thin pb-espnline">${pbEspnLine(t.legs)}</p>`:''}${upd}""", 'pbTierCard: quiet')

# 5. an empty level's why
sub1('p3', """/* why a level a game's legs make in number has no parlay that goes on one slip */
const DK_CLASH_WHY='it takes no quarterback’s passing TDs with a teammate’s touchdown, or his passing TDs over with the game total.';
""", '', 'DK_CLASH_WHY gone')
sub1('p3', """function spNoPl(g){ const t=espnLastRead(spGamesOf(g).map(x=>x.id));
  if(g.slot) return t?`no player lines yet: DraftKings had posted none for its games when their lines were last read from ESPN (${espnWhen(t)}).`
    :'no player lines yet: DraftKings’ lines for its games have not been read from ESPN yet.';
  return t?`no player lines yet: DraftKings had posted none for it when its lines were last read from ESPN (${espnWhen(t)}).`
    :'no player lines yet: its DraftKings lines have not been read from ESPN yet.'; }""",
     """function spNoPl(g){ const t=espnLastRead(spGamesOf(g).map(x=>x.id));
  return t?`no player lines yet (read ${espnWhen(t)}).`:'player lines not read yet.'; }""", 'spNoPl')
sub1('p3', """  if(!pool.plGames) return `${what}, and ${pool.plNoId?'no player leg DraftKings’ betslip can take: a player’s line read from ESPN carries no DraftKings id.':spNoPl(g)}`;
  /* (app v121) legs enough in number, but not on one slip */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])<n) return `No ${n} of this game’s legs go together on DraftKings’ slip: ${DK_CLASH_WHY}`;
  return `${what}: a parlay takes one leg a player, and one side and one total a game.`;""",
     """  if(!pool.plGames) return `${what}: ${pool.plNoId?'no player leg with a DraftKings id.':spNoPl(g)}`;
  /* (app v121) legs enough in number, but not on one slip */
  if(m>=n&&pbMaxFit([...pool.pref,...pool.thin,...(pool.mkt||[])])<n) return `No ${n} of this game’s legs go together on DraftKings’ slip.`;
  return `${what}.`;""", 'spWhy')
sub1('p3', """  if(!pl) return `${what}, and ${plNoId?'no player leg DraftKings’ betslip can take: a player’s line read from ESPN carries no DraftKings id.':spNoPl(u)}`;
  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  if(m>=n&&f<n) return `No ${n} legs of any one game of the Sunday slot go together on DraftKings’ slip: ${DK_CLASH_WHY}`;
  return `${what}: a parlay takes one game’s legs, one leg a player, and one side and one total a game.`;""",
     """  if(!pl) return `${what}: ${plNoId?'no player leg with a DraftKings id.':spNoPl(u)}`;
  const f=Math.max(0,...per.map(s=>s.fit==null?(s.max||0):s.fit));
  if(m>=n&&f<n) return `No ${n} legs of any one game of the Sunday slot go together on DraftKings’ slip.`;
  return `${what}.`;""", 'spWhySlot')
sub1('p3', """      const why=s.plNoId?`No player leg DraftKings’ betslip can take ${where}: a player’s line read from ESPN carries no DraftKings id.`
        :`No player lines ${where} yet: `+(t?`DraftKings had posted none${u.slot?' for its games':''} when ${u.slot?'their':'its'} lines were last read from ESPN (${espnWhen(t)}).`
          :(u.slot?'DraftKings’ lines for its games have not been read from ESPN yet.':'its DraftKings lines have not been read from ESPN yet.'));""",
     """      const why=s.plNoId?`No player leg with a DraftKings id ${where}.`:t?`No player lines ${where} yet (read ${espnWhen(t)}).`:'No player lines read yet.';""", "spEloSet: an empty Elo level's why")

for gone in ('this level was built again', 'so the record does not grade', 'Its set goes', 'Their sets go', 'Its sets go',
             "’s ${pg>1?'games':'game'}", 'a parlay takes one', 'DK_CLASH_WHY', 'pbThinLine(', 'pbMktLine(', '!o.quiet',
             'mktWhy', 'quiet:true', 'best return that lands', 'no fair chance: a leg has no book price',
             'so the price and payout are estimates', 'as the site read them from ESPN', 'player prices estimated from the line',
             'gave way to prices published since', 'press Refresh odds here for the rest', 'published prices stand',
             'lines read before stand', 'its DraftKings lines have not been read', 'for its games have not been read',
             'no player leg DraftKings’ betslip can take', "before=g.slot", 'is still to kick off', 'sets come once',
             'regular season is over: no Thursday'):
    assert gone not in T['p3'], gone

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: Suggested Parlays and the Refresh odds status line without their descriptions (app v130)')
