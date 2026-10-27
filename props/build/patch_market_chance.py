"""app v138: DraftKings' chance on every leg. The model's projection stays on screen as information; it no longer picks.

The owner's call of 27 October 2026, after the diagnosis of weeks 1 to 7: "Every player leg uses DraftKings' fair chance,
as game totals already do; the model's projection stays on screen as information. Value marks disappear until a model
earns them. Suggested Parlays still build, but pick the least costly parlays and show their honest (negative) expected
return. I'd also remove market + form, which was fitted on this season's games and shows no signal."

Why. On 2,507 two-sided DraftKings main lines of weeks 1 to 6 the model's chance lost to DraftKings' own no-vig chance
(log loss 0.7319 against 0.6905), and with the market's log-odds held fixed the weight on the model's deviation was
0.007 +/- 0.068: it carries no information beyond DraftKings' line, yet it sits about four times further from 50% than
the market does. So the edges the page showed were mostly the model's errors, the Value rule and the "lands 25%+ by the
model" floors selected them, and parlays multiplied them: the model levels of weeks 3 to 7 won 10 of 76 against 9.5
expected at the fair chance and 16.5 at the model's. Market + form (the ELO tab's second price, which gated a player's
Value pick) was fitted on 2026 weeks 1 and 2 with ratings that had already seen those games; out of sample its rating
term is -0.04 +/- 0.06 against the 0.30 it used.

The decisions:

1. Every leg a suggestion, the Top 30 lines or the builder states a chance for is stated at DraftKings' fair chance
   (legChance, new beside legFair): a player's line, and team legs too (moneyline and spread: their halfway-pulled chance
   trails the closing market over 2021-2025, n 1,355, log loss +0.0100 [+0.0047, +0.0151], and its cover chance is worse
   than a flat 50%), the game total as before. legChance is a hook's chance where one is set (none is), else legFair, and
   for a total whose two prices are not both on file its own chance (app v88's 50%), est. The model's margin stays on the
   Game bets card as "our margin", and a player's projection everywhere it was.
2. l.p keeps meaning the model's chance on every leg pricedLegs, toggleLeg and totalLeg make; only a pool copy (pbLegs)
   carries p = the chance and pm = the model's chance, so the search core runs unchanged on the chance. gameTiers and
   gameLegPool (the hands' engine, drawn nowhere), NOPLAY and V6 are as they were.
3. The model plays no part in which legs qualify: no edge test, no market + form (formAgrees and formSig are gone), no
   far-off guard on a suggestion. A leg qualifies with a real price or DraftKings' line read on ESPN, its chance in the
   45-97% band, DraftKings' id at its line where the payload carries ids (dormant), and V6. One side a line: the higher
   chance. Where DraftKings' fair chance ties (the estimate prices most yards lines 50/50 at the same price), the model's
   projection breaks the tie: the side whose model chance pm is the higher, and only with no model chance the over (a
   player's line, a total) or the home side (a team's). It never changes a stated number.
4. Across candidates whose expected return at the fair chance is equal (most estimated yards lines tie at 1/1.0566), the
   order follows the model's lean, pm less p on the leg's own side. pbId's id is the leg's key, side and line, so the
   pool's order cannot steer the beam's id tie-break; instead the search's comparators (pbBeam, pbBestReturn's
   finalists, pbLikeliest's pick, pbCap) take the score rounded by pbEvKey (to 1e-9, so a product worked in another
   order is still a tie), then the lean summed over the parlay's legs (pbEval's ln), then the id as before. No number is
   perturbed: the scores, floors and full sums are untouched, and a check holding a level's quality within 1e-9 of the
   best holds it. The Top 30 lines rank on expected return (pbEvKey), then the chance, then the lean, then pbOrd.
   Nothing on the page claims anything for the lean: it is a tie-break, and the sets still say "least costly".
5. The levels keep the search, now on the chance: Safe the likeliest pair; Medium, Aggressive and Extreme the best
   expected return, that is the least costly parlay, clearing 25%, 12% or 5% at the fair chance, else the likeliest of
   their size. Totals stay a fill only. Every card states the fair chance and its expected return at it, fair x price
   - 1, negative ("expected -22%"), the rule "least costly . 25%+", and no model percentage.
6. The Top 30 lines in two parts: Player lines (up to 20, PB_TOP_PL) then Game bets filling to 30, moneylines and spreads
   then totals, each ranked as above. Ranked as one list the team bets' real prices beat the estimate formula's assumed
   5.66% player margin, an artefact of the estimate, and about 28 team legs would fill it. A Value part is drawn only
   where a hook supplies rows.
7. Value marks go (pbIsValue needs l.hook), and so do the far-off flags on every drawn surface; legFarOff, FAR_OFF and
   farText stay defined for the hands' engine alone.
8. A future model hook: window.setChanceHook(fn) exists and stays null, and nflbets/build/build.js refuses any page that
   calls it. A model that earns a place needs its own field on a leg and a level of the record (out of scope here: the
   record's p stays the model's chance, R1), and a validation first.
9. The record (R1): its shape and meanings are unchanged. A level's p is still the model's chance all its legs land (on
   pm), a leg's p its model chance, fair DraftKings'; every new level carries chance:'fair' (spTierOut), so a level built
   on the new rule can be told in the file.

Also here: the builder's Chance column becomes Fair (the leg's chance, est. where it is), its hero states the expected
return on the price it pays, its "fair price" box is the fair chance's, and the confidence tile goes; a game's page
states each line's fair chance (a dash where DraftKings lists no price), the touchdown's projection in its heading, and
no "book N%", arrows or far-off flags; the Suggested Parlays sub-heading "Model parlays" is "Parlays"; the record pill
titles say "at the model's chance" for what they said "by the model"; the Props tab's pills are titled with what they
grade and what -112 needs to break even.

The review of 27 October 2026, before it merged:
- The levels pick the best of the search's finalists by the real sums, no longer the first to clear the floor (app v136's
  rule), and a set works its best 40 of each search in full (SP_SEARCH, 4 and 10 before): at the fair chance the
  finalists differ only by how their legs move together and the same-game price, where the search's pairwise score errs
  by more than the gaps, and the card's "least costly" is said of the figures it states. CAR at GB's Aggressive had
  fallen back to the likeliest 4 legs at 11.98% beside a parlay landing 12.01% at -24.0%; five of week 7's six floored
  levels of KC at SEA and DAL at PHI had missed a cheaper one.
- A game total on one price is stated at its own 50% wherever a fair chance stands beside the chance it was chosen at:
  legFairStated (legChance without the hook) gives parlayFair's legs and the Top 30's fair column, so a level's floor and
  its stated fair chance, and a row's fair chance and its expected return, are one chance.
- A level read back from a lock draws its rule pill only where it was taken with chance 'fair' (spTierIn carries it,
  pbRuleKnown reads it): one locked before was chosen at the model's chance.
- The builder's hero with no fair chance says "not every leg has a DraftKings price".
- An anytime touchdown priced from DraftKings' read on the model alone (tdBranch 'model': no rushing or receiving yards
  line of his read, and his club's lines not complete or he a charted starter) is no tested kind: priced and shown est.
  on the game's page, its title saying so in a few words, and in no suggestion (pricedLegs leaves it out, so no level,
  hand, Top 30 row or Elo pick takes it) until a later read carries his line. With his yards line read the estimate lands
  within about 1.5 implied points of DraftKings' real prices in every band of weeks 2 to 6 (the held-out 4 to 6 too);
  on the model alone it was all but untested (54 legs of 1,736) and its fair chance runs +3.1 points [+1.8, +4.5] over
  DraftKings' where it states 45%+, +8.9 at 70%+: the band a level takes, where a set's Safe leaned on it.
- The sets are built at app v137's speed again, choosing exactly what they chose: Suggested Parlays had become about three
  times slower (week 7's Sunday in Chromium, 6.6 s against 2.1 s, each game one task of up to 0.9 s), every leg being thin
  and 40 finalists of each search worked in full. pbBeam now scores a parlay one leg longer from its parent's figures,
  each leg and pair indexed once with the memo, and keeps each step's best by a selection before sorting only those (the
  same parlays in the same order, the figures within a few units in the 16th place); parlayProb counts the hits of 2 to 5
  legs without a branch on each leg (the same count to the bit); a finalist that misses its floor in full is not priced;
  spOpenSoft builds a level a step. Every level, chance and price is as it was.
- The third review: a draw of Suggested Parlays while its sets are still being built on the screen (the page's half-minute
  look at a kickoff, a lock or the sets going up) takes the build's steps again, where it built every set left in one
  task (2.8 s on week 7's Friday morning); a control the reader was on keeps the focus when the tab is drawn again, else
  the tab's own button, never the page's body; and a game whose read found DraftKings' touchdown lists and no line says
  "no yards lines yet", where it said "no player lines yet" though DraftKings had posted its scorers."""
