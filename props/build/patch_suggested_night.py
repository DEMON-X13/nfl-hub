r"""app v112: Suggested Parlays, one night at a time, and the Value tag in place of thin edge and no edge.

The owner, 17 October 2026, after app v111 put each prime-time game's four parlays on a tab of their own
and listed the Top 100 lines on the Parlay Builder tab. First, "i don't really understand what the no edge
and thin edge tags are", and then: "can we do reverse tags? like get rid of thin edge and no edge and come
up with a name for that first section? also tab name suggest parlay should be Suggested Parlays. also can
you just show the next night game dont stack the mondy night game until monday morning".

The tags, reversed. A leg the model rates at least 3 points above the chance its price implies (with
market + form agreeing on a player's line: pbPool's preferred list, which sets thin false) is a **Value
pick**, and wears the one tag left, Value (pbIsValue, pbValMark), on a level's card and on a row of the
Top 100 lines. A thin-edge leg (at or above the book, by less) and a game total (the book's own chance)
are no longer marked; the line under a level that holds one says why in the new words ("One leg is not
a Value pick: the model rates it at or above the book's price, but not 3 points above."; "The game total
is at the book's own chance with its margin out, so it is not a Value pick: ..."). An Elo pick's legs
come from pricedLegs, which says neither, so none is marked: they are chosen on the Elo matchup, not the
edge. Nothing about which legs a level takes, its order or its numbers moves; the record still keeps
each leg's thin and market (suggest_ledger.js).

The Top 100 lines are two parts under their own headings: **Value picks** (the preferred lines, marked
Value), then **Other lines** (the thin-edge lines and, with Game total ticked, the totals), each part
ranked by what $1 on it is expected to make, at most 100 in all, the ranks running on across both
(the second list's start). Until now the totals sat at the foot of the first part, ahead of every
thin-edge line; a thin-edge line is at or above the book, so it is expected to make at least nothing,
and a total, at the book's own chance, less: the other lines ranked together put the totals last, the
order a level fills in (thin legs first, a total only after them). Each row's data-pb-grp is value or
other. With no Value pick on the reader's choices, the Value picks heading says so over the other lines.

The tab is **Suggested Parlays** (the button, its heading and every word a visitor reads that names it;
its section, tab-suggest, its address, #suggest, and the sp names are as they were).

One night at a time (spNight, spOn). The tab shows the games of the next prime-time night still to kick
off (both games of a Monday doubleheader: one Eastern date), and only from 6:00 AM Eastern on the
morning after the prime-time night before it on the schedule (any week; with none before it, at once):
Sunday night's set from Friday morning, Monday night's from Monday morning, Thursday's from Tuesday
morning. Until then the tab says which game is next and when its set goes up (data-sp-wait). The record
is untouched: the props job still takes, locks and grades every prime-time game's set (spGames, spSet),
shown or not, so Monday night's set is the job's from its first run, the page's from Monday morning, and
the same set either way. The page builds a set only for a game it shows (its lock's own copy, where the
record has none, among them), a level's Finish (spTier) names only a game on the screen, and the state
the page watches (spState) carries the games shown, so the morning's turn redraws the tab on an open page.
"""
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function spNight(' not in T['p3'], 'patch_suggested_night.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


def suball(k, old, new, n, what):
    assert T[k].count(old) == n, f'{what}: expected the old text {n} times in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v111 \\u00b7 2026-10-16';", "const APP_BUILD='app v112 \\u00b7 2026-10-17';", 'APP_BUILD')
sub1('p2', """a total has no edge, so a suggested parlay takes one only as the last fill, where the legs with
   an edge cannot make a level, and marks it no edge (pbPool's market legs, pbTier). */""",
     """a total has no edge, so a suggested parlay takes one only as the last fill, where the Value picks
   cannot make a level, and never marks it Value (pbPool's market legs, pbTier). */""", "the comment over TOTAL_SD")

# ---------------------------------------------------------------- the tab's name, wherever a visitor or a comment reads it
suball('p1', 'Suggest Parlays', 'Suggested Parlays', 2, 'the tab button and the v111 styles note')
suball('p3', 'Suggest Parlays', 'Suggested Parlays', 13, 'the tab name in part3')

# ---------------------------------------------------------------- part1: the Value tag and the Top 100's two parts
sub1('p1', """.pb-thinmark{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:0 6px;border-radius:999px;border:1px solid var(--gold);color:var(--ink-2);white-space:nowrap}
""", """/* app v112: a Value pick's tag, the one mark left on a leg (thin edge and no edge are gone): the gold filled, its
   text dark on it in either look (#1A1A1A on the hub's #FFD166, 12.6:1; on the light page's #D39A1F, 6.9:1) */
.pb-valmark{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:0 6px;border-radius:999px;background:var(--gold);color:#1A1A1A;white-space:nowrap}
""", 'the tag style')
sub1('p1', """.pb-trow[data-pb-grp="edge"]+.pb-trow[data-pb-grp="thin"]{border-top:2px solid var(--gold)}
""", """/* app v112: the Top 100 lines in two parts, each under its heading (Value picks, Other lines) */
.pb-topsec{display:flex;align-items:center;gap:8px;margin:16px 0 2px;font-size:15px}
.pb-topsub{margin:0 0 6px;font-size:12px}
""", 'the Top 100 parts')

# ---------------------------------------------------------------- part3: the words
sub1('p3', 'A suggested parlay takes a total only where the legs with an edge run out, and marks it no edge; tick it here to add one yourself.',
     'A suggested parlay takes a total only where its Value picks run out, and a total is never one; tick it here to add one yourself.',
     "the Game bets card's note on totals")
sub1('p3', """/* what a total on a tier is: the book's own chance, so no edge, there only because the picks do
   not make a parlay of the tier's size from legs with an edge */
function pbMktLine(legs,why){
  const n=legs.filter(l=>l.market).length, one=n===1;
  return `${one?'The game total is':n+' game totals are'} at the book’s own chance with its margin out, so ${one?'it has':'they have'} no edge: ${one?'it is':'they are'} here because ${why||'your picks do not make a parlay of this size from legs with an edge'}.`;
}""", """/* what a total on a tier is: the book's own chance, so never a Value pick, there only because the picks do
   not make a parlay of the tier's size from legs with an edge */
function pbMktLine(legs,why){
  const n=legs.filter(l=>l.market).length, one=n===1;
  return `${one?'The game total is':n+' game totals are'} at the book’s own chance with its margin out, so ${one?'it is not a Value pick':'they are not Value picks'}: ${one?'it is':'they are'} here because ${why||'your picks do not make a parlay of this size from Value picks'}.`;
}
/* (app v112) a Value pick: a leg with the 3-point edge, and market + form agreeing on a player's line, which pbPool
   puts on its preferred list with thin false (a thin one true; a total is market). It wears the one mark a leg
   has (thin edge and no edge went, the owner's call of 17 October 2026: "reverse tags"). An Elo pick's legs come
   from pricedLegs, which says neither, so none is marked: they are chosen on the Elo matchup, not the edge */
const pbIsValue=l=>!!l&&l.thin===false&&!l.market;
const pbValMark=l=>pbIsValue(l)?' <i class="pb-valmark">Value</i>':'';
window.pbIsValue=pbIsValue;""", 'pbMktLine and the Value mark')
sub1('p3', """  return `${n===1?'One leg has a thin edge: the model rates it':n+' legs have a thin edge: the model rates them'} at or above the book's price, but ${tail}.`;""",
     """  return `${n===1?'One leg is not a Value pick: the model rates it':n+' legs are not Value picks: the model rates them'} at or above the book's price, but ${tail}.`;""",
     'pbThinLine')
sub1('p3', """<small>${esc(l.label)}${l.market?' <i class="pb-thinmark">no edge</i>':(l.thin?' <i class="pb-thinmark">thin edge</i>':'')}</small>${ff?""",
     """<small>${esc(l.label)}${pbValMark(l)}</small>${ff?""", "a level's leg mark")

sub1('p3', """   fewest legs the model still rates at or above the book fill it, marked thin edge; never a""",
     """   fewest legs the model still rates at or above the book fill it, thin (and never marked Value: app v112); never a""",
     "pbPool's comment on thin legs")
sub1('p3', """   where the legs with an edge cannot make a parlay of a level's size at all, and marked no edge on
   the card (the owner ticked Game total alone and got nothing, October 2026).""",
     """   where the legs with an edge cannot make a parlay of a level's size at all, and said so under the
   level on the card (the owner ticked Game total alone and got nothing, October 2026).""",
     "pbPool's comment on totals")

# ---------------------------------------------------------------- part3: the Top 100 in two parts
sub1('p3', """   ticked, both sides of each ticked game's total at the book's own chance), in two groups: every preferred
   leg and every total first, then every thin-edge leg (one that missed the 3-point edge or market + form,
   which a level takes only as fill), each group ranked by what $1 on it is expected to make at the model's
   chance (chance times the decimal price, less the $1), best first, at most PB_TOP_N in all, so a thin edge
   never ranks over a line with an edge however much it pays.""",
     """   ticked, both sides of each ticked game's total at the book's own chance), in two parts: every preferred
   leg first, the Value picks (pbIsValue), then the other lines, every thin-edge leg (one that missed the
   3-point edge or market + form, which a level takes only as fill) and every total, each part ranked by what
   $1 on it is expected to make at the model's chance (chance times the decimal price, less the $1), best
   first, at most PB_TOP_N in all, so a thin edge never ranks over a Value pick however much it pays, and a
   total, at the book's own chance, is expected to make less than any thin-edge line, so it comes last (app
   v112: until then the totals ended the first part).""", 'the Top 100 comment')
sub1('p3', "  out.rows=[...rank([...r.pref,...r.mkt]),...rank(r.thin)].slice(0,PB_TOP_N);",
     "  out.rows=[...rank(r.pref),...rank([...r.thin,...r.mkt])].slice(0,PB_TOP_N);", 'the Top 100 order')
sub1('p3', """  const mark=l.market?' <i class="pb-thinmark">no edge</i>':(l.thin?' <i class="pb-thinmark">thin edge</i>':'');
  return `<li class="pb-trow" data-pb-row="${i+1}" data-pb-grp="${l.thin?'thin':'edge'}"><span class="pb-trk">${i+1}</span>""",
     """  const mark=pbValMark(l);
  return `<li class="pb-trow" data-pb-row="${i+1}" data-pb-grp="${pbIsValue(l)?'value':'other'}"><span class="pb-trk">${i+1}</span>""",
     'a Top 100 row')
sub1('p3', "  if(u.k.total) notes.push('Game totals have no edge: each is priced at the book’s own chance, so what $1 on it is expected to make is below nothing, and it ranks after every line with an edge and before every thin-edge line, marked no edge.');",
     "  if(u.k.total) notes.push('Game totals are never Value picks: each is priced at the book’s own chance, so what $1 on it is expected to make is below nothing, and it ranks last among the other lines.');",
     'the totals note')
sub1('p3', """  const list=r.rows.length?`<ol class="pb-top" aria-label="The ${r.rows.length} best lines on your picks, those with an edge first, each group by expected profit on $1">${r.rows.map(pbTopRow).join('')}</ol>`
    :`<p class="pb-none pb-top-none">${esc(pbTopWhy(r,u))}</p>`;""",
     """  /* (app v112) two parts, each under its heading: the Value picks (the rows' prefix: the first part is the
     preferred lines alone), then the other lines, their ranks running on (the second list's start) */
  const nV=r.rows.filter(pbIsValue).length, V=r.rows.slice(0,nV), O=r.rows.slice(nV);
  const secHd=(id,title,n)=>`<h3 class="pb-topsec" data-pb-sec="${id}">${title}${n?` <span class="pill">${n}</span>`:''}</h3>`;
  const list=r.rows.length?secHd('value','Value picks',nV)
      +(nV?`<p class="muted pb-topsub">The model rates each at least 3 points above the chance its price implies${form?', and on a player’s line market + form agrees':''}. Each is marked Value.</p><ol class="pb-top" data-pb-sec="value" aria-label="The ${nV} Value pick${nV===1?'':'s'} on your picks, by expected profit on $1">${V.map((l,i)=>pbTopRow(l,i)).join('')}</ol>`
        :`<p class="muted pb-topsub" data-pb-novalue>No line on your picks is a Value pick right now: the model rates none of them 3 points or more above the chance its price implies${form?' with market + form agreeing':''}.</p>`)
      +(O.length?secHd('other','Other lines',O.length)+`<p class="muted pb-topsub">The model rates these at or above the book’s price, by less${u.k.total?'; game totals are at the book’s own chance':''}. A suggested parlay takes them only where its Value picks run out.</p><ol class="pb-top" data-pb-sec="other"${nV?` start="${nV+1}"`:''} aria-label="${nV?'Then ':''}${O.length} other line${O.length===1?'':'s'} on your picks, by expected profit on $1">${O.map((l,i)=>pbTopRow(l,nV+i)).join('')}</ol>`:'')
    :`<p class="pb-none pb-top-none">${esc(pbTopWhy(r,u))}</p>`;""", 'the Top 100 list')
sub1('p3', "every line that qualifies as a suggested leg does: first the lines with an edge${u.k.total?' and the game totals':''}, then the lines with only a thin edge, marked thin edge, each group ranked by what $1 on it is expected to make at the model’s chance, best first, 100 lines at most.",
     "every line that qualifies as a suggested leg does: first the Value picks, marked Value, then the other lines${u.k.total?', the game totals last':''}, each part ranked by what $1 on it is expected to make at the model’s chance, best first, 100 lines at most.",
     'the Top 100 lead')
sub1('p3', "at or above the chance that price implies: 3 points above it is an edge${form?' (on a player’s line, with market + form, the book’s chance moved by his Elo, 3 points above it too)':''}, less is a thin edge, and a game total, priced at the book’s own chance, has none and is marked no edge. The lines with an edge come first, then any game totals, then the thin-edge lines, marked thin edge (the ones a suggested parlay takes only where the lines with an edge cannot fill it), each group ranked by what $1 on it is expected to make, 100 lines at most in all.",
     "at or above the chance that price implies: 3 points above it or more is a Value pick${form?' (on a player’s line, with market + form, the book’s chance moved by his Elo, 3 points above it too)':''}, and a game total, priced at the book’s own chance, is never one. The Value picks come first, marked Value, then the other lines (the ones a suggested parlay takes only where the Value picks cannot fill it), each part ranked by what $1 on it is expected to make, 100 lines at most in all.",
     'the Top 100 foot')

# ---------------------------------------------------------------- part3: one night at a time
sub1('p3', """/* a level by the id its Finish names (game id:level), as the tab shows it; the card reads it */
function spTier(fid){
  const s=String(fid||''), i=s.lastIndexOf(':'); if(i<0) return null;
  const g=spGames().find(x=>x.id===s.slice(0,i)); if(!g) return null;""",
     """/* (app v112) one night at a time (the owner's call of 17 October 2026: "just show the next night game dont stack
   the monday night game until monday morning"). The tab shows the games of the next prime-time night still to
   kick off (spGames' first Eastern date: both games of a Monday doubleheader), and only from SP_OPEN_H, 6:00 AM
   Eastern, on the morning after the prime-time night before it on the schedule (any week, played or not; none
   before it, at once): Sunday night's set from Friday morning, Monday night's from Monday morning, Thursday's
   from Tuesday morning. Until then the tab says which game is next and when its set goes up. The record is
   untouched: the props job takes, locks and grades every prime-time game's set (spGames, spSet), shown or not */
const SP_OPEN_H=6;
function spNight(){
  const G=spGames(); if(!G.length) return {games:[],open:null,prev:null,up:false};
  const D=G[0].d, games=G.filter(g=>g.d===D);
  const prev=(S.sched||[]).filter(g=>spPrime(g)&&g.d<D).map(g=>g.d).sort().pop()||null;
  let open=null;
  if(prev){ const n=new Date(prev+'T12:00:00Z'); n.setUTCDate(n.getUTCDate()+1); const day=n.toISOString().slice(0,10);
    const t=new Date(`${day}T${String(SP_OPEN_H).padStart(2,'0')}:00:00${easternOffset(day)}`).getTime(); open=isFinite(t)?t:null; }
  return {games,open,prev,up:open==null||Date.now()>=open};
}
/* the games the tab sets out now */
function spOn(){ const n=spNight(); return n.up?n.games:[]; }
/* a level by the id its Finish names (game id:level), as the tab shows it; the card reads it. Only a game on the
   screen: a set the tab does not show yet is not finished from it */
function spTier(fid){
  const s=String(fid||''), i=s.lastIndexOf(':'); if(i<0) return null;
  const g=spOn().find(x=>x.id===s.slice(0,i)); if(!g) return null;""", 'spNight, spOn and spTier')
sub1('p3', """/* what the tab stands on beyond the data: the games to come and which side of its lock each is */
function spState(){ const now=Date.now(); return spGames().map(g=>g.id+(now<spLockAt(g)?':l':':k')).join(); }""",
     """/* what the tab stands on beyond the data: the games to come and which side of its lock each is, and the games it
   sets out (app v112: the morning's turn to the next night redraws an open page) */
function spState(){ const now=Date.now(); return spGames().map(g=>g.id+(now<spLockAt(g)?':l':':k')).concat('on='+spOn().map(g=>g.id).join('+')).join(); }""", 'spState')
sub1('p3', """    <p class="muted pb-lead">Each Thursday, Sunday and Monday night game of the week gets four parlays of its own, every leg from that game: Safe, Medium, Aggressive and Extreme, 2 to 5 legs priced together as a book prices a same-game parlay. A set is live until 2 hours before its kickoff, when it locks: from then to kickoff everyone sees the set the site locked, and that is the one the record above grades. Add a whole parlay to the builder, or one leg at a time.</p>""",
     """    <p class="muted pb-lead">The next Thursday, Sunday or Monday night game gets four parlays of its own, every leg from that game: Safe, Medium, Aggressive and Extreme, 2 to 5 legs priced together as a book prices a same-game parlay. One night is shown at a time: the next night’s set goes up at 6:00 AM ET the morning after the night game before it. A set is live until 2 hours before its kickoff, when it locks: from then to kickoff everyone sees the set the site locked, and that is the one the record above grades. A leg marked Value is one of the model’s best: it rates it at least 3 points above the chance its price implies. Add a whole parlay to the builder, or one leg at a time.</p>""",
     'the tab lead')
sub1('p3', """  return G.map(g=>spGameHtml(g,on)).join('')
    +`<p class="muted pb-foot">""", """  /* (app v112) the next night alone, once its morning has come (spOn: the one place the tab asks which games it
     sets out); until then, which game is next and when its set goes up */
  const On=spOn(), nm=x=>`${TEAM_NAMES[x.a]||x.a} at ${TEAM_NAMES[x.h]||x.h}`;
  let wait='';
  if(!On.length){ const N=spNight(), two=N.games.length>1, pn=N.prev?SP_NIGHT[new Date(N.prev+'T12:00:00Z').getUTCDay()]:null;
    const pg=N.prev?(S.sched||[]).filter(x=>spPrime(x)&&x.d===N.prev).length:0;
    wait=`<p class="pb-none sp-wait" data-sp-wait="${N.open!=null?spIso(N.open):''}" data-sp-next="${esc(N.games.map(x=>x.id).join(' '))}">Next up: ${SP_NIGHT[spDow(N.games[0])]}, ${esc(N.games.map(nm).join(' and '))}.${N.open!=null?` ${two?'Their sets go':'Its set goes'} up ${spEt(N.open,true)}, the morning after ${pn||'the night game before it'}’s ${pg>1?'games':'game'}.`:''}</p>`; }
  return (On.length?On.map(g=>spGameHtml(g,on)).join(''):wait)
    +`<p class="muted pb-foot">""", 'the sets: the next night alone')
sub1('p3', "at least 3 points above the chance that price implies (a player leg also needs market + form 3 points above it); where those cannot make a level, the fewest legs the model still rates at or above the book fill it, marked thin edge, and a game total, the book’s own chance, only after them, marked no edge.",
     "at least 3 points above the chance that price implies (a player leg also needs market + form 3 points above it): those are the Value picks, marked Value. Where they cannot make a level, the fewest legs the model still rates at or above the book fill it, and a game total, the book’s own chance, only after them; neither is marked, and a line under the level says why.",
     'the sets foot')
sub1('p3', "Object.assign(window,{spPrime,spGames,spLockAt,spSet,spRebuild,spOutWhy,spTierOut,spShown,spTier,renderSp});",
     "Object.assign(window,{spPrime,spGames,spNight,spOn,spLockAt,spSet,spRebuild,spOutWhy,spTierOut,spShown,spTier,renderSp});", 'the window names')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v112, Suggested Parlays one night at a time, and the Value tag')
