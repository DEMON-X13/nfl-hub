r"""app v127: no ladder bets anywhere: only main lines, anytime touchdowns and team bets.

The owner, 21 October 2026: "general question, is it possible to not do ladders and just include Same Game Parlay
eligible stuff show up since we are only doing parlay builder stuff", and, offered every place a ladder showed (the Top
30 lines, the Suggested Parlays sets, the Elo picks, the builder, the game page's Threshold ladders box), "yes".

A ladder bet is a player's over at a number that is not his main line (a rung k+, "250+ passing yards", "5+
receptions") or two or more touchdowns. One predicate says so, isLadder (part2.js, beside isGameLeg): a leg on a stat
the page prices (MKT) that is no game bet, and is either the anytime touchdown at two or more, or any other stat off
its main line. A leg on no known stat is never one, so nothing the visitor holds that the page cannot read is touched.

1. pricedLegs makes no rung any more, priced by a paid pull (S.odds) or from DraftKings' line read on ESPN (the
   published read's milestones, or a press's). It is the one source of every suggestion's player legs: the Parlay
   Builder's Top 30 lines, every Suggested Parlays set (each night game's and each Sunday slot game's), the all-games
   levels and the Elo picks (eloCands reads it), so none takes a ladder. It never made 2+ touchdowns. gameLegPool, the
   game page hands' engine (drawn nowhere since app v124), loses its own rung loop too. The Top 30's each-bet-once rule
   (once(), app v112) stays, dormant: no rung reaches it, and the checks hold it on made-up lines of their own.

2. A game's page on the Props tab offers no ladder: the Threshold ladders box (showRungs, #rungCb, S.ui.showRungs,
   which is not read any more) is gone, no rung row is drawn, the touchdown block's "Scores two or more" row is gone,
   and the line saying a threshold leg on the parlay was shown although the ladders were hidden goes with them. A stat
   DraftKings has posted no main line for shows its projection and "No DraftKings line yet." in place of an empty table.

3. toggleLeg refuses a ladder by any path (a box, an Add, the console); taking a leg off still works first.

4. A ladder kept in the builder from before (the browser's saved state, or a backup imported) is taken out when the page
   loads it (pbDropLadders, at boot and on an import), and the builder says so in one line until the visitor next changes
   it (PB_NOLADDER, data-pb-noladder; the builder's own drops of a game kicked off or FG attempts do not end it). A leg of a Suggested Parlays set locked before the change (spLegIn's kept) stays:
   the record grades that set as it locked, and Add to builder pays what its card says.

5. Words: the Top 30 foot says it lists only main lines, anytime touchdowns and team bets (its "Each bet is listed once"
   sentence named a rung that can no longer reach it, and "yards ladders" left the markets the estimate is checked on);
   ESPN_ERR, shown in every est. title, no longer names rungs.

statLines still builds every stat's rungs (they decide which stats a player has, and the Track Record grades the
model's frozen rung chances), the ESPN reader still reads DraftKings' milestones (the published read's shape, which
apply_espn and its tests hold), and settleLeg still settles the ladders the records hold. Nothing is graded again.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function isLadder(' not in T['p2'], 'patch_no_ladders.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


def cut(k, start, end, new, what):
    """replace the text from start (found exactly once) through the first end after it"""
    s = T[k]
    assert s.count(start) == 1, f'{what}: expected its start exactly once in {FILES[k]}, found {s.count(start)}'
    i = s.index(start)
    j = s.find(end, i + len(start))
    assert j > i, f'{what}: expected its end after its start in {FILES[k]}'
    T[k] = s[:i] + new + s[j + len(end):]


sub1('p2', "const APP_BUILD='app v126 \\u00b7 2026-10-21';", "const APP_BUILD='app v127 \\u00b7 2026-10-21';", 'APP_BUILD')

# the one predicate
sub1('p2', "function isGameLeg(l){ return l&&(l.stat==='ml'||l.stat==='ats'||l.stat==='total'); }\n",
     """function isGameLeg(l){ return l&&(l.stat==='ml'||l.stat==='ats'||l.stat==='total'); }
