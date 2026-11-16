"""Dead code out of the props parts (app v148).

The owner's ask of 14 November 2026: "is there any outdated code we can cleanup? or legacy github jobs that are no
longer needed?". A sweep of the repository, each finding then checked by a second reader trying to find a use, found
these in the parts with no caller and no reader anywhere: not the page, not the parlay card (which lifts a block of
renderParlay), not a check (audit.js, the nflbets smokes, check_tab.js, the tests), not build.js's guards, not a doc
that keeps them on purpose. None is among the dormant paths CLAUDE.md keeps (dkEarlySunday, plEst and espnPrice's
'rung', dkIdOf's rung keys, gameTiers, gameLegPool, getPbTiers, legFarOff, FAR_OFF and farText, setChanceHook,
dkSlipPlan, dkSlipLine, espnKeptGl, espnKeptPl, rungFairGuess, rungPriceOf).

part2.js: rungPriceGuess, a one-line wrapper of rungPriceOf(rungFairGuess(...)) never called (estPrice calls the two
directly).

part3.js: espnKeptAt (the larger of espnKeptGl and espnKeptPl; its last reader went with the kept read's rewrite),
espnOn (whether a week has a read; its last caller went in app v125), pbPlayerSides and spUnitName (never called
since the Parlay Builder's and Suggested Parlays' reworks), dkSlipRows (the builder's rows have read the card's plan
through dkSlipPlan directly since app v121), liveSlateWanted with the never-read local `slate` in liveRefresh that
was its only use (liveRefresh reads LIVE.slate itself), and the never-read local `multDec` in renderParlay's pricing
(a block build.js lifts into the parlay card's quote(), whose return value never carried it).

part1.html: the stylesheet rules no markup can produce. The whole .sugg-* block (the game page's High, Medium and Low
hands and the old Suggested parlays window, gone in app v124 and before), .legfair (the builder rows' fair line, gone
in app v138), .sp-rec-line (the record's sentence, gone in app v113), .pb-topsub (the Top lines' sub-line, gone in
app v138) and the .pb-tier.elo2/elo3/elo4 parts of the tier colours (no such class has been drawn since the Elo picks'
ids became elo-<level>, and they went whole in app v142). The .stake-chips and .gwin rules that sat among the .sugg
ones stay, under a comment of their own.

Nothing a visitor sees, no number and no check moves; the touchdown estimate and the touchdown shadow's m are
untouched (rungPriceGuess sat beside estPrice in part2.js and was never on its path).
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v147 \\u00b7 2026-11-11';", "const APP_BUILD='app v148 \\u00b7 2026-11-14';")

# ---------------------------------------------------------------- part2.js
sub1('p2', "function rungPriceGuess(stat,line,k,fair){ return rungPriceOf(rungFairGuess(stat,line,k,fair)); }\n")

# ---------------------------------------------------------------- part3.js
sub1('p3', "function espnKeptAt(e){ return Math.max(espnKeptGl(e),espnKeptPl(e)); }\n")
sub1('p3', """/* any read for a week's games (or this week's), and the latest read time (ms) */
function espnOn(week){ const W=ESPN_LIVE[String(week==null?currentWeek():week)]; return !!W&&Object.keys(W).length>0; }
""", """/* any read at all */
""")
sub1('p3', "function pbPlayerSides(){ const u=pbUi(); return !!(u.k.over||u.k.under); }\n")
sub1('p3', "const spUnitName=u=>u.slot?`week ${u.w}’s Sunday slot`:`${u.a} at ${u.h}`;\n")
sub1('p3', "function dkSlipRows(legs,prices){ const p=dkSlipPlan(legs,prices); return p&&Array.isArray(p.each)?p.each:null; }\n")
sub1('p3', """/* every game the Games tab wants a score for: started, not yet final */
const liveSlateWanted=()=>{
  const ids=new Set(); if(!LIVE.slate) return ids;
  for(const g of gamesIn(slateWeek())) if(gameStarted(g)&&!gameFinal(g)) ids.add(g.id);
  return ids;
};
""")
sub1('p3', "  const want=liveWanted(), slate=liveSlateWanted();\n", "  const want=liveWanted();\n")
sub1('p3', "  const multDec=prices.reduce((a,p)=>a*(mlToDec(p.ml)||1),1);\n")

# ---------------------------------------------------------------- part1.html
sub1('p1', """/* suggested parlays */
.sugg-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
.sugg-hd h2{margin:0}
.sugg-hd .pill{white-space:nowrap}
.sugg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.sugg-tier{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--r-md);padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}
.sugg-tier.safe{border-top:3px solid var(--pick)} .sugg-tier.med{border-top:3px solid var(--gold)} .sugg-tier.aggr{border-top:3px solid var(--miss)}
.sugg-top{display:flex;align-items:center;gap:8px}
.sugg-name{font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:-.3px}
.sugg-add{font-size:11px;margin-left:auto}
.sugg-tier .conf::before{display:none}
.sugg-tier.aggr .conf{background:var(--miss-soft);color:var(--miss)}
.stake-chips{""", """/* the builder's one-tap amounts */
.stake-chips{""")
sub1('p1', """.sugg-stake{display:inline-flex;align-items:center;gap:4px;font-size:13px;white-space:nowrap}
.sugg-stake input{width:76px;padding:6px 8px;font-family:var(--display);font-variant-numeric:tabular-nums}
""")
sub1('p1', """.sugg-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sugg-nums div{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-sm);padding:7px 9px}
.sugg-nums b{display:block;font-family:var(--display);font-size:18px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.sugg-nums b.payout{font-size:18px}
.sugg-nums span{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.sugg-legs{list-style:none;margin:0;padding:0}
.sugg-legs li{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:13px}
.sugg-legs .nm{font-weight:600;min-width:0}
.sugg-legs .nm small{display:block;font-weight:400;color:var(--ink-2);font-size:11.5px}
.sugg-legs .pr{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;text-align:right}
.sugg-legs .pr em{display:block;font-style:normal;font-size:11px;font-weight:500;color:var(--muted)}
.sugg-tier .btn{margin-top:auto;align-self:stretch;text-align:center}
@media(max-width:900px){ .sugg-grid{grid-template-columns:1fr} }
""")
sub1('p1', ".pb-tier.safe,.pb-tier.elo2{border-top-color:var(--pick)} .pb-tier.med,.pb-tier.elo3{border-top-color:var(--gold)} .pb-tier.aggr,.pb-tier.elo4{border-top-color:var(--miss)}",
     ".pb-tier.safe{border-top-color:var(--pick)} .pb-tier.med{border-top-color:var(--gold)} .pb-tier.aggr{border-top-color:var(--miss)}")
sub1('p1', ".legfair{display:block;font-size:11px;font-weight:500;color:var(--ink-2);white-space:nowrap;margin-top:2px}\n")
sub1('p1', ".sp-rec-line{margin:0 0 12px;font-size:12px;line-height:1.5}\n")
sub1('p1', ".pb-topsub{margin:0 0 6px;font-size:12px}\n")


for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('patched')
