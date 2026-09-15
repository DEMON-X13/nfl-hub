"""Stat breakdown: partial teams kept, a missing stat shows a dash, clearer label; Deep Dive tint.

  * A team missing one stat was dropped from stats2026.js entirely, so every bar showed zero.
    Atlanta after Week 1: no red zone trips, so TeamRankings shows "--" for red zone rate.
    A team is now kept when it has points for and against and at least 8 of the 10 stats.
  * On the page a stat the file does not have shows a dash, not a misleading zero. A team with
    no stats at all (before its first game) still shows zeros.
  * The label says what the numbers are: the average of every 2026 game so far.
  * Deep Dive takes the Matchup preview background.
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent


def edit(rel, pairs):
    p = HERE / rel
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        assert s.count(old) == 1, (rel, s.count(old), old[:90])
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8", newline="\n")
    print("patched", rel)


edit("tools/pull-week.js", [
    ("  const complete = TEAMS.filter(t => Object.keys(out[t]).length === 10);",
     "  /* keep a team with points for and against and at least 8 of the 10 stats; a stat a source leaves\n"
     "     blank (Atlanta had no red zone trips in Week 1, so TeamRankings shows \"--\") is left out and the page shows a dash */\n"
     "  const complete = TEAMS.filter(t => out[t].ppg != null && out[t].pa != null && Object.keys(out[t]).length >= 8);"),
    ("   A team is listed only when all ten stats were available; the page shows zeros for any team missing here.",
     "   A team is listed once it has points for and against and 8 of the 10 stats; a stat left out shows a dash on the page."),
    ("  console.log('stats2026.js:', complete.length, 'teams complete');",
     "  console.log('stats2026.js:', complete.length, 'teams,', complete.filter(t => Object.keys(out[t]).length === 10).length, 'with all ten stats');"),
])

edit("js/app.js", [
    ("  const statsOf = ab => Object.assign({}, ZERO, s26(ab) || {}, ((w.teams||{})[ab]||{}).stats || {});",
     "  /* a team with 2026 numbers shows a dash for any stat its sources left blank; a team with none shows zeros */\n"
     "  const BLANK = {ppg:null, pa:null, ypp:null, yppa:null, to:null, sk:null, ska:null, third:null, rz:null, expl:null};\n"
     "  const statsOf = ab => Object.assign({}, s26(ab) ? BLANK : ZERO, s26(ab) || {}, ((w.teams||{})[ab]||{}).stats || {});"),
    ("  const basis = \"2026 season\" + through + \", per game\";",
     "  const basis = \"Average per game across every 2026 game so far\" + through;"),
    ("    {label:\"Point differential\", a:r1(sa.ppg - sa.pa), h:r1(sh.ppg - sh.pa), hi:\"a\", sign:true, note:\"per game\"},",
     "    {label:\"Point differential\", a:(sa.ppg==null||sa.pa==null)?null:r1(sa.ppg - sa.pa), h:(sh.ppg==null||sh.pa==null)?null:r1(sh.ppg - sh.pa), hi:\"a\", sign:true, note:\"per game\"},"),
])

edit("css/style.css", [
    (".tbsec.dd{background:var(--surface);border:1px solid var(--line);padding:0}",
     ".tbsec.dd{background:var(--sunk);border:1px solid var(--line);padding:0}"),
])

edit("tools/smoke.js", [
    ("  check('2026 only: numeric stat values, no dashes', svals.length > 0 && svals.every(v => /^[+-]?\\d+(\\.\\d+)?%?$/.test(v)), svals.filter(v => !/^[+-]?\\d+(\\.\\d+)?%?$/.test(v)).join(' '));",
     "  { const S26 = g('typeof STATS26 === \"undefined\" ? {} : STATS26');\n"
     "    const blanks = [first.away, first.home].reduce((n, t) => n + (S26[t] ? ['ppg','pa','ypp','yppa','to','sk','ska','third','rz','expl'].filter(k => S26[t][k] == null).length : 0), 0);\n"
     "    const dashes = svals.filter(v => v === '\\u2013').length;\n"
     "    check('2026 only: numeric stat values, a dash only where the stat file has none', svals.length > 0 && svals.every(v => v === '\\u2013' || /^[+-]?\\d+(\\.\\d+)?%?$/.test(v)) && dashes <= blanks + 2, `${dashes} dashes, ${blanks} blank stats`); }"),
])
print("done")