/* (app v127) a ladder bet: a player's over at a number that is not his main line (a rung k+, "250+ passing yards"), or
   two or more touchdowns. The site offers none since 21 October 2026 (the owner's call: "is it possible to not do
   ladders and just include Same Game Parlay eligible stuff"): no suggestion, game page or builder takes one, only main
   lines, the anytime touchdown and team bets. A leg on a stat the page does not price (none, or a game bet) is never
   one. The records still settle the ladders they hold (settleLeg) */
function isLadder(l){ const m=l&&!isGameLeg(l)&&MKT[l.stat]; return !!m&&(m.prob?(+l.k||1)>=2:!l.main); }
""", 'isLadder')

# 1. pricedLegs and gameLegPool make no rung
cut('p3', "        for(const r of l.rungs){ const od=oddsFor(g.id,x.pl.id,l.stat,r.k);\n",
    "label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }\n", '', 'pricedLegs: the rung loop')
sub1('p3', """   or a press) where no paid price is on file for it or its line has moved since (src 'dkline': a main line on passing, rushing or receiving
   yards, receptions or passing touchdowns, the anytime touchdown, a yards rung DraftKings lists). Team""",
     """   or a press) where no paid price is on file for it or its line has moved since (src 'dkline': a main line on passing, rushing or receiving
   yards, receptions or passing touchdowns, or the anytime touchdown). (app v127) No ladder bet: no rung k+, whatever
   prices it, and never 2+ touchdowns (isLadder), so no suggestion built from these takes one. Team""", 'pricedLegs: its note')
cut('p3', "      const key=legKey(g.id,x.pl.id,l.stat);\n      for(const r of l.rungs){ if(have.has(key+'@'+r.k+'over')) continue;\n",
    "label:`${r.k}+ ${l.m.lbl.toLowerCase()}`}); }\n", '', 'gameLegPool: the rung loop')
sub1('p3', """   lines (see patch_game_tiers_value.py): real prices where the book has them, the model's
   estimate of a book's price on every other ladder rung and touchdown, no leg shorter than""",
     """   lines (see patch_game_tiers_value.py): real prices where the book has them, the model's
   estimate of a book's price on every other touchdown (app v127: no ladder rung), no leg shorter than""", 'gameTiers: its note')

# 2. a game's page: no ladder box, no rung row, no 2+ touchdowns row, no note about either
sub1('p3', """/* the ladders are hidden unless turned on: without a real price they cannot be bet
   or picked by a suggestion, and they run to thirty rows a player. The model still
   builds every rung and the Track Record still grades them. A rung already on the
   parlay stays visible whatever the setting, so a leg can never count while hidden. */
function showRungs(){ return !!(S.ui&&S.ui.showRungs); }
""", """/* (app v127) a game's page offers no ladder bet (isLadder): no box to show the ladders, no rung row and no 2+
   touchdowns row. The model still builds every stat's rungs (statLines), and the Track Record still grades them. */
""", 'showRungs')
sub1('p3', """    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
    <label class="muted"><input type="checkbox" id="rungCb" ${showRungs()?'checked':''}> Threshold ladders</label>
""", """    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
""", 'the Threshold ladders box')
sub1('p3', """  if(!showRungs()&&Object.values(S.parlay||{}).some(l=>l.gid===g.id&&!l.main&&l.stat!=='ml'&&l.stat!=='ats'&&l.stat!=='any_td'))
    html+=`<p class="muted" style="margin:-4px 0 12px;font-size:12px">A threshold leg on your parlay is shown below even though the ladders are hidden, so nothing counts out of sight.</p>`;
""", '', 'the threshold note')
sub1('p3', "const tk=legKey(g.id,x.pl.id,'any_td'), tcur=S.parlay[tk]; const ton=!!tcur&&(tcur.k||1)<2, ton2=!!tcur&&tcur.k===2;",
     "const tk=legKey(g.id,x.pl.id,'any_td'), tcur=S.parlay[tk]; const ton=!!tcur&&(tcur.k||1)<2;", 'the touchdown block: ton2')