import io
FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function legChance(' not in T['p3'], 'patch_market_chance.py has already been applied'


BS = '⧵'   # stands for a backslash in the texts below (a JS escape such as \u2019 in the parts), turned into one here


def sub1(k, old, new, what):
    old, new = old.replace(BS, '\\'), new.replace(BS, '\\')
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v137 \\u00b7 2026-10-25';", "const APP_BUILD='app v138 \\u00b7 2026-10-27';", 'APP_BUILD')

# ---------------------------------------------------------------- part1: titles and styles
sub1('p1', r"""      <span class="rec" id="weekRec" title="The model's side of every sportsbook main line in this week, graded from the numbers frozen before kickoff"></span>
      <span class="rec" id="seasonRec" title="The model's side of every sportsbook main line this season, graded from the numbers frozen before kickoff"></span>""",
     r"""      <span class="rec" id="weekRec" title="The model’s side of every DraftKings main line, graded on lines frozen before kickoff · at −112 it needs 52.8% to break even"></span>
      <span class="rec" id="seasonRec" title="The model’s side of every DraftKings main line, graded on lines frozen before kickoff · at −112 it needs 52.8% to break even"></span>""", 'the Props pills\' titles')
sub1('p1', r""".pb-nums .pb-chance span,.pb-nums .pb-chance small{white-space:normal;overflow-wrap:anywhere}""",
     r""".pb-nums .pb-chance span,.pb-nums .pb-chance small{white-space:normal;overflow-wrap:anywhere}
/* app v138: a level's expected return at DraftKings' fair chance, negative in the red text either look keeps legible */
.pb-nums small.pb-ev.neg{color:var(--miss)}""", 'the expected line\'s style')
sub1('p1', r"""/* app v112: the Top 100 lines in two parts, each under its heading (Value picks, Other lines) */""",
     r"""/* app v112: the Top lines in parts, each under its heading (app v138: Player lines, then Game bets; Value picks only with
   a hook's rows) */""", 'the Top lines\' style comment')
sub1('p1', r""".pays .bigp{grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0 0}""",
     r""".pays .bigp{grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0 0}""", 'the builder\'s three boxes')

# ---------------------------------------------------------------- the Props tab's pills
sub1('p3', r"""  wr.innerHTML=`Week ${w} <b>${line(main.filter(r=>+r.w===+w))}</b>`;
  sr.innerHTML=`Season <b>${line(main)}</b>`;""",
     r"""  wr.innerHTML=`Week ${w} <b>${line(main.filter(r=>+r.w===+w))}</b>`;
  sr.innerHTML=`Season <b>${line(main)}</b>`;
  /* (app v138) what they grade, and what a side needs at a typical price to break even */
  wr.title=sr.title='The model’s side of every DraftKings main line, graded on lines frozen before kickoff · at −112 it needs 52.8% to break even';""", 'renderRecords: the title')

# ---------------------------------------------------------------- a game's page: the Game bets card
sub1('p3', r"""/* the Game bets card on a game's page, after its suggested parlays: both teams, to win and to cover,
   and the game total (the owner's call, 14 October 2026: game bets live on the Props tab) */
function gameBetsCard(g,locked){""",
     r"""/* (app v138) a line's bar, its chance and its band on a game's page, at DraftKings' fair chance (legChance: its price
   with the margin taken out, est. where it is worked from DraftKings' line or one side only); a dash where DraftKings
   lists no price to take a chance from. The model's own number is the heading's projection, never a chance here */
function gpChance(c){
  if(!c) return `<td class="barcell"><div class="bar-track"></div></td><td class="pct">–</td><td></td>`;
  const [k,lbl]=confTier(c.p);
  return `<td class="barcell"><div class="bar-track"><div class="bar-fill ${k}" style="width:${Math.max(2,c.p*100).toFixed(0)}%"></div></div></td>
        <td class="pct" data-legchance="${c.p}" title="DraftKings’ fair chance${c.est?', est.':''}">${(c.p*100).toFixed(0)}%</td><td><span class="conf ${k}">${lbl}</span></td>`;
}
/* the Game bets card on a game's page, after its suggested parlays: both teams, to win and to cover,
   and the game total (the owner's call, 14 October 2026: game bets live on the Props tab) */
function gameBetsCard(g,locked){""", 'gpChance')
sub1('p3', r"""    const far=[];
    const row=(b,on,key,book,res,label)=>{ const [c,lbl]=confTier(b.p);
      const ff=!locked&&book!=null&&isFinite(book)?legFarOff({gid:g.id,pid:'team:'+team,team,stat:key.split('|')[2],k:b.line==null?0:b.line,side:'over',main:false,p:b.p,price:book,src:'real',week:g.w}):null;
      if(ff) far.push(`<p class="faroff" data-far><b>${label}</b> ${farText(b.p,ff)}</p>`);
      return `<tr class="${on?'on':''}${ff?' far':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">
        <td class="pick">${locked?mark(res):`<input type="checkbox" ${on?'checked':''} data-leg="${key}" data-k="${b.line==null?0:b.line}" data-side="over" aria-label="Add ${TEAM_NAMES[team]||team} ${label.toLowerCase()}">`}</td>
        <td class="thr">${label}</td>
        <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${Math.max(2,b.p*100).toFixed(0)}%"></div></div></td>
        <td class="pct">${(b.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
        <td class="num est">${fmtML(bookPrice(b.p))}<em>est.</em></td>
        <td class="num book real">${book!=null&&isFinite(book)?fmtML(book):''}</td></tr>`; };""",
     r"""    /* (app v138) each side at DraftKings' fair chance on its price, a dash with none; the model's estimate of a price
       only where DraftKings has none; no far-off flag */
    const row=(b,on,key,book,res,label)=>{ const has=book!=null&&isFinite(book);
      const c=has?legChance({gid:g.id,pid:'team:'+team,team,stat:key.split('|')[2],k:b.line==null?0:b.line,side:'over',main:false,p:b.p,price:book,src:'real',week:g.w}):null;
      return `<tr class="${on?'on':''}${res==='win'?' hit':(res==='loss'?' miss':'')}">
        <td class="pick">${locked?mark(res):`<input type="checkbox" ${on?'checked':''} data-leg="${key}" data-k="${b.line==null?0:b.line}" data-side="over" aria-label="Add ${TEAM_NAMES[team]||team} ${label.toLowerCase()}">`}</td>
        <td class="thr">${label}</td>
        ${gpChance(c)}
        <td class="num est">${has?'':`${fmtML(bookPrice(b.p))}<em>est.</em>`}</td>
        <td class="num book real">${has?fmtML(book):''}</td></tr>`; };""", 'gameBetsCard: the team rows')
sub1('p3', r"""    return h+'</table>'+far.join('')+'</div>';""", r"""    return h+'</table></div>';""", 'gameBetsCard: no far-off line')

# ---------------------------------------------------------------- a game's page: the players
sub1('p3', r"""              <span class="tp">${(l.p*100).toFixed(0)}% chance</span>""",
     r"""              <span class="tp">proj ${(l.p*100).toFixed(0)}%</span>""", 'a played game\'s touchdown tile')
sub1('p3', r"""        if(l.prob){
          const [c,lbl]=confTier(l.p);
          const tk=legKey(g.id,x.pl.id,'any_td'), tcur=S.parlay[tk]; const ton=!!tcur&&(tcur.k||1)<2;
          const tod=oddsFor(g.id,x.pl.id,'any_td',1);
          const te=plEst(x,g,l,'td',1);
          const tf=tod!=null?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:tod,src:'real',week:g.w})
            :(te.src==='dkline'?legFarOff({gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:l.p,price:te.price,src:'dkline',espn:espnOf(te),week:g.w}):null);
          const qb=x.pl.grp==='QB', what=qb?'a rushing or receiving touchdown':'a touchdown';
          html+=`<div class="statblk"><h4>${qb?'Rushing or receiving TD <em data-qbtd>not a TD pass</em>':'Touchdown'}</h4>
            <table class="rungs"><tr class="${ton?'on':''}${tf?' far':''}">
            <td class="pick"><input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score ${what}"></td>
            <td class="thr">Scores one</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${(l.p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(l.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
            <td class="num est"${estAttr(te)}>${fmtML(te.price)}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr></table>${tf?`<p class="faroff" data-far><b>Scores one</b> ${farText(l.p,tf)}</p>`:''}</div>`;
          continue;
        }""",
     r"""        if(l.prob){
          /* (app v138) the model's touchdown chance is the heading's projection; the row is DraftKings' fair chance on
             its price (a book price, else its line read on ESPN), a dash where DraftKings lists none */
          const tk=legKey(g.id,x.pl.id,'any_td'), tcur=S.parlay[tk]; const ton=!!tcur&&(tcur.k||1)<2;
          const tod=oddsFor(g.id,x.pl.id,'any_td',1);
          const te=plEst(x,g,l,'td',1);
          const tc=legChance(tod!=null?{gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,price:tod,src:'real',week:g.w}
            :{gid:g.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,price:te.price,src:te.src,...(te.src==='dkline'?{espn:espnOf(te)}:{}),week:g.w});
          const qb=x.pl.grp==='QB', what=qb?'a rushing or receiving touchdown':'a touchdown';
          html+=`<div class="statblk"><h4>${qb?'Rushing or receiving TD <em data-qbtd>not a TD pass</em>':'Touchdown'} <em data-td-proj="${l.p}">projected ${(l.p*100).toFixed(0)}%</em></h4>
            <table class="rungs"><tr class="${ton?'on':''}">
            <td class="pick"><input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score ${what}"></td>
            <td class="thr">Scores one</td>
            ${gpChance(tc)}
            <td class="num est"${estAttr(te)}>${fmtML(te.price)}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr></table></div>`;
          continue;
        }""", 'renderGame: the touchdown block')
sub1('p3', r"""        const lk=legKey(g.id,x.pl.id,l.stat), cur=S.parlay[lk], far=[];""",
     r"""        const lk=legKey(g.id,x.pl.id,l.stat), cur=S.parlay[lk];""", 'renderGame: no far-off lines')
sub1('p3', r"""        if(L){
          /* the real, bettable line, both sides */
          const pO=pOver(x.pl.grp,l.stat,l.mu,L.line), tO=devigOver(L.over,L.under);
          const onO=cur&&cur.main&&cur.side==='over', onU=cur&&cur.main&&cur.side==='under';
          const gapO=(pO-mlProb(L.over))*100, gapU=((1-pO)-mlProb(L.under))*100;
          const mf=side=>legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:L.line,side,main:true,p:side==='under'?1-pO:pO,price:side==='under'?L.under:L.over,src:'real',week:g.w});
          const fO=mf('over'), fU=mf('under');
          if(fO) far.push(`<p class="faroff" data-far><b>Over ${L.line}</b> ${farText(pO,fO)}</p>`);
          if(fU) far.push(`<p class="faroff" data-far><b>Under ${L.line}</b> ${farText(1-pO,fU)}</p>`);
          html+=`<tr class="mainline ${onO?'on':''}${fO?' far':''}">
            <td class="pick"><input type="checkbox" ${onO?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="over" data-main="1" aria-label="Add over ${L.line}"></td>
            <td class="thr">Over ${L.line}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(pO)[0]}" style="width:${Math.max(2,pO*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(pO*100).toFixed(0)}%</td><td><span class="conf ${confTier(pO)[0]}">${confTier(pO)[1]}</span></td>
            <td class="num est"><span class="mkt">book ${(tO*100).toFixed(0)}%</span></td>
            <td class="num book real">${fmtML(L.over)}<em>${gapO>=3?'⧵u2191':(gapO<=-3?'⧵u2193':'')}</em></td></tr>
          <tr class="mainline ${onU?'on':''}${fU?' far':''}">
            <td class="pick"><input type="checkbox" ${onU?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="under" data-main="1" aria-label="Add under ${L.line}"></td>
            <td class="thr">Under ${L.line}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(1-pO)[0]}" style="width:${Math.max(2,(1-pO)*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${((1-pO)*100).toFixed(0)}%</td><td><span class="conf ${confTier(1-pO)[0]}">${confTier(1-pO)[1]}</span></td>
            <td class="num est"><span class="mkt">book ${((1-tO)*100).toFixed(0)}%</span></td>
            <td class="num book real">${fmtML(L.under)}<em>${gapU>=3?'⧵u2191':(gapU<=-3?'⧵u2193':'')}</em></td></tr>`;
        } else if(dO&&dU){
          const E=dO.line, pO=pOver(x.pl.grp,l.stat,l.mu,E);
          const onO=cur&&cur.main&&cur.side==='over'&&cur.k===E, onU=cur&&cur.main&&cur.side==='under'&&cur.k===E;
          const mf=(side,d)=>legFarOff({gid:g.id,pid:x.pl.id,stat:l.stat,k:E,side,main:true,p:side==='under'?1-pO:pO,price:d.price,src:'dkline',espn:espnOf(d),week:g.w});
          /* flagged far off DraftKings' line only on a market the estimate has been checked on */
          const fO=dO.tested?mf('over',dO):null, fU=dU.tested?mf('under',dU):null;
          if(fO) far.push(`<p class="faroff" data-far><b>Over ${E}</b> ${farText(pO,fO)}</p>`);
          if(fU) far.push(`<p class="faroff" data-far><b>Under ${E}</b> ${farText(1-pO,fU)}</p>`);
          const row=(side,d,p,on,f)=>`<tr class="mainline est-line ${on?'on':''}${f?' far':''}">
            <td class="pick"><input type="checkbox" ${on?'checked':''} data-leg="${lk}" data-k="${E}" data-side="${side}" data-main="1" aria-label="Add ${side} ${E}"></td>
            <td class="thr">${side==='under'?'Under':'Over'} ${E}</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${confTier(p)[0]}" style="width:${Math.max(2,p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(p*100).toFixed(0)}%</td><td><span class="conf ${confTier(p)[0]}">${confTier(p)[1]}</span></td>
            <td class="num est"${estAttr(d)}>${fmtML(d.price)}<em>est.</em></td>
            <td class="num book real"></td></tr>`;
          html+=row('over',dO,pO,onO,fO)+row('under',dU,1-pO,onU,fU);
        }
        html+=(L||(dO&&dU)?'</table>':'')+far.join('')+'</div>';""",
     r"""        if(L){
          /* the real, bettable line, both sides, each at DraftKings' fair chance on its price (app v138: the model's
             projection is the heading's; no "book N%", no arrows, no far-off flag) */
          const onO=cur&&cur.main&&cur.side==='over', onU=cur&&cur.main&&cur.side==='under';
          const ch=side=>legChance({gid:g.id,pid:x.pl.id,stat:l.stat,k:L.line,side,main:true,price:side==='under'?L.under:L.over,src:'real',week:g.w});
          html+=`<tr class="mainline ${onO?'on':''}">
            <td class="pick"><input type="checkbox" ${onO?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="over" data-main="1" aria-label="Add over ${L.line}"></td>
            <td class="thr">Over ${L.line}</td>
            ${gpChance(ch('over'))}
            <td class="num est"></td>
            <td class="num book real">${fmtML(L.over)}</td></tr>
          <tr class="mainline ${onU?'on':''}">
            <td class="pick"><input type="checkbox" ${onU?'checked':''} data-leg="${lk}" data-k="${L.line}" data-side="under" data-main="1" aria-label="Add under ${L.line}"></td>
            <td class="thr">Under ${L.line}</td>
            ${gpChance(ch('under'))}
            <td class="num est"></td>
            <td class="num book real">${fmtML(L.under)}</td></tr>`;
        } else if(dO&&dU){
          const E=dO.line;
          const onO=cur&&cur.main&&cur.side==='over'&&cur.k===E, onU=cur&&cur.main&&cur.side==='under'&&cur.k===E;
          /* each side at its fair chance as the estimate prices DraftKings' line (est.) */
          const row=(side,d,on)=>`<tr class="mainline est-line ${on?'on':''}">
            <td class="pick"><input type="checkbox" ${on?'checked':''} data-leg="${lk}" data-k="${E}" data-side="${side}" data-main="1" aria-label="Add ${side} ${E}"></td>
            <td class="thr">${side==='under'?'Under':'Over'} ${E}</td>
            ${gpChance(legChance({gid:g.id,pid:x.pl.id,stat:l.stat,k:E,side,main:true,price:d.price,src:'dkline',espn:espnOf(d),week:g.w}))}
            <td class="num est"${estAttr(d)}>${fmtML(d.price)}<em>est.</em></td>
            <td class="num book real"></td></tr>`;
          html+=row('over',dO,onO)+row('under',dU,onU);
        }
        html+=(L||(dO&&dU)?'</table>':'')+'</div>';""", 'renderGame: the main lines')

# ---------------------------------------------------------------- market + form gone; legChance and the hook
sub1('p3', r"""/* market + form is the Elo tab's second price on a player leg (window.eloAltP: the book's
   chance moved by the player's rating on the side of the bet). The model's own edge over
   the book has not held: through week 3 the main lines it rated three or more points above
   the book said 66%, the book said 53% and 47% happened. So a player leg is suggested only
   where market + form also clears the book's implied chance by the same three points. Team legs have no second price
   and keep the model's bar alone; the model's own page, without the Elo tab, suggests as it
   did. Until the Elo files have loaded no player leg qualifies, and the loaded state is in
   the suggestion signatures so the window rebuilds once they have. */
function formAgrees(c){
  if(typeof window.eloAltP!=='function'||c.grp==='TEAM') return true;
  if(typeof window.eloLoaded==='function'&&!window.eloLoaded()) return false;
  const a=window.eloAltP(c.pid,c.side,c.price,c.src,c.stat);   /* none on a quarterback's touchdown: his rating is a passer's */
  return a!=null&&a-mlProb(c.price)>=0.03;
}
function formSig(){ return typeof window.eloLoaded==='function'?(window.eloLoaded()?'form':'noform'):''; }
""",
     r"""/* (app v138) market + form (the Elo tab's second price, which a player's Value pick needed until then) is gone, the
   owner's call of 27 October 2026: it was fitted on 2026 weeks 1 and 2 with ratings that had already seen those games,
   and out of sample its rating term was -0.04 +/- 0.06 against the 0.30 it used. No suggestion waits for the Elo files
   any more (the Elo picks still do, for their matchups) */
""", 'formAgrees and formSig gone')
sub1('p3', r"""/* the leg's fair chance where the model rates its side FAR_OFF or more above it, else null */
function legFarOff(l,memo){""",
     r"""/* ---------- the chance a leg is stated at (app v138) ----------
   The owner's call of 27 October 2026: every leg at DraftKings' fair chance, as the game total already was; the model's
   projection stays on screen as information. legChance(l, memo) is, in order: a validated model's chance where a hook
   is set ({p, est:false, hook:<by>}: none is, and nflbets/build/build.js refuses a page that sets one); else
   legFair(l) (a pulled leg's, a locked leg's kept, a book price's with the margin out, est. where worked from one side
   or DraftKings' line read on ESPN); for a game total whose two prices are not both on file, its own chance, the
   market's 50% (app v88), est.; null with no price of DraftKings' to take a chance from. A model that earns the hook
   needs its own field on a leg and a level of the record too: the record's p stays the model's chance (R1).
   legFairStated(l, memo) is that rule without the hook: the fair chance every surface states beside a chance, a
   parlay's fair chance (parlayFair) and the Top 30's fair column among them, so a total on one price is stated at the
   chance its expected return and a level's floor are worked at, never at its one-sided estimate beside them */
let CHANCE_HOOK=null;
window.setChanceHook=f=>{ CHANCE_HOOK=typeof f==='function'?f:null; PB_CACHE.clear(); PB_TOP_CACHE.clear(); SP_CACHE.clear(); };
function legFairStated(l,memo){
  if(!l) return null;
  const f=legFair(l,memo);
  if(l.stat==='total'&&(!f||f.est)) return l.p!=null&&isFinite(l.p)&&l.p>0&&l.p<1?{p:+l.p,est:true}:f;
  return f;
}
function legChance(l,memo){
  if(!l) return null;
  if(CHANCE_HOOK){ let h=null; try{ h=CHANCE_HOOK(l); }catch(e){ h=null; }
    if(h&&isFinite(h.p)&&h.p>0&&h.p<1) return {p:+h.p,est:false,hook:h.by||'hook'}; }
  return legFairStated(l,memo);
}
window.legChance=legChance; window.legFairStated=legFairStated;
/* a score as the search and the lists compare it: to 1e-9, so two parlays whose products were worked in another order
   are a tie, never a perturbation of the number itself */
const pbEvKey=v=>Math.round(v*1e9);
/* a pool leg's lean: the model's chance less the chance it is stated at, on its own side (0 without a model chance).
   A tie-break among legs and parlays of equal chance or expected return (the owner's amendment of 27 October 2026); no
   number on the page states it or claims anything for it */
const pbLean=l=>l&&l.pm!=null&&isFinite(l.pm)&&l.p!=null&&isFinite(l.p)?l.pm-l.p:0;
/* the leg's fair chance where the model rates its side FAR_OFF or more above it, else null (app v138: the hands' engine,
   gameLegPool, drawn nowhere, alone reads it; no drawn surface flags a leg far off any more) */
function legFarOff(l,memo){""", 'legChance, the hook, pbEvKey and pbLean')
sub1('p3', r"""/* a parlay's fair chance: {p, est, miss}; p null where a leg has no fair chance (miss of them) */
function parlayFair(legs,memo,sims){
  if(!Array.isArray(legs)||!legs.length) return null;
  const m=memo||{}, f=legs.map(l=>legFair(l,m)), miss=f.filter(x=>!x).length;""",
     r"""/* a parlay's fair chance: {p, est, miss}; p null where a leg has no fair chance (miss of them). (app v138) Each leg's
   as the page states it (legFairStated: a total on one price at its own 50%, est.), so a level's fair chance is the
   chance it was chosen at and the builder's is the one its Fair column states */
function parlayFair(legs,memo,sims){
  if(!Array.isArray(legs)||!legs.length) return null;
  const m=memo||{}, f=legs.map(l=>legFairStated(l,m)), miss=f.filter(x=>!x).length;""", 'parlayFair: each leg as stated')

# ---------------------------------------------------------------- the pool
sub1('p3', r"""  const by=f=>[...list].sort((a,b)=>(f(b)-f(a))||pbOrd(a,b)), keep=new Map();""",
     r"""  /* (app v138) a tie (pbEvKey) to the larger lean, then the key, as the search breaks one */
  const by=f=>[...list].sort((a,b)=>(pbEvKey(f(b))-pbEvKey(f(a)))||(pbEvKey(pbLean(b))-pbEvKey(pbLean(a)))||pbOrd(a,b)), keep=new Map();""", 'pbCap: ties to the lean')
sub1('p3', r"""/* the legs on the reader's picks (u, the choices: the reader's own by default): preferred (the full bar)
   and thin (at or above the book, no more), uncapped (the Top 30 lines rank them all); pbPool caps them.
   (app v119: the Top lines' read option of app v115, which kept a line from a Refresh odds read with no
   DraftKings id, is gone, the owner's call: only lines DraftKings' betslip can take by id) */
function pbLegs(games,u){
  u=u||pbUi();
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
    if(!pbAllows(c,u)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0||!(c.p>=PB_PMIN&&c.p<PB_PMAX)||edge(c)<0) continue;
    /* until the Elo files are in, no player leg qualifies at all, as before */
    if(c.grp!=='TEAM'&&formOut) continue;
    /* the model FAR_OFF or more above the book's fair chance: left out, and counted for the panel */
    if(legFarOff(c,fm)){ far++; if(c.src==='dkline') farDk++; continue; }
    /* no DraftKings id at its line: it cannot go on the slip, so it is not suggested (a leg far off
       the market is counted as that, above, as before) */
    if(!id){ const pl=!isGameLeg(c); noId++; if(pl) noIdPl++; if(dkAtAnother(c)){ moved++; if(pl) movedPl++; } continue; }
    if(edge(c)>=PB_EDGE&&formAgrees(c)) pref.push({...c,thin:false}); else thin.push({...c,thin:true});
  }
  /* the totals, with Game total ticked: both sides of each ticked game's posted total on a real
     price, at the market's own chance. No edge, so never preferred or thin: a list of their own,
     the last a level draws on (pbTier) */
  const mkt=[];
  if(u.k.total) for(const g of games) for(const side of ['over','under']){
    const c=totalLeg(g,side);
    if(c&&pbAllows(c,u)&&c.src==='real'&&isFinite(c.price)&&c.price!==0&&c.p>=PB_PMIN&&c.p<PB_PMAX){
      /* a total with no DraftKings id at its number is counted for the note too */
      if(hasId(c)) mkt.push({...c,thin:false,market:true}); else { noId++; if(dkAtAnother(c)) moved++; } } }
  return {pref,thin,mkt,plGames:plGames.size,far,farDk,noId,noIdPl,moved,movedPl,plNoId:[...plNoId].filter(id=>!plGames.has(id)).length};
}""",
     r"""/* (app v138) one side of a line: the higher chance (pbEvKey, so a tie is a tie); on a tie the side the model's projection
   favours (the larger pm: the owner's amendment of 27 October 2026, a tie-break that never changes a stated number); only
   with no model chance to tell them apart the over (a player's line, a total) or the home side (a team's). home: each
   game's home club */
function pbSideBetter(a,b,home){
  const ka=pbEvKey(a.p), kb=pbEvKey(b.p); if(ka!==kb) return ka>kb;
  const ma=a.pm!=null&&isFinite(a.pm)?pbEvKey(a.pm):null, mb=b.pm!=null&&isFinite(b.pm)?pbEvKey(b.pm):null;
  if(ma!=null&&mb!=null&&ma!==mb) return ma>mb;
  if(isGameLeg(a)&&a.stat!=='total'){ const h=home&&home.get(a.gid); return a.team===h&&b.team!==h; }
  return a.side!=='under'&&b.side==='under';
}
function pbSideKeep(m,key,x,home){ const y=m.get(key); if(!y||pbSideBetter(x,y,home)) m.set(key,x); }
/* the legs on the reader's picks (u, the choices: the reader's own by default), uncapped (the Top 30 lines rank them
   all); pbPool caps them. (app v138, the owner's call of 27 October 2026) Each pool leg is a copy at DraftKings' fair
   chance, p (legChance), the model's own chance beside it as pm, so the search below runs unchanged on the chance. A
   leg qualifies with a real price or DraftKings' line read on ESPN (dkline), its chance in the 45-97% band, DraftKings'
   id at its own line where the payload carries ids (dormant since app v125), and V6 (pricedLegs): no edge test, no market
   + form and no far-off guard, since the model's chance carried nothing DraftKings' own did not. Every leg is thin
   (thin true); a preferred leg, a Value pick (thin false), only where a chance hook supplies a chance 3 points above the
   price's implied one (setChanceHook, null). One side a line (pbSideKeep: a player's line by game, player, stat and
   number; a team's by game and bet). The totals, with Game total ticked, are the market legs as before (pool.mkt, the last
   fill), one side a game, at legChance.
   (app v119: the Top lines' read option of app v115, which kept a line from a Refresh odds read with no DraftKings id, is
   gone, the owner's call: only lines DraftKings' betslip can take by id. app v109: where the payload carries DraftKings'
   ids a leg qualifies only with one at its own line; a game counts as having player prices only where one of its player
   legs has an id, plNoId the games whose player legs have none, and the legs that would have qualified but for the id are
   counted for the panel's note, noId, noIdPl the players', moved, movedPl those DraftKings had at another number) */
function pbLegs(games,u){
  u=u||pbUi();
  const hasId=c=>!dkCarries(c)||!!dkIdOf(c);
  const plGames=new Set(), plNoId=new Set(), fm={}, keep=new Map(), home=new Map((games||[]).map(g=>[g.id,g.h])); let noId=0, noIdPl=0, moved=0, movedPl=0;
  for(const c of pricedLegs(games)){
    const id=hasId(c);
    if(!isGameLeg(c)) (id?plGames:plNoId).add(c.gid);
    if(!pbAllows(c,u)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0) continue;
    const ch=legChance(c,fm); if(!ch||!(ch.p>=PB_PMIN&&ch.p<PB_PMAX)) continue;
    /* no DraftKings id at its line: it cannot go on the slip, so it is not suggested */
    if(!id){ const pl=!isGameLeg(c); noId++; if(pl) noIdPl++; if(dkAtAnother(c)){ moved++; if(pl) movedPl++; } continue; }
    const pref=!!ch.hook&&ch.p-mlProb(c.price)>=PB_EDGE;
    pbSideKeep(keep,isGameLeg(c)?`${c.gid}|${c.stat}`:`${c.gid}|${c.pid}|${c.stat}|${c.k}`,{...c,pm:c.p,p:ch.p,thin:!pref,...(pref?{hook:ch.hook}:{})},home);
  }
  const pref=[], thin=[]; for(const x of keep.values()) (x.thin?thin:pref).push(x);
  const tk=new Map();
  if(u.k.total) for(const g of games) for(const side of ['over','under']){
    const c=totalLeg(g,side);
    if(!c||!pbAllows(c,u)||c.src!=='real'||!isFinite(c.price)||c.price===0) continue;
    const ch=legChance(c,fm); if(!ch||!(ch.p>=PB_PMIN&&ch.p<PB_PMAX)) continue;
    /* a total with no DraftKings id at its number is counted for the note too */
    if(!hasId(c)){ noId++; if(dkAtAnother(c)) moved++; continue; }
    pbSideKeep(tk,`${c.gid}|total`,{...c,pm:c.p,p:ch.p,thin:false,market:true},home); }
  const mkt=[...tk.values()];
  return {pref,thin,mkt,plGames:plGames.size,far:0,farDk:0,noId,noIdPl,moved,movedPl,plNoId:[...plNoId].filter(id=>!plGames.has(id)).length};
}""", 'pbLegs: DraftKings\' chance, one side a line')

# ---------------------------------------------------------------- the search's order: ties to the lean
sub1('p3', r"""function pbEval(legs,memo){
  const id=legs.map(pbId).sort().join(',');
  let e=memo.get(id); if(e) return e;
  const pr=pbJoint(legs,modelP,memo), d=pbDecApprox(legs,memo);
  e={legs,pr,d,ev:pr*d,id}; memo.set(id,e); return e;
}""",
     r"""function pbEval(legs,memo){
  const id=legs.map(pbId).sort().join(',');
  let e=memo.get(id); if(e) return e;
  const pr=pbJoint(legs,modelP,memo), d=pbDecApprox(legs,memo);
  /* (app v138) ln: the legs' lean summed, the tie-break after the score (pbRank) */
  e={legs,pr,d,ev:pr*d,id,ln:legs.reduce((a,l)=>a+pbLean(l),0)}; memo.set(id,e); return e;
}
/* (app v138) the search's order on a score: the score to 1e-9 (pbEvKey), then the larger lean (the model's projection
   breaking a tie of DraftKings' chances, the owner's amendment of 27 October 2026), then the id as before */
const pbRank=by=>(a,b)=>(pbEvKey(b[by])-pbEvKey(a[by]))||(pbEvKey(b.ln||0)-pbEvKey(a.ln||0))||a.id.localeCompare(b.id);""", 'pbEval: the lean')
sub1('p3', r"""    beam=[...next.values()].sort((a,b)=>(b[by]-a[by])||a.id.localeCompare(b.id)).slice(0,width);""",
     r"""    beam=[...next.values()].sort(pbRank(by)).slice(0,width);""", 'pbBeam: the order')
sub1('p3', r"""    /* the finalists that clear the floor by the search's own score, in the beam's own order (app v136): its
       score is exact where the legs are independent and close within a game, where a re-rank on a few
       thousand draws was noisier than the gaps between them; then each in full, which is what the card shows
       and what the floor is held to, the first to clear it taken */
    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort((a,b)=>((floor?b.ev-a.ev:b.pr-a.pr))||a.id.localeCompare(b.id)).slice(0,o.final);
    for(const e of top){ const r=pbExact(e.legs); if(!floor||r.corr>=floor) return r; }""",
     r"""    /* the finalists that clear the floor by the search's own score, in the beam's own order (app v136), each then
       worked in full, which is what the card shows and what the floor is held to. (app v138) The best of them in full
       is taken, no longer the first to clear the floor: at DraftKings' fair chance every estimated leg returns the same
       on $1, so the finalists differ only by how their legs move together and by the same-game price, where the
       search's pairwise score errs by more than the gaps between them, and the card's "least costly" (Safe's "the
       likeliest pair") is said of the figures it states. The highest chance times price (Safe: chance) to 1e-9, a tie
       to the larger lean, then the lower id; the full sums are seeded and kept, so the same lines give the same pick */
    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort(pbRank(floor?'ev':'pr')).slice(0,o.final);
    let best=null;
    for(const e of top){ const r=pbExact(e.legs); if(floor&&r.corr<floor) continue;
      const x={v:floor?r.corr*r.dec:r.corr,ln:e.ln,id:e.id}; if(!best||pbRank('v')(x,best.x)<0) best={x,r}; }
    if(best) return best.r;""", 'pbBestReturn: the best of the finalists in full')
sub1('p3', r"""    for(const e of pbBeam(pools,0,'pr',o.wide,memo).slice(0,o.likely)){
      const pr=parlayProb(pbOrder(e.legs)).corr;
      if(!best||pr>best.pr||(pr===best.pr&&e.id<best.e.id)) best={e,pr}; }""",
     r"""    for(const e of pbBeam(pools,0,'pr',o.wide,memo).slice(0,o.likely)){
      const pr=parlayProb(pbOrder(e.legs)).corr;
      /* (app v138) the highest to 1e-9, a tie to the larger lean, then the lower id */
      if(!best||pbRank('pr')({pr,ln:e.ln,id:e.id},{pr:best.pr,ln:best.e.ln,id:best.e.id})<0) best={e,pr}; }""", 'pbLikeliest: the order')
sub1('p3', r"""   likeliest (the panel's 12 and 24), its best 4 and 10 worked by the real sums (the panel's 3 and 8). The
   beam costs little; the real sums' draws are most of the second or so a priced game takes (week 5's Bills
   at Rams, 26 legs: 1.1 s in jsdom, 1.0 s at the panel's widths, the same four parlays). The props job pays
   it once a game a run; the page only while the tab is on the screen (renderSp) */
const SP_SEARCH={cap:60,beam:200,wide:400,likely:4,final:10};""",
     r"""   likeliest (the panel's 12 and 24), its best 4 and 10 worked by the real sums (the panel's 3 and 8). The
   beam costs little; the real sums' draws are most of the second or so a priced game takes (week 5's Bills
   at Rams, 26 legs: 1.1 s in jsdom, 1.0 s at the panel's widths, the same four parlays). The props job pays
   it once a game a run; the page only while the tab is on the screen (renderSp).
   (app v138) The best 40 of each search are worked by the real sums, where it was 4 and 10: at DraftKings' fair
   chance the parlays of a game differ only by how their legs move together and by the same-game price, where the
   search's pairwise score errs by more than the gaps between them, so on the payload of 27 October 2026 CAR at GB's
   Aggressive fell back to the likeliest 4 legs (12.0% where it needed 12%) though a parlay ranked 13th by the search's
   score landed 12.01% and cost less, and five of week 7's six floored levels of KC at SEA and DAL at PHI missed a
   cheaper one. The real sums are seeded and kept (parlayProb.cache), so 40 cost a few tenths of a second a game */
const SP_SEARCH={cap:60,beam:200,wide:400,likely:40,final:40};""", 'SP_SEARCH: 40 finalists in full')
sub1('p3', r"""function pbDataSig(){ return [PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',formSig(),'e'+ESPN_SEQ].join('|'); }""",
     r"""function pbDataSig(){ return [PAY.baked_at||PAY.build||'',S.sched.length,Object.keys(S.processedGames||{}).length,JSON.stringify(S.odds||{}).length,S.gamesFetched||'',CHANCE_HOOK?'h':'','e'+ESPN_SEQ].join('|'); }""", 'pbDataSig: no market + form')

# ---------------------------------------------------------------- the record's words
sub1('p3', r"""const SP_KIND={model:{field:'tiers',pre:'',name:'Model parlays'},elo:{field:'elo',pre:'elo-',name:'Elo picks'}};""",
     r"""/* (app v138) the model's levels are named Parlays: the model no longer picks them */
const SP_KIND={model:{field:'tiers',pre:'',name:'Parlays'},elo:{field:'elo',pre:'elo-',name:'Elo picks'}};""", 'SP_KIND: Parlays')
sub1('p3', r"""    const by=kind==='elo'?'the Elo chance':'the model';
    const pills=any?R.tiers.map(s=>`<span class="rec" data-sp-rec="${sec}:${s.id}" title="${esc(K.name)}, ${esc(s.label)}: ${s.graded} graded, ${s.won} won${s.graded?`; wins expected ${s.fairN?f1(s.fair)+' by the book’s fair chance'+(s.fairN<s.graded?' (on the '+s.fairN+' with one)':'')+', ':''}${f1(s.model)} by ${by}`:''}""",
     r"""    /* (app v138) a level's p is the model's chance all land (the Elo's for an Elo pick), for old entries and new */
    const by=kind==='elo'?'the Elo chance':'the model’s chance';
    const pills=any?R.tiers.map(s=>`<span class="rec" data-sp-rec="${sec}:${s.id}" title="${esc(K.name)}, ${esc(s.label)}: ${s.graded} graded, ${s.won} won${s.graded?`; wins expected ${s.fairN?f1(s.fair)+' by the book’s fair chance'+(s.fairN<s.graded?' (on the '+s.fairN+' with one)':'')+', ':''}${f1(s.model)} at ${by}`:''}""", 'spRecHtml: at the model\'s chance')

# ---------------------------------------------------------------- the cards
sub1('p3', r"""const pbIsValue=l=>!!l&&l.thin===false&&!l.market;""",
     r"""/* (app v138) and only a leg a chance hook rated so (l.hook): none is set, so no leg wears the mark until a model earns it */
const pbIsValue=l=>!!l&&l.thin===false&&!l.market&&!!l.hook;""", 'pbIsValue: a hook\'s alone')
sub1('p3', r"""/* what a level was chosen by, as its card says it */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  return t.likeliest?`the likeliest ${n} legs`:t.floor?`${pct}%+ by the model`:'the likeliest pair';
}
/* a level's chance as its card shows it: the book's fair chance, labelled so (est. where a leg is
   priced on one side only), with whose chance it was chosen on beside it ("model says 53%"; the Elo
   picks' "Elo says"); with no fair chance, that chance alone, saying why */
function pbChanceHtml(F,chance,o){
  const pc=v=>(v*100).toFixed(0)+'%', by=(o&&o.by)||'model';
  if(F&&F.p!=null) return `<div class="pb-chance"><b data-pb-fair="${F.p}">${pc(F.p)}</b><span${F.est?(F.dk?' title="Estimated: a leg is priced from DraftKings’ line read on ESPN by our estimate, and its fair chance with it"':' title="Estimated: a leg is priced on one side only, so the week’s typical margin is taken out of its price"'):''}>fair chance${F.est?', est.':''}</span><small class="pb-model" data-pb-model="${chance}">${esc(by)} says ${pc(chance)}</small></div>`;
  return `<div class="pb-chance"><b data-pb-model="${chance}">${pc(chance)}</b><span>${(o&&o.chanceBy)||'model’s chance'}</span><small class="pb-model">no fair chance</small></div>`;
}""",
     r"""/* what a level was chosen by, as its card says it (app v138: the least costly, the best expected return at DraftKings'
   fair chance, over its floor; else the likeliest of its size), and the pill's title */
function pbRuleOf(t){
  const n=t.legs.length, pct=Math.round((t.floor||0)*100);
  return t.likeliest?`the likeliest ${n} legs`:t.floor?`least costly · ${pct}%+`:'the likeliest pair';
}
function pbRuleTitle(t){ return !t.likeliest&&t.floor?`Smallest expected loss of the ${t.legs.length}-leg parlays landing ${Math.round(t.floor*100)}%+ by DraftKings’ fair chance`:''; }
function pbRuleHtml(t){ const tt=pbRuleTitle(t); return `<span class="pb-rule"${tt?` title="${tt}"`:''}>${pbRuleOf(t)}</span>`; }
/* whether a level was chosen by the rule its pill would state: a live level always; one read back from the record or this
   browser's copy (every leg kept at its lock) only where it carries chance 'fair' (spTierOut, from app v138 on), since a
   level locked before was chosen on the model's chance ("25%+ by the model") or, an Elo pick's, over floors of its own,
   and is drawn with no pill rather than a rule that did not choose it */
const pbRuleKnown=t=>!!t&&(t.chance==='fair'||!(Array.isArray(t.legs)&&t.legs.length&&t.legs.every(l=>!!l&&!!l.kept&&typeof l.kept==='object')));
/* a level's chance as its card shows it: the book's fair chance, labelled so (est. where a leg is priced on one side
   only or from DraftKings' line), and (app v138) what $1 on it is expected to return at that chance, fair x price - 1, in
   whole percent ("expected -22%", data-pb-ev the figure); no model's or Elo's chance beside it. With no fair chance, a
   dash and why. chance and o are kept for a caller that passes them, and read no more */
function pbChanceHtml(F,chance,o,dec){
  const pc=v=>(v*100).toFixed(0)+'%';
  if(F&&F.p!=null){ const ev=dec>1?F.p*dec-1:null, r=ev==null?0:Math.round(ev*100);
    return `<div class="pb-chance"><b data-pb-fair="${F.p}">${pc(F.p)}</b><span${F.est?(F.dk?' title="Estimated: a leg is priced from DraftKings’ line read on ESPN by our estimate, and its fair chance with it"':' title="Estimated: a leg is priced on one side only, so the week’s typical margin is taken out of its price"'):''}>fair chance${F.est?', est.':''}</span>${ev==null?'':`<small class="pb-ev${ev<0?' neg':''}" data-pb-ev="${ev}" title="At DraftKings’ fair chance: $1 returns $${(1+ev).toFixed(2)} on average">expected ${r<0?'−':r>0?'+':''}${Math.abs(r)}%</small>`}</div>`; }
  return `<div class="pb-chance"><b>–</b><span>chance</span><small>no fair chance</small></div>`;
}""", 'pbRuleOf and pbChanceHtml')
sub1('p3', r"""function pbTierCard(t,o){
  o=o||{}; const card=!!window.PARLAY_CARD, chance=o.chance!=null?o.chance:t.corr, legAdd=o.legAdd!==false;""",
     r"""/* (app v138) each leg's chance is DraftKings' fair chance (legChance; a locked leg's the one kept at the lock), a dash
   with none; no Value mark but a hook's, no far-off line; o.legNote(l): a line of its own under a leg (the Elo picks'
   lean) */
function pbTierCard(t,o){
  o=o||{}; const card=!!window.PARLAY_CARD, chance=o.chance!=null?o.chance:t.corr, legAdd=o.legAdd!==false;""", 'pbTierCard: the comment')
sub1('p3', r"""    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.game&&t.legs.length?pbTierGame(t.legs[0].gid):''}${o.rule||(t.floor!=null?`<span class="pb-rule">${pbRuleOf(t)}</span>`:'')}</div>
    <div class="pb-nums">${pbChanceHtml(t.fair,chance,o)}<div><b>${fmtML(decToML(t.dec))}</b><span>${nE?'price, est.':'price'}</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>
    <ul class="pb-legs">${t.legs.map(l=>{ const ff=legFarOff(l,fm); return `<li><span class="nm">${o.badge?o.badge(l):''}${glanceName(l)}<small>${esc(l.label)}${pbValMark(l)}</small>${ff?`<small class="faroff" data-pb-far>${farText(l.p,ff)}</small>`:''}</span><span class="pr">${fmtML(l.price)}${l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:''}<em>${((o.legP?o.legP(l):l.p)*100).toFixed(0)}%</em></span>${legAdd?pbLegAddBtn(l):''}</li>`; }).join('')}</ul>""",
     r"""    <div class="pb-th"><span class="pb-tn">${esc(t.label)}</span><span class="pill">${t.legs.length} legs</span>${o.game&&t.legs.length?pbTierGame(t.legs[0].gid):''}${o.rule||(t.floor!=null&&pbRuleKnown(t)?pbRuleHtml(t):'')}</div>
    <div class="pb-nums">${pbChanceHtml(t.fair,chance,o,t.dec)}<div><b>${fmtML(decToML(t.dec))}</b><span>${nE?'price, est.':'price'}</span></div><div class="pb-pay" data-pb-pay="${t.dec}">${pbPayHtml(t.dec)}</div></div>
    <ul class="pb-legs">${t.legs.map(l=>{ const c=legChance(l,fm); return `<li><span class="nm">${o.badge?o.badge(l):''}${glanceName(l)}<small>${esc(l.label)}${pbValMark(l)}</small>${o.legNote?o.legNote(l):''}</span><span class="pr">${fmtML(l.price)}${l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:''}<em${c?` data-legchance="${c.p}"`:''}>${c?(c.p*100).toFixed(0)+'%':'–'}</em></span>${legAdd?pbLegAddBtn(l):''}</li>`; }).join('')}</ul>""", 'pbTierCard: the chance and the legs')
sub1('p3', r"""  if(elo) return {...head,legs:L,p:sum.corr,dec:sum.dec,fair,...(t.likeliest?{likeliest:true}:{}),...U};
  return {...head,legs:L,corr:sum.corr,indep:sum.indep,dec:sum.dec,fair,likeliest:!!t.likeliest,
    thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length,...U};""",
     r"""  /* (app v138) chance 'fair' carried, so a level locked before it is drawn without a rule that did not choose it
     (pbRuleKnown) */
  const C=t.chance==='fair'?{chance:'fair'}:{};
  if(elo) return {...head,legs:L,p:sum.corr,dec:sum.dec,fair,...(t.likeliest?{likeliest:true}:{}),...U,...C};
  return {...head,legs:L,corr:sum.corr,indep:sum.indep,dec:sum.dec,fair,likeliest:!!t.likeliest,
    thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length,...U,...C};""", 'spTierIn: chance carried')

# ---------------------------------------------------------------- the Top 30 lines
sub1('p3', r"""const PB_TOP_N=30;
let PB_TOP_CACHE=new Map();""",
     r"""/* (app v138) the Top 30 lines in parts: Player lines (up to PB_TOP_PL), then Game bets filling to PB_TOP_N (moneylines and
   spreads, then the totals), each ranked by what $1 on it is expected to return at DraftKings' fair chance (pbEvKey), then
   the chance, then the lean, then pbOrd; Value picks, a hook's legs, first and only where a hook is set. Ranked as one
   list the team bets' real prices beat the estimate formula's assumed player margin, an artefact of the estimate, and
   would fill it */
const PB_TOP_N=30, PB_TOP_PL=20;
let PB_TOP_CACHE=new Map();""", 'PB_TOP_PL')
sub1('p3', r"""  const rank=list=>list.map(l=>{ const dec=mlToDec(l.price); return dec>1?{...l,dec,win:dec-1,ev:l.p*dec-1,fc:legFair(l,fm)}:null; })
    .filter(Boolean).sort((a,b)=>(b.ev-a.ev)||pbOrd(a,b));""",
     r"""  /* (app v138) fc, the row's fair column, is the leg's fair chance as stated (legFairStated), the chance its expected
     return is worked at: a total on one price at its own 50%, est. */
  const rank=list=>list.map(l=>{ const dec=mlToDec(l.price); return dec>1?{...l,dec,win:dec-1,ev:l.p*dec-1,fc:legFairStated(l,fm)}:null; })
    .filter(Boolean).sort((a,b)=>(pbEvKey(b.ev)-pbEvKey(a.ev))||(pbEvKey(b.p)-pbEvKey(a.p))||(pbEvKey(pbLean(b))-pbEvKey(pbLean(a)))||pbOrd(a,b));""", 'pbTopBuild: the rank')
sub1('p3', r"""  const P1=once(r.pref), P2=once(r.thin), P3=once(r.mkt); out.same=r.pref.length+r.thin.length+r.mkt.length-P1.length-P2.length-P3.length;
  /* the Value picks, then the other lines: the thin-edge lines, then the totals, each by expected return */
  out.rows=[...rank(P1),...rank(P2),...rank(P3)].slice(0,PB_TOP_N);
  return out;""",
     r"""  const P1=once(r.pref), P2=once(r.thin), P3=once(r.mkt); out.same=r.pref.length+r.thin.length+r.mkt.length-P1.length-P2.length-P3.length;
  /* (app v138) a hook's Value picks, then the player lines (up to PB_TOP_PL, more where the game bets do not fill the
     rest), then the game bets to PB_TOP_N: moneylines and spreads, then the totals */
  const V=rank(P1), Pl=rank(P2.filter(l=>!isGameLeg(l))), Gm=[...rank(P2.filter(isGameLeg)),...rank(P3)];
  const nV=Math.min(V.length,PB_TOP_N), R=PB_TOP_N-nV, nG=Math.min(Gm.length,R-Math.min(Pl.length,Math.min(PB_TOP_PL,R))), nP=Math.min(Pl.length,R-nG);
  out.rows=[...V.slice(0,nV),...Pl.slice(0,nP),...Gm.slice(0,nG)];
  out.parts={value:nV,player:nP,game:nG};
  return out;""", 'pbTopBuild: the parts')
sub1('p3', r"""function pbTopRow(l,i){
  const g=(S.sched||[]).find(x=>x.id===l.gid), pc=v=>(v*100).toFixed(0)+'%';
  const est=l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:'';
  const mark=pbValMark(l);
  return `<li class="pb-trow" data-pb-row="${i+1}" data-pb-grp="${pbIsValue(l)?'value':'other'}"><span class="pb-trk">${i+1}</span>
    <span class="nm">${glanceName(l)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}</span>
    <span class="pb-tcs"><span class="pb-tc"><b>${fmtML(l.price)}${est}</b><small>price</small></span><span class="pb-tc"><b data-pb-model="${l.p}">${pc(l.p)}</b><small>model</small></span><span class="pb-tc">""",
     r"""/* (app v138) a row: its price, a player's projection (a dash for a game bet or a touchdown), DraftKings' fair chance,
   what $1 wins and what it is expected to return at the fair chance; no model column */
function pbTopRow(l,i){
  const g=(S.sched||[]).find(x=>x.id===l.gid), pc=v=>(v*100).toFixed(0)+'%';
  const est=l.src==='dkline'?`<i class="est"${estAttr({src:'dkline',...(l.espn||{}),listed:true,tested:true})}> est.</i>`:'';
  const mark=pbValMark(l), proj=!isGameLeg(l)&&l.mu!=null&&isFinite(l.mu)?l.mu:null;
  return `<li class="pb-trow" data-pb-row="${i+1}" data-pb-grp="${pbIsValue(l)?'value':isGameLeg(l)?'game':'player'}"><span class="pb-trk">${i+1}</span>
    <span class="nm">${glanceName(l)}<small>${esc(l.label)}${mark}</small>${g?`<small class="pb-tg">${esc(g.a)} @ ${esc(g.h)}</small>`:''}</span>
    <span class="pb-tcs"><span class="pb-tc"><b>${fmtML(l.price)}${est}</b><small>price</small></span><span class="pb-tc"><b${proj!=null?` data-pb-proj="${proj}"`:''}>${proj!=null?num(proj,proj<10?1:0):'–'}</b><small>projected</small></span><span class="pb-tc">""", 'pbTopRow: the columns')
sub1('p3', r"""  const notes=[];
  if(formSig()==='noform') notes.push('Loading Elo ratings…');
  if(dkLegs.length)""",
     r"""  const notes=[];
  if(dkLegs.length)""", 'pbPanel: no Elo-loading note')
sub1('p3', r"""  if(r.far) notes.push(`${r.far} line${r.far===1?'':'s'} left out: far off the market.`);
""", r"""""", 'pbPanel: no far-off note')
sub1('p3', r"""  /* (app v112) two parts, each under its heading: the Value picks (the rows' prefix: the first part is the
     preferred lines alone), then the other lines, their ranks running on (the second list's start) */
  const nV=r.rows.filter(pbIsValue).length, V=r.rows.slice(0,nV), O=r.rows.slice(nV);
  const secHd=(id,title,n)=>`<h3 class="pb-topsec" data-pb-sec="${id}">${title}${n?` <span class="pill">${n}</span>`:''}</h3>`;
  const list=r.rows.length?secHd('value','Value picks',nV)
      +(nV?`<ol class="pb-top" data-pb-sec="value" aria-label="The ${nV} Value pick${nV===1?'':'s'} on your picks, by expected profit on $1">${V.map((l,i)=>pbTopRow(l,i)).join('')}</ol>`
        :`<p class="muted pb-topsub" data-pb-novalue>No line on your picks is a Value pick right now.</p>`)
      +(O.length?secHd('other','Other lines',O.length)+`<ol class="pb-top" data-pb-sec="other"${nV?` start="${nV+1}"`:''} aria-label="${nV?'Then ':''}${O.length} other line${O.length===1?'':'s'} on your picks, by expected profit on $1">${O.map((l,i)=>pbTopRow(l,nV+i)).join('')}</ol>`:'')
    :`<p class="pb-none pb-top-none">${esc(pbTopWhy(r,u))}</p>`;""",
     r"""  /* (app v138) the parts, each under its heading with its count, their ranks running on (each list's start): a hook's
     Value picks (drawn only with rows), then Player lines, then Game bets; a part with no rows is not drawn */
  const nV=r.rows.filter(pbIsValue).length, V=r.rows.slice(0,nV), rest=r.rows.slice(nV), Pl=rest.filter(l=>!isGameLeg(l)), Gm=rest.filter(isGameLeg);
  const secHd=(id,title,n)=>`<h3 class="pb-topsec" data-pb-sec="${id}">${title}${n?` <span class="pill">${n}</span>`:''}</h3>`;
  const part=(id,title,L,at,aria)=>L.length?secHd(id,title,L.length)+`<ol class="pb-top" data-pb-sec="${id}"${at?` start="${at+1}"`:''} aria-label="${aria}">${L.map((l,i)=>pbTopRow(l,at+i)).join('')}</ol>`:'';
  const s=n=>n===1?'':'s';
  const list=r.rows.length?part('value','Value picks',V,0,`The ${V.length} Value pick${s(V.length)} on your picks, by expected return on $1`)
      +part('player','Player lines',Pl,nV,`${nV?'Then ':'The '}${Pl.length} player line${s(Pl.length)} on your picks, by expected return on $1`)
      +part('game','Game bets',Gm,nV+Pl.length,`${nV+Pl.length?'Then ':'The '}${Gm.length} game bet${s(Gm.length)} on your picks, by expected return on $1`)
    :`<p class="pb-none pb-top-none">${esc(pbTopWhy(r,u))}</p>`;""", 'pbPanel: the parts')

# ---------------------------------------------------------------- the record's levels
sub1('p3', r"""function spLegOut(l,memo,elo){ const f=legFair(l,memo);
  return {gid:l.gid,week:l.week,pid:l.pid,team:l.team,grp:l.grp,stat:l.stat,k:l.k,side:l.side,main:!!l.main,price:l.price,src:l.src,name:l.name,label:l.label,
    p:spR(l.p,1e4),""",
     r"""/* (app v138) a leg's p is the model's chance (pm, on a pool copy at DraftKings' chance), as the record has always kept
   it; a level's p the model's chance all land (on pm; an Elo pick's the Elo chance), its fair DraftKings', and every
   level built since carries chance:'fair' (the rule it was chosen and stated on) */
function spLegOut(l,memo,elo){ const f=legFair(l,memo);
  return {gid:l.gid,week:l.week,pid:l.pid,team:l.team,grp:l.grp,stat:l.stat,k:l.k,side:l.side,main:!!l.main,price:l.price,src:l.src,name:l.name,label:l.label,
    p:spR(l.pm??l.p,1e4),""", 'spLegOut: the model\'s chance')
sub1('p3', r"""function spTierOut(t){ const memo={}, elo=spIsElo(t);
  if(!t||!t.legs||!t.legs.length) return {id:t.id,label:t.label,n:t.n,floor:t.floor,why:t.why};
  return {id:t.id,label:t.label,n:t.n,floor:t.floor,legs:t.legs.map(l=>spLegOut(l,memo,elo)),p:spR(elo?t.p:t.corr,1e4),fair:t.fair&&t.fair.p!=null?spR(t.fair.p,1e4):null,
    fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:elo?0:(t.thin||0),mkt:elo?0:(t.mkt||0),...(t.updated?{updated:t.updated}:{})}; }""",
     r"""function spTierOut(t){ const memo={}, elo=spIsElo(t);
  if(!t||!t.legs||!t.legs.length) return {id:t.id,label:t.label,n:t.n,floor:t.floor,why:t.why};
  const pm=!elo&&t.legs.some(l=>l.pm!=null)?parlayProb(pbOrder(t.legs.map(l=>({...l,p:l.pm??l.p})))).corr:null;
  return {id:t.id,label:t.label,n:t.n,floor:t.floor,legs:t.legs.map(l=>spLegOut(l,memo,elo)),p:spR(elo?t.p:(pm!=null?pm:t.corr),1e4),fair:t.fair&&t.fair.p!=null?spR(t.fair.p,1e4):null,
    fair_est:!!(t.fair&&t.fair.est),dec:spR(t.dec,1e3),likeliest:!!t.likeliest,thin:elo?0:(t.thin||0),mkt:elo?0:(t.mkt||0),...(t.updated?{updated:t.updated}:{}),chance:'fair'}; }""", 'spTierOut: chance fair')

# ---------------------------------------------------------------- Suggested Parlays: the sub-heading
sub1('p3', r"""  const cards=v.tiers?`<h5 class="sp-sub" data-sp-kind="model">Model parlays</h5>""",
     r"""  const cards=v.tiers?`<h5 class="sp-sub" data-sp-kind="model">Parlays</h5>""", 'spGameHtml: Parlays')

# ---------------------------------------------------------------- into the builder: the model's chance, never the copy's
sub1('p3', r"""    for(const l of L){ const {key,thin,pe,ev,imp,updated,fc,dec,win,...x}=l; S.parlay[key||legKey(l.gid,l.pid,l.stat)]=isGameLeg(x)?espnGlTag(x):x; }""",
     r"""    /* (app v138) a pool copy's p is DraftKings' chance: the builder keeps the model's (pm), as every leg it holds does */
    for(const l of L){ const {key,thin,pe,ev,imp,updated,fc,dec,win,pm,hook,pf,lean,...x}=l; x.p=l.pm??l.p; S.parlay[key||legKey(l.gid,l.pid,l.stat)]=isGameLeg(x)?espnGlTag(x):x; }""", 'pbPut: the model\'s chance')
sub1('p3', r"""      else { const {key:_k,thin,pe,ev,imp,updated,fc,dec,win,...x}=sl; S.parlay[key]=isGameLeg(x)?espnGlTag(x):x; }""",
     r"""      else { const {key:_k,thin,pe,ev,imp,updated,fc,dec,win,pm,hook,pf,lean,...x}=sl; x.p=sl.pm??sl.p; S.parlay[key]=isGameLeg(x)?espnGlTag(x):x; }""", 'pbLegClick: the model\'s chance')

# ---------------------------------------------------------------- the builder
sub1('p3', r"""  const fairML=probToAmerican(pr.corr);""",
     r"""  /* (app v138) the fair price is DraftKings' fair chance's where every leg has one (the model's only to price a parlay
     with a leg on no price at all, which states no chance) */
  const fairML=probToAmerican(fair&&fair.p!=null?fair.p:pr.corr);""", 'renderParlay: the fair price')
sub1('p3', r"""    <table><thead><tr><th>Player</th><th>The bet</th><th class="num">Projected</th><th class="num">Chance</th><th class="num">Price</th><th></th></tr></thead><tbody>`;""",
     r"""    <table><thead><tr><th>Player</th><th>The bet</th><th class="num">Projected</th><th class="num">Fair</th><th class="num">Price</th><th></th></tr></thead><tbody>`;""", 'renderParlay: the Fair column')
sub1('p3', r"""  legs.forEach((l,i)=>{
    const [c,lbl]=confTier(l.p), f=legFair(l,fm), far=!!f&&l.p-f.p>=FAR_OFF-1e-9;
    html+=`<tr class="legrow"><td class="plr">${glanceName(l,prices[i])}${l.grp==='TEAM'?'':injChip(l.pid)}<small>${esc(l.pos)} ⧵u00b7 ${esc(l.team)} v ${esc(l.opp)} ⧵u00b7 wk ${esc(l.week)}</small></td>
      <td><b>${esc(l.label)}</b>${far?`<small class="faroff" data-far>${farText(l.p,f)}</small>`:''}${dkSlipLine(slip&&slip[i],i)}</td>
      <td class="num">${l.mu==null?'⧵u2013':num(l.mu,l.mu<10?1:0)}</td>
      <td class="num">${(l.p*100).toFixed(0)}% <span class="conf ${c}" style="margin-left:6px">${lbl}</span>${f?`<small class="legfair" data-legfair="${f.p}" title="The book's fair chance on this leg: its price with the margin taken out${f.est?', estimated with the week⧵u2019s typical margin since only this side is priced':''}">fair ${(f.p*100).toFixed(0)}%${f.est?' est.':''}</small>`:''}</td>""",
     r"""  legs.forEach((l,i)=>{
    /* (app v138) the leg's chance is DraftKings' fair chance (legChance), est. where it is; a dash with none. The model's
       projection stays in its own column */
    const c=legChance(l,fm);
    html+=`<tr class="legrow"><td class="plr">${glanceName(l,prices[i])}${l.grp==='TEAM'?'':injChip(l.pid)}<small>${esc(l.pos)} ⧵u00b7 ${esc(l.team)} v ${esc(l.opp)} ⧵u00b7 wk ${esc(l.week)}</small></td>
      <td><b>${esc(l.label)}</b>${dkSlipLine(slip&&slip[i],i)}</td>
      <td class="num">${l.mu==null?'⧵u2013':num(l.mu,l.mu<10?1:0)}</td>
      <td class="num"${c?` data-legchance="${c.p}" title="DraftKings’ fair chance on this leg: its price with the margin taken out${c.est?', estimated':''}"`:''}>${c?`${(c.p*100).toFixed(0)}%${c.est?' est.':''}`:'–'}</td>""", 'renderParlay: the legs')
sub1('p3', r"""      ${fair&&fair.p!=null?`<div class="box hero"><b data-fair="${fair.p}">${(fair.p*100).toFixed(1)}%</b><span>fair chance all ${legs.length} land${fair.est?', est.':''}</span><small data-model="${pr.corr}">model says ${(pr.corr*100).toFixed(1)}%</small></div>`
        :`<div class="box hero"><b data-model="${pr.corr}">${(pr.corr*100).toFixed(1)}%</b><span>model's chance all ${legs.length} land</span><small>no fair chance</small></div>`}
      <div class="box"><b>${fmtML(fairML)}</b><span>fair price for the model's chance</span></div>
      <div class="box"><b class="payout">$${payout.toFixed(2)}</b><span>${(realPrice||estPrice)?`returned if it lands, $${profit.toFixed(2)} profit`:`if you got the fair price, $${profit.toFixed(2)} profit`}</span></div>
      ${(()=>{ const on=fair&&fair.p!=null, cp=on?fair.p:pr.corr, [c,l]=confTier(cp);
        return `<div class="box tier ${c}" data-conf="${cp}"><b>${l}</b><span>confidence all ${legs.length} land, on the ${on?'fair':'model⧵u2019s'} chance</span></div>`; })()}
    </div>`;""",
     r"""      ${fair&&fair.p!=null?(()=>{ const ev=fair.p*useDec-1, amt=stake*ev, sg=v=>v<-0.0005?'−':v>0.0005?'+':'';
          return `<div class="box hero"><b data-fair="${fair.p}">${(fair.p*100).toFixed(1)}%</b><span>fair chance all ${legs.length} land${fair.est?', est.':''}</span><small data-ev="${ev}" title="At DraftKings’ fair chance, on the price this pays">expected ${sg(amt)}$${Math.abs(amt).toFixed(2)} on ${pbAmt(stake)} (${sg(ev*100)}${Math.abs(ev*100).toFixed(1)}%)</small></div>`; })()
        :`<div class="box hero"><b>–</b><span>chance all ${legs.length} land</span><small>not every leg has a DraftKings price</small></div>`}
      <div class="box"><b>${fair&&fair.p!=null?fmtML(fairML):'–'}</b><span>fair price</span></div>
      <div class="box"><b class="payout">$${payout.toFixed(2)}</b><span>${(realPrice||estPrice)?`returned if it lands, $${profit.toFixed(2)} profit`:`if you got the fair price, $${profit.toFixed(2)} profit`}</span></div>
    </div>`;""", 'renderParlay: the boxes')

# ---------------------------------------------------------------- comments that the change makes history
sub1('p3', r"""   it is left out of the suggestions (pbPool, gameLegPool) and flagged wherever it is shown. Labelling
   and selection only: nothing of the model is refitted on the season in play.
""", r"""   it is left out of the suggestions (pbPool, gameLegPool) and flagged wherever it is shown. Labelling
   and selection only: nothing of the model is refitted on the season in play. (app v138) Every leg is now stated and
   chosen at that fair chance (legChance, below), so no suggestion leaves out or flags a leg far off it: only the hands'
   engine, gameLegPool, drawn nowhere, still reads legFarOff.
""", 'the fair chance\'s comment')
sub1('p3', r"""   A leg qualifies as the old Suggested parlays window's did: a real sportsbook price, the""",
     r"""   (app v138: the paragraph below is history. A leg now qualifies at DraftKings' fair chance, with no edge, market + form
   or far-off guard, every leg thin unless a chance hook rates it a Value pick, one side a line: pbLegs says the rule.
   The levels below are searched on that chance, so "best expected return" is the least costly parlay.)
   A leg qualifies as the old Suggested parlays window's did: a real sportsbook price, the""", 'the levels\' comment')
sub1('p3', r"""   no player legs, market + form deciding them: the tab says it is loading until they are), and no level is built again""",
     r"""   no Elo picks, which the set keeps beside it (app v138: the model's levels no longer need the ratings): the tab says it is
   loading until they are), and no level is built again""", 'spShown\'s comment')

# ---------------------------------------------------------------- the anytime touchdown on the model alone
sub1('p2', r"""   a receiver's or tight end's catches) where DraftKings lines them; else, his club's lines complete
   and he no charted starter, DraftKings treats him as a backup; else the model alone */
function guessTdPrice({p,grp,rushLine=null,recLine=null,teamImplied=null,gameLined=true,starter=false}){
  if(!(p>0&&p<1)) return null;
  const C=DK_EST.td, logit=x=>Math.log(x/(1-x)), ok=v=>v!=null&&isFinite(v);
  const parts=grp==='QB'?[rushLine]:grp==='RB'?[rushLine,recLine]:[recLine];
  const have=parts.filter(ok);
  let z;
  if(have.length&&C.yd[grp]!=null){""",
     r"""   a receiver's or tight end's catches) where DraftKings lines them; else, his club's lines complete
   and he no charted starter, DraftKings treats him as a backup; else the model alone.
   (app v138) tdBranch says which: 'lined', 'backup' or 'model'. Against DraftKings' real prices of weeks 2 to 6 the lined
   branch lands within about 1.5 implied points in every band (the held-out weeks 4 to 6 too) and the backup within half
   a point; the model alone was all but untested (54 legs) and runs high where it matters, its fair chance +3.1 points
   over DraftKings' where it states 45%+ and +8.9 at 70%+, so a touchdown it prices is no tested kind (espnPrice) */
function tdBranch({grp,rushLine=null,recLine=null,gameLined=true,starter=false}){
  const ok=v=>v!=null&&isFinite(v), parts=grp==='QB'?[rushLine]:grp==='RB'?[rushLine,recLine]:[recLine];
  return parts.some(ok)&&DK_EST.td.yd[grp]!=null?'lined':(gameLined&&!starter?'backup':'model');
}
function guessTdPrice(o){
  const {p,grp,rushLine=null,recLine=null,teamImplied=null}=o, b=tdBranch(o);
  if(!(p>0&&p<1)) return null;
  const C=DK_EST.td, logit=x=>Math.log(x/(1-x)), ok=v=>v!=null&&isFinite(v);
  const parts=grp==='QB'?[rushLine]:grp==='RB'?[rushLine,recLine]:[recLine];
  const have=parts.filter(ok);
  let z;
  if(b==='lined'){""", 'guessTdPrice: its branch')
sub1('p2', r"""  } else if(gameLined&&!starter){
    z=C.a0+C.b0*logit(p);""", r"""  } else if(b==='backup'){
    z=C.a0+C.b0*logit(p);""", 'guessTdPrice: the backup branch')
sub1('p2', r"""  if(leg.kind==='td'){ const price=guessTdPrice(leg); return price==null?null:{price,fair:null,how:'anytime TD'}; }""",
     r"""  if(leg.kind==='td'){ const price=guessTdPrice(leg), alone=tdBranch(leg)==='model'; return price==null?null:{price,fair:null,how:alone?'anytime TD: the model alone':'anytime TD',alone}; }""",
     'estPrice: a touchdown on the model alone')
sub1('p3', r"""   on passing, rushing or receiving yards, receptions or passing touchdowns; the anytime touchdown; and a
   yards ladder rung DraftKings lists, anchored on its line. Every other dkline leg (completions,""",
     r"""   on passing, rushing or receiving yards, receptions or passing touchdowns; the anytime touchdown, but (app v138) one
   priced on the model alone, with no yards line of his read (tdBranch: never tested against DraftKings' prices, and
   high where it states 45%+), until a later read carries his line; and a
   yards ladder rung DraftKings lists, anchored on its line. Every other dkline leg (completions,""", 'ESPN_TESTED\'s comment')
sub1('p3', r"""    return {price:r.price,fair:Math.max(0.001,Math.min(0.999,mlProb(r.price)/ov)),src:'dkline',tested:true,listed:true,line:null,at:e.at,how:r.how,mainOver:false};""",
     r"""    return {price:r.price,fair:Math.max(0.001,Math.min(0.999,mlProb(r.price)/ov)),src:'dkline',tested:!r.alone,alone:!!r.alone,listed:true,line:null,at:e.at,how:r.how,mainOver:false};""",
     'espnPrice: a touchdown on the model alone is no tested kind')
sub1('p3', r"""    return `DraftKings’ line from ESPN${rd}; the price is our estimate (${o.tested?ESPN_ERR:'untested on this market: no DraftKings price on file to check it against'})`; }""",
     r"""    return `DraftKings’ line from ESPN${rd}; the price is our estimate (${o.tested?ESPN_ERR:o.alone?'untested: from the model alone, no yards line of his read':'untested on this market: no DraftKings price on file to check it against'})`; }""",
     'estTitle: a touchdown on the model alone')

# ---------------------------------------------------------------- the sets built at app v137's speed, choosing the same
# Suggested Parlays built every set about three times slower than app v137 (week 7's Sunday at 10:00 UTC in Chromium: 6.6 s
# against 2.1 s, each game one task of 0.4 to 0.9 s): every leg is thin now, so each game's beams run over 24 to 41 legs
# at once, and the review's 40 finalists of each search are worked in full where 4 and 10 were. Profiled, the time was the
# beam (about half: pbEval, pbJoint and legRho worked from strings for every partial parlay, and every step's thousands
# of candidates sorted whole) and the full sums (parlayProb's trials, two fifths). Two changes, neither moving a level:
# - pbBeam scores a parlay one leg longer from its parent's figures, every leg and pair it meets indexed once with the
#   memo (pbCtx: the leg's chance, the price's implied chance, its decimal price, lean and game; per pair whether the two
#   go together, pbFits, and pbJoint's lift by each reading, worked once), keys a set by its legs' indexes, and keeps each
#   step's best `width` by a selection on the rounded score before sorting only those. The same parlays in the same order,
#   the legs in the order they were first put together, the figures within a few units in the 16th place (a product
#   worked in another order; pbEvKey rounds the score to 1e-9). pbEval, pbJoint and pbDecApprox stay as the reference.
# - parlayProb counts its hits for 2 to 5 legs without a branch on each leg: every leg's z the very sum it was, term for
#   term in the same order, and a trial a hit exactly where every leg lands, so the same count to the bit (the nflbets
#   smoke holds it to app v134's own copy).
# On week 7's Sunday, every set the same to the bit as before, in about a sixth of the time in Chromium (6.1-6.9 s for the
# twelve games' sets, 0.94-1.13 s).
sub1('p2', r"""    const Z=C.z, F=new Float64Array(n*n);
    for(let i=0;i<n;i++) for(let k=0;k<=i;k++) F[i*n+k]=L[i][k];
    for(let s=0,b=0;s<sims;s++,b+=2*q){ let ok=true;
      for(let i=0,o=0;i<n&&ok;i++,o+=n){ let z=0; for(let k=0;k<=i;k++) z+=F[o+k]*Z[b+k]; if(dir[i]*z<=thr[i]) ok=false; }
      if(ok) hits++; }""",
     r"""    const Z=C.z, F=new Float64Array(n*n), st=2*q;
    for(let i=0;i<n;i++) for(let k=0;k<=i;k++) F[i*n+k]=L[i][k];
    /* (app v138) 2 to 5 legs, every leg of a trial worked and a hit counted where all land, with no branch on each leg
       (a coin flip the processor guesses wrong half the time): each leg's z is the very sum it was (0, then each term
       added in turn, row i's terms in order, so the same double), and a leg lands exactly where dir*z<=thr is false
       (z is never NaN), so the same count to the bit, in about a third of the time. 6 legs or more as before */
    if(n===2){ const d0=dir[0], d1=dir[1], t0=thr[0], t1=thr[1], a0=F[0], b0=F[2], b1=F[3];
      for(let s=0,b=0;s<sims;s++,b+=st){ const z0=Z[b], z1=Z[b+1];
        hits+=(d0*(0+a0*z0)>t0)&(d1*(0+b0*z0+b1*z1)>t1); } }
    else if(n===3){ const d0=dir[0], d1=dir[1], d2=dir[2], t0=thr[0], t1=thr[1], t2=thr[2], a0=F[0], b0=F[3], b1=F[4], c0=F[6], c1=F[7], c2=F[8];
      for(let s=0,b=0;s<sims;s++,b+=st){ const z0=Z[b], z1=Z[b+1], z2=Z[b+2];
        hits+=(d0*(0+a0*z0)>t0)&(d1*(0+b0*z0+b1*z1)>t1)&(d2*(0+c0*z0+c1*z1+c2*z2)>t2); } }
    else if(n===4){ const d0=dir[0], d1=dir[1], d2=dir[2], d3=dir[3], t0=thr[0], t1=thr[1], t2=thr[2], t3=thr[3], a0=F[0], b0=F[4], b1=F[5], c0=F[8], c1=F[9], c2=F[10], e0=F[12], e1=F[13], e2=F[14], e3=F[15];
      for(let s=0,b=0;s<sims;s++,b+=st){ const z0=Z[b], z1=Z[b+1], z2=Z[b+2], z3=Z[b+3];
        hits+=(d0*(0+a0*z0)>t0)&(d1*(0+b0*z0+b1*z1)>t1)&(d2*(0+c0*z0+c1*z1+c2*z2)>t2)&(d3*(0+e0*z0+e1*z1+e2*z2+e3*z3)>t3); } }
    else if(n===5){ const d0=dir[0], d1=dir[1], d2=dir[2], d3=dir[3], d4=dir[4], t0=thr[0], t1=thr[1], t2=thr[2], t3=thr[3], t4=thr[4], a0=F[0], b0=F[5], b1=F[6], c0=F[10], c1=F[11], c2=F[12], e0=F[15], e1=F[16], e2=F[17], e3=F[18], g0=F[20], g1=F[21], g2=F[22], g3=F[23], g4=F[24];
      for(let s=0,b=0;s<sims;s++,b+=st){ const z0=Z[b], z1=Z[b+1], z2=Z[b+2], z3=Z[b+3], z4=Z[b+4];
        hits+=(d0*(0+a0*z0)>t0)&(d1*(0+b0*z0+b1*z1)>t1)&(d2*(0+c0*z0+c1*z1+c2*z2)>t2)&(d3*(0+e0*z0+e1*z1+e2*z2+e3*z3)>t3)&(d4*(0+g0*z0+g1*z1+g2*z2+g3*z3+g4*z4)>t4); } }
    else for(let s=0,b=0;s<sims;s++,b+=st){ let ok=true;
      for(let i=0,o=0;i<n&&ok;i++,o+=n){ let z=0; for(let k=0;k<=i;k++) z+=F[o+k]*Z[b+k]; if(dir[i]*z<=thr[i]) ok=false; }
      if(ok) hits++; }""", 'parlayProb: the trials without a branch a leg')
sub1('p3', r"""/* the beam: every partial parlay one leg longer, the best `width` of them by `by` kept at each
   size; one well under the floor is dropped as soon as it is (another leg only lowers it) */
function pbBeam(pools,floor,by,width,memo){
  let beam=[{legs:[],id:''}];
  for(let s=0;s<pools.length;s++){
    const next=new Map();
    for(const b of beam){
      /* (app v135) each candidate's id is the parent's ids, already sorted, with the new leg's put in its place (the string
         pbEval would make), and a parlay scored already is taken from the memo by it */
      const bi=b.ids||(b.ids=b.legs.map(pbId).sort());
      for(const c of pools[s]){ if(!pbFits(b.legs,c)) continue;
        const ci=pbId(c); let lo=0, hi=bi.length; while(lo<hi){ const m=(lo+hi)>>1; if(bi[m]<ci) lo=m+1; else hi=m; }
        const ids=bi.slice(0,lo); ids.push(ci); for(let t=lo;t<bi.length;t++) ids.push(bi[t]);
        const id=ids.join(','); if(next.has(id)) continue;
        let e=memo.get(id); if(!e||typeof e!=='object') e=pbEval([...b.legs,c],memo);
        if(next.has(e.id)||(floor&&e.pr<floor*0.9)) continue; if(!e.ids) e.ids=ids; next.set(e.id,e); } }
    if(!next.size) return [];
    beam=[...next.values()].sort(pbRank(by)).slice(0,width);
  }
  return beam;
}""",
     r"""/* (app v138) the search's own figures, kept with the memo (pbCtx): each leg it meets indexed once, by its id, with its
   chance (pbJoint's modelP), the price's implied chance (mlP), its decimal price, its lean and its game; for a pair, whether
   the two go together (pbFits on the two: every rule it applies is one between two legs) and the lift each reading gives
   it, pbJoint's own (a before b), worked the first time it is wanted; and every partial parlay scored, by its legs'
   indexes. Built for pbBeam, which on week 7's sets spent half the tab's time making and hashing the strings pbEval keys
   them by and sorting every step's thousands of candidates whole */
const PB_FAST={};
function pbCtx(memo){
  let x=memo.get(PB_FAST); if(x) return x;
  x={ix:new Map(),L:[],id:[],p:[],q:[],dec:[],ln:[],gc:[],gix:new Map(),N:0,cap:0,ok:null,lm:null,lb:null,sets:new Map(),st:0,
    root:{s:[],o:[],raw:1,pr:1,d:1,ev:1,g:[],ln:0,kpr:0,kev:0,kln:0,st:0,e:null}};
  memo.set(PB_FAST,x); return x;
}
function pbCtxGrow(x,need){
  if(need<=x.cap) return;
  let cap=Math.max(64,x.cap); while(cap<need) cap*=2;
  const ok=new Int8Array(cap*cap).fill(-1), lm=new Float64Array(cap*cap).fill(NaN), lb=new Float64Array(cap*cap).fill(NaN);
  for(let i=0;i<x.N;i++) for(let j=0;j<x.N;j++){ ok[i*cap+j]=x.ok[i*x.cap+j]; lm[i*cap+j]=x.lm[i*x.cap+j]; lb[i*cap+j]=x.lb[i*x.cap+j]; }
  x.ok=ok; x.lm=lm; x.lb=lb; x.cap=cap;
}
function pbCtxLeg(x,l){
  const s=pbId(l); let i=x.ix.get(s); if(i!=null) return i;
  pbCtxGrow(x,x.N+1); i=x.N++; x.ix.set(s,i); x.L.push(l); x.id.push(s); x.p.push(modelP(l)); x.q.push(mlP(l)); x.dec.push(mlToDec(l.price)||1); x.ln.push(pbLean(l));
  let g=x.gix.get(l.gid); if(g==null){ g=x.gix.size; x.gix.set(l.gid,g); } x.gc.push(g);
  return i;
}
/* a pair's lift as pbJoint works it (a before b; 1 where the two hardly move together), by the model's chances or the book's */
function pbLift(x,a,b,book){
  const M=book?x.lb:x.lm, k=a*x.cap+b; let v=M[k];
  if(v===v) return v;
  const A=x.L[a], B=x.L[b], r=legRho(A,B);
  if(Math.abs(r)<0.03) v=1;
  else { const pa=book?x.q[a]:x.p[a], pb=book?x.q[b]:x.p[b], da=A.side==='under'?-1:1, db=B.side==='under'?-1:1;
    v=bvnLower(-invNorm(1-pa),-invNorm(1-pb),da*db*r)/(pa*pb); }
  M[k]=v; return v;
}
function pbPairOk(x,a,b){ const k=a*x.cap+b; let v=x.ok[k]; if(v<0){ v=pbFits([x.L[a]],x.L[b])?1:0; x.ok[k]=v; x.ok[b*x.cap+a]=v; } return v===1; }
/* a partial parlay one leg (c) longer than P, scored from P's own figures: the model's product times c's chance and its lift
   with each leg (pbJoint's terms), and each game's count, price product and book product (pbDecApprox's), the price worked
   from them as pbDecApprox works it. s: the legs' indexes sorted; o: in the order they were put together (the legs pbEval
   would have been given) */
function pbGrow(x,P,c){
  const s=P.s, n=s.length, S=new Array(n+1); let j=0, put=false;
  for(let i=0;i<n;i++){ if(!put&&c<s[i]){ S[j++]=c; put=true; } S[j++]=s[i]; }
  if(!put) S[j]=c;
  const o=P.o; let raw=P.raw*x.p[c];
  for(let i=0;i<n;i++){ const v=pbLift(x,o[i],c,false); if(v!==1) raw*=v; }
  const gc=x.gc[c], G=P.g, Gc=G.slice(); let gi=-1;
  for(let i=0;i<G.length;i+=4) if(G[i]===gc){ gi=i; break; }
  if(gi<0) Gc.push(gc,1,x.dec[c],x.q[c]);
  else { let pj=G[gi+3]*x.q[c]; for(let i=0;i<n;i++) if(x.gc[o[i]]===gc){ const v=pbLift(x,o[i],c,true); if(v!==1) pj*=v; }
    Gc[gi+1]=G[gi+1]+1; Gc[gi+2]=G[gi+2]*x.dec[c]; Gc[gi+3]=pj; }
  let d=1;
  for(let i=0;i<Gc.length;i+=4){ const cnt=Gc[i+1], mult=Gc[i+2];
    if(cnt<2){ d*=mult; continue; }
    const pj=Math.max(0,Math.min(1,Gc[i+3])); d*=(pj>0&&isFinite(pj))?Math.min(mult,(1/pj)*SGP_HOLD):mult; }
  const pr=Math.max(0,Math.min(1,raw)), ev=pr*d, ln=P.ln+x.ln[c];
  return {s:S,o:o.concat(c),raw,pr,d,ev,g:Gc,ln,kpr:pbEvKey(pr),kev:pbEvKey(ev),kln:pbEvKey(ln),st:0,e:null};
}
/* a scored parlay as pbEval gives it ({legs, pr, d, ev, id, ln, ids}), made once */
const pbEntry=(x,E)=>{ if(!E.e){ const ids=E.s.map(i=>x.id[i]).sort(); E.e={legs:E.o.map(i=>x.L[i]),pr:E.pr,d:E.d,ev:E.ev,id:ids.join(','),ln:E.ln,ids}; } return E.e; };
/* the k-th largest (k from 1) of a's values, reordering a (Hoare's selection) */
function pbKth(a,k){
  let lo=0, hi=a.length-1; k-=1;
  while(lo<hi){ const v=a[(lo+hi)>>1]; let i=lo, j=hi;
    while(i<=j){ while(a[i]>v) i++; while(a[j]<v) j--; if(i<=j){ const t=a[i]; a[i]=a[j]; a[j]=t; i++; j--; } }
    if(k<=j) hi=j; else if(k>=i) lo=i; else return a[k]; }
  return a[k];
}
/* the beam: every partial parlay one leg longer, the best `width` of them by `by` kept at each
   size; one well under the floor is dropped as soon as it is (another leg only lowers it).
   (app v138) Each scored from its parent's figures (pbGrow) and kept by its legs' indexes, the same parlays in the same
   order as before (pbRank: the score to 1e-9, the larger lean, the id), each step's best `width` chosen by a selection on
   the rounded score (pbKth), only those sorted; a set of up to 5 legs among fewer than 64 is keyed by a small number, any
   other by its indexes joined */
function pbBeam(pools,floor,by,width,memo){
  const x=pbCtx(memo), P=pools.map(pl=>pl.map(c=>pbCtxLeg(x,c))), kk=by==='ev'?'kev':'kpr', small=x.N<64&&pools.length<=5;
  const cmp=(a,b)=>(b[kk]-a[kk])||(b.kln-a.kln)||pbEntry(x,a).id.localeCompare(pbEntry(x,b).id);
  let beam=[x.root];
  for(let s=0;s<pools.length;s++){
    const stamp=++x.st, next=[], Pc=P[s];
    for(let bi=0;bi<beam.length;bi++){ const B=beam[bi], o=B.o, bs=B.s, n=bs.length;
      for(let ci=0;ci<Pc.length;ci++){ const c=Pc[ci];
        let fit=true; for(let i=0;i<n;i++) if(!pbPairOk(x,o[i],c)){ fit=false; break; }
        if(!fit) continue;
        let k;
        if(small){ k=0; let put=false; for(let i=0;i<n;i++){ const v=bs[i]; if(!put&&c<v){ k=k*64+c+1; put=true; } k=k*64+v+1; } if(!put) k=k*64+c+1; }
        else { const S=bs.slice(); S.push(c); S.sort((a,b)=>a-b); k=S.join(','); }
        let E=x.sets.get(k);
        if(E){ if(E.st===stamp) continue; }
        else { E=pbGrow(x,B,c); x.sets.set(k,E); }
        E.st=stamp;
        if(floor&&E.pr<floor*0.9) continue;
        next.push(E); } }
    if(!next.length) return [];
    let keep=next;
    if(next.length>width){
      const sk=new Float64Array(next.length); for(let i=0;i<next.length;i++) sk[i]=next[i][kk];
      const T=pbKth(sk,width), hi=[], eq=[];
      for(let i=0;i<next.length;i++){ const v=next[i][kk]; if(v>T) hi.push(next[i]); else if(v===T) eq.push(next[i]); }
      if(hi.length+eq.length>width) eq.sort(cmp);
      keep=hi.concat(eq.slice(0,width-hi.length)); }
    keep.sort(cmp);
    beam=keep.length>width?keep.slice(0,width):keep;
  }
  return beam.map(E=>pbEntry(x,E));
}""", 'pbBeam: scored from the parent')
sub1('p3', r"""   That is exact for two legs and close for more. Only the finalists are then worked with the""",
     r"""   That is exact for two legs and close for more. (app v138: pbBeam works the same score from each parent's figures,
   pbCtx and pbGrow below; pbEval stays the reference reading, which the checks hold the search to.) Only the finalists are then worked with the""", 'the score\'s comment')
sub1('p3', r"""   cheaper one. The real sums are seeded and kept (parlayProb.cache), so 40 cost a few tenths of a second a game */""",
     r"""   cheaper one. The real sums are seeded and kept (parlayProb.cache), and a parlay of 2 to 5 legs is counted without a
   branch a leg, so on week 7's Sunday every game's set takes 50 to 170 ms in Chromium, the beam about a third of it */""",
     'SP_SEARCH\'s comment')
# The tab's opening a level at a time: spOpenSoft built a game's whole set in one task (the first game's, with the
# search's code not yet compiled, 0.2 to 0.26 s in Chromium); each step is now one level of one game's set (spPartStep),
# the very levels spBuild makes in one go (spLevel, on the same pool and the same memo, in the same order, so the same
# set and the same HTML), and a task runs steps until about 40 ms have passed (SP_SLICE_MS), so the browser's clamp on a
# chain of timers (4 ms each from the fifth) is paid less often. The tab's last draw stays a task of its own.
sub1('p3', r"""function spBuild(g){
  if(g.slot) return spSlotBuild(g);
  const pool=pbPool([g],SP_ALL,SP_SEARCH), memo=new Map();
  const tiers=PB_TIERS.map(t=>{ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; });
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0,
    max:pbMaxLegs([...pool.pref,...pool.thin,...pool.mkt]),fit:pbMaxFit([...pool.pref,...pool.thin,...pool.mkt])};
}""",
     r"""/* (app v138) one level of a game's set, on the game's pool and the set's memo (spBuild's, and spOpenSoft's a level a step) */
function spLevel(t,pool,memo,g){ const [id,label,n,floor]=t, r=pbTier(t,pool,memo,SP_SEARCH); return r?{id,label,n,floor,...r}:{id,label,n,floor,why:spWhy(n,pool,g)}; }
function spSetOf(g,pool,tiers){
  return {gid:g.id,tiers,pref:pool.pref.length,thin:pool.thin.length,mkt:pool.mkt.length,far:pool.far,farDk:pool.farDk||0,noId:pool.noId||0,moved:pool.moved||0,plGames:pool.plGames,plNoId:pool.plNoId||0,
    max:pbMaxLegs([...pool.pref,...pool.thin,...pool.mkt]),fit:pbMaxFit([...pool.pref,...pool.thin,...pool.mkt])};
}
function spBuild(g){
  if(g.slot) return spSlotBuild(g);
  const pool=pbPool([g],SP_ALL,SP_SEARCH), memo=new Map();
  return spSetOf(g,pool,PB_TIERS.map(t=>spLevel(t,pool,memo,g)));
}
/* (app v138) a game's set built a level a step (spOpenSoft): w, the game, and once its first step has run the set's
   signature and pool and the memo its levels share, as spBuild's; the set kept in SP_CACHE with its last level, as spSet
   keeps one. A set built meanwhile (a draw) leaves the steps nothing to do */
function spPartStep(w){
  if(w.done) return;
  if(!w.pool){ w.sig=spSig(w.g); if(SP_CACHE.has(w.sig)){ w.done=true; return; } w.pool=pbPool([w.g],SP_ALL,SP_SEARCH); w.memo=new Map(); w.tiers=[]; }
  w.tiers.push(spLevel(PB_TIERS[w.tiers.length],w.pool,w.memo,w.g));
  if(w.tiers.length<PB_TIERS.length) return;
  w.done=true; if(SP_CACHE.has(w.sig)) return;
  SP_CACHE.set(w.sig,{sig:w.sig,...spSetOf(w.g,w.pool,w.tiers)}); if(SP_CACHE.size>48) SP_CACHE.delete(SP_CACHE.keys().next().value);
}""", 'spBuild: a level at a time')
sub1('p3', r"""/* (app v135) what opening the tab has still to build, a step a game: each live unit's games (a night game, or each game
   of the Sunday slot), its own set (spSet, the cache the slot's levels are taken from) and its Elo picks on that game
   alone ('in this game', as eloUnit builds them for a night game and the slot builds them a game at a time), each only
   where it is not built yet; a unit locked or under way builds nothing new (the record's set) */""",
     r"""/* (app v135) what opening the tab has still to build, a step a game: each live unit's games (a night game, or each game
   of the Sunday slot), its own set (spSet, the cache the slot's levels are taken from) and its Elo picks on that game
   alone ('in this game', as eloUnit builds them for a night game and the slot builds them a game at a time), each only
   where it is not built yet; a unit locked or under way builds nothing new (the record's set). (app v138) A game's set is
   four steps, a level each (spPartStep) */""", 'spWarmSteps\' comment')
sub1('p3', r"""      if(!SP_CACHE.has(spSig(g))) steps.push(()=>spSet(g.id));""",
     r"""      if(!SP_CACHE.has(spSig(g))){ const w={g}; for(let i=0;i<PB_TIERS.length;i++) steps.push(()=>spPartStep(w)); }""", 'spWarmSteps: a level a step')
sub1('p3', r"""   built, then each step in a task of its own, the page free between them, and drawn whole from those caches (renderSp,
   the same HTML as drawing it at once). Leaving the tab stops it, and any other draw of the tab ends it. null where
   nothing is left to build (then the caller draws the tab at once); else a promise of true once drawn, false if stopped */""",
     r"""   built, then each step in a task of its own, the page free between them, and drawn whole from those caches (renderSp,
   the same HTML as drawing it at once). Leaving the tab stops it, and any other draw of the tab ends it. null where
   nothing is left to build (then the caller draws the tab at once); else a promise of true once drawn, false if stopped.
   (app v138) A task runs steps until SP_SLICE_MS have passed (a level of a set is 10 to 60 ms in Chromium, so a task is
   rarely over 100 ms), and the last draw is a task of its own */""", 'spOpenSoft\'s comment')
sub1('p3', r"""/* (app v135) the tab opened without holding the page: drawn at once""",
     r"""/* (app v138) how long a task of spOpenSoft's runs its steps, in ms, on the page's own timer (performance.now) */
const SP_SLICE_MS=40, spNow=()=>typeof performance!=='undefined'&&performance&&typeof performance.now==='function'?performance.now():Date.now();
/* (app v135) the tab opened without holding the page: drawn at once""", 'SP_SLICE_MS')
sub1('p3', r"""      const f=run.steps.shift();
      if(f){ try{ f(); }catch(err){ console.error(err); } setTimeout(next,0); return; }
      SP_SOFT=null; try{ renderSp(); }catch(err){ console.error(err); } done(true); };""",
     r"""      if(run.steps.length){ const t0=spNow();
        do{ const f=run.steps.shift(); try{ f(); }catch(err){ console.error(err); } }while(run.steps.length&&spNow()-t0<SP_SLICE_MS);
        setTimeout(next,0); return; }
      SP_SOFT=null; try{ renderSp(); }catch(err){ console.error(err); } done(true); };""", 'spOpenSoft: steps until the slice is used')

# A finalist that misses its floor in full is never taken, so its price is not worked (pbExact's floor): on a level whose
# finalists mostly land under the floor (week 7's GB at DET Aggressive, 28 of 40; Thursday's CAR at GB Medium and
# Aggressive, all 40) that is a same-game parlayDec saved each. The same pick, the same figures.
sub1('p3', r"""/* a finalist with the builder's own sums, on the legs in the builder's order */
function pbExact(legs){
  const L=pbOrder(legs.map(l=>({...l}))), pr=parlayProb(L);
  return""", r"""/* a finalist with the builder's own sums, on the legs in the builder's order. (app v138) floor: null where its chance in
   full is under the floor, its price not worked (a finalist that misses the floor is never taken) */
function pbExact(legs,floor){
  const L=pbOrder(legs.map(l=>({...l}))), pr=parlayProb(L);
  if(floor&&pr.corr<floor) return null;
  return""", 'pbExact: no price for a finalist under its floor')
sub1('p3', r"""    for(const e of top){ const r=pbExact(e.legs); if(floor&&r.corr<floor) continue;""",
     r"""    for(const e of top){ const r=pbExact(e.legs,floor); if(!r) continue;""", 'pbBestReturn: a finalist under its floor unpriced')

# ---------------------------------------------------------------- the third review (27 October 2026)
# (1) A draw of Suggested Parlays while spOpenSoft is still building it on the screen took the rest of the sets in one
# task: the page's half-minute look, finding what is shown stale (a kickoff, a lock, the sets going up at 6:00 AM), calls
# renderParlay, whose renderSp ended the run and built every set left at once (week 7's files, the tab opened on the
# Friday morning the Sunday sets went up: one task of 2.8 s). Such a draw now takes the run's steps again from the page as
# it stands and keeps the building line (spSoftAgain), and a run marks what it shows from its start (SP_SHOWN), so a look
# finds nothing stale unless something moved. (2) renderSp replaces the tab whole, so a control the reader was on (a leg's
# Add, a level's Add to builder or Finish, a name, Refresh odds) lost the focus to the page's body when the look drew the
# tab at a lock or a kickoff: the same control is found again by the attributes it keeps, in the same unit and level,
# else the tab's own button (spFocusOf, spFocusBack). (3) A game whose read found DraftKings' touchdown lists and no line
# (every Sunday game but one on Tuesday's read of week 8) has no player leg, its touchdowns being priced on the model
# alone, and its empty levels said "no player lines yet", though DraftKings had posted its scorers: they say "no yards
# lines yet" there (espnTdOnly), the Elo picks "No yards lines in this game yet".
sub1('p3', r"""/* (app v130) the one phrase for no player lines, every such reason made of it: DraftKings had posted none when its
   lines were last read from ESPN at t (the published read or a press, espnLastRead), or they have not been read */
const noPlSay=t=>t?`no player lines yet (read ${espnWhen(t)})`:'player lines not read yet';
/* (app v125) no player line on these games (ids; none: the week's games still to come) */
function pbNoPl(ids){ return noPlSay(espnLastRead(ids||pbGames().map(g=>g.id)))+'.'; }""",
     r"""/* (app v130) the one phrase for no player lines, every such reason made of it: DraftKings had posted none when its
   lines were last read from ESPN at t (the published read or a press, espnLastRead), or they have not been read.
   (app v138, the review of 27 October 2026) "no yards lines yet" where the read of these games (ids) found DraftKings'
   touchdown lists and no line at all (espnTdOnly): each of those touchdowns is priced on the model alone, which no
   suggestion takes, so the games have no player leg though DraftKings has posted its scorers for them */
function espnTdOnly(ids){ let td=false; const n=o=>o&&typeof o==='object'?Object.keys(o).length:0;
  for(const id of ids||[]){ const g=((S&&S.sched)||[]).find(x=>x.id===id), e=g?espnGame(id,g.w):null; if(!e) continue;
    if(n(e.lines)||n(e.rungs)) return false; if(Array.isArray(e.td)&&e.td.length) td=true; }
  return td; }
const noPlSay=(t,ids)=>t?`${espnTdOnly(ids)?'no yards lines':'no player lines'} yet (read ${espnWhen(t)})`:'player lines not read yet';
/* (app v125) no player line on these games (ids; none: the week's games still to come) */
function pbNoPl(ids){ const I=ids||pbGames().map(g=>g.id); return noPlSay(espnLastRead(I),I)+'.'; }""", 'noPlSay: no yards lines on a read of touchdown lists alone')
sub1('p3', r"""function spNoPl(g){ return noPlSay(espnLastRead(spGamesOf(g).map(x=>x.id)))+'.'; }""",
     r"""function spNoPl(g){ const I=spGamesOf(g).map(x=>x.id); return noPlSay(espnLastRead(I),I)+'.'; }""", 'spNoPl: the games to noPlSay')
sub1('p3', r"""      const why=s.plNoId?`No player leg with a DraftKings id ${where}.`:t?`No player lines ${where} yet (read ${espnWhen(t)}).`:`No player lines ${where} read yet.`;""",
     r"""      const why=s.plNoId?`No player leg with a DraftKings id ${where}.`:t?`No ${espnTdOnly(spGamesOf(u).map(x=>x.id))?'yards':'player'} lines ${where} yet (read ${espnWhen(t)}).`:`No player lines ${where} read yet.`;""", 'spEloSet: no yards lines on a read of touchdown lists alone')
sub1('p3', r"""function renderSp(){
  const el=$('spPanel'); if(!el||!S||!S.sched) return;
  SP_SOFT=null;   /* (app v135) drawn whole: a run of spOpenSoft still going has nothing left to do */""",
     r"""function renderSp(){
  const el=$('spPanel'); if(!el||!S||!S.sched) return;
  const fk=spFocusOf();
  /* (app v138, the review of 27 October 2026) a draw of the tab while spOpenSoft is still building it on the screen (the
     page's half-minute look finding what is shown stale at a kickoff, a lock or a morning's turn, the record read again,
     a press of Refresh odds) takes the run's steps again from the page as it now stands and keeps the building line,
     rather than building every set left in this one task: the run's own last draw shows the page as it is then */
  if(spSoftAgain()){ spFocusBack(fk); return; }
  SP_SOFT=null;   /* (app v135) drawn whole: a run of spOpenSoft still going has nothing left to do */""", 'renderSp: a run still building takes its steps again')
sub1('p3', r"""  $('spHead').innerHTML=spHeadHtml(); $('spSets').innerHTML=spSetsHtml(on);
  SP_SHOWN=spState();
}""", r"""  $('spHead').innerHTML=spHeadHtml(); $('spSets').innerHTML=spSetsHtml(on);
  SP_SHOWN=spState();
  spFocusBack(fk);
}
/* (app v138, the review of 27 October 2026) the run of spOpenSoft still building the tab on the screen: its steps taken
   again from the page as it now stands (a set built since is not built again; one half built starts again from its
   pool), its head drawn again, what it shows marked; false where there is none */
function spSoftAgain(){
  const run=SP_SOFT, tab=$('tab-suggest'), sets=$('spSets');
  if(!run||(tab&&tab.hidden)||!sets||!sets.querySelector('[data-sp-building]')||!$('spHead')) return false;
  run.steps=spWarmSteps(); $('spHead').innerHTML=spHeadHtml(); SP_SHOWN=spState(); return true; }
/* (app v138, the review of 27 October 2026) the control the reader is on in the tab, found again once the tab is drawn
   again (renderSp replaces it whole: the half-minute look draws it at a lock or a kickoff), so the focus is never left on
   the page's body: the same control by the attributes it keeps, in the same unit, level and kind of level; else the
   tab's own button. A focus the draw's caller has put somewhere else is left there */
const SP_FK=['data-pb-leg','data-side','data-k','data-main','data-sp-add','data-pc-finish','data-espn-refresh','data-glance','data-glance-leg'];
function spFocusOf(){ const a=document.activeElement, el=$('spPanel');
  if(!a||a===document.body||!a.closest||!el||!el.contains(a)) return null;
  const up=(s,k)=>{ const x=a.closest(s); return x?x.getAttribute(k):null; };
  return {own:SP_FK.map(n=>a.getAttribute(n)),u:up('[data-sp-game]','data-sp-game'),t:up('[data-pb-tier]','data-pb-tier'),k:up('.pb-tiers[data-sp-kind]','data-sp-kind')}; }
function spFocusBack(f){ if(!f) return;
  const a=document.activeElement, el=$('spPanel'), tab=$('tab-suggest');
  if((a&&a!==document.body&&a.isConnected)||!el||(tab&&tab.hidden)) return;
  const up=(x,s,k)=>{ const y=x.closest(s); return y?y.getAttribute(k):null; };
  const to=f.own.some(v=>v!=null)?[...el.querySelectorAll('button')].find(x=>SP_FK.every((n,i)=>x.getAttribute(n)===f.own[i])&&up(x,'[data-sp-game]','data-sp-game')===f.u&&up(x,'[data-pb-tier]','data-pb-tier')===f.t&&up(x,'.pb-tiers[data-sp-kind]','data-sp-kind')===f.k):null;
  const b=to||document.querySelector('#tabs button[data-tab="suggest"]'); try{ if(b) b.focus({preventScroll:true}); }catch(e){} }""", 'renderSp: the focus found again; spSoftAgain')
sub1('p3', r"""   the same HTML as drawing it at once). Leaving the tab stops it, and any other draw of the tab ends it. null where
   nothing is left to build (then the caller draws the tab at once); else a promise of true once drawn, false if stopped.
   (app v138) A task runs steps until SP_SLICE_MS have passed (a level of a set is 10 to 60 ms in Chromium, so a task is
   rarely over 100 ms), and the last draw is a task of its own */""",
     r"""   the same HTML as drawing it at once). Leaving the tab stops it, and any other draw of the tab ends it. null where
   nothing is left to build (then the caller draws the tab at once); else a promise of true once drawn, false if stopped.
   (app v138) A task runs steps until SP_SLICE_MS have passed (a level of a set is 10 to 60 ms in Chromium, so a task is
   rarely over 100 ms), and the last draw is a task of its own. (The review of 27 October 2026) Another draw of the tab on
   the screen no longer ends the run: it takes the run's steps again (spSoftAgain, in renderSp), so the run still ends
   drawn; a new run (the tab opened again) ends the one before */""", 'spOpenSoft\'s comment: another draw takes the steps again')
sub1('p3', r"""  const run={steps}; SP_SOFT=run;
  $('spHead').innerHTML=spHeadHtml();""", r"""  const run={steps}; SP_SOFT=run; SP_SHOWN=spState();
  const fk=spFocusOf();
  $('spHead').innerHTML=spHeadHtml();""", 'spOpenSoft: what it shows marked from its start')
sub1('p3', r"""  $('spSets').innerHTML=spSecHtml('all','')+'<p class="pb-none sp-building" data-sp-building role="status">Building the sets…</p>';
  return new Promise(done=>{""", r"""  $('spSets').innerHTML=spSecHtml('all','')+'<p class="pb-none sp-building" data-sp-building role="status">Building the sets…</p>';
  spFocusBack(fk);
  return new Promise(done=>{""", 'spOpenSoft: the focus found again')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v138, DraftKings\' chance on every leg')
