"""Season tracker: positions after player names, a live power rank, and the Deep Dive.

  * Player names get their position in parentheses, "Josh Allen (QB)", from data/players2026.js.
    Matching is scoped to the two teams in the game (league wide for the page intro, where a
    name shared by two players is skipped). Coaches are not on rosters, so they get none.
  * The rank chip reads data/ranks2026.js: the betting site's Power Ratings rank by Elo,
    refreshed by every pull. The old chip showed a fixed preseason rank from teams.js.
  * Deep Dive: a collapsed section under Keys to victory for each team. Six units, each with
    its league rank, the unit it faces and a difficulty tag, plus the players and numbers.
    Opening one team's Deep Dive opens the other's, so the two stay side by side.
  * tools/pull-week.js rebuilds the three data files at the end of every pull.
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


APP_HELPERS = r'''
/* ============================ positions ============================ */
/* "(QB)" after a player's name, from data/players2026.js. Matching is scoped to the teams in
   play; with no teams it runs league wide and skips any name two rosters share. A name already
   followed by "(" is left alone, and a possessive keeps its 's: "Josh Allen's (QB)". */
const POS_RX = {};
function posScope(teams){
  const key = teams.join(",");
  if (key in POS_RX) return POS_RX[key];
  if (typeof PLAYERS26 === "undefined") return (POS_RX[key] = null);
  const map = {};
  (teams.length ? teams : Object.keys(PLAYERS26)).forEach(t => Object.entries(PLAYERS26[t] || {}).forEach(([n, p]) => {
    if (!(n in map)) map[n] = p; else if (map[n] !== p) map[n] = null;
  }));
  const names = Object.keys(map).filter(n => map[n]).sort((a, b) => b.length - a.length);
  if (!names.length) return (POS_RX[key] = null);
  const alt = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const rx = new RegExp("(?<![\\w'.\\-])(" + alt + ")(?![\\w\\-])(?!(?:</strong>)?(?:['’]s)?\\s*\\()((?:</strong>)?)((?:['’]s(?!\\w))?)", "g");
  return (POS_RX[key] = { rx, map });
}
function withPos(html, teams){
  const s = posScope(teams || []); if (!s || !html) return html;
  return String(html).replace(s.rx, (m, name, close, poss) => `${name}${close}${poss} (${s.map[name]})`);
}

/* ============================ power rank ============================ */
/* The betting site's Power Ratings rank by Elo (data/ranks2026.js), falling back to teams.js. */
function powerRank(ab){
  const r = (typeof RANKS26 !== "undefined" && RANKS26[ab]) ? RANKS26[ab] : null;
  return r ? { rank: r.rank, title: `Power Ratings rank by Elo (${r.elo}), from the betting model${typeof RANKS26_ASOF !== "undefined" && RANKS26_ASOF ? ", as of " + RANKS26_ASOF : ""}`, label: "power rank" }
           : { rank: T[ab].rank, title: "Preseason rank", label: "rank" };
}

/* ============================ deep dive ============================ */
/* Six units from data/units2026.js. Each faces the opposing unit it plays against; the tag says
   how hard that is, from the gap between the two league ranks (1 is best, 32 worst). */
function difficulty(mine, theirs){
  const d = theirs - mine;   // positive: this unit ranks better than what it faces
  if (d >= 11) return ["easy", "Easy"];
  if (d >= 4)  return ["fav", "Favorable"];
  if (d > -4)  return ["even", "Even"];
  if (d > -11) return ["tough", "Tough"];
  return ["vtough", "Very tough"];
}
function deepDive(ab, opp, row){
  if (typeof UNITS26 === "undefined" || !UNITS26[ab] || !UNITS26[opp]) return `<div class="tbsec empty ${row}"></div>`;
  const U = UNITS26[ab], O = UNITS26[opp];
  const names = list => (list || []).map(p => `${p.n} (${p.pos})`).join(", ");
  const nums = st => (st || []).map(([label, v, r, unit]) => v == null ? "" : `${v}${unit || ""} ${label} (${ORD(r)})`).filter(Boolean).join(" &middot; ");
  const units = [
    ["Quarterback", "Passing offense", U.qb, `${opp} pass defense`, O.vs.passD],
    ["Offensive line", "Offensive line", U.ol, `${opp} pass and run rush`, O.front.rank],
    ["Running backs", "Run game", U.rb, `${opp} run defense`, O.vs.runD],
    ["Receivers", "Receivers", U.rec, `${opp} defensive backs`, O.db.rank],
    ["Pass and run rush", "Front seven", U.front, `${opp} offensive line`, O.ol.rank],
    ["Defensive backs", "Secondary", U.db, `${opp} receivers`, O.rec.rank],
  ];
  const rows = units.map(([label, mine, u, vs, vr]) => {
    const [cls, tag] = difficulty(u.rank, vr);
    return `<div class="ddrow">
      <div class="ddtop"><span class="ddunit">${label}</span><span class="dtag ${cls}">${tag}</span></div>
      <div class="ddvs">${mine} <b>${ORD(u.rank)}</b> vs ${vs} <b>${ORD(vr)}</b></div>
      ${u.who && u.who.length ? `<div class="ddwho">${names(u.who)}</div>` : ""}
      <div class="ddnum">${nums(u.stats)}</div>
    </div>`;
  }).join("");
  const basis = typeof UNITS26_BASIS !== "undefined" ? UNITS26_BASIS : "";
  return `<details class="tbsec dd ${row}"><summary><span class="ddlbl">Deep Dive</span><span class="ddhint">6 matchups</span></summary>
    <p class="ddbasis">League ranks from team stats, ${basis}. The tag is how hard the matchup is for this unit, from the gap between its rank and the rank of the unit it faces.</p>
    ${rows}</details>`;
}
'''

edit("js/app.js", [
    ("/* ============================ ranks ============================ */",
     APP_HELPERS.strip() + "\n\n/* ============================ ranks ============================ */"),
    ("    overall: g.overall || {rank:t.rank},", "    overall: g.overall || {rank:powerRank(ab).rank},"),
    ("    <p>${w.intro}</p>", "    <p>${withPos(w.intro, [])}</p>"),
    ("          ${g.note ? `<div class=\"hook\">${g.note}</div>` : \"\"}",
     "          ${g.note ? `<div class=\"hook\">${withPos(g.note, [g.away, g.home])}</div>` : \"\"}"),
    ("      : `<div class=\"tbsec ${tone} ${row}\"><h5>${label}</h5><ul>${li(items)}</ul></div>`;",
     "      : `<div class=\"tbsec ${tone} ${row}\"><h5>${label}</h5><ul>${li(items.map(x => withPos(x, [g.away, g.home])))}</ul></div>`;"),
    ("        <div class=\"chips\"><span class=\"pill big\"><b>${ORD(t.rank)}</b>rank</span><span class=\"pill\"><b>${record(ab)}</b>2026</span></div>",
     "        <div class=\"chips\"><span class=\"pill big\" title=\"${powerRank(ab).title}\"><b>${ORD(powerRank(ab).rank)}</b>${powerRank(ab).label}</span><span class=\"pill\"><b>${record(ab)}</b>2026</span></div>"),
    ("      ${block(\"r5\", \"Keys to victory\", \"info\", e.keys)}\n    </div>`;",
     "      ${block(\"r5\", \"Keys to victory\", \"info\", e.keys)}\n      ${deepDive(ab, home ? g.away : g.home, \"r6\")}\n    </div>`;"),
    ("      ${g.note ? `<p class=\"ovnote\">${g.note}</p>` : \"\"}",
     "      ${g.note ? `<p class=\"ovnote\">${withPos(g.note, [g.away, g.home])}</p>` : \"\"}"),
    ("  ov.classList.add(\"on\"); ov.scrollTop = 0;",
     "  /* the two Deep Dives open and close together so they stay side by side */\n"
     "  const dds = [...document.querySelectorAll(\"#ovbox details.dd\")];\n"
     "  dds.forEach(d => d.addEventListener(\"toggle\", () => dds.forEach(x => { if (x !== d && x.open !== d.open) x.open = d.open; })));\n"
     "  ov.classList.add(\"on\"); ov.scrollTop = 0;"),
])

CSS = r'''
/* ---------- deep dive: collapsed under keys to victory, six unit matchups ---------- */
.r6{grid-row:6}
.tbsec.dd{background:var(--surface);border:1px solid var(--line);padding:0}
.tbsec.dd summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:9px}
.tbsec.dd summary::-webkit-details-marker{display:none}
.tbsec.dd summary::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ink-2);flex:0 0 6px}
.tbsec.dd summary::after{content:"\203A";margin-left:auto;font-size:17px;line-height:1;color:var(--ink-3);transition:transform .15s}
.tbsec.dd[open] summary::after{transform:rotate(90deg)}
.tbsec.dd summary:hover .ddlbl{color:var(--ink)}
.tbsec.dd summary:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.ddlbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.ddhint{font-size:11px;color:var(--ink-3);font-weight:600}
.ddbasis{font-size:11.5px;line-height:1.45;color:var(--ink-3);margin:0 12px 8px}
.ddrow{padding:9px 12px 10px;border-top:1px solid var(--line)}
.ddtop{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ddunit{font-family:"Space Grotesk","Manrope",sans-serif;font-weight:700;font-size:13.5px;letter-spacing:-.01em}
.dtag{font-size:10.5px;font-weight:700;letter-spacing:.03em;padding:2px 8px;border-radius:999px;white-space:nowrap}
.dtag.easy{background:var(--up-bg);color:var(--up-ink)}
.dtag.fav{background:#EDF5F0;color:var(--up)}
.dtag.even{background:var(--sunk-2);color:var(--ink-2)}
.dtag.tough{background:#F8EEDF;color:#8A5A12}
.dtag.vtough{background:var(--down-bg);color:var(--down-ink)}
.ddvs{font-size:12.5px;color:var(--ink-2);margin-top:3px}
.ddvs b{font-family:"Space Grotesk","Manrope",sans-serif;color:var(--ink);font-weight:700}
.ddvs b sup,.ddnum sup{font-size:8px}
.ddwho{font-size:12.5px;color:var(--ink);margin-top:3px;line-height:1.45}
.ddnum{font-size:11.5px;color:var(--ink-3);margin-top:3px;line-height:1.45;font-variant-numeric:tabular-nums}
'''
edit("css/style.css", [
    (".r1{grid-row:1}.r2{grid-row:2}.r3{grid-row:3}.r4{grid-row:4}.r5{grid-row:5}",
     ".r1{grid-row:1}.r2{grid-row:2}.r3{grid-row:3}.r4{grid-row:4}.r5{grid-row:5}" + CSS.rstrip()),
    ("@media(max-width:720px){.duo2{grid-template-columns:1fr}.tb.c2>*{grid-column:1}.tb.c2 .r1{grid-row:6;margin-top:14px}.tb.c2 .r2{grid-row:7}.tb.c2 .r3{grid-row:8}.tb.c2 .r4{grid-row:9}.tb.c2 .r5{grid-row:10}}",
     "@media(max-width:720px){.duo2{grid-template-columns:1fr}.tb.c2>*{grid-column:1}.tb.c2 .r1{grid-row:7;margin-top:14px}.tb.c2 .r2{grid-row:8}.tb.c2 .r3{grid-row:9}.tb.c2 .r4{grid-row:10}.tb.c2 .r5{grid-row:11}.tb.c2 .r6{grid-row:12}}"),
])

edit("index.html", [
    ('<script src="data/results.js"></script>',
     '<script src="data/results.js"></script>\n<script src="data/ranks2026.js"></script>\n<script src="data/players2026.js"></script>\n<script src="data/units2026.js"></script>'),
])

edit("tools/pull-week.js", [
    ("  await pack(games);\n",
     "  await pack(games);\n"
     "  /* power ranks, player positions and the Deep Dive units, beside the week files */\n"
     "  try { await require('./context').build({ out: OUT }); } catch (e) { console.log('context files kept:', e.message); }\n"),
])
print("done")
