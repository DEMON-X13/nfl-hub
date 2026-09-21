"""The Original button goes; leaving the game already does it (app v51).

An alternative has never survived leaving a game, so the way back to the model's own
pick was always there: close the game, open it again. Original was a second, faster
route to the same place, and it cost a third button in a header that also carries
Shuffle and Add all -- on a phone that was the row that wrapped.

The footer drops the mention of the button and keeps the sentence that matters, so the
way back is still written down where the alternative is shown.

Nothing about how an alternative is built, held or forgotten changes. The audit's loop
used Original to get back to the suggestion between shuffles and now reopens the game
instead, which tests the route people will actually take.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
H = HERE / 'part1.html'
A = HERE / 'audit.js'
P2 = HERE / 'part2.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- 1. the button ----
sub1(J, """      ${s.alt?`<button class="btn quiet gsugg-orig" data-suggest-orig="${g.id}">Original</button>`:''}
""", "")

# ---- 2. its wiring ----
sub1(J, """  $('gameView').querySelector('[data-suggest-orig]')?.addEventListener('click',()=>{
    delete GAME_SUGGEST_ALT[g.id]; renderGame(); });
""", "")

# ---- 3. the footer keeps the way back, without naming a button ----
sub1(J, """${s.alt?' The model\\u2019s own pick comes back with Original, or by leaving the game and opening it again.':''}""",
     """${s.alt?' The model\\u2019s own pick comes back when you leave the game and open it again.':''}""")

# ---- 4. its size rule ----
sub1(H, """.gsugg-all,.gsugg-alt,.gsugg-orig{padding:5px 11px;font-size:12px}""",
     """.gsugg-all,.gsugg-alt{padding:5px 11px;font-size:12px}""")

# ---- 5. the audit takes the route people will take ----
sub1(A, """        /* Original puts the model's own pick back without leaving the game */
        d.querySelector('[data-suggest-orig]').click();
        chk(!F('gameAlternate')(g),'Original did not drop the shuffled parlay');
        chk([...d.querySelectorAll('.gsugg-legs li')].length===s2.legs.length,'Original did not bring back the suggestion');""",
     """        /* opening the game again is the whole way back now, so it has to work every time */
        d.querySelector('[data-game="'+g.id+'"]').click();
        chk(!F('gameAlternate')(g),'reopening the game did not drop the shuffled parlay');
        chk([...d.querySelectorAll('.gsugg-legs li')].length===s2.legs.length,'reopening the game did not bring back the suggestion');""")

sub1(P2, "const APP_BUILD='app v50 \\u00b7 2026-09-20';", "const APP_BUILD='app v51 \\u00b7 2026-09-20';")

print('Original is gone; leaving and reopening the game is the way back; app v51')
