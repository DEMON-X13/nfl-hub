r"""app v124: a game's page has no suggested parlays; three buttons open its Matchup, Mismatches and Team Stats.

The owner, 20 October 2026: "so in props when i click a game, i want you to get rid of the suggested parlays
section from there. instead I want you to add three different buttons: Matchup, Mistmatches, and Team Stats.
Matchup will be the stuff from the Offense vs Defense section. Mismatches will be mismatches from that game.
Team Stats will be the old bar system stats we had that showed team stats side by side. I want each button to
pop up in its own little window."

1. The game page's Suggested parlays card is gone (gameSuggestCard, its High, Medium and Low hands with their
   checkboxes and Add all, the Any / Player overs / Player unders switch above them, gameNoIdWhy, which worded an
   empty hand, the two handlers renderGame bound for them and their styles). The switch's saved choice
   (S.ui.suggestSide) is not read any more, so a visitor who left it on overs is not filtered unseen: the side
   switch's SUGGEST_SIDES, suggestSide and sideAllows go with it, out of gameLegPool and gameSuggestSig. The
   hands' engine (gameTiers, gameLegPool, GAME_TIERS and their cache) is kept, drawn nowhere, as the Parlay
   Builder's all-games levels (getPbTiers) are: the audit and the smoke still hold it, and nothing else on the
   page reads it. suggestLegOn stays (the builder and the sets' Adds use it).

2. In its place, under the game's head and over its Game bets card, three buttons (gameWinBtns): Matchup,
   Mismatches and Team Stats, each 44px, aria-haspopup="dialog", data-gp-pop naming its card. They are drawn
   only where the hub's window is on the page (window.gameWindow, the Game snapshot's, which draws each card
   alone in a little window over the game's page: the snapshot's Offense vs defense, its Mismatches for the
   game, and the team stats side by side on bars, news/data/stats.json, read the first time Team Stats opens).
   The prop model's own page, the audit's, has no such window, so it draws neither the buttons nor the card.
   renderGame binds each button to window.gameWindow(kind, game, button), so the window can give the focus
   back to the button, or to the same button drawn since.
"""
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function gameWinBtns(' not in T['p3'], 'patch_game_windows.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


def cut(k, start, end, new, what):
    """replace the text from start through end, each found exactly once, end after start"""
    s = T[k]
    assert s.count(start) == 1, f'{what}: expected its start exactly once in {FILES[k]}, found {s.count(start)}'
    i = s.index(start)
    assert s.count(end) == 1 and s.index(end) > i, f'{what}: expected its end exactly once, after its start, in {FILES[k]}'
    j = s.index(end) + len(end)
    T[k] = s[:i] + new + s[j:]


sub1('p2', "const APP_BUILD='app v123 \\u00b7 2026-10-20';", "const APP_BUILD='app v124 \\u00b7 2026-10-20';", 'APP_BUILD')

# 1. the card off the page, the buttons in its place
sub1('p3', "  html+=gameHeadCard(g);\n  html+=gameSuggestCard(g,locked);\n  html+=gameBetsCard(g,locked);\n",
     "  html+=gameHeadCard(g);\n  html+=gameWinBtns(g);\n  html+=gameBetsCard(g,locked);\n", 'renderGame: the card and the buttons')

sub1('p3', """  /* the game page's own side switch (the Parlay Builder's suggestions have their own boxes) */
  $('gameView').querySelectorAll('[data-gsugg-side]').forEach(b=>b.addEventListener('click',()=>{
    S.ui.suggestSide=b.dataset.gsuggSide; save(); renderGame(); renderParlay(); }));
  /* a tier's Add all: every leg of that hand on the parlay, skipping any already there */
  $('gameView').querySelectorAll('[data-gtier-add]').forEach(b=>b.addEventListener('click',()=>{
    const t=gameTiers(g)[b.dataset.gtierAdd]; if(!t) return;
    for(const l of t.legs){
      const cur=S.parlay[l.key];
      if(cur&&cur.k===l.k&&cur.side===l.side&&!!cur.main===!!l.main) continue;
      toggleLeg(l.key,l.k,g,l.side,l.main);
    }
  }));
}
""", """  /* (app v124) the game's Matchup, Mismatches and Team Stats: each its own little window over the page, the
     hub's (window.gameWindow), handed the button so the focus comes back to it */
  $('gameView').querySelectorAll('[data-gp-pop]').forEach(b=>b.addEventListener('click',()=>{
    if(typeof window.gameWindow==='function') window.gameWindow(b.dataset.gpPop,g.id,b); }));
}
""", 'renderGame: the handlers')

sub1('p3', """/* the side switch on a game page's suggested parlays: Any, or player overs only, or player
   unders only. A touchdown leg is an over; a game bet has no side and drops out. */
const SUGGEST_SIDES=[['any','Any'],['over','Player overs'],['under','Player unders']];
function suggestSide(){ const s=S.ui&&S.ui.suggestSide; return s==='over'||s==='under'?s:'any'; }
function sideAllows(c){ const s=suggestSide(); return s==='any'||(c.grp!=='TEAM'&&c.side===s); }
""", '', 'the side switch')

sub1('p3', """/* ---------- the game page's suggested parlays: High, Medium, Low ----------
   Always three hands, 2, 3 and 4 legs, each the best payout for its chance from this game's
   lines (see patch_game_tiers_value.py): real prices where the book has them, the model's
   estimate of a book's price on every other ladder rung and touchdown, no leg shorter than
   -250, each hand above its payout floor where the game allows. */""",
     """/* ---------- the game page's suggested parlays: High, Medium, Low ----------
   Always three hands, 2, 3 and 4 legs, each the best payout for its chance from this game's
   lines (see patch_game_tiers_value.py): real prices where the book has them, the model's
   estimate of a book's price on every other ladder rung and touchdown, no leg shorter than
   -250, each hand above its payout floor where the game allows. (app v124) Drawn nowhere since
   20 October 2026, when the game page's card went (gameWinBtns, below): kept, as the all-games
   levels are, since the audit and the smoke still hold it. */""", 'the engine\'s header')

sub1('p3', "S.margin||'',suggestSide(),'e'+ESPN_SEQ].join('|');", "S.margin||'','e'+ESPN_SEQ].join('|');", 'gameSuggestSig')
sub1('p3', "c.p>=0.40&&c.p<0.97&&sideAllows(c)&&!legFarOff(c,fm)", "c.p>=0.40&&c.p<0.97&&!legFarOff(c,fm)", 'gameLegPool')
sub1('p3', "showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),suggestSide:['over','under'].includes(saved&&saved.ui&&saved.ui.suggestSide)?saved.ui.suggestSide:'any',\n",
     "showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),\n", "the view's saved side switch")

cut('p3', "/* (app v109) why a hand is empty where DraftKings' ids left legs out:", "  return `${head} yet: DraftKings’ player ids come with its player prices, which are ${PB_PULLED}.`;\n}\n",
    '', 'gameNoIdWhy')

cut('p3', "function gameSuggestCard(g,locked){\n", "    <div class=\"gsugg-tiers g3\">${GAME_TIERS.map(block).join('')}</div></div>`;\n}\n",
    """/* (app v124) A game's page has no suggested parlays since 20 October 2026 (the owner's call: "get rid of the
   suggested parlays section from there. instead I want you to add three different buttons: Matchup, Mismatches,
   and Team Stats ... I want each button to pop up in its own little window"). Where the hub's window is on the
   page (window.gameWindow, the Game snapshot's), three buttons under the game's head each open one card in it,
   over the page: Matchup, the snapshot's Offense vs defense; Mismatches, the game's Mismatches; Team Stats, the
   season's team stats side by side on bars. The prop model's own page has no such window and draws none. */
function gameWinBtns(g){
  if(typeof window.gameWindow!=='function') return '';
  const b=(k,l)=>`<button type="button" class="btn quiet gwin-btn" data-gp-pop="${k}" data-gp-game="${esc(g.id)}" aria-haspopup="dialog">${l}</button>`;
  return `<div class="gwin" role="group" aria-label="More on this game">${b('units','Matchup')}${b('mism','Mismatches')}${b('stats','Team Stats')}</div>`;
}
""", 'gameSuggestCard')

# the card's styles out, the side switch's out of the rule it shared, the buttons' in
cut('p1', ".gsugg .gsugg-hd{display:flex;", ".gsugg-tier-hd .grow{flex:1}\n",
    """/* (app v124) a game's Matchup, Mismatches and Team Stats buttons, under its head, each 44px */
.gwin{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px}
.gwin .gwin-btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center;font-weight:600;text-align:center}
""", 'the card\'s styles')
sub1('p1', ".sugg-side,.stake-chips{display:inline-flex;", ".stake-chips{display:inline-flex;", 'the shared switch rule')
sub1('p1', ".sugg-side button,.stake-chips button{background:var(--panel);", ".stake-chips button{background:var(--panel);", 'the shared button rule')
sub1('p1', ".sugg-side button:first-child,.stake-chips button:first-child{", ".stake-chips button:first-child{", 'the shared first button rule')
sub1('p1', ".sugg-side button.on,.stake-chips button.on{", ".stake-chips button.on{", 'the shared on rule')

for k in ('p1', 'p3'):
    for gone in ('gameSuggestCard', 'gameNoIdWhy', 'suggestSide', 'sideAllows', 'SUGGEST_SIDES', 'data-gsugg', 'data-gtier-add', '.gsugg', 'sugg-side'):
        assert gone not in T[k], f'{gone} is still in {FILES[k]}'
for need in ('function gameTiers(', 'function gameLegPool(', 'const suggestLegOn=', 'function gameWinBtns('):
    assert need in T['p3'], need

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print("patched: app v124, a game's page draws Matchup, Mismatches and Team Stats buttons where its suggested parlays were")