sub1('p3', "          const p2=tdPlus(l.p,2), [c2,lbl2]=confTier(p2);\n", '', 'the touchdown block: p2')
sub1('p3', "what=qb?'a rushing or receiving touchdown':'a touchdown', whats=qb?'two or more rushing or receiving touchdowns':'two or more touchdowns';",
     "what=qb?'a rushing or receiving touchdown':'a touchdown';", 'the touchdown block: whats')
cut('p3', """            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr>
            <tr class="${ton2?'on':''}">
""", """            <td class="num book real"></td></tr></table>""",
    """            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr></table>""", 'the touchdown block: the 2+ row')
sub1('p3', """<span class="was">(was ${M.was})</span>`:''}</em>`:'')}</h4><table class="rungs">`;""",
     """<span class="was">(was ${M.was})</span>`:''}</em>`:'')}</h4>${L||(dO&&dU)?'<table class="rungs">':'<p class="muted noline" data-noline>No DraftKings line yet.</p>'}`;""",
     'a stat with no main line')
cut('p3', """        for(const r of l.rungs){
          const [c,lbl]=confTier(r.p);
          const on=cur&&!cur.main&&cur.k===r.k;
""", """        html+='</table>'+far.join('')+'</div>';""",
    """        html+=(L||(dO&&dU)?'</table>':'')+far.join('')+'</div>';""", 'the rung rows')
sub1('p3', "  $('rungCb')?.addEventListener('change',e=>{ S.ui.showRungs=e.target.checked; save(); renderGame(); });\n", '',
     'the ladder box listener')
sub1('p3', "  S.ui={game:null,open:{},showAll:false,showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),\n",
     "  S.ui={game:null,open:{},showAll:false,\n", "the view's saved ladder box")

# 3. toggleLeg refuses a ladder
sub1('p3', "  if(NO_BET.has(stat)) return;   /* (app v113) never a leg DraftKings does not offer */\n",
     """  if(NO_BET.has(stat)) return;   /* (app v113) never a leg DraftKings does not offer */
  if(isLadder({stat,k,main:!!main})) return;   /* (app v127) never a ladder bet: a rung k+ or 2+ touchdowns */
""", 'toggleLeg: the refusal')
sub1('p3', """  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=tdLabel(pl.grp,kk); price=bookPrice(p); k=kk;
    if(kk===1&&oddsFor(gid,pid,'any_td',1)==null){""",
     """  if(m.prob){ p=pr.p; label=tdLabel(pl.grp,1); price=bookPrice(p); k=1;
    if(oddsFor(gid,pid,'any_td',1)==null){""", 'toggleLeg: one touchdown')
sub1('p3', """  } else {
    p=pOver(pl.grp,stat,pr.mu,k-0.5); label=`${k}+ ${m.lbl.toLowerCase()}`;
    const real=oddsFor(gid,pid,stat,k);
    if(real!=null){ price=real; src='real'; }
    else { const v=plEst(x,game,{stat,mu:pr.mu,p:pr.p},'rung',k); price=v.price; src=v.src; if(v.src==='dkline') dk=v; }
  }
""", "  }\n", 'toggleLeg: the rung branch')

# 4. a ladder kept from before leaves the builder on a load, said once until the builder changes
sub1('p3', "  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();\n",
     """  if(baked&&(baked.stats.length||baked.prices||baked.inj||baked.sched)) save();
  /* (app v127) a ladder bet kept in the builder from before leaves it, said on the builder (pbDropLadders) */
  if(pbDropLadders()) save();
""", 'boot: the strip')
sub1('p3', "S.headlines=S.headlines||{}; S.processedGames=S.processedGames||{};\n    save(); renderAll(); alert('Backup restored.');",
     "S.headlines=S.headlines||{}; S.processedGames=S.processedGames||{};\n    pbDropLadders(); save(); renderAll(); alert('Backup restored.');",
     'the import: the strip')
