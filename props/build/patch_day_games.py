"""app v131: the Sunday slot back in a section of its own, Day games, with its own record.

The owner's call of 23 October 2026, on Suggested Parlays: "can you make this bottom section be Day Games and include a
record up to this point?" App v129 put the Sunday slot's set under Night games and counted its record there; now
Night games counts the prime-time games' map alone and the slot's set sits in its own section, headed Day games, under
a record of the slot map (with the backtest's slot weeks, as every record counts them). With the season over the
section says so in one line.
"""
import io
FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert "name:'Day games'" not in T['p3'], 'patch_day_games.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v130 \\u00b7 2026-10-22';", "const APP_BUILD='app v131 \\u00b7 2026-10-23';", 'APP_BUILD')
sub1('p3', "const SP_SEC={night:{maps:['prime','slot'],name:'Night games'},slot:{maps:['slot'],name:'Sunday slot'}};",
     "/* (app v131) two sections again: Night games on the prime map, Day games (the Sunday slot) on the slot map */\n"
     "const SP_SEC={night:{maps:['prime'],name:'Night games'},slot:{maps:['slot'],name:'Day games'}};", 'SP_SEC')
sub1('p3', "  if(!u) return seasonOver()?'':`<p class=\"pb-none\" data-sp-none=\"slot\">No Sunday game left in week ${currentWeek()}.</p>`;",
     "  if(!u) return `<p class=\"pb-none\" data-sp-none=\"slot\">${seasonOver()?'Regular season over.':`No Sunday game left in week ${currentWeek()}.`}</p>`;",
     'spSlotHtml: its own line once the season is over')
sub1('p3', "function spSetsHtml(on){ return spSecHtml('night',spNightHtml(on)+spSlotHtml(on)); }",
     "function spSetsHtml(on){ return spSecHtml('night',spNightHtml(on))+spSecHtml('slot',spSlotHtml(on)); }", 'spSetsHtml')
for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v131, Day games with its own record')
