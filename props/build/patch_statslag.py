"""Finished games showed FINAL with every stat blank; and a winner's check mark (app v42).

Detroit at Buffalo, Thursday 17 September: the 31-41 final was in nflverse's
games.csv within minutes, so the 06:07 UTC post-game run marked the game FINAL. The
player stats file (stats_player_week_2026.csv) did not carry the game until 13:46 UTC,
about nine hours after the whistle, and the next run was Saturday's price pull. So
the page said FINAL with nothing to show against the projections for two days.

Three more post-game runs, on minute 7 so they never spend a credit, placed after the
player stats have had the morning to land:

    Friday   16:07 UTC   Thursday night's stats
    Monday   16:07 UTC   Sunday's stats
    Tuesday  16:07 UTC   Monday night's stats

The game page's note no longer promises "the Tuesday upload"; it says the stats come
some hours after the final whistle.

And the Games tab puts a green check mark by the team that won a finished game, in
the list and at the top of the game's own page.
"""
from pathlib import Path

HERE = Path(__file__).parent
WF = HERE.parent.parent / '.github' / 'workflows'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- schedule ----
sub1(WF / 'props.yml', """    - cron: "7 6 * * 2"     # after Monday night""",
     """    - cron: "7 6 * * 2"     # after Monday night
    # player stats: nflverse's stats file trails the final score by hours (Thursday
    # night's game landed about nine hours after the whistle), so these runs pick them up
    - cron: "7 16 * * 5"    # Thursday night's stats
    - cron: "7 16 * * 1"    # Sunday's stats
    - cron: "7 16 * * 2"    # Monday night's stats""")

# ---- the check mark ----
p3 = HERE / 'part3.js'
sub1(p3, "function tag(t,mini){",
     "/* a green check by the side that won a finished game; nothing for a tie or a game still on */\n"
     "function winMark(g,t){ if(!gameFinal(g)||!hasScore(g)||g.as===g.hs) return ''; return (g.as>g.hs?g.a:g.h)===t?'<span class=\"wck\" title=\"Won\" aria-label=\"won\">\\u2713</span>':''; }\n"
     "function tag(t,mini){")
sub1(p3, """<div class="matchup">${tag(g.a)}<span class="at">at</span>${tag(g.h)}</div>""",
     """<div class="matchup">${tag(g.a)}${winMark(g,g.a)}<span class="at">at</span>${tag(g.h)}${winMark(g,g.h)}</div>""")
sub1(p3, """<h2 style="display:flex;align-items:center;gap:10px">${tag(g.a)} <span class="muted" style="font-family:var(--body);font-size:15px;font-weight:400">at</span> ${tag(g.h)}</h2>""",
     """<h2 style="display:flex;align-items:center;gap:10px">${tag(g.a)}${winMark(g,g.a)} <span class="muted" style="font-family:var(--body);font-size:15px;font-weight:400">at</span> ${tag(g.h)}${winMark(g,g.h)}</h2>""")
sub1(p3, """'Player stats land with the Tuesday upload; until then each player shows only what was projected.'""",
     """'Player stats come out some hours after the final whistle and appear with the next update; until then each player shows only what was projected.'""")

p1 = HERE / 'part1.html'
sub1(p1, ".matchup .at{",
     ".wck{color:var(--pick);font-weight:800;font-size:15px;line-height:1;margin-left:-2px}\n.matchup .at{")

p2 = HERE / 'part2.js'
sub1(p2, "const APP_BUILD='app v41 \\u00b7 2026-09-17';", "const APP_BUILD='app v42 \\u00b7 2026-09-18';")

print('stats catch-up runs added; winner check mark; app v42')
