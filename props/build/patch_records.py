"""app v31: record chips beside the Games tab week dropdown.
  * Two chips, the selected week and the season, W-L on the model's side of every
    sportsbook main line, graded from the frozen pre-game numbers (trackRecord,
    kind 'main'). Pushes are already skipped there.
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
    ('      <label>Week <select id="weekSel"></select></label>\n      <span class="grow"></span>',
     '      <label>Week <select id="weekSel"></select></label>\n'
     '      <span class="rec" id="weekRec" title="The model\'s side of every sportsbook main line in this week, graded from the numbers frozen before kickoff"></span>\n'
     '      <span class="rec" id="seasonRec" title="The model\'s side of every sportsbook main line this season, graded from the numbers frozen before kickoff"></span>\n'
     '      <span class="grow"></span>'),
    (".bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}",
     ".bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}\n"
     ".bar .rec{display:inline-flex;align-items:baseline;gap:6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;"
     "padding:5px 11px;border-radius:999px;background:#E9EDF1;color:var(--ink-2);white-space:nowrap}\n"
     ".bar .rec b{font-family:var(--display);font-size:14px;font-weight:700;letter-spacing:0;color:var(--ink);font-variant-numeric:tabular-nums}"),
])

edit("part3.js", [
    ("function renderSlate(){\n",
     "/* W-L on the model's side of every book main line, frozen pre-game numbers */\n"
     "function renderRecords(w){\n"
     "  const wr=$('weekRec'), sr=$('seasonRec'); if(!wr||!sr) return;\n"
     "  const main=trackRecord().filter(r=>r.kind==='main');\n"
     "  const line=rows=>`${rows.filter(r=>r.hit).length}\\u2013${rows.filter(r=>!r.hit).length}`;\n"
     "  wr.innerHTML=`Week ${w} <b>${line(main.filter(r=>+r.w===+w))}</b>`;\n"
     "  sr.innerHTML=`Season <b>${line(main)}</b>`;\n"
     "}\n"
     "function renderSlate(){\n"),
    ("  const w=+$('weekSel').value||currentWeek();\n  const gs=gamesIn(w);",
     "  const w=+$('weekSel').value||currentWeek();\n  renderRecords(w);\n  const gs=gamesIn(w);"),
])

edit("part2.js", [
    ("const APP_BUILD='app v30 \\u00b7 2026-09-14';", "const APP_BUILD='app v31 \\u00b7 2026-09-15';"),
])

edit("audit.js", [
    ("  /* ---- K. two or more touchdowns ---- */",
     "  /* ---- L. record chips beside the week dropdown ---- */\n"
     "  { const main=F('trackRecord')().filter(r=>r.kind==='main'); const wkx=main.length?main[0].w:1;\n"
     "    const ws=d.getElementById('weekSel'); const was=ws.value; ws.value=String(wkx); ws.dispatchEvent(new w.Event('change'));\n"
     "    const want=rows=>`${rows.filter(r=>r.hit).length}\\u2013${rows.filter(r=>!r.hit).length}`;\n"
     "    chk(d.getElementById('weekRec').textContent===`Week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}`,'week record chip does not match graded main lines');\n"
     "    chk(d.getElementById('seasonRec').textContent===`Season ${want(main)}`,'season record chip does not match graded main lines');\n"
     "    ws.value=was; ws.dispatchEvent(new w.Event('change'));\n"
     "    console.log(`L. record chips: week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}, season ${want(main)}`); }\n\n"
     "  /* ---- K. two or more touchdowns ---- */"),
])
print("done")
