"""No Elo picks on Suggested Parlays, and a Mismatch tag on the regular parlays (app v142).

The owner's call of 5 November 2026: "instead of having the ELO picks in suggested parlays, i suggest we scrap that. and
then if a player has a big mismatch on the positive side, we give them a mismatch button to go next to their name in the
normal suggested parlays".

What goes. Since app v118 every unit of Suggested Parlays (each night game, and the Sunday slot under Day games) carried
the ELO tab's four Elo picks under the model's four parlays, under a sub-heading each ("Parlays", "Elo picks"), live,
locked from the record or kept as this browser's own, and under way; and the Record section at the tab's head had a row
for each kind. All of that leaves the tab: no unit draws an Elo card, an Elo heading or an Elo line (loading, not
published in time, this browser's own Elo picks), and with only the model's parlays left a unit's "Parlays" sub-heading
goes too, so its cards (`div.pb-tiers[data-sp-kind="model"]`) stand right under its phase line. The record keeps one row,
the parlays', with no label (its pills and their titles as they were, "Parlays, Safe: ..."). With them go every piece of
the props parts that existed only for the Elo picks: `spEloOn`, `spEloSet` (and its export), `spIsElo`, the Elo kind of
`SP_KIND`, the Elo branches of `spLegOut`, `spTierOut`, `spLegIn`, `spTierIn`, `spRebuild`, `spShown`, `spTier` and
`spWarmSteps`, and `pbTierCard`'s options that only the Elo cards passed (`badge`, `legNote`, `rule`, `noun`). A model
level's card, and the record's shape of a model level (`spTierOut`), are byte for byte what they were.

What the record keeps. The suggestions record (props/build/suggest_ledger.js) takes no Elo picks from this change on, and
an entry not yet locked is rewritten without its `elo` by the first run before its lock; an entry locked with them keeps
them as they locked, graded as before and counted in its summaries, which the page never reads: the Elo picks' history
stays in the file as data, drawn nowhere. The backtest's file is untouched.

A locked unit with no record entry no longer waits for the ELO tab's files before building this browser's own set (it
said "Loading the site's set..." until the ratings were in): the model's levels have not stood on the ratings since app
v138. And a browser's kept copy (props_sp_lock_v1) from before, carrying `elo`, `eloOwn` and `eloAt` beside a unit's set
or a page replacement of an `elo-<level>` in its `rep`, has them dropped as it is read, never drawn and never thrown on;
the next write leaves them out.

The tag. On every model level card of Suggested Parlays (the night games and the Sunday slot; live, locked from the
record, this browser's own locked set, and under way), a leg on a player whose row of this week's Mismatches is tagged
(`mmTagged`: on a matchups file with the score, the averages' tag; on an older file, the old Mismatches' grade, Solid or
better), in that same game (the row's game_id the leg's gid), and on a leg that bets his way (an over, his anytime
touchdown among them, never an Under, never more of his interceptions, never a team bet or a game total) wears the
Mismatches' own tag (`mmTagEl(row,true)`: "Mismatch", or on an older file the graded words) right after his name's
button (on the prop model's own page, his name's text), once. The tag is put on by the ELO tab, which is set into the
hub's page alone (nflbets/build/tab_elo.html: `spMmDecorate`, wrapping `renderSp`, reading each card's level as the
unit shows it, `spShown`), so the prop model's own page draws none, and nothing is tagged or thrown while the ELO tab's
files are loading or missing: the next draw carries the tags. Its look is the Elo picks' old tag rule moved to the model
cards. The owner said "button": the tag is the Mismatches' label, and the name beside it is already the matchup bubble's
button, which shows the Mismatches row.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


def cut1(k, start, end, new=''):
    """the span from start through end (each exactly once, end after start) replaced by new"""
    s = T[k]
    assert s.count(start) == 1, (k, 'start', s.count(start), start[:90])
    assert s.count(end) == 1, (k, 'end', s.count(end), end[:90])
    i = s.index(start)
    j = s.index(end)
    assert j > i, (k, 'end before start', start[:60], end[:60])
    T[k] = s[:i] + new + s[j + len(end):]


sub1('p2', "const APP_BUILD='app v141 \\u00b7 2026-10-31';", "const APP_BUILD='app v142 \\u00b7 2026-11-05';")

# ---------------------------------------------------------------- part1: the styles the Elo picks and their rows had
sub1('p1', '#spSets .pb-tier.xtrm,#spSets .pb-tier.elo-xtrm{display:none}', '#spSets .pb-tier.xtrm{display:none}')
sub1('p1', """/* app v118: two sections, Night games and the Sunday slot, each headed by its record (a row for the model's parlays and
   one for the Elo picks); each unit's model parlays, then its Elo picks */""",
     """/* app v118: two sections, Night games and the Sunday slot, each headed by its record; (app v142) the record one row, the
   parlays', and each unit its parlays alone, with no sub-heading (the Elo picks went) */""")
sub1('p1', ".sp-sub{margin:14px 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}\n")
sub1('p1', """.sp-reck{flex:0 0 auto;min-width:112px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
@media(max-width:640px){ .sp-reck{flex-basis:100%;min-width:0} }
""")

# ---------------------------------------------------------------- part3: the record's comments, one kind, one row
sub1('p3', """Since app v118 an entry carries
   the unit's Elo picks too (`elo`, the four levels elo-safe to elo-xtrm, graded beside the model's in `grade`), and
   the `slot` map holds""", """From app v118 to app v141 an
   entry carried the unit's Elo picks too (`elo`, the four levels elo-safe to elo-xtrm, graded beside the model's in
   `grade`); since app v142 none is taken, and an entry locked with them keeps them as data, graded, which the page never
   reads. The `slot` map holds""")
sub1('p3', """and the two kinds of level each unit
   has: the model's parlays (tiers) and the Elo picks (elo). From app v118 to v128 two sections, Night games (the record's
   prime map) and the Sunday slot (its slot map), each with its own record (the owner's call of 19 October 2026); since
   app v129 one, Night games, its sets the night games' and then the Sunday slot's, its record both maps (the owner's
   call of 22 October 2026: "get rid of the Sunday slot record section -> all should be a part of 'Night Games'").""",
     """and the kind of level each unit
   has: the model's parlays (tiers; until app v142 the Elo picks, elo, too). From app v118 to v128 two sections, Night
   games (the record's prime map) and the Sunday slot (its slot map), each with its own record (the owner's call of 19
   October 2026); since app v129 one, Night games, its sets the night games' and then the Sunday slot's, its record
   both maps (the owner's call of 22 October 2026: "get rid of the Sunday slot record section -> all should be a part
   of 'Night Games'").""")
sub1('p3', """/* (app v138) the model's levels are named Parlays: the model no longer picks them */
const SP_KIND={model:{field:'tiers',pre:'',name:'Parlays'},elo:{field:'elo',pre:'elo-',name:'Elo picks'}};""",
     """/* (app v138) the model's levels are named Parlays: the model no longer picks them. (app v142) one kind: the Elo picks
   (field elo, ids elo-<level>) left the tab, their record kept in the file and drawn nowhere */
const SP_KIND={model:{field:'tiers',pre:'',name:'Parlays'}};""")
sub1('p3', "   level's own chance (the model's, or the Elo's for an Elo pick: the chances the set showed), units on $1, and how\n",
     "   level's own chance (the model's, the chance the set showed; until app v142 an Elo pick's the Elo's), units on $1, and how\n")
sub1('p3', """   graded included): the backtest counts only for a unit the record has none of, as week 6's Sunday night game's Elo
   picks, which the record took before app v118 gave it any */""", """   graded included): the backtest counts only for a unit the record has none of (until app v142 it filled week 6's Sunday
   night game's Elo picks so, which the record took before app v118 gave it any) */""")
sub1('p3', """/* a section's record at its head: a row for the model's parlays and one for the Elo picks, a pill a level (won-lost,
   units on $1) and what is pending, as the ELO Ratings tab's record bar, the backtest's weeks counted in it (each pill's
   title saying how many of its own; app v129 took off the chip that named the weeks). No record and no backtest,
   nothing (hidden) */""", """/* a section's record at its head: one row, the parlays' (app v142: the Elo picks' row went, and the row's label with
   it), a pill a level (won-lost, units on $1) and what is pending, as the ELO Ratings tab's record bar, the backtest's
   weeks counted in it (each pill's title saying how many of its own; app v129 took off the chip that named the
   weeks). No record and no backtest, nothing (hidden) */""")
sub1('p3', """  const rows=Object.entries(SP_KIND).map(([kind,K])=>{ const R=spRecSum(PB_REC,sec,kind,PB_BT), any=R.tiers.some(s=>s.graded||s.push);
    /* (app v138) a level's p is the model's chance all land (the Elo's for an Elo pick), for old entries and new */
    const by=kind==='elo'?'the Elo chance':'the model’s chance';
""", """  const kind='model', K=SP_KIND.model, R=spRecSum(PB_REC,sec,kind,PB_BT), any=R.tiers.some(s=>s.graded||s.push);
    /* (app v138) a level's p is the model's chance all land, for old entries and new */
    const by='the model’s chance';
""")
sub1('p3', """    return `<div class="bar" data-sp-reckind="${kind}"><span class="sp-reck">${esc(K.name)}</span>${pills}${R.pending?`<span class="rec" data-sp-rec="${sec}:${kind}:pending">Pending <b>${R.pending}</b></span>`:''}</div>`; }).join('');
  return `<div class="sp-rec" data-sp-recsec="${sec}">${rows}</div>`;""",
     """  return `<div class="sp-rec" data-sp-recsec="${sec}"><div class="bar" data-sp-reckind="${kind}">${pills}${R.pending?`<span class="rec" data-sp-rec="${sec}:${kind}:pending">Pending <b>${R.pending}</b></span>`:''}</div></div>`;""")

# ---------------------------------------------------------------- the cards: pbTierCard's Elo-only options
sub1('p3', "/* the payouts redrawn in place as the amount is typed, the panel's tiers and the Elo picks alike\n",
     "/* the payouts redrawn in place as the amount is typed, the panel's tiers and Suggested Parlays' levels alike\n")
sub1('p3', "/* what a leg priced from DraftKings' line read on ESPN is, on a level's card or an Elo pick's: a price that is an\n",
     "/* what a leg priced from DraftKings' line read on ESPN is, on a level's card: a price that is an\n")
sub1('p3', "/* one tier's card, or why it has none. The Elo picks draw theirs with it (window.pbTierCard). o.fid: the\n",
     """/* one tier's card, or why it has none (window.pbTierCard; until app v142 the Elo picks drew theirs with it too, with
   options of their own, badge, legNote, rule and noun, which went with them). o.fid: the
""")
sub1('p3', """   way, its first games begun); o.noun: what its buttons call it (an Elo pick's, app v118: 'Elo pick'; else 'parlay');
   o.game""", """   way, its first games begun);
   o.game""")
sub1('p3', """   with none; no Value mark but a hook's, no far-off line; o.legNote(l): a line of its own under a leg (the Elo picks'
   lean) */""", """   with none; no Value mark but a hook's, no far-off line. (app v142) On the hub the ELO tab puts the Mismatch tag after a
   player's name on Suggested Parlays' cards once they are drawn (spMmDecorate), on the legs that bet his way */""")
sub1('p3', "nm=o.what?` the ${esc(t.label)} ${esc(o.noun||'parlay')} for ${esc(o.what)}`:''",
     "nm=o.what?` the ${esc(t.label)} parlay for ${esc(o.what)}`:''")
sub1('p3', "${o.rule||(t.floor!=null&&pbRuleKnown(t)?pbRuleHtml(t):'')}", "${t.floor!=null&&pbRuleKnown(t)?pbRuleHtml(t):''}")
sub1('p3', "<span class=\"nm\">${o.badge?o.badge(l):''}${glanceName(l)}<small>${esc(l.label)}${pbValMark(l)}</small>${o.legNote?o.legNote(l):''}</span>",
     "<span class=\"nm\">${glanceName(l)}<small>${esc(l.label)}${pbValMark(l)}</small></span>")

# ---------------------------------------------------------------- Suggested Parlays' comments
sub1('p3', """  /* Suggested Parlays is drawn with it, so the ELO tab's wrap of renderPb (its Elo picks, in #pbElo at the
     tab's foot) still draws last */""", """  /* Suggested Parlays is drawn with it, and on the hub the ELO tab's wrap of renderSp puts the Mismatch tag on its cards
     (app v142; until app v118 the ELO tab's wrap of renderPb drew the Elo picks in #pbElo at the tab's foot) */""")
sub1('p3', """   own object (id <season>_<WW>_SUN, d and t its first kickoff's, games). Every unit carries the Elo picks too, the
   ELO tab's four levels on that unit's games alone (window.eloUnit; until app v118 one set over the games and player
   sides ticked on the Parlay Builder tab, at the tab's foot, which a reader with the priced games unticked saw empty
   all of Sunday 18 October 2026), locked, kept, replaced and recorded with the model's. */""",
     """   own object (id <season>_<WW>_SUN, d and t its first kickoff's, games). From app v118 to app v141 every unit carried
   the Elo picks too, the ELO tab's four levels on its games alone, locked, kept, replaced and recorded with the model's.
   (app v142, the owner's call of 5 November 2026: "instead of having the ELO picks in suggested parlays, i suggest we
   scrap that. and then if a player has a big mismatch on the positive side, we give them a mismatch button to go next
   to their name in the normal suggested parlays") None now: each unit draws its parlays alone, and on the hub the ELO
   tab puts the Mismatches' tag after the name of a player its Mismatches tag, in that game, on a leg that bets his way
   (an over or his touchdown), on every card live, locked or under way (spMmDecorate, nflbets/build/tab_elo.html). */""")
sub1('p3', "stands on has moved: its games' kickoffs and pbDataSig (the publish, the Elo files, ESPN_SEQ) */",
     "stands on has moved: its games' kickoffs and pbDataSig (the publish, ESPN_SEQ) */")

# ---------------------------------------------------------------- spEloOn, spEloSet and spRebuild's Elo branch
cut1('p3', "/* (app v118) a unit's Elo picks as they stand: the ELO tab's four levels on its games alone (window.eloUnit, cached\n",
     "      r={...r,tiers:r.tiers.map(x=>x.legs?x:{...x,why})}; } }\n  return r; }\n")
sub1('p3', """/* one level of a unit built again now, from the lines at hand (a locked level holding a player ruled out): a model
   level or an Elo pick's */
function spRebuild(gid,id){
  const g=spUnit(gid); if(!g) return null;
  if(/^elo-/.test(String(id))){ const e=spEloSet(gid); return e&&Array.isArray(e.tiers)?e.tiers.find(t=>t.id===id)||null:null; }
""", """/* one level of a unit built again now, from the lines at hand (a locked level holding a player ruled out); (app v142)
   a model level alone: a locked Elo pick is never built again */
function spRebuild(gid,id){
  const g=spUnit(gid); if(!g) return null;
""")

# ---------------------------------------------------------------- the kept shape, in and out, with no Elo branch
sub1('p3', """   n, floor, why}, a level built again carrying `updated`. An Elo pick's (id elo-<level>) keeps each leg's Elo chance
   (pe) beside the model's, its thin and market null (it is chosen on the Elo matchup, never marked a Value pick), and
   its p is the Elo chance all land */
const spR=(v,d)=>v==null||!isFinite(v)?null:Math.round(v*d)/d;
const spIsElo=t=>!!t&&/^elo-/.test(String(t.id||''));
""", """   n, floor, why}, a level built again carrying `updated`. A record entry taken from app v118 to app v141 may carry its
   unit's Elo picks beside its levels (elo, each leg with its Elo chance pe), which the page never reads (app v142) */
const spR=(v,d)=>v==null||!isFinite(v)?null:Math.round(v*d)/d;
""")
sub1('p3', "   it; a level's p the model's chance all land (on pm; an Elo pick's the Elo chance), its fair DraftKings', and every\n",
     "   it; a level's p the model's chance all land (on pm), its fair DraftKings', and every\n")
sub1('p3', "function spLegOut(l,memo,elo){ const f=legFair(l,memo);", "function spLegOut(l,memo){ const f=legFair(l,memo);")
sub1('p3', "    p:spR(l.pm??l.p,1e4),...(elo?{pe:spR(l.pe,1e4)}:{}),fair:f?spR(f.p,1e4):null,fair_est:!!(f&&f.est),thin:elo?null:!!l.thin,market:elo?null:!!l.market}; }",
     "    p:spR(l.pm??l.p,1e4),fair:f?spR(f.p,1e4):null,fair_est:!!(f&&f.est),thin:!!l.thin,market:!!l.market}; }")
sub1('p3', "function spTierOut(t){ const memo={}, elo=spIsElo(t);", "function spTierOut(t){ const memo={};")
sub1('p3', "  const pm=!elo&&t.legs.some(l=>l.pm!=null)?", "  const pm=t.legs.some(l=>l.pm!=null)?")
sub1('p3', "legs:t.legs.map(l=>spLegOut(l,memo,elo)),p:spR(elo?t.p:(pm!=null?pm:t.corr),1e4),",
     "legs:t.legs.map(l=>spLegOut(l,memo)),p:spR(pm!=null?pm:t.corr,1e4),")
sub1('p3', "likeliest:!!t.likeliest,thin:elo?0:(t.thin||0),mkt:elo?0:(t.mkt||0),", "likeliest:!!t.likeliest,thin:t.thin||0,mkt:t.mkt||0,")
sub1('p3', "  const elo=l.pe!=null, pe=+l.pe; if(elo&&!(pe>0&&pe<1)) return null;\n")
sub1('p3', "label:String(l.label||''),...(elo?{pe}:{thin:!!l.thin,...(l.market?{market:true}:{})})};",
     "label:String(l.label||''),thin:!!l.thin,...(l.market?{market:true}:{})};")
sub1('p3', """  const elo=spIsElo(t), spec=t&&PB_TIERS.find(s=>(elo?'elo-':'')+s[0]===t.id); if(!spec) return null;
  const head={id:t.id,label:spec[1],n:spec[2],floor:elo?(isFinite(+t.floor)?+t.floor:spec[3]):spec[3]};""",
     """  const spec=t&&PB_TIERS.find(s=>s[0]===t.id); if(!spec) return null;
  const head={id:t.id,label:spec[1],n:spec[2],floor:spec[3]};""")
sub1('p3', "if(legs.length!==spec[2]||legs.some(l=>!l)||(elo&&legs.some(l=>l.pe==null))) return null;",
     "if(legs.length!==spec[2]||legs.some(l=>!l)) return null;")
sub1('p3', """this is only how the page draws them. An Elo pick's chance is worked on
     its legs' Elo chances, as the ELO tab works it. Cached on the kept level and the data (pbDataSig), since a
     locked set is read back on every draw */""", """this is only how the page draws them. Cached on
     the kept level and the data (pbDataSig), since a locked set is read back on every draw */""")
sub1('p3', "parlayProb(elo?L.map(l=>({...l,p:l.pe})):L)", "parlayProb(L)")
sub1('p3', "  if(elo) return {...head,legs:L,p:sum.corr,dec:sum.dec,fair,...(t.likeliest?{likeliest:true}:{}),...U,...C};\n")

# ---------------------------------------------------------------- this browser's kept copy: an old Elo copy dropped on read
sub1('p3', """(own), its Elo picks where the record has none of them (elo, eloOwn), and the
   levels""", """(own), and the
   levels""")
sub1('p3', """    if(v&&v.v===1&&+v.season===SEASON&&pbIsMap(v.games)) for(const [id,x] of Object.entries(v.games)) if(pbIsMap(x)&&typeof x.kickoff==='string') SP_KEEP[id]=x; }catch(e){}""",
     """    /* (app v142) the Elo picks a browser kept before (elo, eloOwn, eloAt, a page replacement of an elo-<level> in rep) are
       dropped as they are read, never drawn; the next write leaves them out */
    if(v&&v.v===1&&+v.season===SEASON&&pbIsMap(v.games)) for(const [id,x] of Object.entries(v.games)) if(pbIsMap(x)&&typeof x.kickoff==='string'){
      const {elo,eloOwn,eloAt,...y}=x; if(pbIsMap(y.rep)) y.rep=Object.fromEntries(Object.entries(y.rep).filter(([r])=>!/^elo-/.test(r))); SP_KEEP[id]=y; } }catch(e){}""")

# ---------------------------------------------------------------- spShown with no Elo picks
sub1('p3', """   that level only (the record's own replacement where the job made one, else the page's, kept). The same for its
   Elo picks (elo), the record's where its entry holds them, else the page's own kept beside the set (eloOwn); under:
   the Sunday slot once its first game has kicked off (shown as it locked, nothing to add). Nothing is built of the
   page's own once the slot is under way (its games begun, a set built then would be of the games left, never locked:
   none, eloNone say the site's was not published), nor before the Elo files are in (a set built without the ratings has
   no Elo picks, which the set keeps beside it (app v138: the model's levels no longer need the ratings): the tab says it is
   loading until they are), and no level is built again
   for a player ruled out once it is under way, as the record replaces none after the first kickoff */""",
     """   that level only (the record's own replacement where the job made one, else the page's, kept); under: the Sunday
   slot once its first game has kicked off (shown as it locked, nothing to add). Nothing is built of the page's own
   once the slot is under way (its games begun, a set built then would be of the games left, never locked: none says
   the site's was not published), and no level is built again for a player ruled out once it is under way, as the
   record replaces none after the first kickoff. (app v142) No Elo picks, and a locked unit with no record entry no
   longer waits for the ELO tab's files before building its own (the model's levels have not stood on the ratings
   since app v138) */""")
sub1('p3', """  const lock=spLockAt(g), now=Date.now(), eon=spEloOn();
  const under=!!g.slot&&now>=kickoff(g).getTime(), eloPend=eon&&window.eloUnit([],{})==null;
  if(lock==null||now<lock){ const s=spSet(g.id), e=eon?spEloSet(g.id):null; return {phase:'live',lock,tiers:s?s.tiers:[],elo:e&&Array.isArray(e.tiers)?e.tiers:null,eloErr:e&&e.error||null}; }
  if(!PB_REC_DONE) return {phase:'loading',lock,tiers:null,elo:null};""",
     """  const lock=spLockAt(g), now=Date.now(), under=!!g.slot&&now>=kickoff(g).getTime();
  if(lock==null||now<lock){ const s=spSet(g.id); return {phase:'live',lock,tiers:s?s.tiers:[]}; }
  if(!PB_REC_DONE) return {phase:'loading',lock,tiers:null};""")
sub1('p3', "  const e=spLedgerOf(g); let tiers=null, own=false, at=null, elo=null, eloOwn=false;",
     "  const e=spLedgerOf(g); let tiers=null, own=false, at=null;")
sub1('p3', "if(k&&k.own){ k={kickoff:kick,rep:{},...(k.eloOwn?{elo:k.elo,eloOwn:true,eloAt:k.eloAt}:{})}; K[g.id]=k; dirty=true; } } }",
     "if(k&&k.own){ k={kickoff:kick,rep:{}}; K[g.id]=k; dirty=true; } } }")
sub1('p3', """  if(!tiers&&under) return {phase:'locked',lock,tiers:null,elo:null,none:true,under};
  if(!tiers&&eloPend) return {phase:'loading',lock,tiers:null,elo:null};""",
     "  if(!tiers&&under) return {phase:'locked',lock,tiers:null,none:true,under};")
sub1('p3', "    k={kickoff:kick,own:true,at:spIso(now),tiers:out,rep:{},...(k&&k.eloOwn?{elo:k.elo,eloOwn:true,eloAt:k.eloAt}:{})}; K[g.id]=k; dirty=true; own=true; at=k.at; }",
     "    k={kickoff:kick,own:true,at:spIso(now),tiers:out,rep:{}}; K[g.id]=k; dirty=true; own=true; at=k.at; }")
cut1('p3', "  /* the Elo picks: the record's, else the page's own kept, else built once now and kept (only where the ELO tab\n",
     "k.elo=out; k.eloOwn=true; k.eloAt=spIso(now); dirty=true; } }\n")
sub1('p3', "  tiers=swap(tiers); if(elo) elo=swap(elo);", "  tiers=swap(tiers);")
sub1('p3', "  return {phase:'locked',lock,tiers,elo,own,at,ledger:!!e,eloOwn,eloErr:elo?null:eloErr,eloNone:!!eon&&!elo&&!eloErr&&under,under};",
     "  return {phase:'locked',lock,tiers,own,at,ledger:!!e,under};")

# ---------------------------------------------------------------- spTier: the model's levels alone
sub1('p3', "   finished from it. An Elo pick's (elo-<level>) carries elo */", "   finished from it */")
sub1('p3', """  const lv=s.slice(i+1), t=[...(v.tiers||[]),...(v.elo||[])].find(x=>x&&x.id===lv);
  return t&&t.legs&&t.legs.length?{...t,game:g.slot?`the Sunday slot`:`${g.a} at ${g.h}`,...(spIsElo(t)?{elo:true}:{})}:null;""",
     """  const lv=s.slice(i+1), t=(v.tiers||[]).find(x=>x&&x.id===lv);
  return t&&t.legs&&t.legs.length?{...t,game:g.slot?`the Sunday slot`:`${g.a} at ${g.h}`}:null;""")

# ---------------------------------------------------------------- a unit's markup: its parlays alone, no sub-heading
sub1('p3', "  const lk=spLockAt(g), live=lk!=null&&Date.now()<lk, eon=spEloOn();", "  const lk=spLockAt(g), live=lk!=null&&Date.now()<lk;")
sub1('p3', "  if(!on&&live&&(!SP_CACHE.has(spSig(g))||(eon&&(spEloSet(g.id,{kept:true})||{}).wait))) return",
     "  if(!on&&live&&!SP_CACHE.has(spSig(g))) return")
sub1('p3', """  const cards=v.tiers?`<h5 class="sp-sub" data-sp-kind="model">Parlays</h5><div class="pb-tiers" data-sp-kind="model">""",
     """  /* (app v142) the unit's parlays alone, right under its line: no sub-heading, the Elo picks under theirs gone */
  const cards=v.tiers?`<div class="pb-tiers" data-sp-kind="model">""")
cut1('p3', "  /* the Elo picks, where the ELO tab is on the page: its cards' own options (eloCardOpt: the Elo chance, each\n",
     "Loading the Elo ratings…</p>`}`;\n")
sub1('p3', "  return `${open}${line}${cards}${eloCards}</div>`;", "  return `${open}${line}${cards}</div>`;")
sub1('p3', "  /* the frame once (app v118: the Elo picks are in each unit now, no longer a section of their own at the foot) */",
     "  /* the frame once */")

# ---------------------------------------------------------------- opening the tab: a game's four steps and nothing more
sub1('p3', """   of the Sunday slot), its own set (spSet, the cache the slot's levels are taken from) and its Elo picks on that game
   alone ('in this game', as eloUnit builds them for a night game and the slot builds them a game at a time), each only
   where it is not built yet; a unit locked or under way builds nothing new (the record's set). (app v138) A game's set is
   four steps, a level each (spPartStep) */""", """   of the Sunday slot), its own set (spSet, the cache the slot's levels are taken from), only where it is not built yet;
   a unit locked or under way builds nothing new (the record's set). (app v138) A game's set is four steps, a level each
   (spPartStep); (app v142) and nothing more, the Elo picks gone */""")
sub1('p3', """steps.push(()=>spPartStep(w)); }
      if(spEloOn()){ let k=null; try{ k=window.eloUnit([g.id],{where:'in this game',kept:true}); }catch(e){ k=null; }
        if(k&&k.wait) steps.push(()=>window.eloUnit([g.id],{where:'in this game'})); } } }""",
     "steps.push(()=>spPartStep(w)); } } }")
sub1('p3', "spSet,spEloSet,spRebuild,", "spSet,spRebuild,")
sub1('p3', "  pbPut(t.legs,t.elo?`the ${t.label} Elo pick for ${t.game}`:`the ${t.label} ${t.legs.length}-leg parlay for ${t.game}`);",
     "  pbPut(t.legs,`the ${t.label} ${t.legs.length}-leg parlay for ${t.game}`);")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
