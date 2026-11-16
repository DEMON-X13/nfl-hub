r"""app v149: a quarterback's passing touchdowns never go with a teammate's catches on one suggested parlay.

The owner, 16 November 2026, on Sunday night's Safe (PIT at CIN: Joe Burrow Under 1.5 passing TDs with his receiver Dohnte
Meyers Under receptions): "some of the suggested parlays that were popping up would not let me do a single game parlay for
some legs ... Specifically with QBs", with a screenshot of DraftKings' betslip holding Jayden Daniels Under 1.5 passing
touchdowns and his teammate Rachaad White Under 2.5 receptions: "Sorry, unfortunately your picks can not be parlayed".
DraftKings publishes no list of the pairs it refuses (it judges each pair's correlation per game and line), so the rule
follows what the slip refused. App v121's rule (patch_dk_sgp.py) refused a quarterback's passing touchdowns only with a
teammate's anytime touchdown ('td') and his passing touchdowns over with the game total ('total'); a teammate's receptions
and receiving yards went through, and week 10's sets were full of them (Thursday's WAS at NYG Medium, Daniels' passing
TDs under with Treylon Burks' receiving yards under; Sunday night's Safe).

The 'td' pair now covers every stat a teammate's catches settle: his anytime touchdown, receptions, receiving yards and
rush + rec yards (scrim_yards), over or under, a back's as a receiver's, the quarterback's passing touchdowns over or
under. His passing yards with a teammate's catches stay allowed: DraftKings' classic stack, and no slip has refused it.
pbFits, gameTiers' fits and the builder's clash line all read dkClashWhy, so no suggestion takes such a pair and the
builder names one a visitor makes. The words: DK_CLASH.td "a quarterback’s passing TDs with a teammate’s catches,
receiving yards or touchdown".
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'DK_CATCH' not in T['p3'], 'patch_qb_catch_clash.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v148 \\u00b7 2026-11-14';", "const APP_BUILD='app v149 \\u00b7 2026-11-16';", 'APP_BUILD')
sub1('p3', "const dkPassTd=l=>!!l&&!isGameLeg(l)&&l.stat==='passing_tds';",
     "const dkPassTd=l=>!!l&&!isGameLeg(l)&&l.stat==='passing_tds';\n"
     "/* (app v149) a teammate's catches: DraftKings refused Daniels' passing TDs under with Rachaad White's receptions under */\n"
     "const DK_CATCH=new Set(['any_td','receptions','receiving_yards','scrim_yards']);", 'DK_CATCH')
sub1('p3', "(!isGameLeg(o)&&o.stat==='any_td'&&o.team===q.team&&o.pid!==q.pid)?'td'",
     "(!isGameLeg(o)&&DK_CATCH.has(o.stat)&&o.team===q.team&&o.pid!==q.pid)?'td'", 'the td pair')
sub1('p3', "td:'a quarterback’s passing TDs with a teammate’s touchdown'",
     "td:'a quarterback’s passing TDs with a teammate’s catches, receiving yards or touchdown'", 'DK_CLASH words')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patch_qb_catch_clash.py: applied')