sub1('p3', "function renderParlay(o){\n",
     """/* (app v127) no ladder bets (isLadder): one kept in the builder from before, by the browser's saved state or a backup
   imported, is taken out as the page loads it, and the builder says so in one line until it next changes (PB_NOLADDER:
   how many, and the builder's legs then). A leg of a Suggested Parlays set locked before the change (spLegIn's kept)
   stays: the record grades that set as it locked, and Add to builder pays what its card says */
let PB_NOLADDER=null;
function pbLegSig(){ return Object.keys(S.parlay||{}).sort().join(','); }
function pbDropLadders(){
  let n=0;
  for(const [k,l] of Object.entries(S.parlay||{})) if(isLadder(l)&&!l.kept){ delete S.parlay[k]; n++; }
  if(n) PB_NOLADDER={n,sig:pbLegSig()};
  return n;
}
function renderParlay(o){
  /* the line lives until the visitor changes the builder: this draw's own drops below (a game kicked off, FG attempts)
     do not end it, so a builder saved with a ladder beside a leg of a game played since says both */
  const noteOn=!!PB_NOLADDER&&PB_NOLADDER.sig===pbLegSig();
""", 'pbDropLadders')
sub1('p3', "  if(dropped||notDk) save();\n",
     """  if(dropped||notDk) save();
  if(noteOn) PB_NOLADDER.sig=pbLegSig(); else PB_NOLADDER=null;
  const noLadder=PB_NOLADDER?PB_NOLADDER.n:0;
""", 'renderParlay: the note\'s life')
sub1('p3', "  const droppedNote=(notDk?",
     """  const droppedNote=(noLadder?`<p class="muted" style="margin:0 0 12px;padding:10px 14px;background:#FCF1D6;border-radius:8px;color:#8A5E05" data-pb-noladder="${noLadder}">${noLadder} leg${noLadder===1?' was':'s were'} removed: the site no longer offers ladder bets (such as 250+ passing yards or 2+ touchdowns), only main lines, anytime touchdowns and team bets.</p>`:'')+(notDk?""",
     'renderParlay: the note')

# 5. words
sub1('p3', "DraftKings’ line read from ESPN at our estimate of its price (on main lines, touchdowns and yards ladders, the markets the estimate has been checked on)",
     "DraftKings’ line read from ESPN at our estimate of its price (on main lines and touchdowns, the markets the estimate has been checked on)",
     'the Top 30 foot: the markets')
sub1('p3', "Each bet is listed once: a ladder rung that is the same bet as the player’s main line (225+ passing yards and Over 224.5) is shown as the main line. ",
     "Only main lines, anytime touchdowns and team bets are listed: no ladder bets, such as 250+ passing yards or 2+ touchdowns. ",
     'the Top 30 foot: no ladders')
sub1('p3', "const ESPN_ERR='typically within 0.5 points on yards, 2-3 on receptions, passing TDs, touchdowns and rungs';",
     "const ESPN_ERR='typically within 0.5 points on yards, 2-3 on receptions, passing TDs and touchdowns';", 'ESPN_ERR')
sub1('p3', """   listed once (app v112): a ladder rung k+ is the same bet as the player's main Over (k-0.5) on a half-point
   line, priced from it, so where that main line is on the list the rung is not.""",
     """   listed once (app v112): a ladder rung k+ is the same bet as the player's main Over (k-0.5) on a half-point
   line, priced from it, so where that main line is on the list the rung is not (dormant since app v127, when
   pricedLegs stopped making rungs: the checks hold it on made-up lines).""", 'the Top 30 note')

for gone in ('showRungs', 'rungCb', 'Threshold ladders', 'Scores two or more', 'ton2', 'shown below even though the ladders'):
    assert gone not in T['p3'], f'{gone} is still in part3.js'
for need in ('function pbDropLadders(', 'data-pb-noladder', 'if(isLadder({stat,k,main:!!main})) return;', 'data-noline'):
    assert need in T['p3'], need

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v127, no ladder bets: pricedLegs and gameLegPool make no rung, a game page offers none, toggleLeg refuses one, and one kept from before leaves the builder')
