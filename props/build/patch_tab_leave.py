r"""app v126: leaving the Props tab closes the game's page, and Escape acts only on a game's page on the screen.

Found 21 October 2026, in Chromium on the hub: open the site at #matchups, go to the Props tab, open a game, then
press the browser's Back (or set location.hash to '#matchups'). The Matchups tab came up, but the game's page was
still open inside the Props tab's section, now hidden, and body still carried modal-open (overflow hidden), so the
tab the address went to could not scroll; the focus was left on the body. Measured after Back: {hash '#matchups',
modal-open true, overflow hidden, gameModal open, tab-slate hidden}. Only the game page's own Back button, Escape,
a click on its backdrop or renderSlate with S.ui.game cleared closed it; the tab switch (the #tabs buttons' click
handler here, which routeTabs in nflbets/build/tab_pickems.html clicks on a hashchange) hid the sections and never
the window. And the document's Escape listener still closed the hidden page from another tab, rewriting the Props
tab's state (S.ui.game, a save, the slate redrawn) behind a tab that had nothing to do with it.

1. The game's page is the Props tab's own window, on the screen only while that tab is (gameShown: open and with
   no hidden ancestor). Leaving the tab closes it as its Back button does (tabLeft, from the tab switch: closeGame,
   which clears S.ui.game, saves and redraws the slate; a page not open is left alone, so a switch before the
   payload is in never saves a state not yet loaded). Every way off the tab passes through that switch: another
   tab's button, and on the hub the address moved by Back or a link (routeTabs clicks the tab's button). The Game
   snapshot's one card over the game's page goes with it, as it already did (it wraps closeGameModal). A load is
   untouched: boot resets the view (S.ui.game null), so a page loaded at any address opens no game.
2. A focus the switch left on what it took off the screen (the game's page, a window on the old tab, a row of its
   list) goes to the chosen tab's button, never the page's body; a focus on anything still shown (the button
   pressed, the header) stays, and with nothing focused (a load, Back with no focus) nothing is focused. A browser
   keeps document.activeElement on a newly hidden element until its next rendering update, so the check, made in
   the click, sees it whichever hashchange listener ran first; the focus is read before the close too, since its
   redraw replaces the slate's rows, and a focused row removed leaves the body at once.
3. Escape closes the game's page only where it is on the screen (gameShown), so a key pressed on another tab never
   touches the Props tab's state.

The ELO Ratings tab's player and team windows and the Props tab's Mismatches list (nflbets/build/tab_elo.html) had
the same flaw and close on leaving their tab too: a page change, by the build.
"""
import io

FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function tabLeft(' not in T['p3'], 'patch_tab_leave.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v125 \\u00b7 2026-10-21';", "const APP_BUILD='app v126 \\u00b7 2026-10-21';", 'APP_BUILD')

sub1('p3', "function closeGame(){ S.ui.game=null; save(); closeGameModal(); renderSlate(); }\n",
     "function closeGame(){ S.ui.game=null; save(); closeGameModal(); renderSlate(); }\n"
     "/* (app v126) the game's page is the Props tab's own window, on the screen only while that tab is: leaving the tab\n"
     "   (another tab's button, or on the hub the address moved by Back or a link, which routeTabs turns into a click on\n"
     "   the tab's button) closes it as its Back button does, so no page hidden with its tab holds body's modal-open (the\n"
     "   tab the address went to could not scroll) or answers Escape. A page not open is left alone, so a switch before\n"
     "   the payload is in saves nothing. A focus the switch left on what it took off the screen (the game's page, a\n"
     "   window or a row of the old tab) goes to the chosen tab's button, never the page's body; a browser keeps\n"
     "   activeElement on a newly hidden element until its next rendering update, so the click sees it, whichever\n"
     "   hashchange listener ran first. A focus on anything still shown stays, and with nothing focused (a load) none is\n"
     "   made */\n"
     "function gameShown(){ const m=$('gameModal'); return !!m&&!m.hidden&&!m.closest('[hidden]'); }\n"
     "function tabLeft(b){\n"
     "  const a=document.activeElement, gone=x=>!x.isConnected||!!x.closest('[hidden]');\n"
     "  if(b.dataset.tab!=='slate'&&!$('gameModal').hidden) closeGame();\n"
     "  /* read before the close: its redraw replaces the slate's rows, and a focused row removed leaves the body */\n"
     "  const f=document.activeElement, at=f&&f!==document.body?f:a;\n"
     "  if(a&&a!==document.body&&gone(at)) try{ b.focus({preventScroll:true}); }catch(e){}\n"
     "}\n",
     'tabLeft')

sub1('p3', "document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('gameModal').hidden) closeGame(); });",
     "document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&gameShown()) closeGame(); });",
     'Escape on the game page alone where it is on the screen')

sub1('p3', "  document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='tab-'+b.dataset.tab); }));",
     "  document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='tab-'+b.dataset.tab);\n"
     "  tabLeft(b); }));",
     'the tab switch closes the game page')

assert T['p3'].count('tabLeft(b)') == 2 and T['p3'].count('gameShown()') == 2
assert "!$('gameModal').hidden) closeGame(); });" not in T['p3']

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print("patched: app v126, leaving the Props tab closes the game's page, and Escape acts only on one on the screen")
