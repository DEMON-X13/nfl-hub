r"""app v117: after a Refresh odds press, a count's ladder stands on one anchor.

The props job refused its run at 15:45 UTC on Sunday 18 October 2026 (issue #290, on two of the audit's checks
that turned on the hour), and by that night the audit on main failed one more check: after a press, Jordan Love's
passing touchdowns ladder read 1+ 88.0%, 2+ 34.6%, 3+ 35.5%, 4+ 16.1%, the 3+ priced likelier than the 2+.
On a count (receptions, passing touchdowns and the other counts the formula prices from DraftKings' line), a rung k+ from the read is priced by a Poisson anchored on the
main line's fair chance, and where the paid pull has a price on the very line the read has (the main line then
stands at the pull's real price), that anchor is the pull's two prices with the margin out. But the rung that IS
the main Over (k-0.5 on the line, 2+ on a line of 1.5) took the formula's own main price instead, a second anchor
on the same ladder: on that night's read the formula put Over 1.5 at 34.6% where the pull's price put it near 62%,
so the rung above it, anchored on the pull, came out likelier.

So that rung, on a count, where the paid pull has both prices on the read's line, is priced at the pull's own Over
price, DraftKings' price for the same bet, its fair chance the anchor the other rungs stand on (espnPrice, and the
checks' own copy in espn_rule.js); everywhere else it is as before (a yards ladder is anchored at 50/50 and keeps
the formula's main price; with no paid price on the line the formula's main price is the anchor too). Such a rung
is still never suggested (mainOver), so this moves only the est. price a game page shows and a visitor's builder
takes for it.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert "how:'the main line, DraftKings’ own price'" not in T['p3'], 'patch_ladder_anchor.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v116 \\u00b7 2026-10-18';", "const APP_BUILD='app v117 \\u00b7 2026-10-18';", 'APP_BUILD')

sub1('p3', """  if(kind==='rung'){ const M=marketLine(g.w,pid,stat); if(M&&+M.line===L&&fairPx(M.over)&&fairPx(M.under)) leg.mainFair=devigOver(M.over,M.under); }""",
     """  if(kind==='rung'){ const M=marketLine(g.w,pid,stat); if(M&&+M.line===L&&fairPx(M.over)&&fairPx(M.under)){ leg.mainFair=devigOver(M.over,M.under);
    /* (app v117) on a count, the rung that is the main Over itself (k-0.5 on the line), where the other rungs stand
       on the paid pull's price at this line: that price, DraftKings' own for the same bet, so the ladder has one
       anchor and never climbs (Jordan Love's passing TDs, 18 October 2026: 2+ at 34.6% on the formula's main
       price, 3+ at 35.5% on the pull's) */
    if(!DK_YARDS.has(stat)&&Math.abs(+k-0.5-L)<1e-9) return {price:M.over,fair:leg.mainFair,src:'dkline',tested:ESPN_TESTED.main.has(stat),listed:true,line:L,at:e.at,how:'the main line, DraftKings’ own price',mainOver:true}; } }""",
     'espnPrice: the main Over rung on the pull')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v117, a count\'s ladder after a press stands on one anchor')
