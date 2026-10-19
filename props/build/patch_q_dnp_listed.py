r"""app v120: a Questionable player who did not practise is listed with a Q, not counted out.

The owner, 19 October 2026: "why does it say mike evans is out even though hes in", then "hes in today but its
still showing out". SF's final week-6 report had Mike Evans Questionable (ribs) and Did Not Participate, and the
page (ingestInjuries) counted every Questionable player who did not practise at the last report as out
("Questionable, no practice"), so his lines and his row left the game's page; he played. The report's game status
is the club's word, and Questionable means a game-time decision: so he is now listed as any Questionable player is,
wearing a Q whose title says he did not practise. Nothing more is suggested: every Questionable player is kept out
of the suggestions as before (suggestable, V6). The Elo build's WHO PLAYS rule moves with it (elo/build.py).
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
OLD = "    if(st==='Questionable'&&pr==='DNP'){ rule(id,'Questionable, no practice',{inj}); continue; }\n"
assert OLD in T['p3'] or "app v120" in T['p2'], 'nothing to patch'
assert 'app v120' not in T['p2'], 'patch_q_dnp_listed.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v119 \\u00b7 2026-10-19';", "const APP_BUILD='app v120 \\u00b7 2026-10-19';", 'APP_BUILD')
sub1('p3', OLD, "    /* (app v120) Questionable is listed with a Q whether or not he practised: the club's game-time call */\n", 'the Q+DNP rule')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v120, a Questionable player who did not practise is listed with a Q')
