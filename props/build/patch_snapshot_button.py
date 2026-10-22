"""app v128: a game's page on the Props tab opens its Game snapshot, and the Matchups tab goes.

The owner's call of 22 October 2026: "i think we are good to remove matchups tabs since most the important info was
moved to props tab", and then, asked where the board's whole Game snapshot should open from once its rows were gone,
"Button on Props": a fourth button on each game's page, beside Matchup, Mismatches and Team Stats, opening the whole
snapshot, so nothing of it is lost.

The board's row has been the Props list's own since app v122 (patch_props_rows.py: the date, the matchup, the win
probability in the clubs' colours, the confidence band, the score prediction and the final score), and a game's page
already opens three of the snapshot's cards on their own (app v124, patch_game_windows.py). The board itself, its
section, its script and its styles, goes from the hub's page in nflbets/build (its file is the page's glue now,
hub.html, keeping the season's read, the Vegas call the snapshot draws, the tabs as addresses and the framed betting
tabs); the Props tab is the page's first tab and the board's old addresses land on it. In the props parts:

1. gameWinBtns draws a fourth button, Game snapshot (data-gp-pop "snap"), after Team Stats, through the binding the
   other three use: renderGame hands window.gameWindow the button's kind, the game and the button, and the hub's
   snapshot.html opens the whole window for "snap" (the one card alone for the other three). As before, only where
   the hub's window is on the page: the prop model's own page, the audit's, draws none of the four.
2. .gwin lays the four out in one row, and two by two at 680px and under, where four in a row wraps "Game snapshot"
   onto a second line (at 600px each button is 136px wide).
3. lineSource, which the Game bets card prints as its "Lines:" and the matchup bubble as a title, no longer says the
   posted line is "as on the Matchups tab": "nflverse's posted line".
4. closeGameModal takes body's modal-open off only where no other window is still open (a .modal, or X Parlays'
   "Clear this parlay?"), as every other window's close on the page does. renderSlate closes the game's page whenever
   none is chosen, so any redraw of the list (a Refresh scores read, the hub's read of the scoreboard on load) took the
   scroll lock from a window open over another part of the page (the Props tab's Mismatches list, the Game snapshot the
   matchup bubble opens, the ELO Ratings tab's windows), and the page scrolled under it (the review of 22 October 2026).
5. Comments that named the board as the hub's are reworded (slateNeutral reads the betting job's schedule through
   window.pkBoard, the page's glue; probCols is in hub.html).

APP_BUILD moves to app v128.
"""
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert "b('snap','Game snapshot')" not in T['p3'], 'patch_snapshot_button.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v127 \\u00b7 2026-10-21';", "const APP_BUILD='app v128 \\u00b7 2026-10-22';", 'APP_BUILD')

# 1. the fourth button
sub1('p3', """   season's team stats side by side on bars. The prop model's own page has no such window and draws none. */
function gameWinBtns(g){""",
     """   season's team stats side by side on bars. The prop model's own page has no such window and draws none.
   (app v128) A fourth, Game snapshot, opens the whole snapshot over the page (the owner's call of 22 October 2026,
   when the Matchups tab went: "Button on Props"), through the same binding: the hub's window opens the whole of it
   for "snap" and one card alone for the other three. */
function gameWinBtns(g){""", 'gameWinBtns: its note')
sub1('p3', "  return `<div class=\"gwin\" role=\"group\" aria-label=\"More on this game\">${b('units','Matchup')}${b('mism','Mismatches')}${b('stats','Team Stats')}</div>`;",
     "  return `<div class=\"gwin\" role=\"group\" aria-label=\"More on this game\">${b('units','Matchup')}${b('mism','Mismatches')}${b('stats','Team Stats')}${b('snap','Game snapshot')}</div>`;",
     'gameWinBtns: the Game snapshot button')
sub1('p3', """  /* (app v124) the game's Matchup, Mismatches and Team Stats: each its own little window over the page, the
     hub's (window.gameWindow), handed the button so the focus comes back to it */""",
     """  /* (app v124) the game's Matchup, Mismatches and Team Stats: each its own little window over the page, the
     hub's (window.gameWindow), handed the button so the focus comes back to it; (app v128) its Game snapshot the
     whole window, the same way */""", 'renderGame: the binding\'s note')

# 2. four in a row, two by two on a phone
sub1('p1', """/* (app v124) a game's Matchup, Mismatches and Team Stats buttons, under its head, each 44px */
.gwin{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px}""",
     """/* (app v124) a game's Matchup, Mismatches and Team Stats buttons, under its head, each 44px; (app v128) and its
   Game snapshot: four in a row, two by two at 680px and under */
.gwin{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px}
@media(max-width:680px){.gwin{grid-template-columns:repeat(2,minmax(0,1fr))}}""", '.gwin: four buttons')

# 3. the Game bets card's line source
sub1('p2', '  return "nflverse\'s posted line, as on the Matchups tab";', '  return "nflverse\'s posted line";', 'lineSource: no Matchups tab')
sub1('p2', """   posted line (the Matchups tab's, the board Pick'ems was until 16 October 2026) after that. null""",
     """   posted line (the one the Matchups tab showed until it went on 22 October 2026) after that. null""",
     'lineSource: its note')

# 4. the scroll lock kept for a window still open
sub1('p3', "function closeGameModal(){ const m=$('gameModal'); m.hidden=true; document.body.classList.remove('modal-open'); }",
     """/* (app v128) the scroll lock goes only where no other window is still open: renderSlate closes the game's page on every
   redraw with none chosen, and took it from a window open over another part of the page */
function closeGameModal(){ const m=$('gameModal'); m.hidden=true;
  if(!document.querySelector('.modal:not([hidden]),.lp-dlg:not([hidden])')) document.body.classList.remove('modal-open'); }""",
     'closeGameModal: keep the lock for a window still open')

# 5. comments
sub1('p3', """/* a game at a neutral site: the hub's Matchups board says so where it has the game (the betting job's
   schedule marks most of them Neutral); without it, a 9:30am Eastern kickoff, which is one played abroad */""",
     """/* a game at a neutral site: the betting job's schedule says so where the hub's page has it (window.pkBoard, the
   page's glue: it marks most of them Neutral); without it, a 9:30am Eastern kickoff, which is one played abroad */""",
     'slateNeutral: its note')
sub1('p3', "/* the win-probability bar's two colours, the board's rule (probCols in tab_pickems.html) on this page's own",
     "/* the win-probability bar's two colours, the board's rule (probCols in nflbets/build/hub.html) on this page's own",
     'slateCols: its note')

for need in ("b('snap','Game snapshot')", 'repeat(4,minmax(0,1fr))'):
    assert need in T['p3'] + T['p1'], need
assert 'as on the Matchups tab' not in T['p2'], 'part2.js still says a line is as on the Matchups tab'

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v128, a game page\'s Game snapshot button (the whole snapshot, the Matchups tab gone), four buttons in a row')
