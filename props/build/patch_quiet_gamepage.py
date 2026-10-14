r"""app v106: a game's page on the Props tab drops its explanations.

The owner asked on 14 October 2026 for the text to go from every game's page: under the two teams
the line of the kickoff, the favourite and the points expected between them, the paragraph saying
how to read a player (click one, the chance of clearing each number, the estimated price, the
arrows, far off the market), and the Suggested parlays card's opening paragraph (its floors, the
fair chance it leads with, the far-off rule). The card under the teams keeps the two teams, and
every number those lines described is still on the page where it is drawn: the spread and total on
the Game bets card, each hand's fair chance and the model's on its own row, a far-off line flagged
where it stands. The rules themselves are unchanged.

The audit's check that a game page's suggested parlays said their floors were on the model's
chance goes with the paragraph that said it; in its place the card is held to saying no floor at
all, so a floor stated again comes back with its check.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p2', 'part2.js'), ('p3', 'part3.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}

BS = chr(92)   # the parts write non-ASCII as JS escapes; ~uXXXX here stands for one


def sub1(k, old, new):
    old, new = old.replace('~u', BS + 'u'), new.replace('~u', BS + 'u')
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


def cut_line(k, start):
    """remove the one line that starts (after its indent) with `start`"""
    s = T[k]
    lines = s.split('\n')
    hits = [i for i, l in enumerate(lines) if l.lstrip().startswith(start)]
    assert len(hits) == 1, (k, len(hits), start[:90])
    del lines[hits[0]]
    T[k] = '\n'.join(lines)


sub1('p2', r"const APP_BUILD='app v105 ~u00b7 2026-10-14';", r"const APP_BUILD='app v106 ~u00b7 2026-10-14';")
cut_line('p3', '<p class="muted" style="margin:0">${d.day} ${d.t}${g.sp!=null?')
cut_line('p3', "<p class=\"muted\" style=\"margin:8px 0 0\">${locked?'Click any player to compare the projection with the result.'")
cut_line('p3', '<p class="muted" style="margin:0 0 10px;font-size:12.5px">The best payout for the chance in this game')
sub1('p3', '<h2 style="display:flex;align-items:center;gap:10px">${tag(g.a)}',
     '<h2 style="display:flex;align-items:center;gap:10px;margin:0">${tag(g.a)}')
cut_line('audit', "chk(/lands at least 35% of the time by the model's chance/.test(")
sub1('audit', "          const mains=[...pool.pref,...pool.thin].filter(l=>l.main&&!isG(l)",
     "          /* the card states no floor (app v106: its explanation is gone); one stated again comes back with its check */\n"
     "          chk(!/lands at least|pays at least/.test(nb(card(games[0],null).textContent)),'a game page\\'s suggested parlays state a floor no check holds');\n"
     "          const mains=[...pool.pref,...pool.thin].filter(l=>l.main&&!isG(l)")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patched: app v106, a quiet game page')
