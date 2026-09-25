"""app v67: the game list's pick column is Vegas's.
  * The column said "Model pick", but for every game with a posted line the expected score,
    the total and so the pick beside them were already the market's: gameCtx() builds a game
    from the spread and total when both are posted and falls back to the team model only
    when they are not. Vegas is now the site's baseline, so the column is named for it:
    "Vegas pick", and a game still waiting on its line says so under the pick ("no line
    yet, our model"), as its total already says "our model".
"""
from pathlib import Path

HERE = Path(__file__).parent


def edit(path, pairs):
    p = HERE / path
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:80])
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8", newline="\n")
    print("patched", path)


edit("part1.html", [
    ('<div class="c">Model pick</div>', '<div class="c">Vegas pick</div>'),
])
edit("part3.js", [
    ("""        const pick=ca.implied>ch.implied?g.a:g.h, by=Math.abs(ca.implied-ch.implied).toFixed(0);
        if(!hasScore(g)) return tag(pick)+`<small>by ${by}</small>`;""",
     """        const pick=ca.implied>ch.implied?g.a:g.h, by=Math.abs(ca.implied-ch.implied).toFixed(0);
        if(!hasScore(g)) return tag(pick)+`<small>by ${by}</small>`+(ca.src==='model'?'<small class="muted">no line yet, our model</small>':'');"""),
])
edit("part2.js", [
    ("const APP_BUILD='app v66 \\u00b7 2026-09-24';", "const APP_BUILD='app v67 \\u00b7 2026-09-25';"),
])
