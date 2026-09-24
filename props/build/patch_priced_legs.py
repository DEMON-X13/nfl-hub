"""app v66: every priced line, before the model's filter, as its own function.
  * suggestCandidates() built the list of lines with a real sportsbook price and then kept
    only those the model rates three points above the book. The list itself is now
    pricedLegs(), and suggestCandidates() filters it exactly as before, so the model's
    suggestions do not change. The Player Elo tab reads pricedLegs() to build its own
    picks from the same lines, judged by the players' ratings instead of the model.
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


edit("part3.js", [
    ("function suggestCandidates(games){\n  const w=currentWeek(); const out=[];",
     "/* every line this week with a real sportsbook price, game bets and players, unjudged */\n"
     "function pricedLegs(games){\n  const w=currentWeek(); const out=[];"),
    ("  const edge=c=>c.p-mlProb(c.price);\n  return out.filter(",
     "  return out;\n}\nfunction suggestCandidates(games){\n  const out=pricedLegs(games);\n"
     "  const edge=c=>c.p-mlProb(c.price);\n  return out.filter("),
])
edit("part2.js", [
    ("const APP_BUILD='app v65 \\u00b7 2026-09-24';", "const APP_BUILD='app v66 \\u00b7 2026-09-24';"),
])
